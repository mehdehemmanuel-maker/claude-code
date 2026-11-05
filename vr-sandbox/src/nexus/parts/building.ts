// Building and structural families for the table-driven maker (decision 0026, step 2): timber by PS 20 and EN 336, sheet
// goods, bricks and blocks and a wall laid of them, steel sections (IPE, HEA, HEB, UPN; equal and unequal angles; SHS,
// RHS and CHS), bar, rebar, anchors and wall plugs, nails and deck screws, joist hangers and angle brackets. Every row is
// re-keyed here from the standard or the maker's sheet it names, or labelled typical: no file is copied (FreeCAD's
// profiles.csv and BOLTS' LGPL tables were read to check the steel rows against, never copied). Each recipe is made of
// the room operations (src/nexus/room.ts) only: no place is written here.
//
// How they lie: a section (timber, steel sections, flat and square bar, a hanger's U) has its profile in x and y and its
// length along z, and offers a line along its length (`<name>/axis`, through its bound's middle where that is clear of
// its outline); a round one (round bar, rebar, CHS, an anchor, a plug, a nail, a screw) stands along y and offers its
// axis, so a sleeve slides over it and it passes along a hole; a sheet, a brick and a block lie as boxes, x their length,
// y their thickness or height, z their width. A nominal mass is the row's where the standard gives one (kg/m), else the
// solids the row names at the drawing's material.

import { made, over, run, stack, type Block } from '../room';
import { bracket, nut, washer, METRIC } from '../common';
import { densityKg } from '../mass';
import { familyNode, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const disc = (d: number) => (Math.PI * d * d) / 4;
const lengthSet = (d: number) => ({ key: 'length', label: 'Length, mm', type: 'number' as const, default: d });
const noLength = (set: Record<string, unknown>, k = 'length') => (len(set, k) > 0 && Number.isFinite(len(set, k)) ? null : `a length above 0 (${String(set[k])} mm)`);
/** Points along an arc about (cx, cy), from a0 to a1 degrees, both ends in. */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 4): [number, number][] =>
  r > 0 ? Array.from({ length: n + 1 }, (_, k) => { const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number]; }) : [[cx, cy]];
/** A profile about its bound's middle (so its line along its length runs through that middle). */
const centred = (pts: [number, number][]): [number, number][] => { const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2; return pts.map(([x, y]) => [x - cx, y - cy]); };
const sectionOf = (name: string, mat: string, pts: [number, number][], L: number, color?: number): Block => made(name, mat, { section: { pts: centred(pts), L } }, color !== undefined ? { color } : {});
const rect = (w: number, h: number): [number, number][] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
const STEEL = 0x6b6e72, TIMBER = 0xc8a46a, BRICK = 0x9c4a32, MORTAR = 0xb9b2a4, CONCRETE = 0x9a9890, GALV = 0xa8adb2;

// ---- timber: PS 20 dimension lumber and EN 336 sizes ------------------------------------------------------------------
type Lumber = { t: number; w: number; src: string };
/** PS 20 (NIST PS 20-20, American Softwood Lumber Standard, table of dressed sizes, dry): nominal 1 dresses to 3/4 in, 2
 *  to 1-1/2, 3 to 2-1/2, 4 to 3-1/2, 6 to 5-1/2, 8 to 7-1/4, 10 to 9-1/4, 12 to 11-1/4. */
const PS20_DRESSED: Record<number, number> = { 1: 0.75, 2: 1.5, 3: 2.5, 4: 3.5, 6: 5.5, 8: 7.25, 10: 9.25, 12: 11.25 };
const LUMBER: Record<string, Lumber> = {};
for (const [a, bs] of [[1, [2, 3, 4, 6, 8, 10, 12]], [2, [2, 3, 4, 6, 8, 10, 12]], [3, [4, 6]], [4, [4, 6, 8, 10, 12]]] as const)
  for (const b of bs) LUMBER[`${a}x${b}`] = { t: PS20_DRESSED[a]! * 25.4, w: PS20_DRESSED[b]! * 25.4, src: `PS 20 nominal ${a} × ${b} in, dressed dry ${PS20_DRESSED[a]} × ${PS20_DRESSED[b]} in` };
// (UK and European sizes, typical: CLS (38 mm, its edges rounded, drawn square), regularised C24 (EN 336 target sizes),
// and planed all round (PAR) as the merchants sell them)
for (const w of [63, 89, 140, 184, 235]) LUMBER[`CLS 38x${w}`] = { t: 38, w, src: 'CLS 38 mm stock as UK merchants sell it (typical)' };
for (const [t, w] of [[47, 75], [47, 100], [47, 150], [47, 175], [47, 200], [47, 225], [63, 150], [75, 200], [75, 225], [100, 100]] as const) LUMBER[`C24 ${t}x${w}`] = { t, w, src: 'EN 336 target sizes, regularised C24 as UK merchants sell it (typical)' };
for (const [t, w] of [[18, 44], [18, 69], [18, 94], [18, 144], [21, 44], [21, 94], [21, 144], [44, 44], [44, 69], [69, 69], [94, 94]] as const) LUMBER[`PAR ${t}x${w}`] = { t, w, src: 'planed all round, finished sizes as UK merchants sell them (typical)' };
const LUMBER_F: PartFamily<Lumber> = {
  id: 'piece.lumber', name: 'Timber (lumber)', gloss: 'Softwood timber by its nominal size (PS 20) or its metric size (CLS, C24, PAR), cut to a length', domains: ['structural', 'manufacturing', 'everyday'],
  says: 'Softwood timber by its size: US nominal (PS 20, "2x4" drawn at its dressed 38.1 × 88.9 mm) or metric (CLS, regularised C24 by EN 336, PAR, typical), cut to its length: its section, its wider face across (x), its thickness up (y), its length along z. It offers a line along its length (`<size> timber/axis`); it stacks, lies on a plate, and is bolted through a plate\'s holes (Bolted down to a plate). Drawn in the table\'s wood (500 kg/m³; spruce-pine-fir is about 420–450, typical)',
  rows: LUMBER, size: '2x4', source: 'NIST PS 20 (US dressed sizes), EN 336 and UK merchants\' sizes (typical), each row its own',
  settings: [lengthSet(2400)], cannot: (_r, _s, set) => noLength(set),
  recipe: (r, size, set) => sectionOf(`${size} timber`, 'wood', rect(mm(r.w), mm(r.t)), len(set), TIMBER),
  expect: (r, _s, set) => ({ bound: [mm(r.w), mm(r.t), len(set)], mass: mm(r.w) * mm(r.t) * len(set) * rho('wood'), tol: 0.01, massTol: 0.02, says: `its dressed size by its length (${r.src}); nominal mass, the bar in the table's wood` }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['2x4 timber/axis'] } }],
};

