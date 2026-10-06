// Going from one orbit to another in a time asked, by the laws of two bodies: the planets on circles in one plane
// round the Sun, a transfer that leaves along the first orbit (its periapsis there), its shape found so that it reaches
// the second orbit in the time asked (Kepler's equation, elliptic or hyperbolic), and the speed it must gain or lose at
// each end from a low orbit there (patched conics). Then the rocket equation for what that costs in propellant.

const MU_SUN = 1.32712440018e20, AU = 1.495978707e11, g0 = 9.80665;
/** Bodies kept: their μ = G M (m³/s²), radius (m), and the radius of their orbit (m) round the Sun (NASA planetary fact sheets). */
export const BODIES: Record<string, { mu: number; R: number; a: number; name: string }> = {
  venus: { mu: 3.24859e14, R: 6.0518e6, a: 0.72333 * AU, name: 'Venus' },
  earth: { mu: 3.986004418e14, R: 6.371e6, a: 1.00000 * AU, name: 'the Earth' },
  mars: { mu: 4.282837e13, R: 3.3895e6, a: 1.52371 * AU, name: 'Mars' },
  jupiter: { mu: 1.26686534e17, R: 6.9911e7, a: 5.20336 * AU, name: 'Jupiter' },
};
/** A low orbit: 400 km up (estimate, the height the ISS keeps). */
const LOW = 4e5;

/** The time from periapsis at r1 to r2 on a conic of eccentricity e about μ (kept to check the slowest, Hohmann's). */
export function timeTo(r1: number, r2: number, e: number, mu: number): number {
  const p = r1 * (1 + e), cv = (p / r2 - 1) / e, nu = Math.acos(Math.max(-1, Math.min(1, cv)));
  if (Math.abs(e - 1) < 1e-9) { const D = Math.tan(nu / 2); return 0.5 * Math.sqrt(p ** 3 / mu) * (D + D ** 3 / 3); }
  if (e < 1) { const a = r1 / (1 - e), E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2)); return Math.sqrt(a ** 3 / mu) * (E - e * Math.sin(E)); }
  const a = r1 / (1 - e), H = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2)); return Math.sqrt((-a) ** 3 / mu) * (e * Math.sinh(H) - H);
}
export interface Transfer { days: number; angle: number; vInf1: number; vInf2: number; dv1: number; dv2: number; hohmann: number; slowest: boolean }
// Stumpff's functions, for the universal-variable form of Kepler's equation
const Cz = (z: number) => (z > 1e-8 ? (1 - Math.cos(Math.sqrt(z))) / z : z < -1e-8 ? (Math.cosh(Math.sqrt(-z)) - 1) / -z : 0.5);
const Sz = (z: number) => (z > 1e-8 ? (Math.sqrt(z) - Math.sin(Math.sqrt(z))) / Math.sqrt(z) ** 3 : z < -1e-8 ? (Math.sinh(Math.sqrt(-z)) - Math.sqrt(-z)) / Math.sqrt(-z) ** 3 : 1 / 6);
/** Lambert's problem: the speeds at r1 and r2 (vectors in the plane) of the conic that joins them, the short way round,
 *  in a time T about μ (H. D. Curtis, Orbital Mechanics for Engineering Students, Algorithm 5.2). */
function lambert(r1: [number, number], r2: [number, number], T: number, mu: number): [[number, number], [number, number]] | null {
  const R1 = Math.hypot(...r1), R2 = Math.hypot(...r2), cth = (r1[0] * r2[0] + r1[1] * r2[1]) / (R1 * R2), crossZ = r1[0] * r2[1] - r1[1] * r2[0];
  let th = Math.acos(Math.max(-1, Math.min(1, cth))); if (crossZ < 0) th = 2 * Math.PI - th;
  const A = Math.sin(th) * Math.sqrt((R1 * R2) / (1 - Math.cos(th)));
  const y = (z: number) => R1 + R2 + (A * (z * Sz(z) - 1)) / Math.sqrt(Cz(z)), F = (z: number) => { const yz = y(z); return yz < 0 ? -Infinity : (yz / Cz(z)) ** 1.5 * Sz(z) + A * Math.sqrt(yz) - Math.sqrt(mu) * T; };
  let lo = -4 * Math.PI ** 2, hi = 4 * Math.PI ** 2 - 1e-6; while (F(lo) === -Infinity || Number.isNaN(F(lo))) { lo += 0.1; if (lo > hi) return null; }
  if (F(lo) > 0 || F(hi) < 0) return null;
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if (F(mid) > 0) hi = mid; else lo = mid; }
  const z = (lo + hi) / 2, yz = y(z), f = 1 - yz / R1, g = A * Math.sqrt(yz / mu), gd = 1 - yz / R2;
  return [[(r2[0] - f * r1[0]) / g, (r2[1] - f * r1[1]) / g], [(gd * r2[0] - r1[0]) / g, (gd * r2[1] - r1[1]) / g]];
}
/** From a low orbit of one body to a low orbit of another in `days`: of every angle round the Sun the transfer could
 *  cover (each a phase the planets must be at to leave), the one that costs the least speed in all; no slower than the
 *  slowest that arrives at all, Hohmann's. */
export function transfer(from: string, to: string, days: number): Transfer {
  const A = BODIES[from]!, B = BODIES[to]!, r1 = A.a, r2 = B.a, v1c = Math.sqrt(MU_SUN / r1), v2c = Math.sqrt(MU_SUN / r2);
  const tH = Math.PI * Math.sqrt(((r1 + r2) / 2) ** 3 / MU_SUN), T = Math.min(days * 86400, tH * 1.0001);
  const burn = (b: typeof A, vInf: number) => { const r = b.R + LOW; return Math.sqrt(vInf * vInf + (2 * b.mu) / r) - Math.sqrt(b.mu / r); };
  let best: Transfer | null = null;
  // a transfer of half a turn exactly leaves its plane undefined (Lambert's form is singular there): it is stepped round
  for (let deg = 20; deg <= 200; deg += 0.5) {
    if (Math.abs(deg - 180) < 2) continue;
    const th = (deg * Math.PI) / 180, v = lambert([r1, 0], [r2 * Math.cos(th), r2 * Math.sin(th)], T, MU_SUN); if (!v) continue;
    const vInf1 = Math.hypot(v[0][0], v[0][1] - v1c), vInf2 = Math.hypot(v[1][0] + v2c * Math.sin(th), v[1][1] - v2c * Math.cos(th)), dv1 = burn(A, vInf1), dv2 = burn(B, vInf2);
    if (!best || dv1 + dv2 < best.dv1 + best.dv2) best = { days: T / 86400, angle: deg, vInf1, vInf2, dv1, dv2, hohmann: tH / 86400, slowest: days * 86400 >= tH };
  }
  return best!;
}
/** The rocket equation: of a mass m0 leaving, what is left after Δv at a specific impulse Isp (s). */
export const left = (m0: number, dv: number, Isp: number) => m0 / Math.exp(dv / (g0 * Isp));
