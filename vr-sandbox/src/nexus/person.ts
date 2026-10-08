// People in the room, by real physics: each body its rig's fifteen rigid segments (src/nexus/life/segments.ts) under
// gravity on Jolt, joined by joints that move only through their measured ranges, each joint turned by a motor that is
// its muscles: it pulls toward the pose asked of it, but never with more torque than those muscles give. Nothing holds a
// body up but its own joints and the friction under its feet; pushed too hard, hit too hard or caught off balance it
// falls, and lies where it fell.
//
// What a body does is asked of it from outside, by name ("person kai jab"), so all of it can be driven from a pipeline:
// each person reads out what it senses as facts (how near its opponent is, how hard it was hit, whether it is down, how
// far its centre of mass is off its feet), and its rules, a board of IF a fact THEN a move, decide what it does.
//
// A move is poses in turn, each the angles of the joints it moves and how long it takes; a stance is the pose held
// between them. Balance is the ankle strategy: the ankles lean the body back over its feet by how far, and how fast, its
// centre of mass is off them.

import type { Jolt } from './realize';
import { layOut, type Body, type BodyParams, type V3 } from './anatomy';
import type { Board } from './boards';
import { rigOf, centreOf, type Joint, type Rig, type Segment, type SegmentId } from './life/segments';

type Q = [number, number, number, number];
const qMul = (a: Q, b: Q): Q => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qConj = (q: Q): Q => [-q[0], -q[1], -q[2], q[3]];
const qAxis = (ax: V3, ang: number): Q => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
const qRot = (q: Q, v: V3): V3 => { const p = qMul(qMul(q, [v[0], v[1], v[2], 0]), qConj(q)); return [p[0], p[1], p[2]]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const D2R = Math.PI / 180;
/** The shortest turn taking one direction onto another. */
function qFromTo(a: V3, b: V3): Q {
  const u = unit(a), v = unit(b), d = dot(u, v);
  if (d > 0.999999) return [0, 0, 0, 1];
  if (d < -0.999999) { const ax = Math.abs(u[0]) < 0.9 ? unit(cross(u, [1, 0, 0])) : unit(cross(u, [0, 1, 0])); return [ax[0], ax[1], ax[2], 0]; }
  const c = cross(u, v), q: Q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(...q); return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
/** The turn whose columns are these axes. */
function qBasis(x: V3, y: V3, z: V3): Q {
  const [m00, m10, m20] = x, [m01, m11, m21] = y, [m02, m12, m22] = z, tr = m00 + m11 + m22;
  let q: Q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
  const l = Math.hypot(...q); return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

/** Joint angles, degrees: [flexion, abduction (or to the left, for the back and neck), twist]. */
export type Pose = Record<string, [number, number, number]>;
export interface Phase { pose: Pose; s: number; /** how hard the muscles are driven: the motors' natural frequency, Hz */ hz?: number; /** how damped (1 critical; a throw less, so it is fast) */ zeta?: number }
export interface Move { name: string; says: string; phases: Phase[]; /** a straight strike: the arm that throws it, steered to the target through its first phase */ aims?: 'lead' | 'rear' }

/** A stance: how far the hips sink and the feet spread front to back (m), which foot leads, and the upper body's pose.
 *  The legs' angles are not said: they follow from where the feet must be (src/nexus/person.ts legsFor). */
export interface Stance { crouch: number; stride: number; lead: 'L' | 'R' | null; upper: Pose }
export const STANCES: Record<'stand' | 'guard' | 'cover', Stance> = {
  stand: { crouch: 0.01, stride: 0, lead: null, upper: { shoulderL: [4, 8, 0], shoulderR: [4, 8, 0], elbowL: [12, 0, 0], elbowR: [12, 0, 0] } },
  // orthodox: the left foot and hand forward, the feet 30 cm apart front to back (as far as a body held this stiff
  // stays up on; wider and it topples, with no stepping yet to catch it), knees soft, chin down
  guard: { crouch: 0.015, stride: 0.3, lead: 'L', upper: { lumbar: [6, 0, 0], thoracic: [6, 0, 0], neck: [12, 0, 0], shoulderL: [55, 12, 0], elbowL: [110, 0, -40], wristL: [0, 0, 0], shoulderR: [40, 14, 0], elbowR: [135, 0, -40], wristR: [0, 0, 0] } },
  cover: { crouch: 0.03, stride: 0.3, lead: 'L', upper: { lumbar: [14, 0, 0], thoracic: [10, 0, 0], neck: [24, 0, 0], shoulderL: [75, 8, 0], elbowL: [145, 0, -40], shoulderR: [75, 8, 0], elbowR: [145, 0, -40] } },
};
/** The legs' angles that put both feet flat on the floor where a stance has them: each leg a thigh and a shank, the
 *  knee's bend from the law of cosines for the hip-to-ankle distance, the hip's from that line's lean and the thigh's
 *  angle off it, the ankle's what keeps the foot flat. The front foot a little nearer under the body than the back,
 *  and the stride no longer than the ankles let both heels stay down. */
export function legsFor(rig: Rig, st: Stance): Pose {
  // the stride shortened, a tenth at a time, until both heels can stay down within the ankles' range (and a margin)
  for (let k = 0, stride = st.stride; k < 30; k++, stride *= 0.9) {
    const legs = legsAt(rig, { ...st, stride }), dorsi = rig.joints.find((j) => j.id === 'ankleL')!.range.flex[1] * 0.85;
    if (Object.entries(legs).every(([id, a]) => !id.startsWith('ankle') || a[0] <= dorsi) || stride < 0.02) return legs;
  }
  return legsAt(rig, { ...st, stride: 0 });
}
function legsAt(rig: Rig, st: Stance): Pose {
  const at = (id: string) => rig.joints.find((j) => j.id === id)!.at, out: Pose = {};
  for (const s of ['L', 'R'] as const) {
    const hip = at(`hip${s}`), knee = at(`knee${s}`), ankle = at(`ankle${s}`), L1 = Math.hypot(...sub(knee, hip)), L2 = Math.hypot(...sub(ankle, knee));
    const fwd = st.lead === null ? 0 : st.lead === s ? 0.45 * st.stride : -0.55 * st.stride;
    const dy = hip[1] - st.crouch - ankle[1], dz = (ankle[2] - hip[2]) + fwd, D = Math.min(L1 + L2 - 1e-4, Math.hypot(dy, dz));
    const kneeIn = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2)))), kneeFlex = Math.PI - kneeIn;
    const lean = Math.atan2(dz, dy), off = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
    const hipFlex = lean + off, ankle0 = kneeFlex - hipFlex;
    out[`hip${s}`] = [hipFlex / D2R, 3, 0]; out[`knee${s}`] = [kneeFlex / D2R, 0, 0]; out[`ankle${s}`] = [ankle0 / D2R, 0, 0];
  }
  return out;
}
/** Strikes, each a chamber, a throw and a return; their speed is what the muscles' torques make of the arm's mass. */
export const MOVES: Record<string, Move> = {
  jab: { name: 'jab', says: 'the lead hand straight out and back', aims: 'lead', phases: [
    { pose: { shoulderL: [88, 6, 0], elbowL: [4, 0, -60], thoracic: [6, 0, -8] }, s: 0.2, hz: 9, zeta: 0.6 },
    { pose: {}, s: 0.22, hz: 6 }] },
  cross: { name: 'cross', says: 'the rear hand straight across, the trunk turning behind it', aims: 'rear', phases: [
    { pose: { shoulderR: [88, 4, 0], elbowR: [4, 0, -60], lumbar: [6, 0, 18], thoracic: [6, 0, 16] }, s: 0.24, hz: 9, zeta: 0.6 },
    { pose: {}, s: 0.25, hz: 6 }] },
  hook: { name: 'hook', says: 'the lead hand round in an arc, the elbow up, the trunk turning into it', phases: [
    { pose: { shoulderL: [55, 70, 0], elbowL: [95, 0, -20], thoracic: [4, 0, 8] }, s: 0.1, hz: 6 },
    { pose: { shoulderL: [100, 25, 0], elbowL: [90, 0, -20], lumbar: [6, 0, -14], thoracic: [6, 0, -18] }, s: 0.2, hz: 9, zeta: 0.6 },
    { pose: {}, s: 0.25, hz: 6 }] },
  uppercut: { name: 'uppercut', says: 'the rear hand up from below, the trunk turning behind it', phases: [
    { pose: { shoulderR: [25, 10, 0], elbowR: [95, 0, 0], lumbar: [8, 0, 6] }, s: 0.12, hz: 6 },
    { pose: { shoulderR: [105, 4, 0], elbowR: [85, 0, 0], lumbar: [4, 0, 12] }, s: 0.2, hz: 8, zeta: 0.7 },
    { pose: {}, s: 0.28, hz: 6 }] },
  cover: { name: 'cover', says: 'both hands up by the head, chin down', phases: [{ pose: STANCES.cover.upper, s: 0.9, hz: 7 }] },
};
/** What a fighter throws when it attacks, and how often of each (an estimate of a boxer's mix: jabs most). */
export const MIX: [string, number][] = [['jab', 0.5], ['cross', 0.32], ['uppercut', 0.18]];
// the hook is left out of the mix for now: thrown from this stance its turn takes the body off its feet (with no step yet
// to catch it), so a fighter throws it only when asked

