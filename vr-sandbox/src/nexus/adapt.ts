// Networks grown by what flows through them. A slime mould spreads over everything it can reach, then the tubes that
// carry most thicken and the rest wither until a network is left that feeds every food source by short ways. Blood
// vessels, leaf veins, the hyphae of a fungus and the struts inside a bone do the same thing: each path grows in
// proportion to what flows through it, and starves where nothing does (Tero et al., Science 327, 2010; Hu and Cai,
// PRL 111, 2013; Wolff's law of bone, as modelled by Huiskes et al., J. Biomech. 20, 1987).
//
// It is one rule for any carrier: lay down every way the thing could go in the room it may take (a ground of
// candidate paths), solve how the carrier flows through all of them at once by its own law, give each path the size
// what flows in it asks for, and solve again, until the sizes stop changing. What is left is the shape. Nothing here
// names a thing to make: water through pipes, heat through bars, current through wires and force through struts
// differ only in their flow law and in what a path costs.
//
// - A carrier that is a scalar potential (water's head, temperature, voltage) flows by Kirchhoff's laws through
//   conductances. A pipe in laminar flow conducts π r⁴ / 8 μ L (Hagen–Poiseuille) and costs its volume, π r² L; the
//   least power and material together are had where r³ grows as the flow Q (Murray, PNAS 12, 1926), and such networks
//   lose their loops and become trees.
// - Force is a vector, carried by struts that stretch or shorten, E A / L along each (a truss). Each strut sized to
//   what it carries, by its strength in tension and by its strength and its buckling in compression, is fully stressed;
//   for one load the lightest truss is fully stressed (Michell, Phil. Mag. 8, 1904), and struts that carry nothing
//   wither.
//
// The ground is drawn, the flows solved and the sizes grown here; what a carrier's law is, what it may cost and which
// sizes can be had are given to it.

import { count } from './network';

export type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3) => Math.hypot(a[0], a[1], a[2]);

/** Candidate paths: joints and the ways between them, each way's length. */
export interface Graph { nodes: V3[]; edges: [number, number][]; len: number[] }

/** Joints on a lattice filling a box, n cells along each axis (0 along an axis: the box is flat there), and each given
 *  point added, or the lattice joint within a hundredth of a cell of it used for it. */
export function lattice(lo: V3, hi: V3, n: [number, number, number], points: V3[] = []): { nodes: V3[]; at: number[] } {
  const nodes: V3[] = [];
  for (let i = 0; i <= n[0]; i++) for (let j = 0; j <= n[1]; j++) for (let k = 0; k <= n[2]; k++) {
    const f = (a: number, m: number, d: number) => (m === 0 ? (lo[d]! + hi[d]!) / 2 : lo[d]! + ((hi[d]! - lo[d]!) * a) / m);
    nodes.push([f(i, n[0], 0), f(j, n[1], 1), f(k, n[2], 2)]);
  }
  const cell = Math.min(...[0, 1, 2].filter((d) => n[d]! > 0).map((d) => (hi[d]! - lo[d]!) / n[d]!)), tol = (Number.isFinite(cell) ? cell : 1) / 100;
  const at = points.map((p) => { const k = nodes.findIndex((q) => norm(sub(p, q)) < tol); if (k >= 0) return k; nodes.push([...p]); return nodes.length - 1; });
  return { nodes, at };
}

/** Whether the way from p to q passes through the inside of a box (not along its faces). */
function through(p: V3, q: V3, [lo, hi]: [V3, V3]): boolean {
  let t0 = 0, t1 = 1; const e = 1e-9;
  for (let d = 0; d < 3; d++) {
    const a = lo[d]! + e, b = hi[d]! - e, v = q[d]! - p[d]!;
    if (Math.abs(v) < 1e-15) { if (p[d]! <= a || p[d]! >= b) return false; continue; }
    let s0 = (a - p[d]!) / v, s1 = (b - p[d]!) / v; if (s0 > s1) [s0, s1] = [s1, s0];
    t0 = Math.max(t0, s0); t1 = Math.min(t1, s1); if (t1 <= t0 + e) return false;
  }
  return true;
}

/** Every pair of joints no more than reach apart joined, unless a joint lies on the way between them (it is then two
 *  shorter ways, already counted), it passes through a box kept clear, or both its ends are held (it carries nothing). */
export function ground(nodes: V3[], reach: number, o: { keepOut?: [V3, V3][]; held?: Set<number> } = {}): Graph {
  const edges: [number, number][] = [], len: number[] = [], cell = reach, key = (p: V3) => p.map((x) => Math.floor(x / cell)).join(',');
  const bins = new Map<string, number[]>(); nodes.forEach((p, i) => { const k = key(p); bins.set(k, [...(bins.get(k) ?? []), i]); });
  const near = (p: V3) => { const out: number[] = [], c = p.map((x) => Math.floor(x / cell)); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) out.push(...(bins.get(`${c[0]! + a},${c[1]! + b},${c[2]! + d}`) ?? [])); return out; };
  for (let i = 0; i < nodes.length; i++) for (const j of near(nodes[i]!)) {
    if (j <= i) continue;
    const p = nodes[i]!, q = nodes[j]!, L = norm(sub(q, p));
    if (L > reach * (1 + 1e-9) || L < 1e-12) continue;
    if (o.held?.has(i) && o.held.has(j)) continue;
    if (o.keepOut?.some((b) => through(p, q, b))) continue;
    const u = sub(q, p); let blocked = false;
    for (const k of near(p)) { if (k === i || k === j) continue; const w = sub(nodes[k]!, p), t = dot(w, u) / (L * L); if (t <= 1e-9 || t >= 1 - 1e-9) continue; const off = norm(sub(w, [u[0] * t, u[1] * t, u[2] * t])); if (off < L * 1e-6) { blocked = true; break; } }
    if (!blocked) { edges.push([i, j]); len.push(L); }
  }
  return { nodes, edges, len };
}

/** Conjugate gradients on A x = b, A symmetric and positive definite, preconditioned by blocks of its diagonal. */
function pcg(apply: (x: Float64Array, out: Float64Array) => void, precond: (r: Float64Array, z: Float64Array) => void, b: Float64Array, tol = 1e-10, most = 20000, x0?: Float64Array): { x: Float64Array; iterations: number; converged: boolean } {
  const n = b.length, x = x0 && x0.length === n ? Float64Array.from(x0) : new Float64Array(n), r = Float64Array.from(b), z = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n);
  // the same sums, in the same order, as plain loops: a closure for each element was most of a solve's time
  const dot = (u: Float64Array, v: Float64Array) => { let s = 0; for (let i = 0; i < n; i++) s += u[i]! * v[i]!; return s; };
  const bn = Math.sqrt(dot(b, b)); if (bn === 0) return { x: new Float64Array(n), iterations: 0, converged: true };
  // started from a guess (the last solve's answer), what is left to solve is what that guess misses
  if (x0 && x0.length === n) { apply(x, Ap); for (let i = 0; i < n; i++) r[i]! -= Ap[i]!; if (Math.sqrt(dot(r, r)) <= tol * bn) return { x, iterations: 0, converged: true }; }
  precond(r, z); p.set(z); let rz = dot(r, z);
  for (let it = 1; it <= most; it++) {
    apply(p, Ap); const pAp = dot(p, Ap); if (!(pAp > 0)) return { x, iterations: it, converged: false };
    const a = rz / pAp; for (let i = 0; i < n; i++) { x[i]! += a * p[i]!; r[i]! -= a * Ap[i]!; }
    const rn = Math.sqrt(dot(r, r)); if (rn <= tol * bn) return { x, iterations: it, converged: true };
    precond(r, z); const rz2 = dot(r, z), beta = rz2 / rz; rz = rz2;
    for (let i = 0; i < n; i++) p[i] = z[i]! + beta * p[i]!;
  }
  return { x, iterations: most, converged: false };
}

