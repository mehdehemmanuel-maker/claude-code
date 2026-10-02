// Classical beam and column results (Euler-Bernoulli, perfectly plastic hinge, Euler buckling).

/** Cantilever with an end load: tip deflection F L^3 / (3 E I). */
export const cantileverDeflection = (F: number, L: number, E: number, I: number) => (F * L ** 3) / (3 * E * I);


/** Plastic moment M_p = Z sigma_y. */
export const plasticMoment = (Z: number, yieldStress: number) => Z * yieldStress;


/** End load that forms a plastic hinge at the root of a cantilever: P = M_p / L. */
export const cantileverCollapseLoad = (Z: number, yieldStress: number, L: number) => (Z * yieldStress) / L;


/** Euler critical load P_cr = pi^2 E I / (K L)^2. */
export const eulerBucklingLoad = (E: number, I: number, L: number, K = 1) => (Math.PI ** 2 * E * I) / (K * L) ** 2;


/**
 * First free-free flexural natural frequency of a slender bar:
 * f1 = (4.730^2 / (2 pi L^2)) sqrt(E I / (rho A)).  Used for impact sound pitch.
 */
export function freeFreeBarFrequency(L: number, E: number, I: number, rho: number, A: number) {
  return ((4.73004 ** 2) / (2 * Math.PI * L * L)) * Math.sqrt((E * I) / (rho * A));
}