const SEG_IDS: SegmentId[] = ['pelvis', 'abdomen', 'thorax', 'head', 'upperArmL', 'forearmL', 'handL', 'upperArmR', 'forearmR', 'handR', 'thighL', 'shankL', 'footL', 'thighR', 'shankR', 'footR'];

/** What a person senses, as numbers its rules read. */
export interface Senses {
  /** m: its centre of mass, and how far it is off the middle of its feet (forward, to the side) */ com: V3; off: [number, number];
  /** m: its head's height, and that height over its standing head's */ head: number; headShare: number;
  /** g: the hardest its head was jolted over the last second (the change of its velocity in a step, over the step, beyond gravity) */ hurt: number;
  /** its target's head over its reach (1: just in reach) */ reach: number; down: boolean; busy: boolean; hits: number; stamina: number;
}

interface Live { seg: Segment; body: InstanceType<Jolt['Body']>; rest: { c: V3; r: Q }; v: V3 }
interface LiveJoint { j: Joint; c: InstanceType<Jolt['SixDOFConstraint']>; frame: Q; zIsAbduction: boolean; /** what it holds against gravity: the mass on its loaded side and that mass's lever from it */ load: { m: number; d: number } }

/** What a joint holds against gravity standing: for a leg's joints all the body above them (the side toward the
 *  pelvis), for the back, the neck and the arms what is above them or hangs from them (the side away from the pelvis):
 *  that mass, and its centre's distance from the joint. */
function loadOf(rig: Rig, j: Joint): { m: number; d: number } {
  const kids = new Map<SegmentId, SegmentId[]>(); for (const x of rig.joints) kids.set(x.parent, [...(kids.get(x.parent) ?? []), x.child]);
  const below = (id: SegmentId): SegmentId[] => [id, ...(kids.get(id) ?? []).flatMap(below)];
  const childSide = new Set(below(j.child)), leg = /^(hip|knee|ankle)/.test(j.id);
  const side = rig.segments.filter((s) => (leg ? !childSide.has(s.id) : childSide.has(s.id)));
  const m = side.reduce((a, s) => a + s.mass, 0), c = scale(side.reduce((a, s) => addv(a, scale(centreOf(s), s.mass)), [0, 0, 0] as V3), 1 / m);
  return { m, d: Math.max(0.03, Math.hypot(...sub(c, j.at))) };
}

