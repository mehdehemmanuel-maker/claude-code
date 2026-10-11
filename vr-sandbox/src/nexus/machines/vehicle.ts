// A thing that carries a payload, as a point in a want-space (tests/nexus/families.ts explores the space): what the
// payload moves on or through, the source of power it can have, the gravity of the site, its mass, its speed and how
// far it goes. Each medium is stated only by its matter and its state (its temperature against the matter's
// thresholds, its density and viscosity), never by a kind of vehicle.

import type { Intent, Region, Want } from '../ask/want';
import { leaf, type Leaf } from '../lang/term';

export type Medium = 'road' | 'rails' | 'ice' | 'water' | 'under water' | 'air' | 'vacuum';
export type Source = 'charge at the start' | 'fuel at the start' | 'sunlight' | 'a person aboard' | 'wind';
export type Gravity = 'earth' | 'moon' | 'none';
export interface VehiclePoint { medium: Medium; source: Source; gravity: Gravity; mass: number; speed: number; range: number }

export const MEDIA: Medium[] = ['road', 'rails', 'ice', 'water', 'under water', 'air', 'vacuum'];
export const SOURCES: Source[] = ['charge at the start', 'fuel at the start', 'sunlight', 'a person aboard', 'wind'];
export const GRAVITIES: Gravity[] = ['earth', 'moon', 'none'];
export const base: VehiclePoint = { medium: 'road', source: 'charge at the start', gravity: 'earth', mass: 400, speed: 30, range: 400000 };

const person = 'the person';
const given = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'given', by: person, grounds });
const site = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'given', by: 'the site', grounds });
const est = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'estimated', grounds });
const G: Record<Gravity, number> = { earth: 9.80665, moon: 1.62, none: 0 };

