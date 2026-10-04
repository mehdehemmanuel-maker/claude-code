// Terms: the one thing a value can be. A leaf (with an origin class), a variable, or an operator applied to terms.
// Dimensions are checked when a term is constructed, so dimensional nonsense is not a term. Identity is the hash of
// the canonical form: variables renamed by order of appearance, commutative arguments ordered by content, names
// nowhere in it.

import { parseUnit } from '../ganglia/units';
import { DIMLESS, DimensionError, dimOf, dimText, divDim, isDimless, mulDim, powDim, sameDim, type Dim } from './dimension';
import { hashOf } from './identity';

export type OriginClass =
  | 'fundamental'    // a declared constant with its fixing source
  | 'measured'       // a measurement with its source or instrument and window
  | 'given'          // declared by the person: the intent
  | 'configuration'  // declared by the environment, a contract or a catalogue, with its source
  | 'empirical'      // a fitted relation with its data
  | 'estimated'      // a declared estimate with grounds and a range
  | 'assumed'        // a declared assumption with who and why
  | 'hypothesized'   // a candidate from abduction
  | 'unknown';       // declared to have no value

export interface Origin {
  class: OriginClass;
  /** The book, standard, instrument or document that fixes it. */
  source?: string;
  /** Why it is what it is (an assumption's or an estimate's grounds). */
  grounds?: string;
  /** Who declared it. */
  by?: string;
  /** The observer window a measurement was taken in. */
  window?: string;
}

export interface Leaf {
  readonly kind: 'leaf';
  readonly name: string;
  readonly value: number | null;
  readonly dim: Dim;
  readonly unit: string;
  readonly origin: Origin;
  /** Absolute uncertainty in SI (a measurement's, an estimate's range), when declared. */
  readonly uncertainty?: number;
  readonly hash: string;
}

export interface Var {
  readonly kind: 'var';
  readonly sym: string;
  readonly name: string;
  readonly dim: Dim;
  readonly unit: string;
  readonly hash: string;
}

export interface App {
  readonly kind: 'app';
  readonly op: OpId;
  readonly args: readonly Term[];
  /** The exponent of a `pow`. */
  readonly k?: number;
  readonly dim: Dim;
  readonly hash: string;
}

/**
 * A binder: a coordinate bound over an interval under a rule. The one way a term says "over": an integral of the
 * body along `over` from `lo` to `hi`. The bound variable is not free in the term; `lo` and `hi` may hold free
 * variables; the rule's resolution (`cells`, Simpson panels) is a leaf in the term, so the method and its setting
 * are in the term's identity and in its closure, and the discretization error is measured by halving it.
 */
export interface Bind {
  readonly kind: 'bind';
  readonly rule: 'integral';
  readonly over: Var;
  readonly lo: Term;
  readonly hi: Term;
  readonly body: Term;
  readonly cells: Leaf;
  readonly dim: Dim;
  readonly hash: string;
}

export type Term = Leaf | Var | App | Bind;

// ---- operators: each with an identity of its own ------------------------------------------------------------------

export type OpId = 'add' | 'sub' | 'mul' | 'div' | 'pow' | 'neg' | 'abs' | 'min' | 'max' | 'le' | 'ge' | 'lt' | 'gt' | 'and' | 'or' | 'exp' | 'ln' | 'log2' | 'log10' | 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan';

export interface Operator {
  id: OpId;
  arity: number;
  commutative: boolean;
  /** What it means, as a definition: part of its identity. */
  meaning: string;
  dim(args: Dim[], k?: number): Dim;
  eval(args: number[], k?: number): number;
  hash: string;
}

const same = (id: string, a: Dim, b: Dim) => {
  if (!sameDim(a, b)) throw new DimensionError(`${id}: ${dimText(a)} and ${dimText(b)} are not the same dimension`);
  return a;
};
/** A transcendental function takes and returns a pure number: a dimensioned argument is nonsense. */
const pure = (id: string, a: Dim) => {
  if (!isDimless(a)) throw new DimensionError(`${id}: its argument must be dimensionless, not ${dimText(a)}`);
  return DIMLESS;
};
const op = (o: Omit<Operator, 'hash'>): Operator => ({ ...o, hash: hashOf({ id: o.id, arity: o.arity, meaning: o.meaning }) });
const bool = (x: boolean) => (x ? 1 : 0);

