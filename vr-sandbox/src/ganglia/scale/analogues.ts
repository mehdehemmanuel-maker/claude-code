// Self-similarity search over the substrate: FIND_SCALE_ANALOGUES(pattern) finds things whose relational structure is
// the same as a given thing's at a scale many orders of magnitude away. The similarity is structural and causal: the
// functions a thing does, the transformations it makes, the roles it plays, whether it controls (feedback), what it
// moves and converts, what it requires and produces; never what it looks like. The scale is the characteristic length
// each entity carries as a parameter (L_c), so a candidate counts only when its scale differs by the asked decades.
import type { Substrate } from '../substrate/substrate';
import type { Entity } from '../substrate/model';

export interface Signature {
  does: Set<string>;
  transforms: Set<string>;
  plays: Set<string>;
  isA: Set<string>;
  requires: Set<string>;
  produces: Set<string>;
  /** Whether it closes a loop on itself: controls, senses and acts. */
  feedback: boolean;
  /** What flows through it, read from its functions: fluid, current, heat, force, information. */
  flows: Set<string>;
}

const FLOW_WORDS: [RegExp, string][] = [[/fluid|pump|flow/, 'fluid'], [/current|conduct|electr/, 'current'], [/heat|thermal|cool/, 'heat'], [/force|load|torque|support/, 'force'], [/signal|sense|communicat|compute|control|inform/, 'information'], [/energy|store/, 'energy'], [/rotat|turn/, 'rotation']];

export function signatureOf(s: Substrate, e: Entity): Signature {
  const out = (kind: Parameters<Substrate['outOf']>[1]) => new Set(s.outOf(e.id, kind).map((r) => r.to));
  const does = out('does'), transforms = out('transforms'), plays = out('plays'), isA = out('is-a'), requires = out('requires'), produces = new Set(s.reach(e.id, 'produces').map((x) => x.id));
  const flows = new Set<string>();
  for (const f of [...does, ...transforms]) for (const [re, w] of FLOW_WORDS) if (re.test(f)) flows.add(w);
  const feedback = [...does].some((f) => /control|regulat|homeosta|feedback/.test(f)) || isA.has('circuit.feedback-controller') || [...s.outOf(e.id, 'analogous-to')].some((r) => /feedback|controller|governor|thermostat/.test(r.to));
  return { does, transforms, plays, isA, requires, produces, feedback, flows };
}

const jaccard = (a: Set<string>, b: Set<string>) => { if (!a.size && !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n); };

/** The characteristic length of a thing, m, from its L_c parameter; undefined when it carries none. */
export const characteristicLength = (e: Entity): number | undefined => e.params?.find((p) => p.sym === 'L_c')?.low;
export const characteristicTime = (e: Entity): number | undefined => e.params?.find((p) => p.sym === 'T_c')?.low;

export interface ScaleAnalogue { entity: Entity; length: number; decades: number; similarity: number; shared: { does: string[]; transforms: string[]; plays: string[]; flows: string[]; feedback: boolean }; why: string }

/**
 * Things structurally like `id` at a scale at least `minDecades` away. Similarity weights what is causal: functions and
 * transformations most, roles and flows next, feedback as a match of kind. A thing without a characteristic length
 * cannot be placed on the scale axis and is left out, which is said in `unplaced`.
 */
export function findScaleAnalogues(s: Substrate, id: string, opts: { minDecades?: number; minSimilarity?: number; limit?: number } = {}): { of: Entity; length?: number; analogues: ScaleAnalogue[]; unplaced: number } | null {
  const e = s.get(id);
  if (!e) return null;
  const minDecades = opts.minDecades ?? 2, minSimilarity = opts.minSimilarity ?? 0.2, limit = opts.limit ?? 12;
  const sig = signatureOf(s, e);
  const L0 = characteristicLength(e);
  const analogues: ScaleAnalogue[] = [];
  let unplaced = 0;
  for (const x of s.entities.values()) {
    if (x.id === e.id) continue;
    const L = characteristicLength(x);
    if (L === undefined) { unplaced++; continue; }
    if (L0 === undefined) continue;
    const decades = Math.abs(Math.log10(L / L0));
    if (decades < minDecades) continue;
    const t = signatureOf(s, x);
    if (!t.does.size && !t.transforms.size && !t.plays.size) continue;
    const similarity = 0.4 * jaccard(sig.does, t.does) + 0.25 * jaccard(sig.transforms, t.transforms) + 0.15 * jaccard(sig.plays, t.plays) + 0.1 * jaccard(sig.flows, t.flows) + (sig.feedback === t.feedback && sig.feedback ? 0.1 : 0);
    if (similarity < minSimilarity) continue;
    const shared = { does: [...sig.does].filter((f) => t.does.has(f)), transforms: [...sig.transforms].filter((f) => t.transforms.has(f)), plays: [...sig.plays].filter((f) => t.plays.has(f)), flows: [...sig.flows].filter((f) => t.flows.has(f)), feedback: sig.feedback && t.feedback };
    analogues.push({ entity: x, length: L, decades, similarity, shared, why: `${decades.toFixed(1)} decades ${L > L0 ? 'larger' : 'smaller'}; shares ${[...shared.does, ...shared.transforms].join(', ') || 'no function by name'}${shared.plays.length ? `; same roles ${shared.plays.join(', ')}` : ''}${shared.flows.length ? `; moves ${shared.flows.join(', ')}` : ''}${shared.feedback ? '; both close a feedback loop' : ''}` });
  }
  analogues.sort((a, b) => b.similarity - a.similarity || b.decades - a.decades);
  return { of: e, length: L0, analogues: analogues.slice(0, limit), unplaced };
}

/** A pattern given as functions and flags, rather than a thing: the same search from a description. */
export function findPattern(s: Substrate, pattern: { does?: string[]; transforms?: string[]; plays?: string[]; feedback?: boolean }, opts: { minSimilarity?: number; limit?: number } = {}): ScaleAnalogue[] {
  const sig: Signature = { does: new Set(pattern.does ?? []), transforms: new Set(pattern.transforms ?? []), plays: new Set(pattern.plays ?? []), isA: new Set(), requires: new Set(), produces: new Set(), feedback: !!pattern.feedback, flows: new Set() };
  const out: ScaleAnalogue[] = [];
  for (const x of s.entities.values()) {
    const L = characteristicLength(x);
    if (L === undefined) continue;
    const t = signatureOf(s, x);
    const similarity = 0.5 * jaccard(sig.does, t.does) + 0.25 * jaccard(sig.transforms, t.transforms) + 0.15 * jaccard(sig.plays, t.plays) + (sig.feedback && t.feedback ? 0.1 : 0);
    if (similarity < (opts.minSimilarity ?? 0.2)) continue;
    out.push({ entity: x, length: L, decades: 0, similarity, shared: { does: [...sig.does].filter((f) => t.does.has(f)), transforms: [...sig.transforms].filter((f) => t.transforms.has(f)), plays: [...sig.plays].filter((f) => t.plays.has(f)), flows: [], feedback: sig.feedback && t.feedback }, why: `at ${L.toExponential(0)} m` });
  }
  out.sort((a, b) => b.similarity - a.similarity || a.length - b.length);
  return out.slice(0, opts.limit ?? 20);
}
