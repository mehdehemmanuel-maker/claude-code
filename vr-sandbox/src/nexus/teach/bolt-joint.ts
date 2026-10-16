// ONE BOLTED JOINT AS PHYSICS, the way ./solder-joint.ts is one through-hole joint as physics. A bolt does not hold
// two parts by being in their holes; it holds them by being STRETCHED, and the friction its stretch makes between
// the faces is what carries the load. So every figure here comes from that one idea: the bolt's stress area, the
// proof stress of its class, the preload a reusable joint is tightened to, and the torque that reaches that preload
// through the friction of its own threads and head. Each is sourced, and the three that are rules of practice rather
// than measurements (the preload fraction, the nut factor, the engagement depth) say so.
//
// It exists so the lesson language (./edges.ts) can teach a second process. Before this, every edge kind in it —
// insert, hold, tin, solder, trim, power, rest — was a step in soldering a through-hole board, while `works/plan.ts`
// can route about twenty processes. A language that says one process is not a language.
//
// Owner of: a bolted joint's figures, the length it needs, and why one cannot be made.

import { CAP_KEY, LENGTHS, METRIC } from '../parts/threads';
import { CLEAR } from '../parts/fab';

/** ISO 898-1 property classes for carbon and alloy steel bolts. Named for what it is rather than `Grade`,
 *  which a solder joint already uses for something else entirely (how good the joint came out). */
export type BoltClass = '8.8' | '10.9' | '12.9';
/** ISO 898-1 Table 3: the proof stress Sp in MPa. Class 8.8 is split: 640 up to M16, 660 above it. */
export const PROOF_STRESS: Record<BoltClass, (d: number) => number> = { '8.8': (d) => (d <= 16 ? 640 : 660), '10.9': () => 940, '12.9': () => 1100 };

/** What the bolt threads into at the far end: a nut, or a hole tapped in one of the parts. */
export type Into = { kind: 'nut' } | { kind: 'tapped'; depth: number; matter: 'steel' | 'cast iron' | 'aluminium' };
export type Head = 'socket cap' | 'hex' | 'button';

export interface BoltJoint {
  thread: string;
  grade: BoltClass;
  /** The thickness clamped between the head's bearing face and the far face, mm. */
  grip: number;
  /** Plain washers in the stack (ISO 7089), 0–2. */
  washers: number;
  into: Into;
  head: Head;
  /** The clearance hole actually drilled through the clamped parts, mm. */
  hole: number;
}

export interface BoltFigures {
  d: number; pitch: number;
  /** Tensile stress area, mm², ISO 898-1: As = (pi/4)(d - 0.9382 p)^2. */
  stressArea: number;
  proof: number;
  /** The preload the joint is tightened to, N, and the fraction of proof load it is. */
  preload: number; fraction: number;
  /** The nut factor K and the torque that reaches that preload, N·m. */
  K: number; torque: number;
  /** What the stack needs, and the preferred length picked for it (ISO 888). */
  needed: number; length: number;
  /** Thread engaged at the far end against what the far material needs. */
  engaged: number; engagedNeeded: number;
  /** What drives it, across flats in mm, and what it is. */
  drive: number; driveBy: 'hex key' | 'spanner';
  /** Thread standing past the nut, mm (zero for a tapped hole). */
  protrusion: number;
  says: string[];
}

/** How far a bolt must be threaded into a tapped hole for the THREADS not to be what fails, as a multiple of its
 *  diameter. 0.8 is what an ISO 4032 nut gives (its height is 0.8 d) and that nut is specified to develop the
 *  bolt's full strength, so steel is held to the same; the softer the material, the more thread is needed to carry
 *  the same load. The two softer figures are common practice, not a measurement, and are labelled so. */
export const ENGAGE: Record<'steel' | 'cast iron' | 'aluminium', number> = { steel: 0.8, 'cast iron': 1.5, aluminium: 2 };
/** The nut factor K in T = K d F: the whole friction of the threads and the head bearing face, as one number. 0.20
 *  for plain non-plated steel and 0.15 zinc-plated are the values textbooks quote (Shigley; Bickford). They are
 *  TYPICAL, and the scatter on them is about ±25 %, which is why a torque wrench sets a preload only roughly. */
export const NUT_FACTOR = { plain: 0.2, zinc: 0.15, lubricated: 0.12 } as const;
/** A reusable joint is tightened to 0.75 of its proof load, a permanent one to 0.90 (Shigley). */
export const PRELOAD_FRACTION = { reusable: 0.75, permanent: 0.9 } as const;

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Every figure of a bolted joint, or the reasons it cannot be made as asked. Nothing is defaulted silently: a thread
 * the tables do not hold, a hole the shank will not pass, no stocked length long enough, or too little thread
 * engaged, each comes back as its own sentence.
 */
