// One registry of what cites what, by hash (docs/NEX-TOPOLOGY.md §8). Every law has a hash of its content (its term
// when it has one, else its Nex structure) and its worked example; every record that stands on a law or on another
// record cites those hashes. A change is a new hash: whatever cites a hash that no longer exists is stale, known at
// once by inspection and recomputed only when asked. Nothing is marked by hand, and no subsystem keeps its own
// notion of "depends on": the research branch, the law graph's derivations and the Mind's commits all cite here.

import { d, hash, r, type Structure } from './native/core';
import { fromLaw } from './native/nexus';
import { TERMS, affected } from './native/terms';
import { LAWS, lawById } from './laws';
import type { Law } from './types';
import { branch as tscBranch } from './native/tsc';
import { lawGraph, type LawGraph } from './lawgraph';
import type { Commit } from '../mind/journal';

/**
 * The hash of a law: its content, the term when it has one (the same hash the research records cite, terms.lawHash),
 * else the law as a Nex structure. A corrected term is a new hash; the worked example is a check on the term, not the
 * term, so it is not part of the identity.
 */
export function hashOfLaw(law: Law, term: Structure | undefined = TERMS[law.id]): string {
  return hash(term ?? fromLaw(law));
}
// lawHash(id) in terms.ts is this for the law of the book with that id; the two agree by construction (tested).
export const lawHashes = (laws: Law[] = LAWS): Map<string, string> => new Map(laws.map((l) => [l.id, hashOfLaw(l)]));
/** The hashes of the laws a commit cites, from the ids it carries. */
export const hashesOfLaws = (ids: string[]): string[] => ids.map((id) => lawById(id)).filter((l): l is Law => !!l).map((l) => hashOfLaw(l));

export interface Citation { id: string; kind: 'record' | 'derivation' | 'commit'; hash: string; cites: string[] }

/** Everything that cites something, from every source that does: the research branch's records, the law graph's derivations, the Mind's commits. */
export function citations(opts: { commits?: Commit[]; graph?: LawGraph } = {}): Citation[] {
  const out: Citation[] = [];
  const byRecord = new Map(tscBranch().map((x) => [x.id, x.hash]));
  for (const x of tscBranch()) out.push({ id: x.id, kind: 'record', hash: x.hash, cites: [...x.derivation.from, ...x.assumptions.map((a) => byRecord.get(a) ?? a)] });
  const g = opts.graph ?? lawGraph();
  for (const dv of g.derivations) { const outer = lawById(dv.outer), inner = lawById(dv.inner); if (outer && inner) out.push({ id: `derivation:${dv.result}`, kind: 'derivation', hash: hash(r('state', [d(dv.result), d(dv.outer), d(dv.inner)], {})), cites: [hashOfLaw(outer), hashOfLaw(inner)] }); }
  const commitHash = new Map<number, string>();
  for (const c of opts.commits ?? []) { const h = hash(c.item); commitHash.set(c.seq, h); out.push({ id: `commit:${c.seq}`, kind: 'commit', hash: h, cites: [...((c.data['lawHashes'] as string[] | undefined) ?? []), ...c.parents.map((p) => commitHash.get(p)).filter((x): x is string => !!x)] }); }
  return out;
}

/** The hashes that exist now: every law's, and every citing thing's own. */
export function present(cits: Citation[], laws: Law[] = LAWS): Set<string> {
  return new Set([...laws.map((l) => hashOfLaw(l)), ...cits.map((c) => c.hash)]);
}

/** What is stale: a citation of a hash that is not present (its parent changed), and transitively whatever cites a stale thing. Known at once; nothing recomputed here. */
export function stale(cits: Citation[], here: Set<string>): Citation[] {
  const gone = new Set<string>();
  for (const c of cits) for (const h of c.cites) if (!here.has(h)) gone.add(h);
  const ids = affected(cits.map((c) => ({ id: c.id, cites: c.cites })), [...gone], (id) => cits.find((c) => c.id === id)?.hash);
  return cits.filter((c) => ids.includes(c.id));
}

/** A law corrected (its term, or the law itself): what its new hash would leave stale, from one change, across every source. */
export function lawChanged(id: string, corrected: { law?: Law; term?: Structure }, opts: { commits?: Commit[] } = {}): { before: string; after: string; stale: Citation[] } {
  const cits = citations(opts);
  const law = lawById(id)!;
  const before = hashOfLaw(law), after = hashOfLaw(corrected.law ?? law, corrected.term ?? (corrected.law ? TERMS[id] : undefined));
  const here = present(cits, LAWS.filter((l) => l.id !== id));
  here.add(after);
  return { before, after, stale: stale(cits, here) };
}
