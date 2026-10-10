// What a body makes and loses, each worked out by the universal laws (src/nexus/book/universal.ts) from what is measured
// of the parts that make it: no law here is a law of a tissue. Filtration is Starling's (pressure less osmotic pressure
// through a membrane); urine is conservation of water; urea, bilirubin, iron and carbon monoxide are stoichiometry on
// what is broken down; red cells made are Little's law on their count and their life; the fluid round the brain is its
// glands' mass times their rate; hair's length is its speed times its growing time, its mass a cylinder of keratin; the
// acid's cost is the free energy of its gradient. Each flow keeps its whole breakdown, and the range it is measured in,
// so where the laws and the measurements disagree it shows.

import { INVENTORY, countIn, gramsOfItem } from '../parts/inventory';
import { estimate, fixed, measured, setting, solve, step, valueIn } from '../substrate/lawgraph';
import { ofLeaf, type Derivation } from '../substrate/evaluate';
import { leaf } from '../substrate/term';
import { LIFESPAN, wattsOf } from './time';

/** A count or mass read off the body's tree, as a record: where it is from is the tree. */
const counted = (name: string, n: number) => ofLeaf(leaf(name, n, '-', { class: 'configuration', source: 'counted in the body\'s tree (the life tables, each part from its source)' }));
const weighed = (name: string, g: number) => ofLeaf(leaf(name, g, 'g', { class: 'configuration', source: 'weighed in the body\'s tree (the life tables, each part from its source)' }));
const DAY = fixed('a day', 1, 'd', 'the unit of a day\'s flow');

/** A flow of the body: what makes it, what it is, its rate with every law under it, what else follows, and what is
 *  measured to check it against. */
export interface Flow {
  id: string; name: string; by: string; makes?: string; rate: Derivation; unit: string;
  also: { d: Derivation; unit: string }[];
  measured?: { lo: number; hi: number; unit: string; source: string };
}
const F = (f: Flow) => f;