// ---- sheet goods -----------------------------------------------------------------------------------------------------
type Sheet = { kind: string; t: number; mat: string; sheet: [number, number]; src: string };
const SHEETS: Record<string, Sheet> = {};
const sheets = (kind: string, ts: number[], mat: string, sheet: [number, number], src: string) => { for (const t of ts) SHEETS[`${kind} ${t}`] = { kind, t, mat, sheet, src }; };
sheets('plywood', [3, 4, 6, 9, 12, 15, 18, 21, 24], 'wood-veneer', [2440, 1220], 'EN 636 plywood, the thicknesses and 2440 × 1220 sheet sold (typical)');
sheets('MDF', [3, 6, 9, 12, 15, 18, 22, 25], 'mdf', [2440, 1220], 'EN 622-5 MDF, the thicknesses and 2440 × 1220 sheet sold (typical)');
// (OSB drawn in the table's wood veneer, 680 kg/m³: OSB/3 is about 600–650, typical, so it is drawn a little heavy)
sheets('OSB', [9, 11, 15, 18, 22], 'wood-veneer', [2440, 1220], 'EN 300 OSB/3, the thicknesses and 2440 × 1220 sheet sold (typical)');
sheets('acrylic', [2, 3, 4, 5, 6, 8, 10], 'pmma', [3050, 2030], 'cast acrylic (PMMA), the thicknesses and 3050 × 2030 sheet sold (typical)');
sheets('polycarbonate', [2, 3, 4, 5, 6, 8, 10], 'pc', [3050, 2050], 'solid polycarbonate, the thicknesses and 3050 × 2050 sheet sold (typical)');
sheets('aluminium', [0.5, 0.7, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6], 'al-5052', [2500, 1250], 'aluminium 5052 sheet, EN 485 thicknesses and 2500 × 1250 sheet sold (typical)');
sheets('steel', [0.5, 0.7, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6], 'steel-low', [2500, 1250], 'mild steel sheet, EN 10131 (cold-rolled, to 3 mm) and EN 10051 (hot-rolled) thicknesses, 2500 × 1250 sheet sold (typical)');
sheets('stainless', [0.5, 0.8, 1, 1.2, 1.5, 2, 3], 'stainless-304', [2500, 1250], '304 stainless sheet, the thicknesses and 2500 × 1250 sheet sold (typical)');
const SHEET_COLOR: Record<string, number> = { plywood: 0xd9b98a, MDF: 0xa8835a, OSB: 0xc29a5b, acrylic: 0xdfe8ee, polycarbonate: 0xf2f2f0, aluminium: 0xc4c8cc, steel: 0x8a8c90, stainless: 0xb8bcc2 };
const SHEET_F: PartFamily<Sheet> = {
  id: 'piece.sheet', name: 'Sheet (board, plastic or metal)', gloss: 'A sheet of plywood, MDF, OSB, acrylic, polycarbonate, aluminium, steel or stainless by its thickness, cut to a size', domains: ['structural', 'manufacturing', 'everyday'],
  says: 'A sheet by its kind and thickness ("plywood 18", "MDF 12", "OSB 18", "acrylic 3", "polycarbonate 6", "aluminium 2", "steel 1.5", "stainless 1"), cut to a width (x) and length (z) no bigger than the sheet sold, lying flat, its thickness up (y): a panel, a deck, a skin, a base to stack on. It offers no holes (a plate offers them: Plate)',
  rows: SHEETS, size: 'plywood 18', source: 'EN 636, EN 622-5, EN 300, EN 485, EN 10131 and the sheets sold (typical), each row its own',
  settings: [{ key: 'w', label: 'Width, mm', type: 'number', default: 600 }, { key: 'l', label: 'Length, mm', type: 'number', default: 1200 }],
  cannot: (r, size, set) => { const w = Number(set.w), l = Number(set.l); if (!(w > 0 && l > 0)) return `a width and length above 0 (${String(set.w)} × ${String(set.l)} mm)`;
    const [L, W] = r.sheet; return Math.max(w, l) <= L && Math.min(w, l) <= W ? null : `a ${size} sheet is sold ${L} × ${W} mm: ${w} × ${l} mm is cut from no one sheet`; },
  recipe: (r, size, set) => made(`${size} sheet`, r.mat, { box: [len(set, 'w'), mm(r.t), len(set, 'l')] }, { color: SHEET_COLOR[r.kind]! }),
  expect: (r, _s, set) => ({ bound: [len(set, 'w'), mm(r.t), len(set, 'l')], mass: len(set, 'w') * mm(r.t) * len(set, 'l') * rho(r.mat), tol: 0.01, massTol: 0.02, says: `its cut size by its thickness (${r.src}); nominal mass, the sheet at its material's density` }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};

// ---- bricks and blocks, and a wall laid of them -------------------------------------------------------------------------
type Unit = { L: number; H: number; W: number; mat: string; cores?: number; src: string };
const UNITS: Record<string, Unit> = {
  'UK brick': { L: 215, H: 65, W: 102.5, mat: 'brick', src: 'EN 771-1, the UK work size 215 × 102.5 × 65 mm' },
  'US modular brick': { L: 194, H: 57, W: 92, mat: 'brick', src: 'ASTM C216 modular, 7-5/8 × 3-5/8 × 2-1/4 in (BIA Technical Note 10)' },
  'US standard brick': { L: 203, H: 57, W: 92, mat: 'brick', src: 'ASTM C216 standard, 8 × 3-5/8 × 2-1/4 in (BIA Technical Note 10)' },
  'DIN NF brick': { L: 240, H: 71, W: 115, mat: 'brick', src: 'DIN 105 Normalformat 240 × 115 × 71 mm' },
  'DIN DF brick': { L: 240, H: 52, W: 115, mat: 'brick', src: 'DIN 105 Dünnformat 240 × 115 × 52 mm' },
  'block 440x215x100': { L: 440, H: 215, W: 100, mat: 'concrete', src: 'UK dense aggregate block, 440 × 215 work face (EN 771-3), 100 mm wide' },
  'block 440x215x140': { L: 440, H: 215, W: 140, mat: 'concrete', src: 'UK dense aggregate block, 440 × 215 work face (EN 771-3), 140 mm wide' },
  'block 440x215x215': { L: 440, H: 215, W: 215, mat: 'concrete', src: 'UK dense aggregate block, 440 × 215 work face (EN 771-3), 215 mm wide' },
  // (hollow units: ASTM C90 metric modular sizes; their two cores drawn round, Ø the width less two 32 mm face shells,
  // typical, so a unit is drawn about two-thirds solid where real units are about half)
  'CMU 390x190x140': { L: 390, H: 190, W: 140, mat: 'concrete', cores: 2, src: 'ASTM C90 hollow unit, metric modular 390 × 190 × 140 mm' },
  'CMU 390x190x190': { L: 390, H: 190, W: 190, mat: 'concrete', cores: 2, src: 'ASTM C90 hollow unit, metric modular 390 × 190 × 190 mm' },
  'CMU 390x190x240': { L: 390, H: 190, W: 240, mat: 'concrete', cores: 2, src: 'ASTM C90 hollow unit, metric modular 390 × 190 × 240 mm' },
};
const SHELL = 32; // (a hollow unit's face shells, mm, typical)
const coreR = (u: Unit) => mm(u.W - 2 * SHELL) / 2;
// (a half unit, cut for the bond, is drawn solid: its cores are not where a whole unit's are)
const unitOf = (u: Unit, name: string, L = mm(u.L)): Block => made(name, u.mat, { box: [L, mm(u.H), mm(u.W)] }, { color: u.mat === 'brick' ? BRICK : CONCRETE,
  ...(u.cores && L === mm(u.L) ? { pattern: { name: 'cores', points: [[-L / 4, 0], [L / 4, 0]] as [number, number][], hole: coreR(u) } } : {}) });
const unitVol = (u: Unit) => mm(u.L) * mm(u.H) * mm(u.W) - (u.cores ? u.cores * Math.PI * coreR(u) ** 2 * mm(u.H) : 0);
const UNIT_F: PartFamily<Unit> = {
  id: 'piece.brick', name: 'Brick or block', gloss: 'A clay brick (UK, US, DIN formats) or a concrete block (UK 440 × 215, ASTM C90 hollow units) by its format', domains: ['structural', 'everyday'],
  says: 'A masonry unit by its format: a clay brick (UK 215 × 102.5 × 65, US modular and standard, DIN NF and DF) or a concrete block (UK dense 440 × 215 by 100, 140 or 215 wide; ASTM C90 hollow units, their two cores drawn round and offered as `<name>/cores` for rebar to pass down): lying on its bed, its length along x, its height up (y), its width along z. Drawn in the table\'s brick (1900 kg/m³) or concrete (2400; dense blocks are sold about 2000, typical, so drawn heavy). Lay many as a wall (Wall of bricks or blocks)',
  rows: UNITS, size: 'UK brick', source: 'EN 771-1, EN 771-3, ASTM C216 and C90 (BIA Technical Note 10), DIN 105, each row its own',
  recipe: (u, size) => unitOf(u, size),
  expect: (u) => ({ bound: [mm(u.L), mm(u.H), mm(u.W)], mass: unitVol(u) * rho(u.mat), tol: 0.01, massTol: 0.02, says: `its format (${u.src}); nominal mass, its volume${u.cores ? ' less its cores' : ''} at its material's density` }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }, { set: { size: 'CMU 390x190x190' }, inputs: {}, outputs: { pieces: 1, offers: ['CMU 390x190x190/cores'] } }],
};
/** A course of units in stretcher bond: n whole units, or a half at each end and n − 1 whole between (the next course
 *  up), the perpends between them mortar, laid end to end along x. */
