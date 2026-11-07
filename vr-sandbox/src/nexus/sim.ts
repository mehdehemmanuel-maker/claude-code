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
import { massOf } from './mass';
import type { Part } from './kits';
import type { Material } from '../data/materials';
import { FITS, boundOf, gearOf, partOfBlock, primBox, rackOf, teethOf, type Block } from './room';
import { SERVOS } from './families';


/** A piece of a body; with its own mass where it is known (what it is made of times its volume), so a body of a steel
 *  head on a wooden handle has its centre of mass and its inertia where its masses put them, not where its volume does. */
export interface SimPart { name: string; kind: string; axis: Axis; dims: Record<string, number>; local: { w: number; h: number; d: number }; at: V3; turn: V3; mass?: number }
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
/** Energy over the run, J: nothing is lost, only moved. The bodies' mechanical energy (½ m v², ½ ω·I ω, m g h) at the
 *  start and the end, the work done on them (pushes and motors), and what the bodies' mechanical energy does not hold of
 *  it at the end: gone into the molecules' motion (heat: collisions, sliding, joints' friction, the engine's own damping),
 *  each body's mechanical energy at the end with it. */
export interface SimEnergy { start: number; end: number; work: number; heat: number; bodies: { name: string; start: number; end: number }[] }
export interface SimOut { ends: SimEnd[]; parts: { name: string; at: V3; turn: V3 }[]; seconds: number; restedAt: number | null; track: SimTrack; hulls: string[]; joints: SimJointOut[]; energy: SimEnergy }

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
    // a body of pieces whose masses are known: its centre of mass and inertia from them (Jolt's own takes one density
    // for the whole body, so a steel head on a wooden handle would balance at the middle of their volume)
    const mp = single ? null : massPropsOf(rel, th.mass);
    if (mp) {
      const c0 = shape.GetCenterOfMass(), d: V3 = [mp.centre[0] - c0.GetX(), mp.centre[1] - c0.GetY(), mp.centre[2] - c0.GetZ()];
      if (Math.hypot(...d) > 1e-9) { const sc2 = new J.StaticCompoundShapeSettings(); for (const r of rel) sc2.AddShape(V(r.at), Q(quatOf(r.R)), convex(r.part), 0); const o2 = new J.OffsetCenterOfMassShapeSettings(V(d), sc2); shape = o2.Create().Get(); J.destroy(o2); cs.SetShape(shape); }
      const I = new J.Mat44(), col = (k: number) => new J.Vec4(V([mp.I[k]!, mp.I[3 + k]!, mp.I[6 + k]!]), 0);
      I.SetColumn4(0, col(0)); I.SetColumn4(1, col(1)); I.SetColumn4(2, col(2)); I.SetColumn4(3, new J.Vec4(V([0, 0, 0]), 1));
      cs.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided; cs.mMassPropertiesOverride.mInertia = I;
    }
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
  // each body's mechanical energy: moving, turning (in its principal frame, from the engine's own inertia) and lifted
  const gv = ps.GetGravity(), grav: V3 = [gv.GetX(), gv.GetY(), gv.GetZ()];
  const mech = (l: Live): number => {
    const b = l.body, mp = b.GetMotionProperties(), im = mp.GetInverseMass(); if (!(im > 0)) return 0;
    const m = 1 / im, v = b.GetLinearVelocity(), lin = 0.5 * m * (v.GetX() ** 2 + v.GetY() ** 2 + v.GetZ() ** 2);
    const w = b.GetAngularVelocity(), wv: V3 = [w.GetX(), w.GetY(), w.GetZ()], r = b.GetRotation(), dv = mp.GetInverseInertiaDiagonal(), d: V3 = [dv.GetX(), dv.GetY(), dv.GetZ()], iq = mp.GetInertiaRotation();
    const p = apply(T(matQ([iq.GetX(), iq.GetY(), iq.GetZ(), iq.GetW()])), apply(T(matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()])), wv)), rot = 0.5 * [0, 1, 2].reduce((s, k) => s + (d[k]! > 0 ? p[k]! ** 2 / d[k]! : 0), 0);
    const c = b.GetCenterOfMassPosition(), lift = -m * (grav[0] * c.GetX() + grav[1] * c.GetY() + grav[2] * c.GetZ());
    return lin + rot + lift;
  };
  const e0 = live.map(mech); let work = 0;
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
    if (pushed && t < o.push!.seconds) { const v = pushed.body.GetLinearVelocity(); work += (o.push!.force[0] * v.GetX() + o.push!.force[1] * v.GetY() + o.push!.force[2] * v.GetZ()) * dt; }
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
  const e1 = live.map(mech), start = e0.reduce((a, b) => a + b, 0), end = e1.reduce((a, b) => a + b, 0);
  work += held.reduce((a, h) => a + (h.d?.out ?? 0), 0);
  const energy: SimEnergy = { start, end, work, heat: start + work - end, bodies: live.map((l, k) => ({ name: l.thing.name, start: e0[k]!, end: e1[k]! })) };
  J.destroy(jolt);
  return { ends, parts, seconds: t, restedAt, track, hulls, joints, energy };
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
/** A body's centre of mass and inertia tensor about it (row-major, body axes), from its pieces' own masses, scaled so
 *  they sum to the body's: each piece's own inertia about its centre (exact for a box, a ball and a cylinder; a cone
 *  with its centre a quarter up; a ring or a tube as the solid cylinder round it, more than it has), turned into the
 *  body's axes, plus its mass times its distance squared (the parallel axis theorem). Null where any mass is unknown. */
export function massPropsOf(rel: { part: SimPart; at: V3; R: M3 }[], total: number): { centre: V3; I: M3; exact: number } | null {
  const sum = rel.reduce((t, r) => t + (r.part.mass ?? NaN), 0);
  if (!(sum > 0) || !(total > 0)) return null;
  const k = total / sum, own = rel.map((r) => {
    const m = r.part.mass! * k, p = r.part, l = p.local, d = p.dims;
    if (p.kind === 'box') return { m, c: r.at, I: [(m * (l.h * l.h + l.d * l.d)) / 12, (m * (l.w * l.w + l.d * l.d)) / 12, (m * (l.w * l.w + l.h * l.h)) / 12] as V3, exact: true };
    if (p.kind === 'sphere') { const t = 0.1 * m * d.D! * d.D!; return { m, c: r.at, I: [t, t, t] as V3, exact: true }; }
    const rr = (d.D ?? Math.max(l.w, l.d)) / 2, h = 2 * ((d.h ?? d.dt ?? l.h) / 2);
    // (in the shape's own axes, its round axis y, as the shape the engine is given)
    if (p.kind === 'cone') { const up = apply(r.R, [0, -h / 4, 0]); const t = m * ((3 / 20) * rr * rr + (3 / 80) * h * h); return { m, c: [r.at[0] + up[0], r.at[1] + up[1], r.at[2] + up[2]] as V3, I: [t, 0.3 * m * rr * rr, t] as V3, exact: true }; }
    const t = (m * (3 * rr * rr + h * h)) / 12; return { m, c: r.at, I: [t, (m * rr * rr) / 2, t] as V3, exact: p.kind === 'cylinder' };
  });
  const centre: V3 = [0, 0, 0]; for (const o of own) for (let a = 0; a < 3; a++) centre[a] += (o.m * o.c[a]!) / total;
  const I = [0, 0, 0, 0, 0, 0, 0, 0, 0] as M3; let exact = 0;
  own.forEach((o, i) => {
    const R = rel[i]!.R, D = [o.I[0], 0, 0, 0, o.I[1], 0, 0, 0, o.I[2]] as M3, Iw = mul(mul(R, D), T(R)), x: V3 = [o.c[0] - centre[0], o.c[1] - centre[1], o.c[2] - centre[2]], xx = x[0] * x[0] + x[1] * x[1] + x[2] * x[2];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) I[a * 3 + b] += Iw[a * 3 + b]! + o.m * ((a === b ? xx : 0) - x[a]! * x[b]!);
    if (o.exact) exact += o.m / total;
  });
  return { centre, I, exact };
}
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
    flatten(it.of, (f) => { if (own++ > 1500 || pieces++ > 20000) return false; const fm = m.clone().multiply(f.m), sp = simPart(f.leaf, fm, `${name}/${parts.length}`); sp.mass = massOf({ ...f.leaf, parts: [] }) * Math.abs(fm.determinant()); parts.push(sp); const su = surfaceOf(f.over.mat ?? f.leaf.mat); fr = Math.min(fr, su.friction); re = Math.max(re, su.restitution); });
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

