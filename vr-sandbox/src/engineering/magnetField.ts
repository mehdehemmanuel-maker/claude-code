// Exact field of a uniformly charged flat pole face (Gilbert model), for a disc and for a rectangle.
//
// A face carrying surface charge sigma (A/m) produces, at a point p,
//   H(p) = sigma / (4 pi) * [ Omega(p) o  +  oint n_edge / |p - x| dl ]
// The part along the face's outward normal o is the solid angle Omega the face subtends at p (signed: positive in
// front of the face, negative behind); the in-plane part follows from the divergence theorem as a line integral of
// 1/|p - x| round the face's edge, n_edge being the edge's outward in-plane normal. Just in front of the face and
// inside its outline Omega -> 2 pi, so the field is the sheet value sigma / 2 there however the point sits over it.
//
// Disc: closed forms in complete and incomplete elliptic integrals (solid angle by Paxton, Rev. Sci. Instrum. 30,
// 254 (1959), through Heuman's lambda function); rectangle: arctangents and inverse hyperbolic sines. Elliptic
// integrals by Carlson's duplication algorithms (Numerical Recipes, 3rd ed., 6.12).
// All functions here are per unit sigma: multiply by the face's charge density.

/** Carlson's symmetric elliptic integral of the first kind R_F(x, y, z). */
export function carlsonRF(x: number, y: number, z: number): number {
  let xt = x, yt = y, zt = z, ave = 0, dx = 1, dy = 1, dz = 1;
  for (let i = 0; i < 60 && Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) > 0.0025; i++) {
    const sx = Math.sqrt(xt), sy = Math.sqrt(yt), sz = Math.sqrt(zt);
    const lam = sx * (sy + sz) + sy * sz;
    xt = 0.25 * (xt + lam); yt = 0.25 * (yt + lam); zt = 0.25 * (zt + lam);
    ave = (xt + yt + zt) / 3;
    dx = (ave - xt) / ave; dy = (ave - yt) / ave; dz = (ave - zt) / ave;
  }
  const e2 = dx * dy - dz * dz, e3 = dx * dy * dz;
  return (1 + (e2 / 24 - 0.1 - (3 / 44) * e3) * e2 + e3 / 14) / Math.sqrt(ave);
}

/** Carlson's symmetric elliptic integral of the second kind R_D(x, y, z). */
export function carlsonRD(x: number, y: number, z: number): number {
  const C1 = 3 / 14, C2 = 1 / 6, C3 = 9 / 22, C4 = 3 / 26, C5 = 0.25 * C3, C6 = 1.5 * C4;
  let xt = x, yt = y, zt = z, sum = 0, fac = 1, ave = 0, dx = 1, dy = 1, dz = 1;
  for (let i = 0; i < 60 && Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) > 0.0015; i++) {
    const sx = Math.sqrt(xt), sy = Math.sqrt(yt), sz = Math.sqrt(zt);
    const lam = sx * (sy + sz) + sy * sz;
    sum += fac / (sz * (zt + lam));
    fac *= 0.25;
    xt = 0.25 * (xt + lam); yt = 0.25 * (yt + lam); zt = 0.25 * (zt + lam);
    ave = 0.2 * (xt + yt + 3 * zt);
    dx = (ave - xt) / ave; dy = (ave - yt) / ave; dz = (ave - zt) / ave;
  }
  const ea = dx * dy, eb = dz * dz, ec = ea - eb, ed = ea - 6 * eb, ee = ed + ec + ec;
  return 3 * sum + (fac * (1 + ed * (-C1 + C5 * ed - C6 * dz * ee) + dz * (C2 * ee + dz * (-C3 * ec + dz * C4 * ea)))) / (ave * Math.sqrt(ave));
}

/** Complete elliptic integrals K(m) and E(m), parameter m = k^2 in [0, 1). */
export function ellipticKE(m: number): [number, number] {
  const K = carlsonRF(0, 1 - m, 1);
  return [K, K - (m / 3) * carlsonRD(0, 1 - m, 1)];
}

// (1 - m/2) K(m) - E(m) = (pi/2) sum g_n m^n, starting at m^2 / 16: summed as a series where the closed form cancels.
const G_SERIES = (() => {
  const k: number[] = [1], e: number[] = [1];
  for (let n = 1; n <= 48; n++) {
    k.push(k[n - 1]! * ((2 * n - 1) / (2 * n)) ** 2);
    e.push(-k[n]! / (2 * n - 1));
  }
  return k.map((kn, n) => (n === 0 ? 0 : kn - k[n - 1]! / 2 - e[n]!));
})();