const course = (u: Unit, n: number, j: number, half: boolean, k: number): Block => {
  const mortar = (i: number) => made(`perpend ${k}.${i}`, 'render', { box: [j, mm(u.H), mm(u.W)] }, { color: MORTAR });
  const units = half ? [unitOf(u, `half unit ${k}.0`, (mm(u.L) - j) / 2), ...Array.from({ length: n - 1 }, (_, i) => unitOf(u, `unit ${k}.${i + 1}`)), unitOf(u, `half unit ${k}.${n}`, (mm(u.L) - j) / 2)]
    : Array.from({ length: n }, (_, i) => unitOf(u, `unit ${k}.${i}`));
  return stack(`course ${k}`, 0, units.flatMap((b, i) => (i ? [{ b: mortar(i) }, { b }] : [{ b }])));
};
const wallDims = (u: Unit, set: Record<string, unknown>) => { const n = Number(set.courses), m = Number(set.units), j = len(set, 'joint'); return { n, m, j, Lw: m * mm(u.L) + (m - 1) * j, Hw: n * mm(u.H) + (n - 1) * j }; };
const WALL_F: PartFamily<Unit> = {
  id: 'piece.wall', name: 'Wall of bricks or blocks', gloss: 'A wall laid in stretcher bond: so many courses of so many units, every joint mortar', domains: ['structural', 'everyday'],
  says: 'A wall of any brick or block format laid in stretcher bond, every unit and every joint by the operations: each course its units end to end along x with a mortar perpend between each two, every other course starting and ending with a half unit, and a mortar bed between each course and the next, stacked up (y). Its joints 10 mm unless set; the mortar drawn as the table\'s render (a cement and sand mix, 1800 kg/m³). Hollow units\' cores line up only where their courses do (the halves move them): reinforce a column of whole units',
  rows: UNITS, size: 'UK brick', source: 'its unit\'s row (Brick or block); the joints 10 mm, as BS EN 1996 and BIA Technical Note 10 work them (typical)',
  settings: [{ key: 'courses', label: 'Courses (high)', type: 'number', default: 5 }, { key: 'units', label: 'Units in a course (long)', type: 'number', default: 4 }, { key: 'joint', label: 'Joint, mm', type: 'number', default: 10 }],
  cannot: (u, _s, set) => { const { n, m, j } = wallDims(u, set);
    return !(Number.isInteger(n) && n >= 1 && n <= 40) ? `1 to 40 courses (${String(set.courses)})` : !(Number.isInteger(m) && m >= 1 && m <= 30) ? `1 to 30 units a course (${String(set.units)})` : !(j > 0 && j < mm(u.L) / 2) ? `a joint above 0 and under half a unit (${String(set.joint)} mm)` : null; },
  recipe: (u, size, set) => { const { n, m, j } = wallDims(u, set), items: { b: Block }[] = [];
    for (let k = 0; k < n; k++) { if (k) items.push({ b: made(`bed ${k}`, 'render', { box: [m * mm(u.L) + (m - 1) * j, j, mm(u.W)] }, { color: MORTAR }) }); items.push({ b: course(u, m, j, k % 2 === 1, k) }); }
    return stack(`${size} wall`, 1, items); },
  expect: (u, _s, set) => { const { n, m, j, Lw, Hw } = wallDims(u, set), H = mm(u.H), W = mm(u.W), L = mm(u.L), odd = Math.floor(n / 2), even = n - odd;
    const unitsV = even * m * unitVol(u) + odd * ((m - 1) * unitVol(u) + (L - j) * H * W), mortarV = (even * (m - 1) + odd * m) * j * H * W + (n - 1) * Lw * j * W;
    return { bound: [Lw, Hw, W], mass: unitsV * rho(u.mat) + mortarV * rho('render'), tol: 0.01, massTol: 0.02, says: 'its courses and units with their joints; nominal mass, its units and its mortar' }; },
  tests: [{ set: { courses: 2, units: 2 }, inputs: {}, outputs: { pieces: 9 } }],
};

// ---- steel sections ------------------------------------------------------------------------------------------------
/** I and H sections by EN 10365 (IPE, HEA, HEB; their dimensions and masses as Euronorm 19-57 and 53-62 gave them) and
 *  UPN channels by EN 10279 (DIN 1026-1): h, b, tw, tf (a UPN's at the middle of its flange), r (root radius), mm; kg/m. */
