// The substrate: Ganglia's cross-connected representation of reality, as an engineer with no assumptions would index
// it. Not a list of things but a graph of what each thing can do, become, connect to, transform, require, be produced
// by, be governed by, fail by, and vary by, with every entity carrying how much of it is known and from where.
// A thing, a material, a property, a geometry, a function, a behaviour, a transformation, a mechanism, a component, a
// subsystem, a system, a constructor, a process, a biological structure, a chemical entity, a physical phenomenon: these
// are kinds an entity has, several at once (copper is a material, a conductor, a heat spreader and a feedstock), never
// bins it is put in. docs/SUBSTRATE.md.
import type { Source } from '../types';

export const KINDS = ['thing', 'material', 'property', 'geometry', 'function', 'behavior', 'transformation', 'mechanism', 'component', 'subsystem', 'system', 'constructor', 'process', 'biological', 'organism', 'chemical', 'phenomenon', 'law', 'role', 'standard', 'failure', 'interface', 'manifold', 'generator', 'parameter', 'computation', 'signal', 'environment', 'circuit', 'architecture'] as const;
export type Kind = (typeof KINDS)[number];

/**
 * The alien engineer's questions, each a relation from a thing to what answers it. Stored one way; the inverse is
 * answered by the same edge read backwards.
 */
export const RELATIONS = {
  'is-a': { asks: 'what kind of thing is it', inverse: 'generalizes' },
  'has-part': { asks: 'what is it made of, structurally', inverse: 'part-of' },
  'made-of': { asks: 'what substance is it', inverse: 'constitutes' },
  'does': { asks: 'what can this do (the function it implements)', inverse: 'done-by' },
  'can-become': { asks: 'what can this become', inverse: 'comes-from' },
  'connects-to': { asks: 'what can this connect to', inverse: 'connects-to' },
  'transforms': { asks: 'what does this transform', inverse: 'transformed-by' },
  'requires': { asks: 'what does this require', inverse: 'required-by' },
  'produced-by': { asks: 'what can produce it', inverse: 'produces' },
  'governed-by': { asks: 'what laws make it possible', inverse: 'governs' },
  'enables': { asks: 'what does it enable', inverse: 'enabled-by' },
  'prevents': { asks: 'what does it prevent', inverse: 'prevented-by' },
  'fails-by': { asks: 'how does it fail', inverse: 'failure-of' },
  'varies-by': { asks: 'what can change without destroying the function', inverse: 'varies' },
  'plays': { asks: 'what roles can it fill', inverse: 'played-by' },
  'analogous-to': { asks: 'what other systems implement the same function', inverse: 'analogous-to' },
  'interacts-with': { asks: 'what does it act on and what acts on it', inverse: 'interacts-with' },
  'standardized-by': { asks: 'what standard fixes its form', inverse: 'standardizes' },
  'reproduced-by': { asks: 'how can it be reproduced', inverse: 'reproduces' },
  'evolves-to': { asks: 'how can it evolve', inverse: 'evolved-from' },
  'improved-by': { asks: 'how can it be improved', inverse: 'improves' },
  'has-property': { asks: 'what properties does it have', inverse: 'property-of' },
  'in-view': { asks: 'in which decomposition does it take part', inverse: 'views' },
  'measured-by': { asks: 'what observable shows it', inverse: 'measures' },
  'state': { asks: 'what state does it hold', inverse: 'state-of' },
} as const;
export type RelationKind = keyof typeof RELATIONS;
export type Inverse = (typeof RELATIONS)[RelationKind]['inverse'];
export const RELATION_KINDS = Object.keys(RELATIONS) as RelationKind[];

/** A thing nothing describes yet, named at the far end of one of these arrows, is at least of this kind: a stub law, a stub material, a stub role. */
export const NAMED_AS: Partial<Record<RelationKind, Kind>> = { 'governed-by': 'law', 'made-of': 'material', 'standardized-by': 'standard', 'fails-by': 'failure', plays: 'role', 'in-view': 'architecture', 'varies-by': 'parameter', 'measured-by': 'thing' };

export type Provenance = Source | { estimate: string } | { stub: string } | { derived: string };

/** A dimension of a thing's variation space: what can change, over what range or set, without destroying it. */
export interface Parameter { sym: string; name: string; unit?: string; low?: number; high?: number; values?: string[]; of: Provenance }

/** The facets an entity can be expanded along: each is a question the queue asks of it. */
export const FACETS = ['components', 'materials', 'mechanisms', 'functions', 'transformations', 'variants', 'standards', 'manufacturing', 'interfaces', 'failures', 'analogues', 'constructors', 'manifolds', 'laws', 'properties'] as const;
export type Facet = (typeof FACETS)[number];

/** Known is not complete: how much of an entity is represented, how well, and what is known to be missing. */
export interface Coverage {
  /** 0 a stub (named by something else), 1 identified (fast), 2 related, 3 decomposed (deep). */
  depth: 0 | 1 | 2 | 3;
  /** 0 to 1: how far the representation can be trusted, from its sources. */
  confidence: number;
  sourceKind: 'standard' | 'maker' | 'textbook' | 'handbook' | 'paper' | 'derived' | 'estimate' | 'stub';
  /** Facets expanded so far. */
  expanded: Facet[];
  /** What is known to be unknown. */
  unknowns: string[];
  lastExpanded?: number;
}

export interface Entity {
  id: string;
  name: string;
  names: string[];
  kinds: Kind[];
  domains: string[];
  /** One sentence: what it is, as an engineer would say it. */
  says: string;
  /** Its variation space: the manifold it generates when it has one. */
  params?: Parameter[];
  source: Provenance;
  coverage: Coverage;
}

export interface Relation {
  from: string;
  kind: RelationKind;
  to: string;
  says?: string;
  source: Provenance;
  /** 0 to 1. */
  confidence: number;
}

export interface Discovery { entities: Entity[]; relations: Relation[]; unknowns: { id: string; facet: Facet; why: string }[] }

export const sourceKindOf = (p: Provenance): Coverage['sourceKind'] =>
  'estimate' in p ? 'estimate' : 'stub' in p ? 'stub' : 'derived' in p ? 'derived' : (p.kind === 'standard' || p.kind === 'maker' || p.kind === 'textbook' || p.kind === 'handbook' || p.kind === 'paper') ? p.kind : 'textbook';

export const confidenceOf = (p: Provenance): number =>
  'stub' in p ? 0.2 : 'estimate' in p ? 0.5 : 'derived' in p ? 0.7 : p.kind === 'standard' || p.kind === 'maker' ? 0.95 : p.kind === 'rule of thumb' ? 0.5 : 0.85;

/** Ids: lower case, words joined by dots, no spaces; the same thing named twice is one id. */
export const normalizeId = (s: string) => s.trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9.+-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
