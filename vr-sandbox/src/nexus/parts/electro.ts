// Electronic parts by tables, the second shelf (decision 0026; the user, 2026-11-06: "add 1000 new working parts no mock
// shit though like really populate the library"): SMD chip passives, the JEDEC packages (SOT, SOIC, SSOP, TSSOP, QFP,
// QFN and DFN, DPAK, the TO power packages), LEDs and LED displays, potentiometers, trimmers and encoders, rocker, slide
// and DIP switches, power, RF, banana and mains connectors, pluggable terminal blocks, sensor and driver breakout boards,
// cells and batteries, heat sinks, inductors and toroid cores, IC sockets, box headers and blade fuses. Each family is
// rows and one recipe of the room operations (src/nexus/room.ts): no place is written here, every place an output.
//
// Where the rows come from (each row says, or its family's `source`):
//   - BOLTS `batteries.blt` (MIT, its notice below): the IEC 60086 category-1 round cells' heights and diameters, copied.
//   - Codes that are their own sizes, read as the code says: EIA chip sizes (0603 = 1.6 × 0.8 mm), EIA 535BAAC tantalum
//     cases (3528-21 = 3.5 × 2.8 × 2.1 mm), IEC 60086 coin cells (CR2032 = Ø20 × 3.2 mm), Li-ion cells by their
//     IEC 61960 size code (21700 = Ø21 × 70.0 mm), LiPo pouches by the makers' thickness-width-length code (503035 =
//     5.0 × 30 × 35 mm), drum inductors by their code (RLB0913 = Ø9 × 13 mm).
//   - JEDEC outlines, their nominal (middle) figures as makers' package drawings give them: TO-236AB, MO-178, MO-193,
//     SC-70 (MO-203), TO-261AA, TO-252, TO-263, MS-012, MS-013, MO-150, MO-137, MO-187, MO-153, MS-026, MO-220, MO-229.
//   - Makers' datasheets where named on the row (Yageo RC, Murata GRM, Panasonic FK, Vishay MELF, Micrometals and
//     Fair-Rite cores, Worldsemi WS2812B, Aosong DHT, Bosch BME280, InvenSense MPU-6050, Allegro A4988, TI DRV8825,
//     Pololu carriers, Kingbright displays, Amass XT, Anderson Powerpole, IEC 60320, ISO 8820-3); everything else
//     labelled typical on its row.
// KiCad's package data (GPL-3.0) and NopSCADlib (GPL-3.0) were not copied: read as cross-checks only.
//
// BOLTS - Open Library of Technical Specifications, batteries.blt
// Copyright (c) 2013 Johannes Reinhardt <jreinhardt@ist-dein-freund.de>
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice
// and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS
// PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { made, stack, through, onto, over, turn, into, ring, joint, type Block } from '../room';
import { densityKg } from '../mass';
import { familyNode, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

const mm = (x: number): number => x / 1000;
const B = (x: number, y: number, z: number): [number, number, number] => [mm(x), mm(y), mm(z)];
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const LEAD = 0xc8ccd0, TIN = 0xd4d6d8, BLACK = 0x1c1c1c, WHITE = 0xf0f0ea, P = 2.54;
const EL = ['electrical', 'electronics'];
/** n places a pitch apart about their middle (mm). */
const span = (n: number, p: number): number[] => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * p);
const xz = (a: [number, number][]): [number, number][] => a.map(([x, z]) => [mm(x), mm(z)] as [number, number]);
const T = (pieces: number, set?: Record<string, unknown>) => ({ ...(set ? { set } : {}), inputs: {}, outputs: { pieces } });
const bound = (x: number, y: number, z: number): [number, number, number] => B(x, y, z);
/** Each of n lines a body offers (`port`) given a pin down it from the body's top, standing out below it. */
function downPins(body: Block, port: string, n: number, pin: (i: number) => Block): Block { let b = body; for (let i = 0; i < n; i++) b = through(b, pin(i), { port, i, from: 'hi' }, 'tight'); return b; }
/** Each of n lines given a passer up it from the body's bottom, standing out above it. */
function upThrough(body: Block, port: string, n: number, part: (i: number) => Block): Block { let b = body; for (let i = 0; i < n; i++) b = through(b, part(i), { port, i, from: 'lo' }, 'tight'); return b; }
const strip = (name: string, w: number, h: number, d: number, mat = 'copper', color = LEAD) => made(name, mat, { box: B(w, h, d) }, { color });
const pinRound = (name: string, d: number, h: number, mat = 'copper', color = LEAD) => made(name, mat, { cyl: [mm(d / 2), mm(h)] }, { color });

// ==== SMD chip passives ==============================================================================================
/** A two-terminal chip: its body between its two end terminations, along x (L × W × H with its ends e long, mm). Each
 *  end offers its pad line (`<size> terminal 1/pad`, down through it to the board's land). */
function chip(n: string, L: number, W: number, H: number, e: number, mat: string, color: number): Block {
  const term = (i: number) => made(`${n} terminal ${i}`, 'tin', { box: B(e, H, W) }, { color: TIN, pattern: { name: 'pad', points: [[0, 0]] } });
  return stack(n, 0, [{ b: term(1) }, { b: made(`${n} body`, mat, { box: B(L - 2 * e, H, W) }, { color }) }, { b: term(2) }]);
}
const chipMass = (L: number, W: number, H: number, e: number, mat: string) => mm(L - 2 * e) * mm(W) * mm(H) * rho(mat) + 2 * mm(e) * mm(W) * mm(H) * rho('tin');
type Chip = { L: number; W: number; H: number; e: number; src: string };
const YAGEO = 'Yageo RC_L series datasheet (L, W, H and its top termination I1, nominal)';
export const CHIP_RESISTORS: Record<string, Chip> = {
  '01005': { L: 0.4, W: 0.2, H: 0.13, e: 0.1, src: YAGEO }, '0201': { L: 0.6, W: 0.3, H: 0.23, e: 0.1, src: YAGEO }, '0402': { L: 1.0, W: 0.5, H: 0.35, e: 0.2, src: YAGEO },
  '0603': { L: 1.6, W: 0.8, H: 0.45, e: 0.25, src: YAGEO }, '0805': { L: 2.0, W: 1.25, H: 0.5, e: 0.35, src: YAGEO }, '1206': { L: 3.1, W: 1.6, H: 0.55, e: 0.45, src: YAGEO },
  '1210': { L: 3.1, W: 2.6, H: 0.55, e: 0.5, src: YAGEO }, '1218': { L: 3.1, W: 4.6, H: 0.55, e: 0.45, src: YAGEO }, '2010': { L: 5.0, W: 2.5, H: 0.55, e: 0.6, src: YAGEO }, '2512': { L: 6.35, W: 3.2, H: 0.55, e: 0.6, src: YAGEO },
};
const CHIPRES: PartFamily<Chip> = {
  id: 'piece.chipresistor', name: 'Chip resistor (SMD)', gloss: 'A thick-film chip resistor by its EIA size (01005 to 2512): its alumina body between its two terminations', domains: EL, aisle: 'Electronics / Passives',
  says: 'A thick-film chip resistor by its EIA size (01005, 0201, 0402, 0603, 0805, 1206, 1210, 1218, 2010, 2512): its alumina body between its two tin terminations, along x; each termination offers its pad line (`<size> resistor terminal 1/pad`, `… terminal 2/pad`), down to a board\'s land. Approximated: its terminations drawn as end blocks (they wrap onto its top and bottom in fact), its film and glaze not drawn',
  rows: CHIP_RESISTORS, size: '0603', source: YAGEO,
  recipe: (r, size) => chip(`${size} resistor`, r.L, r.W, r.H, r.e, 'alumina', BLACK),
  expect: (r) => ({ bound: bound(r.L, r.H, r.W), mass: chipMass(r.L, r.W, r.H, r.e, 'alumina'), tol: 0.01, massTol: 0.02, says: 'its length, height and width; nominal mass, alumina and its tin ends' }),
  tests: [T(3)],
};
const MURATA = 'Murata GRM series datasheet (L, W, T nominal; e the middle of its band)';
export const MLCCS: Record<string, Chip> = {
  '01005': { L: 0.4, W: 0.2, H: 0.2, e: 0.1, src: MURATA }, '0201': { L: 0.6, W: 0.3, H: 0.3, e: 0.15, src: MURATA }, '0402': { L: 1.0, W: 0.5, H: 0.5, e: 0.25, src: MURATA },
  '0603': { L: 1.6, W: 0.8, H: 0.8, e: 0.35, src: MURATA }, '0805 T0.6': { L: 2.0, W: 1.25, H: 0.6, e: 0.5, src: MURATA }, '0805 T0.85': { L: 2.0, W: 1.25, H: 0.85, e: 0.5, src: MURATA },
  '0805 T1.25': { L: 2.0, W: 1.25, H: 1.25, e: 0.5, src: MURATA }, '1206 T0.85': { L: 3.2, W: 1.6, H: 0.85, e: 0.6, src: MURATA }, '1206 T1.15': { L: 3.2, W: 1.6, H: 1.15, e: 0.6, src: MURATA },
  '1206 T1.6': { L: 3.2, W: 1.6, H: 1.6, e: 0.6, src: MURATA }, '1210 T1.6': { L: 3.2, W: 2.5, H: 1.6, e: 0.6, src: MURATA }, '1210 T2.5': { L: 3.2, W: 2.5, H: 2.5, e: 0.6, src: MURATA },
  '1812 T2.0': { L: 4.5, W: 3.2, H: 2.0, e: 0.6, src: MURATA }, '2220 T2.5': { L: 5.7, W: 5.0, H: 2.5, e: 0.6, src: MURATA },
};
const MLCC: PartFamily<Chip> = {
  id: 'piece.mlcc', name: 'Ceramic chip capacitor (MLCC)', gloss: 'A multilayer ceramic chip capacitor by its EIA size and thickness: its ceramic body between its two terminations', domains: EL, aisle: 'Electronics / Passives',
  says: 'A multilayer ceramic chip capacitor by its EIA size and its thickness (01005 to 2220): its ceramic body between its two tin terminations along x, each offering its pad line (`<size> capacitor terminal 1/pad`); it goes down onto a board\'s lands. Approximated: its terminations drawn as end blocks, its electrode layers inside not drawn',
  rows: MLCCS, size: '0603', source: MURATA,
  recipe: (r, size) => chip(`${size} capacitor`, r.L, r.W, r.H, r.e, 'ceramic', 0xb8a07a),
  expect: (r) => ({ bound: bound(r.L, r.H, r.W), mass: chipMass(r.L, r.W, r.H, r.e, 'ceramic'), tol: 0.01, massTol: 0.02, says: 'its length, thickness and width; nominal mass, ceramic and its tin ends' }),
  tests: [T(3)],
};
/** A tantalum chip by its EIA 535BAAC case: its code is its size (LLWW-HH: length and width in 0.1 mm, its most height). */
type Tant = { code: string; e: number };
const tantSize = (t: Tant) => { const m = /^(\d\d)(\d\d)-(\d\d)$/.exec(t.code)!; return { L: Number(m[1]) / 10, W: Number(m[2]) / 10, H: Number(m[3]) / 10 }; };
const KEMET = 'KEMET T491 datasheet case codes (EIA 535BAAC metric codes, read as their sizes); its terminations\' length typical';
export const TANTALUMS: Record<string, Tant> = {
  'A (3216-18)': { code: '3216-18', e: 0.8 }, 'B (3528-21)': { code: '3528-21', e: 0.8 }, 'C (6032-28)': { code: '6032-28', e: 1.3 }, 'D (7343-31)': { code: '7343-31', e: 1.3 },
  'X (7343-43)': { code: '7343-43', e: 1.3 }, 'E (7360-38)': { code: '7360-38', e: 1.3 }, 'R (2012-12)': { code: '2012-12', e: 0.5 }, 'S (3216-12)': { code: '3216-12', e: 0.8 },
  'T (3528-12)': { code: '3528-12', e: 0.8 }, 'U (6032-15)': { code: '6032-15', e: 1.3 }, 'V (7343-20)': { code: '7343-20', e: 1.3 }, 'W (7343-15)': { code: '7343-15', e: 1.3 },
};
const TANT: PartFamily<Tant> = {
  id: 'piece.tantalum', name: 'Tantalum chip capacitor', gloss: 'A moulded tantalum chip capacitor by its EIA case (A to X): its body and its two terminations', domains: EL, aisle: 'Electronics / Passives',
  says: 'A moulded tantalum chip capacitor by its case (A, B, C, D, X, E, R, S, T, U, V, W, EIA 535BAAC: its code its length, width and height): its epoxy body between its anode and cathode terminations along x, each offering its pad line (`<case> tantalum terminal 1/pad`). Approximated: its J-leads drawn as end blocks of its full height, its polarity band not drawn',
  rows: TANTALUMS, size: 'B (3528-21)', source: KEMET,
  recipe: (t, size) => { const s = tantSize(t); return chip(`${size} tantalum`, s.L, s.W, s.H, t.e, 'epoxy', 0xd8a020); },
  expect: (t) => { const s = tantSize(t); return { bound: bound(s.L, s.H, s.W), tol: 0.01, says: `its code ${t.code}: length, height, width` }; },
  tests: [T(3)],
};
/** An aluminium electrolytic V-chip: its can (Ø D, its height L over all) on its base plate (A square, t thick). */
type Vchip = { D: number; L: number; A: number; t: number };
const FK = 'Panasonic FK series (SMD aluminium electrolytic) case sizes, its drawing\'s nominal figures; its base plate\'s thickness typical';
export const VCHIPS: Record<string, Vchip> = {
  'B (4 × 5.8)': { D: 4.0, L: 5.8, A: 4.3, t: 0.6 }, 'C (5 × 5.8)': { D: 5.0, L: 5.8, A: 5.3, t: 0.6 }, 'D (6.3 × 5.8)': { D: 6.3, L: 5.8, A: 6.6, t: 0.6 }, 'D8 (6.3 × 7.7)': { D: 6.3, L: 7.7, A: 6.6, t: 0.6 },
  'E (8 × 6.2)': { D: 8.0, L: 6.2, A: 8.3, t: 0.7 }, 'F (8 × 10.2)': { D: 8.0, L: 10.2, A: 8.3, t: 0.7 }, 'G (10 × 10.2)': { D: 10.0, L: 10.2, A: 10.3, t: 0.7 }, 'H13 (12.5 × 13.5)': { D: 12.5, L: 13.5, A: 13.5, t: 1.0 },
  'J16 (16 × 16.5)': { D: 16.0, L: 16.5, A: 17.0, t: 1.0 }, 'K16 (18 × 16.5)': { D: 18.0, L: 16.5, A: 19.0, t: 1.0 },
};
const VCHIP: PartFamily<Vchip> = {
  id: 'piece.vchip', name: 'SMD electrolytic capacitor (V-chip)', gloss: 'An aluminium electrolytic V-chip capacitor by its case: its can on its base plate', domains: EL, aisle: 'Electronics / Passives',
  says: 'An aluminium electrolytic V-chip capacitor by its case (B to K16): its aluminium can (its axis `<case> can/axis`) standing on its square plastic base plate, which goes down onto a board\'s lands. Its two terminals under the plate and its rubber seal not drawn',
  rows: VCHIPS, size: 'D (6.3 × 5.8)', source: FK,
  recipe: (v, size) => stack(`${size} V-chip`, 1, [{ b: made(`${size} base plate`, 'pbt', { box: B(v.A, v.t, v.A) }, { color: BLACK }) }, { b: made(`${size} can`, 'al-6061', { cyl: [mm(v.D / 2), mm(v.L - v.t)] }, { color: 0xc8ccd0 }) }]),
  expect: (v) => ({ bound: bound(Math.max(v.A, v.D), v.L, Math.max(v.A, v.D)), tol: 0.01, says: 'its plate (or can) across, its height over all' }),
  tests: [T(2)],
};
/** A MELF: its body Ø D, L long over its caps (each e long), mm. */
type Melf = { D: number; L: number; e: number; what: string; src: string };
export const MELFS: Record<string, Melf> = {
  'MicroMELF 0102': { D: 1.1, L: 2.2, e: 0.3, what: 'resistor', src: 'Vishay MMU 0102 datasheet (Ø1.1 × 2.2 mm); its caps\' length typical' },
  'MiniMELF 0204': { D: 1.4, L: 3.6, e: 0.4, what: 'resistor', src: 'Vishay MMA 0204 datasheet (Ø1.4 × 3.6 mm); caps typical' },
  'MELF 0207': { D: 2.2, L: 5.8, e: 0.5, what: 'resistor', src: 'Vishay MMB 0207 datasheet (Ø2.2 × 5.8 mm); caps typical' },
  'SOD-80 (MiniMELF diode)': { D: 1.5, L: 3.5, e: 0.4, what: 'diode', src: 'JEDEC DO-213AA / SOD-80 (LL-34) outline, nominal (Ø1.5 × 3.5 mm); caps typical' },
  'DO-213AB (MELF diode)': { D: 2.5, L: 5.0, e: 0.5, what: 'diode', src: 'JEDEC DO-213AB (LL-41) outline, nominal (Ø2.5 × 5.0 mm); caps typical' },
};
const MELF: PartFamily<Melf> = {
  id: 'piece.melf', name: 'MELF resistor or diode', gloss: 'A MELF (metal electrode leadless face) resistor or diode: its round body between its two caps, lying on its side', domains: EL, aisle: 'Electronics / Passives',
  says: 'A MELF resistor or glass diode by its size (MicroMELF, MiniMELF, MELF; SOD-80, DO-213AB): its body between its two metal caps, made along its axis and turned to lie along x on a board\'s two lands; each cap\'s axis its line (`<size> cap 1/axis`)',
  rows: MELFS, size: 'MiniMELF 0204', source: 'Vishay MELF datasheets and JEDEC DO-213 outlines (each row says)',
  recipe: (m, size) => { const cap = (i: number) => made(`${size} cap ${i}`, 'tin', { cyl: [mm(m.D / 2), mm(m.e)] }, { color: TIN });
    return turn(stack(`${size} ${m.what}`, 1, [{ b: cap(1) }, { b: made(`${size} body`, m.what === 'diode' ? 'glass' : 'ceramic', { cyl: [mm(m.D / 2 * 0.95), mm(m.L - 2 * m.e)] }, { color: m.what === 'diode' ? 0xd86a3a : 0x5a8ac8 }) }, { b: cap(2) }]), 2, 90); },
  expect: (m) => ({ bound: bound(m.L, m.D, m.D), tol: 0.01, says: 'its length lying along x, its diameter' }),
  tests: [T(3)],
};

// ==== semiconductor packages =========================================================================================
/** A two-sided gull-wing package: its body (D along its rows, E1 across, A high) and its leads (b wide, c thick) out of
 *  its long sides to E over their tips, at its middle height: each line across its body (`<pkg> body/leads`) given a
 *  strip from one side through the body to stand out of the other; a lead on both sides two strips, the second cut from
 *  the first. Leads on the near side (+z) at `near`, the far side at `far` (mm from its middle along x). */
