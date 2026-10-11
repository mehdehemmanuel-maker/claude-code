// Dimension: the type of every quantity. Exponents of mass, length, time, current and temperature (the kept algebra
// in ganglia/units.ts); units are conventions for writing a dimension and a scale, never a type of their own.

import { DIMLESS, parseUnit, sameDim, type Dim } from '../../ganglia/units';

export type { Dim };
export { DIMLESS, sameDim };

/** The dimension a unit is written in (`N`, `m/s^2`, `kg m^2`, `-`). */
export const dimOf = (unit: string): Dim => parseUnit(unit).dim;
/** The factor that takes a value written in `unit` to SI. */
export const scaleOf = (unit: string): number => parseUnit(unit).scale;
export const mulDim = (a: Dim, b: Dim): Dim => a.map((x, i) => x + b[i]!) as Dim;
export const divDim = (a: Dim, b: Dim): Dim => a.map((x, i) => x - b[i]!) as Dim;
export const powDim = (a: Dim, k: number): Dim => a.map((x) => x * k) as Dim;
export const isDimless = (a: Dim) => sameDim(a, DIMLESS);

const BASE = ['kg', 'm', 's', 'A', 'K'];
/** A dimension written in base units: `kg m^2 s^-2`; `1` when dimensionless. */
export function dimText(d: Dim): string {
  const parts = d.map((e, i) => (e === 0 ? '' : e === 1 ? BASE[i]! : `${BASE[i]}^${Number.isInteger(e) ? e : e.toFixed(2)}`)).filter(Boolean);
  return parts.length ? parts.join(' ') : '1';
}

/** Dimensional nonsense is refused at construction: it is not a value that can exist. */
export class DimensionError extends Error {
  constructor(message: string) { super(message); this.name = 'DimensionError'; }
}

// ---- Buckingham: the dimensionless groups of a set of quantities, from their dimensions alone --------------------

interface Frac { n: number; d: number }
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const frac = (n: number, d = 1): Frac => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
const fsub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const fmul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
const fdiv = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);

/**
 * The integer exponent vectors k with Σ k_i · dim_i = 0: every independent dimensionless product of the given
 * quantities (the null space of their dimension matrix, over the rationals, scaled to integers). For (ρ, v, L, μ)
 * it is the one vector (1, 1, 1, -1): the Reynolds number, found without being told its name.
 */
export function piGroups(dims: Dim[]): number[][] {
  // rows: base dimensions; columns: quantities
  return integerNullSpace([0, 1, 2, 3, 4].map((r) => dims.map((d) => d[r]!)));
}

/**
 * The integer vectors k with Σ_j M[r][j] k_j = 0 for every row r: the null space of a matrix over the rationals, each
 * basis vector scaled to integers with its first nonzero entry positive. One algebra, two readings: over dimensions it
 * gives the dimensionless groups; over what a transformation conserves it gives the balanced transformations.
 */
function reduce(rows: number[][], columns?: number) {
  // with no rows, nothing is constrained: every vector is in the null space
  const n = rows[0]?.length ?? columns ?? 0, R = rows.length;
  const M: Frac[][] = rows.map((row) => row.map((x) => frac(Math.round(x * 1e6), 1e6)));
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < n && row < R; col++) {
    let p = -1;
    for (let r = row; r < R; r++) if (M[r]![col]!.n !== 0) { p = r; break; }
    if (p < 0) continue;
    [M[row], M[p]] = [M[p]!, M[row]!];
    const pv = M[row]![col]!;
    M[row] = M[row]!.map((x) => fdiv(x, pv));
    for (let r = 0; r < R; r++) {
      if (r === row || M[r]![col]!.n === 0) continue;
      const f = M[r]![col]!;
      M[r] = M[r]!.map((x, c) => fsub(x, fmul(f, M[row]![c]!)));
    }
    pivots.push(col);
    row++;
  }
  return { n, M, pivots, free: [...Array(n).keys()].filter((c) => !pivots.includes(c)) };
}

/** The null vector with the free variables set as given, scaled to the smallest integers with its first nonzero entry positive. */
function vectorAt(r: ReturnType<typeof reduce>, values: Map<number, number>): number[] | null {
  const k: Frac[] = Array.from({ length: r.n }, () => frac(0));
  for (const [f, x] of values) k[f] = frac(x);
  r.pivots.forEach((pc, row) => { let acc = frac(0); for (const [f, x] of values) acc = fsub(acc, fmul(r.M[row]![f]!, frac(x))); k[pc] = acc; });
  const lcm = k.reduce((l, x) => (l * x.d) / gcd(l, x.d), 1);
  let ints = k.map((x) => (x.n * lcm) / x.d);
  const g = ints.reduce((acc, x) => gcd(acc, Math.abs(x)), 0);
  if (!g) return null;
  ints = ints.map((x) => x / g || 0);
  const first = ints.find((x) => x !== 0)!;
  return first < 0 ? ints.map((x) => -x || 0) : ints;
}

/**
 * The integer vectors k with Σ_j M[r][j] k_j = 0 for every row r: the null space of a matrix over the rationals, each
 * basis vector scaled to integers with its first nonzero entry positive. One algebra, two readings: over dimensions it
 * gives the dimensionless groups; over what a transformation conserves it gives the balanced transformations.
 */
export function integerNullSpace(rows: number[][], columns?: number): number[][] {
  const r = reduce(rows, columns);
  return r.free.map((f) => vectorAt(r, new Map([[f, 1]]))!);
}

/**
 * Every integer null vector whose free variables lie within ±range, smallest first by the sum of their magnitudes:
 * every vector of the null space is some assignment of its free variables, so the smallest ones are found by
 * enumerating them, not by combining an arbitrarily scaled basis.
 */
export function integerNullVectors(rows: number[][], columns: number, range: number): number[][] {
  const r = reduce(rows, columns);
  const out = new Map<string, number[]>();
  const vals = new Array<number>(r.free.length).fill(-range);
  const total = (2 * range + 1) ** r.free.length;
  for (let i = 0; i < total; i++) {
    let v = i;
    for (let j = 0; j < r.free.length; j++) { vals[j] = (v % (2 * range + 1)) - range; v = Math.floor(v / (2 * range + 1)); }
    if (vals.every((x) => x === 0)) continue;
    const k = vectorAt(r, new Map(r.free.map((f, j) => [f, vals[j]!])));
    if (k) out.set(k.join(','), k);
  }
  return [...out.values()].sort((a, b) => a.reduce((s, x) => s + Math.abs(x), 0) - b.reduce((s, x) => s + Math.abs(x), 0));
}
