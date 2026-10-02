// Ways: the physical ways to turn one flow into another (working principles, after Pahl & Beitz and Roth's catalogues
// of physical effects). A job like "electric power into travel" has many answers, not one: a motor and a wheel, but
// also a track, legs, a propeller, a winch, a rack, a linear motor laid along a rail, a hub motor whose rotor is the
// wheel, an ion thruster with no wheel at all. Each way says the physics it works by (its laws), what it pushes
// against (the ground, a fluid, a rail, a rope, its own frame, or a reaction mass it carries), roughly where it is
// used, and which building blocks do it. A way with no block yet is physically possible but can't be placed here
// until its parts are catalogued (rule R11): Ego says so rather than pretending.
//
// Ways chain: electric power into heat (Joule) and heat into a stroke (thermal expansion) is a bimetal or a wax motor.
// Any chain, seen whole, is one converter with what it takes and gives: a kart seen whole is a motor (electric in,
// travel out), and a motor opened up is a system of its own (blocks.ts `inside`). The one thing every way from
// electric power to motion needs is a transducer, the motor in the widest sense; everything else depends on what the
// motion pushes against.

import type { Flow } from './blocks';
import { archetypeById, blocksByArchetype } from './blocks';
import type { Source } from './types';

export type Medium = 'ground' | 'fluid' | 'rail' | 'rope' | 'frame' | 'reaction mass';

export interface Way {
  id: string;
  name: string;
  takes: Flow[];
  gives: Flow[];
  /** What it pushes against to make its motion. */
  against?: Medium;
  /** The physics, in a sentence. */
  effect: string;
  laws: string[];
  /** The blocks (blocks.ts archetypes) that do it here; empty when none is catalogued or made yet. */
  embodiedBy: string[];
  /** Roughly where it is used: its stroke, force, speed. */
  range: string;
  /** One part does the whole job (a hub motor is motor, reducer and wheel in one). */
  whole?: boolean;
  source: Source;
}

const PAHL = { cite: 'Pahl, Beitz, Feldhusen & Grote, Engineering Design: A Systematic Approach, 3rd ed., Springer 2007 (working principles)', kind: 'textbook' as const };
const ROTH = { cite: 'Roth, Konstruieren mit Konstruktionskatalogen, 3rd ed., Springer 2000 (catalogues of physical effects)', kind: 'textbook' as const };
const HUGHES = { cite: 'Hughes, Electric Motors and Drives, 4th ed., Newnes 2013', kind: 'textbook' as const };
const BOLDEA = { cite: 'Boldea & Nasar, Linear Electric Actuators and Generators, Cambridge 1997', kind: 'textbook' as const };
const SHIGLEY = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015', kind: 'textbook' as const };
const GILLESPIE = { cite: 'Gillespie, Fundamentals of Vehicle Dynamics, SAE 1992', kind: 'textbook' as const };
const WONG = { cite: 'Wong, Theory of Ground Vehicles, 4th ed., Wiley 2008 (tracked vehicles)', kind: 'textbook' as const };
const LEISHMAN = { cite: 'Leishman, Principles of Helicopter Aerodynamics, 2nd ed., Cambridge 2006 (momentum theory)', kind: 'textbook' as const };
const UCHINO = { cite: 'Uchino, Piezoelectric Actuators and Ultrasonic Motors, Kluwer 1997', kind: 'textbook' as const };
const RAIBERT = { cite: 'Raibert, Legged Robots That Balance, MIT Press 1986', kind: 'textbook' as const };
const GOEBEL = { cite: 'Goebel & Katz, Fundamentals of Electric Propulsion: Ion and Hall Thrusters, JPL / Wiley 2008', kind: 'textbook' as const };
const OTSUKA = { cite: 'Otsuka & Wayman (eds.), Shape Memory Materials, Cambridge 1998; Shigley (thermal expansion)', kind: 'textbook' as const };
const PHYSICS = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' as const };

