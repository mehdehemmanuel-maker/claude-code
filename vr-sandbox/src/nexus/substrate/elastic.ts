// The elastic realization: the beam's elastic line integrated numerically. A second realization of the same
// configuration, independent of the closed-form laws (it solves the moment and deflection boundary value problems
// on a grid, not the superposition formulas), with a contract whose error it measures itself by refining its grid.
// It observes the sag the rigid-body kernel cannot; it does not realize contact, settling or fracture, and says so.

import { resolution, type Resolution } from './domain';
import { evaluate, measurement, ofLeaf, type Derivation, type Window } from '../lang/evaluate';
import type { Frame } from './field';
import { div, leaf, variable, type Leaf } from '../lang/term';

export interface ElasticContract {
  name: string;
  /** Cells across the span. */
  cells: Derivation;
  /** Grounds of the method's error: second order in the cell; measured per run by refinement. */
  order: Derivation;
  unrealized: { what: string; because: string }[];
  hash: string;
}

export function elasticContract(): ElasticContract {
  const cells = ofLeaf(leaf('cells across the span', 240, '1', { class: 'configuration', source: 'the elastic realization: 240 cells put 20 across a 0.1 m patch on a 1.2 m span' }));
  const order = ofLeaf(leaf('order of the method', 2, '1', { class: 'configuration', source: 'central differences: the error falls as the square of the cell' }));
  const unrealized = [
    { what: 'contact, settling and rocking', because: 'the elastic line has pinned ends by assumption: it does not know how the beam sits on anything' },
    { what: 'fracture and yield', because: 'the material is linear elastic without limit; strength is checked by the derivation, not realized here' },
  ];
  return { name: 'elastic line (Euler–Bernoulli), central differences', cells, order, unrealized, hash: [cells.hash, order.hash].join('.') };
}

export interface ElasticInputs {
  frame: Frame;
  /** Load P over a central patch w; self weight q per length over the total length Lt; span L between pinned supports. */
  P: Derivation; w: Derivation; q: Derivation; L: Derivation; Lt: Derivation; E: Derivation; I: Derivation;
}

export interface ElasticRealization {
  contract: ElasticContract;
  resolution: Resolution;
  window: Window;
  /** The bending moment and the deflection as the realization samples them: at the cells, as fields the kernel can be asked at any seam. */
  moments: { station: Derivation; moment: Derivation }[];
  sag: Derivation;
  reactions: [Derivation, Derivation];
  /** The error the realization measured on itself: the change of the sag on halving the cell. */
  error: Derivation;
  /** The moment as a field the realization offers (an interpolation of its samples, for comparison at any x). */
  momentAt(x: number): number;
  sagAt(x: number): number;
}

const val = (d: Derivation, what: string) => { if (d.value === null) throw new Error(`${what}: ${d.name} has no value (${d.status})`); return d.value; };

/** Thomas: solve a tridiagonal system with constant off-diagonals 1 and diagonal -2, Dirichlet ends. */
function solveSecond(rhs: number[], left: number, right: number, h: number): number[] {
  // (y[i-1] - 2 y[i] + y[i+1]) / h^2 = rhs[i], y[0] = left, y[n] = right
  const n = rhs.length - 1;
  const y = new Array<number>(n + 1).fill(0);
  y[0] = left; y[n] = right;
  const m = n - 1;
  if (m < 1) return y;
  const a = new Array<number>(m).fill(1), b = new Array<number>(m).fill(-2), c = new Array<number>(m).fill(1), d = new Array<number>(m);
  for (let i = 1; i <= m; i++) d[i - 1] = rhs[i]! * h * h;
  d[0]! -= left; d[m - 1]! -= right;
  for (let i = 1; i < m; i++) { const f = a[i]! / b[i - 1]!; b[i]! -= f * c[i - 1]!; d[i]! -= f * d[i - 1]!; }
  const x = new Array<number>(m);
  x[m - 1] = d[m - 1]! / b[m - 1]!;
  for (let i = m - 2; i >= 0; i--) x[i] = (d[i]! - c[i]! * x[i + 1]!) / b[i]!;
  for (let i = 0; i < m; i++) y[i + 1] = x[i]!;
  return y;
}