export function boltFigures(j: BoltJoint, o: { friction?: keyof typeof NUT_FACTOR; use?: keyof typeof PRELOAD_FRACTION } = {}): BoltFigures | { refused: string[] } {
  const refused: string[] = [];
  const T = METRIC[j.thread];
  if (!T) return { refused: [`there is no ${j.thread} in the metric thread tables (ISO 261 coarse, M1.6–M24)`] };
  const d = Number(j.thread.slice(1)), p = T.p;

  // the hole: it must pass the shank, and a hole far over the clearance size lets the parts move before it is tight
  const clear = CLEAR[j.thread];
  if (j.hole < d) refused.push(`the hole is ${round1(j.hole)} mm and the ${j.thread} shank is ${d} mm: it will not pass`);
  else if (clear && j.hole > clear + 1) refused.push(`the hole is ${round1(j.hole)} mm against ${j.thread}'s ${clear} mm clearance (ISO 273 medium): over a millimetre loose, the parts shift before it is tight`);

  // What the far end needs threaded into it, worked out BEFORE the length: a tapped hole's engagement is part of the
  // stack the bolt has to span, not something checked afterwards. (It was checked afterwards on the first run, which
  // picked a 16 mm bolt for a 12 mm grip and then refused its own choice for having 2.4 mm engaged.)
  const washer = j.washers * T.h;
  const need = j.into.kind === 'nut' ? ENGAGE.steel * d : ENGAGE[j.into.matter] * d;
  const tooShallow = j.into.kind === 'tapped' && j.into.depth < need - 0.05;
  if (tooShallow && j.into.kind === 'tapped')
    refused.push(`the tapped hole is ${round1(j.into.depth)} mm deep and ${round1(need)} mm of thread is needed in ${j.into.matter} (${ENGAGE[j.into.matter]} d, typical practice): the thread would strip before the bolt broke`);

  // the stack the bolt spans: grip, washers, then either the nut and two pitches past it, or the thread in the hole
  const far = j.into.kind === 'nut' ? T.m + 2 * p : need;
  const needed = j.grip + washer + far;
  const length = LENGTHS.find((L) => L >= needed) ?? 0;
  if (!length) refused.push(`${round1(needed)} mm of bolt is needed and ISO 888 stops at ${LENGTHS.at(-1)} mm`);

  // what is actually threaded at the far end once that length is picked: a tapped hole takes no more than its depth
  // (said once: a hole too shallow for the material has already been refused above, and the thread engaged in it
  //  being short is the same fact said twice)
  const engaged = j.into.kind === 'nut' ? T.m : Math.min(j.into.depth, Math.max(0, length - j.grip - washer));
  if (length && !tooShallow && engaged < need - 0.05)
    refused.push(`${round1(engaged)} mm of thread is engaged in ${j.into.kind === 'nut' ? 'the nut' : j.into.matter} and ${round1(need)} mm is needed (${j.into.kind === 'nut' ? 'a nut is 0.8 d' : `${ENGAGE[j.into.matter]} d, typical practice`}): the thread would strip before the bolt broke`);

  const drive = j.head === 'socket cap' ? CAP_KEY[j.thread] : j.head === 'hex' ? T.s : undefined;
  if (drive === undefined) refused.push(`no ${j.head} drive size is held for ${j.thread}`);
  if (refused.length) return { refused };

  const stressArea = (Math.PI / 4) * (d - 0.9382 * p) ** 2;
  const proof = PROOF_STRESS[j.grade](d);
  const fraction = PRELOAD_FRACTION[o.use ?? 'reusable'];
  const preload = fraction * stressArea * proof; // N, since mm^2 x MPa = N
  const K = NUT_FACTOR[o.friction ?? 'plain'];
  const torque = (K * d * preload) / 1000; // d in mm, so divide to N·m

  return {
    d, pitch: p, stressArea, proof, preload, fraction, K, torque,
    needed, length, engaged, engagedNeeded: need,
    drive: drive!, driveBy: j.head === 'hex' ? 'spanner' : 'hex key',
    protrusion: j.into.kind === 'nut' ? Math.max(0, length - j.grip - washer - T.m) : 0,
    says: [
      `the bolt holds by being stretched: ${Math.round(preload)} N of preload, ${Math.round(fraction * 100)} % of its proof load (${stressArea.toFixed(1)} mm² at ${proof} MPa, ISO 898-1 class ${j.grade})`,
      `${torque.toFixed(1)} N·m reaches it through the friction of its own threads and head (T = K d F, K = ${K} ${o.friction ?? 'plain'}, typical — the scatter on K is about a quarter either way)`,
    ],
  };
}

/** Whether these figures came back as a refusal. */
export const refusedBolt = (r: BoltFigures | { refused: string[] }): r is { refused: string[] } => 'refused' in r;
