// Small rigid-body toolkit for rigid assemblies layered on Jolt: 3x3 / 6x6 linear algebra, weighted rigid fits,
// and a sequential-impulse solver for anchors, hinges and contacts between whole assemblies. Pure TypeScript
// (no Jolt), so it is unit tested on its own.

import { add, cross, dot, length, normalize, scale, sub } from '../doc/math';
import type { Quat, Vec3 } from '../doc/types';

// ---------------------------------------------------------------------------------------------------------------
// 3x3 matrices (row-major) and quaternions

export const ID3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const ZERO3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];

export function mat3Vec(m: number[], v: Vec3): Vec3 {
  return [m[0]! * v[0] + m[1]! * v[1] + m[2]! * v[2], m[3]! * v[0] + m[4]! * v[1] + m[5]! * v[2], m[6]! * v[0] + m[7]! * v[1] + m[8]! * v[2]];
}

export function mat3Mul(a: number[], b: number[]): number[] {
  const o = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c]! += a[r * 3 + k]! * b[k * 3 + c]!;
  return o;
}

export function inverse3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m as [number, number, number, number, number, number, number, number, number];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-30) return [...ZERO3];
  const s = 1 / det;
  return [A * s, -(b * i - c * h) * s, (b * f - c * e) * s, B * s, (a * i - c * g) * s, -(a * f - c * d) * s, C * s, -(a * h - b * g) * s, (a * e - b * d) * s];
}

export function skew(r: Vec3): number[] {
  return [0, -r[2], r[1], r[2], 0, -r[0], -r[1], r[0], 0];
}

export const scaleMat = (m: number[], s: number) => m.map((v) => v * s);

/**
 * One tick of torque-free rotation: the angular velocity w2 at the end of the tick from w1 (the start, once the tick's
 * impulses are in), by the implicit midpoint rule on Euler's equations, I (w2 - w1) + dt wm x (I wm) = 0 with
 * wm = (w1 + w2) / 2 and I the inertia (world frame, at the start of the tick), solved by Newton's method. The
 * midpoint rule keeps every quadratic invariant of the motion exactly, and a free body's kinetic energy (w.Iw / 2)
 * and angular momentum magnitude (|Iw|) are both quadratic: it neither adds nor removes energy, at any spin rate.
 * (Taken explicitly the gyroscopic term adds energy every tick, without bound for a fast-spinning uneven body;
 * backward Euler never adds any but bleeds a quarter of a 30 rad/s tumble's energy in two seconds.)
 */
export function gyroscopicStep(I: number[], w1: Vec3, dt: number): Vec3 {
  let w2: Vec3 = [...w1];
  const scaleW = length(w1) + 1e-30;
  for (let it = 0; it < 16; it++) {
    const wm = scale(add(w1, w2), 0.5);
    const Iwm = mat3Vec(I, wm);
    const F = add(mat3Vec(I, sub(w2, w1)), scale(cross(wm, Iwm), dt));
    // dF/dw2 = I + dt/2 (skew(wm) I - skew(I wm))
    const sI = mat3Mul(skew(wm), I), sIw = skew(Iwm);
    const J = I.map((v, k) => v + (dt / 2) * (sI[k]! - sIw[k]!));
    const d = mat3Vec(inverse3(J), F);
    w2 = sub(w2, d);
    if (length(d) <= 1e-13 * scaleW) break;
  }
  return w2;
}


export function quatToMat3(q: Quat): number[] {
  const [x, y, z, w] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/** R I R^T for a body-space tensor and an orientation. */
export function worldInertia(I: number[], q: Quat): number[] {
  const R = quatToMat3(q);
  const RI = mat3Mul(R, I);
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) out[r * 3 + c]! += RI[r * 3 + k]! * R[c * 3 + k]!;
  return out;
}

export function quatMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}

export const quatConj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

