// The physics world: parts become Jolt bodies, connections become Jolt constraints, and every tick the
// real forces carried by each constraint are read back and checked against spec-derived capacities.
// Breakable stock (rods, tubes, beams, lumber, strips) is a chain of segment bodies bonded at their shared
// faces; the bonds carry real section forces and yield or fracture at capacities from the section and
// material. Nothing here knows about specific builds; behaviour comes only from geometry, materials and specs.

import type JoltNS from 'jolt-physics';
import type { Material } from '../data/materials';
import { getConnectorKind, type ConnectorKind, type Derived } from '../connectors/registry';
import {
  getPartKind, effectiveParams, segmentLayout, segmentBodyId, segmentOfFrame, segmentOffset,
  type PartDims, type PartKind, type MagnetGeometry, type SegmentLayout,
} from '../parts/registry';
import { closestOnShape, shapeBounds, type CollisionShape, type ConvexShape } from '../parts/shapes';
import {
  chargeInteraction, cylinderCharges, blockCharges, imageCharges, plateSaturationFactor, ringsForGap, dipoleMoment,
  type Charge, type Vec3 as MVec3,
} from '../engineering/magnets';
import { neoHookeanBandForce } from '../engineering/mechanics';
import { bondCapacity, checkBond, type BondCapacity, type BondLoads } from '../engineering/fracture';
import { composePose, cross, dot, length, normalize, relativePose, rotate, sub, add, scale, transformPoint } from '../doc/math';
import {
  ID3, ZERO3, RigidFit, angularRows, inverse3, mat3Vec, normQuat, pointRows, pointVelocity, projectors, quatConj,
  quatFromRotationVector, quatMul, rotationVector, scaleMat, solveRows, tangents, worldInertia, type Entity, type Row,
} from './rigid';
import type { Connection, Endpoint, Part, PartDamage, Pose, Quat, SimSettings, Vec3 } from '../doc/types';
import type { ConnectionLoad, EnvironmentBox, GrabMode, PhysicsEvent, PhysicsOp, StepResult } from './protocol';

type J = typeof JoltNS;

const LAYER_STATIC = 0;
const LAYER_MOVING = 1;
export const TICK = 1 / 90;
const MAX_SUBSTEPS = 8;
/** Largest omega * dt per substep at which a spring is still simulated accurately (spike: 0.11 -> 0.36% period error). */
const SUBSTEP_OMEGA_DT = 0.12;
const SUBGROUPS = 4096;
/** A fractured bond whose faces are still this well aligned (rad) lets its two pieces collide with each other. */
const CLEAN_BREAK_ANGLE = 0.15;
const IDENTITY_Q: Quat = [0, 0, 0, 1];
const BOND_VELOCITY_STEPS = 20;
const BOND_POSITION_STEPS = 4;

/** One Jolt body: a whole part, or one segment of a breakable part. */
interface BodyRec {
  /** Body id: the part id, or "part#k" for segment k. */
  id: string;
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
  magnet?: { geom: MagnetGeometry; Br: number };
  frozen: boolean;
  grabbed: GrabMode | null;
  inFluid: boolean;
  /** Body-space inertia tensor (row-major 3x3), read from Jolt; null for static bodies. */
  Iloc: number[] | null;
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
  kind: 'anchor' | 'hinge' | 'contact';
  /** Bodies on the row's a and b sides (for per-body impulse bookkeeping; null = world / immovable). */
  ma: BodyRec | null;
  mb: BodyRec | null;
  anchor?: Anchor;
  bond?: BondRec;
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
  private grabs = new Map<string, Grab>();
  private sim: SimSettings;
  private channels: Record<string, number> = { throttle: 0, steer: 0, aux: 0, always: 1 };
  private events: PhysicsEvent[] = [];
  private slotVersion = 1;
  private slotsDirty = true;
  private time = 0;
  private ticks = 0;
  private opts: WorldOptions = { maxMagnetRings: 4, filterTicks: 2 };
  private lastSubsteps = 1;
  private lastMagnetPairs = 0;
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
    settings.mPenetrationSlop = 0.002;
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

