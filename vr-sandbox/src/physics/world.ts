// The physics world: parts become Jolt bodies, connections become Jolt constraints, and every tick the
// real forces carried by each constraint are read back and checked against spec-derived capacities.
// Nothing here knows about specific builds; behaviour comes only from geometry, materials and specs.

import type JoltNS from 'jolt-physics';
import type { Material } from '../data/materials';
import { getConnectorKind, type ConnectorKind, type Derived } from '../connectors/registry';
import { getPartKind, effectiveParams, type PartDims, type PartKind, type MagnetGeometry } from '../parts/registry';
import { closestOnShape, shapeBounds, type CollisionShape, type ConvexShape } from '../parts/shapes';
import {
  chargeInteraction, cylinderCharges, blockCharges, imageCharges, plateSaturationFactor, ringsForGap, dipoleMoment,
  type Charge, type Vec3 as MVec3,
} from '../engineering/magnets';
import { neoHookeanBandForce } from '../engineering/mechanics';
import { composePose, cross, dot, length, normalize, rotate, sub, add, scale } from '../doc/math';
import type { Connection, Part, Pose, Quat, SimSettings, Vec3 } from '../doc/types';
import type { ConnectionLoad, EnvironmentBox, GrabMode, PhysicsEvent, PhysicsOp, StepResult } from './protocol';

type J = typeof JoltNS;

const LAYER_STATIC = 0;
const LAYER_MOVING = 1;
export const TICK = 1 / 90;
const MAX_SUBSTEPS = 8;
/** Largest omega * dt per substep at which a spring is still simulated accurately (spike: 0.11 -> 0.36% period error). */
const SUBSTEP_OMEGA_DT = 0.12;
const SUBGROUPS = 4096;

interface BodyRec {
  id: string;
  slot: number;
  subgroup: number;
  body: JoltNS.Body;
  part: Part;
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
}

interface ConnRec {
  id: string;
  conn: Connection;
  kind: ConnectorKind;
  derived: Derived;
  a: BodyRec;
  b: BodyRec | null;
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
}

interface Grab {
  hand: string;
  rec: BodyRec;
  mode: GrabMode;
  target: Pose;
  strength: number;
  prevMotion: 'static' | 'dynamic';
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
  private bodies = new Map<string, BodyRec>();
  private bySlot: (BodyRec | null)[] = [];
  private freeSlots: number[] = [];
  private freeSubgroups: number[] = [];
  private nextSubgroup = 1;
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
    for (const id of [...this.bodies.keys()]) this.removePart(id);
    this.grabs.clear();
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

  private allocSlot(): number {
    const s = this.freeSlots.pop();
    if (s !== undefined) return s;
    this.bySlot.push(null);
    return this.bySlot.length - 1;
  }

  private allocSubgroup(): number {
    const s = this.freeSubgroups.pop();
    if (s !== undefined) return s;
    if (this.nextSubgroup >= SUBGROUPS) return 0; // beyond the table: shares subgroup 0 (no self-collision filtering)
    return this.nextSubgroup++;
  }

