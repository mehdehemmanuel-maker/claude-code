// A law as a term, not a closure: its content as a structure of Nex (an `apply` of an operation to operands, down to
// the quantities it relates and the numbers in it), so that what the law is can be compared, generalised, shared and
// cited by hash like anything else she holds. `eval` becomes the realisation of the term (evalTerm), and the term must
// reproduce the law's worked example or it is not the law (tests/unit/terms.test.ts). This is the representation the
// topology document asked for (docs/NEX-TOPOLOGY.md §13.1): with it, anti-unification sees inside a law.
//
// Anti-unification (lgg) is the generalisation: the least general structure two terms are both instances of, with a
// variable wherever they differ (the same pair of sub-terms gets the same variable). A shape that two laws share is a
// structure above both; shapes of shapes give the order its depth, and nothing in it is declared.

import { d, hash, q, r, type Q, type R, type Structure } from './core';
import { text } from './text';
import { LAWS, lawById, withConstants } from '../laws';
import type { Law } from '../types';

// ---- building terms ------------------------------------------------------------------------------------------------

export const num = (v: number): Q => q(v, '');
export const sym = (name: string) => d(name);
const app = (op: string, ...args: Structure[]): R => r('apply', [d(`op:${op}`), ...args], {});
export const add = (...a: Structure[]) => app('add', ...a);
export const sub = (a: Structure, b: Structure) => app('sub', a, b);
export const mul = (...a: Structure[]) => app('mul', ...a);
export const div = (a: Structure, b: Structure) => app('div', a, b);
export const pow = (a: Structure, b: Structure) => app('pow', a, b);
export const neg = (a: Structure) => app('neg', a);
export const exp = (a: Structure) => app('exp', a);
export const ln = (a: Structure) => app('ln', a);
export const sqrt = (a: Structure) => app('sqrt', a);
export const cbrt = (a: Structure) => app('cbrt', a);
export const min = (a: Structure, b: Structure) => app('min', a, b);
export const max = (a: Structure, b: Structure) => app('max', a, b);
export const PI = num(Math.PI);
export const LN2 = num(Math.LN2);

/** The operation an apply names, or null for any other structure. */
export const opOf = (s: Structure): string | null => (s.k === 'R' && s.op === 'apply' && s.args[0]?.k === 'D' && s.args[0].id.startsWith('op:') ? s.args[0].id.slice(3) : null);

/** The realisation of a term: its value with the symbols bound. */
export function evalTerm(s: Structure, env: Record<string, number>): number {
  switch (s.k) {
    case 'Q': return s.v;
    case 'D': { if (s.id.startsWith('$')) throw new Error(`unbound variable ${s.id}`); const v = env[s.id]; if (v === undefined) throw new Error(`no value for ${s.id}`); return v; }
    case 'R': {
      const op = opOf(s);
      if (!op) throw new Error(`not a term: ${s.op}`);
      const a = s.args.slice(1).map((x) => evalTerm(x, env));
      switch (op) {
        case 'add': return a.reduce((t, x) => t + x, 0);
        case 'sub': return a[0]! - a[1]!;
        case 'mul': return a.reduce((t, x) => t * x, 1);
        case 'div': return a[0]! / a[1]!;
        case 'pow': return a[0]! ** a[1]!;
        case 'neg': return -a[0]!;
        case 'exp': return Math.exp(a[0]!);
        case 'ln': return Math.log(a[0]!);
        case 'sqrt': return Math.sqrt(a[0]!);
        case 'cbrt': return Math.cbrt(a[0]!);
        case 'min': return Math.min(a[0]!, a[1]!);
        case 'max': return Math.max(a[0]!, a[1]!);
        default: throw new Error(`no operation ${op}`);
      }
    }
    default: throw new Error(`not a term: ${s.k}`);
  }
}

/** The symbols a term relates (its free distinctions, operations aside). */
export function symbolsOf(s: Structure, out = new Set<string>()): Set<string> {
  if (s.k === 'D') { if (!s.id.startsWith('op:') && !s.id.startsWith('$')) out.add(s.id); }
  else if (s.k === 'R') for (const a of s.args) symbolsOf(a, out);
  return out;
}

// ---- the laws as terms --------------------------------------------------------------------------------------------
// Each is the law's own formula as a structure over its input symbols and constants (the names the law uses; a name is
// a variable of the term, abstracted away by lgg). Written for the laws of docs/NEX-TOPOLOGY.md §14's second half: the
// ones with no power form (sums, exponentials, logarithms, a minimum) and the monomial ones they are compared with.

