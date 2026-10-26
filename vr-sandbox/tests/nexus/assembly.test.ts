// Assemblies (src/nexus/assembly.ts): things placed, never copied. A motor saved once and placed on a drone, the drone in a
// swarm, the swarm over a city: each stored once, what it weighs and holds worked out once, every piece placed where its
// placements compose. And the same built from saved blocks on a board (src/nexus/dataflow.ts) as built inline.

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import * as THREE from 'three';
import { arrayCircle, arrayGrid, arrayLine, boundsOfAll, combine, distinctCount, effective, flatten, massOfAll, mirror, place, placedCount, type Assembly } from '../../src/nexus/assembly';
import { massOf } from '../../src/nexus/mass';
import type { Part } from '../../src/nexus/kits';
import { component } from '../../src/nexus/components';
import { Engine, collapse, emptyBoard, groupBlock, placeBlock, wire } from '../../src/nexus/dataflow';
import { register } from '../../src/nexus/blocks';

const cube = (a = 0.1, mat = 'steel-low'): Part => ({ name: 'cube', shape: { box: [a, a, a] }, mat, at: [0, 0, 0] });
const where = (a: Part | Assembly) => { const out: THREE.Vector3[] = []; flatten(a, (f) => { out.push(new THREE.Vector3().setFromMatrixPosition(f.m)); }); return out; };

describe('placing, not copying', () => {
  it('a thing placed many times is one thing stored, and weighs as many times its mass', () => {
    const c = cube(), row = arrayLine(c, 10, [0.2, 0, 0]);
    expect(row.items.every((it) => it.of === c)).toBe(true);
    expect(massOfAll(row)).toBeCloseTo(10 * massOf(c), 9);
    expect(placedCount(row)).toBe(10); expect(distinctCount(row)).toBe(2);
    expect(where(row).map((v) => Number(v.x.toFixed(6)))).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8].map((x) => Number(x.toFixed(6))));
  });
  it('places compose down the levels: turned, moved and scaled', () => {
    const c = cube(), a: Assembly = { name: 'a', items: [place(c, [1, 0, 0])] }, b: Assembly = { name: 'b', items: [place(a, [0, 0, 0], [0, Math.PI / 2, 0], 2)] };
    const [p] = where(b); expect(p!.x).toBeCloseTo(0, 9); expect(p!.z).toBeCloseTo(-2, 9);
    expect(massOfAll(b)).toBeCloseTo(8 * massOf(c), 9);
    const box = boundsOfAll(b); expect(box.max.x - box.min.x).toBeCloseTo(0.2, 9);
  });
  it('a ring of four faces each out; a mirror is its image', () => {
    const r = arrayCircle(cube(), 4, 1), ps = where(r);
    expect(ps.map((v) => [Math.round(v.x) || 0, Math.round(v.z) || 0])).toEqual([[1, 0], [0, 1], [-1, 0], [0, -1]]);
    const m = mirror({ name: 'm', items: [place(cube(), [1, 0, 0])] }, 'x');
    expect(where(m).map((v) => Math.round(v.x) || 0)).toEqual([1, -1]);
    expect(massOfAll(m)).toBeCloseTo(2 * massOf(cube()), 9);
  });
  it('a change where it is placed: outermost wins, a pattern finds only its pieces, the material changes the mass', () => {
    const motor: Part = { name: 'motor', at: [0, 0, 0], parts: [{ name: 'motor body', shape: { box: [0.04, 0.04, 0.04] }, mat: 'steel-low', at: [0, 0, 0] }, { name: 'prop', shape: { box: [0.2, 0.002, 0.02] }, mat: 'pp', at: [0, 0.03, 0] }] };
    const red: Assembly = { name: 'r', items: [{ ...place(motor), over: { color: 0xff0000, path: 'prop' } }] };
    const blue: Assembly = { name: 'b', items: [{ ...place(red), over: { color: 0x0000ff } }] };
    const colours: Record<string, number | undefined> = {}; flatten(blue, (f) => { colours[f.leaf.name] = f.over.color; });
    expect(colours).toEqual({ 'motor body': 0x0000ff, prop: 0x0000ff });
    expect(effective([{ color: 1, path: 'prop' }], 'motor body')).toEqual({});
    const al: Assembly = { name: 'al', items: [{ ...place(motor), over: { mat: 'al-6061', path: 'body' } }] };
    expect(massOfAll(al)).toBeCloseTo(0.04 ** 3 * 2700 + 0.2 * 0.002 * 0.02 * 905, 9);
    const hidden: Assembly = { name: 'h', items: [{ ...place(motor), over: { hide: true, path: 'prop' } }] };
    expect(placedCount(motor)).toBe(2); let n = 0; flatten(hidden, () => { n++; }); expect(n).toBe(1);
  });
  it('a library part placed is its tree of pieces, each where its standard draws it', () => {
    const c = component('bearing 6205'); if (typeof c === 'string') throw new Error(c);
    const ring = arrayCircle(c.part, 3, 0.1);
    expect(placedCount(ring)).toBe(3 * placedCount(c.part));
    expect(massOfAll(ring)).toBeCloseTo(3 * massOf(c.part), 6);
  });
  it('any nesting: mass is the sum of what is placed, scaled by volume', () => {
    fc.assert(fc.property(fc.array(fc.record({ n: fc.integer({ min: 1, max: 5 }), s: fc.double({ min: 0.5, max: 2, noNaN: true }) }), { minLength: 1, maxLength: 5 }), (levels) => {
      let t: Part | Assembly = cube(0.01), expected = massOf(cube(0.01));
      for (const l of levels) { t = { name: 'l', items: Array.from({ length: l.n }, (_, i) => place(t, [i, 0, 0], [0, 0, 0], l.s)) }; expected *= l.n * l.s ** 3; }
      expect(massOfAll(t)).toBeCloseTo(expected, 6);
    }), { numRuns: 80 });
  });
});

