// VisualShape -> three.js objects. Geometries are cached by shape so identical parts share GPU buffers.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { VisualShape } from '../parts/shapes';

const cache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = cache.get(key);
  if (!g) {
    g = make();
    g.computeBoundingSphere();
    cache.set(key, g);
  }
  return g;
}

const r4 = (x: number) => Math.round(x * 1e5) / 1e5;

function extrudeAlongX(shape: THREE.Shape, halfLength: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: halfLength * 2, bevelEnabled: false, curveSegments: 8 });
  // Extrusion runs along +Z from 0; centre it and turn it to run along X.
  g.translate(0, 0, -halfLength);
  g.rotateY(Math.PI / 2);
  return g;
}

export function geometryFor(s: Exclude<VisualShape, { type: 'group' } | { type: 'wheel' }>): THREE.BufferGeometry {
  switch (s.type) {
    case 'box': {
      const [x, y, z] = s.half.map(r4) as [number, number, number];
      const bevel = Math.min(s.bevel ?? 0, x * 0.5, y * 0.5, z * 0.5);
      return cached(`box:${x}:${y}:${z}:${bevel}`, () =>
        bevel > 0 ? new RoundedBoxGeometry(x * 2, y * 2, z * 2, 2, bevel) : new THREE.BoxGeometry(x * 2, y * 2, z * 2));
    }
    case 'cylinder': {
      const seg = s.segments ?? Math.max(12, Math.min(48, Math.round(s.radius * 800)));
      return cached(`cyl:${r4(s.radius)}:${r4(s.halfHeight)}:${seg}`, () => new THREE.CylinderGeometry(s.radius, s.radius, s.halfHeight * 2, seg));
    }
    case 'sphere':
      return cached(`sph:${r4(s.radius)}`, () => new THREE.SphereGeometry(s.radius, 32, 20));
    case 'tube':
      return cached(`tube:${r4(s.outer)}:${r4(s.inner)}:${r4(s.halfHeight)}`, () => {
        const h = s.halfHeight;
        const pts = [new THREE.Vector2(s.inner, -h), new THREE.Vector2(s.outer, -h), new THREE.Vector2(s.outer, h), new THREE.Vector2(s.inner, h), new THREE.Vector2(s.inner, -h)];
        return new THREE.LatheGeometry(pts, 32);
      });
    case 'rect-tube':
      return cached(`rtube:${r4(s.halfW)}:${r4(s.halfH)}:${r4(s.wall)}:${r4(s.halfLength)}`, () => {
        const outer = new THREE.Shape();
        outer.moveTo(-s.halfW, -s.halfH); outer.lineTo(s.halfW, -s.halfH); outer.lineTo(s.halfW, s.halfH); outer.lineTo(-s.halfW, s.halfH); outer.closePath();
        const iw = s.halfW - s.wall, ih = s.halfH - s.wall;
        const hole = new THREE.Path();
        hole.moveTo(-iw, -ih); hole.lineTo(-iw, ih); hole.lineTo(iw, ih); hole.lineTo(iw, -ih); hole.closePath();
        outer.holes.push(hole);
        return extrudeAlongX(outer, s.halfLength);
      });
    case 'ibeam':
      return cached(`ibeam:${r4(s.flange)}:${r4(s.depth)}:${r4(s.tf)}:${r4(s.tw)}:${r4(s.halfLength)}`, () => {
        const b = s.flange / 2, h = s.depth / 2, tw = s.tw / 2;
        const sh = new THREE.Shape();
        // profile in (z, y) -> extrusion maps shape x to world z after rotation
        sh.moveTo(-b, -h); sh.lineTo(b, -h); sh.lineTo(b, -h + s.tf); sh.lineTo(tw, -h + s.tf); sh.lineTo(tw, h - s.tf);
        sh.lineTo(b, h - s.tf); sh.lineTo(b, h); sh.lineTo(-b, h); sh.lineTo(-b, h - s.tf); sh.lineTo(-tw, h - s.tf);
        sh.lineTo(-tw, -h + s.tf); sh.lineTo(-b, -h + s.tf); sh.closePath();
        return extrudeAlongX(sh, s.halfLength);
      });
    case 'angle':
      return cached(`angle:${r4(s.legA)}:${r4(s.t)}:${r4(s.halfLength)}`, () => {
        const a = s.legA, t = s.t;
        const sh = new THREE.Shape();
        // (z, y) profile matching the collision boxes: legs along +z and +y from the corner
        sh.moveTo(0, 0); sh.lineTo(-a, 0); sh.lineTo(-a, t); sh.lineTo(-t, t); sh.lineTo(-t, a); sh.lineTo(0, a); sh.closePath();
        const g = extrudeAlongX(sh, s.halfLength);
        return g;
      });
    case 'wedge':
      return cached(`wedge:${r4(s.length)}:${r4(s.height)}:${r4(s.width)}`, () => {
        const L = s.length / 2, H = s.height / 2, W = s.width / 2;
        const v = [
          [-L, -H, -W], [L, -H, -W], [L, H, -W], // back triangle (z = -W)
          [-L, -H, W], [L, -H, W], [L, H, W], // front triangle (z = +W)
        ];
        const tri = (a: number, b: number, c: number) => [...v[a]!, ...v[b]!, ...v[c]!];
        const pos = [
          ...tri(0, 2, 1), ...tri(3, 4, 5), // sides
          ...tri(0, 1, 4), ...tri(0, 4, 3), // bottom
          ...tri(1, 2, 5), ...tri(1, 5, 4), // back vertical face (x = +L)
          ...tri(0, 3, 5), ...tri(0, 5, 2), // sloped face
        ];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        return g;
      });
  }
}

/** Build the display object for a part. `tinted` materials are resolved by the caller. */
export function buildVisual(s: VisualShape, main: THREE.Material, tint: (hex: number) => THREE.Material): THREE.Object3D {
  if (s.type === 'group') {
    const g = new THREE.Group();
    for (const c of s.children) {
      const child = buildVisual(c.shape, c.tint !== undefined ? tint(c.tint) : main, tint);
      child.position.set(...c.p);
      child.quaternion.set(...c.q);
      g.add(child);
    }
    return g;
  }
  if (s.type === 'wheel') {
    const g = new THREE.Group();
    const tyre = new THREE.Mesh(geometryFor({ type: 'cylinder', radius: s.radius, halfHeight: s.halfWidth, segments: 40 }), main);
    const hub = new THREE.Mesh(geometryFor({ type: 'cylinder', radius: s.hub, halfHeight: s.halfWidth * 1.06, segments: 20 }), tint(0x9aa0a6));
    g.add(tyre, hub);
    return g;
  }
  return new THREE.Mesh(geometryFor(s), main);
}

/** Visual for a spring: a unit-height helix along +Y, scaled per frame to the current length. */
export function helixGeometry(turns: number, radius: number, wire: number) {
  return cached(`helix:${turns}:${r4(radius)}:${r4(wire)}`, () => {
    const pts: THREE.Vector3[] = [];
    const n = Math.max(24, Math.round(turns * 24));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, t, Math.sin(a) * radius));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire / 2, 6, false);
  });
}