/** What the payload moves on or through, as matter in a state; and what lies above or around it. */
function mediumRegions(m: Medium): { regions: Region[]; touches: string[] } {
  const air = (id: string): Region => ({ id, by: 'the site', environment: true, adjoins: [], matter: 'air', holds: ['T', 'v0', 'pa'], carriers: { T: 'energy', v0: 'momentum', pa: 'volume of air', rho: 'mass of air', mu: 'momentum', K: 'momentum' },
    properties: { rho: { of: 'momentum', role: 'density' }, mu: { of: 'momentum', role: 'conductivity' }, K: { of: 'momentum', role: 'stiffness' }, Tf: { of: 'volume of air', role: 'flows above' }, pabs: { of: 'volume of air', role: 'absolute pressure' } },
    quantities: { T: site('temperature of the air', 15, 'degC', 'a mild day'), v0: site('the air at rest', 0, 'm/s', 'still air'), pa: site('pressure of the air', 0, 'Pa', 'the reference'), rho: site('density of the air', 1.2, 'kg/m^3', 'near the surface'), mu: est('viscosity of the air', 1.8e-5, 'Pa s', 'air near 15 °C'), K: est('stiffness of the air under quick compression', 1.42e5, 'Pa', 'the ratio of its heats, 1.4, times 101 kPa'), Tf: est('temperature above which air is a gas', -194, 'degC', 'air boils near 79 K'), pabs: site('pressure of the atmosphere', 101325, 'Pa', 'the standard atmosphere (ISO 2533) at sea level') } });
  const water = (id: string, T: number): Region => ({ id, by: 'the site', environment: true, adjoins: [], matter: 'water', holds: ['T', 'v0', 'p'], carriers: { T: 'energy', v0: 'momentum', p: 'volume of water', rho: 'mass of water', mu: 'momentum', K: 'momentum', Tf: 'energy' },
    properties: { rho: { of: 'momentum', role: 'density' }, mu: { of: 'momentum', role: 'conductivity' }, K: { of: 'momentum', role: 'stiffness' }, Tf: { of: 'volume of water', role: 'flows above' }, Ts: { of: 'momentum', role: 'holds its shape below' }, pabs: { of: 'volume of water', role: 'absolute pressure' } },
    quantities: { T: site('temperature of the water', T, 'degC', 'the site'), v0: site('the water at rest', 0, 'm/s', 'still water'), p: site('pressure at the surface', 0, 'Pa', 'open to the air'), rho: leaf('density of water', 1000, 'kg/m^3', { class: 'measured', source: 'CRC Handbook: 999.97 kg/m³ near 4 °C' }), mu: est('viscosity of water', 1.1e-3, 'Pa s', 'water near 15 °C'), K: leaf('stiffness of water under compression', 2.2e9, 'Pa', { class: 'measured', source: 'CRC Handbook: bulk modulus of water near 20 °C, 2.2 GPa' }), Tf: est('temperature water flows above', 0, 'degC', 'ice melts at 0 °C'), Ts: est('temperature water holds its shape below', 0, 'degC', 'water freezes at 0 °C'), pabs: site('pressure in the water where the payload is', 101325, 'Pa', 'at the surface: the atmosphere\'s') } });
  const solid = (id: string, mu: number, what: string): Region => ({ id, by: 'the site', environment: true, adjoins: [], holds: ['v0'], limits: ['mu'], carriers: { v0: 'momentum', mu: 'momentum' },
    quantities: { v0: site(`${what} at rest`, 0, 'm/s', 'the frame the site is described in'), mu: est(`friction on ${what}`, mu, '1', 'the site\'s surface') } });
  switch (m) {
    case 'road': return { regions: [solid('the ground', 0.7, 'dry asphalt'), air('the air')], touches: ['the ground', 'the air'] };
    case 'rails': return { regions: [solid('the ground', 0.2, 'steel rails'), air('the air')], touches: ['the ground', 'the air'] };
    case 'ice': { const ice = water('the ice', -10); ice.limits = ['muI']; ice.carriers!['muI'] = 'momentum'; ice.quantities['muI'] = est('friction on ice', 0.05, '1', 'ice near -10 °C'); return { regions: [ice, air('the air')], touches: ['the ice', 'the air'] }; }
    case 'water': return { regions: [water('the water', 15), air('the air')], touches: ['the water', 'the air'] };
    case 'under water': return { regions: [water('the water', 15)], touches: ['the water'] };
    case 'air': return { regions: [air('the air')], touches: ['the air'] };
    case 'vacuum': return { regions: [], touches: [] };
  }
}

function sourceRegions(s: Source, payload: Region, around: string[]): Region[] {
  const at = around.length ? around[0]! : 'the payload';
  switch (s) {
    case 'charge at the start': return [{ id: 'a charging point', by: 'the site', environment: true, adjoins: [at], holds: ['V'], limits: ['Pmax'], carriers: { V: 'charge', Pmax: 'charge' }, quantities: { V: site('voltage at the charging point', 240, 'V', 'a charger'), Pmax: site('most power it gives', 7200, 'W', 'a charger') } }];
    case 'fuel at the start': return [{ id: 'a fuel station', by: 'the site', environment: true, adjoins: [at], holds: ['e'], carriers: { e: 'mass of fuel' }, quantities: { e: est('energy in a kilogram of the fuel', 4.6e7, 'J/kg', 'a hydrocarbon fuel, about 43 to 46 MJ/kg') } }];
    case 'sunlight': return [{ id: 'the sky', by: 'the site', environment: true, adjoins: around.length ? around : ['the payload'], carriers: { G: 'light' }, directions: { G: 'from above' }, quantities: { G: site('sunlight', 1000, 'W/m^2', 'clear sky at noon') } }];
    case 'a person aboard': payload.produces = { ...(payload.produces ?? {}), P: est('power a person can keep up', 100, 'W', 'about 100 W for hours') }; payload.carriers = { ...payload.carriers, P: 'momentum' }; return [];
    case 'wind': { const a = around.find((x) => x === 'the air'); if (!a) return []; return [{ id: 'the wind', by: 'the site', environment: true, adjoins: around, carriers: { vw: 'momentum' }, directions: { vw: 'across' }, quantities: { vw: site('speed of the wind over the ground', 8, 'm/s', 'a fresh breeze') } }]; }
  }
}

