// The configuration space of a system. A system's relations already say everything its free variables determine;
// symbolic propagation turns every bound variable into a closed term over the free ones, so each is a field over a
// domain whose coordinates are the free variables. The region where the system holds is the conjunction of its
// constraints and of every applied law's validity domain, each a predicate field over the same coordinates.
// Nothing is enumerated: an address selects a state, a lattice visits addresses, a refinement moves through the
// space, and what was visited is the history. A catalogue is not the space: it is an availability set inside it.

import type { Language } from './abduce';
import { evaluate, ofLeaf, type Derivation, type Env } from './evaluate';
import { domain, fieldOf, inside, lattice, sample, type Domain, type Field, type Interval, type Point } from './domain';
import { hashOf } from './identity';
import type { Law } from './law';
import { solve, type Option, type Solution, type System } from './solve';
import { add, div, gt, k, le, leaf, mul, substitute, variable, varsOf, type Term, type Var } from './term';

/** A part of the region: a predicate field, 1 where it holds. */
export interface RegionPart { says: string; role: 'design' | 'validity'; source: string; field: Field }

export interface Space {
  name: string;
  system: System;
  /** The free variables as coordinates. */
  over: Domain;
  /** Every variable the coordinates and the bindings determine, as a field over the coordinates. */
  fields: Record<string, Field>;
  /** The constraints and the applied laws' validity domains. */
  region: RegionPart[];
  /** Variables the space cannot express: free, and not coordinates. */
  unexpressed: string[];
  hash: string;
}

const systemContent = (s: System) => ({
  relations: s.relations.map((r) => (r.kind === 'law' ? { sym: r.sym, law: r.law.hash, args: r.args } : r.kind === 'term' ? { sym: r.sym, term: r.term.hash } : { holds: r.holds.hash, says: r.says, role: r.role })),
  bindings: Object.fromEntries(Object.entries(s.bindings).map(([sym, d]) => [sym, d.hash])),
});

/**
 * The space of `s` over the declared free variables (`coords`: each with its extent, or null for unbounded). A
 * coordinate must be a variable of the system that it does not bind; a constraint that needs a variable the
 * coordinates do not reach is refused by name: an undeclared freedom.
 */
export interface SpaceOptions {
  /** The learned language: each relation judges every coupling that has its quantities. */
  language?: Language;
  /** Each coupling's quantities, by the names the relations use, as system variables. */
  couplings?: Record<string, Record<string, string>>;
}

/**
 * The region where the language expects, decidedly, what the system claims: every promoted relation was learned
 * from failures of a derivation that claimed its outcome 1 (rests, holds, keeps its energy), so a configuration is
 * inside only where the relation's group lies beyond the bound's uncertainty on the side of 1. Inside the
 * uncertainty the observations do not decide it, and an undecided address is not admitted.
 */
function languageParts(language: Language, couplings: Record<string, Record<string, string>>, expr: Record<string, Term>, laws: Record<string, string[]>, part: (says: string, role: RegionPart['role'], source: string, holds: Term, cites: string[], env?: Env) => void): void {
  for (const r of language.all()) for (const [coupling, q] of Object.entries(couplings)) {
    const names = Object.keys(r.group.exponents);
    if (!names.every((n) => q[n])) continue;
    for (const n of names) if (!expr[q[n]!]) throw new Error(`${coupling}: the relation "${r.name}" needs ${n} (${q[n]}), which the coordinates do not reach: an undeclared freedom`);
    const group = substitute(r.group.term, Object.fromEntries(names.map((n) => [n, expr[q[n]!]!])));
    const b = r.bound.value!, u = r.bound.uncertainty ?? 0;
    const edge = ofLeaf(leaf(`${r.name}: the bound's decided edge, the nearest observation of the outcome 1`, r.above === 1 ? b + u : b - u, '1', { class: 'measured', source: r.provenance }));
    const E = variable('edge', '1', 'the decided edge');
    const holds = r.above === 1 ? gt(group, E) : le(group, E);
    part(`${coupling}: ${r.name} (decided by the language ${language.hash})`, 'validity', r.hash, holds, [...new Set([r.hash, ...names.flatMap((n) => laws[q[n]!] ?? [])])], { edge });
  }
}