  upsertPart(part: Part, material: Material, keepLivePose: boolean) {
    const J = this.J;
    const existing = this.bodies.get(part.id);
    let pose = part.pose;
    let linear: Vec3 = [0, 0, 0];
    let angular: Vec3 = [0, 0, 0];
    if (existing && keepLivePose) {
      pose = this.poseOf(existing);
      const lv = this.bi.GetLinearVelocity(existing.body.GetID());
      const av = this.bi.GetAngularVelocity(existing.body.GetID());
      linear = [lv.GetX(), lv.GetY(), lv.GetZ()];
      angular = [av.GetX(), av.GetY(), av.GetZ()];
    }
    // Connections attached to this part must be rebuilt against the new body.
    const attached = [...this.conns.values()].filter((c) => c.a.id === part.id || c.b?.id === part.id);
    for (const c of attached) this.destroyConstraint(c);
    const slot = existing ? existing.slot : this.allocSlot();
    const subgroup = existing ? existing.subgroup : this.allocSubgroup();
    if (existing) this.destroyBody(existing);

    const kind = getPartKind(part.kind);
    const params = effectiveParams(kind, part.params, material);
    const shapeDesc = kind.collision(params);
    const volume = Math.max(kind.volume(params, material), 1e-9);
    const mass = volume * material.density;
    const shape = this.buildShape(shapeDesc, material.density);
    const motion = part.frozen ? J.EMotionType_Static : J.EMotionType_Dynamic;
    const cs = new J.BodyCreationSettings(shape, this.R(pose.p), this.Q(pose.q), motion, LAYER_MOVING);
    shape.Release();
    cs.mAllowDynamicOrKinematic = true;
    cs.mFriction = material.friction;
    cs.mRestitution = material.restitution;
    cs.mLinearDamping = 0;
    cs.mAngularDamping = 0.02;
    cs.mMaxAngularVelocity = 400;
    cs.mUserData = slot + 1;
    cs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia;
    cs.mMassPropertiesOverride.mMass = mass;
    const dims = kind.dims(params);
    if (dims.b < 0.03) cs.mMotionQuality = J.EMotionQuality_LinearCast;
    this.cg.SetSubGroupID(subgroup);
    cs.mCollisionGroup = this.cg;
    const body = this.bi.CreateBody(cs);
    J.destroy(cs);
    this.bi.AddBody(body.GetID(), part.frozen ? J.EActivation_DontActivate : J.EActivation_Activate);
    if (!part.frozen && (length(linear) > 0 || length(angular) > 0)) {
      this.v1.Set(...linear);
      this.v2.Set(...angular);
      this.bi.SetLinearAndAngularVelocity(body.GetID(), this.v1, this.v2);
    }
    const bounds = shapeBounds(shapeDesc);
    const ext = sub(bounds.max, bounds.min);
    const magGeom = kind.magnet?.(params);
    const rec: BodyRec = {
      id: part.id, slot, subgroup, body, part, kind, material, shape: shapeDesc, dims, mass, volume,
      faceAreas: [ext[1] * ext[2], ext[0] * ext[2], ext[0] * ext[1]],
      magnet: magGeom && material.remanence ? { geom: magGeom, Br: material.remanence } : undefined,
      frozen: part.frozen, grabbed: null, inFluid: false,
    };
    this.bodies.set(part.id, rec);
    this.bySlot[slot] = rec;
    this.slotsDirty = true;
    for (const c of attached) {
      if (c.a.id === part.id) c.a = rec;
      if (c.b?.id === part.id) c.b = rec;
      this.buildConstraint(c);
    }
    // re-grab if this part was held
    for (const g of this.grabs.values()) if (g.rec.id === part.id) { g.rec = rec; if (g.mode === 'creative') this.bi.SetMotionType(body.GetID(), J.EMotionType_Kinematic, J.EActivation_Activate); }
  }

  private destroyBody(r: BodyRec) {
    const id = r.body.GetID();
    this.bi.RemoveBody(id);
    this.bi.DestroyBody(id);
  }

  removePart(id: string) {
    const r = this.bodies.get(id);
    if (!r) return;
    for (const c of [...this.conns.values()]) if (c.a.id === id || c.b?.id === id) this.removeConnection(c.id);
    for (const [hand, g] of this.grabs) if (g.rec.id === id) this.grabs.delete(hand);
    this.destroyBody(r);
    this.bodies.delete(id);
    this.bySlot[r.slot] = null;
    this.freeSlots.push(r.slot);
    if (r.subgroup > 0) {
      // re-enable any pairs this subgroup had disabled before recycling it
      for (let other = 0; other < SUBGROUPS; other++) {
        if (other !== r.subgroup && !this.groupFilter.IsCollisionEnabled(r.subgroup, other)) this.groupFilter.EnableCollision(r.subgroup, other);
      }
      this.freeSubgroups.push(r.subgroup);
    }
    this.slotsDirty = true;
  }

  private poseOf(r: BodyRec): Pose {
    const p = r.body.GetPosition();
    const q = r.body.GetRotation();
    return { p: [p.GetX(), p.GetY(), p.GetZ()], q: [q.GetX(), q.GetY(), q.GetZ(), q.GetW()] };
  }

  livePose(id: string): Pose | null {
    const r = this.bodies.get(id);
    return r ? this.poseOf(r) : null;
  }

  private setPose(id: string, pose: Pose, linear?: Vec3, angular?: Vec3) {
    const r = this.bodies.get(id);
    if (!r) return;
    const bid = r.body.GetID();
    this.r1.Set(...pose.p);
    this.q1.Set(...pose.q);
    this.bi.SetPositionAndRotation(bid, this.r1, this.q1, r.frozen ? this.J.EActivation_DontActivate : this.J.EActivation_Activate);
    if (!r.frozen) {
      this.v1.Set(...(linear ?? [0, 0, 0]));
      this.v2.Set(...(angular ?? [0, 0, 0]));
      this.bi.SetLinearAndAngularVelocity(bid, this.v1, this.v2);
    }
    // constraints were built against the old pose
    for (const c of this.conns.values()) if (c.a === r || c.b === r) this.buildConstraint(c);
  }

