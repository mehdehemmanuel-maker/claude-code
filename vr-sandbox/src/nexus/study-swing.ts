// A study over the hinge coupling with time as the coordinate: the same bar swung with the hinge's friction, the
// release angle and the pin's place varied. The derivation conserves the swing energy; the kernel's contract
// allows its own dissipation per period; a hinge with friction loses more. Among the observations the missing
// distinction is abduced over the hinge's quantity types: the friction torque, the swing energy, the release
// angle, the mass, gravity and the pivot distance.

import { candidates, observation, promote, validate, Language, type Candidate, type Observation, type Relation } from './abduce';
import { evaluate, measurement, type Derivation } from './evaluate';
import { anomalyOf, type Failure } from './failure';
import type { Jolt } from './realize';
import { choose } from './study';
import { barOnHinge, swingIntent, swingMaterial, type SwingSlice } from './swing';
import { k, leaf, type Leaf } from './term';

export interface SwingCase { release: number; friction: number; pivotFromEnd?: number }

export interface SwingStudy {
  slices: SwingSlice[];
  observations: Observation[];
  failures: Failure[];
  candidates: Candidate[];
  chosen: Candidate | null;
  ambiguous: Candidate[];
  relation: Relation | null;
  language: Language;
}

/** What the kernel observed of the hinge: whether the swing kept its energy within the contract over the watch. */
export function observeSwing(s: SwingSlice): Observation | null {
  if (!s.configuration || !s.realization) return null;
  const bound = s.solution.bound;
  const c = s.comparisons.find((x) => x.name === 'swing energy at the end of the watch');
  if (!c) return null;
  const mk = (name: string, value: number, unit: string, origin: Leaf['origin'], u?: number) => leaf(name, value, unit, origin, u);
  const observed = measurement('kept its swing energy within the contract over the watch', c.verdict.kind === 'within' ? 1 : 0, '1', { instrument: `${s.contract.name}: the comparison of the swing energy at the end of the watch`, window: s.realization.window }, mk);
  const derived = evaluate('the hinge does no work: the swing keeps its energy', k(1), {}, { unit: '1', law: 'conservation: a free hinge does no work on the bar' });
  return observation({
    system: `${s.intent.release.hash}:${s.intent.friction.hash}:${s.intent.pivotFromEnd.hash}`,
    coupling: 'the bar on the pin',
    quantities: { tau: s.configuration.hinge.friction, E0: bound['E']!, theta0: bound['theta0']!, m: bound['m']!, g: bound['g']!, d: bound['d']! },
    observed, derived,
  });
}

export function swingStudy(J: Jolt, cases: SwingCase[], language = new Language()): SwingStudy {
  const slices = cases.map((c) => barOnHinge(swingIntent('the study', { release: c.release, friction: c.friction, ...(c.pivotFromEnd === undefined ? {} : { pivotFromEnd: c.pivotFromEnd }) }), swingMaterial(), J));
  const observations = slices.map(observeSwing).filter((o): o is Observation => !!o);
  const failures = slices.flatMap((s) => s.comparisons.filter((c) => c.name === 'swing energy at the end of the watch').map(anomalyOf).filter((f): f is Failure => !!f));
  const cs = candidates(observations);
  const { chosen, ambiguous } = choose(cs);
  let relation: Relation | null = null;
  if (chosen && failures.length && validate(chosen).holds && chosen.generality >= 2) relation = language.add(promote(chosen, `the hinge keeps the swing in ${slices[0]!.contract.name}`));
  return { slices, observations, failures, candidates: cs, chosen, ambiguous, relation, language };
}

export const swingQuantities = (s: SwingSlice): Record<string, Derivation> | null => observeSwing(s)?.quantities ?? null;
