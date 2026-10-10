// Every part the families can make: not stored, but numbered. Each family's sizes are axes, at the resolution the part is
// really made to (sheet in its stock thicknesses, cut to the millimetre; tube and rod cut to the millimetre; springs
// wound to any wire, diameter, length and coil count; gears in every module of ISO 54, every tooth count, every half
// millimetre of face …), with what cannot be made left out (a wall thicker than a quarter of its tube, a spring that
// would be solid, a heater past the power its surface can shed). So a part's number decodes straight to its sizes and
// its sizes encode straight to its number: any one of more than a billion is got at once, and nothing is held until it
// is wanted. Each is then a part like any other: its family makes it from its standard, with what is in it, down to the
// elements, and what it does by its law.

import { BEARINGS, CHAINS, CIRCLIPS, IPE, JST, KEYS, LM, METRIC, NDFEB, NPS40, callFamily } from './families';
import type { Item } from './inventory';
import { E24, catalogue } from './catalogue';
import { KINDS } from '../kinds';
import { vals, wordsOf, type KindDef } from '../kinds/core';

type V = number | string;
/** An axis: a list of values, or a range lo…hi by step. */
type Axis = { key: string; values: V[] } | { key: string; lo: number; hi: number; step: number };
const R = (key: string, lo: number, hi: number, step: number): Axis => ({ key, lo, hi, step });
const L = (key: string, values: V[]): Axis => ({ key, values });
const dp = (x: number) => (String(x).split('.')[1] ?? '').length;
const size = (a: Axis) => ('values' in a ? a.values.length : Math.floor((a.hi - a.lo) / a.step + 1e-9) + 1);
const at = (a: Axis, k: number): V => ('values' in a ? a.values[k]! : +(a.lo + k * a.step).toFixed(Math.max(dp(a.step), dp(a.lo))));
const indexIn = (a: Axis, v: V): number => { if ('values' in a) return a.values.findIndex((x) => String(x) === String(v)); const k = Math.round((Number(v) - a.lo) / a.step); return k >= 0 && k < size(a) && Math.abs(Number(at(a, k)) - Number(v)) < 1e-6 ? k : -1; };
/** A block: some values fixed, the rest axes free over their ranges; every combination a part that can be made. */
interface Block { fixed: Record<string, V>; axes: Axis[]; n: number }
interface FamilySpace { family: string; says: string; words(p: Record<string, V>): string; blocks: Block[]; total: number; starts: number[]; byKey: Map<string, number>; keys: string[] }
const block = (fixed: Record<string, V>, axes: Axis[]): Block | null => { const n = axes.reduce((a, x) => a * size(x), 1); return n > 0 && axes.every((x) => size(x) > 0) ? { fixed, axes, n } : null; };

const METALS = ['aluminium', 'steel', 'stainless', 'brass', 'copper'];
const SHEET_T: Record<string, number[]> = { aluminium: [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20], acrylic: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20], plywood: [3, 4, 6, 9, 12, 15, 18, 21, 24], fr4: [0.4, 0.6, 0.8, 1, 1.2, 1.6, 2, 2.4, 3.2] };
for (const m of ['steel', 'stainless', 'brass', 'copper']) SHEET_T[m] = SHEET_T.aluminium!;
const WALLS = [0.3, 0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const MODULES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5];
/** E96 (IEC 60063): 10^(k/96) to three figures. */
const E96 = Array.from({ length: 96 }, (_, k) => +(10 ** (k / 96)).toPrecision(3));
const ohmsW = (v: number) => (v >= 1e6 ? `${+(v / 1e6).toPrecision(3)}M` : v >= 1e3 ? `${+(v / 1e3).toPrecision(3)}k` : `${+v.toPrecision(3)}R`);
const faradsW = (v: number) => (v >= 1e-6 ? `${+(v / 1e-6).toPrecision(3)}uF` : v >= 1e-9 ? `${+(v / 1e-9).toPrecision(3)}nF` : `${+(v / 1e-12).toPrecision(3)}pF`);
const THREADS = Object.keys(METRIC);

