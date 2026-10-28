// The laws as one graph. Every law of the book rests on a few principles (conservation, the Boltzmann factor, the random
// walk, equilibrium, geometry, least dissipation…), shares its shape of math with laws of other fields (a product of
// powers, an exponential, a sum), and links to the laws it is a case of or feeds. And a number about anything is a chain
// of laws over what is measured: `step` applies a law to records, so the result carries every input it rests on, and
// `breakdown` reads that tree back, down to each measurement and estimate and where it is from.
//
// The graph also finds laws. A law that is a product of powers is fixed by its units alone, up to its constant, when its
// quantities make one dimensionless group (Rayleigh's method, Buckingham's π): `discover` writes that law from the
// quantities' units, and `forcedByUnits` says, of each law in the book, whether its exponents are what units force or
// carry something units cannot know (Kleiber's ¾ from a network's geometry, Basquin's exponent from a metal).

import { BOOK, lawById, lawByHash } from './book';
import { dimOf, integerNullSpace, sameDim } from './dimension';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { apply, invert, invertFound, type Law, type Port } from './law';
import { div, leaf, mul, OPERATORS, pow, substitute, variable, varsOf, type Term } from './term';
import { bracketsOf, solveLinear, type Found } from './numeric';
import { isPlain, quantityById, quantityOf, type QuantityDef } from './quantities';
import { KINDS } from './book/kinds';
import type { Status } from './status';
import { CONST } from './book/constants';
import { fromSI, parseUnit } from '../ganglia/units';

// ---- records ----------------------------------------------------------------------------------------------------------
/** A measured value as a record: its source says where it is measured. */
export const measured = (name: string, value: number, unit: string, source: string, uncertainty?: number): Derivation => ofLeaf(leaf(name, value, unit, { class: 'measured', source }, uncertainty));
/** An estimate as a record: its grounds say why. */
export const estimate = (name: string, value: number, unit: string, grounds: string): Derivation => ofLeaf(leaf(name, value, unit, { class: 'estimated', grounds }));
/** A fixed constant of nature or a definition as a record. */
export const fixed = (name: string, value: number, unit: string, source: string): Derivation => ofLeaf(leaf(name, value, unit, { class: 'fundamental', source }));
/** A value set by a choice of the world (a body's own parameters, a place's temperature) as a record. */
export const setting = (name: string, value: number, unit: string, by: string): Derivation => ofLeaf(leaf(name, value, unit, { class: 'given', by }));

/** A law applied to records, each checked against its port's dimension: the result carries them as its breakdown. */
export function step(id: string, env: Record<string, Derivation>, name?: string): Derivation {
  const l = lawById(id);
  for (const p of l.inputs) {
    const d = env[p.sym]; if (!d) throw new Error(`${id}: ${p.sym} (${p.name}) is not given`);
    if (!sameDim(d.dim, dimOf(p.unit))) throw new Error(`${id}: ${p.sym} is ${d.unit}, the port is ${p.unit}`);
  }
  return apply(l, env, name ?? l.output.name);
}
/** If this then that: the value an input must take for a law's output to reach a target, every other input given. */
export function need(id: string, sym: string, target: number, env: Record<string, Derivation>, bracket: [number, number]): number | null {
  const l = lawById(id), port = l.inputs.find((p) => p.sym === sym); if (!port) throw new Error(`${id}: ${sym} is not an input`);
  const x = invert(l, sym, target, env, [bracket[0], bracket[1]], (name, value, unit) => setting(name, value, unit, 'the inversion'));
  return x === null ? null : x;
}
/** A law solved for one of its inputs, as a record citing the law: where the law is a product of powers in it, the
 *  rearranged term (so the breakdown reads the same law the other way round); else by numeric inversion inside a bracket. */
