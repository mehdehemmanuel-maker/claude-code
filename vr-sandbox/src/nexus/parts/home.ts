// Tools, workshop, garden, kitchen, household, sports and toy parts made by the table-driven maker (decision 0029, the
// user's words of 2026-11-06: "stop testing everything and just populate the library ... do the whole app roughly").
// Each family a table of rows and one recipe of the room operations (src/nexus/room.ts): no place is written here,
// every place is what an operation gives. ROUGH: each thing built once so it runs; the review by roots comes after.
//
// Sources: every figure here is typical of what shops sell or recalled (written from memory of makers' tables, read from
// no source here), and each family's `source` says so. A bought thing with no simple shape is its envelope (a box or a
// cylinder of its size) and says so. Woods are drawn at the nearest density the table has (beech, hickory, ash and maple
// at oak's 750 kg/m³; willow, cane, pine and plywood at wood's 500), said in each family.

import { made, onto, over, ring, run, stack, through, turn, type Block, type MadeOpts } from '../room';
import { densityKg } from '../mass';
import { familyNode, type Expect, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

type Pt = [number, number];
const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const disc = (d: number) => (Math.PI * d * d) / 4;
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const lengthSet = (d: number) => ({ key: 'length', label: 'Length, mm', type: 'number' as const, default: d });
const noLength = (set: Record<string, unknown>, k = 'length') => (len(set, k) > 0 && Number.isFinite(len(set, k)) ? null : `a length above 0 (${String(set[k])} mm)`);
const T = (pieces: number, more: Record<string, unknown> = {}, set?: Record<string, unknown>) => ({ ...(set ? { set } : {}), inputs: {}, outputs: { pieces, ...more } });
/** A table written as rows of numbers: each row's name, then its figures under the keys given. */
function rowsOf<K extends string>(keys: readonly K[], rows: readonly (readonly [string, ...number[]])[]): Record<string, Record<K, number>> {
  return Object.fromEntries(rows.map(([name, ...v]) => [name, Object.fromEntries(keys.map((k, i) => [k, v[i]!])) as Record<K, number>]));
}
/** A closed outline with a hole in it, joined by a cut of no width (as install.ts draws a bored knob). */
const withHole = (outer: Pt[], inner: Pt[]): Pt[] => { const i = [...inner].reverse(); return [...outer, outer[0]!, ...i, i[0]!]; };
const rect = (w: number, h: number, cx = 0, cy = 0): Pt[] => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
/** A hollow rectangle's outline as one loop read even-odd (as structure.ts draws a box section). */
const boxOutline = (B: number, H: number, t: number): Pt[] => {
  const loop = (w: number, h: number): Pt[] => [[w / 2, 0], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]];
  const outer = loop(B, H), inner = loop(B - 2 * t, H - 2 * t).reverse(); return [...outer, outer[0]!, inner[inner.length - 1]!, ...inner];
};
/** A box so long (x), high (y) and deep (z), mm. */
const box = (name: string, mat: string, L: number, H: number, W: number, color: number, o: MadeOpts = {}): Block => made(name, mat, { box: [mm(L), mm(H), mm(W)] }, { color, ...o });
const cyl = (name: string, mat: string, D: number, h: number, color: number): Block => made(name, mat, { cyl: [mm(D) / 2, mm(h)] }, { color });
const bound = (L: number, H: number, W: number, says: string, tol = 0.02): Expect => ({ bound: [mm(L), mm(H), mm(W)], tol, says });
const boxE = (L: number, H: number, W: number, mat: string, says: string): Expect => ({ bound: [mm(L), mm(H), mm(W)], mass: mm(L) * mm(H) * mm(W) * rho(mat), tol: 0.01, massTol: 0.02, says });
const cylE = (D: number, h: number, mat: string, says: string): Expect => ({ bound: [mm(D), mm(h), mm(D)], mass: disc(mm(D)) * mm(h) * rho(mat), tol: 0.01, massTol: 0.02, says });
/** A bar lying along x on two legs (a towel rail, a T-bar handle): the legs a ring of two at the centres asked, the bar
 *  turned to lie across them, stacked up y. */
const barOnLegs = (name: string, mat: string, c: number, barD: number, barL: number, legD: number, legH: number, color: number): Block => {
  const legs = ring(`${name} legs`, cyl(`${name} leg`, mat, legD, legH, color), 2, mm(c / 2), 'clear');
  return stack(name, 1, [{ b: legs }, { b: turn(cyl(`${name} bar`, mat, barD, barL, color), 2, 90) }]);
};
const STEEL = 0x6b6e72, CHROME = 0xc9cdd1, AL = 0xc8ccd0, WOOD = 0xc8a46a, DARK = 0x2a2b2e, GREY = 0x9a9ea3, RED = 0xb8322a, GREEN = 0x3f7a3a, BRASS = 0xc9a54a, WHITE = 0xeeeeee, BLUE = 0x2f5fa8, TERRA = 0xb5562b, GLASS = 0xdfe8ee, GALV = 0xa8adb2;
const TOOLS = ['mechanical', 'everyday', 'manufacturing'], HOME = ['everyday', 'structural'], SPORT = ['everyday', 'mechanical'], TOY = ['everyday'];
const TYP = 'typical of what shops sell (recalled, read from no source here)';

// ==== tools ==========================================================================================================
type Hammer = { oz: number; L: number; H: number; W: number; eye: number };
/** Claw hammer heads by weight (oz, as they are sold): length (x), height (y, the eye along it), width; the eye round
 *  here (its real one oval), typical. */