/** The families' spaces: the blocks each is made of, and the words that call one of its parts. */
const DEFS: { family: string; says: string; words(p: Record<string, V>): string; blocks(): (Block | null)[] }[] = [
  { family: 'sheet', says: 'sheet in each material\'s stock thicknesses, cut to any size from 10 × 10 to 3000 × 3000 mm, to the millimetre', words: (p) => `sheet ${p.matter} ${p.t}mm ${p.w}x${p.h}`, blocks: () => Object.entries(SHEET_T).flatMap(([m, ts]) => ts.map((t) => block({ matter: m, t }, [R('w', 10, 3000, 1), R('h', 10, 3000, 1)]))) },
  { family: 'tube', says: 'round tube 3–300 mm outside to the half millimetre, square tube 10–200 mm, in the walls tube is drawn to (no wall past a quarter of its width), cut to any length 10–6000 mm, to the millimetre', words: (p) => `tube ${p.shape} ${p.od}x${p.wall} ${p.length} ${p.matter}`, blocks: () => [
    ...Array.from({ length: 595 }, (_, k) => 3 + k * 0.5).flatMap((od) => WALLS.filter((w) => w <= od / 4).map((wall) => block({ shape: 'round', od, wall }, [R('length', 10, 6000, 1), L('matter', METALS)]))),
    ...Array.from({ length: 381 }, (_, k) => 10 + k * 0.5).flatMap((od) => WALLS.filter((w) => w >= 0.8 && w <= od / 4).map((wall) => block({ shape: 'square', od, wall }, [R('length', 10, 6000, 1), L('matter', ['steel', 'aluminium', 'stainless'])]))),
  ] },
  { family: 'spring', says: 'compression springs wound from music wire 0.2–6 mm (every 0.05 mm), at any mean diameter from 4 to 16 times the wire (every 0.1 mm, 2–80 mm), 2–60 active coils, any free length to 300 mm at which it is not solid', words: (p) => `spring d${p.d} D${p.D} L${p.L} n${p.n}`, blocks: () => {
    const out: (Block | null)[] = [];
    for (let i = 0; i <= 116; i++) { const d = +(0.2 + i * 0.05).toFixed(2), Dlo = Math.max(2, Math.ceil(4 * d * 10) / 10), Dhi = Math.min(80, Math.floor(16 * d * 10) / 10); if (Dlo > Dhi) continue;
      for (let n = 2; n <= 60; n++) { const Llo = Math.max(3, Math.ceil((n + 2) * d * 1.15)); if (Llo > 300) continue; out.push(block({ d, n }, [R('D', Dlo, Dhi, 0.1), R('L', Llo, 300, 1)])); } }
    return out;
  } },
  { family: 'pcb', says: 'circuit boards of any size 5–500 mm a side, to the millimetre, 1–8 layers, in the standard thicknesses', words: (p) => `pcb ${p.w}x${p.h} ${p.layers} layers ${p.t}mm`, blocks: () => [block({}, [R('w', 5, 500, 1), R('h', 5, 500, 1), L('layers', [1, 2, 4, 6, 8]), L('t', [0.8, 1, 1.2, 1.6, 2])])] },
  { family: 'gear', says: 'spur gears in every module of ISO 54 from 0.3 to 5, 8 to 200 teeth, 2–60 mm face every half millimetre, in PLA, POM, steel, brass or aluminium', words: (p) => `gear m${p.m} z${p.z} b${p.b} ${p.matter}`, blocks: () => [block({}, [L('m', MODULES), R('z', 8, 200, 1), R('b', 2, 60, 0.5), L('matter', ['pla', 'pom', 'steel', 'brass', 'aluminium'])])] },
  { family: 'rod', says: 'round bar 1–100 mm every half millimetre, cut to any length 10–3000 mm, in five metals', words: (p) => `rod ${p.d}mm ${p.length} ${p.matter}`, blocks: () => [block({}, [R('d', 1, 100, 0.5), R('length', 10, 3000, 1), L('matter', METALS)])] },
  { family: 'oring', says: 'O-rings of any section 0.5–12 mm and any inside diameter to 500 mm, every tenth of a millimetre, in NBR, FKM or silicone', words: (p) => `oring ${p.id}x${p.cs} ${p.matter}`, blocks: () => Array.from({ length: 116 }, (_, k) => +(0.5 + k * 0.1).toFixed(1)).flatMap((cs) => ['nbr', 'fkm', 'silicone'].map((m) => block({ cs, matter: m }, [R('id', Math.max(1, Math.ceil(2 * cs * 10) / 10), 500, 0.1)]))) },
  { family: 'heater', says: 'cartridge heaters 3–25 mm across and 10–300 mm long, for any of eight supply voltages, every 5 W up to what their surface can shed (about 50 W/cm²: an estimate, makers go to about 60)', words: (p) => `heater ${p.volts}V ${p.watts}W ${p.d}x${p.length}`, blocks: () => Array.from({ length: 45 }, (_, k) => 3 + k * 0.5).flatMap((d) => Array.from({ length: 59 }, (_, k) => 10 + k * 5).map((len) => { const wmax = Math.floor((50 * Math.PI * (d / 10) * (len / 10)) / 5) * 5; return wmax >= 5 ? block({ d, length: len }, [L('volts', [5, 12, 24, 48, 110, 120, 230, 240]), R('watts', 5, Math.min(3000, wmax), 5)]) : null; })) },
  { family: 'wire', says: 'hook-up wire 10–32 AWG, any length 0.05–100 m to the centimetre', words: (p) => `wire ${p.awg}AWG ${p.length}m`, blocks: () => [block({}, [R('awg', 10, 32, 1), R('length', 0.05, 100, 0.01)])] },
  { family: 'capacitor', says: 'capacitors, every E24 value from 1 pF to 1 F, rated for any whole voltage 4–450 V', words: (p) => `capacitor ${faradsW(Number(p.farads))} ${p.volts}V`, blocks: () => [block({}, [L('farads', [...Array.from({ length: 12 }, (_, k) => E24.map((v) => +(v * 10 ** (k - 12)).toPrecision(3))).flat(), 1]), R('volts', 4, 450, 1)])] },
  { family: 'thermistor', says: 'NTC thermistors, every E24 value 100 Ω–1 MΩ, β 2000–5000 K every 5 K', words: (p) => `thermistor ${ohmsW(Number(p.r25)).replace(/R$/, '')} B${p.beta}`, blocks: () => [block({}, [L('r25', [...Array.from({ length: 4 }, (_, k) => E24.map((v) => +(v * 10 ** (k + 2)).toPrecision(3))).flat(), 1e6]), R('beta', 2000, 5000, 5)])] },
  { family: 'bolt', says: 'hex bolts M3–M24, any length 4–300 mm every half millimetre, in ten strength classes', words: (p) => `bolt ${p.thread}x${p.length} ${p.class}`, blocks: () => THREADS.filter((t) => Number(t.slice(1)) >= 3).map((t) => block({ thread: t }, [R('length', 4, 300, 0.5), L('class', ['4.6', '4.8', '5.6', '5.8', '6.8', '8.8', '10.9', '12.9', 'A2', 'A4'])])) },
  { family: 'screw', says: 'socket head cap screws M1.6–M24, any length 3–200 mm every half millimetre, 8.8, 10.9, 12.9 or A2', words: (p) => `screw ${p.thread}x${p.length} ${p.class}`, blocks: () => THREADS.map((t) => block({ thread: t }, [R('length', 3, 200, 0.5), L('class', ['8.8', '10.9', '12.9', 'A2'])])) },
  { family: 'threadedrod', says: 'threaded rod M3–M24, cut to any length 10–3000 mm', words: (p) => `threadedrod ${p.thread} ${p.length}`, blocks: () => THREADS.filter((t) => Number(t.slice(1)) >= 3).map((t) => block({ thread: t }, [R('length', 10, 3000, 1)])) },
  { family: 'setscrew', says: 'set screws M1.6–M24, 2–60 mm every half millimetre', words: (p) => `setscrew ${p.thread}x${p.length}`, blocks: () => THREADS.map((t) => block({ thread: t }, [R('length', 2, 60, 0.5)])) },
  { family: 'magnet', says: 'NdFeB discs 1–60 mm across and 0.5–40 mm thick, every half millimetre, in seven grades', words: (p) => `magnet ${p.d}x${p.h} ${p.grade}`, blocks: () => [block({}, [R('d', 1, 60, 0.5), R('h', 0.5, 40, 0.5), L('grade', Object.keys(NDFEB))])] },
  { family: 'pipe', says: 'schedule 40 pipe 1/8"–4", steel, stainless or PVC, cut to any length 0.05–12 m to the centimetre', words: (p) => `pipe ${p.nps}in ${p.length}m ${p.matter}`, blocks: () => Object.keys(NPS40).flatMap((n) => ['steel', 'stainless', 'pvc'].map((m) => block({ nps: n, matter: m }, [R('length', 0.05, 12, 0.01)]))) },
  { family: 'belt', says: 'GT2 belt, open to any length 50–10 000 mm, or a closed loop of any even length to 2000 mm, 6–15 mm wide', words: (p) => `belt GT2${p.loop === 'yes' ? ' loop' : ''} ${p.length} ${p.width}mm`, blocks: () => [6, 9, 10, 15].flatMap((w) => [block({ width: w, loop: 'no' }, [R('length', 50, 10000, 1)]), block({ width: w, loop: 'yes' }, [R('length', 50, 2000, 2)])]) },
  { family: 'leadscrew', says: 'trapezoidal lead screws Tr8–Tr20, 1–4 starts, cut to any length 50–2000 mm', words: (p) => `leadscrew T${p.d} p${p.pitch} s${p.starts} ${p.length}`, blocks: () => [[8, 2], [10, 2], [12, 3], [14, 3], [16, 4], [20, 4]].map(([d, pitch]) => block({ d: d!, pitch: pitch! }, [L('starts', [1, 2, 3, 4]), R('length', 50, 2000, 1)])) },
  { family: 'extrusion', says: 'T-slot extrusion, four profiles, cut to any length 10–6000 mm', words: (p) => `extrusion ${p.series} ${p.length}`, blocks: () => [block({}, [L('series', ['2020', '2040', '3030', '4040']), R('length', 10, 6000, 1)])] },
  { family: 'ibeam', says: 'IPE beams 80–200, cut to any length 0.2–18 m to the centimetre', words: (p) => `ibeam IPE${p.size} ${p.length}m`, blocks: () => Object.keys(IPE).map((n) => block({ size: Number(n) }, [R('length', 0.2, 18, 0.01)])) },
  { family: 'chain', says: 'roller chain of six series, any even number of links from 2 to 2000', words: (p) => `chain ${p.series} ${p.length}m`, blocks: () => Object.entries(CHAINS).map(([c, C]) => block({ series: c }, [R('length', +((2 * C.p) / 1000).toFixed(5), +((2000 * C.p) / 1000).toFixed(5), +((2 * C.p) / 1000).toFixed(5))])) },
  { family: 'sprocket', says: 'sprockets for six chains, 9–120 teeth, any bore 3 mm to half the pitch circle', words: (p) => `sprocket ${p.series} z${p.z} bore${p.bore}`, blocks: () => Object.entries(CHAINS).flatMap(([c, C]) => Array.from({ length: 112 }, (_, k) => k + 9).map((z) => { const D = C.p / Math.sin(Math.PI / z); return block({ series: c, z }, [R('bore', 3, Math.min(60, Math.floor(D / 2)), 1)]); })) },
  { family: 'dowel', says: 'dowel pins 1–20 mm every half millimetre, any length 3–120 mm', words: (p) => `dowel ${p.d}x${p.length}`, blocks: () => [block({}, [R('d', 1, 20, 0.5), R('length', 3, 120, 1)])] },
  { family: 'rail', says: 'miniature linear rails MGN7–15, cut to any length 50–2000 mm', words: (p) => `rail MGN${p.size} ${p.length}`, blocks: () => [block({}, [L('size', [7, 9, 12, 15]), R('length', 50, 2000, 1)])] },
  { family: 'standoff', says: 'standoffs M2–M4, 3–60 mm every half millimetre, brass or nylon', words: (p) => `standoff ${p.thread} ${p.length}${p.matter === 'nylon' ? ' nylon' : ''}`, blocks: () => [block({}, [L('thread', ['M2', 'M2.5', 'M3', 'M4']), R('length', 3, 60, 0.5), L('matter', ['brass', 'nylon'])])] },
  { family: 'key', says: 'parallel keys in every DIN 6885 width, any length 6–100 mm', words: (p) => `key ${p.b}x${p.h}x${p.length}`, blocks: () => KEYS.map(([, , b, h]) => block({ b, h }, [R('length', 6, 100, 1)])) },
  { family: 'pulley', says: 'GT2 pulleys 12–80 teeth, any bore 3–12 mm every half millimetre', words: (p) => `pulley ${p.teeth}t ${p.bore}mm`, blocks: () => [block({}, [R('teeth', 12, 80, 1), R('bore', 3, 12, 0.5)])] },
  { family: 'stepper', says: 'steppers NEMA 8–34, any body length 20–120 mm', words: (p) => `stepper nema${p.nema} ${p.length}`, blocks: () => [block({}, [L('nema', ['8', '11', '14', '17', '23', '34']), R('length', 20, 120, 1)])] },
  { family: 'dcmotor', says: 'brushed DC motors, eight sizes, wound for any voltage 1.5–48 V every half volt', words: (p) => `dcmotor ${p.size} ${p.volts}V`, blocks: () => [block({}, [L('size', ['130', '180', '280', '370', '385', '540', '550', '775']), R('volts', 1.5, 48, 0.5)])] },
  { family: 'resistor', says: 'resistors, every E96 value from 1 Ω to 10 MΩ, 1/8 W to 2 W', words: (p) => `resistor ${ohmsW(Number(p.ohms))} ${p.watts}W`, blocks: () => [block({}, [L('ohms', [...Array.from({ length: 7 }, (_, k) => E96.map((v) => +(v * 10 ** k).toPrecision(3))).flat(), 1e7]), L('watts', [0.125, 0.25, 0.5, 1, 2])])] },
  { family: 'insert', says: 'heat-set inserts M2–M5, 2–12 mm every half millimetre', words: (p) => `insert ${p.thread} ${p.length}`, blocks: () => [block({}, [L('thread', ['M2', 'M2.5', 'M3', 'M4', 'M5']), R('length', 2, 12, 0.5)])] },
  { family: 'coupling', says: 'shaft couplings, any two bores 2–12 mm every half millimetre', words: (p) => `coupling ${p.d1}x${p.d2}`, blocks: () => [block({}, [R('d1', 2, 12, 0.5), R('d2', 2, 12, 0.5)])] },
  { family: 'bearing', says: 'ball bearings by every ISO 15 number here, shielded, sealed or open', words: (p) => `bearing ${p.number}${p.seal === 'ZZ' ? '' : ` ${p.seal}`}`, blocks: () => [block({}, [L('number', Object.keys(BEARINGS)), L('seal', ['ZZ', '2RS', 'open'])])] },
  { family: 'fan', says: 'axial fans, every frame and thickness, 5–24 V', words: (p) => `fan ${p.size}x${p.thick} ${p.volts}V`, blocks: () => [block({}, [L('size', [25, 30, 40, 50, 60, 80, 92, 120]), L('thick', [10, 15, 20, 25]), L('volts', [5, 12, 24])])] },
  { family: 'pack', says: 'lithium-ion packs 1–14 in series, 1–10 side by side', words: (p) => `pack ${p.s}S${p.p}P`, blocks: () => [block({}, [R('s', 1, 14, 1), R('p', 1, 10, 1)])] },
  { family: 'jst', says: 'JST connectors, four series, 2–16 ways', words: (p) => `jst ${p.series} ${p.pins}`, blocks: () => [block({}, [L('series', Object.keys(JST)), R('pins', 2, 16, 1)])] },
  { family: 'header', says: 'pin headers 1–3 rows, 1–40 pins', words: (p) => `header ${p.rows}x${p.pins}`, blocks: () => [block({}, [R('rows', 1, 3, 1), R('pins', 1, 40, 1)])] },
  { family: 'nut', says: 'hex nuts and lock nuts M1.6–M24', words: (p) => `nut ${p.thread}${p.lock === 'yes' ? ' lock' : ''}`, blocks: () => [block({}, [L('thread', THREADS), L('lock', ['no', 'yes'])])] },
  { family: 'washer', says: 'washers M1.6–M24', words: (p) => `washer ${p.thread}`, blocks: () => [block({}, [L('thread', THREADS)])] },
  { family: 'led', says: 'LEDs, five colours, three sizes', words: (p) => `led ${p.colour} ${p.size}mm`, blocks: () => [block({}, [L('colour', ['red', 'yellow', 'green', 'blue', 'white']), L('size', [3, 5, 10])])] },
  { family: 'circlip', says: 'retaining rings, every DIN 471 shaft here', words: (p) => `circlip ${p.d}`, blocks: () => [block({}, [L('d', Object.keys(CIRCLIPS).map(Number))])] },
  { family: 'linear', says: 'linear bushings, every LM size', words: (p) => `linear LM${p.d}UU`, blocks: () => [block({}, [L('d', Object.keys(LM).map(Number))])] },
  { family: 'cell', says: 'cells by size code', words: (p) => `cell ${p.size}`, blocks: () => [block({}, [L('size', ['14500', '18650', '21700', '26650'])])] },
  { family: 'servo', says: 'hobby servos', words: (p) => `servo ${p.size}`, blocks: () => [block({}, [L('size', ['micro', 'standard'])])] },
];