export function spaceOf(s: System, coords: Record<string, Interval | null>, opts: SpaceOptions = {}, name = s.name): Space {
  const vars = Object.fromEntries(s.vars.map((v) => [v.sym, v]));
  const cv: Record<string, Var> = {};
  const extent: Record<string, Interval> = {};
  for (const [sym, iv] of Object.entries(coords)) {
    const v = vars[sym];
    if (!v) throw new Error(`${name}: ${sym} is not a variable of the system`);
    if (s.bindings[sym]) throw new Error(`${name}: ${sym} is bound, not free`);
    cv[sym] = variable(sym, v.unit, v.name);
    if (iv) extent[sym] = iv;
  }
  const over = domain(null, cv, extent);
  const expr: Record<string, Term> = {}, laws: Record<string, string[]> = {};
  const env: Record<string, Derivation> = {};
  for (const [sym, d] of Object.entries(s.bindings)) { expr[sym] = variable(sym, vars[sym]!.unit, vars[sym]!.name); env[sym] = d; laws[sym] = []; }
  for (const [sym, v] of Object.entries(cv)) { expr[sym] = v; laws[sym] = []; }
  const region: RegionPart[] = [];
  const envOf = (t: Term, extra: Env = {}): Env => Object.fromEntries(varsOf(t).filter((v) => !cv[v.sym]).map((v) => [v.sym, extra[v.sym] ?? env[v.sym]!]));
  const part = (says: string, role: RegionPart['role'], source: string, holds: Term, cites: string[], extra: Env = {}) => region.push({ says, role, source, field: fieldOf(says, '1', over, holds, envOf(holds, extra), cites) });
  const pending = s.relations.filter((r) => r.kind !== 'constrain') as Exclude<System['relations'][number], { kind: 'constrain' }>[];
  let progress = true;
  while (progress) {
    progress = false;
    for (const r of [...pending]) {
      if (r.kind === 'law') {
        for (const p of r.law.inputs) if (!(p.sym in r.args)) throw new Error(`${name}: ${r.law.id} has its input ${p.sym} unmapped`);
        const args = Object.values(r.args);
        if (!args.every((a) => expr[a])) continue;
        const by = Object.fromEntries(Object.entries(r.args).map(([ls, ss]) => [ls, expr[ss]!]));
        const cites = [...new Set([r.law.hash, ...args.flatMap((a) => laws[a]!)])];
        if (!expr[r.sym]) { expr[r.sym] = substitute(r.law.term, by); laws[r.sym] = cites; }
        for (const dc of r.law.domain) part(`${r.law.id}: ${dc.says}`, 'validity', r.law.id, substitute(dc.holds, by), cites);
      } else {
        const args = varsOf(r.term).map((v) => v.sym);
        if (!args.every((a) => expr[a])) continue;
        if (!expr[r.sym]) { expr[r.sym] = substitute(r.term, Object.fromEntries(args.map((a) => [a, expr[a]!]))); laws[r.sym] = [...new Set(args.flatMap((a) => laws[a]!))]; }
      }
      pending.splice(pending.indexOf(r), 1);
      progress = true;
    }
  }
  for (const r of s.relations) {
    if (r.kind !== 'constrain') continue;
    const need = varsOf(r.holds).map((v) => v.sym).filter((a) => !expr[a]);
    if (need.length) throw new Error(`${name}: the constraint "${r.says}" needs ${need.join(', ')}, which the coordinates do not reach: an undeclared freedom`);
    const holds = substitute(r.holds, Object.fromEntries(varsOf(r.holds).map((v) => [v.sym, expr[v.sym]!])));
    part(r.says, r.role, r.source, holds, [...new Set(varsOf(r.holds).flatMap((v) => laws[v.sym]!))]);
  }
  if (opts.language) languageParts(opts.language, opts.couplings ?? {}, expr, laws, part);
  const fields: Record<string, Field> = {};
  for (const [sym, t] of Object.entries(expr)) if (!s.bindings[sym] && !cv[sym]) fields[sym] = fieldOf(vars[sym]!.name, vars[sym]!.unit, over, t, envOf(t), laws[sym]!);
  const unexpressed = s.vars.map((v) => v.sym).filter((sym) => !expr[sym]);
  return { name, system: s, over, fields, region, unexpressed, hash: hashOf({ space: true, system: systemContent(s), over: over.hash, language: opts.language?.hash ?? null, couplings: opts.couplings ?? null }) };
}