/** Solves K x = b outright for K symmetric and positive definite, its entries added by fill (Cholesky). */
function cholesky(m: number, fill: (put: (i: number, j: number, v: number) => void) => void, b: Float64Array): Float64Array {
  const K = new Float64Array(m * m); fill((i, j, v) => { K[i * m + j]! += v; });
  for (let j = 0; j < m; j++) {
    let d = K[j * m + j]!; for (let k = 0; k < j; k++) d -= K[j * m + k]! ** 2;
    const L = Math.sqrt(Math.max(d, 1e-300)); K[j * m + j] = L;
    for (let i = j + 1; i < m; i++) { let s = K[i * m + j]!; for (let k = 0; k < j; k++) s -= K[i * m + k]! * K[j * m + k]!; K[i * m + j] = s / L; }
  }
  const y = new Float64Array(m); for (let i = 0; i < m; i++) { let s = b[i]!; for (let k = 0; k < i; k++) s -= K[i * m + k]! * y[k]!; y[i] = s / K[i * m + i]!; }
  const x = new Float64Array(m); for (let i = m - 1; i >= 0; i--) { let s = y[i]!; for (let k = i + 1; k < m; k++) s -= K[k * m + i]! * x[k]!; x[i] = s / K[i * m + i]!; }
  return x;
}

// ---- a scalar carrier: Kirchhoff's laws over conductances ----------------------------------------------------------

/** Potentials at the joints and flows along the ways (from a way's first joint to its second), for conductances g along
 *  the ways, potentials held at some joints, and flow put in at the others (negative where it is drawn off). */
export function flowScalar(G: Graph, g: number[], fixed: Map<number, number>, inject: number[]): { p: number[]; Q: number[]; converged: boolean } {
  const n = G.nodes.length, free = new Int32Array(n).fill(-1); let m = 0; for (let i = 0; i < n; i++) if (!fixed.has(i)) free[i] = m++;
  const b = new Float64Array(m), diag = new Float64Array(m);
  for (let i = 0; i < n; i++) if (free[i]! >= 0) b[free[i]!] = inject[i] ?? 0;
  G.edges.forEach(([a, c], e) => {
    const ge = g[e]!, fa = free[a]!, fc = free[c]!;
    if (fa >= 0) diag[fa]! += ge; if (fc >= 0) diag[fc]! += ge;
    if (fa >= 0 && fc < 0) b[fa]! += ge * fixed.get(c)!; if (fc >= 0 && fa < 0) b[fc]! += ge * fixed.get(a)!;
  });
  const ne = G.edges.length, EA = new Int32Array(ne), EC = new Int32Array(ne), GE = Float64Array.from(g); G.edges.forEach(([a, c], e) => { EA[e] = free[a]!; EC[e] = free[c]!; });
  const apply = (x: Float64Array, out: Float64Array) => { out.fill(0); for (let e = 0; e < ne; e++) { const fa = EA[e]!, fc = EC[e]!, ge = GE[e]!; const xa = fa >= 0 ? x[fa]! : 0, xc = fc >= 0 ? x[fc]! : 0; if (fa >= 0) out[fa]! += ge * (xa - xc); if (fc >= 0) out[fc]! += ge * (xc - xa); } };
  // a network of a few hundred joints is solved outright (Cholesky), whatever its conductances; a larger one by
  // conjugate gradients
  const { x, converged } = m <= 800 ? { x: cholesky(m, (put) => G.edges.forEach(([a, c], e) => { const fa = free[a]!, fc = free[c]!, ge = g[e]!; if (fa >= 0) put(fa, fa, ge); if (fc >= 0) put(fc, fc, ge); if (fa >= 0 && fc >= 0) { put(fa, fc, -ge); put(fc, fa, -ge); } }), b), converged: true } : pcg(apply, (r, z) => { for (let i = 0; i < m; i++) z[i] = diag[i]! > 0 ? r[i]! / diag[i]! : r[i]!; }, b);
  const p = Array.from({ length: n }, (_, i) => (free[i]! >= 0 ? x[free[i]!]! : fixed.get(i)!));
  return { p, Q: G.edges.map(([a, c], e) => g[e]! * (p[a]! - p[c]!)), converged };
}

/** The ways that carry flow, grown by Murray's rule: with every way's conductance as a laminar pipe's (r⁴ / L), each
 *  radius made to grow as the cube root of what flows in it, solved again, until they settle. One joint is fed what all
 *  the others draw. What is kept is a tree: of the ways still carrying flow, those that carry most and reach every
 *  joint that draws, and no others. */
export function growTree(G: Graph, source: number, draw: Map<number, number>, rounds = 80): { edges: number[]; Q: number[]; r: number[]; rounds: number } {
  const n = G.nodes.length, total = [...draw.values()].reduce((s, v) => s + v, 0), inject = new Array(n).fill(0);
  for (const [k, v] of draw) inject[k] -= v;
  let r = G.edges.map(() => 1), Q: number[] = [], done = 0;
  for (let it = 0; it < rounds; it++) {
    const g = r.map((x, e) => x ** 4 / G.len[e]!);
    ({ Q } = flowScalar(G, g, new Map([[source, 0]]), inject));
    const next = Q.map((q) => Math.max(1e-4, Math.cbrt(Math.abs(q) / total)));
    const moved = Math.max(...next.map((x, e) => Math.abs(Math.log(x / r[e]!))));
    r = next; done = it + 1; if (moved < 1e-3) break;
  }
  // the tree: the ways carrying most, joined greatest first while they join what is not yet joined (a greatest
  // spanning tree), then every branch that reaches no joint that draws cut back
  const parent = Array.from({ length: n }, (_, i) => i), find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const order = G.edges.map((_, e) => e).filter((e) => Math.abs(Q[e]!) > total * 1e-6).sort((a, b) => Math.abs(Q[b]!) - Math.abs(Q[a]!));
  let kept: number[] = [];
  for (const e of order) { const [a, c] = G.edges[e]!, ra = find(a), rc = find(c); if (ra !== rc) { parent[ra] = rc; kept.push(e); } }
  const needed = new Set([source, ...draw.keys()]);
  for (;;) { const deg = new Map<number, number>(); for (const e of kept) for (const j of G.edges[e]!) deg.set(j, (deg.get(j) ?? 0) + 1); const cut = kept.filter((e) => G.edges[e]!.some((j) => deg.get(j) === 1 && !needed.has(j))); if (!cut.length) break; kept = kept.filter((e) => !cut.includes(e)); }
  return { edges: kept, Q, r, rounds: done };
}

/** Over a tree fed at one joint: what flows along each of its ways (what every joint past it draws), from the fed end
 *  to the far end, and each joint's way back to the fed joint. */
export function treeFlows(G: Graph, edges: number[], source: number, draw: Map<number, number>): { Q: Map<number, number>; from: Map<number, number>; up: Map<number, number>; order: number[] } {
  const adj = new Map<number, [number, number][]>(); for (const e of edges) { const [a, c] = G.edges[e]!; adj.set(a, [...(adj.get(a) ?? []), [c, e]]); adj.set(c, [...(adj.get(c) ?? []), [a, e]]); }
  const up = new Map<number, number>(), from = new Map<number, number>(), order: number[] = [source], seen = new Set([source]);
  for (let k = 0; k < order.length; k++) for (const [j, e] of adj.get(order[k]!) ?? []) if (!seen.has(j)) { seen.add(j); up.set(j, e); from.set(e, order[k]!); order.push(j); }
  const below = new Map<number, number>(), Q = new Map<number, number>();
  for (let k = order.length - 1; k > 0; k--) { const j = order[k]!, s = (below.get(j) ?? 0) + (draw.get(j) ?? 0), e = up.get(j)!; Q.set(e, s); const pj = from.get(e)!; below.set(pj, (below.get(pj) ?? 0) + s); }
  return { Q, from, up, order };
}