/** A person: a body, its rig, its joints driven toward the pose asked of it, and what it senses. */
export class Person {
  readonly rig: Rig; readonly params: BodyParams; readonly H: number; readonly body: Body;
  /** how long it has been down, s (not counted while it lies where it was laid) */ downFor = 0; /** laid down on purpose */ laid = false;
  readonly parts: Live[] = []; readonly joints: LiveJoint[] = [];
  /** where it stands and which way it faces (radians about +y: 0 faces +z) */ x: number; z: number; yaw: number;
  stance: keyof typeof STANCES = 'stand';
  /** each stance's whole pose, its legs solved for this body */ readonly stancePoses: Record<keyof typeof STANCES, Pose>;
  /** the move under way, and how far into it (s) */ move: Move | null = null; moveT = 0; queue: string[] = [];
  /** muscles on (1) or slack (0): a body knocked out goes slack */ tone = 1; dazed = 0;
  /** its strength, over what its muscle gives (set by you: a partner who resists less, or more) */ power = 1;
  /** how its whole body is turned from upright, where it is laid down (on its back, face down) */ private root: Q = [0, 0, 0, 1];
  target: { person?: Person; point?: V3 } | null = null; hits = 0; stamina = 100; struck = 0; /** strikes it has thrown */ thrown = 0;
  private hurtLog: { t: number; g: number }[] = []; private time = 0; private standHead: number; private headV: V3 = [0, 0, 0];
  log: string[] = [];

