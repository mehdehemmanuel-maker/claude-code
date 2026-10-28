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
import { dimOf, integerNullSpace, sameDim, type Dim } from './dimension';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { apply, invert, invertFound, type Law } from './law';
import { div, leaf, mul, OPERATORS, pow, substitute, variable, type Term } from './term';
import { bracketsOf, type Found } from './numeric';
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
/** The amount of substance a unit carries: the units here keep the mole dimensionless, but finding laws needs it counted
 *  (so that moles a volume and moles a volume a second cannot hide in a volume). */
export function molesOf(unit: string): number {
  const [top, ...under] = unit.split('/'), count = (s: string) => [...s.matchAll(/\bmol(?:\^(-?\d+))?\b/g)].reduce((a, m) => a + Number(m[1] ?? 1), 0);
  return count(top ?? '') - under.reduce((a, s) => a + count(s), 0);
}
const dim6 = (unit: string): number[] => [...dimOf(unit), molesOf(unit)];
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

// ---- routes between quantities ----------------------------------------------------------------------------------------------
/** The laws that make a quantity of a dimension from quantities of dimensions at hand, in one step or two. */
export function routes(target: string, have: string[], laws: readonly Law[] = BOOK): string[][] {
  const t = dimOf(target), hv = have.map(dimOf), has = (d: Dim) => hv.some((h) => sameDim(h, d));
  const direct = laws.filter((l) => sameDim(dimOf(l.output.unit), t) && l.inputs.every((p) => has(dimOf(p.unit))));
  const out: string[][] = direct.map((l) => [l.id]);
  const makers = laws.filter((l) => l.inputs.every((p) => has(dimOf(p.unit))));
  for (const l of laws) {
    if (!sameDim(dimOf(l.output.unit), t) || direct.includes(l)) continue;
    const missing = l.inputs.filter((p) => !has(dimOf(p.unit)));
    const via = missing.map((p) => makers.find((m) => sameDim(dimOf(m.output.unit), dimOf(p.unit))));
    if (via.every(Boolean)) out.push([...new Set(via.map((m) => m!.id)), l.id]);
  }
  return out;
}

/** The graph in numbers: laws by principle and shape, families of shared math, what units force. */