interface Gull { D: number; E1: number; A: number; E: number; b: number; c: number; near: number[]; far: number[] }
function gullwing(n: string, g: Gull, tab?: { w: number; c: number }): Block {
  const xs = [...new Set([...g.near, ...g.far])].sort((a, b) => a - b), L = mm(g.E1 + (g.E - g.E1) / 2), port = `${n} body/leads`;
  let body = made(`${n} body`, 'epoxy', { box: B(g.D, g.A, g.E1) }, { color: BLACK, pattern: { name: 'leads', face: '+z', points: xs.map((x) => [mm(x), 0] as [number, number]) } });
  const lead = () => made(`${n} lead`, 'copper', { box: [mm(g.b), L, mm(g.c)] }, { color: LEAD });
  xs.forEach((x, i) => { if (g.far.includes(x)) body = through(body, lead(), { port, i, from: 'lo' }, 'tight'); if (g.near.includes(x)) body = through(body, lead(), { port, i, from: 'hi' }, 'tight'); });
  // (a tab out of its far side, onto that face at its middle: SOT-223's, DPAK's)
  if (tab) body = onto(body, '-z', made(`${n} tab`, 'copper', { box: B(tab.w, tab.c, (g.E - g.E1) / 2) }, { color: LEAD }));
  return stack(n, 1, [{ b: body }]);
}
const GULL_SAYS = 'its leads drawn straight out of its sides at its middle height, as the lead frame leaves the moulding (their bend down to the seating plane not drawn: it stands on its body), each pair of opposite leads one strip through the body, cut in two';
type Sot = Gull & { src: string };
const sot = (D: number, E1: number, A: number, E: number, e: number, b: number, c: number, nearN: number, farN: number, src: string): Sot =>
  ({ D, E1, A, E, b, c, near: nearN === 2 ? [-e, e] : span(nearN, e), far: farN === 1 ? [0] : farN === 2 && nearN === 3 ? [-e, e] : span(farN, e), src });
export const SOTS: Record<string, Sot> = {
  'SOT-23 (TO-236AB)': sot(2.92, 1.3, 1.0, 2.37, 0.95, 0.4, 0.12, 2, 1, 'JEDEC TO-236AB (onsemi case 318-08): 2.92 × 1.30 × 1.0 mm body, 2.37 over its tips, leads 0.95 apart'),
  'SOT-23-5 (MO-178AA)': sot(2.9, 1.6, 1.15, 2.8, 0.95, 0.4, 0.15, 3, 2, 'JEDEC MO-178AA nominal (2.9 × 1.6 × 1.15 mm, 2.8 over its tips)'),
  'SOT-23-6 (MO-178AB)': sot(2.9, 1.6, 1.15, 2.8, 0.95, 0.4, 0.15, 3, 3, 'JEDEC MO-178AB nominal'),
  'TSOT-23-5 (MO-193AB)': sot(2.9, 1.6, 0.85, 2.8, 0.95, 0.4, 0.15, 3, 2, 'JEDEC MO-193AB nominal (its body 0.85 mm high)'),
  'TSOT-23-6 (MO-193AA)': sot(2.9, 1.6, 0.85, 2.8, 0.95, 0.4, 0.15, 3, 3, 'JEDEC MO-193AA nominal'),
  'SOT-323 (SC-70)': sot(2.0, 1.25, 0.95, 2.1, 0.65, 0.3, 0.15, 2, 1, 'JEDEC MO-203 (SC-70-3) nominal: 2.0 × 1.25 × 0.95 mm, 2.1 over its tips, leads 0.65 apart'),
  'SOT-353 (SC-70-5)': sot(2.0, 1.25, 0.95, 2.1, 0.65, 0.22, 0.15, 3, 2, 'JEDEC MO-203AA nominal'),
  'SOT-363 (SC-70-6)': sot(2.0, 1.25, 0.95, 2.1, 0.65, 0.22, 0.15, 3, 3, 'JEDEC MO-203AB nominal'),
  'SOT-523': sot(1.6, 0.8, 0.75, 1.6, 0.5, 0.22, 0.12, 2, 1, 'SOT-523 (SC-89 class), typical of makers\' drawings: 1.6 × 0.8 × 0.75 mm'),
  'SOT-563': sot(1.6, 1.2, 0.55, 1.6, 0.5, 0.22, 0.12, 3, 3, 'SOT-563, typical of makers\' drawings: 1.6 × 1.2 × 0.55 mm'),
};
const SOT: PartFamily<Sot> = {
  id: 'piece.sot', name: 'SOT package (SMD transistor, regulator, small IC)', gloss: 'A small-outline transistor package (SOT-23, SOT-23-5/6, TSOT, SC-70, SOT-523, SOT-563): its body and gull-wing leads', domains: EL, aisle: 'Electronics / Semiconductors',
  says: `A small-outline transistor package by its JEDEC outline: its epoxy body with its leads out of its two long sides (\`<pkg> body/leads\`, across it); it goes down onto a board's lands. Approximated: ${GULL_SAYS}`,
  rows: SOTS, size: 'SOT-23 (TO-236AB)', source: 'JEDEC TO-236, MO-178, MO-193, MO-203 outlines, nominal (each row says)',
  recipe: (g, size) => gullwing(size, g),
  expect: (g) => ({ bound: bound(g.D, g.A, g.E), tol: 0.01, says: 'its body\'s length and height, its leads\' tips across' }),
  tests: [T(4)],
};
type Pwr = Sot & { tab: { w: number; c: number } };
export const SMD_POWER: Record<string, Pwr> = {
  'SOT-223 (TO-261AA)': { D: 6.5, E1: 3.5, A: 1.6, E: 7.0, b: 0.7, c: 0.26, near: span(3, 2.3), far: [], tab: { w: 3.0, c: 0.26 }, src: 'JEDEC TO-261AA nominal: 6.5 × 3.5 × 1.6 mm, 7.0 over its leads and tab, leads 2.3 apart, tab 3.0 wide' },
  'SOT-89 (TO-243AA)': { D: 4.5, E1: 2.5, A: 1.5, E: 4.1, b: 0.44, c: 0.4, near: span(3, 1.5), far: [], tab: { w: 1.7, c: 0.4 }, src: 'JEDEC TO-243AA nominal: 4.5 × 2.5 × 1.5 mm, leads 1.5 apart; its tab typical' },
  'DPAK (TO-252AA)': { D: 6.6, E1: 6.1, A: 2.3, E: 9.9, b: 0.77, c: 0.5, near: [-2.285, 2.285], far: [], tab: { w: 5.3, c: 0.5 }, src: 'JEDEC TO-252AA nominal: 6.6 × 6.1 × 2.3 mm body, 9.9 over all, leads 4.57 apart; its tab typical' },
  'D2PAK (TO-263AB)': { D: 10.1, E1: 9.2, A: 4.4, E: 15.3, b: 0.8, c: 0.5, near: [-2.54, 2.54], far: [], tab: { w: 8.0, c: 1.3 }, src: 'JEDEC TO-263AB nominal: 10.1 × 9.2 × 4.4 mm body, 15.3 over all, leads 5.08 apart; its tab typical' },
  'D2PAK-7 (TO-263-7)': { D: 10.1, E1: 9.2, A: 4.4, E: 15.3, b: 0.6, c: 0.5, near: span(6, 1.27), far: [], tab: { w: 8.0, c: 1.3 }, src: 'TO-263-7, typical: the D2PAK body, six leads 1.27 apart' },
};
const SMDPOWER: PartFamily<Pwr> = {
  id: 'piece.smdpower', name: 'SMD power package (SOT-223, SOT-89, DPAK, D2PAK)', gloss: 'A surface-mount power package with its leads on one side and its tab on the other', domains: EL, aisle: 'Electronics / Semiconductors',
  says: `A surface-mount power package by its JEDEC outline (SOT-223, SOT-89, DPAK, D2PAK, D2PAK-7): its epoxy body, its leads out of one long side (\`<pkg> body/leads\`) and its tab out of the other, on to its middle; it goes down onto a board's lands, its tab on a copper pour. Approximated: ${GULL_SAYS}; its tab drawn as a plate out of its side`,
  rows: SMD_POWER, size: 'SOT-223 (TO-261AA)', source: 'JEDEC TO-261, TO-243, TO-252, TO-263 outlines, nominal (each row says)',
  recipe: (g, size) => gullwing(size, g, g.tab),
  expect: (g) => ({ bound: bound(g.D, g.A, g.E1 + (g.E - g.E1)), tol: 0.01, says: 'its body\'s length and height, its leads to its tab across' }),
  tests: [T(5)],
};
/** A dual-row IC: pins on each side, e apart, its body D long (mm), as its JEDEC outline. */
const dual = (pins: number, D: number, E1: number, A: number, E: number, e: number, b: number, c: number): Gull => ({ D, E1, A, E, b, c, near: span(pins / 2, e), far: span(pins / 2, e) });
type Ic = Gull & { src: string };
const ms012 = (pins: number, D: number): Ic => ({ ...dual(pins, D, 3.9, 1.45, 6.0, 1.27, 0.42, 0.2), src: `JEDEC MS-012 nominal (150 mil): ${D} × 3.9 × 1.45 mm body, 6.0 over its tips, leads 1.27 apart` });
const ms013 = (pins: number, D: number): Ic => ({ ...dual(pins, D, 7.5, 2.35, 10.3, 1.27, 0.42, 0.25), src: `JEDEC MS-013 nominal (300 mil): ${D} × 7.5 × 2.35 mm body, 10.3 over its tips` });
export const SOICS: Record<string, Ic> = {
  'SOIC-8': ms012(8, 4.9), 'SOIC-14': ms012(14, 8.65), 'SOIC-16': ms012(16, 9.9),
  'SOIC-16W': ms013(16, 10.3), 'SOIC-18W': ms013(18, 11.55), 'SOIC-20W': ms013(20, 12.8), 'SOIC-24W': ms013(24, 15.4), 'SOIC-28W': ms013(28, 17.9),
};
const icSays = (what: string) => `${what}: its epoxy body, its leads out of its two long sides (\`<pkg> body/leads\`, one line across it for each opposite pair, pin 1 at its −x end); it goes down onto a board's lands. Approximated: ${GULL_SAYS}; its pin-1 mark not drawn`;
const SOIC: PartFamily<Ic> = {
  id: 'piece.soic', name: 'SOIC package', gloss: 'A small-outline IC (SOIC-8 to SOIC-28W, JEDEC MS-012 and MS-013): its body and gull-wing leads', domains: EL, aisle: 'Electronics / Semiconductors',
  says: icSays('A small-outline IC by its pins, narrow (150 mil, MS-012) or wide (300 mil, MS-013)'),
  rows: SOICS, size: 'SOIC-8', source: 'JEDEC MS-012, MS-013 outlines, nominal (each row says)',
  recipe: (g, size) => gullwing(size, g),
  expect: (g) => ({ bound: bound(g.D, g.A, g.E), tol: 0.01, says: 'its body\'s length and height, its leads\' tips across' }),
  tests: [T(9)],
};
const mo150 = (pins: number, D: number): Ic => ({ ...dual(pins, D, 5.3, 1.75, 7.8, 0.65, 0.3, 0.15), src: `JEDEC MO-150 nominal (SSOP, 5.3 mm): ${D} × 5.3 × 1.75 mm body, 7.8 over its tips, leads 0.65 apart` });
const mo137 = (pins: number, D: number): Ic => ({ ...dual(pins, D, 3.9, 1.5, 6.0, 0.635, 0.25, 0.2), src: `JEDEC MO-137 nominal (QSOP): ${D} × 3.9 × 1.5 mm body, 6.0 over its tips, leads 0.635 apart` });
const mo187 = (pins: number, e: number, b: number): Ic => ({ ...dual(pins, 3.0, 3.0, 0.86, 4.9, e, b, 0.15), src: `JEDEC MO-187 nominal (MSOP): 3.0 × 3.0 × 0.86 mm body, 4.9 over its tips, leads ${e} apart` });
export const SSOPS: Record<string, Ic> = {
  'SSOP-14': mo150(14, 6.2), 'SSOP-16': mo150(16, 6.2), 'SSOP-20': mo150(20, 7.2), 'SSOP-24': mo150(24, 8.2), 'SSOP-28': mo150(28, 10.2),
  'QSOP-16': mo137(16, 4.9), 'QSOP-20': mo137(20, 8.65), 'QSOP-24': mo137(24, 8.65), 'MSOP-8': mo187(8, 0.65, 0.3), 'MSOP-10': mo187(10, 0.5, 0.23),
};
const SSOP: PartFamily<Ic> = {
  id: 'piece.ssop', name: 'SSOP, QSOP or MSOP package', gloss: 'A shrink small-outline IC (SSOP MO-150, QSOP MO-137, MSOP MO-187): its body and gull-wing leads', domains: EL, aisle: 'Electronics / Semiconductors',
  says: icSays('A shrink small-outline IC by its outline and pins (SSOP-14 to 28, QSOP-16 to 24, MSOP-8 and 10)'),
  rows: SSOPS, size: 'MSOP-8', source: 'JEDEC MO-150, MO-137, MO-187 outlines, nominal (each row says)',
  recipe: (g, size) => gullwing(size, g),
  expect: (g) => ({ bound: bound(g.D, g.A, g.E), tol: 0.01, says: 'its body\'s length and height, its leads\' tips across' }),
  tests: [T(9)],
};
const mo153 = (pins: number, D: number, e = 0.65, E1 = 4.4, E = 6.4): Ic => ({ ...dual(pins, D, E1, 1.0, E, e, e === 0.65 ? 0.25 : 0.22, 0.15), src: `JEDEC MO-153 nominal (TSSOP): ${D} × ${E1} × 1.0 mm body, ${E} over its tips, leads ${e} apart` });
export const TSSOPS: Record<string, Ic> = {
  'TSSOP-8': mo153(8, 3.0), 'TSSOP-14': mo153(14, 5.0), 'TSSOP-16': mo153(16, 5.0), 'TSSOP-20': mo153(20, 6.5), 'TSSOP-24': mo153(24, 7.8), 'TSSOP-28': mo153(28, 9.7),
  'TSSOP-38': mo153(38, 9.7, 0.5), 'TSSOP-48': mo153(48, 12.5, 0.5, 6.1, 8.1), 'TSSOP-56': mo153(56, 14.0, 0.5, 6.1, 8.1),
};
const TSSOP: PartFamily<Ic> = {
  id: 'piece.tssop', name: 'TSSOP package', gloss: 'A thin shrink small-outline IC (TSSOP-8 to 56, JEDEC MO-153): its body and gull-wing leads', domains: EL, aisle: 'Electronics / Semiconductors',
  says: icSays('A thin shrink small-outline IC by its pins (TSSOP-8 to 28 at 0.65 mm, 38 to 56 at 0.5 mm)'),
  rows: TSSOPS, size: 'TSSOP-14', source: 'JEDEC MO-153 outline, nominal (each row says)',
  recipe: (g, size) => gullwing(size, g),
  expect: (g) => ({ bound: bound(g.D, g.A, g.E), tol: 0.01, says: 'its body\'s length and height, its leads\' tips across' }),
  tests: [T(15)],
};
/** A quad flat package: its body D square, A high, its leads (k a side, e apart, b wide, c thick) to HD over their tips. */
type Qfp = { D: number; A: number; HD: number; k: number; e: number; b: number; c: number; src: string };
function quadPack(n: string, q: Qfp): Block {
  // (its leads across z at its middle height a little above, those across x a little below, so the strips do not cross)
  const xs = span(q.k, q.e), y0 = q.c / 2 + 0.02, L = mm(q.D + (q.HD - q.D) / 2);
  let body = made(`${n} body`, 'epoxy', { box: B(q.D, q.A, q.D) }, { color: BLACK, patterns: [{ name: 'leads', face: '+z', points: xs.map((x) => [mm(x), mm(y0)] as [number, number]) }, { name: 'side leads', face: '+x', points: xs.map((z) => [mm(-y0), mm(z)] as [number, number]) }] });
  const zl = () => made(`${n} lead`, 'copper', { box: [mm(q.b), L, mm(q.c)] }, { color: LEAD }), xl = () => made(`${n} lead`, 'copper', { box: [mm(q.c), L, mm(q.b)] }, { color: LEAD });
  for (let i = 0; i < q.k; i++) { body = through(body, zl(), { port: `${n} body/leads`, i, from: 'lo' }, 'tight'); body = through(body, zl(), { port: `${n} body/leads`, i, from: 'hi' }, 'tight'); }
  for (let i = 0; i < q.k; i++) { body = through(body, xl(), { port: `${n} body/side leads`, i, from: 'lo' }, 'tight'); body = through(body, xl(), { port: `${n} body/side leads`, i, from: 'hi' }, 'tight'); }
  return stack(n, 1, [{ b: body }]);
}
const ms026 = (k: number, D: number, e: number, A: number, kind: string): Qfp => ({ D, A, HD: D + 2, k, e, b: e === 0.8 ? 0.37 : e === 0.65 ? 0.32 : e === 0.5 ? 0.22 : 0.18, c: 0.15, src: `JEDEC MS-026 nominal (${kind}): ${D} × ${D} × ${A} mm body, ${D + 2} over its tips, ${k} leads a side ${e} apart` });
export const QFPS: Record<string, Qfp> = {
  'TQFP-32 (7 × 7, 0.8)': ms026(8, 7, 0.8, 1.0, 'TQFP'), 'TQFP-44 (10 × 10, 0.8)': ms026(11, 10, 0.8, 1.0, 'TQFP'), 'TQFP-48 (7 × 7, 0.5)': ms026(12, 7, 0.5, 1.0, 'TQFP'),
  'TQFP-64 (10 × 10, 0.5)': ms026(16, 10, 0.5, 1.0, 'TQFP'), 'TQFP-80 (12 × 12, 0.5)': ms026(20, 12, 0.5, 1.0, 'TQFP'), 'TQFP-100 (14 × 14, 0.5)': ms026(25, 14, 0.5, 1.0, 'TQFP'),
  'LQFP-48 (7 × 7, 0.5)': ms026(12, 7, 0.5, 1.4, 'LQFP'), 'LQFP-64 (10 × 10, 0.5)': ms026(16, 10, 0.5, 1.4, 'LQFP'), 'LQFP-100 (14 × 14, 0.5)': ms026(25, 14, 0.5, 1.4, 'LQFP'),
  'LQFP-144 (20 × 20, 0.5)': ms026(36, 20, 0.5, 1.4, 'LQFP'), 'LQFP-176 (24 × 24, 0.5)': ms026(44, 24, 0.5, 1.4, 'LQFP'),
};
const QFP: PartFamily<Qfp> = {
  id: 'piece.qfp', name: 'QFP package (TQFP, LQFP)', gloss: 'A quad flat package (TQFP-32 to LQFP-176, JEDEC MS-026): its body and its leads out of all four sides', domains: EL, aisle: 'Electronics / Semiconductors',
  says: `A quad flat package by its pins and body (TQFP 1.0 mm, LQFP 1.4 mm thick; MS-026): its epoxy body, its leads out of all four sides (\`<pkg> body/leads\` across z, \`<pkg> body/side leads\` across x); it goes down onto a board's lands. Approximated: ${GULL_SAYS}; the leads across z 0.1 mm above its middle height and those across x below it, so no two strips cross inside the body`,
  rows: QFPS, size: 'TQFP-32 (7 × 7, 0.8)', source: 'JEDEC MS-026 outline, nominal (each row says)',
  recipe: (q, size) => quadPack(size, q),
  expect: (q) => ({ bound: bound(q.HD, q.A, q.HD), tol: 0.01, says: 'its leads\' tips across both ways, its body\'s height' }),
  tests: [T(33)],
};
/** A no-lead package: its body (D × E × A, mm), its pads (k a side, e apart, b wide, L long, 0.2 thick) under its edge
 *  (on two sides for a DFN), its exposed pad (D2 × E2) under its middle where it fits. */
