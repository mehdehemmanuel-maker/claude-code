// Constraint systems and the solver. Variables, relations that bind a variable by a law or a definition, and
// constrain terms (design and validity). Propagation binds what the bindings determine; what they do not determine
// is reported free, with what would bind it; two bindings that disagree are a contradiction. There is no rule
// here that gives a free variable a value. A search over declared options (a catalogue) with a declared preference
// is the only way a free variable is filled, and it is reported as that choice.

import { contradiction, evaluate, type Derivation } from './evaluate';
import { apply, type Law } from './law';
import { ofLeaf } from './evaluate';
import { substitute, variable, varsOf, type Leaf, type Term } from './term';

export interface Variable { sym: string; unit: string; name: string }

export type Relation =
  /** `sym` is the law applied to system variables (`args`: law input symbol → system symbol). */
  | { kind: 'law'; sym: string; law: Law; args: Record<string, string> }
  /** `sym` is a term over system variables: a definition, with its grounds. */
  | { kind: 'term'; sym: string; term: Term; name: string; grounds: string }
  /** A predicate over system variables that must hold: a design limit, or a law's validity. */
  | { kind: 'constrain'; holds: Term; says: string; role: 'design' | 'validity'; source: string };

export interface System {
  name: string;
  vars: Variable[];
  relations: Relation[];
  /** What is known going in: given, measured, assumed, configuration leaves as records. */
  bindings: Record<string, Derivation>;
}

export interface FreeVariable { sym: string; name: string; unit: string; wouldBind: { by: string; waitingOn: string[] }[] }
export interface Constraint { says: string; role: 'design' | 'validity'; source: string; holds: boolean | null; record: Derivation }

export interface Solution {
  bound: Record<string, Derivation>;
  free: FreeVariable[];
  contradictions: { sym: string; record: Derivation }[];
  constraints: Constraint[];
  /** Every constraint holds (true), one fails (false), or one cannot be decided (null). */
  satisfied: boolean | null;
}

const varOf = (s: System, sym: string) => {
  const v = s.vars.find((x) => x.sym === sym);
  if (!v) throw new Error(`${s.name}: ${sym} is not a variable of the system`);
  return v;
};

/** The system's variables as term variables, for writing terms over them. */
export const termVars = (s: System): Record<string, ReturnType<typeof variable>> => Object.fromEntries(s.vars.map((v) => [v.sym, variable(v.sym, v.unit, v.name)]));

const relationName = (r: Relation) => (r.kind === 'law' ? r.law.id : r.kind === 'term' ? r.name : r.says);

export function solve(s: System): Solution {
  const bound: Record<string, Derivation> = { ...s.bindings };
  for (const sym of Object.keys(bound)) varOf(s, sym);
  const producer = new Map<string, Relation>();
  const contradictions: Solution['contradictions'] = [];
  const binders = s.relations.filter((r): r is Exclude<Relation, { kind: 'constrain' }> => r.kind !== 'constrain');
  const argsOf = (r: Exclude<Relation, { kind: 'constrain' }>): string[] => (r.kind === 'law' ? Object.values(r.args) : Array.from(new Set(termVarsOf(r.term))));
  const produce = (r: Exclude<Relation, { kind: 'constrain' }>): Derivation => {
    const v = varOf(s, r.sym);
    if (r.kind === 'law') {
      const env: Record<string, Derivation> = {};
      for (const [lawSym, sysSym] of Object.entries(r.args)) env[lawSym] = bound[sysSym]!;
      return apply(r.law, env, v.name);
    }
    const env: Record<string, Derivation> = {};
    for (const sym of argsOf(r)) env[sym] = bound[sym]!;
    return evaluate(v.name, r.term, env, { law: r.term.hash, unit: v.unit });
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of binders) {
      if (producer.get(r.sym) === r) continue;
      if (!argsOf(r).every((a) => bound[a])) continue;
      const d = produce(r);
      const had = bound[r.sym];
      if (had) {
        if (producer.has(r.sym) && producer.get(r.sym) === r) continue;
        // a second evidence for a bound variable: agree within tolerance or contradict
        if (had.value !== null && d.value !== null) {
          const tol = Math.max(had.uncertainty ?? 0, d.uncertainty ?? 0, 1e-9 * Math.max(Math.abs(had.value), Math.abs(d.value)));
          if (Math.abs(had.value - d.value) > tol) { const c = contradiction(varOf(s, r.sym).name, had, d); bound[r.sym] = c; contradictions.push({ sym: r.sym, record: c }); }
        }
        producer.set(r.sym, r);
        continue;
      }
      bound[r.sym] = d;
      producer.set(r.sym, r);
      changed = true;
    }
  }
  const free: FreeVariable[] = s.vars.filter((v) => !bound[v.sym]).map((v) => ({
    sym: v.sym, name: v.name, unit: v.unit,
    wouldBind: binders.filter((r) => r.sym === v.sym).map((r) => ({ by: relationName(r), waitingOn: argsOf(r).filter((a) => !bound[a]) })),
  }));
  const constraints: Constraint[] = [];
  for (const r of s.relations) {
    if (r.kind !== 'constrain') continue;
    const syms = Array.from(new Set(termVarsOf(r.holds)));
    const env: Record<string, Derivation> = {};
    let decidable = true;
    for (const sym of syms) { const d = bound[sym]; if (!d || d.value === null) { decidable = false; } else env[sym] = d; }
    if (!decidable) {
      const partial = Object.fromEntries(syms.map((sym) => [sym, bound[sym] ?? ofLeaf(unknownLeaf(varOf(s, sym)))]));
      constraints.push({ says: r.says, role: r.role, source: r.source, holds: null, record: evaluate(r.says, r.holds, partial, { law: r.holds.hash, unit: '1' }) });
      continue;
    }
    const d = evaluate(r.says, r.holds, env, { law: r.holds.hash, unit: '1' });
    constraints.push({ says: r.says, role: r.role, source: r.source, holds: d.value === null ? null : d.value !== 0, record: d });
  }
  const satisfied = constraints.some((c) => c.holds === false) ? false : constraints.some((c) => c.holds === null) ? null : true;
  return { bound, free, contradictions, constraints, satisfied };
}

