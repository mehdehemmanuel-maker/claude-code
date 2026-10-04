// Dimension: the type of every quantity. Exponents of mass, length, time, current and temperature (the kept algebra
// in ganglia/units.ts); units are conventions for writing a dimension and a scale, never a type of their own.

import { DIMLESS, parseUnit, sameDim, type Dim } from '../ganglia/units';

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
  const n = dims.length;
  // rows: base dimensions; columns: quantities
  const M: Frac[][] = [];
  for (let r = 0; r < 5; r++) M.push(dims.map((d) => frac(Math.round(d[r]! * 1e6), 1e6)));
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < n && row < 5; col++) {
    let p = -1;
    for (let r = row; r < 5; r++) if (M[r]![col]!.n !== 0) { p = r; break; }
    if (p < 0) continue;
    [M[row], M[p]] = [M[p]!, M[row]!];
    const pv = M[row]![col]!;
    M[row] = M[row]!.map((x) => fdiv(x, pv));
    for (let r = 0; r < 5; r++) {
      if (r === row || M[r]![col]!.n === 0) continue;
      const f = M[r]![col]!;
      M[r] = M[r]!.map((x, c) => fsub(x, fmul(f, M[row]![c]!)));
    }
    pivots.push(col);
    row++;
  }
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  const groups: number[][] = [];
  for (const f of free) {
    const k: Frac[] = Array.from({ length: n }, () => frac(0));
    k[f] = frac(1);
    pivots.forEach((pc, r) => { k[pc] = frac(-M[r]![f]!.n, M[r]![f]!.d); });
    const lcm = k.reduce((l, x) => (l * x.d) / gcd(l, x.d), 1);
    const ints = k.map((x) => (x.n * lcm) / x.d).map((x) => (x === 0 ? 0 : x));
    const first = ints.find((x) => x !== 0) ?? 1;
    groups.push(first < 0 ? ints.map((x) => (x === 0 ? 0 : -x)) : ints);
  }
  return groups;
}
