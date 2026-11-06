// Structure and building families for the table-driven maker (decision 0026; the user, 2026-11-06: "add 1000 new working
// parts ... really populate the library"): aluminium profiles to EN 755 (angles, channels, box sections, round tube, tees,
// hex bar), steel tube to EN 10255, UPE, HEM and IPN sections (EN 10365), hot-rolled tees (EN 10055), cold-formed C and Z
// purlins, strut channel and drywall studs (EN 14195), glulam, LVL and I-joists, insulation boards, paving slabs, block
// pavers and kerbs (BS EN 1339, 1338, 1340), PVC-U drainage pipe and fittings (EN 1401), gutters and downpipes, concrete
// lintels and padstones. Every row is re-keyed here from the standard or the maker's table it names, or labelled typical:
// no file is copied (BOLTS' LGPL tables of UPE, HEM and IPN, ../dl/bolts, were read only to check the rows against).
// Each recipe is made of the room operations (src/nexus/room.ts) only: no place is written here.
//
// How they lie (as building.ts lays its sections): a section has its profile in x and y and its length along z, and
// offers a line along its length (`<name>/axis`, through its bound's middle); a round one (a tube, a hex bar, a pipe)
// stands along y and offers its axis; a board, a slab, a paver and a padstone lie as boxes, x their length, y their
// thickness or height, z their width. A pipe fitting is a run of its socket, bend or body and spigot, each offering its
// axis. A nominal mass is the row's where its standard gives one (kg/m), else the solids the row names at the drawing's
// material (said in each card).

import { branch, made, run, stack, type Block, type RunSeg } from '../room';
import { densityKg } from '../mass';
import { familyNode, type Expect, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

type Pt = [number, number];
const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const lengthSet = (d: number) => ({ key: 'length', label: 'Length, mm', type: 'number' as const, default: d });
const noLength = (set: Record<string, unknown>, k = 'length') => (len(set, k) > 0 && Number.isFinite(len(set, k)) ? null : `a length above 0 (${String(set[k])} mm)`);
const annA = (ri: number, ro: number) => Math.PI * (ro * ro - ri * ri);
/** Points along an arc about (cx, cy), from a0 to a1 degrees, both ends in. */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 4): Pt[] =>
  r > 0 ? Array.from({ length: n + 1 }, (_, k) => { const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt; }) : [[cx, cy]];
/** A profile about its bound's middle (so its line along its length runs through that middle). */
const centred = (pts: Pt[]): Pt[] => { const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2; return pts.map(([x, y]) => [x - cx, y - cy]); };
const sectionOf = (name: string, mat: string, pts: Pt[], L: number, color?: number): Block => made(name, mat, { section: { pts: centred(pts), L } }, color !== undefined ? { color } : {});
const rect = (w: number, h: number): Pt[] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
/** A thin wall t thick along a centreline (an open polyline), its corners mitred: one closed outline, its area the
 *  centreline's length by t exactly (each segment's strip a trapezoid as long, on the average, as the segment). */
function thick(path: Pt[], t: number): Pt[] {
  const n = path.length, nrm = (i: number): Pt => { const a = path[i]!, b = path[i + 1]!, L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };
  const side = (s: number): Pt[] => path.map((p, k) => { const na = nrm(Math.max(0, k - 1)), nb = nrm(Math.min(n - 2, k)), f = (s * t) / 2 / (1 + na[0] * nb[0] + na[1] * nb[1]); return [p[0] + (na[0] + nb[0]) * f, p[1] + (na[1] + nb[1]) * f] as Pt; });
  return [...side(1), ...side(-1).reverse()];
}
/** A hollow rectangle's outline as one loop read even-odd (as building.ts draws a hollow section): its outside
 *  counter-clockwise from the middle of its +x side, a slit in, its inside clockwise, and the slit back out. Its corners
 *  square. */
const boxOutline = (B: number, H: number, t: number): Pt[] => {
  const ring = (w: number, h: number): Pt[] => [[w / 2, 0], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]];
  const outer = ring(B, H), inner = ring(B - 2 * t, H - 2 * t).reverse(); return [...outer, outer[0]!, inner[inner.length - 1]!, ...inner];
};
const AL = 0xc8ccd0, STEEL = 0x6b6e72, GALV = 0xa8adb2, TIMBER = 0xc8a46a, GLULAM = 0xd2ad72, OSB = 0xc29a5b, CONCRETE = 0x9a9890, DRAIN = 0xb5562b, RAIN = 0x2a2a2a;
const sectionExpect = (w: number, h: number, set: Record<string, unknown>, area: number, mat: string, says: string, tol = 0.02): Expect =>
  ({ bound: [w, h, len(set)], mass: area * len(set) * rho(mat), tol: 0.01, massTol: tol, says });

// ---- aluminium profiles (EN 755) ----------------------------------------------------------------------------------
/** Aluminium stock sizes as UK stockists list them (typical of the Aalco and Smiths ranges), each within the tolerances of
 *  EN 755-9 (profiles), EN 755-6 (hex bar) and EN 755-7/8 (tube); 6063-T6 drawn at the table's 2700 kg/m³ (6082, the hex
 *  bar's alloy, is 2700 too). Their small corner radii are not drawn: the corners are square. */
