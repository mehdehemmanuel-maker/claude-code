// A form made solid: its surface as a closed triangle mesh (surface nets on a sampled grid, only where the surface
// is), its mass properties integrated exactly over that mesh by the divergence theorem (Eberly's polyhedral mass
// properties), how much of it would hang unsupported if printed each way up, and its solid as boxes for the physics
// world (voxels merged greedily: a ring stays a ring, a hole stays a hole). The mesh converges on the true surface as
// the grid is refined; `solid` reports the grid it used, so its accuracy is known.

import { bounds, children, sd, formKey, walls, type Form, type V3 } from './form';

export interface Mesh {
  /** Vertex positions, x y z flat. */
  positions: Float64Array;
  /** Triangles, three vertex indices each, wound outward. */
  indices: Uint32Array;
}

export interface MassProps {
  /** m^3 */
  volume: number;
  centroid: V3;
  /** Second moments about the centroid per unit density (kg m^2 per kg/m^3): xx, yy, zz, xy, yz, zx. */
  inertia: [number, number, number, number, number, number];
  /** Surface area, m^2. */
  area: number;
}

export interface Solid {
  mesh: Mesh;
  mass: MassProps;
  cell: number;
  lo: V3;
  dims: [number, number, number];
  /** The grid was fine enough: at least 2.5 cells across its thinnest wall and 8 across its thinnest side. */
  resolved: boolean;
}

const cache = new Map<string, Solid>();

/**
 * A form's grid: its bounds padded by a cell and a half, the cell small enough for about `res` along its longest side,
 * 8 across its thinnest and 2.5 across its thinnest wall, but never more than `maxCells` in all.
 */
function grid(f: Form, res: number, maxCells: number) {
  const [lo0, hi0] = bounds(f);
  const ext = [0, 1, 2].map((i) => hi0[i]! - lo0[i]!);
  const thin = Math.min(...walls(f), Infinity);
  const want = Math.min(Math.max(...ext) / res, Math.min(...ext) / 8, thin / 2.5);
  const vol = ext.reduce((a, b) => a * b, 1);
  const h = Math.max(want, Math.cbrt(vol / maxCells));
  const lo: V3 = [lo0[0] - 1.5 * h, lo0[1] - 1.5 * h, lo0[2] - 1.5 * h];
  const dims: [number, number, number] = [0, 1, 2].map((i) => Math.ceil((hi0[i]! + 1.5 * h - lo[i]!) / h) + 1) as [number, number, number];
  return { h, lo, dims, resolved: h <= want * 1.0001 };
}

/**
 * The field sampled at every grid point, evaluated finely only near the surface: coarse blocks whose corners all lie
 * well away from the surface (farther than the block's diagonal) are filled without evaluating inside them.
 */
function sample(f: Form, h: number, lo: V3, dims: [number, number, number]): Float32Array {
  const [nx, ny, nz] = dims;
  const v = new Float32Array(nx * ny * nz).fill(NaN);
  const at = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  const B = 4;
  const evalAt = (i: number, j: number, k: number) => {
    const id = at(i, j, k);
    if (Number.isNaN(v[id]!)) v[id] = sd(f, [lo[0] + i * h, lo[1] + j * h, lo[2] + k * h]);
    return v[id]!;
  };
  for (let K = 0; K < nz - 1; K += B) for (let J = 0; J < ny - 1; J += B) for (let I = 0; I < nx - 1; I += B) {
    const i1 = Math.min(I + B, nx - 1), j1 = Math.min(J + B, ny - 1), k1 = Math.min(K + B, nz - 1);
    const corners = [evalAt(I, J, K), evalAt(i1, J, K), evalAt(I, j1, K), evalAt(i1, j1, K), evalAt(I, J, k1), evalAt(i1, J, k1), evalAt(I, j1, k1), evalAt(i1, j1, k1)];
    const diag = Math.hypot(i1 - I, j1 - J, k1 - K) * h;
    const far = corners.every((c) => c > diag) || corners.every((c) => c < -diag);
    for (let k = K; k <= k1; k++) for (let j = J; j <= j1; j++) for (let i = I; i <= i1; i++) {
      const id = at(i, j, k);
      if (!Number.isNaN(v[id]!)) continue;
      v[id] = far ? corners[0]! : sd(f, [lo[0] + i * h, lo[1] + j * h, lo[2] + k * h]);
    }
  }
  return v;
}

