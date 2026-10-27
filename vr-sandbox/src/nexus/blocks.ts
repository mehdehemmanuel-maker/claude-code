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
import { CHAINS, FAMILIES } from './families';
import { METRIC } from './threads';
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
import { rulesOf, rulesThrough } from './make/rules';
import { needsOf, type Need } from './placement/model';
import { combineFields, fieldOf, shareWhere, showField, statsOf, type Field, type FieldKind } from './placement/fields';
import { explainPlaced, placeOne, type Placed } from './placement/solve';
import { selectBattery, type Selection } from './placement/size';
import { REPAIRS, autoLoop, type Repair } from './placement/repair';
import { boreThrough, onto } from './mate';
import { engineLoads, springCase, type LoadRow } from './loads';
import { SPRING_WIRES } from '../engineering/springs';
/** A load case's row as a table's: its figure, limit and factor, in the units it is said in. */
const tableRow = (r: LoadRow): Record<string, unknown> => ({ what: r.what, value: +r.value.toPrecision(4), unit: r.unit, limit: +r.limit.toPrecision(4), factor: +r.factor.toFixed(2), ok: r.ok ? 'yes' : 'NO', says: r.says });
import { BCI_GROUPS, CELL_FORMATS } from '../data/batteries';
import { exploded, fitIn } from './assembly';
import { chainPath, chainRun, coated, coil, enclosure, wound, sensor, SENSES, type SensorBody, type SensorElement, fastener, type FastenerSpec, type HeadShape, fillCells, gridPlate, intoCells, stackOf, strapsOver, toothed, turned, woundRoll, wrapped } from './makers';
import { compileNotes, feedLinesOf, fidelityOf, gapOf, mergeReferences, REFERENCE_NOTES, referenceOf, referenceTree, webParts, type Reference, type WebParts } from './research';
import { allVerdicts, approveProposals, candidatesOf, deleteThing, eventsSince, GATES, proposalsAll, researchLoop, runGauntlet, sortUnknowns, tasksNow, unknownQueue, unknownsUnder, webResolver, wordsOf, type EventKind, type GateId, type Lib } from './gauntlet';
import { feed, findItem, INVENTORY, itemOf, treeLines } from './inventory';
import { judge } from './breakdown';
import { FITS, HEAD_PIECES, conRod, crankshaft, cylinderBlock, cylinderHead, engineBuilt, engineDims, headPiece, pistonAssembly, type EngineSpec, type HeadPiece } from './engines';
/** A head's piece's port: its name run together ("intake valve" → intakeValve). */
const pieceKey = (w: string): string => w.replace(/ (\w)/g, (_, c: string) => c.toUpperCase());
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
  /** A setting whose every choice is a different thing made (a real model): the gauntlet makes and checks each, not only
   *  the one it is set to. */
  every?: string;
  /** An old id kept for the boards made with it: the block it was merged into. */
  alias?: string;
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
export function sameBehaviour(a: BlockDef, b: BlockDef): boolean {
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
  def({ id: 'in.number', name: 'Number', kind: 'input', ability: 'measure', domains: ['everyday', 'math'], says: 'A number you set, in any unit: typed "200 mm" is kept as 0.2 m; with ends set, held between them and shown as a slider you drag',
    settings: [{ key: 'value', label: 'Value', type: 'quantity', default: 1 }, { key: 'unit', label: 'Unit (SI)', type: 'text', default: '' }, { key: 'min', label: 'From (blank: no end)', type: 'text', default: '' }, { key: 'max', label: 'To (blank: no end)', type: 'text', default: '' }, { key: 'style', label: 'Shown as', type: 'choice', default: 'box', choices: ['box', 'slider'] }],
    ports: (s) => ({ inputs: [], outputs: [N('value', String(s.unit ?? '') || undefined)] }),
    run: (_, c) => { const v = typeof c.set.value === 'number' ? c.set.value : readQuantity(String(c.set.value), String(c.set.unit ?? '') || undefined); if (typeof v !== 'number') throw new Error(v.error); const end = (k: string) => { const t = String(c.set[k] ?? '').trim(); return t === '' ? undefined : Number(t); }, lo = end('min'), hi = end('max'); return { value: Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, v)) }; },
    tests: [{ set: { value: '200 mm', unit: 'm' }, inputs: {}, outputs: { value: 0.2 } }, { set: { value: 5, unit: '' }, inputs: {}, outputs: { value: 5 } }, { set: { value: 150, min: 0, max: 100, style: 'slider' }, inputs: {}, outputs: { value: 100 } }], sources: [SIBROCHURE] }),
  def({ id: 'in.text', name: 'Text', kind: 'input', ability: 'measure', domains: ['everyday'], says: 'Words you type, carried on a wire to whatever reads text (a label, a search, a note)', settings: [{ key: 'value', label: 'Text', type: 'text', default: '' }],
    ports: { inputs: [], outputs: [P('value', 'text')] }, run: (_, c) => ({ value: String(c.set.value ?? '') }), tests: [{ set: { value: 'hi' }, inputs: {}, outputs: { value: 'hi' } }] }),
  def({ id: 'in.toggle', name: 'Yes / no', kind: 'input', ability: 'measure', domains: ['everyday'], says: 'A switch you flip: yes or no, carried on a wire to whatever decides by it', settings: [{ key: 'value', label: 'On', type: 'boolean', default: false }],
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
    id: `math.${op}`, name: op[0]!.toUpperCase() + op.slice(1), kind: 'calculator', ability: 'calculate', domains: ['math'], says: { add: 'a + b: the sum of two numbers, in a\'s unit (a length and a length make a length)', subtract: 'a − b: what is left of a when b is taken from it, in a\'s unit', multiply: 'a × b: their product, its unit theirs multiplied (a force by a length is a moment)', divide: 'a ÷ b: how many b go into a, its unit theirs divided; refused where b is zero', power: 'a to the power b: a multiplied by itself b times (b may be a fraction: a root)' }[op],
    ports: { inputs: [N('a'), N('b')], outputs: [N('result', undefined, op === 'add' || op === 'subtract' ? { unitFrom: 'a' } : {})] },
    run: (i) => { const a = Number(i.a), b = Number(i.b); if (op === 'divide' && b === 0) throw new Error('divided by zero'); return { result: op === 'add' ? a + b : op === 'subtract' ? a - b : op === 'multiply' ? a * b : op === 'divide' ? a / b : a ** b }; },
    tests: [{ inputs: { a: 6, b: 3 }, outputs: { result: { add: 9, subtract: 3, multiply: 18, divide: 2, power: 216 }[op] } }] })),
  def({ id: 'math.stats', name: 'Statistics', kind: 'calculator', ability: 'calculate', domains: ['math', 'software', 'finance'], says: 'All the numbers in a list, or on every wire into it: their sum and count, the least, the most, the mean, the middle and the spread (sample standard deviation). An empty list sums to 0; it has no least, most or mean',
    ports: { inputs: [P('values', 'list<number>', { many: true })], outputs: [N('sum', undefined, { unitFrom: 'values' }), P('count', 'integer'), ...(['min', 'max', 'mean', 'median', 'sd'] as const).map((k) => N(k, undefined, { unitFrom: 'values' }))] },
    run: (i) => { const v = nums(asList(i.values).flat()).sort((a, b) => a - b), sum = v.reduce((a, b) => a + b, 0); if (!v.length) return { sum: 0, count: 0 }; const m = sum / v.length; const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)) : 0; const h = v.length >> 1; return { sum, count: v.length, min: v[0], max: v[v.length - 1], mean: m, median: v.length % 2 ? v[h] : (v[h - 1]! + v[h]!) / 2, sd }; },
    tests: [{ inputs: { values: [2, 4, 4, 4, 5, 5, 7, 9] }, outputs: { sum: 40, count: 8, min: 2, max: 9, mean: 5, median: 4.5, sd: 2.138089935299395 } }, { inputs: { values: [1, 2, 3.5] }, outputs: { sum: 6.5, count: 3 } }, { inputs: { values: [] }, outputs: { sum: 0, count: 0 } }] }),
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
    run: (i) => { const c = Number(i.cost), s = Number(i.salvage), n = Math.round(Number(i.life)); if (!(n >= 1)) throw new Error(`a life of ${i.life} years: at least one`); const d = (c - s) / n; return { perYear: d, bookValues: Array.from({ length: n + 1 }, (_, k) => c - d * k) }; },
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
        if (!Number.isFinite(x)) throw new Error(`it runs away (unstable) by ${(k * dt).toFixed(2)} s: the loop's gains are too high for its step (a time step of ${dt.toPrecision(2)} s against τ = ${tau})`);
      }
      return { t, y, u, final: x, overshoot: sp ? Math.max(0, (top - sp) / sp) : 0 };
    },
    // proportional alone settles short of its set point, at Kp K / (1 + Kp K) of it
    tests: [{ inputs: { sp: 1, Kp: 4, Ki: 0, Kd: 0, K: 1, tau: 1, T: 30 }, outputs: { final: 0.8 }, rel: 1e-6 }], sources: [ASTROM] }),

  // operations
  def({ id: 'ops.oee', name: 'Overall equipment effectiveness', kind: 'calculator', ability: 'calculate', domains: ['operations', 'manufacturing'], says: 'How much of a machine\'s time makes good parts: availability × performance × quality',
    ports: { inputs: [N('planned', 's', { label: 'planned time' }), N('down', 's', { label: 'time stopped' }), N('ideal', 's', { label: 'ideal time a part' }), N('made', undefined, { label: 'parts made' }), N('good', undefined, { label: 'good parts' })], outputs: [N('oee'), N('availability'), N('performance'), N('quality')] },
    run: (i) => { const run = Number(i.planned) - Number(i.down); if (!(Number(i.planned) > 0 && run > 0)) throw new Error('planned time, less what was down, must be more than nothing'); if (!(Number(i.made) > 0)) throw new Error('nothing made: its quality and performance are not defined'); const a = run / Number(i.planned), p = (Number(i.ideal) * Number(i.made)) / run, q = Number(i.good) / Number(i.made); return { oee: a * p * q, availability: a, performance: p, quality: q }; },
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
    ports: { inputs: [P('part', 'assembly', { label: 'a part or an assembly' })], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { part: { name: 'x' } }, outputs: {} }] }),
  // viewers: what a board shows
  def({ id: 'view.show', name: 'Show', kind: 'view', ability: 'show', domains: ['everyday'], says: 'A value, large, in its unit', settings: [{ key: 'unit', label: 'Show in', type: 'text', default: '' }],
    ports: { inputs: [P('value', 'any')], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { value: 1 }, outputs: {} }] }),
  def({ id: 'view.gauge', name: 'Gauge', kind: 'view', ability: 'show', domains: ['everyday', 'controls'], says: 'A value on a dial between two ends', settings: [{ key: 'min', label: 'From', type: 'number', default: 0 }, { key: 'max', label: 'To', type: 'number', default: 100 }],
    ports: { inputs: [N('value')], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { value: 1 }, outputs: {} }] }),
  def({ id: 'view.chart', name: 'Chart', kind: 'view', ability: 'show', domains: ['everyday', 'software', 'finance'], says: 'A list drawn as a line, against its place or against another list',
    ports: { inputs: [P('y', 'list<number>'), P('x', 'list<number>', { optional: true })], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { y: [1, 2] }, outputs: {} }] }),
  def({ id: 'view.table', name: 'Table view', kind: 'view', ability: 'show', domains: ['software', 'finance'], says: 'Rows shown as a table on the board: each row a line, each field a column, as wide as its widest value', ports: { inputs: [P('rows', 'table')], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { rows: [] }, outputs: {} }] }),
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
    run: (i) => { const v: Record<string, number> = {}; for (const [k, x] of Object.entries(i)) if (x !== undefined && x !== null) v[k] = Number(x); const r = useLaw(law.id, v);
      // (where the law has no real answer for what is put in (a root of a negative, a ratio of nothing), it says so)
      if (Number.isNaN(r.value)) throw new Error(`${law.name} has no real answer for ${Object.entries(v).map(([k, x]) => `${k} = ${x}`).join(', ')}${law.valid ? `: it holds where ${law.valid}` : ''}`);
      return { [law.output.sym]: r.value, caution: r.caution ?? '' }; },
    tests: [{ inputs: law.example.inputs, outputs: { [law.output.sym]: law.example.output }, rel: law.example.rel ?? 1e-6 }],
  }));
}


// ---- things made and placed: shapes, parts by their sizes, places, patterns, variants (src/nexus/assembly.ts) ---------
const ENGINEERING = Object.keys(DENSITY).filter((k) => !/^(bread|cheese|ham|tomato|lettuce|butter|chicken|egg|avocado|bacon|stingray|leaf|foliage|tissue|petrol|diesel|water|soil)$/.test(k)).sort();
const FINISHES = ['', 'paint', 'enamel', 'chrome', 'brushed', 'ground', 'machined', 'cast', 'forged', 'plate', 'satin', 'gloss', 'matte', 'weld', 'thread', 'tread', 'texture', 'grain', 'leather', 'weave', 'stone', 'concrete'];
const look: SettingDef[] = [{ key: 'mat', label: 'Material', type: 'choice', default: 'steel-low', choices: ENGINEERING }, { key: 'color', label: 'Colour', type: 'text', default: '#9aa3ad' }, { key: 'finish', label: 'Finish', type: 'choice', default: '', choices: FINISHES }, { key: 'glow', label: 'Glows (a lamp lit)', type: 'boolean', default: false }, { key: 'fill', label: 'Solid share (1 solid; a car body or a fridge is mostly air)', type: 'number', default: 1 }];
/** A shape's colour and material may be wired in, so a seed's paint reaches the pieces it paints. */
const lookIn = (): PortDef[] => [P('color', 'text', { optional: true, label: 'colour (wired: over the setting)' }), P('mat', 'text', { optional: true, label: 'material (wired)' })];
const lookOf = (i: Record<string, unknown>, set: Record<string, unknown>): Record<string, unknown> => ({ ...set, ...(i.color ? { color: i.color } : {}), ...(i.mat ? { mat: i.mat } : {}) });
const hex = (c: unknown, d = 0x9aa3ad): number => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c ?? '').trim()); return m ? parseInt(m[1]!, 16) : d; };
const L = (name: string, def: number, label?: string, more: Partial<PortDef> = {}) => N(name, 'm', { default: def, optional: true, ...(label ? { label } : {}), ...more });
const thing = (name = 'thing', label = 'thing') => P(name, 'assembly', { label });
const ENGINE_SET = [{ key: 'layout', label: 'Cylinders laid', type: 'choice' as const, default: 'inline', choices: ['inline', 'vee'] }, { key: 'fuel', label: 'Fuel', type: 'choice' as const, default: 'petrol', choices: ['petrol', 'diesel'] }, { key: 'block', label: 'Block cast in', type: 'choice' as const, default: 'al', choices: ['al', 'iron'] }, { key: 'cooling', label: 'Cooled by', type: 'choice' as const, default: 'liquid', choices: ['liquid', 'air'] }, { key: 'cams', label: 'Cams', type: 'choice' as const, default: 'dohc', choices: ['dohc', 'sohc', 'ohv'] }, { key: 'valves', label: 'Valves a cylinder', type: 'choice' as const, default: '4', choices: ['4', '2'] }, { key: 'turbo', label: 'Turbocharged', type: 'choice' as const, default: 'no', choices: ['no', 'yes'] }, { key: 'starter', label: 'Started by', type: 'choice' as const, default: 'electric', choices: ['electric', 'recoil'] }, { key: 'fit', label: 'Its maker\'s choices', type: 'choice' as const, default: 'none', choices: ['none', ...Object.keys(FITS)] }];
/** An engine's bore, stroke and cylinders as wired in, refused in words where no piston engine is (a bore from 20 mm to
 *  1 m: the largest marine two-strokes are 960 mm, Wärtsilä RT-flex96C; a stroke to 2.5 m (theirs, 2.5 m); 1 to 24
 *  cylinders). */
function engineSizes(i: Record<string, unknown>): { cyl: number; bore: number; stroke: number } {
  const cyl = Math.round(Number(i.cylinders ?? 4)), bore = Number(i.bore ?? 0.0805), stroke = Number(i.stroke ?? 0.0976);
  if (!(bore >= 0.02 && bore <= 1)) throw new Error(`a bore of ${bore} m: a piston engine's is from 20 mm to 1 m`);
  if (!(stroke >= 0.02 && stroke <= 2.5)) throw new Error(`a stroke of ${stroke} m: a piston engine's is from 20 mm to 2.5 m`);
  if (!(cyl >= 1 && cyl <= 24)) throw new Error(`${cyl} cylinders: from 1 to 24`);
  return { cyl, bore, stroke };
}
const engineSpecOf = (i: Record<string, unknown>, set: Record<string, unknown>): EngineSpec => ({ ...engineSizes(i), layout: set.layout as 'inline', vee: 90, fuel: set.fuel as 'petrol', block: set.block as 'al', cooling: set.cooling as 'liquid', cams: set.cams as 'dohc', valves: Number(set.valves) as 4, turbo: set.turbo === 'yes', starter: set.starter as 'electric', ...(set.fit && set.fit !== 'none' ? { fit: String(set.fit) } : {}) });
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
/** A thing as one part to look through by its pieces' names: an assembly's things gathered under it (where each sits does not matter to a name). */
const asPart = (t: Part | Assembly): Part => (isPart(t) ? t : { name: t.name, parts: t.items.map((x) => asPart(x.of)) });
const asPartTree = asPart;
// (a map of two or three cells, for the tests of the nodes that read maps)
/** A bay small enough to solve in a test: a floor and a hood, an engine, an exhaust at 600 °C, a battery (a polypropylene
 *  case) 25 mm from the exhaust, and its starter across the bay. */
