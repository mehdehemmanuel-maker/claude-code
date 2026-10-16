// WHAT NO CHANGE OF CLOCK CAN CHANGE. `time.ts` reduces every dimension to a power of time; this file owns the other
// half of that idea, which is its limit: the numbers that survive the reduction. A quantity with a dimension can be
// made any size you like by choosing units — a speed is 3e8 in metres a second and 1 in units of c. A DIMENSIONLESS
// number cannot. It is the same in every unit system, under every rescaling of the metre, the second, the kilogram
// and the coulomb, and for every observer whatever their clock rate. So a claim of the form "this ratio is an
// artefact of the observer's units" is decidable here: compute the ratio, rescale every unit by arbitrary factors,
// and see whether it moved. This file does that, and it reports what it finds rather than what would be convenient.
//
// It exists because the thesis is worth testing rather than asserting: that the 10^36 between the electric and the
// gravitational force between two protons is an artefact of the human second, and that the forces are one thing seen
// at different clock rates. The arithmetic below says which parts of that survive and which do not, and `shifted()`
// is the decisive test — not an opinion about units but a rescaling actually carried out.
import { CONST } from '../book/constants';
import { measured } from './record';
import { dimOf, dimText } from '../lang/dimension';
import { inTime } from './time';
import type { Derivation } from '../lang/evaluate';

const C = CONST.c.value!, H = CONST.h.value!, G = CONST.G.value!, E = CONST.e.value!;
const EPS0 = CONST.eps0.value!, MP = CONST.mp.value!, A0 = CONST.a0.value!;
/** ħ = h/2π. The quantum of action, and the thing that makes a coupling dimensionless. */
export const HBAR = H / (2 * Math.PI);

export interface Coupling {
  name: string;
  /** the pure number */ value: number;
  /** how it is built from the constants */ formula: string;
  /** what it means, and what it is not */ why: string;
  d: Derivation;
}

/** THE COUPLINGS. Each is a pure number: a force's strength expressed so that no unit appears in it. This is the
 *  honest form of "how strong is this force", and it is the form the question has to be asked in, because a force
 *  in newtons between two particles at a chosen separation is a number you can make anything by choosing the
 *  separation — which is why Coulomb's law over Newton's has the r² cancel, leaving only these two. */
export function couplings(): Coupling[] {
  const alpha = E ** 2 / (4 * Math.PI * EPS0 * HBAR * C);
  const alphaG = (G * MP ** 2) / (HBAR * C);
  const mPlanck = Math.sqrt((HBAR * C) / G);
  return [
    { name: 'the fine-structure constant α', value: alpha, formula: 'e² / (4π ε₀ ħ c)',
      why: 'how strongly a unit charge couples to the electromagnetic field. 1/137.036, and dimensionless: there is no unit in it to change',
      d: measured('α', alpha, '-', 'CODATA 2018: 7.2973525693(11)e-3, here recomputed from e, ε₀, ħ and c') },
    { name: 'the gravitational coupling of a proton α_G', value: alphaG, formula: 'G m_p² / (ħ c)',
      why: 'the same question asked of gravity, with the proton\'s mass where the charge was. 5.9e-39, and dimensionless for the same reason',
      d: measured('α_G', alphaG, '-', 'CODATA 2018 constants: G m_p² / ħc') },
    { name: 'the Planck mass', value: mPlanck, formula: '√(ħ c / G)',
      why: 'the one mass you can build out of ħ, c and G alone, and so the mass at which gravity is as strong as anything else',
      d: measured('m_Planck', mPlanck, 'kg', 'CODATA 2018: 2.176434(24)e-8 kg, here recomputed from ħ, c and G') },
    { name: 'the proton in Planck masses', value: MP / mPlanck, formula: 'm_p / √(ħ c / G)',
      why: 'the proton is 7.7e-20 of the Planck mass. THIS is the whole of gravity\'s weakness, and it is a mass ratio, not a clock rate',
      d: measured('m_p / m_Planck', MP / mPlanck, '-', 'from CODATA 2018 m_p and the Planck mass') },
    { name: 'electric over gravitational, between two protons', value: alpha / alphaG, formula: 'α / α_G  =  k_e e² / (G m_p²)',
      why: 'the 1.24e36. A ratio of two dimensionless numbers, so itself dimensionless: not one second of any clock appears in it',
      d: measured('F_e / F_g', alpha / alphaG, '-', 'α / α_G, from CODATA 2018 constants') },
  ];
}

