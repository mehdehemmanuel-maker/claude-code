// Creatures with bodies. A creature here is not an animation: it is a body of real parts, joined by real joints,
// moved by real actuators, in the same physics as everything else. What makes it a creature is its body plan (how
// many segments, how big, what of) and its rhythm: like the rhythm generators in an animal's spinal cord, each joint's
// servo swings on its own clock, a little behind the one before it, so a wave runs down the body.
//
// A swimmer is a chain of flat segments joined by servos on side-to-side axes, so its wave runs up and down, as a
// whale's or a dolphin's does. (A body flat from side to side, as most fish are, rolls onto its side in the water
// unless something keeps it upright: a swim bladder above its weight, fins that correct it. Without a keel a flat
// body floating level is the stable one.) The wave runs from head to tail, swinging the tail most; each segment,
// pushed back by the water hardest across its face (resistive force theory, the water drag in the physics world),
// pushes the water back and the body forward. Nothing tells it to go forward: if the water didn't push back more
// across a face than along it, it would only wriggle in place.

import { addConnection, addPart } from '../doc/commands';
import type { DocStore } from '../doc/store';
import type { Pose, Quat, Vec3 } from '../doc/types';
import { add, qmul, rotate } from '../doc/math';
import { AUTO_JOIN, planJoin } from '../connectors/plan';
import { getMaterial } from '../data/materials';
import { ROTOR_PER_STALL } from '../connectors/registry';

export interface BodyPlan {
  name: string;
  /** How many segments, each how long, how wide from side to side and how thick, m, and what of. */
  segments: number;
  length: number;
  span: number;
  thickness: number;
  material: string;
  /** Its rhythm, Hz, and how many waves fit along it at once. */
  rhythm: number;
  waves: number;
  /** How far each joint swings, rad: from the neck to the tail. */
  swingHead: number;
  swingTail: number;
  /** Each servo's stall torque, N m. */
  torque: number;
}

/**
 * Swimmers people ask for, as body plans. Polyethylene (950 kg/m³) floats in seawater (1025) with most of it under,
 * as a fish rides near the surface; real fish beat their tails at a few hertz with about one wave along the body
 * (Lighthill, Mathematics of Biofluiddynamics, SIAM 1975; Videler, Fish Swimming, Chapman & Hall 1993).
 */
export const SWIMMERS: Record<string, BodyPlan> = {
  whale: { name: 'a swimmer shaped like a small whale', segments: 5, length: 0.1, span: 0.08, thickness: 0.02, material: 'polymer.hdpe', rhythm: 1.5, waves: 1, swingHead: 0.12, swingTail: 0.5, torque: 0.5 },
  eel: { name: 'an eel-like swimmer', segments: 8, length: 0.08, span: 0.04, thickness: 0.02, material: 'polymer.hdpe', rhythm: 1.2, waves: 1.5, swingHead: 0.25, swingTail: 0.45, torque: 0.3 },
};

/** The swimmer a request names, or null. */
export function swimmerFromWords(text: string): BodyPlan | null {
  const t = text.toLowerCase();
  if (/\b(eels?|snakes?|sea snakes?)\b/.test(t)) return SWIMMERS['eel']!;
  if (/\b(fish|fishes|shark|whales?|dolphins?|swimmer|tuna|salmon|koi|leviathans?)\b/.test(t)) return SWIMMERS['whale']!;
  return null;
}

/** A quarter turn about x: carries a frame's y (a hinge's axis) onto z, side to side. */
const SIDEWAYS: Quat = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];
const yaw = (a: number): Quat => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

/**
 * Build a swimmer into a document: its head at `at`, facing `heading` (rad about up, 0 facing +x). Its segments are
 * flat plates; each joint a servo on a side-to-side axis with its own rhythm, its phase lagging down the body.
 */
