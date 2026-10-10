// Instruments that see what an eye cannot: every number an instrument says about itself is one of the book's laws run,
// so each piece of arithmetic here is checked against the law itself, read the other way round where it can be; every
// size the kinds sell is drawn whole and weighs what its kind says; and what each one can do to the person using it is
// said in words, not hinted at.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HAZARDS, MU_100KEV, anodeSeconds, camKg, camWatts, ftir, ftirKg, glow, halfValue, lidar, lidarKg, panelKg, pulseResolution, shieldFor, thermalCam, through, tubeKg, xrayTube } from '../../src/nexus/machines/instruments';
import { componentOf } from '../../src/nexus/parts/components';
import { resolve } from '../../src/nexus/parts/inventory';
import { massOf } from '../../src/nexus/parts/mass';
import { lawById } from '../../src/nexus/book';
import { ofLeaf, type Derivation } from '../../src/nexus/substrate/evaluate';
import { apply } from '../../src/nexus/substrate/law';
import { leaf } from '../../src/nexus/substrate/term';
import { layout } from '../../src/nexus/make/space';

/** The kind a word names, drawn. */
function drawn(words: string) {
  const r = resolve(words);
  if (!r || typeof r === 'string') throw new Error(`${words}: ${String(r)}`);
  const c = componentOf(r.id);
  if (!c) throw new Error(`${words}: no design`);
  return { ...c, g: massOf(c.part) * 1000 };
}
/** A law of the book, run on its own ports. */
const run = (id: string, inputs: Record<string, number>): number => {
  const t = lawById(id);
  const e: Record<string, Derivation> = Object.fromEntries(t.inputs.map((q) => [q.sym, ofLeaf(leaf(q.name, inputs[q.sym]!, q.unit, { class: 'given', by: 'test' }))]));
  const d = apply(t, e);
  if (d.value === null) throw new Error(`${id}: ${d.refusal?.domain ?? d.because ?? 'no value'}`);
  return d.value;
};

describe('an x-ray tube: what it makes, and what it mostly makes instead', () => {
  it('makes nothing harder than one electron\'s worth, which is the book\'s own law', () => {
    const t = xrayTube(100, 200);
    expect(t.lambda).toBeCloseTo(run('xray.cutoff', { V: 100000 }), 15);
    // (12.4 pm at 100 kV: the number every x-ray textbook opens with)
    expect(t.lambda * 1e12).toBeCloseTo(12.4, 1);
  });
  it('turns nearly all of its power into heat, by the thick-target yield', () => {
    const t = xrayTube(100, 200);
    expect(t.eta).toBeCloseTo(run('xray.efficiency', { Z: 74, V: 100000 }), 12);
    expect(t.eta).toBeLessThan(0.01); // under one per cent, at 100 kV into tungsten
    expect(t.heat / t.beam).toBeGreaterThan(0.99);
    expect(t.beam).toBe(20000); expect(t.xray).toBeCloseTo(162.8, 1);
  });
  it('harder at a higher voltage, and more of it at a higher current', () => {
    expect(xrayTube(160, 100).lambda).toBeLessThan(xrayTube(80, 100).lambda);
    expect(xrayTube(100, 400).xray).toBeCloseTo(xrayTube(100, 100).xray * 4, 6);
  });
  it('runs for seconds, not minutes: its anode fills up', () => {
    const t = xrayTube(100, 200);
    expect(anodeSeconds(t.heat, 300000)).toBeLessThan(20);
    expect(anodeSeconds(t.heat, 300000)).toBeGreaterThan(5);
  });
});

describe('what a beam leaves of itself: Beer-Lambert', () => {
  it('agrees with the book, and halves in a half-value layer', () => {
    expect(through(MU_100KEV.lead!, 0.002)).toBeCloseTo(run('attenuation.exponential', { I0: 1, mu: MU_100KEV.lead!, x: 0.002 }), 12);
    expect(through(MU_100KEV.lead!, halfValue(MU_100KEV.lead!))).toBeCloseTo(0.5, 12);
  });
  it('wants a tenth of a millimetre of lead where it wants a hundred millimetres of water', () => {
    expect(halfValue(MU_100KEV.lead!) * 1000).toBeCloseTo(0.11, 2);
    expect(halfValue(MU_100KEV.water!) * 1000).toBeCloseTo(40.6, 1);
    // (and a thousandth of the beam through about a millimetre of lead: ten half-value layers)
    expect(shieldFor(MU_100KEV.lead!, 0.001)).toBeCloseTo(halfValue(MU_100KEV.lead!) * Math.log2(1000), 9);
  });
});