const HAMMER_HEADS = rowsOf(['oz', 'L', 'H', 'W', 'eye'] as const, [['8 oz', 8, 100, 24, 22, 16], ['12 oz', 12, 112, 27, 25, 18], ['16 oz', 16, 125, 30, 28, 20], ['20 oz', 20, 135, 32, 30, 22], ['24 oz', 24, 145, 35, 32, 24], ['32 oz', 32, 160, 38, 35, 26]]);
const HAMMERHEAD: PartFamily<Hammer> = {
  id: 'piece.hammerhead', name: 'Hammer head', gloss: 'A claw hammer head by its weight, 8 to 32 oz, its eye through it for the handle (typical)', domains: TOOLS, aisle: 'Tools / Hammers',
  says: 'A claw hammer head by its weight (8 to 32 oz; its sizes typical, recalled): a forged steel block, its face toward +x and its claw toward −x (the claw\'s split not drawn), its eye a round hole down through it offered as `<size> hammer head/eye`: the handle (piece.hammerhandle) goes up through it (Through a line, tight)',
  rows: HAMMER_HEADS, size: '16 oz', source: TYP, envelope: 'a block of the head\'s size, its eye round',
  recipe: (q, size) => box(`${size} hammer head`, 'steel-alloy', q.L, q.H, q.W, STEEL, { pattern: { name: 'eye', points: [[0, 0]], hole: mm(q.eye) / 2 } }),
  expect: (q) => bound(q.L, q.H, q.W, 'its length, height and width'),
  tests: [T(1, { offers: ['16 oz hammer head/eye'] })],
};
/** Hammer handles by length: hickory, round here (really oval), the eye's size at the top, typical. */
const HAMMER_HANDLES = rowsOf(['L', 'D'] as const, [['250', 250, 16], ['300', 300, 18], ['330', 330, 20], ['350', 350, 22], ['400', 400, 24], ['450', 450, 26]]);
const HAMMERHANDLE: PartFamily<{ L: number; D: number }> = {
  id: 'piece.hammerhandle', name: 'Hammer handle', gloss: 'A hickory hammer handle by its length, 250 to 450 mm, round at the eye\'s size (typical)', domains: TOOLS, aisle: 'Tools / Hammers',
  says: 'A hammer handle by its length (250 to 450 mm, typical, recalled): a round hickory rod at the eye\'s size, standing along y, offered as `<size> hammer handle/axis`; it goes up through a head\'s eye (Through a line, tight). Drawn at oak\'s density (hickory\'s is near it); its swell and wedge not drawn',
  rows: HAMMER_HANDLES, size: '330', source: TYP, envelope: 'a round rod of the eye\'s size (really oval and swelling to the grip)',
  recipe: (q, size) => cyl(`${size} hammer handle`, 'oak', q.D, q.L, WOOD),
  expect: (q) => cylE(q.D, q.L, 'oak', 'its diameter and length; nominal mass as a rod at oak\'s density'),
  tests: [T(1, { offers: ['330 hammer handle/axis'] })],
};
/** Open-end wrenches by their jaw (mm): overall length, head width and thickness, typical. */
const WRENCHES = rowsOf(['L', 'W', 't'] as const, [['8', 100, 22, 5], ['10', 110, 26, 5.5], ['13', 140, 32, 6], ['17', 180, 40, 7], ['19', 200, 44, 8], ['22', 230, 50, 9], ['24', 250, 54, 10], ['30', 300, 66, 12]]);
const WRENCH: PartFamily<{ L: number; W: number; t: number }> = {
  id: 'piece.wrench', name: 'Open-end wrench', gloss: 'An open-end spanner by its jaw, 8 to 30 mm, as its envelope (typical)', domains: TOOLS, aisle: 'Tools / Spanners',
  says: 'An open-end spanner by its jaw size (8 to 30 mm; its length, head width and thickness typical, recalled): its envelope, a flat chrome-vanadium bar lying along x, so wide (z) and thick (y); its jaws not cut',
  rows: WRENCHES, size: '13', source: TYP, envelope: 'a flat bar of its length, head width and thickness; the jaws not cut',
  recipe: (q, size) => box(`${size} mm wrench`, 'steel-alloy', q.L, q.t, q.W, CHROME),
  expect: (q) => bound(q.L, q.t, q.W, 'its length, thickness and head width'),
  tests: [T(1)],
};
/** Screwdrivers by tip: shank diameter and length, handle diameter and length, typical. */
const SCREWDRIVERS = rowsOf(['d', 'Ls', 'D', 'Lh'] as const, [['PH0', 3, 60, 18, 70], ['PH1', 4.5, 80, 25, 90], ['PH2', 6, 100, 30, 105], ['PH3', 8, 150, 36, 120], ['SL 4', 4, 100, 22, 80], ['SL 5.5', 5.5, 125, 28, 100], ['SL 6.5', 6.5, 150, 32, 110], ['SL 8', 8, 175, 36, 120], ['T20', 4.5, 100, 28, 100], ['T25', 5, 100, 30, 105], ['T30', 6, 115, 32, 110]]);
const SCREWDRIVER: PartFamily<{ d: number; Ls: number; D: number; Lh: number }> = {
  id: 'piece.screwdriver', name: 'Screwdriver', gloss: 'A screwdriver by its tip (Phillips, slotted, Torx): its shank and its handle (typical)', domains: TOOLS, aisle: 'Tools / Screwdrivers',
  says: 'A screwdriver by its tip (PH0 to PH3, slotted 4 to 8 mm, T20 to T30; its shank and handle sizes typical, recalled): a steel shank standing along y with its polypropylene handle on top (Stack); its tip not ground. It offers `<size> screwdriver shank/axis`',
  rows: SCREWDRIVERS, size: 'PH2', source: TYP,
  recipe: (q, size) => stack(`${size} screwdriver`, 1, [{ b: cyl(`${size} screwdriver shank`, 'steel-alloy', q.d, q.Ls, CHROME) }, { b: cyl(`${size} screwdriver handle`, 'pp', q.D, q.Lh, RED) }]),
  expect: (q) => bound(q.D, q.Ls + q.Lh, q.D, 'its handle\'s diameter by its whole length'),
  tests: [T(2, { offers: ['PH2 screwdriver handle/axis', 'PH2 screwdriver shank/axis'] })],
};
/** Pliers by kind and length: length, width across the handles (open as sold), thickness, typical. */
const PLIERS = rowsOf(['L', 'W', 't'] as const, [['combination 160', 160, 55, 22], ['combination 180', 180, 60, 24], ['combination 200', 200, 65, 26], ['long nose 150', 150, 50, 18], ['long nose 200', 200, 60, 20], ['side cutter 140', 140, 50, 18], ['side cutter 160', 160, 55, 20], ['water pump 250', 250, 70, 30], ['locking 250', 250, 60, 32]]);
const PLIERS_F: PartFamily<{ L: number; W: number; t: number }> = {
  id: 'piece.pliers', name: 'Pliers', gloss: 'Pliers (combination, long nose, side cutter, water pump, locking) by their length, as their envelope (typical)', domains: TOOLS, aisle: 'Tools / Pliers',
  says: 'Pliers by their kind and length (140 to 250 mm, typical, recalled): their envelope, a box lying along x, as wide (z) as their open handles and as thick (y) as their joint; the two halves not drawn',
  rows: PLIERS, size: 'combination 180', source: TYP, envelope: 'a box of their length, open width and thickness',
  recipe: (q, size) => box(`${size} pliers`, 'steel-alloy', q.L, q.t, q.W, DARK),
  expect: (q) => bound(q.L, q.t, q.W, 'their length, thickness and width'),
  tests: [T(1)],
};
/** Drills by class: length (chuck to back), height (handle and battery), width, typical. */
const DRILLS = rowsOf(['L', 'H', 'W'] as const, [['10.8 V', 170, 180, 60], ['12 V', 180, 190, 65], ['18 V compact', 180, 200, 70], ['18 V', 210, 230, 80], ['18 V combi', 220, 240, 80], ['corded 13 mm', 260, 220, 75], ['SDS 2 kg', 350, 220, 85]]);
const DRILL: PartFamily<{ L: number; H: number; W: number }> = {
  id: 'piece.drill', name: 'Drill body', gloss: 'A drill (driver, combi, corded, SDS) by its class, as its envelope (typical)', domains: TOOLS, aisle: 'Tools / Power tools',
  says: 'A drill by its class (10.8 V to 18 V, corded, SDS; typical, recalled): its envelope, a box as long as it is from chuck to back (x), as high as its handle and battery (y), as wide as its motor housing (z); its chuck, trigger and battery not drawn apart',
  rows: DRILLS, size: '18 V', source: TYP, envelope: 'a box of its length, height and width',
  recipe: (q, size) => box(`${size} drill`, 'abs', q.L, q.H, q.W, BLUE),
  expect: (q) => bound(q.L, q.H, q.W, 'its length, height and width'),
  tests: [T(1)],
};
/** HSS jobber drill bits (DIN 338 overall lengths, recalled) by diameter. */
const DRILL_BITS: Record<string, { d: number; L: number }> = Object.fromEntries(([[1, 34], [1.5, 40], [2, 49], [2.5, 57], [3, 61], [3.5, 70], [4, 75], [5, 86], [6, 93], [6.5, 101], [8, 117], [10, 133], [12, 151], [13, 151]] as const).map(([d, L]) => [String(d), { d, L }]));
const DRILLBIT: PartFamily<{ d: number; L: number }> = {
  id: 'piece.drillbit', name: 'Drill bit (HSS jobber)', gloss: 'An HSS jobber drill bit by its diameter, 1 to 13 mm, at DIN 338\'s overall length (recalled)', domains: TOOLS, aisle: 'Tools / Drill bits',
  says: 'An HSS jobber-length drill bit by its diameter (1 to 13 mm; its overall length DIN 338\'s, recalled): a round rod standing along y, its flutes and point not cut, offered as `<size> drill bit/axis`: it goes into a chuck (Over a shaft) or down a hole',
  rows: DRILL_BITS, size: '6', source: 'DIN 338 overall lengths (recalled); the bit a plain rod',
  recipe: (q, size) => cyl(`${size} drill bit`, 'steel-tool', q.d, q.L, CHROME),
  expect: (q) => cylE(q.d, q.L, 'steel-tool', 'its diameter and length; nominal mass as a plain rod'),
  tests: [T(1, { offers: ['6 drill bit/axis'] })],
};
/** Circular saw blades by diameter: bore and plate thickness, typical. */
const SAW_BLADES = rowsOf(['D', 'bore', 't'] as const, [['115', 115, 22.23, 1.2], ['136', 136, 20, 1.2], ['165', 165, 20, 1.5], ['184', 184, 16, 1.6], ['190', 190, 30, 1.6], ['210', 210, 30, 1.8], ['216', 216, 30, 1.8], ['235', 235, 30, 1.8], ['250', 250, 30, 2.0], ['254', 254, 30, 2.0], ['300', 300, 30, 2.2], ['305', 305, 30, 2.2]]);
const SAWBLADE: PartFamily<{ D: number; bore: number; t: number }> = {
  id: 'piece.sawblade', name: 'Circular saw blade', gloss: 'A circular saw blade by its diameter, 115 to 305 mm, with its bore (typical)', domains: TOOLS, aisle: 'Tools / Saw blades',
  says: 'A circular saw blade by its diameter (115 to 305 mm; its bore and plate thickness typical, recalled): a steel disc lying flat with its bore, its teeth not cut, offered as `<size> saw blade/axis`: it slides over an arbor (Over a shaft)',
  rows: SAW_BLADES, size: '190', source: TYP, envelope: 'a plain disc with its bore; the teeth not cut',
  recipe: (q, size) => made(`${size} saw blade`, 'steel-tool', { tube: [mm(q.bore) / 2, mm(q.D) / 2, mm(q.t)] }, { color: CHROME }),
  expect: (q) => ({ bound: [mm(q.D), mm(q.t), mm(q.D)], mass: (disc(mm(q.D)) - disc(mm(q.bore))) * mm(q.t) * rho('steel-tool'), tol: 0.01, massTol: 0.02, says: 'its diameter and thickness; nominal mass, the disc less its bore' }),
  tests: [T(1, { offers: ['190 saw blade/axis'] })],
};
/** Bevel-edge wood chisels by width: blade length and thickness, handle diameter and length, typical. */
const CHISELS = rowsOf(['w', 'Lb', 't', 'D', 'Lh'] as const, [['6', 6, 110, 5, 28, 110], ['10', 10, 115, 5.5, 30, 115], ['13', 13, 120, 6, 32, 120], ['16', 16, 125, 6, 32, 120], ['19', 19, 130, 6.5, 34, 125], ['25', 25, 135, 7, 36, 130], ['32', 32, 140, 7.5, 38, 135], ['38', 38, 145, 8, 40, 140]]);
const CHISEL: PartFamily<{ w: number; Lb: number; t: number; D: number; Lh: number }> = {
  id: 'piece.chisel', name: 'Wood chisel', gloss: 'A bevel-edge wood chisel by its width, 6 to 38 mm: its blade and its handle (typical)', domains: TOOLS, aisle: 'Tools / Chisels',
  says: 'A bevel-edge wood chisel by its width (6 to 38 mm; its blade and handle typical, recalled): a flat steel blade standing along y (its bevel not ground) with its ash handle on top (Stack); the handle offers `<size> chisel handle/axis`. The handle drawn at oak\'s density',
  rows: CHISELS, size: '19', source: TYP,
  recipe: (q, size) => stack(`${size} mm chisel`, 1, [{ b: box(`${size} chisel blade`, 'steel-tool', q.w, q.Lb, q.t, CHROME) }, { b: cyl(`${size} chisel handle`, 'oak', q.D, q.Lh, WOOD) }]),
  expect: (q) => bound(q.D, q.Lb + q.Lh, q.D, 'its handle\'s diameter by its whole length'),
  tests: [T(2, { offers: ['19 chisel handle/axis'] })],
};
/** Bench vices by jaw width: length, height, width, typical. */
const VICES = rowsOf(['L', 'H', 'W'] as const, [['75', 230, 120, 100], ['100', 300, 150, 120], ['125', 360, 170, 140], ['150', 420, 200, 160], ['200', 520, 240, 200]]);
const VICE: PartFamily<{ L: number; H: number; W: number }> = {
  id: 'piece.vice', name: 'Bench vice', gloss: 'A bench vice by its jaw width, 75 to 200 mm, as its envelope (typical)', domains: TOOLS, aisle: 'Tools / Vices and clamps',
  says: 'A bench vice by its jaw width (75 to 200 mm; its length, height and width typical, recalled): its envelope, a cast-iron box; its slide, screw and jaws not drawn apart',
  rows: VICES, size: '100', source: TYP, envelope: 'a box of its length, height and width',
  recipe: (q, size) => box(`${size} mm vice`, 'cast-iron', q.L, q.H, q.W, DARK),
  expect: (q) => bound(q.L, q.H, q.W, 'its length, height and width'),
  tests: [T(1)],
};
/** G clamps by opening: throat depth, frame bar section, typical. */
const GCLAMPS = rowsOf(['open', 'throat', 'bar', 'wide'] as const, [['50', 50, 38, 10, 12], ['75', 75, 50, 12, 14], ['100', 100, 60, 14, 16], ['150', 150, 75, 16, 18], ['200', 200, 90, 18, 20], ['250', 250, 100, 20, 22], ['300', 300, 110, 22, 24]]);
const GCLAMP: PartFamily<{ open: number; throat: number; bar: number; wide: number }> = {
  id: 'piece.gclamp', name: 'G clamp', gloss: 'A G clamp by its opening, 50 to 300 mm: its frame; the screw not drawn (typical)', domains: TOOLS, aisle: 'Tools / Vices and clamps',
  says: 'A G clamp by its opening (50 to 300 mm; its throat and bar typical, recalled): its cast frame, a C drawn as a section along z, its opening between the arms up y; its screw, swivel pad and tommy bar not drawn',
  rows: GCLAMPS, size: '100', source: TYP, envelope: 'the frame alone, its corners square',
  recipe: (q, size) => { const W = q.throat + q.bar, H = q.open + 2 * q.bar, t = q.bar; return made(`${size} G clamp`, 'cast-iron', { section: { pts: [[0, 0], [W, 0], [W, t], [t, t], [t, H - t], [W, H - t], [W, H], [0, H]].map(([x, y]) => [mm(x! - W / 2), mm(y! - H / 2)] as Pt), L: mm(q.wide) } }, { color: DARK }); },
  expect: (q) => bound(q.throat + q.bar, q.open + 2 * q.bar, q.wide, 'its reach, its height and its width'),
  tests: [T(1)],
};
/** Workbench tops by length: 600 deep, 40 thick solid beech (typical). */
const BENCHTOPS: Record<string, { L: number }> = Object.fromEntries([1000, 1200, 1500, 1800, 2000, 2400].map((L) => [String(L), { L }]));
const BENCHTOP: PartFamily<{ L: number }> = {
  id: 'piece.benchtop', name: 'Workbench top', gloss: 'A solid beech workbench top by its length, 1000 to 2400 mm, 600 deep and 40 thick (typical)', domains: TOOLS, aisle: 'Tools / Workbench',
  says: 'A workbench top by its length (1000 to 2400 mm; 600 mm deep and 40 thick, typical): a solid beech slab lying flat (its length along x), drawn at oak\'s density; a vice bolts to it, legs stand under it (Stack)',
  rows: BENCHTOPS, size: '1500', source: TYP,
  settings: [{ key: 'depth', label: 'Depth, mm', type: 'number', default: 600 }, { key: 'thickness', label: 'Thickness, mm', type: 'number', default: 40 }],
  cannot: (_q, _s, set) => noLength(set, 'depth') ?? noLength(set, 'thickness'),
  recipe: (q, size, set) => box(`${size} bench top`, 'oak', q.L, Number(set.thickness), Number(set.depth), WOOD),
  expect: (q, _s, set) => boxE(q.L, Number(set.thickness), Number(set.depth), 'oak', 'its length, thickness and depth; nominal mass at oak\'s density'),
  tests: [T(1)],
};
/** Sawhorses by their beam's length: height, the legs' spread, typical. */
const SAWHORSES = rowsOf(['L', 'H'] as const, [['600', 600, 600], ['800', 800, 700], ['900', 900, 750], ['1000', 1000, 800], ['1200', 1200, 850]]);
const SAWHORSE: PartFamily<{ L: number; H: number }> = {
  id: 'piece.sawhorse', name: 'Sawhorse', gloss: 'A sawhorse by its beam\'s length, 600 to 1200 mm: a beam on two leg panels (typical)', domains: TOOLS, aisle: 'Tools / Workbench',
  says: 'A sawhorse by its beam\'s length (600 to 1200 mm; its height and leg panels typical, recalled): two upright pine leg panels (45 thick, 400 wide) a ring of two apart, and the beam (90 × 45) laid across them (Stack); the real legs splay, these stand straight. Drawn at wood\'s density',
  rows: SAWHORSES, size: '900', source: TYP,
  recipe: (q, size) => { const n = `${size} sawhorse`, legs = ring(`${n} legs`, box(`${n} leg`, 'wood', 45, q.H - 90, 400, WOOD), 2, mm(q.L / 2 - 60), 'clear'); return stack(n, 1, [{ b: legs }, { b: box(`${n} beam`, 'wood', q.L, 90, 45, WOOD) }]); },
  expect: (q) => bound(q.L, q.H, 400, 'its length, height and the legs\' width'),
  tests: [T(3)],
};
/** Ladder stiles (rails): aluminium box section 25 × 65 × 1.5, cut to a length (typical of extension ladders). */
const LADDER_RAILS: Record<string, { B: number; H: number; t: number }> = { '25x65x1.5': { B: 25, H: 65, t: 1.5 }, '30x75x1.8': { B: 30, H: 75, t: 1.8 }, '32x85x2': { B: 32, H: 85, t: 2 } };
const LADDERRAIL: PartFamily<{ B: number; H: number; t: number }> = {
  id: 'piece.ladderrail', name: 'Ladder rail (stile)', gloss: 'An aluminium ladder stile by its section, cut to a length (typical)', domains: TOOLS, aisle: 'Tools / Ladders',
  says: 'A ladder stile by its box section (25 × 65 to 32 × 85 mm; typical, recalled), an aluminium hollow section cut to its length along z; its rung holes not cut. It offers `<size> ladder rail/axis` down its bore',
  rows: LADDER_RAILS, size: '25x65x1.5', source: TYP, settings: [lengthSet(2400)], cannot: (_q, _s, set) => noLength(set),
  recipe: (q, size, set) => made(`${size} ladder rail`, 'al-6063', { section: { pts: boxOutline(mm(q.B), mm(q.H), mm(q.t)), L: len(set) } }, { color: AL }),
  expect: (q, _s, set) => ({ bound: [mm(q.B), mm(q.H), len(set)], mass: (mm(q.B) * mm(q.H) - mm(q.B - 2 * q.t) * mm(q.H - 2 * q.t)) * len(set) * rho('al-6063'), tol: 0.01, massTol: 0.02, says: 'its section by its length; nominal mass, the hollow section' }),
  tests: [T(1, { offers: ['25x65x1.5 ladder rail/axis'] })],
};
/** Ladder rungs by width: round aluminium tube 28 × 1.5 (the real one D-shaped), typical. */
const LADDER_RUNGS: Record<string, { W: number }> = Object.fromEntries([250, 280, 300, 330, 350, 400].map((W) => [String(W), { W }]));
const LADDERRUNG: PartFamily<{ W: number }> = {
  id: 'piece.ladderrung', name: 'Ladder rung', gloss: 'An aluminium ladder rung by its width, 250 to 400 mm, a 28 mm tube lying across (typical)', domains: TOOLS, aisle: 'Tools / Ladders',
  says: 'A ladder rung by its width (250 to 400 mm, typical): a 28 × 1.5 aluminium tube (round here, really D-shaped) turned to lie along x, offering its axis; its ends go through the stiles (Through a line)',
  rows: LADDER_RUNGS, size: '300', source: TYP, envelope: 'a round tube (the real rung D-shaped and serrated)',
  recipe: (q, size) => turn(made(`${size} ladder rung`, 'al-6063', { tube: [mm(12.5), mm(14), mm(q.W)] }, { color: AL }), 2, 90),
  expect: (q) => bound(q.W, 28, 28, 'its width by the tube\'s outside'),
  tests: [T(1)],
};
/** Spirit levels by length: box section 50 to 60 high, 22 to 25 thick, typical. */
const LEVELS = rowsOf(['L', 'H', 't'] as const, [['225', 225, 50, 22], ['300', 300, 52, 22], ['400', 400, 55, 24], ['600', 600, 58, 25], ['800', 800, 60, 25], ['1000', 1000, 60, 25], ['1200', 1200, 62, 26], ['1800', 1800, 65, 28]]);
const SPIRITLEVEL: PartFamily<{ L: number; H: number; t: number }> = {
  id: 'piece.spiritlevel', name: 'Spirit level', gloss: 'A box-section spirit level by its length, 225 to 1800 mm, as its envelope (typical)', domains: TOOLS, aisle: 'Tools / Measuring',
  says: 'A spirit level by its length (225 to 1800 mm; its section typical, recalled): its envelope, an aluminium box lying along x; its vials and end caps not drawn',
  rows: LEVELS, size: '600', source: TYP, envelope: 'a solid box of its length and section (really a hollow extrusion with vials)',
  recipe: (q, size) => box(`${size} spirit level`, 'al-6063', q.L, q.H, q.t, 0xd8b43a),
  expect: (q) => bound(q.L, q.H, q.t, 'its length, height and thickness'),
  tests: [T(1)],
};

