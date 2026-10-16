// What no change of clock can change, and the thesis that says otherwise, tested rather than argued.
//
// The claim under test: the 10^36 between the electric and the gravitational force between two protons is an
// artefact of the human second, and the forces are one mechanism seen at different clock rates. These tests do not
// assert that it is wrong. They compute it. Every number here is checked against a value from outside this code
// (CODATA, the Particle Data Group, a textbook result) rather than against the code's own output.
import { describe, expect, it } from 'vitest';
import { couplings, whereTheRatioComesFrom, shifted, clockRatio, theKnob, loopEnergy,
  classicalFallTime, BLUR_OR_WAVE, RUNS_WITH_SCALE, HBAR } from '../../src/nexus/substrate/invariant';

const A0 = 5.29177210903e-11, LY = 9.4607304725808e15;

describe('the couplings are pure numbers', () => {
  it('reproduces alpha and alpha_G to the published values', () => {
    const by = (n: string) => couplings().find((c) => c.name.includes(n))!.value;
    expect(HBAR).toBeCloseTo(1.054571817e-34, 42);
    // CODATA 2018: alpha = 7.2973525693(11)e-3
    expect(by('fine-structure')).toBeCloseTo(7.2973525693e-3, 12);
    expect(1 / by('fine-structure')).toBeCloseTo(137.035999, 5);
    // G m_p^2 / hbar c, from CODATA 2018 constants
    expect(by('gravitational coupling')).toBeCloseTo(5.9061e-39, 42);
    // CODATA 2018: Planck mass 2.176434(24)e-8 kg
    expect(by('Planck mass')).toBeCloseTo(2.176434e-8, 12);
    // the essay's own figure, independently arrived at here
    expect(by('electric over gravitational')).toBeGreaterThan(1.2e36);
    expect(by('electric over gravitational')).toBeLessThan(1.3e36);
  });

  it('the ratio IS a mass ratio squared: alpha_G = (m_p/m_Planck)^2 exactly', () => {
    const w = whereTheRatioComesFrom();
    expect(w.agree, 'the identity holds to one part in 10^12').toBe(true);
    expect(w.alphaG / w.massRatioSquared).toBeCloseTo(1, 10);
    expect(w.ratio / w.byMasses).toBeCloseTo(1, 9);
    // so the whole of gravity's weakness is that the proton is 7.7e-20 of the Planck mass
    expect(Math.sqrt(w.massRatioSquared)).toBeCloseTo(7.685e-20, 22);
  });

  it('NO CHANGE OF UNIT OR CLOCK MOVES THEM — the test, carried out', () => {
    // every ruler and every clock there is, rescaled at once by arbitrary factors. A dimensionless number cannot
    // move under this, and that is the whole refutation of "the ratio is an artefact of the human second":
    // the second is one of the four things being rescaled here, by 23 orders of magnitude.
    for (const by of [
      { metre: 1e7, second: 1e-23, kilogram: 4.2e11, coulomb: 0.137 },
      { metre: 1 / 299792458, second: 1, kilogram: 1 / 1.67262192369e-27, coulomb: 1 / 1.602176634e-19 },
      { metre: Math.PI, second: Math.E, kilogram: Math.SQRT2, coulomb: 1 / 3 },
    ]) {
      for (const r of shifted(by)) {
        expect(r.moved, r.says).toBe(false);
        expect(r.after / r.before).toBeCloseTo(1, 9);
      }
    }
  });
});

