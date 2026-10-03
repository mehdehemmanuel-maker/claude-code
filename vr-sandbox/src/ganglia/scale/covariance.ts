// Scale covariance of the law book. For every executable law: scale its own worked example by a transformation (each
// input by its dimension unless the regime holds it; the law's constants never), run the law, and compare with what the
// output's dimension says it should be. The verdict is derived, numerically, from the law as written: invariant,
// covariant, approximately invariant, scale-dependent (a constant inside it sets a scale), broken outside its regime
// (the scaled inputs leave where it holds), or unknown (it could not be run). The transformation that explains the
// verdict is kept with it.
import { LAWS, lawById, withConstants } from '../laws';
import { parseUnit } from '../units';
import type { Law } from '../types';
import { SIMILARITIES, exponentOf, exponentOfDim, heldBy, type ScaleTransform } from './transform';

export type Verdict = 'invariant' | 'covariant' | 'approximately invariant' | 'scale-dependent' | 'broken outside regime' | 'unknown';

export interface Classification {
  law: string;
  transform: string;
  lambda: number;
  verdict: Verdict;
  /** The example's output, what its dimension says it should become, and what the law gave. */
  example: number;
  expected: number;
  got: number;
  /** got / expected: the factor the law is off by under scaling; 1 when covariant. */
  ratio: number;
  /** Inputs the regime held fixed, with why. */
  held: { sym: string; name: string; by: string }[];
  /** Constants of the law whose dimension does not scale away under this transform: what sets the scale. */
  setsScale: { sym: string; name: string; unit: string; exponent: number }[];
  /** The transformation that explains the verdict, in words. */
  why: string;
}

const TIGHT = 1e-6, LOOSE = 0.05;

