// A study: the same intent realized with one coupling's quantities varied, every run a system in the journal, the
// disagreements between the static derivation and the kernel gathered as failure terms, and the missing distinction
// abduced over the coupling's quantity types. What comes out is a relation over types with the bound the
// observations fix, or the statement of which quantities the next observation must vary.

import { candidates, discriminates, promote, validate, Language, type Candidate, type Observation, type Relation } from './abduce';
import { beamOnTwoSupports, lumberCatalogue, materialLeaves, partXXV, type BeamIntent, type Slice } from './beam';
import { ofLeaf, type Derivation } from './evaluate';
import { anomalyOf, type Failure } from './failure';
import type { Jolt } from './realize';
import { leaf } from './term';

export interface RestCase { patch: number; across: number }

export interface Study {
  slices: Slice[];
  observations: Observation[];
  failures: Failure[];
  candidates: Candidate[];
  /** The separating candidates, simplest first. */
  separating: Candidate[];
  /** The unique simplest separating candidate, or null when several tie: then `vary` names what the next observation must vary. */
  chosen: Candidate | null;
  ambiguous: Candidate[];
  vary: string[];
  relation: Relation | null;
  language: Language;
}

/** The intent of Part XXV with the carried thing's footprint varied. */
export function restIntent(c: RestCase, by = 'the person'): BeamIntent {
  const base = partXXV(by);
  return { ...base, patch: leaf('length of the thing carried, along the beam', c.patch, 'm', { class: 'given', by }), across: leaf('width of the thing carried, across the beam', c.across, 'm', { class: 'given', by }) };
}

/** The observation a slice yields of its load's rest coupling: the quantities it carries, and whether the kernel settled. */
export function observe(s: Slice): Observation | null {
  if (!s.configuration || !s.realization) return null;
  const st = s.configuration.stability['the load on the beam']!;
  const bound = s.choice.pick!.solution.bound;
  return {
    system: s.journal.records()[0]!.hash + ':' + s.intent.patch.hash + ':' + s.intent.across.hash,
    coupling: 'the load on the beam',
    quantities: { hcm: st.hcm, halfX: st.halfX, halfZ: st.halfZ, g: bound['g']!, patience: s.observer.patience, mass: bound['m']! },
    observed: s.realization.inPlace,
    derived: s.configuration.rests,
  };
}

/** The unique simplest separating candidate, or the tie. */
export function choose(cs: Candidate[]): { chosen: Candidate | null; ambiguous: Candidate[]; separating: Candidate[] } {
  const separating = cs.filter((c) => c.separates);
  if (!separating.length) return { chosen: null, ambiguous: [], separating };
  const complexity = (c: Candidate) => Object.values(c.group.exponents).reduce((s, x) => s + Math.abs(x), 0);
  const least = Math.min(...separating.map(complexity));
  const simplest = separating.filter((c) => complexity(c) === least);
  return simplest.length === 1 ? { chosen: simplest[0]!, ambiguous: [], separating } : { chosen: null, ambiguous: simplest, separating };
}

/** Run the cases, gather the failures, abduce. */
export function restStudy(J: Jolt, cases: RestCase[], language = new Language()): Study {
  const slices = cases.map((c) => beamOnTwoSupports(restIntent(c), materialLeaves('wood.douglas-fir'), lumberCatalogue(), J));
  const observations = slices.map(observe).filter((o): o is Observation => !!o);
  const failures = slices.flatMap((s) => s.comparisons.map(anomalyOf).filter((f): f is Failure => !!f));
  const cs = candidates(observations);
  const { chosen, ambiguous, separating } = choose(cs);
  const vary = ambiguous.length > 1 ? [...new Set(ambiguous.flatMap((a, i) => ambiguous.slice(i + 1).flatMap((b) => discriminates(a, b))))] : [];
  let relation: Relation | null = null;
  if (chosen && failures.length && validate(chosen).holds && chosen.generality >= 2) relation = language.add(promote(chosen, `rests in place in ${slices[0]!.contract.name}`));
  return { slices, observations, failures, candidates: cs, separating, chosen, ambiguous, vary, relation, language };
}

/** Whether a configuration's rest couplings satisfy the language's promoted relations: each a record, 1 when admitted. */
export function admit(language: Language, s: Slice, g: Derivation, mass: Derivation): { coupling: string; relation: Relation; holds: Derivation }[] {
  if (!s.configuration) return [];
  const out: { coupling: string; relation: Relation; holds: Derivation }[] = [];
  for (const [coupling, st] of Object.entries(s.configuration.stability)) {
    for (const j of language.judge({ hcm: st.hcm, halfX: st.halfX, halfZ: st.halfZ, g, patience: s.observer.patience, mass })) out.push({ coupling, relation: j.relation, holds: j.holds });
  }
  return out;
}

export const noTolerance = () => ofLeaf(leaf('no tolerance on a yes or no', 0, '1', { class: 'configuration', source: 'a binary outcome either agrees or does not' }));
