// The third slice: time as a coordinate. A bar on a free hinge released from an angle: the period derived from the
// bar's inertia and measured from the kernel's lattice of ticks, the angle a field over t with the sampling law as
// its scale band, the swing energy the hinge coupling's ledger over time, the kernel's dissipation its contract.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { AMPLITUDE_FACTOR, PHYSICAL_PENDULUM, lawById } from '../../src/nexus/book';
import { coarse, resolution, resolves } from '../../src/nexus/domain';
import { ofLeaf } from '../../src/nexus/evaluate';
import { apply } from '../../src/nexus/law';
import { barOnHinge, swingIntent, swingMaterial, type SwingSlice } from '../../src/nexus/swing';
import { leaf } from '../../src/nexus/term';
import { cites, leavesUnder, why } from '../../src/nexus/why';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));
let built: SwingSlice | null = null;
async function slice(): Promise<SwingSlice> { return (built ??= barOnHinge(swingIntent('the person'), swingMaterial(), await jolt())); }

describe('the swing: laws and the field over time', () => {
  it('a uniform bar about its end is the simple pendulum of two thirds its length; the factor lengthens with the swing and is refused past 45°', () => {
    const T0 = apply(PHYSICAL_PENDULUM, { I: given('I', 2 / 3, 'kg m^2'), m: given('m', 2, 'kg'), g: given('g', 9.80665, 'm/s^2'), d: given('d', 0.5, 'm') });
    expect(T0.value).toBeCloseTo(apply(lawById('pendulum.period'), { L: given('L', 2 / 3, 'm') }).value!, 12);
    expect(apply(AMPLITUDE_FACTOR, { theta0: given('θ₀', 0, 'rad') }).value).toBe(1);
    expect(apply(AMPLITUDE_FACTOR, { theta0: given('θ₀', 30, 'deg') }).value).toBeCloseTo(1.01741, 4);
    expect(apply(AMPLITUDE_FACTOR, { theta0: given('θ₀', 60, 'deg') }).status).toBe('outside-validity');
  });

  it('the solver binds the period from the bar alone, and the derivation says why', async () => {
    const s = await slice();
    expect(s.solution.free).toEqual([]);
    const T = s.solution.bound['T']!;
    expect(T.value).toBeCloseTo(1.6684, 3);
    const leaves = leavesUnder(T);
    expect(leaves.some((l) => l.name === 'release angle')).toBe(true);
    expect(leaves.some((l) => l.origin.source?.includes('Wood Handbook'))).toBe(true);
    expect(cites(T, PHYSICAL_PENDULUM.hash)).toBe(true);
    expect(cites(T, lawById('parallel-axis').hash)).toBe(true);
  }, 60000);

  it('the angle is a field over t whose scale band is the sampling law: a lattice coarser than half the period is refused, and the band cites Shannon', async () => {
    const s = await slice();
    const f = s.configuration!.angle;
    const fine = resolution('ticks', {}, { t: given('tick', 1 / 90, 's') });
    const atHalf = coarse(f, fine, { t: given('t', s.solution.bound['T']!.value! / 2, 's') });
    expect(atHalf.value).toBeCloseTo(-s.solution.bound['theta0']!.value!, 9);
    const coarseLattice = resolution('slow clock', {}, { t: given('tick', 1, 's') });
    const refused = coarse(f, coarseLattice, { t: given('t', 0.5, 's') });
    expect(refused.status).toBe('outside-validity');
    expect(refused.refusal?.domain).toMatch(/Shannon/);
    expect(cites(resolves(f.over, fine)[0]!.holds, lawById('shannon.sampling').hash)).toBe(true);
    expect(coarse(f, fine, { t: given('t', 100, 's') }).status).toBe('outside-validity');
  }, 60000);
});

describe('the swing in the kernel', () => {
  it('the period measured from the lattice of ticks is within the contract, and WHY on it ends at the tick', async () => {
    const s = await slice();
    const r = s.realization!;
    expect(r.events).toEqual([]);
    expect(r.crossings).toBeGreaterThanOrEqual(9);
    const by = Object.fromEntries(s.comparisons.map((c) => [c.name, c]));
    expect(by['period']!.verdict.kind, JSON.stringify(by['period']!.verdict)).toBe('within');
    expect(r.period.uncertainty).toBeGreaterThan(0);
    expect(why(r.period).origin?.class).toBe('measured');
    expect(r.resolution.lattice['t']!.name).toMatch(/tick/);
  }, 120000);

  it('the ledger over time: the swing energy at release matches the derivation, and what is lost over five periods is within the dissipation the contract declares', async () => {
    const s = await slice();
    const by = Object.fromEntries(s.comparisons.map((c) => [c.name, c]));
    expect(by['swing energy at release']!.verdict.kind, JSON.stringify(by['swing energy at release']!.verdict)).toBe('within');
    expect(by['swing energy at the end of the watch']!.verdict.kind, JSON.stringify(by['swing energy at the end of the watch']!.verdict)).toBe('within');
    const r = s.realization!;
    expect(r.swingEnergyEnd.value!).toBeLessThan(r.swingEnergyStart.value!);
    expect(r.swingEnergyEnd.value! / r.swingEnergyStart.value!).toBeGreaterThan(0.9);
  }, 120000);

  it('the angle field agrees with the kernel at every quarter period within the amplitude the dissipation allows by then', async () => {
    const s = await slice();
    const angles = s.comparisons.filter((c) => c.name.startsWith('angle at tick'));
    expect(angles.length).toBeGreaterThanOrEqual(18);
    for (const c of angles) expect(c.verdict.kind, `${c.name}: ${JSON.stringify(c.verdict)} derived ${c.derived.value} measured ${c.measured.value}`).toBe('within');
    expect(s.configuration!.rigid.rigid).toBe(true);
  }, 120000);
});