  destroy() {
    this.J.destroy(this.jolt);
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
    switch (op.op) {
      case 'environment': return this.setEnvironment(op.boxes, op.materials);
      case 'clear': return this.clear();
      case 'upsertPart': return this.upsertPart(op.part, op.material, op.keepLivePose);
      case 'removePart': return this.removePart(op.id);
      case 'upsertConnection': return this.upsertConnection(op.conn, op.materials);
      case 'removeConnection': return this.removeConnection(op.id);
      case 'sim': return this.applySim(op.sim);
      case 'setPose': return this.setPose(op.id, op.pose, op.linear, op.angular);
      case 'impulse': return this.impulse(op.id, op.point, op.impulse);
      case 'grab': return this.grab(op.hand, op.id, op.mode, op.target, op.strength);
      case 'grabTarget': { const g = this.grabs.get(op.hand); if (g) g.target = op.target; return; }
      case 'release': return this.release(op.hand, op.linear, op.angular);
      case 'controls': this.channels = { ...this.channels, ...op.channels, always: 1 }; return;
      case 'damage': return this.setDamage(op.id, op.damage);
      case 'options': this.opts = { ...this.opts, ...(op.maxMagnetRings ? { maxMagnetRings: op.maxMagnetRings } : {}), ...(op.filterTicks ? { filterTicks: op.filterTicks } : {}) }; return;
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
    }
  }

  clear() {
    for (const id of [...this.conns.keys()]) this.removeConnection(id);
    for (const id of [...this.parts.keys()]) this.removePart(id);
    this.grabs.clear();
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
    const mass = volume * material.density;
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
      const shape = this.buildShape(shapeDesc, material.density);
      const motion = part.frozen ? J.EMotionType_Static : J.EMotionType_Dynamic;
      const cs = new J.BodyCreationSettings(shape, this.R(pose.p), this.Q(pose.q), motion, LAYER_MOVING);
      shape.Release();
      const slot = this.allocSlot(reuse);
      const subgroup = this.allocSubgroup();
      cs.mAllowDynamicOrKinematic = true;
      cs.mFriction = material.friction;
      cs.mRestitution = material.restitution;
      cs.mLinearDamping = 0;
      cs.mAngularDamping = 0.02;
      cs.mMaxAngularVelocity = 400;
      // Torque-free bodies conserve angular momentum (tumbling, precession), not angular velocity. Segments of
      // breakable parts get this at the level of the whole rigid assembly in the projection instead.
      cs.mApplyGyroscopicForce = !layout;
      cs.mUserData = slot + 1;
      cs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia;
      cs.mMassPropertiesOverride.mMass = mass;
      if (dims.b < 0.03) cs.mMotionQuality = J.EMotionQuality_LinearCast;
      this.cg.SetSubGroupID(subgroup);
      cs.mCollisionGroup = this.cg;
      const body = this.bi.CreateBody(cs);
      J.destroy(cs);
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
        magnet: magGeom && material.remanence ? { geom: magGeom, Br: material.remanence } : undefined,
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
  }