/** THE IDENTITY THAT SAYS WHERE THE 10^36 COMES FROM. α_G is exactly the square of the proton's mass in Planck
 *  masses, so the famous ratio is α (m_Planck / m_p)². Everything in it is a pure number and a mass ratio. There is
 *  no time in it, no radius in it, and no observer in it — which is why no change of clock can move it. */
export function whereTheRatioComesFrom(): { alphaG: number; massRatioSquared: number; agree: boolean; ratio: number; byMasses: number; says: string } {
  const alphaG = (G * MP ** 2) / (HBAR * C), mPlanck = Math.sqrt((HBAR * C) / G);
  const massRatioSquared = (MP / mPlanck) ** 2;
  const alpha = E ** 2 / (4 * Math.PI * EPS0 * HBAR * C);
  const ratio = alpha / alphaG, byMasses = alpha * (mPlanck / MP) ** 2;
  const agree = Math.abs(alphaG - massRatioSquared) <= 1e-12 * alphaG && Math.abs(ratio - byMasses) <= 1e-9 * ratio;
  return { alphaG, massRatioSquared, agree, ratio, byMasses,
    says: `α_G = ${alphaG.toExponential(4)} and (m_p/m_Planck)² = ${massRatioSquared.toExponential(4)}: the same number. So F_e/F_g = α (m_Planck/m_p)² = ${byMasses.toExponential(4)}, which is a mass ratio squared times a pure number. Gravity is weak because the proton is light compared with the Planck mass — 7.7e-20 of it — and WHY that is remains unexplained by anyone (the hierarchy problem). It is not weak because of how fast anything ticks.` };
}

/** THE DECISIVE TEST, AND IT IS A TEST AND NOT AN ARGUMENT. Rescale the metre, the second, the kilogram and the
 *  coulomb by any factors at all — which is every change of ruler and of clock there is, the observer's own clock
 *  among them — recompute each coupling in the new units, and see what moved. A dimensionless number cannot move,
 *  and the point of running it rather than saying it is that the code would show it if it did. */
export function shifted(by: { metre: number; second: number; kilogram: number; coulomb: number }): {
  name: string; before: number; after: number; moved: boolean; says: string }[] {
  const { metre: L, second: T, kilogram: M, coulomb: Q } = by;
  // every constant re-expressed in the new units, by its own dimensions
  const c2 = C * (L / T), h2 = H * (M * L * L / T), hbar2 = h2 / (2 * Math.PI);
  const g2 = G * ((L * L * L) / (M * T * T)), e2 = E * Q;
  const eps2 = EPS0 * ((Q * Q * T * T) / (M * L * L * L));   // ε₀ is C²/(N m²) = C² s² / (kg m³)
  const mp2 = MP * M;
  const before = [
    { name: 'α', v: E ** 2 / (4 * Math.PI * EPS0 * HBAR * C) },
    { name: 'α_G', v: (G * MP ** 2) / (HBAR * C) },
    { name: 'F_e / F_g', v: (E ** 2 / (4 * Math.PI * EPS0 * HBAR * C)) / ((G * MP ** 2) / (HBAR * C)) },
  ];
  const after = [
    e2 ** 2 / (4 * Math.PI * eps2 * hbar2 * c2),
    (g2 * mp2 ** 2) / (hbar2 * c2),
    (e2 ** 2 / (4 * Math.PI * eps2 * hbar2 * c2)) / ((g2 * mp2 ** 2) / (hbar2 * c2)),
  ];
  return before.map((b, i) => {
    const moved = Math.abs(after[i] - b.v) > 1e-9 * Math.abs(b.v);
    return { name: b.name, before: b.v, after: after[i], moved,
      says: `${b.name}: ${b.v.toExponential(6)} before, ${after[i].toExponential(6)} after a metre ×${L}, a second ×${T}, a kilogram ×${M} and a coulomb ×${Q} — ${moved ? 'IT MOVED, and that would be a fault in this code, because a pure number cannot' : 'unmoved, as a pure number must be'}` };
  });
}

