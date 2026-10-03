// The form of a law (docs/EGO-NATIVE-LANGUAGE.md section R): what a law looks like with its symbols gone. For every
// input, the exponent the output follows it with (how y scales when x is scaled, measured on the law's own `eval` at
// its worked example, at three multipliers so that a curve is not mistaken for a power); the form is the output's
// dimension and the sorted exponents. Two laws of one form are one structure said in two theories: E = ½ m v²,
// E = ½ I ω², E = ½ k x², E = ½ C V² and E = ½ L I² are all "an energy, one input times another squared", and
// P = F v, P = T ω, P = V I are all "a power, one input times another". No word of either theory enters; a law
// whose output is not a power of its inputs at its example (Carnot, a difference, an exponential) has no form here
// and says so.

import type { Law } from '../types';
import { withConstants } from '../laws';
import { dimensionOf } from '../units';
import { unitOf } from './translate';

export interface Form { key: string; unit: string; exponents: number[] }

const MULTIPLIERS = [1.01, 1.02, 1.5];

/** The exponent of the output in one input at the example, or null where the law is not a power of it there. */
function exponent(law: Law, sym: string, y0: number): number | null {
  // the example with the law's constants merged (g, k, σ): a law is evaluated as the book evaluates it
  const ex = withConstants(law, law.example.inputs);
  const x0 = ex[sym];
  if (!x0) return null;
  const slopes: number[] = [];
  for (const k of MULTIPLIERS) {
    let y1: number;
    try { y1 = law.eval({ ...ex, [sym]: x0 * k }); } catch { return null; }
    if (!Number.isFinite(y1) || y1 <= 0 !== y0 <= 0) return null;
    slopes.push(Math.log(Math.abs(y1 / y0)) / Math.log(k));
  }
  const p = slopes[0]!;
  if (!Number.isFinite(p) || slopes.some((q) => Math.abs(q - p) > 0.02)) return null;
  const rounded = Math.round(p * 4) / 4;
  // an output that does not move with the input at the example (a slope at zero) is no power of it: no form
  if (rounded === 0) return null;
  return Math.abs(rounded - p) <= 0.02 ? rounded : null;
}

/** The form of a law, or null where it is not a power law of every input at its worked example. */
export function formOf(law: Law): Form | null {
  let y0: number;
  try { y0 = law.eval(withConstants(law, law.example.inputs)); } catch { return null; }
  if (!Number.isFinite(y0) || y0 === 0) return null;
  const exponents: number[] = [];
  for (const inp of law.inputs) { const p = exponent(law, inp.sym, y0); if (p === null) return null; exponents.push(p); }
  exponents.sort((a, b) => a - b);
  let unit: string;
  try { unit = unitOf(dimensionOf(law.output.unit)); } catch { return null; }
  return { key: `${unit}:${exponents.join(',')}`, unit, exponents };
}

/** Every law by its form: the forms shared by two or more laws are the cross-theory equivalences. */
export function lawForms(laws: Iterable<Law>): Map<string, Law[]> {
  const out = new Map<string, Law[]>();
  for (const law of laws) { const f = formOf(law); if (!f) continue; out.set(f.key, [...(out.get(f.key) ?? []), law]); }
  return out;
}

/** The laws of the same form as one, itself left out; empty when it has no form. */
export function sameForm(law: Law, laws: Iterable<Law>): Law[] {
  const f = formOf(law);
  if (!f) return [];
  return [...laws].filter((l) => l !== law && formOf(l)?.key === f.key);
}

/** A form, said: "an energy, one input times another squared". */
export function sayForm(f: Form): string {
  const what = f.unit === 'J' ? 'an energy' : f.unit === 'W' ? 'a power' : f.unit === 'N' ? 'a force' : f.unit === 'V' ? 'a voltage' : f.unit === 'Pa' ? 'a stress or pressure' : f.unit === 'm' ? 'a length' : f.unit === '' ? 'a number' : `a quantity in ${f.unit}`;
  const part = (p: number, n: number): string => { const noun = n === 1 ? 'one input' : `${n} inputs`; const how = p === 1 ? '' : p === 2 ? ' squared' : p === 3 ? ' cubed' : p === 0.5 ? ' under a root' : p === -1 ? ' divided by' : p === -2 ? ' divided by, squared' : ` to the power ${p}`; return p < 0 ? `divided by ${noun}${p === -2 ? ' squared' : p === -0.5 ? ' under a root' : p === -1 ? '' : ` to the power ${-p}`}` : `${noun}${how}`; };
  const counts = new Map<number, number>();
  for (const p of f.exponents) counts.set(p, (counts.get(p) ?? 0) + 1);
  const pos = [...counts].filter(([p]) => p > 0).sort((a, b) => a[0] - b[0]).map(([p, n]) => part(p, n));
  const neg = [...counts].filter(([p]) => p < 0).sort((a, b) => b[0] - a[0]).map(([p, n]) => part(p, n));
  return `${what}, ${[...pos, ...neg].join(' times ')}`;
}
