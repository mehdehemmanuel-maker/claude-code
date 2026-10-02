// Places: the ground a place is grown as is the ground parts stand on, on the same triangles the renderer draws, and
// its water floats what would float.

import { describe, expect, it } from 'vitest';
import { at, rig, within } from './helpers';
import { getMaterial, FLUIDS } from '../../src/data/materials';
import { groundAt, heightfield, placeFromWords } from '../../src/world/place';

describe('a place\'s ground', () => {
  it('a block set down anywhere on a beach rests on the sand the place says is there (it holds on the 1-in-20 slope)', async () => {
    const p = placeFromWords('take me to a beach')!;
    const f = heightfield(p);
    const r = await rig({}, false);
    r.world.apply({ op: 'terrain', field: { n: f.n, size: f.size, heights: f.heights }, material: getMaterial(p.ground.material) });
    const spots: [number, number][] = [[0, 0], [3.3, 7.1], [-6.2, 12.4], [11.9, 20.5], [-17.3, 4.4], [8.8, -3.6]];
    const blocks = spots.map(([x, z]) => r.part('block', at(x, groundAt(f, x, z) + 0.1, z), { material: 'wood.white-pine', params: { x: 0.1, y: 0.1, z: 0.1 } }));
    r.run(3);
    spots.forEach(([x, z], i) => {
      const [bx, by, bz] = r.pos(blocks[i]!);
      // where it was set down, its centre half its height above the ground (within a few millimetres: it tilts with the sand)
      expect(Math.abs(by - (groundAt(f, bx, bz) + 0.05)), `at ${x}, ${z}`).toBeLessThan(0.006);
      expect(Math.hypot(bx - x, bz - z)).toBeLessThan(0.05);
    });
    r.done();
  });

  it('the beach runs down into the sea, and a pine block floats in it at its density over seawater\'s', async () => {
    const p = placeFromWords('beach')!;
    const f = heightfield(p);
    expect(f.waterLevel).not.toBeNull();
    const w = f.waterLevel!;
    const r = await rig({ fluids: [{ id: 'w_000000sea001', name: 'the sea', min: [-f.size / 2, f.min - 1, -f.size / 2], max: [f.size / 2, w, f.size / 2], density: p.water!.density }] }, false);
    r.world.apply({ op: 'terrain', field: { n: f.n, size: f.size, heights: f.heights }, material: getMaterial(p.ground.material) });
    // 20 m out to sea, the water is deep enough to float a 0.2 m block
    const z = p.ground.shore - 20;
    expect(w - groundAt(f, 0, z)).toBeGreaterThan(0.5);
    const block = r.part('block', at(0, w + 0.3, z), { material: 'wood.white-pine', params: { x: 0.2, y: 0.2, z: 0.2 } });
    const ys: number[] = [];
    r.run(20, (t) => { if (t > 18) ys.push(r.pos(block)[1]); });
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    within((w - (y - 0.1)) / 0.2, getMaterial('wood.white-pine').density / p.water!.density, 0.01);
    expect(FLUIDS.freshWater.density).toBeLessThan(p.water!.density);
    r.done();
  });
});
