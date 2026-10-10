// Observation as a physical projection of a generated reality. One manifold (the kernel's swing; a body's thermal
// glow; water's mechanisms; a room's carbon dioxide) and several observers, each a configuration of the same fields
// (src/data/observers.ts). No observer is handed the manifold: each receives what crosses to it, in its band, above
// what it registers, averaged over its window, blurred to its resolution, after its latency. The manifold is not
// changed by being observed unless the observer's own light pushes it.

import { beforeAll, describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { instruments, person } from '../../src/data/observers';
import { CONST } from '../../src/nexus/book/constants';
import { glowOnset, meetRate, pushOver, radianceIn, receiveGlow, receiveLevel, receiveSeries, type Placement, type Series } from '../../src/nexus/substrate/perceive';
import { barOnHinge, swingIntent, swingMaterial, tipSeries, type SwingSlice } from '../../src/nexus/substrate/swing';

const sense = (name: string) => person.senses.find((s) => s.name === name)!;
const c = CONST.c.value!;
const through = (distance: number): Placement => ({ distance, speeds: { light: c, momentum: 343 } });

let swing: SwingSlice;
let tip: Series;
beforeAll(async () => {
  swing = barOnHinge(swingIntent('the test', { barLength: 1, release: 30 }), swingMaterial(), await jolt());
  tip = tipSeries(swing)!;
}, 120000);

describe('one manifold, several observers', () => {
  it('a person three metres away sees the swing late by the light\'s crossing and their latency, averaged over their window, blurred to a minute of arc: never the samples themselves', () => {
    const before = JSON.stringify(tip);
    const seen = receiveSeries(tip, sense('sight'), through(3));
    expect(seen.detected).toBe(true);
    expect(seen.delay).toBeCloseTo(3 / c + 0.1, 15);
    expect(seen.t[0]).toBeCloseTo(tip.t[0]! + 1 / 60 + seen.delay, 12);
    // fewer readings than the manifold holds, each a multiple of what a minute of arc is at three metres
    expect(seen.v.length).toBeLessThan(tip.v.length);
    const q = (Math.PI / (180 * 60)) * 3;
    for (const x of seen.v) expect(Math.abs(x / q - Math.round(x / q))).toBeLessThan(1e-9);
    // being seen does not change the manifold
    expect(JSON.stringify(tip)).toBe(before);
  });

  it('from ten kilometres the person cannot tell the swing from stillness; a telescope there can', () => {
    expect(receiveSeries(tip, sense('sight'), through(1e4)).lost).toContain('blurred');
    expect(receiveSeries(tip, instruments['a telescope']!, through(1e4)).detected).toBe(true);
  });

  it('a high-speed camera is not given what the manifold does not hold: it is told what the manifold must be generated as, and why (read once a tick; rigid only to windows the sound crossing is short against)', () => {
    const r = receiveSeries(tip, instruments['a high-speed camera']!, through(1));
    expect(r.detected).toBe(false);
    expect(r.lost).toEqual(['not held by the manifold']);
    expect(r.refine!.window).toBe(1e-4);
    expect(r.refine!.because.length).toBe(2);
    expect(r.refine!.because[0]).toMatch(/read once a tick/);
    expect(r.refine!.because[1]).toMatch(/rigid/);
    // the person's window is long against both, so the rigid manifold holds for them
    expect(1 / 60).toBeGreaterThan(Math.max(...tip.holds.map((h) => h.finest)));
  });
});

describe('what exists and a person cannot perceive', () => {
  it('water at 25 °C glows: invisible to the eye, bright to a thermal camera; the radiance over all bands is Stefan–Boltzmann\'s', () => {
    expect(receiveGlow(298.15, sense('sight')).detected).toBe(false);
    expect(receiveGlow(298.15, sense('sight')).radiance).toBeLessThan(1e-15);
    expect(receiveGlow(298.15, instruments['a thermal camera']!).detected).toBe(true);
    expect(receiveGlow(1500, sense('sight')).detected).toBe(true);
    expect(radianceIn({ lo: 1e9, hi: 1e16 }, 300)).toBeCloseTo(CONST.sigmaSB.value! * 300 ** 4 / Math.PI, 6);
    // the glow begins to register to the eye between the two; the flat band places it below where solids are seen to glow (the Draper point, 798 K): the eye's response across its band is the missing distinction
    const onset = glowOnset(sense('sight'));
    expect(onset).toBeGreaterThan(298.15);
    expect(onset).toBeLessThan(798);
  });

  it('a mechanism faster than a window is a line where the sense answers its frequency (a colour, a pitch, a band in a spectrum), followed where it is slow, and nothing outside the band', () => {
    const OH = c * 3.4e5;
    expect(meetRate(OH, 'light', sense('sight'))).toBe('out of band');
    expect(meetRate(OH, 'light', instruments['an infrared spectrometer']!)).toBe('a line');
    expect(meetRate(c / 550e-9, 'light', sense('sight'))).toBe('a line');
    expect(meetRate(1000, 'momentum', sense('hearing'))).toBe('a line');
    const swingRate = 1 / swing.solution.bound['T']!.value!;
    expect(meetRate(swingRate, 'momentum', sense('hearing'))).toBe('out of band');
    expect(meetRate(2, 'momentum', sense('balance'))).toBe('followed');
  });

  it('a room at a thousand parts per million of carbon dioxide: nothing a person has answers it; a sensor does', () => {
    const molPerM3 = 1000e-6 * 101325 / (CONST.R.value! * 298.15);
    expect(receiveLevel('amount of carbon dioxide', molPerM3, sense('smell')).lost).toEqual(['not answered']);
    expect(receiveLevel('amount of carbon dioxide', molPerM3, instruments['a carbon dioxide sensor']!).detected).toBe(true);
  });
});

describe('the observer is in the manifold', () => {
  it('a rangefinder\'s light gives a swinging bar nothing it would notice, and a micrometre bead in water more momentum in a millisecond than it holds: at that scale the observer is part of the dynamics', () => {
    const laser = instruments['a laser rangefinder']!;
    const bar = swing.solution.bound['m']!.value! * swing.solution.bound['omega']!.value! * swing.solution.bound['theta0']!.value! * swing.solution.bound['d']!.value!;
    expect(pushOver(laser, swing.solution.bound['watch']!.value!) / bar).toBeLessThan(1e-9);
    const r = 0.5e-6, bead = (4 / 3) * Math.PI * r ** 3 * 1000 * 1e-6;
    expect(pushOver(laser, 1e-3) / bead).toBeGreaterThan(1e3);
  });
});
