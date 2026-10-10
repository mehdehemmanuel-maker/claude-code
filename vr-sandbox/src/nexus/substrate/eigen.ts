// Bound states as eigenvalues (docs/NEXUS-FROM-REALITY.md, section 25). Two bodies held by an attraction −M/r^k, with
// reduced mass μ = m₁m₂/(m₁+m₂), have the energies the operator −(ħ²/2μ)∇² − M/r^k allows: the energy of motion is
// p²/2μ with p = −iħ∇ (the kinetic energy of the kept mechanics, with momentum as the operator the quantum of action
// makes it), and the attraction is the coupling's own. A stationary state is an eigenfunction, and the energies are its
// eigenvalues. Nothing here is about one atom: the attraction's power and strength and the two masses are all it reads.
//
// In the units the operator itself sets, a = (ħ²/(μM))^(1/(2−k)) and ε = ħ²/(μa²), the problem is the same for every
// pair with one power k: −½u'' + (l(l+1)/2x² − 1/x^k) u = e u, with u(0) = 0 and u → 0 far out (u = r ψ). Its
// eigenvalues e are pure numbers, solved once for each power and angular momentum, and every pair's energies are
// e · ε. Dimensions gave the scale a and ε before; the operator gives the number in front, the factor dimensions could
// not see (½ for the Coulomb ground state).
//
// The radial operator is discretized on a uniform grid (second differences), which makes it a symmetric tridiagonal
// matrix. Its eigenvalues are found by bisection on the Sturm count (how many pivots of T − λ are negative is how many
// eigenvalues lie below λ), and the eigenfunction by inverse iteration. Two grids, h and h/2, are combined by
// Richardson's rule (the error of second differences goes as h²), and the box is sized to the state's own decay.

/** The lowest eigenvalue and the size of its state for −½u'' + (l(l+1)/2x² − 1/x^k)u = e u, in the operator's own units. */
export interface Eigen { k: number; l: number; nodes: number; e: number; peak: number; mean: number }

const cache = new Map<string, Eigen>();

/** How many eigenvalues of the symmetric tridiagonal matrix (diagonal d, off-diagonal o) lie below λ. */
function sturm(d: Float64Array, o: number, lambda: number): number {
  let count = 0, q = d[0]! - lambda;
  if (q < 0) count++;
  for (let i = 1; i < d.length; i++) {
    q = d[i]! - lambda - (o * o) / (q === 0 ? 1e-300 : q);
    if (q < 0) count++;
  }
  return count;
}

/** The eigenvalue with `index` eigenvalues below it, by bisection between lo and hi. */
function bisect(d: Float64Array, o: number, index: number, lo: number, hi: number): number {
  for (let it = 0; it < 200 && hi - lo > 1e-15 * Math.max(1, Math.abs(lo)); it++) {
    const mid = (lo + hi) / 2;
    if (sturm(d, o, mid) > index) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/** The eigenfunction for an eigenvalue, by inverse iteration (a tridiagonal solve, three times). */
function vector(d: Float64Array, o: number, lambda: number): Float64Array {
  const n = d.length;
  let y = new Float64Array(n).fill(1);
  const shift = lambda + 1e-10 * Math.max(1, Math.abs(lambda));
  for (let it = 0; it < 4; it++) {
    // Thomas algorithm on (T − shift) x = y
    const c = new Float64Array(n), z = new Float64Array(n);
    let b = d[0]! - shift;
    c[0] = o / b; z[0] = y[0]! / b;
    for (let i = 1; i < n; i++) {
      b = d[i]! - shift - o * c[i - 1]!;
      c[i] = o / b;
      z[i] = (y[i]! - o * z[i - 1]!) / b;
    }
    const x = new Float64Array(n);
    x[n - 1] = z[n - 1]!;
    for (let i = n - 2; i >= 0; i--) x[i] = z[i]! - c[i]! * x[i + 1]!;
    let norm = 0;
    for (let i = 0; i < n; i++) norm += x[i]! * x[i]!;
    norm = Math.sqrt(norm);
    for (let i = 0; i < n; i++) x[i] = x[i]! / norm;
    y = x;
  }
  return y;
}

/** One grid: the eigenvalue with `nodes` nodes, where its state peaks, and its mean radius. */
function onGrid(k: number, l: number, nodes: number, X: number, N: number): { e: number; peak: number; mean: number } {
  const h = X / (N + 1), d = new Float64Array(N);
  for (let i = 0; i < N; i++) { const x = (i + 1) * h; d[i] = 1 / (h * h) + (l * (l + 1)) / (2 * x * x) - 1 / x ** k; }
  const o = -1 / (2 * h * h);
  // Gershgorin bounds every eigenvalue
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) { lo = Math.min(lo, d[i]! - 2 * Math.abs(o)); hi = Math.max(hi, d[i]! + 2 * Math.abs(o)); }
  const e = bisect(d, o, nodes, lo, hi);
  const u = vector(d, o, e);
  let best = 0;
  for (let i = 1; i < N; i++) if (u[i]! * u[i]! > u[best]! * u[best]!) best = i;
  // the peak of u² between grid points: the vertex of the parabola through the three around the largest
  const at = (i: number) => u[Math.max(0, Math.min(N - 1, i))]! ** 2;
  const [ym, y0, yp] = [at(best - 1), at(best), at(best + 1)];
  const off = ym - 2 * y0 + yp === 0 ? 0 : (0.5 * (ym - yp)) / (ym - 2 * y0 + yp);
  const peak = (best + 1 + off) * h;
  let mean = 0;
  for (let i = 0; i < N; i++) mean += (i + 1) * h * u[i]! * u[i]!;
  return { e, peak, mean };
}

/**
 * The bound state of −½u'' + (l(l+1)/2x² − 1/x^k)u = e u with `nodes` nodes (0: the ground state of that l), for
 * 0 < k < 2: an attraction that falls off more slowly than the motion's 1/x² holds states, a faster one does not.
 * The box grows until the eigenvalue no longer feels it, and two grids are combined by Richardson's rule.
 */
export function boundState(k: number, l = 0, nodes = 0): Eigen | null {
  if (!(k > 0 && k < 2)) return null;
  const key = `${k}|${l}|${nodes}`;
  const was = cache.get(key);
  if (was) return was;
  // the state's size in its own units grows with its nodes and its l; start the box well past it and grow it
  let X = 30 * (1 + nodes + l) ** 2, prev: number | null = null, out: Eigen | null = null;
  for (let grow = 0; grow < 6; grow++) {
    const N = Math.round(X * 120);
    const coarse = onGrid(k, l, nodes, X, N), fine = onGrid(k, l, nodes, X, 2 * N + 1);
    const e = (4 * fine.e - coarse.e) / 3, peak = (4 * fine.peak - coarse.peak) / 3, mean = (4 * fine.mean - coarse.mean) / 3;
    if (!(e < 0)) return null;
    out = { k, l, nodes, e, peak, mean };
    if (prev !== null && Math.abs(e - prev) < 1e-9 * Math.abs(e)) break;
    prev = e; X *= 1.6;
  }
  cache.set(key, out!);
  return out;
}
