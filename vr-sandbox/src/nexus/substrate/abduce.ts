// Abduction at the type level. When observations disagree with the derivation, the missing distinction is
// searched for over types: the dimensionless groups of the quantities the failing coupling and window carry
// (Buckingham: found from dimensions alone), each tried as the observable that separates the observations that
// behaved one way from those that behaved the other. A candidate is stated over quantity types, never an
// instance; its generality is the count of systems it changes; it is validated on held-out observations and
// promoted with provenance "abduced from observations h1…hn". Nothing here holds a vocabulary of hypotheses.

import { dimText, isDimless, type Dim } from './dimension';
import { evaluate, ofLeaf, unresolved, type Derivation } from './evaluate';
import { hashOf } from './identity';
import { app, k, leaf, variable, type Term } from './term';

/** One observation: the quantities a coupling and its window carry, and what was observed of it (1 or 0). */
export interface Observation {
  /** Which system (its hash) and coupling the quantities belong to. */
  system: string;
  coupling: string;
  quantities: Record<string, Derivation>;
  /** The observed binary outcome (the realization's measurement) and the derivation it disagreed with. */
  observed: Derivation;
  derived: Derivation;
  /** The observation's identity: the system, the coupling, the quantities' records, the observed and the derived. Two observations of one outcome in two systems are two observations. */
  hash: string;
}

/** An observation with its identity. */
export function observation(o: Omit<Observation, 'hash'>): Observation {
  const quantities = Object.fromEntries(Object.entries(o.quantities).map(([s, d]) => [s, d.hash]));
  return { ...o, hash: hashOf({ observation: true, system: o.system, coupling: o.coupling, quantities, observed: o.observed.hash, derived: o.derived.hash }) };
}

/** A dimensionless group over named quantities: integer exponents. */
export interface Group { exponents: Record<string, number>; term: Term; text: string; hash: string }

/**
 * Every dimensionless group with small integer exponents over the quantity types, found from their dimensions
 * alone: every exponent vector with entries in [−maxExponent, maxExponent] whose dimensions cancel, a group and its
 * inverse counted once. Basis-free, so nothing depends on which null-space basis an elimination happened to pick.
 */
export function groups(quantities: Record<string, Dim>, maxExponent = 2): Group[] {
  const names = Object.keys(quantities);
  const dims = names.map((n) => quantities[n]!);
  const out = new Map<string, Group>();
  const e = new Array<number>(names.length).fill(-maxExponent);
  const total = (2 * maxExponent + 1) ** names.length;
  for (let i = 0; i < total; i++) {
    let v = i;
    for (let j = 0; j < names.length; j++) { e[j] = (v % (2 * maxExponent + 1)) - maxExponent; v = Math.floor(v / (2 * maxExponent + 1)); }
    if (e.every((x) => x === 0)) continue;
    const first = e.find((x) => x !== 0)!;
    if (first < 0) continue; // the inverse is the same group
    let dimless = true;
    for (let r = 0; r < 5 && dimless; r++) { let sum = 0; for (let j = 0; j < names.length; j++) sum += e[j]! * dims[j]![r]!; if (Math.abs(sum) > 1e-9) dimless = false; }
    if (!dimless) continue;
    const exponents = Object.fromEntries(names.map((n, j) => [n, e[j]!]).filter(([, x]) => x !== 0)) as Record<string, number>;
    let term: Term | null = null;
    for (const [n, x] of Object.entries(exponents)) { const vv = variable(n, dimUnit(quantities[n]!), n); const f = x === 1 ? vv : app('pow', [vv], x); term = term ? app('mul', [term, f]) : f; }
    if (!term || !isDimless(term.dim)) continue;
    const text = Object.entries(exponents).map(([n, x]) => (x === 1 ? n : `${n}^${x}`)).join(' · ');
    const g: Group = { exponents, term, text, hash: hashOf({ group: exponents }) };
    out.set(g.hash, g);
  }
  return [...out.values()].sort((a, b) => complexity(a) - complexity(b) || (a.text < b.text ? -1 : 1));
}

const complexity = (g: Group) => Object.values(g.exponents).reduce((s, x) => s + Math.abs(x), 0);

/** A unit string in base units for a dimension, to make variables of that dimension. */
function dimUnit(d: Dim): string {
  const t = dimText(d);
  return t === '1' ? '1' : t;
}

