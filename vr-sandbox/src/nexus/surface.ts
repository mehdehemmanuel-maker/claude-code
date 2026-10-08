// Freeform surfaces, as car bodies, hulls and fuselages are drawn: curves first, then skins stretched across them. The
// tools are the ones a surface modeller uses, each written from its formula:
//
//   NURBS curves and surfaces    C(u) = Σ N_i,p(u) w_i P_i / Σ N_i,p(u) w_i, the basis by the Cox–de Boor recursion on
//                                a clamped knot vector (Piegl & Tiller, The NURBS Book, 2nd ed., A2.2 and A4.1)
//   Coons patches                a surface from its four boundary curves: the two ruled surfaces between opposite
//                                pairs, less the bilinear surface through the corners (Coons 1967)
//   symmetry                     a half drawn, mirrored across z = 0; its first row off the mirror moved only in z, so
//                                the surface crosses the mirror with one tangent plane (G1)
//   proportional editing         a control point moved, its neighbours with it by a smooth falloff (1 − (d/r)²)²
//   fairing                      the control net relaxed toward its neighbours' mean (Laplacian), the boundary held
//
// and the critic's: curvature from the first and second fundamental forms (κ_mean, κ_gauss), how evenly curvature
// changes (its variation along a line, and how often it changes sign: a wobble or a dent), continuity across a seam
// (the gap G0, the angle between normals G1, the jump in curvature G2), and zebra lines: the reflection of parallel
// stripes in the surface, whose phase ψ = r·a (r the reflected view ray) is smooth only where the surface is; a break
// in ψ is a break in the surface's tangent, a kink in ψ a break in its curvature. Nothing here is about any one thing.

export type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k], dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));

// ---- B-spline basis ----------------------------------------------------------------------------------------------
/** A clamped, uniform knot vector for n control points of degree p. */
export function clampedKnots(n: number, p: number): number[] { const m = n + p + 1, k: number[] = []; for (let i = 0; i < m; i++) k.push(i <= p ? 0 : i >= n ? 1 : (i - p) / (n - p)); return k; }
/** The knot span holding u (The NURBS Book A2.1). */
function span(n: number, p: number, u: number, U: number[]): number { if (u >= U[n]!) return n - 1; let lo = p, hi = n, mid = (lo + hi) >> 1; while (u < U[mid]! || u >= U[mid + 1]!) { if (u < U[mid]!) hi = mid; else lo = mid; mid = (lo + hi) >> 1; } return mid; }
/** The p + 1 non-zero basis functions at u and their first and second derivatives (A2.3, to second order). */
function basis(i: number, u: number, p: number, U: number[]): number[][] {
  const ndu: number[][] = Array.from({ length: p + 1 }, () => new Array(p + 1).fill(0)), left = new Array(p + 1).fill(0), right = new Array(p + 1).fill(0); ndu[0]![0] = 1;
  for (let j = 1; j <= p; j++) { left[j] = u - U[i + 1 - j]!; right[j] = U[i + j]! - u; let saved = 0; for (let r = 0; r < j; r++) { ndu[j]![r] = right[r + 1] + left[j - r]; const t = ndu[r]![j - 1]! / (ndu[j]![r] || 1e-300); ndu[r]![j] = saved + right[r + 1] * t; saved = left[j - r] * t; } ndu[j]![j] = saved; }
  const n = 2, ders: number[][] = Array.from({ length: n + 1 }, () => new Array(p + 1).fill(0)); for (let j = 0; j <= p; j++) ders[0]![j] = ndu[j]![p]!;
  for (let r = 0; r <= p; r++) {
    let s1 = 0, s2 = 1; const a: number[][] = [new Array(p + 1).fill(0), new Array(p + 1).fill(0)]; a[0]![0] = 1;
    for (let k = 1; k <= n; k++) {
      let d = 0; const rk = r - k, pk = p - k;
      if (r >= k) { a[s2]![0] = a[s1]![0]! / (ndu[pk + 1]![rk] || 1e-300); d = a[s2]![0]! * ndu[rk]![pk]!; }
      const j1 = rk >= -1 ? 1 : -rk, j2 = r - 1 <= pk ? k - 1 : p - r;
      for (let j = j1; j <= j2; j++) { a[s2]![j] = (a[s1]![j]! - a[s1]![j - 1]!) / (ndu[pk + 1]![rk + j] || 1e-300); d += a[s2]![j]! * ndu[rk + j]![pk]!; }
      if (r <= pk) { a[s2]![k] = -a[s1]![k - 1]! / (ndu[pk + 1]![r] || 1e-300); d += a[s2]![k]! * ndu[r]![pk]!; }
      ders[k]![r] = d; const t = s1; s1 = s2; s2 = t;
    }
  }
  let r = p; for (let k = 1; k <= n; k++) { for (let j = 0; j <= p; j++) ders[k]![j] *= r; r *= p - k; }
  return ders;
}