// ---- force: struts that stretch -------------------------------------------------------------------------------------

/** What a strut is made of: its stiffness, what it bears and what it weighs. */
export interface Strut { E: number; /** in tension */ sy: number; /** pressed, before it crushes */ sc: number; density: number; /** the most a strut may be as long for its radius of gyration (L / r), pressed and pulled: so slender a strut sags, shakes and is bent in handling, whatever it carries */ slender?: { push: number; pull: number } }
/** A section that can be had: its area, its least second moment, its mass for a metre, and its name. */
export interface Section { A: number; I: number; label: string; /** how wide it shows to a wind across it, m */ width?: number }

/** Joints' motions and each strut's pull (tension positive) under loads at the joints, the held joints held still. */
/** Joints held but free to slide one way (an end resting on a bank that may move along it): joint, and the way (0 x, 1 y, 2 z). */
export type Slides = Map<number, number>;
export function truss(G: Graph, A: number[], E: number, held: Set<number>, load: V3[], guess?: V3[], slides?: Slides): { u: V3[]; N: number[]; converged: boolean } {
  const n = G.nodes.length, idx = new Int32Array(n).fill(-1); let m = 0; for (let i = 0; i < n; i++) if (!held.has(i) || slides?.has(i)) idx[i] = m++;
  // a joint that slides is free the way it slides and held the others: those of its freedoms are kept at nothing
  const mask = new Uint8Array(m * 3); if (slides) for (const [j, ax] of slides) { const f = idx[j]!; if (f >= 0) for (let r = 0; r < 3; r++) if (r !== ax) mask[f * 3 + r] = 1; }
  const dir = G.edges.map(([a, c], e) => { const d = sub(G.nodes[c]!, G.nodes[a]!), L = G.len[e]!; return [d[0] / L, d[1] / L, d[2] / L] as V3; });
  const k = G.edges.map((_, e) => (E * A[e]!) / G.len[e]!);
  const blocks = new Float64Array(m * 9);
  G.edges.forEach(([a, c], e) => { const d = dir[e]!; for (const j of [a, c]) { const f = idx[j]!; if (f < 0) continue; for (let r = 0; r < 3; r++) for (let s = 0; s < 3; s++) blocks[f * 9 + r * 3 + s]! += k[e]! * d[r]! * d[s]!; } });
  // each joint's own 3 × 3 block inverted (a joint no strut holds in some direction is held there by a little, so it
  // does not leave the solve singular; a joint so held is a mechanism, found by the count, not here)
  const inv = new Float64Array(m * 9);
  for (let f = 0; f < m; f++) {
    const B = Array.from({ length: 9 }, (_, i) => blocks[f * 9 + i]!), tr = B[0]! + B[4]! + B[8]!, eps = 1e-9 * (tr || 1); B[0]! += eps; B[4]! += eps; B[8]! += eps;
    for (let r = 0; r < 3; r++) if (mask[f * 3 + r]) for (let q = 0; q < 3; q++) { B[r * 3 + q] = r === q ? 1 : 0; B[q * 3 + r] = r === q ? 1 : 0; }
    const [a, b, c, d, e, g, h, i, j] = B as [number, number, number, number, number, number, number, number, number], det = a * (e * j - g * i) - b * (d * j - g * h) + c * (d * i - e * h);
    const I = [e * j - g * i, c * i - b * j, b * g - c * e, g * h - d * j, a * j - c * h, c * d - a * g, d * i - e * h, b * h - a * i, a * e - b * d].map((x) => x / det);
    for (let q = 0; q < 9; q++) inv[f * 9 + q] = I[q]!;
  }
  const ne = G.edges.length, EA = new Int32Array(ne), EC = new Int32Array(ne), D = new Float64Array(ne * 3), K = Float64Array.from(k);
  G.edges.forEach(([a, c], e) => { EA[e] = idx[a]!; EC[e] = idx[c]!; D[e * 3] = dir[e]![0]; D[e * 3 + 1] = dir[e]![1]; D[e * 3 + 2] = dir[e]![2]; });
  const masked = [...mask.keys()].filter((q) => mask[q]);
  const apply = (x: Float64Array, out: Float64Array) => {
    out.fill(0);
    for (let e = 0; e < ne; e++) {
      const fa = EA[e]!, fc = EC[e]!, a3 = fa * 3, c3 = fc * 3, d0 = D[e * 3]!, d1 = D[e * 3 + 1]!, d2 = D[e * 3 + 2]!;
      const ax = fa >= 0 ? x[a3]! : 0, ay = fa >= 0 ? x[a3 + 1]! : 0, az = fa >= 0 ? x[a3 + 2]! : 0, cx = fc >= 0 ? x[c3]! : 0, cy = fc >= 0 ? x[c3 + 1]! : 0, cz = fc >= 0 ? x[c3 + 2]! : 0;
      let s = 0; s += d0 * (cx - ax); s += d1 * (cy - ay); s += d2 * (cz - az);
      const t = K[e]! * s;
      if (fc >= 0) { out[c3]! += t * d0; out[c3 + 1]! += t * d1; out[c3 + 2]! += t * d2; }
      if (fa >= 0) { out[a3]! -= t * d0; out[a3 + 1]! -= t * d1; out[a3 + 2]! -= t * d2; }
    }
    for (const q of masked) out[q] = x[q]!;
  };
  const b = new Float64Array(m * 3); for (let i = 0; i < n; i++) if (idx[i]! >= 0) for (let r = 0; r < 3; r++) b[idx[i]! * 3 + r] = mask[idx[i]! * 3 + r] ? 0 : load[i]?.[r] ?? 0;
  let x0: Float64Array | undefined; if (guess) { x0 = new Float64Array(m * 3); for (let i = 0; i < n; i++) if (idx[i]! >= 0) for (let r = 0; r < 3; r++) x0[idx[i]! * 3 + r] = guess[i]?.[r] ?? 0; }
  const { x, converged } = pcg(apply, (r, z) => { for (let f = 0; f < m; f++) for (let a = 0; a < 3; a++) { let s = 0; for (let c = 0; c < 3; c++) s += inv[f * 9 + a * 3 + c]! * r[f * 3 + c]!; z[f * 3 + a] = s; } }, b, 1e-9, 40000, x0);
  const u: V3[] = Array.from({ length: n }, (_, i) => (idx[i]! >= 0 ? [x[idx[i]! * 3]!, x[idx[i]! * 3 + 1]!, x[idx[i]! * 3 + 2]!] : [0, 0, 0]));
  const N = G.edges.map(([a, c], e) => k[e]! * dot(dir[e]!, sub(u[c]!, u[a]!)));
  return { u, N, converged };
}

/** The least area a strut needs for a pull N over its length L: in tension N / (σ / 2); pressed, as a round tube whose
 *  wall is a twentieth of its width (estimate), the area that neither crushes at twice N nor buckles at three times it
 *  (Euler, its ends pinned: π² E I / L², I = A D² / 8 for a thin tube, A = π D t). */
