// Dimensions, decided exactly (the kernel, spec 10, T23; research 31 B1.4): six exponents (mass, length, time, current,
// temperature, amount) as rationals, so a square root halves them exactly. The unit table is data (`units.json`, each
// unit's dimension as `src/ganglia/units.ts` gives it; the gate fails if they differ), named in every certificate that
// leans on it. Angle is dimensionless, as decision 0009 keeps it.

import UNITS from './units.json';
import { KernelError, ZERO, add, fromText, mul, neg, rat, cmp, type Rat } from './rat';

export type Dim = readonly Rat[];
export const DIMLESS: Dim = [ZERO, ZERO, ZERO, ZERO, ZERO, ZERO];
const TABLE = UNITS as unknown as Record<string, number[]>;
export const sameDim = (a: Dim, b: Dim): boolean => a.every((x, i) => cmp(x, b[i]!) === 0);
export const mulDim = (a: Dim, b: Dim): Dim => a.map((x, i) => add(x, b[i]!));
export const divDim = (a: Dim, b: Dim): Dim => a.map((x, i) => add(x, neg(b[i]!)));
export const powDim = (a: Dim, k: Rat): Dim => a.map((x) => mul(x, k));
export const isDimless = (a: Dim): boolean => sameDim(a, DIMLESS);
export const dimText = (a: Dim): string => `[${a.map((x) => (x.d === 1n ? `${x.n}` : `${x.n}/${x.d}`)).join(', ')}]`;

/** One factor, "m^2" or "s^-1" or "K": its unit from the table, raised to its power. */
function factor(tok: string): Dim {
  const m = /^([^\^\s/]+)(?:\^(-?\d+(?:\.\d+)?|-?\d+\/\d+))?$/.exec(tok);
  if (!m) throw new KernelError('malformed', `not a unit factor: ${tok.slice(0, 30)}`);
  const row = Object.prototype.hasOwnProperty.call(TABLE, m[1]!) ? TABLE[m[1]!] : undefined;
  if (!row || row.length !== 6) throw new KernelError('undecided', `a unit not in the kernel's table: ${m[1]!.slice(0, 20)}`);
  return powDim(row.map((x) => rat(BigInt(x))), m[2] ? fromText(m[2]) : rat(1n));
}
/** A unit as the laws write it: factors by spaces or "·", all after the first "/" below the line ("W/m^2 K"). */
export function dimOfUnit(unit: string): Dim {
  if (typeof unit !== 'string' || unit.length > 80) throw new KernelError('malformed', 'a unit that is not a short text');
  const [num, ...rest] = unit.replace(/·/g, ' ').trim().split('/');
  let d = DIMLESS;
  for (const t of (num ?? '').trim().split(/\s+/).filter(Boolean)) d = mulDim(d, factor(t));
  for (const t of rest.join(' ').trim().split(/\s+/).filter(Boolean)) d = divDim(d, factor(t));
  return d;
}