const AL_SRC = 'aluminium stock sizes as UK stockists list them (typical), within EN 755-9 tolerances';
type AlL = { a: number; b: number; t: number };
const AL_ANGLES: Record<string, AlL> = {};
for (const [a, t] of [[10, 1.5], [12.7, 1.6], [15, 1.5], [15, 2], [20, 2], [20, 3], [25, 2], [25, 3], [30, 2], [30, 3], [40, 2], [40, 3], [40, 4], [50, 3], [50, 4], [50, 5], [60, 3], [60, 5], [75, 6], [80, 8], [100, 6], [100, 10]] as const) AL_ANGLES[`${a}x${a}x${t}`] = { a, b: a, t };
for (const [a, b, t] of [[20, 10, 2], [25, 15, 2], [30, 20, 2], [30, 20, 3], [40, 20, 3], [40, 25, 3], [50, 25, 3], [50, 30, 3], [60, 30, 3], [60, 40, 4], [75, 50, 5], [100, 50, 6]] as const) AL_ANGLES[`${a}x${b}x${t}`] = { a, b, t };
const AL_ANGLE_F: PartFamily<AlL> = {
  id: 'piece.alangle', name: 'Aluminium angle', gloss: 'An extruded aluminium angle, equal (10 to 100 mm) or unequal (20x10 to 100x50), by its legs and thickness, cut to a length', domains: ['structural', 'manufacturing', 'everyday'], aisle: 'Structure / Aluminium profiles',
  says: 'An extruded 6063-T6 aluminium angle by its size ("40x40x3", "50x25x3": its long leg up (y), its other across (x), its thickness; typical stock sizes within EN 755-9), cut to its length along z, its corners square. It offers a line along its length (`<size> aluminium angle/axis`, in the space its legs hold); lay it on a plate, stack it, bolt through it',
  rows: AL_ANGLES, size: '40x40x3', source: AL_SRC, settings: [lengthSet(1000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(`${size} aluminium angle`, 'al-6063', [[0, 0], [mm(q.b), 0], [mm(q.b), mm(q.t)], [mm(q.t), mm(q.t)], [mm(q.t), mm(q.a)], [0, mm(q.a)]], len(set), AL),
  expect: (q, _s, set) => sectionExpect(mm(q.b), mm(q.a), set, mm(q.a + q.b - q.t) * mm(q.t), 'al-6063', 'its legs by its length; nominal mass (a + b − t)t at 2700 kg/m³'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['40x40x3 aluminium angle/axis'] } }],
};
type AlU = { B: number; H: number; t: number };
const AL_CHANNELS: Record<string, AlU> = Object.fromEntries(([[12, 12, 1.5], [15, 15, 1.5], [20, 10, 2], [20, 20, 2], [25, 12, 2], [25, 25, 2], [25, 25, 3], [30, 15, 2], [30, 20, 2], [40, 20, 2], [40, 20, 3], [40, 40, 3], [50, 25, 3], [50, 50, 4], [60, 30, 3], [80, 40, 4], [100, 50, 5]] as const).map(([B, H, t]) => [`${B}x${H}x${t}`, { B, H, t }]));
const AL_CHANNEL_F: PartFamily<AlU> = {
  id: 'piece.alchannel', name: 'Aluminium channel', gloss: 'An extruded aluminium channel (U) by its width, leg height and thickness, 12x12x1.5 to 100x50x5, cut to a length', domains: ['structural', 'manufacturing', 'everyday'], aisle: 'Structure / Aluminium profiles',
  says: 'An extruded 6063-T6 aluminium channel by its size ("40x20x2": its width across (x), its legs\' height up (y), one thickness throughout; typical stock sizes within EN 755-9), open upward, cut to its length along z, its corners square. It offers a line along its length (`<size> aluminium channel/axis`, in its open middle): a track, an edge trim, a rail a bar slides in',
  rows: AL_CHANNELS, size: '40x20x2', source: AL_SRC, settings: [lengthSet(1000)], cannot: (q, size, set) => noLength(set) ?? (2 * q.t < q.B && q.t < q.H ? null : `${size}: its walls leave no channel`),
  recipe: (q, size, set) => { const B = mm(q.B), H = mm(q.H), t = mm(q.t); return sectionOf(`${size} aluminium channel`, 'al-6063', [[0, 0], [B, 0], [B, H], [B - t, H], [B - t, t], [t, t], [t, H], [0, H]], len(set), AL); },
  expect: (q, _s, set) => sectionExpect(mm(q.B), mm(q.H), set, (mm(q.B) + 2 * mm(q.H - q.t)) * mm(q.t), 'al-6063', 'its width and legs by its length; nominal mass (B + 2(H − t))t at 2700 kg/m³'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['40x20x2 aluminium channel/axis'] } }],
};
type AlBox = { B: number; H: number; t: number };
const AL_BOXES: Record<string, AlBox> = {};
for (const [a, t] of [[10, 1], [12, 1.5], [15, 1.5], [20, 1.5], [20, 2], [25, 1.5], [25, 2], [30, 2], [30, 3], [40, 2], [40, 3], [50, 2], [50, 3], [50, 4], [60, 3], [75, 3], [80, 4], [100, 3], [100, 4], [100, 6]] as const) AL_BOXES[`${a}x${a}x${t}`] = { B: a, H: a, t };
for (const [h, b, t] of [[20, 10, 1.5], [30, 20, 2], [40, 20, 2], [40, 25, 2], [50, 25, 2], [50, 30, 2], [60, 30, 2], [60, 40, 3], [80, 40, 3], [100, 40, 3], [100, 50, 3], [120, 60, 4], [150, 50, 4]] as const) AL_BOXES[`${h}x${b}x${t}`] = { B: b, H: h, t };
const AL_BOX_F: PartFamily<AlBox> = {
  id: 'piece.albox', name: 'Aluminium box section (square or rectangular tube)', gloss: 'An extruded aluminium square or rectangular tube by its outside and wall, 10x10x1 to 150x50x4, cut to a length', domains: ['structural', 'manufacturing', 'everyday'], aisle: 'Structure / Aluminium profiles',
  says: 'An extruded 6063-T6 aluminium box section by its size ("25x25x2", "50x25x2": its depth up (y), its width across (x), its wall; typical stock sizes within EN 755-9), its corners square, cut to its length along z. It offers a line along its length down its bore (`<size> aluminium box/axis`): a frame member, a leg, a sleeve over a smaller one',
  rows: AL_BOXES, size: '25x25x2', source: AL_SRC, settings: [lengthSet(1000)], cannot: (q, size, set) => noLength(set) ?? (2 * q.t < Math.min(q.B, q.H) ? null : `${size}: its wall leaves no bore`),
  recipe: (q, size, set) => sectionOf(`${size} aluminium box`, 'al-6063', boxOutline(mm(q.B), mm(q.H), mm(q.t)), len(set), AL),
  expect: (q, _s, set) => sectionExpect(mm(q.B), mm(q.H), set, mm(q.B) * mm(q.H) - mm(q.B - 2 * q.t) * mm(q.H - 2 * q.t), 'al-6063', 'its outside by its length; nominal mass, BH − (B − 2t)(H − 2t) at 2700 kg/m³'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['25x25x2 aluminium box/axis'] } }],
};
type AlTube = { D: number; t: number };
const AL_TUBES: Record<string, AlTube> = Object.fromEntries(([[6, 1], [8, 1], [10, 1], [12, 1], [12, 1.5], [16, 1.5], [19.05, 1.63], [20, 1.5], [20, 2], [25, 1.5], [25, 2], [25.4, 3.25], [30, 2], [32, 2], [38.1, 3.25], [40, 2], [40, 3], [50, 2], [50, 3], [60, 3], [63.5, 3.25], [76.2, 3.25], [80, 5], [100, 5]] as const).map(([D, t]) => [`${D}x${t}`, { D, t }]));
const AL_TUBE_F: PartFamily<AlTube> = {
  id: 'piece.altube', name: 'Aluminium round tube', gloss: 'An aluminium round tube by its outside diameter and wall, 6x1 to 100x5 (EN 755-7/8 tolerances), cut to a length', domains: ['structural', 'manufacturing', 'everyday'], aisle: 'Structure / Aluminium profiles',
  says: 'An aluminium round tube by its size ("25x2": outside diameter and wall, mm; the inch sizes 19.05, 25.4, 38.1, 63.5 and 76.2 as UK stockists sell them; typical, within EN 755-7 and 755-8), standing along y, so long. It offers its axis (`<size> aluminium tube/axis`): a sleeve slides over it (Over a shaft), it passes along a hole (Through a line), a smaller tube or rod goes down its bore',
  rows: AL_TUBES, size: '25x2', source: 'aluminium tube stock sizes as UK stockists list them (typical), within EN 755-7 and EN 755-8 tolerances', settings: [lengthSet(1000)],
  cannot: (q, size, set) => noLength(set) ?? (2 * q.t < q.D ? null : `${size}: its wall leaves no bore`),
  recipe: (q, size, set) => made(`${size} aluminium tube`, 'al-6063', { tube: [mm(q.D / 2 - q.t), mm(q.D / 2), len(set)] }, { color: AL }),
  expect: (q, _s, set) => ({ bound: [mm(q.D), len(set), mm(q.D)], mass: Math.PI * mm(q.D - q.t) * mm(q.t) * len(set) * rho('al-6063'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass π(D − t)t at 2700 kg/m³' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['25x2 aluminium tube/axis'] } }],
};
type AlT = { b: number; h: number; t: number };
const AL_TEES: Record<string, AlT> = Object.fromEntries(([[20, 20, 3], [25, 25, 3], [30, 30, 3], [40, 40, 3], [40, 40, 4], [50, 50, 4], [50, 50, 6], [60, 60, 6], [75, 75, 6]] as const).map(([b, h, t]) => [`${b}x${h}x${t}`, { b, h, t }]));
const teeOutline = (b: number, h: number, tw: number, tf: number, r = 0): Pt[] =>
  [[-tw / 2, 0], [tw / 2, 0], ...(r > 0 ? arc(tw / 2 + r, h - tf - r, r, 180, 90) : [[tw / 2, h - tf] as Pt]), [b / 2, h - tf], [b / 2, h], [-b / 2, h], [-b / 2, h - tf], ...(r > 0 ? arc(-tw / 2 - r, h - tf - r, r, 90, 0) : [[-tw / 2, h - tf] as Pt])];
const AL_TEE_F: PartFamily<AlT> = {
  id: 'piece.altee', name: 'Aluminium tee section', gloss: 'An extruded aluminium T section by its flange, height and thickness, 20x20x3 to 75x75x6, cut to a length', domains: ['structural', 'manufacturing', 'everyday'], aisle: 'Structure / Aluminium profiles',
  says: 'An extruded 6063-T6 aluminium tee by its size ("40x40x3": its flange across (x) on top, its stem down (y), one thickness; typical stock sizes within EN 755-9), its corners square, cut to its length along z. It offers a line along its length (`<size> aluminium tee/axis`, in its stem): a glazing bar, a shelf edge, a stiffener',
  rows: AL_TEES, size: '40x40x3', source: AL_SRC, settings: [lengthSet(1000)], cannot: (q, size, set) => noLength(set) ?? (q.t < q.h && q.t < q.b ? null : `${size}: its thickness fills it`),
  recipe: (q, size, set) => sectionOf(`${size} aluminium tee`, 'al-6063', teeOutline(mm(q.b), mm(q.h), mm(q.t), mm(q.t)), len(set), AL),
  expect: (q, _s, set) => sectionExpect(mm(q.b), mm(q.h), set, (mm(q.b) + mm(q.h - q.t)) * mm(q.t), 'al-6063', 'its flange and height by its length; nominal mass (b + h − t)t at 2700 kg/m³'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['40x40x3 aluminium tee/axis'] } }],
};
const AL_HEX: Record<string, { af: number }> = Object.fromEntries([6, 8, 10, 11, 12, 13, 14, 16, 17, 19, 22, 24, 27, 30, 32, 36, 41, 46, 50].map((af) => [`${af}`, { af }]));
const AL_HEX_F: PartFamily<{ af: number }> = {
  id: 'piece.alhexbar', name: 'Aluminium hexagon bar', gloss: 'An extruded aluminium hexagon bar (EN 755-6) by its size across flats, 6 to 50 mm, cut to a length', domains: ['manufacturing', 'mechanical', 'structural'], aisle: 'Structure / Aluminium profiles',
  says: 'An extruded aluminium hexagon bar by its size across flats ("17": 6 to 50 mm, typical stock sizes in 6082-T6, within EN 755-6), standing along y, so long: stock to turn a nut, a spacer or a standoff from. It offers its axis (`<size> hex bar/axis`); drawn at the table\'s 2700 kg/m³',
  rows: AL_HEX, size: '17', source: 'EN 755-6 hexagon bar, the stock sizes UK stockists list (typical)', settings: [lengthSet(500)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => made(`${size} hex bar`, 'al-6061', { hex: [mm(q.af), len(set)] }, { color: AL }),
  expect: (q, _s, set) => ({ mass: (Math.sqrt(3) / 2) * mm(q.af) ** 2 * len(set) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'nominal mass, the hexagon (√3/2)s² by its length at 2700 kg/m³' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['17 hex bar/axis'] } }],
};

// ---- steel tube (EN 10255) ----------------------------------------------------------------------------------------
/** EN 10255 (ex BS 1387) non-alloy steel tube for welding and threading: its outside diameter by DN, and its wall in the
 *  medium (M) and heavy (H) series, mm. Its plain-end mass is the standard's, 0.02466 (D − T)T kg/m (7.85 kg/dm³). */
const EN10255_D: Record<number, number> = { 6: 10.2, 8: 13.5, 10: 17.2, 15: 21.3, 20: 26.9, 25: 33.7, 32: 42.4, 40: 48.3, 50: 60.3, 65: 76.1, 80: 88.9, 100: 114.3, 125: 139.7, 150: 165.1 };
const EN10255_T: Record<'medium' | 'heavy', Record<number, number>> = {
  medium: { 6: 2.0, 8: 2.3, 10: 2.3, 15: 2.6, 20: 2.6, 25: 3.2, 32: 3.2, 40: 3.2, 50: 3.6, 65: 3.6, 80: 4.0, 100: 4.5, 125: 5.0, 150: 5.0 },
  heavy: { 6: 2.6, 8: 2.9, 10: 2.9, 15: 3.2, 20: 3.2, 25: 4.0, 32: 4.0, 40: 4.0, 50: 4.5, 65: 4.5, 80: 5.0, 100: 5.4, 125: 5.4, 150: 5.4 },
};
type StTube = { D: number; t: number };
const ST_TUBES: Record<string, StTube> = {};
for (const s of ['medium', 'heavy'] as const) for (const [dn, D] of Object.entries(EN10255_D)) ST_TUBES[`DN${dn} ${s}`] = { D, t: EN10255_T[s][Number(dn)]! };
const ST_TUBE_F: PartFamily<StTube> = {
  id: 'piece.steeltube', name: 'Steel tube (EN 10255)', gloss: 'A steel tube for welding and threading (EN 10255, ex BS 1387) by its DN and series, DN6 to DN150, medium or heavy, cut to a length', domains: ['structural', 'pipelines', 'manufacturing'], aisle: 'Structure / Steel tube',
  says: 'A steel tube to EN 10255 by its DN and series ("DN25 medium", "DN50 heavy": 10.2 to 165.1 mm outside, its wall the series\'), standing along y, so long, plain-ended (its threads not drawn): a handrail, a scaffold-like frame, a post, a gas or water line. It offers its axis (`<size> steel tube/axis`) for a fitting, a clamp or a sleeve over it',
  rows: ST_TUBES, size: 'DN25 medium', source: 'EN 10255:2004 tables (outside diameters, M and H walls, plain-end mass 0.02466 (D − T)T), re-keyed', settings: [lengthSet(1000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => made(`${size} steel tube`, 'steel-low', { tube: [mm(q.D / 2 - q.t), mm(q.D / 2), len(set)] }, { color: STEEL }),
  expect: (q, _s, set) => ({ bound: [mm(q.D), len(set), mm(q.D)], mass: 0.02466 * (q.D - q.t) * q.t * len(set), tol: 0.01, massTol: 0.01, says: `its outside by its length; its mass the standard's 0.02466 (D − T)T kg/m` }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['DN25 medium steel tube/axis'] } }],
};

// ---- UPE, HEM, IPN and hot-rolled tees -----------------------------------------------------------------------------
/** EN 10365 sections: h, b, tw, tf, r (root radius), mm; kg/m. UPE channels have parallel flanges; HEM is the heavy H
 *  series; IPN's flanges taper 14 %, drawn parallel at their thickness at the middle of the outstand, its toe radii not
 *  drawn, so drawn about 2 % heavy. Rows checked against BOLTS' tables (LGPL: read, not copied). */
type Sec = { kind: 'U' | 'I'; h: number; b: number; tw: number; tf: number; r: number; kgm: number };
const secRows = (kind: 'U' | 'I', pre: string, rows: Record<string, [number, number, number, number, number, number]>): Record<string, Sec> =>
  Object.fromEntries(Object.entries(rows).map(([k, [h, b, tw, tf, r, kgm]]) => [`${pre} ${k}`, { kind, h, b, tw, tf, r, kgm }]));
const UPE = secRows('U', 'UPE', {
  80: [80, 50, 4, 7, 10, 7.90], 100: [100, 55, 4.5, 7.5, 10, 9.82], 120: [120, 60, 5, 8, 12, 12.1], 140: [140, 65, 5, 9, 12, 14.5], 160: [160, 70, 5.5, 9.5, 12, 17.0], 180: [180, 75, 5.5, 10.5, 12, 19.7],
  200: [200, 80, 6, 11, 13, 22.8], 220: [220, 85, 6.5, 12, 13, 26.6], 240: [240, 90, 7, 12.5, 15, 30.2], 270: [270, 95, 7.5, 13.5, 15, 35.2], 300: [300, 100, 9.5, 15, 15, 44.4], 330: [330, 105, 11, 16, 18, 53.2],
  360: [360, 110, 12, 17, 18, 61.2], 400: [400, 115, 13.5, 18, 18, 72.2],
});
const HEM = secRows('I', 'HEM', {
  100: [120, 106, 12, 20, 12, 41.8], 120: [140, 126, 12.5, 21, 12, 52.1], 140: [160, 146, 13, 22, 12, 63.2], 160: [180, 166, 14, 23, 15, 76.2], 180: [200, 186, 14.5, 24, 15, 88.9], 200: [220, 206, 15, 25, 18, 103],
  220: [240, 226, 15.5, 26, 18, 117], 240: [270, 248, 18, 32, 21, 157], 260: [290, 268, 18, 32.5, 24, 172], 280: [310, 288, 18.5, 33, 24, 189], 300: [340, 310, 21, 39, 27, 238], 320: [359, 309, 21, 40, 27, 245],
  340: [377, 309, 21, 40, 27, 248], 360: [395, 308, 21, 40, 27, 250], 400: [432, 307, 21, 40, 27, 256], 450: [478, 307, 21, 40, 27, 263], 500: [524, 306, 21, 40, 27, 270], 550: [572, 306, 21, 40, 27, 278],
  600: [620, 305, 21, 40, 27, 285], 650: [668, 305, 21, 40, 27, 293], 700: [716, 304, 21, 40, 27, 301], 800: [814, 303, 21, 40, 30, 317], 900: [910, 302, 21, 40, 30, 333], 1000: [1008, 302, 21, 40, 30, 349],
});
const IPN = secRows('I', 'IPN', {
  80: [80, 42, 3.9, 5.9, 3.9, 5.94], 100: [100, 50, 4.5, 6.8, 4.5, 8.34], 120: [120, 58, 5.1, 7.7, 5.1, 11.1], 140: [140, 66, 5.7, 8.6, 5.7, 14.3], 160: [160, 74, 6.3, 9.5, 6.3, 17.9], 180: [180, 82, 6.9, 10.4, 6.9, 21.9],
  200: [200, 90, 7.5, 11.3, 7.5, 26.2], 220: [220, 98, 8.1, 12.2, 8.1, 31.1], 240: [240, 106, 8.7, 13.1, 8.7, 36.2], 260: [260, 113, 9.4, 14.1, 9.4, 41.9], 280: [280, 119, 10.1, 15.2, 10.1, 47.9], 300: [300, 125, 10.8, 16.2, 10.8, 54.2],
  320: [320, 131, 11.5, 17.3, 11.5, 61.0], 340: [340, 137, 12.2, 18.3, 12.2, 68.0], 360: [360, 143, 13, 19.5, 13, 76.1], 380: [380, 149, 13.7, 20.5, 13.7, 84.0], 400: [400, 155, 14.4, 21.6, 14.4, 92.4], 450: [450, 170, 16.2, 24.3, 16.2, 115],
  500: [500, 185, 18, 27, 18, 141], 550: [550, 200, 19, 30, 19, 166], 600: [600, 215, 21.6, 32.4, 21.6, 199],
});
/** A section's outline, its root radii drawn (four steps each): an I's about its middle; a U's, its web at x = 0. */
function secOutline(s: Sec): Pt[] {
  const h = mm(s.h) / 2, b = mm(s.b), tw = mm(s.tw), tf = mm(s.tf), r = mm(s.r);
  if (s.kind === 'U') return [[0, -h], [b, -h], [b, -h + tf], ...arc(tw + r, -h + tf + r, r, 270, 180), ...arc(tw + r, h - tf - r, r, 180, 90), [b, h - tf], [b, h], [0, h]];
  const x = tw / 2, B = b / 2;
  return [[-B, -h], [B, -h], [B, -h + tf], ...arc(x + r, -h + tf + r, r, 270, 180), ...arc(x + r, h - tf - r, r, 180, 90), [B, h - tf], [B, h], [-B, h], [-B, h - tf], ...arc(-x - r, h - tf - r, r, 90, 0), ...arc(-x - r, -h + tf + r, r, 0, -90), [-B, -h + tf]];
}
const secFamily = (id: string, name: string, gloss: string, says: string, rows: Record<string, Sec>, size: string, source: string, massTol: number, note: string): PartFamily<Sec> => ({
  id, name, gloss, domains: ['structural', 'manufacturing'], aisle: 'Structure / Steel sections', says, rows, size, source,
  settings: [lengthSet(3000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (s, sz, set) => sectionOf(sz, 'steel-low', secOutline(s), len(set), STEEL),
  expect: (s, _s, set) => ({ bound: [mm(s.b), mm(s.h), len(set)], mass: s.kgm * len(set), tol: 0.01, massTol, says: `its flange width, depth and length; its mass the standard's ${s.kgm} kg/m${note}` }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: [`${size}/axis`] } }],
});
const UPE_F = secFamily('piece.upe', 'Steel channel (UPE)', 'A hot-rolled parallel-flange steel channel, UPE 80 to 400 (EN 10365), cut to a length',
  'A hot-rolled steel UPE channel by its size ("UPE 160"): its web at −x, its parallel flanges across (x), its depth up (y), its root radii drawn, cut to its length along z. It offers a line along its length (`<size>/axis`); stand it up (Turn about x), lay it on a column, pair two back to back (Stack)',
  UPE, 'UPE 160', 'EN 10365 UPE (dimensions and mass), re-keyed; checked against BOLTS\' table (LGPL, not copied)', 0.02, '');
const HEM_F = secFamily('piece.hem', 'Steel H column (HEM)', 'A hot-rolled heavy wide-flange steel H section, HEM 100 to 1000 (EN 10365), cut to a length',
  'A hot-rolled steel HEM (heavy H) section by its size ("HEM 200"): its flanges across (x), its depth up (y), its root radii drawn, cut to its length along z. It offers a line along its length (`<size>/axis`); stand it up as a column (Turn about x), a beam on it',
  HEM, 'HEM 200', 'EN 10365 HEM (dimensions and mass), re-keyed; checked against BOLTS\' table (LGPL, not copied)', 0.02, '');
const IPN_F = secFamily('piece.ipn', 'Steel I beam (IPN, tapered flange)', 'A hot-rolled tapered-flange steel I beam, IPN 80 to 600 (EN 10365, DIN 1025-1), cut to a length',
  'A hot-rolled steel IPN beam by its size ("IPN 200"): its flanges across (x), its depth up (y), its root radii drawn and its 14 % tapered flanges drawn parallel at their thickness at the middle of the outstand (toe radii not drawn: about 2 % heavy), cut to its length along z. It offers a line along its length (`<size>/axis`)',
  IPN, 'IPN 200', 'EN 10365 IPN (DIN 1025-1: dimensions and mass), re-keyed; checked against BOLTS\' table (LGPL, not copied)', 0.03, '; drawn with parallel flanges, about 2 % over');
/** Hot-rolled equal tees by EN 10055 (DIN 1024): b = h, t (flange and stem, at their middles), root radius r1 = t, mm;
 *  kg/m. The flange and stem tapers and the toe radii are not drawn: about 2 % heavy. */
type STee = { b: number; t: number; kgm: number };
const STEEL_TEES: Record<string, STee> = Object.fromEntries(([[20, 3, 0.88], [25, 3.5, 1.29], [30, 4, 1.77], [35, 4.5, 2.33], [40, 5, 2.96], [45, 5.5, 3.67], [50, 6, 4.44], [60, 7, 6.23], [70, 8, 8.32], [80, 9, 10.7], [90, 10, 13.4], [100, 11, 16.4], [120, 13, 23.2], [140, 15, 31.3]] as const).map(([b, t, kgm]) => [`T${b}`, { b, t, kgm }]));
const STEEL_TEE_F: PartFamily<STee> = {
  id: 'piece.steeltee', name: 'Steel tee (EN 10055)', gloss: 'A hot-rolled equal steel tee, T20 to T140 (EN 10055), cut to a length', domains: ['structural', 'manufacturing'], aisle: 'Structure / Steel sections',
  says: 'A hot-rolled steel tee by its size ("T50": flange and height 50 mm, its thickness the standard\'s): its flange across (x) on top, its stem down (y), its root radii drawn (its tapers and toe radii not: about 2 % heavy), cut to its length along z. It offers a line along its length (`<size> tee/axis`, in its stem): a glazing bar, a stiffener, a shelf bearer',
  rows: STEEL_TEES, size: 'T50', source: 'EN 10055 (DIN 1024) equal tees, dimensions and mass, re-keyed', settings: [lengthSet(1000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(`${size} tee`, 'steel-low', teeOutline(mm(q.b), mm(q.b), mm(q.t), mm(q.t), mm(q.t)), len(set), STEEL),
  expect: (q, _s, set) => ({ bound: [mm(q.b), mm(q.b), len(set)], mass: q.kgm * len(set), tol: 0.01, massTol: 0.03, says: `its flange and height by its length; its mass the standard's ${q.kgm} kg/m (drawn about 2 % over)` }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['T50 tee/axis'] } }],
};

// ---- cold-formed steel: C and Z purlins, strut channel, drywall studs ----------------------------------------------------
/** Lipped C and Z purlins by their series and gauge, as makers' tables list them (typical of the Lysaght "Zeds and Cees"
 *  range, as recalled): depth D, flange B (a Z's two flanges E and F, its wider one up, so two lap), lip L, mm. Drawn
 *  with square corners, the lips square to the flanges, galvanised steel at 7850 kg/m³. */
type Purlin = { D: number; E: number; F: number; L: number; t: number };
const PURLIN_SERIES: [number, number, number, number, number, number[]][] = [
  [100, 102, 53, 49, 12.5, [1.0, 1.2, 1.5, 1.9]], [150, 152, 65, 61, 14.5, [1.2, 1.5, 1.9, 2.4]], [200, 203, 79, 74, 15.5, [1.5, 1.9, 2.4]],
  [250, 254, 79, 74, 18, [1.5, 1.9, 2.4]], [300, 300, 100, 93, 27.5, [2.4, 3.0]], [350, 350, 129, 121, 30, [3.0]],
];
const C_SERIES: Record<number, number> = { 100: 51, 150: 64, 200: 76, 250: 76, 300: 96, 350: 129 };
const C_PURLINS: Record<string, Purlin> = {}, Z_PURLINS: Record<string, Purlin> = {};
for (const [s, D, E, F, L, ts] of PURLIN_SERIES) for (const t of ts) { C_PURLINS[`C${s} ${t}`] = { D, E: C_SERIES[s]!, F: C_SERIES[s]!, L, t }; Z_PURLINS[`Z${s} ${t}`] = { D, E, F, L, t }; }
const cPath = (q: Purlin): Pt[] => { const D = mm(q.D), B = mm(q.E), L = mm(q.L), t = mm(q.t); return [[B - t, D / 2 - L], [B - t, D / 2 - t / 2], [0, D / 2 - t / 2], [0, -D / 2 + t / 2], [B - t, -D / 2 + t / 2], [B - t, -D / 2 + L]]; };
const zPath = (q: Purlin): Pt[] => { const D = mm(q.D), E = mm(q.E), F = mm(q.F), L = mm(q.L), t = mm(q.t); return [[E - t, D / 2 - L], [E - t, D / 2 - t / 2], [0, D / 2 - t / 2], [0, -D / 2 + t / 2], [-(F - t), -D / 2 + t / 2], [-(F - t), -D / 2 + L]]; };
const purlinF = (kind: 'C' | 'Z'): PartFamily<Purlin> => ({
  id: kind === 'C' ? 'piece.cpurlin' : 'piece.zpurlin', name: kind === 'C' ? 'C purlin (lipped channel)' : 'Z purlin', domains: ['structural', 'manufacturing'], aisle: 'Structure / Cold-formed steel',
  gloss: `A cold-formed galvanised steel ${kind} purlin or rail by its series and gauge, ${kind}100 1.0 to ${kind}350 3.0 (typical of makers' tables), cut to a length`,
  says: `A cold-formed galvanised steel ${kind} section by its series and gauge ("${kind}200 1.5": its depth up (y), its ${kind === 'C' ? 'flanges and lips to +x' : 'wider flange to +x on top and narrower to −x below, so two lap over a rafter'}, its lips square, its corners square), cut to its length along z: a purlin, a sheeting rail, a light joist or stud. It offers a line along its length (\`${kind}… purlin/axis\`); bolt it to a cleat through its web`,
  rows: kind === 'C' ? C_PURLINS : Z_PURLINS, size: `${kind}200 1.5`, source: 'cold-formed C and Z sections as makers\' tables list them (typical of the Lysaght Zeds and Cees range, as recalled)',
  settings: [lengthSet(6000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(`${size} purlin`, 'steel-low', thick(kind === 'C' ? cPath(q) : zPath(q), mm(q.t)), len(set), GALV),
  expect: (q, _s, set) => sectionExpect(kind === 'C' ? mm(q.E) : mm(q.E + q.F - q.t), mm(q.D), set, mm(2 * q.L + q.E + q.F + q.D - 4 * q.t) * mm(q.t), 'steel-low', `its width and depth by its length; nominal mass, its developed width (2L + ${kind === 'C' ? '2B' : 'E + F'} + D − 4t) by t at 7850 kg/m³`),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: [`${kind}200 1.5 purlin/axis`] } }],
});
const C_PURLIN_F = purlinF('C'), Z_PURLIN_F = purlinF('Z');
/** Slotted strut channel (typical of the Unistrut P1000 range and its metric makers): width B, height H, gauge t, slot s,
 *  its in-turned lips ld deep, mm. */
