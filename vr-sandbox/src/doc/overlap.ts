// Two solids cannot share space (M-4), and a design is makeable only if none of its parts is placed where another is
// (A-5): the separation between two parts' collision shapes, negative by the depth they overlap. Spheres against
// boxes and spheres are exact. Everything else is the separating axis theorem on each solid's own support width (a
// box's half-widths, a cylinder's half-height along its axis and its radius across it) over the two solids' axes,
// their cross products, the line between their centres and, for a cylinder, the radial toward the other solid: exact
// for two boxes, and for anything resting on a face or standing on its end; a cylinder's rim against a box's edge
// may read a little deeper than it is (never shallower: the projection along every one of these axes is exact, so
// what is apart along any of them is reported apart).

import { rotate } from './math';
import type { Pose, Vec3 } from './types';

export type Solid = { type: 'box'; half: Vec3 } | { type: 'sphere'; radius: number } | { type: 'cylinder'; radius: number; halfHeight: number };

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const axesOf = (p: Pose): Vec3[] => [rotate(p.q, [1, 0, 0]), rotate(p.q, [0, 1, 0]), rotate(p.q, [0, 0, 1])];
const asBox = (s: Solid): Vec3 | null => (s.type === 'box' ? s.half : s.type === 'cylinder' ? [s.radius, s.halfHeight, s.radius] : null);

/** Half of how wide a solid is along a unit axis `u`, given its own axes: its support width. */
function extent(s: Solid, axes: Vec3[], u: Vec3): number {
  if (s.type === 'box') return s.half[0] * Math.abs(dot(axes[0]!, u)) + s.half[1] * Math.abs(dot(axes[1]!, u)) + s.half[2] * Math.abs(dot(axes[2]!, u));
  if (s.type === 'sphere') return s.radius;
  const c = Math.abs(dot(axes[1]!, u));
  return s.halfHeight * c + s.radius * Math.sqrt(Math.max(0, 1 - c * c));
}

function convex(a: Pose, sa: Solid, b: Pose, sb: Solid): number {
  const A = axesOf(a), B = axesOf(b), d = sub(b.p, a.p);
  let best = -Infinity;
  const test = (ax: Vec3) => {
    const n = Math.hypot(ax[0], ax[1], ax[2]);
    if (n < 1e-9) return;
    const u: Vec3 = [ax[0] / n, ax[1] / n, ax[2] / n];
    best = Math.max(best, Math.abs(dot(d, u)) - extent(sa, A, u) - extent(sb, B, u));
  };
  for (const u of A) test(u);
  for (const u of B) test(u);
  for (const u of A) for (const v of B) test(cross(u, v));
  test(d);
  if (sa.type === 'cylinder') test(cross(A[1]!, cross(d, A[1]!)));
  if (sb.type === 'cylinder') test(cross(B[1]!, cross(d, B[1]!)));
  return best;
}

function sphereBox(c: Vec3, r: number, b: Pose, hb: Vec3): number {
  const B = axesOf(b), d = sub(c, b.p);
  let dist2 = 0, inside = Infinity;
  for (let i = 0; i < 3; i++) {
    const o = Math.abs(dot(d, B[i]!)) - hb[i]!;
    if (o > 0) dist2 += o * o;
    inside = Math.min(inside, -o);
  }
  return dist2 > 0 ? Math.sqrt(dist2) - r : -(inside + r);
}

/** Separation of two solids at their poses, m: positive apart, negative by the overlap's depth. */
export function separation(a: Pose, sa: Solid, b: Pose, sb: Solid): number {
  if (sa.type === 'sphere' && sb.type === 'sphere') {
    const d = sub(b.p, a.p);
    return Math.hypot(d[0], d[1], d[2]) - sa.radius - sb.radius;
  }
  if (sa.type === 'sphere' && sb.type === 'box') return sphereBox(a.p, sa.radius, b, asBox(sb)!);
  if (sb.type === 'sphere' && sa.type === 'box') return sphereBox(b.p, sb.radius, a, asBox(sa)!);
  return convex(a, sa, b, sb);
}
