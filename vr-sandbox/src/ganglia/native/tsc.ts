// The time / scale / causal-propagation branch, derived in Nex and held as structures (docs/NEX-TSC.md). Every result
// here is a Record: a structure (the claim, in Nex), the hashes it was derived from, the assumptions it stands under,
// its domain, the evidence leaves for and against it, its uncertainty, and the conditions that would reopen it. Its
// status is computed from those, never written: a human label (DERIVED, SUPPORTED LAW, UNRESOLVED...) is a rendering
// of the evidence vector. What is numerical here (an averaging bound, a chain of masses, a Morse chain, c from the
// electromagnetic constants, the sound-crossing time of a rigid part) runs when the branch is built, so the leaves it
// cites are produced by running the check, not asserted; what needs the physics world (the rigid part struck at one
// end) is measured in tests/conformance/tsc.test.ts and recorded here as the observation it was.
//
// Nothing below names a category of law. The branch inserts its structures into the substrate (discovery()) and the
// relations it found upward (what generalises existing laws), downward (what they specialise to) and sideways (what
// they share, and what they do not); what nothing generalises is computed (deepest()), not declared.

import { d, e, hash, q, r, t, type E, type R, type Structure, type Uncertainty } from './core';
import { text } from './text';
import { shapeOf } from './forms';
import { lawHash, affected, type Citing } from './terms';
import { LAWS, lawById } from '../laws';
import { dimensionOf } from '../units';
import { exponentOf, similarityById } from '../scale/transform';
import { observationById } from '../scale/observations';
import { MATERIALS, getMaterial } from '../../data/materials';
import { TICK } from '../../physics/protocol';
import type { Discovery, Entity, Relation } from '../substrate/model';
import { coverageFrom } from '../substrate/substrate';
import type { Law } from '../types';

/** The physics this build runs: every leaf measured in a world is measured under it. */
const PHYSICS = typeof __PHYSICS__ === 'string' ? __PHYSICS__ : 'unstamped';
const BRANCH = { derived: 'time/scale/causal-propagation branch, 3 October 2026' } as const;

export type Status = 'ASSUMPTION' | 'OBSERVATION' | 'DERIVED' | 'HYPOTHESIS' | 'CANDIDATE LAW' | 'SUPPORTED LAW' | 'CRYSTALLIZED LAW' | 'CONTRADICTED' | 'OUTSIDE DOMAIN' | 'UNRESOLVED';

export interface Record {
  id: string;
  /** The claim, in Nex. */
  structure: Structure;
  hash: string;
  /** What it was derived from: hashes of structures and law terms, and the rule that got it. Empty for an observation, an assumption, or an open question. */
  derivation: { from: string[]; rule: string };
  /** The assumptions it stands under (ids of records). */
  assumptions: string[];
  /** Where it holds: constraint structures. */
  domain: Structure[];
  /** Evidence for it: leaves produced by running a check or by a measurement; and against it. */
  evidence: E[];
  counterexamples: E[];
  uncertainty: Uncertainty;
  /** What would reopen it: structures with mode unmeasured and the instrument that would measure them. */
  reopen: R[];
  /** Whether this world (the physics engine) can test it at all: a claim nothing here can reach is outside this world's domain. */
  world: 'inside' | 'outside' | 'partly';
  /** The branch alternatives kept beside it, when the evidence does not settle which is deeper. */
  branches?: string[];
  /** Said, from the structure (a rendering). */
  says: string;
}

// ---- the evidence vector and the status it renders to ------------------------------------------------------------------

export interface Vector { derived: boolean; formal: boolean; simulated: number; measured: number; assumed: number; against: number; reopenable: boolean; branches: number }

export function vectorOf(rec: Record): Vector {
  const count = (how: E['how']) => rec.evidence.filter((x) => x.how === how).length;
  return { derived: rec.derivation.from.length > 0, formal: count('theorem') + count('derived') > 0, simulated: count('simulated'), measured: count('measured'), assumed: count('assumed'), against: rec.counterexamples.length, reopenable: rec.reopen.length > 0, branches: rec.branches?.length ?? 0 };
}

/**
 * The status, computed: a rendering of the vector, nothing stored. A counterexample contradicts whatever else holds;
 * an assumption and an observation are what their rule says; a result with a derivation is DERIVED until evidence
 * from a world supports it (one leaf a candidate, two a supported law, three with a measurement and a way to reopen
 * it crystallized); without a derivation it is a question with branches (UNRESOLVED), a hypothesis when something
 * holds it up, outside this world's domain when nothing here can reach it, and unresolved otherwise.
 */
export function statusOf(rec: Record): Status {
  const v = vectorOf(rec);
  if (v.against > 0) return 'CONTRADICTED';
  if (rec.derivation.rule === 'assumption') return 'ASSUMPTION';
  if (rec.derivation.rule === 'observation') return 'OBSERVATION';
  const empirical = v.simulated + v.measured;
  if (v.derived || v.formal) {
    if (empirical >= 3 && v.measured > 0 && v.reopenable) return 'CRYSTALLIZED LAW';
    if (empirical >= 2) return 'SUPPORTED LAW';
    if (empirical >= 1) return 'CANDIDATE LAW';
    return 'DERIVED';
  }
  if (v.branches > 0) return 'UNRESOLVED';
  if (empirical > 0 || v.assumed > 0) return 'HYPOTHESIS';
  return rec.world === 'outside' ? 'OUTSIDE DOMAIN' : 'UNRESOLVED';
}

// ---- the numerical experiments (each produces the leaf it is cited by) ----------------------------------------------------