export function areaFor(N: number, L: number, s: Strut): number {
  if (N >= 0) return (2 * N) / s.sy;
  const P = -N, crush = (2 * P) / s.sc;
  // A = π D² / 20 and I = A D² / 8 for D / t = 20: buckling at 3 P wants D⁴ = 3 P L² 160 / (π³ E)
  const D = Math.pow((3 * P * L * L * 160) / (Math.PI ** 3 * s.E), 1 / 4), buck = (Math.PI * D * D) / 20;
  return Math.max(crush, buck);
}

/** A wind on a load: in that load's case, ½ ρ v² (q) along a way (dir), on each strut as wide as it is (drag 1.2, a round
 *  strut across the wind, estimate), half to each end. */
export interface Wind { case: number; q: number; dir: V3 }
/** What the wind puts on a strut's ends: q Cd w L sin θ along the wind, θ between the strut and the wind. */
function windOn(f: V3[], p: V3, q0: V3, a: number, b: number, width: number, w: Wind): void {
  const d = sub(q0, p), L = norm(d), cos = Math.abs(dot(d, w.dir)) / L, F = w.q * 1.2 * width * L * Math.sqrt(Math.max(0, 1 - cos * cos)) / 2;
  for (const j of [a, b]) for (let k = 0; k < 3; k++) f[j]![k]! += F * w.dir[k]!;
}

/** A strut kept: its ends, its area and its length. */
export interface Member { a: number; b: number; A: number; L: number }
export interface Grown { nodes: V3[]; members: Member[]; /** each load's pull in each member, tension positive */ N: number[][]; mass: number; rounds: number; mechanisms: number; planar: boolean }

/** Struts in a straight line through a joint that nothing else meets, holds or loads, made one strut (the joint
 *  between them is no joint: it would swing sideways). */
export function mergeChains(nodes: V3[], list: Member[], held: Set<number>, loaded: Set<number>): Member[] {
  let ms = [...list];
  for (let changed = true; changed;) {
    changed = false; const at = new Map<number, number[]>(); ms.forEach((m, i) => { at.set(m.a, [...(at.get(m.a) ?? []), i]); at.set(m.b, [...(at.get(m.b) ?? []), i]); });
    for (const [j, l] of at) {
      if (l.length !== 2 || held.has(j) || loaded.has(j)) continue;
      const [m1, m2] = [ms[l[0]!]!, ms[l[1]!]!], o1 = m1.a === j ? m1.b : m1.a, o2 = m2.a === j ? m2.b : m2.a;
      const u1 = sub(nodes[o1]!, nodes[j]!), u2 = sub(nodes[o2]!, nodes[j]!);
      if (dot(u1, u2) / (norm(u1) * norm(u2)) > -1 + 1e-9) continue;
      ms = ms.filter((_, i) => i !== l[0] && i !== l[1]); ms.push({ a: o1, b: o2, A: Math.max(m1.A, m2.A), L: norm(sub(nodes[o2]!, nodes[o1]!)) }); changed = true; break;
    }
  }
  return ms;
}

/** A frame grown from a ground of struts by what each carries: every strut sized to the most it carries under any of
 *  the loads (and its own weight and the others', pulled down by g), solved again, until the sizes settle. Struts left
 *  carrying nothing are cut away; struts left in a straight line through a joint nothing else holds or loads are one
 *  strut; and if what is left is a mechanism, the least of what was cut is put back until it is not. */
export function growFrame(G: Graph, s: Strut, held: Set<number>, cases: V3[][], o: { g?: number; rounds?: number; floor?: number; start?: number[]; wind?: Wind[]; slides?: Slides } = {}): Grown & { A: number[]; keptEdges: number[] } {
  const g = o.g ?? 9.80665, rounds = o.rounds ?? 120, n = G.nodes.length;
  const planar = G.nodes.every((p) => Math.abs(p[2] - G.nodes[0]![2]) < 1e-12);
  // its own weight on every load, and where a wind blows, the wind on each strut as thick as it now is (a thin tube's width, √(20 A / π))
  const loadsWith = (A: number[]) => cases.map((c, k) => { const f: V3[] = Array.from({ length: n }, (_, i) => [...(c[i] ?? [0, 0, 0])] as V3); G.edges.forEach(([a, b], e) => { const w = (s.density * A[e]! * G.len[e]! * g) / 2; f[a]![1] -= w; f[b]![1] -= w; for (const wd of o.wind ?? []) if (wd.case === k) windOn(f, G.nodes[a]!, G.nodes[b]!, a, b, Math.sqrt((20 * A[e]!) / Math.PI), wd); }); return f; });
  // every strut starts alike, as thick as the largest load wants pulled
  const Fmax = Math.max(...cases.flat().map((v) => (v ? norm(v) : 0))), A0 = (2 * Fmax) / s.sy || 1e-6;
  let A = o.start ? [...o.start] : G.edges.map(() => A0), done = 0; const last: V3[][] = [];
  for (let it = 0; it < rounds; it++) {
    const floor = (o.floor ?? 1e-4) * Math.max(...A);
    const runs = loadsWith(A).map((f, k) => truss(G, A, s.E, held, f, last[k], o.slides)); runs.forEach((r, k) => { last[k] = r.u; }); const N = runs.map((r) => r.N);
    const next = G.edges.map((_, e) => Math.max(floor, ...N.map((Nk) => areaFor(Nk[e]!, G.len[e]!, s))));
    // half of the change taken each round (in the logarithm), so that two struts sharing a load settle
    const blended = next.map((x, e) => Math.sqrt(x * A[e]!));
    const moved = Math.max(...blended.map((x, e) => Math.abs(Math.log(x / A[e]!))));
    A = blended; done = it + 1; if (moved < 1e-3 && it > 10) break;
  }
  const loaded = new Set<number>(); cases.forEach((c) => c.forEach((v, i) => { if (v && norm(v) > 0) loaded.add(i); }));
  const top = Math.max(...A), order = G.edges.map((_, e) => e).sort((a, b) => A[b]! - A[a]!);
  const build = (es: number[]): Member[] => mergeChains(G.nodes, es.map((e) => ({ a: G.edges[e]![0], b: G.edges[e]![1], A: A[e]!, L: G.len[e]! })), held, loaded);
  const mech = (ms: Member[]) => { const used = [...new Set(ms.flatMap((m) => [m.a, m.b]))], at = new Map(used.map((j, i) => [j, i])); return count({ dim: planar ? 2 : 3, nodes: used.map((j) => (planar ? [G.nodes[j]![0], G.nodes[j]![1]] : G.nodes[j]!)), bars: ms.map((m) => [at.get(m.a)!, at.get(m.b)!] as [number, number]), held: used.filter((j) => held.has(j) && !o.slides?.has(j)).map((j) => at.get(j)!), rollers: used.filter((j) => o.slides?.has(j)).flatMap((j) => [0, 1, 2].filter((d) => d !== o.slides!.get(j) && (!planar || d < 2)).map((d) => [at.get(j)!, d] as [number, number])) }).mechanisms; };
  let k = order.filter((e) => A[e]! > top * 2e-3).length, members = build(order.slice(0, k)), mechanisms = mech(members);
  while (mechanisms > 0 && k < order.length) { k = Math.min(order.length, k + Math.max(1, Math.ceil(k * 0.05))); members = build(order.slice(0, k)); mechanisms = mech(members); }
  // the frame as kept, solved again under each load with its own weight
  const KG: Graph = { nodes: G.nodes, edges: members.map((m) => [m.a, m.b]), len: members.map((m) => m.L) };
  const KA = members.map((m) => m.A), N = cases.map((c) => { const f: V3[] = Array.from({ length: n }, (_, i) => [...(c[i] ?? [0, 0, 0])] as V3); members.forEach((m) => { const w = (s.density * m.A * m.L * g) / 2; f[m.a]![1] -= w; f[m.b]![1] -= w; }); return truss(KG, KA, s.E, held, f, undefined, o.slides).N; });
  const mass = members.reduce((sum, m) => sum + s.density * m.A * m.L, 0);
  return { nodes: G.nodes, members, N, mass, rounds: done, mechanisms, planar, A, keptEdges: order.slice(0, k) };
}

