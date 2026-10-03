// What a statement is: axiom, theorem, derivation, empirical law, observation, model, hypothesis, conjecture. A claim
// carries its status and never changes it silently: a promotion needs evidence of the kind the new status demands,
// and the history is kept. The proposition that reality is structurally equivalent across all scales is held here as
// a formal hypothesis, with its axioms, its formulation, what it predicts, what agrees, what conflicts (derived from
// the law book: the constants that set absolute scales), what would falsify it, and what is unresolved.
import { LAWS } from '../laws';
import { OBSERVATIONS } from './observations';
import type { Source } from '../types';
import { GROUPS, groupUnder } from './groups';
import { classifyAll, scaleSetters } from './covariance';
import { SIMILARITIES, absoluteScale, planckUnits, type Epistemic } from './transform';

export interface Claim {
  id: string;
  status: Epistemic;
  statement: string;
  axioms: string[];
  formulation: string;
  predictions: string[];
  compatible: string[];
  conflicting: string[];
  falsification: string[];
  unresolved: string[];
  history: { from: Epistemic; to: Epistemic; evidence: string; at: string }[];
  source: Source;
}

/** What a status needs to be reached: the evidence a promotion must name. Nothing moves without it. */
export const NEEDS: Record<Epistemic, string> = {
  axiom: 'a statement taken without proof, declared as such',
  theorem: 'a proof from axioms or theorems, by name',
  derivation: 'a derivation from laws or theorems, by name, with its assumptions',
  'empirical-law': 'measurements over a stated range, with a source',
  observation: 'a measurement or a record, with its observer and its date',
  model: 'an idealisation with its assumptions and where it is known to fail',
  hypothesis: 'a formulation with predictions and falsification conditions',
  conjecture: 'a statement without a formulation yet',
};

/** Which promotions are allowed at all: a conjecture becomes a hypothesis when formulated; a hypothesis a theorem or empirical law when proved or measured; an observation never becomes a law by itself. */
const ALLOWED: Record<Epistemic, Epistemic[]> = {
  conjecture: ['hypothesis'],
  hypothesis: ['theorem', 'empirical-law', 'model', 'conjecture'],
  model: ['theorem', 'empirical-law', 'hypothesis'],
  'empirical-law': ['theorem', 'hypothesis'],
  derivation: ['theorem', 'hypothesis'],
  theorem: ['hypothesis'],
  observation: [],
  axiom: [],
};

export class StatusRefused extends Error { constructor(readonly claim: string, readonly from: Epistemic, readonly to: Epistemic, why: string) { super(`${claim}: ${from} → ${to} refused: ${why}`); } }

/** A claim with a new status, only with evidence of the kind the status needs; the old claim is not touched. */
export function promote(c: Claim, to: Epistemic, evidence: string, at = new Date().toISOString().slice(0, 10)): Claim {
  if (c.status === to) throw new StatusRefused(c.id, c.status, to, 'it already is');
  if (!ALLOWED[c.status].includes(to)) throw new StatusRefused(c.id, c.status, to, `a ${c.status} does not become a ${to}; ${to === 'axiom' ? 'nothing becomes an axiom' : `it may become ${ALLOWED[c.status].join(' or ') || 'nothing'}`}`);
  if (!evidence || evidence.trim().length < 12) throw new StatusRefused(c.id, c.status, to, `needs ${NEEDS[to]}`);
  return { ...c, status: to, history: [...c.history, { from: c.status, to, evidence, at }] };
}

const SOURCE: Source = { cite: 'Buckingham (1914); Bridgman (1922); Barenblatt, Scaling, Self-similarity and Intermediate Asymptotics, Cambridge 1996; Planck (1899); Kleiber (1932); West, Brown & Enquist (1997); Wilson, "Renormalization group and critical phenomena", Rev. Mod. Phys. 55 (1983) 583', kind: 'paper' };