const BOX = (name: string, box: [number, number, number], at: [number, number, number], more: Partial<Part> = {}): Part => ({ name, item: name, shape: { box }, at, mat: 'steel-low', ...more });
const BAY: Part = { name: 'bay', parts: [BOX('floor', [1, 0.01, 0.6], [0, -0.005, 0]), BOX('hood', [1, 0.005, 0.6], [0, 0.4, 0]), BOX('petrol engine (1987 cc, 126 kW)', [0.3, 0.2, 0.3], [0, 0.1, 0]),
  BOX('exhaust', [0.05, 0.05, 0.5], [-0.2, 0.025, 0], { mat: 'stainless-304', hot: 600 }), { name: 'battery', item: 'battery', at: [-0.31, 0, 0], parts: [BOX('case', [0.12, 0.12, 0.12], [0, 0.06, 0], { mat: 'pp' })] },
  BOX('starter', [0.08, 0.08, 0.08], [0.3, 0.04, 0.2]), { name: '12 V battery, BCI group 35', item: 'battery-sli', at: [0, 0, 0.5] }] };
const TINY = (values: number[]) => ({ kind: 'heat', unit: '°C', says: 'two cells', min: [0, 0, 0], step: 0.01, dims: [values.length, 1, 1], values: new Float32Array(values), solid: new Uint8Array(values.length), sources: [] });
/** The gauntlet's view of the library (src/nexus/gauntlet.ts takes it, so it imports nothing of the library's). */
const GLIB: Lib = { blocks: LIBRARY, test: (b) => testBlock(b), portsOf, defaultsOf, fits, same: sameBehaviour };
/** Candidates as they travel on wires: "block:id" or "item:id" (a bare id, a block's if there is one, else an entry's). */
const candOf = (v: unknown) => asList(v).map(String).filter(Boolean).map((s) => { const m = /^(block|item):(.+)$/.exec(s), kind = (m?.[1] ?? (LIBRARY.has(s) ? 'block' : 'item')) as 'block' | 'item', id = m?.[2] ?? s; return { id, kind, name: kind === 'block' ? LIBRARY.get(id)?.name ?? id : itemOf(id)?.name ?? id }; });

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
  shapeBlock('sphere', 'Sphere', 'A ball of one material: its radius, so its volume and its mass from its material', [L('r', 0.05, 'radius')], (v) => ({ sphere: v.r! }), { inputs: { r: 0.05 }, mass: (4 / 3) * Math.PI * 0.05 ** 3 * 7850 }),
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

  def({ id: 'place', name: 'Place', kind: 'logic', ability: 'transform', domains: ['mechanical', 'structural', 'electrical', 'everyday'], says: 'A thing put at a place (x, y, z), turned about x, y and z, at a scale; or at each point of a table wired in (posts at a chain\'s free ends, bolts at their holes, lamps along a roof), each moved by x, y, z. The thing is shared, not copied',
    ports: { inputs: [thing(), L('x', 0), L('y', 0), L('z', 0), N('rx', 'rad', { default: 0, optional: true, label: 'turn about x' }), N('ry', 'rad', { default: 0, optional: true, label: 'turn about y' }), N('rz', 'rad', { default: 0, optional: true, label: 'turn about z' }), N('s', undefined, { default: 1, optional: true, label: 'scale' }), P('points', 'table', { optional: true, label: 'at each point (x, y, z)' })], outputs: [thing('placed', 'placed')] },
    run: (i) => { const t = asThing(i.thing), at = (k: string) => Number(i[k] ?? 0), rot: [number, number, number] = [at('rx'), at('ry'), at('rz')], s = Number(i.s ?? 1);
      if (Array.isArray(i.points)) { const pts = i.points as { x: number; y: number; z: number }[]; return { placed: { name: `${pts.length} × ${t.name}`, items: pts.map((q) => place(t, [Number(q.x) + at('x'), Number(q.y) + at('y'), Number(q.z) + at('z')], rot, s)) } }; }
      return { placed: { name: t.name, items: [place(t, [at('x'), at('y'), at('z')], rot, s)] } }; },
    tests: [{ inputs: { thing: { name: 'b', shape: { box: [1, 1, 1] }, mat: 'steel-low' }, x: 2 }, outputs: { placed: { items: [{ at: [2, 0, 0], s: 1 }] } } }, { inputs: { thing: { name: 'b' }, points: [{ x: 1, y: 2, z: 3 }] }, outputs: { placed: { items: [{ at: [1, 2, 3] }] } } }] }),
  def({ id: 'array', name: 'Pattern of', kind: 'logic', ability: 'generate', domains: ['mechanical', 'structural', 'vehicles', 'aerospace', 'everyday', 'operations'], says: 'A thing many times in a pattern, one thing stored and every one placed: in a row (each a step on from the last), round a ring (about y, each turned to face out: a drone\'s four motors, a wheel\'s bolts), or on a grid nx by nz and ny high (a swarm, a street of buildings, a city of streets)',
    settings: [{ key: 'pattern', label: 'Pattern', type: 'choice', default: 'grid', choices: ['line', 'ring', 'grid'] }, { key: 'turn', label: 'Ring: turn each to face out', type: 'boolean', default: true }],
    ports: (st) => String(st.pattern) === 'line' ? { inputs: [thing(), N('n', undefined, { default: 4, optional: true, label: 'how many' }), L('dx', 0.1, 'step x'), L('dy', 0, 'step y'), L('dz', 0, 'step z')], outputs: [thing('row', 'row')] }
      : String(st.pattern) === 'ring' ? { inputs: [thing(), N('n', undefined, { default: 4, optional: true, label: 'how many' }), L('r', 0.15, 'radius')], outputs: [thing('ring', 'ring')] }
      : { inputs: [thing(), N('nx', undefined, { default: 3, optional: true }), N('nz', undefined, { default: 3, optional: true }), N('ny', undefined, { default: 1, optional: true, label: 'how many high' }), L('sx', 1, 'spacing x'), L('sy', 1, 'spacing y'), L('sz', 1, 'spacing z'), N('vary', undefined, { default: 0, optional: true, label: 'vary each one\'s height (0.5: ±50 %)' }), N('seed', undefined, { default: 1, optional: true })], outputs: [thing('grid', 'grid')] },
    run: (i, c) => { const t = asThing(i.thing), k = String(c.set.pattern);
      if (k === 'line') return { row: arrayLine(t, Number(i.n ?? 4), [Number(i.dx ?? 0.1), Number(i.dy ?? 0), Number(i.dz ?? 0)]) };
      if (k === 'ring') return { ring: arrayCircle(t, Number(i.n ?? 4), Number(i.r ?? 0.15), c.set.turn !== false) };
      return { grid: arrayGrid(t, Number(i.nx ?? 3), Number(i.nz ?? 3), [Number(i.sx ?? 1), Number(i.sy ?? 1), Number(i.sz ?? 1)], Number(i.ny ?? 1), undefined, Number(i.vary ?? 0), Number(i.seed ?? 1)) }; },
    tests: [{ set: { pattern: 'line' }, inputs: { thing: { name: 'b' }, n: 3, dx: 1 }, outputs: { row: { items: [{ at: [0, 0, 0] }, { at: [1, 0, 0] }, { at: [2, 0, 0] }] } } }, { set: { pattern: 'ring' }, inputs: { thing: { name: 'b' }, n: 2, r: 1 }, outputs: { ring: { items: [{ at: [1, 0, 0] }, { s: 1 }] } } }, { set: { pattern: 'grid' }, inputs: { thing: { name: 'b' }, nx: 2, nz: 1, sx: 2 }, outputs: { grid: { items: [{ at: [-1, 0, 0] }, { at: [1, 0, 0] }] } } }] }),
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
    tests: [{ inputs: { part: { name: 'b', shape: { box: [0.1, 0.1, 0.1] }, mat: 'steel-low' }, r: 0.01, depth: 0.1, y: 0.05 }, outputs: { mass: (0.001 - Math.PI * 0.0001 * 0.1) * 7850 }, rel: 1e-9 }, { inputs: { part: { name: 'b', shape: { box: [0.1, 0.1, 0.1] }, mat: 'steel-low' }, r: 0.01, depth: 0.1 }, outputs: { mass: (0.001 - Math.PI * 0.0001 * 0.05) * 7850 }, rel: 1e-9 }] }),
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
    settings: [{ key: 'model', label: 'Model', type: 'choice', default: 'corolla', choices: MACHINES.map((m) => m.short ?? m.id) }], every: 'model',
    ports: { inputs: [P('color', 'text', { optional: true, label: 'colour (as made, if not set)' })], outputs: [P('vehicle', 'part'), N('mass', 'kg', { label: 'mass drawn' }), N('published', 'kg', { label: 'its published mass' }), P('pieces', 'integer'), P('source', 'text'), P('machine', 'any'), thing('rolling', 'to let go (its wheels apart)'), P('joints', 'any', { label: 'its wheels\' axles, for Let it go' })] },
    run: (i, c) => { const m = MACHINES.find((x) => (x.short ?? x.id) === c.set.model) ?? MACHINES[0]!, mm = i.color ? { ...m, color: hex(i.color) } : m, v = makeMachine(mm), r = rollingOf(v); return { vehicle: v, mass: massOf(v), published: m.mass ?? 0, pieces: placedCount(v), source: m.source, machine: mm, rolling: r.thing, joints: r.joints }; },
    tests: [{ set: { model: 'rental kart' }, inputs: {}, outputs: { published: 150 } }] }),
  def({ id: 'fit', name: 'Fit in', kind: 'logic', ability: 'connect', domains: ['vehicles', 'mechanical', 'manufacturing', 'everyday'], says: 'Every piece of a thing whose name a pattern finds taken out, and the thing wired in put in its place (where it was, turned as it was): a tyre made in depth on every wheel, a real battery pack for the box that stood for one. The same one in every place, stored once',
    settings: [{ key: 'path', label: 'Pieces named (pattern)', type: 'text', default: '^((outer|inner) )?tyre \\d' }],
    ports: { inputs: [thing('thing', 'into'), thing('with', 'put in')], outputs: [thing('fitted', 'fitted'), P('count', 'integer', { label: 'pieces replaced' }), N('mass', 'kg'), P('placed', 'integer', { label: 'pieces placed' })] },
    run: (i, c) => { const r = fitIn(asThing(i.thing), String(c.set.path), asThing(i.with)); if (!r.fitted) throw new Error(`nothing in it is named like "${String(c.set.path)}"`); return { fitted: r.thing, count: r.fitted, mass: massOfAll(r.thing), placed: placedCount(r.thing) }; },
    tests: [{ set: { path: '^wheel' }, inputs: { thing: { name: 'cart', parts: [{ name: 'deck', shape: { box: [1, 0.1, 0.5] } }, { name: 'wheel 1', at: [0.4, 0, 0.3], shape: { box: [0.1, 0.1, 0.1] } }, { name: 'wheel 2', at: [-0.4, 0, 0.3], shape: { box: [0.1, 0.1, 0.1] } }] }, with: { name: 'better wheel', shape: { sphere: 0.05 }, mat: 'rubber' } }, outputs: { count: 2 } }] }),
  def({ id: 'explode', name: 'Take apart', kind: 'logic', ability: 'transform', domains: ['vehicles', 'mechanical', 'manufacturing', 'everyday'], says: 'A thing taken apart to see what is in it, down to its smallest pieces: each piece moved out from the middle of what holds it, and what is inside each piece apart inside it (a truck into its cab, frame and batteries; a battery into its case, cells and posts; a cell into its plates; a plate into its grid and paste). Or only what is named: that piece pulled out and opened, the rest left as it is. Nothing is copied',
    settings: [{ key: 'focus', label: 'Only what is named (pattern; blank: all of it)', type: 'text', default: '' }],
    ports: { inputs: [thing(), N('amount', undefined, { default: 0.6, optional: true, label: 'how far apart (0 together, 1 twice as far)' }), N('levels', undefined, { default: 64, optional: true, label: 'how many levels down (64: to the bottom)' })], outputs: [thing('apart', 'apart')] },
    run: (i, c) => { let re: RegExp | undefined; if (c.set.focus) try { re = new RegExp(String(c.set.focus), 'i'); } catch { throw new Error(`"${String(c.set.focus)}" is not a pattern`); } return { apart: exploded(asThing(i.thing), Number(i.amount ?? 0.6), Math.max(0, Math.round(Number(i.levels ?? 64))), re) }; },
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
  // placement (docs/PLACEMENT.md): what each part needs, and maps of the space it is in
  def({ id: 'need', name: 'What each part needs', kind: 'critic', ability: 'check', domains: ['mechanical', 'vehicles', 'manufacturing', 'electrical', 'structural'], says: 'What every part of a thing needs of where it is, read from what its parts state, never typed: what it is mounted on, what it connects to or passes through, what it keeps out of (heat over its material\'s limit, what moves and the room it needs), which way it faces, and who must reach it and how often. Each need with why, where its figure comes from, and how sure (1: stated on the part; less: inferred from what it is)',
    settings: [{ key: 'kind', label: 'Only needs of kind', type: 'choice', default: 'all', choices: ['all', 'mount', 'connect', 'keepout', 'face', 'access'] }, { key: 'named', label: 'Only parts named like (pattern; blank: all)', type: 'text', default: '' }],
    ports: { inputs: [thing()], outputs: [P('needs', 'table'), N('count'), P('byKind', 'record'), P('says', 'text')] },
    run: (i, c) => { let re: RegExp | null = null; if (c.set.named) try { re = new RegExp(String(c.set.named), 'i'); } catch { throw new Error(`"${c.set.named}" is not a pattern`); }
      const all = needsOf(asPart(asThing(i.thing))), k = String(c.set.kind ?? 'all'), ns = all.filter((n: Need) => (k === 'all' || n.kind === k) && (!re || re.test(n.part)));
      const by = Object.fromEntries(['mount', 'connect', 'keepout', 'face', 'access'].map((x) => [x, ns.filter((n) => n.kind === x).length]));
      return { needs: ns.map((n) => ({ part: n.part, kind: n.kind, to: n.to, ...(n.min !== undefined ? { mm: Math.round(n.min * 1000) } : {}), ...(n.below !== undefined ? { belowC: n.below } : {}), ...(n.perYear !== undefined ? { perYear: n.perYear } : {}), why: n.why, source: n.source, sure: n.confidence })), count: ns.length, byKind: by, says: `${ns.length} needs: ${Object.entries(by).filter(([, v]) => v).map(([x, v]) => `${v} ${x}`).join(', ')}` }; },
    tests: [{ inputs: { thing: { name: 'hot and near', parts: [{ name: 'pipe', shape: { box: [0.1, 0.02, 0.02] }, mat: 'stainless-304', hot: 600 }, { name: 'hose', shape: { box: [0.1, 0.02, 0.02] }, at: [0, 0.05, 0], mat: 'epdm', fixed: 'clipped to the pipe' }, { name: 'belt', shape: { box: [0.1, 0.01, 0.01] }, at: [0, -0.05, 0], mat: 'epdm', clear: 0.004 }] } }, outputs: { count: 4, byKind: { mount: 1, connect: 0, keepout: 3, face: 0, access: 0 } } }] }),
  def({ id: 'field', name: 'Map of the space', kind: 'critic', ability: 'measure', domains: ['mechanical', 'vehicles', 'structural', 'electrical'], says: 'A map of one quantity over the space round part of a thing, cell by cell, where things could go (cells inside a solid piece left out): heat (°C: the rules\' own fall-off from each hot surface, blocked by anything solid between), motion (m of room from what moves: wheels through their steer and bump, belts and fans by their clearance, the engine rocking on its mounts), or reach (m of reach for a person leaning over the open bay, where a hand can come in from above)',
    settings: [{ key: 'kind', label: 'Of', type: 'choice', default: 'heat', choices: ['heat', 'motion', 'reach'] }, { key: 'around', label: 'Round what is named like (pattern)', type: 'text', default: '^(petrol|diesel) engine' }, { key: 'grow', label: 'And this far round it, m', type: 'number', default: 0.15 }, { key: 'step', label: 'Cell, m', type: 'number', default: 0.025 }],
    ports: { inputs: [thing()], outputs: [P('field', 'any'), N('cells', undefined, { label: 'open cells' }), N('lo', undefined, { label: 'least' }), N('hi', undefined, { label: 'most' }), N('bad', undefined, { label: 'share bad (heat over 100 °C, room under none, out of reach)' }), P('says', 'text')] },
    run: (i, c) => { let around: RegExp; try { around = new RegExp(String(c.set.around), 'i'); } catch { throw new Error(`"${c.set.around}" is not a pattern`); }
      const step = Number(c.set.step), grow = Number(c.set.grow); if (!(step >= 0.005 && step <= 0.5)) throw new Error('a cell from 5 mm to 0.5 m'); if (!(grow >= 0 && grow <= 2)) throw new Error('round it by 0 to 2 m');
      const k = String(c.set.kind) as FieldKind, f = fieldOf(asPart(asThing(i.thing)), k, { around, grow, step }), st = statsOf(f), bad = shareWhere(f, (v) => k === 'heat' ? v > 100 : v < 0);
      return { field: f, cells: st.open, lo: st.min, hi: st.max, bad, says: `${f.says}: ${st.open} open cells of ${Math.round(f.step * 1000)} mm, ${f.unit === '°C' ? `${Math.round(st.min)} to ${Math.round(st.max)} °C` : `${(st.min * 1000).toFixed(0)} to ${(st.max * 1000).toFixed(0)} mm`}; ${(bad * 100).toFixed(1)} % bad` }; },
    tests: [{ set: { kind: 'heat', around: 'pipe', grow: 0.05, step: 0.01 }, inputs: { thing: { name: 'a hot pipe', parts: [{ name: 'pipe', shape: { box: [0.1, 0.02, 0.02] }, mat: 'stainless-304', hot: 600 }] } }, outputs: { hi: 560.7 }, rel: 0.05 }, { set: { kind: 'motion', around: 'belt', grow: 0.05, step: 0.01 }, inputs: { thing: { name: 'a belt', parts: [{ name: 'belt', shape: { box: [0.1, 0.01, 0.01] }, mat: 'epdm', clear: 0.004 }] } }, outputs: { lo: 0.001 }, rel: 0.3 }] }),
  def({ id: 'field.combine', name: 'Maps as one cost', kind: 'calculator', ability: 'calculate', domains: ['mechanical', 'vehicles', 'structural'], says: 'Maps of the same space as one cost per cell: each read as how bad it is (heat over a limit, room under a gap, reach short of an arm), weighted and added. 0 is a good place; the more, the worse. The maps must share their region and cell',
    settings: [{ key: 'weights', label: 'Weights, in the order wired (space between)', type: 'text', default: '1 1 1' }, { key: 'heat', label: 'Heat counted bad from, °C', type: 'number', default: 100 }, { key: 'gap', label: 'Room counted short under, m', type: 'number', default: 0.01 }],
    ports: { inputs: [P('fields', 'any', { many: true })], outputs: [P('field', 'any'), N('lo', undefined, { label: 'least cost' }), N('good', undefined, { label: 'share costing nothing' }), P('says', 'text')] },
    run: (i, c) => { const fs = asList(i.fields).flat().filter((x): x is Field => !!x && typeof x === 'object' && 'values' in (x as object)); if (!fs.length) throw new Error('wire maps in'); const w = String(c.set.weights).split(/\s+/).map(Number).filter((x) => Number.isFinite(x));
      const f = combineFields(fs, w, { heat: Number(c.set.heat), gap: Number(c.set.gap) }), st = statsOf(f), good = shareWhere(f, (v) => v <= 1e-9); return { field: f, lo: st.min, good, says: `${fs.map((x) => x.kind).join(' + ')}: ${(good * 100).toFixed(1)} % of the open space costs nothing` }; },
    tests: [{ set: { weights: '1', heat: 100 }, inputs: { fields: [TINY([40, 160])] }, outputs: { good: 0.5, lo: 0 } }] }),
  def({ id: 'field.show', name: 'Show a map', kind: 'view', ability: 'show', domains: ['mechanical', 'vehicles', 'structural', 'everyday'], says: 'A map drawn in 3D as coloured cells, blue (good) to red (bad): only the cells at least so bad, or a slice across it. A picture of the map, not a thing to build; wire it with the thing into Combine to see both',
    settings: [{ key: 'from', label: 'Cells at least this bad (0–1)', type: 'number', default: 0.5 }, { key: 'slice', label: 'Or a slice across', type: 'choice', default: 'none', choices: ['none', 'x', 'y', 'z'] }, { key: 'at', label: 'The slice this share of the way along', type: 'number', default: 0.5 }],
    ports: { inputs: [P('field', 'any')], outputs: [thing('view', 'view'), N('cells', undefined, { label: 'cells drawn' })] },
    run: (i, c) => { const f = i.field as Field; if (!f || !(f.values instanceof Float32Array)) throw new Error('wire a map in'); const sl = String(c.set.slice); const v = showField(f, { from: Number(c.set.from), ...(sl !== 'none' ? { slice: { axis: sl as 'x' | 'y' | 'z', at: Number(c.set.at) } } : {}) }); return { view: v, cells: v.parts?.length ?? 0 }; },
    tests: [{ inputs: { field: TINY([40, 340]) }, outputs: { cells: 1 } }, { set: { slice: 'x', at: 0 }, inputs: { field: TINY([40, 340]) }, outputs: { cells: 1 } }] }),
  def({ id: 'place.solve', name: 'Place a part', kind: 'solver', ability: 'optimise', domains: ['mechanical', 'vehicles', 'electrical', 'structural', 'manufacturing'], says: 'Where a part should go, found, never typed: it is taken out, the space round where it could go is mapped (heat, motion, reach), and every place it fits whole, standing on something (or within a bracket of it) and under the hood or the body, is tried at each quarter turn about the vertical. What it must have is held (no cell hotter than its materials stand, none in what a moving part needs); of the places that hold, the cheapest is chosen: cool, a hand able to reach its top, near what it is wired or piped to, little moved. Out come the thing with the part moved, the reason, the next best places with what each gives up, why where it was did or did not do, and the rule findings before and after',
    settings: [{ key: 'part', label: 'The part named like (pattern)', type: 'text', default: '^battery and its tray$' }, { key: 'near', label: 'Kept near what is named like (pattern; blank: nothing)', type: 'text', default: '^starter motor$' }, { key: 'around', label: 'Mapped round what is named like (pattern)', type: 'text', default: '^(petrol|diesel) engine' }, { key: 'grow', label: 'And this far round it and the part, m', type: 'number', default: 0.25 }, { key: 'step', label: 'Cell, m', type: 'number', default: 0.025 }, { key: 'check', label: 'Rules before and after', type: 'choice', default: 'yes', choices: ['yes', 'no'] }],
    ports: { inputs: [thing()], outputs: [thing('thing', 'thing, the part moved'), P('placed', 'any'), P('reason', 'text'), P('others', 'table', { label: 'next best' }), N('before', undefined, { label: 'findings before' }), N('after', undefined, { label: 'findings after' }), P('says', 'text')] },
    run: (i, c) => { const re = (k: string) => { try { return new RegExp(String(c.set[k]), 'i'); } catch { throw new Error(`"${c.set[k]}" is not a pattern`); } };
      const step = Number(c.set.step), grow = Number(c.set.grow); if (!(step >= 0.01 && step <= 0.2)) throw new Error('a cell from 10 mm to 0.2 m'); if (!(grow >= 0 && grow <= 2)) throw new Error('round it by 0 to 2 m');
      const root = asPart(asThing(i.thing)), part = re('part'), { placed, tree } = placeOne(root, part, { near: String(c.set.near ?? '').trim() ? re('near') : undefined, around: re('around'), grow, step });
      const check = c.set.check !== 'no', before = check ? rulesOf(root, { only: part }).findings.length : undefined, after = check ? rulesOf(tree, { only: part }).findings.length : undefined;
      const others = placed.others.map((o) => ({ at: o.at.map((x) => Math.round(x * 1000)).join(', ') + ' mm', turned: o.yaw ? 'a quarter' : 'no', cost: +o.cost.toFixed(3), heatC: Math.round(o.heat), reach: +o.reach.toFixed(2), nearMm: Math.round(o.near * 1000), movedMm: Math.round(o.moved * 1000) }));
      return { thing: tree, placed, reason: placed.reason, others, before, after, says: explainPlaced(placed, 'one line')[0]! + (check ? `; rule findings ${before} before, ${after} after` : '') }; },
    tests: [{ set: { part: '^battery$', near: '^starter$', around: '^petrol engine', grow: 0.2, step: 0.05 }, inputs: { thing: BAY }, outputs: { before: 1, after: 0 } }] }),
  def({ id: 'size.select', name: 'Pick by duty', kind: 'solver', ability: 'decide', domains: ['electrical', 'vehicles', 'mechanical'], says: 'A catalogue item picked by the duty it must do, the duty read from the thing, never typed: a starting battery by its engine (fuel and displacement as the engine states them: about 1 cold-cranking amp per cubic inch for petrol, 2 for diesel, a rule of thumb). Every item is weighed; the lightest that meets the duty is chosen, beside what the thing has now with its margin. Batteries now; motors, fans, bolts, bearings and pumps to come',
    settings: [{ key: 'of', label: 'Of', type: 'choice', default: 'battery', choices: ['battery'] }, { key: 'count', label: 'Shared among this many (0: as many as it has)', type: 'number', default: 0 }],
    ports: { inputs: [thing()], outputs: [P('chosen', 'text'), N('need', undefined, { label: 'duty (CCA each)' }), P('options', 'table'), P('has', 'text'), P('selection', 'any'), P('says', 'text')] },
    run: (i, c) => { const sel = selectBattery(asPart(asThing(i.thing)), Number(c.set.count) || undefined);
      return { chosen: sel.chosen.group, need: sel.need, options: sel.options.map((o) => ({ group: o.group, cca: o.cca, kg: o.kg, Ah: o.Ah, over: `${Math.round(o.margin * 100)} %`, meets: o.meets, fits: o.fits })), has: sel.has?.group ?? '', selection: sel, says: sel.says }; },
    tests: [{ inputs: { thing: BAY }, outputs: { chosen: '51R', need: 122, has: '35' } }, { set: { count: 3 }, inputs: { thing: { name: 'truck', parts: [{ name: 'diesel engine (14800 cc, 330 kW)' }] } }, outputs: { chosen: '48', need: 603 } }] }),
  def({ id: 'explain', name: 'Say why', kind: 'view', ability: 'show', domains: ['everyday', 'mechanical', 'vehicles', 'electrical', 'structural', 'software'], says: 'Why a result is as it is, in plain lines, shortest first: a placement (where it went, what bound it, why where it was did not do, the next best and what each gives up, how many places failed each test, where the figures come from), a pick by duty (the duty, the choice, what it has now), or anything that says why and where its figures come from',
    settings: [{ key: 'depth', label: 'How much', type: 'choice', default: 'full', choices: ['one line', 'full'] }],
    ports: { inputs: [P('value', 'any')], outputs: [P('lines', 'list<text>'), P('says', 'text')] },
    run: (i, c) => { const v = i.value as Record<string, unknown> | null, depth = c.set.depth === 'one line' ? 'one line' : 'full'; let lines: string[];
      if (v && typeof v === 'object' && 'chosen' in v && 'tried' in v && 'rejected' in v) lines = explainPlaced(v as unknown as Placed, depth);
      else if (v && typeof v === 'object' && 'duty' in v && 'options' in v) { const sel = v as unknown as Selection; lines = [sel.says, ...(depth === 'full' ? [`duty: ${sel.duty.why} (${sel.duty.source})`, ...sel.options.map((o) => `group ${o.group}: ${o.cca} CCA, ${o.kg} kg, ${o.meets ? `meets it, ${Math.round(o.margin * 100)} % over` : 'short of it'}`)] : [])]; }
      else if (v && typeof v === 'object') { const o = v as Record<string, unknown>, said = ['says', 'reason', 'why'].map((k) => o[k]).filter((x): x is string => typeof x === 'string'), src = Array.isArray(o.sources) ? o.sources.map(String) : []; if (!said.length) throw new Error('nothing here says why: wire a result that does'); lines = depth === 'one line' ? [said[0]!] : [...new Set(said), ...(src.length ? [`from: ${src.join('; ')}`] : [])]; }
      else if (typeof v === 'string' && v) lines = [v]; else throw new Error('wire a result in');
      return { lines, says: lines[0]! }; },
    tests: [{ inputs: { value: { says: 'it holds', sources: ['a table'] } }, outputs: { lines: ['it holds', 'from: a table'] } }, { set: { depth: 'one line' }, inputs: { value: { reason: 'too hot', says: 'moved' } }, outputs: { says: 'moved' } }] }),
  def({ id: 'repair.library', name: 'Repairs', kind: 'solver', ability: 'decide', domains: ['mechanical', 'vehicles', 'electrical', 'structural', 'manufacturing'], says: 'What the autopilot may do about a finding, by the rule it answers, least costly first: nudge a part clear of what it runs into, move it (the placement solver), put a heat shield between. Choose which, and in what order; a rule with no repair is said, a gap in the library',
    settings: [{ key: 'use', label: 'Repairs, in order (blank: all, least costly first)', type: 'text', default: '' }],
    ports: { inputs: [], outputs: [P('library', 'any'), P('repairs', 'table'), P('gaps', 'list<text>'), P('says', 'text')] },
    run: (_i, c) => { const ids = String(c.set.use ?? '').split(/[\s,]+/).filter(Boolean), bad = ids.filter((x) => !REPAIRS.some((r) => r.id === x)); if (bad.length) throw new Error(`no repair "${bad[0]}" (there are ${REPAIRS.map((r) => r.id).join(', ')})`);
      const lib = ids.length ? ids.map((x, k) => ({ ...REPAIRS.find((r) => r.id === x)!, cost: k + 1 })) : [...REPAIRS].sort((a, b) => a.cost - b.cost), gaps = (['interference', 'clearance', 'heat'] as const).filter((k) => !lib.some((r) => r.rules.includes(k))).map((k) => `nothing answers ${k}`);
      return { library: lib, repairs: lib.map((r) => ({ repair: r.id, name: r.name, answers: r.rules.join(', '), does: r.says })), gaps, says: `${lib.length} repairs: ${lib.map((r) => r.id).join(', ')}${gaps.length ? `; ${gaps.join(', ')}` : ''}` }; },
    tests: [{ inputs: {}, outputs: { gaps: [] } }, { set: { use: 'shield' }, inputs: {}, outputs: { gaps: ['nothing answers interference', 'nothing answers clearance'] } }] }),
  def({ id: 'auto.loop', name: 'Autopilot', kind: 'solver', ability: 'optimise', domains: ['mechanical', 'vehicles', 'electrical', 'structural', 'manufacturing'], says: 'Checks a thing by the rules, groups what is wrong into problems, and tries the repairs on each, least costly first, keeping one only if its problem is gone and the parts it changed have less wrong than before; then checks the whole again. What no repair clears becomes a named task with why each repair failed. Nothing is typed by hand: what moves, where to and what is made come from the rules, the maps and what the parts need',
    settings: [{ key: 'rounds', label: 'At most this many problems tried', type: 'number', default: 30 }, { key: 'step', label: 'The solver\'s cell, m', type: 'number', default: 0.025 }],
    ports: { inputs: [thing(), P('library', 'any', { optional: true })], outputs: [thing('thing', 'thing, repaired'), N('before', undefined, { label: 'findings before' }), N('after', undefined, { label: 'findings after' }), P('attempts', 'table'), P('tasks', 'table'), P('kept', 'list<text>'), P('says', 'text')] },
    run: (i, c) => { const lib = Array.isArray(i.library) ? (i.library as Repair[]) : undefined, step = Number(c.set.step); if (!(step >= 0.01 && step <= 0.2)) throw new Error('a cell from 10 mm to 0.2 m');
      const r = autoLoop(asPart(asThing(i.thing)), { rounds: Number(c.set.rounds) || 30, repairs: lib, step });
      return { thing: r.tree, before: r.before, after: r.after, attempts: r.attempts.map((a) => ({ problem: a.problem, repair: a.repair, kept: a.kept, why: a.why, ms: a.ms })), tasks: r.tasks, kept: r.kept, says: r.says }; },
    tests: [{ set: { step: 0.05 }, inputs: { thing: BAY }, outputs: { before: 1, after: 0 } }] }),
  def({ id: 'check.rules', name: 'Nothing runs into anything?', kind: 'critic', ability: 'check', domains: ['vehicles', 'mechanical', 'manufacturing', 'electrical', 'everyday'], sink: true, says: 'The rules a made thing is held to, on its surfaces as drawn (triangle against triangle): no two pieces cross unless they are one piece, one is said to pass through the other, one is a fastener in what it fastens, or one sits in a hole cut for it; a piece that moves keeps the clearance it says (a belt, a chain) from all but what it runs on; and nothing stands nearer a hot piece (an exhaust, a turbo, a muffler) than its material takes, unless something solid is between them. Each finding names both pieces and what would put it right',
    ports: { inputs: [thing()], outputs: [N('findings', undefined, { label: 'how many' }), P('interference', 'list<text>'), P('clearance', 'list<text>'), P('heat', 'list<text>'), P('pieces', 'integer'), P('says', 'text')] },
    run: (i) => {
      const parts: Part[] = [], seen = new Set<object>(), walk = (t: Part | Assembly) => { if (seen.has(t)) return; seen.add(t); if (isPart(t)) parts.push(t); else for (const it of t.items) walk(it.of); };
      walk(asThing(i.thing));
      const rs = parts.map((p) => rulesOf(p)), all = rs.flatMap((r) => r.findings), of = (k: string) => all.filter((f) => f.rule === k).map((f) => f.says);
      return { findings: all.length, interference: of('interference'), clearance: of('clearance'), heat: of('heat'), pieces: rs.reduce((a, r) => a + r.pieces, 0), says: all.length ? `${all.length} finding${all.length > 1 ? 's' : ''}: ${all.slice(0, 3).map((f) => f.says).join('; ')}${all.length > 3 ? '; …' : ''}` : 'nothing runs into, rubs or overheats anything' };
    },
    tests: [{ inputs: { thing: { name: 'two blocks', parts: [{ name: 'block a', item: 'a', shape: { box: [0.1, 0.1, 0.1] }, mat: 'steel-low' }, { name: 'block b', item: 'b', shape: { box: [0.1, 0.1, 0.1] }, at: [0.05, 0.03, 0.02], mat: 'steel-low' }] } }, outputs: { findings: 1 } },
      { inputs: { thing: { name: 'two blocks apart', parts: [{ name: 'block a', item: 'a', shape: { box: [0.1, 0.1, 0.1] }, mat: 'steel-low' }, { name: 'block b', item: 'b', shape: { box: [0.1, 0.1, 0.1] }, at: [0.3, 0, 0], mat: 'steel-low' }] } }, outputs: { findings: 0 } },
      { inputs: { thing: { name: 'a hose by a pipe', parts: [{ name: 'pipe', item: 'pipe', shape: { box: [0.05, 0.05, 0.5] }, mat: 'steel-low', hot: 800 }, { name: 'hose', item: 'hose', shape: { box: [0.05, 0.05, 0.5] }, at: [0.08, 0, 0], mat: 'epdm' }] } }, outputs: { findings: 1 } }] }),
  // ---- making things as they are made: one node per process or geometry, shared by everything made that way -------------
  def({ id: 'make.grid', name: 'Cast grid', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'electrical', 'mechanical'], says: 'A grid cast in one: a frame round its edge, bars upright and wires across inside it, and a lug at its top. A battery plate\'s grid, a fan guard, a drain cover, a radiator\'s core. It stands thin along x',
    settings: [{ key: 'lug', label: 'Lug at its top', type: 'choice', default: 'right', choices: ['right', 'left', 'none'] }, { key: 'mat', label: 'Material', type: 'choice', default: 'lead', choices: ENGINEERING }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: 'pb-grid' }],
    ports: { inputs: [L('w', 0.15, 'width'), L('h', 0.12, 'height'), L('t', 0.0011, 'thickness'), N('bars', undefined, { default: 7, optional: true }), N('wires', undefined, { default: 9, optional: true }), L('rim', 0.003, 'frame width')], outputs: [P('grid', 'part'), N('mass', 'kg')] },
    run: (i, c) => { const p = gridPlate({ w: Number(i.w ?? 0.15), h: Number(i.h ?? 0.12), t: Number(i.t ?? 0.0011), bars: Math.round(Number(i.bars ?? 7)), wires: Math.round(Number(i.wires ?? 9)), rim: Number(i.rim ?? 0.003), lug: String(c.set.lug) as 'right', mat: String(c.set.mat), item: String(c.set.item || 'pb-grid') }); return { grid: p, mass: massOf(p) }; },
    tests: [{ set: { lug: 'none' }, inputs: { bars: 2, wires: 2 }, outputs: { grid: { parts: [{}, {}, {}, {}, {}, {}, {}, {}] } } }] }),
  def({ id: 'make.coat', name: 'Coat', kind: 'generator', ability: 'transform', domains: ['manufacturing', 'electrical', 'mechanical', 'everyday'], says: 'A part coated with another material, filling it and standing proud of it each side along its thinnest way: paste pressed into a grid, paint, plating, an overmould. The part keeps what stands out of it (a lug)',
    settings: [{ key: 'name', label: 'What it then is', type: 'text', default: 'positive plate' }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: 'plate-positive' }, { key: 'layer', label: 'Its coat is called', type: 'text', default: 'positive paste' }, { key: 'layerItem', label: 'Its coat is (inventory item)', type: 'text', default: 'paste-positive' }, { key: 'mat', label: 'Coat material', type: 'choice', default: 'lead', choices: ENGINEERING }, { key: 'color', label: 'Coat colour', type: 'text', default: '#4a2c1c' }],
    ports: { inputs: [P('part', 'part'), L('t', 0.00035, 'proud each side'), N('fill', undefined, { default: 0.2, optional: true, label: 'share solid' })], outputs: [P('coated', 'part'), N('mass', 'kg')] },
    run: (i, c) => { if (!isPart(i.part)) throw new Error('wire a part in to coat'); const p = coated(i.part, { name: String(c.set.name), item: String(c.set.item) || undefined, layer: String(c.set.layer), layerItem: String(c.set.layerItem) || undefined, t: Number(i.t ?? 0.00035), mat: String(c.set.mat), color: hex(c.set.color), fill: Number(i.fill ?? 0.2) }); return { coated: p, mass: massOf(p) }; },
    tests: [{ set: { name: 'c', item: '', layerItem: '' }, inputs: { part: { name: 'p', shape: { box: [0.001, 0.1, 0.1] }, mat: 'lead' }, t: 0.001, fill: 1 }, outputs: { mass: 0.003 * 0.01 * 11340 + 0.001 * 0.01 * 11340 }, rel: 1e-6 }] }),
  def({ id: 'make.wrap', name: 'Wrap in', kind: 'generator', ability: 'transform', domains: ['manufacturing', 'electrical', 'everyday'], says: 'A part wrapped in an envelope of a sheet folded round it and sealed at its edges, open at its top: a separator round a battery plate, a bag, a sleeve, shrink wrap',
    settings: [{ key: 'name', label: 'The wrap is called', type: 'text', default: 'separator envelope' }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: 'plate-separator' }, { key: 'mat', label: 'Material', type: 'choice', default: 'pe', choices: ENGINEERING }, { key: 'color', label: 'Colour', type: 'text', default: '#d9dad2' }],
    ports: { inputs: [P('part', 'part'), L('t', 0.0006, 'sheet thickness'), N('fill', undefined, { default: 0.4, optional: true, label: 'share solid' })], outputs: [P('wrapped', 'part'), N('mass', 'kg')] },
    run: (i, c) => { if (!isPart(i.part)) throw new Error('wire a part in to wrap'); const p = wrapped(i.part, { name: String(c.set.name), item: String(c.set.item), t: Number(i.t ?? 0.0006), mat: String(c.set.mat), color: hex(c.set.color), fill: Number(i.fill ?? 0.4) }); return { wrapped: p, mass: massOf(p) }; },
    tests: [{ inputs: { part: { name: 'p', shape: { box: [0.001, 0.1, 0.1] }, mat: 'lead' } }, outputs: { wrapped: { name: 'p, wrapped' } } }] }),
  def({ id: 'make.stack', name: 'Stack', kind: 'logic', ability: 'generate', domains: ['manufacturing', 'electrical', 'mechanical', 'thermal'], says: 'Things stacked along x, so many in all, a pitch apart, taking the things wired in in turn: a cell\'s negative and positive plates, a heat sink\'s fins, a stator\'s laminations, a capacitor\'s foils. Each stored once',
    ports: { inputs: [P('things', 'assembly', { many: true, label: 'things, in turn' }), N('n', undefined, { default: 13, optional: true, label: 'how many in all' }), L('pitch', 0.0026, 'pitch'), L('y', 0, 'raised by')], outputs: [thing('stack', 'stack')] },
    run: (i) => { const ts = (Array.isArray(i.things) ? i.things : [i.things]).filter(Boolean).map(asThing); if (!ts.length) throw new Error('nothing wired in to stack'); const s = stackOf(ts, Math.max(1, Math.round(Number(i.n ?? 13))), Number(i.pitch ?? 0.0026)); return { stack: Number(i.y ?? 0) ? { name: s.name, items: [place(s, [0, Number(i.y), 0])] } : s }; },
    tests: [{ inputs: { things: [{ name: 'a' }, { name: 'b' }], n: 3, pitch: 1 }, outputs: { stack: { items: [{ at: [-1, 0, 0] }, { at: [0, 0, 0] }, { at: [1, 0, 0] }] } } }] }),
  def({ id: 'make.strap', name: 'Strap across', kind: 'logic', ability: 'connect', domains: ['electrical', 'manufacturing', 'mechanical'], says: 'A strap cast or welded over every piece named like a pattern, one for each side they stand on (a cell\'s plate straps over their lugs, a busbar over a row of terminals); or, in series, the pieces on each side joined two by two zig-zag, one thing\'s plus to the next one\'s minus (a battery\'s cells), its two free ends given for its posts',
    settings: [{ key: 'path', label: 'Over pieces named (pattern)', type: 'text', default: '^lug$' }, { key: 'series', label: 'In series (zig-zag)', type: 'boolean', default: false }, { key: 'result', label: 'What it then is (blank: as it was)', type: 'text', default: '' }, { key: 'name', label: 'Each is called', type: 'text', default: 'strap' }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: 'la-strap' }, { key: 'mat', label: 'Material', type: 'choice', default: 'lead', choices: ENGINEERING }],
    ports: { inputs: [thing(), L('h', 0.008, 'strap height')], outputs: [thing('joined', 'joined'), P('ends', 'table', { label: 'its free ends (series)' }), P('count', 'integer')] },
    run: (i, c) => { const t = asThing(i.thing), r = strapsOver(t, String(c.set.path), { series: !!c.set.series, name: String(c.set.name), item: String(c.set.item), mat: String(c.set.mat), h: Number(i.h ?? 0.008) }); return { joined: { name: String(c.set.result || '') || t.name, items: [place(t), ...r.straps.map((s) => place(s, s.at ?? [0, 0, 0]))] }, ends: r.ends.map(([x, y, z]) => ({ x, y, z })), count: r.straps.length }; },
    tests: [{ inputs: { thing: { name: 'two', parts: [{ name: 'lug', shape: { box: [0.01, 0.01, 0.01] }, at: [0, 0, 0] }, { name: 'lug', shape: { box: [0.01, 0.01, 0.01] }, at: [0.05, 0, 0] }] } }, outputs: { count: 1 } }] }),
  def({ id: 'make.enclosure', name: 'Enclosure with cells', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'electrical', 'everyday'], says: 'A moulded enclosure in one piece: its floor, walls and partitions dividing it into cells along its length, ribs under each cell; and its lid. A battery case, a toolbox, an ice tray, a junction box. Each cell a frame to put things into',
    settings: [{ key: 'mat', label: 'Material', type: 'choice', default: 'pp', choices: ENGINEERING }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: 'battery-case' }, { key: 'lidItem', label: 'Its lid is (inventory item)', type: 'text', default: 'battery-lid' }],
    ports: { inputs: [L('L', 0.23, 'length'), L('W', 0.175, 'width'), L('H', 0.195, 'height (to its lid)'), L('wall', 0.0025, 'wall'), N('cells', undefined, { default: 6, optional: true }), L('rib', 0.012, 'rib height'), L('lid', 0.012, 'lid thickness')], outputs: [P('case', 'part'), P('lid', 'part'), L('cellL', 0, 'each cell\'s length'), L('cellW', 0, 'each cell\'s width'), L('cellH', 0, 'each cell\'s height')] },
    run: (i, c) => { const e = enclosure({ L: Number(i.L ?? 0.23), W: Number(i.W ?? 0.175), H: Number(i.H ?? 0.195), wall: Number(i.wall ?? 0.0025), cells: Math.max(1, Math.round(Number(i.cells ?? 6))), ribs: Number(i.rib ?? 0.012), lid: Number(i.lid ?? 0.012), mat: String(c.set.mat), item: String(c.set.item), lidItem: String(c.set.lidItem) }); return { case: e.case, lid: e.lid, cellL: e.cell[0], cellW: e.cell[2], cellH: e.cell[1] }; },
    tests: [{ inputs: { L: 0.1, W: 0.1, H: 0.1, wall: 0.002, cells: 2, rib: 0 }, outputs: { cellW: 0.096 }, rel: 1e-9 }] }),
  def({ id: 'make.into', name: 'Into its cells', kind: 'logic', ability: 'connect', domains: ['manufacturing', 'electrical', 'everyday'], says: 'A thing put into each cell of an enclosure (its frames "cell 1", …), every other one turned half round if asked, so each one\'s plus lies beside the next one\'s minus. Cells into a battery case, drawers into a cabinet, eggs into a carton',
    settings: [{ key: 'alternate', label: 'Turn every other one', type: 'boolean', default: true }],
    ports: { inputs: [thing(), P('into', 'part', { label: 'enclosure' })], outputs: [thing('filled', 'filled')] },
    run: (i, c) => { if (!isPart(i.into)) throw new Error('wire an enclosure in'); return { filled: intoCells(asThing(i.thing), i.into, !!c.set.alternate) }; },
    tests: [{ inputs: { thing: { name: 'c' }, into: { name: 'box', ports: [{ name: 'cell 1', sex: 'frame', thread: '', pattern: [], at: [1, 0, 0], n: [0, 1, 0], u: [1, 0, 0], t: 0 }] } }, outputs: { filled: { items: [{ at: [1, 0, 0] }] } } }] }),
  def({ id: 'tag', name: 'It is', kind: 'logic', ability: 'transform', domains: ['mechanical', 'manufacturing', 'electrical', 'everyday'], says: 'Says what a part is: its name, and the inventory item it is (so the audit holds it to its recipe and anything can find it). A cylinder that is a battery\'s terminal post, a box that is its vent cap',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'terminal post' }, { key: 'item', label: 'Inventory item', type: 'text', default: 'battery-post' }],
    ports: { inputs: [P('part', 'part')], outputs: [P('tagged', 'part')] },
    run: (i, c) => { if (!isPart(i.part)) throw new Error('wire a part in'); return { tagged: { ...i.part, name: String(c.set.name) || i.part.name, ...(c.set.item ? { item: String(c.set.item) } : {}) } }; },
    tests: [{ set: { name: 'post', item: 'battery-post' }, inputs: { part: { name: 'cyl' } }, outputs: { tagged: { name: 'post', item: 'battery-post' } } }] }),
  def({ id: 'make.roll', name: 'Wound roll', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'electrical', 'energy'], says: 'Strips laid over one another and wound round a core: a lithium cell\'s cathode, separator and anode; a coil\'s wire; a film capacitor; a roll of tape. Strips as "name thickness-in-µm #colour item", one a line',
    settings: [{ key: 'strips', label: 'Strips (name µm #colour item)', type: 'text', default: 'cathode 130 #2b2d33 cathode-sheet\nseparator 15 #e6e6e0 separator-film\nanode 170 #111214 anode-sheet\nseparator 15 #e6e6e0 separator-film' }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: 'jelly-roll' }],
    ports: { inputs: [L('core', 0.001, 'core radius'), N('turns', undefined, { default: 20, optional: true }), L('h', 0.06, 'height')], outputs: [P('roll', 'part'), L('r', 0, 'its radius')] },
    run: (i, c) => {
      const strips = String(c.set.strips).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = /^(.+?)\s+([\d.]+)\s+(#[0-9a-f]{6})(?:\s+(\S+))?$/i.exec(l); if (!m) throw new Error(`"${l}" is not "name µm #colour item"`); return { name: m[1]!, t: Number(m[2]) * 1e-6, color: hex(m[3]), ...(m[4] ? { item: m[4] } : {}) }; });
      const turns = Math.max(1, Math.round(Number(i.turns ?? 20))), core = Number(i.core ?? 0.001), p = woundRoll({ name: 'wound roll', core, turns, h: Number(i.h ?? 0.06), strips, item: String(c.set.item) || undefined });
      return { roll: p, r: core + turns * strips.reduce((a, s) => a + s.t + 1e-5, 0) };
    },
    tests: [{ inputs: { turns: 3 }, outputs: { roll: { parts: [{}, {}, {}, {}] } } }] }),
  def({ id: 'make.fill', name: 'Fill', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'electrical', 'thermal', 'everyday'], says: 'Each cell of an enclosure filled with a liquid to a height: a battery\'s acid, a tank\'s fuel, a radiator\'s coolant. Weighed as all of it less what stands in it; drawn as its surface so what is under it shows',
    settings: [{ key: 'name', label: 'The liquid', type: 'text', default: 'electrolyte' }, { key: 'mat', label: 'Material', type: 'choice', default: 'acid', choices: ENGINEERING }],
    ports: { inputs: [P('into', 'part', { label: 'enclosure' }), L('L', 0.036, 'each cell\'s length'), L('W', 0.17, 'each cell\'s width'), L('h', 0.14, 'filled to'), N('share', undefined, { default: 0.55, optional: true, label: 'share of the cell it fills' })], outputs: [thing('filled', 'filled'), N('mass', 'kg')] },
    run: (i, c) => { if (!isPart(i.into)) throw new Error('wire an enclosure in'); const m = String(c.set.mat), f = fillCells(i.into, { name: String(c.set.name), L: Number(i.L ?? 0.036), W: Number(i.W ?? 0.17), h: Number(i.h ?? 0.14), mat: m, rho: DENSITY[m] ?? 1000, share: Number(i.share ?? 0.55) }); return { filled: f, mass: massOfAll(f) }; },
    tests: [{ set: { mat: 'water' }, inputs: { into: { name: 'box', ports: [{ name: 'cell 1', sex: 'frame', thread: '', pattern: [], at: [0, 0, 0], n: [0, 1, 0], u: [1, 0, 0], t: 0 }] }, L: 0.1, W: 0.1, h: 0.1, share: 1 }, outputs: { mass: 1 }, rel: 1e-9 }] }),
  // ---- an engine from its first parts up (engines.ts), and the makers its parts share with every other machine ----------
  def({ id: 'make.turned', name: 'Turned part', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'mechanical'], says: 'A part turned on a lathe from steps of radius and length along its axis: a shaft, a pin, a valve, an axle, a journal. Steps as "diameter-mm × length-mm", one a line',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'shaft' }, { key: 'steps', label: 'Steps (Ø mm × length mm)', type: 'text', default: '20 x 30\n15 x 80\n12 x 20' }, { key: 'mat', label: 'Material', type: 'choice', default: 'steel-alloy', choices: ENGINEERING }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: '' }],
    ports: { inputs: [L('bore', 0, 'bore through it')], outputs: [P('part', 'part'), N('mass', 'kg')] },
    run: (i, c) => { const steps = String(c.set.steps).split('\n').map((l) => /([\d.]+)\s*[x×]\s*([\d.]+)/.exec(l)).filter(Boolean).map((m) => [Number(m![1]) / 2000, Number(m![2]) / 1000] as [number, number]); if (!steps.length) throw new Error('give its steps as "Ø × length", in mm'); const p = turned({ name: String(c.set.name), steps, bore: Number(i.bore ?? 0) / 2 || undefined, mat: String(c.set.mat), item: String(c.set.item) || undefined }); return { part: p, mass: massOf(p) }; },
    tests: [{ set: { steps: '20 x 100' }, inputs: {}, outputs: { mass: Math.PI * 0.01 * 0.01 * 0.1 * 7850 }, rel: 1e-6 }] }),
  def({ id: 'make.coil', name: 'Coiled spring', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'mechanical'], says: 'Wire coiled round a mandrel, its ends closed: a valve\'s spring, a clutch\'s, a pen\'s',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'spring' }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: '' }],
    ports: { inputs: [L('d', 0.003, 'wire'), L('D', 0.024, 'mean diameter'), L('L', 0.04, 'length as fitted (drawn)'), N('n', undefined, { default: 5, optional: true, label: 'active coils' }), L('L0', 0, 'free length (0: as drawn)')], outputs: [P('spring', 'part'), N('mass', 'kg'), N('rate', 'N/m')] },
    run: (i, c) => { const d = Number(i.d ?? 0.003), D = Number(i.D ?? 0.024), n = Number(i.n ?? 5), L0 = Number(i.L ?? 0.04); if (!(d > 0 && D > d && n >= 1 && L0 > 2 * d)) throw new Error('a spring wants wire thicker than nothing, coiled wider than its wire, a coil or more, longer than two wires'); const p = coil({ name: String(c.set.name), d, D, L: Number(i.L ?? 0.04), n, L0: Number(i.L0 ?? 0) || undefined, item: String(c.set.item) || undefined }); return { spring: p, mass: massOf(p), rate: (79e9 * d ** 4) / (8 * D ** 3 * n) }; },
    tests: [{ inputs: { d: 0.002, D: 0.02, n: 5 }, outputs: { rate: (79e9 * 0.002 ** 4) / (8 * 0.02 ** 3 * 5) }, rel: 1e-9 }] }),
  def({ id: 'make.wound', name: 'Winding', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'electrical', 'mechanical'], says: 'Enamelled wire wound close, turn by turn: on a former round its axis (a solenoid: an injector\'s, an ignition coil\'s, a clutch\'s), round a ring\'s band (a toroid: a stator\'s, an armature\'s), or round a rectangular pole (a stepper\'s). Its outer layer drawn as the wire it is, the layers under it as what they pack into; how many turns it holds, how much wire, and its resistance (copper at 20 °C)',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'coil' }, { key: 'kind', label: 'Wound', type: 'choice', default: 'solenoid', choices: ['solenoid', 'toroid', 'pole'] }],
    ports: { inputs: [L('ri', 0.004, 'inside (or a pole\'s half width)'), L('ro', 0.01, 'outside (or the winding\'s half width)'), L('L', 0.012, 'length'), L('d', 0.0005, 'wire'), N('fill', undefined, { default: 0.6, optional: true, label: 'copper share of its section' }), L('ih', 0, 'a pole\'s half height'), L('oh', 0, 'its winding\'s half height')], outputs: [P('winding', 'part'), N('mass', 'kg'), N('turns'), N('wire', 'm', { label: 'wire length' }), N('ohms', 'ohm', { label: 'resistance at 20 °C' })] },
    run: (i, c) => { const ri = Number(i.ri ?? 0.004), ro = Number(i.ro ?? 0.01), L0 = Number(i.L ?? 0.012), d = Number(i.d ?? 0.0005), fill = Number(i.fill ?? 0.6), kind = String(c.set.kind), ih = Number(i.ih ?? 0), oh = Number(i.oh ?? 0), pole = kind === 'pole';
      if (!(ro > ri && L0 > d && d > 0) || (pole && !(oh > ih && ih > 0))) throw new Error('its outside must be beyond its inside (a pole\'s height too), and it longer than its wire is thick');
      const p = wound(pole ? { name: String(c.set.name), kind: 'pole', iw: ri, ih, ow: ro, oh, L: L0, d, fill } : { name: String(c.set.name), kind: kind === 'toroid' ? 'toroid' : 'solenoid', ri, ro, L: L0, d, fill });
      // (its turns: the copper share of its section (one side of a pole's) over one wire's; a turn's length round the
      // middle of its section)
      const area = (Math.PI * d * d) / 4, turns = Math.floor((fill * (ro - ri) * L0) / area);
      const turnLen = kind === 'toroid' ? 2 * (ro - ri + L0) : pole ? 2 * (ri + ro) + 2 * (ih + oh) : Math.PI * (ri + ro), wire = turns * turnLen;
      return { winding: p, mass: massOf(p), turns, wire, ohms: (1.68e-8 * wire) / area }; },
    sources: [{ cite: 'CRC Handbook of Chemistry and Physics, 97th ed., 2016: copper\'s resistivity, 1.68e-8 Ω·m at 20 °C', kind: 'handbook' }],
    tests: [{ inputs: { ri: 0.004, ro: 0.01, L: 0.012, d: 0.0005, fill: 0.6 }, outputs: { turns: Math.floor((0.6 * 0.006 * 0.012) / (Math.PI * 0.0005 ** 2 / 4)) } }, { set: { kind: 'toroid' }, inputs: { ri: 0.02, ro: 0.03, L: 0.01, d: 0.001 }, outputs: { winding: { name: 'coil' } } }] }),
  def({ id: 'make.gear', name: 'Cut gear or sprocket', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'mechanical'], says: 'Teeth cut round a bore by module and count: a spur gear, a timing sprocket, a ring gear, a pump\'s rotor',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'gear' }, { key: 'mat', label: 'Material', type: 'choice', default: 'steel-alloy', choices: ENGINEERING }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: '' }],
    ports: { inputs: [L('m', 0.002, 'module'), N('z', undefined, { default: 30, optional: true, label: 'teeth' }), L('b', 0.015, 'face width'), L('bore', 0.012, 'bore')], outputs: [P('gear', 'part'), N('mass', 'kg'), L('d', 0, 'pitch diameter')] },
    run: (i, c) => { const m = Number(i.m ?? 0.002), z = Math.round(Number(i.z ?? 30)), p = toothed({ name: String(c.set.name), m, z, b: Number(i.b ?? 0.015), bore: Number(i.bore ?? 0.012), mat: String(c.set.mat), item: String(c.set.item) || undefined }); return { gear: p, mass: massOf(p), d: m * z }; },
    tests: [{ inputs: { m: 0.002, z: 30 }, outputs: { d: 0.06 }, rel: 1e-9 }] }),
  def({ id: 'make.chain', name: 'Chain round wheels', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'mechanical'], says: 'Roller chain round sprockets in a plane, link by link (inner links of plates, bushes and rollers; outer of plates and pins): a timing drive, a bicycle\'s, a conveyor\'s. Wheels as "u v radius" in mm, one a line',
    settings: [{ key: 'series', label: 'Chain', type: 'choice', default: '06B', choices: Object.keys(CHAINS) }, { key: 'wheels', label: 'Wheels (u v r, mm)', type: 'text', default: '0 0 31\n-40 280 62\n40 280 62' }],
    ports: { inputs: [], outputs: [thing('chain', 'chain'), N('links'), N('mass', 'kg')] },
    run: (_i, c) => { const C = CHAINS[String(c.set.series)]!, w = String(c.set.wheels).split('\n').map((l) => l.trim().split(/\s+/).map(Number)).filter((a) => a.length === 3 && a.every(Number.isFinite)).map(([u, v, r]) => [u! / 1000, v! / 1000, r! / 1000 + C.roller / 2000] as [number, number, number]); if (w.length < 2) throw new Error('give it two wheels or more');
      const path = chainPath(w), a = chainRun({ name: `chain ${c.set.series}`, p: C.p / 1000, roller: C.roller / 1000, width: C.width / 1000, path, closed: true }); return { chain: a, links: a.items.length, mass: massOfAll(a) }; },
    tests: [{ set: { wheels: '0 0 30\n200 0 30' }, inputs: {}, outputs: { links: 62 } }] }),
  ...(['piston', 'rod', 'crank', 'block', 'head', 'whole'] as const).map((k) => def({ id: `engine.${k}`, name: ({ piston: 'Piston and rings', rod: 'Connecting rod', crank: 'Crankshaft', block: 'Cylinder block', head: 'Cylinder head', whole: 'Piston engine' })[k], kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'energy'],
    says: ({ piston: 'A piston with its three rings, its wrist pin and the pin\'s two clips, sized from the bore', rod: 'A connecting rod forged to its I-section, its cap cracked off, its two shells and two bolts', crank: 'A crankshaft forged in one: its main journals, a pin for each throw at its firing angle, webs and counterweights, its nose and flange', block: 'The block cast round its cores (barrel, water jacket, crankcase, bulkheads), its liners, main caps, shells and bolts', head: 'The head cast round its ports, its valves, springs, retainers, keepers, guides, seals, tappets or rockers, its cams and caps, its bolts, its plugs and coils or its injectors', whole: 'A whole piston engine from its first parts: block, crank, pistons and rods, head, timing, oiling, intake, exhaust and what hangs on it. Its mass and size are what its parts come to' })[k],
    // (a head takes its pieces, the whole engine its main parts, each wired in from a node of its own or made here to size)
    settings: ENGINE_SET, ports: { inputs: [N('cylinders', undefined, { default: 4, optional: true }), L('bore', 0.0805, 'bore'), L('stroke', 0.0976, 'stroke'), ...(k === 'head' ? HEAD_PIECES.map((w) => P(pieceKey(w), 'part', { optional: true, label: `its ${w} (else made to size)` })) : k === 'whole' ? (['piston', 'rod', 'crank', 'block', 'head'] as const).map((w) => P(w, 'part', { optional: true, label: `its ${w} (else made to size)` })) : [])], outputs: [P(k === 'whole' ? 'engine' : k, 'part'), N('mass', 'kg'), N('pieces')] },
    run: (i, c) => { const s = engineSpecOf(i, c.set), d = engineDims(s), got = (w: string): Part | undefined => (isPart(i[w]) ? (i[w] as Part) : undefined);
      const p = k === 'piston' ? pistonAssembly(s, d) : k === 'rod' ? conRod(s, d) : k === 'crank' ? crankshaft(s, d) : k === 'block' ? cylinderBlock(s, d) : k === 'head' ? cylinderHead(s, d, s.layout === 'vee' ? 0 : undefined, Object.fromEntries(HEAD_PIECES.flatMap((w) => (got(pieceKey(w)) ? [[w, got(pieceKey(w))!]] : [])))) : engineBuilt(s, { piston: got('piston'), rod: got('rod'), crank: got('crank'), block: got('block'), head: got('head') }).engine;
      const count = (q: Part): number => (q.shape ? 1 : 0) + (q.parts ?? []).reduce((a, r) => a + count(r), 0); return { [k === 'whole' ? 'engine' : k]: p, mass: massOf(p), pieces: count(p) }; },
    tests: [{ inputs: { cylinders: 1, bore: 0.077, stroke: 0.058 }, outputs: k === 'piston' ? { pieces: 13 } : {} }] })),
  // ---- under load: what a made part carries, its stress, its margin (src/nexus/loads.ts), and a stress test over a range ----
  def({ id: 'load.spring', name: 'Spring under load', kind: 'critic', ability: 'check', domains: ['mechanical', 'manufacturing'], says: 'A coiled spring as it was made (its wire, its coil, its coils, its free and fitted lengths, read off the part), compressed as fitted and by a stroke more: its rate and forces, its wire\'s stress against what the wire stands (Shigley ch. 10), whether it binds solid, its surge frequency. Each row its figure, its limit and the factor between',
    settings: [{ key: 'wire', label: 'Wire', type: 'choice', default: 'chrome-silicon-a401', choices: Object.keys(SPRING_WIRES) }],
    ports: { inputs: [P('spring', 'part'), L('stroke', 0.008, 'compressed further by')], outputs: [P('rows', 'table'), N('worst', undefined, { label: 'least factor of safety' }), P('ok', 'boolean'), P('says', 'text')] },
    run: (i, c) => { const sp = i.spring as Part; if (!isPart(sp)) throw new Error('wire a spring in'); const r = springCase(sp, { stroke: Number(i.stroke ?? 0.008), wire: String(c.set.wire) }); return { rows: r.rows.map(tableRow), worst: r.worst?.factor ?? Infinity, ok: r.rows.every((x) => x.ok), says: r.says }; },
    tests: [{ inputs: { spring: coil({ name: 'spring', d: 0.003, D: 0.024, L: 0.04, L0: 0.048, n: 5 }), stroke: 0.008 }, outputs: { ok: true } }] }),
  def({ id: 'load.engine', name: 'Engine under load', kind: 'critic', ability: 'check', domains: ['mechanical', 'vehicles', 'energy'], says: 'A piston engine at a speed and a peak cylinder pressure, its working parts read off them as drawn: the rod pulled at the top of the exhaust stroke and pushed at firing, its buckling, its bolts; its crank pin\'s bearing pressure; its wrist pin\'s shear; whether its valve springs keep its valves on their cams there, and at what speed its valves float; its springs\' wire stress and coil bind. Wire in its own piston, rod or spring to test those. Sweep it over its speed to find where it gives',
    settings: [...ENGINE_SET, { key: 'wire', label: 'Valve spring wire', type: 'choice', default: 'chrome-silicon-a401', choices: Object.keys(SPRING_WIRES) }],
    ports: { inputs: [N('cylinders', undefined, { default: 4, optional: true }), L('bore', 0.0805, 'bore'), L('stroke', 0.0976, 'stroke'), N('rpm', undefined, { default: 6500, optional: true, label: 'speed, rpm' }), N('pmax', 'Pa', { default: 0, optional: true, label: 'peak cylinder pressure (0: typical, 8 MPa petrol, 18 MPa diesel)' }), P('piston', 'part', { optional: true }), P('rod', 'part', { optional: true }), P('spring', 'part', { optional: true, label: 'a valve spring' })], outputs: [P('rows', 'table'), N('worst', undefined, { label: 'least factor of safety' }), N('floatRpm', undefined, { label: 'its valves float above, rpm' }), P('ok', 'boolean'), P('says', 'text')] },
    run: (i, c) => { const s = engineSpecOf(i, c.set), d = engineDims(s), got = (w: string) => (isPart(i[w]) ? (i[w] as Part) : undefined);
      const r = engineLoads(s, { rpm: Number(i.rpm ?? 6500), pmax: Number(i.pmax ?? 0) || d.pmax, piston: got('piston'), rod: got('rod'), spring: got('spring'), wire: String(c.set.wire) });
      return { rows: r.rows.map(tableRow), worst: r.worst?.factor ?? Infinity, floatRpm: r.floatRpm, ok: r.rows.every((x) => x.ok), says: r.says }; },
    tests: [{ inputs: { cylinders: 1, bore: 0.077, stroke: 0.058, rpm: 3600 }, set: { valves: '2', cams: 'ohv', cooling: 'air' }, outputs: { ok: true } }] }),
  def({ id: 'sweep.range', name: 'Sweep (stress test)', kind: 'critic', ability: 'check', domains: ['mechanical', 'structural', 'electrical', 'finance', 'everyday'], says: 'Any block in the library run over a range of one of its inputs (an engine\'s speed, a beam\'s load, a loan\'s rate), the rest wired in as for the block itself: every answer in a table, and the worst of them and where it falls. A stress test of anything the library holds, without building a board for each value',
    settings: [{ key: 'block', label: 'Block (its id)', type: 'text', default: 'load.engine' }, { key: 'vary', label: 'Input run over the range', type: 'text', default: 'rpm' }, { key: 'from', label: 'From', type: 'number', default: 1000 }, { key: 'to', label: 'To', type: 'number', default: 7000 }, { key: 'steps', label: 'Steps', type: 'number', default: 13 }, { key: 'watch', label: 'Output watched', type: 'text', default: 'worst' }, { key: 'worstIs', label: 'Worst is the', type: 'choice', default: 'lowest', choices: ['lowest', 'highest'] }, { key: 'blockSet', label: 'Its settings (JSON)', type: 'code', default: '{}' }],
    ports: (st) => { const t = LIBRARY.get(String(st.block ?? 'load.engine')), set = (() => { try { return JSON.parse(String(st.blockSet ?? '{}')) as Record<string, unknown>; } catch { return {}; } })();
      const ins = t ? portsOf(t, { ...defaultsOf(t), ...set }).inputs.filter((q) => q.name !== String(st.vary ?? 'rpm')).map((q) => ({ ...q, optional: true })) : [];
      return { inputs: ins, outputs: [P('rows', 'table'), N('worst'), N('at', undefined, { label: 'where it is worst' }), P('xs', 'list<number>', { label: 'the range' }), P('ys', 'list<number>', { label: 'what it gave' }), P('says', 'text')] }; },
    run: async (i, c) => {
      const t = LIBRARY.get(String(c.set.block)); if (!t?.run) throw new Error(`no block "${c.set.block}" that runs`);
      let set: Record<string, unknown>; try { set = { ...defaultsOf(t), ...(JSON.parse(String(c.set.blockSet ?? '{}')) as Record<string, unknown>) }; } catch { throw new Error('its settings are not JSON'); }
      const vary = String(c.set.vary), watch = String(c.set.watch), n = Math.max(2, Math.min(200, Math.round(Number(c.set.steps ?? 13)))), a = Number(c.set.from), b = Number(c.set.to), low = c.set.worstIs !== 'highest';
      if (!portsOf(t, set).inputs.some((q) => q.name === vary)) throw new Error(`the ${t.name} has no input "${vary}"`);
      const rows: Record<string, unknown>[] = []; let worst = low ? Infinity : -Infinity, at = NaN;
      for (let k = 0; k < n; k++) { const x = a + ((b - a) * k) / (n - 1), r = await t.run({ ...i, [vary]: x }, { ...c, set }), y = Number(r[watch]); if (!(watch in r)) throw new Error(`the ${t.name} gives no "${watch}"`); rows.push({ [vary]: x, [watch]: y }); if (low ? y < worst : y > worst) { worst = y; at = x; } }
      return { rows, worst, at, xs: rows.map((r) => r[vary] as number), ys: rows.map((r) => r[watch] as number), says: `${t.name} over ${vary} from ${a} to ${b} in ${n} steps: its ${watch} at its ${low ? 'lowest' : 'highest'} ${+worst.toPrecision(4)}, at ${vary} ${+at.toPrecision(4)}` };
    },
    tests: [{ set: { block: 'law.stress.axial', vary: 'F', from: 1000, to: 5000, steps: 5, watch: 'sigma', worstIs: 'highest' }, inputs: { A: 0.001 }, outputs: { worst: 5e6, at: 5000 }, rel: 1e-9 }] }),
  def({ id: 'check.turning', name: 'Turn it over and check', kind: 'critic', ability: 'check', domains: ['mechanical', 'vehicles', 'energy'], says: 'A piston engine turned through a whole revolution of its crank, a step at a time: at each, its crank and every piston and rod where they then are, tried against everything else (block, caps, pan, pump, cams in the block): what any of them runs into, and at what angle. Its cams and valves are held where they are drawn (their lift is not moved)',
    settings: ENGINE_SET, ports: { inputs: [N('cylinders', undefined, { default: 4, optional: true }), L('bore', 0.0805, 'bore'), L('stroke', 0.0976, 'stroke'), N('steps', undefined, { default: 12, optional: true, label: 'steps through a turn' })], outputs: [N('findings'), P('list', 'list<text>'), P('says', 'text')] },
    run: (i, c) => { const s = engineSpecOf(i, c.set), n = Math.max(2, Math.min(72, Math.round(Number(i.steps ?? 12))));
      const r = rulesThrough((t) => engineBuilt(s, {}, { crank: t * 2 * Math.PI }).engine, n, /^(crankshaft|pistons and rods)$/);
      const list = r.findings.map((f) => `at ${Math.round(f.t * 360)}°: ${f.says}`);
      return { findings: r.findings.length, list, says: r.findings.length ? `${r.findings.length} as it turns: ${list.slice(0, 3).join('; ')}` : `turned through 360° in ${n} steps of ${(360 / n).toFixed(0)}°, nothing that moves runs into anything` }; },
    tests: [{ inputs: { cylinders: 1, bore: 0.077, stroke: 0.058, steps: 4 }, set: { valves: '2', cams: 'ohv', cooling: 'air', starter: 'recoil' }, outputs: { findings: 0 } }] }),
  def({ id: 'engine.piece', name: 'Engine piece', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing'], says: 'One of a cylinder head\'s pieces made to the engine\'s size, on its own: an intake or exhaust valve, a valve spring, its retainer, a bucket tappet, a spark plug, an ignition coil. Each made in its own frame (its seat at its origin, up its y), so wired into the head it goes where the head holds it; change it here, or wire in one made any other way (a spring off the coil maker)',
    settings: [...ENGINE_SET, { key: 'which', label: 'Which piece', type: 'choice', default: 'valve spring', choices: [...HEAD_PIECES] }],
    ports: { inputs: [N('cylinders', undefined, { default: 4, optional: true }), L('bore', 0.0805, 'bore'), L('stroke', 0.0976, 'stroke')], outputs: [P('piece', 'part'), N('mass', 'kg')] },
    run: (i, c) => { const s = engineSpecOf(i, c.set), p = headPiece(s, String(c.set.which) as HeadPiece); return { piece: p, mass: massOf(p) }; },
    tests: [{ set: { which: 'valve spring' }, inputs: { bore: 0.1 }, outputs: { piece: { name: 'valve spring' } } }] }),
  // ---- research as a pipeline: notes → reference → its parts and theirs → what is drawn against it → what to do next ----
  def({ id: 'research.notes', name: 'Research notes', kind: 'generator', ability: 'transform', domains: ['mechanical', 'vehicles', 'electrical', 'manufacturing', 'everyday'], says: 'What was found out about a real thing (a reference kept, or your own notes), written down a line a part with where it was read: "@S1 | https://… | title" names a source once; "id | name | in | n | finds | source | level | says | wrong" is a part (in: the entry it is part of; n: how many, 3+ for at least; finds: a pattern over the names of drawn pieces, its alternatives split by ;; level: confirmed, sibling or typical; wrong: a pattern for what the sources say it has not). Compiled into a reference: a part with no source is refused, a count written twice differently is a conflict',
    settings: [{ key: 'from', label: 'Start from (a reference kept, or your notes below)', type: 'choice', default: 'your notes', choices: ['your notes', ...Object.keys(REFERENCE_NOTES)] }, { key: 'id', label: 'Its id', type: 'text', default: 'my-reference' }, { key: 'name', label: 'What it is of', type: 'text', default: 'a thing researched' }, { key: 'notes', label: 'Notes', type: 'code', default: '@S1 | https://en.wikipedia.org/wiki/Spark_plug | Wikipedia: spark plug\nplug | spark plug | | 1 | ^spark plug$ | S1 | typical | a plug\ninsulator | insulator | plug | 1 | insulator | S1 | typical | ceramic, round its centre electrode' }],
    ports: { inputs: [], outputs: [P('reference', 'record'), P('tree', 'list<text>'), P('sources', 'table'), P('refused', 'list<text>'), P('conflicts', 'list<text>'), N('parts', undefined, { label: 'entries' }), P('says', 'text')] },
    run: (_i, c) => { const from = String(c.set.from ?? 'your notes'), kept = from !== 'your notes' ? referenceOf(from) : null; if (from !== 'your notes' && !kept) throw new Error(`no reference "${from}"`);
      const r = kept ?? compileNotes(String(c.set.id || 'my-reference'), String(c.set.name || ''), String(c.set.notes ?? '')); return { reference: r.reference, tree: referenceTree(r.reference), sources: r.reference.sources.map((x) => ({ key: x.key, title: x.title, url: x.url })), refused: r.refused, conflicts: r.conflicts, parts: r.reference.entries.length, says: `${r.reference.entries.length} entries from ${r.reference.sources.length} sources${r.refused.length ? `; ${r.refused.length} refused: ${r.refused[0]}` : ''}${r.conflicts.length ? `; ${r.conflicts.length} conflicts` : ''}` }; },
    tests: [{ inputs: {}, outputs: { parts: 2, refused: [] } }, { inputs: {}, set: { notes: 'plug | spark plug | | 1 | ^spark plug$ | | typical | no source' }, outputs: { parts: 0 } }, { inputs: {}, set: { from: 'm20a-fks' }, outputs: { reference: { id: 'm20a-fks' } } }] }),
  def({ id: 'research.merge', name: 'Compile research', kind: 'calculator', ability: 'transform', domains: ['mechanical', 'vehicles', 'everyday'], says: 'Several references compiled into one: every source kept, each part once, a later one filling in what an earlier lacks, and where two sources give a different count, a conflict said to be settled',
    settings: [{ key: 'id', label: 'Its id', type: 'text', default: 'compiled' }, { key: 'name', label: 'What it is of', type: 'text', default: 'compiled research' }],
    ports: { inputs: [P('references', 'record', { many: true })], outputs: [P('reference', 'record'), P('tree', 'list<text>'), P('conflicts', 'list<text>'), P('says', 'text')] },
    run: (i, c) => { const rs = asList(i.references).filter((r): r is Reference => !!r && typeof r === 'object' && Array.isArray((r as Reference).entries)); if (!rs.length) throw new Error('wire references in to compile');
      const m = mergeReferences(rs, String(c.set.id), String(c.set.name)); return { reference: m.reference, tree: referenceTree(m.reference), conflicts: m.conflicts, says: `${rs.length} compiled: ${m.reference.entries.length} entries, ${m.reference.sources.length} sources${m.conflicts.length ? `, ${m.conflicts.length} conflicts` : ''}` }; },
    tests: [{ inputs: { references: [{ id: 'a', name: 'a', sources: [{ key: 'S', url: 'https://example.org/a', title: 'a' }], entries: [{ id: 'p', name: 'plug', in: '', n: 4, finds: 'plug', source: 'S', level: 'typical', says: '' }] }, { id: 'b', name: 'b', sources: [{ key: 'S', url: 'https://example.org/b', title: 'b' }], entries: [{ id: 'p', name: 'plug', in: '', n: 6, finds: 'plug', source: 'S', level: 'typical', says: '' }] }] }, outputs: { conflicts: ['p: 4 by a.S against 6 by b.S'] } }] }),
  def({ id: 'research.toInventory', name: 'Into the inventory', kind: 'action', ability: 'store', pure: false, domains: ['mechanical', 'vehicles', 'manufacturing', 'everyday'], says: 'A reference entered in the inventory (filed under Researched), each of its parts an entry holding its own parts by count and saying its source: so it opens all the way down like anything stored, and what has nothing in it yet waits on the breakdown queue as the next research to do',
    settings: [{ key: 'dry', label: 'Only say what it would enter', type: 'boolean', default: false }],
    ports: { inputs: [P('reference', 'record')], outputs: [P('item', 'text', { label: 'its id' }), N('added'), P('refused', 'list<text>'), P('says', 'text')] },
    run: (i, c) => { const r = i.reference as Reference | undefined; if (!r || !Array.isArray(r.entries)) throw new Error('wire a reference in'); if (itemOf(r.id)) return { item: r.id, added: 0, refused: [], says: `${r.id} is in the inventory already` };
      if (c.set.dry) { const n = feedLinesOf(r).split('\n').length; return { item: r.id, added: 0, refused: [], says: `would enter ${n} entries under Researched/${r.id}` }; }
      const f = feed(feedLinesOf(r)); return { item: r.id, added: f.added.length, refused: f.refused, says: `${f.added.length} entries added under Researched/${r.id}${f.refused.length ? `; ${f.refused.length} refused: ${f.refused[0]}` : ''}` }; },
    tests: [{ set: { dry: true }, inputs: { reference: { id: 'zz-into-test', name: 'a test reference', sources: [], entries: [{ id: 'a', name: 'a part', in: '', n: 1, level: 'typical', says: 'x' }] } }, outputs: { item: 'zz-into-test', added: 0, says: 'would enter 2 entries under Researched/zz-into-test' } }] }),
  def({ id: 'research.parts', name: 'Its parts, and theirs', kind: 'calculator', ability: 'measure', domains: ['mechanical', 'vehicles', 'electrical', 'manufacturing', 'everyday'], says: 'An item in the inventory opened all the way down: its components, their sub-components and theirs, each with how many and how it is made or bought; and every one of them still waiting to be broken down, with why (not in the table; only its materials listed; nothing in it listed; several materials shaped in one)',
    settings: [{ key: 'item', label: 'Item (its id or words)', type: 'text', default: 'engine-ice' }, { key: 'depth', label: 'How deep', type: 'number', default: 6 }],
    ports: { inputs: [P('item', 'text', { optional: true, label: 'item (its id), else the setting' })], outputs: [P('rows', 'table'), P('tree', 'list<text>'), P('waiting', 'table'), N('deepest'), P('says', 'text')] },
    run: (i, c) => { const words = String(i.item ?? c.set.item ?? ''), it = itemOf(words) ?? findItem(words); if (!it) throw new Error(`nothing in the inventory called "${words}"`);
      const most = Math.max(1, Math.round(Number(c.set.depth ?? 6))), rows: Record<string, unknown>[] = [], waiting: Record<string, unknown>[] = [], seen = new Set<string>();
      const walk = (id: string, depth: number, n: number, on: Set<string>) => { const x = itemOf(id); if (on.has(id)) return;
        if (!x) { waiting.push({ id, in: [...on].pop() ?? '', why: 'not in the table' }); return; }
        rows.push({ depth, part: `${'· '.repeat(depth)}${x.name}`, id, n, kind: x.kind, made: x.make });
        if (!seen.has(id)) { seen.add(id); const why = judge(x, (y) => itemOf(y) ?? x.inner?.find((z) => z.id === y)); if (why) waiting.push({ id, in: [...on].pop() ?? '', why }); }
        if (depth < most && x.kind !== 'material' && x.kind !== 'element') for (const ch of x.of) walk(ch.id, depth + 1, n * ch.n, new Set(on).add(id)); };
      walk(it.id, 0, 1, new Set());
      const deepest = Math.max(...rows.map((r) => r.depth as number));
      return { rows, tree: treeLines(it.id, 200), waiting, deepest, says: `${it.name}: ${rows.length} things in it to ${deepest} levels; ${waiting.length} waiting to be broken down${waiting.length ? ` (${waiting.slice(0, 4).map((w) => `${w.id}: ${w.why}`).join('; ')})` : ''}` }; },
    tests: [{ inputs: {}, set: { item: 'engine-ice', depth: 2 }, outputs: { deepest: 2 } }] }),
  def({ id: 'research.gap', name: 'What is missing', kind: 'critic', ability: 'check', domains: ['mechanical', 'vehicles', 'electrical', 'manufacturing', 'everyday'], says: 'A drawn thing held against its researched reference: every part the sources name looked for among the drawn pieces by its pattern (a part\'s parts inside what found it), each drawn, short of its count, missing, or drawn the way the sources say it is not (a belt-driven pump where the pump is electric). Its coverage, and the missing in the order of the tree, the work list to bridge it',
    ports: { inputs: [thing(), P('reference', 'record')], outputs: [P('rows', 'table'), N('coverage', undefined, { label: 'share drawn' }), P('missing', 'list<text>'), P('wrong', 'list<text>'), P('says', 'text')] },
    run: (i) => { const r = i.reference as Reference | undefined; if (!r || !Array.isArray(r.entries)) throw new Error('wire a reference in (Researched reference, or Research notes)');
      const g = gapOf(asPart(asThing(i.thing)), r);
      return { rows: g.rows.map((x) => ({ part: `${'· '.repeat(x.depth)}${x.name}`, system: x.system, want: x.want, have: x.have, is: x.status, level: x.level, source: x.source ?? '', says: x.says })), coverage: g.coverage, missing: g.missing.map((x) => `${x.system}: ${x.name} (${x.want})`), wrong: g.wrong.map((x) => `${x.name}: ${x.says}`), says: g.says }; },
    tests: [{ inputs: { thing: { name: 'plug', parts: [{ name: 'spark plug', shape: { cyl: [0.007, 0.05] }, mat: 'steel-low' }] }, reference: { id: 'r', name: 'r', sources: [], entries: [{ id: 'p', name: 'spark plug', in: '', n: 1, finds: '^spark plug$', level: 'typical', says: '' }, { id: 'c', name: 'coil', in: '', n: 1, finds: 'coil', level: 'typical', says: '' }] } }, outputs: { coverage: 0.5 } }] }),
  def({ id: 'check.fidelity', name: 'How finely is it made?', kind: 'critic', ability: 'check', domains: ['mechanical', 'vehicles', 'manufacturing', 'everyday'], says: 'A drawn thing measured for how finely it is made: its pieces and kinds; how many, and how much of it, are still plain boxes (a casting drawn as a slab wants its ribs, bosses and fillets); how many are shaped (turned, lofted, extruded, bent); its fasteners and holes; how much has its surface finish said; and its biggest boxes, the first to reshape',
    ports: { inputs: [thing()], outputs: [N('pieces'), N('boxShare', undefined, { label: 'share of pieces that are boxes' }), N('boxVolume', undefined, { label: 'share of volume in boxes' }), N('shaped'), N('fasteners'), P('biggest', 'table', { label: 'biggest boxes' }), P('says', 'text')] },
    run: (i) => { const f = fidelityOf(asPart(asThing(i.thing))); return { pieces: f.pieces, boxShare: f.boxShare, boxVolume: f.boxVolume, shaped: f.shaped, fasteners: f.fasteners, biggest: f.biggestBoxes, says: f.says }; },
    tests: [{ inputs: { thing: { name: 'two', parts: [{ name: 'slab', shape: { box: [1, 1, 1] } }, { name: 'rod', shape: { cyl: [0.1, 1] } }] } }, outputs: { pieces: 2, boxShare: 0.5 } }] }),
  // ---- the gauntlet: what a node (or an entry) must come through to be approved; the unknown queue, sorted and
  // researched in a loop; and the nodes that work it (src/nexus/gauntlet.ts) ------------------------------------------------
  def({ id: 'gauntlet.candidates', name: 'Candidates', kind: 'input', ability: 'store', pure: false, domains: ['software', 'mechanical', 'manufacturing', 'everyday'], says: 'What is put through the gauntlet: blocks of the library (all, of a kind or a field, or made by you), or entries of the inventory (under a path, or yours), or named ones. Each said as block:id or item:id',
    settings: [{ key: 'from', label: 'From', type: 'choice', default: 'library', choices: ['library', 'inventory'] }, { key: 'kind', label: 'Of the kind', type: 'text', default: '' }, { key: 'domain', label: 'In the field', type: 'text', default: '' }, { key: 'path', label: 'Under the path (inventory)', type: 'text', default: '' }, { key: 'by', label: 'Made by (you, claude, built in)', type: 'text', default: '' }, { key: 'ids', label: 'Only these ids (space between)', type: 'text', default: '' }, { key: 'most', label: 'At most', type: 'number', default: 20 }],
    ports: { inputs: [], outputs: [P('candidates', 'list<text>'), N('count'), P('rows', 'table')] },
    run: (_i, c) => { const ids = String(c.set.ids ?? '').split(/[\s,]+/).filter(Boolean), cs = candidatesOf(GLIB, { from: c.set.from === 'inventory' ? 'inventory' : 'library', ...(c.set.kind ? { kind: String(c.set.kind) } : {}), ...(c.set.domain ? { domain: String(c.set.domain) } : {}), ...(c.set.path ? { path: String(c.set.path) } : {}), ...(c.set.by ? { by: String(c.set.by) } : {}), ...(ids.length ? { ids } : {}), most: Number(c.set.most ?? 20) });
      return { candidates: cs.map((x) => `${x.kind}:${x.id}`), count: cs.length, rows: cs.map((x) => ({ candidate: `${x.kind}:${x.id}`, name: x.name })) }; },
    tests: [{ inputs: {}, set: { ids: 'law.stress.axial' }, outputs: { count: 1, candidates: ['block:law.stress.axial'] } }] }),
  def({ id: 'gauntlet.run', name: 'Run the gauntlet', kind: 'critic', ability: 'check', pure: false, domains: ['software', 'mechanical', 'manufacturing', 'everyday'], says: 'Every candidate through the gates chosen (all if none, one for a single gate), each where it applies, cheapest first: approved only when none fails. Each verdict kept (Approved reads them); what each wants that nothing knows goes to the unknown queue',
    settings: [{ key: 'gates', label: 'Gates (all if empty; space between)', type: 'text', default: '' }, { key: 'stop', label: 'Stop at the first that fails', type: 'boolean', default: false }],
    ports: { inputs: [P('candidates', 'list<text>')], outputs: [P('approved', 'list<text>'), P('rejected', 'list<text>'), P('rows', 'table'), N('share', undefined, { label: 'share approved' }), N('unknowns', undefined, { label: 'found unknown' }), P('says', 'text')] },
    run: async (i, c) => { const gs = String(c.set.gates ?? '').split(/\s+/).filter((g): g is GateId => (GATES as readonly string[]).includes(g)), vs = await runGauntlet(GLIB, candOf(i.candidates), { ...(gs.length ? { gates: gs } : {}), stop: !!c.set.stop });
      const ok = vs.filter((v) => v.approved);
      return { approved: ok.map((v) => `${v.cand.kind}:${v.cand.id}`), rejected: vs.filter((v) => !v.approved).map((v) => `${v.cand.kind}:${v.cand.id}`), rows: vs.map((v) => ({ candidate: v.cand.name, verdict: v.approved ? 'approved' : 'REJECTED', ...Object.fromEntries(v.results.map((r) => [r.gate, r.pass === null ? '—' : r.pass ? 'yes' : 'NO'])), why: v.results.filter((r) => r.pass === false).map((r) => `${r.gate}: ${r.says}`).join('; ') })), share: vs.length ? ok.length / vs.length : 0, unknowns: vs.reduce((a, v) => a + v.results.reduce((b, r) => b + (r.unknowns?.length ?? 0), 0), 0), says: `${ok.length} of ${vs.length} approved${gs.length === 1 ? ` by ${gs[0]}` : ''}` }; },
    tests: [{ inputs: { candidates: ['block:law.stress.axial'] }, set: { gates: 'documented tests sourced' }, outputs: { approved: ['block:law.stress.axial'] } }, { inputs: { candidates: ['block:law.stress.axial'] }, set: { gates: 'documented' }, outputs: { approved: ['block:law.stress.axial'] } }] }),
  def({ id: 'gauntlet.approved', name: 'Approved', kind: 'card', ability: 'store', pure: false, domains: ['software', 'everyday'], says: 'What has come through the gauntlet so far (read from its verdicts), and what was turned back and why', clock: true,
    ports: { inputs: [P('after', 'any', { optional: true, label: 'run after this (wire the gauntlet in)' }), P('only', 'list<text>', { optional: true, label: 'only these candidates' })], outputs: [P('approved', 'list<text>'), P('rejected', 'table'), N('count')] },
    run: (i) => { const only = new Set(asList(i.only).map(String)), vs = allVerdicts().filter((v) => !only.size || only.has(`${v.cand.kind}:${v.cand.id}`)); return { approved: vs.filter((v) => v.approved).map((v) => `${v.cand.kind}:${v.cand.id}`), rejected: vs.filter((v) => !v.approved).map((v) => ({ candidate: v.cand.name, failed: v.failed.join(', ') })), count: vs.filter((v) => v.approved).length }; },
    tests: [{ inputs: { only: ['block:zz-none'] }, outputs: { count: 0, approved: [] } }] }),
  def({ id: 'read', name: 'Read', kind: 'card', ability: 'store', domains: ['software', 'manufacturing', 'everyday'], says: 'A block of the library or an entry of the inventory read as it is (block:… or item:…, or either by its id or words): a block\'s ports, settings, tests and sources; an entry\'s place, make and what is in it',
    settings: [{ key: 'id', label: 'Its id (block:… or item:…) or words', type: 'text', default: 'law.stress.axial' }, { key: 'kind', label: 'Read as', type: 'choice', default: 'either', choices: ['either', 'block', 'item'] }],
    ports: { inputs: [P('id', 'text', { optional: true })], outputs: [P('card', 'record'), P('ports', 'table'), N('tests'), P('contents', 'table'), P('says', 'text')] },
    run: (i, c) => { const raw = String(i.id ?? c.set.id), as = raw.startsWith('block:') ? 'block' : raw.startsWith('item:') ? 'item' : String(c.set.kind ?? 'either'), id = raw.replace(/^(block|item):/, '');
      const b = as !== 'item' ? LIBRARY.get(id) : undefined;
      if (b) { const ps = portsOf(b, defaultsOf(b)); return { card: { id: b.id, name: b.name, kind: b.kind, ability: b.ability, domains: b.domains, by: b.by, pure: b.pure, sources: (b.sources ?? []).map((s) => s.cite) }, ports: [...ps.inputs.map((p) => ({ side: 'in', name: p.name, type: p.type, unit: p.unit ?? '' })), ...ps.outputs.map((p) => ({ side: 'out', name: p.name, type: p.type, unit: p.unit ?? '' }))], tests: b.tests?.length ?? 0, says: b.says }; }
      const it = as !== 'block' ? itemOf(id) ?? findItem(id) : undefined;
      if (it) return { card: { id: it.id, name: it.name, path: it.path.join('/'), kind: it.kind, make: it.make, yours: !!it.yours }, contents: it.of.map((x) => ({ id: x.id, n: x.n, name: itemOf(x.id)?.name ?? '(not in the table)' })), says: it.says };
      throw new Error(as === 'block' ? `no block "${id}" in the library` : as === 'item' ? `nothing in the inventory called "${id}"` : `no block or entry "${id}"`); },
    tests: [{ inputs: {}, outputs: { card: { id: 'law.stress.axial' } } }, { set: { id: 'engine-ice', kind: 'item' }, inputs: {}, outputs: { card: { id: 'engine-ice' } } }, { set: { id: 'item:engine-ice' }, inputs: {}, outputs: { card: { id: 'engine-ice' } } }] }),
  def({ id: 'pass', name: 'Pass', kind: 'logic', ability: 'decide', domains: ['software', 'everyday'], says: 'A gate on a wire: what comes in goes on out of passed while the condition holds, else it is held (out of held) and what follows passed waits',
    ports: { inputs: [P('value', 'any'), P('when', 'boolean')], outputs: [P('passed', 'any'), P('held', 'any')] },
    run: (i) => (i.when ? { passed: i.value } : { held: i.value }),
    tests: [{ inputs: { value: 3, when: true }, outputs: { passed: 3 } }, { inputs: { value: 3, when: false }, outputs: { held: 3 } }] }),
  def({ id: 'task', name: 'Task', kind: 'action', ability: 'act', pure: false, domains: ['operations', 'everyday', 'software'], sink: true, says: 'A task on the board: what is to be done, and done when what it waits on holds (wire in a gate\'s count, an approval, a check). Or, set to list, every task the gauntlet has now: research a cluster, confirm an inferred entry, fix what was turned back',
    settings: [{ key: 'title', label: 'Task', type: 'text', default: 'get it approved' }, { key: 'list', label: 'List the gauntlet\'s tasks', type: 'boolean', default: false }],
    ports: { inputs: [P('done', 'boolean', { optional: true, label: 'done when' })], outputs: [P('status', 'text'), P('isDone', 'boolean'), P('tasks', 'table'), N('open')] },
    run: (i, c) => { const ts = c.set.list ? tasksNow() : [{ id: 'task', title: String(c.set.title), kind: 'fix' as const, done: !!i.done, says: '' }], open = ts.filter((t) => !t.done).length;
      return { status: c.set.list ? `${open} open of ${ts.length}` : `${i.done ? 'done' : 'open'}: ${c.set.title}`, isDone: !open, tasks: ts.map((t) => ({ task: t.title, kind: t.kind, done: t.done ? 'yes' : '', says: t.says })), open }; },
    tests: [{ inputs: { done: true }, outputs: { isDone: true } }] }),
  def({ id: 'on.event', name: 'When…', kind: 'trigger', ability: 'connect', pure: false, clock: true, domains: ['software', 'everyday', 'operations'], says: 'Listens for what happens in the gauntlet: something approved, rejected, queued as unknown, resolved, proposed, deleted, or a round of the research loop ended. Gives each since the board started (or since a number), the last, and how many; a page that runs the gauntlet runs this again as they happen',
    settings: [{ key: 'kind', label: 'When', type: 'choice', default: 'approved', choices: ['any', 'approved', 'rejected', 'queued', 'resolved', 'proposed', 'deleted', 'round'] }, { key: 'since', label: 'Since event number', type: 'number', default: 0 }],
    ports: { inputs: [P('after', 'any', { optional: true, label: 'listen after this ran' })], outputs: [P('events', 'table'), N('count'), P('last', 'text'), P('fired', 'event')] },
    run: (_i, c) => { const es = eventsSince(Number(c.set.since ?? 0), c.set.kind === 'any' ? undefined : (String(c.set.kind) as EventKind)); return { events: es.slice(-50).map((e) => ({ n: e.n, kind: e.kind, id: e.id, says: e.says })), count: es.length, last: es[es.length - 1]?.says ?? '', fired: es.length ? { n: es[es.length - 1]!.n } : undefined }; },
    tests: [{ inputs: {}, set: { kind: 'any', since: 1e12 }, outputs: { count: 0, last: '' } }] }),
  def({ id: 'unknown.queue', name: 'Unknown library queue', kind: 'card', ability: 'store', pure: false, domains: ['manufacturing', 'mechanical', 'everyday'], says: 'Everything something wants that nothing knows: not in the table, listed only as its materials, nothing in it listed, or drawn as one piece though it is made of parts. Each with what wants it, the most wanted first; from what the gauntlet found, from under the roots wired in, and any ids wired in. Sorted into clusters by what their members share (the kind of thing each is, by how it is made, so one maker node makes a cluster), the most wanted cluster first',
    settings: [{ key: 'roots', label: 'And under these entries (space between)', type: 'text', default: '' }],
    ports: { inputs: [P('roots', 'list<text>', { optional: true }), P('only', 'list<text>', { optional: true, label: 'these only (else the whole queue)' }), P('after', 'any', { optional: true, label: 'read after this ran' })], outputs: [P('unknowns', 'table'), N('count'), P('ids', 'list<text>'), N('fromRoots', undefined, { label: 'unknown under the roots' }), P('clusters', 'table'), N('clusterCount', undefined, { label: 'clusters' }), P('first', 'text', { label: 'research this first' })] },
    run: (i, c) => { const roots = [...asList(i.roots).map(String), ...String(c.set.roots ?? '').split(/\s+/)].map((x) => x.replace(/^item:/, '')).filter(Boolean), extra = roots.length ? unknownsUnder(roots, 'the roots') : [];
      const all = new Map(unknownQueue().map((u) => [u.id, u])); for (const u of extra) if (!all.has(u.id)) all.set(u.id, u);
      const want = new Set(asList(i.only).map(String)); for (const id of want) if (!all.has(id)) all.set(id, { id, why: 'not in the table', wantedBy: [], words: wordsOf(id) });
      const us = [...all.values()].filter((u) => !want.size || want.has(u.id)).sort((a, b) => b.wantedBy.length - a.wantedBy.length), cls = sortUnknowns(us);
      return { unknowns: us.map((u) => ({ id: u.id, why: u.why, wanted: u.wantedBy.length, by: u.wantedBy.slice(0, 3).join(', ') })), count: us.length, ids: us.map((u) => u.id), fromRoots: extra.length,
        clusters: cls.map((k) => ({ cluster: k.key, members: k.members.length, wanted: k.demand, maker: k.maker, ids: k.members.slice(0, 6).map((m) => m.id).join(' ') })), clusterCount: cls.length, first: cls[0] ? `${cls[0].key}: ${cls[0].members.length} things wanted ${cls[0].demand} times; ${cls[0].maker ? `made by ${cls[0].maker}` : cls[0].says}` : 'nothing unknown' }; },
    tests: [{ inputs: {}, set: { roots: 'zz-nothing-here engine-ice' }, outputs: { fromRoots: 1 } }, { inputs: { only: ['oil-pressure-switch', 'knock-sensor', 'coil-gasket'] }, outputs: { clusterCount: 2 } }] }),
  def({ id: 'research.loop', name: 'Research loop (to the bottom)', kind: 'solver', ability: 'solve', pure: false, domains: ['manufacturing', 'mechanical', 'everyday'], says: 'From the roots down, round after round, until nothing more is found: what is unknown under them is sorted, the most wanted clusters first, and each resolved by a family that makes that size, a researched reference, the drawing that draws it (wire in what is drawn: its parts and their materials read back), the web (where the page can reach it), or a known sibling (said as inferred, to be confirmed). What is resolved is gone down in its turn: components, their sub-components, theirs. Then, set to, the sourced proposals fed into the inventory',
    settings: [{ key: 'roots', label: 'Roots (entries, space between)', type: 'text', default: '' }, { key: 'rounds', label: 'At most so many rounds', type: 'number', default: 12 }, { key: 'feed', label: 'Feed the sourced proposals in', type: 'boolean', default: false }, { key: 'web', label: 'Ask the web (Wikidata)', type: 'boolean', default: false }, { key: 'keep', label: 'Keep what is left on the unknown queue', type: 'boolean', default: true }],
    ports: { inputs: [P('roots', 'list<text>', { optional: true }), thing('drawing', 'what is drawn (optional)')].map((p) => ({ ...p, optional: true })), outputs: [P('rounds', 'table'), N('left', undefined, { label: 'still unknown' }), P('clusters', 'table'), P('proposals', 'table'), P('fixed', 'boolean', { label: 'reached a fixed point' }), P('says', 'text')] },
    run: async (i, c) => {
      const drawing = i.drawing && (isPart(i.drawing) || isAssembly(i.drawing)) ? asPartTree(asThing(i.drawing)) : undefined, roots = [...asList(i.roots).map(String), ...String(c.set.roots ?? '').split(/\s+/)].map((x) => x.replace(/^item:/, '')).filter(Boolean);
      const found = new Set<string>(); if (drawing) { const w = (p: Part) => { if (p.item) found.add(p.item); for (const q of p.parts ?? []) w(q); }; w(drawing); }
      const rs = [...new Set([...roots, ...(roots.length ? [] : [...found])])]; if (!rs.length) throw new Error('give it roots (entries) or wire in something drawn');
      const r = await researchLoop(rs, { ...(drawing ? { drawing: [drawing] } : {}), ...(c.set.web ? { web: webResolver((q) => webParts(q)) } : {}) }, { rounds: Number(c.set.rounds ?? 12), by: drawing?.name ?? 'the roots', keep: c.set.keep !== false });
      const fed = c.set.feed ? approveProposals() : null;
      return { rounds: r.rounds.map((x) => ({ round: x.round, unknown: x.unknowns, clusters: x.clusters, family: x.resolved.family, table: x.resolved.table, reference: x.resolved.reference, drawn: x.resolved.drawn, web: x.resolved.web, inferred: x.resolved.inferred, left: x.left })), left: r.left.length, clusters: r.clusters.map((cl) => ({ cluster: cl.key, members: cl.members.length, wanted: cl.demand, maker: cl.maker })), proposals: proposalsAll().map((p) => ({ id: p.id, level: p.level, from: p.from, of: p.of.map((x) => x.id).join(' ') })), fixed: r.fixed || !r.left.length,
        says: `${r.rounds.length} round${r.rounds.length === 1 ? '' : 's'}; ${r.left.length} still unknown${r.fixed ? ' (a fixed point: nothing more to find this way)' : ''}${fed ? `; ${fed.added} entries fed in${fed.refused.length ? `, ${fed.refused.length} refused` : ''}` : ''}` }; },
    tests: [{ inputs: {}, set: { roots: 'zzqx-vvkq', keep: false }, outputs: { left: 1, fixed: true } }] }),
  def({ id: 'gauntlet.feed', name: 'Feed the proposals in', kind: 'action', ability: 'store', pure: false, domains: ['manufacturing', 'everyday'], says: 'The proposals with a source (read off a drawing, a reference, or the web) entered in the inventory, what each holds first; the inferred stay proposed until a source confirms them',
    ports: { inputs: [P('ids', 'list<text>', { optional: true, label: 'these proposals (else every sourced one)' }), P('after', 'any', { optional: true, label: 'after this ran' })], outputs: [N('added'), P('refused', 'list<text>'), P('says', 'text')] },
    run: (i) => { const r = approveProposals(['drawn', 'web'], i.ids === undefined ? undefined : asList(i.ids).map(String)); return { added: r.added, refused: r.refused, says: `${r.added} entered${r.refused.length ? `; ${r.refused.length} refused: ${r.refused[0]}` : ''}` }; },
    tests: [{ inputs: { ids: [] }, outputs: { added: 0, refused: [] } }] }),
  def({ id: 'search.library', name: 'Search what is known', kind: 'card', ability: 'store', pure: false, domains: ['software', 'everyday', 'manufacturing'], says: 'Words looked for through the library\'s blocks, the inventory\'s entries and the researched references: each match with where it is and what it says',
    settings: [{ key: 'q', label: 'Look for', type: 'text', default: 'sensor' }, { key: 'most', label: 'At most', type: 'number', default: 30 }],
    ports: { inputs: [P('q', 'text', { optional: true })], outputs: [P('rows', 'table'), N('count')] },
    run: (i, c) => { const q = String(i.q ?? c.set.q ?? '').toLowerCase().trim(); if (!q) throw new Error('give it words to look for'); const ws = q.split(/\s+/), hit = (t: string) => ws.every((w) => t.toLowerCase().includes(w)), most = Number(c.set.most ?? 30);
      const rows = [...[...LIBRARY.values()].filter((b) => hit(`${b.id} ${b.name} ${b.says}`)).map((b) => ({ where: 'block', id: b.id, name: b.name, says: b.says.slice(0, 120) })), ...[...INVENTORY.values()].filter((x) => hit(`${x.id} ${x.name} ${x.says}`)).map((x) => ({ where: 'inventory', id: x.id, name: x.name, says: x.says.slice(0, 120) })), ...Object.keys(REFERENCE_NOTES).flatMap((rid) => (referenceOf(rid)?.reference.entries ?? []).filter((e) => hit(`${e.id} ${e.name} ${e.says}`)).map((e) => ({ where: `reference ${rid}`, id: e.id, name: e.name, says: e.says.slice(0, 120) })))].slice(0, most);
      return { rows, count: rows.length }; },
    tests: [{ inputs: { q: 'zz no such words anywhere' }, outputs: { count: 0, rows: [] } }] }),
  def({ id: 'search.web', name: 'Search the web (Wikidata)', kind: 'card', ability: 'ask', pure: false, domains: ['everyday', 'mechanical', 'manufacturing'], says: 'What Wikidata says a thing has as its parts and is made from: its entity found by its words, its "has part(s)" and "made from material" read, its address the source. A real request; where the page cannot reach the web it says so and gives nothing',
    settings: [{ key: 'q', label: 'Look for', type: 'text', default: 'internal combustion engine' }],
    ports: { inputs: [P('q', 'text', { optional: true })], outputs: [P('parts', 'list<text>'), P('materials', 'list<text>'), P('source', 'text'), P('says', 'text')] },
    run: async (i, c) => { const q = String(i.q ?? c.set.q ?? '').trim(); if (!q) throw new Error('give it words to look for'); let w: WebParts; try { w = await webParts(q); } catch (e) { throw new Error(`the web cannot be reached from here, or answered no (${(e as Error).message}): nothing is made up in its place`); }
      return { parts: w.parts.map((p) => p.label), materials: w.materials.map((m) => m.label), source: w.url, says: `${w.label} (${w.description}): ${w.parts.length} parts, ${w.materials.length} materials, from ${w.url}` }; } }),
  def({ id: 'test.block', name: 'Tester', kind: 'critic', ability: 'check', pure: false, domains: ['software', 'everyday'], says: 'A block of the library put to its own tests, then pushed far from its defaults (zero, a thousandth, a thousand times, negative): each failure and each crash said, and whether it answered or refused in words',
    settings: [{ key: 'id', label: 'Block (its id)', type: 'text', default: 'law.stress.axial' }],
    ports: { inputs: [P('id', 'text', { optional: true })], outputs: [P('ok', 'boolean'), P('rows', 'table'), P('says', 'text')] },
    run: async (i, c) => { const id = String(i.id ?? c.set.id).replace(/^block:/, ''); if (!LIBRARY.has(id)) throw new Error(`no block "${id}"`); const [v] = await runGauntlet(GLIB, [{ id, kind: 'block', name: LIBRARY.get(id)!.name }], { gates: ['tests', 'robust'] });
      return { ok: v!.approved, rows: v!.results.map((r) => ({ test: r.gate, is: r.pass === null ? 'does not apply' : r.pass ? 'passes' : 'FAILS', says: r.says })), says: v!.results.map((r) => `${r.gate}: ${r.says}`).join('; ') }; },
    tests: [{ inputs: {}, outputs: { ok: true } }] }),
  def({ id: 'delete', name: 'Delete', kind: 'action', ability: 'act', pure: false, domains: ['software', 'everyday'], says: 'Takes something out: a block you (or Claude) made, an entry you fed, a proposal, an unknown off the queue. Never what is built in or seeded (fix those). Only says what it would do until told to do it',
    settings: [{ key: 'what', label: 'What', type: 'choice', default: 'block', choices: ['block', 'item', 'proposal', 'unknown'] }, { key: 'really', label: 'Do it (else only say)', type: 'boolean', default: false }],
    ports: { inputs: [P('ids', 'list<text>')], outputs: [N('taken', undefined, { label: 'taken out (or would be)' }), P('rows', 'table')] },
    run: (i, c) => { const rows = asList(i.ids).map(String).map((id) => { const r = deleteThing(GLIB, { kind: String(c.set.what) as 'block', id: id.replace(/^(block|item):/, '') }, !!c.set.really); return { id, ok: r.ok ? 'yes' : 'no', says: r.says }; }); return { taken: rows.filter((r) => r.ok === 'yes').length, rows }; },
    tests: [{ inputs: { ids: ['law.stress.axial'] }, outputs: { taken: 0 } }] }),
  def({ id: 'make.sensor', name: 'Sensor', kind: 'generator', ability: 'generate', domains: ['manufacturing', 'electrical', 'mechanical', 'vehicles'], says: 'Any sensor as it is made, from one node: a threaded probe (hex, thread, sealing ring, its element in its tip: a temperature sender, a pressure switch, an oxygen sensor), a puck bolted through its middle (a knock sensor: its piezo ring under a seismic mass), or a block on a lug (a Hall position sensor, a pressure sensor); its element by what it senses; its pins and its plug\'s shroud. One node for a whole cluster of unknown sensors',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'sensor' }, { key: 'body', label: 'Body', type: 'choice', default: 'threaded', choices: ['threaded', 'puck', 'block'] }, { key: 'element', label: 'Senses by', type: 'choice', default: 'thermistor', choices: Object.keys(SENSES) }, { key: 'item', label: 'It is (inventory item)', type: 'text', default: '' }],
    ports: { inputs: [L('D', 0.019, 'across (a probe\'s hex, a puck, a block)'), L('L', 0.04, 'tall'), N('pins', undefined, { default: 2, optional: true })], outputs: [P('sensor', 'part'), N('mass', 'kg')] },
    run: (i, c) => { const D = Number(i.D ?? 0.019), L0 = Number(i.L ?? 0.04); if (!(D > 0.004 && L0 > 0.008)) throw new Error('a sensor at least 4 mm across and 8 mm tall'); const p = sensor({ name: String(c.set.name), body: String(c.set.body) as SensorBody, element: String(c.set.element) as SensorElement, D, L: L0, pins: Math.max(1, Math.round(Number(i.pins ?? 2))), ...(c.set.item ? { item: String(c.set.item) } : {}) }); return { sensor: p, mass: massOf(p) }; },
    tests: [{ inputs: {}, set: { body: 'puck', element: 'piezo' }, outputs: { sensor: { made: { body: 'puck' } } } }] }),
  def({ id: 'make.fastener', name: 'Fastener (any)', kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'everyday', 'structural'], says: 'Any bolt, screw, stud, rivet or pin from one node: its head (a polygon of 4, 6 or 8 sides, round, pan, button, countersunk, flanged or none), its drive, its shank, its thread drawn as a helix to its pitch, its point; a rivet set at its grip. A metric size reads its pitch and head from ISO 261 and 4017',
    settings: [{ key: 'kind', label: 'What it is', type: 'choice', default: 'bolt', choices: ['bolt', 'screw', 'stud', 'rivet', 'pin'] }, { key: 'head', label: 'Head', type: 'choice', default: 'hex', choices: ['hex', 'square', 'octagon', 'round', 'pan', 'button', 'countersunk', 'flange', 'none'] }, { key: 'drive', label: 'Drive', type: 'choice', default: 'none', choices: ['none', 'hex socket', 'square socket', 'star', 'cross', 'slot'] }, { key: 'point', label: 'Point', type: 'choice', default: 'chamfer', choices: ['chamfer', 'flat', 'cone', 'dog'] }, { key: 'thread', label: 'Thread drawn as', type: 'choice', default: 'helix', choices: ['helix', 'plain'] }, { key: 'mat', label: 'Material', type: 'choice', default: 'steel-alloy', choices: ENGINEERING }],
    ports: { inputs: [L('d', 0.008, 'diameter'), L('L', 0.04, 'length'), L('pitch', 0, 'pitch (0: its ISO coarse pitch)'), L('threadL', 0, 'thread length (0: ISO\'s)'), L('s', 0, 'head across (0: ISO\'s)'), L('k', 0, 'head height (0: ISO\'s)'), L('grip', 0, 'a rivet\'s grip')], outputs: [P('fastener', 'part'), N('mass', 'kg'), N('pieces')] },
    run: (i, c) => { const d = Number(i.d ?? 0.008), iso = METRIC[`M${+(d * 1000).toFixed(1)}`.replace(/\.0$/, '')], kind = String(c.set.kind) as NonNullable<FastenerSpec['kind']>, head = String(c.set.head) as HeadShape;
      const pitch = Number(i.pitch ?? 0) || (iso && kind !== 'rivet' && kind !== 'pin' ? iso.p / 1000 : undefined), s = Number(i.s ?? 0) || (iso && (head === 'hex' || head === 'flange') ? iso.s / 1000 : undefined), k = Number(i.k ?? 0) || undefined;
      const p = fastener({ kind, head, drive: String(c.set.drive) as 'none', point: String(c.set.point) as 'chamfer', thread: String(c.set.thread) as 'helix', mat: String(c.set.mat), d, L: Number(i.L ?? 0.04), ...(pitch ? { pitch } : {}), ...(Number(i.threadL) ? { threadL: Number(i.threadL) } : {}), ...(s ? { s } : {}), ...(k ? { k } : {}), ...(Number(i.grip) ? { grip: Number(i.grip) } : {}) });
      return { fastener: p, mass: massOf(p), pieces: p.parts!.length }; },
    tests: [{ inputs: { d: 0.008, L: 0.04 }, outputs: { pieces: 4 } }, { set: { kind: 'rivet', head: 'button' }, inputs: { d: 0.005, L: 0.012, grip: 0.008 }, outputs: { pieces: 3 } }] }),
  def({ id: 'onto', name: 'Onto a shaft', kind: 'logic', ability: 'connect', domains: ['mechanical', 'manufacturing', 'vehicles'], says: 'A part with a bore slid onto a round piece of another, their axes made one: a sprocket onto a cam\'s nose, a bearing onto its shaft, a pulley onto a crank. Its place is where it sits along the shaft, not coordinates typed in; its fit is what the bore and the shaft measure (a clearance it slides on with, or an interference it is pressed on with); a bore too small will not go on',
    settings: [{ key: 'shaft', label: 'The shaft (named like)', type: 'text', default: 'nose|shaft|axle' }, { key: 'from', label: 'Measured from its', type: 'choice', default: 'end', choices: ['end', 'start'] }],
    ports: { inputs: [P('on', 'part', { label: 'what has the shaft' }), P('it', 'part', { label: 'what goes on it' }), L('inset', 0, 'from that end to its middle'), N('turn', 'deg', { default: 0, optional: true, label: 'turned about the shaft' })], outputs: [P('both', 'part'), P('placed', 'part'), L('gap', 0, 'clearance across (− interference)'), P('fit', 'text')] },
    run: (i, c) => { const on = i.on as Part, it = i.it as Part; if (!isPart(on) || !isPart(it)) throw new Error('a part goes onto a part'); let re: RegExp; try { re = new RegExp(String(c.set.shaft), 'i'); } catch { throw new Error(`"${c.set.shaft}" is not a pattern`); }
      const r = onto(on, re, it, { from: c.set.from === 'start' ? 'start' : 'end', inset: Number(i.inset ?? 0), turn: (Number(i.turn ?? 0) * Math.PI) / 180 }); if (typeof r === 'string') throw new Error(r);
      return { both: { name: `${on.name} with ${it.name}`, at: [0, 0, 0] as [number, number, number], parts: [on, r.part] }, placed: r.part, gap: 2 * r.gap, fit: r.says }; },
    tests: [{ set: { shaft: 'nose' }, inputs: { on: { name: 'shaft', parts: [{ name: 'nose', shape: { cyl: [0.01, 0.1] }, mat: 'steel-alloy' }] }, it: { name: 'wheel', parts: [{ name: 'hub', shape: { lathe: [[0.01, 0], [0.03, 0], [0.03, 0.02], [0.01, 0.02], [0.01, 0]] }, mat: 'steel-low' }] }, inset: 0.01 }, outputs: { gap: 0, placed: { at: [0, 0.03, 0] } }, rel: 1e-6 }] }),
  def({ id: 'bore', name: 'Bore where it passes', kind: 'logic', ability: 'transform', domains: ['mechanical', 'manufacturing', 'structural'], says: 'A part bored wherever another runs through it: a hole along the other\'s line, as wide as it reaches and a clearance more, cut in each piece it passes and in no other (a pushrod\'s bore through a block, its gasket and its head; a bolt\'s through a plate). Its mass loses what is cut; the checker knows it passes',
    ports: { inputs: [P('host', 'part', { label: 'what is bored' }), P('guest', 'part', { label: 'what passes through it' }), L('clearance', 0.0005, 'clearance round it')], outputs: [P('bored', 'part'), N('holes'), N('mass', 'kg'), P('says', 'text')] },
    run: (i) => { const h = i.host as Part, g = i.guest as Part; if (!isPart(h) || !isPart(g)) throw new Error('a part is bored for a part'); const r = boreThrough(h, g, Number(i.clearance ?? 0.0005)); return { bored: r.part, holes: r.holes.length, mass: massOf(r.part), says: r.says }; },
    tests: [{ inputs: { host: { name: 'plate', shape: { box: [0.1, 0.01, 0.1] }, mat: 'steel-low' }, guest: { name: 'rod', shape: { cyl: [0.004, 0.1] }, mat: 'steel-low' }, clearance: 0.001 }, outputs: { holes: 1, mass: (0.0001 - Math.PI * 0.005 * 0.005 * 0.01) * 7850 }, rel: 1e-6 }] }),
  def({ id: 'piece', name: 'Take out a piece', kind: 'generator', ability: 'transform', domains: ['everyday', 'mechanical', 'manufacturing'], says: 'One piece of anything by its name (the first, or the nth, that matches): a valve spring out of an engine, a bolt out of a truck, a cell out of a battery. Wire it to a 3D view to see it close up, at its own size',
    settings: [{ key: 'name', label: 'Named like', type: 'text', default: 'valve spring' }, { key: 'nth', label: 'Which one (1 = the first)', type: 'number', default: 1 }, { key: 'where', label: 'Put', type: 'choice', default: 'on its own', choices: ['on its own', 'where it sits'] }],
    ports: { inputs: [thing('thing', 'what it is in')], outputs: [P('piece', 'assembly'), N('found', undefined, { label: 'how many there are' })] },
    run: (i, c) => { let re: RegExp; try { re = new RegExp(String(c.set.name), 'i'); } catch { throw new Error(`"${c.set.name}" is not a pattern`); }
      // (each found with where it sits in the whole: the turns and places of everything it is in, one after another)
      const hits: { x: Part | Assembly; m: THREE.Matrix4 }[] = [], local = (q: { at?: number[]; rot?: number[]; s?: number }) => new THREE.Matrix4().compose(new THREE.Vector3(...((q.at ?? [0, 0, 0]) as [number, number, number])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...((q.rot ?? [0, 0, 0]) as [number, number, number]))), new THREE.Vector3(q.s ?? 1, q.s ?? 1, q.s ?? 1));
      const walk = (x: Part | Assembly, m: THREE.Matrix4) => { if (re.test(x.name)) { hits.push({ x, m }); return; } if (isPart(x)) { for (const q of x.parts ?? []) walk(q, m.clone().multiply(local(q))); } else for (const it of x.items) walk(it.of, m.clone().multiply(local(it))); };
      const top = i.thing as Part | Assembly; walk(top, isPart(top) ? local(top) : new THREE.Matrix4()); const n = Math.max(1, Math.round(Number(c.set.nth ?? 1)));
      if (!hits.length) throw new Error(`nothing in it is named like "${c.set.name}"`); const h = hits[Math.min(hits.length, n) - 1]!;
      if (c.set.where === 'where it sits') { const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); h.m.decompose(p, q, sc); const e = new THREE.Euler().setFromQuaternion(q); return { piece: { name: h.x.name, items: [{ of: isPart(h.x) ? { ...h.x, at: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] } : h.x, at: [p.x, p.y, p.z], rot: [e.x, e.y, e.z], s: sc.x }] }, found: hits.length }; }
      return { piece: isPart(h.x) ? { ...h.x, at: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] } : h.x, found: hits.length }; },
    tests: [{ set: { name: 'b' }, inputs: { thing: { name: 'a', parts: [{ name: 'b', shape: { box: [1, 1, 1] }, at: [5, 0, 0] }] } }, outputs: { found: 1, piece: { name: 'b', at: [0, 0, 0] } } }] }),
  def({ id: 'space.show', name: 'Show in space', kind: 'view', ability: 'show', domains: ['everyday', 'mechanical', 'structural'], says: 'Puts a thing into the 3D space, at its place: everything wired into one of these is what the space draws',
    settings: [{ key: 'name', label: 'Name', type: 'text', default: 'shown' }],
    ports: { inputs: [thing()], outputs: [] }, run: () => ({}), sink: true, tests: [{ inputs: { thing: { name: 'b' } }, outputs: {} }] }),
];