  constructor(readonly J: Jolt, readonly world: People, readonly name: string, params: Partial<BodyParams>, at: { x: number; z: number; yaw: number }, readonly group: number, density: number, readonly fighter = false) {
    const body = layOut(params); this.body = body; this.params = body.params; this.H = body.H; this.rig = rigOf(body, density);
    this.stancePoses = Object.fromEntries(Object.entries(STANCES).map(([k, st]) => [k, { ...legsFor(this.rig, st), ...st.upper }])) as Record<keyof typeof STANCES, Pose>;
    this.x = at.x; this.z = at.z; this.yaw = at.yaw; this.stance = fighter ? 'guard' : 'stand';
    const bi = world.bi, filter = new J.GroupFilterTable(SEG_IDS.length);
    for (let a = 0; a < SEG_IDS.length; a++) for (let b = a + 1; b < SEG_IDS.length; b++) filter.DisableCollision(a, b);
    const yawQ = qAxis([0, 1, 0], this.yaw), place = (p: V3): V3 => addv(qRot(yawQ, p), [this.x, 0, this.z]);
    for (const seg of this.rig.segments) {
      const c = centreOf(seg), r: Q = seg.shape.kind === 'capsule' ? qFromTo([0, 1, 0], sub(seg.b, seg.a)) : [0, 0, 0, 1];
      const L = Math.hypot(...sub(seg.b, seg.a));
      const ss = seg.shape.kind === 'capsule' ? new J.CapsuleShapeSettings(Math.max(0.005, L / 2), seg.shape.r) : new J.BoxShapeSettings(new J.Vec3(...seg.shape.half), Math.min(0.01, Math.min(...seg.shape.half) * 0.5));
      const shape = ss.Create().Get(); J.destroy(ss);
      const pw = place(c), rw = qMul(yawQ, r);
      const cs = new J.BodyCreationSettings(shape, new J.RVec3(...pw), new J.Quat(...rw), J.EMotionType_Dynamic, world.MOVING);
      cs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; cs.mMassPropertiesOverride.mMass = seg.mass;
      cs.mFriction = seg.id.startsWith('foot') ? 1.0 : 0.6; cs.mRestitution = 0; cs.mLinearDamping = 0.02; cs.mAngularDamping = 0.05; cs.mMaxAngularVelocity = 60;
      cs.mCollisionGroup = new J.CollisionGroup(filter, group, SEG_IDS.indexOf(seg.id));
      const b = bi.CreateBody(cs); J.destroy(cs); bi.AddBody(b.GetID(), J.EActivation_Activate);
      this.parts.push({ seg, body: b, rest: { c, r }, v: [0, 0, 0] });
    }
    const partOf = (id: SegmentId) => this.parts.find((p) => p.seg.id === id)!;
    for (const j of this.rig.joints) {
      const X = j.twistAxis, Y = unit(sub(j.flexAxis, scale(X, dot(j.flexAxis, X)))), Z = cross(X, Y);
      const s = new J.SixDOFConstraintSettings(); s.mSpace = J.EConstraintSpace_WorldSpace;
      const pw = place(j.at), Xw = qRot(yawQ, X), Yw = qRot(yawQ, Y);
      s.mPosition1 = new J.RVec3(...pw); s.mPosition2 = new J.RVec3(...pw); s.mAxisX1 = new J.Vec3(...Xw); s.mAxisX2 = new J.Vec3(...Xw); s.mAxisY1 = new J.Vec3(...Yw); s.mAxisY2 = new J.Vec3(...Yw);
      for (const ax of [J.SixDOFConstraintSettings_EAxis_TranslationX, J.SixDOFConstraintSettings_EAxis_TranslationY, J.SixDOFConstraintSettings_EAxis_TranslationZ]) s.MakeFixedAxis(ax);
      const zIsAbduction = dot(Y, j.outward) > 0, r = j.range;
      const zLim: [number, number] = zIsAbduction ? [r.side[0], r.side[1]] : [-r.side[1], -r.side[0]];
      s.mSwingType = J.ESwingType_Pyramid;
      s.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_RotationX, r.twist[0] * D2R, r.twist[1] * D2R);
      s.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_RotationY, r.flex[0] * D2R, r.flex[1] * D2R);
      s.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_RotationZ, zLim[0] * D2R, zLim[1] * D2R);
      const con = s.Create(partOf(j.parent).body, partOf(j.child).body); J.destroy(s); world.ps.AddConstraint(con);
      const c = J.castObject(con, J.SixDOFConstraint);
      this.joints.push({ j, c, frame: qBasis(X, Y, Z), zIsAbduction, load: loadOf(this.rig, j) });
    }
    this.standHead = this.rig.segments.find((s) => s.id === 'head')!.b[1];
    this.pose(this.stancePoses[this.stance], true); this.drive(this.stancePoses[this.stance], 5);
  }

  /** The angles of a pose blended over the stance: what the joints are driven toward now. */
  private aim(): { pose: Pose; hz: number; zeta: number } {
    const base = { ...this.stancePoses[this.stance] };
    if (!this.move) return { pose: base, hz: 5, zeta: 1 };
    let t = this.moveT;
    for (const [i, ph] of this.move.phases.entries()) { if (t <= ph.s) return { pose: { ...base, ...ph.pose, ...(i === 0 ? this.steer(this.move) : {}) }, hz: ph.hz ?? 6, zeta: ph.zeta ?? 1 }; t -= ph.s; }
    return { pose: base, hz: 5, zeta: 1 };
  }
  /** A joint's angles as the turn of its child in its frame: the bone swung to where flexion and abduction take it, then
   *  twisted about itself. */
  private turnOf(lj: LiveJoint, a: [number, number, number]): Q {
    // a right limb's twist the mirror of a left's, so the same angles turn both the same way to the body (inward)
    const [f, s, t0] = a, t = /R$/.test(lj.j.id) ? -t0 : t0, z = (lj.zIsAbduction ? s : -s) * D2R;
    const d = qRot(qMul(qAxis([0, 1, 0], f * D2R), qAxis([0, 0, 1], z)), [1, 0, 0]);
    return qMul(qFromTo([1, 0, 0], d), qAxis([1, 0, 0], t * D2R));
  }
  /** Drive every joint toward a pose: each motor a spring stiff enough to hold what the joint carries against gravity
   *  (k = κ m g d, κ from how hard the move drives it: 12 at a 5 Hz stance, the lever at least 15 cm, what arms held out
   *  put on the back), damped critically for that load (c = 2 √(k m d²)), its torque its muscles' at most. A joint only
   *  as stiff as gravity's pull on what it carries (κ = 1) is on the edge of falling over; people hold theirs a few times
   *  stiffer by holding both sides of each joint at once. */
  drive(pose: Pose, hz: number, zeta = 1): void {
    const J = this.J, k = this.tone * this.power * (this.dazed > 0 ? 0.35 : 1), kappa = 12 * (hz / 5) ** 2;
    for (const lj of this.joints) {
      const m = lj.load.m, d = Math.max(0.15, lj.load.d), stiff = kappa * m * this.world.g * d, damp = 2 * zeta * Math.sqrt(stiff * m * d * d);
      const a = pose[lj.j.id] ?? [0, 0, 0], tq = lj.j.torque;
      const lims: [number, [number, number]][] = [
        [J.SixDOFConstraintSettings_EAxis_RotationX, [-tq.twist, tq.twist]],
        [J.SixDOFConstraintSettings_EAxis_RotationY, [-tq.flex[0], tq.flex[1]]],
        [J.SixDOFConstraintSettings_EAxis_RotationZ, lj.zIsAbduction ? [-tq.side[0], tq.side[1]] : [-tq.side[1], tq.side[0]]],
      ];
      for (const [ax, [lo, hi]] of lims) {
        const ms = lj.c.GetMotorSettings(ax); ms.mSpringSettings.mMode = J.ESpringMode_StiffnessAndDamping; ms.mSpringSettings.mStiffness = stiff * k; ms.mSpringSettings.mDamping = damp * Math.sqrt(Math.max(k, 0.05));
        ms.mMinTorqueLimit = lo * k; ms.mMaxTorqueLimit = hi * k;
        lj.c.SetMotorState(ax, k > 0 ? J.EMotorState_Position : J.EMotorState_Off);
      }
      const q = this.turnOf(lj, a); lj.c.SetTargetOrientationCS(new J.Quat(...q));
    }
  }
  /** Set the body in a pose where it stands, its feet on the floor, still: each segment turned from its parent through
   *  the joint between them. */
  pose(pose: Pose, still = true): void {
    const J = this.J, bi = this.world.bi, R = new Map<SegmentId, { q: Q; t: V3 }>();
    const rq = this.root, rc = this.rig.segments.find((x) => x.id === 'pelvis')!; const rcen = centreOf(rc);
    R.set('pelvis', { q: rq, t: sub(rcen, qRot(rq, rcen)) });
    for (const lj of this.joints) {
      const p = R.get(lj.j.parent)!, rel = qMul(qMul(lj.frame, this.turnOf(lj, pose[lj.j.id] ?? [0, 0, 0])), qConj(lj.frame));
      const q = qMul(p.q, rel), t = sub(addv(qRot(p.q, lj.j.at), p.t), qRot(q, lj.j.at));
      R.set(lj.j.child, { q, t });
    }
    // the lowest point of it on the floor: the corners of its boxes, the ends of its capsules
    let low = Infinity;
    for (const l of this.parts) {
      const m = R.get(l.seg.id)!, sh = l.seg.shape;
      if (sh.kind === 'box') { const h = sh.half; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const corner = addv(l.rest.c, [sx * h[0], sy * h[1], sz * h[2]]); low = Math.min(low, addv(qRot(m.q, corner), m.t)[1]); } }
      else for (const e of [l.seg.a, l.seg.b]) low = Math.min(low, addv(qRot(m.q, e), m.t)[1] - sh.r);
    }
    const lift = 0.002 - low, yawQ = qAxis([0, 1, 0], this.yaw);
    for (const l of this.parts) {
      const m = R.get(l.seg.id)!, c = addv(addv(qRot(m.q, l.rest.c), m.t), [0, lift, 0]), pw = addv(qRot(yawQ, c), [this.x, 0, this.z]), rw = qMul(yawQ, qMul(m.q, l.rest.r));
      bi.SetPositionAndRotation(l.body.GetID(), new J.RVec3(...pw), new J.Quat(...rw), J.EActivation_Activate);
      if (still) bi.SetLinearAndAngularVelocity(l.body.GetID(), new J.Vec3(0, 0, 0), new J.Vec3(0, 0, 0));
    }
  }

  /** Ask it to do something by name: a move, a stance, or what it does to stand, rest or go slack. */
  ask(what: string): string {
    const w = what.trim().toLowerCase().replace(/[.!?]+$/, '');
    const them = '(?:him|her|it|them|yourself|himself|herself|itself)', its = '(?:his|her|its|their|your)';
    if (w === 'attack') { const r = this.world.rand(); let acc = 0, pick = MIX[0]![0]; for (const [m, p] of MIX) { acc += p; if (r < acc) { pick = m; break; } } return this.ask(pick); }
    if (w === 'combo' || w === 'one two') { this.queue.push('jab', 'cross'); return this.next(); }
    if (MOVES[w]) { if (this.down() || this.tone === 0) return `${this.name} is down`; if (this.move) { if (this.queue.length < 2) this.queue.push(w); return `${this.name} will ${w} next`; } this.move = MOVES[w]!; this.moveT = 0; if (w !== 'cover') this.thrown++; this.stamina = Math.max(0, this.stamina - (w === 'cover' ? 1 : 4)); return `${this.name} throws a ${w}`; }
    if (w === 'guard' || w === 'fight') { this.stance = 'guard'; return `${this.name} puts its guard up`; }
    if (w === 'stand easy') { this.stance = 'stand'; this.move = null; return `${this.name} stands easy`; }
    if (w === 'get up' || w === 'stand up' || w === 'reset' || w === 'stand') { this.tone = 1; this.dazed = 0; this.move = null; this.root = [0, 0, 0, 1]; this.laid = false; if (this.power < 0.5) this.power = 1; this.pose(this.stancePoses[this.stance]); return `${this.name} is set back on its feet (getting up by its own muscles is not modelled yet)`; }
    if (w === 'go limp' || w === 'limp' || w === 'ragdoll' || w === 'knock out') { this.tone = 0; this.move = null; return `${this.name} goes slack: only its joints' limits hold it now`; }
    if (new RegExp(`^(?:back|supine|lie down|lay ${them} down)$|\\bon ${its} back\\b|\\b(?:lie|lay) (?:${them} )?(?:down )?on ${its} back\\b`).test(w)) { this.lay([-Math.SQRT1_2, 0, 0, Math.SQRT1_2], 0.25); return `${this.name} is laid on its back, its muscles soft (a quarter of their strength): grab it and move it`; }
    if (new RegExp(`^(?:prone|face ?down)$|\\bface ?down\\b|\\bon ${its} (?:front|belly|stomach|face)\\b`).test(w)) { this.lay([Math.SQRT1_2, 0, 0, Math.SQRT1_2], 0.25); return `${this.name} is laid face down, its muscles soft`; }
    const pw = /^(?:strength|strong|power)\s+(\d+(?:\.\d+)?)\s*(%?)$/.exec(w);
    if (pw || /^(?:stronger|weaker|full strength|resist|relax|go soft|soft)$/.test(w)) {
      this.power = pw ? Math.max(0, Math.min(3, Number(pw[1]) / (pw[2] ? 100 : 1))) : w === 'stronger' ? Math.min(3, this.power * 1.5) : w === 'weaker' ? this.power / 1.5 : w === 'full strength' || w === 'resist' ? 1 : 0.25;
      return `${this.name}'s muscles at ${Math.round(this.power * 100)} % of their strength (${this.joints.find((j) => j.j.id === 'hipL')!.j.torque.flex[0] * this.power | 0} N·m at the hip, extending)`;
    }
    if (w === 'push') { const t = this.parts.find((p) => p.seg.id === 'thorax')!.body, f = qRot(qAxis([0, 1, 0], this.yaw), [0, 0, -1]); this.world.bi.AddImpulse(t.GetID(), new this.J.Vec3(...scale(f, 60))); return `${this.name} is pushed back with 60 N·s at the chest`; }
    return `${this.name} cannot "${what}": it can ${[...Object.keys(MOVES), 'attack', 'combo', 'guard', 'stand', 'get up', 'go limp', 'push', 'on its back', 'face down', 'strength 150%', 'stronger', 'weaker', 'soft'].join(', ')}`;
  }
  /** Laid down where it is: its whole body turned from upright, its muscles at so much of their strength. */
  lay(root: Q, power: number): void { this.laid = true; this.root = root; this.power = power; this.tone = 1; this.dazed = 0; this.move = null; this.stance = 'stand'; this.pose(this.stancePoses.stand); }
  private next(): string { const n = this.queue.shift(); return n ? this.ask(n) : `${this.name} waits`; }
  /** A straight strike steered: the throwing arm's angles that point it from where its shoulder is now at the target's
   *  head (and 10 cm through it), worked out in the chest's frame as it is now, so a chest that leans or turns as the
   *  arm goes out does not take the fist off its line. */
  private steer(m: Move): Pose {
    const t = this.target?.person ? this.target.person.at('head') : this.target?.point; if (!t || !m.aims) return {};
    const s = m.aims === 'lead' ? this.lead() : this.lead() === 'L' ? 'R' : 'L', id = `shoulder${s}`, lj = this.joints.find((x) => x.j.id === id)!;
    const sh = this.jointAt(id), d0 = sub(t, sh), dw = addv(d0, scale(unit(d0), 0.1));
    // the direction in the chest's frame at rest, then in the joint's own frame
    const ch = this.parts.find((x) => x.seg.id === lj.j.parent)!, r = ch.body.GetRotation(), qNow: Q = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()];
    const qRestW = qMul(qAxis([0, 1, 0], this.yaw), ch.rest.r), dRest = qRot(qMul(qRestW, qConj(qNow)), dw);
    const yq = qAxis([0, 1, 0], this.yaw), dBody = qRot(qConj(yq), dRest), c = unit(qRot(qConj(lj.frame), qRot(qConj(ch.rest.r), qRot(ch.rest.r, dBody))));
    const z = Math.asin(Math.max(-1, Math.min(1, c[1]))), f = Math.atan2(-c[2], c[0]), side = (lj.zIsAbduction ? z : -z) / D2R;
    return { [id]: [Math.min(140, f / D2R), Math.max(-30, Math.min(40, side)), 0] };
  }
  /** The lead side: the foot and hand forward in its stance. */
  lead(): 'L' | 'R' { return STANCES[this.stance].lead ?? 'L'; }
  /** Where a joint is now, in the room: its place at rest carried by its parent segment. */
  jointAt(id: string): V3 {
    const j = this.rig.joints.find((x) => x.id === id)!, l = this.parts.find((x) => x.seg.id === j.parent)!, p = l.body.GetPosition(), r = l.body.GetRotation();
    const q: Q = qMul([r.GetX(), r.GetY(), r.GetZ(), r.GetW()], qConj(qMul(qAxis([0, 1, 0], this.yaw), l.rest.r)));
    return addv([p.GetX(), p.GetY(), p.GetZ()], qRot(q, qRot(qAxis([0, 1, 0], this.yaw), sub(j.at, l.rest.c))));
  }

  down(): boolean { return this.headY() < 0.55 * this.standHead; }
  headY(): number { return this.parts.find((p) => p.seg.id === 'head')!.body.GetPosition().GetY(); }
  /** Where a segment is, in the room. */
  at(id: SegmentId): V3 { const p = this.parts.find((x) => x.seg.id === id)!.body.GetPosition(); return [p.GetX(), p.GetY(), p.GetZ()]; }
  com(): V3 { const c: V3 = [0, 0, 0]; for (const l of this.parts) { const p = l.body.GetPosition(); c[0] += p.GetX() * l.seg.mass; c[1] += p.GetY() * l.seg.mass; c[2] += p.GetZ() * l.seg.mass; } return scale(c, 1 / this.rig.mass); }
  /** How far the arm reaches from the shoulder, m. */
  reachLength(): number { const r = this.rig.segments; const L = (id: SegmentId) => { const s = r.find((x) => x.id === id)!; return Math.hypot(...sub(s.b, s.a)); }; return L('upperArmL') + L('forearmL') + L('handL') + 0.04; }

  /** Before each step of the world: the move goes on, the joints are driven, the ankles keep the balance. */
  control(dt: number): void {
    this.time += dt; if (this.dazed > 0) this.dazed = Math.max(0, this.dazed - dt);
    this.stamina = Math.min(100, this.stamina + dt * 3);
    if (this.move) { this.moveT += dt; const total = this.move.phases.reduce((a, p) => a + p.s, 0); if (this.moveT >= total) { this.move = null; this.next(); } }
    if (this.tone === 0) { this.drive({}, 1); return; }
    const { pose, hz, zeta } = this.aim(), p: Pose = { ...pose };
    // balance: its centre of mass brought back over its feet by how far off it is and how fast it goes; forward and
    // back by the ankles (the ankle strategy), side to side by the hips shifting the pelvis over the feet and the ankles
    // rolling with them (the hip, or load and unload, strategy: Winter 1995)
    const s = this.sense(), yq = qAxis([0, 1, 0], this.yaw), cv = this.comVel(), vF = dot(cv, qRot(yq, [0, 0, 1])), vS = dot(cv, qRot(yq, [1, 0, 0]));
    // a body held stiff stands like a statue while its centre of mass is over its feet, so the correction is gentle: a
    // gain over the centre's height of 1 or more turns each correction into the next overshoot
    const lean = Math.max(-10, Math.min(10, -(s.off[0] * 40 + vF * 10))), shift = Math.max(-10, Math.min(10, s.off[1] * 40 + vS * 10));
    const bump = (a: string, d: [number, number, number]) => { const v = p[a] ?? [0, 0, 0]; p[a] = [v[0] + d[0], v[1] + d[1], v[2] + d[2]]; };
    bump('ankleL', [lean, 0, -shift]); bump('ankleR', [lean, 0, -shift]); bump('hipL', [0, shift, 0]); bump('hipR', [0, -shift, 0]);
    this.drive(p, hz, zeta);
  }
  private comVel(): V3 { const c: V3 = [0, 0, 0]; for (const l of this.parts) { const v = l.body.GetLinearVelocity(); c[0] += v.GetX() * l.seg.mass; c[1] += v.GetY() * l.seg.mass; c[2] += v.GetZ() * l.seg.mass; } return scale(c, 1 / this.rig.mass); }
  /** After each step: how hard the head was jolted. */
  observe(dt: number, g: number): void {
    const h = this.parts.find((p) => p.seg.id === 'head')!.body.GetLinearVelocity(), v: V3 = [h.GetX(), h.GetY(), h.GetZ()];
    const dv = sub(v, this.headV); dv[1] += g * dt; const acc = Math.hypot(...dv) / dt / 9.80665; this.headV = v;
    if (this.time > 0.2 && acc > 8) {
      this.hurtLog.push({ t: this.time, g: acc });
      // a jolt this hard leaves it dazed, its muscles slack for a while (an estimate: concussions are measured at 60-100 g)
      if (acc > 40) this.dazed = Math.max(this.dazed, Math.min(3, (acc - 40) / 20 + 0.8));
    }
    this.hurtLog = this.hurtLog.filter((x) => this.time - x.t < 1);
    this.downFor = this.down() && !this.laid ? this.downFor + dt : 0;
    // a hand that meets the target's head lands a strike
    const tgt = this.target?.person; if (tgt && this.move && this.move.name !== 'cover') {
      const head = tgt.at('head'), hr = (tgt.rig.segments.find((s) => s.id === 'head')!.shape as { r: number }).r;
      for (const id of ['handL', 'handR'] as const) { const hand = this.at(id), hs = (this.rig.segments.find((s) => s.id === id)!.shape as { r: number }).r; if (Math.hypot(...sub(hand, head)) < hr + hs + 0.03 && this.time - this.struck > 0.3) { this.struck = this.time; this.hits++; } }
    }
  }
  sense(): Senses {
    // where a standing body's weight falls: the middle of its feet, a little back toward the heels, about 5 cm in front
    // of the ankles (Winter 1995, Human balance and posture control during standing and walking)
    const com = this.com(), fl = this.at('footL'), fr = this.at('footR'), yawQ = qAxis([0, 1, 0], this.yaw), fwd = qRot(yawQ, [0, 0, 1]), side = qRot(yawQ, [1, 0, 0]);
    const halfL = (this.rig.segments.find((x) => x.id === 'footL')!.shape as { half: V3 }).half[2], mid: V3 = addv(scale(addv(fl, fr), 0.5), scale(fwd, -0.3 * halfL));
    const rel = sub(com, mid);
    let reach = 9;
    const t = this.target?.person ? this.target.person.at('head') : this.target?.point;
    if (t) reach = Math.hypot(...sub(t, this.jointAt(`shoulder${this.lead()}`))) / this.reachLength();
    const hy = this.headY();
    return { com, off: [dot(rel, fwd), dot(rel, side)], head: hy, headShare: hy / this.standHead, hurt: this.hurtLog.reduce((a, x) => Math.max(a, x.g), 0), reach, down: this.down(), busy: !!this.move, hits: this.hits, stamina: this.stamina };
  }
  /** The numbers its rules read, each named for it: kai_reach, kai_open, kai_hurt, kai_down… */
  facts(): Record<string, number> {
    const s = this.sense(), n = factName(this.name), ready = !s.busy && !s.down && this.tone > 0 && this.dazed === 0 && this.stamina > 10;
    return {
      [`${n}_reach`]: +s.reach.toFixed(2), [`${n}_open`]: ready && s.reach <= 1.05 ? 1 : 0, [`${n}_hurt`]: +s.hurt.toFixed(1), [`${n}_down`]: s.down ? 1 : 0,
      [`${n}_dazed`]: this.dazed > 0 ? 1 : 0, [`${n}_balance`]: +(Math.abs(s.off[0]) / 0.12).toFixed(2), [`${n}_hits`]: this.hits, [`${n}_stamina`]: Math.round(s.stamina), [`${n}_busy`]: s.busy ? 1 : 0, [`${n}_down_for`]: +this.downFor.toFixed(1),
    };
  }
  /** Where each segment is now, for the view: its place and its turn, and its turn at rest. */
  poses(): { id: SegmentId; at: V3; q: Q; rest: { c: V3; r: Q } }[] {
    return this.parts.map((l) => { const p = l.body.GetPosition(), r = l.body.GetRotation(); return { id: l.seg.id, at: [p.GetX(), p.GetY(), p.GetZ()], q: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], rest: l.rest }; });
  }
  remove(): void { const bi = this.world.bi; for (const lj of this.joints) this.world.ps.RemoveConstraint(lj.c); for (const l of this.parts) { bi.RemoveBody(l.body.GetID()); bi.DestroyBody(l.body.GetID()); } }
}
export const factName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'person';

