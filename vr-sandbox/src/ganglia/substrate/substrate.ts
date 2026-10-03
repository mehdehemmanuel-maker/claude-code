// The graph itself: entities and relations with indices both ways, deduplication by id and by name, merging of what
// is learnt twice (a stub becomes a thing when a pack defines it), and the traversals every question is answered by.
import { RELATIONS, confidenceOf, normalizeId, sourceKindOf, type Coverage, type Entity, type Facet, type Inverse, type Kind, type Provenance, type Relation, type RelationKind, NAMED_AS } from './model';

export class Substrate {
  readonly entities = new Map<string, Entity>();
  readonly relations: Relation[] = [];
  private readonly out = new Map<string, Relation[]>();
  private readonly in_ = new Map<string, Relation[]>();
  private readonly byName = new Map<string, string>();
  private readonly seen = new Set<string>();

  /** Add or merge an entity: a later, fuller statement of the same id deepens what is there; a stub never overwrites. */
  add(e: Entity): Entity {
    const id = normalizeId(e.id);
    const have = this.entities.get(id);
    if (!have) {
      const made: Entity = { ...e, id, names: [...new Set([e.name, ...e.names])], kinds: [...new Set(e.kinds)], domains: [...new Set(e.domains)] };
      this.entities.set(id, made);
      for (const n of made.names) this.byName.set(n.toLowerCase(), id);
      return made;
    }
    const stub = 'stub' in e.source;
    if (!stub) {
      if ('stub' in have.source) { have.source = e.source; have.says = e.says; have.name = e.name; }
      else if (e.says.length > have.says.length) have.says = e.says;
      if (e.coverage.depth > have.coverage.depth) have.coverage.depth = e.coverage.depth;
      have.coverage.confidence = Math.max(have.coverage.confidence, e.coverage.confidence);
      if (have.coverage.sourceKind === 'stub') have.coverage.sourceKind = e.coverage.sourceKind;
      if (e.params?.length) have.params = [...(have.params ?? []), ...e.params.filter((p) => !have.params?.some((q) => q.sym === p.sym))];
    }
    for (const k of e.kinds) if (!have.kinds.includes(k)) have.kinds.push(k);
    for (const d of e.domains) if (!have.domains.includes(d)) have.domains.push(d);
    for (const n of [e.name, ...e.names]) { if (!have.names.includes(n)) have.names.push(n); this.byName.set(n.toLowerCase(), id); }
    for (const u of e.coverage.unknowns) if (!have.coverage.unknowns.includes(u)) have.coverage.unknowns.push(u);
    for (const f of e.coverage.expanded) if (!have.coverage.expanded.includes(f)) have.coverage.expanded.push(f);
    return have;
  }

  /** A relation, once: the same edge said twice keeps its first provenance and the higher confidence. */
  relate(r: Relation): boolean {
    const from = normalizeId(r.from), to = normalizeId(r.to);
    // nothing is related to itself, except what reproduces itself (a lathe, a ribosome, a printer)
    if (from === to && r.kind !== 'reproduced-by') return false;
    const key = `${from}|${r.kind}|${to}`;
    if (this.seen.has(key)) {
      const have = this.relations.find((x) => x.from === from && x.kind === r.kind && x.to === to);
      if (have && r.confidence > have.confidence) { have.confidence = r.confidence; if (!('stub' in r.source)) have.source = r.source; }
      return false;
    }
    this.seen.add(key);
    const made = { ...r, from, to };
    this.relations.push(made);
    (this.out.get(from) ?? this.out.set(from, []).get(from)!).push(made);
    (this.in_.get(to) ?? this.in_.set(to, []).get(to)!).push(made);
    return true;
  }

  get(id: string): Entity | undefined { return this.entities.get(normalizeId(id)); }
  byWord(word: string): Entity | undefined { const id = this.byName.get(word.trim().toLowerCase()); return id ? this.entities.get(id) : this.entities.get(normalizeId(word)); }
  has(id: string): boolean { return this.entities.has(normalizeId(id)); }

  /** Edges out of an entity, by kind. */
  outOf(id: string, kind?: RelationKind): Relation[] { const r = this.out.get(normalizeId(id)) ?? []; return kind ? r.filter((x) => x.kind === kind) : r; }
  /** Edges into an entity, by kind. */
  into(id: string, kind?: RelationKind): Relation[] { const r = this.in_.get(normalizeId(id)) ?? []; return kind ? r.filter((x) => x.kind === kind) : r; }