// ---- curves -------------------------------------------------------------------------------------------------------
export interface Curve { P: V3[]; w?: number[]; p?: number }
/** A point on a NURBS curve, and its first and second derivatives (u from 0 to 1). */
export function curveAt(c: Curve, u: number): { at: V3; d1: V3; d2: V3 } {
  const n = c.P.length, p = Math.min(c.p ?? 3, n - 1), U = clampedKnots(n, p), i = span(n, p, u, U), N = basis(i, u, p, U), w = c.w ?? c.P.map(() => 1);
  // homogeneous sums, then the quotient rule
  const A: V3[] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], W = [0, 0, 0];
  for (let j = 0; j <= p; j++) { const k = i - p + j, wk = w[k]!; for (let d = 0; d < 3; d++) { A[d] = add(A[d]!, mul(c.P[k]!, N[d]![j]! * wk)); W[d] += N[d]![j]! * wk; } }
  const C0 = mul(A[0]!, 1 / W[0]!), C1 = mul(sub(A[1]!, mul(C0, W[1]!)), 1 / W[0]!), C2 = mul(sub(sub(A[2]!, mul(C1, 2 * W[1]!)), mul(C0, W[2]!)), 1 / W[0]!);
  return { at: C0, d1: C1, d2: C2 };
}
/** A curve's curvature at u: |C′ × C″| / |C′|³. */
export const curvature = (c: Curve, u: number) => { const { d1, d2 } = curveAt(c, u); return len(cross(d1, d2)) / Math.max(1e-12, len(d1) ** 3); };
/** A curve's points, n + 1 of them, for drawing it or laying a skin across it. */
export const curvePoints = (c: Curve, n = 48): V3[] => Array.from({ length: n + 1 }, (_, i) => curveAt(c, i / n).at);

// ---- surfaces -----------------------------------------------------------------------------------------------------
/** A tensor-product NURBS surface: rows of control points along u, each row along v. */
export interface Surface { net: V3[][]; w?: number[][]; p?: number; q?: number; /** drawn with its mirror across z = 0 */ mirror?: boolean }
export interface SurfacePoint { at: V3; du: V3; dv: V3; duu: V3; duv: V3; dvv: V3; n: V3 }
/** A point on a surface and its derivatives to second order (non-rational part by A3.6; weights by the quotient rule on
 *  the homogeneous sums). */