export function solve(id: string, sym: string, env: Record<string, Derivation>, name?: string, bracket?: [number, number]): Derivation {
  const l = lawById(id), port = l.inputs.find((p) => p.sym === sym); if (!port) throw new Error(`${id}: ${sym} is not an input`);
  const out = env[l.output.sym]; if (!out) throw new Error(`${id}: give its output ${l.output.sym} to solve for ${sym}`);
  const m = monomial(l.term), p = m?.e[sym], u = parseUnit(port.unit);
  if (m && p && !u.offset) {
    const one = leaf(`one ${port.unit}`, 1 / u.scale, port.unit, { class: 'fundamental', source: 'the unit of what is solved for' });
    const rest = substitute(l.term, { [sym]: one }), outVar = variable(l.output.sym, l.output.unit, l.output.name);
    const t = mul(one, p === 1 ? div(outVar, rest) : pow(div(outVar, rest), 1 / p));
    return evaluate(name ?? port.name, t, { ...env }, { law: l.hash, unit: port.unit });
  }
  // the search and the inversion run the law's term without its domain, so a narrow domain does not hide the answer;
  // whether the law holds at the answer is the caller's to check (the law node puts it back)
  const free: Law = { ...l, domain: [] }, target = out.value!;
  const f = (x: number) => { const d = apply(free, { ...env, [sym]: setting(port.name, x, port.unit, 'the search') }); return d.value === null ? NaN : d.value - target; };
  let also = '', r: Found | null = null;
  const mk = (n: string, v: number, un: string) => setting(n, v, un, 'the inversion');
  if (!bracket) {
    // no bracket given: look for every one, the law's output against the target over every decade; take the first whose
    // answer the law holds at, else the first
    const all = bracketsOf(f);
    if (!all.length) return ofLeaf(leaf(name ?? port.name, null, port.unit, { class: 'unknown', by: 'the law graph', grounds: `no value of ${port.name} from −10⁴⁰ to 10⁴⁰ makes ${l.name} give ${says(out)}` }));
    const tries = all.slice(0, 12).map((b) => (b[0] === b[1] ? { value: b[0], converged: true, iterations: 0, evaluations: 0, error: 0, method: 'the search' } : invertFound(free, sym, target, env, b, mk, { ftol: 0 }))).filter((t) => t.value !== null);
    const holds = (t: { value: number | null }) => apply(l, { ...env, [sym]: setting(port.name, t.value!, port.unit, 'the check') }).status !== 'outside-validity';
    r = tries.find(holds) ?? tries[0] ?? null;
    const good = tries.filter(holds).length;
    if (all.length > 1) also = `; one of ${all.length} values that solve it (${good} where the law holds; the positive one nearest 1 ${port.unit || ''} where it holds is taken: set a range to choose another)`;
  } else {
    if (!(f(bracket[0]) * f(bracket[1]) <= 0)) return ofLeaf(leaf(name ?? port.name, null, port.unit, { class: 'unknown', by: 'the law graph', grounds: `no value of ${port.name} from ${bracket[0]} to ${bracket[1]} ${port.unit} makes ${l.name} give ${says(out)}` }));
    r = invertFound(free, sym, target, env, bracket, mk, { ftol: 0 });
  }
  let x = r?.value ?? null;
  // an answer a rounding away from an exact zero of the law is that zero
  if (x !== null && x !== 0 && Math.abs(x) < 1e-8 && f(0) === 0) x = 0;
  if (x === null || !r) return ofLeaf(leaf(name ?? port.name, null, port.unit, { class: 'unknown', by: 'the law graph', grounds: r?.warning ?? 'the inversion found nothing' }));
  // (the inversion works in the port's own unit, as the value is set)
  return ofLeaf(leaf(name ?? port.name, x, port.unit, { class: 'assumed', by: 'the law graph', grounds: `${l.name} solved numerically for ${port.name} by ${r.method}, ${r.converged ? 'converged' : 'not converged'} in ${r.iterations} steps (±${r.error.toPrecision(2)} ${port.unit || 'in its unit'})${also}` }));
}
/** A record's value in a unit. */
export const valueIn = (d: Derivation, unit = d.unit): number | null => (d.value === null ? null : fromSI(d.value, unit));
const num = (x: number) => (x === 0 ? '0' : Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3 ? x.toExponential(3) : +x.toPrecision(4) + '');
/** How a record says itself: its value in its unit, its origin or its law. */
export function says(d: Derivation, unit = d.unit): string { const v = valueIn(d, unit); return `${d.name} = ${v === null ? (d.refusal ? `refused (${d.refusal.domain})` : 'unknown') : num(v)}${unit === '-' || unit === '1' ? '' : ` ${unit}`}`; }
/** The tree a record rests on, as lines: each law with its formula, each leaf with where it is from. */
export function breakdown(d: Derivation, depth = 0, out: string[] = [], most = 8): string[] {
  const pad = '  '.repeat(depth);
  if (d.term.kind === 'leaf') {
    const o = d.term.origin, from = o.source ?? o.grounds ?? o.by ?? '';
    out.push(`${pad}${says(d)} — ${o.class === 'estimated' ? 'an estimate' : o.class === 'fundamental' ? 'fixed' : o.class === 'given' ? 'set' : o.class}${from ? `: ${from}` : ''}`);
    return out;
  }
  const l = d.law ? lawByHash(d.law) : undefined;
  out.push(`${pad}${says(d)} — ${l ? `${l.name}: ${l.formula}` : 'worked out'}`);
  if (depth >= most) return out;
  // a law solved for an input carries its output among its inputs: read it too
  const order = l ? [...l.inputs.map((p) => p.sym), ...Object.keys(d.inputs).filter((k) => !l.inputs.some((p) => p.sym === k))] : Object.keys(d.inputs);
  for (const sym of order) { const c = d.inputs[sym]; if (c) breakdown(c, depth + 1, out, most); }
  return out;
}
/** Every law a record rests on, once, deepest first. */
export function lawsUnder(d: Derivation, out: Law[] = []): Law[] {
  for (const c of Object.values(d.inputs)) lawsUnder(c, out);
  const l = d.law ? lawByHash(d.law) : undefined; if (l && !out.includes(l)) out.push(l);
  return out;
}
/** Every measurement and estimate a record rests on. */
export function leavesUnder(d: Derivation, out: Derivation[] = []): Derivation[] {
  if (d.term.kind === 'leaf') { if (!out.includes(d)) out.push(d); return out; }
  for (const c of Object.values(d.inputs)) leavesUnder(c, out);
  return out;
}

