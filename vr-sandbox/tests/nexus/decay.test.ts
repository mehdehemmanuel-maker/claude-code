// Lifetime worked out, not looked up: the same thing lasts as long as what holds it outlasts what takes it apart where
// it is. Steel rusts by the sea and keeps in a dry vault; wood rots in the ground and lasts centuries indoors; a body
// lasts minutes in space and decades in a room; a dried tardigrade's clock all but stops.

import { describe, expect, it } from 'vitest';
import { ENVS, LASTING, arrhenius, fatigueCycles, lifetimeLines, lifetimeOf, woodMoisture, yearsSays } from '../../src/nexus/life/decay';
import { lawsUnder, valueIn } from '../../src/nexus/lawgraph';
import { INVENTORY } from '../../src/nexus/inventory';

const yrs = (id: string, env: string) => lifetimeOf(id, env)!.years;
describe('lifetime, from where a thing is', () => {
  it('is a chain of universal laws, each lifetime with its breakdown', () => {
    const ids = (id: string, env: string) => lawsUnder(lifetimeOf(id, env)!.record!).map((l) => l.id);
    expect(ids('concrete', 'outdoors')).toEqual(expect.arrayContaining(['porosity.powers', 'diffusivity.papadakis', 'gas.concentration', 'share.of', 'moles.of-mass', 'amount.concentration', 'diffusion.front', 'stages.series']));
    expect(ids('steel-low', 'sea')).toEqual(expect.arrayContaining(['henry.solubility', 'fick.diffusion', 'faraday.flux', 'corrosion.penetration', 'distance.speed-time']));
    expect(ids('human', 'cold water')).toEqual(expect.arrayContaining(['conduction.series', 'power.net', 'heat.capacity', 'energy.power-time']));
    expect(ids('human', 'hot humid')).toEqual(expect.arrayContaining(['vapour.pressure', 'humidity.vapour-pressure', 'evaporation.max', 'radiation', 'convection']));
    expect(ids('human', 'room')).toContain('life.expectancy.gompertz-makeham');
    expect(lifetimeLines('concrete', 'outdoors').join('\n')).toMatch(/Papadakis.*\n[\s\S]*NOAA/);
    // wood's moisture by its sorption isotherm: the Wood Handbook's 12 % at 65 % humidity and 18 % at 85 %
    expect(valueIn(woodMoisture({ ...ENVS.room!, rh: 0.65 }))!).toBeCloseTo(0.12, 1.5); expect(valueIn(woodMoisture({ ...ENVS.room!, rh: 0.85 }))!).toBeCloseTo(0.18, 1.5);
  });
  it('a body cannot outlast a humid heat its sweat cannot evaporate: the wet-bulb limit comes out of the laws', () => {
    expect(yrs('human', 'desert')).toBeGreaterThan(40); // dry heat: sweat keeps up (with water to drink)
    const h = yrs('human', 'hot humid') * 365.25 * 24; expect(h).toBeGreaterThan(1); expect(h).toBeLessThan(24); expect(lifetimeOf('human', 'hot humid')!.by).toBe('its heat balance');
  });
  it('steel: a millimetre lost in decades outdoors, a decade by the sea, never in a dry room by rust', () => {
    expect(yrs('steel-low', 'outdoors')).toBeGreaterThan(15); expect(yrs('steel-low', 'outdoors')).toBeLessThan(60); // ISO 9223 C3, 25–50 µm a year
    expect(yrs('steel-low', 'seaside')).toBeLessThan(yrs('steel-low', 'outdoors')); expect(yrs('steel-low', 'room')).toBeGreaterThan(400);
    expect(yrs('stainless-316', 'seaside')).toBeGreaterThan(yrs('steel-low', 'seaside') * 50); expect(yrs('steel-low', 'space')).toBe(Infinity);
  });
  it('wood rots in damp ground in years, and lasts centuries dry; under water, short of oxygen, it does not rot', () => {
    expect(yrs('wood', 'soil')).toBeLessThan(15); expect(yrs('wood', 'room')).toBeGreaterThan(1000); expect(lifetimeOf('wood', 'fresh water')!.by).not.toBe('fungal rot');
    expect(yrs('pla', 'compost')).toBeLessThan(yrs('pla', 'room') / 30); // PLA is made to break down hot and wet
    // carbonation to 30 mm of cover, then rust: rained-on concrete carbonates slowly (its pores wet), indoor concrete fast
    // but its steel then rusts slowly in dry air; by the sea chloride gets there first
    expect(yrs('concrete', 'outdoors')).toBeGreaterThan(100); expect(yrs('concrete', 'outdoors')).toBeLessThan(600);
    expect(yrs('concrete', 'room')).toBeGreaterThan(50); expect(yrs('concrete', 'room')).toBeLessThan(200);
    expect(yrs('concrete', 'seaside')).toBeLessThan(20); expect(lifetimeOf('concrete', 'seaside')!.by).toMatch(/chloride/);
    expect(yrs('concrete', 'sea')).toBeGreaterThan(100); // under water its steel is starved of oxygen
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
