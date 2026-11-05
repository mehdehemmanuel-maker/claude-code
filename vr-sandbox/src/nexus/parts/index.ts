// The families the table-driven maker (maker.ts) makes, each a table of rows and one recipe of the room operations
// (decision 0026): bolts and socket screws (ISO 4014/4017, ISO 4762), nuts (ISO 4032), washers (ISO 7089), set screws
// (ISO 4026), each M1.6 to M64 where its standard has the size; deep-groove ball bearings (ISO 15 and BOSL2's makers'
// rows); retaining rings (DIN 471, 472), parallel keys (DIN 6885), O-rings (ISO 3601-1), pipe by NPS and schedule (ASME
// B36.10, B36.19); NEMA stepper frames (NEMA ICS 16, by BOSL2's table) and every kind of bought part (src/nexus/kinds)
// as its envelope. The tables are read, never copied here: the metric sizes from src/nexus/parts/bdw.ts (through
// common.ts's METRIC), the bearings from families.ts, the NEMA frames from src/nexus/parts/bosl2.ts.
//
// Each check (maker.ts, checkRow) holds the built piece to its row: its bound to the row's sizes, its mass to the
// nominal mass worked from them (the solids the row names, at the material's density), so a recipe that reads a row
// wrongly (a radius for a diameter, corners for flats) is caught at every size. The nominal mass is ours, worked from
// the row: the standards here give no mass.

