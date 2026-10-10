// Abduction over the hinge coupling with time as the coordinate: the derivation conserves the swing energy, the
// kernel with friction at the pin loses it beyond the contract; over the hinge's quantity types the missing
// distinction is the friction's work over a period against the swing energy: τ θ₀ / E₀, Coulomb's.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { swingStudy, type SwingCase, type SwingStudy } from '../../src/nexus/substrate/study-swing';
import { varsOf } from '../../src/nexus/substrate/term';

const cases: SwingCase[] = [
  { release: 5, friction: 0.0015 },
  { release: 5, friction: 0.00287 },
  { release: 20, friction: 0.006 },
  { release: 20, friction: 0.0114 },
  { release: 15, friction: 0 },
  { release: 15, friction: 0.01 },
  { release: 15, friction: 0.002, pivotFromEnd: 0.25 },
  { release: 15, friction: 0.005, pivotFromEnd: 0.25 },
  { release: 10, friction: 0.003 },
];

let study: SwingStudy | null = null;
async function run(): Promise<SwingStudy> { return (study ??= swingStudy(await jolt(), cases)); }

describe('the swing study', () => {
  it('the derivation conserves the swing energy; the kernel keeps it within the contract in five of nine: four anomalies as terms', async () => {
    const s = await run();
    expect(s.observations.length).toBe(9);
    expect(s.observations.map((o) => o.derived.value)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(s.observations.map((o) => o.observed.value)).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1]);
    expect(s.failures.length).toBe(4);
    expect(s.failures.every((f) => f.kind === 'anomaly')).toBe(true);
  }, 240000);

  it('the missing distinction is Coulomb\'s: the friction\'s work over a swing against the swing energy; the torque over the weight\'s lever alone does not separate', async () => {
    const s = await run();
    expect(s.chosen).not.toBeNull();
    expect(s.chosen!.group.exponents).toEqual({ tau: 1, E0: -1, theta0: 1 });
    const by = Object.fromEntries(s.candidates.map((c) => [JSON.stringify(c.group.exponents), c]));
    expect(by[JSON.stringify({ tau: 1, m: -1, g: -1, d: -1 })]!.separates).toBe(false);
    expect(by[JSON.stringify({ tau: 1, E0: -1 })]!.separates).toBe(false);
    expect(s.chosen!.threshold!.above).toBe(0);
    // Coulomb loses 4 τ θ₀ a period: two percent a period, the contract's allowance, is τ θ₀ / E₀ of 0.005
    expect(s.chosen!.threshold!.lo).toBeLessThan(0.005);
    expect(s.chosen!.threshold!.hi).toBeGreaterThan(0.005);
    for (const c of s.candidates) for (const v of varsOf(c.group.term)) expect(['tau', 'E0', 'theta0', 'm', 'g', 'd']).toContain(v.sym);
  }, 240000);

  it('promoted over nine systems with provenance, and the quantities are the coupling\'s own records', async () => {
    const s = await run();
    expect(s.relation).not.toBeNull();
    expect(s.relation!.generality).toBe(9);
    expect(new Set(s.relation!.observations).size).toBe(9);
    expect(s.relation!.provenance).toMatch(/^abduced from observations /);
    const q = s.observations[0]!.quantities;
    expect(q['E0']!.name).toBe('swing energy');
    expect(q['tau']!.name).toMatch(/friction torque/);
    expect(s.language.all().length).toBe(1);
  }, 240000);
});
