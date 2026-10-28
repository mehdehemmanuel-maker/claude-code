// Physics and motion as nodes (blocks.ts: Let it go, Hinge, Push, Turn, Sweep; sim.ts underneath): checked against what
// the laws say, not against what it did last time.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import '../../src/nexus/seeds';
import { runBlock } from '../../src/nexus/dataflow';
import { arrayGrid, boundsOfAll, flatten, place, type Assembly } from '../../src/nexus/assembly';
import { surfaceOf } from '../../src/nexus/sim';
import { MOTORS, GEARHEADS } from '../../src/data/motors';
import { motorModel, windingR } from '../../src/engineering/dcmotor';
import { AMBIENT } from '../../src/engineering/thermal';
import type { Part } from '../../src/nexus/kits';
import { massOfAll } from '../../src/nexus/assembly';

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
    // oak's own grade is not in the handbook: birch plywood's numbers stand in, and say so; low-carbon steel is 1018 throughout
    expect(surfaceOf('oak').from).toBe('wood.birch-plywood (a stand-in)'); expect(surfaceOf('steel-low').from).toBe('steel.1018-cd'); expect(surfaceOf('unobtainium').from).toMatch(/typical/);
  });
});

describe('a tether: a mate held with force', () => {
  // a steel block hung on 2 m of line from a point 12 m up (its top 10 m up, 2 m below the anchor), room under it to fall
  const hang = async (section: string, side: number) => {
    const load: Part = { name: 'load', shape: { box: [side, side, side] }, mat: 'steel-low', at: [0, 0, 0] }, m = massOfAll(load);
    const tie = await runBlock('tether', { ay: 10, by: 12, length: 2, a: 'load', section, damping: 0.3 });
    const out = await runBlock('letgo', { things: { name: 'hung', items: [place(load, [0, 10 - side / 2, 0])] } as Assembly, joints: [tie.joint], t: 6, seconds: 6 });
    return { m, k: tie.stiffness as number, breaks: tie.breaks as number, j: (out.joint as Record<string, number | string>[])[0]! };
  };
  it('hangs a load at the stretch its stiffness gives (E A / L) and carries its weight', async () => {
    const r = await hang('wire-rope-6', 0.2), g = 9.80665;
    // 6 mm wire rope: E A 1.62 MN over 2 m, so 0.8 MN/m; a 62.8 kg block stretches it under a millimetre
    expect(r.k).toBeCloseTo(810000, -2);
    expect(((r.j.end as number) - 2) / ((r.m * g) / r.k)).toBeCloseTo(1, 1);
    expect((r.j.pull as number) / (r.m * g)).toBeCloseTo(1, 1);
    expect(r.j.parted).toBe('');
  }, 60_000);
  it('parts at its breaking load: a 4 t block on a 10 mm dynamic rope (20 kN)', async () => {
    const r = await hang('rope-dynamic-10', 0.8);
    expect(r.m * 9.80665).toBeGreaterThan(r.breaks);
    expect(typeof r.j.parted).toBe('number');
    expect(r.j.peakPull as number).toBeGreaterThan(r.breaks);
  }, 60_000);
});

describe('wheels that roll', () => {
  it('a cart on two motor-driven wheels settles at the speed its motor\'s constants give, and draws its stall current to start', async () => {
    const chassis: Part = { name: 'chassis', shape: { box: [1.0, 0.06, 0.5] }, mat: 'al-6061', at: [0, 0, 0] }, wheel: Part = { name: 'wheel', shape: { cyl: [0.1, 0.05] }, mat: 'rubber', at: [0, 0, 0] };
    const W: [number, number][] = [[-0.4, 0.3], [-0.4, -0.3], [0.4, 0.3], [0.4, -0.3]], names = ['wheel', 'wheel 2', 'wheel 3', 'wheel 4'];
    const cart: Assembly = { name: 'cart', items: [place(chassis, [0, 0.16, 0]), ...W.map(([x, z]) => place(wheel, [x, 0.1, z], [Math.PI / 2, 0, 0]))] };
    const motor = 'motor.dc.coreless.d40-150w-24v', gear = 'gearhead.planetary.d42-12to1';
    const joints = await Promise.all(W.map(async ([x, z], k) => (await runBlock('hinge', { a: names[k], b: 'chassis', axis: 'z', x, y: 0.1, z, ...(k < 2 ? { motor, gear, reverse: 1 } : {}) })).joint));
    const at = async (t: number) => { const o = await runBlock('letgo', { things: cart, joints, t, seconds: 6 }); return { x: boundsOfAll(o.moved as Assembly).getCenter(new THREE.Vector3()).x, joint: (o.joint as { peakAmps?: number }[])[0]! }; };
    const a = await at(4), b = await at(6), v = (b.x - a.x) / 2;
    // with only its own friction to turn: K_t (V − K_t ω) / R = T_f, so ω = (V − T_f R / K_t) / K_t; through 12:1, on a 0.1 m wheel
    const m = motorModel(MOTORS[motor]!), R = windingR(m, AMBIENT), w = (24 - (m.Tf * R) / m.Kt) / m.Kt, expected = (w / GEARHEADS[gear]!.ratio) * 0.1;
    expect(Math.abs(v - expected) / expected).toBeLessThan(0.05);
    expect(Math.abs(b.joint.peakAmps! - 24 / R) / (24 / R)).toBeLessThan(0.1);
  }, 120_000);
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