/** THE CLOCK CLAIM, COMPUTED. The light-crossing frequency f = c/R is real physics and sets a system's own
 *  dynamical rate. This is the ratio of two of them, exactly as the thesis builds it. */
export function clockRatio(rFast: number, rSlow: number): { fFast: number; fSlow: number; ratio: number } {
  return { fFast: C / rFast, fSlow: C / rSlow, ratio: (C / rFast) / (C / rSlow) };
}

/** WHY THAT RATIO CANNOT BE THE 10^36, AND THE REASON IS THAT IT HAS A KNOB. Ask what radius the slow system must
 *  have for the clock ratio to hit a chosen target, and the answer always exists: f_fast/f_slow = R_slow/R_fast is
 *  continuous and unbounded in R_slow, so it passes through EVERY positive number. A quantity you can tune to any
 *  target by choosing an input is not a derivation of that target; it is a free parameter. The couplings above have
 *  no such knob — every symbol in them is a measured constant. */
export function theKnob(target: number, rFast = A0): { rSlow: number; inLightYears: number; says: string } {
  const rSlow = rFast * target, ly = 9.4607304725808e15;
  return { rSlow, inLightYears: rSlow / ly,
    says: `to make the clock ratio equal ${target.toExponential(3)} with the fast system at ${rFast.toExponential(3)} m, the slow one must be ${rSlow.toExponential(3)} m — ${rSlow / ly > 1 ? `${(rSlow / ly).toExponential(3)} light years` : `${rSlow.toExponential(3)} m`}. Choose any target and a radius exists for it, which is what makes this a knob and not a result.` };
}

/** THE DIMENSION OF "ENERGY PER LOOP". The thesis defines E_loop = Force × Distance / f_c. Run it through the same
 *  dimension algebra every law in the book is held to and it is not an energy: force × distance is J, and dividing
 *  by a frequency multiplies by seconds, so E_loop is J s — an ACTION. On time's tree an action is time^0 and an
 *  energy is time^-1, so the two sit at different powers of time and the system separates them without being told. */
export function loopEnergy(): { formula: string; unit: string; dim: string; power: number;
  energyDim: string; energyPower: number; isEnergy: boolean; says: string } {
  const loop = dimOf('J s'), energy = dimOf('J');
  const dim = dimText(loop), energyDim = dimText(energy);
  const power = inTime(loop), energyPower = inTime(energy);
  return { formula: 'E_loop = Force × Distance / f_c', unit: 'J s', dim, power, energyDim, energyPower,
    isEnergy: dim === energyDim,
    says: `Force × Distance / f_c has the dimension ${dim} (time^${power}), and an energy has ${energyDim} (time^${energyPower}). ${dim === energyDim ? 'They agree.' : `They are not the same quantity: dividing by a frequency multiplies by a time, so E_loop is an ACTION, not an energy. In units where ħ = 1 an action is a pure number — which means "energy per loop" measured this way is the number of quanta of action in the loop, and ħ is already that. It cannot normalise a coupling, because it is not a coupling's dimension.`}`,
  };
}

/** What the thesis gets right, stated as the arithmetic rather than as encouragement, because the right part is the
 *  part worth keeping: a coupling really does change with scale. It changes with the ENERGY of the probe, not with
 *  the observer's clock, and it is measured. α is 1/137.036 at rest and about 1/127.9 at the mass of the Z boson —
 *  a 7% move over 11 orders of magnitude in energy, which is the real "forces converge at scale" and is far too
 *  slow to close a gap of 10^36. The three gauge couplings do very nearly meet near 10^16 GeV; gravity's does not
 *  join them, which is the open problem and not a solved one. */
export const RUNS_WITH_SCALE = [
  { what: 'α at zero momentum transfer', value: 7.2973525693e-3, as: '1/137.036',
    source: 'CODATA 2018' },
  { what: 'α at the mass of the Z boson (91.19 GeV)', value: 1 / 127.952, as: '1/127.952',
    source: 'Particle Data Group 2022, Review of Particle Physics: α(m_Z) in the MS-bar scheme' },
] as const;

