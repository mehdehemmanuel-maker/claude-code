// A study over the hinge coupling with time as the coordinate: the same bar swung with the hinge's friction, the
// release angle and the pin's place varied. The derivation conserves the swing energy; the kernel's contract
// allows its own dissipation per period; a hinge with friction loses more. Among the observations the missing
// distinction is abduced over the hinge's quantity types: the friction torque, the swing energy, the release
// angle, the mass, gravity and the pivot distance.

import { candidates, discriminates, observation, promote, validate, Language, type Candidate, type Observation, type Relation } from './abduce';
import { evaluate, measurement, ofLeaf, type Derivation } from '../lang/evaluate';
import { anomalyOf, type Failure } from './failure';
import type { Jolt } from './realize';
import { choose } from './study';
import { barOnHinge, swingIntent, swingMaterial, type SwingIntent, type SwingSlice } from './swing';
import { tune, type Tuning } from './tune';
import { MAX_SUBSTEPS } from '../../physics/world';
import { k, leaf, type Leaf } from '../lang/term';
import { TICK } from '../../physics/protocol';

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

// ---- the observer inside the observation ---------------------------------------------------------------------
//
// The kernel is an observer with its own time, its tick. Its contract for a free hinge (under 2 % of the swing's
// energy lost per period, the period within 0.5 %) was measured on one bar at one release: one value of the tick over
// the period. A study over bars of other lengths asks whether the contract is the kernel's, or the kernel's at that
// window. The observations carry the observer's tick and the period it watches among their quantities, so the
// abduction can find the window if the window is what is missing.

export interface WindowCase { barLength: number; release: number; /** How many integration steps to a tick; one unless a discriminating experiment asks. */ substeps?: number }
export interface WindowRow { barLength: number; release: number; substeps: number; tickOverPeriod: number; stepOverPeriod: number; lossPerPeriod: number; periodError: number; within: boolean }

/** One abduction over the observations so far: what it chose, what it could not tell apart, and which quantities would. */
export interface WindowRound { observations: number; chosen: string | null; ambiguous: string[]; vary: string[] }

export interface WindowStudy extends SwingStudy { rows: WindowRow[]; rounds: WindowRound[] }

/** A free swing observed with the observer in it: the tick it is read at and the step it was integrated at are quantities of the observation. */
export function observeWindow(s: SwingSlice): Observation | null {
  const o = observeSwing(s);
  if (!o || !s.realization) return null;
  const b = s.solution.bound;
  return observation({ system: `${s.intent.barLength.hash}:${s.intent.release.hash}:${s.realization.integration.hash}`, coupling: 'the bar on the pin, watched at the kernel\'s tick', quantities: { tick: s.observer.tick, step: s.realization.integration, T: b['T']!, theta0: b['theta0']!, E0: b['E']!, m: b['m']!, g: b['g']!, d: b['d']! }, observed: o.observed, derived: o.derived });
}

const swingAt = (J: Jolt, c: WindowCase, language?: Language) => barOnHinge(swingIntent('the window study', { barLength: c.barLength, release: c.release, friction: 0, pivotHeight: c.barLength + 1 }), swingMaterial(), J, language, (c.substeps ?? 1) > 1 ? { step: ofLeaf(leaf('integration step asked', TICK / c.substeps!, 's', { class: 'configuration', source: `the window study: the tick over ${c.substeps}, to tell the step from the tick` })) } : {});

/**
 * Free swings over bar lengths and releases, abduced. Where the abduction cannot tell two groups apart and what tells
 * them apart is a quantity the generator chooses (the step the realization integrates at), the study runs that
 * experiment itself: the cases outside the contract again at a finer step, the tick unchanged. Then it abduces over
 * everything observed.
 */
export function windowStudy(J: Jolt, cases: WindowCase[], language = new Language()): WindowStudy {
  const slices = cases.map((c) => swingAt(J, c));
  const rounds: WindowRound[] = [];
  const abduce = () => {
    const observations = slices.map(observeWindow).filter((o): o is Observation => !!o);
    const cs = candidates(observations);
    const { chosen, ambiguous } = choose(cs);
    const vary = ambiguous.length > 1 ? [...new Set(ambiguous.flatMap((a, i) => ambiguous.slice(i + 1).flatMap((b) => discriminates(a, b))))] : [];
    rounds.push({ observations: observations.length, chosen: chosen?.group.text ?? null, ambiguous: ambiguous.map((x) => x.group.text), vary });
    return { observations, cs, chosen, ambiguous, vary };
  };
  let r = abduce();
  if (!r.chosen && r.vary.includes('step')) {
    const outside = cases.filter((_, i) => slices[i]!.comparisons.find((c) => c.name === 'swing energy at the end of the watch')?.verdict.kind === 'anomaly');
    for (const c of outside) for (const k of [2, 4]) slices.push(swingAt(J, { ...c, substeps: k }));
    r = abduce();
  }
  const failures = slices.flatMap((s) => s.comparisons.filter((c) => c.name === 'swing energy at the end of the watch').map(anomalyOf).filter((f): f is Failure => !!f));
  const rows: WindowRow[] = slices.filter((s) => s.realization).map((s) => {
    const re = s.realization!, b = s.solution.bound, T = b['T']!.value!, n = b['n']!.value!;
    return { barLength: s.intent.barLength.value!, release: s.intent.release.value!, substeps: Math.round(s.observer.tick.value! / re.integration.value!), tickOverPeriod: s.observer.tick.value! / T, stepOverPeriod: re.integration.value! / T, lossPerPeriod: 1 - (re.swingEnergyEnd.value! / re.swingEnergyStart.value!) ** (1 / n), periodError: (re.period.value! - T) / T, within: s.comparisons.find((c) => c.name === 'swing energy at the end of the watch')!.verdict.kind === 'within' };
  });
  let relation: Relation | null = null;
  if (r.chosen && failures.length && validate(r.chosen).holds && r.chosen.generality >= 2) relation = language.add(promote(r.chosen, 'the kernel keeps a free swing within its contract'));
  return { slices, observations: r.observations, failures, candidates: r.cs, chosen: r.chosen, ambiguous: r.ambiguous, relation, language, rows, rounds };
}

// ---- the tuner on the swing ----------------------------------------------------------------------------------

/**
 * A swing generated at the coarsest integration step the language admits: the tick, then finer, down to the finest
 * the kernel reaches (its tick over its most substeps) or a budget below that. The tuner chooses; the slice is
 * regenerated whole at the step chosen.
 */
export function tuneSwing(J: Jolt, intent: SwingIntent, language: Language, most = MAX_SUBSTEPS): Tuning<SwingSlice> {
  const values = Array.from({ length: most }, (_, i) => ofLeaf(leaf(`integration step: the tick over ${i + 1}`, TICK / (i + 1), 's', { class: 'configuration', source: `the tuner: the kernel integrates no finer than its tick over ${MAX_SUBSTEPS} (physics/world.ts)${most < MAX_SUBSTEPS ? `, and the budget allows ${most}` : ''}` })));
  return tune({ sym: 'step', values }, (step) => barOnHinge(intent, swingMaterial(), J, language, { step }), (s) => ({
    refusedBy: s.admission.filter((a) => a.judgement.holds.value === 0).map((a) => a.judgement.relation),
    kept: s.realization ? s.comparisons.find((c) => c.name === 'swing energy at the end of the watch')?.verdict.kind === 'within' : null,
    quantities: s.judgedOn,
  }));
}
