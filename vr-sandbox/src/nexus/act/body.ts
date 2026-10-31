// A body to act with, drawn from its measured segments, not a stick figure. Its sixteen segments are the rig's
// (life/segments.ts: each its share of the body's mass by de Leva 1996, its shape the room that mass takes at the body's
// density round its bone, laid out by Drillis and Contini's proportions in anatomy.ts), and each drawn part carries its
// own math: its mass, its length, its centre of mass and its moments of inertia, worked out for its shape and set beside
// de Leva's measured ones where he gives them. Posed here for what an agent does: standing, walking (its legs and arms
// swinging), leaning and reaching (its arm by two-bone IK, the elbow out and down).

import * as THREE from 'three';
import type { Part } from '../kits';
import type { V3 } from '../generate';
import { bodyOf as anatomyOf, layOut, PARAMS, type Body } from '../anatomy';
import { mathOf, rigOf, type Rig, type SegmentId, type SegmentMath } from '../life/segments';
import type { Actor } from '../aware/tags';

const UP = new THREE.Vector3(0, 1, 0);
const vec = (a: V3) => new THREE.Vector3(...a);
const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

export interface Built { rig: Rig; body: Body; math: SegmentMath[]; /** the layout's scale onto the actor's height (1 within the layout's range) */ k: number; sex: 'm' | 'f'; says: string[] }
const kept = new Map<string, Built>();
/** The rig of an actor's body: laid out at its height and mass, or, below the layout's range (a child), laid out at its
 *  least and scaled down by height, each segment's mass its share of the actor's own (its radius kept to the body's
 *  density: an estimate, as a child's proportions differ from an adult's). */
export function rigFor(a: Actor, o: { sex?: 'm' | 'f'; muscle?: number; fat?: number } = {}): Built {
  const sex = o.sex ?? 'm', key = `${a.height}|${a.mass}|${sex}|${o.muscle ?? 1}|${o.fat ?? 1}`, was = kept.get(key); if (was) return was;
  const lim = (k: string) => PARAMS.find((p) => p.key === k)!, hMin = lim('height').min, mMin = lim('mass').min, says: string[] = [];
  const h = Math.max(hMin, a.height), m = Math.max(mMin, a.mass * (h / a.height) ** 3), body = layOut(anatomyOf({ height: h, mass: m, sex: sex === 'f' ? 1 : 0, muscle: o.muscle ?? 1, fat: o.fat ?? 1 })), rig0 = rigOf(body), k = a.height / body.H;
  if (k < 0.999) says.push(`laid out at ${h.toFixed(2)} m (the least the layout takes) and scaled to ${a.height} m, each segment its share of ${a.mass} kg: an estimate (a child's head and trunk are larger shares than an adult's)`);
  const mk = a.mass / rig0.mass, rk = Math.sqrt(mk / k) / k;
  const rig: Rig = k < 0.999 || Math.abs(mk - 1) > 1e-3 ? { ...rig0, mass: a.mass, segments: rig0.segments.map((s) => ({ ...s, a: s.a.map((x) => x * k) as V3, b: s.b.map((x) => x * k) as V3, mass: s.mass * mk,
    shape: s.shape.kind === 'capsule' ? { kind: 'capsule' as const, r: s.shape.r * k * rk } : { kind: 'box' as const, half: [s.shape.half[0] * k, s.shape.half[1] * k, (s.shape.half[2] * mk) / (k * k)] as V3 } })) } : rig0;
  const out = { rig, body, math: mathOf(rig, sex), k, sex, says: [...rig0.says, ...says] }; kept.set(key, out); return out;
}

