// The certificates Nexus hands its kernel (spec 10, T18 and T23; research 31; constitution C29): a law's dimensions, a
// law node's value at the point it ran, a wire's two units. This file builds certificates and is not trusted: the kernel
// (`src/kernel/`) checks each one by itself, and what a certificate leans on outside the kernel is named in it
// (`trustedBase`): the translation of a law's term here, and each value's conversion into SI by `src/ganglia/units.ts`.

import { check, type Certificate, type Verdict } from '../kernel';
import { toSI } from '../ganglia/units';
import { varsOf, type Term } from './term';
import type { Law } from './law';
import { BOOK } from './book';
import { LIBRARY, defaultsOf, portsOf } from './blocks';
import { edgesOf, nodesOf, type Board } from './boards';
import { isWire, type Engine } from './dataflow';

const OPS: Record<string, string> = { add: 'add', sub: 'sub', mul: 'mul', div: 'div', neg: 'neg', abs: 'abs', min: 'min', max: 'max', exp: 'exp', ln: 'ln', log2: 'log2', log10: 'log10' };
const TRANSLATED = 'the translation of the law\'s term into the kernel\'s terms (src/nexus/certify.ts)';
const IN_SI = 'each value\'s conversion into SI (src/ganglia/units.ts)';

/** A double as text the kernel reads exactly: its shortest decimal (the double's own digits, not its binary tail). */
export function numText(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`not a finite number: ${x}`);
  return String(x).replace(/e\+/, 'e');
}
/** An exponent as the fraction it stands for when it is one (1/3, not 0.3333333333333333), else its decimal. */
export function exponentText(k: number): string {
  for (let q = 1; q <= 12; q++) { const p = Math.round(k * q); if (Math.abs(k - p / q) < 1e-12) return q === 1 ? `${p}` : `${p}/${q}`; }
  return numText(k);
}

/** A term of the book in the kernel's terms: variables by symbol, each operator by name (one the kernel lacks, a sine, an
 *  integral, is passed on as it is and refused there as undecided), and each constant as a named quantity of its own
 *  (`_k1`, …) with its unit and its SI value, so its dimension is checked with the rest (a bare number has none). */
export function kernelTerm(t: Term, consts: Record<string, { unit: string; si: number }> = {}): unknown {
  switch (t.kind) {
    case 'leaf': {
      if (t.value === null) throw new Error(`${t.name} has no value`);
      if (t.dim.every((x) => x === 0)) return ['num', numText(t.value)];
      const name = Object.entries(consts).find(([, c]) => c.si === t.value && c.unit === t.unit)?.[0] ?? `_k${Object.keys(consts).length + 1}`;
      consts[name] = { unit: t.unit, si: t.value }; return ['var', name];
    }
    case 'var': return ['var', t.sym];
    case 'app': return t.op === 'pow' ? ['pow', kernelTerm(t.args[0]!, consts), exponentText(t.k ?? Number.NaN)] : [OPS[t.op] ?? t.op, ...t.args.map((a) => kernelTerm(a, consts))];
    case 'bind': return ['integral'];
  }
}

const cert = (kind: Certificate['kind'], claim: unknown, trustedBase: string[]): Certificate => ({ kind, claim, trustedBase, producer: 'nexus/certify' });

/** A law's term has its output's dimension: no values, decided from the units of its ports. */
export function lawDims(l: Law): Certificate {
  const consts: Record<string, { unit: string; si: number }> = {}, term = kernelTerm(l.term, consts);
  const vars = { ...Object.fromEntries(varsOf(l.term).map((v) => [v.sym, l.inputs.find((p) => p.sym === v.sym)?.unit ?? v.unit])), ...Object.fromEntries(Object.entries(consts).map(([k, c]) => [k, c.unit])) };
  return cert('dims', { law: { term, vars, out: l.output.unit } }, [TRANSLATED]);
}

/** A law node's value at the point it ran: each input and the output in their port units, put into SI here; the kernel
 *  re-works the term at that point and says whether the output lies within `rel` of it. */
export function lawWitness(l: Law, inputs: Record<string, number>, output: number, rel = 1e-9): Certificate {
  const consts: Record<string, { unit: string; si: number }> = {}, term = kernelTerm(l.term, consts), at: Record<string, string> = {};
  for (const v of varsOf(l.term)) { const p = l.inputs.find((q) => q.sym === v.sym), x = inputs[v.sym]; if (!p || x === undefined) throw new Error(`${l.id}: no value for ${v.sym}`); at[v.sym] = numText(toSI(x, p.unit)); }
  for (const [k, c] of Object.entries(consts)) at[k] = numText(c.si);
  const y = toSI(output, l.output.unit);
  return cert('witness', { term, at, value: numText(y), tol: { rel: numText(rel), abs: y === 0 ? '1e-12' : '0' } }, [TRANSLATED, IN_SI]);
}

