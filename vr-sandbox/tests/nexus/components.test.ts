import { describe, expect, it } from 'vitest';
import { DESIGNED, boltedJoint, component, library, use } from '../../src/nexus/components';
import { catalogue } from '../../src/nexus/catalogue';
import { FAMILIES } from '../../src/nexus/families';
import { kitFor, makeKit, kitById, type Part } from '../../src/nexus/kits';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('the component library', () => {
  it('draws every size its families sell, each within a fifth of its standard\'s mass, filed under its category', () => {
    let n = 0;
    for (const f of DESIGNED) {
      const lines = catalogue(f), words = lines.length ? lines : FAMILIES.find((x) => x.id === f)!.examples;
      expect(words.length, f).toBeGreaterThan(0);
      for (const w of words) {
        const c = component(w); if (typeof c === 'string') throw new Error(`${w}: ${c}`);
        expect(c.faults, w).toEqual([]); expect(c.path.length, w).toBeGreaterThan(1);
        expect(all(c.part).some((p) => p.shape), w).toBe(true); expect(c.part.item, w).toBe(c.item.id); n++;
      }
    }
    expect(n).toBeGreaterThan(300);
    expect([...library().keys()]).toContain('Hardware / Fasteners / Bolts');
  });
  it('gives each build its own copy, named in the build, its pieces under that name', () => {
    const a = use('bolt M8x30', [0, 1, 0], { name: 'a bolt here' }), b = use('bolt M8x30');
    a.parts![0]!.mat = 'gold';
    expect(b.parts![0]!.mat).not.toBe('gold'); expect(b.name).toBe('M8 × 30 hex bolt');
    expect(a.parts!.every((p) => p.name === 'a bolt here')).toBe(true); expect(a.at).toEqual([0, 1, 0]);
    expect(() => use('flux capacitor 88mph')).toThrow();
  });
  it('makes a bolted joint of saved parts, stacked head, washer, plies, washer, nut, the bolt the shortest sold that leaves two pitches', () => {
    const j = boltedJoint('M10', 22), [w1, bolt, w2, nut] = j.parts!;
    expect(bolt!.name).toBe('M10 × 40 hex bolt'); // 22 + 2 × 2 (washers) + 8.4 (nut) + 2 × 1.5 = 37.4: the next length sold is 40
    expect(w1!.at![1]).toBeCloseTo(-0.002, 6); expect(w2!.at![1]).toBeCloseTo(-0.026, 6); expect(nut!.at![1]).toBeCloseTo(-0.026, 6);
    for (const p of [w1, w2, nut]) expect(p!.passes, p!.name).toContain(bolt!.name);
  });
  it('is a kit: a part is called by its words, and only with a size said', () => {
    expect(kitFor('bolt M12x40')!.id).toBe('part'); expect(kitFor('angle 40x4 steel 1000mm')!.id).toBe('part');
    expect(kitFor('a pipe organ')?.id).not.toBe('part');
    const { part } = makeKit(kitById('part')!, 'extrusion 2040 500', 1); expect(part.name).toBe('2040 extrusion');
  });
});
