// Lifetime worked out, not looked up: the same thing lasts as long as what holds it outlasts what takes it apart where
// it is. Steel rusts by the sea and keeps in a dry vault; wood rots in the ground and lasts centuries indoors; a body
// lasts minutes in space and decades in a room; a dried tardigrade's clock all but stops.

import { describe, expect, it } from 'vitest';
import { ENVS, LASTING, arrhenius, fatigueCycles, lifetimeOf, yearsSays } from '../../src/nexus/life/decay';
import { INVENTORY } from '../../src/nexus/inventory';

const yrs = (id: string, env: string) => lifetimeOf(id, env)!.years;
describe('lifetime, from where a thing is', () => {
  it('steel: a millimetre lost in decades outdoors, a decade by the sea, never in a dry room by rust', () => {
    expect(yrs('steel-low', 'outdoors')).toBeGreaterThan(15); expect(yrs('steel-low', 'outdoors')).toBeLessThan(60); // ISO 9223 C3, 25–50 µm a year
    expect(yrs('steel-low', 'seaside')).toBeLessThan(yrs('steel-low', 'outdoors')); expect(yrs('steel-low', 'room')).toBeGreaterThan(400);
    expect(yrs('stainless-316', 'seaside')).toBeGreaterThan(yrs('steel-low', 'seaside') * 50); expect(yrs('steel-low', 'space')).toBe(Infinity);
  });
  it('wood rots in damp ground in years, and lasts centuries dry; under water, short of oxygen, it does not rot', () => {
    expect(yrs('wood', 'soil')).toBeLessThan(15); expect(yrs('wood', 'room')).toBeGreaterThan(1000); expect(lifetimeOf('wood', 'fresh water')!.by).not.toBe('fungal rot');
    expect(yrs('pla', 'compost')).toBeLessThan(yrs('pla', 'room') / 30); // PLA is made to break down hot and wet
    expect(yrs('concrete', 'outdoors')).toBeGreaterThan(50); expect(yrs('concrete', 'outdoors')).toBeLessThan(200); // carbonation to 30 mm of cover
  });
  it('a body: minutes without oxygen or in cold water, decades in a room by the Gompertz–Makeham law', () => {
    expect(yrs('human', 'space') * 365.25 * 24 * 60).toBeLessThan(10);
    const cold = yrs('human', 'cold water') * 365.25 * 24; expect(cold).toBeGreaterThan(0.3); expect(cold).toBeLessThan(6); // hours in 5 °C water
    expect(yrs('human', 'arctic') * 365.25 * 24).toBeGreaterThan(cold); // air takes heat far more slowly than water
    const room = yrs('human', 'room'); expect(room).toBeGreaterThan(40); expect(room).toBeLessThan(60); // from 30, to about 80
    expect(lifetimeOf('human', 'room')!.how).toMatch(/Gompertz/);
  });
  it('a tardigrade stops its clock dried out, and lives months in water', () => {
    expect(yrs('tardigrade', 'desert')).toBeGreaterThan(yrs('tardigrade', 'fresh water') * 50); expect(lifetimeOf('tardigrade', 'space')!.how).toMatch(/tun/);
  });
  it('by its laws: Arrhenius doubles about every 10 °C at 50 kJ/mol, Basquin has an endurance limit', () => {
    expect(arrhenius(50, 30, 20)).toBeGreaterThan(1.8); expect(arrhenius(50, 30, 20)).toBeLessThan(2.1);
    expect(fatigueCycles(200, 500)).toBe(Infinity); expect(fatigueCycles(400, 500)).toBeGreaterThan(1e3); expect(fatigueCycles(400, 500)).toBeLessThan(1e7);
    for (const id of LASTING) expect(INVENTORY.has(id) || id === 'human', id).toBe(true);
    expect(Object.keys(ENVS).length).toBeGreaterThan(12); expect(yearsSays(1 / (365.25 * 24 * 60))).toBe('60 seconds');
  });
});
