// Finding the math herself. The laws in the ganglia came from people; this is how Ego finds one without them, from
// what she measures in her own world, the way a law is found in the first place:
//
//   1. dimensions: a law can't depend on how big the metre or the second is, so it can only relate dimensionless
//      groups of what it involves (Buckingham's Π theorem). The groups are the null space of the quantities'
//      dimension matrix: from their units alone she knows, before measuring, what can and can't matter (a pendulum's
//      mass can't set its period: no other quantity cancels its kilograms).
//   2. measurement: the groups' values over many runs, fitted by least squares in logs as a power law. What stays
//      is a constant and the powers, with how well they fit; a power near zero says that group doesn't matter.
//   3. comparison: what she found against what her ganglia were told, so a law she was given is checked by one she
//      found, and a disagreement is a finding.
//
// Nothing here assumes the answer. It finds the form a law must take and lets the measurements say the rest.

import { parseUnit, type Dim } from './units';

export interface Quantity { sym: string; unit: string; name?: string }

/** A dimensionless group: each quantity's power in it. */
export interface Group { powers: Record<string, number>; says: string }

/** The nearest simple fraction (denominator at most 12): physics' powers are small rationals. */
function rational(x: number): [number, number] {
  let best: [number, number] = [Math.round(x), 1], err = Math.abs(x - Math.round(x));
  for (let q = 2; q <= 12; q++) {
    const p = Math.round(x * q);
    if (Math.abs(x - p / q) < err - 1e-12) { best = [p, q]; err = Math.abs(x - p / q); }
  }
  return best;
}

const power = (sym: string, e: number) => {
  if (Math.abs(e) < 1e-12) return '';
  const [p, q] = rational(e);
  return q === 1 ? (p === 1 ? sym : `${sym}^${p}`) : `${sym}^(${p}/${q})`;
};

export const sayGroup = (powers: Record<string, number>) => Object.entries(powers).map(([s, e]) => power(s, e)).filter(Boolean).join(' ') || '1';

/**
 * The dimensionless groups a set of quantities can form, the target's first and with the target to the first power
 * in it alone (so the law can be solved for it). Quantities whose dimensions nothing else cancels appear in no group:
 * they can't matter.
 */
export function groups(qs: Quantity[], target: string): Group[] {
  const cols = [...qs.filter((q) => q.sym !== target), ...qs.filter((q) => q.sym === target)];
  const dims = cols.map((q) => parseUnit(q.unit).dim);
  const rows = 5, n = cols.length;
  const A = Array.from({ length: rows }, (_, i) => dims.map((d: Dim) => d[i]!));
  // reduced row echelon form
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < n && r < rows; c++) {
    let best = r;
    for (let i = r + 1; i < rows; i++) if (Math.abs(A[i]![c]!) > Math.abs(A[best]![c]!)) best = i;
    if (Math.abs(A[best]![c]!) < 1e-12) continue;
    [A[r], A[best]] = [A[best]!, A[r]!];
    const pv = A[r]![c]!;
    for (let j = 0; j < n; j++) A[r]![j]! /= pv;
    for (let i = 0; i < rows; i++) if (i !== r && Math.abs(A[i]![c]!) > 0) { const f = A[i]![c]!; for (let j = 0; j < n; j++) A[i]![j]! -= f * A[r]![j]!; }
    pivots.push(c);
    r++;
  }
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  const out: Group[] = free.map((f) => {
    const powers: Record<string, number> = {};
    powers[cols[f]!.sym] = 1;
    pivots.forEach((pc, i) => { const e = -A[i]![f]!; if (Math.abs(e) > 1e-12) powers[cols[pc]!.sym] = rational(e)[0] / rational(e)[1]; });
    return { powers, says: sayGroup(powers) };
  });
  // the target's group first
  return out.sort((a, b) => Number(target in b.powers) - Number(target in a.powers));
}

/** Quantities that appear in no group: their dimensions can't be cancelled, so they can't matter. */
export const dropped = (qs: Quantity[], gs: Group[]) => qs.map((q) => q.sym).filter((s) => !gs.some((g) => s in g.powers));

