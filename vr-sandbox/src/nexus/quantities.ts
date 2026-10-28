// The quantities (docs/REALITY.md, step 2): what a law's variable is, apart from the letter it is written with. Each has
// a dimension, an SI unit and a plain sentence; every port of every law in the book maps to one (a test fails on any
// that maps to none). Laws are joined through these, never through their letters: E is an energy in one law and a
// modulus in another; two quantities of one dimension (a torque and an energy, a stress and a pressure) are kept apart
// by what they are.
//
// A port maps by its dimension first; where a dimension holds several quantities, by the words of its name; where the
// words say nothing, to the dimension's general quantity. A few ports whose names mislead are set by hand (AS).

import type { Law, Port } from './law';
import { dimOf, dimText, sameDim, type Dim } from './dimension';

export interface QuantityDef {
  id: string;
  name: string;
  /** Its SI unit, as the units parser reads it. */
  unit: string;
  dim: Dim;
  /** What it is, in a sentence. */
  says: string;
  /** Words in a port's name that make it this quantity, where its dimension holds more than one. */
  words?: RegExp;
  /** The dimension's general quantity: a port of this dimension whose words say nothing else is this. */
  general?: boolean;
}

const q = (id: string, name: string, unit: string, says: string, more: { words?: RegExp; general?: boolean } = {}): QuantityDef => ({ id, name, unit, dim: dimOf(unit), says, ...more });

