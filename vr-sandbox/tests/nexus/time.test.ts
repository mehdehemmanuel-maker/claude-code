// The one law, and what the other 252 become beside it.
//
// These tests divide into two kinds. The first kind checks relativity, which is not this project's to decide: the
// numbers are the standard ones and a wrong line here is a wrong line about the world. The second kind checks the
// REFRAME — that a reading cannot write — and that one is the whole architectural claim in a single assertion.
import { describe, expect, it } from 'vitest';
import {
  CONVERSIONS, LIGHT, asTime, apart, bookInTime, elapse, inTime, rate, readAll, sense, speedOf, spacetimeSplit,
  type Worldline,
} from '../../src/nexus/substrate/time';
import { BOOK, lawById } from '../../src/nexus/book';
import {
  branches, feedEdges, feeds, graphSummary, kinshipFeeds, molesOf, placeOf, calculate, timePower, timeTree, timeTreeLines,
} from '../../src/nexus/substrate/time';
import { breakdown, measured } from '../../src/nexus/substrate/record';
import { KINSHIP } from '../../src/nexus/book/principles';
import { dimOf, dimText, sameDim } from '../../src/nexus/lang/dimension';

const at = (id: string, v: [number, number, number] = [0, 0, 0]): Worldline => ({ id, tau: 0, at: [0, 0, 0], through: v });

describe('the one law', () => {
  it('a clock at rest runs at exactly one second per second', () => {
    expect(rate(0)).toBe(1);
    expect(elapse([at('still')], 10)[0]!.tau).toBeCloseTo(10, 12);
  });

  it('at c, time stops — exactly, not nearly', () => {
    expect(rate(LIGHT)).toBe(0);
    const photon = at('light', [LIGHT, 0, 0]);
    const after = elapse([photon], 1e6)[0]!;
    expect(after.tau).toBe(0);
    // it crossed 10^6 light-seconds of space and aged by nothing at all
    expect(after.at[0]).toBeCloseTo(LIGHT * 1e6, 0);
  });

  it('past c there is no worldline, and it refuses rather than returning a number', () => {
    expect(() => rate(LIGHT * 1.0001)).toThrow(/past c/);
  });

  it('the dilation is the standard one at the textbook speeds', () => {
    // gamma = 1/sqrt(1-b^2): at 0.6c gamma is exactly 5/4, at 0.8c exactly 5/3 (the 3-4-5 triangles)
    expect(1 / rate(0.6 * LIGHT)).toBeCloseTo(1.25, 12);
    expect(1 / rate(0.8 * LIGHT)).toBeCloseTo(5 / 3, 12);
    // and at a speed a person can have, the effect is there and tiny: a 300 m/s airliner
    expect(1 - rate(300)).toBeCloseTo(5.008e-13, 15);
  });

  it('everything moves through spacetime at exactly c, at every speed', () => {
    for (const b of [0, 1e-9, 0.1, 0.5, 0.6, 0.9, 0.99, 0.999999, 1]) {
      const s = spacetimeSplit(at('x', [b * LIGHT, 0, 0]));
      expect(s.magnitude / LIGHT, `at ${b}c`).toBeCloseTo(1, 12);
    }
    // at rest the whole of it is the clock; at c none of it is
    expect(spacetimeSplit(at('still')).throughTime).toBe(LIGHT);
    expect(spacetimeSplit(at('still')).throughSpace).toBe(0);
    expect(spacetimeSplit(at('light', [LIGHT, 0, 0])).throughTime).toBe(0);
    expect(spacetimeSplit(at('still')).says).toMatch(/all of its motion is through time/);
  });

  it('two worldlines over one stretch of coordinate time do not live the same time', () => {
    const [home, away] = elapse([at('home'), at('away', [0.6 * LIGHT, 0, 0])], 100);
    expect(home!.tau).toBeCloseTo(100, 9);
    expect(away!.tau).toBeCloseTo(80, 9);   // 100 * sqrt(1-0.36) = 80
    const d = apart(home!, away!);
    expect(d.drift).toBeCloseTo(20, 9);
    expect(d.says).toMatch(/home has lived 20\.00 s longer/);
    // and the traveller really went somewhere: 0.6c for 100 s of the home clock
    expect(speedOf(away!)).toBeCloseTo(0.6 * LIGHT, 6);
    expect(away!.at[0]).toBeCloseTo(0.6 * LIGHT * 100, 0);
  });
});

