// Engine-agnostic shape descriptions. Physics turns `CollisionShape` into Jolt shapes; the renderer turns
// `VisualShape` into three.js geometry. Cylinders are along local +Y, boxes are centred.

import type { Quat, Vec3 } from '../doc/types';

export type ConvexShape =
  | { type: 'box'; half: Vec3 }
  | { type: 'cylinder'; radius: number; halfHeight: number }
  | { type: 'sphere'; radius: number }
  | { type: 'hull'; points: Vec3[] };

export type CollisionShape = ConvexShape | { type: 'compound'; children: { shape: ConvexShape; p: Vec3; q: Quat }[] };

export type VisualShape =
  | { type: 'box'; half: Vec3; bevel?: number }
  | { type: 'cylinder'; radius: number; halfHeight: number; segments?: number }
  | { type: 'sphere'; radius: number }
  | { type: 'tube'; outer: number; inner: number; halfHeight: number }
  | { type: 'rect-tube'; halfW: number; halfH: number; wall: number; halfLength: number }
  | { type: 'ibeam'; halfLength: number; flange: number; depth: number; tf: number; tw: number }
  | { type: 'angle'; halfLength: number; legA: number; legB: number; t: number }
  | { type: 'wedge'; length: number; height: number; width: number }
  | { type: 'wheel'; radius: number; halfWidth: number; hub: number }
  | { type: 'group'; children: { shape: VisualShape; p: Vec3; q: Quat; tint?: number }[] }
  /** A triangle mesh (an invented form): `key` names it for caching. */
  | { type: 'mesh'; key: string; positions: Float32Array; indices: Uint32Array };

/** Closest point on the surface of a convex shape (local space) and its outward normal. */
export function closestOnShape(shape: CollisionShape, pt: Vec3): { p: Vec3; n: Vec3; d: number } {
  if (shape.type === 'compound') {
    let best: { p: Vec3; n: Vec3; d: number } | null = null;
    for (const c of shape.children) {
      // children are unrotated in our part library (boxes / cylinders placed along axes); rotation is honoured below
      const local = invRotate(c.q, [pt[0] - c.p[0], pt[1] - c.p[1], pt[2] - c.p[2]]);
      const r = closestOnShape(c.shape, local);
      const p = rotateV(c.q, r.p);
      const n = rotateV(c.q, r.n);
      const w: Vec3 = [p[0] + c.p[0], p[1] + c.p[1], p[2] + c.p[2]];
      if (!best || r.d < best.d) best = { p: w, n, d: r.d };
    }
    return best ?? { p: [0, 0, 0], n: [0, 1, 0], d: Infinity };
  }
  if (shape.type === 'box') {
    const h = shape.half;
    const c: Vec3 = [clamp(pt[0], -h[0], h[0]), clamp(pt[1], -h[1], h[1]), clamp(pt[2], -h[2], h[2])];
    const inside = c[0] === pt[0] && c[1] === pt[1] && c[2] === pt[2];
    if (!inside) {
      const d: Vec3 = [pt[0] - c[0], pt[1] - c[1], pt[2] - c[2]];
      const len = Math.hypot(...d);
      // Prefer the face normal of the dominant axis so a magnet sees a flat steel face.
      const ax = [Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2])];
      const i = ax[0]! >= ax[1]! && ax[0]! >= ax[2]! ? 0 : ax[1]! >= ax[2]! ? 1 : 2;
      const n: Vec3 = [0, 0, 0];
      n[i] = Math.sign(d[i]!) || 1;
      return { p: c, n, d: len };
    }
    // inside: nearest face
    const gaps = [h[0] - Math.abs(pt[0]), h[1] - Math.abs(pt[1]), h[2] - Math.abs(pt[2])];
    const i = gaps[0]! <= gaps[1]! && gaps[0]! <= gaps[2]! ? 0 : gaps[1]! <= gaps[2]! ? 1 : 2;
    const n: Vec3 = [0, 0, 0];
    n[i] = Math.sign(pt[i]!) || 1;
    const p: Vec3 = [pt[0], pt[1], pt[2]];
    p[i] = n[i]! * h[i]!;
    return { p, n, d: 0 };
  }
  if (shape.type === 'sphere') {
    const len = Math.hypot(...pt) || 1e-9;
    const n: Vec3 = [pt[0] / len, pt[1] / len, pt[2] / len];
    return { p: [n[0] * shape.radius, n[1] * shape.radius, n[2] * shape.radius], n, d: Math.max(0, len - shape.radius) };
  }
  if (shape.type === 'cylinder') {
    const r = Math.hypot(pt[0], pt[2]);
    const dy = Math.abs(pt[1]) - shape.halfHeight;
    const dr = r - shape.radius;
    if (dy > dr) {
      // closer to a cap
      const s = Math.sign(pt[1]) || 1;
      const k = r > shape.radius ? shape.radius / r : 1;
      return { p: [pt[0] * k, s * shape.halfHeight, pt[2] * k], n: [0, s, 0], d: Math.max(0, dy) };
    }
    const k = r > 1e-9 ? shape.radius / r : 0;
    const n: Vec3 = r > 1e-9 ? [pt[0] / r, 0, pt[2] / r] : [1, 0, 0];
    return { p: [pt[0] * k, clamp(pt[1], -shape.halfHeight, shape.halfHeight), pt[2] * k], n, d: Math.max(0, dr) };
  }
  // hull: approximate with its bounding box
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const q of shape.points) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, q[i]!); max[i] = Math.max(max[i]!, q[i]!); }
  const centre: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const r = closestOnShape({ type: 'box', half: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2] },
    [pt[0] - centre[0], pt[1] - centre[1], pt[2] - centre[2]]);
  return { p: [r.p[0] + centre[0], r.p[1] + centre[1], r.p[2] + centre[2]], n: r.n, d: r.d };
}

/** Axis-aligned local bounds of a collision shape. */
export function shapeBounds(shape: CollisionShape): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  const grow = (p: Vec3) => {
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]!); }
  };
  const visit = (s: ConvexShape, off: Vec3, q: Quat) => {
    const corners: Vec3[] = [];
    if (s.type === 'box') {
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x * s.half[0], y * s.half[1], z * s.half[2]]);
    } else if (s.type === 'cylinder') {
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x * s.radius, y * s.halfHeight, z * s.radius]);
    } else if (s.type === 'sphere') {
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x * s.radius, y * s.radius, z * s.radius]);
    } else {
      corners.push(...s.points);
    }
    for (const c of corners) {
      const r = rotateV(q, c);
      grow([r[0] + off[0], r[1] + off[1], r[2] + off[2]]);
    }
  };
  if (shape.type === 'compound') for (const c of shape.children) visit(c.shape, c.p, c.q);
  else visit(shape, [0, 0, 0], [0, 0, 0, 1]);
  return { min, max };
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function rotateV(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}

const invRotate = (q: Quat, v: Vec3) => rotateV([-q[0], -q[1], -q[2], q[3]], v);
