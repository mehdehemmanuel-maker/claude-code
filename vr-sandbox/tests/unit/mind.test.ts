// A creature's mind: it sees ahead and not behind, wants what its urges say, chooses the strongest, and steers by
// shortening the stride on the side it turns toward. And the herd that runs minds in the world.

import { describe, expect, it } from 'vitest';
import { bearing, headingOf, newMind, sees, strides, think, type World } from '../../src/world/mind';
import { Herd } from '../../src/world/herd';
import type { PhysicsOp } from '../../src/physics/protocol';
import type { Pose, Vec3 } from '../../src/doc/types';

const facing = (heading: number, p: Vec3 = [0, 0, 0]): Pose => ({ p, q: [0, Math.sin(heading / 2), 0, Math.cos(heading / 2)] });
const world = (you: Vec3, time = 0, dry: World['dry'] = () => true): World => ({ time, you, dry });

describe('a mind', () => {
  it('knows where things are from where it stands: facing +x, −z is to its left', () => {
    expect(headingOf(facing(0.7).q)).toBeCloseTo(0.7, 6);
    expect(bearing(facing(0), [0, 0, -2])).toMatchObject({ distance: 2 });
    expect(bearing(facing(0), [0, 0, -2]).turn).toBeCloseTo(Math.PI / 2, 6);
    expect(bearing(facing(0), [0, 0, 2]).turn).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('sees a wide arc ahead, not behind it, and not past its sight', () => {
    const m = newMind();
    expect(sees(m, facing(0), [3, 0, 0])).toBe(true);
    expect(sees(m, facing(0), [0, 0, -3])).toBe(true); // 90° off: inside a 240° arc
    expect(sees(m, facing(0), [-3, 0, 0])).toBe(false); // right behind
    expect(sees(m, facing(0), [100, 0, 0])).toBe(false);
  });

  it('far from you, it comes to you, shortening its stride on the side you are on', () => {
    const m = newMind();
    const c = think(m, facing(0), world([1, 0, -4]), 0.1, true);
    expect(c.doing).toBe('company');
    expect(c.left).toBeLessThan(c.right);
    const d = think(newMind(), facing(0), world([1, 0, 4]), 0.1, true);
    expect(d.right).toBeLessThan(d.left);
  });

  it('near you, with nothing new, it stops; it does not see you behind it and turns to look', () => {
    const calm = newMind();
    calm.urge.curiosity = 0;
    const near = think(calm, facing(0), world([0.5, 0, 0]), 0.1, false);
    expect(near).toMatchObject({ left: 0, right: 0 });
    const behind = think(newMind(), facing(0), world([-5, 0, 0]), 0.1, true);
    expect(behind.left).not.toBe(behind.right);
  });

  it('tires as it walks, rests when worn out even with you far off, then gets up again: its choices change, and it says each', () => {
    const m = newMind();
    m.urge.curiosity = -100;
    const said: string[] = [];
    let t = 0, walking = true;
    for (let k = 0; k < 3000; k++, t += 0.1) {
      const c = think(m, facing(0), world([3, 0, 0], t), 0.1, walking);
      walking = c.left > 0 || c.right > 0;
      if (c.says) said.push(c.says);
    }
    expect(said).toContain('lies down to rest');
    expect(said).toContain('comes back to you');
  });

  it('curiosity takes it somewhere new on dry ground, and it turns from water ahead', () => {
    const m = newMind(3);
    m.urge.curiosity = 1;
    m.urge.company = 0;
    const dry = (x: number) => x < 0.2;
    think(m, facing(Math.PI), world([0.5, 0, 0], 0, dry), 0.1, true);
    expect(m.doing).toBe('curiosity');
    expect(m.goal).not.toBeNull();
    expect(m.goal![0]).toBeLessThan(0.2);
    // water right ahead: it turns hard, whichever way its goal is
    const w = newMind();
    const c = think(w, facing(0), world([5, 0, 0], 0, (x) => x < 0.2), 0.1, true);
    expect(Math.min(c.left, c.right)).toBe(0);
  });

  it('its strides go to the hips by side; its knees are still only when it is', () => {
    const w = { left: ['l1', 'l2'], right: ['r1', 'r2'], servos: ['l1', 'l2', 'r1', 'r2', 'k1', 'k2'] };
    expect(strides({ left: 0.4, right: 1, doing: 'company', says: null }, w)).toEqual({ l1: 0.4, l2: 0.4, r1: 1, r2: 1, k1: 1, k2: 1 });
    expect(strides({ left: 0, right: 0, doing: 'rest', says: null }, w)).toEqual({ l1: 0, l2: 0, r1: 0, r2: 0, k1: 0, k2: 0 });
  });
});

describe('the herd', () => {
  it('keeps the book of the creatures: a mind sent to the physics, what each is doing and said from its events, and a creature whose body is gone forgotten', () => {
    const ops: PhysicsOp[] = [];
    const parts = new Set(['body']);
    const herd = new Herd({ send: (op) => ops.push(op), exists: (id) => parts.has(id) });
    herd.add('the dog', { parts: ['body'], joints: [], body: 'body', left: ['l'], right: ['r'], servos: ['l', 'r', 'k'], board: 'b', pack: 'p' });
    // its nerves went to the physics, where its mind lives on the world's ticks (runner.ts); nothing walks it from here
    expect(ops).toEqual([{ op: 'mind', name: 'the dog', nerves: { body: 'body', left: ['l'], right: ['r'], servos: ['l', 'r', 'k'] }, seed: 1 }]);
    expect(herd.doing()).toEqual([{ name: 'the dog', doing: 'company' }]);
    herd.ingest({ type: 'mind', body: 'body', name: 'the dog', doing: 'curiosity', says: 'goes to look at something' });
    herd.ingest({ type: 'mind', body: 'body', name: 'the dog', doing: 'curiosity', says: null });
    herd.ingest({ type: 'mind', body: 'other', name: 'the cat', doing: 'rest', says: 'lies down to rest' });
    expect(herd.doing()).toEqual([{ name: 'the dog', doing: 'curiosity' }]);
    expect(herd.said).toEqual(['the dog goes to look at something', 'the cat lies down to rest']);
    parts.clear();
    herd.prune();
    expect(herd.members).toEqual([]);
  });
});

describe('a mind that gets nowhere', () => {
  it('gives up on a goal it comes no closer to for five seconds, and goes another way', () => {
    const m = newMind(5);
    m.urge.curiosity = -100;
    let said: string | null = null;
    // stuck: it never moves, you are 4 m ahead
    for (let t = 0; t <= 6.01 && !said; t += 0.1) said = think(m, facing(0), world([4, 0, 0], t), 0.1, true).says;
    expect(said).toBe('gives up and goes another way');
    expect(m.doing).toBe('curiosity');
    expect(m.goal).not.toBeNull();
  });
});