export function buildSwimmer(store: DocStore, plan: BodyPlan, at: Vec3, heading = 0, tag = 'fish'): { parts: string[]; joints: string[] } {
  const face = yaw(heading), q = face;
  const back = rotate(face, [-1, 0, 0]);
  const parts: string[] = [], joints: string[] = [];
  for (let k = 0; k < plan.segments; k++) {
    const c: Vec3 = [at[0] + back[0] * plan.length * (k + 0.5), at[1], at[2] + back[2] * plan.length * (k + 0.5)];
    const p = addPart(store, { kind: 'plate', pose: { p: c, q }, material: plan.material, params: { length: plan.length, width: plan.span, thickness: plan.thickness }, name: `${tag}-${k === 0 ? 'head' : k === plan.segments - 1 ? 'tail' : `body${k}`}` });
    parts.push(p.id);
  }
  // each joint's hinge (its frame's y) runs side to side
  const frame = (x: number): Pose => ({ p: [x, 0, 0], q: qmul(conj(q), qmul(face, SIDEWAYS)) });
  const lag = (2 * Math.PI * plan.waves) / Math.max(1, plan.segments - 1);
  for (let k = 0; k + 1 < plan.segments; k++) {
    const s = plan.segments > 2 ? k / (plan.segments - 2) : 1;
    const c = addConnection(store, {
      kind: 'servo', a: { part: parts[k]!, frame: frame(-plan.length / 2) }, b: { part: parts[k + 1]!, frame: frame(plan.length / 2) },
      params: { maxTorque: plan.torque, range: Math.PI / 2, swing: plan.swingHead + (plan.swingTail - plan.swingHead) * s, rhythm: plan.rhythm, phase: -lag * k, pin: 0.004 },
    });
    joints.push(c.id);
  }
  return { parts, joints };
}

// ---------------------------------------------------------------------------------------------------------------
// Walkers. A walker is a body on four legs, each a thigh and a shank of printed plastic on two servos (a hip that swings
// it fore and aft, a knee that folds it), with a rubber foot. Each servo keeps its own rhythm; the hip swings the leg,
// the knee folds it a quarter cycle ahead, most at mid-swing and straight at mid-stance, so the foot is lifted as it
// comes forward and planted as it goes back. The gait is which legs swing together. Nothing tells it to go forward:
// a foot planted and pushed back, held by friction, pushes the body on; without friction, or with the knees still, it
// paddles in place.

/** Gaits as each leg's place in the cycle (fractions of a stride): Hildebrand, Symmetrical gaits of horses, Science 150 (1965). */
export const GAITS: Record<string, { name: string; LF: number; RF: number; LH: number; RH: number }> = {
  trot: { name: 'a trot (diagonal legs together)', LF: 0, RH: 0, RF: 0.5, LH: 0.5 },
  walk: { name: 'a walk (one foot at a time, hind then fore on each side)', LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 },
  pace: { name: 'a pace (legs on each side together)', LF: 0, LH: 0, RF: 0.5, RH: 0.5 },
  bound: { name: 'a bound (fore legs, then hind)', LF: 0, RF: 0, LH: 0.5, RH: 0.5 },
};

export interface WalkerPlan {
  name: string;
  /** Its body: a plate, m, and what of. */
  body: { length: number; width: number; thickness: number; material: string };
  /** Each leg: thigh and shank lengths, the square bar they are of, and what of; its foot. */
  thigh: number;
  shank: number;
  bar: number;
  legMaterial: string;
  foot: { diameter: number; material: string };
  /** Its servos: stall torque N m, no-load speed rad/s, how far off they give it all (rad), and each case's size, m. */
  servo: { torque: number; speed: number; band: number; travel: number; size: Vec3; material: string };
  /** Its rhythm, Hz; how far each hip swings and each knee folds, rad; its gait. */
  rhythm: number;
  swing: number;
  lift: number;
  gait: keyof typeof GAITS;
}

/**
 * A 9 g micro servo: 0.18 N m (1.8 kgf cm) stall, 60° in 0.1 s unloaded, 23 × 12.2 × 29 mm (a common hobby micro
 * servo's datasheet); its case is plastic with a motor and gears inside, about as dense as ABS. It turns through
 * about 180° between its stops (estimate: what hobby servos of the class are sold as; some stop short of it), and a
 * walker's stride swings well inside that, so its legs never reach the stops.
 */
const MICRO_SERVO = { torque: 0.18, speed: 10.5, band: 0.1, travel: Math.PI / 2, size: [0.023, 0.0122, 0.029] as Vec3, material: 'polymer.abs' };

/** Walkers people ask for: small robot animals of plywood, printed plastic and hobby servos, as people build. */
export const WALKERS: Record<string, WalkerPlan> = {
  dog: {
    // a stance as wide as its legs are long: narrower, a shove sideways rolls it over (one in five at 0.06 N s)
    name: 'a small four-legged walker, dog-shaped', body: { length: 0.2, width: 0.16, thickness: 0.01, material: 'wood.birch-plywood' },
    thigh: 0.05, shank: 0.05, bar: 0.008, legMaterial: 'polymer.pla', foot: { diameter: 0.012, material: 'rubber.natural' },
    servo: MICRO_SERVO, rhythm: 2.5, swing: 0.45, lift: 0.6, gait: 'walk',
  },
  deer: {
    // long legs carry its body higher over the same feet: it needs a wider stance not to roll over in a trot
    name: 'a long-legged four-legged walker, deer-shaped', body: { length: 0.22, width: 0.16, thickness: 0.01, material: 'wood.birch-plywood' },
    thigh: 0.07, shank: 0.07, bar: 0.008, legMaterial: 'polymer.pla', foot: { diameter: 0.012, material: 'rubber.natural' },
    servo: MICRO_SERVO, rhythm: 1.6, swing: 0.4, lift: 0.55, gait: 'trot',
  },
};

