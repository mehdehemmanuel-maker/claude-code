// One numeric layer (docs/REALITY.md, step 1): finding a root, an integral, a derivative and a path through time, each
// by a method chosen and to a tolerance set, and each answering with whether it converged, how many steps it took, the
// error it estimates and what to beware of: never a number alone. The laws solved backwards, the rate of return, the
// integrals in terms and the stepped loops call these; the nodes math.root, math.integrate, math.derivative and
// math.ode put them on a board.
//
// Methods, from: Brent, Algorithms for Minimization without Derivatives, Prentice-Hall 1973, ch. 4 (the root);
// Press, Teukolsky, Vetterling & Flannery, Numerical Recipes, 3rd ed., Cambridge 2007, §4.5 (Gauss–Legendre), §5.7
// (Ridders' derivative), §17.2 (Dormand–Prince), §17.5 (stiff systems); Burden & Faires, Numerical Analysis, 9th ed.,
// 2011, §4.6 (adaptive Simpson).

/** What a numeric answer comes with. */
export interface Found {
  value: number | null;
  converged: boolean;
  /** Steps of the method (bisections, panels doubled, time steps taken). */
  iterations: number;
  /** Times the function was worked out. */
  evaluations: number;
  /** The error it estimates, in the answer's unit (for a root: the bracket's half-width or the last step). */
  error: number;
  method: string;
  /** What to beware of: it ran out of steps, the function was not finite, the step was near its stable limit. */
  warning?: string;
}
export interface Tolerance {
  /** Relative tolerance on the answer. */
  tol?: number;
  /** Absolute tolerance on the answer (for an answer near zero). */
  atol?: number;
  /** The most steps it may take. */
  most?: number;
}

const said = (r: Found, unit = '') => r.value === null ? `no answer by ${r.method}${r.warning ? `: ${r.warning}` : ''}` : `${+r.value.toPrecision(10)}${unit ? ` ${unit}` : ''} ± ${r.error.toPrecision(2)} by ${r.method}, ${r.converged ? 'converged' : 'NOT converged'} in ${r.iterations} steps (${r.evaluations} evaluations)${r.warning ? `; ${r.warning}` : ''}`;
/** A numeric answer in words. */
export const saysFound = said;

// ---- roots ----------------------------------------------------------------------------------------------------------
export const ROOT_METHODS = ['brent', 'bisection', 'newton', 'secant'] as const;
export type RootMethod = (typeof ROOT_METHODS)[number];
export interface RootOptions extends Tolerance {
  method?: RootMethod;
  /** Where the answer lies: the function changes sign between them. Bisection and Brent need it; Newton and the secant
   *  start from its middle (or `guess`) and are kept inside it when it is given. */
  bracket?: [number, number];
  guess?: number;
  /** Close enough when |f| is at most this (absolute, in f's unit). */
  ftol?: number;
}

/** Where f is zero. */
export function root(f: (x: number) => number, o: RootOptions = {}): Found {
  const method = o.method ?? 'brent', tol = o.tol ?? 1e-12, atol = o.atol ?? 0, ftol = o.ftol ?? 0, most = o.most ?? 200;
  let evaluations = 0;
  const F = (x: number) => { evaluations++; return f(x); };
  const fail = (warning: string, iterations = 0): Found => ({ value: null, converged: false, iterations, evaluations, error: Infinity, method, warning });
  const close = (dx: number, x: number) => dx <= tol * Math.abs(x) || dx <= atol;
  if (method === 'bisection' || method === 'brent') {
    if (!o.bracket) return fail('it needs a bracket where f changes sign');
    let [a, b] = o.bracket, fa = F(a), fb = F(b);
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) return fail('f is not finite at an end of the bracket');
    if (fa === 0) return { value: a, converged: true, iterations: 0, evaluations, error: 0, method };
    if (fb === 0) return { value: b, converged: true, iterations: 0, evaluations, error: 0, method };
    if (fa * fb > 0) return fail(`f does not change sign between ${a} and ${b}`);
    if (method === 'bisection') {
      for (let i = 1; i <= most; i++) {
        const m = (a + b) / 2, fm = F(m);
        if (!Number.isFinite(fm)) return fail(`f is not finite at ${m}`, i);
        if (Math.abs(fm) <= ftol || close(b - a, m)) return { value: m, converged: true, iterations: i, evaluations, error: Math.abs(b - a) / 2, method };
        if (fm * fa < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
      }
      return { value: (a + b) / 2, converged: false, iterations: most, evaluations, error: Math.abs(b - a) / 2, method, warning: `ran out of steps (${most})` };
    }
    // Brent: inverse quadratic interpolation, the secant, and bisection when they would not shrink the bracket enough
    let c = a, fc = fa, d = b - a, e = d;
    for (let i = 1; i <= most; i++) {
      if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
      if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
      const t1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * Math.max(tol * Math.abs(b), atol), m = 0.5 * (c - b);
      if (Math.abs(m) <= t1 || fb === 0 || Math.abs(fb) <= ftol) return { value: b, converged: true, iterations: i, evaluations, error: Math.abs(m), method };
      if (Math.abs(e) >= t1 && Math.abs(fa) > Math.abs(fb)) {
        const s = fb / fa; let p: number, q: number;
        if (a === c) { p = 2 * m * s; q = 1 - s; }
        else { const qq = fa / fc, r = fb / fc; p = s * (2 * m * qq * (qq - r) - (b - a) * (r - 1)); q = (qq - 1) * (r - 1) * (s - 1); }
        if (p > 0) q = -q; else p = -p;
        if (2 * p < Math.min(3 * m * q - Math.abs(t1 * q), Math.abs(e * q))) { e = d; d = p / q; } else { d = m; e = m; }
      } else { d = m; e = m; }
      a = b; fa = fb;
      b += Math.abs(d) > t1 ? d : m > 0 ? t1 : -t1;
      fb = F(b);
      if (!Number.isFinite(fb)) return fail(`f is not finite at ${b}`, i);
    }
    return { value: b, converged: false, iterations: most, evaluations, error: Math.abs(c - b) / 2, method, warning: `ran out of steps (${most})` };
  }
  // Newton (its slope by central differences) and the secant: fast near the root, kept inside a bracket when one is given
  const [lo, hi] = o.bracket ?? [-Infinity, Infinity];
  let x = o.guess ?? (o.bracket ? (lo + hi) / 2 : 0), fx = F(x), xPrev = x + Math.max(1e-4 * Math.abs(x), 1e-4), fPrev = method === 'secant' ? F(xPrev) : NaN, warning: string | undefined;
  for (let i = 1; i <= most; i++) {
    if (!Number.isFinite(fx)) return fail(`f is not finite at ${x}`, i);
    if (Math.abs(fx) <= ftol && ftol > 0) return { value: x, converged: true, iterations: i - 1, evaluations, error: 0, method };
    let slope: number;
    if (method === 'newton') { const h = Math.cbrt(Number.EPSILON) * Math.max(Math.abs(x), 1); slope = (F(x + h) - F(x - h)) / (2 * h); }
    else slope = (fx - fPrev) / (x - xPrev);
    if (!Number.isFinite(slope) || slope === 0) return fail(`its slope is ${slope} at ${x}: it cannot step`, i);
    let next = x - fx / slope;
    if (next < lo || next > hi) { next = Math.min(hi, Math.max(lo, next)); warning = 'a step left the bracket and was held to its edge'; }
    const dx = Math.abs(next - x);
    xPrev = x; fPrev = fx; x = next; fx = F(x);
    if (close(dx, x) || fx === 0) return { value: x, converged: true, iterations: i, evaluations, error: dx, method, ...(warning ? { warning } : {}) };
  }
  return { value: x, converged: false, iterations: most, evaluations, error: Math.abs(x - xPrev), method, warning: `ran out of steps (${most})` };
}

