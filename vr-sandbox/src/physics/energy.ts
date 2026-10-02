// The energy ledger: every joule in the world, where it is and where it went. Motion (kinetic), height (potential),
// wound springs and stretched bands (elastic) hold it; hands, batteries, magnets and water put it in or take it out;
// friction, impacts, bending past yield, air, induced currents and material damping turn it to heat. What nothing
// accounts for is the integrator's own, shown as such rather than hidden: in a passive scene it should stay near zero.

import type { Vec3 } from '../doc/types';

export interface HeatBook {
  /** Sliding at contacts and in bearings. */
  friction: number;
  /** Collisions that don't bounce back all they came in with. */
  impact: number;
  /** Bending past yield (Taylor-Quinney: about 90% of it heats the metal). */
  plastic: number;
  /** Air drag. */
  air: number;
  /** Induced (eddy) currents in conductors moving through a field, and eddy brakes. */
  eddy: number;
  /** Springs' and rubber's internal damping. */
  damping: number;
  /** Current through resistance: a battery's cells, the wires, a motor's winding (Joule heating, I^2 R). */
  electric: number;
}

export interface WorkBook {
  hands: number;
  /** Chemical energy batteries gave up (to the motors wired to them, less nothing: their own losses are heat). */
  batteries: number;
  magnets: number;
  /** Buoyancy and the water's drag, net. */
  fluids: number;
  /** Work the servos did on what they turn: a source's work with no store behind it yet (F-2.2 open, docs/FRONTIER.md D-servo-source). */
  servos: number;
}

export interface Energies {
  kinetic: number;
  potential: number;
  elastic: number;
  /** Heat made since the scene began, by cause. */
  heat: HeatBook;
  /** Work put in since the scene began, by source (negative where a source took energy out). */
  work: WorkBook;
  /** What nothing above accounts for, kept apart by sign (a loss and a gain are different defects). */
  numerical: NumericalBook;
}

/**
 * Energy the books cannot place. Both entries are positive and are the realisation's, never a cause's: a loss is the
 * integrator's (semi-implicit Euler in free fall, angular damping) until a heat source claims it; a gain is energy made
 * from nothing, which F-2.1 forbids, so it is a defect to find, not a term to absorb. The books never attribute either
 * to a hand (a hand's work is measured where it is applied, or not at all).
 */
export interface NumericalBook {
  lost: number;
  gained: number;
  /** The part of `gained` made while a hand was moving a part kinematically, where no work is measured: an annotation of when, not an attribution of why. */
  gainedHeld: number;
}
export const emptyNumerical = (): NumericalBook => ({ lost: 0, gained: 0, gainedHeld: 0 });

export const emptyHeat = (): HeatBook => ({ friction: 0, impact: 0, plastic: 0, air: 0, eddy: 0, damping: 0, electric: 0 });
export const emptyWork = (): WorkBook => ({ hands: 0, batteries: 0, magnets: 0, fluids: 0, servos: 0 });
export const emptyEnergies = (): Energies => ({ kinetic: 0, potential: 0, elastic: 0, heat: emptyHeat(), work: emptyWork(), numerical: emptyNumerical() });

/** Kinetic energy of a rigid body: translation of its centre plus rotation about it (world inertia, row-major). */
export function kineticEnergy(mass: number, v: Vec3, w: Vec3, I: number[] | null): number {
  const t = 0.5 * mass * (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (!I) return t;
  const Iw: Vec3 = [I[0]! * w[0] + I[1]! * w[1] + I[2]! * w[2], I[3]! * w[0] + I[4]! * w[1] + I[5]! * w[2], I[6]! * w[0] + I[7]! * w[1] + I[8]! * w[2]];
  return t + 0.5 * (w[0] * Iw[0] + w[1] * Iw[1] + w[2] * Iw[2]);
}

/** Gravitational potential energy of a centre of mass at p, relative to the floor (y = 0) for gravity g. */
export const potentialEnergy = (mass: number, p: Vec3, g: Vec3) => -mass * (g[0] * p[0] + g[1] * p[1] + g[2] * p[2]);

/** Energy in a linear spring of stiffness k stretched by x from its rest length. */
export const springEnergy = (k: number, x: number) => 0.5 * k * x * x;

const sum = (o: object) => Object.values(o).reduce((s: number, v: number) => s + v, 0);
/** Everything held now, J. */
export const stored = (e: Energies) => e.kinetic + e.potential + e.elastic;
export const heatMade = (e: Energies) => sum(e.heat);
export const workDone = (e: Energies) => sum(e.work);

/**
 * The books balance when what is held now equals what was held at the start, plus the work put in, less the heat
 * made, less what the realisation lost, plus what it made: E_start + W = E_now + Q + lost - gained. Returns the
 * imbalance (0 when they close).
 */
export const imbalance = (start: number, e: Energies) => start + workDone(e) - stored(e) - heatMade(e) - e.numerical.lost + e.numerical.gained;

/** One place a tick's heat was made: a contact, a bearing, a hinge, a spring. Weights share out what the books say. */
export interface HeatSource<B> {
  a: B | null;
  b: B | null;
  /** Estimated joules this tick (only their proportions matter). */
  w: number;
  cause: keyof HeatBook;
}

/**
 * Share `total` joules of heat among the places that made it this tick, in proportion to each one's estimate, by
 * cause. Returns the joules per source, in order; sums to `total` exactly (when any source has weight).
 */
export function shareHeat<B>(total: number, sources: HeatSource<B>[]): number[] {
  const W = sources.reduce((s, x) => s + Math.max(0, x.w), 0);
  if (!(W > 0) || !(total > 0)) return sources.map(() => 0);
  return sources.map((x) => (total * Math.max(0, x.w)) / W);
}
