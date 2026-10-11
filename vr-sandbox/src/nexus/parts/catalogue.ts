// The catalogue: every standard size of every family, as a maker's catalogue lists them: screws in ISO 4762's lengths,
// bolts in ISO 4017's, bearings by ISO 15's numbers, resistors in the E24 series, capacitors in E6, gears of each
// standard module in every tooth count, O-rings in metric and AS568 sections, pipe by its nominal sizes … Each line is
// the words its family reads ("screw M4x20", "bearing 6201 2RS"); the part is made, by its family, from its standard,
// the first time it is asked for, and kept. So ten thousand parts cost nothing until one is wanted, and each is a part
// like any other: its sizes, its make-up down to the elements, how it is made, and what it does by its law.
// Where a series is not a standard's but a grid of the common sizes makers sell (springs, heaters, fans), it says so.

import { E6, E24 } from './series';
import { BEARINGS, CHAINS, CIRCLIPS, IPE, KEYS, LM, METRIC, NPS40, callFamily } from './families';
import type { Item } from './inventory';
import { KINDS } from '../kinds';
import { linesOf } from '../kinds/core';

/** ISO preferred lengths, mm (the series ISO 4762, 4017, 4029 and 8734 take their lengths from). */
const PREF = [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200];
const within = (lo: number, hi: number) => PREF.filter((x) => x >= lo && x <= hi);
/** The lengths each standard gives each thread, mm (ISO 4762 socket screws; ISO 4017 hex bolts; ISO 4029 set screws). */
const SOCKET: Record<string, [number, number]> = { 'M1.6': [3, 16], M2: [3, 20], 'M2.5': [4, 25], M3: [5, 30], M4: [6, 40], M5: [8, 50], M6: [10, 60], M8: [12, 80], M10: [16, 100], M12: [20, 120], M14: [25, 140], M16: [25, 160], M20: [30, 200], M24: [40, 200] };
const HEX: Record<string, [number, number]> = { M3: [6, 30], M4: [8, 40], M5: [10, 50], M6: [12, 60], M8: [16, 80], M10: [20, 100], M12: [25, 120], M14: [30, 140], M16: [30, 150], M20: [40, 200], M24: [50, 200] };
const SET: Record<string, [number, number]> = { M2: [2, 10], 'M2.5': [2.5, 12], M3: [3, 16], M4: [4, 20], M5: [5, 25], M6: [6, 30], M8: [8, 40], M10: [10, 50], M12: [12, 60] };
/** The E series of preferred values are their own owner's (src/nexus/parts/series.ts): E24 for resistors, E6 for
 *  capacitors. Re-exported because the part space and the kinds read them through here. */
export { E6, E24 } from './series';
const ohms = (v: number) => (v >= 1e6 ? `${+(v / 1e6).toPrecision(3)}M` : v >= 1e3 ? `${+(v / 1e3).toPrecision(3)}k` : `${+v.toPrecision(3)}R`);
const farads = (v: number) => (v >= 1e-6 ? `${+(v / 1e-6).toPrecision(3)}uF` : v >= 1e-9 ? `${+(v / 1e-9).toPrecision(3)}nF` : `${+(v / 1e-12).toPrecision(3)}pF`);
const cross = <A, B>(as: A[], bs: B[]): [A, B][] => as.flatMap((a) => bs.map((b): [A, B] => [a, b]));