type Qfn = { D: number; E: number; A: number; k: number; e: number; b: number; L: number; dual?: true; ep: [number, number]; src: string };
function noLead(n: string, q: Qfn): { block: Block; ep: boolean } {
  const t = 0.2, reach = Math.hypot(q.b / 2, q.L / 2), inz = q.E / 2 - Math.max(q.L / 2, reach + 0.001), inx = q.D / 2 - Math.max(q.L / 2, reach + 0.001), xs = span(q.k, q.e);
  const pads: [number, number][] = [...xs.map((x) => [x, -inz] as [number, number]), ...xs.map((x) => [x, inz] as [number, number]), ...(q.dual ? [] : [...xs.map((z) => [-inx, z] as [number, number]), ...xs.map((z) => [inx, z] as [number, number])])];
  // (its exposed pad drawn where its corners stay within its body's edge: the line's slot is round)
  const ep = Math.hypot(q.ep[0] / 2, q.ep[1] / 2) < Math.min(q.D, q.E) / 2 - 0.001;
  let body = made(`${n} body`, 'epoxy', { box: B(q.D, q.A, q.E) }, { color: BLACK, patterns: [{ name: 'pads', points: xz(pads) }, ...(ep ? [{ name: 'exposed pad', points: [[0, 0]] as [number, number][] }] : [])] });
  const along = 2 * q.k;
  body = upThrough(body, `${n} body/pads`, pads.length, (i) => (i < along ? strip(`${n} pad`, q.b, t, q.L, 'copper', TIN) : strip(`${n} pad`, q.L, t, q.b, 'copper', TIN)));
  if (ep) body = through(body, strip(`${n} exposed pad`, q.ep[0], t, q.ep[1], 'copper', TIN), { port: `${n} body/exposed pad`, from: 'lo' }, 'tight');
  return { block: stack(n, 1, [{ b: body }]), ep };
}
const mo220 = (k: number, D: number, ep: number, e = 0.5): Qfn => ({ D, E: D, A: 0.85, k, e, b: e === 0.5 ? 0.25 : 0.2, L: 0.4, ep: [ep, ep], src: `JEDEC MO-220 nominal (QFN): ${D} × ${D} × 0.85 mm, ${k} pads a side ${e} apart (0.25 × 0.4), its exposed pad ${ep} mm` });
const mo229 = (k: number, D: number, e: number, ep: [number, number]): Qfn => ({ D, E: D, A: 0.85, k, e, b: e === 0.65 ? 0.3 : 0.25, L: 0.4, dual: true, ep, src: `JEDEC MO-229 nominal (DFN): ${D} × ${D} × 0.85 mm, ${k} pads a side ${e} apart, its exposed pad ${ep.join(' × ')} mm` });
export const QFNS: Record<string, Qfn> = {
  'QFN-16 (3 × 3)': mo220(4, 3, 1.7), 'QFN-20 (4 × 4)': mo220(5, 4, 2.6), 'QFN-24 (4 × 4)': mo220(6, 4, 2.7), 'QFN-28 (5 × 5)': mo220(7, 5, 3.25), 'QFN-32 (5 × 5)': mo220(8, 5, 3.45),
  'QFN-40 (6 × 6)': mo220(10, 6, 4.1), 'QFN-48 (7 × 7)': mo220(12, 7, 5.15), 'QFN-56 (8 × 8)': mo220(14, 8, 6.0), 'QFN-64 (9 × 9)': mo220(16, 9, 7.15),
  'DFN-6 (2 × 2)': mo229(3, 2, 0.65, [1.0, 1.6]), 'DFN-8 (2 × 2)': mo229(4, 2, 0.5, [0.9, 1.6]), 'DFN-8 (3 × 3)': mo229(4, 3, 0.65, [1.6, 2.4]), 'DFN-10 (3 × 3)': mo229(5, 3, 0.5, [1.65, 2.4]),
};
const QFN: PartFamily<Qfn> = {
  id: 'piece.qfn', name: 'QFN or DFN package', gloss: 'A no-lead package (QFN-16 to 64, JEDEC MO-220; DFN-6 to 10, MO-229): its body, its pads under its edge and its exposed pad', domains: EL, aisle: 'Electronics / Semiconductors',
  says: 'A no-lead package by its pins and body (QFN on four sides, DFN on two): its epoxy body with its pads let into its underside along its edge (`<pkg> body/pads`, each a line up through it) and its exposed pad under its middle (`<pkg> body/exposed pad`); it goes down onto a board\'s lands. Approximated: each pad drawn just inside its body\'s edge (a line\'s slot is round, so a pad\'s corners keep within it), its exposed pad drawn only where its corners stay within its body\'s edge (QFN-48 and larger: not drawn)',
  rows: QFNS, size: 'QFN-16 (3 × 3)', source: 'JEDEC MO-220 and MO-229 outlines, nominal (each row says)',
  recipe: (q, size) => noLead(size, q).block,
  expect: (q) => ({ bound: bound(q.D, q.A, q.E), tol: 0.01, says: 'its body (its pads let into it)' }),
  tests: [T(18)],
};
/** A through-hole power package: its body (E wide, D high, A thick, mm), its head above with its hole (Ø P) across it,
 *  its three leads (b × c, e apart) L below. */
type Topw = { E: number; D: number; A: number; head: number; P: number; e: number; b: number; c: number; L: number; src: string };
export const TO_POWER: Record<string, Topw> = {
  'TO-126 (SOT-32)': { E: 7.8, D: 7.1, A: 2.7, head: 3.9, P: 3.2, e: 2.28, b: 0.8, c: 0.5, L: 15.5, src: 'TO-126 outline as makers\' drawings give it (7.8 × 11.0 × 2.7 mm, hole Ø3.2), typical' },
  'TO-220F (TO-220FP)': { E: 10.16, D: 9.0, A: 4.7, head: 6.8, P: 3.2, e: 2.54, b: 0.8, c: 0.5, L: 13.0, src: 'TO-220 full-pack (ITO-220) as makers\' drawings give it (10.16 × 15.8 × 4.7 mm, hole Ø3.2), typical' },
  'TO-247 (TO-247AC)': { E: 15.9, D: 13.0, A: 5.0, head: 7.9, P: 3.6, e: 5.45, b: 1.2, c: 0.6, L: 20.0, src: 'JEDEC TO-247AC as makers\' drawings give it (15.9 × 20.9 × 5.0 mm, hole Ø3.6, leads 5.45 apart), typical' },
  'TO-3P (SOT-93)': { E: 15.6, D: 12.0, A: 4.8, head: 8.0, P: 3.2, e: 5.45, b: 1.0, c: 0.6, L: 20.0, src: 'TO-3P outline as makers\' drawings give it (15.6 × 20.0 × 4.8 mm, hole Ø3.2), typical' },
  'TO-264 (TO-264AA)': { E: 20.0, D: 18.0, A: 5.0, head: 8.0, P: 3.3, e: 5.45, b: 1.2, c: 0.6, L: 20.0, src: 'JEDEC TO-264AA as makers\' drawings give it (20 × 26 × 5 mm, hole Ø3.3), typical' },
};
const TOPOWER: PartFamily<Topw> = {
  id: 'piece.topower', name: 'TO power package (TO-126, TO-247, TO-3P)', gloss: 'A through-hole power package: its body on its three leads and its head with its mounting hole', domains: EL, aisle: 'Electronics / Semiconductors',
  says: 'A through-hole power package by its outline (TO-126, TO-220F, TO-247, TO-3P, TO-264): its three leads run up into its epoxy body (`<pkg> body/leads`; they go down a board\'s holes), its head above with its mounting hole across it (`<pkg> head/hole`, along z: a screw through it to a heat sink). Approximated: its moulding drawn as its body and its head, two blocks, its metal back within them not drawn',
  rows: TO_POWER, size: 'TO-247 (TO-247AC)', source: 'JEDEC and makers\' TO outlines (each row says)',
  recipe: (o, size) => { const body = made(`${size} body`, 'epoxy', { box: B(o.E, o.D, o.A) }, { color: BLACK, pattern: { name: 'leads', points: xz(span(3, o.e).map((x) => [x, 0] as [number, number])) } });
    const leads = downPins(body, `${size} body/leads`, 3, () => strip(`${size} lead`, o.b, o.D + o.L, o.c));
    return stack(size, 1, [{ b: leads }, { b: made(`${size} head`, 'epoxy', { box: B(o.E, o.head, o.A) }, { color: BLACK, pattern: { name: 'hole', points: [[0, 0]], face: '+z', hole: mm(o.P / 2) } }) }]); },
  expect: (o) => ({ bound: bound(o.E, o.L + o.D + o.head, o.A), tol: 0.01, says: 'its width, its leads, body and head, its thickness' }),
  tests: [T(5)],
};

// ==== LEDs and displays ==============================================================================================
/** An SMD LED: its package (L × W × H, mm): a chip LED its substrate and clear lens, a PLCC its white reflector cup with
 *  its silicone in it. */
type Smdled = { L: number; W: number; H: number; plcc: boolean; src: string };
export const SMD_LEDS: Record<string, Smdled> = {
  '0402 chip': { L: 1.0, W: 0.5, H: 0.4, plcc: false, src: 'Kingbright APHHS1005 class, typical (1.0 × 0.5 × 0.4 mm)' },
  '0603 chip': { L: 1.6, W: 0.8, H: 0.6, plcc: false, src: 'Kingbright APT1608 datasheet class, typical (1.6 × 0.8 × 0.6 mm)' },
  '0805 chip': { L: 2.0, W: 1.25, H: 0.8, plcc: false, src: 'Kingbright APT2012 class, typical (2.0 × 1.25 × 0.8 mm)' },
  '1206 chip': { L: 3.2, W: 1.6, H: 1.1, plcc: false, src: 'Kingbright APT3216 class, typical (3.2 × 1.6 × 1.1 mm)' },
  'PLCC-2 (3528)': { L: 3.5, W: 2.8, H: 1.9, plcc: true, src: 'PLCC-2 3528 (Osram TOPLED class): its code 3.5 × 2.8 mm, 1.9 high, typical' },
  'PLCC-4 (5050)': { L: 5.0, W: 5.0, H: 1.6, plcc: true, src: '5050 PLCC-6: its code 5.0 × 5.0 mm, 1.6 high, typical' },
  '2835': { L: 2.8, W: 3.5, H: 0.8, plcc: true, src: '2835 mid-power LED: its code 2.8 × 3.5 mm, 0.8 high, typical' },
  '3014': { L: 3.0, W: 1.4, H: 0.8, plcc: true, src: '3014 LED: its code 3.0 × 1.4 mm, 0.8 high, typical' },
  '5730': { L: 5.7, W: 3.0, H: 0.8, plcc: true, src: '5730 mid-power LED: its code 5.7 × 3.0 mm, 0.8 high, typical' },
  '3030': { L: 3.0, W: 3.0, H: 0.6, plcc: true, src: '3030 LED: its code 3.0 × 3.0 mm, 0.6 high, typical' },
  'WS2812B (5050)': { L: 5.0, W: 5.0, H: 1.6, plcc: true, src: 'Worldsemi WS2812B datasheet (5.0 × 5.0 × 1.6 mm), its driver in the package' },
  'SK6812 MINI (3535)': { L: 3.5, W: 3.5, H: 1.45, plcc: true, src: 'Opsco SK6812 MINI datasheet class (3.5 × 3.5 × 1.45 mm), typical' },
};
const LEDSMD: PartFamily<Smdled> = {
  id: 'piece.ledsmd', name: 'SMD LED', gloss: 'A surface-mount LED: a chip LED (0402 to 1206) or a PLCC package (3528, 5050, 2835, WS2812B…)', domains: [...EL, 'everyday'], aisle: 'Electronics / Optoelectronics',
  says: 'An SMD LED by its package: a chip LED (0402, 0603, 0805, 1206) its two terminations and its substrate with its clear lens on top; a PLCC LED (3528, 5050, 2835, 3014, 5730, 3030, the WS2812B and SK6812 addressable ones) its white reflector cup with its silicone into its cavity, its two pads\' lines down through its ends (`<pkg> LED cup/pads`; a chip LED\'s `<pkg> LED chip terminal 1/pad`). It goes down onto a board\'s lands. Its die and bond wire not drawn; a PLCC\'s leads under its cup not drawn',
  rows: SMD_LEDS, size: 'PLCC-4 (5050)', source: 'makers\' package drawings and the size codes (each row says)',
  recipe: (l, size) => { const n = `${size} LED`;
    if (!l.plcc) { const e = l.L * 0.2; return stack(n, 1, [{ b: chip(`${n} chip`, l.L, l.W, l.H / 2, e, 'ceramic', WHITE) }, { b: made(`${n} lens`, 'epoxy', { box: B(l.L - 2 * e, l.H / 2, l.W) }, { color: 0xf8f0c0 }) }]); }
    const wall = Math.min(0.4, l.W * 0.15), floor = l.H * 0.3, cup = made(`${n} cup`, 'pa66', { case: [mm(l.L), mm(l.H), mm(l.W), mm(wall), mm(floor)] }, { color: WHITE, pattern: { name: 'pads', points: xz([[-l.L / 2 + wall / 2, 0], [l.L / 2 - wall / 2, 0]]) } });
    return stack(n, 1, [{ b: into(cup, `${n} cup/cavity`, made(`${n} silicone`, 'silicone', { box: B(l.L - 2 * wall, l.H - floor, l.W - 2 * wall) }, { color: 0xf8f0c0 }), 'touch') }]); },
  expect: (l) => ({ bound: bound(l.L, l.H, l.W), tol: 0.01, says: 'its package, as its code or drawing gives it' }),
  tests: [T(2)],
};
/** A through-hole LED: its flange (Ø F, 1.0 high), its body (Ø d, its height to the lens, a dome on top or flat), two
 *  leads 2.54 apart, 25 mm below it (typical). */
type Thled = { d: number; F: number; H: number; dome: boolean; box?: [number, number]; s?: number; src: string };
const LLEAD = 25;
export const TH_LEDS: Record<string, Thled> = {
  '1.8 mm (T-¾)': { d: 1.8, F: 2.3, H: 2.9, dome: true, s: 1.27, src: 'the 1.8 mm (T-¾) LED, typical of makers\' drawings (Ø1.8, 2.9 high, flange Ø2.3; its leads 1.27 apart where they leave it)' },
  '3 mm flat top': { d: 3.0, F: 3.6, H: 4.2, dome: false, src: 'the 3 mm flat-top LED, typical (Ø3.0, 4.2 high, flange Ø3.6)' },
  '5 mm flat top': { d: 5.0, F: 5.8, H: 6.0, dome: false, src: 'the 5 mm flat-top LED, typical (Ø5.0, 6.0 high, flange Ø5.8)' },
  '5 mm straw hat': { d: 4.8, F: 5.6, H: 5.3, dome: true, src: 'the 5 mm straw-hat LED, typical (Ø4.8, 5.3 high, flange Ø5.6)' },
  '8 mm round': { d: 8.0, F: 9.0, H: 11.6, dome: true, src: 'the 8 mm round LED, typical of makers\' drawings (Ø8.0, 11.6 high, flange Ø9.0)' },
  '10 mm round': { d: 10.0, F: 11.0, H: 13.6, dome: true, src: 'the 10 mm round LED, typical of makers\' drawings (Kingbright L-813 class: Ø10, 13.6 high, flange Ø11)' },
  '2 × 5 × 7 rectangular': { d: 0, F: 0, H: 7.0, dome: false, box: [5.0, 2.0], src: 'the 2 × 5 × 7 mm rectangular LED, typical' },
};
const LEDTH: PartFamily<Thled> = {
  id: 'piece.ledth', name: 'LED (1.8, 8, 10 mm, flat top, straw hat, rectangular)', gloss: 'A through-hole LED by its size and shape: its flange on its two leads, its body and lens', domains: [...EL, 'everyday'], aisle: 'Electronics / Optoelectronics',
  says: 'A through-hole LED by its size and shape (1.8 mm, 3 and 5 mm flat top, 5 mm straw hat, 8 and 10 mm round, 2 × 5 × 7 rectangular; the round 3 and 5 mm are piece.led): its two leads (2.54 mm apart, the 1.8 mm\'s 1.27; 25 mm below it, typical) run up into its flange (`<size> LED flange/leads`), its body and its domed or flat lens on top; its leads go down a board\'s holes, its body up a panel\'s hole. Its die inside not drawn',
  rows: TH_LEDS, size: '10 mm round', source: 'makers\' LED drawings, typical (each row says)',
  recipe: (l, size) => { const n = `${size} LED`, look = { color: 0xe83030 };
    if (l.box) { const body = made(`${n} body`, 'epoxy', { box: B(l.box[0], l.H, l.box[1]) }, { ...look, pattern: { name: 'leads', points: xz([[-1.27, 0], [1.27, 0]]) } });
      return stack(n, 1, [{ b: downPins(body, `${n} body/leads`, 2, () => strip(`${n} lead`, 0.5, l.H + LLEAD, 0.5)) }]); }
    const flange = made(`${n} flange`, 'epoxy', { cyl: [mm(l.F / 2), mm(1.0)] }, { ...look, pattern: { name: 'leads', points: xz([[-(l.s ?? P) / 2, 0], [(l.s ?? P) / 2, 0]]) } });
    const legs = downPins(flange, `${n} flange/leads`, 2, () => strip(`${n} lead`, (l.s ?? P) < 2 ? 0.4 : 0.5, 1.0 + LLEAD, (l.s ?? P) < 2 ? 0.4 : 0.5));
    const items = [{ b: legs }, { b: made(`${n} body`, 'epoxy', { cyl: [mm(l.d / 2), mm(l.H - 1.0 - (l.dome ? l.d / 2 : 0))] }, look) }, ...(l.dome ? [{ b: made(`${n} lens`, 'epoxy', { dome: [mm(l.d / 2)] }, look) }] : [])];
    return stack(n, 1, items); },
  expect: (l) => ({ bound: l.box ? bound(l.box[0], l.H + LLEAD, l.box[1]) : bound(l.F, l.H + LLEAD, l.F), tol: 0.01, says: 'its flange across, its height and leads' }),
  tests: [T(5)],
};
/** An LED display: its body (L × W × H, mm), its pins in two rows (n a row, 2.54 apart, the rows s apart), 4 mm below. */
type Disp = { L: number; W: number; H: number; n: number; s: number; src: string };
export const LED_DISPLAYS: Record<string, Disp> = {
  '0.56" 1 digit (SA56-11)': { L: 12.7, W: 19.0, H: 8.0, n: 5, s: 15.24, src: 'Kingbright SA56-11 datasheet (12.7 × 19.0 × 8.0 mm, 10 pins, rows 15.24 apart)' },
  '0.56" 4 digit': { L: 50.4, W: 19.0, H: 8.0, n: 6, s: 15.24, src: 'the common 0.56 in 4-digit display, typical (50.4 × 19.0 × 8.0 mm, 12 pins)' },
  '0.36" 4 digit (3461AS)': { L: 30.0, W: 14.0, H: 7.2, n: 6, s: 10.16, src: 'the common 3461AS 0.36 in 4-digit display, typical (30 × 14 × 7.2 mm, 12 pins)' },
  '0.8" 1 digit': { L: 20.0, W: 25.0, H: 8.0, n: 5, s: 20.32, src: 'the common 0.8 in single-digit display, typical' },
  '1.0" 1 digit': { L: 24.0, W: 34.0, H: 8.0, n: 5, s: 27.94, src: 'the common 1.0 in single-digit display, typical' },
  '8 × 8 matrix (1088AS)': { L: 32.0, W: 32.0, H: 8.0, n: 8, s: 27.94, src: 'the common 1088AS 3 mm 8 × 8 matrix, typical (32 × 32 × 8 mm, 16 pins)' },
  '10-segment bar (DC-10)': { L: 25.4, W: 10.16, H: 8.0, n: 10, s: 7.62, src: 'Kingbright DC-10 bar graph datasheet class (25.4 × 10.16 × 8 mm, 20 pins, rows 7.62 apart), typical' },
};
const DLEAD = 4;
const LEDDISP: PartFamily<Disp> = {
  id: 'piece.leddisplay', name: 'LED display (7-segment, matrix, bar graph)', gloss: 'A seven-segment, 8 × 8 matrix or bar-graph LED display: its body on its two rows of pins', domains: [...EL, 'everyday'], aisle: 'Electronics / Optoelectronics',
  says: 'An LED display by its kind (0.36, 0.56, 0.8, 1.0 in seven-segment, one or four digits; an 8 × 8 matrix; a 10-segment bar graph): its body on its two rows of pins (4 mm below it, typical) run up into it (`<display> body/pins`); its pins go down a board\'s holes or a DIP socket. Its segments drawn as its face, not apart',
  rows: LED_DISPLAYS, size: '0.56" 1 digit (SA56-11)', source: 'Kingbright datasheets and typical module sizes (each row says)',
  recipe: (d, size) => { const pts = span(d.n, P).flatMap((x) => [[x, -d.s / 2], [x, d.s / 2]] as [number, number][]);
    const body = made(`${size} body`, 'abs', { box: B(d.L, d.H, d.W) }, { color: 0x2a2a2a, pattern: { name: 'pins', points: xz(pts) } });
    return stack(size, 1, [{ b: downPins(body, `${size} body/pins`, pts.length, () => strip(`${size} pin`, 0.5, d.H + DLEAD, 0.3)) }]); },
  expect: (d) => ({ bound: bound(d.L, d.H + DLEAD, d.W), tol: 0.01, says: 'its body by its pins' }),
  tests: [T(11)],
};

