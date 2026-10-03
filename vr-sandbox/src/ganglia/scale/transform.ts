// Scale as a transformation. A scale transformation is not a category a thing belongs to: it is an operator on
// quantities, states, laws, manifolds and observers. It says how each base dimension (mass, length, time, current,
// temperature) scales with λ, and which quantities the regime holds fixed although their dimension would scale them
// (the same material has the same density and viscosity at every size; the same planet the same g; the same universe
// the same c, ħ, G, k_B, e). Everything else follows from dimensions: a quantity of dimension d scales as λ^(d·exponents).
// Nothing here assumes all quantities scale alike; the exponents are derived from what is held fixed and said so.
import { parseUnit, type Dim } from '../units';
import type { Quantity, Source } from '../types';

/** What a statement is, epistemically. Never converted into another silently (see hypothesis.ts). */
export type Epistemic = 'axiom' | 'theorem' | 'derivation' | 'empirical-law' | 'observation' | 'model' | 'hypothesis' | 'conjecture';

/** The base dimensions in the order units.ts keeps them. */
export const BASES = ['mass', 'length', 'time', 'current', 'temperature'] as const;
export type Base = (typeof BASES)[number];

/** What a regime holds fixed: properties of the material, of the environment, of the universe. */
export type Held = 'material' | 'environment' | 'universe';

export interface ScaleTransform {
  id: string;
  name: string;
  says: string;
  /** Exponent of λ for each base dimension [mass, length, time, current, temperature]. */
  exponents: Dim;
  /** What the regime holds fixed, so those quantities do not scale by their dimension. */
  holds: Held[];
  /** The dimensionless groups it was built to preserve (ids in groups.ts). */
  preserves: string[];
  /** How the exponents follow from what is held: the derivation, in words. */
  derivation: string;
  regime: string;
  status: Epistemic;
  source: Source;
}

const BUCKINGHAM: Source = { cite: 'Buckingham, "On physically similar systems", Phys. Rev. 4 (1914) 345; Bridgman, Dimensional Analysis, Yale 1922', kind: 'paper' };
const GALILEO: Source = { cite: 'Galileo, Two New Sciences (1638), second day: the square-cube law', kind: 'textbook' };
const FROUDE: Source = { cite: 'Froude, "On experiments with HMS Greyhound" (1874); White, Fluid Mechanics, 8th ed., ch. 5 (similarity)', kind: 'textbook' };
const INCROPERA: Source = { cite: 'Incropera, DeWitt, Bergman, Lavine, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley 2011, ch. 5 (transient conduction)', kind: 'textbook' };
const KLEIBER: Source = { cite: 'Kleiber, "Body size and metabolism", Hilgardia 6 (1932) 315; West, Brown, Enquist, Science 276 (1997) 122', kind: 'paper' };
const PLANCK: Source = { cite: 'Planck, "Über irreversible Strahlungsvorgänge", Sitzungsber. Preuss. Akad. Wiss. (1899) 440: natural units from c, G and h', kind: 'paper' };

/**
 * Quantities a regime holds fixed, told by their names as the laws name them: a density, a viscosity, a modulus, a
 * conductivity are properties of a material; a surroundings temperature or a heat transfer coefficient of the
 * environment. The constants of a law (g, σ, k_B, c) are always fixed: they are constants. The table is explicit so
 * a classification can say what it held.
 */
const MATERIAL = /\b(density|viscosity|(?<!section )modulus|stiffness of the material|conductivity|specific heat|diffusion coefficient|diffusivity|emissivity|friction|coefficient of|permittivity|permeability|resistivity|thermal expansion|speed of sound|strength|endurance|yield|allowable|poisson|shape factor|efficiency|surface tension|activation energy|molar mass|specific gravity|temperature coefficient|nut factor)\b/i;
const ENVIRONMENT = /\b(surroundings|ambient|heat transfer coefficient|solar|air pressure|atmospheric|gravity)\b/i;

