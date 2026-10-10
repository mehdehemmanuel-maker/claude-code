// The observer inside the observation. The rigid-body kernel steps at 90 Hz; its contract for a free hinge (under 2 %
// of the swing energy lost per period, the period within 0.5 %) was measured on one bar of one metre released at 30°:
// one value of the tick over the period. The same free swing at six lengths and two releases asks whether that is the
// kernel's contract or the kernel's at that window. The observations carry the observer's tick and the period it
// watches, so the abduction can find the window if the window is what is missing.

import { beforeAll, describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import type { Jolt } from '../../src/nexus/substrate/realize';
import { barOnHinge, swingIntent, swingMaterial } from '../../src/nexus/substrate/swing';
import { tuneSwing, windowStudy, type WindowStudy } from '../../src/nexus/substrate/study-swing';
import { Language } from '../../src/nexus/substrate/abduce';
import { boundOn, stale } from '../../src/nexus/substrate/tune';

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
const swept = () => study.rows.filter((r) => r.substeps === 1);
const at = (release: number) => swept().filter((r) => Math.abs(r.release - release * Math.PI / 180) < 1e-9).sort((a, b) => a.tickOverPeriod - b.tickOverPeriod);

describe('the kernel\'s contract was a law of its window', () => {
  it('the contract holds on the bar it was measured on and fails only where the window is coarse against the swing', () => {
    expect(swept().length).toBe(12);
    const failed = swept().filter((r) => !r.within).map((r) => `${r.barLength} m at ${Math.round(r.release * 180 / Math.PI)}°`).sort();
    expect(failed).toEqual(['0.15 m at 30°', '0.25 m at 30°']);
    expect(swept().find((r) => r.barLength === 1 && Math.abs(r.release - Math.PI / 6) < 1e-9)!.within).toBe(true);
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

  it('the first abduction cannot tell the step the kernel integrates at from the tick the observer reads at, and names them as what to vary', () => {
    expect(study.rounds[0]!.chosen).toBeNull();
    expect(study.rounds[0]!.ambiguous.sort()).toEqual(['step · T^-1 · theta0', 'tick · T^-1 · theta0']);
    expect(study.rounds[0]!.vary.sort()).toEqual(['step', 'tick']);
  });

  it('the study runs that experiment itself: the cases outside the contract again at a finer step, read at the same tick; the loss halves with the step, so the fault was the realization\'s time, not the observation\'s', () => {
    for (const L of [0.15, 0.25]) {
      const rows = study.rows.filter((r) => r.barLength === L && Math.abs(r.release - Math.PI / 6) < 1e-9).sort((a, b) => a.substeps - b.substeps);
      expect(rows.map((r) => r.substeps)).toEqual([1, 2, 4]);
      for (let i = 1; i < rows.length; i++) { expect(rows[i]!.lossPerPeriod / rows[i - 1]!.lossPerPeriod).toBeGreaterThan(0.4); expect(rows[i]!.lossPerPeriod / rows[i - 1]!.lossPerPeriod).toBeLessThan(0.6); expect(rows[i]!.tickOverPeriod).toBe(rows[0]!.tickOverPeriod); }
      expect(rows.slice(1).every((r) => r.within)).toBe(true);
    }
    expect(study.rounds[1]!.chosen).toBe('step · T^-1 · theta0');
    expect(study.chosen!.group.exponents).toEqual({ step: 1, T: -1, theta0: 1 });
    expect(study.relation).not.toBeNull();
    // the conformance bar sits inside the bound: the contract was measured where it holds
    const bar = swept().find((r) => r.barLength === 1 && Math.abs(r.release - Math.PI / 6) < 1e-9)!;
    expect(bar.stepOverPeriod * bar.release).toBeLessThanOrEqual(study.chosen!.threshold!.lo);
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

describe('the tuner: detect the regime, change the representation, regenerate', () => {
  it('a relation that speaks of the representation is solved for it: the coarsest step that keeps the group at the edge of what was observed to hold', () => {
    const s = barOnHinge(swingIntent('the test', { barLength: 0.1, release: 45, pivotHeight: 1.1 }), swingMaterial(), J, study.language);
    const b = boundOn(study.relation!, 'step', s.judgedOn) as { below: number };
    const T = s.judgedOn['T']!.value!, th = s.judgedOn['theta0']!.value!;
    expect(b.below).toBeCloseTo(study.chosen!.threshold!.lo * T / th, 12);
  });

  it('a short bar released wide: refused at the tick, solved, regenerated at a quarter of it, and kept; the step one coarser would not be admitted', () => {
    const t = tuneSwing(J, swingIntent('the test', { barLength: 0.1, release: 45, pivotHeight: 1.1 }), study.language);
    expect(t.path.map((p) => p.value.value)).toEqual([1 / 90, 1 / 360]);
    expect(t.path[0]!.refusedBy).toEqual([study.relation!.name]);
    expect(t.path[0]!.manifold.realization).toBeNull();
    expect(t.chosen!.kept).toBe(true);
    const b = boundOn(study.relation!, 'step', t.chosen!.manifold.judgedOn) as { below: number };
    expect(1 / 270).toBeGreaterThan(b.below);
    // nothing of the refused representation reaches the regenerated slice: every measurement it holds was integrated at the step chosen
    const r = t.chosen!.manifold.realization!;
    for (const d of [r.period, r.swingEnergyStart, r.swingEnergyEnd, ...r.samples.map((x) => x.angle)]) expect(d.window!.step).toBeCloseTo(1 / 360, 12);
  });

  it('the bar the contract was measured on stays at the tick: nothing is computed finer than the phenomenon needs', () => {
    const t = tuneSwing(J, swingIntent('the test', { barLength: 1, release: 30 }), study.language);
    expect(t.path.length).toBe(1);
    expect(t.chosen!.value.value).toBe(1 / 90);
    expect(t.chosen!.kept).toBe(true);
  });

  it('a budget below what the phenomenon needs is refused with its reason, not run coarse', () => {
    const t = tuneSwing(J, swingIntent('the test', { barLength: 0.1, release: 45, pivotHeight: 1.1 }), study.language, 2);
    expect(t.chosen).toBeNull();
    expect(t.refused).toMatch(/needs step at most 0\.003\d+, and the finest available is 0\.005556/);
  });

  it('with no relation to say why, a broken contract is an experiment along the representation: finer, and kept, so the fault was there', () => {
    const t = tuneSwing(J, swingIntent('the test', { barLength: 0.15, release: 30, pivotHeight: 1.15 }), new Language());
    expect(t.path.map((p) => p.kept)).toEqual([false, true]);
    expect(t.chosen!.value.value).toBeCloseTo(1 / 180, 12);
  });

  it('a slice judged under a language that has since grown is stale, and regenerated under the grown one it is judged again', () => {
    const before = barOnHinge(swingIntent('the test', { barLength: 0.1, release: 45, pivotHeight: 1.1 }), swingMaterial(), J, new Language());
    expect(stale(before.language, study.language)).toBe(true);
    expect(before.realization).not.toBeNull();
    const after = barOnHinge(swingIntent('the test', { barLength: 0.1, release: 45, pivotHeight: 1.1 }), swingMaterial(), J, study.language);
    expect(stale(after.language, study.language)).toBe(false);
    expect(after.refusedBy.length).toBe(1);
  });
});
