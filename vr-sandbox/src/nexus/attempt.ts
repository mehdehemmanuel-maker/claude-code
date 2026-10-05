// The first attempt to manifold an intent, on the substrate as it is. The substrate builds no system from a want:
// systems are written per slice. So the attempt adds the one generic move the language allows, a closure over the
// book: from each wanted quantity, the laws whose output has its dimension; from their inputs, what the intent gives
// with the same dimension, or (one level down) laws that produce it. Nothing else is added. What the attempt cannot
// do it reports, mechanically, by what stopped it; the classification is a count, not an opinion.

import { BOOK } from './book';
import { dimOf, sameDim, type Dim } from './dimension';
import type { Law } from './law';
import { touches, type Intent, type Want } from './want';

export interface Given { region: string; sym: string; name: string; dim: Dim; environment: boolean }
export interface Step { law: Law; inputs: { port: string; given?: Given; step?: Step }[] }

export type Verdict =
  | 'no law produces it'
  | 'laws produce it from what nothing gives'
  | 'laws produce it only across regions that do not touch'
  | 'several chains, nothing to choose by'
  | 'one chain';

export interface Outcome {
  want: Want;
  /** Laws whose output has the want's dimension. */
  producers: Law[];
  /** Laws that have the dimension only among their inputs. */
  consumers: Law[];
  /** Chains that close on what the intent gives, up to the cap. */
  chains: Step[];
  /** Chains whose given quantities all belong to the want's region or a region touching it. */
  grounded: Step[];
  verdict: Verdict;
}

export interface Attempt { intent: Intent; outcomes: Outcome[]; counts: Record<Verdict, number>; structure: never[] }

const CAP = 400;

export function givensOf(i: Intent): Given[] {
  const out: Given[] = [];
  for (const r of i.regions) {
    for (const [sym, l] of Object.entries(r.quantities)) out.push({ region: r.id, sym, name: l.name, dim: l.dim, environment: r.environment });
    for (const [sym, l] of Object.entries(r.produces ?? {})) out.push({ region: r.id, sym, name: l.name, dim: l.dim, environment: r.environment });
  }
  return out;
}

const producersOf = (dim: Dim) => BOOK.filter((l) => sameDim(dimOf(l.output.unit), dim));

function chainsFor(dim: Dim, givens: Given[], depth: number, used: Set<string>): Step[] {
  const out: Step[] = [];
  for (const law of producersOf(dim)) {
    if (used.has(law.id)) continue;
    const options = law.inputs.map((p) => {
      const pd = dimOf(p.unit);
      const fromGivens = givens.filter((g) => sameDim(g.dim, pd)).map((given) => ({ port: p.sym, given }));
      const fromLaws = !fromGivens.length && depth > 1 ? chainsFor(pd, givens, depth - 1, new Set([...used, law.id])).slice(0, 8).map((step) => ({ port: p.sym, step })) : [];
      return [...fromGivens, ...fromLaws];
    });
    if (options.some((o) => !o.length)) continue;
    let combos: Step['inputs'][] = [[]];
    for (const o of options) { combos = combos.flatMap((c) => o.map((x) => [...c, x])); if (combos.length > CAP) combos = combos.slice(0, CAP); }
    for (const inputs of combos) { out.push({ law, inputs }); if (out.length >= CAP) return out; }
  }
  return out;
}

const givensIn = (s: Step): Given[] => s.inputs.flatMap((x) => (x.given ? [x.given] : x.step ? givensIn(x.step) : []));

export function attempt(i: Intent): Attempt {
  const givens = givensOf(i);
  const outcomes = i.wants.map((w): Outcome => {
    const dim = dimOf(w.quantity.unit);
    const producers = producersOf(dim);
    const consumers = BOOK.filter((l) => !producers.includes(l) && l.inputs.some((p) => sameDim(dimOf(p.unit), dim)));
    const chains = chainsFor(dim, givens, 2, new Set());
    const grounded = chains.filter((c) => givensIn(c).every((g) => touches(i, w.region, g.region)));
    const verdict: Verdict = !producers.length ? 'no law produces it'
      : !chains.length ? 'laws produce it from what nothing gives'
      : !grounded.length ? 'laws produce it only across regions that do not touch'
      : grounded.length > 1 ? 'several chains, nothing to choose by'
      : 'one chain';
    return { want: w, producers, consumers, chains, grounded, verdict };
  });
  const counts = { 'no law produces it': 0, 'laws produce it from what nothing gives': 0, 'laws produce it only across regions that do not touch': 0, 'several chains, nothing to choose by': 0, 'one chain': 0 } as Record<Verdict, number>;
  for (const o of outcomes) counts[o.verdict]++;
  // the closure relates quantities; it makes no region, boundary, path or element: there is no structure to report
  return { intent: i, outcomes, counts, structure: [] };
}

/** A chain as it reads: the law and, for each input, the given (with its region) or the chain under it. */
export function showChain(s: Step): string {
  return `${s.law.id}(${s.inputs.map((x) => `${x.port} = ${x.given ? `${x.given.name} [${x.given.region}]` : x.step ? showChain(x.step) : '?'}`).join('; ')})`;
}

/** A distinction the attempt lacked, inferred from what stopped it, with the wants that showed it. */
export interface Distinction { lacks: string; because: string; wants: string[] }

const regionsOf = (s: Step): Set<string> => new Set(givensIn(s).map((g) => g.region));

/**
 * The distinctions the attempt lacked, each from a mechanical outcome: a held state that every law takes as an input
 * and none closes on; a flow or rate no law produces; chains that close by dimension alone; a law relating
 * quantities of two regions with nothing in the language between them; and no structure made at all.
 */
export function distinctions(a: Attempt): Distinction[] {
  const held = a.outcomes.filter((o) => o.consumers.length > 0 && (o.verdict === 'no law produces it' || o.verdict === 'laws produce it from what nothing gives'));
  const unproduced = a.outcomes.filter((o) => o.producers.length === 0);
  const byDimension = a.outcomes.filter((o) => o.chains.length > 0);
  const across = a.outcomes.filter((o) => o.chains.some((c) => regionsOf(c).size > 1));
  const out: Distinction[] = [
    { lacks: 'a balance: what holds a state is what crosses the region\'s boundary and what is made inside it', because: 'the wanted quantity is an input of laws and the output of none that closes', wants: held.map((o) => o.want.id) },
    { lacks: 'a flow driven across a boundary, and where it comes from', because: 'no law has the wanted flow or rate as its output', wants: unproduced.map((o) => o.want.id) },
    { lacks: 'the kind of a quantity: what is conserved, what drives it, what flows', because: 'chains close by dimension alone, and dimension cannot tell a pressure from a stress or a count from a specific gravity', wants: byDimension.map((o) => o.want.id) },
    { lacks: 'a boundary: the place where quantities of two regions meet', because: 'a law relates quantities of different regions with nothing in the language between them', wants: across.map((o) => o.want.id) },
    { lacks: 'structure: regions, boundaries and paths made by the language', because: 'the closure relates quantities and makes nothing', wants: a.structure.length ? [] : a.outcomes.map((o) => o.want.id) },
  ];
  return out.filter((d) => d.wants.length);
}
