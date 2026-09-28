// Classical beam and column results (Euler-Bernoulli, perfectly plastic hinge, Euler buckling).

/** Cantilever with an end load: tip deflection F L^3 / (3 E I). */
export const cantileverDeflection = (F: number, L: number, E: number, I: number) => (F * L ** 3) / (3 * E * I);

/** Bending stiffness of a cantilever tip, N/m. */
export const cantileverStiffness = (L: number, E: number, I: number) => (3 * E * I) / L ** 3;

/** Plastic moment M_p = Z sigma_y. */
export const plasticMoment = (Z: number, yieldStress: number) => Z * yieldStress;

/** Yield (first fibre) moment M_y = S sigma_y. */
export const yieldMoment = (S: number, yieldStress: number) => S * yieldStress;

/** End load that forms a plastic hinge at the root of a cantilever: P = M_p / L. */
export const cantileverCollapseLoad = (Z: number, yieldStress: number, L: number) => (Z * yieldStress) / L;

/** Effective length factors K for Euler buckling. */
export const BUCKLING_K = {
  'fixed-free': 2.0,
  'pinned-pinned': 1.0,
  'fixed-pinned': 0.699,
  'fixed-fixed': 0.5,
} as const;

/** Euler critical load P_cr = pi^2 E I / (K L)^2. */
export const eulerBucklingLoad = (E: number, I: number, L: number, K = 1) => (Math.PI ** 2 * E * I) / (K * L) ** 2;

/** Rotational stiffness of a beam segment of length L used for elastic bonds: k = E I / L (N m / rad). */
export const segmentBendingStiffness = (E: number, I: number, L: number) => (E * I) / L;

/**
 * First free-free flexural natural frequency of a slender bar:
 * f1 = (4.730^2 / (2 pi L^2)) sqrt(E I / (rho A)).  Used for impact sound pitch.
 */
export function freeFreeBarFrequency(L: number, E: number, I: number, rho: number, A: number) {
  return ((4.73004 ** 2) / (2 * Math.PI * L * L)) * Math.sqrt((E * I) / (rho * A));
}