const S = sym;
export const TERMS: Record<string, Structure> = {
  'newton.second': mul(S('m'), S('a')),
  'weight': mul(S('m'), S('g')),
  'energy.kinetic': mul(num(0.5), S('m'), pow(S('v'), num(2))),
  'energy.rotational': mul(num(0.5), S('I'), pow(S('w'), num(2))),
  'spring.energy': mul(num(0.5), S('k'), pow(S('x'), num(2))),
  'capacitor.energy': mul(num(0.5), S('C'), pow(S('V'), num(2))),
  'inductor.energy': mul(num(0.5), S('L'), pow(S('I'), num(2))),
  'power.linear': mul(S('F'), S('v')),
  'power.rotary': mul(S('T'), S('w')),
  'power.electric': mul(S('V'), S('I')),
  'ohm': mul(S('I'), S('R')),
  'joule': mul(pow(S('I'), num(2)), S('R')),
  'pendulum.period': mul(num(2), PI, sqrt(div(S('L'), S('g')))),
  'diffusion.time': div(pow(S('x'), num(2)), mul(num(2), S('D'))),
  'lumped.time-constant': div(mul(S('m'), S('c')), mul(S('h'), S('A'))),
  'rc.time-constant': mul(S('R'), S('C')),
  'motor.time-constant': div(mul(S('R'), S('J')), pow(S('Kt'), num(2))),
  'conduction': div(mul(S('k'), S('A'), S('dT')), S('L')),
  'convection': mul(S('h'), S('A'), S('dT')),
  'landauer': mul(S('k'), S('T'), LN2),
  'ideal.gas': div(mul(S('n'), S('R'), S('T')), S('V')),
  'drag.aero': mul(num(0.5), S('rho'), S('Cd'), S('A'), pow(S('v'), num(2))),
  'lift.aero': mul(num(0.5), S('rho'), S('CL'), S('A'), pow(S('v'), num(2))),
  'time.dilation.gravity': sqrt(sub(num(1), div(mul(num(2), S('G'), S('M')), mul(S('r'), pow(S('c'), num(2)))))),
  'shannon.sampling': mul(num(2), S('fmax')),
  'cable.equation': sqrt(div(S('rm'), S('ri'))),
  // the laws with no power form: sums, exponentials, logarithms, roots of sums
  'stress.von-mises': sqrt(add(pow(S('sigma'), num(2)), mul(num(3), pow(S('tau'), num(2))))),
  'shaft.diameter.static': cbrt(mul(div(mul(num(16), S('n')), mul(PI, S('Sy'))), sqrt(add(mul(num(4), pow(S('M'), num(2))), mul(num(3), pow(S('T'), num(2))))))),
  'bearing.life.l10': mul(pow(div(S('C'), S('P')), S('p')), num(1e6)),
  'capstan': exp(mul(S('mu'), S('theta'))),
  'copper.tempco': mul(S('R0'), add(num(1), mul(S('alpha'), sub(S('T'), S('T0'))))),
  'motor.current': div(sub(S('V'), mul(S('Ke'), S('w'))), S('R')),
  'lead-acid.ocv': add(S('V0'), mul(S('kSG'), S('SG'))),
  'radiation': mul(S('eps'), S('sigma'), S('A'), sub(pow(S('T'), num(4)), pow(S('Tinf'), num(4)))),
  'buckling.johnson': mul(S('A'), sub(S('Sy'), div(pow(div(mul(S('Sy'), S('K'), S('L')), S('r')), num(2)), mul(num(4), pow(PI, num(2)), S('E'))))),
  'parallel-axis': add(S('Icm'), mul(S('m'), pow(S('d'), num(2)))),
  'gas.isothermal-work': mul(S('p'), S('V'), ln(div(S('p'), S('p0')))),
  'composite.rule-of-mixtures': add(mul(S('Vf'), S('Ef')), mul(sub(num(1), S('Vf')), S('Em'))),
  'composite.transverse': div(num(1), add(div(S('Vf'), S('Ef')), div(sub(num(1), S('Vf')), S('Em')))),
  'sinter.scale': div(num(1), sub(num(1), S('s'))),
  'thrust.ideal-static': cbrt(mul(num(2), S('rho'), S('A'), pow(S('P'), num(2)))),
  'carnot': sub(num(1), div(S('Tc'), S('Th'))),
  'arrhenius': mul(S('A'), exp(neg(div(S('Ea'), mul(S('R'), S('T')))))),
};

