// Seeing, traced back to time. Every step from a photon to a percept is a duration; every colour and every cutoff
// is one over a duration. These tests check the chain holds, that the blur is computed rather than asserted, and —
// the important one — that where the trace STOPS working the code says so instead of fitting a parameter to hide it.
import { describe, expect, it } from 'vitest';
import { SEEING, EYE_CONE, EYE_ROD, HUMAN_EYE, whyLightIsAColour, cyclesAveraged, bohrPeriod,
  flickerCutoff, flickerFromWindow, FASTER_THAN_THE_ORBIT, periodOf, meetRate, meetFlicker } from '../../src/nexus/substrate/perceive';
import { inTime } from '../../src/nexus/substrate/time';
import { dimOf } from '../../src/nexus/lang/dimension';

describe('every step of seeing is a time', () => {
  it('a duration is time^1 and a rate is time^-1, so the whole chain lands on the one tree', () => {
    expect(inTime(dimOf('s'))).toBe(1);
    expect(inTime(dimOf('Hz'))).toBe(-1);
    // and the quantities a photon carries all land on the SAME power, because E = hf = pc
    expect(inTime(dimOf('J'))).toBe(-1);
    expect(inTime(dimOf('kg m/s'))).toBe(-1);
    expect(inTime(dimOf('m'))).toBe(1);
  });

  it('spans fifteen orders of magnitude inside one organ, every row sourced', () => {
    const s = SEEING.map((b) => b.seconds);
    expect(Math.max(...s) / Math.min(...s)).toBeGreaterThan(1e15);
    for (const b of SEEING) {
      expect(b.hz).toBeCloseTo(1 / b.seconds, 6);
      expect(b.source.length, `${b.what} must cite its measurement`).toBeGreaterThan(12);
      expect(b.seconds).toBeGreaterThan(0);
    }
    // the fastest step is the light itself; the slowest is the body
    const byTime = [...SEEING].sort((a, z) => a.seconds - z.seconds);
    expect(byTime[0].stage).toBe('light');
    expect(byTime[byTime.length - 1].stage).toBe('body');
  });

  it('one period of 555 nm light is 1.85 fs, straight from lambda/c', () => {
    expect(periodOf(555e-9)).toBeCloseTo(1.851e-15, 17);
    expect(1 / periodOf(555e-9)).toBeCloseTo(5.402e14, -11);
  });
});

describe('why a colour is a colour, and where the blur really is', () => {
  it('the eye averages 10^13 optical cycles into one reading, so meetRate says "a line"', () => {
    const w = whyLightIsAColour(555);
    expect(w.cycles).toBeGreaterThan(1e13);
    expect(w.meets, 'the rate is read though no moment of it is').toBe('a line');
    expect(w.says).toMatch(/The blur is in the eye/);
    // and this is not special to one wavelength: every visible colour is a line, never followed
    for (const nm of [390, 450, 555, 700, 770]) expect(whyLightIsAColour(nm).meets).toBe('a line');
    for (const nm of [410, 507, 630]) expect(whyLightIsAColour(nm, EYE_ROD).meets).toBe('a line');
  });

  it('a carrier is not a modulation, and the two have one function each', () => {
    // writing this test is what found the gap: meetRate checks its one frequency against the BAND first, so asking
    // it about a 1 Hz flashing lamp answered 'out of band' — true of 1 Hz radiation, nonsense about a lamp.
    const green = 1 / periodOf(555e-9);
    expect(meetRate(green, 'light', EYE_CONE), 'the carrier is a line: a colour').toBe('a line');
    expect(meetRate(1e12, 'light', EYE_CONE), 'infrared is not seen at all').toBe('out of band');
    expect(meetRate(1e16, 'light', EYE_CONE), 'ultraviolet likewise').toBe('out of band');
    expect(meetRate(green, 'sound', EYE_CONE), 'and an eye answers light only').toBe('not answered');

    // the modulation is the other question, and now it has its own answer
    expect(meetFlicker(green, 1, EYE_CONE).verdict, 'a 1 Hz lamp is seen flashing').toBe('followed');
    expect(meetFlicker(green, 5, EYE_CONE).verdict).toBe('followed');
    expect(meetFlicker(green, 120, EYE_CONE).verdict, 'and 120 Hz fuses to steady light').toBe('fused');
    expect(meetFlicker(1e12, 1, EYE_CONE).verdict, 'a flashing infrared lamp is seen not at all').toBe('unseen');
    // the rod fuses sooner, because its window is longer — the trade it makes for sensitivity
    expect(meetFlicker(green, 30, EYE_ROD).verdict).toBe('fused');
    expect(meetFlicker(green, 30, EYE_CONE).verdict).toBe('followed');
    // ONE LAW, TWO REGIMES: fusion and colour are the same averaging at different rates
    expect(meetFlicker(green, 120, EYE_CONE).says).toMatch(/the same averaging that turns a 555 nm carrier into a colour/);
  });

  it('the bicycle wheel, as a number: 10^14 electron orbits per instant of seeing', () => {
    const t = bohrPeriod();
    // 2 pi a0 / (alpha c) = 152 attoseconds, the textbook Bohr period
    expect(t).toBeCloseTo(1.52e-16, 18);
    expect(cyclesAveraged(t)).toBeGreaterThan(1e14);
    expect(cyclesAveraged(periodOf(555e-9))).toBeGreaterThan(1e13);
  });

  it('BUT the faster observer has been built, and the wave did not become a planet', () => {
    // the essay's thought experiment is testable because the instruments exist. The shortest pulse ever made is
    // SHORTER than one orbit, so the shutter really is faster than the thing it watches.
    const orbit = bohrPeriod();
    const shortest = FASTER_THAN_THE_ORBIT.find((f) => f.instrument.includes('shortest'))!;
    expect(shortest.seconds).toBeLessThan(orbit);
    expect(orbit / shortest.seconds).toBeGreaterThan(3);
    for (const f of FASTER_THAN_THE_ORBIT) expect(f.source.length).toBeGreaterThan(10);
  });
});

