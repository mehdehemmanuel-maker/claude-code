// Three intents a person has asked for: what they want of a house, a car and a 3D printer, with the site each one is
// in. They are wants on regions and an environment, in the person's terms; none names a part, a mechanism or how the
// thing works. They are inputs, as anything a person asks is: the tests use them as instruments and the room offers
// them to be generated, and the core never reads them, so it is never taught an invention. The numbers a
// person gives are given; what the site is, the site gives; a property of a thing with no source in the kept data
// is an estimate with its grounds.

import type { Intent, Region, Want } from './want';
import { leaf, type Leaf } from './term';

const person = 'the person';
const given = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'given', by: person, grounds });
const site = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'given', by: 'the site', grounds });
const est = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'estimated', grounds });
const want = (id: string, says: string, region: string, sym: string, unit: string, name: string, when: Want['when'], b: { lo?: Leaf; hi?: Leaf; carrier?: string; relativeTo?: string; condition?: Want['condition']; direction?: 'vertical' | 'across' | 'along' }): Want => ({ id, says, region, quantity: { sym, unit, name, ...(b.carrier ? { carrier: b.carrier } : {}), ...(b.direction ? { direction: b.direction } : {}) }, when, by: person, ...(b.lo ? { lo: b.lo } : {}), ...(b.hi ? { hi: b.hi } : {}), ...(b.relativeTo ? { relativeTo: b.relativeTo } : {}), ...(b.condition ? { condition: b.condition } : {}) });

