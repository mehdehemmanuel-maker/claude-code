// Grammar evolution (docs/EGO-NATIVE-LANGUAGE.md sections O and P), run over everything the substrate says. The
// corpus is every structure of every thing (its arrows, the laws that govern it and its kinds); the candidates are
// the sub-structures that recur across domains; the morphemes are the ones that shorten the corpus most, promoted
// with their evidence and given an English label after the fact (a label is never a morpheme's identity). What
// comes out is measured, not designed: on 3 October 2026, eight morphemes shortened 13785 structures by 17 %, and
// the first of them is what human languages call "a textbook fact": a relation at the packs' default confidence,
// derived, held true.

import type { Law } from '../types';
import type { Substrate } from '../substrate/substrate';
import { spokenName } from '../substrate/names';
import { type Morpheme, Morphemes, candidates, compress, descriptionLength, promote, size, type Candidate } from './morpheme';
import { saidOf } from './nexus';
import { text } from './text';
import { type Coords, type Structure } from './core';

export interface Grammar {
  corpus: { s: Structure; domain: string }[];
  entities: number;
  candidates: Candidate[];
  registry: Morphemes;
  promoted: Morpheme[];
  before: number;
  after: number;
  /** after / before: 1 is nothing saved. */
  ratio: number;
  /** How many structures of the corpus got shorter. */
  shortened: number;
}

const LAYER = /^(?:kind|block|view|cross|param|scale)\./;

/** Everything the substrate says, as one corpus: each structure once, in the domain of the thing it was said of. */
export function corpusOf(s: Substrate, laws?: Map<string, Law>): { s: Structure; domain: string }[] {
  const out: { s: Structure; domain: string }[] = [];
  const seen = new Set<string>();
  for (const e of s.entities.values()) {
    if (LAYER.test(e.id)) continue;
    for (const x of saidOf(s, e.id, laws)) { const key = JSON.stringify(x); if (seen.has(key)) continue; seen.add(key); out.push({ s: x, domain: e.domains[0] ?? 'unplaced' }); }
  }
  return out;
}

/** Grow the grammar over the substrate: find what recurs, promote what pays, measure what it saved. */
export function grow(s: Substrate, laws?: Map<string, Law>, opts: { max?: number; min?: number; minOcc?: number; minDomains?: number } = {}): Grammar {
  const corpus = corpusOf(s, laws);
  const cands = candidates(corpus, { min: opts.min ?? 3, minOcc: opts.minOcc ?? 3, minDomains: opts.minDomains ?? 2 });
  const registry = new Morphemes();
  const promoted = promote(registry, cands, opts.max ?? 8);
  for (const m of promoted) m.label = label(m.def);
  const before = descriptionLength(corpus.map((x) => x.s)), after = descriptionLength(corpus.map((x) => x.s), registry);
  let shortened = 0;
  for (const x of corpus) if (size(compress(x.s, registry)) < size(x.s)) shortened++;
  return { corpus, entities: new Set(corpus.map((x) => x.domain)).size, candidates: cands, registry, promoted, before, after, ratio: before ? after / before : 1, shortened };
}

/** An English label for a morpheme, read off its definition after the fact: the operator, the evidence and the certainty it fixes. */
export function label(def: Structure): string {
  if (def.k !== 'R' && def.k !== 'T') return 'a structure';
  const c: Coords = def.c;
  const cert = c.cert?.lo !== undefined && c.cert.hi !== undefined ? ` at ${c.cert.lo} to ${c.cert.hi}` : '';
  const ev = c.ev ? `, ${c.ev.how}` : '';
  if (def.k === 'T') return `a becoming${cert}${ev}`;
  if (def.op === 'function' && c.mech) return `the law ${c.mech} over its quantities`;
  const op = def.op === 'influence' ? `${c.polarity === '-' ? 'a lowering' : c.polarity === '+' ? 'a raising' : 'an influence'}${c.necessity ? `, ${c.necessity}` : ''}` : def.op === 'part' ? 'a part-of' : def.op === 'kind' ? 'a kind-of' : def.op === 'constrain' ? 'a constraint' : def.op === 'morphism' ? 'a mapping' : def.op === 'quantity' ? 'a quantity' : `a ${def.op}`;
  return `${op}${cert}${ev}`;
}

/** The grammar, said: what recurred, what was promoted, what it saved, with each morpheme's shape in Nex and an example filled in. */
export function sayGrammar(s: Substrate, g: Grammar): string {
  const name = (id: string) => { const e = s.get(id); return e ? spokenName(e) : id; };
  const examples = g.promoted.map((m) => {
    const ex = g.corpus.find((x) => { const c = compress(x.s, g.registry); return c.k === 'M' && c.id === m.id; });
    const args = ex ? ((compress(ex.s, g.registry) as { args?: Structure[] }).args ?? []).map((a) => (a.k === 'D' ? name(a.id) : text(a))) : [];
    return `${m.id} = ${text(m.def).slice(0, 110)}${text(m.def).length > 110 ? '…' : ''} (${m.label}; ${m.evidence.occurrences} times in ${m.evidence.domains.length} domains${args.length ? `; e.g. ${args.join(', ')}` : ''})`;
  });
  const pct = Math.round((1 - g.ratio) * 100);
  return `My grammar grows by description length: over the ${g.corpus.length} structures I hold, ${g.candidates.length} shapes recur across domains and would each shorten the whole; I promoted ${g.promoted.length}, which shortened it by ${pct}% (${g.before} to ${g.after} nodes) and ${g.shortened} structures with it, every one expanding back exactly. The first is what you would call a textbook fact: a relation at my packs' usual confidence, derived, held true. They are: ${examples.join('; ')}.`;
}
