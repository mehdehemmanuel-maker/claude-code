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
/** Where on a clamped, uniform B-spline each of its n control points acts most: its Greville abscissa, the mean of the p
 *  knots after it. (A region of a skin is bounded at a control point's line by this.) */
export function greville(n: number, p: number): number[] { const U = clampedKnots(n, Math.min(p, n - 1)), q = Math.min(p, n - 1); return Array.from({ length: n }, (_, i) => { let a = 0; for (let k = 1; k <= q; k++) a += U[i + k]!; return a / q; }); }
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
export interface Curve { P: V3[]; w?: number[]; p?: number; /** its knots, where not clamped and uniform (an interpolated curve's) */ U?: number[] }
const degreeOf = (n: number, p: number | undefined, U?: number[]) => (U ? U.length - n - 1 : Math.min(p ?? 3, n - 1));
/** A point on a NURBS curve, and its first and second derivatives (u from 0 to 1). */
export function curveAt(c: Curve, u: number): { at: V3; d1: V3; d2: V3 } {
  const n = c.P.length, p = degreeOf(n, c.p, c.U), U = c.U ?? clampedKnots(n, p), i = span(n, p, u, U), N = basis(i, u, p, U), w = c.w ?? c.P.map(() => 1);
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
export interface Surface { net: V3[][]; w?: number[][]; p?: number; q?: number; /** its knots along u and v, where not clamped and uniform */ U?: number[]; V?: number[]; /** drawn with its mirror across z = 0 */ mirror?: boolean }
export interface SurfacePoint { at: V3; du: V3; dv: V3; duu: V3; duv: V3; dvv: V3; n: V3 }
/** A point on a surface and its derivatives to second order (non-rational part by A3.6; weights by the quotient rule on
 *  the homogeneous sums). */
export function surfaceAt(s: Surface, u: number, v: number): SurfacePoint {
  const nu = s.net.length, nv = s.net[0]!.length, p = degreeOf(nu, s.p, s.U), q = degreeOf(nv, s.q, s.V), U = s.U ?? clampedKnots(nu, p), V = s.V ?? clampedKnots(nv, q);
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
/** The p + 1 non-zero basis functions at u, without their derivatives (The NURBS Book A2.2): for a point alone. */
function basis0(i: number, u: number, p: number, U: number[]): number[] {
  const N = new Array(p + 1).fill(0), left = new Array(p + 1).fill(0), right = new Array(p + 1).fill(0); N[0] = 1;
  for (let j = 1; j <= p; j++) { left[j] = u - U[i + 1 - j]!; right[j] = U[i + j]! - u; let saved = 0; for (let r = 0; r < j; r++) { const t = N[r]! / ((right[r + 1] + left[j - r]) || 1e-300); N[r] = saved + right[r + 1] * t; saved = left[j - r] * t; } N[j] = saved; }
  return N;
}
const knotsOf = new WeakMap<Surface, { p: number; q: number; U: number[]; V: number[] }>();
/** A point on a surface and nothing more: a third of the work of surfaceAt, for searching along it and sampling it. */
export function pointAt(s: Surface, u: number, v: number): V3 {
  let k = knotsOf.get(s); if (!k) { const nu = s.net.length, nv = s.net[0]!.length, p = degreeOf(nu, s.p, s.U), q = degreeOf(nv, s.q, s.V); k = { p, q, U: s.U ?? clampedKnots(nu, p), V: s.V ?? clampedKnots(nv, q) }; knotsOf.set(s, k); }
  const nu = s.net.length, nv = s.net[0]!.length, iu = span(nu, k.p, u, k.U), iv = span(nv, k.q, v, k.V), Nu = basis0(iu, u, k.p, k.U), Nv = basis0(iv, v, k.q, k.V);
  let x = 0, y = 0, z = 0, W = 0;
  for (let a = 0; a <= k.p; a++) for (let b = 0; b <= k.q; b++) { const r = iu - k.p + a, c = iv - k.q + b, w = (s.w?.[r]?.[c] ?? 1) * Nu[a]! * Nv[b]!, P = s.net[r]![c]!; x += P[0] * w; y += P[1] * w; z += P[2] * w; W += w; }
  return [x / W, y / W, z / W];
}
/** Mean and Gaussian curvature at a point, from the first (E, F, G) and second (L, M, N) fundamental forms. */
export function curvatures(sp: SurfacePoint): { H: number; K: number; k1: number; k2: number } {
  const E = dot(sp.du, sp.du), F = dot(sp.du, sp.dv), G = dot(sp.dv, sp.dv), L = dot(sp.duu, sp.n), M = dot(sp.duv, sp.n), N = dot(sp.dvv, sp.n), d = E * G - F * F || 1e-12;
  const K = (L * N - M * M) / d, H = (E * N - 2 * F * M + G * L) / (2 * d), r = Math.sqrt(Math.max(0, H * H - K));
  return { H, K, k1: H + r, k2: H - r };
}
// ---- patches: a part of a surface ------------------------------------------------------------------------------------
export type UV = [number, number];
/** A part of a surface: the region within a quad of (u, v) corners, in order round it, set off along its normal (a
 *  window's glass on its cabin, a door's skin within its shut lines, a lamp's lens in its fascia). The whole surface where
 *  no corners are said. Drawn with its mirror where its surface has one. */
export interface Patch { s: Surface; uv?: [UV, UV, UV, UV]; /** or the region above a line across the surface, up to v = to (1 if not said): a panel trimmed
 *  round a wheel's arch, its line rising over the arch and falling back */ above?: UV[]; to?: number; /** where, on its top edge (v = to), its two ends
 *  are, as u (else straight above the line's own ends): a door's shut line leaning forward as it rises */ top?: [number, number]; off?: number }
const asPatch = (x: Surface | Patch): Patch => ('net' in x ? { s: x } : x);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** Where (a, b) in a patch's own square falls on its surface (bilinear between its corners). */
const runs = new WeakMap<UV[], number[]>();
/** Where a share a of the way along a line on a surface falls, by its length on the surface (not in (u, v)). */
function along(s: Surface, line: UV[], a: number): UV {
  let cum = runs.get(line);
  if (!cum) { cum = [0]; for (let k = 1; k < line.length; k++) { const p = surfaceAt(s, clamp01(line[k - 1]![0]), clamp01(line[k - 1]![1])).at, q = surfaceAt(s, clamp01(line[k]![0]), clamp01(line[k]![1])).at; cum.push(cum[k - 1]! + len(sub(q, p)) + 1e-9); } runs.set(line, cum); }
  const T = cum[cum.length - 1]! * clamp01(a); let k = 1; while (k < cum.length - 1 && cum[k]! < T) k++;
  const f = (T - cum[k - 1]!) / Math.max(1e-12, cum[k]! - cum[k - 1]!), A = line[k - 1]!, B = line[k]!;
  return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
}
export function uvOf(pt: Patch, a: number, b: number): UV {
  if (pt.above) { const [u, v] = along(pt.s, pt.above, a), top = pt.to ?? 1; if (!pt.top) return [u, v + (top - v) * b]; const uT = pt.top[0] + (pt.top[1] - pt.top[0]) * a; return [u + (uT - u) * b, v + (top - v) * b]; }
  if (!pt.uv) return [a, b]; const [p0, p1, p2, p3] = pt.uv;
  return [0, 1].map((k) => (1 - a) * (1 - b) * p0[k]! + a * (1 - b) * p1[k]! + a * b * p2[k]! + (1 - a) * b * p3[k]!) as UV;
}
/** A point on a patch, its derivatives and normal its surface's there. */
export function patchAt(pt: Patch, a: number, b: number): SurfacePoint {
  const [u, v] = uvOf(pt, a, b), sp = surfaceAt(pt.s, clamp01(u), clamp01(v));
  return pt.off ? { ...sp, at: add(sp.at, mul(sp.n, pt.off)) } : sp;
}
/** A patch's points over a grid of na × nb (and its mirror's after them, where it has one). */
// (what a skin's points are depends only on it and how finely it is sampled: kept by the skin, as everything else known of it)
const sampled = new WeakMap<object, Map<string, V3[]>>();
export function patchPoints(x: Surface | Patch, na = 16, nb = 12, mirrored = true): V3[] {
  let m = sampled.get(x); if (!m) { m = new Map(); sampled.set(x, m); }
  const key = `${na}:${nb}:${mirrored}`; let got = m.get(key); if (!got) { got = samplePoints(x, na, nb, mirrored); m.set(key, got); }
  return got;
}
function samplePoints(x: Surface | Patch, na: number, nb: number, mirrored: boolean): V3[] {
  const pt = asPatch(x), out: V3[] = [];
  for (let i = 0; i <= na; i++) for (let j = 0; j <= nb; j++) { if (pt.off) { out.push(patchAt(pt, i / na, j / nb).at); continue; } const [u, v] = uvOf(pt, i / na, j / nb); out.push(pointAt(pt.s, clamp01(u), clamp01(v))); }
  if (mirrored && pt.s.mirror) for (let k = 0, n = out.length; k < n; k++) { const q = out[k]!; out.push([q[0], q[1], -q[2]]); }
  return out;
}
/** A patch tessellated: a grid of points and normals (its mirror after it, if it has one), and triangle indices wound
 *  to agree with its normals. */
export function tessellate(x: Surface | Patch, nu = 32, nv = 24): { pos: number[]; nor: number[]; idx: number[] } {
  const pt = asPatch(x), pos: number[] = [], nor: number[] = [], idx: number[] = [];
  // the corners' order may turn the patch's square over against its surface's (u, v): wind it the other way then
  const c = pt.uv, ab = pt.above, turn = c ? ((c[1][0] - c[0][0]) * (c[3][1] - c[0][1]) - (c[1][1] - c[0][1]) * (c[3][0] - c[0][0])) < 0 : ab ? (ab[ab.length - 1]![0] < ab[0]![0]) !== ((pt.to ?? 1) < ab[0]![1]) : false;
  const sheet = (flip: boolean) => {
    const base = pos.length / 3;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const sp = patchAt(pt, i / nu, j / nv), z = flip ? -1 : 1; pos.push(sp.at[0], sp.at[1], sp.at[2] * z); nor.push(sp.n[0], sp.n[1], sp.n[2] * z); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = base + i * (nv + 1) + j, b = a + 1, c2 = a + nv + 1, d = c2 + 1; if (flip !== turn) idx.push(a, b, c2, b, d, c2); else idx.push(a, c2, b, b, c2, d); }
  };
  sheet(false); if (pt.s.mirror) sheet(true);
  return { pos, nor, idx };
}
/** A patch's area (its tessellation's, and its mirror's), m². */
const areas = new WeakMap<object, number>();
export function surfaceArea(x: Surface | Patch, nu = 24, nv = 18): number {
  const kept = nu === 24 && nv === 18 ? areas.get(x) : undefined; if (kept !== undefined) return kept;
  const A0 = areaOf(asPatch(x), nu, nv); if (nu === 24 && nv === 18) areas.set(x, A0); return A0;
}
function areaOf(pt: Patch, nu: number, nv: number): number {
  const g: V3[][] = []; let A = 0;
  for (let i = 0; i <= nu; i++) { g.push([]); for (let j = 0; j <= nv; j++) g[i]!.push(patchAt(pt, i / nu, j / nv).at); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) A += len(cross(sub(g[i + 1]![j]!, g[i]![j]!), sub(g[i]![j + 1]!, g[i]![j]!))) * 0.5 + len(cross(sub(g[i + 1]![j]!, g[i + 1]![j + 1]!), sub(g[i]![j + 1]!, g[i + 1]![j + 1]!))) * 0.5;
  return A * (pt.s.mirror ? 2 : 1);
}
/** Bounds of a patch and its mirror: a whole surface's from its control net (it lies within the net's hull), a part's
 *  from its points. */
export function surfaceBounds(x: Surface | Patch): { min: V3; max: V3 } {
  const pt = asPatch(x), pts = pt.uv || pt.off ? patchPoints(pt, 20, 14) : pt.s.net.flat().flatMap((q) => (pt.s.mirror ? [q, [q[0], q[1], -q[2]] as V3] : [q]));
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const q of pts) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k]!, q[k]!); max[k] = Math.max(max[k]!, q[k]!); }
  return { min, max };
}