/** The registry. Within a dimension, the first whose words match wins; so the narrow come before the general. */
export const QUANTITIES: QuantityDef[] = [
  // ---- dimensionless
  q('angle', 'angle', 'rad', 'How far one direction is turned from another.', { words: /angle|twist|wrap|θ|theta/i }),
  q('efficiency', 'efficiency', '1', 'The share of what goes in that comes out as what is wanted.', { words: /\befficiency/i }),
  q('count', 'count', '1', 'How many: a whole number of things, turns, teeth, joints, cycles or choices.', { words: /count|coils|turns|teeth|bolts|layers|links|joints|choices|items|cycles|branches|how many|^order$|degrees of freedom|electrons|^charge$|moles made a mole|life$|rating life/i }),
  q('friction-coefficient', 'friction coefficient', '1', 'The friction force a contact can carry over the force pressing it together.', { words: /friction(?! factor)/i }),
  q('strain', 'strain', '1', 'How much a length grows, over the length.', { words: /^strain$|shrinkage/i }),
  q('fraction', 'fraction', '1', 'A share of a whole, from nothing to all of it.', { words: /share|fraction|porosity|humidity|albedo|emissivity|content|hydration|switching|filled|taken back/i }),
  q('exponent', 'exponent', '1', 'A power a law raises something to, found by fitting or by theory.', { words: /exponent/i }),
  q('information', 'information', '1', 'How many yes-or-no answers it takes to say which of the possibilities it is (bits).', { words: /information|bits/i }),
  q('dimensionless-group', 'dimensionless group', '1', 'A ratio of effects that decides how a flow, a gait or a signal behaves (Reynolds, Froude, signal to noise).', { words: /reynolds|froude|signal to noise|numerical aperture|slenderness/i }),
  q('ratio', 'ratio', '1', 'One quantity over another of the same kind; a factor or a coefficient with no unit.', { general: true }),
  // ---- base quantities
  q('mass', 'mass', 'kg', 'How much matter: what resists being sped up and what gravity pulls on.', { general: true }),
  q('length', 'length', 'm', 'How far: a distance, a size, a radius, a depth.', { general: true }),
  q('time', 'time', 's', 'How long, or when.', { general: true }),
  q('current', 'electric current', 'A', 'How much charge passes a point each second.', { general: true }),
  q('temperature-difference', 'temperature difference', 'K', 'How much hotter one thing is than another, or than it was.', { words: /difference|rise|excess/i }),
  q('temperature', 'temperature', 'K', 'How hot: the mean energy of the motion of what something is made of, from absolute zero.', { general: true }),
  q('amount', 'amount of substance', 'mol', 'How many particles, counted in moles of 6.02214076e23.', { general: true }),
  // ---- mechanics
  q('area', 'area', 'm^2', 'How much surface.', { general: true }),
  q('volume', 'volume', 'm^3', 'How much room.', { general: true }),
  q('section-modulus', 'section modulus', 'm^3', 'A section\'s second moment over its farthest fibre: what sets the stress a bending moment makes.', { words: /section modulus/i }),
  q('second-moment', 'second moment of area', 'm^4', 'How a section\'s area lies away from its axis: what sets how stiff it is in bending or twisting.', { general: true }),
  q('speed', 'speed', 'm/s', 'How far something goes each second.', { general: true }),
  q('acceleration', 'acceleration', 'm/s^2', 'How fast speed changes; gravity\'s pull on each kilogram.', { general: true }),
  q('angular-speed', 'angular speed', 'rad/s', 'How fast something turns.', { words: /angular|speed/i }),
  q('frequency', 'frequency or rate', 'Hz', 'How many times a second; how fast something happens or decays.', { general: true }),
  q('force', 'force', 'N', 'A push or a pull: what changes a body\'s motion or strains it.', { general: true }),
  q('heat-input-per-length', 'heat input per length', 'J/m', 'Energy laid into each metre of a weld.', { words: /heat input/i }),
  q('torque', 'torque or moment', 'N m', 'A force times its lever: what turns or bends.', { words: /torque|moment|bending capacity/i }),
  q('torsional-stiffness', 'torsional stiffness', 'N m/rad', 'Torque for each radian a spring or a shaft is twisted.', { words: /^rate$|stiffness/i }),
  q('energy', 'energy', 'J', 'What work and heat are: what it takes to move against a force or to warm something.', { general: true }),
  q('power', 'power', 'W', 'Energy each second: work done or heat carried in a time.', { general: true }),
  q('modulus', 'elastic modulus', 'Pa', 'A material\'s stiffness: the stress it takes to strain it.', { words: /modulus/i }),
  q('stress', 'stress', 'Pa', 'A force over the area it acts on, inside a solid; a strength is the stress it fails at.', { words: /stress|strength|endurance|shear|coefficient/i }),
  q('pressure', 'pressure', 'Pa', 'A fluid\'s push on each square metre of what holds it.', { general: true }),
  q('density', 'density', 'kg/m^3', 'Mass in each cubic metre.', { general: true }),
  q('areal-density', 'mass per area', 'kg/m^2', 'Mass on each square metre of a sheet or a wall.', { general: true }),
  q('line-load', 'load per length', 'N/m', 'Force on each metre of a beam: its own weight or a spread load.', { general: true }),
  q('stiffness', 'stiffness', 'N/m', 'Force for each metre a spring or a structure gives.', { words: /stiffness|^rate$/i }),
  q('surface-tension', 'surface tension or energy', 'J/m^2', 'Energy to make each square metre of a surface: what pulls a liquid into drops.', { words: /surface/i }),
  q('moment-of-inertia', 'moment of inertia', 'kg m^2', 'How a body\'s mass lies away from its axis: what resists being spun up.', { general: true }),
  q('viscosity', 'dynamic viscosity', 'Pa s', 'How a fluid resists shearing: thick honey, thin air.', { general: true }),
  q('mass-flow', 'mass flow', 'kg/s', 'Mass passing each second.', { general: true }),
  q('volume-flow', 'volume flow', 'm^3/s', 'Volume passing each second.', { general: true }),
  q('mass-flux', 'mass flux', 'kg/m^2 s', 'Mass passing each square metre each second.', { general: true }),
  q('specific-volume', 'specific volume', 'm^3/kg', 'Room each kilogram takes: one over density.', { general: true }),
  q('specific-flow', 'flow per mass', 'm^3/kg s', 'Volume flow each kilogram makes or needs.', { general: true }),
  q('filtration-coefficient', 'filtration coefficient', 'm^4 s/kg', 'Flow through a membrane for each pascal pushing it.', { general: true }),
  q('stress-intensity', 'stress over root length', 'Pa m^0.5', 'A stress times the root of a length: how a grain size or a crack sets a strength.', { general: true }),
  q('pressure-per-temperature', 'pressure per temperature', 'Pa/K', 'How fast a pressure rises with temperature.', { general: true }),
  // ---- heat
  q('heat-transfer-coefficient', 'heat transfer coefficient', 'W/m^2 K', 'Heat carried across each square metre for each kelvin of difference.', { general: true }),
  q('thermal-conductivity', 'thermal conductivity', 'W/m K', 'Heat a material conducts through each metre for each kelvin across it.', { general: true }),
  q('thermal-resistance', 'thermal resistance', 'K/W', 'Kelvins of difference it takes to push each watt of heat through.', { general: true }),
  q('heat-flux', 'heat flux or irradiance', 'W/m^2', 'Power falling on or passing each square metre.', { general: true }),
  q('specific-heat', 'specific heat', 'J/kg K', 'Energy to warm each kilogram by one kelvin.', { general: true }),
  q('absorbed-dose', 'absorbed dose', 'Gy', 'Radiation energy taken up by each kilogram.', { words: /dose/i }),
  q('specific-energy', 'specific energy', 'J/kg', 'Energy in each kilogram: latent heat, stored energy over mass.', { general: true }),
  q('dose-rate', 'dose rate', 'Gy/s', 'Absorbed dose each second.', { words: /dose/i }),
  q('specific-power', 'power per mass', 'W/kg', 'Power each kilogram gives or takes.', { general: true }),
  q('risk-per-dose', 'risk per dose', '1/Gy', 'Harm expected for each gray taken up.', { general: true }),
  q('expansion-coefficient', 'thermal expansion coefficient', '1/K', 'How much a length grows, as a share, for each kelvin warmer.', { general: true }),
  // ---- electricity and magnetism
  q('voltage', 'voltage', 'V', 'Energy each coulomb of charge gains or gives between two points.', { general: true }),
  q('resistance', 'electrical resistance', 'ohm', 'Volts it takes to push each ampere through.', { general: true }),
  q('resistance-per-length', 'resistance per length', 'ohm/m', 'Resistance of each metre of a conductor.', { general: true }),
  q('resistivity', 'resistivity', 'ohm m', 'A material\'s resistance to current, for a metre cube of it.', { general: true }),
  q('conductivity-electric', 'electrical conductivity', 'S/m', 'How readily a material carries current: one over its resistivity.', { general: true }),
  q('capacitance', 'capacitance', 'F', 'Charge held for each volt.', { general: true }),
  q('inductance', 'inductance', 'H', 'Volts induced for each ampere-a-second of change in its current.', { general: true }),
  q('charge', 'electric charge', 'C', 'An amount of electricity: amperes times seconds.', { general: true }),
  q('current-density', 'current density', 'A/m^2', 'Current through each square metre.', { general: true }),
  q('magnetic-flux-density', 'magnetic flux density', 'T', 'How strong a magnetic field is: the force on a current across it.', { general: true }),
  q('flux-density-rate', 'rate of change of flux density', 'T/s', 'How fast a field grows or falls.', { general: true }),
  q('permeability', 'magnetic permeability', 'N/A^2', 'How readily a medium carries a magnetic field.', { general: true }),
  q('permittivity', 'electric permittivity', 'F/m', 'How readily a medium carries an electric field.', { general: true }),
  q('motor-constant', 'motor constant', 'N m/A', 'Torque for each ampere, or volts for each radian a second: the same constant.', { general: true }),
  q('seebeck-coefficient', 'Seebeck coefficient', 'V/K', 'Volts a junction of two metals makes for each kelvin of difference.', { general: true }),
  q('piezo-coefficient', 'piezoelectric charge constant', 'm/V', 'How far a piezo crystal moves for each volt across it.', { general: true }),
  // ---- chemistry and transport
  q('molar-mass', 'molar mass', 'kg/mol', 'Mass of each mole of a substance.', { general: true }),
  q('molar-energy', 'molar energy', 'J/mol', 'Energy for each mole: an activation energy, a reaction\'s enthalpy or free energy.', { general: true }),
  q('henry-constant', 'Henry constant', 'Pa m^3/mol', 'Partial pressure of a gas over a liquid for each mole a cubic metre dissolved.', { words: /henry/i }),
  q('molar-entropy', 'molar entropy', 'J/mol K', 'Entropy for each mole.', { general: true }),
  q('concentration', 'concentration', 'mol/m^3', 'Moles in each cubic metre.', { general: true }),
  q('molar-flow', 'molar flow', 'mol/s', 'Moles passing or reacting each second.', { general: true }),
  q('molar-flux', 'molar flux', 'mol/m^2 s', 'Moles passing each square metre each second.', { general: true }),
  q('reaction-rate', 'reaction rate per volume', 'mol/m^3 s', 'Moles made or used in each cubic metre each second.', { general: true }),
  q('diffusivity', 'diffusivity', 'm^2/s', 'How fast something spreads by diffusion: a front moves as the root of it times time.', { general: true }),
];

