// Fewer draw calls for the same room: static meshes merged by material, each where it stood; what code holds, or a
// mirror turns inside out, left alone.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { held, mergeStatic } from '../../src/nexus/view/merge-static';

const box = (m: THREE.Material, x: number) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), m); b.position.set(x, 0, 0); return b; };
const bounds = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);

describe('compacting a built thing', () => {
  it('merges the leaves under each group by material, each in its place, and keeps what code holds', () => {
    const red = new THREE.MeshStandardMaterial({ color: 0xff0000 }), blue = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const root = new THREE.Group(), arm = new THREE.Group(); arm.position.set(0, 1, 0); root.add(arm);
    for (let i = 0; i < 5; i++) root.add(box(red, i));
    root.add(box(blue, 9), box(blue, 10));
    const light = box(red, 20); root.add(light);
    for (let i = 0; i < 3; i++) arm.add(box(red, i));
    const mirrored = box(red, 30); mirrored.scale.x = -1; root.add(mirrored);
    const was = bounds(root);
    const holder = { light, parts: [arm], byName: new Map([['l', light]]) };
    const r = mergeStatic(root, held(holder));
    // root: 5 red into 1, 2 blue into 1; the held light and the mirrored box stay; under the arm, 3 into 1
    expect(r).toEqual({ before: 5 + 2 + 3, after: 3 });
    expect(root.children.filter((c) => (c as THREE.Mesh).isMesh)).toHaveLength(4);
    expect(root.children).toContain(light); expect(root.children).toContain(mirrored); expect(arm.children).toHaveLength(1);
    expect(arm.children[0]!.userData.merged).toBe(3);
    // the same room: where everything was, it still is
    const now = bounds(root); expect(now.min.distanceTo(was.min)).toBeLessThan(1e-6); expect(now.max.distanceTo(was.max)).toBeLessThan(1e-6);
  });
  it('a holder\'s handles are found in its fields, arrays, maps and nested objects', () => {
    const a = new THREE.Mesh(), b = new THREE.Group(), c = new THREE.Mesh(), d = new THREE.Mesh();
    const h = held({ a, list: [b], m: new Map([['x', { deep: c }]]), mat: new THREE.MeshBasicMaterial(), s: new Set([d]) });
    for (const o of [a, b, c, d]) expect(h.has(o)).toBe(true);
  });
});