/** Where each segment is: its two ends and its turn (a box's), in the room. */
export type Pose = Record<string, { a: V3; b: V3; R: THREE.Matrix4 }>;
const COLOR: Record<string, number> = { head: 0xd9a77e, hand: 0xd9a77e, forearm: 0xd9a77e, upperArm: 0x3a7bff, thorax: 0x3a7bff, abdomen: 0x3a7bff, pelvis: 0x2c3e50, thigh: 0x2c3e50, shank: 0x2c3e50, foot: 0x1b1b1b };
/** The body drawn in a pose: each segment a capsule or a box, its math on it (made, kg, says). */
export function bodyParts(b: Built, pose: Pose, name = 'a body', color?: number): Part {
  const parts: Part[] = [];
  for (const s of b.rig.segments) {
    const p = pose[s.id]; if (!p) continue; const a = vec(p.a), e = vec(p.b), m = b.math.find((x) => x.id === s.id)!, kind = s.id.replace(/[LR]$/, '');
    const made: Record<string, number | string> = { mass: +m.mass.toFixed(3), share: m.share, length: +m.length.toFixed(4), size: m.size, com: m.com, Iacross: +m.Iacross.toExponential(3), Ilong: +m.Ilong.toExponential(3), ...(m.comMeasured ? { comMeasured: m.comMeasured, IacrossMeasured: +m.IacrossMeasured!.toExponential(3), IlongMeasured: +m.IlongMeasured!.toExponential(3) } : {}) };
    const col = kind === 'upperArm' || kind === 'thorax' || kind === 'abdomen' ? color ?? COLOR[kind]! : COLOR[kind]!;
    if (m.taper) { const d = e.clone().sub(a), q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()), r = new THREE.Euler().setFromQuaternion(q, 'XYZ'); parts.push({ name: s.name, shape: { cyl: [m.taper.R, Math.max(1e-3, d.length()), m.taper.r] }, at: v3(a.clone().add(e).multiplyScalar(0.5)), rot: [r.x, r.y, r.z], mat: 'water', kg: s.mass, made, says: m.says, color: col }); }
    else if (s.shape.kind === 'capsule') { const d = e.clone().sub(a), q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()), r = new THREE.Euler().setFromQuaternion(q, 'XYZ'); parts.push({ name: s.name, shape: { capsule: [s.shape.r, Math.max(1e-3, d.length())] }, at: v3(a.clone().add(e).multiplyScalar(0.5)), rot: [r.x, r.y, r.z], mat: 'water', kg: s.mass, made, says: m.says, color: col }); }
    else { const r = new THREE.Euler().setFromRotationMatrix(p.R, 'XYZ'), h = s.shape.half; parts.push({ name: s.name, shape: { box: [2 * h[0], 2 * h[1], 2 * h[2]] }, at: v3(a.clone().add(e).multiplyScalar(0.5)), rot: [r.x, r.y, r.z], mat: 'water', kg: s.mass, made, says: m.says, color: col }); }
  }
  return { name, parts, says: b.says.join('; ') };
}

/** The pose for what an agent is doing: standing at a point facing a way, its legs swung by so much (walking), leaning
 *  toward a hand out past its arm, that hand at a point (reaching or holding) or its arms swinging. */