/** Each family's series, as the words that call each size. */
export const SERIES: Record<string, { says: string; lines: () => string[] }> = {
  screw: { says: 'ISO 4762 socket head cap screws, M1.6–M24, in the standard\'s lengths; 12.9 black, 8.8, and A2 stainless', lines: () => Object.entries(SOCKET).flatMap(([t, [lo, hi]]) => within(lo, hi).flatMap((L) => ['', ' A2', ' 8.8'].map((c) => `screw ${t}x${L}${c}`))) },
  bolt: { says: 'ISO 4017 hex bolts, M3–M24, in the standard\'s lengths; classes 8.8, 10.9 and A2', lines: () => Object.entries(HEX).flatMap(([t, [lo, hi]]) => within(lo, hi).flatMap((L) => ['8.8', '10.9', 'A2'].map((c) => `bolt ${t}x${L} ${c}`))) },
  setscrew: { says: 'ISO 4029 cup-point set screws, M2–M12, in the standard\'s lengths', lines: () => Object.entries(SET).flatMap(([t, [lo, hi]]) => within(lo, hi).map((L) => `setscrew ${t}x${L}`)) },
  nut: { says: 'ISO 4032 hex nuts, and ISO 10511 nylon-lock nuts, M1.6–M24', lines: () => Object.keys(METRIC).flatMap((t) => [`nut ${t}`, `nut ${t} lock`]) },
  washer: { says: 'ISO 7089 flat washers, M1.6–M24', lines: () => Object.keys(METRIC).map((t) => `washer ${t}`) },
  threadedrod: { says: 'threaded rod, M3–M24, in the lengths it is sold in', lines: () => Object.keys(METRIC).filter((t) => Number(t.slice(1)) >= 3).flatMap((t) => [100, 250, 500, 1000, 2000].map((L) => `threadedrod ${t} ${L}`)) },
  dowel: { says: 'ISO 8734 hardened dowel pins, 1–20 mm, in the standard\'s lengths', lines: () => [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20].flatMap((d) => within(Math.max(3, 2 * d), Math.min(100, 10 * d)).map((L) => `dowel ${d}x${L}`)) },
  circlip: { says: 'DIN 471 external retaining rings', lines: () => Object.keys(CIRCLIPS).map((d) => `circlip ${d}`) },
  key: { says: 'DIN 6885 A parallel keys, each width in the lengths the standard gives it', lines: () => KEYS.flatMap(([, , b, h]) => within(Math.max(6, 3 * b), Math.min(100, 12 * b)).map((L) => `key ${b}x${h}x${L}`)) },
  standoff: { says: 'hex standoffs, M2–M4, brass and nylon', lines: () => cross(['M2', 'M2.5', 'M3', 'M4'], [3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40]).flatMap(([t, L]) => [`standoff ${t} ${L}`, `standoff ${t} ${L} nylon`]) },
  insert: { says: 'heat-set inserts, M2–M5', lines: () => cross(['M2', 'M2.5', 'M3', 'M4', 'M5'], [3, 4, 5, 6, 8, 10]).map(([t, L]) => `insert ${t} ${L}`) },
  bearing: { says: 'deep-groove ball bearings by their ISO 15 numbers, shielded (ZZ), sealed (2RS) and open', lines: () => Object.keys(BEARINGS).flatMap((n) => [`bearing ${n}`, `bearing ${n} 2RS`, `bearing ${n} open`]) },
  linear: { says: 'LM…UU linear ball bushings', lines: () => Object.keys(LM).map((d) => `linear LM${d}UU`) },
  gear: { says: 'spur gears of the standard modules (ISO 54) in every tooth count from 12 to 80, face width 10 × module as makers\' stock gears; steel, POM and printed PLA', lines: () => [0.5, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5].flatMap((m) => Array.from({ length: 69 }, (_, k) => k + 12).flatMap((z) => ['steel', 'pom', 'pla'].map((mt) => `gear m${m} z${z} b${+(10 * m).toFixed(1)} ${mt}`))) },
  pulley: { says: 'GT2 pulleys, 16–80 teeth, 3–12 mm bores', lines: () => cross([16, 20, 24, 30, 32, 36, 40, 48, 60, 80], [3, 4, 5, 6, 8, 10, 12]).map(([z, b]) => `pulley ${z}t ${b}mm`) },
  belt: { says: 'GT2 belt, open lengths and closed loops, 6–15 mm wide', lines: () => [6, 9, 10, 15].flatMap((w) => [...[1000, 2000, 5000, 10000].map((L) => `belt GT2 ${L} ${w}mm`), ...[110, 112, 122, 158, 188, 200, 232, 280, 300, 400, 500, 610, 852, 1000].map((L) => `belt GT2 loop ${L} ${w}mm`)]) },
  chain: { says: 'roller chain of the ISO 606 B series and ANSI 25/35/40, in lengths', lines: () => cross(Object.keys(CHAINS), [0.5, 1, 1.5, 2, 3, 5]).map(([c, L]) => `chain ${c} ${L}m`) },
  sprocket: { says: 'sprockets for each chain, 9 to 60 teeth', lines: () => cross(Object.keys(CHAINS), Array.from({ length: 52 }, (_, k) => k + 9)).map(([c, z]) => { const D = CHAINS[c]!.p / Math.sin(Math.PI / z); return `sprocket ${c} z${z} bore${Math.max(4, Math.min(30, Math.round(D * 0.3)))}`; }) },
  leadscrew: { says: 'trapezoidal lead screws, Tr8–Tr20, 1, 2 and 4 starts, in lengths', lines: () => [[8, 2], [10, 2], [12, 3], [14, 3], [16, 4], [20, 4]].flatMap(([d, p]) => cross([1, 2, 4], [100, 150, 200, 250, 300, 350, 400, 500, 600, 800, 1000]).map(([s, L]) => `leadscrew T${d} p${p} s${s} ${L}`)) },
  rail: { says: 'MGN miniature linear rails, 7–15 mm, 100–1000 mm', lines: () => cross([7, 9, 12, 15], Array.from({ length: 19 }, (_, k) => 100 + 50 * k)).map(([w, L]) => `rail MGN${w} ${L}`) },
  rod: { says: 'round bar, 2–30 mm, steel, stainless, aluminium, brass and copper, in stock lengths', lines: () => cross([2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 25, 30], ['steel', 'stainless', 'aluminium', 'brass', 'copper']).flatMap(([d, mt]) => [100, 300, 500, 1000].map((L) => `rod ${d}mm ${L} ${mt}`)) },
  tube: { says: 'round tube 6–50 mm and square tube 15–50 mm, in their walls and metals, in stock lengths', lines: () => [
    ...cross([6, 8, 10, 12, 16, 20, 25, 30, 40, 50], [0.5, 1, 1.5, 2, 3]).filter(([od, t]) => t <= od / 5).flatMap(([od, t]) => cross(['aluminium', 'steel', 'stainless', 'brass', 'copper'], [500, 1000, 2000]).map(([mt, L]) => `tube round ${od}x${t} ${L} ${mt}`)),
    ...cross([15, 20, 25, 30, 40, 50], [1.5, 2, 3]).flatMap(([od, t]) => cross(['steel', 'aluminium', 'stainless'], [1000, 2000]).map(([mt, L]) => `tube square ${od}x${t} ${L} ${mt}`)),
  ] },
  sheet: { says: 'sheet and plate in the thicknesses each is sold in, in common sizes', lines: () => {
    const sizes = ['300x300', '500x500', '1000x500', '2000x1000'], out: string[] = [];
    for (const mt of ['aluminium', 'steel', 'stainless', 'brass', 'copper']) for (const t of [0.5, 0.8, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) for (const sz of sizes) out.push(`sheet ${mt} ${t}mm ${sz}`);
    for (const [mt, ts] of [['acrylic', [2, 3, 4, 5, 6, 8, 10]], ['plywood', [3, 4, 6, 9, 12, 15, 18]], ['fr4', [0.8, 1, 1.6, 2, 3]]] as [string, number[]][]) for (const t of ts) for (const sz of sizes) out.push(`sheet ${mt} ${t}mm ${sz}`);
    return out;
  } },
  extrusion: { says: 'T-slot aluminium extrusion, 2020–4040, in cut lengths', lines: () => cross(['2020', '2040', '3030', '4040'], [100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 2000]).map(([s, L]) => `extrusion ${s} ${L}`) },
  pipe: { says: 'schedule 40 pipe, 1/8" to 4", steel, stainless and PVC, in lengths', lines: () => cross(Object.keys(NPS40), ['steel', 'stainless', 'pvc']).flatMap(([n, mt]) => [0.5, 1, 2, 3, 6].map((L) => `pipe ${n}in ${L}m ${mt}`)) },
  ibeam: { says: 'IPE beams, 80–200, 1–12 m', lines: () => cross(Object.keys(IPE), Array.from({ length: 12 }, (_, k) => k + 1)).map(([n, L]) => `ibeam IPE${n} ${L}m`) },
  spring: { says: 'compression springs, music wire 0.3–3 mm, spring index 6 to 12, in free lengths (a grid of the common sizes makers stock, not one maker\'s list)', lines: () => {
    const out: string[] = [];
    for (const d of [0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3]) for (const C of [6, 8, 10, 12]) { const D = +(C * d).toFixed(1); for (const L of [5, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]) { const n = Math.max(2, Math.round((L - 2 * d) / (0.4 * D))), pitch = (L - 2 * d) / n; if (D >= 2 && n <= 60 && pitch >= 1.5 * d && pitch <= D && L >= 4 * d) out.push(`spring d${d} D${D} L${L} n${n}`); } }
    return out;
  } },
  oring: { says: 'O-rings, metric sections (ISO 3601) and the AS568 sections, 3–100 mm inside, NBR, FKM and silicone', lines: () => cross([1, 1.5, 1.78, 2, 2.5, 2.62, 3, 3.53, 4, 5, 5.33], [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 25, 26, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]).filter(([cs, id]) => id >= 2 * cs).flatMap(([cs, id]) => ['nbr', 'fkm', 'silicone'].map((mt) => `oring ${id}x${cs} ${mt}`)) },
  wire: { says: 'hook-up wire, 10–32 AWG, in the lengths it is sold in', lines: () => Array.from({ length: 23 }, (_, k) => k + 10).flatMap((g) => [1, 5, 10, 25, 100].map((L) => `wire ${g}AWG ${L}m`)) },
  resistor: { says: 'resistors, every E24 value from 1 Ω to 10 MΩ, 1/8 W to 2 W', lines: () => { const out: string[] = []; for (let dec = 1; dec <= 1e6; dec *= 10) for (const v of E24) for (const w of [0.125, 0.25, 0.5, 1, 2]) out.push(`resistor ${ohms(v * dec)} ${w}W`); for (const w of [0.125, 0.25, 0.5, 1, 2]) out.push(`resistor 10M ${w}W`); return out; } },
  capacitor: { says: 'capacitors, every E6 value: ceramics 1 pF–1 µF at 16–100 V, electrolytics 1 µF–10 000 µF at 10–450 V', lines: () => {
    const out: string[] = [];
    for (let dec = 1e-12; dec < 1e-6; dec *= 10) for (const v of E6) for (const V of [16, 25, 50, 100]) out.push(`capacitor ${farads(v * dec)} ${V}V`);
    for (const V of [16, 25, 50, 100]) out.push(`capacitor 1uF ${V}V`);
    for (let dec = 1e-6; dec < 1e-2; dec *= 10) for (const v of E6) for (const V of [10, 16, 25, 35, 50, 63, 100, 160, 250, 400, 450]) out.push(`capacitor ${farads(v * dec)} ${V}V`);
    return out;
  } },
  led: { says: 'LEDs, five colours, 3, 5 and 10 mm', lines: () => cross(['red', 'yellow', 'green', 'blue', 'white'], [3, 5, 10]).map(([c, s]) => `led ${c} ${s}mm`) },
  thermistor: { says: 'NTC thermistors, 1 kΩ–470 kΩ, β 3435, 3950 and 4250', lines: () => cross(['1k', '2.2k', '4.7k', '10k', '22k', '47k', '100k', '220k', '470k'], [3435, 3950, 4250]).map(([r, b]) => `thermistor ${r} B${b}`) },
  heater: { says: 'cartridge heaters, 6–10 mm, 12–230 V (a grid of the common sizes makers sell)', lines: () => cross(['6x15', '6x20', '6x30', '6x40', '8x30', '10x50'], [[12, 30], [12, 40], [12, 50], [24, 30], [24, 40], [24, 50], [24, 60], [120, 100], [230, 100], [230, 200]]).map(([sz, [V, W]]) => `heater ${V}V ${W}W ${sz}`) },
  jst: { says: 'JST connectors, SH, PH, XH and VH, 2–12 ways', lines: () => cross(['SH', 'PH', 'XH', 'VH'], Array.from({ length: 11 }, (_, k) => k + 2)).map(([s, n]) => `jst ${s} ${n}`) },
  header: { says: '2.54 mm pin headers, 1 and 2 rows, 1–40 pins', lines: () => cross([1, 2], Array.from({ length: 40 }, (_, k) => k + 1)).map(([r, n]) => `header ${r}x${n}`) },
  pcb: { says: 'circuit boards, 1–6 layers, 1.0 and 1.6 mm, in common sizes', lines: () => cross(['20x20', '30x30', '50x50', '50x70', '70x90', '100x80', '100x100', '100x150', '150x150', '200x150'], [1, 2, 4, 6]).flatMap(([sz, l]) => [`pcb ${sz} ${l} layers 1.6mm`, `pcb ${sz} ${l} layers 1mm`]) },
  stepper: { says: 'stepper motors, NEMA 8 to 34, in the body lengths makers build', lines: () => Object.entries({ 8: [28, 38], 11: [32, 45, 51], 14: [28, 34, 52], 17: [20, 25, 34, 40, 48, 60], 23: [41, 56, 76, 100], 34: [65, 80, 98, 114] }).flatMap(([n, ls]) => ls.map((L) => `stepper nema${n} ${L}`)) },
  dcmotor: { says: 'brushed DC motors, 130 to 775 size, 3–24 V', lines: () => cross(['130', '180', '280', '370', '385', '540', '550', '775'], [3, 6, 12, 24]).map(([s, V]) => `dcmotor ${s} ${V}V`) },
  fan: { says: 'axial fans, 25–120 mm, the thicknesses each frame is built in, 5, 12 and 24 V', lines: () => [[25, 10], [30, 10], [40, 10], [40, 20], [50, 10], [50, 15], [60, 10], [60, 15], [60, 25], [80, 15], [80, 25], [92, 25], [120, 25]].flatMap(([s, t]) => [5, 12, 24].map((V) => `fan ${s}x${t} ${V}V`)) },
  cell: { says: 'lithium-ion cells by size code', lines: () => ['14500', '18650', '21700', '26650'].map((c) => `cell ${c}`) },
  pack: { says: 'lithium-ion packs, 1–14 in series, 1–4 side by side', lines: () => cross(Array.from({ length: 14 }, (_, k) => k + 1), [1, 2, 3, 4]).map(([s, p]) => `pack ${s}S${p}P`) },
  servo: { says: 'hobby servos', lines: () => ['servo micro', 'servo standard'] },
  magnet: { says: 'NdFeB disc magnets, 2–30 mm across, 1–10 mm thick, N35, N42 and N52', lines: () => cross([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30], [1, 1.5, 2, 3, 4, 5, 10]).filter(([d, h]) => h <= d).flatMap(([d, h]) => ['N35', 'N42', 'N52'].map((g) => `magnet ${d}x${h} ${g}`)) },
  coupling: { says: 'helical-beam shaft couplings, 2–12 mm bores', lines: () => { const b = [2, 3, 4, 5, 6, 8, 10, 12], out: string[] = []; for (let i = 0; i < b.length; i++) for (let j = i; j < b.length; j++) out.push(`coupling ${b[i]}x${b[j]}`); return out; } },
};

// every kind of bought part, in every size it is sold in
for (const k of KINDS) SERIES[k.id] = { says: k.std, lines: () => linesOf(k) };

let lines: string[] | null = null;
/** Every line of the catalogue, family by family (made once, the first time it is asked for). */
const byFamily = new Map<string, string[]>();
export function catalogue(family?: string): string[] {
  if (family) { let l = byFamily.get(family); if (!l) byFamily.set(family, (l = SERIES[family]?.lines() ?? [])); return l; }
  return (lines ??= Object.keys(SERIES).flatMap((f) => catalogue(f)));
}
const made = new Map<string, Item | null>();
/** The part a line of the catalogue calls, made by its family the first time, kept after. */
export function catalogueItem(line: string): Item | null { if (!made.has(line)) { const r = callFamily(line); made.set(line, r && typeof r === 'object' ? r : null); } return made.get(line)!; }
/** The lines a few words find, without making their parts: each word a part of the line, the more the better. */
export function searchCatalogue(q: string, n = 20): string[] {
  const ws = q.toLowerCase().split(/\s+/).filter(Boolean); if (!ws.length) return [];
  const scored: [string, number][] = [];
  const toks = (l: string) => l.toLowerCase().split(/\s+/);
  for (const l of catalogue()) { const low = l.toLowerCase(); let s = 0, whole = 0; for (const w of ws) if (low.includes(w)) { s += w.length; if (toks(l).some((t) => t === w || t.startsWith(w))) whole += w.length; } if (s >= ws.join('').length * 0.75) scored.push([l, s + whole - low.length / 100]); }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, n).map(([l]) => l);
}