// ---- movement in general, live (the user, 2026-11-06: "freeze things in the air like a rod then add a loose gear to it
// and a crank and crank it or just anything") --------------------------------------------------------------------------
// What the operations made says how it moves; nothing is typed. Its pieces are joined into bodies by the faces room.ts
// wrote between them: touch, tight, an interference, stacked and bolted faces (a gap of none) hold two pieces as one body;
// a sleeve over a shaft, a passer through a line or in a bore with a gap (a slide or clear fit) turns about the line of
// the round one (two such lines between the same two bodies that are not one line lock them: one body); a gap face
// beside (stacked with a clear fit, a ring's copies) joins nothing. Two spur gears (gearOf: ISO 53's teeth) in two
// bodies, their axes parallel at their working distance m (z₁ + z₂) / 2 (to a quarter module more: their backlash) and
// their faces over each other, mesh: Jolt's gear constraint holds ω₁ z₁ = −ω₂ z₂. Each body is frozen (held where it
// is, in the air too: a static body) or loose (gravity on it); by default what turns on a shaft is loose and the rest,
// the shafts with it, frozen. The live motion steps Jolt each frame; a hand's drag gives a torque about a body's joint,
// or a pull on a body with none. Each piece collides as its own shape (a box, a cylinder round a round one, a gear's tip
// circle as a cylinder: an envelope), save the pieces of two bodies that touch, turn on each other or mesh.
// Decision 0028, motion 2: a sleeve with a slide fit slides along its shaft as it turns (within the room its ends leave),
// a carriage on two parallel slide fits only slides, a rack meshed by a gear slides r a radian of it (Jolt's rack and
// pinion), two pulleys a belt is laid round turn together by their teeth, the same way; a joint a servo's or a gear
// motor's holds where it is put (a position motor, to a servo's stall torque), and is driven at a speed when asked; a
// touch that would lock a joint gives way to it; bodies not joined collide.
// Decision 0029 (rough): a touch on a joint's own axis end joined last and only where it does not lock the joint; a lead
// screw in its tapped nut a screw joint (the nut its lead a turn, a velocity tie solved once a step); a box stacked with a
// slide fit between two faces of another (an MGN rail in its carriage) slides along its length.
// (Cut, for a later round: a room joint's own slide or turn, gears whose axes are not along their own z as made, a keyed
// sleeve (it turns too), sliders driven by a motor, a screw joint's position correction.)

/** A body of what is made: its pieces (by their index in the block), whether it is frozen, and why. */
export interface MoveBody { name: string; pieces: number[]; frozen: boolean; why: string }
/** What drives a joint: a hobby servo (its stall torque, vendor figures, typical) or a gear motor or stepper (its torque
 *  not known here: held stiff), and whether it holds where it is put by default. */
export interface MoveMotor { kind: 'servo' | 'gear motor' | 'stepper'; torque?: number; from: string }
/** A body that turns (a) on another (b, the shaft's) about a line through `point` along `dir`, from the faces that say so;
 *  with `slide`, it slides along that line too (a slide fit), within `range` (m from where it stands: its ends' room on the
 *  shaft); with `turns` false, it only slides (two parallel lines, a carriage on its rods; a rack); a motor where one
 *  drives it (a servo's spline, a gear motor's shaft). */
export interface MoveJoint { a: number; b: number; point: V3; dir: V3; by: string[]; turns: boolean; slide?: boolean; range?: [number, number]; motor?: MoveMotor;
  /** a screw joint (decision 0029): a lead screw in its tapped nut, the nut moved this far along the line, m, a turn of it */ screw?: number }
/** Two meshing gears: their bodies, pieces, teeth. */
export interface MoveMesh { a: number; b: number; ga: string; gb: string; za: number; zb: number; m: number }
/** A gear (its body a) moving a rack (body b) along `dir` by its pitch radius r times its turn. */
export interface MoveRack { a: number; b: number; gear: string; rack: string; r: number; z: number; m: number; dir: V3 }
/** Two pulleys or sprockets (bodies a and b) a belt or chain turns together, the same way, by their teeth (or radii). */
export interface MoveBelt { a: number; b: number; pa: string; pb: string; za: number; zb: number; belt: string; teeth: boolean }
export interface Motion { bodies: MoveBody[]; joints: MoveJoint[]; meshes: MoveMesh[]; racks: MoveRack[]; belts: MoveBelt[]; says: string }

const TURNS = / over | through |in the bore of /, IN_HOLE = / in the hole of /;
/** Hobby servos' stall torque, N·m (families.ts SERVOS: SG90 1.8 kg·cm, MG996R 9.4 kg·cm at 4.8 V, vendor figures, typical;
 *  1 kg·cm = 0.0980665 N·m); the MG90S taken as the micro class, a guess. */
const SERVO_NM = (name: string): number | undefined => { const k = /MG996|standard/i.test(name) ? SERVOS.standard : /SG90|MG90|micro/i.test(name) ? SERVOS.micro : undefined; const t = k ? /([\d.]+) kg·cm/.exec(k.torque) : null; return t ? Number(t[1]) * 0.0980665 : undefined; };
const motorOf = (names: string): MoveMotor | undefined => /servo|spline/i.test(names) ? { kind: 'servo', ...(SERVO_NM(names) !== undefined ? { torque: SERVO_NM(names)! } : {}), from: SERVO_NM(names) !== undefined ? 'its stall torque (families.ts SERVOS, vendor, typical)' : 'its torque not known here: held stiff' }
  : /gear motor/i.test(names) ? { kind: 'gear motor', from: 'its torque not known here: held stiff' } : /stepper|NEMA/i.test(names) ? { kind: 'stepper', from: 'its holding torque not known here: held stiff' } : undefined;
/** A lead screw's lead, m a turn, from its name as parts/motion.ts names it ("T8 lead 8 lead screw"); a bolt's thread in
 *  its nut is a bolted joint (tight), never a screw joint, so only a lead screw is read. */