type ISec = { kind: 'I' | 'U'; h: number; b: number; tw: number; tf: number; r: number; kgm: number; src: string };
const I_SECTIONS: Record<string, ISec> = {};
const iRows = (kind: 'I' | 'U', pre: string, src: string, rows: Record<string, [number, number, number, number, number, number]>) => { for (const [k, [h, b, tw, tf, r, kgm]] of Object.entries(rows)) I_SECTIONS[`${pre} ${k}`] = { kind, h, b, tw, tf, r, kgm, src }; };
iRows('I', 'IPE', 'EN 10365 IPE', {
  80: [80, 46, 3.8, 5.2, 5, 6.0], 100: [100, 55, 4.1, 5.7, 7, 8.1], 120: [120, 64, 4.4, 6.3, 7, 10.4], 140: [140, 73, 4.7, 6.9, 7, 12.9], 160: [160, 82, 5.0, 7.4, 9, 15.8], 180: [180, 91, 5.3, 8.0, 9, 18.8],
  200: [200, 100, 5.6, 8.5, 12, 22.4], 220: [220, 110, 5.9, 9.2, 12, 26.2], 240: [240, 120, 6.2, 9.8, 15, 30.7], 270: [270, 135, 6.6, 10.2, 15, 36.1], 300: [300, 150, 7.1, 10.7, 15, 42.2], 330: [330, 160, 7.5, 11.5, 18, 49.1],
  360: [360, 170, 8.0, 12.7, 18, 57.1], 400: [400, 180, 8.6, 13.5, 21, 66.3], 450: [450, 190, 9.4, 14.6, 21, 77.6], 500: [500, 200, 10.2, 16.0, 21, 90.7], 550: [550, 210, 11.1, 17.2, 24, 106], 600: [600, 220, 12.0, 19.0, 24, 122],
});
iRows('I', 'HEA', 'EN 10365 HEA (IPB light)', {
  100: [96, 100, 5, 8, 12, 16.7], 120: [114, 120, 5, 8, 12, 19.9], 140: [133, 140, 5.5, 8.5, 12, 24.7], 160: [152, 160, 6, 9, 15, 30.4], 180: [171, 180, 6, 9.5, 15, 35.5], 200: [190, 200, 6.5, 10, 18, 42.3],
  220: [210, 220, 7, 11, 18, 50.5], 240: [230, 240, 7.5, 12, 21, 60.3], 260: [250, 260, 7.5, 12.5, 24, 68.2], 280: [270, 280, 8, 13, 24, 76.4], 300: [290, 300, 8.5, 14, 27, 88.3],
});
iRows('I', 'HEB', 'EN 10365 HEB (IPB)', {
  100: [100, 100, 6, 10, 12, 20.4], 120: [120, 120, 6.5, 11, 12, 26.7], 140: [140, 140, 7, 12, 12, 33.7], 160: [160, 160, 8, 13, 15, 42.6], 180: [180, 180, 8.5, 14, 15, 51.2], 200: [200, 200, 9, 15, 18, 61.3],
  220: [220, 220, 9.5, 16, 18, 71.5], 240: [240, 240, 10, 17, 21, 83.2], 260: [260, 260, 10, 17.5, 24, 93.0], 280: [280, 280, 10.5, 18, 24, 103], 300: [300, 300, 11, 19, 27, 117],
});
// (a UPN's flanges taper 8 %: drawn parallel at their mean thickness, its root and toe radii not drawn; the area so drawn
// is within about 1 % of the standard's)
iRows('U', 'UPN', 'EN 10279 UPN (DIN 1026-1)', {
  50: [50, 38, 5, 7, 7, 5.59], 65: [65, 42, 5.5, 7.5, 7.5, 7.09], 80: [80, 45, 6, 8, 8, 8.64], 100: [100, 50, 6, 8.5, 8.5, 10.6], 120: [120, 55, 7, 9, 9, 13.4], 140: [140, 60, 7, 10, 10, 16.0], 160: [160, 65, 7.5, 10.5, 10.5, 18.8],
  180: [180, 70, 8, 11, 11, 22.0], 200: [200, 75, 8.5, 11.5, 11.5, 25.3], 220: [220, 80, 9, 12.5, 12.5, 29.4], 240: [240, 85, 9.5, 13, 13, 33.2], 260: [260, 90, 10, 14, 14, 37.9], 280: [280, 95, 10, 15, 15, 41.8], 300: [300, 100, 10, 16, 16, 46.2],
});
/** An I section's outline about its middle, its four root radii drawn (four steps each); a UPN's, its web at −x. */
function iOutline(s: ISec): [number, number][] {
  const h = mm(s.h) / 2, b = mm(s.b), tw = mm(s.tw), tf = mm(s.tf), r = mm(s.r);
  if (s.kind === 'U') return [[0, -h], [b, -h], [b, -h + tf], [tw, -h + tf], [tw, h - tf], [b, h - tf], [b, h], [0, h]];
  const x = tw / 2, B = b / 2;
  return [[-B, -h], [B, -h], [B, -h + tf], ...arc(x + r, -h + tf + r, r, 270, 180), ...arc(x + r, h - tf - r, r, 180, 90), [B, h - tf], [B, h], [-B, h], [-B, h - tf], ...arc(-x - r, h - tf - r, r, 90, 0), ...arc(-x - r, -h + tf + r, r, 0, -90), [-B, -h + tf]];
}
const I_F: PartFamily<ISec> = {
  id: 'piece.steelbeam', name: 'Steel beam (IPE, HEA, HEB, UPN)', gloss: 'A hot-rolled steel I or H beam (EN 10365: IPE 80 to 600, HEA and HEB 100 to 300) or UPN channel (EN 10279) by its size, cut to a length', domains: ['structural', 'manufacturing'],
  says: 'A hot-rolled steel section by its size ("IPE 200", "HEA 160", "HEB 300", "UPN 100"), cut to its length: its profile across (its flanges\' width along x, its depth up, y), its length along z, its root radii drawn (a UPN\'s tapered flanges drawn parallel at their mean thickness). It offers a line along its length (`<size>/axis`); stand it up as a column (Turn about x), lay it on a column or a plate (Onto a face)',
  rows: I_SECTIONS, size: 'IPE 200', source: 'EN 10365 (IPE, HEA, HEB) and EN 10279 (UPN), re-keyed; checked against FreeCAD\'s profiles.csv (LGPL, not copied)',
  settings: [lengthSet(3000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (s, size, set) => sectionOf(size, 'steel-low', iOutline(s), len(set), STEEL),
  expect: (s, _s, set) => ({ bound: [mm(s.b), mm(s.h), len(set)], mass: s.kgm * len(set), tol: 0.01, massTol: 0.03, says: `its flange width, depth and length (${s.src}); its mass the standard's ${s.kgm} kg/m` }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['IPE 200/axis'] } }],
};
/** Angles by EN 10056-1: legs a (up) and b (across), thickness t, root radius r1, mm; kg/m. Equal angles a = b. */
type Angle = { a: number; b: number; t: number; r: number; kgm: number };
const ANGLES: Record<string, Angle> = {};
for (const [k, r, kgm] of [['20x3', 3.5, 0.882], ['25x3', 3.5, 1.12], ['25x4', 3.5, 1.45], ['30x3', 5, 1.36], ['30x4', 5, 1.78], ['35x4', 5, 2.09], ['40x4', 6, 2.42], ['40x5', 6, 2.97], ['45x4.5', 7, 3.06], ['50x5', 7, 3.77], ['50x6', 7, 4.47],
  ['60x6', 8, 5.42], ['60x8', 8, 7.09], ['65x7', 9, 6.83], ['70x7', 9, 7.38], ['75x8', 9, 8.99], ['80x8', 10, 9.63], ['80x10', 10, 11.9], ['90x9', 11, 12.2], ['100x10', 12, 15.0], ['100x12', 12, 17.8],
  ['120x10', 13, 18.2], ['120x12', 13, 21.6], ['150x12', 16, 27.3], ['150x15', 16, 33.8], ['200x16', 18, 48.5], ['200x20', 18, 59.9]] as const) {
  const [a, t] = k.split('x').map(Number) as [number, number]; ANGLES[`L${a}x${a}x${t}`] = { a, b: a, t, r, kgm };
}
for (const [k, r, kgm] of [['30x20x3', 4, 1.12], ['40x20x4', 4, 1.77], ['40x25x4', 4, 1.93], ['45x30x4', 4.5, 2.25], ['50x30x5', 5, 2.96], ['60x30x5', 5, 3.37], ['60x40x5', 6, 3.76], ['60x40x6', 6, 4.46],
  ['65x50x5', 6, 4.35], ['75x50x6', 7, 5.65], ['75x50x8', 7, 7.39], ['80x40x6', 7, 5.41], ['80x60x7', 8, 7.36], ['100x50x6', 8, 6.84], ['100x50x8', 8, 8.97], ['100x65x7', 10, 8.77], ['100x75x8', 10, 10.6],
  ['120x80x8', 11, 12.2], ['120x80x10', 11, 15.0], ['150x75x9', 12, 15.4], ['150x90x10', 12, 18.2], ['150x100x10', 12, 19.0], ['200x100x10', 15, 23.0], ['200x150x12', 15, 32.0]] as const) {
  const [a, b, t] = k.split('x').map(Number) as [number, number, number]; ANGLES[`L${k}`] = { a, b, t, r, kgm };
}
const angleOutline = (q: Angle): [number, number][] => { const a = mm(q.a), b = mm(q.b), t = mm(q.t), r = mm(q.r); return [[0, 0], [b, 0], [b, t], ...arc(t + r, t + r, r, 270, 180), [t, a], [0, a]]; };
const ANGLE_F: PartFamily<Angle> = {
  id: 'piece.steelangle', name: 'Steel angle (equal or unequal)', gloss: 'A hot-rolled steel angle by EN 10056-1, equal (L20x20x3 to L200x200x20) or unequal (L30x20x3 to L200x150x12), cut to a length', domains: ['structural', 'manufacturing'],
  says: 'A hot-rolled steel angle by its size ("L50x50x5", "L100x50x8": its long leg up (y), its other across (x), its thickness), cut to its length along z, its root radius drawn (its toes square: about 1 % heavy). It offers a line along its length (`<size>/axis`, in the space its legs hold)',
  rows: ANGLES, size: 'L50x50x5', source: 'EN 10056-1, re-keyed; checked against FreeCAD\'s profiles.csv (LGPL, not copied)',
  settings: [lengthSet(1000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(size, 'steel-low', angleOutline(q), len(set), STEEL),
  expect: (q, _s, set) => ({ bound: [mm(q.b), mm(q.a), len(set)], mass: q.kgm * len(set), tol: 0.01, massTol: 0.03, says: `its legs and length (EN 10056-1); its mass the standard's ${q.kgm} kg/m` }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['L50x50x5/axis'] } }],
};
/** Hollow sections: square and rectangular by EN 10219-2 (cold-formed: its outside corner radius 2t to 6 mm wall, 2.5t to
 *  10 mm, 3t above, its area by the standard's formula), circular by EN 10210-2 / 10219-2 (outside diameter and wall). */