/** A preference as a field over the space: its inputs are system variables the space expresses. */
export function preferenceField(space: Space, p: Law): Field {
  const by: Record<string, Term> = {};
  for (const port of p.inputs) {
    const f = space.fields[port.sym];
    const c = space.over.coords[port.sym];
    if (!f && !c) throw new Error(`${space.name}: the preference ${p.id} needs ${port.sym}, which the space does not express`);
    by[port.sym] = f ? f.term : c!;
  }
  const term = substitute(p.term, by);
  const env: Record<string, Derivation> = {};
  for (const v of varsOf(term)) if (!space.over.coords[v.sym]) env[v.sym] = space.system.bindings[v.sym]!;
  return fieldOf(p.output.name, p.output.unit, space.over, term, env, [p.hash]);
}

export interface Address {
  at: Point;
  /** Every part of the region at the address, as a record. */
  region: { says: string; role: RegionPart['role']; holds: Derivation }[];
  preferences: Derivation[];
  /** Every part holds and every preference has a value; null when one cannot be decided. */
  admissible: boolean | null;
  failing: string[];
}

/** The space at an address: the region and the preferences, each a sample of its field. */
export function evaluateAt(space: Space, at: Point, prefs: Field[]): Address {
  const region = space.region.map((p) => ({ says: p.says, role: p.role, holds: sample(p.field, at, p.says) }));
  const preferences = prefs.map((f) => sample(f, at, f.name));
  const undecided = region.some((r) => r.holds.value === null) || preferences.some((p) => p.value === null);
  const failing = region.filter((r) => r.holds.value === 0).map((r) => r.says);
  return { at, region, preferences, admissible: failing.length ? false : undecided ? null : true, failing };
}

/** The system solved at an address: the fine-grained records, every intermediate its own record. */
export const solveAt = (space: Space, at: Point): Solution => solve({ ...space.system, bindings: { ...space.system.bindings, ...at } });

const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
/** Lexicographic: negative when a is preferred. */
const order = (a: Address, b: Address): number => {
  for (let i = 0; i < a.preferences.length; i++) {
    const x = a.preferences[i]!.value!, y = b.preferences[i]!.value!;
    if (!near(x, y)) return x - y;
  }
  return 0;
};

export interface Selection {
  /** Every address visited, in order: the history of the search. */
  visited: Address[];
  /** The admissible addresses among those visited. */
  admissible: Address[];
  pick: Address | null;
  tie: Address[];
}

function select(visited: Address[]): Selection {
  const admissible = visited.filter((a) => a.admissible === true);
  if (!admissible.length) return { visited, admissible, pick: null, tie: [] };
  const best = admissible.reduce((p, a) => (order(a, p) < 0 ? a : p));
  const tie = admissible.filter((a) => order(a, best) === 0);
  return tie.length === 1 ? { visited, admissible, pick: best, tie: [] } : { visited, admissible, pick: null, tie };
}

/** The least admissible of an availability set (a catalogue's options are addresses in the space). */
export function among(space: Space, prefs: Law[], options: Option[]): Selection & { labels: string[] } {
  const pf = prefs.map((p) => preferenceField(space, p));
  const visited = options.map((o) => evaluateAt(space, Object.fromEntries(Object.entries(o.leaves).map(([sym, l]) => [sym, 'kind' in l && l.kind === 'leaf' ? ofLeaf(l) : (l as Derivation)])), pf));
  return { ...select(visited), labels: options.map((o) => o.label) };
}