export function surfaceAt(s: Surface, u: number, v: number): SurfacePoint {
  const nu = s.net.length, nv = s.net[0]!.length, p = Math.min(s.p ?? 3, nu - 1), q = Math.min(s.q ?? 3, nv - 1), U = clampedKnots(nu, p), V = clampedKnots(nv, q);
  const iu = span(nu, p, u, U), iv = span(nv, q, v, V), Nu = basis(iu, u, p, U), Nv = basis(iv, v, q, V);
  const S: Record<string, V3> = {}, Wt: Record<string, number> = {};
  for (const [a, b] of [[0, 0], [1, 0], [0, 1], [2, 0], [1, 1], [0, 2]] as const) { let acc: V3 = [0, 0, 0], wa = 0; for (let k = 0; k <= p; k++) for (let l = 0; l <= q; l++) { const r = iu - p + k, c = iv - q + l, w = s.w?.[r]?.[c] ?? 1, f = Nu[a]![k]! * Nv[b]![l]! * w; acc = add(acc, mul(s.net[r]![c]!, f)); wa += f; } S[`${a}${b}`] = acc; Wt[`${a}${b}`] = wa; }
  const w0 = Wt['00']!, at = mul(S['00']!, 1 / w0);
  const du = mul(sub(S['10']!, mul(at, Wt['10']!)), 1 / w0), dv = mul(sub(S['01']!, mul(at, Wt['01']!)), 1 / w0);
  const duu = mul(sub(sub(S['20']!, mul(du, 2 * Wt['10']!)), mul(at, Wt['20']!)), 1 / w0);
  const dvv = mul(sub(sub(S['02']!, mul(dv, 2 * Wt['01']!)), mul(at, Wt['02']!)), 1 / w0);
  const duv = mul(sub(sub(sub(S['11']!, mul(du, Wt['01']!)), mul(dv, Wt['10']!)), mul(at, Wt['11']!)), 1 / w0);
  return { at, du, dv, duu, duv, dvv, n: unit(cross(du, dv)) };
}
/** Mean and Gaussian curvature at a point, from the first (E, F, G) and second (L, M, N) fundamental forms. */
export function curvatures(sp: SurfacePoint): { H: number; K: number; k1: number; k2: number } {
  const E = dot(sp.du, sp.du), F = dot(sp.du, sp.dv), G = dot(sp.dv, sp.dv), L = dot(sp.duu, sp.n), M = dot(sp.duv, sp.n), N = dot(sp.dvv, sp.n), d = E * G - F * F || 1e-12;
  const K = (L * N - M * M) / d, H = (E * N - 2 * F * M + G * L) / (2 * d), r = Math.sqrt(Math.max(0, H * H - K));
  return { H, K, k1: H + r, k2: H - r };
}
/** A surface tessellated: a grid of points and normals (its mirror after it, if it has one), and triangle indices. */
export function tessellate(s: Surface, nu = 32, nv = 24): { pos: number[]; nor: number[]; idx: number[] } {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const sheet = (flip: boolean) => {
    const base = pos.length / 3;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const sp = surfaceAt(s, i / nu, j / nv), z = flip ? -1 : 1; pos.push(sp.at[0], sp.at[1], sp.at[2] * z); nor.push(sp.n[0], sp.n[1], sp.n[2] * z); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = base + i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  };
  sheet(false); if (s.mirror) sheet(true);
  return { pos, nor, idx };
}
/** A surface's area (its tessellation's), m². */
export function surfaceArea(s: Surface, nu = 24, nv = 18): number {
  let A = 0; const g: V3[][] = [];
  for (let i = 0; i <= nu; i++) { g.push([]); for (let j = 0; j <= nv; j++) g[i]!.push(surfaceAt(s, i / nu, j / nv).at); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) A += len(cross(sub(g[i + 1]![j]!, g[i]![j]!), sub(g[i]![j + 1]!, g[i]![j]!))) * 0.5 + len(cross(sub(g[i + 1]![j]!, g[i + 1]![j + 1]!), sub(g[i]![j + 1]!, g[i + 1]![j + 1]!))) * 0.5;
  return A * (s.mirror ? 2 : 1);
}
/** Bounds of a surface: its control net's (a NURBS surface lies within the hull of its net), and its mirror's. */
export function surfaceBounds(s: Surface): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const row of s.net) for (const P of row) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k]!, P[k]!, k === 2 && s.mirror ? -P[k]! : Infinity); max[k] = Math.max(max[k]!, P[k]!, k === 2 && s.mirror ? -P[k]! : -Infinity); }
  return { min, max };
}

// ---- making surfaces -------------------------------------------------------------------------------------------------
/** A skin through section curves: each a row of the net (the sections must have as many control points as each other). */
export function skin(sections: Curve[], o: { mirror?: boolean; q?: number } = {}): Surface {
  const n = sections[0]!.P.length; if (sections.some((c) => c.P.length !== n)) throw new Error('every section needs as many control points');
  return { net: sections.map((c) => c.P.map((P) => [...P] as V3)), p: Math.min(3, sections.length - 1), q: o.q ?? Math.min(3, n - 1), mirror: o.mirror };
}
/** A Coons patch from four boundary curves, as a control net nu × nv: the patch's points at the net's places, each the
 *  two ruled surfaces less the bilinear one (top: u = 0 … 1 at v = 0; bottom at v = 1; left: v = 0 … 1 at u = 0; right
 *  at u = 1; corners shared). */
