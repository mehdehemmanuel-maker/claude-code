// Exact rationals on BigInt (the kernel, spec 10, T23; research 31 B1.2). Every number the kernel decides with is one of
// these: a float is read exactly (a double is a dyadic rational), a decimal text exactly; nothing is rounded but where
// the caller asks for it, and then by a stated direction (down or up), so an interval stays an enclosure.

export interface Rat { readonly n: bigint; readonly d: bigint }

const abs = (x: bigint): bigint => (x < 0n ? -x : x);
function gcd(a: bigint, b: bigint): bigint { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }

/** n / d in lowest terms, the sign on the numerator. A zero denominator is refused. */
export function rat(n: bigint, d = 1n): Rat {
  if (d === 0n) throw new KernelError('malformed', 'a zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d) || 1n; return { n: n / g, d: d / g };
}
export const ZERO = rat(0n), ONE = rat(1n), TWO = rat(2n), HALF = rat(1n, 2n);

export const add = (a: Rat, b: Rat): Rat => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rat, b: Rat): Rat => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d);
export const div = (a: Rat, b: Rat): Rat => { if (b.n === 0n) throw new KernelError('undecided', 'a division by zero'); return rat(a.n * b.d, a.d * b.n); };
export const neg = (a: Rat): Rat => ({ n: -a.n, d: a.d });
export const absR = (a: Rat): Rat => ({ n: abs(a.n), d: a.d });
export const cmp = (a: Rat, b: Rat): number => { const x = a.n * b.d - b.n * a.d; return x < 0n ? -1 : x > 0n ? 1 : 0; };
export const lt = (a: Rat, b: Rat): boolean => cmp(a, b) < 0, le = (a: Rat, b: Rat): boolean => cmp(a, b) <= 0;
export const minR = (a: Rat, b: Rat): Rat => (le(a, b) ? a : b), maxR = (a: Rat, b: Rat): Rat => (le(a, b) ? b : a);
export const sign = (a: Rat): number => (a.n < 0n ? -1 : a.n > 0n ? 1 : 0);
export function powInt(a: Rat, k: number): Rat {
  if (!Number.isInteger(k)) throw new KernelError('malformed', 'a power that is not a whole number');
  if (k < 0) return div(ONE, powInt(a, -k));
  let r = ONE, b = a, e = k; while (e > 0) { if (e & 1) r = mul(r, b); b = mul(b, b); e >>= 1; } return r;
}
export const pow2 = (k: number): Rat => (k >= 0 ? rat(1n << BigInt(k)) : rat(1n, 1n << BigInt(-k)));

/** A double, exactly: its sign, exponent and fraction read from its bits. NaN and the infinities are refused. */
export function fromDouble(x: number): Rat {
  if (typeof x !== 'number' || x !== x || x === Infinity || x === -Infinity) throw new KernelError('malformed', `not a finite number: ${String(x)}`);
  const v = new DataView(new ArrayBuffer(8)); v.setFloat64(0, x);
  const hi = v.getUint32(0), lo = v.getUint32(4), s = hi >>> 31 ? -1n : 1n, e = (hi >>> 20) & 0x7ff;
  const frac = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  const mant = e === 0 ? frac : frac | (1n << 52n), exp = (e === 0 ? 1 : e) - 1075;
  return exp >= 0 ? rat(s * (mant << BigInt(exp))) : rat(s * mant, 1n << BigInt(-exp));
}

/** A decimal ("-1.25e-3"), a fraction ("3/4") or a whole number, exactly; anything else is refused. */
export function fromText(t: string): Rat {
  const f = /^(-?\d+)\/(\d+)$/.exec(t); if (f) return rat(BigInt(f[1]!), BigInt(f[2]!));
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(t);
  if (!m || t.length > 400) throw new KernelError('malformed', `not a number the kernel reads: ${t.slice(0, 40)}`);
  const digits = BigInt(`${m[2]}${m[3] ?? ''}`), e = Number(m[4] ?? 0) - (m[3]?.length ?? 0);
  if (Math_abs(e) > 4000) throw new KernelError('malformed', 'an exponent too large');
  const r = e >= 0 ? rat(digits * 10n ** BigInt(e)) : rat(digits, 10n ** BigInt(-e));
  return m[1] ? neg(r) : r;
}
const Math_abs = (x: number): number => (x < 0 ? -x : x);

/** The number of bits in a positive BigInt. */
export function bits(x: bigint): number { x = abs(x); let n = 0; while (x > 0n) { x >>= 1n; n++; } return n; }
/** Rounded to `p` significant bits, down or up: the enclosure kept, the size bounded. */
export function roundTo(a: Rat, p: number, up: boolean): Rat {
  if (a.n === 0n) return a;
  const shift = p - (bits(a.n) - bits(a.d)); // scale so the quotient has about p bits
  const num = shift >= 0 ? a.n << BigInt(shift) : a.n, den = shift >= 0 ? a.d : a.d << BigInt(-shift);
  let q = num / den; const r = num % den;
  if (r !== 0n) { if (up && num > 0n) q += 1n; if (!up && num < 0n) q -= 1n; }
  return shift >= 0 ? rat(q, 1n << BigInt(shift)) : rat(q << BigInt(-shift));
}
/** Approximately, for printing only: the kernel never decides with it. */
export function toNumber(a: Rat): number { const s = bits(a.n) - bits(a.d) - 60; return s >= 0 ? Number(a.n / (a.d << BigInt(s))) * 2 ** s : Number((a.n << BigInt(-s)) / a.d) * 2 ** s; }
export const text = (a: Rat): string => (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`);

/** Why the kernel refused: the claim is wrong; it cannot decide it; or the certificate is not one it reads. */
export class KernelError extends Error {
  constructor(readonly refused: 'wrong' | 'undecided' | 'malformed', why: string) { super(why); }
}