type Strut = { B: number; H: number; t: number; s: number; ld: number };
const STRUTS: Record<string, Strut> = { '41x21x2.5': { B: 41.3, H: 20.6, t: 2.5, s: 22.2, ld: 7 }, '41x41x2.0': { B: 41.3, H: 41.3, t: 2.0, s: 22.2, ld: 9 }, '41x41x2.5': { B: 41.3, H: 41.3, t: 2.5, s: 22.2, ld: 9 }, '41x62x2.5': { B: 41.3, H: 61.9, t: 2.5, s: 22.2, ld: 9 }, '41x82x2.5': { B: 41.3, H: 82.5, t: 2.5, s: 22.2, ld: 9 } };
const strutPath = (q: Strut): Pt[] => { const B = mm(q.B), H = mm(q.H), t = mm(q.t), s = mm(q.s), ld = mm(q.ld), x0 = s / 2 + t / 2, x1 = B / 2 - t / 2;
  return [[x0, H - ld], [x0, H - t / 2], [x1, H - t / 2], [x1, t / 2], [-x1, t / 2], [-x1, H - t / 2], [-x0, H - t / 2], [-x0, H - ld]]; };
const STRUT_F: PartFamily<Strut> = {
  id: 'piece.strutchannel', name: 'Strut channel (slotted)', gloss: 'A cold-formed galvanised strut channel with in-turned lips, 41x21 to 41x82 (typical of the Unistrut range), cut to a length', domains: ['structural', 'manufacturing', 'everyday'], aisle: 'Structure / Cold-formed steel',
  says: 'A galvanised steel strut channel by its size ("41x41x2.5": its width across (x), its height up (y), its gauge; its 22 mm slot up between in-turned lips; typical of the Unistrut P1000 family and its metric makers), cut to its length along z: the rail pipes, trays and racks are clamped to. It offers a line along its length (`<size> strut/axis`, in its channel) a channel nut runs along',
  rows: STRUTS, size: '41x41x2.5', source: 'strut channel as its makers list it (typical of Unistrut P1000, P3300, P5500, P5000 and the metric 41 mm ranges)', settings: [lengthSet(3000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(`${size} strut`, 'steel-low', thick(strutPath(q), mm(q.t)), len(set), GALV),
  expect: (q, _s, set) => sectionExpect(mm(q.B), mm(q.H), set, mm(2 * q.B + 2 * q.H + 2 * q.ld - q.s - 6 * q.t) * mm(q.t), 'steel-low', 'its width and height by its length; nominal mass, its developed width (2B + 2H + 2 lip − slot − 6t) by t at 7850 kg/m³'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['41x41x2.5 strut/axis'] } }],
};
/** Drywall metal framing by EN 14195's names: CW studs (lipped C, their web the track's inside) and UW tracks (plain U),
 *  0.6 mm galvanised steel; web, flange and lip, mm (as makers such as Knauf and Siniat list them: typical). */