for (const b of BUILT_IN) LIBRARY.set(b.id, b);
for (const b of BUILT_THINGS) LIBRARY.set(b.id, b);
for (const b of lawBlocks()) LIBRARY.set(b.id, b);
/** Blocks merged into one that does what they did and more (docs/PLACEMENT.md, section 13): each old id is the kept block
 *  with its settings preset (`set`), old setting keys moved to new ones (`keys`, old: new) and its ports under their old
 *  names (`ports`, new: old), so boards made with it run as they did; `rewire` (dataflow.ts) moves boards on to the kept
 *  block. They are not in the library, so nothing new is made with them. */
export const ALIASES: Record<string, { to: string; set?: Record<string, unknown>; keys?: Record<string, string>; ports?: Record<string, string> }> = {
  'math.sum': { to: 'math.stats' },
  'in.slider': { to: 'in.number', set: { style: 'slider', value: 50, min: '0', max: '100' } },
  'array.line': { to: 'array', set: { pattern: 'line' } },
  'array.circle': { to: 'array', set: { pattern: 'ring' } },
  'array.grid': { to: 'array', set: { pattern: 'grid' } },
  'place.points': { to: 'place', ports: { y: 'dy' } },
  'read.block': { to: 'read', set: { kind: 'block' } },
  'read.item': { to: 'read', set: { kind: 'item', id: 'engine-ice' } },
  'gauntlet.gate': { to: 'gauntlet.run', set: { gates: 'documented' }, keys: { gate: 'gates' }, ports: { approved: 'passed', rejected: 'failed' } },
  'unknown.sort': { to: 'unknown.queue', ports: { only: 'ids', clusterCount: 'count', count: 'unknownCount' } },
  'research.ref': { to: 'research.notes', set: { from: 'm20a-fks' }, keys: { which: 'from' } },
};
/** An old id's settings as the kept block takes them. */
export function aliasSet(id: string, set: Record<string, unknown> = {}): Record<string, unknown> {
  const a = ALIASES[id]; if (!a) return set;
  const out: Record<string, unknown> = { ...(a.set ?? {}) };
  for (const [k, v] of Object.entries(set)) out[a.keys?.[k] ?? k] = v;
  return out;
}
const adapters = new Map<string, BlockDef>();
function adapter(id: string): BlockDef | undefined {
  const a = ALIASES[id], to = a ? LIBRARY.get(a.to) : undefined; if (!a || !to) return undefined;
  const had = adapters.get(id); if (had) return had;
  const back = a.ports ?? {}, fwd = Object.fromEntries(Object.entries(back).map(([n, o]) => [o, n])), old = (n: string) => back[n] ?? n, neu = (o: string) => fwd[o] ?? o;
  const rename = (ps: Ports): Ports => ({ inputs: ps.inputs.map((q) => ({ ...q, name: old(q.name) })), outputs: ps.outputs.map((q) => ({ ...q, name: old(q.name) })) });
  const keyBack = Object.fromEntries(Object.entries(a.keys ?? {}).map(([o, n]) => [n, o]));
  const settings = to.settings?.map((x) => ({ ...x, key: keyBack[x.key] ?? x.key, default: a.set && x.key in a.set ? a.set[x.key] : x.default }));
  const d: BlockDef = { ...to, id, alias: to.id, settings, tests: undefined,
    ports: (st) => rename(portsOf(to, aliasSet(id, st))),
    run: to.run ? async (i, c) => { const r = await to.run!(Object.fromEntries(Object.entries(i).map(([k, v]) => [neu(k), v])), { ...c, set: aliasSet(id, c.set) }); return Object.fromEntries(Object.entries(r).map(([k, v]) => [old(k), v])); } : undefined };
  adapters.set(id, d); return d;
}
export const block = (id: string): BlockDef | undefined => LIBRARY.get(id) ?? adapter(id);
