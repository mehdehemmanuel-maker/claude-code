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
/** A whole power, exactly. The exponent is held to MAX_POWER either way (the red team, 2026-11-01: a power of 2^31 or more
 *  was worked with 32-bit steps, so 3^(2^31) + 5 passed as 6); past it the kernel cannot decide in time, and refuses. */
export const MAX_POWER = 1024;
export function powInt(a: Rat, k: number): Rat {
  if (!Number.isSafeInteger(k)) throw new KernelError('malformed', 'a power that is not a whole number');
  if (k > MAX_POWER || k < -MAX_POWER) throw new KernelError('undecided', `a whole power past ${MAX_POWER} either way`);
  // (refused before it is worked out when its size is sure to be past MAX_BITS: 2^(e−1) < |a| < 2^(e+1))
  const ex = bits(a.n) - bits(a.d), kk = k < 0 ? -k : k;
  if ((ex > 1 && (ex - 1) * kk > MAX_BITS) || (ex < -1 && (ex + 1) * kk < -MAX_BITS)) throw new KernelError('undecided', PAST);
  if (k < 0) return div(ONE, powInt(a, -k));
  let r = ONE, b = a, e = BigInt(k); while (e > 0n) { if (e & 1n) r = mul(r, b); b = mul(b, b); e >>= 1n; } return r;
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
  // (its length held first, a fraction's too: a fraction of a million digits was read whole before, 2026-11-01)
  if (typeof t !== 'string' || t.length > 400) throw new KernelError('malformed', `not a number the kernel reads: ${String(t).slice(0, 40)}`);
  const f = /^(-?\d+)\/(\d+)$/.exec(t); if (f) return rat(BigInt(f[1]!), BigInt(f[2]!));
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(t);
  if (!m) throw new KernelError('malformed', `not a number the kernel reads: ${t.slice(0, 40)}`);
  const digits = BigInt(`${m[2]}${m[3] ?? ''}`), e = Number(m[4] ?? 0) - (m[3]?.length ?? 0);
  if (Math_abs(e) > 4000) throw new KernelError('malformed', 'an exponent too large');
  const r = e >= 0 ? rat(digits * 10n ** BigInt(e)) : rat(digits, 10n ** BigInt(-e));
  return m[1] ? neg(r) : r;
}
const Math_abs = (x: number): number => (x < 0 ? -x : x);

/** The number of bits in a positive BigInt. */
export function bits(x: bigint): number { return x === 0n ? 0 : abs(x).toString(2).length; }
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

/** The greatest and least size a value may have while it is worked out: 2^±16384 (about 10^±4932; any number the kernel
 *  reads is within 10^±4400). A value past it is refused as undecided at the step that makes it (the red team,
 *  2026-11-01: a power of a power of a power of two, each power legal, grew a number of a billion bits for 8 s; a product
 *  of 4000 powers of two took 75 s), so the numbers of every step stay small and a check ends in time. The second checker
 *  holds the same bound. */
export const MAX_BITS = 16384;
const PAST = `a value past 2^±${MAX_BITS} while it is worked out: not decided in time`;
let TOP: Rat | null = null, BOTTOM: Rat | null = null;
export function held(a: Rat): Rat {
  if (a.n === 0n) return a;
  const e = bits(a.n) - bits(a.d); if (e > 2 - MAX_BITS && e < MAX_BITS - 2) return a; // (well within: 2^(e−1) < |a| < 2^(e+1))
  TOP ??= pow2(MAX_BITS); BOTTOM ??= pow2(-MAX_BITS);
  const m = absR(a); if (lt(TOP, m) || lt(m, BOTTOM)) throw new KernelError('undecided', PAST);
  return a;
}

/** Why the kernel refused: the claim is wrong; it cannot decide it; or the certificate is not one it reads. */
export class KernelError extends Error {
  constructor(readonly refused: 'wrong' | 'undecided' | 'malformed', why: string) { super(why); }
}
