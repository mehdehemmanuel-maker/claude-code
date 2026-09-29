// Eddy currents (Lenz's law): the drag on a conductor moving relative to a magnet's field.
//
// A conductor of conductivity sigma, each point x moving at u(x) relative to a static field B, carries
//   J = sigma (u x B - grad phi),  div J = 0 inside,  J . n = 0 on its surface
// (quasi-static: the currents' own field is neglected, valid while mu0 sigma u l << 1). Charge building up in the
// conductor makes phi, and it cancels whatever part of the EMF u x B cannot drive a closed current: a disc spinning
// in an axial field carries no current, an open-circuit Faraday disc. The dissipated power is
//   P = int |J|^2 / sigma dV
// and for a rigid relative motion q = (V, W) (velocity at a reference point, angular velocity), u is linear in q,
// so P = q^T D q with D a 6 x 6 positive semi-definite damping matrix; the drag wrench on the conductor is -D q.
//
// Discretisation: finite volumes on a structured mesh of the conductor (Cartesian for boxes, polar for cylinders
// and tubes, so currents can circulate round a tube's wall). phi is solved on the mesh by conjugate gradients for
// each of the six basis motions, and D is summed over the mesh's faces.

export type Vec3 = [number, number, number];

/** A finite-volume mesh: cells, and the faces between neighbouring cells (normal from cell i to cell j). */
export interface EddyMesh {
  cells: { p: Vec3; vol: number }[];
  faces: { i: number; j: number; p: Vec3; n: Vec3; area: number; dist: number }[];
}

/** The part of a conductor's geometry the mesh covers: an axis-aligned window in its local frame. */
export interface Window { lo: Vec3; hi: Vec3 }

const clampRange = (lo: number, hi: number, wlo: number, whi: number): [number, number] | null => {
  const a = Math.max(lo, wlo), b = Math.min(hi, whi);
  return b > a ? [a, b] : null;
};

/** Cartesian mesh of a box (half extents) within a window, with at most about `cells` cells. */
export function boxMesh(half: Vec3, win: Window | null, cells: number): EddyMesh | null {
  const r = [0, 1, 2].map((k) => clampRange(-half[k]!, half[k]!, win ? win.lo[k]! : -Infinity, win ? win.hi[k]! : Infinity));
  if (r.some((x) => !x)) return null;
  const ext = r.map((x) => x![1] - x![0]);
  const h = Math.cbrt((ext[0]! * ext[1]! * ext[2]!) / cells);
  const n = ext.map((e) => Math.max(1, Math.round(e / h)));
  const d = ext.map((e, k) => e / n[k]!);
  const idx = (a: number, b: number, c: number) => (a * n[1]! + b) * n[2]! + c;
  const mesh: EddyMesh = { cells: [], faces: [] };
  const vol = d[0]! * d[1]! * d[2]!;
  for (let a = 0; a < n[0]!; a++) for (let b = 0; b < n[1]!; b++) for (let c = 0; c < n[2]!; c++) {
    mesh.cells.push({ p: [r[0]![0] + (a + 0.5) * d[0]!, r[1]![0] + (b + 0.5) * d[1]!, r[2]![0] + (c + 0.5) * d[2]!], vol });
  }
  for (let a = 0; a < n[0]!; a++) for (let b = 0; b < n[1]!; b++) for (let c = 0; c < n[2]!; c++) {
    const i = idx(a, b, c), pi = mesh.cells[i]!.p;
    const nb: [number, number, number, number][] = [[a + 1, b, c, 0], [a, b + 1, c, 1], [a, b, c + 1, 2]];
    for (const [x, y, z, k] of nb) {
      if (x >= n[0]! || y >= n[1]! || z >= n[2]!) continue;
      const nn: Vec3 = [0, 0, 0];
      nn[k] = 1;
      const fp: Vec3 = [...pi];
      fp[k] += d[k]! / 2;
      mesh.faces.push({ i, j: idx(x, y, z), p: fp, n: nn, area: vol / d[k]!, dist: d[k]! });
    }
  }
  return mesh;
}

/**
 * Polar mesh of an annulus (inner radius 0: a solid cylinder) about local +Y, within a window along Y, with nr
 * radial, nt angular and about `cells` cells in all.
 */
