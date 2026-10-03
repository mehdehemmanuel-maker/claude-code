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
  t('magnet', ['component'], 'A body with a magnetic field of its own, permanent or from a current: it pulls on iron and on other magnets, by the field squared over the gap area.', { 'governed-by': ['magnetic.pull', 'ampere.law'], 'fails-by': ['failure.demagnetization'] }, HH);
  t('ground', ['environment'], 'The ground under a machine, soil, floor or road: it carries the weight and gives the reaction every push needs, with its own friction and stiffness.', { 'governed-by': ['weight', 'friction.coulomb', 'traction.limit'] });
  t('model.cad', ['signal', 'computation'], 'A CAD model: the geometry of a part as data, from which drawings, toolpaths and simulations are made.', { 'governed-by': ['information.choices'] });
  return p;
}
