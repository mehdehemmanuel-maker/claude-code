// Enclosures and electrical installation made by the table-driven maker (decision 0026, the user's words of 2026-11-06:
// "add 1000 new working parts, no mock"): die-cast boxes (Hammond 1590), IP65 junction boxes, 19-inch rack panels
// (EIA-310), DIN rail (EN 60715) and what goes on it (breakers, modular housings, terminal blocks), cable glands (metric
// and PG), their locknuts, blanking plugs and reducers, conduit rigid and flexible (EN 61386) and its couplers, bends,
// saddles and boxes, wire ferrules (DIN 46228), crimp terminals (ring, fork, push-on, butt, tube lugs), heat-shrink
// tubing, flexible cable (H05VV-F, H07RN-F), cartridge fuses, control knobs for 6 mm shafts, rubber grommets, cable tie
// mounts, trunking and flush boxes. Each a table of rows and one recipe of the room operations (src/nexus/room.ts): no
// place is written here, every place is what an operation gives.
//
// Sources, row by row (INSTALL_SOURCES says each table's, INSTALL_STATUS whether it is specified or typical):
// - Hammond 1590: the maker's own table (https://www.hammfg.com/electronics/small-case/diecast/1590, read 2026-11-06):
//   each box's length, width and height (mm, as the page rounds them) and the screws its note names (six for 1590BX,
//   BX2, D, DD, DE, E, EE and R1, eight for 1590F, four for the rest). Its walls and lid typical (not on that page).
// - EIA-310 (19-inch racks): the panel's 482.6 mm width, its 465.1 mm hole centres, the 44.45 mm unit, the panel 0.79 mm
//   short of its units, the holes at 6.35 and 38.1 mm in each unit (written from the standard's well-known figures; the
//   document itself not read here). EN 60715: the 35 × 7.5, 35 × 15 and 15 × 5.5 top-hat rails' widths and depths (as
//   above). PG threads' outsides: DIN 40430 (as above). IEC 61210: push-on tab widths and thicknesses (as above).
// - The rest typical of what makers sell, written from recall of their tables, read from no source here: so labelled
//   typical (junction boxes, DIN housings, breakers, terminal blocks, glands' hexes and clamping ranges, conduit walls,
//   ferrules' sizes after DIN 46228, crimp terminals, lugs, heat-shrink walls, cables' outsides after HD 21 and HD 22,
//   knobs, grommets, tie mounts, trunking, flush boxes). No table here is copied from any file.
// Threads are never drawn: a thread is drawn at its outside, a tapped bore at the thread's size.

import { made, over, stack, through, turn, onto, run, type Block } from '../room';
import { densityKg } from '../mass';
import { familyNode, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const disc = (d: number) => (Math.PI * d * d) / 4;
const annulus = (D: number, d: number) => disc(D) - disc(d);
const areaOf = (pts: [number, number][]) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]!; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
// (a closed turned outline's volume, Pappus frustum by frustum)
const turnedVol = (pts: [number, number][]) => Math.abs(pts.reduce((v, p, i) => { const q = pts[(i + 1) % pts.length]!; return v + (Math.PI / 3) * (p[0] ** 2 + p[0] * q[0] + q[0] ** 2) * (q[1] - p[1]); }, 0));
const hexA = (s: number) => (Math.sqrt(3) / 2) * s * s;
const corners = (s: number) => (2 * s) / Math.sqrt(3);
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const above0 = (set: Record<string, unknown>, k: string, what: string) => (Number(set[k]) > 0 && Number.isFinite(Number(set[k])) ? null : `${what} above 0 (${String(set[k])} mm)`);
const span = (pts: [number, number][], k: 0 | 1) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
const T = (pieces: number, more: Record<string, unknown> = {}, set?: Record<string, unknown>) => ({ ...(set ? { set } : {}), inputs: {}, outputs: { pieces, ...more } });
const EL = ['electrical', 'everyday', 'manufacturing'], BOX = ['electrical', 'mechanical', 'manufacturing', 'everyday'];
const A = (cat: string) => `Enclosures / ${cat}`, E = (cat: string) => `Electrical installation / ${cat}`;
const GREY = 0x9a9ea3, DARK = 0x2a2b2e, BRASS = 0xc9a54a, CU = 0xc8874a;
/** A table written as rows of numbers: each row's name, then its figures under the keys given. */
function rowsOf<K extends string>(keys: readonly K[], rows: readonly (readonly [string, ...number[]])[]): Record<string, Record<K, number>> {
  return Object.fromEntries(rows.map(([name, ...v]) => [name, Object.fromEntries(keys.map((k, i) => [k, v[i]!])) as Record<K, number>]));
}
/** A closed outline with a hole in it, joined by a cut of no width (as a star knob's bored outline is): the outer
 *  outline, back to its first point, then the inner one the other way round and back to its own first point. */
const withHole = (outer: [number, number][], inner: [number, number][]): [number, number][] => { const i = [...inner].reverse(); return [...outer, outer[0]!, ...i, i[0]!]; };
const rect = (w: number, h: number, cx = 0, cy = 0): [number, number][] => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];

// ==== enclosures =====================================================================================================
type BoxRow = { L: number; W: number; H: number; screws: number; wall: number; hole: number };
/** Screw points on a lid, inset from its edges: four at its corners, two more at its long sides' middles (six), two more
 *  at its short sides' (eight). */
const screwPts = (q: BoxRow): [number, number][] => { const a = q.L / 2 - q.wall - 3.5, b = q.W / 2 - q.wall - 3.5, c: [number, number][] = [[-a, -b], [a, -b], [a, b], [-a, b]];
  if (q.screws >= 6) c.push([0, -b], [0, b]); if (q.screws >= 8) c.push([-a, 0], [a, 0]); return c.map(([x, z]) => [mm(x), mm(z)]); };
const LID = { key: 'lid', label: 'Its lid', type: 'choice' as const, default: 'on', choices: ['on', 'off'] };
/** A box with its lid: its body a case (walls and floor round its cavity, open at the top) and its lid on top, the lid's
 *  screw holes through it; lid off, the body alone, its cavity offered for a board to go into (Into a room). */
const boxed = (name: string, mat: string, q: BoxRow, set: Record<string, unknown>, color: number): Block => {
  const lidT = q.wall, body = made(`${name} body`, mat, { case: [mm(q.L), mm(q.H - lidT), mm(q.W), mm(q.wall), mm(q.wall)] }, { color });
  if (set.lid === 'off') return body;
  return stack(name, 1, [{ b: body }, { b: made(`${name} lid`, mat, { box: [mm(q.L), mm(lidT), mm(q.W)] }, { color, pattern: { name: 'screws', points: screwPts(q), hole: mm(q.hole) / 2 } }) }]);
};
const boxedExpect = (q: BoxRow, set: Record<string, unknown>, mat: string) => { const t = mm(q.wall), L = mm(q.L), W = mm(q.W), Hb = mm(q.H) - t, off = set.lid === 'off';
  const body = L * Hb * W - (L - 2 * t) * (Hb - t) * (W - 2 * t), lid = off ? 0 : L * t * W - q.screws * disc(mm(q.hole)) * t;
  return { bound: [L, off ? Hb : mm(q.H), W] as [number, number, number], mass: (body + lid) * rho(mat), tol: 0.01, massTol: 0.02, says: `its outside${off ? ', the body alone' : ''}; nominal mass, the case\'s walls and floor and its lid less its screw holes` }; };
const HAMMOND_SIX = ['1590BX', '1590BX2', '1590D', '1590DD', '1590DE', '1590E', '1590EE', '1590R1'];
/** Hammond 1590 die-cast aluminium boxes: length, width and height (mm, as Hammond's table rounds them); their screws as
 *  its note says; walls 2.5 mm where the box is 66 mm wide or less, else 3 mm (typical); M3 screws (3.4 mm holes). */
export const HAMMOND1590: Record<string, BoxRow> = Object.fromEntries(([
  ['1590LLB', 51, 51, 25], ['1590LB', 51, 51, 31], ['1590H', 53, 38, 31], ['1590Y', 92, 92, 42], ['1590A', 93, 39, 31], ['1590G', 100, 50, 26], ['1590G2', 100, 50, 31], ['1590S', 111, 82, 44],
  ['1590B', 112, 61, 31], ['1590B2', 112, 61, 38], ['1590BS', 112, 61, 42], ['1590B3', 116, 77, 38], ['1590BB', 120, 94, 34], ['1590BB2', 120, 94, 38], ['1590BBS', 120, 94, 42], ['1590Q', 120, 120, 34],
  ['1590U', 120, 120, 59], ['1590V', 120, 120, 94], ['1590C', 120, 94, 57], ['1590T', 120, 80, 59], ['1590CE', 120, 100, 65], ['1590N1', 121, 66, 40], ['1590KK', 125, 125, 57], ['1590K', 125, 125, 79],
  ['1590J', 145, 95, 49], ['1590XX', 145, 121, 40], ['1590X', 145, 121, 56], ['1590P1', 153, 83, 50], ['1590D', 188, 120, 56], ['1590DD', 188, 120, 37], ['1590E', 188, 120, 82], ['1590F', 188, 188, 67],
  ['1590R1', 192, 112, 61], ['1590DE', 200, 120, 64], ['1590EE', 200, 120, 85], ['1590BX2', 254, 70, 35], ['1590BX', 254, 70, 50],
] as const).map(([k, L, W, H]) => [k, { L, W, H, screws: k === '1590F' ? 8 : HAMMOND_SIX.includes(k) ? 6 : 4, wall: W <= 66 ? 2.5 : 3, hole: 3.4 }]));
const DIECAST: PartFamily<BoxRow> = {
  id: 'piece.diecastbox', name: 'Die-cast box (Hammond 1590)', gloss: 'A Hammond 1590 die-cast aluminium box by its part number, its lid screwed on', domains: BOX, aisle: A('Die-cast boxes'),
  says: 'A Hammond 1590 die-cast aluminium box by its part number: its body a case (its walls and floor round its cavity; its draft, corner bosses and lip not drawn) and its lid on top, its screw holes through it (`<size> lid/screws`). Lid off, the body alone offers `<size> body/cavity`, for a board to go into (Into a room); a cable gland goes through a hole in its wall',
  rows: HAMMOND1590, size: '1590B', source: 'Hammond Manufacturing\'s 1590 table (hammfg.com, read 2026-11-06); walls typical', settings: [LID],
  recipe: (q, size, set) => boxed(size, 'al-a380', q, set, 0xb8bcc0),
  expect: (q, _s, set) => boxedExpect(q, set, 'al-a380'),
  tests: [T(2, { offers: ['1590B body/cavity', '1590B lid/screws'] }), T(1, { offers: ['1590B body/cavity'] }, { lid: 'off' })],
};
/** IP65 grey ABS junction boxes with screwed lids, outside length × width × height (mm, typical of makers' ranges); their
 *  walls 2.5 to 3.5 mm, lid screws M4 (4.5 mm holes), four (six from 300 mm long), typical. */
export const JUNCTION: Record<string, BoxRow> = Object.fromEntries(([[85, 85, 50], [100, 100, 50], [100, 100, 70], [120, 80, 50], [150, 110, 70], [160, 160, 90], [190, 140, 70], [200, 120, 75], [240, 190, 90], [300, 220, 120], [380, 300, 120]] as const)
  .map(([L, W, H]) => [`${L}×${W}×${H}`, { L, W, H, screws: L >= 300 ? 6 : 4, wall: L <= 120 ? 2.5 : L <= 200 ? 3 : 3.5, hole: 4.5 }]));