describe('everything is a power of time', () => {
  it('the conversions are four constants set to one, each named', () => {
    expect(CONVERSIONS.map((c) => c.what)).toEqual(['length', 'mass', 'temperature', 'current']);
    for (const c of CONVERSIONS) expect(c.src.length, c.by).toBeGreaterThan(20);
  });

  it('a metre is a time and a kilogram is a rate', () => {
    expect(asTime('m').power).toBe(1);
    expect(asTime('s').power).toBe(1);
    expect(asTime('kg').power).toBe(-1);
    expect(asTime('K').power).toBe(-1);
    expect(asTime('J').power).toBe(-1);   // E = hbar omega: an energy IS a frequency
  });

  it('A SPEED IS DIMENSIONLESS — there is no such thing as a speed, only a fraction of c', () => {
    expect(asTime('m/s').power).toBe(0);
    expect(asTime('m/s').says).toMatch(/pure number/);
    expect(asTime('m/s').says).toMatch(/no units at all once c and/);
  });

  it('action is dimensionless too: it is a count of ħ', () => {
    expect(asTime('J s').power).toBe(0);
    // which is why the one law of physics is about action: a stationary action is a pure number being extremal,
    // with no unit to be extremal in. Energy times time is the thing time itself is counted against.
    expect(inTime(dimOf('J')) + inTime(dimOf('s'))).toBe(0);
  });

  it('every law in the book lands on an integer power of time, and nothing is left over', () => {
    const groups = bookInTime();
    expect(groups.reduce((n, g) => n + g.laws.length, 0)).toBe(BOOK.length);
    for (const g of groups) expect(Number.isInteger(g.power), `time^${g.power}`).toBe(true);
    const powers = groups.map((g) => g.power);
    expect(Math.min(...powers)).toBeGreaterThanOrEqual(-6);
    expect(Math.max(...powers)).toBeLessThanOrEqual(6);
    // the commonest is an inverse time — an energy, a temperature, a rate: time's own conserved quantity
    const biggest = groups.slice().sort((a, b) => b.laws.length - a.laws.length)[0]!;
    expect(biggest.power).toBe(-1);
  });

  it('the reduction agrees with doing it by hand on a law nobody arranged', () => {
    const l = lawById('newton.second');          // F = m a, N = kg m s^-2
    expect(inTime(dimOf(l.output.unit))).toBe(-2);
    expect(-1 + 1 - 2).toBe(-2);                 // -kg + m + s, which is what inTime is
  });
});

