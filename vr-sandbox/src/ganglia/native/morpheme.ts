// Morphemes: exact abbreviations of recurring structures (sections O, P, W of docs/EGO-NATIVE-LANGUAGE.md). A morpheme
// is promoted only when it shortens the corpus (description length), is reused across contexts and domains, and
// expands back exactly; a morpheme that changes meaning is a new version, and the old one keeps expanding as it did.

import { canonical, hash, normalize, type D, type Expand, type M, type R, type Structure, type T } from './core';

/** A structure with its distinctions replaced by variables ($1, $2, ...) in order of first appearance: its shape, and the names that filled it. */
export function skeleton(s: Structure): { def: Structure; args: D[] } {
  const args: D[] = [], seen = new Map<string, string>();
  const vary = (x: Structure): Structure => {
    switch (x.k) {
      case 'D': {
        if (x.id.startsWith('$')) return x;
        if (!seen.has(x.id)) { seen.set(x.id, `$${args.length + 1}`); args.push(x); }
        return { k: 'D', id: seen.get(x.id)! };
      }
      case 'Q': case 'M': return x;
      case 'E': return { ...x, of: vary(x.of) };
      case 'C': return { ...x, body: vary(x.body) };
      case 'T': return { ...x, from: vary(x.from), to: vary(x.to), ...(x.cond ? { cond: x.cond.map(vary) } : {}) };
      case 'R': return { k: 'R', op: x.op, args: x.args.map(vary), c: x.c };
    }
  };
  return { def: vary(s), args };
}

/** The definition with its variables bound to the arguments of a reference. */
export function bind(def: Structure, args: Structure[]): Structure {
  const fill = (x: Structure): Structure => {
    switch (x.k) {
      case 'D': { const mm = /^\$(\d+)$/.exec(x.id); return mm ? (args[Number(mm[1]) - 1] ?? x) : x; }
      case 'Q': case 'M': return x;
      case 'E': return { ...x, of: fill(x.of) };
      case 'C': return { ...x, body: fill(x.body) };
      case 'T': return { ...x, from: fill(x.from), to: fill(x.to), ...(x.cond ? { cond: x.cond.map(fill) } : {}) };
      case 'R': return { k: 'R', op: x.op, args: x.args.map(fill), c: x.c };
    }
  };
  return fill(def);
}

export interface Morpheme {
  id: string;
  version: number;
  /** The structure it abbreviates, exactly. */
  def: Structure;
  /** The hash of the definition: what the morpheme means, whatever it is called. */
  hash: string;
  /** Why it was promoted: occurrences, domains, the description length saved. */
  evidence: { occurrences: number; domains: string[]; saved: number };
  supersedes?: { id: string; version: number };
  /** An English label, when one was invented for it; never its identity. */
  label?: string;
}

/** The registry: every version of every morpheme, so old structures stay interpretable. */
export class Morphemes {
  private readonly all = new Map<string, Morpheme>();
  private seq = 0;

  key(id: string, version: number): string { return `${id}@${version}`; }
  get(id: string, version: number): Morpheme | undefined { return this.all.get(this.key(id, version)); }
  latest(id: string): Morpheme | undefined { let best: Morpheme | undefined; for (const mm of this.all.values()) if (mm.id === id && (!best || mm.version > best.version)) best = mm; return best; }
  list(): Morpheme[] { return [...this.all.values()]; }

  /** Expand a reference to its exact definition, by its version, with its variables bound to the reference's arguments. */
  readonly expand: Expand = (ref: M) => {
    const mm = this.get(ref.id, ref.version);
    if (!mm) throw new Error(`no morpheme ${ref.id} v${ref.version}`);
    return ref.args ? bind(mm.def, ref.args) : mm.def;
  };

  /** Promote by hand: a structure given a name, version 1. */
  define(def: Structure, evidence: Morpheme['evidence'], label?: string): Morpheme {
    const id = `μ${++this.seq}`;
    const mm: Morpheme = { id, version: 1, def, hash: hash(def, this.expand), evidence, ...(label ? { label } : {}) };
    this.all.set(this.key(id, 1), mm);
    return mm;
  }

  /** A morpheme whose meaning changes is a new version; the old keeps expanding as it did (section W). */
  revise(id: string, def: Structure, evidence: Morpheme['evidence'], label?: string): Morpheme {
    const prev = this.latest(id);
    if (!prev) throw new Error(`no morpheme ${id} to revise`);
    const mm: Morpheme = { id, version: prev.version + 1, def, hash: hash(def, this.expand), evidence, supersedes: { id, version: prev.version }, ...(label ? { label } : prev.label ? { label: prev.label } : {}) };
    this.all.set(this.key(id, mm.version), mm);
    return mm;
  }
}

/** The size of a structure: nodes, with each coordinate counted once. The description length a corpus is measured by. */
export function size(s: Structure): number {
  switch (s.k) {
    case 'D': case 'Q': return 1;
    case 'M': return 1 + (s.args ?? []).reduce((n, x) => n + size(x), 0);
    case 'E': return 2 + size(s.of);
    case 'C': return 2 + size(s.body);
    case 'T': return 1 + Object.keys(s.c).length + size(s.from) + size(s.to) + (s.cond ?? []).reduce((n, x) => n + size(x), 0);
    case 'R': return 1 + Object.keys(s.c).length + s.args.reduce((n, x) => n + size(x), 0);
  }
}