export function normQuat(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function rotationVector(q: Quat): Vec3 {
  const s = q[3] < 0 ? -1 : 1;
  const x = q[0] * s, y = q[1] * s, z = q[2] * s, w = q[3] * s;
  const sn = Math.hypot(x, y, z);
  if (sn < 1e-12) return [2 * x, 2 * y, 2 * z];
  const angle = 2 * Math.atan2(sn, w);
  return [(x / sn) * angle, (y / sn) * angle, (z / sn) * angle];
}

export function quatFromRotationVector(v: Vec3): Quat {
  const a = Math.hypot(v[0], v[1], v[2]);
  if (a < 1e-12) return normQuat([v[0] / 2, v[1] / 2, v[2] / 2, 1]);
  const s = Math.sin(a / 2) / a;
  return [v[0] * s, v[1] * s, v[2] * s, Math.cos(a / 2)];
}

/** Projector onto directions: all (ID3), along an axis, or perpendicular to it. */
export function projectors(axis: Vec3): { along: number[]; perp: number[] } {
  const along = [axis[0] * axis[0], axis[0] * axis[1], axis[0] * axis[2], axis[1] * axis[0], axis[1] * axis[1], axis[1] * axis[2], axis[2] * axis[0], axis[2] * axis[1], axis[2] * axis[2]];
  return { along, perp: ID3.map((v, i) => v - along[i]!) };
}

/** Two unit vectors completing an orthonormal basis with n. */
export function tangents(n: Vec3): [Vec3, Vec3] {
  const t1 = normalize(Math.abs(n[0]) < 0.6 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]));
  return [t1, cross(n, t1)];
}

// ---------------------------------------------------------------------------------------------------------------
// weighted rigid fits

/** Gaussian elimination with partial pivoting (6x6, row-major). */
export function solve6(Ain: ArrayLike<number>, bin: ArrayLike<number>): number[] {
  const A = Array.from(Ain), b = Array.from(bin);
  const n = 6;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r * n + c]!) > Math.abs(A[piv * n + c]!)) piv = r;
    if (Math.abs(A[piv * n + c]!) < 1e-300) continue;
    if (piv !== c) {
      for (let k = 0; k < n; k++) { const t = A[c * n + k]!; A[c * n + k] = A[piv * n + k]!; A[piv * n + k] = t; }
      const t = b[c]!; b[c] = b[piv]!; b[piv] = t;
    }
    for (let r = c + 1; r < n; r++) {
      const f = A[r * n + c]! / A[c * n + c]!;
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r * n + k]! -= f * A[c * n + k]!;
      b[r]! -= f * b[c]!;
    }
  }
  const x = [0, 0, 0, 0, 0, 0];
  for (let r = n - 1; r >= 0; r--) {
    let sum = b[r]!;
    for (let k = r + 1; k < n; k++) sum -= A[r * n + k]! * x[k]!;
    const d = A[r * n + r]!;
    x[r] = Math.abs(d) < 1e-300 ? 0 : sum / d;
  }
  return x;
}

/**
 * Weighted least-squares rigid motion (v at `origin`, w) from point terms (a velocity or displacement wanted at a
 * point, optionally only along some directions) and rotation terms (an angular velocity or small rotation wanted,
 * with a 3x3 weight). With mass / inertia weights and no other terms this is exactly momentum conservation.
 */
export class RigidFit {
  private A = new Float64Array(36);
  private b = new Float64Array(6);
  constructor(readonly origin: Vec3) {}