export const OPERATORS: Record<OpId, Operator> = {
  add: op({ id: 'add', arity: 2, commutative: true, meaning: 'the sum of two quantities of one dimension', dim: ([a, b]) => same('add', a!, b!), eval: ([a, b]) => a! + b! }),
  sub: op({ id: 'sub', arity: 2, commutative: false, meaning: 'the difference of two quantities of one dimension', dim: ([a, b]) => same('sub', a!, b!), eval: ([a, b]) => a! - b! }),
  mul: op({ id: 'mul', arity: 2, commutative: true, meaning: 'the product; dimensions add', dim: ([a, b]) => mulDim(a!, b!), eval: ([a, b]) => a! * b! }),
  div: op({ id: 'div', arity: 2, commutative: false, meaning: 'the quotient; dimensions subtract', dim: ([a, b]) => divDim(a!, b!), eval: ([a, b]) => a! / b! }),
  pow: op({ id: 'pow', arity: 1, commutative: false, meaning: 'a quantity to a fixed rational power; the dimension scales', dim: ([a], k) => powDim(a!, k!), eval: ([a], k) => a! ** k! }),
  neg: op({ id: 'neg', arity: 1, commutative: false, meaning: 'the negative', dim: ([a]) => a!, eval: ([a]) => -a! }),
  abs: op({ id: 'abs', arity: 1, commutative: false, meaning: 'the magnitude', dim: ([a]) => a!, eval: ([a]) => Math.abs(a!) }),
  min: op({ id: 'min', arity: 2, commutative: true, meaning: 'the lesser of two quantities of one dimension', dim: ([a, b]) => same('min', a!, b!), eval: ([a, b]) => Math.min(a!, b!) }),
  max: op({ id: 'max', arity: 2, commutative: true, meaning: 'the greater of two quantities of one dimension', dim: ([a, b]) => same('max', a!, b!), eval: ([a, b]) => Math.max(a!, b!) }),
  le: op({ id: 'le', arity: 2, commutative: false, meaning: 'whether the first is at most the second (one dimension); 1 or 0', dim: ([a, b]) => (same('le', a!, b!), DIMLESS), eval: ([a, b]) => bool(a! <= b!) }),
  ge: op({ id: 'ge', arity: 2, commutative: false, meaning: 'whether the first is at least the second (one dimension); 1 or 0', dim: ([a, b]) => (same('ge', a!, b!), DIMLESS), eval: ([a, b]) => bool(a! >= b!) }),
  lt: op({ id: 'lt', arity: 2, commutative: false, meaning: 'whether the first is below the second (one dimension); 1 or 0', dim: ([a, b]) => (same('lt', a!, b!), DIMLESS), eval: ([a, b]) => bool(a! < b!) }),
  gt: op({ id: 'gt', arity: 2, commutative: false, meaning: 'whether the first is above the second (one dimension); 1 or 0', dim: ([a, b]) => (same('gt', a!, b!), DIMLESS), eval: ([a, b]) => bool(a! > b!) }),
  and: op({ id: 'and', arity: 2, commutative: true, meaning: 'both predicates hold; 1 or 0', dim: ([a, b]) => { if (!isDimless(a!) || !isDimless(b!)) throw new DimensionError('and: predicates only'); return DIMLESS; }, eval: ([a, b]) => bool(a! !== 0 && b! !== 0) }),
  or: op({ id: 'or', arity: 2, commutative: true, meaning: 'either predicate holds; 1 or 0', dim: ([a, b]) => { if (!isDimless(a!) || !isDimless(b!)) throw new DimensionError('or: predicates only'); return DIMLESS; }, eval: ([a, b]) => bool(a! !== 0 || b! !== 0) }),
  exp: op({ id: 'exp', arity: 1, commutative: false, meaning: 'e to a dimensionless power', dim: ([a]) => pure('exp', a!), eval: ([a]) => Math.exp(a!) }),
  ln: op({ id: 'ln', arity: 1, commutative: false, meaning: 'the natural logarithm of a dimensionless ratio', dim: ([a]) => pure('ln', a!), eval: ([a]) => Math.log(a!) }),
  log2: op({ id: 'log2', arity: 1, commutative: false, meaning: 'the logarithm to base 2 of a dimensionless ratio', dim: ([a]) => pure('log2', a!), eval: ([a]) => Math.log2(a!) }),
  log10: op({ id: 'log10', arity: 1, commutative: false, meaning: 'the logarithm to base 10 of a dimensionless ratio', dim: ([a]) => pure('log10', a!), eval: ([a]) => Math.log10(a!) }),
  sin: op({ id: 'sin', arity: 1, commutative: false, meaning: 'the sine of an angle (dimensionless, radians)', dim: ([a]) => pure('sin', a!), eval: ([a]) => Math.sin(a!) }),
  cos: op({ id: 'cos', arity: 1, commutative: false, meaning: 'the cosine of an angle', dim: ([a]) => pure('cos', a!), eval: ([a]) => Math.cos(a!) }),
  tan: op({ id: 'tan', arity: 1, commutative: false, meaning: 'the tangent of an angle', dim: ([a]) => pure('tan', a!), eval: ([a]) => Math.tan(a!) }),
  asin: op({ id: 'asin', arity: 1, commutative: false, meaning: 'the angle whose sine is a dimensionless value', dim: ([a]) => pure('asin', a!), eval: ([a]) => Math.asin(a!) }),
  acos: op({ id: 'acos', arity: 1, commutative: false, meaning: 'the angle whose cosine is a dimensionless value', dim: ([a]) => pure('acos', a!), eval: ([a]) => Math.acos(a!) }),
  atan: op({ id: 'atan', arity: 1, commutative: false, meaning: 'the angle whose tangent is a dimensionless value', dim: ([a]) => pure('atan', a!), eval: ([a]) => Math.atan(a!) }),
};

