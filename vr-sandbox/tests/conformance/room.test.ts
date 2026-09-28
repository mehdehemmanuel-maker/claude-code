// The user's real room (scanned planes and meshes) as static colliders.

import { describe, expect, it } from 'vitest';
import { at, rig } from './helpers';
import { axisAngle } from '../../src/doc/math';
import type { RoomSurface } from '../../src/physics/protocol';

const rect = (w: number, d: number) => [-w / 2, -d / 2, w / 2, -d / 2, w / 2, d / 2, -w / 2, d / 2];

/** An axis-aligned box as a closed triangle mesh (outward faces), like a scanned sofa or cabinet. */
function boxMesh(w: number, h: number, d: number): { vertices: number[]; indices: number[] } {
  const x = w / 2, z = d / 2;
  const v = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-x, h, -z], [x, h, -z], [x, h, z], [-x, h, z]];
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
  return { vertices: v.flat(), indices: f.flat() };
}

describe('real room colliders', () => {
  it('parts rest on a scanned table top, on a scanned mesh, and stop at a scanned wall', async () => {
    const r = await rig({}, false);
    const surfaces: RoomSurface[] = [
      { id: 'floor', kind: 'plane', label: 'floor', pose: at(0, 0, 0), polygon: rect(8, 8) },
      { id: 'table', kind: 'plane', label: 'table', pose: at(1, 0.74, 0), polygon: rect(1.2, 0.7) },
      // a wall 2 m away along -z, facing +z (into the room)
      { id: 'wall', kind: 'plane', label: 'wall', pose: at(0, 1.2, -2, axisAngle([1, 0, 0], Math.PI / 2)), polygon: rect(8, 2.4) },
      { id: 'sofa', kind: 'mesh', label: 'couch', pose: at(-1.5, 0, 0), ...boxMesh(1.8, 0.45, 0.9) },
    ];
    r.world.apply({ op: 'room', surfaces });
    expect(r.world.roomColliderCount()).toBe(4);
    const onTable = r.part('block', at(1, 1.2, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const onSofa = r.part('block', at(-1.5, 1.0, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const onFloor = r.part('block', at(0.6, 0.5, 1.5), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const thrown = r.part('sphere', at(0, 0.3, -1), { material: 'rubber.natural', params: { diameter: 0.1 } });
    r.world.apply({ op: 'setPose', id: thrown.id, pose: at(0, 0.3, -1), linear: [0, 0, -4] });
    r.run(1.5);
    expect(r.pos(onTable)[1]).toBeCloseTo(0.79, 2);
    expect(r.pos(onSofa)[1]).toBeCloseTo(0.5, 2);
    expect(r.pos(onFloor)[1]).toBeCloseTo(0.05, 2);
    // the ball bounced off the wall and stayed in the room
    expect(r.pos(thrown)[2]).toBeGreaterThan(-1.96);
    // replacing the scan replaces the colliders: without the table the block falls to the floor
    r.world.apply({ op: 'room', surfaces: surfaces.filter((s) => s.id !== 'table') });
    r.run(2);
    expect(r.pos(onTable)[1]).toBeLessThan(0.1); // down on the floor (it may land tumbling)
    r.done();
  });
});
