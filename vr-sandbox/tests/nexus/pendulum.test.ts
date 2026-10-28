// The pendulum laws (src/nexus/book.ts): a uniform bar about its end, its period factor with the swing, refused past 45°.

import { describe, expect, it } from 'vitest';
import { AMPLITUDE_FACTOR, PHYSICAL_PENDULUM, lawById } from '../../src/nexus/book';
import { ofLeaf } from '../../src/nexus/evaluate';
import { apply } from '../../src/nexus/law';
import { leaf } from '../../src/nexus/term';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));

describe('the swing: laws and the field over time', () => {
  it('a uniform bar about its end is the simple pendulum of two thirds its length; the factor lengthens with the swing and is refused past 45°', () => {
    const T0 = apply(PHYSICAL_PENDULUM, { I: given('I', 2 / 3, 'kg m^2'), m: given('m', 2, 'kg'), g: given('g', 9.80665, 'm/s^2'), d: given('d', 0.5, 'm') });
    expect(T0.value).toBeCloseTo(apply(lawById('pendulum.period'), { L: given('L', 2 / 3, 'm') }).value!, 12);
    expect(apply(AMPLITUDE_FACTOR, { theta0: given('θ₀', 0, 'rad') }).value).toBe(1);
    expect(apply(AMPLITUDE_FACTOR, { theta0: given('θ₀', 30, 'deg') }).value).toBeCloseTo(1.01741, 4);
    expect(apply(AMPLITUDE_FACTOR, { theta0: given('θ₀', 60, 'deg') }).status).toBe('outside-validity');
  });

  
  });