/** (1 - m/2) K(m) - E(m), accurate for small m too (it vanishes as pi m^2 / 32). */
export function ellipticG(m: number): number {
  if (m < 0.25) {
    let sum = 0, mn = m * m;
    for (let n = 2; n < G_SERIES.length; n++, mn *= m) {
      const t = G_SERIES[n]! * mn;
      sum += t;
      if (Math.abs(t) < 1e-17 * sum) break;
    }
    return (Math.PI / 2) * sum;
  }
  const [K, E] = ellipticKE(m);
  return (1 - m / 2) * K - E;
}

/** Heuman's lambda function Lambda0(xi, m) for 0 <= xi <= pi/2, m = k^2. */
export function heumanLambda(xi: number, m: number): number {
  const [K, E] = ellipticKE(m);
  const mc = 1 - m; // the incomplete integrals are taken at the complementary parameter
  const s = Math.sin(xi), c = Math.cos(xi), y = 1 - mc * s * s;
  const rf = carlsonRF(c * c, y, 1);
  const F = s * rf;
  const Ei = F - (mc / 3) * s * s * s * carlsonRD(c * c, y, 1);
  return (2 / Math.PI) * (E * F + K * Ei - K * F);
}

/**
 * Field of a disc of radius a with unit surface charge, at axial distance s from its axis and signed height z over
 * it: [H along the outward normal, H radially outward from the axis]. z = 0 is taken as just in front.
 */
export function discField(a: number, s: number, z: number): [number, number] {
  const zz = Math.abs(z), sign = z < 0 ? -1 : 1;
  const Rmax2 = (a + s) * (a + s) + zz * zz, Rmax = Math.sqrt(Rmax2);
  const m = Math.min(1 - 1e-16, (4 * a * s) / Rmax2);
  let omega: number;
  if (zz === 0) omega = s < a ? 2 * Math.PI : s > a ? 0 : Math.PI;
  else {
    const t = ((2 * zz) / Rmax) * ellipticKE(m)[0];
    if (s === a) omega = Math.PI - t;
    else {
      const lam = heumanLambda(Math.atan2(zz, Math.abs(a - s)), m);
      omega = s < a ? 2 * Math.PI - t - Math.PI * lam : Math.PI * lam - t;
    }
  }
  const radial = s > 0 ? (Rmax / (2 * Math.PI * s)) * ellipticG(m) : 0;
  return [(sign * omega) / (4 * Math.PI), radial];
}

/**
 * Field of a rectangle [-hw, hw] x [-hh, hh] with unit surface charge at in-plane position (u, v) and signed height
 * z over it: [H_u, H_v, H along the outward normal]. z = 0 is taken as just in front.
 */
export function rectField(hw: number, hh: number, u: number, v: number, z: number): [number, number, number] {
  const zz = Math.abs(z), sign = z < 0 ? -1 : 1;
  const X = [-hw - u, hw - u], Y = [-hh - v, hh - v];
  let omega = 0;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const R = Math.sqrt(X[i]! * X[i]! + Y[j]! * Y[j]! + zz * zz);
      omega += ((i + j) % 2 === 0 ? 1 : -1) * Math.atan2(X[i]! * Y[j]!, zz * R);
    }
  }
  // line integral of 1/r along an edge at perpendicular distance d, from t0 to t1 along it
  const line = (d: number, t0: number, t1: number) => {
    const dd = Math.max(d, 1e-12 * (hw + hh));
    return Math.asinh(t1 / dd) - Math.asinh(t0 / dd);
  };
  const Hu = (line(Math.hypot(X[1]!, zz), Y[0]!, Y[1]!) - line(Math.hypot(X[0]!, zz), Y[0]!, Y[1]!)) / (4 * Math.PI);
  const Hv = (line(Math.hypot(Y[1]!, zz), X[0]!, X[1]!) - line(Math.hypot(Y[0]!, zz), X[0]!, X[1]!)) / (4 * Math.PI);
  return [Hu, Hv, (sign * omega) / (4 * Math.PI)];
}

// ---------------------------------------------------------------------------------------------
// Tabulated disc field. The field of a disc per unit charge depends only on s / a and z / a, so one table serves
// every disc. Near the disc (r < 6 radii) it is interpolated bicubically on a grid mapped by asinh, fine near the
// rim where the field has its step and logarithmic singularity; further out the exterior multipole expansion of a
// uniform disc,
//   phi = (q / 4 pi r) sum_l c_l (a/r)^l P_l(cos theta),  c = 1, -1/4, 1/8, -5/64  (l = 0, 2, 4, 6)
// (from the on-axis potential (sigma/2)(sqrt(z^2 + a^2) - z)), is exact to about 1e-6 there. Within 2e-3 radii of
// the rim itself, the closed form is used.

