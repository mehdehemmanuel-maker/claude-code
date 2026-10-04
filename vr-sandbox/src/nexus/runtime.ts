// The runtime: the state, the constraint store and the loop over them (docs/NEXUS-FROM-REALITY.md, sections 2, 3, 6
// and 7). What is contributed (a leaf given or measured, a relation, a constraint, a withdrawal) is journalled first and
// then applied. Applying it makes stale exactly what reads what it changed, and only that is evaluated again. The state
// is a fold over the journal: opened on a journal, the runtime is rebuilt exactly.
//
// Every value at an address is a derivation record with its origin, never a bare number. What the state lacks is a
// gap, and a gap is a structured term at an address: an input no relation or leaf binds, a constraint that fails or
// cannot be decided, two bindings that disagree, a measurement that disagrees with its derivation, a relation outside
// its law's domain, a cycle that propagation cannot settle. A gap is never a sentence to be read back.

import { contradiction, evaluate, ofLeaf, type Derivation, type Env } from './evaluate';
import { Journal, type Address, type Contribution, type Sink } from './journal';
import { ge, le, variable, type Leaf } from './term';
import { hashOf } from './identity';
import type { Law } from './law';
import { why, type WhyNode } from './why';

type RelationC = Extract<Contribution, { kind: 'relation' }>;
type ConstraintC = Extract<Contribution, { kind: 'constraint' }>;

export type Gap =
  /** A relation waits on addresses nothing binds. */
  | { kind: 'unbound'; at: Address; relation: string; waitingOn: Address[] }
  /** A relation's law refused its inputs: outside its domain, named. */
  | { kind: 'refused'; at: Address; relation: string; domain: string }
  /** A relation could not be evaluated over what its ports hold (a dimension that does not fit). */
  | { kind: 'invalid'; at: Address; relation: string; reason: string }
  /** Two bindings of one address disagree past tolerance, neither of them a measurement. */
  | { kind: 'contradiction'; at: Address; record: Derivation; between: string[] }
  /** A measurement disagrees with what the relations derive there: what the language must learn from. */
  | { kind: 'anomaly'; at: Address; measured: Derivation; derived: Derivation; error: number; tolerance: number; relation: string }
  /** A constraint that fails, and whose it is. */
  | { kind: 'unmet'; constraint: string; says: string; by: string; at: Address[]; record: Derivation }
  /** A constraint that cannot be decided yet: what it waits on. */
  | { kind: 'undecided'; constraint: string; says: string; by: string; waitingOn: Address[] }
  /** A relation that would close a loop: settling it needs solving, not propagation. */
  | { kind: 'cycle'; at: Address; relation: string };

export interface Change {
  /** Relations and constraints evaluated in applying it: exactly what read what changed. */
  evaluated: number;
  /** Addresses whose binding changed. */
  changed: Address[];
  gaps: Gap[];
}

const tolerance = (a: Derivation, b: Derivation) => Math.max((a.uncertainty ?? 0) + (b.uncertainty ?? 0), 1e-9 * Math.max(Math.abs(a.value!), Math.abs(b.value!)));

export class Runtime {
  private readonly leaves = new Map<Address, Leaf>();
  private readonly relations = new Map<string, RelationC>();
  private readonly constraints = new Map<string, ConstraintC>();
  /** Relations held out because they would close a loop. */
  private readonly cyclic = new Set<string>();
  private readonly bindings = new Map<Address, Derivation>();
  /** Each relation's last output, and what stopped it. */
  private readonly outputs = new Map<string, Derivation>();
  private readonly failures = new Map<string, Gap>();
  private readonly checks = new Map<string, Derivation>();
  private readonly readers = new Map<Address, Set<string>>();
  private readonly producers = new Map<Address, string[]>();
  /** Anomalies and contradictions already journalled, so each is written once. */
  private readonly noted = new Set<string>();
  /** Every evaluation of a relation or a constraint since the runtime opened. */
  evaluations = 0;

  private constructor(readonly journal: Journal) {}

  /** A runtime on a journal: empty, or rebuilt from what the sink holds. */
  static open(sink?: Sink): Runtime {
    const rt = new Runtime(new Journal(sink));
    if (sink) {
      const entries = Journal.replay(sink);
      rt.journal.restore(entries);
      for (const e of entries) {
        if (e.kind === 'contribution') rt.apply(e.contribution);
        else if (e.kind === 'anomaly') rt.noted.add(e.hashes.join('|'));
      }
    }
    return rt;
  }