/**
 * Where f changes sign, found without a guess: f sampled at ±10^k for k from −40 to 40 in half-decades, and at the edge
 * of where f is finite (an arcsine past 1, a root of a negative), found by halving, so a root there is not missed.
 * Every bracket found is returned, best first: positive ones before negative (most quantities are positive), each
 * nearest `near` on a log scale first. More than one means more than one value solves it.
 */
export function bracketsOf(f: (x: number) => number, near = 1): [number, number][] {
  const xs: number[] = [];
  for (let k = -80; k <= 80; k++) xs.push(10 ** (k / 2));
  const grid = [...xs.map((x) => -x).reverse(), 0, ...xs], pts: { x: number; v: number }[] = [];
  let prev: { x: number; v: number } | null = null;
  for (const x of grid) {
    const v = f(x), here = { x, v };
    // between a finite sample and one that is not, find where f stops being finite and sample just inside it
    if (prev && Number.isFinite(prev.v) !== Number.isFinite(v)) {
      let inside = Number.isFinite(prev.v) ? prev.x : x, outside = inside === x ? prev.x : x;
      for (let i = 0; i < 80; i++) { const m = (inside + outside) / 2; if (Number.isFinite(f(m))) inside = m; else outside = m; }
      const edge = inside, ev = f(edge);
      if (Number.isFinite(ev)) pts.push({ x: edge, v: ev });
    }
    if (Number.isFinite(v)) pts.push(here);
    prev = here;
  }
  pts.sort((p, q) => p.x - q.x);
  const found: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1];
    if (a.v === 0) found.push([a.x, a.x]); else if (b && a.v * b.v < 0) found.push([a.x, b.x]);
  }
  const far = (r: [number, number]) => { const m = Math.abs((r[0] + r[1]) / 2); return m === 0 ? 1e9 : Math.abs(Math.log10(m) - Math.log10(Math.max(Math.abs(near), 1e-300))); };
  return found.sort((p, q) => (p[0] >= 0 ? 0 : 1) - (q[0] >= 0 ? 0 : 1) || far(p) - far(q));
}

// ---- integrals ------------------------------------------------------------------------------------------------------
export const INTEGRAL_METHODS = ['adaptive-simpson', 'gauss-legendre', 'simpson'] as const;
export type IntegralMethod = (typeof INTEGRAL_METHODS)[number];
export interface IntegralOptions extends Tolerance {
  method?: IntegralMethod;
  /** For Simpson's rule: its panels (each two intervals). */
  panels?: number;
}

/** Composite Simpson's rule over n panels (2n intervals): null when f is unknown at a node, NaN when it is not finite
 *  there. The rule the binders of a term use. */
export function simpsonRule(f: (x: number) => number | null, a: number, b: number, n: number): number | null {
  const h = (b - a) / (2 * n);
  let s = 0;
  for (let i = 0; i <= 2 * n; i++) {
    const v = f(a + i * h);
    if (v === null) return null;
    if (!Number.isFinite(v)) return NaN;
    s += (i === 0 || i === 2 * n ? 1 : i % 2 ? 4 : 2) * v;
  }
  return (s * h) / 3;
}