/** What four people living somewhere for fifty years want of the place they live in. */
export function house(): Intent {
  const regions: Region[] = [
    { id: 'inside', by: person, environment: false, adjoins: ['outside air', 'the ground', 'the people'], carriers: {}, extent: { x: null, y: 'H', z: null, plan: 'Afloor', faces: { up: 'outside air', side: 'outside air', down: 'the ground' } }, quantities: {
      Afloor: given('floor area of the inside', 120, 'm^2', 'what four people need to live in'), H: given('height of the rooms', 2.5, 'm', 'a room a person stands in with room above'),
    } },
    { id: 'the people', by: person, environment: false, adjoins: ['inside', 'outside air'], carriers: { m: 'momentum', walk: 'momentum', heat: 'energy', co2: 'amount of carbon dioxide', vapour: 'amount of water vapour', waste: 'volume of water' }, quantities: {
      n: given('people', 4, '1', 'the household'), m: given('mass of the people', 300, 'kg', 'four people'),
      walk: est('how fast the people walk', 1.2, 'm/s', 'a usual walking speed, about 1.2 m/s'),
    }, produces: {
      heat: est('heat the people give off', 400, 'W', 'about 100 W a person at rest or light activity (ASHRAE Handbook of Fundamentals, ch. 9)'),
      co2: est('carbon dioxide the people breathe out', 9.3e-4, 'mol/s', 'about 0.0052 L/s a sedentary adult (ASHRAE 62.1 user\'s manual), four people, 22.4 L/mol'),
      vapour: est('water vapour the people give off', 2.44e-3, 'mol/s', 'about 40 g/h a person at rest, 18 g/mol'),
      waste: est('waste water the people make', 9.3e-6, 'm^3/s', 'about 800 L a day for a family indoors (EPA WaterSense: 300 gal a day, 70 % indoors)'),
    } },
    { id: 'outside air', by: 'the site', environment: true, adjoins: ['inside', 'the ground', 'the sky', 'the people', 'the grid'], holds: ['Tlo', 'Thi', 'c', 'cv', 'pa'], matter: 'air', carriers: { Tlo: 'energy', Thi: 'energy', c: 'amount of carbon dioxide', cv: 'amount of water vapour', qw: 'momentum', rho: 'mass of air', pa: 'volume of air', cpa: 'energy' }, directions: { qw: 'across' },
      properties: { rho: { of: 'momentum', role: 'density' }, cpa: { of: 'energy', role: 'capacity per mass' } }, quantities: {
      pa: site('pressure of the outside air', 0, 'Pa', 'the atmosphere, as the reference'), cpa: est('specific heat of air', 1005, 'J/kg K', 'about 1.005 kJ/kg K at constant pressure'),
      Tlo: site('coldest outside air', -20, 'degC', 'the site\'s winter design temperature'), Thi: site('hottest outside air', 33, 'degC', 'the site\'s summer design temperature'),
      c: site('carbon dioxide in outside air', 0.0172, 'mol/m^3', 'about 420 ppm'), cv: site('water vapour in outside air', 0.5, 'mol/m^3', 'humid summer air'),
      rho: site('density of air', 1.2, 'kg/m^3', 'air near sea level'), qw: site('wind pressure', 1000, 'Pa', 'the site\'s design wind, about 40 m/s'),
    } },
    { id: 'the ground', by: 'the site', environment: true, adjoins: ['inside', 'outside air', 'the water main', 'the sewer', 'the grid'], holds: ['Tg', 'v0'], limits: ['qa'], carriers: { qa: 'momentum', Tg: 'energy', v0: 'momentum' }, quantities: {
      v0: site('the ground at rest', 0, 'm/s', 'the frame the site is described in'),
      qa: site('bearing pressure the ground allows', 72000, 'Pa', 'clay: 1500 psf (IBC table 1806.2)'), Tg: site('temperature of the ground below the frost', 10, 'degC', 'near the annual mean'),
      dfrost: site('depth of frost', 1.0, 'm', 'the site\'s frost depth'),
    } },
    { id: 'the sky', by: 'the site', environment: true, adjoins: ['outside air'], carriers: { Glo: 'light', G: 'light', rain: 'volume of water', snow: 'momentum' }, directions: { G: 'from above', Glo: 'from above', rain: 'down', snow: 'down' }, quantities: {
      Glo: site('sunlight at night', 0, 'W/m^2', 'night'), G: site('sunlight at noon', 1000, 'W/m^2', 'clear sky, the standard test irradiance'), rain: site('heaviest rain', 2.08e-5, 'm/s', 'a 75 mm/h design storm'),
      snow: site('snow on the ground', 1400, 'Pa', 'the site\'s ground snow load, about 30 psf'),
    } },
    { id: 'the grid', by: 'the site', environment: true, adjoins: ['outside air', 'the ground'], holds: ['V'], limits: ['Pmax'], carriers: { V: 'charge', Pmax: 'charge' }, quantities: {
      V: site('voltage of the grid', 120, 'V', 'the site\'s service'), Pmax: site('most power the service gives', 24000, 'W', '200 A at 120 V'),
    } },
    { id: 'the water main', by: 'the site', environment: true, adjoins: ['the ground'], holds: ['p'], matter: 'water', at: 'z', carriers: { p: 'volume of water', rhow: 'momentum' }, properties: { rhow: { of: 'momentum', role: 'density' } }, quantities: {
      p: site('pressure in the water main', 350000, 'Pa', 'the utility\'s pressure'), z: site('height of the water main', -1.2, 'm', 'buried below the frost'),
      rhow: leaf('density of water', 1000, 'kg/m^3', { class: 'measured', source: 'water near 4 °C: 999.97 kg/m³ (CRC Handbook of Chemistry and Physics)' }),
    } },
    { id: 'the sewer', by: 'the site', environment: true, adjoins: ['the ground'], holds: ['p'], at: 'z', carriers: { p: 'volume of water' }, quantities: {
      p: site('pressure in the sewer', 0, 'Pa', 'open to the air'), z: site('height of the sewer', -1.5, 'm', 'the site\'s sewer, below the floor'),
    } },
  ];
  const wants: Want[] = [
    want('warm', 'warm enough and not too warm, whatever the weather', 'inside', 'T', 'degC', 'temperature of the air inside', 'always', { carrier: 'energy', lo: given('least comfortable', 20, 'degC', 'comfort'), hi: given('most comfortable', 24, 'degC', 'comfort') }),
    want('fresh', 'air that is fresh to breathe', 'inside', 'c', 'mol/m^3', 'carbon dioxide in the air inside', 'always', { carrier: 'amount of carbon dioxide', hi: given('most carbon dioxide', 0.0413, 'mol/m^3', '1000 ppm') }),
    want('not damp', 'not damp', 'inside', 'cv', 'mol/m^3', 'water vapour in the air inside', 'always', { carrier: 'amount of water vapour', hi: given('most vapour', 0.646, 'mol/m^3', '60 % relative humidity at 22 °C') }),
    want('dry', 'no rain gets in', 'inside', 'Vw', 'm^3', 'liquid water inside', 'always', { carrier: 'volume of water', hi: given('no water', 0, 'm^3', 'none') }),
    want('light', 'light to see by, day and night', 'inside', 'E', 'W/m^2', 'light falling on the surfaces inside', 'on demand', { carrier: 'light', lo: given('enough light', 3.2, 'W/m^2', '300 lx at about 93 lm/W') }),
    want('water', 'water at the taps', 'inside', 'Q', 'm^3/s', 'water delivered at the taps', 'on demand', { carrier: 'volume of water', lo: given('enough water', 2e-4, 'm^3/s', '0.2 L/s at a tap') }),
    want('pressure', 'water at the taps with pressure', 'inside', 'pt', 'Pa', 'water pressure at the taps', 'on demand', { carrier: 'volume of water', lo: given('enough pressure', 55000, 'Pa', '8 psi at a fixture') }),
    want('power', 'electricity where I plug in', 'inside', 'P', 'W', 'electric power at the outlets', 'on demand', { carrier: 'charge', lo: given('enough power', 10000, 'W', 'what the household runs at once') }),
    want('voltage', 'electricity at the right voltage', 'inside', 'Vo', 'V', 'voltage at the outlets', 'on demand', { carrier: 'charge', lo: given('least voltage', 114, 'V', 'range A'), hi: given('most voltage', 126, 'V', 'range A') }),
    want('level floors', 'floors that do not sag', 'inside', 'sag', '1', 'sag of a floor over its span', 'always', { carrier: 'momentum', hi: given('most sag', 1 / 360, '1', 'span over 360') }),
    want('stays put', 'a house that stays where it is', 'inside', 'settle', 'm', 'settlement of the inside', 'always', { carrier: 'momentum', hi: given('most settlement', 0.025, 'm', 'an inch') }),
    want('waste', 'waste water goes away', 'inside', 'Vwaste', 'm^3', 'waste water held inside', 'always', { carrier: 'volume of water', hi: given('none kept', 0.05, 'm^3', 'a basin') }),
    want('get out', 'we can get in and out, and out fast', 'the people', 'tout', 's', 'time for the people to leave the inside', 'on demand', { carrier: 'momentum', relativeTo: 'inside', hi: given('quick', 180, 's', 'three minutes') }),
  ];
  return { name: 'a house', by: person, regions, wants, duration: given('how long', 50 * 3.15576e7, 's', 'fifty years') };
}