// ---- the shapes of math ---------------------------------------------------------------------------------------------------
/** A product of powers: its constant (SI), each input's exponent, and the constants with units in it (R, F, g), each
 *  with its exponent; null where the term is not one. */
export interface Monomial { c: number; e: Record<string, number>; k: { name: string; unit: string; e: number }[] }
export function monomial(t: Term): Monomial | null {
  if (t.kind === 'leaf') return t.value === null ? null : { c: t.value, e: {}, k: sameDim(t.dim, [0, 0, 0, 0, 0, 0]) ? [] : [{ name: t.name, unit: t.unit, e: 1 }] };
  if (t.kind === 'var') return { c: 1, e: { [t.sym]: 1 }, k: [] };
  if (t.kind !== 'app') return null;
  const of = t.args.map(monomial); if (of.some((x) => !x)) return null;
  const join = (a: Monomial, b: Monomial, s: number): Monomial => {
    const e = { ...a.e }; for (const [k, v] of Object.entries(b.e)) e[k] = (e[k] ?? 0) + s * v;
    const kk = a.k.map((x) => ({ ...x })); for (const x of b.k) { const h = kk.find((y) => y.name === x.name); if (h) h.e += s * x.e; else kk.push({ ...x, e: s * x.e }); }
    return { c: s > 0 ? a.c * b.c : a.c / b.c, e, k: kk };
  };
  switch (t.op) {
    case 'mul': return of.reduce((a, b) => join(a!, b!, 1))!;
    case 'div': return join(of[0]!, of[1]!, -1);
    case 'pow': { const a = of[0]!, p = t.k!; return { c: Math.pow(a.c, p), e: Object.fromEntries(Object.entries(a.e).map(([k, v]) => [k, v * p])), k: a.k.map((x) => ({ ...x, e: x.e * p })) }; }
    case 'neg': return { ...of[0]!, c: -of[0]!.c };
    default: return null;
  }
}
/** The shape of a term with its quantities and constants taken out: laws of different fields with one shape are one math. */
export function skeleton(t: Term): string {
  if (t.kind === 'leaf') return 'c';
  if (t.kind === 'var') return 'x';
  if (t.kind === 'bind') return `∫(${skeleton(t.body)})`;
  const args = t.args.map(skeleton); if (OPERATORS[t.op].commutative) args.sort();
  return `${t.op}${t.k === undefined ? '' : `^${+t.k.toFixed(4)}`}(${args.join(',')})`;
}
/** The kind of math a law is. */
export function shapeOf(l: Law): 'product of powers' | 'exponential' | 'logarithmic' | 'sum' | 'other' {
  const m = monomial(l.term); if (m) return 'product of powers';
  const s = skeleton(l.term);
  if (s.includes('exp(')) return 'exponential';
  if (s.includes('ln(') || s.includes('log')) return 'logarithmic';
  if (/^(add|sub)\(/.test(s) || /add\(|sub\(/.test(s)) return 'sum';
  return 'other';
}
/** The laws by their shape of math: each group a math shared across fields. */
export function families(laws: readonly Law[] = BOOK): { skeleton: string; laws: string[] }[] {
  const by = new Map<string, string[]>();
  for (const l of laws) { const s = skeleton(l.term); by.set(s, [...(by.get(s) ?? []), l.id]); }
  return [...by.entries()].map(([skeleton, ids]) => ({ skeleton, laws: ids })).filter((f) => f.laws.length > 1).sort((a, b) => b.laws.length - a.laws.length);
}

// ---- laws found from units ------------------------------------------------------------------------------------------------
const dim6 = (unit: string): number[] => [...dimOf(unit)];
/** Rayleigh's method: the product of powers the units of these quantities allow for the output, when they allow one;
 *  otherwise the dimensionless groups the answer is some function of. */
export function discover(output: [name: string, unit: string], inputs: [name: string, unit: string][]): { forced: boolean; exponents?: Record<string, number>; groups: number[][]; says: string } {
  const dims = [output[1], ...inputs.map(([, u]) => u)].map(dim6), groups = integerNullSpace([0, 1, 2, 3, 4, 5].map((r) => dims.map((d) => d[r]!)), dims.length);
  const withOut = groups.filter((g) => g[0] !== 0);
  if (groups.length === 1 && withOut.length === 1) {
    const g = withOut[0]!, exponents = Object.fromEntries(inputs.map(([n], i) => [n, -g[i + 1]! / g[0]!]));
    const terms = Object.entries(exponents).filter(([, e]) => e !== 0).map(([n, e]) => (e === 1 ? n : `${n}^${+e.toFixed(3)}`));
    return { forced: true, exponents, groups, says: `${output[0]} ∝ ${terms.join(' × ')}: the only product of powers their units allow (a constant is all that is left to measure)` };
  }
  return { forced: false, groups, says: groups.length ? `${groups.length} dimensionless groups: the answer is a function of them that units alone cannot give` : 'their units make no dimensionless group: there is no law among only these' };
}
/** Of a law in the book: whether its exponents are what its units force (so only its constant carries information), what
 *  units leave open, or (a fault) what units forbid. Its constants with units (R, F, g) count as quantities. */
export function forcedByUnits(l: Law): { verdict: 'forced' | 'open' | 'not a product of powers' | 'contradicts its units'; says: string } {
  const m = monomial(l.term); if (!m) return { verdict: 'not a product of powers', says: `${shapeOf(l)}: its shape comes from more than units` };
  const syms = Object.keys(m.e).filter((s) => Math.abs(m.e[s]!) > 1e-12);
  const ports = syms.map((s) => l.inputs.find((p) => p.sym === s)!);
  const free = ports.filter((p) => dim6(p.unit).every((x) => x === 0));
  const consts = m.k.filter((x) => Math.abs(x.e) > 1e-12);
  const qs: [string, string, number][] = [...ports.filter((p) => !free.includes(p)).map((p) => [p.sym, p.unit, m.e[p.sym]!] as [string, string, number]), ...consts.map((x) => [x.name, x.unit, x.e] as [string, string, number])];
  const d = discover([l.output.name, l.output.unit], qs.map(([n, u]) => [n, u]));
  if (!d.forced) return { verdict: 'open', says: free.length ? `${free.map((p) => p.name).join(', ')} ${free.length > 1 ? 'are' : 'is'} dimensionless: its exponent is the physics, not the units` : d.says };
  for (const [n, , e] of qs) if (Math.abs((d.exponents![n] ?? 0) - e) > 1e-9) return { verdict: 'contradicts its units', says: `${n}: units force ${d.exponents![n]}, the law has ${e}` };
  return { verdict: free.length ? 'open' : 'forced', says: free.length ? `its dimensional part is forced; ${free.map((p) => p.name).join(', ')} carry the rest` : `forced: ${d.says.split(':')[0]} — its constant ${num(m.c)} is all it adds` };
}

/** The graph in numbers: laws by principle and shape, families of shared math, what units force. */

// ---- laws chained through the quantities they share (docs/REALITY.md, step 4) -------------------------------------------
/** A value the problem knows: its name, the quantity it is, and, where a name alone would join it to the wrong port,
 *  the ports it is pinned to ("convection.A"). */
export interface Known { name: string; quantity: string; d: Derivation; pins?: string[] }
export interface ChainStep { law: string; lawName: string; kind: string; solved: string; gives: string; quantity: string; uses: Record<string, string>; value: number | null; unit: string; status: Status; note?: string }
export interface Chain {
  /** The answer, as a record that carries every law and value it rests on. */
  result: Derivation | null;
  /** The laws applied, in order, that the answer rests on (not every law the search fired). */
  steps: ChainStep[];
  /** What was taken to be what: a value of one name joined to a port of another, and values filled by convention. */
  assumed: string[];
  /** Where a law, applied to values the chain already had, gives one of them otherwise. */
  disagreements: string[];
  /** Where it does agree: a law the chain did not need, checked against what it found. */
  agreements: string[];
  /** Other laws that gave the target, and their values: more than one model fits. */
  alternatives: string[];
  /** The weakest evidence it rests on, and the weakest kind of law. */
  weakest: Status | null;
  weakestKind: string | null;
  says: string;
}
interface Var { name: string; quantity: string; d: Derivation; pins: string[]; step: number }
/** A way to a value: known, or a law solved for one of its ports from ways to the others. */
type Plan = { known: Var } | { l: Law; x: Port; args: Map<string, Plan>; cost: number; rank: number };

const KIND_RANK = ['fundamental', 'definition', 'geometry', 'derived', 'constitutive', 'approximation', 'empirical'];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9µ]+/g, ' ').trim();
/** Quantities that mean too many things to join by quantity alone: a length is a span, a diameter, a depth; these join
 *  by name or pin only. A force, a stress, a resistivity has one role in a problem, and joins by quantity. */
const BY_NAME = new Set(['length', 'area', 'volume', 'second-moment', 'section-modulus', 'time', 'temperature', 'temperature-difference', 'speed', 'angular-speed', 'frequency', 'angle', 'energy', 'concentration', 'amount', 'mass-flow', 'volume-flow']);
const byName = (q: QuantityDef) => BY_NAME.has(q.id) || q.dim.every((x) => x === 0);
const cost = (p: Plan): number => ('known' in p ? 0 : p.cost);

/**
 * From what is known, the laws chained to reach a quantity, as many steps as it takes, sought from the target back (so
 * only laws on a way to it are applied): a law is solved for the port that is the quantity wanted, every other port
 * known or itself found the same way. Of the ways found, the fewest laws, then the strongest kind of law, is taken; the
 * others reached are said, with their values. A port joins a known value by its pin; else by its name or symbol; else,
 * for a quantity with one role in a problem (a force, a stress, a resistivity), to the one value of that quantity known,
 * said as an assumption; a quantity of many roles (a length, an area, a time) joins only by name or pin. Where no single
 * law can be solved, two laws sharing the same two unknowns are solved together by Newton's method. Every law not on
 * the way whose values the chain has is checked against them: agreements and disagreements both said.
 */
export function chain(knowns: Known[], target: { quantity: string; name?: string }, o: { most?: number; laws?: readonly Law[]; gravity?: boolean } = {}): Chain {
  const laws = o.laws ?? BOOK, most = o.most ?? 6, gravity = o.gravity !== false;
  const vars: Var[] = knowns.map((k) => ({ name: k.name, quantity: k.quantity, d: k.d, pins: k.pins ?? [], step: -1 }));
  const steps: ChainStep[] = [], assumed: string[] = [], disagreements: string[] = [], agreements: string[] = [], alternatives: string[] = [];
  const tq = quantityById(target.quantity), portQ = (l: Law, p: Port) => quantityOf(l, p);
  const rank = (l: Law) => KIND_RANK.indexOf(KINDS[l.id]?.[0] ?? 'derived');
  let g: Var | undefined;
  /** The known value a port joins: undefined when none, null when more than one could and none is named. */
  const bind = (l: Law, p: Port, pool: Var[] = vars): Var | null | undefined => {
    const pinned = pool.find((v) => v.pins.includes(`${l.id}.${p.sym}`)); if (pinned) return pinned;
    const q = portQ(l, p); if (!q) return undefined;
    const same = pool.filter((v) => v.quantity === q.id && !v.pins.length);
    const named = same.filter((v) => norm(v.name) === norm(p.name) || v.name === p.sym);
    if (named.length === 1) return named[0];
    // a port that means any value of its quantity takes the one value of it there is; a port that means one value in
    // particular (a critical load, a yield strength) takes only a value of its own name
    // a port that means any value of its quantity takes the one value of it there is that is itself named plainly (a
    // weight into σ = F/A); a port or a value that means one in particular (a critical load, an applied voltage) joins
    // only by name
    const plain = same.filter((v) => isPlain(q, v.name));
    if (!byName(q) && isPlain(q, p.name)) { if (plain.length === 1) return plain[0]; if (plain.length > 1) return null; }
    if (q.id === 'acceleration' && gravity && /gravity/i.test(p.name)) return (g ??= { name: 'standard gravity', quantity: 'acceleration', d: ofLeaf(CONST.g), pins: [], step: -1 });
    return undefined;
  };
  /** The known value a quantity wanted by a port's name is. */
  const knownFor = (q: QuantityDef, name?: string) => vars.find((v) => v.quantity === q.id && (!name || norm(v.name) === norm(name) || !byName(q) && isPlain(q, name) && isPlain(q, v.name) && vars.filter((w) => w.quantity === q.id && isPlain(q, w.name)).length === 1));
  const memo = new Map<string, Plan | null>();
  const plans = (q: QuantityDef, name: string | undefined, depth: number, path: Set<string>): Plan[] => {
    const out: Plan[] = [];
    for (const l of laws) {
      if (path.has(`law:${l.id}`)) continue;
      const inTerm = new Set(varsOf(l.term).map((v) => v.sym));
      for (const x of [l.output, ...l.inputs.filter((p) => inTerm.has(p.sym))]) {
        if (portQ(l, x)?.id !== q.id || (name && norm(x.name) !== norm(name) && x.sym !== name && (byName(q) || !isPlain(q, name)))) continue;
        const args = new Map<string, Plan>(), taken = new Set<Var>(); let ok = true;
        for (const r of [...l.inputs, l.output]) {
          if (r === x) continue;
          const v = bind(l, r);
          if (v === null) { ok = false; break; }
          if (v) { if (taken.has(v)) { ok = false; break; } taken.add(v); args.set(r.sym, { known: v }); continue; }
          const rq = portQ(l, r); if (!rq || depth <= 1) { ok = false; break; }
          const sub = way(rq, r.name, depth - 1, new Set([...path, `law:${l.id}`])); if (!sub) { ok = false; break; }
          args.set(r.sym, sub);
        }
        if (ok) out.push({ l, x, args, cost: 1 + [...args.values()].reduce((t, a) => t + cost(a), 0), rank: rank(l) });
      }
    }
    return out.sort((a, b) => cost(a) - cost(b) || ('rank' in a && 'rank' in b ? a.rank - b.rank : 0));
  };
  const way = (q: QuantityDef, name: string | undefined, depth: number, path: Set<string>): Plan | null => {
    const v = knownFor(q, name); if (v) return { known: v };
    const key = `${q.id}|${byName(q) ? norm(name ?? '') : ''}`;
    if (path.has(key)) return null;
    const mk = `${key}|${depth}`; if (memo.has(mk)) return memo.get(mk)!;
    memo.set(mk, null);
    const best = plans(q, name, depth, new Set([...path, key]))[0] ?? null;
    memo.set(mk, best);
    return best;
  };
  // the plan worked out: each law once, its value a record that carries what it rests on
  const done = new Map<Plan, Var | null>();
  const run = (p: Plan): Var | null => {
    if ('known' in p) return p.known;
    if (done.has(p)) return done.get(p)!;
    const env: Record<string, Derivation> = {}, uses: Record<string, string> = {};
    for (const [sym, a] of p.args) { const v = run(a); if (!v || v.d.value === null) { done.set(p, null); return null; } env[sym] = v.d; uses[sym] = v.name; }
    let d: Derivation;
    try { d = p.x === p.l.output ? apply(p.l, env, p.x.name) : solve(p.l.id, p.x.sym, env, p.x.name); } catch { done.set(p, null); return null; }
    if (p.x !== p.l.output && d.value !== null) { const back = apply(p.l, { ...Object.fromEntries(p.l.inputs.filter((q) => q !== p.x).map((q) => [q.sym, env[q.sym]!])), [p.x.sym]: d }); if (back.refusal) d = { ...back, name: p.x.name, value: null }; }
    for (const [sym, a] of p.args) { if (!('known' in a)) continue; const r = [...p.l.inputs, p.l.output].find((q) => q.sym === sym)!, v = a.known; if (v === g) assumed.push('gravity is standard gravity, 9.80665 m/s² (ISO 80000-3)'); else if (norm(v.name) !== norm(r.name) && v.name !== r.sym && !v.pins.length) assumed.push(`${v.name} is taken as the ${r.name} (${r.sym}) of ${p.l.name}`); }
    for (const [sym, a] of p.args) if (!('known' in a)) { const v = done.get(a), r = [...p.l.inputs, p.l.output].find((q) => q.sym === sym)!; if (v && norm(v.name) !== norm(r.name)) assumed.push(`${v.name} is taken as the ${r.name} (${r.sym}) of ${p.l.name}`); }
    steps.push({ law: p.l.id, lawName: p.l.name, kind: KINDS[p.l.id]?.[0] ?? 'derived', solved: p.x.sym, gives: p.x.name, quantity: portQ(p.l, p.x)!.id, uses, value: d.value === null ? null : valueIn(d, p.x.unit), unit: p.x.unit, status: d.status, ...(d.refusal ? { note: `${p.l.name} does not hold here: it needs ${d.refusal.domain}` } : {}) });
    const v: Var = { name: p.x.name, quantity: portQ(p.l, p.x)!.id, d, pins: [], step: steps.length - 1 };
    done.set(p, v); vars.push(v);
    return d.value === null ? null : v;
  };
  let end: Var | null = null;
  const all = (() => { const k = target.name ? vars.find((v) => v.quantity === tq.id && norm(v.name) === norm(target.name!)) : knownFor(tq); if (k) return [{ known: k } as Plan]; for (let depth = 1; depth <= most; depth++) { memo.clear(); const ps = plans(tq, target.name, depth, new Set([`${tq.id}|${byName(tq) ? norm(target.name ?? '') : ''}`])); if (ps.length) return ps; } return []; })();
  if (all.length) {
    end = run(all[0]!);
    // the other ways that reach it, and what they give
    for (const alt of all.slice(1, 4)) {
      const before = steps.length, v = run(alt); steps.splice(before);
      if (!v || v.d.value === null || !end || end.d.value === null || 'known' in alt) continue;
      const same = Math.abs(v.d.value - end.d.value) <= 1e-6 * Math.abs(end.d.value);
      alternatives.push(`${alt.l.name} (${KINDS[alt.l.id]?.[0] ?? 'derived'}, ${alt.cost} law${alt.cost === 1 ? '' : 's'}) also gives ${v.name} = ${num(fromSI(v.d.value, tq.unit))} ${tq.unit}${same ? ', the same' : ''}`);
      if (!same) disagreements.push(`${alt.l.name} gives ${num(fromSI(v.d.value, tq.unit))} ${tq.unit} where ${(all[0] as { l: Law }).l?.name ?? 'the chain'} gives ${num(fromSI(end.d.value, tq.unit))} ${tq.unit}`);
    }
  }
  // nothing found law by law: two laws that share the same two unknowns, the rest known, solved together
  if (!end) {
    type Half = { l: Law; unk: Port[]; binds: Map<string, Var> };
    const halves: Half[] = [];
    for (const l of laws) {
      const inTerm = new Set(varsOf(l.term).map((v) => v.sym)), binds = new Map<string, Var>(), unk: Port[] = []; let ok = true;
      for (const p of [...l.inputs, l.output]) { const v = bind(l, p); if (v === null) { ok = false; break; } if (v) binds.set(p.sym, v); else if (p === l.output || inTerm.has(p.sym)) unk.push(p); else { ok = false; break; } }
      if (ok && unk.length === 2 && unk.every((p) => portQ(l, p)) && portQ(l, unk[0]!)!.id !== portQ(l, unk[1]!)!.id) halves.push({ l, unk, binds });
    }
    const qsOf = (h: Half) => h.unk.map((p) => portQ(h.l, p)!.id).sort().join();
    outer: for (let i = 0; i < halves.length; i++) for (let j = i + 1; j < halves.length; j++) {
      const A = halves[i]!, B = halves[j]!;
      if (qsOf(A) !== qsOf(B) || !A.unk.some((p) => portQ(A.l, p)!.id === tq.id)) continue;
      // the two laws' unknowns are the same two things only where their names say so, or where each is plain
      if (!A.unk.every((p) => { const q = portQ(A.l, p)!, o = B.unk.find((r) => portQ(B.l, r)!.id === q.id)!; return norm(p.name) === norm(o.name) || (!byName(q) && isPlain(q, p.name) && isPlain(q, o.name)); })) continue;
      const qs = A.unk.map((p) => portQ(A.l, p)!.id), pa = A.unk, pb = qs.map((q) => B.unk.find((p) => portQ(B.l, p)!.id === q)!);
      const resid = (z: number[]) => !z.every(Number.isFinite) ? [NaN, NaN] : [A, B].map((H, k) => {
        const ps = k ? pb : pa, env: Record<string, Derivation> = {}; for (const [sym, v] of H.binds) env[sym] = v.d;
        ps.forEach((p, n) => { env[p.sym] = setting(p.name, fromSI(z[n]!, p.unit), p.unit, 'the joint solution'); });
        const d = apply({ ...H.l, domain: [] }, env), want = env[H.l.output.sym]!.value!;
        return d.value === null ? NaN : (d.value - want) / Math.max(Math.abs(want), 1e-300);
      });
      for (const start of [1, 10, 0.1, 100, 0.01]) {
        let z = [start, start], ok = false;
        for (let it = 0; it < 100 && !ok; it++) {
          const r = resid(z); if (!r.every(Number.isFinite)) break;
          if (Math.max(...r.map(Math.abs)) < 1e-12) { ok = true; break; }
          const J = [0, 1].map((row) => [0, 1].map((col) => { const h = 1e-7 * Math.max(Math.abs(z[col]!), 1e-12), zz = [...z]; zz[col]! += h; return (resid(zz)[row]! - r[row]!) / h; }));
          const dz = solveLinear(J, r.map((x) => -x)); if (!dz) break;
          z = z.map((x, n) => x + dz[n]!);
        }
        if (!ok) continue;
        const kind = [KINDS[A.l.id]?.[0] ?? 'derived', KINDS[B.l.id]?.[0] ?? 'derived'].sort((a, b) => KIND_RANK.indexOf(b) - KIND_RANK.indexOf(a))[0]!;
        pa.forEach((p, n) => {
          const d = ofLeaf(leaf(p.name, fromSI(z[n]!, p.unit), p.unit, { class: 'assumed', by: 'the law graph', grounds: `${A.l.name} and ${B.l.name} solved together for ${pa.map((x) => x.name).join(' and ')} by Newton's method` }));
          steps.push({ law: `${A.l.id} + ${B.l.id}`, lawName: `${A.l.name} with ${B.l.name}`, kind, solved: p.sym, gives: p.name, quantity: qs[n]!, uses: Object.fromEntries([...A.binds, ...B.binds].map(([sym, v]) => [sym, v.name])), value: valueIn(d, p.unit), unit: p.unit, status: 'assumed' });
          const v: Var = { name: p.name, quantity: qs[n]!, d, pins: [], step: steps.length - 1 }; vars.push(v);
          if (qs[n] === tq.id) end = v;
        });
        break outer;
      }
    }
  }
  // every other law whose values are all known or found, checked against them: what was given as well as what was found
  {
    for (const l of laws) {
      if (steps.some((st) => st.law === l.id || st.law.split(' + ').includes(l.id))) continue;
      const binds = new Map<string, Var>(); let ok = true;
      for (const p of [...l.inputs, l.output]) { const v = bind(l, p); if (!v || [...binds.values()].includes(v)) { ok = false; break; } binds.set(p.sym, v); }
      if (!ok || [...binds.values()].every((v) => v === g)) continue;
      const d = apply(l, Object.fromEntries(l.inputs.map((p) => [p.sym, binds.get(p.sym)!.d]))), have = binds.get(l.output.sym)!;
      if (d.value === null || have.d.value === null) continue;
      const tol = 1e-6 * Math.abs(have.d.value) + 2 * Math.hypot(d.uncertainty ?? 0, have.d.uncertainty ?? 0);
      (Math.abs(d.value - have.d.value) <= tol ? agreements : disagreements).push(`${l.name} gives ${have.name} = ${num(fromSI(d.value, l.output.unit))} ${l.output.unit}; the chain has ${num(fromSI(have.d.value, l.output.unit))} ${l.output.unit}`);
    }
  }
  const kinds = steps.map((st) => st.kind).sort((a, b) => KIND_RANK.indexOf(b) - KIND_RANK.indexOf(a));
  const fin = end as Var | null;
  const says = !fin || fin.d.value === null ? `no chain of laws reaches ${tq.name}${target.name ? ` (${target.name})` : ''} from ${knowns.map((k) => k.name).join(', ')}${steps.some((s) => s.note) ? `: ${steps.find((s) => s.note)!.note}` : ''}` : `${fin.name} = ${num(valueIn(fin.d, tq.unit) ?? NaN)} ${tq.unit}, by ${steps.length} law${steps.length === 1 ? '' : 's'}: ${steps.map((st) => st.lawName).join(' → ') || 'it was known'}`;
  return { result: fin && fin.d.value !== null ? fin.d : null, steps, assumed: [...new Set(assumed)], disagreements, agreements, alternatives, weakest: fin ? fin.d.status : null, weakestKind: kinds[0] ?? null, says };
}

/** Each law checked against the rest of the book: its worked example's inputs given, its output sought through the other
 *  laws alone. Where another way reaches it, the two must agree; where they do not, one is an approximation of the other
 *  or a different model of the same thing, and both are said. */
export function crossCheck(laws: readonly Law[] = BOOK, most = 3): { law: string; agree: boolean; own: number; other: number; unit: string; by: string[] }[] {
  const out: { law: string; agree: boolean; own: number; other: number; unit: string; by: string[] }[] = [];
  for (const l of laws) {
    const ex = l.example; if (!ex) continue;
    const knowns = l.inputs.filter((p) => ex.inputs[p.sym] !== undefined && quantityOf(l, p)).map((p) => ({ name: p.name, quantity: quantityOf(l, p)!.id, d: setting(p.name, ex.inputs[p.sym]!, p.unit, 'the worked example') }));
    const q = quantityOf(l, l.output); if (!q) continue;
    const c = chain(knowns, { quantity: q.id, name: l.output.name }, { laws: laws.filter((x) => x !== l), most });
    if (!c.result || c.result.value === null || !c.steps.length) continue;
    const other = fromSI(c.result.value, l.output.unit);
    out.push({ law: l.id, agree: Math.abs(other - ex.output) <= 1e-6 * Math.abs(ex.output), own: ex.output, other, unit: l.output.unit, by: c.steps.map((s) => s.law) });
  }
  return out;
}
