// Discovery (docs/NEX-DISCOVERY.md): the epistemology under audit. Human knowledge enters the Nexus as evidence,
// never as authority; what no human has named has the same truth value as anything else (a label never enters a
// hash: the hard test); unknown, unobserved, unmodelled, unmeasured, insufficient and false are six modes that hash
// and render apart. What is built here is what those principles need to become operations:
//
//   axes(h)          three independent coordinates of a hypothesis: human coverage, physical support, theory
//                    compatibility, each read from a different place, and the kind they make together
//   certificate(c)   "impossible" only with a negative derivation: a law that bounds the claimed quantity, its
//                    assumptions, the bound evaluated inside the law's domain, the claim beyond it; else the precise
//                    weaker mode (unknown, outside-domain, undefined), never impossible
//   anomaly(...)     observation against prediction beyond the declared tolerance, kept with everything a later
//                    reader needs, alive until explained; anomalies() reads the engine's own register
//   skeptic(...)     the strongest ordinary explanations first, computed where they can be: within uncertainty, the
//                    model's envelope, a parameter that would close the gap (and whether it stays in range), the
//                    engine's own tolerance; the rest held as candidates with what would settle them

import type { Law } from '../types';
import { LAWS, use } from '../laws';
import type { Substrate } from '../substrate/substrate';
import { dimensionOf, sameDim, type Dim } from '../units';
import { OBSERVATIONS, type Observation } from '../scale/observations';
import { d, e, evidenceRank, q, r, type E, type Evidence, type Mode, type R, type Structure } from './core';
import { family } from './space';

// ---- a claim about a quantity, and its certificate

export interface Claim { thing?: string; quantity: string; value: number; unit: string; inputs: Record<string, number> }

export type Certificate =
  | { impossible: true; mode: 'impossible-under'; law: Law; bound: number; sense: 'most' | 'least'; assumptions: string[]; derivation: string; structure: R }
  | { impossible: false; mode: Mode; why: string; law?: Law; bound?: number; structure?: R };

