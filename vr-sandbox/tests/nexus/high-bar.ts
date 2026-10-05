// Intents with high bars, used as instruments: a printer at speed and precision, a hall that computes, a vessel that
// grows cells. Like the house, the car and the printer, they are wants on regions and an environment, in the person's
// terms; none names a part, a mechanism or a technology. They are chosen far apart so that what stops all of them is a
// distinction the language lacks, never a fix for one of them.

import type { Intent, Region, Want } from '../../src/nexus/want';
import { leaf, type Leaf } from '../../src/nexus/term';
import { printer } from './inventions';

const person = 'the person';
const given = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'given', by: person, grounds });
const site = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'given', by: 'the site', grounds });
const est = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'estimated', grounds });
const want = (id: string, says: string, region: string, sym: string, unit: string, name: string, when: Want['when'], b: { lo?: Leaf; hi?: Leaf; carrier?: string; relativeTo?: string }): Want => ({ id, says, region, quantity: { sym, unit, name, ...(b.carrier ? { carrier: b.carrier } : {}) }, when, by: person, ...(b.lo ? { lo: b.lo } : {}), ...(b.hi ? { hi: b.hi } : {}), ...(b.relativeTo ? { relativeTo: b.relativeTo } : {}) });

/** The printer, its bar raised: a kilogram an hour, twenty micrometres, the largest part in half a day. */
export function fastPrinter(): Intent {
  const p = printer();
  const raise: Record<string, Leaf> = {
    shape: given('tolerance', 2e-5, 'm', 'twenty micrometres'),
    rate: given('rate', 2.24e-7, 'm^3/s', 'a kilogram of PLA an hour, at 1240 kg/m³'),
    'in time': given('half a day', 43200, 's', 'half a day'),
  };
  const says: Record<string, string> = {
    shape: 'the part has the shape I drew, within twenty micrometres',
    rate: 'it makes a kilogram of parts an hour',
    'in time': 'the biggest part within half a day',
  };
  return { ...p, name: 'a fast, precise 3D printer', wants: p.wants.map((w) => (raise[w.id] ? { ...w, says: says[w.id]!, ...(w.lo ? { lo: raise[w.id] } : { hi: raise[w.id] }) } : w)) };
}

/** What a person who wants a great deal of computing wants of the place it is done in. */
export function computeHall(): Intent {
  const regions: Region[] = [
    { id: 'the hall', by: person, environment: false, adjoins: ['outside air', 'the ground', 'the computers'], carriers: {}, extent: { x: null, y: 'H', z: null, plan: 'A', faces: { up: 'outside air', side: 'outside air', down: 'the ground' } }, quantities: {
      A: given('floor area of the hall', 5000, 'm^2', 'a large hall'), H: given('height of the hall', 6, 'm', 'room above the racks'),
    } },
    { id: 'the computers', by: person, environment: false, adjoins: ['the hall'], quantities: {} },
    { id: 'outside air', by: 'the site', environment: true, adjoins: ['the hall', 'the ground', 'the grid'], holds: ['T'], matter: 'air', carriers: { T: 'energy', rho: 'mass of air', cpa: 'energy' },
      properties: { rho: { of: 'momentum', role: 'density' }, cpa: { of: 'energy', role: 'capacity per mass' } }, quantities: {
      T: site('hottest outside air', 35, 'degC', 'the site\'s summer design temperature'), rho: site('density of air', 1.15, 'kg/m^3', 'warm air near sea level'),
      cpa: est('specific heat of air', 1005, 'J/kg K', 'about 1.005 kJ/kg K at constant pressure'),
    } },
    { id: 'the ground', by: 'the site', environment: true, adjoins: ['the hall', 'outside air', 'the grid'], holds: ['v0'], limits: ['qa'], carriers: { qa: 'momentum', v0: 'momentum' }, quantities: {
      v0: site('the ground at rest', 0, 'm/s', 'the frame the site is described in'), qa: site('bearing pressure the ground allows', 150000, 'Pa', 'dense gravel'),
    } },
    { id: 'the grid', by: 'the site', environment: true, adjoins: ['outside air', 'the ground'], holds: ['V'], limits: ['Pmax'], carriers: { V: 'charge', Pmax: 'charge' }, quantities: {
      V: site('voltage of the supply', 13800, 'V', 'a medium-voltage service'), Pmax: site('most power the supply gives', 3e7, 'W', 'thirty megawatts'),
    } },
  ];
  const wants: Want[] = [
    // an operation overwrites what it replaces: at least one bit is erased for each, an estimate the person's words leave open
    want('compute', 'it computes a billion billion operations each second', 'the computers', 'ops', '1/s', 'bits erased per second', 'always', { carrier: 'information', lo: given('operations', 1e18, '1/s', 'a billion billion each second, each erasing at least a bit') }),
    want('remember', 'it remembers what it computes', 'the computers', 'bits', '1', 'bits held', 'always', { carrier: 'information', lo: given('bits', 8e17, '1', 'a hundred petabytes') }),
    want('together', 'any computer answers any other within a microsecond', 'the computers', 'lag', 's', 'time for one computer to hear another', 'always', { carrier: 'information', hi: given('a microsecond', 1e-6, 's', 'a microsecond') }),
    want('cool', 'nothing in it overheats', 'the computers', 'T', 'degC', 'temperature of the hottest part', 'always', { carrier: 'energy', hi: given('hottest', 85, 'degC', 'what silicon is run below') }),
  ];
  return { name: 'a hall that computes', by: person, regions, wants, duration: given('how long', 10 * 3.15576e7, 's', 'ten years') };
}