describe('where the trace stops working, it says so', () => {
  it('REFUSES to derive flicker fusion from the integration window, because the model is out by 11x', () => {
    // This is the round holding itself to the rule it held the user's essay to. One pole from the cone's MEASURED
    // critical duration gives 5.3 Hz against a measured 60 Hz. You can force agreement with tau = 2.65 ms, but
    // that number is 60 Hz run backwards through the formula — a knob, not a measurement. So: reported, not tuned.
    const f = flickerFromWindow(EYE_CONE, 60);
    expect(f.works, 'the single-pole model does NOT reproduce the measurement').toBe(false);
    expect(f.onePole).toBeCloseTo(5.3, 1);
    expect(f.factorOut).toBeGreaterThan(10);
    expect(f.backFitTau).toBeCloseTo(2.65e-3, 5);
    expect(f.says).toMatch(/OUT BY A FACTOR OF/);
    expect(f.says).toMatch(/run backwards through the formula and not a measurement/);
    // and the rod fails the same way, so it is the model that is wrong, not one row of data
    expect(flickerFromWindow(EYE_ROD, 15).works).toBe(false);
    expect(flickerFromWindow(EYE_ROD, 15).factorOut).toBeGreaterThan(5);
  });

  it('the formula itself is still correct, which is why the failure is informative', () => {
    // 1/(2 pi tau) is just a single pole's corner frequency; nothing wrong with it. What is wrong is treating a
    // threshold-summation time as a modulation-transfer time, and the code names that rather than hiding it.
    expect(flickerCutoff(1 / (2 * Math.PI))).toBeCloseTo(1, 9);
    expect(flickerCutoff(15e-3)).toBeCloseTo(10.6, 1);
  });
});

describe('the eye is an observer like any other', () => {
  it('cones and rods are values of the same Sense fields, each number sourced', () => {
    for (const s of HUMAN_EYE.senses) {
      expect(s.carrier).toBe('light');
      expect(s.band!.lo).toBeLessThan(s.band!.hi);
      expect(s.window).toBeGreaterThan(0);
      expect(s.least).toBeLessThan(s.most);
      for (const k of ['band', 'window', 'every', 'latency']) {
        expect(s.sources[k], `${s.name} must say where its ${k} is from`).toBeTruthy();
      }
    }
    // the dark-adapted eye is slower and dimmer, which is the whole trade it makes
    expect(EYE_ROD.window).toBeGreaterThan(EYE_CONE.window);
    expect(EYE_ROD.least).toBeLessThan(EYE_CONE.least);
    expect(EYE_ROD.latency).toBeGreaterThan(EYE_CONE.latency);
  });
});