/** A kind of bought part as blocks: the axes up to its last one whose sizes hang on those before are fixed, one block
 *  for each of their combinations; that axis and the rest are free, over the sizes it is sold in, or the whole range
 *  it is made to order in. */
export function kindBlocks(k: KindDef): (Block | null)[] {
  const last = k.axes.reduce((at, a, i) => (typeof a.values === 'function' ? i : at), -1), out: (Block | null)[] = [];
  const free = (p: Record<string, V>) => k.axes.slice(Math.max(0, last)).map((a): Axis => (a.cut ? R(a.key, ...a.cut) : L(a.key, vals(a, p))));
  const walk = (i: number, p: Record<string, V>) => { if (i >= last) { out.push(block(p, free(p))); return; } const a = k.axes[i]!; for (const v of vals(a, p)) walk(i + 1, { ...p, [a.key]: v }); };
  walk(0, {});
  return out;
}
for (const k of KINDS) DEFS.push({ family: k.id, says: `${k.name}: ${k.std}`, words: (p) => wordsOf(k, p), blocks: () => (k.space ? k.space().map((b) => block(b.fixed, b.axes.map((a) => ('values' in a ? L(a.key, a.values) : R(a.key, a.lo, a.hi, a.step))))) : kindBlocks(k)) });

let built: FamilySpace[] | null = null, starts: number[] = [], TOTAL = 0;
const keyOf = (fixed: Record<string, V>) => Object.keys(fixed).sort().map((k) => `${k}=${String(fixed[k])}`).join('&');
function build(): FamilySpace[] {
  if (built) return built;
  built = []; starts = []; TOTAL = 0;
  for (const d of DEFS) {
    const blocks = d.blocks().filter((b): b is Block => !!b), bs: number[] = [], byKey = new Map<string, number>(); let t = 0;
    blocks.forEach((b, i) => { bs.push(t); t += b.n; byKey.set(keyOf(b.fixed), i); });
    built.push({ family: d.family, says: d.says, words: d.words, blocks, total: t, starts: bs, byKey, keys: [...new Set(blocks.flatMap((b) => Object.keys(b.fixed)))] });
    starts.push(TOTAL); TOTAL += t;
  }
  return built;
}
/** How many parts there are, all told, and by family. */
/** The most of a family's made-to-order sizes counted as distinct parts. Its standard sizes count in full, and any size it
 *  can be made to is still numbered and made; but a spring wound to every hundredth of a millimetre is one kind of part at
 *  many sizes, a potential, not trillions of parts: what is counted as parts is capped, what is possible is said apart. */
