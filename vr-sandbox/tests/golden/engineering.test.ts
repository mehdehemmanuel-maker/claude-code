import { describe, expect, it } from 'vitest';
import { SPRING_WIRES, springRate, surgeFrequency, wireUltimate, solidLength, bergstrasser, wahl, yieldForce, shearStress } from '../../src/engineering/springs';
import { filletWeldCapacity, weldable, rivetShear, bondCapacities, bondEdgeLength, ADHESIVES, cureFraction } from '../../src/engineering/joining';
import { lewisFormFactor, dcMotorTorque, dcMotorSpecs, neoHookeanBandForce, capstanRatio, bearingFrictionTorque } from '../../src/engineering/mechanics';
import { MATERIALS } from '../../src/data/materials';

const within = (actual: number, expected: number, rel: number) =>
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(rel);



describe('helical springs (Shigley ch. 10)', () => {
  const s = { d: 0.002, D: 0.02, Na: 10, L0: 0.06, wire: SPRING_WIRES['music-wire-a228']! };
  it('rate k = d^4 G / (8 D^3 Na)', () => within(springRate(s), (0.002 ** 4 * 81.7e9) / (8 * 0.02 ** 3 * 10), 1e-12));
  it('music wire S_ut at 2 mm is ~2000 MPa', () => within(wireUltimate(s), 1999.5e6, 0.002));
  it('surge frequency ~181 Hz for this spring', () => within(surgeFrequency(s), 181.5, 0.01));
  it('curvature factors agree to within a few percent', () => within(bergstrasser(10), wahl(10), 0.03));
  it('yield force produces exactly the allowable stress', () => within(shearStress(s, yieldForce(s)), 0.45 * wireUltimate(s), 1e-9));
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
  it('rivet shear', () => within(rivetShear(2, 0.004, 400e6), 2 * 240e6 * Math.PI * 4e-6, 1e-9));
  it('adhesive bonds on thin sheet are far weaker in peel than shear', () => {
    const a = ADHESIVES['cyanoacrylate']!;
    // 1 mm aluminium sheet: the bending load reaches only an edge strip about a millimetre deep
    const edge = bondEdgeLength(69e9, 0.001, a);
    expect(edge).toBeLessThan(0.002);
    const c = bondCapacities(0.02, 0.02, a.lapShear, a.peel, edge);
    // Moment that breaks the bond, expressed as an edge force at the bond length, is much less than the shear capacity.
    expect(c.bending / 0.02).toBeLessThan(c.shear / 10);
  });
  it('a bond between rigid parts carries bending over its whole face: M = 0.7 tau b d^2 / 6', () => {
    const a = ADHESIVES['epoxy-structural']!;
    // 100 mm of steel: stiff enough that the whole face works
    const edge = bondEdgeLength(200e9, 0.1, a);
    expect(edge).toBeGreaterThan(0.1 / 3);
    within(bondCapacities(0.1, 0.05, a.lapShear, a.peel, edge).bending, (0.7 * a.lapShear * 0.1 * 0.05 ** 2) / 6, 1e-6);
    // and never below the measured peel line load, however thin the part
    within(bondCapacities(0.1, 0.05, a.lapShear, a.peel, 0).bending, (0.1 * 0.05 * a.peel) / 2, 1e-6);
  });
  it('cure fraction ramps to 1', () => {
    const a = ADHESIVES['epoxy-5min']!;
    expect(cureFraction(a, 0)).toBe(0);
    expect(cureFraction(a, 5 * a.cureTau)).toBeGreaterThan(0.99);
  });
});


describe('mechanics', () => {
  it('Lewis form factor table', () => {
    within(lewisFormFactor(20), 0.322, 1e-9);
    within(lewisFormFactor(25), (0.337 + 0.346) / 2, 1e-9);
  });
  it('DC motor torque-speed line', () => {
    const m = { V: 12, Kv: 1000, R: 0.5, ratio: 1, efficiency: 1 };
    const spec = dcMotorSpecs(m);
    within(dcMotorTorque(m, 0), spec.stallTorque, 1e-12);
    expect(Math.abs(dcMotorTorque(m, spec.noLoadSpeed))).toBeLessThan(1e-9);
  });
  it('rubber band is tension only', () => {
    expect(neoHookeanBandForce(0.5e6, 1e-5, 0.9)).toBe(0);
    within(neoHookeanBandForce(0.5e6, 1e-5, 2), 0.5e6 * 1e-5 * (2 - 0.25), 1e-12);
  });
  it('capstan and bearing', () => {
    within(capstanRatio(0.3, Math.PI), Math.exp(0.3 * Math.PI), 1e-12);
    within(bearingFrictionTorque(0.0015, 1000, 0.008), 0.006, 1e-12);
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