export function poseOf(b: Built, o: { at: V3; facing: V3; floor: number; swing?: number; hand?: V3 | null }): { pose: Pose; lean: THREE.Vector3 } {
  const J = b.body.joints, k = b.k, segs = b.rig.segments, by = new Map(segs.map((s) => [s.id, s]));
  const f = vec(o.facing).setY(0).normalize(), right = f.clone().cross(UP).normalize(), left = right.clone().negate(), at = vec(o.at).setY(o.floor);
  const Rbody = new THREE.Matrix4().makeBasis(left, UP, f), toWorld = (p: THREE.Vector3) => p.clone().applyMatrix4(Rbody).add(at);
  const J3 = (id: string) => vec(J[id]!).multiplyScalar(k), hipMid = J3('hipL').add(J3('hipR')).multiplyScalar(0.5);
  // (leaning: the trunk tipped about the hips toward a hand out past its arm, its shoulder moved as far as it must, no
  // further than a lean goes)
  let L = new THREE.Matrix4(), leanW = new THREE.Vector3(); const H = o.hand ? vec(o.hand) : null, armLen = (id: 'L' | 'R') => by.get(`upperArm${id}` as SegmentId)!, len = (s: { a: V3; b: V3 }) => vec(s.a).distanceTo(vec(s.b));
  const reachOf = (s: 'L' | 'R') => len(armLen(s)) + len(by.get(`forearm${s}` as SegmentId)!) + 0.5 * len(by.get(`hand${s}` as SegmentId)!);
  const side: 'L' | 'R' | null = H ? (toWorld(J3('shoulderL')).distanceTo(H) <= toWorld(J3('shoulderR')).distanceTo(H) ? 'L' : 'R') : null;
  if (H && side) { const sh = toWorld(J3(`shoulder${side}`)), over = sh.distanceTo(H) - reachOf(side) * 0.999;
    if (over > 0) { const dirW = H.clone().sub(sh).setY(0).normalize(), shift = Math.min(over, (0.25 * b.body.H * b.k) / 1.75), hgt = J3(`shoulder${side}`).y - hipMid.y, ang = Math.asin(Math.min(0.9, shift / hgt));
      const dB = new THREE.Vector3(dirW.dot(left), 0, dirW.dot(f)), axis = UP.clone().cross(dB).normalize();
      L = new THREE.Matrix4().makeTranslation(hipMid.x, hipMid.y, hipMid.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, ang)).multiply(new THREE.Matrix4().makeTranslation(-hipMid.x, -hipMid.y, -hipMid.z)); leanW = dirW.multiplyScalar(shift); } }
  const trunk = (p: THREE.Vector3) => toWorld(p.clone().applyMatrix4(L)), Rtrunk = Rbody.clone().multiply(new THREE.Matrix4().extractRotation(L)), pose: Pose = {};
  for (const id of ['pelvis', 'abdomen', 'thorax', 'head'] as SegmentId[]) { const s = by.get(id)!; pose[id] = { a: v3(trunk(vec(s.a))), b: v3(trunk(vec(s.b))), R: Rtrunk }; }
  // (the legs: each swung about its hip, one forward as the other goes back)
  for (const [s, sg] of [['L', 1], ['R', -1]] as const) {
    const hip = J3(`hip${s}`), Rs = new THREE.Matrix4().makeTranslation(hip.x, hip.y, hip.z).multiply(new THREE.Matrix4().makeRotationX(-sg * (o.swing ?? 0))).multiply(new THREE.Matrix4().makeTranslation(-hip.x, -hip.y, -hip.z)), Rrot = Rbody.clone().multiply(new THREE.Matrix4().extractRotation(Rs));
    for (const part of ['thigh', 'shank', 'foot']) { const g = by.get(`${part}${s}` as SegmentId)!; pose[g.id] = { a: v3(toWorld(vec(g.a).applyMatrix4(Rs))), b: v3(toWorld(vec(g.b).applyMatrix4(Rs))), R: Rrot }; }
    // (the arm on this side: to the hand's point by two-bone IK; else hanging, swung against its leg)
    const ua = by.get(`upperArm${s}` as SegmentId)!, fa = by.get(`forearm${s}` as SegmentId)!, ha = by.get(`hand${s}` as SegmentId)!, sh = trunk(J3(`shoulder${s}`));
    if (H && side === s) {
      const a = len(ua), c = len(fa) + 0.5 * len(ha), d0 = H.clone().sub(sh), d = Math.min(d0.length(), (a + c) * 0.999), dir = d0.clone().normalize(), target = sh.clone().addScaledVector(dir, d);
      const cosA = (a * a + d * d - c * c) / (2 * a * d), ang = Math.acos(Math.max(-1, Math.min(1, cosA))), out = s === 'L' ? left : right, pole = out.clone().addScaledVector(UP, -1);
      const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)); if (perp.lengthSq() < 1e-9) perp.copy(f).negate(); perp.normalize();
      const elbow = sh.clone().addScaledVector(dir, a * Math.cos(ang)).addScaledVector(perp, a * Math.sin(ang)), fd = target.clone().sub(elbow).normalize(), wrist = elbow.clone().addScaledVector(fd, len(fa));
      pose[ua.id] = { a: v3(sh), b: v3(elbow), R: Rbody }; pose[fa.id] = { a: v3(elbow), b: v3(wrist), R: Rbody }; pose[ha.id] = { a: v3(wrist), b: v3(wrist.clone().addScaledVector(fd, len(ha))), R: Rbody };
    } else {
      const shB = J3(`shoulder${s}`), Ra = new THREE.Matrix4().makeTranslation(shB.x, shB.y, shB.z).multiply(new THREE.Matrix4().makeRotationX(sg * 0.8 * (o.swing ?? 0))).multiply(new THREE.Matrix4().makeTranslation(-shB.x, -shB.y, -shB.z)), arm = (p: V3) => trunk(vec(p).applyMatrix4(Ra));
      for (const g of [ua, fa, ha]) pose[g.id] = { a: v3(arm(g.a)), b: v3(arm(g.b)), R: Rbody };
    }
  }
  return { pose, lean: leanW };
}