// ---- through given points: interpolation (The NURBS Book 9.2.1 and 9.2.5) -------------------------------------------
/** Chord-length parameters for points along a line of them (even, where they all coincide). */
function chordParams(Q: V3[]): number[] {
  const d = [0]; for (let k = 1; k < Q.length; k++) d.push(d[k - 1]! + len(sub(Q[k]!, Q[k - 1]!)));
  const T = d[d.length - 1]!; return T > 1e-9 ? d.map((x) => x / T) : Q.map((_, k) => k / Math.max(1, Q.length - 1));
}
/** Knots averaged from the parameters (9.8), so every span holds a parameter and the system below is never singular. */
function averagedKnots(t: number[], p: number): number[] {
  const n = t.length, U: number[] = []; for (let i = 0; i <= p; i++) U.push(0);
  for (let j = 1; j <= n - p - 1; j++) { let a = 0; for (let i = j; i < j + p; i++) a += t[i]!; U.push(a / p); }
  for (let i = 0; i <= p; i++) U.push(1); return U;
}
/** Control points whose curve passes through Q at the parameters t on the knots U (degree p), and leaves its first point
 *  along d0 and arrives at its last along d1 where they are given (The NURBS Book 9.2.2: a constraint each, a control
 *  point each): N P = Q, solved by elimination with partial pivoting. */
