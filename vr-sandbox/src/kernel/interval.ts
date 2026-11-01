// Intervals with rational endpoints, rounded outward (the kernel, spec 10, T23; research 31 B1.3): every operation gives
// an interval holding every value the exact operation could give for any points of its arguments. Endpoints are kept to
// PREC significant bits, the lower rounded down and the upper up, so sizes stay bounded and the enclosure is kept.
// exp, ln and roots are worked out by series with a bounded remainder, never by the host's Math (which promises
// nothing about its last bit). What is not here (sin, cos and the rest) is refused as undecided: the kernel fails closed.

import { HALF, KernelError, ONE, TWO, ZERO, absR, add as addR, bits, cmp, div as divR, fromText, le, lt, maxR, minR, mul as mulR, neg as negR, pow2, powInt as powR, rat, roundTo, sub as subR, type Rat } from './rat';

export interface Iv { readonly lo: Rat; readonly hi: Rat }
export const PREC = 96;
const tidy = (lo: Rat, hi: Rat): Iv => ({ lo: roundTo(lo, PREC, false), hi: roundTo(hi, PREC, true) });
export const point = (r: Rat): Iv => ({ lo: r, hi: r });

export const add = (a: Iv, b: Iv): Iv => tidy(addR(a.lo, b.lo), addR(a.hi, b.hi));
export const sub = (a: Iv, b: Iv): Iv => tidy(subR(a.lo, b.hi), subR(a.hi, b.lo));
export const neg = (a: Iv): Iv => ({ lo: negR(a.hi), hi: negR(a.lo) });
export function mul(a: Iv, b: Iv): Iv {
  const p = [mulR(a.lo, b.lo), mulR(a.lo, b.hi), mulR(a.hi, b.lo), mulR(a.hi, b.hi)];
  return tidy(p.reduce(minR), p.reduce(maxR));
}
export function div(a: Iv, b: Iv): Iv {
  if (le(b.lo, ZERO) && le(ZERO, b.hi)) throw new KernelError('undecided', 'a division by an interval that holds zero');
  return mul(a, tidy(divR(ONE, b.hi), divR(ONE, b.lo)));
}
export const abs = (a: Iv): Iv => (le(ZERO, a.lo) ? a : le(a.hi, ZERO) ? neg(a) : { lo: ZERO, hi: maxR(negR(a.lo), a.hi) });
export const min = (a: Iv, b: Iv): Iv => ({ lo: minR(a.lo, b.lo), hi: minR(a.hi, b.hi) });
export const max = (a: Iv, b: Iv): Iv => ({ lo: maxR(a.lo, b.lo), hi: maxR(a.hi, b.hi) });

export function powInt(a: Iv, k: number): Iv {
  if (k < 0) return div(point(ONE), powInt(a, -k));
  if (k === 0) return point(ONE);
  const l = powR(a.lo, k), h = powR(a.hi, k);
  if (k % 2 === 1) return tidy(l, h);
  if (le(ZERO, a.lo)) return tidy(l, h);
  if (le(a.hi, ZERO)) return tidy(h, l);
  return tidy(ZERO, maxR(l, h));
}

// ---- roots: by the integer square root, checked both ways -----------------------------------------------------------
function isqrt(n: bigint): bigint { if (n < 2n) return n; let x = 1n << BigInt((bits(n) + 1) >> 1); for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; } }
/** A rational r with r² ≤ x (down) or r² ≥ x (up), to PREC bits. */
function sqrtR(x: Rat, up: boolean): Rat {
  if (x.n === 0n) return ZERO;
  const s = 2 * PREC, num = (x.n << BigInt(s)) / x.d; let r = isqrt(num);
  if (up && r * r * x.d !== x.n << BigInt(s)) r += 1n; // floor gives r² ≤ x·4^p; one more is above
  const out = rat(r, 1n << BigInt(PREC));
  if (up ? lt(mulR(out, out), x) : lt(x, mulR(out, out))) throw new KernelError('undecided', 'a square root not bounded'); // checked, not trusted
  return out;
}
export function sqrt(a: Iv): Iv {
  if (lt(a.lo, ZERO)) throw new KernelError('undecided', 'a square root of an interval reaching below zero');
  return { lo: sqrtR(a.lo, false), hi: sqrtR(a.hi, true) };
}

