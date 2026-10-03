// The outside: a connector is a structured source the substrate can ask about a thing by its names. What it answers is
// a record with the source's own key, its statements as the index's relations, and its numbers; the external expander
// turns a record into a discovery that goes through `ingest` like anything else, with provenance on every arrow, and
// marks what the source did not have. A connector never writes to the substrate itself.
import { FACETS, NAMED_AS, confidenceOf, forwardOf, normalizeId, sourceKindOf, type Discovery, type Entity, type Facet, type InverseKind, type Kind, type Provenance, type RelationKind } from './model';
import type { Substrate } from './substrate';
import type { Expander } from './population';
import type { Source } from '../types';

/** One statement an outside record makes about the thing: an arrow of the index to another thing of that source. */
export interface ExternalLink { kind: RelationKind | InverseKind; key: string; label: string; description?: string; /** what the source calls the statement (its property) */ via: string }
/** One number an outside record gives: the source's property, its label, the amount and the unit as the source says it. */
export interface ExternalQuantity { property: string; label: string; amount: number; high?: number; unit?: string }

export interface ExternalRecord {
  /** The source's key for the thing (a Wikidata item id). */
  key: string;
  label: string;
  aliases: string[];
  description?: string;
  url: string;
  /** ISO date of retrieval: the record is what the source said then. */
  retrieved: string;
  links: ExternalLink[];
  quantities: ExternalQuantity[];
}

export interface Connector {
  name: string;
  /** The record for a thing, found by its key when it has one, else by exact match of one of its names; null when the source has none. */
  lookup(e: Entity): Promise<ExternalRecord | null>;
  /** What this connector did so far: for the census. */
  stats(): { lookups: number; hits: number; misses: number; failures: number; lastError?: string };
}

/** What a thing at the far end of an outside statement is, when nothing here describes it yet. */
const KIND_BY_VIA: Record<string, Kind[]> = { material: ['material'], 'fabrication method': ['process', 'constructor'], 'has use': ['function'], role: ['role'], characteristic: ['property'], part: ['component'] };

export function provenanceOf(c: Connector, r: ExternalRecord): Source {
  return { cite: `${c.name} ${r.key} "${r.label}", retrieved ${r.retrieved}`, url: r.url, kind: 'database' };
}

/**
 * A record about `e` as a discovery: `e` gains the source's key, aliases, description (when it was a stub) and numbers;
 * each statement becomes a relation from `e` to the thing the source names, resolved to what is already here by key or
 * by name, else stubbed with the source's provenance and a kind read from the statement.
 */