type Hollow = { kind: 'R' | 'C'; H: number; B: number; t: number };
const HOLLOWS: Record<string, Hollow> = {};
for (const [a, t] of [[20, 2], [25, 2.5], [30, 3], [40, 3], [40, 4], [50, 3], [50, 4], [50, 5], [60, 4], [60, 5], [70, 4], [80, 4], [80, 5], [80, 6], [90, 5], [100, 4], [100, 5], [100, 6], [100, 8],
  [120, 5], [120, 6], [120, 8], [140, 6], [150, 6], [150, 8], [150, 10], [160, 8], [180, 8], [200, 8], [200, 10], [250, 10], [300, 10]] as const) HOLLOWS[`SHS ${a}x${a}x${t}`] = { kind: 'R', H: a, B: a, t };
for (const [h, b, t] of [[40, 20, 2], [50, 25, 2.5], [50, 30, 3], [60, 40, 3], [60, 40, 4], [80, 40, 3], [80, 40, 4], [90, 50, 4], [100, 50, 4], [100, 50, 5], [100, 60, 5], [120, 60, 5], [120, 80, 5], [120, 80, 6],
  [140, 80, 5], [150, 100, 6], [160, 80, 6], [200, 100, 6], [200, 100, 8], [250, 150, 8], [300, 200, 10]] as const) HOLLOWS[`RHS ${h}x${b}x${t}`] = { kind: 'R', H: h, B: b, t };
for (const [d, t] of [[21.3, 2.6], [26.9, 2.6], [33.7, 3.2], [42.4, 3.2], [48.3, 3.2], [48.3, 4], [60.3, 3.2], [60.3, 4], [76.1, 3.2], [76.1, 4], [88.9, 3.2], [88.9, 4], [114.3, 3.6], [114.3, 5], [139.7, 5], [168.3, 5], [168.3, 6.3],
  [219.1, 6.3], [219.1, 8], [273, 8], [323.9, 8], [323.9, 10]] as const) HOLLOWS[`CHS ${d}x${t}`] = { kind: 'C', H: d, B: d, t };
const cornerR = (t: number) => (t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t);
/** EN 10219-2's area of a square or rectangular hollow section, mm². */
const rhsArea = (q: Hollow) => { const ro = cornerR(q.t), ri = ro - q.t; return 2 * q.t * (q.B + q.H - 2 * q.t) - (4 - Math.PI) * (ro * ro - ri * ri); };
/** A rounded rectangle's outline, counter-clockwise from the middle of its +x side, the corners in six steps each. */
const roundRect = (w: number, h: number, r: number): [number, number][] => [[w / 2, 0], ...arc(w / 2 - r, h / 2 - r, r, 0, 90, 6), ...arc(-w / 2 + r, h / 2 - r, r, 90, 180, 6), ...arc(-w / 2 + r, -h / 2 + r, r, 180, 270, 6), ...arc(w / 2 - r, -h / 2 + r, r, 270, 360, 6)];
/** A hollow section's outline as one loop read even-odd: its outside counter-clockwise, a slit in, its inside clockwise,
 *  and the slit back out. */
const rhsOutline = (q: Hollow): [number, number][] => { const t = mm(q.t), ro = mm(cornerR(q.t)), outer = roundRect(mm(q.B), mm(q.H), ro), inner = roundRect(mm(q.B) - 2 * t, mm(q.H) - 2 * t, ro - t).reverse();
  return [...outer, outer[0]!, inner[inner.length - 1]!, ...inner]; };