type Stud = { D: number; B: number; L: number; t: number };
const STUDS: Record<string, Stud> = {};
for (const w of [50, 75, 100, 125, 150]) { STUDS[`CW ${w}`] = { D: w - 1.2, B: 50, L: 6, t: 0.6 }; STUDS[`UW ${w}`] = { D: w, B: 40, L: 0, t: 0.6 }; }
const studPath = (q: Stud): Pt[] => { const D = mm(q.D), B = mm(q.B), t = mm(q.t);
  return q.L > 0 ? cPath({ D: q.D, E: q.B, F: q.B, L: q.L, t: q.t }) : [[B - t / 2, D / 2 - t / 2], [0, D / 2 - t / 2], [0, -D / 2 + t / 2], [B - t / 2, -D / 2 + t / 2]]; };
const STUD_F: PartFamily<Stud> = {
  id: 'piece.drywallstud', name: 'Drywall stud or track (EN 14195)', gloss: 'A galvanised steel drywall CW stud or UW track by its width, 50 to 150 (EN 14195 names; typical sizes), cut to a length', domains: ['structural', 'everyday'], aisle: 'Structure / Cold-formed steel',
  says: 'A 0.6 mm galvanised steel drywall profile by its name and width ("CW 75" stud: a lipped C 73.8 deep, 50 mm flanges; "UW 75" track: a plain U 75 deep, 40 mm flanges, the stud\'s web fitting inside it): its web up (y), its flanges to +x, cut to its length along z. A partition is studs at 600 mm in tracks top and bottom, boarded each side. It offers a line along its length (`<size> profile/axis`)',
  rows: STUDS, size: 'CW 75', source: 'EN 14195 profile names; webs, flanges and lips as Knauf and Siniat list them (typical, as recalled)', settings: [lengthSet(2400)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(`${size} profile`, 'steel-low', thick(studPath(q), mm(q.t)), len(set), GALV),
  expect: (q, _s, set) => sectionExpect(mm(q.B), mm(q.D), set, mm(q.D + 2 * q.B + 2 * q.L - (q.L > 0 ? 4 : 2) * q.t) * mm(q.t), 'steel-low', 'its flange and web by its length; nominal mass, its developed width by t at 7850 kg/m³'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['CW 75 profile/axis'] } }],
};

