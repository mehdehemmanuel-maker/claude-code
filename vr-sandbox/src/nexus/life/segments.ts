// A body as the rigid segments physics moves: fifteen of them, from the body laid out (src/nexus/anatomy.ts), each with
// the share of the body's mass de Leva measured for its sex, the room that mass takes at the body's own density (its
// make-up through the mixing law, src/nexus/derive.ts) as the shape round its bone, and between them the joints with
// the ranges a joint moves through and the torques the muscles across it can give. Nothing here moves; it is what a
// physics engine needs to make a body that falls, stands, steps and strikes by its own masses and muscles.
//
// Sources:
//   segment masses: de Leva P (1996), Adjustments to Zatsiorsky-Seluyanov's segment inertia parameters, J Biomech
//     29:1223, table 4 (men and women apart);
//   ranges of motion: the American Academy of Orthopaedic Surgeons' averages (Greene & Heckman, The Clinical
//     Measurement of Joint Motion, AAOS 1994);
//   torques: a typical man's peak isometric torques at each joint, within published ranges (an estimate), each scaled
//     by the body's muscle: a muscle's force is its specific tension times its cross-section, F = σ A, and A is its
//     volume over its length, so with moment arms that grow with height the torque grows with the muscle's mass alone.

import type { Body, BodyParams, V3 } from '../anatomy';

export type SegmentId =
  | 'pelvis' | 'abdomen' | 'thorax' | 'head'
  | 'upperArmL' | 'forearmL' | 'handL' | 'upperArmR' | 'forearmR' | 'handR'
  | 'thighL' | 'shankL' | 'footL' | 'thighR' | 'shankR' | 'footR';
export interface Segment {
  id: SegmentId; name: string;
  /** where it runs, in the body's frame (m): from its proximal joint to its far end */ a: V3; b: V3;
  /** kg */ mass: number;
  /** the shape round its bone: a capsule (radius) or a box (half extents along the body's x, y, z) */ shape: { kind: 'capsule'; r: number } | { kind: 'box'; half: V3 };
  /** its mass's share of the body (de Leva 1996) */ share: number;
}
/** A joint's ranges in degrees, each direction apart, and the torques its muscles give each way, N·m. */
export interface JointRange { flex: [number, number]; side: [number, number]; twist: [number, number] }
export interface Joint {
  id: string; name: string; parent: SegmentId; child: SegmentId;
  /** where it is, in the body's frame */ at: V3;
  /** the child's bone at rest (its twist axis), the axis it flexes about (turning the bone into flexion, positive),
   *  and the direction outward from the body (where abduction or bending to the side takes it) */ twistAxis: V3; flexAxis: V3; outward: V3;
  /** degrees: [extension, flexion], [adduction, abduction] (or [the other side, this side]), [one way, the other] */ range: JointRange;
  /** N·m: [extending, flexing], [adducting, abducting], twisting */ torque: { flex: [number, number]; side: [number, number]; twist: number };
}
export interface Rig { segments: Segment[]; joints: Joint[]; mass: number; density: number; muscleKg: number; strength: number; says: string[] }

/** de Leva 1996 table 4: each segment's share of the body's mass, men and women. The trunk is his three: upper (to the
 *  xiphoid), middle (to the navel) and lower (to the hip joints). */
const SHARE: Record<'m' | 'f', Record<'head' | 'thorax' | 'abdomen' | 'pelvis' | 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shank' | 'foot', number>> = {
  m: { head: 0.0694, thorax: 0.1596, abdomen: 0.1633, pelvis: 0.1117, upperArm: 0.0271, forearm: 0.0162, hand: 0.0061, thigh: 0.1416, shank: 0.0433, foot: 0.0137 },
  f: { head: 0.0668, thorax: 0.1545, abdomen: 0.1465, pelvis: 0.1247, upperArm: 0.0255, forearm: 0.0138, hand: 0.0056, thigh: 0.1478, shank: 0.0481, foot: 0.0129 },
};
/** AAOS averages (Greene & Heckman 1994), degrees. The spine's thoracolumbar range is split between its two joints. */
const RANGE: Record<string, JointRange> = {
  hip: { flex: [-30, 120], side: [-30, 45], twist: [-45, 45] },
  knee: { flex: [-2, 135], side: [-3, 3], twist: [-8, 8] },
  ankle: { flex: [-50, 20], side: [-15, 35], twist: [-8, 8] }, // plantar flexion 50, dorsiflexion 20; eversion 15, inversion 35
  shoulder: { flex: [-60, 150], side: [-40, 150], twist: [-70, 90] }, // flexion and abduction to 180 with the shoulder blade; capped where the swing can be told from the twist
  elbow: { flex: [0, 150], side: [-2, 2], twist: [-80, 80] }, // the forearm's pronation and supination, 80 each way
  wrist: { flex: [-70, 80], side: [-20, 30], twist: [-5, 5] },
  neck: { flex: [-45, 45], side: [-45, 45], twist: [-60, 60] },
  spine: { flex: [-12.5, 40], side: [-17.5, 17.5], twist: [-22.5, 22.5] },
};
/** A typical man's peak isometric torques, N·m (estimates within published ranges): [extending, flexing],
 *  [adducting, abducting], twisting. */
