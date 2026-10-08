// The laws as one graph. Every law of the book rests on a few principles (conservation, the Boltzmann factor, the random
// walk, equilibrium, geometry, least dissipation…), shares its shape of math with laws of other fields (a product of
// powers, an exponential, a sum), and links to the laws it is a case of or feeds. And a number about anything is a chain
// of laws over what is measured: `step` applies a law to records, so the result carries every input it rests on, and
// `breakdown` reads that tree back, down to each measurement and estimate and where it is from.
//
// The graph also finds laws. A law that is a product of powers is fixed by its units alone, up to its constant, when its
// quantities make one dimensionless group (Rayleigh's method, Buckingham's π): `discover` writes that law from the
// quantities' units, and `forcedByUnits` says, of each law in the book, whether its exponents are what units force or
// carry something units cannot know (Kleiber's ¾ from a network's geometry, Basquin's exponent from a metal).

import { BOOK, lawById, lawByHash } from './book';
import { dimOf, integerNullSpace, sameDim, type Dim } from './dimension';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { apply, invert, type Law } from './law';
import { div, leaf, mul, OPERATORS, pow, substitute, variable, type Term } from './term';
import { fromSI, parseUnit } from '../ganglia/units';

// ---- records ----------------------------------------------------------------------------------------------------------
/** A measured value as a record: its source says where it is measured. */
export const measured = (name: string, value: number, unit: string, source: string, uncertainty?: number): Derivation => ofLeaf(leaf(name, value, unit, { class: 'measured', source }, uncertainty));
/** An estimate as a record: its grounds say why. */
export const estimate = (name: string, value: number, unit: string, grounds: string): Derivation => ofLeaf(leaf(name, value, unit, { class: 'estimated', grounds }));
/** A fixed constant of nature or a definition as a record. */
export const fixed = (name: string, value: number, unit: string, source: string): Derivation => ofLeaf(leaf(name, value, unit, { class: 'fundamental', source }));
/** A value set by a choice of the world (a body's own parameters, a place's temperature) as a record. */
export const setting = (name: string, value: number, unit: string, by: string): Derivation => ofLeaf(leaf(name, value, unit, { class: 'given', by }));

/** A law applied to records, each checked against its port's dimension: the result carries them as its breakdown. */
export function step(id: string, env: Record<string, Derivation>, name?: string): Derivation {
  const l = lawById(id);
  for (const p of l.inputs) {
    const d = env[p.sym]; if (!d) throw new Error(`${id}: ${p.sym} (${p.name}) is not given`);
    if (!sameDim(d.dim, dimOf(p.unit))) throw new Error(`${id}: ${p.sym} is ${d.unit}, the port is ${p.unit}`);
  }
  return apply(l, env, name ?? l.output.name);
}
/** If this then that: the value an input must take for a law's output to reach a target, every other input given. */
export function need(id: string, sym: string, target: number, env: Record<string, Derivation>, bracket: [number, number]): number | null {
  const l = lawById(id), port = l.inputs.find((p) => p.sym === sym); if (!port) throw new Error(`${id}: ${sym} is not an input`);
  const x = invert(l, sym, target, env, [bracket[0], bracket[1]], (name, value, unit) => setting(name, value, unit, 'the inversion'));
  return x === null ? null : x;
}
/** A law solved for one of its inputs, as a record citing the law: where the law is a product of powers in it, the
 *  rearranged term (so the breakdown reads the same law the other way round); else by numeric inversion inside a bracket. */
