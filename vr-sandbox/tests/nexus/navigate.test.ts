// Navigation (src/nexus/navigate.ts): every library by its type and what reaches it, how each node's work flows, what
// goes after and before a node, what a board may be missing, and one search through all of it. Its generated parts
// are kept current here: what each node's code names (navigate-named.ts) and the atlas written out (docs/ATLAS.md);
// write them again with UPDATE_ATLAS=1 npx vitest run tests/nexus/navigate.test.ts (twice where the nodes' code changed:
// the second run reads the names the first wrote).

import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../src/nexus/seeds';
import { LIBRARY } from '../../src/nexus/blocks';
import { FLOWS, LIBRARY_TYPES, NAMED_BY, allLibraries, atlasText, flowOf, needsOf, nextFor, search } from '../../src/nexus/navigate';
import { starterBoards } from '../../src/nexus/starters';
import { emptyBoard, placeBlock, wire } from '../../src/nexus/dataflow';

const root = join(__dirname, '../..'), update = !!process.env['UPDATE_ATLAS'];

/** For each library, the nodes whose code in blocks.ts names it. */
function namedText(): string {
  const src = readFileSync(join(root, 'src/nexus/blocks.ts'), 'utf8'), parts = src.split(/\n\s*def\(\{ id: '/).slice(1), named: Record<string, string[]> = {};
  for (const p of parts) { const id = p.slice(0, p.indexOf("'")); if (!LIBRARY.has(id)) continue; for (const [lib, re] of Object.entries(NAMED_BY)) if (re.test(p)) (named[lib] ??= []).push(id); }
  const body = Object.keys(NAMED_BY).filter((k) => named[k]).map((k) => `  ${k}: [${named[k]!.sort().map((x) => `'${x}'`).join(', ')}],`).join('\n');
  return `// Written by tests/nexus/navigate.test.ts (UPDATE_ATLAS=1): for each library, the nodes whose code in blocks.ts names it\n// (NAMED_BY in navigate.ts). Do not edit by hand; the test fails when it is out of date.\nexport const NAMED: Record<string, string[]> = {\n${body}\n};\n`;
}

describe('every library, reached', () => {
  it('what each node\'s code names is kept current', () => {
    const want = namedText(), path = join(root, 'src/nexus/navigate-named.ts');
    if (update) writeFileSync(path, want);
    expect(readFileSync(path, 'utf8'), 'out of date: UPDATE_ATLAS=1 npx vitest run tests/nexus/navigate.test.ts').toBe(want);
  });
  it('every library is of a type, holds something, and says what reaches it', () => {
    const libs = allLibraries();
    for (const l of libs) { expect(LIBRARY_TYPES.some((t) => t.id === l.type), l.id).toBe(true); expect(l.count, l.id).toBeGreaterThan(0); }
    // the products a node chooses among by its settings, found from the choices themselves
    expect(libs.find((l) => l.id === 'machines')!.reach.map((r) => r.node)).toContain('vehicle.model');
    expect(libs.find((l) => l.id === 'sections')!.reach.map((r) => r.node)).toEqual(expect.arrayContaining(['line', 'route']));
    expect(libs.find((l) => l.id === 'actors')!.reach.map((r) => r.node)).toEqual(expect.arrayContaining(['agent', 'afford']));
  });
  it('the atlas written out is current', () => {
    const want = atlasText(), path = join(root, 'docs/ATLAS.md');
    if (update) writeFileSync(path, want);
    expect(readFileSync(path, 'utf8'), 'out of date: UPDATE_ATLAS=1 npx vitest run tests/nexus/navigate.test.ts').toBe(want);
  });
});

describe('how work flows, and what goes with what', () => {
  it('every node\'s work flows one of the ways, and each way has nodes', () => {
    const by = new Map<string, number>(); for (const b of LIBRARY.values()) { const f = flowOf(b); expect(FLOWS.some((x) => x.id === f), b.id).toBe(true); by.set(f, (by.get(f) ?? 0) + 1); }
    for (const f of FLOWS) expect(by.get(f.id) ?? 0, f.id).toBeGreaterThan(0);
    expect(flowOf(LIBRARY.get('follow')!)).toBe('played'); expect(flowOf(LIBRARY.get('zone')!)).toBe('once');
  });
  it('after a node: what the flows already wire to it first, then what takes what it gives', () => {
    const p = nextFor('proximity');
    expect(p.after.map((x) => x.id)).toContain('mates');
    expect(p.after[0]!.why).toMatch(/wired so in \d flow/);
    expect(p.before.map((x) => x.id)).toContain('seed.room');
    expect(p.usedIn.length).toBeGreaterThan(0);
    // a bare number is a weaker tie than a thing: a shape's after-list leads with what places or changes a part
    expect(nextFor('shape.box').after.slice(0, 3).every((x) => LIBRARY.get(x.id)!.kind !== 'law')).toBe(true);
  });
  it('a board is told what it may be missing, by the stages of its work, never by what it is about', () => {
    const b = emptyBoard('t'), box = placeBlock(b, 'shape.box', 0, 0, {}, 'a'), z = placeBlock(b, 'zone', 0, 0, {}, 'z');
    wire(b, box, 'part', z, 'thing');
    const needs = needsOf(b);
    expect(needs.find((n) => n.stage === 'mate')?.nodes).toContain('proximity');
    // and it says where: the keeping goes after the thing the zone is on, so it arrives wired
    expect(needs.find((n) => n.stage === 'mate')?.at).toEqual({ after: 'z' });
    // the starter boards that keep their zones and mates are not told to
    const house = starterBoards().find(([t]) => t.startsWith('Proximity and mates'))!;
    expect(needsOf(house[1]()).some((n) => n.stage === 'mate')).toBe(false);
  });
});

describe('one search through everything', () => {
  it('finds nodes, products, parts, bodies and boards, each with what uses it', () => {
    const r = search('proximity'); expect(r[0]!.id).toBe('proximity'); expect(r[0]!.add).toEqual({ block: 'proximity' });
    const car = search('corolla'); expect(car.some((x) => x.library === 'machines' && x.add?.block)).toBe(true);
    const sec = search('garden hose'); const h = sec.find((x) => x.library === 'sections'); if (h) expect(h.add?.set).toBeDefined();
    expect(search('house').some((x) => x.board)).toBe(true);
    expect(search('child').some((x) => x.library === 'actors' && x.add?.block)).toBe(true);
    expect(search('zz nothing at all')).toEqual([]);
  });
});