import { bearing, bolt, METRIC, nut, setScrew, SET_SCREWS, washer, BEARINGS, type MetricSize } from '../common';
import { made, run, stack, turn, type Block } from '../room';
import { densityKg } from '../mass';
import { DIN471, DIN472, DIN6885, ISO3601, NPS } from './bdw';
import { NEMA_BOSL2 } from './bosl2';
import { NEMA_FACE } from '../kinds/motion';
import { KINDS } from '../kinds';
import { FAMILIES, type Family } from '../families';
import type { Item } from '../inventory';
import { readKind } from '../kinds/core';
import { CHECK_ROW, familyNode, type Expect, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const e = (s: number) => (2 * s) / Math.sqrt(3);
const hexArea = (s: number) => (Math.sqrt(3) / 2) * s * s;
const disc = (d: number) => (Math.PI * d * d) / 4;
const rowsWith = (f: keyof MetricSize): Record<string, MetricSize> => Object.fromEntries(Object.entries(METRIC).filter(([, m]) => m[f] !== undefined));
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;

// ---- fasteners, M1.6 to M64 ---------------------------------------------------------------------------------------
const BOLT: PartFamily<MetricSize> = {
  id: 'piece.bolt', name: 'Bolt or screw', gloss: 'A metric hex bolt (ISO 4014/4017) or socket screw (ISO 4762) by its size and length', domains: ['mechanical', 'manufacturing', 'everyday'],
  says: 'A bolt by its metric size and length: its shank, its hex head (ISO 4014/4017) or socket head (ISO 4762, its socket not drawn) on top. Its shank offers its axis: a washer and a nut slide over it, and it passes through a hole (Bolted joint)',
  rows: Object.fromEntries(Object.entries(METRIC).filter(([, m]) => m.k !== undefined || m.dk !== undefined)), size: 'M8', source: 'ISO 4014, 4017, 4762 as bd_warehouse gives them (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 40 }, { key: 'head', label: 'Head', type: 'choice', default: 'hex', choices: ['hex', 'socket'] }],
  cannot: (m, size, set) => (!(len(set) > 0) ? `a length above 0 (${String(set.length)} mm)` : set.head === 'socket' && m.dk === undefined ? `ISO 4762 has no socket head screw of ${size}: say hex` : set.head !== 'socket' && m.k === undefined ? `ISO 4014 has no hex head of ${size}: say socket` : null),
  recipe: (_m, size, set) => bolt(size, len(set), set.head === 'socket' ? 'socket' : 'hex'),
  expect: (m, _s, set) => { const L = len(set), hex = set.head !== 'socket', W = hex ? mm(e(m.s!)) : mm(m.dk!), H = hex ? mm(m.k!) : mm(m.ks!);
    return { bound: [W, L + H, W], mass: (disc(mm(m.d)) * L + (hex ? hexArea(mm(m.s!)) : disc(mm(m.dk!))) * H) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: `${hex ? 'its hex head across corners (2s/√3)' : 'its socket head (dk)'} by its length and head; nominal mass, shank and head solid` }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, faces: 1, offers: ['M8 head/axis', 'M8 shank/axis'] } }, { set: { size: 'M64', length: 200 }, inputs: {}, outputs: { pieces: 2, offers: ['M64 head/axis', 'M64 shank/axis'] } }],
};
const NUT: PartFamily<MetricSize> = {
  id: 'piece.nut', name: 'Nut', gloss: 'A metric hex nut (ISO 4032) by its size', domains: ['mechanical', 'manufacturing', 'everyday'],
  says: 'A hex nut (ISO 4032), its bore the thread\'s size (the thread not drawn): it slides over a bolt\'s shank (Over a shaft)',
  rows: rowsWith('m'), size: 'M8', source: 'ISO 4032 as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  recipe: (_m, size) => nut(size),
  expect: (m) => ({ bound: [mm(e(m.s!)), mm(m.m!), mm(e(m.s!))], mass: (hexArea(mm(m.s!)) - disc(mm(m.d))) * mm(m.m!) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'across corners, its height; nominal mass, the hex less its bore' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['M8 nut/axis'] } }],
};
const WASHER: PartFamily<MetricSize> = {
  id: 'piece.washer', name: 'Washer', gloss: 'A plain metric washer (ISO 7089) by its size', domains: ['mechanical', 'manufacturing', 'everyday'],
  says: 'A plain washer (ISO 7089): it slides over a bolt\'s shank under its nut or head',
  rows: rowsWith('d1'), size: 'M8', source: 'ISO 7089 as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  recipe: (_m, size) => washer(size),
  expect: (m) => ({ bound: [mm(m.d2!), mm(m.hw!), mm(m.d2!)], mass: (disc(mm(m.d2!)) - disc(mm(m.d1!))) * mm(m.hw!) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside and thickness; nominal mass, the ring' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['M8 washer/axis'] } }],
};
const SETSCREW: PartFamily<{ s: number; t: number }> = {
  id: 'piece.setscrew', name: 'Set screw', gloss: 'A hex socket set screw, flat point (ISO 4026), by its size and length', domains: ['mechanical', 'manufacturing'],
  says: 'A hex socket set screw with a flat point (ISO 4026): its body and its socketed end (the socket drawn round); it goes down a hub\'s tapped hole from above (Through a line), its point on the shaft',
  rows: SET_SCREWS, size: 'M3', source: 'ISO 4026 as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 4 }],
  cannot: (q, size, set) => (len(set) > mm(q.t) ? null : `a ${size} set screw longer than its socket (${q.t} mm)`),
  recipe: (_q, size, set) => setScrew(size, len(set)),
  expect: (q, size, set) => { const d = mm(METRIC[size]!.d), L = len(set), ri = mm(q.s) / Math.sqrt(3); return { bound: [d, L, d], mass: (disc(d) * L - Math.PI * ri * ri * mm(q.t)) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its thread by its length; nominal mass, less its socket drawn round' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, faces: 1 } }],
};
// ---- bearings ----------------------------------------------------------------------------------------------------
type BearingRow = (typeof BEARINGS)[string];
const BEARING: PartFamily<BearingRow> = {
  id: 'piece.bearing', name: 'Ball bearing', gloss: 'A deep-groove ball bearing by its trade size: rings, cage and balls', domains: ['mechanical', 'manufacturing', 'vehicles'],
  says: 'A deep-groove ball bearing (bore, outside and width by ISO 15 or the maker\'s page BOSL2 names; its balls typical): its inner ring, its cage slid over it, its outer ring over all, each ball through its pocket. Approximated: the balls drawn as cylinders, no raceway grooves. A shaft goes through its inner ring (Through a line); its outer ring into a housing',
  rows: BEARINGS, size: '608', source: 'ISO 15 (families.ts) and BOSL2\'s bearing rows (src/nexus/parts/bosl2.ts)',
  recipe: (_q, size) => bearing(size),
  // (the nominal mass: the rings' section filled 0.68, the families' own estimate for a deep-groove bearing, typical. The
  // drawn mass misses it by about half at every size (608: 6.62 g drawn, 12.29 g nominal; SKF lists 12 g): each ball's
  // cut, which takes nothing from the rings it does not meet, is drawn through them as a whole hole (room.ts
  // partOfBlock), so the check fails on mass until the drawing skips cuts that miss: a fault of the drawing, left open)
  expect: (q) => ({ bound: [mm(q.D), mm(q.B), mm(q.D)], mass: (disc(mm(q.D)) - disc(mm(q.d))) * mm(q.B) * 0.68 * rho('steel-chrome'), tol: 0.01, massTol: 0.25, says: 'its outside and width; nominal mass, its rings\' section 0.68 full (an estimate)' }),
  tests: [{ inputs: {}, outputs: { pieces: 10 } }, { set: { size: '6212' }, inputs: {}, outputs: { pieces: 13 } }],
};
// ---- retaining rings, keys, O-rings ------------------------------------------------------------------------------
type Clip = { shaft?: [number, number, number, number, number, number]; bore?: [number, number, number, number, number, number] };
const CLIPS: Record<string, Clip> = {};
for (const [k, v] of Object.entries(DIN471)) (CLIPS[k] ??= {}).shaft = v;
for (const [k, v] of Object.entries(DIN472)) (CLIPS[k] ??= {}).bore = v;
const clipRing = (c: Clip, set: Record<string, unknown>) => { const shaft = set.for !== 'bore', [s, , d3, , b] = (shaft ? c.shaft : c.bore)!; return { s, ri: shaft ? d3 / 2 : d3 / 2 - b, ro: shaft ? d3 / 2 + b : d3 / 2 }; };
const CIRCLIP: PartFamily<Clip> = {
  id: 'piece.circlip', name: 'Retaining ring', gloss: 'A retaining ring for a shaft (DIN 471) or a bore (DIN 472) by its diameter', domains: ['mechanical', 'manufacturing'],
  says: 'A retaining ring by the shaft (DIN 471) or bore (DIN 472) it is for, mm: drawn at its free size as a closed ring of its back\'s width (its gap and lugs not drawn: approximated). It slides over a shaft (Over a shaft) into its groove, or into a bore',
  rows: Object.fromEntries(Object.entries(CLIPS).sort((a, b) => Number(a[0]) - Number(b[0]))), size: '10', source: 'DIN 471 and DIN 472 as bd_warehouse gives them (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'for', label: 'For a', type: 'choice', default: 'shaft', choices: ['shaft', 'bore'] }],
  cannot: (c, size, set) => (set.for === 'bore' ? (c.bore ? null : `DIN 472 has no ring for a ${size} mm bore`) : c.shaft ? null : `DIN 471 has no ring for a ${size} mm shaft`),
  recipe: (c, size, set) => { const r = clipRing(c, set); return made(`${size} mm ${set.for === 'bore' ? 'bore' : 'shaft'} ring`, 'steel-alloy', { tube: [mm(r.ri), mm(r.ro), mm(r.s)] }, { color: 0x3a3a3a }); },
  expect: (c, _s, set) => { const r = clipRing(c, set); return { bound: [mm(2 * r.ro), mm(r.s), mm(2 * r.ro)], mass: (disc(mm(2 * r.ro)) - disc(mm(2 * r.ri))) * mm(r.s) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its free size and thickness; nominal mass, the closed ring' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['10 mm shaft ring/axis'] } }],
};
const KEY: PartFamily<[number, number, number, number]> = {
  id: 'piece.key', name: 'Parallel key', gloss: 'A parallel key (DIN 6885) by the shaft it is for, and its length', domains: ['mechanical', 'manufacturing'],
  says: 'A parallel key (DIN 6885 A, its ends drawn square) by the shaft it is for (mm, the largest the row takes): b wide, h high, along z; it goes into a shaft\'s keyway (Into a room) and its hub\'s',
  rows: Object.fromEntries(Object.entries(DIN6885).map(([k, v]) => [k, v])), size: '20', source: 'DIN 6885 as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 20 }],
  cannot: (_r, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: ([b, h], size, set) => made(`${b} × ${h} key for Ø${size}`, 'steel-low', { box: [mm(b), mm(h), len(set)] }),
  expect: ([b, h], _s, set) => ({ bound: [mm(b), mm(h), len(set)], mass: mm(b) * mm(h) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'b × h × its length; nominal mass, the bar' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
// (an O-ring: its section swept round its middle circle, laid as a run of two half bends, so its ends meet on one plane)
const ORING: PartFamily<[number, number]> = {
  id: 'piece.oring', name: 'O-ring', gloss: 'An O-ring (ISO 3601-1) by its size code: its inside diameter and section', domains: ['mechanical', 'manufacturing'],
  says: 'An O-ring by its ISO 3601-1 size code (inside diameter and cross-section): nitrile, its round section swept round its middle circle as two half bends of a run (it offers no line yet: a bend offers none)',
  rows: ISO3601, size: '010', source: 'ISO 3601-1 as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  recipe: ([id, w], size) => { const R = mm(id / 2 + w / 2), ro = mm(w / 2), half = { name: `${size} O-ring`, mat: 'nbr', ro, color: 0x1c1c1c, bend: 180, R };
    // (the run lies in its own x–y plane: turned a quarter about x, it lies flat, its axis up as a washer's)
    return turn(run(`${size} O-ring`, [half, { ...half, name: `${size} O-ring 2` }]), 0, 90); },
  expect: ([id, w]) => ({ bound: [mm(id + 2 * w), mm(w), mm(id + 2 * w)], mass: 2 * Math.PI ** 2 * mm(id / 2 + w / 2) * mm(w / 2) ** 2 * rho('nbr'), tol: 0.01, massTol: 0.02, says: 'its outside (id + 2w) and section; nominal mass, the torus 2π²Rr²' }),
  tests: [{ inputs: {}, outputs: { pieces: 2 } }],
};
// ---- pipe by NPS and schedule ------------------------------------------------------------------------------------
type PipeRow = { nps: string; od: number; t: number; mat: string };
const PIPE_MAT: Record<string, string> = { iron: 'steel-low', steel: 'steel-low', stainless: 'stainless-304', copper: 'copper', pvc: 'pvc', abs: 'abs' };
const NPS_ROWS: Record<string, PipeRow> = Object.fromEntries(Object.entries(NPS).flatMap(([nps, p]) => Object.entries(p.t).map(([w, t]) => [`${nps} ${w}`, { nps, od: p.od, t, mat: PIPE_MAT[w.split(' ')[0]!] ?? 'steel-low' }])));
const NPSPIPE: PartFamily<PipeRow> = {
  id: 'piece.npspipe', name: 'Pipe by NPS', gloss: 'A pipe by its nominal pipe size, material and schedule (ASME B36.10, B36.19)', domains: ['mechanical', 'manufacturing', 'pipelines'],
  says: 'A straight pipe by its nominal size (inches), material and schedule ("1/2 steel 40", "2 stainless 10S", "1 pvc 80", copper K/L/M): its outside and wall from its table, so long; it offers its axis, for a coupling over it or a line along it',
  rows: NPS_ROWS, size: '1/2 steel 40', source: 'ASME B36.10 and B36.19, ASTM B88 (copper), PVC and ABS schedules, as bd_warehouse gives them (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }],
  cannot: (r, _s, set) => (!(len(set) > 0) ? `a length above 0 (${String(set.length)} mm)` : 2 * r.t < r.od ? null : `its wall (${r.t} mm) leaves no bore in ${r.od} mm`),
  recipe: (r, size, set) => made(`NPS ${size} pipe`, r.mat, { tube: [mm(r.od / 2 - r.t), mm(r.od / 2), len(set)] }),
  expect: (r, _s, set) => ({ bound: [mm(r.od), len(set), mm(r.od)], mass: (disc(mm(r.od)) - disc(mm(r.od - 2 * r.t))) * len(set) * rho(r.mat), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['NPS 1/2 steel 40 pipe/axis'] } }],
};
// ---- NEMA steppers, as their envelopes with their faces' holes -----------------------------------------------------
type NemaRow = [number, number, number, number, number, number, number];
const stepperOf = ([w, ph, pd, sp, , , sh]: NemaRow, size: string, set: Record<string, unknown>): Block => {
  const L = len(set), out = mm(Number(set.shaft) > 0 ? Number(set.shaft) : NEMA_FACE[size]?.out ?? 20), a = mm(sp) / 2;
  const body = made(`NEMA ${size} body`, 'steel-low', { box: [mm(w), L, mm(w)] }, { color: 0x2b2d30, pattern: { name: 'holes', points: [[-a, -a], [a, -a], [a, a], [-a, a]] } });
  return stack(`NEMA ${size} stepper (envelope)`, 1, [{ b: body }, { b: made(`NEMA ${size} pilot`, 'al-6061', { cyl: [mm(pd) / 2, mm(ph)] }) }, { b: made(`NEMA ${size} shaft`, 'steel-alloy', { cyl: [mm(sh) / 2, out] }) }]);
};
const STEPPER: PartFamily<NemaRow> = {
  id: 'piece.stepper', name: 'Stepper motor (NEMA frame)', gloss: 'A NEMA stepper motor by its frame, as its envelope: body, pilot, shaft and its face\'s four holes', domains: ['mechanical', 'electrical', 'manufacturing'],
  says: 'A stepper motor by its NEMA frame (6 to 42) and body length: its body a box (its face\'s four holes offered on their square as `<name>/holes`, their footprints), its pilot boss and its shaft stacked on its face (shaft from NEMA ICS 16 where known, else 20 mm, typical)',
  rows: Object.fromEntries(Object.entries(NEMA_BOSL2).map(([k, v]) => [k, v])), size: '17', source: 'NEMA ICS 16 frames as BOSL2 gives them (src/nexus/parts/bosl2.ts)',
  envelope: 'its body is its outline (no rotor, windings or end caps inside), so its drawn mass is a solid steel box\'s, not the motor\'s',
  settings: [{ key: 'length', label: 'Body length, mm', type: 'number', default: 40 }, { key: 'shaft', label: 'Shaft out, mm (0: its frame\'s)', type: 'number', default: 0 }],
  cannot: (_r, _s, set) => (len(set) > 0 ? null : `a body length above 0 (${String(set.length)} mm)`),
  recipe: stepperOf,
  expect: ([w, ph], size, set) => { const out = Number(set.shaft) > 0 ? Number(set.shaft) : NEMA_FACE[size]?.out ?? 20; return { bound: [mm(w), len(set) + mm(ph) + mm(out), mm(w)], tol: 0.01, says: 'its body width by body, pilot and shaft' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['NEMA 17 body/holes', 'NEMA 17 pilot/axis', 'NEMA 17 shaft/axis'] } }],
};
// ---- every family of bought part (the 45 written by hand and every kind of src/nexus/kinds), as its envelope ------------
const ROUND = /^(can|rod|tube|ring|dome|torus|wheel|spring|loop|motor)\b/;
const KIND_OF = new Map(KINDS.map((k) => [k.id, k]));
type Sized = { f: Family; p: Record<string, string | number>; item: Item };
/** A family's sizes from words (blank: its defaults), and the item it makes of them; or why not. */
function sizedOf(f: Family, set: Record<string, unknown>): Sized | string {
  const w = String(set.words ?? '').trim();
  const p = w ? f.read(w) : KIND_OF.has(f.id) ? readKind(KIND_OF.get(f.id)!, '') : Object.fromEntries(f.params.map((q) => [q.key, q.default]));
  if (typeof p === 'string') return p;
  try { return { f, p, item: f.make(p) }; } catch (e) { return (e as Error).message; }
}
/** Its box as the space's: [x, y (up), z] from the item's [a, b, c] (its third its height); round where its kind's look is
 *  round and two of its sizes are within 5 % (its diameter), its height the third. */
function envelopeOf(s: Sized): { round: boolean; x: number; y: number; z: number } {
  const [a, b, c] = (s.item.size ?? [0, 0, 0]).map(mm) as [number, number, number], near = (u: number, v: number) => Math.abs(u - v) <= 0.05 * Math.max(u, v), k = KIND_OF.get(s.f.id);
  const look = k ? (typeof k.look === 'function' ? k.look(s.p as never) : k.look ?? '') : '';
  if (ROUND.test(look)) { if (near(a, b)) return { round: true, x: (a + b) / 2, y: c, z: (a + b) / 2 }; if (near(a, c)) return { round: true, x: (a + c) / 2, y: b, z: (a + c) / 2 }; if (near(b, c)) return { round: true, x: (b + c) / 2, y: a, z: (b + c) / 2 }; }
  return { round: false, x: a, y: c, z: b };
}
const sized = (f: Family, set: Record<string, unknown>): Sized => { const s = sizedOf(f, set); if (typeof s === 'string') throw new Error(s); return s; };
const matOfItem = (i: Item): string => i.of.map((o) => o.id).find((x) => densityKg(x) !== undefined) ?? 'abs';
const KIND: PartFamily<Family> = {
  id: 'piece.kind', name: 'Bought part (its envelope)', gloss: 'Any family of bought part the inventory knows, drawn as its envelope: its box, or its can or rod', domains: ['mechanical', 'electrical', 'everyday', 'manufacturing'],
  says: 'Any family of bought part the inventory knows (a servo, a fan, a DC motor, a relay, a dev board, a castor, a brick…) by its family and its sizes in words ("micro", "12V 40"; blank: its defaults): drawn as its envelope, a box (the item\'s third size its height) or, where its kind is round, a rod',
  rows: Object.fromEntries(FAMILIES.map((f) => [f.id, f])), size: 'servo', source: 'each family\'s own table and standard (src/nexus/families.ts, src/nexus/kinds)',
  envelope: 'drawn as its outline only (its box, or a rod where it is round), no detail and no holes (these rows give none); its mass the row\'s, not its drawing\'s',
  settings: [{ key: 'words', label: 'Its sizes in words (blank: its defaults)', type: 'text', default: '' }],
  cannot: (f, _s, set) => { const s = sizedOf(f, set); if (typeof s === 'string') return s; const v = envelopeOf(s); return v.x > 0 && v.y > 0 && v.z > 0 && [v.x, v.y, v.z].every(Number.isFinite) ? null : `its row gives no box to draw (${[v.x, v.y, v.z].map((x) => x * 1000).join(' × ')} mm)`; },
  recipe: (f, _s, set) => { const s = sized(f, set), v = envelopeOf(s), name = `${s.item.name} (envelope)`, mat = matOfItem(s.item);
    return v.round ? made(name, mat, { cyl: [v.x / 2, v.y] }) : made(name, mat, { box: [v.x, v.y, v.z] }); },
  expect: (f, _s, set) => { const s = sized(f, set), v = envelopeOf(s); return { bound: [v.x, v.y, v.z], ...(s.item.g !== undefined ? { mass: s.item.g / 1000 } : {}), tol: 0.01, says: 'its row\'s box' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};

/** Every family the maker makes, as the nodes it registers (blocks.ts puts them in the piece.* shelf). */
export const FAMILIES_MADE = [BOLT, NUT, WASHER, SETSCREW, BEARING, CIRCLIP, KEY, ORING, NPSPIPE, STEPPER, KIND] as PartFamily<unknown>[];
export const PIECE_NODES: BlockDef[] = [...FAMILIES_MADE.map((f) => familyNode(f)), CHECK_ROW];
export type { Expect };