// five-point Gauss–Legendre nodes and weights on [-1, 1]
const GL_X = [0, 0.5384693101056831, 0.9061798459386640], GL_W = [0.5688888888888889, 0.4786286704993665, 0.2369268850561891];
function gauss5(f: (x: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n; let s = 0;
  for (let k = 0; k < n; k++) {
    const m = a + (k + 0.5) * h, r = h / 2;
    s += GL_W[0]! * f(m);
    for (let j = 1; j < 3; j++) s += GL_W[j]! * (f(m - r * GL_X[j]!) + f(m + r * GL_X[j]!));
  }
  return (s * h) / 2;
}

/** The integral of f from a to b. */
export function integrate(f: (x: number) => number, a: number, b: number, o: IntegralOptions = {}): Found {
  const method = o.method ?? 'adaptive-simpson', tol = o.tol ?? 1e-10, atol = o.atol ?? 1e-14, most = o.most ?? 50;
  let evaluations = 0, warning: string | undefined;
  const F = (x: number) => { evaluations++; const v = f(x); if (!Number.isFinite(v) && !warning) warning = `f is not finite at ${x}`; return v; };
  if (a === b) return { value: 0, converged: true, iterations: 0, evaluations, error: 0, method };
  const done = (value: number, converged: boolean, iterations: number, error: number, w = warning): Found =>
    // a function not finite where it was sampled has no integral there to converge to, whatever the sums did
    Number.isFinite(value) ? { value, converged: converged && !warning, iterations, evaluations, error, method, ...(w ? { warning: w } : {}) } : { value: null, converged: false, iterations, evaluations, error: Infinity, method, warning: w ?? 'not finite' };
  if (method === 'simpson') {
    const n = Math.max(1, Math.round(o.panels ?? 64)), s = simpsonRule(F, a, b, n)!, half = simpsonRule(F, a, b, Math.max(1, n >> 1))!;
    const err = Math.abs(s - half) / 15;
    return done(s, err <= Math.max(tol * Math.abs(s), atol), 1, err);
  }
  if (method === 'gauss-legendre') {
    let n = 1, prev = gauss5(F, a, b, n);
    for (let i = 1; i <= most; i++) {
      n *= 2; const s = gauss5(F, a, b, n), err = Math.abs(s - prev);
      if (!Number.isFinite(s)) return done(s, false, i, Infinity);
      if (err <= Math.max(tol * Math.abs(s), atol)) return done(s, true, i, err);
      prev = s; if (n > 1 << 16) return done(s, false, i, err, 'the panels reached their most (65 536) before the tolerance');
    }
    return done(prev, false, most, Infinity, `ran out of steps (${most})`);
  }
  // adaptive Simpson: halve where the halves disagree, to the depth `most`; Richardson's correction on each piece
  let pieces = 0, worst = 0, capped = false;
  const rec = (x0: number, x1: number, f0: number, fm: number, f1: number, whole: number, eps: number, depth: number): number => {
    const m = (x0 + x1) / 2, lm = (x0 + m) / 2, rm = (m + x1) / 2, flm = F(lm), frm = F(rm);
    const left = ((m - x0) / 6) * (f0 + 4 * flm + fm), right = ((x1 - m) / 6) * (fm + 4 * frm + f1), d = left + right - whole;
    if (depth >= most || Math.abs(d) <= 15 * eps || !Number.isFinite(d)) { pieces++; if (depth >= most && Math.abs(d) > 15 * eps) capped = true; worst += Math.abs(d) / 15; return left + right + d / 15; }
    return rec(x0, m, f0, flm, fm, left, eps / 2, depth + 1) + rec(m, x1, fm, frm, f1, right, eps / 2, depth + 1);
  };
  const f0 = F(a), f1 = F(b), fm = F((a + b) / 2), whole = ((b - a) / 6) * (f0 + 4 * fm + f1);
  const first = Math.abs(whole), s = rec(a, b, f0, fm, f1, whole, Math.max(tol * first, atol), 0);
  return done(s, !capped && worst <= Math.max(tol * Math.abs(s), atol) * 10, pieces, worst, capped ? `some pieces reached the most depth (${most}) before the tolerance` : warning);
}

// ---- derivatives ----------------------------------------------------------------------------------------------------
export const DERIVATIVE_METHODS = ['richardson', 'central'] as const;
export type DerivativeMethod = (typeof DERIVATIVE_METHODS)[number];

/** The slope of f at x: central differences (one step, sized to the rounding of x), or Ridders' extrapolation of
 *  shrinking central differences with its error estimate. */
export function derivative(f: (x: number) => number, x: number, o: Tolerance & { method?: DerivativeMethod; step?: number } = {}): Found {
  const method = o.method ?? 'richardson';
  let evaluations = 0;
  const F = (t: number) => { evaluations++; return f(t); };
  if (method === 'central') {
    const h = o.step ?? Math.cbrt(Number.EPSILON) * Math.max(Math.abs(x), 1), v = (F(x + h) - F(x - h)) / (2 * h);
    // its truncation is about h² f‴/6 and its rounding about ε|f|/h; both said by the step and the size of f
    const err = Number.EPSILON * Math.max(Math.abs(F(x)), 1) / h + h * h * Math.abs(v);
    return Number.isFinite(v) ? { value: v, converged: true, iterations: 1, evaluations, error: err, method } : { value: null, converged: false, iterations: 1, evaluations, error: Infinity, method, warning: 'f is not finite near x' };
  }
  const most = o.most ?? 10, CON = 1.4, CON2 = CON * CON, SAFE = 2;
  let h = o.step ?? 0.1 * Math.max(Math.abs(x), 1);
  const a: number[][] = [[(F(x + h) - F(x - h)) / (2 * h)]];
  let best = a[0]![0]!, err = Infinity, i = 1;
  for (; i < most; i++) {
    h /= CON; a[i] = [(F(x + h) - F(x - h)) / (2 * h)];
    let fac = CON2;
    for (let j = 1; j <= i; j++) {
      a[i]![j] = (a[i]![j - 1]! * fac - a[i - 1]![j - 1]!) / (fac - 1); fac *= CON2;
      const e = Math.max(Math.abs(a[i]![j]! - a[i]![j - 1]!), Math.abs(a[i]![j]! - a[i - 1]![j - 1]!));
      if (e <= err) { err = e; best = a[i]![j]!; }
    }
    if (Math.abs(a[i]![i]! - a[i - 1]![i - 1]!) >= SAFE * err) break;
  }
  const tol = o.tol ?? 1e-8;
  if (!Number.isFinite(best)) return { value: null, converged: false, iterations: i, evaluations, error: Infinity, method, warning: 'f is not finite near x' };
  return { value: best, converged: err <= Math.max(tol * Math.abs(best), o.atol ?? 1e-12), iterations: i, evaluations, error: err, method };
}

// ---- paths through time ---------------------------------------------------------------------------------------------
export const ODE_METHODS = ['rk45', 'rk4', 'euler', 'backward-euler'] as const;
export type OdeMethod = (typeof ODE_METHODS)[number];
export type Rates = (t: number, y: readonly number[]) => number[];
export interface OdeOptions extends Tolerance {
  method?: OdeMethod;
  /** The step, s (fixed-step methods; the first try for rk45). */
  step?: number;
  /** For a fixed step: run again at half the step and say the difference (Richardson) as the error. */
  check?: boolean;
  /** Keep about this many points of the path. */
  keep?: number;
}
export interface Path extends Found { t: number[]; y: number[][]; final: number[]; rejected: number }

const axpy = (y: readonly number[], h: number, k: readonly number[]) => y.map((v, i) => v + h * k[i]!);
/** One step of a fixed-step method, from y at t over h. */
export function step(method: Exclude<OdeMethod, 'rk45'>, f: Rates, t: number, y: readonly number[], h: number): number[] {
  if (method === 'euler') return axpy(y, h, f(t, y));
  if (method === 'rk4') {
    const k1 = f(t, y), k2 = f(t + h / 2, axpy(y, h / 2, k1)), k3 = f(t + h / 2, axpy(y, h / 2, k2)), k4 = f(t + h, axpy(y, h, k3));
    return y.map((v, i) => v + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!));
  }
  // backward Euler: y1 = y + h f(t + h, y1), by Newton's method with a Jacobian by differences
  let z = axpy(y, h, f(t, y));
  for (let it = 0; it < 20; it++) {
    const fz = f(t + h, z), g = z.map((v, i) => v - y[i]! - h * fz[i]!), n = y.length;
    const J = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    for (let j = 0; j < n; j++) {
      const d = 1e-7 * Math.max(Math.abs(z[j]!), 1), zz = [...z]; zz[j]! += d; const fd = f(t + h, zz);
      for (let i = 0; i < n; i++) J[i]![j]! -= (h * (fd[i]! - fz[i]!)) / d;
    }
    const dz = solveLinear(J, g.map((v) => -v));
    if (!dz) break;
    z = z.map((v, i) => v + dz[i]!);
    if (Math.max(...dz.map((v, i) => Math.abs(v) / Math.max(Math.abs(z[i]!), 1))) < 1e-12) break;
  }
  return z;
}
/** A small dense system by Gaussian elimination with partial pivoting; null when singular. */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-300) return null;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = c + 1; r < n; r++) { const k = M[r]![c]! / M[c]![c]!; for (let j = c; j <= n; j++) M[r]![j]! -= k * M[c]![j]!; }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r]![n]!; for (let j = r + 1; j < n; j++) s -= M[r]![j]! * x[j]!; x[r] = s / M[r]![r]!; }
  return x;
}

