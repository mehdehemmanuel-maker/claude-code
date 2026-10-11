// Connectors read off the geometry rather than declared. Twenty-eight parts in this library declare a port by hand
// against nine thousand catalogue sizes, so what matters here is that a *generator* that drills holes gives every size
// it makes its own ports: the rail is tested at two sizes for that reason, not for two examples' sake.

import { describe, expect, it } from 'vitest';
import { use } from '../../src/nexus/parts/components';
import { axesFrom, facesFrom, fit, mates, portsFrom, rests, seat, seats, shaftsFrom, spindle, unnamedHoles } from '../../src/nexus/parts/mate';
import type { Port } from '../../src/nexus/parts/kits';

const mirror = (p: Port): Port => ({ ...p, sex: p.sex === 'holes' ? 'threads' : 'holes', n: [-p.n[0], -p.n[1], -p.n[2]], pattern: p.pattern.map(([x, y]) => [-x, y] as [number, number]) });

describe('ports read off a part\'s own drilled holes', () => {
  it('finds the rail\'s mounting pattern at every size the generator makes', () => {
    for (const words of ['rail MGN12 L240', 'rail MGN9 L160', 'rail MGN15 L300']) {
      const ports = portsFrom(use(words));
      expect(ports.length, words).toBeGreaterThanOrEqual(2);
      for (const p of ports) {
        expect(p.pattern.length, `${words} ${p.name}`).toBeGreaterThanOrEqual(2); // two holes fix a turn; one does not
        expect(p.t).toBeGreaterThan(0);
        expect(Math.hypot(...p.n)).toBeCloseTo(1, 6); // its face points somewhere
        expect(Math.abs(p.n[0] * p.u[0] + p.n[1] * p.u[1] + p.n[2] * p.u[2])).toBeCloseTo(0, 6); // across its own normal
      }
    }
  }, 60000);

  it('reads the same pattern every run, so a derived port is a fact and not a sample', () => {
    const a = portsFrom(use('rail MGN12 L240')), b = portsFrom(use('rail MGN12 L240'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 60000);

  it('a derived port mates with its own mirror, so the existing machinery takes it unchanged', () => {
    const p = portsFrom(use('rail MGN12 L240'))[0]!;
    expect(fit(p, mirror(p)), p.name).not.toBeTypeOf('string');
  }, 60000);

  it('a counterbore is one hole, not two', () => {
    // A seat and the hole through it share an axis. Read apart they came out as two patterns of different sizes on one
    // face, and only one of those is something you can bolt to.
    const ports = portsFrom(use('rail MGN12 L240'));
    const byFace = new Map<string, number>();
    for (const p of ports) { const k = `${p.n.map((x) => x.toFixed(2)).join(',')}|${p.pattern.length}`; byFace.set(k, (byFace.get(k) ?? 0) + 1); }
    for (const [k, n] of byFace) expect(n, `two ports of one count on one face: ${k}`).toBe(1);
  }, 60000);

  it('a hole says which thread it is cut for, rather than being guessed from its radius', () => {
    // The hot end's nozzle thread is drawn at its root diameter, so no reading of the radius calls it M6. It says so.
    const ports = portsFrom(use('heatblock mk8'));
    const unnamed = unnamedHoles(use('heatblock mk8'));
    // Its heater bore and thermistor well are holes for no screw: they are allowed to be unnamed and are not faults.
    expect(unnamed.length).toBeLessThanOrEqual(3);
    expect(ports.every((p) => /^M[\d.]+$/.test(p.thread))).toBe(true);
  }, 60000);

  it('parts with no drilled pattern claim none', () => {
    for (const words of ['screw M5x20', 'nut M5', 'bolt M8x30']) expect(portsFrom(use(words)), words).toEqual([]);
  }, 60000);
});

describe('bores read off a part\'s own turned profiles', () => {
  it('the seat it derives is the bore the part is sold by', () => {
    // The check that makes this worth having: a 6205 is sold as 25 x 52 x 15 and a GT2 B5 by its 5 mm bore, so the
    // derived seat can be held against the catalogue rather than against anyone's opinion of the geometry.
    for (const [words, mm] of [['bearing 6205', 25], ['bearing 625', 5], ['bearing 6204', 20], ['pulley GT2 20T B5', 5]] as [string, number][]) {
      const s = seat(use(words));
      expect(s, words).not.toBeNull();
      expect(+(s!.d * 1000).toFixed(2), `${words} seat`).toBeCloseTo(mm, 1);
    }
  }, 60000);

  it('a shaft of that size seats, and one too big is refused with the number', () => {
    const s = seat(use('bearing 6205'))!;
    expect(seats(s, 25)).toMatchObject({ mm: 25, clearance: 0 });
    expect(seats(s, 30)).toMatch(/does not enter.*5 mm too big/);
    expect(seats(s, 20)).toMatch(/loose.*not a seat/);
  }, 60000);

  it('a bearing\'s bore is the inner ring\'s, not its outer ring\'s raceway', () => {
    // "the biggest bore" was the first rule and it named the 6205's 43.05 mm outer raceway, which is a real inner
    // diameter and not the seat. The part's own axis, then the narrowest way through it, is what names the seat.
    const all = axesFrom(use('bearing 6205'));
    expect(Math.max(...all.map((a) => a.d * 1000))).toBeGreaterThan(40); // the raceway is still found
    expect(seat(use('bearing 6205'))!.d * 1000).toBeCloseTo(25, 1); // and is not mistaken for the seat
  }, 60000);
});

describe('shafts, but only the ends that are free to enter something', () => {
  it('names the shaft a part is driven or held by, at the size it is sold by', () => {
    // Both of these are unambiguous in the catalogue: a NEMA 17 turns a 5 mm shaft, and an M5 screw's shank is 5 mm.
    const motor = spindle(use('stepper nema17 34'));
    expect(motor, 'a NEMA 17 has an output shaft').not.toBeNull();
    expect(+(motor!.d * 1000).toFixed(2)).toBeCloseTo(5, 1);
    expect(motor!.of).toMatch(/shaft/);

    const screw = spindle(use('screw M5x20'));
    expect(+(screw!.d * 1000).toFixed(2)).toBeCloseTo(5, 1); // a screw's shank is a shaft
  }, 60000);

  it('a bearing\'s outside is a cylinder that seats in a housing, at its catalogue outside diameter', () => {
    // 6205 is 25 x 52 x 15. Drawn with its chamfers the outer ring reads a touch under 52, which is the drawing being
    // honest about a chamfer rather than the reader being wrong.
    const biggest = shaftsFrom(use('bearing 6205')).reduce((a, b) => (a.d > b.d ? a : b));
    expect(biggest.d * 1000).toBeGreaterThan(50);
    expect(biggest.d * 1000).toBeLessThanOrEqual(52);
  }, 60000);

  it('a cylinder buried in its own part is not a shaft', () => {
    // The round before this read every nested cylinder as one, so a 6205's cage came out as eight shafts of 1.78 mm
    // and a stepper's as twelve. Nothing that small is free in either.
    for (const words of ['bearing 6205', 'stepper nema17 34']) {
      const tiny = shaftsFrom(use(words)).filter((a) => a.d * 1000 < 2.5);
      expect(tiny, `${words}: a cage element is not a shaft`).toEqual([]);
    }
  }, 60000);

  it('a shaft it finds seats in a bore of its own size', () => {
    const motor = spindle(use('stepper nema17 34'))!, pulley = seat(use('pulley GT2 20T B5'))!;
    // the pulley this motor drives: a GT2 with a 5 mm bore onto a 5 mm shaft, which is the whole point of the pair
    expect(seats(pulley, +(motor.d * 1000).toFixed(3))).toMatchObject({ mm: 5, clearance: 0 });
  }, 60000);
});

describe('how two parts go together, over both kinds of connector at once', () => {
  it('a nut threads onto a bolt', () => {
    // The most ordinary mate there is, and neither system could express it: a nut's bore is drawn at its thread's root
    // (4.134 for an M5) and a screw's shank is 5.00, so a plain clearance test refuses it as 0.866 mm of interference.
    // Threads interlock; they are *meant* to interfere. Getting here also needed the real pitch table - a guessed
    // nominal/8 put M5's pitch at 0.625 where ISO 261's coarse pitch is 0.8, and missed the nut's own bore.
    const r = mates(use('nut M5'), use('screw M5x20'));
    expect(r.fits.filter((f) => f.how === 'threaded')).toHaveLength(1);
    expect(r.fits.find((f) => f.how === 'threaded')!.thread).toBe('M5');
  }, 60000);

  it('a motor and the pulley it drives find their own seat', () => {
    const r = mates(use('stepper nema17 34'), use('pulley GT2 20T B5'));
    const five = r.fits.find((f) => f.how === 'seated' && f.mm === 5);
    expect(five, 'a 5 mm shaft in a 5 mm bore').toBeDefined();
    expect(five!.clearance).toBe(0);
  }, 60000);

  it('parts that do not go together say so with the number', () => {
    const r = mates(use('bearing 6205'), use('pulley GT2 20T B5'));
    expect(r.fits).toEqual([]); // a 13 mm pulley flange is nothing a 25 mm bearing bore seats
    expect(r.nearly.join(' ')).toMatch(/loose|too big/);
  }, 60000);

  it('alike features are counted once', () => {
    // An MGN12 rail has forty bores of two sizes. Forty answers to one question is not an answer.
    const r = mates(use('rail MGN12 L240'), use('screw M3x10'));
    expect(r.fits.length + r.nearly.length).toBeLessThan(30);
  }, 60000);
});

describe('flat faces, which is what a coincident mate is made of', () => {
  it('a NEMA 17\'s biggest face is its own mounting face', () => {
    // A NEMA 17 is 42.3 mm square by its standard, and that face is what it bolts to the world by.
    const f = facesFrom(use('stepper nema17 34'))[0]!;
    expect(f.w * 1000).toBeCloseTo(42.3, 0);
    expect(f.h * 1000).toBeCloseTo(42.3, 0);
  }, 60000);

  it('a rolled section\'s faces are its own profile\'s, and as long as the section is', () => {
    // Boxes alone found none at all on any of these - every one is a prism - which is the third time running that the
    // feature lived in the richer shape. A T-slot's outer surface is interrupted by its slots, so each flat run is a
    // face of its own: 13.8 mm on a 2040, not 20.
    const f = facesFrom(use('extrusion 2040 length 300'));
    expect(f.length).toBeGreaterThan(10);
    expect(f[0]!.h * 1000).toBeCloseTo(300, 0); // as long as it was asked for
    expect(f[0]!.w * 1000).toBeLessThan(20); // a flat between slots, not the whole 20 mm side
  }, 60000);

  it('a turned part claims no faces, and says so by having none', () => {
    // A lathe's flat annulus is a real seating face and its curved runs are not; telling them apart is its own piece
    // of work, so a bearing offers nothing here rather than something wrong.
    expect(facesFrom(use('bearing 6205'))).toEqual([]);
  }, 60000);

  it('faces must look at each other, and share more than a corner', () => {
    const f = facesFrom(use('heatblock mk8'));
    const up = f.find((x) => x.n[1] > 0.9)!, down = f.find((x) => x.n[1] < -0.9)!, side = f.find((x) => x.n[0] > 0.9)!;
    expect(rests(up, down)).toMatchObject({ area: expect.any(Number) });
    expect(rests(up, side)).toMatch(/90° apart, not opposed/);
  }, 60000);

  it('resting is a mate like any other', () => {
    const r = mates(use('heatblock mk8'), use('heatblock mk8'));
    expect(r.fits.some((x) => x.how === 'resting')).toBe(true);
  }, 60000);
});
