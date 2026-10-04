// Part XXIV 2: term and identity. Identity is content: names are nowhere in a hash; equivalent terms hash alike;
// one changed leaf moves exactly the hashes that rest on it.

import { describe, expect, it } from 'vitest';
import { add, k, leaf, mul, show, substitute, variable, varsOf } from '../../src/nexus/term';

const given = (name: string, v: number, unit: string) => leaf(name, v, unit, { class: 'given', by: 'test' });

describe('identity', () => {
  it('a leaf is identified by its content, not its name', () => {
    expect(given('span', 1.2, 'm').hash).toBe(given('width', 1.2, 'm').hash);
    expect(given('span', 1.2, 'm').hash).not.toBe(given('span', 1.3, 'm').hash);
    expect(given('span', 1.2, 'm').hash).not.toBe(leaf('span', 1.2, 'm', { class: 'measured', source: 'a tape' }).hash);
    expect(given('span', 1200, 'mm').hash).toBe(given('span', 1.2, 'm').hash);
  });

  it('a leaf without its origin is not constructed', () => {
    expect(() => leaf('x', 1, 'm', { class: 'assumed', by: 'me' })).toThrow(/grounds/);
    expect(() => leaf('x', 1, 'm', { class: 'measured' })).toThrow(/source/);
    expect(() => leaf('x', 1, 'm', { class: 'unknown' })).toThrow(/no value/);
    expect(() => leaf('x', Number.NaN, 'm', { class: 'given', by: 'me' })).toThrow(/finite/);
  });

  it('equivalent terms hash alike: commutation and variable names', () => {
    const a = variable('a', 'm'), b = variable('b', 'm'), p = variable('p', 'm'), q = variable('q', 'm');
    expect(add(a, b).hash).toBe(add(b, a).hash);
    expect(add(a, b).hash).toBe(add(p, q).hash);
    expect(mul(a, k(2)).hash).toBe(mul(k(2), b).hash);
    expect(mul(a, b).hash).not.toBe(mul(a, variable('t', 's')).hash);
  });

  it('one changed leaf moves exactly the hashes that rest on it', () => {
    const L = given('span', 1.2, 'm'), W = given('load', 60, 'kg'), g = k(9.80665);
    const weight = mul(W, g), moment = mul(weight, L);
    const L2 = given('span', 1.3, 'm');
    const weight2 = mul(W, g), moment2 = mul(weight2, L2);
    expect(weight2.hash).toBe(weight.hash);
    expect(moment2.hash).not.toBe(moment.hash);
  });

  it('substitution keeps dimensions and reads back', () => {
    const t = add(variable('a', 'm'), variable('b', 'm'));
    expect(varsOf(t).map((v) => v.sym)).toEqual(['a', 'b']);
    const s = substitute(t, { a: given('x', 1, 'm') });
    expect(show(s)).toBe('(x + b)');
    expect(() => substitute(t, { a: given('m', 1, 'kg') })).toThrow();
  });
});
