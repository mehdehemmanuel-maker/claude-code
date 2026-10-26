// The abilities the seeds asked for (docs/NODE-ENGINE.md, "what building a city showed was missing"): frames and mating,
// what touches what, rules over rows, clearing by where things are, the clock, signal cycles and things that follow a
// path.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import '../../src/nexus/seeds';
import { Engine, emptyBoard, placeBlock, runBlock, wire } from '../../src/nexus/dataflow';
import { crossOf, phaseAt, phasesOf } from '../../src/nexus/blocks';
import { boundsOfAll, findFrame, flatten, frame, mateTo, matrixOf, placedCount, type Assembly } from '../../src/nexus/assembly';
import type { Part } from '../../src/nexus/kits';

const box = (name: string, w = 1): Part => ({ name, shape: { box: [w, w, w] }, mat: 'steel-low', at: [0, 0, 0] });

describe('frames and mating', () => {
  it('a thing mated into a frame lands on it, facing as it faces', () => {
    const door: Assembly = { name: 'door', items: [{ of: box('leaf', 0.1), at: [0, 0, 0], rot: [0, 0, 0], s: 1 }], ports: [frame('fit', [0, -1, 0])] };
    const wall: Assembly = { name: 'wall', items: [], ports: [frame('opening', [2, 1, 3], [1, 0, 0])] };
    const p = mateTo(door, 'fit', wall, 'opening'); if (typeof p === 'string') throw new Error(p);
    const m = matrixOf(p), at = new THREE.Vector3(0, -1, 0).applyMatrix4(m), n = new THREE.Vector3(0, 0, 1).transformDirection(m);
    expect(at.distanceTo(new THREE.Vector3(2, 1, 3))).toBeLessThan(1e-9); expect(n.distanceTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(1e-9);
    const back = mateTo(door, 'fit', wall, 'opening', 'against'); if (typeof back === 'string') throw new Error(back);
    expect(new THREE.Vector3(0, 0, 1).transformDirection(matrixOf(back)).x).toBeCloseTo(-1, 9);
  });
  it('frames are found through what is placed, by the end of their path, and a missing one is said', () => {
    const wall: Assembly = { name: 'wall', items: [], ports: [frame('opening', [0, 1, 0])] }, room: Assembly = { name: 'room', items: [{ of: wall, at: [5, 0, 0], rot: [0, 0, 0], s: 1 }] };
    expect(findFrame(room, 'opening')?.name).toBe('wall/opening'); expect(findFrame(room, 'opening')?.at[0]).toBe(5);
    expect(mateTo(box('b'), 'fit', room, 'opening')).toMatch(/has no frame "fit"/);
  });
  it('a Wall seed sets its door in its opening wherever the opening is', async () => {
    const out = await runBlock('seed.wall', { kind: 'door', L: 4 }), names: string[] = [];
    flatten(out.wall as Assembly, (f) => { names.push(f.leaf.name); }); expect(names).toContain('door leaf'); expect(names).toContain('wall');
    const none = await runBlock('seed.wall', { kind: 'none' }); expect(placedCount(none.wall as Assembly)).toBe(0);
  });
});

describe('what touches what, and rules over it', () => {
  it('a house has a door from every room onto its hall, windows only on its outside walls, and doors at the hall\'s ends', async () => {
    const plan = await runBlock('plan.rooms', { plan: '3 bed', hall: 1.1 }), touch = await runBlock('rows.touch', { rows: plan.rows });
    const rows = (await runBlock('rows.recode', { rows: touch.rows }, {})).rows as Record<string, string>[];
    const raw = touch.rows as Record<string, string>[];
    for (const [k, r] of rows.entries()) {
      if (r.type === 'hall') continue;
      const sides = ['front', 'back', 'left', 'right'] as const;
      expect(sides.some((s) => raw[k]![s]!.startsWith('hall')), `${r.type} touches the hall`).toBe(true);
      for (const s of sides) if (r[s] === 'window') expect(raw[k]![s]).toBe('outside');
    }
    const house = await runBlock('seed.house', { plan: '3 bed', show: 'roof off' });
    let doors = 0; flatten(house.house as Assembly, (f) => { if (f.leaf.name === 'door leaf') doors++; });
    expect(doors).toBe((plan.rooms as number) + 2);
  });
});

describe('clearing by where things are', () => {
  it('takes away what comes near, keeps the rest shared as it was', async () => {
    const patch = box('patch', 0.3), field: Assembly = { name: 'field', items: Array.from({ length: 10 }, (_, i) => ({ of: patch, at: [i, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number], s: 1 })) };
    const road: Assembly = { name: 'road', items: [{ of: box('asphalt', 1), at: [4.5, 0, 0], rot: [0, 0, 0], s: 1 }] };
    const out = await runBlock('clear', { thing: field, near: road, gap: 0 }), left = out.cleared as Assembly;
    expect(out.removed).toBe(2); expect(left.items.length).toBe(8); expect(left.items.every((it) => it.of === patch)).toBe(true);
    const kept = await runBlock('clear', { thing: field, near: road }, {}); expect(kept.removed).toBe(2);
  });
});

describe('the clock, signals and paths', () => {
  it('a cycle is in each phase for its time, and the cross street is green only while this way is red', () => {
    const ph = phasesOf('green 30, yellow 4, red 34');
    for (let t = 0; t < 136; t += 0.5) { const a = phaseAt(ph, t).name, c = crossOf(ph, t); if (c !== 'red') expect(a).toBe('red'); if (a !== 'red') expect(c).toBe('red'); }
    expect(phaseAt(ph, 68 + 31).name).toBe('yellow');
  });
  it('a car stops at its line while its way is red, and goes on green; the same time is always the same place', async () => {
    const path = [{ x: 0, z: 0 }, { x: 200, z: 0 }], stops = [{ at: 50, axis: 'x' }];
    const at = async (t: number) => ((await runBlock('follow', { path, loop: false, n: 1, speed: 10, t, stops }, {})).rows as { x: number }[])[0]!.x;
    // green for 30 s from 0: it is over the line by 5 s
    expect(await at(8)).toBeCloseTo(80, 6);
    // started while red (the line at 50, red from 34 s): a car that reaches it in that time waits there
    const late = async (t: number) => ((await runBlock('follow', { path: [{ x: 0, z: 0 }, { x: 400, z: 0 }], loop: false, n: 1, speed: 10, t, stops: [{ at: 380, axis: 'x' }] }, {})).rows as { x: number }[])[0]!.x;
    expect(await late(50)).toBeCloseTo(379.5, 6); expect(await late(60)).toBeCloseTo(379.5, 6); expect(await late(75)).toBeGreaterThan(380);
    expect(await late(50)).toBe(await late(50));
  });
  it('a car moves off from a stop line at its acceleration, and slows to stop rather than stopping dead', async () => {
    const run = async (t: number) => runBlock('follow', { path: [{ x: 0, z: 0 }, { x: 900, z: 0 }], loop: false, n: 1, speed: 15, accel: 2, brake: 3.4, t, stops: [{ at: 600, axis: 'x' }] }, {});
    // at 15 m/s it comes to the line at 40 s, in the red (34 to 68 s): it slows, stops there, and goes again at 68 s
    const before = (await run(60)).rows as { x: number }[], after = (await run(73)).rows as { x: number }[];
    expect(before[0]!.x).toBeCloseTo(599.5, 6);
    // 5 s from rest at 2 m/s²: half of 2 × 5², 25 m (it has not yet reached 15 m/s, which takes 7.5 s)
    expect(after[0]!.x - 599.5).toBeGreaterThan(23); expect(after[0]!.x - 599.5).toBeLessThan(27);
    const slowing = (await run(38)).speed as number; expect(slowing).toBeGreaterThan(0); expect(slowing).toBeLessThan(15);
  });
  it('cars keep their gap: none closer than it to the one ahead', async () => {
    const out = await runBlock('follow', { path: [{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 100 }, { x: 0, z: 100 }, { x: 0, z: 0 }], n: 12, speed: 12, gap: 8, t: 90, stops: [{ at: 95, axis: 'x' }, { at: 195, axis: 'z' }] }, {});
    const pts = out.rows as { x: number; z: number }[];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.z - pts[j]!.z)).toBeGreaterThan(5.6);
  });
  it('only what reads the clock runs again as it moves', async () => {
    const b = emptyBoard('t'); placeBlock(b, 'seed.house', 0, 0, {}, 'h'); placeBlock(b, 'time', 0, 0, {}, 'c'); placeBlock(b, 'cycle', 0, 0, {}, 'y'); wire(b, 'c', 't', 'y', 't');
    const e = new Engine(b, { time: 0 }); await e.run();
    e.tick(40); const r = await e.run(); expect(r.ran).toBe(2); expect(e.state.get('y')?.out?.state).toBe('red');
    expect(boundsOfAll(e.state.get('h')!.out!.house as Assembly).isEmpty()).toBe(false);
  });
});
