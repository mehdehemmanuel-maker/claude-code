// Assorted mechanical relations: bearings, motors, drag, rubber, eddy brakes, gears, belts, cables.

/** Aerodynamic / hydrodynamic drag magnitude F = 0.5 rho Cd A v^2. */
export const dragForce = (rho: number, Cd: number, A: number, v: number) => 0.5 * rho * Cd * A * v * v;

/** Skin depth in the conductor at frequency f: delta = 1 / sqrt(pi f mu0 sigma). */
export function skinDepth(f: number, sigma: number, mu0 = 4e-7 * Math.PI) {
  return 1 / Math.sqrt(Math.PI * Math.max(f, 1e-6) * mu0 * sigma);
}

/** Lewis bending stress sigma = W_t / (b m Y) (metric form). */
export const lewisStress = (Wt: number, faceWidth: number, module: number, Y: number) => Wt / (faceWidth * module * Y);

/** Capstan (Euler-Eytelwein): T_load / T_hold = e^(mu theta). */
export const capstanRatio = (mu: number, wrapAngle: number) => Math.exp(mu * wrapAngle);