// ==== garden =========================================================================================================
/** Garden rake heads by their tines: width, the tines 70 long on a 12 pitch... (typical). */
const RAKES: Record<string, { n: number; pitch: number; tine: number }> = { '10 tines': { n: 10, pitch: 30, tine: 70 }, '12 tines': { n: 12, pitch: 30, tine: 70 }, '14 tines': { n: 14, pitch: 30, tine: 75 }, '16 tines': { n: 16, pitch: 30, tine: 75 }, '18 tines': { n: 18, pitch: 28, tine: 75 } };
const RAKEHEAD: PartFamily<{ n: number; pitch: number; tine: number }> = {
  id: 'piece.rakehead', name: 'Garden rake head', gloss: 'A steel garden rake head by its tines, 10 to 18, each tine hung on the bar by a line it offers (typical)', domains: ['everyday', 'mechanical'], aisle: 'Garden / Rakes',
  says: 'A garden rake head by its tines (10 to 18 on a 30 mm pitch; typical, recalled): a steel bar lying along x with a tine (a 5 mm rod) hung under it at each of the lines the bar offers (`<size> rake head/tine 1` …, Onto a face); its socket for the handle not drawn',
  rows: RAKES, size: '14 tines', source: TYP,
  recipe: (q, size) => { const n = `${size} rake head`, pts: Pt[] = Array.from({ length: q.n }, (_, i) => [mm((i - (q.n - 1) / 2) * q.pitch), 0]);
    let b = box(n, 'steel-low', (q.n - 1) * q.pitch + 20, 12, 20, DARK, { patterns: pts.map((p, k) => ({ name: `tine ${k + 1}`, points: [p] })) });
    pts.forEach((_, k) => { b = onto(b, '-y', cyl(`${n} tine ${k + 1}`, 'steel-low', 5, q.tine, DARK), 'touch', `${n}/tine ${k + 1}`); }); return b; },
  expect: (q) => bound((q.n - 1) * q.pitch + 20, 12 + q.tine, 20, 'its width, the bar and tines\' height, its depth'),
  tests: [T(15)],
};
/** Spade and shovel blades: width, length, thickness; the socket's tube over the blade, typical. */
const BLADES = rowsOf(['W', 'L', 't', 'socket'] as const, [['border spade', 150, 230, 2, 120], ['digging spade', 190, 290, 2.5, 140], ['shovel', 230, 300, 2, 140], ['trenching', 120, 400, 2.5, 140], ['snow', 450, 380, 3, 150], ['coal', 300, 330, 1.5, 130]]);
const SHOVELBLADE: PartFamily<{ W: number; L: number; t: number; socket: number }> = {
  id: 'piece.shovelblade', name: 'Spade or shovel blade', gloss: 'A spade or shovel blade by its kind, with its socket for the handle (typical)', domains: ['everyday', 'mechanical'], aisle: 'Garden / Spades and shovels',
  says: 'A spade or shovel blade by its kind (border, digging, shovel, trenching, snow, coal; typical, recalled): a flat steel blade standing along y (its dish not drawn) with the socket, a 38 mm tube, on top of it (Stack); the handle (piece.shovelhandle) stands on the socket. The socket offers `<size> blade socket/axis`',
  rows: BLADES, size: 'digging spade', source: TYP,
  recipe: (q, size) => stack(`${size} blade`, 1, [{ b: box(`${size} blade plate`, 'steel-low', q.W, q.L, q.t, DARK) }, { b: made(`${size} blade socket`, 'steel-low', { tube: [mm(16), mm(19), mm(q.socket)] }, { color: DARK }) }]),
  expect: (q) => bound(q.W, q.L + q.socket, 38, 'its width, its blade and socket\'s height, the socket\'s outside'),
  tests: [T(2, { offers: ['digging spade blade socket/axis'] })],
};
/** Shovel handles by length: ash, 32 round; typical. */
const SHOVEL_HANDLES: Record<string, { L: number; D: number }> = Object.fromEntries([700, 900, 1200, 1400, 1500].map((L) => [String(L), { L, D: 32 }]));
const SHOVELHANDLE: PartFamily<{ L: number; D: number }> = {
  id: 'piece.shovelhandle', name: 'Shovel handle', gloss: 'An ash shovel handle by its length, 700 to 1500 mm, 32 mm round (typical)', domains: ['everyday', 'mechanical'], aisle: 'Garden / Spades and shovels',
  says: 'A spade or shovel handle by its length (700 to 1500 mm, typical): a 32 mm ash rod standing along y (its D or T grip not drawn), drawn at oak\'s density; it goes into a blade\'s socket. It offers `<size> shovel handle/axis`',
  rows: SHOVEL_HANDLES, size: '1200', source: TYP,
  recipe: (q, size) => cyl(`${size} shovel handle`, 'oak', q.D, q.L, WOOD),
  expect: (q) => cylE(q.D, q.L, 'oak', 'its diameter and length; nominal mass as a rod at oak\'s density'),
  tests: [T(1, { offers: ['1200 shovel handle/axis'] })],
};
/** Hose reels by the hose they hold: width, height, depth of the cart or wall reel, typical. */
const HOSE_REELS = rowsOf(['W', 'H', 'D'] as const, [['20 m wall', 420, 380, 260], ['30 m wall', 440, 400, 280], ['40 m cart', 500, 950, 500], ['50 m cart', 520, 1000, 520], ['60 m cart', 560, 1050, 560]]);
const HOSEREEL: PartFamily<{ W: number; H: number; D: number }> = {
  id: 'piece.hosereel', name: 'Hose reel', gloss: 'A garden hose reel by the hose it holds, 20 to 60 m, as its envelope (typical)', domains: ['everyday'], aisle: 'Garden / Watering',
  says: 'A garden hose reel by its hose (20 to 60 m, wall or cart; typical, recalled): its envelope, a box of its width, height and depth; the drum, frame and hose not drawn apart',
  rows: HOSE_REELS, size: '30 m wall', source: TYP, envelope: 'a box of its width, height and depth',
  recipe: (q, size) => box(`${size} hose reel`, 'pp', q.W, q.H, q.D, GREEN),
  expect: (q) => bound(q.W, q.H, q.D, 'its width, height and depth'),
  tests: [T(1)],
};
/** Pop-up sprinkler heads by their pop-up height: body diameter and height, nozzle riser, typical. */
const SPRINKLERS = rowsOf(['D', 'H', 'riser', 'd'] as const, [['2 in', 32, 95, 50, 16], ['4 in', 36, 150, 100, 16], ['6 in', 40, 210, 150, 20], ['12 in', 45, 370, 300, 22]]);
const SPRINKLER: PartFamily<{ D: number; H: number; riser: number; d: number }> = {
  id: 'piece.sprinklerhead', name: 'Pop-up sprinkler head', gloss: 'A pop-up spray sprinkler by its rise, 2 to 12 in: its body and its riser up (typical)', domains: ['everyday'], aisle: 'Garden / Watering',
  says: 'A pop-up sprinkler head by its rise (2 to 12 in; typical, recalled): its body, a plastic cylinder standing along y with its riser standing up out of it (Stack; shown risen); the 1/2 in inlet thread below not drawn. The body offers `<size> sprinkler body/axis`',
  rows: SPRINKLERS, size: '4 in', source: TYP,
  recipe: (q, size) => stack(`${size} sprinkler`, 1, [{ b: cyl(`${size} sprinkler body`, 'abs', q.D, q.H, DARK) }, { b: cyl(`${size} sprinkler riser`, 'abs', q.d, q.riser, DARK) }]),
  expect: (q) => bound(q.D, q.H + q.riser, q.D, 'its body\'s diameter by its height risen'),
  tests: [T(2)],
};
/** Bib taps by thread: the body's tube and the bend to its spout, typical. */
const BIBTAPS = rowsOf(['ro', 'ri', 'inlet', 'spout', 'R'] as const, [['1/2 in', 11, 7, 50, 40, 15], ['3/4 in', 13, 9, 55, 45, 18], ['1 in', 16, 11, 65, 50, 22]]);
const BIBTAP: PartFamily<{ ro: number; ri: number; inlet: number; spout: number; R: number }> = {
  id: 'piece.bibtap', name: 'Bib tap', gloss: 'A brass bib tap by its thread, 1/2 to 1 in: its inlet, its bend and its spout as a run of tube (typical)', domains: ['everyday', 'fluid'], aisle: 'Garden / Watering',
  says: 'A bib tap by its thread (1/2, 3/4, 1 in; typical, recalled): a run of brass tube, its inlet along y, a quarter bend and its spout out; its head, handle and the thread not drawn. Each straight offers its axis',
  rows: BIBTAPS, size: '1/2 in', source: TYP, envelope: 'a bent tube; the head and handle not drawn',
  recipe: (q, size) => run(`${size} bib tap`, [{ name: `${size} tap inlet`, mat: 'brass', ro: mm(q.ro), ri: mm(q.ri), color: BRASS, straight: mm(q.inlet) }, { name: `${size} tap bend`, mat: 'brass', ro: mm(q.ro), ri: mm(q.ri), color: BRASS, bend: 90, R: mm(q.R) }, { name: `${size} tap spout`, mat: 'brass', ro: mm(q.ro), ri: mm(q.ri), color: BRASS, straight: mm(q.spout) }]),
  tests: [T(3)],
};
/** Watering cans by litres: diameter and height of the body, typical. */
const CANS = rowsOf(['D', 'H', 'wall'] as const, [['1 L', 110, 140, 1.5], ['2 L', 140, 170, 1.5], ['5 L', 190, 230, 2], ['7 L', 210, 260, 2], ['10 L', 240, 290, 2.5], ['13 L', 260, 320, 2.5]]);
const WATERINGCAN: PartFamily<{ D: number; H: number; wall: number }> = {
  id: 'piece.wateringcan', name: 'Watering can', gloss: 'A plastic watering can by its litres, 1 to 13 L: its body as a cup (typical)', domains: ['everyday'], aisle: 'Garden / Watering',
  says: 'A watering can by its litres (1 to 13 L; its body typical, recalled): a polypropylene cup open at the top, offering `<size> watering can/cavity`; its spout, rose and handle not drawn',
  rows: CANS, size: '5 L', source: TYP, envelope: 'the body as a plain cup; spout, rose and handle not drawn',
  recipe: (q, size) => made(`${size} watering can`, 'pp', { cup: [mm(q.D) / 2, mm(q.H), mm(q.wall), mm(q.wall)] }, { color: GREEN }),
  expect: (q) => bound(q.D, q.H, q.D, 'its diameter and height'),
  tests: [T(1)],
};
/** Plant pots by diameter (cm, as sold): height and wall, typical of plastic pots. */
const POTS = rowsOf(['D', 'H', 'wall'] as const, [['9 cm', 90, 85, 1], ['10.5 cm', 105, 95, 1], ['12 cm', 120, 100, 1.2], ['13 cm', 130, 110, 1.2], ['15 cm', 150, 125, 1.5], ['17 cm', 170, 140, 1.5], ['19 cm', 190, 160, 1.8], ['21 cm', 210, 180, 2], ['24 cm', 240, 200, 2], ['30 cm', 300, 250, 2.5], ['40 cm', 400, 320, 3]]);
const PLANTPOT: PartFamily<{ D: number; H: number; wall: number }> = {
  id: 'piece.plantpot', name: 'Plant pot', gloss: 'A plant pot by its diameter, 9 to 40 cm, as a cup (typical)', domains: ['everyday'], aisle: 'Garden / Pots',
  says: 'A plant pot by its rim diameter (9 to 40 cm; its height and wall typical, recalled): a polypropylene (or terracotta, drawn at brick\'s density) cup open at the top, straight-sided here (the real pot tapers), offering `<size> plant pot/cavity` for soil or a smaller pot (Into a room); its drain holes not cut',
  rows: POTS, size: '13 cm', source: TYP, settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'plastic', choices: ['plastic', 'terracotta'] }],
  recipe: (q, size, set) => made(`${size} plant pot`, set.matter === 'terracotta' ? 'brick' : 'pp', { cup: [mm(q.D) / 2, mm(q.H), mm(set.matter === 'terracotta' ? 3 * q.wall : q.wall), mm(set.matter === 'terracotta' ? 3 * q.wall : q.wall)] }, { color: set.matter === 'terracotta' ? TERRA : DARK }),
  expect: (q) => bound(q.D, q.H, q.D, 'its diameter and height'),
  tests: [T(1), T(1, {}, { matter: 'terracotta' })],
};
/** Fence post caps by the post: a flat slab with a pointed top (round here, really a pyramid), typical. */
const POST_CAPS: Record<string, { P: number }> = Object.fromEntries([75, 90, 100, 125, 150].map((P) => [`${P} mm post`, { P }]));
const POSTCAP: PartFamily<{ P: number }> = {
  id: 'piece.fencepostcap', name: 'Fence post cap', gloss: 'A fence post cap by its post, 75 to 150 mm square: a slab and its point (typical)', domains: HOME, aisle: 'Garden / Fencing',
  says: 'A fence post cap by its post (75 to 150 mm square; typical): a treated pine slab 10 mm wider than the post, 20 thick, with a cone on top (the real cap a pyramid) (Stack); it stands on a post\'s top (Stack). Drawn at wood\'s density',
  rows: POST_CAPS, size: '100 mm post', source: TYP, envelope: 'its point a cone, really a pyramid',
  recipe: (q, size) => stack(`${size} cap`, 1, [{ b: box(`${size} cap slab`, 'wood', q.P + 10, 20, q.P + 10, WOOD) }, { b: made(`${size} cap point`, 'wood', { cone: [mm(q.P + 10) / 2, mm(1), mm(q.P / 3)] }, { color: WOOD }) }]),
  expect: (q) => bound(q.P + 10, 20 + q.P / 3, q.P + 10, 'its width by its height'),
  tests: [T(2)],
};
/** Gate latches by their bar's length: the bar and its strike plate, typical. */
const LATCHES = rowsOf(['L', 'W', 't', 'plate'] as const, [['150', 150, 25, 3, 60], ['200', 200, 30, 3, 70], ['250', 250, 32, 4, 80], ['300', 300, 35, 4, 90]]);
const GATELATCH: PartFamily<{ L: number; W: number; t: number; plate: number }> = {
  id: 'piece.gatelatch', name: 'Gate latch', gloss: 'A gate thumb latch by its bar\'s length, 150 to 300 mm: its bar lying on its plate (typical)', domains: HOME, aisle: 'Garden / Fencing',
  says: 'A gate latch by its bar\'s length (150 to 300 mm; typical, recalled): a galvanised steel plate standing against the gate (thin along z) with the latch bar lying across its face (Onto a face); its pivot, thumb piece and keeper not drawn',
  rows: LATCHES, size: '200', source: TYP, envelope: 'a plate and a bar; pivot, thumb piece and keeper not drawn',
  recipe: (q, size) => onto(box(`${size} latch plate`, 'steel-low', q.plate, q.plate, 2.5, GALV), '+z', box(`${size} latch bar`, 'steel-low', q.L, q.W, q.t, GALV), 'touch'),
  expect: (q) => bound(q.L, q.plate, 2.5 + q.t, 'its bar\'s length, its plate\'s height, both thicknesses'),
  tests: [T(2)],
};
/** Trellis slats by section, cut to a length: treated pine, typical. */
const SLATS: Record<string, { w: number; t: number }> = { '25x6': { w: 25, t: 6 }, '32x8': { w: 32, t: 8 }, '38x10': { w: 38, t: 10 }, '45x12': { w: 45, t: 12 } };
const TRELLISSLAT: PartFamily<{ w: number; t: number }> = {
  id: 'piece.trellisslat', name: 'Trellis slat', gloss: 'A treated pine trellis slat by its section, 25x6 to 45x12, cut to a length (typical)', domains: HOME, aisle: 'Garden / Fencing',
  says: 'A trellis slat by its section (25 × 6 to 45 × 12 mm; typical), a treated pine lath cut to its length along x, lying flat; slats stack across each other (Onto a face). Drawn at wood\'s density',
  rows: SLATS, size: '25x6', source: TYP, settings: [lengthSet(1800)], cannot: (_q, _s, set) => noLength(set),
  recipe: (q, size, set) => box(`${size} trellis slat`, 'wood', Number(set.length), q.t, q.w, WOOD),
  expect: (q, _s, set) => boxE(Number(set.length), q.t, q.w, 'wood', 'its length, thickness and width; nominal mass at wood\'s density'),
  tests: [T(1)],
};
/** Lawnmower blades by length (in, as sold): width, thickness, the centre bore, typical. */
const MOWER_BLADES = rowsOf(['L', 'W', 't', 'bore'] as const, [['13 in', 330, 45, 3, 19], ['16 in', 406, 50, 3, 19], ['18 in', 457, 50, 3.5, 20], ['20 in', 508, 55, 3.5, 22], ['21 in', 533, 55, 4, 22], ['22 in', 559, 60, 4, 25]]);
const MOWERBLADE: PartFamily<{ L: number; W: number; t: number; bore: number }> = {
  id: 'piece.mowerblade', name: 'Lawnmower blade', gloss: 'A rotary mower blade by its length, 13 to 22 in, its centre bore through it (typical)', domains: ['everyday', 'mechanical'], aisle: 'Garden / Mowers',
  says: 'A rotary lawnmower blade by its length (13 to 22 in; its width, thickness and bore typical, recalled): a flat steel bar lying along x, its centre bore down through it offered as `<size> mower blade/bore`: its bolt goes through it onto the spindle (Through a line); its edges and lift wings not drawn',
  rows: MOWER_BLADES, size: '18 in', source: TYP, envelope: 'a flat bar with its bore; edges and wings not drawn',
  recipe: (q, size) => box(`${size} mower blade`, 'steel-alloy', q.L, q.t, q.W, DARK, { pattern: { name: 'bore', points: [[0, 0]], hole: mm(q.bore) / 2 } }),
  expect: (q) => ({ bound: [mm(q.L), mm(q.t), mm(q.W)], mass: (mm(q.L) * mm(q.W) - disc(mm(q.bore))) * mm(q.t) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its length, thickness and width; nominal mass, the bar less its bore' }),
  tests: [T(1, { offers: ['18 in mower blade/bore'] })],
};
/** Garden (wheelbarrow, mower, cart) wheels by diameter: width, bore, typical. */
const GARDEN_WHEELS = rowsOf(['D', 'W', 'bore'] as const, [['150', 150, 40, 12], ['175', 175, 45, 12], ['200', 200, 50, 12], ['250', 250, 60, 16], ['300', 300, 80, 20], ['350', 350, 80, 20], ['400', 400, 100, 20]]);
const wheelOf = (name: string, D: number, W: number, bore: number, hubMat: string, tyreMat: string, hubColor: number): Block => {
  const t = Math.max(8, 0.15 * D), Rr = D / 2 - t, rs = bore / 2 + 6, wt = 0.4 * W;
  const hub = made(`${name} hub`, hubMat, { lathe: { pts: [[0, -W / 2], [rs, -W / 2], [rs, -wt / 2], [Rr - 3, -wt / 2], [Rr - 3, -W / 2], [Rr, -W / 2], [Rr, W / 2], [Rr - 3, W / 2], [Rr - 3, wt / 2], [rs, wt / 2], [rs, W / 2], [0, W / 2]].map(([a, b]) => [mm(a!), mm(b!)] as Pt), bore: mm(bore) / 2 } }, { color: hubColor });
  return over(hub, `${name} hub/axis`, made(`${name} tyre`, tyreMat, { tube: [mm(Rr), mm(D) / 2, mm(W)] }, { color: DARK }), 'mid', 'touch');
};
const GARDENWHEEL: PartFamily<{ D: number; W: number; bore: number }> = {
  id: 'piece.gardenwheel', name: 'Garden wheel', gloss: 'A wheelbarrow, mower or cart wheel by its diameter, 150 to 400 mm: a steel hub and its rubber tyre (typical)', domains: ['everyday', 'mechanical', 'vehicles'], aisle: 'Garden / Wheels',
  says: 'A garden wheel by its diameter (150 to 400 mm; its width and bore typical, recalled): a turned steel hub (boss, web and rim) with its bore and its rubber tyre over the rim (Over a shaft). It offers `<size> garden wheel hub/axis`: an axle goes through it (Through a line); turned, it stands on its tyre',
  rows: GARDEN_WHEELS, size: '250', source: TYP,
  recipe: (q, size) => wheelOf(`${size} garden wheel`, q.D, q.W, q.bore, 'steel-low', 'rubber', GREY),
  expect: (q) => bound(q.D, q.W, q.D, 'its diameter by its width'),
  tests: [T(2, { offers: ['250 garden wheel hub/axis', '250 garden wheel tyre/axis'] })],
};

// ==== kitchen ========================================================================================================
/** Saucepans and stock pots by diameter (cm, as sold): height, wall and base, stainless, typical. */
const COOKPOTS = rowsOf(['D', 'H', 'wall', 'base'] as const, [['14 cm', 140, 75, 0.8, 4], ['16 cm', 160, 90, 0.8, 4], ['18 cm', 180, 100, 0.8, 4.5], ['20 cm', 200, 110, 1, 5], ['24 cm', 240, 140, 1, 5], ['28 cm', 280, 180, 1, 5], ['32 cm', 320, 220, 1.2, 5]]);
const COOKPOT: PartFamily<{ D: number; H: number; wall: number; base: number }> = {
  id: 'piece.cookpot', name: 'Saucepan or stock pot', gloss: 'A stainless saucepan or stock pot by its diameter, 14 to 32 cm, as a cup (typical)', domains: ['everyday'], aisle: 'Kitchen / Cookware',
  says: 'A saucepan or stock pot by its diameter (14 to 32 cm; its height, wall and base typical, recalled): a stainless cup open at the top, offering `<size> pot/cavity` (Into a room); its handles and lid not drawn',
  rows: COOKPOTS, size: '20 cm', source: TYP, envelope: 'the body as a plain cup; handles and lid not drawn',
  recipe: (q, size) => made(`${size} pot`, 'stainless-304', { cup: [mm(q.D) / 2, mm(q.H), mm(q.wall), mm(q.base)] }, { color: CHROME }),
  expect: (q) => bound(q.D, q.H, q.D, 'its diameter and height'),
  tests: [T(1)],
};
/** Frying pans by diameter: height, wall and base (aluminium), handle length, typical. */
const PANS = rowsOf(['D', 'H', 'wall', 'base', 'handle'] as const, [['20 cm', 200, 42, 2.5, 4, 170], ['24 cm', 240, 45, 2.5, 4.5, 190], ['26 cm', 260, 48, 3, 4.5, 200], ['28 cm', 280, 50, 3, 5, 210], ['30 cm', 300, 52, 3, 5, 220], ['32 cm', 320, 55, 3.5, 5, 230]]);
const FRYINGPAN: PartFamily<{ D: number; H: number; wall: number; base: number; handle: number }> = {
  id: 'piece.fryingpan', name: 'Frying pan', gloss: 'An aluminium frying pan by its diameter, 20 to 32 cm: its pan and its handle (typical)', domains: ['everyday'], aisle: 'Kitchen / Cookware',
  says: 'A frying pan by its diameter (20 to 32 cm; typical, recalled): an aluminium cup open at the top (its flare not drawn), offering `<size> frying pan/cavity`, with its bakelite handle out of its side (Onto a face)',
  rows: PANS, size: '28 cm', source: TYP, envelope: 'a straight-sided cup; the real pan flares',
  recipe: (q, size) => onto(made(`${size} frying pan`, 'al-3003', { cup: [mm(q.D) / 2, mm(q.H), mm(q.wall), mm(q.base)] }, { color: DARK }), '+x', box(`${size} frying pan handle`, 'phenolic', q.handle, 18, 32, DARK), 'touch'),
  expect: (q) => bound(q.D + q.handle, q.H, q.D, 'its diameter and handle, its height'),
  tests: [T(2)],
};
/** Kettles by litres: diameter and height, typical. */
const KETTLES = rowsOf(['D', 'H'] as const, [['1.0 L', 150, 200], ['1.5 L', 160, 230], ['1.7 L', 170, 250], ['2.0 L', 180, 260], ['stove-top 2.5 L', 220, 230], ['stove-top 3.0 L', 240, 240]]);
const KETTLE: PartFamily<{ D: number; H: number }> = {
  id: 'piece.kettle', name: 'Kettle', gloss: 'A kettle by its litres, 1 to 3 L, as its envelope (typical)', domains: ['everyday', 'electrical'], aisle: 'Kitchen / Appliances',
  says: 'A kettle by its litres (1 to 3 L, electric or stove-top; typical, recalled): its envelope, a stainless cylinder standing along y; its spout, handle, lid and base not drawn',
  rows: KETTLES, size: '1.7 L', source: TYP, envelope: 'a cylinder of its diameter and height',
  recipe: (q, size) => cyl(`${size} kettle`, 'stainless-304', q.D, q.H, CHROME),
  expect: (q) => bound(q.D, q.H, q.D, 'its diameter and height'),
  tests: [T(1)],
};
/** Kitchen mixer taps by spout height: body diameter and height, spout reach, typical. */
const MIXERS = rowsOf(['D', 'H', 'reach', 'd'] as const, [['low 150', 45, 150, 180, 22], ['medium 200', 48, 200, 200, 22], ['high 250', 50, 250, 210, 24], ['high 300', 50, 300, 220, 24], ['tall 350', 52, 350, 230, 25]]);
const MIXERTAP: PartFamily<{ D: number; H: number; reach: number; d: number }> = {
  id: 'piece.mixertap', name: 'Mixer tap', gloss: 'A kitchen mixer tap by its spout height, 150 to 350 mm: its body and its spout across (typical)', domains: ['everyday', 'fluid'], aisle: 'Kitchen / Taps',
  says: 'A kitchen mixer tap by its spout height (150 to 350 mm; typical, recalled): a chromed brass body standing along y with its spout, a tube turned to lie along x, on top of it (Stack; the real spout curves); its lever and tails not drawn. The body offers `<size> mixer body/axis`',
  rows: MIXERS, size: 'medium 200', source: TYP, envelope: 'a straight spout laid across the body; the real one curves',
  recipe: (q, size) => stack(`${size} mixer tap`, 1, [{ b: cyl(`${size} mixer body`, 'brass', q.D, q.H, CHROME) }, { b: turn(cyl(`${size} mixer spout`, 'brass', q.d, q.reach, CHROME), 2, 90) }]),
  expect: (q) => bound(q.reach, q.H + q.d, q.D, 'its spout\'s reach, its height, its body\'s diameter'),
  tests: [T(2)],
};
/** Sink bowls by width: depth across, bowl depth, stainless 0.8 mm, typical. */
const SINKS = rowsOf(['W', 'D', 'H'] as const, [['340', 340, 400, 180], ['400', 400, 400, 190], ['450', 450, 400, 190], ['500', 500, 400, 200], ['550', 550, 450, 200], ['600', 600, 450, 200], ['700', 700, 450, 210]]);
const SINKBOWL: PartFamily<{ W: number; D: number; H: number }> = {
  id: 'piece.sinkbowl', name: 'Sink bowl', gloss: 'A stainless sink bowl by its width, 340 to 700 mm, as a case (typical)', domains: ['everyday'], aisle: 'Kitchen / Sinks',
  says: 'A sink bowl by its width (340 to 700 mm; its depth and bowl depth typical, recalled): a stainless case (0.8 mm walls and floor) open at the top, offering `<size> sink bowl/cavity`; its waste hole, drainer and flange not drawn',
  rows: SINKS, size: '500', source: TYP, envelope: 'a plain box bowl; waste, drainer and flange not drawn',
  recipe: (q, size) => made(`${size} sink bowl`, 'stainless-304', { case: [mm(q.W), mm(q.H), mm(q.D), mm(0.8), mm(0.8)] }, { color: CHROME }),
  expect: (q) => bound(q.W, q.H, q.D, 'its width, depth and bowl depth'),
  tests: [T(1, { offers: ['500 sink bowl/cavity'] })],
};
/** Hobs by width: depth and thickness of the glass or steel top, typical. */
const HOBS = rowsOf(['W', 'D', 't'] as const, [['30 cm', 290, 510, 45], ['60 cm', 590, 520, 50], ['70 cm', 700, 520, 50], ['80 cm', 800, 520, 50], ['90 cm', 900, 520, 55]]);
const HOB: PartFamily<{ W: number; D: number; t: number }> = {
  id: 'piece.hob', name: 'Hob', gloss: 'A ceramic or induction hob by its width, 30 to 90 cm, as its envelope (typical)', domains: ['everyday', 'electrical'], aisle: 'Kitchen / Appliances',
  says: 'A hob by its width (30 to 90 cm; typical, recalled): its envelope, a flat glass-topped box lying in a worktop\'s cut-out; its zones and controls not drawn',
  rows: HOBS, size: '60 cm', source: TYP, envelope: 'a flat box of its width, depth and thickness',
  recipe: (q, size) => box(`${size} hob`, 'glass', q.W, q.t, q.D, DARK),
  expect: (q) => bound(q.W, q.t, q.D, 'its width, thickness and depth'),
  tests: [T(1)],
};
/** Ovens by kind: width, height, depth, typical. */
const OVENS = rowsOf(['W', 'H', 'D'] as const, [['compact 45', 595, 455, 550], ['single 60', 595, 595, 550], ['double 72', 595, 720, 550], ['double 90', 595, 888, 550], ['range 90', 900, 900, 600], ['range 110', 1100, 900, 600]]);
const OVEN: PartFamily<{ W: number; H: number; D: number }> = {
  id: 'piece.oven', name: 'Oven', gloss: 'A built-in or range oven by its kind, as its envelope (typical)', domains: ['everyday', 'electrical'], aisle: 'Kitchen / Appliances',
  says: 'An oven by its kind (compact, single, double, range; typical, recalled): its envelope, a steel box of its width, height and depth; its door, cavity and controls not drawn',
  rows: OVENS, size: 'single 60', source: TYP, envelope: 'a box of its width, height and depth',
  recipe: (q, size) => box(`${size} oven`, 'steel-low', q.W, q.H, q.D, DARK),
  expect: (q) => bound(q.W, q.H, q.D, 'its width, height and depth'),
  tests: [T(1)],
};
/** Cutting boards by size: thickness, typical. */
const BOARDS = rowsOf(['L', 'W', 't'] as const, [['250x150', 250, 150, 12], ['300x200', 300, 200, 15], ['350x250', 350, 250, 18], ['400x300', 400, 300, 20], ['450x300', 450, 300, 25], ['500x350', 500, 350, 30], ['600x400', 600, 400, 40]]);
const CUTTINGBOARD: PartFamily<{ L: number; W: number; t: number }> = {
  id: 'piece.cuttingboard', name: 'Cutting board', gloss: 'A beech or plastic cutting board by its size, 250x150 to 600x400 mm (typical)', domains: ['everyday'], aisle: 'Kitchen / Prep',
  says: 'A cutting board by its size (250 × 150 to 600 × 400 mm; its thickness typical): a flat slab lying along x, of beech (drawn at oak\'s density) or polyethylene',
  rows: BOARDS, size: '400x300', source: TYP, settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'beech', choices: ['beech', 'plastic'] }],
  recipe: (q, size, set) => box(`${size} cutting board`, set.matter === 'plastic' ? 'pe' : 'oak', q.L, q.t, q.W, set.matter === 'plastic' ? WHITE : WOOD),
  expect: (q, _s, set) => boxE(q.L, q.t, q.W, set.matter === 'plastic' ? 'pe' : 'oak', 'its length, thickness and width; nominal mass at its density'),
  tests: [T(1), T(1, {}, { matter: 'plastic' })],
};
/** Kitchen knives by kind: blade length, width, thickness; handle length, height, thickness, typical. */
const KNIVES = rowsOf(['Lb', 'Wb', 't', 'Lh', 'Hh', 'th'] as const, [['paring 90', 90, 20, 1.5, 100, 20, 15], ['utility 130', 130, 25, 1.8, 110, 22, 16], ['santoku 180', 180, 48, 2, 120, 24, 18], ['chef 200', 200, 45, 2.2, 125, 25, 20], ['chef 250', 250, 50, 2.5, 130, 26, 20], ['bread 230', 230, 32, 2, 125, 25, 20], ['carving 200', 200, 28, 2, 125, 25, 18], ['cleaver 180', 180, 90, 3.5, 120, 28, 22]]);
const KNIFE: PartFamily<{ Lb: number; Wb: number; t: number; Lh: number; Hh: number; th: number }> = {
  id: 'piece.knife', name: 'Kitchen knife', gloss: 'A kitchen knife by its kind (paring to cleaver): its blade and its handle (typical)', domains: ['everyday'], aisle: 'Kitchen / Knives',
  says: 'A kitchen knife by its kind (paring, utility, santoku, chef, bread, carving, cleaver; typical, recalled): a flat stainless blade lying along x (its edge and point not ground) with its handle end to end with it (Stack along x); the handle of polyoxymethylene',
  rows: KNIVES, size: 'chef 200', source: TYP, envelope: 'a flat blade, its edge and point not ground',
  recipe: (q, size) => stack(`${size} knife`, 0, [{ b: box(`${size} knife handle`, 'pom', q.Lh, q.Hh, q.th, DARK) }, { b: box(`${size} knife blade`, 'stainless-304', q.Lb, q.Wb, q.t, CHROME) }]),
  expect: (q) => bound(q.Lb + q.Lh, Math.max(q.Wb, q.Hh), Math.max(q.t, q.th), 'its whole length, its widest and its thickest'),
  tests: [T(2)],
};
/** Cupboard doors by size: 18 mm MDF, two 35 mm hinge cups bored in the back, 100 mm from the ends, typical. */
const DOORS: Record<string, { W: number; H: number }> = Object.fromEntries(([[300, 715], [400, 715], [500, 715], [600, 715], [400, 900], [500, 900], [600, 900], [300, 1200], [400, 1200], [500, 1300], [600, 1300]] as const).map(([W, H]) => [`${W}x${H}`, { W, H }]));
const CUPBOARDDOOR: PartFamily<{ W: number; H: number }> = {
  id: 'piece.cupboarddoor', name: 'Cupboard door', gloss: 'An 18 mm cupboard door by its size, 300x715 to 600x1300, its two 35 mm hinge cups bored (typical)', domains: HOME, aisle: 'Kitchen / Cabinets',
  says: 'A cupboard door by its size (300 × 715 to 600 × 1300 mm; typical): an 18 mm MDF panel standing along y, its face toward +z, with two 35 mm hinge cups bored 12.5 deep in its back (−z), 22.5 mm in from its hinge edge and 100 from each end, offered as `<size> door/hinge cups`: concealed hinges (piece.cuphinge) go into them (Through a line)',
  rows: DOORS, size: '500x715', source: TYP,
  recipe: (q, size) => box(`${size} door`, 'mdf', q.W, q.H, 18, WHITE, { pattern: { name: 'hinge cups', face: '-z', points: [[mm(-q.W / 2 + 22.5), mm(q.H / 2 - 100)], [mm(-q.W / 2 + 22.5), mm(-q.H / 2 + 100)]], hole: mm(35) / 2, depth: mm(12.5) } }),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(18)], mass: (mm(q.W) * mm(q.H) * mm(18) - 2 * disc(mm(35)) * mm(12.5)) * rho('mdf'), tol: 0.01, massTol: 0.02, says: 'its width, height and thickness; nominal mass, the panel less its cups' }),
  tests: [T(1, { offers: ['500x715 door/hinge cups'] })],
};
/** T-bar handles by their centres (the 32 mm system): a 12 mm round bar on two 10 mm legs, 35 mm off the face, typical. */
const TBARS: Record<string, { c: number }> = Object.fromEntries([96, 128, 160, 192, 224, 256, 320, 480, 640].map((c) => [String(c), { c }]));
const TBARHANDLE: PartFamily<{ c: number }> = {
  id: 'piece.tbarhandle', name: 'T-bar handle', gloss: 'A round T-bar cabinet handle by its centres, 96 to 640 mm, on the 32 mm system (typical)', domains: HOME, aisle: 'Kitchen / Cabinets',
  says: 'A T-bar handle by its screw centres (96 to 640 mm on the 32 mm system; the bar 12 mm round, its legs 10 mm and 35 mm tall, typical): two stainless legs a ring of two apart with the bar laid across them (Stack); the legs\' M4 tapping not drawn. The bar offers `<size> T-bar handle bar/axis`',
  rows: TBARS, size: '160', source: TYP,
  recipe: (q, size) => barOnLegs(`${size} T-bar handle`, 'stainless-304', q.c, 12, q.c + 40, 10, 35, CHROME),
  expect: (q) => bound(q.c + 40, 47, 12, 'its bar\'s length, its height and the bar\'s diameter'),
  tests: [T(3)],
};

