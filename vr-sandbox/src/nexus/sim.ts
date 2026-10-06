// What is made, let go: real rigid-body physics (Jolt) over it, so a generation can be tested by what it does. Each
// shape on its own, and each joined piece as one body of all its members, falls under gravity, lands, slides, tips,
// bounces and comes to rest on the floor, on the build (fixed where it stands) and on each other, with the friction
// and restitution of what each is made of. A group (moved as one, not held) is its members, each on its own. Round
// things are their own shapes (cylinders, spheres); a cone, a ring and a tube are the hull round them, said as such.
//
// The motion is kept, sampled 30 times a second, so the room can show it as it happened; where things end is written
// back into what is made.

import type { Jolt } from './realize';
import { eulerOf, matOf, type Axis, type M3, type V3 } from './generate';

export interface SimPart { name: string; kind: string; axis: Axis; dims: Record<string, number>; local: { w: number; h: number; d: number }; at: V3; turn: V3 }
export interface SimThing { name: string; parts: SimPart[]; mass: number; friction: number; restitution: number }
export interface SimBox { at: V3; w: number; h: number; d: number }
export interface SimEnd { name: string; from: V3; to: V3; moved: number; dropped: number; turned: number; speed: number; resting: boolean }
export interface SimTrack { names: string[]; frames: { t: number; poses: { at: V3; q: [number, number, number, number] }[] }[] }
export interface SimOut { ends: SimEnd[]; parts: { name: string; at: V3; turn: V3 }[]; seconds: number; restedAt: number | null; track: SimTrack; hulls: string[] }

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
export function simulate(J: Jolt, things: SimThing[], fixed: SimBox[], o: { seconds: number; floor?: number; push?: { name: string; force: V3; seconds: number } }): SimOut {
  const LAYER_STATIC = 0, LAYER_MOVING = 1, s = new J.JoltSettings();
  const pairs = new J.ObjectLayerPairFilterTable(2); pairs.EnableCollision(LAYER_STATIC, LAYER_MOVING); pairs.EnableCollision(LAYER_MOVING, LAYER_MOVING);
  const bp = new J.BroadPhaseLayerInterfaceTable(2, 2); bp.MapObjectToBroadPhaseLayer(LAYER_STATIC, new J.BroadPhaseLayer(0)); bp.MapObjectToBroadPhaseLayer(LAYER_MOVING, new J.BroadPhaseLayer(1));
  s.mObjectLayerPairFilter = pairs; s.mBroadPhaseLayerInterface = bp; s.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bp, 2, pairs, 2);
  const jolt = new J.JoltInterface(s); J.destroy(s);
  const ps = jolt.GetPhysicsSystem(), bi = ps.GetBodyInterface();
  const st = ps.GetPhysicsSettings(); st.mPenetrationSlop = 0.0005; st.mSpeculativeContactDistance = 0.01; st.mNumVelocitySteps = 12; st.mNumPositionSteps = 3; ps.SetPhysicsSettings(st);
  const V = (v: readonly number[]) => new J.Vec3(v[0]!, v[1]!, v[2]!), R = (v: readonly number[]) => new J.RVec3(v[0]!, v[1]!, v[2]!), Q = (q: Q4) => new J.Quat(q[0], q[1], q[2], q[3]);
  const cr = (m: number) => Math.max(0, Math.min(0.002, m * 0.3)), hulls: string[] = [];
  const staticBox = (b: SimBox) => { const sh = new J.BoxShapeSettings(V([b.w / 2, b.h / 2, b.d / 2]), cr(Math.min(b.w, b.h, b.d) / 2)).Create().Get(); const cs = new J.BodyCreationSettings(sh, R(b.at), Q([0, 0, 0, 1]), J.EMotionType_Static, LAYER_STATIC); cs.mFriction = 0.6; const body = bi.CreateBody(cs); J.destroy(cs); bi.AddBody(body.GetID(), J.EActivation_DontActivate); };
  // the floor, a metre thick, a hundred metres across; and the build, where it stands
  staticBox({ at: [0, (o.floor ?? 0) - 0.5, 0], w: 100, h: 1, d: 100 }); for (const b of fixed) staticBox(b);
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
  type Live = { thing: SimThing; body: InstanceType<Jolt['Body']>; origin: V3; rel: { part: SimPart; at: V3; R: M3; extra: M3 }[]; from: V3; speed: number; Rfrom: M3 };
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
    const body = bi.CreateBody(cs); J.destroy(cs); bi.AddBody(body.GetID(), J.EActivation_Activate);
    if (single) rel[0]!.at = [0, 0, 0];
    live.push({ thing: th, body, origin, rel, from: [...origin] as V3, speed: 0, Rfrom: single ? rel[0]!.R : [1, 0, 0, 0, 1, 0, 0, 0, 1] });
  }
  /** Where each part of a body stands now: its place and its turning in the room. */
  const posesOf = (l: Live) => {
    const p = l.body.GetPosition(), r = l.body.GetRotation(), at: V3 = [p.GetX(), p.GetY(), p.GetZ()], q: Q4 = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], Rb = matQ(q), single = l.rel.length === 1;
    return l.rel.map((x) => { const off = apply(Rb, x.at), Rw = single ? Rb : mul(Rb, x.R); const turn = x.part.kind === 'cylinder' || x.part.kind === 'cone' || x.part.kind === 'tube' || x.part.kind === 'torus' ? mul(Rw, T(AXIS_TO[x.part.axis])) : Rw; return { name: x.part.name, at: [at[0] + off[0], at[1] + off[1], at[2] + off[2]] as V3, turnM: turn, q: quatOf(turn) }; });
  };
  const dt = 1 / 240, track: SimTrack = { names: live.flatMap((l) => l.rel.map((x) => x.part.name)), frames: [] };
  let t = 0, restedAt: number | null = null, sample = 0;
  const pushed = o.push ? live.find((l) => l.thing.name === o.push!.name || l.rel.some((x) => x.part.name === o.push!.name)) : undefined;
  if (o.push && !pushed) throw new Error(`Nothing named ${o.push.name} is let go here`);
  while (t < o.seconds - 1e-9) {
    if (pushed && t < o.push!.seconds) { bi.ActivateBody(pushed.body.GetID()); bi.AddForce(pushed.body.GetID(), V(o.push!.force), J.EActivation_Activate); }
    jolt.Step(dt, 1); t += dt;
    for (const l of live) { const v = l.body.GetLinearVelocity(); l.speed = Math.max(l.speed, Math.hypot(v.GetX(), v.GetY(), v.GetZ())); }
    if (t >= sample - 1e-9) { track.frames.push({ t, poses: live.flatMap((l) => posesOf(l).map((x) => ({ at: x.at, q: x.q }))) }); sample += 1 / 30; }
    if (t > 0.25 && (!pushed || t > o.push!.seconds) && live.every((l) => !bi.IsActive(l.body.GetID()))) { restedAt = t; break; }
  }
  const ends: SimEnd[] = [], parts: SimOut['parts'] = [];
  for (const l of live) {
    const poses = posesOf(l), p = l.body.GetPosition(), to: V3 = [p.GetX(), p.GetY(), p.GetZ()];
    const r = l.body.GetRotation(), Rnow = matQ([r.GetX(), r.GetY(), r.GetZ(), r.GetW()]), Rd = mul(Rnow, T(l.Rfrom)), turned = Math.acos(Math.max(-1, Math.min(1, (Rd[0] + Rd[4] + Rd[8] - 1) / 2)));
    ends.push({ name: l.thing.name, from: l.from, to, moved: Math.hypot(to[0] - l.from[0], to[1] - l.from[1], to[2] - l.from[2]), dropped: l.from[1] - to[1], turned, speed: l.speed, resting: !bi.IsActive(l.body.GetID()) });
    for (const x of poses) parts.push({ name: x.name, at: x.at, turn: eulerOf(x.turnM) });
  }
  J.destroy(jolt);
  return { ends, parts, seconds: t, restedAt, track, hulls };
}