// ---- exp: halved until small, a series with its remainder bounded, squared back ---------------------------------------
const EPS = pow2(-(PREC + 8));
function expR(x: Rat): Iv {
  const k = Math0(bits(x.n) - bits(x.d) + 2); let y = mulR(x, pow2(-k));            // |y| ≤ 1/2
  y = roundTo(y, PREC + 16, false); const yh = mulR(x, pow2(-k)), dy = absR(subR(yh, y)); // y rounded; the slip carried as an interval
  let s = ONE, t = ONE, i = 1;
  for (; i < 200; i++) { t = roundTo(divR(mulR(t, y), rat(BigInt(i))), PREC + 24, false); s = addR(s, t); if (lt(absR(t), EPS)) break; }
  // remainder of the series after the term at i: at most 2|y|^(i+1)/(i+1)! (e^|y| < 2), and the terms' own rounding
  const rem = addR(mulR(TWO, absR(t)), mulR(rat(BigInt(i + 2)), pow2(-(PREC + 20))));
  // the slip dy in y: e^(y+dy) ≤ e^y·(1 + 2dy) for dy ≤ 1/2
  let lo = subR(s, rem), hi = addR(s, rem); lo = mulR(lo, subR(ONE, mulR(TWO, dy))); hi = mulR(hi, addR(ONE, mulR(TWO, dy)));
  let r: Iv = tidy(lo, hi); for (let j = 0; j < k; j++) r = mul(r, r);
  return r;
}
const Math0 = (n: number): number => (n > 0 ? n : 0);
export function exp(a: Iv): Iv {
  if (lt(rat(1000n), a.hi)) throw new KernelError('undecided', 'an exponent too large to enclose');
  return { lo: expR(a.lo).lo, hi: expR(a.hi).hi };
}

// ---- ln: x = m·2^e, ln m = 2 atanh((m−1)/(m+1)), the series' tail bounded ----------------------------------------------
function atanh2(z: Rat): Iv { // 2·atanh(z) for |z| ≤ 1/3
  const z2 = mulR(z, z); let t = z, s = z, i = 1;
  for (; i < 400; i++) { t = roundTo(mulR(t, z2), PREC + 24, false); const term = divR(t, rat(BigInt(2 * i + 1))); s = addR(s, term); if (lt(absR(term), EPS)) break; }
  // tail ≤ |t·z²|/(2i+3) / (1 − z²) ≤ 9/8·|t|, and the rounding of each step
  const rem = addR(mulR(rat(9n, 8n), absR(t)), mulR(rat(BigInt(i + 2)), pow2(-(PREC + 20))));
  return tidy(mulR(TWO, subR(s, rem)), mulR(TWO, addR(s, rem)));
}
let LN2: Iv | null = null;
const ln2 = (): Iv => (LN2 ??= atanh2(rat(1n, 3n)));
function lnR(x: Rat): Iv {
  if (le(x, ZERO)) throw new KernelError('undecided', 'a logarithm of zero or less');
  let e = bits(x.n) - bits(x.d), m = mulR(x, pow2(-e));
  while (lt(m, HALF)) { m = mulR(m, TWO); e--; } while (le(ONE, m)) { m = mulR(m, HALF); e++; }
  m = roundTo(m, PREC + 32, false); const z = divR(subR(m, ONE), addR(m, ONE));
  const lnm = atanh2(z), slip = pow2(-(PREC + 28));
  return add(mul(point(rat(BigInt(e))), ln2()), { lo: subR(lnm.lo, slip), hi: addR(lnm.hi, slip) });
}
export function ln(a: Iv): Iv { if (le(a.lo, ZERO)) throw new KernelError('undecided', 'a logarithm of an interval reaching zero or below'); return { lo: lnR(a.lo).lo, hi: lnR(a.hi).hi }; }

/** a to a rational power: whole powers exactly, halves by the root, the rest as exp(k·ln a) (a above zero). */
export function pow(a: Iv, k: Rat): Iv {
  if (k.d === 1n) return powInt(a, Number(k.n));
  if (k.d === 2n) return powInt(sqrt(a), Number(k.n));
  return exp(mul(point(k), ln(a)));
}

export const contains = (a: Iv, x: Rat): boolean => le(a.lo, x) && le(x, a.hi);
export const width = (a: Iv): Rat => subR(a.hi, a.lo);
export const ivText = (a: Iv): string => `[${a.lo.n}/${a.lo.d}, ${a.hi.n}/${a.hi.d}]`;
export { cmp, fromText };
