// Projection: what a renderer may draw is a pure function of bound records. A scene holds a box for every body a
// configuration binds and nothing else; every number in it is a record's value and names the record; the scene's
// identity is the content hash of the records it projects, so a change in any record changes the scene. A renderer
// is a consumer of this and decides nothing.

import type { Prism } from './coupling';
import type { Derivation } from './evaluate';
import { hashOf } from './identity';

export interface Projected { value: number; record: string }
export interface SceneBody {
  name: string;
  material: string;
  extents: { x: Projected; y: Projected; z: Projected };
  centre: { x: Projected; y: Projected; z: Projected };
}
export interface Scene { frame: string; bodies: SceneBody[]; hash: string }

const take = (d: Derivation, what: string): Projected => {
  if (d.value === null) throw new Error(`${what}: ${d.name} has no value (${d.status}); nothing is drawn from an unknown`);
  return { value: d.value, record: d.hash };
};

/** The scene of placed bodies in the declared frame. A body without a coordinate is not in it: it is not placed, so it is not drawn. */
export function project(frame: { hash: string; declaration: string }, bodies: Prism[]): Scene {
  const out: SceneBody[] = [];
  for (const b of bodies) {
    if (!b.centre) throw new Error(`${b.name} is not placed: no coordinate binds it, so it cannot be drawn`);
    out.push({
      name: b.name, material: b.material,
      extents: { x: take(b.extents.x, b.name), y: take(b.extents.y, b.name), z: take(b.extents.z, b.name) },
      centre: { x: take(b.centre.x, b.name), y: take(b.centre.y, b.name), z: take(b.centre.z, b.name) },
    });
  }
  return { frame: frame.declaration, bodies: out, hash: hashOf({ scene: true, frame: frame.hash, bodies: out.map((b) => ({ name: b.name, records: [b.extents.x.record, b.extents.y.record, b.extents.z.record, b.centre.x.record, b.centre.y.record, b.centre.z.record] })) }) };
}