/** What four people who travel by road want of the thing they travel in. */
export function car(): Intent {
  const regions: Region[] = [
    { id: 'the people', by: person, environment: false, adjoins: ['outside air', 'the road'], carriers: { m: 'momentum', heat: 'energy', co2: 'amount of carbon dioxide' }, extent: { x: 'w', y: 'h', z: 'l', faces: { down: 'the road', up: 'outside air', side: 'outside air' } }, quantities: {
      n: given('people', 4, '1', 'the family'), m: given('mass of the people and their luggage', 400, 'kg', 'four people and bags'),
      w: given('width the people need', 1.4, 'm', 'four seated, two by two'), h: given('height the people need', 1.0, 'm', 'seated'), l: given('length the people need', 1.8, 'm', 'two rows'),
    }, produces: { heat: est('heat the people give off', 400, 'W', 'about 100 W a person'), co2: est('carbon dioxide the people breathe out', 9.3e-4, 'mol/s', 'four people') } },
    { id: 'the road', by: 'the site', environment: true, adjoins: ['the people', 'outside air', 'a charging point', 'a fuel station'], holds: ['v0'], limits: ['mu'], carriers: { v0: 'momentum', dz: 'momentum', mu: 'momentum', r: 'momentum', grade: 'momentum' }, directions: { dz: 'vertical', r: 'across', grade: 'along' }, quantities: {
      v0: site('the road at rest', 0, 'm/s', 'the frame the site is described in'),
      mu: est('friction on dry asphalt', 0.7, '1', 'about 0.7 on dry asphalt, under half wet'), grade: site('steepest grade', 0.06, '1', 'six per cent'),
      r: site('tightest curve', 50, 'm', 'the roads the person drives'), dz: site('height of the road\'s bumps', 0.005, 'm', 'a good road over a metre'),
    } },
    { id: 'outside air', by: 'the site', environment: true, adjoins: ['the people', 'the road'], holds: ['Tlo', 'Thi'], carriers: { Tlo: 'energy', Thi: 'energy', rain: 'volume of water', rho: 'mass of air' }, quantities: {
      Tlo: site('coldest air', -20, 'degC', 'winter'), Thi: site('hottest air', 40, 'degC', 'summer'), rho: site('density of air', 1.2, 'kg/m^3', 'near sea level'), rain: site('heaviest rain', 2.08e-5, 'm/s', '75 mm/h'),
    } },
    { id: 'a charging point', by: 'the site', environment: true, adjoins: ['the road'], holds: ['V'], limits: ['Pmax'], carriers: { V: 'charge', Pmax: 'charge' }, quantities: { V: site('voltage at the charging point', 240, 'V', 'a level-2 charger'), Pmax: site('most power it gives', 7200, 'W', '30 A at 240 V') } },
    { id: 'a fuel station', by: 'the site', environment: true, adjoins: ['the road'], holds: ['e'], carriers: { e: 'mass of petrol' }, quantities: { e: est('energy in a kilogram of petrol', 4.6e7, 'J/kg', 'lower heating value 43 to 46 MJ/kg') } },
  ];
  const wants: Want[] = [
    want('go far', 'go 400 km before stopping for energy', 'the people', 'range', 'm', 'distance the people travel along the road between replenishments', 'by the end', { carrier: 'momentum', relativeTo: 'the road', lo: given('range', 400000, 'm', '400 km') }),
    want('fast', 'go as fast as the highway allows', 'the people', 'v', 'm/s', 'speed of the people along the road', 'on demand', { carrier: 'momentum', relativeTo: 'the road', hi: given('top speed', 33.3, 'm/s', '120 km/h') }),
    want('pick up', 'get up to speed quickly', 'the people', 'a', 'm/s^2', 'acceleration of the people along the road', 'on demand', { carrier: 'momentum', relativeTo: 'the road', lo: given('acceleration', 2.78, 'm/s^2', '0 to 100 km/h in 10 s') }),
    want('stop', 'stop quickly', 'the people', 'dec', 'm/s^2', 'deceleration of the people along the road', 'on demand', { carrier: 'momentum', relativeTo: 'the road', lo: given('deceleration', 8, 'm/s^2', '100 km/h to rest in 48 m') }),
    want('follow', 'follow the road round its curves', 'the people', 'off', 'm', 'distance of the people from the road\'s path', 'always', { carrier: 'momentum', relativeTo: 'the road', hi: given('within the lane', 0.5, 'm', 'half a lane\'s spare width') }),
    want('smooth', 'a smooth ride', 'the people', 'az', 'm/s^2', 'vertical acceleration of the people', 'always', { carrier: 'momentum', direction: 'vertical', hi: given('smooth', 1, 'm/s^2', 'about the ISO 2631 fairly uncomfortable band') }),
    want('comfortable', 'warm in winter and cool in summer', 'the people', 'T', 'degC', 'temperature of the air around the people', 'always', { carrier: 'energy', lo: given('least', 20, 'degC', 'comfort'), hi: given('most', 26, 'degC', 'comfort') }),
    want('dry', 'no rain on us', 'the people', 'Vw', 'm^3', 'liquid water reaching the people', 'always', { carrier: 'volume of water', hi: given('none', 0, 'm^3', 'none') }),
    want('survive', 'we survive running into a wall at 50 km/h', 'the people', 'acrash', 'm/s^2', 'deceleration of the people in a stop against a wall from 50 km/h', 'on demand', { carrier: 'momentum', hi: given('survivable', 400, 'm/s^2', 'about 40 g'), condition: { v: { leaf: given('speed of the crash', 13.89, 'm/s', '50 km/h'), carrier: 'momentum' } } }),
    want('choose', 'I choose speed and direction at every moment', 'the people', 'delay', 's', 'delay between the person\'s choice and the change of motion', 'always', { carrier: 'momentum', hi: given('prompt', 0.3, 's', 'quicker than a person reacts') }),
  ];
  return { name: 'a car', by: person, regions, wants, duration: given('how long', 15 * 3.15576e7, 's', 'fifteen years') };
}

