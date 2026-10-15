// A law run on actual numbers, and the shape of the math it is.
//
// `time.ts` is the system: it roots every law in time, derives the whole feed graph from the dimensions and finds
// what the book lacks. This file is the other verb — APPLYING a law to values. `step` binds records to a law's ports,
// checks each against its port's dimension and returns a record carrying every input it rests on; `breakdown` reads
// that tree back down to each measurement and estimate and where it came from. Nothing here knows about the tree,
// and the tree does not know about values: `time.ts` imports `shapeOf` from here and nothing goes the other way.
//
// Split out of `substrate/lawgraph.ts` in Run 8i, which held both verbs plus two hand-written knowledge tables under
// one name and could not see `time.ts` at all. The knowledge is now `book/principles.ts`; the file is gone.

import { BOOK, lawById, lawByHash } from '../book';
import { dimOf, sameDim } from '../lang/dimension';
import { evaluate, ofLeaf, type Derivation } from '../lang/evaluate';
import { apply, invert, type Law } from '../lang/law';
import { div, leaf, mul, OPERATORS, pow, substitute, variable, type Term } from '../lang/term';
import { fromSI, parseUnit } from '../../ganglia/units';

// ---- records --------------------------------------------------------------------------------------------------------
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
  if (!bracket) throw new Error(`${id}: ${sym} is not a power in it; give a bracket to invert in`);
  const x = invert(l, sym, out.value!, env, bracket, (n, v, un) => setting(n, v, un, 'the inversion'));
  return x === null ? ofLeaf(leaf(name ?? port.name, null, port.unit, { class: 'unknown' })) : ofLeaf(leaf(name ?? port.name, fromSI(x, port.unit), port.unit, { class: 'assumed', by: 'the law graph', grounds: `${l.name} solved numerically for ${port.name}` }));
}
/** A record's value in a unit. */
export const valueIn = (d: Derivation, unit = d.unit): number | null => (d.value === null ? null : fromSI(d.value, unit));
/** A number said at a readable precision. One owner: `time.ts` and `derive.ts` report numbers with it too.
 *  NOT `ask/generate.ts`'s `num`, which parses a string INTO a number — the opposite direction, hence two names. */
export const readable = (x: number) => (x === 0 ? '0' : Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3 ? x.toExponential(3) : +x.toPrecision(4) + '');
/** How a record says itself: its value in its unit, its origin or its law. */
export function says(d: Derivation, unit = d.unit): string { const v = valueIn(d, unit); return `${d.name} = ${v === null ? (d.refusal ? `refused (${d.refusal.domain})` : 'unknown') : readable(v)}${unit === '-' || unit === '1' ? '' : ` ${unit}`}`; }
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
  if (t.kind === 'leaf') return t.value === null ? null : { c: t.value, e: {}, k: sameDim(t.dim, [0, 0, 0, 0, 0]) && !/mol/.test(t.unit) ? [] : [{ name: t.name, unit: t.unit, e: 1 }] };
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
