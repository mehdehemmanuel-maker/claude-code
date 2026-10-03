// The physical quantities themselves as things: what a number can be of. Each carries its SI unit, so its dimension
// is known to Ego's native language (src/ganglia/native), and the confusions English invites (heat and temperature,
// weight and mass, speed and velocity, energy and power) are told apart by dimension and by what each says, not by
// the word. Sources: the SI Brochure for the base and derived quantities, Young & Freedman for what each is.
import type { Source } from '../../types';
import { Pack, param } from '../dsl';

const YF: Source = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' };
const SI: Source = { cite: 'BIPM, The International System of Units (SI Brochure), 9th ed., 2019', kind: 'standard' };

type Links = Parameters<Pack['link']>[1];
export interface QuantityRow { id: string; name: string; unit: string; says: string; links: Links; source: Source }

/** The rows, kept apart from the pack so that the word of a quantity and its unit are known without building the substrate (native/polysemy.ts). */
export const QUANTITY_ROWS: QuantityRow[] = [];
const q = (id: string, name: string, unit: string, says: string, links: Links = {}, src: Source = YF) => { QUANTITY_ROWS.push({ id, name, unit, says, links, source: src }); };

export function quantities(): Pack {
  const p = new Pack('physics', YF);
  for (const row of QUANTITY_ROWS) {
    p.e(row.id, 'quantity', row.says, { names: [row.name], params: [param('unit', 'SI unit', SI, { values: [row.unit] })], source: row.source });
    p.link(row.id, row.links, row.source);
  }
  return p;
}

// the rows (pushed once at load)
void (() => {
  // base quantities
  q('qty.length', 'length', 'm', 'How far: a base quantity, the metre.', {}, SI);
  q('qty.mass', 'mass', 'kg', 'How much matter: what resists acceleration and what gravity pulls on; a base quantity, the kilogram, the same on the Moon as here.', { 'governed-by': ['conservation.momentum'] });
  q('qty.time', 'time', 's', 'How long: a base quantity, the second.', {}, SI);
  q('qty.current', 'electric current', 'A', 'Charge passing a point each second: a base quantity, the ampere.', { 'governed-by': ['ohm'], 'measured-by': ['sensor.current'] });
  q('qty.temperature', 'temperature', 'K', 'How hot: the state of a body that decides which way heat flows between it and another; a base quantity, the kelvin. Not heat: two bodies at one temperature exchange none.', { 'governed-by': ['second.law', 'heat.capacity'], 'measured-by': ['sensor.temperature'] });
  // energy and its kin
  q('qty.energy', 'energy', 'J', 'The capacity to do work, conserved in every change: kinetic, potential, elastic, thermal, electrical and chemical forms of one quantity, the joule.', { 'governed-by': ['conservation.energy', 'energy.kinetic'] });
  q('heat', 'heat', 'J', 'Energy in transit from a hotter body to a colder one because of their temperature difference, counted in joules. A body does not hold heat; it holds internal energy, and heat is what crosses its boundary.', { 'is-a': ['qty.energy'], 'governed-by': ['first.law', 'second.law', 'fourier.law'] });
  q('qty.work', 'work', 'J', 'Energy transferred by a force acting through a distance.', { 'is-a': ['qty.energy'] });
  q('qty.power', 'power', 'W', 'The rate of energy transfer or of work: joules a second, the watt. Not energy: a kettle of one kilowatt boils the water, and how many joules it took depends on how long it ran.', { 'governed-by': ['power.electric', 'joule'] });
  // force and its kin
  q('qty.force', 'force', 'N', 'A push or pull that changes a body\'s motion or shape: mass times acceleration, the newton.', { 'governed-by': ['hooke', 'friction.coulomb'], 'measured-by': ['sensor.load-cell'] });
  q('qty.weight', 'weight', 'N', 'The force gravity exerts on a mass: mass times the local gravity, in newtons. Not mass: a sixth of it on the Moon, with the same mass.', { 'is-a': ['qty.force'], 'governed-by': ['weight'] });
  q('qty.pressure', 'pressure', 'Pa', 'Force spread over an area: newtons a square metre, the pascal.', { 'governed-by': ['hydrostatic'], 'measured-by': ['sensor.pressure'] });
  q('qty.stress', 'stress', 'Pa', 'Force per area inside a material: the same unit as pressure, carried by a solid in tension, compression, shear or bending.', { 'governed-by': ['stress.axial', 'stress.bending'] });
  q('qty.torque', 'torque', 'N m', 'A force times its arm about an axis: what turns a shaft. The same dimension as energy, and a different thing: a newton-metre of torque does no work until the shaft turns.', { 'governed-by': ['motor.torque'] });
  // motion
  q('qty.speed', 'speed', 'm/s', 'How fast, as a magnitude with no direction: metres a second, relative to a frame.', {});
  q('qty.velocity', 'velocity', 'm/s', 'Speed with a direction: a vector, relative to a frame. A car round a bend at a steady speed has a changing velocity, so it accelerates.', { 'governed-by': ['conservation.momentum'] });
  q('qty.acceleration', 'acceleration', 'm/s^2', 'How fast velocity changes: a vector, metres a second each second.', {});
  q('qty.momentum', 'momentum', 'kg m/s', 'Mass times velocity: conserved when nothing outside pushes.', { 'governed-by': ['conservation.momentum'] });
  q('qty.frequency', 'frequency', 'Hz', 'How many times a second: the hertz.', {});
  // electrical
  q('qty.voltage', 'voltage', 'V', 'Electric potential difference: energy per unit charge, the volt.', { 'governed-by': ['ohm', 'power.electric'] });
  q('qty.charge', 'electric charge', 'C', 'What the field acts on: the coulomb, an ampere for a second.', { 'governed-by': ['coulomb.law'] });
  q('qty.resistance', 'resistance', 'ohm', 'Voltage per current in a conductor: the ohm.', { 'governed-by': ['ohm', 'joule'] });
})();