const JUNCTIONBOX: PartFamily<BoxRow> = {
  id: 'piece.junctionbox', name: 'IP65 junction box', gloss: 'A grey ABS IP65 junction box with its screwed lid, by its outside size (typical)', domains: BOX, aisle: A('Junction boxes'),
  says: 'An IP65 grey ABS junction box (typical sizes): its body a case round its cavity (its gasket, knock-outs and corner bosses not drawn) and its lid on top, its screw holes through it (`<size> lid/screws`). Lid off, the body offers `<size> body/cavity` for terminals or a board (Into a room); glands go through holes in its walls',
  rows: JUNCTION, size: '100×100×50', source: 'typical of makers\' IP65 ABS boxes', settings: [LID],
  recipe: (q, size, set) => boxed(size, 'abs', q, set, GREY),
  expect: (q, _s, set) => boxedExpect(q, set, 'abs'),
  tests: [T(2), T(1, {}, { lid: 'off' })],
};
/** 19-inch rack panels by their units (EIA-310). */
export const RACK_UNITS: Record<string, { n: number }> = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`${n}U`, { n }]));
const rackH = (n: number) => n * 44.45 - 0.79;
const rackPts = (n: number): [number, number][] => Array.from({ length: n }, (_, k) => [6.35, 38.1].map((y0) => 44.45 * k + y0 - (n * 44.45) / 2)).flat().flatMap((y) => [[-232.55, y], [232.55, y]] as [number, number][]).map(([x, y]) => [mm(x), mm(y)]);
const RACKPANEL: PartFamily<{ n: number }> = {
  id: 'piece.rackpanel', name: '19-inch rack panel', gloss: 'A 19-inch rack front panel by its units, 1U to 8U (EIA-310)', domains: BOX, aisle: A('Rack panels'),
  says: 'A 19-inch rack front panel (EIA-310): 482.6 mm wide, its units × 44.45 mm less 0.79, of aluminium so thick, standing up (its face toward +z), its mounting holes (6.6 mm, typical) at 465.1 mm centres, two in each unit (6.35 and 38.1 mm up it), offered as `<n>U rack panel/rack holes`: cage-nut screws go through them into the rack\'s rails (Through a line). Its ears are the panel itself (flat, no handles)',
  rows: RACK_UNITS, size: '1U', source: 'EIA-310 (19-inch rack: width, hole centres, unit); holes and thickness typical',
  settings: [{ key: 'thickness', label: 'Thickness, mm', type: 'choice', default: '3', choices: ['2', '3', '4', '5'] }],
  cannot: (q) => (q.n >= 1 && q.n <= 8 ? null : `rack panels here are 1U to 8U (EIA-310's unit, ${q.n}U asked)`),
  recipe: (q, _s, set) => made(`${q.n}U rack panel`, 'al-5052', { box: [mm(482.6), mm(rackH(q.n)), len(set, 'thickness')] }, { color: 0x3a3c40, pattern: { name: 'rack holes', points: rackPts(q.n), hole: mm(6.6) / 2, face: '+z' } }),
  expect: (q, _s, set) => { const t = len(set, 'thickness'); return { bound: [mm(482.6), mm(rackH(q.n)), t], mass: (mm(482.6) * mm(rackH(q.n)) - 4 * q.n * disc(mm(6.6))) * t * rho('al-5052'), tol: 0.01, massTol: 0.02, says: 'its width, height (n × 44.45 − 0.79 mm) and thickness; nominal mass, the plate less its holes' }; },
  tests: [T(1, { offers: ['1U rack panel/rack holes'] }), T(1, {}, { size: '4U', thickness: '2' })],
};
// (a DIN 43880 front: 90 mm high on the rail, its 45 mm front from 44 mm out; typical depths)
const din43880 = (depth: number): [number, number][] => [[-45, 0], [45, 0], [45, 44], [22.5, 44], [22.5, depth], [-22.5, depth], [-22.5, 44], [-45, 44]].map(([x, y]) => [mm(x!), mm(y!)]);
const dinInner = (depth: number, t: number): [number, number][] => [[-45 + t, t], [45 - t, t], [45 - t, 44 - t], [22.5 - t, 44 - t], [22.5 - t, depth - t], [-22.5 + t, depth - t], [-22.5 + t, 44 - t], [-45 + t, 44 - t]].map(([x, y]) => [mm(x!), mm(y!)]);
/** DIN 43880 modular housings by modules of 17.5 mm (typical of makers' rail housings for electronics). */
export const DIN_MODULES: Record<string, { n: number }> = Object.fromEntries([1, 2, 3, 4, 6, 8, 9, 10, 12].map((n) => [`${n} module${n > 1 ? 's' : ''}`, { n }]));
const DINHOUSING: PartFamily<{ n: number }> = {
  id: 'piece.dinhousing', name: 'DIN-rail housing', gloss: 'A DIN 43880 modular housing for electronics on a 35 mm rail, by its modules of 17.5 mm (typical)', domains: BOX, aisle: A('DIN-rail housings'),
  says: 'A DIN-rail housing (DIN 43880\'s 45 mm front, 90 mm high, 58 deep; 17.5 mm a module; walls 2 mm, typical) of polycarbonate: its hollow body, its stepped outline drawn along the rail (z), closed by an end wall at each end (its rail clip and terminals not drawn). It goes onto a rail (Onto a face, +y of piece.dinrail)',
  rows: DIN_MODULES, size: '2 modules', source: 'DIN 43880\'s front and height; depth, walls and module width typical',
  recipe: (q, size) => { const W = mm(17.5 * q.n), e = mm(2), end = (k: number) => made(`DIN housing ${size} end ${k}`, 'pc', { section: { pts: din43880(58), L: e } }, { color: 0xd8d8d2 });
    return stack(`DIN housing ${size}`, 2, [{ b: end(1) }, { b: made(`DIN housing ${size} body`, 'pc', { section: { pts: withHole(din43880(58), dinInner(58, 2)), L: W - 2 * e } }, { color: 0xd8d8d2 }) }, { b: end(2) }]); },
  expect: (q) => { const W = mm(17.5 * q.n), e = mm(2), o = areaOf(din43880(58)), i = areaOf(dinInner(58, 2)); return { bound: [mm(90), mm(58), W], mass: ((o - i) * (W - 2 * e) + 2 * o * e) * rho('pc'), tol: 0.01, massTol: 0.02, says: 'its 90 mm height, 58 depth and modules\' width; nominal mass, the hollow body and its two end walls' }; },
  tests: [T(3)],
};
/** Miniature circuit breakers (EN 60898-1) by poles, one 17.5 mm module a pole (DIN 43880 size 1, 70 deep; typical). */
export const MCB: Record<string, { n: number; g: number }> = { '1P': { n: 1, g: 125 }, '2P': { n: 2, g: 250 }, '3P': { n: 3, g: 375 }, '4P': { n: 4, g: 500 } };
const DINBREAKER: PartFamily<{ n: number; g: number }> = {
  id: 'piece.dinbreaker', name: 'Miniature circuit breaker', gloss: 'A DIN-rail miniature circuit breaker (EN 60898-1) by its poles, a 17.5 mm module each (typical)', domains: EL, aisle: E('DIN rail and breakers'),
  says: 'A miniature circuit breaker for a 35 mm rail (EN 60898-1; DIN 43880 size 1: 90 high, its 45 mm front from 44 out, 70 deep; 17.5 mm a pole, typical): its body\'s outline along the rail (z) and its toggle on its front across its poles. It goes onto a rail (Onto a face, +y of piece.dinrail); its rating is a setting (the curve and rating do not change its size)',
  rows: MCB, size: '1P', source: 'typical of makers\' MCBs (DIN 43880 size 1)',
  envelope: 'its body drawn as its outline, solid (no contacts, coil, bimetal or arc chute inside; its terminals\' screws not drawn); its mass the row\'s typical, not its drawing\'s',
  settings: [{ key: 'rating', label: 'Rating', type: 'choice', default: 'B16', choices: ['B6', 'B10', 'B16', 'B20', 'B32', 'C6', 'C10', 'C16', 'C20', 'C32', 'C40', 'C63'] }],
  recipe: (q, size, set) => { const W = mm(17.5 * q.n); return stack(`${size} ${String(set.rating)} breaker`, 1, [{ b: made(`${size} breaker body`, 'pbt', { section: { pts: din43880(70), L: W } }, { color: 0xeeeeea }) }, { b: made(`${size} breaker toggle`, 'pa66', { box: [mm(10), mm(9), W - mm(4)] }, { color: 0x2b2b2b }) }]); },
  expect: (q) => ({ bound: [mm(90), mm(79), mm(17.5 * q.n)], mass: q.g / 1000, tol: 0.01, says: 'its 90 mm height, 70 deep and its toggle, by its poles\' width' }),
  tests: [T(2)],
};
// ---- DIN rail ---------------------------------------------------------------------------------------------------
/** Top-hat rails (EN 60715): width, depth, the base's width, the steel's thickness (mm; the thickness typical). */
export const DIN_RAILS = rowsOf(['w', 'h', 'b', 't'] as const, [['TS35 × 7.5', 35, 7.5, 27, 1], ['TS35 × 15', 35, 15, 27, 1.5], ['TS15 × 5.5', 15, 5.5, 10.6, 0.7]]);
type Rail = { w: number; h: number; b: number; t: number };
// (its outline: the base on the panel at y = 0, its two webs up, its flanges out; about the channel's middle, so its own
// origin is in the channel and the rail offers a line along it)
const railPts = (r: Rail): [number, number][] => { const b = r.b / 2, w = r.w / 2, h = r.h, t = r.t, y0 = (t + h - t) / 2;
  return ([[-b, 0], [b, 0], [b, h - t], [w, h - t], [w, h], [b - t, h], [b - t, t], [-b + t, t], [-b + t, h], [-w, h], [-w, h - t], [-b, h - t]] as [number, number][]).map(([x, y]) => [mm(x), mm(y - y0)]); };