/** A wire joins two units of one dimension. */
export const wireDims = (from: string, to: string): Certificate => cert('dims', { wire: { from, to } }, []);

/** A law node's own report of the point it ran at (its `_witness`, every value in SI), as a certificate. */
export function nodeWitness(l: Law, w: { at: Record<string, number>; value: number; rel: number }): Certificate {
  const consts: Record<string, { unit: string; si: number }> = {}, term = kernelTerm(l.term, consts), at: Record<string, string> = {};
  for (const v of varsOf(l.term)) { const x = w.at[v.sym]; if (typeof x !== 'number') throw new Error(`${l.id}: the node gave no value for ${v.sym}`); at[v.sym] = numText(x); }
  for (const [k, c] of Object.entries(consts)) at[k] = numText(c.si);
  return cert('witness', { term, at, value: numText(w.value), tol: { rel: numText(w.rel), abs: w.value === 0 ? '1e-12' : '0' } }, [TRANSLATED, 'the values the node says it ran at, in SI (its own report)']);
}

/** What changed between two boards: nodes added, taken away and set otherwise; wires made and cut. Worked out from the
 *  boards themselves, never from what the AI said it did. */
export function diffOf(before: Board, after: Board): { added: string[]; removed: string[]; changed: string[]; wired: string[]; cut: string[] } {
  const a = new Map(nodesOf(before).map((n) => [n.id, before.nodes[n.id]!])), b = new Map(nodesOf(after).map((n) => [n.id, after.nodes[n.id]!]));
  const w = (bd: Board) => new Set(edgesOf(bd).filter(isWire).map((e) => `${e.from}.${e.out}>${e.to}.${e.in}`)), wa = w(before), wb = w(after);
  return { added: [...b.keys()].filter((k) => !a.has(k)), removed: [...a.keys()].filter((k) => !b.has(k)),
    changed: [...b.keys()].filter((k) => a.has(k) && (a.get(k)!.block !== b.get(k)!.block || JSON.stringify(a.get(k)!.set ?? {}) !== JSON.stringify(b.get(k)!.set ?? {}))),
    wired: [...wb].filter((x) => !wa.has(x)), cut: [...wa].filter((x) => !wb.has(x)) };
}

/** Every certificate a board's run gives: each law node that ran, its value at the point it ran; each wire joining two
 *  ports with units, their dimensions. `only` limits it to the nodes named (what a change touched). */
export function certificatesOf(board: Board, engine: Engine, only?: Set<string>): { what: string; certificate: Certificate }[] {
  const out: { what: string; certificate: Certificate }[] = [];
  for (const n of nodesOf(board)) {
    if (only && !only.has(n.id)) continue;
    const blk = board.nodes[n.id]?.block ?? '', st = engine.state.get(n.id), w = st?.out?._witness as { law: string; at: Record<string, number>; value: number; rel: number } | undefined;
    if (!blk.startsWith('law.') || st?.status !== 'ok' || !w) continue;
    const l = BOOK.find((x) => x.id === w.law); if (!l || typeof w.value !== 'number') continue;
    try { out.push({ what: `${n.id} (${l.name}) at the point it ran`, certificate: nodeWitness(l, w) }); } catch { /* a node that did not say every value: no certificate, said by its absence */ }
  }
  for (const e of edgesOf(board).filter(isWire)) {
    if (only && !only.has(e.to) && !only.has(e.from)) continue;
    if (!e.out || !e.in) continue; const pf = portOf(board, e.from, e.out, 'outputs'), pt = portOf(board, e.to, e.in, 'inputs');
    if (pf?.unit && pt?.unit && pf.unit !== '-' && pt.unit !== '-') out.push({ what: `the wire ${e.from}.${e.out} → ${e.to}.${e.in} (${pf.unit} into ${pt.unit})`, certificate: wireDims(pf.unit, pt.unit) });
  }
  return out;
}
function portOf(board: Board, id: string, name: string, side: 'inputs' | 'outputs') {
  const n = board.nodes[id], b = n?.block ? LIBRARY.get(n.block) : undefined;
  return b ? portsOf(b, { ...defaultsOf(b), ...(n!.set ?? {}) })[side].find((p) => p.name === name) : undefined;
}

export { check, type Certificate, type Verdict };