const leadOf = (name: string): number | undefined => { if (!/lead screw/i.test(name)) return undefined; const m = /\blead (\d+(?:\.\d+)?)\b/.exec(name); return m ? Number(m[1]) / 1000 : undefined; };
const unitOf = (d: V3): V3 => { const n = Math.hypot(...d) || 1; return [d[0] / n, d[1] / n, d[2] / n]; };
const dot = (a: V3, c: V3) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
/** How what is made moves: its bodies, the lines they turn or slide along, which gears mesh, which racks they drive and
 *  which pulleys a belt joins, all read from its faces. Pieces touching join one body, the largest faces first, save a
 *  touch that would lock a joint (a spline's tip against the plate on its horn): that one gives way to the joint.
 *  Decision 0029: a touch on a joint's own axis end (a face along the joint's line, on the shaft or on what turns on it:
 *  a spline's tip, a spline's root in its case, a horn's underside) is joined last, and only where it does not lock the
 *  joint, so the spline's root joins its case and its tip gives way to the horn; a lead screw in its tapped nut is a screw
 *  joint (the nut moved its lead a turn); a box stacked between two slide-fit faces of another (a rail between a
 *  carriage's skirts) slides along its length and never turns. */
// (a slide fit's face: by the fit its operation recorded (root 6: its gap now scales with the size, so it is not one
// number); a face written by an operation that does not record its fit yet, by FITS' one slide gap as before)
const isSlide = (f: Block['faces'][number]): boolean => f.fit === 'slide' || (f.fit === undefined && Math.abs(f.gap - FITS.slide.gap) < 1e-9);
export function motionOf(b: Block): Motion {
  const n = b.pieces.length, up = Array.from({ length: n }, (_, i) => i), find = (i: number): number => (up[i] === i ? i : (up[i] = find(up[i]!)));
  const join = (i: number, j: number) => { up[find(i)] = find(j); };
  const turns: { shaft: number; on: number; point: V3; dir: V3; by: string; slide: boolean; screw?: number; flat?: true }[] = [], touches: typeof b.faces[number][] = [];
  for (const f of b.faces) {
    if (/ meshes | laid round /.test(f.by)) continue;
    // (the round one of the two is round about the line: the sleeve over it, or the passer along it)
    const round = b.pieces[f.b]!.solid.base, over = / over /.test(f.by);
    // (or a shaft in the hole of a section: a gear's or a pulley's pilot bore, wider than it; not a bolt in a plate's hole)
    const sectHole = IN_HOLE.test(f.by) && b.pieces[f.a]!.solid.base.k === 'box' && !!(b.pieces[f.a]!.solid.base as { sect?: unknown }).sect;
    // (a lead screw in its tapped nut, by its thread (over: no gap drawn) or through it: a screw joint)
    const lead = TURNS.test(f.by) && !f.gate && b.pieces[over ? f.b : f.a]!.tapped ? leadOf(b.pieces[over ? f.a : f.b]!.name) : undefined;
    if ((lead !== undefined || (f.gap > 0 && !f.gate && (TURNS.test(f.by) || sectHole))) && round.k !== 'box' && round.k !== 'bend') {
      const d = round.frame ? [round.frame[1], round.frame[4], round.frame[7]] as V3 : [0, 1, 0] as V3;
      turns.push({ shaft: over ? f.a : f.b, on: over ? f.b : f.a, point: [round.c[0], round.c[1], round.c[2]], dir: d, by: f.by, slide: lead !== undefined || isSlide(f), ...(lead !== undefined ? { screw: lead } : {}) }); continue; }
    // (a box stacked against another with a slide fit (a rail between a carriage's skirts): the longer slides in the shorter's
    // grip along its length, the one across the face's normal; it never turns)
    if (f.kind === 'gap' && isSlide(f) && /: stacked$/.test(f.by)) {
      const A = b.pieces[f.a]!.solid.base, B = b.pieces[f.b]!.solid.base;
      if (A.k === 'box' && B.k === 'box') {
        const nrm = unitOf(f.normal as V3), axes = (P: typeof A & { k: 'box' }) => [0, 1, 2].map((k) => { const F = P.frame; return { u: unitOf(F ? [F[k]!, F[3 + k]!, F[6 + k]!] : [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0]), L: P.size[k]! }; });
        const longest = (P: typeof A & { k: 'box' }) => axes(P).filter((x) => Math.abs(dot(x.u, nrm)) < 0.5).sort((p, q) => q.L - p.L)[0];
        const la = longest(A), lb = longest(B); if (la && lb) { const railIsA = la.L >= lb.L, rail = railIsA ? A : B;
          turns.push({ shaft: railIsA ? f.a : f.b, on: railIsA ? f.b : f.a, point: [rail.c[0], rail.c[1], rail.c[2]], dir: (railIsA ? la : lb).u, by: f.by, slide: true, flat: true }); continue; } }
    }
    if (f.gap === 0 || f.kind === 'contact') touches.push(f);
  }
  const weight = (f: typeof b.faces[number]) => f.area || (f.length ?? 0) * 1e-3;
  const said: string[] = [];
  // (a touch on a joint's own axis end: on the shaft or on what turns on it, its face along the joint's line; joined last)
  const onAxisEnd = (f: typeof b.faces[number]) => turns.some((t) => (t.shaft === f.a || t.shaft === f.b || t.on === f.a || t.on === f.b) && Math.abs(dot(unitOf(f.normal as V3), unitOf(t.dir))) > 0.99);
  const sorted = touches.sort((p, q) => weight(q) - weight(p)), late = sorted.filter(onAxisEnd), early = sorted.filter((f) => !onAxisEnd(f));
  for (const f of [...early, ...late]) { const A = find(f.a), B = find(f.b); if (A === B) continue;
    const locks = turns.some((t) => { const o = find(t.on), s = find(t.shaft); return (o === A && s === B) || (o === B && s === A); });
    if (locks) { said.push(`the ${b.pieces[f.a]!.name} touching the ${b.pieces[f.b]!.name} gives way to the joint`); continue; } join(f.a, f.b); }
  const same = (p: { point: V3; dir: V3 }, q: { point: V3; dir: V3 }) => { const c = cross(p.dir, q.dir), d: V3 = [q.point[0] - p.point[0], q.point[1] - p.point[1], q.point[2] - p.point[2]], off = cross(d, p.dir); return Math.hypot(...c) < 1e-6 && Math.hypot(...off) < 1e-6; };
  const parallel = (p: { dir: V3 }, q: { dir: V3 }) => Math.hypot(...cross(p.dir, q.dir)) < 1e-6;
  // (two lines between the same two bodies that are not one line lock them, save parallel slide fits (a carriage on two
  // rods: it slides along them); until nothing more joins)
  const pairOf = (t: typeof turns[number]) => { const a = find(t.on), s = find(t.shaft); return a < s ? `${a},${s}` : `${s},${a}`; };
  for (let again = true; again;) { again = false; const by = new Map<string, typeof turns>();
    for (const t of turns) { if (find(t.on) === find(t.shaft)) continue; const k = pairOf(t); by.set(k, [...(by.get(k) ?? []), t]); }
    for (const ts of by.values()) if (ts.some((t) => !same(ts[0]!, t)) && !ts.every((t) => t.slide && parallel(ts[0]!, t))) { join(ts[0]!.on, ts[0]!.shaft); again = true; } }
  const roots = [...new Set(up.map((_, i) => find(i)))], of = new Map(roots.map((r, k) => [r, k]));
  const bodies: MoveBody[] = roots.map((r) => { const ps = up.map((_, i) => i).filter((i) => find(i) === r), names = ps.map((i) => b.pieces[i]!.name); return { name: names.length > 2 ? `${names[0]} and ${names.length - 1} more` : names.join(' and '), pieces: ps, frozen: true, why: 'held: it turns on nothing' }; });
  const bodyOf = (i: number) => of.get(find(i))!, boxes = b.pieces.map((p) => boundOf(p));
  const joints: MoveJoint[] = [];
  for (const t of turns) { const a = of.get(find(t.on))!, s = of.get(find(t.shaft))!; if (a === s) continue; const j = joints.find((x) => (x.a === a && x.b === s) || (x.a === s && x.b === a));
    if (j) { j.by.push(t.by); if (!same(j, t) || t.flat) j.turns = false; j.slide = j.slide && t.slide; if (t.screw) j.screw = t.screw; } else joints.push({ a, b: s, point: t.point, dir: t.dir, by: [t.by], turns: !t.flat, slide: t.slide, ...(t.screw ? { screw: t.screw } : {}) }); }
  // (a slide's room: along its line, to the nearest piece of another body in its way, and never off the ends of what it is on)
  const rangeOf = (j: MoveJoint, onto: number[]): [number, number] | undefined => { const k = j.dir.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-9); if (k < 0) return undefined;
    const mine = bodies[j.a]!.pieces, lo = Math.min(...mine.map((i) => boxes[i]![0][k]!)), hi = Math.max(...mine.map((i) => boxes[i]![1][k]!)), o = [0, 1, 2].filter((x) => x !== k);
    const L0 = o.map((x) => Math.min(...mine.map((i) => boxes[i]![0][x]!))), H0 = o.map((x) => Math.max(...mine.map((i) => boxes[i]![1][x]!)));
    let r0 = -Infinity, r1 = Infinity; for (const i of onto) { r0 = Math.max(r0, boxes[i]![0][k]! - lo); r1 = Math.min(r1, boxes[i]![1][k]! - hi); }
    for (let i = 0; i < n; i++) { if (bodyOf(i) === j.a || onto.includes(i)) continue; const q = boxes[i]!; if (!o.every((x, m) => q[0][x]! < H0[m]! - 1e-9 && q[1][x]! > L0[m]! + 1e-9)) continue;
      if (q[1][k]! <= lo + 1e-9) r0 = Math.max(r0, q[1][k]! - lo); else if (q[0][k]! >= hi - 1e-9) r1 = Math.min(r1, q[0][k]! - hi); }
    if (!Number.isFinite(r0) || !Number.isFinite(r1)) return undefined; const s = Math.sign(j.dir[k]!); return s > 0 ? [Math.min(0, r0), Math.max(0, r1)] : [-Math.max(0, r1), -Math.min(0, r0)]; };
  for (const j of joints) if (j.slide) { const onto = turns.filter((t) => bodyOf(t.on) === j.a && bodyOf(t.shaft) === j.b).map((t) => t.shaft), r = rangeOf(j, onto);
    if (r && r[1] - r[0] > 1e-6) j.range = r; else { j.slide = false; delete j.screw; said.push(`${bodies[j.a]!.name}: its ends held, it only turns`); }
    // (a screw joint: the nut turns and slides on its screw alone, the two tied by its lead; held from turning by rods beside
    // it, it only slides, and moves only as its screw turns)
    if (!j.slide && !j.turns) j.turns = true; }
  // (a motor where one drives the joint: the shaft's body a servo's or a gear motor's)
  for (const j of joints) { const m = motorOf([...bodies[j.b]!.pieces.map((i) => b.pieces[i]!.name), ...j.by].join(' ')); if (m) j.motor = m; }
  // (a rack meshed by a gear: it slides along its length, on what its gear turns on, the gear driving it)
  const racks: MoveRack[] = [];
  for (const f of b.faces) { if (!/ meshes /.test(f.by)) continue; const [ri, gi] = rackOf(b.pieces[f.a]!) ? [f.a, f.b] : rackOf(b.pieces[f.b]!) ? [f.b, f.a] : [-1, -1]; if (ri < 0) continue;
    const R = rackOf(b.pieces[ri]!)!, G = gearOf(b.pieces[gi]!); if (!G) continue; const a = bodyOf(gi), r = bodyOf(ri); if (a === r) continue;
    const base = joints.find((j) => j.a === a)?.b ?? a; racks.push({ a, b: r, gear: b.pieces[gi]!.name, rack: b.pieces[ri]!.name, r: (G.m * G.z) / 2, z: G.z, m: G.m, dir: R.dir });
    const ax = R.dir.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-9), lo = boxes[ri]![0][ax] ?? 0, hi = boxes[ri]![1][ax] ?? 0, at = G.at[ax] ?? 0, s = Math.sign(R.dir[ax] ?? 1);
    const rg: [number, number] = [at - hi + G.ra, at - lo - G.ra]; joints.push({ a: r, b: base, point: R.c, dir: R.dir, by: [f.by], turns: false, slide: true, ...(rg[1] > rg[0] ? { range: s > 0 ? rg : [-rg[1], -rg[0]] } : {}) }); }
  // (pulleys a belt is laid round: their bodies turn together by their teeth)
  const belts: MoveBelt[] = [], laps = b.faces.filter((f) => / laid round /.test(f.by));
  for (let i = 0; i < laps.length; i++) for (let k = i + 1; k < laps.length; k++) { const p = laps[i]!, q = laps[k]!; if (bodyOf(p.b) !== bodyOf(q.b)) continue;
    const ax = (f: typeof p) => { const l = b.pieces[f.a]!.lines[0], c = b.pieces[f.a]!.solid.base.c; return l ? [l.x, l.y ?? c[1], l.z] as V3 : [c[0], c[1], c[2]] as V3; };
    const tz = (f: typeof p) => teethOf(b.pieces[f.a]!, ax(f)), za = tz(p), zb = tz(q), teeth = za !== undefined && zb !== undefined, rad = (f: typeof p) => Math.hypot(f.at[0] - ax(f)[0], f.at[1] - ax(f)[1]);
    belts.push({ a: bodyOf(p.a), b: bodyOf(q.a), pa: b.pieces[p.a]!.name, pb: b.pieces[q.a]!.name, za: teeth ? za! : rad(p), zb: teeth ? zb! : rad(q), belt: bodies[bodyOf(p.b)]!.name, teeth }); }
  // (by default what turns on a shaft is loose; the shafts, and all that turns on nothing, frozen where they stand; but where
  // motors drive the joints (a servo arm, a rover's wheels) only what it stands on is frozen, the motors holding the rest)
  for (const j of joints) { if (!bodies[j.b]!.why.startsWith('loose')) { bodies[j.b]!.frozen = true; bodies[j.b]!.why = 'held: a shaft'; } }
  for (const j of joints) if (bodies[j.a]!.why !== 'held: a shaft') { bodies[j.a]!.frozen = false; bodies[j.a]!.why = `loose: ${j.turns ? 'turns' : 'slides'} on ${bodies[j.b]!.name}${j.turns && j.slide ? ' and slides along it' : ''}`; }
  if (joints.some((j) => j.motor)) { const parts = partOfBlock(b).parts ?? [], mass = bodies.map((x) => x.pieces.reduce((t, i) => t + (parts[i] ? massOfAll(parts[i]!) : 0), 0));
    const driven = new Set(joints.filter((j) => j.motor).flatMap((j) => [j.a, j.b])), low = bodies.map((x) => Math.min(...x.pieces.map((i) => boxes[i]![0][1]!)));
    // (what it stands on: the lowest of them (an arm's base plate), the heavier where two are as low)
    const root = [...driven].sort((p, q) => (Math.abs(low[p]! - low[q]!) > 1e-6 ? low[p]! - low[q]! : mass[q]! - mass[p]!))[0]!;
    for (const k of driven) { const j = joints.find((x) => x.a === k && x.motor) ?? joints.find((x) => x.b === k && x.motor)!; bodies[k]!.frozen = k === root; bodies[k]!.why = k === root ? 'held: what it stands on (its lowest), its motors holding the rest' : `loose: held by its ${j.motor!.kind}`; } }
  const meshes: MoveMesh[] = [], gears = b.pieces.map((p) => gearOf(p));
  for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++) { const A = gears[i], B = gears[k]; if (!A || !B || Math.abs(A.m - B.m) > 1e-9 || find(i) === find(k)) continue;
    const d = Math.hypot(A.at[0] - B.at[0], A.at[1] - B.at[1]), a0 = (A.m * (A.z + B.z)) / 2;
    if (d > a0 - 1e-9 && d < a0 + 0.25 * A.m && A.z0 < B.z1 && B.z0 < A.z1) meshes.push({ a: of.get(find(i))!, b: of.get(find(k))!, ga: b.pieces[i]!.name, gb: b.pieces[k]!.name, za: A.z, zb: B.z, m: A.m }); }
  const says = [`${bodies.length} bod${bodies.length === 1 ? 'y' : 'ies'} (${bodies.filter((x) => x.frozen).length} frozen)`, ...joints.map((j) => `${bodies[j.a]!.name} ${j.screw ? `screws along ${bodies[j.b]!.name}, ${(j.screw * 1000).toFixed(2)} mm a turn` : `${j.turns ? 'turns' : 'slides'} on ${bodies[j.b]!.name}${j.turns && j.slide ? ', sliding along it' : ''}`}${j.motor ? ` (a ${j.motor.kind}: it holds)` : ''}`),
    ...meshes.map((m) => `${m.ga} meshes ${m.gb}: ${m.zb}:${m.za}, the other way`), ...racks.map((r) => `${r.gear} drives ${r.rack}: ${(r.r * 1000).toFixed(2)} mm a radian`), ...belts.map((x) => `${x.belt} joins ${x.pa} and ${x.pb}: ${x.zb}:${x.za}, the same way`), ...said].join('; ');
  return { bodies, joints, meshes, racks, belts, says };
}
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** What is made, moving live: Jolt stepped as often as asked, each body frozen (static) or loose, its joints hinges about
 *  their lines, meshing gears held to their ratio. A drag or a crank is a torque about a body's joint (or a pull on a free
 *  one); `spin` drives a joint at a speed. Stop is `destroy`: the build stands as it was made. */
