// Units and dimensions. Every quantity the ganglia handle has a dimension in the SI base quantities (mass, length,
// time, current, temperature), and a unit is a scale (and, for Celsius, an offset) onto SI. Two uses:
//   - checking laws: a law is dimensionally homogeneous when changing the size of any base unit rescales its output
//     exactly as its output's dimension says (dimensionsOf + the scaling test in ganglia.test.ts); a misplaced power
//     (d^2 for d^3) fails it
//   - reading what is said: "a 265 lb kart at 8 mph", "20 N·m", "3/4 in": every number with its unit, in SI, with its
//     dimension, so a request is understood whatever units it comes in (findQuantities)

/** Exponents of mass, length, time, current, temperature. */
export type Dim = [number, number, number, number, number];
export const DIMLESS: Dim = [0, 0, 0, 0, 0];

interface UnitDef { dim: Dim; scale: number; offset?: number }
const u = (dim: Dim, scale = 1, offset?: number): UnitDef => ({ dim, scale, ...(offset === undefined ? {} : { offset }) });

const M: Dim = [1, 0, 0, 0, 0], L: Dim = [0, 1, 0, 0, 0], T: Dim = [0, 0, 1, 0, 0], I: Dim = [0, 0, 0, 1, 0], K: Dim = [0, 0, 0, 0, 1];
const N: Dim = [1, 1, -2, 0, 0], PA: Dim = [1, -1, -2, 0, 0], J: Dim = [1, 2, -2, 0, 0], W: Dim = [1, 2, -3, 0, 0];
const V: Dim = [1, 2, -3, -1, 0], OHM: Dim = [1, 2, -3, -2, 0];

/** Units by symbol (as the laws write them, and as people say them). */
export const UNITS: Record<string, UnitDef> = {
  '-': u(DIMLESS), '1': u(DIMLESS), mol: u(DIMLESS), dB: u(DIMLESS), rad: u(DIMLESS), rev: u(DIMLESS, 2 * Math.PI), deg: u(DIMLESS, Math.PI / 180), '%': u(DIMLESS, 0.01),
  kg: u(M), g: u(M, 1e-3), t: u(M, 1000), lb: u(M, 0.45359237), lbs: u(M, 0.45359237), oz: u(M, 0.028349523125),
  m: u(L), mm: u(L, 1e-3), cm: u(L, 1e-2), km: u(L, 1e3), um: u(L, 1e-6), 'µm': u(L, 1e-6), nm: u(L, 1e-9), in: u(L, 0.0254), inch: u(L, 0.0254), ft: u(L, 0.3048), mi: u(L, 1609.344),
  // the astronomical unit, exactly (IAU 2012 Resolution B2)
  au: u(L, 149597870700),
  mg: u(M, 1e-6), ug: u(M, 1e-9), ng: u(M, 1e-12),
  // volumes: the litre is a cubic decimetre (SI Brochure, 9th ed., Table 8); the US gallon 231 cubic inches exactly
  'm^3': u([0, 3, 0, 0, 0]), L: u([0, 3, 0, 0, 0], 1e-3), mL: u([0, 3, 0, 0, 0], 1e-6), cL: u([0, 3, 0, 0, 0], 1e-5), gal: u([0, 3, 0, 0, 0], 231 * 0.0254 ** 3),
  s: u(T), ms: u(T, 1e-3), min: u(T, 60), h: u(T, 3600), hr: u(T, 3600), d: u(T, 86400), wk: u(T, 604800),
  // a month and a year on average in the Gregorian calendar (365.2425 days)
  mo: u(T, 2629746), yr: u(T, 31556952),
  A: u(I), mA: u(I, 1e-3),
  K: u(K), degC: u(K, 1, 273.15), degF: u(K, 5 / 9, 255.3722222222222),
  N: u(N), kN: u(N, 1e3), lbf: u(N, 4.4482216152605), kgf: u(N, 9.80665),
  Pa: u(PA), hPa: u(PA, 100), kPa: u(PA, 1e3), MPa: u(PA, 1e6), GPa: u(PA, 1e9), bar: u(PA, 1e5), psi: u(PA, 6894.757293168),
  J: u(J), kJ: u(J, 1e3), MJ: u(J, 1e6), Wh: u(J, 3600), kWh: u(J, 3.6e6),
  // a dose of radiation: energy absorbed per kilogram (the gray), weighed for harm (the sievert): J/kg (SI Brochure, 9th ed., Table 4)
  Gy: u([0, 2, -2, 0, 0]), Sv: u([0, 2, -2, 0, 0]), krad: u([0, 2, -2, 0, 0], 10), mSv: u([0, 2, -2, 0, 0], 1e-3), uSv: u([0, 2, -2, 0, 0], 1e-6),
  W: u(W), kW: u(W, 1e3), hp: u(W, 745.69987158227), mW: u(W, 1e-3), uW: u(W, 1e-6), MW: u(W, 1e6), GW: u(W, 1e9), TW: u(W, 1e12),
  V: u(V), kV: u(V, 1e3), mV: u(V, 1e-3),
  ohm: u(OHM), mohm: u(OHM, 1e-3), 'Ω': u(OHM), 'mΩ': u(OHM, 1e-3),
  Ah: u([0, 0, 1, 1, 0], 3600), mAh: u([0, 0, 1, 1, 0], 3.6),
  Hz: u([0, 0, -1, 0, 0]), kHz: u([0, 0, -1, 0, 0], 1e3), MHz: u([0, 0, -1, 0, 0], 1e6), GHz: u([0, 0, -1, 0, 0], 1e9), rpm: u([0, 0, -1, 0, 0], (2 * Math.PI) / 60),
  T: u([1, 0, -2, -1, 0]), mT: u([1, 0, -2, -1, 0], 1e-3), F: u([-1, -2, 4, 2, 0]), uF: u([-1, -2, 4, 2, 0], 1e-6), C: u([0, 0, 1, 1, 0]), S: u([-1, -2, 3, 2, 0]), H: u([1, 2, -2, -2, 0]), mH: u([1, 2, -2, -2, 0], 1e-3),
};

