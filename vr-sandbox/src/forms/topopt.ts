// Shapes grown by their loads. Bone lays material where it is stressed and takes it away where it isn't (Wolff's
// law); topology optimisation does the same by mathematics: a plate of elements, each with a density, is solved for
// its deflection under the loads, every element's share of the stiffness found, and material moved to where it
// stiffens the part most, until only the paths the loads take are left. The result is a shape nobody drew: a new
// geometry, found by physics.
//
// This is the SIMP method (Bendsøe; Sigmund's 99-line and Andreassen et al.'s 88-line codes): four-node plane-stress
// elements, penalised densities (E = Emin + x^p (E0 − Emin)), a density filter against checkerboards, optimality
// criteria updates. The stiffness is solved directly (banded Cholesky). The grown shape is then checked as
// the real part: its deflection and its von Mises stress in its material under the real loads, against its yield.

import type { Section } from './form';

export interface Support { edge: 'left' | 'right' | 'top' | 'bottom'; fix: 'x' | 'y' | 'both'; from?: number; to?: number }
export interface Load { at: [number, number]; force: [number, number] }

export interface Problem {
  /** Elements across and up, and each element's size (m). */
  nx: number;
  ny: number;
  h: number;
  /** Plate thickness (m) and material: Young's modulus (Pa), Poisson's ratio, yield (Pa). */
  t: number;
  E: number;
  nu: number;
  yield: number;
  supports: Support[];
  loads: Load[];
  /** Share of the plate kept (0..1). */
  volfrac: number;
  penal?: number;
  /** Filter radius in elements. */
  rmin?: number;
  iterations?: number;
}

export interface Grown {
  /** Element densities, row by row from the bottom (nx per row). */
  x: Float64Array;
  /** Compliance (J) of the grown shape under the real loads, and at each iteration (unit-modulus, unit-thickness). */
  compliance: number;
  history: number[];
  /** Under the real loads: the largest deflection (m) and von Mises stress (Pa) in the solid, and its safety factor on yield. */
  deflection: number;
  stress: number;
  safety: number;
  volume: number;
  /** How far from black-and-white (0 crisp, 1 all grey). */
  grey: number;
  iterations: number;
}

/** The four-node plane-stress element stiffness for unit modulus and thickness (Andreassen et al. 2011). */
function elementK(nu: number): Float64Array {
  const k = [1 / 2 - nu / 6, 1 / 8 + nu / 8, -1 / 4 - nu / 12, -1 / 8 + (3 * nu) / 8, -1 / 4 + nu / 12, -1 / 8 - nu / 8, nu / 6, 1 / 8 - (3 * nu) / 8];
  const c = 1 / (1 - nu * nu);
  const m = [
    [k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7]],
    [k[1], k[0], k[7], k[6], k[5], k[4], k[3], k[2]],
    [k[2], k[7], k[0], k[5], k[6], k[3], k[4], k[1]],
    [k[3], k[6], k[5], k[0], k[7], k[2], k[1], k[4]],
    [k[4], k[5], k[6], k[7], k[0], k[1], k[2], k[3]],
    [k[5], k[4], k[3], k[2], k[1], k[0], k[7], k[6]],
    [k[6], k[3], k[4], k[1], k[2], k[7], k[0], k[5]],
    [k[7], k[2], k[1], k[4], k[3], k[6], k[5], k[0]],
  ];
  return Float64Array.from(m.flat().map((v) => v! * c));
}

/**
 * Element e = row j (from the bottom) and column i. Nodes are numbered column by column from the bottom; an element's
 * dofs run counter-clockwise from its bottom-left node: (x, y) for each of bottom-left, bottom-right, top-right, top-left.
 */
function edofs(nx: number, ny: number): Int32Array {
  const out = new Int32Array(nx * ny * 8);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const e = j * nx + i;
    const bl = i * (ny + 1) + j, br = (i + 1) * (ny + 1) + j, tr = br + 1, tl = bl + 1;
    out.set([2 * bl, 2 * bl + 1, 2 * br, 2 * br + 1, 2 * tr, 2 * tr + 1, 2 * tl, 2 * tl + 1], e * 8);
  }
  return out;
}

/** Fixed dofs from the supports. */
function fixedDofs(p: Problem): Uint8Array {
  const fixed = new Uint8Array(2 * (p.nx + 1) * (p.ny + 1));
  const W = p.nx * p.h, H = p.ny * p.h;
  for (const s of p.supports) {
    for (let i = 0; i <= p.nx; i++) for (let j = 0; j <= p.ny; j++) {
      const on = s.edge === 'left' ? i === 0 : s.edge === 'right' ? i === p.nx : s.edge === 'bottom' ? j === 0 : j === p.ny;
      if (!on) continue;
      const along = s.edge === 'left' || s.edge === 'right' ? j * p.h / H : i * p.h / W;
      if (along < (s.from ?? 0) - 1e-9 || along > (s.to ?? 1) + 1e-9) continue;
      const n = i * (p.ny + 1) + j;
      if (s.fix !== 'y') fixed[2 * n] = 1;
      if (s.fix !== 'x') fixed[2 * n + 1] = 1;
    }
  }
  return fixed;
}

