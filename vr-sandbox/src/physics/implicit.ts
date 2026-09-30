// Linearly implicit (backward Euler) treatment of stiff pair forces, such as two magnets close together.
//
// A force applied once per tick is integrated explicitly: v' = v + dt F / m. When the force's restoring stiffness K
// makes the pair's natural frequency w = sqrt(K / m) large against the tick (w dt > 2), each tick overshoots more
// than the last and the motion explodes (a small magnet near another would spin up to hundreds of rad/s and be flung
// off). Backward Euler instead solves for the end-of-tick velocity with the force linearised there:
//   m (v' - v) = dt (F + K dx),  dx = dt v'   =>   F_eff = m (m - dt^2 K)^-1 (F + dt K v)
// which is stable for any stiffness. It also damps what it treats, numerically: a real magnet's own eddy currents
// damp its wobble at only ~2 s^-1 (M4), so the world uses it only for the restoring modes its substeps cannot follow
// (w dt > 1) and leaves the rest explicit, undamped (M3). Only restoring modes are treated so: along a direction where
// the force grows as the bodies close (attraction towards contact) the step stays explicit, so an approach is never
// slowed.

import type { Vec3 } from '../doc/types';
import { inverse3, mat3Vec } from './rigid';

/** Eigen-decomposition of a symmetric 3x3 matrix (row-major) by cyclic Jacobi rotations. */
export function symmetricEigen3(m: number[]): { values: Vec3; vectors: Vec3[] } {
  const a = [...m];
  const v = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let sweep = 0; sweep < 12; sweep++) {
    const off = a[1]! ** 2 + a[2]! ** 2 + a[5]! ** 2;
    if (off < 1e-30 * (a[0]! ** 2 + a[4]! ** 2 + a[8]! ** 2 + 1e-300)) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) {
      const apq = a[p * 3 + q]!;
      if (Math.abs(apq) < 1e-300) continue;
      const app = a[p * 3 + p]!, aqq = a[q * 3 + q]!;
      const theta = (aqq - app) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k * 3 + p]!, akq = a[k * 3 + q]!;
        a[k * 3 + p] = c * akp - s * akq;
        a[k * 3 + q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p * 3 + k]!, aqk = a[q * 3 + k]!;
        a[p * 3 + k] = c * apk - s * aqk;
        a[q * 3 + k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k * 3 + p]!, vkq = v[k * 3 + q]!;
        v[k * 3 + p] = c * vkp - s * vkq;
        v[k * 3 + q] = s * vkp + c * vkq;
      }
    }
  }
  return {
    values: [a[0]!, a[4]!, a[8]!],
    vectors: [0, 1, 2].map((j) => [v[j]!, v[3 + j]!, v[6 + j]!] as Vec3),
  };
}

/** The restoring modes of a stiffness matrix dF/dx (symmetrised): its negative eigenvalues and their directions. */
export function restoringModes(J: number[]): { lam: number; e: Vec3 }[] {
  const S = [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => (J[i * 3 + j]! + J[j * 3 + i]!) / 2));
  const { values, vectors } = symmetricEigen3(S);
  return values.flatMap((lam, k) => (lam < 0 ? [{ lam, e: vectors[k]! }] : []));
}

/** Stiffness from modes: sum of lam e e^T. */
export function stiffnessOf(modes: { lam: number; e: Vec3 }[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const { lam, e } of modes) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out[i * 3 + j] += lam * e[i]! * e[j]!;
  return out;
}

/** The restoring part of a stiffness matrix dF/dx: symmetrised, keeping only its negative eigenvalues. */
export function restoringPart(J: number[]): number[] {
  return stiffnessOf(restoringModes(J));
}

/**
 * Effective force (or torque) to apply over the tick for a stiff pair: inertia M (3x3; the pair's reduced mass or
 * inertia), restoring stiffness K (3x3, negative semi-definite), force F at the tick start and relative velocity v.
 */
export function implicitForce(M: number[], K: number[], F: Vec3, v: Vec3, dt: number): Vec3 {
  const A = M.map((m, i) => m - dt * dt * K[i]!);
  const Kv = mat3Vec(K, v);
  const rhs: Vec3 = [F[0] + dt * Kv[0], F[1] + dt * Kv[1], F[2] + dt * Kv[2]];
  return mat3Vec(M, mat3Vec(inverse3(A), rhs));
}

/** Solve A x = b for a small dense system (row-major n x n) by Gaussian elimination with partial pivoting. */
export function solveDense(A: number[], b: number[], n: number): number[] {
  const m = A.slice(), x = b.slice();
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r * n + c]!) > Math.abs(m[p * n + c]!)) p = r;
    if (p !== c) {
      for (let k = 0; k < n; k++) [m[c * n + k], m[p * n + k]] = [m[p * n + k]!, m[c * n + k]!];
      [x[c], x[p]] = [x[p]!, x[c]!];
    }
    const d = m[c * n + c]!;
    if (Math.abs(d) < 1e-300) continue;
    for (let r = c + 1; r < n; r++) {
      const f = m[r * n + c]! / d;
      if (f === 0) continue;
      for (let k = c; k < n; k++) m[r * n + k] -= f * m[c * n + k]!;
      x[r] -= f * x[c]!;
    }
  }
  for (let c = n - 1; c >= 0; c--) {
    let s = x[c]!;
    for (let k = c + 1; k < n; k++) s -= m[c * n + k]! * x[k]!;
    const d = m[c * n + c]!;
    x[c] = Math.abs(d) < 1e-300 ? 0 : s / d;
  }
  return x;
}
