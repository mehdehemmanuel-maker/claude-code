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
import { qmul, rotate } from '../doc/math';

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
      params: { maxTorque: plan.torque, range: plan.swingHead + (plan.swingTail - plan.swingHead) * s, rhythm: plan.rhythm, phase: -lag * k, pin: 0.004 },
    });
    joints.push(c.id);
  }
  return { parts, joints };
}
