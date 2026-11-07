// Vehicle and bicycle parts made by the table-driven maker (decision 0029, the user's words of 2026-11-06: "stop testing
// everything and just populate the library and abilities and just get shit done ... do the whole app roughly"). Built
// ROUGH: each family a table of rows and one recipe of the room operations (src/nexus/room.ts), no place written here.
// Every figure in every table is typical or recalled (written from memory of makers' catalogues and the common
// standards: ETRTO rims and tyres, ISO 5775, EIA/ISO threads, SAE wheel-bolt patterns, BCI battery groups), read from no
// source here, and said so in each family's `source`. A bought thing with no simple shape is its envelope (a box or a
// cylinder of its size) and says so. Threads are never drawn.
//
// Bicycle (aisle Bicycle / …): hubs, rims, spokes, nipples, tyres, crank arms, chainrings, cassettes, single sprockets,
// bottom brackets, pedals, saddles, seatposts, stems, handlebars, headset cups, forks, brake calipers, disc rotors,
// chain links, derailleurs, bells, grips, mudguards.
// Vehicle (aisle Vehicle / …): car wheels, car tyres, lug nuts, wheel hubs, brake discs, calipers, coil springs, shock
// absorbers, leaf springs, control arms, tie rod ends, ball joints, steering columns, seat frames, seat belt buckles,
// radiators, fuel tanks, exhaust pipes, mufflers, mirrors, headlamps, number plates, bumper beams, tow balls, hitch
// receivers, engine mounts, battery trays, pedals. Cut (decision 0029: two tries): the steering wheel, because no
// operation puts a boss inside a ring of spokes in their plane (Over a shaft wants the sleeve's bore wider than the
// spokes' tips) and a rim slid over the ring is refused because the ring's other copies "meet" it by their bounds.

import { into, made, onto, over, ring, run, stack, turn } from '../room';
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
const T = (pieces: number, more: Record<string, unknown> = {}, set?: Record<string, unknown>) => ({ ...(set ? { set } : {}), inputs: {}, outputs: { pieces, ...more } });
const DOM = ['mechanical', 'everyday', 'manufacturing'];
const B = (cat: string) => `Bicycle / ${cat}`, V = (cat: string) => `Vehicle / ${cat}`;
const STEEL = 0x8c9196, DARK = 0x2a2b2e, ALU = 0xc4c8cc, BLACK = 0x1c1c1c, BRASS = 0xc9a54a, RED = 0x9a2b2b;
/** A table written as rows of numbers: each row's name, then its figures under the keys given. */
function rowsOf<K extends string>(keys: readonly K[], rows: readonly (readonly [string, ...number[]])[]): Record<string, Record<K, number>> {
  return Object.fromEntries(rows.map(([name, ...v]) => [name, Object.fromEntries(keys.map((k, i) => [k, v[i]!])) as Record<K, number>]));
}
/** A closed outline with a hole in it, joined by a cut of no width (read even-odd): the outer outline, back to its first
 *  point, then the inner one the other way round and back to its own first point. */
const withHole = (outer: [number, number][], inner: [number, number][]): [number, number][] => { const i = [...inner].reverse(); return [...outer, outer[0]!, ...i, i[0]!]; };
const rect = (w: number, h: number): [number, number][] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
const M = (pts: [number, number][]): [number, number][] => pts.map(([a, b]) => [mm(a), mm(b)]);
/** A chain's pitch diameter for z teeth (1/2 in pitch), mm. */
const pdOf = (z: number, p = 12.7) => p / Math.sin(Math.PI / z);
const bound = (x: number, y: number, z: number): [number, number, number] => [x, y, z];

// ==== bicycle ========================================================================================================
type Hub = { old: number; axle: number; shell: number; flange: number; fw: number; body: number };
/** Hubs by their over-locknut width (mm): axle, shell and flange diameters typical; a freehub body (Shimano HG, 35 mm) on the rear. */
export const BK_HUBS = rowsOf(['old', 'axle', 'shell', 'flange', 'fw', 'body'] as const, [
  ['front 100 QR', 100, 9, 30, 38, 0, 0], ['front 100 disc', 100, 9, 32, 40, 0, 0], ['front 100×12 thru', 100, 12, 34, 44, 0, 0], ['front 110×15 boost', 110, 15, 36, 50, 0, 0],
  ['rear 130 freehub', 130, 10, 34, 44, 1, 35], ['rear 135 freehub', 135, 10, 34, 44, 1, 35], ['rear 135 disc', 135, 10, 36, 54, 1, 35], ['rear 142×12 thru', 142, 12, 36, 54, 1, 35], ['rear 148×12 boost', 148, 12, 38, 58, 1, 35],
]);
const hubLen = (q: Hub) => q.old - 20 - (q.fw ? 36 : 0);
const hubPts = (q: Hub): [number, number][] => { const rb = q.axle / 2 + 2, rs = q.shell / 2, rf = q.flange / 2, L = hubLen(q);
  return M([[rb, 0], [rs, 0], [rs, 6], [rf, 6], [rf, 9], [rs, 9], [rs, L - 9], [rf, L - 9], [rf, L - 6], [rs, L - 6], [rs, L], [rb, L]]); };
const BKHUB: PartFamily<Hub> = {
  id: 'piece.bkhub', name: 'Bicycle hub', gloss: 'A bicycle hub by its over-locknut width, front or rear with its freehub body (typical)', domains: DOM, aisle: B('Hubs'),
  says: 'A bicycle hub (typical): its shell turned about its axis with two spoke flanges, its bore the axle\'s (bearings, axle and locknuts not drawn; its length the over-locknut width less the locknuts), and on a rear hub its freehub body stacked on one end (`<size> freehub/axis`): a cassette slides over it (Over a shaft)',
  rows: BK_HUBS, size: 'rear 135 freehub', source: 'typical (recalled: 100/110 front, 130/135/142/148 rear over-locknut; HG freehub 35 mm)',
  recipe: (q, size) => { const shell = made(`${size} shell`, 'al-6061', { lathe: { pts: hubPts(q) } }, { color: ALU });
    return q.fw ? stack(`${size} hub`, 1, [{ b: shell }, { b: made(`${size} freehub`, 'steel-low', { tube: [mm(q.axle / 2 + 2), mm(q.body) / 2, mm(36)] }, { color: STEEL }) }]) : shell; },
  expect: (q) => ({ bound: bound(mm(q.flange), mm(hubLen(q) + (q.fw ? 36 : 0)), mm(q.flange)), mass: turnedVol(hubPts(q)) * rho('al-6061') + (q.fw ? annulus(mm(q.body), mm(q.axle + 4)) * mm(36) * rho('steel-low') : 0), tol: 0.01, massTol: 0.02, says: 'its flanges by its shell and freehub; nominal mass, the shell turned and the freehub tube' }),
  tests: [T(2, { offers: ['rear 135 freehub freehub/axis', 'rear 135 freehub shell/axis'] })],
};
type Rim = { D: number; W: number; H: number; n: number };
/** Rims by their ETRTO bead seat diameter and internal width (mm): section height and spoke count typical. */
export const BK_RIMS = rowsOf(['D', 'W', 'H', 'n'] as const, [
  ['622×19 (700c)', 622, 19, 24, 32], ['622×21', 622, 21, 25, 32], ['622×25 (29er)', 622, 25, 22, 32], ['622×30', 622, 30, 24, 28], ['584×25 (27.5)', 584, 25, 22, 32], ['571×19 (650c)', 571, 19, 22, 32],
  ['559×21 (26 in)', 559, 21, 20, 36], ['559×25', 559, 25, 22, 32], ['507×21 (24 in)', 507, 21, 20, 36], ['406×21 (20 in)', 406, 21, 20, 36], ['406×25 BMX', 406, 25, 18, 36],
]);
const rimPts = (q: Rim): [number, number][] => { const ro = q.D / 2 + 4, ri = ro - q.H, Wo = q.W + 5, t = 1.0;
  const box = (r0: number, r1: number, w: number): [number, number][] => [[r0, -w / 2], [r1, -w / 2], [r1, w / 2], [r0, w / 2]];
  return M(withHole(box(ri, ro, Wo), box(ri + t, ro - t, Wo - 2 * t))); };