export function annulusMesh(outer: number, inner: number, halfHeight: number, win: Window | null, cells: number, nr?: number, nt?: number): EddyMesh | null {
  const yr = clampRange(-halfHeight, halfHeight, win ? win.lo[1] : -Infinity, win ? win.hi[1] : Infinity);
  if (!yr) return null;
  const R = outer, r0 = Math.max(0, inner);
  const len = yr[1] - yr[0];
  // cells about h across: radially, round the mid circumference, and along the axis
  const circ = Math.PI * (R + r0);
  const h = Math.cbrt(((R - r0) * circ * len) / cells);
  const radial = nr ?? Math.max(1, Math.round((R - r0) / h));
  const angular = nt ?? Math.max(8, Math.round(circ / h));
  const nz = Math.max(1, Math.round(len / h));
  const dr = (R - r0) / radial, dt = (2 * Math.PI) / angular, dz = len / nz;
  const idx = (a: number, b: number, c: number) => (a * angular + (b % angular)) * nz + c;
  const mesh: EddyMesh = { cells: [], faces: [] };
  for (let a = 0; a < radial; a++) {
    const rm = r0 + (a + 0.5) * dr;
    for (let b = 0; b < angular; b++) {
      const t = (b + 0.5) * dt;
      for (let c = 0; c < nz; c++) {
        mesh.cells.push({ p: [rm * Math.cos(t), yr[0] + (c + 0.5) * dz, rm * Math.sin(t)], vol: rm * dr * dt * dz });
      }
    }
  }
  for (let a = 0; a < radial; a++) {
    const rm = r0 + (a + 0.5) * dr;
    for (let b = 0; b < angular; b++) {
      const t = (b + 0.5) * dt;
      for (let c = 0; c < nz; c++) {
        const i = idx(a, b, c);
        const y = yr[0] + (c + 0.5) * dz;
        if (a + 1 < radial) {
          const rf = r0 + (a + 1) * dr;
          mesh.faces.push({ i, j: idx(a + 1, b, c), p: [rf * Math.cos(t), y, rf * Math.sin(t)], n: [Math.cos(t), 0, Math.sin(t)], area: rf * dt * dz, dist: dr });
        }
        if (angular > 1 && (b + 1 < angular || angular > 2)) {
          const tf = (b + 1) * dt;
          mesh.faces.push({ i, j: idx(a, b + 1, c), p: [rm * Math.cos(tf), y, rm * Math.sin(tf)], n: [-Math.sin(tf), 0, Math.cos(tf)], area: dr * dz, dist: rm * dt });
        }
        if (c + 1 < nz) {
          mesh.faces.push({ i, j: idx(a, b, c + 1), p: [rm * Math.cos(t), y + dz / 2, rm * Math.sin(t)], n: [0, 1, 0], area: rm * dr * dt, dist: dz });
        }
      }
    }
  }
  return mesh;
}