/** A large sparse symmetric positive-definite system (a network's conductances: each row a junction's balance) by
 *  conjugate gradients, preconditioned by its diagonal: entries as row, column, value (both halves of a symmetric pair
 *  given), solved to a relative residual; with whether it converged, its steps and the residual it reached. */
export function solveSparseSPD(n: number, entries: [number, number, number][], b: number[], o: { tol?: number; maxSteps?: number } = {}): { x: number[]; converged: boolean; steps: number; residual: number } {
  const rows: [number, number][][] = Array.from({ length: n }, () => []), diag = new Array<number>(n).fill(0);
  for (const [i, j, v] of entries) { rows[i]!.push([j, v]); if (i === j) diag[i]! += v; }
  const mul = (x: number[]) => rows.map((r) => r.reduce((s, [j, v]) => s + v * x[j]!, 0)), dot = (a: number[], c: number[]) => a.reduce((s, v, i) => s + v * c[i]!, 0);
  const tol = o.tol ?? 1e-10, most = o.maxSteps ?? Math.max(100, 10 * n), x = new Array<number>(n).fill(0), bn = Math.sqrt(dot(b, b)) || 1;
  let r = [...b], z = r.map((v, i) => v / (diag[i] || 1)), p = [...z], rz = dot(r, z), k = 0, res = Math.sqrt(dot(r, r)) / bn;
  for (; k < most && res > tol; k++) {
    const q = mul(p), a = rz / (dot(p, q) || 1e-300);
    for (let i = 0; i < n; i++) { x[i]! += a * p[i]!; r[i]! -= a * q[i]!; }
    res = Math.sqrt(dot(r, r)) / bn; if (res <= tol) { k++; break; }
    z = r.map((v, i) => v / (diag[i] || 1)); const rz2 = dot(r, z), beta = rz2 / (rz || 1e-300); rz = rz2;
    p = z.map((v, i) => v + beta * p[i]!);
  }
  return { x, converged: res <= tol, steps: k, residual: res };
}