  /** Contribute to the state: journalled, then applied; what reads what it changed is evaluated again. */
  admit(c: Contribution): Change {
    this.check(c);
    this.journal.append({ kind: 'contribution', contribution: c });
    const before = this.evaluations;
    const changed = this.apply(c);
    const gaps = this.gaps();
    for (const g of gaps) {
      if (g.kind !== 'contradiction' && g.kind !== 'anomaly') continue;
      const hashes = g.kind === 'contradiction' ? [g.record.hash] : [g.measured.hash, g.derived.hash];
      if (this.noted.has(hashes.join('|'))) continue;
      this.noted.add(hashes.join('|'));
      this.journal.append({ kind: 'anomaly', where: g.at, says: g.kind === 'contradiction' ? `${g.between.join(' and ')} disagree` : `measured ${g.measured.value} where ${g.relation} derives ${g.derived.value}`, hashes });
    }
    return { evaluated: this.evaluations - before, changed, gaps };
  }

  /** The value at an address, as its derivation record; none where nothing binds it. */
  binding(a: Address): Derivation | undefined { return this.bindings.get(a); }
  addresses(): Address[] { return [...this.bindings.keys()]; }
  /** WHY on the value at an address: the whole derivation, down to leaves with their origins. */
  why(a: Address): WhyNode | null { const d = this.bindings.get(a); return d ? why(d) : null; }

  /** Everything the state lacks now, each at its address. */
  gaps(): Gap[] {
    const out: Gap[] = [];
    for (const [id, r] of this.relations) {
      if (this.cyclic.has(id)) { out.push({ kind: 'cycle', at: r.out, relation: id }); continue; }
      const f = this.failures.get(id);
      if (f) out.push(f);
    }
    for (const [a, ids] of this.producers) {
      const results = ids.map((id) => [id, this.outputs.get(id)] as const).filter((x): x is readonly [string, Derivation] => !!x[1] && x[1].value !== null);
      const leaf = this.leaves.get(a);
      if (leaf && leaf.value !== null) {
        const held = ofLeaf(leaf);
        for (const [id, d] of results) {
          const err = Math.abs(held.value! - d.value!), tol = tolerance(held, d);
          if (err <= tol) continue;
          if (leaf.origin.class === 'measured') out.push({ kind: 'anomaly', at: a, measured: held, derived: d, error: err, tolerance: tol, relation: id });
          else out.push({ kind: 'contradiction', at: a, record: contradiction(a, held, d), between: [`${leaf.origin.class} ${leaf.name}`, id] });
        }
      } else if (results.length > 1) {
        const [firstId, first] = results[0]!;
        for (const [id, d] of results.slice(1)) if (Math.abs(first.value! - d.value!) > tolerance(first, d)) out.push({ kind: 'contradiction', at: a, record: contradiction(a, first, d), between: [firstId, id] });
      }
    }
    for (const [id, c] of this.constraints) {
      const d = this.checks.get(id);
      const waiting = Object.values(c.ports).filter((p) => { const b = this.bindings.get(p); return !b || b.value === null; });
      if (!d || waiting.length) out.push({ kind: 'undecided', constraint: id, says: c.says, by: c.by, waitingOn: [...new Set(waiting)] });
      else if (d.value === 0) out.push({ kind: 'unmet', constraint: id, says: c.says, by: c.by, at: [...new Set(Object.values(c.ports))], record: d });
    }
    return out;
  }

  // ---- applying a contribution ------------------------------------------------------------------------------------

  private check(c: Contribution) {
    if ((c.kind === 'relation' || c.kind === 'constraint') && (this.relations.has(c.id) || this.constraints.has(c.id))) throw new Error(`${c.id}: already in the store; withdraw it first`);
    if (c.kind === 'withdraw' && !this.relations.has(c.id) && !this.constraints.has(c.id)) throw new Error(`${c.id}: nothing in the store to withdraw`);
  }

  private apply(c: Contribution): Address[] {
    if (c.kind === 'leaf') { this.leaves.set(c.at, c.leaf); return this.settle([c.at]); }
    if (c.kind === 'relation') {
      if (this.closesLoop(c)) { this.relations.set(c.id, c); this.cyclic.add(c.id); return []; }
      this.relations.set(c.id, c);
      for (const p of new Set(Object.values(c.ports))) this.read(p, c.id);
      this.producers.set(c.out, [...(this.producers.get(c.out) ?? []), c.id]);
      this.refresh(c.id);
      return this.settle([c.out]);
    }
    if (c.kind === 'constraint') {
      this.constraints.set(c.id, c);
      for (const p of new Set(Object.values(c.ports))) this.read(p, c.id);
      this.evaluateConstraint(c.id);
      return [];
    }
    // a withdrawal
    const r = this.relations.get(c.id);
    if (r) {
      this.relations.delete(c.id); this.cyclic.delete(c.id); this.outputs.delete(c.id); this.failures.delete(c.id);
      for (const p of Object.values(r.ports)) this.readers.get(p)?.delete(c.id);
      this.producers.set(r.out, (this.producers.get(r.out) ?? []).filter((x) => x !== c.id));
      return this.settle([r.out]);
    }
    const k = this.constraints.get(c.id)!;
    this.constraints.delete(c.id); this.checks.delete(c.id);
    for (const p of Object.values(k.ports)) this.readers.get(p)?.delete(c.id);
    return [];
  }

