// Names, said and heard. An id is identity; a human name is a name over it. What Ego says of a thing is its human
// name when it has one, else its id as words without the domain prefix an id carries for uniqueness. What Ego hears
// is resolved the other way: the exact id first (it wins over whatever borrowed the word as a name), then a human
// name, then the usual spellings, then a few words people use for a thing that the index calls otherwise.
import type { Substrate } from './substrate';
import type { Entity } from './model';
import { facesOfOne } from './faces';

const PREFIX = /^(bio|material|process|machine|chem|phys|element|std|failure|role|fn|param|view|circuit|robot|vehicle|earth|energy|tool|block|kind|way|flow|domain|cross|group|scale|observer|sensor|joint) /;

/** How to say an id whose words come out in the wrong order ("motor dc") or stand for a code ("transistor mosfet"): the said layer over the ids. */
export const SAID: Record<string, string> = {
  'motor.electric': 'electric motor', 'motor.dc': 'DC motor', 'motor.stepper': 'stepper motor', 'motor.bldc': 'brushless motor', 'motor.induction': 'induction motor', 'motor.servo': 'servo motor',
  'transistor.mosfet': 'MOSFET', 'transistor.bjt': 'bipolar transistor', 'transistor.igbt': 'IGBT', 'transistor.thin-film': 'thin-film transistor', 'gate.logic': 'logic gate', 'gate.oxide': 'gate oxide', 'driver.ic': 'driver IC', 'memory.flash': 'flash memory', 'memory.sram': 'SRAM', 'memory.dram': 'DRAM', 'storage.disk': 'disk drive',
  'engine.internal-combustion': 'internal combustion engine', 'engine.diesel': 'diesel engine', 'engine.gas-turbine': 'gas turbine', 'engine.rocket': 'rocket engine', 'engine.camshaft': 'camshaft', 'engine.block': 'engine block', 'engine.cylinder': 'engine cylinder',
  'weld.mig': 'MIG weld', 'weld.tig': 'TIG weld', 'grid.mains': 'the mains grid', 'cell.electrochemical': 'electrochemical cell', 'cell.case': 'cell case', 'core.magnetic': 'magnetic core', 'fluid.hydraulic': 'hydraulic fluid', 'oscillator.crystal': 'crystal oscillator', 'stator.wound': 'wound stator', 'rotor.magnet': 'rotor magnet', 'rotor.wound': 'wound rotor', 'rotor.squirrel-cage': 'squirrel-cage rotor', 'rotor.toothed': 'toothed rotor', 'rotor.main': 'main rotor',
  'ceramic.alumina': 'alumina', 'printer.3d': '3D printer', 'substrate.fr4': 'FR-4 board', 'steel.electrical': 'electrical steel', 'piston.rod': 'piston rod', 'piston.ring': 'piston ring', 'capacitor.bus': 'bus capacitor', 'capacitor.bootstrap': 'bootstrap capacitor', 'cylinder.barrel': 'cylinder barrel', 'laser.source': 'laser source',
  'chain.roller': 'chain roller', 'chain.pin': 'chain pin', 'chain.bushing': 'chain bushing', 'chain.link': 'chain link', 'bearing.race': 'bearing race', 'bearing.cage': 'bearing cage', 'bearing.ball-element': 'bearing ball', 'bearing.angular-contact': 'angular-contact bearing', 'bearing.tapered-roller': 'tapered roller bearing', 'bearing.magnetic': 'magnetic bearing', 'bearing.fit': 'press fit',
  'clamp.split': 'split clamp', 'screw.ball': 'ball screw', 'screw.wood': 'wood screw', 'screw.lead': 'lead screw', 'brake.eddy-current': 'eddy-current brake', 'brake.disc': 'brake disc', 'brake.pad': 'brake pad', 'brake.caliper': 'brake caliper', 'metal.fff': 'metal filament printing', 'gear.ring': 'ring gear', 'gear.carrier': 'planet carrier', 'gear.rim': 'gear rim', 'gear.flexspline': 'flexspline', 'gear.wave-generator': 'wave generator', 'gear.bevel': 'bevel gear',
  'membrane.filter': 'filter membrane', 'resist.photo': 'photoresist', 'gas.shielding': 'shielding gas', 'powder.metal': 'metal powder', 'diode.freewheeling': 'freewheeling diode', 'turbine.blade': 'turbine blade', 'composite.carbon-ceramic': 'carbon-ceramic composite', 'electrode.anode': 'anode', 'electrode.cathode': 'cathode', 'electrode.plate': 'electrode plate', 'insert.threaded': 'threaded insert',
  'ecosystem.food-web': 'food web', 'pattern.wax': 'wax pattern', 'dielectric.fluid': 'dielectric fluid', 'beam.i': 'I-beam', 'actuator.voice-coil': 'voice coil', 'actuator.linear': 'linear actuator', 'bath.plating': 'plating bath', 'physics.world': 'the physics world', 'cam.follower': 'cam follower', 'compressor.piston': 'piston compressor', 'conductor.strand': 'conductor strand', 'copper.layer': 'copper layer', 'crimp.barrel': 'crimp barrel',
  'heatsink.tab': 'heatsink tab', 'hull.pressure': 'pressure hull', 'insulation.refractory': 'refractory insulation', 'pulley.toothed': 'toothed pulley', 'coupling.cv': 'CV joint', 'semiconductor.junction': 'p-n junction', 'pump.hydraulic': 'hydraulic pump', 'pump.centrifugal': 'centrifugal pump', 'joint.wire': 'wire joint', 'joint.screwed': 'screwed joint', 'joint.glued': 'glued joint', 'joint.signal': 'signal joint', 'joint.clamp': 'clamp joint', 'joint.motor': 'motor joint', 'joint.servo': 'servo joint',
  'store.energy.chemical': 'chemical energy store', 'store.energy.thermal': 'thermal energy store', 'store.energy.electrochemical': 'electrochemical energy store', 'store.energy.electrostatic': 'electrostatic energy store', 'store.energy.inertial': 'inertial energy store', 'store.energy.elastic': 'elastic energy store', 'store.energy.pneumatic': 'pneumatic energy store', 'store.energy.gravitational': 'gravitational energy store',
  'tube.round': 'round tube', 'tube.square': 'square tube', 'rod.round': 'round bar', 'nut.lead': 'lead-screw nut', 'nut.ball': 'ball nut', 'valve.body': 'valve body', 'valve.seat': 'valve seat', 'valve.stem': 'valve stem', 'tyre.bead': 'tyre bead', 'tyre.belt': 'tyre belt', 'tyre.tread': 'tyre tread', 'track.link': 'track link', 'robot.link': 'robot link', 'robot.foot': 'robot foot', 'robot.structure': 'robot structure', 'vehicle.landing-gear': 'landing gear', 'turbine.nozzle': 'turbine nozzle', 'turbine.rotor': 'turbine rotor',
  'sensor.position': 'position sensor', 'sensor.temperature': 'temperature sensor', 'sensor.compass': 'compass', 'sensor.voltage': 'voltage sensor', 'sensor.interferometer': 'interferometer', 'sensor.pressure': 'pressure sensor', 'sensor.imu': 'inertial measurement unit', 'sensor.accelerometer': 'accelerometer', 'sensor.gyroscope': 'gyroscope', 'sensor.camera': 'camera', 'sensor.thermistor': 'thermistor', 'sensor.encoder': 'encoder',
};