const add = (a: Dim, b: Dim, k = 1): Dim => a.map((x, i) => x + k * b[i]!) as Dim;
export const sameDim = (a: Dim, b: Dim) => a.every((x, i) => Math.abs(x - b[i]!) < 1e-9);

/** One factor: "m^2", "s", "K^4". */
function factor(tok: string): { dim: Dim; scale: number; offset?: number } {
  const m = /^([^\^]+)(?:\^(-?\d+(?:\.\d+)?))?$/.exec(tok);
  if (!m) throw new Error(`Not a unit: ${tok}`);
  const def = UNITS[m[1]!];
  if (!def) throw new Error(`Unknown unit ${m[1]}`);
  const p = m[2] ? Number(m[2]) : 1;
  return { dim: def.dim.map((x) => x * p) as Dim, scale: def.scale ** p, ...(def.offset !== undefined && p === 1 ? { offset: def.offset } : {}) };
}

/**
 * A unit as the laws write it: factors separated by spaces, everything after the first "/" in the denominator
 * ("W/m^2 K" is W/(m^2 K), "N m/A" is N m per A).
 */
export function parseUnit(unit: string): { dim: Dim; scale: number; offset?: number } {
  const s = unit.replace(/·/g, ' ').trim();
  const [num, ...rest] = s.split('/');
  let dim: Dim = [...DIMLESS], scale = 1;
  let offset: number | undefined;
  const nums = num!.trim().split(/\s+/).filter(Boolean);
  for (const t of nums) { const f = factor(t); dim = add(dim, f.dim); scale *= f.scale; if (nums.length === 1 && !rest.length) offset = f.offset; }
  for (const t of rest.join(' ').trim().split(/\s+/).filter(Boolean)) { const f = factor(t); dim = add(dim, f.dim, -1); scale /= f.scale; }
  return { dim, scale, ...(offset !== undefined ? { offset } : {}) };
}

export const dimensionOf = (unit: string): Dim => parseUnit(unit).dim;

/** A value in a unit, to SI. */
export function toSI(value: number, unit: string): number {
  const p = parseUnit(unit);
  return value * p.scale + (p.offset ?? 0);
}

/** An SI value in a unit. */
export function fromSI(value: number, unit: string): number {
  const p = parseUnit(unit);
  return (value - (p.offset ?? 0)) / p.scale;
}

// ------------------------------------------------------------------------------------------------ reading speech