/** A law that bounds its output: said by the output's name (most, least, smallest…) or by its formula opening with the output and ≤ or ≥ (a ≤ deeper in a formula is a cap on an input, not a bound on the output). */
export const boundSense = (law: Law): 'most' | 'least' | null => {
  const n = law.output.name.toLowerCase();
  const opening = law.formula.match(/^(\S+)\s*([≤≥])/);
  const sign = opening && opening[1]!.replace(/[_′']/g, '') === law.output.sym.replace(/_/g, '') ? opening[2] : null;
  if (/^(?:most|maximum|max |greatest|highest)/.test(n) || sign === '≤') return 'most';
  if (/^(?:least|minimum|min |smallest|lowest)/.test(n) || sign === '≥') return 'least';
  return null;
};

const quantityOf = (law: Law, value: number, en: string): R => r('quantity', [d(law.output.sym, { en }), q(value, law.output.unit)], {});

/**
 * "Impossible" only with a negative derivation: a law of the book that bounds the claimed quantity, evaluated inside
 * its own domain at the claim's inputs, with the claim beyond the bound. Then the certificate names the assumptions
 * (the law's validity and the inputs it was given), the law, the derivation and the contradiction, in mode
 * impossible-under with the assumptions under it. No bounding law: unknown, not impossible. The law outside its
 * domain at those inputs: outside-domain. The claim inside the bound: true, consistent.
 */
export function certificate(c: Claim): Certificate {
  let dim: Dim;
  try { dim = dimensionOf(c.unit); } catch { return { impossible: false, mode: 'undefined', why: `${c.unit} is not a unit I can read` }; }
  const want = c.quantity.toLowerCase();
  const bounds = LAWS.filter((l) => {
    if (!boundSense(l) || !l.inputs.every((x) => c.inputs[x.sym] !== undefined)) return false;
    try { if (!sameDim(dimensionOf(l.output.unit), dim)) return false; } catch { return false; }
    const named = l.output.name.toLowerCase();
    return named.includes(want) || want.includes(named.replace(/^(?:most|least|maximum|minimum) /, ''));
  });
  if (!bounds.length) return { impossible: false, mode: 'unknown', why: `no law of mine bounds ${c.quantity} with these inputs; no certificate, so not impossible: unknown` };
  const claimed = q(c.value, c.unit).v;
  const law = bounds[0]!;
  const outside = law.outside?.(c.inputs);
  if (outside) return { impossible: false, mode: 'outside-domain', why: `${law.name} does not hold at these inputs: ${outside}`, law };
  const { value } = use(law.id, c.inputs);
  const sense = boundSense(law)!;
  const beyond = sense === 'most' ? claimed > value * (1 + 1e-9) : claimed < value * (1 - 1e-9);
  const claimS = quantityOf(law, claimed, c.quantity);
  claimS.c = { ev: { how: 'hypothesized' } };
  if (!beyond) return { impossible: false, mode: 'true', why: `${law.name} allows it: the ${sense === 'most' ? 'ceiling' : 'floor'} is ${Number(value.toPrecision(4))} ${law.output.unit} and the claim is ${Number(claimed.toPrecision(4))} ${law.output.unit}`, law, bound: value, structure: claimS };
  const assumptions = [`${law.name} holds: ${law.valid}`, ...Object.entries(c.inputs).map(([k, v]) => `${law.inputs.find((x) => x.sym === k)?.name ?? k} = ${v}`)];
  const derivation = `${law.name} (${law.formula}) at these inputs gives ${sense === 'most' ? 'at most' : 'at least'} ${Number(value.toPrecision(4))} ${law.output.unit}; the claim is ${Number(claimed.toPrecision(4))} ${law.output.unit}; so assumptions + law + claim ⇒ ⊥`;
  const boundS = quantityOf(law, value, law.output.name);
  boundS.c = { mech: law.id, ev: { how: 'derived', src: [law.source.cite] }, mode: 'true' };
  const structure = r('contradict', [claimS, boundS], { mode: 'impossible-under', under: assumptions, mech: law.id, ev: { how: 'derived', src: [law.source.cite] } });
  return { impossible: true, mode: 'impossible-under', law, bound: value, sense, assumptions, derivation, structure };
}

// ---- the three axes of a hypothesis (independent by construction: each is read from a different place)

export interface Axes {
  /** Human knowledge coverage, 0 to 1: how far what the hypothesis names is described by sources (0 for a coined distinction). */
  coverage: number;
  /** Physical evidential support, 0 to 1: the strongest evidence leaf on it (theorem or measured 1, calibrated 0.9, simulated 0.6, derived 0.4, estimated 0.3, hypothesized 0). */
  support: number;
  /** Compatibility with the laws: compatible, incompatible (a certificate exists), or untested (no law reaches it). */
  theory: 'compatible' | 'incompatible' | 'untested';
  kind: 'established' | 'new but consistent' | 'radical hypothesis' | 'high-value anomaly' | 'unsupported' | 'untested';
}

const LAW_SYMBOLS: ReadonlySet<string> = new Set(LAWS.flatMap((l) => [l.output.sym, ...l.inputs.map((x) => x.sym)]));
const SUPPORT: Record<Evidence, number> = { theorem: 1, derived: 0.4, measured: 1, calibrated: 0.9, simulated: 0.6, estimated: 0.3, extrapolated: 0.3, hypothesized: 0, assumed: 0, fictional: 0 };

const distinctions = (s: Structure, out: string[] = []): string[] => {
  switch (s.k) {
    case 'D': out.push(s.id); break;
    case 'R': for (const x of s.args) distinctions(x, out); break;
    case 'T': distinctions(s.from, out); distinctions(s.to, out); break;
    case 'E': distinctions(s.of, out); break;
    case 'C': distinctions(s.body, out); break;
    default: break;
  }
  return out;
};
const evidences = (s: Structure, out: Evidence[] = []): Evidence[] => {
  if (s.k === 'E') { out.push(s.how); evidences(s.of, out); }
  else if (s.k === 'R') { if (s.c.ev) out.push(s.c.ev.how); for (const x of s.args) evidences(x, out); }
  else if (s.k === 'T') { if (s.c.ev) out.push(s.c.ev.how); evidences(s.from, out); evidences(s.to, out); }
  else if (s.k === 'C') evidences(s.body, out);
  return out;
};

/**
 * The axes of a hypothesis, each read from its own place: coverage from the substrate (what sources say of the
 * distinctions it names; a coined one scores 0), support from its evidence leaves, theory from a certificate on the
 * claim it makes (or, without a claim, from the mode its structure already carries). Renaming every distinction moves
 * coverage alone; measuring moves support alone; a law moves theory alone.
 */
export function axes(h: Structure, s: Substrate | null, claim?: Claim): Axes {
  // a law's symbol (eta, P, T) belongs to the theory axis, not to human coverage of the things named
  const ids = [...new Set(distinctions(h))].filter((id) => !LAW_SYMBOLS.has(id));
  const covered = ids.map((id) => { const ent = s?.get(id); return ent ? Math.max(0, Math.min(1, ent.coverage.confidence)) * (ent.coverage.sourceKind === 'stub' ? 0.2 : 1) : 0; });
  const coverage = covered.length ? covered.reduce((a, b) => a + b, 0) / covered.length : 0;
  const evs = evidences(h);
  const support = evs.length ? Math.max(...evs.map((x) => SUPPORT[x])) : 0;
  let theory: Axes['theory'] = 'untested';
  if (claim) { const c = certificate(claim); theory = c.impossible ? 'incompatible' : c.mode === 'true' ? 'compatible' : 'untested'; }
  else if (h.k === 'R' && (h.c.mode === 'impossible-under' || h.c.mode === 'contradictory')) theory = 'incompatible';
  else if (h.k === 'R' && h.c.mode === 'true' && evs.some((x) => evidenceRank(x) <= evidenceRank('derived'))) theory = 'compatible';
  const kind: Axes['kind'] =
    theory === 'incompatible' ? (support >= 0.6 ? 'high-value anomaly' : 'radical hypothesis')
      : coverage >= 0.5 && support >= 0.6 ? 'established'
        : theory === 'compatible' && coverage < 0.5 ? 'new but consistent'
          : support === 0 && theory === 'untested' ? 'untested'
            : 'unsupported';
  return { coverage: Math.round(coverage * 100) / 100, support, theory, kind };
}

/** A hypothesis's three axes, said. */
export const sayAxes = (a: Axes): string => `human coverage ${a.coverage}, physical support ${a.support}, theory ${a.theory}: ${a.kind}`;

// ---- anomalies: observation against prediction, kept alive

export type CandidateKind = 'within uncertainty' | 'model envelope' | 'parameter' | 'numerical artifact' | 'hidden variable' | 'sensor defect' | 'selection bias' | 'wrong causal direction' | 'bad assumption' | 'conventional theory';
export interface Explanation { kind: CandidateKind; says: string; settledBy: string; computed: boolean; closes?: boolean }

export interface Measured { value: number; tolerance: number; instrument: string; environment: string }
export interface Predicted { value: number; lawAncestry: string[]; modelVersion: string; exponent?: number; lambda?: number }

export interface Anomaly {
  id: string;
  observation: Measured;
  prediction: Predicted;
  difference: number;
  /** The difference over the declared tolerance of the prediction: above 1 the anomaly is alive. */
  sigma: number;
  replication: string;
  candidates: Explanation[];
  status: 'alive' | 'explained' | 'within tolerance';
  explanation?: string;
  structure: Structure;
}

/** The anomaly an observation makes against a prediction, or the agreement within tolerance; a known explanation closes it without erasing it. */
export function anomaly(id: string, observation: Measured, prediction: Predicted, opts: { replication?: string; explanation?: string } = {}): Anomaly {
  const difference = observation.value - prediction.value;
  const sigma = Math.abs(difference) / (Math.abs(prediction.value) * observation.tolerance || Number.MIN_VALUE);
  const candidates = skeptic(observation, prediction, sigma);
  const status: Anomaly['status'] = sigma <= 1 ? 'within tolerance' : opts.explanation ? 'explained' : 'alive';
  const obsS: E = e(r('quantity', [d(`${id}:observed`), q(observation.value, '')], {}), 'measured', observation.instrument, { by: observation.environment });
  const predS = r('quantity', [d(`${id}:predicted`), q(prediction.value, '')], { mech: prediction.lawAncestry.join('>'), ev: { how: 'derived', src: prediction.lawAncestry } });
  const structure: Structure = sigma > 1
    ? r('contradict', [obsS, predS], { mode: 'contradictory', margin: sigma, under: [`model ${prediction.modelVersion}`, ...(opts.explanation ? [`explained: ${opts.explanation}`] : [])] })
    : r('support', [obsS, predS], { dir: 1, mode: 'true', margin: sigma });
  return { id, observation, prediction, difference, sigma, replication: opts.replication ?? 'measured once', candidates, status, ...(opts.explanation ? { explanation: opts.explanation } : {}), structure };
}

/** The skeptic: the strongest ordinary explanations first, computed where they can be; it attacks the hypothesis, never defends what is accepted. */
export function skeptic(observation: { value: number; tolerance: number }, prediction: { value: number; lawAncestry: string[]; exponent?: number; lambda?: number }, sigma: number): Explanation[] {
  const out: Explanation[] = [];
  out.push({ kind: 'within uncertainty', says: sigma <= 1 ? `the difference is ${sigma.toFixed(2)} of the declared tolerance: no anomaly` : `the difference is ${sigma.toFixed(2)} times the declared tolerance: not noise at the tolerance declared`, settledBy: 'the tolerance and a replication', computed: true, closes: sigma <= 1 });
  if (prediction.exponent !== undefined && prediction.lambda !== undefined && prediction.lambda > 0 && prediction.lambda !== 1 && observation.value > 0) {
    const need = Math.log(observation.value) / Math.log(prediction.lambda);
    out.push({ kind: 'parameter', says: `the observation would be exact if the exponent were ${need.toFixed(3)} instead of ${prediction.exponent}`, settledBy: 'a third size, which tells one exponent from another', computed: true, closes: false });
  }
  for (const lawId of prediction.lawAncestry) {
    const law = LAWS.find((l) => l.id === lawId);
    if (!law) continue;
    out.push({ kind: 'model envelope', says: `${law.name} holds for: ${law.valid}; if the observation lies outside that, the law was asked past its envelope`, settledBy: `the observation's inputs against the domain of ${law.name}`, computed: false });
    // a parameter of the law that would close the gap, found along its family from the worked example, and whether it stays inside the domain
    for (const inp of law.inputs) {
      const held = { ...law.example.inputs }; const x0 = held[inp.sym]; if (!x0) continue; delete held[inp.sym];
      const fam = family(law, inp.sym, held);
      const y0 = fam.value(x0); if (!Number.isFinite(y0) || y0 === 0) continue;
      const s0 = fam.sensitivity(x0); if (!Number.isFinite(s0) || s0 === 0) continue;
      const guess = x0 * (observation.value / prediction.value) ** (1 / s0);
      if (!Number.isFinite(guess) || guess <= 0) continue;
      const inside = fam.admissible(guess).ok;
      out.push({ kind: 'parameter', says: `${law.name}: the gap closes if ${inp.name} (${inp.sym}) were ${Number(guess.toPrecision(3))} ${inp.unit} instead of ${x0} ${inp.unit}${inside ? ', inside its range' : ', which is outside its range'}`, settledBy: `measuring ${inp.name}`, computed: true, closes: inside });
    }
  }
  out.push({ kind: 'numerical artifact', says: 'the engine\'s own tolerance (its step, its solver iterations) may be the difference', settledBy: 'the same measurement at half the step', computed: false });
  const rest: [CandidateKind, string][] = [['hidden variable', 'a replication with the suspected variable controlled'], ['sensor defect', 'a second instrument'], ['selection bias', 'a different sample'], ['wrong causal direction', 'an intervention'], ['bad assumption', 'the assumptions listed and each one tested'], ['conventional theory', 'the known laws composed before a new one is written']];
  for (const [kind, settledBy] of rest) out.push({ kind, says: `${kind}: held as a candidate, not computed`, settledBy, computed: false });
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

/** The anomalies still alive: observation against prediction beyond tolerance and without an explanation. */
export const alive = (as: Anomaly[] = anomalies()): Anomaly[] => as.filter((a) => a.status === 'alive');