  private impulse(id: string, point: Vec3, imp: Vec3) {
    const r = this.bodies.get(id);
    if (!r || r.frozen) return;
    this.v1.Set(...imp);
    this.r1.Set(...point);
    this.bi.AddImpulse(r.body.GetID(), this.v1, this.r1);
    this.bi.ActivateBody(r.body.GetID());
  }

  // ---------------------------------------------------------------------------------------------
  // grabbing

  private grab(hand: string, id: string, mode: GrabMode, target: Pose, strength: number) {
    const r = this.bodies.get(id);
    if (!r) return;
    this.release(hand);
    const prevMotion = r.frozen ? 'static' : 'dynamic';
    // Frozen parts are always moved precisely; physical grabbing applies to free parts.
    const m: GrabMode = r.frozen ? 'creative' : mode;
    if (m === 'creative') this.bi.SetMotionType(r.body.GetID(), this.J.EMotionType_Kinematic, this.J.EActivation_Activate);
    else this.bi.ActivateBody(r.body.GetID());
    r.grabbed = m;
    this.grabs.set(hand, { hand, rec: r, mode: m, target, strength, prevMotion });
  }

  private release(hand: string, linear?: Vec3, angular?: Vec3) {
    const g = this.grabs.get(hand);
    if (!g) return;
    this.grabs.delete(hand);
    const r = g.rec;
    r.grabbed = null;
    if (g.mode === 'creative') {
      const bid = r.body.GetID();
      if (r.frozen) {
        this.bi.SetMotionType(bid, this.J.EMotionType_Static, this.J.EActivation_DontActivate);
      } else {
        this.bi.SetMotionType(bid, this.J.EMotionType_Dynamic, this.J.EActivation_Activate);
        if (linear || angular) {
          this.v1.Set(...(linear ?? [0, 0, 0]));
          this.v2.Set(...(angular ?? [0, 0, 0]));
          this.bi.SetLinearAndAngularVelocity(bid, this.v1, this.v2);
        }
      }
    }
    // The held part may have moved relative to static joints; rebuild so frames stay consistent.
    if (r.frozen) for (const c of this.conns.values()) if (c.a === r || c.b === r) this.buildConstraint(c);
  }

