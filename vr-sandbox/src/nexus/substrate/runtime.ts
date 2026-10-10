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
import { dimText } from './dimension';
import { Journal, type Address, type Contribution, type Sink } from './journal';
import { ge, le, leaf, variable, type Leaf, type Term } from './term';
import { hashOf } from './identity';
import { placeAt, placeLeaves, placeRelations } from './place';
import { contactAt, contactStructure } from './contact';
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
  /** The structure generated from present values (couplings), by id, so it can be compared with what the rules want next. */
  private readonly structure = new Map<string, RelationC | ConstraintC>();
  /** Coupling terms already built, by the structural decision that made them. */
  private readonly built = new Map<string, Contribution[]>();
  /** Places held at rest by what lies outside the domain. */
  private readonly held = new Set<string>();
  /** The places whose geometry has generated its relations. */
  private readonly places = new Set<string>();
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

  /**
   * What a gap bears on: the constraints whose decision rests on where it is, found by following what reads that
   * address down to the constraints that read it. A constraint's own gap bears on itself. A gap that bears on no
   * constraint is still a lack in the state, but nothing anyone wants or the domain requires waits on it.
   */
  bearing(g: Gap): { constraint: string; says: string; by: string }[] {
    const found = new Set<string>();
    if (g.kind === 'unmet' || g.kind === 'undecided') found.add(g.constraint);
    else {
      const seen = new Set<Address>([g.at]), stack = [g.at];
      while (stack.length) {
        const x = stack.pop()!;
        for (const id of this.readers.get(x) ?? []) {
          // a reader already decided without this address does not wait on it
          const decided = this.constraints.has(id) ? this.checks.get(id) : this.outputs.get(id);
          const ports = (this.constraints.get(id) ?? this.relations.get(id))!.ports;
          if (decided && decided.value !== null && !Object.keys(decided.inputs).some((sym) => ports[sym] === x)) continue;
          if (this.constraints.has(id)) { found.add(id); continue; }
          const r = this.relations.get(id);
          if (r && !seen.has(r.out)) { seen.add(r.out); stack.push(r.out); }
        }
      }
    }
    return [...found].map((id) => { const c = this.constraints.get(id)!; return { constraint: id, says: c.says, by: c.by }; });
  }

  /** The places in the domain, and whether each is held at rest from outside it. */
  placeIds(): string[] { return [...this.places]; }
  isHeld(p: string): boolean { return this.held.has(p); }
  /** The leaf held at an address, when one is. */
  leafAt(a: Address): Leaf | undefined { return this.leaves.get(a); }

  /** Whether anything in the state can bind an address: a leaf there, or a relation that derives it. */
  derives(a: Address): boolean { return this.leaves.has(a) || (this.producers.get(a) ?? []).some((id) => !this.cyclic.has(id)); }

  /** Whether a relation or a constraint was generated from the present values, rather than contributed. */
  generated(id: string): boolean { return this.structure.has(id); }

  /** The unit a relation or a constraint reads at an address it waits on, from the variable at that port. */
  unitRead(id: string, a: Address): string | undefined {
    const g = this.relations.get(id) ?? this.constraints.get(id);
    if (!g) return undefined;
    const term = g.kind === 'relation' ? g.term : g.holds;
    const sym = Object.entries(g.ports).find(([, p]) => p === a)?.[0];
    let unit: string | undefined;
    const walk = (t: Term) => { if (t.kind === 'var' && t.sym === sym) unit = t.unit; else if (t.kind === 'app') t.args.forEach(walk); };
    walk(term);
    return unit;
  }

  // ---- applying a contribution ------------------------------------------------------------------------------------

  private check(c: Contribution) {
    if ((c.kind === 'relation' || c.kind === 'constraint') && (this.relations.has(c.id) || this.constraints.has(c.id))) throw new Error(`${c.id}: already in the store; withdraw it first`);
    if (c.kind === 'withdraw' && !this.relations.has(c.id) && !this.constraints.has(c.id)) throw new Error(`${c.id}: nothing in the store to withdraw`);
  }

  private apply(c: Contribution): Address[] {
    const { start, fresh } = this.applyOne(c);
    return [...new Set(this.restructure(start, fresh))];
  }

  /**
   * Bring the structure that depends on values up to date, then settle: the couplings and sections the places'
   * present geometry makes. What the rules want is decided first, from the leaves as they now stand, so nothing is
   * evaluated through structure the change has already taken out; what is gone is taken out, what is new is put in,
   * and everything the change reaches is evaluated once, in depth order. Deciding again after settling catches
   * structure that depends on derived values; it is repeated until nothing changes.
   */
  private restructure(start: Address[], fresh: string[]): Address[] {
    const changed: Address[] = [];
    const view = { value: (a: Address) => { const l = this.leaves.get(a); return l ? l.value : this.bindings.get(a)?.value ?? null; }, places: () => [...this.places], held: (p: string) => this.held.has(p), resolution: (p: string) => Math.max(0, ...[0, 1, 2].map((j) => this.leaves.get(placeAt.centre(p, j))?.uncertainty ?? 0)) };
    const content = (g: RelationC | ConstraintC) => (g.kind === 'relation' ? hashOf({ out: g.out, term: g.term.hash, ports: g.ports }) : hashOf({ holds: g.holds.hash, ports: g.ports }));
    for (let round = 0; round < 16; round++) {
      const want = new Map(contactStructure(view, this.built).filter((g): g is RelationC | ConstraintC => g.kind === 'relation' || g.kind === 'constraint').map((g) => [g.id, g]));
      const gone = [...this.structure.keys()].filter((id) => !want.has(id) || content(want.get(id)!) !== content(this.structure.get(id)!));
      const added = [...want.keys()].filter((id) => !this.structure.has(id) || gone.includes(id));
      const checks: string[] = [];
      for (const id of gone) {
        const g = this.structure.get(id)!;
        this.structure.delete(id);
        if (g.kind === 'relation') { start.push(g.out); this.dropRelation(id); fresh = fresh.filter((x) => x !== id); }
        else { this.constraints.delete(id); this.checks.delete(id); for (const p of Object.values(g.ports)) this.readers.get(p)?.delete(id); }
      }
      for (const id of added) {
        const g = want.get(id)!;
        this.structure.set(id, g);
        if (g.kind === 'relation') { if (this.addRelation(g)) fresh.push(id); }
        else { this.constraints.set(id, g); for (const p of new Set(Object.values(g.ports))) this.read(p, id); checks.push(id); }
      }
      if (!start.length && !fresh.length && !checks.length) return changed;
      changed.push(...this.settle(start, fresh));
      for (const id of checks) this.evaluateConstraint(id);
      start = []; fresh = [];
    }
    throw new Error('restructure: the couplings did not settle');
  }

  private dropRelation(id: string) {
    const r = this.relations.get(id)!;
    this.relations.delete(id); this.cyclic.delete(id); this.outputs.delete(id); this.failures.delete(id);
    for (const p of Object.values(r.ports)) this.readers.get(p)?.delete(id);
    this.producers.set(r.out, (this.producers.get(r.out) ?? []).filter((x) => x !== id));
  }

  /** What a contribution changes directly: the addresses it sets and the relations it puts in, none yet evaluated. */
  private applyOne(c: Contribution): { start: Address[]; fresh: string[] } {
    const none = { start: [] as Address[], fresh: [] as string[] };
    if (c.kind === 'held') {
      // held at rest by what lies outside the domain: its rest is a given, whose it is, and what rests on it rests on that
      this.held.add(c.place);
      const at = contactAt.rests(c.place);
      this.leaves.set(at, leaf('held at rest', 1, '1', { class: 'given', by: c.by, grounds: 'held at rest by what lies outside the domain' }));
      return { start: [at], fresh: [] };
    }
    if (c.kind === 'leaf') { this.leaves.set(c.at, c.leaf); return { start: [c.at], fresh: [] }; }
    if (c.kind === 'relation') return { start: [], fresh: this.addRelation(c) ? [c.id] : [] };
    if (c.kind === 'place') {
      // the place's numbers are leaves; what its geometry implies is generated from it, once, for every place alike
      const leaves = placeLeaves(c);
      for (const l of leaves) this.leaves.set((l as { at: Address }).at, (l as { leaf: Leaf }).leaf);
      const fresh: string[] = [];
      if (!this.places.has(c.id)) { this.places.add(c.id); for (const g of placeRelations(c.id) as RelationC[]) if (this.addRelation(g)) fresh.push(g.id); }
      return { start: leaves.map((l) => (l as { at: Address }).at), fresh };
    }
    if (c.kind === 'constraint') {
      this.constraints.set(c.id, c);
      for (const p of new Set(Object.values(c.ports))) this.read(p, c.id);
      this.evaluateConstraint(c.id);
      return none;
    }
    // a withdrawal
    const r = this.relations.get(c.id);
    if (r) { this.dropRelation(c.id); return { start: [r.out], fresh: [] }; }
    const k = this.constraints.get(c.id)!;
    this.constraints.delete(c.id); this.checks.delete(c.id);
    for (const p of Object.values(k.ports)) this.readers.get(p)?.delete(c.id);
    return none;
  }

  /** Put a relation in the store, to be evaluated when the change settles; false when it is held out as a loop. */
  private addRelation(c: RelationC): boolean {
    if (this.closesLoop(c)) { this.relations.set(c.id, c); this.cyclic.add(c.id); return false; }
    this.relations.set(c.id, c);
    for (const p of new Set(Object.values(c.ports))) this.read(p, c.id);
    this.producers.set(c.out, [...(this.producers.get(c.out) ?? []), c.id]);
    return true;
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
    const env = this.envOf(id, r.ports);
    if (waiting.length && !this.decidedWithout(r.term, r.domain, env)) { this.outputs.delete(id); this.failures.set(id, { kind: 'unbound', at: r.out, relation: id, waitingOn: [...new Set(waiting)] }); return; }
    this.evaluations++;
    try {
      // a derived value is named by where it is: two values a rule derives alike at two places are told apart
      const d = evaluate(r.out, r.term, env, { law: r.law, unit: r.unit, ...(r.domain ? { domain: r.domain } : {}) });
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
    const env = this.envOf(id, c.ports);
    if (!ready && !this.decidedWithout(c.holds, undefined, env)) { this.checks.delete(id); return; }
    this.evaluations++;
    this.checks.set(id, evaluate(c.says, c.holds, env, { law: c.holds.hash, unit: '1' }));
  }

  /** What a relation or a constraint reads, with an unknown record where an address holds no value yet. */
  private envOf(id: string, ports: Record<string, Address>): Env {
    return Object.fromEntries(Object.entries(ports).map(([sym, p]) => {
      const b = this.bindings.get(p);
      return [sym, b ?? ofLeaf(leaf(p, null, this.unitRead(id, p) ?? '1', { class: 'unknown' }))];
    }));
  }

  /** Whether a term and its domain are decided by what is known, whatever the unknown parts are. */
  private decidedWithout(term: Term, domain: { holds: Term }[] | undefined, env: Env): boolean {
    if (!decides(term) && !(domain ?? []).some((x) => decides(x.holds))) return false;
    const d = evaluate('a decision', term, env, { law: '', unit: dimText(term.dim), ...(domain ? { domain: domain.map((x) => ({ says: '', holds: x.holds })) } : {}) });
    return Object.values(d.inputs).every((x) => x.value !== null);
  }

  /** What an address holds now: a leaf there, else the first relation that derives it. */
  private bindingOf(a: Address): Derivation | undefined {
    const leaf = this.leaves.get(a);
    if (leaf) return ofLeaf(leaf);
    for (const id of this.producers.get(a) ?? []) { const d = this.outputs.get(id); if (d) return d; }
    return undefined;
  }

  /** How far a relation is from the leaves: one more than the farthest relation that binds one of its ports. */
  private depth(id: string, memo: Map<string, number>, path = new Set<string>()): number {
    const known = memo.get(id);
    if (known !== undefined) return known;
    if (path.has(id)) return 0;
    path.add(id);
    let d = 0;
    for (const p of Object.values(this.relations.get(id)!.ports)) for (const up of this.producers.get(p) ?? []) if (!this.cyclic.has(up)) d = Math.max(d, 1 + this.depth(up, memo, path));
    path.delete(id);
    memo.set(id, d);
    return d;
  }

  /**
   * Bring the addresses up to date, and everything that reads them, transitively. The relations a change reaches are
   * evaluated in order of their distance from the leaves, each once: a relation is evaluated only after every
   * relation upstream of it that the change reached. Relations just put in are evaluated with them.
   */
  private settle(start: Address[], fresh: string[] = []): Address[] {
    const changed: Address[] = [];
    const memo = new Map<string, number>();
    const pending = new Map<string, number>(); // relation id → depth, waiting to be evaluated
    const update = (a: Address) => {
      const next = this.bindingOf(a), had = this.bindings.get(a);
      if (next?.hash === had?.hash) return;
      if (next) this.bindings.set(a, next); else this.bindings.delete(a);
      changed.push(a);
      for (const id of this.readers.get(a) ?? []) {
        if (this.relations.has(id)) { if (!this.cyclic.has(id)) pending.set(id, this.depth(id, memo)); }
        else if (this.constraints.has(id)) this.evaluateConstraint(id);
      }
    };
    for (const a of start) update(a);
    for (const id of fresh) if (this.relations.has(id) && !this.cyclic.has(id)) pending.set(id, this.depth(id, memo));
    let guard = 0;
    while (pending.size) {
      if (++guard > 1_000_000) throw new Error('settle: propagation did not settle');
      let next = '', least = Infinity;
      for (const [id, d] of pending) if (d < least) { least = d; next = id; }
      pending.delete(next);
      this.refresh(next);
      update(this.relations.get(next)!.out);
    }
    return changed;
  }
}

/** Whether a term holds a predicate that a part can decide alone (an and, an or): only such a term is decided without all it reads. */
const decisive = new WeakMap<Term, boolean>();
function decides(t: Term): boolean {
  const hit = decisive.get(t);
  if (hit !== undefined) return hit;
  const v = t.kind === 'app' ? t.op === 'and' || t.op === 'or' || t.args.some(decides) : t.kind === 'bind' ? decides(t.body) || decides(t.lo) || decides(t.hi) : false;
  decisive.set(t, v);
  return v;
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
