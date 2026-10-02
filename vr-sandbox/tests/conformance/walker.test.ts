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

const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

/** A floor with no friction at all: no material is, but it is the limit the law is about. */
const FRICTIONLESS = { ...getMaterial('polymer.ptfe'), id: 'test.frictionless', name: 'a frictionless floor', friction: 0 };

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
  for (const [name, heading] of [['dog', 0], ['dog', Math.PI / 2], ['dog', 2.5], ['deer', 0], ['deer', -Math.PI / 2]] as const) {
    it(`a ${name} facing ${heading.toFixed(2)} rad walks forward by its own legs: more than five body lengths in ten seconds, upright, every joint holding`, async () => {
      const plan = WALKERS[name]!;
      const s = await walk(plan, heading, 10);
      expect(s.forward).toBeGreaterThan(5 * plan.body.length);
      expect(s.upright).toBeGreaterThan(0.9);
      expect(s.height).toBeGreaterThan(plan.thigh + plan.shank);
      expect(s.broken).toBe(0);
    }, 120000);
  }

  it('with its knees still a trot only paddles: two feet dragged forward cancel two pushed back; a walk still shuffles, three feet against one, slower than it walks', async () => {
    const trot = await walk({ ...WALKERS['dog']!, gait: 'trot', lift: 0 }, 0, 10);
    expect(Math.abs(trot.forward)).toBeLessThan(0.3);
    const shuffle = await walk({ ...WALKERS['dog']!, lift: 0 }, 0, 10), stride = await walk(WALKERS['dog']!, 0, 10);
    expect(shuffle.forward).toBeGreaterThan(0.3);
    expect(shuffle.forward).toBeLessThan(stride.forward);
  }, 120000);

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
