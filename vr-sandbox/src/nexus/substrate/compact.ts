// Bodies held up against their own gravity by electrons that cannot share a state (docs/NEXUS-FROM-REALITY.md,
// section 25). Where the scale tuner finds that a unit's gravity in a body exceeds the unit's own binding, the matter
// no longer bears its weight as matter does: its atoms are crushed together, and what holds the body up is the
// pressure of filling (src/nexus/substrate/fermi.ts). A body in balance has its pressure fall outward exactly as its weight
// above presses down:
//
//   dP/dr = −G m(r) ρ / r²,     dm/dr = 4π r² ρ
//
// The pressure of filling is Chandrasekhar's, for electrons of any speed. With x = p_F/(m_e c), the last electron's
// momentum in units of m_e c:
//
//   n_e = (8π/3h³) (m_e c x)³,     ρ = μ_e m_u n_e
//   P   = (π m_e⁴ c⁵ / 3h³) [x (2x² − 3) √(1 + x²) + 3 sinh⁻¹ x],     dP/dx = (8π m_e⁴ c⁵ / 3h³) x⁴ / √(1 + x²)
//
// Here μ_e is the mass per electron in atomic mass units, so 1 for the ladder's own matter and A/Z for a named
// element. The balance is integrated outward from the centre until the pressure is gone. The radius is where it is
// gone, and the mass is what lies within it, so each central x gives one body. Slow electrons (x ≪ 1) give
// P ∝ ρ^(5/3), and bodies grow smaller as they grow heavier, as R ∝ M^(−1/3). Fast electrons (x ≫ 1) give
// P ∝ ρ^(4/3), and the mass tends to one value whatever the density: past it, filling cannot hold a body up, and
// nothing kept here can. That is Chandrasekhar's mass. The two limits are Lane–Emden polytropes, solved here too, as
// checks on the integration.

import { CONST } from '../book/constants';

const G = () => CONST.G.value!, c = () => CONST.c.value!, h = () => CONST.h.value!, me = () => CONST.me.value!, mu = () => CONST.mu.value!;

/** The Lane–Emden equation θ'' + (2/ξ)θ' + θⁿ = 0 from θ(0) = 1, θ'(0) = 0, to its first zero ξ₁, with ω = −ξ₁² θ'(ξ₁). */
export function laneEmden(n: number): { xi1: number; omega: number } {
  // start off the centre with the series θ ≈ 1 − ξ²/6 + n ξ⁴/120
  let xi = 1e-6, th = 1 - xi ** 2 / 6, dth = -xi / 3;
  const f = (x: number, t: number, d: number) => [d, -(2 / x) * d - Math.max(t, 0) ** n] as const;
  const step = 1e-4;
  while (th > 0) {
    const [a1, b1] = f(xi, th, dth), [a2, b2] = f(xi + step / 2, th + (step / 2) * a1, dth + (step / 2) * b1);
    const [a3, b3] = f(xi + step / 2, th + (step / 2) * a2, dth + (step / 2) * b2), [a4, b4] = f(xi + step, th + step * a3, dth + step * b3);
    const thN = th + (step / 6) * (a1 + 2 * a2 + 2 * a3 + a4), dN = dth + (step / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
    if (thN <= 0) { const s = th / (th - thN); const z = xi + s * step, dz = dth + s * (dN - dth); return { xi1: z, omega: -(z * z) * dz }; }
    xi += step; th = thN; dth = dN;
  }
  return { xi1: xi, omega: -(xi * xi) * dth };
}

/** Chandrasekhar's pressure of filling, and its slope, at x = p_F/(m_e c). */
const A = () => (Math.PI * me() ** 4 * c() ** 5) / (3 * h() ** 3);
export const pressureOf = (x: number) => A() * (x * (2 * x * x - 3) * Math.sqrt(1 + x * x) + 3 * Math.asinh(x));
const dPdx = (x: number) => 8 * A() * (x ** 4 / Math.sqrt(1 + x * x));
/** The mass density at x for μ_e atomic mass units per electron. */
export const densityAt = (x: number, muE: number) => muE * mu() * ((8 * Math.PI) / (3 * h() ** 3)) * (me() * c() * x) ** 3;

/** One body: integrate the balance outward from the centre at x_c until the pressure is gone. Its mass and its radius. */
export function bodyAt(xc: number, muE: number): { M: number; R: number; centralDensity: number } {
  const rho0 = densityAt(xc, muE), P0 = pressureOf(xc);
  // the body's own length: where its central pressure, against its central weight, sets a scale
  const scale = Math.sqrt(P0 / (G() * rho0 * rho0));
  let r = 1e-6 * scale, x = xc, m = (4 / 3) * Math.PI * r ** 3 * rho0;
  // dx/dr = −G m ρ / (r² dP/dx), dm/dr = 4π r² ρ
  const deriv = (rr: number, xx: number, mm: number): [number, number] => {
    if (xx <= 0) return [0, 0];
    const rho = densityAt(xx, muE);
    return [(-G() * mm * rho) / (rr * rr * dPdx(xx)), 4 * Math.PI * rr * rr * rho];
  };
  let dr = 1e-3 * scale;
  for (let i = 0; i < 2e6; i++) {
    const [k1x, k1m] = deriv(r, x, m), [k2x, k2m] = deriv(r + dr / 2, x + (dr / 2) * k1x, m + (dr / 2) * k1m);
    const [k3x, k3m] = deriv(r + dr / 2, x + (dr / 2) * k2x, m + (dr / 2) * k2m), [k4x, k4m] = deriv(r + dr, x + dr * k3x, m + dr * k3m);
    const xN = x + (dr / 6) * (k1x + 2 * k2x + 2 * k3x + k4x), mN = m + (dr / 6) * (k1m + 2 * k2m + 2 * k3m + k4m);
    if (xN <= 0 || !Number.isFinite(xN)) {
      // the edge lies within this step: shrink onto it
      if (dr < 1e-10 * scale) return { M: m, R: r, centralDensity: rho0 };
      dr /= 4; continue;
    }
    r += dr; x = xN; m = mN;
    // a step a small share of the distance over which x itself changes, so the edge is reached cleanly
    const slope = Math.abs(deriv(r, x, m)[0]);
    dr = Math.min(1e-2 * scale, slope > 0 ? (0.02 * x) / slope : dr * 2);
  }
  return { M: m, R: r, centralDensity: rho0 };
}

/**
 * The mass filling cannot hold past: fast electrons give the n = 3 polytrope P = K ρ^(4/3), with
 * K = (ħc/4)(3π²)^(1/3)/(μ_e m_u)^(4/3), whose mass 4π (K/πG)^(3/2) ω₃ depends on no density at all.
 */
export function chandrasekharMass(muE: number): number {
  const hbar = h() / (2 * Math.PI), K = ((hbar * c()) / 4) * (3 * Math.PI ** 2) ** (1 / 3) / (muE * mu()) ** (4 / 3);
  return 4 * Math.PI * (K / (Math.PI * G())) ** 1.5 * laneEmden(3).omega;
}

/** The bodies filling holds, over central x from slow to fast: masses rising, radii falling. */
export function massRadius(muE: number, xs = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100]): { xc: number; M: number; R: number }[] {
  return xs.map((xc) => ({ xc, ...bodyAt(xc, muE) }));
}

