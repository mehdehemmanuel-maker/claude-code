// Minimal pose math on plain arrays (no three.js), shared by doc, physics and persistence.

import type { Pose, Quat, Vec3 } from './types';

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0];
}

export function qmul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export const qconj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

export function qnormalize(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

export function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}

export function axisAngle(axis: Vec3, angle: number): Quat {
  const n = normalize(axis);
  const s = Math.sin(angle / 2);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(angle / 2)];
}

/** Shortest rotation taking unit vector a onto unit vector b. */
export function fromTo(a: Vec3, b: Vec3): Quat {
  const d = dot(a, b);
  if (d > 0.999999) return [0, 0, 0, 1];
  if (d < -0.999999) {
    let ax = cross([1, 0, 0], a);
    if (length(ax) < 1e-6) ax = cross([0, 1, 0], a);
    return axisAngle(ax, Math.PI);
  }
  const c = cross(a, b);
  return qnormalize([c[0], c[1], c[2], 1 + d]);
}

/** world = parent * local */
export function composePose(parent: Pose, local: Pose): Pose {
  return { p: add(parent.p, rotate(parent.q, local.p)), q: qnormalize(qmul(parent.q, local.q)) };
}

/** local such that composePose(parent, local) = world */
export function relativePose(parent: Pose, world: Pose): Pose {
  const inv = qconj(parent.q);
  return { p: rotate(inv, sub(world.p, parent.p)), q: qnormalize(qmul(inv, world.q)) };
}

export const transformPoint = (pose: Pose, v: Vec3): Vec3 => add(pose.p, rotate(pose.q, v));
export const inverseTransformPoint = (pose: Pose, v: Vec3): Vec3 => rotate(qconj(pose.q), sub(v, pose.p));

const round = (x: number, scale: number) => {
  const r = Math.round(x * scale) / scale;
  return r === 0 ? 0 : r; // no negative zero
};

/**
 * Canonical stored pose: positions to 1 micrometre, quaternion unit length, w >= 0, 7 decimals.
 * Idempotent, so committing an unchanged pose never changes the saved bytes.
 */
export function canonicalPose(pose: Pose): Pose {
  let q = qnormalize(pose.q);
  if (q[3] < 0) q = [-q[0], -q[1], -q[2], -q[3]];
  return {
    p: [round(pose.p[0], 1e6), round(pose.p[1], 1e6), round(pose.p[2], 1e6)],
    q: [round(q[0], 1e7), round(q[1], 1e7), round(q[2], 1e7), round(q[3], 1e7)],
  };
}

export function clonePose(p: Pose): Pose {
  return { p: [p.p[0], p.p[1], p.p[2]], q: [p.q[0], p.q[1], p.q[2], p.q[3]] };
}