/** Surface nets: one vertex in each cell the surface crosses, a quad across each grid edge it crosses. */
function surfaceNets(v: Float32Array, h: number, lo: V3, dims: [number, number, number]): Mesh {
  const [nx, ny, nz] = dims;
  const at = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  const cellIx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cat = (i: number, j: number, k: number) => (k * (ny - 1) + j) * (nx - 1) + i;
  const pos: number[] = [];
  const E: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const off = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const c = new Array<number>(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let inside = 0;
    for (let q = 0; q < 8; q++) { c[q] = v[at(i + off[q]![0]!, j + off[q]![1]!, k + off[q]![2]!)]!; if (c[q]! < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      const va = c[a]!, vb = c[b]!;
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += off[a]![0]! + t * (off[b]![0]! - off[a]![0]!);
      sy += off[a]![1]! + t * (off[b]![1]! - off[a]![1]!);
      sz += off[a]![2]! + t * (off[b]![2]! - off[a]![2]!);
      n++;
    }
    cellIx[cat(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  const tri: number[] = [];
  const quad = (a: number, b: number, c2: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c2 < 0 || d < 0) return;
    if (flip) tri.push(a, c2, b, a, d, c2); else tri.push(a, b, c2, a, c2, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = v[at(i, j, k)]!, b = v[at(i + 1, j, k)]!;
    if ((a < 0) === (b < 0)) continue;
    quad(cellIx[cat(i, j - 1, k - 1)]!, cellIx[cat(i, j, k - 1)]!, cellIx[cat(i, j, k)]!, cellIx[cat(i, j - 1, k)]!, !(a < 0));
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = v[at(i, j, k)]!, b = v[at(i, j + 1, k)]!;
    if ((a < 0) === (b < 0)) continue;
    quad(cellIx[cat(i - 1, j, k - 1)]!, cellIx[cat(i - 1, j, k)]!, cellIx[cat(i, j, k)]!, cellIx[cat(i, j, k - 1)]!, !(a < 0));
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = v[at(i, j, k)]!, b = v[at(i, j, k + 1)]!;
    if ((a < 0) === (b < 0)) continue;
    quad(cellIx[cat(i - 1, j - 1, k)]!, cellIx[cat(i, j - 1, k)]!, cellIx[cat(i, j, k)]!, cellIx[cat(i - 1, j, k)]!, !(a < 0));
  }
  return { positions: Float64Array.from(pos), indices: Uint32Array.from(tri) };
}

/** Volume, centroid and inertia of a closed, outward-wound mesh, exactly (Eberly, Polyhedral Mass Properties). */
export function massProps(m: Mesh): MassProps {
  const P = m.positions, I = m.indices;
  const g = new Float64Array(10);
  let area = 0;
  const sub = (w0: number, w1: number, w2: number) => {
    const t0 = w0 + w1, f1 = t0 + w2, t1 = w0 * w0, t2 = t1 + w1 * t0, f2 = t2 + w2 * f1, f3 = w0 * t1 + w1 * t2 + w2 * f2;
    return { f1, f2, f3, g0: f2 + w0 * (f1 + w0), g1: f2 + w1 * (f1 + w1), g2: f2 + w2 * (f1 + w2) };
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t]! * 3, b = I[t + 1]! * 3, c = I[t + 2]! * 3;
    const x0 = P[a]!, y0 = P[a + 1]!, z0 = P[a + 2]!, x1 = P[b]!, y1 = P[b + 1]!, z1 = P[b + 2]!, x2 = P[c]!, y2 = P[c + 1]!, z2 = P[c + 2]!;
    const a1 = x1 - x0, b1 = y1 - y0, c1 = z1 - z0, a2 = x2 - x0, b2 = y2 - y0, c2 = z2 - z0;
    const d0 = b1 * c2 - b2 * c1, d1 = a2 * c1 - a1 * c2, d2 = a1 * b2 - a2 * b1;
    area += Math.hypot(d0, d1, d2) / 2;
    const X = sub(x0, x1, x2), Y = sub(y0, y1, y2), Z = sub(z0, z1, z2);
    g[0] += d0 * X.f1;
    g[1] += d0 * X.f2; g[2] += d1 * Y.f2; g[3] += d2 * Z.f2;
    g[4] += d0 * X.f3; g[5] += d1 * Y.f3; g[6] += d2 * Z.f3;
    g[7] += d0 * (y0 * X.g0 + y1 * X.g1 + y2 * X.g2);
    g[8] += d1 * (z0 * Y.g0 + z1 * Y.g1 + z2 * Y.g2);
    g[9] += d2 * (x0 * Z.g0 + x1 * Z.g1 + x2 * Z.g2);
  }
  const k = [1 / 6, 1 / 24, 1 / 24, 1 / 24, 1 / 60, 1 / 60, 1 / 60, 1 / 120, 1 / 120, 1 / 120];
  for (let i = 0; i < 10; i++) g[i]! *= k[i]!;
  const V = g[0]!;
  const cx = g[1]! / V, cy = g[2]! / V, cz = g[3]! / V;
  return {
    volume: V, centroid: [cx, cy, cz], area,
    inertia: [
      g[5]! + g[6]! - V * (cy * cy + cz * cz), g[4]! + g[6]! - V * (cz * cz + cx * cx), g[4]! + g[5]! - V * (cx * cx + cy * cy),
      -(g[7]! - V * cx * cy), -(g[8]! - V * cy * cz), -(g[9]! - V * cz * cx),
    ],
  };
}

/** A form made solid: its mesh at about `res` cells along its longest side, and its mass properties. Cached by genome. */
export function solid(f: Form, res = 48, maxCells = 2_000_000): Solid {
  const key = `${formKey(f)}:${res}:${maxCells}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { h, lo, dims, resolved } = grid(f, res, maxCells);
  const v = sample(f, h, lo, dims);
  const mesh = surfaceNets(v, h, lo, dims);
  const out = { mesh, mass: massProps(mesh), cell: h, lo, dims, resolved };
  if (cache.size > 64) cache.delete(cache.keys().next().value!);
  cache.set(key, out);
  return out;
}

/**
 * The share of its surface that would hang unsupported (facing down within `angle` of straight down) if printed with
 * each axis up, leaving out what rests on the bed. Steeper than about 45° from horizontal prints without support.
 */
export function overhangs(m: Mesh, angle = Math.PI / 4): { up: string; share: number }[] {
  const P = m.positions, I = m.indices;
  const ups: [string, V3][] = [['+z', [0, 0, 1]], ['-z', [0, 0, -1]], ['+y', [0, 1, 0]], ['-y', [0, -1, 0]], ['+x', [1, 0, 0]], ['-x', [-1, 0, 0]]];
  const cos = Math.cos(angle);
  return ups.map(([name, u]) => {
    let lowest = Infinity;
    for (let i = 0; i < P.length; i += 3) lowest = Math.min(lowest, P[i]! * u[0] + P[i + 1]! * u[1] + P[i + 2]! * u[2]);
    let down = 0, total = 0;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t]! * 3, b = I[t + 1]! * 3, c = I[t + 2]! * 3;
      const e1: V3 = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!], e2: V3 = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
      const n: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const ar = Math.hypot(...n) / 2;
      if (!ar) continue;
      total += ar;
      const facing = -(n[0] * u[0] + n[1] * u[1] + n[2] * u[2]) / (2 * ar);
      const height = ((P[a]! + P[b]! + P[c]!) * u[0] + (P[a + 1]! + P[b + 1]! + P[c + 1]!) * u[1] + (P[a + 2]! + P[b + 2]! + P[c + 2]!) * u[2]) / 3 - lowest;
      if (facing > cos && height > 1e-3) down += ar;
    }
    return { up: name, share: total ? down / total : 0 };
  }).sort((x, y) => x.share - y.share);
}

/** What a form touches with: a lattice by the body it fills (its sheets reach that body's faces), the rest as it is. */
function envelope(f: Form): Form {
  if (f.f === 'lattice') return envelope(f.of);
  const kids = children(f);
  if (!kids.length) return f;
  switch (f.f) {
    case 'union': case 'intersect': case 'blend': return { ...f, of: f.of.map(envelope) };
    case 'subtract': return { ...f, from: envelope(f.from) };
    case 'shell': case 'offset': case 'move': case 'scale': case 'mirror': case 'array': return { ...f, of: envelope(f.of) } as Form;
    default: return f;
  }
}

/**
 * Its solid as boxes for the physics world: inside cells (at about `res` along its longest side, and at least 3 across
 * its thinnest) merged greedily; a lattice by its envelope.
 */
export function boxes(form: Form, res = 20, max = 160): { center: V3; half: V3 }[] {
  const f = envelope(form);
  for (let r = res; r >= 6; r = Math.floor(r * 0.75)) {
    const [lo0, hi0] = bounds(f);
    const ext = [0, 1, 2].map((i) => hi0[i]! - lo0[i]!);
    const h = Math.min(Math.max(...ext) / r, Math.min(...ext) / 3);
    const n = [0, 1, 2].map((i) => Math.max(1, Math.ceil((hi0[i]! - lo0[i]!) / h))) as [number, number, number];
    const filled = new Uint8Array(n[0] * n[1] * n[2]);
    const at = (i: number, j: number, k: number) => (k * n[1] + j) * n[0] + i;
    for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
      if (sd(f, [lo0[0] + (i + 0.5) * h, lo0[1] + (j + 0.5) * h, lo0[2] + (k + 0.5) * h]) < 0) filled[at(i, j, k)] = 1;
    }
    const out: { center: V3; half: V3 }[] = [];
    for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
      if (!filled[at(i, j, k)]) continue;
      let i1 = i; while (i1 + 1 < n[0] && filled[at(i1 + 1, j, k)]) i1++;
      let j1 = j; grow: while (j1 + 1 < n[1]) { for (let a = i; a <= i1; a++) if (!filled[at(a, j1 + 1, k)]) break grow; j1++; }
      let k1 = k; deep: while (k1 + 1 < n[2]) { for (let b = j; b <= j1; b++) for (let a = i; a <= i1; a++) if (!filled[at(a, b, k1 + 1)]) break deep; k1++; }
      for (let c = k; c <= k1; c++) for (let b = j; b <= j1; b++) for (let a = i; a <= i1; a++) filled[at(a, b, c)] = 0;
      out.push({
        center: [lo0[0] + ((i + i1 + 1) / 2) * h, lo0[1] + ((j + j1 + 1) / 2) * h, lo0[2] + ((k + k1 + 1) / 2) * h],
        half: [((i1 - i + 1) * h) / 2, ((j1 - j + 1) * h) / 2, ((k1 - k + 1) * h) / 2],
      });
    }
    if (out.length <= max || r <= 6) return out;
  }
  return [];
}
