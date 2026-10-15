// What a law RESTS on, and which law BECOMES which: the two things about the book that units cannot derive.
//
// This file is knowledge, not machinery. `substrate/time.ts` reduces every law to a power of time and derives the
// whole feed graph — which law's output can fill which law's port — from the dimensions alone, 7,949 edges that
// nobody has to write. Neither of the tables here is derivable that way, which is exactly why they are written:
//
//   PRINCIPLES / RESTS  what a law rests on. A principle is not a dimension and cannot be read off one: that
//                       Kleiber's exponent comes from a network's geometry and Basquin's from a metal is knowledge
//                       about the world, and `principlesOf` falls back to 'fit to data' only where the law's own
//                       source says it was fitted.
//   KINSHIP             which law BECOMES which — a case of, or an integral of, or a limit of. Run 8h measured the
//                       old name for this (`LINKS`, "how laws feed or contain one another") against the dimensions
//                       and found 16 of its 27 edges are NOT port-feeds at all: `fick.diffusion → diffusion.erf`
//                       is "Fick's law, conserved everywhere, becomes this law". That is derivational kinship, a
//                       different relation from feeding, and one name was doing both jobs. The feed half is now
//                       derived in `time.ts`; this is the half that has to be known.

import type { Law } from '../lang/law';

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
  'arrhenius.ratio': P('the Boltzmann factor'), 'decay.first-order': P('counting'), 'loss.first-order': P('counting'), 'total.volume': P('counting'), 'stoichiometry.moles': P('conservation of mass'), 'saturation.share': P('counting'), 'half-life': P('counting'), 'growth.doubling': P('counting'), 'mortality.gompertz': P('fit to data'),
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
  // x-rays, infrared and lidar (src/nexus/machines/instruments.ts)
  'xray.cutoff': P('quanta', 'conservation of energy'), 'xray.efficiency': P('fit to data', 'electromagnetism'), 'attenuation.exponential': P('counting'), 'wien.displacement': P('quanta', 'the Boltzmann factor'),
  'lidar.time-of-flight': P('waves', 'geometry'), 'lidar.return': P('geometry', 'conservation of energy'), 'ftir.resolution': P('waves'),
  // craft that are not wheeled (src/nexus/machines/craft.ts)
  'thrust.jet': P('conservation of momentum'), 'cushion.pressure': P('gravitation', 'geometry'), 'cushion.escape': P('conservation of energy', 'fit to data'), 'hull.collapse': P('elasticity', 'fit to data'),
  carnot: P('the second law'), 'weld.heat-input': P('conservation of energy'), arrhenius: P('the Boltzmann factor'), 'absorbed.solar': P('conservation of energy'), 'separation.work': P('the second law'), 'ideal.gas': P('the Boltzmann factor'), 'clausius-clapeyron': P('equilibrium'), 'boltzmann.distribution': P('the Boltzmann factor'), 'first.law': P('conservation of energy'),
};
/** What a law rests on: as written above, else a fitted relation if it has fitted constants, else unplaced. */
export function principlesOf(l: Law): Principle[] | 'unplaced' {
  const r = RESTS[l.id]; if (r) return r;
  if (/rule of thumb|maker|distributor/.test(l.source.kind)) return P('fit to data');
  return 'unplaced';
}
/** Which law becomes which: a case of, an integral of, a limit of. NOT a port-feed — `time.ts` derives those from
 *  the dimensions. `kinshipFeeds` in `time.ts` says, of each edge here, whether the dimensions also support it. */
export const KINSHIP: [from: string, to: string, how: string][] = [
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