export interface Candidate {
  group: Group;
  /** The group's value on every observation, with the outcome. */
  values: { observation: Observation; value: Derivation; outcome: number }[];
  /** Whether a threshold separates the outcomes: every 1 on one side of every 0. */
  separates: boolean;
  /** The interval the threshold lies in, when it separates: between the classes' nearest values. */
  threshold: { lo: number; hi: number; above: number } | null;
  /** How many distinct systems the group applies to. */
  generality: number;
  level: 'coupling and window';
  hash: string;
}

/** The candidate distinctions: every group over the shared quantity types, judged against every observation. */
export function candidates(observations: Observation[]): Candidate[] {
  if (!observations.length) return [];
  const names = Object.keys(observations[0]!.quantities).filter((n) => observations.every((o) => o.quantities[n]));
  const dims = Object.fromEntries(names.map((n) => [n, observations[0]!.quantities[n]!.dim]));
  const out: Candidate[] = [];
  for (const g of groups(dims)) {
    const values = observations.map((o) => {
      const env = Object.fromEntries(names.map((n) => [n, o.quantities[n]!]));
      const value = evaluate(`${g.text} of ${o.coupling}`, g.term, env, { unit: '1', law: `candidate group ${g.hash}` });
      return { observation: o, value, outcome: o.observed.value ?? NaN };
    });
    if (values.some((v) => v.value.value === null || !Number.isFinite(v.outcome))) continue;
    const ones = values.filter((v) => v.outcome === 1).map((v) => v.value.value!), zeros = values.filter((v) => v.outcome === 0).map((v) => v.value.value!);
    let separates = false, threshold: Candidate['threshold'] = null;
    if (ones.length && zeros.length) {
      if (Math.max(...ones) < Math.min(...zeros)) { separates = true; threshold = { lo: Math.max(...ones), hi: Math.min(...zeros), above: 0 }; }
      else if (Math.max(...zeros) < Math.min(...ones)) { separates = true; threshold = { lo: Math.max(...zeros), hi: Math.min(...ones), above: 1 }; }
    }
    const generality = new Set(observations.map((o) => o.system)).size;
    out.push({ group: g, values, separates, threshold, generality, level: 'coupling and window', hash: hashOf({ candidate: g.hash, observations: observations.map((o) => o.hash) }) });
  }
  return out;
}

/** What would tell two separating candidates apart: the quantities whose exponents differ, to be varied by the next observation. */
export function discriminates(a: Candidate, b: Candidate): string[] {
  const names = new Set([...Object.keys(a.group.exponents), ...Object.keys(b.group.exponents)]);
  return [...names].filter((n) => (a.group.exponents[n] ?? 0) !== (b.group.exponents[n] ?? 0));
}

/**
 * Held-out validation. The bound refit without each observation is an interval between the classes; the relation
 * predicts an outcome only outside that interval and says nothing inside it. A definite prediction that is wrong
 * fails the candidate; a held-out observation inside the gap is undecided, not a failure.
 */
export function validate(c: Candidate): { holds: boolean; predicted: number; undecided: number; failed: Observation[] } {
  const failed: Observation[] = [];
  let predicted = 0, undecided = 0;
  for (const held of c.values) {
    const rest = c.values.filter((v) => v !== held);
    const ones = rest.filter((v) => v.outcome === 1).map((v) => v.value.value!), zeros = rest.filter((v) => v.outcome === 0).map((v) => v.value.value!);
    if (!ones.length || !zeros.length) { undecided++; continue; }
    const x = held.value.value!;
    const sep = Math.max(...ones) < Math.min(...zeros) ? { lo: Math.max(...ones), hi: Math.min(...zeros), above: 0 } : Math.max(...zeros) < Math.min(...ones) ? { lo: Math.max(...zeros), hi: Math.min(...ones), above: 1 } : null;
    if (!sep) { failed.push(held.observation); continue; }
    if (x > sep.lo && x < sep.hi) { undecided++; continue; }
    const p = x >= sep.hi ? sep.above : 1 - sep.above;
    predicted++;
    if (p !== held.outcome) failed.push(held.observation);
  }
  return { holds: failed.length === 0 && predicted > 0, predicted, undecided, failed };
}

/** A promoted distinction: a relation over quantity types with the bound measured from the observations. */
export interface Relation {
  name: string;
  group: Group;
  /** The bound as a measured interval: its midpoint, uncertain by half the gap between the classes. */
  bound: Derivation;
  /** 1 when the outcome is observed above the bound. */
  above: number;
  /** The predicate over the quantities: holds when the outcome 1 is expected. */
  holds: Term;
  provenance: string;
  observations: string[];
  generality: number;
  hash: string;
}

