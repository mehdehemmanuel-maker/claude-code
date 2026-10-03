// Dimensionless groups: the ratios Π = A/B that decide a regime. Each is a product of powers of quantities; whether it
// is invariant under a scale transformation is derived from the quantities' dimensions and from what the transform
// holds fixed, never declared. A group with a regime boundary (laminar below 2300) says where a description changes.
import { exponentOf, similarityById, type ScaleTransform } from './transform';
import type { Source } from '../types';

export interface GroupFactor { sym: string; name: string; unit: string; power: number }

export interface DimensionlessGroup {
  id: string;
  name: string;
  formula: string;
  factors: GroupFactor[];
  /** What the ratio compares. */
  meaning: string;
  /** Values at which the regime changes, with what changes. */
  boundaries: { at: number; says: string }[];
  source: Source;
}

const WHITE: Source = { cite: 'White, Fluid Mechanics, 8th ed., McGraw-Hill 2016, ch. 5 and ch. 7', kind: 'textbook' };
const INCROPERA: Source = { cite: 'Incropera et al., Fundamentals of Heat and Mass Transfer, 7th ed., Wiley 2011, ch. 5 to 7', kind: 'textbook' };
const VOGEL: Source = { cite: 'Vogel, Life in Moving Fluids, 2nd ed., Princeton 1994; Comparative Biomechanics, Princeton 2003', kind: 'textbook' };
const BIRD: Source = { cite: 'Bird, Stewart, Lightfoot, Transport Phenomena, 2nd ed., Wiley 2002', kind: 'textbook' };
const KUNDU: Source = { cite: 'Kundu, Cohen, Dowling, Fluid Mechanics, 6th ed., Academic Press 2016, ch. 13 (geophysical)', kind: 'textbook' };
const RAO: Source = { cite: 'Rao, Mechanical Vibrations, 6th ed., Pearson 2017, ch. 1', kind: 'textbook' };

const f = (sym: string, name: string, unit: string, power: number): GroupFactor => ({ sym, name, unit, power });