// Dormand–Prince 5(4) tableau
const DP_C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const DP_A = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9], [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729], [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656], [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]];
const DP_E = [71 / 57600, 0, -71 / 16695, 71 / 1920, -17253 / 339200, 22 / 525, -1 / 40];

/** The path of y′ = f(t, y) from y0 at t0 to t1. */
export function ode(f: Rates, y0: readonly number[], t0: number, t1: number, o: OdeOptions = {}): Path {
  const method = o.method ?? 'rk45', tol = o.tol ?? 1e-8, atol = o.atol ?? 1e-10, most = o.most ?? 100000, keep = o.keep ?? 200, span = t1 - t0;
  let evaluations = 0;
  const F: Rates = (t, y) => { evaluations++; return f(t, y); };
  const ts: number[] = [t0], ys: number[][] = [[...y0]], every = Math.abs(span) / keep;
  const finite = (y: readonly number[]) => y.every(Number.isFinite);
  const out = (final: number[], converged: boolean, iterations: number, error: number, rejected: number, warning?: string): Path =>
    ({ value: final[0] ?? null, final, t: ts, y: ys, converged, iterations, evaluations, error, rejected, method, ...(warning ? { warning } : {}) });
  if (span === 0) return out([...y0], true, 0, 0, 0);
  if (method !== 'rk45') {
    const run = (h: number, record: boolean) => {
      const n = Math.max(1, Math.ceil(Math.abs(span) / Math.abs(h))), dt = span / n;
      if (n > most) return { y: null as number[] | null, n, why: `it would take ${n} steps, more than the most (${most})` };
      let y = [...y0], next = every;
      for (let k = 1; k <= n; k++) {
        y = step(method, F, t0 + (k - 1) * dt, y, dt);
        if (!finite(y)) return { y: null, n: k, why: `it runs away (not finite) by t = ${+(t0 + k * dt).toPrecision(4)}: the step ${dt.toPrecision(3)} is too long for this system${method === 'backward-euler' ? '' : ' (try backward-euler for a stiff one)'}` };
        if (record && (Math.abs(k * dt) >= next - 1e-12 || k === n)) { ts.push(t0 + k * dt); ys.push(y); next += every; }
      }
      return { y, n, why: '' };
    };
    const h = o.step ?? span / 1000, a = run(h, true);
    if (!a.y) return out(ys[ys.length - 1]!, false, a.n, Infinity, 0, a.why);
    if (o.check === false) return out(a.y, true, a.n, NaN, 0, 'its error was not checked');
    const b = run(h / 2, false), p = method === 'rk4' ? 4 : 1;
    if (!b.y) return out(a.y, false, a.n, Infinity, 0, `at half the step: ${b.why}`);
    const err = Math.max(...a.y.map((v, i) => Math.abs(v - b.y![i]!) / (2 ** p - 1)));
    const scale = Math.max(...a.y.map((v) => tol * Math.abs(v) + atol));
    return out(a.y, err <= scale, a.n, err, 0, err > scale ? `its error (${err.toPrecision(2)}) is more than the tolerance: shorten the step` : undefined);
  }
  // Dormand–Prince with its step controlled by the embedded fourth-order error
  let t = t0, y = [...y0], h = o.step ?? span / 100, steps = 0, rejected = 0, next = every, worst = 0;
  const dir = Math.sign(span); h = dir * Math.abs(h);
  let k1 = F(t, y);
  while (dir * (t1 - t) > 1e-14 * Math.abs(span)) {
    if (steps + rejected >= most) return out(y, false, steps, worst, rejected, `ran out of steps (${most}) at t = ${+t.toPrecision(4)}`);
    if (dir * (t + h - t1) > 0) h = t1 - t;
    const k = [k1];
    for (let s = 1; s < 7; s++) k.push(F(t + DP_C[s]! * h, y.map((v, i) => v + h * DP_A[s]!.reduce((acc, a, j) => acc + a * k[j]![i]!, 0))));
    const yn = y.map((v, i) => v + h * DP_A[6]!.reduce((acc, a, j) => acc + a * k[j]![i]!, 0));
    const e = y.map((_, i) => h * DP_E.reduce((acc, a, j) => acc + a * k[j]![i]!, 0));
    const ratio = Math.sqrt(e.reduce((acc, v, i) => acc + (v / (atol + tol * Math.max(Math.abs(y[i]!), Math.abs(yn[i]!)))) ** 2, 0) / y.length);
    if (!finite(yn) || !Number.isFinite(ratio)) { h /= 4; rejected++; if (Math.abs(h) < 1e-14 * Math.abs(span)) return out(y, false, steps, Infinity, rejected, `it runs away (not finite) at t = ${+t.toPrecision(4)}`); continue; }
    if (ratio <= 1) {
      t += h; y = yn; k1 = k[6]!; steps++; worst = Math.max(worst, Math.max(...e.map(Math.abs)));
      if (dir * (t - t0) >= next - 1e-12 || dir * (t1 - t) <= 1e-14 * Math.abs(span)) { ts.push(t); ys.push(y); next += every; }
    } else rejected++;
    h *= Math.min(5, Math.max(0.2, 0.9 * ratio ** -0.2));
    if (Math.abs(h) < 1e-14 * Math.abs(span)) return out(y, false, steps, worst, rejected, `its step shrank to nothing at t = ${+t.toPrecision(4)}: the system is stiff or singular there (try backward-euler)`);
  }
  return out(y, true, steps, worst, rejected, rejected > steps ? `it rejected ${rejected} steps against ${steps} taken: the system may be stiff (backward-euler is made for that)` : undefined);
}

