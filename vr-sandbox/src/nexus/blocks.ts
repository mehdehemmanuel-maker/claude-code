// Blocks: what a node on a board can be, kept in one library. A block is known by what it takes and gives (typed
// ports, a number with its unit), what it does (its ability), what it is (its kind) and the fields it serves (its
// domains), so it is found any of the three ways. Every block carries its own tests, inputs with the outputs they must
// give, and where its figures come from; a block whose tests fail is a draft and says so. The laws (src/ganglia/laws.ts)
// come in as calculators, each with its worked example as its test; the parts library and the materials come in as
// cards; a block made from a pipeline (src/nexus/dataflow.ts) comes in as itself, and is placed like any other.
//
// What runs a board of blocks, caches, maps over lists and opens groups is src/nexus/dataflow.ts; this file only says
// what each block is and does.

import { LAWS, isOptional, use as useLaw } from '../ganglia/laws';
import { dimensionOf, fromSI, sameDim, toSI, type Dim } from '../ganglia/units';
import type { Source } from '../ganglia/types';
import { MATERIALS } from '../data/materials';
import { calc, num, type Scope } from './generate';
import { DESIGNED, component, componentFromParams, exampleOf } from './components';
import { FAMILIES } from './families';
import { DENSITY } from './mass';
import { arrayCircle, arrayGrid, arrayLine, boundsOfAll, combine, distinctCount, isAssembly, isPart, massOfAll, mirror, place, placedCount, type Assembly, type Override } from './assembly';
import { massOf } from './mass';
import type { Part } from './kits';
import type { Board } from './boards';

// ---- the three ways a block is found ---------------------------------------------------------------------------------
export type Kind = 'input' | 'card' | 'calculator' | 'law' | 'solver' | 'code' | 'ai' | 'logic' | 'trigger' | 'action' | 'generator' | 'critic' | 'view' | 'group' | 'note' | 'agent' | 'bridge' | 'meta';
export type Ability = 'measure' | 'convert' | 'calculate' | 'solve' | 'optimise' | 'simulate' | 'generate' | 'check' | 'decide' | 'store' | 'show' | 'transform' | 'ask' | 'act' | 'connect';

/** Each kind's colour and mark: the colour says what a block is at a glance, the mark says it again for anyone who cannot
 *  tell the colours apart. */
export const KINDS: Record<Kind, { name: string; hue: string; mark: string }> = {
  input: { name: 'Input', hue: '#26c6da', mark: '⇥' }, card: { name: 'Card', hue: '#4db6ac', mark: '▤' },
  calculator: { name: 'Calculator', hue: '#ffb300', mark: '∑' }, law: { name: 'Law', hue: '#ffd54f', mark: 'ƒ' },
  solver: { name: 'Solver', hue: '#ff8f00', mark: '⟲' }, code: { name: 'Code', hue: '#b388ff', mark: '{}' },
  ai: { name: 'AI', hue: '#f06292', mark: '✦' }, logic: { name: 'Logic', hue: '#42a5f5', mark: '⋔' },
  trigger: { name: 'Trigger', hue: '#c6ff00', mark: '▶' }, action: { name: 'Action', hue: '#ef5350', mark: '⚡' },
  generator: { name: 'Generator', hue: '#66bb6a', mark: '✚' }, critic: { name: 'Critic', hue: '#ff7043', mark: '✓' },
  view: { name: 'Viewer', hue: '#00e5ff', mark: '◉' }, group: { name: 'Group', hue: '#90a4ae', mark: '▣' },
  note: { name: 'Note', hue: '#fff59d', mark: '✎' }, agent: { name: 'Agent', hue: '#e040fb', mark: '☺' },
  bridge: { name: 'Bridge', hue: '#8d6e63', mark: '⇄' }, meta: { name: 'Meta', hue: '#bdbdbd', mark: '⌘' },
};
export const ABILITIES: Record<Ability, string> = {
  measure: 'Measure and enter', convert: 'Convert', calculate: 'Calculate', solve: 'Solve backwards', optimise: 'Optimise',
  simulate: 'Simulate', generate: 'Generate', check: 'Check', decide: 'Compare and decide', store: 'Store', show: 'Show',
  transform: 'Transform', ask: 'Ask', act: 'Act', connect: 'Connect',
};
/** The fields a block serves. A block may serve several (a unit converter serves them all, and says "everyday"). */
export const DOMAINS: { id: string; name: string }[] = [
  { id: 'mechanical', name: 'Mechanical' }, { id: 'structural', name: 'Structural & civil' }, { id: 'electrical', name: 'Electrical' },
  { id: 'electronics', name: 'Electronics & embedded' }, { id: 'controls', name: 'Controls & robotics' }, { id: 'thermal', name: 'Thermal & fluids' },
  { id: 'materials', name: 'Materials' }, { id: 'manufacturing', name: 'Manufacturing' }, { id: 'vehicles', name: 'Vehicles' },
  { id: 'aerospace', name: 'Aerospace' }, { id: 'chemical', name: 'Chemical & process' }, { id: 'energy', name: 'Energy & environment' },
  { id: 'life', name: 'Biomedical & life' }, { id: 'science', name: 'Physics & science' }, { id: 'software', name: 'Software & data' },
  { id: 'math', name: 'Math' }, { id: 'finance', name: 'Business & finance' }, { id: 'operations', name: 'Operations & projects' },
  { id: 'everyday', name: 'Everyday' },
];
const LAW_DOMAIN: Record<string, string> = { mechanics: 'mechanical', structures: 'structural', 'machine elements': 'mechanical', electrical: 'electrical', thermal: 'thermal', fluids: 'thermal', magnetism: 'electrical', materials: 'materials', information: 'software', chemistry: 'chemical', optics: 'science' };

// ---- ports and values -----------------------------------------------------------------------------------------------
/** What travels on a wire: a number (in its port's unit, SI unless the port says otherwise, as a law in degrees Celsius
 *  does; a wire between two units of one kind converts), an integer, yes or no, text, a list of any
 *  of these ("list<number>"), a table (a list of records), a record, a material or part card, an event, or anything. */
export type Type = 'number' | 'integer' | 'boolean' | 'text' | 'any' | 'table' | 'record' | 'material' | 'part' | 'assembly' | 'event' | `list<${string}>`;
export interface PortDef {
  name: string; type: Type;
  /** For a number: its SI unit, so its dimension can be checked ("N", "m", "Pa", "USD"). Money is its currency. */
  unit?: string; label?: string; default?: unknown; optional?: boolean;
  /** Takes many wires; its value is then the list of what each brings. */
  many?: boolean;
  /** An output in the unit of what is wired into this input (a sum of lengths is a length). */
  unitFrom?: string;
}
export interface SettingDef { key: string; label: string; type: 'number' | 'text' | 'code' | 'choice' | 'boolean' | 'quantity'; default: unknown; choices?: string[]; unit?: string }
export interface Ports { inputs: PortDef[]; outputs: PortDef[] }

/** What a block may reach while it runs: its settings, and what the place it runs in gives it (code run off the main
 *  thread, Claude, the room). A block asks for these, so the same board runs in a test, on a page and in the forge. */
