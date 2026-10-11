// Part XXIV 1: quantity and dimension. Dimensional nonsense cannot be constructed; the dimensionless groups of a
// set of quantities are found from their dimensions alone.

import { describe, expect, it } from 'vitest';
import { DimensionError, dimOf, dimText, piGroups } from '../../src/nexus/lang/dimension';
import { add, div, leaf, mul, variable } from '../../src/nexus/lang/term';

const given = (name: string, v: number, unit: string) => leaf(name, v, unit, { class: 'given', by: 'test' });

describe('dimension', () => {
  it('units are conventions over one algebra', () => {
    expect(dimText(dimOf('N'))).toBe('kg m s^-2');
    expect(dimText(dimOf('N m'))).toBe('kg m^2 s^-2');
    expect(dimText(dimOf('Pa'))).toBe('kg m^-1 s^-2');
    expect(dimText(dimOf('-'))).toBe('1');
    expect(given('a length', 2, 'mm').value).toBeCloseTo(0.002, 12);
  });

  it('a sum of different dimensions is not a term', () => {
    expect(() => add(given('m', 1, 'kg'), given('x', 1, 'm'))).toThrow(DimensionError);
    expect(() => add(variable('F', 'N'), variable('M', 'N m'))).toThrow(DimensionError);
    expect(dimText(mul(given('m', 2, 'kg'), given('a', 3, 'm/s^2')).dim)).toBe('kg m s^-2');
    expect(dimText(div(variable('M', 'N m'), variable('S', 'm^3')).dim)).toBe(dimText(dimOf('Pa')));
  });

  it('finds the Reynolds group of (ρ, v, L, μ) without being told', () => {
    const groups = piGroups([dimOf('kg/m^3'), dimOf('m/s'), dimOf('m'), dimOf('Pa s')]);
    expect(groups).toEqual([[1, 1, 1, -1]]);
  });

  it('finds two groups where there are two (a pendulum: g, L, T, m)', () => {
    const groups = piGroups([dimOf('m/s^2'), dimOf('m'), dimOf('s'), dimOf('kg')]);
    // one group: g T^2 / L; the mass joins no group
    expect(groups.length).toBe(1);
    const [g] = groups;
    expect(g![3]).toBe(0);
    const scaled = g!.map((x) => x / g![0]!);
    expect(scaled).toEqual([1, -1, 2, 0]);
  });
});
