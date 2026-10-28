// Part XXIV 1: quantity and dimension. Dimensional nonsense cannot be constructed; the dimensionless groups of a
// set of quantities are found from their dimensions alone.

import { describe, expect, it } from 'vitest';
import { DimensionError, dimOf, dimText, } from '../../src/nexus/dimension';
import { add, div, leaf, mul, variable } from '../../src/nexus/term';

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

  
  });
