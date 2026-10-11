// The robot that runs the works: what it reaches, what it orders, and what it still cannot do.
//
// The checks that matter are the honest ones. A tender that claims it ordered something, or that claims it can strike
// an arc, is worse than no tender at all — so there are tests that it says it cannot pay, that every operation it
// hands to a person carries the reason, and that a station nobody's rail faces is named rather than quietly counted.

import { describe, expect, it } from 'vitest';
import { aislesOf, offRail, orderFor, runText, runWorks, tendWords, tendWorks, tends, worksUnder, throwAt, layWorks } from '../../src/nexus/works';

const IDS = worksUnder(3000).ids;

describe('where the robot can get to', () => {
  it('a rail is laid down an aisle, and an aisle is a real gap between two rows', () => {
    const f = layWorks(IDS), aisles = aislesOf(f);
    expect(aisles.length).toBeGreaterThan(0);
    for (const z of aisles) expect(z).toBeGreaterThan(0);
    // every aisle is inside the room it is an aisle of
    for (const z of aisles) expect(z).toBeLessThan(f.room[1]);
  });
  it('a station the rail passes over is 0 m off it, and distance is to its near edge and not its middle', () => {
    const s = { id: 'x', name: 'x', at: [2, 3] as [number, number], size: [1, 2] as [number, number], h: 1, wall: false, needs: [], row: 0 };
    expect(offRail(s, 3)).toBe(0);
    expect(offRail(s, 4)).toBe(0);      // its back edge is at 4
    expect(offRail(s, 5)).toBe(1);      // a metre past its back edge
  });
  it('one rail serves the two rows facing its aisle, so a sixteen-station works takes more than one', () => {
    const t = tendWorks(IDS);
    expect(t.rails.length).toBeGreaterThan(1);
    expect(t.serves.length).toBeGreaterThan(t.rails.length);      // each rail earns its keep
    expect(t.serves.length + t.cannot.length).toBe(t.floor.stood.length);
  });
  it('each rail is a real machine, priced and weighed, and several rails cost several times one', () => {
    const t = tendWorks(IDS);
    expect(t.machine.arrange).toBe('rail');
    expect(t.usd).toBeCloseTo((t.machine.usd ?? 0) * t.rails.length, 1);
    expect(t.kg).toBeCloseTo(t.machine.kg * t.rails.length, 1);
  });
  it('a station out of reach says how far and what it would take, never just "no"', () => {
    const t = tendWorks(IDS, { reach: 1200 });
    expect(t.cannot.length).toBeGreaterThan(0);
    for (const c of t.cannot) { expect(c.why).toMatch(/m from the nearest rail/); expect(c.off).toBeGreaterThan(0); }
  });
  it('an arm too short for the layout cannot tend it at all, and says that rather than reporting 0 m', () => {
    // (300 mm reaches neither row off a 0.9 m aisle: half the aisle alone is 0.45 m)
    const t = tendWorks(IDS, { reach: 300 });
    expect(t.rails).toEqual([]);
    expect(t.serves).toEqual([]);
    expect(t.says).toMatch(/No rail can be laid for a 0\.30 m arm/);
    for (const c of t.cannot) expect(c.off).toBeGreaterThan(0);
  });
  it('a longer arm reaches more, which is the trade the number is there to make', () => {
    expect(tendWorks(IDS, { reach: 1200 }).serves.length).toBeGreaterThanOrEqual(tendWorks(IDS, { reach: 300 }).serves.length);
  });
});