function through(Q: V3[], t: number[], U: number[], p: number, d0?: V3, d1?: V3): V3[] {
  const rows: { at: number; der: 0 | 1; rhs: V3 }[] = Q.map((q, k) => ({ at: t[k]!, der: 0 as const, rhs: q }));
  if (d0) rows.splice(1, 0, { at: 0, der: 1, rhs: d0 }); if (d1) rows.splice(rows.length - 1, 0, { at: 1, der: 1, rhs: d1 });
  const n = rows.length, A = Array.from({ length: n }, () => new Array(n).fill(0)), B = rows.map((r) => [...r.rhs] as V3);
  rows.forEach((r, k) => { const i = span(n, p, r.at, U), N = basis(i, r.at, p, U)[r.der]!; for (let j = 0; j <= p; j++) A[k]![i - p + j] = N[j]!; });
  for (let c = 0; c < n; c++) {
    let r = c; for (let k = c + 1; k < n; k++) if (Math.abs(A[k]![c]!) > Math.abs(A[r]![c]!)) r = k;
    [A[c], A[r]] = [A[r]!, A[c]!]; [B[c], B[r]] = [B[r]!, B[c]!]; const d = A[c]![c]! || 1e-300;
    for (let k = c + 1; k < n; k++) { const f = A[k]![c]! / d; if (!f) continue; for (let j = c; j < n; j++) A[k]![j] -= f * A[c]![j]!; B[k] = sub(B[k]!, mul(B[c]!, f)); }
  }
  const P: V3[] = new Array(n); for (let c = n - 1; c >= 0; c--) { let acc = B[c]!; for (let j = c + 1; j < n; j++) acc = sub(acc, mul(P[j]!, A[c]![j]!)); P[c] = mul(acc, 1 / (A[c]![c]! || 1e-300)); }
  return P;
}
/** The parameters a constrained interpolation's knots are averaged from: an end with a tangent said counted twice. */
const withEnds = (t: number[], d0: boolean, d1: boolean) => [...(d0 ? [t[0]!] : []), ...t, ...(d1 ? [t[t.length - 1]!] : [])];
/** Fair fitting (as car surfaces are reverse-engineered and refined): n control points whose curve passes near Q at the
 *  parameters t rather than through them, the sum of squared misses plus λ times the curve's bending (the squared second
 *  differences of its control polygon) the least. Its ends are kept exactly, and its end tangents where given. Forcing a
 *  curve through every point turns each small irregularity between them into a wave; a fair fit does not. */