const byId = new Map(QUANTITIES.map((x) => [x.id, x]));
for (const x of QUANTITIES) if (QUANTITIES.filter((y) => y.id === x.id).length > 1) throw new Error(`the quantity ${x.id} is registered twice`);
export const quantityById = (id: string): QuantityDef => { const x = byId.get(id); if (!x) throw new Error(`no quantity ${id}`); return x; };

/** Ports whose names would mislead the words, set by hand: law id and symbol → quantity. */
const AS: Record<string, string> = {
  'shannon.capacity.C': 'frequency', // bits a second
  'information.choices.N': 'count',
  'information.choices.H': 'information',
  'acoustic.mass-law.TL': 'ratio', // decibels
  'kleiber.scaling.B0': 'power',
  'beam.simply-supported.first-period.T1': 'time',
};

/** The quantity a law's port is. */
export function quantityOf(l: Pick<Law, 'id'>, p: Port): QuantityDef | undefined {
  const set = AS[`${l.id}.${p.sym}`]; if (set) return byId.get(set);
  const d = dimOf(p.unit), here = QUANTITIES.filter((x) => sameDim(x.dim, d));
  return here.find((x) => x.words?.test(p.name)) ?? here.find((x) => x.general) ?? (here.length === 1 ? here[0] : undefined);
}
/** A dimension in words: its quantities' names, or its base units when none is registered. */
export const dimSays = (d: Dim): string => { const here = QUANTITIES.filter((x) => sameDim(x.dim, d)); return here.length ? here.map((x) => x.name).join(' or ') : dimText(d); };
/** What a variable is in a law, in a sentence. */
export function meaning(l: Pick<Law, 'id' | 'name'>, p: Port): string {
  const x = quantityOf(l, p);
  return `${p.sym}, the ${p.name} in ${l.name}: ${x ? `${/^[aeiou]/i.test(x.name) ? 'an' : 'a'} ${x.name} (${x.says.charAt(0).toLowerCase()}${x.says.slice(1).replace(/\.$/, '')})` : 'a quantity not registered'}, in ${p.unit && p.unit !== '-' && p.unit !== '1' ? p.unit : 'no unit'}.`;
}