const termVarsOf = (t: Term, out: string[] = []): string[] => { for (const v of varsOf(t)) out.push(v.sym); return out; };

const unknownLeaf = (v: Variable): Leaf => ({ kind: 'leaf', name: v.name, value: null, dim: variable(v.sym, v.unit).dim, unit: v.unit, origin: { class: 'unknown' }, hash: `unknown:${v.sym}` });

// ---- search: declared options, a declared preference, the choice reported --------------------------------------

/** One way to fill some free variables: leaves from a catalogue or a configuration, with their source. */
export interface Option { label: string; leaves: Record<string, Leaf> }

export interface Candidate {
  option: Option;
  solution: Solution;
  /** The first preference evaluated on this candidate, when its inputs are bound. */
  preference: Derivation | null;
  /** Every preference, in order: the least first one wins, the next breaks its ties. */
  preferences: Derivation[];
  /** Every constraint holds. */
  admissible: boolean;
  refused: string[];
  unsatisfied: string[];
  undecided: string[];
}

export interface Choice {
  candidates: Candidate[];
  /** The admissible candidates: the set the constraints allow. */
  manifold: Candidate[];
  /** The one the preference picks, or null: none admissible, or a tie the preference cannot break. */
  pick: Candidate | null;
  tie: Candidate[];
  /** The record of the choice: the preference's value on the pick, citing the preference's declaration. */
  why: Derivation | null;
}

/**
 * `preference`: law-shaped declarations (each source says who prefers it and why), terms over system variables; the
 * least value of the first wins, the next breaks its ties, and what no preference separates is a tie, reported.
 */
export function search(s: System, options: Option[], preference: Law | Law[]): Choice {
  const prefs = Array.isArray(preference) ? preference : [preference];
  const candidates: Candidate[] = options.map((option) => {
    const bindings = { ...s.bindings };
    for (const [sym, l] of Object.entries(option.leaves)) { varOf(s, sym); bindings[sym] = ofLeaf(l); }
    const solution = solve({ ...s, bindings });
    const refused = solution.constraints.filter((c) => c.role === 'validity' && c.holds === false).map((c) => c.says);
    const unsatisfied = solution.constraints.filter((c) => c.role === 'design' && c.holds === false).map((c) => c.says);
    const undecided = solution.constraints.filter((c) => c.holds === null).map((c) => c.says);
    const outside = Array.from(new Set(Object.values(solution.bound).filter((d) => d.refusal).map((d) => d.refusal!.domain)));
    const preferences: Derivation[] = [];
    let ok = true;
    for (const pr of prefs) {
      const env: Record<string, Derivation> = {};
      for (const p of pr.inputs) { const d = solution.bound[p.sym]; if (!d || d.value === null) ok = false; else env[p.sym] = d; }
      if (ok) preferences.push(apply(pr, env, pr.output.name));
    }
    const pref = ok ? preferences[0]! : null;
    return { option, solution, preference: pref, preferences: ok ? preferences : [], admissible: solution.satisfied === true && outside.length === 0 && pref !== null, refused: [...refused, ...outside], unsatisfied, undecided };
  });
  const manifold = candidates.filter((c) => c.admissible);
  let pick: Candidate | null = null;
  const tie: Candidate[] = [];
  if (manifold.length) {
    const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    let ties = [...manifold];
    for (let i = 0; i < prefs.length && ties.length > 1; i++) {
      const least = Math.min(...ties.map((c) => c.preferences[i]!.value!));
      ties = ties.filter((c) => near(c.preferences[i]!.value!, least));
    }
    if (ties.length === 1) pick = ties[0]!; else tie.push(...ties);
  }
  return { candidates, manifold, pick, tie, why: pick?.preference ?? null };
}

/** A term over the system's variables substituted with another system's variables of the same symbols: a helper for writing constraints. */
export const over = (t: Term, vars: Record<string, Term>) => substitute(t, vars);
