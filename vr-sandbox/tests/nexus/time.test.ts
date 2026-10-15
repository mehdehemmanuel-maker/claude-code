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
import { branches, routeInTime, routes, timePower, timeSpectrum } from '../../src/nexus/substrate/lawgraph';
import { dimOf, sameDim } from '../../src/nexus/lang/dimension';

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

// ── the graph in time, and the branches that are not there ─────────────────────────────────────────────────────────
//
// `lawgraph.ts` and `time.ts` were two islands: the graph could say what the book HAS and never what it LACKS, and it
// did not know a law's power of time. These check the join. The point of `branches()` is that its findings are FACTS
// about the graph — a hole it reports is a dimension no law produces, which is checkable here directly — and not an
// opinion about what a book of laws ought to contain.
describe('the law graph in time', () => {
  it('a law that gives a speed sits at time^0, because a speed is dimensionless in natural units', () => {
    const anySpeed = BOOK.filter((l) => sameDim(dimOf(l.output.unit), dimOf('m/s')));
    expect(anySpeed.length, 'the book has laws that give a speed').toBeGreaterThan(0);
    for (const l of anySpeed) expect(timePower(l), `${l.id} gives ${l.output.unit}`).toBe(0);
  });

  it('the spectrum covers every power the book reaches, highest first, and loses no law', () => {
    const spec = timeSpectrum();
    const powers = spec.map((s) => s.power);
    expect(powers, 'the spectrum runs downward with no power skipped').toEqual(
      [...powers].sort((a, b) => b - a));
    for (let i = 1; i < powers.length; i++) expect(powers[i - 1]! - powers[i]!).toBe(1);
    expect(spec.reduce((n, s) => n + s.laws.length, 0), 'every law lands at exactly one power').toBe(BOOK.length);
  });

  it('a route reads as a walk through the spectrum, each step carrying its power', () => {
    const chain = routes('N', ['kg', 'm/s^2'])[0];
    expect(chain, 'the book can make a force from a mass and an acceleration').toBeTruthy();
    const walk = routeInTime(chain!);
    expect(walk.length).toBe(chain!.length);
    for (const s of walk) {
      expect(s.power, `${s.id} has an integer power of time`).toBe(Math.round(s.power));
      expect(s.says).toContain(`time^${s.power}`);
    }
  });

  it("every 'needs what nothing gives' is exactly that: no law in the book produces that dimension", () => {
    const holes = branches().filter((b) => b.kind === 'needs what nothing gives');
    expect(holes.length, 'the book does have quantities it only ever measures').toBeGreaterThan(0);
    for (const h of holes) {
      const d = dimOf(h.at);
      const makers = BOOK.filter((l) => sameDim(dimOf(l.output.unit), d));
      expect(makers.map((l) => l.id), `${h.at}: ${h.says}`).toEqual([]);
      for (const id of h.laws) {
        const l = lawById(id);
        expect(l.inputs.some((p) => sameDim(dimOf(p.unit), d)), `${id} is listed as reading a ${h.at}`).toBe(true);
      }
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

  it('a hole in the spectrum is a power with no law between two that have them', () => {
    const spec = timeSpectrum(), empty = spec.filter((s) => !s.laws.length);
    const reported = branches().filter((b) => b.kind === 'no power of time');
    expect(reported.length, 'one finding per empty power').toBe(empty.length);
    for (const s of empty) {
      expect(spec.some((o) => o.power > s.power && o.laws.length), `the book reaches above time^${s.power}`).toBe(true);
      expect(spec.some((o) => o.power < s.power && o.laws.length), `and below time^${s.power}`).toBe(true);
    }
  });
});