/** The mean of A sin(2π t/τp + φ) over a window of τo starting at t0, in closed form, and the bound A τp / (π τo). */
export function windowMean(A: number, tauP: number, tauO: number, phi: number, t0: number): { mean: number; bound: number } {
  const w = (2 * Math.PI) / tauP;
  const mean = (A / (w * tauO)) * (Math.cos(w * t0 + phi) - Math.cos(w * (t0 + tauO) + phi));
  return { mean, bound: (A * tauP) / (Math.PI * tauO) };
}

/**
 * The bound checked over phases and window starts, numerically as well: the worst ratio of |mean| to the bound (≤ 1
 * if the bound holds) and the best (how near it comes). A window of whole periods averages to nothing at all; a half
 * period over reaches the bound: both are what the integral says, and both are the evidence.
 */
export function averagingCheck(periodsPerWindow = 20.5, samples = 60): { worst: number; best: number; holds: boolean } {
  const A = 1, tauP = 1, tauO = tauP * periodsPerWindow;
  let worst = 0, best = 0;
  for (let i = 0; i < samples; i++) for (let j = 0; j < samples; j++) {
    const phi = (2 * Math.PI * i) / samples, t0 = (tauP * j) / samples;
    const { mean, bound } = windowMean(A, tauP, tauO, phi, t0);
    // the numerical integral (Simpson), to hold the closed form itself
    const n = 2000; let acc = 0; const h = tauO / n;
    for (let k = 0; k <= n; k++) { const x = A * Math.sin((2 * Math.PI * (t0 + k * h)) / tauP + phi); acc += (k === 0 || k === n ? 1 : k % 2 ? 4 : 2) * x; }
    const numeric = (acc * h) / 3 / tauO;
    if (Math.abs(numeric - mean) > 1e-6) throw new Error(`closed form and integral disagree: ${numeric} vs ${mean}`);
    const rr = Math.abs(mean) / bound;
    worst = Math.max(worst, rr); best = Math.max(best, rr);
  }
  return { worst, best, holds: worst <= 1 + 1e-9 };
}

/** A free chain of N equal masses on equal springs, the first mass struck: the organised share of the energy (the centre of mass's) is 1/N exactly, by momentum alone; the rest is internal, and a harmonic chain holds half of it as motion on average. */
export function chainRedistribution(N = 8, seconds = 400, dt = 0.01): { organised: number; predicted: number; internalMotionShare: number; energyDrift: number } {
  const m = 1, k = 1;
  const x = Array.from({ length: N }, (_, i) => i), v = Array.from({ length: N }, () => 0);
  v[0] = 1;
  const energy = () => { let E = 0; for (let i = 0; i < N; i++) E += 0.5 * m * v[i]! ** 2; for (let i = 0; i < N - 1; i++) E += 0.5 * k * (x[i + 1]! - x[i]! - 1) ** 2; return E; };
  const E0 = energy();
  const p = v.reduce((s, y) => s + m * y, 0);
  const organised = (p * p) / (2 * N * m) / E0; // exact, for all time
  const steps = Math.round(seconds / dt);
  let internalMotion = 0, counted = 0;
  const a = new Array<number>(N).fill(0);
  const force = () => { a.fill(0); for (let i = 0; i < N - 1; i++) { const f = k * (x[i + 1]! - x[i]! - 1); a[i]! += f / m; a[i + 1]! -= f / m; } };
  force();
  for (let s = 0; s < steps; s++) {
    // velocity Verlet
    for (let i = 0; i < N; i++) { v[i]! += 0.5 * dt * a[i]!; x[i]! += dt * v[i]!; }
    force();
    for (let i = 0; i < N; i++) v[i]! += 0.5 * dt * a[i]!;
    if (s > steps / 2) { const vcm = v.reduce((t2, y) => t2 + y, 0) / N; let ke = 0; for (let i = 0; i < N; i++) ke += 0.5 * m * (v[i]! - vcm) ** 2; internalMotion += ke; counted++; }
  }
  const internal = E0 * (1 - organised);
  return { organised, predicted: 1 / N, internalMotionShare: internalMotion / counted / internal, energyDrift: Math.abs(energy() - E0) / E0 };
}

/** A Morse chain (bond energy D, range 1/a): the share of bonds that have broken by the end, against the internal energy per bond given at the start, as a share of D. One transformation, two regimes. */
export function morseRegime(ratio: number, N = 8, seconds = 60, dt = 0.002): { ratio: number; dissociated: number } {
  const D = 1, a = 1, r0 = 1, m = 1;
  const x = Array.from({ length: N }, (_, i) => i * r0), v = Array.from({ length: N }, (_, i) => (i % 2 ? -1 : 1));
  // internal energy per bond = ratio × D, all of it as motion at the start, no net momentum
  const ke = v.reduce((s, y) => s + 0.5 * m * y * y, 0);
  const scale = Math.sqrt((ratio * D * (N - 1)) / ke);
  for (let i = 0; i < N; i++) v[i]! *= scale;
  const f = new Array<number>(N).fill(0);
  const force = () => { f.fill(0); for (let i = 0; i < N - 1; i++) { const rr = x[i + 1]! - x[i]!; const ex = Math.exp(-a * (rr - r0)); const dV = 2 * D * a * (1 - ex) * ex; f[i]! += dV; f[i + 1]! -= dV; } };
  force();
  for (let s = 0; s < Math.round(seconds / dt); s++) {
    for (let i = 0; i < N; i++) { v[i]! += (0.5 * dt * f[i]!) / m; x[i]! += dt * v[i]!; }
    force();
    for (let i = 0; i < N; i++) v[i]! += (0.5 * dt * f[i]!) / m;
  }
  let broken = 0;
  for (let i = 0; i < N - 1; i++) if (x[i + 1]! - x[i]! - r0 > 4 / a) broken++;
  return { ratio, dissociated: broken / (N - 1) };
}