const groupValue = (g: Group, x: Record<string, number>) => Object.entries(g.powers).reduce((v, [s, e]) => v * x[s]! ** e, 1);

/** Least squares by the normal equations (small systems: a constant and a few powers). */
function leastSquares(X: number[][], y: number[]): number[] {
  const k = X[0]!.length;
  const M = Array.from({ length: k }, () => new Array(k + 1).fill(0) as number[]);
  for (let i = 0; i < X.length; i++) for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) M[a]![b]! += X[i]![a]! * X[i]![b]!;
    M[a]![k]! += X[i]![a]! * y[i]!;
  }
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let i = c + 1; i < k; i++) if (Math.abs(M[i]![c]!) > Math.abs(M[p]![c]!)) p = i;
    [M[c], M[p]] = [M[p]!, M[c]!];
    if (Math.abs(M[c]![c]!) < 1e-300) continue;
    for (let i = 0; i < k; i++) if (i !== c) { const f = M[i]![c]! / M[c]![c]!; for (let j = c; j <= k; j++) M[i]![j]! -= f * M[c]![j]!; }
  }
  return M.map((row, i) => (Math.abs(row[i]!) < 1e-300 ? 0 : row[k]! / row[i]!));
}

export interface Discovery {
  target: string;
  groups: Group[];
  dropped: string[];
  /** The target's group = C × (each other group)^power. */
  C: number;
  powers: number[];
  /** How well it fits: R² in logs (1 when the target's group is a constant, judged by its spread instead), and the spread of the target's group about the fit (relative). */
  r2: number;
  spread: number;
  /** Each quantity's power in the target, solved out. */
  law: Record<string, number>;
  says: string;
}

/** Find the law a target obeys, from measurements of it and what it might depend on. */
export function discover(samples: Record<string, number>[], qs: Quantity[], target: string): Discovery {
  const gs = groups(qs, target);
  const lost = dropped(qs, gs);
  const [main, ...rest] = gs;
  if (!main || !(target in main.powers)) throw new Error(`${target} forms no dimensionless group with the rest: something it depends on is missing from what was measured`);
  const y = samples.map((s) => Math.log(groupValue(main, s)));
  const X = samples.map((s) => [1, ...rest.map((g) => Math.log(groupValue(g, s)))]);
  const beta = leastSquares(X, y);
  const fit = X.map((row) => row.reduce((a, x, i) => a + x * beta[i]!, 0));
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  const ssr = y.reduce((a, v, i) => a + (v - fit[i]!) ** 2, 0), sst = y.reduce((a, v) => a + (v - mean) ** 2, 0);
  const spread = Math.sqrt(ssr / Math.max(1, y.length - beta.length));
  const C = Math.exp(beta[0]!), powers = beta.slice(1);
  // solve for the target: main = target · ∏ x^e, so target = C ∏ group_i^p_i ∏ x^(−e)
  const law: Record<string, number> = {};
  for (const [s, e] of Object.entries(main.powers)) if (s !== target) law[s] = (law[s] ?? 0) - e;
  rest.forEach((g, i) => { for (const [s, e] of Object.entries(g.powers)) law[s] = (law[s] ?? 0) + powers[i]! * e; });
  for (const s of Object.keys(law)) if (Math.abs(law[s]!) < 1e-9) delete law[s];
  const shown = Object.entries(law).map(([s, e]) => {
    const [p, q] = rational(e);
    return Math.abs(e - p / q) < 0.02 ? power(s, p / q) : `${s}^${e.toFixed(3)}`;
  }).filter(Boolean).join(' ');
  const r2 = sst > 1e-18 ? 1 - ssr / sst : 1;
  const says = `${target} = ${C.toPrecision(4)} ${shown}`.trim()
    + `${lost.length ? `; ${lost.join(', ')} can't matter (nothing else cancels ${lost.length > 1 ? 'their' : 'its'} units)` : ''}`
    + `${rest.length ? `; fitted over ${samples.length} measurements, R² ${r2.toFixed(4)}` : `; ${samples.length} measurements agree to ${(spread * 100).toPrecision(2)}%`}`;
  return { target, groups: gs, dropped: lost, C, powers, r2, spread, law, says };
}