export interface Ctx {
  set: Record<string, unknown>;
  code?(lang: string, code: string, inputs: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
  ai?(prompt: string, input: string, signal?: AbortSignal): Promise<{ text: string; by: string }>;
  signal?: AbortSignal;
}
export type Outputs = Record<string, unknown>;
export interface BlockTest { set?: Record<string, unknown>; inputs: Record<string, unknown>; outputs: Record<string, unknown>; rel?: number }

export interface BlockDef {
  id: string; name: string; kind: Kind; ability: Ability; domains: string[]; says: string;
  version: number;
  ports: Ports | ((set: Record<string, unknown>) => Ports);
  settings?: SettingDef[];
  /** What it does. A block made from a pipeline has none: its graph runs instead. */
  run?(inputs: Record<string, unknown>, ctx: Ctx): Outputs | Promise<Outputs>;
  /** A block made from a pipeline: the board it is, with its group.in and group.out nodes as its ports. */
  graph?: Board;
  /** Same inputs, same outputs, and nothing done to the world: run once for any number of uses with those inputs. */
  pure: boolean;
  tests?: BlockTest[];
  sources?: Source[];
  /** Where it holds, and what it leaves out. */
  valid?: string;
  by: 'built in' | 'you' | 'claude' | 'engine';
  /** A sink: what it shows or does is the point, so a branch that ends in it is not dead. */
  sink?: boolean;
}
export const portsOf = (b: BlockDef, set: Record<string, unknown> = {}): Ports => (typeof b.ports === 'function' ? b.ports(set) : b.ports);

/** The element type of a list type, or null. */
export const elemOf = (t: Type): Type | null => { const m = /^list<(.+)>$/.exec(t); return m ? (m[1] as Type) : null; };
const MONEY = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']);
/** A unit's dimension, or null where it has none the units know (money, a count): such units must match by name. */
export function dimOf(unit?: string): Dim | null { if (!unit || MONEY.has(unit)) return null; try { return dimensionOf(unit); } catch { return null; } }

/** Whether a wire may join an output to an input: types that fit, numbers of the same dimension, a list into a single
 *  value mapping the block over it. Says why not where it may not. */
export function fits(out: PortDef, inp: PortDef): { ok: true; map: boolean; convert?: string } | { ok: false; why: string } {
  if (out.type === 'any' || inp.type === 'any') return { ok: true, map: false };
  // a port that takes many wires takes each one's single value as an item of its list
  if (inp.many) { const e = elemOf(inp.type); if (e) { const r = fits(out, { ...inp, many: false, type: e }); if (r.ok) return { ...r, map: false }; } return fits(out, { ...inp, many: false }); }
  const same = (a: Type, b: Type) => a === b || (a === 'integer' && b === 'number') || (a === 'number' && b === 'integer');
  let map = false, ot: Type = out.type;
  if (!same(ot, inp.type) && elemOf(ot) && !elemOf(inp.type)) { ot = elemOf(ot)!; map = true; }
  if (inp.type === 'text' && ot !== 'text' && !elemOf(ot)) return { ok: true, map, convert: `${ot} as text` };
  // a part is an assembly of one: placed, patterned and combined as any assembly is
  if (ot === 'part' && inp.type === 'assembly') return { ok: true, map };
  if (!same(ot, inp.type)) return { ok: false, why: `${out.label ?? out.name} gives ${out.type}, and ${inp.label ?? inp.name} takes ${inp.type}` };
  if ((ot === 'number' || ot === 'integer') && out.unit && inp.unit && out.unit !== inp.unit) {
    const a = dimOf(out.unit), b = dimOf(inp.unit);
    if (!a || !b) return { ok: false, why: `${out.unit} is not ${inp.unit}` };
    if (!sameDim(a, b)) return { ok: false, why: `${out.label ?? out.name} is in ${out.unit} and ${inp.label ?? inp.name} wants ${inp.unit}: not the same kind of quantity` };
    return { ok: true, map, convert: `${out.unit} → ${inp.unit}` };
  }
  return { ok: true, map };
}

/** A value as a person reads it: a number in its unit, with a readable prefix; a list by its length and first items. */
export function show(v: unknown, unit?: string): string {
  if (v === undefined) return '—';
  if (v === null) return 'none';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);
    if (unit && MONEY.has(unit)) return `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
    const pick = unit ? READABLE[unit]?.find(([, k]) => Math.abs(v) >= k * 0.9999) : undefined;
    const [u, k] = pick ?? [unit ?? '', 1];
    const x = v / k, s = Math.abs(x) >= 1e6 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(3).replace(/e\+?(-?)(\d+)$/, (_, m: string, d: string) => `×10${sup(m + d)}`) : String(Number(x.toPrecision(4)));
    return u && u !== '-' ? `${s} ${prettyUnit(u)}` : s;
  }
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'string') return v === '' ? 'none' : v.length > 60 ? `${v.slice(0, 59)}…` : v;
  if (Array.isArray(v)) return v.length && v.every((x) => x === '') ? 'none' : `[${v.length}] ${v.slice(0, 3).map((x) => show(x, unit)).join(', ')}${v.length > 3 ? ', …' : ''}`;
  if (typeof v === 'object') { const o = v as Record<string, unknown>; return String(o.name ?? o.label ?? `{${Object.keys(o).slice(0, 4).join(', ')}}`); }
  return String(v);
}
const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (s: string) => [...s].map((c) => SUP[c] ?? c).join('');
/** A unit as it is printed: m⁴, kg/m³, Ω, °C. */
export const prettyUnit = (u: string): string => u.replace(/\^(-?\d+)/g, (_, d: string) => sup(d)).replace(/\bohm\b/g, 'Ω').replace(/\bdegC\b/g, '°C').replace(/\bdegF\b/g, '°F').replace(/ (?=[A-Za-zΩ])/g, '·');
/** Prefixes to read an SI number in, largest first. */
const READABLE: Record<string, [string, number][]> = {
  N: [['MN', 1e6], ['kN', 1e3], ['N', 1], ['mN', 1e-3]], Pa: [['GPa', 1e9], ['MPa', 1e6], ['kPa', 1e3], ['Pa', 1]],
  m: [['km', 1e3], ['m', 1], ['mm', 1e-3], ['µm', 1e-6], ['nm', 1e-9]], W: [['GW', 1e9], ['MW', 1e6], ['kW', 1e3], ['W', 1], ['mW', 1e-3]],
  J: [['MJ', 1e6], ['kJ', 1e3], ['J', 1], ['mJ', 1e-3]], kg: [['t', 1e3], ['kg', 1], ['g', 1e-3], ['mg', 1e-6]],
  s: [['h', 3600], ['min', 60], ['s', 1], ['ms', 1e-3], ['µs', 1e-6]], A: [['kA', 1e3], ['A', 1], ['mA', 1e-3], ['µA', 1e-6]],
  V: [['kV', 1e3], ['V', 1], ['mV', 1e-3]], ohm: [['MΩ', 1e6], ['kΩ', 1e3], ['Ω', 1], ['mΩ', 1e-3]], Hz: [['GHz', 1e9], ['MHz', 1e6], ['kHz', 1e3], ['Hz', 1]],
  'N m': [['kN m', 1e3], ['N m', 1], ['N mm', 1e-3]], 'm^2': [['m²', 1], ['cm²', 1e-4], ['mm²', 1e-6]], 'm^3': [['m³', 1], ['cm³', 1e-6], ['mm³', 1e-9]], 'm^4': [['m⁴', 1], ['cm⁴', 1e-8], ['mm⁴', 1e-12]],
};

/** A quantity as typed: "200 mm", "3/4 in", "1.5", "25 kN": to SI in the unit asked for, or a reason it cannot be. */
export function readQuantity(text: string, unit?: string): number | { error: string } {
  const t = String(text).trim(); if (!t) return { error: 'nothing typed' };
  const m = /^(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(.*)$/i.exec(t);
  if (!m) { try { return num(t, EMPTY); } catch (e) { return { error: (e as Error).message }; } }
  const v = Number(m[1]), u = m[2]!.trim();
  if (!u) return v;
  try {
    if (unit && dimOf(unit) && !sameDim(dimensionOf(u), dimOf(unit)!)) return { error: `${u} is not a kind of ${unit}` };
    const si = toSI(v, u); return unit && dimOf(unit) ? fromSI(si, unit) : si;
  } catch { return unit && u === unit ? v : { error: `I do not know the unit "${u}"` }; }
}
const EMPTY: Scope = { get: () => undefined, names: () => [] };

// ---- the library ----------------------------------------------------------------------------------------------------
export const LIBRARY = new Map<string, BlockDef>();
/** Every block in the library is the only one that does what it does: a block whose ports and test results match one
 *  already there is that block again, and is not added (its id is said instead, to merge into). */
export function register(b: BlockDef): { id: string; duplicateOf?: string } {
  const twin = [...LIBRARY.values()].find((x) => x.id !== b.id && sameBehaviour(x, b));
  if (twin) return { id: twin.id, duplicateOf: twin.id };
  LIBRARY.set(b.id, b); return { id: b.id };
}
const sig = (p: Ports) => `${p.inputs.map((x) => `${x.type}:${x.unit ?? ''}`).join(',')}>${p.outputs.map((x) => `${x.type}:${x.unit ?? ''}`).join(',')}`;
function sameBehaviour(a: BlockDef, b: BlockDef): boolean {
  if (a.kind !== b.kind || !a.run || !b.run || !a.pure || !b.pure || !a.tests?.length || !b.tests?.length) return false;
  if (sig(portsOf(a)) !== sig(portsOf(b))) return false;
  // the same answers to each other's tests, port for port in order
  const pa = portsOf(a), pb = portsOf(b);
  for (const t of b.tests) {
    const inA = Object.fromEntries(pa.inputs.map((p, i) => [p.name, t.inputs[pb.inputs[i]!.name]]));
    try { const r = a.run(inA, { set: t.set ?? {} }); if (r instanceof Promise) return false; if (!pb.outputs.every((p, i) => near(r[pa.outputs[i]!.name], t.outputs[p.name], t.rel))) return false; } catch { return false; }
  }
  return true;
}
const near = (a: unknown, b: unknown, rel = 1e-6): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= rel * Math.max(1e-12, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => near(x, b[i], rel));
  if (a && b && typeof a === 'object' && typeof b === 'object') return Object.keys(b).every((k) => near((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], rel));
  return a === b;
};
export { near };

/** A block's tests run: each failure in words. A block with none, or with any failing, is a draft. */
export async function testBlock(b: BlockDef, runGraph?: (b: BlockDef, inputs: Record<string, unknown>, set: Record<string, unknown>) => Promise<Outputs>): Promise<{ ok: boolean; fails: string[]; ran: number }> {
  const fails: string[] = [];
  for (const [i, t] of (b.tests ?? []).entries()) {
    try {
      const set = { ...defaultsOf(b), ...(t.set ?? {}) };
      const r = b.run ? await b.run(t.inputs, { set }) : runGraph ? await runGraph(b, t.inputs, set) : null;
      if (!r) { fails.push(`test ${i + 1}: nothing runs it here`); continue; }
      for (const [k, want] of Object.entries(t.outputs)) if (!near(r[k], want, t.rel)) fails.push(`test ${i + 1}: ${k} came to ${show(r[k])}, not ${show(want)}`);
    } catch (e) { fails.push(`test ${i + 1}: ${(e as Error).message}`); }
  }
  return { ok: !!b.tests?.length && !fails.length, fails, ran: b.tests?.length ?? 0 };
}
export const defaultsOf = (b: BlockDef): Record<string, unknown> => Object.fromEntries((b.settings ?? []).map((s) => [s.key, s.default]));

/** The library sorted one of the three ways: domain, ability or kind, each heading with its blocks, by name. */
export function shelves(by: 'domain' | 'ability' | 'kind', q = ''): { id: string; name: string; blocks: BlockDef[] }[] {
  const qq = q.trim().toLowerCase(), all = [...LIBRARY.values()].filter((b) => !b.id.startsWith('group.') && (!qq || `${b.name} ${b.says} ${b.id}`.toLowerCase().includes(qq)));
  const heads = by === 'domain' ? DOMAINS : by === 'ability' ? Object.entries(ABILITIES).map(([id, name]) => ({ id, name })) : Object.entries(KINDS).map(([id, k]) => ({ id, name: k.name }));
  return heads.map((h) => ({ ...h, blocks: all.filter((b) => (by === 'domain' ? b.domains.includes(h.id) : by === 'ability' ? b.ability === h.id : b.kind === h.id)).sort((a, c) => a.name.localeCompare(c.name)) })).filter((s) => s.blocks.length);
}

// ---- built-in blocks ------------------------------------------------------------------------------------------------
const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
const N = (name: string, unit?: string, more: Partial<PortDef> = {}): PortDef => ({ name, type: 'number', ...(unit ? { unit } : {}), ...more });
const BREALEY: Source = { cite: 'Brealey, Myers & Allen, Principles of Corporate Finance, 13th ed., McGraw-Hill 2020, ch. 2 (present values, annuities)', kind: 'textbook' };
const HORNGREN: Source = { cite: 'Datar & Rajan, Horngren\'s Cost Accounting, 17th ed., Pearson 2021, ch. 3 (cost-volume-profit)', kind: 'textbook' };
const SIBROCHURE: Source = { cite: 'BIPM, The International System of Units (SI Brochure), 9th ed., 2019', kind: 'standard' };
const KALPAKJIAN: Source = { cite: 'Kalpakjian & Schmid, Manufacturing Engineering and Technology, 7th ed., Pearson 2014, ch. 21–23 (cutting speed, feed, machining time)', kind: 'textbook' };
const HH: Source = { cite: 'Horowitz & Hill, The Art of Electronics, 3rd ed., Cambridge 2015, ch. 1', kind: 'textbook' };
const DUFFIE: Source = { cite: 'Duffie & Beckman, Solar Engineering of Thermal Processes, 4th ed., Wiley 2013, ch. 23 (photovoltaics); IEC 61724-1 (performance ratio)', kind: 'textbook' };
const ASTROM: Source = { cite: 'Åström & Murray, Feedback Systems, 2nd ed., Princeton 2021, ch. 11 (PID control)', kind: 'textbook' };
const NAKAJIMA: Source = { cite: 'Nakajima, Introduction to TPM: Total Productive Maintenance, Productivity Press 1988 (OEE)', kind: 'textbook' };
const KELLEY: Source = { cite: 'Kelley & Walker, Critical-path planning and scheduling, Proc. Eastern Joint Computer Conference 1959', kind: 'paper' };
type Def = Omit<BlockDef, 'version' | 'by' | 'pure'> & { version?: number; pure?: boolean };
const def = (d: Def): BlockDef => ({ version: 1, by: 'built in', pure: true, ...d });
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const nums = (v: unknown): number[] => asList(v).map(Number).filter((x) => Number.isFinite(x));
/** An expression's names, as its inputs: every name it reads that is not a function or a constant. */
export function namesIn(expr: string): string[] {
  const out: string[] = [], seen = new Set<string>();
  const src = String(expr);
  for (const m of src.matchAll(/(?<![\w.])([A-Za-z_][A-Za-z\d_]*)\b(?!\s*\()/g)) {
    // a word just after a number is its unit ("5 mm"), not a name
    const w = m[1]!; if (seen.has(w) || /^(pi|e|true|false|and|or|not)$/i.test(w) || /\d\s*$/.test(src.slice(0, m.index))) continue; seen.add(w); out.push(w);
  }
  return out;
}
const scope = (vals: Record<string, unknown>): Scope => ({ get: (n) => { const v = vals[n]; return typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : undefined; }, names: () => Object.keys(vals) });

const BUILT_IN: BlockDef[] = [
  // inputs: what enters a board
  def({ id: 'in.number', name: 'Number', kind: 'input', ability: 'measure', domains: ['everyday', 'math'], says: 'A number you set, in any unit: typed "200 mm" is kept as 0.2 m',
    settings: [{ key: 'value', label: 'Value', type: 'quantity', default: 1 }, { key: 'unit', label: 'Unit (SI)', type: 'text', default: '' }],
    ports: (s) => ({ inputs: [], outputs: [N('value', String(s.unit ?? '') || undefined)] }),
    run: (_, c) => { const v = typeof c.set.value === 'number' ? c.set.value : readQuantity(String(c.set.value), String(c.set.unit ?? '') || undefined); if (typeof v !== 'number') throw new Error(v.error); return { value: v }; },
    tests: [{ set: { value: '200 mm', unit: 'm' }, inputs: {}, outputs: { value: 0.2 } }, { set: { value: 5, unit: '' }, inputs: {}, outputs: { value: 5 } }], sources: [SIBROCHURE] }),
  def({ id: 'in.slider', name: 'Slider', kind: 'input', ability: 'measure', domains: ['everyday'], says: 'A number you drag between two ends',
    settings: [{ key: 'value', label: 'Value', type: 'number', default: 50 }, { key: 'min', label: 'From', type: 'number', default: 0 }, { key: 'max', label: 'To', type: 'number', default: 100 }, { key: 'unit', label: 'Unit (SI)', type: 'text', default: '' }],
    ports: (s) => ({ inputs: [], outputs: [N('value', String(s.unit ?? '') || undefined)] }),
    run: (_, c) => ({ value: Math.min(Number(c.set.max), Math.max(Number(c.set.min), Number(c.set.value))) }),
    tests: [{ set: { value: 150, min: 0, max: 100 }, inputs: {}, outputs: { value: 100 } }] }),
  def({ id: 'in.text', name: 'Text', kind: 'input', ability: 'measure', domains: ['everyday'], says: 'Words you type', settings: [{ key: 'value', label: 'Text', type: 'text', default: '' }],
    ports: { inputs: [], outputs: [P('value', 'text')] }, run: (_, c) => ({ value: String(c.set.value ?? '') }), tests: [{ set: { value: 'hi' }, inputs: {}, outputs: { value: 'hi' } }] }),
  def({ id: 'in.toggle', name: 'Yes / no', kind: 'input', ability: 'measure', domains: ['everyday'], says: 'A switch', settings: [{ key: 'value', label: 'On', type: 'boolean', default: false }],
    ports: { inputs: [], outputs: [P('value', 'boolean')] }, run: (_, c) => ({ value: !!c.set.value }), tests: [{ set: { value: true }, inputs: {}, outputs: { value: true } }] }),
  def({ id: 'in.list', name: 'List of numbers', kind: 'input', ability: 'measure', domains: ['everyday', 'math'], says: 'Numbers you type, split by commas: wire it into any block to run that block once for each',
    settings: [{ key: 'value', label: 'Numbers', type: 'text', default: '1, 2, 3' }, { key: 'unit', label: 'Unit (SI)', type: 'text', default: '' }],
    ports: (s) => ({ inputs: [], outputs: [P('value', 'list<number>', String(s.unit ?? '') ? { unit: String(s.unit) } : {})] }),
    run: (_, c) => ({ value: String(c.set.value ?? '').split(/[,;\s]+/).filter(Boolean).map((t) => { const v = readQuantity(t, String(c.set.unit ?? '') || undefined); if (typeof v !== 'number') throw new Error(`"${t}": ${v.error}`); return v; }) }),
    tests: [{ set: { value: '1, 2.5, 4' }, inputs: {}, outputs: { value: [1, 2.5, 4] } }] }),
  def({ id: 'in.range', name: 'Range', kind: 'input', ability: 'generate', domains: ['math'], says: 'Evenly spaced numbers from one end to the other: a sweep',
    settings: [{ key: 'from', label: 'From', type: 'number', default: 0 }, { key: 'to', label: 'To', type: 'number', default: 10 }, { key: 'count', label: 'How many', type: 'number', default: 11 }, { key: 'unit', label: 'Unit (SI)', type: 'text', default: '' }],
    ports: (s) => ({ inputs: [], outputs: [P('value', 'list<number>', String(s.unit ?? '') ? { unit: String(s.unit) } : {})] }),
    run: (_, c) => { const n = Math.max(1, Math.min(1e6, Math.round(Number(c.set.count)))), a = Number(c.set.from), b = Number(c.set.to); return { value: Array.from({ length: n }, (_, i) => (n === 1 ? a : a + ((b - a) * i) / (n - 1))) }; },
    tests: [{ set: { from: 0, to: 1, count: 3 }, inputs: {}, outputs: { value: [0, 0.5, 1] } }] }),
  def({ id: 'in.table', name: 'Table', kind: 'input', ability: 'measure', domains: ['software', 'finance', 'everyday'], says: 'Rows you paste, the first row their headings (comma or tab separated): numbers read as numbers',
    settings: [{ key: 'value', label: 'Rows', type: 'code', default: 'month, in, out\n1, 12000, 9000\n2, 13000, 9500\n3, 11000, 9800' }],
    ports: { inputs: [], outputs: [P('rows', 'table')] },
    run: (_, c) => ({ rows: readTable(String(c.set.value ?? '')) }),
    tests: [{ set: { value: 'a, b\n1, x\n2, y' }, inputs: {}, outputs: { rows: [{ a: 1, b: 'x' }, { a: 2, b: 'y' }] } }] }),

  // math
  def({ id: 'math.expr', name: 'Formula', kind: 'calculator', ability: 'calculate', domains: ['math', 'everyday'], says: 'Any formula: its names become its inputs ("F / (pi * d^2 / 4)"), units in it read as SI ("x + 5 mm")',
    settings: [{ key: 'expr', label: 'Formula', type: 'text', default: 'a * b' }, { key: 'unit', label: 'Result unit (SI)', type: 'text', default: '' }],
    ports: (s) => ({ inputs: namesIn(String(s.expr ?? '')).map((n) => N(n, undefined, { label: n })), outputs: [P('result', 'number', String(s.unit ?? '') ? { unit: String(s.unit) } : {})] }),
    run: (inp, c) => { const v = calc(String(c.set.expr), scope(inp)); return { result: typeof v === 'boolean' ? Number(v) : v }; },
    tests: [{ set: { expr: 'a * b + 1' }, inputs: { a: 3, b: 4 }, outputs: { result: 13 } }, { set: { expr: 'x + 5 mm' }, inputs: { x: 1 }, outputs: { result: 1.005 } }] }),
  ...(['add', 'subtract', 'multiply', 'divide', 'power'] as const).map((op) => def({
    id: `math.${op}`, name: op[0]!.toUpperCase() + op.slice(1), kind: 'calculator', ability: 'calculate', domains: ['math'], says: { add: 'a + b', subtract: 'a − b', multiply: 'a × b', divide: 'a ÷ b', power: 'a to the power b' }[op],
    ports: { inputs: [N('a'), N('b')], outputs: [N('result', undefined, op === 'add' || op === 'subtract' ? { unitFrom: 'a' } : {})] },
    run: (i) => { const a = Number(i.a), b = Number(i.b); if (op === 'divide' && b === 0) throw new Error('divided by zero'); return { result: op === 'add' ? a + b : op === 'subtract' ? a - b : op === 'multiply' ? a * b : op === 'divide' ? a / b : a ** b }; },
    tests: [{ inputs: { a: 6, b: 3 }, outputs: { result: { add: 9, subtract: 3, multiply: 18, divide: 2, power: 216 }[op] } }] })),
  def({ id: 'math.sum', name: 'Sum', kind: 'calculator', ability: 'calculate', domains: ['math', 'finance'], says: 'All the numbers in a list, or on every wire into it, added',
    ports: { inputs: [P('values', 'list<number>', { many: true })], outputs: [N('sum', undefined, { unitFrom: 'values' }), P('count', 'integer')] },
    run: (i) => { const v = nums(asList(i.values).flat()); return { sum: v.reduce((a, b) => a + b, 0), count: v.length }; },
    tests: [{ inputs: { values: [1, 2, 3.5] }, outputs: { sum: 6.5, count: 3 } }] }),
  def({ id: 'math.stats', name: 'Statistics', kind: 'calculator', ability: 'calculate', domains: ['math', 'software'], says: 'The least, the most, the mean, the middle and the spread (sample standard deviation) of a list',
    ports: { inputs: [P('values', 'list<number>')], outputs: (['min', 'max', 'mean', 'median', 'sd'] as const).map((k) => N(k, undefined, { unitFrom: 'values' })) },
    run: (i) => { const v = nums(i.values).sort((a, b) => a - b); if (!v.length) throw new Error('an empty list'); const m = v.reduce((a, b) => a + b, 0) / v.length; const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)) : 0; const h = v.length >> 1; return { min: v[0], max: v[v.length - 1], mean: m, median: v.length % 2 ? v[h] : (v[h - 1]! + v[h]!) / 2, sd }; },
    tests: [{ inputs: { values: [2, 4, 4, 4, 5, 5, 7, 9] }, outputs: { min: 2, max: 9, mean: 5, median: 4.5, sd: 2.138089935299395 } }] }),
  def({ id: 'math.round', name: 'Round', kind: 'calculator', ability: 'transform', domains: ['math'], says: 'Rounded to so many decimal places', settings: [{ key: 'places', label: 'Places', type: 'number', default: 2 }],
    ports: { inputs: [N('value')], outputs: [N('result', undefined, { unitFrom: 'value' })] }, run: (i, c) => { const k = 10 ** Math.round(Number(c.set.places)); return { result: Math.round(Number(i.value) * k) / k }; },
    tests: [{ set: { places: 1 }, inputs: { value: 2.46 }, outputs: { result: 2.5 } }] }),

  // units
  def({ id: 'unit.convert', name: 'Unit converter', kind: 'calculator', ability: 'convert', domains: ['everyday', 'mechanical', 'electrical', 'thermal', 'science'], says: 'A quantity read in any unit it is in, said in the unit you choose',
    settings: [{ key: 'to', label: 'To unit', type: 'text', default: 'mm' }],
    ports: { inputs: [N('value', undefined, { label: 'value (SI)' })], outputs: [N('result'), P('says', 'text')] },
    run: (i, c) => { const to = String(c.set.to), v = fromSI(Number(i.value), to); return { result: v, says: `${Number(v.toPrecision(6))} ${to}` }; },
    tests: [{ set: { to: 'mm' }, inputs: { value: 0.25 }, outputs: { result: 250, says: '250 mm' } }, { set: { to: 'degF' }, inputs: { value: 373.15 }, outputs: { result: 212 }, rel: 1e-9 }], sources: [SIBROCHURE] }),

  // lists and tables
  def({ id: 'list.column', name: 'Column', kind: 'logic', ability: 'transform', domains: ['software', 'finance'], says: 'One column of a table, as a list', settings: [{ key: 'column', label: 'Column', type: 'text', default: 'in' }],
    ports: { inputs: [P('rows', 'table')], outputs: [P('values', 'list<number>')] }, run: (i, c) => ({ values: asList(i.rows).map((r) => (r as Record<string, unknown>)[String(c.set.column)]) }),
    tests: [{ set: { column: 'a' }, inputs: { rows: [{ a: 1 }, { a: 2 }] }, outputs: { values: [1, 2] } }] }),
  def({ id: 'list.zip', name: 'Make a table', kind: 'logic', ability: 'transform', domains: ['software'], says: 'Lists side by side as the columns of a table', settings: [{ key: 'names', label: 'Column names', type: 'text', default: 'x, y' }],
    ports: (s) => ({ inputs: String(s.names ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((n) => P(n, 'list<number>' as Type)), outputs: [P('rows', 'table')] }),
    run: (i, c) => { const names = String(c.set.names).split(',').map((x) => x.trim()).filter(Boolean), n = Math.max(0, ...names.map((k) => asList(i[k]).length)); return { rows: Array.from({ length: n }, (_, r) => Object.fromEntries(names.map((k) => [k, asList(i[k])[r]]))) }; },
    tests: [{ set: { names: 'x, y' }, inputs: { x: [1, 2], y: [3, 4] }, outputs: { rows: [{ x: 1, y: 3 }, { x: 2, y: 4 }] } }] }),
  def({ id: 'list.filter', name: 'Keep where', kind: 'logic', ability: 'transform', domains: ['software', 'math'], says: 'Keeps the items of a list a condition holds for ("x > 0"), x each item in turn',
    settings: [{ key: 'cond', label: 'Condition on x', type: 'text', default: 'x > 0' }],
    ports: { inputs: [P('values', 'list<number>')], outputs: [P('kept', 'list<number>', { unitFrom: 'values' }), P('count', 'integer')] },
    run: (i, c) => { const kept = nums(i.values).filter((x) => !!calc(String(c.set.cond), scope({ x }))); return { kept, count: kept.length }; },
    tests: [{ set: { cond: 'x > 2' }, inputs: { values: [1, 2, 3, 4] }, outputs: { kept: [3, 4], count: 2 } }] }),
  def({ id: 'list.sort', name: 'Sort', kind: 'logic', ability: 'transform', domains: ['software', 'math'], says: 'A list from least to most, or most to least', settings: [{ key: 'down', label: 'Most first', type: 'boolean', default: false }],
    ports: { inputs: [P('values', 'list<number>')], outputs: [P('sorted', 'list<number>', { unitFrom: 'values' })] }, run: (i, c) => ({ sorted: nums(i.values).sort((a, b) => (c.set.down ? b - a : a - b)) }),
    tests: [{ inputs: { values: [3, 1, 2] }, outputs: { sorted: [1, 2, 3] } }] }),
  def({ id: 'list.running', name: 'Running total', kind: 'calculator', ability: 'calculate', domains: ['finance', 'math'], says: 'Each item added to all before it, from a start: a balance from its ins and outs',
    ports: { inputs: [P('values', 'list<number>'), N('start', undefined, { optional: true, default: 0 })], outputs: [P('totals', 'list<number>', { unitFrom: 'values' }), N('end', undefined, { unitFrom: 'values' })] },
    run: (i) => { let t = Number(i.start ?? 0); const totals = nums(i.values).map((x) => (t += x)); return { totals, end: t }; },
    tests: [{ inputs: { values: [100, -30, 50], start: 10 }, outputs: { totals: [110, 80, 130], end: 130 } }] }),

  // logic
  def({ id: 'logic.compare', name: 'Compare', kind: 'logic', ability: 'decide', domains: ['math', 'everyday'], says: 'Whether a is less than, more than, or equal to b', settings: [{ key: 'op', label: 'Test', type: 'choice', default: '<=', choices: ['<', '<=', '=', '>=', '>', '!='] }],
    ports: { inputs: [N('a'), N('b')], outputs: [P('holds', 'boolean')] },
    run: (i, c) => { const a = Number(i.a), b = Number(i.b), op = String(c.set.op); return { holds: op === '<' ? a < b : op === '<=' ? a <= b : op === '=' ? a === b : op === '>=' ? a >= b : op === '>' ? a > b : a !== b }; },
    tests: [{ set: { op: '<=' }, inputs: { a: 2, b: 3 }, outputs: { holds: true } }] }),
  def({ id: 'logic.if', name: 'Choose', kind: 'logic', ability: 'decide', domains: ['software', 'everyday'], says: 'The first value where the test holds, else the second',
    ports: { inputs: [P('test', 'boolean'), P('yes', 'any'), P('no', 'any')], outputs: [P('value', 'any')] }, run: (i) => ({ value: i.test ? i.yes : i.no }),
    tests: [{ inputs: { test: false, yes: 1, no: 2 }, outputs: { value: 2 } }] }),
  def({ id: 'check.limit', name: 'Check a limit', kind: 'critic', ability: 'check', domains: ['mechanical', 'structural', 'electrical', 'finance'], says: 'A value against its limit: whether it passes, the margin left, and the factor of safety',
    settings: [{ key: 'what', label: 'What is checked', type: 'text', default: 'stress' }],
    ports: { inputs: [N('value'), N('limit')], outputs: [P('passes', 'boolean'), N('margin', undefined, { unitFrom: 'value' }), N('factor'), P('says', 'text')] },
    run: (i, c) => { const v = Number(i.value), l = Number(i.limit), f = v === 0 ? Infinity : l / v, ok = Math.abs(v) <= Math.abs(l); return { passes: ok, margin: l - v, factor: f, says: `${c.set.what} ${ok ? 'passes' : 'FAILS'}: factor ${Number.isFinite(f) ? f.toFixed(2) : '∞'}` }; },
    tests: [{ inputs: { value: 100, limit: 250 }, outputs: { passes: true, margin: 150, factor: 2.5 } }], sink: true }),

  // text
  def({ id: 'text.format', name: 'Sentence', kind: 'logic', ability: 'transform', domains: ['everyday', 'software'], says: 'Words with values filled in: "{a} costs {b}"', settings: [{ key: 'template', label: 'Words', type: 'text', default: '{a} and {b}' }],
    ports: (s) => ({ inputs: [...new Set([...String(s.template ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))].map((n) => P(n, 'any')), outputs: [P('text', 'text')] }),
    run: (i, c) => ({ text: String(c.set.template).replace(/\{(\w+)\}/g, (_, k: string) => show(i[k])) }),
    tests: [{ set: { template: '{a} + {b}' }, inputs: { a: 1, b: 'two' }, outputs: { text: '1 + two' } }] }),

  // business and finance
  def({ id: 'fin.loan', name: 'Loan payment', kind: 'calculator', ability: 'calculate', domains: ['finance', 'everyday'], says: 'The payment each period that pays a loan off, with interest, in so many periods (an annuity)',
    ports: { inputs: [N('principal', 'USD'), N('rate', undefined, { label: 'rate a year (0.06 = 6 %)' }), N('years'), N('perYear', undefined, { optional: true, default: 12, label: 'payments a year' })], outputs: [N('payment', 'USD'), N('total', 'USD'), N('interest', 'USD')] },
    run: (i) => { const P0 = Number(i.principal), n = Math.round(Number(i.years) * Number(i.perYear ?? 12)), r = Number(i.rate) / Number(i.perYear ?? 12); if (n <= 0) throw new Error('no payments'); const pay = r === 0 ? P0 / n : (P0 * r) / (1 - (1 + r) ** -n); return { payment: pay, total: pay * n, interest: pay * n - P0 }; },
    // $200,000 at 6 % over 30 years, monthly: $1,199.10 (the standard amortisation tables)
    tests: [{ inputs: { principal: 200000, rate: 0.06, years: 30, perYear: 12 }, outputs: { payment: 1199.1010503055138 }, rel: 1e-9 }], sources: [BREALEY] }),
  def({ id: 'fin.npv', name: 'Net present value', kind: 'calculator', ability: 'decide', domains: ['finance'], says: 'What a series of cash flows is worth today at a discount rate; the first flow is now',
    ports: { inputs: [P('flows', 'list<number>', { unit: 'USD' }), N('rate', undefined, { label: 'rate a period' })], outputs: [N('npv', 'USD'), P('positive', 'boolean', { label: 'worth more than nothing' })] },
    run: (i) => { const r = Number(i.rate), v = nums(i.flows).reduce((t, c, k) => t + c / (1 + r) ** k, 0); return { npv: v, positive: v > 0 }; },
    tests: [{ inputs: { flows: [-1000, 500, 500, 500], rate: 0.1 }, outputs: { npv: 243.4259954921112, positive: true }, rel: 1e-9 }], sources: [BREALEY] }),
  def({ id: 'fin.irr', name: 'Internal rate of return', kind: 'solver', ability: 'solve', domains: ['finance'], says: 'The discount rate at which cash flows are worth nothing today: found by bisection',
    ports: { inputs: [P('flows', 'list<number>', { unit: 'USD' })], outputs: [N('irr')] },
    run: (i) => { const f = nums(i.flows), npv = (r: number) => f.reduce((t, c, k) => t + c / (1 + r) ** k, 0); let lo = -0.99, hi = 10; if (npv(lo) * npv(hi) > 0) throw new Error('no rate makes these flows worth nothing'); for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (npv(lo) * npv(m) <= 0) hi = m; else lo = m; } return { irr: (lo + hi) / 2 }; },
    tests: [{ inputs: { flows: [-1000, 500, 500, 500] }, outputs: { irr: 0.2337519285 }, rel: 1e-6 }], sources: [BREALEY] }),
  def({ id: 'fin.compound', name: 'Compound growth', kind: 'calculator', ability: 'calculate', domains: ['finance', 'everyday'], says: 'What an amount grows to at a rate, compounded so many times a year',
    ports: { inputs: [N('amount', 'USD'), N('rate', undefined, { label: 'rate a year' }), N('years'), N('perYear', undefined, { optional: true, default: 12 })], outputs: [N('value', 'USD'), N('gain', 'USD')] },
    run: (i) => { const k = Number(i.perYear ?? 12), v = Number(i.amount) * (1 + Number(i.rate) / k) ** (k * Number(i.years)); return { value: v, gain: v - Number(i.amount) }; },
    tests: [{ inputs: { amount: 1000, rate: 0.05, years: 10, perYear: 1 }, outputs: { value: 1628.894626777442 }, rel: 1e-12 }], sources: [BREALEY] }),
  def({ id: 'fin.breakeven', name: 'Break-even', kind: 'calculator', ability: 'decide', domains: ['finance', 'operations'], says: 'How many must be sold to cover fixed costs, and the sales that takes',
    ports: { inputs: [N('fixed', 'USD'), N('price', 'USD'), N('variable', 'USD', { label: 'cost of each' })], outputs: [N('units'), N('sales', 'USD'), N('margin', 'USD', { label: 'margin on each' })] },
    run: (i) => { const m = Number(i.price) - Number(i.variable); if (m <= 0) throw new Error('each one sold loses money: no break-even'); const u = Number(i.fixed) / m; return { units: u, sales: u * Number(i.price), margin: m }; },
    tests: [{ inputs: { fixed: 50000, price: 25, variable: 15 }, outputs: { units: 5000, sales: 125000, margin: 10 } }], sources: [HORNGREN] }),
  def({ id: 'fin.margin', name: 'Margin and markup', kind: 'calculator', ability: 'calculate', domains: ['finance'], says: 'From cost and price: the profit, the margin on the price and the markup on the cost',
    ports: { inputs: [N('cost', 'USD'), N('price', 'USD')], outputs: [N('profit', 'USD'), N('margin'), N('markup')] },
    run: (i) => { const c = Number(i.cost), p = Number(i.price); return { profit: p - c, margin: (p - c) / p, markup: (p - c) / c }; },
    tests: [{ inputs: { cost: 60, price: 100 }, outputs: { profit: 40, margin: 0.4, markup: 0.6666666666666666 } }], sources: [HORNGREN] }),
  def({ id: 'fin.depreciation', name: 'Straight-line depreciation', kind: 'calculator', ability: 'calculate', domains: ['finance', 'operations'], says: 'What an asset loses each year, evenly over its life, down to what it is worth at the end',
    ports: { inputs: [N('cost', 'USD'), N('salvage', 'USD'), N('life', undefined, { label: 'life in years' })], outputs: [N('perYear', 'USD'), P('bookValues', 'list<number>', { unit: 'USD' })] },
    run: (i) => { const c = Number(i.cost), s = Number(i.salvage), n = Math.round(Number(i.life)), d = (c - s) / n; return { perYear: d, bookValues: Array.from({ length: n + 1 }, (_, k) => c - d * k) }; },
    tests: [{ inputs: { cost: 10000, salvage: 1000, life: 3 }, outputs: { perYear: 3000, bookValues: [10000, 7000, 4000, 1000] } }], sources: [HORNGREN] }),
  def({ id: 'fin.change', name: 'Percent change', kind: 'calculator', ability: 'calculate', domains: ['finance', 'everyday'], says: 'How much a value went up or down, as a share of what it was',
    ports: { inputs: [N('was'), N('now')], outputs: [N('change'), N('share')] }, run: (i) => ({ change: Number(i.now) - Number(i.was), share: (Number(i.now) - Number(i.was)) / Number(i.was) }),
    tests: [{ inputs: { was: 80, now: 100 }, outputs: { change: 20, share: 0.25 } }] }),

  // manufacturing
  def({ id: 'mfg.spindle', name: 'Spindle speed', kind: 'calculator', ability: 'calculate', domains: ['manufacturing', 'mechanical'], says: 'The spindle speed that gives a cutting speed at a tool or work diameter (n = Vc / π D)',
    ports: { inputs: [N('Vc', 'm/s', { label: 'cutting speed' }), N('D', 'm', { label: 'diameter' })], outputs: [N('n', 'rad/s', { label: 'speed' }), N('rpm')] },
    run: (i) => { const rev = Number(i.Vc) / (Math.PI * Number(i.D)); return { n: rev * 2 * Math.PI, rpm: rev * 60 }; },
    // 100 m/min on a 50 mm cutter: 637 rpm
    tests: [{ inputs: { Vc: 100 / 60, D: 0.05 }, outputs: { rpm: 636.6197723675814 }, rel: 1e-9 }], sources: [KALPAKJIAN] }),
  def({ id: 'mfg.cut-time', name: 'Machining time', kind: 'calculator', ability: 'calculate', domains: ['manufacturing', 'operations'], says: 'How long a cut takes: its length over the feed per revolution times the speed (t = L / f n)',
    ports: { inputs: [N('L', 'm', { label: 'length of cut' }), N('f', 'm', { label: 'feed per revolution' }), N('rpm'), N('passes', undefined, { optional: true, default: 1 })], outputs: [N('t', 's', { label: 'time' })] },
    run: (i) => ({ t: (Number(i.L) / (Number(i.f) * Number(i.rpm) / 60)) * Number(i.passes ?? 1) }),
    tests: [{ inputs: { L: 0.1, f: 0.0002, rpm: 1000, passes: 1 }, outputs: { t: 30 } }], sources: [KALPAKJIAN] }),
  def({ id: 'mfg.filament', name: 'Filament for a print', kind: 'calculator', ability: 'calculate', domains: ['manufacturing', 'materials'], says: 'The length and cost of filament a printed volume takes, from its diameter and density',
    ports: { inputs: [N('volume', 'm^3', { label: 'plastic in the part' }), N('d', 'm', { label: 'filament diameter', optional: true, default: 0.00175 }), N('density', 'kg/m^3', { optional: true, default: 1240, label: 'density (PLA 1240, typical)' }), N('price', 'USD', { label: 'price a kg', optional: true, default: 20 })], outputs: [N('mass', 'kg'), N('length', 'm'), N('cost', 'USD')] },
    run: (i) => { const v = Number(i.volume), m = v * Number(i.density ?? 1240), a = Math.PI * (Number(i.d ?? 0.00175) / 2) ** 2; return { mass: m, length: v / a, cost: m * Number(i.price ?? 20) }; },
    tests: [{ inputs: { volume: 1e-5, d: 0.00175, density: 1240, price: 20 }, outputs: { mass: 0.0124, length: 4.157516880767878, cost: 0.248 }, rel: 1e-9 }] }),

  // electronics
  def({ id: 'elec.divider', name: 'Voltage divider', kind: 'calculator', ability: 'calculate', domains: ['electronics', 'electrical'], says: 'The voltage between two resistors in series, unloaded (Vout = Vin R2 / (R1 + R2))',
    ports: { inputs: [N('Vin', 'V'), N('R1', 'ohm'), N('R2', 'ohm')], outputs: [N('Vout', 'V'), N('I', 'A')] },
    run: (i) => { const r = Number(i.R1) + Number(i.R2); return { Vout: (Number(i.Vin) * Number(i.R2)) / r, I: Number(i.Vin) / r }; },
    tests: [{ inputs: { Vin: 12, R1: 10000, R2: 4700 }, outputs: { Vout: 3.836734693877551 }, rel: 1e-12 }], sources: [HH] }),
  def({ id: 'elec.led', name: 'LED resistor', kind: 'calculator', ability: 'calculate', domains: ['electronics', 'everyday'], says: 'The series resistor that sets an LED\'s current, and the power it burns',
    ports: { inputs: [N('Vs', 'V', { label: 'supply' }), N('Vf', 'V', { label: 'LED forward voltage' }), N('I', 'A', { label: 'current wanted' })], outputs: [N('R', 'ohm'), N('P', 'W')] },
    run: (i) => { const v = Number(i.Vs) - Number(i.Vf); if (v <= 0) throw new Error('the supply is not above the LED\'s forward voltage'); return { R: v / Number(i.I), P: v * Number(i.I) }; },
    tests: [{ inputs: { Vs: 5, Vf: 2, I: 0.02 }, outputs: { R: 150, P: 0.06 }, rel: 1e-12 }], sources: [HH] }),
  def({ id: 'elec.rc-cutoff', name: 'RC filter corner', kind: 'calculator', ability: 'calculate', domains: ['electronics'], says: 'The −3 dB frequency of a first-order RC filter (f = 1 / 2π R C)',
    ports: { inputs: [N('R', 'ohm'), N('C', 'F')], outputs: [N('f', 'Hz')] }, run: (i) => ({ f: 1 / (2 * Math.PI * Number(i.R) * Number(i.C)) }),
    tests: [{ inputs: { R: 1000, C: 1e-6 }, outputs: { f: 159.15494309189535 }, rel: 1e-12 }], sources: [HH] }),

  // energy
  def({ id: 'energy.battery-runtime', name: 'Battery runtime', kind: 'calculator', ability: 'calculate', domains: ['energy', 'electrical', 'everyday'], says: 'How long a battery runs a load, using only the share of it you may take out',
    ports: { inputs: [N('capacity', 'Ah', { label: 'capacity' }), N('V', 'V'), N('P', 'W', { label: 'load' }), N('dod', undefined, { label: 'share used (0.8 typical for lithium)', optional: true, default: 0.8 })], outputs: [N('t', 's', { label: 'runtime' }), N('energy', 'J', { label: 'energy used' })] },
    run: (i) => { const e = Number(i.capacity) * 3600 * Number(i.V) * Number(i.dod ?? 0.8); return { t: e / Number(i.P), energy: e }; },
    tests: [{ inputs: { capacity: 100, V: 12, P: 60, dod: 0.8 }, outputs: { t: 57600 } }] }),
  def({ id: 'energy.pv-day', name: 'Solar panel, a day', kind: 'calculator', ability: 'calculate', domains: ['energy'], says: 'What a panel gives in a day: its area, the sun on it (peak-sun hours at 1 kW/m²), its efficiency and what is lost on the way (performance ratio)',
    ports: { inputs: [N('A', 'm^2', { label: 'panel area' }), N('eta', undefined, { label: 'efficiency (0.2 typical)' }), N('psh', undefined, { label: 'peak-sun hours' }), N('pr', undefined, { optional: true, default: 0.75, label: 'performance ratio (0.75 typical)' })], outputs: [N('E', 'J', { label: 'a day' }), N('kWh')] },
    run: (i) => { const kwh = Number(i.A) * Number(i.eta) * Number(i.psh) * Number(i.pr ?? 0.75); return { E: kwh * 3.6e6, kWh: kwh }; },
    tests: [{ inputs: { A: 1.7, eta: 0.2, psh: 5, pr: 0.75 }, outputs: { kWh: 1.275 }, rel: 1e-12 }], sources: [DUFFIE] }),

  // controls
  def({ id: 'ctrl.pid', name: 'PID loop on a lag', kind: 'calculator', ability: 'simulate', domains: ['controls'], says: 'A PID controller driving a first-order plant (gain K, time constant τ) to a set point, stepped in time: how it rises, overshoots and settles',
    ports: { inputs: [N('sp', undefined, { label: 'set point' }), N('Kp'), N('Ki', undefined, { optional: true, default: 0 }), N('Kd', undefined, { optional: true, default: 0 }), N('K', undefined, { label: 'plant gain', optional: true, default: 1 }), N('tau', 's', { label: 'plant time constant' }), N('T', 's', { label: 'how long' })],
      outputs: [P('t', 'list<number>', { unit: 's' }), P('y', 'list<number>'), P('u', 'list<number>'), N('final'), N('overshoot')] },
    run: (i) => {
      const sp = Number(i.sp), Kp = Number(i.Kp), Ki = Number(i.Ki ?? 0), Kd = Number(i.Kd ?? 0), K = Number(i.K ?? 1), tau = Number(i.tau), T = Number(i.T);
      if (!(tau > 0) || !(T > 0)) throw new Error('τ and the time must be more than nothing');
      const n = 2000, dt = T / n, keep = Math.max(1, Math.round(n / 200)), t: number[] = [], y: number[] = [], u: number[] = [];
      let x = 0, integ = 0, prev = sp - x, top = 0;
      for (let k = 0; k <= n; k++) {
        const e = sp - x; integ += e * dt; const d = k ? (e - prev) / dt : 0; prev = e;
        const c = Kp * e + Ki * integ + Kd * d; if (k % keep === 0) { t.push(k * dt); y.push(x); u.push(c); }
        top = Math.max(top, x); x += (dt / tau) * (K * c - x);
      }
      return { t, y, u, final: x, overshoot: sp ? Math.max(0, (top - sp) / sp) : 0 };
    },
    // proportional alone settles short of its set point, at Kp K / (1 + Kp K) of it
    tests: [{ inputs: { sp: 1, Kp: 4, Ki: 0, Kd: 0, K: 1, tau: 1, T: 30 }, outputs: { final: 0.8 }, rel: 1e-6 }], sources: [ASTROM] }),

  // operations
  def({ id: 'ops.oee', name: 'Overall equipment effectiveness', kind: 'calculator', ability: 'calculate', domains: ['operations', 'manufacturing'], says: 'How much of a machine\'s time makes good parts: availability × performance × quality',
    ports: { inputs: [N('planned', 's', { label: 'planned time' }), N('down', 's', { label: 'time stopped' }), N('ideal', 's', { label: 'ideal time a part' }), N('made', undefined, { label: 'parts made' }), N('good', undefined, { label: 'good parts' })], outputs: [N('oee'), N('availability'), N('performance'), N('quality')] },
    run: (i) => { const run = Number(i.planned) - Number(i.down), a = run / Number(i.planned), p = (Number(i.ideal) * Number(i.made)) / run, q = Number(i.good) / Number(i.made); return { oee: a * p * q, availability: a, performance: p, quality: q }; },
    tests: [{ inputs: { planned: 28800, down: 3600, ideal: 30, made: 700, good: 665 }, outputs: { availability: 0.875, performance: 0.8333333333333334, quality: 0.95, oee: 0.6927083333333334 }, rel: 1e-12 }], sources: [NAKAJIMA] }),
  def({ id: 'ops.critical-path', name: 'Critical path', kind: 'solver', ability: 'solve', domains: ['operations', 'everyday'], says: 'How long a project takes and which tasks set it: rows of task, how long, and what each must wait for (names split by ; or spaces)',
    settings: [{ key: 'task', label: 'Task column', type: 'text', default: 'task' }, { key: 'time', label: 'Duration column', type: 'text', default: 'days' }, { key: 'after', label: 'Waits-for column', type: 'text', default: 'after' }],
    ports: { inputs: [P('rows', 'table')], outputs: [N('length'), P('path', 'text'), P('starts', 'table')] },
    run: (i, c) => {
      const rows = asList(i.rows) as Record<string, unknown>[], k = String(c.set.task), dk = String(c.set.time), ak = String(c.set.after);
      const dur = new Map(rows.map((r) => [String(r[k]), Number(r[dk])])), deps = new Map(rows.map((r) => [String(r[k]), String(r[ak] ?? '').split(/[;\s]+/).filter(Boolean)]));
      for (const [t, ds] of deps) for (const d of ds) if (!dur.has(d)) throw new Error(`${t} waits for ${d}, which is not a task`);
      const end = new Map<string, number>(), why = new Map<string, string>(), on = new Set<string>();
      const fin = (t: string): number => { if (end.has(t)) return end.get(t)!; if (on.has(t)) throw new Error(`${t} waits on itself`); on.add(t); let s = 0; for (const d of deps.get(t)!) { const e = fin(d); if (e > s) { s = e; why.set(t, d); } } on.delete(t); end.set(t, s + dur.get(t)!); return end.get(t)!; };
      let last = '', len = 0; for (const t of dur.keys()) if (fin(t) > len) { len = fin(t); last = t; }
      const chain: string[] = []; for (let t: string | undefined = last; t; t = why.get(t)) chain.unshift(t);
      return { length: len, path: chain.join(' → '), starts: [...dur.keys()].map((t) => ({ task: t, start: end.get(t)! - dur.get(t)!, end: end.get(t)! })) };
    },
    tests: [{ inputs: { rows: [{ task: 'A', days: 3, after: '' }, { task: 'B', days: 2, after: 'A' }, { task: 'C', days: 4, after: 'A' }, { task: 'D', days: 1, after: 'B;C' }] }, outputs: { length: 8, path: 'A → C → D' } }], sources: [KELLEY] }),

  // cards: what the kept data knows
  def({ id: 'card.material', name: 'Material', kind: 'card', ability: 'store', domains: ['materials', 'mechanical', 'manufacturing'], says: 'A material as the kept data has it: density, stiffness, strengths',
    settings: [{ key: 'id', label: 'Material', type: 'choice', default: MATERIALS[0]?.id ?? '', choices: MATERIALS.map((m) => m.id) }],
    ports: { inputs: [], outputs: [P('material', 'material'), N('density', 'kg/m^3'), N('E', 'Pa'), N('yield', 'Pa'), N('ultimate', 'Pa')] },
    run: (_, c) => { const m = MATERIALS.find((x) => x.id === c.set.id); if (!m) throw new Error(`no material ${String(c.set.id)}`); return { material: m, density: m.density, E: m.E, yield: m.yield, ultimate: m.ultimate }; },
    tests: MATERIALS[0] ? [{ set: { id: MATERIALS[0].id }, inputs: {}, outputs: { density: MATERIALS[0].density, E: MATERIALS[0].E } }] : [] }),

  // parts: drawn whole from their standards by the library (src/nexus/components.ts)
  def({ id: 'card.part', name: 'Part', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'vehicles', 'electrical'],
    says: `A real part, drawn whole from its standard with every piece inside it: ${DESIGNED.length} kinds (${DESIGNED.slice(0, 8).map((f) => exampleOf(f)).join(', ')}, …). Words in, or typed here`,
    settings: [{ key: 'what', label: 'Part', type: 'text', default: 'bolt M8x30' }],
    ports: { inputs: [P('what', 'text', { optional: true, label: 'part, in words' })], outputs: [P('part', 'part'), N('mass', 'kg'), P('name', 'text'), P('pieces', 'integer'), P('check', 'text')] },
    run: (i, c) => {
      const words = String(i.what ?? '').trim() || String(c.set.what ?? ''), r = component(words);
      if (typeof r === 'string') throw new Error(r);
      const count = (q: Part): number => (q.parts?.length ? q.parts.reduce((t, x) => t + count(x), 0) : 1);
      return { part: r.part, mass: massOf(r.part), name: r.part.name, pieces: count(r.part), check: r.faults.length ? r.faults.join('; ') : 'holds every piece its standard lists' };
    },
    tests: [{ set: { what: 'bolt M8x30' }, inputs: {}, outputs: { name: 'M8 × 30 hex bolt' } }, { inputs: { what: 'bearing 6205' }, outputs: { name: 'ball bearing 6205 ZZ (25 × 52 × 15)' } }] }),
  def({ id: 'logic.next-size', name: 'Next size up', kind: 'logic', ability: 'decide', domains: ['mechanical', 'structural', 'everyday'], says: 'The smallest standard size at least the size worked out: a bolt from its diameter, a beam from its depth',
    settings: [{ key: 'sizes', label: 'Sizes', type: 'text', default: '3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 36' }, { key: 'unit', label: 'Sizes are in', type: 'text', default: 'mm' }],
    ports: { inputs: [N('need', 'm', { label: 'size needed (SI)' })], outputs: [N('size', 'm'), N('inUnit', undefined, { label: 'size in its unit' }), P('fits', 'boolean')] },
    run: (i, c) => {
      const u = String(c.set.unit || 'm'), k = typeof readQuantity(`1 ${u}`) === 'number' ? (readQuantity(`1 ${u}`) as number) : 1;
      const sizes = String(c.set.sizes).split(/[,;\s]+/).filter(Boolean).map(Number).filter(Number.isFinite).sort((a, b) => a - b), need = Number(i.need);
      const pick = sizes.find((x) => x * k >= need - 1e-12);
      if (pick === undefined) throw new Error(`nothing in the list is big enough: the largest is ${sizes[sizes.length - 1]} ${u}`);
      return { size: pick * k, inUnit: pick, fits: true };
    },
    tests: [{ set: { sizes: '6, 8, 10', unit: 'mm' }, inputs: { need: 0.0071 }, outputs: { inUnit: 8, size: 0.008 } }], sources: [{ cite: 'ISO 262:1998, ISO general purpose metric screw threads: selected sizes (first choice)', kind: 'standard' }] }),
  def({ id: 'view.3d', name: '3D view', kind: 'view', ability: 'show', domains: ['mechanical', 'manufacturing', 'everyday'], says: 'A part drawn in 3D, every piece of it: drag inside to turn it, take it apart, open it full screen',
    settings: [{ key: 'explode', label: 'Taken apart (levels)', type: 'number', default: 0 }, { key: 'spin', label: 'Turn by itself', type: 'boolean', default: true }],
    ports: { inputs: [P('part', 'part')], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { part: { name: 'x' } }, outputs: {} }] }),
  // viewers: what a board shows
  def({ id: 'view.show', name: 'Show', kind: 'view', ability: 'show', domains: ['everyday'], says: 'A value, large, in its unit', settings: [{ key: 'unit', label: 'Show in', type: 'text', default: '' }],
    ports: { inputs: [P('value', 'any')], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { value: 1 }, outputs: {} }] }),
  def({ id: 'view.gauge', name: 'Gauge', kind: 'view', ability: 'show', domains: ['everyday', 'controls'], says: 'A value on a dial between two ends', settings: [{ key: 'min', label: 'From', type: 'number', default: 0 }, { key: 'max', label: 'To', type: 'number', default: 100 }],
    ports: { inputs: [N('value')], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { value: 1 }, outputs: {} }] }),
  def({ id: 'view.chart', name: 'Chart', kind: 'view', ability: 'show', domains: ['everyday', 'software', 'finance'], says: 'A list drawn as a line, against its place or against another list',
    ports: { inputs: [P('y', 'list<number>'), P('x', 'list<number>', { optional: true })], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { y: [1, 2] }, outputs: {} }] }),
  def({ id: 'view.table', name: 'Table view', kind: 'view', ability: 'show', domains: ['software', 'finance'], says: 'Rows shown as a table', ports: { inputs: [P('rows', 'table')], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { rows: [] }, outputs: {} }] }),
  def({ id: 'note', name: 'Note', kind: 'note', ability: 'store', domains: ['everyday'], says: 'Words on the board, for people: it runs nothing', settings: [{ key: 'text', label: 'Note', type: 'code', default: '' }],
    ports: { inputs: [], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: {}, outputs: {} }] }),

  // code and AI: what the place it runs in gives it
  def({ id: 'code', name: 'Code', kind: 'code', ability: 'transform', domains: ['software'], says: 'Code with ports: each input is a name in it, what it returns (an object, port by port, or one value) fills its outputs. JavaScript, TypeScript or Python, run off the page',
    pure: false,
    settings: [{ key: 'lang', label: 'Language', type: 'choice', default: 'js', choices: ['js', 'ts', 'python'] }, { key: 'inputs', label: 'Inputs', type: 'text', default: 'a, b' }, { key: 'outputs', label: 'Outputs', type: 'text', default: 'result' }, { key: 'code', label: 'Code', type: 'code', default: 'return { result: a + b }' }],
    ports: (s) => ({ inputs: String(s.inputs ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((n) => P(n, 'any')), outputs: String(s.outputs ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((n) => P(n, 'any')) }),
    run: async (i, c) => {
      if (!c.code) throw new Error('code runs only where a worker can run it (the board page, the forge)');
      const r = await c.code(String(c.set.lang), String(c.set.code), i, c.signal), outs = String(c.set.outputs).split(',').map((x) => x.trim()).filter(Boolean);
      return r && typeof r === 'object' && !Array.isArray(r) && outs.every((o) => o in (r as object)) ? (r as Outputs) : { [outs[0] ?? 'result']: r };
    } }),
  def({ id: 'ai.ask', name: 'Ask Claude', kind: 'ai', ability: 'ask', domains: ['software', 'everyday'], says: 'Asks Claude, or Nexus where Claude cannot be reached; {input} is what comes in', pure: false,
    settings: [{ key: 'prompt', label: 'Ask', type: 'code', default: 'Summarise: {input}' }],
    ports: { inputs: [P('input', 'text', { optional: true, default: '' })], outputs: [P('answer', 'text'), P('by', 'text')] },
    run: async (i, c) => { if (!c.ai) throw new Error('nothing here can ask Claude'); const r = await c.ai(String(c.set.prompt).replace(/\{input\}/g, String(i.input ?? '')), String(i.input ?? ''), c.signal); return { answer: r.text, by: r.by }; } }),

  // a group's own ports: inside a group, what comes in and what goes out
  def({ id: 'group.in', name: 'Group input', kind: 'group', ability: 'connect', domains: ['software'], says: 'What comes into the group, under this name',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'x' }, { key: 'type', label: 'Type', type: 'text', default: 'any' }, { key: 'unit', label: 'Unit', type: 'text', default: '' }],
    ports: (s) => ({ inputs: [], outputs: [P('value', (String(s.type ?? 'any') || 'any') as Type, String(s.unit ?? '') ? { unit: String(s.unit) } : {})] }), run: (_, c) => ({ value: c.set.value }) }),
  def({ id: 'group.out', name: 'Group output', kind: 'group', ability: 'connect', domains: ['software'], says: 'What goes out of the group, under this name',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'y' }, { key: 'type', label: 'Type', type: 'text', default: 'any' }, { key: 'unit', label: 'Unit', type: 'text', default: '' }],
    ports: (s) => ({ inputs: [P('value', (String(s.type ?? 'any') || 'any') as Type, String(s.unit ?? '') ? { unit: String(s.unit) } : {})], outputs: [] }), run: (i) => ({ value: i.value }), sink: true }),
];

/** A table typed or pasted: its first row the headings, comma or tab between cells, numbers read as numbers. */
export function readTable(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean); if (!lines.length) return [];
  const cut = (l: string) => l.split(l.includes('\t') ? '\t' : ',').map((x) => x.trim());
  const head = cut(lines[0]!);
  return lines.slice(1).map((l) => { const cs = cut(l); return Object.fromEntries(head.map((h, k) => { const c = cs[k] ?? ''; return [h, c !== '' && Number.isFinite(Number(c)) ? Number(c) : c]; })); });
}

/** Every law as a calculator: its inputs and output in SI with their units, a caution where the inputs leave the range
 *  it holds over, its worked example as its test, its source as its own. */
export function lawBlocks(): BlockDef[] {
  return LAWS.map((law) => def({
    id: `law.${law.id}`, name: law.name, kind: 'law', ability: 'calculate', domains: [LAW_DOMAIN[law.domain] ?? 'science', ...(law.tags.some((t) => /vehicle|kart|tyre|tire|car/.test(t)) ? ['vehicles'] : []), ...(law.tags.some((t) => /flight|wing|lift|drag/.test(t)) ? ['aerospace'] : []), ...(law.tags.some((t) => /battery|solar|energy|efficien/.test(t)) ? ['energy'] : []), ...(law.domain === 'optics' || law.domain === 'magnetism' ? ['science'] : [])].filter((d, i, a) => a.indexOf(d) === i),
    says: `${law.statement} (${law.formula})`, valid: law.valid, sources: [law.source],
    ports: { inputs: law.inputs.map((q) => N(q.sym, q.unit === '-' ? undefined : q.unit, { label: `${q.name} (${q.sym})`, ...(isOptional(law.id, q.sym) ? { optional: true } : {}) })), outputs: [N(law.output.sym, law.output.unit === '-' ? undefined : law.output.unit, { label: `${law.output.name} (${law.output.sym})` }), P('caution', 'text')] },
    run: (i) => { const v: Record<string, number> = {}; for (const [k, x] of Object.entries(i)) if (x !== undefined && x !== null) v[k] = Number(x); const r = useLaw(law.id, v); return { [law.output.sym]: r.value, caution: r.caution ?? '' }; },
    tests: [{ inputs: law.example.inputs, outputs: { [law.output.sym]: law.example.output }, rel: law.example.rel ?? 1e-6 }],
  }));
}


// ---- things made and placed: shapes, parts by their sizes, places, patterns, variants (src/nexus/assembly.ts) ---------
const ENGINEERING = Object.keys(DENSITY).filter((k) => !/^(bread|cheese|ham|tomato|lettuce|butter|chicken|egg|avocado|bacon|stingray|leaf|foliage|tissue|petrol|diesel|water|soil)$/.test(k)).sort();
const FINISHES = ['', 'paint', 'chrome', 'brushed', 'ground', 'cast', 'plate', 'weld', 'thread', 'tread', 'texture', 'grain', 'stone', 'concrete'];
const look: SettingDef[] = [{ key: 'mat', label: 'Material', type: 'choice', default: 'steel-low', choices: ENGINEERING }, { key: 'color', label: 'Colour', type: 'text', default: '#9aa3ad' }, { key: 'finish', label: 'Finish', type: 'choice', default: '', choices: FINISHES }];
const hex = (c: unknown, d = 0x9aa3ad): number => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c ?? '').trim()); return m ? parseInt(m[1]!, 16) : d; };
const L = (name: string, def: number, label?: string, more: Partial<PortDef> = {}) => N(name, 'm', { default: def, optional: true, ...(label ? { label } : {}), ...more });
const thing = (name = 'thing', label = 'thing') => P(name, 'assembly', { label });
/** A part of one shape, of its material, coloured and finished. */
function shapePart(name: string, shape: Part['shape'], set: Record<string, unknown>): Part {
  return { name: String(set.name || name), shape, at: [0, 0, 0], mat: String(set.mat || 'steel-low'), color: hex(set.color), ...(set.finish ? { finish: String(set.finish) } : {}) };
}
const shapeBlock = (id: string, name: string, says: string, inputs: PortDef[], make: (i: Record<string, number>) => Part['shape'], test: { inputs: Record<string, number>; mass: number }) => def({
  id: `shape.${id}`, name, kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'structural'], says,
  settings: [{ key: 'name', label: 'Name', type: 'text', default: name.toLowerCase() }, ...look],
  ports: { inputs, outputs: [P('part', 'part'), N('mass', 'kg')] },
  run: (i, c) => { const v = Object.fromEntries(inputs.filter((q) => i[q.name] !== undefined || q.default !== undefined).map((q) => [q.name, Number(i[q.name] ?? q.default)])); for (const [k, x] of Object.entries(v)) if (!(x >= 0) || !Number.isFinite(x)) throw new Error(`${k} must be a size, not ${x}`); const p = shapePart(name.toLowerCase(), make(v), c.set); return { part: p, mass: massOf(p) }; },
  tests: [{ set: { mat: 'steel-low' }, inputs: test.inputs, outputs: { mass: test.mass }, rel: 1e-9 }],
});
/** Points typed as "x, y; x, y; …" in millimetres. */
function points(t: unknown): [number, number][] {
  const pts = String(t ?? '').split(';').map((q) => q.split(',').map((x) => Number(x.trim()) / 1000)).filter((q) => q.length === 2 && q.every(Number.isFinite)) as [number, number][];
  if (pts.length < 3) throw new Error('a profile needs three points or more, as "x, y; x, y; …" in mm');
  return pts;
}
const asThing = (v: unknown): Part | Assembly => { if (isAssembly(v) || isPart(v)) return v; throw new Error('nothing made to place: wire a shape, a part or an assembly in'); };
const BUILT_THINGS: BlockDef[] = [
  shapeBlock('box', 'Box', 'A block: width (x), height (y), depth (z)', [L('w', 0.1, 'width'), L('h', 0.1, 'height'), L('d', 0.1, 'depth')], (v) => ({ box: [v.w!, v.h!, v.d!] }), { inputs: { w: 0.1, h: 0.1, d: 0.1 }, mass: 7.85 }),
  shapeBlock('cyl', 'Cylinder', 'A cylinder along y: its radius and height; a second radius at its top makes it a frustum', [L('r', 0.05, 'radius'), L('h', 0.1, 'height'), N('r2', 'm', { optional: true, label: 'top radius (blank: the same)' })], (v) => ({ cyl: v.r2 !== undefined ? [v.r!, v.h!, v.r2] : [v.r!, v.h!] }), { inputs: { r: 0.05, h: 0.1 }, mass: Math.PI * 0.0025 * 0.1 * 7850 }),
  shapeBlock('sphere', 'Sphere', 'A ball: its radius', [L('r', 0.05, 'radius')], (v) => ({ sphere: v.r! }), { inputs: { r: 0.05 }, mass: (4 / 3) * Math.PI * 0.05 ** 3 * 7850 }),
  shapeBlock('cone', 'Cone', 'A cone along y: base radius and height', [L('r', 0.05, 'radius'), L('h', 0.1, 'height')], (v) => ({ cone: [v.r!, v.h!] }), { inputs: { r: 0.05, h: 0.1 }, mass: (Math.PI * 0.0025 * 0.1 / 3) * 7850 }),
  shapeBlock('torus', 'Ring', 'A ring round z: its radius to the middle of the tube, and the tube\'s radius', [L('R', 0.05, 'ring radius'), L('r', 0.01, 'tube radius')], (v) => ({ torus: [v.R!, v.r!] }), { inputs: { R: 0.05, r: 0.01 }, mass: 2 * Math.PI ** 2 * 0.05 * 0.0001 * 7850 }),
  shapeBlock('tube', 'Tube', 'A straight tube along y: outside radius, wall and length', [L('r', 0.02, 'outside radius'), L('wall', 0.002, 'wall'), L('h', 0.5, 'length')], (v) => { if (v.wall! >= v.r!) throw new Error('the wall is as thick as the tube'); return { tube: { r: v.r!, wall: v.wall!, pts: [[0, -v.h! / 2, 0], [0, v.h! / 2, 0]] } }; }, { inputs: { r: 0.02, wall: 0.002, h: 0.5 }, mass: Math.PI * (0.02 ** 2 - 0.018 ** 2) * 0.5 * 7850 }),
  def({ id: 'shape.extrude', name: 'Extrude', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'structural'], says: 'A profile drawn in x and y (mm), pushed out along z to a length: a bracket, a beam, a plate of any outline',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'profile' }, { key: 'profile', label: 'Profile, mm: x, y; x, y; …', type: 'code', default: '0, 0; 60, 0; 60, 6; 6, 6; 6, 40; 0, 40' }, ...look],
    ports: { inputs: [L('L', 0.1, 'length')], outputs: [P('part', 'part'), N('mass', 'kg')] },
    run: (i, c) => { const p = shapePart('profile', { prism: { pts: points(c.set.profile), L: Number(i.L ?? 0.1) } }, c.set); return { part: p, mass: massOf(p) }; },
    tests: [{ set: { profile: '0,0; 100,0; 100,100; 0,100', mat: 'steel-low' }, inputs: { L: 0.1 }, outputs: { mass: 7.85 }, rel: 1e-9 }] }),
  def({ id: 'shape.lathe', name: 'Turn (lathe)', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing'], says: 'A profile of radius and height (mm) spun about y: a propeller hub, a pulley, a knob, a vase',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'turned' }, { key: 'profile', label: 'Profile, mm: r, y; r, y; …', type: 'code', default: '0, 0; 20, 0; 20, 5; 8, 8; 8, 30; 0, 30' }, ...look],
    ports: { inputs: [], outputs: [P('part', 'part'), N('mass', 'kg')] },
    run: (_, c) => { const p = shapePart('turned', { lathe: points(c.set.profile) }, c.set); return { part: p, mass: massOf(p) }; },
    tests: [{ set: { profile: '0,0; 50,0; 50,100; 0,100', mat: 'steel-low' }, inputs: {}, outputs: { mass: Math.PI * 0.0025 * 0.1 * 7850 }, rel: 1e-3 }] }),
  def({ id: 'part.family', name: 'Standard part by size', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'electrical', 'structural'],
    says: `A part drawn whole from its standard, its sizes set one by one: ${DESIGNED.length} families (bolts, nuts, bearings, steppers, rails, extrusions, beams, pipes…)`,
    settings: [{ key: 'family', label: 'Family', type: 'choice', default: 'bolt', choices: DESIGNED }],
    ports: (s) => { const f = FAMILIES.find((x) => x.id === String(s.family ?? 'bolt')); return { inputs: (f?.params ?? []).map((q) => typeof q.default === 'number' ? N(q.key, undefined, { label: `${q.says} (${q.unit})`, optional: true }) : P(q.key, 'text', { label: `${q.says}${q.values?.length ? ` (${q.values.slice(0, 6).join(', ')}${q.values.length > 6 ? ', …' : ''})` : ''}`, optional: true })), outputs: [P('part', 'part'), N('mass', 'kg'), P('name', 'text')] }; },
    run: (i, c) => { const params: Record<string, string | number> = {}; for (const [k, v] of Object.entries(i)) if (v !== undefined && v !== null && v !== '') params[k] = v as string | number; const r = componentFromParams(String(c.set.family), params); if (typeof r === 'string') throw new Error(r); return { part: r.part, mass: massOf(r.part), name: r.part.name }; },
    tests: [{ set: { family: 'bolt' }, inputs: { thread: 'M10', length: 40 }, outputs: { name: 'M10 × 40 hex bolt' } }, { set: { family: 'bearing' }, inputs: { number: '6205' }, outputs: { name: 'ball bearing 6205 ZZ (25 × 52 × 15)' } }] }),

  def({ id: 'place', name: 'Place', kind: 'logic', ability: 'transform', domains: ['mechanical', 'structural', 'everyday'], says: 'A thing put at a place (x, y, z), turned about x, y and z, at a scale. The thing is shared, not copied',
    ports: { inputs: [thing(), L('x', 0), L('y', 0), L('z', 0), N('rx', 'rad', { default: 0, optional: true, label: 'turn about x' }), N('ry', 'rad', { default: 0, optional: true, label: 'turn about y' }), N('rz', 'rad', { default: 0, optional: true, label: 'turn about z' }), N('s', undefined, { default: 1, optional: true, label: 'scale' })], outputs: [thing('placed', 'placed')] },
    run: (i) => { const t = asThing(i.thing), at = (k: string) => Number(i[k] ?? 0); return { placed: { name: t.name, items: [place(t, [at('x'), at('y'), at('z')], [at('rx'), at('ry'), at('rz')], Number(i.s ?? 1))] } }; },
    tests: [{ inputs: { thing: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, x: 2 }, outputs: { placed: { items: [{ at: [2, 0, 0], s: 1 }] } } }] }),
  def({ id: 'array.line', name: 'Row of', kind: 'logic', ability: 'generate', domains: ['mechanical', 'structural', 'everyday'], says: 'A thing many times in a row, each a step on from the last: one thing stored, many placed',
    ports: { inputs: [thing(), N('n', undefined, { default: 4, optional: true, label: 'how many' }), L('dx', 0.1, 'step x'), L('dy', 0, 'step y'), L('dz', 0, 'step z')], outputs: [thing('row', 'row')] },
    run: (i) => ({ row: arrayLine(asThing(i.thing), Number(i.n ?? 4), [Number(i.dx ?? 0.1), Number(i.dy ?? 0), Number(i.dz ?? 0)]) }),
    tests: [{ inputs: { thing: { name: 'b' }, n: 3, dx: 1 }, outputs: { row: { items: [{ at: [0, 0, 0] }, { at: [1, 0, 0] }, { at: [2, 0, 0] }] } } }] }),
  def({ id: 'array.circle', name: 'Ring of', kind: 'logic', ability: 'generate', domains: ['mechanical', 'vehicles', 'aerospace'], says: 'A thing many times round a circle (about y), each turned to face out: a drone\'s four motors, a wheel\'s bolts',
    settings: [{ key: 'turn', label: 'Turn each to face out', type: 'boolean', default: true }],
    ports: { inputs: [thing(), N('n', undefined, { default: 4, optional: true, label: 'how many' }), L('r', 0.15, 'radius')], outputs: [thing('ring', 'ring')] },
    run: (i, c) => ({ ring: arrayCircle(asThing(i.thing), Number(i.n ?? 4), Number(i.r ?? 0.15), c.set.turn !== false) }),
    tests: [{ inputs: { thing: { name: 'b' }, n: 2, r: 1 }, outputs: { ring: { items: [{ at: [1, 0, 0] }, { s: 1 }] } } }] }),
  def({ id: 'array.grid', name: 'Grid of', kind: 'logic', ability: 'generate', domains: ['structural', 'everyday', 'operations'], says: 'A thing on a grid, nx by nz, and ny high: a swarm, a street of buildings, a city of streets. One thing stored, all of them placed',
    ports: { inputs: [thing(), N('nx', undefined, { default: 3, optional: true }), N('nz', undefined, { default: 3, optional: true }), N('ny', undefined, { default: 1, optional: true, label: 'how many high' }), L('sx', 1, 'spacing x'), L('sy', 1, 'spacing y'), L('sz', 1, 'spacing z'), N('vary', undefined, { default: 0, optional: true, label: 'vary each one\'s height (0.5: ±50 %)' }), N('seed', undefined, { default: 1, optional: true })], outputs: [thing('grid', 'grid')] },
    run: (i) => ({ grid: arrayGrid(asThing(i.thing), Number(i.nx ?? 3), Number(i.nz ?? 3), [Number(i.sx ?? 1), Number(i.sy ?? 1), Number(i.sz ?? 1)], Number(i.ny ?? 1), undefined, Number(i.vary ?? 0), Number(i.seed ?? 1)) }),
    tests: [{ inputs: { thing: { name: 'b' }, nx: 2, nz: 1, sx: 2 }, outputs: { grid: { items: [{ at: [-1, 0, 0] }, { at: [1, 0, 0] }] } } }] }),
  def({ id: 'mirror', name: 'Mirror', kind: 'logic', ability: 'transform', domains: ['mechanical', 'vehicles'], says: 'A thing and its mirror image across a plane through the origin',
    settings: [{ key: 'axis', label: 'Across', type: 'choice', default: 'x', choices: ['x', 'y', 'z'] }],
    ports: { inputs: [thing()], outputs: [thing('pair', 'pair')] }, run: (i, c) => ({ pair: mirror(asThing(i.thing), String(c.set.axis) as 'x') }),
    tests: [{ set: { axis: 'x' }, inputs: { thing: { name: 'b' } }, outputs: { pair: { items: [{ s: 1 }, { over: { scale: [-1, 1, 1] } }] } } }] }),
  def({ id: 'combine', name: 'Combine', kind: 'logic', ability: 'transform', domains: ['mechanical', 'structural', 'everyday'], says: 'Several things as one assembly, each where it is: a frame and its motors, a city and the swarm over it',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'assembly' }],
    ports: { inputs: [P('things', 'assembly', { many: true, label: 'things' })], outputs: [thing('assembly', 'assembly')] },
    run: (i, c) => { const ts = (Array.isArray(i.things) ? i.things : [i.things]).filter(Boolean).map(asThing); if (!ts.length) throw new Error('nothing wired in to combine'); return { assembly: combine(ts, String(c.set.name || 'assembly')) }; },
    tests: [{ set: { name: 'two' }, inputs: { things: [{ name: 'a' }, { name: 'b' }] }, outputs: { assembly: { name: 'two' } } }] }),
  def({ id: 'variant', name: 'Variant', kind: 'logic', ability: 'transform', domains: ['mechanical', 'manufacturing', 'everyday'], says: 'The same thing changed where it is placed: its colour, its material, its finish, its size along x, y and z, or hidden; on all of it, or only the pieces whose names a pattern finds ("prop", "arm|frame")',
    settings: [{ key: 'path', label: 'Only pieces named (pattern, blank: all)', type: 'text', default: '' }, { key: 'color', label: 'Colour (blank: as it is)', type: 'text', default: '' }, { key: 'mat', label: 'Material (blank: as it is)', type: 'choice', default: '', choices: ['', ...ENGINEERING] }, { key: 'finish', label: 'Finish', type: 'choice', default: '', choices: FINISHES }, { key: 'hide', label: 'Hide them', type: 'boolean', default: false }],
    ports: { inputs: [thing(), N('kx', undefined, { default: 1, optional: true, label: 'size along x' }), N('ky', undefined, { default: 1, optional: true, label: 'size along y' }), N('kz', undefined, { default: 1, optional: true, label: 'size along z' })], outputs: [thing('variant', 'variant'), N('mass', 'kg')] },
    run: (i, c) => {
      const t = asThing(i.thing), k: [number, number, number] = [Number(i.kx ?? 1), Number(i.ky ?? 1), Number(i.kz ?? 1)];
      const over: Override = { ...(c.set.path ? { path: String(c.set.path) } : {}), ...(c.set.color ? { color: hex(c.set.color) } : {}), ...(c.set.mat ? { mat: String(c.set.mat) } : {}), ...(c.set.finish ? { finish: String(c.set.finish) } : {}), ...(c.set.hide ? { hide: true } : {}), ...(k.some((x) => x !== 1) ? { scale: k } : {}) };
      if (over.path) try { new RegExp(over.path); } catch { throw new Error(`"${over.path}" is not a pattern`); }
      const v: Assembly = { name: t.name, items: [{ ...place(t), over }] }; return { variant: v, mass: massOfAll(v) };
    },
    tests: [{ set: { mat: 'al-6061' }, inputs: { thing: { name: 'b', shape: { box: [0.1, 0.1, 0.1] }, mat: 'steel-low' } }, outputs: { mass: 2.7 }, rel: 1e-9 }, { set: { hide: true }, inputs: { thing: { name: 'b', shape: { box: [0.1, 0.1, 0.1] }, mat: 'steel-low' } }, outputs: { mass: 0 } }] }),
  def({ id: 'axis', name: 'Point along', kind: 'logic', ability: 'transform', domains: ['mechanical'], says: 'A thing turned so its up (y) points along x, y or z, or reversed: a motor laid on its side, a shaft made horizontal',
    settings: [{ key: 'to', label: 'Its y along', type: 'choice', default: 'x', choices: ['x', '-x', 'y', '-y', 'z', '-z'] }],
    ports: { inputs: [thing()], outputs: [thing('turned', 'turned')] },
    run: (i, c) => { const r: Record<string, [number, number, number]> = { x: [0, 0, -Math.PI / 2], '-x': [0, 0, Math.PI / 2], y: [0, 0, 0], '-y': [Math.PI, 0, 0], z: [Math.PI / 2, 0, 0], '-z': [-Math.PI / 2, 0, 0] }; const t = asThing(i.thing); return { turned: { name: t.name, items: [place(t, [0, 0, 0], r[String(c.set.to)] ?? [0, 0, 0])] } }; },
    tests: [{ set: { to: 'z' }, inputs: { thing: { name: 'b' } }, outputs: { turned: { items: [{ rot: [Math.PI / 2, 0, 0] }] } } }] }),
  def({ id: 'hole', name: 'Hole', kind: 'logic', ability: 'transform', domains: ['mechanical', 'manufacturing'], says: 'A hole drilled into a part: its radius and depth, where it starts on the part and which way it goes in; with sides, a hex or square pocket. Its volume comes out of the mass',
    settings: [{ key: 'dir', label: 'Drilled toward', type: 'choice', default: '-y', choices: ['-y', 'y', '-x', 'x', '-z', 'z'] }, { key: 'sides', label: 'Sides (0: round)', type: 'number', default: 0 }, { key: 'path', label: 'Into the piece named (blank: the part itself)', type: 'text', default: '' }],
    ports: { inputs: [P('part', 'part'), L('r', 0.004, 'radius'), L('depth', 0.01, 'depth'), L('x', 0), L('y', 0), L('z', 0)], outputs: [P('drilled', 'part'), N('mass', 'kg')] },
    run: (i, c) => {
      const p = i.part as Part; if (!isPart(p)) throw new Error('a hole goes into a part (a shape or a standard part), not an assembly');
      const d: Record<string, [number, number, number]> = { y: [0, 1, 0], '-y': [0, -1, 0], x: [1, 0, 0], '-x': [-1, 0, 0], z: [0, 0, 1], '-z': [0, 0, -1] };
      const cut = { r: Number(i.r ?? 0.004), depth: Number(i.depth ?? 0.01), at: [Number(i.x ?? 0), Number(i.y ?? 0), Number(i.z ?? 0)] as [number, number, number], dir: d[String(c.set.dir)] ?? [0, -1, 0], ...(Number(c.set.sides) >= 3 ? { n: Math.round(Number(c.set.sides)) } : {}) };
      const pat = c.set.path ? new RegExp(String(c.set.path), 'i') : null; let done = false;
      const into = (q: Part): Part => { if (!done && q.shape && (!pat || pat.test(q.name))) { done = true; return { ...q, cuts: [...(q.cuts ?? []), cut] }; } return q.parts ? { ...q, parts: q.parts.map(into) } : q; };
      const out = into(p); if (!done) throw new Error(pat ? `no piece named like "${c.set.path}" with a shape` : 'it has no shape of its own to drill: name the piece');
      return { drilled: out, mass: massOf(out) };
    },
    tests: [{ inputs: { part: { name: 'b', shape: { box: [0.1, 0.1, 0.1] }, mat: 'steel-low' }, r: 0.01, depth: 0.1 }, outputs: { mass: (0.001 - Math.PI * 0.0001 * 0.1) * 7850 }, rel: 1e-9 }] }),
  def({ id: 'measure', name: 'Measure', kind: 'critic', ability: 'measure', domains: ['mechanical', 'structural', 'everyday'], says: 'What a thing weighs and spans, how many pieces it places, and how few distinct things it is stored as',
    ports: { inputs: [thing()], outputs: [N('mass', 'kg'), L('w', 0, 'width'), L('h', 0, 'height'), L('d', 0, 'depth'), P('placed', 'integer', { label: 'pieces placed' }), P('distinct', 'integer', { label: 'things stored' })] },
    run: (i) => { const t = asThing(i.thing), b = boundsOfAll(t), z = b.isEmpty(); return { mass: massOfAll(t), w: z ? 0 : b.max.x - b.min.x, h: z ? 0 : b.max.y - b.min.y, d: z ? 0 : b.max.z - b.min.z, placed: placedCount(t), distinct: distinctCount(t) }; },
    tests: [{ inputs: { thing: { name: 'b', shape: { box: [0.1, 0.2, 0.3] }, mat: 'steel-low' } }, outputs: { mass: 0.006 * 7850, w: 0.1, h: 0.2, d: 0.3, placed: 1 }, rel: 1e-9 }], sink: true }),
  def({ id: 'space.show', name: 'Show in space', kind: 'view', ability: 'show', domains: ['everyday', 'mechanical', 'structural'], says: 'Puts a thing into the 3D space, at its place: everything wired into one of these is what the space draws',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'shown' }],
    ports: { inputs: [thing()], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { thing: { name: 'b' } }, outputs: {} }] }),
];

for (const b of BUILT_IN) LIBRARY.set(b.id, b);
for (const b of BUILT_THINGS) LIBRARY.set(b.id, b);
for (const b of lawBlocks()) LIBRARY.set(b.id, b);
export const block = (id: string): BlockDef | undefined => LIBRARY.get(id);