export function fitThrough(Q: V3[], t: number[], n: number, p: number, lambda: number, d0?: V3, d1?: V3): { P: V3[]; U: number[] } {
  const K = Q.length, nn = Math.max(p + 1, Math.min(n, K + (d0 ? 1 : 0) + (d1 ? 1 : 0))), U = clampedKnots(nn, p);
  // what is fixed: the ends, and the points next to them where a tangent is said (C'(0) = p / U[p+1] (P1 − P0))
  const fixed = new Map<number, V3>([[0, Q[0]!], [nn - 1, Q[K - 1]!]]);
  if (d0) fixed.set(1, add(Q[0]!, mul(d0, U[p + 1]! / p))); if (d1) fixed.set(nn - 2, sub(Q[K - 1]!, mul(d1, (1 - U[nn - 1]!) / p)));
  const free = Array.from({ length: nn }, (_, i) => i).filter((i) => !fixed.has(i)), idx = new Map(free.map((i, k) => [i, k])), m = free.length;
  const A = Array.from({ length: m }, () => new Array(m).fill(0)), B: V3[] = Array.from({ length: m }, () => [0, 0, 0] as V3);
  const addRow = (coef: Map<number, number>, rhs: V3, w: number) => {
    let r: V3 = mul(rhs, 1); for (const [i, c] of coef) { const f = fixed.get(i); if (f) r = sub(r, mul(f, c)); }
    for (const [i, ci] of coef) { const a = idx.get(i); if (a === undefined) continue; B[a] = add(B[a]!, mul(r, w * ci)); for (const [j, cj] of coef) { const b = idx.get(j); if (b !== undefined) A[a]![b] += w * ci * cj; } }
  };
  for (let k = 0; k < K; k++) { const i = span(nn, p, t[k]!, U), N = basis(i, t[k]!, p, U)[0]!, coef = new Map<number, number>(); for (let j = 0; j <= p; j++) if (N[j]) coef.set(i - p + j, N[j]!); addRow(coef, Q[k]!, 1); }
  for (let i = 1; i < nn - 1; i++) addRow(new Map([[i - 1, 1], [i, -2], [i + 1, 1]]), [0, 0, 0], lambda);
  // solved by elimination (the normal equations are small and, with the bending term, never singular)
  for (let c = 0; c < m; c++) { let r = c; for (let k = c + 1; k < m; k++) if (Math.abs(A[k]![c]!) > Math.abs(A[r]![c]!)) r = k; [A[c], A[r]] = [A[r]!, A[c]!]; [B[c], B[r]] = [B[r]!, B[c]!]; const d = A[c]![c]! || 1e-300; for (let k = c + 1; k < m; k++) { const f = A[k]![c]! / d; if (!f) continue; for (let j = c; j < m; j++) A[k]![j] -= f * A[c]![j]!; B[k] = sub(B[k]!, mul(B[c]!, f)); } }
  const X: V3[] = new Array(m); for (let c = m - 1; c >= 0; c--) { let acc = B[c]!; for (let j = c + 1; j < m; j++) acc = sub(acc, mul(X[j]!, A[c]![j]!)); X[c] = mul(acc, 1 / (A[c]![c]! || 1e-300)); }
  return { P: Array.from({ length: nn }, (_, i) => fixed.get(i) ?? X[idx.get(i)!]!), U };
}
/** A curve through the points given, in their order (degree 3, or less where there are fewer than four). */
export function interpolate(Q: V3[], p = 3, ends: { d0?: V3; d1?: V3 } = {}): Curve {
  const m = Q.length + (ends.d0 ? 1 : 0) + (ends.d1 ? 1 : 0), d = Math.min(p, m - 1), t = chordParams(Q), U = averagedKnots(withEnds(t, !!ends.d0, !!ends.d1), d);
  return { P: through(Q, t, U, d, ends.d0, ends.d1), U };
}
/** A skin through rows of points: each row a section (all with as many points), the surface passing through every
 *  point given. Each section is interpolated on parameters shared by all of them, then each column of the sections'
 *  control points across the sections (a skinned or lofted surface by interpolation). */