/** The walker a request names, or null. */
export function walkerFromWords(text: string): WalkerPlan | null {
  const t = text.toLowerCase();
  if (/\b(deer|fawns?|stags?|does|elk|antelopes?|gazelles?|horses?|ponies|pony|goats?|giraffes?)\b/.test(t)) return WALKERS['deer']!;
  if (/\b(dogs?|pupp(y|ies)|cats?|kittens?|foxe?s?|wolf|wolves|robot dog|quadrupeds?|walkers?|pets?|animals?|creatures?)\b/.test(t)) return WALKERS['dog']!;
  return null;
}

export interface Walker {
  parts: string[];
  joints: string[];
  /** Its body, and the hips on each side (what steering shortens). */
  body: string;
  left: string[];
  right: string[];
  /** Every servo, hips and knees. */
  servos: string[];
}

/** A rigid join between two parts, as the join planner chooses for their materials and the face between them. */
function fasten(store: DocStore, a: { id: string; material: string; thin: number; at: Vec3 }, b: { id: string; material: string; thin: number; at: Vec3 }, face: [number, number]) {
  const plan = planJoin(AUTO_JOIN, getMaterial(a.material), getMaterial(b.material), { thicknessA: a.thin, thicknessB: b.thin, bondW: face[0], bondL: face[1] });
  return addConnection(store, { kind: plan.kind, a: { part: a.id, frame: { p: a.at, q: [0, 0, 0, 1] } }, b: { part: b.id, frame: { p: b.at, q: [0, 0, 0, 1] } }, params: { ...plan.params, bondW: face[0], bondL: face[1] } });
}

/**
 * Build a walker into a document, its feet on the ground at `at` (the ground's height there), facing `heading` (rad
 * about up, 0 facing +x). Facing +x, its left is −z.
 */
