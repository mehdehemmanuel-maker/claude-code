// Lifetime as what it is: not a number a thing carries, but how long it lasts where it is. A thing lasts while what
// holds it together outlasts what takes it apart: its margin (a millimetre of steel, a concrete's cover, a wood's
// strength, a body's core temperature) over the rate its surroundings take it, and every rate here is a chain of the
// universal laws (src/nexus/book/universal.ts) over what is measured of it, so each lifetime keeps its breakdown:
//
//   concrete: Powers' porosity from its water–cement ratio → Papadakis's CO₂ diffusivity at the place's humidity → the
//     CO₂ in the air by the ideal gas → the lime it can bind by stoichiometry → the diffusion front reaching its cover;
//     then its steel rusting, stage after stage.
//   steel under water: oxygen dissolved by Henry's law → its flux to the metal by Fick → the current it carries by
//     Faraday → the thickness that current dissolves. In air: ISO 9223's measured rates, gated by the water film the
//     humidity allows, scaled by Arrhenius.
//   wood: the water it holds at the place's humidity by its sorption isotherm (GAB) → rot only above the 20 % fungi need,
//     with oxygen, at the speed Arrhenius gives the fungi; else slow oxidation by Arrhenius.
//   a body: its heat balance (its own heat against conduction, convection, radiation and evaporation, each its law),
//     its want of oxygen, its dose of radiation, and its ageing by the Gompertz–Makeham law's integral.
//   a tardigrade: dried into a tun it stops its clock; it still has a dose it cannot outlast.

import { breakdown, estimate, fixed, lawsUnder, measured, setting, solve, step } from '../lawgraph';
import type { Derivation } from '../evaluate';
import { INVENTORY, gramsOfItem } from '../inventory';
import { wattsOf } from './time';