  private impulse(id: string, point: Vec3, imp: Vec3) {
    const r = this.bodyFor(id, point);
    if (!r || r.frozen) return;
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
  private hinges: BondRec[] = [];
  private watch = new Set<BodyRec>();
  private contacts = new Map<string, RecordedContact>();
  /** Accumulated impulses of last tick's assembly rows, by row key. */
  private warm = new Map<string, number>();

  /** Before the step: rigid assemblies, plastic hinges, and the state their bodies start the tick in. */
  private prepareClusters() {
    this.clusters = [];
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
      for (const r of comp) {
        const [v, w] = this.velocityOf(r);
        r.prior = { pose: this.poseOf(r), v, w };
        this.watch.add(r);
      }
      this.clusters.push({ comp, adj });
    }
    for (const b of this.hinges) for (const r of [b.a, b.b]) {
      if (this.watch.has(r)) continue;
      const [v, w] = this.velocityOf(r);
      r.prior = { pose: this.poseOf(r), v, w };
      this.watch.add(r);
    }
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
  private recordContact(b1: JoltNS.Body, b2: JoltNS.Body, man: JoltNS.ContactManifold, settings: JoltNS.ContactSettings) {
    const r1 = this.recOf(b1), r2 = this.recOf(b2);
    const w1 = !!r1 && this.watch.has(r1), w2 = !!r2 && this.watch.has(r2);
    if (!w1 && !w2) return;
    // the watched body is the "member" side; the normal points from it to the other body
    const flip = !w1;
    const m = (flip ? r2 : r1)!, o = flip ? r1 : r2;
    const mb = flip ? b2 : b1, ob = flip ? b1 : b2;
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
    if (!this.clusters.length && !this.hinges.length) return;
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
          e: { origin: pose.p, v, w, invMass: still ? 0 : 1 / r.mass, invI: still ? [...ZERO3] : inverse3(worldInertia(r.Iloc!, pose.q)) },
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
        let target = sep < 0 ? Math.max(0, -sep - 0.002) * beta : -sep / dt;
        const vm0 = em.work ? pointVelocity(em.work.priorEnt, pm) : pointVelocity({ ...em.e, v: em.v0, w: em.w0 }, pm);
        const vo = eo ? pointVelocity({ ...eo.e, v: eo.v0, w: eo.w0 }, po) : still ? pointVelocity(still, po) : [0, 0, 0] as Vec3;
        const vPre = dot(sub(vo, vm0), c.n);
        if (vPre < -1) target = Math.max(target, -c.restitution * vPre);
        const normal: Row = { a: em.e, b: eo ? eo.e : still, kind: 'linear', pa: pm, pb: po, dir: c.n, target, lo: 0, hi: Infinity, acc: 0, tag, key };
        rows.push(normal);
        // friction rows along fixed tangents keep their identity from tick to tick for warm starting
        [t1, t2].forEach((t, ti) => rows.push({ a: em.e, b: eo ? eo.e : still, kind: 'linear', pa: pm, pb: po, dir: t, target: 0, lo: 0, hi: 0, frictionOf: normal, mu: c.friction, acc: 0, tag, key: `${key}:t${ti}` }));
      }
      em.touched = true;
      if (eo) eo.touched = true;
    }
    solveRows(rows, 12, this.warm);
    // integrate from tick start with the solved velocity (semi-implicit Euler, as Jolt itself does)
    for (const w of works) this.placeCluster(w, anchored, dt);
    for (const en of ents.values()) {
      if (en.work || !en.touched || !en.single || (en.e.invMass === 0 && !en.fixed.length)) continue;
      const r = en.single;
      const cur = this.poseOf(r);
      const pin = en.fixed[0];
      const pinTarget = pin ? (pin.a.other && pin.a.otherFrame ? composePose(this.poseOf(pin.a.other), pin.a.otherFrame) : pin.a.c.worldB) : null;
      const pose: Pose = pin && pinTarget
        ? composePose(pinTarget, invertPose(pin.a.frame))
        : en.start
        ? { p: add(en.start.p, scale(en.e.v, dt)), q: normQuat(quatMul(quatFromRotationVector(scale(en.e.w, dt)), en.start.q)) }
        : { p: add(cur.p, scale(sub(en.e.v, en.v0), dt)), q: normQuat(quatMul(quatFromRotationVector(scale(sub(en.e.w, en.w0), dt)), cur.q)) };
      this.r1.Set(...pose.p);
      this.q1.Set(...pose.q);
      this.v1.Set(...en.e.v);
      this.v2.Set(...en.e.w);
      this.bi.SetPositionRotationAndVelocity(r.body.GetID(), this.r1, this.q1, this.v1, this.v2);
    }
    // impulses our rows put on each body (linear, and angular about the world origin)
    const ourP = new Map<BodyRec, Vec3>(), ourL = new Map<BodyRec, Vec3>();
    const put = (r: BodyRec | null, J: Vec3, L: Vec3) => {
      if (!r) return;
      ourP.set(r, add(ourP.get(r) ?? [0, 0, 0], J));
      ourL.set(r, add(ourL.get(r) ?? [0, 0, 0], L));
    };
    const anchorAcc = new Map<Anchor, { J: Vec3; T: Vec3 }>();
    const hingeAcc = new Map<BondRec, { J: Vec3; T: Vec3 }>();
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
      }
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

  /** End-of-tick pose of an assembly: its start pose advanced by the solved motion, anchored DOFs pinned. */
  private placeCluster(w: FittedCluster, anchored: Map<BodyRec, Anchor[]>, dt: number) {
    const { comp, T, C0, com0, ent, M } = w;
    const dq = quatFromRotationVector(scale(ent.e.w, dt));
    const comE = add(com0, scale(ent.e.v, dt));
    let C: Pose = { p: add(comE, rotate(dq, sub(C0.p, com0))), q: normQuat(quatMul(dq, C0.q)) };
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
    }
    comp.forEach((r, i) => {
      const np = composePose(C, T[i]!);
      const v = add(ent.e.v, cross(ent.e.w, sub(np.p, comE)));
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
    const wPred = mat3Vec(invIc, add(add(L0, dLsum), scale(cross(L0, u0.w), dt)));
    const vPred = add(u0.v, scale(dPsum, 1 / M));
    const ent: Ent = { e: { origin: com0, v: vPred, w: wPred, invMass: 1 / M, invI: invIc }, work: null, single: null, touched: false, start: null, v0: [...u0.v] as Vec3, w0: [...u0.w] as Vec3, fixed: [] };
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
    const tP = subP[order[0]!]!, tL = subL[order[0]!]!;
    for (const r of comp) for (const { e } of w.adj.get(r)!) {
      if (e.bond) { e.bond.corrF = [0, 0, 0]; e.bond.corrT = [0, 0, 0]; } else if (e.conn) { e.conn.corrF = [0, 0, 0]; e.conn.corrT = [0, 0, 0]; }
    }
    for (let k = 1; k < order.length; k++) {
      const j = order[k]!, p = parent[j]!;
      if (low[j]! <= disc[p]!) continue; // not a bridge
      const e = parentEdge[j]!;
      const childIsV = e.v === comp[j];
      const vP = childIsV ? subP[j]! : sub(tP, subP[j]!);
      const vL = childIsV ? subL[j]! : sub(tL, subL[j]!);
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

  private grab(hand: string, id: string, mode: GrabMode, target: Pose, strength: number) {
    const r = this.bodyFor(id, target.p);
    if (!r) return;
    this.release(hand);
    // Frozen parts are always moved precisely; physical grabbing applies to free parts.
    const m: GrabMode = r.frozen ? 'creative' : mode;
    const members = this.cluster(r);
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
      // Physical grab: a critically damped spring to the hand, limited to human strength.
      const pose = this.poseOf(r);
      const lv = this.bi.GetLinearVelocity(bid);
      const av = this.bi.GetAngularVelocity(bid);
      const w = 2 * Math.PI * 5;
      const err = sub(g.target.p, pose.p);
      const v: Vec3 = [lv.GetX(), lv.GetY(), lv.GetZ()];
      let F = sub(scale(err, g.mass * w * w), scale(v, 2 * g.mass * w));
      const fl = length(F);
      if (fl > g.strength) F = scale(F, g.strength / fl);
      // orientation error as axis * angle
      const qe = quatMul(g.target.q, quatConj(pose.q));
      const sgn = qe[3] < 0 ? -1 : 1;
      const angle = 2 * Math.acos(Math.min(1, Math.abs(qe[3])));
      const s = Math.sqrt(Math.max(1e-12, 1 - qe[3] * qe[3]));
      const axis: Vec3 = [(qe[0] * sgn) / s, (qe[1] * sgn) / s, (qe[2] * sgn) / s];
      const I = g.inertia;
      const wv: Vec3 = [av.GetX(), av.GetY(), av.GetZ()];
      let T = sub(scale(axis, angle * I * w * w), scale(wv, 2 * I * w));
      const maxT = g.strength * 0.12; // wrist torque ~ 30 N m at 250 N
      const tl = length(T);
      if (tl > maxT) T = scale(T, maxT / tl);
      this.v1.Set(...F);
      this.v2.Set(...T);
      this.bi.AddForceAndTorque(bid, this.v1, this.v2, this.J.EActivation_Activate);
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
    if (rec.status !== 'broken' && rec.derived.instantFailure) {
      rec.status = 'broken';
      this.events.push({ type: 'break', conn: rec.id, mode: 'instant', load: 0, capacity: 0, point: this.anchorWorld(rec).p, note: rec.derived.instantFailure });
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
    return c.kind.derive({
      params: c.conn.params,
      matA: c.a.material,
      matB,
      thicknessA: c.a.dims.b,
      thicknessB: c.b ? c.b.dims.b : c.a.dims.b,
      distance: length(sub(wb.p, wa.p)),
      cure: this.sim.cureClock <= 0 ? 1e12 : c.cure,
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
    for (const k of [c.constraint, ...c.extra]) if (k) this.ps.RemoveConstraint(k);
    c.constraint = null;
    c.extra = [];
    c.typed = null;
    this.setPairCollision(c, true);
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
          ms.mSpringSettings.mDamping = 2 * 0.05 * Math.sqrt(rv.torsionSpring.k * this.effInertia(c));
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
  }

  private effMass(c: ConnRec) {
    const ma = c.a.frozen ? Infinity : this.clusterMass(c.a);
    const mb = !c.b || c.b.frozen ? Infinity : this.clusterMass(c.b);
    if (!Number.isFinite(ma) && !Number.isFinite(mb)) return 1;
    if (!Number.isFinite(ma)) return mb;
    if (!Number.isFinite(mb)) return ma;
    return (ma * mb) / (ma + mb);
  }

  /** Effective moment of inertia of the two bodies about a world axis (reduced, like effMass). */
  private axisInertia(c: ConnRec, axis: Vec3): number {
    const invI = (r: BodyRec | null) => {
      if (!r || r.frozen) return 0;
      const m = this.bi.GetInverseInertia(r.body.GetID());
      const v = m.Multiply3x3(this.V(axis));
      return v.GetX() * axis[0] + v.GetY() * axis[1] + v.GetZ() * axis[2];
    };
    const total = invI(c.a) + invI(c.b);
    return total > 0 ? 1 / total : Infinity;
  }

  /**
   * Reduced moment of inertia of the two sides of a joint about its axis (a line through `point`): each side is the
   * body's still-bonded run of segments, with the parallel-axis term for every piece.
   */
  private jointAxisInertia(c: ConnRec, axis: Vec3, point: Vec3) {
    const side = (r: BodyRec | null) => {
      if (!r || r.frozen || !r.Iloc) return Infinity;
      let I = 0;
      for (const s of this.cluster(r)) {
        const pose = this.poseOf(s);
        const d = sub(pose.p, point);
        const perp = sub(d, scale(axis, dot(d, axis)));
        I += dot(axis, mat3Vec(worldInertia(s.Iloc!, pose.q), axis)) + s.mass * dot(perp, perp);
      }
      return Math.max(I, 1e-9);
    };
    const ia = side(c.a), ib = side(c.b);
    if (!Number.isFinite(ia) && !Number.isFinite(ib)) return 1;
    if (!Number.isFinite(ia)) return ib;
    if (!Number.isFinite(ib)) return ia;
    return (ia * ib) / (ia + ib);
  }

  private effInertia(c: ConnRec) {
    const I = (r: BodyRec) => (r.frozen ? Infinity : this.clusterInertia(r));
    const ia = I(c.a);
    const ib = c.b ? I(c.b) : Infinity;
    if (!Number.isFinite(ia) && !Number.isFinite(ib)) return 1;
    if (!Number.isFinite(ia)) return ib;
    if (!Number.isFinite(ib)) return ia;
    return (ia * ib) / (ia + ib);
  }

  // ---------------------------------------------------------------------------------------------
  // per-tick external effects

  private applyFields(dt: number) {
    this.applyMagnets();
    this.applyFluids(dt);
    if (this.sim.airDrag) this.applyAirDrag();
    this.applyBands();
    this.driveJoints();
    this.driveGrabs(dt);
  }

  private applyMagnets() {
    this.lastMagnetPairs = 0;
    if (!this.sim.magnetism) return;
    const g = length(this.sim.gravity) || 9.81;
    const magnets = [...this.bodies.values()].filter((r) => r.magnet);
    if (magnets.length === 0) return;
    const ferro = [...this.bodies.values()].filter((r) => !r.magnet && r.material.ferromagnetic);
    const info = magnets.map((r) => {
      const pose = this.poseOf(r);
      const geom = r.magnet!.geom;
      const n = rotate(pose.q, [0, 1, 0]);
      const size = geom.shape === 'cylinder' ? geom.radius : Math.max(geom.w, geom.h) / 2;
      const vol = geom.shape === 'cylinder' ? Math.PI * geom.radius ** 2 * geom.length : geom.w * geom.h * geom.length;
      return { r, pose, n, size, m: dipoleMoment(r.magnet!.Br, vol), bound: Math.hypot(size, geom.length / 2) };
    });
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
        const A = info[i]!, B = info[j]!;
        if (A.r.frozen && B.r.frozen) continue;
        const dvec = sub(B.pose.p, A.pose.p);
        const dist = length(dvec);
        const light = Math.min(A.r.frozen ? Infinity : A.r.mass, B.r.frozen ? Infinity : B.r.mass);
        // Cutoff where the dipole force drops below 0.1% of the lighter magnet's weight.
        const cutoff = Math.pow((3 * MU0 * A.m * B.m) / (2 * Math.PI * 0.001 * light * g), 0.25);
        if (dist > cutoff) continue;
        const gap = Math.max(0, dist - A.bound - B.bound);
        const rings = Math.min(this.opts.maxMagnetRings, ringsForGap(gap, Math.min(A.size, B.size)));
        const f = chargeInteraction(chargesOf(A, rings), chargesOf(B, rings), B.pose.p as MVec3);
        const F: Vec3 = [f[0]!, f[1]!, f[2]!];
        const TB: Vec3 = [f[3]!, f[4]!, f[5]!];
        const TA = sub(scale(TB, -1), cross(dvec, F));
        this.applyForceTorque(B.r, F, TB);
        this.applyForceTorque(A.r, scale(F, -1), TA);
        this.lastMagnetPairs++;
      }
    }
    // magnet <-> ferromagnetic parts (method of images on the nearest steel face)
    for (const M of info) {
      for (const S of ferro) {
        if (M.r.frozen && S.frozen) continue;
        const sp = this.poseOf(S);
        const dist = length(sub(sp.p, M.pose.p));
        const reach = Math.hypot(S.dims.length, S.dims.a) / 2 + Math.pow((3 * MU0 * M.m * M.m) / (2 * Math.PI * 0.001 * M.r.mass * g), 0.25);
        if (dist > reach) continue;
        const local = rotate(quatConj(sp.q), sub(M.pose.p, sp.p));
        const hit = closestOnShape(S.shape, local);
        const o = add(sp.p, rotate(sp.q, hit.p));
        const nrm = normalize(rotate(sp.q, hit.n));
        const gap = Math.max(0, hit.d - M.bound);
        const rings = Math.min(this.opts.maxMagnetRings, ringsForGap(gap, M.size));
        const geom = M.r.magnet!.geom;
        const poleArea = geom.shape === 'cylinder' ? Math.PI * geom.radius ** 2 : geom.w * geom.h;
        const polePerimeter = geom.shape === 'cylinder' ? 2 * Math.PI * geom.radius : 2 * (geom.w + geom.h);
        const factor = 0.95 * plateSaturationFactor(S.dims.b, M.r.magnet!.Br, poleArea, polePerimeter);
        const mc = chargesOf(M, rings);
        const img = imageCharges(mc, o as MVec3, nrm as MVec3, factor);
        const f = chargeInteraction(img, mc, M.pose.p as MVec3);
        const F: Vec3 = [f[0]!, f[1]!, f[2]!];
        this.applyForceTorque(M.r, F, [f[3]!, f[4]!, f[5]!]);
        if (!S.frozen) {
          this.v1.Set(-F[0], -F[1], -F[2]);
          this.r1.Set(...o);
          this.bi.AddForce(S.body.GetID(), this.v1, this.r1, this.J.EActivation_Activate);
        }
        this.lastMagnetPairs++;
      }
    }
  }

  private applyForceTorque(r: BodyRec, F: Vec3, T: Vec3) {
    if (r.frozen || r.grabbed === 'creative') return;
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
      F *= 1 + 0.1 * Math.tanh(vrel * 4);
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
      if (rv.motor) {
        const m = rv.motor;
        const u = Math.max(-1, Math.min(1, this.channels[m.channel] ?? 0)) * (m.reverse ? -1 : 1);
        // Linear torque-speed line at the applied voltage: tau = stall*u - (stall/noLoad) * w.
        const target = m.noLoad * u;
        const tau = Math.abs(m.stall * u - (m.stall / Math.max(m.noLoad, 1e-6)) * wrel);
        h.SetTargetAngularVelocity(target);
        const ms = h.GetMotorSettings();
        const lim = Math.max(tau, 0.001 * m.stall);
        ms.mMinTorqueLimit = -lim;
        ms.mMaxTorqueLimit = lim;
        if (Math.abs(u) > 0.01) {
          this.bi.ActivateBody(c.a.body.GetID());
          if (c.b) this.bi.ActivateBody(c.b.body.GetID());
        }
      } else if (rv.servo) {
        const u = Math.max(-1, Math.min(1, this.channels[rv.servo.channel] ?? 0));
        h.SetTargetAngle(u * rv.servo.range);
        if (Math.abs(u) > 0.01) this.bi.ActivateBody(c.a.body.GetID());
      } else if (rv.eddy) {
        // Viscous brake realised implicitly: a velocity motor to zero whose torque budget removes exactly the
        // momentum an exponential decay w(t) = w0 exp(-c t / I) would over this tick (stable for any c / I).
        h.SetTargetAngularVelocity(0);
        const ms = h.GetMotorSettings();
        const I = this.axisInertia(c, axis);
        const lim = Number.isFinite(I) ? ((I / TICK) * (1 - Math.exp((-rv.eddy.c * TICK) / I))) * Math.abs(wrel) : rv.eddy.c * Math.abs(wrel);
        ms.mMinTorqueLimit = -lim;
        ms.mMaxTorqueLimit = lim;
      }
      if (rv.bearingMu > 0) {
        h.SetMaxFrictionTorque(0.5 * rv.bearingMu * c.lastPositionLambda * rv.boreDiameter + rv.frictionTorque);
      }
      c.load.extent = h.GetCurrentAngle();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // stepping

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
    return Math.min(MAX_SUBSTEPS, n);
  }

  /** Advance one fixed tick. */
  step(): StepResult {
    const t0 = performance.now();
    const dt = TICK;
    this.applyFields(dt);
    const n = this.substepsNeeded();
    this.lastSubsteps = n;
    this.prepareClusters();
    this.jolt.Step(dt, n);
    this.solveAssemblies(dt);
    this.time += dt;
    this.ticks++;
    this.evaluateConnections(dt, n);
    this.evaluateBonds(n / dt);
    const stepMs = performance.now() - t0;
    return this.collect(stepMs);
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
      },
    };
    if (this.slotsDirty) {
      this.slotVersion++;
      result.slotVersion = this.slotVersion;
      result.slots = this.bySlot.map((r) => r?.id ?? null);
      this.slotsDirty = false;
    }
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
          bending = Math.hypot(lr.GetComponent(0), lr.GetComponent(1)) * inv;
          break;
        }
        case 'prismatic': {
          const sl = c.typed as JoltNS.SliderConstraint;
          const lp = sl.GetTotalLambdaPosition();
          shear = Math.hypot(lp.GetComponent(0), lp.GetComponent(1)) * inv;
          const lr = sl.GetTotalLambdaRotation();
          bending = Math.hypot(lr.GetX(), lr.GetY(), lr.GetZ()) * inv;
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
          axial = Math.abs(dc.GetTotalLambdaPosition() * inv);
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
          this.events.push({ type: 'slip', conn: c.id, point: frame.p, note: `Slipped: ${shear > c.derived.slip.shear ? 'shear' : 'torsion'} beat friction grip (${Math.round(Math.max(shear, torsion))} vs ${Math.round(c.derived.slip.shear)})` });
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
          note: `${c.kind.label} failed in ${mode}: ${fmtN(load)} on a ${fmtN(capacity)} capacity`,
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
      if (!this.watch.size) return;
      this.recordContact(J.wrapPointer(b1p, J.Body), J.wrapPointer(b2p, J.Body), J.wrapPointer(manp, J.ContactManifold), J.wrapPointer(setp, J.ContactSettings));
    };
    listener.OnContactRemoved = () => {};
    listener.OnContactAdded = (b1p: number, b2p: number, manp: number, setp: number) => {
      const b1 = J.wrapPointer(b1p, J.Body);
      const b2 = J.wrapPointer(b2p, J.Body);
      const man = J.wrapPointer(manp, J.ContactManifold);
      if (this.watch.size) this.recordContact(b1, b2, man, J.wrapPointer(setp, J.ContactSettings));
      if (this.events.length > 48) return;
      const n = man.mWorldSpaceNormal;
      const normal: Vec3 = [n.GetX(), n.GetY(), n.GetZ()];
      const cp = man.GetWorldSpaceContactPointOn1(0);
      const point: Vec3 = [cp.GetX(), cp.GetY(), cp.GetZ()];
      const v1 = bodyPointVelocity(b1, point);
      const v2 = bodyPointVelocity(b2, point);
      const speed = Math.abs(dot(sub(v2, v1), normal));
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

function bodyPointVelocity(b: JoltNS.Body, p: Vec3): Vec3 {
  if (b.IsStatic()) return [0, 0, 0];
  const lv = b.GetLinearVelocity();
  const av = b.GetAngularVelocity();
  const com = b.GetCenterOfMassPosition();
  const r: Vec3 = [p[0] - com.GetX(), p[1] - com.GetY(), p[2] - com.GetZ()];
  const w: Vec3 = [av.GetX(), av.GetY(), av.GetZ()];
  const wr = cross(w, r);
  return [lv.GetX() + wr[0], lv.GetY() + wr[1], lv.GetZ() + wr[2]];
}

/** Which DOFs a joint to an immovable support holds: point directions and rotation directions (projectors). */
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

function bodyPose(b: JoltNS.Body): Pose {
  const p = b.GetPosition(), q = b.GetRotation();
  return { p: [p.GetX(), p.GetY(), p.GetZ()], q: [q.GetX(), q.GetY(), q.GetZ(), q.GetW()] };
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