export function skinThrough(rows: V3[][], o: { p?: number; q?: number; mirror?: boolean; /** each section's tangent leaving its first point and arriving at its last, where said (a hood's at its middle: straight across, so its mirror meets it in one tangent plane) */ d0?: (i: number) => V3 | undefined; d1?: (i: number) => V3 | undefined; /** the skin's tangent leaving its first section and arriving at its last, where said: a body's nose, where every line along it meets the mirror, square to the mirror (G1 across it, no crease down the middle) */ e0?: V3; e1?: V3; /** across the sections, fitted fairly (so many control points, so much weight on bending) rather than forced through every one */ fit?: { n: number; lambda: number }; /** each section is the control polygon of its curve, not points on it */ control?: boolean; /** the sections' own parameters across the skin, where they are not to be by chord length: a body's by where its stations stand along it, so every station is a flat section of it and nothing between them runs past its ends */ u?: number[] } = {}): Surface {
  const K = rows.length, M = rows[0]!.length; if (rows.some((r) => r.length !== M)) throw new Error('every section needs as many points');
  const has0 = !o.control && !!o.d0?.(0), has1 = !o.control && !!o.d1?.(0), Mc = M + (has0 ? 1 : 0) + (has1 ? 1 : 0);
  const q = Math.min(o.q ?? 3, Mc - 1);
  const avg = (ts: number[][]) => ts[0]!.map((_, j) => ts.reduce((a, t) => a + t[j]!, 0) / ts.length);
  // a tangent's length: the section's own chord length, so the end is neither pinched nor ballooned
  const chord = (r: V3[]) => r.slice(1).reduce((a, q2, k) => a + len(sub(q2, r[k]!)), 0);
  // each section either its control polygon as drawn (variation diminishing: it never wavers more than its polygon), or a
  // curve forced through its points
  const vb = avg(rows.map(chordParams)), V = o.control ? clampedKnots(M, q) : averagedKnots(withEnds(vb, has0, has1), q);
  const R = o.control ? rows.map((r) => r.map((P) => [...P] as V3)) : rows.map((r, i) => through(r, vb, V, q, has0 ? mul(unit(o.d0!(i)!), chord(r)) : undefined, has1 ? mul(unit(o.d1!(i)!), chord(r)) : undefined));
  const ub = o.u ?? avg(Array.from({ length: M }, (_, j) => chordParams(rows.map((r) => r[j]!))));
  if (o.fit) {
    const pc = Math.min(o.p ?? 3, o.fit.n - 1); let U: number[] = [];
    const cols = Array.from({ length: Mc }, (_, j) => { const col = R.map((r) => r[j]!), ch = chord(col), f = fitThrough(col, ub, o.fit!.n, pc, o.fit!.lambda, o.e0 ? mul(unit(o.e0), ch) : undefined, o.e1 ? mul(unit(o.e1), ch) : undefined); U = f.U; return f.P; });
    return { net: Array.from({ length: cols[0]!.length }, (_, i) => cols.map((c) => c[i]!)), U, V, p: pc, q, mirror: o.mirror };
  }
  const Kc = K + (o.e0 ? 1 : 0) + (o.e1 ? 1 : 0), pc = Math.min(o.p ?? 3, Kc - 1), U = averagedKnots(withEnds(ub, !!o.e0, !!o.e1), pc);
  const cols = Array.from({ length: Mc }, (_, j) => { const col = R.map((r) => r[j]!), ch = chord(col); return through(col, ub, U, pc, o.e0 ? mul(unit(o.e0), ch) : undefined, o.e1 ? mul(unit(o.e1), ch) : undefined); });
  return { net: Array.from({ length: Kc }, (_, i) => cols.map((c) => c[i]!)), U, V, p: pc, q, mirror: o.mirror };
}
/** Where on a skin a section's point falls: the (u, v) its interpolation gave it (the averaged chord parameters). */
export function skinParams(rows: V3[][], u?: number[]): { u: number[]; v: number[] } {
  const avg = (ts: number[][]) => ts[0]!.map((_, j) => ts.reduce((a, t) => a + t[j]!, 0) / ts.length);
  return { v: avg(rows.map(chordParams)), u: u ?? avg(Array.from({ length: rows[0]!.length }, (_, j) => chordParams(rows.map((r) => r[j]!)))) };
}

// ---- making surfaces -------------------------------------------------------------------------------------------------
/** The part of a skin between u = a and u = b, as a skin of its own over 0…1: the same surface there, exactly (each
 *  end's knot inserted until the skin passes through a column of its net there, Boehm's insertion, NURBS Book A5.1, in
 *  homogeneous coordinates so a rational skin splits too). What a panel cut from a longer skin is built on, so it meets
 *  what is cut beside it along the whole of its edge. */
