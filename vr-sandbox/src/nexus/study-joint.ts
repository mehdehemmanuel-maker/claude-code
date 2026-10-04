// A study over the joint coupling: the same bracket realized with the load and the bolt group varied, the
// derivation's prediction of the joint holding compared with the kernel's, and the missing distinction abduced
// over the joint's quantity types. The residual rule: only observations the language already predicts to hold
// enter the abduction, since the ones it predicts to fail are explained; the missing relation is what separates,
// among those, the ones that held from the ones that broke.

import { candidates, promote, validate, Language, type Candidate, type Observation, type Relation } from './abduce';
import { bracketIntent, bracketMaterial, bracketOnPost, boltCatalogue, type BracketSlice } from './bracket';
import { lumberCatalogue } from './beam';
import { anomalyOf, type Failure } from './failure';
import type { Jolt } from './realize';
import { choose } from './study';
import { leaf } from './term';
import type { Option } from './solve';

export interface JointCase { mass: number; reach: number; bolt: string; count: number; patch?: number; across?: number; postSide?: number }

export interface JointStudy {
  slices: BracketSlice[];
  observations: Observation[];
  /** The observations the language predicts to hold: the residual the abduction must explain. */
  residual: Observation[];
  failures: Failure[];
  candidates: Candidate[];
  separating: Candidate[];
  chosen: Candidate | null;
  ambiguous: Candidate[];
  relation: Relation | null;
  language: Language;
}

/** The bolt groups of the study: the sizes below the catalogue's too, so the joint can be made to fail with a load that still rests. */
export function studyBolts(): Option[] {
  const extra: Option[] = [];
  for (const [name, d, p] of [['M3', 0.003, 0.0005], ['M4', 0.004, 0.0007], ['M5', 0.005, 0.0008]] as const) for (const n of [1, 2]) {
    const base = boltCatalogue()[0]!;
    extra.push({ label: `${name} ×${n}`, leaves: { d: leaf(`${name} nominal diameter`, d, 'm', { class: 'configuration', source: 'ISO 262 metric coarse threads' }), p: leaf(`${name} pitch`, p, 'm', { class: 'configuration', source: 'ISO 262 metric coarse threads' }), Rm: base.leaves['Rm']!, nb: leaf(`${n} bolt${n > 1 ? 's' : ''}`, n, '1', { class: 'configuration', source: 'the bolts the person can fit on the face' }) } });
  }
  return [...extra, ...boltCatalogue()];
}

/** The catalogue for one case: the study's fixed section with the case's bolt group alone, so the kernel is asked about that group. */
function catalogueFor(c: JointCase, section: string): Option[] {
  const bolt = studyBolts().find((b) => b.label === `${c.bolt} ×${c.count}`);
  if (!bolt) throw new Error(`no bolt group ${c.bolt} ×${c.count} in the study`);
  const s = lumberCatalogue().find((x) => x.label === section);
  if (!s) throw new Error(`no section ${section} in the catalogue`);
  return [{ label: `${s.label} + ${bolt.label}`, leaves: { ...s.leaves, ...bolt.leaves } }];
}

export function observeJoint(s: BracketSlice): Observation | null {
  if (!s.configuration || !s.realization) return null;
  const bound = s.choice.pick!.solution.bound;
  return {
    system: `${s.intent.mass.hash}:${s.intent.reach.hash}:${s.choice.pick!.option.label}`,
    coupling: 'the arm on the post',
    quantities: { M: bound['M']!, V: bound['V']!, d: bound['d']!, nb: bound['nb']!, Rm: bound['Rm']!, lever: bound['lever']! },
    observed: s.realization.holds,
    derived: s.configuration.jointHolds,
  };
}

/** `section`: the experiment's fixed arm section, a declared configuration, so only the load and the bolt group vary. */
export function jointStudy(J: Jolt, cases: JointCase[], language = new Language(), section = '2x4 flat'): JointStudy {
  const slices = cases.map((c) => bracketOnPost(bracketIntent('the person', { mass: c.mass, reach: c.reach, ...(c.patch === undefined ? {} : { patch: c.patch }), ...(c.across === undefined ? {} : { across: c.across }), ...(c.postSide === undefined ? {} : { postSide: c.postSide }) }), bracketMaterial(), catalogueFor(c, section), J, { jointConstraint: false }));
  const observations = slices.map(observeJoint).filter((o): o is Observation => !!o);
  const residual = observations.filter((o) => o.derived.value === 1);
  const failures = slices.flatMap((s) => s.comparisons.filter((c) => c.name === 'the joint holds').map(anomalyOf).filter((f): f is Failure => !!f));
  const cs = candidates(residual);
  const { chosen, ambiguous, separating } = choose(cs);
  let relation: Relation | null = null;
  if (chosen && failures.length && validate(chosen).holds && chosen.generality >= 2) relation = language.add(promote(chosen, `the joint holds in shear in ${slices[0]!.contract.name}`));
  return { slices, observations, residual, failures, candidates: cs, separating, chosen, ambiguous, relation, language };
}