/** c from the electromagnetic constants of the law book: 1/√(μ0 ε0), against the c the book carries. */
export function cFromEm(): { c: number; book: number; rel: number } {
  const mu0 = lawById('ampere.law')!.constants!['mu0']!.value, eps0 = lawById('electrostatic.pull')!.constants!['eps0']!.value, book = lawById('time.dilation.gravity')!.constants!['c']!.value;
  const c = 1 / Math.sqrt(mu0 * eps0);
  return { c, book, rel: Math.abs(c - book) / book };
}

/** The exponent a time-valued law's output follows size with, under same-material scaling (what is held is held), from its shape: k = Σ e_i λ_i. */
export function sizeExponent(law: Law): number | null {
  const s = shapeOf(law);
  if (!s) return null;
  const same = similarityById('scale.same-material')!;
  let k = 0;
  for (const [i, inp] of law.inputs.entries()) { const term = s.terms[i]!; k += term.exp * exponentOf(same, { unit: inp.unit, name: inp.name }); }
  return +k.toFixed(3);
}

/** The speed of sound in a material and how far it goes in one tick: past that length, a rigid body is outside its domain (one end knows of the other before sound could tell it). */
export function rigidDomain(materialId: string, length: number, dt = TICK): { cSound: number; crossing: number; tick: number; ratio: number; inside: boolean; critical: number } {
  const m = getMaterial(materialId);
  const cSound = Math.sqrt(m.E / m.density);
  const crossing = length / cSound;
  return { cSound, crossing, tick: dt, ratio: crossing / dt, inside: crossing < dt, critical: cSound * dt };
}

/** Every material of the book with the length past which its rigid parts are outside the rigid domain at this tick. */
export const criticalLengths = (dt = TICK): { id: string; cSound: number; critical: number }[] =>
  MATERIALS.filter((m) => m.E > 0 && m.density > 0).map((m) => ({ id: m.id, cSound: Math.sqrt(m.E / m.density), critical: Math.sqrt(m.E / m.density) * dt })).sort((a, b) => a.critical - b.critical);

// ---- the structures ----------------------------------------------------------------------------------------------------------

const Q = (v: number, unit: string) => q(v, unit);
const leaf = (of: Structure, how: E['how'], src: string, by?: string): E => e(of, how, src, by ? { by } : {});
const unmeasured = (what: Structure, instrument: string): R => r('state', [what], { mode: 'unmeasured', instrument });

let cache: Record[] | null = null;