export const GROUPS: DimensionlessGroup[] = [
  { id: 'Re', name: 'Reynolds number', formula: 'Re = ρ V L / μ', factors: [f('rho', 'density', 'kg/m^3', 1), f('V', 'speed', 'm/s', 1), f('L', 'length', 'm', 1), f('mu', 'dynamic viscosity', 'Pa s', -1)], meaning: 'inertia over viscosity', boundaries: [{ at: 2300, says: 'pipe flow laminar below' }, { at: 4000, says: 'turbulent above' }, { at: 1, says: 'below 1, viscosity rules: a bacterium swims in syrup (Purcell)' }], source: WHITE },
  { id: 'Fr', name: 'Froude number', formula: 'Fr = V² / (g L)', factors: [f('V', 'speed', 'm/s', 2), f('g', 'gravity', 'm/s^2', -1), f('L', 'length', 'm', -1)], meaning: 'inertia over gravity', boundaries: [{ at: 1, says: 'a walker must break into a run near Fr 0.5; a ship\'s hull speed; a hydraulic jump' }], source: WHITE },
  { id: 'Ma', name: 'Mach number', formula: 'Ma = V / c', factors: [f('V', 'speed', 'm/s', 1), f('c', 'speed of sound', 'm/s', -1)], meaning: 'speed over the speed of sound: compressibility', boundaries: [{ at: 0.3, says: 'incompressible below' }, { at: 1, says: 'shock waves above' }], source: WHITE },
  { id: 'St', name: 'Strouhal number', formula: 'St = f L / V', factors: [f('f', 'frequency', 'Hz', 1), f('L', 'length', 'm', 1), f('V', 'speed', 'm/s', -1)], meaning: 'oscillation over flow: one period against one length passed', boundaries: [{ at: 0.2, says: 'vortex shedding behind a cylinder; flying and swimming animals cruise at 0.2 to 0.4' }], source: VOGEL },
  { id: 'We', name: 'Weber number', formula: 'We = ρ V² L / σ', factors: [f('rho', 'density', 'kg/m^3', 1), f('V', 'speed', 'm/s', 2), f('L', 'length', 'm', 1), f('sigma', 'surface tension', 'N/m', -1)], meaning: 'inertia over surface tension', boundaries: [{ at: 1, says: 'drops break up above; below, surface tension holds them' }], source: WHITE },
  { id: 'Bo', name: 'Bond (Eötvös) number', formula: 'Bo = ρ g L² / σ', factors: [f('rho', 'density', 'kg/m^3', 1), f('g', 'gravity', 'm/s^2', 1), f('L', 'length', 'm', 2), f('sigma', 'surface tension', 'N/m', -1)], meaning: 'gravity over surface tension: the capillary length', boundaries: [{ at: 1, says: 'below 1 (water: 2.7 mm) surface tension shapes things; an insect stands on water, a cup of water cannot be poured in a thin stream' }], source: WHITE },
  { id: 'Bi', name: 'Biot number', formula: 'Bi = h L / k', factors: [f('h', 'heat transfer coefficient', 'W/m^2 K', 1), f('L', 'length', 'm', 1), f('k', 'conductivity', 'W/m K', -1)], meaning: 'surface heat transfer over internal conduction', boundaries: [{ at: 0.1, says: 'below, a body is lumped: one temperature; above, gradients inside it' }], source: INCROPERA },
  { id: 'Fo', name: 'Fourier number', formula: 'Fo = α t / L²', factors: [f('alpha', 'thermal diffusivity', 'm^2/s', 1), f('t', 'time', 's', 1), f('L', 'length', 'm', -2)], meaning: 'time over the conduction time of a length', boundaries: [{ at: 0.2, says: 'above, the one-term transient solution holds' }], source: INCROPERA },
  { id: 'Pr', name: 'Prandtl number', formula: 'Pr = ν / α', factors: [f('nu', 'kinematic viscosity', 'm^2/s', 1), f('alpha', 'thermal diffusivity', 'm^2/s', -1)], meaning: 'momentum diffusion over heat diffusion: a fluid property', boundaries: [{ at: 1, says: 'air 0.7, water 7, oils 100s, liquid metals 0.01' }], source: INCROPERA },
  { id: 'Pe', name: 'Péclet number', formula: 'Pe = V L / D', factors: [f('V', 'speed', 'm/s', 1), f('L', 'length', 'm', 1), f('D', 'diffusion coefficient', 'm^2/s', -1)], meaning: 'transport by flow over transport by diffusion', boundaries: [{ at: 1, says: 'below, diffusion is enough (a cell); above, something must stir or pump (a body needs a heart)' }], source: BIRD },
  { id: 'Sc', name: 'Schmidt number', formula: 'Sc = ν / D', factors: [f('nu', 'kinematic viscosity', 'm^2/s', 1), f('D', 'diffusion coefficient', 'm^2/s', -1)], meaning: 'momentum diffusion over mass diffusion: a fluid property', boundaries: [{ at: 1, says: 'gases near 1; liquids hundreds to thousands' }], source: BIRD },
  { id: 'Nu', name: 'Nusselt number', formula: 'Nu = h L / k_fluid', factors: [f('h', 'heat transfer coefficient', 'W/m^2 K', 1), f('L', 'length', 'm', 1), f('k', 'conductivity', 'W/m K', -1)], meaning: 'convective over conductive heat transfer in the fluid', boundaries: [{ at: 1, says: 'pure conduction; correlations give Nu(Re, Pr) above' }], source: INCROPERA },
  { id: 'Kn', name: 'Knudsen number', formula: 'Kn = λ_mfp / L', factors: [f('mfp', 'mean free path', 'm', 1), f('L', 'length', 'm', -1)], meaning: 'molecular mean free path over the size: whether a gas is a continuum', boundaries: [{ at: 0.01, says: 'continuum below; slip flow to 0.1; free molecular above 10' }], source: BIRD },
  { id: 'Ca', name: 'Cauchy number', formula: 'Ca = ρ V² / E', factors: [f('rho', 'density', 'kg/m^3', 1), f('V', 'speed', 'm/s', 2), f('E', 'modulus', 'Pa', -1)], meaning: 'inertia over elasticity: compressibility of a solid or elastic similarity', boundaries: [{ at: 1, says: 'near 1 the flow or impact deforms the structure as fast as it moves' }], source: WHITE },
  { id: 'De', name: 'Deborah number', formula: 'De = τ_relax / t_obs', factors: [f('tau', 'relaxation time', 's', 1), f('t', 'observation time', 's', -1)], meaning: 'material relaxation over observation: the mountains flow for a long enough observer', boundaries: [{ at: 1, says: 'below, a fluid; above, a solid: the same material, by the observer\'s time' }], source: { cite: 'Reiner, "The Deborah number", Physics Today 17 (1964) 62', kind: 'paper' } },
  { id: 'He', name: 'lumpedness (Helmholtz-type) number', formula: 'He = L / (c τ)', factors: [f('L', 'length', 'm', 1), f('c', 'propagation speed', 'm/s', -1), f('tau', 'response time', 's', -1)], meaning: 'propagation time across the system over its response time: whether it is one lump or a wave carrier', boundaries: [{ at: 0.1, says: 'below, lumped: forces, currents and temperatures act at once across it (a rigid body, a circuit node); above, distributed: waves, delays, resonances' }], source: RAO },
  { id: 'Da', name: 'Damköhler number', formula: 'Da = t_transport / t_reaction', factors: [f('tt', 'transport time', 's', 1), f('tr', 'reaction time', 's', -1)], meaning: 'how far a reaction goes while things move', boundaries: [{ at: 1, says: 'below, transport wins (mixed before reacting); above, reaction wins (reacts where it is)' }], source: BIRD },
  { id: 'Ro', name: 'Rossby number', formula: 'Ro = V / (Ω L)', factors: [f('V', 'speed', 'm/s', 1), f('Omega', 'rotation rate', 'Hz', -1), f('L', 'length', 'm', -1)], meaning: 'inertia over the Coriolis force: whether a planet\'s spin steers the flow', boundaries: [{ at: 1, says: 'below (weather systems, oceans) rotation rules; above (a bath drain) it does not' }], source: KUNDU },
  { id: 'Rm', name: 'magnetic Reynolds number', formula: 'Rm = μ₀ σ V L', factors: [f('mu0', 'permeability', 'N/A^2', 1), f('sigma', 'electrical conductivity', 'S/m', 1), f('V', 'speed', 'm/s', 1), f('L', 'length', 'm', 1)], meaning: 'advection of a magnetic field over its diffusion through the conductor: eddy currents, dynamos', boundaries: [{ at: 1, says: 'below, the field diffuses through the moving conductor (an eddy-current brake); above, it is dragged along (a dynamo, a star)' }], source: { cite: 'Davidson, An Introduction to Magnetohydrodynamics, Cambridge 2001, ch. 4', kind: 'textbook' } },
  { id: 'Gr', name: 'Grashof number', formula: 'Gr = g β ΔT L³ / ν²', factors: [f('g', 'gravity', 'm/s^2', 1), f('beta', 'thermal expansion coefficient', '1/K', 1), f('dT', 'temperature difference', 'K', 1), f('L', 'length', 'm', 3), f('nu', 'kinematic viscosity', 'm^2/s', -2)], meaning: 'buoyancy over viscosity: whether warm air rises past a thing', boundaries: [{ at: 1e9, says: 'natural convection turns turbulent (Ra = Gr Pr)' }], source: INCROPERA },
];

