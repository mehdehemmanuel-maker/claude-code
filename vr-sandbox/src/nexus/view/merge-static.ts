// Fewer draw calls for the same room: under each group, the meshes nothing moves on its own (a rack's uprights, a
// robot's vents and bolts, a bench's legs) merged into one mesh per material, each in its place. A headset draws every
// mesh once per eye; hundreds of little ones cost more frame than their triangles do. What anything keeps a handle on
// (a light that changes colour, a wheel that turns, a tote shown and hidden) is left as it is, and so is a mesh turned
// inside out by a mirror, which would merge wrong side out.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** The objects a holder keeps a handle on: in its own fields, and in the arrays, maps, sets and plain objects in them,
 *  a few levels down. Those are what its code moves, colours or hides one by one. */
export function held(...holders: unknown[]): Set<THREE.Object3D> {
  const out = new Set<THREE.Object3D>(), seen = new Set<unknown>();
  const walk = (x: unknown, depth: number): void => {
    if (!x || typeof x !== 'object' || seen.has(x) || depth > 4) return;
    seen.add(x);
    if ((x as THREE.Object3D).isObject3D) { out.add(x as THREE.Object3D); if (depth > 0) return; }
    if (x instanceof Map) { for (const v of x.values()) walk(v, depth + 1); return; }
    if (x instanceof Set || Array.isArray(x)) { for (const v of x) walk(v, depth + 1); return; }
    // only plain objects and class instances: not typed arrays, materials' insides and the like
    if (ArrayBuffer.isView(x) || (x as THREE.Material).isMaterial || (x as THREE.BufferGeometry).isBufferGeometry) return;
    for (const v of Object.values(x as Record<string, unknown>)) walk(v, depth + 1);
  };
  for (const h of holders) walk(h, 0);
  return out;
}

const plain = (o: THREE.Object3D): o is THREE.Mesh => {
  const m = o as THREE.Mesh;
  return !!m.isMesh && !(m as unknown as THREE.InstancedMesh).isInstancedMesh && !(m as unknown as THREE.SkinnedMesh).isSkinnedMesh && !Array.isArray(m.material) && o.children.length === 0 && !!m.geometry?.attributes.position && !m.morphTargetInfluences;
};
const keyOf = (m: THREE.Mesh): string => {
  const g = m.geometry, attrs = Object.keys(g.attributes).filter((a) => a === 'position' || a === 'normal' || a === 'uv').sort().join(',');
  return [(m.material as THREE.Material).uuid, g.index ? 'i' : 'n', attrs, m.renderOrder, m.castShadow ? 1 : 0, m.receiveShadow ? 1 : 0, m.layers.mask, m.visible ? 1 : 0, m.frustumCulled ? 1 : 0].join('|');
};

/** Under every group of root, the leaf meshes that nothing keeps a handle on merged by material. The number of meshes
 *  before and after. Run it once a thing is built; what is added after stays as it is. */
export function mergeStatic(root: THREE.Object3D, keep: Set<THREE.Object3D> = new Set()): { before: number; after: number } {
  let before = 0, after = 0;
  const parents: THREE.Object3D[] = []; root.traverse((o) => { if (o.children.length) parents.push(o); });
  for (const p of parents) {
    const groups = new Map<string, THREE.Mesh[]>();
    for (const c of p.children) {
      if (!plain(c) || keep.has(c)) continue;
      c.updateMatrix();
      if (c.matrix.determinant() <= 0) continue; // mirrored or flat: its faces would turn inside out
      const k = keyOf(c); let list = groups.get(k); if (!list) groups.set(k, (list = [])); list.push(c);
    }
    for (const list of groups.values()) {
      before += list.length;
      if (list.length < 2) { after += list.length; continue; }
      const names = Object.keys(list[0]!.geometry.attributes).filter((a) => a === 'position' || a === 'normal' || a === 'uv');
      const geos = list.map((m) => { const g = new THREE.BufferGeometry(); for (const a of names) g.setAttribute(a, m.geometry.attributes[a]!); if (m.geometry.index) g.setIndex(m.geometry.index); return g.applyMatrix4(m.matrix); });
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) { after += list.length; continue; }
      merged.computeBoundingSphere();
      const first = list[0]!, mesh = new THREE.Mesh(merged, first.material);
      mesh.renderOrder = first.renderOrder; mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow; mesh.layers.mask = first.layers.mask; mesh.frustumCulled = first.frustumCulled;
      mesh.name = `merged ×${list.length}`; mesh.userData.merged = list.length;
      for (const m of list) p.remove(m);
      p.add(mesh); after += 1;
    }
  }
  return { before, after };
}