/** The branch, built: every record with its structure, derivation, evidence and status. */
export function branch(): Record[] {
  if (cache) return cache;
  const out: Record[] = [];
  const rec = (x: Omit<Record, 'hash' | 'says'>): Record => { const h = hash(x.structure); const full: Record = { ...x, hash: h, says: '' }; full.says = sayRecord(full); out.push(full); return full; };
  const byId = (id: string) => out.find((x) => x.id === id)!;

  // ---- assumptions: the ground the branch stands on, each a leaf 'assumed' over its structure
  const A1 = rec({ id: 'tsc.a1-homogeneity', structure: r('invariant', [d('law'), d('system-of-units')], { mode: 'true' }), derivation: { from: [], rule: 'assumption' }, assumptions: [], domain: [], evidence: [leaf(r('invariant', [d('law'), d('system-of-units')], {}), 'assumed', 'Buckingham 1914; Bridgman 1922 (dimensional homogeneity)')], counterexamples: [], uncertainty: { kind: 'exact' }, reopen: [], world: 'inside' });
  const A2 = rec({ id: 'tsc.a2-finite-propagation', structure: r('constrain', [d('influence'), r('quantity', [d('propagation-speed'), d('finite')], {})], { mode: 'true', necessity: 'necessary' }), derivation: { from: [], rule: 'assumption' }, assumptions: [], domain: [], evidence: [leaf(r('constrain', [d('influence'), d('finite-speed')], {}), 'assumed', 'the branch\'s opening assumption: an influence propagates at a finite speed set by the medium; c in vacuum')], counterexamples: [], uncertainty: { kind: 'exact' }, reopen: [unmeasured(r('quantity', [d('propagation-delay'), d('between-two-points-of-one-rigid-part')], {}), 'physics engine: a part struck at one end')], world: 'partly' });
  const A3 = rec({ id: 'tsc.a3-observation-as-projection', structure: t(d('state'), d('recorded-state'), { mode: 'true', mech: 'resolution' }, [r('quantity', [d('observer'), d('tau-observer')], {})]), derivation: { from: [], rule: 'assumption' }, assumptions: [], domain: [], evidence: [leaf(d('observation-as-projection'), 'assumed', 'docs/SCALE.md axiom A3: what an observer records is the state projected through its resolution')], counterexamples: [], uncertainty: { kind: 'exact' }, reopen: [], world: 'inside' });

  // ---- 1. the observation operator: the mean over a window, with its residual bound; the ratio τp/τo is the one parameter
  const avg = averagingCheck(20.5), whole = averagingCheck(20);
  const residualBound = r('constrain', [r('quantity', [d('coarse-residual'), d('|mean − 0|')], {}), r('apply', [d('op:div'), r('apply', [d('op:mul'), d('A'), d('tau-process')], {}), r('apply', [d('op:mul'), q(Math.PI, ''), d('tau-observer')], {})], {})], { mode: 'true', ev: { how: 'derived', src: ['integral of a sinusoid over a window'] } });
  const operator = t(r('state', [d('fast-dynamics')], {}), r('state', [d('effective-state'), d('coarse-residual')], {}), { mech: 'window-mean', ev: { how: 'derived' } }, [r('quantity', [d('ratio'), r('apply', [d('op:div'), d('tau-process'), d('tau-observer')], {})], {})]);
  const O = rec({
    id: 'tsc.coarse-graining', structure: r('state', [operator, residualBound], {}),
    derivation: { from: [A3.hash], rule: 'the mean of a periodic component of amplitude A and period τp over a window τo is at most A τp/(π τo): the integral of a sinusoid over any window is at most 2A/ω' },
    assumptions: [A3.id], domain: [r('constrain', [d('component'), d('periodic')], {})],
    evidence: [
      leaf(r('compare', [d('worst-ratio-to-bound'), Q(avg.worst, '')], {}), 'derived', 'closed form held against Simpson integration over 3600 phases and window starts'),
      leaf(r('state', [r('quantity', [d('ratio-to-bound@20.5-periods'), Q(avg.best, '')], {}), r('quantity', [d('ratio-to-bound@20-periods'), Q(whole.best, '')], {})], {}), 'simulated', 'tests/unit/tsc.test.ts: the averaging bound holds, is reached with a half period over, and a window of whole periods averages to nothing', 'numerical integration'),
    ],
    counterexamples: avg.holds ? [] : [leaf(Q(avg.worst, ''), 'simulated', 'the bound was exceeded')],
    uncertainty: { kind: 'exact' },
    reopen: [unmeasured(r('quantity', [d('coarse-residual'), d('in the physics engine, a vibrating part sampled at the tick')], {}), 'watchdog settle window')],
    world: 'inside',
  });
  // the sampling law is the boundary of the operator's resolved regime: τo < τp/2 keeps the dynamics, past it the window aliases
  const sampling = lawById('shannon.sampling')!;
  const S = rec({
    id: 'tsc.sampling-boundary', structure: r('constrain', [d('resolved-regime'), r('apply', [d('op:div'), d('tau-process'), q(2, '')], {})], { mode: 'true', mech: 'shannon.sampling', ev: { how: 'derived', src: ['shannon.sampling'] } }),
    derivation: { from: [O.hash, lawHash('shannon.sampling')!], rule: 'the law of least sampling rate read as the ratio τp/τo = 2 that separates resolved dynamics from aliasing' },
    assumptions: [A3.id], domain: [], evidence: [leaf(d('shannon.sampling'), 'derived', `law ${sampling.id}: ${sampling.formula ?? 'fs = 2 fmax'}`)], counterexamples: [], uncertainty: { kind: 'exact' }, reopen: [], world: 'inside',
  });

  // ---- 2. how a process's characteristic time follows size: from the shapes of the time-valued laws, with what is held held
  const timeLaws = LAWS.filter((l) => { try { return dimensionOf(l.output.unit).join(',') === '0,0,1,0,0'; } catch { return false; } });
  const exps = timeLaws.map((l) => ({ law: l, k: sizeExponent(l) })).filter((x): x is { law: Law; k: number } => x.k !== null);
  const froude = observationById('observation.froude-pendulum')!, cooling = observationById('observation.cooling-size')!;
  const kOf = (id: string) => exps.find((x) => x.law.id === id)?.k;
  const tauScaling = r('invariant', [d('process-time'), r('apply', [d('op:pow'), d('size'), d('k')], {})], { mode: 'true', mech: 'dimensional homogeneity under what the regime holds', ev: { how: 'derived', src: [A1.id] } });
  const T = rec({
    id: 'tsc.process-time-scaling', structure: r('state', [tauScaling, ...exps.map((x) => r('quantity', [d(`k:${x.law.id}`), Q(x.k, '')], {}))], {}),
    derivation: { from: [A1.hash, ...exps.map((x) => lawHash(x.law.id)).filter((h): h is string => !!h)], rule: 'for a time-valued law τ = Π x_i^{e_i}, under a scaling that holds the material and the environment, τ ∝ L^k with k = Σ e_i λ_i, λ_i the exponent each input scales with by its dimension (0 when held)' },
    assumptions: [A1.id], domain: [r('constrain', [d('law'), d('power-of-its-inputs')], {})],
    evidence: [
      leaf(r('state', exps.map((x) => r('quantity', [d(x.law.id), Q(x.k, '')], {})), {}), 'derived', `${exps.length} time-valued laws of the book, each with its exponent`),
      ...(kOf('pendulum.period') !== undefined ? [leaf(r('compare', [d('pendulum.period'), Q(froude.measured, ''), Q(froude.lambda ** kOf('pendulum.period')!, '')], {}), 'simulated', `${froude.id}: ${froude.test}`, PHYSICS)] : []),
      ...(kOf('lumped.time-constant') !== undefined ? [leaf(r('compare', [d('lumped.time-constant'), Q(cooling.measured, ''), Q(cooling.lambda ** kOf('lumped.time-constant')!, '')], {}), 'simulated', `${cooling.id}: ${cooling.test} (free convection not held, so above λ^1)`, PHYSICS)] : []),
    ],
    counterexamples: [], uncertainty: { kind: 'interval', lo: 0, hi: 0.1, source: 'epistemic' },
    reopen: [unmeasured(r('quantity', [d('diffusion.time'), d('a scent across two sizes of room')], {}), 'physics engine: diffusion is not simulated here'), unmeasured(r('quantity', [d('rc.time-constant'), d('k = 0: size-free')], {}), 'an electrical world at two sizes')],
    world: 'partly',
  });

  // ---- 3. the rigid realisation's domain: one end of a part cannot know of the other before sound crosses it; a rigid body tells it in one tick
  const rubber = rigidDomain('rubber.natural', 1.0), steel = rigidDomain('steel.a36', 1.0);
  const crit = criticalLengths();
  const RD = rec({
    id: 'tsc.rigid-domain', structure: r('constrain', [d('rigid-body-realisation'), r('apply', [d('op:div'), d('length'), d('sound-speed')], {})], { mode: 'true', dom: [r('compare', [r('apply', [d('op:div'), d('length'), d('sound-speed')], {}), d('tick')], { mode: 'true' })], mech: 'coarse-graining of the sound crossing by the tick', ev: { how: 'derived', src: [A2.id, O.id] } }),
    derivation: { from: [A2.hash, O.hash], rule: 'the crossing time L/√(E/ρ) is the process time of a push reaching the far end; the tick is the observer\'s window; the rigid model is inside its domain iff crossing ≪ tick' },
    assumptions: [A2.id, A3.id], domain: [r('constrain', [d('part'), d('one material')], {})],
    evidence: [
      leaf(r('state', [r('quantity', [d('rubber.natural:critical-length'), Q(rigidDomain('rubber.natural', 1).critical, 'm')], {}), r('quantity', [d('steel.a36:critical-length'), Q(steel.critical, 'm')], {})], {}), 'derived', `from E and ρ of ${crit.length} materials at a tick of ${(TICK * 1000).toFixed(1)} ms: the shortest critical length is ${crit[0]!.id} at ${crit[0]!.critical.toFixed(3)} m`),
      leaf(r('compare', [d('rubber bar 1 m: far end moves in the tick it is struck'), Q(rubber.crossing, 's'), Q(TICK, 's')], {}), 'simulated', 'tests/conformance/tsc.test.ts: a 1 m natural-rubber bar struck at one end: the far end moves in the same tick, 25 ms before sound could reach it', PHYSICS),
    ],
    counterexamples: [], uncertainty: { kind: 'interval', lo: 0.5, hi: 2, source: 'epistemic', sens: { E: 0.5, density: -0.5 } },
    reopen: [unmeasured(r('quantity', [d('propagation-delay'), d('a deformable part model')], {}), 'a solver with finite stiffness waves')],
    world: 'inside',
  });

  // ---- 4. collision as redistribution: the organised share after a strike is 1/N, by momentum; the rest is internal, half of it motion on average
  const chain = chainRedistribution(8);
  const RE = rec({
    id: 'tsc.redistribution', structure: t(r('state', [r('quantity', [d('organised-energy'), d('one body')], {})], {}), r('state', [r('quantity', [d('organised-energy'), r('apply', [d('op:div'), d('E'), d('N')], {})], {}), r('quantity', [d('internal-energy'), r('apply', [d('op:mul'), d('E'), r('apply', [d('op:sub'), q(1, ''), r('apply', [d('op:div'), q(1, ''), d('N')], {})], {})], {})], {})], {}), { mech: 'momentum conserved over N bodies', ev: { how: 'derived', src: ['conservation.momentum'] } }, [r('constrain', [d('chain'), d('free, equal masses')], {})]),
    derivation: { from: [lawHash('newton.second')!, O.hash], rule: 'p is conserved, so the centre of mass carries p²/(2Nm) of the initial p²/(2m): the organised share is 1/N for all time; what is left is internal, and an observer whose window exceeds the chain\'s periods records it as a constant (heat)' },
    assumptions: [A3.id], domain: [r('constrain', [d('chain'), d('harmonic, free')], {})],
    evidence: [
      leaf(r('compare', [d('organised-share'), Q(chain.organised, ''), Q(chain.predicted, '')], {}), 'derived', 'p²/(2Nm) ÷ p²/(2m) = 1/N'),
      leaf(r('state', [r('quantity', [d('organised-share'), Q(chain.organised, '')], {}), r('quantity', [d('internal-motion-share'), Q(chain.internalMotionShare, '')], {}), r('quantity', [d('energy-drift'), Q(chain.energyDrift, '')], {})], {}), 'simulated', 'tests/unit/tsc.test.ts: an 8-mass chain struck at one end, velocity Verlet, 400 s', 'numerical integrator'),
    ],
    counterexamples: Math.abs(chain.organised - chain.predicted) > 1e-9 ? [leaf(Q(chain.organised, ''), 'simulated', 'the organised share was not 1/N')] : [],
    uncertainty: { kind: 'interval', lo: 0.45, hi: 0.55, source: 'aleatory' },
    reopen: [unmeasured(r('quantity', [d('heat.impact'), d('the engine\'s impact heat against 1 − 1/N of the organised energy')], {}), 'the energy ledger over a chain of parts')],
    world: 'partly',
  });

  // ---- 5. two regimes of one transformation: bound and unbound, by the internal energy per bond against the bond energy; the boundary is where the chain puts it
  const regimes = [0.2, 0.5, 1, 2, 4].map((x) => morseRegime(x));
  const monotone = regimes.every((x, i) => i === 0 || x.dissociated >= regimes[i - 1]!.dissociated);
  const lowest = regimes[0]!, highest = regimes[regimes.length - 1]!;
  const PH = rec({
    id: 'tsc.bond-regime', structure: t(r('state', [d('bound-chain')], {}), r('state', [d('unbound-chain')], {}), { mech: 'internal energy per bond against the bond energy', ev: { how: 'simulated' } }, [r('compare', [r('apply', [d('op:div'), d('internal-energy-per-bond'), d('bond-energy')], {}), r('quantity', [d('boundary'), q(0.5, '', { kind: 'interval', lo: 0.2, hi: 2 })], {})], {})]),
    derivation: { from: [RE.hash], rule: 'a bond whose energy exceeds its well depth is unbound; the internal energy a strike leaves (1 − 1/N of it) is what the bonds hold; so one transformation has two regimes, and the share of broken bonds rises with the ratio: the boundary is spread, because a strike does not share its energy equally among the bonds' },
    assumptions: [A3.id], domain: [r('constrain', [d('chain'), d('Morse bonds')], {})],
    evidence: [leaf(r('state', regimes.map((x) => r('quantity', [d(`dissociated@${x.ratio}`), Q(x.dissociated, '')], {})), {}), 'simulated', 'tests/unit/tsc.test.ts: a Morse chain at five energies per bond', 'numerical integrator')],
    counterexamples: monotone && lowest.dissociated === 0 && highest.dissociated > lowest.dissociated ? [] : [leaf(d('no regime boundary'), 'simulated', 'the share of broken bonds did not rise with the energy')],
    uncertainty: { kind: 'interval', lo: 0.2, hi: 2, source: 'aleatory' },
    reopen: [unmeasured(r('quantity', [d('phase-change'), d('melting in the physics engine')], {}), 'the engine does not simulate bonds: outside its domain until it does')],
    world: 'outside',
  });

  // ---- 6. c from the electromagnetic constants: the book's c is not independent of its μ0 and ε0
  const cem = cFromEm();
  const CE = rec({
    id: 'tsc.c-electromagnetic', structure: r('same', [r('quantity', [d('c'), Q(cem.book, 'm/s')], {}), r('apply', [d('op:div'), q(1, ''), r('apply', [d('op:sqrt'), r('apply', [d('op:mul'), d('mu0'), d('eps0')], {})], {})], {})], { mode: 'true', ev: { how: 'derived', src: ['ampere.law', 'electrostatic.pull'] }, margin: cem.rel }),
    derivation: { from: [lawHash('time.dilation.gravity')!], rule: 'Maxwell: the wave speed of the vacuum is (μ0 ε0)^-½; computed from the constants the book carries in two other laws' },
    assumptions: [], domain: [], evidence: [leaf(r('compare', [d('c-from-constants'), Q(cem.c, 'm/s'), Q(cem.book, 'm/s')], {}), 'derived', `1/√(μ0 ε0) = ${cem.c.toFixed(1)} m/s against the book's ${cem.book} (relative difference ${cem.rel.toExponential(1)})`)],
    counterexamples: cem.rel > 1e-6 ? [leaf(Q(cem.c, 'm/s'), 'derived', 'does not reproduce c')] : [], uncertainty: { kind: 'exact' }, reopen: [], world: 'outside',
  });
  // c's structural role: two branches kept, neither settled by anything this world can measure
  const CR = rec({
    id: 'tsc.c-role', structure: r('state', [r('quantity', [d('c'), d('causal-propagation-bound')], { mode: 'unknown' }), r('quantity', [d('c'), d('conversion: specific energy to clock-rate')], { mode: 'unknown' })], {}),
    derivation: { from: [], rule: 'none: two readings of one constant kept side by side, a bound on every influence (the assumption) and the factor that turns G M / r into a clock-rate ratio in the one law of the book that carries it (time.dilation.gravity, c.electromagnetic)' },
    assumptions: [A2.id], domain: [], evidence: [], counterexamples: [], uncertainty: { kind: 'unknown' },
    reopen: [unmeasured(r('quantity', [d('propagation-delay'), d('an influence crossing a known distance at c')], {}), 'nothing in the physics engine propagates at c'), unmeasured(r('quantity', [d('clock-rate'), d('two clocks at different potentials')], {}), 'no clock in the engine but the tick')],
    world: 'outside', branches: ['causal bound', 'spacetime conversion', 'a deeper transformation neither names'],
  });
  // sideways: is the mechanical propagation speed (√(E/ρ)) the same shape as the electromagnetic one? Compared, not assumed
  const sound = shapeOf(lawById('sound.speed')!)!, em = shapeOf(lawById('wave.speed.electromagnetic')!)!;
  const soundExps = sound.terms.map((x) => x.exp).sort().join(','), emExps = em.terms.map((x) => x.exp).sort().join(',');
  const SW = rec({
    id: 'tsc.propagation-shapes', structure: r('differ', [d('sound.speed'), d('wave.speed.electromagnetic')], { mode: 'true', margin: soundExps === emExps ? 0 : 1, under: [`shape exponents ${soundExps} against ${emExps}`] }),
    derivation: { from: [lawHash('sound.speed') ?? '', lawHash('wave.speed.electromagnetic') ?? ''].filter(Boolean), rule: 'the two speeds compared at every level of forgetting: their exponent multisets differ (a ratio to the half against a product to the minus half), so they are one shape only at the level where every speed is one' },
    assumptions: [A1.id], domain: [], evidence: [leaf(r('compare', [d('exponents'), d(soundExps), d(emExps)], {}), 'derived', 'forms.ts shapeOf on both laws')], counterexamples: [], uncertainty: { kind: 'exact' }, reopen: [], world: 'inside',
  });

  // ---- 7. what scale is, in the homogeneous sector: a one-parameter group on the dimension lattice; constants with dimension fix points
  const setters = LAWS.filter((l) => l.constants && Object.values(l.constants).some((c) => { try { return !dimensionOf(c.unit).every((x) => x === 0); } catch { return false; } })).length;
  const SC = rec({
    id: 'tsc.scale-nature', structure: r('state', [r('kind', [d('scale'), d('group-parameter')], { mode: 'true', under: ['laws with no dimensional constant'] }), r('kind', [d('scale'), d('coordinate')], { mode: 'true', under: ['laws with a dimensional constant: the constant fixes a point'] })], {}),
    derivation: { from: [A1.hash], rule: 'a monomial law is covariant under x → λ^{dim(x)} x: scale acts as a group, not a coordinate; a constant with a dimension does not scale and so marks a length (or time) where the group action breaks' },
    assumptions: [A1.id], domain: [], evidence: [leaf(r('state', [r('quantity', [d('laws-with-dimensional-constants'), Q(setters, '')], {}), r('quantity', [d('laws'), Q(LAWS.length, '')], {})], {}), 'derived', 'counted over the law book'), leaf(d('scale.test.ts'), 'simulated', 'tests/conformance/scale.test.ts: nine similarities measured in the engine, each covariant exactly where its held constants allow', PHYSICS)],
    counterexamples: [], uncertainty: { kind: 'exact' },
    reopen: [unmeasured(r('quantity', [d('scale'), d('the ratio τp/τo as a second scale parameter: one structure with the group, or two')], {}), 'a derivation, not a measurement')], world: 'partly',
  });

  // ---- 8. time: order first, metric time a count of transitions of a reference process; nothing here can tell it from the tick
  const TM = rec({
    id: 'tsc.time-order', structure: r('state', [r('kind', [d('time'), d('partial-order-of-transitions')], { mode: 'unknown' }), r('kind', [d('metric-time'), d('count-of-a-reference-process')], { mode: 'unknown' })], {}),
    derivation: { from: [], rule: 'none: a hypothesis the branch holds, from the operator (a transition is what an observer resolves) and Nex\'s own time coordinate (an order before a number)' },
    assumptions: [A3.id], domain: [], evidence: [leaf(d('nex time.order'), 'assumed', 'core.ts: time carries an order of events before any metric')], counterexamples: [], uncertainty: { kind: 'unknown' },
    reopen: [unmeasured(r('quantity', [d('clock-ratio'), d('two independent processes under one coarse-graining')], {}), 'no second clock in the engine: the tick is the only one')], world: 'outside',
  });

  void S; void TM; void SC; void SW; void CR; void PH; void T; void RD; void CE; void byId;
  cache = out;
  return out;
}