export function heldBy(q: Quantity): Held | null {
  if (MATERIAL.test(q.name)) return 'material';
  if (ENVIRONMENT.test(q.name)) return 'environment';
  return null;
}

/** The exponent of λ a quantity scales with under a transform: by its dimension, or 0 when the regime holds it. */
export function exponentOf(t: ScaleTransform, q: { unit: string; name?: string }, opts: { constant?: boolean } = {}): number {
  if (opts.constant) return 0;
  const held = q.name ? heldBy({ sym: '', name: q.name, unit: q.unit }) : null;
  if (held && t.holds.includes(held)) return 0;
  return exponentOfDim(t, parseUnit(q.unit).dim);
}

export const exponentOfDim = (t: ScaleTransform, dim: Dim): number => dim.reduce((s, d, i) => s + d * t.exponents[i]!, 0);

/** A value scaled: v' = λ^e v. */
export const scaleValue = (t: ScaleTransform, q: { unit: string; name?: string }, value: number, lambda: number, opts: { constant?: boolean } = {}): number => value * Math.pow(lambda, exponentOf(t, q, opts));

/** A system as a set of quantities, scaled: each by its own exponent, said. */
export function scaleSystem(t: ScaleTransform, system: { sym: string; name: string; unit: string; value: number }[], lambda: number) {
  return system.map((q) => { const e = exponentOf(t, q); return { ...q, exponent: e, scaled: q.value * Math.pow(lambda, e), held: e === 0 && heldBy({ sym: q.sym, name: q.name, unit: q.unit }) !== null && parseUnit(q.unit).dim.some((d) => d !== 0) }; });
}

/**
 * The similarities engineering uses, each a transform derived from what it holds fixed and the group it preserves.
 * With the same material, density is fixed, so mass goes as λ³. What time does is the choice: Froude keeps gravity
 * consistent (T ∝ √λ), Cauchy keeps the speed of sound (T ∝ λ), the diffusive one keeps diffusivity (T ∝ λ²),
 * and no choice keeps them all: that is why a model test picks one and reports the others broken.
 */