/** The term of a law, with the law it is for; null where no term has been written yet. */
export function termOf(id: string): { law: Law; term: Structure } | null {
  const law = lawById(id), term = TERMS[id];
  return law && term ? { law, term } : null;
}

/** Does the term reproduce the law's own worked example? The relative error, and whether it is within the law's own tolerance. */
export function reproduces(id: string): { ok: boolean; rel: number; expected: number; got: number } | null {
  const t = termOf(id);
  if (!t) return null;
  const env = withConstants(t.law, t.law.example.inputs);
  const got = evalTerm(t.term, env), expected = t.law.example.output;
  const rel = Math.abs(got - expected) / Math.max(Math.abs(expected), 1e-300);
  return { ok: rel <= (t.law.example.rel ?? 1e-9) * 10 + 1e-12, rel, expected, got };
}

/** The laws of the book that have a term. */
export const termedLaws = (): Law[] => LAWS.filter((l) => TERMS[l.id]);

// ---- anti-unification: the generalisation ---------------------------------------------------------------------------

/** The least general generalisation of two terms: a structure both are instances of, with a variable wherever they differ (one variable per distinct pair). */
export function lgg(a: Structure, b: Structure): { def: Structure; vars: number } {
  const table = new Map<string, string>();
  let n = 0;
  const variable = (x: Structure, y: Structure): Structure => {
    const key = `${JSON.stringify(x)}|${JSON.stringify(y)}`;
    let v = table.get(key);
    if (!v) { v = `$${++n}`; table.set(key, v); }
    return d(v);
  };
  const go = (x: Structure, y: Structure): Structure => {
    if (x.k === 'Q' && y.k === 'Q') return x.v === y.v ? x : variable(x, y);
    if (x.k === 'D' && y.k === 'D') return x.id === y.id ? x : variable(x, y);
    if (x.k === 'R' && y.k === 'R' && x.op === 'apply' && y.op === 'apply' && opOf(x) === opOf(y) && x.args.length === y.args.length) return r('apply', x.args.map((xa, i) => go(xa, y.args[i]!)), {});
    return variable(x, y);
  };
  const def = go(a, b);
  return { def, vars: n };
}

/** Whether `t` is an instance of `shape`: a binding of the shape's variables that makes it `t` (a variable bound once binds the same everywhere). */
export function instanceOf(shape: Structure, t: Structure): boolean {
  const bound = new Map<string, string>();
  const go = (s: Structure, x: Structure): boolean => {
    if (s.k === 'D' && s.id.startsWith('$')) { const key = JSON.stringify(x); const have = bound.get(s.id); if (have === undefined) { bound.set(s.id, key); return true; } return have === key; }
    if (s.k === 'Q') return x.k === 'Q' && x.v === s.v;
    if (s.k === 'D') return x.k === 'D' && x.id === s.id;
    if (s.k === 'R') return x.k === 'R' && x.op === s.op && x.args.length === s.args.length && s.args.every((sa, i) => go(sa, x.args[i]!));
    return false;
  };
  return go(shape, t);
}

/** A shape is trivial when it is a bare variable, or an apply whose operands are all variables of one use each is close to it: here only the bare variable counts as nothing shared. */
export const trivial = (s: Structure): boolean => s.k === 'D' && s.id.startsWith('$');

/** How many nodes a term has (a variable counts one). */
export function termSize(s: Structure): number { return s.k === 'R' ? 1 + s.args.slice(1).reduce((n, a) => n + termSize(a), 0) : 1; }

export interface ShapeNode { hash: string; def: Structure; instances: string[]; vars: number; size: number }

/**
 * The generalisation order over a corpus of terms: every pairwise least general generalisation that is not a bare
 * variable is a shape; shapes are generalised among themselves to a fixpoint; each shape lists the laws that are its
 * instances. Returned with the chains' depth: the longest run law < shape < shape ... up to a maximal shape.
 */
