// Lifetime as what it is: not a number a thing carries, but how long it lasts where it is. A thing lasts while what
// holds it together outlasts what takes it apart: its margin (how much it can lose: a millimetre of steel, a strength
// of wood, a body's core temperature, its cells' damage) over the rate its surroundings take it (rust, rot, hydrolysis,
// fatigue, cold, heat, want of oxygen, radiation) less the rate it repairs itself. So the same thing lasts centuries in
// one place and months in another, and a tardigrade that dries itself out stops its clock.
//
// Each mechanism is a law with its measured constants (each named): atmospheric corrosion by ISO 9223's rates, gated
// by the humidity it needs and scaled by Arrhenius; carbonation of concrete as K√t to the depth of its rebar; fungal
// rot of wood, which needs its moisture above about 20 % and oxygen; hydrolysis of polymers by Arrhenius; fatigue of
// metal by Basquin's law; a body's heat balance in cold and heat, its time without oxygen, its dose of radiation, and
// its ageing by the Gompertz–Makeham law of mortality. What each says is worked out, and says how.

/** Where a thing is. */
export interface Env { name: string; says: string; /** °C */ T: number; /** relative humidity, 0–1 */ rh: number; /** liquid water on or round it */ wet: boolean; /** oxygen's partial pressure, kPa */ o2: number; /** chloride (sea salt, de-icing) */ salt: boolean; /** absorbed dose rate, Gy a year */ dose: number; /** in water (for heat loss) */ inWater?: boolean; /** air pressure, kPa */ p: number }
export const ENVS: Record<string, Env> = {
  body: { name: 'inside a body', says: '37 °C, wet, oxygen at tissue pressure', T: 37, rh: 1, wet: true, o2: 5, salt: true, dose: 0.0024, p: 101 },
  room: { name: 'a room', says: '20 °C, 45 % humidity', T: 20, rh: 0.45, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  outdoors: { name: 'outdoors (temperate town)', says: '10 °C mean, 80 % humidity, rain: ISO 9223 class C3', T: 10, rh: 0.8, wet: true, o2: 21, salt: false, dose: 0.0024, p: 101 },
  seaside: { name: 'by the sea', says: '12 °C, 85 % humidity, salt spray: ISO 9223 class C5', T: 12, rh: 0.85, wet: true, o2: 21, salt: true, dose: 0.0024, p: 101 },
  desert: { name: 'a hot desert', says: '30 °C mean, 15 % humidity', T: 30, rh: 0.15, wet: false, o2: 21, salt: false, dose: 0.003, p: 101 },
  soil: { name: 'in the ground', says: '12 °C, damp soil', T: 12, rh: 1, wet: true, o2: 15, salt: false, dose: 0.0024, p: 101 },
  'fresh water': { name: 'under fresh water', says: '10 °C lake water', T: 10, rh: 1, wet: true, o2: 8, salt: false, dose: 0.0024, inWater: true, p: 101 },
  'cold water': { name: 'in cold water', says: '5 °C water', T: 5, rh: 1, wet: true, o2: 8, salt: true, dose: 0.0024, inWater: true, p: 101 },
  sea: { name: 'under the sea', says: '10 °C sea water', T: 10, rh: 1, wet: true, o2: 8, salt: true, dose: 0.0024, inWater: true, p: 101 },
  freezer: { name: 'a freezer', says: '−18 °C, dry', T: -18, rh: 0.3, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  arctic: { name: 'arctic winter', says: '−30 °C, wind', T: -30, rh: 0.7, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  compost: { name: 'an industrial compost heap', says: '58 °C, wet: where PLA is meant to break down', T: 58, rh: 1, wet: true, o2: 15, salt: false, dose: 0.0024, p: 101 },
  'dry vault': { name: 'a dry sealed vault', says: '15 °C, 30 % humidity, still', T: 15, rh: 0.3, wet: false, o2: 21, salt: false, dose: 0.0024, p: 101 },
  space: { name: 'open space (low Earth orbit)', says: 'vacuum, −100 to +120 °C, about 0.15 Gy a year (the ISS inside is about 0.15–0.3)', T: 10, rh: 0, wet: false, o2: 0, salt: false, dose: 0.15, p: 0 },
  mars: { name: 'the surface of Mars', says: '−60 °C, 0.6 kPa of CO₂, about 0.08 Gy a year (Curiosity\'s RAD)', T: -60, rh: 0, wet: false, o2: 0.0008, salt: false, dose: 0.08, p: 0.6 },
  volcano: { name: 'a volcanic vent', says: '300 °C gas', T: 300, rh: 0.5, wet: false, o2: 10, salt: false, dose: 0.0024, p: 101 },
};
const R = 8.314, K0 = 273.15;
/** How much faster a process with activation energy Ea (kJ/mol) runs at T than at Tref (°C). */
export const arrhenius = (Ea: number, T: number, Tref: number): number => Math.exp((-Ea * 1000 / R) * (1 / (T + K0) - 1 / (Tref + K0)));

/** A way a thing comes apart, as a law: how long it takes in a place (years; Infinity where it does not happen there). */
interface Mechanism { name: string; years: (e: Env) => number; how: (e: Env) => string }
/** Atmospheric corrosion: ISO 9223's first-year rate for the place's class, nothing below the humidity it needs, scaled
 *  by Arrhenius from the class's mean temperature; the time to lose a margin of the metal. */
function corrosion(metal: string, rates: { C1: number; C3: number; C5: number; water: number }, Ea: number, marginUm: number): Mechanism {
  const rate = (e: Env) => { if (e.p < 1 || e.o2 < 0.5) return 0; const base = e.inWater ? rates.water * (e.salt ? 2 : 1) : e.salt ? rates.C5 : e.rh >= 0.6 || e.wet ? rates.C3 : rates.C1; return base * arrhenius(Ea, e.T, e.salt ? 12 : 10) * (e.T < -5 && !e.inWater ? 0.05 : 1); };
  return { name: `corrosion of ${metal}`, years: (e) => { const r = rate(e); return r > 0 ? marginUm / r : Infinity; }, how: (e) => `${+rate(e).toPrecision(2)} µm a year (ISO 9223 for ${e.salt && !e.inWater ? 'C5' : e.rh >= 0.6 || e.wet ? 'C3' : 'C1'}, ×${arrhenius(Ea, e.T, 10).toFixed(2)} by Arrhenius at ${e.T} °C, Ea ${Ea} kJ/mol): ${marginUm} µm lost in that time` };
}
/** Fungal rot of wood: it needs the wood's moisture above about 20 % (wet, or air above about 85 %), oxygen, and 5–40 °C;
 *  its rate from field stakes (EN 252: untreated pine sapwood in the ground fails in about 4 years), fastest near 25 °C. */
const rot: Mechanism = {
  name: 'fungal rot', years: (e) => { const damp = e.wet || e.rh > 0.85; if (!damp || e.o2 < 1 || e.T < 0 || e.T > 45 || e.inWater) return Infinity; const t = Math.exp(-(((e.T - 25) / 12) ** 2)); return (4 / t) * (e.wet ? 1 : 3); },
  how: (e) => (e.wet || e.rh > 0.85 ? (e.inWater ? 'under water there is too little oxygen for rot fungi: waterlogged wood lasts millennia' : `rot fungi grow at ${e.T} °C in damp wood (EN 252 stakes in the ground: about 4 years at their best temperature)`) : 'too dry for rot: fungi need the wood above about 20 % moisture'),
};
/** Slow chemistry when nothing else: cellulose's hydrolysis and oxidation by Arrhenius (Ea about 100 kJ/mol), from dry
 *  wood's thousands of years (the Hōryū-ji temple's timbers, 1,300 years). */
const age = (name: string, yearsAt20: number, Ea: number): Mechanism => ({ name, years: (e) => yearsAt20 / arrhenius(Ea, e.T, 20) / (e.rh > 0.6 ? 2 : 1), how: (e) => `${name}: ${yearsAt20} years at 20 °C dry, ×${(1 / arrhenius(Ea, e.T, 20)).toPrecision(2)} at ${e.T} °C by Arrhenius (Ea ${Ea} kJ/mol)` });
/** Hydrolysis of a polyester (PLA): its molecular weight halves at a rate by Arrhenius; it needs water. */
const hydrolysis = (name: string, yearsAt25Wet: number, Ea: number): Mechanism => ({ name: `hydrolysis of ${name}`, years: (e) => { const water = e.wet ? 1 : e.rh > 0.05 ? e.rh : 0; return water ? yearsAt25Wet / arrhenius(Ea, e.T, 25) / water : Infinity; }, how: (e) => `hydrolysis: ${yearsAt25Wet} years wet at 25 °C, ×${(1 / arrhenius(Ea, e.T, 25)).toPrecision(2)} at ${e.T} °C (Ea ${Ea} kJ/mol)` });
/** Carbonation of concrete: its front goes in as K√t, and the rebar starts to rust when it reaches the cover. */
const carbonation = (coverMm: number): Mechanism => ({ name: 'carbonation to the rebar', years: (e) => { if (e.o2 < 1) return Infinity; const K = e.wet && !e.inWater ? 3 : e.inWater ? 0.5 : e.rh > 0.4 ? 5 : 2; return (coverMm / K) ** 2; }, how: (e) => `the carbonated front goes in as K√t (K about ${e.wet && !e.inWater ? 3 : e.inWater ? 0.5 : e.rh > 0.4 ? 5 : 2} mm a √year here); it reaches ${coverMm} mm of cover and the steel starts to rust` });
/** Ozone and sunlight cracking natural rubber: years outdoors, far longer in the dark. */
const ozone: Mechanism = { name: 'ozone and light cracking', years: (e) => (e.o2 < 1 ? Infinity : e.name.startsWith('a room') || e.name.includes('vault') ? 25 : 6 / arrhenius(60, e.T, 15)), how: () => 'ozone and UV cut its chains: about 6 years outdoors (typical), decades in the dark' };

/** What wears each material, by its law. */
const MATERIAL_WEAR: Record<string, Mechanism[]> = {
  'steel-low': [corrosion('carbon steel', { C1: 1.3, C3: 35, C5: 120, water: 50 }, 20, 1000)],
  'cast-iron': [corrosion('cast iron', { C1: 1, C3: 30, C5: 100, water: 40 }, 20, 1000)],
  'steel-alloy': [corrosion('alloy steel', { C1: 1.3, C3: 35, C5: 120, water: 50 }, 20, 1000)],
  'stainless-304': [corrosion('stainless 304', { C1: 0.01, C3: 0.1, C5: 2, water: 0.5 }, 20, 1000)],
  'stainless-316': [corrosion('stainless 316', { C1: 0.01, C3: 0.05, C5: 0.5, water: 0.2 }, 20, 1000)],
  'al-6061': [corrosion('aluminium', { C1: 0.1, C3: 0.6, C5: 3, water: 2 }, 20, 1000)], 'al-6063': [corrosion('aluminium', { C1: 0.1, C3: 0.6, C5: 3, water: 2 }, 20, 1000)],
  copper: [corrosion('copper', { C1: 0.1, C3: 1.3, C5: 3, water: 2 }, 20, 1000)], brass: [corrosion('brass', { C1: 0.1, C3: 1, C5: 3, water: 2 }, 20, 1000)], zinc: [corrosion('zinc', { C1: 0.1, C3: 1.5, C5: 6, water: 10 }, 20, 85)],
  wood: [rot, age('slow oxidation and hydrolysis', 5000, 100)], 'wood-veneer': [rot, age('slow oxidation and hydrolysis', 3000, 100)], paper: [rot, age('acid hydrolysis of cellulose', 300, 100)],
  pla: [hydrolysis('PLA', 20, 80)], concrete: [carbonation(30)], rubber: [ozone], gold: [], glass: [age('leaching of the glass', 1e6, 80)],
};

/** How long a body lives where it is: the first of its limits it reaches, or (where it can live) its life by the
 *  Gompertz–Makeham law with what the place adds. */
function bodyYears(e: Env, ageNow = 30): { years: number; how: string } {
  const lim: [number, string][] = [];
  // without oxygen: consciousness in about 15 s, the brain dies in about 4–6 minutes (typical)
  const pInspired = e.p < 6 ? 0 : e.o2;
  if (pInspired < 10) lim.push([((pInspired / 10) * 30 + 5) / (365.25 * 24 * 60), `too little oxygen to breathe (${e.o2} kPa against the 21 of air; in a vacuum about 15 s of consciousness, death in minutes)`]);
  // heat balance: a body of 73 kg, 1.9 m² of skin, heat capacity 3.5 kJ/kg·K; heat leaves its core through its own
  // tissue (about 15 W/m²K with its skin's vessels shut, typical) and then the water (about 200) or air (about 8), in
  // series, against what it makes (up to about 300 W shivering)
  const hOut = e.inWater ? 200 : e.p < 1 ? 0 : 8, h = hOut ? 1 / (1 / 15 + 1 / hOut) : 0, loss = h * 1.9 * (37 - e.T) - (e.T < 25 ? 300 : 80), C = 73 * 3500;
  if (e.T < 25 && loss > 0) lim.push([(C * (37 - 28)) / loss / (3600 * 24 * 365.25), `losing ${Math.round(loss)} W more than it makes at ${e.T} °C ${e.inWater ? 'in water' : 'in air'} (through its tissue and the ${e.inWater ? 'water' : 'air'} in series): its core falls from 37 to 28 °C (heat balance)`]);
  if (e.T > 36) { const gain = 10 * 1.9 * (e.T - 35) + 80 - (e.rh < 0.5 ? 650 : 650 * (1 - e.rh) * 2); if (gain > 0) lim.push([(C * (42 - 37)) / gain / (3600 * 24 * 365.25), `gaining ${Math.round(gain)} W more than sweat can lose at ${e.T} °C: its core rises to 42 °C (heat balance)`]); }
  // an acute dose of about 4.5 Gy kills half (LD50/60 without care); slower doses add cancer at about 5 % a sievert
  if (e.dose > 1) lim.push([4.5 / e.dose, `${e.dose} Gy a year reaches the LD50 of about 4.5 Gy`]);
  const lethal = lim.sort((a, b) => a[0] - b[0])[0];
  if (lethal && lethal[0] < 50) return { years: lethal[0], how: lethal[1] };
  // Gompertz–Makeham: hazard λ + A·e^(G·age); G = ln 2 / 8 years (mortality doubles about every 8 years of adult age),
  // A and λ set so a body in a modern room lives to about 80; radiation adds about 5 % a sievert to its hazard
  const G = Math.LN2 / 8, A = 6e-5, lam = 3e-4 + 0.05 * e.dose;
  let S = 1, life = 0; for (let t = ageNow; t < 130; t += 0.1) { const mu = lam + A * Math.exp(G * t); life += S * 0.1; S *= Math.exp(-mu * 0.1); }
  return { years: life, how: `the Gompertz–Makeham law: mortality doubling every 8 years of age (G = ln 2/8), A = 6×10⁻⁵, λ = ${+(lam * 1e4).toPrecision(2)}×10⁻⁴ a year${e.dose > 0.01 ? ` with ${e.dose} Gy a year at about 5 % a sievert` : ''}: about ${Math.round(life)} more years from ${ageNow}` };
}
/** A tardigrade: active, it lives months; dried out (tun state, cryptobiosis) its metabolism falls to almost none and
 *  its clock stops until water comes back; it survives about 5,000 Gy (Jönsson et al. 2005) and space (FOTON-M3, 2007). */
function tardigradeYears(e: Env): { years: number; how: string } {
  if (e.T > 150) return { years: 1 / (365.25 * 24 * 60), how: 'above about 150 °C even a tun is cooked' };
  if (!e.wet || e.T < 0) { const r = e.dose / 5000; return { years: r > 0 ? Math.min(30, 1 / r) : 30, how: 'dried or frozen into a tun: its metabolism near 0.01 % of normal, its clock all but stopped; revived after decades in museum moss (about 30 years, a record); radiation it shrugs off to about 5,000 Gy' }; }
  return { years: 0.3, how: 'active in water: it lives a few months (an estimate) feeding and moulting' };
}

/** How long a thing lasts in a place, and why: worked out from what takes it apart there. */
export function lifetimeOf(id: string, envName = 'room'): { years: number; by: string; how: string; env: Env } | null {
  const e = ENVS[envName] ?? ENVS[Object.keys(ENVS).find((k) => envName.toLowerCase().includes(k)) ?? 'room']!;
  if (id === 'human' || id === 'human-body') { const b = bodyYears(e); return { years: b.years, by: 'its limits and its ageing', how: b.how, env: e }; }
  if (id === 'tardigrade') { const b = tardigradeYears(e); return { years: b.years, by: 'its state', how: b.how, env: e }; }
  const ms = MATERIAL_WEAR[id]; if (!ms) return null;
  if (!ms.length) return { years: Infinity, by: 'nothing here takes it apart', how: 'it does not corrode or rot: it lasts as long as nothing wears it', env: e };
  const ys = ms.map((m) => ({ m, y: m.years(e) })).sort((a, b) => a.y - b.y), first = ys[0]!;
  return { years: first.y, by: first.m.name, how: first.m.how(e), env: e };
}
/** The things it can work lifetimes out for. */
export const LASTING = ['human', 'tardigrade', ...Object.keys(MATERIAL_WEAR)];
/** Basquin's law: cycles a steel lasts at a stress amplitude σa (MPa), from its ultimate strength: σ'f about UTS + 345,
 *  b about −0.09; below the endurance limit (about half its UTS) it does not fail by fatigue. */
export function fatigueCycles(sigmaA: number, uts: number): number { if (sigmaA <= 0.5 * uts) return Infinity; const sf = uts + 345, b = -0.09; return 0.5 * (sigmaA / sf) ** (1 / b); }
/** A time to read. */
export function yearsSays(y: number): string {
  if (!Number.isFinite(y)) return 'indefinitely';
  const s = y * 365.25 * 24 * 3600;
  return s < 120 ? `${Math.round(s)} seconds` : s < 7200 ? `${Math.round(s / 60)} minutes` : s < 172800 ? `${+(s / 3600).toPrecision(2)} hours` : y < 1 / 6 ? `${Math.round(y * 365.25)} days` : y < 2 ? `${+(y * 12).toPrecision(2)} months` : y < 1e4 ? `${+y.toPrecision(2)} years` : `${(y).toExponential(1)} years`;
}
