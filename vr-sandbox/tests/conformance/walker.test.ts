// Walkers: a body on four legs of real parts and hobby servos walks because its feet, lifted as they come forward and
// planted as they go back, are held by friction, and only then; it goes where it chooses because its mind shortens the
// stride on the side it turns toward, as an animal's does.

import { describe, expect, it } from 'vitest';
import { rig, type Rig } from './helpers';
import { buildWalker, WALKERS, type Walker, type WalkerPlan } from '../../src/world/creature';
import { bearing, headingOf, newMind, strides, think } from '../../src/world/mind';
import { DocStore } from '../../src/doc/store';
import { newDoc } from '../../src/doc/commands';
import { getMaterial, MATERIALS } from '../../src/data/materials';
import type { Vec3 } from '../../src/doc/types';
import { rotate } from '../../src/doc/math';
import { groundAt, heightfield, PLACES } from '../../src/world/place';
import { Runner } from '../../src/physics/runner';
import { TICK } from '../../src/physics/world';

const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

/** A floor with no friction at all: no material is, but it is the limit the law is about. */
const FRICTIONLESS = { ...getMaterial('polymer.ptfe'), name: 'a PTFE floor with no friction at all', friction: 0 };

async function walker(plan: WalkerPlan, heading = 0, floor = 'concrete.c30'): Promise<{ r: Rig; w: Walker; store: DocStore }> {
  const r = await rig({}, false);
  const mats = { ...materials, [FRICTIONLESS.id]: FRICTIONLESS };
  r.world.apply({ op: 'environment', boxes: [{ half: [50, 0.5, 50], pose: { p: [0, -0.5, 0], q: [0, 0, 0, 1] }, material: floor }], materials: mats });
  const store = new DocStore(newDoc('walk'));
  const w = buildWalker(store, plan, [0, 0, 0], heading);
  for (const id of w.parts) r.world.apply({ op: 'upsertPart', part: store.doc.parts[id]!, material: getMaterial(store.doc.parts[id]!.material), keepLivePose: false });
  for (const id of w.joints) r.world.apply({ op: 'upsertConnection', conn: store.doc.connections[id]!, materials });
  return { r, w, store };
}

const broken = (r: Rig, w: Walker) => w.joints.filter((id) => r.world.connectionStatus?.(id) === 'broken').length;
const upright = (r: Rig, w: Walker) => { const q = r.world.livePose(w.body)!.q; return 1 - 2 * (q[0] * q[0] + q[2] * q[2]); };

async function walk(plan: WalkerPlan, heading: number, seconds: number, floor?: string) {
  const { r, w } = await walker(plan, heading, floor);
  r.run(seconds);
  const p = r.world.livePose(w.body)!.p;
  const out = { forward: p[0] * Math.cos(heading) - p[2] * Math.sin(heading), height: p[1], upright: upright(r, w), broken: broken(r, w) };
  r.done();
  return out;
}

