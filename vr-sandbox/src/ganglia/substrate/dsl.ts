// The seed language: a pack is a domain's knowledge said compactly. `e` states an entity; `link` states its relations
// in one object, one key per question; anything referred to that no pack has stated becomes a stub, and a stub is a
// queued question (population.ts): every discovery is a source of further discovery.
import type { Source } from '../types';
import { FACETS, RELATIONS, type Entity, type Facet, type Inverse, type Kind, type Parameter, type Provenance, type Relation, type RelationKind } from './model';
import { normalizeId } from './model';
import { coverageFrom } from './substrate';

/** A relation may be said either way: `produces` is `produced-by` read backwards, and is stored forwards. */
export type Links = Partial<Record<RelationKind | Inverse, (string | [string, string])[]>>;
const FORWARD: Record<string, RelationKind> = Object.fromEntries((Object.entries(RELATIONS) as [RelationKind, { inverse: string }][]).map(([k, v]) => [v.inverse, k]));

export interface Deep { id: string; facet: Facet; fn: (p: Pack) => void }

export class Pack {
  readonly entities: Entity[] = [];
  readonly relations: Relation[] = [];
  readonly deeps: Deep[] = [];
  readonly referenced = new Set<string>();
  constructor(readonly domain: string, readonly source: Source) {}

  /** An entity: its kinds (several), what it is in a sentence, and what else is known of it. */
  e(id: string, kinds: Kind | Kind[], says: string, opts: { names?: string[]; domains?: string[]; params?: Parameter[]; source?: Provenance; depth?: 1 | 2 | 3; unknowns?: string[] } = {}): string {
    const src = opts.source ?? this.source;
    const nid = normalizeId(id);
    this.entities.push({
      id: nid, name: opts.names?.[0] ?? id.replace(/[.-]/g, ' '), names: opts.names ?? [], kinds: Array.isArray(kinds) ? kinds : [kinds], domains: [this.domain, ...(opts.domains ?? [])],
      says, params: opts.params, source: src, coverage: coverageFrom(src, opts.depth ?? 2, [], opts.unknowns ?? []),
    });
    return nid;
  }

  /** Relations of one entity: each key a question, each value the answers (an answer may carry a note). */
  link(from: string, links: Links, source: Provenance = this.source, confidence?: number): void {
    const f = normalizeId(from);
    this.referenced.add(f);
    for (const [key, tos] of Object.entries(links) as [RelationKind | Inverse, (string | [string, string])[]][]) {
      const forward = key in RELATIONS;
      const kind: RelationKind = forward ? (key as RelationKind) : FORWARD[key]!;
      if (!kind) throw new Error(`no relation ${key}`);
      for (const t of tos) {
        const [other, says] = Array.isArray(t) ? t : [t, undefined];
        const no = normalizeId(other);
        this.referenced.add(no);
        const [from, to] = forward ? [f, no] : [no, f];
        this.relations.push({ from, kind, to, says, source, confidence: confidence ?? ('estimate' in source ? 0.5 : 0.85) });
      }
    }
  }

  /** Several things that all relate the same way: `each(['a','b'], { 'is-a': ['x'] })`. */
  each(froms: string[], links: Links, source?: Provenance): void { for (const f of froms) this.link(f, links, source); }

  /** Knowledge kept for the deep path: expanded only when the queue asks this facet of this entity. */
  deep(id: string, facet: Facet, fn: (p: Pack) => void): void {
    if (!FACETS.includes(facet)) throw new Error(`no facet ${facet}`);
    this.deeps.push({ id: normalizeId(id), facet, fn });
  }

  /** A parameter of a variation space. */
  static param(sym: string, name: string, of: Provenance, opts: { unit?: string; low?: number; high?: number; values?: string[] } = {}): Parameter { return { sym, name, of, ...opts }; }
}

export const est = (of: string): Provenance => ({ estimate: of });
export const param = Pack.param;