describe('heat as light: what a thermal camera is built for', () => {
  it('peaks where Wien says, which is why the band is 8 to 14 µm', () => {
    expect(glow(300).peak).toBeCloseTo(run('wien.displacement', { T: 300 }), 15);
    expect(glow(293.15).peak * 1e6).toBeCloseTo(9.88, 2);
    expect(glow(293.15).band).toBe('long-wave infrared');
    // (a filament at 3000 K peaks at a micron, which an eye sees the tail of)
    expect(glow(3000).band).toBe('near infrared');
  });
  it('sees as coarsely as its detectors are big over its lens', () => {
    const c = thermalCam(640, 12, 13);
    expect(c.ifov).toBeCloseTo(12e-6 / 0.013, 12);
    expect(c.spot10).toBeCloseTo(c.ifov * 10000, 9);
    // (the blur a lens cannot beat is 1.22 λ F of length at the array — the f-number alone, whatever the focal length —
    //  so at 10 µm and f/1 a 12 µm pitch is matched to its lens and a 17 µm one is detector-limited)
    expect(c.diffraction / c.ifov).toBeCloseTo(1.02, 2);
    expect(thermalCam(640, 17, 13).diffraction).toBeLessThan(thermalCam(640, 17, 13).ifov);
    expect(thermalCam(640, 12, 25).diffraction / thermalCam(640, 12, 25).ifov).toBeCloseTo(1.02, 2);
    expect(thermalCam(640, 17, 13).fov).toBeGreaterThan(thermalCam(640, 12, 13).fov);
  });
  it('costs a watt to read, not the tens a cooled detector costs', () => {
    expect(camWatts(640)).toBeLessThan(1.5);
    expect(camWatts(640, true)).toBeGreaterThan(6);
  });
});

describe('an interferometer: resolution is travel', () => {
  it('agrees with the book, and a centimetre of path is 1 cm⁻¹', () => {
    const f = ftir(1);
    expect(1 / 0.01).toBeCloseTo(run('ftir.resolution', { opd: 0.01 }) / 100 * 100, 9);
    expect(f.travel).toBeCloseTo(5, 9); // 10 mm of path difference, half of it mirror travel
    expect(ftir(0.25).travel).toBe(ftir(1).travel * 4);
  });
  it('samples on its own laser\'s fringes, so a finer spectrum is more points', () => {
    expect(ftir(1).points).toBeGreaterThan(30000);
    expect(ftir(4).points).toBeCloseTo(ftir(1).points / 4, -1);
  });
});

describe('a lidar: a pulse and its echo', () => {
  it('ranges by the clock, which is the book\'s own law', () => {
    expect(run('lidar.time-of-flight', { t: 1e-6 })).toBeCloseTo(149.896229, 6);
    // (a nanosecond is 150 mm of range)
    expect(run('lidar.time-of-flight', { t: 1e-9 })).toBeCloseTo(0.14989, 4);
  });
  it('gets back what the range equation says, and loses it as the square of the range', () => {
    const o = { Pt: 25, rho: 0.1, apertureMm: 25, eta: 0.85, nepW: 1e-9 };
    const near = lidar({ ...o, R: 50 }), far = lidar({ ...o, R: 100 });
    expect(near.back / far.back).toBeCloseTo(4, 6);
    const A = Math.PI * (0.025 / 2) ** 2;
    expect(far.back).toBeCloseTo(run('lidar.return', { Pt: 25, rho: 0.1, A, eta: 0.85, R: 100 }), 15);
  });
  it('reaches further off a bright target than a dark one, and says how far', () => {
    const dark = lidar({ Pt: 25, rho: 0.05, apertureMm: 25, nepW: 1e-9 });
    const bright = lidar({ Pt: 25, rho: 0.5, apertureMm: 25, nepW: 1e-9 });
    expect(bright.reach / dark.reach).toBeCloseTo(Math.sqrt(10), 6);
    expect(dark.says).toContain('5 % target');
  });
  it('cannot tell apart two things closer than half its pulse', () => {
    expect(pulseResolution(5)).toBeCloseTo(0.749, 3);
    expect(pulseResolution(1)).toBeCloseTo(0.15, 2);
  });
});