// ==== controls: pots, trimmers, encoders, switches ===================================================================
/** A panel control: its body (round Ø d or square s, h high), its bushing (Ø bd, bh high), its shaft (Ø 6, sh above it,
 *  on a turn joint), its terminals (n, p apart, 3.5 mm below its body, typical). */
type Ctl = { d?: number; s?: number; h: number; bd: number; bh: number; sd: number; sh: number; n: number; p: number; src: string };
function panelControl(n: string, c: Ctl): Block {
  const shape = c.d ? { cyl: [mm(c.d / 2), mm(c.h)] as [number, number] } : { box: B(c.s!, c.h, c.s!) };
  const body = made(`${n} body`, 'steel-low', shape, { color: 0x9a9ea2, pattern: { name: 'terminals', points: xz(span(c.n, c.p).map((x) => [x, -(c.d ?? c.s!) * 0.3] as [number, number])) } });
  return stack(n, 1, [{ b: downPins(body, `${n} body/terminals`, c.n, () => strip(`${n} terminal`, 0.8, c.h + 3.5, 0.3)) }, { b: made(`${n} bushing`, 'brass', { cyl: [mm(c.bd / 2), mm(c.bh)] }, { color: 0xc9a54a }) },
    { b: made(`${n} shaft`, 'al-6061', { cyl: [mm(c.sd / 2), mm(c.sh)] }, { joint: joint(`${n} shaft`, { turn: true }) }) }]);
}
export const PANEL_POTS: Record<string, Ctl> = {
  '9 mm (Alps RK09K)': { s: 9.5, h: 6.5, bd: 7.0, bh: 5.0, sd: 6.0, sh: 15.0, n: 3, p: 2.5, src: 'Alps RK09K datasheet class: 9.5 mm square body, M7 bushing 5 mm, Ø6 shaft 15 mm, terminals 2.5 apart; typical' },
  '11 mm (Alps RK11K)': { s: 11.0, h: 7.0, bd: 7.0, bh: 5.0, sd: 6.0, sh: 15.0, n: 3, p: 2.5, src: 'Alps RK11K class, typical' },
  '14 mm (Alps RK14K)': { s: 14.0, h: 8.0, bd: 7.0, bh: 7.0, sd: 6.0, sh: 15.0, n: 3, p: 5.0, src: 'Alps RK14K class, typical' },
  '24 mm (Bourns PDB241)': { d: 24.0, h: 9.5, bd: 9.5, bh: 7.0, sd: 6.0, sh: 18.0, n: 3, p: 5.0, src: 'Bourns PDB24 class: Ø24 body, M9.5 bushing, Ø6 shaft; typical' },
  '27 mm (Alps RK27)': { s: 27.0, h: 12.0, bd: 9.0, bh: 7.0, sd: 6.0, sh: 20.0, n: 3, p: 5.0, src: 'Alps RK27 class: 27 mm square body, M9 bushing, Ø6 shaft; typical' },
};
const PANELPOT: PartFamily<Ctl> = {
  id: 'piece.panelpot', name: 'Panel potentiometer (9 to 27 mm)', gloss: 'A rotary panel potentiometer by its body size: its terminals, body, bushing and a shaft that turns', domains: [...EL, 'controls'], aisle: 'Electronics / Controls',
  says: 'A rotary panel potentiometer by its body (9, 11, 14, 24, 27 mm; the 16 mm is piece.pot): its three terminals down through its body (`<pot> body/terminals`, down a board\'s holes), its threaded bushing (up a panel\'s hole, its thread not drawn) and its shaft on top on its wiper\'s turn joint (`<pot> shaft/axis`, a knob over it). Its track and wiper inside not drawn',
  rows: PANEL_POTS, size: '9 mm (Alps RK09K)', source: 'Alps and Bourns datasheet classes, typical (each row says)',
  envelope: 'its body is its outline (its track, wiper and case inside not drawn)',
  recipe: (c, size) => panelControl(`${size} pot`, c),
  expect: (c) => { const w = c.d ?? c.s!; return { bound: bound(w, 3.5 + c.h + c.bh + c.sh, w), tol: 0.01, says: 'its body across, its terminals, body, bushing and shaft' }; },
  tests: [T(6)],
};
export const ENCODERS: Record<string, Ctl> = {
  'EC11E (with switch)': { s: 11.7, h: 6.5, bd: 7.0, bh: 7.0, sd: 6.0, sh: 13.0, n: 3, p: 2.5, src: 'Alps EC11E datasheet class: 11.7 mm body, M7 bushing, Ø6 shaft 20 mm from its seat; typical' },
  'EC11 (no switch)': { s: 11.7, h: 5.0, bd: 7.0, bh: 7.0, sd: 6.0, sh: 13.0, n: 3, p: 2.5, src: 'Alps EC11 class, typical' },
  'EC12E': { s: 12.4, h: 6.5, bd: 7.0, bh: 5.0, sd: 6.0, sh: 13.0, n: 3, p: 2.5, src: 'Alps EC12E class, typical' },
  'PEC11R (Bourns)': { s: 12.5, h: 7.0, bd: 7.0, bh: 7.0, sd: 6.0, sh: 13.0, n: 3, p: 2.5, src: 'Bourns PEC11R class (12.5 mm body), typical' },
};
const ENCODER: PartFamily<Ctl> = {
  id: 'piece.encoder', name: 'Rotary encoder (EC11)', gloss: 'An incremental rotary encoder (EC11, EC12, PEC11): its pins, body, bushing and a shaft that turns', domains: [...EL, 'controls'], aisle: 'Electronics / Controls',
  says: 'An incremental rotary encoder by its part (EC11E with its push switch, EC11, EC12E, PEC11R): its A, common and B pins down through its body (`<encoder> body/terminals`), its bushing and its shaft on top on its turn joint (`<encoder> shaft/axis`, a knob over it). Its detents, contacts and switch pins not drawn',
  rows: ENCODERS, size: 'EC11E (with switch)', source: 'Alps and Bourns encoder datasheet classes, typical (each row says)',
  envelope: 'its body is its outline (its code wheel and contacts inside not drawn)',
  recipe: (c, size) => panelControl(`${size} encoder`, c),
  expect: (c) => { const w = c.d ?? c.s!; return { bound: bound(w, 3.5 + c.h + c.bh + c.sh, w), tol: 0.01, says: 'its body across, its pins, body, bushing and shaft' }; },
  tests: [T(6)],
};
/** A trimmer: its body (L × W × H, mm), its adjusting screw (Ø) on top, three pins (p apart), 4 mm below. */
type Trim = { L: number; W: number; H: number; sd: number; p: number; src: string };
export const TRIMMERS: Record<string, Trim> = {
  '3296W': { L: 9.53, W: 4.83, H: 10.03, sd: 2.2, p: 2.54, src: 'Bourns 3296 datasheet class (9.53 × 4.83 × 10.03 mm, 25 turns, pins 2.54 apart), typical' },
  '3296Y': { L: 9.53, W: 4.83, H: 10.03, sd: 2.2, p: 2.54, src: 'Bourns 3296Y (side pins in a zigzag in fact; drawn in a row), typical' },
  '3299W': { L: 9.53, W: 6.1, H: 10.03, sd: 2.2, p: 2.54, src: 'Bourns 3299 class (9.53 × 6.1 × 10 mm), typical' },
  '3362P': { L: 6.86, W: 4.5, H: 7.0, sd: 3.0, p: 2.54, src: 'Bourns 3362P class (6.86 mm square, one turn), typical' },
  '3386P': { L: 9.5, W: 4.8, H: 10.0, sd: 3.0, p: 2.54, src: 'Bourns 3386 class, typical' },
  '3006P': { L: 19.05, W: 4.8, H: 6.6, sd: 2.2, p: 5.08, src: 'Bourns 3006 class (19 mm rectangular, 15 turns), typical' },
};
const TRIMMER: PartFamily<Trim> = {
  id: 'piece.trimmer', name: 'Trimmer potentiometer', gloss: 'A trimming potentiometer (Bourns 3296, 3299, 3362, 3386, 3006): its body, its adjusting screw and three pins', domains: [...EL, 'controls'], aisle: 'Electronics / Controls',
  says: 'A trimming potentiometer by its part: its three pins down through its body (`<trimmer> body/pins`, 4 mm below it, typical), its adjusting screw on top on its turn joint (`<trimmer> screw/axis`, a screwdriver down it). Its element and wiper inside not drawn',
  rows: TRIMMERS, size: '3296W', source: 'Bourns trimmer datasheet classes, typical (each row says)',
  envelope: 'its body is its outline (its element inside not drawn)',
  recipe: (t, size) => { const n = `${size} trimmer`, body = made(`${n} body`, 'pbt', { box: B(t.L, t.H, t.W) }, { color: 0x2050a0, pattern: { name: 'pins', points: xz(span(3, t.p).map((x) => [x, 0] as [number, number])) } });
    return stack(n, 1, [{ b: downPins(body, `${n} body/pins`, 3, () => strip(`${n} pin`, 0.5, t.H + 4, 0.5)) }, { b: made(`${n} screw`, 'brass', { cyl: [mm(t.sd / 2), mm(0.8)] }, { color: 0xc9a54a, joint: joint(`${n} screw`, { turn: true }) }) }]); },
  expect: (t) => ({ bound: bound(t.L, 4 + t.H + 0.8, t.W), tol: 0.01, says: 'its body by its pins and screw' }),
  tests: [T(5)],
};
/** A rocker switch: its bezel (L × W, 2.5 thick), its body below (the panel's cut-out, D deep), its rocker on top (6
 *  high), its quick-connect tabs (n, tw × 0.8, p apart, 8 mm below it: 4.8 mm, a mini's 2.8, typical). */
type Rock = { L: number; W: number; cl: number; cw: number; D: number; n: number; p: number; tw: number; src: string };
export const ROCKERS: Record<string, Rock> = {
  'KCD1 (2 pin)': { L: 21.0, W: 15.0, cl: 19.0, cw: 13.0, D: 12.0, n: 2, p: 5.0, tw: 4.8, src: 'the KCD1 rocker (21 × 15 mm bezel, 19 × 13 mm cut-out), typical of makers\' sheets' },
  'KCD1 (3 pin)': { L: 21.0, W: 15.0, cl: 19.0, cw: 13.0, D: 12.0, n: 3, p: 5.0, tw: 4.8, src: 'the KCD1 SPDT rocker, typical' },
  'KCD3 (4 pin, lit)': { L: 31.0, W: 25.0, cl: 28.5, cw: 22.0, D: 18.0, n: 4, p: 6.0, tw: 4.8, src: 'the KCD3 DPST lit rocker (31 × 25 mm bezel, 28.5 × 22 mm cut-out), typical' },
  'KCD11 (mini)': { L: 15.0, W: 10.0, cl: 13.0, cw: 8.5, D: 10.0, n: 2, p: 4.0, tw: 2.8, src: 'the KCD11 mini rocker (15 × 10 mm bezel), typical' },
};
const ROCKER: PartFamily<Rock> = {
  id: 'piece.rocker', name: 'Rocker switch', gloss: 'A snap-in rocker switch (KCD1, KCD3, KCD11): its tabs, body, bezel and rocker', domains: [...EL, 'everyday'], aisle: 'Electronics / Controls',
  says: 'A snap-in rocker switch by its size: its quick-connect tabs down through its body (`<switch> body/tabs`, a 4.8 mm (a mini\'s 2.8 mm) receptacle over each), its body (the panel\'s cut-out: it goes up a cut-out from behind), its bezel and its rocker on top on a turn joint across it. Its snap-in latches, contacts and lamp not drawn; its rocker drawn flat in its middle place',
  rows: ROCKERS, size: 'KCD1 (2 pin)', source: 'rocker makers\' sheets, typical (each row says)',
  envelope: 'its body is its outline (its contacts and spring inside not drawn)',
  recipe: (r, size) => { const n = `${size} rocker`, body = made(`${n} body`, 'pa66', { box: B(r.cl, r.D, r.cw) }, { color: BLACK, pattern: { name: 'tabs', points: xz(span(r.n, r.p).map((x) => [x, 0] as [number, number])) } });
    return stack(n, 1, [{ b: downPins(body, `${n} body/tabs`, r.n, () => strip(`${n} tab`, r.tw, r.D + 8, 0.8, 'brass', 0xc9a54a)) }, { b: made(`${n} bezel`, 'pa66', { box: B(r.L, 2.5, r.W) }, { color: BLACK }) }, { b: made(`${n} rocker`, 'pa66', { box: B(r.cl - 2, 6, r.cw - 2) }, { color: 0x202020 }) }]); },
  expect: (r) => ({ bound: bound(r.L, 8 + r.D + 2.5 + 6, r.W), tol: 0.01, says: 'its bezel across, its tabs, body, bezel and rocker' }),
  tests: [T(5)],
};
/** A slide switch: its body (L × W × H, mm), its lever (l × w, h above it), its pins (n a row, rows, p apart), 3.5 below. */
type Slide = { L: number; W: number; H: number; lever: [number, number, number]; n: number; rows: number; p: number; src: string };
export const SLIDES: Record<string, Slide> = {
  'SS12D00 (SPDT)': { L: 8.6, W: 3.6, H: 3.6, lever: [1.5, 1.5, 4.0], n: 3, rows: 1, p: 2.54, src: 'the SS12D00G3 SPDT slide switch (8.6 × 3.6 × 3.6 mm, its lever 4 mm, pins 2.54 apart), typical of makers\' sheets' },
  'SS12F15 (SPDT, panel)': { L: 12.0, W: 6.0, H: 6.0, lever: [2.0, 2.0, 5.0], n: 3, rows: 1, p: 4.0, src: 'the SS12F15 slide switch (12 × 6 × 6 mm, pins 4.0 apart), typical' },
  'SS22F32 (DPDT)': { L: 12.5, W: 6.5, H: 6.5, lever: [2.0, 2.0, 5.0], n: 3, rows: 2, p: 3.0, src: 'the SS22 DPDT slide switch (12.5 × 6.5 mm, 2 × 3 pins), typical' },
  'MSK-12C02 (SMD)': { L: 6.7, W: 2.6, H: 1.4, lever: [1.3, 1.0, 1.5], n: 3, rows: 1, p: 1.5, src: 'the MSK-12C02 SMD slide switch (6.7 × 2.6 × 1.4 mm), typical' },
};
const SLIDE: PartFamily<Slide> = {
  id: 'piece.slideswitch', name: 'Slide switch', gloss: 'A slide switch (SS12D00, SS12F15, SS22, MSK-12C02): its body, lever and pins', domains: [...EL, 'everyday'], aisle: 'Electronics / Controls',
  says: 'A slide switch by its part: its pins down through its body (`<switch> body/pins`, 3.5 mm below it; down a board\'s holes), its lever on top drawn in its middle place. Its contacts and detent not drawn',
  rows: SLIDES, size: 'SS12D00 (SPDT)', source: 'slide switch makers\' sheets, typical (each row says)',
  envelope: 'its body is its outline (its contacts inside not drawn)',
  recipe: (s, size) => { const n = `${size} switch`, pts = span(s.n, s.p).flatMap((x) => span(s.rows, s.W * 0.5).map((z) => [x, z] as [number, number]));
    const body = made(`${n} body`, 'steel-low', { box: B(s.L, s.H, s.W) }, { color: 0xb8bcc2, pattern: { name: 'pins', points: xz(pts) } });
    return stack(n, 1, [{ b: downPins(body, `${n} body/pins`, pts.length, () => strip(`${n} pin`, 0.5, s.H + 3.5, 0.3)) }, { b: made(`${n} lever`, 'pom', { box: B(s.lever[0], s.lever[2], s.lever[1]) }, { color: BLACK }) }]); },
  expect: (s) => ({ bound: bound(s.L, 3.5 + s.H + s.lever[2], s.W), tol: 0.01, says: 'its body by its pins and lever' }),
  tests: [T(5)],
};
/** A DIP switch of n positions (CTS 206 class): its body (2.54 n + 0.5 long, 9.8 wide, 5.6 high), its actuators 1 mm
 *  above it, its pins in two rows 7.62 apart, 3.5 below. */
