// Discovery (docs/NEX-DISCOVERY.md): the epistemology under audit. Human knowledge enters the Nexus as evidence,
// never as authority; what no human has named has the same truth value as anything else (a label never enters a
// hash: the hard test); unknown, unobserved, unmodelled, unmeasured, insufficient and false are modes that hash and
// render apart. What is built here is what those principles need to become operations:
//
//   certificate(c)   "impossible" only with a negative derivation: a law that bounds or computes the claimed
//                    quantity, its assumptions, the law evaluated inside its domain, the claim beyond the bound or
//                    beyond the stated uncertainty of the computed value; else the precise weaker mode (unknown,
//                    outside-domain, undefined), never impossible
//   residual(...)    observation against prediction, one component or several: for one, the difference over the
//                    declared tolerance; for several with independent tolerances, the root of the summed squares,
//                    which exceeds any one component's (so two near-misses can be one anomaly)
//   anomaly(...)     the residual kept with everything a later reader needs, alive until explained, an explanation
//                    kept under it, never erased; anomalies() reads the engine's own register
//   skeptic(...)     the ordinary explanations first, derived from the law's own graph where they can be (its inputs,
//                    its constants, its domain, its ancestry) and computed; the rest a checklist, marked as such
//   clusterAnomalies anomalies grouped by what they share in the graph (law ancestry, the parameter that closes
//                    each), never by the look of their structures
//
// The evidence structure of a claim, its factoring into propositions, its typed relation to the laws and the
// epistemic vector that holds all of it are in epistemic.ts; the human labels are made there, at the rendering
// boundary, from the vector.

import type { Law } from '../types';
import { LAWS, isOptional, use, withConstants } from '../laws';
import { dimensionOf, parseUnit, sameDim, type Dim } from '../units';
import { OBSERVATIONS, type Observation } from '../scale/observations';
import { d, e, q, r, type E, type Mode, type R, type Structure } from './core';
import { family } from './space';

// ---- a claim about a quantity, and its certificate

export interface Claim {
  thing?: string;
  quantity: string;
  value: number;
  unit: string;
  inputs: Record<string, number>;
  /** The claim's own relative uncertainty, when it states one; a claim without one is taken at its word. */
  rel?: number;
  /** The mechanism the claim credits, when it credits one. */
  mechanism?: string;
}

export type Sense = 'most' | 'least' | 'equal';

export type Certificate =
  | { impossible: true; mode: 'impossible-under'; law: Law; bound: number; sense: Sense; assumptions: string[]; derivation: string; structure: R }
  | { impossible: false; mode: Mode; why: string; law?: Law; bound?: number; sense?: Sense; structure?: R };