const HOLLOW_F: PartFamily<Hollow> = {
  id: 'piece.hollowsection', name: 'Steel hollow section (SHS, RHS, CHS)', gloss: 'A steel square, rectangular (EN 10219-2) or circular (EN 10210-2) hollow section by its size and wall, cut to a length', domains: ['structural', 'manufacturing'],
  says: 'A steel hollow section by its size: square or rectangular ("SHS 50x50x3", "RHS 100x50x4": its depth up (y), its width across (x), its wall), its corners rounded as EN 10219-2 works them, its length along z, offering a line along its length (`<size>/axis`, down its bore); or circular ("CHS 48.3x3.2": outside diameter and wall), a tube standing along y that offers its axis, for a sleeve over it or a bolt down it. Stand an SHS up as a post (Turn about x)',
  rows: HOLLOWS, size: 'SHS 50x50x3', source: 'EN 10219-2 (cold-formed SHS and RHS, its area formula) and EN 10210-2 (CHS), sizes re-keyed; checked against FreeCAD\'s profiles.csv (LGPL, not copied)',
  settings: [lengthSet(1000)], cannot: (q, size, set) => noLength(set) ?? (2 * q.t < q.B ? null : `${size}: its wall leaves no bore`),
  recipe: (q, size, set) => (q.kind === 'C' ? made(size, 'steel-low', { tube: [mm(q.H / 2 - q.t), mm(q.H / 2), len(set)] }, { color: STEEL }) : sectionOf(size, 'steel-low', rhsOutline(q), len(set), STEEL)),
  expect: (q, _s, set) => q.kind === 'C' ? { bound: [mm(q.H), len(set), mm(q.H)], mass: Math.PI * mm(q.H - q.t) * mm(q.t) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass π(D − t)t' }
    : { bound: [mm(q.B), mm(q.H), len(set)], mass: rhsArea(q) * 1e-6 * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its width, depth and length; nominal mass by EN 10219-2\'s area (its corner radii in)' },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['SHS 50x50x3/axis'] } }, { set: { size: 'CHS 48.3x3.2' }, inputs: {}, outputs: { pieces: 1, offers: ['CHS 48.3x3.2/axis'] } }],
};
/** Bright and hot-rolled bar: flat (EN 10058: width × thickness), square (EN 10059: side) and round (EN 10060: diameter),
 *  the stock sizes merchants sell (typical, within each standard's range). */
type Bar = { kind: 'flat' | 'square' | 'round'; w: number; t: number };
const BARS: Record<string, Bar> = {};
for (const w of [12, 16, 20, 25, 30, 40, 50, 60, 75, 80, 100, 120, 150]) for (const t of [3, 5, 6, 8, 10, 12, 15, 20, 25]) if (t <= w / 2) BARS[`flat ${w}x${t}`] = { kind: 'flat', w, t };
for (const a of [6, 8, 10, 12, 16, 20, 25, 30, 40, 50, 60, 80, 100]) BARS[`square ${a}`] = { kind: 'square', w: a, t: a };
for (const d of [5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 30, 32, 35, 40, 45, 50, 60, 70, 80, 90, 100]) BARS[`round ${d}`] = { kind: 'round', w: d, t: d };
const BAR_MAT: Record<string, string> = { steel: 'steel-low', aluminium: 'al-6061', stainless: 'stainless-304', brass: 'brass' };
const BAR_F: PartFamily<Bar> = {
  id: 'piece.bar', name: 'Bar (flat, square, round)', gloss: 'A flat (EN 10058), square (EN 10059) or round (EN 10060) bar of steel, aluminium, stainless or brass, cut to a length', domains: ['structural', 'mechanical', 'manufacturing'],
  says: 'A bar by its shape and size ("flat 40x5", "square 20", "round 25") and its metal, cut to its length: a flat or square bar\'s section along z (a flat bar lying flat, its width across), offering a line along its length; a round bar standing along y, offering its axis, for a bush, a collar or a wheel to slide over it',
  rows: BARS, size: 'flat 40x5', source: 'EN 10058, EN 10059 and EN 10060 ranges, the stock sizes sold (typical)',
  settings: [lengthSet(1000), { key: 'metal', label: 'Metal', type: 'choice', default: 'steel', choices: Object.keys(BAR_MAT) }],
  cannot: (_r, _s, set) => noLength(set) ?? (BAR_MAT[String(set.metal)] ? null : `a metal of ${Object.keys(BAR_MAT).join(', ')} (${String(set.metal)})`),
  recipe: (q, size, set) => { const mat = BAR_MAT[String(set.metal)]!; return q.kind === 'round' ? made(`${size} bar`, mat, { cyl: [mm(q.w) / 2, len(set)] }) : sectionOf(`${size} bar`, mat, rect(mm(q.w), mm(q.t)), len(set)); },
  expect: (q, _s, set) => { const mat = BAR_MAT[String(set.metal)]!, L = len(set);
    return q.kind === 'round' ? { bound: [mm(q.w), L, mm(q.w)], mass: disc(mm(q.w)) * L * rho(mat), tol: 0.01, massTol: 0.02, says: 'its diameter by its length; nominal mass, the rod' }
      : { bound: [mm(q.w), mm(q.t), L], mass: mm(q.w) * mm(q.t) * L * rho(mat), tol: 0.01, massTol: 0.02, says: 'its section by its length; nominal mass, the bar' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['flat 40x5 bar/axis'] } }],
};

// ---- rebar ------------------------------------------------------------------------------------------------------------
/** B500B ribbed bar (EN 10080, BS 4449): nominal diameter, mm, and its nominal mass, kg/m (0.00617 d²). */
const REBAR: Record<string, { d: number; kgm: number }> = { 6: { d: 6, kgm: 0.222 }, 8: { d: 8, kgm: 0.395 }, 10: { d: 10, kgm: 0.617 }, 12: { d: 12, kgm: 0.888 }, 16: { d: 16, kgm: 1.579 }, 20: { d: 20, kgm: 2.466 }, 25: { d: 25, kgm: 3.854 }, 32: { d: 32, kgm: 6.313 }, 40: { d: 40, kgm: 9.864 } };
// (BS 8666's least bending radius: 2d to 16 mm, 3.5d above; the bar's middle line half a bar further out)
const bendR = (d: number) => mm((d <= 16 ? 2 : 3.5) * d + d / 2);
const REBAR_F: PartFamily<{ d: number; kgm: number }> = {
  id: 'piece.rebar', name: 'Reinforcing bar (B500B)', gloss: 'A B500B ribbed reinforcing bar (EN 10080, BS 4449) by its diameter, straight or bent to an L (BS 8666), cut to a length', domains: ['structural'],
  says: 'A reinforcing bar of B500B steel by its diameter (6 to 40 mm; its ribs not drawn), standing along y: straight, so long, offering its axis, to pass down a hollow block\'s cores or a hole (Through a line); or bent to an L (shape code 11 of BS 8666), its leg turned at the least radius BS 8666 allows',
  rows: REBAR, size: '12', source: 'EN 10080 and BS 4449 (diameters and nominal mass), BS 8666 (bending radii)',
  settings: [lengthSet(1000), { key: 'shape', label: 'Shape', type: 'choice', default: 'straight', choices: ['straight', 'L'] }, { key: 'leg', label: 'Leg of an L, mm', type: 'number', default: 300 }],
  cannot: (_r, _s, set) => noLength(set) ?? (set.shape === 'L' ? noLength(set, 'leg') : null),
  recipe: (q, size, set) => { const ro = mm(q.d) / 2, name = `B500B ${size} bar`;
    if (set.shape !== 'L') return made(name, 'steel-low', { cyl: [ro, len(set)] }, { color: 0x5a4a40 });
    return run(name, [{ name, mat: 'steel-low', ro, color: 0x5a4a40, straight: len(set) }, { name: `${name} bend`, mat: 'steel-low', ro, color: 0x5a4a40, bend: 90, R: bendR(q.d) }, { name: `${name} leg`, mat: 'steel-low', ro, color: 0x5a4a40, straight: len(set, 'leg') }]); },
  expect: (q, _s, set) => set.shape === 'L' ? { mass: q.kgm * (len(set) + len(set, 'leg') + (Math.PI / 2) * bendR(q.d)), tol: 0.01, massTol: 0.02, says: 'its developed length (its legs and its bend\'s middle line) at the standard\'s kg/m' }
    : { bound: [mm(q.d), len(set), mm(q.d)], mass: q.kgm * len(set), tol: 0.01, massTol: 0.02, says: `its diameter by its length; its mass the standard's ${q.kgm} kg/m` },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['B500B 12 bar/axis'] } }],
};