// ---- a frame designed: grown, then made of what can be had -------------------------------------------------------

/** What a frame must do: the room it may take, which of its joints what it stands on or is fixed to holds, the loads it
 *  must carry (each a set of forces at points, every one carried alone), and boxes it must keep clear. */
export interface FrameAsk { lo: V3; hi: V3; cells: [number, number, number]; held: (p: V3) => boolean; /** of the held joints, those free to slide one way, and which (0 x, 1 y, 2 z) */ slide?: (p: V3) => number | null; /** points to have joints at besides the lattice's: where what holds it is */ anchors?: V3[]; /** the most a load may move, m (else 1/250 of twice how far it is held out); the longest a strut may be, m */ sagMax?: number; maxLen?: number; /** winds, each on one of its loads */ wind?: Wind[]; /** resting, its feet may be weighed down (ballast) as much as keeps them down and from sliding */ ballast?: boolean; /** what holds it only pushes (it rests on a floor or a bank): no foot may be pulled down, and no foot slides past μ of what presses it (0.5, estimate) */ rests?: boolean; /** resting, its feet tied together on the floor (skids, or ties between them): it slides only as a whole, when what pushes it sideways passes μ of all that presses it */ tied?: boolean; /** its feet bolted to footings: held every way, each footing as heavy as what would lift it, by 1.5 (what slides it is borne by the footing in the ground, not weighed) */ footings?: boolean; /** resting, the plan of its top (x0, z0, x1, z1), anywhere on which what it carries may be put: it lies inside the outline its feet make, so what is put at its edge does not tip it */ over?: [number, number, number, number]; cases: { at: V3; F: V3 }[][]; keepOut?: [V3, V3][]; /** how far a strut may reach, in cells (2.3: across a cell's face and a knight's move) */ reach?: number }
/** A matter a frame may be made of, and the sections of it that can be had. */
export interface FrameMatter { id: string; name: string; strut: Strut; sections: Section[] }
/** A strut as made: its ends, its section, its length, and its pull under each load. */
export interface MadeStrut { a: number; b: number; L: number; section: Section; N: number[]; /** the least of its margins: tension and crushing by two, buckling by three, as a factor over what each asks */ margin: number; mode: 'pulled' | 'crushed' | 'buckled' | 'slender' }
export interface MadeFrame { matter: FrameMatter; nodes: V3[]; struts: MadeStrut[]; held: number[]; loaded: number[]; mass: number; mechanisms: number; /** what it was grown for, as forces at its joints (its own weight apart), and the winds on them */ cases: V3[][]; wind: Wind[]; /** held joints free to slide one way */ slides: [number, number][]; /** where it rests on what only pushes: the most any foot would have to be pulled down (N, 0 if none), the most any would slide (as a share of μ of what presses it) */ lift: { most: number; slide: number; /** its top lies inside its feet's outline */ inside: boolean; /** where it carries lies inside its feet's outline by a tenth of how high, so a push at its top of a tenth of its weight does not tip it */ steady: boolean }; /** at each foot (as held, in order), the weight it wants set on it to stay down and not slide, by 1.5, N */ ballast: number[]; /** and the most it is pressed down under any load, N */ press: number[]; /** tied, the most any foot is pushed sideways: what a tie to it may carry, N */ tie: number; /** under each load, the most any loaded joint moves, against what it may */ sag: { most: number; allowed: number; at: number }[]; ok: boolean; grownMass: number; rounds: number }

/** The convex hull of points in a plane, anticlockwise (Andrew's monotone chain). */
export function hullOf(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const x of p) { while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, x) <= 1e-12) lower.pop(); lower.push(x); }
  for (const x of [...p].reverse()) { while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, x) <= 1e-12) upper.pop(); upper.push(x); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The lightest section that bears what a strut carries under every load: pulled, its area by two of its strength;
 *  pressed, by two of its crushing and by three of its buckling (Euler, ends pinned). */
export function sectionFor(N: number[], L: number, s: Strut, sections: Section[], least = 0): { section: Section; margin: number; mode: MadeStrut['mode'] } {
  const pull = Math.max(0, ...N), push = Math.max(0, ...N.map((x) => -x));
  // as slender as it may be: pressed under any load, by the limit for what is pressed, else by that for what is pulled
  const most = s.slender ? (push > 0 ? s.slender.push : s.slender.pull) : Infinity;
  const margins = (x: Section) => { const m: [number, MadeStrut['mode']][] = [[pull > 0 ? (x.A * s.sy) / (2 * pull) : Infinity, 'pulled'], [push > 0 ? (x.A * s.sc) / (2 * push) : Infinity, 'crushed'], [push > 0 ? (Math.PI ** 2 * s.E * x.I) / (L * L) / (3 * push) : Infinity, 'buckled'], [most / (L / Math.sqrt(x.I / x.A)), 'slender']]; return m.sort((a, b) => a[0] - b[0])[0]!; };
  const sorted = [...sections].sort((a, b) => a.A - b.A);
  for (const x of sorted) { if (x.A < least) continue; const [m, mode] = margins(x); if (m >= 1) return { section: x, margin: m, mode }; }
  const x = sorted.at(-1)!, [m, mode] = margins(x); return { section: x, margin: m, mode };
}

/** A frame for an ask, of each matter given: grown by what its struts carry, then each strut made of the lightest
 *  section that bears it, solved again as made (a frame with more struts than it needs shares its loads by their
 *  stiffness, so a strut made thicker draws more), until no strut changes; then stiffened where a load moves more than
 *  it may (1/250 of twice how far it is held out, estimate). The lightest that holds is kept; each is returned. */
