// The journal: the one append-only record. What is contributed to the state (a leaf given or measured, a relation, a
// constraint, a withdrawal) and what the state was found to lack (an anomaly) are entries, and nothing else is the
// truth: the state is a fold over them, so it is rebuilt exactly from them after any stop. Derivations are not kept
// here as truth; they are computed again from the contributions. An entry, once written, is never changed or removed:
// a change is a later entry.
//
// Within a session the journal also keeps records, comparisons and choices for the studies that run realizations.
// Those are recomputable and are not persisted.

import type { Comparison } from './observe';
import type { Derivation } from './evaluate';
import { app, integral, leafHashOf, variable, type Leaf, type Term } from './term';

/**
 * Where a quantity is: a place and the quantity there, as `place/quantity`. The place is opaque until the domain
 * exists (docs/NEXUS-FROM-REALITY.md section 14, step 2): it is a name for a subdomain, never a kind.
 */
export type Address = string;
export const address = (place: string, quantity: string): Address => `${place}/${quantity}`;

/** What can be contributed to the state. */
export type Contribution =
  /** A value at an address, with its origin: given by someone, measured by something, assumed with grounds. */
  | { kind: 'leaf'; at: Address; leaf: Leaf }
  /** A relation that binds an address from others: a law's term over its ports, or a definition. */
  | { kind: 'relation'; id: string; out: Address; name: string; unit: string; term: Term; ports: Record<string, Address>; law: string; domain?: { says: string; holds: Term }[] }
  /** A predicate over addresses that must hold, and whose it is: a law's validity, a person's want. */
  | { kind: 'constraint'; id: string; says: string; by: string; holds: Term; ports: Record<string, Address> }
  /** A place in the domain: a box, its centre, its turn and its half-extents, every number a leaf. */
  | { kind: 'place'; id: string; centre: [Leaf, Leaf, Leaf]; turn: [Leaf, Leaf, Leaf, Leaf]; half: [Leaf, Leaf, Leaf] }
  /** A relation or a constraint withdrawn, with why. */
  | { kind: 'withdraw'; id: string; why: string };

export type Entry =
  | { kind: 'contribution'; at: number; contribution: Contribution }
  /** A gap the state was found to have when an entry was applied, kept so it is never lost. */
  | { kind: 'anomaly'; at: number; where: Address; says: string; hashes: string[] }
  | { kind: 'note'; at: number; text: string }
  // within a session only
  | { kind: 'record'; at: number; record: Derivation }
  | { kind: 'comparison'; at: number; comparison: Comparison }
  | { kind: 'choice'; at: number; why: Derivation; among: number; label: string }
  | { kind: 'refusal'; at: number; what: string; domain: string };

type Without<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Persisted = Extract<Entry, { kind: 'contribution' | 'anomaly' | 'note' }>;
const persisted = (e: Entry): e is Persisted => e.kind === 'contribution' || e.kind === 'anomaly' || e.kind === 'note';

/** Where persisted entries go and come back from: memory in tests, a file in Node, a browser store on a headset. */
export interface Sink { load(): unknown[]; append(e: unknown): void }
export class MemorySink implements Sink {
  readonly lines: string[] = [];
  load() { return this.lines.map((l) => JSON.parse(l) as unknown); }
  append(e: unknown) { this.lines.push(JSON.stringify(e)); }
}

/** Append-only. An entry, once written, is never changed or removed. */
export class Journal {
  private readonly entries: Entry[] = [];
  private seq = 0;
  constructor(private readonly sink?: Sink) {}
  append(e: Without<Entry, 'at'>): Entry {
    const entry = Object.freeze({ ...e, at: this.seq++ }) as Entry;
    this.entries.push(entry);
    if (this.sink && persisted(entry)) this.sink.append(entry);
    return entry;
  }
  /** Entries read back from a sink, in order, each checked: a term whose rebuilt identity differs is refused. */
  static replay(sink: Sink): Persisted[] {
    return sink.load().map((raw, i) => {
      const e = raw as Persisted;
      if (e.kind === 'contribution') return { ...e, contribution: rebuild(e.contribution, i) };
      return e;
    });
  }
  /** Take in entries already written (a replay): they are kept in order and not written to the sink again. */
  restore(entries: Persisted[]) { for (const e of entries) { this.entries.push(Object.freeze({ ...e, at: this.seq++ }) as Entry); } }
  all(): readonly Entry[] { return this.entries; }
  contributions(): Contribution[] { return this.entries.flatMap((e) => (e.kind === 'contribution' ? [e.contribution] : [])); }
  records(): Derivation[] { return this.entries.flatMap((e) => (e.kind === 'record' ? [e.record] : e.kind === 'comparison' ? [e.comparison.derived, e.comparison.measured] : e.kind === 'choice' ? [e.why] : [])); }
  comparisons(): Comparison[] { return this.entries.flatMap((e) => (e.kind === 'comparison' ? [e.comparison] : [])); }
}

// ---- terms read back, checked against their identity ------------------------------------------------------------

function rebuildTerm(t: any, where: string): Term {
  let out: Term;
  if (t.kind === 'leaf') {
    const l: Omit<Leaf, 'hash'> = { kind: 'leaf', name: t.name, value: t.value, dim: t.dim, unit: t.unit, origin: t.origin, ...(t.uncertainty === undefined ? {} : { uncertainty: t.uncertainty }) };
    out = { ...l, hash: leafHashOf(l) };
  } else if (t.kind === 'var') out = variable(t.sym, t.unit, t.name);
  else if (t.kind === 'app') out = app(t.op, t.args.map((a: any) => rebuildTerm(a, where)), t.k);
  else if (t.kind === 'bind') out = integral(rebuildTerm(t.over, where) as ReturnType<typeof variable>, rebuildTerm(t.lo, where), rebuildTerm(t.hi, where), rebuildTerm(t.body, where), rebuildTerm(t.cells, where) as Leaf);
  else throw new Error(`${where}: not a term`);
  if (out.hash !== t.hash) throw new Error(`${where}: a term read back is not the term written (identity ${t.hash}, rebuilt ${out.hash})`);
  return out;
}

function rebuild(c: any, i: number): Contribution {
  const where = `journal entry ${i}`;
  if (c.kind === 'leaf') return { ...c, leaf: rebuildTerm(c.leaf, where) as Leaf };
  if (c.kind === 'relation') return { ...c, term: rebuildTerm(c.term, where), ...(c.domain ? { domain: c.domain.map((d: any) => ({ says: d.says, holds: rebuildTerm(d.holds, where) })) } : {}) };
  if (c.kind === 'constraint') return { ...c, holds: rebuildTerm(c.holds, where) };
  if (c.kind === 'place') return { ...c, centre: c.centre.map((l: any) => rebuildTerm(l, where)), turn: c.turn.map((l: any) => rebuildTerm(l, where)), half: c.half.map((l: any) => rebuildTerm(l, where)) };
  return c as Contribution;
}
