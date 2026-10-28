// What is made, let go: real rigid-body physics (Jolt) over it, so a generation can be tested by what it does. Each
// shape on its own, and each joined piece as one body of all its members, falls under gravity, lands, slides, tips,
// bounces and comes to rest on the floor, on the build (fixed where it stands) and on each other, with the friction
// and restitution of what each is made of. A group (moved as one, not held) is its members, each on its own. Round
// things are their own shapes (cylinders, spheres); a cone, a ring and a tube are the hull round them, said as such.
//
// The motion is kept, sampled 30 times a second, so the room can show it as it happened; where things end is written
// back into what is made.
//
// A tether (a rope, a lead, a cable, a towbar: a mate held with force) is Jolt's distance constraint between a point on
// each: slack while nearer than its length, past it pulled back by its own stiffness (EA / L), and let go when what it
// carries passes its breaking load. Its length and pull are kept with the motion.
//
// Things hinged or slid on each other are held by Jolt's hinge and slider constraints, where they touched when they
// were hinged; the two do not collide with each other (what holds them is the joint). A hinge driven by a DC motor
// is turned by the motor's own torque at the speed it turns: T = K_t (V - K_t w) / R - T_f, against what holds it,
// equal and opposite, so the current it draws and the energy it takes are its datasheet's at every step.

import { handbookOf } from './matter';
import type { Jolt } from './realize';
import { eulerOf, matOf, type Axis, type M3, type V3 } from './generate';
import * as THREE from 'three';
import { boundsOfAll, flatten, isAssembly, massOfAll, matrixOf, place, type Assembly } from './assembly';
import type { Part } from './kits';
import type { Material } from '../data/materials';


export interface SimPart { name: string; kind: string; axis: Axis; dims: Record<string, number>; local: { w: number; h: number; d: number }; at: V3; turn: V3 }
export interface SimThing { name: string; parts: SimPart[]; mass: number; friction: number; restitution: number }
export interface SimBox { at: V3; w: number; h: number; d: number }
export interface SimEnd { name: string; from: V3; to: V3; moved: number; dropped: number; turned: number; speed: number; resting: boolean }
export interface SimTrack { names: string[]; frames: { t: number; poses: { at: V3; q: [number, number, number, number] }[] }[] }
/** A joint: what moves (a thing let go, by its name or a member's), on what holds it (another, or a part of the build,
 *  fixed, by its index), about or along an axis through a point, in the room. */
export interface SimJoint {
  kind: 'hinge' | 'slide' | 'tether'; name: string; a: string; b: string | { fixed: number }; at: V3; axis: V3;
  /** a tether: where it is made fast on b, in the room (on a, `at`); its least and most length, m; its stiffness past
   *  its length, N/m (what it is made of gives it: E A / L; a towbar's is a steel bar's, high but never infinite); the
   *  share of critical damping it has (an estimate where it is not measured);
   *  the pull it parts at, N */
  at2?: V3; length?: [number, number]; stiffness?: number; damping?: number; breaks?: number;
  /** hinge: radians; slide: metres from where it starts */
  limits?: [number, number];
  /** N·m about a hinge, N along a slide */
  friction?: number;
  /** a DC motor turning a hinge: its constants and the volts across it */
  drive?: { name: string; V: number; Kt: number; R: number; Tf: number; /** a gearhead between: its ratio and efficiency */ gear?: { ratio: number; efficiency: number };
    /** a speed controller: it sets the volts, up to V, to hold the hinge at so many rad/s, its current held under Imax */ hold?: { w: number; Imax: number } };
}
export interface SimJointOut {
  name: string; kind: 'hinge' | 'slide' | 'tether';
  /** sampled with the motion: a hinge's angle in radians, a slide's travel in metres, a tether's length in metres */
  t: number[]; v: number[]; end: number; min: number; max: number;
  /** a tether: the pull it carried, N, sampled with the motion, its most, and when it parted (null: it held) */
  pull?: { t: number[]; peak: number; end: number; parted: number | null };
  /** the motor driving it: where it ended, and the energy over the run, J */
  drive?: { rpm: number; current: number; maxCurrent: number; energyIn: number; copper: number; out: number; friction: number; /** lost in a gearhead */ gears: number };
}
export interface SimOut { ends: SimEnd[]; parts: { name: string; at: V3; turn: V3 }[]; seconds: number; restedAt: number | null; track: SimTrack; hulls: string[]; joints: SimJointOut[] }