/** Where a thing is. */
export interface Env { name: string; says: string; /** °C */ T: number; /** relative humidity, 0–1 */ rh: number; /** liquid water on or round it */ wet: boolean; /** oxygen's partial pressure, kPa */ o2: number; /** chloride (sea salt, de-icing) */ salt: boolean; /** absorbed dose rate, Gy a year */ dose: number; /** in water (for heat loss) */ inWater?: boolean; /** air pressure, kPa */ p: number }
export const ENVS: Record<string, Env> = {
  body: { name: 'inside a body', says: '37 °C, wet, oxygen at tissue pressure', T: 37, rh: 1, wet: true, o2: 5, salt: true, dose: 0.0024, p: 101 },
  room: { name: 'a room', says: '20 °C, 45 % humidity', T: 20, rh: 0.45, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  outdoors: { name: 'outdoors (temperate town)', says: '10 °C mean, 80 % humidity, rain: ISO 9223 class C3', T: 10, rh: 0.8, wet: true, o2: 21, salt: false, dose: 0.0024, p: 101 },
  seaside: { name: 'by the sea', says: '12 °C, 85 % humidity, salt spray: ISO 9223 class C5', T: 12, rh: 0.85, wet: true, o2: 21, salt: true, dose: 0.0024, p: 101 },
  desert: { name: 'a hot desert', says: '30 °C mean, 15 % humidity', T: 30, rh: 0.15, wet: false, o2: 21, salt: false, dose: 0.003, p: 101 },
  soil: { name: 'in the ground', says: '12 °C, damp soil', T: 12, rh: 1, wet: true, o2: 15, salt: false, dose: 0.0024, p: 101 },
  'fresh water': { name: 'under fresh water', says: '10 °C lake water', T: 10, rh: 1, wet: true, o2: 21, salt: false, dose: 0.0024, inWater: true, p: 101 },
  'cold water': { name: 'in cold water', says: '5 °C water', T: 5, rh: 1, wet: true, o2: 21, salt: true, dose: 0.0024, inWater: true, p: 101 },
  sea: { name: 'under the sea', says: '10 °C sea water', T: 10, rh: 1, wet: true, o2: 21, salt: true, dose: 0.0024, inWater: true, p: 101 },
  freezer: { name: 'a freezer', says: '−18 °C, dry', T: -18, rh: 0.3, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  arctic: { name: 'arctic winter', says: '−30 °C', T: -30, rh: 0.7, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  compost: { name: 'an industrial compost heap', says: '58 °C, wet: where PLA is meant to break down', T: 58, rh: 1, wet: true, o2: 15, salt: false, dose: 0.0024, p: 101 },
  'dry vault': { name: 'a dry sealed vault', says: '15 °C, 30 % humidity, still', T: 15, rh: 0.3, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  'hot humid': { name: 'a hot, humid day', says: '38 °C, 70 % humidity', T: 38, rh: 0.7, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  space: { name: 'open space (low Earth orbit)', says: 'vacuum, −100 to +120 °C, about 0.15 Gy a year (the ISS inside is about 0.15–0.3)', T: 10, rh: 0, wet: false, o2: 0, salt: false, dose: 0.15, p: 0 },
  mars: { name: 'the surface of Mars', says: '−60 °C, 0.6 kPa of CO₂, about 0.08 Gy a year (Curiosity\'s RAD)', T: -60, rh: 0, wet: false, o2: 0.0008, salt: false, dose: 0.08, p: 0.6 },
  volcano: { name: 'a volcanic vent', says: '300 °C gas', T: 300, rh: 0.5, wet: false, o2: 10, salt: false, dose: 0.0024, p: 101 },
};
const K0 = 273.15, YEAR = 31556952;
const place = (e: Env) => `the place: ${e.name} (${e.says})`;
const Tof = (e: Env, name = 'its temperature') => setting(name, e.T + K0, 'K', place(e));
const rhOf = (e: Env) => setting('its humidity', e.wet ? 1 : e.rh, '-', place(e));
/** How much faster a process with activation energy Ea (kJ/mol) runs at T than at Tref (°C), by its law. */
export const arrhenius = (Ea: number, T: number, Tref: number): number => step('arrhenius.ratio', { Ea: setting('activation energy', Ea * 1000, 'J/mol', 'the caller'), T: setting('temperature', T + K0, 'K', 'the caller'), Tref: setting('reference', Tref + K0, 'K', 'the caller') }).value!;
const arr = (Ea: number, why: string, e: Env, Tref: number, name = 'rate here over at the reference') => step('arrhenius.ratio', { Ea: estimate('activation energy', Ea * 1000, 'J/mol', why), T: Tof(e), Tref: fixed('reference temperature', Tref + K0, 'K', `${Tref} °C`) }, name);

/** What a mechanism comes to in a place: a time with its breakdown, or never, with why. */
type Outcome = { t: Derivation; says: string } | { never: string };
interface Mechanism { name: string; at: (e: Env) => Outcome }

// ---- metals ----------------------------------------------------------------------------------------------------------------
interface Metal { name: string; M: number; n: number; rho: number; /** keeps a film that stops oxygen's full current under water (stainless, aluminium, copper, zinc); iron's rust does not */ passive: boolean; iso: { C1: number; C3: number; C5: number; water: number } }
/** Corrosion: in water, the oxygen that reaches it (Henry, Fick, Faraday) for a metal that is not passive, or its measured
 *  rate for one that is; in air, ISO 9223's first-year rate for the place's class, nothing without the water film the
 *  humidity allows, by Arrhenius from the class's mean temperature. The time to lose a margin of the metal. */
function corrosion(m: Metal, marginUm: number): Mechanism {
  return {
    name: `corrosion of ${m.name}`, at: (e) => {
      if (e.p < 1 || e.o2 < 0.5) return { never: 'no oxygen to corrode with' };
      const margin = estimate(`${m.name} it can lose`, marginUm, 'um', 'the margin: a millimetre of section, or what a coating allows (an estimate)');
      let v: Derivation, how: string;
      if (e.inWater && !m.passive) {
        const C = step('henry.solubility', { p: setting('oxygen\'s partial pressure', e.o2 * 1000, 'Pa', place(e)), kH: measured('Henry constant of O₂ in water', 769.23e-3 * 101325, 'Pa m^3/mol', 'Sander 2015, at 25 °C (more soluble cold, less in salt water: left out, an estimate)') }, 'oxygen dissolved');
        const J = step('fick.diffusion', { D: measured('diffusivity of O₂ in water', 2.1e-9, 'm^2/s', 'about 2.0–2.4 × 10⁻⁹ m²/s at 25 °C (Han & Bartels 1996, J Phys Chem 100:5597)'), dC: C, L: estimate('the still layer it crosses', 1, 'mm', 'a diffusion layer and loose rust about a millimetre in still water (an estimate)') }, 'oxygen reaching the metal');
        const i = step('faraday.flux', { n: fixed('electrons an O₂ takes', 4, '-', 'O₂ + 2H₂O + 4e⁻ → 4OH⁻'), J }, 'corrosion current');
        v = step('corrosion.penetration', { i, M: measured(`molar mass of ${m.name}`, m.M, 'g/mol', 'IUPAC'), n: fixed('electrons an atom gives', m.n, '-', 'its valence as it dissolves'), rho: measured(`density of ${m.name}`, m.rho, 'kg/m^3', 'CRC Handbook') }, 'thickness lost');
        how = 'oxygen reaching it through the water, Faraday\'s current';
      } else {
        const cls = e.inWater ? 'water' : e.salt ? 'C5' : e.rh >= 0.6 || e.wet ? 'C3' : 'C1';
        const base = m.iso[cls as keyof Metal['iso']] * (e.inWater && e.salt ? 2 : 1);
        v = measured(`${m.name}'s rate in ${cls === 'water' ? 'water' : `ISO 9223 class ${cls}`}`, base, 'um/yr', cls === 'water' ? 'immersion rates of a passive metal (an estimate of the order)' : `ISO 9223:2012 first-year rates for ${m.name}${cls === 'C1' ? ': below about 60 % humidity no water film forms on it (Vernon 1935)' : ''}`);
        how = cls === 'water' ? 'its passive film, slowly' : `ISO 9223 class ${cls}`;
      }
      let t = solve('distance.speed-time', 't', { x: margin, v }, `time to lose ${marginUm} µm`);
      if (!e.inWater || m.passive) t = step('time.scaled-by-rate', { t0: t, f: arr(20, 'about 20 kJ/mol for atmospheric corrosion (an estimate)', e, e.salt ? 12 : 10) }, 'time here, by Arrhenius');
      if (e.T < -5 && !e.inWater) t = step('time.scaled-by-rate', { t0: t, f: estimate('rate with its water film frozen', 0.05, '-', 'ice stops most of it (an estimate)') }, 'time frozen');
      return { t, says: `${how}: ${+(marginUm / (t.value! / YEAR)).toPrecision(2)} µm a year, ${marginUm} µm in that time` };
    },
  };
}
const METALS: Record<string, Metal> = {
  'steel-low': { name: 'carbon steel', M: 55.845, n: 2, rho: 7850, passive: false, iso: { C1: 1.3, C3: 35, C5: 120, water: 50 } },
  'steel-alloy': { name: 'alloy steel', M: 55.845, n: 2, rho: 7850, passive: false, iso: { C1: 1.3, C3: 35, C5: 120, water: 50 } },
  'cast-iron': { name: 'cast iron', M: 55.845, n: 2, rho: 7200, passive: false, iso: { C1: 1, C3: 30, C5: 100, water: 40 } },
  'stainless-304': { name: 'stainless 304', M: 55.845, n: 2, rho: 8000, passive: true, iso: { C1: 0.01, C3: 0.1, C5: 2, water: 0.5 } },
  'stainless-316': { name: 'stainless 316', M: 55.845, n: 2, rho: 8000, passive: true, iso: { C1: 0.01, C3: 0.05, C5: 0.5, water: 0.2 } },
  'al-6061': { name: 'aluminium', M: 26.982, n: 3, rho: 2700, passive: true, iso: { C1: 0.1, C3: 0.6, C5: 3, water: 2 } },
  'al-6063': { name: 'aluminium', M: 26.982, n: 3, rho: 2690, passive: true, iso: { C1: 0.1, C3: 0.6, C5: 3, water: 2 } },
  copper: { name: 'copper', M: 63.546, n: 2, rho: 8960, passive: true, iso: { C1: 0.1, C3: 1.3, C5: 3, water: 2 } },
  brass: { name: 'brass', M: 64.0, n: 2, rho: 8500, passive: true, iso: { C1: 0.1, C3: 1, C5: 3, water: 2 } },
  zinc: { name: 'zinc', M: 65.38, n: 2, rho: 7140, passive: true, iso: { C1: 0.1, C3: 1.5, C5: 6, water: 10 } },
};

// ---- wood --------------------------------------------------------------------------------------------------------------------
/** The water wood holds where it is: soaked if wet, else by its sorption isotherm at the place's humidity. */
export const woodMoisture = (e: Env): Derivation => e.wet ? estimate('its moisture, soaked', 0.35, '-', 'wet wood holds water past its fibre saturation, about 30 % (Wood Handbook ch. 4)') : step('sorption.gab', { Mm: measured('wood\'s monolayer water', 0.065, '-', 'GAB fitted here to the Wood Handbook\'s EMC table at 21 °C'), C: measured('wood\'s first-layer constant', 8, '-', 'the same fit'), K: measured('wood\'s multilayer constant', 0.78, '-', 'the same fit'), h: rhOf(e) }, 'its moisture');
/** Fungal rot: it needs the wood above the 20 % moisture fungi need, oxygen, and 0–40 °C; from field stakes (EN 252:
 *  untreated pine sapwood in the ground fails in about 4 years at about 25 °C), by Arrhenius for the fungi. */
const rot: Mechanism = {
  name: 'fungal rot', at: (e) => {
    if (e.inWater) return { never: 'under water there is too little oxygen for rot fungi: waterlogged wood lasts millennia' };
    const mc = woodMoisture(e), need = 0.2;
    if (mc.value! < need) return { never: `too dry for rot: it holds ${(mc.value! * 100).toFixed(0)} % water here (by its sorption isotherm), and fungi need about 20 % (Wood Handbook ch. 14)` };
    if (e.o2 < 1 || e.T < 0 || e.T > 40) return { never: e.o2 < 1 ? 'no oxygen for the fungi' : 'too cold or hot for rot fungi to grow' };
    let t = step('time.scaled-by-rate', { t0: measured('stakes in the ground fail', 4, 'yr', 'untreated pine sapwood, EN 252 field tests (typical)'), f: arr(60, 'fungal growth about doubling each 10 °C (an estimate)', e, 25, 'the fungi\'s rate here') }, 'time to rot');
    if (!e.wet) t = step('time.scaled-by-rate', { t0: t, f: estimate('damp, not soaked', Math.min(1, (mc.value! - need) / 0.1), '-', 'rot speeds up from 20 % to fibre saturation at 30 % (an estimate)') }, 'time to rot, damp');
    return { t, says: `rot fungi in wood at ${(mc.value! * 100).toFixed(0)} % moisture` };
  },
};
/** Slow chemistry when nothing else: cellulose's hydrolysis and oxidation by Arrhenius (Ea about 100 kJ/mol), from dry
 *  wood's thousands of years (the Hōryū-ji temple's timbers, 1,300 years). */
const age = (name: string, yearsAt20: number, Ea: number): Mechanism => ({
  name, at: (e) => {
    let t = step('time.scaled-by-rate', { t0: estimate(`${name} at 20 °C, dry`, yearsAt20, 'yr', 'from old timbers, paper and glass (an estimate)'), f: arr(Ea, `${name} (an estimate)`, e, 20) }, `${name} here`);
    if (e.rh > 0.6) t = step('time.scaled-by-rate', { t0: t, f: estimate('damp air', 2, '-', 'moisture about doubles it (an estimate)') }, `${name}, damp`);
    return { t, says: `${name} by Arrhenius at ${e.T} °C` };
  },
});
/** Hydrolysis of a polyester (PLA): its chains cut by water at a rate by Arrhenius and in proportion to the water there. */
const hydrolysis = (name: string, yearsAt25Wet: number, Ea: number): Mechanism => ({
  name: `hydrolysis of ${name}`, at: (e) => {
    const water = e.wet ? 1 : e.rh; if (water < 0.05) return { never: 'too dry to hydrolyse' };
    const wet = step('time.scaled-by-rate', { t0: estimate(`${name} broken down wet at 25 °C`, yearsAt25Wet, 'yr', 'its molecular weight falling to brittleness (an estimate)'), f: arr(Ea, 'polyester hydrolysis (an estimate)', e, 25) }, 'time here, wet');
    return { t: step('time.scaled-by-rate', { t0: wet, f: setting('water there is, as a share', water, '-', place(e)) }, `hydrolysis of ${name} here`), says: `hydrolysis at ${e.T} °C` };
  },
});
/** Steel in concrete, once its passive film is gone: in air at the place's corrosion rate; under water by the oxygen
 *  that can reach it through the saturated cover (Henry, Fick, Faraday), which is little. */
function rebarRust(e: Env, coverMm: number): Outcome {
  if (!e.inWater) return corrosion(METALS['steel-low']!, 100).at(e);
  const C = step('henry.solubility', { p: setting('oxygen\'s partial pressure', e.o2 * 1000, 'Pa', place(e)), kH: measured('Henry constant of O₂ in water', 769.23e-3 * 101325, 'Pa m^3/mol', 'Sander 2015, at 25 °C') }, 'oxygen dissolved');
  const J = step('fick.diffusion', { D: estimate('O₂ through water-saturated concrete', 5e-11, 'm^2/s', 'about 10⁻¹¹–10⁻¹⁰ m²/s (an estimate)'), dC: C, L: measured('cover to the steel', coverMm, 'mm', 'its cover') }, 'oxygen reaching the steel');
  const v = step('corrosion.penetration', { i: step('faraday.flux', { n: fixed('electrons an O₂ takes', 4, '-', 'O₂ + 2H₂O + 4e⁻ → 4OH⁻'), J }, 'its current'), M: measured('molar mass of iron', 55.845, 'g/mol', 'IUPAC'), n: fixed('electrons an atom gives', 2, '-', 'Fe → Fe²⁺'), rho: measured('density of steel', 7850, 'kg/m^3', 'CRC Handbook') }, 'thickness lost');
  return { t: solve('distance.speed-time', 't', { x: estimate('steel lost before the cover cracks', 100, 'um', 'about 50–100 µm (an estimate)'), v }, 'rust until the cover cracks'), says: 'oxygen starved: little reaches it through the saturated cover' };
}
/** Concrete: carbonation reaches its steel, then the steel rusts until the cover cracks. */
const carbonation = (coverMm: number, wc: number): Mechanism => ({
  name: 'carbonation to the rebar, then rust', at: (e) => {
    if (e.o2 < 1 || e.p < 1) return { never: 'no air to carbonate it' };
    // its pores hold the air's humidity (rain wets only its skin for a while); under water or in wet ground they are full
    const rh = setting('its pores\' humidity', e.inWater || e.rh >= 1 ? 1 : e.rh, '-', place(e)); if (rh.value! >= 1) return { never: 'its pores full of water: CO₂ cannot get in (it carbonates only where its pores are partly dry)' };
    const eps = step('porosity.powers', { wc: estimate('water–cement ratio', wc, '-', 'ordinary structural concrete about 0.5–0.6 (an estimate)'), alpha: estimate('degree of hydration', 0.8, '-', 'about 0.8 after a year (typical)') }, 'its paste\'s porosity');
    const D = step('diffusivity.papadakis', { eps, rh }, 'CO₂ diffusivity through it');
    const C = step('gas.concentration', { x: measured('CO₂ in air', 420e-6, '-', 'NOAA GML, 2023 mean 419.3 ppm'), p: setting('air pressure', e.p * 1000, 'Pa', place(e)), T: Tof(e) }, 'CO₂ at its surface');
    const cao = step('share.of', { w: measured('lime in cement', 0.63, '-', 'Portland cement about 63–65 % CaO (Taylor, Cement Chemistry, 1997)'), M: estimate('cement in a cubic metre', 300, 'kg', 'a typical structural mix') }, 'lime in a cubic metre');
    const bindable = step('share.of', { w: estimate('lime that can carbonate', 0.75, '-', 'its portlandite and most of its C-S-H (an estimate)'), M: cao }, 'lime that can carbonate');
    const a = solve('amount.concentration', 'c', { n: step('moles.of-mass', { m: bindable, M: fixed('molar mass of CaO', 0.056077, 'kg/mol', 'IUPAC') }, 'moles of it'), V: fixed('a cubic metre', 1, 'm^3', 'the volume it is in') }, 'CO₂ it can bind a volume');
    const t1 = solve('diffusion.front', 't', { x: measured('cover to the steel', coverMm, 'mm', 'EN 1992-1-1 nominal cover for a building, about 30 mm (typical)'), D, C, a }, 'carbonation reaches the steel');
    const rust = rebarRust(e, coverMm);
    if ('never' in rust) return { t: t1, says: `carbonation reaches the steel; then ${rust.never}` };
    const t = step('stages.series', { t1, t2: rust.t }, 'until the cover cracks');
    return { t, says: `carbonation reaches the steel in ${yearsSays(t1.value! / YEAR)}, then rust (${rust.says.split(':')[0]}) cracks the cover` };
  },
});
/** Chloride from sea salt diffusing in from the surface by Fick's second law, until what reaches the steel passes the
 *  threshold that breaks its passive film; then the steel rusts until the cover cracks. */
const chlorides = (coverMm: number): Mechanism => ({
  name: 'chloride to the rebar, then rust', at: (e) => {
    if (!e.salt || e.p < 1) return { never: 'no salt to carry chloride in' };
    const Cs = estimate('chloride at its surface', 0.003, '-', 'by the sea about 0.3 % of the concrete by mass (an estimate; 2–5 % of its cement)');
    const Ccrit = measured('chloride that breaks the steel\'s film', 0.0005, '-', 'about 0.4 % of the cement, 0.05 % of the concrete (Glass & Buenfeld 1997, Corros Sci 39:1001: 0.2–2.5 % of cement found)');
    const D = estimate('chloride diffusivity in it', 1e-12, 'm^2/s', 'apparent, aged, at a water–cement ratio of 0.55: about 0.5–2 × 10⁻¹² m²/s (an estimate)');
    const x = measured('cover to the steel', coverMm, 'mm', 'EN 1992-1-1 nominal cover for a building, about 30 mm (typical)');
    const t1 = solve('diffusion.erf', 't', { C: Ccrit, Cs, x, D }, 'chloride at the steel reaches its threshold', [1e5, 1e12]);
    if (t1.value === null) return { never: 'chloride never reaches the threshold at the steel' };
    const check = step('diffusion.erf', { Cs, x, D, t: t1 }, 'chloride at the steel then');
    const rust = rebarRust(e, coverMm);
    if ('never' in rust) return { t: t1, says: `chloride reaches the steel's threshold (${(check.value! * 100).toFixed(3)} %); then ${rust.never}` };
    return { t: step('stages.series', { t1, t2: rust.t }, 'until the cover cracks'), says: `chloride reaches the steel's threshold in ${yearsSays(t1.value! / YEAR)} (Fick's second law, the error function), then rust cracks the cover` };
  },
});
/** Ozone and sunlight cracking natural rubber: years outdoors, far longer in the dark. */
const ozone: Mechanism = {
  name: 'ozone and light cracking', at: (e) => {
    if (e.o2 < 1) return { never: 'no ozone without oxygen' };
    const dark = e.name.startsWith('a room') || e.name.includes('vault');
    return { t: step('time.scaled-by-rate', { t0: estimate(dark ? 'rubber kept indoors' : 'rubber outdoors', dark ? 25 : 6, 'yr', 'typical service lives'), f: arr(60, 'ozone attack (an estimate)', e, 15) }, 'ozone cracking here'), says: dark ? 'ozone indoors, slowly' : 'ozone and UV outdoors' };
  },
};

/** What wears each material, by its laws. */
const MATERIAL_WEAR: Record<string, Mechanism[]> = {
  ...Object.fromEntries(Object.entries(METALS).map(([id, m]) => [id, [corrosion(m, id === 'zinc' ? 85 : 1000)]])),
  wood: [rot, age('slow oxidation and hydrolysis', 5000, 100)], 'wood-veneer': [rot, age('slow oxidation and hydrolysis', 3000, 100)], paper: [rot, age('acid hydrolysis of cellulose', 300, 100)],
  pla: [hydrolysis('PLA', 20, 80)], concrete: [carbonation(30, 0.55), chlorides(30)], rubber: [ozone], gold: [], glass: [age('leaching of the glass', 1e6, 80)],
};

// ---- a body --------------------------------------------------------------------------------------------------------------
const nothing = (name: string) => setting(name, 0, 'W', 'nothing');
/** A body's heat, made and lost, by its laws: in cold, the heat it loses through its tissue and then the water or air
 *  (convection and radiation) against the most it can make shivering; in heat, what comes in by convection and
 *  radiation and what it makes against the most sweat can evaporate. */
export function bodyHeat(e: Env, body = 'human'): { lose?: { t: Derivation; says: string }; gain?: { t: Derivation; says: string }; notes: Derivation[] } {
  const mass = (gramsOfItem(INVENTORY.get(body)!) ?? 73000) / 1000, A = measured('skin area', 1.9, 'm^2', 'ICRP 89');
  const rest = setting('heat made at rest', wattsOf(body), 'W', 'its tissues\' masses times their resting rates (Elia 1992)');
  const store = (dT: number, why: string) => step('heat.capacity', { m: measured('body mass', mass, 'kg', 'the body\'s tree'), c: measured('body\'s specific heat', 3500, 'J/kg K', 'about 3.47 kJ/kg K (typical)'), dT: measured(why, dT, 'K', 'typical clinical limits') }, why);
  const notes: Derivation[] = [];
  let lose: { t: Derivation; says: string } | undefined, gain: { t: Derivation; says: string } | undefined;
  if (e.T < 30) {
    const tissue = estimate('tissue\'s conductance, vessels shut', 15, 'W/m^2 K', 'about 15 W/m² K through fat and shut-down skin (an estimate)');
    const outside = e.inWater ? estimate('water\'s convection', 200, 'W/m^2 K', 'still water against skin about 100–300 W/m² K (an estimate)') : e.p < 1 ? null
      : step('conductance.parallel', { h1: step('convection.natural', { dT: setting('skin over air', Math.max(1, (37 - e.T) / 2), 'K', 'skin about halfway between core and air (an estimate)'), L: estimate('a limb\'s size', 0.3, 'm', 'an estimate') }, 'convection to the air'), h2: step('radiation.linear', { eps: measured('skin\'s emissivity', 0.97, '-', 'typical'), T: setting('mean of skin and air', (37 + e.T) / 2 + K0, 'K', 'an estimate') }, 'radiation to the room') }, 'air\'s conductance');
    if (outside) {
      const loss = step('conduction.series', { A, dT: setting('core over the place', 37 - e.T, 'K', place(e)), h1: tissue, h2: outside }, 'heat lost');
      const net = step('power.net', { Pout: loss, Pin: setting('heat made shivering', 4 * wattsOf(body), 'W', 'shivering raises heat about 4-fold at most (typical)') }, 'heat lost over heat made');
      notes.push(loss);
      if (net.value! > 0) lose = { t: solve('energy.power-time', 't', { E: store(9, 'core cooling from 37 to 28 °C'), P: net }, 'until the core reaches 28 °C'), says: `losing ${Math.round(net.value!)} W more than it makes at ${e.T} °C ${e.inWater ? 'in water' : 'in air'}: its core falls from 37 to 28 °C, where the heart can stop (heat balance)` };
    }
  }
  if (e.T > 30 && !e.inWater && e.p > 1) {
    const hc = step('convection.natural', { dT: setting('air over skin', Math.max(1, Math.abs(e.T - 35)), 'K', place(e)), L: estimate('a limb\'s size', 0.3, 'm', 'an estimate') }, 'convection');
    const dry = e.T > 35 ? step('convection', { h: hc, A, dT: setting('air over skin', e.T - 35, 'K', place(e)) }, 'heat in from the air') : nothing('no heat in from cooler air');
    const sun = e.T > 35 ? step('radiation', { eps: measured('skin\'s emissivity', 0.97, '-', 'typical'), A, T: setting('surroundings', e.T + K0, 'K', place(e)), Tinf: measured('skin temperature', 35 + K0, 'K', 'about 35 °C in heat (typical)') }, 'heat in by radiation') : nothing('no heat in by radiation');
    const psat = (T: number, name: string) => step('vapour.pressure', { p0: measured('vapour pressure at 25 °C', 3169.9, 'Pa', 'IAPWS-95'), T0: fixed('25 °C', 298.15, 'K', 'reference'), T: setting(name, T + K0, 'K', place(e)), L: measured('latent heat at 25 °C', 2.442e6, 'J/kg', 'IAPWS-95'), M: fixed('molar mass of water', 0.018015, 'kg/mol', 'IUPAC') }, `saturation vapour pressure at ${T} °C`);
    const Emax = step('evaporation.max', { hc, psk: psat(35, 'skin temperature'), pa: step('humidity.vapour-pressure', { phi: rhOf(e), psat: psat(e.T, 'the air\'s temperature') }, 'the air\'s vapour pressure'), A }, 'the most sweat can evaporate');
    const toLose = step('power.sum', { P1: step('power.sum', { P1: dry, P2: sun }, 'heat in'), P2: rest }, 'heat to lose');
    const over = step('power.net', { Pout: toLose, Pin: Emax }, 'heat to lose over what sweat can evaporate');
    notes.push(Emax, toLose);
    if (over.value! > 0) gain = { t: solve('energy.power-time', 't', { E: store(5, 'core heating from 37 to 42 °C'), P: over }, 'until the core reaches 42 °C'), says: `taking in ${Math.round(over.value!)} W more than sweat can evaporate at ${e.T} °C and ${Math.round(e.rh * 100)} % humidity: its core rises to 42 °C (heat balance)` };
  }
  return { lose, gain, notes };
}
/** How long a body lives where it is, and why: the first of its limits it reaches, else its years by the Gompertz–
 *  Makeham law with what the place adds to its hazard. */
function bodyLife(e: Env, ageNow = 30): { t: Derivation; says: string; by: string } {
  const lim: { t: Derivation; says: string; by: string }[] = [];
  const pInspired = e.p < 6 ? 0 : e.o2;
  if (pInspired < 10) lim.push({ t: estimate('time without enough oxygen', ((pInspired / 10) * 30 + 5) * 60, 's', 'consciousness in about 15 s in a vacuum, death in minutes; longer the more oxygen there is (an estimate)'), says: `too little oxygen to breathe (${e.o2} kPa against the 21 of air)`, by: 'its want of oxygen' });
  const heat = bodyHeat(e);
  if (heat.lose) lim.push({ ...heat.lose, by: 'its heat balance' });
  if (heat.gain) lim.push({ ...heat.gain, by: 'its heat balance' });
  const dose = setting('dose rate', e.dose, 'Gy/yr', place(e));
  if (e.dose > 1) lim.push({ t: solve('dose.time', 't', { D: measured('lethal dose', 4.5, 'Gy', 'LD50/60 about 4–5 Gy without care (typical)'), rate: dose }, 'until it reaches a lethal dose'), says: `${e.dose} Gy a year reaches the LD50 of about 4.5 Gy`, by: 'its dose of radiation' });
  const first = lim.sort((a, b) => a.t.value! - b.t.value!)[0];
  if (first && first.t.value! < 50 * YEAR) return first;
  const lam = step('rates.add', { r1: estimate('hazard that does not age (Makeham)', 3e-4, '1/yr', 'set with A so a body in a modern room lives to about 80 (an estimate)'), r2: step('hazard.dose', { k: measured('risk a gray', 0.055, '1/Gy', 'ICRP 103: 5.5 % a sievert'), rate: dose }, 'hazard from radiation') }, 'hazard that does not age');
  const t = step('life.expectancy.gompertz-makeham', { lam, A: estimate('Gompertz hazard at nought', 6e-5, '1/yr', 'set with λ so a body in a modern room lives to about 80 (an estimate)'), G: measured('Gompertz rate', Math.LN2 / 8, '1/yr', 'mortality doubles about every 8 years of adult age (typical)'), a: setting('age now', ageNow, 'yr', 'the caller') }, 'years left');
  return { t, says: `the Gompertz–Makeham law: mortality doubling every 8 years of age${e.dose > 0.01 ? `, with ${e.dose} Gy a year at 5.5 % a sievert` : ''}: about ${Math.round(t.value! / YEAR)} more years from ${ageNow}`, by: 'its limits and its ageing' };
}
/** A tardigrade: active, it lives months; dried out (a tun, cryptobiosis) its metabolism falls to almost none and its clock
 *  all but stops until water comes back; it survives about 5,000 Gy (Jönsson et al. 2005) and open space (FOTON-M3, 2007). */
function tardigradeLife(e: Env): { t: Derivation; says: string; by: string } {
  if (e.T > 150) return { t: estimate('a tun above 150 °C', 60, 's', 'even a tun is cooked (an estimate)'), says: 'above about 150 °C even a tun is cooked', by: 'its state' };
  if (!e.wet || e.T < 0) {
    const record = measured('a tun\'s longest recorded sleep', 30.5, 'yr', 'revived after 30.5 years frozen (Tsujimoto et al. 2016, Cryobiology 72:78)');
    const rad = e.dose > 0 ? solve('dose.time', 't', { D: measured('dose a tun survives', 5000, 'Gy', 'Jönsson et al. 2005'), rate: setting('dose rate', e.dose, 'Gy/yr', place(e)) }, 'until a dose it cannot survive') : null;
    return { t: rad && rad.value! < record.value! ? rad : record, says: 'dried or frozen into a tun: its metabolism near 0.01 % of normal, its clock all but stopped; radiation it shrugs off to about 5,000 Gy', by: 'its state' };
  }
  return { t: estimate('an active tardigrade\'s life', 0.3, 'yr', 'a few months feeding and moulting (an estimate)'), says: 'active in water: it lives a few months feeding and moulting', by: 'its state' };
}

/** How long a thing lasts in a place, and why: worked out from what takes it apart there, with the breakdown. */
export function lifetimeOf(id: string, envName = 'room'): { years: number; by: string; how: string; env: Env; record?: Derivation } | null {
  const e = ENVS[envName] ?? ENVS[Object.keys(ENVS).find((k) => envName.toLowerCase().includes(k)) ?? 'room']!;
  const done = (o: Outcome, by: string) => ('t' in o ? { years: o.t.value! / YEAR, by, how: o.says, env: e, record: o.t } : { years: Infinity, by, how: o.never, env: e });
  if (id === 'human' || id === 'human-body') { const b = bodyLife(e); return done(b, b.by); }
  if (id === 'tardigrade') { const b = tardigradeLife(e); return done(b, b.by); }
  const ms = MATERIAL_WEAR[id]; if (!ms) return null;
  if (!ms.length) return { years: Infinity, by: 'nothing here takes it apart', how: 'it does not corrode or rot: it lasts as long as nothing wears it', env: e };
  const outs = ms.map((m) => ({ m, o: m.at(e) }));
  const timed = outs.filter((x) => 't' in x.o).sort((a, b) => (a.o as { t: Derivation }).t.value! - (b.o as { t: Derivation }).t.value!);
  const first = timed[0] ?? outs[0]!;
  return done(first.o, first.m.name);
}
/** A lifetime with every law and measurement under it, as lines. */
export function lifetimeLines(id: string, envName = 'room'): string[] {
  const l = lifetimeOf(id, envName); if (!l) return [];
  const out = [`${INVENTORY.get(id)?.name ?? id} in ${l.env.name}: ${yearsSays(l.years)} — ${l.by}: ${l.how}`];
  if (l.record) { out.push(`  by ${[...new Set(lawsUnder(l.record).map((x) => x.name))].join(' → ')}`); out.push(...breakdown(l.record, 1)); }
  return out;
}
/** The things it can work lifetimes out for. */
export const LASTING = ['human', 'tardigrade', ...Object.keys(MATERIAL_WEAR)];
/** Basquin's law: cycles a steel lasts at a stress amplitude σa (MPa), from its ultimate strength: σ'f about UTS + 345,
 *  b about −0.09; below the endurance limit (about half its UTS) it does not fail by fatigue. */
export function fatigueCycles(sigmaA: number, uts: number): number {
  if (sigmaA <= 0.5 * uts) return Infinity;
  return step('fatigue.basquin', { sa: setting('stress amplitude', sigmaA, 'MPa', 'the caller'), sf: estimate('fatigue strength coefficient', uts + 345, 'MPa', 'about its ultimate strength plus 345 MPa for steels (Shigley)'), b: estimate('fatigue strength exponent', -0.09, '-', 'about −0.09 for steels (Shigley)') }).value!;
}
/** A time to read. */
export function yearsSays(y: number): string {
  if (!Number.isFinite(y)) return 'indefinitely';
  const s = y * 365.25 * 24 * 3600;
  return s < 120 ? `${Math.round(s)} seconds` : s < 7200 ? `${Math.round(s / 60)} minutes` : s < 172800 ? `${+(s / 3600).toPrecision(2)} hours` : y < 1 / 6 ? `${Math.round(y * 365.25)} days` : y < 2 ? `${+(y * 12).toPrecision(2)} months` : y < 1e4 ? `${+y.toPrecision(2)} years` : `${(y).toExponential(1)} years`;
}