export interface Derived extends Selection {
  /** The spacing the search ended at: the resolution of its claim to be least. */
  spacing: Record<string, Derivation>;
  /** The record of the choice: the first preference at the pick, citing the space and the search. */
  why: Derivation | null;
  /** The fine-grained solution at the pick. */
  solution: Solution | null;
}

/**
 * A configuration derived from the space, not listed: the space's lattice at `spacing` over its bounded coordinates,
 * then a pattern search around the least admissible address, halving the step until it is no larger than
 * `resolution`. The claim is local and at the resolution: no address one final step away (along a coordinate or a
 * diagonal) is admissible and preferred. Every visited address is kept; every coordinate of the pick is a record
 * from the lattice's start and the steps taken.
 */
export function derive(space: Space, prefs: Law[], spacing: Record<string, Derivation>, resolution: Record<string, Derivation>): Derived {
  const pf = prefs.map((p) => preferenceField(space, p));
  const visited: Address[] = lattice(space.over, spacing).map((at) => evaluateAt(space, at, pf));
  let best = select(visited).pick ?? select(visited).tie[0] ?? null;
  const step: Record<string, Derivation> = { ...spacing };
  const syms = Object.keys(spacing);
  const halve = () => { for (const sym of syms) step[sym] = evaluate(`step on ${sym}, halved`, div(variable('h', space.over.coords[sym]!.unit), k(2)), { h: step[sym]! }, { unit: space.over.coords[sym]!.unit, law: `space ${space.hash}: the pattern search halves its step` }); };
  const done = () => syms.every((sym) => step[sym]!.value! <= resolution[sym]!.value! * (1 + 1e-12));
  while (best && !done()) {
    halve();
    let moved = true;
    while (moved) {
      moved = false;
      const around: Address[] = [];
      for (const offs of neighbours(syms.length)) {
        const at: Point = { ...best.at };
        for (let i = 0; i < syms.length; i++) {
          const sym = syms[i]!, o = offs[i]!;
          if (o === 0) continue;
          const v = space.over.coords[sym]!;
          at[sym] = evaluate(`${sym}, a step ${o > 0 ? 'up' : 'down'}`, add(variable('p', v.unit), mul(k(o), variable('h', v.unit, 'step'))), { p: best.at[sym]!, h: step[sym]! }, { unit: v.unit, law: `space ${space.hash}: the pattern search around the least admissible address` });
        }
        if (inside(space.over, at).value !== 1) continue;
        const a = evaluateAt(space, at, pf);
        visited.push(a);
        around.push(a);
      }
      const better = around.filter((a) => a.admissible === true && order(a, best!) < 0);
      if (better.length) { best = better.reduce((p, a) => (order(a, p) < 0 ? a : p)); moved = true; }
    }
  }
  const sel = select(visited);
  const pick = best;
  const why = pick ? evaluate(`${pf[0]!.name} at the derived address`, variable('p', pf[0]!.unit), { p: pick.preferences[0]! }, { unit: pf[0]!.unit, law: `space ${space.hash}: least admissible on the lattice at ${syms.map((s) => `${s} ${spacing[s]!.value}`).join(', ')}, refined to ${syms.map((s) => `${s} ${step[s]!.value}`).join(', ')}`, also: [...prefs.map((p) => p.hash)] }) : null;
  return { ...sel, pick, tie: [], spacing: step, why, solution: pick ? solveAt(space, pick.at) : null };
}

/** The offsets of a pattern search in n coordinates: every combination of −1, 0, 1 but the centre. */
function neighbours(n: number): number[][] {
  let out: number[][] = [[]];
  for (let i = 0; i < n; i++) out = out.flatMap((o) => [-1, 0, 1].map((x) => [...o, x]));
  return out.filter((o) => o.some((x) => x !== 0));
}

/** An address as an option: its coordinates are the derivation's records, so the option's lineage is the search. */
export const asOption = (label: string, at: Point): Option => ({ label, leaves: at });
