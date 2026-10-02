// Every law has a scale. The laws in the ganglia were found by people, measuring with the senses and instruments
// they had, at the sizes, speeds, temperatures and times they could reach; each is exact only in a limit, and past it
// something deeper takes over. So a law is never used bare: each here carries the dimensionless number that says how
// far inside its limit a use is (a speed against light's, a mean free path against a thickness, a drop against its
// capillary length), the deeper law it is the limit of, and, where it can be worked, the error it makes against that
// deeper law. Nothing here is the last word either: each deeper law has a limit of its own, which is why the chain is
// written down rather than a single "true" law.

import { lawById } from './laws';

/** A law's limit: the number that says how far inside it a use is, and what it is the limit of. */
export interface Regime {
  law: string;
  /** The governing dimensionless number, as written. */
  group: string;
  /** Extra quantities the number needs beyond the law's own inputs (SI), with their usual values. */
  needs?: Record<string, { name: string; usual: number }>;
  /** The number, from the law's inputs and any extra quantities. */
  of: (x: Record<string, number>) => number;
  /** In words: where the law holds. */
  holds: string;
  /** Whether a value of the number is inside the limit. */
  within: (g: number) => boolean;
  /** The deeper law it is the limit of. */
  deeper: string;
  /** Its error against the deeper law (a share: positive means it says too much), where that can be worked. */
  error?: (x: Record<string, number>) => number;
}

const C = 299792458, R_EARTH = 6.371e6;
/** γ − 1, without the cancellation of 1/√(1 − β²) − 1 at small β. */
const gammaMinus1 = (b: number) => { const s = Math.sqrt(1 - b * b); return (b * b) / (s * (1 + s)); };
/** The complete elliptic integral of the first kind, by the arithmetic-geometric mean (Abramowitz & Stegun 17.6). */
export function ellipticK(k: number): number {
  let a = 1, g = Math.sqrt(1 - k * k);
  for (let i = 0; i < 40 && Math.abs(a - g) > 1e-15; i++) [a, g] = [(a + g) / 2, Math.sqrt(a * g)];
  return Math.PI / (2 * a);
}

