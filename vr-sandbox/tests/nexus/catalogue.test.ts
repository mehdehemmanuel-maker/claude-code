// The catalogue: every standard size of every family; ten thousand parts and more, each made by its family from its
// standard when asked for, each with everything inside it known, and each coming down, at the bottom, to elements.

import { describe, expect, it } from 'vitest';
import { SERIES, catalogue, catalogueItem, searchCatalogue } from '../../src/nexus/catalogue';
import { INVENTORY, fundamentals, resolve } from '../../src/nexus/inventory';
import { ELEMENTS } from '../../src/nexus/elements';

describe('the catalogue', () => {
  it('lists over ten thousand different parts, cheaply, family by family', () => {
    const t0 = performance.now(), all = catalogue(), ms = performance.now() - t0;
    expect(ms).toBeLessThan(200);
    const ids = new Set<string>(); for (const l of all) { const it = catalogueItem(l); expect(it, l).not.toBeNull(); ids.add(it!.id); }
    expect(ids.size).toBeGreaterThanOrEqual(10_000);
    expect(Object.keys(SERIES).length).toBeGreaterThanOrEqual(40);
  });
  it('every part is buildable: what is inside it is known, and every branch ends in elements', () => {
    const symbols = new Set(Object.keys(ELEMENTS).map((s) => `el-${s.toLowerCase()}`));
    for (const l of catalogue()) {
      const it = catalogueItem(l)!;
      for (const c of it.of) expect(INVENTORY.has(c.id), `${l} has ${c.id}`).toBe(true);
      expect(it.sized?.family, l).toBeTruthy();
    }
    // a sample of each family, made into the inventory and followed down to its elements
    for (const [fam, s] of Object.entries(SERIES)) { const ls = s.lines(); for (const l of [ls[0]!, ls[Math.floor(ls.length / 2)]!, ls.at(-1)!]) { const it = resolve(l); expect(typeof it, `${fam}: ${l}`).toBe('object'); const f = fundamentals((it as { id: string }).id); expect(f.length, `${l} comes down to elements`).toBeGreaterThan(0); for (const e of f) expect(symbols.has(e.id), `${l}: ${e.id}`).toBe(true); } }
  });
  it('found by its words without making the rest', () => {
    expect(searchCatalogue('bearing 6205 2RS')[0]).toBe('bearing 6205 2RS');
    expect(searchCatalogue('M4x20').some((l) => l === 'screw M4x20')).toBe(true);
    expect(searchCatalogue('resistor 4.7k').every((l) => l.startsWith('resistor 4.7k'))).toBe(true);
  });
});
