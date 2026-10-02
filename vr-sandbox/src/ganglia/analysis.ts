// Reasoning with laws beyond running them forward:
//   solveFor      any one input from the others and the output wanted ("what diameter gives 30 MPa?"), by bracketing
//                 the root on a log scale and bisecting it to machine precision; no algebra written per law
//   sensitivity   how much the output moves per per-cent of each input (the elasticity d ln y / d ln x), so Ego can
//                 say what an answer hangs on
//   uncertainty   how an input's uncertainty carries into the output: first order, independent (root sum of
//                 squares) and worst case (the sum)
//   showWork      a workflow's trace as a derivation: each law, its formula, the numbers that went in with their
//                 units, what came out

import { lawById, withConstants } from './laws';
import type { TraceStep, WorkflowResult } from './types';

/**
 * The value of `unknown` for which law `id`, with the other inputs `known`, gives `target`; null when no positive value
 * does. Laws here are monotonic in each input over the physical range, so a sign change on a log grid brackets the one
 * root; bisection in log space then pins it to about 1e-12.
 */
export function solveFor(id: string, unknown: string, known: Record<string, number>, target: number, range: [number, number] = [1e-12, 1e12]): number | null {
  const law = lawById(id);
  if (!law) throw new Error(`No law ${id}`);
  if (!law.inputs.some((i) => i.sym === unknown)) throw new Error(`${law.name} has no input ${unknown}`);
  const f = (x: number) => law.eval(withConstants(law, { ...known, [unknown]: x })) - target;
  let lo = Math.log(range[0]), prev = f(range[0]);
  const top = Math.log(range[1]), stepLn = Math.log(10) / 8;
  for (let ln = lo + stepLn; ln <= top + 1e-9; ln += stepLn) {
    const v = f(Math.exp(ln));
    if (Number.isFinite(prev) && Number.isFinite(v) && Math.sign(v) !== Math.sign(prev)) {
      let a = lo, b = ln, fa = prev;
      for (let k = 0; k < 200 && b - a > 1e-14; k++) {
        const m = (a + b) / 2, fm = f(Math.exp(m));
        if (fm === 0) return Math.exp(m);
        if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
      }
      return Math.exp((a + b) / 2);
    }
    if (v === 0) return Math.exp(ln);
    lo = ln;
    prev = v;
  }
  return null;
}

/** Elasticity of a law's output to each input at a point: the per cent it moves per per cent of that input. */
export function sensitivity(id: string, inputs: Record<string, number>): Record<string, number> {
  const law = lawById(id);
  if (!law) throw new Error(`No law ${id}`);
  const at = (v: Record<string, number>) => law.eval(withConstants(law, v));
  const y = at(inputs);
  const out: Record<string, number> = {};
  for (const i of law.inputs) {
    const x = inputs[i.sym];
    if (x === undefined || x === 0 || y === 0) continue;
    const h = Math.abs(x) * 1e-6;
    const dy = (at({ ...inputs, [i.sym]: x + h }) - at({ ...inputs, [i.sym]: x - h })) / (2 * h);
    out[i.sym] = (dy * x) / y;
  }
  return out;
}

/**
 * How relative uncertainties in the inputs (0.1 = ±10%) carry into the output, to first order: `independent` if they
 * vary independently (root sum of squares), `worst` if they all pile up the same way.
 */
export function uncertainty(id: string, inputs: Record<string, number>, rel: Record<string, number>): { value: number; independent: number; worst: number; dominant: string | null } {
  const law = lawById(id)!;
  const value = law.eval(withConstants(law, inputs));
  const e = sensitivity(id, inputs);
  let ss = 0, worst = 0, dominant: string | null = null, big = 0;
  for (const [k, u] of Object.entries(rel)) {
    const c = Math.abs((e[k] ?? 0) * u);
    ss += c * c;
    worst += c;
    if (c > big) { big = c; dominant = k; }
  }
  return { value, independent: Math.sqrt(ss), worst, dominant };
}

// ------------------------------------------------------------------------------------------------ showing the work

const PREFIX: Record<string, [number, string][]> = {
  m: [[1, 'm'], [1e-3, 'mm'], [1e-6, 'µm']], Pa: [[1e9, 'GPa'], [1e6, 'MPa'], [1e3, 'kPa'], [1, 'Pa']], N: [[1e3, 'kN'], [1, 'N']],
  W: [[1e3, 'kW'], [1, 'W'], [1e-3, 'mW']], J: [[1e6, 'MJ'], [1e3, 'kJ'], [1, 'J']], A: [[1, 'A'], [1e-3, 'mA']], V: [[1e3, 'kV'], [1, 'V'], [1e-3, 'mV']],
  ohm: [[1, 'Ω'], [1e-3, 'mΩ']], rev: [[1e6, 'million rev'], [1, 'rev']], 'N m': [[1, 'N·m'], [1e-3, 'mN·m']],
};

/** A value in its unit, with a readable prefix and three significant figures: 0.0124 m → "12.4 mm". */
export function show(value: number, unit: string): string {
  if (!Number.isFinite(value)) return `${value} ${unit}`;
  const scales = PREFIX[unit];
  const sig = (x: number) => String(Number(x.toPrecision(3)));
  if (!scales) return `${sig(value)}${unit === '-' ? '' : ` ${unit}`}`;
  const a = Math.abs(value);
  const pick = scales.find(([k]) => a >= k * 0.9995) ?? scales[scales.length - 1]!;
  return `${sig(value / pick[0])} ${pick[1]}`;
}

/** One traced step as a line of working: "Rolling resistance (what the tyres lose rolling): F = C_rr N with C_rr 0.015, N 1.18 kN → 17.7 N". */
export function workLine(t: TraceStep): string {
  const law = lawById(t.law);
  if (!law) return `${t.law}: ${show(t.output, t.unit)}`;
  const ins = law.inputs.filter((i) => i.sym in t.inputs).map((i) => `${i.sym} ${show(t.inputs[i.sym]!, i.unit)}`).join(', ');
  return `${law.name} (${t.for}): ${law.formula} with ${ins} → ${show(t.output, law.output.unit)}${t.caution ? ` [caution: ${t.caution}]` : ''}`;
}

/** A workflow's whole working, numbered. */
export const showWork = (r: Pick<WorkflowResult, 'trace'>) => r.trace.map((t, k) => `${k + 1}. ${workLine(t)}`);