describe('a walker', () => {
  // The deer is not here. Under the real servo (its rotor's inertia, no stops at its command) the long-legged walker
  // trots at the low end of the rotor estimate and rolls over at the high end (P-rotor-per-stall, 5e-4 against 2e-3
  // s² per N m), and the rotor's realisation overstates a pitching body's inertia by the sum of its rotors
  // (docs/FRONTIER.md A-deer-trot, D-rotor-housing): neither "walks" nor "falls" is a claim the physics can make for
  // it yet, so no test asserts either. The dog's claims hold at every heading under the same caveat.
  for (const [name, heading] of [['dog', 0], ['dog', Math.PI / 2], ['dog', 2.5]] as const) {
    it(`a ${name} facing ${heading.toFixed(2)} rad walks forward by its own legs: more than five body lengths in ten seconds, upright, every joint holding`, async () => {
      const plan = WALKERS[name]!;
      const s = await walk(plan, heading, 10);
      expect(s.forward).toBeGreaterThan(5 * plan.body.length);
      expect(s.upright).toBeGreaterThan(0.9);
      expect(s.height).toBeGreaterThan(plan.thigh + plan.shank);
      expect(s.broken).toBe(0);
    }, 120000);
  }

  it('with its knees still or lifting them, a trot and a walk both carry it forward upright (which goes further is an open question, Q-shuffle)', async () => {
    // Under the real servo (compliant, no end stops at its command) a body free to rock loads its rear-moving feet more
    // than its forward-moving ones, so dragged feet still shuffle it along, 0.5 to 0.9 m in ten seconds here
    // (docs/FRONTIER.md A-knees-still). The physical claim is the order, never a distance set from an output
    // (docs/LAW-TREE.md K-24); the frictionless test below holds the other half, that the floor alone moves nothing.
    // The trot with its knees still against the trot with lift: on the walker as it is now built (its 9 g servos
    // on a 48 g pack under the deck, their torque at the pack's volts), the still-kneed trot shuffles further on
    // concrete than the lifted one trots (2.9 m against 2.1 m in ten seconds). Which order the laws require is not
    // derived (docs/FRONTIER.md Q-shuffle), so neither is asserted: only that both walk forward, upright.
    const trotStill = await walk({ ...WALKERS['dog']!, gait: 'trot', lift: 0 }, 0, 10), trot = await walk({ ...WALKERS['dog']!, gait: 'trot' }, 0, 10);
    expect(trotStill.forward).toBeGreaterThan(WALKERS['dog']!.body.length);
    expect(trot.forward).toBeGreaterThan(WALKERS['dog']!.body.length);
    expect(Math.min(trotStill.upright, trot.upright)).toBeGreaterThan(0.9);
    // the same for its walk: with its knees still it shuffles 2.9 m, with lift it strides 2.1 m (Q-shuffle)
    const shuffle = await walk({ ...WALKERS['dog']!, lift: 0 }, 0, 10), stride = await walk(WALKERS['dog']!, 0, 10);
    expect(shuffle.forward).toBeGreaterThan(WALKERS['dog']!.body.length);
    expect(stride.forward).toBeGreaterThan(WALKERS['dog']!.body.length);
    expect(Math.min(shuffle.upright, stride.upright)).toBeGreaterThan(0.9);
  }, 240000);

  it('on a floor with no friction it gets nowhere: the floor gives no sideways impulse, so its centre of mass stays (F-1.3), and its body can only move against its own legs', async () => {
    const plan = WALKERS['dog']!;
    const s = await walk(plan, 0, 10, FRICTIONLESS.id);
    // F-1.3 holds the centre of mass to millimetres (tests/conformance/momentum.test.ts); the body, most of the mass,
    // can shift against the legs by less than a leg's reach, whatever the gait does
    expect(Math.abs(s.forward)).toBeLessThan(plan.thigh + plan.shank);
  }, 120000);

  it('a slow trot needs little grip: on PTFE feet (friction about 0.09 on concrete) it still walks, as a careful walker crosses ice', async () => {
    const s = await walk({ ...WALKERS['dog']!, foot: { ...WALKERS['dog']!.foot, material: 'polymer.ptfe' } }, 0, 10);
    expect(s.forward).toBeGreaterThan(WALKERS['dog']!.body.length);
  }, 120000);
});

describe('a walker that chooses', () => {
  for (const you of [[0, 0, -3], [-3, 0, 0], [3, 0, 3]] as Vec3[]) {
    it(`comes to you at (${you.join(', ')}): turns until it sees you, then walks to within a metre and a half, steering by its strides`, async () => {
      const { r, w } = await walker(WALKERS['dog']!, 0);
      const m = newMind(7);
      m.urge.curiosity = -100; // company alone, for this
      let time = 0, walking = true, closest = Infinity;
      for (let k = 0; k < 400 && closest > 1.5; k++) {
        const c = think(m, r.world.livePose(w.body)!, { time, you, dry: () => true }, 0.1, walking);
        walking = c.left > 0 || c.right > 0;
        r.world.apply({ op: 'gait', amplitude: strides(c, w) });
        r.run(0.1);
        time += 0.1;
        closest = Math.min(closest, bearing(r.world.livePose(w.body)!, you).distance);
      }
      expect(closest).toBeLessThan(1.5);
      expect(upright(r, w)).toBeGreaterThan(0.9);
      r.done();
    }, 120000);
  }

  it('stands still when its mind stills it: strides of nothing hold every servo at its centre', async () => {
    const { r, w } = await walker(WALKERS['dog']!, 0);
    r.world.apply({ op: 'gait', amplitude: strides({ left: 0, right: 0, doing: 'rest', says: null }, w) });
    r.run(1);
    const a = r.world.livePose(w.body)!.p;
    r.run(4);
    const b = r.world.livePose(w.body)!.p;
    expect(Math.hypot(b[0] - a[0], b[2] - a[2])).toBeLessThan(0.01);
    expect(headingOf(r.world.livePose(w.body)!.q)).toBeCloseTo(0, 1);
    r.done();
  }, 120000);
});

