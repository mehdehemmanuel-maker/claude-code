// Parameters: the axes a thing varies along. Each says what it is and in which unit, so a varies-by arrow lands on a
// described axis (S-6), never on a label. Units are the substrate's own symbols (units.ts).
import type { Source } from '../../types';
import { Pack } from '../dsl';

const PAHL: Source = { cite: 'Pahl, Beitz, Feldhusen & Grote, Engineering Design: A Systematic Approach, 3rd ed., Springer 2007', kind: 'textbook' };
const SHIGLEY: Source = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 11th ed., McGraw-Hill 2020', kind: 'textbook' };
const HH: Source = { cite: 'Horowitz & Hill, The Art of Electronics, 3rd ed., Cambridge 2015', kind: 'textbook' };
const ATKINS: Source = { cite: 'Atkins & de Paula, Physical Chemistry, 11th ed., Oxford 2018', kind: 'textbook' };
const CAMPBELL: Source = { cite: 'Urry, Cain, Wasserman, Minorsky & Orr, Campbell Biology, 12th ed., Pearson 2020', kind: 'textbook' };
const TANENBAUM: Source = { cite: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., Morgan Kaufmann 2017; Goodfellow, Bengio & Courville, Deep Learning, MIT Press 2016', kind: 'textbook' };

export function parameters(): Pack {
  const p = new Pack('parameters', PAHL);
  const pr = (id: string, says: string, unit?: string, src: Source = PAHL) => p.e(id, 'parameter', says, { source: src, params: unit ? [{ sym: 'unit', name: 'unit', values: [unit], of: src }] : undefined });

  // mechanical
  pr('param.active-coils', 'The number of coils of a spring that flex: the rate goes as their inverse.', '-', SHIGLEY);
  pr('param.coil-diameter', 'The mean diameter of a spring\'s coils, m: the rate goes as its inverse cube.', 'm', SHIGLEY);
  pr('param.wire-diameter', 'The diameter of a spring\'s wire, m: the rate goes as its fourth power.', 'm', SHIGLEY);
  pr('param.free-length', 'A spring\'s length with no load on it, m.', 'm', SHIGLEY);
  pr('param.bore', 'The diameter of the hole a hub or a bearing fits a shaft through, m.', 'm', SHIGLEY);
  pr('param.clearance', 'The gap between a shaft and its plain bearing, m: the room for the oil film.', 'm', SHIGLEY);
  pr('param.pv-limit', 'The pressure times sliding speed a plain bearing bears without overheating, Pa m/s.', 'Pa m/s', SHIGLEY);
  pr('param.module', 'A gear\'s tooth size: pitch diameter over tooth count, m; gears mesh only at the same module.', 'm', SHIGLEY);
  pr('param.tooth-count', 'The number of teeth on a gear: ratios are ratios of tooth counts.', '-', SHIGLEY);
  pr('param.face-width', 'The width of a gear\'s teeth along the axis, m: load capacity goes with it.', 'm', SHIGLEY);
  pr('param.pressure-angle', 'The angle of a gear tooth\'s line of action, usually 20°, rad.', 'rad', SHIGLEY);
  pr('param.helix-angle', 'The angle of a helical gear\'s teeth to its axis, rad: smoother and quieter, with a thrust load.', 'rad', SHIGLEY);
  pr('param.torque-rating', 'The torque a coupling transmits continuously, N m.', 'N m', SHIGLEY);
  pr('param.torsional-stiffness', 'The torque per radian of twist a coupling has, N m/rad.', 'N m/rad', SHIGLEY);
  pr('param.misalignment-allowed', 'The angular, parallel and axial offset a coupling takes up without damage, rad and m.', undefined, SHIGLEY);
  pr('param.degrees-of-freedom', 'The independent ways a joint lets its parts move, 1 to 6.', '-', SHIGLEY);
  pr('param.surface-finish', 'The roughness of a surface, Ra in m: it sets friction, fatigue and seal life.', 'm', SHIGLEY);
  pr('param.width', 'How wide a thing is, m; for a neural network, the units in a layer.', 'm');
  pr('param.mass', 'How much matter a thing has, kg.', 'kg');
  pr('param.power', 'The rate a thing delivers or dissipates energy, W.', 'W');
  pr('param.range', 'The span a sensor reads, or how far a vehicle goes on a full tank or charge.');
  pr('param.medium', 'What a vehicle moves through or on: road, rail, water, air, space.');
  pr('param.max-temperature', 'The hottest a thing works at before it degrades, K.', 'K');
  pr('param.viscosity', 'A fluid\'s resistance to shear, Pa s.', 'Pa s', SHIGLEY);
  pr('param.base-oil', 'The oil a grease or a lubricant is built on, mineral, synthetic ester, PAO, silicone: it sets viscosity and temperature range.', undefined, SHIGLEY);
  pr('param.thickener', 'What holds the oil in a grease: lithium soap, calcium, polyurea, clay.', undefined, SHIGLEY);
  pr('param.chemistry', 'The reacting pair a battery or an adhesive is built on: lead-acid, lithium iron phosphate, epoxy, cyanoacrylate.');
  pr('param.cure', 'How an adhesive sets, by solvent loss, moisture, heat, light or a second part, and how long it takes.');
  pr('param.tolerance', 'How far a value may stray from its nominal, as a fraction.', '-');

  // electrical
  pr('param.voltage', 'The voltage a thing works at or is rated for, V.', 'V', HH);
  pr('param.current', 'The current a thing carries or is rated for, A.', 'A', HH);
  pr('param.resistance', 'Voltage per ampere, Ω.', 'ohm', HH);
  pr('param.capacitance', 'Charge stored per volt, F.', 'F', HH);
  pr('param.inductance', 'Flux linkage per ampere, H.', 'H', HH);
  pr('param.frequency', 'The cycles per second a thing works at, Hz.', 'Hz', HH);
  pr('param.bandwidth', 'The range of frequencies a thing passes or responds to, Hz.', 'Hz', HH);
  pr('param.gain', 'Output over input: an amplifier\'s voltage ratio, a controller\'s proportional term, an antenna\'s directivity.', '-', HH);
  pr('param.input-impedance', 'What a circuit\'s input looks like to what drives it, Ω.', 'ohm', HH);
  pr('param.class', 'An amplifier\'s class, A, B, AB, D: where in the cycle its transistors conduct, and so its efficiency.', undefined, HH);
  pr('param.tempco', 'How much a value changes per kelvin, 1/K.', '1/K', HH);
  pr('param.package', 'The case a component comes in, through-hole, surface-mount sizes, power packages: it sets footprint and heat path.', undefined, HH);
  pr('param.dielectric', 'The insulator between a capacitor\'s plates, ceramic class, film, electrolytic, tantalum: it sets stability and loss.', undefined, HH);
  pr('param.esr', 'A capacitor\'s equivalent series resistance, Ω: its loss and its ripple heating.', 'ohm', HH);
  pr('param.permeability', 'How much a core multiplies a field, relative to vacuum.', '-', HH);
  pr('param.saturation-flux', 'The flux density a core holds before its permeability collapses, T.', 'T', HH);
  pr('param.core-loss', 'Power lost in a magnetic core by hysteresis and eddies, W/kg at a frequency and flux.', 'W/kg', HH);
  pr('param.remanence', 'The flux density a magnet keeps with no field applied, T.', 'T', HH);
  pr('param.coercivity', 'The field that demagnetises a magnet, A/m.', 'A/m', HH);
  pr('param.grade', 'A magnet\'s grade, N35 to N52 for neodymium: its energy product, kJ/m³.', 'kJ/m^3', HH);
  pr('param.pole-count', 'The number of magnetic poles in a motor: speed per hertz goes as its inverse.', '-', HH);
  pr('param.torque-constant', 'A motor\'s torque per ampere, N m/A, equal to its back-EMF constant in V s/rad.', 'N m/A', HH);
  pr('param.winding-resistance', 'The resistance of a motor\'s winding, Ω: its copper loss is the current squared times it.', 'ohm', HH);
  pr('param.rds-on', 'A MOSFET\'s resistance when fully on, Ω: its conduction loss is the current squared times it.', 'ohm', HH);
  pr('param.gate-charge', 'The charge a MOSFET\'s gate takes to switch, C: the driver\'s current times the switching time.', 'C', HH);
  pr('param.bus-voltage', 'The DC voltage a bridge or an inverter switches, V.', 'V', HH);
  pr('param.switching-frequency', 'How many times a second a converter\'s switches turn on and off, Hz: smaller magnetics against more switching loss.', 'Hz', HH);
  pr('param.dead-time', 'The gap between one switch of a half bridge turning off and the other turning on, s.', 's', HH);
  pr('param.duty-cycle', 'The fraction of each period a switch is on, 0 to 1: a buck converter\'s output is the input times it.', '-', HH);
  pr('param.modulation', 'How an inverter shapes its output: square, sine-weighted PWM, space vector.', undefined, HH);
  pr('param.topology', 'The arrangement of a circuit: half or full bridge, buck or boost, Colpitts or Pierce.', undefined, HH);
  pr('param.ripple', 'The AC left on a rectifier\'s DC, V peak to peak.', 'V', HH);
  pr('param.cutoff', 'The frequency where a filter\'s passband ends, Hz.', 'Hz', HH);
  pr('param.order', 'A filter\'s order: how many poles, and so how steeply it rolls off, 20 dB per decade each.', '-', HH);
  pr('param.response', 'A filter\'s shape: Butterworth flat, Chebyshev steep with ripple, Bessel linear in phase.', undefined, HH);
  pr('param.phase-margin', 'How far a loop\'s phase is from 180° at its crossover frequency, rad: its margin against oscillation.', 'rad', HH);
  pr('param.stability', 'How much an oscillator\'s frequency drifts with temperature and age, as a fraction.', '-', HH);
  pr('param.polarization', 'The orientation of an antenna\'s field: linear vertical or horizontal, circular.', undefined, HH);
  pr('param.rating', 'The current a fuse carries indefinitely without opening, A.', 'A', HH);
  pr('param.breaking-capacity', 'The largest fault current a fuse or a breaker can interrupt safely, A.', 'A', HH);
  pr('param.current-rating', 'The current a connector carries at its allowed temperature rise, A.', 'A', HH);
  pr('param.mating-cycles', 'How many times a connector can be plugged and unplugged before its contacts wear out.', '-', HH);
  pr('param.gauge', 'A wire\'s size by its gauge number, AWG or SWG: a smaller number is a thicker wire.', undefined, HH);
  pr('param.strand-count', 'How many strands a wire is made of: more are more flexible at the same area.', '-', HH);
  pr('param.insulation', 'A wire\'s covering, PVC, PTFE, silicone, enamel: it sets voltage and temperature ratings.', undefined, HH);
  pr('param.temperature-rating', 'The hottest a wire\'s insulation stands continuously, K.', 'K', HH);
  pr('param.capacity', 'The charge a battery delivers from full to empty, A h.', 'A h', HH);
  pr('param.c-rate', 'A battery\'s current as a multiple of the current that empties it in one hour, 1/h.', '1/h', HH);
  pr('param.cycle-life', 'The charge-discharge cycles a battery gives before its capacity falls to 80 %.', '-', HH);
  pr('param.accuracy', 'How close a sensor\'s reading is to the truth, as a fraction of range or in its unit.', '-', HH);
  pr('param.resolution', 'The smallest change a sensor tells apart, in its unit.', undefined, HH);
  pr('param.process-node', 'The size class of a chip\'s transistors, named in nanometres, m.', 'm', HH);
  pr('param.transistor-count', 'How many transistors a chip holds.', '-', HH);

  // computing
  pr('param.architecture', 'The shape of a neural network: layers, their widths, connections, recurrence, attention.', undefined, TANENBAUM);
  pr('param.depth', 'The number of layers in a neural network.', '-', TANENBAUM);
  pr('param.encoding', 'How an instruction set writes its instructions in bits: fixed or variable length, and their fields.', undefined, TANENBAUM);
  pr('param.register-count', 'How many registers an instruction set gives the programmer.', '-', TANENBAUM);
  pr('param.word-size', 'How many bits wide an instruction set\'s registers and operations are.', '-', TANENBAUM);
  pr('param.time-complexity', 'How an algorithm\'s running time grows with its input size.', undefined, TANENBAUM);
  pr('param.space-complexity', 'How an algorithm\'s memory grows with its input size.', undefined, TANENBAUM);

  // chemistry
  pr('param.atomic-number', 'The number of protons in an atom: which element it is.', '-', ATKINS);
  pr('param.isotope', 'Which isotope: the neutron count of an atom, and so its mass and its stability.', undefined, ATKINS);
  pr('param.bond-type', 'Covalent, ionic, metallic, hydrogen or van der Waals: how the atoms are held.', undefined, ATKINS);
  pr('param.bond-energy', 'The energy to break a chemical bond, J/mol.', 'J/mol', ATKINS);
  pr('param.enthalpy', 'The heat a reaction gives or takes at constant pressure, J/mol.', 'J/mol', ATKINS);
  pr('param.equilibrium', 'Where a reaction settles: the ratio of products to reactants it reaches, set by its free energy.', undefined, ATKINS);
  pr('param.rate', 'How fast a reaction proceeds, mol/m³ s, rising with temperature by Arrhenius.', 'mol/m^3 s', ATKINS);

  // biology
  pr('param.body-plan', 'The layout of an animal: symmetry, segments, limbs, where the mouth and the gut are.', undefined, CAMPBELL);
  pr('param.symmetry', 'An animal\'s symmetry: radial, bilateral, none.', undefined, CAMPBELL);
  pr('param.endo-or-exo', 'Whether the skeleton is inside the body or outside it.', undefined, CAMPBELL);
  pr('param.mineral-fraction', 'The share of bone that is mineral, about 65 % by mass: stiffness from it, toughness from the collagen.', '-', CAMPBELL);
  pr('param.porosity', 'The fraction of a solid that is void: cancellous bone 50 to 90 %, cortical 5 to 10 %.', '-', CAMPBELL);
  pr('param.fold', 'The three-dimensional shape a protein chain takes: its function is its fold.', undefined, CAMPBELL);
  pr('param.sequence', 'The order of amino acids in a protein: its fold and its function follow from it.', undefined, CAMPBELL);
  return p;
}
