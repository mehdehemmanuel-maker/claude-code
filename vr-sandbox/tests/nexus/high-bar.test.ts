// High bars as instruments (tests/nexus/high-bar.ts): a printer at a kilogram an hour and twenty micrometres, a hall
// that computes a billion billion operations a second, a vessel that grows a hundred kilograms of cells a day. At the
// printer's old bar and its new one the generator found the same gaps: it did not see the bar. What all three lacked
// was what a change costs and how fast it can go; the rules added are general (src/nexus/transport.ts, information in
// src/nexus/carrier.ts), and these intents test them.

import { describe, expect, it } from 'vitest';
import { CONST } from '../../src/nexus/book/constants';
import { generate, lacking } from '../../src/nexus/manifold';
import { attemptRate, changeTime } from '../../src/nexus/rate';
import { centreFourier, cylinderCentre, leastHeatedLength } from '../../src/nexus/transport';
import { cellVessel, computeHall, fastPrinter } from './high-bar';
import { printer } from './inventions';

const el = (s: ReturnType<typeof generate>, id: string) => s.elements.find((e) => e.id === id)!;
const val = (s: ReturnType<typeof generate>, id: string, name: string) => el(s, id).values.find((v) => v.name.startsWith(name))!.value;

describe('a change carried through matter takes the matter\'s own time, and the matter must stay that long where it changes', () => {
  it('the centre of a cylinder whose surface is held at a new potential: the Bessel series agrees with a direct solve of the heat equation', () => {
    // radial conduction, explicit in time, surface held at one, centre starting at none: when is 0.15 of the step left at the centre?
    const n = 60, dr = 1 / n, dt = 0.2 * dr * dr;
    let T = new Array(n + 1).fill(0); T[n] = 1;
    let t = 0;
    while (1 - T[0]! > 0.15) {
      const N = T.slice();
      N[0] = T[0]! + 4 * dt * (T[1]! - T[0]!) / (dr * dr);
      for (let i = 1; i < n; i++) { const r = i * dr; N[i] = T[i]! + dt * ((T[i + 1]! - 2 * T[i]! + T[i - 1]!) / (dr * dr) + (T[i + 1]! - T[i - 1]!) / (2 * dr * r)); }
      T = N; t += dt;
    }
    expect(centreFourier(0.15)).toBeCloseTo(t, 2);
    expect(cylinderCentre(centreFourier(0.15))).toBeCloseTo(0.15, 9);
  });

  it('the length a round stream must be heated over does not depend on its diameter: a thinner stream moves faster by exactly what it heats faster', () => {
    const Q = 1e-7, rho = 1240, c = 1800, k = 0.13;
    const L = leastHeatedLength(Q, rho, c, k, 293.15, 463.15, 493.15);
    for (const r of [2e-4, 8.75e-4, 3e-3]) {
      const own = L.Fo * r * r * rho * c / k, speed = Q / (Math.PI * r * r);
      expect(own * speed).toBeCloseTo(L.length, 12);
    }
  });

  it('the printer now sees its bar: the heated length grows with the largest flow wanted, from a fifth of a metre to half a metre, and what would shorten it is named', () => {
    const low = generate(printer()), high = generate(fastPrinter());
    const at = (s: ReturnType<typeof generate>) => val(s, 'flows:volume of PLA:the part', 'least length a round stream is held in it');
    expect(at(low)).toBeGreaterThan(0.15);
    expect(at(high)).toBeGreaterThan(0.45);
    // the largest flow each wants: the old printer's part of a day, 8000 cm³ over 86400 s; the new one's kilogram an hour
    expect(at(high) / at(low)).toBeCloseTo(2.24e-7 / (0.2 ** 3 / 86400), 6);
    expect(high.gaps.some((g) => /splitting the flow into streams side by side/.test(g.lacks))).toBe(true);
    expect(high.unused.some((u) => u.name === 'conductivity of PLA')).toBe(false);
  });
});

describe('information: told apart, held and heard, tied to heat, to barriers and to the speed of light', () => {
  const s = generate(computeHall());
  const kB = CONST.kB.value!;

  it('a hall that generated nothing now has structure: erasing a billion billion bits a second sends at least k T ln 2 each, a few milliwatts at the coldest the heat can go, far within the supply', () => {
    expect(s.elements.length).toBeGreaterThan(0);
    const P = val(s, 'conversion:information:the computers', 'least power');
    expect(P).toBeCloseTo(1e18 * kB * (273.15 + 35) * Math.LN2, 12);
    expect(P).toBeLessThan(val(s, 'path:charge:the grid->the computers', 'within what the grid gives'));
    expect(s.gaps.some((g) => /what a realization spends per bit it erases is not derived/.test(g.lacks))).toBe(true);
  });

  it('a bit held ten years at the hottest the computers run sits behind about fifty k T: the barrier law that sets how fast molecules change sets how long a bit stays', () => {
    const T = 273.15 + 85, t = 10 * 3.15576e7;
    const Eb = val(s, 'bound:information:the computers:held', 'least barrier per bit');
    expect(Eb).toBeCloseTo(kB * T * Math.log(t * attemptRate(T)), 30);
    expect(changeTime(Eb * CONST.R.value! / kB, T)).toBeCloseTo(t, -3);
    expect(val(s, 'bound:information:the computers:held', 'least barrier per bit, over k T')).toBeGreaterThan(45);
  });

  it('to hear each other within a microsecond the computers lie within 300 m of each other; the hall\'s 100 m across fits', () => {
    expect(val(s, 'bound:information:the computers:lag', 'most distance between its parts')).toBeCloseTo(CONST.c.value! * 1e-6, 6);
    expect(val(s, 'bound:information:the computers:lag', 'largest distance within the hall')).toBeLessThan(300);
    expect(s.gaps.some((g) => /is larger across than the lag/.test(g.lacks))).toBe(false);
  });
});

describe('what the high bars still lack in common', () => {
  const intents = [fastPrinter(), computeHall(), cellVessel()];
  const ranked = lacking(intents, intents.map(generate));

  it('no want of the three is about no carrier any more but the printer\'s bond between layers, and the vessel\'s growth still has nothing to make it from: a matter that makes more of itself is missing', () => {
    expect(ranked.find((l) => l.distinction === 'a want about no carrier')!.inventions).toEqual(['a fast, precise 3D printer']);
    const v = generate(cellVessel());
    expect(v.gaps.some((g) => g.element === 'use:mass of cells:the cells' && /no reservoir of mass of cells/.test(g.lacks))).toBe(true);
    expect(v.unused.some((u) => u.name === 'cell mass made per oxygen taken')).toBe(true);
  });
});
