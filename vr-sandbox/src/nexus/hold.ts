// Holding a temperature across scale. A region held at a temperature above its surroundings loses energy across its
// boundary at its conductance times the difference, and must make or be given that power. For a body in a still
// medium the least conductance is conduction alone, which for a sphere of radius r in a medium of conductivity k is
// 4π k r (Carslaw and Jaeger, Conduction of Heat in Solids, 2nd ed., 1959): it grows with the size, while what a body of
// that size holds and makes grows with its volume. So the difference a body holds by what it makes grows with its size,
// and there is a least size that can hold a given difference at all. Its own time, capacity over conductance, says how
// fast it forgets a difference it is not given the power to hold.

/** The least conductance from a sphere into a still medium: conduction alone, W/K. */
export const sphereConductance = (r: number, k: number) => 4 * Math.PI * k * r;

/** A sphere's mass at a density, kg. */
export const sphereMass = (r: number, rho: number) => (4 / 3) * Math.PI * r ** 3 * rho;

/** How long a body takes to forget a difference: its capacity over its conductance, s. For a sphere, ρ c r² / (3 k). */
export const ownTime = (r: number, rho: number, cp: number, k: number) => (sphereMass(r, rho) * cp) / sphereConductance(r, k);

/** The difference a body making P(M) = a M^b holds above a still medium by conduction alone, K. */
export const heldBy = (r: number, rho: number, k: number, production: { a: number; b: number }) => (production.a * sphereMass(r, rho) ** production.b) / sphereConductance(r, k);

/**
 * The least mass that holds a difference by what it makes, kg. The difference held grows as r^(3b − 1), so for b above a
 * third there is one such size, and it is solved in closed form.
 */
export function leastMassToHold(dT: number, rho: number, k: number, production: { a: number; b: number }): number {
  // a (ρ 4π/3)^b r^(3b) / (4π k r) = dT  →  r^(3b − 1) = dT 4π k / (a (ρ 4π/3)^b)
  const r = ((dT * 4 * Math.PI * k) / (production.a * ((4 / 3) * Math.PI * rho) ** production.b)) ** (1 / (3 * production.b - 1));
  return sphereMass(r, rho);
}