// ==== household ======================================================================================================
/** Lamp bulbs by their cap and shape: the glass's diameter and the bulb's whole length, the cap's diameter and length,
 *  typical (IEC 60061 cap sizes recalled). */
const BULBS = rowsOf(['D', 'L', 'cap', 'capL', 'round'] as const, [['E27 A60', 60, 110, 27, 26, 1], ['E27 A55', 55, 100, 27, 26, 1], ['E14 candle', 35, 100, 14, 22, 0], ['E27 G95 globe', 95, 135, 27, 26, 1], ['E27 R63', 63, 100, 27, 26, 0], ['GU10', 50, 55, 20, 20, 0], ['MR16 GU5.3', 50, 46, 20, 14, 0], ['E27 T45 pygmy', 45, 100, 27, 26, 0], ['B22 A60', 60, 110, 22, 26, 1]]);
const LAMPBULB: PartFamily<{ D: number; L: number; cap: number; capL: number; round: number }> = {
  id: 'piece.lampbulb', name: 'Lamp bulb', gloss: 'A lamp bulb by its cap and shape (E27 GLS, E14 candle, GU10, MR16 and more), as its envelope (typical)', domains: ['everyday', 'electrical'], aisle: 'Household / Lighting',
  says: 'A lamp bulb by its cap and shape (E27 and B22 GLS, E14 candle, globe, reflector, GU10, MR16; cap sizes after IEC 60061, recalled; the rest typical): its envelope, a brass cap standing along y with its glass on top (a sphere for a GLS or globe, a cylinder for the rest) (Stack); it goes into a lampholder (Into a room). The cap offers `<size> cap/axis`',
  rows: BULBS, size: 'E27 A60', source: 'IEC 60061 cap sizes (recalled); the glass typical', envelope: 'a cap and a sphere or cylinder of the glass\'s size; its mass not its own',
  recipe: (q, size) => stack(`${size} bulb`, 1, [{ b: cyl(`${size} cap`, 'brass', q.cap, q.capL, BRASS) }, { b: q.round ? made(`${size} glass`, 'glass', { sphere: [mm(q.D) / 2] }, { color: GLASS }) : cyl(`${size} glass`, 'glass', q.D, q.L - q.capL, GLASS) }]),
  expect: (q) => bound(q.D, q.round ? q.capL + q.D : q.L, q.D, 'its diameter by its length'),
  tests: [T(2), T(2, {}, { size: 'GU10' })],
};
/** Lamp shades by their bottom diameter: top diameter, height, thin PVC-backed fabric, typical. */
const SHADES = rowsOf(['Db', 'Dt', 'H'] as const, [['20 cm', 200, 160, 160], ['25 cm', 250, 200, 200], ['30 cm', 300, 240, 220], ['35 cm', 350, 280, 240], ['40 cm', 400, 320, 260], ['45 cm', 450, 360, 280]]);
const LAMPSHADE: PartFamily<{ Db: number; Dt: number; H: number }> = {
  id: 'piece.lampshade', name: 'Lamp shade', gloss: 'A tapered drum lamp shade by its diameter, 20 to 45 cm, a thin turned shell (typical)', domains: ['everyday'], aisle: 'Household / Lighting',
  says: 'A lamp shade by its bottom diameter (20 to 45 cm; its top and height typical, recalled): a thin tapered shell (1 mm fabric on PVC, drawn at PVC\'s density) turned about y, open both ends, offering `<size> lamp shade/axis`; its rings and gimbal not drawn',
  rows: SHADES, size: '30 cm', source: TYP, envelope: 'the shell alone; rings and gimbal not drawn',
  recipe: (q, size) => made(`${size} lamp shade`, 'pvc', { lathe: { pts: [[mm(q.Db / 2), 0], [mm(q.Dt / 2), mm(q.H)], [mm(q.Dt / 2 - 1), mm(q.H)], [mm(q.Db / 2 - 1), 0]] } }, { color: WHITE }),
  expect: (q) => bound(q.Db, q.H, q.Db, 'its bottom diameter by its height'),
  tests: [T(1, { offers: ['30 cm lamp shade/axis'] })],
};
/** Mirrors by size: 4 mm glass (its backing not drawn), typical. */
const MIRRORS: Record<string, { W: number; H: number }> = Object.fromEntries(([[300, 400], [400, 600], [500, 700], [600, 800], [600, 900], [700, 1000], [800, 1200], [450, 1500]] as const).map(([W, H]) => [`${W}x${H}`, { W, H }]));
const MIRROR: PartFamily<{ W: number; H: number }> = {
  id: 'piece.mirror', name: 'Mirror', gloss: 'A 4 mm mirror by its size, 300x400 to 800x1200 mm (typical)', domains: HOME, aisle: 'Household / Decor',
  says: 'A mirror by its size (300 × 400 to 800 × 1200 mm; typical): a 4 mm glass sheet standing along y, its face toward +z; its silvering and frame not drawn. It hangs on a wall (Onto a face)',
  rows: MIRRORS, size: '500x700', source: TYP,
  recipe: (q, size) => box(`${size} mirror`, 'glass', q.W, q.H, 4, GLASS),
  expect: (q) => boxE(q.W, q.H, 4, 'glass', 'its width, height and thickness; nominal mass at glass\'s density'),
  tests: [T(1)],
};
/** Picture frames by their picture: the moulding's width and depth, typical. */
const FRAMES = rowsOf(['W', 'H', 'b', 'd'] as const, [['10x15 cm', 100, 150, 15, 15], ['13x18 cm', 130, 180, 15, 15], ['A4', 210, 297, 20, 18], ['20x30 cm', 200, 300, 20, 18], ['30x40 cm', 300, 400, 25, 20], ['40x50 cm', 400, 500, 30, 22], ['50x70 cm', 500, 700, 35, 25], ['60x80 cm', 600, 800, 40, 28]]);
const PICTUREFRAME: PartFamily<{ W: number; H: number; b: number; d: number }> = {
  id: 'piece.pictureframe', name: 'Picture frame', gloss: 'A picture frame by its picture, 10x15 cm to 60x80 cm: its moulding as one bored outline (typical)', domains: HOME, aisle: 'Household / Decor',
  says: 'A picture frame by its picture\'s size (10 × 15 cm to 60 × 80; its moulding\'s width and depth typical, recalled): the four sides as one pine outline with its window (a section along z), standing along y, its face toward +z, the window 10 mm smaller than the picture each way; its glass, mount and back not drawn. Drawn at wood\'s density',
  rows: FRAMES, size: 'A4', source: TYP, envelope: 'the moulding alone; glass, mount and back not drawn',
  recipe: (q, size) => made(`${size} picture frame`, 'wood', { section: { pts: withHole(rect(mm(q.W + 2 * q.b), mm(q.H + 2 * q.b)), rect(mm(q.W - 10), mm(q.H - 10))), L: mm(q.d) } }, { color: WOOD }),
  expect: (q) => ({ bound: [mm(q.W + 2 * q.b), mm(q.H + 2 * q.b), mm(q.d)], mass: (mm(q.W + 2 * q.b) * mm(q.H + 2 * q.b) - mm(q.W - 10) * mm(q.H - 10)) * mm(q.d) * rho('wood'), tol: 0.01, massTol: 0.03, says: 'its outside by its depth; nominal mass, the outline less its window' }),
  tests: [T(1)],
};
/** Curtain rods (poles) by diameter: wall, cut to a length, typical. */
const RODS: Record<string, { D: number; t: number }> = Object.fromEntries(([[16, 1], [19, 1], [25, 1.2], [28, 1.2], [35, 1.5]] as const).map(([D, t]) => [String(D), { D, t }]));
const CURTAINROD: PartFamily<{ D: number; t: number }> = {
  id: 'piece.curtainrod', name: 'Curtain rod', gloss: 'A steel curtain pole by its diameter, 16 to 35 mm, cut to a length (typical)', domains: HOME, aisle: 'Household / Window',
  says: 'A curtain pole by its diameter (16 to 35 mm; its wall typical): a steel tube turned to lie along x, cut to its length, offering its axis: it goes through its brackets\' rings (Through a line) and rings slide over it (Over a shaft); its finials not drawn',
  rows: RODS, size: '25', source: TYP, settings: [lengthSet(1500)], cannot: (_q, _s, set) => noLength(set),
  recipe: (q, size, set) => turn(made(`${size} curtain rod`, 'steel-low', { tube: [mm(q.D / 2 - q.t), mm(q.D) / 2, len(set)] }, { color: DARK }), 2, 90),
  expect: (q, _s, set) => ({ bound: [len(set), mm(q.D), mm(q.D)], mass: Math.PI * mm(q.D - q.t) * mm(q.t) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its length by its outside; nominal mass π(D − t)t' }),
  tests: [T(1)],
};
/** Curtain rod brackets by the rod: the wall plate, the arm out and the ring the rod goes through, typical. */
const RBRACKETS: Record<string, { D: number; P: number }> = Object.fromEntries(([[16, 70], [19, 80], [25, 100], [28, 110], [35, 130]] as const).map(([D, P]) => [String(D), { D, P }]));
const CURTAINBRACKET: PartFamily<{ D: number; P: number }> = {
  id: 'piece.curtainbracket', name: 'Curtain rod bracket', gloss: 'A curtain pole bracket by the pole, 16 to 35 mm: its wall plate, arm and ring (typical)', domains: HOME, aisle: 'Household / Window',
  says: 'A curtain pole bracket by its pole (16 to 35 mm; its projection typical, recalled): a steel wall plate standing against the wall (thin along x), its arm out of it along x (Onto a face) and at the arm\'s end the ring, a short tube turned to lie along z, offered as `<size> bracket ring/axis`: the pole goes through it (Through a line, slide); the plate\'s screw holes not cut',
  rows: RBRACKETS, size: '25', source: TYP,
  recipe: (q, size) => { const n = `${size} bracket`, plate = box(`${n} plate`, 'steel-low', 3, 60, 40, DARK), armed = onto(plate, '+x', box(`${n} arm`, 'steel-low', q.P - q.D - 8, 20, 4, DARK), 'touch');
    return onto(armed, '+x', turn(made(`${n} ring`, 'steel-low', { tube: [mm(q.D / 2 + 1), mm(q.D / 2 + 4), mm(15)] }, { color: DARK }), 0, 90), 'touch'); },
  expect: (q) => bound(3 + q.P - 8 + 8, 60, 40, 'its projection, its plate\'s height and width'),
  tests: [T(3, { offers: ['25 bracket ring/axis'] })],
};
/** Towel rails by length: a 25 mm tube on two 20 mm posts 60 mm off the wall, typical. */
const TOWEL_RAILS: Record<string, { L: number }> = Object.fromEntries([400, 450, 500, 600, 750, 900].map((L) => [String(L), { L }]));
const TOWELRAIL: PartFamily<{ L: number }> = {
  id: 'piece.towelrail', name: 'Towel rail', gloss: 'A single towel rail by its length, 400 to 900 mm: its bar on two posts (typical)', domains: HOME, aisle: 'Household / Bathroom',
  says: 'A towel rail by its length (400 to 900 mm; its 25 mm bar and 20 mm posts typical): two chromed brass posts a ring of two apart, standing off the wall, with the bar laid across them (Stack); their roses and screws not drawn. The bar offers `<size> towel rail bar/axis`',
  rows: TOWEL_RAILS, size: '600', source: TYP,
  recipe: (q, size) => barOnLegs(`${size} towel rail`, 'brass', q.L - 50, 25, q.L, 20, 60, CHROME),
  expect: (q) => bound(q.L, 85, 25, 'its length, its stand-off and the bar\'s diameter'),
  tests: [T(3)],
};
/** Door knobs by diameter: the rose, the neck and the knob, typical. */
const KNOBS: Record<string, { D: number }> = Object.fromEntries([45, 50, 55, 60, 65].map((D) => [String(D), { D }]));
const DOORKNOB: PartFamily<{ D: number }> = {
  id: 'piece.doorknob', name: 'Door knob', gloss: 'A round door knob by its diameter, 45 to 65 mm: its rose, neck and ball (typical)', domains: HOME, aisle: 'Household / Doors',
  says: 'A door knob by its diameter (45 to 65 mm; typical): a brass rose (8 mm thick) with its neck and its ball standing up from it (Stack); it stands on a door\'s face (Onto a face). The rose offers `<size> knob rose/axis` for the spindle',
  rows: KNOBS, size: '55', source: TYP,
  recipe: (q, size) => stack(`${size} knob`, 1, [{ b: cyl(`${size} knob rose`, 'brass', q.D + 5, 8, BRASS) }, { b: cyl(`${size} knob neck`, 'brass', 18, 20, BRASS) }, { b: made(`${size} knob ball`, 'brass', { sphere: [mm(q.D) / 2] }, { color: BRASS }) }]),
  expect: (q) => bound(q.D + 5, 28 + q.D, q.D + 5, 'its rose\'s diameter by its height'),
  tests: [T(3)],
};
/** Letter plates by size: the plate and its flap, typical. */
const LETTERPLATES = rowsOf(['W', 'H'] as const, [['250x75', 250, 75], ['280x80', 280, 80], ['300x90', 300, 90], ['340x85', 340, 85], ['400x100', 400, 100]]);
const LETTERBOX: PartFamily<{ W: number; H: number }> = {
  id: 'piece.letterbox', name: 'Letter plate', gloss: 'A door letter plate by its size, 250x75 to 400x100: its plate and its flap (typical)', domains: HOME, aisle: 'Household / Doors',
  says: 'A letter plate by its size (250 × 75 to 400 × 100 mm; typical): a brass plate standing along y with its flap laid on its face (Onto a face); its slot not cut, its spring and screws not drawn',
  rows: LETTERPLATES, size: '300x90', source: TYP, envelope: 'the slot not cut',
  recipe: (q, size) => onto(box(`${size} letter plate`, 'brass', q.W, q.H, 3, BRASS), '+z', box(`${size} letter flap`, 'brass', q.W - 40, q.H - 30, 2, BRASS), 'touch'),
  expect: (q) => bound(q.W, q.H, 5, 'its width, height and thickness with its flap'),
  tests: [T(2)],
};
/** Coat hooks by kind: the plate and the peg out of it, typical. */
const HOOKS = rowsOf(['W', 'H', 'peg', 'd'] as const, [['single 45', 45, 50, 40, 8], ['single 55', 55, 65, 50, 10], ['double 60', 60, 70, 60, 10], ['hat and coat', 50, 110, 70, 12], ['robe 70', 70, 80, 70, 12]]);
const COATHOOK: PartFamily<{ W: number; H: number; peg: number; d: number }> = {
  id: 'piece.coathook', name: 'Coat hook', gloss: 'A coat hook by its kind: its plate and its peg out (typical)', domains: HOME, aisle: 'Household / Hooks',
  says: 'A coat hook by its kind (single, double, hat and coat, robe; typical, recalled): a zinc alloy plate standing against the wall with its peg, a rod turned to point out along z, on its face (Onto a face); its curl and screw holes not drawn',
  rows: HOOKS, size: 'single 55', source: TYP, envelope: 'a plate and a straight peg; its curl not drawn',
  recipe: (q, size) => onto(box(`${size} hook plate`, 'zamak', q.W, q.H, 2.5, CHROME), '+z', turn(cyl(`${size} hook peg`, 'zamak', q.d, q.peg, CHROME), 0, 90), 'touch'),
  expect: (q) => bound(q.W, q.H, 2.5 + q.peg, 'its plate\'s width and height, its reach'),
  tests: [T(2)],
};
/** Decorative shelf brackets by size: a flat-bar L with a brace, typical. */
const SBRACKETS = rowsOf(['W', 'H', 't', 'wide'] as const, [['100x100', 100, 100, 4, 25], ['125x150', 125, 150, 4, 25], ['150x200', 150, 200, 5, 30], ['200x250', 200, 250, 5, 30], ['250x300', 250, 300, 6, 35], ['300x350', 300, 350, 6, 35]]);
const SHELFBRACKET: PartFamily<{ W: number; H: number; t: number; wide: number }> = {
  id: 'piece.shelfbracket', name: 'Shelf bracket (decorative)', gloss: 'A decorative shelf bracket by its reach and height, 100x100 to 300x350: an L of flat bar with its brace (typical)', domains: HOME, aisle: 'Household / Shelving',
  says: 'A decorative shelf bracket by its reach (x) and height (y) (100 × 100 to 300 × 350 mm; its bar typical, recalled): an L of steel flat bar with a diagonal brace, one outline along z (its scrolls not drawn), its arm on top under the shelf and its leg down the wall; its screw holes not cut',
  rows: SBRACKETS, size: '150x200', source: TYP, envelope: 'a plain braced L; scrolls not drawn',
  recipe: (q, size) => { const t = q.t, outer: Pt[] = [[0, 0], [q.W, 0], [q.W, t], [t, q.H], [0, q.H]], inner: Pt[] = [[2 * t, 2 * t], [q.W - 3 * t, 2 * t], [2 * t, q.H - 3 * t]];
    const c = (p: Pt): Pt => [mm(p[0] - q.W / 2), mm(q.H / 2 - p[1])]; return made(`${size} shelf bracket`, 'steel-low', { section: { pts: withHole(outer.map(c), inner.map(c)), L: mm(q.wide) } }, { color: DARK }); },
  expect: (q) => bound(q.W, q.H, q.wide, 'its reach, height and width'),
  tests: [T(1)],
};
/** Bins by litres: diameter and height, 0.6 mm steel, typical. */
const BINS = rowsOf(['D', 'H'] as const, [['3 L', 170, 260], ['5 L', 200, 290], ['12 L', 250, 400], ['20 L', 290, 450], ['30 L', 300, 650], ['40 L', 330, 700], ['50 L', 360, 730], ['60 L', 400, 760]]);
const BIN: PartFamily<{ D: number; H: number }> = {
  id: 'piece.bin', name: 'Bin', gloss: 'A pedal or kitchen bin by its litres, 3 to 60 L, as a cup (typical)', domains: ['everyday'], aisle: 'Household / Waste',
  says: 'A bin by its litres (3 to 60 L; typical, recalled): a 0.6 mm stainless cup open at the top, offering `<size> bin/cavity` for a liner; its lid, pedal and inner bucket not drawn',
  rows: BINS, size: '30 L', source: TYP, envelope: 'the body as a plain cup; lid, pedal and inner bucket not drawn',
  recipe: (q, size) => made(`${size} bin`, 'stainless-304', { cup: [mm(q.D) / 2, mm(q.H), mm(0.6), mm(0.8)] }, { color: CHROME }),
  expect: (q) => bound(q.D, q.H, q.D, 'its diameter and height'),
  tests: [T(1)],
};
/** Buckets by litres: rim diameter and height, 2 mm polypropylene, typical. */
const BUCKETS = rowsOf(['D', 'H'] as const, [['5 L', 230, 200], ['10 L', 280, 260], ['12 L', 290, 280], ['15 L', 310, 300], ['20 L', 330, 350]]);
const BUCKET: PartFamily<{ D: number; H: number }> = {
  id: 'piece.bucket', name: 'Bucket', gloss: 'A plastic bucket by its litres, 5 to 20 L, as a cup (typical)', domains: ['everyday'], aisle: 'Household / Cleaning',
  says: 'A bucket by its litres (5 to 20 L; typical): a 2 mm polypropylene cup open at the top, straight-sided here (the real one tapers), offering `<size> bucket/cavity` (Into a room); its handle not drawn',
  rows: BUCKETS, size: '10 L', source: TYP, envelope: 'a straight-sided cup; the real bucket tapers; handle not drawn',
  recipe: (q, size) => made(`${size} bucket`, 'pp', { cup: [mm(q.D) / 2, mm(q.H), mm(2), mm(3)] }, { color: BLUE }),
  expect: (q) => bound(q.D, q.H, q.D, 'its diameter and height'),
  tests: [T(1)],
};

// ==== sports =========================================================================================================
/** Balls by game: diameter (mm) and the material they are drawn in; inflated balls at cotton's 80 kg/m³, which gives a
 *  solid sphere about their mass (a football 430 g, a basketball 620 g), typical. */
const BALLS: Record<string, { D: number; mat: string; color: number }> = { 'football 5': { D: 220, mat: 'cotton', color: WHITE }, 'football 4': { D: 205, mat: 'cotton', color: WHITE }, 'football 3': { D: 190, mat: 'cotton', color: WHITE }, 'basketball 7': { D: 242, mat: 'cotton', color: 0xc8632a }, 'basketball 6': { D: 233, mat: 'cotton', color: 0xc8632a }, 'basketball 5': { D: 221, mat: 'cotton', color: 0xc8632a },
  volleyball: { D: 210, mat: 'cotton', color: WHITE }, 'tennis ball': { D: 67, mat: 'rubber', color: 0xd9e833 }, 'cricket ball': { D: 72, mat: 'leather', color: RED }, 'golf ball': { D: 42.7, mat: 'rubber', color: WHITE }, 'table tennis ball': { D: 40, mat: 'cotton', color: WHITE }, hockey: { D: 72, mat: 'pp', color: WHITE } };
const BALL: PartFamily<{ D: number; mat: string; color: number }> = {
  id: 'piece.ball', name: 'Ball', gloss: 'A ball by its game (football, basketball, volleyball, tennis, cricket, golf, table tennis, hockey), a sphere (typical)', domains: SPORT, aisle: 'Sports / Balls',
  says: 'A ball by its game and size (football 3 to 5, basketball 5 to 7, volleyball, tennis, cricket, golf, table tennis, hockey; diameters recalled from their rules): a solid sphere, drawn for an inflated ball at cotton\'s 80 kg/m³ so its mass comes near its own; a tennis ball at rubber\'s, heavier than it is; a golf ball at rubber\'s and a cricket ball at leather\'s, near theirs',
  rows: BALLS, size: 'football 5', source: 'diameters recalled from each game\'s rules; the sphere solid', envelope: 'a solid sphere; a tennis ball\'s mass not its own',
  recipe: (q, size) => made(`${size} ball`, q.mat, { sphere: [mm(q.D) / 2] }, { color: q.color }),
  expect: (q) => bound(q.D, q.D, q.D, 'its diameter'),
  tests: [T(1), T(1, {}, { size: 'golf ball' })],
};
/** Baseball bats by length (in): barrel diameter, handle diameter, knob, typical. */
const BASEBALL_BATS: Record<string, { L: number; barrel: number; handle: number }> = Object.fromEntries(([[26, 57], [28, 60], [30, 63], [31, 64], [32, 66], [33, 66], [34, 67]] as const).map(([L, barrel]) => [`${L} in`, { L: L * 25.4, barrel, handle: 25 }]));
const BASEBALLBAT: PartFamily<{ L: number; barrel: number; handle: number }> = {
  id: 'piece.baseballbat', name: 'Baseball bat', gloss: 'A wooden baseball bat by its length, 26 to 34 in, a turned profile (typical)', domains: SPORT, aisle: 'Sports / Bats',
  says: 'A baseball bat by its length (26 to 34 in; its barrel and handle typical, recalled): a turned ash profile standing along y, knob down, handle, taper and barrel; drawn at oak\'s density. It offers `<size> baseball bat/axis`',
  rows: BASEBALL_BATS, size: '32 in', source: TYP,
  recipe: (q, size) => { const L = q.L, rb = q.barrel / 2, rh = q.handle / 2; return made(`${size} baseball bat`, 'oak', { lathe: { pts: ([[0, 0], [rh + 6, 0], [rh + 6, 12], [rh, 20], [rh, 0.4 * L], [rb, 0.75 * L], [rb, L - 10], [rb - 8, L], [0, L]] as Pt[]).map(([r, y]) => [mm(r), mm(y)] as Pt) } }, { color: WOOD }); },
  expect: (q) => bound(q.barrel, q.L, q.barrel, 'its barrel\'s diameter by its length'),
  tests: [T(1, { offers: ['32 in baseball bat/axis'] })],
};
/** Cricket bats by size: blade length and width, handle length, typical (Laws of Cricket: at most 108 mm wide, 965 long). */
const CRICKET_BATS = rowsOf(['Lb', 'W', 't', 'Lh'] as const, [['size 3', 480, 95, 35, 200], ['size 4', 510, 98, 36, 210], ['size 5', 540, 100, 37, 220], ['size 6', 570, 104, 38, 230], ['Harrow', 600, 106, 39, 240], ['short handle', 640, 108, 40, 270], ['long handle', 640, 108, 40, 300]]);
const CRICKETBAT: PartFamily<{ Lb: number; W: number; t: number; Lh: number }> = {
  id: 'piece.cricketbat', name: 'Cricket bat', gloss: 'A willow cricket bat by its size, 3 to long handle: its blade and its cane handle (typical)', domains: SPORT, aisle: 'Sports / Bats',
  says: 'A cricket bat by its size (3 to long handle; the full size\'s 108 mm width from the Laws, the rest typical, recalled): a willow blade standing along y (flat, its spine not drawn) with its cane handle on top (Stack); both drawn at wood\'s density. The handle offers `<size> cricket bat handle/axis`',
  rows: CRICKET_BATS, size: 'short handle', source: 'the Laws of Cricket\'s width and length (recalled); the rest typical', envelope: 'a flat blade; its spine and shoulders not drawn',
  recipe: (q, size) => stack(`${size} cricket bat`, 1, [{ b: box(`${size} cricket bat blade`, 'wood', q.W, q.Lb, q.t, WOOD) }, { b: cyl(`${size} cricket bat handle`, 'wood', 32, q.Lh, DARK) }]),
  expect: (q) => bound(q.W, q.Lb + q.Lh, q.t, 'its width, whole length and thickness'),
  tests: [T(2)],
};
/** Racket frames by game and head: the hoop's outside across, its beam, the shaft and handle's length, typical. */
const RACKETS = rowsOf(['D', 'beam', 'wall', 'Lh', 'dh'] as const, [['tennis 98', 265, 22, 12, 420, 30], ['tennis 100', 268, 23, 12, 420, 30], ['tennis 105', 275, 25, 12, 420, 30], ['tennis 110', 282, 26, 12, 420, 30], ['badminton', 200, 10, 7, 430, 22], ['squash', 210, 18, 10, 350, 28], ['padel', 260, 38, 30, 200, 32]]);
const RACKETFRAME: PartFamily<{ D: number; beam: number; wall: number; Lh: number; dh: number }> = {
  id: 'piece.racketframe', name: 'Racket frame', gloss: 'A racket frame by its game and head (tennis 98 to 110 in², badminton, squash, padel): a hoop and its shaft (typical)', domains: SPORT, aisle: 'Sports / Rackets',
  says: 'A racket frame by its game and head (tennis 98 to 110 in², badminton, squash, padel; typical, recalled): a graphite hoop (round here, really oval) lying flat as a tube with its shaft and handle out of its side along x (Onto a face); its strings and grip not drawn',
  rows: RACKETS, size: 'tennis 100', source: TYP, envelope: 'a round hoop, really oval; strings and grip not drawn',
  recipe: (q, size) => onto(made(`${size} racket hoop`, 'epoxy', { tube: [mm(q.D / 2 - q.wall), mm(q.D) / 2, mm(q.beam)] }, { color: DARK }), '+x', turn(cyl(`${size} racket shaft`, 'epoxy', q.dh, q.Lh, DARK), 2, 90), 'touch'),
  expect: (q) => bound(q.D + q.Lh, Math.max(q.beam, q.dh), q.D, 'its whole length, its beam, its head'),
  tests: [T(2)],
};
/** Goal post tubes by diameter: wall, cut to a length (steel for full-size goals, aluminium below), typical. */
const GOAL_TUBES = rowsOf(['D', 't', 'al'] as const, [['50', 50, 2, 1], ['60', 60, 2, 1], ['76', 76, 2.5, 0], ['80', 80, 3, 1], ['100', 100, 3, 1], ['102', 102, 3.2, 0]]);
const GOALPOST: PartFamily<{ D: number; t: number; al: number }> = {
  id: 'piece.goalposttube', name: 'Goal post tube', gloss: 'A goal post or crossbar tube by its diameter, 50 to 102 mm, cut to a length (typical)', domains: SPORT, aisle: 'Sports / Goals',
  says: 'A goal post tube by its diameter (50 to 102 mm; its wall typical; 76 and 102 mm steel, the rest aluminium): a round tube standing along y, cut to its length (2.44 m for a full-size upright, 7.32 m for its crossbar, recalled), offering its axis: a crossbar\'s corner joint slides over it (Over a shaft)',
  rows: GOAL_TUBES, size: '76', source: 'full-size goal 7.32 × 2.44 m (recalled from the Laws); tube sizes typical', settings: [lengthSet(2440)], cannot: (_q, _s, set) => noLength(set),
  recipe: (q, size, set) => made(`${size} goal post tube`, q.al ? 'al-6063' : 'steel-low', { tube: [mm(q.D / 2 - q.t), mm(q.D) / 2, len(set)] }, { color: WHITE }),
  expect: (q, _s, set) => ({ bound: [mm(q.D), len(set), mm(q.D)], mass: Math.PI * mm(q.D - q.t) * mm(q.t) * len(set) * rho(q.al ? 'al-6063' : 'steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass π(D − t)t' }),
  tests: [T(1, { offers: ['76 goal post tube/axis'] })],
};
/** Hex dumbbells by mass (kg): the heads across flats and long, the handle's diameter and length, typical. */
const DUMBBELLS = rowsOf(['kg', 'af', 'Lh', 'd', 'L'] as const, [['2 kg', 2, 62, 45, 25, 110], ['4 kg', 4, 75, 55, 28, 120], ['5 kg', 5, 80, 60, 28, 125], ['6 kg', 6, 85, 62, 30, 125], ['8 kg', 8, 95, 65, 32, 130], ['10 kg', 10, 100, 70, 32, 135], ['12.5 kg', 12.5, 105, 78, 34, 140], ['15 kg', 15, 110, 85, 34, 145], ['20 kg', 20, 120, 95, 35, 150], ['25 kg', 25, 130, 100, 35, 150], ['30 kg', 30, 135, 110, 35, 150]]);
const DUMBBELL: PartFamily<{ kg: number; af: number; Lh: number; d: number; L: number }> = {
  id: 'piece.dumbbell', name: 'Hex dumbbell', gloss: 'A hex dumbbell by its mass, 2 to 30 kg: two hex heads on a handle (typical)', domains: SPORT, aisle: 'Sports / Weights',
  says: 'A hex dumbbell by its mass (2 to 30 kg; its heads and handle typical, recalled): two cast-iron hex heads with the knurled steel handle between them, stacked along y (standing on one head); its rubber coat not drawn. The handle offers `<size> dumbbell handle/axis`',
  rows: DUMBBELLS, size: '10 kg', source: TYP,
  recipe: (q, size) => { const head = () => made(`${size} dumbbell head`, 'cast-iron', { hex: [mm(q.af), mm(q.Lh)] }, { color: DARK }); return stack(`${size} dumbbell`, 1, [{ b: head() }, { b: cyl(`${size} dumbbell handle`, 'steel-low', q.d, q.L, CHROME) }, { b: head() }]); },
  expect: (q) => ({ tol: 0.02, says: `its length ${2 * q.Lh + q.L} mm, its heads ${q.af} across flats (not held: the hex\'s corners lie along x or z as the room draws them)` }),
  tests: [T(3)],
};
/** Barbell plates by mass (kg): diameter; their thickness worked from the mass at cast iron's density, so the mass is
 *  exact; bores Olympic (50.4 mm) or standard (25.4), typical. */
const PLATES = rowsOf(['kg', 'D'] as const, [['1.25 kg', 1.25, 160], ['2.5 kg', 2.5, 190], ['5 kg', 5, 230], ['10 kg', 10, 290], ['15 kg', 15, 340], ['20 kg', 20, 390], ['25 kg', 25, 430]]);
const plateT = (q: { kg: number; D: number }, bore: number) => q.kg / (rho('cast-iron') * (disc(mm(q.D)) - disc(mm(bore))));
const boreOf = (set: Record<string, unknown>) => (set.bore === 'standard 25' ? 25.4 : 50.4);
const BARBELLPLATE: PartFamily<{ kg: number; D: number }> = {
  id: 'piece.barbellplate', name: 'Barbell plate', gloss: 'A cast-iron barbell plate by its mass, 1.25 to 25 kg, its thickness worked from its mass (typical diameters)', domains: SPORT, aisle: 'Sports / Weights',
  says: 'A barbell plate by its mass (1.25 to 25 kg; its diameter typical, recalled): a cast-iron disc lying flat with its bore (Olympic 50.4 mm or standard 25.4), as thick as its mass makes it at 7,200 kg/m³, so its mass is its own; its lip and grip holes not drawn. It offers `<size> plate/axis`: it slides over a bar\'s sleeve (Over a shaft)',
  rows: PLATES, size: '10 kg', source: TYP, settings: [{ key: 'bore', label: 'Bore', type: 'choice', default: 'Olympic 50', choices: ['Olympic 50', 'standard 25'] }],
  recipe: (q, size, set) => made(`${size} plate`, 'cast-iron', { tube: [mm(boreOf(set)) / 2, mm(q.D) / 2, plateT(q, boreOf(set))] }, { color: DARK }),
  expect: (q, _s, set) => ({ bound: [mm(q.D), plateT(q, boreOf(set)), mm(q.D)], mass: q.kg, tol: 0.01, massTol: 0.01, says: 'its diameter by its worked thickness; its mass its own' }),
  tests: [T(1, { offers: ['10 kg plate/axis'] }), T(1, {}, { bore: 'standard 25' })],
};
/** Skateboard decks by width (in): length and wheelbase, 7-ply maple 11 mm, the eight truck holes on 1 5/8 × 2 1/8 in
 *  centres, typical. */
const DECKS: Record<string, { W: number; L: number; wb: number }> = Object.fromEntries(([[7.5, 31, 14], [7.75, 31.25, 14], [8.0, 31.5, 14.25], [8.25, 32, 14.25], [8.5, 32.25, 14.5], [8.75, 32.5, 14.5], [9.0, 32.75, 14.75]] as const).map(([W, L, wb]) => [`${W} in`, { W: W * 25.4, L: L * 25.4, wb: wb * 25.4 }]));
const deckHoles = (q: { wb: number }): Pt[] => [-1, 1].flatMap((s) => [-1, 1].flatMap((a) => [-1, 1].map((b) => [mm(s * q.wb / 2 + a * 27), mm(b * 20.65)] as Pt)));
const SKATEDECK: PartFamily<{ W: number; L: number; wb: number }> = {
  id: 'piece.skatedeck', name: 'Skateboard deck', gloss: 'A 7-ply maple skateboard deck by its width, 7.5 to 9 in, its eight truck holes through it (typical)', domains: SPORT, aisle: 'Sports / Skateboards',
  says: 'A skateboard deck by its width (7.5 to 9 in; its length and wheelbase typical, recalled): a flat 11 mm maple slab lying along x (its concave, nose and tail not drawn; drawn at oak\'s density), its eight truck holes (5.2 mm, on 1 5/8 × 2 1/8 in centres, recalled) down through it, offered as `<size> deck/truck holes`: trucks bolt up under it (Through a line)',
  rows: DECKS, size: '8.25 in', source: TYP, envelope: 'a flat slab; concave, nose and tail not drawn',
  recipe: (q, size) => box(`${size} deck`, 'oak', q.L, 11, q.W, WOOD, { pattern: { name: 'truck holes', points: deckHoles(q), hole: mm(5.2) / 2 } }),
  expect: (q) => ({ bound: [mm(q.L), mm(11), mm(q.W)], mass: (mm(q.L) * mm(q.W) - 8 * disc(mm(5.2))) * mm(11) * rho('oak'), tol: 0.01, massTol: 0.02, says: 'its length, thickness and width; nominal mass, the slab less its holes' }),
  tests: [T(1, { offers: ['8.25 in deck/truck holes'] })],
};
/** Skateboard trucks by hanger width: the baseplate with its four holes, the hanger with the axle through it, typical. */
const TRUCKS: Record<string, { W: number }> = Object.fromEntries([129, 139, 144, 149, 159, 169].map((W) => [String(W), { W }]));
const SKATETRUCK: PartFamily<{ W: number }> = {
  id: 'piece.skatetruck', name: 'Skateboard truck', gloss: 'A skateboard truck by its hanger, 129 to 169 mm: baseplate, hanger and its axle (typical)', domains: SPORT, aisle: 'Sports / Skateboards',
  says: 'A skateboard truck by its hanger width (129 to 169 mm; typical, recalled): an aluminium baseplate with its four holes (on 1 5/8 × 2 1/8 in centres, `<size> truck baseplate/holes`), the hanger standing on it (Stack; its kingpin and bushings not drawn) and the 8 mm steel axle through the hanger (Through a line), offering `<size> truck axle/axis`: wheels slide over its ends (Over a shaft)',
  rows: TRUCKS, size: '139', source: TYP,
  recipe: (q, size) => { const n = `${size} truck`, base = box(`${n} baseplate`, 'al-6061', 90, 8, 60, GREY, { pattern: { name: 'holes', points: [[mm(-27), mm(-20.65)], [mm(27), mm(-20.65)], [mm(27), mm(20.65)], [mm(-27), mm(20.65)]], hole: mm(5.2) / 2 } });
    const hanger = box(`${n} hanger`, 'al-6061', q.W, 30, 24, GREY, { pattern: { name: 'axle', face: '+x', points: [[0, 0]], hole: mm(4) } });
    return stack(n, 1, [{ b: base }, { b: through(hanger, cyl(`${n} axle`, 'steel-low', 8, q.W + 70, CHROME), { port: `${n} hanger/axle`, from: 'lo' }, 'tight') }]); },
  expect: (q) => bound(q.W + 70, 38, 60, 'its axle\'s length, its height, its baseplate\'s width'),
  tests: [T(3, { offers: ['139 truck axle/axis', '139 truck baseplate/holes', '139 truck hanger/axle'] })],
};
/** Skateboard wheels by diameter: width, the core for two 608 bearings (22 mm seat), polyurethane, typical. */
const SKATE_WHEELS = rowsOf(['D', 'W'] as const, [['50', 50, 30], ['52', 52, 31], ['54', 54, 32], ['56', 56, 33], ['58', 58, 34], ['60', 60, 36], ['65', 65, 40], ['70', 70, 42]]);
const SKATEWHEEL: PartFamily<{ D: number; W: number }> = {
  id: 'piece.skatewheel', name: 'Skateboard wheel', gloss: 'A polyurethane skateboard wheel by its diameter, 50 to 70 mm, on its core (typical)', domains: SPORT, aisle: 'Sports / Skateboards',
  says: 'A skateboard wheel by its diameter (50 to 70 mm; its width typical, recalled): a polycarbonate core (its bore the 22 mm seat for two 608 bearings) with its urethane over it (Over a shaft). It offers `<size> skate wheel core/axis`: bearings go into its bore, an axle through them',
  rows: SKATE_WHEELS, size: '54', source: TYP,
  recipe: (q, size) => { const n = `${size} skate wheel`, core = made(`${n} core`, 'pc', { tube: [mm(11), mm(q.D / 2 - 7), mm(q.W)] }, { color: WHITE }); return over(core, `${n} core/axis`, made(`${n} urethane`, 'pu', { tube: [mm(q.D / 2 - 7), mm(q.D) / 2, mm(q.W)] }, { color: WHITE }), 'mid', 'touch'); },
  expect: (q) => bound(q.D, q.W, q.D, 'its diameter by its width'),
  tests: [T(2, { offers: ['54 skate wheel core/axis', '54 skate wheel urethane/axis'] })],
};
/** Scooter decks by kind: length, width, thickness, typical. */
const SCOOTER_DECKS = rowsOf(['L', 'W', 't'] as const, [['kids 3-wheel', 300, 110, 25], ['kick 480', 480, 110, 22], ['stunt 480', 480, 115, 30], ['stunt 520', 520, 120, 30], ['adult kick', 520, 140, 25], ['electric', 560, 170, 40]]);
const SCOOTERDECK: PartFamily<{ L: number; W: number; t: number }> = {
  id: 'piece.scooterdeck', name: 'Scooter deck', gloss: 'A scooter deck by its kind, as its envelope (typical)', domains: SPORT, aisle: 'Sports / Scooters',
  says: 'A scooter deck by its kind (kids, kick, stunt, adult, electric; typical, recalled): its envelope, an aluminium slab lying along x; its head tube, brake and grip tape not drawn',
  rows: SCOOTER_DECKS, size: 'kick 480', source: TYP, envelope: 'a flat slab of its length, width and thickness',
  recipe: (q, size) => box(`${size} scooter deck`, 'al-6061', q.L, q.t, q.W, GREY),
  expect: (q) => bound(q.L, q.t, q.W, 'its length, thickness and width'),
  tests: [T(1)],
};

// ==== toys ===========================================================================================================
/** Building bricks on the 8 mm pitch by their studs: the body 9.6 high (a plate 3.2), each stud 4.8 across and 1.8
 *  high, the body 0.2 under its pitch each way; typical of the system, recalled. */
const BRICKS: Record<string, { n: number; m: number }> = Object.fromEntries(([[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [2, 2], [2, 3], [2, 4], [2, 6], [2, 8], [4, 4]] as const).map(([m, n]) => [`${m}x${n}`, { n, m }]));
const brickOf = (name: string, n: number, m: number, h: number, color: number): Block => {
  const pts: Pt[] = []; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) pts.push([mm((i - (n - 1) / 2) * 8), mm((j - (m - 1) / 2) * 8)]);
  let b = box(name, 'abs', 8 * n - 0.2, h, 8 * m - 0.2, color, { patterns: pts.map((p, k) => ({ name: `stud ${k + 1}`, points: [p] })) });
  pts.forEach((_, k) => { b = onto(b, '+y', cyl(`${name} stud ${k + 1}`, 'abs', 4.8, 1.8, color), 'touch', `${name}/stud ${k + 1}`); }); return b;
};
const BRICK: PartFamily<{ n: number; m: number }> = {
  id: 'piece.toybrick', name: 'Building brick (8 mm pitch)', gloss: 'A building brick on the 8 mm pitch by its studs, 1x1 to 4x4, each stud put on the body by a line it offers (typical)', domains: TOY, aisle: 'Toys / Building bricks',
  says: 'A building brick on the 8 mm pitch by its studs (1 × 1 to 4 × 4; a brick 9.6 high, a plate 3.2; typical of the system, recalled): an ABS body with a stud (4.8 across, 1.8 high) standing on each line it offers (`<size> brick/stud 1` …, Onto a face); its hollow underside and tubes not drawn. Bricks stack (Stack), a stud\'s pitch apart',
  rows: BRICKS, size: '2x4', source: 'the 8 mm pitch, 9.6 and 3.2 heights and 4.8 studs of the system (recalled)', settings: [{ key: 'form', label: 'Form', type: 'choice', default: 'brick', choices: ['brick', 'plate'] }, { key: 'colour', label: 'Colour', type: 'choice', default: 'red', choices: ['red', 'blue', 'yellow', 'white', 'black'] }],
  recipe: (q, size, set) => brickOf(`${size} ${String(set.form)}`, q.n, q.m, set.form === 'plate' ? 3.2 : 9.6, ({ red: RED, blue: BLUE, yellow: 0xf2c53d, white: WHITE, black: DARK } as Record<string, number>)[String(set.colour)] ?? RED),
  expect: (q, _s, set) => bound(8 * q.n - 0.2, (set.form === 'plate' ? 3.2 : 9.6) + 1.8, 8 * q.m - 0.2, 'its studs\' pitch each way, its height with its studs'),
  tests: [T(9), T(2, {}, { size: '1x1', form: 'plate' })],
};
/** Wooden unit blocks (the standard unit 140 × 70 × 35) and cubes, hard maple drawn at oak's density, typical. */
const BLOCKS = rowsOf(['L', 'H', 'W'] as const, [['half unit', 70, 35, 70], ['unit', 140, 35, 70], ['double unit', 280, 35, 70], ['quad unit', 560, 35, 70], ['pillar', 140, 35, 35], ['half pillar', 70, 35, 35], ['cube 35', 35, 35, 35], ['cube 40', 40, 40, 40], ['cube 50', 50, 50, 50], ['plank', 280, 17.5, 70]]);
const WOODENBLOCK: PartFamily<{ L: number; H: number; W: number }> = {
  id: 'piece.woodenblock', name: 'Wooden block', gloss: 'A wooden unit block (half unit to quad, pillars, cubes, a plank) on the 35 mm unit (typical)', domains: TOY, aisle: 'Toys / Wooden blocks',
  says: 'A wooden building block by its name (the unit 140 × 70 × 35 and its halves, doubles, pillars, cubes and planks; typical, recalled): a hard maple block lying along x, drawn at oak\'s density. Blocks stack (Stack) and lie across each other (Onto a face)',
  rows: BLOCKS, size: 'unit', source: TYP,
  recipe: (q, size) => box(`${size} block`, 'oak', q.L, q.H, q.W, WOOD),
  expect: (q) => boxE(q.L, q.H, q.W, 'oak', 'its length, height and width; nominal mass at oak\'s density'),
  tests: [T(1)],
};
/** Wooden toy wheels by diameter: width and the axle hole (for a 6 mm peg), typical. */
const TOY_WHEELS = rowsOf(['D', 'W', 'bore'] as const, [['25', 25, 8, 6.5], ['32', 32, 10, 6.5], ['38', 38, 10, 6.5], ['45', 45, 12, 6.5], ['50', 50, 12, 6.5], ['63', 63, 14, 6.5], ['76', 76, 16, 8.5]]);
const TOYWHEEL: PartFamily<{ D: number; W: number; bore: number }> = {
  id: 'piece.toywheel', name: 'Toy wheel (wooden)', gloss: 'A wooden toy wheel by its diameter, 25 to 76 mm, with its axle hole (typical)', domains: TOY, aisle: 'Toys / Wheels',
  says: 'A wooden toy wheel by its diameter (25 to 76 mm; its width and hole typical, recalled): a beech disc (drawn at oak\'s density) lying flat with its axle hole, offering `<size> toy wheel/axis`: an axle peg (piece.axlepeg) goes through it (Through a line), or a dowel',
  rows: TOY_WHEELS, size: '38', source: TYP,
  recipe: (q, size) => made(`${size} toy wheel`, 'oak', { tube: [mm(q.bore) / 2, mm(q.D) / 2, mm(q.W)] }, { color: WOOD }),
  expect: (q) => ({ bound: [mm(q.D), mm(q.W), mm(q.D)], mass: (disc(mm(q.D)) - disc(mm(q.bore))) * mm(q.W) * rho('oak'), tol: 0.01, massTol: 0.02, says: 'its diameter and width; nominal mass, the disc less its hole' }),
  tests: [T(1, { offers: ['38 toy wheel/axis'] })],
};
/** Axle pegs by length: a 6 mm shank with its 10 mm head, typical. */
const PEGS = rowsOf(['L', 'd', 'D', 'h'] as const, [['25', 25, 6, 10, 5], ['32', 32, 6, 10, 5], ['38', 38, 6, 10, 5], ['45', 45, 6, 12, 6], ['57', 57, 8, 14, 6]]);
const AXLEPEG: PartFamily<{ L: number; d: number; D: number; h: number }> = {
  id: 'piece.axlepeg', name: 'Axle peg (wooden)', gloss: 'A wooden axle peg by its length, 25 to 57 mm: its shank and its head (typical)', domains: TOY, aisle: 'Toys / Wheels',
  says: 'A wooden axle peg by its length (25 to 57 mm; typical, recalled): a beech shank standing along y with its head on top (Stack), drawn at oak\'s density; it goes through a toy wheel\'s hole into a glued hole (Through a line). The shank offers `<size> axle peg shank/axis`',
  rows: PEGS, size: '38', source: TYP,
  recipe: (q, size) => stack(`${size} axle peg`, 1, [{ b: cyl(`${size} axle peg shank`, 'oak', q.d, q.L - q.h, WOOD) }, { b: cyl(`${size} axle peg head`, 'oak', q.D, q.h, WOOD) }]),
  expect: (q) => bound(q.D, q.L, q.D, 'its head\'s diameter by its length'),
  tests: [T(2, { offers: ['38 axle peg head/axis', '38 axle peg shank/axis'] })],
};
/** Doll's house panels by their part: 3 mm plywood (6 for floors), typical of kit houses, drawn at wood's density. */
const DH_PANELS = rowsOf(['W', 'H', 't'] as const, [['wall 300x200', 300, 200, 3], ['wall 400x250', 400, 250, 3], ['wall 600x300', 600, 300, 3], ['floor 400x300', 400, 300, 6], ['floor 600x400', 600, 400, 6], ['roof 420x250', 420, 250, 3], ['roof 640x320', 640, 320, 3]]);
const DOLLHOUSEPANEL: PartFamily<{ W: number; H: number; t: number }> = {
  id: 'piece.dollhousepanel', name: 'Doll\'s house panel', gloss: 'A doll\'s house wall, floor or roof panel by its size, plywood (typical of kits)', domains: TOY, aisle: 'Toys / Doll\'s houses',
  says: 'A doll\'s house panel by its part and size (walls, floors, roofs; typical of plywood kits, recalled): a plywood sheet standing along y (a floor lying is turned), drawn at wood\'s density; its window and door cut-outs not cut. Panels meet edge to edge (Onto a face)',
  rows: DH_PANELS, size: 'wall 400x250', source: TYP, envelope: 'a plain sheet; windows and doors not cut',
  recipe: (q, size) => box(`${size} panel`, 'wood', q.W, q.H, q.t, WOOD),
  expect: (q) => boxE(q.W, q.H, q.t, 'wood', 'its width, height and thickness; nominal mass at wood\'s density'),
  tests: [T(1)],
};
/** Marbles by diameter: glass, typical (the 16 mm the common one, the 25 and 35 shooters). */
const MARBLES: Record<string, { D: number }> = Object.fromEntries([12, 14, 16, 22, 25, 35, 42].map((D) => [String(D), { D }]));
const MARBLE: PartFamily<{ D: number }> = {
  id: 'piece.marble', name: 'Marble', gloss: 'A glass marble by its diameter, 12 to 42 mm (typical)', domains: TOY, aisle: 'Toys / Marbles',
  says: 'A glass marble by its diameter (12 to 42 mm; typical): a sphere; it sits in a cup or rolls in a channel (Into a room)',
  rows: MARBLES, size: '16', source: TYP,
  recipe: (q, size) => made(`${size} marble`, 'glass', { sphere: [mm(q.D) / 2] }, { color: 0x6fb7d6 }),
  expect: (q) => ({ bound: [mm(q.D), mm(q.D), mm(q.D)], mass: (Math.PI / 6) * mm(q.D) ** 3 * rho('glass'), tol: 0.01, massTol: 0.02, says: 'its diameter; nominal mass as a glass sphere' }),
  tests: [T(1)],
};
/** Dice by size: an ABS cube, its one and its six as pips (blind holes) on its top and bottom, typical. */
const DICE: Record<string, { s: number }> = Object.fromEntries([8, 10, 12, 14, 16, 19, 25].map((s) => [String(s), { s }]));
const DIE: PartFamily<{ s: number }> = {
  id: 'piece.dice', name: 'Die', gloss: 'A die by its size, 8 to 25 mm: a cube with its one and its six as pips (typical)', domains: TOY, aisle: 'Toys / Dice',
  says: 'A die by its size (8 to 25 mm; typical): an ABS cube with its one on top (+y) and its six underneath (−y) as pips, blind holes a tenth of its size; its other faces\' pips and its rounded edges not drawn',
  rows: DICE, size: '16', source: TYP, envelope: 'pips on two faces only; edges square',
  recipe: (q, size) => { const a = mm(0.28 * q.s), r = mm(0.09 * q.s), d = mm(0.06 * q.s);
    return box(`${size} die`, 'abs', q.s, q.s, q.s, WHITE, { patterns: [{ name: 'one', face: '+y', points: [[0, 0]], hole: r, depth: d }, { name: 'six', face: '-y', points: [[-a, -a], [-a, 0], [-a, a], [a, -a], [a, 0], [a, a]], hole: r, depth: d }] }); },
  expect: (q) => bound(q.s, q.s, q.s, 'its size'),
  tests: [T(1, { offers: ['16 die/one', '16 die/six'] })],
};

/** Every family here, by trade: tools, garden, kitchen, household, sports, toys. */
export const HOME_FAMILIES = [HAMMERHEAD, HAMMERHANDLE, WRENCH, SCREWDRIVER, PLIERS_F, DRILL, DRILLBIT, SAWBLADE, CHISEL, VICE, GCLAMP, BENCHTOP, SAWHORSE, LADDERRAIL, LADDERRUNG, SPIRITLEVEL,
  RAKEHEAD, SHOVELBLADE, SHOVELHANDLE, HOSEREEL, SPRINKLER, BIBTAP, WATERINGCAN, PLANTPOT, POSTCAP, GATELATCH, TRELLISSLAT, MOWERBLADE, GARDENWHEEL,
  COOKPOT, FRYINGPAN, KETTLE, MIXERTAP, SINKBOWL, HOB, OVEN, CUTTINGBOARD, KNIFE, CUPBOARDDOOR, TBARHANDLE,
  LAMPBULB, LAMPSHADE, MIRROR, PICTUREFRAME, CURTAINROD, CURTAINBRACKET, TOWELRAIL, DOORKNOB, LETTERBOX, COATHOOK, SHELFBRACKET, BIN, BUCKET,
  BALL, BASEBALLBAT, CRICKETBAT, RACKETFRAME, GOALPOST, DUMBBELL, BARBELLPLATE, SKATEDECK, SKATETRUCK, SKATEWHEEL, SCOOTERDECK,
  BRICK, WOODENBLOCK, TOYWHEEL, AXLEPEG, DOLLHOUSEPANEL, MARBLE, DIE] as PartFamily<unknown>[];
/** Their piece nodes (registered with the maker's check.row by familyNode). */
export const HOME_NODES: BlockDef[] = HOME_FAMILIES.map((f) => familyNode(f));