/** Integrate the elastic line on N cells: M'' = −w(x) with the overhang's hogging moments at the ends; u'' = −M/(EI) with u = 0 at the ends. */
function integrate(N: number, P: number, w: number, q: number, L: number, Lt: number, EI: number) {
  const h = L / N, c = (Lt - L) / 2;
  const x = Array.from({ length: N + 1 }, (_, i) => -L / 2 + i * h);
  // distributed load, downward positive: the patch P/w over |x| <= w/2 (cell-averaged), plus q everywhere
  const load = x.map((xi) => { const lo = Math.max(xi - h / 2, -w / 2), hi = Math.min(xi + h / 2, w / 2); const share = Math.max(0, hi - lo) / h; return q + (P / w) * share; });
  const Mend = -(q * c * c) / 2;
  const M = solveSecond(load.map((l) => -l), Mend, Mend, h);
  const u = solveSecond(M.map((m) => -m / EI), 0, 0, h);
  // reactions: the shear at the ends (M' = V, sagging moment positive), second-order one-sided; the overhang's own weight rests on the support too
  const R1 = (-3 * M[0]! + 4 * M[1]! - M[2]!) / (2 * h) + q * c, R2 = -(3 * M[N]! - 4 * M[N - 1]! + M[N - 2]!) / (2 * h) + q * c;
  const interp = (ys: number[], xx: number) => {
    const i = Math.min(N - 1, Math.max(0, Math.floor((xx - x[0]!) / h)));
    const t = (xx - x[i]!) / h;
    return ys[i]! * (1 - t) + ys[i + 1]! * t;
  };
  return { x, M, u, R1, R2, h, momentAt: (xx: number) => interp(M, xx), sagAt: (xx: number) => interp(u, xx) };
}

export function realizeElastic(c: ElasticContract, inp: ElasticInputs, instrument = c.name): ElasticRealization {
  const P = val(inp.P, 'P'), w = val(inp.w, 'w'), q = val(inp.q, 'q'), L = val(inp.L, 'L'), Lt = val(inp.Lt, 'Lt'), EI = val(inp.E, 'E') * val(inp.I, 'I');
  const N = Math.round(val(c.cells, 'cells'));
  const fine = integrate(2 * N, P, w, q, L, Lt, EI), coarseRun = integrate(N, P, w, q, L, Lt, EI);
  const sagFine = fine.u[N]!, sagCoarse = coarseRun.u[N / 2]!;
  // every observable's error is measured on the realization itself: the change on halving the cell
  const err = Math.abs(sagFine - sagCoarse);
  const errR = Math.max(Math.abs(fine.R1 - coarseRun.R1), Math.abs(fine.R2 - coarseRun.R2));
  const window: Window = { tick: 0, seconds: 0, instrument };
  const mk = (name: string, value: number, unit: string, origin: Leaf['origin'], u?: number) => leaf(name, value, unit, origin, u);
  const error = ofLeaf(leaf('discretization error of the sag, measured by halving the cell', err, 'm', { class: 'measured', source: `${c.name}: |δ(2N) − δ(N)| at N = ${N}` }));
  const cell = evaluate('cell of the grid', div(variable('L', 'm'), variable('n', '1')), { L: inp.L, n: c.cells }, { unit: 'm', law: 'the span over the number of cells' });
  const res = resolution(c.name, { x: cell }, { x: cell }, ['t']);
  const sag = measurement('mid-span sag', sagFine, 'm', { instrument: `${c.name}: the elastic line at mid-span on ${2 * N} cells`, window, uncertainty: err }, mk);
  const reactions: [Derivation, Derivation] = [
    measurement('reaction at the left support', fine.R1, 'N', { instrument: `${c.name}: the shear at the end, error by halving the cell`, window, uncertainty: errR }, mk),
    measurement('reaction at the right support', fine.R2, 'N', { instrument: `${c.name}: the shear at the end, error by halving the cell`, window, uncertainty: errR }, mk),
  ];
  const momentAt = fine.momentAt, sagAt = fine.sagAt;
  const moments = fine.x.filter((_, i) => i % Math.max(1, Math.round((2 * N) / 12)) === 0 && i > 0 && i < 2 * N).map((xx, j) => ({
    station: ofLeaf(leaf(`cell ${j} of the elastic grid`, xx, 'm', { class: 'configuration', source: `${c.name}: a node of its grid` })),
    moment: measurement(`bending moment at x = ${xx.toFixed(3)} m`, momentAt(xx), 'N m', { instrument: `${c.name}: the moment line, error by halving the cell`, window, uncertainty: Math.abs(fine.momentAt(xx) - coarseRun.momentAt(xx)) }, mk),
  }));
  return { contract: c, resolution: res, window, moments, sag, reactions, error, momentAt, sagAt };
}


// ---- a cantilever: fixed at the root, free at the tip ---------------------------------------------------------------

export interface CantileverInputs {
  frame: Frame;
  /** Load P over a patch of width w centred at reach a from the root; self weight q per length over the arm's length ℓ. */
  P: Derivation; a: Derivation; w: Derivation; q: Derivation; ell: Derivation; E: Derivation; I: Derivation;
}