/** Every sub-structure of at least `min` nodes, with the structure it sits in. */
function subStructures(s: Structure, min: number, out: { sub: Structure; size: number }[] = []): { sub: Structure; size: number }[] {
  const n = size(s);
  if (n >= min && (s.k === 'R' || s.k === 'T' || s.k === 'C')) out.push({ sub: s, size: n });
  if (s.k === 'R') for (const x of s.args) subStructures(x, min, out);
  else if (s.k === 'T') { subStructures(s.from, min, out); subStructures(s.to, min, out); for (const x of s.cond ?? []) subStructures(x, min, out); }
  else if (s.k === 'C') subStructures(s.body, min, out);
  else if (s.k === 'E') subStructures(s.of, min, out);
  return out;
}

export interface Candidate { def: Structure; hash: string; occurrences: number; domains: string[]; size: number; saved: number }

/**
 * Candidates for a morpheme in a corpus (section O): recurring sub-structures of at least `min` nodes, with the
 * description length each would save: (occurrences − 1) × (size − 1) − 1 for the definition's own entry. Jargon is
 * refused: a candidate must save length, recur in at least `minDomains` domains, and recur at least `minOcc` times.
 */
export function candidates(corpus: { s: Structure; domain: string }[], opts: { min?: number; minOcc?: number; minDomains?: number } = {}, expand?: Expand): Candidate[] {
  const min = opts.min ?? 3, minOcc = opts.minOcc ?? 3, minDomains = opts.minDomains ?? 2;
  const seen = new Map<string, { def: Structure; size: number; occ: number; domains: Set<string>; vars: number }>();
  for (const { s, domain } of corpus) {
    for (const { sub, size: n } of subStructures(s, min)) {
      // the shape recurs, whatever filled it: a morpheme abstracts over the names (section O's "abstract it")
      const sk = skeleton(normalize(sub, expand));
      const h = hash(sk.def, expand);
      const have = seen.get(h);
      if (have) { have.occ++; have.domains.add(domain); } else seen.set(h, { def: sk.def, size: n, occ: 1, domains: new Set([domain]), vars: sk.args.length });
    }
  }
  const out: Candidate[] = [];
  for (const [h, x] of seen) {
    // each use costs a reference and its arguments; the definition is paid once
    const saved = (x.occ - 1) * (x.size - 1 - x.vars) - 1;
    if (x.occ >= minOcc && x.domains.size >= minDomains && saved > 0) out.push({ def: x.def, hash: h, occurrences: x.occ, domains: [...x.domains].sort(), size: x.size, saved });
  }
  return out.sort((a, b) => b.saved - a.saved);
}

/** Promote the best candidates into the registry, largest saving first, never two that mean the same. */
export function promote(reg: Morphemes, cands: Candidate[], max = 8): Morpheme[] {
  const out: Morpheme[] = [];
  for (const c of cands.slice(0, max)) {
    if (reg.list().some((mm) => mm.hash === c.hash)) continue;
    out.push(reg.define(c.def, { occurrences: c.occurrences, domains: c.domains, saved: c.saved }));
  }
  return out;
}

/** Replace every occurrence of a known morpheme's definition by a reference to it: the compressed form. */
export function compress(s: Structure, reg: Morphemes): Structure {
  if (s.k === 'R' || s.k === 'T' || s.k === 'C') {
    const sk = skeleton(normalize(s, reg.expand));
    const h = hash(sk.def, reg.expand);
    for (const mm of reg.list()) if (mm.hash === h) return sk.args.length ? { k: 'M', id: mm.id, version: mm.version, args: sk.args } : { k: 'M', id: mm.id, version: mm.version };
  }
  switch (s.k) {
    case 'R': return { ...s, args: s.args.map((x) => compress(x, reg)) } as R;
    case 'T': return { ...s, from: compress(s.from, reg), to: compress(s.to, reg), ...(s.cond ? { cond: s.cond.map((x) => compress(x, reg)) } : {}) } as T;
    case 'C': return { ...s, body: compress(s.body, reg) };
    case 'E': return { ...s, of: compress(s.of, reg) };
    default: return s;
  }
}

/** Expand every morpheme reference back: the canonical meaning, which `compress` never changes. */
export function expandAll(s: Structure, reg: Morphemes): Structure {
  return normalize(s, reg.expand);
}

/** Description length of a corpus with and without the registry's morphemes (each definition paid once). */
export function descriptionLength(corpus: Structure[], reg?: Morphemes): number {
  if (!reg) return corpus.reduce((n, s) => n + size(s), 0);
  const defs = reg.list().reduce((n, mm) => n + size(mm.def) + 1, 0);
  return defs + corpus.reduce((n, s) => n + size(compress(s, reg)), 0);
}

/** Two structures with different surface text that mean the same: the compressed and the expanded forms, for one. */
export const sameMeaning = (a: Structure, b: Structure, reg: Morphemes): boolean => canonical(normalize(a, reg.expand)) === canonical(normalize(b, reg.expand));
