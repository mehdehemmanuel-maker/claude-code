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
function pcg(apply: (x: Float64Array, out: Float64Array) => void, precond: (r: Float64Array, z: Float64Array) => void, b: Float64Array, tol = 1e-10, most = 20000): { x: Float64Array; iterations: number; converged: boolean } {
  const n = b.length, x = new Float64Array(n), r = Float64Array.from(b), z = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n);
  const bn = Math.sqrt(b.reduce((s, v) => s + v * v, 0)); if (bn === 0) return { x, iterations: 0, converged: true };
  precond(r, z); p.set(z); let rz = r.reduce((s, v, i) => s + v * z[i]!, 0);
  for (let it = 1; it <= most; it++) {
    apply(p, Ap); const pAp = p.reduce((s, v, i) => s + v * Ap[i]!, 0); if (!(pAp > 0)) return { x, iterations: it, converged: false };
    const a = rz / pAp; for (let i = 0; i < n; i++) { x[i]! += a * p[i]!; r[i]! -= a * Ap[i]!; }
    const rn = Math.sqrt(r.reduce((s, v) => s + v * v, 0)); if (rn <= tol * bn) return { x, iterations: it, converged: true };
    precond(r, z); const rz2 = r.reduce((s, v, i) => s + v * z[i]!, 0), beta = rz2 / rz; rz = rz2;
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
  const apply = (x: Float64Array, out: Float64Array) => { out.fill(0); G.edges.forEach(([a, c], e) => { const fa = free[a]!, fc = free[c]!, ge = g[e]!; const xa = fa >= 0 ? x[fa]! : 0, xc = fc >= 0 ? x[fc]! : 0; if (fa >= 0) out[fa]! += ge * (xa - xc); if (fc >= 0) out[fc]! += ge * (xc - xa); }); };
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
export interface Strut { E: number; /** in tension */ sy: number; /** pressed, before it crushes */ sc: number; density: number }
/** A section that can be had: its area, its least second moment, its mass for a metre, and its name. */
export interface Section { A: number; I: number; label: string }

/** Joints' motions and each strut's pull (tension positive) under loads at the joints, the held joints held still. */
export function truss(G: Graph, A: number[], E: number, held: Set<number>, load: V3[]): { u: V3[]; N: number[]; converged: boolean } {
  const n = G.nodes.length, idx = new Int32Array(n).fill(-1); let m = 0; for (let i = 0; i < n; i++) if (!held.has(i)) idx[i] = m++;
  const dir = G.edges.map(([a, c], e) => { const d = sub(G.nodes[c]!, G.nodes[a]!), L = G.len[e]!; return [d[0] / L, d[1] / L, d[2] / L] as V3; });
  const k = G.edges.map((_, e) => (E * A[e]!) / G.len[e]!);
  const blocks = new Float64Array(m * 9);
  G.edges.forEach(([a, c], e) => { const d = dir[e]!; for (const j of [a, c]) { const f = idx[j]!; if (f < 0) continue; for (let r = 0; r < 3; r++) for (let s = 0; s < 3; s++) blocks[f * 9 + r * 3 + s]! += k[e]! * d[r]! * d[s]!; } });
  // each joint's own 3 × 3 block inverted (a joint no strut holds in some direction is held there by a little, so it
  // does not leave the solve singular; a joint so held is a mechanism, found by the count, not here)
  const inv = new Float64Array(m * 9);
  for (let f = 0; f < m; f++) {
    const B = Array.from({ length: 9 }, (_, i) => blocks[f * 9 + i]!), tr = B[0]! + B[4]! + B[8]!, eps = 1e-9 * (tr || 1); B[0]! += eps; B[4]! += eps; B[8]! += eps;
    const [a, b, c, d, e, g, h, i, j] = B as [number, number, number, number, number, number, number, number, number], det = a * (e * j - g * i) - b * (d * j - g * h) + c * (d * i - e * h);
    const I = [e * j - g * i, c * i - b * j, b * g - c * e, g * h - d * j, a * j - c * h, c * d - a * g, d * i - e * h, b * h - a * i, a * e - b * d].map((x) => x / det);
    for (let q = 0; q < 9; q++) inv[f * 9 + q] = I[q]!;
  }
  const apply = (x: Float64Array, out: Float64Array) => {
    out.fill(0);
    G.edges.forEach(([a, c], e) => {
      const d = dir[e]!, fa = idx[a]!, fc = idx[c]!; let s = 0;
      for (let r = 0; r < 3; r++) s += d[r]! * ((fc >= 0 ? x[fc * 3 + r]! : 0) - (fa >= 0 ? x[fa * 3 + r]! : 0));
      const t = k[e]! * s; for (let r = 0; r < 3; r++) { if (fc >= 0) out[fc * 3 + r]! += t * d[r]!; if (fa >= 0) out[fa * 3 + r]! -= t * d[r]!; }
    });
  };
  const b = new Float64Array(m * 3); for (let i = 0; i < n; i++) if (idx[i]! >= 0) for (let r = 0; r < 3; r++) b[idx[i]! * 3 + r] = load[i]?.[r] ?? 0;
  const { x, converged } = pcg(apply, (r, z) => { for (let f = 0; f < m; f++) for (let a = 0; a < 3; a++) { let s = 0; for (let c = 0; c < 3; c++) s += inv[f * 9 + a * 3 + c]! * r[f * 3 + c]!; z[f * 3 + a] = s; } }, b, 1e-10, 40000);
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
export function growFrame(G: Graph, s: Strut, held: Set<number>, cases: V3[][], o: { g?: number; rounds?: number; floor?: number; start?: number[] } = {}): Grown & { A: number[]; keptEdges: number[] } {
  const g = o.g ?? 9.80665, rounds = o.rounds ?? 120, n = G.nodes.length;
  const planar = G.nodes.every((p) => Math.abs(p[2] - G.nodes[0]![2]) < 1e-12);
  const loadsWith = (A: number[]) => cases.map((c) => { const f: V3[] = Array.from({ length: n }, (_, i) => [...(c[i] ?? [0, 0, 0])] as V3); G.edges.forEach(([a, b], e) => { const w = (s.density * A[e]! * G.len[e]! * g) / 2; f[a]![1] -= w; f[b]![1] -= w; }); return f; });
  // every strut starts alike, as thick as the largest load wants pulled
  const Fmax = Math.max(...cases.flat().map((v) => (v ? norm(v) : 0))), A0 = (2 * Fmax) / s.sy || 1e-6;
  let A = o.start ? [...o.start] : G.edges.map(() => A0), done = 0;
  for (let it = 0; it < rounds; it++) {
    const floor = (o.floor ?? 1e-4) * Math.max(...A);
    const N = loadsWith(A).map((f) => truss(G, A, s.E, held, f).N);
    const next = G.edges.map((_, e) => Math.max(floor, ...N.map((Nk) => areaFor(Nk[e]!, G.len[e]!, s))));
    // half of the change taken each round (in the logarithm), so that two struts sharing a load settle
    const blended = next.map((x, e) => Math.sqrt(x * A[e]!));
    const moved = Math.max(...blended.map((x, e) => Math.abs(Math.log(x / A[e]!))));
    A = blended; done = it + 1; if (moved < 1e-3 && it > 10) break;
  }
  const loaded = new Set<number>(); cases.forEach((c) => c.forEach((v, i) => { if (v && norm(v) > 0) loaded.add(i); }));
  const top = Math.max(...A), order = G.edges.map((_, e) => e).sort((a, b) => A[b]! - A[a]!);
  const build = (es: number[]): Member[] => mergeChains(G.nodes, es.map((e) => ({ a: G.edges[e]![0], b: G.edges[e]![1], A: A[e]!, L: G.len[e]! })), held, loaded);
  const mech = (ms: Member[]) => { const used = [...new Set(ms.flatMap((m) => [m.a, m.b]))], at = new Map(used.map((j, i) => [j, i])); return count({ dim: planar ? 2 : 3, nodes: used.map((j) => (planar ? [G.nodes[j]![0], G.nodes[j]![1]] : G.nodes[j]!)), bars: ms.map((m) => [at.get(m.a)!, at.get(m.b)!] as [number, number]), held: used.filter((j) => held.has(j)).map((j) => at.get(j)!) }).mechanisms; };
  let k = order.filter((e) => A[e]! > top * 2e-3).length, members = build(order.slice(0, k)), mechanisms = mech(members);
  while (mechanisms > 0 && k < order.length) { k = Math.min(order.length, k + Math.max(1, Math.ceil(k * 0.05))); members = build(order.slice(0, k)); mechanisms = mech(members); }
  // the frame as kept, solved again under each load with its own weight
  const KG: Graph = { nodes: G.nodes, edges: members.map((m) => [m.a, m.b]), len: members.map((m) => m.L) };
  const KA = members.map((m) => m.A), N = cases.map((c) => { const f: V3[] = Array.from({ length: n }, (_, i) => [...(c[i] ?? [0, 0, 0])] as V3); members.forEach((m) => { const w = (s.density * m.A * m.L * g) / 2; f[m.a]![1] -= w; f[m.b]![1] -= w; }); return truss(KG, KA, s.E, held, f).N; });
  const mass = members.reduce((sum, m) => sum + s.density * m.A * m.L, 0);
  return { nodes: G.nodes, members, N, mass, rounds: done, mechanisms, planar, A, keptEdges: order.slice(0, k) };
}

// ---- a frame designed: grown, then made of what can be had -------------------------------------------------------

/** What a frame must do: the room it may take, which of its joints what it stands on or is fixed to holds, the loads it
 *  must carry (each a set of forces at points, every one carried alone), and boxes it must keep clear. */
export interface FrameAsk { lo: V3; hi: V3; cells: [number, number, number]; held: (p: V3) => boolean; cases: { at: V3; F: V3 }[][]; keepOut?: [V3, V3][]; /** how far a strut may reach, in cells (2.3: across a cell's face and a knight's move) */ reach?: number }
/** A matter a frame may be made of, and the sections of it that can be had. */
export interface FrameMatter { id: string; name: string; strut: Strut; sections: Section[] }
/** A strut as made: its ends, its section, its length, and its pull under each load. */
export interface MadeStrut { a: number; b: number; L: number; section: Section; N: number[]; /** the least of its margins: tension and crushing by two, buckling by three, as a factor over what each asks */ margin: number; mode: 'pulled' | 'crushed' | 'buckled' }
export interface MadeFrame { matter: FrameMatter; nodes: V3[]; struts: MadeStrut[]; held: number[]; loaded: number[]; mass: number; mechanisms: number; /** under each load, the most any loaded joint moves, against what it may */ sag: { most: number; allowed: number; at: number }[]; ok: boolean; grownMass: number; rounds: number }

/** The lightest section that bears what a strut carries under every load: pulled, its area by two of its strength;
 *  pressed, by two of its crushing and by three of its buckling (Euler, ends pinned). */
export function sectionFor(N: number[], L: number, s: Strut, sections: Section[], least = 0): { section: Section; margin: number; mode: MadeStrut['mode'] } {
  const pull = Math.max(0, ...N), push = Math.max(0, ...N.map((x) => -x));
  const margins = (x: Section) => { const m: [number, MadeStrut['mode']][] = [[pull > 0 ? (x.A * s.sy) / (2 * pull) : Infinity, 'pulled'], [push > 0 ? (x.A * s.sc) / (2 * push) : Infinity, 'crushed'], [push > 0 ? (Math.PI ** 2 * s.E * x.I) / (L * L) / (3 * push) : Infinity, 'buckled']]; return m.sort((a, b) => a[0] - b[0])[0]!; };
  const sorted = [...sections].sort((a, b) => a.A - b.A);
  for (const x of sorted) { if (x.A < least) continue; const [m, mode] = margins(x); if (m >= 1) return { section: x, margin: m, mode }; }
  const x = sorted.at(-1)!, [m, mode] = margins(x); return { section: x, margin: m, mode };
}

/** A frame for an ask, of each matter given: grown by what its struts carry, then each strut made of the lightest
 *  section that bears it, solved again as made (a frame with more struts than it needs shares its loads by their
 *  stiffness, so a strut made thicker draws more), until no strut changes; then stiffened where a load moves more than
 *  it may (1/250 of twice how far it is held out, estimate). The lightest that holds is kept; each is returned. */
export function designFrame(ask: FrameAsk, matters: FrameMatter[], o: { g?: number } = {}): { best: MadeFrame | null; tried: MadeFrame[] } {
  const g = o.g ?? 9.80665, pts = ask.cases.flat().map((x) => x.at);
  const { nodes, at } = lattice(ask.lo, ask.hi, ask.cells, pts);
  const held = new Set(nodes.map((p, i) => (ask.held(p) ? i : -1)).filter((i) => i >= 0));
  const cell = Math.max(...[0, 1, 2].filter((d) => ask.cells[d]! > 0).map((d) => (ask.hi[d]! - ask.lo[d]!) / ask.cells[d]!));
  const G = ground(nodes, cell * (ask.reach ?? 2.3), { held, ...(ask.keepOut ? { keepOut: ask.keepOut } : {}) });
  let k = 0; const cases: V3[][] = ask.cases.map((c) => { const f: V3[] = []; for (const x of c) { const j = at[k++]!; f[j] = [(f[j]?.[0] ?? 0) + x.F[0], (f[j]?.[1] ?? 0) + x.F[1], (f[j]?.[2] ?? 0) + x.F[2]]; } return f; });
  const loaded = [...new Set(at)];
  const tried = matters.map((mt) => {
    // made of what can be had: each strut the lightest section that bears it, the frame solved again as made, until no
    // strut changes; then stiffened where a load moves more than it may
    const make = (grown: Grown): MadeFrame => {
      const KG: Graph = { nodes, edges: grown.members.map((m) => [m.a, m.b]), len: grown.members.map((m) => m.L) };
      const solve = (A: number[]) => cases.map((c) => { const f: V3[] = Array.from({ length: nodes.length }, (_, i) => [...(c[i] ?? [0, 0, 0])] as V3); grown.members.forEach((m, e) => { const w = (mt.strut.density * A[e]! * m.L * g) / 2; f[m.a]![1] -= w; f[m.b]![1] -= w; }); return truss(KG, A, mt.strut.E, held, f); });
      let least = grown.members.map(() => 0), picks = grown.members.map((m, e) => sectionFor(grown.N.map((Nk) => Nk[e]!), m.L, mt.strut, mt.sections));
      let runs = solve(picks.map((p) => p.section.A));
      for (let it = 0; it < 8; it++) {
        const next = grown.members.map((m, e) => sectionFor(runs.map((r) => r.N[e]!), m.L, mt.strut, mt.sections, Math.max(least[e]!, picks[e]!.section.A)));
        const changed = next.some((p, e) => p.section !== picks[e]!.section); picks = next; runs = solve(picks.map((p) => p.section.A)); if (!changed) break;
      }
      const reachOf = (j: number) => Math.min(...[...held].map((h) => Math.hypot(nodes[j]![0] - nodes[h]![0], nodes[j]![2] - nodes[h]![2]))), allow = (j: number) => Math.max(2 * reachOf(j), cell) / 250;
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
      const ok = grown.mechanisms === 0 && struts.every((x) => x.margin >= 1) && sag.every((x) => x.most <= x.allowed) && runs.every((r) => r.converged);
      return { matter: mt, nodes, struts, held: [...held].filter((h) => struts.some((x) => x.a === h || x.b === h)), loaded, mass, mechanisms: grown.mechanisms, sag, ok, grownMass: grown.mass, rounds: grown.rounds };
    };
    // grown on all the ground; then, as a bone gives up what it does not use, the struts doing least (what they carry
    // times how long they are) are taken away a few at a time, the rest grown again as their loads find new ways, and
    // made again of what can be had: the lightest made that holds and is no mechanism is kept (evolutionary structural
    // optimisation, Xie and Steven, Comput. Struct. 49, 1993)
    let edges = G.edges.map((_, e) => e), start: number[] | undefined, best: MadeFrame | null = null, since = 0;
    const needed = new Set<number>(), planar = nodes.every((p) => Math.abs(p[2] - nodes[0]![2]) < 1e-12);
    const loadedSet = new Set(loaded);
    const groundMech = (es: number[]) => { const ms = mergeChains(nodes, es.map((e) => ({ a: G.edges[e]![0], b: G.edges[e]![1], A: 1, L: G.len[e]! })), held, loadedSet), used = [...new Set(ms.flatMap((m) => [m.a, m.b]))], at = new Map(used.map((j, i) => [j, i])); return count({ dim: planar ? 2 : 3, nodes: used.map((j) => (planar ? [nodes[j]![0], nodes[j]![1]] : nodes[j]!)), bars: ms.map((m) => [at.get(m.a)!, at.get(m.b)!] as [number, number]), held: used.filter((j) => held.has(j)).map((j) => at.get(j)!) }).mechanisms + (loaded.some((j) => !used.includes(j)) ? 1 : 0); };
    for (let round = 0; round < 60 && edges.length > 0; round++) {
      const Gs: Graph = { nodes, edges: edges.map((e) => G.edges[e]!), len: edges.map((e) => G.len[e]!) };
      const grown = growFrame(Gs, mt.strut, held, cases, { g, rounds: start ? 40 : 120, ...(start ? { start } : {}) });
      const made = make(grown);
      if (!best || (made.ok && (!best.ok || made.mass < best.mass)) || (!made.ok && !best.ok && made.mass < best.mass)) { best = made; since = 0; } else since++;
      if (since >= 8) break;
      // from here on, only what still carries: the struts withered to nothing are gone from the ground
      const live = grown.keptEdges; edges = live.map((e) => edges[e]!); const GA = live.map((e) => grown.A[e]!);
      const Gl: Graph = { nodes, edges: edges.map((e) => G.edges[e]!), len: edges.map((e) => G.len[e]!) };
      // what each carries times its length, the most under any load
      const N = cases.map((c) => truss(Gl, GA, mt.strut.E, held, Array.from({ length: nodes.length }, (_, i) => c[i] ?? [0, 0, 0]) as V3[]).N);
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
        const cut = new Set<number>(), most = Math.max(1, Math.floor(list.length * 0.1)); let taken = 0;
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
