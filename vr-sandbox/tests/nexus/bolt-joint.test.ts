// A bolted joint as physics (src/nexus/teach/bolt-joint.ts), and the lesson language saying a SECOND process
// (boltSteps in src/nexus/teach/edges.ts). Before Run 8v every edge kind was a step in soldering a through-hole
// board while works/plan.ts could route about twenty processes, so "the language every lesson is said in" said one.

import { describe, expect, it } from 'vitest';
import { boltFigures, refusedBolt, NUT_FACTOR, PRELOAD_FRACTION, stripForce, type BoltJoint } from '../../src/nexus/teach/bolt-joint';
import { boltSteps, type Spanners } from '../../src/nexus/teach/edges';
import { CAP_KEY, METRIC } from '../../src/nexus/parts/threads';
import { jointsOfMate } from '../../src/nexus/teach/edges';
import { component } from '../../src/nexus/parts/components';

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
  const made = (j: BoltJoint) => { const f = boltFigures(j); if (refusedBolt(f)) throw new Error(f.refused.join('; ')); return f; };

  it('a hole the shank will not pass', () => expect(why({ ...M6, hole: 5 })).toMatch(/the hole is 5 mm and the M6 shank is 6 mm/));
  it('a hole so loose the parts shift before it is tight', () => expect(why({ ...M6, hole: 9 })).toMatch(/ISO 273 medium/));
  it('a short thread is a WEAKER joint, not an impossible one', () => {
    // This replaced a refusal, and the refusal was wrong. A NEMA 17 stepper's front face is M3 tapped 4.5 mm —
    // 1.5 d, not the 2 d aluminium wants — and every 3D printer ever built is bolted down through it. ENGAGE says
    // what develops the BOLT's full strength; falling short makes the THREAD what gives first, at its share.
    const full = made({ ...M6, into: { kind: 'tapped', depth: 12, matter: 'aluminium' } });
    const half = made({ ...M6, into: { kind: 'tapped', depth: 6, matter: 'aluminium' } });
    expect(full.limitedBy).toBe('the bolt');
    expect(half.limitedBy).toBe('the thread in aluminium');
    expect(half.preload / full.preload).toBeCloseTo(6 / 12, 6); // its share of the engagement it wants
    expect(half.torque).toBeLessThan(full.torque);
  });

  it('and the two routes to that are reported where they disagree, rather than one quietly winning', () => {
    // The practice rule (ENGAGE) and the shear bound (stripForce) do not agree; practice governs because the
    // bound's 0.6 factor ignores thread form, tolerance, and that the first turns carry far more than the last.
    const f = made({ ...M6, into: { kind: 'tapped', depth: 6, matter: 'aluminium' } });
    expect(f.strips).toBeCloseTo(stripForce(6, 6, 'aluminium'), 6);
    expect(f.says.join(' ')).toMatch(/the shear bound disagrees and is the optimistic one/);
    expect(f.says.join(' ')).toMatch(/The practice rule governs here/);
  });

  it('less than one full turn of thread holds nothing, and that IS refused', () =>
    expect(why({ ...M6, into: { kind: 'tapped', depth: 0.5, matter: 'steel' } })).toMatch(/less than one 1 mm pitch/));

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

describe('a real mate from the library, taught', () => {
  // The whole chain: the library draws a NEMA 17 stepper and a motor plate, `parts/mate.ts` knows their ports match,
  // and the lesson is read out of that geometry — no figure here was typed by anyone.
  const parts = () => {
    const a = component('motorplate nema17 t3 aluminium'), b = component('stepper NEMA 17 40');
    if (typeof a === 'string' || typeof b === 'string') throw new Error(`${a} / ${b}`);
    return [a.part, b.part] as const;
  };

  it('reads the joint out of the two parts rather than being told it', () => {
    const [plate, motor] = parts();
    const j = jointsOfMate(plate, 'motor face', motor, 'front face', 'aluminium');
    if (typeof j === 'string') throw new Error(j);
    expect(j.count).toBe(4);                       // the NEMA 17 square
    expect(j.joint.thread).toBe('M3');             // the port's own thread
    expect(j.joint.grip).toBeCloseTo(3, 6);        // the plate's own 3 mm
    expect(j.joint.into).toEqual({ kind: 'tapped', depth: 4.5, matter: 'aluminium' });
    expect(j.says).toContain('NEMA 17');
  });

  it('refuses to guess what a tapped part is made of, because the rule turns on it', () => {
    const [plate, motor] = parts();
    expect(String(jointsOfMate(plate, 'motor face', motor, 'front face'))).toMatch(/nothing says what it is tapped in/);
  });

  it('teaches it as four alike joints in one step, pulled down in a criss-cross', () => {
    const [plate, motor] = parts();
    const j = jointsOfMate(plate, 'motor face', motor, 'front face', 'aluminium');
    if (typeof j === 'string') throw new Error(j);
    // a small wrench, because the big one cannot set an M3's 1.1 N·m — which the tool check says for itself below
    const small = { ...kit, wrench: { name: 'a 1/4 in torque wrench', range: [0.5, 6] as [number, number], src: 'a small click wrench' } };
    const { steps, refused } = boltSteps(j.joint, ['the motor plate', 'the stepper'], small, { count: j.count });
    expect(refused).toEqual([]);
    const say = steps.map((s) => s.do).join(' ');
    expect(say).toMatch(/all four pairs/);            // said once for all of them
    expect(say).toMatch(/M3 × 8/);                    // the length from the stack, off the ISO 888 list
    expect(say).toMatch(/criss-cross/);               // a pattern is pulled down in stages
    expect(say).toMatch(/under its head/);            // a washer on a tapped joint is under the head, not the far end
    expect(say).not.toMatch(/nut/);                   // there is no nut on a tapped joint
  });

  it('and the shop\'s big wrench is refused for it, because an M3 is below its range', () => {
    const [plate, motor] = parts();
    const j = jointsOfMate(plate, 'motor face', motor, 'front face', 'aluminium');
    if (typeof j === 'string') throw new Error(j);
    expect(boltSteps(j.joint, ['a', 'b'], kit, { count: j.count }).refused.join(' ')).toMatch(/outside the torque wrench's 5\u201360 N·m/);
  });
});