export function split(s: Surface, a: number, b: number): Surface {
  const p = degreeOf(s.net.length, s.p, s.U);
  let U = [...(s.U ?? clampedKnots(s.net.length, p))], H = s.net.map((col, i) => col.map((P, j) => { const w = s.w?.[i]?.[j] ?? 1; return [P[0] * w, P[1] * w, P[2] * w, w]; }));
  const insert = (t: number) => {
    let k = p; while (k + 1 < U.length - p - 1 && U[k + 1]! <= t) k++;
    const m = U.filter((x) => x === t).length, Q: number[][][] = [];
    for (let i = 0; i <= H.length; i++) {
      if (i <= k - p) Q.push(H[i]!); else if (i >= k - m + 1) Q.push(H[i - 1]!);
      else { const al = (t - U[i]!) / (U[i + p]! - U[i]!); Q.push(H[i]!.map((h, j) => h.map((x, c) => al * x + (1 - al) * H[i - 1]![j]![c]!))); }
    }
    H = Q; U = [...U.slice(0, k + 1), t, ...U.slice(k + 1)];
  };
  for (const t of [a, b]) if (t > 0 && t < 1) while (U.filter((x) => x === t).length < p) insert(t);
  // (the column the skin passes through at a: the one before the last copy of a in the knots, less the degree; at b, the
  // one before the first copy of b)
  const e = U.lastIndexOf(a), f = U.indexOf(b), cols = H.slice(e - p, f);
  const K = [...Array(p + 1).fill(a), ...U.slice(e + 1, f), ...Array(p + 1).fill(b)].map((x) => (x - a) / (b - a));
  const rational = !!s.w;
  return { net: cols.map((col) => col.map((h) => [h[0]! / h[3]!, h[1]! / h[3]!, h[2]! / h[3]!] as V3)), w: rational ? cols.map((col) => col.map((h) => h[3]!)) : undefined, U: K, V: s.V, p, q: s.q, mirror: s.mirror };
}
/** A skin built on another's edge at v = 1, column for column of its net: the two share that edge's knots, so they meet
 *  along all of it, not only where sections were drawn (coincidence by construction, not by checking). Each section is
 *  made from the other's edge point there (E, a control point) and the last leg of its net arriving at it (d): a second
 *  point at E plus a fixed multiple of d puts the two in one tangent plane along the whole edge (G1), since then each
 *  skin's derivative across the edge is the other's scaled. */
export function fromEdge(s: Surface, row: (E: V3, d: V3, i: number) => V3[], o: { q?: number; mirror?: boolean } = {}): Surface {
  const last = s.net[0]!.length - 1, net = s.net.map((col, i) => row(col[last]!, sub(col[last]!, col[last - 1]!), i));
  return { net, w: s.w ? s.w.map((r, i) => net[i]!.map((_, j) => (j === 0 ? r[last]! : 1))) : undefined, U: s.U, p: degreeOf(s.net.length, s.p, s.U), q: o.q ?? Math.min(3, net[0]!.length - 1), mirror: o.mirror ?? s.mirror };
}
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
export interface Fairness {
  /** inflections along the grid's lines: where a line's curvature turns the other way (beyond a dead band): a wobble or a
   *  dent each, unless a designer drew it there */ wobbles: number;
  /** the most on any one line */ worstLine: number;
  /** where curvature changes fastest (u, v) */ worst: [number, number];
  /** the root mean square of how fast curvature changes along the lines, per metre (1/m²): a fair panel's is small */ roughness: number;
  /** the tightest radius anywhere on it, m (a pressed panel's styling radii are a few millimetres at the least), and where */ rmin: number; rminAt: [number, number];
  /** the largest and smallest mean curvature, 1/m */ Hmax: number; Hmin: number;
  /** points left out because the surface pinches there (a pole, where a skin closes to a point): curvature is undefined */ pinched: number;
}
/** Where a surface is regular enough to measure: its area element not vanishing (a skin closing to a point, at a nose or
 *  a tip, has none there, and any curvature computed there is noise). */
function regularMask(g: SurfacePoint[][]): boolean[][] {
  const el = g.map((r) => r.map((sp) => len(cross(sp.du, sp.dv)))), all = el.flat().sort((p, q) => p - q), med = all[all.length >> 1] || 1;
  return el.map((r) => r.map((e) => e > med * 0.02));
}
/** How fair a surface is, as a surface modeller's curvature combs read it: along each line of a sampling grid, the
 *  normal curvature in that line's own direction (L/E along u, N/G along v), how often it turns the other way beyond a
 *  dead band (curvature under 0.2 1/m, a radius over 5 m, counts as flat), how fast it changes per metre, and the
 *  tightest radius. Points where the surface pinches are left out (and counted). */
export function fairness(x: Surface | Patch, nu = 24, nv = 18, band = 0.2): Fairness {
  const pt = asPatch(x), g: SurfacePoint[][] = [];
  for (let i = 0; i <= nu; i++) { g.push([]); for (let j = 0; j <= nv; j++) g[i]!.push(patchAt(pt, i / nu, j / nv)); }
  const ok = regularMask(g); let wobbles = 0, worstLine = 0, worst: [number, number] = [0, 0], worstD = 0, sq = 0, cnt = 0, kmax = 0, kAt: [number, number] = [0, 0], Hmax = -Infinity, Hmin = Infinity, pinched = 0;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { if (!ok[i]![j]) { pinched++; continue; } const c = curvatures(g[i]![j]!); Hmax = Math.max(Hmax, c.H); Hmin = Math.min(Hmin, c.H); const k = Math.max(Math.abs(c.k1), Math.abs(c.k2)); if (k > kmax) { kmax = k; kAt = [i / nu, j / nv]; } }
  const kU = (sp: SurfacePoint) => dot(sp.duu, sp.n) / Math.max(1e-12, dot(sp.du, sp.du)), kV = (sp: SurfacePoint) => dot(sp.dvv, sp.n) / Math.max(1e-12, dot(sp.dv, sp.dv));
  const line = (pts: [SurfacePoint, boolean, number, number][], k: (sp: SurfacePoint) => number) => {
    let sign = 0, turns = 0, prev: { k: number; at: V3 } | null = null;
    for (const [sp, good, u, v] of pts) {
      if (!good) { prev = null; continue; }
      const kk = k(sp), sg = kk > band ? 1 : kk < -band ? -1 : 0; if (sg && sign && sg !== sign) turns++; if (sg) sign = sg;
      if (prev) { const d = Math.abs(kk - prev.k) / Math.max(1e-6, len(sub(sp.at, prev.at))); sq += d * d; cnt++; if (d > worstD) { worstD = d; worst = [u, v]; } }
      prev = { k: kk, at: sp.at };
    }
    wobbles += turns; worstLine = Math.max(worstLine, turns);
  };
  for (let j = 0; j <= nv; j++) line(g.map((r, i) => [r[j]!, ok[i]![j]!, i / nu, j / nv]), kU);
  for (let i = 0; i <= nu; i++) line(g[i]!.map((sp, j) => [sp, ok[i]![j]!, i / nu, j / nv]), kV);
  return { wobbles, worstLine, worst, roughness: Math.sqrt(sq / Math.max(1, cnt)), rmin: kmax > 0 ? 1 / kmax : Infinity, rminAt: kAt, Hmax, Hmin, pinched };
}
/** Continuity where two surfaces meet along a seam: sampled pairs of points (a's at its edge, b's at its own), the
 *  gap between them (G0), the angle between their normals (G1), the jump in mean curvature (G2), and the jump in how
 *  fast it changes going across (G3: what makes a highlight run on across a seam without a bend in it). */
