// Chemistry and physics: the substrate under everything. Elements, bonds, molecules, reactions; the laws that the
// ganglia already run, and the ones they cite, each linked to the properties it sets, the phenomena it governs and
// the engineering it makes possible.
import { viewOfDomain } from './views';
import { LAWS } from '../../laws';
import type { Source } from '../../types';
import { Pack } from '../dsl';

const ATKINS: Source = { cite: 'Atkins, de Paula & Keeler, Atkins\' Physical Chemistry, 11th ed., Oxford 2018', kind: 'textbook' };
const CLAYDEN: Source = { cite: 'Clayden, Greeves & Warren, Organic Chemistry, 2nd ed., Oxford 2012', kind: 'textbook' };
const BARD: Source = { cite: 'Bard & Faulkner, Electrochemical Methods, 2nd ed., Wiley 2001', kind: 'textbook' };
const CRC: Source = { cite: 'CRC Handbook of Chemistry and Physics, 97th ed., 2016', kind: 'handbook' };
const PHYSICS: Source = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' };
const GRIFFITHS: Source = { cite: 'Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017', kind: 'textbook' };
const KITTEL: Source = { cite: 'Kittel, Introduction to Solid State Physics, 8th ed., Wiley 2005', kind: 'textbook' };
const INCROPERA: Source = { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley 2011', kind: 'textbook' };

export function chemistry(): Pack {
  const p = new Pack('chemistry', ATKINS);
  const c = (id: string, kinds: Parameters<Pack['e']>[1], says: string, links: Parameters<Pack['link']>[1], src: Source = ATKINS) => { p.e(id, kinds, says, { source: src }); p.link(id, links, src); };
  // elements that engineering turns on
  const EL: [string, string, number, string[]][] = [
    ['element.hydrogen', 'The lightest: fuel, reductant, the proton of every acid and gradient.', 1, ['role.fuel']], ['element.carbon', 'Four bonds, chains and rings: all organic matter, steel\'s hardener, graphite, diamond, fibre.', 6, ['role.structural-member', 'role.electrode', 'role.fuel']],
    ['element.nitrogen', 'Inert as N₂; in amines, amides, nitrates, and every protein.', 7, []], ['element.oxygen', 'The oxidant of combustion and respiration; oxides are most rocks and ceramics.', 8, []],
    ['element.sodium', 'A soft metal, a cation in every cell and sea.', 11, ['role.electrolyte']], ['element.magnesium', 'The lightest structural metal; chlorophyll\'s centre.', 12, ['role.structural-member']],
    ['element.aluminium', 'Light, conductive, oxide-protected; the most used metal after iron.', 13, ['role.structural-member', 'role.electrical-conductor']], ['element.silicon', 'A semiconductor; silica is sand, glass, quartz.', 14, ['role.semiconductor']],
    ['element.phosphorus', 'The backbone of DNA and ATP; fertiliser; phosphate in bone.', 15, []], ['element.sulfur', 'Vulcanises rubber; sulphuric acid; cysteine\'s bridges.', 16, []],
    ['element.chlorine', 'The anion of salt; PVC; disinfectant.', 17, []], ['element.potassium', 'The cation inside cells.', 19, ['role.electrolyte']], ['element.calcium', 'Bone, shell, cement, the signal ion of muscle.', 20, []],
    ['element.titanium', 'Strong, light, inert; its oxide the white of paint.', 22, ['role.structural-member', 'role.implant']], ['element.vanadium', 'Alloys steel and titanium.', 23, []], ['element.chromium', 'Makes steel stainless; chrome plate.', 24, []],
    ['element.manganese', 'Deoxidises and hardens steel.', 25, []], ['element.iron', 'The structural metal of civilisation; haemoglobin\'s oxygen carrier; the magnetic core.', 26, ['role.structural-member', 'role.magnetic-core']],
    ['element.cobalt', 'Magnets, superalloys, battery cathodes, vitamin B12.', 27, []], ['element.nickel', 'Stainless steel, superalloys, batteries, plating.', 28, []], ['element.copper', 'The conductor; brass and bronze.', 29, ['role.electrical-conductor', 'role.thermal-conductor']],
    ['element.zinc', 'Galvanising, brass, batteries, die castings.', 30, []], ['element.gallium', 'GaN and GaAs semiconductors.', 31, ['role.semiconductor']], ['element.arsenic', 'Dopant; GaAs.', 33, []], ['element.germanium', 'The first transistor\'s semiconductor; infrared optics.', 32, ['role.semiconductor']],
    ['element.silver', 'The best conductor; contacts, solder, photography.', 47, ['role.electrical-conductor']], ['element.tin', 'Solder, bronze, plating.', 50, ['role.solder']], ['element.gold', 'Inert, ductile, conductive: contacts and bonding wire.', 79, ['role.connector-material']],
    ['element.lead', 'Dense, soft, toxic: batteries, shielding, solder.', 82, []], ['element.molybdenum', 'High-melting and stiff: the alloying of stainless and tool steels, high-temperature parts.', 42, []], ['element.lithium', 'The lightest metal and the most electropositive: the ion of the lithium battery.', 3, ['role.electrode']], ['element.neodymium', 'The strongest permanent magnets.', 60, []], ['element.samarium', 'High-temperature magnets.', 62, []], ['element.boron', 'Dopant, borosilicate glass, NdFeB.', 5, []], ['element.tungsten', 'The highest melting metal: filaments, carbide tools, counterweights.', 74, []], ['element.uranium', 'Fission fuel.', 92, ['role.fuel']], ['element.helium', 'Inert, light, the coldest liquid: lifting gas, cryogenics, shielding gas.', 2, []], ['element.argon', 'Inert: welding shield, lamps.', 18, []],
  ];
  for (const [id, says, Z, roles] of EL) { p.e(id, ['chemical', 'material'], says, { source: CRC, params: [{ sym: 'Z', name: 'atomic number', of: CRC, low: Z, high: Z }] }); p.link(id, { 'is-a': ['chem.atom'], ...(roles.length ? { plays: roles } : {}) }, CRC); }
  for (const [id] of EL) p.link(id, { 'has-part': ['phys.proton', 'phys.neutron', 'phys.electron'] }, CRC);
  c('chem.atom', ['chemical', 'manifold'], 'A nucleus of protons and neutrons with electrons in orbitals: 118 elements by proton count, their chemistry by the outer electrons.', { 'has-part': ['phys.proton', 'phys.neutron', 'phys.electron'], 'governed-by': ['schrodinger', 'coulomb.law', 'pauli.exclusion'], 'varies-by': ['param.atomic-number', 'param.isotope'], 'in-view': ['view.chemical', 'view.quantum'], 'can-become': ['chem.ion', 'chem.molecule'] });
  c('chem.isotope', ['chemical'], 'Atoms of one element with different neutron counts: same chemistry, different mass and stability.', { 'is-a': ['chem.atom'], 'governed-by': ['radioactive.decay'] });
  c('chem.ion', ['chemical'], 'An atom or molecule with charge: the carriers in electrolytes, nerves and batteries.', { 'is-a': ['chem.atom'], 'governed-by': ['coulomb.law', 'nernst'], plays: ['role.electrolyte'] });
  c('bio.ion', ['chemical', 'biological'], 'Na⁺, K⁺, Ca²⁺, Cl⁻, H⁺: the ions whose gradients power cells and signals.', { 'is-a': ['chem.ion'] });
  c('chem.bond', ['chemical', 'mechanism', 'manifold'], 'Electrons shared (covalent), transferred (ionic), delocalised (metallic), or weakly attracted (hydrogen, van der Waals): what holds matter together and sets its properties.', { 'governed-by': ['schrodinger', 'coulomb.law'], 'varies-by': ['param.bond-type', 'param.bond-energy'], enables: ['chem.molecule', 'material.metal', 'material.ceramic'] });
  c('chem.molecule', ['chemical', 'manifold'], 'Atoms bonded into a unit with a shape: from H₂ to a protein.', { 'has-part': ['chem.atom', 'chem.bond', 'chem.functional-group'], 'governed-by': ['schrodinger', 'boltzmann.distribution'], 'produced-by': ['chem.reaction'], 'in-view': ['view.chemical', 'view.molecular'] });
  c('chem.functional-group', ['chemical', 'manifold'], 'A few atoms that react the same way wherever they are: hydroxyl, carbonyl, carboxyl, amine, amide, ester, double bond, ring.', { 'part-of': ['chem.molecule'], 'governed-by': ['arrhenius'] }, CLAYDEN);
  c('chem.polymer', ['chemical', 'material', 'manifold'], 'A chain of repeated units: thousands of monomers bonded; plastics, rubbers, fibres, proteins, DNA, cellulose.', { 'is-a': ['chem.macromolecule'], 'has-part': ['chem.monomer'], 'produced-by': ['process.polymerization'], 'can-become': ['material.polymer'], 'governed-by': ['arrhenius'] }, CLAYDEN);
  c('chem.macromolecule', ['chemical'], 'A molecule of thousands of atoms.', { 'is-a': ['chem.molecule'] });
  c('chem.monomer', ['chemical'], 'The unit a polymer repeats: ethylene, lactic acid, an amino acid.', { 'can-become': ['chem.polymer'] }, CLAYDEN);
  c('process.polymerization', ['process', 'constructor'], 'Monomers joined into chains by addition (a radical opening double bonds) or condensation (small molecules lost): the constructor of plastics.', { produces: ['chem.polymer', 'material.polymer', 'material.pla', 'material.abs'], requires: ['chem.monomer', 'chem.catalyst', 'machine.reactor'], 'governed-by': ['arrhenius'], plays: ['role.constructor'] }, CLAYDEN);
  c('chem.crystal', ['chemical', 'geometry'], 'Atoms in a repeating lattice: 14 Bravais lattices; grains, defects and dislocations set strength.', { 'governed-by': ['hall-petch', 'bragg.law'], 'has-part': ['chem.unit-cell', 'chem.dislocation', 'chem.grain-boundary'], 'in-view': ['view.solid-state', 'view.materials'] }, KITTEL);
  c('chem.dislocation', ['chemical', 'phenomenon'], 'A line defect whose motion is plastic flow: strength is what stops it moving.', { 'part-of': ['chem.crystal'], 'governed-by': ['hall-petch'], enables: ['failure.overload', 'process.forging'] }, KITTEL);
  c('chem.solution', ['chemical'], 'A solute dispersed in a solvent at the molecular scale: salt water, acid, electrolyte.', { 'has-part': ['chem.solvent', 'chem.solute'], 'governed-by': ['fick.diffusion', 'nernst'] });
  c('chem.mixture', ['chemical'], 'Substances together without reacting: alloys, air, concrete, blood.', {});
  c('chem.reaction', ['chemical', 'process', 'transformation', 'manifold'], 'Bonds broken and made: reactants to products, with an energy change and a rate set by a barrier.', { 'governed-by': ['arrhenius', 'conservation.mass', 'conservation.energy', 'le-chatelier', 'gibbs.energy'], 'has-part': ['chem.reaction-mechanism'], 'varies-by': ['param.rate', 'param.enthalpy', 'param.equilibrium'], 'improved-by': ['chem.catalyst'], 'in-view': ['view.chemical', 'view.energetic'] });
  c('chem.reaction-mechanism', ['chemical', 'mechanism'], 'The sequence of elementary steps: which bond breaks first, through what intermediate.', { 'part-of': ['chem.reaction'] }, CLAYDEN);
  c('chem.catalyst', ['chemical', 'component'], 'A substance that speeds a reaction and is not consumed: a lower barrier by another path; platinum, enzymes, zeolites.', { 'governed-by': ['arrhenius'], 'interacts-with': ['chem.reaction'], 'analogous-to': [['bio.enzyme', 'a protein catalyst']], plays: ['role.catalyst'] });
  c('chem.solvent', ['chemical'], 'What a solute dissolves in: water, alcohols, hydrocarbons, carbonates.', {});
  c('chem.acid', ['chemical'], 'A proton donor (or an electron-pair acceptor): sulphuric in batteries, hydrochloric in the stomach, nitric in explosives.', { 'governed-by': ['nernst'], 'interacts-with': ['chem.base', 'material.metal'], enables: ['failure.corrosion', 'process.etching'] });
  c('chem.base', ['chemical'], 'A proton acceptor: hydroxides, ammonia, amines.', { 'interacts-with': ['chem.acid'] });
  c('chem.redox', ['chemical', 'mechanism'], 'Electrons transferred between species: oxidation and reduction, the basis of combustion, respiration, corrosion and every battery.', { 'is-a': ['chem.reaction'], 'governed-by': ['nernst', 'faraday.electrolysis'], enables: ['cell.electrochemical', 'failure.corrosion', 'bio.metabolism', 'chem.combustion'] }, BARD);
  c('chem.electrochemistry', ['chemical', 'mechanism'], 'Redox at an electrode: a voltage from a reaction, or a reaction from a voltage.', { 'is-a': ['chem.redox'], enables: ['cell.electrochemical', 'process.plating', 'process.anodizing', 'convert.electrical.chemical', 'convert.chemical.electrical'], 'governed-by': ['nernst', 'faraday.electrolysis', 'butler-volmer'] }, BARD);
  c('chem.combustion', ['chemical', 'process'], 'Fuel oxidised fast with heat and light: 43 MJ/kg for hydrocarbons, the engine\'s and the furnace\'s heat.', { 'is-a': ['chem.redox'], transforms: ['convert.chemical.thermal'], requires: ['chem.fuel', 'element.oxygen'], produces: ['chem.carbon-dioxide', 'element.water', 'heat'], 'governed-by': ['conservation.energy', 'arrhenius'], enables: ['engine.internal-combustion', 'machine.furnace', 'convert.hydrocarbon.electrical'] });
  c('chem.phase-transition', ['chemical', 'phenomenon', 'transformation'], 'Solid to liquid to gas, and crystal to crystal: latent heat absorbed or given at a fixed temperature.', { 'governed-by': ['clausius-clapeyron', 'heat.capacity'], enables: ['process.casting', 'process.welding', 'phase.liquid'], 'in-view': ['view.thermal'] });
  c('chem.corrosion', ['chemical', 'process', 'failure'], 'A metal returning to its oxide by electrochemistry in water and air: rust at 0.1 mm a year on bare steel; stopped by coatings, passivation, sacrificial anodes.', { 'is-a': ['chem.electrochemistry', 'failure.corrosion'], 'interacts-with': ['material.steel', 'material.aluminium-alloy', 'screw'], 'prevented-by': ['process.plating.zinc', 'process.anodizing', 'material.stainless', 'process.powder-coating'], 'governed-by': ['nernst'] }, BARD);
  for (const [id, says] of [['chem.glucose', 'C₆H₁₂O₆: the sugar cells burn, 16 MJ/kg.'], ['chem.carbon-dioxide', 'CO₂: combustion\'s and respiration\'s product, photosynthesis\'s input.'], ['element.water', 'H₂O: the solvent of life, 4186 J/kg K, a dipole, ice that floats.'], ['chem.oxygen', 'O₂: a fifth of the air, the oxidant.'], ['chem.ethanol', 'C₂H₅OH: fuel, solvent, product of fermentation.'], ['chem.methane', 'CH₄: natural gas, 50 MJ/kg, made by archaea.'], ['chem.calcium-carbonate', 'CaCO₃: shell, limestone, marble, chalk; cement\'s source.'], ['chem.fuel', 'A substance oxidised for its energy: hydrocarbons, hydrogen, wood, glucose.'], ['chem.nutrient', 'What an organism takes in to build itself.'], ['chem.silica', 'SiO₂: sand, quartz, glass, the oxide of a chip.']] as [string, string][]) c(id, ['chemical'], says, { 'is-a': ['chem.molecule'] }, CRC);
  p.link('chem.fuel', { plays: ['role.fuel'], 'is-a': ['store.energy.chemical'] });
  // physics: laws that exist in the engine, plus the ones the seeds cite
  for (const l of LAWS) { p.e(l.id, ['law'], l.statement, { source: l.source, names: [l.name], domains: ['physics'] }); p.link(l.id, { 'in-view': [viewOfDomain(l.domain)] }, l.source); }
  const extra: [string, string, string, string[], Source][] = [
    ['faraday.induction', 'Faraday\'s law of induction', 'A changing magnetic flux through a loop induces a voltage round it equal to the rate of change: generators, transformers, inductors.', ['transformer', 'generator', 'inductor', 'motor.electric'], GRIFFITHS],
    ['ampere.law', 'Ampère\'s law', 'A current makes a magnetic field round it; N turns make N times the field: electromagnets, motors, inductors.', ['electromagnet', 'winding', 'core.magnetic'], GRIFFITHS],
    ['lenz.law', 'Lenz\'s law', 'An induced current opposes the change that made it: eddy brakes, the inductor\'s inertia, the generator\'s load torque.', ['brake.eddy-current', 'inductor', 'generator'], GRIFFITHS],
    ['maxwell.equations', 'Maxwell\'s equations', 'Four equations for electric and magnetic fields and their sources: light is their wave solution; antennas radiate by them.', ['antenna', 'led', 'display'], GRIFFITHS],
    ['coulomb.law', 'Coulomb\'s law', 'Charges attract or repel with a force proportional to their product over the distance squared.', ['chem.bond', 'chem.atom', 'capacitor'], PHYSICS],
    ['kirchhoff.current', 'Kirchhoff\'s current law', 'Current into a node equals current out: charge is conserved.', ['circuit.power-distribution', 'pcb'], PHYSICS],
    ['kirchhoff.voltage', 'Kirchhoff\'s voltage law', 'Voltages round a loop sum to zero.', ['circuit.voltage-divider'], PHYSICS],
    ['shockley.diode', 'Shockley diode equation', 'A junction\'s current rises exponentially with its forward voltage, by kT/q (26 mV) per e-fold.', ['diode', 'transistor', 'led'], KITTEL],
    ['boltzmann.distribution', 'Boltzmann distribution', 'The probability of a state falls as exp(−E/kT): what sets carrier populations, reaction rates, and the folding of proteins.', ['semiconductor.junction', 'chem.reaction', 'bio.protein'], ATKINS],
    ['fick.diffusion', 'Fick\'s law of diffusion', 'Flux is proportional to the concentration gradient; a distance L takes a time of order L²/D.', ['process.doping', 'cell.electrochemical', 'bio.cell-membrane', 'process.heat-treatment.case-hardening'], ATKINS],
    ['nernst', 'Nernst equation', 'An electrode\'s potential shifts from its standard value by (RT/zF) ln of the activity ratio: cell voltages, membrane potentials, corrosion.', ['cell.electrochemical', 'bio.neuron', 'chem.corrosion', 'bio.ion-channel'], BARD],
    ['faraday.electrolysis', 'Faraday\'s laws of electrolysis', 'The mass deposited or dissolved is proportional to the charge passed: plating, refining, batteries.', ['process.plating', 'cell.electrochemical'], BARD],
    ['butler-volmer', 'Butler-Volmer equation', 'Electrode current rises exponentially with overpotential: why a cell\'s voltage sags under load.', ['cell.electrochemical'], BARD],
    ['gibbs.energy', 'Gibbs free energy', 'A reaction goes forward when G falls: enthalpy minus temperature times entropy; its minimum is equilibrium.', ['chem.reaction', 'bio.metabolism'], ATKINS],
    ['le-chatelier', 'Le Chatelier\'s principle', 'An equilibrium pushed shifts to oppose the push.', ['chem.reaction'], ATKINS],
    ['clausius-clapeyron', 'Clausius-Clapeyron relation', 'How a phase boundary\'s pressure rises with temperature, by the latent heat.', ['chem.phase-transition', 'earth.weather'], ATKINS],
    ['ideal.gas', 'Ideal gas law', 'pV = nRT: pressure, volume and temperature of a dilute gas.', ['compressor', 'vessel.cylindrical', 'earth.atmosphere'], PHYSICS],
    ['first.law', 'First law of thermodynamics', 'Energy is conserved: heat in minus work out is the change in internal energy.', ['engine.internal-combustion', 'bio.metabolism'], PHYSICS],
    ['second.law', 'Second law of thermodynamics', 'Entropy of an isolated system never falls: heat flows hot to cold, no engine beats Carnot, no process is reversible.', ['carnot', 'engine.internal-combustion', 'bio.mitochondrion'], PHYSICS],
    ['conservation.energy', 'Conservation of energy', 'Energy changes form and is never made or lost.', ['store.energy', 'bio.human', 'model.physical'], PHYSICS],
    ['conservation.momentum', 'Conservation of momentum', 'The momentum of a closed system is constant: rockets, propellers, collisions.', ['propeller', 'vehicle.rocket'], PHYSICS],
    ['conservation.mass', 'Conservation of mass', 'In a chemical reaction the mass of the products equals that of the reactants.', ['chem.reaction'], PHYSICS],
    ['newton.gravitation', 'Newton\'s law of gravitation', 'Masses attract with a force proportional to their product over the distance squared: orbits, tides, weight.', ['vehicle.spacecraft', 'earth.tide'], PHYSICS],
    ['bernoulli', 'Bernoulli\'s equation', 'Along a streamline of an ideal fluid, pressure plus kinetic plus potential energy per volume is constant: lift, venturis, pumps.', ['pump', 'turbine', 'valve', 'bio.heart'], PHYSICS],
    ['navier-stokes', 'Navier-Stokes equations', 'Momentum conservation of a viscous fluid: every flow, mostly unsolvable by hand.', ['pump', 'bio.blood', 'earth.weather'], PHYSICS],
    ['continuity', 'Continuity equation', 'Mass flow in equals mass flow out of a steady volume: a pipe narrowing speeds its flow.', ['pipe', 'valve'], PHYSICS],
    ['fourier.law', 'Fourier\'s law of conduction', 'Heat flux is conductivity times the temperature gradient.', ['heatsink', 'prop.thermal-conductivity'], INCROPERA],
    ['hall-petch', 'Hall-Petch relation', 'Yield strength rises with the inverse square root of grain size: fine grains are strong.', ['material.steel', 'process.forging', 'chem.dislocation'], KITTEL],
    ['griffith', 'Griffith criterion', 'A crack grows when the energy released exceeds the surface energy made: brittle strength falls with the square root of flaw size.', ['material.ceramic', 'material.glass', 'prop.toughness'], KITTEL],
    ['paris.law', 'Paris law', 'A fatigue crack grows per cycle as a power of the stress intensity range.', ['failure.fatigue', 'prop.fatigue-strength'], KITTEL],
    ['van-der-waals', 'Van der Waals force', 'Fluctuating dipoles attract any two surfaces close enough: gecko feet, condensation, graphite\'s layers.', ['bio.gecko-adhesion', 'adhesive'], ATKINS],
    ['hodgkin-huxley', 'Hodgkin-Huxley model', 'A membrane as a capacitor with voltage-gated sodium and potassium conductances: the action potential.', ['bio.neuron', 'bio.ion-channel'], ATKINS],
    ['cable.equation', 'Cable equation', 'A leaky conductor\'s signal decays with distance and spreads in time: the axon, the undersea cable.', ['bio.axon', 'cable'], PHYSICS],
    ['hill.muscle', 'Hill\'s muscle model', 'A muscle\'s force falls with its shortening speed along a hyperbola; power peaks at a third of maximum speed.', ['bio.skeletal-muscle'], PHYSICS],
    ['hebb.rule', 'Hebbian learning', 'Synapses between cells that fire together strengthen.', ['bio.synapse', 'neural-network'], PHYSICS],
    ['michaelis-menten', 'Michaelis-Menten kinetics', 'An enzyme\'s rate rises with substrate and saturates at its maximum.', ['bio.enzyme', 'bio.metabolism'], ATKINS],
    ['wolff.law', 'Wolff\'s law', 'Bone remodels to the loads it carries: more where stress is high, less where it is low.', ['bio.bone', 'bio.remodelling'], PHYSICS],
    ['allometry', 'Allometric scaling', 'Properties scale as power laws of body mass: metabolic rate as mass to the 3/4, bone cross-section faster than length.', ['bio.animal', 'bio.locomotion'], PHYSICS],
    ['froude', 'Froude number', 'Speed squared over g times leg length: gaits change at the same Froude number across sizes.', ['bio.walking', 'walker'], PHYSICS],
    ['strouhal', 'Strouhal number', 'Flapping frequency times amplitude over speed: swimmers and fliers cruise at 0.2 to 0.4.', ['bio.fish-tail', 'bio.flight'], PHYSICS],
    ['natural.selection', 'Natural selection', 'Heritable variation in reproductive success changes a population over generations.', ['bio.evolution'], PHYSICS],
    ['grashof', 'Grashof condition', 'A four-bar linkage has a fully rotating link when its shortest plus longest link is no longer than the other two together.', ['linkage'], PHYSICS],
    ['grubler', 'Grübler\'s formula', 'A mechanism\'s degrees of freedom from its links and joints.', ['joint.kinematic', 'linkage'], PHYSICS],
    ['betz', 'Betz limit', 'No turbine in open flow can take more than 59.3 % of the wind\'s power.', ['turbine'], PHYSICS],
    ['barkhausen', 'Barkhausen criterion', 'A loop oscillates when its gain is one and its phase shift a multiple of 360°.', ['circuit.oscillator'], PHYSICS],
    ['nyquist.stability', 'Nyquist stability criterion', 'A feedback loop is stable when its open-loop response does not encircle −1: gain and phase margins.', ['circuit.feedback-controller', 'bio.homeostasis'], PHYSICS],
    ['shannon.sampling', 'Nyquist-Shannon sampling theorem', 'A signal sampled above twice its highest frequency is recovered exactly.', ['circuit.adc-interface', 'adc'], PHYSICS],
    ['shannon.capacity', 'Shannon capacity', 'A channel carries at most bandwidth times log2(1 + signal/noise) bits a second.', ['network', 'bus', 'circuit.communication-interface'], PHYSICS],
    ['boolean.algebra', 'Boolean algebra', 'AND, OR and NOT over true and false: the algebra every digital circuit computes.', ['gate.logic', 'circuit.logic'], PHYSICS],
    ['computability', 'Church-Turing thesis', 'What is computable is what a Turing machine computes; some problems are not.', ['algorithm'], PHYSICS],
    ['complexity.big-o', 'Asymptotic complexity', 'How time and space grow with input size: the measure of an algorithm.', ['algorithm'], PHYSICS],
    ['amdahl', 'Amdahl\'s law', 'Speed-up from parallelism is bounded by the serial fraction.', ['cpu', 'gpu'], PHYSICS],
    ['cap.theorem', 'CAP theorem', 'A distributed store cannot be consistent, available and partition-tolerant all at once.', ['distributed-system'], PHYSICS],
    ['universal.approximation', 'Universal approximation theorem', 'A network with one hidden layer wide enough approximates any continuous function.', ['neural-network'], PHYSICS],
    ['bayes.theorem', 'Bayes\' theorem', 'Belief updated by evidence in proportion to its likelihood: the filter of every estimator.', ['algorithm.kalman'], PHYSICS],
    ['queueing', 'Little\'s law', 'Items in a system equal arrival rate times time in it.', ['network'], PHYSICS],
    ['planck.energy', 'Planck relation', 'A photon\'s energy is its frequency times Planck\'s constant: colour is energy.', ['led', 'photodiode', 'cell.photovoltaic', 'bio.photosynthesis'], PHYSICS],
    ['snell.law', 'Snell\'s law', 'Light bends at an interface by the ratio of refractive indices: lenses, fibres, the eye.', ['lens', 'bio.eye-camera', 'display'], PHYSICS],
    ['bragg.law', 'Bragg\'s law', 'X-rays reflect from crystal planes at angles set by the spacing: how structure is seen.', ['chem.crystal'], KITTEL],
    ['pauli.exclusion', 'Pauli exclusion principle', 'No two electrons share a state: the shells of the atom, the stiffness of matter.', ['chem.atom'], KITTEL],
    ['schrodinger', 'Schrödinger equation', 'The wave equation of quantum mechanics: orbitals, bands, bonds.', ['chem.atom', 'chem.bond', 'material.semiconductor'], KITTEL],
    ['radioactive.decay', 'Radioactive decay law', 'Unstable nuclei decay at a constant fraction per time: half-lives from microseconds to aeons.', ['chem.isotope'], PHYSICS],
    ['hertz.contact', 'Hertzian contact', 'Two curved elastic bodies pressed together touch over a small area with a peak pressure that rises as the cube root of the load.', ['bearing.ball', 'gear.tooth'], PHYSICS],
    ['tsiolkovsky', 'Rocket equation', 'Velocity gained is exhaust speed times the log of initial over final mass.', ['vehicle.rocket', 'engine.rocket'], PHYSICS],
  ];
  for (const [id, name, says, governs, src] of extra) {
    if (!LAWS.some((l) => l.id === id)) p.e(id, ['law'], says, { source: src, names: [name], domains: ['physics'], unknowns: ['not yet an executable law in laws.ts: cited, not run'] });
    p.link(id, { governs }, src);
  }
  // physics phenomena and the chain law → property → relation → state → transformation → observable → consequence
  for (const [id, says, law, prop, cons] of [
    ['phys.friction', 'Resistance to sliding between surfaces from asperities and adhesion.', 'friction.coulomb', 'prop.friction-coefficient', 'bearing'],
    ['phys.heat', 'Energy in the random motion of molecules, flowing from hot to cold by conduction, convection and radiation.', 'conduction', 'prop.thermal-conductivity', 'heatsink'], ['phys.elasticity', 'Reversible deformation under stress.', 'hooke', 'prop.youngs-modulus', 'spring'],
    ['phys.plasticity', 'Permanent deformation by dislocation motion.', 'hall-petch', 'prop.yield-strength', 'process.forging'], ['phys.fatigue', 'Cracks from repeated stress below yield.', 'paris.law', 'prop.fatigue-strength', 'failure.fatigue'],
    ['phys.heat-conduction', 'Heat carried through matter by phonons and electrons.', 'fourier.law', 'prop.thermal-conductivity', 'heatsink'], ['phys.convection', 'Heat carried by a moving fluid.', 'convection', 'prop.heat-transfer-coefficient', 'fan'],
    ['phys.thermal-radiation', 'Heat emitted as electromagnetic waves by anything above absolute zero.', 'radiation', 'prop.emissivity', 'machine.furnace'], ['phys.electromagnetic-induction', 'A changing field making a voltage.', 'faraday.induction', 'prop.permeability', 'generator'],
    ['phys.electrostatics', 'Forces and fields of charges at rest.', 'coulomb.law', 'prop.permittivity', 'capacitor'], ['phys.magnetism', 'Fields from currents and ordered moments.', 'ampere.law', 'prop.permeability', 'motor.electric'],
    ['phys.fluid-flow', 'Liquids and gases in motion: laminar, turbulent, compressible.', 'navier-stokes', 'prop.viscosity', 'pump'], ['phys.buoyancy', 'The upthrust of displaced fluid.', 'buoyancy', 'prop.density', 'vehicle.ship'],
    ['phys.wave', 'A disturbance travelling without transport of matter: sound, light, water, in a wire.', 'maxwell.equations', 'prop.refractive-index', 'antenna'], ['phys.semiconduction', 'Conduction by few carriers that doping and fields control.', 'shockley.diode', 'prop.band-gap', 'transistor'],
    ['phys.diffusion', 'Random walks carrying matter down a gradient.', 'fick.diffusion', 'prop.diffusivity', 'process.doping'], ['phys.rotation', 'Motion about an axis: inertia, angular momentum, gyroscopes.', 'energy.rotational', 'prop.moment-of-inertia', 'flywheel.disc'],
    ['phys.resonance', 'A system driven at its natural frequency grows large.', 'natural.frequency', 'prop.stiffness', 'failure.resonance'], ['phys.combustion', 'Fast oxidation releasing heat.', 'first.law', 'prop.heating-value', 'engine.internal-combustion'],
  ] as [string, string, string, string, string][]) {
    p.e(id, ['phenomenon'], says, { source: PHYSICS, domains: ['physics'] });
    p.e(prop, 'property', `The property ${id.slice(5)} is measured by.`, { source: PHYSICS });
    p.link(id, { 'governed-by': [law], 'has-property': [prop], enables: [cons], 'in-view': ['view.physics'] }, PHYSICS);
  }
  for (const [id, says] of [['phys.proton', 'A positive nucleon: the count that names the element.'], ['phys.neutron', 'A neutral nucleon: isotopes, fission, moderation.'], ['phys.electron', 'The light, negative particle whose motion is current, whose orbitals are chemistry.'], ['phys.photon', 'The quantum of light: energy by frequency.'], ['phys.plasma', 'A gas of ions and electrons: stars, arcs, fluorescent tubes, the welding arc, fusion.'], ['phys.nucleus', 'Protons and neutrons bound by the strong force: fission and fusion release a million times chemistry\'s energy per mass.'], ['heat', 'Energy in the random motion of molecules: what every loss becomes.'], ['phase.liquid', 'Matter that flows and keeps its volume.']] as [string, string][]) p.e(id, ['phenomenon'], says, { source: PHYSICS, domains: ['physics'] });
  p.link('phys.plasma', { enables: ['weld.mig', 'process.etching', 'display'], 'governed-by': ['maxwell.equations'] }, PHYSICS);
  p.link('phys.nucleus', { 'has-part': ['phys.proton', 'phys.neutron'], enables: ['energy.nuclear'], 'governed-by': ['radioactive.decay'] }, PHYSICS);
  p.link('heat', { 'governed-by': ['second.law', 'heat.capacity'], 'is-a': ['store.energy.thermal'] }, PHYSICS);
  c('chem.unit-cell', ['chemical', 'geometry'], 'The smallest box of a crystal that repeats: cubic, hexagonal, and the rest; its edge is the lattice constant, a few tenths of a nanometre.', { 'governed-by': ['bragg.law'] });
  c('chem.grain-boundary', ['chemical', 'interface'], 'Where two crystals of different orientation meet in a metal: atoms out of place, which stop dislocations (strength) and let atoms diffuse (creep, corrosion).', { 'governed-by': ['hall-petch', 'fick.diffusion'] });
  c('chem.solute', ['chemical'], 'What is dissolved: salt in water, carbon in iron, the minor part of a solution.', { 'governed-by': ['fick.diffusion', 'gibbs.energy'] });
  return p;
}