export function solve(id: string, sym: string, env: Record<string, Derivation>, name?: string, bracket?: [number, number]): Derivation {
  const l = lawById(id), port = l.inputs.find((p) => p.sym === sym); if (!port) throw new Error(`${id}: ${sym} is not an input`);
  const out = env[l.output.sym]; if (!out) throw new Error(`${id}: give its output ${l.output.sym} to solve for ${sym}`);
  const m = monomial(l.term), p = m?.e[sym], u = parseUnit(port.unit);
  if (m && p && !u.offset) {
    const one = leaf(`one ${port.unit}`, 1 / u.scale, port.unit, { class: 'fundamental', source: 'the unit of what is solved for' });
    const rest = substitute(l.term, { [sym]: one }), outVar = variable(l.output.sym, l.output.unit, l.output.name);
    const t = mul(one, p === 1 ? div(outVar, rest) : pow(div(outVar, rest), 1 / p));
    return evaluate(name ?? port.name, t, { ...env }, { law: l.hash, unit: port.unit });
  }
  if (!bracket) throw new Error(`${id}: ${sym} is not a power in it; give a bracket to invert in`);
  const x = invert(l, sym, out.value!, env, bracket, (n, v, un) => setting(n, v, un, 'the inversion'));
  return x === null ? ofLeaf(leaf(name ?? port.name, null, port.unit, { class: 'unknown' })) : ofLeaf(leaf(name ?? port.name, fromSI(x, port.unit), port.unit, { class: 'assumed', by: 'the law graph', grounds: `${l.name} solved numerically for ${port.name}` }));
}
/** A record's value in a unit. */
export const valueIn = (d: Derivation, unit = d.unit): number | null => (d.value === null ? null : fromSI(d.value, unit));
const num = (x: number) => (x === 0 ? '0' : Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3 ? x.toExponential(3) : +x.toPrecision(4) + '');
/** How a record says itself: its value in its unit, its origin or its law. */
export function says(d: Derivation, unit = d.unit): string { const v = valueIn(d, unit); return `${d.name} = ${v === null ? (d.refusal ? `refused (${d.refusal.domain})` : 'unknown') : num(v)}${unit === '-' || unit === '1' ? '' : ` ${unit}`}`; }
/** The tree a record rests on, as lines: each law with its formula, each leaf with where it is from. */
export function breakdown(d: Derivation, depth = 0, out: string[] = [], most = 8): string[] {
  const pad = '  '.repeat(depth);
  if (d.term.kind === 'leaf') {
    const o = d.term.origin, from = o.source ?? o.grounds ?? o.by ?? '';
    out.push(`${pad}${says(d)} — ${o.class === 'estimated' ? 'an estimate' : o.class === 'fundamental' ? 'fixed' : o.class === 'given' ? 'set' : o.class}${from ? `: ${from}` : ''}`);
    return out;
  }
  const l = d.law ? lawByHash(d.law) : undefined;
  out.push(`${pad}${says(d)} — ${l ? `${l.name}: ${l.formula}` : 'worked out'}`);
  if (depth >= most) return out;
  // a law solved for an input carries its output among its inputs: read it too
  const order = l ? [...l.inputs.map((p) => p.sym), ...Object.keys(d.inputs).filter((k) => !l.inputs.some((p) => p.sym === k))] : Object.keys(d.inputs);
  for (const sym of order) { const c = d.inputs[sym]; if (c) breakdown(c, depth + 1, out, most); }
  return out;
}
/** Every law a record rests on, once, deepest first. */
export function lawsUnder(d: Derivation, out: Law[] = []): Law[] {
  for (const c of Object.values(d.inputs)) lawsUnder(c, out);
  const l = d.law ? lawByHash(d.law) : undefined; if (l && !out.includes(l)) out.push(l);
  return out;
}
/** Every measurement and estimate a record rests on. */
export function leavesUnder(d: Derivation, out: Derivation[] = []): Derivation[] {
  if (d.term.kind === 'leaf') { if (!out.includes(d)) out.push(d); return out; }
  for (const c of Object.values(d.inputs)) leavesUnder(c, out);
  return out;
}