type Q4 = [number, number, number, number];
const quatOf = (m: M3): Q4 => {
  const [a, b, c, d, e, f, g, h, i] = m, tr = a + e + i;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; return [(h - f) / s, (c - g) / s, (d - b) / s, 0.25 * s]; }
  if (a > e && a > i) { const s = Math.sqrt(1 + a - e - i) * 2; return [0.25 * s, (b + d) / s, (c + g) / s, (h - f) / s]; }
  if (e > i) { const s = Math.sqrt(1 + e - a - i) * 2; return [(b + d) / s, 0.25 * s, (f + h) / s, (c - g) / s]; }
  const s = Math.sqrt(1 + i - a - e) * 2; return [(c + g) / s, (f + h) / s, 0.25 * s, (d - b) / s];
};
const matQ = ([x, y, z, w]: Q4): M3 => [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
const mul = (A: M3, B: M3): M3 => { const o = [0, 0, 0, 0, 0, 0, 0, 0, 0] as M3; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += A[r * 3 + k]! * B[k * 3 + c]!; return o; };
const apply = (A: M3, v: V3): V3 => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
const T = (A: M3): M3 => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
/** A round thing's own axis is Jolt's y: this turns y onto it. */
const AXIS_TO: Record<Axis, M3> = { y: [1, 0, 0, 0, 1, 0, 0, 0, 1], x: [0, 1, 0, -1, 0, 0, 0, 0, 1], z: [1, 0, 0, 0, 0, -1, 0, 1, 0] };

/** Let it go for so many seconds (or until all of it is at rest), on a floor at the height given, the build fixed. */
export function simulate(J: Jolt, things: SimThing[], fixed: SimBox[], o: { seconds: number; floor?: number; push?: { name: string; force: V3; seconds: number; /** where it is pushed, in the room, as it stands when let go: else at its middle of mass */ at?: V3 }; joints?: SimJoint[] }): SimOut {
  const LAYER_STATIC = 0, LAYER_MOVING = 1, s = new J.JoltSettings();
  const pairs = new J.ObjectLayerPairFilterTable(2); pairs.EnableCollision(LAYER_STATIC, LAYER_MOVING); pairs.EnableCollision(LAYER_MOVING, LAYER_MOVING);
  const bp = new J.BroadPhaseLayerInterfaceTable(2, 2); bp.MapObjectToBroadPhaseLayer(LAYER_STATIC, new J.BroadPhaseLayer(0)); bp.MapObjectToBroadPhaseLayer(LAYER_MOVING, new J.BroadPhaseLayer(1));
  s.mObjectLayerPairFilter = pairs; s.mBroadPhaseLayerInterface = bp; s.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bp, 2, pairs, 2);
  const jolt = new J.JoltInterface(s); J.destroy(s);
  const ps = jolt.GetPhysicsSystem(), bi = ps.GetBodyInterface();
  const st = ps.GetPhysicsSettings(); st.mPenetrationSlop = 0.0005; st.mSpeculativeContactDistance = 0.01; st.mNumVelocitySteps = 12; st.mNumPositionSteps = 3; ps.SetPhysicsSettings(st);
  const V = (v: readonly number[]) => new J.Vec3(v[0]!, v[1]!, v[2]!), R = (v: readonly number[]) => new J.RVec3(v[0]!, v[1]!, v[2]!), Q = (q: Q4) => new J.Quat(q[0], q[1], q[2], q[3]);
  const cr = (m: number) => Math.max(0, Math.min(0.002, m * 0.3)), hulls: string[] = [];
  // each body its own subgroup of one group, so the two a joint holds can be kept from colliding
  const filter = new J.GroupFilterTable(things.length + fixed.length + 1); let sub = 0;
  const groupOf = () => new J.CollisionGroup(filter, 0, sub++);
  const staticBox = (b: SimBox) => { const sh = new J.BoxShapeSettings(V([b.w / 2, b.h / 2, b.d / 2]), cr(Math.min(b.w, b.h, b.d) / 2)).Create().Get(); const cs = new J.BodyCreationSettings(sh, R(b.at), Q([0, 0, 0, 1]), J.EMotionType_Static, LAYER_STATIC); cs.mFriction = 0.6; const g = groupOf(); cs.mCollisionGroup = g; const body = bi.CreateBody(cs); J.destroy(cs); bi.AddBody(body.GetID(), J.EActivation_DontActivate); return { body, sub: g.GetSubGroupID() }; };
  // the floor: a plane, its top where it is said to be (a box a hundred metres across met a 9 mm plate with contact
  // depths off by millimetres, more the further from its middle: a plywood box sank 3 mm and crept 10 to 40 mm); and the
  // build, where it stands
  { const pl = new J.Plane(V([0, 1, 0]), -(o.floor ?? 0)), ps0 = new J.PlaneShapeSettings(pl, undefined, 1000), sh = ps0.Create().Get(); J.destroy(ps0); J.destroy(pl);
    const cs = new J.BodyCreationSettings(sh, R([0, 0, 0]), Q([0, 0, 0, 1]), J.EMotionType_Static, LAYER_STATIC); cs.mFriction = 0.6; const g = groupOf(); cs.mCollisionGroup = g; const body = bi.CreateBody(cs); J.destroy(cs); bi.AddBody(body.GetID(), J.EActivation_DontActivate); }
  const builds = fixed.map(staticBox);
  const convex = (p: SimPart): InstanceType<Jolt['ConvexShapeSettings']> => {
    const d = p.dims, l = p.local;
    if (p.kind === 'box') return new J.BoxShapeSettings(V([Math.max(l.w / 2, 1e-4), Math.max(l.h / 2, 1e-4), Math.max(l.d / 2, 1e-4)]), cr(Math.min(l.w, l.h, l.d) / 2));
    if (p.kind === 'sphere') return new J.SphereShapeSettings(Math.max(d.D! / 2, 1e-4));
    if (p.kind === 'cylinder') return new J.CylinderShapeSettings(Math.max(d.h! / 2, 1e-4), Math.max(d.D! / 2, 1e-4), cr(Math.min(d.h!, d.D!) / 2));
    // a cone, a ring, a tube: the hull round it
    hulls.push(p.name);
    const hull = new J.ConvexHullShapeSettings(), n = 24, pts: V3[] = [];
    const r = (d.D ?? Math.max(l.w, l.d)) / 2, hh = (d.h ?? d.dt ?? l.h) / 2;
    for (let k = 0; k < n; k++) { const a = (2 * Math.PI * k) / n, x = r * Math.cos(a), z = r * Math.sin(a); pts.push([x, -hh, z]); pts.push(p.kind === 'cone' ? [0, hh, 0] : [x, hh, z]); }
    for (const q of pts) hull.mPoints.push_back(V(q)); hull.mMaxConvexRadius = 0.002; return hull;
  };
  /** A part's turning in the room, its round axis brought onto Jolt's y. */
  const partTurn = (p: SimPart): M3 => (p.kind === 'cylinder' || p.kind === 'cone' || p.kind === 'tube' || p.kind === 'torus' ? mul(matOf(p.turn), AXIS_TO[p.axis]) : matOf(p.turn));
  type Live = { thing: SimThing; body: InstanceType<Jolt['Body']>; sub: number; origin: V3; rel: { part: SimPart; at: V3; R: M3; extra: M3 }[]; from: V3; speed: number; Rfrom: M3 };
  const live: Live[] = [];
  for (const th of things) {
    if (!th.parts.length) continue;
    const origin: V3 = th.parts[0]!.at;
    let shape: InstanceType<Jolt['Shape']>;
    const rel = th.parts.map((p) => ({ part: p, at: [p.at[0] - origin[0], p.at[1] - origin[1], p.at[2] - origin[2]] as V3, R: partTurn(p), extra: T(matOf(p.turn)) }));
    if (th.parts.length === 1) { const st1 = convex(th.parts[0]!); shape = st1.Create().Get(); J.destroy(st1); }
    else { const sc = new J.StaticCompoundShapeSettings(); for (const r of rel) sc.AddShape(V(r.at), Q(quatOf(r.R)), convex(r.part), 0); shape = sc.Create().Get(); J.destroy(sc); }
    const single = th.parts.length === 1, q0: Q4 = single ? quatOf(rel[0]!.R) : [0, 0, 0, 1];
    const cs = new J.BodyCreationSettings(shape, R(origin), Q(q0), J.EMotionType_Dynamic, LAYER_MOVING);
    cs.mFriction = th.friction; cs.mRestitution = th.restitution; cs.mLinearDamping = 0; cs.mAngularDamping = 0; cs.mMaxAngularVelocity = 400;
    cs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; cs.mMassPropertiesOverride.mMass = Math.max(th.mass, 1e-4); cs.mMotionQuality = J.EMotionQuality_LinearCast;
    // a body of parts joined keeps each part's contacts its own: merged into one set of four, the points of a part not yet
    // touching (a block 9 mm up on a 9 mm plate, within the 10 mm a contact is looked for ahead) were kept in place of the
    // plate's own, and that side of the plate sank 9 mm into the floor
    if (!single) cs.mUseManifoldReduction = false;
    const g = groupOf(); cs.mCollisionGroup = g;
    const body = bi.CreateBody(cs); J.destroy(cs); bi.AddBody(body.GetID(), J.EActivation_Activate);
    if (single) rel[0]!.at = [0, 0, 0];
    live.push({ thing: th, body, sub: g.GetSubGroupID(), origin, rel, from: [...origin] as V3, speed: 0, Rfrom: single ? rel[0]!.R : [1, 0, 0, 0, 1, 0, 0, 0, 1] });
  }
  /** Where each part of a body stands now: its place and its turning in the room. */
  const posesOf = (l: Live) => {
    const p = l.body.GetPosition(), r = l.body.GetRotation(), at: V3 = [p.GetX(), p.GetY(), p.GetZ()], q: Q4 = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], Rb = matQ(q), single = l.rel.length === 1;
    return l.rel.map((x) => { const off = apply(Rb, x.at), Rw = single ? Rb : mul(Rb, x.R); const turn = x.part.kind === 'cylinder' || x.part.kind === 'cone' || x.part.kind === 'tube' || x.part.kind === 'torus' ? mul(Rw, T(AXIS_TO[x.part.axis])) : Rw; return { name: x.part.name, at: [at[0] + off[0], at[1] + off[1], at[2] + off[2]] as V3, turnM: turn, q: quatOf(turn) }; });
  };
  // the joints: what moves on what holds it, about or along its axis through where they touched
  const liveOf = (n: string) => live.find((l) => l.thing.name === n || l.rel.some((x) => x.part.name === n));
  type Held = { j: SimJoint; c: InstanceType<Jolt['HingeConstraint']> | InstanceType<Jolt['SliderConstraint']> | InstanceType<Jolt['DistanceConstraint']>; mover: Live; holder: Live | null; fixedAt: V3 | null; out: SimJointOut; d: NonNullable<SimJointOut['drive']> | null;
    /** a tether's two ends, each in its own body's frame (a fixed end: where it is) */ ends?: [V3, V3]; parted?: boolean };
  /** A point in the room, in a body's own frame as it stands now, and back. */
  const toLocal = (b: InstanceType<Jolt['Body']>, w: V3): V3 => { const p = b.GetPosition(), r = b.GetRotation(); return apply(T(matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()])), [w[0] - p.GetX(), w[1] - p.GetY(), w[2] - p.GetZ()]); };
  const toWorld = (b: InstanceType<Jolt['Body']>, l: V3): V3 => { const p = b.GetPosition(), r = b.GetRotation(), o = apply(matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()]), l); return [p.GetX() + o[0], p.GetY() + o[1], p.GetZ() + o[2]]; };
  const held: Held[] = [];
  for (const j of o.joints ?? []) {
    const mover = liveOf(j.a); if (!mover) throw new Error(`${j.a} is not let go, so it cannot turn or slide`);
    const holder = typeof j.b === 'string' ? liveOf(j.b) ?? null : null, fixedBody = typeof j.b === 'string' ? null : builds[j.b.fixed]!;
    if (typeof j.b === 'string' && !holder) throw new Error(`${j.b} is not let go, so it cannot hold ${j.a}`);
    if (holder === mover) throw new Error(`${j.a} and ${j.b} move as one piece: a joint between them holds nothing`);
    const ax = j.axis, n = Math.hypot(...ax), u: V3 = [ax[0] / n, ax[1] / n, ax[2] / n];
    // a normal to it: across it, from whichever of x, y, z it lies least along
    const e: V3 = Math.abs(u[0]) < 0.6 ? [1, 0, 0] : [0, 1, 0], c0: V3 = [u[1] * e[2] - u[2] * e[1], u[2] * e[0] - u[0] * e[2], u[0] * e[1] - u[1] * e[0]], cn = Math.hypot(...c0), nrm: V3 = [c0[0] / cn, c0[1] / cn, c0[2] / cn];
    const b1 = holder ? holder.body : fixedBody!.body, b2 = mover.body;
    let c: Held['c'];
    if (j.kind === 'tether') {
      // (what a tether joins still meets: a lead does not stop a dog bumping its owner)
      const at2 = j.at2 ?? j.at, [lo, hi] = j.length ?? [0, Math.hypot(at2[0] - j.at[0], at2[1] - j.at[1], at2[2] - j.at[2])];
      const st = new J.DistanceConstraintSettings(); st.mPoint1 = R(at2); st.mPoint2 = R(j.at); st.mMinDistance = lo; st.mMaxDistance = hi;
      if (!(Number(j.stiffness) > 0)) throw new Error(`the ${j.name} has no stiffness: say what it is made of (its E A over its length)`);
      {
        // past its length it is a spring of its own stiffness, damped by its share of critical for the two masses it joins
        const m1 = holder ? Math.max(holder.thing.mass, 1e-4) : Infinity, m2 = Math.max(mover.thing.mass, 1e-4), mr = Number.isFinite(m1) ? (m1 * m2) / (m1 + m2) : m2;
        const sp = st.mLimitsSpringSettings; sp.mMode = J.ESpringMode_StiffnessAndDamping; sp.mStiffness = j.stiffness!; sp.mDamping = 2 * (j.damping ?? 0.05) * Math.sqrt(j.stiffness! * mr);
      }
      st.mNumVelocityStepsOverride = 120; st.mNumPositionStepsOverride = 40;
      c = J.castObject(st.Create(b1, b2), J.DistanceConstraint); J.destroy(st);
      ps.AddConstraint(c);
      held.push({ j, c, mover, holder, fixedAt: holder ? null : at2, ends: [holder ? toLocal(holder.body, at2) : at2, toLocal(b2, j.at)], out: { name: j.name, kind: 'tether', t: [], v: [], end: 0, min: Infinity, max: 0, pull: { t: [], peak: 0, end: 0, parted: null } }, d: null });
      continue;
    }
    filter.DisableCollision(holder ? holder.sub : fixedBody!.sub, mover.sub);
    if (j.kind === 'hinge') {
      const st = new J.HingeConstraintSettings(); st.mPoint1 = R(j.at); st.mPoint2 = R(j.at); st.mHingeAxis1 = V(u); st.mHingeAxis2 = V(u); st.mNormalAxis1 = V(nrm); st.mNormalAxis2 = V(nrm);
      if (j.limits) { st.mLimitsMin = j.limits[0]; st.mLimitsMax = j.limits[1]; }
      // more solver steps on a joint than on contacts: a light part (a wheel) held to a heavy one (a loaded deck) by its
      // hinge alone would otherwise give under the load, which no law asks of it
      st.mNumVelocityStepsOverride = 120; st.mNumPositionStepsOverride = 40;
      st.mMaxFrictionTorque = j.friction ?? 0; c = J.castObject(st.Create(b1, b2), J.HingeConstraint); J.destroy(st);
    } else {
      const st = new J.SliderConstraintSettings(); st.mPoint1 = R(j.at); st.mPoint2 = R(j.at); st.mSliderAxis1 = V(u); st.mSliderAxis2 = V(u); st.mNormalAxis1 = V(nrm); st.mNormalAxis2 = V(nrm);
      if (j.limits) { st.mLimitsMin = j.limits[0]; st.mLimitsMax = j.limits[1]; }
      st.mNumVelocityStepsOverride = 120; st.mNumPositionStepsOverride = 40;
      st.mMaxFrictionForce = j.friction ?? 0; c = J.castObject(st.Create(b1, b2), J.SliderConstraint); J.destroy(st);
    }
    ps.AddConstraint(c);
    // a motor may turn it faster than the engine's usual cap: up to half again its no-load speed
    if (j.drive) bi.SetMaxAngularVelocity(b2.GetID(), Math.max(400, (1.5 * Math.abs(j.drive.V)) / j.drive.Kt / (j.drive.gear?.ratio ?? 1)));
    held.push({ j, c, mover, holder, fixedAt: null, out: { name: j.name, kind: j.kind, t: [], v: [], end: 0, min: 0, max: 0 }, d: j.drive ? { rpm: 0, current: 0, maxCurrent: 0, energyIn: 0, copper: 0, out: 0, friction: 0, gears: 0 } : null });
  }
  // a hinge's angle unwrapped: a wheel that turns round and round counts its turns
  /** A tether's length now: between its two ends where their bodies have them. */
  const lengthOf = (h: Held) => { const a = h.holder ? toWorld(h.holder.body, h.ends![0]) : h.ends![0], b = toWorld(h.mover.body, h.ends![1]); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
  /** What a tether pulls with now, N: past its length, its stiffness times how far; slack, nothing. */
  const pullOf = (h: Held) => (h.parted ? 0 : Math.max(0, h.j.stiffness! * (lengthOf(h) - (h.c as InstanceType<Jolt['DistanceConstraint']>).GetMaxDistance())));
  const raw = (h: Held) => (h.j.kind === 'tether' ? lengthOf(h) : h.j.kind === 'hinge' ? (h.c as InstanceType<Jolt['HingeConstraint']>).GetCurrentAngle() : (h.c as InstanceType<Jolt['SliderConstraint']>).GetCurrentPosition());
  const unwrap = new Map<Held, { last: number; add: number }>();
  const valueOf = (h: Held) => { const v = raw(h); if (h.j.kind !== 'hinge') return v; const u = unwrap.get(h) ?? { last: v, add: 0 }; if (v - u.last > Math.PI) u.add -= 2 * Math.PI; else if (u.last - v > Math.PI) u.add += 2 * Math.PI; u.last = v; unwrap.set(h, u); return v + u.add; };
  /** A driven hinge's motor: its torque at the speed it turns, on what turns and back on what holds it. */
  const integ = new Map<Held, number>(), least = new Map<Held, number>();
  // what it turns alone, about the axis it turns on (its own inertia from the engine, read in its principal frame): the
  // least load the controller ever drives, so the stiffest it can be and stay steady
  const inertiaAbout = (b: InstanceType<Jolt['Body']>, axis: V3) => {
    const mp = b.GetMotionProperties(), dv = mp.GetInverseInertiaDiagonal(), d: V3 = [dv.GetX(), dv.GetY(), dv.GetZ()], iq = mp.GetInertiaRotation(), q: Q4 = [iq.GetX(), iq.GetY(), iq.GetZ(), iq.GetW()], r = b.GetRotation();
    const local = apply(T(matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()])), axis), p = apply(T(matQ(q)), local), inv = d[0] * p[0] ** 2 + d[1] * p[1] ** 2 + d[2] * p[2] ** 2;
    return inv > 0 ? 1 / inv : Infinity;
  };
  const drive = (h: Held, dt: number) => {
    const m = h.j.drive!, hc = h.c as InstanceType<Jolt['HingeConstraint']>, l = hc.GetLocalSpaceHingeAxis1(), la: V3 = [l.GetX(), l.GetY(), l.GetZ()], r1 = hc.GetBody1().GetRotation();
    const axis = apply(matQ([r1.GetX(), r1.GetY(), r1.GetZ(), r1.GetW()]), la);
    // read each at once: the engine hands back one vector it reuses
    const spin = (b: InstanceType<Jolt['Body']>): V3 => { const v = b.GetAngularVelocity(); return [v.GetX(), v.GetY(), v.GetZ()]; };
    const wa = spin(h.mover.body), wb = h.holder ? spin(h.holder.body) : [0, 0, 0];
    const out = (wa[0] - wb[0]) * axis[0] + (wa[1] - wb[1]) * axis[1] + (wa[2] - wb[2]) * axis[2];
    // through a gearhead, the motor turns n times as fast and gives n times its torque, less what the gears lose
    const n = m.gear?.ratio ?? 1, eta = m.gear?.efficiency ?? 1, w = n * out;
    // held at a speed: the controller sets the volts that would turn it at that speed with only its friction to carry,
    // and more by how far off it is and has been (proportional and integral), the motor's own back-EMF damping it; the
    // volts held to the supply's and to what drives no more than its current limit through the winding
    let Vin = m.V;
    if (m.hold) {
      // as stiff as a speed controller is: its current limit reached at a twentieth off the speed held; no stiffer than half
      // what this step lets a loop on what it turns alone stay steady at (n² Kt (Kt + kp) dt / R J ≤ ½), nor softer than 4 Kt
      if (!least.has(h)) least.set(h, inertiaAbout(h.mover.body, axis));
      const Jm = least.get(h)!, kpMax = (0.5 * m.R * Jm) / (n * n * m.Kt * dt) - m.Kt, kpWant = (m.hold.Imax * m.R) / Math.max(0.05 * Math.abs(n * m.hold.w), 1e-6);
      const wt = n * m.hold.w, e = wt - w, kp = Math.max(4 * m.Kt, Math.min(kpWant, kpMax)), ki = 2 * kp, lo = Math.max(-m.V, m.Kt * w - m.hold.Imax * m.R), hi = Math.min(m.V, m.Kt * w + m.hold.Imax * m.R);
      const base = m.Kt * wt + m.R * (m.Tf / m.Kt) * Math.sign(wt), held = integ.get(h) ?? 0, raw = base + kp * e + ki * held;
      Vin = Math.max(lo, Math.min(hi, raw));
      // the sum of what has been off grows only while the volts are not held at a limit (so it does not wind up)
      if (raw === Vin) integ.set(h, held + e * dt);
    }
    const I = (Vin - m.Kt * w) / m.R, Te = m.Kt * I;
    // its friction against the way it turns; at rest, holding back no more than it is pushed
    const Tf = Math.abs(w) > 1e-6 ? Math.sign(w) * m.Tf : Math.sign(Te) * Math.min(m.Tf, Math.abs(Te)), Tm = Te - Tf, T = Tm * w >= 0 ? n * eta * Tm : (n * Tm) / eta;
    bi.AddTorque(h.mover.body.GetID(), V([axis[0] * T, axis[1] * T, axis[2] * T]), J.EActivation_Activate);
    if (h.holder) bi.AddTorque(h.holder.body.GetID(), V([-axis[0] * T, -axis[1] * T, -axis[2] * T]), J.EActivation_Activate);
    const d = h.d!; d.rpm = (w * 60) / (2 * Math.PI); d.current = I; d.maxCurrent = Math.max(d.maxCurrent, Math.abs(I));
    d.energyIn += Vin * I * dt; d.copper += I * I * m.R * dt; d.out += T * out * dt; d.friction += Tf * w * dt; d.gears += Tm * w * dt - T * out * dt;
  };
  const dt = 1 / 240, track: SimTrack = { names: live.flatMap((l) => l.rel.map((x) => x.part.name)), frames: [] };
  let t = 0, restedAt: number | null = null, sample = 0;
  const pushed = o.push ? live.find((l) => l.thing.name === o.push!.name || l.rel.some((x) => x.part.name === o.push!.name)) : undefined;
  if (o.push && !pushed) throw new Error(`Nothing named ${o.push.name} is let go here`);
  // pushed at a point: where that point is on the body, kept as the body turns
  let pushOff: V3 | null = null;
  if (pushed && o.push!.at) { const p = pushed.body.GetPosition(), r = pushed.body.GetRotation(), q: Q4 = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], d: V3 = [o.push!.at[0] - p.GetX(), o.push!.at[1] - p.GetY(), o.push!.at[2] - p.GetZ()]; pushOff = apply(T(matQ(q)), d); }
  while (t < o.seconds - 1e-9) {
    if (pushed && t < o.push!.seconds) {
      bi.ActivateBody(pushed.body.GetID());
      if (pushOff) { const p = pushed.body.GetPosition(), r = pushed.body.GetRotation(), at = [p.GetX(), p.GetY(), p.GetZ()], w = apply(matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()]), pushOff); bi.AddForce(pushed.body.GetID(), V(o.push!.force), R([at[0]! + w[0], at[1]! + w[1], at[2]! + w[2]]), J.EActivation_Activate); }
      else bi.AddForce(pushed.body.GetID(), V(o.push!.force), J.EActivation_Activate);
    }
    for (const h of held) if (h.d) drive(h, dt);
    // with joints, four steps to each: a hinge's solver loses a little of a swing's energy each step, less the shorter the step
    jolt.Step(dt, held.length ? 4 : 1); t += dt;
    for (const l of live) { const v = l.body.GetLinearVelocity(); l.speed = Math.max(l.speed, Math.hypot(v.GetX(), v.GetY(), v.GetZ())); }
    for (const h of held) { const v = valueOf(h); h.out.min = Math.min(h.out.min, v); h.out.max = Math.max(h.out.max, v);
      if (h.out.pull && !h.parted) { const F = pullOf(h); h.out.pull.peak = Math.max(h.out.pull.peak, F); h.out.pull.end = F;
        // past what it parts at, it parts, and the two go their own ways
        if (h.j.breaks !== undefined && F > h.j.breaks) { h.parted = true; h.c.SetEnabled(false); h.out.pull.parted = t; h.out.pull.end = 0; bi.ActivateBody(h.mover.body.GetID()); if (h.holder) bi.ActivateBody(h.holder.body.GetID()); } } }
    if (t >= sample - 1e-9) { track.frames.push({ t, poses: live.flatMap((l) => posesOf(l).map((x) => ({ at: x.at, q: x.q }))) }); for (const h of held) { h.out.t.push(t); h.out.v.push(valueOf(h)); if (h.out.pull) h.out.pull.t.push(h.parted ? 0 : h.out.pull.end); } sample += 1 / 30; }
    if (t > 0.25 && (!pushed || t > o.push!.seconds) && !held.some((h) => h.d) && live.every((l) => !bi.IsActive(l.body.GetID()))) { restedAt = t; break; }
  }
  const ends: SimEnd[] = [], parts: SimOut['parts'] = [];
  for (const l of live) {
    const poses = posesOf(l), p = l.body.GetPosition(), to: V3 = [p.GetX(), p.GetY(), p.GetZ()];
    const r = l.body.GetRotation(), Rnow = matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()]), Rd = mul(Rnow, T(l.Rfrom)), turned = Math.acos(Math.max(-1, Math.min(1, (Rd[0] + Rd[4] + Rd[8] - 1) / 2)));
    ends.push({ name: l.thing.name, from: l.from, to, moved: Math.hypot(to[0] - l.from[0], to[1] - l.from[1], to[2] - l.from[2]), dropped: l.from[1] - to[1], turned, speed: l.speed, resting: !bi.IsActive(l.body.GetID()) });
    for (const x of poses) parts.push({ name: x.name, at: x.at, turn: eulerOf(x.turnM) });
  }
  const joints = held.map((h) => ({ ...h.out, end: valueOf(h), ...(h.d ? { drive: h.d } : {}) }));
  J.destroy(jolt);
  return { ends, parts, seconds: t, restedAt, track, hulls, joints };
}