// ---- construction ------------------------------------------------------------------------------------------------

const ORIGIN_NEEDS: Record<OriginClass, (keyof Origin)[]> = {
  fundamental: ['source'], measured: ['source'], given: ['by'], configuration: ['source'], empirical: ['source'],
  estimated: ['grounds'], assumed: ['grounds', 'by'], hypothesized: ['grounds'], unknown: [],
};

/** A leaf: a value with an origin. The origin class says what it must carry; a leaf without it is not constructed. */
export function leaf(name: string, value: number | null, unit: string, origin: Origin, uncertainty?: number): Leaf {
  for (const need of ORIGIN_NEEDS[origin.class]) if (!origin[need]) throw new Error(`a ${origin.class} leaf needs its ${need}: ${name}`);
  if (origin.class === 'unknown' && value !== null) throw new Error(`an unknown leaf has no value: ${name}`);
  if (origin.class !== 'unknown' && (value === null || !Number.isFinite(value))) throw new Error(`a ${origin.class} leaf needs a finite value: ${name}`);
  const { dim, scale, offset } = parseUnit(unit);
  const v = value === null ? null : value * scale + (offset ?? 0);
  const u = uncertainty === undefined ? undefined : uncertainty * scale;
  const l: Omit<Leaf, 'hash'> = { kind: 'leaf', name, value: v, dim, unit, origin, ...(u === undefined ? {} : { uncertainty: u }) };
  return { ...l, hash: hashOf(leafContent(l)) };
}

/**
 * A leaf of an intent: given by the person when they gave it; when the slice filled it in, assumed, with the slice's
 * grounds and the fact that it was not given. The origin says who chose the value; a slice's choice never claims to be the person's.
 */