// ---- principles ---------------------------------------------------------------------------------------------------------
export const PRINCIPLES = {
  'conservation of mass': 'what goes in comes out or stays: atoms are neither made nor lost',
  'conservation of energy': 'energy changes form and moves but is never made or lost (the first law)',
  'conservation of momentum': 'a push is a change of momentum, and every push has its equal push back',
  'conservation of charge': 'charge flows but is never made or lost',
  counting: 'things counted through a steady system: what it holds is what flows through it times how long each stays',
  'the Boltzmann factor': 'a state an energy E above another is e^(−E/kT) as likely: why everything goes faster warm',
  'the random walk': 'molecules wander at random, so they spread as the square root of time',
  equilibrium: 'at equilibrium nothing can lower its free energy further: gradients, solubility, vapour pressure, osmosis',
  'the second law': 'entropy does not fall: there is a least work for every separation and a most work from every heat',
  geometry: 'lengths, areas and volumes, and how they scale',
  'least dissipation': 'a network that grew to waste least power: branching radii, space-filling trees',
  gravitation: 'masses pull each other: weight, pressure with depth, buoyancy',
  electromagnetism: 'charges and currents push each other and make fields',
  waves: 'light and sound bend, diffract and interfere',
  quanta: 'light and matter come in quanta of h ν',
  elasticity: 'a solid pushes back in proportion to how far it is strained, until it yields',
  'fit to data': 'a relation fitted to measurements, its constants from its data: the kind of law a principle should one day replace',
} as const;
export type Principle = keyof typeof PRINCIPLES;
const P = (...p: Principle[]) => p;
/** What each law rests on. */
export const RESTS: Record<string, Principle[]> = {
  // the universal book
  'balance.steady': P('conservation of mass'), 'balance.difference': P('conservation of mass'), 'junction.sum': P('conservation of mass'), 'transport.advection': P('conservation of mass'), 'flux.area': P('conservation of mass', 'geometry'), 'total.mass': P('counting'), 'total.flow': P('counting'), 'total.rate': P('counting'), 'rate.per-mass': P('counting'), 'share.of': P('conservation of mass'), 'residence.mass': P('counting', 'conservation of mass'), 'amount.concentration': P('counting'), 'power.molar': P('conservation of energy'), 'mass.flow': P('conservation of mass'), 'time.scaled-by-rate': P('counting'), 'concentration.difference': P('conservation of mass'), 'humidity.vapour-pressure': P('equilibrium'), 'rates.add': P('counting'), 'hazard.dose': P('fit to data'), 'stages.series': P('counting'), 'moles.of-mass': P('counting'), 'faraday.flux': P('conservation of charge'), 'radiation.linear': P('quanta', 'the Boltzmann factor'), 'conductance.parallel': P('conservation of energy'), 'power.net': P('conservation of energy'), 'power.sum': P('conservation of energy'), 'energy.power-time': P('conservation of energy'), 'dose.time': P('counting'), 'life.expectancy.gompertz-makeham': P('fit to data', 'counting'), 'molar.mass-flow': P('conservation of mass'), 'volume.ellipsoid': P('geometry'), 'area.sphere-of-volume': P('geometry'), 'area.shaped': P('geometry'), 'power.per-mass': P('counting'), 'volume.of-box': P('geometry'), 'reaction.rate-from-power': P('conservation of energy'), 'residence.stock': P('counting', 'conservation of mass'), 'stoichiometry.mass': P('conservation of mass'), 'heat.latent-flow': P('conservation of energy'),
  'distance.speed-time': P('geometry'), 'volume.cylinder': P('geometry'), 'mass.volume': P('geometry'), 'mixing.density': P('conservation of mass', 'geometry'),
  'starling.filtration': P('conservation of momentum', 'equilibrium'), poiseuille: P('conservation of momentum'), 'murray.branching': P('least dissipation'), 'network.scaling': P('least dissipation', 'geometry'), 'kleiber.scaling': P('least dissipation', 'fit to data'),
  'diffusion.front': P('the random walk', 'conservation of mass'), 'diffusion.erf': P('the random walk'), 'diffusion.sphere-limit': P('the random walk', 'conservation of mass'),
  'osmotic.van-t-hoff': P('equilibrium'), 'free-energy.gradient': P('equilibrium'), 'henry.solubility': P('equilibrium'), 'gas.concentration': P('the Boltzmann factor'), 'vapour.pressure': P('equilibrium', 'the Boltzmann factor'), 'sorption.gab': P('equilibrium', 'fit to data'),
  'arrhenius.ratio': P('the Boltzmann factor'), 'decay.first-order': P('counting'), 'half-life': P('counting'), 'growth.doubling': P('counting'), 'mortality.gompertz': P('fit to data'),
  'column.self-weight': P('gravitation', 'geometry'), 'fatigue.basquin': P('fit to data'), 'conduction.series': P('conservation of energy'), 'evaporation.max': P('conservation of energy', 'the random walk'), 'laplace.pressure': P('conservation of energy', 'geometry'), 'stokes.drag': P('conservation of momentum'),
  'corrosion.penetration': P('conservation of charge', 'conservation of mass'), 'porosity.powers': P('conservation of mass', 'fit to data'), 'diffusivity.papadakis': P('the random walk', 'fit to data'),
  // the kept book
  'fick.diffusion': P('the random walk'), 'diffusion.time': P('the random walk'), nernst: P('equilibrium'), 'gibbs.energy': P('equilibrium'), 'michaelis-menten': P('counting', 'equilibrium'), 'faraday.electrolysis': P('conservation of charge', 'conservation of mass'), 'butler-volmer': P('the Boltzmann factor'),
  ohm: P('electromagnetism'), joule: P('conservation of energy'), 'wire.resistance': P('electromagnetism', 'geometry'), 'copper.tempco': P('fit to data'), 'wire.drop': P('electromagnetism'), 'motor.torque': P('electromagnetism'), 'motor.back-emf': P('electromagnetism'), 'motor.current': P('electromagnetism'), 'motor.time-constant': P('conservation of momentum'),
  'lead-acid.ocv': P('fit to data'), 'energy.electric': P('conservation of energy'), 'rc.time-constant': P('electromagnetism'), 'capacitor.energy': P('conservation of energy'), 'inductor.energy': P('conservation of energy'), 'power.electric': P('conservation of energy'), 'electrostatic.pull': P('electromagnetism'), 'cmos.dynamic': P('conservation of energy'), seebeck: P('fit to data'), 'strain.gauge': P('elasticity'),
  'pv.power': P('conservation of energy'), 'coulomb.law': P('electromagnetism'), 'shockley.diode': P('the Boltzmann factor'), 'wave.speed.electromagnetic': P('electromagnetism', 'waves'), 'cable.equation': P('electromagnetism'),
  'drag.aero': P('conservation of momentum'), 'lift.aero': P('conservation of momentum'), 'gas.isothermal-work': P('conservation of energy'), reynolds: P('conservation of momentum'), 'darcy-weisbach': P('conservation of momentum', 'fit to data'), buoyancy: P('gravitation'), hydrostatic: P('gravitation'), 'thrust.ideal-static': P('conservation of momentum', 'conservation of energy'), 'acoustic.mass-law': P('waves', 'conservation of momentum'),
  bernoulli: P('conservation of energy'), continuity: P('conservation of mass'), landauer: P('the second law'), 'information.choices': P('counting'), 'rayleigh.resolution': P('waves'), 'diffraction.limit': P('waves'), 'shannon.capacity': P('counting'), 'shannon.sampling': P('waves'), queueing: P('counting'),
  'lorentz.force': P('electromagnetism'), 'magnetic.pull': P('electromagnetism'), 'skin.depth': P('electromagnetism'), 'ampere.law': P('electromagnetism'), 'faraday.induction': P('electromagnetism'),
  hooke: P('elasticity'), 'stress.von-mises': P('elasticity'), 'thermal.expansion': P('fit to data'), 'fatigue.endurance.steel': P('fit to data'), 'composite.rule-of-mixtures': P('elasticity'), 'composite.transverse': P('elasticity'), 'sinter.scale': P('geometry'), 'piezo.stroke': P('electromagnetism', 'elasticity'), 'young.contact': P('equilibrium'), 'carbonation.capacity': P('conservation of mass'), griffith: P('conservation of energy', 'elasticity'), 'hall-petch': P('fit to data'),
  'newton.second': P('conservation of momentum'), weight: P('gravitation'), 'friction.coulomb': P('fit to data'), 'rolling.resistance': P('fit to data'), 'grade.force': P('gravitation', 'geometry'), 'power.linear': P('conservation of energy'), 'power.rotary': P('conservation of energy'), 'wheel.torque': P('conservation of momentum'), 'traction.limit': P('fit to data'),
  'energy.kinetic': P('conservation of energy'), 'energy.potential': P('conservation of energy', 'gravitation'), 'braking.distance': P('conservation of energy'), 'cornering.limit': P('conservation of momentum'), 'pendulum.period': P('gravitation', 'conservation of energy'), 'natural.frequency': P('elasticity', 'conservation of momentum'), centripetal: P('conservation of momentum', 'geometry'),
  'inertia.disc': P('geometry'), 'inertia.rod-end': P('geometry'), 'parallel-axis': P('geometry'), 'energy.rotational': P('conservation of energy'), 'free-fall.speed': P('conservation of energy', 'gravitation'), 'flywheel.specific-energy': P('elasticity', 'conservation of energy'), 'spring.energy': P('conservation of energy', 'elasticity'),
  'time.dilation.gravity': P('gravitation'), 'sound.speed': P('elasticity', 'waves'), 'conservation.momentum': P('conservation of momentum'), 'hill.muscle': P('fit to data'), froude: P('gravitation', 'conservation of energy'), tsiolkovsky: P('conservation of momentum'), 'planck.energy': P('quanta'), 'snell.law': P('waves'), 'bragg.law': P('waves'),
  'stress.axial': P('elasticity'), 'stress.bending': P('elasticity'), 'beam.simply-supported.udl': P('elasticity'), 'beam.simply-supported.point': P('elasticity'), 'beam.cantilever.point': P('elasticity'), 'buckling.euler': P('elasticity'), 'torsion.solid': P('elasticity'), 'torsion.twist': P('elasticity'), 'buckling.johnson': P('elasticity', 'fit to data'), 'slenderness.transition': P('elasticity'), 'stress.hoop': P('conservation of momentum'), 'weld.fillet.shear': P('elasticity'), 'beam.plastic-moment': P('elasticity'),
  convection: P('conservation of energy', 'fit to data'), conduction: P('conservation of energy', 'the random walk'), 'convection.natural': P('fit to data'), radiation: P('quanta', 'the Boltzmann factor'), 'heat.capacity': P('conservation of energy'), 'lumped.time-constant': P('conservation of energy'), 'thermal.network': P('conservation of energy'), 'thermal.resistance.conduction': P('conservation of energy'),
  'shaft.diameter.static': P('elasticity'), 'bearing.life.l10': P('fit to data'), 'bearing.life.hours': P('counting'), 'spring.rate': P('elasticity'), capstan: P('conservation of momentum', 'fit to data'), 'chain.speed': P('geometry'), 'chain.pull': P('conservation of momentum'), 'gear.output.torque': P('conservation of energy'), 'bolt.torque.nut-factor': P('fit to data'), 'belt.speed': P('geometry'), 'screw.force': P('conservation of energy'), 'gear.lewis': P('elasticity'), 'spring.torsion.rate': P('elasticity'), 'screw.efficiency': P('conservation of energy'), 'hertz.contact': P('elasticity'), grubler: P('geometry'),
  'mass.prism': P('geometry'), 'extent.from-mass': P('geometry'), 'weight.per-length': P('gravitation'), 'statics.two-supports.symmetric': P('conservation of momentum'), 'beam.simply-supported.central-patch.moment': P('conservation of momentum'), 'beam.overhang.self-moment': P('conservation of momentum'), 'section.rect.area': P('geometry'), 'section.rect.modulus': P('geometry'), 'section.rect.second-moment': P('geometry'), 'beam.simply-supported.central-patch.sag': P('elasticity'), 'beam.overhang.self-sag': P('elasticity'), 'beam.simply-supported.first-period': P('elasticity', 'conservation of momentum'), 'cantilever.root-moment': P('conservation of momentum'), 'cantilever.root-shear': P('conservation of momentum'), 'cantilever.tip-sag': P('elasticity'), 'bolt.tensile-stress-area': P('geometry'), 'bolt-group.tension': P('conservation of momentum'), 'bolt-group.bending': P('conservation of momentum'), 'inertia.prism.centre': P('geometry'), 'pendulum.physical.period': P('gravitation', 'conservation of energy'), 'pendulum.period-factor': P('gravitation'), 'pendulum.amplitude-factor': P('gravitation'),
  carnot: P('the second law'), 'weld.heat-input': P('conservation of energy'), arrhenius: P('the Boltzmann factor'), 'absorbed.solar': P('conservation of energy'), 'separation.work': P('the second law'), 'ideal.gas': P('the Boltzmann factor'), 'clausius-clapeyron': P('equilibrium'), 'boltzmann.distribution': P('the Boltzmann factor'), 'first.law': P('conservation of energy'),
};
/** What a law rests on: as written above, else a fitted relation if it has fitted constants, else unplaced. */
export function principlesOf(l: Law): Principle[] | 'unplaced' {
  const r = RESTS[l.id]; if (r) return r;
  if (/rule of thumb|maker|distributor/.test(l.source.kind)) return P('fit to data');
  return 'unplaced';
}
/** How laws feed or contain one another. */
export const LINKS: [from: string, to: string, how: string][] = [
  ['free-energy.gradient', 'nernst', 'at equilibrium (ΔG = 0) the gradient\'s free energy gives the Nernst potential'],
  ['boltzmann.distribution', 'arrhenius', 'a rate is the share of molecules over the barrier: the Boltzmann factor at the activation energy'],
  ['arrhenius', 'arrhenius.ratio', 'two rates by Arrhenius over each other'],
  ['stoichiometry.mass', 'carbonation.capacity', 'stoichiometry with one CO₂ a CaO'],
  ['network.scaling', 'kleiber.scaling', 'the network\'s exponent is Kleiber\'s'],
  ['poiseuille', 'murray.branching', 'least work against Poiseuille flow gives Murray\'s cube law'],
  ['murray.branching', 'network.scaling', 'Murray-type branching (β = n^−⅓) in a network gives the small-vessel exponent'],
  ['decay.first-order', 'half-life', 'where the first-order loss is a half'],
  ['decay.first-order', 'growth.doubling', 'the same exponential with the sign turned'],
  ['fick.diffusion', 'diffusion.front', 'Fick\'s flux through the reacted layer, conserved at the front'],
  ['fick.diffusion', 'diffusion.erf', 'Fick\'s flux conserved everywhere gives his second law, whose solution from a held surface is the error function'],
  ['fick.diffusion', 'diffusion.sphere-limit', 'Fick\'s flux balanced by consumption in a sphere'],
  ['diffusion.time', 'diffusion.front', 'both go as √(D t): the random walk'],
  ['ideal.gas', 'gas.concentration', 'the ideal gas, as moles a volume'],
  ['ideal.gas', 'osmotic.van-t-hoff', 'dilute solutes press like a gas (van \'t Hoff)'],
  ['clausius-clapeyron', 'vapour.pressure', 'the slope integrated at a constant latent heat'],
  ['vapour.pressure', 'evaporation.max', 'the skin\'s and the air\'s vapour pressures drive evaporation'],
  ['convection', 'evaporation.max', 'the Lewis relation: mass transfer follows heat transfer'],
  ['osmotic.van-t-hoff', 'starling.filtration', 'the osmotic pressure that holds water back'],
  ['faraday.electrolysis', 'corrosion.penetration', 'Faraday\'s mass, spread over the area as thickness'],
  ['porosity.powers', 'diffusivity.papadakis', 'the paste\'s porosity sets how fast CO₂ diffuses'],
  ['diffusivity.papadakis', 'diffusion.front', 'the diffusivity of the carbonated layer'],
  ['gas.concentration', 'diffusion.front', 'the CO₂ held at the surface'],
  ['weight', 'column.self-weight', 'its weight a volume against its strength'],
  ['conduction', 'conduction.series', 'Fourier\'s layers in series'],
  ['queueing', 'residence.stock', 'Little\'s law for a continuum'],
  ['residence.stock', 'balance.steady', 'a stock held steady by its flows'],
];