export class LiveMotion {
  readonly motion: Motion; t = 0;
  /** Where its floor is, m: under the lowest of it by half its widest. */
  readonly floor: number;
  private readonly J: Jolt; private readonly jolt: InstanceType<Jolt['JoltInterface']>; private readonly bi: InstanceType<Jolt['BodyInterface']>;
  private readonly live: { body: InstanceType<Jolt['Body']>; p0: V3; q0: Q4; mass: number }[] = [];
  private readonly joint = new Map<number, { kind: 'hinge' | 'slide' | 'six'; c: InstanceType<Jolt['TwoBodyConstraint']>; dir: V3; point: V3; last: number; add: number; s0: number }>();
  private readonly held = new Set<number>();
  private readonly pending = new Map<number, { T?: number; F?: V3; point?: V3 }>();
  /** Screw joints (decision 0029): the nut's body a, the screw's b, along u (in b's own frame), tied by k = lead / 2π:
   *  the two bodies' relative speed along the line is k times their relative turn about it, held each step by an
   *  impulse on both (a velocity constraint solved once a step, no position correction: rough). */
  private readonly screws: { a: number; b: number; k: number; u: V3 }[] = [];
  private readonly grav: V3 = [0, -9.81, 0];
  constructor(J: Jolt, readonly block: Block, frozen?: boolean[]) {
    this.J = J; this.floor = block.lo[1] - 0.5 * Math.max(block.hi[0] - block.lo[0], block.hi[1] - block.lo[1], block.hi[2] - block.lo[2]); const m0 = motionOf(block); this.motion = { ...m0, bodies: m0.bodies.map((x, i) => (frozen && frozen[i] !== undefined ? { ...x, frozen: frozen[i]!, why: frozen[i] ? 'held: frozen by hand' : 'loose: set by hand' } : x)) };
    const STATIC = 0, MOVING = 1, s = new J.JoltSettings(), pairs = new J.ObjectLayerPairFilterTable(2); pairs.EnableCollision(STATIC, MOVING); pairs.EnableCollision(MOVING, MOVING);
    const bp = new J.BroadPhaseLayerInterfaceTable(2, 2); bp.MapObjectToBroadPhaseLayer(STATIC, new J.BroadPhaseLayer(0)); bp.MapObjectToBroadPhaseLayer(MOVING, new J.BroadPhaseLayer(1));
    s.mObjectLayerPairFilter = pairs; s.mBroadPhaseLayerInterface = bp; s.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bp, 2, pairs, 2);
    this.jolt = new J.JoltInterface(s); J.destroy(s); const ps = this.jolt.GetPhysicsSystem(), bi = (this.bi = ps.GetBodyInterface());
    // (the engine's defaults are a game's, 2 cm of slop and 2 cm of contacts looked for ahead: on millimetre parts a link
    // swept 11 mm over a servo's tab by its turntable was hit by a contact predicted ahead and the shoulder it hung on was
    // thrown over (decision 0029); the settings simulate() uses, scaled to the parts)
    { const st = ps.GetPhysicsSettings(); st.mPenetrationSlop = 0.0002; st.mSpeculativeContactDistance = 0.002; st.mNumVelocitySteps = 12; st.mNumPositionSteps = 3; ps.SetPhysicsSettings(st); const gv = ps.GetGravity(); this.grav = [gv.GetX(), gv.GetY(), gv.GetZ()]; }
    const V = (v: readonly number[]) => new J.Vec3(v[0]!, v[1]!, v[2]!), R = (v: readonly number[]) => new J.RVec3(v[0]!, v[1]!, v[2]!), Q = (q: Q4) => new J.Quat(q[0], q[1], q[2], q[3]);
    const B = this.motion.bodies, filter = new J.GroupFilterTable(B.length + 1);
    // the floor, under all of it by half its widest (a crank swept round below where it stood does not touch it): what is
    // let go lands there
    { const pl = new J.Plane(V([0, 1, 0]), -this.floor), st = new J.PlaneShapeSettings(pl, undefined, 1000), sh = st.Create().Get(); J.destroy(st); J.destroy(pl);
      const cs = new J.BodyCreationSettings(sh, R([0, 0, 0]), Q([0, 0, 0, 1]), J.EMotionType_Static, STATIC); cs.mFriction = 0.6; cs.mCollisionGroup = new J.CollisionGroup(filter, 0, B.length); bi.AddBody(bi.CreateBody(cs).GetID(), J.EActivation_DontActivate); J.destroy(cs); }
    const parts = partOfBlock(block).parts ?? [], cr = (x: number) => Math.max(0, Math.min(0.0005, x * 0.3)), RX: M3 = [1, 0, 0, 0, 0, -1, 0, 1, 0];
    // (each piece as the engine takes it: its shape, where it is, how it is turned)
    const shapeOf = (i: number): { st: InstanceType<Jolt['ShapeSettings']>; pos: V3; R: M3 } => {
      const p = block.pieces[i]!, P = p.solid.base, f = (P.frame ?? [1, 0, 0, 0, 1, 0, 0, 0, 1]) as M3, c: V3 = [P.c[0], P.c[1], P.c[2]];
      if (P.k === 'box' && P.sect) { const g = gearOf(p); if (g) return { st: new J.CylinderShapeSettings(P.size[2] / 2, g.ra, cr(P.size[2] / 2)), pos: [g.at[0], g.at[1], P.c[2]], R: mul(f, RX) }; }
      if (P.k === 'box' || P.k === 'loft') return { st: new J.BoxShapeSettings(V([P.size[0] / 2, P.size[1] / 2, P.size[2] / 2]), cr(Math.min(...P.size) / 2)), pos: c, R: f };
      if (P.k === 'bend') { const [lo, hi] = primBox(P); return { st: new J.BoxShapeSettings(V([(hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2, (hi[2] - lo[2]) / 2]), 0.0005), pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], R: [1, 0, 0, 0, 1, 0, 0, 0, 1] }; }
      if (P.k === 'sphere') return { st: new J.SphereShapeSettings(P.r), pos: c, R: f };
      return { st: new J.CylinderShapeSettings(P.h / 2, P.r, cr(Math.min(P.h, 2 * P.r) / 2)), pos: c, R: f };
    };
    B.forEach((body, k) => {
      const sh = body.pieces.map(shapeOf), origin = sh[0]!.pos, mass = Math.max(1e-3, body.pieces.reduce((t, i) => t + (parts[i] ? massOfAll(parts[i]!) : 0), 0));
      let shape: InstanceType<Jolt['Shape']>, at = origin, q: Q4 = [0, 0, 0, 1];
      if (sh.length === 1) { shape = sh[0]!.st.Create().Get(); q = quatOf(sh[0]!.R); }
      else { const sc = new J.StaticCompoundShapeSettings(); for (const x of sh) sc.AddShape(V([x.pos[0] - origin[0], x.pos[1] - origin[1], x.pos[2] - origin[2]]), Q(quatOf(x.R)), x.st, 0); shape = sc.Create().Get(); J.destroy(sc); at = origin; }
      const cs = new J.BodyCreationSettings(shape, R(at), Q(q), body.frozen ? J.EMotionType_Static : J.EMotionType_Dynamic, body.frozen ? STATIC : MOVING);
      cs.mFriction = 0.5; cs.mRestitution = 0.2; cs.mLinearDamping = 0.05; cs.mAngularDamping = 0.05; cs.mMaxAngularVelocity = 400;
      // (never asleep: a small body driven slowly (an arm's turntable at 1 rad/s) was put to sleep by the engine after its
      // half second under its point-speed threshold, and its motor does not wake it (decision 0029: the arm stalled at 0.5 rad))
      cs.mAllowSleeping = false;
      cs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; cs.mMassPropertiesOverride.mMass = mass; cs.mCollisionGroup = new J.CollisionGroup(filter, 0, k);
      const bd = bi.CreateBody(cs); J.destroy(cs); bi.AddBody(bd.GetID(), body.frozen ? J.EActivation_DontActivate : J.EActivation_Activate);
      this.live.push({ body: bd, p0: at, q0: q, mass });
    });
    // (two bodies that turn or slide on each other, mesh, are joined by a belt or a rack, or touch with no gap do not
    // collide: what holds them is the joint or the face; two that are not joined do (a gripper's fingers hit what they
    // close on), what stands a gap apart included)
    const touch = new Set<string>(), bodyOf = new Map<number, number>(), pair = (a: number, c: number) => touch.add(`${Math.min(a, c)},${Math.max(a, c)}`); B.forEach((x, k) => x.pieces.forEach((i) => bodyOf.set(i, k)));
    for (const f of block.faces) { const a = bodyOf.get(f.a)!, c = bodyOf.get(f.b)!; if (a !== c && (f.gap === 0 || / meshes | laid round /.test(f.by))) pair(a, c); }
    for (const m of this.motion.meshes) pair(m.a, m.b);
    for (const j of this.motion.joints) pair(j.a, j.b);
    for (const r of this.motion.racks) pair(r.a, r.b);
    for (const x of this.motion.belts) { pair(x.a, x.b); for (const k of B.keys()) if (B[k]!.name === x.belt) { pair(k, x.a); pair(k, x.b); } }
    for (const k of touch) { const [a, c] = k.split(',').map(Number); filter.DisableCollision(a!, c!); }
    const unit = (d: V3): V3 => { const n = Math.hypot(...d); return [d[0] / n, d[1] / n, d[2] / n]; }, normalOf = (u: V3): V3 => { const e: V3 = Math.abs(u[0]) < 0.6 ? [1, 0, 0] : [0, 1, 0], c0 = cross(u, e); return unit(c0); };
    for (const j of this.motion.joints) {
      const A = B[j.a]!, S = B[j.b]!; if (A.frozen && S.frozen) continue;
      const u = unit(j.dir), nr = normalOf(u);
      // (the loose one is what moves: the constraint's second body; a shaft loose on a frozen sleeve turns in it the same way)
      const [b1, b2, who] = A.frozen ? [this.live[j.a]!.body, this.live[j.b]!.body, j.b] : [this.live[j.b]!.body, this.live[j.a]!.body, j.a];
      const sgn = A.frozen ? -1 : 1, rg = j.range ? (sgn > 0 ? j.range : [-j.range[1], -j.range[0]] as [number, number]) : undefined;
      // (a screw joint: its line kept in the screw's body's own frame, so it follows the screw wherever it goes)
      if (j.screw) { const r = this.live[j.b]!.body.GetRotation(), Rb = matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()]); this.screws.push({ a: j.a, b: j.b, k: j.screw / (2 * Math.PI), u: apply(T(Rb), u) }); }
      if (j.turns && !j.slide) {
        const st = new J.HingeConstraintSettings(); st.mPoint1 = R(j.point); st.mPoint2 = R(j.point); st.mHingeAxis1 = V(u); st.mHingeAxis2 = V(u); st.mNormalAxis1 = V(nr); st.mNormalAxis2 = V(nr); st.mNumVelocityStepsOverride = 30; st.mNumPositionStepsOverride = 10;
        // (a motor's: it drives to an angle on a spring of its own stiffness, 20 times its stall torque a radian (at stall it
        // gives 1/20 rad, 2.9°: an estimate of a hobby servo's loop), damped with a tenth of a second's time constant, no more
        // than its torque where that is known; 100 N·m/rad where it is not. Decision 0029: it was a 20 Hz spring, whose
        // stiffness the engine sets from the two bodies' own inertia alone, so a light turntable between the base and the arm
        // left the shoulder's spring weaker than the arm's weight over it, and a kick of 1e-4 N·m grew to a fall in a second,
        // while with the turntable frozen it held; a spring of no frequency drives nothing at all (everything fell))
        if (j.motor) { const ms = st.mMotorSettings, sp = ms.mSpringSettings, k = j.motor.torque ? 20 * j.motor.torque : 100; sp.mMode = J.ESpringMode_StiffnessAndDamping; sp.mStiffness = k; sp.mDamping = 0.1 * k; if (j.motor.torque) { ms.mMinTorqueLimit = -j.motor.torque; ms.mMaxTorqueLimit = j.motor.torque; } }
        const c = J.castObject(st.Create(b1, b2), J.HingeConstraint); J.destroy(st); ps.AddConstraint(c); this.joint.set(who, { kind: 'hinge', c, dir: u, point: j.point, last: 0, add: 0, s0: 0 });
        if (j.motor) { c.SetMotorState(J.EMotorState_Position); c.SetTargetAngle(0); this.held.add(who); }
      } else if (!j.turns) {
        const st = new J.SliderConstraintSettings(); st.mAutoDetectPoint = false; st.mPoint1 = R(j.point); st.mPoint2 = R(j.point); st.mSliderAxis1 = V(u); st.mSliderAxis2 = V(u); st.mNormalAxis1 = V(nr); st.mNormalAxis2 = V(nr);
        if (rg) { st.mLimitsMin = rg[0]; st.mLimitsMax = rg[1]; }
        const c = J.castObject(st.Create(b1, b2), J.SliderConstraint); J.destroy(st); ps.AddConstraint(c); this.joint.set(who, { kind: 'slide', c, dir: u, point: j.point, last: 0, add: 0, s0: 0 });
      } else {
        // (it turns and slides: a six-axis constraint with its own x along the line free to slide (within its room) and turn)
        const st = new J.SixDOFConstraintSettings(); st.mPosition1 = R(j.point); st.mPosition2 = R(j.point); st.mAxisX1 = V(u); st.mAxisX2 = V(u); st.mAxisY1 = V(nr); st.mAxisY2 = V(nr);
        st.MakeFreeAxis(J.SixDOFConstraintSettings_EAxis_RotationX); if (rg) st.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_TranslationX, rg[0], rg[1]); else st.MakeFreeAxis(J.SixDOFConstraintSettings_EAxis_TranslationX);
        const c = J.castObject(st.Create(b1, b2), J.SixDOFConstraint); J.destroy(st); ps.AddConstraint(c); this.joint.set(who, { kind: 'six', c, dir: u, point: j.point, last: 0, add: 0, s0: 0 });
      }
    }
    for (const m of this.motion.meshes) {
      const st = new J.GearConstraintSettings(); st.mHingeAxis1 = V([0, 0, 1]); st.mHingeAxis2 = V([0, 0, 1]); st.SetRatio(m.za, m.zb);
      const c = J.castObject(st.Create(this.live[m.a]!.body, this.live[m.b]!.body), J.GearConstraint); J.destroy(st);
      // (held by their speeds alone: Jolt's position correction reads the two hinges' angles wrapped to a turn, and with teeth in
      // any ratio but a whole one it pulls them off their ratio at every wrap (measured: 40:30 turned at 0.99, not 1.33))
      ps.AddConstraint(c);
    }
    // (a belt or chain: its two wheels the same way, by their teeth: a gear constraint with the second one's axis reversed)
    for (const x of this.motion.belts) { const ja = this.joint.get(x.a), jb = this.joint.get(x.b); if (!ja || !jb) continue;
      const st = new J.GearConstraintSettings(); st.mHingeAxis1 = V(ja.dir); st.mHingeAxis2 = V([-jb.dir[0], -jb.dir[1], -jb.dir[2]]); st.SetRatio(x.za, x.zb);
      const c = J.castObject(st.Create(this.live[x.a]!.body, this.live[x.b]!.body), J.GearConstraint); J.destroy(st); ps.AddConstraint(c); }
    // (a rack and its pinion: Jolt's rack-and-pinion constraint, the rack moved r a radian of its pinion's turn, its teeth
    // and length as drawn (n teeth, n π m long), the pinion's z)
    for (const r of this.motion.racks) { const jp = this.joint.get(r.a), jr = this.joint.get(r.b); if (!jp || !jr) continue;
      const st = new J.RackAndPinionConstraintSettings(); st.mHingeAxis = V(jp.dir); st.mSliderAxis = V(jr.dir); st.SetRatio(r.z, r.z * Math.PI * r.m, r.z);
      const c = J.castObject(st.Create(this.live[r.a]!.body, this.live[r.b]!.body), J.RackAndPinionConstraint); J.destroy(st); ps.AddConstraint(c); }
  }
  /** A torque about a body's joint, N·m (or, with none, nothing), held until the next step ends. */
  torque(body: number, T: number): void { this.pending.set(body, { ...this.pending.get(body), T }); }
  /** A pull on a body at a point of it, N (a body with no joint dragged by hand). */
  pull(body: number, F: V3, point: V3): void { this.pending.set(body, { ...this.pending.get(body), F, point }); }
  /** A body's joint driven at so many rad/s (a crank turned at a speed, a motor), to its motor's torque where it has one;
   *  null lets it go (or, for a motor's joint, holds it where it is). */
  spin(body: number, w: number | null): void { const h = this.joint.get(body); if (!h || h.kind !== 'hinge') return; const c = h.c as InstanceType<Jolt['HingeConstraint']>;
    if (w === null) { if (this.motorOf(body)) return this.hold(body); c.SetMotorState(this.J.EMotorState_Off); this.held.delete(body); }
    else { c.SetMotorState(this.J.EMotorState_Velocity); c.SetTargetAngularVelocity(w); this.held.delete(body); } this.bi.ActivateBody(this.live[body]!.body.GetID()); }
  /** A body's joint held at an angle (rad, as made 0; by default where it is now): a servo holding its horn where it is put.
   *  null lets it go. */
  hold(body: number, angle?: number | null): void { const h = this.joint.get(body); if (!h || h.kind !== 'hinge') return; const c = h.c as InstanceType<Jolt['HingeConstraint']>;
    if (angle === null) { c.SetMotorState(this.J.EMotorState_Off); this.held.delete(body); return; }
    // (Jolt's target is within a half turn of zero: the hinge's own angle, not counting whole turns)
    c.SetTargetAngle(angle ?? c.GetCurrentAngle()); c.SetMotorState(this.J.EMotorState_Position); this.held.add(body); this.bi.ActivateBody(this.live[body]!.body.GetID()); }
  /** Whether a body's joint is held at an angle now. */
  isHeld(body: number): boolean { return this.held.has(body); }
  /** The motor that drives a body's joint, if one does. */
  motorOf(body: number): MoveMotor | undefined { return this.motion.joints.find((j) => (j.a === body || j.b === body) && j.motor && this.joint.has(body))?.motor; }
  /** Whether a body turns (or slides) about a joint, and the line it moves about; what kind. */
  jointOf(body: number): { point: V3; dir: V3; kind: 'hinge' | 'slide' | 'six' } | undefined { const h = this.joint.get(body); return h ? { point: h.point, dir: h.dir, kind: h.kind } : undefined; }
  /** How far a body has turned about its joint since it began, rad (counting whole turns). */
  angle(body: number): number { const h = this.joint.get(body); return h ? h.last + h.add : 0; }
  /** How far a body has slid along its joint's line since it began, m. */
  slid(body: number): number { const h = this.joint.get(body), l = this.live[body]!; if (!h) return 0; const p = l.body.GetPosition(); return (p.GetX() - l.p0[0]) * h.dir[0] + (p.GetY() - l.p0[1]) * h.dir[1] + (p.GetZ() - l.p0[2]) * h.dir[2]; }
  /** How fast a body turns about its joint, rad/s; and its inertia about it, kg m². */
  spinOf(body: number): number { const h = this.joint.get(body); if (!h) return 0; const w = this.live[body]!.body.GetAngularVelocity(); return w.GetX() * h.dir[0] + w.GetY() * h.dir[1] + w.GetZ() * h.dir[2]; }
  inertiaAbout(body: number): number { const h = this.joint.get(body), b = this.live[body]!.body, mp = b.GetMotionProperties(); if (!h || !(mp.GetInverseMass() > 0)) return Infinity;
    const dv = mp.GetInverseInertiaDiagonal(), d: V3 = [dv.GetX(), dv.GetY(), dv.GetZ()], iq = mp.GetInertiaRotation(), r = b.GetRotation(), l = apply(T(matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()])), h.dir), p = apply(T(matQ([iq.GetX(), iq.GetY(), iq.GetZ(), iq.GetW()])), l), inv = d[0] * p[0] ** 2 + d[1] * p[1] ** 2 + d[2] * p[2] ** 2; return inv > 0 ? 1 / inv : Infinity; }
  /** A body's mass, kg. */
  massOf(body: number): number { return this.live[body]!.mass; }
  /** Where a body is now against where it began: the move to put on each of its pieces as drawn. */
  moved(body: number): THREE.Matrix4 { const l = this.live[body]!, p = l.body.GetPosition(), r = l.body.GetRotation();
    const now = new THREE.Matrix4().compose(new THREE.Vector3(p.GetX(), p.GetY(), p.GetZ()), new THREE.Quaternion(r.GetX(), r.GetY(), r.GetZ(), r.GetW()), new THREE.Vector3(1, 1, 1));
    return now.multiply(new THREE.Matrix4().compose(new THREE.Vector3(...l.p0), new THREE.Quaternion(...l.q0), new THREE.Vector3(1, 1, 1)).invert()); }
  /** Where a point of a body now is, given where it was as made. */
  pointOf(body: number, made: V3): V3 { const v = new THREE.Vector3(...made).applyMatrix4(this.moved(body)); return [v.x, v.y, v.z]; }
  /** Moves it on by dt, s, in steps of at most 1/240 s, the torques and pulls given held through them. */
  step(dt: number): void {
    const J = this.J, n = Math.max(1, Math.ceil(dt / (1 / 240) - 1e-9)), h = dt / n;
    for (let k = 0; k < n; k++) {
      for (const [i, f] of this.pending) { const b = this.live[i]!.body, hj = this.joint.get(i); if (this.motion.bodies[i]!.frozen) continue; this.bi.ActivateBody(b.GetID());
        if (f.T !== undefined && hj) this.bi.AddTorque(b.GetID(), new J.Vec3(hj.dir[0] * f.T, hj.dir[1] * f.T, hj.dir[2] * f.T), J.EActivation_Activate);
        if (f.F && f.point) this.bi.AddForce(b.GetID(), new J.Vec3(...f.F), new J.RVec3(...f.point), J.EActivation_Activate); }
      for (const s of this.screws) this.screw(s, h);
      this.jolt.Step(h, 1); this.t += h;
      for (const [i, hj] of this.joint) { const v = hj.kind === 'hinge' ? (hj.c as InstanceType<Jolt['HingeConstraint']>).GetCurrentAngle() : this.twist(i, hj.dir); if (v - hj.last > Math.PI) hj.add -= 2 * Math.PI; else if (hj.last - v > Math.PI) hj.add += 2 * Math.PI; hj.last = v; }
    }
    this.pending.clear();
  }
  /** A screw joint's tie, once: the relative speed along the line less k times the relative turn about it, undone by one
   *  impulse pair (λ u on the nut, −λ k u about it; the opposite on the screw), λ = −C / (1/mₐ + 1/m_b + k² (u·Iₐ⁻¹u + u·I_b⁻¹u)). */
  private screw(s: { a: number; b: number; k: number; u: V3 }, h: number): void {
    const J = this.J, A = this.live[s.a]!, B = this.live[s.b]!, fa = this.motion.bodies[s.a]!.frozen, fb = this.motion.bodies[s.b]!.frozen; if (fa && fb) return;
    // (the speeds the step will integrate with: gravity's share of this step added to a loose body's (the engine adds it after
    // this tie is made; without it the tie lagged gravity a step each step, 8 mm in a fifth of a second on a nut hanging on
    // its screw); and a tenth of the drift so far (the slide less k times the turn, since the start) taken back each step)
    const rb = B.body.GetRotation(), u = apply(matQ([rb.GetX(), rb.GetY(), rb.GetZ(), rb.GetW()]), s.u), g = this.grav;
    const vel = (l: typeof A, frozen: boolean): [V3, V3] => { if (frozen) return [[0, 0, 0], [0, 0, 0]]; const v = l.body.GetLinearVelocity(), w = l.body.GetAngularVelocity(); return [[v.GetX() + g[0] * h, v.GetY() + g[1] * h, v.GetZ() + g[2] * h], [w.GetX(), w.GetY(), w.GetZ()]]; };
    const moved = (l: typeof A, frozen: boolean): number => { if (frozen) return 0; const p = l.body.GetPosition(); return (p.GetX() - l.p0[0]) * u[0] + (p.GetY() - l.p0[1]) * u[1] + (p.GetZ() - l.p0[2]) * u[2]; };
    const drift = moved(A, fa) - moved(B, fb) - s.k * ((fa ? 0 : this.twist(s.a, u)) - (fb ? 0 : this.twist(s.b, u)));
    const [va, wa] = vel(A, fa), [vb, wb] = vel(B, fb), C = dot([va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]], u) - s.k * dot([wa[0] - wb[0], wa[1] - wb[1], wa[2] - wb[2]], u) + (0.1 * drift) / h;
    const inv = (l: typeof A, frozen: boolean): number => { if (frozen) return 0; const mp = l.body.GetMotionProperties(), im = mp.GetInverseMass(), Iv = l.body.GetInverseInertia().Multiply3x3(new J.Vec3(u[0], u[1], u[2])); return im + s.k * s.k * (Iv.GetX() * u[0] + Iv.GetY() * u[1] + Iv.GetZ() * u[2]); };
    const K = inv(A, fa) + inv(B, fb); if (!(K > 0) || Math.abs(C) < 1e-12) return; const lam = -C / K;
    if (!fa) { this.bi.AddImpulse(A.body.GetID(), new J.Vec3(lam * u[0], lam * u[1], lam * u[2])); this.bi.AddAngularImpulse(A.body.GetID(), new J.Vec3(-lam * s.k * u[0], -lam * s.k * u[1], -lam * s.k * u[2])); }
    if (!fb) { this.bi.AddImpulse(B.body.GetID(), new J.Vec3(-lam * u[0], -lam * u[1], -lam * u[2])); this.bi.AddAngularImpulse(B.body.GetID(), new J.Vec3(lam * s.k * u[0], lam * s.k * u[1], lam * s.k * u[2])); }
  }
  /** A body's turn about a line since it began, within a half turn (its rotation's twist about the line). */
  private twist(body: number, u: V3): number { const l = this.live[body]!, r = l.body.GetRotation(), q = new THREE.Quaternion(r.GetX(), r.GetY(), r.GetZ(), r.GetW()).multiply(new THREE.Quaternion(...l.q0).invert());
    return 2 * Math.atan2(q.x * u[0] + q.y * u[1] + q.z * u[2], q.w); }
  /** Stopped: the engine let go of. What is drawn goes back to how it was made. */
  destroy(): void { this.J.destroy(this.jolt); }
}
