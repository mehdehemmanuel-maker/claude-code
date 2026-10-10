// The body laid out in space from its proportions: every bone placed (all 206), its joints where Drillis & Contini
// put them, its long bones the lengths Trotter & Gleser give for its height, everything adjustable; the skin meshed by
// surface nets, closed and quick; every living thing drawn in 3D without a fault.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PARAMS, bodyOf, dist, layOut, placeIn, surfaceNets, type Prim } from '../../src/nexus/world/anatomy';
import { INVENTORY } from '../../src/nexus/parts/inventory';
import { lookOf, planOf } from '../../src/nexus/parts/pieces';
import { organicInto, skinGeos } from '../../src/nexus/view/organic';

describe('a body laid out', () => {
  it('places all 206 bones, each a bone of the inventory, the long bones as long as its height says', () => {
    const b = layOut();
    expect(b.bones.length).toBe(206);
    for (const x of b.bones) expect(INVENTORY.get(x.id)?.path.slice(0, 3), x.id).toEqual(['Life', 'Human', 'Bones']);
    const femur = b.bones.find((x) => x.id === 'femur')!, tibia = b.bones.find((x) => x.id === 'tibia')!;
    expect(2.38 * dist(femur.a, femur.b) * 100 + 61.41).toBeGreaterThan(171); expect(2.38 * dist(femur.a, femur.b) * 100 + 61.41).toBeLessThan(181);
    expect(2.52 * dist(tibia.a, tibia.b) * 100 + 78.62).toBeGreaterThan(171); expect(2.52 * dist(tibia.a, tibia.b) * 100 + 78.62).toBeLessThan(181);
    // joints at Drillis & Contini's fractions of stature
    const H = b.H; expect(b.joints.kneeL![1] / H).toBeCloseTo(0.285, 2); expect(b.joints.hipL![1] / H).toBeCloseTo(0.53, 2); expect(b.joints.ankleL![1] / H).toBeCloseTo(0.039, 3);
    expect(dist(b.joints.acromionL!, b.joints.acromionR!) / H).toBeGreaterThan(0.24); expect(dist(b.joints.acromionL!, b.joints.acromionR!) / H).toBeLessThan(0.27);
    expect(b.muscles.length).toBeGreaterThan(110); expect(b.organs.length).toBeGreaterThanOrEqual(30);
  });
  it('is worked out again from any of its numbers: taller, longer-legged, a wider jaw, all within their ranges', () => {
    const tall = layOut({ height: 1.95 }), legs = layOut({ legs: 1.1 }), jaw = layOut({ jaw: 1.2 }), ref = layOut();
    expect(tall.joints.kneeL![1]).toBeGreaterThan(ref.joints.kneeL![1] * 1.1);
    expect(legs.joints.hipL![1]).toBeGreaterThan(ref.joints.hipL![1]); expect(legs.joints.crown![1]).toBeCloseTo(ref.joints.crown![1], 6);
    expect(jaw.bones.find((x) => x.id === 'mandible')!.size[1]).toBeGreaterThan(ref.bones.find((x) => x.id === 'mandible')!.size[1]);
    expect(bodyOf({ height: 9 }).height).toBe(2.1); expect(PARAMS.length).toBeGreaterThan(18);
    expect(placeIn(ref, 'skeleton', 'skull')!.c[1]).toBeGreaterThan(1.5); expect(placeIn(ref, 'digestive-system', 'liver')!.c[0]).toBeLessThan(0); // the liver on the body's right
  });
  it('meshes a field by surface nets: a sphere closed, its area and volume as a sphere\'s', () => {
    const r = 0.1, m = surfaceNets([{ a: [0, 0, 0], b: [0, 0, 0], r, r2: r, k: 0 } as Prim], 0.005);
    const P = m.pos, I = m.idx; let area = 0, vol = 0; const edges = new Map<string, number>();
    for (let t = 0; t < I.length; t += 3) {
      const [a, b, c] = [I[t]!, I[t + 1]!, I[t + 2]!].map((i) => new THREE.Vector3(P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
      area += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2; vol += a.dot(b.clone().cross(c)) / 6;
      for (const [u, v] of [[I[t]!, I[t + 1]!], [I[t + 1]!, I[t + 2]!], [I[t + 2]!, I[t]!]]) { const k = u! < v! ? `${u},${v}` : `${v},${u}`; edges.set(k, (edges.get(k) ?? 0) + 1); }
    }
    expect(area / (4 * Math.PI * r * r)).toBeGreaterThan(0.95); expect(area / (4 * Math.PI * r * r)).toBeLessThan(1.1);
    expect(Math.abs(vol) / ((4 / 3) * Math.PI * r ** 3)).toBeGreaterThan(0.95); expect(Math.abs(vol) / ((4 / 3) * Math.PI * r ** 3)).toBeLessThan(1.05);
    expect([...edges.values()].every((n) => n === 2)).toBe(true); // closed: every edge between two faces
  });
  it('draws the skin quickly, and every living thing in 3D without a fault', () => {
    const b = layOut(), t0 = performance.now(), skin = skinGeos(b, 'test'), ms = performance.now() - t0;
    expect(skin.reduce((a, g) => a + g.attributes.position!.count, 0)).toBeGreaterThan(20000); expect(ms).toBeLessThan(4000);
    let n = 0;
    for (const i of INVENTORY.values()) {
      if (i.path[0] !== 'Life') continue;
      const g = new THREE.Group(), l = lookOf(i);
      organicInto({ ...l, size: [0.1, 0.06, 0.05] }, g, (geo, m) => { const me = new THREE.Mesh(geo, m ?? new THREE.MeshBasicMaterial()); g.add(me); return me; });
      expect(g.children.length, i.id).toBeGreaterThan(0);
      for (const c of g.children) { const p = (c as THREE.Mesh).geometry.attributes.position!; for (let k = 0; k < p.count; k += 97) expect(Number.isFinite(p.getX(k)), i.id).toBe(true); }
      n++;
    }
    expect(n).toBeGreaterThan(800);
    const p = planOf('skeleton', 0.55)!; expect(p.inPlace).toBe(true); expect(p.pieces.find((x) => x.id === 'skull')!.whole[1]).toBeGreaterThan(0.15);
  });
});