  point(p: Vec3, w: number, target: Vec3, P: number[] = ID3) {
    const X = skew(sub(p, this.origin));
    // J = P [E, -X];  J^T J = [[P, -P X], [X P, -X P X]];  J^T t = [P t; X P t]
    const PX = mat3Mul(P, X), XP = mat3Mul(X, P), XPX = mat3Mul(XP, X);
    const Pt = mat3Vec(P, target), XPt = mat3Vec(X, Pt);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.A[i * 6 + j]! += w * P[i * 3 + j]!;
        this.A[i * 6 + 3 + j]! -= w * PX[i * 3 + j]!;
        this.A[(3 + i) * 6 + j]! += w * XP[i * 3 + j]!;
        this.A[(3 + i) * 6 + 3 + j]! -= w * XPX[i * 3 + j]!;
      }
      this.b[i]! += w * Pt[i]!;
      this.b[3 + i]! += w * XPt[i]!;
    }
  }

  rotation(W: number[], target: Vec3) {
    const Wt = mat3Vec(W, target);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) this.A[(3 + i) * 6 + 3 + j]! += W[i * 3 + j]!;
      this.b[3 + i]! += Wt[i]!;
    }
  }

  solve(): { v: Vec3; w: Vec3 } {
    const x = solve6(this.A, this.b);
    return { v: [x[0]!, x[1]!, x[2]!], w: [x[3]!, x[4]!, x[5]!] };
  }

  /** The angular block of the normal matrix: the inertia tensor about the origin for mass / inertia terms. */
  angularBlock(): number[] {
    const out: number[] = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push(this.A[(3 + i) * 6 + 3 + j]!);
    return out;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// sequential impulses between rigid entities

/** A rigid body (or a whole rigid assembly) during the solve. invMass 0 = immovable. */
export interface Entity {
  origin: Vec3;
  v: Vec3;
  w: Vec3;
  invMass: number;
  /** World inverse inertia about origin (3x3). */
  invI: number[];
  /** Radius of its geometry about origin (m): how far a turn moves its farthest point (position pass). */
  extent?: number;
}

export const pointVelocity = (e: Entity, p: Vec3): Vec3 => add(e.v, cross(e.w, sub(p, e.origin)));





/**
 * One scalar constraint row between entity a and entity b (null = the fixed world). Linear rows act at pa / pb
 * along dir (impulse -dir on a, +dir on b); angular rows about axis. The row drives the relative velocity toward
 * `target` within impulse bounds [lo, hi] (hi may be tied to another row's accumulated impulse for friction).
 */
export interface Row {
  a: Entity | null;
  b: Entity | null;
  kind: 'linear' | 'angular';
  pa: Vec3;
  pb: Vec3;
  dir: Vec3;
  target: number;
  lo: number;
  hi: number;
  /** Friction: bounds are +- mu x the accumulated impulse of this normal row. */
  frictionOf?: Row;
  mu?: number;
  acc: number;
  /** Cached inverse effective mass. */
  k?: number;
  /** Tags for load bookkeeping. */
  tag?: unknown;
  /** Identity across ticks, for warm starting. */
  key?: string;
  /** Unbounded rows sharing a group are solved together as one block (exact coupling, e.g. a 6-DOF anchor). */
  group?: string;
  /**
   * Position error to take out (as a velocity: error x beta), solved apart from the velocities by solvePositions.
   * Pushed into the velocity solve instead, it would become real momentum: two overlapping bodies would leave
   * each other faster the deeper they overlapped, with energy nothing supplied.
   */
  bias?: number;
  /**
   * Softness (a soft constraint's gamma): the row is a spring and damper, not a rule; solved as (K + soft) lambda =
   * target - relVel - soft acc. Its target carries the spring's pull on the position error.
   */
  soft?: number;
}

/** Jacobian of a row on one of its entities: linear part and angular part (impulse response directions). */
function jac(r: Row, side: 'a' | 'b'): { lin: Vec3; ang: Vec3 } | null {
  const e = side === 'a' ? r.a : r.b;
  if (!e || e.invMass === 0) return null;
  const s = side === 'a' ? -1 : 1;
  if (r.kind === 'angular') return { lin: [0, 0, 0], ang: scale(r.dir, s) };
  const p = side === 'a' ? r.pa : r.pb;
  return { lin: scale(r.dir, s), ang: scale(cross(sub(p, e.origin), r.dir), s) };
}

/** Coupling K_ij: relative velocity of row i per unit impulse of row j. */
function coupling(ri: Row, rj: Row): number {
  let k = 0;
  for (const si of ['a', 'b'] as const) for (const sj of ['a', 'b'] as const) {
    const ei = si === 'a' ? ri.a : ri.b, ej = sj === 'a' ? rj.a : rj.b;
    if (!ei || ei !== ej || ei.invMass === 0) continue;
    const ji = jac(ri, si)!, jj = jac(rj, sj)!;
    k += ei.invMass * dot(ji.lin, jj.lin) + dot(ji.ang, mat3Vec(ei.invI, jj.ang));
  }
  return k;
}

/** Inverse of a small dense matrix (Gauss-Jordan with partial pivoting); singular directions map to 0. */
function invertN(A: number[][]): number[][] {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    if (Math.abs(M[piv]![c]!) < 1e-14 * (Math.abs(M[c]![c]!) + 1e-300)) continue;
    [M[c], M[piv]] = [M[piv]!, M[c]!];
    const d = M[c]![c]!;
    if (Math.abs(d) < 1e-300) continue;
    for (let k = 0; k < 2 * n; k++) M[c]![k]! /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]!;
      if (f) for (let k = 0; k < 2 * n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return M.map((row) => row.slice(n));
}

/**
 * Precomputed row data for the inner loop: Jacobians (signs folded in) and the matching velocity responses
 * M^-1 J for each side, so a relative velocity is 4 dot products and an impulse is 4 in-place axpys.
 */
interface Prepared {
  r: Row;
  ja: Float64Array | null; // [lin 3, ang 3]
  jb: Float64Array | null;
  ma: Float64Array | null; // [invMass lin 3, invI ang 3]
  mb: Float64Array | null;
}

function prepare(r: Row): Prepared {
  const side = (s: 'a' | 'b') => {
    const e = s === 'a' ? r.a : r.b;
    if (!e) return { j: null, m: null, moving: false };
    const j = jac(r, s);
    // an immovable entity still has a velocity (a hand-held part): read it, never write it
    const lin: Vec3 = j ? j.lin : r.kind === 'linear' ? scale(r.dir, s === 'a' ? -1 : 1) : [0, 0, 0];
    const ang: Vec3 = j ? j.ang : r.kind === 'angular' ? scale(r.dir, s === 'a' ? -1 : 1) : scale(cross(sub(s === 'a' ? r.pa : r.pb, e.origin), r.dir), s === 'a' ? -1 : 1);
    const jj = Float64Array.of(lin[0], lin[1], lin[2], ang[0], ang[1], ang[2]);
    if (!j) return { j: jj, m: null, moving: false };
    const Ia = mat3Vec(e.invI, ang);
    return { j: jj, m: Float64Array.of(lin[0] * e.invMass, lin[1] * e.invMass, lin[2] * e.invMass, Ia[0], Ia[1], Ia[2]), moving: true };
  };
  const A = side('a'), B = side('b');
  return { r, ja: A.j, jb: B.j, ma: A.m, mb: B.m };
}

function relVel(p: Prepared): number {
  let v = 0;
  const a = p.r.a, b = p.r.b;
  if (a && p.ja) v += p.ja[0]! * a.v[0] + p.ja[1]! * a.v[1] + p.ja[2]! * a.v[2] + p.ja[3]! * a.w[0] + p.ja[4]! * a.w[1] + p.ja[5]! * a.w[2];
  if (b && p.jb) v += p.jb[0]! * b.v[0] + p.jb[1]! * b.v[1] + p.jb[2]! * b.v[2] + p.jb[3]! * b.w[0] + p.jb[4]! * b.w[1] + p.jb[5]! * b.w[2];
  return v;
}

function push(p: Prepared, lambda: number) {
  const a = p.r.a, b = p.r.b;
  if (a && p.ma) {
    a.v[0] += lambda * p.ma[0]!; a.v[1] += lambda * p.ma[1]!; a.v[2] += lambda * p.ma[2]!;
    a.w[0] += lambda * p.ma[3]!; a.w[1] += lambda * p.ma[4]!; a.w[2] += lambda * p.ma[5]!;
  }
  if (b && p.mb) {
    b.v[0] += lambda * p.mb[0]!; b.v[1] += lambda * p.mb[1]!; b.v[2] += lambda * p.mb[2]!;
    b.w[0] += lambda * p.mb[3]!; b.w[1] += lambda * p.mb[4]!; b.w[2] += lambda * p.mb[5]!;
  }
}

/**
 * Gauss-Seidel sequential impulses with accumulated clamping (Catto). Unbounded rows sharing a group are solved
 * as one block with their exact coupling (a 6-DOF anchor converges in one pass). `warm` holds last tick's
 * accumulated impulses by row key: applying them first is what lets heavy-on-light stacks converge; it is
 * refreshed on exit. Entity velocities are updated in place.
 */
export function solveRows(rows: Row[], iterations: number, warm?: Map<string, number>, tolerance = 0) {
  const prep = rows.map(prepare);
  const byRow = new Map<Row, Prepared>();
  prep.forEach((p) => byRow.set(p.r, p));
  for (const p of prep) {
    const r = p.r;
    let k = 0;
    if (p.ja && p.ma) for (let i = 0; i < 6; i++) k += p.ja[i]! * p.ma[i]!;
    if (p.jb && p.mb) for (let i = 0; i < 6; i++) k += p.jb[i]! * p.mb[i]!;
    r.k = k;
  }
  if (warm) {
    // normals before their friction rows, so friction warm starts inside its cone
    for (const pass of [false, true]) for (const p of prep) {
      const r = p.r;
      if (!r.key || !!r.frictionOf !== pass || !r.k) continue;
      const w = warm.get(r.key);
      if (w === undefined) continue;
      const lim = r.frictionOf ? (r.mu ?? 0) * Math.max(0, r.frictionOf.acc) : 0;
      const a = r.frictionOf ? Math.min(lim, Math.max(-lim, w)) : Math.min(r.hi, Math.max(r.lo, w));
      if (a !== 0) { r.acc = a; push(p, a); }
    }
  }
  // blocks: unbounded rows sharing a group, solved jointly with their exact coupling (inverse computed once)
  const groups = new Map<string, Prepared[]>();
  for (const p of prep) {
    const r = p.r;
    if (!r.group || r.frictionOf || r.lo !== -Infinity || r.hi !== Infinity || !r.k) continue;
    (groups.get(r.group) ?? groups.set(r.group, []).get(r.group)!).push(p);
  }
  const blockOf = new Map<Prepared, { rows: Prepared[]; Kinv: number[][] }>();
  const inBlock = new Set<Prepared>();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    blockOf.set(g[0]!, { rows: g, Kinv: invertN(g.map((pi) => g.map((pj) => coupling(pi.r, pj.r)))) });
    for (const p of g) inBlock.add(p);
  }
  const res = new Float64Array(6);
  for (let it = 0; it < iterations; it++) {
    // with a tolerance, stop once no impulse changed by more than that fraction of the largest one
    let change = 0, largest = 0;
    for (const p of prep) {
      const block = blockOf.get(p);
      if (block) {
        const n = block.rows.length;
        for (let i = 0; i < n; i++) res[i] = block.rows[i]!.r.target - relVel(block.rows[i]!);
        for (let i = 0; i < n; i++) {
          let d = 0;
          const row = block.Kinv[i]!;
          for (let j = 0; j < n; j++) d += row[j]! * res[j]!;
          if (d) { block.rows[i]!.r.acc += d; push(block.rows[i]!, d); change = Math.max(change, Math.abs(d)); }
        }
        continue;
      }
      if (inBlock.has(p)) continue;
      const r = p.r;
      if (!r.k || r.k <= 0) continue;
      let lo = r.lo, hi = r.hi;
      if (r.frictionOf) {
        const lim = (r.mu ?? 0) * Math.max(0, r.frictionOf.acc);
        lo = -lim;
        hi = lim;
      }
      const soft = r.soft ?? 0;
      const next = Math.min(hi, Math.max(lo, r.acc + (r.target - relVel(p) - soft * r.acc) / (r.k + soft)));
      const lambda = next - r.acc;
      if (lambda === 0) continue;
      r.acc = next;
      push(p, lambda);
      change = Math.max(change, Math.abs(lambda));
    }
    if (tolerance > 0) {
      for (const p of prep) largest = Math.max(largest, Math.abs(p.r.acc));
      if (change <= tolerance * largest) break;
    }
  }
  if (warm) {
    warm.clear();
    for (const r of rows) if (r.key && r.acc) warm.set(r.key, r.acc);
  }
}