/** The id as words: what a name is when nobody gave one. */
const derived = (e: Entity): string => e.id.replace(/[.-]/g, ' ');

/** The name to say: a human name over the id (one that is not the id as words), else the said layer, else the id as words without its domain prefix. */
export const spokenName = (e: Entity): string => {
  const d = derived(e);
  const human = [e.name, ...e.names].find((n) => !PREFIX.test(n) && n !== d && n.toLowerCase() !== d);
  return (human ?? SAID[e.id] ?? e.name).replace(PREFIX, '');
};

/** "a bearing", "an encoder". */
export const articled = (name: string): string => (/^(?:the|a|an) /i.test(name) ? name : `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`);
export const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Words people use for things the index calls otherwise: a spoken layer over the ids, never the ids themselves. */
const SPOKEN_WORDS: Record<string, string> = {
  heartbeat: 'bio.heart', 'heart beat': 'bio.heart', heart: 'bio.heart', wingbeat: 'bio.insect-wing-hinge', 'wing beat': 'bio.insect-wing-hinge', stride: 'bio.human', step: 'bio.human', human: 'bio.human', person: 'bio.human', me: 'bio.human', 'a person': 'bio.human',
  'atp synthase': 'bio.atp-synthase', 'flagellar motor': 'bio.bacterial-flagellar-motor', cell: 'bio.cell', neuron: 'bio.neuron', muscle: 'bio.skeletal-muscle', virus: 'bio.virus', bacterium: 'bio.bacteria', bacteria: 'bio.bacteria', ribosome: 'bio.ribosome', protein: 'bio.protein', homeostasis: 'bio.homeostasis',
  atom: 'chem.atom', molecule: 'chem.molecule', proton: 'phys.proton', electron: 'phys.electron',
  kart: 'vehicle.car', car: 'vehicle.car', drone: 'vehicle.drone', ship: 'vehicle.ship', aircraft: 'vehicle.aircraft', plane: 'vehicle.aircraft', bike: 'vehicle.bicycle', bicycle: 'vehicle.bicycle',
  motor: 'motor.electric', 'electric motor': 'motor.electric', 'brushless motor': 'motor.bldc', 'stepper motor': 'motor.stepper', servo: 'servo', bearing: 'bearing', pump: 'pump.centrifugal', turbine: 'turbine', spring: 'spring.helical', flywheel: 'flywheel.disc', gear: 'gear.spur', frame: 'frame', lathe: 'machine.lathe', transistor: 'transistor', cpu: 'cpu', chip: 'ic',
  'the earth': 'earth', earth: 'earth', climate: 'earth.climate', weather: 'earth.weather', river: 'earth.river', ocean: 'earth.ocean', tide: 'earth.tide',
};
export const SPOKEN = SPOKEN_WORDS;
for (const [id, said] of Object.entries(SAID)) if (!(said.toLowerCase() in SPOKEN_WORDS)) SPOKEN_WORDS[said.toLowerCase()] = id;

