// Information propagation across a system, explicit at every scale: a distance, the mechanism that carries the signal,
// its speed, the time it takes, the system's own response time, the observer's time; and the dimensionless ratios
// between them. A smaller thing is faster because its distances are shorter, not because anything travels faster; no
// mechanism here exceeds the speed of light, and one that would is marked hypothetical and refused by default.
import { GROUPS } from './groups';
import type { Source } from '../types';

export interface Mechanism { id: string; name: string; /** m/s; for a diffusive mechanism the speed depends on the distance: v = 2 D / x */ speed?: number; diffusivity?: number; medium: string; source: Source }

const KAYE: Source = { cite: 'Kaye & Laby, Tables of Physical and Chemical Constants, 16th ed., 1995 (speeds of sound)', kind: 'handbook' };
const HURSH: Source = { cite: 'Hursh, "Conduction velocity and diameter of nerve fibers", Am. J. Physiol. 127 (1939) 131: 1 to 120 m/s', kind: 'paper' };
const BERG: Source = { cite: 'Berg, Random Walks in Biology, Princeton 1993, ch. 1', kind: 'textbook' };
const CODATA: Source = { cite: 'CODATA 2018: c = 299 792 458 m/s exactly (SI 2019)', kind: 'standard' };
const CABLE: Source = { cite: 'velocity factor of a wire pair or coaxial line 0.66 to 0.95 of c (estimate: a typical hookup wire about 0.7 c)', kind: 'rule of thumb' };

export const C_LIGHT = 299792458;

export const MECHANISMS: Mechanism[] = [
  { id: 'carry.light', name: 'light in vacuum', speed: C_LIGHT, medium: 'vacuum', source: CODATA },
  { id: 'carry.wire', name: 'an electrical signal along a wire', speed: 0.7 * C_LIGHT, medium: 'copper with insulation', source: CABLE },
  { id: 'carry.sound-steel', name: 'a longitudinal wave in steel', speed: 5960, medium: 'steel', source: KAYE },
  { id: 'carry.sound-water', name: 'sound in water', speed: 1480, medium: 'water', source: KAYE },
  { id: 'carry.sound-air', name: 'sound in air', speed: 343, medium: 'air at 20 °C', source: KAYE },
  { id: 'carry.nerve-myelinated', name: 'an impulse along a myelinated nerve', speed: 100, medium: 'an Aα fibre', source: HURSH },
  { id: 'carry.nerve-unmyelinated', name: 'an impulse along an unmyelinated nerve', speed: 1, medium: 'a C fibre', source: HURSH },
  { id: 'carry.diffusion-water', name: 'diffusion of a small molecule in water', diffusivity: 1e-9, medium: 'water', source: BERG },
  { id: 'carry.diffusion-air', name: 'diffusion of a small molecule in air', diffusivity: 1e-5, medium: 'air', source: BERG },
];

export const mechanismById = (id: string) => MECHANISMS.find((m) => m.id === id);

export interface Chain {
  distance: number;
  mechanism: Mechanism;
  speed: number;
  propagationTime: number;
  responseTime: number;
  observationTime: number;
  ratios: { propagationOverResponse: number; responseOverObservation: number; propagationOverObservation: number };
  /** Lumped (one state across it) or distributed (waves, delays). */
  regime: 'lumped' | 'distributed';
  /** Whether the observer resolves the response. */
  observed: 'instantaneous' | 'resolved' | 'static';
  causal: boolean;
  says: string;
}

/** The chain for a system: how far, by what, how fast, how long, against how fast it answers and how fast it is watched. */
export function propagation(distance: number, mechanism: Mechanism, responseTime: number, observationTime: number, opts: { hypothetical?: boolean } = {}): Chain {
  const speed = mechanism.speed ?? (mechanism.diffusivity ? (2 * mechanism.diffusivity) / distance : NaN);
  const propagationTime = mechanism.diffusivity ? (distance * distance) / (2 * mechanism.diffusivity) : distance / speed;
  const causal = speed <= C_LIGHT * (1 + 1e-12);
  if (!causal && !opts.hypothetical) throw new Error(`${mechanism.name} at ${speed.toExponential(2)} m/s exceeds the speed of light: refused outside a model marked hypothetical`);
  const ratios = { propagationOverResponse: propagationTime / responseTime, responseOverObservation: responseTime / observationTime, propagationOverObservation: propagationTime / observationTime };
  const he = GROUPS.find((g) => g.id === 'He')!;
  const regime: Chain['regime'] = ratios.propagationOverResponse < he.boundaries[0]!.at ? 'lumped' : 'distributed';
  const observed: Chain['observed'] = ratios.responseOverObservation < 1 ? 'instantaneous' : ratios.responseOverObservation > 1e4 ? 'static' : 'resolved';
  const f = (x: number) => (x >= 1e6 || x < 1e-3 ? x.toExponential(2) : String(+x.toPrecision(4)));
  return { distance, mechanism, speed, propagationTime, responseTime, observationTime, ratios, regime, observed, causal, says: `${f(distance)} m by ${mechanism.name} at ${f(speed)} m/s takes ${f(propagationTime)} s; the system answers in ${f(responseTime)} s (He = ${f(ratios.propagationOverResponse)}: ${regime}); watched every ${f(observationTime)} s it is ${observed}${causal ? '' : ' (HYPOTHETICAL: faster than light)'}.` };
}
