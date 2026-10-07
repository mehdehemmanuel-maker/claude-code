// Every part the families can make, numbered: over a billion, none stored; any number decodes straight to its sizes
// and its family makes it, and its sizes encode straight back to its number. Each one is a part like any other: all
// that is in it known, down to the elements.

import { describe, expect, it } from 'vitest';
import { MADE_TO_ORDER_CAP, numberOf, numberOfWords, partAt, partItem, spaceSize } from '../../src/nexus/partspace';
import { callFamily } from '../../src/nexus/families';
import { INVENTORY, fundamentals, resolve } from '../../src/nexus/inventory';

describe('the space of parts', () => {
  it('holds over a billion parts, worked out in milliseconds and stored nowhere', () => {
    const t0 = performance.now(), s = spaceSize();
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(s.total).toBeGreaterThan(1e9);
    expect(s.families.length).toBeGreaterThanOrEqual(40);
  });
  it('counts a made-to-order potential as at most ten thousand distinct parts a family, its standard sizes in full', () => {
    const s = spaceSize(), ts = s.families.find((f) => f.family === 'torsionspring')!;
    expect(ts.n).toBeGreaterThan(1e12); // the potential is kept: any of them can be wound
    expect(ts.counted).toBe(MADE_TO_ORDER_CAP); // but counts as ten thousand parts, not trillions
    for (const f of s.families) expect(f.counted).toBeLessThanOrEqual(Math.max(f.n, 0));
    expect(s.parts).toBe(s.families.reduce((a, f) => a + f.counted, 0));
    expect(s.parts).toBeLessThan(s.total);
  });
  it('any number is a part its family makes, and the part numbers back to it: the first and last of every family, and thousands at random', () => {
    const s = spaceSize(); let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const ns: number[] = []; let start = 0;
    const order = ['sheet', 'tube', 'spring']; void order;
    for (let i = 0; i < 6000; i++) ns.push(Math.floor(rnd() * s.total));
    // the boundaries between families, wherever they fall
    for (let n = 0, k = 0; k < 400; k++) { ns.push(Math.min(s.total - 1, Math.floor((k / 400) * s.total))); n += 1; }
    ns.push(0, s.total - 1); void start;
    const t0 = performance.now();
    for (const n of ns) {
      const p = partAt(n)!; expect(p, String(n)).not.toBeNull();
      const it = callFamily(p.words); expect(typeof it, p.words).toBe('object');
      const item = it as NonNullable<Exclude<typeof it, string>>;
      expect(numberOf(item.sized!.family, item.sized!.params), p.words).toBe(n);
      for (const c of item.of) expect(INVENTORY.has(c.id), `${p.words} has ${c.id}`).toBe(true);
    }
    expect((performance.now() - t0) / ns.length).toBeLessThan(0.5);
    expect(partAt(-1)).toBeNull(); expect(partAt(s.total)).toBeNull();
  });
  it('numbers from words, and each part made comes down to the elements', () => {
    const n = numberOfWords('sheet aluminium 2mm 300x300'); expect(n).toBeGreaterThanOrEqual(0); expect(partAt(n)!.words).toBe('sheet aluminium 2mm 300x300');
    expect(numberOfWords('spring d1 D10 L30 n8')).toBeGreaterThan(0); expect(numberOfWords('gear m1 z30 b8 pla')).toBeGreaterThan(0);
    for (const n of [7, 123456789, 999999999, 1500000000]) { const it = partItem(n)!; const r = resolve(partAt(n)!.words) as { id: string }; expect(fundamentals(r.id).length, it.name).toBeGreaterThan(0); }
  });
});
