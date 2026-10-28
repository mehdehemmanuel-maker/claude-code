// The node library kept navigable: every node on one shelf by stage, read from what it is; the catalogue written out
// (docs/NODES.md) kept current; no two nodes by one name.
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import '../../src/nexus/seeds';
import { LIBRARY, STAGES, libraryCatalogue, shelves, stageOf } from '../../src/nexus/blocks';

describe('the library, by stage', () => {
  it('every node is on one shelf, read from what it is; the laws on theirs; no shelf but the laws holds a quarter of the rest', () => {
    const all = [...LIBRARY.values()].filter((b) => !b.id.startsWith('group.')), ids = new Set(STAGES.map((s) => s.id));
    for (const b of all) expect(ids.has(stageOf(b)), b.id).toBe(true);
    expect(shelves('stage').reduce((n, s) => n + s.blocks.length, 0)).toBe(all.length);
    for (const b of all.filter((x) => x.kind === 'law')) expect(stageOf(b)).toBe('law');
    const rest = all.filter((b) => stageOf(b) !== 'law').length; for (const s of shelves('stage')) if (s.id !== 'law') expect(s.blocks.length, s.name).toBeLessThan(rest / 4 + 30);
  });
  it('where the mates live: zones, measured mates, proximity, faces and shafts on one shelf', () => {
    for (const id of ['zone', 'relate', 'proximity', 'mate', 'onto', 'place', 'route']) expect(stageOf(LIBRARY.get(id)!), id).toBe('mate');
    expect(stageOf(LIBRARY.get('agent')!)).toBe('sense'); expect(stageOf(LIBRARY.get('logic.run')!)).toBe('run'); expect(stageOf(LIBRARY.get('seed.house')!)).toBe('make');
  });
  it('no two nodes share a name', () => {
    const names = [...LIBRARY.values()].map((b) => b.name.toLowerCase()), dup = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dup).toEqual([]);
  });
  it('docs/NODES.md is the catalogue as the library stands', () => {
    const now = libraryCatalogue(); if (process.env.UPDATE_NODES) writeFileSync('docs/NODES.md', now + '\n');
    expect(readFileSync('docs/NODES.md', 'utf8')).toBe(now + '\n');
  });
});