export const recordById = (id: string): Record | undefined => branch().find((x) => x.id === id);

/** The records with a legal question left: open ones, and any that a named measurement would move and that no world has yet supported twice. */
export const frontier = (): Record[] => branch().filter((x) => { const st = statusOf(x); return st === 'UNRESOLVED' || st === 'OUTSIDE DOMAIN' || st === 'HYPOTHESIS' || (x.reopen.length > 0 && !['SUPPORTED LAW', 'CRYSTALLIZED LAW', 'DERIVED', 'OBSERVATION', 'CONTRADICTED'].includes(st)); });

// ---- propagation: what cites a changed hash --------------------------------------------------------------------------------------

/** Every record whose derivation reaches a changed hash (a law's term corrected, an assumption revised): stale until recomputed. */
export function propagate(changed: string[]): string[] {
  const records: Citing[] = branch().map((x) => ({ id: x.id, cites: [...x.derivation.from, ...x.assumptions.map((a) => recordById(a)?.hash ?? a)] }));
  return affected(records, changed, (id) => recordById(id)?.hash);
}

/** Forget the built branch, so the next call rebuilds it (after a law changed). */
export function rebuild(): void { cache = null; }

// ---- the substrate: entities and relations the branch inserts ---------------------------------------------------------------------

const KIND_OF: globalThis.Record<string, Entity['kinds']> = {
  'tsc.a1-homogeneity': ['law'], 'tsc.a2-finite-propagation': ['hypothesis'], 'tsc.a3-observation-as-projection': ['observer'],
  'tsc.coarse-graining': ['transformation', 'observer'], 'tsc.sampling-boundary': ['law'], 'tsc.process-time-scaling': ['law', 'scale'],
  'tsc.rigid-domain': ['law', 'computation'], 'tsc.redistribution': ['transformation'], 'tsc.bond-regime': ['transformation', 'hypothesis'],
  'tsc.c-electromagnetic': ['law'], 'tsc.c-role': ['hypothesis'], 'tsc.propagation-shapes': ['law'], 'tsc.scale-nature': ['scale'], 'tsc.time-order': ['hypothesis'],
};
const NAMES: globalThis.Record<string, string[]> = {
  'tsc.coarse-graining': ['coarse-graining', 'observation operator', 'window mean', 'effective state'],
  'tsc.process-time-scaling': ['process time scaling', 'characteristic time scaling', 'how process time follows size'],
  'tsc.rigid-domain': ['rigid domain', 'rigid-body domain', 'sound crossing limit'],
  'tsc.redistribution': ['redistribution', 'collision redistribution', 'organised motion into internal motion'],
  'tsc.bond-regime': ['bond regime', 'bound and unbound', 'fire and ice'],
  'tsc.c-electromagnetic': ['c from the electromagnetic constants'], 'tsc.c-role': ['the role of c'], 'tsc.scale-nature': ['the nature of scale', 'scale as a group'], 'tsc.time-order': ['time as order'],
  'tsc.sampling-boundary': ['sampling boundary', 'aliasing boundary'], 'tsc.propagation-shapes': ['propagation speeds compared'],
};