export function designFrame(ask: FrameAsk, matters: FrameMatter[], o: { g?: number; /** each round of its growth, as it goes: what is left of it, and what it would weigh made */ trace?: (r: { matter: string; round: number; ground: number; struts: number; joints: number; mass: number; ok: boolean }) => void; /** what each joint costs, as a mass (a node, a gusset, its bolts), kg */ jointKg?: number; /** and each joint held by what holds it (its plate), kg */ heldKg?: number } = {}): { best: MadeFrame | null; tried: MadeFrame[] } {
  const g = o.g ?? 9.80665, pts = ask.cases.flat().map((x) => x.at);
  const { nodes, at } = lattice(ask.lo, ask.hi, ask.cells, [...pts, ...(ask.anchors ?? [])]);
  const held = new Set(nodes.map((p, i) => (ask.held(p) ? i : -1)).filter((i) => i >= 0));
  const slides: Slides = new Map(); if (ask.slide) for (const j of held) { const ax = ask.slide(nodes[j]!); if (ax !== null) slides.set(j, ax); }
  const cell = Math.max(...[0, 1, 2].filter((d) => ask.cells[d]! > 0).map((d) => (ask.hi[d]! - ask.lo[d]!) / ask.cells[d]!));
  // every joint may reach every other where there are few enough of them (the full ground: a strut may be as long as
  // the room), else as far as a knight's move across the cells
  const span = Math.hypot(ask.hi[0] - ask.lo[0], ask.hi[1] - ask.lo[1], ask.hi[2] - ask.lo[2]);
  const G = ground(nodes, Math.min(ask.maxLen ?? Infinity, ask.reach !== undefined ? cell * ask.reach : nodes.length <= 48 ? span * 1.001 : cell * 2.3), { held, ...(ask.keepOut ? { keepOut: ask.keepOut } : {}) });
  // from each load, a way straight to each held joint, however far (a hypha grows to its food, a strut to what holds it),
  // unless another joint lies on it or a box kept clear is in its way
  { const have = new Set(G.edges.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`)), loads0 = [...new Set(at.slice(0, pts.length))];
    for (const i of loads0) for (const j of held) { const key = `${Math.min(i, j)}-${Math.max(i, j)}`; if (i === j || have.has(key)) continue; const p = nodes[i]!, q = nodes[j]!, u = sub(q, p), L = norm(u); if (L < 1e-12 || (ask.maxLen !== undefined && L > ask.maxLen)) continue; if (ask.keepOut?.some((b) => through(p, q, b))) continue; let blocked = false; for (let k2 = 0; k2 < nodes.length && !blocked; k2++) { if (k2 === i || k2 === j) continue; const w = sub(nodes[k2]!, p), t2 = dot(w, u) / (L * L); if (t2 <= 1e-9 || t2 >= 1 - 1e-9) continue; if (norm(sub(w, [u[0] * t2, u[1] * t2, u[2] * t2])) < L * 1e-6) blocked = true; } if (!blocked) { G.edges.push([i, j]); G.len.push(L); have.add(key); } } }
  let k = 0; const cases: V3[][] = ask.cases.map((c) => { const f: V3[] = []; for (const x of c) { const j = at[k++]!; f[j] = [(f[j]?.[0] ?? 0) + x.F[0], (f[j]?.[1] ?? 0) + x.F[1], (f[j]?.[2] ?? 0) + x.F[2]]; } return f; });
  const loaded = [...new Set(at.slice(0, pts.length))];
  // nothing in the room is held: nothing holds a frame grown there
  if (!held.size) return { best: null, tried: [] };
  const tried = matters.map((mt) => {
    // made of what can be had: each strut the lightest section that bears it, the frame solved again as made, until no
    // strut changes; then stiffened where a load moves more than it may
    const make = (grown: Grown): MadeFrame => {
      const KG: Graph = { nodes, edges: grown.members.map((m) => [m.a, m.b]), len: grown.members.map((m) => m.L) };
      let picks: ReturnType<typeof sectionFor>[] = [];
      const widthOf = (A: number, e: number) => picks[e]?.section.width ?? Math.sqrt((20 * A) / Math.PI);
      const solve = (A: number[]) => cases.map((c, k) => { const f: V3[] = Array.from({ length: nodes.length }, (_, i) => [...(c[i] ?? [0, 0, 0])] as V3); grown.members.forEach((m, e) => { const w = (mt.strut.density * A[e]! * m.L * g) / 2; f[m.a]![1] -= w; f[m.b]![1] -= w; for (const wd of ask.wind ?? []) if (wd.case === k) windOn(f, nodes[m.a]!, nodes[m.b]!, m.a, m.b, widthOf(A[e]!, e), wd); }); return { r: truss(KG, A, mt.strut.E, held, f, undefined, slides), f }; }).map((x) => Object.assign(x.r, { f: x.f }));
      let least = grown.members.map(() => 0);
      picks = grown.members.map((m, e) => sectionFor(grown.N.map((Nk) => Nk[e]!), m.L, mt.strut, mt.sections));
      let runs = solve(picks.map((p) => p.section.A));
      for (let it = 0; it < 8; it++) {
        const next = grown.members.map((m, e) => sectionFor(runs.map((r) => r.N[e]!), m.L, mt.strut, mt.sections, Math.max(least[e]!, picks[e]!.section.A)));
        const changed = next.some((p, e) => p.section !== picks[e]!.section); picks = next; runs = solve(picks.map((p) => p.section.A)); if (!changed) break;
      }
      const reachOf = (j: number) => Math.min(...[...held].map((h) => Math.hypot(nodes[j]![0] - nodes[h]![0], nodes[j]![2] - nodes[h]![2]))), allow = (j: number) => ask.sagMax ?? Math.max(2 * reachOf(j), cell) / 250;
      const sagOf = () => runs.map((r) => { let most = 0, allowed = Infinity, w = -1; for (const j of loaded) { const d = norm(r.u[j]!), a = allow(j); if (w < 0 || d / a > most / allowed) { most = d; allowed = a; w = j; } } return { most, allowed, at: w }; });
      let sag = sagOf();
      for (let it = 0; it < 6 && sag.some((x) => x.most > x.allowed); it++) {
        const ratio = Math.max(...sag.map((x) => x.most / x.allowed));
        least = picks.map((p) => p.section.A * Math.min(4, ratio));
        picks = grown.members.map((m, e) => sectionFor(runs.map((r) => r.N[e]!), m.L, mt.strut, mt.sections, least[e]!));
        runs = solve(picks.map((p) => p.section.A)); sag = sagOf();
      }
      const struts: MadeStrut[] = grown.members.map((m, e) => { const N = runs.map((r) => r.N[e]!), p = sectionFor(N, m.L, mt.strut, [picks[e]!.section]); return { a: m.a, b: m.b, L: m.L, section: picks[e]!.section, N, margin: p.margin, mode: p.mode }; });
      const mass = struts.reduce((x, y) => x + mt.strut.density * y.section.A * y.L, 0);
      // what holds it pushes back at each held joint: what its struts pull it with, and what is put on it, less (R = −Σ N u − f);
      // resting, none may pull it down, nor push it sideways past half of what presses it
      const lift = { most: 0, slide: 0 };
      const heldList = [...held], need = heldList.map(() => 0), press = heldList.map(() => 0), side = heldList.map(() => 0), whole: { H: number; V: number }[] = [];
      if (ask.rests || ask.footings) runs.forEach((r) => { const Hs = [0, 0]; let V = 0; heldList.forEach((h, hi) => { const R: V3 = [0, 0, 0]; struts.forEach((x, e) => { if (x.a !== h && x.b !== h) return; const o2 = x.a === h ? x.b : x.a, u = sub(nodes[o2]!, nodes[h]!), L = norm(u); for (let d = 0; d < 3; d++) R[d]! -= (r.N[e]! * u[d]!) / L; }); const f = r.f[h]!; for (let d = 0; d < 3; d++) R[d]! -= f[d]!;
        // what would keep it down, and from sliding (μ 0.5, estimate): pressed by at least what it is pushed sideways over μ
        // tied, a foot only wants keeping down; the whole, from sliding
        const want = ask.footings || ask.tied ? Math.max(0, -R[1]) : Math.max(-R[1], Math.hypot(R[0], R[2]) / 0.5 - R[1]); need[hi] = Math.max(need[hi]!, want);
        press[hi] = Math.max(press[hi]!, R[1]); side[hi] = Math.max(side[hi]!, Math.hypot(R[0], R[2])); Hs[0] += R[0]; Hs[1] += R[2]; V += R[1];
        if (R[1] < 0) lift.most = Math.max(lift.most, -R[1]); else if (R[1] > 0 && !ask.tied) lift.slide = Math.max(lift.slide, Math.hypot(R[0], R[2]) / (0.5 * R[1])); });
        const H = Math.hypot(Hs[0], Hs[1]); whole.push({ H, V }); if (ask.tied && H > 1e-9) lift.slide = Math.max(lift.slide, V > 0 ? H / (0.5 * V) : Infinity); });
      const ballast = ask.ballast || ask.footings ? need.map((x) => Math.max(0, x) * 1.5) : need.map(() => 0);
      // tied and weighed down, the whole wants as much more as keeps it from sliding (what it lacks of pressing, by 1.5, as
      // a foot alone does): spread over its feet
      const usedFoot = heldList.map((h) => struts.some((x) => x.a === h || x.b === h)), nFeet = usedFoot.filter(Boolean).length;
      if (ask.tied && ask.ballast && nFeet) { const B = ballast.reduce((a, b) => a + b, 0), D = Math.max(0, ...whole.map((w) => 1.5 * (w.H / 0.5 - w.V) - B)); if (D > 0) heldList.forEach((_, i) => { if (usedFoot[i]) ballast[i]! += D / nFeet; }); }
      // resting, its feet's outline on the floor (their convex hull) holds the whole of its top
      const feet = [...held].filter((h) => struts.some((x) => x.a === h || x.b === h)).map((h) => [nodes[h]![0], nodes[h]![2]] as [number, number]);
      const inside = !ask.rests || !ask.over || ((): boolean => { const hull = hullOf(feet); if (hull.length < 3) return false; const [x0, z0, x1, z1] = ask.over!; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].every(([x, z]) => hull.every((p, i) => { const q = hull[(i + 1) % hull.length]!; return (q[0] - p[0]) * (z! - p[1]) - (q[1] - p[1]) * (x! - p[0]) >= -1e-9; })); })();
      // resting, pushed at its top with a tenth of what it weighs it does not tip: where what it carries bears down lies
      // inside its feet's outline by a tenth of how high that is (the lean every drawn way stands against)
      const steady = !ask.rests || ((): boolean => { const hull = hullOf(feet), c0 = cases[0] ?? []; let w = 0, cx = 0, cz = 0, top = -Infinity; for (const j of loaded) { const d = Math.max(0, -(c0[j]?.[1] ?? 0)); w += d; cx += d * nodes[j]![0]; cz += d * nodes[j]![2]; top = Math.max(top, nodes[j]![1]); } if (!w || hull.length < 3) return hull.length >= 3 || !w; cx /= w; cz /= w; const floor = Math.min(...[...held].map((h) => nodes[h]![1])), m = 0.1 * Math.max(0, top - floor); return hull.every((p, i) => { const q = hull[(i + 1) % hull.length]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]); return L < 1e-12 || ((q[0] - p[0]) * (cz - p[1]) - (q[1] - p[1]) * (cx - p[0])) / L >= m - 1e-9; }); })();
      const ok = grown.mechanisms === 0 && struts.every((x) => x.margin >= 1) && sag.every((x) => x.most <= x.allowed) && runs.every((r) => r.converged) && (ask.ballast || ask.footings || (lift.most <= 1e-6 * Math.max(1, mass * g) && lift.slide <= 1)) && inside && steady;
      return { matter: mt, nodes, struts, held: [...held].filter((h) => struts.some((x) => x.a === h || x.b === h)), loaded, mass, mechanisms: grown.mechanisms, cases, wind: ask.wind ?? [], slides: [...slides], lift: { ...lift, inside, steady }, ballast: heldList.map((h, i) => (struts.some((x) => x.a === h || x.b === h) ? ballast[i]! : 0)).filter((_, i) => struts.some((x) => x.a === heldList[i] || x.b === heldList[i])), press: press.filter((_, i) => usedFoot[i]), tie: Math.max(0, ...side.filter((_, i) => usedFoot[i])), sag, ok, grownMass: grown.mass, rounds: grown.rounds };
    };
    // grown on all the ground; then, as a bone gives up what it does not use, the struts doing least (what they carry
    // times how long they are) are taken away a few at a time, the rest grown again as their loads find new ways, and
    // made again of what can be had: the lightest made that holds and is no mechanism is kept (evolutionary structural
    // optimisation, Xie and Steven, Comput. Struct. 49, 1993)
    let edges = G.edges.map((_, e) => e), start: number[] | undefined, best: MadeFrame | null = null, since = 0;
    // what is made is weighed with what its joints cost: fewer joints, and fewer held, where the struts allow
    const score = (m: MadeFrame) => m.mass + m.ballast.reduce((x, y) => x + y / g, 0) + (o.jointKg ?? 0) * new Set(m.struts.flatMap((x) => [x.a, x.b])).size + (o.heldKg ?? 0) * m.held.length;
    const needed = new Set<number>(), planar = nodes.every((p) => Math.abs(p[2] - nodes[0]![2]) < 1e-12);
    const loadedSet = new Set(loaded);
    // a cut that leaves a free joint with fewer struts than it has freedoms, or all of them in one plane (in a plane, on one
    // line), leaves it a mechanism there: said at once, without the count
    const localBad = (es: number[]) => { const at = new Map<number, number[]>(); for (const e of es) for (const j of G.edges[e]!) at.set(j, [...(at.get(j) ?? []), e]); for (const [j, list] of at) { if (held.has(j)) continue; const dirs = list.map((e) => { const [a, b] = G.edges[e]!, o2 = a === j ? b : a; return sub(nodes[o2]!, nodes[j]!); }); if (planar ? dirs.length < 2 : dirs.length < 3) { if (dirs.length === 2 && !planar) { /* two in line through it may be merged: the count decides */ const c2 = dot(dirs[0]!, dirs[1]!) / (norm(dirs[0]!) * norm(dirs[1]!)); if (c2 < -1 + 1e-9 && !loaded.includes(j)) continue; } return true; } if (!planar) { let spans = false; for (let i = 0; i < dirs.length && !spans; i++) for (let k = i + 1; k < dirs.length && !spans; k++) for (let l = k + 1; l < dirs.length && !spans; l++) { const cr = [dirs[i]![1] * dirs[k]![2] - dirs[i]![2] * dirs[k]![1], dirs[i]![2] * dirs[k]![0] - dirs[i]![0] * dirs[k]![2], dirs[i]![0] * dirs[k]![1] - dirs[i]![1] * dirs[k]![0]] as V3; if (Math.abs(dot(cr, dirs[l]!)) > 1e-9 * norm(dirs[i]!) * norm(dirs[k]!) * norm(dirs[l]!)) spans = true; } if (!spans) return true; } } return false; };
    const groundMech = (es: number[]) => { if (localBad(es)) return 1; return groundCount(es); };
    const groundCount = (es: number[]) => { const ms = mergeChains(nodes, es.map((e) => ({ a: G.edges[e]![0], b: G.edges[e]![1], A: 1, L: G.len[e]! })), held, loadedSet), used = [...new Set(ms.flatMap((m) => [m.a, m.b]))], at = new Map(used.map((j, i) => [j, i])); return count({ dim: planar ? 2 : 3, nodes: used.map((j) => (planar ? [nodes[j]![0], nodes[j]![1]] : nodes[j]!)), bars: ms.map((m) => [at.get(m.a)!, at.get(m.b)!] as [number, number]), held: used.filter((j) => held.has(j) && !slides.has(j)).map((j) => at.get(j)!), rollers: used.filter((j) => slides.has(j)).flatMap((j) => [0, 1, 2].filter((d) => d !== slides.get(j) && (!planar || d < 2)).map((d) => [at.get(j)!, d] as [number, number])) }).mechanisms + (loaded.some((j) => !used.includes(j)) ? 1 : 0); };
    for (let round = 0; round < 60 && edges.length > 0; round++) {
      const Gs: Graph = { nodes, edges: edges.map((e) => G.edges[e]!), len: edges.map((e) => G.len[e]!) };
      const grown = growFrame(Gs, mt.strut, held, cases, { g, rounds: start ? 40 : 120, ...(start ? { start } : {}), ...(ask.wind ? { wind: ask.wind } : {}), slides });
      const made = make(grown);
      o.trace?.({ matter: mt.id, round, ground: edges.length, struts: made.struts.length, joints: new Set(made.struts.flatMap((x) => [x.a, x.b])).size, mass: made.mass, ok: made.ok });
      if (!best || (made.ok && (!best.ok || score(made) < score(best))) || (!made.ok && !best.ok && score(made) < score(best))) { best = made; since = 0; } else since++;
      if (since >= 12) break;
      // from here on, only what still carries: the struts withered to nothing are gone from the ground
      const live = grown.keptEdges; edges = live.map((e) => edges[e]!); const GA = live.map((e) => grown.A[e]!);
      const Gl: Graph = { nodes, edges: edges.map((e) => G.edges[e]!), len: edges.map((e) => G.len[e]!) };
      // what each carries times its length, the most under any load
      const N = cases.map((c) => truss(Gl, GA, mt.strut.E, held, Array.from({ length: nodes.length }, (_, i) => c[i] ?? [0, 0, 0]) as V3[], undefined, slides).N);
      const work = Gl.edges.map((_, e) => Math.max(...N.map((Nk) => Math.abs(Nk[e]!))) * Gl.len[e]!);
      // a joint nothing holds or loads may go, with every strut that meets it: a bone gives up a whole region it does
      // not use, not a strut at a time (a joint in space wants three struts, so taking one leaves it a mechanism)
      const free = new Map<number, number[]>(); Gl.edges.forEach(([a, b], e) => { for (const j of [a, b]) if (!held.has(j) && !loaded.includes(j)) free.set(j, [...(free.get(j) ?? []), e]); });
      const nodeItems = [...free.values()].map((es) => ({ es, w: es.reduce((x, e) => x + work[e]!, 0) })).sort((x, y) => x.w - y.w);
      const strutItems = Gl.edges.map((_, e) => e).filter((e) => !needed.has(edges[e]!)).map((e) => ({ es: [e], w: work[e]! })).sort((x, y) => x.w - y.w);
      // each tried alone, the least first, and taken only if what is left is no mechanism: joints first, then struts,
      // a tenth of them a round at most
      let keep: number[] | null = null;
      for (const list of [nodeItems, strutItems]) {
        const cut = new Set<number>(), most = Math.max(1, Math.floor(list.length * (list === nodeItems ? 0.25 : 0.1))); let taken = 0;
        for (const x of list) {
          if (taken >= most) break;
          if (x.es.every((e) => cut.has(e))) continue;
          const trial = new Set([...cut, ...x.es]), k2 = Gl.edges.map((_, e) => e).filter((e) => !trial.has(e));
          if (k2.length && groundMech(k2.map((e) => edges[e]!)) === 0) { for (const e of x.es) cut.add(e); taken++; } else if (x.es.length === 1) needed.add(edges[x.es[0]!]!);
        }
        if (taken) { keep = Gl.edges.map((_, e) => e).filter((e) => !cut.has(e)); break; }
      }
      if (!keep) break;
      start = keep.map((e) => GA[e]!); edges = keep.map((e) => edges[e]!);
    }
    return best!;
  });
  const best = tried.filter((x) => x.ok).sort((a, b) => a.mass - b.mass)[0] ?? null;
  return { best, tried };
}

// ---- the law of scale: a frame as made, made bigger or smaller ----------------------------------------------------------

/** A frame as made, every length times s (its struts' areas by s², their second moments by s⁴), and what it carries
 *  either made with it (its loads by s³, as a thing of the same stuff scaled) or kept as it is; solved again: the least
 *  margin of its struts (in strength by two, in buckling by three) and how far its loads move against what they may. */
export function frameAt(f: MadeFrame, sc: number, withIt: boolean, g = 9.80665): { strength: number; buckling: number; sag: number } {
  const nodes = f.nodes.map((p) => [p[0] * sc, p[1] * sc, p[2] * sc] as V3), held = new Set(f.held);
  const G: Graph = { nodes, edges: f.struts.map((x) => [x.a, x.b]), len: f.struts.map((x) => x.L * sc) };
  const A = f.struts.map((x) => x.section.A * sc * sc), I = f.struts.map((x) => x.section.I * sc ** 4), k = withIt ? sc ** 3 : 1;
  let strength = Infinity, buckling = Infinity, sag = 0;
  f.cases.forEach((c, ci) => {
    const load: V3[] = nodes.map((_, i) => { const v = c[i]; return v ? [v[0] * k, v[1] * k, v[2] * k] : [0, 0, 0]; });
    f.struts.forEach((x, e) => { const w = (f.matter.strut.density * A[e]! * G.len[e]! * g) / 2; load[x.a]![1] -= w; load[x.b]![1] -= w; for (const wd of f.wind) if (wd.case === ci) windOn(load, nodes[x.a]!, nodes[x.b]!, x.a, x.b, (x.section.width ?? Math.sqrt((20 * x.section.A) / Math.PI)) * sc, wd); });
    const r = truss(G, A, f.matter.strut.E, held, load, undefined, new Map(f.slides));
    f.struts.forEach((x, e) => { const N = r.N[e]!; if (N > 0) strength = Math.min(strength, (A[e]! * f.matter.strut.sy) / (2 * N)); else if (N < 0) { strength = Math.min(strength, (A[e]! * f.matter.strut.sc) / (-2 * N)); buckling = Math.min(buckling, (Math.PI ** 2 * f.matter.strut.E * I[e]!) / (G.len[e]! ** 2) / (-3 * N)); } });
    const reach = (j: number) => Math.min(...f.held.map((h) => Math.hypot(nodes[j]![0] - nodes[h]![0], nodes[j]![2] - nodes[h]![2])));
    for (const j of f.loaded) sag = Math.max(sag, norm(r.u[j]!) / (Math.max(2 * reach(j), 1e-9 + 0.1 * sc) / 250));
  });
  return { strength, buckling, sag: sag > 0 ? 1 / sag : Infinity };
}

/** How each of its margins goes with its size: the power of s it goes as near its own size (measured, d ln m / d ln s),
 *  and the size, as a multiple of its own, where it first falls to what it asks (searched over a thousandth to a
 *  thousand times), with what it carries made with it and kept as it is. */
export function scaleLaw(f: MadeFrame): { withIt: boolean; laws: { what: 'strength' | 'buckling' | 'sag'; power: number; at1: number; fails: number | null }[] }[] {
  const out: ReturnType<typeof scaleLaw> = [];
  for (const withIt of [true, false]) {
    const m1 = frameAt(f, 1, withIt), m2 = frameAt(f, 1.01, withIt);
    const grid = Array.from({ length: 121 }, (_, i) => 10 ** (-3 + i * 0.05)), at = grid.map((x) => frameAt(f, x, withIt));
    out.push({ withIt, laws: (['strength', 'buckling', 'sag'] as const).filter((k) => Number.isFinite(m1[k])).map((k) => {
      const power = Math.log(m2[k] / m1[k]) / Math.log(1.01);
      // where it falls below 1 nearest its own size, up or down
      let fails: number | null = null, best = Infinity;
      for (let i = 1; i < grid.length; i++) { const a = at[i - 1]![k], b = at[i]![k]; if ((a - 1) * (b - 1) <= 0 && Number.isFinite(a) && Number.isFinite(b)) { const x = Math.exp(Math.log(grid[i - 1]!) + (Math.log(grid[i]!) - Math.log(grid[i - 1]!)) * ((Math.log(a) - 0) / (Math.log(a) - Math.log(b)))); if (Math.abs(Math.log(x)) < best) { best = Math.abs(Math.log(x)); fails = x; } } }
      return { what: k, power, at1: m1[k], fails };
    }) });
  }
  return out;
}