describe('a law demoted to a sensor', () => {
  it('reads a number out of a state, and keeps its citation', () => {
    const r = sense(lawById('newton.second'), { m: 2, a: 3 }, 41.5);
    expect(r.value).toBeCloseTo(6, 12);
    expect(r.unit).toBe('N');
    expect(r.power).toBe(-2);
    expect(r.tau).toBe(41.5);
    expect(r.cites).toMatch(/Young|Freedman|University Physics/);
    expect(r.says).toMatch(/reads 6\.00000 N \(time\^-2\) at tau = 41\.5 s/);
  });

  it('A READING CHANGES NOTHING — the whole reframe, as one assertion', () => {
    // the state is the only thing that is real; the book is a shelf of instruments pointed at it
    const state = { m: 2, a: 3, v: 10, r: 0.5, T: 300, P: 1000, L: 1.2, A: 0.01, E: 2e11, I: 4, R: 2 };
    const before = JSON.stringify(state);
    const readings = readAll(state, 7);
    expect(readings.length, 'some instrument must be able to read this state').toBeGreaterThan(0);
    expect(JSON.stringify(state), 'no instrument may write to the state it reads').toBe(before);
    // and nothing a Reading carries is an address: there is nowhere for it to put anything
    for (const r of readings) expect(Object.keys(r)).not.toContain('at');
  });

  it('an instrument out of its range says so, about itself', () => {
    const rolling = BOOK.find((l) => l.id === 'rolling.resistance')!;
    const ok = sense(rolling, { Crr: 0.01, N: 1000 }, 0);
    expect(ok.refused).toBeNull();
    expect(ok.value).toBeCloseTo(10, 9);
    const silly = sense(rolling, { Crr: 50, N: 1000 }, 0);   // a tyre in sand is 0.3; 50 is not a surface
    expect(silly.refused, 'the domain must catch it').toBeTruthy();
    expect(silly.says).toMatch(/a fact about the instrument's range, not about the world/);
  });

  it('an instrument with nothing to read says that, rather than returning zero', () => {
    const r = sense(lawById('newton.second'), { m: 2 }, 0);
    expect(r.value).toBeNull();
    expect(r.says).toMatch(/had nothing to read/);
  });

  it('readAll offers only the instruments this state can actually drive', () => {
    const few = readAll({ m: 1 }, 0);
    for (const r of few) {
      const l = BOOK.find((x) => x.id === r.instrument)!;
      expect(l.inputs.every((p) => p.sym === 'm'), `${l.id} asked for more than was given`).toBe(true);
    }
  });

  it('every reading carries the time it was taken at, because a number with no clock is not a measurement', () => {
    for (const r of readAll({ m: 2, a: 3 }, 12.25)) expect(r.tau).toBe(12.25);
  });
});


// ── one system: the tree rooted in time, the derived feed graph, and the calculator ───────────────────────────────
//
// Run 8i merged `substrate/lawgraph.ts` into this file's subject and deleted it. These tests hold the merge honest.
// The theme throughout: every level of the tree and every edge of the graph is DERIVED, so each test re-derives the
// thing independently and checks the system agrees — rather than checking the sentence the system prints.
describe('the tree rooted in time', () => {
  it('a law that gives a speed sits at time^0, because a speed is dimensionless in natural units', () => {
    const anySpeed = BOOK.filter((l) => sameDim(dimOf(l.output.unit), dimOf('m/s')));
    expect(anySpeed.length, 'the book has laws that give a speed').toBeGreaterThan(0);
    for (const l of anySpeed) expect(timePower(l), `${l.id} gives ${l.output.unit}`).toBe(0);
  });

  it('every law lands on exactly one leaf, and the trunks descend one power at a time', () => {
    const t = timeTree();
    const seen = t.trunks.flatMap((tr) => tr.limbs.flatMap((f) => f.twigs.flatMap((w) => w.laws.map((l) => l.id))));
    expect(seen.length, 'no law is dropped and none is counted twice').toBe(BOOK.length);
    expect(new Set(seen).size).toBe(BOOK.length);
    const powers = t.trunks.map((x) => x.power);
    expect(powers, 'the trunks run downward').toEqual([...powers].sort((a, b) => b - a));
    for (let i = 1; i < powers.length; i++) expect(powers[i - 1]! - powers[i]!, 'no power skipped').toBe(1);
    for (const tr of t.trunks) {
      expect(tr.laws).toBe(tr.limbs.reduce((n, f) => n + f.laws, 0));
      for (const f of tr.limbs) {
        expect(f.twigs.length, `${tr.power}/${f.si} has at least one shape of math`).toBeGreaterThan(0);
        // the face IS the dimension, so every law on it must actually have that dimension and that power
        for (const w of f.twigs) for (const l of w.laws) {
          expect(dimText(dimOf(l.unit))).toBe(f.si);
          expect(inTime(dimOf(l.unit))).toBe(tr.power);
        }
      }
    }
  });

  it('the mole is named as the reduction’s one limit, never quietly absorbed', () => {
    const t = timeTree();
    // c, h-bar and k_B convert between physical dimensions. A mole is a COUNT, and Avogadro's number is a
    // definition, not a conversion — so a law carrying moles reduces only up to that count. Every one is listed.
    const carries = BOOK.filter((l) => molesOf(l.output.unit) !== 0).map((l) => l.id);
    expect([...t.carriesACount].sort()).toEqual([...carries].sort());
    expect(t.says.join(' ')).toContain('mole is a count');
  });

  it('placeOf gives the path from time down to one law, and it agrees with the tree', () => {
    for (const id of ['stress.axial', 'newton.second', 'arrhenius', 'inertia.disc']) {
      const l = lawById(id), p = placeOf(l);
      expect(p.path[0]).toBe('time');
      expect(p.path[1]).toBe(`time^${timePower(l)}`);
      expect(p.path[2]).toBe(dimText(dimOf(l.output.unit)));
      expect(p.path[4]).toBe(id);
      const trunk = timeTree().trunks.find((t) => t.power === p.power)!;
      const face = trunk.limbs.find((f) => f.si === p.path[2])!;
      expect(face.twigs.some((w) => w.laws.some((x) => x.id === id)), `${id} is on the twig its path names`).toBe(true);
    }
  });

  it('the tree prints with time at the root', () => {
    const lines = timeTreeLines();
    expect(lines[0]).toBe('TIME — the one law');
    for (const tr of timeTree().trunks) expect(lines.some((l) => l.startsWith(`time^${tr.power} ·`))).toBe(true);
  });
});

describe('the feed graph, derived', () => {
  it('a feed is exactly a port of the right dimension, and the edge names that port', () => {
    const edges = feedEdges();
    expect(edges.length, 'the dimensions support far more edges than anyone wrote by hand').toBeGreaterThan(1000);
    for (const e of edges.slice(0, 200)) {
      const a = lawById(e.from), b = lawById(e.to);
      const port = b.inputs.find((p) => p.sym === e.port)!;
      expect(port, `${e.to} has a port ${e.port}`).toBeTruthy();
      expect(sameDim(dimOf(port.unit), dimOf(a.output.unit)), `${e.from} → ${e.to}`).toBe(true);
      expect(e.power).toBe(inTime(dimOf(a.output.unit)));
    }
  });

  it('no law feeds itself, and feeds() agrees with the edge list', () => {
    for (const l of BOOK.slice(0, 40)) expect(feeds(l, l)).toBeNull();
    const edges = feedEdges();
    const pairs = new Set(edges.map((e) => `${e.from}>${e.to}`));
    for (const a of BOOK.slice(0, 25)) for (const b of BOOK.slice(0, 25)) {
      if (a.id === b.id) continue;
      expect(!!feeds(a, b), `${a.id} → ${b.id}`).toBe(pairs.has(`${a.id}>${b.id}`));
    }
  });

  it('kinship is a DIFFERENT relation from feeding, and the check says which edges are both', () => {
    const k = kinshipFeeds();
    expect(k.length).toBe(KINSHIP.length);
    // This is the Run 8h finding, kept as a test so the two relations cannot be merged again by accident: most of
    // the written kinship is NOT a port-feed. `fick.diffusion → diffusion.erf` is "Fick's law, conserved
    // everywhere, BECOMES this law" — a derivation, not a hand-off of a value.
    const both = k.filter((x) => x.alsoFeeds);
    expect(both.length, 'some kinship edges do also feed').toBeGreaterThan(0);
    expect(both.length, 'but most do not: they are derivations, which is why they are written by hand').toBeLessThan(k.length);
    for (const x of k) {
      expect(x.alsoFeeds).toBe(!!feeds(lawById(x.from), lawById(x.to)));
      expect(x.says).toContain(x.alsoFeeds ? 'the dimensions agree' : 'kinship only');
    }
  });
});

describe('the law calculator', () => {
  it('runs a chain and returns a record whose breakdown reaches the measurements', () => {
    const r = calculate('N', { mass: measured('mass', 2, 'kg', 'a scale'), accel: measured('acceleration', 3, 'm/s^2', 'a rig') });
    expect(r.refused).toBeNull();
    expect(r.got, 'it computed, not merely found a route').toBeTruthy();
    expect(r.got!.value).toBeCloseTo(6, 10);
    expect(r.chain.map((c) => c.law)).toContain('newton.second');
    const tree = breakdown(r.got!).join('\n');
    expect(tree, 'the record carries what it rests on').toContain('a scale');
    expect(tree).toContain('a rig');
  });

  it('computes a real chain-drive speed, checkable by hand', () => {
    // 38 teeth at 12.7 mm pitch = 0.4826 m a revolution; 1500 rpm = 25 rev/s; 0.4826 x 25 = 12.065 m/s.
    const r = calculate('m/s', {
      z: measured('sprocket teeth', 38, '-', 'the sprocket'),
      pitch: measured('pitch', 0.0127, 'm', 'ISO 606'),
      rpm: measured('speed', 1500, 'rpm', 'a tacho'),
    }, undefined, 3);
    expect(r.chain.map((c) => c.law)).toEqual(['chain.speed']);
    expect(r.got!.value).toBeCloseTo(12.065, 3);
    expect(r.stretched, 'every port was filled by something named for it').toEqual([]);
  });

  it('will NOT bind a dimensionless port by dimension: a Froude number is not a count of teeth', () => {
    // The fault this fixes, found by running it: every ratio in the book is `-`, so binding dimensionless ports by
    // dimension matches all of them to all of them. Offered a Froude number where teeth are wanted, the chain-speed
    // law must not fire — and what DOES fire must report the port it stretched.
    const r = calculate('m/s', {
      froude: measured('Froude number', 0.5, '-', 'a gait'),
      pitch: measured('pitch', 0.0127, 'm', 'ISO 606'),
      rpm: measured('speed', 1500, 'rpm', 'a tacho'),
    }, undefined, 3);
    expect(r.chain.map((c) => c.law), 'the ratio was not read as a tooth count').not.toContain('chain.speed');
    if (r.got) expect(r.stretched.length, 'whatever it did instead, it says what it stretched').toBeGreaterThan(0);
  });

  it('reports what it bound to what, so a dimensional coincidence cannot pass as a result', () => {
    const r = calculate('m/s', { pitch: measured('pitch', 0.0127, 'm', 'ISO 606'), rpm: measured('speed', 1500, 'rpm', 'a tacho') }, undefined, 2);
    for (const c of r.chain) {
      expect(c.bound.length, `${c.law} records a binding for every port`).toBe(lawById(c.law).inputs.length);
      for (const b of c.bound) expect(typeof b.byName).toBe('boolean');
    }
    // anything bound under a different name appears in `stretched`, verbatim, and in what it says
    for (const s of r.stretched) expect(r.says).toContain(s);
  });

  it('refuses to guess between two records that could fill one port and disagree', () => {
    const r = calculate('Pa', {
      T1: measured('temperature', 300, 'K', 'a probe'),
      T2: measured('temperature', 900, 'K', 'another probe'),
      n: measured('amount', 2, 'mol', 'a balance'),
      V: measured('volume', 0.01, 'm^3', 'a flask'),
    });
    expect(r.got).toBeNull();
    expect(r.refused).toContain('Name which one, rather than have it pick');
    expect(r.refused).toMatch(/T1|T2/);
  });

  it('says plainly when no chain exists, and does not blame an unrelated ambiguity for it', () => {
    const r = calculate('kg', { x: measured('a length', 2, 'm', 'a ruler') }, undefined, 3);
    expect(r.got).toBeNull();
    expect(r.refused, 'the real reason leads').toMatch(/^no chain of at most 3 laws/);
  });
});

describe('what the book lacks', () => {
  it("every 'needs what nothing gives' is exactly that: no law in the book produces that dimension", () => {
    const holes = branches().filter((b) => b.kind === 'needs what nothing gives');
    expect(holes.length, 'the book does have quantities it only ever measures').toBeGreaterThan(0);
    for (const h of holes) {
      const d = dimOf(h.at);
      expect(BOOK.filter((l) => sameDim(dimOf(l.output.unit), d)).map((l) => l.id), h.says).toEqual([]);
      for (const id of h.laws) expect(lawById(id).inputs.some((p) => sameDim(dimOf(p.unit), d)), `${id} reads a ${h.at}`).toBe(true);
    }
  });

  it("every 'gives what nothing needs' is a real dead end, and the law named does give it", () => {
    for (const b of branches().filter((x) => x.kind === 'gives what nothing needs')) {
      const d = dimOf(b.at);
      expect(BOOK.filter((l) => l.inputs.some((p) => sameDim(dimOf(p.unit), d))).map((l) => l.id)).toEqual([]);
      for (const id of b.laws) expect(sameDim(dimOf(lawById(id).output.unit), d), `${id} gives a ${b.at}`).toBe(true);
    }
  });

  it('where units alone force the missing law, the finding carries it instead of only naming the gap', () => {
    const forced = branches().filter((b) => b.kind === 'needs what nothing gives' && b.forced);
    expect(forced.length, 'at least one gap is closed by Rayleigh from the book’s own quantities').toBeGreaterThan(0);
    for (const f of forced) {
      expect(f.forced).toMatch(/∝/);
      expect(f.says).toContain('Units alone force a candidate');
    }
  });

  it("an 'alone' finding means the derived graph really does not touch that law", () => {
    for (const b of branches().filter((x) => x.kind === 'alone')) {
      const l = lawById(b.at);
      expect(BOOK.some((o) => feeds(o, l)), `${b.at} is fed by nothing`).toBe(false);
      expect(BOOK.some((o) => feeds(l, o)), `${b.at} feeds nothing`).toBe(false);
    }
  });

  it('the summary agrees with the tree and the graph it summarises', () => {
    const g = graphSummary(), t = timeTree();
    expect(g.laws).toBe(BOOK.length);
    expect(g.trunks).toBe(t.trunks.length);
    expect(g.limbs).toBe(t.trunks.reduce((n, x) => n + x.limbs.length, 0));
    expect(g.derivedEdges).toBe(feedEdges().length);
    expect(g.writtenKinship).toBe(KINSHIP.length);
    expect(g.kinshipAlsoFeeds).toBe(kinshipFeeds().filter((x) => x.alsoFeeds).length);
    expect(g.derivedEdges, 'the derived graph is orders of magnitude bigger than what was written').toBeGreaterThan(g.writtenKinship * 100);
  });
});
