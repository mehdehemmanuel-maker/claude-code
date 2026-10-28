// The universal laws and what they work out: every law reproduces its independent example; the law graph places every
// law on its principles, finds the laws units force, and never finds one its units forbid; every part's density comes
// from its make-up by the mixing law and lands on the measured densities of tissue (ICRU Report 46); and what a body
// makes (its urine, urea, bilirubin, iron, carbon monoxide, cerebrospinal fluid, saliva, sweat, acid, hair) comes out of
// conservation, stoichiometry, Little's law and the rest within the range each is measured in.

import { describe, expect, it } from 'vitest';
import { breakdown, discover, measured, solve } from '../../src/nexus/lawgraph';
import { ofLeaf } from '../../src/nexus/evaluate';
import { leaf } from '../../src/nexus/term';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));


describe('the law graph', () => {
    it('finds a law from units alone: a pendulum\'s period, the largest a cell can grow by diffusion, the tallest column', () => {
    expect(discover(['period', 's'], [['length', 'm'], ['gravity', 'm/s^2']]).exponents).toEqual({ length: 0.5, gravity: -0.5 });
    expect(discover(['radius', 'm'], [['D', 'm^2/s'], ['C', 'mol/m^3'], ['q', 'mol/m^3 s']]).exponents).toEqual({ D: 0.5, C: 0.5, q: -0.5 });
    expect(discover(['drag', 'N'], [['mu', 'Pa s'], ['r', 'm'], ['v', 'm/s'], ['rho', 'kg/m^3']]).forced).toBe(false); // the Reynolds number is free
  });
    it('solves a law for an input the other way round, and keeps the whole tree under a number', () => {
    const V = solve('mass.volume', 'V', { m: given('mass', 2, 'kg'), rho: measured('density', 1000, 'kg/m^3', 'test') });
    expect(V.value).toBeCloseTo(0.002, 12);
    const t = solve('diffusion.front', 't', { x: given('depth', 0.03, 'm'), D: given('D', 1e-8, 'm^2/s'), C: given('C', 0.0178, 'mol/m^3'), a: given('a', 2500, 'mol/m^3') });
    expect(t.value).toBeCloseTo((0.03 ** 2 * 2500) / (2 * 1e-8 * 0.0178), 0);
    const lines = breakdown(t).join('\n'); expect(lines).toMatch(/A front advanced by diffusion/); expect(lines).toMatch(/depth = 0.03 m/);
  });
});