/** How people say units, to the symbols above. Longest first, so "km/h" wins over "km". */
const SPOKEN: [RegExp, string][] = [
  [/^(km\/h|kmh|kph|kilometres? per hour|kilometers? per hour)$/i, 'km/h'], [/^(µm\/s|μm\/s|um\/s|microns? per second|micromet(re|er)s? per second)$/i, 'um/s'], [/^(mm\/s|millimet(re|er)s? per second)$/i, 'mm/s'], [/^(cm\/s|centimet(re|er)s? per second)$/i, 'cm/s'], [/^(m\/h|m per hour|met(re|er)s? per hour|met(re|er)s? an hour|m an hour)$/i, 'm/h'],
  [/^(w\/m²|w\/m2|w\/m\^2|watts? per square met(re|er))$/i, 'W/m^2'], [/^(m²|m2|m\^2|square met(re|er)s?|sq m)$/i, 'm^2'], [/^(cm²|cm2|cm\^2|square centimet(re|er)s?)$/i, 'cm^2'], [/^(krad|kilorads?)(\(si\))?$/i, 'krad'], [/^(mph|miles? per hour)$/i, 'mi/h'], [/^(m\/s|mps|metres? per second|meters? per second)$/i, 'm/s'],
  [/^(m\/s\^?2|m\/s²|m s-2)$/i, 'm/s^2'], [/^(N[·.\s-]?m)$/, 'N m'], [/^(n[·.\s-]m|newton[- ]?met(re|er)s?)$/i, 'N m'], [/^(lbf?[·.\s-]?ft|ft[·.\s-]?lbf?)$/i, 'lbf ft'], [/^(in[·.\s-]?lbf?|lbf?[·.\s-]?in)$/i, 'lbf in'],
  [/^(lbf|pounds? force|pound-force)$/i, 'lbf'], [/^(kgf|kilograms? force)$/i, 'kgf'],
  [/^(kg|kgs|kilos?|kilograms?)$/i, 'kg'], [/^(g|grams?)$/i, 'g'], [/^(mg|milligrams?)$/i, 'mg'], [/^(µg|μg|ug|micrograms?)$/i, 'ug'], [/^(ng|nanograms?)$/i, 'ng'], [/^(lbs?|pounds?)$/i, 'lb'], [/^(t|tonnes?)$/i, 't'],
  [/^(m³|m3|m\^3|cubic met(re|er)s?)$/i, 'm^3'], [/^(ml|millilit(re|er)s?)$/i, 'mL'], [/^(cl|centilit(re|er)s?)$/i, 'cL'], [/^(l|lit(re|er)s?)$/i, 'L'], [/^(gal|gallons?)$/i, 'gal'],
  [/^(mm|millimet(re|er)s?)$/i, 'mm'], [/^(cm|centimet(re|er)s?)$/i, 'cm'], [/^(m|met(re|er)s?)$/i, 'm'], [/^(km|kilomet(re|er)s?)$/i, 'km'], [/^(µm|um|μm|microns?|micromet(re|er)s?)$/i, 'um'], [/^(nanomet(re|er)s?)$/i, 'nm'], [/^nm$/, 'nm'], [/^(au|astronomical units?)$/i, 'au'], [/^(in|inch|inches|")$/i, 'in'], [/^(ft|foot|feet|')$/i, 'ft'],
  [/^(s|sec|secs|seconds?)$/i, 's'], [/^(min|mins|minutes?)$/i, 'min'], [/^(h|hr|hrs|hours?)$/i, 'h'], [/^(days?)$/i, 'd'], [/^(weeks?|wks?)$/i, 'wk'], [/^(months?)$/i, 'mo'], [/^(years?|yrs?)$/i, 'yr'],
  [/^(a|amps?|amperes?)$/i, 'A'], [/^(ma|milliamps?)$/i, 'mA'], [/^(v|volts?)$/i, 'V'], [/^(w|watts?)$/i, 'W'], [/^(kw|kilowatts?)$/i, 'kW'], [/^(m[Ww])$/, 'mW'], [/^(milliwatts?)$/i, 'mW'], [/^(µw|μw|uw|microwatts?)$/i, 'uW'], [/^(M[Ww])$/, 'MW'], [/^(megawatts?)$/i, 'MW'], [/^(gw|gigawatts?)$/i, 'GW'], [/^(tw|terawatts?)$/i, 'TW'], [/^(hp|horsepower)$/i, 'hp'],
  [/^(n|newtons?)$/i, 'N'], [/^(kn|kilonewtons?)$/i, 'kN'], [/^(pa|pascals?)$/i, 'Pa'], [/^(kpa|kilopascals?)$/i, 'kPa'], [/^(mpa|megapascals?)$/i, 'MPa'], [/^(gpa|gigapascals?)$/i, 'GPa'], [/^(hpa|hectopascals?|mbar|millibars?)$/i, 'hPa'], [/^(psi)$/i, 'psi'], [/^(bar)$/i, 'bar'],
  [/^(rpm|revs? per minute)$/i, 'rpm'], [/^(ah|amp[- ]?hours?)$/i, 'Ah'], [/^(wh|watt[- ]?hours?)$/i, 'Wh'], [/^(kwh|kilowatt[- ]?hours?)$/i, 'kWh'], [/^(%|percent)$/i, '%'],
  [/^(sv|sieverts?)$/i, 'Sv'], [/^(msv|millisieverts?)$/i, 'mSv'], [/^(µsv|μsv|usv|microsieverts?)$/i, 'uSv'], [/^(gy|grays?)$/i, 'Gy'],
  [/^(j|joules?)$/i, 'J'], [/^(kj|kilojoules?)$/i, 'kJ'], [/^(mj|megajoules?)$/i, 'MJ'], [/^(k|kelvin)$/i, 'K'], [/^(khz|kilohertz)$/i, 'kHz'], [/^(mhz|megahertz)$/i, 'MHz'], [/^(ghz|gigahertz)$/i, 'GHz'],
  [/^(°c|degc|celsius|degrees? (c|celsius|centigrade))$/i, 'degC'], [/^(°f|degf|fahrenheit|degrees? (f|fahrenheit))$/i, 'degF'], [/^(deg|degrees?|°)$/i, 'deg'],
];

export interface Said { value: number; unit: string; si: number; dim: Dim; at: number; text: string }

/**
 * Every number with a unit in a sentence, in SI with its dimension, in order: "265 lb", "8 mph", "3/4 in",
 * "20 N·m", "5%".
 */
export function findQuantities(text: string): Said[] {
  const out: Said[] = [];
  // a number may be written with thousands set apart ("12,000"), and joined to its unit by a hyphen ("a 40-micrometre robot")
  // and said with a word for how many thousands ("1 million tonnes", "20 thousand litres")
  const re = /(?:(?<![\w.])(-|minus\s+|−))?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)(?:\s+(thousand|million|billion|trillion)\b)?(?:\s*-\s*|\s*)(°c|%|"|'|[a-zµμΩ°][a-z²³^0-9·./ -]{0,24})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[2]!.replace(/[\s,]+/g, '');
    const sign = m[1] ? -1 : 1;
    const many = ({ thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 } as Record<string, number>)[(m[3] ?? '').toLowerCase()] ?? 1;
    const value = sign * many * (raw.includes('/') ? Number(raw.split('/')[0]) / Number(raw.split('/')[1]) : Number(raw));
    // the longest run of words after the number that is a unit people say
    // words after it, a hyphen splitting them too ("metre-tall" is "metre", then "tall")
    const words = m[4]!.trim().split(/[\s-]+/);
    let unit: string | null = null, used = 0;
    for (let k = Math.min(words.length, 4); k >= 1 && !unit; k--) {
      const cand = words.slice(0, k).join(' ').replace(/[.,;:]+$/, '');
      for (const [pat, sym] of SPOKEN) if (pat.test(cand)) { unit = sym; used = k; break; }
    }
    // no unit after it: look again just past this number (the next number may have one)
    const head = (m[1] ?? '').length + m[2]!.length;
    if (!unit) { re.lastIndex = m.index + head; continue; }
    const p = parseUnit(unit);
    const said = words.slice(0, used).join(' ');
    out.push({ value, unit, si: value * p.scale + (p.offset ?? 0), dim: p.dim, at: m.index, text: `${m[1] ?? ''}${m[2]}${m[3] ? ` ${m[3]}` : ''} ${said.replace(/[.,;:]+$/, '')}` });
    re.lastIndex = m.index + head + (m[3] ? m[3].length + 1 : 0) + 1 + said.length;
  }
  return out;
}

export const DIMS = { volume: [0, 3, 0, 0, 0] as Dim, mass: M, length: L, time: T, current: I, temperature: K, force: N, pressure: PA, energy: J, power: W, voltage: V, resistance: OHM, speed: [0, 1, -1, 0, 0] as Dim, accel: [0, 1, -2, 0, 0] as Dim, torque: [1, 2, -2, 0, 0] as Dim, frequency: [0, 0, -1, 0, 0] as Dim, charge: [0, 0, 1, 1, 0] as Dim };
