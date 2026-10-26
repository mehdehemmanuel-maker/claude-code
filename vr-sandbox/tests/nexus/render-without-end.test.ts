// What drawing something without end needs (src/nexus/view/space3d.ts): cost that follows the screen, not the scene; a
// thing ten million kilometres out placed as exactly as one at hand; a world that repeats for ever, drawn from anywhere.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { arrayGrid, cellPick, place, placedCount, type Assembly } from '../../src/nexus/assembly';
import { runBlock } from '../../src/nexus/dataflow';
import { SpaceView } from '../../src/nexus/view/space3d';
import type { Part } from '../../src/nexus/kits';

const cam = (pos: [number, number, number], at: [number, number, number]) => { const c = new THREE.PerspectiveCamera(50, 16 / 9, 0.01, 1e13); c.position.set(...pos); c.lookAt(...at); c.updateMatrixWorld(); return c; };
const build = (v: SpaceView, c: THREE.PerspectiveCamera) => { (v as unknown as { dirty: boolean; lastBuild: number }).dirty = true; (v as unknown as { lastBuild: number }).lastBuild = -1e9; v.update(c, 900, performance.now() + Math.random()); return { ...v.stats }; };
const box = (name: string, s: number, color = 0x888888): Part => ({ name, shape: { box: [s, s, s] }, mat: 'steel-low', at: [0, 0, 0], color });
/** A house-like thing: a slab, four walls, a roof; a street of them. */
const house: Assembly = { name: 'house', items: [place(box('slab', 10, 0x55aa55), [0, -5, 0]), ...[0, 1, 2, 3].map((k) => place(box('wall', 2), [k * 2 - 3, 1, 0])), place(box('roof', 4, 0x884422), [0, 3, 0])] };

describe('drawing without end', () => {
  it('places a thing ten million kilometres out as exactly as one at hand', () => {
    for (const X of [0, 1e7, 1e10]) {
      const v = new SpaceView(); v.show([{ key: 'h', thing: { name: 'far', items: [place(house, [X, 0, 0])] } }]); build(v, cam([X + 20, 5, 20], [X, 0, 0]));
      for (const m of v.group.children as THREE.InstancedMesh[]) { if (!m.count) continue; const a = m.instanceMatrix.array as Float32Array; for (let i = 0; i < m.count; i++) expect(Math.abs(a[i * 16 + 12]!)).toBeLessThan(100); expect(Math.abs(m.position.x - X)).toBeLessThan(100); }
    }
  });
  it('leaves out what is behind the view, and costs what the screen holds, not what exists', () => {
    const field = arrayGrid(arrayGrid(house, 32, 32, [14, 0, 14]), 1024, 1024, [460, 0, 460]);
    expect(placedCount(field)).toBeGreaterThan(5e9);
    const v = new SpaceView(); v.show([{ key: 'f', thing: field }]);
    const ahead = cam([0, 2, 0], [100, 2, 30]), away = cam([0, 2, 0], [-100, 50, -30]);
    let s = build(v, ahead); for (let k = 0; k < 6; k++) s = build(v, ahead);
    expect(s.instances).toBeLessThan(320_000); expect(s.culled).toBeGreaterThan(0);
    const t0 = performance.now(); build(v, ahead); expect(performance.now() - t0).toBeLessThan(3000);
    const back = build(v, away); expect(back.instances).toBeLessThan(s.instances);
  }, 120_000);
  it('a world that repeats for ever is drawn from the street, from high above, and a billion metres out', async () => {
    const other: Assembly = { name: 'other', items: [place(box('slab', 10, 0x5577aa), [0, -5, 0])] };
    const world = (await runBlock('forever', { things: [house, other], sx: 12, sz: 12 })).world as Assembly;
    expect(world.tiled?.variants.length).toBe(2);
    const v = new SpaceView(); v.show([{ key: 'w', thing: world }]); v.range = 5000;
    for (const [from, at] of [[[0, 2, 0], [50, 0, 20]], [[0, 3000, 0], [9000, 0, 6000]], [[1e9, 2, 1e9], [1e9 + 50, 0, 1e9 + 20]]] as [[number, number, number], [number, number, number]][]) {
      const s = build(v, cam(from, at)); expect(s.instances).toBeGreaterThan(0); expect(s.instances).toBeLessThan(320_000);
    }
  });
  it('the cell a variant is picked for is the same wherever it is seen from, and the variants are mixed', () => {
    const seen = new Set<number>(); for (let i = -50; i < 50; i++) for (let k = -50; k < 50; k++) { expect(cellPick(i, 0, k, 3, 4)).toBe(cellPick(i, 0, k, 3, 4)); seen.add(cellPick(i, 0, k, 3, 4)); }
    expect(seen.size).toBe(4);
  });
});