type Dip = { n: number };
export const DIP_SWITCHES: Record<string, Dip> = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((n) => [`${n} position${n > 1 ? 's' : ''}`, { n }]));
const dipL = (n: number) => 2.54 * n + 0.5;
const DIPSW: PartFamily<Dip> = {
  id: 'piece.dipswitch', name: 'DIP switch', gloss: 'A DIP switch by its positions (1 to 12): its body, its actuators and its two rows of pins', domains: [...EL, 'controls'], aisle: 'Electronics / Controls',
  says: 'A DIP switch by its positions (1 to 10, 12; 2.54 mm apart, its rows 7.62 mm apart, as a DIP IC\'s): its pins down through its body (`<switch> body/pins`, down a board\'s holes or a DIP socket), each actuator up through it to stand 1 mm above it (`<switch> body/actuators`). Its contacts not drawn; its actuators drawn in their middle place',
  rows: DIP_SWITCHES, size: '4 positions', source: 'the CTS 206 class of DIP switch, typical (2.54 n + 0.5 × 9.8 × 5.6 mm)',
  cannot: (d) => (d.n >= 1 && d.n <= 12 ? null : 'DIP switches come in 1 to 12 positions'),
  recipe: (d, size) => { const n = `${size} DIP switch`, xs = span(d.n, P), pins = xs.flatMap((x) => [[x, -3.81], [x, 3.81]] as [number, number][]);
    let body = made(`${n} body`, 'pbt', { box: B(dipL(d.n), 5.6, 9.8) }, { color: 0x2050a0, patterns: [{ name: 'pins', points: xz(pins) }, { name: 'actuators', points: xz(xs.map((x) => [x, 0] as [number, number])) }] });
    body = downPins(body, `${n} body/pins`, pins.length, () => strip(`${n} pin`, 0.5, 5.6 + 3.5, 0.25));
    return stack(n, 1, [{ b: upThrough(body, `${n} body/actuators`, d.n, () => strip(`${n} actuator`, 1.2, 5.6 + 1.0, 2.0, 'pom', WHITE)) }]); },
  expect: (d) => ({ bound: bound(dipL(d.n), 3.5 + 5.6 + 1.0, 9.8), tol: 0.01, says: 'its body by its pins and actuators' }),
  tests: [T(13)],
};

// ==== connectors =====================================================================================================
/** A two-contact power connector (Amass XT): its housing (W × H × L, its contacts along y), its contacts (Ø, apart),
 *  a male's pins standing out its front (`out`), a female's sockets and solder cups out its back. */
type Xt = { W: number; H: number; L: number; d: number; s: number; male: boolean; out: number; src: string };
export const XTS: Record<string, Xt> = {
  'XT30 male': { W: 10.2, H: 5.0, L: 11.0, d: 2.0, s: 5.0, male: true, out: 5.0, src: 'Amass XT30 drawing class (10.2 × 5.0 mm housing, Ø2 contacts 5 mm apart), typical' },
  'XT30 female': { W: 10.2, H: 5.0, L: 11.0, d: 2.0, s: 5.0, male: false, out: 4.0, src: 'Amass XT30 class, typical' },
  'XT60 male': { W: 15.6, H: 8.1, L: 16.0, d: 3.5, s: 7.2, male: true, out: 7.0, src: 'Amass XT60 drawing class (15.6 × 8.1 mm housing, Ø3.5 contacts 7.2 mm apart), typical' },
  'XT60 female': { W: 15.6, H: 8.1, L: 16.0, d: 3.5, s: 7.2, male: false, out: 5.0, src: 'Amass XT60 class, typical' },
  'XT90 male': { W: 21.0, H: 10.8, L: 21.0, d: 4.5, s: 10.9, male: true, out: 8.0, src: 'Amass XT90 drawing class (21 × 10.8 mm housing, Ø4.5 contacts 10.9 mm apart), typical' },
  'XT90 female': { W: 21.0, H: 10.8, L: 21.0, d: 4.5, s: 10.9, male: false, out: 6.0, src: 'Amass XT90 class, typical' },
};
const XT: PartFamily<Xt> = {
  id: 'piece.xt', name: 'XT power connector (XT30, XT60, XT90)', gloss: 'An Amass XT battery connector, male or female: its housing and its two contacts', domains: [...EL, 'energy', 'vehicles'], aisle: 'Electronics / Connectors',
  says: 'An Amass XT power connector (XT30, XT60, XT90; male or female): its nylon housing with its two contacts along it (`<connector> housing/contacts`): a male\'s gold pins standing out of its front, a female\'s sockets with their solder cups out of its back; a male goes into a female along their contacts. Its D-shaped housing drawn square, its contacts\' slits not drawn',
  rows: XTS, size: 'XT60 male', source: 'Amass XT drawing classes, typical (each row says)',
  recipe: (x, size) => { const n = `${size}`, housing = made(`${n} housing`, 'nylon', { box: B(x.W, x.L, x.H) }, { color: 0xe8c020, pattern: { name: 'contacts', points: xz([[-x.s / 2, 0], [x.s / 2, 0]]), hole: mm(x.d / 2) } });
    const c = () => x.male ? pinRound(`${n} pin`, x.d, x.L + x.out, 'brass', 0xd8b24a) : made(`${n} socket`, 'brass', { tube: [mm(x.d / 2 - 0.4), mm(x.d / 2), mm(x.L + x.out)] }, { color: 0xd8b24a });
    return stack(n, 1, [{ b: x.male ? upThrough(housing, `${n} housing/contacts`, 2, c) : downPins(housing, `${n} housing/contacts`, 2, c) }]); },
  expect: (x) => ({ bound: bound(x.W, x.L + x.out, x.H), tol: 0.01, says: 'its housing by its contacts' }),
  tests: [T(3)],
};
/** An Anderson Powerpole housing (W square, L long) and its contact (Ø d) along it, standing out its back by `out`. */
type Pole = { W: number; L: number; d: number; out: number; src: string };
export const POWERPOLES: Record<string, Pole> = {
  'PP15/30/45': { W: 7.9, L: 24.6, d: 4.0, out: 6.0, src: 'Anderson Powerpole PP15/45 housing (0.31 × 0.31 × 0.97 in: 7.9 × 7.9 × 24.6 mm); its contact barrel typical' },
  'PP75': { W: 15.9, L: 46.0, d: 7.5, out: 10.0, src: 'Anderson Powerpole PP75 housing class, typical' },
  'PP120': { W: 19.0, L: 54.0, d: 9.0, out: 12.0, src: 'Anderson Powerpole PP120 housing class, typical' },
  'PP180': { W: 22.2, L: 63.5, d: 11.0, out: 14.0, src: 'Anderson Powerpole PP180 housing class, typical' },
};
const POWERPOLE: PartFamily<Pole> = {
  id: 'piece.powerpole', name: 'Anderson Powerpole', gloss: 'An Anderson Powerpole genderless power connector: its housing and its contact', domains: [...EL, 'energy'], aisle: 'Electronics / Connectors',
  says: 'An Anderson Powerpole housing by its size (PP15/30/45, PP75, PP120, PP180): its housing with its contact along its axis (`<size> housing/contact`), its barrel standing out of its back for the wire; two housings mate face to face, and slide together side by side. Its dovetails and the contact\'s spring not drawn',
  rows: POWERPOLES, size: 'PP15/30/45', source: 'Anderson Power Products housing sizes (each row says)',
  recipe: (p, size) => { const housing = made(`${size} housing`, 'pc', { box: B(p.W, p.L, p.W) }, { color: 0xc02020, pattern: { name: 'contact', points: [[0, 0]], hole: mm(p.d / 2) } });
    return stack(`${size} Powerpole`, 1, [{ b: downPins(housing, `${size} housing/contact`, 1, () => made(`${size} contact`, 'copper', { tube: [mm(p.d / 2 - 0.5), mm(p.d / 2), mm(p.L + p.out)] }, { color: 0xd8b24a })) }]); },
  expect: (p) => ({ bound: bound(p.W, p.L + p.out, p.W), tol: 0.01, says: 'its housing by its contact' }),
  tests: [T(2)],
};
/** A banana plug (its pin Ø d, pl long, out of its grip Ø g, gl long) or socket (its barrel's bore d, Ø g, gl long, its
 *  flange Ø f, 2 thick). */
type Banana = { d: number; pl: number; g: number; gl: number; f?: number; src: string };
export const BANANAS: Record<string, Banana> = {
  '4 mm plug': { d: 4.0, pl: 18.0, g: 10.0, gl: 30.0, src: 'the 4 mm banana plug (IEC 61010-031 test leads), its grip typical' },
  '4 mm panel socket': { d: 4.0, pl: 0, g: 8.0, gl: 26.0, f: 11.0, src: 'the 4 mm panel socket, typical (its bore 4 mm)' },
  '4 mm binding post': { d: 4.0, pl: 0, g: 10.0, gl: 32.0, f: 14.0, src: 'the 4 mm binding post, typical' },
  '2 mm plug': { d: 2.0, pl: 10.0, g: 6.0, gl: 25.0, src: 'the 2 mm banana plug, typical' },
  '2 mm panel socket': { d: 2.0, pl: 0, g: 5.0, gl: 18.0, f: 7.0, src: 'the 2 mm panel socket, typical' },
};
const BANANA: PartFamily<Banana> = {
  id: 'piece.banana', name: 'Banana plug or socket (4 mm, 2 mm)', gloss: 'A banana plug, panel socket or binding post (4 or 2 mm)', domains: [...EL, 'everyday'], aisle: 'Electronics / Connectors',
  says: 'A banana plug, panel socket or binding post (4 mm or 2 mm): a plug its pin out of its grip (`<size> pin/axis`), a socket its flange and its barrel with its bore (`<size> barrel/axis`): a plug\'s pin goes down a socket\'s bore (Through a line), a socket up a panel\'s hole. Its spring leaves and thread not drawn',
  rows: BANANAS, size: '4 mm plug', source: 'banana connector sizes (IEC 61010-031 for the 4 mm plug), typical (each row says)',
  recipe: (b, size) => b.f === undefined
    ? stack(size, 1, [{ b: pinRound(`${size} pin`, b.d, b.pl, 'brass', 0xc9a54a) }, { b: made(`${size} grip`, 'pvc', { cyl: [mm(b.g / 2), mm(b.gl)] }, { color: 0xc02020 }) }])
    : stack(size, 1, [{ b: made(`${size} flange`, 'pvc', { tube: [mm(b.d / 2), mm(b.f / 2), mm(2)] }, { color: 0xc02020 }) }, { b: made(`${size} barrel`, 'brass', { tube: [mm(b.d / 2), mm(b.g / 2), mm(b.gl)] }, { color: 0xc9a54a }) }]),
  expect: (b) => ({ bound: b.f === undefined ? bound(b.g, b.pl + b.gl, b.g) : bound(b.f, 2 + b.gl, b.f), tol: 0.01, says: 'its grip (or flange) across, its length' }),
  tests: [T(2)],
};
/** A coaxial panel jack or plug: its body hex (af, h), its barrel (its outside Ø o — the thread's or the bayonet's — its
 *  bore Ø i, L long), its dielectric (Ø i) and centre contact (Ø c). */
type Coax = { af: number; h: number; o: number; i: number; L: number; c: number; src: string };
export const COAXES: Record<string, Coax> = {
  'BNC panel jack': { af: 11.0, h: 4.0, o: 9.5, i: 6.6, L: 12.0, c: 1.4, src: 'BNC (IEC 61169-8) panel jack: its bayonet barrel Ø9.5, 3/8-32 mounting thread; typical of makers\' drawings' },
  'SMA panel jack': { af: 7.94, h: 2.5, o: 6.35, i: 4.1, L: 9.5, c: 1.27, src: 'SMA (IEC 61169-15, MIL-STD-348): its 1/4-36 UNS thread Ø6.35, 5/16 in hex, PTFE Ø4.1; typical of makers\' drawings' },
  'SMA plug': { af: 7.94, h: 6.0, o: 6.35, i: 4.1, L: 4.0, c: 0.91, src: 'SMA plug: 5/16 in coupling nut, its pin Ø0.91; typical' },
  'RP-SMA panel jack': { af: 7.94, h: 2.5, o: 6.35, i: 4.1, L: 9.5, c: 0.91, src: 'RP-SMA jack: the SMA body, its centre a pin; typical' },
  'TNC panel jack': { af: 14.3, h: 4.0, o: 11.1, i: 7.4, L: 13.0, c: 1.4, src: 'TNC (IEC 61169-17): its 7/16-28 UNEF thread Ø11.1; typical' },
  'N panel jack': { af: 20.6, h: 5.0, o: 15.9, i: 10.3, L: 16.0, c: 3.0, src: 'N (IEC 61169-16): its 5/8-24 UNEF thread Ø15.9; typical' },
  'F panel jack': { af: 11.1, h: 3.0, o: 9.5, i: 6.0, L: 10.0, c: 1.2, src: 'F (IEC 61169-24): its 3/8-32 UNEF thread Ø9.5, 7/16 in hex; typical' },
  'RCA panel jack': { af: 11.0, h: 3.0, o: 8.0, i: 5.0, L: 9.0, c: 3.2, src: 'RCA (phono) panel jack: its sleeve Ø8.0, its centre socket for a Ø3.2 pin; typical' },
  'RCA plug': { af: 10.0, h: 18.0, o: 8.2, i: 6.0, L: 8.0, c: 3.2, src: 'RCA plug: its shell over a Ø8 sleeve, its pin Ø3.2; typical' },
};
const COAX: PartFamily<Coax> = {
  id: 'piece.coax', name: 'Coaxial connector (BNC, SMA, N, F, RCA)', gloss: 'A coaxial connector, panel jack or plug: its body, its barrel, dielectric and centre contact', domains: [...EL, 'communications'], aisle: 'Electronics / Connectors',
  says: 'A coaxial connector by its kind (BNC, SMA, RP-SMA, TNC, N, F panel jacks; an SMA plug; RCA jack and plug): its hex body, its barrel (its thread or bayonet drawn as its outside, `<kind> barrel/axis`), its dielectric in the barrel\'s bore and its centre contact along it (`<kind> contact/axis`); a jack\'s barrel goes up a panel\'s hole, a plug over a jack\'s barrel. Its threads, bayonet studs and contact slits not drawn',
  rows: COAXES, size: 'SMA panel jack', source: 'the IEC 61169 interface sizes and makers\' drawings, typical (each row says)',
  recipe: (c, size) => { const n = size, body = stack(n, 1, [{ b: made(`${n} body`, 'brass', { hex: [mm(c.af), mm(c.h)] }, { color: 0xd8b24a }) }, { b: made(`${n} barrel`, 'brass', { tube: [mm(c.i / 2), mm(c.o / 2), mm(c.L)] }, { color: 0xd8b24a }) }]);
    const withD = through(body, made(`${n} dielectric`, 'pe', { tube: [mm(c.c / 2), mm(c.i / 2), mm(c.L)] }, { color: WHITE }), { port: `${n} barrel/axis`, from: 'hi' }, 'tight');
    return through(withD, made(`${n} contact`, 'brass', { cyl: [mm(c.c / 2), mm(c.L)] }, { color: 0xe8c060 }), { port: `${n} barrel/axis`, from: 'hi' }, 'tight'); },
  expect: (c) => ({ bound: bound(Math.max(2 * c.af / Math.sqrt(3), c.o), c.h + c.L, Math.max(2 * c.af / Math.sqrt(3), c.o)), tol: 0.01, says: 'its hex across its corners both ways (a hex\'s bound is its corners\' circle\'s), its length' }),
  tests: [T(4)],
};
/** An IEC 60320 appliance coupler: an inlet (male: its shroud W × H × D with its pins in it) or a connector (female:
 *  its body with its contacts' holes). Pins (w × t, out of its floor by `pin`) at their places (mm about its middle). */