  private read(a: Address, id: string) { if (!this.readers.has(a)) this.readers.set(a, new Set()); this.readers.get(a)!.add(id); }

  /** Whether a relation's output is already upstream of one of its ports: propagation would not settle it. */
  private closesLoop(r: RelationC): boolean {
    const seen = new Set<Address>(), stack = [...Object.values(r.ports)];
    while (stack.length) {
      const a = stack.pop()!;
      if (a === r.out) return true;
      if (seen.has(a)) continue;
      seen.add(a);
      for (const id of this.producers.get(a) ?? []) if (!this.cyclic.has(id)) stack.push(...Object.values(this.relations.get(id)!.ports));
    }
    return false;
  }

  /** Evaluate a relation over what its ports hold now, or record what stops it. */
  private refresh(id: string) {
    const r = this.relations.get(id)!;
    const waiting = Object.values(r.ports).filter((p) => { const b = this.bindings.get(p); return !b || b.value === null; });
    if (waiting.length) { this.outputs.delete(id); this.failures.set(id, { kind: 'unbound', at: r.out, relation: id, waitingOn: [...new Set(waiting)] }); return; }
    const env: Env = Object.fromEntries(Object.entries(r.ports).map(([sym, p]) => [sym, this.bindings.get(p)!]));
    this.evaluations++;
    try {
      const d = evaluate(r.name, r.term, env, { law: r.law, unit: r.unit, ...(r.domain ? { domain: r.domain } : {}) });
      this.outputs.set(id, d);
      if (d.refusal) this.failures.set(id, { kind: 'refused', at: r.out, relation: id, domain: d.refusal.domain });
      else this.failures.delete(id);
    } catch (err) {
      this.outputs.delete(id);
      this.failures.set(id, { kind: 'invalid', at: r.out, relation: id, reason: String((err as Error).message ?? err) });
    }
  }

  private evaluateConstraint(id: string) {
    const c = this.constraints.get(id)!;
    const ready = Object.values(c.ports).every((p) => { const b = this.bindings.get(p); return !!b && b.value !== null; });
    if (!ready) { this.checks.delete(id); return; }
    this.evaluations++;
    const env: Env = Object.fromEntries(Object.entries(c.ports).map(([sym, p]) => [sym, this.bindings.get(p)!]));
    this.checks.set(id, evaluate(c.says, c.holds, env, { law: c.holds.hash, unit: '1' }));
  }

  /** What an address holds now: a leaf there, else the first relation that derives it. */
  private bindingOf(a: Address): Derivation | undefined {
    const leaf = this.leaves.get(a);
    if (leaf) return ofLeaf(leaf);
    for (const id of this.producers.get(a) ?? []) { const d = this.outputs.get(id); if (d) return d; }
    return undefined;
  }

  /** Bring the addresses up to date, and everything that reads them, transitively: only what changed is evaluated again. */
  private settle(start: Address[]): Address[] {
    const changed: Address[] = [];
    const queue = [...start];
    let guard = 0;
    while (queue.length) {
      if (++guard > 1_000_000) throw new Error('settle: propagation did not settle');
      const a = queue.shift()!;
      const next = this.bindingOf(a), had = this.bindings.get(a);
      if (next?.hash === had?.hash) continue;
      if (next) this.bindings.set(a, next); else this.bindings.delete(a);
      changed.push(a);
      for (const id of this.readers.get(a) ?? []) {
        if (this.relations.has(id)) {
          if (this.cyclic.has(id)) continue;
          this.refresh(id);
          queue.push(this.relations.get(id)!.out);
        } else if (this.constraints.has(id)) this.evaluateConstraint(id);
      }
    }
    return changed;
  }
}

// ---- forming contributions ----------------------------------------------------------------------------------------

/** A law put to work at addresses: its output bound at `out`, each input read from its port's address. */
export function instance(l: Law, out: Address, ports: Record<string, Address>, id = hashOf({ law: l.hash, out, ports })): Contribution {
  for (const p of l.inputs) if (!ports[p.sym]) throw new Error(`${l.id}: no address for its input ${p.sym} (${p.name})`);
  return { kind: 'relation', id, out, name: l.output.name, unit: l.output.unit, term: l.term, ports, law: l.hash, ...(l.domain.length ? { domain: l.domain.map((d) => ({ says: d.says, holds: d.holds })) } : {}) };
}

/** A want: the quantity at an address held at most (or at least) a bound, and whose want it is. */
export function bound(at: Address, side: 'at most' | 'at least', limit: Leaf, by: string, says: string, id = hashOf({ want: at, side, limit: limit.hash, by })): Contribution {
  const x = variable('x', limit.unit);
  return { kind: 'constraint', id, says, by, holds: side === 'at most' ? le(x, limit) : ge(x, limit), ports: { x: at } };
}