export const REGIMES: Regime[] = [
  {
    law: 'energy.kinetic', group: 'β = v / c', of: ({ v }) => v! / C, holds: 'speeds far below light\'s (β ≪ 1)', within: (b) => b < 0.01,
    deeper: 'special relativity: E = (γ − 1) m c², with γ = 1 / √(1 − β²)',
    error: ({ v }) => { const b = v! / C; return (0.5 * b * b) / gammaMinus1(b) - 1; },
  },
  {
    law: 'newton.second', group: 'β = v / c', needs: { v: { name: 'speed', usual: 0 } }, of: ({ v }) => v! / C, holds: 'speeds far below light\'s', within: (b) => b < 0.01,
    deeper: 'special relativity: along the motion F = γ³ m a', error: ({ v }) => { const b = v! / C; return 1 / (1 + gammaMinus1(b)) ** 3 - 1; },
  },
  {
    law: 'centripetal', group: 'β = v / c', of: ({ v }) => v! / C, holds: 'speeds far below light\'s', within: (b) => b < 0.01,
    deeper: 'special relativity: F = γ m v² / r', error: ({ v }) => 1 / (1 + gammaMinus1(v! / C)) - 1,
  },
  {
    law: 'energy.potential', group: 'h / R (height against the planet\'s radius)', needs: { R: { name: 'planet radius', usual: R_EARTH } }, of: ({ h, R }) => h! / (R ?? R_EARTH),
    holds: 'heights small against the planet (gravity the same all the way up)', within: (x) => x < 1e-3,
    deeper: 'Newton\'s inverse square: E = G M m (1/R − 1/(R + h)), itself the weak-field limit of general relativity', error: ({ h, R }) => h! / (R ?? R_EARTH),
  },
  {
    law: 'pendulum.period', group: 'θ₀ (the swing\'s amplitude, rad)', needs: { theta: { name: 'amplitude', usual: 0.1 } }, of: ({ theta }) => theta ?? 0.1,
    holds: 'small swings (θ₀ ≪ 1 rad)', within: (t) => t < 0.2,
    deeper: 'the exact pendulum: T = 4 √(L/g) K(sin(θ₀/2)), an elliptic integral',
    error: ({ theta }) => (Math.PI / 2) / ellipticK(Math.sin((theta ?? 0.1) / 2)) - 1,
  },
  {
    law: 'stress.axial', group: 'σ / S_y (stress against yield)', needs: { Sy: { name: 'yield strength', usual: 250e6 } }, of: ({ F, A, Sy }) => F! / A! / (Sy ?? 250e6),
    holds: 'stresses below yield, where the bar stretches back (elastic) and the stress is even over the section', within: (x) => x < 1,
    deeper: 'plasticity past yield, then fracture; and at the scale of a perfect crystal, its theoretical strength, about a tenth of its modulus',
  },
  {
    law: 'conduction', group: 'Kn = λ / L (the carriers\' mean free path against the thickness)', needs: { mfp: { name: 'mean free path of the carriers (air 68 nm; phonons in silicon about 300 nm)', usual: 68e-9 } },
    of: ({ L, mfp }) => (mfp ?? 68e-9) / L!, holds: 'layers far thicker than the mean free path (Kn ≪ 1)', within: (kn) => kn < 0.01,
    deeper: 'kinetic theory (the Boltzmann transport equation): with pores below the mean free path, a gas conducts less than its bulk value, which is why aerogel insulates better than still air',
    // a gas in pores conducts k₀ / (1 + 2 β Kn), β about 1.6 for air (Kaganer, Thermal Insulation in Cryogenic Engineering, 1969)
    error: ({ L, mfp }) => 2 * 1.6 * ((mfp ?? 68e-9) / L!),
  },
  {
    law: 'drag.aero', group: 'Re = ρ v D / μ', needs: { D: { name: 'size across the flow', usual: 0.1 }, mu: { name: 'viscosity (air 1.81e-5 Pa s)', usual: 1.81e-5 } },
    of: ({ rho, v, D, mu }) => (rho! * v! * (D ?? 0.1)) / (mu ?? 1.81e-5), holds: 'Re above about a thousand, where the drag coefficient is nearly constant', within: (re) => re > 1e3,
    deeper: 'the Navier-Stokes equations: at Re below about 1 drag goes as v (Stokes, F = 3π μ D v), not v²',
  },
  {
    law: 'ohm', group: 'L / ℓ (conductor length against the electrons\' mean free path)', needs: { L: { name: 'conductor length', usual: 1 }, mfp: { name: 'electron mean free path (copper about 39 nm)', usual: 39e-9 } },
    of: ({ L, mfp }) => (L ?? 1) / (mfp ?? 39e-9), holds: 'conductors far longer than the mean free path', within: (x) => x > 100,
    deeper: 'ballistic transport (Landauer-Büttiker): below the mean free path resistance comes in quanta of h / 2e², not ρ L / A',
  },
  {
    law: 'radiation', group: 'd k T / (h c) (gap against the thermal wavelength)', needs: { d: { name: 'gap between surfaces', usual: 0.01 } },
    of: ({ T, d }) => ((d ?? 0.01) * 1.380649e-23 * T!) / (6.62607015e-34 * C), holds: 'gaps and bodies far larger than the thermal wavelength (about 50 µm at room temperature)', within: (x) => x > 10,
    deeper: 'fluctuational electrodynamics (Polder-Van Hove): across sub-micron gaps heat radiates many times past the blackbody limit',
  },
  {
    law: 'time.dilation.gravity', group: 'r_s / r (the Schwarzschild radius against the distance)', of: ({ M, r }) => (2 * 6.6743e-11 * M!) / (r! * C * C),
    holds: 'outside a non-rotating, spherical mass (exact there in general relativity)', within: (x) => x < 1,
    deeper: 'general relativity for spinning bodies (Kerr), and below the Planck length (1.6e-35 m) a quantum theory of gravity no one has yet',
  },
  {
    law: 'diffusion.time', group: 'x / λ (distance against the mean free path)', needs: { mfp: { name: 'mean free path (air 68 nm)', usual: 68e-9 } }, of: ({ x, mfp }) => x! / (mfp ?? 68e-9),
    holds: 'distances of many mean free paths, where motion is a random walk', within: (r) => r > 100,
    deeper: 'ballistic flight below the mean free path: distance goes as t, not √t',
  },
  {
    law: 'young.contact', group: 'R / ℓ_c (a drop against the capillary length √(γ / ρ g))', needs: { R: { name: 'drop radius', usual: 1e-3 }, rho: { name: 'liquid density', usual: 1000 } },
    of: ({ glv, R, rho }) => (R ?? 1e-3) / Math.sqrt(glv! / ((rho ?? 1000) * 9.80665)), holds: 'drops smaller than the capillary length (2.7 mm for water) and larger than about 10 nm, where line tension matters', within: (x) => x < 1 && x > 1e-5,
    deeper: 'gravity flattens larger drops into puddles (their height set by the capillary length); molecular forces and line tension shape the smallest',
  },
  {
    law: 'acoustic.mass-law', group: 'f / f_c (frequency against the panel\'s coincidence frequency)', needs: { fc: { name: 'coincidence frequency (200 mm concrete about 90 Hz; 12.5 mm plasterboard about 2.5 kHz)', usual: 2500 } },
    of: ({ f, fc }) => f! / (fc ?? 2500), holds: 'below the coincidence frequency, where the panel moves as a mass', within: (x) => x < 0.5,
    deeper: 'the bending-wave theory of plates (Cremer): at coincidence the panel\'s own waves match the sound\'s, and it lets far more through',
  },
  {
    law: 'carnot', group: 'ΔS / k_B (the entropy produced, in units of Boltzmann\'s constant)', needs: { dS: { name: 'entropy produced (J/K)', usual: 1 } }, of: ({ dS }) => (dS ?? 1) / 1.380649e-23,
    holds: 'any engine large enough that its entropy changes are many k_B (every machine people build)', within: (x) => x > 100,
    deeper: 'the fluctuation theorems (Evans-Searles, Crooks): a nanoscale engine can briefly beat Carnot, with odds falling as e^(−ΔS / k_B)',
  },
  {
    law: 'arrhenius', group: 'T / T_x (temperature against the crossover where tunnelling takes over)', needs: { Tx: { name: 'tunnelling crossover temperature', usual: 50 } }, of: ({ T, Tx }) => T! / (Tx ?? 50),
    holds: 'temperatures well above the crossover, where molecules climb over their barrier', within: (x) => x > 3,
    deeper: 'transition-state theory (Eyring), and quantum tunnelling through the barrier when cold: rates stop falling as fast as Arrhenius says',
  },
];

export const regimeOf = (law: string) => REGIMES.find((r) => r.law === law);

export interface ScaleCheck { law: string; group: string; value: number; within: boolean; holds: string; deeper: string; error?: number; says: string }

/** How far inside its limit a use of a law is, and what it misses against the law it is the limit of. */
export function scaleCheck(law: string, inputs: Record<string, number>): ScaleCheck | null {
  const r = regimeOf(law);
  if (!r) return null;
  const x: Record<string, number> = { ...inputs };
  for (const [k, v] of Object.entries(r.needs ?? {})) if (!(k in x)) x[k] = v.usual;
  const value = r.of(x), within = r.within(value), error = r.error?.(x);
  const name = lawById(law)?.name ?? law;
  const err = error === undefined ? '' : `, ${Math.abs(error) < 1e-12 ? 'no measurable' : `${(Math.abs(error) * 100).toPrecision(2)}%`} error against the deeper law`;
  return {
    law, group: r.group, value, within, holds: r.holds, deeper: r.deeper, ...(error === undefined ? {} : { error }),
    says: `${name} holds for ${r.holds}. Here ${r.group} is ${value.toPrecision(3)}: ${within ? 'inside its limit' : 'past its limit'}${err}. It is the limit of ${r.deeper}.`,
  };
}
