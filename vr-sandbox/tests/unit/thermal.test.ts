import { describe, expect, it } from 'vitest';
import { AMBIENT, DRAPER, glow, heatLoss, heatShare, thermalOf, warm } from '../../src/engineering/thermal';
import { getMaterial, MATERIALS } from '../../src/data/materials';

describe('heat', () => {
  it('every material has its thermal properties, with a source', () => {
    for (const m of MATERIALS) {
      const t = thermalOf(m);
      expect(t.c, m.id).toBeGreaterThan(300);
      expect(t.c, m.id).toBeLessThan(2500);
      expect(t.k, m.id).toBeGreaterThan(0.02);
      expect(t.source.length, m.id).toBeGreaterThan(10);
    }
  });

  it('wood follows the Wood Handbook: about 1.55 kJ/kg K and 0.13 W/m K for Douglas-fir at 12% moisture', () => {
    const t = thermalOf(getMaterial('wood.douglas-fir'));
    expect(t.c).toBeGreaterThan(1500);
    expect(t.c).toBeLessThan(1650);
    expect(t.k).toBeCloseTo(0.12, 1);
  });

  it('friction heat goes mostly into the surface that soaks it away: steel on wood, the steel', () => {
    const steel = getMaterial('steel.a36'), fir = getMaterial('wood.douglas-fir');
    expect(heatShare(steel, fir)).toBeGreaterThan(0.9);
    expect(heatShare(steel, steel)).toBeCloseTo(0.5, 12);
    expect(heatShare(fir, steel) + heatShare(steel, fir)).toBeCloseTo(1, 12);
  });

  it('a warmed part heats by what it absorbs over its heat capacity and cools back to the room', () => {
    // 1 kg of steel given 48.6 kJ: 100 K warmer at once
    const steel = thermalOf(getMaterial('steel.a36'));
    const hot = warm(AMBIENT, 48600, 1, steel.c, 0.06, 0.1, steel.emissivity, 0);
    expect(hot).toBeCloseTo(AMBIENT + 100, 6);
    // natural convection plus radiation from 0.06 m^2 at 120 C: about 10 W/m^2 K, so tens of watts
    const q = heatLoss(hot, 0.06, 0.1, steel.emissivity);
    expect(q).toBeGreaterThan(40);
    expect(q).toBeLessThan(120);
    // it cools, never past the room, however long the step
    let t = hot;
    for (let i = 0; i < 60; i++) t = warm(t, 0, 1, steel.c, 0.06, 0.1, steel.emissivity, 60);
    expect(t).toBeLessThan(hot - 50);
    expect(t).toBeGreaterThanOrEqual(AMBIENT);
    expect(warm(t, 0, 1, steel.c, 0.06, 0.1, steel.emissivity, 1e6)).toBe(AMBIENT);
  });

  it('metal glows from the Draper point: dull red, then orange, then yellow-white', () => {
    expect(glow(DRAPER - 1).intensity).toBe(0);
    const red = glow(700), orange = glow(1100), white = glow(1600);
    expect(red.intensity).toBeGreaterThan(0);
    expect(orange.intensity).toBeGreaterThan(red.intensity);
    expect(white.intensity).toBe(1);
    // green rises with temperature (red → orange → yellow)
    expect((orange.color >> 8) & 255).toBeGreaterThan((red.color >> 8) & 255);
    expect((white.color >> 8) & 255).toBeGreaterThan((orange.color >> 8) & 255);
  });
});
