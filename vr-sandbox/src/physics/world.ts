// The physics world: parts become Jolt bodies, connections become Jolt constraints, and every tick the
// real forces carried by each constraint are read back and checked against spec-derived capacities.
// Breakable stock (rods, tubes, beams, lumber, strips) is a chain of segment bodies bonded at their shared
// faces; the bonds carry real section forces and yield or fracture at capacities from the section and
// material. Nothing here knows about specific builds; behaviour comes only from geometry, materials and specs.

import type JoltNS from 'jolt-physics';
import type { Material } from '../data/materials';
import { getConnectorKind, type ConnectorKind, type Derived } from '../connectors/registry';
import { REACH, spans, throughOf, unreachable, type Through } from '../connectors/through';
import {
  getPartKind, effectiveParams, segmentLayout, segmentBodyId, segmentOfFrame, segmentOffset,
  type PartDims, type PartKind, type MagnetGeometry, type SegmentLayout, massOf, boughtRefusal,
} from '../parts/registry';
import { closestOnShape, shapeBounds, type CollisionShape, type ConvexShape } from '../parts/shapes';
import {
  magnetWrench, cylinderCharges, blockCharges, cylinderFaces, blockFaces, imageFaces, transformFaces, plateSaturationFactor, ringLevel, faceField,
  blendedInteraction, transformCharges, dipoleMoment, type Charge, type PoleFace, type Vec3 as MVec3,
} from '../engineering/magnets';
import { neoHookeanBandForce } from '../engineering/mechanics';
import { AMBIENT, heatShare, TAYLOR_QUINNEY } from '../engineering/thermal';
import { heatStep, motorModel, shaftTorque, throughGear, windingR, type MotorHeat, type MotorModel } from '../engineering/dcmotor';
import { drain, packR, type Pack } from '../engineering/battery';
import { getGearhead, getMotor, type GearheadData } from '../data/motors';
import { getBattery } from '../data/batteries';
import { solvePack, type Load } from './electric';
import { emptyEnergies, emptyHeat, emptyWork, kineticEnergy, potentialEnergy, shareHeat, springEnergy, type Energies, type HeatBook, type HeatSource, type WorkBook } from './energy';
import { bondCapacity, checkBond, type BondCapacity, type BondLoads } from '../engineering/fracture';
import { axisAngle, composePose, cross, dot, length, normalize, relativePose, rotate, sub, add, scale, transformPoint } from '../doc/math';
import {
  ID3, ZERO3, RigidFit, angularRows, inverse3, mat3Mul, mat3Vec, normQuat, pointRows, pointVelocity, projectors, quatConj,
  gyroscopicStep, quatFromRotationVector, quatMul, quatToMat3, rotationVector, scaleMat, solvePositions, solveRows, leastSupport, tangents, worldInertia, type Entity, type Row,
} from './rigid';
import { implicitForce, restoringModes, solveDense, stiffnessOf, symmetricEigen3 } from './implicit';
import { annulusMesh, boxMesh, eddyDamping, rigidBasis, type EddyMesh } from '../engineering/eddy';
import type { Connection, Endpoint, Part, PartDamage, Pose, Quat, SimSettings, Vec3 } from '../doc/types';
import type { ConnectionLoad, EnvironmentBox, GrabMode, PhysicsEvent, PhysicsOp, PowerState, RoomSurface, StepResult, TerrainField } from './protocol';

/** A magnetic interaction between two bodies at this instant (see magnetPairs). */
interface MagnetPair {
  key: string;
  a: BodyRec;
  b: BodyRec;
  close: boolean;
  feature: number;
  /** Wrench on b [F, T about b's centre] with b moved rigidly by dx and turned by rot. */
  wrench: (dx: Vec3, rot: Vec3) => number[];
  /** The plane of a's surface facing b (a magnet's pole face, a steel part's nearest face): outward normal, point. */
  face: { n: Vec3; p: Vec3 };
}

/**
 * Eddy-current damping this tick (M4): currents induced in C by magnet S's field as C moves relative to S. D is 6 x 6
 * about S's centre (where the interaction is: C may be a long tube), acting on C's velocity relative to S there; the
 * drag -D q goes to C and its reaction to S.
 */
interface EddyElement {
  S: BodyRec;
  C: BodyRec;
  D: number[];
}

/** This tick's contact between a magnet and another body, from the contact listener. */
interface MagnetTouch {
  r1: BodyRec;
  /** Normal from r1 towards the other body. */
  n: Vec3;
  /** Points of the manifold that are actually touching (world). */
  points: Vec3[];
  /** How far the bodies overlap there (m, >= 0): the solver lets them, up to its slop. */
  depth: number;
  friction: number;
}

/**
 * Two magnets, or a magnet and steel, stuck together: held rigidly, as the real pair is, until the load on the
 * contact is more than the magnet can hold. Everything is stored in a's body frame (the pair does not move
 * relative to it while latched): the contact centroid, its normal (a to b), the touching points, and the magnetic
 * wrench the latch stands for (force on b, torque about the centroid).
 */
interface MagnetLatch {
  key: string;
  a: BodyRec;
  b: BodyRec;
  constraint: JoltNS.Constraint;
  typed: JoltNS.SixDOFConstraint;
  pairKey: number;
  c: Vec3;
  n: Vec3;
  points: Vec3[];
  Fm: Vec3;
  Tm: Vec3;
  mu: number;
  /** The footprint's mean distance from its centroid (twist capacity mu N rbar). */
  rbar: number;
  /** Where the constraint holds b, in b's own frame. */
  anchorB: Vec3;
  /** The constraint's impulses on b summed over this tick's substeps (a's frame; the moment about the centroid). */
  impF: Vec3;
  impT: Vec3;
}

interface MagnetStiffness {
  /** Restoring modes (negative eigenvalues of the symmetrised Jacobians) in translation and rotation. */
  modesT: { lam: number; e: Vec3 }[];
  modesR: { lam: number; e: Vec3 }[];
  mu: number;
  Ired: number[];
  /** Fastest growth or oscillation rate of the pair's motion, s^-1. */
  rate: number;
}

/** Penetration the contacts leave alone (Jolt's mPenetrationSlop, as set below). */
const SLOP = 0.002;
/** Most overlap taken out in one tick, as Jolt does (its mMaxPenetrationDistance default). */
const MAX_CORRECTION = 0.2;
/** Closing speed below which a contact does not bounce (Jolt's own mMinVelocityForRestitution default). */
const MIN_IMPACT_FOR_RESTITUTION = 1;
/** A contact point this close to a segment's joined end (m) lies on the seam; a normal this far off the end's plane leaves through it. */
const SEAM_TOL = 1e-4;
const SEAM_NORMAL = 1e-3;

/** A 20 mm magnet near another evolves at ~200-1000 s^-1: sixteen substeps resolve that at 90 Hz. */
const MAX_MAGNET_SUBSTEPS = 16;
/** A magnetic pair moving slower than this (m/s, at its feature size) is at rest: its stiffness can't ring. */
const MAGNET_REST_SPEED = 0.01;
/** Ticks a magnetic pair must rest, untouched by any change, before it is stepped without dividing the tick. */
const MAGNET_SETTLE_TICKS = 30;
/** A substep carrying a magnet further than this fraction of its feature size relative to its partner averages the pull along the way. */
const PATH_STEP = 0.1;
/** A close pair's stiffness is measured again once b has moved this fraction of the feature size (or turned this many rad) relative to a. */
const STIFFNESS_REUSE = 0.02;

/** Eddy damping is computed for conductors of at least this conductivity (S/m) moving faster than this (m/s). */
const EDDY_MIN_SIGMA = 1e7;
const EDDY_MIN_SPEED = 1e-3;
/** About how many finite-volume cells a conductor is meshed with near a magnet (M4, Limits). */
const EDDY_CELLS = 240;

/**
 * A touching magnetic pair latches when its contact moves slower than LATCH_SPEED (m/s) at the footprint and
 * LATCH_WOBBLE at the rim: inelastic in this world anyway (restitution acts above MIN_IMPACT_FOR_RESTITUTION), so the
 * latch stops nothing that would have bounced (M6).
 */
const LATCH_SPEED = 0.02;
const LATCH_WOBBLE = 0.5;
/** Manifold points within this of touching (m) count as the contact's footprint. */
const LATCH_TOUCH = 1e-4;
/**
 * Rim-impact settling (M6): the largest tilt (rad) at which a magnet on its rim is seated flat as it latches, when the
 * torque about the rim turns it flat within a tick. A bound on the pivot-on-the-rim picture, not a physical constant.
 */
const SEAT_ANGLE = (20 * Math.PI) / 180;
/** Tilts below this (rad) are flush already (the seat's move is rounding). */
const SEAT_FLUSH = 1e-3;
/**
 * Velocity iterations for a latch: its point and rotation parts are solved in turn, and a load acting far from the
 * contact (a tall magnet) couples them, so the default count leaves it yielding for a tick when the load changes.
 */
const LATCH_VELOCITY_STEPS = 60;

type J = typeof JoltNS;

const LAYER_STATIC = 0;
const LAYER_MOVING = 1;
export const TICK = 1 / 90;
/** Jolt's angular damping on every body, 1/s: numerical, not a model of anything (architecture finding A5). */
const ANGULAR_DAMPING = 0.02;
const MAX_SUBSTEPS = 8;
/** How far an intact joint's two sides may be apart before it is a defect (5 mm: well past any solver tolerance). */
const JOINT_DRIFT = 0.005;
/** A joint further apart than this is not yet holding: the solver pulls it in before the assembly pass takes it on. */
const SEATED = 0.02;
/** Across a joint, a mass ratio at which Jolt's iterations no longer settle it within a tick. */
const MASS_RATIO = 10;
/** How far a joint may run past its stop within one substep: 0.01 rad, 2 mm. */
const STOP_TURN = 0.01, STOP_TRAVEL = 0.002;
/** Largest omega * dt per substep at which a spring is still simulated accurately (spike: 0.11 -> 0.36% period error). */
const SUBSTEP_OMEGA_DT = 0.12;
const SUBGROUPS = 4096;
/** A fractured bond whose faces are still this well aligned (rad) lets its two pieces collide with each other. */
const CLEAN_BREAK_ANGLE = 0.15;
const IDENTITY_Q: Quat = [0, 0, 0, 1];
/**
 * Largest ratio of a bonded segment's principal moments of inertia that Jolt's constraint solver holds together (A13).
 * A locked bond between two segments inverts their summed inverse inertias in single precision; measured on a
 * six-segment chain dropped on the floor, it converges up to a ratio of 1e4 and diverges (500 m/s, then NaN) at
 * 3.3e4. Held here to 1e3, a tenth of the last ratio seen stable. Only a segment's spin about its own axis changes,
 * and only for segments longer than about 77 radii (a round section's ratio is about 6 r^2 / L^2).
 */
const MAX_BONDED_KAPPA = 1e3;
const BOND_VELOCITY_STEPS = 20;
/** Thickness of the slab behind each scanned room plane (m). */
const ROOM_SLAB = 0.04;
const BOND_POSITION_STEPS = 4;
/**
 * Every joint gets the iterations bonded segments get. A joint carries the load of everything on it, often through a
 * light part (a hanger, an axle segment) between heavy ones; with the island's default iterations it drifts apart
 * under that, which no real joint does (tests/conformance/laws.test.ts holds every joint kind to it).
 */
const joinSteps = (s: { mNumVelocityStepsOverride: number; mNumPositionStepsOverride: number }) => {
  s.mNumVelocityStepsOverride = BOND_VELOCITY_STEPS;
  s.mNumPositionStepsOverride = BOND_POSITION_STEPS;
};

/** One Jolt body: a whole part, or one segment of a breakable part. */
interface BodyRec {
  /** Body id: the part id, or "part#k" for segment k. */
  id: string;
  /** Its pose at the end of the last tick in which its state was a number (fault containment). */
  good?: Pose;
  partId: string;
  seg: number;
  pr: PartRec;
  slot: number;
  subgroup: number;
  body: JoltNS.Body;
  kind: PartKind;
  material: Material;
  shape: CollisionShape;
  dims: PartDims;
  mass: number;
  volume: number;
  faceAreas: Vec3;
  /**
   * A magnet's field: Br this tick. An electromagnet on a switch (`drive`) has `rated` at full power, times its
   * channel; at zero it is plain steel.
   */
  magnet?: { geom: MagnetGeometry; Br: number; rated: number; drive?: string };
  frozen: boolean;
  grabbed: GrabMode | null;
  inFluid: boolean;
  /** Body-space inertia tensor (row-major 3x3), read from Jolt; null for static bodies. */
  Iloc: number[] | null;
  /** Its own inertia, before any motor rotor it turns was added to it (rotorInertia). */
  Iown?: number[];
  /** State at the start of the current tick (for the rigid-cluster projection). */
  prior: { pose: Pose; v: Vec3; w: Vec3 } | null;
}

interface BondRec {
  /** Between segment k and k + 1. */
  k: number;
  a: BodyRec;
  b: BodyRec;
  plastic: boolean;
  constraint: JoltNS.Constraint;
  typed: JoltNS.SixDOFConstraint;
  pairKey: number;
  over: number;
  u: number;
  mode: string;
  /** Pose of segment k + 1 relative to segment k that the bond holds. */
  rest: Pose;
  loads: BondLoads;
  /** Section force / moment on the far side added by the rigid-cluster projection this tick (N, N m, world). */
  corrF: Vec3;
  corrT: Vec3;
}

interface PartRec {
  id: string;
  part: Part;
  kind: PartKind;
  material: Material;
  layout: SegmentLayout | null;
  segs: BodyRec[];
  /** Bond k joins segment k and k + 1; null when broken (or when the part is frozen). */
  bonds: (BondRec | null)[];
  broken: Set<number>;
  cap: BondCapacity | null;
  /** Slot reporting the part's own pose: its body, or for segmented parts a virtual slot derived from segment 0. */
  slot: number;
  /** Collision pairs kept disabled between pieces that tore apart while bent (they overlap at the tear). */
  heldPairs: number[];
}

interface ConnRec {
  id: string;
  conn: Connection;
  kind: ConnectorKind;
  derived: Derived;
  pa: PartRec;
  pb: PartRec | null;
  /** The bodies the joint attaches to (the segment under each endpoint) and the frames in their coordinates. */
  a: BodyRec;
  b: BodyRec | null;
  frameA: Pose;
  frameB: Pose | null;
  /** Each part's thickness along the joint's normal, worked out once. */
  through?: Through;
  /** The reduced inertia about its axis (jointAxisInertia), for the topology it was worked out for. */
  axisI?: { at: number; I: number };
  /** The topology its drive (servo, return spring) was last sized for. */
  sizedAt?: number;
  /** Already reported as coming apart (once is enough). */
  driftReported?: boolean;
  /** Its two sides have been together: from then on they must stay so. */
  heldOnce?: boolean;
  constraint: JoltNS.Constraint | null;
  extra: JoltNS.Constraint[];
  typed: JoltNS.SixDOFConstraint | JoltNS.HingeConstraint | JoltNS.SliderConstraint | JoltNS.SwingTwistConstraint | JoltNS.DistanceConstraint | null;
  status: Connection['state']['status'];
  over: number;
  slipTicks: number;
  cure: number;
  lastDerive: number;
  load: ConnectionLoad;
  /** Rest separation / stiffness for spring-like models, after the stiffness-regime rule. */
  springRigid: boolean;
  omega: number;
  bandRest: number;
  materials: Record<string, Material>;
  lastPositionLambda: number;
  pairKeys: number[];
  /** Force / moment this joint supplied to hold a projected breakable part (lambda convention: on body 2). */
  corrF: Vec3;
  corrT: Vec3;
  /** For a joint to the world: where in the world it holds endpoint A (fixed when the joint is built). */
  worldB: Pose | null;
}

/**
 * A motor drive's electrical side: the motor and gearhead its part is, how hot its winding and housing run, whether it
 * has burnt out, and what it is wired to (worked out again whenever what is joined to what changes).
 */
interface DriveRec {
  sig: string;
  model: MotorModel;
  gear: GearheadData | null;
  heat: MotorHeat;
  burnt: boolean;
  /** Battery part it runs on and the resistance of the wire to it (both conductors), for topology `at`. */
  battery: string | null;
  wire: number;
  at: number;
  /** This tick: duty applied, current, output speed rad/s (as the tick began), and the turning impulse given so far. */
  u: number;
  I: number;
  w: number;
  impulse: number;
}

/** A battery's state: the pack its part is, its charge, and what it gives now. */
interface CellRec {
  sig: string;
  pack: Pack;
  soc: number;
  V: number;
  I: number;
  flat: boolean;
  /** The charge its part was given (a new one resets it). */
  set: number;
}

/** A rigid link inside an assembly: segment bond or rigid joint, holding v at `rest` in u's frame. */
interface RigidEdge {
  u: BodyRec;
  v: BodyRec;
  rest: Pose;
  bond: BondRec | null;
  conn: ConnRec | null;
}

/** A stiff joint holding a body to something immovable (for the rigid-cluster projection). */
interface Anchor {
  c: ConnRec;
  sign: number;
  frame: Pose;
  other: BodyRec | null;
  /** The frame on the immovable side, in its body's coordinates (null for the world). */
  otherFrame: Pose | null;
}

interface ClusterWork {
  comp: BodyRec[];
  adj: Map<BodyRec, { e: RigidEdge; other: BodyRec }[]>;
}

/** An assembly after fitting: pose, prediction and the bookkeeping for its internal loads. */
interface FittedCluster extends ClusterWork {
  index: Map<BodyRec, number>;
  order: number[];
  parent: Int32Array;
  parentEdge: (RigidEdge | null)[];
  disc: Int32Array;
  low: Int32Array;
  /** Rest shape (poses in body 0's frame), rigid pose and centre of mass at tick start. */
  T: Pose[];
  C0: Pose;
  com0: Vec3;
  M: number;
  NP0: Pose[];
  P0: Pose[];
  Iw0: number[][];
  pri: { pose: Pose; v: Vec3; w: Vec3 }[];
  joltP: Vec3[];
  joltL: Vec3[];
  newV: Vec3[];
  ent: Ent;
  /** The rigid motion it started the tick with (for restitution). */
  priorEnt: Entity;
}

/** A solver entity: a whole assembly, or a lone body. */
interface Ent {
  e: Entity;
  work: FittedCluster | null;
  single: BodyRec | null;
  touched: boolean;
  /** A lone body's pose at tick start (if known) and the velocity it entered the solve with. */
  start: Pose | null;
  v0: Vec3;
  w0: Vec3;
  /** Intact rigid joints to something immovable: the entity is immovable too, and these share its reaction. */
  fixed: { r: BodyRec; a: Anchor }[];
}

interface RowTag {
  kind: 'anchor' | 'hinge' | 'contact' | 'joint';
  /** Bodies on the row's a and b sides (for per-body impulse bookkeeping; null = world / immovable). */
  ma: BodyRec | null;
  mb: BodyRec | null;
  anchor?: Anchor;
  bond?: BondRec;
  conn?: ConnRec;
}

interface RecordedContact {
  key: string;
  m: BodyRec;
  o: BodyRec | null;
  oStatic: boolean;
  oBody: JoltNS.Body;
  /** From m toward o. */
  n: Vec3;
  /** Contact points on m and on o, world, at tick start. */
  points: { pm: Vec3; po: Vec3 }[];
  friction: number;
  restitution: number;
}

interface Grab {
  hand: string;
  rec: BodyRec;
  /** Bonded pieces moved with the held body in creative mode, with their pose relative to it. */
  followers: { rec: BodyRec; rel: Pose }[];
  mode: GrabMode;
  target: Pose;
  strength: number;
  mass: number;
  inertia: number;
}

export interface WorldOptions {
  maxMagnetRings: number;
  /** Consecutive over-capacity ticks before a yield-type failure. */
  filterTicks: number;
  /** Hold magnets at rest in contact with a latch (M6); off, their contact is simulated as forces throughout. */
  magnetLatch: boolean;
}

/** Whether a body's field is on this tick. */
const fieldOn = (r: BodyRec) => !!r.magnet && r.magnet.Br > 0;

/** A part's field: a permanent magnet's from its grade; an electromagnet's from its coil, on its switch if it has one. */
function magnetOf(g: MagnetGeometry | undefined, material: Material, level: (ch: string) => number): BodyRec['magnet'] {
  if (!g) return undefined;
  const rated = g.Br ?? material.remanence ?? 0;
  if (!(rated > 0)) return undefined;
  return { geom: g, rated, Br: g.drive ? rated * level(g.drive) : rated, drive: g.drive };
}

export class PhysicsWorld {
  readonly J: J;
  private jolt: JoltNS.JoltInterface;
  private ps: JoltNS.PhysicsSystem;
  private bi: JoltNS.BodyInterface;
  private groupFilter: JoltNS.GroupFilterTable;
  private parts = new Map<string, PartRec>();
  private bodies = new Map<string, BodyRec>();
  private bySlot: (BodyRec | PartRec | null)[] = [];
  private freeSlots: number[] = [];
  private freeSubgroups: number[] = [];
  private nextSubgroup = 1;
  private pairRefs = new Map<number, number>();
  private conns = new Map<string, ConnRec>();
  private envBodies: JoltNS.Body[] = [];
  /** What the floor and walls are made of, by Jolt body id (for where friction's heat goes). */
  private envMaterial = new Map<number, Material>();
  private roomBodies: JoltNS.Body[] = [];
  private terrainBody: JoltNS.Body | null = null;
  private grabs = new Map<string, Grab>();
  private sim: SimSettings;
  private channels: Record<string, number> = { throttle: 0, steer: 0, aux: 0, always: 1 };
  /** Motor drives' electrical state by joint, batteries' by part. */
  private drives = new Map<string, DriveRec>();
  private cells = new Map<string, CellRec>();
  private events: PhysicsEvent[] = [];
  private slotVersion = 1;
  private slotsDirty = true;
  private time = 0;
  private ticks = 0;
  private opts: WorldOptions = { maxMagnetRings: 4, filterTicks: 2, magnetLatch: true };
  private lastSubsteps = 1;
  private lastMagnetPairs = 0;
  /** Velocity of every awake body at the start of the current (sub)step, keyed by Jolt body id: what it hit with. */
  private preStep = new Map<number, [Vec3, Vec3]>();
  /** Stiffness of close magnetic pairs, measured at the start of each tick. */
  private magnetStiffness = new Map<string, MagnetStiffness>();
  /** The Jacobians of close magnetic pairs, in a's frame, and b's pose relative to a when they were measured. */
  private stiffnessCache = new Map<string, { relP: Vec3; relQ: Quat; Jt: number[]; Jr: number[] }>();
  private latches = new Map<string, MagnetLatch>();
  private eddies: EddyElement[] = [];
  private touches = new Map<string, MagnetTouch>();
  private contactListener: JoltNS.ContactListenerJS;
  // scratch objects (reused to avoid WASM allocations on hot paths)
  private v1: JoltNS.Vec3;
  private v2: JoltNS.Vec3;
  private r1: JoltNS.RVec3;
  private q1: JoltNS.Quat;
  private fixedToWorld: JoltNS.Body;
  private cg: JoltNS.CollisionGroup;
  private pv: JoltNS.Vec3[] = [];
  private pr: JoltNS.RVec3[] = [];
  private pq: JoltNS.Quat[] = [];
  private iv = 0;
  private ir = 0;
  private iq = 0;

