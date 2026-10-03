// Names, said and heard. An id is identity; a human name is a name over it. What Ego says of a thing is its human
// name when it has one, else its id as words without the domain prefix an id carries for uniqueness. What Ego hears
// is resolved the other way: the exact id first (it wins over whatever borrowed the word as a name), then a human
// name, then the usual spellings, then a few words people use for a thing that the index calls otherwise.
import type { Substrate } from './substrate';
import type { Entity } from './model';

const PREFIX = /^(bio|material|process|machine|chem|phys|element|std|failure|role|fn|param|view|circuit|robot|vehicle|earth|energy|tool|block|kind|way|flow|domain|cross|group|scale|observer|sensor|joint) /;

/** The name to say: a human name over the id, else the id as words without its domain prefix. */
export const spokenName = (e: Entity): string => (e.names.find((n) => !PREFIX.test(n) && n !== e.name) ?? e.name).replace(PREFIX, '');

/** "a bearing", "an encoder". */
export const articled = (name: string): string => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
export const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Words people use for things the index calls otherwise: a spoken layer over the ids, never the ids themselves. */
export const SPOKEN: Record<string, string> = {
  heartbeat: 'bio.heart', 'heart beat': 'bio.heart', heart: 'bio.heart', wingbeat: 'bio.insect-wing-hinge', 'wing beat': 'bio.insect-wing-hinge', stride: 'bio.human', step: 'bio.human', human: 'bio.human', person: 'bio.human', me: 'bio.human', 'a person': 'bio.human',
  'atp synthase': 'bio.atp-synthase', 'flagellar motor': 'bio.bacterial-flagellar-motor', cell: 'bio.cell', neuron: 'bio.neuron', muscle: 'bio.skeletal-muscle', virus: 'bio.virus', bacterium: 'bio.bacteria', bacteria: 'bio.bacteria', ribosome: 'bio.ribosome', protein: 'bio.protein', homeostasis: 'bio.homeostasis',
  atom: 'chem.atom', molecule: 'chem.molecule', proton: 'phys.proton', electron: 'phys.electron',
  kart: 'vehicle.car', car: 'vehicle.car', drone: 'vehicle.drone', ship: 'vehicle.ship', aircraft: 'vehicle.aircraft', plane: 'vehicle.aircraft', bike: 'vehicle.bicycle', bicycle: 'vehicle.bicycle',
  motor: 'motor.electric', 'electric motor': 'motor.electric', 'brushless motor': 'motor.bldc', 'stepper motor': 'motor.stepper', servo: 'servo', bearing: 'bearing', pump: 'pump.centrifugal', turbine: 'turbine', spring: 'spring.helical', flywheel: 'flywheel.disc', gear: 'gear.spur', frame: 'frame', lathe: 'machine.lathe', transistor: 'transistor', cpu: 'cpu', chip: 'ic',
  'the earth': 'earth', earth: 'earth', climate: 'earth.climate', weather: 'earth.weather', river: 'earth.river', ocean: 'earth.ocean', tide: 'earth.tide',
};

/** The thing some words name, or undefined: the exact id, a human name, the usual spellings, the spoken layer, a prefixed id, the one id ending in the word. */
export function findByWords(s: Substrate, words: string): Entity | undefined {
  const w = words.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^(an? |the )/, '');
  if (!w) return undefined;
  const dotted = w.replace(/\s+/g, '.'), dashed = w.replace(/\s+/g, '-');
  const direct = s.get(w) ?? s.get(dotted) ?? s.byWord(w);
  if (direct) return direct;
  const spoken = SPOKEN[w];
  if (spoken && s.get(spoken)) return s.get(spoken);
  for (const cand of [dotted, dashed, `motor.${w.replace(/^(electric|electrical) motor$/, 'electric')}`]) { const e = s.byWord(cand); if (e) return e; }
  const singular = w.replace(/s$/, '');
  for (const cand of [singular, singular.replace(/\s+/g, '.'), singular.replace(/\s+/g, '-')]) { const e = s.byWord(cand); if (e) return e; }
  // a role said as a phrase: "electrical conductor" is role.electrical-conductor; a function: "store energy" is store.energy
  for (const prefix of ['role.', 'fn.', 'bio.', 'material.', 'process.', 'machine.', 'vehicle.', 'robot.', 'chem.', 'circuit.', 'earth.', 'sensor.', 'cross.', 'view.']) { const e = s.get(prefix + dashed) ?? s.get(prefix + dotted); if (e) return e; }
  const parts = w.split(' ');
  if (parts.length === 2) { const e = s.get(`${parts[1]}.${parts[0]}`) ?? s.get(`${parts[0]}.${parts[1]}`); if (e) return e; }
  // the last resort: the one entity whose id ends in the word
  const hits = [...s.entities.values()].filter((e) => e.id.endsWith(`.${singular}`) || e.id === singular || e.id.endsWith(`.${dashed}`) || e.id === dashed);
  return hits.length === 1 ? hits[0] : undefined;
}