const T_E = 0.02, T_SMAX = 6.5, T_ZMAX = 6.5, T_NS = 192, T_NZ = 160, T_FAR = 6;
const tsLo = Math.asinh(-1 / T_E), tsHi = Math.asinh((T_SMAX - 1) / T_E), tzHi = Math.asinh(T_ZMAX / T_E);
let table: Float64Array | null = null;

function buildTable() {
  const t = new Float64Array(T_NS * T_NZ * 2);
  for (let i = 0; i < T_NS; i++) {
    const s = Math.max(0, 1 + T_E * Math.sinh(tsLo + ((tsHi - tsLo) * i) / (T_NS - 1)));
    for (let j = 0; j < T_NZ; j++) {
      const z = T_E * Math.sinh((tzHi * j) / (T_NZ - 1));
      const [n, r] = discField(1, s, z);
      t[(i * T_NZ + j) * 2] = n;
      t[(i * T_NZ + j) * 2 + 1] = r;
    }
  }
  return t;
}

/** Catmull-Rom weights for a fractional position f in [0, 1) between the 2nd and 3rd of four samples. */
function cubicWeights(f: number): [number, number, number, number] {
  const f2 = f * f, f3 = f2 * f;
  return [(-f3 + 2 * f2 - f) / 2, (3 * f3 - 5 * f2 + 2) / 2, (-3 * f3 + 4 * f2 + f) / 2, (f3 - f2) / 2];
}

function farField(s: number, z: number): [number, number] {
  // unit disc, unit charge density: q = pi, C_l = c_l / 4 (a = 1)
  const r2 = s * s + z * z, r = Math.sqrt(r2), mu = z / r, st = s / r;
  const c = [1, -1 / 4, 1 / 8, -5 / 64];
  let hr = 0, ht = 0;
  for (let k = 0; k < 4; k++) {
    const l = 2 * k;
    // Legendre P_l(mu) and its derivative by recurrence
    let p0 = 1, p1 = mu, d0 = 0, d1 = 1;
    let P = 1, dP = 0;
    if (l === 0) { P = 1; dP = 0; } else {
      for (let n = 1; n < l; n++) {
        const p2 = ((2 * n + 1) * mu * p1 - n * p0) / (n + 1);
        const d2 = ((2 * n + 1) * (p1 + mu * d1) - n * d0) / (n + 1);
        p0 = p1; p1 = p2; d0 = d1; d1 = d2;
      }
      P = p1; dP = d1;
    }
    const C = c[k]! / 4 / r ** (l + 2);
    hr += (l + 1) * C * P;
    ht += C * st * dP;
  }
  // spherical (r, theta) to the disc's normal (z) and radial (s) components
  return [hr * mu - ht * st, hr * st + ht * mu];
}

/**
 * Field of a disc of radius a with unit surface charge, like discField, from the table: [H normal, H radial].
 */
export function discFieldFast(a: number, s: number, z: number): [number, number] {
  const sn = s / a, zz = Math.abs(z) / a, sign = z < 0 ? -1 : 1;
  if (sn * sn + zz * zz > T_FAR * T_FAR) { const [n, r] = farField(sn, zz); return [sign * n, r]; }
  if (zz < 2e-3 && Math.abs(sn - 1) < 2e-2) return discField(a, s, z);
  table ??= buildTable();
  const u = ((Math.asinh((sn - 1) / T_E) - tsLo) / (tsHi - tsLo)) * (T_NS - 1);
  const v = (Math.asinh(zz / T_E) / tzHi) * (T_NZ - 1);
  const i = Math.min(T_NS - 3, Math.max(1, Math.floor(u))), j = Math.min(T_NZ - 3, Math.max(1, Math.floor(v)));
  const wu = cubicWeights(u - i), wv = cubicWeights(v - j);
  let n = 0, r = 0;
  for (let a2 = 0; a2 < 4; a2++) {
    for (let b2 = 0; b2 < 4; b2++) {
      const w = wu[a2]! * wv[b2]!, k = ((i - 1 + a2) * T_NZ + (j - 1 + b2)) * 2;
      n += w * table[k]!;
      r += w * table[k + 1]!;
    }
  }
  return [sign * n, r];
}