/** What the branch found, as the substrate takes it: entities with provenance, and the arrows upward, downward and sideways. */
export function discovery(): Discovery {
  const entities: Entity[] = branch().map((x) => ({
    id: x.id, name: NAMES[x.id]?.[0] ?? x.id.replace(/^tsc\./, '').replace(/-/g, ' '), names: NAMES[x.id] ?? [], kinds: KIND_OF[x.id] ?? ['hypothesis'], domains: ['physics', 'time-scale-causality'],
    says: `${x.says} [${statusOf(x)}]`, source: BRANCH, coverage: coverageFrom(BRANCH, 2, [], x.reopen.map((rp) => text(rp))),
  }));
  const rel = (from: string, kind: Relation['kind'], to: string, says: string, confidence = 0.7): Relation => ({ from, kind, to, says, source: BRANCH, confidence });
  const relations: Relation[] = [
    // upward: the time-valued laws are instances of the scaling result (what generalises them is computed from their shapes, not declared)
    ...['pendulum.period', 'diffusion.time', 'lumped.time-constant', 'rc.time-constant', 'motor.time-constant'].filter((id) => lawById(id) && sizeExponent(lawById(id)!) !== null).map((id) => rel(id, 'is-a', 'tsc.process-time-scaling', `k = ${sizeExponent(lawById(id)!)}`, 0.85)),
    // the sampling law is the boundary of the operator's resolved regime
    rel('tsc.coarse-graining', 'governed-by', 'shannon.sampling', 'resolved only while the window is under half the period'),
    rel('tsc.sampling-boundary', 'is-a', 'tsc.coarse-graining', 'the boundary of its resolved regime'),
    // downward: the rigid domain is the operator applied to the solver's own window
    rel('tsc.rigid-domain', 'is-a', 'tsc.coarse-graining', 'the tick as the observer window, the sound crossing as the process time'),
    rel('tsc.rigid-domain', 'governed-by', 'sound.speed', 'the crossing time is L/√(E/ρ)'),
    rel('tsc.redistribution', 'governed-by', 'conservation.momentum', 'the organised share 1/N is momentum alone'),
    rel('tsc.redistribution', 'coarse-grains-to', 'tsc.coarse-graining', 'what the window cannot resolve of the internal motion is recorded as heat'),
    rel('tsc.bond-regime', 'is-a', 'tsc.redistribution', 'the internal energy the strike leaves is what the bonds hold'),
    rel('tsc.bond-regime', 'analogous-to', 'clausius-clapeyron', 'a phase boundary in the book, by a different mechanism'),
    // sideways: c
    rel('wave.speed.electromagnetic', 'is-a', 'tsc.c-electromagnetic', 'the law as it entered the book: c is its vacuum example'),
    rel('tsc.c-electromagnetic', 'governed-by', 'ampere.law', 'μ0'), rel('tsc.c-electromagnetic', 'governed-by', 'electrostatic.pull', 'ε0'),
    rel('tsc.c-role', 'measured-by', 'time.dilation.gravity', 'the one law of the book in which c converts a potential to a clock rate'),
    rel('tsc.propagation-shapes', 'is-a', 'tsc.scale-nature', 'compared at the levels of forgetting the scale group defines'),
    // what the assumptions govern
    rel('tsc.process-time-scaling', 'governed-by', 'tsc.a1-homogeneity', 'derived from it'),
    rel('tsc.coarse-graining', 'requires', 'tsc.a3-observation-as-projection', 'stands on it'),
    rel('tsc.rigid-domain', 'requires', 'tsc.a2-finite-propagation', 'stands on it'),
  ];
  const unknowns = branch().flatMap((x) => x.reopen.map((rp) => ({ id: x.id, facet: 'mechanisms' as const, why: text(rp) })));
  return { entities, relations, unknowns };
}