// ---- what the board makes, let go -----------------------------------------------------------------------------------------
// (src/nexus/blocks.ts's Let go: each thing an assembly places at its top is a body of all its pieces, each piece its own
// shape where it stands (a box, a cylinder, a sphere; anything else the box round it), what it weighs its mass; what it is
// put on is fixed (its pieces as boxes); the floor at y = 0. The motion is the track sampled 30 times a second, so the
// clock plays it back.)

/** A piece's material in the friction table (data/materials.ts) by what its id says it is; else typical values (an estimate). */
export function surfaceOf(mat: string | undefined): { friction: number; restitution: number; from: string } {
  // the one table (src/nexus/matter.ts): the material's own grade, or the nearest the handbook holds, said as a stand-in
  const h = handbookOf(mat), m: Material | undefined = h?.m;
  return m ? { friction: m.friction, restitution: m.restitution, from: h!.same ? m.id : `${m.id} (a stand-in)` } : { friction: 0.5, restitution: 0.3, from: 'typical (an estimate)' };
}
/** One piece as a part of a body, where it stands in the world. */
function simPart(leaf: Part, m: THREE.Matrix4, name: string): SimPart {
  const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); m.decompose(pos, q, sc);
  const b = boundsOfAll(leaf), c = b.getCenter(new THREE.Vector3()).applyMatrix4(m), e = new THREE.Euler().setFromQuaternion(q, 'XYZ'), turn: V3 = [e.x, e.y, e.z];
  const s = leaf.shape as Record<string, unknown> | undefined, ax = Math.abs(sc.x), ay = Math.abs(sc.y), az = Math.abs(sc.z);
  if (s && 'box' in s) { const [w, h, d] = s.box as number[]; return { name, kind: 'box', axis: 'y', dims: {}, local: { w: w! * ax, h: h! * ay, d: d! * az }, at: [c.x, c.y, c.z], turn }; }
  if (s && 'cyl' in s) { const [r, h, r2] = s.cyl as number[]; const D = 2 * Math.max(r!, r2 ?? r!) * Math.max(ax, az); return { name, kind: 'cylinder', axis: 'y', dims: { D, h: h! * ay }, local: { w: D, h: h! * ay, d: D }, at: [c.x, c.y, c.z], turn }; }
  if (s && 'sphere' in s) { const D = 2 * (s.sphere as number) * Math.max(ax, ay, az); return { name, kind: 'sphere', axis: 'y', dims: { D }, local: { w: D, h: D, d: D }, at: [c.x, c.y, c.z], turn }; }
  // (a turned shape, a tyre's, as the cylinder round it about its axis, so a wheel rolls)
  if (s && 'lathe' in s) { const pr = s.lathe as [number, number][], D = 2 * Math.max(...pr.map((q) => q[0])) * Math.max(ax, az), h = (Math.max(...pr.map((q) => q[1])) - Math.min(...pr.map((q) => q[1]))) * ay; return { name, kind: 'cylinder', axis: 'y', dims: { D, h }, local: { w: D, h, d: D }, at: [c.x, c.y, c.z], turn }; }
  const z = b.getSize(new THREE.Vector3()); return { name, kind: 'box', axis: 'y', dims: {}, local: { w: Math.max(z.x * ax, 1e-4), h: Math.max(z.y * ay, 1e-4), d: Math.max(z.z * az, 1e-4) }, at: [c.x, c.y, c.z], turn };
}
/** A part as the physics takes it: each sealed part in it (an engine, a tyre, a battery, fitted as it comes) as one
 *  shape round its pieces, at its whole mass: a cylinder where it is round about its axis (a tyre rolls), else its box.
 *  What is drawn is untouched; this is only what the bodies collide and weigh by. Made once for each part. */
