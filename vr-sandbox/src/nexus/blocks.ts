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
import * as THREE from 'three';
import { bodiesOf, posedAt, simulate, type SimJoint, type SimOut } from './sim';
import { Servo } from './motion';
import { GEARHEADS, MOTORS } from '../data/motors';
import { motorModel, windingR } from '../engineering/dcmotor';
import { AMBIENT } from '../engineering/thermal';
import type { Jolt } from './realize';
import { arrayCircle, arrayGrid, arrayLine, boundsOfAll, cellPick, combine, distinctCount, frame, matrixOf, framesOf, isAssembly, isPart, massOfAll, mateTo, mirror, place, placedCount, type Assembly, type Override } from './assembly';
import { massOf } from './mass';
import { MACHINES, TREADS, makeMachine, rollingOf, styledCar, styles, tyreBuilt, tyreOf, type Axle, type Machine, type Susp, type Tread } from './machines';
import { cellPack, explodeAudit, liCell, starterBattery } from './components';
import { BCI_GROUPS, CELL_FORMATS } from '../data/batteries';
import { exploded, fitIn } from './assembly';
import { BOARDS, PROCESSES, SOCKETS, desktop, die, motherboard, nandCell, packageOf, sramCell, transistor } from './computer';
const KINDS_OF_VEHICLE = ['car', 'truck', 'atv', 'motorcycle', 'forklift', 'mower', 'kart'];
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
  /** The values it may take, to pick from (a room's type, a house's layout): one press each. */
  choices?: string[];
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
  /** The board's clock, s: what the time bar is at (motion, signals, anything that changes over time reads it). */
  time?: number;
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
  /** It reads the board's clock (or holds a block that does): run again whenever the time changes. By its settings where
   *  that hangs on them (a spawner of a seed that moves). */
  clock?: boolean | ((set: Record<string, unknown>) => boolean);
}
/** Whether a block, so set, reads the clock. */
export const clockOf = (b: BlockDef, set: Record<string, unknown> = {}): boolean => (typeof b.clock === 'function' ? b.clock({ ...defaultsOf(b), ...set }) : !!b.clock);
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
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'x' }, { key: 'type', label: 'Type', type: 'text', default: 'any' }, { key: 'unit', label: 'Unit', type: 'text', default: '' }, { key: 'default', label: 'Default (blank: must be given)', type: 'text', default: '' }, { key: 'choices', label: 'Choices (split by |)', type: 'text', default: '' }, { key: 'says', label: 'What it is', type: 'text', default: '' }],
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
const look: SettingDef[] = [{ key: 'mat', label: 'Material', type: 'choice', default: 'steel-low', choices: ENGINEERING }, { key: 'color', label: 'Colour', type: 'text', default: '#9aa3ad' }, { key: 'finish', label: 'Finish', type: 'choice', default: '', choices: FINISHES }, { key: 'glow', label: 'Glows (a lamp lit)', type: 'boolean', default: false }, { key: 'fill', label: 'Solid share (1 solid; a car body or a fridge is mostly air)', type: 'number', default: 1 }];
/** A shape's colour and material may be wired in, so a seed's paint reaches the pieces it paints. */
const lookIn = (): PortDef[] => [P('color', 'text', { optional: true, label: 'colour (wired: over the setting)' }), P('mat', 'text', { optional: true, label: 'material (wired)' })];
const lookOf = (i: Record<string, unknown>, set: Record<string, unknown>): Record<string, unknown> => ({ ...set, ...(i.color ? { color: i.color } : {}), ...(i.mat ? { mat: i.mat } : {}) });
const hex = (c: unknown, d = 0x9aa3ad): number => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c ?? '').trim()); return m ? parseInt(m[1]!, 16) : d; };
const L = (name: string, def: number, label?: string, more: Partial<PortDef> = {}) => N(name, 'm', { default: def, optional: true, ...(label ? { label } : {}), ...more });
const thing = (name = 'thing', label = 'thing') => P(name, 'assembly', { label });
/** A part of one shape, of its material, coloured and finished. */
function shapePart(name: string, shape: Part['shape'], set: Record<string, unknown>): Part {
  return { name: String(set.name || name), shape, at: [0, 0, 0], mat: String(set.mat || 'steel-low'), color: hex(set.color), ...(set.finish ? { finish: String(set.finish) } : {}), ...(set.glow ? { glow: true } : {}), ...(set.fill !== undefined && Number(set.fill) !== 1 && Number(set.fill) >= 0 ? { fill: Number(set.fill) } : {}) };
}
const shapeBlock = (id: string, name: string, says: string, inputs: PortDef[], make: (i: Record<string, number>) => Part['shape'], test: { inputs: Record<string, number>; mass: number }) => def({
  id: `shape.${id}`, name, kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'structural'], says,
  settings: [{ key: 'name', label: 'Name', type: 'text', default: name.toLowerCase() }, ...look],
  ports: { inputs: [...inputs, ...lookIn()], outputs: [P('part', 'part'), N('mass', 'kg')] },
  run: (i, c) => { const v = Object.fromEntries(inputs.filter((q) => i[q.name] !== undefined || q.default !== undefined).map((q) => [q.name, Number(i[q.name] ?? q.default)])); for (const [k, x] of Object.entries(v)) if (!(x >= 0) || !Number.isFinite(x)) throw new Error(`${k} must be a size, not ${x}`); const p = shapePart(name.toLowerCase(), make(v), lookOf(i, c.set)); return { part: p, mass: massOf(p) }; },
  tests: [{ set: { mat: 'steel-low' }, inputs: test.inputs, outputs: { mass: test.mass }, rel: 1e-9 }],
});
/** Points typed as "x, y; x, y; …" in millimetres. */
function points(t: unknown): [number, number][] {
  const pts = String(t ?? '').split(';').map((q) => q.split(',').map((x) => Number(x.trim()) / 1000)).filter((q) => q.length === 2 && q.every(Number.isFinite)) as [number, number][];
  if (pts.length < 3) throw new Error('a profile needs three points or more, as "x, y; x, y; …" in mm');
  return pts;
}
const asThing = (v: unknown): Part | Assembly => { if (isAssembly(v) || isPart(v)) return v; throw new Error('nothing made to place: wire a shape, a part or an assembly in'); };

/** A seeded stream of numbers in [0, 1): the same seed, the same stream (Park and Miller's minimal standard). */
export function rng(seed: number): () => number { let r = (Math.abs(Math.round(seed * 9973)) % 2147483646) + 1; return () => { r = (r * 48271) % 2147483647; return r / 2147483647; }; }
/** Smooth seeded noise: value noise summed over octaves, each finer by two and weaker by the roughness. */
function fbm(x: number, z: number, seed: number, rough: number): number {
  const v = (ix: number, iz: number) => { const h = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453; return h - Math.floor(h); };
  const smooth = (x0: number, z0: number) => { const ix = Math.floor(x0), iz = Math.floor(z0), fx = x0 - ix, fz = z0 - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz); return (v(ix, iz) * (1 - ux) + v(ix + 1, iz) * ux) * (1 - uz) + (v(ix, iz + 1) * (1 - ux) + v(ix + 1, iz + 1) * ux) * uz; };
  let sum = 0, amp = 1, f = 1; for (let o = 0; o < 5; o++) { sum += smooth(x * f, z * f) * amp; amp *= Math.max(0.05, rough); f *= 2; } return sum;
}
/** The height of ground at x, z (between its grid's points, by their mix). */
export function heightOn(g: { w: number; d: number; n: number; h: number[] }, x: number, z: number): number {
  const fx = Math.max(0, Math.min(g.n, (x / g.w + 0.5) * g.n)), fz = Math.max(0, Math.min(g.n, (z / g.d + 0.5) * g.n)), ix = Math.min(g.n - 1, Math.floor(fx)), iz = Math.min(g.n - 1, Math.floor(fz)), ux = fx - ix, uz = fz - iz, at = (a: number, b: number) => g.h[b * (g.n + 1) + a] ?? 0;
  return (at(ix, iz) * (1 - ux) + at(ix + 1, iz) * ux) * (1 - uz) + (at(ix, iz + 1) * (1 - ux) + at(ix + 1, iz + 1) * ux) * uz;
}
/** Floor plans by name: each a typical home of its kind (room sizes typical of new homes, an estimate). */
/** The physics engine (Jolt, as WebAssembly), loaded the first time it is wanted. */
let joltKept: Promise<Jolt> | null = null;
const jolt = (): Promise<Jolt> => (joltKept ??= import('jolt-physics/wasm-compat').then((m) => m.default() as unknown as Promise<Jolt>));
/** What Let it go worked out, by its inputs (the last 24): the clock only samples it. */
const SIMS = new Map<string, SimOut>();
/** Angles at times: "0 s 0°, 2 s 90°" (seconds, degrees). */
export function keysOf(text: string): { t: number; a: number }[] {
  const k = text.split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const m = /^([\d.]+)\s*s?\s+(-?[\d.]+)\s*°?$/.exec(x); if (!m) throw new Error(`"${x}" is not "seconds angle" (as "2 s 90°")`); return { t: Number(m[1]), a: Number(m[2]) }; });
  if (!k.length) throw new Error('give it at least one angle'); return k.sort((p, q) => p.t - q.t);
}
/** The angle at a time: from the first, driven toward the next key's angle, as a servo (motion.ts) drives a
 *  joint: stepped at 240 a second from 0, so a time is always the same angle. */
export function angleAt(keys: { t: number; a: number }[], t: number, speed: number, accel: number): number {
  const sv = new Servo(keys[0]!.a, Math.max(1e-6, speed), Math.max(1e-6, accel)), dt = 1 / 240, end = Math.min(t, keys[keys.length - 1]!.t + 3600);
  // heading at each moment for the next key still to come (so it is there by its time, as far as its speed lets it), then the last
  let k = 0; for (let x = 0; x < end - 1e-9; x += dt) { while (k < keys.length - 1 && keys[k]!.t <= x) k++; sv.step(keys[k]!.a, Math.min(dt, end - x)); }
  return sv.pos;
}
/** A thing turned by an angle about an axis through a point. */
function turnedAbout(t: Part | Assembly, axis: string, p: [number, number, number], ang: number): Assembly {
  const ax = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0), q = new THREE.Quaternion().setFromAxisAngle(ax, ang);
  const at = new THREE.Vector3(...p).sub(new THREE.Vector3(...p).applyQuaternion(q)), e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return { name: t.name, items: [place(t, [at.x, at.y, at.z], [e.x, e.y, e.z])] };
}
/** What Follow a path keeps of each street as it goes (its cars' places, speeds and last steps), by its inputs: the last
 *  64 streets. */