export function intentLeaf(by: string, name: string, given: number | undefined, fallback: number, unit: string, grounds: string): Leaf {
  return given === undefined
    ? leaf(name, fallback, unit, { class: 'assumed', by: 'the slice', grounds: `${grounds}; not given by ${by}, varied through the intent` })
    : leaf(name, given, unit, { class: 'given', by, grounds });
}

/** A mathematical constant of a derivation (the 48 in P L^3 / 48 E I): exact, its source the mathematics. */
export const k = (value: number, name = String(value)): Leaf => leaf(name, value, '1', { class: 'fundamental', source: 'mathematics: exact in the derivation it belongs to' });

/** Zero of a dimension: exact. */
export const zero = (unit: string): Leaf => leaf('0', 0, unit, { class: 'fundamental', source: 'mathematics: zero' });

/** A declared unknown. */
export const unknown = (name: string, unit: string): Leaf => leaf(name, null, unit, { class: 'unknown' });

export function variable(sym: string, unit: string, name = sym): Var {
  const dim = dimOf(unit);
  return { kind: 'var', sym, name, dim, unit, hash: hashOf({ var: true, dim }) };
}

export function app(id: OpId, args: Term[], kk?: number): App {
  const o = OPERATORS[id];
  if (args.length !== o.arity) throw new Error(`${id} takes ${o.arity} arguments, got ${args.length}`);
  if (id === 'pow' && (kk === undefined || !Number.isFinite(kk))) throw new Error('pow needs its exponent');
  const dim = o.dim(args.map((a) => a.dim), kk);
  const bound = new Set(args.flatMap((a) => boundSyms(a)));
  for (const a of args) for (const v of varsOf(a)) if (bound.has(v.sym)) throw new Error(`${id}: ${v.sym} is bound in one argument and free in another`);
  const t: Omit<App, 'hash'> = { kind: 'app', op: id, args, ...(kk === undefined ? {} : { k: kk }), dim };
  return { ...t, hash: hashOf(canonicalForm(t as App)) };
}

export const add = (a: Term, b: Term) => app('add', [a, b]);
export const sub = (a: Term, b: Term) => app('sub', [a, b]);
export const mul = (...xs: Term[]) => xs.reduce((p, x) => app('mul', [p, x]));
export const div = (a: Term, b: Term) => app('div', [a, b]);
export const pow = (a: Term, kk: number) => app('pow', [a], kk);
export const sqrt = (a: Term) => app('pow', [a], 0.5);
export const neg = (a: Term) => app('neg', [a]);
export const abs = (a: Term) => app('abs', [a]);
export const min = (a: Term, b: Term) => app('min', [a, b]);
export const max = (a: Term, b: Term) => app('max', [a, b]);
export const le = (a: Term, b: Term) => app('le', [a, b]);
export const ge = (a: Term, b: Term) => app('ge', [a, b]);
export const lt = (a: Term, b: Term) => app('lt', [a, b]);
export const gt = (a: Term, b: Term) => app('gt', [a, b]);
export const and = (a: Term, b: Term) => app('and', [a, b]);
export const or = (a: Term, b: Term) => app('or', [a, b]);
export const exp = (a: Term) => app('exp', [a]);
export const ln = (a: Term) => app('ln', [a]);
export const log2 = (a: Term) => app('log2', [a]);
export const log10 = (a: Term) => app('log10', [a]);
export const sin = (a: Term) => app('sin', [a]);
export const cos = (a: Term) => app('cos', [a]);
export const tan = (a: Term) => app('tan', [a]);
export const asin = (a: Term) => app('asin', [a]);
export const acos = (a: Term) => app('acos', [a]);
export const atan = (a: Term) => app('atan', [a]);
export const cbrt = (a: Term) => app('pow', [a], 1 / 3);
/** π, exact in the derivation it belongs to. */
export const PI = (): Leaf => leaf('π', Math.PI, '1', { class: 'fundamental', source: 'mathematics: π' });