  private driveGrabs(dt: number) {
    for (const g of this.grabs.values()) {
      const r = g.rec;
      const bid = r.body.GetID();
      if (g.mode === 'creative') {
        this.r1.Set(...g.target.p);
        this.q1.Set(...g.target.q);
        this.bi.MoveKinematic(bid, this.r1, this.q1, dt);
        continue;
      }
      // Physical grab: a critically damped spring to the hand, limited to human strength.
      const pose = this.poseOf(r);
      const lv = this.bi.GetLinearVelocity(bid);
      const av = this.bi.GetAngularVelocity(bid);
      const w = 2 * Math.PI * 5;
      const err = sub(g.target.p, pose.p);
      const v: Vec3 = [lv.GetX(), lv.GetY(), lv.GetZ()];
      let F = sub(scale(err, r.mass * w * w), scale(v, 2 * r.mass * w));
      const fl = length(F);
      if (fl > g.strength) F = scale(F, g.strength / fl);
      // orientation error as axis * angle
      const qe = quatMul(g.target.q, quatConj(pose.q));
      const sgn = qe[3] < 0 ? -1 : 1;
      const angle = 2 * Math.acos(Math.min(1, Math.abs(qe[3])));
      const s = Math.sqrt(Math.max(1e-12, 1 - qe[3] * qe[3]));
      const axis: Vec3 = [(qe[0] * sgn) / s, (qe[1] * sgn) / s, (qe[2] * sgn) / s];
      const I = r.mass * (r.dims.length * r.dims.length + r.dims.a * r.dims.a) / 12 + 1e-6;
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
    const a = this.bodies.get(conn.a.part);
    const b = conn.b ? this.bodies.get(conn.b.part) ?? null : null;
    if (!a || (conn.b && !b)) return;
    const prev = this.conns.get(conn.id);
    if (prev) this.destroyConstraint(prev);
    const kind = getConnectorKind(conn.kind);
    const rec: ConnRec = {
      id: conn.id, conn, kind, derived: undefined as unknown as Derived, a, b, constraint: null, extra: [], typed: null,
      status: conn.state.status, over: 0, slipTicks: 0, cure: prev?.cure ?? conn.state.cure, lastDerive: this.time,
      load: { id: conn.id, u: 0, mode: '', axial: 0, shear: 0, bending: 0, torsion: 0, extent: 0 },
      springRigid: false, omega: 0, bandRest: 0, materials, lastPositionLambda: 0,
    };
    rec.derived = this.derive(rec);
    this.conns.set(conn.id, rec);
    if (rec.status !== 'broken' && rec.derived.instantFailure) {
      rec.status = 'broken';
      this.events.push({ type: 'break', conn: rec.id, mode: 'instant', load: 0, capacity: 0, point: this.anchorWorld(rec).p, note: rec.derived.instantFailure });
    }
    this.buildConstraint(rec);
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
    return composePose(this.poseOf(c.a), c.conn.a.frame);
  }

  private anchorWorldB(c: ConnRec): Pose {
    if (!c.b || !c.conn.b) return composePose(this.poseOf(c.a), c.conn.a.frame);
    return composePose(this.poseOf(c.b), c.conn.b.frame);
  }

  private destroyConstraint(c: ConnRec) {
    for (const k of [c.constraint, ...c.extra]) if (k) this.ps.RemoveConstraint(k);
    c.constraint = null;
    c.extra = [];
    c.typed = null;
    this.setPairCollision(c, true);
  }

  private setPairCollision(c: ConnRec, enabled: boolean) {
    if (!c.b || c.a.subgroup === 0 || c.b.subgroup === 0) return;
    const model = c.kind.model;
    if (model === 'spring' || model === 'rope' || model === 'band') return;
    if (enabled) this.groupFilter.EnableCollision(c.a.subgroup, c.b.subgroup);
    else this.groupFilter.DisableCollision(c.a.subgroup, c.b.subgroup);
  }

  private buildConstraint(c: ConnRec) {
    const J = this.J;
    this.destroyConstraint(c);
    if (c.status === 'broken') return;
    const wa = this.anchorWorld(c);
    const wb = c.b ? this.anchorWorldB(c) : wa;
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
          const ms = s.mMotorSettings;
          ms.mSpringSettings.mMode = J.ESpringMode_FrequencyAndDamping;
          ms.mSpringSettings.mFrequency = 6;
          ms.mSpringSettings.mDamping = 1;
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
    const ma = c.a.frozen ? Infinity : c.a.mass;
    const mb = !c.b || c.b.frozen ? Infinity : c.b.mass;
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

  private effInertia(c: ConnRec) {
    const I = (r: BodyRec) => (r.frozen ? Infinity : (r.mass * (r.dims.length ** 2 + r.dims.a ** 2)) / 12);
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
    this.jolt.Step(dt, n);
    this.time += dt;
    this.ticks++;
    this.evaluateConnections(dt, n);
    const stepMs = performance.now() - t0;
    return this.collect(stepMs);
  }

  private collect(stepMs: number): StepResult {
    const count = this.bySlot.length;
    const transforms = new Float32Array(count * 7);
    const velocities = new Float32Array(count * 6);
    for (let s = 0; s < count; s++) {
      const r = this.bySlot[s];
      if (!r) continue;
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
    const result: StepResult = {
      slotVersion: this.slotVersion,
      transforms,
      velocities,
      events,
      loads: [...this.conns.values()].map((c) => ({ ...c.load })),
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
          break;
        }
        case 'revolute': {
          const h = c.typed as JoltNS.HingeConstraint;
          const lp = h.GetTotalLambdaPosition();
          F = [lp.GetX() * inv, lp.GetY() * inv, lp.GetZ() * inv];
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
          F = [lp.GetX() * inv, lp.GetY() * inv, lp.GetZ() * inv];
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
    listener.OnContactPersisted = () => {};
    listener.OnContactRemoved = () => {};
    listener.OnContactAdded = (b1p: number, b2p: number, manp: number) => {
      if (this.events.length > 48) return;
      const b1 = J.wrapPointer(b1p, J.Body);
      const b2 = J.wrapPointer(b2p, J.Body);
      const man = J.wrapPointer(manp, J.ContactManifold);
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
        a: s1 >= 0 ? this.bySlot[s1]?.id ?? null : null,
        b: s2 >= 0 ? this.bySlot[s2]?.id ?? null : null,
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

  bodyMass(id: string) {
    return this.bodies.get(id)?.mass;
  }

  linearVelocity(id: string): Vec3 | null {
    const r = this.bodies.get(id);
    if (!r) return null;
    const v = this.bi.GetLinearVelocity(r.body.GetID());
    return [v.GetX(), v.GetY(), v.GetZ()];
  }

  angularVelocity(id: string): Vec3 | null {
    const r = this.bodies.get(id);
    if (!r) return null;
    const v = this.bi.GetAngularVelocity(r.body.GetID());
    return [v.GetX(), v.GetY(), v.GetZ()];
  }
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

function quatConj(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

function quatMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}

function fmtN(n: number) {
  if (!Number.isFinite(n)) return '∞';
  return n >= 1000 ? `${(n / 1000).toFixed(2)} kN` : `${n.toFixed(1)} N`;
}