/**
 * A rigid body resting on more supports than it needs (a table on four feet, a crate on its bottom edges) is
 * statically indeterminate: every set of support impulses with the same net impulse and moment moves it the same, so
 * which one the solver lands on is an accident of its iterations. Left alone, warm starting ratchets friction that
 * cancels itself up to the limit of the cone (the feet pushing each other apart) and piles the weight onto one
 * diagonal: loads no real table carries, read through its joints as moments that break them. What real supports of
 * equal stiffness share is the least set (minimum norm) that holds the body; this replaces the solver's choice with it,
 * or moves as far toward it as every contact's normal and friction limits allow. The body moves exactly as before.
 *
 * `rows` are the normal rows of one body's fixed supports (their friction rows found through `frictionOf`); returns
 * every row whose impulse changed.
 */
export function leastSupport(normals: Row[], all: Row[]): Row[] {
  if (normals.length < 2) return [];
  const fr = new Map<Row, Row[]>();
  for (const r of all) if (r.frictionOf && normals.includes(r.frictionOf)) (fr.get(r.frictionOf) ?? fr.set(r.frictionOf, []).get(r.frictionOf)!).push(r);
  const pts = normals.map((n) => {
    const rs = [n, ...(fr.get(n) ?? [])];
    let lam: Vec3 = [0, 0, 0];
    for (const r of rs) lam = add(lam, scale(r.dir, r.acc));
    return { n, rs, p: n.pa, lam };
  });
  const k = pts.length;
  const c = scale(pts.reduce((s, q) => add(s, q.p), [0, 0, 0] as Vec3), 1 / k);
  let J: Vec3 = [0, 0, 0], M: Vec3 = [0, 0, 0];
  const S = [...ZERO3];
  let size = 0;
  for (const q of pts) {
    const r = sub(q.p, c);
    J = add(J, q.lam);
    M = add(M, cross(r, q.lam));
    const rr = dot(r, r);
    size = Math.max(size, rr);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i * 3 + j]! += (i === j ? rr : 0) - r[i]! * r[j]!;
  }
  if (size < 1e-10) return []; // one point, however many rows
  // points on a line can't make a moment about it (and don't need to): the small ridge gives the pseudo-inverse there
  const tr = S[0]! + S[4]! + S[8]!;
  const det = S[0]! * (S[4]! * S[8]! - S[5]! * S[7]!) - S[1]! * (S[3]! * S[8]! - S[5]! * S[6]!) + S[2]! * (S[3]! * S[7]! - S[4]! * S[6]!);
  const y = mat3Vec(inverse3(Math.abs(det) > 1e-9 * tr ** 3 ? S : S.map((v, i) => (i % 4 === 0 ? v + 1e-9 * tr : v))), M);
  const least = pts.map((q) => add(scale(J, 1 / k), cross(y, sub(q.p, c))));
  // it must hold the body exactly as the solver's did
  let Mc: Vec3 = [0, 0, 0];
  least.forEach((l, i) => { Mc = add(Mc, cross(sub(pts[i]!.p, c), l)); });
  if (length(sub(Mc, M)) > 1e-6 * (length(M) + length(J) * Math.sqrt(size)) + 1e-12) return [];
  // as far toward it as every contact stays pushing (never pulling) and inside its friction limits
  let s = 1;
  const limit = (g0: number, g1: number) => { if (g1 < 0 && g0 >= 0) s = Math.min(s, g0 / (g0 - g1)); else if (g1 < 0) s = 0; };
  const next = pts.map((q, i) => q.rs.map((r) => dot(least[i]!, r.dir)));
  pts.forEach((q, i) => {
    const n0 = q.n.acc, n1 = next[i]![0]!;
    limit(n0, n1);
    q.rs.slice(1).forEach((f, j) => {
      const mu = f.mu ?? 0, t0 = f.acc, t1 = next[i]![j + 1]!;
      limit(mu * n0 - t0, mu * n1 - t1);
      limit(mu * n0 + t0, mu * n1 + t1);
    });
  });
  if (s <= 0) return [];
  const changed: Row[] = [];
  pts.forEach((q, i) => q.rs.forEach((r, j) => {
    const a = r.acc + s * (next[i]![j]! - r.acc);
    if (a !== r.acc) { r.acc = a; changed.push(r); }
  }));
  return changed;
}