/** The people's world: a floor, gravity as the room has it, and everyone in it, stepped at 240 Hz. */
export class People {
  readonly jolt: InstanceType<Jolt['JoltInterface']>; readonly ps: InstanceType<Jolt['PhysicsSystem']>; readonly bi: InstanceType<Jolt['BodyInterface']>;
  readonly MOVING = 1; readonly list: Person[] = []; private acc = 0; private seed: number; readonly hz = 240;
  constructor(readonly J: Jolt, readonly g = 9.80665, seed = 1) {
    this.seed = seed >>> 0 || 1;
    const s = new J.JoltSettings(), pairs = new J.ObjectLayerPairFilterTable(2); pairs.EnableCollision(0, 1); pairs.EnableCollision(1, 1);
    const bp = new J.BroadPhaseLayerInterfaceTable(2, 2); bp.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); bp.MapObjectToBroadPhaseLayer(1, new J.BroadPhaseLayer(1));
    s.mObjectLayerPairFilter = pairs; s.mBroadPhaseLayerInterface = bp; s.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bp, 2, pairs, 2);
    this.jolt = new J.JoltInterface(s); J.destroy(s); this.ps = this.jolt.GetPhysicsSystem(); this.bi = this.ps.GetBodyInterface();
    this.ps.SetGravity(new J.Vec3(0, -g, 0));
    const pl = new J.Plane(new J.Vec3(0, 1, 0), 0), pss = new J.PlaneShapeSettings(pl, undefined, 1000), sh = pss.Create().Get(); J.destroy(pss);
    const cs = new J.BodyCreationSettings(sh, new J.RVec3(0, 0, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, 0); cs.mFriction = 1.0;
    const fl = this.bi.CreateBody(cs); J.destroy(cs); this.bi.AddBody(fl.GetID(), J.EActivation_DontActivate);
  }
  private solids = new Map<string, InstanceType<Jolt['Body']>>();
  /** Something fixed in the room that people meet (a pedestal, a table, a wall): an upright cylinder or a box, static,
   *  its middle at the point given. Said again by the same name, it is put where it is said; null takes it away. */
  solid(name: string, s: { cyl: { r: number; h: number } } | { box: V3 } | null, at: V3 = [0, 0, 0], yaw = 0): void {
    const J = this.J, old = this.solids.get(name); if (old) { this.bi.RemoveBody(old.GetID()); this.bi.DestroyBody(old.GetID()); this.solids.delete(name); }
    if (!s) return;
    const ss = 'cyl' in s ? new J.CylinderShapeSettings(s.cyl.h / 2, s.cyl.r, 0.01) : new J.BoxShapeSettings(new J.Vec3(s.box[0] / 2, s.box[1] / 2, s.box[2] / 2), 0.01), sh = ss.Create().Get(); J.destroy(ss);
    const cs = new J.BodyCreationSettings(sh, new J.RVec3(...at), new J.Quat(0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)), J.EMotionType_Static, 0); cs.mFriction = 0.6;
    const b = this.bi.CreateBody(cs); J.destroy(cs); this.bi.AddBody(b.GetID(), J.EActivation_DontActivate); this.solids.set(name, b);
  }
  /** A number from 0 to 1, the same each run for the same seed. */
  rand(): number { let t = (this.seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  add(name: string, params: Partial<BodyParams>, at: { x: number; z: number; yaw: number }, o: { fighter?: boolean; density?: number } = {}): Person {
    const p = new Person(this.J, this, name, params, at, this.list.length + 1, o.density ?? 1050, o.fighter ?? false); this.list.push(p); return p;
  }
  remove(p: Person): void { this.grips.forEach((g, i) => { if (g?.person === p) this.letGo(i); }); p.remove(); this.list.splice(this.list.indexOf(p), 1); }
  /** Run the world on by so many seconds of the room's time, in steps of 1/240 s. */
  step(dt: number): void {
    this.acc = Math.min(this.acc + dt, 0.1); const h = 1 / this.hz;
    while (this.acc >= h) {
      for (const g of this.grips) if (g) this.bi.MoveKinematic(g.hand.GetID(), new this.J.RVec3(...g.to), new this.J.Quat(0, 0, 0, 1), h);
      for (const p of this.list) p.control(h); this.jolt.Step(h, 1); for (const p of this.list) p.observe(h, this.g); this.acc -= h; }
  }
  private grips: { hand: InstanceType<Jolt['Body']>; c: InstanceType<Jolt['Constraint']>; to: V3; person: Person; seg: SegmentId }[] = [];
  /** A hand closing on whoever is nearest it: the segment nearest the point (within reach of it), held to the hand by a
   *  spring (a soft link at 5 Hz, damped: you pull, its joints and muscles answer, its weight hangs on your hand). */
  grab(at: V3, reach = 0.2): { person: Person; seg: SegmentId; id: number } | null {
    let best: { p: Person; l: Live; d: number } | null = null;
    for (const p of this.list) for (const l of p.parts) {
      const q = l.body.GetPosition(), c: V3 = [q.GetX(), q.GetY(), q.GetZ()], r = l.seg.shape.kind === 'capsule' ? l.seg.shape.r + Math.hypot(...sub(l.seg.b, l.seg.a)) / 2 : Math.max(...l.seg.shape.half);
      const d = Math.hypot(...sub(at, c)) - r; if (d < reach && (!best || d < best.d)) best = { p, l, d };
    }
    if (!best) return null;
    const J = this.J, ss = new J.SphereShapeSettings(0.03), sh = ss.Create().Get(); J.destroy(ss);
    const cs = new J.BodyCreationSettings(sh, new J.RVec3(...at), new J.Quat(0, 0, 0, 1), J.EMotionType_Kinematic, this.MOVING); cs.mIsSensor = true;
    const hand = this.bi.CreateBody(cs); J.destroy(cs); this.bi.AddBody(hand.GetID(), J.EActivation_Activate);
    const ds = new J.DistanceConstraintSettings(); ds.mSpace = J.EConstraintSpace_WorldSpace; ds.mPoint1 = new J.RVec3(...at); ds.mPoint2 = new J.RVec3(...at); ds.mMinDistance = 0; ds.mMaxDistance = 0;
    ds.mLimitsSpringSettings.mFrequency = 5; ds.mLimitsSpringSettings.mDamping = 1;
    const c = ds.Create(hand, best.l.body); J.destroy(ds); this.ps.AddConstraint(c);
    this.bi.ActivateBody(best.l.body.GetID());
    this.grips.push({ hand, c, to: at, person: best.p, seg: best.l.seg.id });
    return { person: best.p, seg: best.l.seg.id, id: this.grips.length - 1 };
  }
  /** Where a hand holding is now. */
  hold(id: number, at: V3): void { const g = this.grips[id]; if (g) g.to = at; }
  /** A hand opening: what it held let go. */
  letGo(id: number): void { const g = this.grips[id]; if (!g) return; this.ps.RemoveConstraint(g.c); this.bi.RemoveBody(g.hand.GetID()); this.bi.DestroyBody(g.hand.GetID()); this.grips[id] = undefined as never; }
  /** The world taken down: its bodies, constraints and memory given back. */
  dispose(): void { this.J.destroy(this.jolt); }
  facts(): Record<string, number> { const f: Record<string, number> = { people: this.list.length, people_down: this.list.filter((p) => p.down()).length }; for (const p of this.list) Object.assign(f, p.facts()); return f; }
}

/** A fighter's body: its genome's height and face, its muscle as a trained fighter's (about a third more, an
 *  estimate), its fat half again lower, and its mass the weight class its height puts it in (the UFC's limits: men
 *  bantam 61.2 kg to heavy 120.2, women straw 52.2 to feather 65.8; a fighter's BMI about 24.5, an estimate). */
export function fighterBuild(p: Partial<BodyParams>): Partial<BodyParams> {
  const female = (p.sex ?? 0) >= 0.5, h = p.height ?? (female ? 1.65 : 1.78), classes = female ? [52.2, 56.7, 61.2, 65.8] : [61.2, 65.8, 70.3, 77.1, 83.9, 93.0, 120.2];
  const want = 24.5 * h * h, mass = classes.reduce((a, c) => (Math.abs(c - want) < Math.abs(a - want) ? c : a), classes[0]!);
  return { ...p, mass, muscle: Math.min(1.5, (p.muscle ?? (female ? 0.7 : 1)) * 1.3), fat: Math.max(0.5, (p.fat ?? 1) * 0.55) };
}
/** A person's rules, as a pipeline on the boards: each an IF on what it senses and a THEN it does, armed, and quick (a
 *  fighter decides a few times a second). Change a step's words to change what it does ("person kai jab", "person kai
 *  cover"); the facts it reads are named for it (kai_open, kai_hurt, kai_down_for…). */
export function boardOfPerson(p: Person): Board {
  const n = factName(p.name), rules: [string, string, string, string][] = p.fighter ? [
    ['Open and in reach', `when ${n}_open > 0`, 'Attack', `person ${n} attack`],
    ['Hit hard', `when ${n}_hurt > 15`, 'Cover up', `person ${n} cover`],
    ['Down 4 seconds', `when ${n}_down_for > 4`, 'Get up', `person ${n} get up`],
    ['I say fight', 'when I say fight', 'Guard up', `person ${n} guard`],
  ] : [
    ['I say guard', 'when I say guard', 'Guard up', `person ${n} guard`],
    ['I say stand up', 'when I say stand up', 'Stand up', `person ${n} get up`],
  ];
  const board: Board = { title: `${p.name}'s rules`, kind: 'flow', armed: true, quiet: true, cooldown: 250, about: `${p.name}: ${p.fighter ? 'a fighter' : 'a person'}, ${(p.H * 100).toFixed(0)} cm, ${p.params.mass.toFixed(0)} kg, by real physics. Each IF starts its THEN; what it reads: ${n}_reach (its target over its reach), ${n}_open, ${n}_hurt (g), ${n}_down, ${n}_down_for (s), ${n}_balance, ${n}_stamina, ${n}_hits. What it can do: "person ${n} jab", cross, hook, uppercut, cover, combo, attack, guard, stand, get up, go limp, push.`, nodes: {}, edges: {} };
  rules.forEach(([il, iw, tl, tw], i) => {
    board.nodes[`if${i}`] = { label: `IF ${il}`, step: { kind: 'trigger', what: iw } };
    board.nodes[`then${i}`] = { label: `THEN ${tl}`, step: { kind: 'action', what: tw } };
    board.edges[`e${i}`] = { from: `if${i}`, to: `then${i}`, rel: 'flows to' };
  });
  return board;
}