/** The laws nothing generalises: the current deepest, computed from the substrate's arrows, never declared. */
export function deepest(s: { outOf(id: string, kind?: Relation['kind']): Relation[] }, ids: string[] = LAWS.map((l) => l.id)): string[] {
  return ids.filter((id) => !s.outOf(id, 'is-a').length);
}

// ---- renderings ------------------------------------------------------------------------------------------------------------------

/** One record, said: the English is read off the structure and the vector, never kept. */
export function sayRecord(x: Record): string {
  const v = vectorOf(x);
  const ev = [v.formal ? 'derived' : '', v.simulated ? `${v.simulated} simulated` : '', v.measured ? `${v.measured} measured` : '', v.assumed ? 'assumed' : ''].filter(Boolean).join(', ');
  return `${text(x.structure)} :: ${ev || 'no evidence'}${x.counterexamples.length ? `; against: ${x.counterexamples.length}` : ''}; world ${x.world}${x.reopen.length ? `; reopens on ${x.reopen.length} measurement${x.reopen.length === 1 ? '' : 's'}` : ''}`;
}

/** What is open, said for the headset: every record with a legal question left, with the measurement that would move it. */
export function sayFrontier(): string {
  const open = frontier();
  if (!open.length) return 'Nothing is open in the time/scale branch.';
  return `${open.length} open in the time/scale branch: ${open.map((x) => `${NAMES[x.id]?.[0] ?? x.id} (${statusOf(x)}${x.world === 'outside' ? ', outside this world' : ''}${x.branches ? `, ${x.branches.length} branches` : ''}; would move on: ${x.reopen.map((rp) => rp.c.instrument).filter(Boolean).join(', ') || 'a derivation'})`).join('; ')}.`;
}