export function seam(a: Surface, ea: 'u0' | 'u1' | 'v0' | 'v1', b: Surface, eb: 'u0' | 'u1' | 'v0' | 'v1', n = 12, flip = false): { gap: number; angle: number; dH: number; dHs: number } {
  const at = (s: Surface, e: string, t: number, inn = 0) => surfaceAt(s, e === 'u0' ? inn : e === 'u1' ? 1 - inn : t, e === 'v0' ? inn : e === 'v1' ? 1 - inn : t);
  let gap = 0, angle = 0, dH = 0, dHs = 0; const h = 0.02;
  for (let k = 0; k <= n; k++) {
    const t = k / n, tb = flip ? 1 - t : t, pa = at(a, ea, t), pb = at(b, eb, tb), qa = at(a, ea, t, h), qb = at(b, eb, tb, h);
    gap = Math.max(gap, len(sub(pa.at, pb.at))); angle = Math.max(angle, Math.acos(Math.min(1, Math.abs(dot(pa.n, pb.n)))));
    const Ha = Math.abs(curvatures(pa).H), Hb = Math.abs(curvatures(pb).H); dH = Math.max(dH, Math.abs(Ha - Hb));
    // the rate going across: on a, toward the seam; on b, away from it (so a smooth run has them equal)
    const ra = (Ha - Math.abs(curvatures(qa).H)) / Math.max(1e-6, len(sub(pa.at, qa.at))), rb = (Math.abs(curvatures(qb).H) - Hb) / Math.max(1e-6, len(sub(pb.at, qb.at)));
    dHs = Math.max(dHs, Math.abs(ra - rb));
  }
  return { gap, angle, dH, dHs };
}
/** Zebra lines, as numbers: the stripes' phase ψ = r·a over a grid (r the view ray reflected in the surface, a the stripes'
 *  axis), and how badly they break: the largest jump in ψ's slope from one sample to the next, against its typical slope.
 *  Smooth stripes on a fair surface score near 1; a crease or a dent several times that. */
export function zebra(x: Surface | Patch, view: V3 = [-1, -0.3, -0.6], axis: V3 = [0, 1, 0], nu = 32, nv = 24): { psi: number[][]; breaks: number; at: [number, number] } {
  const pt = asPatch(x), vdir = unit(view), psi: number[][] = [], g: SurfacePoint[][] = [];
  for (let i = 0; i <= nu; i++) { psi.push([]); g.push([]); for (let j = 0; j <= nv; j++) { const sp = patchAt(pt, i / nu, j / nv), n = sp.n, r = sub(vdir, mul(n, 2 * dot(vdir, n))); g[i]!.push(sp); psi[i]!.push(dot(r, axis)); } }
  const ok = regularMask(g); let worst = 0, at: [number, number] = [0, 0], typical = 0, cnt = 0;
  for (let i = 1; i < nu; i++) for (let j = 1; j < nv; j++) {
    if (!ok[i]![j] || !ok[i - 1]![j] || !ok[i + 1]![j] || !ok[i]![j - 1] || !ok[i]![j + 1]) continue;
    const kink = Math.max(Math.abs(psi[i + 1]![j]! - 2 * psi[i]![j]! + psi[i - 1]![j]!), Math.abs(psi[i]![j + 1]! - 2 * psi[i]![j]! + psi[i]![j - 1]!));
    typical += kink; cnt++; if (kink > worst) { worst = kink; at = [i / nu, j / nv]; }
  }
  return { psi, breaks: worst / Math.max(1e-9, typical / Math.max(1, cnt)), at };
}

/** Fairing where a fault is, not everywhere: the net relaxed within so many rows and columns of (u, v) (where zebra lines
 *  broke, or curvature wobbled), its boundary held, the rest of the surface as it was. */
