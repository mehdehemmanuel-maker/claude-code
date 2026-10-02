// Typed parameter schemas. Every adjustable setting of a part, connector, tool or the world is described
// here once; the desktop and VR panels are generated from these descriptors.
// Values are stored in SI; `display` only changes how the UI shows and edits them.

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export type Unit =
  | 'm' | 'kg' | 'N' | 'N/m' | 'N·m' | 'N·m/rad' | 'N·s/m' | 'N·m·s/rad' | 'rad' | 's' | 'Pa' | 'V' | 'rpm/V' | 'Ω'
  | 'rad/s' | 'kg/m³' | 'm/s²' | 'J/m' | 'm/s' | '1' | 'T';

export interface Display {
  unit: string;
  scale: number;
  digits: number;
}

export const DISPLAY: Record<string, Display> = {
  mm: { unit: 'mm', scale: 1000, digits: 1 },
  cm: { unit: 'cm', scale: 100, digits: 1 },
  m: { unit: 'm', scale: 1, digits: 3 },
  kg: { unit: 'kg', scale: 1, digits: 3 },
  g: { unit: 'g', scale: 1000, digits: 1 },
  N: { unit: 'N', scale: 1, digits: 1 },
  kN: { unit: 'kN', scale: 1e-3, digits: 2 },
  'N/mm': { unit: 'N/mm', scale: 1e-3, digits: 2 },
  'N/m': { unit: 'N/m', scale: 1, digits: 0 },
  'N·m': { unit: 'N·m', scale: 1, digits: 2 },
  'N·m/deg': { unit: 'N·m/°', scale: Math.PI / 180, digits: 3 },
  deg: { unit: '°', scale: 180 / Math.PI, digits: 1 },
  s: { unit: 's', scale: 1, digits: 2 },
  MPa: { unit: 'MPa', scale: 1e-6, digits: 1 },
  GPa: { unit: 'GPa', scale: 1e-9, digits: 1 },
  V: { unit: 'V', scale: 1, digits: 1 },
  'rpm/V': { unit: 'rpm/V', scale: 1, digits: 0 },
  'Ω': { unit: 'Ω', scale: 1, digits: 3 },
  rpm: { unit: 'rpm', scale: 60 / (2 * Math.PI), digits: 0 },
  '%': { unit: '%', scale: 100, digits: 0 },
  x: { unit: '×', scale: 1, digits: 2 },
  'kg/m³': { unit: 'kg/m³', scale: 1, digits: 0 },
  'm/s²': { unit: 'm/s²', scale: 1, digits: 3 },
  'N·s/m': { unit: 'N·s/m', scale: 1, digits: 1 },
  'N·m·s/rad': { unit: 'N·m·s/rad', scale: 1, digits: 4 },
  T: { unit: 'T', scale: 1, digits: 2 },
  '': { unit: '', scale: 1, digits: 0 },
};

interface Base {
  key: string;
  label: string;
  group?: string;
  advanced?: boolean;
  help?: string;
}

export interface NumberParam extends Base {
  type: 'number';
  default: number;
  min: number;
  max: number;
  /** Step in display units. */
  step?: number;
  display: keyof typeof DISPLAY;
  /** Integer-valued (counts). */
  integer?: boolean;
  /** Slider on a log scale (spans several decades). */
  log?: boolean;
  /** Stepped in equal steps of `step` (display units) rather than in proportion to the value (e.g. power in %). */
  linear?: boolean;
}

export interface EnumParam extends Base {
  type: 'enum';
  default: string;
  options: { value: string; label: string }[];
}

export interface BoolParam extends Base {
  type: 'bool';
  default: boolean;
}

/** Text not edited by hand (a form's genome): kept as it is, up to `max` characters. */
export interface TextParam extends Base {
  type: 'text';
  default: string;
  max: number;
}

export type ParamDef = NumberParam | EnumParam | BoolParam | TextParam;

export function text(key: string, label: string, def: string, max: number): TextParam {
  return { type: 'text', key, label, default: def, max };
}

export function num(key: string, label: string, def: number, min: number, max: number, display: keyof typeof DISPLAY,
  extra: Partial<NumberParam> = {}): NumberParam {
  return { type: 'number', key, label, default: def, min, max, display, ...extra };
}

export function choice(key: string, label: string, def: string, options: { value: string; label: string }[],
  extra: Partial<EnumParam> = {}): EnumParam {
  return { type: 'enum', key, label, default: def, options, ...extra };
}

export function flag(key: string, label: string, def: boolean, extra: Partial<BoolParam> = {}): BoolParam {
  return { type: 'bool', key, label, default: def, ...extra };
}

export function defaultsOf(defs: ParamDef[]): Params {
  const out: Params = {};
  for (const d of defs) out[d.key] = d.default;
  return out;
}

/** Fill missing values, clamp numbers into range, drop unknown keys, coerce invalid enum values to the default. */
export function sanitizeParams(defs: ParamDef[], values: Params | undefined): Params {
  const out: Params = {};
  for (const d of defs) {
    const v = values?.[d.key];
    if (d.type === 'number') {
      let x = typeof v === 'number' && Number.isFinite(v) ? v : d.default;
      x = Math.min(d.max, Math.max(d.min, x));
      if (d.integer) x = Math.round(x);
      out[d.key] = x;
    } else if (d.type === 'enum') {
      out[d.key] = typeof v === 'string' && d.options.some((o) => o.value === v) ? v : d.default;
    } else if (d.type === 'text') {
      out[d.key] = typeof v === 'string' && v.length <= d.max ? v : d.default;
    } else {
      out[d.key] = typeof v === 'boolean' ? v : d.default;
    }
  }
  return out;
}

export const numberOf = (p: Params, key: string, fallback = 0) => {
  const v = p[key];
  return typeof v === 'number' ? v : fallback;
};

export const stringOf = (p: Params, key: string, fallback = '') => {
  const v = p[key];
  return typeof v === 'string' ? v : fallback;
};

export const boolOf = (p: Params, key: string, fallback = false) => {
  const v = p[key];
  return typeof v === 'boolean' ? v : fallback;
};

export function formatValue(def: NumberParam, v: number) {
  const d = DISPLAY[def.display] ?? DISPLAY['']!;
  return `${(v * d.scale).toFixed(def.integer ? 0 : d.digits)} ${d.unit}`.trim();
}

export function formatQuantity(v: number, display: keyof typeof DISPLAY) {
  const d = DISPLAY[display] ?? DISPLAY['']!;
  return `${(v * d.scale).toFixed(d.digits)} ${d.unit}`.trim();
}

/** Pick a readable force unit. */
export function formatForce(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)} MN`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(1)} kN`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(2)} kN`;
  return `${n.toFixed(a >= 100 ? 0 : 1)} N`;
}

export function formatMass(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  if (kg >= 1) return `${kg.toFixed(kg >= 100 ? 1 : 3)} kg`;
  return `${(kg * 1000).toFixed(1)} g`;
}