  /** What an entity reaches by a relation, forwards; or by its inverse, backwards. */
  reach(id: string, kind: RelationKind | Inverse): Entity[] {
    const fwd = (kind in RELATIONS) ? this.outOf(id, kind as RelationKind).map((r) => this.entities.get(r.to)!) : [];
    const back = (Object.entries(RELATIONS) as [RelationKind, { inverse: string }][]).filter(([, v]) => v.inverse === kind).flatMap(([k]) => this.into(id, k).map((r) => this.entities.get(r.from)!));
    const all = [...fwd, ...back].filter(Boolean);
    return [...new Map(all.map((e) => [e.id, e])).values()];
  }

  /** Everything reached by following `kinds` (forward or inverse names) up to `depth` steps, with the step it was found at. */
  traverse(id: string, kinds: (RelationKind | Inverse)[], depth = 3): { entity: Entity; depth: number; via: string }[] {
    const start = normalizeId(id);
    const seen = new Map<string, { entity: Entity; depth: number; via: string }>();
    let frontier = [start];
    for (let d = 1; d <= depth && frontier.length; d++) {
      const next: string[] = [];
      for (const f of frontier) for (const k of kinds) for (const e of this.reach(f, k)) {
        if (e.id === start || seen.has(e.id)) continue;
        seen.set(e.id, { entity: e, depth: d, via: `${f} ${k} ${e.id}` });
        next.push(e.id);
      }
      frontier = next;
    }
    return [...seen.values()];
  }

  /** Degree, both ways: how connected a thing is. */
  degree(id: string): number { return this.outOf(id).length + this.into(id).length; }

  /** Entities of a kind, in a domain. */
  ofKind(kind: Kind, domain?: string): Entity[] { return [...this.entities.values()].filter((e) => e.kinds.includes(kind) && (!domain || e.domains.includes(domain))); }

  /** Relations whose ends do not both exist: must be none after `repair`. */
  dangling(): Relation[] { return this.relations.filter((r) => !this.entities.has(r.from) || !this.entities.has(r.to)); }

  /** Every end a relation names and nothing describes becomes a stub in the namer's domain: a question for the queue. */
  repair(): Entity[] {
    const made: Entity[] = [];
    for (const r of this.relations) for (const [end, other] of [[r.from, r.to], [r.to, r.from]] as [string, string][]) {
      if (this.entities.has(end)) continue;
      const namer = this.entities.get(other);
      const named = end === r.to ? NAMED_AS[r.kind] : undefined;
      made.push(this.add({ id: end, name: end.replace(/[.-]/g, ' '), names: [], kinds: named ? [named] : [], domains: [namer?.domains[0] ?? 'unplaced'], says: `Named by ${other} (${r.kind}); not yet described.`, source: { stub: `named by ${other}` }, coverage: { depth: 0, confidence: 0.2, sourceKind: 'stub', expanded: [], unknowns: ['not yet described'] } }));
    }
    return made;
  }

  census(): { entities: number; relations: number; stubs: number; byKind: Record<string, number>; byDomain: Record<string, number>; byRelation: Record<string, number>; depth: Record<string, number> } {
    const byKind: Record<string, number> = Object.create(null), byDomain: Record<string, number> = Object.create(null), byRelation: Record<string, number> = Object.create(null), depth: Record<string, number> = Object.create(null);
    let stubs = 0;
    for (const e of this.entities.values()) {
      if ('stub' in e.source) stubs++;
      for (const k of e.kinds) byKind[k] = (byKind[k] ?? 0) + 1;
      for (const d of e.domains) byDomain[d] = (byDomain[d] ?? 0) + 1;
      depth[String(e.coverage.depth)] = (depth[String(e.coverage.depth)] ?? 0) + 1;
    }
    for (const r of this.relations) byRelation[r.kind] = (byRelation[r.kind] ?? 0) + 1;
    return { entities: this.entities.size, relations: this.relations.length, stubs, byKind, byDomain, byRelation, depth };
  }
}

export const coverageFrom = (p: Provenance, depth: Coverage['depth'] = 1, expanded: Facet[] = [], unknowns: string[] = []): Coverage => ({ depth, confidence: confidenceOf(p), sourceKind: sourceKindOf(p), expanded, unknowns });