export function buildWalker(store: DocStore, plan: WalkerPlan, at: Vec3, heading = 0, tag = 'dog'): Walker {
  const q = yaw(heading);
  const { length: L, width: W, thickness: t } = plan.body;
  const s = plan.bar, r = plan.foot.diameter / 2, sv = plan.servo;
  const y0 = r + plan.shank + plan.thigh + t / 2 + 0.002;
  const world = (v: Vec3): Vec3 => add(at, rotate(q, v));
  const part = (kind: string, local: Vec3, material: string, params: Record<string, number>, name: string) =>
    addPart(store, { kind, pose: { p: world(local), q }, material, params, name }).id;
  const out: Walker = { parts: [], joints: [], body: '', left: [], right: [], servos: [] };
  const body = part('plate', [0, y0, 0], plan.body.material, { length: L, width: W, thickness: t }, `${tag}-body`);
  out.body = body;
  out.parts.push(body);
  const gait = GAITS[plan.gait]!;
  // What each servo swings, as its loop sees it (world.ts servoLoop: stiffness stall torque over band, critically
  // damped on the inertia it turns, its rotor included): the leg below the joint, as point masses at their centres,
  // and the rotor at the horn. A critically damped loop driven at the rhythm answers late and a little short, by the
  // second-order response at r = 2 pi f / w_n: a lag of atan2(2 r, 1 - r^2) and a gain of 1 / sqrt((1 - r^2)^2 + (2 r)^2).
  // The rhythm generator sends each servo its command that much early and that much larger (within the travel), so the
  // leg moves with the phasing the gait is designed for, as a rhythm generator grown onto a body is. Without it the
  // hips and knees, on different inertias, lag by different amounts and a trot's diagonal timing drifts.
  const density = (m: string) => getMaterial(m).density;
  const mThigh = density(plan.legMaterial) * s * plan.thigh * s, mShank = density(plan.legMaterial) * s * plan.shank * s;
  const mFoot = density(plan.foot.material) * (4 / 3) * Math.PI * (plan.foot.diameter / 2) ** 3;
  const mCase = density(sv.material) * sv.size[0] * sv.size[1] * sv.size[2];
  const rotor = ROTOR_PER_STALL * sv.torque;
  const iHip = rotor + mThigh * (plan.thigh / 2) ** 2 + mCase * plan.thigh ** 2 + mShank * (plan.thigh + plan.shank / 2) ** 2 + mFoot * (plan.thigh + plan.shank) ** 2;
  const iKnee = rotor + mShank * (plan.shank / 2) ** 2 + mFoot * plan.shank ** 2;
  const response = (I: number) => {
    const wn = Math.sqrt(sv.torque / sv.band / I), r = (2 * Math.PI * plan.rhythm) / wn;
    return { lag: Math.atan2(2 * r, 1 - r * r), gain: 1 / Math.hypot(1 - r * r, 2 * r) };
  };
  const servo = (a: string, fa: Vec3, b: string, fb: Vec3, range: number, offset: number, phase: number, inertia: number, wave: 'sine' | 'lift' = 'sine') => {
    const h = response(inertia);
    const wrap = ((phase + h.lag + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const c = addConnection(store, {
      kind: 'servo', a: { part: a, frame: { p: fa, q: SIDEWAYS } }, b: { part: b, frame: { p: fb, q: SIDEWAYS } },
      params: { maxTorque: sv.torque, speed: sv.speed, band: sv.band, rotor, range: sv.travel, swing: Math.min(sv.travel, range / h.gain), offset, rhythm: plan.rhythm, phase: wrap, wave, pin: 0.003 },
    });
    out.joints.push(c.id);
    out.servos.push(c.id);
    return c.id;
  };
  const legs: ['LF' | 'RF' | 'LH' | 'RH', number, number][] = [['LF', 1, -1], ['RF', 1, 1], ['LH', -1, -1], ['RH', -1, 1]];
  for (const [leg, fx, side] of legs) {
    const hx = fx * L * 0.4, hz = side * (W / 2 + s / 2 + 0.002);
    const hipY = y0 - t / 2, kneeY = hipY - plan.thigh;
    const name = `${tag}-${String(leg).toLowerCase()}`;
    const thigh = part('block', [hx, hipY - plan.thigh / 2, hz], plan.legMaterial, { x: s, y: plan.thigh, z: s }, `${name}-thigh`);
    const shank = part('block', [hx, kneeY - plan.shank / 2, hz], plan.legMaterial, { x: s, y: plan.shank, z: s }, `${name}-shank`);
    const foot = part('sphere', [hx, kneeY - plan.shank, hz], plan.foot.material, { diameter: plan.foot.diameter }, `${name}-foot`);
    // the servos' cases: the hip's on the body above its leg, the knee's on the thigh's outer side
    const [cx, cy, cz] = sv.size;
    const hipCase = part('block', [hx, y0 + t / 2 + cy / 2, side * (W / 2 - cz / 2)], sv.material, { x: cx, y: cy, z: cz }, `${name}-hip-servo`);
    const kneeCase = part('block', [hx, kneeY + cz / 2, hz + side * (s / 2 + cy / 2 + 0.001)], sv.material, { x: cx, y: cz, z: cy }, `${name}-knee-servo`);
    out.parts.push(thigh, shank, foot, hipCase, kneeCase);
    const phase = 2 * Math.PI * gait[leg];
    // the hip swings the leg; the knee folds it, by up to `lift`, only while it comes forward (a quarter cycle ahead of
    // the hip, so most at mid-swing), and is straight the whole time it bears weight
    const hip = servo(body, [hx, -t / 2, hz], thigh, [0, plan.thigh / 2, 0], plan.swing, 0, phase, iHip);
    servo(thigh, [0, -plan.thigh / 2, 0], shank, [0, plan.shank / 2, 0], plan.lift, 0, phase + Math.PI / 2, iKnee, 'lift');
    (side < 0 ? out.left : out.right).push(hip);
    out.joints.push(
      fasten(store, { id: body, material: plan.body.material, thin: t, at: [hx, t / 2, side * (W / 2 - cz / 2)] }, { id: hipCase, material: sv.material, thin: cy, at: [0, -cy / 2, 0] }, [cx, cz]).id,
      fasten(store, { id: thigh, material: plan.legMaterial, thin: s, at: [0, -plan.thigh / 2 + cz / 2, side * s / 2] }, { id: kneeCase, material: sv.material, thin: cy, at: [0, 0, -side * (cy / 2 + 0.001)] }, [s, cz]).id,
      fasten(store, { id: shank, material: plan.legMaterial, thin: s, at: [0, -plan.shank / 2, 0] }, { id: foot, material: plan.foot.material, thin: plan.foot.diameter, at: [0, 0, 0] }, [s, s]).id,
    );
  }
  return out;
}
