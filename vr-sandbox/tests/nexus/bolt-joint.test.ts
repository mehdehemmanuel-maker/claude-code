// A bolted joint as physics (src/nexus/teach/bolt-joint.ts), and the lesson language saying a SECOND process
// (boltSteps in src/nexus/teach/edges.ts). Before Run 8v every edge kind was a step in soldering a through-hole
// board while works/plan.ts could route about twenty processes, so "the language every lesson is said in" said one.

import { describe, expect, it } from 'vitest';
import { boltFigures, refusedBolt, ENGAGE, NUT_FACTOR, PRELOAD_FRACTION, type BoltJoint } from '../../src/nexus/teach/bolt-joint';
import { boltSteps, type Spanners } from '../../src/nexus/teach/edges';
import { CAP_KEY, METRIC } from '../../src/nexus/parts/threads';

const M6: BoltJoint = { thread: 'M6', grade: '8.8', grip: 12, washers: 1, into: { kind: 'nut' }, head: 'socket cap', hole: 6.6 };
const kit: Spanners = {
  key: { name: 'the hex key set', sizes: [1.5, 2, 2.5, 3, 4, 5, 6, 8], src: 'a ball-end metric set' },
  spanner: { name: 'the combination spanners', sizes: [7, 8, 10, 13, 17, 19], src: 'a metric set' },
  wrench: { name: 'the torque wrench', range: [5, 60], src: 'a 3/8 in click wrench, 5-60 N·m' },
};
const made = (j: BoltJoint) => { const f = boltFigures(j); if (refusedBolt(f)) throw new Error(f.refused.join('; ')); return f; };

describe('a bolt holds by being stretched, not by filling a hole', () => {
  it('its stress area and preload are ISO 898-1, computed not quoted', () => {
    const f = made(M6);
    // As = (pi/4)(d - 0.9382 p)^2; M6 coarse is p = 1 mm, and the standard's own table says 20.1 mm^2
    expect(f.stressArea).toBeCloseTo((Math.PI / 4) * (6 - 0.9382 * 1) ** 2, 9);
    expect(f.stressArea).toBeCloseTo(20.1, 1);
    expect(f.proof).toBe(640); // class 8.8 up to M16
    expect(f.preload).toBeCloseTo(PRELOAD_FRACTION.reusable * f.stressArea * f.proof, 6);
    // T = K d F, with d in mm so the answer is N·m
    expect(f.torque).toBeCloseTo((NUT_FACTOR.plain * 6 * f.preload) / 1000, 9);
    expect(f.torque).toBeGreaterThan(10); expect(f.torque).toBeLessThan(13); // ~11.6 N·m, the figure tables give for M6 8.8
  });

  it('the length comes from the stack and is one a shop actually has', () => {
    const f = made(M6), T = METRIC.M6!;
    expect(f.needed).toBeCloseTo(12 + T.h + T.m + 2 * T.p, 9); // grip + washer + nut + two pitches standing
    expect(f.length).toBe(25); // the next ISO 888 preferred length above 20.8
    expect(f.protrusion).toBeGreaterThan(2 * T.p - 0.001); // still at least two pitches past the nut
  });

  it('a harder class is tightened harder, by its proof stress alone', () => {
    const a = made(M6), b = made({ ...M6, grade: '12.9' });
    expect(b.torque / a.torque).toBeCloseTo(1100 / 640, 6);
  });
});

describe('what cannot be made is refused, with why, before anyone tries', () => {
  const why = (j: BoltJoint) => { const f = boltFigures(j); return refusedBolt(f) ? f.refused.join(' | ') : 'made'; };

  it('a hole the shank will not pass', () => expect(why({ ...M6, hole: 5 })).toMatch(/the hole is 5 mm and the M6 shank is 6 mm/));
  it('a hole so loose the parts shift before it is tight', () => expect(why({ ...M6, hole: 9 })).toMatch(/ISO 273 medium/));
  it('too little thread in aluminium, where a nut\'s worth is not enough', () => {
    // 6 mm deep is fine in steel (0.8 d = 4.8) and not in aluminium (2 d = 12)
    expect(why({ ...M6, into: { kind: 'tapped', depth: 6, matter: 'steel' } })).toBe('made'); // 0.8 d = 4.8 mm, and 6 mm is there
    expect(why({ ...M6, into: { kind: 'tapped', depth: 6, matter: 'aluminium' } })).toMatch(/the tapped hole is 6 mm deep and 12 mm of thread is needed in aluminium/);
    expect(ENGAGE.aluminium).toBeGreaterThan(ENGAGE.steel);
  });
  it('a grip no stocked bolt reaches', () => expect(why({ ...M6, grip: 400 })).toMatch(/ISO 888 stops at 200 mm/));
  it('a thread the tables do not hold', () => expect(why({ ...M6, thread: 'M7' })).toMatch(/there is no M7 in the metric thread tables/));
});

describe('the lesson language says a second process', () => {
  it('a bolted joint comes out as steps in the same shape as a soldered one', () => {
    const { steps, refused } = boltSteps(M6, ['the bracket', 'the plate'], kit);
    expect(refused).toEqual([]);
    expect(steps.map((s) => s.kind)).toEqual(['align', 'fit', 'start', 'torque', 'rest']);
    for (const s of steps) { expect(s.do.length, s.kind).toBeGreaterThan(20); expect(s.src.length, s.kind).toBeGreaterThan(10); expect(s.check, s.kind).toBeTruthy(); }
    // every figure in the words came from the joint, not from prose
    expect(steps.find((s) => s.kind === 'fit')!.do).toContain('M6 × 25');
    expect(steps.find((s) => s.kind === 'torque')!.do).toContain(made(M6).torque.toFixed(1));
  });

  it('`rest` is reused unchanged from the soldered lesson: two kinds of seven carried over', () => {
    const { steps } = boltSteps(M6, ['a', 'b'], kit);
    expect(steps.at(-1)!.kind).toBe('rest'); // the same kind the iron goes back to its stand under
  });

  it('a tool that cannot do it is a refusal too, not a step you would fail at', () => {
    const noKey: Spanners = { ...kit, key: { name: 'the small keys', sizes: [1.5, 2, 2.5], src: 'a short set' } };
    expect(boltSteps(M6, ['a', 'b'], noKey).refused.join(' ')).toMatch(/no 5 mm: the M6 socket cap takes one/);
    expect(CAP_KEY.M6).toBe(5);
    const noHold: Spanners = { key: kit.key! };
    expect(boltSteps(M6, ['a', 'b'], noHold).refused.join(' ')).toMatch(/nothing here holds the nut/);
    const small: Spanners = { ...kit, wrench: { name: 'the small wrench', range: [1, 6], src: 'a 1/4 in wrench' } };
    expect(boltSteps(M6, ['a', 'b'], small).refused.join(' ')).toMatch(/outside the small wrench's 1\u20136 N·m/);
  });

  it('without a torque wrench the lesson says the preload is a guess, rather than pretending', () => {
    const { steps } = boltSteps(M6, ['a', 'b'], { key: kit.key!, spanner: kit.spanner! });
    expect(steps.find((s) => s.kind === 'torque')!.check).toMatch(/the preload is a guess/);
  });
});
