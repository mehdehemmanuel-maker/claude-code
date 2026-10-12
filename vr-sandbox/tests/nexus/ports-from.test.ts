// Connectors read off the geometry rather than declared. Twenty-eight parts in this library declare a port by hand
// against nine thousand catalogue sizes, so what matters here is that a *generator* that drills holes gives every size
// it makes its own ports: the rail is tested at two sizes for that reason, not for two examples' sake.

import { describe, expect, it } from 'vitest';
import { use } from '../../src/nexus/parts/components';
import { axesFrom, declared, facesFrom, fit, mates, portsFrom, rests, misdeclared, seat, seats, shaftsFrom, spindle, unnamedHoles } from '../../src/nexus/parts/mate';
import { KINDS } from '../../src/nexus/kinds';
import { linesOf } from '../../src/nexus/kinds/core';
import { HAND_FAMILIES } from '../../src/nexus/parts/families';
import { KITS, makeKit } from '../../src/nexus/parts/kits';
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

  it('a bearing\'s outside seats in a housing at its catalogue outside diameter, exactly', () => {
    // It read ⌀51 against the catalogue's 52 and that was recorded as the drawing being honest about its chamfers.
    // It was not: the reader was reading the chamfer. A chamfer is a *tool's* feature and its absolute size does not
    // shrink with the part — a lead-in is allowed max(0.35 r, 0.5 mm) — and the widest cylindrical run within that of
    // the end is the shaft. With it, three bearings land on their catalogue figures and a ⌀4 dowel is found at all,
    // where before the reader took its chamfer's own flat (⌀2.8) over a run of zero length.
    for (const [words, od] of [['bearing 6205', 52], ['bearing 625', 16], ['bearing 6204', 47]] as const) {
      const biggest = shaftsFrom(use(words)).reduce((a, b) => (a.d > b.d ? a : b));
      expect(+(biggest.d * 1000).toFixed(2), words).toBe(od);
    }
    expect(+(spindle(use('dowel 4x20'))!.d * 1000).toFixed(2)).toBe(4);
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

  it('a turned part\'s faces are its flat rings, and its walls are not faces at all', () => {
    // A lathe is a profile spun about y, so a run of it at one height sweeps a flat ring - which is what a bearing
    // actually sits against - and a run at one radius sweeps a cylinder's wall, which is no face. A 6205 claimed
    // nothing at all before this, which is the fourth time the feature lived in the richer shape.
    const f = facesFrom(use('bearing 6205 2RS'));
    expect(f.every((x) => x.round)).toBe(true);
    expect(f.every((x) => Math.abs(x.n[1]) > 0.999)).toBe(true); // every one looks along its own axis: no wall is a face
    const d = (x: { round?: [number, number] }) => [+(x.round![0] * 2000).toFixed(2), +(x.round![1] * 2000).toFixed(2)];
    expect(f.map(d)).toEqual([[26, 33.95], [26, 33.95], [46.63, 51], [46.63, 51]]); // both rings, both ends, and nothing else
  }, 60000);

  it('a ring in a well is not a seat: a bearing seats on its rings, never on its seal', () => {
    // The first thing the well rule caught is the thing it was written for. A 6205's nitrile seal is drawn 0.217 mm
    // inside its own ring faces, where a real 2RS seal sits, and at 802 mm² it was coming out as the bearing's
    // largest seating face - so a bearing laid on a motor's end bell "rested on its seal". The exposure probe cannot
    // see this, because what holds a recessed face off stands beside it, not over it.
    const f = facesFrom(use('bearing 6205 2RS'));
    expect(f.some((x) => /seal/.test(x.of))).toBe(false);
    expect(facesFrom(use('bearing 625 ZZ')).some((x) => /shield/.test(x.of))).toBe(false); // a steel shield, same well
    const on = mates(use('bearing 6205 2RS'), use('stepper nema17 40')).fits.filter((x) => x.how === 'resting');
    expect(on.length).toBeGreaterThan(0);
    expect(on.every((x) => !/seal/.test(x.says))).toBe(true);
  }, 60000);

  it('two rings meet over the ring they share, and rings that miss say so', () => {
    // A rectangle's spans can only say the smaller of each; two turned faces share exactly the ring they have in
    // common, which is how a bearing sits on a shoulder, so that is what is worked out.
    const a = facesFrom(use('bearing 6205 2RS')), b = facesFrom(use('bearing 625 ZZ'));
    const face = (f: typeof a[number]) => ({ ...f, n: [-f.n[0], -f.n[1], -f.n[2]] as [number, number, number] });
    expect(rests(a[0]!, face(a[0]!))).toMatchObject({ area: a[0]!.area }); // a 6205 on a 6205: its own ring, exactly
    expect(rests(a[0]!, face(b[0]!))).toMatch(/rings that miss each other: 26\.0–34\.0 mm against 6\.0–8\.6 mm/);
    expect(mates(use('bearing 6205 2RS'), use('bearing 625 ZZ')).fits).toEqual([]); // and so nothing between them rests
  }, 60000);

  it('a nut rests on a screw\'s head as well as threading onto it', () => {
    const r = mates(use('nut M5'), use('screw M5x20'));
    expect(r.fits.some((x) => x.how === 'threaded')).toBe(true);
    expect(r.fits.some((x) => x.how === 'resting' && /hex nut rests on/.test(x.says))).toBe(true);
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

// What a part *promises* against what it *draws*. `contracts()` in make/critic.ts pairs two declarations with each
// other — a declared ⌀8 bore meeting a declared ⌀8 shaft passes even if the solid is ⌀10 — and says nothing about
// whether either agrees with its own part. This is that second question, and the answer is held at zero over the
// library the components file draws, because a declaration is the one fact here a drawing can silently contradict.
describe('a declaration against its own drawing', () => {
  it('holds over every part the library draws', () => {
    const words = new Set<string>();
    for (const k of KINDS) { const ls = linesOf(k); for (const i of [0, Math.floor(ls.length / 2), ls.length - 1]) if (ls[i]) words.add(ls[i]!); }
    for (const f of HAND_FAMILIES) for (const e of f.examples) words.add(e);
    let drawn = 0, said = 0; const bad: string[] = [];
    for (const w of [...words].sort()) {
      let p; try { p = use(w); } catch { continue; } // not drawn yet: 833 of 1,118 words, which is its own list
      drawn++; said += declared(p).length;
      for (const m of misdeclared(p)) bad.push(`${w}: ${m.says}`);
    }
    expect(drawn).toBeGreaterThan(250);
    expect(said).toBeGreaterThan(900); // 969 declarations carry a diameter
    expect(bad).toEqual([]);
  }, 120000);

  it('holds a declaration against its own part and not against the assembly', () => {
    // The first run compared every declaration against the whole tree's geometry, so an M8 arm screw matched a chip's
    // 25 µm bond wire two metres away and the robot came back with twelve findings. Whether an M8 screw provides an
    // M8 stud is a fact about the screw, not about where it was put.
    expect(misdeclared(use('robot jarvis'))).toEqual([]);
    const tiny = Math.min(...declared(use('robot jarvis')).map((s) => s.said));
    expect(tiny).toBeGreaterThan(1); // nothing in it is answered by a bond wire
  }, 120000);

  it('answers a studs provider with the studs it passes, not with its own bore', () => {
    // A part that provides studs provides a pattern of studs standing out of it, and a stud is its own part pressed
    // through its flange — so its own rounds are its bore, and holding it to those called a hub's M12 studs ⌀24.
    const car = makeKit(KITS.find((k) => k.name === 'car')!, 'car', 1).part;
    const studs = declared(car).filter((s) => s.kind === 'studs');
    expect(studs.length).toBeGreaterThan(0);
    for (const s of studs) expect(s, s.says).toMatchObject({ ok: true });
  }, 120000);

  it('never compares a chain\'s pitch as a diameter', () => {
    // A chain declares ISO 606's pitch, which is a length along the chain and not a diameter of anything drawn.
    const kart = makeKit(KITS.find((k) => k.name === 'go-kart')!, 'go-kart', 1).part;
    expect(declared(kart).some((s) => s.kind === 'chain')).toBe(false);
  }, 120000);

  it('reads a bent tube\'s own round, so a drive shaft draws a shaft', () => {
    // The feature lives in the richer shape and not in the primitive whose name suggests it, a fifth time: a drive
    // shaft and a stub spindle are both drawn as bent tubes, and reading `cyl` alone said they drew no shaft at all.
    const car = makeKit(KITS.find((k) => k.name === 'car')!, 'car', 1).part;
    for (const s of misdeclared(car)) expect(s.says, s.says).not.toMatch(/draws no shaft at all/);
  }, 120000);

  it('reports the fleet\'s hand-drawn declarations, held to the number', () => {
    // Four causes, all in machines.ts's hand-drawn suspension and drive, and this is the ratchet that keeps them from
    // growing: a hub and its axle both take a shaft diameter as 12 % of the *rim* (55 mm on an 18 in wheel, where a
    // real drive shaft is 28), a hub on a fixed spindle draws no bore at all, a sprocket is drawn as a solid disc,
    // and an engine's output shaft is declared and never drawn. Each is a round of its own; none may be added to.
    const car = makeKit(KITS.find((k) => k.name === 'car')!, 'car', 1).part;
    const ms = misdeclared(car);
    expect(ms.length).toBeLessThanOrEqual(8);
    for (const m of ms) expect(m.says, m.says).toMatch(/⌀54\.864/); // one formula, written twice, declared by four parts
  }, 120000);
});
