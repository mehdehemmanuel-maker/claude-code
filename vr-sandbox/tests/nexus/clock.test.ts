// Local clocks (src/nexus/substrate/clock.ts) on a heat network whose regions' own times span four decades: a room's air, its
// masonry walls, and a small temperature sensor in the air, heated for a day against the outside. The steps come from
// the regions' own capacities and conductances; nothing here sets a step.

import { describe, expect, it } from 'vitest';
import { advance, oneClock, plan, refineWhereNeeded, type Boundary, type Region } from '../../src/nexus/substrate/clock';

// the room: 300 m³ of air (1.2 kg/m³, 1005 J/kg K); 30 m³ of fired clay brick (1900 kg/m³, the kept materials' density;
// about 840 J/kg K, an estimate); 200 m² of wall between them at the interior surface resistance 0.13 m² K/W (ISO 6946);
// the wall to the outside at 0.5 W/m² K (an estimate); a sensor bead of 0.5 J/K on 0.05 W/K to the air (an estimate: a
// small sensor's time near ten seconds); a 2 kW heater in the air; outside at 0 °C
const regions: Region[] = [
  { name: 'the room\'s air', C: 300 * 1.2 * 1005, T0: 15, source: 2000 },
  { name: 'the walls', C: 30 * 1900 * 840, T0: 15 },
  { name: 'the sensor', C: 0.5, T0: 15 },
];
const boundaries: Boundary[] = [{ a: 0, b: 1, G: 200 / 0.13 }, { a: 1, b: -1, G: 200 * 0.5, held: 0 }, { a: 0, b: 2, G: 0.05 }];
const day = 86400;
const p = plan(regions, boundaries, 0.1);
const reference = oneClock(regions, boundaries, p.finest / 8, day);
const err = (T: number[]) => Math.max(...T.map((x, i) => Math.abs(x - reference.T[i]!)));

describe('each region\'s own time', () => {
  it('a region\'s time is its capacity over all that conducts to and from it: the sensor\'s seconds, the air\'s minutes, the walls\' hours', () => {
    expect(p.own[2]).toBeCloseTo(10, 6);
    expect(p.own[0]).toBeCloseTo(regions[0]!.C / (200 / 0.13 + 0.05), 6);
    expect(p.own[1]! / 3600).toBeGreaterThan(8);
    // the steps meet: each a power of two of the finest
    for (const s of p.step) expect(Math.log2(s / p.finest) % 1).toBe(0);
  });

  it('one clock for the whole manifold fails: at the walls\' step the air and the sensor run away; at the sensor\'s step every region is stepped at the sensor\'s pace', () => {
    const coarse = oneClock(regions, boundaries, p.step[1]!, day);
    expect(Math.max(...coarse.T.map(Math.abs))).toBeGreaterThan(1e6);
    const fine = oneClock(regions, boundaries, p.finest, day);
    expect(fine.steps).toBe(3 * day / p.finest);
  });

  it('across clocks nothing is made or lost: what the regions hold at the end is what they held, plus what was made and what crossed from outside', () => {
    const r = advance(regions, boundaries, p, day);
    expect(Math.abs(r.end - r.start - r.made)).toBeLessThan(1e-9 * Math.abs(r.made));
  });

  it('regions that share no path share no clock', () => {
    const two = [...regions, { name: 'another room\'s air', C: 2e5, T0: 10 }];
    const q = plan(two, [...boundaries, { a: 3, b: -1, G: 50, held: 0 }], 0.1);
    expect(q.groups.length).toBe(2);
    expect(q.groups.find((g) => g.includes(3))).toEqual([3]);
  });
});

describe('refine only where it changes what is generated', () => {
  it('the tuner refines the walls alone and leaves the sensor coarse: the fast region follows the air, and the error accumulates in the slow one over the day', () => {
    for (const tol of [0.05, 0.02, 0.01]) {
      const r = refineWhereNeeded(regions, boundaries, day, tol);
      expect(r.path.every((x) => x.region === 1)).toBe(true);
      expect(r.fractions[2]).toBe(0.4);
      expect(err(r.run.T)).toBeLessThan(2 * tol);
      expect(r.run.steps).toBeLessThan(fineSteps() / 10);
    }
  });

  it('the error halves as the tolerance halves: the refinement converges on what one fine clock gives', () => {
    const e = [0.04, 0.02, 0.01].map((tol) => err(refineWhereNeeded(regions, boundaries, day, tol).run.T));
    expect(e[1]! / e[0]!).toBeLessThan(0.75);
    expect(e[2]! / e[1]!).toBeLessThan(0.75);
  });
});

function fineSteps() { return 3 * day / p.finest; }