/** What a person who wants cells grown wants of the vessel they grow in. */
export function cellVessel(): Intent {
  const regions: Region[] = [
    { id: 'the broth', by: person, environment: false, adjoins: ['room air', 'the cells', 'a supply of sugar'], matter: 'water', carriers: { T: 'energy', o: 'amount of oxygen' }, extent: { x: 'L', y: 'L', z: 'L', faces: { up: 'room air', side: 'room air', down: 'the floor' } }, quantities: {
      L: given('size of the vessel', 2, 'm', 'a vessel of eight cubic metres'),
    } },
    { id: 'the cells', by: person, environment: false, adjoins: ['the broth'], carriers: { o: 'amount of oxygen', heat: 'energy', grow: 'mass of cells' }, quantities: {
      Y: est('cell mass made per oxygen taken', 1.0, 'kg/kg', 'aerobic growth on sugar: about a gram of dry cells per gram of oxygen'),
    }, produces: {} },
    { id: 'a supply of sugar', by: 'the site', environment: true, adjoins: ['the broth'], holds: ['s'], carriers: { s: 'mass of sugar' }, quantities: { s: site('sugar available', 1e4, 'kg', 'stores enough') } },
    { id: 'room air', by: 'the site', environment: true, adjoins: ['the broth'], holds: ['T', 'o'], matter: 'air', carriers: { T: 'energy', o: 'amount of oxygen' }, quantities: {
      T: site('room temperature', 20, 'degC', 'a room'), o: site('oxygen in the air', 8.6, 'mol/m^3', 'about 21 % of air at 20 °C'),
    } },
    { id: 'the floor', by: 'the site', environment: true, adjoins: ['the broth'], holds: ['v0'], limits: ['qa'], carriers: { qa: 'momentum', v0: 'momentum' }, quantities: {
      v0: site('the floor at rest', 0, 'm/s', 'the room'), qa: site('bearing the floor allows', 50000, 'Pa', 'a slab on grade'),
    } },
  ];
  const wants: Want[] = [
    want('grow', 'it grows a hundred kilograms of cells a day', 'the cells', 'G', 'kg/s', 'cell mass made per second', 'always', { carrier: 'mass of cells', lo: given('growth', 100 / 86400, 'kg/s', 'a hundred kilograms a day') }),
    want('warm', 'the cells are kept at blood heat', 'the broth', 'T', 'degC', 'temperature of the broth', 'always', { carrier: 'energy', lo: given('warm', 36, 'degC', 'blood heat'), hi: given('not too warm', 38, 'degC', 'blood heat') }),
    want('breathe', 'the cells never lack oxygen', 'the broth', 'o', 'mol/m^3', 'oxygen dissolved in the broth', 'always', { carrier: 'amount of oxygen', lo: given('enough oxygen', 0.02, 'mol/m^3', 'about a tenth of what water holds in air') }),
  ];
  return { name: 'a vessel that grows cells', by: person, regions, wants, duration: given('how long', 3.15576e7, 's', 'a year') };
}