export function coons(top: Curve, bottom: Curve, left: Curve, right: Curve, nu = 7, nv = 6): Surface {
  const T = (u: number) => curveAt(top, u).at, B = (u: number) => curveAt(bottom, u).at, L = (v: number) => curveAt(left, v).at, R = (v: number) => curveAt(right, v).at;
  const c00 = T(0), c10 = T(1), c01 = B(0), c11 = B(1), net: V3[][] = [];
  for (let i = 0; i < nu; i++) { const u = i / (nu - 1); net.push([]); for (let j = 0; j < nv; j++) { const v = j / (nv - 1);
    const ruledU = add(mul(T(u), 1 - v), mul(B(u), v)), ruledV = add(mul(L(v), 1 - u), mul(R(v), u)), bil = add(add(mul(c00, (1 - u) * (1 - v)), mul(c10, u * (1 - v))), add(mul(c01, (1 - u) * v), mul(c11, u * v)));
    net[i]!.push(sub(add(ruledU, ruledV), bil)); } }
  return { net };
}
/** Made to cross its mirror smoothly: the row on z = 0 kept on it, the next row moved only in z (one tangent plane). */
export function symmetric(s: Surface, axisRow: 'first' | 'last' = 'first'): Surface {
  const net = s.net.map((r) => r.map((P) => [...P] as V3)), cols = net[0]!.length, a = axisRow === 'first' ? 0 : cols - 1, b = axisRow === 'first' ? 1 : cols - 2;
  for (const row of net) { row[a]![2] = 0; row[b]![0] = row[a]![0]; row[b]![1] = row[a]![1]; }
  return { ...s, net, mirror: true };
}
/** A control point moved, and its neighbours within r with it, by (1 − (d/r)²)². */
export function pull(s: Surface, i: number, j: number, by: V3, r: number): Surface {
  const c = s.net[i]![j]!, net = s.net.map((row) => row.map((P) => { const d = len(sub(P, c)); if (d >= r) return [...P] as V3; const f = (1 - (d / r) ** 2) ** 2; return add(P, mul(by, f)); }));
  return { ...s, net };
}
/** The net relaxed toward its neighbours' mean, so many times by so much, its boundary rows and columns held. */
export function fair(s: Surface, passes = 1, k = 0.5): Surface {
  let net = s.net.map((r) => r.map((P) => [...P] as V3));
  for (let t = 0; t < passes; t++) {
    const next = net.map((r) => r.map((P) => [...P] as V3));
    for (let i = 1; i < net.length - 1; i++) for (let j = 1; j < net[0]!.length - 1; j++) { const m = mul(add(add(net[i - 1]![j]!, net[i + 1]![j]!), add(net[i]![j - 1]!, net[i]![j + 1]!)), 0.25); next[i]![j] = add(net[i]![j]!, mul(sub(m, net[i]![j]!), k)); }
    net = next;
  }
  return { ...s, net };
}

// ---- the critic's eye -----------------------------------------------------------------------------------------------
export interface Fairness { /** curvature sign changes along the grid's lines: a wobble or a dent each */ wobbles: number; /** where the worst is (u, v) */ worst: [number, number]; /** the mean change in mean curvature from one sample to the next, per metre */ roughness: number; /** the largest and smallest mean curvature, 1/m */ Hmax: number; Hmin: number }
/** How fair a surface is: along each line of a sampling grid, how often its mean curvature changes sign (beyond a small
 *  dead band, so a flat region does not count) and how fast it changes. */
