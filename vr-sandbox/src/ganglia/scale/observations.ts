// What the engine measured against what the law book predicted: each an observation, never promoted silently (SC-4).
// The conformance tests (tests/conformance/scale.test.ts) measure these again on every run and refuse a drift from what
// is recorded here, so the register is evidence that is checked, not a memory of it.
import type { Source } from '../types';
import type { Claim } from './hypothesis';

export interface Observation extends Claim {
  /** The size ratio built, the ratio the law book predicted, the ratio the engine gave, and the relative tolerance the test holds. */
  lambda: number;
  predicted: number;
  measured: number;
  tolerance: number;
  /** The test that measures it, by name, in tests/conformance/scale.test.ts. */
  test: string;
}

const HARNESS: Source = { cite: 'tests/conformance/scale.test.ts: Jolt Physics in the conformance harness, the world built at both sizes and measured', kind: 'maker' };

const obs = (id: string, statement: string, lambda: number, predicted: number, measured: number, tolerance: number, test: string, formulation: string, compatible: string[], falsification: string[]): Observation =>
  ({ id, status: 'observation', statement, axioms: [], formulation, predictions: [], compatible, conflicting: [], falsification, unresolved: [], history: [], source: HARNESS, lambda, predicted, measured, tolerance, test });

export const OBSERVATIONS: Observation[] = [
  obs('observation.froude-pendulum', 'A pendulum four times longer with a bob four times wider swings 2.003 times slower in the engine; Froude similarity predicts √λ = 2.', 4, 2, 2.0026, 0.02,
    'Froude: a pendulum four times longer with a bob of the same material swings twice as slowly, as the covariant verdict predicts', 'T₂/T₁ measured against λ^½', ['scale.froude covariance of pendulum.period'], ['a period ratio off √λ by more than the solver\'s period error']),
  obs('observation.cauchy-spring', 'A steel cube twice the side on a coil spring of twice the wire and coil rings at 0.4993 of the frequency in the engine; Cauchy similarity predicts 1/λ = 0.5.', 2, 0.5, 0.4993, 0.02,
    'Cauchy: a steel cube twice the side on a coil spring of twice the wire and coil rings at half the frequency, as the covariant verdict predicts; gravity scaled as 1/λ keeps the sag similar, gravity unscaled makes it grow as λ²', 'f₂/f₁ measured against λ⁻¹', ['scale.cauchy covariance of natural.frequency'], ['a frequency ratio off 1/λ by more than the solver\'s period error']),
  obs('observation.coulomb-ramp', 'A plywood cube four times the side holds on the same 18° ramp and slides the same distance on a 35° ramp in the engine (ratio 1.0000); Coulomb friction under Froude similarity predicts 1.', 4, 1, 1.0000, 0.05,
    'Coulomb: a block four times the side holds at the same ramp angle and slides with the same acceleration, as the law book predicts under Froude similarity', 'd₄/d₁ measured against 1', ['scale.froude covariance of friction.coulomb'], ['a block of one size holding where the other slides, or a distance ratio off 1 by more than the solver\'s contact error']),
  obs('observation.rolling-cylinder', 'A rubber cylinder four times the radius rolls the same distance down the same 12° ramp in the engine (ratio 0.997); the disc\'s inertia over m r² is ½ at any size, so the acceleration ⅔ g sin θ does not know the size.', 4, 1, 0.9970, 0.05,
    'Rolling: a cylinder four times the radius rolls down the same ramp with the same acceleration, as the inertia of a disc under Froude similarity predicts', 's₄/s₁ measured against 1', ['scale.froude covariance of inertia.disc'], ['a distance ratio off 1 by more than the solver\'s contact error']),
];

export const observationById = (id: string): Observation | undefined => OBSERVATIONS.find((o) => o.id === id);