/** The resolution of a binder's rule: Simpson panels, a configuration of the evaluation with its source. */
export const cells = (n: number, source: string): Leaf => leaf(`${n} Simpson panels`, n, '1', { class: 'configuration', source });

/**
 * ∫ body d(over) from lo to hi. The dimension is the body's times the coordinate's. The ends have the coordinate's
 * dimension and may not mention it; the body may not bind it again; the resolution is a dimensionless integer
 * leaf of at least two panels (halving it measures the error).
 */
export function integral(over: Var, lo: Term, hi: Term, body: Term, resolution: Leaf): Bind {
  for (const end of [lo, hi]) {
    if (!sameDim(end.dim, over.dim)) throw new DimensionError(`∫ d${over.sym}: an end is ${dimText(end.dim)}, the coordinate ${dimText(over.dim)}`);
    if (varsOf(end).some((v) => v.sym === over.sym)) throw new Error(`∫ d${over.sym}: an end mentions the bound coordinate`);
  }
  if (boundSyms(body).includes(over.sym)) throw new Error(`∫ d${over.sym}: the body binds ${over.sym} again`);
  if (!isDimless(resolution.dim) || resolution.value === null || !Number.isInteger(resolution.value) || resolution.value < 2) throw new Error(`∫ d${over.sym}: the resolution is a whole number of at least two panels`);
  const t: Omit<Bind, 'hash'> = { kind: 'bind', rule: 'integral', over, lo, hi, body, cells: resolution, dim: mulDim(body.dim, over.dim) };
  return { ...t, hash: hashOf(canonicalForm(t as Bind)) };
}

/** The symbols a term binds. */
export function boundSyms(t: Term, out: string[] = []): string[] {
  if (t.kind === 'bind') { out.push(t.over.sym); boundSyms(t.lo, out); boundSyms(t.hi, out); boundSyms(t.body, out); }
  else if (t.kind === 'app') for (const a of t.args) boundSyms(a, out);
  return out;
}

/** The binders of a term, outermost first. */
export function bindsOf(t: Term, out: Bind[] = []): Bind[] {
  if (t.kind === 'bind') { out.push(t); bindsOf(t.lo, out); bindsOf(t.hi, out); bindsOf(t.body, out); }
  else if (t.kind === 'app') for (const a of t.args) bindsOf(a, out);
  return out;
}

// ---- canonical form ----------------------------------------------------------------------------------------------

type Canon = unknown;

/** The structure with every variable as its dimension only (to order commutative arguments without names). */
function shape(t: Term): Canon {
  if (t.kind === 'leaf') return leafContent(t);
  if (t.kind === 'var') return { v: t.dim };
  if (t.kind === 'bind') return { bind: t.rule, over: t.over.dim, lo: shape(t.lo), hi: shape(t.hi), body: shape(t.body), cells: leafContent(t.cells) };
  const args = t.args.map(shape);
  if (OPERATORS[t.op].commutative) args.sort((a, b) => (hashOf(a) < hashOf(b) ? -1 : 1));
  return { op: OPERATORS[t.op].hash, ...(t.k === undefined ? {} : { k: t.k }), args };
}

/** What a leaf is, for identity: its origin (class, source, grounds, by, window), value, dimension, uncertainty. Not its name. */
const leafContent = (l: Omit<Leaf, 'hash'>) => ({ leaf: true, class: l.origin.class, source: l.origin.source ?? null, grounds: l.origin.grounds ?? null, by: l.origin.by ?? null, window: l.origin.window ?? null, value: l.value, dim: l.dim, uncertainty: l.uncertainty ?? null });