describe('what the robot can and cannot be asked to do', () => {
  const t = tendWorks(IDS);
  const job = throwAt('quadcopter', IDS);
  it('a machine with a port on it is the robot\'s, and every verdict carries its reason', () => {
    for (const op of job.ops) { const v = tends(op, t); expect(v.why.length).toBeGreaterThan(20); expect(['robot', 'person']).toContain(v.by); }
    const printed = job.ops.find((o) => o.process === 'fff');
    if (printed) expect(tends(printed, t).by).toBe('robot');
  });
  it('striking an arc, pouring metal and throwing clay are refused with why, not with a shrug', () => {
    for (const p of ['weld-mig', 'cast', 'throw']) {
      const op = { ...job.ops[0]!, process: p, station: t.serves[0]?.id ?? 'bench' };
      const v = tends(op, t);
      expect(v.by).toBe('person');
      expect(v.why).toMatch(/arc|700 °C|both hands/);
    }
  });
  it('an operation the robot could do at a station it cannot reach is a person\'s, and says which of the two it is', () => {
    const far = t.cannot[0];
    if (far) {
      const op = { ...job.ops[0]!, process: 'calliper', station: far.id };
      const v = tends(op, t);
      expect(v.by).toBe('person');
      expect(v.why).toMatch(/could do this/);
      expect(v.why).toMatch(/out of every rail's reach/);
    }
  });
  it('a process nobody has written a rule for is a person\'s until somebody does', () => {
    expect(tends({ ...job.ops[0]!, process: 'telekinesis' }, t)).toEqual({ by: 'person', why: expect.stringMatching(/nothing is written down about tending telekinesis/) });
  });
});

describe('the order: a basket, never a purchase', () => {
  it('every priced line carries the seller, the page, the figure it showed and the day it was seen', () => {
    const o = orderFor(throwAt('quadcopter', IDS));
    for (const l of o.lines) {
      expect(l.offer.seller.length).toBeGreaterThan(2);
      expect(l.offer.url).toMatch(/^https?:\/\//);
      expect(l.offer.seen).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.usd).toBeGreaterThan(0);
    }
    expect(o.usd).toBeCloseTo(o.lines.reduce((a, l) => a + l.usd, 0), 2);
  });
  it('it says plainly that it cannot pay, every time', () => {
    const o = orderFor(throwAt('quadcopter', IDS));
    expect(o.needsAPerson[0]).toMatch(/nothing here can press a Buy button/);
  });
  it('a line with no seller page here is named, never given a made-up price', () => {
    const o = orderFor(throwAt('workbench', IDS));
    expect(o.unpriced.length).toBeGreaterThan(0);
    for (const u of o.unpriced) expect(u.what.length).toBeGreaterThan(0);
    expect(o.needsAPerson.join(' ')).toMatch(/price \d+ lines? nobody here has a page for/);
  });
  it('what is already on the shelf is not ordered again', () => {
    const job = throwAt('quadcopter', IDS);
    const all = orderFor(job), some = orderFor(job, ['receiver']);
    expect(some.lines.length + some.unpriced.length).toBeLessThan(all.lines.length + all.unpriced.length);
  });
  it('it is split by seller, because shipping is per seller and that is most of a small order', () => {
    const o = orderFor(throwAt('quadcopter', IDS));
    expect(o.sellers.reduce((a, s) => a + s.lines, 0)).toBe(o.lines.length);
    expect(o.sellers.reduce((a, s) => a + s.usd, 0)).toBeCloseTo(o.usd, 1);
  });
});

describe('a want run through a tended works', () => {
  it('a quadcopter is mostly the robot\'s and a welded bench is half yours, because an arc is a hand', () => {
    const quad = runWorks('quadcopter', IDS), bench = runWorks('workbench', IDS);
    expect(quad.tended).toBeGreaterThan(0.8);        // printed, milled, measured, bolted: all of it has a port or a grip
    expect(bench.tended).toBeLessThan(quad.tended);  // its sawing and its 20 welds are hands, whatever else is not
    expect(bench.steps.some((s) => s.by === 'person' && /arc/.test(s.why))).toBe(true);
  });
  it('the minutes add up to the job\'s own, split and not invented', () => {
    const r = runWorks('quadcopter', IDS);
    const all = r.job.ops.reduce((a, o) => a + o.setup + o.run, 0);
    expect(r.robotMin + r.personMin).toBeCloseTo(all, 0);
    expect(r.steps).toHaveLength(r.job.ops.length);
  });
  it('it says what one more thing would hand the robot, with the minutes it would take off you', () => {
    const r = runWorks('quadcopter', IDS);
    expect(r.next.length).toBeGreaterThan(0);
    for (const n of r.next) { expect(n.wouldTake).toBeGreaterThan(0); expect(n.why.length).toBeGreaterThan(20); }
    // sorted by what it would actually save
    expect(r.next.map((n) => n.wouldTake)).toEqual([...r.next.map((n) => n.wouldTake)].sort((a, b) => b - a));
  });
  it('it is written out whole: the robot, the order, who does each step, and what is next', () => {
    const said = runText(runWorks('quadcopter', IDS));
    expect(said).toMatch(/==== the order/);
    expect(said).toMatch(/==== the work/);
    expect(said).toMatch(/nothing here can press a Buy button/);
    expect(said).toMatch(/\[robot\]|\[ you \]/);
  });
  it('answers in the room, and only when asked', () => {
    expect(tendWords('let the robot run the works')).toMatch(/==== the work/);
    expect(tendWords('what is the weather')).toBeNull();
    expect(tendWords('show me the works')).toBeNull();
  });
});