export function fairNear(s: Surface, u: number, v: number, reach = 2, passes = 3, k = 0.5): Surface {
  const ci = Math.round(u * (s.net.length - 1)), cj = Math.round(v * (s.net[0]!.length - 1)); let net = s.net.map((r) => r.map((P) => [...P] as V3));
  for (let t = 0; t < passes; t++) {
    const next = net.map((r) => r.map((P) => [...P] as V3));
    for (let i = Math.max(1, ci - reach); i <= Math.min(net.length - 2, ci + reach); i++) for (let j = Math.max(1, cj - reach); j <= Math.min(net[0]!.length - 2, cj + reach); j++) { const m = mul(add(add(net[i - 1]![j]!, net[i + 1]![j]!), add(net[i]![j - 1]!, net[i]![j + 1]!)), 0.25); next[i]![j] = add(net[i]![j]!, mul(sub(m, net[i]![j]!), k)); }
    net = next;
  }
  return { ...s, net };
}
/** A curve's curvature comb: its curvature at n + 1 places, signed in the plane it mostly lies in, and how many times
 *  it turns the other way (an inflection: a line meant to sweep one way that wavers). */
export function comb(c: Curve, n = 64, band = 0.02): { k: number[]; inflections: number; peak: number } {
  let B: V3 = [0, 0, 0]; for (let i = 0; i <= n; i++) { const { d1, d2 } = curveAt(c, i / n); B = add(B, cross(d1, d2)); } B = unit(B);
  const k: number[] = []; let sign = 0, inflections = 0, peak = 0;
  for (let i = 0; i <= n; i++) { const { d1, d2 } = curveAt(c, i / n), ki = dot(cross(d1, d2), B) / Math.max(1e-12, len(d1) ** 3); k.push(ki); peak = Math.max(peak, Math.abs(ki)); }
  for (const ki of k) { const sg = ki > band * peak ? 1 : ki < -band * peak ? -1 : 0; if (sg && sign && sg !== sign) inflections++; if (sg) sign = sg; }
  return { k, inflections, peak };
}
/** Draft: how each part of a panel faces the way it is pulled from its die or mould. The angle is asin(n · d): positive
 *  parts cleanly, below zero is an undercut that locks the part in the tool. The direction is searched for (the die
 *  tipped to give the most draft, as a stamping engineer sets a panel in its press) unless it is given. Gives the
 *  least draft, the share undercut, and where the least is. */
export function draft(x: Surface | Patch, pull?: V3, na = 18, nb = 12): { pull: V3; least: number; undercut: number; at: [number, number] } {
  const pt = asPatch(x), ns: { n: V3; a: number; b: number }[] = [];
  for (let i = 0; i <= na; i++) for (let j = 0; j <= nb; j++) ns.push({ n: patchAt(pt, i / na, j / nb).n, a: i / na, b: j / nb });
  const dirs: V3[] = pull ? [unit(pull)] : Array.from({ length: 400 }, (_, i) => { const y = 1 - (2 * (i + 0.5)) / 400, r = Math.sqrt(1 - y * y), t = i * Math.PI * (3 - Math.sqrt(5)); return [Math.cos(t) * r, y, Math.sin(t) * r] as V3; });
  let best: V3 = dirs[0]!, bestLeast = -Infinity;
  const leastOf = (d: V3) => { let l = Infinity; for (const q of ns) l = Math.min(l, dot(q.n, d)); return l; };
  for (const d of dirs) { const l = leastOf(d); if (l > bestLeast) { bestLeast = l; best = d; } }
  // then refined: the die tipped by ever smaller steps while that gives more draft
  if (!pull) for (let step = 0.1; step > 1e-4; step *= 0.5) for (let moved = true; moved;) { moved = false; for (const e of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as V3[]) { const d = unit(add(best, mul(e, step))), l = leastOf(d); if (l > bestLeast + 1e-12) { bestLeast = l; best = d; moved = true; } } }
  let least = Infinity, at: [number, number] = [0, 0], under = 0;
  for (const q of ns) { const g = dot(q.n, best); if (g < 0) under++; if (g < least) { least = g; at = [q.a, q.b]; } }
  return { pull: best, least: Math.asin(Math.max(-1, Math.min(1, least))), undercut: under / ns.length, at };
}

/** The point of a patch nearest a given point: the nearest of a coarse grid, then a pattern search round it, its step
 *  halved until it is a millionth of the patch (a grid alone is out by up to half its spacing). */
export function closestOn(x: Surface | Patch, P: V3, grid?: { a: number; b: number; at: V3 }[]): { a: number; b: number; at: V3; d: number } {
  const pt = asPatch(x), g = grid ?? Array.from({ length: 41 * 17 }, (_, k) => { const a = Math.floor(k / 17) / 40, b = (k % 17) / 16; return { a, b, at: patchAt(pt, a, b).at }; });
  let best = g[0]!, bd = Infinity; for (const q of g) { const d = len(sub(q.at, P)); if (d < bd) { bd = d; best = q; } }
  let a = best.a, b = best.b, at = best.at;
  for (let st = 1 / 40; st > 1e-6; st *= 0.5) for (let moved = true; moved;) { moved = false; for (const [da, db] of [[st, 0], [-st, 0], [0, st], [0, -st]] as const) { const na = clamp01(a + da), nb = clamp01(b + db), q = patchAt(pt, na, nb).at, d = len(sub(q, P)); if (d < bd - 1e-12) { bd = d; a = na; b = nb; at = q; moved = true; } } }
  return { a, b, at, d: bd };
}