describe('cities from a few things', () => {
  it('a million pieces placed are stored as a handful of things', () => {
    const before = process.memoryUsage().heapUsed;
    const motor: Part = { name: 'motor', at: [0, 0, 0], parts: [{ name: 'motor body', shape: { cyl: [0.014, 0.02] }, mat: 'steel-low', at: [0, 0, 0] }, { name: 'prop', shape: { box: [0.13, 0.002, 0.012] }, mat: 'pp', at: [0, 0.015, 0] }] };
    const drone = combine([cube(0.12), arrayCircle(motor, 4, 0.1)], 'drone');
    const swarm = arrayGrid(drone, 10, 10, [0.5, 0, 0.5]), street = arrayGrid(swarm, 10, 10, [6, 0, 6]), city = arrayGrid(street, 10, 10, [60, 0, 60]);
    const t0 = performance.now(), placed = placedCount(city), mass = massOfAll(city), ms = performance.now() - t0, grew = (process.memoryUsage().heapUsed - before) / 1e6;
    expect(placed).toBe(9 * 1e6);
    expect(distinctCount(city)).toBeLessThan(12);
    expect(mass).toBeCloseTo(1e6 * massOfAll(drone), 0);
    console.log(`a city of ${placed.toLocaleString()} pieces: ${distinctCount(city)} things stored, mass and count in ${ms.toFixed(1)} ms, about ${grew.toFixed(1)} MB more held`);
  });
});

describe('saved blocks on a board', () => {
  it('a motor folded into a block and placed 4 × 100 times weighs what the same built inline does', async () => {
    // the motor's board: a body and a prop, combined
    const inner = emptyBoard('Motor');
    placeBlock(inner, 'shape.cyl', 0, 0, { name: 'motor body', r: 0.014, h: 0.02 }, 'body');
    placeBlock(inner, 'shape.box', 0, 0, { name: 'prop', mat: 'pp', w: 0.13, h: 0.002, d: 0.012 }, 'prop');
    placeBlock(inner, 'place', 0, 0, { y: 0.015 }, 'up'); wire(inner, 'prop', 'part', 'up', 'thing');
    placeBlock(inner, 'combine', 0, 0, { name: 'motor' }, 'm'); wire(inner, 'body', 'part', 'm', 'things'); wire(inner, 'up', 'placed', 'm', 'things');
    placeBlock(inner, 'group.out', 0, 0, { name: 'motor', type: 'assembly' }, 'o'); wire(inner, 'm', 'assembly', 'o', 'value');
    register(groupBlock(inner, { id: 'my.motor-test', name: 'Motor' }));
    const b = emptyBoard('Drones');
    placeBlock(b, 'my.motor-test', 0, 0, {}, 'motor');
    placeBlock(b, 'array.circle', 0, 0, { n: 4, r: 0.1 }, 'four'); wire(b, 'motor', 'motor', 'four', 'thing');
    placeBlock(b, 'array.grid', 0, 0, { nx: 10, nz: 10, sx: 0.5, sz: 0.5 }, 'swarm'); wire(b, 'four', 'ring', 'swarm', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'm'); wire(b, 'swarm', 'grid', 'm', 'thing');
    const e = new Engine(b); await e.run();
    const got = e.state.get('m')?.out, one = massOf({ name: 'x', shape: { cyl: [0.014, 0.02] }, mat: 'steel-low' }) + massOf({ name: 'p', shape: { box: [0.13, 0.002, 0.012] }, mat: 'pp' });
    expect(e.state.get('m')?.status, e.state.get('m')?.error).toBe('ok');
    expect(got?.mass as number).toBeCloseTo(400 * one, 9);
    expect(got?.placed).toBe(800);
    // folding the four and the grid into a block of their own changes nothing
    const { board } = collapse(b, ['four', 'swarm'], 'Swarm', 'g');
    const f = new Engine(board); await f.run();
    expect(f.state.get('m')?.out?.mass as number).toBeCloseTo(400 * one, 9);
  });
});