/** THE NUMBER THAT MADE QUANTUM MECHANICS NECESSARY, computed rather than quoted. If the electron were a classical
 *  body on a classical orbit — which is exactly what "a probability cloud is a temporal blur" asserts — then being
 *  a charge going round a corner it would radiate by the Larmor formula, lose energy, and spiral in. Integrating
 *  Larmor's P = e²a²/(6πε₀c³) along the shrinking orbit from the Bohr radius to the nucleus gives
 *  t = 4π²ε₀²m²c³a₀³/e⁴, and the answer is about sixteen trillionths of a second. Hydrogen has instead been stable
 *  for 13.8 billion years. A fast classical orbit is not a hard-to-see atom; it is an atom that cannot exist. */
export function classicalFallTime(): { seconds: number; says: string } {
  const me = CONST.me.value!;
  const t = (4 * Math.PI ** 2 * EPS0 ** 2 * me ** 2 * C ** 3 * A0 ** 3) / E ** 4;
  return { seconds: t,
    says: `a classical electron on a classical orbit radiates and falls into the nucleus in ${t.toExponential(3)} s (Larmor, integrated from the Bohr radius). Hydrogen is stable indefinitely, so the electron is not a classical body moving too fast to see.` };
}

/** BLUR OR WAVE: the observations that tell them apart, each with what a blurred classical orbit must predict and
 *  what is measured. This is the same shape as the law observation table — a claim is connected to a physical thing
 *  you can watch — and it is here because "superposition is a temporal blur" is a FALSIFIABLE claim, not a matter
 *  of taste. Four of these five are decided against it, and the fifth is decided against it by a Nobel Prize. */
export const BLUR_OR_WAVE = [
  { watch: 'the hydrogen spectrum',
    blurSays: 'a classical orbit may have any radius, so the energies are continuous and the spectrum is a smear',
    measured: 'discrete lines at 1/n², the Rydberg constant known to 10973731.568157(12) 1/m — twelve figures',
    source: 'CODATA 2018', decides: 'wave' },
  { watch: 'a 2p orbital through the nucleus',
    blurSays: 'the time-average of a continuous path is non-zero everywhere the path goes: a spun wheel blurs to a FULL disk, never to one with a gap at a chosen radius',
    measured: 'an exact nodal plane — probability identically zero, not small — and 2s has a spherical node at r = 2a₀',
    source: 'the Schrödinger solution, confirmed by scanning-tunnelling and photoemission orbital imaging', decides: 'wave' },
  { watch: 'two entangled particles measured on tilted axes (CHSH)',
    blurSays: 'if the electron has a definite position we are merely too slow to resolve, that is a LOCAL HIDDEN VARIABLE, and Bell\'s theorem then bounds the correlation at CHSH <= 2',
    measured: 'CHSH = 2.697 +/- 0.015, and loophole-free since 2015',
    source: 'Aspect, Grangier & Roger 1982 PRL 49:91; Hensen et al. 2015 Nature 526:682; Nobel Prize 2022', decides: 'wave — and this is the one that rules out the blur as a CLASS, not just in detail' },
  { watch: 'whether hydrogen lasts',
    blurSays: 'a classical orbiting charge radiates, so the atom collapses',
    measured: 'stable for 13.8 billion years; the classical fall time is computed by classicalFallTime() above',
    source: 'Larmor 1897, integrated', decides: 'wave' },
  { watch: 'a neutron, and the sign of each force',
    blurSays: 'if magnetism is gravity fast-forwarded then one mechanism, seen at two rates, must do both jobs',
    measured: 'gravity has one sign and only attracts; electromagnetism has two and also repels. A neutron has zero charge and non-zero mass, so it feels one and not the other. No rescaling of a clock turns a force that only pulls into one that also pushes, or gives a neutral particle a charge',
    source: 'elementary, and the reason the two cannot be the same force at different speeds', decides: 'not one force' },
] as const;
