// Physics and motion as nodes (blocks.ts: Let it go, Hinge, Push, Turn, Sweep; sim.ts underneath): checked against what
// the laws say, not against what it did last time.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import '../../src/nexus/seeds';
import { runBlock } from '../../src/nexus/dataflow';
import { arrayGrid, boundsOfAll, flatten, place, type Assembly } from '../../src/nexus/assembly';
import { surfaceOf } from '../../src/nexus/sim';
import type { Part } from '../../src/nexus/kits';

const block: Part = { name: 'block', shape: { box: [0.1, 0.1, 0.1] }, mat: 'oak', at: [0, 0, 0] };
const tower = (): Assembly => ({ name: 'scene', items: [place(arrayGrid(block, 2, 2, [0.1, 0.1, 0.1], 6), [0, 0.05, 0])] });

describe('let it go', () => {
  it('a tower left alone stands; shoved by a ball, it falls and comes to rest', async () => {
    const still = await runBlock('letgo', { things: tower(), t: 3 });
    expect(boundsOfAll(still.moved as Assembly).max.y).toBeCloseTo(0.6, 2);
    const ball: Part = { name: 'ball', shape: { sphere: 0.06 }, mat: 'steel-low', at: [0, 0, 0] };
    const scene: Assembly = { name: 'scene', items: [...tower().items, place(ball, [-1, 0.06, 0])] };
    const push = (await runBlock('push', { name: 'ball', fx: 300, seconds: 0.1 })).push;
    const hit = await runBlock('letgo', { things: scene, push, t: 8 });
    expect(boundsOfAll(hit.moved as Assembly).max.y).toBeLessThan(0.35); expect(hit.rested as number).toBeLessThan(8);
    // 24 blocks and a ball, each its own body
    expect((hit.ends as unknown[]).length).toBe(25);
  }, 60_000);
  it('a rod on a hinge swings with the period a physical pendulum has (2π √(2L / 3g), for 60° the elliptic factor 1.073)', async () => {
    const rod: Part = { name: 'rod', shape: { box: [0.02, 1, 0.02] }, mat: 'al-6061', at: [0, 0, 0] };
    const hinge = (await runBlock('hinge', { a: 'rod', axis: 'z', y: 2 })).joint;
    const things: Assembly = { name: 'p', items: [place(rod, [0.5 * Math.sin(Math.PI / 3), 2 - 0.5 * Math.cos(Math.PI / 3), 0], [0, 0, Math.PI / 3])] };
    const xs: [number, number][] = [];
    for (let t = 0; t <= 4.0001; t += 0.02) { const o = await runBlock('letgo', { things, joints: [hinge], t, seconds: 6 }); const c = boundsOfAll(o.moved as Assembly).getCenter(new THREE.Vector3()); xs.push([t, c.x]); }
    // its middle crosses below the hinge twice a period
    const crossings: number[] = []; for (let k = 1; k < xs.length; k++) { const [t0, x0] = xs[k - 1]!, [t1, x1] = xs[k]!; if (x0 * x1 < 0) crossings.push(t0 + (t1 - t0) * (x0 / (x0 - x1))); }
    const period = 2 * (crossings[crossings.length - 1]! - crossings[0]!) / (crossings.length - 1), expected = 2 * Math.PI * Math.sqrt(2 / (3 * 9.81)) * 1.0732;
    expect(Math.abs(period - expected) / expected).toBeLessThan(0.03);
  }, 120_000);
  it('a piece\'s friction and bounce come from the materials table by what it is made of, else are said to be typical', () => {
    expect(surfaceOf('oak').from).toBe('wood.birch-plywood'); expect(surfaceOf('steel-low').from).toBe('steel.a36'); expect(surfaceOf('unobtainium').from).toMatch(/typical/);
  });
});

describe('turning, and the room it needs', () => {
  it('a door is at each angle by its time, and back', async () => {
    const door = (await runBlock('seed.door', {})).door as Assembly;
    const at = async (t: number) => (await runBlock('turn', { thing: door, x: -0.43, t, keys: '0 s 0°, 2 s 90°, 5 s 90°, 7 s 0°' })).angle as number;
    expect(await at(0)).toBe(0); expect(await at(2)).toBeCloseTo(90, 6); expect(await at(4)).toBeCloseTo(90, 6); expect(await at(8)).toBeCloseTo(0, 6);
    const mid = await at(1); expect(mid).toBeGreaterThan(30); expect(mid).toBeLessThan(90);
  });
  it('a door\'s swing hits a bed put in it, and not one put clear of it', async () => {
    const door = (await runBlock('seed.door', {})).door as Assembly, bed = (await runBlock('seed.bed', {})).bed as Assembly;
    const swept = (await runBlock('sweep', { thing: door, x: -0.43, from: 0, to: 90 })).swept as Assembly;
    let n = 0; flatten(swept, () => { n++; }); expect(n).toBeGreaterThan(12);
    const near = await runBlock('clash', { thing: swept, with: { name: 'b', items: [place(bed, [0.2, 0, -1.1])] } });
    const far = await runBlock('clash', { thing: swept, with: { name: 'b', items: [place(bed, [0.2, 0, -3.5])] } });
    expect(near.clashes as number).toBeGreaterThan(0); expect(far.clashes).toBe(0);
  });
});