/** What a person who wants plastic parts of any shape they draw wants of the thing that makes them. */
/** What a person can change of the printer they ask for: the largest part (m), its tolerance (m), the time it may take (s). */
export interface PrinterAsk { size?: number; tolerance?: number; time?: number }

export function printer(o: PrinterAsk = {}): Intent {
  const size = o.size ?? 0.2, tol = o.tolerance ?? 1e-4, time = o.time ?? 86400;
  const regions: Region[] = [
    { id: 'the part', by: person, environment: false, adjoins: ['room air', 'the drawn shape'], extent: { x: 'size', y: 'size', z: 'size', faces: { up: 'room air', side: 'room air' } }, quantities: { size: given('largest part', size, 'm', `a part that fits a ${(size * 1e3).toFixed(0)} mm cube`) } },
    { id: 'the drawn shape', by: person, environment: false, adjoins: ['the part'], quantities: {} },
    { id: 'a spool of filament', by: person, environment: false, adjoins: ['room air'], carriers: { V: 'volume of PLA', p: 'volume of PLA', cp: 'energy', k: 'energy', Tmelt: 'energy', Tmax: 'energy', Tg: 'energy' }, holds: ['p'],
      properties: { Tmelt: { of: 'volume of PLA', role: 'flows above' }, Tmax: { of: 'energy', role: 'most potential' }, Tg: { of: 'momentum', role: 'holds its shape below' }, cp: { of: 'energy', role: 'capacity per mass' }, k: { of: 'energy', role: 'conductivity' }, alpha: { of: 'momentum', role: 'expansion' }, rho: { of: 'momentum', role: 'density' } }, quantities: {
      d: given('diameter of the filament', 0.00175, 'm', 'the filament the person buys'), m: given('mass on the spool', 1, 'kg', 'a spool'),
      V: given('volume of filament on the spool', 8.06e-4, 'm^3', 'a kilogram at 1240 kg/m³'), p: site('pressure on the spool', 0, 'Pa', 'open to the room'),
      rho: leaf('density of PLA', 1240, 'kg/m^3', { class: 'measured', source: 'src/data/materials.ts polymer.pla (MatWeb typical unfilled grade)' }),
      Tmelt: est('lowest temperature PLA flows to print', 190, 'degC', 'makers\' printing window 190 to 220 °C'), Tmax: est('highest temperature PLA bears in printing', 220, 'degC', 'makers\' printing window 190 to 220 °C; it degrades above'), Tg: est('glass transition of PLA', 60, 'degC', 'about 55 to 65 °C'),
      cp: est('specific heat of PLA', 1800, 'J/kg K', 'about 1.8 kJ/kg K'), k: est('conductivity of PLA', 0.13, 'W/m K', 'about 0.13 W/m K'), alpha: est('thermal expansion of PLA', 6.8e-5, '1/K', 'about 68 µm/m K'),
    } },
    { id: 'room air', by: 'the site', environment: true, adjoins: ['the part', 'a spool of filament', 'a table', 'the grid', 'the person'], holds: ['T'], carriers: { T: 'energy' }, quantities: { T: site('room temperature', 20, 'degC', 'a room') } },
    { id: 'a table', by: 'the site', environment: true, adjoins: ['room air'], holds: ['v0'], limits: ['load'], carriers: { load: 'momentum', v0: 'momentum' }, quantities: { load: est('what the table carries', 500, 'N', 'a sturdy table'), v0: site('the table at rest', 0, 'm/s', 'the room\'s frame') } },
    { id: 'the grid', by: 'the site', environment: true, adjoins: ['room air'], holds: ['V'], limits: ['Pmax'], carriers: { V: 'charge', Pmax: 'charge' }, quantities: { V: site('voltage at the wall', 120, 'V', 'a household outlet'), Pmax: site('most power the outlet gives', 1800, 'W', '15 A at 120 V') } },
    { id: 'the person', by: person, environment: false, adjoins: ['room air'], quantities: {} },
  ];
  const wants: Want[] = [
    want('shape', 'the part has the shape I drew, within a tenth of a millimetre', 'the part', 'err', 'm', 'distance of the part\'s surface from the drawn shape', 'by the end', { carrier: 'momentum', relativeTo: 'the drawn shape', hi: given('tolerance', tol, 'm', tol === 1e-4 ? 'a tenth of a millimetre' : `${(tol * 1e3).toPrecision(2)} mm`) }),
    want('solid', 'the part comes out solid', 'the part', 'T', 'degC', 'temperature of the part when it is taken out', 'by the end', { carrier: 'energy', hi: given('solid', 60, 'degC', 'below the glass transition') }),
    want('whole', 'the part is strong, not a pile of layers', 'the part', 'bond', '1', 'strength between layers over the material\'s strength', 'by the end', { lo: given('fused', 0.5, '1', 'half the bulk strength') }),
    want('rate', 'it makes parts at a useful rate', 'the part', 'Qv', 'm^3/s', 'volume added to the part per time', 'on demand', { carrier: 'volume of PLA', lo: given('rate', 2.78e-9, 'm^3/s', '10 cm³ an hour') }),
    want('in time', time === 86400 ? 'a big part within a day' : `a big part within ${(time / 3600).toPrecision(3)} hours`, 'the part', 'tmake', 's', 'time to make the largest part', 'by the end', { carrier: 'volume of PLA', hi: given('a day', time, 's', time === 86400 ? 'a day' : `${(time / 3600).toPrecision(3)} hours`) }),
    want('safe', 'I cannot burn myself on it', 'the person', 'Ttouch', 'degC', 'temperature of anything the person can touch', 'always', { carrier: 'energy', relativeTo: 'room air', hi: given('safe to touch', 60, 'degC', 'brief contact (ISO 13732-1 order of magnitude)') }),
    want('start', 'I start and stop it when I want', 'the person', 'delay', 's', 'delay between the person\'s choice and the machine\'s response', 'on demand', { carrier: 'charge', hi: given('prompt', 1, 's', 'a second') }),
    want('take out', 'I can take the part out', 'the person', 'tout', 's', 'time to take the part out', 'on demand', { hi: given('a minute', 60, 's', 'a minute') }),
  ];
  return { name: 'a 3D printer', by: person, regions, wants, duration: given('how long', 5 * 3.15576e7, 's', 'five years') };
}