/**
 * Split impulse (Catto): the position errors of the rows (their `bias`) solved on pseudo-velocities that start at
 * rest and move the entities' poses only. Contacts push apart but never pull, joints hold together, friction and
 * impulse-bounded rows play no part. Returns each moving entity's pseudo-velocity; its real velocity is untouched,
 * so taking out an overlap or a drift adds no momentum and no kinetic energy.
 *
 * The rows are linear in the motion, so the answer holds only for small turns: turning by theta about the origin
 * moves a point at radius r off its linear prediction by r theta^2 / 2. Each entity's correction is therefore
 * scaled down (direction kept) until that error is within `slop` at its extent; what is left is taken out on the
 * following ticks. (A deep overlap resolved in one linear step would swing a long part through its neighbours.)
 */
export function solvePositions(rows: Row[], iterations: number, dt: number, slop: number): Map<Entity, { v: Vec3; w: Vec3 }> {
  const pseudo = new Map<Entity, Entity>();
  const of = (e: Entity | null): Entity | null => {
    if (!e) return null;
    let p = pseudo.get(e);
    if (!p) pseudo.set(e, (p = { origin: e.origin, v: [0, 0, 0], w: [0, 0, 0], invMass: e.invMass, invI: e.invI }));
    return p;
  };
  const prow: Row[] = [];
  let any = false;
  for (const r of rows) {
    if (r.frictionOf) continue;
    const contact = r.lo === 0 && r.hi === Infinity;
    if (!contact && (r.lo !== -Infinity || r.hi !== Infinity)) continue;
    if (r.bias) any = true;
    prow.push({ a: of(r.a), b: of(r.b), kind: r.kind, pa: r.pa, pb: r.pb, dir: r.dir, target: r.bias ?? 0, lo: r.lo, hi: r.hi, acc: 0, group: r.group });
  }
  const out = new Map<Entity, { v: Vec3; w: Vec3 }>();
  if (!any) return out;
  solveRows(prow, iterations);
  for (const [e, p] of pseudo) {
    if (e.invMass === 0) continue;
    const turn = length(p.w) * dt;
    const most = e.extent ? Math.sqrt((2 * slop) / e.extent) : Infinity;
    const k = turn > most ? most / turn : 1;
    out.set(e, { v: scale(p.v, k), w: scale(p.w, k) });
  }
  return out;
}