export interface CantileverRealization {
  contract: ElasticContract;
  resolution: Resolution;
  window: Window;
  rootMoment: Derivation;
  rootShear: Derivation;
  tipSag: Derivation;
  error: Derivation;
  sagAt(x: number): number;
  momentAt(x: number): number;
}

/** Statics from the tip inward (shear and moment by integration of the load), then the elastic line from the root outward. */
function integrateCantilever(N: number, P: number, a: number, w: number, q: number, ell: number, EI: number) {
  const h = ell / N;
  const x = Array.from({ length: N + 1 }, (_, i) => i * h);
  // the load on each cell, exactly: self weight and the patch's overlap with the cell
  const cellLoad = (i: number) => { const lo = Math.max(x[i]!, a - w / 2), hi = Math.min(x[i + 1]!, a + w / 2); return q * h + (P / w) * Math.max(0, hi - lo); };
  // V(x) = load beyond x (exact for piecewise-constant load); M(x) = ∫_x^ℓ V (hogging, taken positive), V linear on a cell so the trapezoid is exact there
  const V = new Array<number>(N + 1).fill(0), M = new Array<number>(N + 1).fill(0);
  for (let i = N - 1; i >= 0; i--) { V[i] = V[i + 1]! + cellLoad(i); M[i] = M[i + 1]! + ((V[i]! + V[i + 1]!) / 2) * h; }
  // u'' = M / EI with u(0) = u'(0) = 0, downward positive, by the trapezoid from the root
  const s = new Array<number>(N + 1).fill(0), u = new Array<number>(N + 1).fill(0);
  for (let i = 1; i <= N; i++) { s[i] = s[i - 1]! + ((M[i - 1]! + M[i]!) / (2 * EI)) * h; u[i] = u[i - 1]! + ((s[i - 1]! + s[i]!) / 2) * h; }
  const interp = (ys: number[], xx: number) => { const i = Math.min(N - 1, Math.max(0, Math.floor(xx / h))); const t = (xx - x[i]!) / h; return ys[i]! * (1 - t) + ys[i + 1]! * t; };
  return { x, V, M, u, h, sagAt: (xx: number) => interp(u, xx), momentAt: (xx: number) => interp(M, xx) };
}

export function realizeCantilever(c: ElasticContract, inp: CantileverInputs, instrument = `${c.name}, cantilever`): CantileverRealization {
  const P = val(inp.P, 'P'), a = val(inp.a, 'a'), w = val(inp.w, 'w'), q = val(inp.q, 'q'), ell = val(inp.ell, 'ell'), EI = val(inp.E, 'E') * val(inp.I, 'I');
  const N = Math.round(val(c.cells, 'cells'));
  const fine = integrateCantilever(2 * N, P, a, w, q, ell, EI), coarseRun = integrateCantilever(N, P, a, w, q, ell, EI);
  const err = Math.abs(fine.u[2 * N]! - coarseRun.u[N]!);
  const errM = Math.abs(fine.M[0]! - coarseRun.M[0]!), errV = Math.abs(fine.V[0]! - coarseRun.V[0]!);
  const window: Window = { tick: 0, seconds: 0, instrument };
  const mk = (name: string, value: number, unit: string, origin: Leaf['origin'], u?: number) => leaf(name, value, unit, origin, u);
  const cell = evaluate('cell of the grid', div(variable('L', 'm'), variable('n', '1')), { L: inp.ell, n: c.cells }, { unit: 'm', law: 'the arm over the number of cells' });
  const res = resolution(instrument, { x: cell }, { x: cell }, ['t']);
  return {
    contract: c, resolution: res, window,
    rootMoment: measurement('root moment', fine.M[0]!, 'N m', { instrument: `${instrument}: the moment at the root, error by halving the cell`, window, uncertainty: errM }, mk),
    rootShear: measurement('root shear', fine.V[0]!, 'N', { instrument: `${instrument}: the shear at the root, error by halving the cell`, window, uncertainty: errV }, mk),
    tipSag: measurement('tip sag', fine.u[2 * N]!, 'm', { instrument: `${instrument}: the elastic line at the tip on ${2 * N} cells`, window, uncertainty: err }, mk),
    error: ofLeaf(leaf('discretization error of the tip sag, measured by halving the cell', err, 'm', { class: 'measured', source: `${instrument}: |δ(2N) − δ(N)| at N = ${N}` })),
    sagAt: fine.sagAt, momentAt: fine.momentAt,
  };
}