export function generalisationOrder(corpus: { id: string; term: Structure }[]): { shapes: ShapeNode[]; depth: number; maximal: ShapeNode[]; below: Map<string, string[]> } {
  const shapes = new Map<string, ShapeNode>();
  const consider = (def: Structure, vars: number) => {
    if (trivial(def)) return;
    const h = hash(def);
    if (!shapes.has(h)) shapes.set(h, { hash: h, def, instances: [], vars, size: termSize(def) });
  };
  for (let i = 0; i < corpus.length; i++) for (let j = i + 1; j < corpus.length; j++) { const g = lgg(corpus[i]!.term, corpus[j]!.term); consider(g.def, g.vars); }
  // shapes of shapes, to a fixpoint
  for (let round = 0; round < 6; round++) {
    const list = [...shapes.values()];
    let added = 0;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const g = lgg(list[i]!.def, list[j]!.def); if (!trivial(g.def) && !shapes.has(hash(g.def))) { consider(g.def, g.vars); added++; } }
    if (!added) break;
  }
  for (const sh of shapes.values()) sh.instances = corpus.filter((c) => instanceOf(sh.def, c.term)).map((c) => c.id);
  // drop shapes that are instances of nothing but themselves trivially: a shape with fewer than two instances explains nothing
  const live = [...shapes.values()].filter((sh) => sh.instances.length >= 2);
  // the order among live shapes: A below B when A is an instance of B and B is not an instance of A
  const below = new Map<string, string[]>();
  for (const a of live) for (const b of live) { if (a === b) continue; if (instanceOf(b.def, a.def) && !instanceOf(a.def, b.def)) below.set(b.hash, [...(below.get(b.hash) ?? []), a.hash]); }
  const hasAbove = new Set([...below.values()].flat());
  const maximal = live.filter((sh) => !hasAbove.has(sh.hash));
  const depthOf = (h: string, seen = new Set<string>()): number => { if (seen.has(h)) return 0; seen.add(h); return 1 + Math.max(0, ...(below.get(h) ?? []).map((x) => depthOf(x, seen))); };
  // a law sits one below the lowest shape it instantiates
  const depth = live.length ? 1 + Math.max(...maximal.map((m) => depthOf(m.hash))) : 0;
  return { shapes: live, depth, maximal, below };
}

// ---- citation by hash: what depends on what ---------------------------------------------------------------------------

/** A record that cites the hashes it was derived from; what cites a changed hash is stale until recomputed. */
export interface Citing { id: string; cites: string[] }

/** Every record whose citation closure reaches a changed hash: known at once, recomputed only when asked. */
export function affected(records: Citing[], changed: string[], byHash: (id: string) => string | undefined): string[] {
  const changedSet = new Set(changed);
  const out = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const rec of records) {
      if (out.has(rec.id)) continue;
      if (rec.cites.some((h) => changedSet.has(h))) { out.add(rec.id); const h = byHash(rec.id); if (h) changedSet.add(h); grew = true; }
    }
  }
  return [...out];
}

/** The hash of a law's term, when it has one. */
export const lawHash = (id: string): string | undefined => (TERMS[id] ? hash(TERMS[id]!) : undefined);

/** A term said in infix, as a formula is written: the rendering of an apply (translate.ts uses it); never its identity. */
export function sayTerm(s: Structure): string {
  const prec: Record<string, number> = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4 };
  const go = (x: Structure, outer: number): string => {
    if (x.k === 'Q') return Number.isInteger(x.v) ? String(x.v) : x.v === Math.PI ? 'π' : x.v === Math.LN2 ? 'ln 2' : String(+x.v.toPrecision(6));
    if (x.k === 'D') return x.id.startsWith('$') ? x.id : x.id;
    const op = opOf(x);
    if (x.k !== 'R' || !op) return text(x);
    const a = x.args.slice(1);
    const p = prec[op] ?? 5;
    const wrap = (t: string) => (p < outer ? `(${t})` : t);
    switch (op) {
      case 'add': return wrap(a.map((y) => go(y, p)).join(' + '));
      case 'sub': return wrap(`${go(a[0]!, p)} − ${go(a[1]!, p + 1)}`);
      case 'mul': return wrap(a.map((y) => go(y, p)).join(' · '));
      case 'div': return wrap(`${go(a[0]!, p)} / ${go(a[1]!, p + 1)}`);
      case 'pow': return `${go(a[0]!, p + 1)}^${go(a[1]!, p + 1)}`;
      case 'neg': return `−${go(a[0]!, p)}`;
      case 'sqrt': return `√(${go(a[0]!, 0)})`;
      case 'cbrt': return `∛(${go(a[0]!, 0)})`;
      case 'exp': return `e^(${go(a[0]!, 0)})`;
      case 'ln': return `ln(${go(a[0]!, 0)})`;
      default: return `${op}(${a.map((y) => go(y, 0)).join(', ')})`;
    }
  };
  return go(s, 0);
}