function forceVector(p: Problem): Float64Array {
  const f = new Float64Array(2 * (p.nx + 1) * (p.ny + 1));
  for (const l of p.loads) {
    const i = Math.max(0, Math.min(p.nx, Math.round(l.at[0] / p.h))), j = Math.max(0, Math.min(p.ny, Math.round(l.at[1] / p.h)));
    const n = i * (p.ny + 1) + j;
    f[2 * n] += l.force[0];
    f[2 * n + 1] += l.force[1];
  }
  return f;
}

/**
 * K u = f, directly: K assembled as a symmetric band (nodes numbered up each column, so an element's dofs lie within
 * 2(ny + 1) + 3 of each other), fixed dofs held to zero, factored by banded Cholesky. Exact to rounding.
 */
function solve(KE: Float64Array, ed: Int32Array, stiff: Float64Array, fixed: Uint8Array, f: Float64Array, u: Float64Array, ny: number): void {
  const n = f.length, ne = stiff.length, bw = 2 * (ny + 1) + 3, w = bw + 1;
  const L = new Float64Array(n * w);
  // assemble the lower band: entry (i, k), k <= i, at i * w + (i - k)
  for (let e = 0; e < ne; e++) {
    const s = stiff[e]!, o = e * 8;
    for (let a = 0; a < 8; a++) {
      const i = ed[o + a]!;
      if (fixed[i]) continue;
      for (let b = 0; b < 8; b++) {
        const k = ed[o + b]!;
        if (k > i || fixed[k]) continue;
        L[i * w + (i - k)] += s * KE[a * 8 + b]!;
      }
    }
  }
  for (let i = 0; i < n; i++) if (fixed[i]) L[i * w] = 1;
  // banded Cholesky, in place: K = L L'
  for (let j = 0; j < n; j++) {
    const j0 = Math.max(0, j - bw);
    let d = L[j * w]!;
    for (let k = j0; k < j; k++) { const v = L[j * w + (j - k)]!; d -= v * v; }
    const ljj = Math.sqrt(d);
    L[j * w] = ljj;
    for (let i = j + 1; i <= Math.min(n - 1, j + bw); i++) {
      let s = L[i * w + (i - j)]!;
      if (s === 0 && (i - j) > bw) continue;
      const k0 = Math.max(0, i - bw);
      for (let k = Math.max(j0, k0); k < j; k++) s -= L[i * w + (i - k)]! * L[j * w + (j - k)]!;
      L[i * w + (i - j)] = s / ljj;
    }
  }
  // forward and back substitution
  for (let i = 0; i < n; i++) {
    let s = fixed[i] ? 0 : f[i]!;
    for (let k = Math.max(0, i - bw); k < i; k++) s -= L[i * w + (i - k)]! * u[k]!;
    u[i] = s / L[i * w]!;
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = u[i]!;
    for (let k = i + 1; k <= Math.min(n - 1, i + bw); k++) s -= L[k * w + (k - i)]! * u[k]!;
    u[i] = s / L[i * w]!;
  }
}

/** The element-by-element strain energies u_e' KE u_e. */
function energies(KE: Float64Array, ed: Int32Array, u: Float64Array, ne: number): Float64Array {
  const ce = new Float64Array(ne);
  for (let e = 0; e < ne; e++) {
    const o = e * 8;
    let s = 0;
    for (let a = 0; a < 8; a++) { let acc = 0; for (let b = 0; b < 8; b++) acc += KE[a * 8 + b]! * u[ed[o + b]!]!; s += u[ed[o + a]!]! * acc; }
    ce[e] = s;
  }
  return ce;
}