// ---- engineered timber: glulam, LVL, I-joists ------------------------------------------------------------------------
/** GL24h glulam beams in the stock widths and depths merchants hold (typical, EN 14080 strength class), laid up of 45 mm
 *  laminations. Drawn in the table's wood (500 kg/m³; GL24h's mean is 420, EN 14080), so about a fifth heavy. */
type Glulam = { w: number; d: number };
const GLULAMS: Record<string, Glulam> = {};
for (const [w, ds] of [[90, [180, 225, 270, 315, 360]], [115, [225, 270, 315, 360, 405, 450]], [140, [270, 315, 360, 405, 450, 495, 540]], [165, [360, 405, 450, 495, 540, 585, 630]], [190, [450, 495, 540, 585, 630]]] as const)
  for (const d of ds) GLULAMS[`${w}x${d}`] = { w, d };
const LAM = 45;
const GLULAM_F: PartFamily<Glulam> = {
  id: 'piece.glulam', name: 'Glulam beam (GL24h)', gloss: 'A glued-laminated softwood beam, GL24h, by its width and depth, 90x180 to 190x630 (stock sizes, typical), cut to a length', domains: ['structural', 'everyday'], aisle: 'Structure / Engineered timber',
  says: 'A GL24h glulam beam by its size ("115x315": width across (x), depth up (y)), cut to its length along z, laid up of its 45 mm laminations, each one stacked on the last (Stack): a ridge beam, a portal, a long span over an opening. Drawn in the table\'s wood (500 kg/m³; GL24h is about 420, so drawn heavy). It offers its faces: put it onto a post or a padstone (Onto a face), hang joists off its side',
  rows: GLULAMS, size: '115x315', source: 'GL24h (EN 14080) stock sizes as UK and European merchants hold them, 45 mm laminations (typical)', settings: [lengthSet(4800)], cannot: (q, size, set) => noLength(set) ?? (q.d % LAM === 0 ? null : `${size}: its depth is not whole laminations of ${LAM} mm`),
  recipe: (q, size, set) => stack(`${size} glulam`, 1, Array.from({ length: q.d / LAM }, (_, i) => ({ b: made(`${size} glulam lamination ${i + 1}`, 'wood', { box: [mm(q.w), mm(LAM), len(set)] }, { color: GLULAM }) }))),
  expect: (q, _s, set) => ({ bound: [mm(q.w), mm(q.d), len(set)], mass: mm(q.w) * mm(q.d) * len(set) * rho('wood'), tol: 0.01, massTol: 0.02, says: 'its width, depth and length; nominal mass, the beam in the table\'s wood' }),
  tests: [{ inputs: {}, outputs: { pieces: 7 } }],
};
/** Kerto-S LVL: its thicknesses and standard widths as Metsä Wood publishes them (as recalled: typical), mm; 510 kg/m³
 *  (drawn in the table's wood, 500). */
type Lvl = { t: number; d: number };
const LVLS: Record<string, Lvl> = {};
for (const t of [39, 45, 51, 63, 75]) for (const d of [200, 225, 260, 300, 360, 400]) LVLS[`${t}x${d}`] = { t, d };
for (const d of [450, 500, 600]) LVLS[`75x${d}`] = { t: 75, d };
const LVL_F: PartFamily<Lvl> = {
  id: 'piece.lvl', name: 'LVL beam (laminated veneer lumber)', gloss: 'A Kerto-S type LVL beam by its thickness and depth, 39x200 to 75x600 (typical of the published range), cut to a length', domains: ['structural', 'everyday'], aisle: 'Structure / Engineered timber',
  says: 'A laminated veneer lumber beam by its size ("45x300": its thickness across (x), its depth up (y); typical of Kerto-S\'s thicknesses and standard widths), cut to its length along z, set on edge: a lintel, a trimmer, a flitch, a joist over a long span. It offers a line along its length (`<size> LVL/axis`); drawn as one solid in the table\'s wood (500 kg/m³, Kerto-S is about 510), its veneers not drawn',
  rows: LVLS, size: '45x300', source: 'Kerto-S thicknesses and standard widths as Metsä Wood publishes them (as recalled: typical)', settings: [lengthSet(4800)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(`${size} LVL`, 'wood', rect(mm(q.t), mm(q.d)), len(set), TIMBER),
  expect: (q, _s, set) => sectionExpect(mm(q.t), mm(q.d), set, mm(q.t) * mm(q.d), 'wood', 'its thickness and depth by its length; nominal mass, the beam in the table\'s wood'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['45x300 LVL/axis'] } }],
};
/** Timber I-joists: two flanges and an OSB web, by series and depth: TJI 110 to 560 (inch depths; flanges as Weyerhaeuser
 *  lists them, 3/8 in web) and JJI A, C and D (UK; 45 mm deep flanges, 9 mm web) — typical, as recalled. mm. */
type IJoist = { D: number; w: number; fd: number; tw: number };
const IN = 25.4, IJOISTS: Record<string, IJoist> = {};
for (const [s, w, fd, ds] of [[110, 1.75, 1.375, [9.5, 11.875, 14, 16]], [210, 2.0625, 1.375, [9.5, 11.875, 14, 16]], [230, 2.3125, 1.375, [9.5, 11.875, 14, 16]], [360, 2.3125, 1.5, [9.5, 11.875, 14, 16]], [560, 3.5, 1.5, [11.875, 14, 16]]] as const)
  for (const d of ds) IJOISTS[`TJI ${s} ${d === 11.875 ? '11-7/8' : d === 9.5 ? '9-1/2' : d}in`] = { D: d * IN, w: w * IN, fd: fd * IN, tw: 0.375 * IN };
for (const [s, w, ds] of [['A', 47, [195, 220, 245, 300]], ['C', 72, [220, 245, 300, 350, 400]], ['D', 97, [300, 350, 400, 450]]] as const) for (const d of ds) IJOISTS[`JJI ${d}${s}`] = { D: d, w, fd: 45, tw: 9 };
const IJOIST_F: PartFamily<IJoist> = {
  id: 'piece.ijoist', name: 'Timber I-joist', gloss: 'A timber I-joist (two flanges, an OSB web) by its series and depth: TJI 110 to 560, JJI A, C and D (typical), cut to a length', domains: ['structural', 'everyday'], aisle: 'Structure / Engineered timber',
  says: 'A timber I-joist by its series and depth ("TJI 210 11-7/8in", "JJI 220A"): its bottom flange, its OSB web and its top flange stacked up (y), the flanges across (x), cut to its length along z (its web\'s groove in each flange not drawn: it sits on it). A floor is joists at 400 or 600 mm onto a wall plate or in hangers. Flanges drawn in the table\'s wood (500 kg/m³), the web in its wood veneer (680, OSB is about 600–650). Typical, as recalled',
  rows: IJOISTS, size: 'TJI 210 11-7/8in', source: 'Weyerhaeuser TJI and James Jones JJI series as their makers list them (typical, as recalled)', settings: [lengthSet(4800)], cannot: (q, size, set) => noLength(set) ?? (q.D > 2 * q.fd ? null : `${size}: its flanges fill its depth`),
  recipe: (q, size, set) => { const L = len(set), fl = (k: string) => made(`${size} ${k} flange`, 'wood', { box: [mm(q.w), mm(q.fd), L] }, { color: TIMBER });
    return stack(`${size} I-joist`, 1, [{ b: fl('bottom') }, { b: made(`${size} web`, 'wood-veneer', { box: [mm(q.tw), mm(q.D - 2 * q.fd), L] }, { color: OSB }) }, { b: fl('top') }]); },
  expect: (q, _s, set) => ({ bound: [mm(q.w), mm(q.D), len(set)], mass: (2 * mm(q.w) * mm(q.fd) * rho('wood') + mm(q.tw) * mm(q.D - 2 * q.fd) * rho('wood-veneer')) * len(set), tol: 0.01, massTol: 0.02, says: 'its flange width and depth by its length; nominal mass, its two flanges and its web' }),
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};

// ---- insulation boards -------------------------------------------------------------------------------------------
/** Rigid insulation boards by kind and thickness, in the sheets sold: PIR (foil-faced, 2400 × 1200), XPS (1250 × 600) and
 *  EPS (1200 × 600), mm (typical of the Celotex, Kingspan, Styrofoam and EPS ranges). Drawn in the table's foam (35
 *  kg/m³: PIR and XPS about 30–35, EPS 15–25, so EPS drawn heavy). */
