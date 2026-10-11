// The tuner: a part of the generative loop, not a report. A manifold is generated in a representation the generator
// may choose (the step a realization integrates at; any resolution of time, space or observation), judged by the
// language and by what it realizes, and when the judgement says the representation does not hold the phenomenon, the
// representation is changed and the manifold regenerated. Nothing generated is patched: the pathway changes and
// everything is made again from it.
//
// The coarsest representation the language admits is generated first, so nothing is computed finer than the
// phenomenon needs. A relation that refuses and speaks of the axis is solved for it: the coarsest value it admits is
// taken. A realization that breaks its contract with no relation to say why is regenerated finer, as an experiment:
// if the finer one keeps the contract, the axis is where the fault was. A representation beyond what the realization
// can reach is refused, with its reason. Every step taken is kept, so the path can be walked back or refined again.

import type { Language, Relation } from './abduce';
import type { Derivation } from '../lang/evaluate';

/** The representation the tuner chooses along: a quantity the language may speak of, and the values available, coarsest first. */
export interface Axis { sym: string; values: Derivation[] }

/** What a generated manifold says to the tuner: what the language refused, whether its realization kept its contract, and the quantities it was judged on. */
export interface Judged { refusedBy: Relation[]; kept: boolean | null; quantities: Record<string, Derivation> }

export interface Step<S> { value: Derivation; manifold: S; refusedBy: string[]; kept: boolean | null; why: string }
export interface Tuning<S> { chosen: Step<S> | null; path: Step<S>[]; refused: string | null }

/**
 * The bound a relation puts on one quantity, the others held. A relation's group is a product of powers; it holds
 * below its bound (or above, as observed), and inside the bound's uncertainty it does not decide. So the quantity is
 * solved for the edge of what was observed to hold: the largest value the holding class reached, or the smallest.
 */
export function boundOn(r: Relation, sym: string, at: Record<string, Derivation>): { below: number } | { above: number } | null {
  const e = r.group.exponents[sym];
  if (!e) return null;
  let rest = 1;
  for (const [n, x] of Object.entries(r.group.exponents)) { if (n === sym) continue; const v = at[n]?.value; if (v === null || v === undefined) return null; rest *= v ** x; }
  const b = r.bound.value!, u = r.bound.uncertainty ?? 0;
  // the group holds below b − u when the outcome is kept below the bound, above b + u when above it
  const edge = r.above === 0 ? b - u : b + u;
  const v = (edge / rest) ** (1 / e);
  const groupBelow = r.above === 0;
  return (groupBelow === e > 0) ? { below: v } : { above: v };
}

const admits = (b: { below: number } | { above: number }, v: number) => ('below' in b ? v <= b.below : v >= b.above);

export function tune<S>(axis: Axis, generate: (v: Derivation) => S, judge: (s: S) => Judged): Tuning<S> {
  const path: Step<S>[] = [];
  const at = (i: number, why: string) => { const value = axis.values[i]!; const manifold = generate(value); const j = judge(manifold); const s = { value, manifold, refusedBy: j.refusedBy.map((r) => r.name), kept: j.kept, why }; path.push(s); return { s, j }; };
  let i = 0;
  let { s, j } = at(0, 'the coarsest representation first: nothing finer than the phenomenon needs');
  for (let guard = 0; guard < axis.values.length + 1; guard++) {
    if (j.refusedBy.length) {
      // a relation that speaks of the axis is solved for it; one that does not cannot be met by this axis
      const bounds = j.refusedBy.map((r) => ({ r, b: boundOn(r, axis.sym, j.quantities) }));
      const silent = bounds.find((x) => !x.b);
      if (silent) return { chosen: null, path, refused: `${silent.r.name} refuses, and does not speak of ${axis.sym}: no ${axis.sym} meets it` };
      const next = axis.values.findIndex((v, k) => k > i && bounds.every((x) => admits(x.b!, v.value!)));
      if (next < 0) return { chosen: null, path, refused: `the language needs ${bounds.map((x) => ('below' in x.b! ? `${axis.sym} at most ${x.b!.below.toPrecision(4)}` : `${axis.sym} at least ${x.b!.above.toPrecision(4)}`)).join(' and ')}, and the finest available is ${axis.values.at(-1)!.value!.toPrecision(4)} (${axis.values.at(-1)!.name})` };
      i = next;
      ({ s, j } = at(i, `solved from ${bounds.map((x) => x.r.name).join(', ')}: the coarsest ${axis.sym} it admits`));
      continue;
    }
    if (j.kept === false) {
      // no relation says why: the axis is tried as the fault, finer
      if (i + 1 >= axis.values.length) return { chosen: null, path, refused: `the realization breaks its contract at the finest ${axis.sym} available, and no relation says why: the fault is not in ${axis.sym}` };
      i += 1;
      ({ s, j } = at(i, `the contract was broken with no relation to say why: ${axis.sym} tried finer`));
      continue;
    }
    return { chosen: s, path, refused: null };
  }
  return { chosen: null, path, refused: 'the tuner did not settle' };
}

/** Whether a manifold judged under a language is stale now: the language has grown since, so its judgement may differ. */
export const stale = (judgedUnder: string, language: Language) => judgedUnder !== language.hash;
