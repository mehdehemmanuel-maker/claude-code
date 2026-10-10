// Geometry in the taxonomy (src/nexus/embody/geometry.ts): the sixteen ways of ordering what a shape is, every entry
// under them, and, for each that Nexus makes or measures, where. What it says Nexus makes must be there to read: a
// file named that exists, and a function named that the file defines.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GEOMETRY, census } from '../../src/nexus/embody/geometry';
import { TAXONOMY, find, type Node } from '../../src/nexus/embody/taxonomy';
import { named } from '../../src/nexus/substrate/understand';

const all = (n: Node): Node[] => n.children.flatMap((c) => [c, ...all(c)]);
const root = join(__dirname, '../..');

describe('geometry in the taxonomy', () => {
  it('is a domain of the taxonomy, its sixteen categories in their order', () => {
    expect(TAXONOMY).toContain(GEOMETRY);
    expect(GEOMETRY.children.map((c) => c.name)).toEqual(['Dimension', 'Topology', 'Primitive forms', 'Generated forms', 'Curve families', 'Surface families', 'Solid families', 'Geometric features', 'Patterns', 'Transformations', 'Relations', 'Boundaries & interfaces', 'Geometric properties', 'Distributions / fields', 'Motion geometry', 'Composite / assembled']);
  });
  it('holds every entry under them, as they were given', () => {
    const names = (id: string) => find(id)!.children.map((c) => c.name);
    expect(names('geometry/dimension')).toEqual(['0D', '1D', '2D', '3D']);
    expect(names('geometry/dimension/3d')).toEqual(['Volume / Solid']);
    expect(names('geometry/topology')).toEqual(['Connected', 'Disconnected', 'Inside / Outside', 'Boundary', 'Hole', 'Cavity', 'Channel', 'Loop', 'Branch', 'Network', 'Containment']);
    expect(names('geometry/primitive-forms')).toHaveLength(13);
    expect(names('geometry/curve-families')).toContain('Bézier');
    expect(names('geometry/geometric-features')).toHaveLength(19);
    expect(names('geometry/transformations')).toHaveLength(12);
    expect(names('geometry/composite-assembled')).toEqual(['Part', 'Feature', 'Mechanism', 'Assembly', 'Structure', 'Lattice', 'Machine', 'Environment']);
    // sixteen categories and the 164 entries under them (8, 11, 13, 9, 11, 9, 8, 19, 10, 12, 12, 8, 12, 7, 7, 8)
    expect(census(GEOMETRY).entries).toBe(180);
    // ids are paths, so the same word in two places is two entries
    const ids = all(GEOMETRY).map((n) => n.id); expect(new Set(ids).size).toBe(ids.length);
    expect(find('geometry/topology/hole')!.says).not.toBe(find('geometry/geometric-features/hole')!.says);
  });
  it('says where Nexus makes what it makes, and only what is there to read', () => {
    const made = all(GEOMETRY).filter((n) => n.made);
    expect(made.length).toBeGreaterThan(30); expect(made.length).toBeLessThan(census(GEOMETRY).entries);
    for (const n of made) {
      const files = [...n.made!.matchAll(/src\/nexus\/[\w/.-]+/g)].map((m) => m[0]!.replace(/[.,;)]+$/, ''));
      expect(files.length, `${n.id} names no file`).toBeGreaterThan(0);
      for (const f of files) expect(existsSync(join(root, f)), `${n.id}: ${f}`).toBe(true);
      for (const fn of n.made!.match(/\b(placeParts|boxOf)\b/g) ?? []) expect(readFileSync(join(root, files[0]!), 'utf8')).toMatch(new RegExp(`function ${fn}\\b`));
    }
  });
  it('is read when a shape is described in plain words', () => {
    expect(named('the curve traced by the end of a string unwound from a circle')[0]!.name).toBe('Involute');
    expect(named('a surface that unrolls flat without stretching')[0]!.where).toMatch(/^Geometry › Surface families › Developable/);
  });
});

describe('a board of what Nexus knows', () => {
  it('is the branch as nodes under what holds them, each saying what it is, its law, and what makes it', async () => {
    const { boardOfKnowledge, derive, nodesOf, edgesOf } = await import('../../src/nexus/substrate/boards');
    const b = boardOfKnowledge(GEOMETRY), ns = nodesOf(b);
    expect(ns).toHaveLength(181); expect(edgesOf(b)).toHaveLength(180);
    expect(b.about).toMatch(/180 entries, 58 of them made or measured by Nexus/);
    const box = Object.values(b.nodes).find((n) => n.label === 'Box')!;
    expect(box.kind).toBe('made'); expect(box.note).toMatch(/V = a b c · Nexus makes it: a block/);
    const loft = Object.values(b.nodes).find((n) => n.label === 'Loft')!;
    expect(loft.kind).toBeUndefined(); expect(loft.note).toMatch(/Nexus knows it by name and law only/);
    expect(Object.values(b.nodes).find((n) => n.label === 'Torus')!.note).toMatch(/Nexus makes it: a ring a pipeline places/);
    // what heads it is what its links make head it: the features, with nineteen under them, outrank the sixteen
    const d = derive(b), head = d.roots.filter((r) => d.deg.get(r)! > 0).map((r) => b.nodes[r]!.label);
    expect(head).toEqual(['Geometric features']);
  });
});

describe('the board of geometry on the wall', () => {
  it('is a page of columns its words can be read on, not one long column', async () => {
    const { boardOfKnowledge, derive, layout } = await import('../../src/nexus/substrate/boards');
    const b = boardOfKnowledge(GEOMETRY), d = derive(b), box = () => ({ w: 150, h: 42 }), pos = layout(d, 'categories', box);
    const xs = [...pos.values()].map((p) => p.x), ys = [...pos.values()].map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs) + 150, h = Math.max(...ys) - Math.min(...ys) + 42;
    // the wall is 2560 × 1438 at 2.6 at most, and a card's words are drawn from 0.35 up: it fits at well over that
    const k = Math.min((2560 - 120) / w, (1438 - 120) / h);
    expect(k).toBeGreaterThan(0.5);
    // no two cards on one spot
    const at = new Set([...pos.values()].map((p) => `${p.x},${p.y}`)); expect(at.size).toBe(pos.size);
  });
});