type Iec = { W: number; H: number; D: number; male: boolean; pins: [number, number][]; pw: number; pt: number; pin: number; src: string };
const C13PINS: [number, number][] = [[-7.0, 2.0], [7.0, 2.0], [0, -2.0]], C7PINS: [number, number][] = [[-3.0, 0], [3.0, 0]], C5PINS: [number, number][] = [[-4.0, 1.5], [4.0, 1.5], [0, -2.5]];
export const IECS: Record<string, Iec> = {
  'C14 inlet': { W: 27.0, H: 19.5, D: 22.0, male: true, pins: C13PINS, pw: 4.0, pt: 2.0, pin: 9.0, src: 'IEC 60320-1 sheet C14 (10 A), its pins 4 × 2 mm; its panel inlet\'s body typical (27 × 19.5 mm cut-out)' },
  'C13 connector': { W: 24.0, H: 30.5, D: 40.0, male: false, pins: C13PINS, pw: 4.0, pt: 2.0, pin: 0, src: 'IEC 60320-1 sheet C13 (10 A) connector face; its body typical' },
  'C8 inlet': { W: 15.0, H: 10.0, D: 18.0, male: true, pins: C7PINS, pw: 2.4, pt: 2.4, pin: 8.0, src: 'IEC 60320-1 sheet C8 (2.5 A, figure-8), its pins Ø2.4; its inlet typical' },
  'C7 connector': { W: 14.0, H: 8.5, D: 30.0, male: false, pins: C7PINS, pw: 2.4, pt: 2.4, pin: 0, src: 'IEC 60320-1 sheet C7 connector; its body typical' },
  'C6 inlet': { W: 20.0, H: 18.0, D: 18.0, male: true, pins: C5PINS, pw: 2.4, pt: 2.4, pin: 8.0, src: 'IEC 60320-1 sheet C6 (2.5 A, cloverleaf); its inlet typical' },
  'C5 connector': { W: 18.0, H: 16.0, D: 30.0, male: false, pins: C5PINS, pw: 2.4, pt: 2.4, pin: 0, src: 'IEC 60320-1 sheet C5 connector; its body typical' },
  'C20 inlet': { W: 31.0, H: 26.0, D: 24.0, male: true, pins: [[-6.5, 0], [6.5, 0], [0, 5.0]], pw: 2.5, pt: 6.0, pin: 9.0, src: 'IEC 60320-1 sheet C20 (16 A), its pins 6 × 2.5 mm; its inlet typical' },
  'C19 connector': { W: 27.0, H: 33.0, D: 45.0, male: false, pins: [[-6.5, 0], [6.5, 0], [0, 5.0]], pw: 2.5, pt: 6.0, pin: 0, src: 'IEC 60320-1 sheet C19 (16 A) connector; its body typical' },
};
const IEC: PartFamily<Iec> = {
  id: 'piece.iec', name: 'IEC 60320 appliance coupler (C13, C14…)', gloss: 'An IEC 60320 mains inlet or connector (C5 to C20): its body and its pins or contacts\' holes', domains: [...EL, 'everyday', 'energy'], aisle: 'Electronics / Connectors',
  says: 'An IEC 60320 appliance coupler by its sheet: an inlet (C6, C8, C14, C20) its shroud (`<sheet> shroud/cavity`, where a connector goes) with its pins up through its floor (`<sheet> shroud/pins`), standing out behind it as lugs; a connector (C5, C7, C13, C19) its body with its contacts\' holes in its face (`<sheet> body/contacts`), a cable out of its back (not drawn). Its outline drawn square (its corners\' chamfers not drawn), its contacts inside a connector not drawn',
  rows: IECS, size: 'C14 inlet', source: 'IEC 60320-1 standard sheets; panel bodies typical (each row says)',
  recipe: (c, size) => { const pts = xz(c.pins);
    if (!c.male) return stack(size, 1, [{ b: made(`${size} body`, 'pvc', { box: B(c.W, c.D, c.H) }, { color: BLACK, pattern: { name: 'contacts', points: pts, face: '+y', depth: mm(12), hole: mm(Math.max(c.pw, c.pt) / 2 + 0.3) } }) }]);
    const floor = 4.0, shroud = made(`${size} shroud`, 'pa66', { case: [mm(c.W), mm(c.D), mm(c.H), mm(1.5), mm(floor)] }, { color: BLACK, pattern: { name: 'pins', points: pts } });
    return stack(size, 1, [{ b: downPins(shroud, `${size} shroud/pins`, c.pins.length, () => strip(`${size} pin`, c.pw, c.D + 6, c.pt, 'brass', 0xc9a54a)) }]); },
  expect: (c) => ({ bound: bound(c.W, c.D + (c.male ? 6 : 0), c.H), tol: 0.01, says: 'its body by its lugs' }),
  tests: [T(4)],
};
/** A pluggable terminal block: its header (pins down through it into a board) and its plug on it, by its pitch and poles:
 *  each pole a screw from its top and a wire's entry into its front. */
type Plug = { p: number; poles: number; Hh: number; Hp: number; D: number; src: string };
const PH = (p: number, poles: number): Plug => { const small = p < 4; return { p, poles, Hh: small ? 5.5 : 8.0, Hp: small ? 9.0 : 14.0, D: small ? 8.0 : 12.0, src: `Phoenix Contact ${small ? 'MC 1,5' : 'MSTB 2,5'}/${poles}-ST-${String(p).replace('.', ',')} plug and its -G- header class: ${poles} poles ${p} mm apart; its heights and depth typical` }; };
export const PLUGGABLES: Record<string, Plug> = Object.fromEntries([3.5, 3.81, 5.0, 5.08].flatMap((p) => [2, 3, 4, 6, 8].map((n) => [`${p} mm, ${n} poles`, PH(p, n)])));
const PLUGGABLE: PartFamily<Plug> = {
  id: 'piece.pluggable', name: 'Pluggable terminal block', gloss: 'A pluggable terminal block, its PCB header and its screw plug, by its pitch (3.5 to 5.08 mm) and poles', domains: [...EL, 'controls'], aisle: 'Electronics / Terminal blocks',
  says: 'A pluggable terminal block by its pitch (3.5, 3.81, 5.0, 5.08 mm) and poles (2 to 8): its header, its pins down through it (`<block> header/pins`, down a board\'s holes), its plug on it with a screw down its top at each pole (`<block> plug/screws`) and each wire\'s entry into its front (`<block> plug/entries`, a stripped end along it). Its clamps inside and the header\'s shroud walls not drawn',
  rows: PLUGGABLES, size: '5.08 mm, 2 poles', source: 'Phoenix Contact MC 1,5 and MSTB 2,5 classes (each row says)',
  cannot: (q) => (q.poles >= 2 && q.poles <= 16 ? null : 'these blocks come in 2 to 16 poles'),
  recipe: (q, size) => { const n = `${size} block`, xs = span(q.poles, q.p), W = q.poles * q.p;
    const header = made(`${n} header`, 'pa66', { box: B(W, q.Hh, q.D) }, { color: 0x2a8a3a, pattern: { name: 'pins', points: xz(xs.map((x) => [x, 0] as [number, number])) } });
    const plug = made(`${n} plug`, 'pa66', { box: B(W, q.Hp, q.D) }, { color: 0x2a8a3a, patterns: [{ name: 'screws', points: xz(xs.map((x) => [x, -q.D * 0.2] as [number, number])) }, { name: 'entries', face: '+z', points: xs.map((x) => [mm(x), mm(-q.Hp * 0.2)] as [number, number]), depth: mm(q.D * 0.6), hole: mm(Math.min(q.p * 0.35, 1.6)) }] });
    const screwed = upThrough(plug, `${n} plug/screws`, q.poles, () => made(`${n} screw`, 'steel-low', { cyl: [mm(Math.min(q.p * 0.38, 1.6)), mm(q.Hp * 0.2)] }, { color: 0xb8bcc2 }));
    return stack(n, 1, [{ b: downPins(header, `${n} header/pins`, q.poles, () => strip(`${n} pin`, 1.0, q.Hh + 3.5, 1.0)) }, { b: screwed }]); },
  expect: (q) => ({ bound: bound(q.poles * q.p, 3.5 + q.Hh + q.Hp, q.D), tol: 0.01, says: 'its width (poles by pitch), its pins, header and plug, its depth' }),
  tests: [T(6)],
};

// ==== modules: sensor and driver breakout boards ======================================================================
/** A part seated on a board at its point i: its solder joint up through the board there, the part on its own pad of that
 *  joint's name stood onto the board joint to joint (as electronics.ts seats a board's parts). */
function seatOn(b: Block, port: string, i: number, part: Block, jn: string, t: number): Block {
  const j = through(b, made(jn, 'solder', { cyl: [mm(0.5), mm(t)] }, { color: 0xb9bcc0 }), { port, i, from: 'lo' }, 'tight');
  return onto(j, '+y', stack(part.name, 1, [{ b: made(jn, 'solder', { cyl: [mm(0.5), mm(0.1)] }, { color: 0xb9bcc0 }) }, { b: part }]), 'touch', `${jn}/axis`);
}
/** A breakout board: its PCB (L × W × t, mm) with its mounting holes (Ø hole) and its pins (standing 8.5 below it,
 *  typical) from its drawing's corner, and its parts at their places (a box, a can or a dome, mm). */
type Feat2 = { name: string; xy: [number, number]; box?: [number, number, number]; can?: [number, number]; dome?: number; mat?: string; color?: number };
type Brk = { L: number; W: number; t: number; color: number; hole: number; holes: [number, number][]; pins: [number, number][]; feats: Feat2[]; src: string };
const PINDOWN = 8.5;
function breakoutOf(name: string, r: Brk): Block {
  const on = ([x, y]: [number, number]): [number, number] => [mm(x - r.L / 2), mm(r.W / 2 - y)];
  const pts = [...r.pins, ...r.feats.map((f) => f.xy)].map(on), port = `${name} PCB/points`;
  let b = made(`${name} PCB`, 'fr4', { box: B(r.L, r.t, r.W) }, { color: r.color, patterns: [{ name: 'points', points: pts }, ...(r.holes.length ? [{ name: 'holes', points: r.holes.map(on), hole: mm(r.hole / 2) }] : [])] });
  b = downPins(b, port, r.pins.length, () => strip(`${name} pin`, 0.64, r.t + PINDOWN, 0.64, 'brass', 0xd8b24a));
  r.feats.forEach((f, k) => { const look = { color: f.color ?? BLACK }, mat = f.mat ?? 'epoxy';
    const part = f.box ? made(`${name} ${f.name}`, mat, { box: B(...f.box) }, look) : f.can ? made(`${name} ${f.name}`, mat, { cup: [mm(f.can[0] / 2), mm(f.can[1]), mm(0.4), mm(0.6)] }, look) : made(`${name} ${f.name}`, mat, { dome: [mm(f.dome! / 2)] }, look);
    b = seatOn(b, port, r.pins.length + k, part, `${name} ${f.name} joint`, r.t); });
  return stack(name, 1, [{ b }]);
}
const brkBound = (r: Brk): [number, number, number] => { let x0 = 0, x1 = r.L, y0 = 0, y1 = r.W, h = r.t;
  for (const f of r.feats) { const [w, fh, d] = f.box ?? (f.can ? [f.can[0], f.can[1], f.can[0]] : [f.dome!, f.dome! / 2, f.dome!]); x0 = Math.min(x0, f.xy[0] - w / 2); x1 = Math.max(x1, f.xy[0] + w / 2); y0 = Math.min(y0, f.xy[1] - d / 2); y1 = Math.max(y1, f.xy[1] + d / 2); h = Math.max(h, r.t + 0.1 + fh); }
  return bound(x1 - x0, h + (r.pins.length ? PINDOWN : 0), y1 - y0); };
const prow = (n: number, x0: number, y: number, p = P): [number, number][] => Array.from({ length: n }, (_, k) => [x0 + k * p, y] as [number, number]);
export const BREAKOUTS: Record<string, Brk> = {
  'HC-SR04 ultrasonic': { L: 45, W: 20, t: 1.6, color: 0x1f5fa8, hole: 1.8, holes: [[1.5, 1.5], [43.5, 1.5], [1.5, 18.5], [43.5, 18.5]], pins: prow(4, 18.69, 18.5),
    feats: [{ name: 'transmitter', xy: [9.5, 10], can: [16, 12], mat: 'al-6061', color: 0xb8bcc2 }, { name: 'receiver', xy: [35.5, 10], can: [16, 12], mat: 'al-6061', color: 0xb8bcc2 }], src: 'HC-SR04 (Elecfreaks datasheet: 45 × 20 × 15 mm, two Ø16 transducers); its holes and the transducers\' places typical' },
  'HC-SR501 PIR': { L: 32, W: 24, t: 1.6, color: 0x1f7a3a, hole: 2.0, holes: [[2.0, 12], [30.0, 12]], pins: prow(3, 13.46, 21.5),
    feats: [{ name: 'Fresnel lens', xy: [16, 12], dome: 23, mat: 'pe', color: WHITE }], src: 'HC-SR501 PIR module, typical (32 × 24 mm, two Ø2 holes 28 apart, its Ø23 lens)' },
  'GY-BME280': { L: 13, W: 10.5, t: 1.6, color: 0x6a2a8a, hole: 2.5, holes: [[2.5, 2.5]], pins: prow(4, 2.69, 9.0),
    feats: [{ name: 'BME280', xy: [8.5, 4.5], box: [2.5, 0.93, 2.5], mat: 'steel-low', color: 0xc0c4c8 }], src: 'the GY-BME280 board, typical (13 × 10.5 mm, I2C pins); the BME280 2.5 × 2.5 × 0.93 mm (Bosch datasheet)' },
  'GY-521 (MPU-6050)': { L: 21.2, W: 16.4, t: 1.6, color: 0x1f5fa8, hole: 3.0, holes: [[2.6, 13.8], [18.6, 13.8]], pins: prow(8, 1.71, 1.5),
    feats: [{ name: 'MPU-6050', xy: [10.6, 9.0], box: [4.0, 0.9, 4.0] }], src: 'the GY-521 board, typical (21.2 × 16.4 mm, holes Ø3 16 apart, 8 pins); the MPU-6050 4 × 4 × 0.9 mm QFN (InvenSense datasheet)' },
  'Pololu A4988 carrier': { L: 15.24, W: 20.32, t: 1.6, color: 0x1f7a3a, hole: 0, holes: [], pins: [...prow(8, 1.27, 1.27, P).map(([x, y]) => [y, x + 0.0] as [number, number]), ...prow(8, 1.27, 13.97).map(([x, y]) => [y, x] as [number, number])],
    feats: [{ name: 'A4988', xy: [7.62, 10.16], box: [5.0, 0.9, 5.0] }], src: 'Pololu A4988 carrier (0.6 × 0.8 in, two rows of 8 pins 0.5 in apart); the A4988 5 × 5 × 0.9 mm QFN (Allegro datasheet)' },
  'Pololu DRV8825 carrier': { L: 15.24, W: 20.32, t: 1.6, color: 0x7a1f6a, hole: 0, holes: [], pins: [...prow(8, 1.27, 1.27).map(([x, y]) => [y, x] as [number, number]), ...prow(8, 1.27, 13.97).map(([x, y]) => [y, x] as [number, number])],
    feats: [{ name: 'DRV8825', xy: [7.62, 10.16], box: [4.4, 1.2, 9.7] }], src: 'Pololu DRV8825 carrier (0.6 × 0.8 in, 2 × 8 pins); the DRV8825 HTSSOP-28 9.7 × 4.4 × 1.2 mm (TI datasheet); its heat sink (sold with it, not fitted) not drawn' },
  'L298N module': { L: 43, W: 43, t: 1.6, color: 0xa02020, hole: 3.0, holes: [[3, 3], [40, 3], [3, 40], [40, 40]], pins: prow(6, 15.15, 40.5),
    feats: [{ name: 'L298N with its heat sink', xy: [21.5, 8.0], box: [23, 25, 15], mat: 'al-6063', color: BLACK }, { name: 'motor A terminal', xy: [3.5, 21.5], box: [7.0, 10.0, 10.0], mat: 'pa66', color: 0x2050a0 }, { name: 'motor B terminal', xy: [39.5, 21.5], box: [7.0, 10.0, 10.0], mat: 'pa66', color: 0x2050a0 }, { name: 'power terminal', xy: [21.5, 36.0], box: [15.0, 10.0, 7.0], mat: 'pa66', color: 0x2050a0 }],
    src: 'the L298N dual H-bridge module, typical (43 × 43 × 27 mm, holes Ø3 at 37 × 37)' },
  'TB6612FNG carrier': { L: 20.32, W: 15.24, t: 1.6, color: 0x1f7a3a, hole: 0, holes: [], pins: [...prow(8, 1.27, 1.27), ...prow(8, 1.27, 13.97)],
    feats: [{ name: 'TB6612FNG', xy: [10.16, 7.62], box: [7.8, 1.2, 4.4] }], src: 'Pololu TB6612FNG carrier class (0.8 × 0.6 in, 2 × 8 pins); the TB6612FNG SSOP-24 typical' },
  'HC-05 Bluetooth': { L: 37.3, W: 15.5, t: 1.6, color: 0x1f5fa8, hole: 0, holes: [], pins: prow(6, 2.0, 1.5),
    feats: [{ name: 'radio module', xy: [22.0, 8.0], box: [27.0, 2.2, 13.0], color: 0x1f7a3a }], src: 'the HC-05 carrier board, typical (37.3 × 15.5 mm, 6 pins)' },
  'nRF24L01': { L: 29, W: 15, t: 1.0, color: 0x1f7a3a, hole: 0, holes: [], pins: [...prow(4, 1.3, 1.3).map(([x, y]) => [y, x] as [number, number]), ...prow(4, 1.3, 3.84).map(([x, y]) => [y, x] as [number, number])],
    feats: [{ name: 'nRF24L01', xy: [10, 7.5], box: [4.0, 0.85, 4.0] }, { name: 'crystal', xy: [16, 7.5], box: [3.2, 1.0, 2.5], mat: 'steel-low', color: 0xc0c4c8 }], src: 'the nRF24L01 module, typical (29 × 15 mm, 2 × 4 header); the nRF24L01+ 4 × 4 QFN (Nordic datasheet)' },
  'Relay module 1 channel': { L: 50, W: 26, t: 1.6, color: 0x1f5fa8, hole: 3.0, holes: [[3, 3], [47, 3], [3, 23], [47, 23]], pins: prow(3, 2.0, 10.46).map(([x, y]) => [y - 8.46, x + 8.46] as [number, number]),
    feats: [{ name: 'relay', xy: [25, 13], box: [19.0, 15.3, 15.5], mat: 'pbt', color: 0x1a4fa0 }, { name: 'terminal', xy: [44, 13], box: [7.5, 10.0, 15.0], mat: 'pa66', color: 0x2050a0 }], src: 'the common one-channel 5 V relay module (Songle SRD), typical (50 × 26 mm, holes Ø3)' },
};
const BREAKOUT: PartFamily<Brk> = {
  id: 'piece.breakout', name: 'Sensor or driver breakout board', gloss: 'A sensor or driver module (HC-SR04, HC-SR501, BME280, MPU-6050, A4988, DRV8825, L298N, TB6612FNG, HC-05, nRF24L01, a relay): its PCB, holes, pins and parts', domains: [...EL, 'robotics'], aisle: 'Electronics / Modules',
  says: 'A sensor or driver breakout board by name: its PCB (FR-4) with its mounting holes (`<board> PCB/holes`, a screw or standoff down one) and its pins standing 8.5 mm below it (from `<board> PCB/points`, then its parts\' joints; down a breadboard or a socket), its chief parts seated at their places (a transducer its can, a PIR its lens, a chip or module its box). Its small parts (resistors, capacitors) not drawn',
  rows: BREAKOUTS, size: 'HC-SR04 ultrasonic', source: 'makers\' module drawings and chips\' datasheets, typical where so (each row says)',
  envelope: 'its PCB, holes and pins at their places; its parts their outlines at their footprints (a chip or a module a solid box, a can open on top), its small parts not drawn, so its drawn mass is not the board\'s',
  recipe: (r, size) => breakoutOf(size, r),
  expect: (r) => ({ bound: brkBound(r), tol: 0.01, says: 'its PCB with its parts over it and its pins under it' }),
  tests: [T(11)],
};
/** A humidity and temperature sensor's body (L × W × H, mm) on its four pins, 2.54 apart, 5 mm below it. */
type Dht = { L: number; W: number; H: number; hole: number; src: string };
export const DHTS: Record<string, Dht> = {
  'DHT11': { L: 15.5, W: 12.0, H: 5.5, hole: 0, src: 'Aosong DHT11 datasheet (15.5 × 12 × 5.5 mm, 4 pins 2.54 apart)' },
  'DHT22 (AM2302)': { L: 15.1, W: 25.0, H: 7.7, hole: 3.0, src: 'Aosong AM2302 (DHT22) datasheet (15.1 × 25 × 7.7 mm, 4 pins 2.54 apart, its hole Ø3)' },
};
const DHT: PartFamily<Dht> = {
  id: 'piece.dht', name: 'DHT humidity sensor', gloss: 'A DHT11 or DHT22 (AM2302) humidity and temperature sensor: its body on its four pins', domains: [...EL, 'robotics'], aisle: 'Electronics / Modules',
  says: 'A DHT humidity and temperature sensor (DHT11, DHT22): its body on its four pins (2.54 mm apart, 5 mm below it) run up into it (`<sensor> body/pins`), the DHT22\'s mounting hole across its top (`<sensor> body/hole`, along z). Its grille and its board inside not drawn',
  rows: DHTS, size: 'DHT22 (AM2302)', source: 'Aosong datasheets (each row says)',
  envelope: 'its body is its outline (its grille, element and board inside not drawn)',
  recipe: (d, size) => { const body = made(`${size} body`, 'abs', { box: B(d.L, d.W, d.H) }, { color: d.hole ? WHITE : 0x3a7ad0, patterns: [{ name: 'pins', points: xz(span(4, P).map((x) => [x, 0] as [number, number])) }, ...(d.hole ? [{ name: 'hole', face: '+z' as const, points: [[0, mm(d.W / 2 - 3)]] as [number, number][], hole: mm(d.hole / 2) }] : [])] });
    return stack(size, 1, [{ b: downPins(body, `${size} body/pins`, 4, () => strip(`${size} pin`, 0.5, d.W + 5, 0.3)) }]); },
  expect: (d) => ({ bound: bound(d.L, d.W + 5, d.H), tol: 0.01, says: 'its body by its pins' }),
  tests: [T(5)],
};

