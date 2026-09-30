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
// and tubes, so currents can circulate round a tube's wall). phi is solved on the mesh for each of the six basis
// motions, and D is summed over the mesh's faces. The mesh's Laplacian is separable (uniform spacing along each
// Cartesian axis; round a polar mesh, uniform in angle and along the axis), so it is solved exactly by transforms:
// a cosine transform along each Neumann direction, a Fourier transform round the periodic angle, and a tridiagonal
// solve along the radius. Meshes without that structure are solved by conjugate gradients.

export type Vec3 = [number, number, number];

/**
 * The structure of a mesh's Laplacian, for the direct solve. Box: cell (a, b, c) is index (a n1 + b) n2 + c, face
 * weights (area / distance) w[k] along axis k. Annulus: cell (radial a, angular b, axial c) is (a nt + b) nz + c;
 * weights wr[a] between radial cells a and a + 1, wt[a] between angular neighbours and wz[a] between axial ones.
 */
export type EddyGrid =
  | { kind: 'box'; n: [number, number, number]; w: [number, number, number] }
  | { kind: 'annulus'; nr: number; nt: number; nz: number; wr: number[]; wt: number[]; wz: number[] };

/** A finite-volume mesh: cells, and the faces between neighbouring cells (normal from cell i to cell j). */
export interface EddyMesh {
  cells: { p: Vec3; vol: number }[];
  faces: { i: number; j: number; p: Vec3; n: Vec3; area: number; dist: number }[];
  grid?: EddyGrid;
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
  const vol = d[0]! * d[1]! * d[2]!;
  const mesh: EddyMesh = {
    cells: [], faces: [],
    grid: { kind: 'box', n: [n[0]!, n[1]!, n[2]!], w: [vol / d[0]! ** 2, vol / d[1]! ** 2, vol / d[2]! ** 2] },
  };
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
  if (angular >= 3) {
    const rm = (a: number) => r0 + (a + 0.5) * dr;
    mesh.grid = {
      kind: 'annulus', nr: radial, nt: angular, nz,
      wr: Array.from({ length: radial - 1 }, (_, a) => ((r0 + (a + 1) * dr) * dt * dz) / dr),
      wt: Array.from({ length: radial }, (_, a) => (dr * dz) / (rm(a) * dt)),
      wz: Array.from({ length: radial }, (_, a) => (rm(a) * dr * dt) / dz),
    };
  }
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
    ...(mesh.grid ? { grid: mesh.grid } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// Direct solve of a structured mesh's Laplacian L phi = b (Neumann: b sums to zero, phi is found up to a constant).

/** Orthonormal cosine basis (DCT-II) of n cells: column p at row c, and the 1-D Neumann Laplacian's eigenvalues. */
function cosineBasis(n: number): { M: Float64Array; lam: Float64Array } {
  const M = new Float64Array(n * n), lam = new Float64Array(n);
  for (let p = 0; p < n; p++) {
    const s = p === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n);
    for (let c = 0; c < n; c++) M[c * n + p] = s * Math.cos((Math.PI * p * (c + 0.5)) / n);
    lam[p] = 2 * (1 - Math.cos((Math.PI * p) / n));
  }
  return { M, lam };
}

/** Orthonormal real Fourier basis of n periodic cells, and the periodic 1-D Laplacian's eigenvalues. */
function fourierBasis(n: number): { M: Float64Array; lam: Float64Array } {
  const M = new Float64Array(n * n), lam = new Float64Array(n);
  let col = 0;
  const put = (f: (b: number) => number, m: number) => {
    let s = 0;
    for (let b = 0; b < n; b++) s += f(b) ** 2;
    for (let b = 0; b < n; b++) M[b * n + col] = f(b) / Math.sqrt(s);
    lam[col++] = 2 * (1 - Math.cos((2 * Math.PI * m) / n));
  };
  put(() => 1, 0);
  for (let m = 1; 2 * m < n; m++) {
    put((b) => Math.cos((2 * Math.PI * m * b) / n), m);
    put((b) => Math.sin((2 * Math.PI * m * b) / n), m);
  }
  if (n % 2 === 0) put((b) => (b % 2 ? -1 : 1), n / 2);
  return { M, lam };
}

/** x projected onto (forward) or rebuilt from (inverse) the basis M along one axis of an n0 x n1 x n2 array. */
function alongAxis(x: Float64Array, dims: [number, number, number], axis: 0 | 1 | 2, M: Float64Array, forward: boolean) {
  const n = dims[axis], stride = axis === 2 ? 1 : axis === 1 ? dims[2] : dims[1] * dims[2];
  if (n === 1) return;
  const line = new Float64Array(n);
  const [o1, o2] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
  const s1 = o1 === 0 ? dims[1] * dims[2] : o1 === 1 ? dims[2] : 1, s2 = o2 === 1 ? dims[2] : 1;
  for (let i = 0; i < dims[o1]; i++) {
    for (let j = 0; j < dims[o2]; j++) {
      const base = i * s1 + j * s2;
      for (let k = 0; k < n; k++) line[k] = x[base + k * stride]!;
      for (let k = 0; k < n; k++) {
        let s = 0;
        if (forward) for (let c = 0; c < n; c++) s += M[c * n + k]! * line[c]!;
        else for (let c = 0; c < n; c++) s += M[k * n + c]! * line[c]!;
        x[base + k * stride] = s;
      }
    }
  }
}

/** A direct solver for a structured mesh's Laplacian: b -> phi (mean-free up to rounding). */
function gridSolver(g: EddyGrid): (b: Float64Array) => Float64Array {
  if (g.kind === 'box') {
    const dims = g.n;
    const bases = dims.map((n) => cosineBasis(n));
    return (b) => {
      const x = Float64Array.from(b);
      for (let k = 0; k < 3; k++) alongAxis(x, dims, k as 0 | 1 | 2, bases[k]!.M, true);
      for (let a = 0; a < dims[0]; a++) for (let c1 = 0; c1 < dims[1]; c1++) for (let c2 = 0; c2 < dims[2]; c2++) {
        const i = (a * dims[1] + c1) * dims[2] + c2;
        const lam = g.w[0] * bases[0]!.lam[a]! + g.w[1] * bases[1]!.lam[c1]! + g.w[2] * bases[2]!.lam[c2]!;
        x[i] = lam > 0 ? x[i]! / lam : 0;
      }
      for (let k = 0; k < 3; k++) alongAxis(x, dims, k as 0 | 1 | 2, bases[k]!.M, false);
      return x;
    };
  }
  const { nr, nt, nz, wr, wt, wz } = g;
  const dims: [number, number, number] = [nr, nt, nz];
  const F = fourierBasis(nt), C = cosineBasis(nz);
  const diag = new Float64Array(nr), rhs = new Float64Array(nr), cp = new Float64Array(nr);
  return (b) => {
    const x = Float64Array.from(b);
    alongAxis(x, dims, 1, F.M, true);
    alongAxis(x, dims, 2, C.M, true);
    // each angular and axial mode: a tridiagonal system along the radius (Thomas algorithm)
    for (let m = 0; m < nt; m++) {
      for (let p = 0; p < nz; p++) {
        for (let a = 0; a < nr; a++) {
          diag[a] = wt[a]! * F.lam[m]! + wz[a]! * C.lam[p]! + (a > 0 ? wr[a - 1]! : 0) + (a < nr - 1 ? wr[a]! : 0);
          rhs[a] = x[(a * nt + m) * nz + p]!;
        }
        // off-diagonals are -wr[a]; the pure radial mode (m = p = 0) is singular: its last pivot vanishes and the
        // solution is taken with that unknown at zero (phi matters only up to a constant)
        let piv = diag[0]!;
        cp[0] = nr > 1 && piv !== 0 ? -wr[0]! / piv : 0;
        rhs[0] = piv !== 0 ? rhs[0]! / piv : 0;
        for (let a = 1; a < nr; a++) {
          piv = diag[a]! + wr[a - 1]! * cp[a - 1]!;
          const ok = Math.abs(piv) > 1e-12 * diag[a]!;
          cp[a] = a < nr - 1 && ok ? -wr[a]! / piv : 0;
          rhs[a] = ok ? (rhs[a]! + wr[a - 1]! * rhs[a - 1]!) / piv : 0;
        }
        for (let a = nr - 2; a >= 0; a--) rhs[a] -= cp[a]! * rhs[a + 1]!;
        for (let a = 0; a < nr; a++) x[(a * nt + m) * nz + p] = rhs[a]!;
      }
    }
    alongAxis(x, dims, 2, C.M, false);
    alongAxis(x, dims, 1, F.M, false);
    return x;
  };
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Velocity at x of basis motion k of the conductor relative to the source: k = 0..2 translation along x, y, z;
 * k = 3..5 rotation about x, y, z through the reference point r.
 */
export function rigidBasis(r: Vec3) {
  const basis = (x: Vec3, k: number): Vec3 => {
    if (k < 3) { const e: Vec3 = [0, 0, 0]; e[k] = 1; return e; }
    const e: Vec3 = [0, 0, 0];
    e[k - 3] = 1;
    return cross(e, [x[0] - r[0], x[1] - r[1], x[2] - r[2]]);
  };
  return Object.assign(basis, { ref: r });
}

/**
 * Damping matrix D (6 x 6, row-major) of a conductor meshed in world space, with field B (tesla) given at each
 * cell centre, for the six basis motions of `basis` (velocity of each at a point). P = q^T D q.
 */
export function eddyDamping(mesh: EddyMesh, sigma: number, B: Vec3[], basis: (x: Vec3, k: number) => Vec3): number[] {
  const D = new Array<number>(36).fill(0);
  if (sigma <= 0 || !mesh.faces.length) return D;
  const nc = mesh.cells.length, nf = mesh.faces.length;
  // the mesh as flat arrays: face ends, conductance weight area / distance, and the EMF along each face for each
  // basis motion, (u x B) . n with B averaged from the two cells
  const fi = new Int32Array(nf), fj = new Int32Array(nf);
  const w = new Float64Array(nf), area = new Float64Array(nf), dist = new Float64Array(nf), diag = new Float64Array(nc);
  const emf = new Float64Array(6 * nf);
  // a rigid basis about r: (u x B) . n = u . g with g = B x n, so the EMF is g for the translations and (x - r) x g
  // for the rotations
  const ref = (basis as { ref?: Vec3 }).ref;
  for (let m = 0; m < nf; m++) {
    const f = mesh.faces[m]!;
    fi[m] = f.i; fj[m] = f.j; area[m] = f.area; dist[m] = f.dist;
    const wm = f.area / f.dist;
    w[m] = wm; diag[f.i] += wm; diag[f.j] += wm;
    const bi = B[f.i]!, bj = B[f.j]!;
    const b: Vec3 = [(bi[0] + bj[0]) / 2, (bi[1] + bj[1]) / 2, (bi[2] + bj[2]) / 2];
    if (ref) {
      const g = cross(b, f.n), rg = cross([f.p[0] - ref[0], f.p[1] - ref[1], f.p[2] - ref[2]], g);
      for (let k = 0; k < 3; k++) { emf[k * nf + m] = g[k]!; emf[(k + 3) * nf + m] = rg[k]!; }
    } else {
      for (let k = 0; k < 6; k++) emf[k * nf + m] = dot(cross(basis(f.p, k), b), f.n);
    }
  }
  // L phi = -s, L the mesh's graph Laplacian, s the EMF flux out of each cell
  const lap = (x: Float64Array, out: Float64Array) => {
    out.fill(0);
    for (let m = 0; m < nf; m++) {
      const i = fi[m]!, j = fj[m]!, t = w[m]! * (x[i]! - x[j]!);
      out[i] += t; out[j] -= t;
    }
  };
  const J = new Float64Array(6 * nf), b = new Float64Array(nc);
  const direct = mesh.grid ? gridSolver(mesh.grid) : null;
  for (let k = 0; k < 6; k++) {
    b.fill(0);
    let flux = 0;
    for (let m = 0; m < nf; m++) {
      const t = area[m]! * emf[k * nf + m]!;
      b[fi[m]!] -= t; b[fj[m]!] += t;
      flux += t * t;
    }
    // Iteratively (no structure): converged when the charge balance is met to a part in 1e6 of the EMF fluxes
    // themselves (b alone can be ~0: an EMF that needs no charge to close its currents). P is the minimum over phi of
    // int sigma |E - grad phi|^2, and the exact currents are orthogonal to every gradient, so an error in phi changes
    // D only to second order: this leaves D good to about 1e-12.
    const phi = direct ? direct(b) : conjugateGradient(lap, diag, b, nc, 1e-6 * Math.sqrt(flux));
    for (let m = 0; m < nf; m++) J[k * nf + m] = emf[k * nf + m]! - (phi[fj[m]!]! - phi[fi[m]!]!) / dist[m]!;
  }
  for (let m = 0; m < nf; m++) {
    const v = sigma * area[m]! * dist[m]!;
    for (let k = 0; k < 6; k++) {
      const jk = v * J[k * nf + m]!;
      if (jk === 0) continue;
      for (let l = k; l < 6; l++) D[k * 6 + l] += jk * J[l * nf + m]!;
    }
  }
  for (let k = 0; k < 6; k++) for (let l = 0; l < k; l++) D[k * 6 + l] = D[l * 6 + k]!;
  return D;
}

/**
 * Conjugate gradients, preconditioned by the diagonal, for a connected mesh's graph Laplacian (null space: constants),
 * to residual norm `tol`. The residual is kept free of the constant null space, so rounding cannot build up along it.
 */
function conjugateGradient(A: (x: Float64Array, out: Float64Array) => void, diag: Float64Array, b: Float64Array, n: number, tol: number): Float64Array {
  const deflate = (v: Float64Array) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += v[i]!;
    s /= n;
    for (let i = 0; i < n; i++) v[i] -= s;
  };
  const x = new Float64Array(n), r = Float64Array.from(b), Ap = new Float64Array(n), z = new Float64Array(n);
  deflate(r);
  let rr = 0, rz = 0;
  for (let i = 0; i < n; i++) { z[i] = diag[i]! > 0 ? r[i]! / diag[i]! : 0; rr += r[i]! * r[i]!; rz += r[i]! * z[i]!; }
  const p = Float64Array.from(z);
  const tol2 = tol * tol;
  for (let it = 0; it < 4 * n + 50 && rr > tol2; it++) {
    A(p, Ap);
    let pAp = 0;
    for (let i = 0; i < n; i++) pAp += p[i]! * Ap[i]!;
    if (!(pAp > 0)) break;
    const a = rz / pAp;
    for (let i = 0; i < n; i++) { x[i] += a * p[i]!; r[i] -= a * Ap[i]!; }
    deflate(r);
    let rz2 = 0;
    rr = 0;
    for (let i = 0; i < n; i++) { z[i] = diag[i]! > 0 ? r[i]! / diag[i]! : 0; rr += r[i]! * r[i]!; rz2 += r[i]! * z[i]!; }
    const beta = rz2 / rz;
    rz = rz2;
    for (let i = 0; i < n; i++) p[i] = z[i]! + beta * p[i]!;
  }
  return x;
}

/** Point-dipole drag in a thin conducting tube (Levin et al., Am. J. Phys. 74, 815 (2006)): F = c v. */
export function tubeDipoleDrag(m: number, sigma: number, wall: number, radius: number) {
  const MU0 = 4e-7 * Math.PI;
  return (45 * MU0 * MU0 * m * m * sigma * wall) / (1024 * radius ** 4);
}
