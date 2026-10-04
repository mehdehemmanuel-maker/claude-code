// The observer inside the observation. The rigid-body kernel steps at 90 Hz; its contract for a free hinge (under 2 %
// of the swing energy lost per period, the period within 0.5 %) was measured on one bar of one metre released at 30°:
// one value of the tick over the period. The same free swing at six lengths and two releases asks whether that is the
// kernel's contract or the kernel's at that window. The observations carry the observer's tick and the period it
// watches, so the abduction can find the window if the window is what is missing.

import { beforeAll, describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import type { Jolt } from '../../src/nexus/realize';
import { barOnHinge, swingIntent, swingMaterial } from '../../src/nexus/swing';
import { windowStudy, type WindowStudy } from '../../src/nexus/study-swing';

let J: Jolt;
let study: WindowStudy;
const lengths = [0.15, 0.25, 0.5, 1, 2, 4];
beforeAll(async () => {
  J = await jolt();
  study = windowStudy(J, lengths.flatMap((barLength) => [10, 30].map((release) => ({ barLength, release }))));
}, 300000);

const slopeOf = (xs: number[], ys: number[]) => {
  const lx = xs.map(Math.log), ly = ys.map(Math.log), n = lx.length, mx = lx.reduce((a, b) => a + b) / n, my = ly.reduce((a, b) => a + b) / n;
  const sxx = lx.reduce((a, x) => a + (x - mx) ** 2, 0), sxy = lx.reduce((a, x, i) => a + (x - mx) * (ly[i]! - my), 0), syy = ly.reduce((a, y) => a + (y - my) ** 2, 0);
  return { slope: sxy / sxx, r2: (sxy * sxy) / (sxx * syy) };
};
const at = (release: number) => study.rows.filter((r) => Math.abs(r.release - release * Math.PI / 180) < 1e-9).sort((a, b) => a.tickOverPeriod - b.tickOverPeriod);

describe('the kernel\'s contract was a law of its window', () => {
  it('the contract holds on the bar it was measured on and fails only where the window is coarse against the swing', () => {
    expect(study.rows.length).toBe(12);
    const failed = study.rows.filter((r) => !r.within).map((r) => `${r.barLength} m at ${Math.round(r.release * 180 / Math.PI)}°`).sort();
    expect(failed).toEqual(['0.15 m at 30°', '0.25 m at 30°']);
    expect(study.rows.find((r) => r.barLength === 1 && Math.abs(r.release - Math.PI / 6) < 1e-9)!.within).toBe(true);
  });

  it('the residual has structure: at 30° the energy lost per period is a power of the tick over the period; at 10° the kernel gains energy instead, also as a power of it', () => {
    const big = at(30), small = at(10);
    for (let i = 1; i < big.length; i++) expect(big[i]!.lossPerPeriod).toBeGreaterThan(big[i - 1]!.lossPerPeriod);
    const lossFit = slopeOf(big.map((r) => r.tickOverPeriod), big.map((r) => r.lossPerPeriod));
    expect(lossFit.r2).toBeGreaterThan(0.99);
    expect(lossFit.slope).toBeGreaterThan(0.5);
    for (const r of small) expect(r.lossPerPeriod).toBeLessThan(0);
    const gainFit = slopeOf(small.map((r) => r.tickOverPeriod), small.map((r) => -r.lossPerPeriod));
    expect(gainFit.r2).toBeGreaterThan(0.99);
    // the period's error is of higher order in the window than the energy's
    const periodFit = slopeOf(small.map((r) => r.tickOverPeriod), small.map((r) => -r.periodError));
    expect(periodFit.r2).toBeGreaterThan(0.99);
    expect(periodFit.slope).toBeGreaterThan(gainFit.slope + 0.5);
  });

  it('the abduction finds the observer: the simplest group that separates the outcomes is the tick over the period, times the release', () => {
    expect(study.chosen).not.toBeNull();
    expect(study.chosen!.group.exponents).toEqual({ tick: 1, T: -1, theta0: 1 });
    expect(study.relation).not.toBeNull();
    // the conformance bar sits inside the bound: the contract was measured where it holds
    const bar = study.rows.find((r) => r.barLength === 1 && Math.abs(r.release - Math.PI / 6) < 1e-9)!;
    const conformance = bar.tickOverPeriod * bar.release;
    expect(conformance).toBeLessThanOrEqual(study.chosen!.threshold!.lo);
    expect(conformance).toBeGreaterThan(0.003);
  });
});

describe('what the language learned acts before the kernel runs', () => {
  it('a short bar released wide is refused by the learned relation before it is realized; the conformance bar is admitted and realized', () => {
    const short = barOnHinge(swingIntent('the test', { barLength: 0.1, release: 45, pivotHeight: 1.1 }), swingMaterial(), J, study.language);
    expect(short.refusedBy).toEqual([`the bar on the pin, watched at the kernel's tick: ${study.relation!.name}`]);
    expect(short.realization).toBeNull();
    const conformance = barOnHinge(swingIntent('the test', { barLength: 1, release: 30 }), swingMaterial(), J, study.language);
    expect(conformance.refusedBy).toEqual([]);
    expect(conformance.realization).not.toBeNull();
  });

  it('a bar that would reach the floor fails the system\'s own constraint and is never realized', () => {
    const s = barOnHinge(swingIntent('the test', { barLength: 2.5 }), swingMaterial(), J);
    expect(s.solution.satisfied).toBe(false);
    expect(s.solution.constraints.find((c) => c.holds === false)!.says).toMatch(/clears the floor/);
    expect(s.configuration).toBeNull();
  });
});