/** The intent at a point of the space: a payload to be carried far and at a speed, kept from falling, stopped on demand. */
export function vehicle(p: VehiclePoint): Intent {
  const s = Math.cbrt(p.mass / 400);
  const payload: Region = { id: 'the payload', by: person, environment: false, adjoins: [], carriers: { m: 'momentum' }, extent: { x: 'w', y: 'h', z: 'l', faces: {} }, quantities: {
    m: given('mass of what is carried', p.mass, 'kg', 'the payload'), w: given('width what is carried needs', 1.4 * s, 'm', 'in proportion to its mass'), h: given('height it needs', 1.0 * s, 'm', 'in proportion to its mass'), l: given('length it needs', 1.8 * s, 'm', 'in proportion to its mass'),
  } };
  const med = mediumRegions(p.medium);
  payload.adjoins = [...med.touches];
  for (const r of med.regions) r.adjoins = [...new Set([...r.adjoins, 'the payload', ...med.regions.filter((x) => x.id !== r.id).map((x) => x.id)])];
  const [below] = med.touches; const above = med.touches.includes('the air') ? 'the air' : below;
  if (below) payload.extent!.faces = { down: below, up: above!, side: above! };
  const sources = sourceRegions(p.source, payload, med.touches);
  for (const r of sources) for (const a of r.adjoins) { const x = med.regions.find((y) => y.id === a); if (x) x.adjoins.push(r.id); }
  const siteRegion: Region = { id: 'the site', by: 'the site', environment: true, adjoins: [], gravity: 'g', carriers: { g: 'momentum' }, quantities: { g: site('gravity of the site', G[p.gravity], 'm/s^2', p.gravity === 'none' ? 'far from any mass' : `the surface of the ${p.gravity}`) } };
  const want = (id: string, says: string, sym: string, unit: string, name: string, when: Want['when'], b: Partial<Want>): Want => ({ id, says, region: 'the payload', quantity: { sym, unit, name, carrier: 'momentum' }, when, by: person, ...b });
  const ref = med.touches[0];
  const wants: Want[] = [
    want('go far', 'carry it far', 'range', 'm', 'distance it travels before more power is needed', 'by the end', { lo: given('range', p.range, 'm', 'the trip'), ...(ref ? { relativeTo: ref } : {}) }),
    want('at speed', 'carry it at a speed', 'v', 'm/s', 'speed of what is carried', 'on demand', { lo: given('speed', p.speed, 'm/s', 'the trip'), ...(ref ? { relativeTo: ref } : {}) }),
    want('stays up', 'it does not fall or sink', 'sink', 'm', 'how far what is carried falls or sinks', 'always', { hi: given('none', 0.1, 'm', 'a hand\'s breadth'), quantity: { sym: 'sink', unit: 'm', name: 'how far what is carried falls or sinks', carrier: 'momentum', direction: 'vertical' } }),
    want('stops', 'it stops when asked', 'dec', 'm/s^2', 'deceleration of what is carried', 'on demand', { lo: given('deceleration', 2, 'm/s^2', 'a gentle stop'), ...(ref ? { relativeTo: ref } : {}) }),
  ];
  return { name: `a payload of ${p.mass} kg ${p.medium === 'vacuum' ? 'in a vacuum' : p.medium === 'under water' ? 'under water' : p.medium === 'air' ? 'through the air' : `on ${p.medium === 'water' ? 'water' : p.medium}`} at ${p.speed} m/s, ${p.source}, ${p.gravity} gravity`, by: person, regions: [payload, ...med.regions, ...sources, siteRegion], wants, duration: given('how long', 3.15576e8, 's', 'ten years') };
}