export const groupById = (id: string) => GROUPS.find((g) => g.id === id);

export interface GroupVerdict { group: DimensionlessGroup; transform: ScaleTransform; exponent: number; invariant: boolean; terms: { sym: string; exponent: number; held: boolean }[]; says: string }

/** Π under a transform: the sum of each factor's exponent times its power; invariant iff the sum is zero. Derived. */
export function groupUnder(g: DimensionlessGroup, t: ScaleTransform): GroupVerdict {
  const terms = g.factors.map((x) => { const e = exponentOf(t, x); return { sym: x.sym, exponent: e * x.power, held: e === 0 && x.unit !== '-' && exponentOf({ ...t, holds: [] }, x) !== 0 }; });
  const exponent = terms.reduce((s, x) => s + x.exponent, 0);
  const invariant = Math.abs(exponent) < 1e-9;
  const held = terms.filter((x) => x.held).map((x) => x.sym);
  return { group: g, transform: t, exponent, invariant, terms, says: invariant ? `${g.id} is invariant under ${t.name}${held.length ? ` with ${held.join(', ')} held fixed` : ''}` : `${g.id} goes as λ^${+exponent.toFixed(3)} under ${t.name}${held.length ? ` because ${held.join(', ')} ${held.length > 1 ? 'are' : 'is'} held fixed` : ''}: not preserved` };
}

/** Every group under every similarity: the table a model test is planned from. */
export function groupTable(): GroupVerdict[][] { return GROUPS.map((g) => (['scale.same-material', 'scale.froude', 'scale.reynolds', 'scale.cauchy'] as const).map((id) => groupUnder(g, similarityById(id)!))); }