/** A law that bounds its output: said by the output's name (most, least, smallest…) or by its formula opening with the output and ≤ or ≥ (a ≤ deeper in a formula is a cap on an input, not a bound on the output). */
export const boundSense = (law: Law): 'most' | 'least' | null => {
  const n = law.output.name.toLowerCase();
  const opening = law.formula.match(/^(\S+)\s*([≤≥])/);
  const sign = opening && opening[1]!.replace(/[_′']/g, '') === law.output.sym.replace(/_/g, '') ? opening[2] : null;
  if (/^(?:most|maximum|max |greatest|highest)/.test(n) || sign === '≤') return 'most';
  if (/^(?:least|minimum|min |smallest|lowest)/.test(n) || sign === '≥') return 'least';
  return null;
};

/** The laws that reach a claim: the output's dimension is the claim's and its name is the claim's quantity. */
export function reaching(c: Claim): { laws: Law[]; dim: Dim | null } {
  let dim: Dim;
  try { dim = dimensionOf(c.unit); } catch { return { laws: [], dim: null }; }
  // the claim's quantity, its bound word dropped too: "most tractive force" asks about the tractive force
  const want = c.quantity.toLowerCase().trim().replace(/^(?:most|least|maximum|minimum|smallest|greatest) /, '').split(/\s+/);
  const laws = LAWS.filter((l) => {
    try { if (!sameDim(dimensionOf(l.output.unit), dim)) return false; } catch { return false; }
    // the output's name, its bound word dropped, is the claim's quantity or ends with it: a law that computes "rotational kinetic energy" reaches a claim about kinetic energy; one that computes "energy" does not
    const named = l.output.name.toLowerCase().replace(/^(?:most|least|maximum|minimum|smallest|greatest) /, '').split(/\s+/);
    return named.length >= want.length && named.slice(named.length - want.length).join(' ') === want.join(' ');
  });
  return { laws, dim };
}

/** Whether every input a law needs is given (an input the law fills itself when absent is not needed). */
export const applicable = (law: Law, inputs: Record<string, number>): boolean => law.inputs.every((x) => inputs[x.sym] !== undefined || isOptional(law.id, x.sym));

const quantityOf = (law: Law, value: number, en: string): R => r('quantity', [d(law.output.sym, { en }), q(value, law.output.unit)], {});

/**
 * "Impossible" only with a negative derivation: a law of the book that bounds or computes the claimed quantity,
 * evaluated inside its own domain at the claim's inputs, with the claim beyond the bound, or beyond the computed
 * value by more than the stated uncertainty (the claim's, else the law's example tolerance, else taken at its
 * word). The certificate names the assumptions (the law's validity and the inputs it was given), the law, the
 * derivation and the contradiction, in mode impossible-under with the assumptions under it. No law reaching the
 * quantity, or the inputs a law needs missing: unknown, not impossible. The law outside its domain at those
 * inputs: outside-domain. The claim inside the bound: true (bounded); at the computed value: true (entailed).
 */
export function certificate(c: Claim): Certificate {
  const { laws, dim } = reaching(c);
  if (!dim) return { impossible: false, mode: 'undefined', why: `${c.unit} is not a unit I can read` };
  // a claim or a given that is not a number means nothing: undefined, never a verdict and never a crash
  if (!Number.isFinite(c.value)) return { impossible: false, mode: 'undefined', why: `${c.value} is not a number` };
  const bad = Object.entries(c.inputs).find(([, v]) => !Number.isFinite(v));
  if (bad) return { impossible: false, mode: 'undefined', why: `${bad[0]} = ${bad[1]} is not a number` };
  if (!laws.length) return { impossible: false, mode: 'unknown', why: `no law of mine computes or bounds ${c.quantity}; no certificate, so not impossible: unknown` };
  const ready = laws.filter((l) => applicable(l, c.inputs));
  if (!ready.length) {
    const missing = [...new Set(laws.flatMap((l) => l.inputs.filter((x) => c.inputs[x.sym] === undefined && !isOptional(l.id, x.sym)).map((x) => `${x.name} (${x.sym})`)))];
    return { impossible: false, mode: 'unknown', why: `${laws.map((l) => l.name).join(', ')} reach${laws.length === 1 ? 'es' : ''} ${c.quantity} but need${laws.length === 1 ? 's' : ''} ${missing.join(', ')}; no certificate, so not impossible: unknown` };
  }
  const claimed = q(c.value, c.unit).v;
  let entailed: Certificate | null = null, contradicted: Certificate | null = null, bounded: Certificate | null = null, outside: Certificate | null = null;
  for (const law of ready) {
    const out = law.outside?.(withConstants(law, c.inputs));
    if (out) { outside ??= { impossible: false, mode: 'outside-domain', why: `${law.name} does not hold at these inputs: ${out}`, law }; continue; }
    // the law gives its value in its own unit; the claim was read into SI: compare in SI, say both in the law's unit
    const { value: own } = use(law.id, c.inputs);
    const u = parseUnit(law.output.unit);
    const value = own * u.scale + (u.offset ?? 0);
    const inOwn = (si: number): number => Number(((si - (u.offset ?? 0)) / u.scale).toPrecision(4));
    const sense: Sense = boundSense(law) ?? 'equal';
    const tol = c.rel ?? law.example.rel ?? 1e-9;
    const tolSaid = c.rel !== undefined ? `the claim's stated uncertainty of ${c.rel} relative` : law.example.rel !== undefined ? `the law's own tolerance of ${law.example.rel} relative` : 'the claim taken at its word';
    const beyond = sense === 'most' ? claimed > value * (1 + tol) : sense === 'least' ? claimed < value * (1 - tol) : value === 0 ? claimed !== 0 : Math.abs(claimed - value) > tol * Math.abs(value);
    const claimS = quantityOf(law, (claimed - (u.offset ?? 0)) / u.scale, c.quantity);
    claimS.c = { ev: { how: 'hypothesized' } };
    const vSaid = inOwn(value), cSaid = inOwn(claimed);
    if (!beyond) {
      const ok: Certificate = { impossible: false, mode: 'true', why: sense === 'equal' ? `${law.name} gives ${vSaid} ${law.output.unit} at these inputs and the claim is ${cSaid} ${law.output.unit}, within ${tolSaid}` : `${law.name} allows it: the ${sense === 'most' ? 'ceiling' : 'floor'} is ${vSaid} ${law.output.unit} and the claim is ${cSaid} ${law.output.unit}`, law, bound: value, sense, structure: claimS };
      if (sense === 'equal') entailed ??= ok; else bounded ??= ok;
      continue;
    }
    const assumptions = [`${law.name} holds: ${law.valid}`, ...Object.entries(c.inputs).filter(([k]) => law.inputs.some((x) => x.sym === k)).map(([k, v]) => `${law.inputs.find((x) => x.sym === k)!.name} = ${v}`)];
    const derivation = sense === 'equal'
      ? `${law.name} (${law.formula}) at these inputs gives ${vSaid} ${law.output.unit}; the claim is ${cSaid} ${law.output.unit}, beyond ${tolSaid}; so assumptions + law + claim ⇒ ⊥`
      : `${law.name} (${law.formula}) at these inputs gives ${sense === 'most' ? 'at most' : 'at least'} ${vSaid} ${law.output.unit}; the claim is ${cSaid} ${law.output.unit}; so assumptions + law + claim ⇒ ⊥`;
    const boundS = quantityOf(law, own, law.output.name);
    boundS.c = { mech: law.id, ev: { how: 'derived', src: [law.source.cite] }, mode: 'true' };
    const structure = r('contradict', [claimS, boundS], { mode: 'impossible-under', under: assumptions, mech: law.id, ev: { how: 'derived', src: [law.source.cite] } });
    contradicted ??= { impossible: true, mode: 'impossible-under', law, bound: value, sense, assumptions, derivation, structure };
  }
  // one word, two laws: an entailment by one law is said with the law that disagrees, never over it
  if (entailed && contradicted && contradicted.impossible && contradicted.law !== entailed.law) entailed = { ...entailed, why: `${entailed.why} (${contradicted.law.name} also reaches ${c.quantity} with these inputs and gives ${Number(((contradicted.bound - (parseUnit(contradicted.law.output.unit).offset ?? 0)) / parseUnit(contradicted.law.output.unit).scale).toPrecision(4))} ${contradicted.law.output.unit}: the word names two quantities here)` };
  return entailed ?? contradicted ?? bounded ?? outside ?? { impossible: false, mode: 'unknown', why: 'no law reached a verdict' };
}

// ---- residuals: observation against prediction

export interface Component { name: string; observed: number; predicted: number; tolerance: number }
export interface Residual {
  kind: 'scalar' | 'vector';
  components: Component[];
  /** How far beyond the declared tolerance: for one component |observed − predicted| over |predicted| × tolerance; for several, with independent tolerances, the root of the summed squares (a Mahalanobis distance with a diagonal covariance). Above 1 the anomaly is alive. */
  beyond: number;
}

/** The residual of one or several components. Correlated, temporal and structural residuals would take a covariance or a structure here; none is built, and nothing here pretends to one. */
export const residual = (components: Component[]): Residual => ({
  kind: components.length === 1 ? 'scalar' : 'vector',
  components,
  beyond: Math.sqrt(components.reduce((acc, c) => acc + ((c.observed - c.predicted) / (Math.abs(c.predicted) * c.tolerance || Number.MIN_VALUE)) ** 2, 0)),
});

export type CandidateKind = 'within uncertainty' | 'model envelope' | 'parameter' | 'constant' | 'upstream law' | 'numerical artifact' | 'hidden variable' | 'sensor defect' | 'selection bias' | 'wrong causal direction' | 'bad assumption' | 'conventional theory';
export interface Explanation {
  kind: CandidateKind;
  says: string;
  settledBy: string;
  computed: boolean;
  closes?: boolean;
  /** Derived from the law's own graph (its inputs, constants, domain, ancestry) or taken from the standing checklist. */
  source: 'graph' | 'checklist';
  /** For a parameter or constant: which one, and the way it would have to move. */
  input?: string;
  direction?: 'up' | 'down';
}

export interface Measured { value: number | number[]; tolerance: number | number[]; names?: string[]; instrument: string; environment: string }
export interface Predicted { value: number | number[]; lawAncestry: string[]; modelVersion: string; exponent?: number; lambda?: number }

export interface Anomaly {
  id: string;
  observation: Measured;
  prediction: Predicted;
  residual: Residual;
  difference: number[];
  /** residual.beyond: the distance beyond the declared tolerance; above 1 the anomaly is alive. */
  sigma: number;
  replication: string;
  candidates: Explanation[];
  status: 'alive' | 'explained' | 'within tolerance';
  explanation?: string;
  structure: Structure;
}

const arr = (x: number | number[]): number[] => (Array.isArray(x) ? x : [x]);

/** The anomaly an observation makes against a prediction, or the agreement within tolerance; a known explanation closes it without erasing it. */
export function anomaly(id: string, observation: Measured, prediction: Predicted, opts: { replication?: string; explanation?: string } = {}): Anomaly {
  const obs = arr(observation.value), pred = arr(prediction.value), tol = arr(observation.tolerance);
  if (obs.length !== pred.length) throw new Error(`${id}: ${obs.length} observed components against ${pred.length} predicted`);
  const components: Component[] = obs.map((o, i) => ({ name: observation.names?.[i] ?? (obs.length === 1 ? 'value' : `c${i + 1}`), observed: o, predicted: pred[i]!, tolerance: tol[i] ?? tol[0]! }));
  const res = residual(components);
  const sigma = res.beyond;
  const candidates = skeptic(res, prediction);
  const status: Anomaly['status'] = sigma <= 1 ? 'within tolerance' : opts.explanation ? 'explained' : 'alive';
  const side = (which: 'observed' | 'predicted'): Structure => components.length === 1
    ? r('quantity', [d(`${id}:${which}`), q(which === 'observed' ? components[0]!.observed : components[0]!.predicted, '')], {})
    : r('state', components.map((c) => r('quantity', [d(`${id}:${c.name}:${which}`), q(which === 'observed' ? c.observed : c.predicted, '')], {})), {});
  const obsS: E = e(side('observed'), 'measured', observation.instrument, { by: observation.environment });
  const predS = side('predicted');
  (predS as R).c = { mech: prediction.lawAncestry.join('>'), ev: { how: 'derived', src: prediction.lawAncestry } };
  const structure: Structure = sigma > 1
    ? r('contradict', [obsS, predS], { mode: 'contradictory', margin: sigma, under: [`model ${prediction.modelVersion}`, ...(opts.explanation ? [`explained: ${opts.explanation}`] : [])] })
    : r('support', [obsS, predS], { dir: 1, mode: 'true', margin: sigma });
  return { id, observation, prediction, residual: res, difference: components.map((c) => c.observed - c.predicted), sigma, replication: opts.replication ?? 'measured once', candidates, status, ...(opts.explanation ? { explanation: opts.explanation } : {}), structure };
}

/** The slope of a law's output in one of its constants at the example: d ln y / d ln k, by a 1 % step. */
const constantSlope = (law: Law, k: string): number | null => {
  const consts = Object.fromEntries(Object.entries(law.constants ?? {}).map(([name, c]) => [name, c.value]));
  const at = { ...law.example.inputs, ...consts };
  try {
    const y0 = law.eval(at), y1 = law.eval({ ...at, [k]: consts[k]! * 1.01 });
    if (!Number.isFinite(y0) || !Number.isFinite(y1) || y0 === 0 || y1 <= 0 !== y0 <= 0) return null;
    return Math.log(Math.abs(y1 / y0)) / Math.log(1.01);
  } catch { return null; }
};

/**
 * The skeptic: the ordinary explanations first, derived from the law's own graph where they can be and computed:
 * the residual against its tolerance; for each law in the ancestry, its domain, each input's value that would
 * close the gap (along the family the law generates, and whether it stays in range), each constant's; then the
 * standing checklist, marked as such. It attacks the hypothesis and never defends what is accepted.
 */
export function skeptic(res: Residual, prediction: { lawAncestry: string[]; exponent?: number; lambda?: number }): Explanation[] {
  const out: Explanation[] = [];
  const sigma = res.beyond;
  const first = res.components[0]!;
  const ratio = first.predicted !== 0 ? first.observed / first.predicted : NaN;
  out.push({ kind: 'within uncertainty', says: sigma <= 1 ? `the residual is ${sigma.toFixed(2)} of the declared tolerance: no anomaly` : `the residual is ${sigma.toFixed(2)} times the declared tolerance${res.kind === 'vector' ? ` over ${res.components.length} components together` : ''}: not noise at the tolerance declared`, settledBy: 'the tolerance and a replication', computed: true, closes: sigma <= 1, source: 'graph' });
  if (prediction.exponent !== undefined && prediction.lambda !== undefined && prediction.lambda > 0 && prediction.lambda !== 1 && first.observed > 0) {
    const need = Math.log(first.observed) / Math.log(prediction.lambda);
    out.push({ kind: 'parameter', says: `the observation would be exact if the exponent were ${need.toFixed(3)} instead of ${prediction.exponent}`, settledBy: 'a third size, which tells one exponent from another', computed: true, closes: false, source: 'graph', input: 'exponent', direction: need > prediction.exponent ? 'up' : 'down' });
  }
  for (const lawId of prediction.lawAncestry) {
    const law = LAWS.find((l) => l.id === lawId);
    if (!law) { out.push({ kind: 'upstream law', says: `${lawId}: an ancestor of the prediction that is not a law of the book; its own tolerance is unknown here`, settledBy: 'its tolerance, read at its source', computed: false, source: 'graph' }); continue; }
    out.push({ kind: 'model envelope', says: `${law.name} holds for: ${law.valid}; if the observation lies outside that, the law was asked past its envelope`, settledBy: `the observation's inputs against the domain of ${law.name}`, computed: false, source: 'graph' });
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    for (const inp of law.inputs) {
      const held = { ...law.example.inputs }; const x0 = held[inp.sym]; if (!x0) continue; delete held[inp.sym];
      const fam = family(law, inp.sym, held);
      const y0 = fam.value(x0); if (!Number.isFinite(y0) || y0 === 0) continue;
      const s0 = fam.sensitivity(x0); if (!Number.isFinite(s0) || s0 === 0) continue;
      const guess = x0 * ratio ** (1 / s0);
      if (!Number.isFinite(guess) || guess <= 0) continue;
      const inside = fam.admissible(guess).ok;
      out.push({ kind: 'parameter', says: `${law.name}: the gap closes if ${inp.name} (${inp.sym}) were ${Number(guess.toPrecision(3))} ${inp.unit} instead of ${x0} ${inp.unit}${inside ? ', inside its range' : ', which is outside its range'}`, settledBy: `measuring ${inp.name}`, computed: true, closes: inside, source: 'graph', input: inp.sym, direction: guess > x0 ? 'up' : 'down' });
    }
    for (const [k, c] of Object.entries(law.constants ?? {})) {
      const s0 = constantSlope(law, k); if (!s0) continue;
      const guess = c.value * ratio ** (1 / s0);
      out.push({ kind: 'constant', says: `${law.name}: the gap closes if ${c.name} (${k}) were ${Number(guess.toPrecision(3))} ${c.unit} instead of ${c.value} ${c.unit}; a constant is not free, so this says the law was mis-stated, not that the constant moved`, settledBy: `the constant's value at its source`, computed: true, closes: false, source: 'graph', input: k, direction: guess > c.value ? 'up' : 'down' });
    }
  }
  out.push({ kind: 'numerical artifact', says: 'the engine\'s own tolerance (its step, its solver iterations) may be the difference', settledBy: 'the same measurement at half the step', computed: false, source: 'checklist' });
  const rest: [CandidateKind, string][] = [['hidden variable', 'a replication with the suspected variable controlled'], ['sensor defect', 'a second instrument'], ['selection bias', 'a different sample'], ['wrong causal direction', 'an intervention'], ['bad assumption', 'the assumptions listed and each one tested'], ['conventional theory', 'the known laws composed before a new one is written']];
  for (const [kind, settledBy] of rest) out.push({ kind, says: `${kind}: held as a candidate, not computed`, settledBy, computed: false, source: 'checklist' });
  return out;
}

const MODEL = 'law book, 3 October 2026';

/**
 * The engine's own register (src/ganglia/scale/observations.ts) read as anomalies: every scale observation against
 * the law book's prediction, at the tolerance the conformance test holds. One observation is also measured against
 * the naive prediction it broke (Froude's √λ for a cooling time), with the explanation the register gives: an
 * anomaly explained is kept, never erased.
 */
export function anomalies(): Anomaly[] {
  const out: Anomaly[] = [];
  for (const o of OBSERVATIONS as Observation[]) {
    out.push(anomaly(o.id, { value: o.measured, tolerance: o.tolerance, instrument: o.test, environment: o.source.cite }, { value: o.predicted, lawAncestry: o.compatible, modelVersion: MODEL, lambda: o.lambda }, { replication: 'every run of the conformance suite' }));
    if (o.id === 'observation.cooling-size') {
      out.push(anomaly(`${o.id}:against-froude`, { value: o.measured, tolerance: o.tolerance, instrument: o.test, environment: o.source.cite }, { value: Math.sqrt(o.lambda), lawAncestry: ['scale.froude'], modelVersion: MODEL, exponent: 0.5, lambda: o.lambda },
        { replication: 'every run of the conformance suite', explanation: 'the thermal world is not Froude-similar: free convection (h ∝ (ΔT/L)^¼) plus radiation, integrated by the law book, gives 2.18 for a cooling time, between λ (h held) and λ^1.25 (laminar convection alone); the engine reproduces it' }));
    }
  }
  return out;
}

/** The anomalies still alive: beyond tolerance and without an explanation. */
export const alive = (as: Anomaly[] = anomalies()): Anomaly[] => as.filter((a) => a.status === 'alive');

// ---- clusters: what anomalies share in the graph

export interface AnomalyCluster {
  members: string[];
  /** The laws every member's prediction descends from. */
  ancestry: string[];
  /** The parameters that close every member's gap, with the way each must move (`P:down`). */
  parameters: string[];
  why: string;
}

/**
 * Anomalies beyond tolerance, grouped by shared law ancestry, with the parameter that closes all of them when one
 * does. Not by the look of their structures: two anomalies against the same law with different magnitudes and
 * instruments belong together; two that look alike against different laws do not. Regime, time correlation and a
 * latent cause are not built as signals; the cluster says what it shares and nothing more.
 */
export function clusterAnomalies(as: Anomaly[]): AnomalyCluster[] {
  const live = as.filter((a) => a.sigma > 1);
  const parent = live.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (live[i]!.prediction.lawAncestry.some((l) => live[j]!.prediction.lawAncestry.includes(l))) parent[find(i)] = find(j);
  const groups = new Map<number, Anomaly[]>();
  live.forEach((a, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), a]));
  return [...groups.values()].map((members) => {
    const ancestry = members[0]!.prediction.lawAncestry.filter((l) => members.every((m) => m.prediction.lawAncestry.includes(l)));
    const closers = (a: Anomaly): string[] => a.candidates.filter((c) => c.kind === 'parameter' && c.closes && c.input).map((c) => `${c.input}:${c.direction}`);
    const parameters = closers(members[0]!).filter((p) => members.every((m) => closers(m).includes(p)));
    const why = members.length === 1 ? 'shares its ancestry with no other anomaly' : `${members.length} anomalies descend from ${ancestry.join(', ') || 'no common law'}${parameters.length ? `; each closes with ${parameters.map((p) => p.replace(':', ' ')).join(', ')}` : '; no one parameter closes them all'}`;
    return { members: members.map((m) => m.id), ancestry, parameters, why };
  });
}