// ---- anchors and wall plugs, nails and deck screws (typical, save the nails) ------------------------------------------
/** Wedge (through-bolt) anchors as their makers sell them: thread M and length, mm (typical of the Fischer FAZ and Hilti
 *  HST ranges); their expansion clip not drawn. */
const ANCHORS: Record<string, { M: string; L: number }> = Object.fromEntries([['M8', 75], ['M8', 95], ['M10', 90], ['M10', 120], ['M12', 100], ['M12', 120], ['M12', 160], ['M16', 125], ['M16', 145], ['M20', 165]].map(([M, L]) => [`${M}x${L}`, { M: String(M), L: Number(L) }]));
const ANCHOR_F: PartFamily<{ M: string; L: number }> = {
  id: 'piece.anchor', name: 'Wedge anchor', gloss: 'A through-bolt wedge anchor for concrete by its thread and length (typical), its washer and nut on', domains: ['structural', 'everyday'],
  says: 'A wedge anchor for concrete by its thread and length ("M12x100", typical): its shank standing along y, offering its axis (`<size> anchor/axis`), its washer (ISO 7089) and nut (ISO 4032) slid over its top (Over a shaft); its expansion clip not drawn. It goes down a fixture\'s hole into the concrete (Through a line)',
  rows: ANCHORS, size: 'M12x100', source: 'the Fischer FAZ and Hilti HST ranges (typical); its washer and nut ISO 7089 and ISO 4032 (bd_warehouse)',
  recipe: (q, size) => { const m = METRIC[q.M]!, shank = made(`${size} anchor`, 'steel-low', { cyl: [mm(m.d) / 2, mm(q.L)] }, { color: GALV });
    return over(shank, `${size} anchor/axis`, stack(`${size} washer and nut`, 1, [{ b: washer(q.M) }, { b: nut(q.M) }]), 'hi', 'touch'); },
  expect: (q) => { const m = METRIC[q.M]!, e = (2 * mm(m.s!)) / Math.sqrt(3);
    return { bound: [Math.max(e, mm(m.d2!)), mm(q.L), Math.max(mm(m.s!), mm(m.d2!))], mass: (disc(mm(m.d)) * mm(q.L) + ((Math.sqrt(3) / 2) * mm(m.s!) ** 2 - disc(mm(m.d))) * mm(m.m!) + (disc(mm(m.d2!)) - disc(mm(m.d1!))) * mm(m.hw!)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its washer\'s or nut\'s width by its length; nominal mass, shank, nut and washer' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
/** Common wire nails (ASTM F1667, as the AWC's NDS tables list them): length, shank and head diameter, in; their heads
 *  drawn half a shank thick and their points a cone a shank and a half long (typical). */
const NAILS: Record<string, { L: number; D: number; H: number }> = { '6d': { L: 2, D: 0.113, H: 0.266 }, '8d': { L: 2.5, D: 0.131, H: 0.281 }, '10d': { L: 3, D: 0.148, H: 0.312 }, '12d': { L: 3.25, D: 0.148, H: 0.312 }, '16d': { L: 3.5, D: 0.162, H: 0.344 }, '20d': { L: 4, D: 0.192, H: 0.406 }, '30d': { L: 4.5, D: 0.207, H: 0.438 }, '40d': { L: 5, D: 0.225, H: 0.469 } };
const inch = (x: number) => mm(x * 25.4);
const NAIL_F: PartFamily<{ L: number; D: number; H: number }> = {
  id: 'piece.nail', name: 'Nail (common)', gloss: 'A common wire nail by its penny size (ASTM F1667)', domains: ['structural', 'everyday'],
  says: 'A common wire nail by its penny size ("8d", ASTM F1667): its point, its shank and its flat head stacked up y, its length to the underside of its head; its shank offers its axis (`<size> nail/axis`) and it goes down a line through what it fixes (Through a line). Its head drawn half a shank thick, its point a cone (typical)',
  rows: NAILS, size: '8d', source: 'ASTM F1667 common nails, as the AWC NDS lists them (length, shank, head); head thickness and point typical',
  recipe: (q, size) => { const r = inch(q.D) / 2, pt = 3 * r, c = { color: 0x7d8085 };
    return stack(`${size} nail`, 1, [{ b: made(`${size} nail point`, 'steel-low', { cone: [0, r, pt] }, c) }, { b: made(`${size} nail`, 'steel-low', { cyl: [r, inch(q.L) - pt] }, c) }, { b: made(`${size} nail head`, 'steel-low', { cyl: [inch(q.H) / 2, r] }, c) }]); },
  expect: (q) => { const r = inch(q.D) / 2; return { bound: [inch(q.H), inch(q.L) + r, inch(q.H)], mass: (Math.PI * r * r * (inch(q.L) - 3 * r) + (Math.PI * r * r * 3 * r) / 3 + disc(inch(q.H)) * r) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its head by its length and head; nominal mass, its point, shank and head' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['8d nail head/axis', '8d nail point/axis', '8d nail/axis'] } }],
};
/** Deck and wood screws, countersunk (90°): major diameter and length, mm, its head 2d across (typical of the decking
 *  screws sold); the US #8 and #10 by ASME B18.6.1 (major diameter, head). Its thread not drawn. */
const SCREWS: Record<string, { d: number; L: number; D: number }> = { '4x40': { d: 4, L: 40, D: 8 }, '4.5x50': { d: 4.5, L: 50, D: 9 }, '5x60': { d: 5, L: 60, D: 10 }, '5x70': { d: 5, L: 70, D: 10 }, '5x80': { d: 5, L: 80, D: 10 }, '6x100': { d: 6, L: 100, D: 12 },
  '#8x2-1/2': { d: 4.17, L: 63.5, D: 8.43 }, '#10x3': { d: 4.83, L: 76.2, D: 9.78 } };
const SCREW_F: PartFamily<{ d: number; L: number; D: number }> = {
  id: 'piece.deckscrew', name: 'Deck screw (countersunk wood screw)', gloss: 'A countersunk deck or wood screw by its diameter and length (typical; #8 and #10 by ASME B18.6.1)', domains: ['structural', 'everyday'],
  says: 'A countersunk deck screw by its diameter and length ("5x60", "#10x3"): its point, its shank (its thread not drawn) and its 90° countersunk head stacked up y, its length overall; its shank offers its axis (`<size> screw/axis`). Head 2d across where no standard says (typical)',
  rows: SCREWS, size: '5x60', source: 'the decking screws sold (typical); #8 and #10 major and head diameters by ASME B18.6.1',
  recipe: (q, size) => { const r = mm(q.d) / 2, R = mm(q.D) / 2, hh = R - r, pt = 3 * r;
    return stack(`${size} screw`, 1, [{ b: made(`${size} screw point`, 'steel-alloy', { cone: [0, r, pt] }) }, { b: made(`${size} screw`, 'steel-alloy', { cyl: [r, mm(q.L) - hh - pt] }) }, { b: made(`${size} screw head`, 'steel-alloy', { cone: [r, R, hh] }) }]); },
  expect: (q) => { const r = mm(q.d) / 2, R = mm(q.D) / 2, hh = R - r, pt = 3 * r;
    return { bound: [mm(q.D), mm(q.L), mm(q.D)], mass: (Math.PI * r * r * (mm(q.L) - hh - pt) + (Math.PI * r * r * pt) / 3 + (Math.PI * hh * (r * r + r * R + R * R)) / 3) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its head across by its length overall; nominal mass, its point, shank and head' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['5x60 screw head/axis', '5x60 screw point/axis', '5x60 screw/axis'] } }],
};

// ---- joist hangers and angle brackets (typical) ------------------------------------------------------------------------
/** Face-fix joist hangers by the joist they take (width × depth, mm): galvanised steel 2 mm, the U 2 mm wider than the
 *  joist and 20 mm under its depth, its seat 60 mm long, a 40 mm flange each side with Ø5 nail holes 40 apart (typical
 *  of the hangers sold). */
type Hanger = { b: number; h: number };
const HANGERS: Record<string, Hanger> = Object.fromEntries([[38, 89], [38, 140], [47, 100], [47, 150], [47, 175], [47, 200], [47, 225], [63, 200], [75, 200], [75, 225]].map(([b, h]) => [`${b}x${h}`, { b: b!, h: h! }]));
const HT = 2, SEAT = 60, FLANGE = 40, NAIL_HOLE = 5;
const hangerDims = (q: Hanger) => { const bw = q.b + 2, H = q.h - 20, rows = Math.max(1, Math.floor((H - 20) / 40)); return { bw, H, rows, W: bw + 2 * HT + 2 * FLANGE }; };
const HANGER_F: PartFamily<Hanger> = {
  id: 'piece.joisthanger', name: 'Joist hanger', gloss: 'A face-fix galvanised steel joist hanger by the joist it takes (typical)', domains: ['structural', 'everyday'],
  says: 'A face-fix joist hanger by the joist it takes ("47x200", width × depth, mm; typical): its back flange plate (nailed to the header, its holes offered as `<size> hanger flange/holes`, running into it along +z) and its U, the joist\'s seat and sides, stacked out from it along z; the U offers a line along its length (`<size> hanger seat/axis`) where the joist goes',
  rows: HANGERS, size: '47x200', source: 'the face-fix hangers sold (typical): 2 mm galvanised steel, Ø5 nail holes',
  recipe: (q, size) => { const { bw, H, rows, W } = hangerDims(q), t = mm(HT), x = mm(bw / 2 + HT + FLANGE / 2), pts: [number, number][] = [];
    for (let i = 0; i < rows; i++) { const y = mm((i - (rows - 1) / 2) * 40); pts.push([-x, y], [x, y]); }
    const flange = made(`${size} hanger flange`, 'steel-low', { box: [mm(W), mm(H), t] }, { color: GALV, pattern: { name: 'holes', points: pts, hole: mm(NAIL_HOLE) / 2, face: '-z' } });
    const b2 = mm(bw) / 2, h = mm(H), u: [number, number][] = [[-b2 - t, 0], [b2 + t, 0], [b2 + t, h], [b2, h], [b2, t], [-b2, t], [-b2, h], [-b2 - t, h]];
    return stack(`${size} joist hanger`, 2, [{ b: flange }, { b: sectionOf(`${size} hanger seat`, 'steel-low', u, mm(SEAT), GALV) }]); },
  expect: (q) => { const { bw, H, rows, W } = hangerDims(q), t = mm(HT), b2 = mm(bw) / 2, h = mm(H);
    const uA = 2 * t * h + 2 * b2 * t, flangeV = mm(W) * h * t - 2 * rows * disc(mm(NAIL_HOLE)) * t;
    return { bound: [mm(W), h, t + mm(SEAT)], mass: (flangeV + uA * mm(SEAT)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its flange plate\'s width and height, its seat out from it; nominal mass, the plate less its holes and the U' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['47x200 hanger flange/holes', '47x200 hanger seat/axis'] } }],
};
/** Angle brackets for timber: legs a × a, width L, thickness t, mm, two Ø5.5 holes in each leg (typical of the
 *  galvanised brackets sold); made by common.ts's L bracket. */
type Bracket = { a: number; L: number; t: number; holes: number };
const BRACKETS: Record<string, Bracket> = { '40x40x40x2': { a: 40, L: 40, t: 2, holes: 2 }, '60x60x40x2': { a: 60, L: 40, t: 2, holes: 2 }, '70x70x55x2.5': { a: 70, L: 55, t: 2.5, holes: 2 }, '90x90x65x2.5': { a: 90, L: 65, t: 2.5, holes: 3 }, '105x105x90x3': { a: 105, L: 90, t: 3, holes: 3 } };
const BRACKET_F: PartFamily<Bracket> = {
  id: 'piece.anglebracket', name: 'Angle bracket (timber)', gloss: 'A galvanised steel angle bracket for timber by its legs, width and thickness (typical)', domains: ['structural', 'everyday'],
  says: 'An angle bracket for timber by its size ("90x90x65x2.5": legs, width, thickness, mm; typical): its upright and its foot, each with its holes for M5 screws or bolts (ISO 273 medium clearance), offered as `angle bracket <size> foot/holes` and `… upright/holes`. Bolted down by its foot (Bolted down to a plate), or to a post by its upright',
  rows: BRACKETS, size: '90x90x65x2.5', source: 'the galvanised angle brackets sold (typical); its holes ISO 273 medium clearance for M5',
  recipe: (q, size) => bracket(`angle bracket ${size}`, mm(q.a), mm(q.t), mm(q.L), 'M5', q.holes, 'steel-low'),
  expect: (q) => { const a = mm(q.a), t = mm(q.t), L = mm(q.L), hole = mm(METRIC.M5!.clear!);
    return { bound: [a, a, L], mass: (a * t * L + (a - t) * t * L - 2 * q.holes * disc(hole) * t) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its legs by its width; nominal mass, its two legs less their holes' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['angle bracket 90x90x65x2.5 foot/holes', 'angle bracket 90x90x65x2.5 upright/holes'] } }],
};

/** Every building and structural family, as its rows and recipe. */
export const BUILDING_FAMILIES = [LUMBER_F, SHEET_F, UNIT_F, WALL_F, I_F, ANGLE_F, HOLLOW_F, BAR_F, REBAR_F, ANCHOR_F, NAIL_F, SCREW_F, HANGER_F, BRACKET_F] as PartFamily<unknown>[];
/** Their piece nodes (the maker's, one each), for parts/index.ts to put on the piece.* shelf. */
export const BUILDING_NODES: BlockDef[] = BUILDING_FAMILIES.map((f) => familyNode(f));