// ---- minimising a function of several numbers --------------------------------------------------------------------
/** Where f of several numbers is least, by the downhill simplex (Nelder & Mead, Comput. J. 7, 308 (1965); the standard
 *  coefficients, reflection 1, expansion 2, contraction 0.5, shrink 0.5, Numerical Recipes §10.5): no derivatives, so a
 *  function worked out by building and rendering a thing can be minimised. `step` is each number's first stride; it
 *  stops when the simplex's values agree to `ftol` (absolute) or after `most` evaluations. Each number may be held in a
 *  range (`lo`, `hi`): a point outside is moved to its edge. */
export type Minimum = { x: number[]; value: number; evaluations: number; converged: boolean };
export type MinOptions = { step?: number[]; ftol?: number; most?: number; lo?: number[]; hi?: number[] };
/** (the method once, as the points it asks to have weighed: driven by a function that answers at once, or by one that
 *  answers later, a board's run) */
function* simplex(x0: number[], o: MinOptions): Generator<number[], Minimum, number> {
  const n = x0.length, clampX = (x: number[]) => x.map((v, i) => Math.min(o.hi?.[i] ?? Infinity, Math.max(o.lo?.[i] ?? -Infinity, v)));
  let evals = 0; function* F(x: number[]): Generator<number[], number, number> { evals++; const v: number = yield x; return Number.isFinite(v) ? v : Infinity; }
  const pts = [clampX(x0)]; for (let i = 0; i < n; i++) { const p = x0.slice(); p[i] = p[i]! + (o.step?.[i] ?? (Math.abs(p[i]!) * 0.05 || 0.05)); pts.push(clampX(p)); }
  let vals: number[] = []; for (const p of pts) vals.push(yield* F(p)); const most = o.most ?? 200 * n, ftol = o.ftol ?? 1e-8;
  while (evals < most) {
    const ord = vals.map((v, i) => i).sort((a, b) => vals[a]! - vals[b]!); const P = ord.map((i) => pts[i]!), V = ord.map((i) => vals[i]!); pts.splice(0, pts.length, ...P); vals = V;
    if (Math.abs(vals[n]! - vals[0]!) <= ftol) return { x: pts[0]!, value: vals[0]!, evaluations: evals, converged: true };
    const c = Array.from({ length: n }, (_, j) => pts.slice(0, n).reduce((s, p) => s + p[j]!, 0) / n), at = (t: number) => clampX(c.map((cj, j) => cj + t * (pts[n]![j]! - cj)));
    const r = at(-1), fr = yield* F(r);
    if (fr < vals[0]!) { const e = at(-2), fe = yield* F(e); if (fe < fr) { pts[n] = e; vals[n] = fe; } else { pts[n] = r; vals[n] = fr; } }
    else if (fr < vals[n - 1]!) { pts[n] = r; vals[n] = fr; }
    else { const k = at(fr < vals[n]! ? -0.5 : 0.5), fk = yield* F(k); if (fk < Math.min(fr, vals[n]!)) { pts[n] = k; vals[n] = fk; } else { for (let i = 1; i <= n; i++) { pts[i] = clampX(pts[i]!.map((v, j) => pts[0]![j]! + 0.5 * (v - pts[0]![j]!))); vals[i] = yield* F(pts[i]!); } } }
  }
  const b = vals.indexOf(Math.min(...vals)); return { x: pts[b]!, value: vals[b]!, evaluations: evals, converged: false };
}
const drive = <R>(g: Generator<number[], R, number>, f: (x: number[]) => number): R => { let s = g.next(); while (!s.done) s = g.next(f(s.value)); return s.value; };
const driveAsync = async <R>(g: Generator<number[], R, number>, f: (x: number[]) => number | Promise<number>): Promise<R> => { let s = g.next(); while (!s.done) s = g.next(await f(s.value)); return s.value; };
export function minimize(f: (x: number[]) => number, x0: number[], o: MinOptions = {}): Minimum { return drive(simplex(x0, o), f); }
/** The same, for a function that answers later (a block run, a board). */
export function minimizeAsync(f: (x: number[]) => number | Promise<number>, x0: number[], o: MinOptions = {}): Promise<Minimum> { return driveAsync(simplex(x0, o), f); }

// ---- fitting figures, each with its ± ------------------------------------------------------------------------------
export interface Fit { x: number[]; before: number; after: number; pm: number[]; fixed: boolean[]; evaluations: number }
/** Figures moved to bring a cost down (Nelder–Mead within each one's range), and each one's ± after: how far it can move
 *  alone before the cost grows by `rise` (one where not said: a pixel, where the cost is in pixels; from the cost's
 *  curvature there). One the cost hardly moves with over its whole range is not fixed by what the cost sees. */
