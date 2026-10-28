// Reading quantities from words (src/ganglia/units.ts): sizes from micrometres to thousands of kilometres, temperatures, times.

import { describe, expect, it } from 'vitest';
import { findQuantities } from '../../src/ganglia/units';


describe('reading what is said', () => {
  it('reads sizes from micrometres to thousands of kilometres, joined by hyphens or not', () => {
    const si = (s: string) => findQuantities(` ${s} `).map((q) => q.si);
    expect(si('a 40-micrometer robot')[0]).toBeCloseTo(40e-6, 12);
    expect(si('12,000 kilometers across')[0]).toBe(1.2e7);
    expect(si('a 1.5-meter-tall robot')[0]).toBe(1.5);
    expect(si('below 100 degrees Celsius')[0]).toBeCloseTo(373.15, 6);
    expect(si('for 14 days')[0]).toBe(14 * 86400);
    // a newton-metre is said with its capital, a nanometre without
    expect(findQuantities(' 20 Nm ')[0]!.unit).toBe('N m');
    expect(findQuantities(' 50 nm ')[0]!.unit).toBe('nm');
  });
            });