const TORQUE: Record<string, Joint['torque']> = {
  hip: { flex: [250, 150], side: [120, 120], twist: 60 },
  knee: { flex: [250, 120], side: [40, 40], twist: 30 }, // extension is the quadriceps'
  ankle: { flex: [150, 50], side: [30, 30], twist: 20 }, // plantar flexion the calf's
  shoulder: { flex: [90, 80], side: [90, 70], twist: 50 },
  elbow: { flex: [50, 70], side: [20, 20], twist: 10 },
  wrist: { flex: [15, 15], side: [12, 12], twist: 5 },
  neck: { flex: [50, 40], side: [40, 40], twist: 20 },
  spine: { flex: [250, 150], side: [150, 150], twist: 80 },
};
/** A typical man's skeletal muscle, kg (ICRP 89), and the reference mass for a height the layout scales by. */
const MUSCLE_KG = 29;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v: V3): number => Math.hypot(v[0], v[1], v[2]);
const unit = (v: V3): V3 => { const l = len(v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/** The rig of a body laid out: its segments, their masses and shapes, and its joints. The density is the body's own
 *  (kg/m³), worked out from its make-up where the caller has it, else a typical 1,050. */
export function rigOf(body: Body, density = 1050): Rig {
  const p: BodyParams = body.params, J = body.joints, H = body.H, sex = p.sex >= 0.5 ? 'f' : 'm', S = SHARE[sex], M = p.mass;
  const muscleKg = MUSCLE_KG * p.muscle * (H / 1.76) ** 2.4, strength = muscleKg / MUSCLE_KG;
  const segs: Segment[] = [];
  const volume = (m: number) => m / density;
  // a capsule round a bone: its radius from its volume over its length (a cylinder with its two half-ends, π r² (L + 4r/3) = V)
  const capsule = (id: SegmentId, name: string, a: V3, b: V3, share: number): void => {
    const m = share * M, V = volume(m), L = len(sub(b, a));
    let r = Math.sqrt(V / (Math.PI * L)); for (let k = 0; k < 20; k++) r = Math.sqrt(V / (Math.PI * (L + (4 * r) / 3)));
    segs.push({ id, name, a, b, mass: m, share, shape: { kind: 'capsule', r } });
  };
  // a box: its width and height from the body, its depth what the rest of its volume needs
  const box = (id: SegmentId, name: string, a: V3, b: V3, share: number, width: number): void => {
    const m = share * M, V = volume(m), h = Math.abs(b[1] - a[1]) || len(sub(b, a)), d = V / (width * h);
    segs.push({ id, name, a, b, mass: m, share, shape: { kind: 'box', half: [width / 2, h / 2, d / 2] } });
  };
  const hipMid = mid(J.hipL!, J.hipR!), navel: V3 = [0, J.navel![1], 0], xiph: V3 = [0, J.xiphoid![1], 0], sh: V3 = [0, J.shoulderL![1], 0], neck: V3 = [0, J.neck![1], 0];
  const trunkW = Math.abs(J.shoulderL![0] - J.shoulderR![0]) * 0.78, waistW = Math.abs(J.iliacL![0] - J.iliacR![0]) * 0.95;
  box('pelvis', 'pelvis (lower trunk)', hipMid, navel, S.pelvis, waistW);
  box('abdomen', 'abdomen (middle trunk)', navel, xiph, S.abdomen, waistW * 0.95);
  box('thorax', 'thorax (upper trunk)', xiph, sh, S.thorax, trunkW);
  capsule('head', 'head and neck', neck, J.crown!, S.head);
  for (const s of ['L', 'R'] as const) {
    capsule(`upperArm${s}`, `upper arm (${s === 'L' ? 'left' : 'right'})`, J[`shoulder${s}`]!, J[`elbow${s}`]!, S.upperArm);
    capsule(`forearm${s}`, `forearm (${s === 'L' ? 'left' : 'right'})`, J[`elbow${s}`]!, J[`wrist${s}`]!, S.forearm);
    capsule(`hand${s}`, `hand (${s === 'L' ? 'left' : 'right'})`, J[`wrist${s}`]!, J[`knuckle${s}`]!, S.hand);
    capsule(`thigh${s}`, `thigh (${s === 'L' ? 'left' : 'right'})`, J[`hip${s}`]!, J[`knee${s}`]!, S.thigh);
    capsule(`shank${s}`, `shank (${s === 'L' ? 'left' : 'right'})`, J[`knee${s}`]!, J[`ankle${s}`]!, S.shank);
    // a foot: a box from heel to toe, as wide as a foot is (about 0.39 of its length, typical), its height its volume's
    const heel = J[`heel${s}`]!, toe = J[`toe${s}`]!, fl = toe[2] - heel[2], fw = 0.39 * fl, m = S.foot * M, fh = volume(m) / (fl * fw);
    segs.push({ id: `foot${s}`, name: `foot (${s === 'L' ? 'left' : 'right'})`, a: [heel[0], fh / 2, heel[2]], b: [toe[0], fh / 2, toe[2]], mass: m, share: S.foot, shape: { kind: 'box', half: [fw / 2, fh / 2, fl / 2] } });
  }
  const joints: Joint[] = [];
  const add = (id: string, name: string, parent: SegmentId, child: SegmentId, at: V3, kind: string, twistAxis: V3, flexAxis: V3, outward: V3): void => {
    const t = TORQUE[kind]!, k = strength;
    joints.push({ id, name, parent, child, at, twistAxis: unit(twistAxis), flexAxis: unit(flexAxis), outward, range: RANGE[kind]!, torque: { flex: [t.flex[0] * k, t.flex[1] * k], side: [t.side[0] * k, t.side[1] * k], twist: t.twist * k } });
  };
  // flexion about the left-right axis: for a bone hanging down, flexion takes it forward (-x turns -y to +z); a shank
  // flexes back; a trunk or head bends forward (+x turns +y to +z); a foot flexes up (dorsiflexion, -x turns +z to +y)
  add('lumbar', 'lower back', 'pelvis', 'abdomen', navel, 'spine', [0, 1, 0], [1, 0, 0], [1, 0, 0]);
  add('thoracic', 'middle back', 'abdomen', 'thorax', xiph, 'spine', [0, 1, 0], [1, 0, 0], [1, 0, 0]);
  add('neck', 'neck', 'thorax', 'head', neck, 'neck', [0, 1, 0], [1, 0, 0], [1, 0, 0]);
  for (const [s, k] of [['L', 1], ['R', -1]] as const) {
    const out: V3 = [k, 0, 0];
    add(`shoulder${s}`, `${s === 'L' ? 'left' : 'right'} shoulder`, 'thorax', `upperArm${s}`, J[`shoulder${s}`]!, 'shoulder', sub(J[`elbow${s}`]!, J[`shoulder${s}`]!), [-1, 0, 0], out);
    add(`elbow${s}`, `${s === 'L' ? 'left' : 'right'} elbow`, `upperArm${s}`, `forearm${s}`, J[`elbow${s}`]!, 'elbow', sub(J[`wrist${s}`]!, J[`elbow${s}`]!), [-1, 0, 0], out);
    add(`wrist${s}`, `${s === 'L' ? 'left' : 'right'} wrist`, `forearm${s}`, `hand${s}`, J[`wrist${s}`]!, 'wrist', sub(J[`knuckle${s}`]!, J[`wrist${s}`]!), [-1, 0, 0], out);
    add(`hip${s}`, `${s === 'L' ? 'left' : 'right'} hip`, 'pelvis', `thigh${s}`, J[`hip${s}`]!, 'hip', sub(J[`knee${s}`]!, J[`hip${s}`]!), [-1, 0, 0], out);
    add(`knee${s}`, `${s === 'L' ? 'left' : 'right'} knee`, `thigh${s}`, `shank${s}`, J[`knee${s}`]!, 'knee', sub(J[`ankle${s}`]!, J[`knee${s}`]!), [1, 0, 0], out);
    add(`ankle${s}`, `${s === 'L' ? 'left' : 'right'} ankle`, `shank${s}`, `foot${s}`, J[`ankle${s}`]!, 'ankle', [0, 0, 1], [-1, 0, 0], out);
  }
  const mass = segs.reduce((a, x) => a + x.mass, 0);
  return { segments: segs, joints, mass, density, muscleKg, strength, says: [
    `${segs.length} segments, ${mass.toFixed(1)} kg (de Leva 1996, ${sex === 'f' ? 'women' : 'men'}), at ${density.toFixed(0)} kg/m³`,
    `${joints.length} joints, their ranges the AAOS averages; their torques a typical man's times ${strength.toFixed(2)} (${muscleKg.toFixed(1)} kg of muscle)`,
  ] };
}

/** Where a segment's middle is, and the body's centre of mass, from the segments' own (each at its middle). */
export const centreOf = (s: Segment): V3 => mid(s.a, s.b);
export function centreOfMass(rig: Rig): V3 {
  const c: V3 = [0, 0, 0]; for (const s of rig.segments) { const m = centreOf(s); for (let i = 0; i < 3; i++) c[i]! += (m[i]! * s.mass) / rig.mass; }
  return c;
}