describe('the clock claim, computed', () => {
  it('reproduces the essay\'s own frequencies and ratio', () => {
    const k = clockRatio(A0, 50000 * LY);
    expect(k.fFast).toBeCloseTo(5.665e18, -15);      // the essay: 5.67e18 Hz
    expect(k.fSlow / 6.337e-13).toBeCloseTo(1, 2);    // the essay: 6.34e-13 Hz
    expect(k.ratio / 8.94e30).toBeCloseTo(1, 2);      // the essay: 8.94e30
  });

  it('and it misses the target by five orders of magnitude', () => {
    const target = couplings().find((c) => c.name.includes('electric over'))!.value;
    const miss = target / clockRatio(A0, 50000 * LY).ratio;
    expect(miss).toBeGreaterThan(1e5);
    expect(miss).toBeLessThan(1e6);
    // 138,000x apart is not agreement. For scale: a proton and a grain of sand are 1e20 apart in mass, and
    // nobody calls those the same ballpark either.
    expect(Math.round(miss)).toBeGreaterThan(100000);
  });

  it('WHY IT IS NOT A DERIVATION: the clock ratio has a free parameter that hits any target', () => {
    // f_fast/f_slow = R_slow/R_fast is continuous and unbounded in R_slow, so it passes through EVERY positive
    // number. Choose the radius and you choose the answer. The couplings above have no such knob: every symbol in
    // them is a measured constant, which is exactly what makes them a result.
    for (const target of [1e10, 1.2355e36, 1e50]) {
      const k = theKnob(target, A0);
      expect(clockRatio(A0, k.rSlow).ratio / target, `tuned to ${target}`).toBeCloseTo(1, 6);
    }
    // and the tuning is not hypothetical: swapping the Bohr radius for the proton radius, with the SAME galaxy,
    // moves the "match" from 8.9e30 to 5.6e35 — five orders of magnitude, on a choice of which radius to call the
    // atom's. A result you can move that far by picking an input is numerology.
    const byBohr = clockRatio(A0, 50000 * LY).ratio;
    const byProton = clockRatio(0.8414e-15, 50000 * LY).ratio;
    expect(byProton / byBohr).toBeGreaterThan(1e4);
  });

  it('and "energy per loop" is an action, not an energy — the book\'s own dimension algebra says so', () => {
    const L = loopEnergy();
    expect(L.isEnergy).toBe(false);
    expect(L.dim).toBe('kg m^2 s^-1');
    expect(L.energyDim).toBe('kg m^2 s^-2');
    expect(L.power, 'an action is time^0 on the one tree').toBe(0);
    expect(L.energyPower, 'an energy is time^-1').toBe(-1);
  });
});

describe('blur or wave', () => {
  it('a classical orbit collapses in 16 trillionths of a second', () => {
    // Larmor integrated: t = 4 pi^2 eps0^2 m^2 c^3 a0^3 / e^4. The textbook figure is about 1.6e-11 s.
    const t = classicalFallTime();
    expect(t.seconds).toBeGreaterThan(1e-11);
    expect(t.seconds).toBeLessThan(2e-11);
    expect(t.seconds).toBeCloseTo(1.56e-11, 12);
  });

  it('every observation that distinguishes a blur from a wave decides against the blur', () => {
    expect(BLUR_OR_WAVE.length).toBeGreaterThanOrEqual(5);
    for (const b of BLUR_OR_WAVE) {
      expect(b.decides, `${b.watch} must decide something`).not.toBe('blur');
      expect(b.source.length, `${b.watch} must cite what measured it`).toBeGreaterThan(8);
      expect(b.blurSays.length).toBeGreaterThan(20);
    }
    // the Bell row is the one that rules out the whole class rather than one version of it
    expect(BLUR_OR_WAVE.find((b) => b.watch.includes('CHSH'))!.source).toMatch(/Aspect|Hensen/);
  });

  it('what DOES run with scale runs far too slowly to close the gap', () => {
    // the honest positive: a coupling really does change with scale. It changes with the ENERGY of the probe,
    // and alpha moves by 7% over eleven orders of magnitude. The gap it would have to close is 10^36.
    const [atRest, atZ] = RUNS_WITH_SCALE;
    expect(atZ.value / atRest.value).toBeGreaterThan(1.05);
    expect(atZ.value / atRest.value, 'a 7% move, not a factor of 10^36').toBeLessThan(1.1);
    const target = couplings().find((c) => c.name.includes('electric over'))!.value;
    expect(target / (atZ.value / atRest.value)).toBeGreaterThan(1e35);
  });
});
