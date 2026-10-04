// WHY, IMPACT and staleness. WHY walks a record down to leaves and is total: every path ends in a leaf with an
// origin, or the walk throws. IMPACT finds every record that rests on a hash (a law, a leaf, a record). A changed
// law marks exactly the records that cite it, transitively.

import type { Derivation } from './evaluate';
import { leavesOf, type Leaf } from './term';

export interface WhyNode {
  name: string;
  value: number | null;
  unit: string;
  status: Derivation['status'];
  /** The law or definition cited, when the record is an evaluation. */
  law?: string;
  /** The origin, when the record is a leaf. */
  origin?: Leaf['origin'];
  because?: string;
  refusal?: Derivation['refusal'];
  inputs: Record<string, WhyNode>;
  /** The leaves written into the term itself (exact constants, declared bounds). */
  constants: { name: string; value: number | null; origin: Leaf['origin'] }[];
  hash: string;
}

/** The whole derivation of a record, down to leaves. Throws if any path ends anywhere else. */
export function why(d: Derivation, depth = 0): WhyNode {
  if (depth > 200) throw new Error(`why: ${d.name} is deeper than any derivation should be`);
  const node: WhyNode = { name: d.name, value: d.value, unit: d.unit, status: d.status, inputs: {}, constants: d.term.kind === 'leaf' ? [] : leavesOf(d.term).map((l) => ({ name: l.name, value: l.value, origin: l.origin })), hash: d.hash };
  if (d.law) node.law = d.law;
  if (d.because) node.because = d.because;
  if (d.refusal) node.refusal = d.refusal;
  const syms = Object.keys(d.inputs);
  if (d.term.kind === 'leaf') { node.origin = d.term.origin; return node; }
  if (!syms.length) {
    if (d.status === 'unobserved' || d.status === 'contradicted') return node;
    throw new Error(`why: ${d.name} has no inputs and is not a leaf: an untraced value`);
  }
  for (const s of syms) node.inputs[s] = why(d.inputs[s]!, depth + 1);
  return node;
}

/** The leaves a record rests on, each once. */
export function leavesUnder(d: Derivation, out = new Map<string, Leaf>()): Leaf[] {
  for (const l of leavesOf(d.term)) out.set(l.hash, l);
  for (const i of Object.values(d.inputs)) leavesUnder(i, out);
  return [...out.values()];
}

/** Every hash a record rests on: its own, its law's, its inputs' and theirs, its leaves'. */
export function closure(d: Derivation, out = new Set<string>()): Set<string> {
  if (out.has(d.hash)) return out;
  out.add(d.hash);
  if (d.law) out.add(d.law);
  for (const c of d.cites ?? []) out.add(c);
  for (const l of leavesOf(d.term)) out.add(l.hash);
  for (const i of Object.values(d.inputs)) closure(i, out);
  return out;
}

/** Whether the record rests on the hash (a law, a leaf, or another record). */
export const cites = (d: Derivation, hash: string) => closure(d).has(hash);

/** The records among `records` that rest on `hash`. */
export const impact = (hash: string, records: Derivation[]) => records.filter((d) => cites(d, hash));

/** The records that `changed` hashes make stale: exactly those that cite one of them. */
export const stale = (records: Derivation[], changed: string[]) => records.filter((d) => { const c = closure(d); return changed.some((h) => c.has(h)); });

/**
 * WHY as text, one line per node. A derivation is a graph, not a tree: a record or a leaf several inputs rest on is
 * shown in full where it is first reached; where it is reached again, a derived record is named as shown above and
 * the leaves are named together on one line.
 */
export function explain(n: WhyNode, indent = '', seen = new Set<string>()): string {
  const v = n.value === null ? `(${n.status}${n.because ? `: ${n.because}` : ''}${n.refusal ? `: outside "${n.refusal.domain}"` : ''})` : `${fmt(n.value)} ${n.unit} [${n.status}]`;
  const by = n.origin ? ` ← ${n.origin.class}${n.origin.source ? `: ${n.origin.source}` : ''}${n.origin.grounds ? ` (${n.origin.grounds})` : ''}${n.origin.by ? ` by ${n.origin.by}` : ''}` : n.law ? ` ← ${n.law.length === 16 ? `law ${n.law}` : n.law}` : '';
  const lines = [`${indent}${n.name} = ${v}${by}`];
  const derived = Object.keys(n.inputs).length > 0;
  if (derived && seen.has(n.hash)) return `${lines[0]} (shown above)`;
  seen.add(n.hash);
  const again: string[] = [];
  for (const [s, c] of Object.entries(n.inputs)) {
    if (!Object.keys(c.inputs).length && seen.has(c.hash)) { again.push(`${s}: ${c.name}`); continue; }
    lines.push(explain(c, `${indent}  ${s}: `, seen));
  }
  if (again.length) lines.push(`${indent}  and, shown above: ${again.join('; ')}`);
  return lines.join('\n');
}

const fmt = (x: number) => (Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(4) : Number(x.toPrecision(6)).toString());
