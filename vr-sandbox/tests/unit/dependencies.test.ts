// One registry of what cites what, by hash (src/ganglia/dependencies.ts): a law's identity is the hash of its content;
// the research records, the law graph's derivations and the Mind's commits cite those hashes; a corrected law is a new
// hash, and whatever cited the old one is stale at once, transitively, across every source, with nothing marked by hand.

import { describe, expect, it } from 'vitest';
import { citations, hashesOfLaws, hashOfLaw, lawChanged, lawHashes, present, stale } from '../../src/ganglia/dependencies';
import { LAWS } from '../../src/ganglia/laws';
import { lawHash, TERMS } from '../../src/ganglia/native/terms';
import { branch } from '../../src/ganglia/native/tsc';
import { d, r } from '../../src/ganglia/native/core';
import type { Commit } from '../../src/mind';

const commit = (seq: number, parents: number[], data: Record<string, unknown>): Commit => ({ seq, at: '2026-10-03T00:00:00Z', session: 's', inv: 'x', kind: 'hypothesis', origin: 'ego', parents, item: d(`c${seq}`), data, validation: { by: 'none', verdict: 'none' }, status: 'testing', physics: 'p', ms: 0 });

describe('one registry of what cites what', () => {
  it('every law has one hash, that of its content, the same one the research records cite; today nothing is stale', () => {
    const hs = lawHashes();
    expect(hs.size).toBe(LAWS.length);
    expect(new Set(hs.values()).size).toBe(LAWS.length);
    for (const l of LAWS) expect(hs.get(l.id)).toBe(lawHash(l.id));
    const cits = citations();
    expect(cits.filter((c) => c.kind === 'record').length).toBe(branch().length);
    expect(cits.filter((c) => c.kind === 'derivation').length).toBeGreaterThanOrEqual(5);
    expect(stale(cits, present(cits))).toEqual([]);
  });

  it('a corrected term for the speed of sound reaches, by hash alone, the record that compares it with light, the commits that cited it and their children; a law nothing cites reaches nothing', () => {
    // the speed of sound has no term yet: its identity is the law as a Nex structure; a corrected one is any other structure
    const corrected = r('state', [d('sound.speed'), d('corrected')], {});
    const commits = [commit(1, [], { lawHashes: hashesOfLaws(['sound.speed']) }), commit(2, [1], {}), commit(3, [], { lawHashes: hashesOfLaws(['ohm']) })];
    const out = lawChanged('sound.speed', { term: corrected }, { commits });
    expect(out.before).toBe(lawHash('sound.speed'));
    expect(out.after).not.toBe(out.before);
    const ids = out.stale.map((c) => c.id);
    expect(ids).toContain('tsc.propagation-shapes');
    expect(ids).toContain('commit:1');
    expect(ids).toContain('commit:2');
    expect(ids).not.toContain('commit:3');
    expect(ids.some((x) => x.startsWith('derivation:'))).toBe(false);
    // the whole chain under the corrected hash, and nothing else: every stale thing cites a stale hash or the old one
    const staleHashes = new Set([out.before, ...out.stale.map((c) => c.hash)]);
    for (const c of out.stale) expect(c.cites.some((h) => staleHashes.has(h))).toBe(true);
    // a law that nothing cites: a new hash for it leaves nothing stale
    const cited = new Set(citations({ commits }).flatMap((c) => c.cites));
    const lonely = LAWS.find((l) => !cited.has(hashOfLaw(l)))!;
    expect(lawChanged(lonely.id, { term: r('state', [d(lonely.id), d('corrected')], {}) }, { commits }).stale).toEqual([]);
    console.log(`sound.speed corrected: ${out.stale.length} stale (${ids.join(', ')}); ${cited.size} hashes cited across ${citations({ commits }).length} citing things`);
  });

  it('a derivation found by composition cites both parents: correcting Ohm\'s law makes Joule heating stale', () => {
    const out = lawChanged('ohm', { term: r('state', [TERMS['ohm'] ?? d('ohm'), d('corrected')], {}) });
    expect(out.stale.map((c) => c.id)).toContain('derivation:joule');
  });
});