/** Promote a validated candidate that changes more than one system; an instance-level candidate is refused. */
export function promote(c: Candidate, name: string): Relation {
  if (!c.separates || !c.threshold) throw new Error(`${name}: a candidate that does not separate the observations is not promoted`);
  if (c.generality < 2) throw new Error(`${name}: a candidate that changes one system is a special case, not a language change`);
  const v = validate(c);
  if (!v.holds) throw new Error(`${name}: the candidate ${v.predicted ? `fails on held-out observations: ${v.failed.map((o) => o.coupling).join(', ')}` : 'predicts no held-out observation'}`);
  const { lo, hi, above } = c.threshold;
  const observations = c.values.map((x) => x.observation.hash);
  const provenance = `abduced from observations ${observations.join(', ')}`;
  const bound = ofLeaf(leaf(`${name}: bound, between the classes' nearest values ${lo} and ${hi}`, (lo + hi) / 2, '1', { class: 'measured', source: provenance }, (hi - lo) / 2));
  const b = variable('bound', '1', 'bound');
  const holds = above === 1 ? app('gt', [c.group.term, b]) : app('le', [c.group.term, b]);
  return { name, group: c.group, bound, above, holds, provenance, observations, generality: c.generality, hash: hashOf({ relation: c.group.hash, bound: bound.hash, above, observations }) };
}

/** A judgement of one coupling by one relation. */
export interface Judgement { relation: Relation; holds: Derivation }

/** The language: promoted relations, append-only; its hash is the content of what it holds, so every judgement made under it can be found stale when it grows. */
export class Language {
  private readonly relations: Relation[] = [];
  /** Supersessions, appended: a relation an observation contradicted, and the relation abduced over all observations that replaces it. */
  private readonly supersessions: { old: string; by: string; because: string }[] = [];
  add(r: Relation): Relation { if (this.relations.some((x) => x.hash === r.hash)) return r; this.relations.push(r); return r; }
  /** The relations in force: every one added and not superseded. */
  all(): readonly Relation[] { const gone = new Set(this.supersessions.map((s) => s.old)); return this.relations.filter((r) => !gone.has(r.hash)); }
  /** Everything ever added, in order, and every supersession: nothing is removed. */
  history(): { relations: readonly Relation[]; supersessions: readonly { old: string; by: string; because: string }[] } { return { relations: this.relations, supersessions: this.supersessions }; }
  /** `old` was contradicted by an observation; `by`, abduced over every observation including that one, replaces it. */
  supersede(old: Relation, by: Relation, because: string): Relation {
    if (!this.relations.some((x) => x.hash === old.hash)) throw new Error(`supersede: ${old.name} is not in the language`);
    this.add(by);
    if (old.hash !== by.hash) this.supersessions.push({ old: old.hash, by: by.hash, because });
    return by;
  }
  get hash(): string { return hashOf({ language: this.relations.map((r) => r.hash), supersessions: this.supersessions }); }
  /**
   * Whether the quantities of a coupling satisfy every promoted relation: each a record, 1 when the outcome is
   * expected, 0 when not, unresolved when the group lies inside the bound's uncertainty.
   */
  judge(quantities: Record<string, Derivation>): Judgement[] {
    const language = this.hash;
    // only the relations in force judge: a superseded one was contradicted, and its replacement speaks instead
    return this.all().filter((r) => Object.keys(r.group.exponents).every((n) => quantities[n])).map((r) => {
      const env = Object.fromEntries(Object.keys(r.group.exponents).map((n) => [n, quantities[n]!]));
      const g = evaluate(`${r.group.text}`, r.group.term, env, { unit: '1', law: `group ${r.group.hash}` });
      const b = r.bound.value!, u = r.bound.uncertainty ?? 0;
      if (g.value !== null && g.value > b - u && g.value < b + u) return { relation: r, holds: unresolved(r.name, r.holds, { ...env, bound: r.bound }, `${r.group.text} = ${g.value} lies inside the bound's uncertainty ${b} ± ${u}: the observations do not decide it`) };
      return { relation: r, holds: evaluate(r.name, r.holds, { ...env, bound: r.bound }, { unit: '1', law: r.hash, also: [language] }) };
    });
  }
}

export const one = () => k(1);