/** The hypothesis, with what the law book says about it, derived at call time. */
export function universalScaleStructuralEquivalence(lambda = 10): Claim & { derived: { covariantLaws: number; scaleDependentLaws: number; invariantGroups: number; setters: string[]; absolute: ReturnType<typeof absoluteScale>; planck: ReturnType<typeof planckUnits> } } {
  const setters = scaleSetters();
  const fundamental = setters.filter((s) => /speed of light|gravitational constant|Boltzmann|Planck|permittivity|permeability/i.test(s.name));
  const absolute = absoluteScale([{ sym: 'c', unit: 'm/s', value: 299792458 }, { sym: 'hbar', unit: 'J s', value: 1.054571817e-34 }, { sym: 'G', unit: 'm^3/kg s^2', value: 6.6743e-11 }]);
  const planck = planckUnits();
  // the law book under the engineering similarities, with the same material: what is covariant and what is not
  const rows = SIMILARITIES.filter((t) => t.holds.includes('material')).flatMap((t) => classifyAll(t, lambda));
  const covariantLaws = new Set(rows.filter((r) => r.verdict === 'covariant' || r.verdict === 'invariant').map((r) => r.law)).size;
  const dependent = rows.filter((r) => r.verdict === 'scale-dependent');
  const scaleDependentLaws = new Set(dependent.map((r) => r.law)).size;
  const invariantGroups = GROUPS.filter((g) => SIMILARITIES.some((t) => groupUnder(g, t).invariant)).length;
  const byConstant = new Map<string, Set<string>>();
  for (const r of dependent) for (const c of r.setsScale) (byConstant.get(c.sym) ?? byConstant.set(c.sym, new Set()).get(c.sym)!).add(r.law);
  return {
    id: 'hypothesis.universal-scale-structural-equivalence',
    status: 'hypothesis',
    statement: 'Physical reality exhibits structurally equivalent dynamics across scale: the differences in apparent behaviour arise from transformations of spatial scale, temporal scale, information propagation, characteristic process rates and observation, not from different generative structure.',
    axioms: [
      'A1 (dimensional homogeneity): every law is a relation among quantities with dimensions, and holds in any consistent system of units (Buckingham).',
      'A2 (scale as transformation): a change of scale is an operator λ on the base dimensions with stated exponents, not a category.',
      'A3 (observation as projection): what an observer records is the real state projected through its resolutions, latencies and model.',
      'A4 (one world): there is one reality with many descriptions; descriptions at different scales are related by coarse-graining and refinement maps.',
    ],
    formulation: 'For every law LAW(X) = 0 and every scale transformation S_λ in a regime R, LAW(S_λ X) = 0 (covariance), and for every relational pattern P realised at scale L there is a structurally equivalent pattern at scale λL for all λ within R; in the strong form, R is all scales.',
    predictions: [
      'Every dimensionless group Π is invariant under any transformation that scales the quantities in it by their dimensions.',
      'Laws without dimensional constants are covariant under every similarity; laws with dimensional constants are covariant only under transformations that leave those constants\' dimensions unscaled.',
      'The same relational patterns (feedback, pumping, rotary conversion, bearing, transport network) recur at scales differing by many orders of magnitude.',
      'A model test at one scale predicts the full scale when the governing groups are matched; when they cannot all be matched, the mismatch is exactly the groups the transformation does not preserve.',
    ],
    compatible: [
      `${covariantLaws} of ${LAWS.length} executable laws are covariant or invariant under at least one same-material similarity at λ = ${lambda}: their form does not know the size.`,
      `${invariantGroups} of ${GROUPS.length} dimensionless groups are invariant under at least one similarity; the ones each similarity preserves are exactly the ones it was derived to.`,
      'Model testing works (Froude for ships and walkers, Reynolds for pipes, Cauchy for structures) and its known failures are the unpreserved groups: a derived consequence, observed for a century.',
      'Allometry: metabolic rate goes as M^¾ across 20 orders of magnitude in mass (Kleiber); a scaling regularity, with a proposed generative structure (fractal supply networks).',
      'Critical phenomena: near a phase transition the same exponents govern magnets, fluids and alloys (universality under the renormalisation group): structural equivalence across scale, proved for that regime.',
      'Fully developed turbulence: the Kolmogorov cascade is self-similar over the inertial range.',
      ...OBSERVATIONS.map((o) => `Measured in the engine: ${o.statement}`),
    ],
    conflicting: [
      `${absolute.says}: Planck length ${planck.length.toExponential(2)} m, time ${planck.time.toExponential(2)} s, mass ${planck.mass.toExponential(2)} kg. No scale transformation but the identity keeps c, ħ and G: the universe is not scale-free.`,
      `Atoms have a size: with e, m_e and ħ fixed, the Bohr radius is fixed, so no material is the same material at a different scale; the material "properties" held fixed by every engineering similarity are the fingerprint of that absolute scale.`,
      `${scaleDependentLaws} laws of the book are scale-dependent under the same-material similarities because a constant inside them sets a scale: ${[...byConstant].slice(0, 6).map(([c, ls]) => `${c} (${[...ls].slice(0, 3).join(', ')}${ls.size > 3 ? ', …' : ''})`).join('; ')}.`,
      'Regimes change with size at fixed material: surface tension rules below the capillary length (2.7 mm in water), viscosity below Re ≈ 1, quantum effects below the de Broglie wavelength, relativity near c, gravity at planetary mass: the same structure does not recur across those boundaries; a different one does.',
      `Fundamental constants in the law book that set scales: ${fundamental.map((s) => `${s.sym} (${s.name.split('(')[0]!.trim()})`).join(', ') || 'none recorded'}.`,
    ],
    falsification: [
      'A dimensionless group measured to change with λ inside a regime claimed invariant, with the transformation and the held quantities stated.',
      'A relational pattern claimed to recur at a scale where the governing groups cross a regime boundary and the pattern does not reappear (an insect-sized walker that must run at Fr 0.5 cannot be a scaled person: it is a different gait structure).',
      'For the strong form: the existence of three independent dimensional constants (c, ħ, G): already observed, so the strong form is falsified; the weak form (equivalence within regimes bounded by those constants) stands as a theorem of dimensional analysis.',
    ],
    unresolved: [
      'Whether the ¾ exponent of allometry is a theorem of a generative structure (WBE) or a regularity with several causes (measured 0.65 to 0.78).',
      'Whether universality classes of critical phenomena extend to living and engineered systems far from equilibrium.',
      'What "structural equivalence" is, formally, for patterns that are not laws: the similarity measure used by the analogue search is a stated choice (shared functions, transformations, feedback, flows), not a derivation.',
      'The observer: whether every perceived difference between scales reduces to resolution, latency and model, or some is intrinsic.',
    ],
    history: [],
    source: SOURCE,
    derived: { covariantLaws, scaleDependentLaws, invariantGroups, setters: setters.map((s) => s.sym), absolute, planck },
  };
}