type Board = { kind: string; t: number; sheet: [number, number] };
const BOARDS: Record<string, Board> = {};
for (const t of [25, 30, 40, 50, 60, 70, 75, 80, 90, 100, 120, 150]) BOARDS[`PIR ${t}`] = { kind: 'PIR', t, sheet: [2400, 1200] };
for (const t of [20, 30, 40, 50, 60, 80, 100, 120, 140, 160]) BOARDS[`XPS ${t}`] = { kind: 'XPS', t, sheet: [1250, 600] };
for (const t of [25, 50, 75, 100, 150]) BOARDS[`EPS ${t}`] = { kind: 'EPS', t, sheet: [1200, 600] };
const BOARD_COLOR: Record<string, number> = { PIR: 0xd8d2b0, XPS: 0x7fb3d5, EPS: 0xf2f2ee };
const cutOf = (q: Board, set: Record<string, unknown>): [number, number] => [Number(set.w) || q.sheet[1], Number(set.l) || q.sheet[0]];
const BOARD_F: PartFamily<Board> = {
  id: 'piece.insulationboard', name: 'Insulation board (PIR, XPS, EPS)', gloss: 'A rigid insulation board, PIR, XPS or EPS, by its thickness, in its sheet or cut from it (typical)', domains: ['structural', 'thermal', 'everyday'], aisle: 'Building / Insulation',
  says: 'A rigid insulation board by its kind and thickness ("PIR 100", "XPS 50", "EPS 75"): the whole sheet sold (PIR 2400 × 1200, XPS 1250 × 600, EPS 1200 × 600; typical) or a width (x) and length (z) cut from it, lying flat, its thickness up (y): between rafters, under a slab, on a wall. Drawn in the table\'s foam (35 kg/m³), its facings not drawn',
  rows: BOARDS, size: 'PIR 100', source: 'the boards sold (typical of the Celotex, Kingspan, Styrofoam and EPS ranges: thicknesses and sheet sizes)',
  settings: [{ key: 'w', label: 'Width, mm (0: the sheet\'s)', type: 'number', default: 0 }, { key: 'l', label: 'Length, mm (0: the sheet\'s)', type: 'number', default: 0 }],
  cannot: (q, size, set) => { const [w, l] = cutOf(q, set); if (!(w > 0 && l > 0)) return `a width and length above 0 (${String(set.w)} × ${String(set.l)} mm)`; const [L, W] = q.sheet; return Math.max(w, l) <= L && Math.min(w, l) <= W ? null : `a ${size} board is sold ${L} × ${W} mm: ${w} × ${l} mm is cut from no one board`; },
  recipe: (q, size, set) => { const [w, l] = cutOf(q, set); return made(`${size} board`, 'foam', { box: [mm(w), mm(q.t), mm(l)] }, { color: BOARD_COLOR[q.kind]! }); },
  expect: (q, _s, set) => { const [w, l] = cutOf(q, set); return { bound: [mm(w), mm(q.t), mm(l)], mass: mm(w) * mm(q.t) * mm(l) * rho('foam'), tol: 0.01, massTol: 0.02, says: 'its cut size by its thickness; nominal mass, the board in the table\'s foam' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};

// ---- paving: flags, block pavers, kerbs and edgings ------------------------------------------------------------------
/** Precast concrete paving flags by BS 7263-1's types (the UK sizes of BS EN 1339): A 600 × 450, B 600 × 600, C 600 × 750,
 *  D 600 × 900 (50 or 63 thick), E 450 × 450 (50, 70), F 400 × 400 (50, 65), G 300 × 300 (50, 60), mm. */
type Flag = { L: number; W: number; t: number };
const FLAGS: Record<string, Flag> = {};
for (const [k, L, W, ts] of [['A', 600, 450, [50, 63]], ['B', 600, 600, [50, 63]], ['C', 600, 750, [50, 63]], ['D', 600, 900, [50, 63]], ['E', 450, 450, [50, 70]], ['F', 400, 400, [50, 65]], ['G', 300, 300, [50, 60]]] as const)
  for (const t of ts) FLAGS[`${k} ${Math.max(L, W)}x${Math.min(L, W)}x${t}`] = { L: Math.max(L, W), W: Math.min(L, W), t };
const FLAG_F: PartFamily<Flag> = {
  id: 'piece.pavingslab', name: 'Paving slab (concrete flag)', gloss: 'A precast concrete paving flag by its BS 7263-1 type, A to G (BS EN 1339 sizes)', domains: ['structural', 'everyday'], aisle: 'Building / Paving and kerbs',
  says: 'A precast concrete paving flag by its type and size ("B 600x600x50": BS 7263-1 types A to G, the UK sizes under BS EN 1339), lying flat, its length along x, its thickness up (y), its width along z: lay many in a row on a bed (Stack along x), a path, a patio. Drawn in the table\'s concrete (2400 kg/m³)',
  rows: FLAGS, size: 'B 600x600x50', source: 'BS 7263-1 flag types A to G (sizes and thicknesses), the UK sizes of BS EN 1339',
  recipe: (q, size) => made(`${size} flag`, 'concrete', { box: [mm(q.L), mm(q.t), mm(q.W)] }, { color: CONCRETE }),
  expect: (q) => ({ bound: [mm(q.L), mm(q.t), mm(q.W)], mass: mm(q.L) * mm(q.t) * mm(q.W) * rho('concrete'), tol: 0.01, massTol: 0.02, says: 'its work size; nominal mass, the flag in the table\'s concrete' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
const PAVERS: Record<string, { t: number }> = { '200x100x50': { t: 50 }, '200x100x60': { t: 60 }, '200x100x80': { t: 80 } };
const PAVER_F: PartFamily<{ t: number }> = {
  id: 'piece.blockpaver', name: 'Block paver (concrete)', gloss: 'A rectangular concrete block paver, 200 × 100, 50, 60 or 80 thick (BS EN 1338; the sizes sold, typical)', domains: ['structural', 'everyday'], aisle: 'Building / Paving and kerbs',
  says: 'A rectangular concrete block paver by its size ("200x100x60"; the sizes sold under BS EN 1338, typical), lying flat, 200 along x, its thickness up (y), 100 along z: a drive is many laid on sand (Stack along x, then z). Drawn in the table\'s concrete (2400 kg/m³), its chamfers not drawn',
  rows: PAVERS, size: '200x100x60', source: 'BS EN 1338 block pavers, the 200 × 100 sizes UK makers sell (typical)',
  recipe: (q, size) => made(`${size} paver`, 'concrete', { box: [mm(200), mm(q.t), mm(100)] }, { color: 0x8c6f62 }),
  expect: (q) => ({ bound: [mm(200), mm(q.t), mm(100)], mass: 0.2 * mm(q.t) * 0.1 * rho('concrete'), tol: 0.01, massTol: 0.02, says: 'its work size; nominal mass in the table\'s concrete' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
/** Precast concrete kerbs and edgings by BS 7263-1's profiles (BS EN 1340): width w by height h, mm, 915 long; their
 *  profiles' batters, splays and bullnose radius typical. */
type Kerb = { kind: 'HB' | 'SP' | 'BN' | 'EF'; w: number; h: number };
const KERBS: Record<string, Kerb> = { 'HB2 125x255': { kind: 'HB', w: 125, h: 255 }, 'HB1 150x305': { kind: 'HB', w: 150, h: 305 }, 'SP 150x305': { kind: 'SP', w: 150, h: 305 }, 'BN 125x255': { kind: 'BN', w: 125, h: 255 },
  'edging 50x150': { kind: 'EF', w: 50, h: 150 }, 'edging 50x200': { kind: 'EF', w: 50, h: 200 }, 'edging 50x250': { kind: 'EF', w: 50, h: 250 } };
const KERB_L = 915, BATTER: [number, number] = [25, 100], SPLAY = 50, NOSE = 50;
const kerbOutline = (q: Kerb): Pt[] => { const w = mm(q.w), h = mm(q.h);
  if (q.kind === 'HB') return [[0, 0], [w, 0], [w, h], [mm(BATTER[0]), h], [0, h - mm(BATTER[1])]];
  if (q.kind === 'SP') return [[0, 0], [w, 0], [w, h], [mm(SPLAY), h], [0, h - mm(SPLAY)]];
  if (q.kind === 'BN') return [[0, 0], [w, 0], [w, h], ...arc(mm(NOSE), h - mm(NOSE), mm(NOSE), 90, 180, 8)];
  return rect(w, h); };
const kerbArea = (q: Kerb) => { const A = mm(q.w) * mm(q.h); return q.kind === 'HB' ? A - (mm(BATTER[0]) * mm(BATTER[1])) / 2 : q.kind === 'SP' ? A - mm(SPLAY) ** 2 / 2 : q.kind === 'BN' ? A - (1 - Math.PI / 4) * mm(NOSE) ** 2 : A; };
const KERB_F: PartFamily<Kerb> = {
  id: 'piece.kerb', name: 'Kerb or edging (concrete)', gloss: 'A precast concrete kerb (half battered, splayed, bullnosed) or flat-top edging by its BS 7263-1 profile, 915 long', domains: ['structural', 'everyday'], aisle: 'Building / Paving and kerbs',
  says: 'A precast concrete kerb or edging by its profile and size ("HB2 125x255" half battered, "SP 150x305" splayed, "BN 125x255" bullnosed, "edging 50x150" flat top; BS 7263-1, BS EN 1340): its profile across (its road face at −x, its width x, its height up y), 915 mm along z; its batter, splay and nose typical. Lay a run end to end (Stack along z). Drawn in the table\'s concrete (2400 kg/m³)',
  rows: KERBS, size: 'HB2 125x255', source: 'BS 7263-1 kerb and edging profiles and sizes (BS EN 1340), 915 mm long; batters typical',
  recipe: (q, size) => sectionOf(`${size} kerb`, 'concrete', kerbOutline(q), mm(KERB_L), CONCRETE),
  expect: (q) => ({ bound: [mm(q.w), mm(q.h), mm(KERB_L)], mass: kerbArea(q) * mm(KERB_L) * rho('concrete'), tol: 0.01, massTol: 0.02, says: 'its width, height and 915 mm length; nominal mass, its profile in the table\'s concrete' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};

// ---- below-ground drainage: PVC-U pipe and fittings (EN 1401) --------------------------------------------------------
/** EN 1401-1 PVC-U pipe: outside diameter and least wall by stiffness class (SN2 SDR 51, SN4 SDR 41, SN8 SDR 34), mm. */
const EN1401: Record<number, Partial<Record<'SN2' | 'SN4' | 'SN8', number>>> = {
  110: { SN4: 3.2, SN8: 3.2 }, 125: { SN4: 3.2, SN8: 3.7 }, 160: { SN2: 3.2, SN4: 4.0, SN8: 4.7 }, 200: { SN2: 3.9, SN4: 4.9, SN8: 5.9 }, 250: { SN2: 4.9, SN4: 6.2, SN8: 7.3 },
  315: { SN2: 6.2, SN4: 7.7, SN8: 9.2 }, 400: { SN2: 7.9, SN4: 9.8, SN8: 11.7 }, 500: { SN2: 9.8, SN4: 12.3, SN8: 14.6 },
};
type Drain = { od: number; e: number };
const DRAIN_PIPES: Record<string, Drain> = {};
for (const [od, w] of Object.entries(EN1401)) for (const [sn, e] of Object.entries(w)) DRAIN_PIPES[`${od} ${sn}`] = { od: Number(od), e: e! };
/** A fitting's socket (typical of the makers' ring-seal sockets, drawn plain): its bore the pipe's outside and 0.5 mm, its
 *  wall the SN4 pipe's, as deep as these, mm; its spigot half its outside long. */
const SOCKET_DEPTH: Record<number, number> = { 110: 60, 125: 65, 160: 75, 200: 90 };
const fitE = (od: number) => EN1401[od]!.SN4!;
type Sk = { ri: number; ro: number; depth: number; pi: number; po: number; spig: number };
const skOf = (od: number): Sk => { const e = mm(fitE(od)), ri = mm(od / 2 + 0.5); return { ri, ro: ri + e, depth: mm(SOCKET_DEPTH[od]!), pi: mm(od / 2) - e, po: mm(od / 2), spig: mm(od / 2) }; };
const pvc = (name: string, ri: number, ro: number) => ({ name, mat: 'pvc', ri, ro, color: DRAIN });
const DRAIN_PIPE_F: PartFamily<Drain> = {
  id: 'piece.drainpipe', name: 'Drain pipe (PVC-U, EN 1401)', gloss: 'A PVC-U below-ground drain or sewer pipe (EN 1401-1) by its outside and stiffness class, 110 to 500 mm, SN2 to SN8, cut to a length', domains: ['pipelines', 'structural', 'everyday'], aisle: 'Building / Drainage',
  says: 'A PVC-U drain pipe by its outside and stiffness class ("110 SN4", "160 SN8": EN 1401-1, its least wall by SDR 51, 41 or 34), plain-ended, standing along y, so long. It offers its axis (`<size> drain pipe/axis`): it goes into a fitting\'s socket (Through a line along the socket\'s axis); lay a run of pipes and bends (Run of tube) to a fall',
  rows: DRAIN_PIPES, size: '110 SN4', source: 'EN 1401-1:2019 (outside diameters and least walls by stiffness class), re-keyed', settings: [lengthSet(3000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => made(`${size} drain pipe`, 'pvc', { tube: [mm(q.od / 2 - q.e), mm(q.od / 2), len(set)] }, { color: DRAIN }),
  expect: (q, _s, set) => ({ bound: [mm(q.od), len(set), mm(q.od)], mass: Math.PI * mm(q.od - q.e) * mm(q.e) * len(set) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass π(D − e)e at the table\'s PVC (1400 kg/m³)' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['110 SN4 drain pipe/axis'] } }],
};
type Bend = { od: number; deg: number };
const BENDS: Record<string, Bend> = {};
for (const od of [110, 160, 200]) for (const deg of [87.5, 45, 30, 15]) BENDS[`${od} ${deg}°`] = { od, deg };
const BEND_F: PartFamily<Bend> = {
  id: 'piece.drainbend', name: 'Drain bend (PVC-U, EN 1401)', gloss: 'A PVC-U single-socket drain bend, 110 to 200 mm, 87.5°, 45°, 30° or 15° (EN 1401 sizes; socket typical)', domains: ['pipelines', 'structural', 'everyday'], aisle: 'Building / Drainage',
  says: 'A PVC-U drain bend by its size and angle ("110 87.5°", "160 45°"): a run of its socket (the pipe goes in), its bend at a radius of its outside (short radius, typical) and its spigot (into the next socket), each offering its axis (`<size> bend socket/axis`, `… spigot/axis`). Its socket drawn plain, its ring seal not drawn',
  rows: BENDS, size: '110 87.5°', source: 'EN 1401 sizes; socket depth, wall and bend radius typical of the makers\' ring-seal fittings',
  recipe: (q, size) => { const k = skOf(q.od), n = `${size} bend`;
    return run(n, [{ ...pvc(`${n} socket`, k.ri, k.ro), straight: k.depth }, { ...pvc(`${n} body`, k.pi, k.po), bend: q.deg, R: mm(q.od) }, { ...pvc(`${n} spigot`, k.pi, k.po), straight: k.spig }] as RunSeg[]); },
  expect: (q) => { const k = skOf(q.od); return { mass: (annA(k.ri, k.ro) * k.depth + annA(k.pi, k.po) * (mm(q.od) * (q.deg * Math.PI) / 180 + k.spig)) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'nominal mass, its socket, its bend along its middle line and its spigot' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['110 87.5° bend socket/axis', '110 87.5° bend spigot/axis'] } }],
};
type Junction = { od: number; ob: number };
const JUNCTIONS: Record<string, Junction> = { '110 equal': { od: 110, ob: 110 }, '160 equal': { od: 160, ob: 160 }, '160x110': { od: 160, ob: 110 }, '200 equal': { od: 200, ob: 200 }, '200x160': { od: 200, ob: 160 }, '200x110': { od: 200, ob: 110 } };
const junctionDims = (q: Junction) => { const m = skOf(q.od), b = skOf(q.ob); return { m, b, body: 2 * b.ro + mm(2), arm: m.ro + mm(10) }; };
const JUNCTION_F: PartFamily<Junction> = {
  id: 'piece.drainjunction', name: 'Drain junction (PVC-U, EN 1401)', gloss: 'A PVC-U single-socket drain junction, 110 to 200 mm, equal or reducing, its branch square (EN 1401 sizes; socket typical)', domains: ['pipelines', 'structural', 'everyday'], aisle: 'Building / Drainage',
  says: 'A PVC-U drain junction by its run and branch ("110 equal", "160x110"): a run of its socket, its body and its spigot, its branch joined into the body\'s side (Branch into a side) and ending in its own socket; each socket and the spigot offers its axis (`<size> junction socket/axis`, `… branch socket/axis`, `… spigot/axis`). Its branch drawn square (its 2.5° fall not drawn), its sockets plain',
  rows: JUNCTIONS, size: '110 equal', source: 'EN 1401 sizes; sockets, walls and lengths typical of the makers\' ring-seal fittings',
  recipe: (q, size) => { const { m, b, body, arm } = junctionDims(q), n = `${size} junction`;
    const main = run(n, [{ ...pvc(`${n} socket`, m.ri, m.ro), straight: m.depth }, { ...pvc(`${n} body`, m.pi, m.po), straight: body }, { ...pvc(`${n} spigot`, m.pi, m.po), straight: m.spig }] as RunSeg[]);
    return branch(main, `${n} body/axis`, run(`${n} branch`, [{ ...pvc(`${n} branch body`, b.pi, b.po), straight: arm }, { ...pvc(`${n} branch socket`, b.ri, b.ro), straight: b.depth }] as RunSeg[]), 0); },
  // (its mass is not held to a row: the drawn mass (mass.ts) weighs the branch's hole through the run's wall as a whole
  // cylinder from the run's axis, its bore not allowed for, so the body weighs nothing and a junction is drawn about a
  // third light: 275.5 g drawn for the 110 equal, 437.9 g worked from its tubes. Reported for mass.ts, not tuned here)
  expect: (q) => { const { m, b, body, arm } = junctionDims(q);
    return { bound: [m.ro + arm + b.depth, m.depth + body + m.spig, 2 * m.ro], tol: 0.01, says: 'its reach: the run\'s socket, body and spigot, and the branch out to its socket\'s mouth (its mass not checked: mass.ts weighs a side hole through a bore as solid)' }; },
  tests: [{ inputs: {}, outputs: { pieces: 5, offers: ['110 equal junction body/axis', '110 equal junction branch body/axis', '110 equal junction branch socket/axis', '110 equal junction socket/axis', '110 equal junction spigot/axis'] } }],
};
type Coupler = { od: number; slip: boolean };
const COUPLERS: Record<string, Coupler> = {};
for (const od of [110, 125, 160, 200]) { COUPLERS[`${od} double socket`] = { od, slip: false }; COUPLERS[`${od} slip`] = { od, slip: true }; }
const STOP = 3;
const COUPLER_F: PartFamily<Coupler> = {
  id: 'piece.draincoupler', name: 'Drain coupler (PVC-U, EN 1401)', gloss: 'A PVC-U drain coupler, 110 to 200 mm: double socket (a stop between) or slip (none, to slide over a repair)', domains: ['pipelines', 'structural', 'everyday'], aisle: 'Building / Drainage',
  says: 'A PVC-U drain coupler by its size and kind ("110 double socket": two sockets and a 3 mm stop between, each socket offering its axis; "110 slip": one sleeve twice a socket deep, no stop, slid over a pipe to mend it): EN 1401 sizes, its sockets drawn plain (typical)',
  rows: COUPLERS, size: '110 double socket', source: 'EN 1401 sizes; sockets typical of the makers\' ring-seal fittings',
  recipe: (q, size) => { const k = skOf(q.od), n = `${size} coupler`;
    return q.slip ? made(n, 'pvc', { tube: [k.ri, k.ro, 2 * k.depth] }, { color: DRAIN })
      : run(n, [{ ...pvc(`${n} socket 1`, k.ri, k.ro), straight: k.depth }, { ...pvc(`${n} stop`, k.pi, k.ro), straight: mm(STOP) }, { ...pvc(`${n} socket 2`, k.ri, k.ro), straight: k.depth }] as RunSeg[]); },
  expect: (q) => { const k = skOf(q.od); return { bound: [2 * k.ro, 2 * k.depth + (q.slip ? 0 : mm(STOP)), 2 * k.ro], mass: (annA(k.ri, k.ro) * 2 * k.depth + (q.slip ? 0 : annA(k.pi, k.ro) * mm(STOP))) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its outside by its sockets (and stop); nominal mass, the tubes' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['110 double socket coupler socket 1/axis', '110 double socket coupler socket 2/axis', '110 double socket coupler stop/axis'] } }],
};

// ---- rainwater: gutters and downpipes (typical) ----------------------------------------------------------------------
/** PVC-U gutters by profile and size, as UK makers list them (typical of FloPlast, Marley, Brett Martin): its width W,
 *  depth (a deep or square one's), wall t, mm; their beads and clips not drawn. */
type Gutter = { kind: 'half' | 'deep' | 'square'; W: number; D: number; t: number };
const GUTTERS: Record<string, Gutter> = { 'half round 76': { kind: 'half', W: 76, D: 38, t: 1.8 }, 'half round 112': { kind: 'half', W: 112, D: 56, t: 2 }, 'half round 150': { kind: 'half', W: 150, D: 75, t: 2.5 }, 'deep 115': { kind: 'deep', W: 115, D: 75, t: 2 }, 'square 114': { kind: 'square', W: 114, D: 57, t: 2 } };
const gutterOutline = (q: Gutter): Pt[] => { const W = mm(q.W), D = mm(q.D), t = mm(q.t), R = W / 2;
  if (q.kind === 'half') return [...arc(0, 0, R, 180, 360, 24), ...arc(0, 0, R - t, 360, 180, 24)];
  if (q.kind === 'deep') { const r = R - t / 2, hs = D - R; return thick([[-r, hs], ...arc(0, 0, r, 180, 360, 24), [r, hs]], t); }
  return thick([[-R + t / 2, D], [-R + t / 2, t / 2], [R - t / 2, t / 2], [R - t / 2, D]], t); };
const gutterArea = (q: Gutter) => { const W = mm(q.W), D = mm(q.D), t = mm(q.t), R = W / 2;
  return q.kind === 'half' ? (Math.PI / 2) * (R * R - (R - t) ** 2) : q.kind === 'deep' ? (2 * (D - R) + Math.PI * (R - t / 2)) * t : (2 * (D - t / 2) + W - t) * t; };
const GUTTER_F: PartFamily<Gutter> = {
  id: 'piece.gutter', name: 'Gutter (PVC-U)', gloss: 'A PVC-U rainwater gutter by its profile and size: half round 76 to 150, deep 115, square 114 (typical), cut to a length', domains: ['structural', 'everyday', 'pipelines'], aisle: 'Building / Rainwater',
  says: 'A PVC-U gutter by its profile and size ("half round 112", "deep 115", "square 114"; typical of the UK makers\' ranges), open upward, cut to its length along z (sold 2 and 4 m); its beads and clips not drawn. It offers a line along its length in its channel (`<size> gutter/axis`); hang it on the fascia, a downpipe from its outlet',
  rows: GUTTERS, size: 'half round 112', source: 'PVC-U gutter profiles as UK makers list them (typical of the FloPlast, Marley and Brett Martin ranges)', settings: [lengthSet(4000)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => sectionOf(`${size} gutter`, 'pvc', gutterOutline(q), len(set), RAIN),
  expect: (q, _s, set) => ({ bound: [mm(q.W), mm(q.kind === 'half' ? q.W / 2 : q.D), len(set)], mass: gutterArea(q) * len(set) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its width and depth by its length; nominal mass, its wall at the table\'s PVC' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['half round 112 gutter/axis'] } }],
};
type Downpipe = { square: boolean; D: number; t: number };
const DOWNPIPES: Record<string, Downpipe> = { 'round 50': { square: false, D: 50, t: 1.6 }, 'round 68': { square: false, D: 68, t: 1.8 }, 'round 80': { square: false, D: 80, t: 2 }, 'round 110': { square: false, D: 110, t: 2.2 }, 'square 65': { square: true, D: 65, t: 1.8 } };
const DOWNPIPE_F: PartFamily<Downpipe> = {
  id: 'piece.downpipe', name: 'Downpipe (PVC-U)', gloss: 'A PVC-U rainwater downpipe, round 50 to 110 or square 65 (typical), cut to a length', domains: ['structural', 'everyday', 'pipelines'], aisle: 'Building / Rainwater',
  says: 'A PVC-U downpipe by its size ("round 68", "square 65"; typical of the UK makers\' ranges): a round one a tube standing along y, a square one a hollow section along z, cut to its length (sold 2.5 and 5.5 m). It offers its axis (`<size> downpipe/axis`): a clip slides over it, it goes into a gutter outlet or a drain\'s socket',
  rows: DOWNPIPES, size: 'round 68', source: 'PVC-U downpipes as UK makers list them (typical of the FloPlast, Marley and Brett Martin ranges)', settings: [lengthSet(2500)], cannot: (_r, _s, set) => noLength(set),
  recipe: (q, size, set) => (q.square ? sectionOf(`${size} downpipe`, 'pvc', boxOutline(mm(q.D), mm(q.D), mm(q.t)), len(set), RAIN) : made(`${size} downpipe`, 'pvc', { tube: [mm(q.D / 2 - q.t), mm(q.D / 2), len(set)] }, { color: RAIN })),
  expect: (q, _s, set) => (q.square ? sectionExpect(mm(q.D), mm(q.D), set, mm(q.D) ** 2 - mm(q.D - 2 * q.t) ** 2, 'pvc', 'its outside by its length; nominal mass, the square tube at the table\'s PVC')
    : { bound: [mm(q.D), len(set), mm(q.D)], mass: Math.PI * mm(q.D - q.t) * mm(q.t) * len(set) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass π(D − t)t at the table\'s PVC' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['round 68 downpipe/axis'] } }],
};

// ---- lintels and padstones (typical) -------------------------------------------------------------------------------
/** Prestressed concrete lintels by their section (width × depth, mm), as UK makers list them (typical of the Supreme and
 *  Naylor ranges), in lengths of 150 mm steps from 600 to 4800. */
const LINTELS: Record<string, { w: number; d: number }> = Object.fromEntries(([[100, 65], [140, 65], [215, 65], [100, 100], [140, 100], [215, 100], [100, 140], [140, 140], [100, 215], [140, 215]] as const).map(([w, d]) => [`${w}x${d}`, { w, d }]));
const LINTEL_F: PartFamily<{ w: number; d: number }> = {
  id: 'piece.lintel', name: 'Concrete lintel (prestressed)', gloss: 'A prestressed concrete lintel by its width and depth, 100x65 to 140x215, 600 to 4800 long in 150 mm steps (typical of makers\' tables)', domains: ['structural', 'everyday'], aisle: 'Structure / Lintels and padstones',
  says: 'A prestressed concrete lintel by its section ("100x140": its width across (x), its depth up (y); typical of the UK makers\' ranges), its length along z in 150 mm steps (600 to 4800): over a door or window, its ends on the wall each side (150 mm bearing, typical). Its strands not drawn. It offers a line along its length (`<size> lintel/axis`); drawn in the table\'s concrete (2400 kg/m³)',
  rows: LINTELS, size: '100x140', source: 'prestressed concrete lintels as UK makers list them (typical of the Supreme and Naylor ranges)', settings: [lengthSet(1200)],
  cannot: (_r, _s, set) => { const L = Number(set.length); return L >= 600 && L <= 4800 && L % 150 === 0 ? null : `a lintel is made 600 to 4800 mm long in 150 mm steps (${String(set.length)} mm)`; },
  recipe: (q, size, set) => sectionOf(`${size} lintel`, 'concrete', rect(mm(q.w), mm(q.d)), len(set), CONCRETE),
  expect: (q, _s, set) => sectionExpect(mm(q.w), mm(q.d), set, mm(q.w) * mm(q.d), 'concrete', 'its section by its length; nominal mass in the table\'s concrete'),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['100x140 lintel/axis'] } }],
};
const PADSTONES: Record<string, { L: number; W: number; H: number }> = Object.fromEntries(([[440, 215, 100], [440, 140, 100], [440, 100, 100], [215, 140, 100], [215, 215, 100]] as const).map(([L, W, H]) => [`${L}x${W}x${H}`, { L, W, H }]));
const PADSTONE_F: PartFamily<{ L: number; W: number; H: number }> = {
  id: 'piece.padstone', name: 'Concrete padstone', gloss: 'A precast concrete padstone under a beam or lintel end, 215x140x100 to 440x215x100 (typical)', domains: ['structural', 'everyday'], aisle: 'Structure / Lintels and padstones',
  says: 'A precast concrete padstone by its size ("440x215x100": length along x, width along z, height up y; typical of the UK makers\' ranges), set in the wall under a beam\'s or lintel\'s end to spread its load: put the beam onto it (Onto a face). Drawn in the table\'s concrete (2400 kg/m³)',
  rows: PADSTONES, size: '440x215x100', source: 'precast padstones as UK makers list them (typical)',
  recipe: (q, size) => made(`${size} padstone`, 'concrete', { box: [mm(q.L), mm(q.H), mm(q.W)] }, { color: CONCRETE }),
  expect: (q) => ({ bound: [mm(q.L), mm(q.H), mm(q.W)], mass: mm(q.L) * mm(q.H) * mm(q.W) * rho('concrete'), tol: 0.01, massTol: 0.02, says: 'its size; nominal mass in the table\'s concrete' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};

/** Every structure and building family of this file, as its rows and recipe, most used first. */
export const STRUCTURE_FAMILIES = [AL_ANGLE_F, AL_BOX_F, AL_TUBE_F, AL_CHANNEL_F, AL_TEE_F, AL_HEX_F, ST_TUBE_F, UPE_F, HEM_F, IPN_F, STEEL_TEE_F, C_PURLIN_F, Z_PURLIN_F, STRUT_F, STUD_F,
  GLULAM_F, LVL_F, IJOIST_F, BOARD_F, FLAG_F, PAVER_F, KERB_F, DRAIN_PIPE_F, BEND_F, JUNCTION_F, COUPLER_F, GUTTER_F, DOWNPIPE_F, LINTEL_F, PADSTONE_F] as PartFamily<unknown>[];
/** Their piece nodes (the maker's, one each), for parts/index.ts to put on the piece.* shelf. */
export const STRUCTURE_NODES: BlockDef[] = STRUCTURE_FAMILIES.map((f) => familyNode(f));