export const SIMILARITIES: ScaleTransform[] = [
  { id: 'scale.geometric', name: 'geometric similarity', says: 'Only lengths scale; every other base quantity is left as it is. An idealisation that no material and no planet obeys: mass does not stay while volume grows.',
    exponents: [0, 1, 0, 0, 0], holds: [], preserves: [], derivation: 'L ∝ λ by definition; M, T, I, Θ ∝ λ⁰ by assumption, which contradicts a fixed density.', regime: 'drawings and models with no physics in them', status: 'model', source: BUCKINGHAM },
  { id: 'scale.same-material', name: 'same material, same clock', says: 'Lengths scale and the material is the same, so mass goes as the cube of λ; time is not scaled. Galileo\'s regime: strength grows with the square, weight with the cube.',
    exponents: [3, 1, 0, 0, 0], holds: ['material', 'environment', 'universe'], preserves: [], derivation: 'ρ fixed ⇒ M = ρ L³ ∝ λ³; T ∝ λ⁰ chosen; then g = L T⁻² would scale as λ, so on one planet gravity-driven laws are not covariant: the square-cube law.', regime: 'static structures under their own weight, one planet', status: 'theorem', source: GALILEO },
  { id: 'scale.froude', name: 'Froude similarity', says: 'Lengths scale, the material and the planet are the same, and time scales as the square root of λ so that gravity stays consistent: speeds go as √λ, forces as λ³, stresses as λ.',
    exponents: [3, 1, 0.5, 0, 0], holds: ['material', 'environment', 'universe'], preserves: ['Fr', 'St'], derivation: 'ρ fixed ⇒ M ∝ λ³; g = L T⁻² fixed ⇒ 1 − 2t = 0 ⇒ T ∝ λ^½; hence V = L/T ∝ λ^½, F = M L T⁻² ∝ λ³, σ = F/L² ∝ λ. Viscosity is also fixed, so Re = ρ V L/μ ∝ λ^1.5 is not preserved.', regime: 'motion under gravity: ships, waves, walking, falling; inertia and gravity dominant', status: 'theorem', source: FROUDE },
  { id: 'scale.reynolds', name: 'Reynolds (diffusive) similarity', says: 'Lengths scale, the fluid or material is the same, and time scales as λ² so that viscosity, diffusivity and thermal diffusivity (all L²/T) stay consistent: speeds go as 1/λ; a thing ten times smaller mixes, cools and diffuses a hundred times faster.',
    exponents: [3, 1, 2, 0, 0], holds: ['material', 'environment', 'universe'], preserves: ['Re', 'Pe', 'Fo', 'Sc', 'Rm'], derivation: 'ν, α, D (all L² T⁻¹) fixed ⇒ 2 − t = 0 ⇒ T ∝ λ²; V ∝ λ⁻¹; g = L T⁻² ∝ λ⁻³ is not preserved: gravity and viscosity cannot both be matched with the same fluid. With μ₀ and the resistivity ρ_e = M L³ T⁻³ I⁻² fixed the same exponents follow with current ∝ λ⁰ (3 + 3 − 6 = 0): this is also the electromagnetic similarity, R ∝ 1/λ and L/R ∝ λ².', regime: 'viscous flow, heat conduction, diffusion; inertia and viscosity, or storage and conduction, dominant', status: 'theorem', source: INCROPERA },
  { id: 'scale.cauchy', name: 'Cauchy (elastic) similarity', says: 'Lengths scale, the material is the same, and time scales as λ so the speed of sound stays consistent: frequencies go as 1/λ, stresses and strains are the same at every size, and gravity would have to grow as 1/λ (a centrifuge).',
    exponents: [3, 1, 1, 0, 0], holds: ['material', 'environment', 'universe'], preserves: ['Ca', 'St'], derivation: 'E and ρ fixed ⇒ c = √(E/ρ) fixed ⇒ L/T fixed ⇒ T ∝ λ; f ∝ λ⁻¹; σ = M L⁻¹ T⁻² ∝ λ⁰; g = L T⁻² ∝ λ⁻¹, so a small elastic model under gravity needs g scaled up by 1/λ: the geotechnical centrifuge.', regime: 'vibration, impact, elastic waves; inertia and elasticity dominant', status: 'theorem', source: BUCKINGHAM },
  { id: 'scale.thermal', name: 'thermal (diffusive) similarity', says: 'Lengths scale, the material is the same, time scales as λ² so thermal diffusivity stays consistent, and temperature differences scale as 1/λ² so heat capacity and conductivity stay consistent too: every conduction and storage law keeps its form; radiation (T⁴) does not.',
    exponents: [3, 1, 2, 0, -2], holds: ['material', 'environment', 'universe'], preserves: ['Fo', 'Pr'], derivation: 'α = L² T⁻¹ fixed ⇒ T ∝ λ²; c_p = L² T⁻² Θ⁻¹ fixed ⇒ 2 − 4 − θ = 0 ⇒ Θ ∝ λ⁻²; then k = M L T⁻³ Θ⁻¹ ∝ λ^(3+1−6+2) = λ⁰ is consistent, and heat flow W = M L² T⁻³ ∝ λ⁻¹ matches k A ΔT/L ∝ λ² λ⁻² λ⁻¹. σ T⁴ ∝ λ^(3−6+8) = λ⁵ is not preserved, and a surface coefficient h held by the environment makes Bi = h L/k grow with λ.', regime: 'conduction and storage of heat in the same material; not radiation, not a fixed surface coefficient', status: 'theorem', source: INCROPERA },
  { id: 'scale.rayleigh', name: 'Rayleigh (natural convection) similarity', says: 'Lengths scale, the fluid and the planet are the same, time scales as λ² for the diffusivities, and temperature differences as 1/λ³ so buoyancy keeps pace: Ra and Gr are preserved, and heat storage is not. Bénard experiments change the fluid or its pressure for this reason.',
    exponents: [3, 1, 2, 0, -3], holds: ['material', 'environment', 'universe'], preserves: ['Ra', 'Gr', 'Pr', 'Re', 'Fo'], derivation: 'ν and α (L² T⁻¹) fixed ⇒ T ∝ λ²; g is held by the planet (its dimension would want λ⁻³); Ra = g β ΔT L³/(ν α) with g, β, ν, α held ⇒ θ + 3 = 0 ⇒ Θ ∝ λ⁻³; Gr = g β ΔT L³/ν² the same. Then β = Θ⁻¹, c_p = L² T⁻² Θ⁻¹ and k = M L T⁻³ Θ⁻¹ would all scale as λ, so they are held by the material: the buoyant flow is similar, the storage and conduction of heat are not (heat stored comes out the same number at every size, heat conducted a tenth per decade).', regime: 'buoyant flow of the same fluid on the same planet; heat storage, conduction and radiation not similar', status: 'theorem', source: INCROPERA },
  { id: 'scale.electrical', name: 'electrical (same cells) similarity', says: 'Conductors of the same material fed by the same cells: lengths scale, the cell voltage and the resistivity are the same, so current goes as λ, resistance as 1/λ, time as λ^(4/3); magnetism does not follow, because μ₀\'s dimension then scales as λ^(−2/3): small motors are weak and big ones strong, by this.',
    exponents: [3, 1, 4 / 3, 1, 0], holds: ['material', 'environment', 'universe'], preserves: [], derivation: 'ρ_e = M L³ T⁻³ I⁻² fixed ⇒ 3 + 3 − 3t − 2i = 0; V = M L² T⁻³ I⁻¹ fixed (the same cells) ⇒ 3 + 2 − 3t − i = 0; hence i = 1, t = 4/3. Then R = M L² T⁻³ I⁻² ∝ λ⁻¹ (ρ_e L/A), P = V I ∝ λ, and μ₀ = M L T⁻² I⁻² would scale as λ^(3+1−8/3−2) = λ^(−2/3): with μ₀ fixed, magnetic forces are not similar. Holding μ₀ instead of V gives the diffusive similarity (T ∝ λ², I ∝ λ⁰, V ∝ 1/λ).', regime: 'resistive circuits on the same cells; not motors, magnets or inductors', status: 'theorem', source: BUCKINGHAM },
  { id: 'scale.allometric', name: 'allometric (Kleiber) scaling', says: 'Across animals, metabolic rate goes as mass to the ¾ and biological times (heartbeat, breath, lifespan) as mass to the ¼: with mass as λ³, rates go as λ^(9/4) and times as λ^(3/4). An empirical regularity with a proposed mechanism (fractal supply networks), not a theorem.',
    exponents: [3, 1, 0.75, 0, 0], holds: ['material', 'environment', 'universe'], preserves: [], derivation: 'Measured: P ∝ M^0.75 (Kleiber 1932) ⇒ with M ∝ λ³, P ∝ λ^2.25; characteristic times ∝ M^0.25 ∝ λ^0.75. West, Brown and Enquist derive ¾ from a space-filling fractal supply network with invariant terminal units: a model.', regime: 'organisms from bacteria to whales; the exponent is contested (⅔ by surface area; measured values 0.65 to 0.78)', status: 'empirical-law', source: KLEIBER },
  { id: 'scale.natural', name: 'natural-units scaling (c and ħ fixed)', says: 'The one family of transformations that keeps the speed of light and Planck\'s constant: time scales with length and mass inversely. Adding G leaves only λ = 1: the universe has an absolute scale, the Planck scale.',
    exponents: [-1, 1, 1, 0, 0], holds: ['universe'], preserves: [], derivation: 'c = L T⁻¹ fixed ⇒ t = 1; ħ = M L² T⁻¹ fixed ⇒ m + 2 − 1 = 0 ⇒ m = −1. G = L³ M⁻¹ T⁻² then scales as λ^(3+1−2) = λ²: not preserved for any λ ≠ 1.', regime: 'relativistic quantum systems without gravity', status: 'theorem', source: PLANCK },
];