// ==== cells and batteries ============================================================================================
/** A round cell: its can (Ø d, its height less its + terminal's) and its + terminal (Ø nd, nh high) on top. */
type Cell = { h: number; d: number; nd: number; nh: number; src: string };
const BOLTS = 'BOLTS batteries.blt (MIT; IEC 60086 category 1: h, d), its + terminal typical';
const bolts = (h: number, d: number): Cell => ({ h, d, nd: Math.min(5.5, 0.38 * d), nh: 1.0, src: BOLTS });
export const ROUND_CELLS: Record<string, Cell> = {
  'AAA': bolts(44.5, 10.5), 'AA': bolts(50.5, 14.5), 'C': bolts(50, 26.2), 'D': bolts(61.5, 34.2), 'Half-AA': bolts(24, 14.5), 'AAAA': bolts(42.5, 8.3), 'A': bolts(50, 17), 'N': bolts(30.2, 12), 'Sub-C': bolts(42.9, 22.2),
  'CR123A (CR17345)': { h: 34.5, d: 17.0, nd: 6.0, nh: 1.0, src: 'IEC 60086 CR17345: Ø17 × 34.5 mm, its code; its + terminal typical' },
  'CR2 (CR15270)': { h: 27.0, d: 15.6, nd: 5.0, nh: 1.0, src: 'IEC 60086 CR15270: Ø15.6 × 27 mm; its + terminal typical' },
  '23A (8LR932)': { h: 28.5, d: 10.3, nd: 4.0, nh: 1.0, src: 'the 23A 12 V cell (8LR932), typical of makers\' sheets: Ø10.3 × 28.5 mm' },
  '27A (8LR732)': { h: 28.2, d: 8.0, nd: 3.0, nh: 1.0, src: 'the 27A 12 V cell (8LR732), typical: Ø8.0 × 28.2 mm' },
  '4LR44 (6 V)': { h: 25.2, d: 13.0, nd: 5.0, nh: 1.0, src: 'the 4LR44 (476A) 6 V stack, typical: Ø13 × 25.2 mm' },
};
const roundCell = (n: string, c: Cell, mat = 'steel-low') => stack(n, 1, [{ b: made(`${n} can`, mat, { cyl: [mm(c.d / 2), mm(c.h - c.nh)] }, { color: 0x5a6a8a }) }, { b: made(`${n} + terminal`, 'nickel', { cyl: [mm(c.nd / 2), mm(c.nh)] }, { color: 0xd0d4d8 }) }]);
const BATTERY: PartFamily<Cell> = {
  id: 'piece.battery', name: 'Round battery (AAAA to D, CR123A, 23A)', gloss: 'A round primary cell by its IEC 60086 size: its can and its + terminal', domains: [...EL, 'energy', 'everyday'], aisle: 'Electronics / Batteries',
  says: 'A round battery by its size (AAAA, AAA, AA, A, C, D, N, Half-AA, Sub-C as BOLTS gives IEC 60086; CR123A, CR2, 23A, 27A, 4LR44): its can (its − end its bottom, its axis `<size> cell can/axis`) and its + terminal on top; it goes into a holder\'s or a box\'s room end to end (Into a room, Stack). What it holds inside not drawn',
  rows: ROUND_CELLS, size: 'AA', source: `${BOLTS}; IEC 60086 codes and makers' sheets (each row says)`,
  envelope: 'its can is drawn solid (its electrodes, separator and seal inside not drawn), so its drawn mass is not the cell\'s',
  recipe: (c, size) => roundCell(`${size} cell`, c),
  expect: (c) => ({ bound: bound(c.d, c.h, c.d), tol: 0.01, says: 'its diameter and height (its + terminal in its height)' }),
  tests: [T(2)],
};
/** A coin or button cell by its IEC 60086 code (CR2032: Ø20, 3.2 high; SR and LR their own sizes): its + can and its −
 *  cap on top (Ø 0.8 d, 0.3 high, typical). */
type Coin = { d: number; h: number; src: string };
const cr = (code: string): Coin => { const m = /^(\d\d)(\d\d)$/.exec(code)!; return { d: Number(m[1]), h: Number(m[2]) / 10, src: `IEC 60086 CR${code}: its code its diameter (mm) and height (0.1 mm)` }; };
export const COIN_CELLS: Record<string, Coin> = {
  ...Object.fromEntries(['1025', '1130', '1216', '1220', '1225', '1616', '1620', '1632', '2012', '2016', '2025', '2032', '2320', '2325', '2330', '2354', '2430', '2450', '2477', '3032'].map((c) => [`CR${c}`, cr(c)])),
  'CR927': { d: 9.5, h: 2.7, src: 'IEC 60086 CR927 (Ø9.5 × 2.7 mm)' },
  'LR41 (SR736)': { d: 7.9, h: 3.6, src: 'IEC 60086 LR41 / SR41 (Ø7.9 × 3.6 mm)' }, 'LR43 (SR1142)': { d: 11.6, h: 4.2, src: 'IEC 60086 LR43 / SR43 (Ø11.6 × 4.2 mm)' },
  'LR44 (SR1154)': { d: 11.6, h: 5.4, src: 'IEC 60086 LR44 / SR44 (Ø11.6 × 5.4 mm)' }, 'LR1130 (SR1130)': { d: 11.6, h: 3.1, src: 'IEC 60086 LR54 / SR1130 (Ø11.6 × 3.05 mm)' },
  'SR626 (377)': { d: 6.8, h: 2.6, src: 'IEC 60086 SR626 (Ø6.8 × 2.6 mm)' }, 'SR621 (364)': { d: 6.8, h: 2.1, src: 'IEC 60086 SR621 (Ø6.8 × 2.15 mm)' }, 'SR920 (371)': { d: 9.5, h: 2.05, src: 'IEC 60086 SR920 (Ø9.5 × 2.05 mm)' }, 'SR927 (395)': { d: 9.5, h: 2.7, src: 'IEC 60086 SR927 (Ø9.5 × 2.7 mm)' },
};
const COIN: PartFamily<Coin> = {
  id: 'piece.coincell', name: 'Coin or button cell (CR2032, LR44…)', gloss: 'A lithium coin cell or a button cell by its IEC 60086 code: its can and its cap', domains: [...EL, 'energy', 'everyday'], aisle: 'Electronics / Batteries',
  says: 'A coin or button cell by its IEC 60086 code (CR1025 to CR3032, CR927; LR41, LR43, LR44, LR1130; SR626, SR621, SR920, SR927): its + can (its axis `<code> can/axis`) with its − cap on top (Ø 0.8 of its own, 0.3 mm, typical); it goes into a holder\'s room (Into a room). What it holds inside not drawn',
  rows: COIN_CELLS, size: 'CR2032', source: 'IEC 60086-2 designations (each row says)',
  envelope: 'its can is drawn solid (its lithium, cathode and gasket inside not drawn)',
  recipe: (c, size) => stack(`${size}`, 1, [{ b: made(`${size} can`, 'stainless-304', { cyl: [mm(c.d / 2), mm(c.h - 0.3)] }, { color: 0xc8ccd0 }) }, { b: made(`${size} cap`, 'stainless-304', { cyl: [mm(0.4 * c.d), mm(0.3)] }, { color: 0xb8bcc2 }) }]),
  expect: (c) => ({ bound: bound(c.d, c.h, c.d), tol: 0.01, says: 'its diameter and height, as its code gives them' }),
  tests: [T(2)],
};
/** A Li-ion cylindrical cell by its size code (21700: Ø21, 70.0 mm). */
type Li = { d: number; h: number; src: string };
const li = (code: string): Li => { const d = Number(code.slice(0, 2)), h = Number(code.slice(2)) / 10; return { d, h, src: `the Li-ion size code ${code} (IEC 61960 designation): Ø${d} × ${h} mm nominal (a maker's cell up to 0.5 mm over, typical)` }; };
export const LI_CELLS: Record<string, Li> = { ...Object.fromEntries(['10440', '14500', '14650', '16340', '18350', '18490', '18500', '20700', '21700', '22650', '26650', '26700', '32650', '32700'].map((c) => [c, li(c)])), '4680 (46800)': { d: 46, h: 80, src: 'the 4680 cell (46 × 80 mm, Tesla 4680 class)' } };
const LICELL: PartFamily<Li> = {
  id: 'piece.licell', name: 'Li-ion cylindrical cell (14500 to 4680)', gloss: 'A cylindrical lithium-ion cell by its size code (10440 to 4680; the 18650 is piece.cell): its can and its + cap', domains: [...EL, 'energy', 'vehicles'], aisle: 'Electronics / Batteries',
  says: 'A cylindrical Li-ion cell by its size code (10440, 14500, 14650, 16340, 18350, 18490, 18500, 20700, 21700, 22650, 26650, 26700, 32650, 32700, 4680; the 18650 is piece.cell): its steel can (`<code> cell can/axis`) and its + cap on top; it goes into a holder\'s or a pack\'s room, end to end or side by side (Into a room, Stack). What it holds inside not drawn',
  rows: LI_CELLS, size: '21700', source: 'Li-ion size codes (IEC 61960 designation; each row says)',
  envelope: 'its can is drawn solid (its jelly roll, electrolyte and cap inside not drawn), so its drawn mass is not the cell\'s',
  recipe: (c, size) => roundCell(`${size} cell`, { h: c.h, d: c.d, nd: 0.4 * c.d, nh: 0.6, src: c.src }),
  expect: (c) => ({ bound: bound(c.d, c.h, c.d), tol: 0.01, says: 'its diameter and height, as its code gives them' }),
  tests: [T(2)],
};
/** A rectangular battery: its body (W × D × H, its height less its top), its top cover (1 mm) and its two terminals
 *  (snaps, or springs) standing th above it, s apart. */
type Pp = { W: number; D: number; H: number; th: number; s: number; spring: boolean; src: string };
export const PP_BATTERIES: Record<string, Pp> = {
  '9 V (6LR61)': { W: 26.5, D: 17.5, H: 48.5, th: 2.5, s: 12.7, spring: false, src: 'IEC 60086-2 6LR61 (26.5 × 17.5 × 48.5 mm at most, its snaps 12.7 mm apart)' },
  '9 V (6F22)': { W: 26.5, D: 17.5, H: 48.5, th: 2.5, s: 12.7, spring: false, src: 'IEC 60086-2 6F22 (zinc-carbon PP3, the 6LR61\'s size)' },
  '4.5 V flat (3LR12)': { W: 62.0, D: 22.0, H: 67.0, th: 0.6, s: 30.0, spring: false, src: 'IEC 60086-2 3LR12 (62 × 22 × 67 mm), its strip terminals typical' },
  '6 V lantern (4R25)': { W: 67.0, D: 67.0, H: 115.0, th: 15.0, s: 30.0, spring: true, src: 'IEC 60086-2 4R25 lantern battery (67 × 67 × 115 mm with its springs), its springs typical' },
};
const PPBATT: PartFamily<Pp> = {
  id: 'piece.ppbattery', name: 'Rectangular battery (9 V, 4.5 V, 6 V lantern)', gloss: 'A rectangular battery (6LR61 9 V, 3LR12, 4R25 lantern): its body, top and terminals', domains: [...EL, 'energy', 'everyday'], aisle: 'Electronics / Batteries',
  says: 'A rectangular battery by its IEC 60086 code (6LR61 and 6F22 9 V, 3LR12 4.5 V, 4R25 6 V lantern): its body, its top cover with its two terminals up through it (`<code> top/terminals`: snaps, strips or springs; a snap clip or a holder\'s contacts on them). What it holds inside not drawn',
  rows: PP_BATTERIES, size: '9 V (6LR61)', source: 'IEC 60086-2 sizes (each row says)',
  envelope: 'its body is drawn solid (its cells inside not drawn)',
  recipe: (p, size) => { const top = made(`${size} top`, 'pp', { box: B(p.W, 1.0, p.D) }, { color: BLACK, pattern: { name: 'terminals', points: xz([[-p.s / 2, 0], [p.s / 2, 0]]) } });
    const term = () => p.spring ? made(`${size} spring`, 'steel-low', { coil: [mm(3.0), mm(1.0), 5, mm(2.8)] }, { color: 0xb8bcc2 }) : made(`${size} terminal`, 'nickel', { cyl: [mm(p.spring ? 2 : 2.8), mm(1.0 + p.th)] }, { color: 0xd0d4d8 });
    return stack(size, 1, [{ b: made(`${size} body`, 'steel-low', { box: B(p.W, p.H - 1.0 - p.th, p.D) }, { color: 0x404448 }) }, { b: upThrough(top, `${size} top/terminals`, 2, term) }]); },
  expect: (p) => ({ bound: bound(p.W, p.H + (p.spring ? 0 : 0), p.D), tol: 0.02, says: 'its width, its height with its terminals, its depth' }),
  tests: [T(4)],
};
/** A 1S LiPo pouch by its code (503035: 5.0 thick, 30 wide, 35 long), its capacity (typical), its protection board (3 mm). */
type Lipo = { T: number; W: number; L: number; mAh: number };
const lipo = (code: string, mAh: number): [string, Lipo] => { const t = code.length === 6 ? Number(code.slice(0, 2)) / 10 : Number(code.slice(0, 3)) / 10, rest = code.slice(code.length - 4);
  return [`${code} (${mAh} mAh)`, { T: t, W: Number(rest.slice(0, 2)), L: Number(rest.slice(2)), mAh }]; };
export const LIPOS: Record<string, Lipo> = Object.fromEntries([lipo('401230', 100), lipo('402030', 200), lipo('502030', 250), lipo('503035', 500), lipo('503450', 1000), lipo('603040', 750), lipo('603450', 1200), lipo('704050', 1600), lipo('805050', 2000), lipo('103450', 2000), lipo('104050', 2500), lipo('906090', 6000)]);
const LIPO: PartFamily<Lipo> = {
  id: 'piece.lipo', name: '1S LiPo pouch cell', gloss: 'A one-cell lithium-polymer pouch by its size code (401230 to 906090): its pouch and its protection board', domains: [...EL, 'energy', 'robotics'], aisle: 'Electronics / Batteries',
  says: 'A 1S (3.7 V) LiPo pouch cell by its size code (thickness in 0.1 mm, then width and length in mm: 401230 to 906090) and its capacity (typical): its pouch lying flat and its protection board across its end (3 mm, typical) where its tabs come out, its + and − wires\' points on it (`<code> protection board/wires`); it goes into a box\'s room flat (Into a room). Its tabs, wires and the cell\'s layers not drawn',
  rows: LIPOS, size: '503035 (500 mAh)', source: 'LiPo makers\' size codes (thickness, width, length); capacities typical',
  envelope: 'its pouch is drawn solid (its layers inside not drawn)',
  recipe: (c, size) => stack(`${size} LiPo`, 2, [{ b: made(`${size} pouch`, 'al-6061', { box: B(c.W, c.T, c.L) }, { color: 0xb8bcc2 }) }, { b: made(`${size} protection board`, 'fr4', { box: B(c.W - 2, Math.min(c.T, 1.6), 3) }, { color: 0x1f6b3a, pattern: { name: 'wires', points: xz([[-(c.W - 2) / 4, 0], [(c.W - 2) / 4, 0]]) } }) }]),
  expect: (c) => ({ bound: bound(c.W, c.T, c.L + 3), tol: 0.01, says: 'its width, thickness and length (its code) and its board' }),
  tests: [T(2)],
};

// ==== thermal and magnetics ==========================================================================================
/** An extruded heat sink: its base (W × L × tb, mm), its n fins (t thick) the length of it standing to H over all, and,
 *  where it has one, its mounting hole (Ø) between its middle fins. */
type Sink = { W: number; L: number; H: number; tb: number; n: number; t: number; hole?: number; src: string };
export const HEAT_SINKS: Record<string, Sink> = {
  '9 × 9 × 5': { W: 9, L: 9, H: 5, tb: 1.5, n: 4, t: 0.8, src: 'the 9 × 9 × 5 mm chip heat sink, typical' },
  '14 × 14 × 6': { W: 14, L: 14, H: 6, tb: 1.5, n: 6, t: 0.9, src: 'the 14 × 14 × 6 mm chip heat sink (Raspberry Pi class), typical' },
  '20 × 20 × 10': { W: 20, L: 20, H: 10, tb: 2.0, n: 6, t: 1.0, src: 'the 20 × 20 × 10 mm heat sink, typical' },
  '25 × 25 × 10': { W: 25, L: 25, H: 10, tb: 2.0, n: 8, t: 1.0, src: 'the 25 × 25 × 10 mm heat sink, typical' },
  '40 × 40 × 11': { W: 40, L: 40, H: 11, tb: 2.5, n: 10, t: 1.2, src: 'the 40 × 40 × 11 mm heat sink, typical' },
  '40 × 40 × 20': { W: 40, L: 40, H: 20, tb: 2.5, n: 10, t: 1.2, src: 'the 40 × 40 × 20 mm heat sink, typical' },
  '60 × 60 × 10': { W: 60, L: 60, H: 10, tb: 3.0, n: 14, t: 1.5, src: 'the 60 × 60 × 10 mm heat sink, typical' },
  'TO-220, 25 × 23 × 16': { W: 25, L: 23, H: 16, tb: 2.5, n: 6, t: 1.2, hole: 3.2, src: 'the extruded TO-220 heat sink (25 × 23 × 16 mm, one M3 hole), typical of Fischer SK and Aavid classes' },
  'TO-247, 50 × 42 × 25': { W: 50, L: 42, H: 25, tb: 4.0, n: 8, t: 2.0, hole: 3.6, src: 'the extruded TO-247 heat sink (50 × 42 × 25 mm, one M3.5 hole), typical' },
};
/** Its section, x across and y up from its base's underside (mm): its base, then each fin from the last back to the first. */
const comb = (s: Sink): [number, number][] => { const pitch = (s.W - s.t) / (s.n - 1), xs = span(s.n, pitch), out: [number, number][] = [[-s.W / 2, 0], [s.W / 2, 0]];
  for (let i = s.n - 1; i >= 0; i--) { const l = xs[i]! - s.t / 2, r = xs[i]! + s.t / 2; if (i < s.n - 1) out.push([r, s.tb]); out.push([r, s.H], [l, s.H]); if (i > 0) out.push([l, s.tb]); }
  return out.map(([x, y]) => [mm(x), mm(y)] as [number, number]); };
