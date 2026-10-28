import { describe, expect, it } from 'vitest';
import { SPRING_WIRES, springRate, surgeFrequency, wireUltimate, solidLength } from '../../src/engineering/springs';
import { filletWeldCapacity, weldable } from '../../src/engineering/joining';
import { MATERIALS } from '../../src/data/materials';

const within = (actual: number, expected: number, rel: number) =>
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(rel);



describe('helical springs (Shigley ch. 10)', () => {
  const s = { d: 0.002, D: 0.02, Na: 10, L0: 0.06, wire: SPRING_WIRES['music-wire-a228']! };
  it('rate k = d^4 G / (8 D^3 Na)', () => within(springRate(s), (0.002 ** 4 * 81.7e9) / (8 * 0.02 ** 3 * 10), 1e-12));
  it('music wire S_ut at 2 mm is ~2000 MPa', () => within(wireUltimate(s), 1999.5e6, 0.002));
  it('surge frequency ~181 Hz for this spring', () => within(surgeFrequency(s), 181.5, 0.01));
      it('solid length for squared-and-ground ends', () => within(solidLength(s), 0.024, 1e-12));
});



describe('welds, rivets, adhesives', () => {
  it('fillet weld: 6 mm leg x 100 mm E70 on A36 ~ 123 kN', () => within(filletWeldCapacity(0.006, 0.1, 483e6, 400e6), 0.7071 * 0.006 * 0.1 * 0.6 * 400e6, 1e-9));
  it('weldability matrix', () => {
    expect(weldable('steel', 'steel')).toBe(true);
    expect(weldable('steel', 'stainless')).toBe(true);
    expect(weldable('aluminum', 'steel')).toBe(false);
    expect(weldable('none', 'none')).toBe(false);
  });
        });



describe('material catalog', () => {
  it('every material is complete, sourced and physical', () => {
    const ids = new Set<string>();
    for (const m of MATERIALS) {
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
      expect(m.source.length).toBeGreaterThan(5);
      expect(m.density).toBeGreaterThan(50);
      expect(m.E).toBeGreaterThan(0);
      expect(m.ultimate).toBeGreaterThan(0);
      expect(m.yield).toBeLessThanOrEqual(m.ultimate);
      if (m.category === 'wood') expect(m.specificGravity).toBeGreaterThan(0);
      if (m.category === 'magnet') expect(m.remanence).toBeGreaterThan(0);
    }
  });
  it('austenitic stainless and aluminium are not magnetic; carbon steel is', () => {
    const f = (id: string) => MATERIALS.find((m) => m.id === id)!.ferromagnetic;
    expect(f('stainless.304')).toBe(false);
    expect(f('aluminum.6061-t6')).toBe(false);
    expect(f('steel.a36')).toBe(true);
  });
});