  constructor(J: J, sim: SimSettings) {
    this.J = J;
    this.sim = sim;
    const s = new J.JoltSettings();
    s.mMaxBodies = 20000;
    s.mMaxBodyPairs = 65536;
    s.mMaxContactConstraints = 20000;
    const pairs = new J.ObjectLayerPairFilterTable(2);
    pairs.EnableCollision(LAYER_STATIC, LAYER_MOVING);
    pairs.EnableCollision(LAYER_MOVING, LAYER_MOVING);
    const bp = new J.BroadPhaseLayerInterfaceTable(2, 2);
    bp.MapObjectToBroadPhaseLayer(LAYER_STATIC, new J.BroadPhaseLayer(0));
    bp.MapObjectToBroadPhaseLayer(LAYER_MOVING, new J.BroadPhaseLayer(1));
    s.mObjectLayerPairFilter = pairs;
    s.mBroadPhaseLayerInterface = bp;
    s.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bp, 2, pairs, 2);
    this.jolt = new J.JoltInterface(s);
    J.destroy(s);
    this.ps = this.jolt.GetPhysicsSystem();
    this.bi = this.ps.GetBodyInterface();
    // Solver tuned for workshop-scale parts (millimetres to metres), not the metre-scale defaults.
    const settings = this.ps.GetPhysicsSettings();
    settings.mPenetrationSlop = SLOP;
    settings.mSpeculativeContactDistance = 0.01;
    settings.mNumVelocitySteps = 12;
    settings.mNumPositionSteps = 3;
    this.ps.SetPhysicsSettings(settings);
    this.groupFilter = new J.GroupFilterTable(SUBGROUPS);
    this.v1 = new J.Vec3(0, 0, 0);
    this.v2 = new J.Vec3(0, 0, 0);
    this.r1 = new J.RVec3(0, 0, 0);
    this.q1 = new J.Quat(0, 0, 0, 1);
    this.fixedToWorld = this.jolt.sGetFixedToWorldBody();
    this.cg = new J.CollisionGroup(this.groupFilter, 0, 0);
    for (let i = 0; i < 8; i++) {
      this.pv.push(new J.Vec3(0, 0, 0));
      this.pr.push(new J.RVec3(0, 0, 0));
      this.pq.push(new J.Quat(0, 0, 0, 1));
    }
    this.contactListener = this.makeContactListener();
    this.ps.SetContactListener(this.contactListener);
    this.applySim(sim);
  }

  /** Free everything the world allocated in the WebAssembly heap (the system, its bodies and constraints, and ours). */
  destroy() {
    const J = this.J;
    J.destroy(this.jolt);
    // the collision group holds the last reference to the group filter (its 4096-group pair table), freeing it
    J.destroy(this.cg);
    J.destroy(this.contactListener);
    for (const o of [this.v1, this.v2, this.r1, this.q1, ...this.pv, ...this.pr, ...this.pq]) J.destroy(o);
  }

  // Rotating scratch values: Jolt copies them on assignment / construction, so no WASM allocation leaks.
  private V(v: readonly number[]): JoltNS.Vec3 {
    const o = this.pv[(this.iv = (this.iv + 1) & 7)]!;
    o.Set(v[0]!, v[1]!, v[2]!);
    return o;
  }

  private R(v: readonly number[]): JoltNS.RVec3 {
    const o = this.pr[(this.ir = (this.ir + 1) & 7)]!;
    o.Set(v[0]!, v[1]!, v[2]!);
    return o;
  }

  private Q(q: readonly number[]): JoltNS.Quat {
    const o = this.pq[(this.iq = (this.iq + 1) & 7)]!;
    o.Set(q[0]!, q[1]!, q[2]!, q[3]!);
    return o;
  }

  // ---------------------------------------------------------------------------------------------
  // ops

  apply(op: PhysicsOp) {
    // anything changed from outside (a load, a part, a hand, a switch): every magnetic pair is watched again closely
    this.magnetRest.clear();
    switch (op.op) {
      case 'environment': return this.setEnvironment(op.boxes, op.materials);
      case 'terrain': return this.setTerrain(op.field, op.material);
      case 'clear': return this.clear();
      case 'upsertPart': return this.upsertPart(op.part, op.material, op.keepLivePose);
      case 'removePart': return this.removePart(op.id);
      case 'upsertConnection': return this.upsertConnection(op.conn, op.materials);
      case 'removeConnection': return this.removeConnection(op.id);
      case 'sim': return this.applySim(op.sim);
      case 'setPose': return this.setPose(op.id, op.pose, op.linear, op.angular);
      case 'impulse': return this.impulse(op.id, op.point, op.impulse);
      case 'grab': return this.grab(op.hand, op.id, op.mode, op.target, op.strength, op.group);
      case 'grabTarget': { const g = this.grabs.get(op.hand); if (g) g.target = op.target; return; }
      case 'release': return this.release(op.hand, op.linear, op.angular);
      case 'controls': this.channels = { ...this.channels, ...op.channels, always: 1 }; return;
      case 'damage': return this.setDamage(op.id, op.damage);
      case 'room': return this.setRoom(op.surfaces);
      case 'options':
        this.opts = {
          ...this.opts,
          ...(op.maxMagnetRings ? { maxMagnetRings: op.maxMagnetRings } : {}),
          ...(op.filterTicks ? { filterTicks: op.filterTicks } : {}),
          ...(op.magnetLatch !== undefined ? { magnetLatch: op.magnetLatch } : {}),
        };
        return;
    }
  }

  private applySim(sim: SimSettings) {
    this.sim = sim;
    this.v1.Set(sim.gravity[0], sim.gravity[1], sim.gravity[2]);
    this.ps.SetGravity(this.v1);
    for (const r of this.bodies.values()) if (!r.frozen) this.bi.ActivateBody(r.body.GetID());
  }

  private setEnvironment(boxes: EnvironmentBox[], materials: Record<string, Material>) {
    const J = this.J;
    for (const b of this.envBodies) {
      this.bi.RemoveBody(b.GetID());
      this.bi.DestroyBody(b.GetID());
    }
    this.envBodies = [];
    this.envMaterial.clear();
    for (const box of boxes) {
      const m = materials[box.material];
      const shape = new J.BoxShape(this.V(box.half), Math.min(0.01, Math.min(...box.half) * 0.4));
      const cs = new J.BodyCreationSettings(shape, this.R(box.pose.p), this.Q(box.pose.q), J.EMotionType_Static, LAYER_STATIC);
      cs.mFriction = m?.friction ?? 0.6;
      cs.mRestitution = m?.restitution ?? 0.3;
      cs.mUserData = 0;
      const body = this.bi.CreateBody(cs);
      J.destroy(cs);
      this.bi.AddBody(body.GetID(), J.EActivation_DontActivate);
      this.envBodies.push(body);
      if (m) this.envMaterial.set(body.GetID().GetIndexAndSequenceNumber(), m);
    }
  }

  /**
   * A place's ground as a Jolt heightfield: each sample at (−size/2 + x step, height, −size/2 + z step), each cell two
   * triangles, static, with its material's friction and restitution (and its heat, for the energy books).
   */
  private setTerrain(field: TerrainField | null, material: Material | null) {
    const J = this.J;
    if (this.terrainBody) {
      this.envMaterial.delete(this.terrainBody.GetID().GetIndexAndSequenceNumber());
      this.bi.RemoveBody(this.terrainBody.GetID());
      this.bi.DestroyBody(this.terrainBody.GetID());
      this.terrainBody = null;
    }
    if (!field) return;
    const step = field.size / (field.n - 1);
    const s = new J.HeightFieldShapeSettings();
    s.mOffset = this.V([-field.size / 2, 0, -field.size / 2]);
    s.mScale = this.V([step, 1, step]);
    s.mSampleCount = field.n;
    s.mHeightSamples.clear();
    s.mHeightSamples.reserve(field.n * field.n);
    for (let i = 0; i < field.n * field.n; i++) s.mHeightSamples.push_back(field.heights[i]!);
    const res = s.Create();
    if (!res.IsValid()) { J.destroy(s); throw new Error(`terrain: ${res.GetError().c_str()}`); }
    const shape = res.Get();
    const cs = new J.BodyCreationSettings(shape, this.R([0, 0, 0]), this.Q([0, 0, 0, 1]), J.EMotionType_Static, LAYER_STATIC);
    cs.mFriction = material?.friction ?? 0.6;
    cs.mRestitution = material?.restitution ?? 0.1;
    cs.mUserData = 0;
    const body = this.bi.CreateBody(cs);
    J.destroy(cs);
    J.destroy(s);
    this.bi.AddBody(body.GetID(), J.EActivation_DontActivate);
    this.terrainBody = body;
    if (material) this.envMaterial.set(body.GetID().GetIndexAndSequenceNumber(), material);
    for (const r of this.bodies.values()) if (!r.frozen) this.bi.ActivateBody(r.body.GetID());
  }

  /**
   * The real room as static colliders: each detected plane becomes a thin slab behind its surface (so parts rest
   * on the real table top, floor, or against a wall), each detected mesh a triangle-mesh shape.
   */
  private setRoom(surfaces: RoomSurface[]) {
    const J = this.J;
    for (const b of this.roomBodies) {
      this.bi.RemoveBody(b.GetID());
      this.bi.DestroyBody(b.GetID());
    }
    this.roomBodies = [];
    for (const s of surfaces) {
      let shape: JoltNS.Shape | null = null;
      try {
        if (s.kind === 'plane' && s.polygon && s.polygon.length >= 6) {
          const hull = new J.ConvexHullShapeSettings();
          for (let i = 0; i + 1 < s.polygon.length; i += 2) {
            const x = s.polygon[i]!, z = s.polygon[i + 1]!;
            hull.mPoints.push_back(this.V([x, 0, z]));
            hull.mPoints.push_back(this.V([x, -ROOM_SLAB, z]));
          }
          hull.mMaxConvexRadius = 0.001;
          const res = hull.Create();
          if (res.IsValid()) { shape = res.Get(); shape.AddRef(); }
          J.destroy(hull);
        } else if (s.kind === 'mesh' && s.vertices && s.indices && s.indices.length >= 3) {
          const verts = new J.VertexList();
          for (let i = 0; i + 2 < s.vertices.length; i += 3) {
            const f = new J.Float3(s.vertices[i]!, s.vertices[i + 1]!, s.vertices[i + 2]!);
            verts.push_back(f);
            J.destroy(f);
          }
          // scans arrive with either winding and Jolt ignores back faces, so every triangle goes in both ways
          const tris = new J.IndexedTriangleList();
          for (let i = 0; i + 2 < s.indices.length; i += 3) {
            const a = s.indices[i]!, b = s.indices[i + 1]!, c = s.indices[i + 2]!;
            if (a === b || b === c || a === c) continue;
            for (const [x, y, z] of [[a, b, c], [a, c, b]] as const) {
              const t = new J.IndexedTriangle(x, y, z, 0);
              tris.push_back(t);
              J.destroy(t);
            }
          }
          const mats = new J.PhysicsMaterialList();
          const ms = new J.MeshShapeSettings(verts, tris, mats);
          const res = ms.Create();
          if (res.IsValid()) { shape = res.Get(); shape.AddRef(); }
          J.destroy(ms);
          J.destroy(verts);
          J.destroy(tris);
          J.destroy(mats);
        }
      } catch {
        shape = null; // a degenerate scan surface is skipped, never fatal
      }
      if (!shape) continue;
      const cs = new J.BodyCreationSettings(shape, this.R(s.pose.p), this.Q(s.pose.q), J.EMotionType_Static, LAYER_STATIC);
      shape.Release();
      cs.mFriction = 0.6;
      cs.mRestitution = 0.3;
      cs.mUserData = 0;
      const body = this.bi.CreateBody(cs);
      J.destroy(cs);
      this.bi.AddBody(body.GetID(), J.EActivation_DontActivate);
      this.roomBodies.push(body);
    }
    // anything resting where the room changed must re-check its support
    for (const r of this.bodies.values()) if (!r.frozen) this.bi.ActivateBody(r.body.GetID());
  }

  /** Number of static colliders currently standing in for the real room (tests, stats). */
  roomColliderCount() {
    return this.roomBodies.length;
  }

  clear() {
    for (const id of [...this.conns.keys()]) this.removeConnection(id);
    for (const id of [...this.parts.keys()]) this.removePart(id);
    this.grabs.clear();
    this.ledger = emptyEnergies();
  }

  // ---------------------------------------------------------------------------------------------
  // collision filtering between subgroups (reference counted: several joints can link the same pair)

  private pairKey(a: number, b: number) {
    return a < b ? a * SUBGROUPS + b : b * SUBGROUPS + a;
  }

  private holdPair(a: number, b: number): number {
    if (a === 0 || b === 0 || a === b) return -1;
    const key = this.pairKey(a, b);
    const n = this.pairRefs.get(key) ?? 0;
    if (n === 0) this.groupFilter.DisableCollision(a, b);
    this.pairRefs.set(key, n + 1);
    return key;
  }

  private releasePair(key: number) {
    if (key < 0) return;
    const n = this.pairRefs.get(key) ?? 0;
    if (n <= 1) {
      this.pairRefs.delete(key);
      this.groupFilter.EnableCollision(Math.floor(key / SUBGROUPS), key % SUBGROUPS);
    } else {
      this.pairRefs.set(key, n - 1);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // parts

  private buildShape(desc: CollisionShape, density: number): JoltNS.Shape {
    const J = this.J;
    const cr = (m: number) => Math.max(0, Math.min(0.002, m * 0.3));
    if (desc.type === 'compound') {
      const sc = new J.StaticCompoundShapeSettings();
      for (const c of desc.children) {
        sc.AddShape(this.V(c.p), this.Q(c.q), this.convexSettings(c.shape, density, cr), 0);
      }
      const shape = sc.Create().Get();
      shape.AddRef();
      J.destroy(sc);
      return shape;
    }
    const settings = this.convexSettings(desc, density, cr);
    const shape = settings.Create().Get();
    shape.AddRef();
    J.destroy(settings);
    return shape;
  }

  private convexSettings(s: ConvexShape, density: number, cr: (m: number) => number): JoltNS.ConvexShapeSettings {
    const J = this.J;
    let out: JoltNS.ConvexShapeSettings;
    if (s.type === 'box') {
      out = new J.BoxShapeSettings(this.V([Math.max(s.half[0], 1e-4), Math.max(s.half[1], 1e-4), Math.max(s.half[2], 1e-4)]), cr(Math.min(...s.half)));
    } else if (s.type === 'cylinder') {
      out = new J.CylinderShapeSettings(Math.max(s.halfHeight, 1e-4), Math.max(s.radius, 1e-4), cr(Math.min(s.halfHeight, s.radius)));
    } else if (s.type === 'sphere') {
      out = new J.SphereShapeSettings(Math.max(s.radius, 1e-4));
    } else {
      const hull = new J.ConvexHullShapeSettings();
      for (const p of s.points) hull.mPoints.push_back(this.V(p));
      hull.mMaxConvexRadius = 0.002;
      out = hull;
    }
    out.mDensity = density;
    return out;
  }

  private allocSlot(reuse: number[]): number {
    const r = reuse.shift();
    if (r !== undefined) return r;
    const s = this.freeSlots.pop();
    if (s !== undefined) return s;
    this.bySlot.push(null);
    return this.bySlot.length - 1;
  }

  private freeSlot(s: number) {
    this.bySlot[s] = null;
    this.freeSlots.push(s);
  }

  private allocSubgroup(): number {
    const s = this.freeSubgroups.pop();
    if (s !== undefined) return s;
    if (this.nextSubgroup >= SUBGROUPS) return 0; // beyond the table: shares subgroup 0 (no self-collision filtering)
    return this.nextSubgroup++;
  }

  private freeSubgroup(sg: number) {
    if (sg <= 0) return;
    // anything still disabled against this subgroup goes back to colliding before it is recycled
    for (const key of [...this.pairRefs.keys()]) {
      const a = Math.floor(key / SUBGROUPS), b = key % SUBGROUPS;
      if (a === sg || b === sg) {
        this.pairRefs.delete(key);
        this.groupFilter.EnableCollision(a, b);
      }
    }
    this.freeSubgroups.push(sg);
  }

  /** Straight segment poses for a part pose. */
  private straightPoses(pose: Pose, layout: SegmentLayout | null): Pose[] {
    if (!layout) return [pose];
    return layout.centers.map((_, k) => composePose(pose, segmentOffset(layout, k)));
  }

  private velocityOf(r: BodyRec): [Vec3, Vec3] {
    const lv = this.bi.GetLinearVelocity(r.body.GetID());
    const av = this.bi.GetAngularVelocity(r.body.GetID());
    return [[lv.GetX(), lv.GetY(), lv.GetZ()], [av.GetX(), av.GetY(), av.GetZ()]];
  }

  upsertPart(part: Part, material: Material, keepLivePose: boolean) {
    this.topology++;
    const J = this.J;
    const existing = this.parts.get(part.id);
    const kind = getPartKind(part.kind);
    const params = effectiveParams(kind, part.params, material);
    const layout = segmentLayout(kind, params);
    const count = layout ? layout.count : 1;

    // Where each new body goes, and how fast it is moving.
    let poses: Pose[];
    let vels: [Vec3, Vec3][] | null = null;
    if (existing && keepLivePose) {
      if (existing.segs.length === count) {
        poses = existing.segs.map((s) => this.poseOf(s));
        vels = existing.segs.map((s) => this.velocityOf(s));
      } else {
        poses = this.straightPoses(this.virtualPose(existing), layout);
        const v = this.velocityOf(existing.segs[0]!);
        vels = poses.map(() => v);
      }
    } else if (layout && part.damage.segments && part.damage.segments.length === count) {
      poses = part.damage.segments;
    } else {
      poses = this.straightPoses(part.pose, layout);
    }

    // Connections attached to this part must be rebuilt against the new bodies; held parts are re-grabbed.
    const attached = [...this.conns.values()].filter((c) => c.pa.id === part.id || c.pb?.id === part.id);
    for (const c of attached) this.destroyConstraint(c);
    const regrab = [...this.grabs.values()].filter((g) => g.rec.partId === part.id);
    for (const g of regrab) this.grabs.delete(g.hand);
    const reuse: number[] = [];
    if (existing) {
      reuse.push(...existing.segs.map((s) => s.slot));
      if (existing.layout) reuse.push(existing.slot);
      this.destroyPartBodies(existing);
    }

    const segParams = layout ? layout.segParams : params;
    const shapeDesc = kind.collision(segParams);
    const volume = Math.max(kind.volume(segParams, material), 1e-9);
    // a bought item (a motor, a battery) weighs what its datasheet says, spread through its outline
    const mass = massOf(kind, segParams, material);
    const density = mass / volume;
    const dims = kind.dims(segParams);
    const bounds = shapeBounds(shapeDesc);
    const ext = sub(bounds.max, bounds.min);
    const magGeom = kind.magnet?.(params);
    const pr: PartRec = {
      id: part.id, part, kind, material, layout, segs: [], bonds: [],
      broken: new Set(layout ? part.damage.broken.filter((k) => k >= 0 && k < count - 1) : []),
      cap: layout && kind.bond ? bondCapacity(kind.bond(params), material) : null,
      slot: -1, heldPairs: [],
    };
    for (let k = 0; k < count; k++) {
      const pose = poses[k]!;
      const shape = this.buildShape(shapeDesc, density);
      const motion = part.frozen ? J.EMotionType_Static : J.EMotionType_Dynamic;
      const cs = new J.BodyCreationSettings(shape, this.R(pose.p), this.Q(pose.q), motion, LAYER_MOVING);
      shape.Release();
      const slot = this.allocSlot(reuse);
      const subgroup = this.allocSubgroup();
      cs.mAllowDynamicOrKinematic = true;
      cs.mFriction = material.friction;
      cs.mRestitution = material.restitution;
      cs.mLinearDamping = 0;
      cs.mAngularDamping = ANGULAR_DAMPING;
      cs.mMaxAngularVelocity = 400;
      // Torque-free bodies conserve angular momentum (tumbling, precession), not angular velocity. Segments of
      // breakable parts get this at the level of the whole rigid assembly in the projection instead.
      cs.mApplyGyroscopicForce = !layout;
      cs.mUserData = slot + 1;
      cs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia;
      cs.mMassPropertiesOverride.mMass = mass;
      // Continuous collision for every moving part: Jolt sweeps a body only when it moves further than a fraction of
      // its own size in one step, so this costs nothing at rest and stops a fast part stepping through a wall
      cs.mMotionQuality = J.EMotionQuality_LinearCast;
      this.cg.SetSubGroupID(subgroup);
      cs.mCollisionGroup = this.cg;
      const body = this.bi.CreateBody(cs);
      J.destroy(cs);
      if (!part.frozen) this.checkInertia(body, mass, !!layout);
      this.bi.AddBody(body.GetID(), part.frozen ? J.EActivation_DontActivate : J.EActivation_Activate);
      const v = vels?.[k];
      if (!part.frozen && v && (length(v[0]) > 0 || length(v[1]) > 0)) {
        this.v1.Set(...v[0]);
        this.v2.Set(...v[1]);
        this.bi.SetLinearAndAngularVelocity(body.GetID(), this.v1, this.v2);
      }
      const rec: BodyRec = {
        id: layout ? segmentBodyId(part.id, k) : part.id, partId: part.id, seg: layout ? k : -1, pr,
        slot, subgroup, body, kind, material, shape: shapeDesc, dims, mass, volume,
        faceAreas: [ext[1] * ext[2], ext[0] * ext[2], ext[0] * ext[1]],
        magnet: magnetOf(magGeom, material, (ch) => this.channelLevel(ch)),
        frozen: part.frozen, grabbed: null, inFluid: false, Iloc: null, prior: null,
      };
      if (!part.frozen) rec.Iloc = k > 0 && pr.segs[0]?.Iloc ? pr.segs[0].Iloc : this.localInertia(rec);
      pr.segs.push(rec);
      this.bodies.set(rec.id, rec);
      this.bySlot[slot] = rec;
    }
    pr.slot = layout ? this.allocSlot(reuse) : pr.segs[0]!.slot;
    if (layout) this.bySlot[pr.slot] = pr;
    for (const s of reuse) this.freeSlot(s);
    this.parts.set(part.id, pr);
    for (let k = 0; k < count - 1; k++) pr.bonds.push(!part.frozen && !pr.broken.has(k) ? this.buildBond(pr, k, false) : null);
    this.slotsDirty = true;
    for (const c of attached) {
      this.resolveEnds(c);
      this.buildConstraint(c);
    }
    for (const g of regrab) {
      const seg = g.rec.seg >= 0 ? Math.min(g.rec.seg, count - 1) : 0;
      this.grab(g.hand, pr.segs[seg]!.id, g.mode, g.target, g.strength);
    }
  }

  /** Remove a part's bonds and bodies (slots and subgroups are released; the caller re-allocates). */
  private destroyPartBodies(pr: PartRec) {
    for (const l of [...this.latches.values()]) if (l.a.pr === pr || l.b.pr === pr) this.unlatch(l);
    for (const b of pr.bonds) if (b) this.destroyBond(b);
    pr.bonds = [];
    for (const key of pr.heldPairs) this.releasePair(key);
    pr.heldPairs = [];
    for (const r of pr.segs) {
      const id = r.body.GetID();
      this.bi.RemoveBody(id);
      this.bi.DestroyBody(id);
      this.bodies.delete(r.id);
      this.bySlot[r.slot] = null;
      this.freeSubgroup(r.subgroup);
    }
    if (pr.layout && pr.slot >= 0) this.bySlot[pr.slot] = null;
    this.slotsDirty = true;
  }

  removePart(id: string) {
    this.topology++;
    const pr = this.parts.get(id);
    if (!pr) return;
    for (const c of [...this.conns.values()]) if (c.pa === pr || c.pb === pr) this.removeConnection(c.id);
    for (const [hand, g] of this.grabs) if (g.rec.pr === pr) this.grabs.delete(hand);
    const slots = [...pr.segs.map((s) => s.slot), ...(pr.layout ? [pr.slot] : [])];
    this.destroyPartBodies(pr);
    for (const s of slots) this.freeSlot(s);
    this.parts.delete(id);
  }

  private poseOf(r: BodyRec): Pose {
    const p = r.body.GetPosition();
    const q = r.body.GetRotation();
    return { p: [p.GetX(), p.GetY(), p.GetZ()], q: [q.GetX(), q.GetY(), q.GetZ(), q.GetW()] };
  }

  /** The part's own pose: its body, or for segmented parts the frame carried by segment 0. */
  private virtualPose(pr: PartRec): Pose {
    const s0 = this.poseOf(pr.segs[0]!);
    if (!pr.layout) return s0;
    return composePose(s0, { p: scale(segmentOffset(pr.layout, 0).p, -1), q: IDENTITY_Q });
  }

  /** Live pose of a part (its own frame) or of one body ("part#k"). */
  livePose(id: string): Pose | null {
    const pr = this.parts.get(id);
    if (pr) return this.virtualPose(pr);
    const r = this.bodies.get(id);
    return r ? this.poseOf(r) : null;
  }

  /** Resolve an id to a body: a body id, or a part id (nearest segment to `near`, else the first). */
  private bodyFor(id: string, near?: Vec3): BodyRec | null {
    const r = this.bodies.get(id);
    if (r) return r;
    const pr = this.parts.get(id);
    if (!pr) return null;
    if (pr.segs.length === 1 || !near) return pr.segs[0]!;
    let best = pr.segs[0]!, bd = Infinity;
    for (const s of pr.segs) {
      const d = length(sub(this.poseOf(s).p, near));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  /** Bodies of the same part still held together (by intact bonds, or undamaged when frozen). */
  private cluster(r: BodyRec): BodyRec[] {
    const pr = r.pr;
    if (pr.segs.length === 1) return [r];
    let lo = r.seg, hi = r.seg;
    while (lo > 0 && !pr.broken.has(lo - 1)) lo--;
    while (hi < pr.segs.length - 1 && !pr.broken.has(hi)) hi++;
    return pr.segs.slice(lo, hi + 1);
  }

  private clusterMass(r: BodyRec) {
    let m = 0;
    for (const s of this.cluster(r)) m += s.mass;
    return m;
  }

  /** Rough moment of inertia of a body's cluster about its middle (slender-bar estimate). */
  private clusterInertia(r: BodyRec) {
    const members = this.cluster(r);
    const m = members.reduce((s, x) => s + x.mass, 0);
    const L = r.pr.layout ? r.pr.layout.segLen * members.length : r.dims.length;
    return (m * (L * L + r.dims.a * r.dims.a)) / 12 + 1e-6;
  }

  private setPose(id: string, pose: Pose, linear?: Vec3, angular?: Vec3) {
    const pr = this.parts.get(id);
    const single = pr ? null : this.bodies.get(id) ?? null;
    if (!pr && !single) return;
    // Move rigidly: every body of the part keeps its place relative to the part frame.
    const members = pr ? pr.segs : [single!];
    const cur = pr ? this.virtualPose(pr) : this.poseOf(single!);
    const moved = members.map((r) => composePose(pose, relativePose(cur, this.poseOf(r))));
    const lin = linear ?? [0, 0, 0];
    const ang = angular ?? [0, 0, 0];
    members.forEach((r, i) => {
      const bid = r.body.GetID();
      const np = moved[i]!;
      this.r1.Set(...np.p);
      this.q1.Set(...np.q);
      this.bi.SetPositionAndRotation(bid, this.r1, this.q1, r.frozen ? this.J.EActivation_DontActivate : this.J.EActivation_Activate);
      if (!r.frozen) {
        this.v1.Set(...add(lin, cross(ang, sub(np.p, pose.p))));
        this.v2.Set(...ang);
        this.bi.SetLinearAndAngularVelocity(bid, this.v1, this.v2);
      }
    });
    // a single segment moved on its own: its bonds are rebuilt around the new geometry
    if (single) for (const b of single.pr.bonds) if (b && (b.a === single || b.b === single)) this.rebuildBond(single.pr, b.k, b.plastic);
    // joints were built against the old pose
    const set = new Set(members);
    for (const c of this.conns.values()) if (set.has(c.a) || (c.b && set.has(c.b))) this.buildConstraint(c);
    // a magnet put somewhere by hand is no longer stuck where it was
    for (const l of [...this.latches.values()]) if (set.has(l.a) || set.has(l.b)) this.unlatch(l);
  }

  private impulse(id: string, point: Vec3, imp: Vec3) {
    const r = this.bodyFor(id, point);
    if (!r || r.frozen) return;
    for (const l of [...this.latches.values()]) if (l.a === r || l.b === r) this.knockLatch(l, r, point, imp);
    this.v1.Set(...imp);
    this.r1.Set(...point);
    this.bi.AddImpulse(r.body.GetID(), this.v1, this.r1);
    this.bi.ActivateBody(r.body.GetID());
  }

  // ---------------------------------------------------------------------------------------------
  // bonds inside breakable parts

  private buildBond(pr: PartRec, k: number, plastic: boolean): BondRec {
    const J = this.J;
    const L = pr.layout!;
    const a = pr.segs[k]!, b = pr.segs[k + 1]!;
    const pa = this.poseOf(a), pb = this.poseOf(b);
    const h = L.segLen / 2;
    // Both frames share the world axes of segment k, so the bond holds the current (possibly bent) shape.
    const ax = rotate(pa.q, L.axis);
    const ay = rotate(pa.q, L.perps[0]);
    const s = new J.SixDOFConstraintSettings();
    s.mPosition1 = this.R(transformPoint(pa, scale(L.axis, h)));
    s.mPosition2 = this.R(transformPoint(pb, scale(L.axis, -h)));
    s.mAxisX1 = this.V(ax);
    s.mAxisY1 = this.V(ay);
    s.mAxisX2 = this.V(ax);
    s.mAxisY2 = this.V(ay);
    for (let i = 0; i < 6; i++) s.MakeFixedAxis(i as JoltNS.SixDOFConstraintSettings_EAxis);
    // an island holding bonded segments gets more solver iterations, so joints and contacts on one light segment
    // feel the rest of the part within the step (the assembly pass then makes it exact)
    s.mNumVelocityStepsOverride = BOND_VELOCITY_STEPS;
    s.mNumPositionStepsOverride = BOND_POSITION_STEPS;
    if (plastic && pr.cap) {
      // Plastic hinge: bending rotation is free but resisted by the plastic moment (Coulomb-like, rate independent).
      s.MakeFreeAxis(J.SixDOFConstraintSettings_EAxis_RotationY);
      s.MakeFreeAxis(J.SixDOFConstraintSettings_EAxis_RotationZ);
      s.set_mMaxFriction(J.SixDOFConstraintSettings_EAxis_RotationY, pr.cap.Mp[0]);
      s.set_mMaxFriction(J.SixDOFConstraintSettings_EAxis_RotationZ, pr.cap.Mp[1]);
    }
    const constraint = s.Create(a.body, b.body);
    J.destroy(s);
    this.ps.AddConstraint(constraint);
    const pairKey = this.holdPair(a.subgroup, b.subgroup);
    return {
      k, a, b, plastic, constraint, typed: J.castObject(constraint, J.SixDOFConstraint), pairKey, over: 0, u: 0, mode: '',
      rest: relativePose(pa, pb), corrF: [0, 0, 0], corrT: [0, 0, 0], loads: { N: 0, V: 0, T: 0, M1: 0, M2: 0 },
    };
  }

  private destroyBond(b: BondRec, keepPair = false) {
    this.ps.RemoveConstraint(b.constraint);
    if (!keepPair) this.releasePair(b.pairKey);
  }

  private rebuildBond(pr: PartRec, k: number, plastic: boolean) {
    const old = pr.bonds[k];
    if (old) this.destroyBond(old);
    pr.bonds[k] = this.buildBond(pr, k, plastic);
  }

  /** Relative rotation angle between the two segments of a bond (0 when straight). */
  private bondAngle(b: BondRec) {
    const qa = this.poseOf(b.a).q, qb = this.poseOf(b.b).q;
    const w = Math.abs(qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3]);
    return 2 * Math.acos(Math.min(1, w));
  }

  /** Radius about `o` of a body whose centre is at `p`: how far from o its farthest point can be. */
  private extentAbout(r: BodyRec, p: Vec3, o: Vec3) {
    return length(sub(p, o)) + Math.hypot(r.dims.length, r.dims.a, r.dims.b) / 2;
  }

  /**
   * A body's inertia is its shape's mass properties scaled to its mass. Jolt takes a principal diagonal shorter than
   * 1e-6 kg m^2 for a failed decomposition and substitutes a 1 m sphere's (A11), so it is checked, and set here
   * where Jolt fell back. A bonded segment's smallest principal moment is also held to at least 1 / MAX_BONDED_KAPPA
   * of its largest (A13).
   */
  private checkInertia(body: JoltNS.Body, mass: number, bonded: boolean) {
    const mp = body.GetShape().GetMassProperties();
    mp.ScaleToMass(mass);
    const M = mp.mInertia;
    // Jolt returns temporaries: read each column before asking for the next
    const x = M.GetAxisX(); const c0 = [x.GetX(), x.GetY(), x.GetZ()];
    const y = M.GetAxisY(); const c1 = [y.GetX(), y.GetY(), y.GetZ()];
    const z = M.GetAxisZ(); const c2 = [z.GetX(), z.GetY(), z.GetZ()];
    const { values, vectors } = symmetricEigen3([c0[0]!, c1[0]!, c2[0]!, c0[1]!, c1[1]!, c2[1]!, c0[2]!, c1[2]!, c2[2]!]);
    if (!values.every((v) => v > 0)) return;
    const top = Math.max(...values);
    const moments = bonded ? values.map((v) => Math.max(v, top / MAX_BONDED_KAPPA)) : values;
    const motion = body.GetMotionProperties();
    const d = motion.GetInverseInertiaDiagonal();
    const have = [1 / d.GetX(), 1 / d.GetY(), 1 / d.GetZ()].sort((a, b) => a - b), want = [...moments].sort((a, b) => a - b);
    if (want.every((w, i) => Math.abs(have[i]! - w) <= 1e-3 * w)) return;
    const [e0, e1, e2raw] = vectors as [Vec3, Vec3, Vec3];
    const e2 = dot(cross(e0, e1), e2raw) < 0 ? scale(e2raw, -1) : e2raw; // right-handed principal axes
    motion.SetInverseInertia(this.V(moments.map((v) => 1 / v)), this.Q(quatFromAxes(e0, e1, e2)));
  }

  private localInertia(r: BodyRec): number[] {
    const m = r.body.GetMotionProperties().GetLocalSpaceInverseInertia();
    // Jolt returns temporaries: read each column before asking for the next
    const x = m.GetAxisX(); const c0 = [x.GetX(), x.GetY(), x.GetZ()];
    const y = m.GetAxisY(); const c1 = [y.GetX(), y.GetY(), y.GetZ()];
    const z = m.GetAxisZ(); const c2 = [z.GetX(), z.GetY(), z.GetZ()];
    return inverse3([c0[0]!, c1[0]!, c2[0]!, c0[1]!, c1[1]!, c2[1]!, c0[2]!, c1[2]!, c2[2]!]);
  }

  // ---------------------------------------------------------------------------------------------
  // rigid assemblies
  //
  // An iterative solver lets chains of rigidly joined bodies sag and under-transmit load: a bonded segment or a
  // bolted plate is light next to the assembly it belongs to, so joints and contacts acting on it see the wrong
  // inertia. After each Jolt step every rigid assembly (bodies joined by intact elastic bonds and intact rigid
  // joints) is therefore treated as the one rigid body it physically is:
  //  1. its pose is fitted to the rest shape (anchored DOFs held where their joints hold them);
  //  2. its velocity is predicted from the state it started the tick in, plus the momentum Jolt's impulses added
  //     from outside (internal solver impulses cancel, however unconverged), plus the torque-free rigid term;
  //  3. anchors, plastic hinges between assemblies and contacts with everything else are then re-solved with
  //     sequential impulses on the assemblies' true mass and inertia;
  //  4. every impulse is accounted, so the force through each bond or joint is exact Newton-Euler for the free
  //     side of it, and each anchor, hinge and contact reaction is known.

  private clusters: ClusterWork[] = [];
  /** Which assembly (index into clusters) each member body belongs to this tick. */
  private clusterOf = new Map<BodyRec, number>();
  private hinges: BondRec[] = [];
  /** Bumped whenever what is joined to what changes (a joint built, broken, slipped or removed; a part added or removed). */
  private topology = 0;
  /** Joints of the mechanisms assemblies are part of, re-solved with them each tick. */
  private mechanism: ConnRec[] = [];
  /** Roots of mechanisms with no assembly (their heaviest part), placed first when the mechanism is closed. */
  private mechanismRoots: BodyRec[] = [];
  /** The joints this tick's pass put rows on (their corrections are reset next tick; Jolt's warm start is too). */
  private solvedJoints: ConnRec[] = [];
  /** The energy ledger since the scene began (energy.ts), this tick's books, and the heat each part took this tick. */
  private ledger: Energies = emptyEnergies();
  /** This tick's books; `inMotors` is the friction measured inside motors and gearheads (already in heat.friction). */
  private book = { work: emptyWork(), heat: emptyHeat(), sources: [] as (HeatSource<BodyRec> & { env?: Material })[], inMotors: 0 };
  private heatTick = new Map<string, number>();
  /** What the forces being applied right now are, for the books; and the length of the substep they act over. */
  private forceBook: { kind: keyof WorkBook | 'eddy'; to?: BodyRec } | null = null;
  private subDt = TICK;
  /** Magnetic multirate: this substep's index, the tick's pairs (found once), and each pair's wrench as last worked
   *  out, with how many substeps it stands for. */
  private magnetSub = 0;
  /** Where the last tick's time went, ms (for the watchdog's slow findings). Applying fields counts as magnets. */
  private sections = { magnets: 0, jolt: 0, assemblies: 0, joints: 0, energy: 0 };
  private tickPairs: MagnetPair[] | null = null;
  private magnetHeld = new Map<string, { a: BodyRec; b: BodyRec; F: Vec3; T: Vec3; every: number }>();
  /** Bodies in contact with anything, last tick and this one (from the contact listener). */
  private restingOn = new Set<BodyRec>();
  /** Bodies kept awake because their weight has a moment about what holds them (keepUnbalancedAwake). */
  private unbalanced = new Set<BodyRec>();
  private touchingNow = new Set<BodyRec>();
  /** Ticks each magnetic pair has rested on what it pairs with, since anything last changed. */
  private magnetRest = new Map<string, number>();
  private watch = new Set<BodyRec>();
  private contacts = new Map<string, RecordedContact>();
  /** Accumulated impulses of last tick's assembly rows, by row key. */
  private warm = new Map<string, number>();

  /** Before the step: rigid assemblies, plastic hinges, and the state their bodies start the tick in. */
  private prepareClusters() {
    this.clusters = [];
    this.clusterOf.clear();
    this.hinges = [];
    this.watch.clear();
    this.contacts.clear();
    const free = (r: BodyRec) => !r.frozen && r.grabbed !== 'creative' && r.Iloc !== null;
    for (const pr of this.parts.values()) for (const b of pr.bonds) if (b?.plastic && free(b.a) && free(b.b) && (b.a.body.IsActive() || b.b.body.IsActive())) this.hinges.push(b);
    const edges = this.collectEdges();
    const adj = new Map<BodyRec, { e: RigidEdge; other: BodyRec }[]>();
    const link = (a: BodyRec, e: RigidEdge, b: BodyRec) => (adj.get(a) ?? adj.set(a, []).get(a)!).push({ e, other: b });
    for (const e of edges) { link(e.u, e, e.v); link(e.v, e, e.u); }
    const seen = new Set<BodyRec>();
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      const comp: BodyRec[] = [];
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const cur = stack.pop()!;
        comp.push(cur);
        for (const { other } of adj.get(cur)!) if (!seen.has(other)) { seen.add(other); stack.push(other); }
      }
      if (comp.length < 2 || !comp.some((r) => r.body.IsActive())) continue;
      // Only assemblies that contain bonded segments need this: ordinary joined parts stay with Jolt, whose joints
      // to wheels, motors and sliders (not modelled in this pass) they are usually part of.
      if (!comp.some((r) => r.seg >= 0)) continue;
      // Root the load bookkeeping where the assembly is held (its joints to the outside), else at its heaviest
      // body: each joint's load is read from the branch beyond it, so no bookkeeping remainder reaches it.
      const inComp = new Set(comp);
      const held = new Map<BodyRec, number>();
      for (const c of this.conns.values()) {
        if (c.status === 'broken' || !c.constraint) continue;
        if (inComp.has(c.a) && (!c.b || !inComp.has(c.b))) held.set(c.a, (held.get(c.a) ?? 0) + 1);
        if (c.b && inComp.has(c.b) && !inComp.has(c.a)) held.set(c.b, (held.get(c.b) ?? 0) + 1);
      }
      let root = 0;
      comp.forEach((r, i) => {
        const b = comp[root]!;
        const hr = held.get(r) ?? 0, hb = held.get(b) ?? 0;
        if (hr > hb || (hr === hb && r.mass > b.mass)) root = i;
      });
      [comp[0], comp[root]] = [comp[root]!, comp[0]!];
      for (const r of comp) {
        const [v, w] = this.velocityOf(r);
        r.prior = { pose: this.poseOf(r), v, w };
        this.watch.add(r);
      }
      for (const r of comp) this.clusterOf.set(r, this.clusters.length);
      this.clusters.push({ comp, adj });
    }
    for (const b of this.hinges) for (const r of [b.a, b.b]) {
      if (this.watch.has(r)) continue;
      const [v, w] = this.velocityOf(r);
      r.prior = { pose: this.poseOf(r), v, w };
      this.watch.add(r);
    }
    // the mechanism an assembly is part of: every moving body joined to it, and joined to those, through joints that
    // hold (not springs, ropes or bands). The pass re-solves all of their joints together, so the load through a
    // light hanger or axle segment is carried exactly, and their contacts are recorded for it too.
    this.mechanism = [];
    this.mechanismRoots = [];
    const byBody = new Map<BodyRec, ConnRec[]>();
    // a joint between parts of very different mass (a light bracket between heavy ones) is one Jolt's iterations don't
    // settle either: its mechanism is re-solved too, rooted at its heaviest part
    const seeds: BodyRec[] = [];
    for (const c of this.conns.values()) {
      if (c.status === 'broken' || !c.constraint || !c.b || spans(c.kind.model)) continue;
      if (!free(c.a) || !free(c.b) || c.a === c.b) continue;
      // only a joint already close to holding: a fresh or badly misaligned one (a load left where it fell when its
      // beam is put back) is pulled in by the solver first, so nothing is ever teleported
      if (length(sub(this.anchorWorldB(c).p, this.anchorWorld(c).p)) > SEATED) continue;
      (byBody.get(c.a) ?? byBody.set(c.a, []).get(c.a)!).push(c);
      (byBody.get(c.b) ?? byBody.set(c.b, []).get(c.b)!).push(c);
      if ((c.a.body.IsActive() || c.b.body.IsActive()) && Math.max(c.a.mass, c.b.mass) >= MASS_RATIO * Math.min(c.a.mass, c.b.mass)) seeds.push(c.a, c.b);
    }
    if (!this.clusters.length && !seeds.length) return;
    // islands with no assembly get their heaviest part as the root the mechanism is closed out from
    const reached = new Set<BodyRec>();
    for (const s0 of seeds) {
      if (reached.has(s0)) continue;
      // the whole island the seed is in, through every holding joint (an assembly in it roots it already)
      const island: BodyRec[] = [];
      const stack = [s0];
      reached.add(s0);
      while (stack.length) {
        const x = stack.pop()!;
        island.push(x);
        for (const s1 of this.clusterOf.has(x) ? this.clusters[this.clusterOf.get(x)!]!.comp : []) if (!reached.has(s1)) { reached.add(s1); stack.push(s1); }
        for (const c of byBody.get(x) ?? []) { const o = c.a === x ? c.b! : c.a; if (!reached.has(o)) { reached.add(o); stack.push(o); } }
      }
      if (island.some((x) => this.clusterOf.has(x))) continue;
      const root = island.reduce((a, b) => (b.mass > a.mass ? b : a));
      this.mechanismRoots.push(root);
      const [v, w] = this.velocityOf(root);
      root.prior = { pose: this.poseOf(root), v, w };
      this.watch.add(root);
    }
    const queue = [...this.clusterOf.keys(), ...this.mechanismRoots];
    const inMech = new Set<ConnRec>();
    while (queue.length) {
      const r = queue.pop()!;
      for (const c of byBody.get(r) ?? []) {
        if (inMech.has(c)) continue;
        inMech.add(c);
        const other = c.a === r ? c.b! : c.a;
        if (this.watch.has(other)) continue;
        const [v, w] = this.velocityOf(other);
        other.prior = { pose: this.poseOf(other), v, w };
        this.watch.add(other);
        queue.push(other);
      }
    }
    this.mechanism = [...inMech];
  }

  private collectEdges(): RigidEdge[] {
    // Rigid edges: intact elastic bonds and intact rigid joints, between two free dynamic bodies.
    const edges: RigidEdge[] = [];
    const free = (r: BodyRec) => !r.frozen && r.grabbed !== 'creative' && r.Iloc !== null;
    // Only links already close to their rest shape join an assembly; a fresh or badly misaligned joint is left
    // to the solver to pull in first, so nothing is ever teleported.
    const seated = (u: BodyRec, v: BodyRec, rest: Pose) => {
      const rel = relativePose(this.poseOf(u), this.poseOf(v));
      const dq = Math.abs(rel.q[0] * rest.q[0] + rel.q[1] * rest.q[1] + rel.q[2] * rest.q[2] + rel.q[3] * rest.q[3]);
      return length(sub(rel.p, rest.p)) < 0.005 + 0.01 * length(rest.p) && 2 * Math.acos(Math.min(1, dq)) < 0.03;
    };
    for (const pr of this.parts.values()) {
      for (const b of pr.bonds) if (b && !b.plastic && free(b.a) && free(b.b) && seated(b.a, b.b, b.rest)) edges.push({ u: b.a, v: b.b, rest: b.rest, bond: b, conn: null });
    }
    for (const c of this.conns.values()) {
      if (c.status !== 'intact' || !c.constraint || c.kind.model !== 'rigid' || !c.b || !c.frameB) continue;
      if (!free(c.a) || !free(c.b) || c.a === c.b) continue;
      const rest = composePose(c.frameA, invertPose(c.frameB));
      if (seated(c.a, c.b, rest)) edges.push({ u: c.a, v: c.b, rest, bond: null, conn: c });
    }
    return edges;
  }

  /** Called from the contact listener during the step: remember contacts touching an assembly or a hinge. */
  /**
   * A contact on an assembly or a hinge piece. Each contact has one solver. A resting or sliding one (closing slower
   * than an impact) is recorded and solved by the assembly solve alone: Jolt's own response, unconverged against the
   * stiff bonds of a long chain, overshoots it (a bonded bar on the floor rocks at the tick rate for ever, even in
   * Jolt alone), and the assembly solve, which can only push, would keep that overshoot. An impact is Jolt's alone,
   * with its restitution and continuous collision (so nothing fast passes through a wall); re-solving it here too
   * bounced a clattering part twice, each time with more energy than it came in with.
   */
  private recordContact(b1: JoltNS.Body, b2: JoltNS.Body, man: JoltNS.ContactManifold, settings: JoltNS.ContactSettings, speed: number) {
    const r1 = this.recOf(b1), r2 = this.recOf(b2);
    const w1 = !!r1 && this.watch.has(r1), w2 = !!r2 && this.watch.has(r2);
    if (!w1 && !w2) return;
    const c1 = r1 ? this.clusterOf.get(r1) : undefined, c2 = r2 ? this.clusterOf.get(r2) : undefined;
    if (c1 !== undefined && c1 === c2) return; // within one rigid assembly: nothing moves between them
    if (speed >= MIN_IMPACT_FOR_RESTITUTION) return;
    settings.mIsSensor = true;
    // the watched body is the "member" side; the normal points from it to the other body
    const flip = !w1;
    const m = (flip ? r2 : r1)!, o = flip ? r1 : r2;
    const ob = flip ? b1 : b2;
    const nn = man.mWorldSpaceNormal;
    const n: Vec3 = flip ? [-nn.GetX(), -nn.GetY(), -nn.GetZ()] : [nn.GetX(), nn.GetY(), nn.GetZ()];
    const count = Math.min(4, man.mRelativeContactPointsOn1.size());
    // world points as the contact saw them (tick-start geometry, which is what the assembly solve uses)
    const points: { pm: Vec3; po: Vec3 }[] = [];
    for (let i = 0; i < count; i++) {
      const c1 = man.GetWorldSpaceContactPointOn1(i); const p1: Vec3 = [c1.GetX(), c1.GetY(), c1.GetZ()];
      const c2 = man.GetWorldSpaceContactPointOn2(i); const p2: Vec3 = [c2.GetX(), c2.GetY(), c2.GetZ()];
      points.push(flip ? { pm: p2, po: p1 } : { pm: p1, po: p2 });
    }
    const key = `${m.id}|${o?.id ?? `env${ob.GetID().GetIndexAndSequenceNumber()}`}`;
    this.contacts.set(key, {
      key, m, o, oStatic: !o || o.frozen || ob.IsStatic() || ob.IsKinematic(), oBody: ob, n, points,
      friction: settings.mCombinedFriction, restitution: settings.mCombinedRestitution,
    });
  }

  private recOf(b: JoltNS.Body): BodyRec | null {
    const s = b.GetUserData() - 1;
    const e = s >= 0 ? this.bySlot[s] : null;
    return e && !('segs' in e) ? e : null;
  }

  /** After the step: fit, predict and re-solve every assembly, then account every impulse. */
  private solveAssemblies(dt: number) {
    const contacts = [...this.contacts.values()];
    this.contacts.clear();
    // last tick's corrections on mechanism joints are re-solved now (or are no longer owed)
    for (const c of this.solvedJoints) { c.corrF = [0, 0, 0]; c.corrT = [0, 0, 0]; }
    this.solvedJoints = [];
    if (!this.clusters.length && !this.hinges.length && !this.mechanism.length) return;
    const anchored = this.anchoredBodies();
    const ents = new Map<BodyRec, Ent>();
    const works = this.clusters.map((c) => this.fitCluster(c, dt));
    for (const w of works) for (const r of w.comp) ents.set(r, w.ent);
    // lone bodies (hinge pieces, things touching an assembly): start-of-tick geometry, Jolt's velocity as prediction
    const entOf = (r: BodyRec): Ent => {
      let e = ents.get(r);
      if (!e) {
        const [v, w] = this.velocityOf(r);
        const start = r.prior && this.watch.has(r) ? r.prior.pose : null;
        const pose = start ?? this.poseOf(r);
        const still = r.frozen || r.grabbed === 'creative' || !r.Iloc;
        e = {
          e: { origin: pose.p, v, w, invMass: still ? 0 : 1 / r.mass, invI: still ? [...ZERO3] : inverse3(worldInertia(r.Iloc!, pose.q)), extent: this.extentAbout(r, pose.p, pose.p) },
          work: null, single: r, touched: false, start, v0: [...v] as Vec3, w0: [...w] as Vec3, fixed: [],
        };
        ents.set(r, e);
      }
      return e;
    };
    const startPose = (en: Ent, r: BodyRec) => (en.work ? en.work.NP0[en.work.index.get(r)!]! : en.start ?? this.poseOf(r));
    const rows: Row[] = [];
    const beta = 0.2 / dt;
    // An intact rigid joint to something immovable makes the whole entity immovable (it moves with a hand-held
    // part if that is what holds it). Solving it as such is exact, where iterating a light held piece against a
    // heavy load converges hopelessly slowly; its reaction is recovered from the momentum balance afterwards.
    for (const [r, list] of anchored) {
      const en = ents.get(r) ?? (this.watch.has(r) ? entOf(r) : null);
      if (!en) continue;
      for (const a of list) if (a.c.kind.model === 'rigid' && a.c.status === 'intact') en.fixed.push({ r, a });
    }
    for (const en of new Set(ents.values())) {
      if (!en.fixed.length) continue;
      const held = en.fixed.find((f) => f.a.other && !f.a.other.frozen)?.a.other ?? null;
      en.e.invMass = 0;
      en.e.invI = [...ZERO3];
      en.e.v = held ? this.pointVelocity(held, en.e.origin) : [0, 0, 0];
      en.e.w = held ? this.velocityOf(held)[1] : [0, 0, 0];
    }
    // other anchors (bearings, ball joints, sliders to the world, frozen parts, hand-held parts)
    for (const [r, list] of anchored) {
      const en = ents.get(r) ?? (this.watch.has(r) ? entOf(r) : null);
      if (!en || en.fixed.length) continue;
      const pose = startPose(en, r);
      for (const a of list) {
        const held = composePose(pose, a.frame);
        const target = a.other && a.otherFrame ? composePose(this.poseOf(a.other), a.otherFrame) : a.c.worldB ?? held;
        const dofs = anchorDofs(a.c.kind.model, rotate(held.q, [0, 1, 0]));
        const other: Entity | null = a.other && !a.other.frozen ? { origin: this.poseOf(a.other).p, v: this.velocityOf(a.other)[0], w: this.velocityOf(a.other)[1], invMass: 0, invI: [...ZERO3] } : null;
        // drift is taken out at position level for assemblies (the anchored pose fit); a lone body is pulled in
        const posErr = en.work ? [0, 0, 0] as Vec3 : sub(target.p, held.p);
        const rotErr = en.work ? [0, 0, 0] as Vec3 : rotationVector(quatMul(target.q, quatConj(held.q)));
        const tag: RowTag = { kind: 'anchor', ma: r, mb: null, anchor: a };
        const key = `a:${a.c.id}:${a.sign}`;
        rows.push(...pointRows(en.e, other, held.p, held.p, dofs.point, scale(posErr, -beta), tag, key));
        rows.push(...angularRows(en.e, other, dofs.rot, scale(rotErr, -beta), tag, key));
        en.touched = true;
      }
    }
    // joints between an assembly and another moving body (an axle turning in its hangers, a wheel on its stub, a
    // plate sliding on its rod): Jolt solved them against one light segment, so they are solved again here on the
    // true inertia of both sides. Left to Jolt alone, such a joint drifts apart under the load it carries, which no
    // real joint does (tests/conformance/laws.test.ts holds every joint kind to it).
    for (const c of this.mechanism) {
      if (c.status === 'broken' || !c.constraint || !c.b || !c.frameB) continue;
      const m = c.kind.model;
      const ea = entOf(c.a), eb = entOf(c.b);
      // a side rigidly held to something immovable is immovable here too (its invMass is 0): the rows hold the other
      if (ea === eb || (ea.e.invMass === 0 && eb.e.invMass === 0)) continue;
      const ha = composePose(startPose(ea, c.a), c.frameA), hb = composePose(startPose(eb, c.b), c.frameB);
      // a friction-grip joint that has slipped slides in its plane within the bolt clearance (Jolt's friction-limited
      // axes): only its normal and its turning are held here
      const ny = rotate(ha.q, [0, 1, 0]);
      const dofs = c.status === 'slipped' ? { point: projectors(ny).along, rot: ID3 } : anchorDofs(m, ny);
      const tag: RowTag = { kind: 'joint', ma: c.a, mb: c.b, conn: c };
      const key = `j:${c.id}`;
      rows.push(...pointRows(ea.e, eb.e, ha.p, hb.p, dofs.point, scale(sub(hb.p, ha.p), beta), tag, key));
      // the turning error: for a hinge, only how far its pin axes are out of line (its free turn is no error); for
      // what holds every rotation, the whole relative turn
      const turn = m === 'revolute' ? cross(ny, rotate(hb.q, [0, 1, 0])) : rotationVector(quatMul(hb.q, quatConj(ha.q)));
      rows.push(...angularRows(ea.e, eb.e, dofs.rot, scale(turn, beta), tag, key));
      // its stops (a hinge's or servo's end stops, a slider's travel, a ball joint's cone) hold here too, one-sided
      rows.push(...this.limitRows(c, ea.e, eb.e, ha, hb, ny, dt, beta, tag, key));
      this.solvedJoints.push(c);
      ea.touched = eb.touched = true;
    }
    // ropes, and springs stiff enough to be rigid, on anything this pass re-solves: it integrates those bodies again
    // from the tick's start, so a tether left to Jolt alone would be undone (a latch wire letting its plate creep)
    for (const c of this.conns.values()) {
      if (c.status === 'broken' || !c.constraint || !c.springRigid || (c.kind.model !== 'rope' && c.kind.model !== 'spring')) continue;
      if (!this.watch.has(c.a) && !(c.b && this.watch.has(c.b))) continue;
      const side = (r: BodyRec | null) => (r && !r.frozen && r.grabbed !== 'creative' && r.Iloc ? entOf(r) : null);
      const ea = side(c.a), eb = side(c.b);
      if (ea === eb || (!ea && !eb)) continue;
      const pa = ea ? composePose(startPose(ea, c.a), c.frameA).p : this.anchorWorld(c).p;
      const pb = c.b ? (eb ? composePose(startPose(eb, c.b), c.frameB!).p : this.anchorWorldB(c).p) : c.worldB?.p ?? pa;
      const d = sub(pb, pa), L = length(d);
      if (L < 1e-6) continue;
      const n = scale(d, 1 / L), rest = c.derived.spring!.rest;
      const tag: RowTag = { kind: 'joint', ma: c.a, mb: c.b, conn: c };
      const key = `t:${c.id}`;
      if (c.kind.model === 'rope') {
        // tension only: the ends may come together, never part beyond the rope's length (a one-sided row, as a contact)
        const slack = rest - L;
        const target = slack > 0 ? -slack / dt : 0;
        const bias = slack < 0 ? Math.min(Math.max(0, -slack - SLOP) * beta, MAX_CORRECTION / dt) : 0;
        rows.push({ a: ea?.e ?? null, b: eb?.e ?? null, kind: 'linear', pa, pb, dir: scale(n, -1), target, bias, lo: 0, hi: Infinity, acc: 0, tag, key });
      } else {
        rows.push({ a: ea?.e ?? null, b: eb?.e ?? null, kind: 'linear', pa, pb, dir: n, target: 0, bias: -(L - rest) * beta, lo: -Infinity, hi: Infinity, acc: 0, tag, key });
      }
      this.solvedJoints.push(c);
      if (ea) ea.touched = true;
      if (eb) eb.touched = true;
    }
    // plastic hinges: point and twist held, bending resisted by the plastic moment (minus what Jolt already applied)
    const inv = this.lastSubsteps / dt;
    for (const b of this.hinges) {
      const ea = entOf(b.a), eb = entOf(b.b);
      if (ea === eb) continue;
      const L = b.a.pr.layout!, cap = b.a.pr.cap!;
      const pa = startPose(ea, b.a), pb = startPose(eb, b.b);
      const ha = transformPoint(pa, scale(L.axis, L.segLen / 2)), hb = transformPoint(pb, scale(L.axis, -L.segLen / 2));
      const ax = rotate(pa.q, L.axis), ay = rotate(pa.q, L.perps[0]), az = cross(ax, ay);
      const tag: RowTag = { kind: 'hinge', ma: b.a, mb: b.b, bond: b };
      const key = `h:${b.a.id}`;
      rows.push(...pointRows(ea.e, eb.e, ha, hb, ID3, scale(sub(hb, ha), beta), tag, key));
      rows.push(...angularRows(ea.e, eb.e, projectors(ax).along, [0, 0, 0], tag, key));
      const lm = b.typed.GetTotalLambdaMotorRotation();
      const jy = lm.GetY() * inv * dt, jz = lm.GetZ() * inv * dt;
      const my = cap.Mp[0] * dt, mz = cap.Mp[1] * dt;
      rows.push({ a: ea.e, b: eb.e, kind: 'angular', pa: [0, 0, 0], pb: [0, 0, 0], dir: ay, target: 0, lo: -my - jy, hi: my - jy, acc: 0, tag, key: `${key}:by` });
      rows.push({ a: ea.e, b: eb.e, kind: 'angular', pa: [0, 0, 0], pb: [0, 0, 0], dir: az, target: 0, lo: -mz - jz, hi: mz - jz, acc: 0, tag, key: `${key}:bz` });
      ea.touched = eb.touched = true;
    }
    // contacts on assemblies and hinge pieces, with everything else (geometry as the contact saw it, at tick start)
    for (const c of contacts) {
      const em = entOf(c.m);
      const eo = c.o && !c.oStatic ? entOf(c.o) : null;
      if (eo === em) continue;
      const still: Entity | null = c.oStatic && c.o && c.o.grabbed === 'creative' ? { origin: this.poseOf(c.o).p, v: this.velocityOf(c.o)[0], w: this.velocityOf(c.o)[1], invMass: 0, invI: [...ZERO3] } : null;
      const tag: RowTag = { kind: 'contact', ma: c.m, mb: c.o && !c.oStatic ? c.o : null };
      const [t1, t2] = tangents(c.n);
      for (const [pi, { pm, po }] of c.points.entries()) {
        const key = `c:${c.key}:${pi}`;
        const sep = dot(sub(po, pm), c.n);
        // a gap may close this tick; an overlap is taken out at position level (solvePositions), never as speed
        let target = sep > 0 ? -sep / dt : 0;
        const bias = sep < 0 ? Math.min(Math.max(0, -sep - SLOP) * beta, MAX_CORRECTION / dt) : 0;
        const vm0 = em.work ? pointVelocity(em.work.priorEnt, pm) : pointVelocity({ ...em.e, v: em.v0, w: em.w0 }, pm);
        const vo = eo ? pointVelocity({ ...eo.e, v: eo.v0, w: eo.w0 }, po) : still ? pointVelocity(still, po) : [0, 0, 0] as Vec3;
        const vPre = dot(sub(vo, vm0), c.n);
        if (vPre < -1) target = Math.max(target, -c.restitution * vPre);
        const normal: Row = { a: em.e, b: eo ? eo.e : still, kind: 'linear', pa: pm, pb: po, dir: c.n, target, bias, lo: 0, hi: Infinity, acc: 0, tag, key };
        rows.push(normal);
        // friction rows along fixed tangents keep their identity from tick to tick for warm starting
        [t1, t2].forEach((t, ti) => rows.push({ a: em.e, b: eo ? eo.e : still, kind: 'linear', pa: pm, pb: po, dir: t, target: 0, lo: 0, hi: 0, frictionOf: normal, mu: c.friction, acc: 0, tag, key: `${key}:t${ti}` }));
      }
      em.touched = true;
      if (eo) eo.touched = true;
    }
    // iterated to convergence (a heavy load on a light bonded part needs more passes than a lone part), within a cap
    solveRows(rows, 40, this.warm, 1e-5);
    // an assembly on several fixed supports carries the least support load that holds it, as a real one does
    const supports = new Map<Entity, Row[]>();
    for (const r of rows) {
      const tag = r.tag as RowTag;
      if (tag.kind !== 'contact' || r.b || r.frictionOf || !r.a || !works.some((w) => w.ent.e === r.a)) continue;
      (supports.get(r.a) ?? supports.set(r.a, []).get(r.a)!).push(r);
    }
    for (const list of supports.values()) for (const r of leastSupport(list, rows)) if (r.key) { if (r.acc) this.warm.set(r.key, r.acc); else this.warm.delete(r.key); }
    // heat made in the solve: friction rows sliding, hinges turning against their plastic moment (impulse x speed)
    for (const r of rows) {
      const tag = r.tag as RowTag;
      if (!r.acc) continue;
      const plastic = tag.kind === 'hinge' && r.kind === 'angular' && !!r.key && /:b[yz]$/.test(r.key);
      if (!r.frictionOf && !plastic) continue;
      const va = r.a ? (r.kind === 'linear' ? pointVelocity(r.a, r.pa) : r.a.w) : [0, 0, 0] as Vec3;
      const vb = r.b ? (r.kind === 'linear' ? pointVelocity(r.b, r.pb) : r.b.w) : [0, 0, 0] as Vec3;
      const w = Math.abs(r.acc * dot(sub(vb, va), r.dir));
      if (w > 0) this.book.sources.push({ a: tag.ma, b: tag.mb, w, cause: plastic ? 'plastic' : 'friction' });
    }
    const pseudo = solvePositions(rows, 12, dt, SLOP);
    const none = { v: [0, 0, 0] as Vec3, w: [0, 0, 0] as Vec3 };
    // integrate from tick start with the solved velocity (semi-implicit Euler, as Jolt itself does), plus the
    // position correction, which moves the pose and leaves the velocity alone
    for (const w of works) this.placeCluster(w, anchored, dt, pseudo.get(w.ent.e) ?? none);
    for (const en of ents.values()) {
      if (en.work || !en.touched || !en.single || (en.e.invMass === 0 && !en.fixed.length)) continue;
      const r = en.single;
      const cur = this.poseOf(r);
      const pin = en.fixed[0];
      const pinTarget = pin ? (pin.a.other && pin.a.otherFrame ? composePose(this.poseOf(pin.a.other), pin.a.otherFrame) : pin.a.c.worldB) : null;
      const ps = pseudo.get(en.e) ?? none;
      const pose: Pose = pin && pinTarget
        ? composePose(pinTarget, invertPose(pin.a.frame))
        : en.start
        ? { p: add(en.start.p, scale(add(en.e.v, ps.v), dt)), q: normQuat(quatMul(quatFromRotationVector(scale(add(en.e.w, ps.w), dt)), en.start.q)) }
        : { p: add(cur.p, scale(add(sub(en.e.v, en.v0), ps.v), dt)), q: normQuat(quatMul(quatFromRotationVector(scale(add(sub(en.e.w, en.w0), ps.w), dt)), cur.q)) };
      this.r1.Set(...pose.p);
      this.q1.Set(...pose.q);
      this.v1.Set(...en.e.v);
      this.v2.Set(...en.e.w);
      this.bi.SetPositionRotationAndVelocity(r.body.GetID(), this.r1, this.q1, this.v1, this.v2);
    }
    // the mechanism closed at position level, outward from its assemblies: each moving part is set exactly onto its
    // joint with the part it hangs from, as that part now is (the assembly pinned to its anchors carries what is
    // joined to it; without this the pin moves the arm and leaves the weight hung from it behind)
    this.closeMechanism(new Set([...works.flatMap((w) => w.comp), ...this.mechanismRoots]));
    // impulses our rows put on each body (linear, and angular about the world origin)
    const ourP = new Map<BodyRec, Vec3>(), ourL = new Map<BodyRec, Vec3>();
    const put = (r: BodyRec | null, J: Vec3, L: Vec3) => {
      if (!r) return;
      ourP.set(r, add(ourP.get(r) ?? [0, 0, 0], J));
      ourL.set(r, add(ourL.get(r) ?? [0, 0, 0], L));
    };
    const anchorAcc = new Map<Anchor, { J: Vec3; T: Vec3 }>();
    const hingeAcc = new Map<BondRec, { J: Vec3; T: Vec3 }>();
    const jointAcc = new Map<ConnRec, { J: Vec3; T: Vec3 }>();
    for (const r of rows) {
      if (!r.acc) continue;
      const tag = r.tag as RowTag;
      const Jb: Vec3 = scale(r.dir, r.acc); // on b; -Jb on a
      if (r.kind === 'linear') {
        put(tag.ma, scale(Jb, -1), cross(r.pa, scale(Jb, -1)));
        put(tag.mb, Jb, cross(r.pb, Jb));
      } else {
        put(tag.ma, [0, 0, 0], scale(Jb, -1));
        put(tag.mb, [0, 0, 0], Jb);
      }
      if (tag.kind === 'anchor') {
        const acc = anchorAcc.get(tag.anchor!) ?? { J: [0, 0, 0], T: [0, 0, 0] };
        if (r.kind === 'linear') acc.J = sub(acc.J, Jb); else acc.T = sub(acc.T, Jb); // on the held body (side a)
        anchorAcc.set(tag.anchor!, acc);
      } else if (tag.kind === 'hinge') {
        const acc = hingeAcc.get(tag.bond!) ?? { J: [0, 0, 0], T: [0, 0, 0] };
        if (r.kind === 'linear') acc.J = add(acc.J, Jb); else acc.T = add(acc.T, Jb); // on segment k + 1 (side b)
        hingeAcc.set(tag.bond!, acc);
      } else if (tag.kind === 'joint') {
        const acc = jointAcc.get(tag.conn!) ?? { J: [0, 0, 0], T: [0, 0, 0] };
        if (r.kind === 'linear') acc.J = add(acc.J, Jb); else acc.T = add(acc.T, Jb); // on B
        jointAcc.set(tag.conn!, acc);
      }
    }
    // what the re-solve added to each such joint joins its load (the force on B, as the joint reports it)
    for (const [c, acc] of jointAcc) {
      c.corrF = scale(acc.J, 1 / dt);
      c.corrT = scale(acc.T, 1 / dt);
    }
    for (const [r, list] of anchored) {
      const en = ents.get(r);
      if (!en || en.fixed.length) continue;
      for (const a of list) {
        const acc = anchorAcc.get(a);
        a.c.corrF = acc ? scale(acc.J, a.sign / dt) : [0, 0, 0];
        a.c.corrT = acc ? scale(acc.T, a.sign / dt) : [0, 0, 0];
      }
    }
    // reactions of immovable entities: whatever momentum they did not gain came through their rigid anchors
    for (const en of new Set(ents.values())) {
      if (!en.fixed.length) continue;
      const members = en.work ? en.work.comp : [en.single!];
      let J: Vec3 = [0, 0, 0], L: Vec3 = [0, 0, 0];
      members.forEach((r, i) => {
        const w = en.work;
        const v0 = w ? w.pri[i]!.v : en.v0, w0 = w ? w.pri[i]!.w : en.w0;
        const p0 = w ? w.NP0[i]!.p : (en.start ?? this.poseOf(r)).p;
        const q0 = w ? w.NP0[i]!.q : (en.start ?? this.poseOf(r)).q;
        const vNew = w ? w.newV[i]! : pointVelocity(en.e, p0);
        const dp = scale(sub(vNew, v0), r.mass);
        const jp = w ? w.joltP[i]! : scale(sub(this.velocityOf(r)[0], v0), r.mass);
        const jl = w ? w.joltL[i]! : mat3Vec(worldInertia(r.Iloc ?? [...ZERO3], q0), sub(this.velocityOf(r)[1], w0));
        const I = worldInertia(r.Iloc ?? [...ZERO3], q0);
        J = add(J, sub(sub(dp, jp), ourP.get(r) ?? [0, 0, 0]));
        L = add(L, sub(sub(add(mat3Vec(I, sub(en.e.w, w0)), cross(p0, dp)), add(jl, cross(p0, jp))), ourL.get(r) ?? [0, 0, 0]));
      });
      const share = 1 / en.fixed.length;
      for (const { r, a } of en.fixed) {
        const pj = this.anchorWorld(a.c).p;
        const Jj = scale(J, share), Lj = scale(L, share);
        // the anchor's impulse on its body joins the bookkeeping so the assembly's bridge loads stay exact
        ourP.set(r, add(ourP.get(r) ?? [0, 0, 0], Jj));
        ourL.set(r, add(ourL.get(r) ?? [0, 0, 0], Lj));
        a.c.corrF = scale(Jj, a.sign / dt);
        a.c.corrT = scale(sub(Lj, cross(pj, Jj)), a.sign / dt);
      }
    }
    for (const b of this.hinges) {
      const acc = hingeAcc.get(b);
      b.corrF = acc ? scale(acc.J, 1 / dt) : [0, 0, 0];
      b.corrT = acc ? scale(acc.T, 1 / dt) : [0, 0, 0];
    }
    for (const w of works) this.bridgeLoads(w, ourP, ourL, dt);
  }

  /**
   * End-of-tick pose of an assembly: its start pose advanced by the solved motion and its position correction
   * (pseudo-velocity: it moves the pose, not the velocity), anchored DOFs pinned.
   */
  private placeCluster(w: FittedCluster, anchored: Map<BodyRec, Anchor[]>, dt: number, ps: { v: Vec3; w: Vec3 }) {
    const { comp, T, C0, com0, ent, M } = w;
    const dq = quatFromRotationVector(scale(add(ent.e.w, ps.w), dt));
    const comE = add(com0, scale(add(ent.e.v, ps.v), dt));
    let C: Pose = { p: add(comE, rotate(dq, sub(C0.p, com0))), q: normQuat(quatMul(dq, C0.q)) };
    let comRef = comE;
    const anchors: { i: number; a: Anchor }[] = [];
    comp.forEach((r, i) => { for (const a of anchored.get(r) ?? []) anchors.push({ i, a }); });
    if (anchors.length) {
      const Kp = M * 1e6;
      let Imax = 0;
      for (const r of comp) Imax = Math.max(Imax, r.Iloc![0]!, r.Iloc![4]!, r.Iloc![8]!);
      const Kr = Imax * comp.length * 1e6;
      const fit = new RigidFit(comE);
      comp.forEach((r, i) => {
        const fp = composePose(C, T[i]!);
        fit.point(fp.p, r.mass, [0, 0, 0]);
        fit.rotation(worldInertia(r.Iloc!, fp.q), [0, 0, 0]);
      });
      for (const { i, a } of anchors) {
        const fitted = composePose(composePose(C, T[i]!), a.frame);
        const held = a.other && a.otherFrame ? composePose(this.poseOf(a.other), a.otherFrame) : a.c.worldB ?? fitted;
        const dofs = anchorDofs(a.c.kind.model, rotate(held.q, [0, 1, 0]));
        fit.point(fitted.p, Kp, sub(held.p, fitted.p), dofs.point);
        fit.rotation(scaleMat(dofs.rot, Kr), rotationVector(quatMul(held.q, quatConj(fitted.q))));
      }
      const d = fit.solve();
      const cq = quatFromRotationVector(d.w);
      C = { p: add(add(comE, d.v), rotate(cq, sub(C.p, comE))), q: normQuat(quatMul(cq, C.q)) };
      // A position correction moves the assembly; its velocity moves with it. The centre of mass keeps the
      // solved velocity, or every correction would slip in momentum w x d with no force behind it.
      comRef = add(comE, d.v);
    }
    comp.forEach((r, i) => {
      const np = composePose(C, T[i]!);
      const v = add(ent.e.v, cross(ent.e.w, sub(np.p, comRef)));
      w.newV[i] = v;
      this.r1.Set(...np.p);
      this.q1.Set(...np.q);
      this.v1.Set(...v);
      this.v2.Set(...ent.e.w);
      this.bi.SetPositionRotationAndVelocity(r.body.GetID(), this.r1, this.q1, this.v1, this.v2);
    });
  }

  /**
   * Bodies held by a stiff joint to the world, a frozen part or a hand-held (kinematic) part, with those joints.
   * sign: -1 when the held body is the joint's body 1 (it receives -lambda), +1 when it is body 2.
   */
  private anchoredBodies(): Map<BodyRec, Anchor[]> {
    const out = new Map<BodyRec, Anchor[]>();
    const put = (r: BodyRec, a: Anchor) => (out.get(r) ?? out.set(r, []).get(r)!).push(a);
    for (const c of this.conns.values()) {
      if (c.status === 'broken' || !c.constraint) continue;
      const m = c.kind.model;
      if (m !== 'rigid' && m !== 'revolute' && m !== 'prismatic' && m !== 'spherical') continue;
      const fixedB = !c.b || c.b.frozen || c.b.grabbed === 'creative';
      const fixedA = c.a.frozen || c.a.grabbed === 'creative';
      if (fixedB && !c.a.frozen) put(c.a, { c, sign: -1, frame: c.frameA, other: c.b, otherFrame: c.b ? c.frameB : null });
      if (fixedA && c.b && !c.b.frozen) put(c.b, { c, sign: 1, frame: c.frameB!, other: c.a, otherFrame: c.frameA });
    }
    return out;
  }

  /** One assembly at tick start: rigid shape and pose, predicted velocity, spanning tree for load bookkeeping. */
  private fitCluster(cl: ClusterWork, dt: number): FittedCluster {
    const { comp, adj } = cl;
    const n = comp.length;
    const index = new Map<BodyRec, number>();
    comp.forEach((r, i) => index.set(r, i));
    // spanning tree (DFS from body 0) with rest poses in body 0's frame, discovery order and Tarjan low-links
    const T: Pose[] = new Array(n);
    const parent = new Int32Array(n).fill(-1);
    const parentEdge: (RigidEdge | null)[] = new Array(n).fill(null);
    const disc = new Int32Array(n).fill(-1);
    const low = new Int32Array(n);
    const order: number[] = [];
    T[0] = { p: [0, 0, 0], q: IDENTITY_Q };
    const iter: number[] = new Array(n).fill(0);
    const stack = [0];
    disc[0] = low[0] = 0;
    order.push(0);
    let time = 1;
    while (stack.length) {
      const i = stack[stack.length - 1]!;
      const nb = adj.get(comp[i]!)!;
      if (iter[i]! < nb.length) {
        const { e, other } = nb[iter[i]!++]!;
        const j = index.get(other)!;
        if (e === parentEdge[i]) continue;
        if (disc[j] === -1) {
          disc[j] = low[j] = time++;
          parent[j] = i;
          parentEdge[j] = e;
          T[j] = composePose(T[i]!, e.u === comp[i] ? e.rest : invertPose(e.rest));
          order.push(j);
          stack.push(j);
        } else {
          low[i] = Math.min(low[i]!, disc[j]!);
        }
      } else {
        stack.pop();
        const p = parent[i]!;
        if (p >= 0) low[p] = Math.min(low[p]!, low[i]!);
      }
    }
    const vel = comp.map((r) => this.velocityOf(r));
    const pri = comp.map((r, i) => r.prior ?? { pose: this.poseOf(r), v: vel[i]![0], w: vel[i]![1] });
    const P0 = pri.map((p) => p.pose);
    let M = 0;
    let com0: Vec3 = [0, 0, 0], comRest: Vec3 = [0, 0, 0];
    comp.forEach((r, i) => {
      M += r.mass;
      com0 = add(com0, scale(P0[i]!.p, r.mass));
      comRest = add(comRest, scale(T[i]!.p, r.mass));
    });
    com0 = scale(com0, 1 / M);
    comRest = scale(comRest, 1 / M);
    // rigid pose at tick start (the assembly was projected rigid last tick, so this is exact after the first)
    const q0 = quatMul(P0[0]!.q, quatConj(T[0]!.q));
    let qs: Quat = [0, 0, 0, 0];
    comp.forEach((r, i) => {
      let qi = quatMul(P0[i]!.q, quatConj(T[i]!.q));
      if (qi[0] * q0[0] + qi[1] * q0[1] + qi[2] * q0[2] + qi[3] * q0[3] < 0) qi = [-qi[0], -qi[1], -qi[2], -qi[3]];
      qs = [qs[0] + qi[0] * r.mass, qs[1] + qi[1] * r.mass, qs[2] + qi[2] * r.mass, qs[3] + qi[3] * r.mass];
    });
    const qc = normQuat(qs);
    const C0: Pose = { p: sub(com0, rotate(qc, comRest)), q: qc };
    const NP0 = T.map((t) => composePose(C0, t));
    const Iw0 = comp.map((r, i) => worldInertia(r.Iloc!, NP0[i]!.q));
    // predicted velocity: the start rigid motion plus the momentum Jolt's impulses added (internal impulses
    // cancel), plus the torque-free term; inertia at the start configuration (semi-implicit, well conditioned
    // even for a slender rod's tiny axial inertia)
    const f0 = new RigidFit(com0);
    const mass = new RigidFit(com0);
    comp.forEach((r, i) => {
      f0.point(P0[i]!.p, r.mass, pri[i]!.v);
      f0.rotation(worldInertia(r.Iloc!, P0[i]!.q), pri[i]!.w);
      mass.point(NP0[i]!.p, r.mass, [0, 0, 0]);
      mass.rotation(Iw0[i]!, [0, 0, 0]);
    });
    const u0 = f0.solve();
    const joltP = comp.map((r, i) => scale(sub(vel[i]![0], pri[i]!.v), r.mass));
    const joltL = comp.map((r, i) => mat3Vec(worldInertia(r.Iloc!, P0[i]!.q), sub(vel[i]![1], pri[i]!.w)));
    let dPsum: Vec3 = [0, 0, 0], dLsum: Vec3 = [0, 0, 0];
    comp.forEach((_, i) => {
      dPsum = add(dPsum, joltP[i]!);
      dLsum = add(dLsum, add(joltL[i]!, cross(sub(P0[i]!.p, com0), joltP[i]!)));
    });
    const Ic = mass.angularBlock();
    const invIc = inverse3(Ic);
    const L0 = mat3Vec(Ic, u0.w);
    const wPred = gyroscopicStep(Ic, mat3Vec(invIc, add(L0, dLsum)), dt);
    const vPred = add(u0.v, scale(dPsum, 1 / M));
    const extent = comp.reduce((x, r, i) => Math.max(x, this.extentAbout(r, NP0[i]!.p, com0)), 0);
    const ent: Ent = { e: { origin: com0, v: vPred, w: wPred, invMass: 1 / M, invI: invIc, extent }, work: null, single: null, touched: false, start: null, v0: [...u0.v] as Vec3, w0: [...u0.w] as Vec3, fixed: [] };
    const work: FittedCluster = {
      comp, adj, index, order, parent, parentEdge, disc, low, T, C0, com0, M, NP0, P0, Iw0, pri, joltP, joltL, newV: new Array(n),
      ent, priorEnt: { origin: com0, v: u0.v, w: u0.w, invMass: 0, invI: [...ZERO3] },
    };
    ent.work = work;
    return work;
  }

  /**
   * Force / moment through each bridge edge of an assembly (on its v side, about the edge point, per second): the
   * v side's real momentum change minus every impulse already accounted on it (Jolt's, and the anchors', hinges'
   * and contacts' from our solve), all at tick-start geometry. Edges on a loop share their load in a statically
   * indeterminate way; they keep the solver's own reading.
   */
  private bridgeLoads(w: FittedCluster, ourP: Map<BodyRec, Vec3>, ourL: Map<BodyRec, Vec3>, dt: number) {
    const { comp, order, parent, parentEdge, disc, low, NP0, P0, Iw0, pri, joltP, joltL, newV, index } = w;
    const wNew = w.ent.e.w;
    const dP: Vec3[] = comp.map((r, i) => sub(sub(scale(sub(newV[i]!, pri[i]!.v), r.mass), joltP[i]!), ourP.get(r) ?? [0, 0, 0]));
    const dLo: Vec3[] = comp.map((r, i) => sub(sub(
      add(mat3Vec(Iw0[i]!, sub(wNew, pri[i]!.w)), cross(NP0[i]!.p, scale(sub(newV[i]!, pri[i]!.v), r.mass))),
      add(joltL[i]!, cross(P0[i]!.p, joltP[i]!))), ourL.get(r) ?? [0, 0, 0]));
    const subP: Vec3[] = dP.map((v) => [...v] as Vec3);
    const subL: Vec3[] = dLo.map((v) => [...v] as Vec3);
    for (let k = order.length - 1; k >= 1; k--) {
      const j = order[k]!, p = parent[j]!;
      subP[p] = add(subP[p]!, subP[j]!);
      subL[p] = add(subL[p]!, subL[j]!);
    }
    for (const r of comp) for (const { e } of w.adj.get(r)!) {
      if (e.bond) { e.bond.corrF = [0, 0, 0]; e.bond.corrT = [0, 0, 0]; } else if (e.conn) { e.conn.corrF = [0, 0, 0]; e.conn.corrT = [0, 0, 0]; }
    }
    for (let k = 1; k < order.length; k++) {
      const j = order[k]!, p = parent[j]!;
      if (low[j]! <= disc[p]!) continue; // not a bridge
      const e = parentEdge[j]!;
      // the branch beyond the joint (away from the root) says what the joint carries; on the v side by Newton's third law
      const childIsV = e.v === comp[j];
      const vP = childIsV ? subP[j]! : scale(subP[j]!, -1);
      const vL = childIsV ? subL[j]! : scale(subL[j]!, -1);
      const pe = e.bond
        ? transformPoint(NP0[index.get(e.u)!]!, scale(e.bond.a.pr.layout!.axis, e.bond.a.pr.layout!.segLen / 2))
        : composePose(NP0[index.get(e.u)!]!, e.conn!.frameA).p;
      const F = scale(vP, 1 / dt), Tq = scale(sub(vL, cross(pe, vP)), 1 / dt);
      if (e.bond) { e.bond.corrF = F; e.bond.corrT = Tq; } else if (e.conn) { e.conn.corrF = F; e.conn.corrT = Tq; }
    }
  }

  /** Read the section forces carried by every bond and yield / fracture them against the section's capacity. */
  private evaluateBonds(inv: number) {
    for (const pr of this.parts.values()) {
      const cap = pr.cap;
      const L = pr.layout;
      if (!cap || !L) continue;
      // A part fails at most once per tick, at its most overloaded bond: that crack changes the load path,
      // so the other bonds are judged again next tick instead of all snapping together.
      let worst: { u: number; act: () => void } | null = null;
      const candidate = (u: number, act: () => void) => { if (!worst || u > worst.u) worst = { u, act }; };
      for (const b of pr.bonds) {
        if (!b) continue;
        const pa = this.poseOf(b.a);
        const ax = rotate(pa.q, L.axis);
        const ay = rotate(pa.q, L.perps[0]);
        const az = cross(ax, ay);
        const s = b.typed;
        const lp = s.GetTotalLambdaPosition();
        const F: Vec3 = add([lp.GetX() * inv, lp.GetY() * inv, lp.GetZ() * inv], b.corrF);
        const N = -dot(F, ax);
        const V = length(sub(F, scale(ax, dot(F, ax))));
        let Tt: number, M1: number, M2: number;
        if (!b.plastic) {
          const lr = s.GetTotalLambdaRotation();
          const T: Vec3 = add([lr.GetX() * inv, lr.GetY() * inv, lr.GetZ() * inv], b.corrT);
          Tt = Math.abs(dot(T, ax));
          M1 = Math.abs(dot(T, ay));
          M2 = Math.abs(dot(T, az));
        } else {
          // constraint space: X twist (torsion), Y / Z bending (limit + hinge friction), plus the assembly solve
          const lr = s.GetTotalLambdaRotation();
          const lm = s.GetTotalLambdaMotorRotation();
          const T: Vec3 = add(add(add(scale(ax, lr.GetX() * inv), scale(ay, (lr.GetY() + lm.GetY()) * inv)), scale(az, (lr.GetZ() + lm.GetZ()) * inv)), b.corrT);
          Tt = Math.abs(dot(T, ax));
          M1 = Math.abs(dot(T, ay));
          M2 = Math.abs(dot(T, az));
        }
        b.loads = { N, V, T: Tt, M1, M2 };
        const chk = checkBond(cap, b.loads);
        const point = transformPoint(pa, scale(L.axis, L.segLen / 2));
        if (b.plastic) {
          // A hinge keeps carrying Mp; it tears when its rotation passes the material's ductility.
          const theta = this.bondAngle(b);
          const uRot = theta / Math.max(cap.thetaF, 1e-6);
          const other = chk.mode === 'bending' ? { ...chk, u: 0 } : chk;
          b.u = Math.max(uRot, other.u);
          b.mode = uRot >= other.u ? 'bending' : other.mode;
          if (uRot >= 1) {
            candidate(uRot, () => this.fracture(pr, b, 'bending', theta, cap.thetaF, point, `bent ${(theta * 180 / Math.PI).toFixed(0)}° past its ${(cap.thetaF * 180 / Math.PI).toFixed(0)}° ductility and tore`));
            continue;
          }
          if (other.u > 1) b.over++; else b.over = 0;
          if (other.u > 1.5 || b.over >= this.opts.filterTicks) {
            candidate(other.u, () => this.fracture(pr, b, other.mode, other.load, other.capacity, point, `failed in ${other.mode}: ${fmtLoad(other.mode, other.load)} on a ${fmtLoad(other.mode, other.capacity)} capacity`));
          }
          continue;
        }
        b.u = chk.u;
        b.mode = chk.mode;
        if (chk.u > 1) b.over++; else b.over = 0;
        if (chk.u > 1.5 || b.over >= this.opts.filterTicks) {
          if (chk.outcome === 'yield') {
            candidate(chk.u, () => {
              this.rebuildBond(pr, b.k, true);
              this.events.push({ type: 'yield', part: pr.id, bond: b.k, point, note: `${pr.part.name} yielded in bending (${fmtLoad('bending', chk.load)} ≥ Mp ${fmtLoad('bending', chk.capacity)}) and is bending plastically` });
            });
          } else {
            candidate(chk.u, () => this.fracture(pr, b, chk.mode, chk.load, chk.capacity, point, `fractured in ${chk.mode}: ${fmtLoad(chk.mode, chk.load)} on a ${fmtLoad(chk.mode, chk.capacity)} capacity`));
          }
        }
      }
      (worst as { act: () => void } | null)?.act();
    }
  }

  private fracture(pr: PartRec, b: BondRec, mode: string, load: number, capacity: number, point: Vec3, what: string) {
    const clean = this.bondAngle(b) < CLEAN_BREAK_ANGLE;
    this.destroyBond(b, !clean);
    if (!clean && b.pairKey >= 0) pr.heldPairs.push(b.pairKey);
    pr.bonds[b.k] = null;
    pr.broken.add(b.k);
    pr.part = { ...pr.part, damage: { broken: [...pr.broken].sort((x, y) => x - y), segments: null } };
    this.bi.ActivateBody(b.a.body.GetID());
    this.bi.ActivateBody(b.b.body.GetID());
    this.events.push({
      type: 'fracture', part: pr.id, bond: b.k, mode, load, capacity, point,
      note: `${pr.part.name} ${what}`,
      segments: pr.segs.map((s) => this.poseOf(s)),
    });
  }

  /** Damage set from the document (undo, redo, repair). Bonds that come back are re-seated first. */
  private setDamage(id: string, damage: PartDamage) {
    const pr = this.parts.get(id);
    if (!pr || !pr.layout) return;
    const L = pr.layout;
    const n = L.count;
    pr.part = { ...pr.part, damage };
    const want = new Set(damage.broken.filter((k) => k >= 0 && k < n - 1));
    const moved = new Set<BodyRec>();
    if (want.size === 0 && damage.segments === null) {
      // Repair: straighten about segment 0 and rebuild every bond intact.
      const [lin, ang] = this.velocityOf(pr.segs[0]!);
      const straight = this.straightPoses(this.virtualPose(pr), L);
      for (const b of pr.bonds) if (b) this.destroyBond(b);
      for (const key of pr.heldPairs) this.releasePair(key);
      pr.heldPairs = [];
      pr.broken.clear();
      pr.segs.forEach((s, i) => { this.placeBody(s, straight[i]!, lin, ang); moved.add(s); });
      pr.bonds = pr.segs.slice(0, -1).map((_, k) => (pr.part.frozen ? null : this.buildBond(pr, k, false)));
    } else {
      for (let k = 0; k < n - 1; k++) {
        const isBroken = pr.broken.has(k);
        if (want.has(k) && !isBroken) {
          const b = pr.bonds[k];
          if (b) this.destroyBond(b);
          pr.bonds[k] = null;
          pr.broken.add(k);
        } else if (!want.has(k) && isBroken) {
          // bring the far piece back so the faces meet straight, then bond it again
          pr.broken.delete(k);
          const near = this.poseOf(pr.segs[k]!);
          const target = composePose(near, { p: scale(L.axis, L.segLen), q: IDENTITY_Q });
          const cur = this.poseOf(pr.segs[k + 1]!);
          const [lin, ang] = this.velocityOf(pr.segs[k]!);
          for (let j = k + 1; j < n; j++) {
            const s = pr.segs[j]!;
            this.placeBody(s, composePose(target, relativePose(cur, this.poseOf(s))), lin, ang);
            moved.add(s);
            if (j < n - 1 && pr.broken.has(j)) break;
          }
          if (!pr.part.frozen) pr.bonds[k] = this.buildBond(pr, k, false);
        }
      }
    }
    if (moved.size) for (const c of this.conns.values()) if (moved.has(c.a) || (c.b && moved.has(c.b))) this.buildConstraint(c);
  }

  private placeBody(r: BodyRec, pose: Pose, linear: Vec3, angular: Vec3) {
    const bid = r.body.GetID();
    this.r1.Set(...pose.p);
    this.q1.Set(...pose.q);
    this.bi.SetPositionAndRotation(bid, this.r1, this.q1, r.frozen ? this.J.EActivation_DontActivate : this.J.EActivation_Activate);
    if (!r.frozen) {
      this.v1.Set(...linear);
      this.v2.Set(...angular);
      this.bi.SetLinearAndAngularVelocity(bid, this.v1, this.v2);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // grabbing

  private grab(hand: string, id: string, mode: GrabMode, target: Pose, strength: number, group?: string[]) {
    const r = this.bodyFor(id, target.p);
    if (!r) return;
    this.release(hand);
    // Frozen parts are always moved precisely; physical grabbing applies to free parts.
    const m: GrabMode = r.frozen ? 'creative' : mode;
    // moved precisely, the whole assembly comes along as one piece (held physically, its joints bring it)
    const members = [...new Set([...this.cluster(r), ...(m === 'creative' ? (group ?? []).flatMap((pid) => this.parts.get(pid)?.segs ?? []) : [])])];
    const rp = this.poseOf(r);
    const followers = m === 'creative' ? members.filter((x) => x !== r).map((x) => ({ rec: x, rel: relativePose(rp, this.poseOf(x)) })) : [];
    for (const x of m === 'creative' ? members : [r]) {
      if (m === 'creative') this.bi.SetMotionType(x.body.GetID(), this.J.EMotionType_Kinematic, this.J.EActivation_Activate);
      else this.bi.ActivateBody(x.body.GetID());
      x.grabbed = m;
    }
    this.grabs.set(hand, { hand, rec: r, followers, mode: m, target, strength, mass: this.clusterMass(r), inertia: this.clusterInertia(r) });
  }

  private release(hand: string, linear?: Vec3, angular?: Vec3) {
    const g = this.grabs.get(hand);
    if (!g) return;
    this.grabs.delete(hand);
    const r = g.rec;
    const members = [r, ...g.followers.map((f) => f.rec)];
    for (const x of members) x.grabbed = null;
    if (g.mode === 'creative') {
      const origin = this.poseOf(r).p;
      for (const x of members) {
        const bid = x.body.GetID();
        if (x.frozen) {
          this.bi.SetMotionType(bid, this.J.EMotionType_Static, this.J.EActivation_DontActivate);
        } else {
          this.bi.SetMotionType(bid, this.J.EMotionType_Dynamic, this.J.EActivation_Activate);
          if (linear || angular) {
            const w = angular ?? [0, 0, 0];
            this.v1.Set(...add(linear ?? [0, 0, 0], cross(w, sub(this.poseOf(x).p, origin))));
            this.v2.Set(...w);
            this.bi.SetLinearAndAngularVelocity(bid, this.v1, this.v2);
          }
        }
      }
    }
    // The held part may have moved relative to static joints; rebuild so frames stay consistent.
    if (r.frozen) {
      const set = new Set(members);
      for (const c of this.conns.values()) if (set.has(c.a) || (c.b && set.has(c.b))) this.buildConstraint(c);
    }
  }

  private driveGrabs(dt: number) {
    for (const g of this.grabs.values()) {
      const r = g.rec;
      const bid = r.body.GetID();
      if (g.mode === 'creative') {
        this.r1.Set(...g.target.p);
        this.q1.Set(...g.target.q);
        this.bi.MoveKinematic(bid, this.r1, this.q1, dt);
        for (const f of g.followers) {
          const p = composePose(g.target, f.rel);
          this.r1.Set(...p.p);
          this.q1.Set(...p.q);
          this.bi.MoveKinematic(f.rec.body.GetID(), this.r1, this.q1, dt);
        }
        continue;
      }
      // Physical grab: the held piece (with its still-bonded neighbours) follows the hand as the one rigid body it is,
      // on a critically damped spring about the grip, with gravity carried, and within what a hand can do (force at
      // the grip up to the strength setting, wrist torque up to 0.12 of it). The wrench is shared out over the
      // pieces in proportion to what each needs for that rigid motion, so the bonds between them carry none of it.
      const members = this.cluster(r);
      const pose = this.poseOf(r);
      const [v, wv] = this.velocityOf(r);
      const w = 2 * Math.PI * 5;
      const grav: Vec3 = [...this.sim.gravity] as Vec3;
      // centres of mass as Jolt has them (a wedge's or a hull's is not at its origin)
      const com = (x: BodyRec): Vec3 => { const c = x.body.GetCenterOfMassPosition(); return [c.GetX(), c.GetY(), c.GetZ()]; };
      let M = 0, xc: Vec3 = [0, 0, 0];
      for (const x of members) { M += x.mass; xc = add(xc, scale(com(x), x.mass)); }
      xc = scale(xc, 1 / M);
      // inertia of the whole piece about its centre of mass (parallel axis theorem)
      const Ic = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const Is = new Map<BodyRec, number[]>();
      for (const x of members) {
        const Ii = x.Iloc ? worldInertia(x.Iloc, this.poseOf(x).q) : [0, 0, 0, 0, 0, 0, 0, 0, 0];
        Is.set(x, Ii);
        const d = sub(com(x), xc), dd = dot(d, d);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) Ic[i * 3 + j] += Ii[i * 3 + j]! + x.mass * ((i === j ? dd : 0) - d[i]! * d[j]!);
      }
      // wanted accelerations of the grip and of the piece's turning: towards the hand at w times the error, but never
      // faster than the hand could stop it within the remaining distance (sqrt(2 a_max d)), so a heavy piece that the
      // hand turns at the limit of its strength comes to rest instead of overshooting
      const qe = quatMul(g.target.q, quatConj(pose.q));
      const sgn = qe[3] < 0 ? -1 : 1;
      const angle = 2 * Math.acos(Math.min(1, Math.abs(qe[3])));
      const sq = Math.sqrt(Math.max(1e-12, 1 - qe[3] * qe[3]));
      const axis: Vec3 = [(qe[0] * sgn) / sq, (qe[1] * sgn) / sq, (qe[2] * sgn) / sq];
      const Iaxis = Math.max(1e-9, dot(axis, mat3Vec(Ic, axis)));
      const wStar = Math.min(w * angle, Math.sqrt((2 * 0.5 * g.strength * 0.12 * angle) / Iaxis));
      let alpha = scale(sub(scale(axis, wStar), wv), 2 * w);
      const e = sub(g.target.p, pose.p), el = length(e);
      const vStar = el > 1e-9 ? scale(e, Math.min(w * el, Math.sqrt(2 * 0.5 * (g.strength / M) * el)) / el) : ([0, 0, 0] as Vec3);
      const aGrip = scale(sub(vStar, v), 2 * w);
      const lever = sub(pose.p, xc);
      let ac = sub(aGrip, cross(alpha, lever));
      // the hand's wrench at the grip, and its limits
      let F = scale(sub(ac, grav), M);
      let Tgrip = sub(mat3Vec(Ic, alpha), cross(lever, F));
      const fl = length(F), maxT = g.strength * 0.12, tl = length(Tgrip);
      if (fl > g.strength || tl > maxT) {
        if (fl > g.strength) F = scale(F, g.strength / fl);
        if (tl > maxT) Tgrip = scale(Tgrip, maxT / tl);
        alpha = mat3Vec(inverse3(Ic), add(Tgrip, cross(lever, F)));
        ac = add(scale(F, 1 / M), grav);
      }
      // each piece gets what the rigid motion asks of it beyond its own weight
      for (const x of members) {
        if (x.frozen) continue;
        const d = sub(com(x), xc);
        const Fi = scale(sub(add(ac, cross(alpha, d)), grav), x.mass);
        const Ti = mat3Vec(Is.get(x)!, alpha);
        const [vx, wx] = this.velocityOf(x);
        this.book.work.hands += (dot(Fi, vx) + dot(Ti, wx)) * dt;
        this.v1.Set(...Fi);
        this.v2.Set(...Ti);
        this.bi.AddForceAndTorque(x.body.GetID(), this.v1, this.v2, this.J.EActivation_Activate);
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // connections

  upsertConnection(conn: Connection, materials: Record<string, Material>) {
    const pa = this.parts.get(conn.a.part);
    const pb = conn.b ? this.parts.get(conn.b.part) ?? null : null;
    if (!pa || (conn.b && !pb)) return;
    const prev = this.conns.get(conn.id);
    if (prev) this.destroyConstraint(prev);
    const kind = getConnectorKind(conn.kind);
    const rec: ConnRec = {
      id: conn.id, conn, kind, derived: undefined as unknown as Derived, pa, pb,
      a: pa.segs[0]!, b: null, frameA: conn.a.frame, frameB: null, constraint: null, extra: [], typed: null,
      status: conn.state.status, over: 0, slipTicks: 0, cure: prev?.cure ?? conn.state.cure, lastDerive: this.time,
      load: { id: conn.id, u: 0, mode: '', axial: 0, shear: 0, bending: 0, torsion: 0, extent: 0 },
      springRigid: false, omega: 0, bandRest: 0, materials, lastPositionLambda: 0, pairKeys: [], corrF: [0, 0, 0], corrT: [0, 0, 0], worldB: null,
    };
    this.resolveEnds(rec);
    rec.derived = this.derive(rec);
    this.conns.set(conn.id, rec);
    // a joint can only be where the parts are: one across a gap (an axle nobody made, a pin through air) holds nothing
    let gap = unreachable(kind.model, kind.label, pa.part, pa.material, conn.a.frame, pb?.part ?? null, pb?.material ?? null, conn.b?.frame ?? null);
    // and a new joint's two ends meet: each on its part but apart from each other would be an invisible rod
    if (!gap && !prev && pb && !spans(kind.model)) {
      const apart = length(sub(this.anchorWorldB(rec).p, this.anchorWorld(rec).p));
      if (apart > REACH) gap = `The ${kind.label.toLowerCase()}'s two ends are ${Math.round(apart * 1000)} mm apart: nothing physical joins them. Make it where the parts touch.`;
    }
    // and a bought item takes only the joints its maker allows (R11): nothing is drilled into a motor or a battery
    gap ??= boughtRefusal(pa.kind, kind.id, kind.label) ?? (pb ? boughtRefusal(pb.kind, kind.id, kind.label) : null);
    const instant = gap ?? rec.derived.instantFailure;
    if (rec.status !== 'broken' && instant) {
      rec.status = 'broken';
      this.events.push({ type: 'break', conn: rec.id, mode: 'instant', load: 0, capacity: 0, point: this.anchorWorld(rec).p, note: instant });
    }
    this.buildConstraint(rec);
  }

  /** Attach each endpoint to the body (segment) under it, with the frame in that body's coordinates. */
  private resolveEnds(c: ConnRec) {
    c.pa = this.parts.get(c.conn.a.part) ?? c.pa;
    const ea = this.endpointBody(c.pa, c.conn.a);
    c.a = ea.body;
    c.frameA = ea.frame;
    if (c.conn.b) {
      c.pb = this.parts.get(c.conn.b.part) ?? c.pb;
      const eb = this.endpointBody(c.pb!, c.conn.b);
      c.b = eb.body;
      c.frameB = eb.frame;
    } else {
      c.pb = null;
      c.b = null;
      c.frameB = null;
    }
  }

  private endpointBody(pr: PartRec, ep: Endpoint): { body: BodyRec; frame: Pose } {
    if (!pr.layout) return { body: pr.segs[0]!, frame: ep.frame };
    const s = segmentOfFrame(pr.layout, ep.frame);
    return { body: pr.segs[s.seg]!, frame: s.frame };
  }

  removeConnection(id: string) {
    const c = this.conns.get(id);
    if (!c) return;
    this.destroyConstraint(c);
    this.conns.delete(id);
  }

  private derive(c: ConnRec): Derived {
    const matB = c.b ? c.b.material : null;
    const wa = this.anchorWorld(c);
    const wb = this.anchorWorldB(c);
    // the path a screw or nail takes: each part's thickness along the joint's normal (the geometry is fixed per joint)
    c.through ??= throughOf(c.pa.part, c.pa.material, c.conn.a.frame, c.pb?.part ?? null, c.pb?.material ?? null, c.conn.b?.frame ?? null);
    return c.kind.derive({
      params: c.conn.params,
      matA: c.a.material,
      matB,
      thicknessA: c.a.dims.b,
      thicknessB: c.b ? c.b.dims.b : c.a.dims.b,
      through: c.through,
      distance: length(sub(wb.p, wa.p)),
      cure: this.sim.cureClock <= 0 ? 1e12 : c.cure,
      partA: { kind: c.pa.kind.id, params: c.pa.part.params },
    });
  }

  private anchorWorld(c: ConnRec): Pose {
    return composePose(this.poseOf(c.a), c.frameA);
  }

  private anchorWorldB(c: ConnRec): Pose {
    if (!c.b || !c.frameB) return composePose(this.poseOf(c.a), c.frameA);
    return composePose(this.poseOf(c.b), c.frameB);
  }

  private destroyConstraint(c: ConnRec) {
    this.topology++;
    for (const k of [c.constraint, ...c.extra]) if (k) this.ps.RemoveConstraint(k);
    const had = c.typed;
    c.constraint = null;
    c.extra = [];
    c.typed = null;
    this.setPairCollision(c, true);
    if (had && c.kind.id === 'motor' && c.b && this.bodies.get(c.b.id) === c.b) this.rotorInertia(c.b);
  }

  /** Joined parts do not collide with each other (every body of one against every body of the other). */
  private setPairCollision(c: ConnRec, enabled: boolean) {
    if (enabled) {
      for (const k of c.pairKeys) this.releasePair(k);
      c.pairKeys = [];
      return;
    }
    if (!c.pb || c.pairKeys.length) return;
    const model = c.kind.model;
    if (model === 'spring' || model === 'rope' || model === 'band') return;
    for (const sa of c.pa.segs) for (const sb of c.pb.segs) {
      const key = this.holdPair(sa.subgroup, sb.subgroup);
      if (key >= 0) c.pairKeys.push(key);
    }
  }

  private buildConstraint(c: ConnRec) {
    this.topology++;
    const J = this.J;
    this.destroyConstraint(c);
    if (c.status === 'broken') return;
    const wa = this.anchorWorld(c);
    const wb = c.b ? this.anchorWorldB(c) : wa;
    c.worldB = c.b ? null : wb;
    const axA = rotate(wa.q, [1, 0, 0]);
    const ayA = rotate(wa.q, [0, 1, 0]);
    const axB = rotate(wb.q, [1, 0, 0]);
    const ayB = rotate(wb.q, [0, 1, 0]);
    const b1 = c.a.body;
    const b2 = c.b ? c.b.body : this.fixedToWorld;
    const d = c.derived;
    let constraint: JoltNS.Constraint;
    switch (c.kind.model) {
      case 'rigid': {
        const s = new J.SixDOFConstraintSettings();
        s.mPosition1 = this.R(wa.p);
        s.mPosition2 = this.R(wb.p);
        s.mAxisX1 = this.V(axA);
        s.mAxisY1 = this.V(ayA);
        s.mAxisX2 = this.V(axB);
        s.mAxisY2 = this.V(ayB);
        for (let a = 0; a < 6; a++) s.MakeFixedAxis(a as JoltNS.SixDOFConstraintSettings_EAxis);
        if (c.status === 'slipped' && d.slip) {
          const clr = Math.max(d.slip.clearance, 1e-4);
          const fr = d.slip.shear / Math.SQRT2;
          s.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_TranslationX, -clr, clr);
          s.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_TranslationZ, -clr, clr);
          s.set_mMaxFriction(J.SixDOFConstraintSettings_EAxis_TranslationX, fr);
          s.set_mMaxFriction(J.SixDOFConstraintSettings_EAxis_TranslationZ, fr);
        }
        joinSteps(s);
        constraint = s.Create(b1, b2);
        J.destroy(s);
        c.typed = J.castObject(constraint, J.SixDOFConstraint);
        break;
      }
      case 'revolute': {
        const s = new J.HingeConstraintSettings();
        s.mPoint1 = this.R(wa.p);
        s.mPoint2 = this.R(wb.p);
        s.mHingeAxis1 = this.V(ayA);
        s.mHingeAxis2 = this.V(ayB);
        s.mNormalAxis1 = this.V(axA);
        s.mNormalAxis2 = this.V(axB);
        const rv = d.revolute;
        if (rv?.limits) {
          s.mLimitsMin = rv.limits[0];
          s.mLimitsMax = rv.limits[1];
        }
        s.mMaxFrictionTorque = rv?.frictionTorque ?? 0;
        if (rv?.torsionSpring) {
          const ms = s.mMotorSettings;
          ms.mSpringSettings.mMode = J.ESpringMode_StiffnessAndDamping;
          ms.mSpringSettings.mStiffness = rv.torsionSpring.k;
          ms.mSpringSettings.mDamping = 2 * 0.05 * Math.sqrt(rv.torsionSpring.k * this.ownAxisInertia(c));
          ms.mMinTorqueLimit = -1e9;
          ms.mMaxTorqueLimit = 1e9;
        }
        if (rv?.servo) {
          // A 6 Hz, critically damped position loop on the real inertia about the joint axis. (Jolt's frequency
          // mode would scale it by the inertia of the one body the joint touches, a single light segment of a
          // breakable part, and leave the servo far too soft for the part it actually has to turn.)
          const I = this.jointAxisInertia(c, ayA, wa.p);
          const w = 2 * Math.PI * 6;
          const ms = s.mMotorSettings;
          ms.mSpringSettings.mMode = J.ESpringMode_StiffnessAndDamping;
          ms.mSpringSettings.mStiffness = I * w * w;
          ms.mSpringSettings.mDamping = 2 * I * w;
          ms.mMinTorqueLimit = -rv.servo.maxTorque;
          ms.mMaxTorqueLimit = rv.servo.maxTorque;
        }
        joinSteps(s);
        constraint = s.Create(b1, b2);
        J.destroy(s);
        const h = J.castObject(constraint, J.HingeConstraint);
        if (rv?.torsionSpring) {
          h.SetMotorState(J.EMotorState_Position);
          h.SetTargetAngle(rv.torsionSpring.rest);
        } else if (rv?.servo) {
          h.SetMotorState(J.EMotorState_Position);
        } else if (rv?.motor || rv?.eddy) {
          h.SetMotorState(J.EMotorState_Velocity);
        }
        c.typed = h;
        break;
      }
      case 'prismatic': {
        const s = new J.SliderConstraintSettings();
        s.mPoint1 = this.R(wa.p);
        s.mPoint2 = this.R(wb.p);
        s.mSliderAxis1 = this.V(ayA);
        s.mSliderAxis2 = this.V(ayB);
        s.mNormalAxis1 = this.V(axA);
        s.mNormalAxis2 = this.V(axB);
        const pr = d.prismatic;
        if (pr?.limits) {
          s.mLimitsMin = pr.limits[0];
          s.mLimitsMax = pr.limits[1];
        }
        s.mMaxFrictionForce = pr?.frictionForce ?? 0;
        if (pr && pr.k > 0) {
          s.mMotorSettings.mSpringSettings.mMode = J.ESpringMode_StiffnessAndDamping;
          s.mMotorSettings.mSpringSettings.mStiffness = pr.k;
          s.mMotorSettings.mSpringSettings.mDamping = 2 * 0.05 * Math.sqrt(pr.k * this.effMass(c));
          s.mMotorSettings.mMinForceLimit = -1e9;
          s.mMotorSettings.mMaxForceLimit = 1e9;
        }
        joinSteps(s);
        constraint = s.Create(b1, b2);
        J.destroy(s);
        const sl = J.castObject(constraint, J.SliderConstraint);
        if (pr && pr.k > 0) {
          sl.SetMotorState(J.EMotorState_Position);
          sl.SetTargetPosition(pr.rest);
        }
        c.typed = sl;
        break;
      }
      case 'spherical': {
        const s = new J.SwingTwistConstraintSettings();
        s.mPosition1 = this.R(wa.p);
        s.mPosition2 = this.R(wb.p);
        s.mTwistAxis1 = this.V(ayA);
        s.mTwistAxis2 = this.V(ayB);
        s.mPlaneAxis1 = this.V(axA);
        s.mPlaneAxis2 = this.V(axB);
        const cone = d.spherical?.cone ?? Math.PI / 3;
        s.mNormalHalfConeAngle = cone;
        s.mPlaneHalfConeAngle = cone;
        s.mTwistMinAngle = -Math.PI;
        s.mTwistMaxAngle = Math.PI;
        s.mMaxFrictionTorque = d.spherical?.frictionTorque ?? 0;
        joinSteps(s);
        constraint = s.Create(b1, b2);
        J.destroy(s);
        c.typed = J.castObject(constraint, J.SwingTwistConstraint);
        break;
      }
      case 'spring':
      case 'rope': {
        const sp = d.spring!;
        const mEff = this.effMass(c);
        // Stiffness-regime rule: simulate as a spring only if it resolves within MAX_SUBSTEPS substeps;
        // stiffer than that (natural frequency above ~30 Hz for typical masses) it behaves as rigid anyway.
        const omega = Math.sqrt(sp.k / Math.max(mEff, 1e-6));
        c.omega = omega;
        c.springRigid = (omega * TICK) / MAX_SUBSTEPS > 2 * SUBSTEP_OMEGA_DT;
        const zeta = c.kind.model === 'spring' ? Number(c.conn.params['zeta'] ?? 0.02) : 0.05;
        const s = new J.DistanceConstraintSettings();
        s.mPoint1 = this.R(wa.p);
        s.mPoint2 = this.R(wb.p);
        s.mMinDistance = c.kind.model === 'rope' ? 0 : sp.rest;
        s.mMaxDistance = sp.rest;
        if (!c.springRigid) {
          // Jolt's implicit spring integration dissipates roughly zeta_num = omega * dt_sub / 2 by itself;
          // subtract it so the total damping matches the material's real damping ratio.
          const sub = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil((omega * TICK) / SUBSTEP_OMEGA_DT)));
          const zetaSet = Math.max(0, zeta - (omega * TICK) / sub / 2);
          s.mLimitsSpringSettings.mMode = J.ESpringMode_StiffnessAndDamping;
          s.mLimitsSpringSettings.mStiffness = sp.k;
          s.mLimitsSpringSettings.mDamping = 2 * zetaSet * Math.sqrt(sp.k * mEff);
        }
        joinSteps(s);
        constraint = s.Create(b1, b2);
        J.destroy(s);
        c.typed = J.castObject(constraint, J.DistanceConstraint);
        if (c.kind.model === 'spring' && sp.min > 0 && sp.min < sp.rest) {
          // Coil bind: a hard stop at solid length.
          const bind = new J.DistanceConstraintSettings();
          bind.mPoint1 = this.R(wa.p);
          bind.mPoint2 = this.R(wb.p);
          bind.mMinDistance = sp.min;
          bind.mMaxDistance = 1e4;
          const k = bind.Create(b1, b2);
          J.destroy(bind);
          this.ps.AddConstraint(k);
          c.extra.push(k);
        }
        break;
      }
      case 'band': {
        c.bandRest = d.spring!.rest;
        return; // pure force element, no constraint
      }
    }
    this.ps.AddConstraint(constraint);
    c.constraint = constraint;
    this.setPairCollision(c, false);
    this.bi.ActivateBody(c.a.body.GetID());
    if (c.b) this.bi.ActivateBody(c.b.body.GetID());
    if (c.kind.id === 'motor' && c.b) this.rotorInertia(c.b);
  }

  /**
   * A gearmotor's rotor turns N times as fast as its output, so what the output turns carries the rotor's inertia
   * times N^2 about the drive's axis (planetary gearheads are coaxial, so it is that axis). It is given to the driven
   * body, the housing taken as mounted, as a gearmotor is: exact while the housing doesn't itself spin about the axis.
   * Worked out again from the body's own inertia whenever a drive on it is made or goes.
   */
  private rotorInertia(r: BodyRec) {
    if (r.frozen || !r.Iloc) return;
    const own = r.Iown ?? r.Iloc;
    const I = [...own];
    let added = false;
    for (const c of this.conns.values()) {
      if (c.kind.id !== 'motor' || c.b !== r || !c.typed || c.status === 'broken' || c.pa.kind.id !== 'motor.dc') continue;
      const d = this.driveOf(c);
      const N = d.gear?.ratio ?? 1;
      const J = d.model.rotorInertia * N * N;
      // the drive's axis in the driven body's own coordinates
      const q = this.poseOf(r).q;
      const n = rotate([-q[0], -q[1], -q[2], q[3]], rotate(this.anchorWorld(c).q, [0, 1, 0]));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) I[3 * i + j]! += J * n[i]! * n[j]!;
      added = true;
    }
    if (!added && !r.Iown) return;
    r.Iown = own;
    const { values, vectors } = symmetricEigen3(I);
    if (!values.every((v) => v > 0)) return;
    const [e0, e1, e2raw] = vectors as [Vec3, Vec3, Vec3];
    const e2 = dot(cross(e0, e1), e2raw) < 0 ? scale(e2raw, -1) : e2raw;
    r.body.GetMotionProperties().SetInverseInertia(this.V(values.map((v) => 1 / v)), this.Q(quatFromAxes(e0, e1, e2)));
    // a new array: segments of one part may share their inertia
    r.Iloc = this.localInertia(r);
    if (!added) r.Iown = undefined;
  }

  private effMass(c: ConnRec) {
    const ma = c.a.frozen ? Infinity : this.clusterMass(c.a);
    const mb = !c.b || c.b.frozen ? Infinity : this.clusterMass(c.b);
    if (!Number.isFinite(ma) && !Number.isFinite(mb)) return 1;
    if (!Number.isFinite(ma)) return mb;
    if (!Number.isFinite(mb)) return ma;
    return (ma * mb) / (ma + mb);
  }

  /**
   * The rule every joint that holds keeps: its two sides stay together (a slider along its line). One that comes
   * apart is reported once, as a defect of the physics, not of the build (tests/conformance/rules.test.ts holds it).
   */
  private watchJoints() {
    for (const c of this.conns.values()) {
      if (c.status !== 'intact' || !c.constraint || !c.b || c.driftReported || spans(c.kind.model)) continue;
      const pa = this.anchorWorld(c), pb = this.anchorWorldB(c).p;
      let gap = sub(pb, pa.p);
      if (c.kind.model === 'prismatic') { const ax = rotate(pa.q, [0, 1, 0]); gap = sub(gap, scale(ax, dot(gap, ax))); }
      const d = length(gap);
      // held together once, it must stay so (a joint still being pulled in, after an undo put one side back, is not
      // drifting)
      if (d <= JOINT_DRIFT / 2) c.heldOnce = true;
      if (d <= JOINT_DRIFT || !c.heldOnce) continue;
      c.driftReported = true;
      const name = (r: BodyRec) => r.pr.part.name;
      this.events.push({ type: 'drift', conn: c.id, gap: d, point: pa.p, note: `the ${c.kind.label.toLowerCase()} joining ${name(c.a)} and ${name(c.b)} came ${Math.round(d * 1000)} mm apart while intact` });
    }
  }

  /**
   * Breadth-first from the assemblies through the mechanism's joints: each moving part not yet placed is moved (not
   * sped up) so that its joint with the placed part holds exactly: a rigid joint's whole pose, a hinge's pin point and
   * axis, a slider's line, a ball joint's centre. Parts held together by rigid joints move as one (a kingpin block
   * bolted to the chassis goes where the chassis goes). Loops close on the first joint reached.
   */
  private closeMechanism(placed: Set<BodyRec>) {
    if (!this.mechanism.length) return;
    const by = new Map<BodyRec, ConnRec[]>();
    const group = new Map<BodyRec, BodyRec[]>();
    const join = (x: BodyRec, y: BodyRec) => {
      const gx = group.get(x) ?? [x], gy = group.get(y) ?? [y];
      if (gx === gy) return;
      const all = [...gx, ...gy];
      for (const r of all) group.set(r, all);
    };
    for (const c of this.mechanism) {
      if (c.status === 'broken' || !c.constraint || !c.b || !c.frameB) continue;
      (by.get(c.a) ?? by.set(c.a, []).get(c.a)!).push(c);
      (by.get(c.b) ?? by.set(c.b, []).get(c.b)!).push(c);
      if (c.kind.model === 'rigid' && c.status === 'intact' && !placed.has(c.a) && !placed.has(c.b)) join(c.a, c.b);
    }
    const queue = [...placed];
    while (queue.length) {
      const r = queue.shift()!;
      for (const c of by.get(r) ?? []) {
        const child = c.a === r ? c.b! : c.a;
        if (placed.has(child) || child.frozen || child.grabbed === 'creative' || !child.Iloc) continue;
        const members = group.get(child) ?? [child];
        for (const x of members) { placed.add(x); queue.push(x); }
        // only what hangs from one thing is set onto it: a group bridging two moving parts (a chassis between its rear
        // axle and its steering beam) is a loop, closed by the velocity solve and its rows, not by moving it to either
        const owners = new Set<unknown>();
        for (const x of members) for (const j of by.get(x) ?? []) {
          const o = j.a === x ? j.b! : j.a;
          if (members.includes(o) || !placed.has(o)) continue;
          owners.add(this.clusterOf.has(o) ? this.clusterOf.get(o) : group.get(o) ?? o);
        }
        if (owners.size > 1) continue;
        const childFrame = c.a === r ? c.frameB! : c.frameA, parentFrame = c.a === r ? c.frameA : c.frameB!;
        const target = composePose(this.poseOf(r), parentFrame);
        const now = composePose(this.poseOf(child), childFrame);
        const m = c.kind.model;
        // the turn (about the child's anchor) and the shift that put the child on its joint
        let turn: Quat = IDENTITY_Q;
        if (m === 'rigid' || m === 'prismatic') turn = normQuat(quatMul(target.q, quatConj(now.q)));
        else if (m === 'revolute') {
          const ac = rotate(now.q, [0, 1, 0]), at = rotate(target.q, [0, 1, 0]);
          const k = cross(ac, at), s2 = length(k);
          if (s2 > 1e-9) turn = axisAngle(scale(k, 1 / s2), Math.atan2(s2, dot(ac, at)));
        }
        let shift = sub(target.p, now.p);
        if (m === 'prismatic') { const ax = rotate(target.q, [0, 1, 0]); shift = sub(shift, scale(ax, dot(shift, ax))); }
        if (length(shift) < 1e-7 && Math.abs(turn[3]) > 1 - 1e-12) continue;
        for (const x of members) {
          const pose = this.poseOf(x);
          const p = add(add(now.p, rotate(turn, sub(pose.p, now.p))), shift);
          this.r1.Set(...p);
          this.q1.Set(...normQuat(quatMul(turn, pose.q)));
          this.bi.SetPositionAndRotation(x.body.GetID(), this.r1, this.q1, this.J.EActivation_DontActivate);
        }
      }
    }
  }

  /**
   * One-sided rows for a joint's stops, as contacts are: a hinge (or servo) at an end of its travel may not turn past it,
   * a slider may not run past its ends, a ball joint may not swing past its cone. Only stops within reach this tick.
   */
  private limitRows(c: ConnRec, a: Entity, b: Entity, ha: Pose, hb: Pose, axis: Vec3, dt: number, beta: number, tag: RowTag, key: string): Row[] {
    const out: Row[] = [];
    const stop = (dir: Vec3, gap: number, kind: 'linear' | 'angular', k: string) => {
      // gap: how far it may still go toward the stop (negative: past it)
      if (gap > 0.25) return;
      const target = gap > 0 ? -gap / dt : 0;
      const bias = gap < 0 ? Math.min(-gap * beta, MAX_CORRECTION / dt) : 0;
      out.push({ a, b, kind, pa: kind === 'linear' ? ha.p : [0, 0, 0], pb: kind === 'linear' ? hb.p : [0, 0, 0], dir, target, bias, lo: 0, hi: Infinity, acc: 0, tag, key: `${key}:${k}` });
    };
    const d = c.derived;
    if (c.kind.model === 'revolute' && d.revolute?.limits) {
      const [lo, hi] = d.revolute.limits;
      const angle = dot(rotationVector(quatMul(hb.q, quatConj(ha.q))), axis);
      stop(scale(axis, -1), hi - angle, 'angular', 'hi');
      stop(axis, angle - lo, 'angular', 'lo');
    } else if (c.kind.model === 'prismatic' && d.prismatic?.limits) {
      const [lo, hi] = d.prismatic.limits;
      const at = dot(sub(hb.p, ha.p), axis);
      stop(scale(axis, -1), hi - at, 'linear', 'hi');
      stop(axis, at - lo, 'linear', 'lo');
    } else if (c.kind.model === 'spherical' && d.spherical) {
      const ta = axis, tb = rotate(hb.q, [0, 1, 0]);
      const swing = Math.acos(Math.max(-1, Math.min(1, dot(ta, tb))));
      const k = cross(ta, tb);
      if (length(k) > 1e-6) stop(scale(normalize(k), -1), d.spherical.cone - swing, 'angular', 'cone');
    }
    return out;
  }

  /**
   * Everything that turns with a body as one: its still-bonded segments and whatever intact rigid joints hold to them,
   * transitively, leaving out the joint being sized (`except`). Null if that includes something immovable (a frozen
   * part, the world). A motor, servo or brake acts on all of this, not on the one light bracket it is bolted to.
   */
  private rigidGroup(r: BodyRec, except: ConnRec | null): BodyRec[] | null {
    const adj = new Map<BodyRec, (BodyRec | null)[]>();
    for (const c of this.conns.values()) {
      if (c === except || c.status !== 'intact' || c.kind.model !== 'rigid') continue;
      (adj.get(c.a) ?? adj.set(c.a, []).get(c.a)!).push(c.b);
      if (c.b) (adj.get(c.b) ?? adj.set(c.b, []).get(c.b)!).push(c.a);
    }
    const seen = new Set<BodyRec>();
    const stack = [r];
    while (stack.length) {
      const x = stack.pop()!;
      if (seen.has(x)) continue;
      if (x.frozen || !x.Iloc) return null;
      seen.add(x);
      for (const s of this.cluster(x)) if (!seen.has(s)) stack.push(s);
      for (const y of adj.get(x) ?? []) {
        if (!y) return null;
        if (!seen.has(y)) stack.push(y);
      }
    }
    return [...seen];
  }

  /**
   * Reduced moment of inertia of the two sides of a joint about its axis (a line through `point`): each side is
   * everything rigidly with it (rigidGroup), with the parallel-axis term for every piece. Worked out once each time
   * what is joined to what changes (it is constant while the groups stay rigid).
   */
  private jointAxisInertia(c: ConnRec, axis: Vec3, point: Vec3) {
    if (c.axisI && c.axisI.at === this.topology) return c.axisI.I;
    const side = (r: BodyRec | null) => {
      const group = r ? this.rigidGroup(r, c) : null;
      if (!group) return Infinity;
      let I = 0;
      for (const s of group) {
        const pose = this.poseOf(s);
        const d = sub(pose.p, point);
        const perp = sub(d, scale(axis, dot(d, axis)));
        I += dot(axis, mat3Vec(worldInertia(s.Iloc!, pose.q), axis)) + s.mass * dot(perp, perp);
      }
      return Math.max(I, 1e-9);
    };
    const ia = side(c.a), ib = side(c.b);
    const I = !Number.isFinite(ia) && !Number.isFinite(ib) ? 1 : !Number.isFinite(ia) ? ib : !Number.isFinite(ib) ? ia : (ia * ib) / (ia + ib);
    c.axisI = { at: this.topology, I };
    return I;
  }

  /** The same about the joint's own axis, where it is now. */
  private ownAxisInertia(c: ConnRec) {
    const wa = this.anchorWorld(c);
    return this.jointAxisInertia(c, rotate(wa.q, [0, 1, 0]), wa.p);
  }

  // ---------------------------------------------------------------------------------------------
  // per-tick external effects

  private applyFields(dt: number) {
    this.applyMagnets(dt);
    this.applyFluids(dt);
    if (this.sim.airDrag) this.applyAirDrag();
    this.applyBands();
    this.driveJoints();
    this.driveGrabs(dt);
    // last: the drag is taken at the velocity the step ends with, under everything else (M4)
    this.applyEddies(dt);
  }

  /**
   * Stiffness of a magnetic pair, from `wrench(dx, rot)` (force and torque on the second body when it is moved by dx
   * and turned by a small rotation): the Jacobians by central differences, their restoring parts (for the
   * linearly implicit step, see implicit.ts) and the fastest rate at which the pair's motion evolves, growing or
   * oscillating (s^-1), which sets how finely the tick must be divided to follow it.
   *
   * Central differences, with steps small against `feature` (the smallest magnet dimension), not one-sided: at
   * contact the pull changes steeply with position, and a forward difference of a force that is even in a sideways
   * offset (the axial pull) reads a false coupling between the axes, whose implicit treatment then turns the pull into
   * a sideways kick. The Jacobians are kept in a's frame and reused while b has moved less than STIFFNESS_REUSE of the
   * feature size (and turned less than STIFFNESS_REUSE rad) relative to a since they were measured: they only set the
   * substeps and the implicit step's stability, the force itself is evaluated afresh every substep.
   */
  private pairStiffness(pr: MagnetPair, A: BodyRec | null, B: BodyRec, feature: number): MagnetStiffness | null {
    if (!B.Iloc) return null;
    const pa = A ? this.poseOf(A) : { p: [0, 0, 0] as Vec3, q: IDENTITY_Q }, pb = this.poseOf(B);
    const back = quatConj(pa.q);
    const relP = rotate(back, sub(pb.p, pa.p)), relQ = quatMul(back, pb.q);
    const R = quatToMat3(pa.q);
    const toWorld = (J: number[]) => mat3Mul(mat3Mul(R, J), transpose3(R));
    const toA = (J: number[]) => mat3Mul(mat3Mul(transpose3(R), J), R);
    const cached = this.stiffnessCache.get(pr.key);
    let Jt: number[], Jr: number[];
    if (cached && length(sub(relP, cached.relP)) < STIFFNESS_REUSE * feature && angleBetween(cached.relQ, relQ) < STIFFNESS_REUSE) {
      Jt = toWorld(cached.Jt);
      Jr = toWorld(cached.Jr);
    } else {
      const h = Math.min(1e-4, 0.02 * feature), ha = 2e-3;
      Jt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      Jr = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < 3; i++) {
        const dx: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0];
        dx[i] = h;
        rot[i] = ha;
        const tp = pr.wrench(dx, [0, 0, 0]), tm = pr.wrench(scale(dx, -1), [0, 0, 0]);
        const rp = pr.wrench([0, 0, 0], rot), rm = pr.wrench([0, 0, 0], scale(rot, -1));
        for (let r = 0; r < 3; r++) {
          Jt[r * 3 + i] = (tp[r]! - tm[r]!) / (2 * h);
          Jr[r * 3 + i] = (rp[3 + r]! - rm[3 + r]!) / (2 * ha);
        }
      }
      this.stiffnessCache.set(pr.key, { relP, relQ, Jt: toA(Jt), Jr: toA(Jr) });
    }
    const aFree = !!A && !A.frozen && A.grabbed !== 'creative' && !!A.Iloc;
    const mu = aFree ? (A!.mass * B.mass) / (A!.mass + B.mass) : B.mass;
    const IB = worldInertia(B.Iloc, this.poseOf(B).q);
    const Ired = aFree ? inverse3(inverse3(worldInertia(A!.Iloc!, this.poseOf(A!).q)).map((x, i) => x + inverse3(IB)[i]!)) : IB;
    const sym = (J: number[]) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => (J[i * 3 + j]! + J[j * 3 + i]!) / 2));
    const kt = Math.max(...symmetricEigen3(sym(Jt)).values.map(Math.abs));
    const kr = Math.max(...symmetricEigen3(sym(Jr)).values.map(Math.abs));
    const Imin = Math.max(1e-12, Math.min(...symmetricEigen3(Ired).values));
    return { modesT: restoringModes(Jt), modesR: restoringModes(Jr), mu, Ired, rate: Math.max(Math.sqrt(kt / mu), Math.sqrt(kr / Imin)) };
  }

  /**
   * Force and torque on the second body of a magnetic pair over a (sub)step, implicit where it is stiff. Where the
   * step carries b more than PATH_STEP of the pair's feature size relative to a (a fast approach or departure), the
   * wrench is averaged along the step's path (two-point Gauss), so it does the work the field does along the way,
   * not what the force at the start of the step would do (M3).
   */
  private pairWrench(wrench: (dx: Vec3, rot: Vec3) => number[], A: BodyRec | null, B: BodyRec, k: MagnetStiffness | undefined, dt: number, feature: number): { F: Vec3; T: Vec3 } {
    const aFree = !!A && !A.frozen && A.grabbed !== 'creative';
    const [vB, wB] = this.velocityOf(B);
    const [vA, wA] = aFree ? this.velocityOf(A!) : [[0, 0, 0] as Vec3, [0, 0, 0] as Vec3];
    // b's travel relative to a over the step (its turning is followed by the substeps and the implicit step)
    const vRel = aFree ? sub(sub(vB, vA), cross(wA, sub(this.poseOf(B).p, this.poseOf(A!).p))) : vB;
    const dx = scale(vRel, dt);
    let f: number[];
    if (length(dx) > PATH_STEP * feature) {
      const g = [0.5 - 0.5 / Math.sqrt(3), 0.5 + 0.5 / Math.sqrt(3)].map((s) => wrench(scale(dx, s), [0, 0, 0]));
      f = g[0]!.map((v, i) => (v + g[1]![i]!) / 2);
    } else {
      f = wrench([0, 0, 0], [0, 0, 0]);
    }
    const F: Vec3 = [f[0]!, f[1]!, f[2]!], T: Vec3 = [f[3]!, f[4]!, f[5]!];
    if (!k) return { F, T };
    // Only the restoring modes the substep cannot follow (omega dt > 1) are taken implicitly: backward Euler is stable
    // for any stiffness but damps what it treats. The rest the substeps follow explicitly (symplectic, undamped), as a
    // real magnet wobbling near another hardly loses energy (M3).
    const mu = k.mu;
    const unresolved = (modes: { lam: number; e: Vec3 }[], inertia: (e: Vec3) => number) => stiffnessOf(modes.filter((m) => -m.lam * dt * dt > inertia(m.e)));
    const Kt = unresolved(k.modesT, () => mu), Kr = unresolved(k.modesR, (e) => dot(e, mat3Vec(k.Ired, e)));
    return {
      F: implicitForce([mu, 0, 0, 0, mu, 0, 0, 0, mu], Kt, F, sub(vB, vA), dt),
      T: implicitForce(k.Ired, Kr, T, sub(wB, wA), dt),
    };
  }

  /**
   * The magnetic interactions at this instant: for each pair close enough to matter, the wrench on `b` (force, and
   * torque about its centre) from `a` as a function of a small rigid displacement of b. Magnet pairs: a's pole faces
   * act on samples of b's (b the smaller magnet, unless only a is free). Steel: a is the steel part, acting through
   * the image of b's faces in its nearest face.
   */
  private magnetPairs(only: Set<string> | null = null): MagnetPair[] {
    const pairs: MagnetPair[] = [];
    if (only && !only.size) return pairs;
    const g = length(this.sim.gravity) || 9.81;
    const magnets = [...this.bodies.values()].filter(fieldOn);
    if (magnets.length === 0) return [];
    // steel, and an electromagnet switched off: its core is steel
    const ferro = [...this.bodies.values()].filter((r) => !fieldOn(r) && r.material.ferromagnetic);
    const info = magnets.map((r) => {
      const pose = this.poseOf(r);
      const geom = r.magnet!.geom;
      const n = rotate(pose.q, [0, 1, 0]);
      const size = geom.shape === 'cylinder' ? geom.radius : Math.max(geom.w, geom.h) / 2;
      const vol = geom.shape === 'cylinder' ? Math.PI * geom.radius ** 2 * geom.length : geom.w * geom.h * geom.length;
      const feature = Math.min(geom.shape === 'cylinder' ? geom.radius : Math.min(geom.w, geom.h) / 2, geom.length);
      const face = geom.shape === 'cylinder' ? Math.PI * geom.radius ** 2 : geom.w * geom.h;
      const Imin = r.frozen || !r.Iloc ? Infinity : Math.min(...symmetricEigen3(r.Iloc).values);
      return { r, pose, n, size, feature, face, m: dipoleMoment(r.magnet!.Br, vol), bound: Math.hypot(size, geom.length / 2), Imin };
    });
    /**
     * Is a pair stiff: faster than a tick can follow (rate TICK > 0.25), so that its stiffness must be measured and the
     * tick divided? Close pairs are; further off, the dipoles bound how fast it can turn (torque stiffness
     * mu0 m_a m_b / (2 pi r^3) over the lighter inertia) or close in (dF/dr = 12 mu0 m_a m_b / (2 pi r^5) over the lighter
     * mass): a light magnet can wobble tens of times a second several centimetres from a strong one.
     */
    const stiff = (gap: number, size: number, ma: number, mb: number, r: number, mass: number, Imin: number) => {
      if (gap < 4 * size) return true;
      const kRot = (MU0 * ma * mb) / (2 * Math.PI * r ** 3), kTr = (12 * MU0 * ma * mb) / (2 * Math.PI * r ** 5);
      return Math.max(Math.sqrt(kRot / Imin), Math.sqrt(kTr / mass)) * TICK > 0.25;
    };
    const facesCache = new Map<string, PoleFace[]>();
    const facesOf = (k: (typeof info)[number]) => {
      let f = facesCache.get(k.r.id);
      if (!f) {
        const geom = k.r.magnet!.geom;
        const c = k.pose.p as MVec3;
        f = geom.shape === 'cylinder'
          ? cylinderFaces(c, k.n as MVec3, geom.radius, geom.length, k.r.magnet!.Br)
          : blockFaces(c, k.n as MVec3, rotate(k.pose.q, [1, 0, 0]) as MVec3, rotate(k.pose.q, [0, 0, 1]) as MVec3, geom.w, geom.h, geom.length, k.r.magnet!.Br);
        facesCache.set(k.r.id, f);
      }
      return f;
    };
    const chargesCache = new Map<string, Charge[]>();
    const chargesOf = (k: (typeof info)[number], rings: number) => {
      const key = `${k.r.id}:${rings}`;
      let ch = chargesCache.get(key);
      if (!ch) {
        const geom = k.r.magnet!.geom;
        const c = k.pose.p as MVec3;
        if (geom.shape === 'cylinder') ch = cylinderCharges(c, k.n as MVec3, geom.radius, geom.length, k.r.magnet!.Br, rings);
        else {
          const t1 = rotate(k.pose.q, [1, 0, 0]) as MVec3;
          const t2 = rotate(k.pose.q, [0, 0, 1]) as MVec3;
          ch = blockCharges(c, k.n as MVec3, t1, t2, geom.w, geom.h, geom.length, k.r.magnet!.Br, Math.max(1, Math.min(8, rings * 2 - 1)));
        }
        chargesCache.set(key, ch);
      }
      return ch;
    };
    const MU0 = 4e-7 * Math.PI;
    // magnet <-> magnet
    for (let i = 0; i < info.length; i++) {
      for (let j = i + 1; j < info.length; j++) {
        let A = info[i]!, B = info[j]!;
        if (A.r.frozen && B.r.frozen) continue;
        if (A.face < B.face) [A, B] = [B, A];
        if (B.r.frozen) [A, B] = [B, A];
        if (only && !only.has(`${A.r.id}|${B.r.id}`)) continue;
        const dist = length(sub(B.pose.p, A.pose.p));
        const light = Math.min(A.r.frozen ? Infinity : A.r.mass, B.r.frozen ? Infinity : B.r.mass);
        // Cutoff where the dipole force drops below 0.1% of the lighter magnet's weight.
        const cutoff = Math.pow((3 * MU0 * A.m * B.m) / (2 * Math.PI * 0.001 * light * g), 0.25);
        if (dist > cutoff) continue;
        const gap = Math.max(0, dist - A.bound - B.bound);
        const level = ringLevel(gap, Math.min(A.size, B.size), this.opts.maxMagnetRings);
        const towards = dot(A.n, sub(B.pose.p, A.pose.p)) >= 0 ? A.n : scale(A.n, -1);
        pairs.push({
          key: `${A.r.id}|${B.r.id}`, a: A.r, b: B.r,
          face: { n: towards, p: add(A.pose.p, scale(towards, A.r.magnet!.geom.length / 2)) },
          // close pairs are stiff (a small magnet near another flips or wobbles within milliseconds); far ones may be
          close: stiff(gap, Math.min(A.size, B.size), A.m, B.m, dist, light, Math.min(A.Imin, B.Imin)), feature: Math.min(A.feature, B.feature),
          wrench: (dx, rot) => blendedInteraction(level, (rings) => {
            const chB = dx[0] || dx[1] || dx[2] || rot[0] || rot[1] || rot[2] ? transformCharges(chargesOf(B, rings), B.pose.p as MVec3, dx as MVec3, rot as MVec3) : chargesOf(B, rings);
            return magnetWrench(facesOf(A), chB, add(B.pose.p, dx) as MVec3);
          }),
        });
      }
    }
    // magnet <-> ferromagnetic parts (method of images on the nearest steel face)
    for (const M of info) {
      for (const S of ferro) {
        if (M.r.frozen && S.frozen) continue;
        if (only && !only.has(`${S.id}|${M.r.id}`)) continue;
        const sp = this.poseOf(S);
        const dist = length(sub(sp.p, M.pose.p));
        const reach = Math.hypot(S.dims.length, S.dims.a) / 2 + Math.pow((3 * MU0 * M.m * M.m) / (2 * Math.PI * 0.001 * M.r.mass * g), 0.25);
        if (dist > reach) continue;
        const local = rotate(quatConj(sp.q), sub(M.pose.p, sp.p));
        const hit = closestOnShape(S.shape, local);
        const o = add(sp.p, rotate(sp.q, hit.p));
        const nrm = normalize(rotate(sp.q, hit.n));
        const gap = Math.max(0, hit.d - M.bound);
        const level = ringLevel(gap, M.size, this.opts.maxMagnetRings);
        const geom = M.r.magnet!.geom;
        const poleArea = geom.shape === 'cylinder' ? Math.PI * geom.radius ** 2 : geom.w * geom.h;
        const polePerimeter = geom.shape === 'cylinder' ? 2 * Math.PI * geom.radius : 2 * (geom.w + geom.h);
        const factor = 0.95 * plateSaturationFactor(S.dims.b, M.r.magnet!.Br, poleArea, polePerimeter);
        pairs.push({
          key: `${S.id}|${M.r.id}`, a: S, b: M.r, face: { n: nrm, p: o },
          // against its image in the steel, 2 d away
          close: stiff(gap, M.size, M.m * factor, M.m, 2 * Math.max(hit.d, M.bound), M.r.mass, M.Imin), feature: M.feature,
          wrench: (dx, rot) => blendedInteraction(level, (rings) => {
            const moved = dx[0] || dx[1] || dx[2] || rot[0] || rot[1] || rot[2];
            let mc = moved ? transformCharges(chargesOf(M, rings), M.pose.p as MVec3, dx as MVec3, rot as MVec3) : chargesOf(M, rings);
            let mf = moved ? transformFaces(facesOf(M), M.pose.p as MVec3, dx as MVec3, rot as MVec3) : facesOf(M);
            let centre = add(M.pose.p, dx);
            // Contact penetration (the solver allows up to its slop) cannot put a magnet inside steel. Its field is
            // then that of the magnet touching, lifted out along the normal: otherwise its faces would pass their
            // own images, and the pull would reverse and fire it off (M2).
            const sink = Math.min(0, ...mf.map((f) => lowestAlong(f, nrm) - dot(o, nrm)));
            if (sink < 0) {
              const up = scale(nrm, -sink) as MVec3;
              mc = mc.map((ch) => ({ ...ch, p: add(ch.p, up) as MVec3 }));
              mf = mf.map((f) => ({ ...f, c: add(f.c, up) as MVec3 }));
              centre = add(centre, up);
            }
            return magnetWrench(imageFaces(mf, o as MVec3, nrm as MVec3, factor), mc, centre as MVec3);
          }),
        });
      }
    }
    return pairs;
  }

  /**
   * Magnetic forces. `estimate` (once per tick, before stepping) measures the stiffness of close pairs and returns
   * how many substeps the tick needs to follow them (a 20 mm magnet near another flips in a few milliseconds);
   * otherwise it applies the forces for a (sub)step of length dt, implicitly on the stiff pairs' restoring part.
   * Latched pairs are skipped: their latch stands for the force (see updateLatches).
   */
  private applyMagnets(dt: number, estimate = false): number {
    if (!estimate) this.lastMagnetPairs = 0;
    else this.magnetStiffness.clear();
    if (!this.sim.magnetism) return 1;
    let rate = 0;
    const measured = new Set<string>();
    // Multirate (as r-RESPA does for molecular forces): a stiff, close pair is recomputed every substep; any other
    // changes too little within a tick to need it, so its wrench, averaged along the tick's path, is held over the
    // substeps. The pairs are found once a tick.
    const s = this.magnetSub;
    const first = estimate || s === 0;
    // which held pairs are due again this substep: each at its own rate (a far pair not within this tick)
    const due = !first ? new Set([...this.magnetHeld].filter(([, h]) => s % h.every === 0).map(([key]) => key)) : null;
    const pairs = estimate ? (this.tickPairs = this.magnetPairs()) : first ? (this.tickPairs ?? this.magnetPairs()) : this.magnetPairs(due);
    if (!estimate) this.tickPairs = null;
    if (!estimate && first) this.magnetHeld.clear();
    this.forceBook = { kind: 'magnets' };
    // the pairs not due, as they were when last worked out
    if (!estimate && !first) for (const [key, h] of this.magnetHeld) if (!due!.has(key)) this.applyPairWrench(h.a, h.b, h.F, h.T);
    for (const pr of pairs) {
      if (this.latches.has(pr.key)) continue;
      if (estimate) {
        if (pr.close && !pr.b.frozen) {
          const k = this.pairStiffness(pr, pr.a, pr.b, pr.feature);
          measured.add(pr.key);
          // a pair settled at rest on what it pairs with is held exactly by the implicit step whatever its stiffness;
          // only one that is moving, or may start to, needs the tick divided to follow it
          const still = this.pairMoving(pr) ? 0 : (this.magnetRest.get(pr.key) ?? 0) + 1;
          this.magnetRest.set(pr.key, still);
          if (k) { this.magnetStiffness.set(pr.key, k); if (still < MAGNET_SETTLE_TICKS) rate = Math.max(rate, k.rate); }
        }
        continue;
      }
      const k = this.magnetStiffness.get(pr.key);
      // how many substeps its wrench can stand for: a pair whose motion the substep resolves many times over
      // (rate dt well under a quarter radian) needs working out only every so often; far ones once a tick
      const every = first ? (!pr.close ? Infinity : k && k.rate * dt < 0.25 ? Math.max(1, Math.floor(0.25 / (k.rate * dt))) : 1) : this.magnetHeld.get(pr.key)?.every ?? 1;
      const span = Number.isFinite(every) ? Math.min(every * dt, TICK) : TICK;
      const { F, T } = this.pairWrench(pr.wrench, pr.a, pr.b, every === 1 ? k : undefined, every === 1 ? dt : span, pr.feature);
      this.magnetHeld.set(pr.key, { a: pr.a, b: pr.b, F, T, every });
      this.applyPairWrench(pr.a, pr.b, F, T);
      this.lastMagnetPairs++;
    }
    this.forceBook = null;
    if (estimate) for (const key of [...this.stiffnessCache.keys()]) if (!measured.has(key)) this.stiffnessCache.delete(key);
    return estimate ? Math.max(1, Math.min(MAX_MAGNET_SUBSTEPS, Math.ceil((rate * TICK) / 0.5))) : 1;
  }

  /**
   * Whether a magnetic pair could ring this tick: unless it rests on something that holds it (in contact last tick,
   * and still there), its stiffness can set it moving faster than a tick follows. A magnet just let go in mid-air is
   * still for an instant, but nothing holds it.
   */
  private pairMoving(pr: MagnetPair) {
    const [vb, wb] = this.velocityOf(pr.b);
    const [va, wa] = pr.a.frozen ? [[0, 0, 0] as Vec3, [0, 0, 0] as Vec3] : this.velocityOf(pr.a);
    if (length(sub(vb, va)) > MAGNET_REST_SPEED || length(sub(wb, wa)) * pr.feature > MAGNET_REST_SPEED) return true;
    // asleep, or lying on something that holds it (its partner, the floor, another part) as of last tick
    if (!pr.b.body.IsActive()) return false;
    return !this.restingOn.has(pr.b);
  }

  /** A magnetic wrench on b, and its exact reaction on a (with the moment of the couple, so momentum holds). */
  private applyPairWrench(a: BodyRec, b: BodyRec, F: Vec3, T: Vec3) {
    this.applyForceTorque(b, F, T);
    const d = sub(this.poseOf(b).p, this.poseOf(a).p);
    this.applyForceTorque(a, scale(F, -1), sub(scale(T, -1), cross(d, F)));
  }

  // ---------------------------------------------------------------------------------------------
  // eddy currents (M4 in docs/ARCHITECTURE.md)

  /** Pole faces of a magnet body at a pose. */
  private magnetFacesOf(r: BodyRec, pose: Pose): PoleFace[] {
    const g = r.magnet!.geom;
    const n = rotate(pose.q, [0, 1, 0]) as MVec3;
    return g.shape === 'cylinder'
      ? cylinderFaces(pose.p as MVec3, n, g.radius, g.length, r.magnet!.Br)
      : blockFaces(pose.p as MVec3, n, rotate(pose.q, [1, 0, 0]) as MVec3, rotate(pose.q, [0, 0, 1]) as MVec3, g.w, g.h, g.length, r.magnet!.Br);
  }

  /**
   * Finite-volume mesh, in C's own frame, of the part of conductor C within `reach` of the local point `near`: a
   * whole magnet, a box, a cylinder, or a tube (its ring of staves meshed as the annulus it is, so currents
   * circulate).
   */
  private conductorMesh(C: BodyRec, near: Vec3, reach: number): EddyMesh | null {
    const win = { lo: sub(near, [reach, reach, reach]) as Vec3, hi: add(near, [reach, reach, reach]) as Vec3 };
    const g = C.magnet?.geom, sh = C.shape;
    if (g) return g.shape === 'cylinder' ? annulusMesh(g.radius, 0, g.length / 2, null, 96, 3, 16) : boxMesh([g.w / 2, g.length / 2, g.h / 2], null, 96);
    if (sh.type === 'box') return boxMesh(sh.half, win, EDDY_CELLS);
    if (sh.type === 'cylinder') return annulusMesh(sh.radius, 0, sh.halfHeight, win, EDDY_CELLS);
    if (sh.type === 'compound' && sh.children.length >= 6 && sh.children.every((c) => c.shape.type === 'box' && Math.abs(c.p[1]) < 1e-9)) {
      // a tube's ring of staves: radius of the stave centres, wall = stave thickness
      const rc = Math.hypot(sh.children[0]!.p[0], sh.children[0]!.p[2]);
      const b0 = sh.children[0]!.shape as { type: 'box'; half: Vec3 };
      if (sh.children.every((c) => Math.abs(Math.hypot(c.p[0], c.p[2]) - rc) < 1e-6 * Math.max(rc, 1))) {
        return annulusMesh(rc + b0.half[0], Math.max(0, rc - b0.half[0]), b0.half[1], win, EDDY_CELLS);
      }
    }
    return null;
  }

  /**
   * Before stepping: the damping of every good conductor close to a moving magnet, for the tick (the geometry barely
   * moves in it). In scope: non-magnetic metals of at least EDDY_MIN_SIGMA (aluminium, copper, brass), where Lenz
   * braking is strong and the free-space field is the true one. A magnet's own currents (NdFeB, 0.67 MS/m) damp it at
   * about 2 s^-1 and are left out, as is steel, whose permeability this field does not model (M4).
   */
  private estimateEddies() {
    this.eddies = [];
    if (!this.sim.magnetism) return;
    const magnets = [...this.bodies.values()].filter(fieldOn);
    if (!magnets.length) return;
    const conductors = [...this.bodies.values()].filter((r) => !r.magnet && !r.material.ferromagnetic && r.material.conductivity >= EDDY_MIN_SIGMA);
    if (!conductors.length) return;
    const MU0 = 4e-7 * Math.PI;
    const field = (faces: PoleFace[], mesh: EddyMesh) => {
      const h = Math.cbrt(mesh.cells[0]!.vol);
      return mesh.cells.map((c) => {
        let b: Vec3 = [0, 0, 0];
        for (const f of faces) { const x = faceField(f, c.p as MVec3, h); b = [b[0] + MU0 * x[0], b[1] + MU0 * x[1], b[2] + MU0 * x[2]]; }
        return b;
      });
    };
    for (const M of magnets) {
      const poseM = this.poseOf(M);
      const [vM, wM] = this.velocityOf(M);
      const g = M.magnet!.geom;
      const bound = Math.hypot(g.shape === 'cylinder' ? g.radius : Math.hypot(g.w, g.h) / 2, g.length / 2);
      let facesM: PoleFace[] | null = null;
      for (const C of conductors) {
        if (M.frozen && C.frozen) continue;
        const poseC = this.poseOf(C);
        const toC = (v: Vec3) => rotate(quatConj(poseC.q), v);
        const local = toC(sub(poseM.p, poseC.p));
        const hit = closestOnShape(C.shape, local);
        // the dissipation density falls as r^-6, its integral beyond six sizes is under 1%
        if (hit.d > 6 * bound) continue;
        // at rest relative to each other nothing is induced
        const [vC, wC] = this.velocityOf(C);
        const slip = sub(sub(vM, vC), cross(wC, sub(poseM.p, poseC.p)));
        if (length(slip) + length(sub(wM, wC)) * bound < EDDY_MIN_SPEED) continue;
        // mesh the conductor out to three times its distance from the magnet (a tube: +-3 radii along its axis)
        const mesh = this.conductorMesh(C, local, Math.max(2 * bound, 3 * (Math.max(0, hit.d) + bound)));
        if (!mesh) continue;
        // everything in C's frame: its mesh as built, the magnet's faces moved into it
        facesM ??= this.magnetFacesOf(M, poseM);
        const facesC = facesM.map((f) => ({ ...f, c: toC(sub(f.c, poseC.p)) as MVec3, o: toC(f.o) as MVec3, t1: toC(f.t1) as MVec3, t2: toC(f.t2) as MVec3 }));
        const Dl = eddyDamping(mesh, C.material.conductivity, field(facesC, mesh), rigidBasis(local));
        this.eddies.push({ S: M, C, D: rotate6(Dl, poseC.q) });
      }
    }
  }

  /** Inverse generalised mass (6 x 6) of a body about its centre, or zeros if it does not move. */
  private inverseMass6(r: BodyRec): number[] {
    const out = new Array<number>(36).fill(0);
    if (r.frozen || r.grabbed === 'creative' || !r.Iloc) return out;
    for (let i = 0; i < 3; i++) out[i * 6 + i] = 1 / r.mass;
    const Iinv = inverse3(worldInertia(r.Iloc, this.poseOf(r).q));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out[(3 + i) * 6 + 3 + j] = Iinv[i * 3 + j]!;
    return out;
  }

  /** Everything pushing on a body this (sub)step so far, as a wrench about its centre: its weight and the field forces. */
  private loadOf(r: BodyRec): number[] {
    if (r.frozen || r.grabbed === 'creative') return [0, 0, 0, 0, 0, 0];
    const f = r.body.GetAccumulatedForce(), t = r.body.GetAccumulatedTorque(), g = this.sim.gravity;
    return [f.GetX() + r.mass * g[0], f.GetY() + r.mass * g[1], f.GetZ() + r.mass * g[2], t.GetX(), t.GetY(), t.GetZ()];
  }

  /**
   * Apply the eddy drag for a (sub)step, implicitly at the velocity the step ends with (M4):
   * q' = (I + dt Minv D)^-1 (q + dt a), a the relative acceleration the rest of the load (weight, field forces) gives,
   * then drag -D q' on C and its reaction on S. q is C's velocity relative to S, at S's centre; Minv maps a wrench
   * there to that relative velocity. Called after every other field force of the step, so they are all in a.
   */
  private applyEddies(dt: number) {
    for (const e of this.eddies) {
      const pC = this.poseOf(e.C).p, pS = this.poseOf(e.S).p;
      const d = sub(pS, pC); // from C's centre to the reference point
      const [vC, wC] = this.velocityOf(e.C), [vS, wS] = this.velocityOf(e.S);
      const q = [...sub(add(vC, cross(wC, d)), vS), ...sub(wC, wS)];
      // C's own motion maps to q through J = [[I, -[d]x], [0, I]]
      const J = new Array<number>(36).fill(0);
      for (let i = 0; i < 6; i++) J[i * 6 + i] = 1;
      const dx = [[0, -d[2], d[1]], [d[2], 0, -d[0]], [-d[1], d[0], 0]];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) J[i * 6 + 3 + j] = -dx[i]![j]!;
      const MC = this.inverseMass6(e.C), MS = this.inverseMass6(e.S);
      const Minv = [...MS];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        let s = 0;
        for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) s += J[i * 6 + a]! * MC[a * 6 + b]! * J[j * 6 + b]!;
        Minv[i * 6 + j] += s;
      }
      // the relative velocity the rest of the load would give by the end of the step
      const LC = this.loadOf(e.C), LS = this.loadOf(e.S);
      const aC = [0, 1, 2, 3, 4, 5].map((i) => MC.slice(i * 6, i * 6 + 6).reduce((s, v, j) => s + v * LC[j]!, 0));
      const aS = [0, 1, 2, 3, 4, 5].map((i) => MS.slice(i * 6, i * 6 + 6).reduce((s, v, j) => s + v * LS[j]!, 0));
      const qp = q.map((v, i) => v + dt * (J.slice(i * 6, i * 6 + 6).reduce((s, x, j) => s + x * aC[j]!, 0) - aS[i]!));
      const A = new Array<number>(36).fill(0);
      for (let i = 0; i < 6; i++) {
        A[i * 6 + i] = 1;
        for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++) A[i * 6 + j] += dt * Minv[i * 6 + k]! * e.D[k * 6 + j]!;
      }
      const qn = solveDense(A, qp, 6);
      const W = [0, 1, 2, 3, 4, 5].map((i) => -e.D.slice(i * 6, i * 6 + 6).reduce((s, v, j) => s + v * qn[j]!, 0));
      const F: Vec3 = [W[0]!, W[1]!, W[2]!], T: Vec3 = [W[3]!, W[4]!, W[5]!];
      // the wrench acts about the reference point: on C that is T + d x F about its own centre
      this.forceBook = { kind: 'eddy', to: e.C };
      this.applyForceTorque(e.C, F, add(T, cross(d, F)));
      this.applyForceTorque(e.S, scale(F, -1), scale(T, -1));
      this.forceBook = null;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // magnetic latches
  //
  // M6 in docs/ARCHITECTURE.md. A small magnet stuck to another is pulled into it at thousands of g: resolved as a
  // force against a contact, every substep hands the contact solver an impulse many times the magnet's momentum. A
  // real stuck pair is simply rigid until the load on its contact is more than the magnet can hold, so once a
  // touching pair comes to rest it is latched: held rigidly, its magnetic wrench no longer applied but kept as what
  // the contact must balance. The latch's impulses are summed over each tick; that reaction minus the magnetic wrench
  // is what the contact would carry, and it holds only while that is admissible (M5): it presses (N > 0), friction
  // holds (shear <= mu N, twist <= mu N rbar), and the pressure stays within the footprint. Otherwise the latch lets
  // go, hands back what it carried beyond the admissible set, and the pair moves under its magnetic force again: it
  // is pulled off, slides, twists or tips over as the real one would.

  /** Remember a touching contact between a magnet and a steel part or another magnet (from the contact listener). */
  private recordMagnetTouch(b1: JoltNS.Body, b2: JoltNS.Body, man: JoltNS.ContactManifold, settings: JoltNS.ContactSettings) {
    if (!this.sim.magnetism) return;
    const r1 = this.recOf(b1), r2 = this.recOf(b2);
    if (!r1 || !r2 || !(r1.magnet || r2.magnet)) return;
    if (!(r1.magnet || r1.material.ferromagnetic) || !(r2.magnet || r2.material.ferromagnetic)) return;
    const nn = man.mWorldSpaceNormal;
    const n: Vec3 = [nn.GetX(), nn.GetY(), nn.GetZ()];
    const points: Vec3[] = [];
    let depth = 0;
    const count = man.mRelativeContactPointsOn1.size();
    for (let i = 0; i < count; i++) {
      const c1 = man.GetWorldSpaceContactPointOn1(i), c2 = man.GetWorldSpaceContactPointOn2(i);
      const p1: Vec3 = [c1.GetX(), c1.GetY(), c1.GetZ()], p2: Vec3 = [c2.GetX(), c2.GetY(), c2.GetZ()];
      // separation along the normal (negative when penetrating)
      const sep = dot(sub(p2, p1), n);
      if (sep > LATCH_TOUCH) continue;
      points.push(scale(add(p1, p2), 0.5));
      depth = Math.max(depth, -sep);
    }
    if (!points.length) return;
    this.touches.set(r1.id < r2.id ? `${r1.id}|${r2.id}` : `${r2.id}|${r1.id}`, { r1, n, points, depth, friction: settings.mCombinedFriction });
  }

  /** After the step: let go of latches whose contact cannot hold (M6), and latch pairs that have come to rest touching. */
  private updateLatches() {
    if (!this.sim.magnetism || !this.opts.magnetLatch) {
      for (const l of [...this.latches.values()]) this.unlatch(l);
      return;
    }
    for (const l of [...this.latches.values()]) this.checkLatch(l);
    if (!this.touches.size) return;
    for (const pr of this.magnetPairs()) {
      if (this.latches.has(pr.key) || pr.b.frozen || pr.b.grabbed === 'creative') continue;
      const t = this.touches.get(pr.a.id < pr.b.id ? `${pr.a.id}|${pr.b.id}` : `${pr.b.id}|${pr.a.id}`);
      if (!t) continue;
      const n = t.r1 === pr.a ? t.n : scale(t.n, -1); // from a towards b
      const c = meanOf(t.points);
      const [va, wa] = this.velocityOf(pr.a), [vb, wb] = this.velocityOf(pr.b);
      const ca = this.comOf(pr.a), cb = this.comOf(pr.b);
      // at rest in contact: slow at the footprint, and at the rim (all of it inelastic in this world anyway)
      const slip = sub(add(vb, cross(wb, sub(c, cb))), add(va, cross(wa, sub(c, ca))));
      const reach = pr.feature + length(sub(c, cb));
      if (length(slip) > LATCH_SPEED || length(sub(wb, wa)) * reach > LATCH_WOBBLE) continue;
      const seat = this.seatedContact(pr, n, t.points, t.depth);
      // the magnetic wrench on b as seated, about the footprint's centroid
      const w = pr.wrench(seat.dx, seat.rot);
      const at = add(this.poseOf(pr.b).p, seat.dx);
      const Fm: Vec3 = [w[0]!, w[1]!, w[2]!];
      const Tm = add([w[3]!, w[4]!, w[5]!] as Vec3, cross(sub(at, seat.c), Fm));
      // latch only what the contact can carry through the first tick: b's weight, the pull, and the impulse that
      // stops b's residual motion there (an inelastic impact, bound by the same contact laws)
      const arrest = this.arrestImpulse(pr.a, pr.b, seat.c);
      const weight = scale(this.sim.gravity, pr.b.mass);
      const FL = sub(scale(arrest.P, 1 / TICK), weight);
      const TL = sub(scale(arrest.L, 1 / TICK), cross(sub(at, seat.c), weight));
      const rbar = meanRadius(seat.points, seat.c, seat.n);
      if (this.contactExcess(FL, TL, Fm, Tm, seat.c, seat.n, seat.points, t.friction, rbar)) continue;
      this.latch(pr, seat, Fm, Tm, t.friction, rbar);
    }
  }

  /** After every Jolt step of the tick: add each latch's constraint impulses on b (a's frame, about the centroid). */
  private accumulateLatches() {
    for (const l of this.latches.values()) {
      const pa = this.poseOf(l.a), pb = this.poseOf(l.b);
      const lp = l.typed.GetTotalLambdaPosition(), lr = l.typed.GetTotalLambdaRotation();
      const P: Vec3 = [lp.GetX(), lp.GetY(), lp.GetZ()], L: Vec3 = [lr.GetX(), lr.GetY(), lr.GetZ()];
      // the point impulse acts at the constraint's anchor on b, which the seat may still be bringing to the centroid
      const c = add(pa.p, rotate(pa.q, l.c)), anchor = add(pb.p, rotate(pb.q, l.anchorB));
      const back = quatConj(pa.q);
      l.impF = add(l.impF, rotate(back, P));
      l.impT = add(l.impT, rotate(back, add(L, cross(sub(anchor, c), P))));
    }
  }

  /**
   * Once a tick (M6): the latch's tick-average reaction W_L on b, less the magnetic wrench it stands for, is what the
   * contact carries. If that is not admissible (M5) the latch opens and hands back what it carried beyond the
   * admissible set: -dW TICK on b at the centroid, +dW TICK on a.
   */
  private checkLatch(l: MagnetLatch) {
    const pose = this.poseOf(l.a);
    const w = (v: Vec3) => rotate(pose.q, v);
    const c = add(pose.p, w(l.c));
    const FL = scale(w(l.impF), 1 / TICK), TL = scale(w(l.impT), 1 / TICK);
    l.impF = [0, 0, 0];
    l.impT = [0, 0, 0];
    const ex = this.contactExcess(FL, TL, w(l.Fm), w(l.Tm), c, w(l.n), l.points.map((p) => add(pose.p, w(p))), l.mu, l.rbar);
    if (!ex) return;
    this.unlatch(l);
    this.addImpulseAt(l.b, scale(ex.dF, -TICK), scale(ex.dM, -TICK), c);
    this.addImpulseAt(l.a, scale(ex.dF, TICK), scale(ex.dM, TICK), c);
  }

  /** An impulse P acting at `at`, plus an angular impulse L, on a free body. */
  private addImpulseAt(r: BodyRec, P: Vec3, L: Vec3, at: Vec3) {
    if (r.frozen || r.grabbed === 'creative') return;
    const id = r.body.GetID();
    this.v1.Set(...P);
    this.r1.Set(...at);
    this.bi.AddImpulse(id, this.v1, this.r1);
    this.v2.Set(...L);
    this.bi.AddAngularImpulse(id, this.v2);
    this.bi.ActivateBody(id);
  }

  private comOf(r: BodyRec): Vec3 {
    const p = r.body.GetCenterOfMassPosition();
    return [p.GetX(), p.GetY(), p.GetZ()];
  }

  /**
   * The impulse on b (P at c, and an angular impulse L) that brings b to rest relative to a there, as the latch's
   * rigid constraint does in its first substep: K [P; L] = -(relative velocity), K the pair's 6 x 6 inverse mass
   * at c.
   */
  private arrestImpulse(a: BodyRec, b: BodyRec, c: Vec3): { P: Vec3; L: Vec3 } {
    const [va, wa] = this.velocityOf(a), [vb, wb] = this.velocityOf(b);
    const ca = this.comOf(a), cb = this.comOf(b);
    const rel = [...sub(add(vb, cross(wb, sub(c, cb))), add(va, cross(wa, sub(c, ca)))), ...sub(wb, wa)];
    const x = solveDense(this.pairInverseMass(a, b, c), rel.map((v) => -v), 6);
    return { P: [x[0]!, x[1]!, x[2]!], L: [x[3]!, x[4]!, x[5]!] };
  }

  /** Velocity change of body r at point c, and its angular velocity change, under an impulse P at `at` and L. */
  private impulseResponse(r: BodyRec, c: Vec3, P: Vec3, L: Vec3, at: Vec3): number[] {
    const M = this.inverseMass6(r), com = this.comOf(r);
    const J = add(L, cross(sub(at, com), P));
    const dv: Vec3 = [M[0]! * P[0], M[7]! * P[1], M[14]! * P[2]];
    const dw = [0, 1, 2].map((i) => [0, 1, 2].reduce((s, j) => s + M[(3 + i) * 6 + 3 + j]! * J[j]!, 0)) as Vec3;
    return [...add(dv, cross(dw, sub(c, com))), ...dw];
  }

  /** The pair's 6 x 6 inverse mass at c: b's velocity change relative to a there, per impulse on b (and its opposite on a). */
  private pairInverseMass(a: BodyRec, b: BodyRec, c: Vec3): number[] {
    const K = new Array<number>(36).fill(0);
    for (let i = 0; i < 6; i++) {
      const P: Vec3 = [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0], L: Vec3 = [i === 3 ? 1 : 0, i === 4 ? 1 : 0, i === 5 ? 1 : 0];
      const db = this.impulseResponse(b, c, P, L, c), da = this.impulseResponse(a, c, P, L, c);
      for (let k = 0; k < 6; k++) K[k * 6 + i] = db[k]! + da[k]!; // a takes the opposite impulse: its change subtracts
    }
    return K;
  }

  /**
   * A knock (an impulse op) on a latched body acts at an instant, before the pull has supplied anything (M6). The
   * latch takes it only if the contact could, as an impact: the impulse the latch needs at c must press, within
   * friction and the footprint of its own normal impulse. Otherwise the latch opens first, and the continuous
   * physics plays the knock out.
   */
  private knockLatch(l: MagnetLatch, r: BodyRec, point: Vec3, imp: Vec3) {
    const pose = this.poseOf(l.a);
    const w = (v: Vec3) => rotate(pose.q, v);
    const c = add(pose.p, w(l.c));
    const d = this.impulseResponse(r, c, imp, [0, 0, 0], point).map((v) => (r === l.b ? v : -v));
    const x = solveDense(this.pairInverseMass(l.a, l.b, c), d.map((v) => -v), 6);
    const zero: Vec3 = [0, 0, 0];
    const ex = this.contactExcess([x[0]!, x[1]!, x[2]!], [x[3]!, x[4]!, x[5]!], zero, zero, c, w(l.n), l.points.map((p) => add(pose.p, w(p))), l.mu, l.rbar);
    if (ex) this.unlatch(l);
  }

  /**
   * Where a touching magnet is held (M6): where the real one comes to rest, not inside a (the contact solver leaves
   * bodies overlapping by up to its slop). A pole face within SEAT_ANGLE of flush with the face it touches (a's pole
   * face, or the steel's surface), turned flat by the torque about its lowest touching rim within a tick, is seated:
   * turned flat about that rim onto the face, as the real magnet clacks down; the contact is then the overlap of the
   * two faces. Otherwise (a magnet on its side, against an edge, or held tilted) it is held as it touches, over its
   * touching points, moved out of any overlap along the normal. Returns b's move to that pose (translation dx,
   * rotation rot about its centre; q the same rotation), the contact normal (a to b), the footprint and its centroid.
   */
  private seatedContact(pr: MagnetPair, jn: Vec3, touching: Vec3[], depth: number) {
    // held where it touches: moved out of any overlap the solver left, along the contact normal
    const none = { dx: scale(jn, depth), rot: [0, 0, 0] as Vec3, q: [0, 0, 0, 1] as Quat, n: jn, c: meanOf(touching), points: touching };
    const geomB = pr.b.magnet?.geom;
    if (!geomB || dot(jn, pr.face.n) < Math.cos(SEAT_ANGLE * 1.5)) return none;
    const n = pr.face.n;
    const poseB = this.poseOf(pr.b);
    const axis = rotate(poseB.q, [0, 1, 0]);
    const o = dot(axis, n) < 0 ? axis : scale(axis, -1); // b's pole face turned towards a
    const down = scale(n, -1);
    const theta = Math.acos(Math.max(-1, Math.min(1, dot(o, down))));
    if (theta > SEAT_ANGLE) return none;
    const k = cross(o, down);
    const kl = length(k);
    const rot: Vec3 = kl > 1e-9 ? scale(k, theta / kl) : [0, 0, 0];
    // the rim it pivots on: the touching points furthest downhill across b's face
    const faceNow = add(poseB.p, scale(o, geomB.length / 2));
    const hill = sub(down, scale(o, dot(down, o)));
    const u = length(hill) > 1e-12 ? normalize(hill) : ([0, 0, 0] as Vec3);
    const far = Math.max(...touching.map((p) => dot(sub(p, faceNow), u)));
    const size = geomB.shape === 'cylinder' ? geomB.radius : Math.max(geomB.w, geomB.h) / 2;
    const pivot = meanOf(touching.filter((p) => dot(sub(p, faceNow), u) >= far - 0.1 * size));
    if (theta > SEAT_FLUSH && !this.swingsFlat(pr, pivot, rot, theta)) return none;
    const q = quatFromRotationVector(rot);
    // turn about the rim, then lie on the face plane (no gap, no penetration)
    let centre = add(pivot, rotate(q, sub(poseB.p, pivot)));
    const faceB = add(centre, scale(down, geomB.length / 2));
    centre = add(centre, scale(n, dot(sub(pr.face.p, faceB), n)));
    const faceC = add(centre, scale(down, geomB.length / 2));
    // footprint in the face plane: b's face, clipped to a's pole face when a is a magnet
    const [e1, e2] = tangents(n);
    const toPlane = (p: Vec3): [number, number] => [dot(sub(p, faceC), e1), dot(sub(p, faceC), e2)];
    const outline = (q0: Quat, geom: MagnetGeometry, face: Vec3): [number, number][] => {
      if (geom.shape === 'cylinder') {
        const fc = toPlane(face);
        // 32 sides: reach within 0.5% of the rim's in every direction, mean radius within 0.4% of 2R/3
        return Array.from({ length: 32 }, (_, i) => [fc[0] + geom.radius * Math.cos((i * Math.PI) / 16), fc[1] + geom.radius * Math.sin((i * Math.PI) / 16)] as [number, number]);
      }
      const t1 = rotate(q0, [1, 0, 0]), t2 = rotate(q0, [0, 0, 1]);
      return [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([uu, vv]) => toPlane(add(face, add(scale(t1, (uu! * geom.w) / 2), scale(t2, (vv! * geom.h) / 2)))));
    };
    let poly = ccw(outline(quatMul(q, poseB.q), geomB, faceC));
    const geomA = pr.a.magnet?.geom;
    if (geomA) poly = clipConvex(poly, ccw(outline(this.poseOf(pr.a).q, geomA, pr.face.p)));
    const dx = sub(centre, poseB.p);
    if (poly.length < 3) return { ...none, dx, rot, q, n };
    const points = poly.map(([uu, vv]) => add(faceC, add(scale(e1, uu), scale(e2, vv))));
    return { dx, rot, q, n, c: polygonCentroid(poly, faceC, e1, e2), points };
  }

  /**
   * Does the torque about the rim, from the pull and b's weight, turn b flat (rotation `rot` about `pivot`), at the
   * tilt it has and at half of it, and within a tick: sqrt(2 theta I_p / tau) <= TICK?
   */
  private swingsFlat(pr: MagnetPair, pivot: Vec3, rot: Vec3, theta: number): boolean {
    const B = pr.b;
    if (!B.Iloc) return false;
    const e = normalize(rot);
    const cb = this.poseOf(B).p;
    const weight = scale(this.sim.gravity, B.mass);
    const torque = (f: number) => {
      // b turned by f of the way flat about the pivot
      const turn = scale(rot, f);
      const at = add(pivot, rotate(quatFromRotationVector(turn), sub(cb, pivot)));
      const w = pr.wrench(sub(at, cb), turn);
      const F = add([w[0]!, w[1]!, w[2]!] as Vec3, weight);
      return dot(add([w[3]!, w[4]!, w[5]!] as Vec3, cross(sub(at, pivot), F)), e);
    };
    const tau = Math.min(torque(0), torque(0.5));
    if (!(tau > 0)) return false;
    const r = sub(cb, pivot), rp = sub(r, scale(e, dot(r, e)));
    const Ip = dot(e, mat3Vec(worldInertia(B.Iloc, this.poseOf(B).q), e)) + B.mass * dot(rp, rp);
    return Math.sqrt((2 * theta * Ip) / tau) <= TICK;
  }

  /**
   * What a contact cannot carry of what a latch holds (M5). FL, TL: the latch's reaction on b (TL about the
   * centroid c); Fm, Tm: the magnetic wrench on b (Tm about c); n from a to b; footprint points, and their mean
   * distance rbar from c. The contact carries Wc = WL - Wm; returns null if that is admissible, otherwise why not and
   * the excess dW = Wc - proj(Wc), projected component-wise onto the admissible set.
   */
  private contactExcess(FL: Vec3, TL: Vec3, Fm: Vec3, Tm: Vec3, c: Vec3, n: Vec3, points: Vec3[], mu: number, rbar: number): { why: string; dF: Vec3; dM: Vec3 } | null {
    const Fc = sub(FL, Fm), Mc = sub(TL, Tm);
    const N = dot(Fc, n), Ns = Math.max(N, 0);
    const Ft = sub(Fc, scale(n, N));
    const twist = dot(Mc, n);
    // the pressure's resultant acts at c + d with d = n x Mt / N, which must lie within the footprint
    const Mt = sub(Mc, scale(n, twist));
    const m = length(Mt);
    const reach = m > 0 ? Math.max(0, ...points.map((p) => dot(sub(p, c), cross(n, scale(Mt, 1 / m))))) : 0;
    const why = N <= 0 ? 'pulled off' : length(Ft) > mu * N ? 'slid' : Math.abs(twist) > mu * N * rbar ? 'twisted' : m > N * reach ? 'tipped' : null;
    if (!why) return null;
    const clip = (v: Vec3, cap: number) => { const l = length(v); return l > cap ? scale(v, cap / l) : v; };
    const tw = Math.max(-mu * Ns * rbar, Math.min(mu * Ns * rbar, twist));
    const proj = { F: add(scale(n, Ns), clip(Ft, mu * Ns)), M: add(scale(n, tw), clip(Mt, Ns * reach)) };
    return { why, dF: sub(Fc, proj.F), dM: sub(Mc, proj.M) };
  }

  /**
   * Hold b to a at its seated pose: the constraint's frame on a is the contact frame, and its frame on b is where
   * that frame sits on b now, so the solver turns b the last few degrees flat (a position correction, no energy).
   * Everything the latch checks is kept in a's frame, as seated.
   */
  private latch(pr: MagnetPair, seat: { dx: Vec3; q: Quat; n: Vec3; c: Vec3; points: Vec3[] }, Fm: Vec3, Tm: Vec3, mu: number, rbar: number) {
    const J = this.J;
    const back = quatConj(seat.q);
    const poseB = this.poseOf(pr.b), pb = poseB.p;
    // the point of b, as it is now, that the seating brings to the contact centroid
    const onB = add(pb, rotate(back, sub(seat.c, add(pb, seat.dx))));
    const s = new J.SixDOFConstraintSettings();
    s.mPosition1 = this.R(seat.c);
    s.mAxisX1 = this.V([1, 0, 0]);
    s.mAxisY1 = this.V([0, 1, 0]);
    s.mPosition2 = this.R(onB);
    s.mAxisX2 = this.V(rotate(back, [1, 0, 0]));
    s.mAxisY2 = this.V(rotate(back, [0, 1, 0]));
    for (let a = 0; a < 6; a++) s.MakeFixedAxis(a as JoltNS.SixDOFConstraintSettings_EAxis);
    s.mNumVelocityStepsOverride = LATCH_VELOCITY_STEPS;
    const constraint = s.Create(pr.a.body, pr.b.body);
    J.destroy(s);
    this.ps.AddConstraint(constraint);
    const qa = quatConj(this.poseOf(pr.a).q), pa = this.poseOf(pr.a).p;
    const toA = (v: Vec3) => rotate(qa, v);
    this.latches.set(pr.key, {
      key: pr.key, a: pr.a, b: pr.b, constraint, typed: J.castObject(constraint, J.SixDOFConstraint),
      pairKey: this.holdPair(pr.a.subgroup, pr.b.subgroup),
      c: toA(sub(seat.c, pa)), n: toA(seat.n), points: seat.points.map((p) => toA(sub(p, pa))), Fm: toA(Fm), Tm: toA(Tm), mu, rbar,
      anchorB: rotate(quatConj(poseB.q), sub(onB, pb)), impF: [0, 0, 0], impT: [0, 0, 0],
    });
    this.bi.ActivateBody(pr.b.body.GetID());
  }

  private unlatch(l: MagnetLatch) {
    this.ps.RemoveConstraint(l.constraint);
    this.releasePair(l.pairKey);
    this.latches.delete(l.key);
    this.bi.ActivateBody(l.b.body.GetID());
    if (!l.a.frozen) this.bi.ActivateBody(l.a.body.GetID());
  }

  /** Magnetic latches holding (tests, stats). */
  magnetLatchCount() {
    return this.latches.size;
  }

  private applyForceTorque(r: BodyRec, F: Vec3, T: Vec3) {
    if (r.frozen || r.grabbed === 'creative') return;
    if (this.forceBook) {
      const [v, w] = this.velocityOf(r);
      const work = (dot(F, v) + dot(T, w)) * this.subDt;
      const fb = this.forceBook;
      // induced currents only ever take energy out, as heat in the conductor they flow in
      if (fb.kind === 'eddy') { this.book.heat.eddy -= work; this.warmPart(fb.to ?? r, -work); } else this.book.work[fb.kind] += work;
    }
    this.v1.Set(...F);
    this.v2.Set(...T);
    this.bi.AddForceAndTorque(r.body.GetID(), this.v1, this.v2, this.J.EActivation_Activate);
  }

  private applyFluids(dt: number) {
    if (this.sim.fluids.length === 0) return;
    const g = this.ps.GetGravity();
    this.v2.Set(0, 0, 0);
    for (const r of this.bodies.values()) {
      if (r.frozen || r.grabbed === 'creative' || !r.body.IsActive()) continue;
      const bb = r.body.GetWorldSpaceBounds();
      const mn = bb.mMin, mx = bb.mMax;
      let wet = false;
      for (const f of this.sim.fluids) {
        if (mx.GetX() < f.min[0] || mn.GetX() > f.max[0] || mx.GetZ() < f.min[2] || mn.GetZ() > f.max[2]) continue;
        if (mn.GetY() > f.max[1] || mx.GetY() < f.min[1]) continue;
        const cx = Math.min(Math.max((mn.GetX() + mx.GetX()) / 2, f.min[0]), f.max[0]);
        const cz = Math.min(Math.max((mn.GetZ() + mx.GetZ()) / 2, f.min[2]), f.max[2]);
        this.r1.Set(cx, f.max[1], cz);
        this.v1.Set(0, 1, 0);
        const bodyDensity = r.mass / r.volume;
        const wetNow = this.bi.ApplyBuoyancyImpulse(r.body.GetID(), this.r1, this.v1, f.density / bodyDensity, 0.5, 0.05, this.v2, g, dt);
        if (wetNow) {
          this.waterDrag(r, f.density, Math.min(1, Math.max(0, (f.max[1] - mn.GetY()) / Math.max(1e-6, mx.GetY() - mn.GetY()))), dt);
          wet = true;
          if (!r.inFluid) {
            const vy = this.bi.GetLinearVelocity(r.body.GetID()).GetY();
            if (vy < -0.8) this.events.push({ type: 'splash', part: r.id, point: [cx, f.max[1], cz], speed: -vy, size: r.dims.length });
          }
        }
      }
      r.inFluid = wet;
    }
  }

  /**
   * Water presses on each face as the part moves through it, across that face: along each of the part's own axes,
   * −½ ρ C_d A |v| v with A the face square to that axis and v the velocity along it, for the share of it under
   * water. So a plate moving obliquely is pushed mostly square to its face, not straight back: that is what lets an
   * undulating body swim (resistive force theory), each segment pushing the water back and the body forward as a wave
   * runs down it. The force can at most stop the part in a step, never reverse it.
   */
  private waterDrag(r: BodyRec, rho: number, wetShare: number, dt: number) {
    if (wetShare <= 0) return;
    const lv = r.body.GetLinearVelocity();
    const v: Vec3 = [lv.GetX(), lv.GetY(), lv.GetZ()];
    const speed = length(v);
    if (speed < 1e-4) return;
    const q = r.body.GetRotation();
    const qq: Quat = [q.GetX(), q.GetY(), q.GetZ(), q.GetW()];
    const vl = rotate(quatConj(qq), v);
    const k = 0.5 * rho * r.kind.dragCd * wetShare;
    const Fl: Vec3 = [0, 1, 2].map((i) => -k * r.faceAreas[i]! * Math.abs(vl[i]!) * vl[i]!) as Vec3;
    let F = rotate(qq, Fl);
    const cap = (0.9 * r.mass * speed) / dt, mag = length(F);
    if (mag > cap) F = scale(F, cap / mag);
    // its work is heat in the water (booked with the air's: the fluids' drag)
    this.book.heat.air -= dot(F, v) * dt;
    this.v1.Set(...F);
    this.bi.AddForce(r.body.GetID(), this.v1, this.J.EActivation_Activate);
  }

  private applyAirDrag() {
    const rho = this.sim.airDensity;
    for (const r of this.bodies.values()) {
      if (r.frozen || r.grabbed === 'creative' || r.inFluid || !r.body.IsActive()) continue;
      const lv = r.body.GetLinearVelocity();
      const v: Vec3 = [lv.GetX(), lv.GetY(), lv.GetZ()];
      const speed = length(v);
      if (speed < 1) continue;
      const q = r.body.GetRotation();
      const qq: Quat = [q.GetX(), q.GetY(), q.GetZ(), q.GetW()];
      const vl = rotate(quatConj(qq), scale(v, 1 / speed));
      const A = Math.abs(vl[0]) * r.faceAreas[0] + Math.abs(vl[1]) * r.faceAreas[1] + Math.abs(vl[2]) * r.faceAreas[2];
      const F = scale(v, -0.5 * rho * r.kind.dragCd * A * speed);
      // drag's work is heat in the air the part pushes through
      this.book.heat.air -= dot(F, v) * this.subDt;
      this.v1.Set(...F);
      this.bi.AddForce(r.body.GetID(), this.v1, this.J.EActivation_Activate);
    }
  }

  private applyBands() {
    for (const c of this.conns.values()) {
      if (c.kind.model !== 'band' || c.status === 'broken') continue;
      const sp = c.derived.spring!;
      const wa = this.anchorWorld(c);
      const wb = this.anchorWorldB(c);
      const dvec = sub(wb.p, wa.p);
      const L = length(dvec);
      const stretch = L / Math.max(c.bandRest, 1e-4);
      c.load.extent = L;
      if (stretch <= 1) { c.load.axial = 0; continue; }
      let F = neoHookeanBandForce(sp.bandG ?? 5e5, sp.bandArea ?? 1e-5, stretch);
      // hysteresis: extra resistance while stretching, less while relaxing (rubber loss ~10%)
      const va = this.pointVelocity(c.a, wa.p);
      const vb = c.b ? this.pointVelocity(c.b, wb.p) : [0, 0, 0] as Vec3;
      const dir = scale(dvec, 1 / L);
      const vrel = dot(sub(vb, va), dir);
      const hysteresis = F * 0.1 * Math.tanh(vrel * 4);
      F += hysteresis;
      // the rubber's own loss: the extra force against stretching, and the lesser one back, do net work as heat
      this.book.heat.damping += hysteresis * vrel * this.subDt;
      c.load.axial = F;
      const f = scale(dir, F);
      if (!c.a.frozen) { this.v1.Set(...f); this.r1.Set(...wa.p); this.bi.AddForce(c.a.body.GetID(), this.v1, this.r1, this.J.EActivation_Activate); }
      if (c.b && !c.b.frozen) { this.v1.Set(-f[0], -f[1], -f[2]); this.r1.Set(...wb.p); this.bi.AddForce(c.b.body.GetID(), this.v1, this.r1, this.J.EActivation_Activate); }
    }
  }

  private pointVelocity(r: BodyRec, p: Vec3): Vec3 {
    this.r1.Set(...p);
    const v = this.bi.GetPointVelocity(r.body.GetID(), this.r1);
    return [v.GetX(), v.GetY(), v.GetZ()];
  }

  /** Motors, servos, eddy brakes and load-dependent bearing friction. */
  private driveJoints() {
    this.solveCircuits();
    for (const c of this.conns.values()) {
      if (c.status === 'broken' || c.kind.model !== 'revolute' || !c.typed) continue;
      const rv = c.derived.revolute;
      if (!rv) continue;
      const h = c.typed as JoltNS.HingeConstraint;
      const axis = rotate(this.anchorWorld(c).q, [0, 1, 0]);
      const wa = this.bi.GetAngularVelocity(c.a.body.GetID());
      let wrel = -dot([wa.GetX(), wa.GetY(), wa.GetZ()], axis);
      if (c.b) {
        const wb = this.bi.GetAngularVelocity(c.b.body.GetID());
        wrel += dot([wb.GetX(), wb.GetY(), wb.GetZ()], axis);
      }
      if (rv.torsionSpring && c.sizedAt !== this.topology) {
        c.sizedAt = this.topology;
        h.GetMotorSettings().mSpringSettings.mDamping = 2 * 0.05 * Math.sqrt(rv.torsionSpring.k * this.ownAxisInertia(c));
      }
      if (rv.motor) {
        // what the motor can give at this speed, on what its battery gives it (solveCircuits)
        const d = this.drives.get(c.id);
        const sgn = this.hingeSign(c);
        if (!d) { h.SetTargetAngularVelocity(0); const ms = h.GetMotorSettings(); ms.mMinTorqueLimit = 0; ms.mMaxTorqueLimit = 0; }
        else {
          const N = d.gear?.ratio ?? 1;
          const V = d.battery ? this.cells.get(d.battery)?.V ?? 0 : 0;
          // driving, it runs toward its no-load speed at the voltage applied; otherwise it only drags
          const push = d.I !== 0 && V > 0;
          const Va = d.u * V - Math.sign(d.u) * d.model.I0 * (windingR(d.model, d.heat.winding) + d.wire);
          const target = push && Va * d.u > 0 ? Va / d.model.Kt / N : 0;
          const tau = this.driveTorque(d, d.w);
          h.SetTargetAngularVelocity(sgn * target);
          const ms = h.GetMotorSettings();
          ms.mMinTorqueLimit = -tau;
          ms.mMaxTorqueLimit = tau;
          if (push) {
            this.bi.ActivateBody(c.a.body.GetID());
            if (c.b) this.bi.ActivateBody(c.b.body.GetID());
          }
        }
      } else if (rv.servo) {
        if (c.sizedAt !== this.topology) {
          // the 6 Hz loop on the inertia it really turns, re-sized whenever what is joined to what changes
          c.sizedAt = this.topology;
          const I = this.ownAxisInertia(c), w = 2 * Math.PI * 6;
          const ss = h.GetMotorSettings().mSpringSettings;
          ss.mStiffness = I * w * w;
          ss.mDamping = 2 * I * w;
        }
        // its own rhythm, or its control channel
        const u = rv.servo.rhythm > 0 ? Math.sin(2 * Math.PI * rv.servo.rhythm * this.time + rv.servo.phase) : Math.max(-1, Math.min(1, this.channels[rv.servo.channel] ?? 0));
        h.SetTargetAngle(u * rv.servo.range);
        if (Math.abs(u) > 0.01 || rv.servo.rhythm > 0) { this.bi.ActivateBody(c.a.body.GetID()); if (c.b) this.bi.ActivateBody(c.b.body.GetID()); }
      } else if (rv.eddy) {
        // Viscous brake realised implicitly: a velocity motor to zero whose torque budget removes exactly the
        // momentum an exponential decay w(t) = w0 exp(-c t / I) would over this tick (stable for any c / I).
        h.SetTargetAngularVelocity(0);
        const ms = h.GetMotorSettings();
        const I = this.ownAxisInertia(c);
        const lim = Number.isFinite(I) ? ((I / TICK) * (1 - Math.exp((-rv.eddy.c * TICK) / I))) * Math.abs(wrel) : rv.eddy.c * Math.abs(wrel);
        ms.mMinTorqueLimit = -lim;
        ms.mMaxTorqueLimit = lim;
      }
      if (rv.bearingMu > 0) {
        const tf = 0.5 * rv.bearingMu * c.lastPositionLambda * rv.boreDiameter + rv.frictionTorque;
        h.SetMaxFrictionTorque(tf);
        // a bearing turning against its friction warms both sides of it
        if (wrel !== 0) this.book.sources.push({ a: c.a, b: c.b, w: tf * Math.abs(wrel) * this.subDt, cause: 'friction' });
      }
      c.load.extent = h.GetCurrentAngle();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // stepping

  private cachePreStepVelocities() {
    this.preStep.clear();
    for (const r of this.bodies.values()) {
      if (r.frozen || !r.body.IsActive()) continue;
      const lv = r.body.GetLinearVelocity(), av = r.body.GetAngularVelocity();
      this.preStep.set(r.body.GetID().GetIndexAndSequenceNumber(), [[lv.GetX(), lv.GetY(), lv.GetZ()], [av.GetX(), av.GetY(), av.GetZ()]]);
    }
  }

  /** A body's velocity at a point as the step began (before this step's forces): 0 for anything that was at rest. */
  private preStepPointVelocity(b: JoltNS.Body, p: Vec3): Vec3 {
    const v = this.preStep.get(b.GetID().GetIndexAndSequenceNumber());
    if (!v) return [0, 0, 0];
    const com = b.GetCenterOfMassPosition();
    const wr = cross(v[1], [p[0] - com.GetX(), p[1] - com.GetY(), p[2] - com.GetZ()]);
    return [v[0][0] + wr[0], v[0][1] + wr[1], v[0][2] + wr[2]];
  }

  /**
   * How fast two bodies were closing at a contact before this step's forces acted, m/s (positive = closing).
   * Restitution belongs to an impact: a body pressed onto a surface by a force (a magnet, strong gravity, a hand)
   * picks up closing speed within the step, and treating that as an impact bounces it off before it ever touches.
   */
  private impactSpeed(b1: JoltNS.Body, b2: JoltNS.Body, man: JoltNS.ContactManifold): number {
    const n = man.mWorldSpaceNormal;
    const cp = man.GetWorldSpaceContactPointOn1(0);
    const point: Vec3 = [cp.GetX(), cp.GetY(), cp.GetZ()];
    const rel = sub(this.preStepPointVelocity(b2, point), this.preStepPointVelocity(b1, point));
    return -(rel[0] * n.GetX() + rel[1] * n.GetY() + rel[2] * n.GetZ());
  }

  private substepsNeeded(): number {
    let n = 1;
    for (const c of this.conns.values()) {
      if (c.status === 'broken' || c.springRigid || c.omega <= 0) continue;
      if (!c.a.body.IsActive() && !(c.b && c.b.body.IsActive())) continue;
      n = Math.max(n, Math.ceil((c.omega * TICK) / SUBSTEP_OMEGA_DT));
    }
    for (const c of this.conns.values()) {
      if (c.kind.model !== 'band' || c.status === 'broken') continue;
      const k = (3 * (c.derived.spring?.bandG ?? 5e5) * (c.derived.spring?.bandArea ?? 1e-5)) / Math.max(c.bandRest, 1e-3);
      n = Math.max(n, Math.ceil((Math.sqrt(k / this.effMass(c)) * TICK) / SUBSTEP_OMEGA_DT));
    }
    // a stop is only caught once passed (Jolt's limits are not speculative): a joint closing fast on one is stepped
    // finely enough that it can't run through it by more than a hair, as no real end stop allows
    for (const c of this.conns.values()) {
      if (c.status === 'broken' || !c.typed || !c.b || (!c.a.body.IsActive() && !c.b.body.IsActive())) continue;
      const limits = c.kind.model === 'revolute' ? c.derived.revolute?.limits : c.kind.model === 'prismatic' ? c.derived.prismatic?.limits : null;
      if (!limits) continue;
      const axis = rotate(this.anchorWorld(c).q, [0, 1, 0]);
      let at: number, rate: number, hair: number;
      if (c.kind.model === 'revolute') {
        at = (c.typed as JoltNS.HingeConstraint).GetCurrentAngle();
        rate = dot(sub(this.velocityOf(c.b)[1], this.velocityOf(c.a)[1]), axis);
        hair = STOP_TURN;
      } else {
        at = (c.typed as JoltNS.SliderConstraint).GetCurrentPosition();
        rate = dot(sub(this.pointVelocity(c.b, this.anchorWorldB(c).p), this.pointVelocity(c.a, this.anchorWorld(c).p)), axis);
        hair = STOP_TRAVEL;
      }
      const gap = rate > 0 ? limits[1] - at : at - limits[0];
      const travel = Math.abs(rate) * TICK;
      if (travel > hair && gap < travel + hair) n = Math.max(n, Math.ceil(travel / hair));
    }
    return Math.min(MAX_SUBSTEPS, n);
  }

  /** A control channel's level for an on/off consumer, 0 to 1. */
  private channelLevel(ch: string) {
    return Math.max(0, Math.min(1, this.channels[ch] ?? 0));
  }

  /**
   * Electromagnets follow their switch. A latch holds with the pull it was made at, so one made at another strength
   * lets go; it latches again at this strength if that still holds.
   */
  private driveMagnets() {
    for (const r of this.bodies.values()) {
      const m = r.magnet;
      if (!m?.drive) continue;
      const Br = m.rated * this.channelLevel(m.drive);
      if (Br === m.Br) continue;
      m.Br = Br;
      this.magnetRest.clear();
      for (const l of [...this.latches.values()]) if (l.a === r || l.b === r) this.unlatch(l);
      this.bi.ActivateBody(r.body.GetID());
    }
  }

  /** Advance one fixed tick. */
  step(): StepResult {
    const t0 = performance.now();
    const dt = TICK;
    [this.restingOn, this.touchingNow] = [this.touchingNow, this.restingOn];
    this.touchingNow.clear();
    const sec = (this.sections = { magnets: 0, jolt: 0, assemblies: 0, joints: 0, energy: 0 });
    let tm = performance.now();
    const lap = (k: keyof typeof sec) => { const n = performance.now(); sec[k] += n - tm; tm = n; };
    this.driveMagnets();
    // Fields act as forces over a step. Magnets close together move faster than a tick can follow, so then the
    // tick is divided and every field recomputed for each part of it.
    const km = this.applyMagnets(dt, true);
    this.estimateEddies();
    const n = this.substepsNeeded();
    let k = km, per = Math.max(1, Math.ceil(n / km));
    // a latch reads every impulse its constraint gives in the tick (M6): one Jolt step per substep then
    if (this.latches.size && per > 1) { k *= per; per = 1; }
    this.lastSubsteps = k * per;
    lap('magnets');
    this.prepareClusters();
    this.keepUnbalancedAwake();
    this.touches.clear();
    lap('assemblies');
    const start = this.openBooks();
    lap('energy');
    for (let s = 0; s < k; s++) {
      this.subDt = dt / k;
      this.magnetSub = s;
      this.applyFields(dt / k);
      lap('magnets');
      this.cachePreStepVelocities();
      this.containFaults();
      this.jolt.Step(dt / k, per);
      lap('jolt');
      this.accumulateLatches();
      this.bookMotors(per);
      lap('joints');
    }
    this.subDt = dt;
    this.solveAssemblies(dt);
    this.settleDrives(dt);
    this.containFaults();
    lap('assemblies');
    this.updateLatches();
    lap('magnets');
    this.time += dt;
    this.ticks++;
    // constraint impulses are those of the last substep
    this.evaluateConnections(dt, this.lastSubsteps);
    this.watchJoints();
    this.evaluateBonds(this.lastSubsteps / dt);
    lap('joints');
    this.closeBooks(start, dt);
    lap('energy');
    const stepMs = performance.now() - t0;
    return this.collect(stepMs);
  }

  // ---------------------------------------------------------------------------------------------
  // energy: every joule held, put in and turned to heat (energy.ts)

  /** What the moving world holds now: kinetic and potential energy of every free body, elastic in springs and bands. */
  private storedNow() {
    const g = this.sim.gravity;
    let kinetic = 0, potential = 0, spin = 0, elastic = 0;
    for (const r of this.bodies.values()) {
      if (r.frozen || r.grabbed === 'creative' || !r.Iloc) continue;
      const b = r.body;
      // Jolt returns temporaries: read each vector before asking for the next
      const c = b.GetCenterOfMassPosition(); const p: Vec3 = [c.GetX(), c.GetY(), c.GetZ()];
      potential += potentialEnergy(r.mass, p, g);
      if (!b.IsActive()) continue;
      const lv = b.GetLinearVelocity(); const v: Vec3 = [lv.GetX(), lv.GetY(), lv.GetZ()];
      const av = b.GetAngularVelocity(); const w: Vec3 = [av.GetX(), av.GetY(), av.GetZ()];
      const q = b.GetRotation(); const I = worldInertia(r.Iloc, [q.GetX(), q.GetY(), q.GetZ(), q.GetW()]);
      const rot = kineticEnergy(0, v, w, I);
      kinetic += kineticEnergy(r.mass, v, [0, 0, 0], null) + rot;
      spin += rot;
    }
    for (const c of this.conns.values()) {
      if (c.status === 'broken') continue;
      const sp = c.derived.spring;
      if (!sp) continue;
      if (c.kind.model === 'band') {
        // the neo-Hookean band's stored energy, by the trapezoid rule on its force from rest to now
        const L = c.load.extent, L0 = Math.max(c.bandRest, 1e-4);
        if (L > L0) elastic += 0.5 * neoHookeanBandForce(sp.bandG ?? 5e5, sp.bandArea ?? 1e-5, L / L0) * (L - L0);
      } else if (c.kind.model === 'spring' && !c.springRigid && c.typed) {
        const L = length(sub(this.anchorWorldB(c).p, this.anchorWorld(c).p));
        elastic += springEnergy(sp.k, L - sp.rest);
      }
    }
    return { kinetic, potential, elastic, spin };
  }

  private openBooks() {
    this.book = { work: emptyWork(), heat: emptyHeat(), sources: [], inMotors: 0 };
    this.heatTick.clear();
    return this.storedNow();
  }

  // ---------------------------------------------------------------------------------------------
  // the electrical side: batteries, wires, motors
  //
  // A motor drive runs on the battery wired to its motor and on nothing else. Each substep, before Jolt steps, every
  // pack and the motors on it are solved together (electric.ts): the pack's terminal voltage, each motor's current at
  // its speed and winding temperature, through its controller's limit. That sets the torque the motor can give, which
  // Jolt applies (as a velocity motor toward the no-load speed, limited to it). After the step, what each motor really
  // gave decides its current again, and the books are kept from that: the pack gives the motor's back-EMF power plus
  // its copper's and wire's losses; the motor's friction and the gearhead's losses heat the motor; the pack's own
  // resistance heats the pack. So the chemical energy a battery gives is the work at the shaft plus every loss on the
  // way, exactly, and the charge it loses is that current over its maker's rate-dependent capacity.

  /** The motor and gearhead a drive's motor part is, made again when the part changes. */
  private driveOf(c: ConnRec): DriveRec {
    const p = c.pa.part.params;
    const sig = `${String(p['model'] ?? '')}|${String(p['gearhead'] ?? '')}`;
    let d = this.drives.get(c.id);
    if (d && d.sig === sig) return d;
    const data = getMotor(String(p['model'] ?? 'motor.dc.coreless.d40-150w-24v'));
    const g = getGearhead(String(p['gearhead'] ?? 'none'));
    d = {
      sig, model: motorModel(data), gear: g && g.fits.includes(data.id) ? g : null,
      heat: d?.heat ?? { winding: AMBIENT, housing: AMBIENT }, burnt: d?.burnt ?? false,
      battery: null, wire: 0, at: -1, u: 0, I: 0, w: 0, impulse: 0,
    };
    this.drives.set(c.id, d);
    return d;
  }

  /** A battery part's state, from its part: a new charge set on it, or a new pack, starts it again. */
  private cellOf(id: string): CellRec | null {
    const pr = this.parts.get(id);
    if (!pr || pr.kind.id !== 'battery') return null;
    const p = pr.part.params;
    const sig = `${String(p['model'] ?? '')}|${String(p['series'] ?? '')}|${String(p['parallel'] ?? '')}`;
    const set = Math.max(0, Math.min(1, Number(p['charge'] ?? 1)));
    let cell = this.cells.get(id);
    if (!cell || cell.sig !== sig || cell.set !== set) {
      const pack: Pack = { data: getBattery(String(p['model'] ?? 'battery.sla.12v-7ah')), series: Math.max(1, Math.round(Number(p['series'] ?? 2))), parallel: Math.max(1, Math.round(Number(p['parallel'] ?? 1))) };
      cell = { sig, pack, soc: set, V: 0, I: 0, flat: set <= 0, set };
      this.cells.set(id, cell);
    }
    return cell;
  }

  /** Which battery a motor part is wired to (an intact power wire between them), and the wire's resistance. */
  private wireUp(c: ConnRec, d: DriveRec) {
    if (d.at === this.topology) return;
    d.at = this.topology;
    d.battery = null;
    d.wire = 0;
    for (const w of this.conns.values()) {
      if (w.kind.id !== 'wire' || w.status === 'broken' || !w.pb) continue;
      const other = w.pa === c.pa ? w.pb : w.pb === c.pa ? w.pa : null;
      if (!other || other.kind.id !== 'battery') continue;
      d.battery = other.id;
      d.wire = w.derived.wire?.resistance ?? 0;
      return;
    }
  }

  /** Relative turning rate of a revolute joint about its axis, b against a (the sense a drive turns it). */
  private jointRate(c: ConnRec): number {
    const axis = rotate(this.anchorWorld(c).q, [0, 1, 0]);
    const wa = this.bi.GetAngularVelocity(c.a.body.GetID());
    let w = -dot([wa.GetX(), wa.GetY(), wa.GetZ()], axis);
    if (c.b) { const wb = this.bi.GetAngularVelocity(c.b.body.GetID()); w += dot([wb.GetX(), wb.GetY(), wb.GetZ()], axis); }
    return w;
  }

  /** Every pack with the motors on it, solved for this substep. */
  private solveCircuits() {
    const on = new Map<string, { d: DriveRec; load: Load }[]>();
    for (const c of this.conns.values()) {
      const m = c.derived.revolute?.motor;
      if (!m || c.status === 'broken' || !c.typed || c.pa.kind.id !== 'motor.dc') { if (this.drives.has(c.id) && !m) this.drives.delete(c.id); continue; }
      const d = this.driveOf(c);
      this.wireUp(c, d);
      d.u = Math.max(-1, Math.min(1, this.channels[m.channel] ?? 0)) * (m.reverse ? -1 : 1);
      // the speed it turns at as the tick began, when every assembly is rigid again: inside a tick Jolt lets a light
      // housing twist back in its mounts under the reaction (the assembly pass puts it right after), which no real
      // motor's back-EMF would see
      if (this.magnetSub === 0) { d.w = this.jointRate(c); d.impulse = 0; }
      d.I = 0;
      if (!d.battery) continue;
      const N = d.gear?.ratio ?? 1;
      const load: Load = { model: d.model, u: d.u, w: d.w * N, R: windingR(d.model, d.heat.winding) + d.wire, limit: m.currentLimit, dead: d.burnt };
      const list = on.get(d.battery) ?? [];
      list.push({ d, load });
      on.set(d.battery, list);
    }
    for (const [id, list] of on) {
      const cell = this.cellOf(id);
      if (!cell) { for (const x of list) x.d.battery = null; continue; }
      const r = solvePack(cell.pack, cell.soc, list.map((x) => x.load));
      cell.V = r.V;
      list.forEach((x, k) => { x.d.I = r.currents[k]!; });
      if (r.flat && !cell.flat) {
        const pr = this.parts.get(id)!;
        this.events.push({ type: 'flat', part: id, point: this.poseOf(pr.segs[0]!).p, note: `The battery is flat: at ${Math.round(cell.soc * 100)}% it can't hold its voltage up under the load.` });
      }
      cell.flat = r.flat;
    }
  }

  /** The most torque a drive gives at its output at output speed w: its current through its gearhead, or its drag. */
  private driveTorque(d: DriveRec, w: number): number {
    const N = d.gear?.ratio ?? 1;
    const wm = w * N;
    const T = d.I !== 0 ? shaftTorque(d.model, d.I, wm) : -d.model.Tf * Math.sign(wm || 1);
    return Math.abs(throughGear(T, wm, d.gear));
  }

  /**
   * After a Jolt step: what each motor drive really gave (its torque and speed), the current that took, and where every
   * joule of it came from and went. `dt` is the step.
   */
  private bookDrive(c: ConnRec, T: number, w: number, dt: number) {
    const d = this.drives.get(c.id);
    if (!d) return;
    const g = d.gear, N = g?.ratio ?? 1, eta = g?.efficiency ?? 1;
    const Po = T * w;
    // the torque at the motor's own shaft: losses in the gearhead go against the power through it
    const Tm = Po >= 0 ? T / (N * eta) : (T * eta) / N;
    const wm = w * N;
    const Pm = Tm * wm;
    // the electromagnetic torque is the shaft's plus the brushes' and bearings' friction against the motion
    let i = (Tm + d.model.Tf * Math.sign(wm || Tm)) / d.model.Kt;
    const cell = d.battery ? this.cells.get(d.battery) : undefined;
    if (!cell || cell.flat || d.burnt || d.u === 0 || i * d.u <= 0) i = 0;
    const limit = c.derived.revolute?.motor?.currentLimit ?? Infinity;
    i = Math.max(-limit, Math.min(limit, i));
    const Rw = windingR(d.model, d.heat.winding);
    const copper = i * i * Rw * dt, wire = i * i * d.wire * dt;
    const friction = Math.max(0, d.model.Kt * i * wm - Pm) * dt, gear = Math.max(0, Pm - Po) * dt;
    const Pin = Math.max(0, d.model.Kt * i * wm + i * i * (Rw + d.wire));
    d.I = i;
    this.book.heat.electric += copper + wire;
    this.book.heat.friction += friction + gear;
    this.book.inMotors += friction + gear;
    this.warmPart(c.a, copper + friction + gear);
    if (cell && Pin > 0) {
      const V = Math.max(cell.V, 1e-3), Ib = Pin / V, Rp = packR(cell.pack);
      const cells = Ib * Ib * Rp * dt;
      this.book.work.batteries += Pin * dt + cells;
      this.book.heat.electric += cells;
      const pr = this.parts.get(d.battery!);
      if (pr) this.warmPart(pr.segs[0]!, cells);
      cell.I += Ib;
      cell.soc = drain(cell.pack, cell.soc, Ib, dt);
    }
    // the winding heats behind the housing, the housing to the air; past its insulation's limit it fails open
    d.heat = heatStep(d.model.thermal, d.heat, copper / dt, (friction + gear) / dt, dt, AMBIENT);
    if (!d.burnt && d.heat.winding > d.model.thermal.maxWinding) {
      d.burnt = true;
      this.events.push({
        type: 'burnout', conn: c.id, part: c.pa.id, temperature: d.heat.winding, point: this.anchorWorld(c).p,
        note: `${d.model.label}: its winding reached ${Math.round(d.heat.winding)} °C, past the ${d.model.thermal.maxWinding} °C its insulation stands, and burnt out. It carried ${Math.abs(i).toFixed(1)} A against ${d.model.maxContinuousCurrent} A continuous.`,
      });
    }
  }

  /**
   * Each motor drive's books for the tick, once every assembly is rigid again: the torque it gave on average (its
   * impulse over the tick) over the speed it really turned at (the mean of the tick's start and end).
   */
  /**
   * Nothing rests out of equilibrium. Jolt lets a body sleep once it has barely moved for half a second, which a slow
   * pendulum does about the top of every swing; asleep, its speed is zeroed, so it stopped dead or lost its swing. A
   * real one swings on, because its weight still pulls it sideways. So a body hanging by one rope, spring or band and
   * touching nothing may sleep only plumb below what holds it: more than a hundredth of a degree off, its weight has a
   * moment about the support, and it is kept awake (woken, if it slept). (Found by Ego measuring pendulums in her own
   * world to find their law.)
   */
  private keepUnbalancedAwake() {
    const g = this.sim.gravity, gl = Math.hypot(g[0], g[1], g[2]);
    const holds = new Map<BodyRec, ConnRec[]>();
    if (gl > 0) for (const c of this.conns.values()) {
      if (c.status === 'broken' || !c.constraint) continue;
      for (const r of [c.a, c.b]) if (r) { const l = holds.get(r); if (l) l.push(c); else holds.set(r, [c]); }
    }
    const now = new Set<BodyRec>();
    for (const [r, cs] of holds) {
      if (r.frozen || cs.length !== 1 || this.restingOn.has(r)) continue;
      const c = cs[0]!, m = c.kind.model;
      if ((m !== 'rope' && m !== 'spring' && m !== 'band') || !c.b) continue;
      const support = (c.a === r ? this.anchorWorldB(c) : this.anchorWorld(c)).p;
      const cm = r.body.GetCenterOfMassPosition();
      const d: Vec3 = [cm.GetX() - support[0], cm.GetY() - support[1], cm.GetZ() - support[2]];
      const dl = Math.hypot(d[0], d[1], d[2]), x = cross(d, g);
      if (dl > 1e-9 && Math.hypot(x[0], x[1], x[2]) / (dl * gl) > 1.75e-4) now.add(r);
    }
    for (const r of now) {
      if (!this.unbalanced.has(r)) r.body.SetAllowSleeping(false);
      if (!r.body.IsActive()) this.bi.ActivateBody(r.body.GetID());
    }
    for (const r of this.unbalanced) if (!now.has(r) && this.bodies.get(r.id) === r) r.body.SetAllowSleeping(true);
    this.unbalanced = now;
  }

  private settleDrives(dt: number) {
    for (const cell of this.cells.values()) cell.I = 0;
    for (const c of this.conns.values()) {
      const d = this.drives.get(c.id);
      if (!d || !c.derived.revolute?.motor || c.status === 'broken' || !c.typed) continue;
      const w = this.jointRate(c);
      this.bookDrive(c, d.impulse / dt, (d.w + w) / 2, dt);
      d.impulse = 0;
    }
  }

  /** The electrical state for the client: batteries' charge and what they give, motors' current and heat. */
  private powerState(): PowerState | undefined {
    if (!this.drives.size && !this.cells.size) return undefined;
    const out: PowerState = { batteries: {}, motors: {} };
    for (const [id, cell] of this.cells) if (this.parts.has(id)) out.batteries[id] = { soc: cell.soc, V: cell.V, I: cell.I, flat: cell.flat };
    for (const [id, d] of this.drives) {
      if (!this.conns.has(id)) { this.drives.delete(id); continue; }
      out.motors[id] = { I: d.I, limit: this.conns.get(id)!.derived.revolute?.motor?.currentLimit ?? Infinity, winding: d.heat.winding, housing: d.heat.housing, rpm: (d.w * 60) / (2 * Math.PI), burnt: d.burnt, battery: d.battery };
    }
    for (const id of [...this.cells.keys()]) if (!this.parts.has(id)) this.cells.delete(id);
    return out;
  }

  /**
   * Motor drives' turning impulse (and eddy brakes' heat) over a Jolt step of `collisionSteps` collision steps, from the
   * torque each applied (and how fast it turned).
   */
  private bookMotors(collisionSteps: number) {
    for (const c of this.conns.values()) {
      const rv = c.derived.revolute;
      if (c.status === 'broken' || c.kind.model !== 'revolute' || !c.typed || !rv || !(rv.motor || rv.eddy)) continue;
      const h = c.typed as JoltNS.HingeConstraint;
      const wrel = this.jointRate(c);
      // the motor's angular impulse each collision step, as a torque on b about the axis
      const T = (h.GetTotalLambdaMotor() * collisionSteps * this.hingeSign(c)) / this.subDt;
      if (rv.motor) { const d = this.drives.get(c.id); if (d) d.impulse += T * this.subDt; }
      else { const work = T * wrel * this.subDt; this.book.heat.eddy -= work; this.warmPart(c.a, -work / 2); if (c.b) this.warmPart(c.b, -work / 2); }
    }
  }

  /** Jolt's hinge acts from its body 1 on its body 2: +1 when that is a to b (the order the joint was made in). */
  private hingeSign(c: ConnRec): number {
    const b2 = (c.typed as JoltNS.HingeConstraint).GetBody2();
    return c.b && b2.GetID().GetIndexAndSequenceNumber() === c.b.body.GetID().GetIndexAndSequenceNumber() ? 1 : -1;
  }

  private warmPart(r: BodyRec | null, joules: number) {
    if (!r || !(joules > 0)) return;
    this.heatTick.set(r.partId, (this.heatTick.get(r.partId) ?? 0) + joules);
  }

  /**
   * Close this tick's books. What the world holds now, against what it held at the start plus the work put in, says
   * how much went to heat; what was measured directly (air, eddy currents, rubber) is already booked; the rest was made
   * at contacts, bearings and yielding hinges, and is shared among them by what each made. Jolt's angular damping is
   * the integrator's (A5), not heat. A gain nothing explains is the integrator's too, unless a hand moving a part
   * kinematically made it.
   */
  private closeBooks(start: ReturnType<PhysicsWorld['storedNow']>, dt: number) {
    const now = this.storedNow();
    const b = this.book;
    const total = (x: { kinetic: number; potential: number; elastic: number }) => x.kinetic + x.potential + x.elastic;
    const W = b.work.hands + b.work.batteries + b.work.magnets + b.work.fluids;
    const measured = b.heat.air + b.heat.eddy + b.heat.damping + b.heat.electric + b.inMotors;
    const damping = 2 * ANGULAR_DAMPING * dt * start.spin;
    let rest = W - (total(now) - total(start)) - measured - damping;
    let numerical = damping;
    if (rest < 0) {
      if ([...this.grabs.values()].some((g) => g.mode === 'creative')) b.work.hands -= rest;
      else numerical += rest;
      rest = 0;
    }
    const sources = b.sources;
    if (rest > 0 && !sources.length) { numerical += rest; rest = 0; }
    shareHeat(rest, sources).forEach((q, i) => {
      if (!q) return;
      const src = sources[i]!;
      b.heat[src.cause] += q;
      // into the parts, by how readily each soaks heat away (Blok's partition); bending heats the metal that bent
      const share = src.a ? heatShare(src.a.material, src.b?.material ?? src.env ?? null) : 0;
      const heat = src.cause === 'plastic' ? TAYLOR_QUINNEY * q : q;
      this.warmPart(src.a, heat * share);
      this.warmPart(src.b, heat * (1 - share));
    });
    const L = this.ledger;
    L.kinetic = now.kinetic; L.potential = now.potential; L.elastic = now.elastic;
    for (const k of Object.keys(b.heat) as (keyof HeatBook)[]) L.heat[k] += b.heat[k];
    for (const k of Object.keys(b.work) as (keyof WorkBook)[]) L.work[k] += b.work[k];
    L.numerical += numerical;
  }

  /** The energy ledger since the scene began, with what the world holds read now. */
  energies(): Energies {
    const now = this.storedNow();
    return { ...this.ledger, kinetic: now.kinetic, potential: now.potential, elastic: now.elastic, heat: { ...this.ledger.heat }, work: { ...this.ledger.work } };
  }

  /** The ledger as the last tick closed it (no new reads). */
  private ledgerCopy(): Energies {
    return { ...this.ledger, heat: { ...this.ledger.heat }, work: { ...this.ledger.work } };
  }

  /**
   * Fault containment (F3). A body whose state is not a number is put back where it last was, at rest, before
   * Jolt sees it: Jolt does not return from a step given one, and every body it touches would follow. Whatever made
   * it is a defect elsewhere, so it is reported (a fault event; the watchdog flags nonfinite) rather than hidden.
   * Within one Jolt step of several collision steps it cannot help; it is a last line, not the fix.
   */
  private containFaults() {
    for (const r of this.bodies.values()) {
      if (r.frozen || !r.body.IsActive()) continue;
      const b = r.body;
      // Jolt returns temporaries: read each vector before asking for the next
      const p = b.GetPosition(); const px = p.GetX(), py = p.GetY(), pz = p.GetZ();
      const q = b.GetRotation(); const qx = q.GetX(), qy = q.GetY(), qz = q.GetZ(), qw = q.GetW();
      const v = b.GetLinearVelocity(); const vx = v.GetX(), vy = v.GetY(), vz = v.GetZ();
      const w = b.GetAngularVelocity(); const wx = w.GetX(), wy = w.GetY(), wz = w.GetZ();
      if (Number.isFinite(px + py + pz + qx + qy + qz + qw + vx + vy + vz + wx + wy + wz)) continue;
      const good = r.good ?? r.pr.part.pose;
      this.r1.Set(...good.p);
      this.q1.Set(...good.q);
      this.v1.Set(0, 0, 0);
      this.v2.Set(0, 0, 0);
      this.bi.SetPositionRotationAndVelocity(b.GetID(), this.r1, this.q1, this.v1, this.v2);
      if (!this.events.some((e) => e.type === 'fault' && e.body === r.id)) {
        this.events.push({ type: 'fault', part: r.partId, body: r.id, note: 'the physics produced a non-number here; it was put back where it last was and stopped' });
      }
    }
  }

  /** Current state without stepping (after ops applied while paused). Events and loads carry over. */
  snapshot(): StepResult {
    return this.collect(0);
  }

  private collect(stepMs: number): StepResult {
    const count = this.bySlot.length;
    const transforms = new Float32Array(count * 7);
    const velocities = new Float32Array(count * 6);
    for (let s = 0; s < count; s++) {
      const entry = this.bySlot[s];
      if (!entry) continue;
      if ('segs' in entry) {
        // virtual slot: the part frame carried by segment 0
        const vp = this.virtualPose(entry);
        const o = s * 7;
        transforms[o] = vp.p[0]; transforms[o + 1] = vp.p[1]; transforms[o + 2] = vp.p[2];
        transforms[o + 3] = vp.q[0]; transforms[o + 4] = vp.q[1]; transforms[o + 5] = vp.q[2]; transforms[o + 6] = vp.q[3];
        const s0 = entry.segs[0]!;
        if (s0.body.IsActive()) {
          const [lv, av] = this.velocityOf(s0);
          const lin = add(lv, cross(av, sub(vp.p, this.poseOf(s0).p)));
          const v = s * 6;
          velocities[v] = lin[0]; velocities[v + 1] = lin[1]; velocities[v + 2] = lin[2];
          velocities[v + 3] = av[0]; velocities[v + 4] = av[1]; velocities[v + 5] = av[2];
        }
        continue;
      }
      const r = entry;
      const p = r.body.GetPosition();
      const q = r.body.GetRotation();
      const o = s * 7;
      transforms[o] = p.GetX(); transforms[o + 1] = p.GetY(); transforms[o + 2] = p.GetZ();
      transforms[o + 3] = q.GetX(); transforms[o + 4] = q.GetY(); transforms[o + 5] = q.GetZ(); transforms[o + 6] = q.GetW();
      if (Number.isFinite(transforms[o]! + transforms[o + 1]! + transforms[o + 2]! + transforms[o + 3]! + transforms[o + 4]! + transforms[o + 5]! + transforms[o + 6]!)) {
        const g = (r.good ??= { p: [0, 0, 0], q: [0, 0, 0, 1] });
        g.p[0] = transforms[o]!; g.p[1] = transforms[o + 1]!; g.p[2] = transforms[o + 2]!;
        g.q[0] = transforms[o + 3]!; g.q[1] = transforms[o + 4]!; g.q[2] = transforms[o + 5]!; g.q[3] = transforms[o + 6]!;
      }
      if (r.body.IsActive()) {
        const lv = r.body.GetLinearVelocity();
        const av = r.body.GetAngularVelocity();
        const v = s * 6;
        velocities[v] = lv.GetX(); velocities[v + 1] = lv.GetY(); velocities[v + 2] = lv.GetZ();
        velocities[v + 3] = av.GetX(); velocities[v + 4] = av.GetY(); velocities[v + 5] = av.GetZ();
      }
    }
    const events = this.events;
    this.events = [];
    const cure: Record<string, number> = {};
    for (const c of this.conns.values()) if (c.kind.id === 'glued') cure[c.id] = c.cure;
    const bonds: Record<string, number[]> = {};
    for (const pr of this.parts.values()) if (pr.layout && pr.cap) bonds[pr.id] = pr.bonds.map((b) => (b ? b.u : -1));
    const result: StepResult = {
      slotVersion: this.slotVersion,
      transforms,
      velocities,
      events,
      loads: [...this.conns.values()].map((c) => ({ ...c.load })),
      bonds,
      cure,
      stats: {
        stepMs,
        bodies: this.bodies.size,
        awake: this.ps.GetNumActiveBodies(this.J.EBodyType_RigidBody),
        substeps: this.lastSubsteps,
        magnetPairs: this.lastMagnetPairs,
        ticks: this.ticks,
        sections: { ...this.sections },
      },
    };
    if (this.slotsDirty) {
      this.slotVersion++;
      result.slotVersion = this.slotVersion;
      result.slots = this.bySlot.map((r) => r?.id ?? null);
      this.slotsDirty = false;
    }
    result.energy = this.ledgerCopy();
    if (this.heatTick.size) result.heat = Object.fromEntries(this.heatTick);
    const power = this.powerState();
    if (power) result.power = power;
    return result;
  }

  /** Read the real forces carried by each joint and check them against capacity. */
  private evaluateConnections(dt: number, substeps: number) {
    const inv = substeps / dt; // lambdas are impulses of the last substep
    for (const c of this.conns.values()) {
      if (c.status === 'broken') continue;
      // adhesive cure clock
      if (c.kind.id === 'glued' && this.sim.cureClock > 0) {
        c.cure += dt * this.sim.cureClock;
        if (this.time - c.lastDerive > 0.25) { c.derived = this.derive(c); c.lastDerive = this.time; }
      }
      if (!c.typed && c.kind.model !== 'band') continue;
      const frame = this.anchorWorld(c);
      const y = rotate(frame.q, [0, 1, 0]);
      let F: Vec3 = [0, 0, 0];
      let T: Vec3 = [0, 0, 0];
      let bending = 0;
      let torsion = 0;
      let shear = 0;
      let axial = 0;
      switch (c.kind.model) {
        case 'rigid': {
          const s = c.typed as JoltNS.SixDOFConstraint;
          const lp = s.GetTotalLambdaPosition();
          if (c.status === 'slipped') {
            // translation axes not all fixed: lambdas are per constraint-space axis
            const x = rotate(frame.q, [1, 0, 0]);
            const z = rotate(frame.q, [0, 0, 1]);
            F = add(add(scale(x, lp.GetX() * inv), scale(y, lp.GetY() * inv)), scale(z, lp.GetZ() * inv));
          } else {
            F = [lp.GetX() * inv, lp.GetY() * inv, lp.GetZ() * inv];
          }
          const lr = s.GetTotalLambdaRotation();
          T = [lr.GetX() * inv, lr.GetY() * inv, lr.GetZ() * inv];
          F = add(F, c.corrF);
          T = add(T, c.corrT);
          break;
        }
        case 'revolute': {
          const h = c.typed as JoltNS.HingeConstraint;
          const lp = h.GetTotalLambdaPosition();
          F = add([lp.GetX() * inv, lp.GetY() * inv, lp.GetZ() * inv], c.corrF);
          const lr = h.GetTotalLambdaRotation();
          // Jolt's two angular impulses, as the world-space moment on B (its hinge rotation part's own axes), plus what
          // the assembly pass added: the moment the joint really carries perpendicular to its pin
          const a1 = y, a2 = c.b ? rotate(this.anchorWorldB(c).q, [0, 1, 0]) : y;
          const b2 = joltPerpendicular(a2), c2 = cross(a2, b2);
          const M = add(add(scale(cross(b2, a1), lr.GetComponent(0) * inv), scale(cross(c2, a1), lr.GetComponent(1) * inv)), c.corrT);
          bending = length(sub(M, scale(y, dot(M, y))));
          break;
        }
        case 'prismatic': {
          const sl = c.typed as JoltNS.SliderConstraint;
          const lp = sl.GetTotalLambdaPosition();
          // Jolt's two lateral impulses along its normals (A's frame x, and the slider axis x that), plus the pass's
          const n1 = rotate(frame.q, [1, 0, 0]), n2 = cross(y, n1);
          const S = add(add(scale(n1, lp.GetComponent(0) * inv), scale(n2, lp.GetComponent(1) * inv)), c.corrF);
          shear = length(sub(S, scale(y, dot(S, y))));
          const lr = sl.GetTotalLambdaRotation();
          bending = length(add([lr.GetX() * inv, lr.GetY() * inv, lr.GetZ() * inv], c.corrT));
          c.load.extent = sl.GetCurrentPosition();
          break;
        }
        case 'spherical': {
          const st = c.typed as JoltNS.SwingTwistConstraint;
          const lp = st.GetTotalLambdaPosition();
          F = add([lp.GetX() * inv, lp.GetY() * inv, lp.GetZ() * inv], c.corrF);
          break;
        }
        case 'spring':
        case 'rope': {
          const dc = c.typed as JoltNS.DistanceConstraint;
          // a rope only pulls; a spring or link pushes too, when it is held shorter than its length
          const lam = Math.abs(dc.GetTotalLambdaPosition() * inv);
          const short = c.kind.model === 'spring' && length(sub(this.anchorWorldB(c).p, frame.p)) < c.derived.spring!.rest;
          axial = short ? -lam : lam;
          c.load.extent = length(sub(this.anchorWorldB(c).p, frame.p));
          break;
        }
        case 'band':
          axial = c.load.axial;
          break;
      }
      if (c.kind.model === 'rigid' || c.kind.model === 'revolute' || c.kind.model === 'spherical') {
        // Tension is positive when the parts are being pulled apart along the frame's +Y (A -> B).
        axial = -dot(F, y);
        shear = length(sub(F, scale(y, dot(F, y))));
        if (c.kind.model === 'rigid') {
          torsion = Math.abs(dot(T, y));
          bending = length(sub(T, scale(y, dot(T, y))));
        }
        if (c.kind.model !== 'rigid') {
          // Pins and studs see the resultant.
          shear = length(F);
          axial = 0;
        }
      }
      c.lastPositionLambda = c.kind.model === 'revolute' ? length(F) : 0;
      const cap = c.derived.capacities;
      const modes: [string, number, number][] = [
        ['tension', Math.max(0, axial), cap.tension],
        ['compression', Math.max(0, -axial), cap.compression],
        ['shear', shear, cap.shear],
        ['bending', bending, cap.bending],
        ['torsion', torsion, cap.torsion],
      ];
      let u = 0;
      let mode = '';
      let load = 0;
      let capacity = 0;
      for (const [m, l, cp] of modes) {
        const r = cp === Infinity ? 0 : cp <= 0 ? (l > 1e-6 ? Infinity : 0) : l / cp;
        if (r > u) { u = r; mode = m; load = l; capacity = cp; }
      }
      c.load = { ...c.load, u: Number.isFinite(u) ? u : 99, mode, axial, shear, bending, torsion };
      // Friction-grip joints slip before they break.
      if (c.status === 'intact' && c.derived.slip && (shear > c.derived.slip.shear || torsion > c.derived.slip.torsion)) {
        c.slipTicks++;
        if (c.slipTicks >= this.opts.filterTicks) {
          c.status = 'slipped';
          const byShear = shear > c.derived.slip.shear;
          const [m, l, cap] = byShear ? ['shear', shear, c.derived.slip.shear] : ['torsion', torsion, c.derived.slip.torsion];
          this.events.push({ type: 'slip', conn: c.id, point: frame.p, note: `Slipped: ${m} ${fmtLoad(m, l)} beat the friction grip of ${fmtLoad(m, cap)}` });
          this.buildConstraint(c);
          continue;
        }
      } else {
        c.slipTicks = 0;
      }
      if (u > 1) c.over++;
      else c.over = 0;
      if (u > 1.5 || c.over >= this.opts.filterTicks) {
        c.status = 'broken';
        this.destroyConstraint(c);
        this.events.push({
          type: 'break', conn: c.id, mode, load, capacity, point: frame.p,
          note: `${c.kind.label} failed in ${mode}: ${fmtLoad(mode, load)} on a ${fmtLoad(mode, capacity)} capacity`,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // contacts -> audio / particles

  private makeContactListener(): JoltNS.ContactListenerJS {
    const J = this.J;
    const listener = new J.ContactListenerJS();
    listener.OnContactValidate = () => J.ValidateResult_AcceptAllContactsForThisBodyPair;
    listener.OnContactPersisted = (b1p: number, b2p: number, manp: number, setp: number) => {
      const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body);
      const man = J.wrapPointer(manp, J.ContactManifold), settings = J.wrapPointer(setp, J.ContactSettings);
      if (this.seamGhost(b1, b2, man)) { settings.mIsSensor = true; return; }
      const speed = this.impactSpeed(b1, b2, man);
      if (speed < MIN_IMPACT_FOR_RESTITUTION) settings.mCombinedRestitution = 0;
      if (this.watch.size) this.recordContact(b1, b2, man, settings, speed);
      this.recordMagnetTouch(b1, b2, man, settings);
      this.bookContact(b1, b2, man, settings, speed);
    };
    listener.OnContactRemoved = () => {};
    listener.OnContactAdded = (b1p: number, b2p: number, manp: number, setp: number) => {
      const b1 = J.wrapPointer(b1p, J.Body);
      const b2 = J.wrapPointer(b2p, J.Body);
      const man = J.wrapPointer(manp, J.ContactManifold);
      const settings = J.wrapPointer(setp, J.ContactSettings);
      if (this.seamGhost(b1, b2, man)) { settings.mIsSensor = true; return; }
      const speed = Math.max(0, this.impactSpeed(b1, b2, man));
      if (speed < MIN_IMPACT_FOR_RESTITUTION) settings.mCombinedRestitution = 0;
      if (this.watch.size) this.recordContact(b1, b2, man, settings, speed);
      this.recordMagnetTouch(b1, b2, man, settings);
      this.bookContact(b1, b2, man, settings, speed);
      if (this.events.length > 48) return;
      const n = man.mWorldSpaceNormal;
      const normal: Vec3 = [n.GetX(), n.GetY(), n.GetZ()];
      const cp = man.GetWorldSpaceContactPointOn1(0);
      const point: Vec3 = [cp.GetX(), cp.GetY(), cp.GetZ()];
      if (speed < 0.25) return;
      const im1 = b1.IsStatic() || b1.IsKinematic() ? 0 : b1.GetMotionProperties().GetInverseMass();
      const im2 = b2.IsStatic() || b2.IsKinematic() ? 0 : b2.GetMotionProperties().GetInverseMass();
      const mEff = 1 / Math.max(im1 + im2, 1e-6);
      const s1 = b1.GetUserData() - 1;
      const s2 = b2.GetUserData() - 1;
      this.events.push({
        type: 'contact',
        a: s1 >= 0 ? partIdOf(this.bySlot[s1]) : null,
        b: s2 >= 0 ? partIdOf(this.bySlot[s2]) : null,
        point, normal, speed, impulse: speed * mEff,
      });
    };
    return listener;
  }

  /**
   * Is this contact a ghost of the segmentation (A10 in docs/ARCHITECTURE.md)? Joined segments are one continuous
   * piece: there is no surface at the seam between them. A contact with a segment's end that it shares, flush, with a
   * joined neighbour (bond intact, or both frozen), its normal leaving the segment through that end, touches nothing
   * real; the neighbour's own contact is the real one.
   */
  /**
   * A contact Jolt solves, as a source of this tick's heat: sliding (friction about mu x the pair's weight-share x the
   * slip speed) or, closing faster than an impact, the energy a collision of its restitution loses. Only proportions
   * matter: the books say how much heat there was.
   */
  private bookContact(b1: JoltNS.Body, b2: JoltNS.Body, man: JoltNS.ContactManifold, settings: JoltNS.ContactSettings, closing: number) {
    const r1 = this.recOf(b1), r2 = this.recOf(b2);
    if (!r1 && !r2) return;
    if (r1) this.touchingNow.add(r1);
    if (r2) this.touchingNow.add(r2);
    if (settings.mIsSensor) return; // the assembly solve has it, and books it there
    const im1 = b1.IsStatic() || b1.IsKinematic() ? 0 : b1.GetMotionProperties().GetInverseMass();
    const im2 = b2.IsStatic() || b2.IsKinematic() ? 0 : b2.GetMotionProperties().GetInverseMass();
    if (im1 + im2 <= 0) return;
    const m = 1 / (im1 + im2);
    const env = !r1 ? this.envMaterial.get(b1.GetID().GetIndexAndSequenceNumber()) : !r2 ? this.envMaterial.get(b2.GetID().GetIndexAndSequenceNumber()) : undefined;
    // the moving body first, so the environment (if any) is side b
    const [a, b] = r1 ? [r1, r2] : [r2, null];
    if (closing >= MIN_IMPACT_FOR_RESTITUTION) {
      const e = settings.mCombinedRestitution;
      this.book.sources.push({ a, b, w: 0.5 * m * closing * closing * (1 - e * e), cause: 'impact', env });
      return;
    }
    const n = man.mWorldSpaceNormal; const nv: Vec3 = [n.GetX(), n.GetY(), n.GetZ()];
    const cp = man.GetWorldSpaceContactPointOn1(0); const point: Vec3 = [cp.GetX(), cp.GetY(), cp.GetZ()];
    const rel = sub(this.preStepPointVelocity(b2, point), this.preStepPointVelocity(b1, point));
    const slip = length(sub(rel, scale(nv, dot(rel, nv))));
    if (slip < 1e-4) return;
    this.book.sources.push({ a, b, w: settings.mCombinedFriction * m * length(this.sim.gravity) * slip * this.subDt, cause: 'friction', env });
  }

  private seamGhost(b1: JoltNS.Body, b2: JoltNS.Body, man: JoltNS.ContactManifold): boolean {
    const r1 = this.recOf(b1), r2 = this.recOf(b2);
    if (!(r1?.pr.layout || r2?.pr.layout)) return false;
    const count = man.mRelativeContactPointsOn1.size();
    if (!count) return false;
    const nn = man.mWorldSpaceNormal;
    const n: Vec3 = [nn.GetX(), nn.GetY(), nn.GetZ()]; // from body 1 to body 2
    // Jolt's manifold points need not lie on either shape (a speculative contact projects them onto a supporting
    // face's plane), so the contact is placed at their midpoints and the segment's feature found from there
    const mids = Array.from({ length: count }, (_, i) => {
      const c1 = man.GetWorldSpaceContactPointOn1(i), c2 = man.GetWorldSpaceContactPointOn2(i);
      return [(c1.GetX() + c2.GetX()) / 2, (c1.GetY() + c2.GetY()) / 2, (c1.GetZ() + c2.GetZ()) / 2] as Vec3;
    });
    return (!!r1 && this.onJoinedSeam(r1, mids, n)) || (!!r2 && this.onJoinedSeam(r2, mids, scale(n, -1)));
  }

  /** Is segment r's nearest feature to `points` an end it shares, flush, with a joined neighbour, `out` leaving through it? */
  private onJoinedSeam(r: BodyRec, points: Vec3[], out: Vec3): boolean {
    const L = r.pr.layout;
    if (!L || r.seg < 0) return false;
    const pose = this.poseOf(r);
    const axis = rotate(pose.q, L.axis);
    const along = dot(out, axis);
    if (Math.abs(along) < SEAM_NORMAL) return false;
    const end = along > 0 ? 1 : -1;
    const k = end > 0 ? r.seg : r.seg - 1; // the bond at that end
    if (k < 0 || k >= r.pr.segs.length - 1 || r.pr.broken.has(k)) return false;
    if (!r.pr.bonds[k] && !r.pr.part.frozen) return false;
    // the neighbour's end lies flush on this one: centres together, axes aligned to within SEAM_TOL at the rim
    const h = L.segLen / 2;
    const nb = r.pr.segs[end > 0 ? r.seg + 1 : r.seg - 1]!;
    const pn = this.poseOf(nb);
    const axisN = rotate(pn.q, L.axis);
    const bb = shapeBounds(r.shape);
    const rim = Math.hypot(...[0, 1, 2].map((i) => (1 - Math.abs(L.axis[i]!)) * Math.max(Math.abs(bb.min[i]!), Math.abs(bb.max[i]!))));
    const offset = length(sub(add(pose.p, scale(axis, end * h)), sub(pn.p, scale(axisN, end * h))));
    if (offset + length(cross(axis, axisN)) * rim > SEAM_TOL) return false;
    // and it is that end the contact is with
    const inv = quatConj(pose.q);
    return points.every((p) => Math.abs(dot(closestOnShape(r.shape, rotate(inv, sub(p, pose.p))).p, L.axis) - end * h) < SEAM_TOL);
  }

  // debug / tests
  connectionLoad(id: string): ConnectionLoad | undefined {
    return this.conns.get(id)?.load;
  }

  connectionStatus(id: string) {
    return this.conns.get(id)?.status;
  }

  connectionDerived(id: string) {
    return this.conns.get(id)?.derived;
  }

  /** Gravity now. */
  gravity(): Vec3 {
    return [...this.sim.gravity] as Vec3;
  }

  /** Bodies a hand is holding now (and the pieces that move with them). */
  heldBodies(): string[] {
    return [...this.bodies.values()].filter((r) => r.grabbed).map((r) => r.id);
  }

  /** World-space inertia tensor (row-major 3 x 3, about the centre of mass) of one body, or null if it does not move. */
  bodyInertia(id: string): number[] | null {
    const r = this.bodies.get(id);
    return r?.Iloc ? worldInertia(r.Iloc, this.poseOf(r).q) : null;
  }

  /**
   * Whether a slot id is a real body. A breakable part's own id names its frame, carried by segment 0: reporting it
   * as a body as well counts the part twice (with a guessed inertia) in anything that sums over bodies.
   */
  isBody(id: string) {
    return this.bodies.has(id);
  }

  /** Mass of a part (all its segments) or of one body. */
  bodyMass(id: string) {
    const pr = this.parts.get(id);
    if (pr) return pr.segs.reduce((m, s) => m + s.mass, 0);
    return this.bodies.get(id)?.mass;
  }

  /** Linear velocity of a body, or a part's mass-weighted mean. */
  linearVelocity(id: string): Vec3 | null {
    const pr = this.parts.get(id);
    const members = pr ? pr.segs : this.bodies.has(id) ? [this.bodies.get(id)!] : [];
    if (!members.length) return null;
    let v: Vec3 = [0, 0, 0], m = 0;
    for (const r of members) {
      v = add(v, scale(this.velocityOf(r)[0], r.mass));
      m += r.mass;
    }
    return scale(v, 1 / m);
  }

  angularVelocity(id: string): Vec3 | null {
    const r = this.bodyFor(id);
    return r ? this.velocityOf(r)[1] : null;
  }

  /** Bond states of a breakable part: 'intact' | 'plastic' | 'broken' per bond, plus utilisation. */
  bondStates(id: string): { state: 'intact' | 'plastic' | 'broken'; u: number; mode: string; loads: BondLoads | null }[] {
    const pr = this.parts.get(id);
    if (!pr?.layout) return [];
    return pr.segs.slice(0, -1).map((_, k) => {
      const b = pr.bonds[k];
      if (b) return { state: b.plastic ? 'plastic' : 'intact', u: b.u, mode: b.mode, loads: { ...b.loads } };
      return { state: pr.broken.has(k) ? 'broken' : 'intact', u: 0, mode: '', loads: null };
    });
  }

  bondCapacityOf(id: string) {
    return this.parts.get(id)?.cap ?? null;
  }

  segmentCount(id: string) {
    return this.parts.get(id)?.segs.length ?? 0;
  }
}

function partIdOf(entry: BodyRec | PartRec | null | undefined): string | null {
  if (!entry) return null;
  return 'segs' in entry ? entry.id : entry.partId;
}


/** Which DOFs a joint to an immovable support holds: point directions and rotation directions (projectors). */
/** The perpendicular Jolt's hinge rotation part takes to an axis (Vec3::GetNormalizedPerpendicular). */
function joltPerpendicular(v: Vec3): Vec3 {
  if (Math.abs(v[0]) > Math.abs(v[1])) {
    const l = Math.hypot(v[0], v[2]);
    return [v[2] / l, 0, -v[0] / l];
  }
  const l = Math.hypot(v[1], v[2]);
  return [0, v[2] / l, -v[1] / l];
}

function anchorDofs(model: string, axis: Vec3): { point: number[]; rot: number[] } {
  const { perp } = projectors(axis);
  if (model === 'revolute') return { point: ID3, rot: perp };
  if (model === 'spherical') return { point: ID3, rot: [...ZERO3] };
  if (model === 'prismatic') return { point: perp, rot: ID3 };
  return { point: ID3, rot: ID3 };
}

function invertPose(p: Pose): Pose {
  const q = quatConj(p.q);
  return { p: scale(rotate(q, p.p), -1), q };
}

function fmtN(n: number) {
  if (!Number.isFinite(n)) return '∞';
  return n >= 1000 ? `${(n / 1000).toFixed(2)} kN` : `${n.toFixed(1)} N`;
}

function fmtLoad(mode: string, n: number) {
  if (mode !== 'bending' && mode !== 'torsion') return fmtN(n);
  if (!Number.isFinite(n)) return '∞';
  return n >= 1000 ? `${(n / 1000).toFixed(2)} kN·m` : n >= 10 ? `${n.toFixed(0)} N·m` : `${n.toFixed(2)} N·m`;
}

/** Area centroid of a 2-D polygon, mapped back to 3-D from origin o along e1, e2. */
function polygonCentroid(poly: [number, number][], o: Vec3, e1: Vec3, e2: Vec3): Vec3 {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]!, [x1, y1] = poly[(i + 1) % poly.length]!;
    const w = x0 * y1 - x1 * y0;
    a += w; cx += (x0 + x1) * w; cy += (y0 + y1) * w;
  }
  if (Math.abs(a) < 1e-18) return o;
  return add(o, add(scale(e1, cx / (3 * a)), scale(e2, cy / (3 * a))));
}

/** A 2-D polygon wound counter-clockwise. */
function ccw(poly: [number, number][]): [number, number][] {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]!, [x1, y1] = poly[(i + 1) % poly.length]!;
    a += x0 * y1 - x1 * y0;
  }
  return a < 0 ? [...poly].reverse() : poly;
}

/** The rotation taking x, y, z to the orthonormal right-handed axes a, b, c (its matrix's columns). */
function quatFromAxes(a: Vec3, b: Vec3, c: Vec3): Quat {
  const [m00, m10, m20] = a, [m01, m11, m21] = b, [m02, m12, m22] = c;
  const tr = m00 + m11 + m22;
  let q: Quat;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
  return normQuat(q);
}

/** Angle (rad) of the rotation between two orientations. */
function angleBetween(a: Quat, b: Quat): number {
  const w = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, w));
}