/** One law under one transform at one λ. */
export function classify(lawOrId: Law | string, t: ScaleTransform, lambda = 10): Classification {
  const law = typeof lawOrId === 'string' ? lawById(lawOrId) : lawOrId;
  if (!law) return { law: String(lawOrId), transform: t.id, lambda, verdict: 'unknown', example: NaN, expected: NaN, got: NaN, ratio: NaN, held: [], setsScale: [], why: 'no such law' };
  const held: Classification['held'] = [];
  const scaled: Record<string, number> = {};
  for (const q of law.inputs) {
    const v = law.example.inputs[q.sym];
    if (v === undefined) continue;
    const by = heldBy(q);
    const e = exponentOf(t, q);
    if (by && t.holds.includes(by) && exponentOfDim(t, parseUnit(q.unit).dim) !== 0) held.push({ sym: q.sym, name: q.name, by: `${by} held fixed by the regime` });
    scaled[q.sym] = v * Math.pow(lambda, e);
  }
  const setsScale: Classification['setsScale'] = Object.entries(law.constants ?? {}).map(([sym, c]) => ({ sym, name: c.name, unit: c.unit, exponent: exponentOfDim(t, parseUnit(c.unit).dim) })).filter((c) => Math.abs(c.exponent) > 1e-9);
  const eOut = exponentOfDim(t, parseUnit(law.output.unit).dim);
  const example = law.example.output;
  const expected = example * Math.pow(lambda, eOut);
  let got: number;
  try { got = law.eval(withConstants(law, scaled)); } catch (err) {
    return { law: law.id, transform: t.id, lambda, verdict: 'unknown', example, expected, got: NaN, ratio: NaN, held, setsScale, why: `the law could not be run on the scaled inputs: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (!Number.isFinite(got)) return { law: law.id, transform: t.id, lambda, verdict: 'unknown', example, expected, got, ratio: NaN, held, setsScale, why: 'the law gave no number on the scaled inputs' };
  const outside = law.outside?.(withConstants(law, scaled)) ?? null;
  const ratio = expected === 0 ? (got === 0 ? 1 : Infinity) : got / expected;
  const dev = Math.abs(ratio - 1);
  const base = { law: law.id, transform: t.id, lambda, example, expected, got, ratio, held, setsScale };
  if (outside) return { ...base, verdict: 'broken outside regime', why: `at λ = ${lambda} the scaled inputs leave where the law holds: ${outside}` };
  if (dev <= TIGHT) {
    if (eOut === 0) return { ...base, verdict: 'invariant', why: `${parseUnit(law.output.unit).dim.every((d) => d === 0) ? `the output is dimensionless (${law.output.unit})` : `the output's dimension (${law.output.unit}) is left unscaled by this transformation`} and the law gives the same value at every λ${held.length ? `, with ${held.map((h) => h.sym).join(', ')} held` : ''}; size does not enter` };
    return { ...base, verdict: 'covariant', why: `scaling every input by its dimension scales the output by λ^${+eOut.toFixed(3)} as its dimension says${setsScale.length ? `; the constants (${setsScale.map((c) => c.sym).join(', ')}) do not enter the scaling here` : ''}` };
  }
  // the value itself unchanged although its dimension would scale it: fixed by what the regime holds (a specific energy by σ/ρ)
  if (example !== 0 && Math.abs(got / example - 1) <= TIGHT) return { ...base, verdict: 'invariant', why: `the output is the same number at every λ although its dimension (${law.output.unit}) says λ^${+eOut.toFixed(3)}: it is fixed by what the regime holds (${held.map((h) => h.name).join(', ') || 'the constants'}); size does not enter` };
  if (dev <= LOOSE) return { ...base, verdict: 'approximately invariant', why: `off by ${(dev * 100).toFixed(2)} % at λ = ${lambda}: a fit or a cap inside the law bends it slightly` };
  const culprit = setsScale.length ? `the constant${setsScale.length > 1 ? 's' : ''} ${setsScale.map((c) => `${c.sym} (${c.name}, ${c.unit}, would need λ^${+c.exponent.toFixed(3)})`).join(', ')} set${setsScale.length > 1 ? '' : 's'} a scale the transform does not move` : held.length ? `${held.map((h) => h.name).join(', ')} ${held.length > 1 ? 'are' : 'is'} held fixed by the regime while the dimension says ${held.length > 1 ? 'they' : 'it'} should scale` : 'a nonlinearity inside the law is not a power law';
  return { ...base, verdict: 'scale-dependent', why: `the law gives ${got.toPrecision(4)} where its dimension says ${expected.toPrecision(4)} (×${ratio.toPrecision(4)}): ${culprit}` };
}

/** The whole law book under a transform. */
export function classifyAll(t: ScaleTransform, lambda = 10): Classification[] { return LAWS.map((l) => classify(l, t, lambda)); }

/** Every law under every similarity, tallied by verdict. */
export function covarianceTable(lambda = 10): { transform: ScaleTransform; tally: Record<Verdict, number>; rows: Classification[] }[] {
  return SIMILARITIES.map((t) => {
    const rows = classifyAll(t, lambda);
    const tally = { invariant: 0, covariant: 0, 'approximately invariant': 0, 'scale-dependent': 0, 'broken outside regime': 0, unknown: 0 } as Record<Verdict, number>;
    for (const r of rows) tally[r.verdict]++;
    return { transform: t, tally, rows };
  });
}

/** The constants across the law book that set scales: each with its dimension, and the laws that carry it. */
export function scaleSetters(): { sym: string; name: string; unit: string; value: number; laws: string[] }[] {
  const out = new Map<string, { sym: string; name: string; unit: string; value: number; laws: string[] }>();
  for (const l of LAWS) for (const [sym, c] of Object.entries(l.constants ?? {})) {
    if (parseUnit(c.unit).dim.every((d) => d === 0)) continue; // a dimensionless constant sets no scale
    const key = `${sym}|${c.unit}`;
    const have = out.get(key) ?? out.set(key, { sym, name: c.name, unit: c.unit, value: c.value, laws: [] }).get(key)!;
    have.laws.push(l.id);
  }
  return [...out.values()];
}

export interface ScaleLimit {
  law: string;
  /** Going smaller: the largest λ < 1 at which the law leaves its regime, with why; null when it never does within the range. */
  down: { lambda: number; verdict: Verdict; why: string } | null;
  /** Going bigger: the smallest λ > 1 at which it does. */
  up: { lambda: number; verdict: Verdict; why: string } | null;
  /** A verdict that does not depend on λ (scale-dependent, unknown): the law does not follow the size at all. */
  always: { verdict: Verdict; why: string } | null;
}

/**
 * For each law, the first scale at which it leaves its regime going smaller and going bigger, by sweeping λ over the
 * range and running the law on its scaled example. A law that is scale-dependent at λ = 1.01 already is reported as
 * such for every λ.
 */
export function scaleLimits(lawIds: string[], t: ScaleTransform, range: [number, number] = [1e-3, 1e3], perDecade = 4): ScaleLimit[] {
  return lawIds.filter((id) => lawById(id)).map((id) => {
    // a mismatched power law shows at λ = 2 already (at λ near 1 it hides inside "approximately invariant"); a regime break at 2 is swept for
    const near = classify(id, t, 2);
    if (near.verdict === 'scale-dependent' || near.verdict === 'unknown') return { law: id, down: null, up: null, always: { verdict: near.verdict, why: near.why } };
    const sweep = (dir: 1 | -1) => {
      for (let k = 1; ; k++) {
        const lambda = Math.pow(10, (dir * k) / perDecade);
        if (lambda < range[0] || lambda > range[1]) return null;
        const c = classify(id, t, lambda);
        if (c.verdict === 'broken outside regime' || c.verdict === 'scale-dependent' || c.verdict === 'unknown') return { lambda, verdict: c.verdict, why: c.why };
      }
    };
    return { law: id, down: sweep(-1), up: sweep(1), always: null };
  });
}