export function recordToDiscovery(c: Connector, e: Entity, r: ExternalRecord, s: Substrate): Discovery {
  const src = provenanceOf(c, r);
  const prov: Provenance = src;
  const keyOf = (name: string) => `${name}`;
  const own: Entity = {
    id: e.id, name: e.name, names: [...new Set([...e.names, r.label, ...r.aliases])].filter((n) => n.length < 60), kinds: [...e.kinds], domains: [...e.domains],
    says: 'stub' in e.source && r.description ? `${r.description[0]!.toUpperCase()}${r.description.slice(1)}${/[.!?]$/.test(r.description) ? '' : '.'} (${c.name})` : e.says,
    source: 'stub' in e.source ? src : e.source,
    coverage: { depth: e.coverage.depth < 1 ? 1 : e.coverage.depth, confidence: Math.max(e.coverage.confidence, confidenceOf(prov)), sourceKind: e.coverage.sourceKind === 'stub' ? sourceKindOf(prov) : e.coverage.sourceKind, expanded: [...e.coverage.expanded], unknowns: e.coverage.unknowns.filter((u) => u !== 'not yet described') },
    keys: { ...(e.keys ?? {}), [keyOf(c.name.toLowerCase())]: r.key },
  };
  if (r.quantities.length) own.params = [...(e.params ?? []), ...r.quantities.filter((q) => !e.params?.some((p) => p.sym === q.property)).map((q) => ({ sym: q.property, name: q.label, unit: q.unit, low: q.amount, high: q.high, of: prov }))];
  const entities: Entity[] = [own];
  const relations: Discovery['relations'] = [];
  const unknowns: Discovery['unknowns'] = [];
  const byKey = new Map<string, Entity>();
  for (const x of s.entities.values()) { const k = x.keys?.[c.name.toLowerCase()]; if (k) byKey.set(k, x); }
  for (const l of r.links) {
    const { kind, flipped } = forwardOf(l.kind);
    // resolve: the same key here, else the same name here, else a new stub of the kind the statement names
    let target = byKey.get(l.key) ?? s.byWord(l.label);
    if (!target) {
      const id = normalizeId(l.label);
      if (!id || id === e.id) continue;
      const kinds = !flipped && NAMED_AS[kind] ? [NAMED_AS[kind]!] : (Object.entries(KIND_BY_VIA).find(([w]) => l.via.includes(w))?.[1] ?? (kind === 'is-a' ? [...e.kinds] : []));
      target = { id, name: l.label, names: [l.label], kinds: kinds as Kind[], domains: [e.domains[0] ?? 'unplaced'], says: l.description ? `${l.description[0]!.toUpperCase()}${l.description.slice(1)}. (${c.name})` : `Named by ${e.id} (${l.kind}, ${c.name} ${l.via}); not yet described.`, source: l.description ? src : { stub: `named by ${e.id} through ${c.name}` }, coverage: { depth: l.description ? 1 : 0, confidence: l.description ? confidenceOf(prov) : 0.2, sourceKind: l.description ? sourceKindOf(prov) : 'stub', expanded: [], unknowns: l.description ? [] : ['not yet described'] }, keys: { [c.name.toLowerCase()]: l.key } };
      entities.push(target);
    }
    if (target.id === e.id) continue; // the source names the thing itself (an alias): no arrow, no second key
    if (!entities.includes(target) && !target.keys?.[c.name.toLowerCase()]) entities.push({ ...target, keys: { ...(target.keys ?? {}), [c.name.toLowerCase()]: l.key } });
    relations.push(flipped ? { from: target.id, kind, to: e.id, says: `${c.name}: ${l.via}`, source: prov, confidence: confidenceOf(prov) } : { from: e.id, kind, to: target.id, says: `${c.name}: ${l.via}`, source: prov, confidence: confidenceOf(prov) });
  }
  if (!r.links.length && !r.quantities.length) unknowns.push({ id: e.id, facet: 'components', why: `${c.name} knows ${r.key} but states nothing the index reads` });
  return { entities, relations, unknowns };
}

/**
 * The external expander: the first question about a thing fetches its record once; every statement in it is ingested at
 * that moment, so later facets of the same thing have nothing more to fetch. A thing the source does not have, or a
 * failure to reach it, is recorded as an unknown on that facet, never as silence.
 */
export function externalExpander(connector: Connector | null): Expander & { looked: Map<string, ExternalRecord | null> } {
  const looked = new Map<string, ExternalRecord | null>();
  return {
    name: connector ? `external:${connector.name}` : 'external',
    facets: [...FACETS],
    looked,
    async expand(e: Entity, facet: Facet, s: Substrate) {
      if (!connector) return { entities: [], relations: [], unknowns: [{ id: e.id, facet, why: 'no external source is connected to this session: what is here is what the packs and rules give' }] };
      if (looked.has(e.id)) return null;
      try {
        const r = await connector.lookup(e);
        looked.set(e.id, r);
        if (!r) return { entities: [], relations: [], unknowns: [{ id: e.id, facet, why: `${connector.name} has no record matching ${[...new Set([e.name, ...e.names])].slice(0, 3).join(' / ')}` }] };
        return recordToDiscovery(connector, e, r, s);
      } catch (err) {
        // not looked up: it may be asked again when the source is reachable
        return { entities: [], relations: [], unknowns: [{ id: e.id, facet, why: `${connector.name} could not be reached: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    },
  };
}