const proxies = new WeakMap<Part, Part>();
export function physicsOf(p: Part): Part {
  const was = proxies.get(p); if (was) return was;
  let out: Part;
  if (p.sealed && p.parts?.length) {
    const own = { ...p, at: [0, 0, 0] as V3, rot: [0, 0, 0] as V3 }, b = boundsOfAll(own), z = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const round = Math.abs(z.x - z.z) < 0.05 * Math.max(z.x, z.z), first = (q: Part): string | undefined => q.mat ?? (q.parts ?? []).map(first).find(Boolean);
    const core: Part = { name: p.name, shape: round ? { cyl: [z.x / 2, z.y] } : { box: [z.x, z.y, z.z] }, at: [c.x, c.y, c.z], mat: /tyre/.test(p.name) ? 'rubber' : first(p) ?? 'steel-low', kg: massOfAll(p) };
    out = { name: p.name, at: p.at, rot: p.rot, parts: [core] };
  } else out = p.parts?.length ? { ...p, parts: p.parts.map(physicsOf) } : p;
  proxies.set(p, out); return out;
}
/** The bodies an assembly lets go (each thing it places at its top, named by what it is: a second of a name gets " 2"),
 *  and the boxes of what is fixed. */
export function bodiesOf(things: Part | Assembly, fixed?: Part | Assembly): { bodies: SimThing[]; boxes: SimBox[]; placed: { of: Part | Assembly; m: THREE.Matrix4 }[] } {
  // the bodies: down through what only lays things out (a Place's one thing; a row, a grid or a ring of one thing; the
  // things let go themselves), to the first thing made of different pieces (a car, a block): that is one body
  const items: { of: Part | Assembly; m: THREE.Matrix4 }[] = [];
  const into = (of: Part | Assembly, m: THREE.Matrix4, top: boolean) => {
    if (isAssembly(of) && of.items.length && (top || of.items.length === 1 || of.items.every((x) => x.of === of.items[0]!.of))) { for (const x of of.items) into(x.of, m.clone().multiply(matrixOf(x)), false); return; }
    items.push({ of, m });
  };
  into(things, new THREE.Matrix4(), true);
  const seen = new Map<string, number>(), bodies: SimThing[] = [], placed: { of: Part | Assembly; m: THREE.Matrix4 }[] = [];
  let pieces = 0;
  for (const it0 of items) {
    const it = { ...it0, of: isAssembly(it0.of) ? it0.of : physicsOf(it0.of) };
    const n = (seen.get(it.of.name) ?? 0) + 1; seen.set(it.of.name, n); const name = n > 1 ? `${it.of.name} ${n}` : it.of.name;
    const m = it.m, parts: SimPart[] = []; let fr = Infinity, re = 0;
    // (each body its own budget of pieces, so one body made of thousands (an engine, a tyre's tread) does not leave the
    // next with none; and all of them a ceiling)
    let own = 0;
    flatten(it.of, (f) => { if (own++ > 1500 || pieces++ > 20000) return false; const sp = simPart(f.leaf, m.clone().multiply(f.m), `${name}/${parts.length}`); parts.push(sp); const su = surfaceOf(f.over.mat ?? f.leaf.mat); fr = Math.min(fr, su.friction); re = Math.max(re, su.restitution); });
    if (!parts.length) continue;
    const sc = new THREE.Vector3().setFromMatrixScale(m);
    bodies.push({ name, parts, mass: Math.max(1e-3, massOfAll(it.of) * Math.abs(sc.x * sc.y * sc.z)), friction: Number.isFinite(fr) ? fr : 0.5, restitution: re }); placed.push({ of: it0.of, m });
    if (bodies.length >= 400) break;
  }
  const boxes: SimBox[] = [];
  if (fixed) flatten(fixed, (f) => { const b = boundsOfAll(f.leaf).clone().applyMatrix4(f.m); if (b.isEmpty()) return; const c = b.getCenter(new THREE.Vector3()), z = b.getSize(new THREE.Vector3()); boxes.push({ at: [c.x, c.y, c.z], w: Math.max(z.x, 1e-3), h: Math.max(z.y, 1e-3), d: Math.max(z.z, 1e-3) }); return boxes.length < 2000; });
  return { bodies, boxes, placed };
}
/** Where each body is at a time, as an assembly: each thing placed where the track has it (between two samples, between
 *  their places and turnings). */