const SINK: PartFamily<Sink> = {
  id: 'piece.heatsink', name: 'Heat sink (extruded, TO-220)', gloss: 'An extruded aluminium heat sink by its size: its base and its fins; a TO-220 or TO-247 one with its hole', domains: [...EL, 'thermal'], aisle: 'Electronics / Thermal',
  says: 'An extruded aluminium heat sink by its size (9 × 9 to 60 × 60 mm; TO-220 and TO-247 ones with a mounting hole): one extrusion, its base and its fins drawn as its section along its length, a hole up through its base between its middle fins where it has one (`<sink> heat sink/hole`, a screw through it and a TO part\'s tab); it goes onto a chip or a TO part\'s tab (Onto a face, Bolted joint)',
  rows: HEAT_SINKS, size: '20 × 20 × 10', source: 'heat sink sizes, typical of makers\' sheets (each row says)',
  cannot: (s) => (s.hole && !(s.hole / 2 < (s.W - s.t) / (s.n - 1) / 2 - s.t / 2) ? `its hole Ø${s.hole} does not fit between its middle fins` : null),
  recipe: (s, size) => made(`${size} heat sink`, 'al-6063', { section: { pts: comb(s), L: mm(s.L) } }, { color: 0x30343a, ...(s.hole ? { pattern: { name: 'hole', face: '-y' as const, points: [[0, 0]] as [number, number][], depth: mm(s.tb), hole: mm(s.hole / 2) } } : {}) }),
  expect: (s) => ({ bound: bound(s.W, s.H, s.L), mass: (mm(s.W) * mm(s.tb) * mm(s.L) + s.n * mm(s.t) * mm(s.H - s.tb) * mm(s.L) - (s.hole ? Math.PI * mm(s.hole / 2) ** 2 * mm(s.tb) : 0)) * rho('al-6063'), tol: 0.01, massTol: 0.02, says: 'its width, height and length; nominal mass, its base and fins' }),
  tests: [T(1)],
};
/** A radial drum-core inductor by its code (RLB0913: Ø9 × 13 mm): its ferrite drum's flanges, its core with its winding
 *  over it, its two leads (s apart) 4 mm below it. */
type Drum = { D: number; H: number; s: number; wire: number; src: string };
const rlb = (code: string, s: number, wire: number): [string, Drum] => [`RLB${code}`, { D: Number(code.slice(0, 2)), H: Number(code.slice(2)), s, wire, src: `Bourns RLB${code}: its code its diameter and height (mm); its lead spacing and wire typical` }];
export const DRUMS: Record<string, Drum> = Object.fromEntries([rlb('0608', 3.5, 0.3), rlb('0712', 5.0, 0.4), rlb('0812', 5.0, 0.4), rlb('0913', 5.0, 0.5), rlb('1014', 5.0, 0.6), rlb('1314', 7.5, 0.8)]);
const DRUM: PartFamily<Drum> = {
  id: 'piece.druminductor', name: 'Radial drum-core inductor', gloss: 'A radial drum-core power inductor (Bourns RLB): its ferrite drum, its winding and its two leads', domains: [...EL, 'energy'], aisle: 'Electronics / Magnetics',
  says: 'A radial drum-core power inductor by its code (Bourns RLB0608 to RLB1314: its diameter and height): its two leads down through its lower flange (`<part> lower flange/leads`, down a board\'s holes), its ferrite core with its copper winding over it (`<part> core/axis`), its upper flange on top. Its sleeve and the winding\'s ends to its leads not drawn; its ferrite drawn as ceramic',
  rows: DRUMS, size: 'RLB0913', source: 'Bourns RLB series codes (each row says)',
  recipe: (d, size) => { const fl = Math.min(1.5, d.H * 0.12), core = 0.22 * d.D, n = `${size} inductor`;
    const lower = made(`${n} lower flange`, 'ceramic', { cyl: [mm(d.D / 2), mm(fl)] }, { color: 0x3a3a3a, pattern: { name: 'leads', points: xz([[-d.s / 2, 0], [d.s / 2, 0]]) } });
    const R = core + 0.5 + d.wire / 2, turns = Math.floor((d.H - 2 * fl - d.wire) / d.wire), layers = Math.max(1, Math.floor((d.D / 2 - 0.5 - R - d.wire / 2) / d.wire));
    const wound = over(made(`${n} core`, 'ceramic', { cyl: [mm(core), mm(d.H - 2 * fl)] }, { color: 0x3a3a3a }), `${n} core/axis`, made(`${n} winding`, 'copper', { coil: [mm(R), mm(d.wire), turns, mm(d.wire), layers] }, { color: 0xb87333 }), 'mid', 'touch');
    return stack(n, 1, [{ b: downPins(lower, `${n} lower flange/leads`, 2, () => pinRound(`${n} lead`, 0.6, fl + 4)) }, { b: wound }, { b: made(`${n} upper flange`, 'ceramic', { cyl: [mm(d.D / 2), mm(fl)] }, { color: 0x3a3a3a }) }]); },
  expect: (d) => ({ bound: bound(d.D, d.H + 4, d.D), tol: 0.01, says: 'its diameter, its height and leads' }),
  tests: [T(6)],
};
/** A toroid core: its outside, bore and height (inches, as the makers give them). */
type Toroid = { od: number; id: number; h: number; mat: string; src: string };
const MICROMETALS = 'Micrometals iron powder core T-size (OD × ID × H, in)', FAIRRITE = 'Fair-Rite / Amidon FT-size ferrite toroid (OD × ID × H, in)';
const tor = (od: number, id: number, h: number, mat: string, src: string): Toroid => ({ od, id, h, mat, src });
export const TOROIDS: Record<string, Toroid> = {
  'T-25': tor(0.255, 0.120, 0.096, 'iron', MICROMETALS), 'T-30': tor(0.307, 0.151, 0.128, 'iron', MICROMETALS), 'T-37': tor(0.375, 0.205, 0.128, 'iron', MICROMETALS), 'T-44': tor(0.440, 0.229, 0.159, 'iron', MICROMETALS),
  'T-50': tor(0.500, 0.303, 0.190, 'iron', MICROMETALS), 'T-68': tor(0.690, 0.370, 0.190, 'iron', MICROMETALS), 'T-80': tor(0.795, 0.495, 0.250, 'iron', MICROMETALS), 'T-94': tor(0.942, 0.560, 0.312, 'iron', MICROMETALS),
  'T-106': tor(1.060, 0.570, 0.437, 'iron', MICROMETALS), 'T-130': tor(1.300, 0.780, 0.437, 'iron', MICROMETALS), 'T-157': tor(1.570, 0.950, 0.570, 'iron', MICROMETALS), 'T-184': tor(1.840, 0.950, 0.710, 'iron', MICROMETALS), 'T-200': tor(2.000, 1.250, 0.550, 'iron', MICROMETALS),
  'FT-23': tor(0.230, 0.120, 0.060, 'ceramic', FAIRRITE), 'FT-37': tor(0.375, 0.187, 0.125, 'ceramic', FAIRRITE), 'FT-50': tor(0.500, 0.281, 0.188, 'ceramic', FAIRRITE), 'FT-82': tor(0.825, 0.520, 0.250, 'ceramic', FAIRRITE),
  'FT-114': tor(1.142, 0.750, 0.295, 'ceramic', FAIRRITE), 'FT-140': tor(1.400, 0.900, 0.500, 'ceramic', FAIRRITE), 'FT-240': tor(2.400, 1.400, 0.500, 'ceramic', FAIRRITE),
};
const IN = 25.4;
const TOROID: PartFamily<Toroid> = {
  id: 'piece.toroid', name: 'Toroid core (T-, FT-)', gloss: 'A toroidal core, iron powder (Micrometals T-25 to T-200) or ferrite (FT-23 to FT-240), by its size', domains: [...EL, 'energy', 'communications'], aisle: 'Electronics / Magnetics',
  says: 'A toroidal core by its size (iron powder T-25 to T-200; ferrite FT-23 to FT-240): its ring, its bore its axis (`<core> core/axis`): wire wound through it (a coil over it is not made yet: a winding goes through its bore one turn at a time). Its coating and rounded edges not drawn; ferrite drawn as ceramic',
  rows: TOROIDS, size: 'T-50', source: `${MICROMETALS}; ${FAIRRITE} (each row)`,
  recipe: (t, size) => made(`${size} core`, t.mat, { tube: [mm(t.id * IN / 2), mm(t.od * IN / 2), mm(t.h * IN)] }, { color: t.mat === 'iron' ? 0xc03030 : 0x2a2a2a }),
  expect: (t) => ({ bound: bound(t.od * IN, t.h * IN, t.od * IN), tol: 0.01, says: 'its outside and height, as its maker gives them in inches' }),
  tests: [T(1)],
};

// ==== sockets, headers and fuses =====================================================================================
/** A DIP IC socket of n pins, its rows w apart (0.3 or 0.6 in): its body and a contact in each of its holes, a tail
 *  3 mm below it. */
type Sock = { n: number; w: number };
export const IC_SOCKETS: Record<string, Sock> = Object.fromEntries([...[6, 8, 14, 16, 18, 20, 22, 24, 28].map((n) => [`DIP-${n} (0.3 in)`, { n, w: 7.62 }]), ...[24, 28, 32, 40].map((n) => [`DIP-${n} (0.6 in)`, { n, w: 15.24 }])]) as Record<string, Sock>;
const sockL = (n: number) => (n / 2) * P + 0.3;
const ICSOCKET: PartFamily<Sock> = {
  id: 'piece.icsocket', name: 'DIP IC socket', gloss: 'A DIP IC socket (6 to 40 pins, 0.3 or 0.6 in rows): its body and its contacts', domains: EL, aisle: 'Electronics / Sockets and headers',
  says: 'A DIP IC socket by its pins and rows (DIP-6 to DIP-28 at 0.3 in, DIP-24 to DIP-40 at 0.6 in): its body with a contact in each hole (`<socket> body/contacts`), each contact a sleeve (`<socket> contact <k>/axis`: a DIP IC\'s lead goes down it) with its tail 3 mm below the body (down a board\'s holes). Its contacts\' spring fingers drawn as a plain sleeve',
  rows: IC_SOCKETS, size: 'DIP-8 (0.3 in)', source: 'the DIP socket class (2.54 mm pins, rows 7.62 or 15.24 mm apart), typical: body (n/2) × 2.54 + 0.3 long, its rows\' span + 2.5 wide, 4.2 high',
  recipe: (s, size) => { const n = `${size} socket`, xs = span(s.n / 2, P), pts = [...xs.map((x) => [x, -s.w / 2] as [number, number]), ...[...xs].reverse().map((x) => [x, s.w / 2] as [number, number])];
    const body = made(`${n} body`, 'pbt', { box: B(sockL(s.n), 4.2, s.w + 2.5) }, { color: BLACK, pattern: { name: 'contacts', points: xz(pts), hole: mm(0.6) } });
    return stack(n, 1, [{ b: downPins(body, `${n} body/contacts`, pts.length, (i) => made(`${n} contact ${i + 1}`, 'brass', { tube: [mm(0.4), mm(0.6), mm(4.2 + 3)] }, { color: 0xd8b24a })) }]); },
  expect: (s) => ({ bound: bound(sockL(s.n), 4.2 + 3, s.w + 2.5), tol: 0.01, says: 'its body by its tails' }),
  tests: [T(9)],
};
/** An IDC box header 2 × n (2.54 mm): its shroud (2.54 n + 7.62 long, 8.85 wide, 9.1 high) and its pins up its floor
 *  to its rim, 3 mm below it. */
type Box = { n: number };
export const BOX_HEADERS: Record<string, Box> = Object.fromEntries([3, 5, 7, 8, 10, 13, 17, 20, 25, 32].map((n) => [`2 × ${n} (${2 * n} pins)`, { n }]));
const boxL = (n: number) => 2.54 * n + 7.62;
const BOXHEADER: PartFamily<Box> = {
  id: 'piece.boxheader', name: 'IDC box header', gloss: 'A shrouded IDC box header, 2 × 3 to 2 × 32 at 2.54 mm: its shroud and its pins', domains: EL, aisle: 'Electronics / Sockets and headers',
  says: 'A shrouded box header by its pins (2 × 3 to 2 × 32, 2.54 mm, as a ribbon cable\'s IDC socket takes): its shroud (`<header> shroud/cavity`, where the socket goes) with its pins up through its floor (`<header> shroud/pins`), 3 mm below it (down a board\'s holes). Approximated: its pins drawn up to its rim (they stop about 2.5 mm below it), its key slot and latches not drawn',
  rows: BOX_HEADERS, size: '2 × 5 (10 pins)', source: 'the IDC box header class (Würth 612 series sizes: 2.54 n + 7.62 × 8.85 × 9.1 mm), typical',
  recipe: (h, size) => { const n = `${size} header`, pts = span(h.n, P).flatMap((x) => [[x, -1.27], [x, 1.27]] as [number, number][]);
    const shroud = made(`${n} shroud`, 'pbt', { case: [mm(boxL(h.n)), mm(9.1), mm(8.85), mm(0.9), mm(2.5)] }, { color: BLACK, pattern: { name: 'pins', points: xz(pts) } });
    return stack(n, 1, [{ b: downPins(shroud, `${n} shroud/pins`, pts.length, () => strip(`${n} pin`, 0.64, 9.1 + 3, 0.64, 'brass', 0xd8b24a)) }]); },
  expect: (h) => ({ bound: bound(boxL(h.n), 9.1 + 3, 8.85), tol: 0.01, says: 'its shroud by its pins\' tails' }),
  tests: [T(11)],
};
/** A blade fuse (ISO 8820-3): its housing (W × H × t, mm) on its two blades (bw wide, bt thick, s apart, out below by bl). */
type Blade = { W: number; H: number; t: number; bw: number; bt: number; s: number; bl: number; src: string };
export const BLADE_FUSES: Record<string, Blade> = {
  'LP-mini (APS)': { W: 10.9, H: 5.0, t: 3.8, bw: 2.8, bt: 0.64, s: 7.0, bl: 3.7, src: 'ISO 8820-3 type F (low-profile mini), typical of Littelfuse drawings (10.9 × 8.7 × 3.8 mm over all)' },
  'Mini (ATM)': { W: 10.9, H: 8.5, t: 3.6, bw: 2.8, bt: 0.64, s: 7.0, bl: 7.8, src: 'ISO 8820-3 type E (mini), typical of Littelfuse ATM drawings (10.9 × 16.3 × 3.6 mm over all)' },
  'Regular (ATO)': { W: 19.1, H: 10.4, t: 5.1, bw: 6.3, bt: 0.8, s: 10.9, bl: 8.1, src: 'ISO 8820-3 type C (medium), typical of Littelfuse ATO drawings (19.1 × 18.5 × 5.1 mm over all)' },
  'Maxi (APX)': { W: 29.2, H: 23.8, t: 8.5, bw: 8.0, bt: 1.0, s: 18.0, bl: 10.5, src: 'ISO 8820-3 type G (maxi), typical of Littelfuse MAXI drawings (29.2 × 34.3 × 8.5 mm over all)' },
  'Micro2': { W: 9.1, H: 8.5, t: 3.8, bw: 2.8, bt: 0.64, s: 5.8, bl: 6.8, src: 'Micro2 (ISO 8820-3), typical of Littelfuse drawings (9.1 × 15.3 × 3.8 mm over all)' },
  'Micro3': { W: 14.4, H: 10.0, t: 4.2, bw: 2.8, bt: 0.64, s: 5.8, bl: 8.1, src: 'Micro3 (three blades in fact; drawn with its outer two), typical of Littelfuse drawings (14.4 × 18.1 × 4.2 mm over all)' },
};
const BLADEFUSE: PartFamily<Blade> = {
  id: 'piece.bladefuse', name: 'Blade fuse (ATO, mini, maxi)', gloss: 'An automotive blade fuse (ISO 8820-3: LP-mini, mini, regular, maxi, Micro2, Micro3): its housing on its two blades', domains: [...EL, 'vehicles'], aisle: 'Electronics / Fuses',
  says: 'An automotive blade fuse by its type (LP-mini, mini, regular, maxi, Micro2, Micro3; ISO 8820-3): its two blades (a ring of two about its middle, its blades\' spacing) stood under its housing; its blades go down a fuse holder\'s clips. Approximated: its blades drawn under its housing (they run up into it in fact); its link inside not drawn',
  rows: BLADE_FUSES, size: 'Regular (ATO)', source: 'ISO 8820-3 types, typical of Littelfuse drawings (each row says)',
  envelope: 'its housing is drawn solid (its fuse link inside not drawn)',
  recipe: (f, size) => { const n = `${size} fuse`, blades = ring(`${n} blades`, strip(`${n} blade`, f.bw, f.bl, f.bt, 'zinc', 0xc0c4c8), 2, mm(f.s / 2), 'clear');
    return stack(n, 1, [{ b: blades }, { b: made(`${n} housing`, 'pc', { box: B(f.W, f.H, f.t) }, { color: 0xe0a020 }) }]); },
  expect: (f) => ({ bound: bound(f.W, f.H + f.bl, f.t), tol: 0.01, says: 'its housing by its blades' }),
  tests: [T(3)],
};

/** Every family of this file (the second electronics shelf, decision 0026). */
export const ELECTRO = [CHIPRES, MLCC, TANT, VCHIP, MELF, SOT, SMDPOWER, SOIC, SSOP, TSSOP, QFP, QFN, TOPOWER, LEDSMD, LEDTH, LEDDISP, PANELPOT, ENCODER, TRIMMER, ROCKER, SLIDE, DIPSW,
  XT, POWERPOLE, BANANA, COAX, IEC, PLUGGABLE, BREAKOUT, DHT, BATTERY, COIN, LICELL, PPBATT, LIPO, SINK, DRUM, TOROID, ICSOCKET, BOXHEADER, BLADEFUSE] as PartFamily<unknown>[];
/** Their piece nodes (each registered with the maker's check.row by familyNode). */
export const ELECTRO_NODES: BlockDef[] = ELECTRO.map((f) => familyNode(f));