/** Grow a shape for its loads: SIMP with a density filter and optimality-criteria updates. */
export function growShape(p: Problem): Grown {
  const { nx, ny } = p, ne = nx * ny, penal = p.penal ?? 3, rmin = p.rmin ?? 1.5, Emin = 1e-9;
  const KE = elementK(p.nu), ed = edofs(nx, ny), fixed = fixedDofs(p), f = forceVector(p);
  // the density filter: each element is the weighted mean of its neighbours within rmin
  const nbr: { j: number; w: number }[][] = [];
  const R = Math.ceil(rmin) - 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const list: { j: number; w: number }[] = [];
    for (let b = Math.max(j - R, 0); b <= Math.min(j + R, ny - 1); b++) for (let a = Math.max(i - R, 0); a <= Math.min(i + R, nx - 1); a++) {
      const w = rmin - Math.hypot(i - a, j - b);
      if (w > 0) list.push({ j: b * nx + a, w });
    }
    nbr.push(list);
  }
  const Hs = Float64Array.from(nbr, (l) => l.reduce((s, x) => s + x.w, 0));
  const filter = (x: Float64Array) => Float64Array.from(nbr, (l, e) => l.reduce((s, n) => s + n.w * x[n.j]!, 0) / Hs[e]!);
  let x = new Float64Array(ne).fill(p.volfrac);
  let xPhys = filter(x);
  const u = new Float64Array(f.length);
  const history: number[] = [];
  const maxIt = p.iterations ?? 80;
  let it = 0, change = 1;
  for (; it < maxIt && change > 0.01; it++) {
    const stiff = Float64Array.from(xPhys, (v) => Emin + v ** penal * (1 - Emin));
    solve(KE, ed, stiff, fixed, f, u, ny);
    const ce = energies(KE, ed, u, ne);
    let c = 0;
    const dc = new Float64Array(ne);
    for (let e = 0; e < ne; e++) { c += stiff[e]! * ce[e]!; dc[e] = -penal * xPhys[e]! ** (penal - 1) * (1 - Emin) * ce[e]!; }
    history.push(c);
    // chain rule through the filter: d/dx = H' (d/dxPhys / Hs)
    const dcf = new Float64Array(ne), dvf = new Float64Array(ne);
    for (let e = 0; e < ne; e++) for (const n of nbr[e]!) { dcf[n.j] += (n.w * dc[e]!) / Hs[e]!; dvf[n.j] += n.w / Hs[e]!; }
    // optimality criteria: bisect the volume's Lagrange multiplier
    let l1 = 0, l2 = 1e9;
    const move = 0.2;
    let xnew = x;
    while ((l2 - l1) / (l1 + l2) > 1e-4) {
      const lmid = (l1 + l2) / 2;
      xnew = Float64Array.from(x, (v, e) => Math.max(0, Math.max(v - move, Math.min(1, Math.min(v + move, v * Math.sqrt(Math.max(0, -dcf[e]!) / (dvf[e]! * lmid)))))));
      const phys = filter(xnew);
      if (phys.reduce((s, v) => s + v, 0) > p.volfrac * ne) l1 = lmid; else l2 = lmid;
    }
    change = xnew.reduce((m, v, e) => Math.max(m, Math.abs(v - x[e]!)), 0);
    x = xnew;
    xPhys = filter(x);
  }
  // the grown shape as the real part: real modulus, thickness and loads
  const stiff = Float64Array.from(xPhys, (v) => Emin + v ** penal * (1 - Emin));
  solve(KE, ed, stiff, fixed, f, u, ny);
  const scale = 1 / (p.E * p.t);
  let deflection = 0;
  for (let i = 0; i < u.length; i += 2) deflection = Math.max(deflection, Math.hypot(u[i]!, u[i + 1]!) * scale);
  const ce = energies(KE, ed, u, ne);
  const compliance = ce.reduce((s, v, e) => s + stiff[e]! * v, 0) * scale;
  // von Mises at each solid element's centre: strains from the shape functions' slopes there
  let stress = 0;
  const d = 1 / (2 * p.h), DN: [number, number][] = [[-d, -d], [d, -d], [d, d], [-d, d]];
  for (let e = 0; e < ne; e++) {
    if (xPhys[e]! < 0.5) continue;
    let ex = 0, ey = 0, g = 0;
    for (let a = 0; a < 4; a++) {
      const ux = u[ed[e * 8 + 2 * a]!]! * scale, uy = u[ed[e * 8 + 2 * a + 1]!]! * scale;
      ex += DN[a]![0] * ux; ey += DN[a]![1] * uy; g += DN[a]![1] * ux + DN[a]![0] * uy;
    }
    const k = (p.E * stiff[e]!) / (1 - p.nu * p.nu);
    const sx = k * (ex + p.nu * ey), sy = k * (ey + p.nu * ex), txy = k * ((1 - p.nu) / 2) * g;
    stress = Math.max(stress, Math.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy));
  }
  const grey = (4 * xPhys.reduce((s, v) => s + v * (1 - v), 0)) / ne;
  return { x: xPhys, compliance, history, deflection, stress, safety: p.yield / stress, volume: (xPhys.reduce((s, v) => s + v, 0) / ne) * nx * ny * p.h * p.h * p.t, grey, iterations: it };
}

/** A grown shape as a section of the form language: its densities as a field, solid where above a half. */
export function grownSection(g: Grown, p: Problem): Section {
  const bytes = Uint8Array.from(g.x, (v) => Math.max(0, Math.min(255, Math.round(v * 255))));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const data = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return { s: 'field', nu: p.nx, nv: p.ny, cell: p.h, data };
}
