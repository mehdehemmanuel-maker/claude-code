// Part XXIV 7 and 8: domains, fields, the observer; couplings. The ground under a point is a field query; the rigid
// domain is computed from the window and its bound is named; every coordinate is a coupling solution derived from
// the frame's origin; the ledger balances.

import { describe, expect, it } from 'vitest';
import { coordinate, ledger, restOn, standOn, topOf, type Prism } from '../../src/nexus/coupling';
import { ofLeaf } from '../../src/nexus/evaluate';
import { declareFrame, flatGround, gravity, observer, RIGID_BOUND, rigidDomain } from '../../src/nexus/field';
import { div, k, leaf, neg, variable } from '../../src/nexus/term';
import { leavesUnder, why } from '../../src/nexus/why';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));

describe('fields and the observer', () => {
  it('gravity is a sourced constant; the ground under a point is a field query from the frame', () => {
    const g = gravity();
    expect(g.status).toBe('fundamental');
    expect(why(g).origin?.source).toMatch(/ISO 80000-3/);
    const frame = declareFrame('test', 'x along, y up, z across');
    const ground = flatGround(frame, 'test', 'a level floor');
    const h = ground.height(given('x', 0.3, 'm'), given('z', 0, 'm'));
    expect(h.value).toBe(0);
    expect(leavesUnder(h).map((l) => l.origin.class)).toEqual(['configuration']);
  });

  it('the rigid domain is computed from the window: a timber beam is rigid at 90 Hz, a kilometre of it is not', () => {
    const obs = observer('test');
    const E = given('E', 13.4e9, 'Pa'), rho = given('rho', 530, 'kg/m^3');
    const beam = rigidDomain(E, rho, given('L', 1.2, 'm'), obs);
    expect(beam.crossing.value).toBeCloseTo(1.2 / Math.sqrt(13.4e9 / 530), 9);
    expect(beam.ratio.value!).toBeLessThan(0.1);
    expect(beam.rigid).toBe(true);
    const long = rigidDomain(E, rho, given('L', 1000, 'm'), obs);
    expect(long.rigid).toBe(false);
    expect(leavesUnder(long.holds).some((l) => l.hash === RIGID_BOUND.hash)).toBe(true);
    expect(why(long.holds).law).toBe(RIGID_BOUND.hash);
  });
});

describe('couplings', () => {
  const prism = (name: string, x: number, y: number, z: number): Prism => ({ name, extents: { x: given(`${name} x`, x, 'm'), y: given(`${name} y`, y, 'm'), z: given(`${name} z`, z, 'm') }, material: 'test', density: given('rho', 1, 'kg/m^3') });

  it('every coordinate is a coupling solution derived from the frame origin', () => {
    const frame = declareFrame('test', 'x along, y up, z across');
    const ground = flatGround(frame, 'test', 'a level floor');
    const base = prism('base', 0.1, 0.5, 0.1), top = prism('top', 1, 0.04, 0.1);
    const x = coordinate('x', frame, 'x', neg(div(variable('L', 'm'), k(2))), { L: given('span', 1.2, 'm') });
    const z = coordinate('z', frame, 'z', neg(variable('o', 'm')), {});
    standOn(base, ground.height(x, z), x, z);
    expect(base.centre!.y.value).toBeCloseTo(0.25, 12);
    const c = restOn(top, base, topOf(base), given('clearance', 0.0005, 'm'), x, z);
    expect(c.centreY.value).toBeCloseTo(0.5 + 0.0005 + 0.02, 12);
    expect(x.value).toBeCloseTo(-0.6, 12);
    for (const d of [base.centre!.y, top.centre!.y, x]) expect(leavesUnder(d).some((l) => l.name.startsWith('origin'))).toBe(true);
    expect(() => why(top.centre!.y)).not.toThrow();
  });

  it('the ledger balances the boundaries against the weight', () => {
    const R = given('R', 60, 'N');
    const ok = ledger('two supports', [R, R], given('W', 120, 'N'));
    expect(ok.balanced).toBe(true);
    expect(ok.residual.value).toBeCloseTo(0, 12);
    expect(ledger('short', [R], given('W', 120, 'N')).balanced).toBe(false);
  });
});