const BKRIM: PartFamily<Rim> = {
  id: 'piece.bkrim', name: 'Bicycle rim', gloss: 'A bicycle rim by its ETRTO bead seat and internal width: 622, 584, 571, 559, 507, 406 (typical section)', domains: DOM, aisle: B('Rims'),
  says: 'A bicycle rim (ETRTO bead seat, recalled; section typical): a hollow box section 1 mm thick turned about its axis, its bead hooks 4 mm above the seat; its spoke holes and valve hole not drilled. A tyre of its bead seat goes round it; it offers `<size> rim/axis`',
  rows: BK_RIMS, size: '622×19 (700c)', source: 'ETRTO bead seats (recalled); widths, heights and spoke counts typical',
  recipe: (q, size) => made(`${size} rim`, 'al-6061', { lathe: { pts: rimPts(q) } }, { color: ALU }),
  expect: (q) => ({ bound: bound(mm(q.D + 8), mm(q.W + 5), mm(q.D + 8)), mass: turnedVol(rimPts(q)) * rho('al-6061'), tol: 0.01, massTol: 0.03, says: 'its hooks by its outside width; nominal mass, the hollow section turned' }),
  tests: [T(1, { offers: ['622×19 (700c) rim/axis'] })],
};
type Spoke = { L: number; d: number };
/** Spokes by length and gauge (mm, typical lengths of 254 to 306). */
export const BK_SPOKES = rowsOf(['L', 'd'] as const, [['254 × 2.0', 254, 2], ['260 × 2.0', 260, 2], ['264 × 2.0', 264, 2], ['270 × 2.0', 270, 2], ['280 × 2.0', 280, 2], ['286 × 2.0', 286, 2], ['290 × 1.8', 290, 1.8], ['294 × 2.0', 294, 2], ['298 × 2.0', 298, 2], ['302 × 2.0', 302, 2], ['306 × 2.0', 306, 2]]);
const BKSPOKE: PartFamily<Spoke> = {
  id: 'piece.bkspoke', name: 'Spoke', gloss: 'A bicycle spoke by its length and gauge, straight with its head (its J-bend not drawn; typical)', domains: DOM, aisle: B('Spokes'),
  says: 'A stainless spoke (typical): its shank of its gauge and length with its head on one end (its J-bend and thread not drawn); a nipple goes over its threaded end (Over a shaft)',
  rows: BK_SPOKES, size: '294 × 2.0', source: 'typical (recalled lengths and gauges)',
  recipe: (q, size) => stack(`${size} spoke`, 1, [{ b: made(`${size} spoke head`, 'steel-low', { cyl: [mm(2.2), mm(2)] }, { color: STEEL }) }, { b: made(`${size} spoke shank`, 'steel-low', { cyl: [mm(q.d) / 2, mm(q.L)] }, { color: STEEL }) }]),
  expect: (q) => ({ bound: bound(mm(4.4), mm(q.L + 2), mm(4.4)), mass: (disc(mm(4.4)) * mm(2) + disc(mm(q.d)) * mm(q.L)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its head by its length; nominal mass, head and shank' }),
  tests: [T(2)],
};
type Nipple = { L: number; af: number };
/** Spoke nipples by length and flats (mm, typical: 3.2 and 3.45 mm squares, 4.0 for 2.3 spokes). */
export const BK_NIPPLES = rowsOf(['L', 'af'] as const, [['12 mm 3.2 AF', 12, 3.2], ['14 mm 3.2 AF', 14, 3.2], ['16 mm 3.2 AF', 16, 3.2], ['12 mm 3.45 AF', 12, 3.45], ['14 mm 3.45 AF', 14, 3.45], ['14 mm 4.0 AF (2.3 spoke)', 14, 4]]);
const BKNIPPLE: PartFamily<Nipple> = {
  id: 'piece.bknipple', name: 'Spoke nipple', gloss: 'A brass spoke nipple by its length and flats (typical; its square drawn as a hex)', domains: DOM, aisle: B('Spokes'),
  says: 'A brass spoke nipple (typical): its head a flanged tube and its body a hex of its flats (a real one is square), bored 1.8 mm for the spoke (thread not drawn); it goes through a rim\'s spoke hole over the spoke',
  rows: BK_NIPPLES, size: '14 mm 3.2 AF', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} nipple`, 1, [{ b: made(`${size} nipple head`, 'brass', { tube: [mm(0.9), mm(2.6), mm(2.5)] }, { color: BRASS }) }, { b: made(`${size} nipple body`, 'brass', { hex: [mm(q.af), mm(q.L - 2.5), mm(0.9)] }, { color: BRASS }) }]),
  expect: (q) => ({ bound: bound(mm(5.2), mm(q.L), mm(5.2)), tol: 0.02, says: 'its head across by its length; mass not checked (a hex with a bore, read by the gauge)' }),
  tests: [T(2)],
};
type Tyre = { w: number; d: number };
/** Tyres by ETRTO section and bead (mm): the common road, gravel, MTB, 24, 20 and BMX sizes (recalled). */
export const BK_TYRES = rowsOf(['w', 'd'] as const, [['23-622', 23, 622], ['25-622', 25, 622], ['28-622', 28, 622], ['32-622', 32, 622], ['35-622', 35, 622], ['40-622', 40, 622], ['47-622 (29×1.85)', 47, 622], ['57-622 (29×2.25)', 57, 622],
  ['57-584 (27.5×2.25)', 57, 584], ['54-559 (26×2.1)', 54, 559], ['47-507 (24×1.75)', 47, 507], ['47-406 (20×1.75)', 47, 406], ['54-406 BMX', 54, 406]]);
const arc = (rc: number, rr: number, a0: number, a1: number, n: number): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [rc + rr * Math.cos(a), rr * Math.sin(a)]; });
const bkTyrePts = (q: Tyre): [number, number][] => { const rb = q.d / 2, rr = q.w / 2, rc = rb + rr, t = 4;
  const outer: [number, number][] = [[rb, -0.35 * q.w], ...arc(rc, rr, -140, 140, 28), [rb, 0.35 * q.w]], inner: [number, number][] = [[rb + 3, -(0.35 * q.w - 3)], ...arc(rc, rr - t, -140, 140, 28), [rb + 3, 0.35 * q.w - 3]];
  return M(withHole(outer, inner)); };
const BKTYRE: PartFamily<Tyre> = {
  id: 'piece.bktyre', name: 'Bicycle tyre', gloss: 'A bicycle tyre by its ETRTO size (section-bead): 23-622 to 54-406, its casing turned (typical)', domains: DOM, aisle: B('Tyres'),
  says: 'A bicycle tyre (ETRTO size, recalled): its casing a round section 4 mm thick turned about its axis, open at the beads (its tread, bead wires, plies and the air not drawn); it goes round a rim of its bead seat, offering `<size> tyre/axis`',
  rows: BK_TYRES, size: '25-622', source: 'ETRTO sizes (recalled); casing typical',
  recipe: (q, size) => made(`${size} tyre`, 'rubber', { lathe: { pts: bkTyrePts(q) } }, { color: BLACK }),
  expect: (q) => ({ bound: bound(mm(q.d + 2 * q.w), mm(q.w), mm(q.d + 2 * q.w)), mass: turnedVol(bkTyrePts(q)) * rho('rubber'), tol: 0.01, massTol: 0.03, says: 'its outside by its section; nominal mass, the casing turned' }),
  tests: [T(1, { offers: ['25-622 tyre/axis'] })],
};
type Crank = { L: number };
/** Crank arms by length (mm, centre to centre; the common 152 to 180). */
export const BK_CRANKS = rowsOf(['L'] as const, [['152 (junior)', 152], ['160', 160], ['165', 165], ['170', 170], ['172.5', 172.5], ['175', 175], ['177.5', 177.5], ['180', 180]]);
const BKCRANK: PartFamily<Crank> = {
  id: 'piece.bkcrank', name: 'Crank arm', gloss: 'A bicycle crank arm by its length, 152 to 180 mm, with its spindle and pedal holes (typical section)', domains: DOM, aisle: B('Cranks'),
  says: 'A crank arm (typical): a bar 30 × 14 mm, its spindle hole (24 mm, `<size> crank/spindle`) and its pedal hole (9/16 in, `<size> crank/pedal`) its length apart; a pedal\'s spindle goes through the pedal hole, a bottom bracket\'s spindle through the other (Through a line)',
  rows: BK_CRANKS, size: '172.5', source: 'typical (recalled lengths)',
  recipe: (q, size) => made(`${size} crank`, 'al-6061', { box: [mm(q.L + 36), mm(14), mm(30)] }, { color: BLACK, patterns: [{ name: 'spindle', points: [[-mm(q.L) / 2, 0]], hole: mm(12) }, { name: 'pedal', points: [[mm(q.L) / 2, 0]], hole: mm(7.2) }] }),
  expect: (q) => ({ bound: bound(mm(q.L + 36), mm(14), mm(30)), mass: (mm(q.L + 36) * mm(14) * mm(30) - (disc(mm(24)) + disc(mm(14.4))) * mm(14)) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its length past both holes; nominal mass, the bar less its holes' }),
  tests: [T(1, { offers: ['172.5 crank/pedal', '172.5 crank/spindle'] })],
};
type Ring = { z: number; bcd: number; n: number };
/** Chainrings by teeth and bolt circle (mm): 64, 74, 104, 110 and 130 BCD (recalled). */
export const BK_CHAINRINGS = rowsOf(['z', 'bcd', 'n'] as const, [['28T 64', 28, 64, 4], ['30T 74', 30, 74, 5], ['32T 104', 32, 104, 4], ['34T 110', 34, 110, 4], ['36T 110', 36, 110, 4], ['38T 104', 38, 104, 4], ['39T 130', 39, 130, 5], ['42T 104', 42, 104, 4], ['46T 110', 46, 110, 4], ['50T 110', 50, 110, 4], ['52T 110', 52, 110, 4], ['53T 130', 53, 130, 5]]);
const ringR = (q: Ring) => ({ ro: pdOf(q.z) / 2 + 2.5, ri: q.bcd / 2 - 7 });
const BKCHAINRING: PartFamily<Ring> = {
  id: 'piece.bkchainring', name: 'Chainring', gloss: 'A chainring by its teeth and bolt circle, 28T to 53T, its teeth not cut (typical)', domains: DOM, aisle: B('Chainrings'),
  says: 'A chainring (1/2 in pitch, its pitch diameter p / sin(π/z)): a plain ring 2.2 mm thick to its tooth tips (teeth not cut), its bolt holes on its bolt circle (`<size> chainring/bolts`); chainring bolts go through them into a crank\'s spider (Through a line)',
  rows: BK_CHAINRINGS, size: '50T 110', source: 'typical (recalled bolt circles); pitch diameter from the chain pitch',
  recipe: (q, size) => { const r = ringR(q); return made(`${size} chainring`, 'al-7075', { tube: [mm(r.ri), mm(r.ro), mm(2.2)] }, { color: BLACK, pattern: { name: 'bolts', circle: { n: q.n, r: mm(q.bcd) / 2 }, hole: mm(5.1) } }); },
  expect: (q) => { const r = ringR(q); return { bound: bound(mm(2 * r.ro), mm(2.2), mm(2 * r.ro)), mass: (annulus(mm(2 * r.ro), mm(2 * r.ri)) - q.n * disc(mm(10.2))) * mm(2.2) * rho('al-7075'), tol: 0.01, massTol: 0.02, says: 'its tooth tips by its thickness; nominal mass, the ring less its bolt holes' }; },
  tests: [T(1, { offers: ['50T 110 chainring/axis', '50T 110 chainring/bolts'] })],
};
type Cassette = { small: number; big: number; n: number };
/** Cassettes by range and speeds (recalled common ranges). */
export const BK_CASSETTES = rowsOf(['small', 'big', 'n'] as const, [['12-25 9s', 12, 25, 9], ['11-25 10s', 11, 25, 10], ['11-36 10s', 11, 36, 10], ['11-28 11s', 11, 28, 11], ['11-32 11s', 11, 32, 11], ['11-42 11s', 11, 42, 11], ['11-50 11s', 11, 50, 11], ['11-34 12s', 11, 34, 12], ['10-45 12s', 10, 45, 12], ['10-51 12s', 10, 51, 12]]);
const cogTeeth = (q: Cassette) => Array.from({ length: q.n }, (_, i) => Math.round(q.small + ((q.big - q.small) * i) / (q.n - 1))).reverse();
const BKCASSETTE: PartFamily<Cassette> = {
  id: 'piece.bkcassette', name: 'Cassette', gloss: 'A cassette by its range and speeds, each cog a plain ring, 9 to 12 speeds (typical)', domains: DOM, aisle: B('Cassettes'),
  says: 'A cassette (typical): its cogs stacked largest first, each a plain ring 1.6 mm thick to its tooth tips (teeth not cut; its steps spread evenly from the smallest to the largest, not a real progression), 1 mm apart where its spacers would be; it slides over a freehub body (Over a shaft)',
  rows: BK_CASSETTES, size: '11-28 11s', source: 'typical (recalled ranges)',
  recipe: (q, size) => stack(`${size} cassette`, 1, cogTeeth(q).map((z) => ({ b: made(`${size} cog ${z}T`, 'steel-low', { tube: [mm(17.5), mm(pdOf(z) / 2 + 2.5), mm(1.6)] }, { color: STEEL }), fit: 'clear' as const }))),
  expect: (q) => { const zs = cogTeeth(q), D = pdOf(q.big) + 5; return { bound: bound(mm(D), mm(1.6 * q.n + (q.n - 1)), mm(D)), mass: zs.reduce((s, z) => s + annulus(mm(pdOf(z) + 5), mm(35)) * mm(1.6), 0) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its largest cog by its stack; nominal mass, the rings' }; },
  tests: [T(11)],
};
type Cog = { z: number; t: number };
/** Single sprockets (1/2 in pitch) by teeth: 3/32 in (1.8 mm) and 1/8 in (3.0 mm) widths (typical). */
export const BK_COGS = rowsOf(['z', 't'] as const, [['11T', 11, 1.8], ['12T', 12, 1.8], ['13T', 13, 1.8], ['14T', 14, 1.8], ['15T', 15, 1.8], ['16T', 16, 1.8], ['17T', 17, 1.8], ['18T', 18, 1.8], ['19T', 19, 1.8], ['20T', 20, 1.8], ['22T', 22, 1.8], ['16T 1/8 in', 16, 3], ['18T 1/8 in', 18, 3]]);
const BKCOG: PartFamily<Cog> = {
  id: 'piece.bkcog', name: 'Bicycle sprocket', gloss: 'A single bicycle sprocket by its teeth, 11T to 22T, 3/32 or 1/8 in (typical; teeth not cut)', domains: DOM, aisle: B('Cassettes'),
  says: 'A single sprocket (1/2 in pitch): a plain ring to its tooth tips (teeth not cut), bored 34.8 mm for a freewheel thread or a freehub (its splines not drawn); it slides over a hub (Over a shaft)',
  rows: BK_COGS, size: '16T', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} sprocket`, 'steel-low', { tube: [mm(17.4), mm(pdOf(q.z) / 2 + 2.5), mm(q.t)] }, { color: STEEL }),
  expect: (q) => ({ bound: bound(mm(pdOf(q.z) + 5), mm(q.t), mm(pdOf(q.z) + 5)), mass: annulus(mm(pdOf(q.z) + 5), mm(34.8)) * mm(q.t) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its tips by its width; nominal mass, the ring' }),
  tests: [T(1, { offers: ['16T sprocket/axis'] })],
};
type BB = { W: number; D: number; d: number; cups: number };
/** Bottom brackets by shell: width, shell or cup outside, spindle (mm, recalled: BSA, ITA, BB30, PF30, BB86/92, T47, BB386). */
export const BK_BBS = rowsOf(['W', 'D', 'd', 'cups'] as const, [['BSA 68 (24 mm)', 68, 34.8, 24, 1], ['BSA 73 (24 mm)', 73, 34.8, 24, 1], ['BSA 68 square taper', 68, 34.8, 17, 0], ['ITA 70', 70, 36, 24, 1], ['BB30 68', 68, 42, 30, 0], ['PF30 68', 68, 46, 30, 0],
  ['BB86 (41×86.5)', 86.5, 41, 24, 0], ['BB92 (41×92)', 92, 41, 24, 0], ['T47 68', 68, 46, 30, 1], ['BB386 (46×86.5)', 86.5, 46, 30, 0]]);
const bbL = (q: BB) => q.W + 54;
const BKBB: PartFamily<BB> = {
  id: 'piece.bkbb', name: 'Bottom bracket', gloss: 'A bottom bracket by its shell standard: its spindle, its shell-width sleeve and outboard cups where it has them (typical)', domains: DOM, aisle: B('Bottom brackets'),
  says: 'A bottom bracket (recalled standards): its spindle (`<size> spindle/axis`) with a sleeve of the shell\'s outside slid over its middle and, where it has outboard cups, a flanged cup 15 mm from each end (bearings and threads not drawn); crank arms go through the spindle\'s ends (Through a line)',
  rows: BK_BBS, size: 'BSA 68 (24 mm)', source: 'typical (recalled shell standards)',
  recipe: (q, size) => { const ax = `${size} spindle/axis`, rb = mm(q.d / 2 + 2); let b = over(made(`${size} spindle`, 'steel-alloy', { cyl: [mm(q.d) / 2, mm(bbL(q))] }, { color: STEEL }), ax, made(`${size} sleeve`, 'al-6061', { tube: [rb, mm(q.D) / 2, mm(q.W)] }, { color: ALU }), 'mid', 'clear');
    if (q.cups) for (const f of ['lo', 'hi'] as const) b = over(b, ax, made(`${size} cup ${f}`, 'al-6061', { tube: [rb, mm(q.D / 2 + 4), mm(11)] }, { color: ALU }), { from: f, along: mm(15) }, 'clear'); return b; },
  expect: (q) => ({ bound: bound(mm(q.D + (q.cups ? 8 : 0)), mm(bbL(q)), mm(q.D + (q.cups ? 8 : 0))), mass: (disc(mm(q.d)) * mm(bbL(q))) * rho('steel-alloy') + (annulus(mm(q.D), mm(q.d + 4)) * mm(q.W) + (q.cups ? 2 * annulus(mm(q.D + 8), mm(q.d + 4)) * mm(11) : 0)) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its cups by its spindle; nominal mass, spindle, sleeve and cups' }),
  tests: [T(4, { offers: ['BSA 68 (24 mm) cup hi/axis', 'BSA 68 (24 mm) cup lo/axis', 'BSA 68 (24 mm) sleeve/axis', 'BSA 68 (24 mm) spindle/axis'] })],
};
type Pedal = { W: number; D: number; H: number; flat: number };
/** Pedals by body size (mm: across the spindle, fore-aft, thick; typical). */
export const BK_PEDALS = rowsOf(['W', 'D', 'H', 'flat'] as const, [['flat 100×95×18', 100, 95, 18, 1], ['flat 105×100×16', 105, 100, 16, 1], ['flat 110×105×14', 110, 105, 14, 1], ['flat 95×90×22 (city)', 95, 90, 22, 1], ['kids 80×70×20', 80, 70, 20, 1],
  ['clipless road 90×65×30', 90, 65, 30, 0], ['clipless MTB 70×60×35', 70, 60, 35, 0], ['clipless MTB 85×75×25 platform', 85, 75, 25, 0]]);
const BKPEDAL: PartFamily<Pedal> = {
  id: 'piece.bkpedal', name: 'Bicycle pedal', gloss: 'A bicycle pedal by its body size, flat (a tray) or clipless (a box), with its 9/16 in spindle (typical)', domains: DOM, aisle: B('Pedals'),
  says: 'A pedal (typical): its body a tray (flat) or a block (clipless; its mechanism not drawn) with its spindle out of one side (`<size> spindle/axis`, 9/16 in thread not drawn); the spindle goes through a crank arm\'s pedal hole (Through a line)',
  rows: BK_PEDALS, size: 'flat 100×95×18', source: 'typical (recalled)',
  recipe: (q, size) => onto(made(`${size} body`, 'al-6061', q.flat ? { case: [mm(q.W), mm(q.H), mm(q.D), mm(4), mm(4)] } : { box: [mm(q.W), mm(q.H), mm(q.D)] }, { color: BLACK }), '-x', turn(made(`${size} spindle`, 'steel-alloy', { cyl: [mm(7.1), mm(25)] }, { color: STEEL }), 2, 90), 'touch'),
  expect: (q) => ({ bound: bound(mm(q.W + 25), mm(Math.max(q.H, 14.2)), mm(q.D)), mass: (q.flat ? mm(q.W) * mm(q.H) * mm(q.D) - mm(q.W - 8) * mm(q.H - 4) * mm(q.D - 8) : mm(q.W) * mm(q.H) * mm(q.D)) * rho('al-6061') + disc(mm(14.2)) * mm(25) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its body and spindle; nominal mass, body and spindle' }),
  tests: [T(2)],
};
type Saddle = { L: number; W: number; H: number };
/** Saddles by length and width (mm; typical road, MTB, comfort, city, kids). */
export const BK_SADDLES = rowsOf(['L', 'W', 'H'] as const, [['road 275×130', 275, 130, 40], ['road short 245×143', 245, 143, 40], ['road 275×143', 275, 143, 40], ['MTB 280×135', 280, 135, 42], ['gravel 270×145', 270, 145, 42], ['comfort 260×180', 260, 180, 55], ['city 250×210', 250, 210, 60], ['kids 220×120', 220, 120, 35]]);
const railPts = (): [number, number][] => M([[0, 0], [51, 0], [51, 8], [44, 8], [44, 1], [7, 1], [7, 8], [0, 8]]);
const BKSADDLE: PartFamily<Saddle> = {
  id: 'piece.bksaddle', name: 'Saddle', gloss: 'A bicycle saddle by its length and width: its shell a padded block on its rails (an envelope; typical)', domains: DOM, aisle: B('Saddles'),
  says: 'A saddle (typical): its shell a padded block of its length and width on its rails, the two 7 mm rails 44 mm apart drawn as one U-section bar along it; a seatpost\'s head clamps the rails',
  rows: BK_SADDLES, size: 'road 275×130', source: 'typical (recalled)', envelope: 'its shell a box, its rails one U-section bar',
  recipe: (q, size) => stack(`${size} saddle`, 1, [{ b: turn(made(`${size} rails`, 'steel-low', { section: { pts: railPts(), L: mm(0.6 * q.L) } }, { color: STEEL }), 1, 90) }, { b: made(`${size} shell`, 'foam', { box: [mm(q.L), mm(q.H), mm(q.W)] }, { color: BLACK }) }]),
  expect: (q) => ({ bound: bound(mm(q.L), mm(q.H + 8), mm(q.W)), tol: 0.02, says: 'its length by its height with the rails by its width' }),
  tests: [T(2)],
};
type Post = { d: number; L: number };
/** Seatposts by diameter and length (mm; recalled common diameters). */
export const BK_SEATPOSTS = rowsOf(['d', 'L'] as const, [['25.4 × 300', 25.4, 300], ['27.2 × 350', 27.2, 350], ['27.2 × 400', 27.2, 400], ['28.6 × 350', 28.6, 350], ['30.9 × 400', 30.9, 400], ['30.9 × 450 dropper (envelope)', 30.9, 450], ['31.6 × 350', 31.6, 350], ['31.6 × 400', 31.6, 400], ['34.9 × 400', 34.9, 400]]);
const BKSEATPOST: PartFamily<Post> = {
  id: 'piece.bkseatpost', name: 'Seatpost', gloss: 'A seatpost by its diameter and length, 25.4 to 34.9 mm, with its saddle clamp head (typical)', domains: DOM, aisle: B('Seatposts'),
  says: 'A seatpost (typical): a tube of its diameter, 1.5 mm wall, its clamp head a block on top (its clamp bolts not drawn); it goes into a seat tube (Through a line on the tube\'s axis) and a saddle\'s rails sit in its head',
  rows: BK_SEATPOSTS, size: '27.2 × 350', source: 'typical (recalled diameters)',
  recipe: (q, size) => stack(`${size} seatpost`, 1, [{ b: made(`${size} post`, 'al-6061', { tube: [mm(q.d / 2 - 1.5), mm(q.d) / 2, mm(q.L)] }, { color: BLACK }) }, { b: made(`${size} head`, 'al-6061', { box: [mm(40), mm(20), mm(50)] }, { color: BLACK }) }]),
  expect: (q) => ({ bound: bound(mm(40), mm(q.L + 20), mm(50)), mass: (annulus(mm(q.d), mm(q.d - 3)) * mm(q.L) + mm(40) * mm(20) * mm(50)) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its head by its length; nominal mass, tube and head' }),
  tests: [T(2, { offers: ['27.2 × 350 post/axis'] })],
};
type Stem = { L: number; bar: number };
/** Stems by length and bar clamp (mm; 1-1/8 in steerer; recalled). */
export const BK_STEMS = rowsOf(['L', 'bar'] as const, [['50 × 35', 50, 35], ['60 × 31.8', 60, 31.8], ['70 × 31.8', 70, 31.8], ['80 × 31.8', 80, 31.8], ['90 × 25.4', 90, 25.4], ['90 × 31.8', 90, 31.8], ['100 × 31.8', 100, 31.8], ['110 × 31.8', 110, 31.8], ['120 × 31.8', 120, 31.8]]);
const stemExt = (q: Stem) => q.L - 19 - (q.bar / 2 + 4);
const BKSTEM: PartFamily<Stem> = {
  id: 'piece.bkstem', name: 'Stem', gloss: 'A bicycle stem by its length and bar clamp, for a 1-1/8 in steerer (typical)', domains: DOM, aisle: B('Stems'),
  says: 'A stem (typical, 1-1/8 in steerer): its steerer clamp a tube, its extension a bar out of its side, its bar clamp a tube across the end (clamp bolts and slots not drawn); it slides over a fork\'s steerer (Over a shaft), a handlebar through its bar clamp (Through a line)',
  rows: BK_STEMS, size: '90 × 31.8', source: 'typical (recalled)',
  cannot: (q) => (stemExt(q) >= 5 ? null : `its two clamps overlap at ${q.L} mm (the extension between them would be ${stemExt(q).toFixed(1)} mm)`),
  recipe: (q, size) => onto(onto(made(`${size} steerer clamp`, 'al-6061', { tube: [mm(14.4), mm(19), mm(40)] }, { color: BLACK }), '+x', made(`${size} extension`, 'al-6061', { box: [mm(stemExt(q)), mm(30), mm(30)] }, { color: BLACK }), 'touch'), '+x',
    turn(made(`${size} bar clamp`, 'al-6061', { tube: [mm(q.bar / 2 + 0.1), mm(q.bar / 2 + 4), mm(40)] }, { color: BLACK }), 0, 90), 'touch'),
  expect: (q) => ({ bound: bound(mm(38 + stemExt(q) + q.bar + 8), mm(Math.max(40, q.bar + 8)), mm(40)), mass: (annulus(mm(38), mm(28.8)) * mm(40) + mm(stemExt(q)) * mm(30) * mm(30) + annulus(mm(q.bar + 8), mm(q.bar + 0.2)) * mm(40)) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'clamp to clamp; nominal mass, two clamps and the extension' }),
  tests: [T(3)],
};
type Bar = { drop: number; W: number; clamp: number };
/** Handlebars: flat (and riser, drawn flat) by width and clamp, drop by width (mm; recalled). */
export const BK_BARS = rowsOf(['drop', 'W', 'clamp'] as const, [['flat 600 × 25.4', 0, 600, 25.4], ['flat 680 × 31.8', 0, 680, 31.8], ['flat 720 × 31.8', 0, 720, 31.8], ['riser 760 × 31.8 (flat drawn)', 0, 760, 31.8], ['flat 780 × 35', 0, 780, 35], ['flat 800 × 35', 0, 800, 35],
  ['drop 380 × 31.8', 1, 380, 31.8], ['drop 400 × 31.8', 1, 400, 31.8], ['drop 420 × 31.8', 1, 420, 31.8], ['drop 440 × 31.8', 1, 440, 31.8]]);
const BKBAR: PartFamily<Bar> = {
  id: 'piece.bkbar', name: 'Handlebar', gloss: 'A handlebar by its width and clamp: flat (22.2 mm ends, a bulge at the clamp), or drop with its hooks as boxes (typical)', domains: DOM, aisle: B('Handlebars'),
  says: 'A handlebar (typical): a 22.2 mm tube across, 2 mm wall, its clamp bulge slid over its middle, laid across (x); a drop bar\'s hooks are boxes beyond its ends (an envelope of reach 80 and drop 130). It goes through a stem\'s bar clamp (Through a line on `<size> bar/axis`); grips slide over its ends',
  rows: BK_BARS, size: 'flat 720 × 31.8', source: 'typical (recalled)',
  recipe: (q, size) => { const bar = turn(over(made(`${size} bar`, 'al-6061', { tube: [mm(9.1), mm(11.1), mm(q.W)] }, { color: BLACK }), `${size} bar/axis`, made(`${size} bulge`, 'al-6061', { tube: [mm(11.15), mm(q.clamp) / 2, mm(80)] }, { color: BLACK }), 'mid', 'touch'), 2, 90);
    if (!q.drop) return bar; const hook = (f: string) => made(`${size} hook ${f}`, 'al-6061', { box: [mm(40), mm(130), mm(80)] }, { color: BLACK }); return onto(onto(bar, '+x', hook('right'), 'touch'), '-x', hook('left'), 'touch'); },
  expect: (q) => ({ bound: q.drop ? bound(mm(q.W + 80), mm(130), mm(80)) : bound(mm(q.W), mm(q.clamp), mm(q.clamp)), ...(q.drop ? {} : { mass: (annulus(mm(22.2), mm(18.2)) * mm(q.W) + annulus(mm(q.clamp), mm(22.3)) * mm(80)) * rho('al-6061') }), tol: 0.01, massTol: 0.02, says: 'its width by its clamp (a drop bar by its hooks); nominal mass of a flat bar, tube and bulge' }),
  tests: [T(2, { offers: ['flat 720 × 31.8 bar/axis', 'flat 720 × 31.8 bulge/axis'] }), T(4, {}, { size: 'drop 420 × 31.8' })],
};
type Cup = { D: number; st: number; h: number };
/** Headset cups by SHIS code (mm; recalled): outside, the steerer it fits, height. */
export const BK_HEADSETS = rowsOf(['D', 'st', 'h'] as const, [['EC30/25.4 (1 in)', 30, 25.4, 11], ['EC34/28.6 (1-1/8 external)', 34, 28.6, 11], ['IS41/28.6', 41, 28.6, 6], ['IS42/28.6', 42, 28.6, 6], ['ZS44/28.6', 44, 28.6, 8], ['EC44/40 (lower)', 44, 40, 11], ['IS52/40 (lower)', 52, 40, 6], ['ZS56/40 (lower)', 56, 40, 8]]);
const cupPts = (q: Cup): [number, number][] => M([[q.st / 2 + 0.8, 0], [q.D / 2, 0], [q.D / 2, 2], [q.D / 2 - 3, 2], [q.D / 2 - 3, q.h], [q.st / 2 + 0.8, q.h]]);
const BKHEADSET: PartFamily<Cup> = {
  id: 'piece.bkheadset', name: 'Headset cup', gloss: 'One headset cup by its SHIS code (EC, ZS, IS; 1 in, 1-1/8, 1.5 in), its bearing not drawn (typical)', domains: DOM, aisle: B('Headsets'),
  says: 'A headset cup (SHIS codes recalled): a lipped ring turned about its axis, its bore the steerer\'s plus 0.8 mm (its bearing, race and seal not drawn); two make a headset: it goes into a head tube\'s end and a fork\'s steerer passes through it',
  rows: BK_HEADSETS, size: 'ZS44/28.6', source: 'typical (recalled SHIS sizes)',
  recipe: (q, size) => made(`${size} cup`, 'al-6061', { lathe: { pts: cupPts(q) } }, { color: BLACK }),
  expect: (q) => ({ bound: bound(mm(q.D), mm(q.h), mm(q.D)), mass: turnedVol(cupPts(q)) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its outside by its height; nominal mass, turned' }),
  tests: [T(1, { offers: ['ZS44/28.6 cup/axis'] })],
};
type Fork = { a2c: number; st: number; leg: number };
/** Forks by axle-to-crown (mm; recalled): steerer and leg diameters typical. */
export const BK_FORKS = rowsOf(['a2c', 'st', 'leg'] as const, [['BMX 1-1/8 330', 330, 28.6, 28], ['road 1-1/8 368', 368, 28.6, 28], ['road tapered 372', 372, 28.6, 30], ['gravel tapered 395', 395, 28.6, 32], ['hybrid 1-1/8 400', 400, 28.6, 30], ['MTB rigid 26 in 425', 425, 28.6, 32],
  ['MTB rigid 27.5 453', 453, 28.6, 32], ['MTB rigid 29 483', 483, 28.6, 32], ['suspension 100 mm 29 (envelope) 511', 511, 28.6, 36]]);
const BKFORK: PartFamily<Fork> = {
  id: 'piece.bkfork', name: 'Fork', gloss: 'A bicycle fork by its axle-to-crown: two straight legs, a crown and a 300 mm steerer (an envelope; typical)', domains: DOM, aisle: B('Forks'),
  says: 'A fork (typical): two straight legs in a ring 90 mm apart (its offset, dropouts and taper not drawn), its crown a block on them, its steerer a 1-1/8 in tube up from the crown (`<size> steerer/axis`); a stem slides over the steerer (Over a shaft), a hub goes between the legs',
  rows: BK_FORKS, size: 'road 1-1/8 368', source: 'typical (recalled axle-to-crown lengths)', envelope: 'straight legs, a block crown, a plain steerer',
  recipe: (q, size) => stack(`${size} fork`, 1, [{ b: ring(`${size} legs`, made(`${size} leg`, 'al-6061', { cyl: [mm(q.leg) / 2, mm(q.a2c - 30)] }, { color: BLACK }), 2, mm(45), 'clear') }, { b: made(`${size} crown`, 'al-6061', { box: [mm(100 + q.leg), mm(30), mm(q.leg + 10)] }, { color: BLACK }) },
    { b: made(`${size} steerer`, 'al-6061', { tube: [mm(q.st / 2 - 1.5), mm(q.st) / 2, mm(300)] }, { color: ALU }) }]),
  expect: (q) => ({ bound: bound(mm(100 + q.leg), mm(q.a2c + 300), mm(q.leg + 10)), tol: 0.01, says: 'its crown by its axle-to-crown and steerer' }),
  tests: [T(4, { offers: ['road 1-1/8 368 leg/axis', 'road 1-1/8 368 legs/axis', 'road 1-1/8 368 steerer/axis'] })],
};
type Box3 = { W: number; H: number; D: number };
const boxRows = (rows: readonly (readonly [string, number, number, number])[]) => rowsOf(['W', 'H', 'D'] as const, rows);
const boxFamily = (o: { id: string; name: string; gloss: string; aisle: string; says: string; rows: Record<string, Box3>; size: string; mat: string; color: number; envelope: string }): PartFamily<Box3> => ({
  id: o.id, name: o.name, gloss: o.gloss, domains: DOM, aisle: o.aisle, says: o.says, rows: o.rows, size: o.size, source: 'typical (recalled)', envelope: o.envelope,
  recipe: (q, size) => made(`${size} ${o.name.toLowerCase()}`, o.mat, { box: [mm(q.W), mm(q.H), mm(q.D)] }, { color: o.color }),
  expect: (q) => ({ bound: bound(mm(q.W), mm(q.H), mm(q.D)), tol: 0.01, says: 'its box' }),
  tests: [T(1)],
});
/** Brake calipers' envelopes (mm: across, tall, deep; typical). */
export const BK_BRAKES = boxRows([['rim dual pivot 39-49 reach', 90, 55, 40], ['rim dual pivot 47-57 long reach', 100, 65, 40], ['rim V-brake 110 (both arms)', 110, 100, 40], ['rim cantilever', 120, 70, 40], ['disc post mount 2-piston', 80, 55, 35], ['disc flat mount 2-piston', 80, 45, 30], ['disc post mount 4-piston', 90, 60, 40], ['disc mechanical cable', 85, 60, 40]]);
const BKBRAKE = boxFamily({ id: 'piece.bkbrake', name: 'Bicycle brake caliper', gloss: 'A bicycle brake caliper, rim or disc, as its envelope (typical)', aisle: B('Brakes'), rows: BK_BRAKES, size: 'disc post mount 2-piston', mat: 'al-6061', color: BLACK,
  says: 'A brake caliper (typical): its envelope, a box of its size (arms, pistons, pads and mounts not drawn); it bolts to a fork or frame mount', envelope: 'a box of its size' });
type Rotor = { D: number; bolts: number };
/** Disc rotors by diameter (mm): 6-bolt (44 mm circle) and centre lock (recalled). */
export const BK_ROTORS = rowsOf(['D', 'bolts'] as const, [['140 6-bolt', 140, 1], ['160 6-bolt', 160, 1], ['180 6-bolt', 180, 1], ['203 6-bolt', 203, 1], ['220 6-bolt', 220, 1], ['140 centre lock', 140, 0], ['160 centre lock', 160, 0], ['180 centre lock', 180, 0]]);
const BKROTOR: PartFamily<Rotor> = {
  id: 'piece.bkrotor', name: 'Disc rotor', gloss: 'A bicycle disc rotor by its diameter, 140 to 220 mm, 6-bolt or centre lock, drawn as a plain ring (typical)', domains: DOM, aisle: B('Brakes'),
  says: 'A disc rotor (typical): a stainless ring 1.8 mm thick, 6-bolt with its M5 holes on a 44 mm circle (`<size> rotor/bolts`) or centre lock with its splined bore (splines not drawn); its braking track\'s slots and its arms not cut. Rotor bolts go through it into a hub (Through a line)',
  rows: BK_ROTORS, size: '160 6-bolt', source: 'typical (recalled)', envelope: 'a plain ring: its slots and arms not cut, so heavier than a real rotor',
  recipe: (q, size) => made(`${size} rotor`, 'steel-low', { tube: [mm(q.bolts ? 17 : 16.5), mm(q.D) / 2, mm(1.8)] }, { color: STEEL, ...(q.bolts ? { pattern: { name: 'bolts', circle: { n: 6, r: mm(22) }, hole: mm(2.65) } } : {}) }),
  expect: (q) => ({ bound: bound(mm(q.D), mm(1.8), mm(q.D)), tol: 0.01, says: 'its diameter by its thickness' }),
  tests: [T(1, { offers: ['160 6-bolt rotor/axis', '160 6-bolt rotor/bolts'] })],
};
type Link = { wi: number; wo: number };
/** Chain inner links (1/2 in pitch) by speed: inner and outer widths (mm; recalled). */
export const BK_LINKS = rowsOf(['wi', 'wo'] as const, [['1/8 in single speed', 7.8, 9], ['1/2 × 3/16 (BMX wide)', 8.5, 10], ['3/32 in 6-8 speed', 6.5, 7.3], ['9-speed', 6.1, 6.6], ['10-speed', 5.6, 5.9], ['11-speed', 5.3, 5.5], ['12-speed', 5, 5.25]]);
const BKCHAINLINK: PartFamily<Link> = {
  id: 'piece.bkchainlink', name: 'Chain link', gloss: 'One inner link of a 1/2 in pitch bicycle chain by its speed: two rollers in a ring, a plate each side (typical)', domains: DOM, aisle: B('Chain'),
  says: 'A chain\'s inner link (1/2 in pitch; widths recalled): two 7.8 mm rollers a pitch apart in a ring (`<size> rollers/axis`), an inner plate laid on each side with its pin holes (`<size> plate …/pins`; pins and bushes not drawn); links join pin to pin',
  rows: BK_LINKS, size: '11-speed', source: 'typical (recalled widths)',
  recipe: (q, size) => { const t = (q.wo - q.wi) / 2, plate = (f: string) => made(`${size} plate ${f}`, 'steel-alloy', { box: [mm(20.6), mm(t), mm(8)] }, { color: STEEL, pattern: { name: 'pins', points: [[-mm(6.35), 0], [mm(6.35), 0]], hole: mm(1.85) } });
    const rollers = ring(`${size} rollers`, made(`${size} roller`, 'steel-alloy', { cyl: [mm(3.9), mm(q.wi)] }, { color: STEEL }), 2, mm(6.35), 'clear'); return onto(onto(rollers, '+y', plate('top'), 'touch'), '-y', plate('bottom'), 'touch'); },
  expect: (q) => { const t = (q.wo - q.wi) / 2; return { bound: bound(mm(20.6), mm(q.wo), mm(8)), mass: (2 * disc(mm(7.8)) * mm(q.wi) + 2 * (mm(20.6) * mm(8) - 2 * disc(mm(3.7))) * mm(t)) * rho('steel-alloy'), tol: 0.02, massTol: 0.03, says: 'its plates by its outer width; nominal mass, rollers and plates less pin holes' }; },
  tests: [T(4)],
};
/** Derailleurs' envelopes (mm: across, tall, deep; typical). */
export const BK_MECHS = boxRows([['rear short cage', 80, 120, 40], ['rear medium cage', 85, 150, 42], ['rear long cage', 90, 180, 45], ['rear 12-speed long cage clutch', 95, 190, 48], ['rear electronic', 90, 160, 50], ['front braze-on', 60, 110, 40], ['front clamp 31.8', 70, 110, 42], ['front clamp 34.9', 70, 110, 45]]);
const BKMECH = boxFamily({ id: 'piece.bkmech', name: 'Derailleur', gloss: 'A derailleur, rear by cage or front by mount, as its envelope (typical)', aisle: B('Derailleurs'), rows: BK_MECHS, size: 'rear medium cage', mat: 'al-6061', color: BLACK,
  says: 'A derailleur (typical): its envelope, a box of its size (its parallelogram, cage, pulleys and spring not drawn); it hangs from a frame\'s hanger or clamps a seat tube', envelope: 'a box of its size' });
type Bell = { D: number };
/** Bells by dome diameter (mm, typical). */
export const BK_BELLS = rowsOf(['D'] as const, [['Ø22 mini', 22], ['Ø28', 28], ['Ø32', 32], ['Ø40', 40], ['Ø50 classic', 50], ['Ø55 ding-dong', 55]]);
const BKBELL: PartFamily<Bell> = {
  id: 'piece.bkbell', name: 'Bicycle bell', gloss: 'A bicycle bell by its dome, 22 to 55 mm, on its clamp base (an envelope; typical)', domains: DOM, aisle: B('Bells'),
  says: 'A bell (typical): a brass dome on a steel clamp base (its striker, spring and clamp bolt not drawn; the dome solid where a real one is a shell); its base clamps a handlebar',
  rows: BK_BELLS, size: 'Ø32', source: 'typical (recalled)', envelope: 'its dome solid, its base a block',
  recipe: (q, size) => stack(`${size} bell`, 1, [{ b: made(`${size} base`, 'steel-low', { box: [mm(30), mm(8), mm(24)] }, { color: BLACK }) }, { b: made(`${size} dome`, 'brass', { dome: [mm(q.D) / 2] }, { color: BRASS }) }]),
  expect: (q) => ({ bound: bound(mm(Math.max(30, q.D)), mm(8 + q.D / 2), mm(Math.max(24, q.D))), tol: 0.01, says: 'its base or dome across, by base and dome' }),
  tests: [T(2)],
};
type Grip = { L: number; D: number };
/** Grips by length and outside (mm, for 22.2 mm bars; typical). */
export const BK_GRIPS = rowsOf(['L', 'D'] as const, [['90 × Ø30 (short, twist shifter)', 90, 30], ['115 × Ø30 kids', 115, 30], ['125 × Ø29 lock-on', 125, 29], ['130 × Ø30', 130, 30], ['130 × Ø32', 130, 32], ['135 × Ø34 soft', 135, 34], ['140 × Ø32 ergonomic (round drawn)', 140, 32]]);
const BKGRIP: PartFamily<Grip> = {
  id: 'piece.bkgrip', name: 'Grip', gloss: 'A handlebar grip by its length and outside, for a 22.2 mm bar (typical)', domains: DOM, aisle: B('Grips'),
  says: 'A rubber grip (typical): a tube bored 22.4 mm for a 22.2 mm bar end (its pattern and lock rings not drawn); it slides over a flat bar\'s end (Over a shaft)',
  rows: BK_GRIPS, size: '130 × Ø30', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} grip`, 'rubber', { tube: [mm(11.2), mm(q.D) / 2, mm(q.L)] }, { color: BLACK }),
  expect: (q) => ({ bound: bound(mm(q.D), mm(q.L), mm(q.D)), mass: annulus(mm(q.D), mm(22.4)) * mm(q.L) * rho('rubber'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [T(1, { offers: ['130 × Ø30 grip/axis'] })],
};
type Guard = { d: number; W: number; a: number };
/** Mudguards by wheel and width (mm, degrees covered; typical). */
export const BK_MUDGUARDS = rowsOf(['d', 'W', 'a'] as const, [['20 in × 45', 406, 45, 120], ['24 in × 50', 507, 50, 120], ['26 in × 50', 559, 50, 120], ['27.5 in × 65', 584, 65, 110], ['700c × 35', 622, 35, 110], ['700c × 45', 622, 45, 120], ['700c × 55 gravel', 622, 55, 120], ['29 in × 65', 622, 65, 110]]);
const BKMUDGUARD: PartFamily<Guard> = {
  id: 'piece.bkmudguard', name: 'Mudguard', gloss: 'A mudguard by its wheel and width, an arc 40 mm outside the bead seat (an envelope: a strip drawn as a bent thin tube; typical)', domains: DOM, aisle: B('Mudguards'),
  says: 'A mudguard (typical): a strip of its width bent round the wheel 40 mm outside the bead seat through its angle, drawn as a thin bent tube of its width (an envelope: a strip is flat, this is round); its stays and clips not drawn',
  rows: BK_MUDGUARDS, size: '700c × 45', source: 'typical (recalled)', envelope: 'a bent thin tube in place of a bent strip',
  recipe: (q, size) => made(`${size} mudguard`, 'abs', { bend: [mm(q.d / 2 + 40), mm(q.W) / 2, q.a, mm(q.W / 2 - 0.8)] }, { color: BLACK }),
  tests: [T(1)],
};

// ==== vehicle ========================================================================================================
type Wheel = { D: number; W: number; n: number; pcd: number; bore: number };
/** Car wheels (rims) by diameter and width in inches and bolt pattern (mm; recalled common fitments). */
export const CAR_WHEELS = rowsOf(['D', 'W', 'n', 'pcd', 'bore'] as const, [['14×5.5 4×100', 14, 5.5, 4, 100, 56.1], ['15×6 4×100', 15, 6, 4, 100, 56.1], ['15×6 5×114.3', 15, 6, 5, 114.3, 67.1], ['16×6.5 5×114.3', 16, 6.5, 5, 114.3, 67.1], ['16×7 5×112', 16, 7, 5, 112, 57.1],
  ['17×7 5×112', 17, 7, 5, 112, 57.1], ['17×7.5 5×114.3', 17, 7.5, 5, 114.3, 67.1], ['17×8 6×139.7', 17, 8, 6, 139.7, 106.1], ['18×8 5×120', 18, 8, 5, 120, 72.6], ['18×8 6×139.7', 18, 8, 6, 139.7, 106.1], ['19×8.5 5×112', 19, 8.5, 5, 112, 66.5], ['20×9 5×120', 20, 9, 5, 120, 72.6]]);
const wheelPts = (q: Wheel): [number, number][] => { const rs = (25.4 * q.D) / 2, rbo = rs + 2, rbi = rs - 6, Wmm = 25.4 * q.W + 25, y1 = Wmm - 62, y2 = Wmm - 50, rb = q.bore / 2;
  return M([[rb, y1], [rbi, y1], [rbi, 0], [rbo, 0], [rbo, Wmm], [rbi, Wmm], [rbi, y2], [rb, y2]]); };
const CARWHEEL: PartFamily<Wheel> = {
  id: 'piece.carwheel', name: 'Car wheel', gloss: 'A car wheel (alloy rim) by its diameter and width in inches and its bolt pattern, 14 to 20 in (typical)', domains: DOM, aisle: V('Wheels'),
  says: 'A cast alloy wheel (typical; bolt patterns recalled): its barrel a tube 8 mm thick from flange to flange (drop centre and bead seats not drawn) and its face a plain disc 12 mm thick 50 mm in from the outer face (spokes not cut), bored to its centre bore, its bolt holes on its pitch circle (`<size> wheel/bolts`); a tyre of its diameter goes round it, lug nuts on a hub\'s studs through its holes',
  rows: CAR_WHEELS, size: '17×7.5 5×114.3', source: 'typical (recalled fitments and bolt patterns)',
  recipe: (q, size) => made(`${size} wheel`, 'al-a380', { lathe: { pts: wheelPts(q) } }, { color: ALU, pattern: { name: 'bolts', circle: { n: q.n, r: mm(q.pcd) / 2 }, hole: mm(7) } }),
  expect: (q) => ({ bound: bound(mm(25.4 * q.D + 4), mm(25.4 * q.W + 25), mm(25.4 * q.D + 4)), tol: 0.01, says: 'its flanges by its width; mass not checked: the gauge weighs each bolt hole as a cylinder the whole wheel high, not the disc\'s 12 mm (fault noted, decision 0029)' }),
  tests: [T(1, { offers: ['17×7.5 5×114.3 wheel/axis', '17×7.5 5×114.3 wheel/bolts'] })],
};
type CarTyre = { w: number; a: number; R: number };
/** Car tyres by their size code (section mm, aspect %, rim in; recalled common sizes). */
export const CAR_TYRES = rowsOf(['w', 'a', 'R'] as const, [['175/65 R14', 175, 65, 14], ['185/60 R15', 185, 60, 15], ['195/65 R15', 195, 65, 15], ['205/55 R16', 205, 55, 16], ['215/60 R17', 215, 60, 17], ['225/45 R17', 225, 45, 17], ['235/40 R18', 235, 40, 18], ['245/35 R19', 245, 35, 19],
  ['255/55 R18', 255, 55, 18], ['265/70 R16', 265, 70, 16], ['275/40 R20', 275, 40, 20], ['31×10.5 R15 (267/75)', 267, 75, 15]]);
const carTyrePts = (q: CarTyre): [number, number][] => { const rb = (25.4 * q.R) / 2, h = (q.w * q.a) / 100, ro = rb + h, w = q.w, wb = 0.75 * w, ts = 6, tt = 12;
  const outer: [number, number][] = [[rb, -wb / 2], [rb + 0.15 * h, -w / 2], [rb + 0.85 * h, -w / 2], [ro, -0.42 * w], [ro, 0.42 * w], [rb + 0.85 * h, w / 2], [rb + 0.15 * h, w / 2], [rb, wb / 2]];
  const inner: [number, number][] = [[rb + 8, -(wb / 2 - ts)], [rb + 0.15 * h + ts, -(w / 2 - ts)], [rb + 0.85 * h - ts, -(w / 2 - ts)], [ro - tt, -(0.42 * w - ts)], [ro - tt, 0.42 * w - ts], [rb + 0.85 * h - ts, w / 2 - ts], [rb + 0.15 * h + ts, w / 2 - ts], [rb + 8, wb / 2 - ts]];
  return M(withHole(outer, inner)); };
const CARTYRE: PartFamily<CarTyre> = {
  id: 'piece.cartyre', name: 'Car tyre', gloss: 'A car tyre by its size code (205/55 R16 and the like), its casing turned: 14 to 20 in rims (typical)', domains: DOM, aisle: V('Wheels'),
  says: 'A car tyre (size codes recalled): its casing turned about its axis, 12 mm thick at the tread and 6 at the sidewalls, open at the beads (tread pattern, plies, belts, bead wires and the air not drawn); its section height its width × aspect; it goes round a wheel of its rim diameter, offering `<size> tyre/axis`',
  rows: CAR_TYRES, size: '205/55 R16', source: 'typical (recalled sizes); casing thickness typical',
  recipe: (q, size) => made(`${size} tyre`, 'rubber', { lathe: { pts: carTyrePts(q) } }, { color: BLACK }),
  expect: (q) => { const D = 25.4 * q.R + (2 * q.w * q.a) / 100; return { bound: bound(mm(D), mm(q.w), mm(D)), mass: turnedVol(carTyrePts(q)) * rho('rubber'), tol: 0.01, massTol: 0.03, says: 'its outside by its section; nominal mass, the casing turned' }; },
  tests: [T(1, { offers: ['205/55 R16 tyre/axis'] })],
};
type Lug = { d: number; af: number; H: number };
/** Lug nuts by thread and hex (mm; recalled). */
export const LUG_NUTS = rowsOf(['d', 'af', 'H'] as const, [['M12×1.5 19 AF', 12, 19, 25], ['M12×1.5 21 AF', 12, 21, 25], ['M12×1.25 19 AF', 12, 19, 25], ['M12×1.25 21 AF', 12, 21, 25], ['M14×1.5 21 AF', 14, 21, 28], ['M14×1.5 22 AF', 14, 22, 28], ['M14×1.5 17 AF (tuner)', 14, 17, 30], ['1/2-20 19 AF', 12.7, 19, 25], ['1/2-20 21 AF', 12.7, 21, 25]]);
const lugCone = (q: Lug) => { const r1 = q.d / 2 + 0.5, r2 = q.af / 2; return { r1, r2, h: (r2 - r1) * Math.tan(Math.PI / 3) }; };
const LUGNUT: PartFamily<Lug> = {
  id: 'piece.lugnut', name: 'Lug nut', gloss: 'A wheel lug nut by its thread and hex, 60° cone seat: M12, M14, 1/2-20 (typical)', domains: DOM, aisle: V('Wheels'),
  says: 'A lug nut (typical): its 60° cone seat under its hex, bored its thread\'s size (thread not drawn); it slides over a hub\'s wheel stud (Over a shaft) and seats in a wheel\'s bolt hole',
  rows: LUG_NUTS, size: 'M12×1.5 19 AF', source: 'typical (recalled)',
  recipe: (q, size) => { const c = lugCone(q); return stack(`${size} lug nut`, 1, [{ b: made(`${size} seat`, 'steel-alloy', { cone: [mm(c.r1), mm(c.r2), mm(c.h), mm(q.d) / 2] }, { color: STEEL }) }, { b: made(`${size} hex`, 'steel-alloy', { hex: [mm(q.af), mm(q.H - c.h), mm(q.d) / 2] }, { color: STEEL }) }]); },
  expect: (q) => ({ bound: bound(mm((2 * q.af) / Math.sqrt(3)), mm(q.H), mm((2 * q.af) / Math.sqrt(3))), tol: 0.02, says: 'its corners by its height' }),
  tests: [T(2)],
};
type Hub2 = { n: number; pcd: number; pilot: number; bore: number };
/** Wheel hubs by bolt pattern, pilot and axle bore (mm; recalled). */
export const WHEEL_HUBS = rowsOf(['n', 'pcd', 'pilot', 'bore'] as const, [['4×100 Ø56.1', 4, 100, 56.1, 30], ['5×100 Ø57.1', 5, 100, 57.1, 30], ['5×108 Ø63.4', 5, 108, 63.4, 32], ['5×112 Ø57.1', 5, 112, 57.1, 32], ['5×112 Ø66.5', 5, 112, 66.5, 32], ['5×114.3 Ø67.1', 5, 114.3, 67.1, 32], ['5×120 Ø72.6', 5, 120, 72.6, 35], ['5×130 Ø71.6', 5, 130, 71.6, 35], ['6×139.7 Ø106.1', 6, 139.7, 106.1, 40]]);
const hub2Pts = (q: Hub2): [number, number][] => M([[q.bore / 2, 0], [q.pcd / 2 + 14, 0], [q.pcd / 2 + 14, 12], [q.pilot / 2, 12], [q.pilot / 2, 60], [q.bore / 2, 60]]);
const WHEELHUB: PartFamily<Hub2> = {
  id: 'piece.wheelhub', name: 'Wheel hub', gloss: 'A car wheel hub by its bolt pattern and pilot: a flange with its stud holes and a pilot body, bored for its bearing (typical)', domains: DOM, aisle: V('Wheels'),
  says: 'A wheel hub (typical; patterns recalled): its flange 12 mm thick with its stud holes on the pitch circle (`<size> hub/studs`, 12.4 mm), its pilot body above it (the wheel\'s centre bore sits over it), bored for its axle or bearing (studs, bearing and ABS ring not drawn); wheel studs go through its holes (Through a line), a brake disc\'s hat over its pilot',
  rows: WHEEL_HUBS, size: '5×114.3 Ø67.1', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} hub`, 'steel-low', { lathe: { pts: hub2Pts(q) } }, { color: STEEL, pattern: { name: 'studs', circle: { n: q.n, r: mm(q.pcd) / 2 }, hole: mm(6.2) } }),
  expect: (q) => ({ bound: bound(mm(q.pcd + 28), mm(60), mm(q.pcd + 28)), tol: 0.01, says: 'its flange by its height; mass not checked: the gauge weighs each stud hole as a cylinder the whole hub high, not the flange\'s 12 mm (fault noted, decision 0029)' }),
  tests: [T(1, { offers: ['5×114.3 Ø67.1 hub/axis', '5×114.3 Ø67.1 hub/studs'] })],
};
type Disc = { D: number; t: number; n: number; pcd: number; bore: number; H: number };
/** Brake discs by diameter and thickness (mm; recalled common sizes), with their hat. */
export const BRAKE_DISCS = rowsOf(['D', 't', 'n', 'pcd', 'bore', 'H'] as const, [['Ø240×10 solid 4×100', 240, 10, 4, 100, 56.1, 40], ['Ø256×22 5×100', 256, 22, 5, 100, 57.1, 45], ['Ø260×10 solid 5×100', 260, 10, 5, 100, 57.1, 40], ['Ø280×22 5×114.3', 280, 22, 5, 114.3, 67.1, 47], ['Ø288×25 5×112', 288, 25, 5, 112, 66.5, 50],
  ['Ø300×24 5×112', 300, 24, 5, 112, 66.5, 50], ['Ø320×28 5×120', 320, 28, 5, 120, 72.6, 52], ['Ø330×32 5×114.3', 330, 32, 5, 114.3, 67.1, 52], ['Ø340×30 5×112', 340, 30, 5, 112, 66.5, 55], ['Ø355×32 5×114.3', 355, 32, 5, 114.3, 67.1, 55]]);
const discPts = (q: Disc): [number, number][] => { const rb = q.bore / 2, rh = q.pcd / 2 + 16; return M([[rb, 0], [rh, 0], [rh, q.H - q.t], [q.D / 2, q.H - q.t], [q.D / 2, q.H], [rh - 6, q.H], [rh - 6, 7], [rb, 7]]); };
const BRAKEDISC: PartFamily<Disc> = {
  id: 'piece.brakedisc', name: 'Brake disc', gloss: 'A car brake disc by its diameter and thickness, 240 to 355 mm, with its hat and bolt holes (vanes not cut; typical)', domains: DOM, aisle: V('Brakes'),
  says: 'A brake disc (typical sizes recalled): its braking ring of its diameter and thickness on a hat (wall 6 mm, plate 7 mm) bored to its centre bore, its wheel-stud holes on the pitch circle (`<size> disc/bolts`); vented discs drawn solid (vanes not cut, so heavier). It goes over a hub\'s pilot, studs through its holes',
  rows: BRAKE_DISCS, size: 'Ø280×22 5×114.3', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} disc`, 'cast-iron', { lathe: { pts: discPts(q) } }, { color: 0x5a5d62, pattern: { name: 'bolts', circle: { n: q.n, r: mm(q.pcd) / 2 }, hole: mm(6.5) } }),
  expect: (q) => ({ bound: bound(mm(q.D), mm(q.H), mm(q.D)), tol: 0.01, says: 'its diameter by its hat height; mass not checked: the gauge weighs each bolt hole as a cylinder the whole hat high, not the plate\'s 7 mm (fault noted, decision 0029)' }),
  tests: [T(1, { offers: ['Ø280×22 5×114.3 disc/axis', 'Ø280×22 5×114.3 disc/bolts'] })],
};
/** Car brake calipers' envelopes (mm; typical). */
export const CAR_CALIPERS = boxRows([['floating 1-piston Ø54', 130, 90, 70], ['floating 1-piston Ø57', 135, 95, 75], ['floating 2-piston 2×Ø42', 150, 100, 80], ['fixed 4-piston', 200, 110, 90], ['fixed 6-piston', 260, 120, 95], ['rear 1-piston Ø38 handbrake', 120, 85, 70], ['rear fixed 4-piston', 180, 100, 85], ['truck floating 2×Ø60', 220, 140, 110]]);
const CARCALIPER = boxFamily({ id: 'piece.carcaliper', name: 'Car brake caliper', gloss: 'A car brake caliper, floating or fixed, as its envelope (typical)', aisle: V('Brakes'), rows: CAR_CALIPERS, size: 'floating 1-piston Ø57', mat: 'cast-iron', color: RED,
  says: 'A brake caliper (typical): its envelope, a box of its size (pistons, pads, bracket and bleed screw not drawn); it bolts to a knuckle over a disc\'s edge', envelope: 'a box of its size' });
type Coil = { d: number; D: number; L: number; n: number };
/** Automotive coil springs: wire, outside, free length (mm), active turns (typical). */
export const CAR_SPRINGS = rowsOf(['d', 'D', 'L', 'n'] as const, [['front small car 11.5 × Ø130 × 320', 11.5, 130, 320, 6], ['front 12.5 × Ø140 × 340', 12.5, 140, 340, 6.5], ['front 13.5 × Ø150 × 360', 13.5, 150, 360, 6.5], ['front strut 14 × Ø155 × 380', 14, 155, 380, 7], ['rear 11 × Ø120 × 300', 11, 120, 300, 6],
  ['rear 12 × Ø130 × 330', 12, 130, 330, 6.5], ['lowering 13 × Ø140 × 280', 13, 140, 280, 5.5], ['truck rear 16 × Ø170 × 400', 16, 170, 400, 7], ['motorcycle shock 9 × Ø70 × 220', 9, 70, 220, 8]]);
const CARSPRING: PartFamily<Coil> = {
  id: 'piece.carspring', name: 'Coil spring (automotive)', gloss: 'A suspension coil spring by its wire, outside and free length (typical automotive sizes)', domains: DOM, aisle: V('Suspension'),
  says: 'A suspension coil spring (typical): a coil of its wire wound at its mean radius through its turns to its free length (its ends not ground or closed); it stands on a spring seat, a shock absorber through its middle (Through a line on `<size> spring/axis`)',
  rows: CAR_SPRINGS, size: 'front 12.5 × Ø140 × 340', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} spring`, 'steel-spring', { coil: [mm((q.D - q.d) / 2), mm(q.d), q.n, mm((q.L - q.d) / q.n)] }, { color: DARK }),
  expect: (q) => ({ bound: bound(mm(q.D), mm(q.L), mm(q.D)), tol: 0.01, says: 'its outside by its free length' }),
  tests: [T(1, { offers: ['front 12.5 × Ø140 × 340 spring/axis'] })],
};
type Shock = { s: number; D: number; d: number };
/** Shock absorbers by stroke (mm): body and rod diameters typical. */
export const SHOCKS = rowsOf(['s', 'D', 'd'] as const, [['motorcycle stroke 70 Ø40 rod 12', 70, 40, 12], ['steering damper stroke 80 Ø30 rod 10', 80, 30, 10], ['stroke 100 Ø45 rod 12', 100, 45, 12], ['stroke 130 Ø50 rod 14', 130, 50, 14], ['stroke 150 Ø50 rod 14', 150, 50, 14], ['strut stroke 150 Ø51 rod 22', 150, 51, 22],
  ['strut stroke 170 Ø55 rod 22', 170, 55, 22], ['stroke 180 Ø55 rod 16', 180, 55, 16], ['truck stroke 200 Ø60 rod 20', 200, 60, 20]]);
const SHOCK: PartFamily<Shock> = {
  id: 'piece.shock', name: 'Shock absorber', gloss: 'A shock absorber by its stroke, 70 to 200 mm: its body tube, its rod drawn fully out, an eye at each end (typical)', domains: DOM, aisle: V('Suspension'),
  says: 'A shock absorber (typical): its body a 2 mm tube its stroke + 80 long, its rod stacked on it drawn fully extended (piston, oil and seals not drawn), an eye bush at each end across (z); it goes between a wishbone\'s and a body\'s eyes',
  rows: SHOCKS, size: 'stroke 150 Ø50 rod 14', source: 'typical (recalled)',
  recipe: (q, size) => { const eye = (f: string) => turn(made(`${size} eye ${f}`, 'steel-low', { tube: [mm(6), mm(12), mm(24)] }, { color: DARK }), 0, 90);
    return stack(`${size} shock`, 1, [{ b: eye('lower') }, { b: made(`${size} body`, 'steel-low', { tube: [mm(q.D / 2 - 2), mm(q.D) / 2, mm(q.s + 80)] }, { color: DARK }) }, { b: made(`${size} rod`, 'steel-chrome', { cyl: [mm(q.d) / 2, mm(q.s + 30)] }, { color: ALU }) }, { b: eye('upper') }]); },
  expect: (q) => ({ bound: bound(mm(q.D), mm(2 * q.s + 158), mm(q.D)), mass: (annulus(mm(q.D), mm(q.D - 4)) * mm(q.s + 80) + 2 * annulus(mm(24), mm(12)) * mm(24)) * rho('steel-low') + disc(mm(q.d)) * mm(q.s + 30) * rho('steel-chrome'), tol: 0.01, massTol: 0.02, says: 'its body by its length extended; nominal mass, body, rod and eyes' }),
  tests: [T(4)],
};
type Leaf = { L: number; W: number; t: number; n: number };
/** Leaf springs: main leaf length, width, leaf thickness (mm), leaves (typical). */
export const LEAF_SPRINGS = rowsOf(['L', 'W', 't', 'n'] as const, [['trailer 700 × 60 × 7 × 3', 700, 60, 7, 3], ['trailer 900 × 60 × 8 × 4', 900, 60, 8, 4], ['light 1100 × 60 × 7 × 3', 1100, 60, 7, 3], ['light 1200 × 60 × 8 × 4', 1200, 60, 8, 4], ['van 1250 × 70 × 8 × 5', 1250, 70, 8, 5],
  ['pickup 1300 × 70 × 9 × 4', 1300, 70, 9, 4], ['pickup 1400 × 70 × 10 × 5', 1400, 70, 10, 5], ['truck 1500 × 90 × 12 × 7', 1500, 90, 12, 7], ['heavy truck 1600 × 100 × 14 × 9', 1600, 100, 14, 9]]);
const leafL = (q: Leaf, i: number) => q.L * (1 - (0.75 * i) / q.n);
const LEAFSPRING: PartFamily<Leaf> = {
  id: 'piece.leafspring', name: 'Leaf spring', gloss: 'A leaf spring by its main leaf, width and leaves, 3 to 9 leaves (drawn flat; typical)', domains: DOM, aisle: V('Suspension'),
  says: 'A leaf spring (typical): its leaves stacked shortest at the bottom, each 3/4 of the way shorter than the main by its place (drawn flat: camber, eyes, centre bolt and clips not drawn); it sits on an axle\'s spring seat under U-bolts',
  rows: LEAF_SPRINGS, size: 'pickup 1300 × 70 × 9 × 4', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} leaf spring`, 1, Array.from({ length: q.n }, (_, k) => q.n - 1 - k).map((i) => ({ b: made(`${size} leaf ${i + 1}`, 'steel-spring', { box: [mm(leafL(q, i)), mm(q.t), mm(q.W)] }, { color: DARK }) }))),
  expect: (q) => ({ bound: bound(mm(q.L), mm(q.n * q.t), mm(q.W)), mass: Array.from({ length: q.n }, (_, i) => mm(leafL(q, i)) * mm(q.t) * mm(q.W)).reduce((a, b) => a + b, 0) * rho('steel-spring'), tol: 0.01, massTol: 0.02, says: 'its main leaf by its stack; nominal mass, the leaves' }),
  tests: [T(4)],
};
type Arm = { L: number };
/** Control arms by their centre-to-centre length (mm; typical). */
export const CONTROL_ARMS = rowsOf(['L'] as const, [['upper 200', 200], ['toe link 200', 200], ['upper 250', 250], ['rear lateral 250', 250], ['lower front 300', 300], ['rear lateral 300', 300], ['lower front 350', 350], ['lower front 400', 400], ['trailing 450', 450]]);
const CONTROLARM: PartFamily<Arm> = {
  id: 'piece.controlarm', name: 'Control arm', gloss: 'A suspension control arm by its length: a bush at one end, a ball joint boss at the other, a straight bar between (typical)', domains: DOM, aisle: V('Suspension'),
  says: 'A control arm (typical): a straight bar 40 × 25 mm with a rubber bush housing across one end (`<size> bush/axis`, for its pivot bolt) and a ball joint boss up at the other (`<size> boss/axis`, bored 30 for a press-in joint); a real A-arm\'s second bush and bend not drawn. A ball joint goes into its boss, a bolt through its bush',
  rows: CONTROL_ARMS, size: 'lower front 350', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} arm`, 0, [{ b: turn(made(`${size} bush`, 'steel-low', { tube: [mm(7), mm(20), mm(50)] }, { color: DARK }), 0, 90) }, { b: made(`${size} bar`, 'steel-low', { box: [mm(q.L - 65), mm(25), mm(40)] }, { color: DARK }) }, { b: made(`${size} boss`, 'steel-low', { tube: [mm(15), mm(25), mm(30)] }, { color: DARK }) }]),
  expect: (q) => ({ bound: bound(mm(q.L + 25), mm(40), mm(50)), mass: (annulus(mm(40), mm(14)) * mm(50) + mm(q.L - 65) * mm(25) * mm(40) + annulus(mm(50), mm(30)) * mm(30)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'bush to boss; nominal mass, bush, bar and boss' }),
  tests: [T(3)],
};
type Rod = { stud: number; D: number; H: number; d: number; L: number };
/** Tie rod ends by stud and shank thread (mm; housing typical). */
export const TIE_ROD_ENDS = rowsOf(['stud', 'D', 'H', 'd', 'L'] as const, [['M10 stud, M10 shank (small car)', 10, 34, 28, 10, 45], ['M10 stud, M12 shank', 10, 36, 30, 12, 50], ['M12 stud, M14 shank', 12, 40, 34, 14, 55], ['M12 stud, M14×1.5 LH', 12, 40, 34, 14, 55], ['M12 stud, 1/2-20 shank', 12, 40, 34, 12.7, 55],
  ['M14 stud, M16 shank', 14, 44, 38, 16, 60], ['M14 stud, M16×1.5 LH', 14, 44, 38, 16, 60], ['M16 stud, M18 shank (truck)', 16, 50, 44, 18, 70]]);
const TIERODEND: PartFamily<Rod> = {
  id: 'piece.tierodend', name: 'Tie rod end', gloss: 'A tie rod end by its ball stud and shank thread: its housing, its stud up, its threaded shank out of its side (typical)', domains: DOM, aisle: V('Steering'),
  says: 'A tie rod end (typical): its housing a cylinder with its tapered ball stud up out of it (`<size> stud/axis`, taper and thread not drawn) and its threaded shank out of its side along x (`<size> shank/axis`, thread not drawn; its boot not drawn). The stud goes through a steering arm\'s taper, the shank into an inner tie rod',
  rows: TIE_ROD_ENDS, size: 'M12 stud, M14 shank', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} tie rod end`, 1, [{ b: onto(made(`${size} housing`, 'steel-alloy', { cyl: [mm(q.D) / 2, mm(q.H)] }, { color: DARK }), '+x', turn(made(`${size} shank`, 'steel-alloy', { cyl: [mm(q.d) / 2, mm(q.L)] }, { color: STEEL }), 2, 90), 'touch') }, { b: made(`${size} stud`, 'steel-alloy', { cyl: [mm(q.stud) / 2, mm(45)] }, { color: STEEL }) }], `${size} housing/axis`),
  expect: (q) => ({ bound: bound(mm(q.D + q.L), mm(q.H + 45), mm(q.D)), mass: (disc(mm(q.D)) * mm(q.H) + disc(mm(q.d)) * mm(q.L) + disc(mm(q.stud)) * mm(45)) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'housing and shank by housing and stud; nominal mass, the three' }),
  tests: [T(3)],
};
type Ball = { D: number; H: number; d: number; n: number; pcd: number };
/** Ball joints by housing and stud (mm): press-in, and bolt-in with their flange holes (typical). */
export const BALL_JOINTS = rowsOf(['D', 'H', 'd', 'n', 'pcd'] as const, [['press-in Ø38 M12', 38, 36, 12, 0, 0], ['press-in Ø42 M14', 42, 40, 14, 0, 0], ['press-in Ø45 M16', 45, 44, 16, 0, 0], ['press-in Ø50 M18', 50, 48, 18, 0, 0], ['bolt-in 3-hole M12 (small car)', 38, 36, 12, 3, 55], ['bolt-in 3-hole M14', 42, 40, 14, 3, 60], ['bolt-in 3-hole M16', 45, 44, 16, 3, 65], ['bolt-in 4-hole M16', 45, 44, 16, 4, 70]]);
const ballPts = (q: Ball): [number, number][] => M([[0, 0], [q.pcd / 2 + 12, 0], [q.pcd / 2 + 12, 6], [q.D / 2, 6], [q.D / 2, q.H], [0, q.H]]);
const BALLJOINT: PartFamily<Ball> = {
  id: 'piece.balljoint', name: 'Ball joint', gloss: 'A suspension ball joint by its housing and stud: press-in, or bolt-in with its flange holes (typical)', domains: DOM, aisle: V('Suspension'),
  says: 'A ball joint (typical): its housing a cylinder (press-in) or flanged with its bolt holes (`<size> housing/bolts`), its tapered stud up out of it (`<size> stud/axis`; ball, boot and taper not drawn). It presses into a control arm\'s boss or bolts to it, its stud through a knuckle\'s taper',
  rows: BALL_JOINTS, size: 'press-in Ø42 M14', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} ball joint`, 1, [{ b: q.n ? made(`${size} housing`, 'steel-alloy', { lathe: { pts: ballPts(q) } }, { color: DARK, pattern: { name: 'bolts', circle: { n: q.n, r: mm(q.pcd) / 2 }, hole: mm(4.5) } }) : made(`${size} housing`, 'steel-alloy', { cyl: [mm(q.D) / 2, mm(q.H)] }, { color: DARK }) }, { b: made(`${size} stud`, 'steel-alloy', { cyl: [mm(q.d) / 2, mm(50)] }, { color: STEEL }) }]),
  expect: (q) => ({ bound: bound(mm(q.n ? q.pcd + 24 : q.D), mm(q.H + 50), mm(q.n ? q.pcd + 24 : q.D)), ...(q.n ? {} : { mass: (disc(mm(q.D)) * mm(q.H) + disc(mm(q.d)) * mm(50)) * rho('steel-alloy') }), tol: 0.01, massTol: 0.02, says: q.n ? 'its flange by housing and stud; mass not checked: the gauge weighs each bolt hole as a cylinder the whole housing high, not the flange\'s 6 mm (fault noted, decision 0029)' : 'its housing by housing and stud; nominal mass, housing and stud' }),
  tests: [T(2, { offers: ['press-in Ø42 M14 housing/axis', 'press-in Ø42 M14 stud/axis'] }), T(2, { offers: ['bolt-in 3-hole M14 housing/axis', 'bolt-in 3-hole M14 housing/bolts', 'bolt-in 3-hole M14 stud/axis'] }, { size: 'bolt-in 3-hole M14' })],
};
type Column = { L: number };
/** Steering columns by jacket length (mm; typical). */
export const STEERING_COLUMNS = rowsOf(['L'] as const, [['L 500', 500], ['L 550', 550], ['L 600', 600], ['L 650', 650], ['collapsible 650 (two tubes drawn as one)', 650], ['L 700', 700], ['telescopic 700', 700], ['L 800', 800]]);
const STEERINGCOLUMN: PartFamily<Column> = {
  id: 'piece.steeringcolumn', name: 'Steering column', gloss: 'A steering column by its length: a 20 mm shaft in a 32 mm jacket tube (typical)', domains: DOM, aisle: V('Steering'),
  says: 'A steering column (typical): its 20 mm shaft 100 mm longer than its 32 mm jacket tube, the jacket slid over the shaft\'s middle (bearings, universal joint, lock and tilt not drawn); a steering wheel goes over the shaft\'s top end (Over a shaft on `<size> shaft/axis`)',
  rows: STEERING_COLUMNS, size: 'L 650', source: 'typical (recalled)',
  recipe: (q, size) => over(made(`${size} shaft`, 'steel-alloy', { cyl: [mm(10), mm(q.L + 100)] }, { color: STEEL }), `${size} shaft/axis`, made(`${size} jacket`, 'steel-low', { tube: [mm(11.5), mm(16), mm(q.L)] }, { color: DARK }), 'mid', 'clear'),
  expect: (q) => ({ bound: bound(mm(32), mm(q.L + 100), mm(32)), mass: disc(mm(20)) * mm(q.L + 100) * rho('steel-alloy') + annulus(mm(32), mm(23)) * mm(q.L) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its jacket by its shaft; nominal mass, shaft and jacket' }),
  tests: [T(2, { offers: ['L 650 jacket/axis', 'L 650 shaft/axis'] })],
};
type Seat = { W: number; D: number; Hb: number };
/** Seat frames: cushion width and depth, backrest height (mm; typical). */
export const SEAT_FRAMES = rowsOf(['W', 'D', 'Hb'] as const, [['front compact 430 × 460, back 580', 430, 460, 580], ['front 450 × 480, back 600', 450, 480, 600], ['front 480 × 500, back 620', 480, 500, 620], ['front sport 460 × 520, back 650', 460, 520, 650], ['rear 40 split 480 × 480', 480, 480, 600], ['rear 60 split 720 × 480', 720, 480, 600],
  ['rear bench 1200 × 480, back 600', 1200, 480, 600], ['van 500 × 500, back 650', 500, 500, 650], ['truck air seat 520 × 520, back 700', 520, 520, 700]]);
const SEATFRAME: PartFamily<Seat> = {
  id: 'piece.seatframe', name: 'Seat frame', gloss: 'A car seat frame by its cushion and backrest: two trays, the backrest stood up behind the cushion (an envelope; typical)', domains: DOM, aisle: V('Interior'),
  says: 'A seat frame (typical): its cushion frame a steel tray 40 mm deep and its backrest frame a tray stood up behind it, level at the bottom (an envelope: a real frame is tube and pressings; recliner, runners and springs not drawn); it bolts to the floor on its runners',
  rows: SEAT_FRAMES, size: 'front 450 × 480, back 600', source: 'typical (recalled)', envelope: 'two trays for two tube frames',
  recipe: (q, size) => stack(`${size} seat frame`, 2, [{ b: turn(made(`${size} backrest`, 'steel-low', { case: [mm(q.W), mm(40), mm(q.Hb), mm(10), mm(3)] }, { color: DARK }), 0, 90) }, { b: made(`${size} cushion`, 'steel-low', { case: [mm(q.W), mm(40), mm(q.D), mm(10), mm(3)] }, { color: DARK }) }], undefined, false, 'lo'),
  expect: (q) => ({ bound: bound(mm(q.W), mm(q.Hb), mm(q.D + 40)), tol: 0.01, says: 'its width by its backrest by its depth' }),
  tests: [T(2)],
};
type Buckle = { L: number; W: number; H: number; Lt: number; Wt: number };
/** Seat belt buckles with their tongues (mm; typical). */
export const BUCKLES = rowsOf(['L', 'W', 'H', 'Lt', 'Wt'] as const, [['child seat buckle 70 × 40 × 20', 70, 40, 20, 45, 25], ['buckle 80 × 45 × 25', 80, 45, 25, 55, 30], ['buckle 90 × 50 × 28', 90, 50, 28, 60, 32], ['aircraft lift-lever 90 × 60 × 20', 90, 60, 20, 60, 40], ['racing harness rotary 100 × 100 × 30', 100, 100, 30, 60, 40], ['buckle on stalk 150', 150, 45, 25, 55, 30], ['buckle on cable stalk 220', 220, 45, 25, 55, 30]]);
const BUCKLE: PartFamily<Buckle> = {
  id: 'piece.seatbeltbuckle', name: 'Seat belt buckle', gloss: 'A seat belt buckle by its size with its tongue (latch plate) beyond it (an envelope; typical)', domains: DOM, aisle: V('Interior'),
  says: 'A seat belt buckle (typical): its body a box of its size (on its stalk where it has one, drawn as part of the box) and its tongue a 3 mm plate beyond its end (latch, button and spring not drawn); its stalk bolts to the seat frame',
  rows: BUCKLES, size: 'buckle 80 × 45 × 25', source: 'typical (recalled)', envelope: 'a box and a plate',
  recipe: (q, size) => stack(`${size} buckle`, 0, [{ b: made(`${size} body`, 'abs', { box: [mm(q.L), mm(q.H), mm(q.W)] }, { color: BLACK }) }, { b: made(`${size} tongue`, 'steel-low', { box: [mm(q.Lt), mm(3), mm(q.Wt)] }, { color: STEEL }) }]),
  expect: (q) => ({ bound: bound(mm(q.L + q.Lt), mm(q.H), mm(q.W)), tol: 0.01, says: 'body and tongue end to end' }),
  tests: [T(2)],
};
type Rad = { W: number; H: number; T: number };
/** Radiators by core (mm: wide, tall, thick; typical). */
export const RADIATORS = rowsOf(['W', 'H', 'T'] as const, [['core 300 × 400 × 26', 300, 400, 26], ['core 350 × 300 × 16 (motorcycle)', 350, 300, 16], ['core 400 × 500 × 26', 400, 500, 26], ['core 500 × 600 × 26', 500, 600, 26], ['core 550 × 650 × 32', 550, 650, 32], ['core 600 × 700 × 32', 600, 700, 32], ['core 650 × 450 × 42', 650, 450, 42], ['core 700 × 500 × 56', 700, 500, 56], ['core 800 × 600 × 60 (truck)', 800, 600, 60]]);
const RADIATOR: PartFamily<Rad> = {
  id: 'piece.carradiator', name: 'Car radiator', gloss: 'A crossflow radiator by its core size: a block standing for tubes and fins, a tank at each side (typical)', domains: DOM, aisle: V('Cooling'),
  says: 'A radiator (typical): its core a block of its size drawn as aluminium foam at 10 % (standing for its tubes and fins, about their mass), a plastic tank 40 mm wide down each side (hose necks, cap and brackets not drawn; the tanks solid where real ones are shells); hoses go to its necks',
  rows: RADIATORS, size: 'core 500 × 600 × 26', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} radiator`, 0, [{ b: made(`${size} tank left`, 'pa66', { box: [mm(40), mm(q.H), mm(q.T + 10)] }, { color: BLACK }) }, { b: made(`${size} core`, 'al-foam-10', { box: [mm(q.W), mm(q.H), mm(q.T)] }, { color: ALU }) }, { b: made(`${size} tank right`, 'pa66', { box: [mm(40), mm(q.H), mm(q.T + 10)] }, { color: BLACK }) }]),
  expect: (q) => ({ bound: bound(mm(q.W + 80), mm(q.H), mm(q.T + 10)), mass: mm(q.W) * mm(q.H) * mm(q.T) * rho('al-foam-10') + 2 * mm(40) * mm(q.H) * mm(q.T + 10) * rho('pa66'), tol: 0.01, massTol: 0.02, says: 'tanks and core across by its height; nominal mass, core as foam and two tanks' }),
  tests: [T(3)],
};
type Tank = { L: number; W: number; H: number };
/** Fuel tanks by capacity: a box of that volume (mm; typical). */
export const FUEL_TANKS = rowsOf(['L', 'W', 'H'] as const, [['motorcycle 15 L (400 × 250 × 150)', 400, 250, 150], ['35 L (650 × 300 × 180)', 650, 300, 180], ['40 L (700 × 320 × 180)', 700, 320, 180], ['45 L (750 × 330 × 180)', 750, 330, 180], ['50 L (800 × 350 × 180)', 800, 350, 180], ['55 L (850 × 360 × 180)', 850, 360, 180],
  ['60 L (900 × 370 × 180)', 900, 370, 180], ['70 L (900 × 390 × 200)', 900, 390, 200], ['80 L (1000 × 400 × 200)', 1000, 400, 200], ['100 L (1000 × 500 × 200)', 1000, 500, 200]]);
const FUELTANK: PartFamily<Tank> = {
  id: 'piece.fueltank', name: 'Fuel tank', gloss: 'A fuel tank by its litres, 15 to 100 L: a 4 mm HDPE shell (a tray and its top) of that volume (typical)', domains: DOM, aisle: V('Fuel'),
  says: 'A fuel tank (typical): a blow-moulded HDPE shell drawn as a 4 mm tray with its top plate on it, its outside holding its litres (filler neck, pump flange, baffles and straps not drawn); it straps under a floor',
  rows: FUEL_TANKS, size: '50 L (800 × 350 × 180)', source: 'typical (recalled: a box of the volume)',
  recipe: (q, size) => stack(`${size} tank`, 1, [{ b: made(`${size} tank body`, 'pe', { case: [mm(q.L), mm(q.H - 4), mm(q.W), mm(4), mm(4)] }, { color: DARK }) }, { b: made(`${size} tank top`, 'pe', { box: [mm(q.L), mm(4), mm(q.W)] }, { color: DARK }) }]),
  expect: (q) => ({ bound: bound(mm(q.L), mm(q.H), mm(q.W)), mass: (mm(q.L) * mm(q.H) * mm(q.W) - mm(q.L - 8) * mm(q.H - 8) * mm(q.W - 8)) * rho('pe'), tol: 0.01, massTol: 0.02, says: 'its outside; nominal mass, the shell' }),
  tests: [T(2, { offers: ['50 L (800 × 350 × 180) tank body/cavity'] })],
};
type Pipe = { od: number; t: number };
/** Exhaust pipe by outside and wall (mm; typical). */
export const EXHAUST_PIPES = rowsOf(['od', 't'] as const, [['Ø38 × 1.5', 38, 1.5], ['Ø42 × 1.5', 42, 1.5], ['Ø45 × 1.5', 45, 1.5], ['Ø51 × 1.5', 51, 1.5], ['Ø57 × 1.5', 57, 1.5], ['Ø63 × 1.5', 63, 1.5], ['Ø70 × 1.5', 70, 1.5], ['Ø76 × 1.5', 76, 1.5], ['Ø89 × 2 (truck)', 89, 2]]);
const EXHAUSTPIPE: PartFamily<Pipe> = {
  id: 'piece.exhaustpipe', name: 'Exhaust pipe', gloss: 'A length of exhaust pipe by its outside, 38 to 89 mm, straight or with one bend (typical)', domains: DOM, aisle: V('Exhaust'),
  says: 'A stainless exhaust pipe (typical sizes): a run of tube of its outside and wall: a straight so long, then where a bend is asked a bend through its angle round 1.5 × its outside and a second straight (Run of tube); a muffler or a flange goes on its ends',
  rows: EXHAUST_PIPES, size: 'Ø51 × 1.5', source: 'typical (recalled)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 500 }, { key: 'bend', label: 'Bend, degrees (0 straight)', type: 'number', default: 45 }, { key: 'leg', label: 'Second straight, mm', type: 'number', default: 150 }],
  cannot: (_q, _s, set) => (!(Number(set.length) > 0) ? `a length above 0 (${String(set.length)} mm)` : !(Number(set.bend) >= 0 && Number(set.bend) <= 180) ? `a bend of 0 to 180° (${String(set.bend)})` : Number(set.bend) > 0 && !(Number(set.leg) > 0) ? `a second straight above 0 (${String(set.leg)} mm)` : null),
  recipe: (q, size, set) => { const t = { mat: 'steel-low', ro: mm(q.od) / 2, ri: mm(q.od / 2 - q.t), color: STEEL }, a = Number(set.bend);
    return run(`${size} exhaust pipe`, a > 0 ? [{ ...t, name: `${size} pipe`, straight: mm(Number(set.length)) }, { ...t, name: `${size} bend`, bend: a, R: mm(1.5 * q.od) }, { ...t, name: `${size} leg`, straight: mm(Number(set.leg)) }] : [{ ...t, name: `${size} pipe`, straight: mm(Number(set.length)) }]); },
  expect: (q, _s, set) => { const a = Number(set.bend), L = mm(Number(set.length)) + (a > 0 ? mm(Number(set.leg)) + (mm(1.5 * q.od) * a * Math.PI) / 180 : 0); return { ...(a > 0 ? {} : { bound: bound(mm(q.od), mm(Number(set.length)), mm(q.od)) }), mass: annulus(mm(q.od), mm(q.od - 2 * q.t)) * L * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'a straight\'s outside by its length; nominal mass, the tube along its middle line' }; },
  tests: [T(3), T(1, { offers: ['Ø51 × 1.5 pipe/axis'] }, { bend: 0 })],
};
type Muff = { D: number; L: number; od: number };
/** Mufflers by body and pipe (mm; typical, round bodies). */
export const MUFFLERS = rowsOf(['D', 'L', 'od'] as const, [['Ø100 × 250, Ø38 (motorcycle)', 100, 250, 38], ['Ø120 × 300, Ø45', 120, 300, 45], ['Ø150 × 400, Ø51', 150, 400, 51], ['Ø160 × 450, Ø51', 160, 450, 51], ['Ø180 × 500, Ø57', 180, 500, 57], ['Ø200 × 550, Ø63', 200, 550, 63], ['Ø200 × 600, Ø63', 200, 600, 63], ['Ø230 × 650, Ø70 (truck)', 230, 650, 70]]);
const MUFFLER: PartFamily<Muff> = {
  id: 'piece.muffler', name: 'Muffler', gloss: 'A round muffler by its body and pipe: a 1 mm shell with its end caps, an inlet and an outlet pipe, laid along x (typical)', domains: DOM, aisle: V('Exhaust'),
  says: 'A muffler (typical): its body a 1 mm stainless tube with a 1.5 mm cap at each end and a 100 mm pipe of its size stacked beyond each cap, the whole laid along x (baffles, packing and the pipes\' passage through the caps not drawn); exhaust pipe joins its pipes',
  rows: MUFFLERS, size: 'Ø150 × 400, Ø51', source: 'typical (recalled)',
  recipe: (q, size) => { const pipe = (f: string) => made(`${size} ${f} pipe`, 'steel-low', { tube: [mm(q.od / 2 - 1.5), mm(q.od) / 2, mm(100)] }, { color: STEEL }), cap = (f: string) => made(`${size} ${f} cap`, 'steel-low', { cyl: [mm(q.D) / 2, mm(1.5)] }, { color: STEEL });
    return turn(stack(`${size} muffler`, 1, [{ b: pipe('inlet') }, { b: cap('inlet') }, { b: made(`${size} body`, 'steel-low', { tube: [mm(q.D / 2 - 1), mm(q.D) / 2, mm(q.L)] }, { color: STEEL }) }, { b: cap('outlet') }, { b: pipe('outlet') }]), 2, 90); },
  expect: (q) => ({ bound: bound(mm(q.L + 203), mm(q.D), mm(q.D)), mass: (2 * annulus(mm(q.od), mm(q.od - 3)) * mm(100) + 2 * disc(mm(q.D)) * mm(1.5) + annulus(mm(q.D), mm(q.D - 2)) * mm(q.L)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'pipe to pipe by its body; nominal mass, pipes, caps and shell' }),
  tests: [T(5)],
};
type Mirror = { W: number; H: number; D: number };
/** Mirrors by glass (mm: wide, tall; housing depth; typical). */
export const MIRRORS = rowsOf(['W', 'H', 'D'] as const, [['motorcycle Ø110 (square drawn)', 110, 110, 40], ['door 160 × 100 (small car)', 160, 100, 80], ['door 180 × 120', 180, 120, 90], ['door 200 × 130', 200, 130, 100], ['door 220 × 140 (SUV)', 220, 140, 110], ['door 240 × 150 (van)', 240, 150, 120], ['interior 250 × 70', 250, 70, 30], ['truck 400 × 200', 400, 200, 100]]);
const MIRROR: PartFamily<Mirror> = {
  id: 'piece.carmirror', name: 'Vehicle mirror', gloss: 'A vehicle mirror by its glass: a housing tray with its glass in it, facing +z (its arm not drawn; typical)', domains: DOM, aisle: V('Body'),
  says: 'A mirror (typical): its housing an ABS tray 3 mm thick with its 3 mm glass stood in its cavity, turned to face +z (motor, arm and base not drawn); its base bolts to a door',
  rows: MIRRORS, size: 'door 200 × 130', source: 'typical (recalled)', envelope: 'a tray housing, its arm not drawn',
  recipe: (q, size) => turn(into(made(`${size} housing`, 'abs', { case: [mm(q.W), mm(q.D), mm(q.H), mm(3), mm(3)] }, { color: BLACK }), `${size} housing/cavity`, made(`${size} glass`, 'glass', { box: [mm(q.W - 8), mm(3), mm(q.H - 8)] }, { color: 0xbfd0d8 }), 'clear'), 0, -90),
  expect: (q) => ({ bound: bound(mm(q.W), mm(q.H), mm(q.D)), tol: 0.01, says: 'its glass across by its depth' }),
  tests: [T(2)],
};
type Lamp = { round: number; W: number; H: number; D: number };
/** Headlamps: round by diameter, rectangular by lens (mm; typical). */
export const HEADLAMPS = rowsOf(['round', 'W', 'H', 'D'] as const, [['round Ø90 fog', 1, 90, 90, 70], ['round Ø146 (5-3/4 in)', 1, 146, 146, 100], ['motorcycle round Ø150', 1, 150, 150, 100], ['round Ø178 (7 in, H4)', 1, 178, 178, 110], ['rect 200 × 140 halogen', 0, 200, 140, 120], ['rect 240 × 160 halogen', 0, 240, 160, 130], ['rect 280 × 130 projector', 0, 280, 130, 150], ['LED 300 × 120', 0, 300, 120, 160], ['LED 350 × 110', 0, 350, 110, 170]]);
const HEADLAMP: PartFamily<Lamp> = {
  id: 'piece.headlamp', name: 'Headlamp', gloss: 'A headlamp, round by diameter or rectangular by lens: a housing cup or tray with its lens on it, facing +z (typical)', domains: DOM, aisle: V('Lighting'),
  says: 'A headlamp (typical): its housing a 2 mm cup (round) or tray (rectangular) with its 4 mm lens closing it, turned to face +z (reflector, bulb, LEDs and adjusters not drawn); it bolts into a body\'s lamp aperture',
  rows: HEADLAMPS, size: 'rect 240 × 160 halogen', source: 'typical (recalled)', envelope: 'a housing and a lens',
  recipe: (q, size) => turn(stack(`${size} headlamp`, 1, [{ b: made(`${size} housing`, 'abs', q.round ? { cup: [mm(q.W) / 2, mm(q.D - 4), mm(2), mm(2)] } : { case: [mm(q.W), mm(q.D - 4), mm(q.H), mm(2), mm(2)] }, { color: DARK }) }, { b: made(`${size} lens`, 'glass', q.round ? { cyl: [mm(q.W) / 2, mm(4)] } : { box: [mm(q.W), mm(4), mm(q.H)] }, { color: 0xd8e4ea }) }]), 0, -90),
  expect: (q) => ({ bound: bound(mm(q.W), mm(q.H), mm(q.D)), tol: 0.01, says: 'its lens across by its depth' }),
  tests: [T(2), T(2, {}, { size: 'round Ø178 (7 in, H4)' })],
};
type Plate = { W: number; H: number; t: number; al: number };
/** Number plates by country (mm; recalled). */
export const NUMBER_PLATES = rowsOf(['W', 'H', 't', 'al'] as const, [['EU 520 × 110', 520, 110, 1, 1], ['DE 520 × 110', 520, 110, 1, 1], ['UK 520 × 111 (acrylic)', 520, 111, 3, 0], ['UK square 279 × 203', 279, 203, 3, 0], ['US 305 × 152', 305, 152, 0.8, 1], ['JP 330 × 165', 330, 165, 1, 1], ['AU 372 × 134', 372, 134, 1, 1], ['motorcycle EU 240 × 130', 240, 130, 1, 1], ['motorcycle UK 229 × 178', 229, 178, 3, 0]]);
const NUMBERPLATE: PartFamily<Plate> = {
  id: 'piece.numberplate', name: 'Number plate', gloss: 'A number plate by its country\'s size, aluminium or acrylic, with two fixing holes (recalled sizes)', domains: DOM, aisle: V('Body'),
  says: 'A number plate (sizes recalled): a flat plate facing +z, aluminium (1 mm) or acrylic (3 mm), its two 6.4 mm fixing holes 60 mm in from each end (`<size> plate/fixings`; its characters not drawn); screws go through them into a bumper',
  rows: NUMBER_PLATES, size: 'EU 520 × 110', source: 'recalled (EU, UK, US, JP, AU sizes); thicknesses typical',
  recipe: (q, size) => made(`${size} plate`, q.al ? 'al-5052' : 'abs', { box: [mm(q.W), mm(q.H), mm(q.t)] }, { color: q.al ? 0xf2f2ee : 0xf7e26b, pattern: { name: 'fixings', face: '+z', points: [[-mm(q.W / 2 - 60), mm(q.H / 4)], [mm(q.W / 2 - 60), mm(q.H / 4)]], hole: mm(3.2) } }),
  expect: (q) => ({ bound: bound(mm(q.W), mm(q.H), mm(q.t)), mass: (mm(q.W) * mm(q.H) - 2 * disc(mm(6.4))) * mm(q.t) * rho(q.al ? 'al-5052' : 'abs'), tol: 0.01, massTol: 0.02, says: 'its size; nominal mass, the plate less two holes' }),
  tests: [T(1, { offers: ['EU 520 × 110 plate/fixings'] })],
};
type Beam = { L: number; H: number; W: number; t: number; al: number };
/** Bumper beams: length, section height and depth, wall (mm; typical), steel or aluminium. */
export const BUMPER_BEAMS = rowsOf(['L', 'H', 'W', 't', 'al'] as const, [['steel C 1300 × 80 × 50 × 1.5 (small car)', 1300, 80, 50, 1.5, 0], ['steel C 1350 × 80 × 50 × 1.5 (rear)', 1350, 80, 50, 1.5, 0], ['steel hat 1400 × 100 × 60 × 1.5', 1400, 100, 60, 1.5, 0], ['aluminium C 1450 × 90 × 60 × 3', 1450, 90, 60, 3, 1],
  ['steel hat 1500 × 110 × 65 × 1.8', 1500, 110, 65, 1.8, 0], ['aluminium C 1550 × 100 × 65 × 3.5', 1550, 100, 65, 3.5, 1], ['aluminium C 1600 × 110 × 70 × 4 (SUV)', 1600, 110, 70, 4, 1], ['steel C 2000 × 120 × 100 × 3 (truck)', 2000, 120, 100, 3, 0]]);
const cPts = (q: Beam): [number, number][] => M([[0, 0], [q.W, 0], [q.W, q.t], [q.t, q.t], [q.t, q.H - q.t], [q.W, q.H - q.t], [q.W, q.H], [0, q.H]]);
const BUMPERBEAM: PartFamily<Beam> = {
  id: 'piece.bumperbeam', name: 'Bumper beam', gloss: 'A bumper reinforcement beam by its length and section, steel or aluminium, drawn straight as a C-section (typical)', domains: DOM, aisle: V('Body'),
  says: 'A bumper beam (typical): a C-section of its height, depth and wall drawn straight along x, open toward the car (its curve, crash boxes and mounting plates not drawn); crash boxes bolt it to the rails',
  rows: BUMPER_BEAMS, size: 'steel hat 1400 × 100 × 60 × 1.5', source: 'typical (recalled)',
  recipe: (q, size) => turn(made(`${size} beam`, q.al ? 'al-6061' : 'steel-low', { section: { pts: cPts(q), L: mm(q.L) } }, { color: DARK }), 1, 90),
  expect: (q) => ({ bound: bound(mm(q.L), mm(q.H), mm(q.W)), mass: areaOf(cPts(q)) * mm(q.L) * rho(q.al ? 'al-6061' : 'steel-low'), tol: 0.01, massTol: 0.02, says: 'its length by its section; nominal mass, the section along it' }),
  tests: [T(1)],
};
type Tow = { D: number; flange: number; n: number; d: number; L: number };
/** Tow balls: ball diameter, flange (2 or 4 holes) or shank (mm; recalled). */
export const TOW_BALLS = rowsOf(['D', 'flange', 'n', 'd', 'L'] as const, [['50 mm flange 2-hole', 50, 1, 2, 0, 0], ['50 mm flange 4-hole', 50, 1, 4, 0, 0], ['50 mm 1 in shank', 50, 0, 0, 25.4, 60], ['50 mm swan neck (straight drawn)', 50, 0, 0, 25, 150], ['1-7/8 in, 3/4 shank', 47.6, 0, 0, 19.05, 55], ['2 in, 1 in shank', 50.8, 0, 0, 25.4, 60], ['2 in, 1-1/4 shank', 50.8, 0, 0, 31.75, 70], ['2-5/16 in, 1-1/4 shank', 58.7, 0, 0, 31.75, 70]]);
const TOWBALL: PartFamily<Tow> = {
  id: 'piece.towball', name: 'Tow ball', gloss: 'A tow ball by its ball, on a flange with its bolt holes or on a threaded shank: 50 mm, 1-7/8, 2 and 2-5/16 in (typical)', domains: DOM, aisle: V('Towing'),
  says: 'A tow ball (typical): its ball a sphere on a neck, on a flange plate with its M12 holes (`<size> flange/bolts`) or on a shank of its thread (thread not drawn); a coupling goes over its ball, the flange bolts to a towbar, the shank through a ball mount',
  rows: TOW_BALLS, size: '50 mm flange 2-hole', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} tow ball`, 1, [{ b: q.flange ? made(`${size} flange`, 'steel-alloy', { box: [mm(90), mm(12), mm(60)] }, { color: DARK, pattern: { name: 'bolts', points: q.n === 2 ? [[0, -mm(22)], [0, mm(22)]] : [[-mm(25), -mm(22)], [mm(25), -mm(22)], [-mm(25), mm(22)], [mm(25), mm(22)]], hole: mm(6.5) } }) : made(`${size} shank`, 'steel-alloy', { cyl: [mm(q.d) / 2, mm(q.L)] }, { color: STEEL }) },
    { b: made(`${size} neck`, 'steel-alloy', { cyl: [mm(q.D * 0.55) / 2, mm(25)] }, { color: STEEL }) }, { b: made(`${size} ball`, 'steel-alloy', { sphere: [mm(q.D) / 2] }, { color: STEEL }) }]),
  expect: (q) => ({ bound: q.flange ? bound(mm(90), mm(37 + q.D), mm(60)) : bound(mm(Math.max(q.D, q.d)), mm(q.L + 25 + q.D), mm(Math.max(q.D, q.d))), mass: ((q.flange ? (mm(90) * mm(60) - q.n * disc(mm(13))) * mm(12) : disc(mm(q.d)) * mm(q.L)) + disc(mm(q.D * 0.55)) * mm(25) + (4 / 3) * Math.PI * mm(q.D / 2) ** 3) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its flange or ball across by its height; nominal mass, flange or shank, neck and ball' }),
  tests: [T(3, { offers: ['50 mm flange 2-hole ball/axis', '50 mm flange 2-hole flange/bolts', '50 mm flange 2-hole neck/axis'] }), T(3, {}, { size: '2 in, 1-1/4 shank' })],
};
type Hitch = { a: number; t: number; L: number; pin: number };
/** Hitch receivers by class: square, wall, length, pin (mm; recalled). */
export const HITCH_RECEIVERS = rowsOf(['a', 't', 'L', 'pin'] as const, [['class I 1-1/4 in', 31.75, 3.2, 200, 12.7], ['class II 1-1/4 in', 31.75, 4, 220, 12.7], ['class III 2 in', 50.8, 4.8, 250, 15.9], ['class IV 2 in', 50.8, 6.4, 280, 15.9], ['class V 2-1/2 in', 63.5, 6.4, 300, 15.9], ['EU 50 mm square', 50, 5, 200, 12], ['ball mount 2 in shank (solid)', 50.8, 0, 200, 15.9]]);
const hitchPts = (q: Hitch): [number, number][] => { const a = q.a + 2 * q.t; return M(q.t ? withHole(rect(a, a), rect(q.a, q.a)) : rect(q.a, q.a)); };
const HITCHRECEIVER: PartFamily<Hitch> = {
  id: 'piece.hitchreceiver', name: 'Hitch receiver', gloss: 'A hitch receiver tube by its class (1-1/4, 2, 2-1/2 in square), or a solid ball-mount shank, with its pin hole, along x (typical)', domains: DOM, aisle: V('Towing'),
  says: 'A hitch receiver (typical; classes recalled): a square tube of its inside size and wall (or the solid shank that goes in one), its pin hole through both walls 60 mm from its end (`<size> receiver/pin`), laid along x (its crossmember and brackets not drawn); a ball mount\'s shank slides into it, a pin through the holes',
  rows: HITCH_RECEIVERS, size: 'class III 2 in', source: 'typical (recalled)',
  recipe: (q, size) => turn(made(`${size} receiver`, 'steel-low', { section: { pts: hitchPts(q), L: mm(q.L) } }, { color: DARK, pattern: { name: 'pin', face: '+x', points: [[0, -mm(q.L / 2 - 60)]], hole: mm(q.pin / 2 + 0.3) } }), 1, 90),
  expect: (q) => { const a = q.a + 2 * q.t; return { bound: bound(mm(q.L), mm(a), mm(a)), ...(q.t ? {} : { mass: (areaOf(hitchPts(q)) * mm(q.L) - mm(q.a) * disc(mm(q.pin + 0.6))) * rho('steel-low') }), tol: 0.01, massTol: 0.02, says: q.t ? 'its length by its outside; mass not checked: the gauge weighs the pin hole through the whole square, not the two walls (fault noted, decision 0029)' : 'its length by its outside; nominal mass, the bar less its pin hole' }; },
  tests: [T(1, { offers: ['class III 2 in receiver/axis', 'class III 2 in receiver/pin'] })],
};
type Mount = { D: number; H: number; core: number; thread: number };
/** Engine mounts: housing outside and height, core, stud thread (mm; typical). */
export const ENGINE_MOUNTS = rowsOf(['D', 'H', 'core', 'thread'] as const, [['bush Ø45 × 50, M10', 45, 50, 20, 10], ['bush Ø55 × 60, M12', 55, 60, 24, 12], ['torque strut bush Ø60 × 55, M12', 60, 55, 26, 12], ['rubber Ø70 × 60, M10', 70, 60, 30, 10], ['rubber Ø80 × 65, M12', 80, 65, 34, 12], ['gearbox Ø85 × 70, M12', 85, 70, 36, 12], ['hydraulic Ø90 × 70, M10', 90, 70, 36, 10], ['hydraulic Ø100 × 80, M12', 100, 80, 40, 12]]);
const ENGINEMOUNT: PartFamily<Mount> = {
  id: 'piece.enginemount', name: 'Engine mount', gloss: 'An engine mount by its housing: a steel core in a rubber bush in a housing, 45 to 100 mm (hydraulic ones drawn as rubber; typical)', domains: DOM, aisle: V('Engine'),
  says: 'An engine mount (typical): its steel core (`<size> core/axis`, its stud\'s thread not drawn) with its rubber slid over it and its housing over that (brackets, and a hydraulic mount\'s chambers, not drawn); its core bolts to the engine bracket, its housing to the body',
  rows: ENGINE_MOUNTS, size: 'rubber Ø80 × 65, M12', source: 'typical (recalled)',
  recipe: (q, size) => { const ax = `${size} core/axis`, rc = mm(q.core) / 2, rr = mm(q.D / 2 - 3);
    return over(over(made(`${size} core`, 'steel-low', { cyl: [rc, mm(q.H + 20)] }, { color: STEEL }), ax, made(`${size} rubber`, 'rubber', { tube: [rc + mm(0.1), rr, mm(q.H)] }, { color: BLACK }), 'mid', 'touch'), ax, made(`${size} housing`, 'steel-low', { tube: [rr + mm(0.1), mm(q.D) / 2, mm(q.H)] }, { color: DARK }), 'mid', 'touch'); },
  expect: (q) => ({ bound: bound(mm(q.D), mm(q.H + 20), mm(q.D)), mass: (disc(mm(q.core)) * mm(q.H + 20) + annulus(mm(q.D), mm(q.D - 5.8)) * mm(q.H)) * rho('steel-low') + annulus(mm(q.D - 6), mm(q.core + 0.2)) * mm(q.H) * rho('rubber'), tol: 0.01, massTol: 0.02, says: 'its housing by its core; nominal mass, core, rubber and housing' }),
  tests: [T(3, { offers: ['rubber Ø80 × 65, M12 core/axis', 'rubber Ø80 × 65, M12 housing/axis', 'rubber Ø80 × 65, M12 rubber/axis'] })],
};
type Tray = { L: number; W: number };
/** Battery trays by BCI or DIN group footprint (mm; recalled). */
export const BATTERY_TRAYS = rowsOf(['L', 'W'] as const, [['motorcycle (150 × 87)', 150, 87], ['group 51 (238 × 129)', 238, 129], ['group 35 (230 × 175)', 230, 175], ['DIN H5 / L2 (242 × 175)', 242, 175], ['group 24 (260 × 173)', 260, 173], ['group 48 / H6 (278 × 175)', 278, 175], ['group 27 (306 × 173)', 306, 173], ['group 65 (306 × 192)', 306, 192], ['group 49 / H8 (354 × 175)', 354, 175]]);
const BATTERYTRAY: PartFamily<Tray> = {
  id: 'piece.batterytray', name: 'Battery tray', gloss: 'A battery tray by its battery group (BCI 24 to 65, DIN H5 to H8): a 2 mm tray 10 mm bigger each way, 30 mm deep (typical)', domains: DOM, aisle: V('Electrical'),
  says: 'A battery tray (group sizes recalled): a polypropylene tray 2 mm thick, 10 mm bigger than its battery each way and 30 mm deep, offering `<size> tray/cavity`: a battery of its group goes into it (Into a room); its hold-down clamp not drawn; it bolts to an inner wing',
  rows: BATTERY_TRAYS, size: 'group 24 (260 × 173)', source: 'typical (recalled BCI and DIN footprints)',
  recipe: (q, size) => made(`${size} tray`, 'pp', { case: [mm(q.L + 20), mm(30), mm(q.W + 20), mm(2), mm(2)] }, { color: BLACK }),
  expect: (q) => ({ bound: bound(mm(q.L + 20), mm(30), mm(q.W + 20)), mass: (mm(q.L + 20) * mm(30) * mm(q.W + 20) - mm(q.L + 16) * mm(28) * mm(q.W + 16)) * rho('pp'), tol: 0.01, massTol: 0.02, says: 'its outside; nominal mass, walls and floor' }),
  tests: [T(1, { offers: ['group 24 (260 × 173) tray/cavity'] })],
};
type CPedal = { W: number; D: number; L: number };
/** Car pedals: pad width and depth, arm length (mm; typical). */
export const CAR_PEDALS = rowsOf(['W', 'D', 'L'] as const, [['accelerator hanging 45 × 65, arm 200', 45, 65, 200], ['accelerator floor 50 × 80, arm 220', 50, 80, 220], ['racing drilled 60 × 60, arm 230', 60, 60, 230], ['clutch 60 × 55, arm 250', 60, 55, 250], ['brake 70 × 60, arm 250', 70, 60, 250], ['clutch 65 × 55, arm 270', 65, 55, 270], ['brake 75 × 60, arm 280', 75, 60, 280], ['truck brake 90 × 80, arm 320', 90, 80, 320]]);
const CARPEDAL: PartFamily<CPedal> = {
  id: 'piece.carpedal', name: 'Car pedal', gloss: 'A car pedal by its pad and arm: a rubber pad, a flat steel arm up from it, a pivot bush across its top (typical)', domains: DOM, aisle: V('Interior'),
  says: 'A pedal (typical): its rubber pad at the bottom, its 25 × 8 mm steel arm up from it (drawn straight), its pivot bush across the top (`<size> pivot/axis`; its return spring and pushrod not drawn); a pivot bolt goes through the bush into the pedal box',
  rows: CAR_PEDALS, size: 'brake 70 × 60, arm 250', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} pedal`, 1, [{ b: made(`${size} pad`, 'rubber', { box: [mm(q.W), mm(12), mm(q.D)] }, { color: BLACK }) }, { b: made(`${size} arm`, 'steel-low', { box: [mm(25), mm(q.L), mm(8)] }, { color: DARK }) }, { b: turn(made(`${size} pivot`, 'steel-low', { tube: [mm(5), mm(10), mm(30)] }, { color: DARK }), 2, 90) }]),
  expect: (q) => ({ bound: bound(mm(Math.max(q.W, 30)), mm(q.L + 32), mm(q.D)), mass: mm(q.W) * mm(12) * mm(q.D) * rho('rubber') + (mm(25) * mm(q.L) * mm(8) + annulus(mm(20), mm(10)) * mm(30)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its pad across by pad, arm and pivot; nominal mass, the three' }),
  tests: [T(3)],
};

/** Every family of vehicle and bicycle parts this file makes. */
export const VEHICLE = [BKHUB, BKRIM, BKSPOKE, BKNIPPLE, BKTYRE, BKCRANK, BKCHAINRING, BKCASSETTE, BKCOG, BKBB, BKPEDAL, BKSADDLE, BKSEATPOST, BKSTEM, BKBAR, BKHEADSET, BKFORK, BKBRAKE, BKROTOR, BKCHAINLINK, BKMECH, BKBELL, BKGRIP, BKMUDGUARD,
  CARWHEEL, CARTYRE, LUGNUT, WHEELHUB, BRAKEDISC, CARCALIPER, CARSPRING, SHOCK, LEAFSPRING, CONTROLARM, TIERODEND, BALLJOINT, STEERINGCOLUMN, SEATFRAME, BUCKLE, RADIATOR, FUELTANK, EXHAUSTPIPE, MUFFLER, MIRROR, HEADLAMP, NUMBERPLATE, BUMPERBEAM, TOWBALL, HITCHRECEIVER, ENGINEMOUNT, BATTERYTRAY, CARPEDAL] as PartFamily<unknown>[];
/** Each table's source: every one typical or recalled (decision 0029: no source hunting this round). */
export const VEHICLE_SOURCES: Record<string, string> = Object.fromEntries(VEHICLE.map((f) => [f.id, f.source]));
/** Their piece nodes (registered with the maker's check.row by familyNode). */
export const VEHICLE_NODES: BlockDef[] = VEHICLE.map((f) => familyNode(f));
