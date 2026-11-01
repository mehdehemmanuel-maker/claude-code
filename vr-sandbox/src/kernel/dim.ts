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
// (a unit is letters, digits and a few signs, its factors parted by plain spaces or "·", one "/" at most with something on
// each side; "1" and "-" only alone. Anything else, an invisible character among them, is refused: the red team, 2026-11-01,
// hid a zero-width character inside "mN" and the kernel read it as "m N", an energy)
const UNIT_TEXT = /^[\p{L}\p{N}%°^·./ -]+$/u;
export function dimOfUnit(unit: string): Dim {
  if (typeof unit !== 'string' || unit.length > 80 || !UNIT_TEXT.test(unit)) throw new KernelError('malformed', 'a unit that is not a short text of letters, digits and unit signs');
  const parts = unit.replace(/·/g, ' ').split('/');
  if (parts.length > 2 || parts.some((p) => !p.trim())) throw new KernelError('malformed', `not a unit: ${unit.slice(0, 30)}`);
  const num = parts[0]!.trim().split(/ +/), den = parts[1]?.trim().split(/ +/) ?? [];
  // ("1" alone over something is a per: 1/s)
  if (den.some((t) => t === '1' || t === '-') || (num.length > 1 && num.some((t) => t === '1' || t === '-')) || (den.length && num[0] === '-')) throw new KernelError('malformed', `"1" or "-" in a product: ${unit.slice(0, 30)}`);
  let d = DIMLESS;
  for (const t of num) d = mulDim(d, factor(t));
  for (const t of den) d = divDim(d, factor(t));
  return d;
}