/** The thing some words name, or undefined: the exact id, a human name, the usual spellings, the spoken layer, a prefixed id, the one id ending in the word. */
/** The singular of an English plural: bearings, brushes, bodies, gases. */
export const singular = (w: string): string => w.replace(/(sh|ch|x|ss|z)es$/, '$1').replace(/ies$/, 'y').replace(/([^su])s$/, '$1');

export function findByWords(s: Substrate, words: string): Entity | undefined {
  const w = words.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^(an? |the )/, '');
  if (!w) return undefined;
  const dotted = w.replace(/\s+/g, '.'), dashed = w.replace(/\s+/g, '-');
  const one = singular(w);
  // the thing itself before anything merely indexed by its word: "bearings" is the bearing, not a block's region
  // called bearings
  const all = [...s.entities.values()], plain = (e: Entity) => !/^(?:kind|block|view|cross|fn|role|param|law|scale|observer)\./.test(e.id);
  const exact = s.get(w) ?? s.get(dotted) ?? s.get(one);
  // "weight" is the quantity before the law about it: a word names the thing, the law is of the thing
  if (exact?.kinds.includes('law')) { const qty = all.find((e) => e.kinds.includes('quantity') && (e.name.toLowerCase() === w || e.names.some((n) => n.toLowerCase() === w))); if (qty) return qty; }
  // an id that is also the name of a thing of another sense ("glue": the process and the adhesive) is a word with two
  // meanings, not an identity: nothing is returned, and Ego asks which (native/polysemy.ts)
  if (exact && all.some((e) => e !== exact && plain(e) && (e.name.toLowerCase() === w || e.name.toLowerCase() === one) && !facesOfOne(e.kinds[0] ?? 'thing', exact.kinds[0] ?? 'thing'))) return undefined;
  if (exact) return exact;
  // a described thing whose name is the words, before the kind, block, view and function layers that borrow names
  const named = all.find((e) => plain(e) && e.name.toLowerCase() === w) ?? all.find((e) => plain(e) && e.name.toLowerCase() === one);
  // two described things of different senses with the one name ("broach": the tool and the machine) are asked, not chosen
  if (named && all.some((e) => e !== named && plain(e) && (e.name.toLowerCase() === w || e.name.toLowerCase() === one) && !facesOfOne(e.kinds[0] ?? 'thing', named.kinds[0] ?? 'thing'))) return undefined;
  if (named) return named;
  // a role said as a phrase: "electrical conductor" is role.electrical-conductor; a function: "store energy" is store.energy;
  // a metal's bare name is its family (material.steel, material.copper-alloy), not one alloy of it
  // a word in several namespaces names several things ("current": the quantity, the ocean current, the sensor): no
  // namespace outranks another, so when they are things of different kinds the word is ambiguous and nothing is returned;
  // Ego then asks which (readings in native/polysemy.ts), rather than choosing in silence
  const spaced: Entity[] = [];
  for (const prefix of ['qty.', 'role.', 'fn.', 'bio.', 'material.', 'process.', 'machine.', 'vehicle.', 'robot.', 'chem.', 'circuit.', 'earth.', 'sensor.', 'failure.', 'phys.', 'cross.', 'view.']) { const e = s.get(prefix + dashed) ?? s.get(prefix + dotted); if (e && !spaced.includes(e)) spaced.push(e); }
  if (spaced.length === 1) return spaced[0];
  if (spaced.length > 1) return spaced.every((e) => facesOfOne(e.kinds[0] ?? 'thing', spaced[0]!.kinds[0] ?? 'thing')) ? spaced[0] : undefined;
  const family = s.get(`material.${dashed}-alloy`) ?? s.get(`material.${singular(dashed)}-alloy`);
  if (family) return family;
  // "copper" with no family of its own: the material whose id is the word or begins with it, never a wire of it nor a
  // material whose name merely starts with the word (music is not music wire)
  const material = all.find((e) => e.kinds.includes('material') && (e.id === `material.${dashed}` || e.id.startsWith(`material.${dashed}-`) || e.id.startsWith(`material.${dashed}.`)));
  if (material) return material;
  // a one-word alias that a whole catalogue shares ("drive", "motor" on every variant) is a search token, not a name;
  // an alias that another thing of a different sense also carries ("induction": the law and the motor) is a second meaning
  const direct = s.byWord(w);
  const sharers = direct ? all.filter((e) => e !== direct && [e.name, ...e.names].some((n) => n.toLowerCase() === w)) : [];
  const token = !!direct && direct.name.toLowerCase() !== w && (sharers.length > 1 || sharers.some((e) => !facesOfOne(e.kinds[0] ?? 'thing', direct.kinds[0] ?? 'thing')));
  if (direct && !token) return direct;
  const spoken = SPOKEN[w];
  if (spoken && s.get(spoken)) return s.get(spoken);
  for (const cand of [dotted, dashed, `motor.${w.replace(/^(electric|electrical) motor$/, 'electric')}`]) { if (token && cand === w) continue; const e = s.byWord(cand); if (e) return e; }
  for (const cand of [one, one.replace(/\s+/g, '.'), one.replace(/\s+/g, '-')]) { if (token && (cand === w || cand === one)) continue; const e = s.byWord(cand); if (e) return e; }
  const parts = w.split(' ');
  if (parts.length === 2) { const e = s.get(`${parts[1]}.${parts[0]}`) ?? s.get(`${parts[0]}.${parts[1]}`); if (e) return e; }
  // the last resort: the one entity whose id ends in the word
  const hits = all.filter((e) => plain(e) && !/^(?:kind|block|view|cross|param|scale)\./.test(e.id) && (e.id.endsWith(`.${one}`) || e.id === one || e.id.endsWith(`.${dashed}`) || e.id === dashed));
  return hits.length === 1 ? hits[0] : undefined;
}