export const similarityById = (id: string) => SIMILARITIES.find((t) => t.id === id);

/**
 * Whether a set of dimensional constants admits any scale transformation that keeps them all: solve exponents
 * (m, l=1, t) with current and temperature exponents free, from each constant's dimension row d·x = 0. More than two
 * independent rows over (m, t) with l = 1 force the identity: an absolute scale exists, and its units are the
 * constants' combination (Planck's). Returns the family that survives, or none.
 */
export function absoluteScale(constants: { sym: string; unit: string; value: number }[]): { family: Dim | null; independent: number; says: string } {
  // rows over unknowns (m, t) with l = 1: m·d0 + t·d2 = −d1 (current and temperature exponents taken 0)
  const rows = constants.map((c) => { const d = parseUnit(c.unit).dim; return { sym: c.sym, a: d[0], b: d[2], rhs: -d[1] }; });
  // rank over (m, t)
  const nonzero = rows.filter((r) => Math.abs(r.a) > 1e-12 || Math.abs(r.b) > 1e-12);
  let independent = 0;
  if (nonzero.length) {
    independent = 1;
    const r0 = nonzero[0]!;
    if (nonzero.some((r) => Math.abs(r.a * r0.b - r.b * r0.a) > 1e-9)) independent = 2;
  }
  if (independent === 0) return { family: [0, 1, 0, 0, 0], independent, says: 'none of these constants carries a scale: lengths may be scaled freely' };
  if (independent === 1) {
    const r = nonzero[0]!;
    // one row: pick t = 1 when a ≠ 0 else m = 1
    const [m, t] = Math.abs(r.a) > 1e-12 ? [(r.rhs - r.b * 1) / r.a, 1] : [0, r.rhs / r.b];
    const consistent = rows.every((x) => Math.abs(x.a * m + x.b * t - x.rhs) < 1e-9);
    return consistent ? { family: [m, 1, t, 0, 0], independent, says: `one constraint: a one-parameter family survives, mass ∝ λ^${m}, time ∝ λ^${t}` } : { family: null, independent: 2, says: 'the constants are inconsistent with any scaling: only λ = 1' };
  }
  // two independent rows: solve exactly, then every other row must agree
  const [r1, r2] = [nonzero[0]!, nonzero.find((r) => Math.abs(r.a * nonzero[0]!.b - r.b * nonzero[0]!.a) > 1e-9)!];
  const det = r1.a * r2.b - r1.b * r2.a;
  const m = (r1.rhs * r2.b - r1.b * r2.rhs) / det, t = (r1.a * r2.rhs - r1.rhs * r2.a) / det;
  const consistent = rows.every((x) => Math.abs(x.a * m + x.b * t - x.rhs) < 1e-9);
  if (consistent) return { family: [m, 1, t, 0, 0], independent, says: `two constraints fix the family: mass ∝ λ^${+m.toFixed(6)}, time ∝ λ^${+t.toFixed(6)}` };
  return { family: null, independent: 3, says: `three independent dimensional constants (${rows.map((r) => r.sym).join(', ')}) admit no scaling but λ = 1: an absolute scale exists` };
}

/** Planck units from c, G and ħ: the absolute scale the constants set, derived, not quoted. */
export function planckUnits(c = 299792458, G = 6.6743e-11, hbar = 1.054571817e-34) {
  return { length: Math.sqrt((hbar * G) / Math.pow(c, 3)), time: Math.sqrt((hbar * G) / Math.pow(c, 5)), mass: Math.sqrt((hbar * c) / G), source: PLANCK };
}