describe('a walker that keeps its feet', () => {
  // Found when a dog on the beach rolled onto its back about one run in ten in the app: its stance was narrower than its
  // legs are long, and a stride cut short mid-swing tripped it. Its stance is now as wide as its legs are long, and a
  // stride changes over half a second. Held here against shoves while it turns this way and that.
  it('on the beach, shoved sideways every half second (0.06 N s) while it turns hard this way and that, it never rolls over', async () => {
    const f = heightfield({ id: 'beach', ...PLACES['beach']! });
    for (let seed = 1; seed <= 6; seed++) {
      const r = await rig({}, false);
      r.world.apply({ op: 'terrain', field: { n: f.n, size: f.size, heights: f.heights }, material: getMaterial(PLACES['beach']!.ground.material) });
      const store = new DocStore(newDoc('walk'));
      const w = buildWalker(store, WALKERS['dog']!, [0, groundAt(f, 0, 1.9) + 0.003, 1.9], seed * 0.7);
      for (const id of w.parts) r.world.apply({ op: 'upsertPart', part: store.doc.parts[id]!, material: getMaterial(store.doc.parts[id]!.material), keepLivePose: false });
      for (const id of w.joints) r.world.apply({ op: 'upsertConnection', conn: store.doc.connections[id]!, materials });
      let rnd = seed * 7919 + 13;
      const next = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
      let lowest = 1;
      for (let k = 0; k < 20; k++) {
        const [left, right] = [[0, 1], [1, 0], [1, 1], [1, 1]][Math.floor(next() * 4)]!;
        r.world.apply({ op: 'gait', amplitude: strides({ left: left!, right: right!, doing: 'company', says: null }, w) });
        r.run(0.25);
        const pose = r.world.livePose(w.body)!, side = rotate(pose.q, [0, 0, next() < 0.5 ? 1 : -1]);
        r.world.apply({ op: 'impulse', id: w.body, point: pose.p, impulse: [side[0] * 0.06, 0, side[2] * 0.06] });
        r.run(0.25);
        lowest = Math.min(lowest, upright(r, w));
      }
      expect(lowest, `seed ${seed}`).toBeGreaterThan(0.3);
      r.done();
    }
  }, 300000);
});

describe('a mind that keeps world time (F-6.3)', () => {
  it('thinks at the same ticks whether a frame carries one tick or four: the same dog walks the same path and says the same things', async () => {
    // the dog's mind lives in the runner, on the world's ticks: a frame that carries four ticks (a slow headset, a
    // loaded CI runner) changes nothing it does. Before this it thought once a frame, 9 to 12 ticks apart by the
    // frame rate, and on one CI run (2026-10-03) the dog on the beach ended on its back.
    const path = async (ticksPerFrame: number) => {
      const { r, w } = await walker(WALKERS['dog']!, 0);
      const runner = new Runner(r.world);
      runner.run(0, [{ op: 'mind', name: 'the dog', nerves: { body: w.body, left: w.left, right: w.right, servos: w.servos }, seed: 7 }, { op: 'you', at: [3, 0, 3] }], 0);
      const poses = new Map<number, number[]>(), said: string[] = [];
      let ticks = 0;
      while (ticks < 268) {
        const res = runner.run(0, [], ticksPerFrame * TICK + 1e-9, 4);
        ticks += res.ticksRun;
        for (const e of res.events) if (e.type === 'mind') said.push(`${ticks}: ${e.doing} ${e.says ?? ''}`);
        poses.set(ticks, [...r.world.livePose(w.body)!.p, ...r.world.livePose(w.body)!.q]);
      }
      r.done();
      return { poses, said, ticks };
    };
    const one = await path(1), four = await path(4);
    expect(four.ticks).toBe(one.ticks);
    for (const [tick, pose] of four.poses) expect(one.poses.get(tick), `at tick ${tick}`).toEqual(pose);
    expect(four.said).toEqual(one.said);
    // and it did walk: its mind drove it toward you
    const a = one.poses.get(1)!, b = one.poses.get(one.ticks)!;
    expect(Math.hypot(b[0]! - a[0]!, b[2]! - a[2]!)).toBeGreaterThan(0.1);
  }, 120000);
});