/** Commutative arguments in content order, variables numbered by first appearance in that order. */
export function canonicalForm(t: Term): Canon {
  const order = new Map<string, number>();
  const walk = (x: Term): Canon => {
    if (x.kind === 'leaf') return leafContent(x);
    if (x.kind === 'var') {
      if (!order.has(x.sym)) order.set(x.sym, order.size);
      return { v: order.get(x.sym), dim: x.dim };
    }
    if (x.kind === 'bind') return { bind: x.rule, over: walk(x.over), lo: walk(x.lo), hi: walk(x.hi), body: walk(x.body), cells: leafContent(x.cells) };
    let args = [...x.args];
    if (OPERATORS[x.op].commutative) {
      const keyed = args.map((a) => ({ a, key: hashOf(shape(a)) }));
      keyed.sort((p, q) => (p.key < q.key ? -1 : p.key > q.key ? 1 : 0));
      args = keyed.map((p) => p.a);
    }
    return { op: OPERATORS[x.op].hash, ...(x.k === undefined ? {} : { k: x.k }), args: args.map(walk) };
  };
  return walk(t);
}

/** The variables of a term, by first appearance. */
export function varsOf(t: Term, out: Var[] = []): Var[] {
  if (t.kind === 'var') { if (!out.some((v) => v.sym === t.sym)) out.push(t); }
  else if (t.kind === 'app') for (const a of t.args) varsOf(a, out);
  else if (t.kind === 'bind') {
    varsOf(t.lo, out); varsOf(t.hi, out);
    for (const v of varsOf(t.body)) if (v.sym !== t.over.sym && !out.some((w) => w.sym === v.sym)) out.push(v);
  }
  return out;
}

/** The leaves of a term. */
export function leavesOf(t: Term, out: Leaf[] = []): Leaf[] {
  if (t.kind === 'leaf') { if (!out.some((l) => l.hash === t.hash)) out.push(t); }
  else if (t.kind === 'app') for (const a of t.args) leavesOf(a, out);
  else if (t.kind === 'bind') { leavesOf(t.lo, out); leavesOf(t.hi, out); leavesOf(t.body, out); leavesOf(t.cells, out); }
  return out;
}

/** The term with variables replaced (dimensions must agree). */
export function substitute(t: Term, by: Record<string, Term>): Term {
  if (t.kind === 'leaf') return t;
  if (t.kind === 'var') {
    const r = by[t.sym];
    if (!r) return t;
    if (!sameDim(r.dim, t.dim)) throw new DimensionError(`${t.sym} is ${dimText(t.dim)}, not ${dimText(r.dim)}`);
    return r;
  }
  if (t.kind === 'bind') {
    const inner = Object.fromEntries(Object.entries(by).filter(([s]) => s !== t.over.sym));
    for (const r of Object.values(inner)) if (varsOf(r).some((v) => v.sym === t.over.sym)) throw new Error(`∫ d${t.over.sym}: a replacement would be captured by the binder`);
    return integral(t.over, substitute(t.lo, by), substitute(t.hi, by), substitute(t.body, inner), t.cells);
  }
  return app(t.op, t.args.map((a) => substitute(a, by)), t.k);
}

/** The term as it is written, for people. */
export function show(t: Term): string {
  if (t.kind === 'leaf') return t.name;
  if (t.kind === 'var') return t.sym;
  if (t.kind === 'bind') return `∫[${show(t.lo)}, ${show(t.hi)}] ${show(t.body)} d${t.over.sym}`;
  const a = t.args.map(show);
  switch (t.op) {
    case 'add': return `(${a[0]} + ${a[1]})`;
    case 'sub': return `(${a[0]} - ${a[1]})`;
    case 'mul': return `${a[0]} · ${a[1]}`;
    case 'div': return `(${a[0]}) / (${a[1]})`;
    case 'pow': return t.k === 0.5 ? `√(${a[0]})` : `(${a[0]})^${t.k}`;
    case 'neg': return `-(${a[0]})`;
    case 'abs': return `|${a[0]}|`;
    case 'le': return `${a[0]} ≤ ${a[1]}`;
    case 'ge': return `${a[0]} ≥ ${a[1]}`;
    case 'lt': return `${a[0]} < ${a[1]}`;
    case 'gt': return `${a[0]} > ${a[1]}`;
    case 'and': return `${a[0]} and ${a[1]}`;
    case 'or': return `${a[0]} or ${a[1]}`;
    default: return `${t.op}(${a.join(', ')})`;
  }
}