/** Rows for a point held together between a and b (or to the world), in the directions P keeps (one block per key). */
export function pointRows(a: Entity | null, b: Entity | null, pa: Vec3, pb: Vec3, P: number[], bias: Vec3, tag?: unknown, key?: string): Row[] {
  return basisOf(P).map((axis, i) => ({ a, b, kind: 'linear' as const, pa, pb, dir: axis, target: 0, bias: -dot(bias, axis), lo: -Infinity, hi: Infinity, acc: 0, tag, key: key && `${key}:p${i}`, group: key }));
}

export function angularRows(a: Entity | null, b: Entity | null, P: number[], bias: Vec3, tag?: unknown, key?: string, lo = -Infinity, hi = Infinity): Row[] {
  return basisOf(P).map((axis, i) => ({ a, b, kind: 'angular' as const, pa: [0, 0, 0] as Vec3, pb: [0, 0, 0] as Vec3, dir: axis, target: 0, bias: -dot(bias, axis), lo, hi, acc: 0, tag, key: key && `${key}:r${i}`, group: key }));
}

/** Orthonormal basis of the range of a symmetric projector (identity, axis, or plane). */
export function basisOf(P: number[]): Vec3[] {
  const tr = P[0]! + P[4]! + P[8]!;
  if (tr > 2.5) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  if (tr < 0.5) return [];
  // pick the columns, Gram-Schmidt
  const cols: Vec3[] = [[P[0]!, P[3]!, P[6]!], [P[1]!, P[4]!, P[7]!], [P[2]!, P[5]!, P[8]!]];
  const out: Vec3[] = [];
  for (const c of cols.sort((x, y) => length(y) - length(x))) {
    let v = c;
    for (const o of out) v = sub(v, scale(o, dot(v, o)));
    if (length(v) > 1e-6) out.push(normalize(v));
    if (out.length >= Math.round(tr)) break;
  }
  return out;
}