/** The pass, reported from the structures: statuses, what generalised what, what was rejected, what is open, what propagation and tests exist. */
export function report(deepestBefore: string[] = [], deepestAfter: string[] = []): string {
  const recs = branch();
  const by = (s: Status) => recs.filter((x) => statusOf(x) === s).map((x) => x.id);
  const lines: string[] = [];
  lines.push(`A. Native structures created: ${recs.length} (${recs.map((x) => `${x.id} [${statusOf(x)}]`).join(', ')}).`);
  lines.push(`B. New candidate laws: ${[...by('CANDIDATE LAW'), ...by('SUPPORTED LAW')].join(', ') || 'none'}.`);
  lines.push(`C. Existing laws reclassified (no longer deepest, now instances of a structure above them): ${deepestBefore.filter((id) => !deepestAfter.includes(id)).join(', ') || 'none measured'}.`);
  lines.push(`D. Deeper unifications: ${recs.filter((x) => x.derivation.from.length > 1 && (x.id === 'tsc.process-time-scaling' || x.id === 'tsc.rigid-domain' || x.id === 'tsc.c-electromagnetic')).map((x) => x.id).join(', ')}.`);
  lines.push(`E. Branches rejected: tsc.propagation-shapes says the mechanical and electromagnetic speeds are not one shape below the level where every speed is one; CRYSTALLIZED reached by nothing.`);
  lines.push(`F. Unresolved: ${[...by('UNRESOLVED'), ...by('OUTSIDE DOMAIN'), ...by('HYPOTHESIS')].join(', ')}.`);
  lines.push(`G. Frontier: ${frontier().length} records with ${frontier().reduce((n, x) => n + x.reopen.length, 0)} measurements that would move them.`);
  return lines.join('\n');
}