export function posedAt(out: SimOut, bodies: SimThing[], placed: { of: Part | Assembly; m: THREE.Matrix4 }[], t: number): Assembly {
  const fr = out.track.frames; if (!fr.length) return { name: 'let go', items: placed.map((p) => mPlace(p.of, p.m)) };
  let k = fr.findIndex((f) => f.t > t); if (k < 0) k = fr.length - 1;
  const a = fr[Math.max(0, k - 1)]!, b = fr[k]!, u = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 1, f0 = fr[0]!;
  const items: Assembly['items'] = []; let at = 0;
  bodies.forEach((body, i) => {
    const pa = a.poses[at]!, pb = b.poses[at]!, p0 = f0.poses[at]!; at += body.parts.length;
    const pos = new THREE.Vector3(...pa.at).lerp(new THREE.Vector3(...pb.at), u), q = new THREE.Quaternion(...pa.q).slerp(new THREE.Quaternion(...pb.q), u);
    // the body moved from where its first piece began to where it is: that move, on the whole thing
    const start = new THREE.Matrix4().compose(new THREE.Vector3(...p0.at), new THREE.Quaternion(...p0.q), new THREE.Vector3(1, 1, 1)), now = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
    items.push(mPlace(placed[i]!.of, now.multiply(start.invert()).multiply(placed[i]!.m)));
  });
  return { name: 'let go', items };
}
function mPlace(of: Part | Assembly, m: THREE.Matrix4): Assembly['items'][number] {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.decompose(p, q, s); const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return place(of, [p.x, p.y, p.z], [e.x, e.y, e.z], s.x);
}