export const WAYS: Way[] = [
  // ------------------------------------------------------------ electric power into motion: the transducers ("motors")
  {
    id: 'motor.rotary', name: 'Rotary electric motor', takes: ['electric'], gives: ['rotation'], against: 'frame',
    effect: 'Current in a winding across a magnetic field is pushed sideways (Lorentz); at the rotor\'s radius that is torque, and the housing takes the reaction.',
    laws: ['lorentz.force', 'motor.torque', 'motor.back-emf', 'motor.current'], embodiedBy: ['actuation.rotary'],
    range: 'Milliwatts to megawatts; any speed or torque with gearing.', source: HUGHES,
  },
  {
    id: 'motor.hub', name: 'Hub (in-wheel) motor', takes: ['electric'], gives: ['travel'], against: 'ground', whole: true,
    effect: 'A rotary motor turned inside out: its rotor is the wheel, so the Lorentz torque is at the tyre with nothing between.',
    laws: ['lorentz.force', 'motor.torque', 'traction.limit', 'rolling.resistance'], embodiedBy: [],
    range: 'E-bikes, scooters, robots, some cars: tens of watts to tens of kilowatts.', source: HUGHES,
  },
  {
    id: 'motor.linear', name: 'Linear motor', takes: ['electric'], gives: ['travel', 'translation'], against: 'rail', whole: true,
    effect: 'A rotary motor unrolled flat: the Lorentz force acts straight along a track of magnets or a reaction plate, so nothing turns and nothing grips.',
    laws: ['lorentz.force'], embodiedBy: [],
    range: 'Machine-tool stages, maglev and people movers, roller-coaster launches: any length of track.', source: BOLDEA,
  },
  {
    id: 'voice-coil', name: 'Voice coil', takes: ['electric'], gives: ['translation'], against: 'frame',
    effect: 'A coil in a magnet\'s gap, pushed straight along by the Lorentz force, its force proportional to its current.',
    laws: ['lorentz.force'], embodiedBy: [],
    range: 'Millimetres to centimetres of stroke, fast: loudspeakers, disk-drive heads, precision stages.', source: BOLDEA,
  },
  {
    id: 'solenoid', name: 'Solenoid', takes: ['electric'], gives: ['translation'], against: 'frame',
    effect: 'A coil magnetises an iron plunger and the field pulls it into the gap (Maxwell pull); a spring brings it back.',
    laws: ['magnetic.pull'], embodiedBy: [],
    range: 'Millimetres of stroke, its pull falling steeply as the gap opens: locks, valves, relays.', source: BOLDEA,
  },
  {
    id: 'piezo', name: 'Piezoelectric stack', takes: ['electric'], gives: ['translation'], against: 'frame',
    effect: 'A ceramic crystal that grows when a voltage is across it, by its charge constant times the voltage.',
    laws: ['piezo.stroke'], embodiedBy: [],
    range: 'Micrometres of stroke at kilonewtons, in microseconds: positioning, injectors, ultrasonic motors.', source: UCHINO,
  },
  {
    id: 'electrostatic', name: 'Electrostatic actuator', takes: ['electric'], gives: ['translation'], against: 'frame',
    effect: 'Plates at different voltages pull together by the field between them: strong only across tiny gaps.',
    laws: ['electrostatic.pull'], embodiedBy: [],
    range: 'Micrometres: MEMS mirrors and switches, electroadhesive grippers.', source: PHYSICS,
  },
  {
    id: 'joule.heating', name: 'Resistive heating', takes: ['electric'], gives: ['heat'],
    effect: 'Current through a resistance turns all of its power into heat (I² R).',
    laws: ['joule'], embodiedBy: [],
    range: 'Any power: heaters, and the losses in every wire and winding.', source: PHYSICS,
  },
  {
    id: 'thermal.actuator', name: 'Thermal actuator (bimetal, wax, shape-memory wire)', takes: ['heat'], gives: ['translation'], against: 'frame',
    effect: 'A material that grows or changes shape when heated: a bimetal bends, wax swells as it melts, shape-memory wire shortens by a few percent.',
    laws: ['thermal.expansion'], embodiedBy: [],
    range: 'Slow (seconds), small strokes, large forces: thermostats, valves, latches.', source: OTSUKA,
  },
  {
    id: 'ion.thruster', name: 'Electric thruster', takes: ['electric'], gives: ['travel'], against: 'reaction mass', whole: true,
    effect: 'An electric field throws ionised propellant out of the back very fast; the craft moves the other way (momentum), with nothing to push against.',
    laws: ['newton.second'], embodiedBy: [],
    range: 'Millinewtons to newtons, only in vacuum: spacecraft.', source: GOEBEL,
  },
  // ------------------------------------------------------------ other energy into electric power, heat and motion
  {
    id: 'cell.electrochemical', name: 'Electrochemical cell (battery)', takes: ['chemical'], gives: ['electric'],
    effect: 'Two electrodes in an electrolyte react, one giving electrons and the other taking them through the outside circuit: chemical energy out as current.',
    laws: ['lead-acid.ocv', 'energy.electric'], embodiedBy: ['power.store'],
    range: 'Milliwatt-hours to megawatt-hours; lead-acid about 35 Wh/kg, lithium-ion about 150 to 250.', source: { cite: 'Linden & Reddy, Handbook of Batteries, 4th ed., McGraw-Hill 2011', kind: 'handbook' },
  },
  {
    id: 'photovoltaic', name: 'Solar cell', takes: ['light'], gives: ['electric'],
    effect: 'Light frees electrons across a semiconductor junction, which drives them round a circuit.',
    laws: ['pv.power'], embodiedBy: [],
    range: 'About 200 W per square metre of panel in full sun; nothing at night.', source: { cite: 'IEC 60904 (photovoltaic devices)', kind: 'standard' },
  },
  {
    id: 'thermoelectric', name: 'Thermoelectric generator', takes: ['heat'], gives: ['electric'],
    effect: 'Heat flowing through junctions of different semiconductors drives a current (Seebeck): no moving parts, a few percent efficient.',
    laws: ['seebeck', 'carnot'], embodiedBy: [],
    range: 'Milliwatts to hundreds of watts: space probes, waste-heat recovery, wood-stove fans.', source: { cite: 'Rowe (ed.), CRC Handbook of Thermoelectrics, 1995', kind: 'handbook' },
  },
  {
    id: 'heat.engine', name: 'Heat engine', takes: ['heat'], gives: ['rotation'],
    effect: 'A gas heated expands and pushes, cooled shrinks: a cycle that turns part of the heat flowing through it into work, never more than Carnot allows.',
    laws: ['carnot'], embodiedBy: [],
    range: 'Steam and Stirling engines, turbines: watts to gigawatts.', source: { cite: 'Çengel & Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill 2019', kind: 'textbook' },
  },
  {
    id: 'combustion', name: 'Burning a fuel', takes: ['chemical'], gives: ['heat'],
    effect: 'A fuel combines with oxygen and gives its chemical energy out as heat.',
    laws: [], embodiedBy: [],
    range: 'Any power; about 43 MJ/kg for petrol, 16 for wood.', source: PHYSICS,
  },
  {
    id: 'muscle', name: 'Muscle', takes: ['chemical'], gives: ['translation'], against: 'frame',
    effect: 'Myosin heads pull along actin filaments, each step paid for by one ATP: a living linear motor that also grows and heals.',
    laws: [], embodiedBy: [],
    range: 'About 0.3 MPa of stress, 20 to 30% shortening, a quarter of its food energy as work. Living: it can\'t be made here.', source: { cite: 'Alberts et al., Molecular Biology of the Cell, 6th ed., Garland 2014 (muscle contraction)', kind: 'textbook' },
  },
  {
    id: 'light.emit', name: 'Light-emitting diode', takes: ['electric'], gives: ['light'],
    effect: 'Electrons crossing a semiconductor junction drop in energy and give it out as light of one colour.',
    laws: ['power.electric'], embodiedBy: [],
    range: 'Indicators to lighting, a few volts each, a third or more of the power out as light.', source: PHYSICS,
  },
  // ------------------------------------------------------------ information: switching, holding and sensing bits
  {
    id: 'switch.transistor', name: 'Transistor switch (power controlled by a signal)', takes: ['signal'], gives: ['electric'],
    effect: 'A small voltage at a transistor\'s gate lets a large current through it or stops it: a signal controlling power, as a motor controller\'s H-bridge does.',
    laws: ['ohm', 'joule'], embodiedBy: ['power.control'],
    range: 'Milliamps to kiloamps, switched in nanoseconds to microseconds.', source: { cite: 'Mohan, Undeland & Robbins, Power Electronics, 3rd ed., Wiley 2003', kind: 'textbook' },
  },
  {
    id: 'logic.transistor', name: 'Transistor logic', takes: ['signal', 'electric'], gives: ['signal'],
    effect: 'Transistors wired so their outputs drive each other\'s gates make gates, and gates wired back on themselves hold bits (flip-flops): electric power spent each switch.',
    laws: ['cmos.dynamic', 'landauer'], embodiedBy: [],
    range: 'Billions of gates on a chip, switching at gigahertz.', source: { cite: 'Weste & Harris, CMOS VLSI Design, 4th ed., Addison-Wesley 2010', kind: 'textbook' },
  },
  {
    id: 'logic.relay', name: 'Relay logic', takes: ['electric', 'signal'], gives: ['signal'],
    effect: 'An electromagnet pulls a contact closed or open: one circuit switching another, as the first electric computers did.',
    laws: ['magnetic.pull'], embodiedBy: [],
    range: 'Tens of switches a second, each a few watts: slow, loud, easy to see working.', source: { cite: 'Rojas, Konrad Zuse\'s legacy: the architecture of the Z1 and Z3, IEEE Annals of the History of Computing 19(2), 1997', kind: 'textbook' },
  },
  {
    id: 'logic.mechanical', name: 'Mechanical logic (levers and pins)', takes: ['signal', 'translation'], gives: ['signal'],
    effect: 'Each bit a lever resting one way or the other; a push flips it and its flip pushes the next: gates and memory with no electricity, powered by a hand, a weight or a falling ball.',
    laws: ['energy.potential', 'landauer'], embodiedBy: ['logic.bistable'],
    range: 'A few operations a second, each costing millijoules: Zuse\'s Z1 (1938), marble computers.', source: { cite: 'Rojas, Konrad Zuse\'s legacy: the architecture of the Z1 and Z3, IEEE Annals of the History of Computing 19(2), 1997', kind: 'textbook' },
  },
  {
    id: 'sense.strain', name: 'Strain gauge (sensing a force)', takes: ['load'], gives: ['signal'],
    effect: 'A force strains a part, and a foil gauge on it changes its resistance with the strain.',
    laws: ['strain.gauge', 'hooke'], embodiedBy: [],
    range: 'Load cells from grams to hundreds of tonnes.', source: { cite: 'Window (ed.), Strain Gauge Technology, 2nd ed., Elsevier 1992', kind: 'textbook' },
  },
  {
    id: 'sense.thermocouple', name: 'Thermocouple (sensing a temperature)', takes: ['heat'], gives: ['signal'],
    effect: 'Two metals joined make a voltage that grows with the temperature at their junction.',
    laws: ['seebeck'], embodiedBy: [],
    range: 'About −200 to +1250 °C (type K), a few tens of microvolts a kelvin.', source: { cite: 'IEC 60584 (thermocouples)', kind: 'standard' },
  },
  {
    id: 'sense.encoder', name: 'Encoder (sensing a turn)', takes: ['rotation'], gives: ['signal'],
    effect: 'A slotted disc on the shaft interrupts a light or a magnetic field: each pulse a fraction of a turn.',
    laws: [], embodiedBy: [],
    range: 'Tens to millions of counts a turn.', source: PHYSICS,
  },
  // ------------------------------------------------------------ rotation into rotation
  {
    id: 'gear.reduce', name: 'Gear reduction', takes: ['rotation'], gives: ['rotation'], against: 'frame',
    effect: 'Teeth of different counts trade speed for torque by their ratio, less the friction of their mesh.',
    laws: ['gear.output.torque'], embodiedBy: ['transmission.reduce'],
    range: 'Ratios of about 3 to 10 a stage; any power.', source: SHIGLEY,
  },
  {
    id: 'chain.drive', name: 'Chain drive', takes: ['rotation'], gives: ['rotation'], against: 'frame',
    effect: 'A roller chain on two sprockets carries torque between parallel shafts by its pull, the ratio set by their teeth.',
    laws: ['chain.speed', 'chain.pull'], embodiedBy: ['transmission.flexible'],
    range: 'Shafts up to metres apart, slow to moderate speed.', source: SHIGLEY,
  },
  {
    id: 'belt.drive', name: 'Belt drive', takes: ['rotation'], gives: ['rotation'], against: 'frame',
    effect: 'A belt carries torque between pulleys by friction (or teeth), quiet and needing no lubrication.',
    laws: ['belt.speed', 'capstan'], embodiedBy: [],
    range: 'Higher speeds than chain, some slip unless toothed.', source: SHIGLEY,
  },
  // ------------------------------------------------------------ rotation into travel: what the motion pushes against
  {
    id: 'wheel', name: 'Wheel', takes: ['rotation'], gives: ['travel'], against: 'ground',
    effect: 'Torque at the axle is a push at the tyre, by grip: no harder than friction times the weight on it.',
    laws: ['wheel.torque', 'traction.limit', 'rolling.resistance'], embodiedBy: ['transmission.wheel'],
    range: 'Firm ground; the most efficient way over it.', source: GILLESPIE,
  },
  {
    id: 'track', name: 'Track (crawler)', takes: ['rotation'], gives: ['travel'], against: 'ground',
    effect: 'A belt of links laid down in front and picked up behind, spreading the weight over a long contact.',
    laws: ['traction.limit', 'rolling.resistance'], embodiedBy: [],
    range: 'Soft, loose or steep ground, at the cost of more rolling loss.', source: WONG,
  },
  {
    id: 'legs', name: 'Legs', takes: ['rotation', 'translation'], gives: ['travel'], against: 'ground',
    effect: 'Feet placed and pushed against the ground one after another: steps over what a wheel can\'t roll over, but must balance.',
    laws: ['friction.coulomb', 'newton.second'], embodiedBy: [],
    range: 'Rough ground, stairs; several actuators and constant control.', source: RAIBERT,
  },
  {
    id: 'propeller', name: 'Propeller or rotor', takes: ['rotation'], gives: ['travel'], against: 'fluid',
    effect: 'Blades throw fluid backwards; its momentum pushes the craft forwards, more thrust per watt the bigger the disc.',
    laws: ['thrust.ideal-static'], embodiedBy: [],
    range: 'Air (aircraft, drones, airboats) or water (boats).', source: LEISHMAN,
  },
  {
    id: 'paddle', name: 'Paddle wheel', takes: ['rotation'], gives: ['travel'], against: 'fluid',
    effect: 'Paddles push on the water by their drag as they sweep back through it.',
    laws: ['drag.aero'], embodiedBy: [],
    range: 'Slow boats in shallow water.', source: PHYSICS,
  },
  {
    id: 'winch', name: 'Winch (rope drum)', takes: ['rotation'], gives: ['travel', 'translation'], against: 'rope',
    effect: 'A drum winds in a rope anchored ahead: its torque over its radius is the pull.',
    laws: ['wheel.torque', 'capstan'], embodiedBy: [],
    range: 'Lifts, cable cars, hauling: as far as the rope reaches.', source: SHIGLEY,
  },
  {
    id: 'rack.pinion', name: 'Rack and pinion', takes: ['rotation'], gives: ['travel', 'translation'], against: 'rail',
    effect: 'A gear meshing with a toothed bar: torque over the pinion\'s radius is the push, and it can\'t slip.',
    laws: ['wheel.torque', 'gear.output.torque'], embodiedBy: [],
    range: 'Steering, machine axes, cog railways up slopes a wheel would slip on.', source: SHIGLEY,
  },
  // ------------------------------------------------------------ rotation into a stroke
  {
    id: 'lead.screw', name: 'Lead screw or ball screw', takes: ['rotation'], gives: ['translation'], against: 'frame',
    effect: 'A thread turned in a nut drives the nut along by its lead each turn, with great force for little torque.',
    laws: ['screw.force'], embodiedBy: [],
    range: 'Precise strokes of centimetres to metres: jacks, presses, 3D-printer and machine axes.', source: SHIGLEY,
  },
  {
    id: 'crank.slider', name: 'Crank and slider', takes: ['rotation'], gives: ['translation'], against: 'frame',
    effect: 'A crank pin turning on a radius drives a rod back and forth: steady rotation into a reciprocating stroke of twice the radius.',
    laws: ['wheel.torque'], embodiedBy: [],
    range: 'Pumps, saws, presses, engines (the other way round).', source: SHIGLEY,
  },
];