/** Every flow, worked out for the body named (the reference man by default). */
export function flowsOf(body = 'human'): Flow[] {
  const out: Flow[] = [];
  // ---- the kidneys: Starling's filtration, then conservation of water -----------------------------------------------
  const gfr = step('starling.filtration', {
    Kf: measured('filtration coefficient of both kidneys', 12.5 / 60 * 1e-6 / 133.322387415, 'm^3/s Pa', 'about 12.5 ml/min a mmHg (Hall 2021, Guyton and Hall Textbook of Medical Physiology, 14th ed., ch. 27)'),
    dP: measured('pressure pushing out of the glomerulus', 42, 'mmHg', '60 mmHg in its capillaries less 18 in Bowman\'s capsule (Hall 2021, ch. 27)'),
    dPi: measured('plasma proteins\' osmotic pull in the glomerulus', 32, 'mmHg', 'its mean as the filtrate leaves, 28 rising to 36 mmHg (Hall 2021, ch. 27)'),
  }, 'glomerular filtration');
  const albuminPi = step('osmotic.van-t-hoff', { c: measured('albumin in plasma', 42 / 66.5, 'mol/m^3', '42 g/l of albumin at 66.5 kDa (typical)'), T: measured('body temperature', 310.15, 'K', '37 °C') }, 'albumin\'s ideal osmotic pressure');
  out.push(F({ id: 'filtration', name: 'blood filtered by the kidneys', by: 'nephron', rate: gfr, unit: 'L/d', also: [{ d: albuminPi, unit: 'mmHg' }], measured: { lo: 150, hi: 200, unit: 'L/d', source: 'GFR about 125 ml/min, 180 l a day (Hall 2021)' } }));
  const water = { in: measured('water drunk and eaten', 2100, 'mL/d', 'Hall 2021, table 26-1'), made: measured('water made by burning food', 200, 'mL/d', 'Hall 2021, table 26-1') };
  // breath: air out saturated at 35 °C, in at 20 °C and 45 % humidity, by vapour pressure and the ideal gas
  const pOut = step('vapour.pressure', { p0: measured('vapour pressure of water at 25 °C', 3169.9, 'Pa', 'IAPWS-95'), T0: fixed('25 °C', 298.15, 'K', 'the reference'), T: measured('breath\'s temperature out', 308.15, 'K', 'about 35 °C (typical)'), L: measured('latent heat of water at 25 °C', 2.442e6, 'J/kg', 'IAPWS-95'), M: fixed('molar mass of water', 0.018015, 'kg/mol', 'IUPAC') }, 'vapour pressure of breath out');
  const pIn = step('vapour.pressure', { p0: measured('vapour pressure of water at 25 °C', 3169.9, 'Pa', 'IAPWS-95'), T0: fixed('25 °C', 298.15, 'K', 'the reference'), T: setting('room temperature', 293.15, 'K', 'the place: 20 °C'), L: measured('latent heat of water at 25 °C', 2.442e6, 'J/kg', 'IAPWS-95'), M: fixed('molar mass of water', 0.018015, 'kg/mol', 'IUPAC') }, 'saturated vapour pressure of the room');
  const cOut = step('gas.concentration', { x: fixed('saturated', 1, '-', 'breath leaves the lungs saturated'), p: pOut, T: measured('breath\'s temperature out', 308.15, 'K', 'about 35 °C (typical)') }, 'water in breath out');
  const cIn = step('gas.concentration', { x: setting('room humidity', 0.45, '-', 'the place: 45 %'), p: pIn, T: setting('room temperature', 293.15, 'K', 'the place: 20 °C') }, 'water in air in');
  const breath = step('transport.advection', { Q: measured('breathing at rest', 6, 'L/min', '12 breaths a minute of 0.5 l (ICRP 89)'), dc: step('concentration.difference', { c1: cOut, c2: cIn }, 'water breathed out over in') }, 'water breathed out');
  const breathQ = solve('mass.flow', 'Q', { mdot: step('molar.mass-flow', { n: breath, M: fixed('molar mass of water', 0.018015, 'kg/mol', 'IUPAC') }, 'water breathed out, by mass'), rho: measured('density of water', 997, 'kg/m^3', 'IAPWS-95 at 25 °C') }, 'water breathed out, as liquid');
  const skin = step('flux.area', { J: measured('water through the skin without sweating', 7e-3 / 3600, 'kg/m^2 s', 'transepidermal water loss about 4–10 g a square metre an hour at rest (typical)'), A: measured('skin area', 1.9, 'm^2', 'ICRP 89') }, 'water lost through the skin');
  const skinQ = solve('mass.flow', 'Q', { mdot: skin, rho: measured('density of water', 997, 'kg/m^3', 'IAPWS-95') }, 'water through the skin, as liquid');
  const lost = step('junction.sum', { Q1: step('junction.sum', { Q1: breathQ, Q2: skinQ }, 'breath and skin'), Q2: step('junction.sum', { Q1: measured('sweat at rest in a cool room', 100, 'mL/d', 'Hall 2021, table 26-1'), Q2: measured('water in faeces', 100, 'mL/d', 'Hall 2021, table 26-1') }, 'sweat and faeces') }, 'water lost other ways');
  const urine = step('balance.difference', { Qin: step('junction.sum', { Q1: water.in, Q2: water.made }, 'water in'), Qout: lost }, 'urine');
  out.push(F({ id: 'urine', name: 'urine', by: 'kidney', makes: 'urine', rate: urine, unit: 'L/d', also: [{ d: breath, unit: 'mol/d' }, { d: skinQ, unit: 'mL/d' }], measured: { lo: 1.0, hi: 2.0, unit: 'L/d', source: 'about 1.4–1.5 l a day (Hall 2021, table 26-1)' } }));
  // urea: protein's nitrogen, by stoichiometry
  const nitrogen = step('share.of', { w: measured('nitrogen in protein', 0.16, '-', '16 % (Jones\'s factor 6.25)'), M: estimate('protein eaten a day', 80, 'g', 'about 1.1 g a kilogram a day (typical)') }, 'nitrogen eaten a day');
  const urea = step('stoichiometry.mass', { m: step('share.of', { w: estimate('nitrogen that leaves as urea', 0.85, '-', 'about 80–90 % of it (typical)'), M: nitrogen }, 'nitrogen to urea'), nu: fixed('ureas a nitrogen atom', 0.5, '-', 'urea holds two nitrogens'), Mp: fixed('molar mass of urea', 60.056, 'g/mol', 'IUPAC'), Mr: fixed('molar mass of nitrogen', 14.007, 'g/mol', 'IUPAC') }, 'urea a day');
  out.push(F({ id: 'urea', name: 'urea', by: 'liver', makes: 'urea', rate: urea, unit: 'g', also: [], measured: { lo: 15, hi: 35, unit: 'g', source: 'typical on a normal diet (Putnam 1971, NASA CR-1802)' } }));
  // creatinine: the creatine pool, 1.7 % a day
  const creatinine = step('stoichiometry.mass', { m: step('share.of', { w: measured('creatine that becomes creatinine a day', 0.017, '-', 'about 1.7 % of the pool a day, without an enzyme (Wyss & Kaddurah-Daouk 2000, Physiol Rev 80:1107)'), M: measured('creatine in the body', 120, 'g', 'about 120 g in a 70 kg man (Wyss & Kaddurah-Daouk 2000)') }, 'creatine converted a day'), nu: fixed('one a one', 1, '-', 'creatine loses a water to become creatinine'), Mp: fixed('molar mass of creatinine', 113.12, 'g/mol', 'IUPAC'), Mr: fixed('molar mass of creatine', 131.13, 'g/mol', 'IUPAC') }, 'creatinine a day');
  out.push(F({ id: 'creatinine', name: 'creatinine', by: 'muscles', makes: 'creatinine', rate: creatinine, unit: 'g', also: [], measured: { lo: 1.0, hi: 2.0, unit: 'g', source: 'men about 20–25 mg a kilogram a day (typical)' } }));
  // ---- red cells: Little's law, then the haem in them by stoichiometry -------------------------------------------------
  const rbc = countIn(body, 'red-blood-cell'), life = LIFESPAN['red-blood-cell']!.days;
  const made = solve('queueing', 'lambda', { L: counted('red cells in the blood', rbc), W: measured('a red cell\'s life', life, 'd', LIFESPAN['red-blood-cell']!.says) }, 'red cells made and broken a second');
  const hbEach = step('total.mass', { n: counted('haemoglobins in a red cell', countIn('red-blood-cell', 'haemoglobin')), m1: measured('mass of a haemoglobin', 64500 * 1.66053907e-27, 'kg', 'about 64.5 kDa (its four chains and four haems, UniProt)') }, 'haemoglobin in a red cell');
  const brokenDay = step('queueing', { lambda: made, W: DAY }, 'red cells broken a day');
  const hbDay = step('total.mass', { n: brokenDay, m1: hbEach }, 'haemoglobin broken a day');
  const bilirubin = step('stoichiometry.mass', { m: hbDay, nu: fixed('haems a haemoglobin', 4, '-', 'four haems, each one bilirubin'), Mp: fixed('molar mass of bilirubin', 584.66, 'g/mol', 'IUPAC'), Mr: fixed('molar mass of haemoglobin', 64500, 'g/mol', 'about 64.5 kDa') }, 'bilirubin from red cells a day');
  const iron = step('stoichiometry.mass', { m: hbDay, nu: fixed('irons a haemoglobin', 4, '-', 'one in each haem'), Mp: fixed('molar mass of iron', 55.845, 'g/mol', 'IUPAC'), Mr: fixed('molar mass of haemoglobin', 64500, 'g/mol', 'about 64.5 kDa') }, 'iron recycled a day');
  const co = step('stoichiometry.mass', { m: hbDay, nu: fixed('COs a haemoglobin', 4, '-', 'haem oxygenase frees one CO a haem'), Mp: fixed('molar mass of CO', 28.01, 'g/mol', 'IUPAC'), Mr: fixed('molar mass of haemoglobin', 64500, 'g/mol', 'about 64.5 kDa') }, 'carbon monoxide made a day');
  const coGas = solve('amount.concentration', 'V', { n: estimate('CO made a day, in moles', co.value! / 0.02801, 'mol', 'its mass over 28.01 g/mol'), c: step('gas.concentration', { x: fixed('pure', 1, '-', 'the gas alone'), p: fixed('one atmosphere', 101325, 'Pa', 'standard'), T: fixed('0 °C', 273.15, 'K', 'standard') }, 'a gas at 0 °C and 1 atm') }, 'carbon monoxide made a day, as gas');
  out.push(F({ id: 'red-cells', name: 'red cells made (and as many broken)', by: 'red-marrow', rate: made, unit: '1/s', also: [{ d: hbDay, unit: 'g' }], measured: { lo: 2e6, hi: 3e6, unit: '1/s', source: 'about 2–3 million a second (typical)' } }));
  out.push(F({ id: 'bilirubin', name: 'bilirubin', by: 'spleen', makes: 'bilirubin', rate: bilirubin, unit: 'mg', also: [], measured: { lo: 200, hi: 300, unit: 'mg', source: '250–350 mg a day in all, about 80 % of it from red cells (typical)' } }));
  out.push(F({ id: 'iron', name: 'iron recycled from red cells', by: 'macrophage', rate: iron, unit: 'mg', also: [], measured: { lo: 20, hi: 25, unit: 'mg', source: 'about 20–25 mg a day (typical): a day\'s diet gives only 1–2' } }));
  out.push(F({ id: 'carbon-monoxide', name: 'carbon monoxide breathed out', by: 'spleen', rate: coGas, unit: 'mL', also: [{ d: co, unit: 'mg' }], measured: { lo: 7, hi: 12, unit: 'mL', source: 'about 0.4 ml an hour (Coburn, Blakemore & Forster 1963, J Clin Invest 42:1172)' } }));
  // ---- breath and blood: what the body burns sets what it breathes and pumps (energy, then the Fick principle) -----------
  const P = setting('resting power', wattsOf(body), 'W', 'its tissues\' masses times their resting rates (Elia 1992)');
  const vo2 = solve('power.molar', 'n', { P, E: measured('energy a mole of O₂ burnt', 4.5e5, 'J/mol', 'mixed fuel 440–470 kJ a mole of O₂ (Brouwer 1957)') }, 'oxygen burnt a second');
  const STPD = step('gas.concentration', { x: fixed('pure', 1, '-', 'the gas alone'), p: fixed('one atmosphere', 101325, 'Pa', 'standard'), T: fixed('0 °C', 273.15, 'K', 'standard') }, 'a gas at 0 °C and 1 atm');
  const vo2Gas = solve('amount.concentration', 'V', { n: vo2, c: STPD }, 'oxygen taken up, as gas');
  out.push(F({ id: 'oxygen', name: 'oxygen taken up at rest', by: 'lungs', rate: vo2Gas, unit: 'mL/min', also: [], measured: { lo: 200, hi: 300, unit: 'mL/min', source: 'resting VO₂ about 250 ml a minute STPD (typical)' } }));
  const vco2 = solve('amount.concentration', 'V', { n: step('total.rate', { n: measured('respiratory quotient', 0.82, '-', 'CO₂ out over O₂ in on a mixed diet, about 0.8 (typical)'), r1: vo2 }, 'CO₂ made a second'), c: STPD }, 'CO₂ breathed out, as gas');
  out.push(F({ id: 'co2', name: 'CO₂ breathed out at rest', by: 'lungs', rate: vco2, unit: 'mL/min', also: [], measured: { lo: 160, hi: 250, unit: 'mL/min', source: 'about 200 ml a minute (typical)' } }));
  const room = (x: number, name: string) => step('gas.concentration', { x: measured(name, x, '-', x > 0.2 ? 'dry air 20.95 % O₂' : 'breath out about 16 % O₂ (typical)'), p: fixed('one atmosphere', 101325, 'Pa', 'standard'), T: measured('body temperature', 310.15, 'K', '37 °C') }, name);
  const vent = solve('transport.advection', 'Q', { n: vo2, dc: step('concentration.difference', { c1: room(0.2095, 'oxygen in air'), c2: room(0.16, 'oxygen in breath out') }, 'oxygen taken from each litre breathed') }, 'air breathed');
  out.push(F({ id: 'ventilation', name: 'air breathed at rest', by: 'lungs', rate: vent, unit: 'L/min', also: [], measured: { lo: 5, hi: 8, unit: 'L/min', source: 'about 6 l a minute, 12 breaths of 0.5 l (ICRP 89)' } }));
  // the blood's oxygen capacity from its haemoglobin, counted in its red cells (stoichiometry: four O₂ a haemoglobin),
  // then the Fick principle: the oxygen taken up is the blood pumped times what each litre gives up
  const bloodVol = measured('blood volume', 5.3, 'L', 'ICRP 89');
  const hb = step('total.mass', { n: counted('red cells in the blood', countIn(body, 'red-blood-cell')), m1: hbEach }, 'haemoglobin in the blood');
  const o2Held = step('stoichiometry.moles', { nu: fixed('O₂ a haemoglobin holds', 4, '-', 'one on each haem'), n: step('moles.of-mass', { m: hb, M: fixed('molar mass of haemoglobin', 64.5, 'kg/mol', 'about 64.5 kDa') }, 'moles of haemoglobin') }, 'O₂ the blood can hold');
  const o2cap = solve('amount.concentration', 'c', { n: o2Held, V: bloodVol }, 'O₂ a litre of blood can hold');
  const sat = (theta: number, name: string, why: string) => step('saturation.share', { theta: measured(`${name}: its saturation`, theta, '-', why), cmax: o2cap }, name);
  const given = step('concentration.difference', { c1: sat(0.98, 'O₂ in arterial blood', 'arterial blood about 98 % saturated (typical)'), c2: sat(0.75, 'O₂ in mixed venous blood', 'mixed venous blood about 75 % saturated at rest (typical)') }, 'O₂ each litre of blood gives up');
  const cardiac = solve('transport.advection', 'Q', { n: vo2, dc: given }, 'blood the heart pumps');
  const stroke = step('residence.stock', { Q: cardiac, tau: measured('a heartbeat', 60 / 70, 's', 'a resting heart about 70 beats a minute (typical)') }, 'blood each beat pumps');
  out.push(F({ id: 'cardiac-output', name: 'blood the heart pumps at rest (the Fick principle)', by: 'heart', rate: cardiac, unit: 'L/min', also: [{ d: stroke, unit: 'mL' }, { d: solve('mass.volume', 'rho', { m: hb, V: bloodVol }, 'haemoglobin a litre of blood'), unit: 'kg/m^3' }], measured: { lo: 4.5, hi: 6.5, unit: 'L/min', source: 'about 5 l a minute at rest (typical)' } }));
  // the brain's glucose, from its power and glucose's energy
  const brainGlucose = step('molar.mass-flow', { n: solve('power.molar', 'n', { P: setting('the brain\'s power', wattsOf('brain'), 'W', 'its tissues\' rates (Elia 1992)'), E: measured('energy a mole of glucose burnt', 2.803e6, 'J/mol', 'its heat of combustion, 2,803 kJ/mol (CRC Handbook)') }, 'glucose burnt a second'), M: fixed('molar mass of glucose', 0.18016, 'kg/mol', 'IUPAC') }, 'glucose the brain burns');
  out.push(F({ id: 'brain-glucose', name: 'glucose the brain burns', by: 'brain', makes: 'glucose', rate: brainGlucose, unit: 'g/d', also: [], measured: { lo: 80, hi: 130, unit: 'g/d', source: 'about 100–120 g a day fed (Cahill 2006, Annu Rev Nutr 26:1)' } }));
  // albumin: a first-order turnover makes what it loses
  const albPool = solve('share.of', 'M', { m: step('mass.volume', { rho: measured('albumin in plasma', 42, 'kg/m^3', '42 g/l (typical)'), V: measured('plasma volume', 3, 'L', 'ICRP 89 (about 3 l)') }, 'albumin in the plasma'), w: estimate('share of the body\'s albumin in the plasma', 0.4, '-', 'about 40 %, the rest in the tissues\' fluid (typical)') }, 'albumin in the body');
  const albumin = step('loss.first-order', { k: solve('half-life', 'k', { t: measured('albumin\'s half-life', 19, 'd', 'about 19 days (Peters, All About Albumin, Academic Press 1996)') }, 'its rate constant'), m: albPool }, 'albumin made');
  out.push(F({ id: 'albumin', name: 'albumin the liver makes', by: 'liver', makes: 'albumin', rate: albumin, unit: 'g/d', also: [], measured: { lo: 9, hi: 16, unit: 'g/d', source: 'about 10–15 g a day (Peters 1996)' } }));
  // ---- the brain's fluid ---------------------------------------------------------------------------------------------
  const plexus = countIn(body, 'choroid-plexus') * (gramsOfItem(INVENTORY.get('choroid-plexus')!) ?? 0);
  const csf = step('rate.per-mass', { q: measured('fluid a gram of choroid plexus makes', 0.2 / 60 * 1e-6 / 1e-3, 'm^3/s kg', 'about 0.2 ml a minute a gram (Brown et al. 2004, Neuroscience 129:957)'), m: weighed('choroid plexus', plexus) }, 'cerebrospinal fluid made');
  const csfTurn = solve('residence.stock', 'tau', { V: measured('cerebrospinal fluid held', 150, 'mL', 'ICRP 89'), Q: csf }, 'how long it stays');
  out.push(F({ id: 'csf', name: 'cerebrospinal fluid', by: 'choroid-plexus', makes: 'cerebrospinal-fluid', rate: csf, unit: 'mL/d', also: [{ d: csfTurn, unit: 'h' }], measured: { lo: 400, hi: 600, unit: 'mL/d', source: 'about 500 ml a day (typical)' } }));
  // ---- tears, saliva, sweat ------------------------------------------------------------------------------------------
  const tears = measured('tears at rest', 1.2, 'uL/min', 'Mishima et al. 1966, Invest Ophthalmol 5:264');
  const tearStay = solve('residence.stock', 'tau', { V: measured('tear film', 7, 'uL', 'about 7 µl (typical)'), Q: tears }, 'how long a tear stays');
  out.push(F({ id: 'tears', name: 'tears at rest', by: 'lacrimal-gland', makes: 'tear-fluid', rate: tears, unit: 'mL/d', also: [{ d: tearStay, unit: 'min' }] }));
  const phase = (name: string, q: number, h: number, why: string) => step('residence.stock', { Q: estimate(`saliva ${name}`, q, 'mL/min', why), tau: estimate(`time ${name}`, h, 'h', 'a typical day') }, `saliva ${name}`);
  const salivaDay = step('junction.sum', { Q1: perDay(step('residence.stock', { Q: estimate('saliva at rest', 0.3, 'mL/min', 'unstimulated flow 0.3–0.4 ml a minute (Humphrey & Williamson 2001)'), tau: estimate('awake, not eating', 15.1, 'h', 'a typical day') }, 'saliva at rest')), Q2: step('junction.sum', { Q1: perDay(phase('eating', 4, 0.9, 'chewing about 4 ml a minute (typical)')), Q2: perDay(phase('asleep', 0.1, 8, 'nearly none in sleep (typical)')) }, 'saliva eating and asleep') }, 'saliva a day');
  out.push(F({ id: 'saliva', name: 'saliva', by: 'salivary-glands', makes: 'saliva', rate: salivaDay, unit: 'mL/d', also: [], measured: { lo: 500, hi: 1500, unit: 'mL/d', source: '0.5–1.5 l a day (typical)' } }));
  const glands = countIn(body, 'eccrine-sweat-gland');
  const sweatMax = step('total.flow', { n: counted('sweat glands', glands), q: estimate('sweat a gland at its most', 10, 'nL/min', 'each up to 2–20 nl a minute (Sato et al. 1989)') }, 'sweat at its most');
  const coolMax = step('heat.latent-flow', { mdot: step('mass.flow', { rho: measured('density of sweat', 1000, 'kg/m^3', 'about water\'s'), Q: sweatMax }, 'sweat by mass'), L: measured('latent heat of water at 35 °C', 2.42e6, 'J/kg', 'IAPWS-95') }, 'heat it can carry away if it all evaporates');
  out.push(F({ id: 'sweat', name: 'sweat at its most', by: 'eccrine-sweat-gland', makes: 'sweat', rate: sweatMax, unit: 'L/h', also: [{ d: coolMax, unit: 'W' }], measured: { lo: 1, hi: 3, unit: 'L/h', source: 'about 1–2.5 l an hour in hard work in heat (typical)' } }));
  // ---- stomach acid and what it costs --------------------------------------------------------------------------------
  const acid = step('total.rate', { n: counted('acid cells', countIn(body, 'parietal-cell')), r1: measured('acid an acid cell makes at its most', 23e-3 / 3600 / 1e9, 'mol/s', 'maximal acid output about 23 mmol an hour a billion acid cells (Card & Marks 1960, Clin Sci 19:147)') }, 'acid at its most');
  const dG = step('free-energy.gradient', { T: measured('body temperature', 310.15, 'K', '37 °C'), ratio: estimate('protons in the gland over in the cell', 10 ** (7.2 - 0.8), '-', 'pH 0.8 in the gland (typical) over the cell\'s 7.2 (an estimate)'), z: fixed('a proton\'s charge', 1, '-', 'one'), psi: estimate('voltage across', 0, 'V', 'the pump swaps K⁺ for H⁺, so it moves no net charge') }, 'free energy a mole of acid');
  const acidPower = step('power.molar', { n: acid, E: dG }, 'least power to pump it');
  out.push(F({ id: 'acid', name: 'stomach acid at its most', by: 'parietal-cell', makes: 'hydrochloric-acid', rate: acid, unit: 'mol/h', also: [{ d: dG, unit: 'J/mol' }, { d: acidPower, unit: 'W' }], measured: { lo: 0.015, hi: 0.04, unit: 'mol/h', source: 'maximal acid output about 20–40 mmol an hour in men (typical)' } }));
  // ---- hair and nails ------------------------------------------------------------------------------------------------
  const v = measured('scalp hair growth', 0.35, 'mm/d', 'about 0.35 mm a day (0.3–0.45, typical)');
  const longest = step('distance.speed-time', { v, t: measured('a scalp follicle\'s growing phase', 3, 'yr', '2–7 years, about 3 typical (Paus & Cotsarelis 1999, N Engl J Med 341:491)') }, 'longest a scalp hair grows uncut');
  const strandDay = step('mass.volume', { rho: measured('density of hair', 1310, 'kg/m^3', 'Robbins 2012'), V: step('volume.cylinder', { r: estimate('radius of a scalp hair', 35, 'um', 'scalp hairs 50–100 µm across'), L: step('distance.speed-time', { v, t: DAY }, 'a day\'s growth') }, 'a day\'s growth of one hair') }, 'a day\'s growth of one hair');
  const hairDay = step('total.mass', { n: counted('scalp hairs', countIn(body, 'scalp-hair')), m1: strandDay }, 'scalp hair grown a day');
  const shed = solve('queueing', 'lambda', { L: estimate('scalp hairs resting at a time', 0.1 * countIn(body, 'scalp-hair'), '-', 'about 10 % of them in their resting phase (Paus & Cotsarelis 1999)'), W: measured('the resting phase', 100, 'd', 'about 3 months (Paus & Cotsarelis 1999)') }, 'scalp hairs shed a second');
  const lash = step('distance.speed-time', { v: measured('eyelash growth', 0.13, 'mm/d', '0.12–0.14 mm a day (Thibaut et al. 2010, Br J Dermatol 162:304)'), t: estimate('an eyelash\'s growing phase', 60, 'd', 'about 1–2 months (an estimate)') }, 'an eyelash\'s length');
  out.push(F({ id: 'hair', name: 'scalp hair grown', by: 'hair-follicle', makes: 'keratin', rate: hairDay, unit: 'g', also: [{ d: longest, unit: 'cm' }, { d: shed, unit: '1/d' }, { d: lash, unit: 'mm' }], measured: { lo: 0.1, hi: 0.3, unit: 'g', source: 'the scalp grows about 0.1–0.3 g of hair a day (an estimate from its count and speed)' } }));
  const nail = solve('distance.speed-time', 't', { x: estimate('a fingernail\'s length', 15, 'mm', 'from its root under the skin to its tip (an estimate)'), v: measured('fingernail growth', 3.47, 'mm/mo', 'Yaemsiri, Hou, Slade & Jiang 2010, J Eur Acad Dermatol Venereol 24:420') }, 'a fingernail regrown');
  const toenail = solve('distance.speed-time', 't', { x: estimate('a big toenail\'s length', 20, 'mm', 'an estimate'), v: measured('toenail growth', 1.62, 'mm/mo', 'Yaemsiri et al. 2010') }, 'a big toenail regrown');
  out.push(F({ id: 'nails', name: 'nails regrown', by: 'nail', makes: 'keratin', rate: nail, unit: 'mo', also: [{ d: toenail, unit: 'mo' }] }));
  // ---- earwax: the canal's skin creeps out --------------------------------------------------------------------------
  const wax = solve('distance.speed-time', 't', { x: estimate('the waxy outer third of the ear canal', 8, 'mm', 'a third of 25 mm'), v: estimate('the canal\'s skin creeping outward', 0.05, 'mm/d', 'about 0.05 mm a day (typical, after Alberti 1964)') }, 'earwax carried out');
  out.push(F({ id: 'earwax', name: 'earwax carried out of the ear', by: 'ceruminous-gland', makes: 'cerumen', rate: wax, unit: 'd', also: [] }));
  return out;
}
/** A volume made in a time, over a day, as a flow. */
function perDay(v: Derivation): Derivation { return solve('residence.stock', 'Q', { V: v, tau: DAY }, `${v.name}, a day`); }

/** A flow to read: its rate in its unit, what follows, and how it sits against what is measured. */
export function flowLines(f: Flow): string[] {
  const v = valueIn(f.rate, f.unit)!, per = /\/|^1\//.test(f.unit) || ['mo', 'd'].includes(f.unit) ? '' : ' a day';
  const lines = [`${f.name}: ${+v.toPrecision(3)} ${f.unit}${per}${f.measured ? ` (measured ${f.measured.lo}–${f.measured.hi} ${f.measured.unit}: ${f.measured.source}) ${v >= f.measured.lo && v <= f.measured.hi ? '✓' : '✗ the laws and the measurement disagree'}` : ''}`];
  for (const a of f.also) lines.push(`  ${a.d.name}: ${+valueIn(a.d, a.unit)!.toPrecision(3)} ${a.unit}`);
  return lines;
}
