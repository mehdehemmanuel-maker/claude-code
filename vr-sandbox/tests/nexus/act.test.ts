// An agent opens a door (docs/LIFE.md, step 3; src/nexus/act/): it sees it, reads it, finds where to stand, walks, reaches,
// grasps, pulls or pushes; the door swings on its hinges in the physics. Nothing placed by hand.
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import initJolt from 'jolt-physics/wasm-compat';
import '../../src/nexus/seeds';
import type { Jolt } from '../../src/nexus/realize';
import type { Part } from '../../src/nexus/kits';
import { Engine, emptyBoard, placeBlock } from '../../src/nexus/dataflow';
import { partOf, type Assembly } from '../../src/nexus/assembly';
import { ACTORS } from '../../src/nexus/aware/tags';
import { DOOR_FORCE, DOOR_STOP, WALK, bodyAt, doorsOf, leanOf, limbsOf, openDoor, sceneAt, walkerOf } from '../../src/nexus/act/agent';
import { route } from '../../src/nexus/placement/line';

let J: Jolt, house: Part;
beforeAll(async () => {
  J = (await initJolt()) as unknown as Jolt;
  const b = emptyBoard('h'); placeBlock(b, 'seed.house', 0, 0, {}, 'h'); const e = new Engine(b); await e.run();
  house = partOf(e.state.get('h')!.out!.house as Assembly);
}, 120000);

describe('reading a door', () => {
  it('its hinge line through its knuckles (upright), the side it swings to (out of its face), its free edge a leaf\'s width off', () => {
    const { doors } = doorsOf(house);
    expect(doors.length).toBeGreaterThanOrEqual(5);
    for (const d of doors) {
      expect(Math.abs(d.axis[1])).toBeCloseTo(1, 6);
      expect(Math.abs(new THREE.Vector3(...d.swing).dot(new THREE.Vector3(...d.latch)))).toBeLessThan(1e-6);
      // (a 900 mm door's leaf, 860 mm: its lining takes 20 mm each side)
      expect(d.width).toBeCloseTo(0.86, 3);
      expect(d.handles).toHaveLength(2);
    }
  });
});

describe('an agent opens a door', () => {
  it('the nearest door it sees, a bedroom\'s swinging into the hall: it walks to beside its handle, clear of its sweep, and pulls it to its stop', () => {
    const p = openDoor(J, house, { open: /^door$/i, which: 'nearest' }), L = limbsOf(p.actor), foot = new THREE.Vector3(...p.door.at);
    expect(p.side).toBe(1);
    expect(p.steps.map((s) => s.kind)).toEqual(['see', 'go to', 'reach', 'grasp', 'pull', 'let go']);
    // (where it stands is clear of the leaf's sweep)
    expect(new THREE.Vector3(...p.stand).sub(foot).setY(0).length()).toBeGreaterThan(p.door.width + L.shoulders / 2);
    // (it walks at 1.4 m/s)
    const go = p.steps.find((s) => s.kind === 'go to')!; expect(p.walked / (go.to - go.from)).toBeCloseTo(WALK, 6);
    // (its hand is on the handle when it has grasped it, and moves with it as the door swings, never past its reach)
    const H = new THREE.Vector3(...p.handle), grasp = p.steps.find((s) => s.kind === 'grasp')!;
    expect(new THREE.Vector3(...bodyAt(p, grasp.to - 1e-3).hand!).distanceTo(H)).toBeLessThan(1e-6);
    for (let t = grasp.to; t < p.letGoAt; t += 0.05) { const b = bodyAt(p, t), hand = new THREE.Vector3(...b.hand!); expect(hand.clone().setY(0).distanceTo(new THREE.Vector3(...b.at).setY(0))).toBeLessThan(L.reach + leanOf(p.actor) + L.shoulders / 2 + 1e-6); }
    // (the door, pulled with 22.2 N, swings and comes to rest on its stop at 90°)
    expect(DOOR_FORCE).toBeCloseTo(22.2, 6);
    expect(p.angle(p.end + 1)).toBeGreaterThan(DOOR_STOP - 0.03); expect(p.angle(p.end + 1)).toBeLessThan(DOOR_STOP + 0.01);
    expect(p.angle(p.pullAt - 0.1)).toBe(0);
    // (the world at a time: the house with its door swung, the body, its way)
    const sc = sceneAt(house, p, p.end); expect(sc.items.length).toBe(4);
  }, 60000);
  it('the farthest it sees, the front door at the hall\'s end, swinging out: it pushes it', () => {
    const p = openDoor(J, house, { open: /^door$/i, which: 'farthest' });
    expect(p.side).toBe(-1); expect(p.steps.some((s) => s.kind === 'push')).toBe(true);
    expect(p.walked).toBeGreaterThan(3.5);
    expect(p.angle(p.end + 1)).toBeGreaterThan(DOOR_STOP - 0.03);
  }, 60000);
  it('a child of 8 walks slower (by the root of its height) and finds its own place to stand', () => {
    const a = openDoor(J, house, { open: /^door$/i }), c = openDoor(J, house, { open: /^door$/i }, { actor: ACTORS.child });
    const pace = (p: typeof a) => { const g = p.steps.find((s) => s.kind === 'go to')!; return p.walked / (g.to - g.from); };
    expect(pace(c)).toBeCloseTo(WALK * Math.sqrt(1.28 / 1.75), 6);
    expect(c.stand).not.toEqual(a.stand);
  }, 60000);
});

describe('the router, for a body', () => {
  it('a line thicker than the motion map reads (a walking body, 450 mm across) finds its way down a 950 mm hall', () => {
    const wall = (z: number): Part => ({ name: 'wall', shape: { box: [6, 1, 0.15] }, at: [0, 0.9, z], mat: 'concrete' });
    const r = route({ name: 'hall', parts: [wall(-0.55), wall(0.55)] }, [-2.5, 0.9, 0], [2.5, 0.9, 0], { section: walkerOf(ACTORS.adult!), logic: 'clear', noHeat: true, step: 0.05, region: new THREE.Box3(new THREE.Vector3(-3, 0.84, -1), new THREE.Vector3(3, 0.96, 1)) });
    expect(r.length).toBeCloseTo(5, 1);
  });
});