export const wayById = (id: string) => WAYS.find((w) => w.id === id);

/** A way can be built here when every block it needs has catalogued items or is made from the world's stock. */
export function buildable(w: Way): boolean {
  if (!w.embodiedBy.length) return false;
  const have = blocksByArchetype();
  return w.embodiedBy.some((a) => (have[a]?.length ?? 0) > 0 || (archetypeById(a)?.shapes?.length ?? 0) > 0);
}

export interface Concept {
  ways: Way[];
  /** What the last way pushes against. */
  against: Medium | null;
  /** The way that turns electric power into motion: the motor, in the widest sense. */
  transducer: Way | null;
  /** All of it can be placed here now. */
  buildable: boolean;
  /** Ways it needs that have no block here yet. */
  missing: Way[];
}

const MOTION: Flow[] = ['rotation', 'translation', 'travel'];

/**
 * Every way to turn one flow into another, as chains of ways each taking what the one before gives (no way twice),
 * shortest first and, among equals, those that can be built now first. "Electric into travel" gives a wheel and a
 * motor, a track, legs, a propeller, a winch, a rack, a linear motor, a hub motor, a thruster...
 */
export function conceive(from: Flow, to: Flow, maxWays = 3, limit = 24): Concept[] {
  const found: Way[][] = [];
  let frontier: { chain: Way[]; flow: Flow }[] = [{ chain: [], flow: from }];
  for (let depth = 0; depth < maxWays; depth++) {
    const next: typeof frontier = [];
    for (const f of frontier) {
      for (const w of WAYS) {
        if (f.chain.includes(w) || !w.takes.includes(f.flow)) continue;
        // a rotation-into-rotation step only between a source of rotation and its use, never twice in a row
        if (w.takes[0] === 'rotation' && w.gives.length === 1 && w.gives[0] === 'rotation' && f.chain.at(-1)?.gives.every((g) => g === 'rotation') && f.chain.at(-1)?.takes.includes('rotation')) continue;
        const chain = [...f.chain, w];
        if (w.gives.includes(to)) found.push(chain);
        else for (const g of w.gives) next.push({ chain, flow: g });
      }
    }
    frontier = next;
  }
  const concepts = found.map((ways): Concept => {
    const missing = ways.filter((w) => !buildable(w));
    return { ways, against: ways.at(-1)!.against ?? null, transducer: ways.find((w) => w.takes.includes('electric') && w.gives.some((g) => MOTION.includes(g) || g === 'heat')) ?? null, buildable: !missing.length, missing };
  });
  concepts.sort((a, b) => a.ways.length - b.ways.length || Number(b.buildable) - Number(a.buildable));
  return concepts.slice(0, limit);
}

/** The different things a motion can push against, each with its simplest way there: a chain's variety at a glance. */
export function byMedium(concepts: Concept[]): Map<Medium | 'none', Concept[]> {
  const out = new Map<Medium | 'none', Concept[]>();
  for (const c of concepts) { const k = c.against ?? 'none'; (out.get(k) ?? out.set(k, []).get(k)!).push(c); }
  return out;
}

/**
 * A chain seen whole: one converter, taking what its first way takes and giving what its last gives. Every
 * machine is one at its own level: a kart is a motor for travel, a motor a converter of current into torque.
 */
export function asWhole(c: Concept): { takes: Flow[]; gives: Flow[]; against: Medium | null; inside: string[]; says: string } {
  const takes = c.ways[0]!.takes, gives = c.ways.at(-1)!.gives;
  const says = `Seen whole it is one converter: it takes ${takes.join(' or ')} and gives ${gives.join(' and ')}${c.against ? `, pushing against ${c.against === 'reaction mass' ? 'mass it throws away' : `the ${c.against}`}` : ''}. Inside: ${c.ways.map((w) => w.name.toLowerCase()).join(', then ')}.`;
  return { takes, gives, against: c.against, inside: c.ways.map((w) => w.id), says };
}
