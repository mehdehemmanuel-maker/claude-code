// The catalogue: every standard size of every family; ten thousand parts and more, each made by its family from its
// standard when asked for, each with everything inside it known, and each coming down, at the bottom, to elements.

import { describe, expect, it } from 'vitest';
import { callFamily } from '../../src/nexus/parts/families';
import { SERIES, catalogue, catalogueItem, forgetCatalogue, searchCatalogue } from '../../src/nexus/parts/catalogue';
import { INVENTORY, fundamentals, resolve } from '../../src/nexus/parts/inventory';
import { ELEMENTS } from '../../src/nexus/parts/elements';

describe('the catalogue', () => {
  it('the catalogue reads itself back: every line it writes names the same part again', () => {
    // THE ROUND TRIP. The catalogue writes 60,000-odd lines of words and `callFamily` reads words back into parts, and
    // nothing ever checked that the second understands the first. No CAD system reads its own part numbers back.
    // It is the cheapest ratchet here and it covers a class of fault rather than a bug: a family whose `read` and
    // whose `make` drift apart - a size written one way and parsed another - now fails at the line it broke.
    const lost: string[] = [];
    for (const l of catalogue()) {
      const it = catalogueItem(l); if (!it) continue;
      const back = callFamily(l);
      if (typeof back === 'string' || !back) { lost.push(`${l} -> ${typeof back === 'string' ? back.slice(0, 70) : 'nothing'}`); continue; }
      if (back.id !== it.id) lost.push(`${l} -> wrote ${it.id}, reads back as ${back.id}`);
    }
    expect(lost.slice(0, 8), `${lost.length} of the catalogue's own lines do not name the same part when read back`).toEqual([]);
  });

  it('lists over ten thousand different parts, cheaply, family by family', () => {
    // The BEST OF THREE COLD BUILDS. This asserted one wall-clock reading inside a suite that runs 178 files in
    // parallel on four cores, so it was measuring the scheduler: it failed at 206.3 ms and 201.9 ms on gate runs whose
    // code differed in nothing `catalogue` touches, while standalone it is 85-98 ms. Taking the best of three was the
    // right idea and the WRONG CODE, because `catalogue()` memoises: three readings came out 98.176, 0.005, 0.001 ms,
    // so `best < 200` could not fail at any speed. That is a dead assertion with a reasoned defence, which is worse
    // than a flaky one — a flaky test at least still fails when the code gets slow.
    // `forgetCatalogue()` makes each reading a real build. Contention can only ever ADD time, so the minimum of three
    // is the honest estimate of the work and the 200 ms budget is untouched.
    let ms = Infinity, all: ReturnType<typeof catalogue> = [];
    for (let i = 0; i < 3; i++) { forgetCatalogue(); const t0 = performance.now(); all = catalogue(); ms = Math.min(ms, performance.now() - t0); }
    expect(ms).toBeLessThan(200);
    const ids = new Set<string>(); for (const l of all) { const it = catalogueItem(l); expect(it, l).not.toBeNull(); ids.add(it!.id); }
    expect(ids.size).toBeGreaterThanOrEqual(10_000);
    expect(Object.keys(SERIES).length).toBeGreaterThanOrEqual(40);
  });
  it('every part is buildable: what is inside it is known, and every branch ends in elements', () => {
    const symbols = new Set(Object.keys(ELEMENTS).map((s) => `el-${s.toLowerCase()}`));
    for (const l of catalogue()) {
      const it = catalogueItem(l)!;
      for (const c of it.of) expect(INVENTORY.has(c.id) || !!it.inner?.some((x) => x.id === c.id), `${l} has ${c.id}`).toBe(true);
      expect(it.sized?.family, l).toBeTruthy();
    }
    // a sample of each family, made into the inventory and followed down to its elements
    for (const [fam, s] of Object.entries(SERIES)) { const ls = s.lines(); for (const l of [ls[0]!, ls[Math.floor(ls.length / 2)]!, ls.at(-1)!]) { const it = resolve(l); expect(typeof it, `${fam}: ${l}`).toBe('object'); const f = fundamentals((it as { id: string }).id); expect(f.length, `${l} comes down to elements`).toBeGreaterThan(0); for (const e of f) expect(symbols.has(e.id), `${l}: ${e.id}`).toBe(true); } }
  });
  it('found by its words without making the rest', () => {
    expect(searchCatalogue('bearing 6205 2RS')[0]).toBe('bearing 6205 2RS');
    expect(searchCatalogue('M4x20').some((l) => l === 'screw M4x20')).toBe(true);
    const r = searchCatalogue('resistor 4.7k'); // whole words first: the resistors, then the chip resistors
    expect(r.slice(0, 5).every((l) => l.startsWith('resistor 4.7k'))).toBe(true);
    expect(r.every((l) => /resistor .*4\.7k/.test(l))).toBe(true);
  });
});