export function fairness(s: Surface, nu = 24, nv = 18, band = 0.05): Fairness {
  const H: number[][] = [], P: V3[][] = [];
  for (let i = 0; i <= nu; i++) { H.push([]); P.push([]); for (let j = 0; j <= nv; j++) { const sp = surfaceAt(s, i / nu, j / nv); H[i]!.push(curvatures(sp).H); P[i]!.push(sp.at); } }
  let wobbles = 0, worst: [number, number] = [0, 0], worstD = 0, rough = 0, cnt = 0, Hmax = -Infinity, Hmin = Infinity;
  const line = (get: (k: number) => [number, V3, number, number], n: number) => {
    let sign = 0;
    for (let k = 0; k <= n; k++) {
      const [h, p, u, v] = get(k); Hmax = Math.max(Hmax, h); Hmin = Math.min(Hmin, h); const sg = h > band ? 1 : h < -band ? -1 : 0;
      if (sg && sign && sg !== sign) wobbles++; if (sg) sign = sg;
      if (k) { const [h0, p0] = get(k - 1), d = Math.abs(h - h0) / Math.max(1e-6, len(sub(p, p0))); rough += d; cnt++; if (d > worstD) { worstD = d; worst = [u, v]; } }
    }
  };
  for (let i = 0; i <= nu; i++) line((j) => [H[i]![j]!, P[i]![j]!, i / nu, j / nv], nv);
  for (let j = 0; j <= nv; j++) line((i) => [H[i]![j]!, P[i]![j]!, i / nu, j / nv], nu);
  return { wobbles, worst, roughness: rough / Math.max(1, cnt), Hmax, Hmin };
}
/** Continuity where two surfaces meet along a seam: sampled pairs of points (a's at its edge, b's at its own), the
 *  gap between them (G0), the angle between their normals (G1), and the jump in mean curvature (G2). */
export function seam(a: Surface, ea: 'u0' | 'u1' | 'v0' | 'v1', b: Surface, eb: 'u0' | 'u1' | 'v0' | 'v1', n = 12, flip = false): { gap: number; angle: number; dH: number } {
  const at = (s: Surface, e: string, t: number) => surfaceAt(s, e === 'u0' ? 0 : e === 'u1' ? 1 : t, e === 'v0' ? 0 : e === 'v1' ? 1 : t);
  let gap = 0, angle = 0, dH = 0;
  for (let k = 0; k <= n; k++) { const t = k / n, pa = at(a, ea, t), pb = at(b, eb, flip ? 1 - t : t); gap = Math.max(gap, len(sub(pa.at, pb.at))); angle = Math.max(angle, Math.acos(Math.min(1, Math.abs(dot(pa.n, pb.n))))); dH = Math.max(dH, Math.abs(Math.abs(curvatures(pa).H) - Math.abs(curvatures(pb).H))); }
  return { gap, angle, dH };
}
/** Zebra lines, as numbers: the stripes' phase ψ = r·a over a grid (r the view ray reflected in the surface, a the stripes'
 *  axis), and how badly they break: the largest jump in ψ's slope from one sample to the next, against its typical slope.
 *  Smooth stripes on a fair surface score near 1; a crease or a dent several times that. */
export function zebra(s: Surface, view: V3 = [-1, -0.3, -0.6], axis: V3 = [0, 1, 0], nu = 32, nv = 24): { psi: number[][]; breaks: number; at: [number, number] } {
  const vdir = unit(view), psi: number[][] = [];
  for (let i = 0; i <= nu; i++) { psi.push([]); for (let j = 0; j <= nv; j++) { const n = surfaceAt(s, i / nu, j / nv).n, r = sub(vdir, mul(n, 2 * dot(vdir, n))); psi[i]!.push(dot(r, axis)); } }
  let worst = 0, at: [number, number] = [0, 0], typical = 0, cnt = 0;
  for (let i = 1; i < nu; i++) for (let j = 1; j < nv; j++) {
    const kink = Math.max(Math.abs(psi[i + 1]![j]! - 2 * psi[i]![j]! + psi[i - 1]![j]!), Math.abs(psi[i]![j + 1]! - 2 * psi[i]![j]! + psi[i]![j - 1]!));
    typical += kink; cnt++; if (kink > worst) { worst = kink; at = [i / nu, j / nv]; }
  }
  return { psi, breaks: worst / Math.max(1e-9, typical / Math.max(1, cnt)), at };
}
