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
  m: u(L), mm: u(L, 1e-3), cm: u(L, 1e-2), km: u(L, 1e3), in: u(L, 0.0254), inch: u(L, 0.0254), ft: u(L, 0.3048), mi: u(L, 1609.344),
  s: u(T), ms: u(T, 1e-3), min: u(T, 60), h: u(T, 3600), hr: u(T, 3600),
  A: u(I), mA: u(I, 1e-3),
  K: u(K), degC: u(K, 1, 273.15),
  N: u(N), kN: u(N, 1e3), lbf: u(N, 4.4482216152605), kgf: u(N, 9.80665),
  Pa: u(PA), kPa: u(PA, 1e3), MPa: u(PA, 1e6), GPa: u(PA, 1e9), bar: u(PA, 1e5), psi: u(PA, 6894.757293168),
  J: u(J), kJ: u(J, 1e3), MJ: u(J, 1e6), Wh: u(J, 3600), kWh: u(J, 3.6e6),
  W: u(W), kW: u(W, 1e3), hp: u(W, 745.69987158227),
  V: u(V), kV: u(V, 1e3), mV: u(V, 1e-3),
  ohm: u(OHM), mohm: u(OHM, 1e-3), 'Ω': u(OHM), 'mΩ': u(OHM, 1e-3),
  Ah: u([0, 0, 1, 1, 0], 3600), mAh: u([0, 0, 1, 1, 0], 3.6),
  Hz: u([0, 0, -1, 0, 0]), rpm: u([0, 0, -1, 0, 0], (2 * Math.PI) / 60),
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
  [/^(km\/h|kmh|kph|kilometres? per hour|kilometers? per hour)$/i, 'km/h'], [/^(mph|miles? per hour)$/i, 'mi/h'], [/^(m\/s|mps|metres? per second|meters? per second)$/i, 'm/s'],
  [/^(m\/s\^?2|m\/s²|m s-2)$/i, 'm/s^2'], [/^(n[·.\s-]?m|nm|newton[- ]?met(re|er)s?)$/i, 'N m'], [/^(lbf?[·.\s-]?ft|ft[·.\s-]?lbf?)$/i, 'lbf ft'], [/^(in[·.\s-]?lbf?|lbf?[·.\s-]?in)$/i, 'lbf in'],
  [/^(lbf|pounds? force|pound-force)$/i, 'lbf'], [/^(kgf|kilograms? force)$/i, 'kgf'],
  [/^(kg|kgs|kilos?|kilograms?)$/i, 'kg'], [/^(g|grams?)$/i, 'g'], [/^(lbs?|pounds?)$/i, 'lb'], [/^(t|tonnes?)$/i, 't'],
  [/^(mm|millimet(re|er)s?)$/i, 'mm'], [/^(cm|centimet(re|er)s?)$/i, 'cm'], [/^(m|met(re|er)s?)$/i, 'm'], [/^(km|kilomet(re|er)s?)$/i, 'km'], [/^(in|inch|inches|")$/i, 'in'], [/^(ft|foot|feet|')$/i, 'ft'],
  [/^(s|sec|secs|seconds?)$/i, 's'], [/^(min|mins|minutes?)$/i, 'min'], [/^(h|hr|hrs|hours?)$/i, 'h'],
  [/^(a|amps?|amperes?)$/i, 'A'], [/^(ma|milliamps?)$/i, 'mA'], [/^(v|volts?)$/i, 'V'], [/^(w|watts?)$/i, 'W'], [/^(kw|kilowatts?)$/i, 'kW'], [/^(hp|horsepower)$/i, 'hp'],
  [/^(n|newtons?)$/i, 'N'], [/^(kn|kilonewtons?)$/i, 'kN'], [/^(pa)$/i, 'Pa'], [/^(mpa)$/i, 'MPa'], [/^(psi)$/i, 'psi'], [/^(bar)$/i, 'bar'],
  [/^(rpm|revs? per minute)$/i, 'rpm'], [/^(ah|amp[- ]?hours?)$/i, 'Ah'], [/^(wh|watt[- ]?hours?)$/i, 'Wh'], [/^(kwh|kilowatt[- ]?hours?)$/i, 'kWh'], [/^(%|percent)$/i, '%'],
  [/^(j|joules?)$/i, 'J'], [/^(kj|kilojoules?)$/i, 'kJ'], [/^(mj|megajoules?)$/i, 'MJ'], [/^(k|kelvin)$/i, 'K'],
  [/^(°c|degc|celsius|degrees? c)$/i, 'degC'], [/^(deg|degrees?|°)$/i, 'deg'],
];

export interface Said { value: number; unit: string; si: number; dim: Dim; at: number; text: string }

/**
 * Every number with a unit in a sentence, in SI with its dimension, in order: "265 lb", "8 mph", "3/4 in",
 * "20 N·m", "5%".
 */
export function findQuantities(text: string): Said[] {
  const out: Said[] = [];
  const re = /(?:(?<![\w.])(-|minus\s+|−))?(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)\s*(°c|%|"|'|[a-zµΩ°][a-z²^0-9·./ -]{0,24})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[2]!.replace(/\s+/g, '');
    const sign = m[1] ? -1 : 1;
    const value = sign * (raw.includes('/') ? Number(raw.split('/')[0]) / Number(raw.split('/')[1]) : Number(raw));
    // the longest run of words after the number that is a unit people say
    const words = m[3]!.trim().split(/\s+/);
    let unit: string | null = null, used = 0;
    for (let k = Math.min(words.length, 4); k >= 1 && !unit; k--) {
      const cand = words.slice(0, k).join(' ').replace(/[.,;:]+$/, '');
      for (const [pat, sym] of SPOKEN) if (pat.test(cand)) { unit = sym; used = k; break; }
    }
    // no unit after it: look again just past this number (the next number may have one)
    const head = (m[1] ?? '').length + m[2]!.length;
    if (!unit) { re.lastIndex = m.index + head; continue; }
    const p = parseUnit(unit);
    out.push({ value, unit, si: value * p.scale + (p.offset ?? 0), dim: p.dim, at: m.index, text: `${m[1] ?? ''}${m[2]} ${words.slice(0, used).join(' ')}` });
    re.lastIndex = m.index + head + 1 + words.slice(0, used).join(' ').length;
  }
  return out;
}

export const DIMS = { mass: M, length: L, time: T, current: I, temperature: K, force: N, pressure: PA, energy: J, power: W, voltage: V, resistance: OHM, speed: [0, 1, -1, 0, 0] as Dim, accel: [0, 1, -2, 0, 0] as Dim, torque: [1, 2, -2, 0, 0] as Dim, frequency: [0, 0, -1, 0, 0] as Dim, charge: [0, 0, 1, 1, 0] as Dim };