type FitOptions = { most?: number; x0?: number[]; ftol?: number; rise?: number };
function* fitting(keys: { x0: number; lo: number; hi: number; step: number }[], o: FitOptions): Generator<number[], Fit, number> {
  const x0 = o.x0 ?? keys.map((k) => k.x0), before: number = yield x0;
  const r = yield* simplex(x0, { step: keys.map((k) => k.step), lo: keys.map((k) => k.lo), hi: keys.map((k) => k.hi), most: o.most ?? 60, ftol: o.ftol ?? 0.05 });
  let evals = r.evaluations + 1; const best = r.value <= before ? r : { x: x0, value: before };
  const pm: number[] = [];
  for (let i = 0; i < keys.length; i++) { const k = keys[i]!, at = (d: number) => { const x = best.x.slice(); x[i] = Math.min(k.hi, Math.max(k.lo, x[i]! + d)); return x; };
    const up: number = yield at(k.step), dn: number = yield at(-k.step); evals += 2; const curv = (up + dn - 2 * best.value) / (k.step * k.step); pm.push(curv > 1e-15 ? Math.sqrt((2 * (o.rise ?? 1)) / curv) : Infinity); }
  return { x: best.x, before, after: best.value, pm, fixed: keys.map((k, i) => pm[i]! < (k.hi - k.lo) / 2), evaluations: evals };
}
export function fitBy(cost: (x: number[]) => number, keys: { x0: number; lo: number; hi: number; step: number }[], o: FitOptions = {}): Fit { return drive(fitting(keys, o), cost); }
export function fitByAsync(cost: (x: number[]) => number | Promise<number>, keys: { x0: number; lo: number; hi: number; step: number }[], o: FitOptions = {}): Promise<Fit> { return driveAsync(fitting(keys, o), cost); }

// ---- in batches: a minimiser that asks for many points at once, so they can be worked out side by side ------------------
/** A symmetric matrix's eigenvalues and eigenvectors (columns of V), by cyclic Jacobi rotations: exact to rounding for the
 *  small matrices a fit's covariance is. Golub & Van Loan, Matrix Computations, 4th ed., §8.5. */
export function eigenSym(A0: number[][]): { values: number[]; V: number[][] } {
  const n = A0.length, A = A0.map((r) => r.slice()), V: number[][] = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i]![j]! ** 2; if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p]![q]!; if (Math.abs(apq) < 1e-300) continue;
      const th = (A[q]![q]! - A[p]![p]!) / (2 * apq), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k]![p]!, akq = A[k]![q]!; A[k]![p] = c * akp - s * akq; A[k]![q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p]![k]!, aqk = A[q]![k]!; A[p]![k] = c * apk - s * aqk; A[q]![k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k]![p]!, vkq = V[k]![q]!; V[k]![p] = c * vkp - s * vkq; V[k]![q] = s * vkp + c * vkq; }
    }
  }
  return { values: A.map((r, i) => r[i]!), V };
}
export type BatchOptions = MinOptions & { /** points asked for at once (λ); at least 4 + ⌊3 ln n⌋ */ batch?: number; /** its first step, a share of each range */ sigma?: number; seed?: number };
/** CMA-ES (Hansen's covariance matrix adaptation evolution strategy): each round a batch of λ points drawn round its mean
 *  from a normal whose shape it learns from the best of the last ones, so the batch can be worked out side by side. Within
 *  lo..hi (each value scaled to its range; a point outside is worked out at the nearest inside, its distance outside
 *  added). Hansen, The CMA Evolution Strategy: A Tutorial, arXiv:1604.00772 (2016), its eqs. and default constants. */