/** The filling branch, tabulated once for each μ_e over central x from very slow to very fast: (x_c, M, R), masses rising. */
const branches = new Map<number, { xc: number; M: number; R: number }[]>();
export function branch(muE: number): { xc: number; M: number; R: number }[] {
  let b = branches.get(muE);
  if (!b) { b = Array.from({ length: 61 }, (_, i) => 10 ** (-4 + i * 0.12)).map((xc) => ({ xc, ...bodyAt(xc, muE) })); branches.set(muE, b); }
  return b;
}
/** Interpolate along the branch in logs, where `key` rises or falls monotonically, for the point where it equals `at`. */
function along(b: { M: number; R: number }[], key: 'M' | 'R', at: number): { M: number; R: number } | null {
  for (let i = 0; i + 1 < b.length; i++) {
    const [u, v] = [b[i]!, b[i + 1]!];
    if ((u[key] - at) * (v[key] - at) <= 0) {
      const t = Math.log(at / u[key]) / Math.log(v[key] / u[key]);
      return { M: Math.exp(Math.log(u.M) + t * Math.log(v.M / u.M)), R: Math.exp(Math.log(u.R) + t * Math.log(v.R / u.R)) };
    }
  }
  return null;
}

/**
 * The cold body of a given size made of a matter whose units, uncrushed, have density ρ_matter: the lighter of the two
 * a size allows. A body whose matter bears its weight has M = ρ_matter (4π/3) L³; one whose matter is crushed is held
 * by filling, with the radius the balance gives. The two branches meet at the largest a cold body can be: beyond it no
 * cold body has that size, and only heat can hold one up.
 */
export function coldBody(L: number, muE: number, rhoMatter: number): { branch: 'matter' | 'filling' | 'none'; M: number | null; largest: number; largestMass: number } {
  const b = branch(muE), matterR = (M: number) => ((3 * M) / (4 * Math.PI * rhoMatter)) ** (1 / 3);
  // where the filling branch's radius meets the matter branch's for the same mass: their ratio crosses one
  let meet: { M: number; R: number } | null = null;
  for (let i = 0; i + 1 < b.length && !meet; i++) {
    const [u, v] = [b[i]!, b[i + 1]!], fu = Math.log(u.R / matterR(u.M)), fv = Math.log(v.R / matterR(v.M));
    if (fu * fv <= 0) { const t = fu / (fu - fv); meet = { M: Math.exp(Math.log(u.M) + t * Math.log(v.M / u.M)), R: Math.exp(Math.log(u.R) + t * Math.log(v.R / u.R)) }; }
  }
  if (!meet) return { branch: 'none', M: null, largest: NaN, largestMass: NaN };
  if (L > meet.R) return { branch: 'none', M: null, largest: meet.R, largestMass: meet.M };
  const Mmatter = rhoMatter * (4 / 3) * Math.PI * L ** 3;
  if (Mmatter <= meet.M) return { branch: 'matter', M: Mmatter, largest: meet.R, largestMass: meet.M };
  const on = along(b, 'R', L);
  return { branch: 'filling', M: on ? on.M : null, largest: meet.R, largestMass: meet.M };
}