function transpose3(m: number[]): number[] {
  return [m[0]!, m[3]!, m[6]!, m[1]!, m[4]!, m[7]!, m[2]!, m[5]!, m[8]!];
}

/** How far along n the lowest point of a pole face's outline lies. */
function lowestAlong(f: PoleFace, n: Vec3): number {
  const c = dot(f.c, n);
  if (f.shape === 'disc') return c - f.a * Math.sqrt(Math.max(0, 1 - dot(f.o, n) ** 2));
  return c - f.hw * Math.abs(dot(f.t1, n)) - f.hh * Math.abs(dot(f.t2, n));
}

function meanOf(ps: Vec3[]): Vec3 {
  return scale(ps.reduce((acc, q) => add(acc, q), [0, 0, 0] as Vec3), 1 / Math.max(1, ps.length));
}

/** Convex hull of 2-D points, counter-clockwise (Andrew's monotone chain). */
function hull2(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const turn = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const q of p) { while (lower.length >= 2 && turn(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && turn(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const GAUSS5: [number, number][] = [
  [0.5, 0.2844444444444444], [0.5 - 0.2692346550528416, 0.2393143352496832], [0.5 + 0.2692346550528416, 0.2393143352496832],
  [0.5 - 0.4530899229693320, 0.1184634425280945], [0.5 + 0.4530899229693320, 0.1184634425280945],
];

/**
 * A footprint's mean distance from c under uniform pressure (M5: twist capacity mu N rbar; 2R/3 for a disc): over the
 * polygon its points span, in the plane normal to n, or, if they lie on a line (a cylinder on its side), along that
 * line (a quarter of its length).
 */
export function meanRadius(points: Vec3[], c: Vec3, n: Vec3): number {
  const [e1, e2] = tangents(n);
  const h = hull2(points.map((p) => [dot(sub(p, c), e1), dot(sub(p, c), e2)] as [number, number]));
  let ext = 0;
  for (const a of h) for (const b of h) ext = Math.max(ext, Math.hypot(a[0] - b[0], a[1] - b[1]));
  // fan of triangles (c, v_i, v_i+1): area |det| / 2, and int |x| dA = |det| / 3 int_0^1 |(1 - t) v_i + t v_i+1| dt
  let area = 0, moment = 0;
  for (let i = 0; i < h.length && h.length >= 3; i++) {
    const a = h[i]!, b = h[(i + 1) % h.length]!;
    const det = Math.abs(a[0] * b[1] - a[1] * b[0]);
    area += det / 2;
    moment += (det / 3) * GAUSS5.reduce((s, [t, w]) => s + w * Math.hypot((1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1]), 0);
  }
  return area > 1e-6 * ext * ext ? moment / area : ext / 4;
}

/** A 6 x 6 matrix over (velocity, angular velocity) given in a frame turned by q, in world axes: T D T^T. */
function rotate6(D: number[], q: Quat): number[] {
  const cols = [0, 1, 2].map((j) => rotate(q, [j === 0 ? 1 : 0, j === 1 ? 1 : 0, j === 2 ? 1 : 0]));
  const T = (i: number, j: number) => (Math.floor(i / 3) === Math.floor(j / 3) ? cols[j % 3]![i % 3]! : 0);
  const TD = new Array<number>(36).fill(0), out = new Array<number>(36).fill(0);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++) TD[i * 6 + j] += T(i, k) * D[k * 6 + j]!;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++) out[i * 6 + j] += TD[i * 6 + k]! * T(j, k);
  return out;
}

/** Intersection of two convex counter-clockwise polygons (Sutherland-Hodgman). */
function clipConvex(subject: [number, number][], clip: [number, number][]): [number, number][] {
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const [ax, ay] = clip[i]!, [bx, by] = clip[(i + 1) % clip.length]!;
    const side = (p: [number, number]) => (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax);
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j]!, q = input[(j + 1) % input.length]!;
      const sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
  }
  return out;
}