describe('each instrument drawn whole, and weighing what its kind says', () => {
  for (const words of ['xraytube kV100 mA200 rotating', 'xraytube kV50 mA20 fixed', 'xraypanel 35x43 pitch150', 'xraypanel 24x30 pitch100',
    'thermalcamera 640 pitch12 f13', 'thermalcamera 160 pitch17 f9', 'ftir res1 DTGS', 'ftir res0.25 MCT', 'lidar 16 rpm600 905', 'lidar 64 rpm1200 1550']) {
    it(`${words}: nothing its inventory lists is left out, and its mass agrees`, () => {
      const d = drawn(words);
      expect(d.faults).toEqual([]);
      expect(d.g).toBeGreaterThan(0);
    });
    // the size the catalogue sells it by is the drawing's own span, worked out from the same figures the drawing is: so a
    // part cannot grow out through its own case unseen (a screen wider than its body, an electronics box through its cover)
    it(`${words}: its drawing spans the size its kind is sold by`, () => {
      const r = resolve(words); if (!r || typeof r === 'string' || !('size' in r) || !r.size) throw new Error(`${words}: no size`);
      const all = new THREE.Box3();
      for (const n of layout(drawn(words).part)) if (n.box) all.union(n.box);
      const got = all.getSize(new THREE.Vector3()).toArray().map((x) => x * 1000);
      for (const i of [0, 1, 2]) expect(Math.abs(got[i]! - r.size[i]!), `${words}: drawn ${got.map((x) => x.toFixed(0)).join(' × ')} against ${r.size.join(' × ')} mm`).toBeLessThanOrEqual(2 + r.size[i]! * 0.02);
    });
  }
  it('a bigger tube is heavier, and a rotating anode heavier than a fixed one', () => {
    expect(tubeKg(100, 400)).toBeGreaterThan(tubeKg(100, 100));
    expect(tubeKg(100, 200, 'rotating')).toBeGreaterThan(tubeKg(100, 200, 'fixed'));
  });
  it('a panel weighs about what its area does, a camera what its lens does', () => {
    expect(panelKg(350, 430)).toBeCloseTo(4.56, 2); // the 35 × 43 cm that replaced the 14 × 17 inch cassette
    expect(camKg(640, 25)).toBeGreaterThan(camKg(160, 9));
  });
  it('a finer spectrometer is a bigger instrument, and a lidar grows by its channels', () => {
    expect(ftirKg(0.25)).toBeGreaterThan(ftirKg(4) * 2);
    expect(lidarKg(16)).toBeCloseTo(0.852, 3); // Velodyne publishes 830 g for the VLP-16
    expect(lidarKg(32)).toBeGreaterThan(lidarKg(16));
  });
});

describe('what each one can do to the person using it, said plainly', () => {
  for (const k of ['xray', 'lidar', 'infrared', 'spectrometer']) {
    it(`${k}: its hazards are named, not hinted at`, () => {
      expect(HAZARDS[k]!.length).toBeGreaterThanOrEqual(2);
      for (const h of HAZARDS[k]!) expect(h.length).toBeGreaterThan(40);
    });
  }
  it('an x-ray tube says that nothing is felt at the dose that matters', () => {
    expect(HAZARDS.xray!.join(' ')).toMatch(/cannot be seen, heard, felt or smelt/);
    expect(HAZARDS.xray!.join(' ')).toMatch(/scatter/);
  });
  it('a lidar says that a class on a label is for the instrument as its maker set it up', () => {
    expect(HAZARDS.lidar!.join(' ')).toMatch(/Class 1/);
    expect(HAZARDS.lidar!.join(' ')).toMatch(/no blink reflex/);
  });
  it('the kinds carry those hazards into what they say about themselves', () => {
    const r = resolve('xraytube kV100 mA200 rotating');
    expect(typeof r === 'object' && r !== null && 'spec' in r ? String(r.spec) : '').toMatch(/no warning at the dose/);
    const l = resolve('lidar 16 rpm600 905');
    expect(typeof l === 'object' && l !== null && 'spec' in l ? String(l.spec) : '').toMatch(/blink/);
  });
});