/** The mesh moved rigidly into world space by a pose (position, and a rotation applied to vectors). */
export function placeMesh(mesh: EddyMesh, p: Vec3, rot: (v: Vec3) => Vec3): EddyMesh {
  const at = (v: Vec3): Vec3 => { const r = rot(v); return [r[0] + p[0], r[1] + p[1], r[2] + p[2]]; };
  return {
    cells: mesh.cells.map((c) => ({ p: at(c.p), vol: c.vol })),
    faces: mesh.faces.map((f) => ({ ...f, p: at(f.p), n: rot(f.n) })),
  };
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Velocity at x of basis motion k of the conductor relative to the source: k = 0..2 translation along x, y, z;
 * k = 3..5 rotation about x, y, z through the reference point r.
 */
export function rigidBasis(r: Vec3) {
  return (x: Vec3, k: number): Vec3 => {
    if (k < 3) { const e: Vec3 = [0, 0, 0]; e[k] = 1; return e; }
    const e: Vec3 = [0, 0, 0];
    e[k - 3] = 1;
    return cross(e, [x[0] - r[0], x[1] - r[1], x[2] - r[2]]);
  };
}

/**
 * Damping matrix D (6 x 6, row-major) of a conductor meshed in world space, with field B (tesla) given at each
 * cell centre, for the six basis motions of `basis` (velocity of each at a point). P = q^T D q.
 */
export function eddyDamping(mesh: EddyMesh, sigma: number, B: Vec3[], basis: (x: Vec3, k: number) => Vec3): number[] {
  const D = new Array<number>(36).fill(0);
  if (sigma <= 0 || !mesh.faces.length) return D;
  const nc = mesh.cells.length, nf = mesh.faces.length;
  const w = mesh.faces.map((f) => f.area / f.dist);
  // EMF along each face for each basis motion: (u x B) . n, B averaged from the two cells
  const emf: Float64Array[] = [];
  for (let k = 0; k < 6; k++) {
    const e = new Float64Array(nf);
    mesh.faces.forEach((f, m) => {
      const bi = B[f.i]!, bj = B[f.j]!;
      const b: Vec3 = [(bi[0] + bj[0]) / 2, (bi[1] + bj[1]) / 2, (bi[2] + bj[2]) / 2];
      e[m] = dot(cross(basis(f.p, k), b), f.n);
    });
    emf.push(e);
  }
  // L phi = -s, L the mesh's graph Laplacian (weights area / distance), s the EMF flux out of each cell
  const lap = (x: Float64Array, out: Float64Array) => {
    out.fill(0);
    for (let m = 0; m < nf; m++) {
      const f = mesh.faces[m]!, t = w[m]! * (x[f.i]! - x[f.j]!);
      out[f.i] += t; out[f.j] -= t;
    }
  };
  const J: Float64Array[] = [];
  for (let k = 0; k < 6; k++) {
    const b = new Float64Array(nc);
    let flux = 0;
    for (let m = 0; m < nf; m++) {
      const f = mesh.faces[m]!, t = f.area * emf[k]![m]!;
      b[f.i] -= t; b[f.j] += t;
      flux += t * t;
    }
    // converged when the charge balance is met to a part in 1e10 of the EMF fluxes themselves (b alone can be ~0:
    // an EMF that needs no charge to close its currents)
    const phi = conjugateGradient(lap, b, nc, 1e-10 * Math.sqrt(flux));
    const j = new Float64Array(nf);
    for (let m = 0; m < nf; m++) {
      const f = mesh.faces[m]!;
      j[m] = emf[k]![m]! - (phi[f.j]! - phi[f.i]!) / f.dist;
    }
    J.push(j);
  }
  for (let m = 0; m < nf; m++) {
    const f = mesh.faces[m]!, v = sigma * f.area * f.dist;
    for (let k = 0; k < 6; k++) for (let l = k; l < 6; l++) D[k * 6 + l] += v * J[k]![m]! * J[l]![m]!;
  }
  for (let k = 0; k < 6; k++) for (let l = 0; l < k; l++) D[k * 6 + l] = D[l * 6 + k]!;
  return D;
}

/**
 * Conjugate gradients for a connected mesh's graph Laplacian (null space: constants), to residual norm `tol`. The
 * residual is kept free of the constant null space, so rounding cannot build up along it.
 */
function conjugateGradient(A: (x: Float64Array, out: Float64Array) => void, b: Float64Array, n: number, tol: number): Float64Array {
  const deflate = (v: Float64Array) => { const m = v.reduce((s, x) => s + x, 0) / n; for (let i = 0; i < n; i++) v[i] -= m; };
  const x = new Float64Array(n), r = Float64Array.from(b), Ap = new Float64Array(n);
  deflate(r);
  const p = Float64Array.from(r);
  let rr = r.reduce((s, v) => s + v * v, 0);
  const tol2 = tol * tol;
  for (let it = 0; it < 4 * n + 50 && rr > tol2; it++) {
    A(p, Ap);
    const pAp = p.reduce((s, v, i) => s + v * Ap[i]!, 0);
    if (!(pAp > 0)) break;
    const a = rr / pAp;
    for (let i = 0; i < n; i++) { x[i] += a * p[i]!; r[i] -= a * Ap[i]!; }
    deflate(r);
    const rr2 = r.reduce((s, v) => s + v * v, 0);
    const beta = rr2 / rr;
    rr = rr2;
    for (let i = 0; i < n; i++) p[i] = r[i]! + beta * p[i]!;
  }
  return x;
}

/** Point-dipole drag in a thin conducting tube (Levin et al., Am. J. Phys. 74, 815 (2006)): F = c v. */
export function tubeDipoleDrag(m: number, sigma: number, wall: number, radius: number) {
  const MU0 = 4e-7 * Math.PI;
  return (45 * MU0 * MU0 * m * m * sigma * wall) / (1024 * radius ** 4);
}