function* cmaes(x0: number[], o: BatchOptions): Generator<number[][], Minimum, number[]> {
  const n = x0.length, lo = o.lo ?? x0.map((v) => v - 1), hi = o.hi ?? x0.map((v) => v + 1), span = lo.map((l, i) => hi[i]! - l || 1);
  const toX = (u: number[]) => u.map((v, i) => lo[i]! + span[i]! * v), clamp = (u: number[]) => u.map((v) => Math.min(1, Math.max(0, v)));
  const lam = Math.max(4 + Math.floor(3 * Math.log(n)), o.batch ?? 0), mu = Math.floor(lam / 2), w0 = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1)), ws = w0.reduce((a, b) => a + b, 0), w = w0.map((v) => v / ws), mueff = 1 / w.reduce((a, b) => a + b * b, 0);
  const cc = (4 + mueff / n) / (n + 4 + (2 * mueff) / n), cs = (mueff + 2) / (n + mueff + 5), c1 = 2 / ((n + 1.3) ** 2 + mueff), cmu = Math.min(1 - c1, (2 * (mueff - 2 + 1 / mueff)) / ((n + 2) ** 2 + mueff)), ds = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs, chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
  let m = clamp(x0.map((v, i) => (v - lo[i]!) / span[i]!)), sigma = o.sigma ?? 0.3, C: number[][] = m.map((_, i) => m.map((__, j) => (i === j ? 1 : 0))), pc = m.map(() => 0), ps = m.map(() => 0), evals = 0, g = 0;
  // (a seeded stream, so a fit is the same each time it is asked: mulberry32, and Box–Muller for its normals)
  let st = ((o.seed ?? 1) * 0x9e3779b9) >>> 0; const uni = () => { st = (st + 0x6d2b79f5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = () => Math.sqrt(-2 * Math.log(uni() || 1e-300)) * Math.cos(2 * Math.PI * uni());
  let best = { x: toX(m), value: Infinity }; const most = o.most ?? 100 * n * lam, ftol = o.ftol ?? 1e-8, hist: number[] = [];
  while (evals < most) {
    const { values, V } = eigenSym(C), D = values.map((v) => Math.sqrt(Math.max(v, 1e-20)));
    const ys = Array.from({ length: lam }, () => { const z = m.map(() => normal()); return m.map((_, i) => V[i]!.reduce((s, vij, j) => s + vij * D[j]! * z[j]!, 0)); });
    const us = ys.map((y) => m.map((mi, i) => mi + sigma * y[i]!)), inside = us.map(clamp);
    const f0 = yield inside.map(toX); evals += lam; g++;
    const f = f0.map((v, k) => (Number.isFinite(v) ? v : 1e300) + 1e3 * us[k]!.reduce((s, u, i) => s + (u - inside[k]![i]!) ** 2, 0));
    const ord = f.map((_, k) => k).sort((a, b) => f[a]! - f[b]!); if (f0[ord[0]!]! < best.value) best = { x: toX(inside[ord[0]!]!), value: f0[ord[0]!]! };
    const yw = m.map((_, i) => ord.slice(0, mu).reduce((s, k, r) => s + w[r]! * ys[k]![i]!, 0)); m = clamp(m.map((mi, i) => mi + sigma * yw[i]!));
    // (C^(-1/2) y_w = B D⁻¹ Bᵀ y_w)
    const bt = V[0]!.map((_, j) => V.reduce((s, row, i) => s + row[j]! * yw[i]!, 0)), cinv = m.map((_, i) => V[i]!.reduce((s, vij, j) => s + (vij * bt[j]!) / D[j]!, 0));
    ps = ps.map((p, i) => (1 - cs) * p + Math.sqrt(cs * (2 - cs) * mueff) * cinv[i]!);
    const psn = Math.hypot(...ps), hs = psn / Math.sqrt(1 - (1 - cs) ** (2 * g)) < (1.4 + 2 / (n + 1)) * chiN ? 1 : 0;
    pc = pc.map((p, i) => (1 - cc) * p + hs * Math.sqrt(cc * (2 - cc) * mueff) * yw[i]!);
    C = C.map((row, i) => row.map((cij, j) => (1 - c1 - cmu + (1 - hs) * c1 * cc * (2 - cc)) * cij + c1 * pc[i]! * pc[j]! + cmu * ord.slice(0, mu).reduce((s, k, r) => s + w[r]! * ys[k]![i]! * ys[k]![j]!, 0)));
    sigma *= Math.exp((cs / ds) * (psn / chiN - 1));
    hist.push(f[ord[0]!]!); const recent = hist.slice(-(10 + Math.ceil((30 * n) / lam)));
    if (sigma * Math.max(...D) < 1e-7 || (recent.length >= 10 + Math.ceil((30 * n) / lam) && Math.max(...recent) - Math.min(...recent) <= ftol)) return { x: best.x, value: best.value, evaluations: evals, converged: true };
  }
  return { x: best.x, value: best.value, evaluations: evals, converged: false };
}
const driveBatchAsync = async <R>(g: Generator<number[][], R, number[]>, f: (xs: number[][]) => Promise<number[]>): Promise<R> => { let s = g.next(); while (!s.done) s = g.next(await f(s.value)); return s.value; };
/** A minimum found by CMA-ES, every batch handed to `f` at once (to be worked out side by side: pool.ts). */
export function minimizeBatchAsync(f: (xs: number[][]) => Promise<number[]>, x0: number[], o: BatchOptions = {}): Promise<Minimum> { return driveBatchAsync(cmaes(x0, o), f); }
/** fitBy in batches: CMA-ES within the ranges, then each value's ± from the cost's curvature, its two sides for every value
 *  asked for at once. */
export async function fitByBatchAsync(costs: (xs: number[][]) => Promise<number[]>, keys: { x0: number; lo: number; hi: number; step: number }[], o: FitOptions & { batch?: number; seed?: number } = {}): Promise<Fit> {
  const x0 = o.x0 ?? keys.map((k) => k.x0), [before] = await costs([x0]);
  const r = await minimizeBatchAsync(costs, x0, { lo: keys.map((k) => k.lo), hi: keys.map((k) => k.hi), most: o.most ?? 60, ftol: o.ftol ?? 0.05, batch: o.batch, seed: o.seed, sigma: 0.25 });
  const best = r.value <= before! ? r : { x: x0, value: before! };
  const sides = keys.flatMap((k, i) => [k.step, -k.step].map((d) => { const x = best.x.slice(); x[i] = Math.min(k.hi, Math.max(k.lo, x[i]! + d)); return x; })), v = await costs(sides);
  const pm = keys.map((k, i) => { const curv = (v[2 * i]! + v[2 * i + 1]! - 2 * best.value) / (k.step * k.step); return curv > 1e-15 ? Math.sqrt((2 * (o.rise ?? 1)) / curv) : Infinity; });
  return { x: best.x, before: before!, after: best.value, pm, fixed: keys.map((k, i) => pm[i]! < (k.hi - k.lo) / 2), evaluations: r.evaluations + 1 + sides.length };
}