export const MADE_TO_ORDER_CAP = 10_000;
let partsKept: { parts: number; counted: Map<string, number> } | null = null;
/** The space: every size that can be made (its potential), and how many of them count as distinct parts (each family its
 *  standard sizes, and its made-to-order sizes up to the cap). */
export function spaceSize(): { total: number; parts: number; families: { family: string; says: string; n: number; counted: number }[] } {
  const fs = build();
  if (!partsKept) { const counted = new Map<string, number>(); let parts = 0; for (const f of fs) { const c = Math.min(f.total, Math.max(catalogue(f.family).length, MADE_TO_ORDER_CAP)); counted.set(f.family, c); parts += c; } partsKept = { parts, counted }; }
  const pk = partsKept;
  return { total: TOTAL, parts: pk.parts, families: fs.map((f) => ({ family: f.family, says: f.says, n: f.total, counted: pk.counted.get(f.family)! })).sort((a, b) => b.n - a.n) };
}
const upper = (xs: number[], x: number) => { let lo = 0, hi = xs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (xs[m]! <= x) lo = m; else hi = m - 1; } return lo; };
/** A part at random, every family as likely as any other (so the one with the most sizes does not crowd out the rest):
 *  its number. */
export function randomPart(r: () => number = Math.random): number { const fs = build(), fi = Math.floor(r() * fs.length); return starts[fi]! + Math.floor(r() * fs[fi]!.total); }
/** Part number n (0 … total − 1): its family, its sizes, and the words that call it. */
export function partAt(n: number): { family: string; params: Record<string, V>; words: string } | null {
  const fs = build(); if (!Number.isInteger(n) || n < 0 || n >= TOTAL) return null;
  const fi = upper(starts, n), f = fs[fi]!, r = n - starts[fi]!, bi = upper(f.starts, r), b = f.blocks[bi]!; let k = r - f.starts[bi]!;
  const params: Record<string, V> = { ...b.fixed };
  for (let a = b.axes.length - 1; a >= 0; a--) { const ax = b.axes[a]!, s = size(ax); params[ax.key] = at(ax, k % s); k = Math.floor(k / s); }
  return { family: f.family, params, words: f.words(params) };
}
/** A part's number, from its family's sizes; or −1 where that size is not in the space. */
export function numberOf(family: string, params: Record<string, V>): number {
  const fs = build(), fi = fs.findIndex((f) => f.family === family); if (fi < 0) return -1;
  const f = fs[fi]!, fixed: Record<string, V> = {}; for (const k of f.keys) fixed[k] = params[k]!;
  // a fixed value as the space keeps it (numbers without trailing noise)
  let bi = f.byKey.get(keyOf(fixed));
  if (bi === undefined) bi = f.blocks.findIndex((b) => Object.entries(b.fixed).every(([k, v]) => String(v) === String(params[k]) || (typeof v === 'number' && Math.abs(v - Number(params[k])) < 1e-6)));
  if (bi < 0) return -1;
  const b = f.blocks[bi]!; let k = 0;
  for (const ax of b.axes) { const j = indexIn(ax, params[ax.key]!); if (j < 0) return -1; k = k * size(ax) + j; }
  return starts[fi]! + f.starts[bi]! + k;
}
/** The part with number n, made by its family (and kept only by whoever holds it). */
export function partItem(n: number): Item | null { const p = partAt(n); if (!p) return null; const it = callFamily(p.words); return it && typeof it === 'object' ? it : null; }
/** A part's number from the words that call it, through its family's reading. */
export function numberOfWords(words: string): number { const it = callFamily(words); return it && typeof it === 'object' && it.sized ? numberOf(it.sized.family, it.sized.params) : -1; }