// ---- the shapes of math ---------------------------------------------------------------------------------------------------
/** A product of powers: its constant (SI), each input's exponent, and the constants with units in it (R, F, g), each
 *  with its exponent; null where the term is not one. */
export interface Monomial { c: number; e: Record<string, number>; k: { name: string; unit: string; e: number }[] }
export function monomial(t: Term): Monomial | null {
  if (t.kind === 'leaf') return t.value === null ? null : { c: t.value, e: {}, k: sameDim(t.dim, [0, 0, 0, 0, 0]) && !/mol/.test(t.unit) ? [] : [{ name: t.name, unit: t.unit, e: 1 }] };
  if (t.kind === 'var') return { c: 1, e: { [t.sym]: 1 }, k: [] };
  if (t.kind !== 'app') return null;
  const of = t.args.map(monomial); if (of.some((x) => !x)) return null;
  const join = (a: Monomial, b: Monomial, s: number): Monomial => {
    const e = { ...a.e }; for (const [k, v] of Object.entries(b.e)) e[k] = (e[k] ?? 0) + s * v;
    const kk = a.k.map((x) => ({ ...x })); for (const x of b.k) { const h = kk.find((y) => y.name === x.name); if (h) h.e += s * x.e; else kk.push({ ...x, e: s * x.e }); }
    return { c: s > 0 ? a.c * b.c : a.c / b.c, e, k: kk };
  };
  switch (t.op) {
    case 'mul': return of.reduce((a, b) => join(a!, b!, 1))!;
    case 'div': return join(of[0]!, of[1]!, -1);
    case 'pow': { const a = of[0]!, p = t.k!; return { c: Math.pow(a.c, p), e: Object.fromEntries(Object.entries(a.e).map(([k, v]) => [k, v * p])), k: a.k.map((x) => ({ ...x, e: x.e * p })) }; }
    case 'neg': return { ...of[0]!, c: -of[0]!.c };
    default: return null;
  }
}
/** The shape of a term with its quantities and constants taken out: laws of different fields with one shape are one math. */
export function skeleton(t: Term): string {
  if (t.kind === 'leaf') return 'c';
  if (t.kind === 'var') return 'x';
  if (t.kind === 'bind') return `∫(${skeleton(t.body)})`;
  const args = t.args.map(skeleton); if (OPERATORS[t.op].commutative) args.sort();
  return `${t.op}${t.k === undefined ? '' : `^${+t.k.toFixed(4)}`}(${args.join(',')})`;
}
/** The kind of math a law is. */
export function shapeOf(l: Law): 'product of powers' | 'exponential' | 'logarithmic' | 'sum' | 'other' {
  const m = monomial(l.term); if (m) return 'product of powers';
  const s = skeleton(l.term);
  if (s.includes('exp(')) return 'exponential';
  if (s.includes('ln(') || s.includes('log')) return 'logarithmic';
  if (/^(add|sub)\(/.test(s) || /add\(|sub\(/.test(s)) return 'sum';
  return 'other';
}
/** The laws by their shape of math: each group a math shared across fields. */
export function families(laws: readonly Law[] = BOOK): { skeleton: string; laws: string[] }[] {
  const by = new Map<string, string[]>();
  for (const l of laws) { const s = skeleton(l.term); by.set(s, [...(by.get(s) ?? []), l.id]); }
  return [...by.entries()].map(([skeleton, ids]) => ({ skeleton, laws: ids })).filter((f) => f.laws.length > 1).sort((a, b) => b.laws.length - a.laws.length);
}

// ---- laws found from units ------------------------------------------------------------------------------------------------
/** The amount of substance a unit carries: the units here keep the mole dimensionless, but finding laws needs it counted
 *  (so that moles a volume and moles a volume a second cannot hide in a volume). */
export function molesOf(unit: string): number {
  const [top, ...under] = unit.split('/'), count = (s: string) => [...s.matchAll(/\bmol(?:\^(-?\d+))?\b/g)].reduce((a, m) => a + Number(m[1] ?? 1), 0);
  return count(top ?? '') - under.reduce((a, s) => a + count(s), 0);
}
const dim6 = (unit: string): number[] => [...dimOf(unit), molesOf(unit)];
/** Rayleigh's method: the product of powers the units of these quantities allow for the output, when they allow one;
 *  otherwise the dimensionless groups the answer is some function of. */
export function discover(output: [name: string, unit: string], inputs: [name: string, unit: string][]): { forced: boolean; exponents?: Record<string, number>; groups: number[][]; says: string } {
  const dims = [output[1], ...inputs.map(([, u]) => u)].map(dim6), groups = integerNullSpace([0, 1, 2, 3, 4, 5].map((r) => dims.map((d) => d[r]!)), dims.length);
  const withOut = groups.filter((g) => g[0] !== 0);
  if (groups.length === 1 && withOut.length === 1) {
    const g = withOut[0]!, exponents = Object.fromEntries(inputs.map(([n], i) => [n, -g[i + 1]! / g[0]!]));
    const terms = Object.entries(exponents).filter(([, e]) => e !== 0).map(([n, e]) => (e === 1 ? n : `${n}^${+e.toFixed(3)}`));
    return { forced: true, exponents, groups, says: `${output[0]} ∝ ${terms.join(' × ')}: the only product of powers their units allow (a constant is all that is left to measure)` };
  }
  return { forced: false, groups, says: groups.length ? `${groups.length} dimensionless groups: the answer is a function of them that units alone cannot give` : 'their units make no dimensionless group: there is no law among only these' };
}
/** Of a law in the book: whether its exponents are what its units force (so only its constant carries information), what
 *  units leave open, or (a fault) what units forbid. Its constants with units (R, F, g) count as quantities. */
export function forcedByUnits(l: Law): { verdict: 'forced' | 'open' | 'not a product of powers' | 'contradicts its units'; says: string } {
  const m = monomial(l.term); if (!m) return { verdict: 'not a product of powers', says: `${shapeOf(l)}: its shape comes from more than units` };
  const syms = Object.keys(m.e).filter((s) => Math.abs(m.e[s]!) > 1e-12);
  const ports = syms.map((s) => l.inputs.find((p) => p.sym === s)!);
  const free = ports.filter((p) => dim6(p.unit).every((x) => x === 0));
  const consts = m.k.filter((x) => Math.abs(x.e) > 1e-12);
  const qs: [string, string, number][] = [...ports.filter((p) => !free.includes(p)).map((p) => [p.sym, p.unit, m.e[p.sym]!] as [string, string, number]), ...consts.map((x) => [x.name, x.unit, x.e] as [string, string, number])];
  const d = discover([l.output.name, l.output.unit], qs.map(([n, u]) => [n, u]));
  if (!d.forced) return { verdict: 'open', says: free.length ? `${free.map((p) => p.name).join(', ')} ${free.length > 1 ? 'are' : 'is'} dimensionless: its exponent is the physics, not the units` : d.says };
  for (const [n, , e] of qs) if (Math.abs((d.exponents![n] ?? 0) - e) > 1e-9) return { verdict: 'contradicts its units', says: `${n}: units force ${d.exponents![n]}, the law has ${e}` };
  return { verdict: free.length ? 'open' : 'forced', says: free.length ? `its dimensional part is forced; ${free.map((p) => p.name).join(', ')} carry the rest` : `forced: ${d.says.split(':')[0]} — its constant ${num(m.c)} is all it adds` };
}

// ---- routes between quantities ----------------------------------------------------------------------------------------------
/** The laws that make a quantity of a dimension from quantities of dimensions at hand, in one step or two. */
export function routes(target: string, have: string[], laws: readonly Law[] = BOOK): string[][] {
  const t = dimOf(target), hv = have.map(dimOf), has = (d: Dim) => hv.some((h) => sameDim(h, d));
  const direct = laws.filter((l) => sameDim(dimOf(l.output.unit), t) && l.inputs.every((p) => has(dimOf(p.unit))));
  const out: string[][] = direct.map((l) => [l.id]);
  const makers = laws.filter((l) => l.inputs.every((p) => has(dimOf(p.unit))));
  for (const l of laws) {
    if (!sameDim(dimOf(l.output.unit), t) || direct.includes(l)) continue;
    const missing = l.inputs.filter((p) => !has(dimOf(p.unit)));
    const via = missing.map((p) => makers.find((m) => sameDim(dimOf(m.output.unit), dimOf(p.unit))));
    if (via.every(Boolean)) out.push([...new Set(via.map((m) => m!.id)), l.id]);
  }
  return out;
}

/** The graph in numbers: laws by principle and shape, families of shared math, what units force. */
export function graphSummary(laws: readonly Law[] = BOOK) {
  const byPrinciple: Record<string, string[]> = {}, byShape: Record<string, number> = {}, units: Record<string, string[]> = {};
  for (const l of laws) {
    const p = principlesOf(l); for (const x of p === 'unplaced' ? ['unplaced'] : p) (byPrinciple[x] ??= []).push(l.id);
    const s = shapeOf(l); byShape[s] = (byShape[s] ?? 0) + 1;
    const f = forcedByUnits(l).verdict; (units[f] ??= []).push(l.id);
  }
  return { laws: laws.length, byPrinciple, byShape, units, families: families(laws), links: LINKS.length };
}