type Marks = Map<number, { s: number[]; vel: number[]; moved: number[] }> & { sigs: Map<string, number>; cycle?: { from: number; len: number } };
const FOLLOW_MARKS = new Map<string, Marks>();
/** A fixed-time cycle's phases ("green 30, yellow 4, red 34"), and which it is in at a time. */
export function phasesOf(text: string): { name: string; s: number }[] {
  const ph = text.split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const m = /^(.+?)\s+([\d.]+)$/.exec(x); if (!m) throw new Error(`"${x}" is not "phase seconds"`); return { name: m[1]!.trim(), s: Number(m[2]) }; });
  if (!ph.length || ph.some((p) => !(p.s > 0))) throw new Error('a cycle needs phases of more than 0 s'); return ph;
}
export function phaseAt(ph: { name: string; s: number }[], t: number): { name: string; left: number } {
  const T = ph.reduce((a, p) => a + p.s, 0); let u = ((t % T) + T) % T;
  for (const p of ph) { if (u < p.s) return { name: p.name, left: p.s - u }; u -= p.s; }
  return { name: ph[0]!.name, left: ph[0]!.s };
}
/** The cross street's phase: green while this way is red, but yellow (as long as this way's yellow) at the end of it; red otherwise. */
export function crossOf(ph: { name: string; s: number }[], t: number): string {
  const at = phaseAt(ph, t); if (at.name !== 'red') return 'red';
  const y = ph.find((p) => p.name === 'yellow')?.s ?? 0; return at.left <= y ? 'yellow' : 'green';
}
export const PLANS: Record<string, string> = {
  studio: 'living 5x4, bathroom 2.4x4 / kitchen 7.4x2.6',
  '1 bed': 'bedroom 3.6x3.6, bathroom 2.4x3.6 / kitchen 3x3.4, living 3x3.4',
  '2 bed': 'bedroom 3.6x3.6, bathroom 2.4x3.6, bedroom 3.2x3.6 / kitchen 3.4x3.6, living 5.8x3.6',
  '3 bed': 'bedroom 3.6x3.6, bathroom 2.4x3.6, bedroom 3.2x3.6, bedroom 3.2x3.6 / kitchen 4x4, living 5.2x4, bathroom 3.2x4',
};
const BUILT_THINGS: BlockDef[] = [
  shapeBlock('box', 'Box', 'A block: width (x), height (y), depth (z)', [L('w', 0.1, 'width'), L('h', 0.1, 'height'), L('d', 0.1, 'depth')], (v) => ({ box: [v.w!, v.h!, v.d!] }), { inputs: { w: 0.1, h: 0.1, d: 0.1 }, mass: 7.85 }),
  shapeBlock('cyl', 'Cylinder', 'A cylinder along y: its radius and height; a second radius at its top makes it a frustum', [L('r', 0.05, 'radius'), L('h', 0.1, 'height'), N('r2', 'm', { optional: true, label: 'top radius (blank: the same)' })], (v) => ({ cyl: v.r2 !== undefined ? [v.r!, v.h!, v.r2] : [v.r!, v.h!] }), { inputs: { r: 0.05, h: 0.1 }, mass: Math.PI * 0.0025 * 0.1 * 7850 }),
  shapeBlock('sphere', 'Sphere', 'A ball: its radius', [L('r', 0.05, 'radius')], (v) => ({ sphere: v.r! }), { inputs: { r: 0.05 }, mass: (4 / 3) * Math.PI * 0.05 ** 3 * 7850 }),
  shapeBlock('cone', 'Cone', 'A cone along y: base radius and height', [L('r', 0.05, 'radius'), L('h', 0.1, 'height')], (v) => ({ cone: [v.r!, v.h!] }), { inputs: { r: 0.05, h: 0.1 }, mass: (Math.PI * 0.0025 * 0.1 / 3) * 7850 }),
  shapeBlock('torus', 'Ring', 'A ring round z: its radius to the middle of the tube, and the tube\'s radius', [L('R', 0.05, 'ring radius'), L('r', 0.01, 'tube radius')], (v) => ({ torus: [v.R!, v.r!] }), { inputs: { R: 0.05, r: 0.01 }, mass: 2 * Math.PI ** 2 * 0.05 * 0.0001 * 7850 }),
  shapeBlock('tube', 'Tube', 'A straight tube along y: outside radius, wall and length', [L('r', 0.02, 'outside radius'), L('wall', 0.002, 'wall'), L('h', 0.5, 'length')], (v) => { if (v.wall! >= v.r!) throw new Error('the wall is as thick as the tube'); return { tube: { r: v.r!, wall: v.wall!, pts: [[0, -v.h! / 2, 0], [0, v.h! / 2, 0]] } }; }, { inputs: { r: 0.02, wall: 0.002, h: 0.5 }, mass: Math.PI * (0.02 ** 2 - 0.018 ** 2) * 0.5 * 7850 }),
  def({ id: 'shape.extrude', name: 'Extrude', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'structural'], says: 'A profile drawn in x and y (mm), pushed out along z to a length: a bracket, a beam, a plate of any outline',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'profile' }, { key: 'profile', label: 'Profile, mm: x, y; x, y; …', type: 'code', default: '0, 0; 60, 0; 60, 6; 6, 6; 6, 40; 0, 40' }, ...look],
    ports: { inputs: [L('L', 0.1, 'length'), ...lookIn()], outputs: [P('part', 'part'), N('mass', 'kg')] },
    run: (i, c) => { const p = shapePart('profile', { prism: { pts: points(c.set.profile), L: Number(i.L ?? 0.1) } }, lookOf(i, c.set)); return { part: p, mass: massOf(p) }; },
    tests: [{ set: { profile: '0,0; 100,0; 100,100; 0,100', mat: 'steel-low' }, inputs: { L: 0.1 }, outputs: { mass: 7.85 }, rel: 1e-9 }] }),
  def({ id: 'shape.lathe', name: 'Turn (lathe)', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing'], says: 'A profile of radius and height (mm) spun about y: a propeller hub, a pulley, a knob, a vase',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'turned' }, { key: 'profile', label: 'Profile, mm: r, y; r, y; …', type: 'code', default: '0, 0; 20, 0; 20, 5; 8, 8; 8, 30; 0, 30' }, ...look],
    ports: { inputs: lookIn(), outputs: [P('part', 'part'), N('mass', 'kg')] },
    run: (i, c) => { const p = shapePart('turned', { lathe: points(c.set.profile) }, lookOf(i, c.set)); return { part: p, mass: massOf(p) }; },
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
    ports: { inputs: [thing(), P('color', 'text', { optional: true, label: 'colour (wired: over the setting)' }), N('kx', undefined, { default: 1, optional: true, label: 'size along x' }), N('ky', undefined, { default: 1, optional: true, label: 'size along y' }), N('kz', undefined, { default: 1, optional: true, label: 'size along z' })], outputs: [thing('variant', 'variant'), N('mass', 'kg')] },
    run: (i, c) => {
      const t = asThing(i.thing), k: [number, number, number] = [Number(i.kx ?? 1), Number(i.ky ?? 1), Number(i.kz ?? 1)];
      const over: Override = { ...(c.set.path ? { path: String(c.set.path) } : {}), ...(i.color || c.set.color ? { color: hex(i.color || c.set.color) } : {}), ...(c.set.mat ? { mat: String(c.set.mat) } : {}), ...(c.set.finish ? { finish: String(c.set.finish) } : {}), ...(c.set.hide ? { hide: true } : {}), ...(k.some((x) => x !== 1) ? { scale: k } : {}) };
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
  // ---- the world: ground, scattering, walls with openings, choosing, rows to spawn from ----------------------------
  def({ id: 'terrain', name: 'Terrain', kind: 'generator', ability: 'generate', domains: ['structural', 'energy', 'everyday'], says: 'Ground over w by d, its hills from a seeded noise (the same seed, the same land): relief is how high its highest is over its lowest, roughness how much small detail it has',
    settings: [{ key: 'color', label: 'Colour', type: 'text', default: '#5d8a3a' }],
    ports: { inputs: [L('w', 50, 'width'), L('d', 50, 'depth'), L('relief', 3, 'relief'), N('cells', undefined, { default: 64, optional: true, label: 'cells across' }), N('rough', undefined, { default: 0.5, optional: true, label: 'roughness (0–1)' }), N('seed', undefined, { default: 1, optional: true })], outputs: [P('ground', 'part'), N('mass', 'kg'), L('high', 0, 'highest'), L('low', 0, 'lowest')] },
    run: (i, c) => {
      const w = Number(i.w ?? 50), d = Number(i.d ?? 50), n = Math.max(2, Math.min(256, Math.round(Number(i.cells ?? 64)))), relief = Number(i.relief ?? 3), rough = Math.max(0, Math.min(1, Number(i.rough ?? 0.5))), seed = Number(i.seed ?? 1);
      const h: number[] = []; for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) h.push(fbm(x / n * 4, z / n * 4, seed, rough));
      const lo = Math.min(...h), hi = Math.max(...h), k = hi > lo ? relief / (hi - lo) : 0;
      const heights = h.map((y) => (y - lo) * k), p: Part = { name: 'ground', shape: { ground: { w, d, n, h: heights, base: 0.3 } }, at: [0, 0, 0], mat: 'soil', color: hex(c.set.color, 0x5d8a3a) };
      return { ground: p, mass: massOf(p), high: relief, low: 0 };
    },
    tests: [{ inputs: { w: 10, d: 10, relief: 0, cells: 4 }, outputs: { mass: 10 * 10 * 0.3 * 1500, high: 0 }, rel: 1e-9 }] }),
  def({ id: 'scatter', name: 'Scatter', kind: 'logic', ability: 'generate', domains: ['everyday', 'structural', 'energy'], says: 'A thing many times over an area: at seeded random places (the same seed, the same places), or on a grid; each turned and sized a little differently if asked; standing on ground where ground is wired in',
    settings: [{ key: 'mode', label: 'Laid', type: 'choice', default: 'random', choices: ['random', 'grid'] }, { key: 'turn', label: 'Turn each at random', type: 'boolean', default: true }],
    ports: { inputs: [thing(), L('w', 1, 'width'), L('d', 1, 'depth'), N('n', undefined, { default: 20, optional: true, label: 'how many (random)' }), L('step', 0.3, 'spacing (grid)'), N('smin', undefined, { default: 1, optional: true, label: 'least scale' }), N('smax', undefined, { default: 1, optional: true, label: 'most scale' }), N('seed', undefined, { default: 1, optional: true }), P('on', 'part', { optional: true, label: 'ground to stand on' })], outputs: [thing('scattered', 'scattered'), P('count', 'integer')] },
    run: (i, c) => {
      const t = asThing(i.thing), w = Number(i.w ?? 1), d = Number(i.d ?? 1), r = rng(Number(i.seed ?? 1)), smin = Number(i.smin ?? 1), smax = Number(i.smax ?? 1), turn = c.set.turn !== false, on = i.on as Part | undefined;
      const at: [number, number][] = [];
      if (c.set.mode === 'grid') { const step = Math.max(1e-6, Number(i.step ?? 0.3)), nx = Math.max(1, Math.floor(w / step)), nz = Math.max(1, Math.floor(d / step)); if (nx * nz > 2e6) throw new Error(`${(nx * nz).toLocaleString()} is more than two million: space them wider`); for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) at.push([(x + 0.5) * step - w / 2, (z + 0.5) * step - d / 2]); }
      else { const n = Math.max(0, Math.min(2e6, Math.round(Number(i.n ?? 20)))); for (let k = 0; k < n; k++) at.push([(r() - 0.5) * w, (r() - 0.5) * d]); }
      const g = on?.shape && 'ground' in on.shape ? on.shape.ground : null;
      const items = at.map(([x, z]) => place(t, [x, g ? heightOn(g, x, z) : 0, z], [0, turn ? r() * Math.PI * 2 : 0, 0], smin + (smax - smin) * r()));
      return { scattered: { name: `${items.length} × ${t.name}`, items }, count: items.length };
    },
    tests: [{ set: { mode: 'grid' }, inputs: { thing: { name: 'b' }, w: 1, d: 1, step: 0.5 }, outputs: { count: 4 } }] }),
  def({ id: 'wall', name: 'Wall with an opening', kind: 'generator', ability: 'generate', domains: ['structural', 'everyday'], says: 'A wall along x, standing on y = 0, with an opening for a door or a window (or none) at an offset from its middle; gives the opening\'s middle, where a door or a window goes',
    settings: [{ key: 'opening', label: 'Opening', type: 'choice', default: 'none', choices: ['none', 'door', 'window'] }, { key: 'name', label: 'Name', type: 'text', default: 'wall' }, ...look.filter((x) => x.key !== 'glow')],
    ports: { inputs: [L('L', 4, 'length'), L('h', 2.4, 'height'), L('t', 0.15, 'thickness'), L('ow', 0.9, 'opening width'), L('oh', 2.1, 'opening height'), L('sill', 0.9, 'window sill height'), L('off', 0, 'opening offset from the middle'), P('opening', 'text', { optional: true, label: 'opening (wired: over the setting)', choices: ['none', 'door', 'window'] }), ...lookIn()], outputs: [P('wall', 'part'), L('ox', 0, 'opening middle x'), L('oy', 0, 'opening middle y'), N('mass', 'kg')] },
    run: (i, c) => {
      const Lw = Number(i.L ?? 4), h = Number(i.h ?? 2.4), t = Number(i.t ?? 0.15), kind = String(i.opening || c.set.opening || 'none'), set = lookOf(i, c.set);
      const ow = Math.min(Number(i.ow ?? 0.9), Lw - 0.1), oh = Math.min(Number(i.oh ?? 2.1), h - 0.05), sill = kind === 'door' ? 0 : Math.min(Number(i.sill ?? 0.9), h - oh), off = Number(i.off ?? 0);
      const piece = (name: string, w: number, hh: number, x: number, y: number): Part => ({ ...shapePart(name, { box: [w, hh, t] }, set), at: [x, y, 0] });
      const parts: Part[] = [];
      if (kind === 'none') parts.push(piece(`${set.name || 'wall'}`, Lw, h, 0, h / 2));
      else {
        const x0 = off - ow / 2, x1 = off + ow / 2, left = x0 + Lw / 2, right = Lw / 2 - x1;
        if (left > 1e-4) parts.push(piece('wall left of opening', left, h, -Lw / 2 + left / 2, h / 2));
        if (right > 1e-4) parts.push(piece('wall right of opening', right, h, Lw / 2 - right / 2, h / 2));
        const top = h - (sill + oh); if (top > 1e-4) parts.push(piece('wall over opening', ow, top, off, sill + oh + top / 2));
        if (sill > 1e-4) parts.push(piece('wall under opening', ow, sill, off, sill / 2));
      }
      const oy = kind === 'door' ? oh / 2 : sill + oh / 2;
      // its opening is a frame (facing +z, the wall's front): a door or a window is mated into it by the frame's name
      const p: Part = { name: String(set.name || 'wall'), at: [0, 0, 0], parts, ...(kind !== 'none' ? { ports: [frame('opening', [off, oy, 0])] } : {}) };
      return { wall: p, ox: off, oy, mass: massOf(p) };
    },
    tests: [{ set: { opening: 'none', mat: 'concrete' }, inputs: { L: 4, h: 2.5, t: 0.2 }, outputs: { mass: 4 * 2.5 * 0.2 * 2400 }, rel: 1e-9 }, { set: { opening: 'door', mat: 'concrete' }, inputs: { L: 4, h: 2.5, t: 0.2, ow: 1, oh: 2 }, outputs: { mass: (4 * 2.5 - 1 * 2) * 0.2 * 2400, oy: 1 }, rel: 1e-9 }] }),
  def({ id: 'frame', name: 'Frame', kind: 'logic', ability: 'connect', domains: ['mechanical', 'structural', 'everyday'], says: 'A named place on a thing, facing a way: where something is set on it, or where it is set on something (a door\'s middle, a house\'s drive). Mate finds it by its name',
    settings: [{ key: 'name', label: 'Its name', type: 'text', default: 'fit' }, { key: 'facing', label: 'Facing', type: 'choice', default: '+z', choices: ['+z', '-z', '+x', '-x', '+y', '-y'] }],
    ports: { inputs: [thing(), L('x', 0), L('y', 0), L('z', 0)], outputs: [thing('thing', 'with its frame'), P('frames', 'list<text>', { label: 'its frames' })] },
    run: (i, c) => {
      const t = asThing(i.thing), f = String(c.set.facing ?? '+z'), k = f[0] === '-' ? -1 : 1, ax = f[1] as 'x' | 'y' | 'z';
      const n: [number, number, number] = [ax === 'x' ? k : 0, ax === 'y' ? k : 0, ax === 'z' ? k : 0], u: [number, number, number] = ax === 'y' ? [0, 0, -k] : [0, 1, 0];
      const a = isAssembly(t) ? t : { name: t.name, items: [place(t)] };
      const out: Assembly = { ...a, ports: [...(a.ports ?? []).filter((q) => q.name !== String(c.set.name)), frame(String(c.set.name), [Number(i.x ?? 0), Number(i.y ?? 0), Number(i.z ?? 0)], n, u)] };
      return { thing: out, frames: framesOf(out).map((q) => q.name) };
    },
    tests: [{ set: { name: 'fit' }, inputs: { thing: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, y: 1 }, outputs: { frames: ['fit'] } }] }),
  def({ id: 'mate', name: 'Mate', kind: 'logic', ability: 'connect', domains: ['mechanical', 'structural', 'everyday'], says: 'One thing set on another by their frames: its frame lands on the other\'s, turned to face as it does ("into": a door in its opening, a window in its wall) or back at it ("against": a face on a face). Move what it goes on and it follows',
    settings: [{ key: 'frame', label: 'Its frame', type: 'text', default: 'fit' }, { key: 'onto', label: 'The frame it goes on', type: 'text', default: 'opening' }, { key: 'how', label: 'How', type: 'choice', default: 'into', choices: ['into', 'against'] }],
    ports: { inputs: [thing('thing', 'what is set'), thing('on', 'what it is set on')], outputs: [thing('placed', 'it, placed'), thing('both', 'both together')] },
    run: (i, c) => {
      const t = asThing(i.thing), on = asThing(i.on), r = mateTo(t, String(c.set.frame), on, String(c.set.onto), c.set.how === 'against' ? 'against' : 'into');
      if (typeof r === 'string') throw new Error(r);
      const placed: Assembly = { name: t.name, items: [r] };
      return { placed, both: { name: `${on.name} with ${t.name}`, items: [place(on), r] } };
    },
    tests: [{ set: { frame: 'fit', onto: 'opening' }, inputs: { thing: { name: 'door', items: [], ports: [{ name: 'fit', sex: 'frame', thread: '', pattern: [], at: [0, 0, 0], n: [0, 0, 1], u: [0, 1, 0], t: 0 }] }, on: { name: 'wall', items: [], ports: [{ name: 'opening', sex: 'frame', thread: '', pattern: [], at: [1, 1.05, 2], n: [1, 0, 0], u: [0, 1, 0], t: 0 }] } }, outputs: { placed: { items: [{ at: [1, 1.05, 2] }] } } }] }),
  def({ id: 'pick', name: 'Pick one', kind: 'logic', ability: 'decide', domains: ['everyday', 'software'], says: 'One of several things, by name: plug in what each choice is (a bathroom\'s fittings, a kitchen\'s, a bedroom\'s…), and the choice says which comes out',
    settings: [{ key: 'options', label: 'Choices (split by |)', type: 'text', default: 'a|b' }, { key: 'empty', label: 'A choice with nothing plugged in gives nothing (an empty thing)', type: 'boolean', default: false }],
    ports: (s) => { const o = String(s.options ?? '').split('|').map((x) => x.trim()).filter(Boolean); return { inputs: [P('which', 'text', { label: 'which', choices: o, default: o[0] }), ...o.map((n) => P(n, 'any', { optional: true }))], outputs: [P('chosen', 'any')] }; },
    run: (i, c) => { const o = String(c.set.options).split('|').map((x) => x.trim()).filter(Boolean), w = String(i.which ?? o[0]); if (!o.includes(w)) throw new Error(`"${w}" is not one of ${o.join(', ')}`); if (i[w] === undefined) { if (c.set.empty) return { chosen: { name: w, items: [] } }; throw new Error(`nothing is plugged in for "${w}"`); } return { chosen: i[w] }; },
    tests: [{ set: { options: 'a|b' }, inputs: { which: 'b', a: 1, b: 2 }, outputs: { chosen: 2 } }] }),
  def({ id: 'rows.grid', name: 'Rows on a grid', kind: 'logic', ability: 'generate', domains: ['everyday', 'operations', 'structural'], says: 'Rows for a spawner: one for each place on an nx by nz grid (x, z), and for each column asked, a value picked at seeded random from its list ("layout: studio|1 bed|2 bed; paint: #e8dcc8|#cfd8dc"), or a number in a range ("length: 4..6")',
    settings: [{ key: 'columns', label: 'Columns: name: a|b|c; name: lo..hi', type: 'code', default: 'paint: #e8dcc8|#cfd8dc|#f5e6c8' }, { key: 'turn', label: 'Each turned by (degrees, about y)', type: 'number', default: 0 }],
    ports: { inputs: [N('nx', undefined, { default: 3, optional: true }), N('nz', undefined, { default: 3, optional: true }), L('sx', 20, 'spacing x'), L('sz', 20, 'spacing z'), N('seed', undefined, { default: 1, optional: true })], outputs: [P('rows', 'table'), P('count', 'integer')] },
    run: (i, c) => {
      const nx = Math.max(1, Math.round(Number(i.nx ?? 3))), nz = Math.max(1, Math.round(Number(i.nz ?? 3))), sx = Number(i.sx ?? 20), sz = Number(i.sz ?? 20), r = rng(Number(i.seed ?? 1));
      const cols = String(c.set.columns ?? '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => { const [k, v] = x.split(':').map((y) => y.trim()); const range = /^(-?[\d.]+)\s*\.\.\s*(-?[\d.]+)$/.exec(v ?? ''); return { k: k!, opts: range ? null : (v ?? '').split('|').map((y) => y.trim()).filter(Boolean), lo: range ? Number(range[1]) : 0, hi: range ? Number(range[2]) : 0 }; });
      const rows: Record<string, unknown>[] = [];
      for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
        const row: Record<string, unknown> = { x: (x - (nx - 1) / 2) * sx, y: 0, z: (z - (nz - 1) / 2) * sz, ry: (Number(c.set.turn) || 0) * Math.PI / 180 };
        for (const col of cols) row[col.k] = col.opts ? col.opts[Math.floor(r() * col.opts.length)] : col.lo + (col.hi - col.lo) * r();
        rows.push(row);
      }
      return { rows, count: rows.length };
    },
    tests: [{ set: { columns: 'k: a' }, inputs: { nx: 2, nz: 1, sx: 10 }, outputs: { rows: [{ x: -5, z: 0, k: 'a' }, { x: 5, z: 0, k: 'a' }], count: 2 } }] }),
  def({ id: 'rows.set', name: 'Set a column', kind: 'logic', ability: 'transform', domains: ['everyday', 'software'], says: 'Every row given the same value in a column: each room of a house painted its wall colour, each house of a street its roof',
    settings: [{ key: 'column', label: 'Column', type: 'text', default: 'paint' }, { key: 'turns', label: 'A value split by | is given round the rows in turn (each car its own paint)', type: 'boolean', default: false }],
    ports: { inputs: [P('rows', 'table'), P('value', 'any')], outputs: [P('rows', 'table')] },
    run: (i, c) => { const vs = c.set.turns && typeof i.value === 'string' ? i.value.split('|').map((x) => x.trim()) : Array.isArray(i.value) && c.set.turns ? i.value : [i.value]; return { rows: (Array.isArray(i.rows) ? i.rows : []).map((r, k) => ({ ...(r as object), [String(c.set.column)]: vs[k % Math.max(1, vs.length)] })) }; },
    tests: [{ set: { column: 'k' }, inputs: { rows: [{ a: 1 }], value: 2 }, outputs: { rows: [{ a: 1, k: 2 }] } }, { set: { column: 'k', turns: true }, inputs: { rows: [{}, {}, {}], value: 'a|b' }, outputs: { rows: [{ k: 'a' }, { k: 'b' }, { k: 'a' }] } }] }),
  def({ id: 'rows.shift', name: 'Move rows', kind: 'logic', ability: 'transform', domains: ['everyday', 'software'], says: 'Every row moved by dx, dz (and turned by dry): the car in front of each house, the lamp beside each door',
    ports: { inputs: [P('rows', 'table'), L('dx', 0), L('dz', 0), N('dry', 'rad', { default: 0, optional: true })], outputs: [P('rows', 'table')] },
    run: (i) => ({ rows: (Array.isArray(i.rows) ? i.rows : []).map((r) => { const o = r as Record<string, number>; return { ...o, x: (o.x ?? 0) + Number(i.dx ?? 0), z: (o.z ?? 0) + Number(i.dz ?? 0), ry: (o.ry ?? 0) + Number(i.dry ?? 0) }; }) }),
    tests: [{ inputs: { rows: [{ x: 1, z: 1 }], dx: 1, dz: 2 }, outputs: { rows: [{ x: 2, z: 3, ry: 0 }] } }] }),
  def({ id: 'rows.touch', name: 'What each touches', kind: 'logic', ability: 'measure', domains: ['structural', 'everyday', 'software'], says: 'For boxes laid on the ground (rows with x, z, w, d: a house\'s rooms, a street\'s lots), what each side touches: the type of the box along most of it, or "outside". A side two boxes share is said once plainly and once as "(shared)", so only one of them need build it',
    settings: [{ key: 'by', label: 'Named by the column', type: 'text', default: 'type' }, { key: 'gap', label: 'Touching within (m)', type: 'number', default: 0.05 }],
    ports: { inputs: [P('rows', 'table')], outputs: [P('rows', 'table'), P('inside', 'integer', { label: 'sides shared' }), P('outside', 'integer', { label: 'sides outside' })] },
    run: (i, c) => {
      const rows = (Array.isArray(i.rows) ? i.rows : []) as Record<string, unknown>[], by = String(c.set.by || 'type'), gap = Number(c.set.gap ?? 0.05);
      const box = rows.map((r) => { const x = Number(r.x ?? 0), z = Number(r.z ?? 0), w = Number(r.w ?? 0), d = Number(r.d ?? 0); return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }; });
      const along = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
      let inside = 0, outside = 0;
      const out = rows.map((r, k) => {
        const a = box[k]!, sides: Record<string, string> = {};
        for (const side of ['front', 'back', 'left', 'right'] as const) {
          const zSide = side === 'front' || side === 'back', at = side === 'front' ? a.z1 : side === 'back' ? a.z0 : side === 'left' ? a.x0 : a.x1, len = zSide ? a.x1 - a.x0 : a.z1 - a.z0;
          let best = -1, most = 0, covered = 0;
          box.forEach((b, j) => {
            if (j === k) return;
            const other = side === 'front' ? b.z0 : side === 'back' ? b.z1 : side === 'left' ? b.x1 : b.x0; if (Math.abs(other - at) > gap) return;
            const o = zSide ? along(a.x0, a.x1, b.x0, b.x1) : along(a.z0, a.z1, b.z0, b.z1); covered += o; if (o > most) { most = o; best = j; }
          });
          if (best < 0 || covered < len / 2) { sides[side] = 'outside'; outside++; }
          else { const t = String(rows[best]![by] ?? 'box'); sides[side] = best < k ? `${t} (shared)` : t; inside++; }
        }
        return { ...r, ...sides };
      });
      return { rows: out, inside, outside };
    },
    tests: [{ inputs: { rows: [{ type: 'a', x: 0, z: 0, w: 2, d: 2 }, { type: 'b', x: 2, z: 0, w: 2, d: 2 }] }, outputs: { rows: [{ type: 'a', right: 'b', left: 'outside', front: 'outside' }, { type: 'b', left: 'a (shared)', right: 'outside' }], inside: 2, outside: 6 } }] }),
  def({ id: 'rows.recode', name: 'Rules over rows', kind: 'logic', ability: 'decide', domains: ['everyday', 'software', 'structural'], says: 'Each value in some columns changed by the first rule that finds it: "what it is / what is there: what it becomes", * for anything ("hall/outside: door; */outside: window; *: wall"). How a house decides where its doors and windows go from what each wall touches',
    settings: [{ key: 'columns', label: 'Columns', type: 'text', default: 'front, back, left, right' }, { key: 'by', label: 'What it is, from the column', type: 'text', default: 'type' }, { key: 'rules', label: 'Rules (first that finds it wins)', type: 'code', default: '*/outside: window\n*/hall*: door\n*/* (shared): none\n*: wall' }],
    ports: { inputs: [P('rows', 'table')], outputs: [P('rows', 'table'), P('changed', 'integer')] },
    run: (i, c) => {
      const glob = (g: string) => new RegExp(`^${g.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');
      const rules = String(c.set.rules ?? '').split(/[;\n]/).map((l) => l.trim()).filter(Boolean).map((l) => { const k = l.lastIndexOf(':'); if (k < 0) throw new Error(`"${l}" is not "pattern: value"`); const pat = l.slice(0, k), [what, there] = pat.includes('/') ? pat.split('/') : ['*', pat]; return { what: glob(what!), there: glob(there!), to: l.slice(k + 1).trim() }; });
      const cols = String(c.set.columns ?? '').split(',').map((x) => x.trim()).filter(Boolean), by = String(c.set.by || 'type'); let changed = 0;
      const rows = (Array.isArray(i.rows) ? i.rows : []).map((r0) => { const r = { ...(r0 as Record<string, unknown>) }; for (const col of cols) { if (!(col in r)) continue; const hit = rules.find((u) => u.what.test(String(r[by] ?? '')) && u.there.test(String(r[col]))); if (hit && hit.to !== r[col]) { r[col] = hit.to; changed++; } } return r; });
      return { rows, changed };
    },
    tests: [{ set: { columns: 'front', rules: 'hall/outside: door; */outside: window; *: wall' }, inputs: { rows: [{ type: 'hall', front: 'outside' }, { type: 'bed', front: 'outside' }, { type: 'bed', front: 'bath' }] }, outputs: { rows: [{ front: 'door' }, { front: 'window' }, { front: 'wall' }], changed: 3 } }] }),
  def({ id: 'clear', name: 'Clear away', kind: 'logic', ability: 'transform', domains: ['structural', 'everyday', 'mechanical'], says: 'What a thing places, less whatever comes within a distance of another thing (grass under a road, trees where a house stands) or, with "keep", only those: deleting by where things are',
    settings: [{ key: 'keep', label: 'Keep only those near it (else take them away)', type: 'boolean', default: false }, { key: 'depth', label: 'How many levels down it looks', type: 'number', default: 2 }],
    ports: { inputs: [thing('thing', 'what to clear from'), thing('near', 'what clears it'), L('gap', 0, 'within')], outputs: [thing('cleared', 'what is left'), P('removed', 'integer', { label: 'taken away' })] },
    run: (i, c) => {
      const t = asThing(i.thing), near = asThing(i.near), gap = Number(i.gap ?? 0), a = isAssembly(t) ? t : { name: t.name, items: [place(t)] };
      // what clears it, as the boxes of what it places (a road system: each road and crossing), one level or two down
      const boxes: THREE.Box3[] = [], walk = (x: Part | Assembly, m: THREE.Matrix4, depth: number) => { if (isAssembly(x) && depth > 0 && x.items.length <= 4096) { for (const it of x.items) walk(it.of, m.clone().multiply(matrixOf(it)), depth - 1); return; } const b = boundsOfAll(x); if (!b.isEmpty()) boxes.push(b.clone().applyMatrix4(m).expandByScalar(gap)); };
      walk(near, new THREE.Matrix4(), 2);
      // down through what it places (a terrain's patches of grass, a street's lots), as deep as asked: what is wholly clear
      // stays shared as it is; only what is cut through is made anew
      let removed = 0; const keep = !!c.set.keep;
      const cut = (x: Assembly, m: THREE.Matrix4, depth: number): Assembly => {
        const items: Assembly['items'] = [];
        for (const it of x.items) {
          const mm = m.clone().multiply(matrixOf(it)), b = boundsOfAll(it.of).clone().applyMatrix4(mm), hit = !b.isEmpty() && boxes.some((q) => q.intersectsBox(b));
          if (!hit) { if (keep) removed++; else items.push(it); continue; }
          if (depth > 0 && isAssembly(it.of) && it.of.items.length) { const inner = cut(it.of, mm, depth - 1); if (inner.items.length) items.push({ ...it, of: inner }); continue; }
          if (keep) items.push(it); else removed++;
        }
        return { ...x, items };
      };
      return { cleared: cut(a, new THREE.Matrix4(), Math.max(0, Math.round(Number(c.set.depth ?? 2)))), removed };
    },
    tests: [{ inputs: { thing: { name: 'row', items: [{ of: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, at: [0, 0, 0], rot: [0, 0, 0], s: 1 }, { of: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, at: [5, 0, 0], rot: [0, 0, 0], s: 1 }] }, near: { name: 'road', items: [{ of: { name: 'r', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, at: [5, 0, 0], rot: [0, 0, 0], s: 1 }] } }, outputs: { removed: 1 } }] }),
  def({ id: 'clash', sink: true, name: 'Clashes', kind: 'critic', ability: 'check', domains: ['mechanical', 'structural', 'everyday'], says: 'Which of the things a thing places run into one another (a car parked into a house, a pipe through a beam): their boxes, as far down as asked, overlapping by more than a touch. Says each pair and how deep the worst goes',
    settings: [{ key: 'depth', label: 'How many levels down it looks', type: 'number', default: 1 }, { key: 'touch', label: 'Overlap that is only touching (m)', type: 'number', default: 0.005 }],
    ports: { inputs: [thing(), P('with', 'assembly', { optional: true, label: 'only against this (optional)' })], outputs: [P('clashes', 'integer'), P('pairs', 'list<text>'), L('worst', 0, 'deepest overlap')] },
    run: (i, c) => {
      const t = asThing(i.thing), depth = Math.max(0, Math.round(Number(c.set.depth ?? 1))), tol = Number(c.set.touch ?? 0.005), boxes: { name: string; b: THREE.Box3; side: number }[] = []; let side = 0;
      const walk = (x: Part | Assembly, m: THREE.Matrix4, d: number, name: string) => {
        if (isAssembly(x) && d > 0) { x.items.forEach((it, k) => walk(it.of, m.clone().multiply(matrixOf(it)), d - 1, `${it.of.name} ${k + 1}`)); return; }
        const b = boundsOfAll(x); if (!b.isEmpty()) boxes.push({ name, b: b.clone().applyMatrix4(m), side });
      };
      if (isAssembly(t)) t.items.forEach((it, k) => walk(it.of, matrixOf(it), depth - 1, `${it.of.name} ${k + 1}`)); else walk(t, new THREE.Matrix4(), 0, t.name);
      // against another thing: only pairs one from each
      const other = i.with ? asThing(i.with) : null; if (other) { side = 1; if (isAssembly(other)) other.items.forEach((it, k) => walk(it.of, matrixOf(it), depth - 1, `${it.of.name} ${k + 1}`)); else walk(other, new THREE.Matrix4(), 0, other.name); }
      if (boxes.length > 20000) throw new Error(`${boxes.length} things to check: look fewer levels down`);
      // sweep along x: only boxes whose x spans meet are compared
      boxes.sort((a, b) => a.b.min.x - b.b.min.x);
      const pairs: string[] = []; let n = 0, worst = 0;
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length && boxes[b]!.b.min.x < boxes[a]!.b.max.x - tol; b++) {
        const A = boxes[a]!.b, B = boxes[b]!.b, o = Math.min(A.max.x - B.min.x, B.max.x - A.min.x, A.max.y - B.min.y, B.max.y - A.min.y, A.max.z - B.min.z, B.max.z - A.min.z);
        if (o > tol && (!other || boxes[a]!.side !== boxes[b]!.side)) { n++; worst = Math.max(worst, o); if (pairs.length < 50) pairs.push(`${boxes[a]!.name} into ${boxes[b]!.name} by ${(o * 1000).toFixed(0)} mm`); }
      }
      return { clashes: n, pairs, worst };
    },
    tests: [{ inputs: { thing: { name: 'two', items: [{ of: { name: 'a', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, at: [0, 0, 0], rot: [0, 0, 0], s: 1 }, { of: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, at: [0.9, 0, 0], rot: [0, 0, 0], s: 1 }, { of: { name: 'c', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, at: [5, 0, 0], rot: [0, 0, 0], s: 1 }] } }, outputs: { clashes: 1, worst: 0.1 }, rel: 1e-9 }] }),
  def({ id: 'rows.ground', name: 'Onto the ground', kind: 'logic', ability: 'transform', domains: ['structural', 'everyday', 'energy'], says: 'Each row (a house\'s lot, a tree, a car) set on the ground where it stands: its y the ground\'s height at its x and z, so what is spawned from them stands on the hills, not in them',
    settings: [{ key: 'lift', label: 'And raised by (m)', type: 'number', default: 0 }],
    ports: { inputs: [P('rows', 'table'), P('on', 'part', { label: 'ground' })], outputs: [P('rows', 'table'), L('low', 0, 'lowest it set'), L('high', 0, 'highest it set')] },
    run: (i, c) => {
      const g = (i.on as Part | undefined)?.shape as { ground?: { w: number; d: number; n: number; h: number[] } } | undefined; if (!g?.ground) throw new Error('wire a Terrain\'s ground in');
      const at = (i.on as Part).at ?? [0, 0, 0], lift = Number(c.set.lift ?? 0); let low = Infinity, high = -Infinity;
      const rows = (Array.isArray(i.rows) ? i.rows : []).map((r0) => { const r = r0 as Record<string, number>, y = heightOn(g.ground!, Number(r.x ?? 0) - at[0], Number(r.z ?? 0) - at[2]) + at[1] + lift; low = Math.min(low, y); high = Math.max(high, y); return { ...r, y }; });
      return { rows, low: rows.length ? low : 0, high: rows.length ? high : 0 };
    },
    tests: [{ inputs: { rows: [{ x: 0, z: 0 }], on: { name: 'g', at: [0, 0, 0], shape: { ground: { w: 2, d: 2, n: 1, h: [1, 1, 1, 1], base: 0.1 } } } }, outputs: { rows: [{ y: 1 }], low: 1, high: 1 } }] }),
  def({ id: 'forever', name: 'Forever', kind: 'generator', ability: 'generate', domains: ['structural', 'everyday', 'energy'], says: 'Things repeated without end on a lattice (along x, y, z, or any of them), each cell one of them picked from the seed: the same cell, the same one. Only what is in view is ever drawn, so a world with no edge costs what the view holds. What it weighs and spans is one cell\'s',
    settings: [{ key: 'seed', label: 'Seed', type: 'number', default: 1 }],
    ports: { inputs: [P('things', 'assembly', { many: true, label: 'one or more things, a cell each' }), L('sx', 0, 'step along x (0: none)'), L('sy', 0, 'step up y (0: none)'), L('sz', 0, 'step along z (0: none)')], outputs: [thing('world', 'without end')] },
    run: (i, c) => {
      const vs = (Array.isArray(i.things) ? i.things : [i.things]).filter(Boolean).map(asThing); if (!vs.length) throw new Error('wire in something to repeat');
      const step: [number, number, number] = [Number(i.sx ?? 0), Number(i.sy ?? 0), Number(i.sz ?? 0)]; if (step.some((x) => x < 0) || step.every((x) => x === 0)) throw new Error('give it a step along at least one of x, y, z');
      const seed = Number(c.set.seed ?? 1);
      return { world: { name: `${vs.map((v) => v.name).join(' or ')}, for ever`, items: [place(vs[cellPick(0, 0, 0, seed, vs.length)]!)], tiled: { step, variants: vs, seed } } };
    },
    tests: [{ set: { seed: 1 }, inputs: { things: [{ name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }], sx: 2 }, outputs: { world: { tiled: { step: [2, 0, 0], seed: 1 } } } }] }),
  // ---- physics and motion: what is made, let go; joints; what moves and the room it needs ---------------------------
  def({ id: 'letgo', name: 'Let it go', kind: 'solver', ability: 'simulate', domains: ['mechanical', 'structural', 'everyday'], says: 'Real rigid-body physics (Jolt) over what is made: each thing it places a body of all its pieces, its mass from its materials, falling, landing, sliding, tipping and coming to rest on the floor, on what it is put on (fixed) and on each other, with each material\'s friction and bounce; held by hinges and slides where they are wired in. Worked out once; the clock plays it back',
    settings: [{ key: 'seconds', label: 'For how long at most (s)', type: 'number', default: 8 }],
    ports: { inputs: [thing('things', 'what is let go'), P('on', 'assembly', { optional: true, label: 'what it stands on (fixed)' }), P('joints', 'any', { many: true, optional: true, label: 'hinges and slides' }), P('push', 'any', { optional: true, label: 'a push' }), N('t', 's', { default: 0, optional: true, label: 'time' })], outputs: [thing('moved', 'where it is at the time'), P('ends', 'table', { label: 'where each ended' }), N('rested', 's', { label: 'all at rest by (or how long it ran, still moving)' }), P('moving', 'boolean', { label: 'still moving when it stopped' }), P('joint', 'table', { label: 'each joint over time' })] },
    run: async (i, c) => {
      const J = await jolt(), { bodies, boxes, placed } = bodiesOf(asThing(i.things), i.on ? asThing(i.on) : undefined);
      if (!bodies.length) throw new Error('nothing to let go');
      const joints = structuredClone((Array.isArray(i.joints) ? i.joints : i.joints ? [i.joints] : []).flat()) as SimJoint[], push = i.push as { name: string; force: [number, number, number]; seconds: number } | undefined;
      // a joint on the world is held by a small fixed anchor where it is (the two do not collide: what holds them is the joint)
      for (const j of joints) if (typeof j.b !== 'string' && j.b.fixed < 0) { boxes.push({ at: j.at, w: 0.01, h: 0.01, d: 0.01 }); j.b = { fixed: boxes.length - 1 }; }
      const names = new Set(bodies.map((b) => b.name));
      for (const j of joints) if (!names.has(j.a)) throw new Error(`a ${j.kind} holds "${j.a}", which is not one of ${[...names].join(', ')}`);
      if (push && !names.has(push.name)) throw new Error(`the push is on "${push.name}", which is not one of ${[...names].join(', ')}`);
      const key = JSON.stringify([bodies, boxes, joints, push ?? null, Number(c.set.seconds ?? 8)]);
      let out = SIMS.get(key); if (!out) { out = simulate(J, bodies, boxes, { seconds: Math.min(60, Number(c.set.seconds ?? 8)), floor: 0, joints, ...(push ? { push } : {}) }); SIMS.set(key, out); if (SIMS.size > 24) SIMS.delete(SIMS.keys().next().value!); }
      const t = Math.min(Number(i.t ?? 0), out.seconds);
      return { moved: posedAt(out, bodies, placed, t), ends: out.ends.map((e) => ({ name: e.name, moved: e.moved, dropped: e.dropped, turned: e.turned, speed: e.speed, resting: e.resting })), rested: out.restedAt ?? out.seconds, moving: out.restedAt === null, joint: out.joints.map((j) => ({ name: j.name, kind: j.kind, end: j.end, min: j.min, max: j.max, ...(j.drive ? { rpm: j.drive.rpm, amps: j.drive.current, peakAmps: j.drive.maxCurrent, energy: j.drive.energyIn } : {}) })) };
    } }),
  def({ id: 'hinge', name: 'Hinge', kind: 'logic', ability: 'connect', domains: ['mechanical', 'structural', 'everyday'], says: 'A revolute joint for Let it go: one thing turning on another (or on the world, fixed) about an axis through a point, between limits, with friction. A door on its frame, a lid, a pendulum, a wheel on its axle',
    settings: [{ key: 'a', label: 'What turns (its name)', type: 'text', default: 'door' }, { key: 'b', label: 'On what (its name; blank: the world)', type: 'text', default: '' }, { key: 'axis', label: 'Axis', type: 'choice', default: 'y', choices: ['x', 'y', 'z'] }, { key: 'motor', label: 'Driven by (a motor from its datasheet)', type: 'choice', default: 'none', choices: ['none', ...Object.keys(MOTORS)] }, { key: 'gear', label: 'Through (a gearhead)', type: 'choice', default: 'none', choices: ['none', ...Object.keys(GEARHEADS)] }],
    ports: { inputs: [L('x', 0), L('y', 0), L('z', 0), N('min', 'deg', { optional: true, label: 'turns no less than' }), N('max', 'deg', { optional: true, label: 'turns no more than' }), N('friction', 'N*m', { default: 0, optional: true }), N('volts', 'V', { optional: true, label: 'volts across its motor (its own, if not set)' }), N('reverse', undefined, { default: 0, optional: true, label: 'turn it the other way (1)' })], outputs: [P('joint', 'any')] },
    run: (i, c) => {
      const ax = String(c.set.axis ?? 'y'), lim = i.min !== undefined && i.max !== undefined ? { limits: [Number(i.min), Number(i.max)].map((d) => (d * Math.PI) / 180) as [number, number] } : {};
      // a motor turns it at the torque its constants give at the speed it turns (sim.ts): K_t (V − K_t ω) / R − T_f
      const md = c.set.motor && c.set.motor !== 'none' ? MOTORS[String(c.set.motor)] : undefined, gh = c.set.gear && c.set.gear !== 'none' ? GEARHEADS[String(c.set.gear)] : undefined;
      let drive = {}; if (md) { const m = motorModel(md), V = (i.volts !== undefined ? Number(i.volts) : md.V) * (Number(i.reverse ?? 0) ? -1 : 1); drive = { drive: { name: md.label, V, Kt: m.Kt, R: windingR(m, AMBIENT), Tf: m.Tf, ...(gh ? { gear: { ratio: gh.ratio, efficiency: gh.efficiency } } : {}) } }; }
      return { joint: { kind: 'hinge', name: `hinge of ${String(c.set.a)}`, a: String(c.set.a), b: String(c.set.b || '') ? String(c.set.b) : { fixed: -1 }, at: [Number(i.x ?? 0), Number(i.y ?? 0), Number(i.z ?? 0)], axis: [ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0], friction: Number(i.friction ?? 0), ...lim, ...drive } };
    },
    tests: [{ set: { a: 'lid', axis: 'x' }, inputs: { y: 1 }, outputs: { joint: { kind: 'hinge', a: 'lid', at: [0, 1, 0], axis: [1, 0, 0] } } }] }),
  def({ id: 'push', name: 'Push', kind: 'logic', ability: 'act', domains: ['mechanical', 'everyday'], says: 'A force on one thing Let it go lets go, for so long from the start: a shove, a kick, a gust',
    settings: [{ key: 'name', label: 'On what (its name)', type: 'text', default: 'ball' }],
    ports: { inputs: [N('fx', 'N', { default: 0, optional: true }), N('fy', 'N', { default: 0, optional: true }), N('fz', 'N', { default: 0, optional: true }), N('seconds', 's', { default: 0.1, optional: true, label: 'for' })], outputs: [P('push', 'any')] },
    run: (i, c) => ({ push: { name: String(c.set.name), force: [Number(i.fx ?? 0), Number(i.fy ?? 0), Number(i.fz ?? 0)], seconds: Number(i.seconds ?? 0.1) } }),
    tests: [{ set: { name: 'b' }, inputs: { fx: 10 }, outputs: { push: { name: 'b', force: [10, 0, 0], seconds: 0.1 } } }] }),
  def({ id: 'turn', name: 'Turn', kind: 'logic', ability: 'transform', domains: ['mechanical', 'structural', 'everyday'], says: 'A thing turned about an axis through a point to the angles given at their times ("0 s 0°, 2 s 90°, 6 s 90°, 8 s 0°"), driven as a servo drives a joint: it speeds up and slows down at its acceleration, no faster than its speed, and stops on each angle (a door opening and closing, a lid, an arm). Kinematic: what it hits does not stop it (Sweep and Clashes say what it hits)',
    settings: [{ key: 'axis', label: 'Axis', type: 'choice', default: 'y', choices: ['x', 'y', 'z'] }, { key: 'keys', label: 'Angles at times', type: 'text', default: '0 s 0°, 2 s 90°, 6 s 90°, 8 s 0°' }],
    ports: { inputs: [thing(), L('x', 0, 'pivot x'), L('y', 0, 'pivot y'), L('z', 0, 'pivot z'), N('speed', 'deg/s', { default: 90, optional: true, label: 'turns no faster than' }), N('accel', 'deg/s^2', { default: 180, optional: true, label: 'speeds up at most' }), N('t', 's', { default: 0, optional: true, label: 'time' })], outputs: [thing('turned', 'turned'), N('angle', 'deg')] },
    run: (i, c) => {
      const keys = keysOf(String(c.set.keys)), a = angleAt(keys, Number(i.t ?? 0), Number(i.speed ?? 90), Number(i.accel ?? 180));
      return { turned: turnedAbout(asThing(i.thing), String(c.set.axis ?? 'y'), [Number(i.x ?? 0), Number(i.y ?? 0), Number(i.z ?? 0)], (a * Math.PI) / 180), angle: a };
    },
    tests: [{ set: { keys: '0 s 0°, 1 s 90°' }, inputs: { thing: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, speed: 1000, accel: 1e6, t: 30 }, outputs: { angle: 90 }, rel: 1e-6 }] }),
  def({ id: 'sweep', name: 'Sweep', kind: 'critic', ability: 'check', domains: ['mechanical', 'structural', 'everyday'], says: 'The room a thing needs as it turns from one angle to another about a pivot: it, at so many angles between, as one thing (its envelope), for Clashes to check against what is round it (a door\'s swing against the bed, an arm\'s reach against the wall)',
    settings: [{ key: 'axis', label: 'Axis', type: 'choice', default: 'y', choices: ['x', 'y', 'z'] }],
    ports: { inputs: [thing(), L('x', 0, 'pivot x'), L('y', 0, 'pivot y'), L('z', 0, 'pivot z'), N('from', 'deg', { default: 0, optional: true }), N('to', 'deg', { default: 90, optional: true }), N('n', undefined, { default: 12, optional: true, label: 'how many between' })], outputs: [thing('swept', 'the room it needs')] },
    run: (i, c) => {
      const t = asThing(i.thing), n = Math.max(2, Math.min(90, Math.round(Number(i.n ?? 12)))), f = Number(i.from ?? 0), to = Number(i.to ?? 90), piv: [number, number, number] = [Number(i.x ?? 0), Number(i.y ?? 0), Number(i.z ?? 0)];
      return { swept: { name: `${t.name}, swept`, items: Array.from({ length: n }, (_, k) => turnedAbout(t, String(c.set.axis ?? 'y'), piv, ((f + ((to - f) * k) / (n - 1)) * Math.PI) / 180).items[0]!) } };
    },
    tests: [{ inputs: { thing: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, n: 3 }, outputs: { swept: { name: 'b, swept' } } }] }),
  // ---- time and motion: what changes as the clock runs --------------------------------------------------------------
  def({ id: 'time', name: 'Clock', kind: 'input', ability: 'measure', domains: ['everyday', 'vehicles', 'mechanical'], says: 'The time the board is at, in seconds: the time bar\'s. Everything wired from it runs again as time goes on, and nothing else does',
    ports: { inputs: [], outputs: [N('t', 's', { label: 'time' })] }, clock: true,
    run: (_i, c) => ({ t: Number(c.time ?? 0) }),
    tests: [{ inputs: {}, outputs: { t: 0 } }] }),
  def({ id: 'cycle', name: 'Signal cycle', kind: 'logic', ability: 'decide', domains: ['vehicles', 'everyday', 'software'], says: 'Which phase a fixed-time cycle is in at a time ("green 30, yellow 4, red 34", seconds): a traffic signal\'s, a washing machine\'s. Gives the way along x\'s phase and the cross street\'s, which is green while the first is red, then yellow for as long',
    settings: [{ key: 'phases', label: 'Phases, seconds', type: 'text', default: 'green 30, yellow 4, red 34' }],
    ports: { inputs: [N('t', 's', { label: 'time' }), N('offset', 's', { default: 0, optional: true })], outputs: [P('state', 'text', { label: 'this way' }), P('cross', 'text', { label: 'the cross street' }), N('left', 's', { label: 'left of this phase' }), N('period', 's')] },
    run: (i, c) => {
      const ph = phasesOf(String(c.set.phases)), T = ph.reduce((a, p) => a + p.s, 0), at = phaseAt(ph, Number(i.t ?? 0) + Number(i.offset ?? 0));
      return { state: at.name, cross: crossOf(ph, Number(i.t ?? 0) + Number(i.offset ?? 0)), left: at.left, period: T };
    },
    tests: [{ inputs: { t: 31 }, outputs: { state: 'yellow', cross: 'red', left: 3, period: 68 } }, { inputs: { t: 40 }, outputs: { state: 'red', cross: 'green' } }, { inputs: { t: 66 }, outputs: { state: 'red', cross: 'yellow' } }] }),
  def({ id: 'path.loop', name: 'Loop round a block', kind: 'generator', ability: 'generate', domains: ['vehicles', 'structural'], says: 'A path round a rectangle, in its lane (inset from the road\'s middle), driven with the block on the right as traffic keeps right; and where it must stop: before each crossing it meets, every so many metres',
    settings: [{ key: 'every', label: 'A crossing every (m)', type: 'number', default: 60 }, { key: 'before', label: 'Stop this far before a crossing\'s middle (m)', type: 'number', default: 5 }],
    ports: { inputs: [L('w', 120, 'width'), L('d', 120, 'depth'), L('inset', 1.8, 'lane in from the road\'s middle')], outputs: [P('path', 'table'), P('stops', 'table'), L('length', 0)] },
    run: (i, c) => {
      const W = Number(i.w ?? 120), D = Number(i.d ?? 120), k = Number(i.inset ?? 1.8), every = Number(c.set.every ?? 60), before = Number(c.set.before ?? 5);
      const x0 = -W / 2 + k, x1 = W / 2 - k, z0 = -D / 2 + k, z1 = D / 2 - k;
      const path = [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }, { x: x0, z: z0 }];
      const sides: [number, 'x' | 'z', number][] = [[W, 'x', 0], [D, 'z', W - 2 * k], [W, 'x', W - 2 * k + D - 2 * k], [D, 'z', 2 * (W - 2 * k) + D - 2 * k]], stops: { at: number; axis: string }[] = [];
      for (const [len, axis, start] of sides) for (let n = 1; n * every <= len + 1e-6; n++) { const at = start + n * every - k - before; if (at > start) stops.push({ at, axis }); }
      return { path, stops, length: 2 * (W - 2 * k) + 2 * (D - 2 * k) };
    },
    tests: [{ inputs: { w: 60, d: 60, inset: 0 }, outputs: { length: 240, stops: [{ at: 55, axis: 'x' }, { at: 115, axis: 'z' }, { at: 175, axis: 'x' }, { at: 235, axis: 'z' }] } }] }),
  def({ id: 'follow', name: 'Follow a path', kind: 'solver', ability: 'simulate', domains: ['vehicles', 'mechanical', 'everyday'], says: 'Things moving along a path at the clock\'s time: each speeds up and slows as a car does, keeps a gap to the one ahead, and stops at a stop line while its way is red (or yellow, if it can stop). Worked out step by step from time 0 (a tenth of a second at a time), so the same time is always the same street. Gives where each is and which way it faces, for a spawner',
    settings: [{ key: 'loop', label: 'Round and round (the path is a loop)', type: 'boolean', default: true }, { key: 'phases', label: 'Its signals\' phases, seconds', type: 'text', default: 'green 30, yellow 4, red 34' }, { key: 'repeat', label: 'Find the round it repeats in (a year on as fast as a minute)', type: 'boolean', default: true }],
    ports: { inputs: [P('path', 'table'), N('n', undefined, { default: 4, optional: true, label: 'how many' }), N('speed', 'm/s', { default: 11, optional: true }), L('gap', 8, 'gap kept, front to front'), N('t', 's', { label: 'time' }), P('stops', 'table', { optional: true }), N('accel', 'm/s^2', { default: 2, optional: true, label: 'speeds up at most (2 m/s², typical of a car in town: an estimate)' }), N('brake', 'm/s^2', { default: 3.4, optional: true, label: 'slows at most (3.4 m/s², the deceleration ITE times yellows by)' })], outputs: [P('rows', 'table'), P('waiting', 'integer', { label: 'stopped' }), N('travelled', 'm', { label: 'the first has gone' }), N('speed', 'm/s', { label: 'mean speed' })] },
    run: (i, c) => {
      const pts = (Array.isArray(i.path) ? i.path : []).map((r) => r as { x: number; z: number }); if (pts.length < 2) throw new Error('a path needs two points or more');
      const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1]! + Math.hypot(pts[k]!.x - pts[k - 1]!.x, pts[k]!.z - pts[k - 1]!.z));
      const L = cum[cum.length - 1]!, loop = c.set.loop !== false, n = Math.max(0, Math.min(500, Math.round(Number(i.n ?? 4)))), v = Number(i.speed ?? 11), gap = Number(i.gap ?? 8), T = Math.max(0, Number(i.t ?? 0)), dt = 0.1;
      const ph = phasesOf(String(c.set.phases)), stops = (Array.isArray(i.stops) ? i.stops : []).map((r) => r as { at: number; axis?: string }).sort((a, b) => a.at - b.at);
      const go = (axis: string | undefined, t: number) => (axis === 'z' ? crossOf(ph, t) : phaseAt(ph, t).name) === 'green';
      const s = Array.from({ length: n }, (_, k) => (loop ? ((n - k) * L) / Math.max(1, n) : -k * gap) % (L || 1)), moved = new Array<number>(n).fill(0);
      const start = [...s];
      const ahead = (from: number, to: number) => (loop ? (((to - from) % L) + L) % L : to - from);
      // each speeds up at `accel` and slows at `brake` at most, to what lets it stop short of what is ahead (the car in front,
      // less its gap; a stop line it may not cross); at a yellow it goes on if it is too close to stop at `brake` (as drivers
      // do: the yellow is timed so they can)
      const acc = Number(i.accel ?? 2), brk = Number(i.brake ?? 3.4);
      let vel = new Array<number>(n).fill(v);
      const advance = (t: number, h: number) => {
        for (let k = 0; k < n; k++) {
          let free = Infinity;
          if (n > 1 && (loop || k > 0)) { const lead = s[(k - 1 + n) % n]!; free = Math.max(0, ahead(s[k]!, lead) - gap); }
          for (const st of stops) {
            const d = ahead(s[k]!, st.at); if (d < 0 || d > 200 || go(st.axis, t)) continue;
            const yellow = (st.axis === 'z' ? crossOf(ph, t) : phaseAt(ph, t).name) === 'yellow';
            if (yellow && vel[k]! * vel[k]! / (2 * brk) > d - 0.5) continue;
            free = Math.min(free, Math.max(0, d - 0.5));
          }
          const want = Math.min(v, vel[k]! + acc * h, Math.sqrt(2 * brk * free)), step = Math.min(free, Math.max(0, want) * h);
          vel[k] = step / h; moved[k] = step; s[k] = loop ? (s[k]! + step) % L : Math.min(L, s[k]! + step);
        }
      };
      // time without end: the street is kept every 30 s of its own time (every 5 min after its first 16 h), so a time an
      // hour or a year on starts from the last kept before it, not from 0; and stepping whole tenths from a kept state
      // gives what stepping from 0 gives, so the same time is still always the same street
      const key = JSON.stringify([pts, n, v, gap, loop, String(c.set.phases), stops, acc, brk, c.set.repeat !== false]);
      let book = FOLLOW_MARKS.get(key); if (book) { FOLLOW_MARKS.delete(key); FOLLOW_MARKS.set(key, book); } else { book = Object.assign(new Map(), { sigs: new Map<string, number>() }) as Marks; FOLLOW_MARKS.set(key, book); if (FOLLOW_MARKS.size > 64) FOLLOW_MARKS.delete(FOLLOW_MARKS.keys().next().value!); }
      // and a street under a fixed cycle settles into a round that repeats: kept once a cycle (at the same point of it), a
      // state met before (to a micrometre and a micrometre a second) means it repeats from there, and any time after folds
      // back into that round, so a year on costs what the first few minutes did. Found, never assumed: until a state comes
      // round again, it steps on
      const cycleSteps = stops.length && loop && c.set.repeat !== false ? Math.round(ph.reduce((a, p) => a + p.s, 0) / dt) : 0, every = cycleSteps || 300;
      const sigOf = () => `${s.map((x) => Math.round(x * 1e6)).join(',')}|${vel.map((x) => Math.round(x * 1e6)).join(',')}`;
      let full = Math.floor(T / dt + 1e-9);
      const fold = () => { const cy = book!.cycle; if (cy && full > cy.from) full = cy.from + ((full - cy.from) % cy.len); };
      fold();
      for (;;) {
        let from = 0; for (const k of book.keys()) if (k <= full && k > from) from = k;
        if (from) { const m0 = book.get(from)!; s.splice(0, n, ...m0.s); vel = [...m0.vel]; moved.splice(0, n, ...m0.moved); }
        else { s.splice(0, n, ...start); vel = new Array<number>(n).fill(v); moved.fill(0); }
        let found = false;
        for (let k = from; k < full; k++) {
          advance(k * dt, dt);
          if ((k + 1) % every === 0 && !book.has(k + 1) && book.size < 20_000) {
            book.set(k + 1, { s: [...s], vel: [...vel], moved: [...moved] });
            if (cycleSteps && !book.cycle) { const sg = sigOf(), was = book.sigs.get(sg); if (was !== undefined) { book.cycle = { from: was, len: k + 1 - was }; found = true; break; } book.sigs.set(sg, k + 1); }
          }
        }
        if (!found) break;
        fold();
      }
      if (T - Math.floor(T / dt + 1e-9) * dt > 1e-9) advance(full * dt, T - Math.floor(T / dt + 1e-9) * dt);
      const at = (d: number) => { let k = 1; while (k < cum.length - 1 && cum[k]! < d) k++; const a = pts[k - 1]!, b = pts[k]!, f = (d - cum[k - 1]!) / Math.max(1e-9, cum[k]! - cum[k - 1]!); return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, ry: Math.atan2(-(b.z - a.z), b.x - a.x) }; };
      const rows = s.map((d) => ({ ...at(Math.max(0, d)), y: 0 })), waiting = T > 0 ? moved.filter((m) => m < 1e-6).length : 0;
      return { rows, waiting, travelled: n ? s[0]! : 0, speed: n ? vel.reduce((a, b) => a + b, 0) / n : 0 };
    },
    tests: [{ set: { loop: false }, inputs: { path: [{ x: 0, z: 0 }, { x: 100, z: 0 }], n: 1, speed: 10, t: 2 }, outputs: { rows: [{ x: 20, z: 0, ry: 0 }], waiting: 0 }, rel: 1e-6 },
      { set: { loop: false, phases: 'red 30, green 30' }, inputs: { path: [{ x: 0, z: 0 }, { x: 100, z: 0 }], n: 1, speed: 10, t: 10, stops: [{ at: 50, axis: 'x' }] }, outputs: { rows: [{ x: 49.5 }], waiting: 1 }, rel: 1e-6 }] }),
  def({ id: 'plan.rooms', name: 'Floor plan', kind: 'logic', ability: 'generate', domains: ['structural', 'everyday'], says: 'A house\'s rooms laid out from its plan: rows of rooms split by "/", rooms in a row by ",", each "type W x D" in metres ("bedroom 4x4, bathroom 2.5x3 / kitchen 4x3.5, living 5x3.5"); or a plan by name. Gives a row for each room (type, w, d, x, z) for the spawner, and the whole floor\'s size',
    settings: [{ key: 'custom', label: 'Your own plan (blank: the named one)', type: 'code', default: '' }],
    ports: { inputs: [P('plan', 'text', { label: 'plan', choices: Object.keys(PLANS), default: '2 bed' }), L('hall', 0, 'a hall between its rows, this wide (0: none)')], outputs: [P('rows', 'table'), L('W', 0, 'width'), L('D', 0, 'depth'), P('rooms', 'integer')] },
    run: (i, c) => {
      const text = String(c.set.custom || '').trim() || PLANS[String(i.plan ?? '2 bed')]; if (!text) throw new Error(`no plan "${String(i.plan)}": ${Object.keys(PLANS).join(', ')}`);
      const lines = text.split('/').map((l) => l.split(',').map((r) => r.trim()).filter(Boolean).map((r) => { const m = /^(.+?)\s+([\d.]+)\s*[x×]\s*([\d.]+)$/.exec(r); if (!m) throw new Error(`"${r}" is not "type W x D"`); return { type: m[1]!.trim(), w: Number(m[2]), d: Number(m[3]) }; }));
      const hall = Number(i.hall ?? 0); if (hall > 0) for (let k = lines.length - 1; k > 0; k--) lines.splice(k, 0, [{ type: 'hall', w: 0, d: hall }]);
      const W = Math.max(...lines.map((l) => l.reduce((t, r) => t + r.w, 0))), D = lines.reduce((t, l) => t + Math.max(...l.map((r) => r.d)), 0), rows: Record<string, unknown>[] = [];
      let z = -D / 2;
      for (const l of lines) { const depth = Math.max(...l.map((r) => r.d)), lw = l.reduce((t, r) => t + r.w, 0); let x = -W / 2; for (const r of l) { const w = r.w + (r === l[l.length - 1] ? W - lw : 0); rows.push({ type: r.type, w, d: depth, x: x + w / 2, y: 0, z: z + depth / 2 }); x += w; } z += depth; }
      return { rows, W, D, rooms: rows.filter((r) => r.type !== 'hall').length };
    },
    tests: [{ set: { custom: 'bedroom 4x4, bathroom 2x3 / kitchen 6x3' }, inputs: {}, outputs: { W: 6, D: 7, rooms: 3, rows: [{ type: 'bedroom', w: 4, d: 4, x: -1, z: -1.5 }, { type: 'bathroom', w: 2, d: 4, x: 2 }, { type: 'kitchen', w: 6, d: 3, x: 0, z: 2 }] } }] }),
  // ---- vehicles from what they are: tyres, batteries, axles, the vehicle itself; fitting shared parts in; taking apart ----
  def({ id: 'tyre', name: 'Tyre', kind: 'generator', ability: 'generate', domains: ['vehicles', 'mechanical', 'manufacturing'], says: 'A tyre as it is made, from its size (a code off its sidewall, or its width, aspect and rim): inner liner, body ply, beads and their apexes, steel belts, cap ply, undertread, sidewalls, and its tread of blocks in pitches of three lengths, cut by grooves and sipes, with wear bars. Made once per size and tread, the same one on every wheel that takes it',
    settings: [{ key: 'pattern', label: 'Tread', type: 'choice', default: 'highway', choices: TREADS }],
    ports: { inputs: [P('code', 'text', { optional: true, label: 'size code (205/55R16, 11R22.5, 24x8-12; blank: from the numbers)' }), N('width', 'mm', { default: 205, optional: true, label: 'section width' }), N('aspect', undefined, { default: 55, optional: true, label: 'aspect (sidewall, % of width)' }), N('rim', undefined, { default: 16, optional: true, label: 'rim (in)' }), N('depth', 'mm', { optional: true, label: 'tread depth new (its pattern\'s, typical, if not set)' }), N('wear', undefined, { default: 0, optional: true, label: 'worn (0 new, 1 to its wear bars)' }), N('pitch', 'mm', { optional: true, label: 'tread pitch' }), N('sipes', undefined, { optional: true, label: 'sipes in each block' })],
      outputs: [thing('tyre', 'tyre'), L('D', 0, 'across'), L('W', 0, 'wide'), N('mass', 'kg'), N('void', undefined, { label: 'tread open (share)' }), P('pitches', 'integer'), P('code', 'text')] },
    run: (i, c) => {
      const code = String(i.code ?? '').trim() || `${Math.round(Number(i.width ?? 205))}/${Math.round(Number(i.aspect ?? 55))}R${Number(i.rim ?? 16)}`, t = tyreOf(code);
      if (!t) throw new Error(`"${code}" is not a tyre size code this reads (ISO metric 205/55R16, truck 11R22.5, flotation 24x8-12, bias 6.50-10)`);
      const b = tyreBuilt(t, { pattern: String(c.set.pattern) as Tread, ...(i.depth ? { depth: Number(i.depth) / 1000 } : {}), ...(i.pitch ? { pitch: Number(i.pitch) / 1000 } : {}), ...(i.sipes !== undefined && i.sipes !== null && i.sipes !== '' ? { sipes: Number(i.sipes) } : {}), wear: Number(i.wear ?? 0) });
      return { tyre: b.tyre, D: t.D, W: t.W, mass: b.kg, void: b.void, pitches: b.pitches, code };
    },
    tests: [{ inputs: { code: '205/55R16' }, outputs: { D: 0.6319, W: 0.205, code: '205/55R16' }, rel: 1e-3 }] }),
  def({ id: 'battery.starter', name: 'Starting battery', kind: 'generator', ability: 'generate', domains: ['vehicles', 'electrical'], says: 'A 12 V lead-acid starting battery by its BCI group (its case is the standard): six cells of plates and separators, straps, joints through the partitions, electrolyte, vent caps and SAE posts. One made per group, shared by every machine that takes it',
    settings: [{ key: 'group', label: 'BCI group', type: 'choice', default: '35', choices: Object.keys(BCI_GROUPS) }],
    ports: { inputs: [], outputs: [thing('battery', 'battery'), N('mass', 'kg'), N('cca', 'A', { label: 'cold-cranking amps (typical)' }), N('Ah', 'A*h'), P('fits', 'text')] },
    run: (_i, c) => { const g = BCI_GROUPS[String(c.set.group)]!, b = starterBattery(g.group); return { battery: b, mass: massOfAll(b), cca: g.cca, Ah: g.Ah, fits: g.fits }; },
    tests: [{ set: { group: '31' }, inputs: {}, outputs: { cca: 950 } }] }),
  def({ id: 'battery.cell', name: 'Lithium cell', kind: 'generator', ability: 'generate', domains: ['vehicles', 'electrical', 'energy'], says: 'A cylindrical lithium-ion cell by its format (18650, 21700, 4680): can, sleeve, its jelly roll wound turn by turn (cathode, anode, separator), insulators, cap with its vent disc and gasket',
    settings: [{ key: 'format', label: 'Format', type: 'choice', default: '21700', choices: Object.keys(CELL_FORMATS) }],
    ports: { inputs: [], outputs: [thing('cell', 'cell'), N('mass', 'kg'), N('Wh', 'W*h'), P('source', 'text')] },
    run: (_i, c) => { const f = CELL_FORMATS[String(c.set.format)]!, cell = liCell(f.id); return { cell, mass: massOfAll(cell), Wh: f.V * f.Ah, source: f.source }; },
    tests: [{ set: { format: '18650' }, inputs: {}, outputs: { Wh: 9 } }] }),
  def({ id: 'battery.pack', name: 'Battery pack', kind: 'generator', ability: 'generate', domains: ['vehicles', 'electrical', 'energy'], says: 'Cells in a pack: so many groups in series, each so many cells in parallel standing in staggered rows, a busbar over each group, the groups in modules, the modules in a tray. One cell stored however many are placed (a Model 3 Long Range: 21700s, 96 in series of 46, modules of 23, 25, 25, 23 groups, as teardowns report)',
    settings: [{ key: 'format', label: 'Cell', type: 'choice', default: '21700', choices: Object.keys(CELL_FORMATS) }],
    ports: { inputs: [N('s', undefined, { default: 96, optional: true, label: 'groups in series' }), N('p', undefined, { default: 46, optional: true, label: 'cells in parallel' }), N('rows', undefined, { default: 4, optional: true, label: 'rows in a group' }), P('modules', 'text', { optional: true, label: 'groups in each module ("23, 25, 25, 23"; blank: one module)' })],
      outputs: [thing('pack', 'pack'), N('mass', 'kg'), N('kWh', 'kW*h'), N('V', 'V'), P('cells', 'integer')] },
    run: (i, c) => {
      const f = CELL_FORMATS[String(c.set.format)]!, s = Math.max(1, Math.round(Number(i.s ?? 96))), p = Math.max(1, Math.round(Number(i.p ?? 46))), mods = String(i.modules ?? '').split(/[,\s]+/).filter(Boolean).map(Number);
      const pack = cellPack({ format: f.id, s, p, rows: Number(i.rows ?? 4), ...(mods.length ? { modules: mods } : {}) });
      return { pack, mass: massOfAll(pack), kWh: (s * p * f.V * f.Ah) / 1000, V: s * f.V, cells: s * p };
    },
    tests: [{ set: { format: '21700' }, inputs: { s: 4, p: 2 }, outputs: { cells: 8, V: 14.4 }, rel: 1e-9 }] }),
  def({ id: 'vehicle.axle', name: 'Axle', kind: 'generator', ability: 'generate', domains: ['vehicles', 'mechanical'], says: 'An axle of a vehicle: where it is along it (+ forward of its middle), its track, its tyres by size code, whether it steers, drives, has twin tyres, its brakes and how it hangs from the frame. Wire axles into a Vehicle',
    settings: [{ key: 'steer', label: 'Steers', type: 'boolean', default: false }, { key: 'drive', label: 'Driven', type: 'boolean', default: false }, { key: 'dual', label: 'Twin tyres', type: 'boolean', default: false }, { key: 'susp', label: 'Hung on', type: 'choice', default: 'rigid', choices: ['rigid', 'pivot', 'strut', 'beam', 'wishbone', 'swingarm', 'leaf', 'air', 'fork'] }, { key: 'brake', label: 'Brakes', type: 'choice', default: 'disc', choices: ['disc', 'drum', 'none'] }],
    ports: { inputs: [L('x', 1.3, 'along (from its middle)'), L('track', 1.55, 'track'), P('tyre', 'text', { default: '205/55R16', optional: true, label: 'tyre size code' }), L('brakeD', 0.28, 'brake across')], outputs: [P('axle', 'any'), L('D', 0, 'tyre across')] },
    run: (i, c) => {
      const code = String(i.tyre ?? '205/55R16'), t = tyreOf(code); if (!t) throw new Error(`"${code}" is not a tyre size code this reads`);
      const br = String(c.set.brake);
      const axle: Axle = { x: Number(i.x ?? 1.3), track: Number(i.track ?? 1.55), tyre: code, ...(c.set.steer ? { steer: true } : {}), ...(c.set.drive ? { drive: true } : {}), ...(c.set.dual ? { dual: true } : {}), susp: String(c.set.susp) as Susp, ...(br !== 'none' ? { brake: { kind: br as 'disc', d: Number(i.brakeD ?? 0.28) } } : {}) };
      return { axle, D: t.D };
    },
    tests: [{ set: { steer: true }, inputs: { x: 2, tyre: '315/80R22.5' }, outputs: { axle: { x: 2, tyre: '315/80R22.5', steer: true }, D: 1.0755 }, rel: 1e-3 }] }),
  def({ id: 'vehicle', name: 'Vehicle', kind: 'generator', ability: 'generate', domains: ['vehicles', 'mechanical'], says: 'Any wheeled vehicle from what it is: its kind (its seats, body lines and controls as its kind\'s, scaled to its length), its axles (wired in, or its kind\'s), its size, frame, power and what it carries; built part by part down to its wheel nuts by the one maker every machine here comes from',
    settings: [{ key: 'kind', label: 'Kind', type: 'choice', default: 'truck', choices: KINDS_OF_VEHICLE }, { key: 'body', label: 'Body (a car\'s)', type: 'choice', default: 'sedan', choices: styles }, { key: 'frame', label: 'Frame', type: 'choice', default: 'as its kind', choices: ['as its kind', 'shell', 'tube', 'ladder', 'backbone'] }, { key: 'power', label: 'Power', type: 'choice', default: 'as its kind', choices: ['as its kind', 'inline', 'diesel', 'electric', 'single', 'twin'] }, { key: 'extras', label: 'Carries (comma list; blank: its kind\'s)', type: 'text', default: '' }],
    ports: { inputs: [P('axles', 'any', { many: true, optional: true, label: 'axles (blank: its kind\'s)' }), L('L', 0, 'length (0: its kind\'s)'), L('W', 0, 'width (0: its kind\'s)'), L('H', 0, 'height (0: its kind\'s)'), N('kW', 'kW', { optional: true, label: 'power (its kind\'s, if not set)' }), N('cc', undefined, { optional: true, label: 'displacement, cc' }), P('color', 'text', { optional: true, label: 'colour' })],
      outputs: [P('vehicle', 'part'), N('mass', 'kg', { label: 'mass drawn' }), P('pieces', 'integer'), L('wheelbase', 0, 'wheelbase'), P('machine', 'any'), thing('rolling', 'to let go (its wheels apart)'), P('joints', 'any', { label: 'its wheels\' axles, for Let it go' })] },
    run: (i, c) => {
      const kind = String(c.set.kind), col = i.color ? hex(i.color) : undefined;
      const ref = kind === 'car' ? styledCar(String(c.set.body), { color: col ?? 0xb8bcc2, rim: 16, rims: '5-spoke', power: String(c.set.power) === 'electric' ? 'electric' : String(c.set.power) === 'diesel' ? 'diesel' : 'petrol', tint: 'none' }) : MACHINES.find((m) => m.kind === kind);
      if (!ref) throw new Error(`no vehicle of the kind "${kind}"`);
      const m: Machine = structuredClone(ref), L0 = m.L, Lw = Number(i.L ?? 0) || L0, k = Lw / L0;
      m.id = `${kind} built here`; m.name = kind === 'car' ? `${String(c.set.body)} (built here)` : `${kind} (built here)`; m.source = `built here on its kind's layout (${ref.name}), its figures as wired`;
      m.L = Lw; m.W = Number(i.W ?? 0) || m.W; m.H = Number(i.H ?? 0) || m.H; m.seats = m.seats.map((s) => ({ ...s, x: s.x * k }));
      const ax = (Array.isArray(i.axles) ? i.axles : i.axles ? [i.axles] : []).filter((a): a is Axle => !!a && typeof a === 'object' && 'tyre' in a);
      if (ax.length) { if (ax.length < 2 && kind !== 'motorcycle') throw new Error('a vehicle stands on two axles at least'); m.axles = [...ax].sort((a, b) => b.x - a.x); }
      else if (k !== 1) m.axles = m.axles.map((a) => ({ ...a, x: a.x * k }));
      if (c.set.frame !== 'as its kind') m.frame = String(c.set.frame) as Machine['frame'];
      if (c.set.power !== 'as its kind' && kind !== 'car') m.power = { ...m.power, kind: String(c.set.power) as Machine['power']['kind'], says: `${String(c.set.power)} (as wired)` };
      if (i.kW) m.power = { ...m.power, kW: Number(i.kW), says: `${Number(i.kW)} kW (as wired)` };
      if (i.cc) m.power = { ...m.power, cc: Number(i.cc) };
      const ex = String(c.set.extras ?? '').split(',').map((s) => s.trim()).filter(Boolean); if (ex.length) m.extras = ex as Machine['extras'];
      if (col !== undefined) m.color = col;
      delete m.mass; delete m.massSays;
      const v = makeMachine(m);
      const r = rollingOf(v); return { vehicle: v, mass: massOf(v), pieces: placedCount(v), wheelbase: m.axles[0]!.x - m.axles[m.axles.length - 1]!.x, machine: m, rolling: r.thing, joints: r.joints };
    },
    tests: [{ set: { kind: 'kart' }, inputs: {}, outputs: { wheelbase: 1.04 }, rel: 1e-6 }] }),
  def({ id: 'vehicle.model', name: 'Vehicle (a real model)', kind: 'generator', ability: 'generate', domains: ['vehicles', 'mechanical'], says: 'A real vehicle by its maker\'s published figures (each with its source), built down to its wheel nuts: a Toyota Corolla, a Freightliner Cascadia, a Honda Rancher, a CRF450R, a Toyota forklift, a John Deere X350, a rental kart',
    settings: [{ key: 'model', label: 'Model', type: 'choice', default: 'corolla', choices: MACHINES.map((m) => m.short ?? m.id) }],
    ports: { inputs: [P('color', 'text', { optional: true, label: 'colour (as made, if not set)' })], outputs: [P('vehicle', 'part'), N('mass', 'kg', { label: 'mass drawn' }), N('published', 'kg', { label: 'its published mass' }), P('pieces', 'integer'), P('source', 'text'), P('machine', 'any'), thing('rolling', 'to let go (its wheels apart)'), P('joints', 'any', { label: 'its wheels\' axles, for Let it go' })] },
    run: (i, c) => { const m = MACHINES.find((x) => (x.short ?? x.id) === c.set.model) ?? MACHINES[0]!, mm = i.color ? { ...m, color: hex(i.color) } : m, v = makeMachine(mm), r = rollingOf(v); return { vehicle: v, mass: massOf(v), published: m.mass ?? 0, pieces: placedCount(v), source: m.source, machine: mm, rolling: r.thing, joints: r.joints }; },
    tests: [{ set: { model: 'rental kart' }, inputs: {}, outputs: { published: 150 } }] }),
  def({ id: 'fit', name: 'Fit in', kind: 'logic', ability: 'connect', domains: ['vehicles', 'mechanical', 'manufacturing', 'everyday'], says: 'Every piece of a thing whose name a pattern finds taken out, and the thing wired in put in its place (where it was, turned as it was): a tyre made in depth on every wheel, a real battery pack for the box that stood for one. The same one in every place, stored once',
    settings: [{ key: 'path', label: 'Pieces named (pattern)', type: 'text', default: '^((outer|inner) )?tyre \\d' }],
    ports: { inputs: [thing('thing', 'into'), thing('with', 'put in')], outputs: [thing('fitted', 'fitted'), P('count', 'integer', { label: 'pieces replaced' }), N('mass', 'kg'), P('placed', 'integer', { label: 'pieces placed' })] },
    run: (i, c) => { const r = fitIn(asThing(i.thing), String(c.set.path), asThing(i.with)); if (!r.fitted) throw new Error(`nothing in it is named like "${String(c.set.path)}"`); return { fitted: r.thing, count: r.fitted, mass: massOfAll(r.thing), placed: placedCount(r.thing) }; },
    tests: [{ set: { path: '^wheel' }, inputs: { thing: { name: 'cart', parts: [{ name: 'deck', shape: { box: [1, 0.1, 0.5] } }, { name: 'wheel 1', at: [0.4, 0, 0.3], shape: { box: [0.1, 0.1, 0.1] } }, { name: 'wheel 2', at: [-0.4, 0, 0.3], shape: { box: [0.1, 0.1, 0.1] } }] }, with: { name: 'better wheel', shape: { sphere: 0.05 }, mat: 'rubber' } }, outputs: { count: 2 } }] }),
  def({ id: 'explode', name: 'Take apart', kind: 'logic', ability: 'transform', domains: ['vehicles', 'mechanical', 'manufacturing', 'everyday'], says: 'A thing taken apart to see what is in it: each piece moved out from the middle of what holds it, so many levels down (a car into its wheels and body, each wheel into its tyre, rim, brake and nuts, each tyre into its layers). Nothing is copied',
    ports: { inputs: [thing(), N('amount', undefined, { default: 0.6, optional: true, label: 'how far apart (0 together, 1 twice as far)' }), N('levels', undefined, { default: 3, optional: true, label: 'how many levels down' })], outputs: [thing('apart', 'apart')] },
    run: (i) => ({ apart: exploded(asThing(i.thing), Number(i.amount ?? 0.6), Math.max(0, Math.round(Number(i.levels ?? 3)))) }),
    tests: [{ inputs: { thing: { name: 'pair', items: [{ of: { name: 'a', shape: { box: [1, 1, 1] } }, at: [-1, 0, 0], rot: [0, 0, 0], s: 1 }, { of: { name: 'b', shape: { box: [1, 1, 1] } }, at: [1, 0, 0], rot: [0, 0, 0], s: 1 }] }, amount: 1, levels: 1 }, outputs: { apart: { items: [{ at: [-2, 0, 0] }, { at: [2, 0, 0] }] } } }] }),
  // ---- a computer from the transistor up --------------------------------------------------------------------------------
  def({ id: 'chip.transistor', name: 'Transistor (FinFET)', kind: 'generator', ability: 'generate', domains: ['electrical', 'manufacturing'], says: 'The smallest working part of a computer: a FinFET at a real process\'s published pitches (Intel 22 nm, Intel 14 nm, TSMC N5 as reported): its fins, metal gate on its high-k liner, spacers, raised source and drain, contacts. Nanometres: zoom the space down to see it',
    settings: [{ key: 'proc', label: 'Process', type: 'choice', default: 'intel-14nm', choices: Object.keys(PROCESSES) }, { key: 'type', label: 'Type', type: 'choice', default: 'n', choices: ['n', 'p'] }],
    ports: { inputs: [N('fins', undefined, { default: 2, optional: true })], outputs: [P('transistor', 'part'), L('pitch', 0, 'gate pitch'), L('Lg', 0, 'gate length'), P('source', 'text')] },
    run: (i, c) => { const pr = PROCESSES[String(c.set.proc)]!; return { transistor: transistor(pr.id, String(c.set.type) as 'n', Math.max(1, Math.round(Number(i.fins ?? 2)))), pitch: pr.cpp, Lg: pr.Lg, source: pr.source }; },
    tests: [{ set: { proc: 'intel-14nm' }, inputs: {}, outputs: { pitch: 70e-9 }, rel: 1e-9 }] }),
  def({ id: 'chip.cell', name: 'Logic or memory cell', kind: 'generator', ability: 'generate', domains: ['electrical', 'software'], says: 'Transistors made into a cell: a 6T SRAM bit (two inverters holding it, two pass gates) or a NAND2 gate (two p-type in parallel, two n-type in series), with its first metal wires. Wire your own transistors in, or it makes its own',
    settings: [{ key: 'proc', label: 'Process', type: 'choice', default: 'intel-14nm', choices: Object.keys(PROCESSES) }, { key: 'kind', label: 'Cell', type: 'choice', default: 'SRAM bit (6T)', choices: ['SRAM bit (6T)', 'NAND2 gate'] }],
    ports: { inputs: [P('n', 'part', { optional: true, label: 'n-type transistor' }), P('p', 'part', { optional: true, label: 'p-type transistor' })], outputs: [thing('cell', 'cell'), P('transistors', 'integer'), N('area', 'm^2')] },
    run: (i, c) => { const pr = PROCESSES[String(c.set.proc)]!, o = { ...(isPart(i.n) ? { n: i.n } : {}), ...(isPart(i.p) ? { p: i.p } : {}) }, sram = String(c.set.kind).startsWith('SRAM'); return sram ? { cell: sramCell(pr.id, o), transistors: 6, area: pr.sram } : { cell: nandCell(pr.id, o), transistors: 4, area: 3 * pr.cpp * pr.cellH }; },
    tests: [{ set: { proc: 'intel-14nm', kind: 'SRAM bit (6T)' }, inputs: {}, outputs: { transistors: 6, area: 0.0588e-12 }, rel: 1e-9 }] }),
  def({ id: 'chip.die', name: 'Processor die', kind: 'generator', ability: 'generate', domains: ['electrical', 'manufacturing'], says: 'A processor die: its cores (each its logic and its L2), its L3, its uncore (graphics, memory controller, I/O), each from the cells below it placed by the million and billion, never copied; its transistors counted from what it places and its density set against its process\'s reported one. The logic is rows of one gate: a real floor plan is its maker\'s',
    settings: [{ key: 'proc', label: 'Process', type: 'choice', default: 'intel-14nm', choices: Object.keys(PROCESSES) }],
    ports: { inputs: [N('cores', undefined, { default: 4, optional: true }), N('coreMm2', 'mm^2', { default: 7, optional: true, label: 'each core\'s logic (an estimate)' }), N('l2KB', undefined, { default: 256, optional: true, label: 'L2 each core, KB' }), N('l3MB', undefined, { default: 8, optional: true, label: 'L3, MB' }), N('uncoreMm2', 'mm^2', { default: 50, optional: true, label: 'graphics and I/O' }), P('sram', 'assembly', { optional: true, label: 'SRAM bit (your own)' }), P('nand', 'assembly', { optional: true, label: 'logic gate (your own)' })],
      outputs: [thing('die', 'die'), P('transistors', 'integer'), N('area', 'mm^2'), N('density', undefined, { label: 'millions of transistors per mm²' }), P('says', 'text')] },
    run: (i, c) => {
      const d = die({ proc: String(c.set.proc), cores: Math.max(1, Math.round(Number(i.cores ?? 4))), coreMm2: Number(i.coreMm2 ?? 7), l2KB: Number(i.l2KB ?? 256), l3MB: Number(i.l3MB ?? 8), uncoreMm2: Number(i.uncoreMm2 ?? 50) }, { ...(isAssembly(i.sram) ? { sram: i.sram } : {}), ...(isAssembly(i.nand) ? { nand: i.nand } : {}) });
      const area = (d.w * d.d) / 1e-6; return { die: d.die, transistors: d.transistors, area, density: d.transistors / area / 1e6, says: d.says };
    },
    tests: [{ set: { proc: 'intel-14nm' }, inputs: { cores: 1, coreMm2: 0.01, l2KB: 2, l3MB: 0.001953125, uncoreMm2: 0.01 }, outputs: { transistors: 2 * 16384 * 6 + 2 * 1e6 * 4 }, rel: 1e-9 }] }),
  def({ id: 'chip.package', name: 'Processor package', kind: 'generator', ability: 'generate', domains: ['electrical', 'manufacturing'], says: 'A die flipped face down into its package: solder bumps in underfill, a soldered heat spreader, the gold lands under it as its socket\'s datasheet counts them (LGA1151, LGA1700)',
    settings: [{ key: 'socket', label: 'Socket', type: 'choice', default: 'LGA1151', choices: Object.keys(SOCKETS) }],
    ports: { inputs: [thing('die', 'die')], outputs: [thing('package', 'package'), N('mass', 'kg'), P('source', 'text')] },
    run: (i, c) => { const d = asThing(i.die); if (!isAssembly(d)) throw new Error('wire a die in'); const p = packageOf(d, String(c.set.socket)); return { package: p, mass: massOfAll(p), source: SOCKETS[String(c.set.socket)]!.source }; },
    tests: [{ set: { socket: 'LGA1151' }, inputs: { die: { name: 'die', items: [{ of: { name: 'si', shape: { box: [0.01, 0.0003, 0.01] }, mat: 'silicon' }, at: [0, 0, 0], rot: [0, 0, 0], s: 1 }] } }, outputs: { package: { name: 'processor, LGA1151 package' } } }] }),
  def({ id: 'pc.board', name: 'Motherboard', kind: 'generator', ability: 'generate', domains: ['electrical', 'everyday'], says: 'A motherboard of a form factor (ATX, microATX, Mini-ITX: their standards\' sizes) with the package in its socket: memory modules (JEDEC DDR4), power stages, chipset, a PCIe x16 slot, an M.2 2280 drive, power connectors, its clock battery',
    settings: [{ key: 'form', label: 'Form factor', type: 'choice', default: 'ATX', choices: Object.keys(BOARDS) }],
    ports: { inputs: [thing('package', 'processor package')], outputs: [thing('board', 'board'), N('mass', 'kg')] },
    run: (i, c) => { const p = asThing(i.package); if (!isAssembly(p)) throw new Error('wire a processor package in'); const b = motherboard(String(c.set.form), p); return { board: b, mass: massOfAll(b) }; },
    tests: [{ set: { form: 'mini-ITX' }, inputs: { package: { name: 'pkg', items: [] } }, outputs: { board: { name: 'mini-ITX motherboard' } } }] }),
  def({ id: 'pc.desktop', name: 'Desktop PC', kind: 'generator', ability: 'generate', domains: ['electrical', 'everyday'], says: 'A desktop PC round a motherboard: a mid-tower case (its glass side left off so its inside shows), an ATX power supply, the board on its standoffs, a tower cooler (copper base, heat pipes, fin stack, fan) on the processor',
    ports: { inputs: [thing('board', 'motherboard')], outputs: [thing('pc', 'PC'), N('mass', 'kg'), P('placed', 'integer', { label: 'pieces placed' }), P('distinct', 'integer', { label: 'things stored' })] },
    run: (i) => { const b = asThing(i.board); if (!isAssembly(b)) throw new Error('wire a motherboard in'); const pc = desktop(b); return { pc, mass: massOfAll(pc), placed: placedCount(pc), distinct: distinctCount(pc) }; },
    tests: [{ inputs: { board: { name: 'b', items: [] } }, outputs: { pc: { name: 'desktop PC' } } }] }),
  def({ id: 'audit.explode', name: 'Comes apart to the bottom?', kind: 'critic', ability: 'check', domains: ['vehicles', 'mechanical', 'manufacturing', 'everyday'], sink: true, says: 'How far a build really comes apart: the share of its mass in lumps (a piece drawn as one though what it is named for is an assembly in the inventory: a headlamp, a door, a fuel tank), each said with what it should come apart into; and each tagged assembly held to its recipe. A design that explodes to the bottom scores 100 %',
    ports: { inputs: [thing()], outputs: [N('score', undefined, { label: 'share of its mass that comes apart to single parts' }), P('pieces', 'integer'), P('lumps', 'list<text>'), P('missing', 'list<text>', { label: 'recipes not met' }), P('says', 'text')] },
    run: (i) => {
      const parts: Part[] = [], walk = (t: Part | Assembly) => { if (isPart(t)) parts.push(t); else for (const it of t.items) walk(it.of); }, seen = new Set<object>();
      const visit = (t: Part | Assembly) => { if (seen.has(t)) return; seen.add(t); walk(t); };
      visit(asThing(i.thing));
      const aud = parts.map((p) => explodeAudit(p)), kg = parts.map((p) => massOf(p)), total = kg.reduce((a, b) => a + b, 0) || 1, lumps = aud.reduce((a, x, k) => a + x.lumps * kg[k]!, 0) / total;
      const faked = aud.flatMap((x) => x.faked.map((f) => `${f.name}: a ${f.is}, drawn as one piece (it is ${f.of.join(', ')})`)), missing = aud.flatMap((x) => x.missing);
      return { score: 1 - lumps, pieces: aud.reduce((a, x) => a + x.pieces, 0), lumps: [...new Set(faked)], missing, says: aud.length === 1 ? aud[0]!.says : `${parts.length} parts audited: ${(lumps * 100).toFixed(1)} % of their mass in lumps; ${missing.length} recipes not met` };
    },
    tests: [{ inputs: { thing: { name: 'lamp on a bracket', parts: [{ name: 'bracket', shape: { box: [0.1, 0.01, 0.1] }, mat: 'steel-low' }, { name: 'headlight', shape: { box: [0.1, 0.1, 0.1] }, mat: 'pc' }] } }, outputs: { pieces: 2 } }] }),
  def({ id: 'space.show', name: 'Show in space', kind: 'view', ability: 'show', domains: ['everyday', 'mechanical', 'structural'], says: 'Puts a thing into the 3D space, at its place: everything wired into one of these is what the space draws',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'shown' }],
    ports: { inputs: [thing()], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { thing: { name: 'b' } }, outputs: {} }] }),
];

for (const b of BUILT_IN) LIBRARY.set(b.id, b);
for (const b of BUILT_THINGS) LIBRARY.set(b.id, b);
for (const b of lawBlocks()) LIBRARY.set(b.id, b);
export const block = (id: string): BlockDef | undefined => LIBRARY.get(id);
