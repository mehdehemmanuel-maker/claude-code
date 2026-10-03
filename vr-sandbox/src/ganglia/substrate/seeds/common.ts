// The common things many packs name and none described: generic functions and parts that are the genus of more
// specific ones (a controller before the robot controller, a motor before the DC motor). What an arrow names, the
// index describes (S-6).
import type { Source } from '../../types';
import { Pack, type Links } from '../dsl';

const PAHL: Source = { cite: 'Pahl, Beitz, Feldhusen & Grote, Engineering Design: A Systematic Approach, 3rd ed., Springer 2007', kind: 'textbook' };
const SHIGLEY: Source = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 11th ed., McGraw-Hill 2020', kind: 'textbook' };
const HH: Source = { cite: 'Horowitz & Hill, The Art of Electronics, 3rd ed., Cambridge 2015', kind: 'textbook' };
const HECHT: Source = { cite: 'Hecht, Optics, 5th ed., Pearson 2017', kind: 'textbook' };
const INCROPERA: Source = { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 8th ed., Wiley 2017', kind: 'textbook' };
const CAMPBELL: Source = { cite: 'Urry, Cain, Wasserman, Minorsky & Orr, Campbell Biology, 12th ed., Pearson 2020', kind: 'textbook' };
const HENNESSY: Source = { cite: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., Morgan Kaufmann 2017', kind: 'textbook' };
const KALPAKJIAN: Source = { cite: 'Kalpakjian & Schmid, Manufacturing Engineering and Technology, 8th ed., Pearson 2020', kind: 'textbook' };
const HILL: Source = { cite: 'Hill & Peterson, Mechanics and Thermodynamics of Propulsion, 2nd ed., Addison-Wesley 1992', kind: 'textbook' };

export function common(): Pack {
  const p = new Pack('common', PAHL);
  const fn = (id: string, says: string, links: Links = {}, src: Source = PAHL) => { p.e(id, 'function', says, { source: src }); if (Object.keys(links).length) p.link(id, links, src); };
  const t = (id: string, kinds: Parameters<Pack['e']>[1], says: string, links: Links = {}, src: Source = SHIGLEY) => { p.e(id, kinds, says, { source: src }); if (Object.keys(links).length) p.link(id, links, src); };

  // functions
  fn('fn.move', 'To move: change where a thing is, against inertia, gravity, friction or a fluid; every actuator and every motor does this in the end.', { 'governed-by': ['newton.second', 'friction.coulomb'] });
  fn('fn.heat', 'To heat: raise a temperature by putting energy in faster than it leaves; by Joule, by combustion, by friction.', { 'governed-by': ['joule', 'heat.capacity'] });
  fn('fn.limit.current', 'To limit current: keep a current below what the load or the source can bear, by resistance, by a regulator or by a fuse.', { 'governed-by': ['ohm'] }, HH);
  fn('fn.make.field', 'To make a field: a magnetic field from a current in turns, or an electric field from charge on plates.', { 'governed-by': ['ampere.law', 'coulomb.law'] }, HH);
  fn('fn.divide.voltage', 'To divide a voltage: give a fraction of it from a ratio of resistances or impedances.', { 'governed-by': ['ohm', 'kirchhoff.voltage'] }, HH);
  fn('fn.protect.overvoltage', 'To protect against overvoltage: clamp or divert a voltage above a rating before it reaches what it would break.', { 'governed-by': ['shockley.diode'] }, HH);
  fn('fn.reproduce', 'To reproduce: make a copy of the thing from the thing, with variation.', { 'governed-by': ['natural.selection'] }, CAMPBELL);
  fn('fn.couple.ac', 'To couple AC: pass the changing part of a signal and block the steady part, through a capacitor.', { 'governed-by': ['lumped.time-constant'] }, HH);
  fn('fn.decouple', 'To decouple: hold a supply rail steady against the current pulses of what it feeds, with charge stored next to the load.', { 'governed-by': ['lumped.time-constant'] }, HH);
  fn('fn.transfer.oxygen', 'To transfer oxygen: move it across a membrane down its partial-pressure gradient, lung to blood, blood to cell.', { 'governed-by': ['fick.diffusion'] }, CAMPBELL);
  fn('fn.separate', 'To separate: divide a mixture by a difference between its parts: size, density, boiling point, charge.', { 'governed-by': ['separation.work'] });
  fn('fn.construct', 'To construct: make a thing from parts and stock by processes, in an order.');

  // generic parts and substances
  t('controller', ['component', 'computation'], 'The part that computes commands from measurements and a goal: a microcontroller with its loop, a PLC, a motion controller.', { does: ['fn.control', 'fn.compute'], 'governed-by': ['nyquist.stability'] }, HH);
  t('actuator', ['component', 'mechanism'], 'The part that turns a command into a force or a motion: a motor, a solenoid, a cylinder, a muscle.', { does: ['fn.move'], 'governed-by': ['newton.second'] });
  t('motor', ['component', 'mechanism'], 'A machine that turns energy into motion: electric, hydraulic, pneumatic, combustion; torque against speed is its curve.', { does: ['fn.move'], 'governed-by': ['power.rotary'] });
  t('plate', ['component', 'geometry'], 'Flat stock, thin against its width: it carries load in its plane well and in bending badly unless stiffened.', { 'governed-by': ['stress.bending'] });
  t('rail', ['component', 'geometry'], 'A straight guide a carriage runs along: it carries the load and sets the path; straightness and stiffness are its qualities.', { does: ['fn.guide.motion'], 'governed-by': ['stress.bending'] });
  t('rope', ['component'], 'Fibres or wires twisted into a tension member: strong in pull, nothing in push, and its own friction round a drum holds it.', { does: ['fn.transmit.force'], 'governed-by': ['capstan', 'stress.axial'] });
  t('contact', ['component', 'interface'], 'Where two conductors touch to pass current: pressure, plating and area set its resistance, arcing and wear set its life.', { 'governed-by': ['ohm', 'hertz.contact'], 'fails-by': ['failure.contact-wear', 'failure.contact-welding'] }, HH);
  t('receiver', ['component'], 'What takes a radio signal in and hands its content on, antenna, front end, demodulator: in a remote-controlled machine, the box the servo leads plug into.', { does: ['fn.communicate'], 'governed-by': ['shannon.capacity'] }, HH);
  t('adc', ['component'], 'An analog-to-digital converter: it samples a voltage at a rate and quantises it to bits; Shannon and noise bound its resolution and rate.', { does: ['fn.convert.analog-digital'], 'governed-by': ['shannon.sampling'] }, HH);
  t('grid.mains', ['system'], 'The mains grid: alternating current at 50 or 60 Hz, 120 or 230 V at the socket, from generators synchronised across a continent.', { 'governed-by': ['faraday.induction', 'power.electric'] }, HH);
  t('fluid', ['material'], 'A substance that flows: a liquid or a gas, taking the shape of what holds it, carrying pressure equally in all directions.', { 'governed-by': ['hydrostatic', 'continuity'] });
  t('fluid.hydraulic', ['material'], 'Hydraulic oil: nearly incompressible, so it carries pressure and motion from a pump to a cylinder; its viscosity sets the losses.', { 'is-a': ['fluid'], 'governed-by': ['hydrostatic', 'darcy-weisbach'] });
  t('coolant', ['material'], 'A fluid that carries heat away: water for its heat capacity, oil where water would corrode or conduct, air where nothing else is at hand.', { 'is-a': ['fluid'], 'governed-by': ['heat.capacity', 'convection'] }, INCROPERA);
  t('heater', ['component'], 'A part that makes heat on purpose: a resistance by Joule, a flame, the hot side of a heat pump.', { does: ['fn.heat'], 'governed-by': ['joule'] }, INCROPERA);
  t('heat-exchanger', ['component', 'subsystem'], 'Two fluids passing heat through a wall without mixing: area, conductance and the temperature difference set the rate.', { does: ['fn.transfer.heat'], 'governed-by': ['conduction', 'convection'] }, INCROPERA);
  t('lens', ['component'], 'Glass shaped to bend light to a focus: Snell at each surface, limited by diffraction.', { 'governed-by': ['snell.law', 'diffraction.limit'] }, HECHT);
  t('nozzle', ['component'], 'A narrowing that trades pressure for speed: a jet, a spray, the throat of a rocket.', { 'governed-by': ['bernoulli', 'continuity'] });
  t('die', ['component'], 'The shaped tool a process presses, draws, casts or cuts against: its form is the part\'s negative, and it wears.', { 'fails-by': ['failure.die-wear'] });
  t('package', ['component'], 'The case round a chip: leads out, heat out, moisture and light kept out.', { 'governed-by': ['thermal.resistance.conduction'] }, HH);
  t('leadframe', ['component'], 'The stamped copper frame a chip is bonded to and its leads are cut from.', { 'made-of': ['material.copper-alloy'] }, HH);
  t('bond-wire', ['component'], 'The hair-fine gold or aluminium wire from a chip\'s pad to its lead.', { 'fails-by': ['failure.bond-wire-fatigue'] }, HH);
  t('oscillator.crystal', ['component'], 'A quartz slab ringing at its own frequency, driven and read piezoelectrically: parts per million stable, the clock of nearly everything digital.', { 'governed-by': ['natural.frequency', 'piezo.stroke'] }, HH);
  t('stator.wound', ['component'], 'The stationary wound part of a motor or generator: its coils make the field that turns or is turned against.', { 'governed-by': ['ampere.law', 'faraday.induction'] });
  t('crankshaft', ['component', 'mechanism'], 'The shaft that turns the pistons\' push into rotation through cranks and connecting rods.', { does: ['fn.transmit.torque'], 'governed-by': ['torsion.solid', 'fatigue.endurance.steel'] });
  t('connecting-rod', ['component'], 'The link from piston to crank: in compression on the power stroke, in tension at the top; buckling and fatigue are its enemies.', { 'governed-by': ['buckling.euler', 'fatigue.endurance.steel'] });
  t('piston.rod', ['component'], 'The rod from a piston out of its cylinder: it carries the force and is sealed where it leaves.', { 'governed-by': ['stress.axial', 'buckling.euler'] });
  t('engine.camshaft', ['component', 'mechanism'], 'The shaft of cams that opens the valves in time with the crank, at half its speed in a four-stroke.', { 'governed-by': ['natural.frequency'], 'fails-by': ['failure.follower-jump'] });
  t('bobbin', ['component'], 'The spool a coil is wound on, holding the wire off the core and in shape.', { 'made-of': ['material.polymer'] }, HH);
  t('filament', ['component'], 'A fine wire or thread: a lamp\'s heated tungsten, a printer\'s plastic feedstock, a fibre.', { 'governed-by': ['joule'] });
  t('sensor.position', ['component'], 'A sensor that reads where something is: an encoder, a potentiometer, a Hall element, a resolver.', { does: ['fn.sense'], 'governed-by': ['shannon.sampling'] }, HH);
  t('capacitor.bus', ['component'], 'The capacitor bank across a DC link: it holds the rail steady against the pulses of the inverter.', { does: ['fn.decouple'], 'fails-by': ['failure.dc-link-failure'] }, HH);

  // transformations between energy domains (the bridge names them for the manifolds; here each is described)
  const tr = (id: string, from: string, to: string, says: string) => { p.e(id, 'transformation', says, { source: PAHL }); p.link(id, { transforms: [`domain.${from}`], enables: [to === 'travel' ? 'flow.travel' : `domain.${to}`] }, PAHL); };
  tr('convert.electrical.electrical', 'electrical', 'electrical', 'Electrical to electrical: voltage, current or frequency changed while the energy stays electrical, as a transformer, a rectifier, a bridge or an inverter does.');
  tr('convert.electrical.optical', 'electrical', 'optical', 'Electrical to optical: current across a junction or through a filament becomes light.');
  tr('convert.electrical.translational', 'electrical', 'translational', 'Electrical to translational: a current in a field pushes straight, as a solenoid or a voice coil.');
  tr('convert.optical.electrical', 'optical', 'electrical', 'Optical to electrical: photons freeing carriers in a junction make a current, as a photodiode or a solar cell.');
  tr('convert.optical.chemical', 'optical', 'chemical', 'Optical to chemical: light driving a reaction uphill, as photosynthesis stores it in sugar.');
  tr('convert.chemical.optical', 'chemical', 'optical', 'Chemical to optical: a reaction giving its energy as light, as a firefly or a glow stick.');
  tr('convert.chemical.chemical', 'chemical', 'chemical', 'Chemical to chemical: energy moved from one bond to another, as metabolism carries it from glucose to ATP.');
  tr('convert.chemical.thermal', 'chemical', 'thermal', 'Chemical to thermal: a reaction giving its energy as heat, as combustion does.');
  tr('convert.chemical.rotational', 'chemical', 'rotational', 'Chemical to rotational: fuel burned to push pistons on a crank, or to spin a turbine.');
  tr('convert.chemical.translational', 'chemical', 'translational', 'Chemical to translational: ATP pulling a muscle shorter, or propellant pushing a rocket.');
  tr('convert.chemical.hydraulic', 'chemical', 'hydraulic', 'Chemical to hydraulic: a muscle squeezing a fluid, as the heart pumps blood.');
  tr('convert.rotational.chemical', 'rotational', 'chemical', 'Rotational to chemical: a turning rotor driving a reaction uphill, as ATP synthase does.');
  tr('convert.rotational.hydraulic', 'rotational', 'hydraulic', 'Rotational to hydraulic: a turning impeller or gear set raising a fluid\'s pressure, as a pump.');
  tr('convert.hydraulic.rotational', 'hydraulic', 'rotational', 'Hydraulic to rotational: a pressured or falling fluid turning a wheel, as a turbine or a hydraulic motor.');
  tr('convert.thermal.rotational', 'thermal', 'rotational', 'Thermal to rotational: hot gas expanding through a turbine, bounded by Carnot.');
  tr('convert.pneumatic.translational', 'pneumatic', 'translational', 'Pneumatic to translational: compressed gas pushing a piston.');
  tr('convert.rotational.travel', 'rotational', 'travel', 'Rotational to travel: a turning wheel, track or propeller moving the vehicle it is on, by friction or by thrust.');
  tr('convert.translational.travel', 'translational', 'travel', 'Translational to travel: a body pushing on its medium to move itself, as a tail pushes water.');

  // instruments and tests
  t('instrument.torque-wrench', ['thing'], 'A wrench that clicks or reads at a set torque: preload by the nut-factor relation, with 25 % scatter from friction.', { 'governed-by': ['bolt.torque.nut-factor'] });
  t('instrument.ultrasonic-bolt-gauge', ['thing'], 'A gauge reading a bolt\'s stretch from an ultrasonic pulse\'s round-trip time: preload to a few percent.', { 'governed-by': ['hooke'] });
  t('test.tensile', ['thing'], 'A specimen pulled to fracture at a set rate while load and extension are read: modulus, yield, ultimate strength and elongation from one curve.', { 'governed-by': ['hooke', 'stress.axial'] });
  t('ball', ['component', 'geometry'], 'A sphere: the rolling element of a bearing, the stud of a ball joint, the closer of a ball valve.', { 'governed-by': ['hertz.contact'] });
  t('slider', ['component'], 'The block that slides along a guide in a prismatic joint: it carries the load and sets the travel.', { 'governed-by': ['friction.coulomb'] });
  t('magnet', ['component'], 'A body with a magnetic field of its own, permanent or from a current: it pulls on iron and on other magnets, by the field squared over the gap area.', { does: ['fn.make.field', 'fn.store.magnetic'], 'governed-by': ['magnetic.pull', 'ampere.law'], 'fails-by': ['failure.demagnetization'] }, HH);
  t('ground', ['environment'], 'The ground under a machine, soil, floor or road: it carries the weight and gives the reaction every push needs, with its own friction and stiffness.', { 'governed-by': ['weight', 'friction.coulomb', 'traction.limit'] });
  // the parts, consumables and signals many packs name
  t('cache', ['component', 'computation'], 'A small fast memory holding what the processor used last: a hit in nanoseconds, a miss in hundreds; locality makes it pay.', { does: ['fn.remember'], 'governed-by': ['amdahl'] }, HENNESSY);
  t('assembler', ['computation'], 'A program that turns mnemonic instructions into the bits a processor executes, one to one.', { 'governed-by': ['computability'] }, HENNESSY);
  t('neuron.artificial', ['computation'], 'A weighted sum of inputs passed through a nonlinearity: the unit of a neural network, a caricature of the real one.', { 'governed-by': ['universal.approximation'] }, HENNESSY);
  t('combustor', ['component'], 'The chamber where fuel burns in a steady flow: air in, the flame held by a recirculation, hot gas out to the turbine or the nozzle.', { 'governed-by': ['arrhenius', 'first.law'], 'fails-by': ['failure.overheating'] }, HILL);
  t('fuel-injector', ['component', 'mechanism'], 'A valve that meters fuel into air as a fine spray, opened by a solenoid or a piezo for a millisecond at a time.', { 'governed-by': ['bernoulli'], 'has-part': ['solenoid', 'nozzle'] }, HILL);
  t('turbopump', ['component', 'mechanism'], 'A pump driven by its own small turbine: in a rocket it feeds propellant at hundreds of bar, tens of megawatts in a box the size of a bucket.', { 'has-part': ['pump', 'turbine'], 'governed-by': ['bernoulli', 'power.rotary'] }, HILL);
  t('aileron', ['component'], 'A hinged flap at the wing\'s trailing edge: one deflected up and the other down, they roll the aircraft.', { 'governed-by': ['drag.aero'] }, HILL);
  t('ballast-tank', ['component'], 'A tank a submarine floods to sink and blows with air to rise: its buoyancy set by what it holds.', { 'governed-by': ['buoyancy'] });
  t('cylinder.barrel', ['component'], 'The honed tube a piston runs in: its bore and finish set the seal\'s life and the leakage.', { 'governed-by': ['stress.hoop'], 'made-of': ['material.steel'] });
  t('pipe', ['component', 'geometry'], 'A tube carrying a fluid: its diameter and roughness set the pressure lost per metre, by Darcy and Weisbach.', { does: ['fn.contain.pressure'], 'governed-by': ['darcy-weisbach', 'stress.hoop'] });
  t('gear.ring', ['component'], 'The internal gear of a planetary set: its teeth point inward, and the planets roll inside it.', { 'is-a': ['gear'] });
  t('beam.i', ['component', 'geometry'], 'An I-section beam: flanges far from the axis carry the bending, a thin web the shear; the stiffest use of metal for its weight.', { 'is-a': ['kind.beam.i'], 'governed-by': ['stress.bending'] });
  t('bearing.angular-contact', ['component'], 'A ball bearing whose races are offset so the balls carry thrust as well as radial load; paired to take both directions and to preload a spindle.', { 'is-a': ['bearing'] });
  t('bimetal', ['component'], 'Two metals bonded as a strip: they expand differently, so it bends with temperature; the breaker\'s and the thermostat\'s sensor.', { does: ['fn.sense'], 'governed-by': ['thermal.expansion'] }, HH);
  t('arc-chute', ['component'], 'Stacked steel plates in a breaker that split and cool the arc as the contacts open, until it cannot restrike.', { 'governed-by': ['joule'] }, HH);
  t('armature', ['component'], 'The moving iron of a relay, or the wound rotor of a motor: what the field pulls on.', { 'governed-by': ['magnetic.pull'] }, HH);
  t('rotor.magnet', ['component'], 'The rotor of a brushless motor: permanent magnets on or in a steel core that the stator\'s rotating field drags round.', { 'has-part': ['magnet'], 'governed-by': ['lorentz.force'] }, HH);
  t('actuator.voice-coil', ['component', 'mechanism'], 'A coil in a magnet\'s gap, pushed by its current: the disk head\'s arm, the loudspeaker cone; fast and direct.', { 'is-a': ['actuator'], 'governed-by': ['lorentz.force'] }, HH);
  t('backlight', ['component'], 'LEDs along a display\'s edge and a light guide spreading them evenly behind the panel.', { does: ['fn.emit.light'] }, HH);
  t('sensor.temperature', ['component'], 'A thermistor, a thermocouple, an RTD or a silicon diode: a resistance, a voltage or a junction drop that reads temperature.', { does: ['fn.sense'], 'governed-by': ['seebeck', 'copper.tempco'] }, HH);
  t('insulation', ['material'], 'What keeps charge where it belongs or heat from leaving: PVC, enamel, mica, glass wool; rated by breakdown field and by conductivity.', { 'governed-by': ['conduction', 'coulomb.law'], 'fails-by': ['failure.insulation-breakdown'] }, HH);
  t('signal.pwm', ['signal'], 'Pulse-width modulation: a fixed-frequency square wave whose on-fraction carries the value; a servo reads the pulse width, a motor the average.', { 'governed-by': ['shannon.sampling'] }, HH);
  t('substrate.fr4', ['material'], 'Glass-fibre cloth in flame-retardant epoxy: the board most circuits are built on, 1.6 mm thick, copper on both faces.', { 'is-a': ['material.composite'] }, HH);
  t('laser.source', ['component'], 'A gain medium between mirrors pumped above threshold, fibre, diode or CO₂: kilowatts in a spot a tenth of a millimetre wide.', { 'governed-by': ['planck.energy', 'diffraction.limit'] }, KALPAKJIAN);
  t('membrane.filter', ['component'], 'A sheet with pores of a set size: what is smaller passes, what is larger stays; pressure drives it.', { does: ['fn.filter', 'fn.separate'], 'governed-by': ['darcy-weisbach'] });
  t('etchant', ['material'], 'A liquid that dissolves what the mask does not cover: ferric chloride on copper, hydrofluoric acid on silica.', { 'governed-by': ['nernst'] }, KALPAKJIAN);
  t('resist.photo', ['material'], 'A polymer that changes solubility where light strikes it: the mask is printed in it, developed, and the pattern etched through.', { 'governed-by': ['planck.energy'] }, KALPAKJIAN);
  t('flux', ['material'], 'A chemical that cleans oxide off metal as it is heated so that solder or braze can wet it: rosin, acids, borax.', { 'governed-by': ['young.contact'] }, KALPAKJIAN);
  t('gas.shielding', ['material'], 'Argon, helium or carbon dioxide flowed over a weld pool to keep the air off it: no oxygen, no nitrogen, no porosity.', { 'governed-by': ['buoyancy'] }, KALPAKJIAN);
  t('powder.metal', ['material'], 'Metal as particles of tens of micrometres, gas-atomised from a melt: the feedstock of sintering and of powder-bed printing.', { 'produced-by': ['process.ball-milling'] }, KALPAKJIAN);
  t('bath.plating', ['material'], 'The electrolyte of an electroplating cell: the metal\'s salt in solution with acids and brighteners.', { 'governed-by': ['faraday.electrolysis'] }, KALPAKJIAN);
  t('lever', ['component', 'mechanism'], 'A rigid bar turning on a pivot: force times arm in equals force times arm out, less the pivot\'s friction.', { does: ['fn.transmit.force'], 'governed-by': ['power.linear', 'friction.coulomb'] });
  t('gear.carrier', ['component'], 'The arm of a planetary set that holds the planet gears\' axles: it turns at the output speed with the torque multiplied.', { 'governed-by': ['gear.output.torque'] });
  t('chain.link', ['component'], 'One unit of a roller chain: two plates, a pin, a bushing and a roller, pitch by pitch.', { 'has-part': ['chain.pin', 'chain.bushing', 'chain.roller'], 'governed-by': ['chain.pull'] });
  t('chain.pin', ['component'], 'The hardened pin through a chain\'s plates: it carries the pull in shear and wears as the chain articulates.', { 'governed-by': ['stress.von-mises', 'friction.coulomb'], 'fails-by': ['failure.wear'] });
  t('chain.bushing', ['component'], 'The tube round a chain\'s pin that the roller turns on: the bearing surface of the joint.', { 'governed-by': ['friction.coulomb'], 'fails-by': ['failure.wear'] });
  t('chain.roller', ['component'], 'The ring that rolls onto the sprocket tooth instead of sliding: less wear and noise.', { 'governed-by': ['hertz.contact'], 'fails-by': ['failure.wear'] });
  t('model.cad', ['signal', 'computation'], 'A CAD model: the geometry of a part as data, from which drawings, toolpaths and simulations are made.', { 'governed-by': ['information.choices'] });
  return p;
}