const DINRAIL: PartFamily<Rail> = {
  id: 'piece.dinrail', name: 'DIN rail', gloss: 'A top-hat DIN rail (EN 60715) TS35 × 7.5, TS35 × 15 or TS15 × 5.5, by its length', domains: EL, aisle: E('DIN rail and breakers'),
  says: 'A top-hat DIN rail (EN 60715), zinc-plated steel, its section along its length (z), its base down and its flanges up (unslotted; its slots not drawn). Breakers, housings and terminal blocks go onto its top (Onto a face, +y), each next one beside the last (Stack along z first); it offers a line along its channel (`<name>/axis`)',
  rows: DIN_RAILS, size: 'TS35 × 7.5', source: 'EN 60715 (widths and depths); its steel\'s thickness typical',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 200 }],
  cannot: (_r, _s, set) => above0(set, 'length', 'a length'),
  recipe: (r, size, set) => made(`${size} rail`, 'steel-low', { section: { pts: railPts(r), L: len(set) } }, { color: 0xb4b8bc }),
  expect: (r, _s, set) => ({ bound: [mm(r.w), mm(r.h), len(set)], mass: areaOf(railPts(r)) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its width and depth by its length; nominal mass, its section along it' }),
  tests: [T(1, { offers: ['TS35 × 7.5 rail/axis'] })],
};
/** Feed-through screw terminal blocks for a 35 mm rail by the largest wire they take (mm²): width, length across the
 *  rail and height (typical of makers' blocks, after Phoenix Contact's UT series; recalled). */
export const DIN_TERMINALS = rowsOf(['A', 'w', 'L', 'H'] as const, [['2.5', 2.5, 5.2, 42.5, 47.5], ['4', 4, 6.2, 42.5, 47.5], ['6', 6, 8.2, 42.5, 47.5], ['10', 10, 10.2, 46.9, 47.5], ['16', 16, 12.2, 56, 51], ['35', 35, 16.2, 61, 57]]);
type Term = { A: number; w: number; L: number; H: number };
const termPts = (q: Term): [number, number][] => ([[-q.L / 2, 0], [q.L / 2, 0], [q.L / 2, 0.45 * q.H], [0.3 * q.L, 0.45 * q.H], [0.3 * q.L, q.H], [-0.3 * q.L, q.H], [-0.3 * q.L, 0.45 * q.H], [-q.L / 2, 0.45 * q.H]] as [number, number][]).map(([x, y]) => [mm(x), mm(y)]);
const entryR = (A: number) => 0.75 * Math.sqrt((4 * A) / Math.PI);
const DINTERMINAL: PartFamily<Term> = {
  id: 'piece.dinterminal', name: 'DIN-rail terminal block', gloss: 'A feed-through screw terminal block for a 35 mm rail, by the wire it takes (2.5 to 35 mm², typical)', domains: EL, aisle: E('DIN rail and breakers'),
  says: 'A feed-through screw terminal block for a 35 mm rail (typical of makers\' blocks): its polyamide housing\'s stepped outline along the rail (z), a wire entry into each side (`<name>/wires`, from ±x, 1.5 × the wire\'s round) and a screw from the top over each (`<name>/screws`); its clamps and bar not drawn. Blocks stack side by side along z, then onto a rail (+y); a ferrule or a stripped wire goes into its entry (Through a line)',
  rows: DIN_TERMINALS, size: '2.5', source: 'typical (after Phoenix Contact\'s UT blocks, recalled)',
  recipe: (q, size) => { const n = `${size} mm² terminal`, h = mm(q.H), y = -h / 2 + 0.25 * h;
    return made(n, 'pa66', { section: { pts: termPts(q), L: mm(q.w) } }, { color: 0x8a8d90, patterns: [
      { name: 'screws', points: [[mm(-0.15 * q.L), 0], [mm(0.15 * q.L), 0]], hole: mm(0.3 * q.w), face: '+y', depth: 0.4 * h },
      { name: 'wires', points: [[y, 0]], hole: mm(entryR(q.A)), face: '+x', depth: mm(0.25 * q.L) }, { name: 'wires', points: [[y, 0]], hole: mm(entryR(q.A)), face: '-x', depth: mm(0.25 * q.L) }] }); },
  expect: (q) => ({ bound: [mm(q.L), mm(q.H), mm(q.w)], mass: (areaOf(termPts(q)) * mm(q.w) - 2 * disc(mm(0.6 * q.w)) * 0.4 * mm(q.H) - 2 * disc(mm(2 * entryR(q.A))) * mm(0.25 * q.L)) * rho('pa66'), tol: 0.01, massTol: 0.03, says: 'its length, height and width; nominal mass, its outline less its screw holes and wire entries' }),
  tests: [T(1, { offers: ['2.5 mm² terminal/screws', '2.5 mm² terminal/wires'] })],
};

// ==== cable glands =================================================================================================
type Gland = { d: number; sw: number; tl: number; hb: number; hc: number; cmin: number; cmax: number };
const GKEYS = ['d', 'sw', 'tl', 'hb', 'hc', 'cmin', 'cmax'] as const;
/** Metric cable glands (EN 62444, threads M × 1.5 by EN 60423): the thread's outside, the hex, the thread's length, the
 *  body's and the dome cap's heights, the cable range clamped (mm; all but the thread typical of polyamide glands). */
export const GLANDS_M = rowsOf(GKEYS, [['M12', 12, 15, 6.5, 5, 12, 3.5, 7], ['M16', 16, 19, 6.5, 6, 14, 4.5, 10], ['M20', 20, 24, 6.5, 7, 16, 7, 13], ['M25', 25, 29, 7, 8, 18, 9, 17], ['M32', 32, 36, 8, 9, 21, 11, 21], ['M40', 40, 45, 8, 10, 24, 19, 28], ['M50', 50, 55, 9, 11, 27, 27, 35], ['M63', 63, 68, 10, 12, 30, 34, 45]]);
/** PG cable glands: the thread's outside (DIN 40430), the rest as above (typical). */
export const GLANDS_PG = rowsOf(GKEYS, [['PG7', 12.5, 15, 5, 5, 12, 3, 6.5], ['PG9', 15.2, 19, 6, 6, 13, 4, 8], ['PG11', 18.6, 22, 6, 6, 14, 5, 10], ['PG13.5', 20.4, 24, 6.5, 7, 15, 6, 12], ['PG16', 22.5, 27, 6.5, 7, 16, 10, 14], ['PG21', 28.3, 33, 7, 8, 18, 13, 18], ['PG29', 37, 42, 8, 9, 21, 18, 25], ['PG36', 47, 53, 8, 10, 24, 22, 32], ['PG42', 54, 60, 9, 11, 27, 32, 38], ['PG48', 59.3, 65, 10, 12, 30, 37, 44]]);
const gBore = (q: Gland) => (q.d - 3) / 2;
/** A gland: its thread (a sleeve at the thread's outside), its hex body and its dome cap (its seal's bore at the largest
 *  cable it clamps), stacked up its axis. */
const glandOf = (q: Gland, size: string): Block => stack(`${size} cable gland`, 1, [
  { b: made(`${size} gland thread`, 'pa66', { tube: [mm(gBore(q)), mm(q.d) / 2, mm(q.tl)] }, { color: DARK }) },
  { b: made(`${size} gland body`, 'pa66', { hex: [mm(q.sw), mm(q.hb), mm(gBore(q))] }, { color: DARK }) },
  { b: made(`${size} gland cap`, 'pa66', { hex: [mm(q.sw), mm(q.hc), mm(q.cmax) / 2] }, { color: DARK }) }]);
const glandExpect = (q: Gland) => ({ bound: [mm(corners(q.sw)), mm(q.tl + q.hb + q.hc), mm(corners(q.sw))] as [number, number, number], mass: (annulus(mm(q.d), mm(2 * gBore(q))) * mm(q.tl) + (hexA(mm(q.sw)) - disc(mm(2 * gBore(q)))) * mm(q.hb) + (hexA(mm(q.sw)) - disc(mm(q.cmax))) * mm(q.hc)) * rho('pa66'), tol: 0.01, massTol: 0.02, says: 'across its hex\'s corners by its thread, body and cap; nominal mass, the three less their bores' });
const glandSays = (std: string) => `A polyamide cable gland (${std}; its hexes, heights and clamping range typical): its thread down (drawn at its outside, \`<size> gland thread/axis\`), its hex body and its dome cap (its seal open to the largest cable it takes; its seal and claws not drawn). Its thread goes down a hole in a box's wall (Through a line, or a locknut Over its thread from inside); a cable goes through its cap (Through a line on \`<size> gland cap/axis\`)`;
const GLANDM: PartFamily<Gland> = {
  id: 'piece.glandm', name: 'Cable gland (metric)', gloss: 'A metric polyamide cable gland M12 to M63 (EN 62444), its cable range in what it says', domains: EL, aisle: E('Cable glands'),
  says: glandSays('EN 62444, its thread M × 1.5 by EN 60423'), rows: GLANDS_M, size: 'M20', source: 'EN 60423 threads; the rest typical of makers\' polyamide glands',
  cannot: (q, size) => (q.cmax < 2 * gBore(q) ? null : `a ${size} gland's seal (${q.cmax} mm) within its thread's bore`),
  recipe: (q, size) => glandOf(q, size), expect: (q) => glandExpect(q),
  tests: [T(3, { offers: ['M20 gland body/axis', 'M20 gland cap/axis', 'M20 gland thread/axis'] })],
};
const GLANDPG: PartFamily<Gland> = {
  id: 'piece.glandpg', name: 'Cable gland (PG)', gloss: 'A PG-thread polyamide cable gland PG7 to PG48 (DIN 40430 threads)', domains: EL, aisle: E('Cable glands'),
  says: glandSays('its thread PG by DIN 40430'), rows: GLANDS_PG, size: 'PG9', source: 'DIN 40430 thread outsides (recalled); the rest typical of makers\' polyamide glands',
  recipe: (q, size) => glandOf(q, size), expect: (q) => glandExpect(q),
  tests: [T(3)],
};
/** Locknuts for glands' threads: the hex and its height (mm, typical of brass and polyamide locknuts). */
export const GLAND_NUTS = rowsOf(['d', 'sw', 'h'] as const, [['M12', 12, 15, 3], ['M16', 16, 19, 3], ['M20', 20, 24, 4], ['M25', 25, 30, 4], ['M32', 32, 36, 5], ['M40', 40, 46, 5], ['M50', 50, 55, 5], ['M63', 63, 68, 6],
  ['PG7', 12.5, 15, 3], ['PG9', 15.2, 19, 3], ['PG11', 18.6, 22, 3], ['PG13.5', 20.4, 24, 4], ['PG16', 22.5, 27, 4], ['PG21', 28.3, 33, 4], ['PG29', 37, 42, 5], ['PG36', 47, 53, 5], ['PG42', 54, 60, 5], ['PG48', 59.3, 65, 6]]);
const MATTER = { key: 'matter', label: 'Made of', type: 'choice' as const, default: 'polyamide', choices: ['polyamide', 'brass'] };
const matOf = (set: Record<string, unknown>) => (set.matter === 'brass' ? 'brass' : 'pa66');
const GLANDNUT: PartFamily<{ d: number; sw: number; h: number }> = {
  id: 'piece.glandnut', name: 'Gland locknut', gloss: 'A thin hex locknut for a cable gland\'s thread, metric or PG (typical)', domains: EL, aisle: E('Cable glands'),
  says: 'A thin hex locknut for a gland\'s thread (metric M × 1.5 or PG; typical hexes), its bore tapped at the thread\'s size: it goes over a gland\'s thread from inside the box (Over a shaft, by its thread)',
  rows: GLAND_NUTS, size: 'M20', source: 'typical of makers\' locknuts (threads EN 60423, DIN 40430)', settings: [MATTER],
  recipe: (q, size, set) => made(`${size} locknut`, matOf(set), { hex: [mm(q.sw), mm(q.h), mm(q.d) / 2] }, { color: set.matter === 'brass' ? BRASS : DARK, tapped: true }),
  expect: (q, _s, set) => ({ bound: [mm(corners(q.sw)), mm(q.h), mm(corners(q.sw))], mass: (hexA(mm(q.sw)) - disc(mm(q.d))) * mm(q.h) * rho(matOf(set)), tol: 0.01, massTol: 0.02, says: 'across corners by its height; nominal mass, the hex less its bore' }),
  tests: [T(1, { offers: ['M20 locknut/axis'] })],
};
/** Blanking plugs for glands' holes: the thread, its length, the head's diameter and height (mm, typical). */
export const GLAND_PLUGS = rowsOf(['d', 'tl', 'D', 'k'] as const, [['M12', 12, 6.5, 15, 3], ['M16', 16, 6.5, 19, 3], ['M20', 20, 6.5, 24, 3.5], ['M25', 25, 7, 29, 4], ['M32', 32, 8, 36, 4], ['M40', 40, 8, 45, 5], ['M50', 50, 9, 55, 5], ['M63', 63, 10, 68, 6],
  ['PG7', 12.5, 5, 15, 3], ['PG9', 15.2, 6, 19, 3], ['PG11', 18.6, 6, 22, 3], ['PG13.5', 20.4, 6.5, 24, 3.5], ['PG16', 22.5, 6.5, 27, 3.5], ['PG21', 28.3, 7, 33, 4], ['PG29', 37, 8, 42, 4], ['PG36', 47, 8, 53, 5], ['PG42', 54, 9, 60, 5], ['PG48', 59.3, 10, 65, 6]]);
const GLANDPLUG: PartFamily<{ d: number; tl: number; D: number; k: number }> = {
  id: 'piece.glandplug', name: 'Blanking plug', gloss: 'A polyamide blanking plug that closes an unused gland hole, metric or PG (typical)', domains: EL, aisle: E('Cable glands'),
  says: 'A polyamide blanking plug (typical): its thread (drawn at its outside) under its round head (its slot not drawn). Its thread goes down a box\'s gland hole (Through a line), a locknut over it from inside',
  rows: GLAND_PLUGS, size: 'M20', source: 'typical of makers\' blanking plugs',
  recipe: (q, size) => stack(`${size} blanking plug`, 1, [{ b: made(`${size} plug thread`, 'pa66', { cyl: [mm(q.d) / 2, mm(q.tl)] }, { color: DARK }) }, { b: made(`${size} plug head`, 'pa66', { cyl: [mm(q.D) / 2, mm(q.k)] }, { color: DARK }) }]),
  expect: (q) => ({ bound: [mm(q.D), mm(q.tl + q.k), mm(q.D)], mass: (disc(mm(q.d)) * mm(q.tl) + disc(mm(q.D)) * mm(q.k)) * rho('pa66'), tol: 0.01, massTol: 0.02, says: 'its head by thread and head; nominal mass, both solid' }),
  tests: [T(2)],
};
/** Thread reducers: the male thread (outside), the female thread it takes (its bore), the hex and heights (mm, typical). */
export const GLAND_REDUCERS = rowsOf(['D', 'd', 'tl', 'sw', 'h'] as const, [['M16 to M12', 16, 12, 6.5, 19, 5], ['M20 to M16', 20, 16, 6.5, 24, 6], ['M25 to M20', 25, 20, 7, 29, 6], ['M32 to M25', 32, 25, 8, 36, 7], ['M40 to M32', 40, 32, 8, 45, 7], ['M50 to M40', 50, 40, 9, 55, 8], ['M63 to M50', 63, 50, 10, 68, 9]]);
const GLANDREDUCER: PartFamily<{ D: number; d: number; tl: number; sw: number; h: number }> = {
  id: 'piece.glandreducer', name: 'Thread reducer', gloss: 'A nickel-plated brass thread reducer, metric M × 1.5, to fit a smaller gland in a larger hole (typical)', domains: EL, aisle: E('Cable glands'),
  says: 'A brass thread reducer (typical): its male thread (drawn at its outside) down a box\'s hole and its hex above, bored and tapped to the smaller thread a gland\'s thread goes into (`<size> reducer hex/axis`, by its thread)',
  rows: GLAND_REDUCERS, size: 'M25 to M20', source: 'typical of makers\' reducers (threads EN 60423)',
  recipe: (q, size) => stack(`${size} reducer`, 1, [{ b: made(`${size} reducer thread`, 'brass', { tube: [mm(q.d) / 2, mm(q.D) / 2, mm(q.tl)] }, { color: BRASS, tapped: true }) }, { b: made(`${size} reducer hex`, 'brass', { hex: [mm(q.sw), mm(q.h), mm(q.d) / 2] }, { color: BRASS, tapped: true }) }]),
  expect: (q) => ({ bound: [mm(corners(q.sw)), mm(q.tl + q.h), mm(corners(q.sw))], mass: (annulus(mm(q.D), mm(q.d)) * mm(q.tl) + (hexA(mm(q.sw)) - disc(mm(q.d))) * mm(q.h)) * rho('brass'), tol: 0.01, massTol: 0.02, says: 'across corners by thread and hex; nominal mass, both less the bore' }),
  tests: [T(2)],
};

// ==== conduit (EN 61386) ===========================================================================================
/** Rigid conduit by its outside (EN 61386-21's sizes) and class: its wall (mm; PVC medium and heavy, galvanised steel
 *  heavy gauge, typical of makers' conduit). */
export const CONDUIT: Record<string, { od: number; t: number; mat: string }> = Object.fromEntries([
  ...([[16, 1.1, 1.5], [20, 1.2, 1.6], [25, 1.4, 1.8], [32, 1.6, 2.1], [40, 1.9, 2.5], [50, 2.3, 3.0], [63, 2.6, 3.5]] as const).flatMap(([od, m, h]) => [[`${od} medium`, { od, t: m, mat: 'pvc' }], [`${od} heavy`, { od, t: h, mat: 'pvc' }]]),
  ...([[16, 1.4], [20, 1.6], [25, 1.6], [32, 1.6]] as const).map(([od, t]) => [`${od} steel`, { od, t, mat: 'steel-low' }]),
]);
const CONDUITPIPE: PartFamily<{ od: number; t: number; mat: string }> = {
  id: 'piece.conduit', name: 'Rigid conduit', gloss: 'A length of rigid conduit, PVC (medium or heavy) or steel, 16 to 63 mm (EN 61386-21)', domains: [...EL, 'structural'], aisle: E('Conduit'),
  says: 'A straight of rigid conduit by its outside (EN 61386-21\'s sizes) and class (walls typical): a tube so long, offering its axis: a coupler or a bend\'s socket goes over its end (Over a shaft), cable along it (Through a line), saddles round it',
  rows: CONDUIT, size: '20 heavy', source: 'EN 61386-21 sizes; walls typical of makers\' conduit',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => made(`${size} conduit`, q.mat, { tube: [mm(q.od / 2 - q.t), mm(q.od) / 2, len(set)] }, { color: q.mat === 'pvc' ? 0x8e9196 : 0xa9acb0 }),
  expect: (q, _s, set) => ({ bound: [mm(q.od), len(set), mm(q.od)], mass: annulus(mm(q.od), mm(q.od - 2 * q.t)) * len(set) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [T(1, { offers: ['20 heavy conduit/axis'] })],
};
/** Corrugated flexible conduit (EN 61386-22) by its outside: its bore, its pitch and wall (mm, typical). */
export const FLEX_CONDUIT = rowsOf(['od', 'id', 'p', 't'] as const, [['16', 16, 10.7, 3.6, 0.5], ['20', 20, 14.1, 4.2, 0.5], ['25', 25, 18.3, 4.9, 0.6], ['32', 32, 24.3, 6, 0.7], ['40', 40, 31.2, 7, 0.8], ['50', 50, 39.6, 8.5, 0.9]]);
type Flex = { od: number; id: number; p: number; t: number };
// (its wall's outline turned about y: its crest and root in turn, a pitch each, the same less its wall inside)
const flexPts = (q: Flex, L: number): [number, number][] => { const n = Math.max(1, Math.round(L / q.p)), Rc = q.od / 2, Rr = q.id / 2 + q.t, out: [number, number][] = [], inn: [number, number][] = [];
  for (let i = 0; i <= 2 * n; i++) { const r = i % 2 ? Rc : Rr, y = (i * q.p) / 2; out.push([mm(r), mm(y)]); inn.push([mm(r - q.t), mm(y)]); }
  return [...out, ...inn.reverse()]; };
const FLEXCONDUIT: PartFamily<Flex> = {
  id: 'piece.flexconduit', name: 'Flexible conduit', gloss: 'A length of corrugated flexible conduit, 16 to 50 mm (EN 61386-22, typical walls)', domains: EL, aisle: E('Conduit'),
  says: 'Corrugated flexible conduit by its outside (EN 61386-22; bore, pitch and wall typical): its wall turned about its axis, crest and root a pitch apart (its length rounded to whole pitches), straight as laid; it offers its axis, cable along it (Through a line). Bent, a run of it is a Run of tube',
  rows: FLEX_CONDUIT, size: '20', source: 'EN 61386-22 sizes; bores, pitches and walls typical',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 150 }],
  cannot: (q, _s, set) => above0(set, 'length', 'a length') ?? (Number(set.length) >= q.p ? null : `at least a pitch (${q.p} mm) long`),
  recipe: (q, size, set) => made(`${size} flexible conduit`, 'pvc', { lathe: { pts: flexPts(q, Number(set.length)) } }, { color: 0x3c3f44 }),
  expect: (q, _s, set) => { const n = Math.max(1, Math.round(Number(set.length) / q.p)); return { bound: [mm(q.od), mm(n * q.p), mm(q.od)], mass: turnedVol(flexPts(q, Number(set.length))) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its crest by its whole pitches; nominal mass, its corrugated wall turned' }; },
  tests: [T(1, { offers: ['20 flexible conduit/axis'] })],
};
/** Couplers for rigid conduit by its outside: the socket's wall and length (mm, typical). */
export const CONDUIT_COUPLERS = rowsOf(['od', 'w', 'L'] as const, [['16', 16, 1.5, 40], ['20', 20, 1.6, 48], ['25', 25, 1.8, 58], ['32', 32, 2.1, 72], ['40', 40, 2.5, 88], ['50', 50, 3, 108], ['63', 63, 3.5, 134]]);
const COUPLER: PartFamily<{ od: number; w: number; L: number }> = {
  id: 'piece.conduitcoupler', name: 'Conduit coupler', gloss: 'A PVC socket coupler joining two lengths of rigid conduit, 16 to 63 mm (typical)', domains: EL, aisle: E('Conduit'),
  says: 'A PVC socket coupler for rigid conduit (typical): a sleeve its bore the conduit\'s outside, so long; it goes over the end of one length (Over a shaft) and the next pushes into it',
  rows: CONDUIT_COUPLERS, size: '20', source: 'typical of makers\' couplers',
  recipe: (q, size) => made(`${size} coupler`, 'pvc', { tube: [mm(q.od) / 2, mm(q.od / 2 + q.w), mm(q.L)] }, { color: 0x8e9196 }),
  expect: (q) => ({ bound: [mm(q.od + 2 * q.w), mm(q.L), mm(q.od + 2 * q.w)], mass: annulus(mm(q.od + 2 * q.w), mm(q.od)) * mm(q.L) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the sleeve' }),
  tests: [T(1)],
};
/** Normal bends (90°) for rigid conduit by its outside: their bend radius, wall and sockets (mm, typical). */
export const CONDUIT_BENDS = rowsOf(['od', 'R', 't', 'w', 'Ls'] as const, [['16', 16, 48, 1.5, 1.5, 20], ['20', 20, 60, 1.6, 1.6, 24], ['25', 25, 75, 1.8, 1.8, 29], ['32', 32, 96, 2.1, 2.1, 36], ['40', 40, 120, 2.5, 2.5, 44], ['50', 50, 150, 3, 3, 54]]);
type Bend = { od: number; R: number; t: number; w: number; Ls: number };
const BENDC: PartFamily<Bend> = {
  id: 'piece.conduitbend', name: 'Conduit bend', gloss: 'A PVC normal bend (90°) for rigid conduit, a socket at each end, 16 to 50 mm (typical)', domains: EL, aisle: E('Conduit'),
  says: 'A PVC normal bend for rigid conduit (its radius three times the conduit, typical): a socket, a quarter bend of conduit\'s wall, a socket, laid as a Run of tube; each socket offers its axis (`<size> bend socket in/axis`, `… out/axis`), the conduit pushed into it (Through a line)',
  rows: CONDUIT_BENDS, size: '20', source: 'typical of makers\' normal bends',
  recipe: (q, size) => { const s = (k: string) => ({ name: `${size} bend socket ${k}`, mat: 'pvc', ro: mm(q.od / 2 + q.w), ri: mm(q.od) / 2, straight: mm(q.Ls), color: 0x8e9196 });
    return run(`${size} conduit bend`, [s('in'), { name: `${size} bend`, mat: 'pvc', ro: mm(q.od) / 2, ri: mm(q.od / 2 - q.t), bend: 90, R: mm(q.R), color: 0x8e9196 }, s('out')]); },
  expect: (q) => { const reach = mm(q.R + q.Ls + q.od / 2 + q.w); return { bound: [reach, reach, mm(q.od + 2 * q.w)], mass: (2 * annulus(mm(q.od + 2 * q.w), mm(q.od)) * mm(q.Ls) + annulus(mm(q.od), mm(q.od - 2 * q.t)) * mm(q.R) * Math.PI / 2) * rho('pvc'), tol: 0.02, massTol: 0.02, says: 'its reach each way (radius, socket and socket\'s outside); nominal mass, two sockets and the quarter bend' }; },
  tests: [T(3)],
};
/** Clip saddles for conduit by its outside: the clip's wall, its width and its foot (mm, typical). */
export const CONDUIT_SADDLES = rowsOf(['od', 't', 'L', 'f'] as const, [['16', 16, 2, 14, 3], ['20', 20, 2, 16, 3], ['25', 25, 2.2, 18, 3.5], ['32', 32, 2.5, 20, 3.5], ['40', 40, 2.8, 24, 4], ['50', 50, 3, 28, 4]]);
type Sad = { od: number; t: number; L: number; f: number };
// (an open ring round the conduit, its mouth the top quarter, about the conduit's centre: its own origin, so the clip
// offers a line along its length through it)
// (its bore's chords no nearer the centre than the conduit's outside and 0.2 mm, typical clearance)
const clipPts = (q: Sad): [number, number][] => { const K = 24, ri = (q.od / 2 + 0.2) / Math.cos(((270 / K) * Math.PI) / 360), ro = ri + q.t, a = (k: number) => ((45 - (k * 270) / K) * Math.PI) / 180;
  const o = Array.from({ length: K + 1 }, (_, k) => [mm(ro * Math.cos(a(k))), mm(ro * Math.sin(a(k)))] as [number, number]), i = Array.from({ length: K + 1 }, (_, k) => [mm(ri * Math.cos(a(K - k))), mm(ri * Math.sin(a(K - k)))] as [number, number]);
  return [...o, ...i]; };
const SADDLE: PartFamily<Sad> = {
  id: 'piece.conduitsaddle', name: 'Conduit clip', gloss: 'A PVC clip saddle that holds rigid conduit to a wall, 16 to 50 mm (typical)', domains: EL, aisle: E('Conduit'),
  says: 'A PVC clip saddle (typical): its open ring (its mouth the top quarter) along the conduit\'s line (`<size> clip/axis`, along z) on its foot, a screw hole through the foot (`<size> clip foot/screw`). Conduit goes along its ring (Through a line); a screw down its foot into a wall plug',
  rows: CONDUIT_SADDLES, size: '20', source: 'typical of makers\' clip saddles',
  recipe: (q, size) => stack(`${size} conduit clip`, 1, [{ b: made(`${size} clip foot`, 'pvc', { box: [mm(q.od + 2 * q.t + 8), mm(q.f), mm(q.L)] }, { color: 0x8e9196, pattern: { name: 'screw', points: [[0, 0]], hole: mm(2.25) } }) },
    { b: made(`${size} clip`, 'pvc', { section: { pts: clipPts(q), L: mm(q.L) } }, { color: 0x8e9196 }) }]),
  expect: (q) => { const p = clipPts(q); return { bound: [mm(q.od + 2 * q.t + 8), mm(q.f) + span(p, 1), mm(q.L)], mass: (areaOf(p) * mm(q.L) + (mm(q.od + 2 * q.t + 8) * mm(q.L) - disc(mm(4.5))) * mm(q.f)) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its foot\'s width, foot and ring high, its width; nominal mass, the ring\'s section along it and the foot less its hole' }; },
  tests: [T(2, { offers: ['20 clip foot/screw', '20 clip/axis'] })],
};
/** Circular conduit boxes (BS 4662's round box, typical sizes): for conduit of 20 or 25 mm, by its entries. */
const BOX_WAYS: Record<string, readonly ('+x' | '-x' | '+z' | '-z')[]> = { terminal: ['+x'], through: ['+x', '-x'], angle: ['+x', '+z'], tee: ['+x', '-x', '+z'], 'four-way': ['+x', '-x', '+z', '-z'] };
export const CONDUIT_BOXES: Record<string, { od: number; way: string }> = Object.fromEntries([20, 25].flatMap((od) => Object.keys(BOX_WAYS).map((w) => [`${od} ${w}`, { od, way: w }])));
const BOXD = 70, BOXH = 40, BOXT = 2.5, SPOUT = 18;
const CONDUITBOX: PartFamily<{ od: number; way: string }> = {
  id: 'piece.conduitbox', name: 'Circular conduit box', gloss: 'A round PVC conduit box with spouts for 20 or 25 mm conduit: terminal, through, angle, tee or four-way (typical)', domains: EL, aisle: E('Conduit'),
  says: 'A round PVC conduit box (Ø70 × 40, typical of BS 4662\'s round boxes): its cup open at the top (`<size> box/cavity`, a room for connectors) and a socket spout on each side its form has, each offering its axis for the conduit to go into (Through a line); its fixing lugs not drawn, its spouts\' entries into it not cut (drawn closed)',
  rows: CONDUIT_BOXES, size: '20 through', source: 'typical (after BS 4662\'s round box)',
  recipe: (q, size) => { const name = `${size} box`, spout = (f: string) => turn(made(`${size} spout ${f}`, 'pvc', { tube: [mm(q.od) / 2, mm(q.od / 2 + 2), mm(SPOUT)] }, { color: 0x8e9196 }), f.endsWith('x') ? 2 : 0, 90);
    let b: Block = made(name, 'pvc', { cup: [mm(BOXD) / 2, mm(BOXH), mm(BOXT), mm(BOXT)] }, { color: 0x8e9196 });
    for (const f of BOX_WAYS[q.way]!) b = onto(b, f, spout(f), 'touch', `${name}/axis`); return b; },
  expect: (q) => { const ways = BOX_WAYS[q.way]!, r = BOXD / 2, s = q.od / 2 + 2, x = (ways.includes('+x') ? r + SPOUT : r) + (ways.includes('-x') ? r + SPOUT : r), z = (ways.includes('+z') ? r + SPOUT : r) + (ways.includes('-z') ? r + SPOUT : r);
    return { bound: [mm(x), mm(BOXH), mm(z)], mass: ((disc(mm(BOXD)) * mm(BOXH) - disc(mm(BOXD - 2 * BOXT)) * mm(BOXH - BOXT)) + ways.length * annulus(mm(2 * s), mm(q.od)) * mm(SPOUT)) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its reach each way with its spouts; nominal mass, the cup and its spouts' }; },
  tests: [T(3, { offers: ['20 through box/axis', '20 through box/cavity', '20 through spout +x/axis', '20 through spout -x/axis'] })],
};

// ==== ferrules and crimp terminals ===================================================================================
/** Insulated wire ferrules (DIN 46228-4) by the wire's section (mm²): the pin's bore, wall and length, the whole length,
 *  the collar's outside, its colour by DIN's code (mm; typical of makers' tables of the standard, recalled). */
export const FERRULES = rowsOf(['A', 'd1', 's', 'L2', 'L1', 'd2', 'color'] as const, [
  ['0.5', 0.5, 1.0, 0.15, 8, 14, 2.6, 0xf2f2f2], ['0.75', 0.75, 1.2, 0.15, 8, 14, 2.8, 0x9a9a9a], ['1', 1, 1.4, 0.15, 8, 14, 3.0, 0xc8282d], ['1.5', 1.5, 1.7, 0.15, 8, 14, 3.5, 0x1c1c1c],
  ['2.5', 2.5, 2.2, 0.15, 8, 14, 4.2, 0x2b5fb3], ['4', 4, 2.8, 0.2, 10, 17, 4.8, 0x9a9a9a], ['6', 6, 3.5, 0.2, 12, 20, 6.3, 0xe8c41c], ['10', 10, 4.5, 0.2, 12, 22, 7.6, 0xc8282d],
  ['16', 16, 5.8, 0.2, 12, 22, 8.8, 0x2b5fb3], ['25', 25, 7.3, 0.25, 16, 28, 11.2, 0xe8c41c], ['35', 35, 8.3, 0.25, 16, 30, 12.7, 0xc8282d], ['50', 50, 10.3, 0.3, 20, 36, 15.3, 0x2b5fb3]]);
type Ferrule = { A: number; d1: number; s: number; L2: number; L1: number; d2: number; color: number };
const collarBore = (q: Ferrule) => q.d2 / 2 - 0.45;
const FERRULE: PartFamily<Ferrule> = {
  id: 'piece.ferrule', name: 'Wire ferrule (insulated)', gloss: 'An insulated wire end ferrule (DIN 46228-4) by the wire\'s section, 0.5 to 50 mm², coloured by DIN\'s code', domains: EL, aisle: E('Ferrules'),
  says: 'An insulated wire end ferrule (DIN 46228-4\'s sizes and colours, typical): its tinned copper pin and its polypropylene collar above it, both round its axis (`<size> mm² ferrule pin/axis`): the stripped wire goes down its collar into its pin (Through a line) and the pin into a terminal\'s entry (crimped, the crimp not drawn)',
  rows: FERRULES, size: '1.5', source: 'DIN 46228-4 (typical of makers\' tables of it, recalled)',
  recipe: (q, size) => stack(`${size} mm² ferrule`, 1, [{ b: made(`${size} mm² ferrule pin`, 'copper', { tube: [mm(q.d1) / 2, mm(q.d1 / 2 + q.s), mm(q.L2)] }, { color: 0xc0c4c8 }) }, { b: made(`${size} mm² ferrule collar`, 'pp', { tube: [mm(collarBore(q)), mm(q.d2) / 2, mm(q.L1 - q.L2)] }, { color: q.color }) }]),
  cannot: (q, size) => (collarBore(q) > q.d1 / 2 + q.s ? null : `a ${size} mm² collar's bore wider than its pin`),
  expect: (q) => ({ bound: [mm(q.d2), mm(q.L1), mm(q.d2)], mass: annulus(mm(q.d1 + 2 * q.s), mm(q.d1)) * mm(q.L2) * rho('copper') + annulus(mm(q.d2), mm(2 * collarBore(q))) * mm(q.L1 - q.L2) * rho('pp'), tol: 0.01, massTol: 0.02, says: 'its collar across by its whole length; nominal mass, its pin and collar' }),
  tests: [T(2, { offers: ['1.5 mm² ferrule collar/axis', '1.5 mm² ferrule pin/axis'] })],
};
/** Bare wire ferrules (DIN 46228-1) by section: bore, wall, length (mm; typical of makers' tables of it, recalled). */
export const FERRULES_BARE = rowsOf(['A', 'd1', 's', 'L'] as const, [['0.5', 0.5, 1.0, 0.15, 7], ['0.75', 0.75, 1.2, 0.15, 7], ['1', 1, 1.4, 0.15, 7], ['1.5', 1.5, 1.7, 0.15, 7], ['2.5', 2.5, 2.2, 0.15, 7], ['4', 4, 2.8, 0.2, 10], ['6', 6, 3.5, 0.2, 10], ['10', 10, 4.5, 0.2, 12], ['16', 16, 5.8, 0.2, 12], ['25', 25, 7.3, 0.25, 16], ['35', 35, 8.3, 0.25, 16], ['50', 50, 10.3, 0.3, 20]]);
const FERRULEBARE: PartFamily<{ A: number; d1: number; s: number; L: number }> = {
  id: 'piece.ferrulebare', name: 'Wire ferrule (bare)', gloss: 'A bare tinned copper wire end ferrule (DIN 46228-1) by the wire\'s section, 0.5 to 50 mm²', domains: EL, aisle: E('Ferrules'),
  says: 'A bare wire end ferrule (DIN 46228-1, typical): a tinned copper sleeve (its flared mouth not drawn) round its axis: the stripped wire goes up it (Through a line), the ferrule into a terminal\'s entry',
  rows: FERRULES_BARE, size: '1.5', source: 'DIN 46228-1 (typical of makers\' tables of it, recalled)',
  recipe: (q, size) => made(`${size} mm² bare ferrule`, 'copper', { tube: [mm(q.d1) / 2, mm(q.d1 / 2 + q.s), mm(q.L)] }, { color: 0xc0c4c8 }),
  expect: (q) => ({ bound: [mm(q.d1 + 2 * q.s), mm(q.L), mm(q.d1 + 2 * q.s)], mass: annulus(mm(q.d1 + 2 * q.s), mm(q.d1)) * mm(q.L) * rho('copper'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the sleeve' }),
  tests: [T(1)],
};
/** Insulated crimp terminals' bands by the wire they take (the colour code makers share, typical): the barrel's bore,
 *  wall, length; the sleeve's outside; the tongue's thickness (mm). */
const BANDS: Record<string, { id: number; w: number; L: number; so: number; t: number; color: number; range: string }> = {
  red: { id: 1.7, w: 0.4, L: 8, so: 4.2, t: 0.8, color: 0xc8282d, range: '0.5 to 1.5 mm²' }, blue: { id: 2.3, w: 0.4, L: 8, so: 4.7, t: 0.8, color: 0x2b5fb3, range: '1.5 to 2.5 mm²' }, yellow: { id: 3.4, w: 0.5, L: 10, so: 6.6, t: 1.0, color: 0xe8c41c, range: '4 to 6 mm²' },
};
/** A crimp terminal's barrel and its nylon sleeve over it, laid along x (the wire comes in from −x). */
const barrelOf = (band: string, name: string): Block => { const b = BANDS[band]!, barrel = made(`${name} barrel`, 'copper', { tube: [mm(b.id) / 2, mm(b.id / 2 + b.w), mm(b.L)] }, { color: CU });
  return turn(over(barrel, `${name} barrel/axis`, made(`${name} sleeve`, 'nylon', { tube: [mm(b.id / 2 + b.w), mm(b.so) / 2, mm(b.L)] }, { color: b.color }), 'mid', 'touch'), 2, 90); };
const barrelMass = (band: string) => { const b = BANDS[band]!; return annulus(mm(b.id + 2 * b.w), mm(b.id)) * mm(b.L) * rho('copper') + annulus(mm(b.so), mm(b.id + 2 * b.w)) * mm(b.L) * rho('nylon'); };
/** Ring terminals by band and stud: the ring's outside and hole (mm, typical). */
const RING_STUD: Record<string, { D: number; hole: number }> = { M3: { D: 5.5, hole: 3.2 }, M4: { D: 7.2, hole: 4.3 }, M5: { D: 9.5, hole: 5.3 }, M6: { D: 11, hole: 6.4 }, M8: { D: 13.6, hole: 8.4 }, M10: { D: 17, hole: 10.5 }, M12: { D: 19, hole: 13 } };
export const RING_TERMINALS: Record<string, { band: string; stud: string }> = Object.fromEntries((([['red', ['M3', 'M4', 'M5', 'M6', 'M8']], ['blue', ['M3', 'M4', 'M5', 'M6', 'M8', 'M10']], ['yellow', ['M4', 'M5', 'M6', 'M8', 'M10', 'M12']]] as const)).flatMap(([band, studs]) => studs.map((stud) => [`${band} ${stud}`, { band, stud }])));
const TONGUE = 3;
const RINGTERMINAL: PartFamily<{ band: string; stud: string }> = {
  id: 'piece.ringterminal', name: 'Ring terminal', gloss: 'An insulated crimp ring terminal by its band (red, blue, yellow: the wire it takes) and the stud it goes on (typical)', domains: EL, aisle: E('Crimp terminals'),
  says: 'An insulated crimp ring terminal (typical): its copper barrel in its nylon sleeve (red 0.5 to 1.5 mm², blue 1.5 to 2.5, yellow 4 to 6), a short tongue and its flat ring, laid along x. Its ring offers its axis (`<size> ring/axis`): it goes over a stud or a screw (Over a shaft); the wire into its barrel (crimped, the crimp not drawn)',
  rows: RING_TERMINALS, size: 'red M4', source: 'typical of makers\' insulated ring terminals',
  recipe: (q, size) => { const b = BANDS[q.band]!, r = RING_STUD[q.stud]!;
    return stack(`${size} ring terminal`, 0, [{ b: barrelOf(q.band, size) }, { b: made(`${size} tongue`, 'copper', { box: [mm(TONGUE), mm(b.t), mm(0.6 * r.D)] }, { color: CU }) }, { b: made(`${size} ring`, 'copper', { tube: [mm(r.hole) / 2, mm(r.D) / 2, mm(b.t)] }, { color: CU }) }]); },
  expect: (q) => { const b = BANDS[q.band]!, r = RING_STUD[q.stud]!; return { bound: [mm(b.L + TONGUE + r.D), mm(b.so), mm(Math.max(b.so, r.D))], mass: barrelMass(q.band) + (mm(TONGUE) * mm(0.6 * r.D) + annulus(mm(r.D), mm(r.hole))) * mm(b.t) * rho('copper'), tol: 0.01, massTol: 0.02, says: 'barrel, tongue and ring along it, its sleeve and ring across; nominal mass, the copper and the sleeve' }; },
  tests: [T(4, { offers: ['red M4 barrel/axis', 'red M4 ring/axis', 'red M4 sleeve/axis'] })],
};
/** Fork (spade) terminals by band and stud: the fork's width and its slot (mm, typical). */
export const FORK_TERMINALS: Record<string, { band: string; W: number; slot: number }> = Object.fromEntries(([['red M3', 5.5, 3.3], ['red M4', 6.4, 4.3], ['red M5', 8, 5.3], ['blue M3', 5.5, 3.3], ['blue M4', 6.4, 4.3], ['blue M5', 8, 5.3], ['blue M6', 9, 6.4], ['yellow M4', 7.2, 4.3], ['yellow M5', 9, 5.3], ['yellow M6', 11, 6.4], ['yellow M8', 13, 8.4]] as const)
  .map(([k, W, slot]) => [k, { band: k.split(' ')[0]!, W, slot }]));
const forkPts = (W: number, s: number): [number, number][] => { const L = W + 3, dep = 0.6 * W; return ([[0, -W / 2], [L, -W / 2], [L, -s / 2], [L - dep, -s / 2], [L - dep, s / 2], [L, s / 2], [L, W / 2], [0, W / 2]] as [number, number][]).map(([x, y]) => [mm(x), mm(y)]); };
const FORKTERMINAL: PartFamily<{ band: string; W: number; slot: number }> = {
  id: 'piece.forkterminal', name: 'Fork terminal', gloss: 'An insulated crimp fork (spade) terminal by its band and the stud its slot takes (typical)', domains: EL, aisle: E('Crimp terminals'),
  says: 'An insulated crimp fork terminal (typical): its barrel in its sleeve (red, blue, yellow by the wire) and its flat fork, its slot open away from the barrel, laid along x. It slides under a screw\'s head on a terminal without the screw coming out',
  rows: FORK_TERMINALS, size: 'blue M4', source: 'typical of makers\' insulated fork terminals',
  recipe: (q, size) => { const b = BANDS[q.band]!; return stack(`${size} fork terminal`, 0, [{ b: barrelOf(q.band, size) }, { b: turn(made(`${size} fork`, 'copper', { section: { pts: forkPts(q.W, q.slot), L: mm(b.t) } }, { color: CU }), 0, 90) }]); },
  expect: (q) => { const b = BANDS[q.band]!; return { bound: [mm(b.L + q.W + 3), mm(b.so), mm(Math.max(b.so, q.W))], mass: barrelMass(q.band) + areaOf(forkPts(q.W, q.slot)) * mm(b.t) * rho('copper'), tol: 0.01, massTol: 0.02, says: 'barrel and fork along it; nominal mass, the copper and the sleeve' }; },
  tests: [T(3)],
};
/** Push-on tabs (IEC 61210): width × thickness; their length and detent hole typical (mm). */
export const TABS = rowsOf(['w', 't', 'L', 'hole'] as const, [['2.8 × 0.5', 2.8, 0.5, 7, 1.3], ['4.8 × 0.5', 4.8, 0.5, 7.8, 1.4], ['4.8 × 0.8', 4.8, 0.8, 7.8, 1.4], ['6.3 × 0.8', 6.3, 0.8, 8, 1.8], ['9.5 × 1.2', 9.5, 1.2, 12, 2.3]]);
const FASTONTAB: PartFamily<{ w: number; t: number; L: number; hole: number }> = {
  id: 'piece.fastontab', name: 'Push-on tab', gloss: 'A male push-on (Faston) tab by its width and thickness (IEC 61210)', domains: EL, aisle: E('Crimp terminals'),
  says: 'A male push-on tab (IEC 61210\'s widths and thicknesses; length and detent hole typical): a tinned brass blade lying flat, its length along z, its detent hole through it (`<size> tab/detent`). A push-on receptacle goes along it (Through a line on its slot)',
  rows: TABS, size: '6.3 × 0.8', source: 'IEC 61210 (widths, thicknesses); lengths and holes typical',
  recipe: (q, size) => made(`${size} tab`, 'brass', { box: [mm(q.w), mm(q.t), mm(q.L)] }, { color: 0xc0c4c8, pattern: { name: 'detent', points: [[0, mm(q.L / 2 - 2.5)]], hole: mm(q.hole) / 2 } }),
  expect: (q) => ({ bound: [mm(q.w), mm(q.t), mm(q.L)], mass: (mm(q.w) * mm(q.L) - disc(mm(q.hole))) * mm(q.t) * rho('brass'), tol: 0.01, massTol: 0.02, says: 'its width, thickness and length; nominal mass, the blade less its hole' }),
  tests: [T(1, { offers: ['6.3 × 0.8 tab/detent'] })],
};
/** Insulated push-on receptacles by band and the tab they take (IEC 61210 tabs); their contact's length typical. */
export const RECEPTACLES: Record<string, { band: string; tab: string; Lr: number }> = Object.fromEntries(([['red 2.8', 7], ['red 4.8', 8], ['red 6.3', 9], ['blue 4.8', 8], ['blue 6.3', 9], ['yellow 6.3', 9], ['yellow 9.5', 12]] as const)
  .map(([k, Lr]) => { const [band, w] = k.split(' ') as [string, string]; return [k, { band, tab: Object.keys(TABS).find((t) => t.startsWith(`${w} `) && (w !== '4.8' || t.endsWith('0.8')))!, Lr }]; }));
// (the receptacle's rolled contact as a frame round the tab's slot, about the slot's middle: its own origin, so it offers
// the slot's line along it)
const recPts = (tab: { w: number; t: number }): [number, number][] => withHole(rect(mm(tab.w + 1.6), mm(tab.t + 2.2)), rect(mm(tab.w + 0.1), mm(tab.t + 0.2)));
const RECEPTACLE: PartFamily<{ band: string; tab: string; Lr: number }> = {
  id: 'piece.faston', name: 'Push-on receptacle', gloss: 'An insulated female push-on (Faston) receptacle by its band and the tab it takes (IEC 61210)', domains: EL, aisle: E('Crimp terminals'),
  says: 'An insulated push-on receptacle (IEC 61210\'s tabs; typical sizes): its barrel in its sleeve (red, blue, yellow by the wire) and its contact, a frame round the tab\'s slot laid along x (`<size> contact/axis`), the slot\'s rolls and its insulating cover not drawn. A tab goes into its slot (Through a line)',
  rows: RECEPTACLES, size: 'blue 6.3', source: 'IEC 61210 tabs; the receptacles typical',
  recipe: (q, size) => stack(`${size} receptacle`, 0, [{ b: barrelOf(q.band, size) }, { b: turn(made(`${size} contact`, 'brass', { section: { pts: recPts(TABS[q.tab]!), L: mm(q.Lr) } }, { color: 0xc0c4c8 }), 1, 90) }]),
  expect: (q) => { const b = BANDS[q.band]!, t = TABS[q.tab]!; return { bound: [mm(b.L + q.Lr), mm(Math.max(b.so, t.t + 2.2)), mm(Math.max(b.so, t.w + 1.6))], mass: barrelMass(q.band) + areaOf(rect(mm(t.w + 1.6), mm(t.t + 2.2))) * mm(q.Lr) * rho('brass') - areaOf(rect(mm(t.w + 0.1), mm(t.t + 0.2))) * mm(q.Lr) * rho('brass'), tol: 0.01, massTol: 0.02, says: 'barrel and contact along it; nominal mass, the copper, the sleeve and the contact\'s frame' }; },
  tests: [T(3)],
};
const BUTTS: Record<string, { band: string }> = { red: { band: 'red' }, blue: { band: 'blue' }, yellow: { band: 'yellow' } };
const BUTTSPLICE: PartFamily<{ band: string }> = {
  id: 'piece.buttsplice', name: 'Butt splice', gloss: 'An insulated crimp butt splice joining two wires end to end, red, blue or yellow (typical)', domains: EL, aisle: E('Crimp terminals'),
  says: 'An insulated butt splice (typical): its copper barrel (twice a terminal\'s, a wire in from each end) in its nylon sleeve, round its axis (`<band> splice barrel/axis`): a wire goes into each end (Through a line, from lo and from hi)',
  rows: BUTTS, size: 'blue', source: 'typical of makers\' insulated butt splices',
  recipe: (q, size) => { const b = BANDS[q.band]!, barrel = made(`${size} splice barrel`, 'copper', { tube: [mm(b.id) / 2, mm(b.id / 2 + b.w), mm(2 * b.L)] }, { color: CU });
    return over(barrel, `${size} splice barrel/axis`, made(`${size} splice sleeve`, 'nylon', { tube: [mm(b.id / 2 + b.w), mm(b.so) / 2, mm(2 * b.L)] }, { color: b.color }), 'mid', 'touch'); },
  expect: (q) => ({ bound: [mm(BANDS[q.band]!.so), mm(2 * BANDS[q.band]!.L), mm(BANDS[q.band]!.so)], mass: 2 * barrelMass(q.band), tol: 0.01, massTol: 0.02, says: 'its sleeve by its length; nominal mass, the barrel and sleeve' }),
  tests: [T(2)],
};
/** Copper tube cable lugs by section and stud: the barrel's bore and outside, the palm's width and thickness (mm,
 *  typical of makers' tube lugs, after DIN 46235's sections). */
export const LUGS = rowsOf(['A', 'stud', 'd1', 'd2', 'b', 'tp'] as const, [['10 M6', 10, 6, 4.5, 7.5, 11, 2], ['16 M8', 16, 8, 5.8, 8.5, 13, 2.2], ['25 M8', 25, 8, 7.2, 10, 14, 2.5], ['35 M10', 35, 10, 8.5, 12, 17, 3], ['50 M10', 50, 10, 10, 14, 19, 3.5], ['70 M12', 70, 12, 11.5, 16, 22, 4],
  ['95 M12', 95, 12, 13.5, 19, 25, 4.5], ['120 M16', 120, 16, 15.5, 21, 30, 5], ['150 M16', 150, 16, 17, 23, 32, 5.5], ['185 M16', 185, 16, 19, 25, 34, 6], ['240 M20', 240, 20, 21.5, 28, 40, 7]]);
type Lug = { A: number; stud: number; d1: number; d2: number; b: number; tp: number };
const lugL = (q: Lug) => ({ Lb: 1.6 * q.d2 + 5, Lp: 1.5 * q.b + 2 });
const CABLELUG: PartFamily<Lug> = {
  id: 'piece.cablelug', name: 'Cable lug', gloss: 'A tinned copper tube cable lug by its cable\'s section and stud, 10 to 240 mm² (typical, DIN 46235\'s sections)', domains: EL, aisle: E('Crimp terminals'),
  says: 'A tinned copper tube cable lug (typical): its barrel along x (`<size> lug barrel/axis`, the cable\'s conductor into it, crimped, the crimp not drawn) and its flat palm, its stud hole through it (`<size> lug palm/stud`): it goes over a busbar\'s stud or a bolt (Through a line)',
  rows: LUGS, size: '35 M10', source: 'typical of makers\' tube lugs (DIN 46235\'s sections)',
  recipe: (q, size) => { const { Lb, Lp } = lugL(q); return stack(`${size} cable lug`, 0, [{ b: turn(made(`${size} lug barrel`, 'copper', { tube: [mm(q.d1) / 2, mm(q.d2) / 2, mm(Lb)] }, { color: CU }), 2, 90) },
    { b: made(`${size} lug palm`, 'copper', { box: [mm(Lp), mm(q.tp), mm(q.b)] }, { color: CU, pattern: { name: 'stud', points: [[mm(Lp / 2 - q.b / 2), 0]], hole: mm(q.stud + 0.5) / 2 } }) }]); },
  cannot: (q, size) => ((q.stud + 0.5) / 2 < q.b / 2 ? null : `a ${size} palm wider than its stud hole`),
  expect: (q) => { const { Lb, Lp } = lugL(q); return { bound: [mm(Lb + Lp), mm(q.d2), mm(Math.max(q.d2, q.b))], mass: (annulus(mm(q.d2), mm(q.d1)) * mm(Lb) + (mm(Lp) * mm(q.b) - disc(mm(q.stud + 0.5))) * mm(q.tp)) * rho('copper'), tol: 0.01, massTol: 0.02, says: 'barrel and palm along it; nominal mass, the barrel and the palm less its hole' }; },
  tests: [T(2, { offers: ['35 M10 lug barrel/axis', '35 M10 lug palm/stud'] })],
};

// ==== heat-shrink and cable ==========================================================================================
/** 2:1 polyolefin heat-shrink by its supplied bore (mm, the inch sizes): its bore and wall shrunk (mm, typical). */
export const SHRINK2 = rowsOf(['D', 'd', 'w'] as const, [['1.2', 1.2, 0.6, 0.41], ['1.6', 1.6, 0.8, 0.43], ['2.4', 2.4, 1.2, 0.51], ['3.2', 3.2, 1.6, 0.51], ['4.8', 4.8, 2.4, 0.51], ['6.4', 6.4, 3.2, 0.64], ['9.5', 9.5, 4.8, 0.64], ['12.7', 12.7, 6.4, 0.64], ['19.1', 19.1, 9.5, 0.76], ['25.4', 25.4, 12.7, 0.89], ['38.1', 38.1, 19.1, 1.02], ['50.8', 50.8, 25.4, 1.14]]);
/** 3:1 adhesive-lined heat-shrink by its supplied bore: its bore shrunk, its jacket and its liner shrunk (mm, typical). */
export const SHRINK3 = rowsOf(['D', 'd', 'w', 'a'] as const, [['3.2', 3.2, 1.0, 0.6, 0.5], ['4.8', 4.8, 1.5, 0.6, 0.5], ['6.4', 6.4, 2.0, 0.8, 0.6], ['9.5', 9.5, 3.0, 1.0, 0.8], ['12.7', 12.7, 4.0, 1.1, 0.9], ['19.1', 19.1, 6.0, 1.2, 1.0], ['25.4', 25.4, 8.0, 1.3, 1.1], ['39', 39, 13.0, 1.4, 1.2]]);
const STATE = { key: 'state', label: 'As', type: 'choice' as const, default: 'supplied', choices: ['supplied', 'shrunk'] };
/** A tube's wall at a new bore, the same section kept (shrinking keeps its stuff; its length's change not drawn). */
const wallAt = (ri: number, ri0: number, t0: number) => Math.sqrt(ri * ri + (ri0 + t0) ** 2 - ri0 * ri0) - ri;
const SHRINK: PartFamily<{ D: number; d: number; w: number }> = {
  id: 'piece.heatshrink', name: 'Heat-shrink tubing 2:1', gloss: 'A length of 2:1 polyolefin heat-shrink tubing by its supplied bore, 1.2 to 50.8 mm, supplied or shrunk', domains: EL, aisle: E('Heat-shrink'),
  says: 'A length of 2:1 polyolefin heat-shrink (typical walls): a tube at its supplied bore, or shrunk to half, its wall the same stuff (its length\'s change not drawn; taken as PE). It goes over a joint or a wire (Over a shaft) and is shrunk on',
  rows: SHRINK2, size: '6.4', source: 'typical of makers\' 2:1 tubing (recalled)', settings: [STATE, { key: 'length', label: 'Length, mm', type: 'number', default: 30 }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => { const ri = (set.state === 'shrunk' ? q.d : q.D) / 2, t = set.state === 'shrunk' ? q.w : wallAt(q.D / 2, q.d / 2, q.w); return made(`${size} heat-shrink`, 'pe', { tube: [mm(ri), mm(ri + t), len(set)] }, { color: 0x1c1c1c }); },
  expect: (q, _s, set) => { const ri = (set.state === 'shrunk' ? q.d : q.D) / 2, t = set.state === 'shrunk' ? q.w : wallAt(q.D / 2, q.d / 2, q.w); return { bound: [mm(2 * (ri + t)), len(set), mm(2 * (ri + t))], mass: annulus(mm(q.d + 2 * q.w), mm(q.d)) * len(set) * rho('pe'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, its shrunk wall\'s section (the same either way)' }; },
  tests: [T(1, { offers: ['6.4 heat-shrink/axis'] }), T(1, {}, { state: 'shrunk' })],
};
const SHRINK3F: PartFamily<{ D: number; d: number; w: number; a: number }> = {
  id: 'piece.heatshrink3', name: 'Heat-shrink tubing 3:1, lined', gloss: 'A length of 3:1 adhesive-lined heat-shrink by its supplied bore, 3.2 to 39 mm, supplied or shrunk (typical)', domains: EL, aisle: E('Heat-shrink'),
  says: 'A length of 3:1 adhesive-lined heat-shrink (typical): its polyolefin jacket over its hot-melt liner (taken as PP), at its supplied bore or shrunk to a third, each wall the same stuff (its length\'s change not drawn). It goes over a joint (Over a shaft) and seals it shrunk',
  rows: SHRINK3, size: '9.5', source: 'typical of makers\' 3:1 lined tubing (recalled)', settings: [STATE, { key: 'length', label: 'Length, mm', type: 'number', default: 40 }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => { const sh = set.state === 'shrunk', ri = (sh ? q.d : q.D) / 2, a = sh ? q.a : wallAt(q.D / 2, q.d / 2, q.a), w = sh ? q.w : wallAt(ri + a, q.d / 2 + q.a, q.w);
    const liner = made(`${size} lined shrink liner`, 'pp', { tube: [mm(ri), mm(ri + a), len(set)] }, { color: 0xe9e2c8 });
    return over(liner, `${size} lined shrink liner/axis`, made(`${size} lined shrink jacket`, 'pe', { tube: [mm(ri + a), mm(ri + a + w), len(set)] }, { color: 0x1c1c1c }), 'mid', 'touch'); },
  expect: (q, _s, set) => { const sh = set.state === 'shrunk', ri = (sh ? q.d : q.D) / 2, a = sh ? q.a : wallAt(q.D / 2, q.d / 2, q.a), w = sh ? q.w : wallAt(ri + a, q.d / 2 + q.a, q.w), o = 2 * (ri + a + w);
    return { bound: [mm(o), len(set), mm(o)], mass: (annulus(mm(q.d + 2 * q.a), mm(q.d)) * rho('pp') + annulus(mm(q.d + 2 * q.a + 2 * q.w), mm(q.d + 2 * q.a)) * rho('pe')) * len(set), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, liner and jacket shrunk (the same either way)' }; },
  tests: [T(2), T(2, {}, { state: 'shrunk' })],
};
type Cable = { n: number; A: number; od: number };
/** Cores × section (mm²) and the cable's outside (mm): H05VV-F (HD 21.5) and H07RN-F (HD 22.4), outsides typical of
 *  makers' tables (recalled). */
const cableRows = (rows: readonly (readonly [number, number, number])[], sep: string): Record<string, Cable> => Object.fromEntries(rows.map(([n, A, od]) => [`${n}${sep}${A}`, { n, A, od }]));
export const H05VVF = cableRows([[2, 0.75, 6.2], [3, 0.75, 6.6], [4, 0.75, 7.1], [5, 0.75, 7.8], [2, 1, 6.6], [3, 1, 7.0], [4, 1, 7.6], [5, 1, 8.4], [2, 1.5, 7.6], [3, 1.5, 8.1], [4, 1.5, 9.0], [5, 1.5, 10.0], [2, 2.5, 9.2], [3, 2.5, 9.9], [4, 2.5, 11.0], [5, 2.5, 12.0], [3, 4, 11.3], [4, 4, 12.5], [5, 4, 13.8]], ' × ');
export const H07RNF = cableRows([[2, 1.5, 9.0], [3, 1.5, 9.6], [4, 1.5, 10.6], [5, 1.5, 11.6], [3, 2.5, 11.5], [4, 2.5, 12.6], [5, 2.5, 13.9], [3, 4, 13.5], [4, 4, 14.9], [5, 4, 16.4], [3, 6, 15.4], [4, 6, 16.8], [5, 6, 18.6]], 'G');
const lay = (q: Cable) => { const rc = Math.sqrt(q.A / Math.PI), ri = rc + (q.A >= 4 ? 0.8 : q.A >= 1.5 ? 0.7 : 0.6); return { rc, R: (1.03 * ri) / Math.sin(Math.PI / q.n), ri }; };
/** A cable: its sheath and its cores' insulation as one body (its cores' lines on their lay circle), each core's copper
 *  passed through it along its own line. */
const cableOf = (q: Cable, size: string, mat: string, L: number, color: number): Block => { const { rc, R } = lay(q), name = `${size} cable`;
  let b: Block = made(name, mat, { cyl: [mm(q.od) / 2, L] }, { color, pattern: { name: 'cores', circle: { n: q.n, r: mm(R) } } });
  for (let i = 0; i < q.n; i++) b = through(b, made(`${size} core ${i + 1}`, 'copper', { cyl: [mm(rc), L] }, { color: CU }), { port: `${name}/cores`, i, from: 'lo' }, 'touch');
  return b; };
const cableFamily = (id: string, name: string, std: string, rows: Record<string, Cable>, size: string, mat: string, color: number): PartFamily<Cable> => ({
  id, name, gloss: `A length of ${name.toLowerCase()} by its cores and section (${std})`, domains: EL, aisle: E('Cable'),
  says: `A length of ${std} flexible cable by its cores and section (its outside typical): its sheath and its cores' insulation drawn as one body (their colours not drawn), each core's copper (its strands drawn as one round of their section) through it on its lay circle (\`<size> cable/cores\`). It goes through a gland's cap (Through a line); its cores end in ferrules or crimp terminals`,
  rows, size, source: `${std} (sections); outsides typical of makers' tables (recalled)`,
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 200 }],
  cannot: (q, s, set) => above0(set, 'length', 'a length') ?? (lay(q).R + lay(q).ri < q.od / 2 ? null : `its ${q.n} cores of ${s.split(/[ ×G]+/)[1]} mm² laid round need more than its ${q.od} mm outside`),
  recipe: (q, s, set) => cableOf(q, s, mat, len(set), color),
  expect: (q, _s, set) => { const { rc } = lay(q), L = len(set); return { bound: [mm(q.od), L, mm(q.od)], mass: (disc(mm(q.od)) - q.n * Math.PI * mm(rc) ** 2) * L * rho(mat) + q.n * Math.PI * mm(rc) ** 2 * L * rho('copper'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, its copper and the body round it' }; },
  tests: [T(4, {}, { size })],
});
const FLEXCABLE = cableFamily('piece.flexcable', 'PVC flexible cable', 'H05VV-F, HD 21.5', H05VVF, '3 × 1.5', 'pvc', 0xe8e8e4);
const RUBBERCABLE = cableFamily('piece.rubbercable', 'Rubber flexible cable', 'H07RN-F, HD 22.4', H07RNF, '3G1.5', 'neoprene', 0x1c1c1c);
FLEXCABLE.tests = [T(4, { offers: ['3 × 1.5 cable/axis', '3 × 1.5 cable/cores', '3 × 1.5 core 1/axis', '3 × 1.5 core 2/axis', '3 × 1.5 core 3/axis'] })];
/** Cylindrical fuse links: diameter × length (IEC 60269-2 gG's 8.5 × 31.5, 10.3 × 38, 14.3 × 51, 22.2 × 58; the 6.3 × 32
 *  of UL 248-14), their caps' length typical (mm). */
export const CART_FUSES = rowsOf(['d', 'L', 'c'] as const, [['6.3 × 32', 6.35, 31.75, 6], ['8.5 × 31.5', 8.5, 31.5, 6], ['10.3 × 38', 10.3, 38, 8], ['14.3 × 51', 14.3, 51, 10], ['22.2 × 58', 22.2, 58, 12]]);
const CARTFUSE: PartFamily<{ d: number; L: number; c: number }> = {
  id: 'piece.cartridgefuse', name: 'Cartridge fuse', gloss: 'A cylindrical fuse link by its size: 6.3 × 32, 8.5 × 31.5, 10.3 × 38, 14.3 × 51 or 22.2 × 58 (IEC 60269-2, UL 248-14)', domains: EL, aisle: E('Fuses'),
  says: 'A cylindrical fuse link (IEC 60269-2 gG sizes, the 6.3 × 32 of UL 248-14): a brass cap at each end and its ceramic body between, along its axis; its element and sand not drawn. Its caps go into a holder\'s clips; its rating a setting (it does not change its size)',
  rows: CART_FUSES, size: '10.3 × 38', source: 'IEC 60269-2 and UL 248-14 (sizes); caps typical',
  envelope: 'its body drawn solid (no element or sand inside), so its drawn mass is a solid ceramic rod\'s',
  settings: [{ key: 'rating', label: 'Rating, A', type: 'choice', default: '10', choices: ['1', '2', '4', '6', '10', '16', '20', '25', '32', '40', '50', '63'] }],
  recipe: (q, size, set) => { const cap = (k: number) => made(`${size} fuse cap ${k}`, 'brass', { cyl: [mm(q.d) / 2, mm(q.c)] }, { color: 0xc0c4c8 });
    return stack(`${size} ${String(set.rating)} A fuse`, 1, [{ b: cap(1) }, { b: made(`${size} fuse body`, 'ceramic', { cyl: [mm(q.d / 2 - 0.3), mm(q.L - 2 * q.c)] }, { color: 0xf2efe6 }) }, { b: cap(2) }]); },
  expect: (q) => ({ bound: [mm(q.d), mm(q.L), mm(q.d)], tol: 0.01, says: 'its diameter by its length' }),
  tests: [T(3)],
};

// ==== panel and cable management ======================================================================================
/** Control knobs by bore and diameter: their height (mm, typical of makers' plain knobs with a set screw). */
export const KNOBS: Record<string, { bore: number; D: number; H: number }> = Object.fromEntries([6, 6.35].flatMap((bore) => ([[13, 14], [15, 16], [20, 16], [25, 17], [30, 18], [38, 19]] as const).map(([D, H]) => [`${bore === 6 ? '6 mm' : '1/4 in'} Ø${D}`, { bore, D, H }])));
const knobPts = (q: { D: number; H: number }): [number, number][] => ([[0, 0], [q.D / 2, 0], [q.D / 2, 0.8 * q.H], [0.85 * q.D / 2, q.H], [0, q.H]] as [number, number][]).map(([r, y]) => [mm(r), mm(y)]);
const KNOB_MATS: Record<string, string> = { ABS: 'abs', aluminium: 'al-6061' };
const KNOB: PartFamily<{ bore: number; D: number; H: number }> = {
  id: 'piece.controlknob', name: 'Control knob', gloss: 'A plain round control knob for a 6 mm or 1/4 in shaft, by its diameter, with its set screw hole (typical)', domains: [...EL, 'controls'], aisle: E('Knobs'),
  says: 'A plain round control knob (typical): turned, its top chamfered, its blind bore from below for the shaft (`<name>/bore`, 0.7 of its height) and an M3 set screw\'s tapped hole from its side to the bore (`<name>/set screw`). It goes over a pot\'s or an encoder\'s shaft (Through a line on its bore, from below), a set screw down its side hole',
  rows: KNOBS, size: '6 mm Ø20', source: 'typical of makers\' plain knobs', settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'ABS', choices: ['ABS', 'aluminium'] }],
  recipe: (q, size, set) => { const H = mm(q.H), m = KNOB_MATS[String(set.matter)] ?? 'abs';
    return made(`${size} knob`, m, { lathe: { pts: knobPts(q) } }, { color: m === 'abs' ? 0x1c1c1c : 0xc4c8cc, patterns: [{ name: 'bore', points: [[0, 0]], hole: mm(q.bore) / 2, face: '-y', depth: 0.7 * H }, { name: 'set screw', points: [[-0.15 * H, 0]], hole: mm(1.25), face: '+x', depth: mm(q.D / 2 - q.bore / 2) }] }); },
  expect: (q, _s, set) => { const m = KNOB_MATS[String(set.matter)] ?? 'abs'; return { bound: [mm(q.D), mm(q.H), mm(q.D)], mass: (turnedVol(knobPts(q)) - disc(mm(q.bore)) * 0.7 * mm(q.H) - disc(mm(2.5)) * mm(q.D / 2 - q.bore / 2)) * rho(m), tol: 0.01, massTol: 0.03, says: 'its diameter by its height; nominal mass, turned, less its bore and set screw hole' }; },
  tests: [T(1, { offers: ['6 mm Ø20 knob/axis', '6 mm Ø20 knob/bore', '6 mm Ø20 knob/set screw'] })],
};
/** Rubber grommets for 1.6 mm panels by the panel's hole: bore and outside (mm, typical, the inch sizes). */
export const GROMMETS = rowsOf(['hole', 'id', 'od'] as const, [['6.4', 6.4, 3.2, 9.5], ['7.9', 7.9, 4.8, 11.1], ['9.5', 9.5, 6.4, 12.7], ['11.1', 11.1, 7.9, 14.3], ['12.7', 12.7, 9.5, 15.9], ['15.9', 15.9, 11.1, 19.1], ['19.1', 19.1, 14.3, 25.4], ['22.2', 22.2, 15.9, 28.6], ['25.4', 25.4, 19.1, 31.8], ['31.8', 31.8, 25.4, 38.1]]);
const gromPts = (q: { hole: number; id: number; od: number }): [number, number][] => { const H = 4.8, g = 1.6, ri = q.id / 2, ro = q.od / 2, rh = q.hole / 2;
  return ([[ri, -H / 2], [ro, -H / 2], [ro, -g / 2], [rh, -g / 2], [rh, g / 2], [ro, g / 2], [ro, H / 2], [ri, H / 2]] as [number, number][]).map(([r, y]) => [mm(r), mm(y)]); };
const GROMMET: PartFamily<{ hole: number; id: number; od: number }> = {
  id: 'piece.grommet', name: 'Rubber grommet', gloss: 'A rubber grommet for a 1.6 mm panel, by the panel hole it fills (typical)', domains: EL, aisle: E('Grommets'),
  says: 'A rubber grommet for a 1.6 mm panel (typical): its section turned about its axis, two flanges and the groove between them the panel\'s hole across (its bore `<size> grommet/axis`). It goes into a panel\'s hole; a cable through its bore (Through a line)',
  rows: GROMMETS, size: '9.5', source: 'typical of makers\' grommets (inch sizes)',
  recipe: (q, size) => made(`${size} grommet`, 'rubber', { lathe: { pts: gromPts(q) } }, { color: 0x1c1c1c }),
  expect: (q) => ({ bound: [mm(q.od), mm(4.8), mm(q.od)], mass: turnedVol(gromPts(q)) * rho('rubber'), tol: 0.01, massTol: 0.02, says: 'its outside by its height; nominal mass, its section turned' }),
  tests: [T(1, { offers: ['9.5 grommet/axis'] })],
};
/** Cable tie mounts: adhesive (base square) or screw (for an M4 screw) by the widest tie they take; tie thickness after
 *  piece.cabletie's table (mm, typical). */
export const TIE_MOUNTS = rowsOf(['B', 'tw', 'tt', 'screw'] as const, [['adhesive 19', 19, 4.8, 1.3, 0], ['adhesive 25', 25, 4.8, 1.3, 0], ['adhesive 28', 28, 7.6, 1.6, 0], ['adhesive 40', 40, 9, 1.8, 0], ['screw 3.6', 10, 3.6, 1.1, 1], ['screw 4.8', 12, 4.8, 1.3, 1], ['screw 7.6', 14, 7.6, 1.6, 1], ['screw 9', 16, 9, 1.8, 1]]);
type Mount = { B: number; tw: number; tt: number; screw: number };
const bridgePts = (q: Mount): [number, number][] => { const tw = q.tw + 0.5, th = q.tt + 0.5, bw = tw + 4, H = th + 1.5;
  return ([[-bw / 2, 0], [-tw / 2, 0], [-tw / 2, th], [tw / 2, th], [tw / 2, 0], [bw / 2, 0], [bw / 2, H], [-bw / 2, H]] as [number, number][]).map(([x, y]) => [mm(x), mm(y - th / 2)]); };
const mountBase = (q: Mount): [number, number] => (q.screw ? [q.tw + 4.5 + 18, q.B] : [q.B, q.B]);
const TIEMOUNT: PartFamily<Mount> = {
  id: 'piece.tiemount', name: 'Cable tie mount', gloss: 'A nylon cable tie mount, adhesive or screwed, by the widest tie it takes (typical)', domains: EL, aisle: E('Cable ties and mounts'),
  says: 'A nylon cable tie mount (typical): its base (adhesive: its pad not drawn; or screwed: an M4 screw\'s hole beside its bridge, `<size> mount base/screw`) and its bridge over the tie\'s tunnel, along z (`<size> mount bridge/axis`): a cable tie goes through the tunnel (Through a line) and round the cables',
  rows: TIE_MOUNTS, size: 'adhesive 19', source: 'typical of makers\' mounts; ties as piece.cabletie gives them',
  recipe: (q, size) => { const [L, W] = mountBase(q), base = made(`${size} mount base`, 'pa66', { box: [mm(L), mm(1.5), mm(W)] }, { color: 0xe8e4d8, ...(q.screw ? { pattern: { name: 'screw', points: [[mm(L / 2 - 4.5), 0]], hole: mm(2.15) } } : {}) });
    return stack(`${size} tie mount`, 1, [{ b: base }, { b: made(`${size} mount bridge`, 'pa66', { section: { pts: bridgePts(q), L: mm(Math.min(W, 10)) } }, { color: 0xe8e4d8 }) }]); },
  expect: (q) => { const [L, W] = mountBase(q), p = bridgePts(q); return { bound: [mm(L), mm(1.5) + span(p, 1), mm(W)], mass: ((mm(L) * mm(W) - (q.screw ? disc(mm(4.3)) : 0)) * mm(1.5) + areaOf(p) * mm(Math.min(W, 10))) * rho('pa66'), tol: 0.01, massTol: 0.02, says: 'its base and bridge; nominal mass, the base less its hole and the bridge\'s section along it' }; },
  tests: [T(2, { offers: ['adhesive 19 mount bridge/axis'] }), T(2, {}, { size: 'screw 4.8' })],
};
/** PVC mini trunking and its lid, width × height (mm, typical), its walls typical. */
export const TRUNKING: Record<string, { W: number; H: number; t: number }> = Object.fromEntries(([[16, 16], [25, 16], [25, 25], [38, 16], [38, 25], [40, 40], [50, 50], [75, 50], [100, 50], [100, 100]] as const).map(([W, H]) => [`${W}×${H}`, { W, H, t: W <= 25 ? 1 : W <= 40 ? 1.2 : W <= 75 ? 1.5 : 2 }]));
const uPts = (q: { W: number; H: number; t: number }): [number, number][] => { const w = q.W / 2, h = q.H - q.t, t = q.t; return ([[-w, 0], [w, 0], [w, h], [w - t, h], [w - t, t], [-w + t, t], [-w + t, h], [-w, h]] as [number, number][]).map(([x, y]) => [mm(x), mm(y)]); };
const TRUNK: PartFamily<{ W: number; H: number; t: number }> = {
  id: 'piece.trunking', name: 'Cable trunking', gloss: 'A length of PVC mini trunking with its clip-on lid, by its width and height (typical)', domains: [...EL, 'structural'], aisle: E('Trunking'),
  says: 'A length of PVC trunking (typical sizes): its U-section base along its length (z) and its lid on top (its clip lips not drawn); cables lie inside it (along z), its base screwed to a wall',
  rows: TRUNKING, size: '25×16', source: 'typical of makers\' mini trunking',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => stack(`${size} trunking`, 1, [{ b: made(`${size} trunking base`, 'pvc', { section: { pts: uPts(q), L: len(set) } }, { color: 0xf2f2ee }) }, { b: made(`${size} trunking lid`, 'pvc', { box: [mm(q.W), mm(q.t), len(set)] }, { color: 0xf2f2ee }) }]),
  expect: (q, _s, set) => ({ bound: [mm(q.W), mm(q.H), len(set)], mass: (areaOf(uPts(q)) + mm(q.W) * mm(q.t)) * len(set) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its width, height and length; nominal mass, its U and its lid along it' }),
  tests: [T(2)],
};
/** Flush back boxes: BS 4662 steel, one and two gang, by depth; DIN 49073 round device boxes, Ø68, by depth (mm, typical). */
export const BACKBOXES: Record<string, { L: number; W: number; D: number; t: number; mat: string; round: boolean }> = {
  ...Object.fromEntries(([['1G', 75, 75], ['2G', 146, 75]] as const).flatMap(([g, L, W]) => [25, 35, 47].map((D) => [`BS ${g} ${D}`, { L, W, D, t: 1, mat: 'steel-low', round: false }]))),
  ...Object.fromEntries([47, 61, 66].map((D) => [`Ø68 × ${D}`, { L: 68, W: 68, D, t: 1.6, mat: 'pp', round: true }])),
};
type Back = { L: number; W: number; D: number; t: number; mat: string; round: boolean };
const BACKBOX: PartFamily<Back> = {
  id: 'piece.backbox', name: 'Flush back box', gloss: 'A flush wall box for a switch or socket: BS 4662 steel one or two gang, or a DIN 49073 Ø68 round device box, by its depth (typical)', domains: [...EL, 'structural'], aisle: E('Wall boxes'),
  says: 'A flush wall box (typical): a steel case (BS 4662, one or two gang) or a round polypropylene cup (DIN 49073\'s Ø68), its opening up, its cavity offered (`<size> box/cavity`) for a device\'s back; its fixing lugs and knock-outs not drawn. It goes into a wall\'s cut-out',
  rows: BACKBOXES, size: 'BS 1G 35', source: 'typical (BS 4662 and DIN 49073 sizes, recalled)',
  recipe: (q, size) => made(`${size} box`, q.mat, q.round ? { cup: [mm(q.L) / 2, mm(q.D), mm(q.t), mm(q.t)] } : { case: [mm(q.L), mm(q.D), mm(q.W), mm(q.t), mm(q.t)] }, { color: q.round ? 0x5a5d62 : 0xa9acb0 }),
  expect: (q) => { const L = mm(q.L), W = mm(q.W), D = mm(q.D), t = mm(q.t); return { bound: [L, D, W], mass: (q.round ? disc(L) * D - disc(L - 2 * t) * (D - t) : L * D * W - (L - 2 * t) * (D - t) * (W - 2 * t)) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its outside; nominal mass, its walls and floor' }; },
  tests: [T(1, { offers: ['BS 1G 35 box/cavity'] })],
};

/** Every family of enclosures and electrical installation this file makes, most used first. */
export const INSTALL = [DIECAST, JUNCTIONBOX, RACKPANEL, DINRAIL, DINBREAKER, DINHOUSING, DINTERMINAL, GLANDM, GLANDPG, GLANDNUT, GLANDPLUG, GLANDREDUCER, CONDUITPIPE, FLEXCONDUIT, COUPLER, BENDC, SADDLE, CONDUITBOX,
  FERRULE, FERRULEBARE, RINGTERMINAL, FORKTERMINAL, RECEPTACLE, FASTONTAB, BUTTSPLICE, CABLELUG, SHRINK, SHRINK3F, FLEXCABLE, RUBBERCABLE, CARTFUSE, KNOB, GROMMET, TIEMOUNT, TRUNK, BACKBOX] as PartFamily<unknown>[];
/** Each table's source, and whether it is specified (read from the standard or the maker) or typical. */
export const INSTALL_SOURCES: Record<string, string> = {
  HAMMOND1590: 'Hammond Manufacturing, hammfg.com/electronics/small-case/diecast/1590 (read 2026-11-06): length, width, height, screws; walls typical', JUNCTION: 'typical', RACK_UNITS: 'EIA-310 (recalled)', DIN_RAILS: 'EN 60715 widths and depths (recalled); thickness typical',
  MCB: 'typical (DIN 43880 size 1)', DIN_MODULES: 'DIN 43880 front and height; the rest typical', DIN_TERMINALS: 'typical (after Phoenix Contact UT, recalled)', GLANDS_M: 'EN 60423 threads; the rest typical', GLANDS_PG: 'DIN 40430 thread outsides (recalled); the rest typical',
  GLAND_NUTS: 'typical', GLAND_PLUGS: 'typical', GLAND_REDUCERS: 'typical', CONDUIT: 'EN 61386-21 sizes; walls typical', FLEX_CONDUIT: 'EN 61386-22 sizes; the rest typical', CONDUIT_COUPLERS: 'typical', CONDUIT_BENDS: 'typical', CONDUIT_SADDLES: 'typical', CONDUIT_BOXES: 'typical (after BS 4662)',
  FERRULES: 'DIN 46228-4 (typical of makers\' tables, recalled)', FERRULES_BARE: 'DIN 46228-1 (typical, recalled)', RING_TERMINALS: 'typical', FORK_TERMINALS: 'typical', TABS: 'IEC 61210 widths and thicknesses (recalled); lengths and holes typical', RECEPTACLES: 'typical', LUGS: 'typical (DIN 46235 sections)',
  SHRINK2: 'typical', SHRINK3: 'typical', H05VVF: 'HD 21.5 sections; outsides typical', H07RNF: 'HD 22.4 sections; outsides typical', CART_FUSES: 'IEC 60269-2, UL 248-14 sizes (recalled); caps typical', KNOBS: 'typical', GROMMETS: 'typical', TIE_MOUNTS: 'typical', TRUNKING: 'typical', BACKBOXES: 'typical',
};
export const INSTALL_STATUS: Record<string, string> = Object.fromEntries(Object.keys(INSTALL_SOURCES).map((k) => [k, k === 'HAMMOND1590' ? 'specified' : 'typical']));
/** Their piece nodes (registered with the maker's check.row by familyNode). */
export const INSTALL_NODES: BlockDef[] = INSTALL.map((f) => familyNode(f));
