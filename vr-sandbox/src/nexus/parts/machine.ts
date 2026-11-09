// Aerospace, marine, machine-tool, HVAC and electrical-power parts made by the table-driven maker (decision 0029, the
// user's words of 2026-11-06: "just populate the library ... do the whole app roughly"): propeller and rotor blades and
// hubs, skids, spars, ribs, gear struts, fuel cells, nose cones; outboards, marine props, cleats, anchors, rudders,
// tillers, oars, mast steps, booms, winch drums, bilge pumps, through-hulls, fenders; spindles, chucks, collets, end
// mills, tool bits, quills, columns, T-slot tables, tailstocks, vices, tool holders, vee blocks; ducts, elbows, fan
// coils, radiators, compressors, refrigerant lines, grilles, dampers, filters, thermostats; transformers, contactors,
// MCCBs, busbars, cable trays, steel conduit, adaptable boxes, lampholders, plugs, sockets, switch plates, cables,
// earth rods. Each a table of rows and one recipe of the room operations (src/nexus/room.ts): no place is written here.
//
// Every row is typical or recalled (MACHINE_SOURCES says which): written from memory of makers' tables and standards'
// well-known figures, read from no source here, rough by decision 0029. A bought thing with no simple shape is its
// envelope (a box or a cylinder of its size) and says so. Threads are never drawn. Not made here, because a family
// already owns it: the MCB by poles (piece.dinbreaker, install.ts), the cable tie (piece.cabletie), PVC conduit
// (piece.conduit) and the IP65 junction box (piece.junctionbox): steel conduit (BS 4568) and the steel adaptable box
// are made instead.
//
// Faults met and built round (for the review by roots): ring's room check measures each copy's reach from its own
// middle against the pitch at R, so three or more radial blades (long along x) are refused though they meet nowhere;
// here the ring's radius is grown until it passes and the hub grown to meet the blades (fanOf), and a two-gang switch's
// rockers are set at 48 mm, not 36. And a ring's own axis line (`<ring>/axis`) takes its slot from the copies' bounds,
// so three copies (at 120°) leave almost no room on it (a marine prop's 3.6 mm where 17 mm is free) and a hub cannot
// go through: fanOf then stacks the hub on the ring, centred on its axis (its hub above the blades, not among them).

import { made, stack, onto, over, ring, through, turn, into, type Block } from '../room';
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
const frustum = (r1: number, r2: number, h: number) => (Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2)) / 3;
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const above0 = (set: Record<string, unknown>, k: string, what: string) => (Number(set[k]) > 0 && Number.isFinite(Number(set[k])) ? null : `${what} above 0 (${String(set[k])} mm)`);
const T = (pieces: number, more: Record<string, unknown> = {}, set?: Record<string, unknown>) => ({ ...(set ? { set } : {}), inputs: {}, outputs: { pieces, ...more } });
const M = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [mm(x), mm(y)]);
const withHole = (outer: [number, number][], inner: [number, number][]): [number, number][] => { const i = [...inner].reverse(); return [...outer, outer[0]!, ...i, i[0]!]; };
const rect = (w: number, h: number): [number, number][] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
const LEN = (d: number) => ({ key: 'length', label: 'Length, mm', type: 'number' as const, default: d });
const AERO = ['vehicles', 'mechanical', 'manufacturing'], SEA = ['vehicles', 'mechanical', 'everyday'], MT = ['mechanical', 'manufacturing'], HV = ['mechanical', 'everyday', 'manufacturing'], EP = ['electrical', 'everyday', 'manufacturing'];
const A = (c: string) => `Aerospace / ${c}`, S = (c: string) => `Marine / ${c}`, K = (c: string) => `Machine tools / ${c}`, H = (c: string) => `HVAC / ${c}`, E = (c: string) => `Electrical power / ${c}`;
const GREY = 0x9a9ea3, DARK = 0x2a2b2e, STEEL = 0x8d9399, ALU = 0xc8ccd0, CU = 0xc8874a, BRASS = 0xc9a54a, WOOD = 0xb08a5a, BLACK = 0x1e1f22, WHITE = 0xeeeeea, GALV = 0xa9acb0;
const TOL = 'bound within 1 %';
/** A table written as rows of numbers: each row's name, then its figures under the keys given. */
function rowsOf<K extends string>(keys: readonly K[], rows: readonly (readonly [string, ...number[]])[]): Record<string, Record<K, number>> {
  return Object.fromEntries(rows.map(([name, ...v]) => [name, Object.fromEntries(keys.map((k, i) => [k, v[i]!])) as Record<K, number>]));
}
// (a NACA 00xx outline: chord c along x, thickness ratio tc, 22 points, the trailing edge once)
const NACA = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const yt = (x: number, tc: number) => 5 * tc * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
const foil = (c: number, tc: number): [number, number][] => [[0, 0], ...NACA.map((x) => [x * c, yt(x, tc) * c] as [number, number]), [c, 0], ...[...NACA].reverse().map((x) => [x * c, -yt(x, tc) * c] as [number, number])];
const foilThick = (c: number, tc: number) => 2 * Math.max(...NACA.map((x) => yt(x, tc) * c));
/** n blades (or arms) round a hub: a ring of copies turned to face out, the hub through its axis. The ring's radius is
 *  grown where the ring's room check needs it (a fault noted at the head) and the hub grown to meet the blades. */
function fanOf(name: string, blade: Block, n: number, span: number, zext: number, hubR: number, hub: (r: number) => Block): Block {
  const reach = Math.hypot(span / 2, zext / 2), R = Math.max(hubR + 0.002 + span / 2, (reach + 0.0006) / Math.sin(Math.PI / n));
  const fan = ring(name, blade, n, R, 'clear', true), h = hub(R - span / 2 - 0.002);
  // (three copies: the ring's axis slot is read from the turned copies' bounds, so a blade at 120° leaves almost no room
  // on the axis and the hub is refused through it; it is then stacked on the ring, centred on its axis: a fault noted
  // at the head)
  try { return through(fan, h, { port: `${name}/axis`, from: 'lo' }, 'clear'); } catch { return stack(name, 1, [{ b: fan }, { b: h }], `${name}/axis`); }
}
const deg = (rad: number) => (rad * 180) / Math.PI;

// ==== aerospace ======================================================================================================
type Blade = { D: number; P: number; chord: number; t: number; mat: string };
const PROP_BLADES: Record<string, Blade> = { '9×6': { D: 9, P: 6, chord: 20, t: 3, mat: 'pa66-gf30' }, '10×5': { D: 10, P: 5, chord: 22, t: 3.5, mat: 'pa66-gf30' }, '12×6': { D: 12, P: 6, chord: 26, t: 4, mat: 'pa66-gf30' }, '14×7': { D: 14, P: 7, chord: 30, t: 5, mat: 'pa66-gf30' },
  '18×8': { D: 18, P: 8, chord: 38, t: 6, mat: 'wood' }, '22×10': { D: 22, P: 10, chord: 45, t: 8, mat: 'wood' }, '30×12': { D: 30, P: 12, chord: 60, t: 10, mat: 'wood' }, '72×44': { D: 72, P: 44, chord: 120, t: 25, mat: 'wood' }, '76×52': { D: 76, P: 52, chord: 130, t: 28, mat: 'al-6061' } };
const pitchOf = (q: { D: number; P: number }, at = 0.75) => Math.atan(q.P / (2 * Math.PI * at * (q.D / 2)));
const PROPBLADE: PartFamily<Blade> = {
  id: 'piece.propblade', name: 'Propeller blade', gloss: 'A propeller blade by its diameter and pitch (inches): a flat blade set at its pitch angle at 75 % radius (typical)', domains: AERO, aisle: A('Propellers and rotors'),
  says: 'One propeller blade by the prop\'s diameter × pitch (inches, as props are named): a flat blade from 12 % radius to the tip, its chord and thickness typical, turned about its span to the pitch angle at 75 % radius (atan(P / 2π·0.75R)). Approximated: no twist, no airfoil. Its root goes against a hub',
  rows: PROP_BLADES, size: '10×5', source: 'typical (recalled: model and light-aircraft props)',
  recipe: (q, size) => turn(made(`${size} blade`, q.mat, { box: [mm(q.D * 25.4 * 0.38), mm(q.t), mm(q.chord)] }, { color: q.mat === 'wood' ? WOOD : DARK }), 0, deg(pitchOf(q))),
  expect: (q) => { const L = mm(q.D * 25.4 * 0.38), t = mm(q.t), c = mm(q.chord), th = pitchOf(q); return { bound: [L, t * Math.cos(th) + c * Math.sin(th), c * Math.cos(th) + t * Math.sin(th)], mass: L * t * c * rho(q.mat), tol: 0.02, massTol: 0.02, says: 'its span, its turned section; nominal mass, the flat blade' }; },
  tests: [T(1)],
};
const PROP_HUBS = rowsOf(['D', 'bore', 'h', 'n', 'hole'], [['9 in', 20, 5, 8, 4, 1.5], ['12 in', 26, 6, 10, 4, 1.5], ['18 in', 36, 8, 14, 4, 2], ['22 in', 45, 10, 18, 4, 2.5], ['30 in', 60, 12, 25, 6, 3], ['72 in', 115, 32, 65, 6, 4]]);
const PROPHUB: PartFamily<Record<'D' | 'bore' | 'h' | 'n' | 'hole', number>> = {
  id: 'piece.prophub', name: 'Propeller hub', gloss: 'A propeller hub by the prop it carries: a bored disc with its bolt circle (typical)', domains: AERO, aisle: A('Propellers and rotors'),
  says: 'A propeller hub (aluminium) by the prop diameter it is for: a disc bored for its shaft, its bolt holes on a circle at 70 % of its radius (`<size> hub/bolts`). A shaft goes through its bore; blades go against its rim',
  rows: PROP_HUBS, size: '12 in', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} hub`, 'al-6061', { tube: [mm(q.bore) / 2, mm(q.D) / 2, mm(q.h)] }, { color: ALU, pattern: { name: 'bolts', circle: { n: q.n, r: mm(q.D) * 0.35 }, hole: mm(q.hole) } }),
  expect: (q) => ({ bound: [mm(q.D), mm(q.h), mm(q.D)], mass: (annulus(mm(q.D), mm(q.bore)) - q.n * disc(2 * mm(q.hole))) * mm(q.h) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its diameter and thickness; nominal mass, the disc less its bores' }),
  tests: [T(1, { offers: ['12 in hub/axis', '12 in hub/bolts'] })],
};
type Rotor = { R: number; chord: number; t: number; rootL: number; rootH: number; rootW: number; mat: string };
const ROTOR_BLADES: Record<string, Rotor> = { 'RC 450': { R: 0.325, chord: 32, t: 5, rootL: 25, rootH: 8, rootW: 12, mat: 'epoxy' }, 'RC 700': { R: 0.7, chord: 60, t: 8, rootL: 40, rootH: 12, rootW: 20, mat: 'epoxy' }, ultralight: { R: 3.0, chord: 180, t: 20, rootL: 300, rootH: 60, rootW: 120, mat: 'al-6061' },
  R22: { R: 3.83, chord: 184, t: 22, rootL: 350, rootH: 70, rootW: 130, mat: 'al-6061' }, R44: { R: 5.03, chord: 254, t: 30, rootL: 400, rootH: 80, rootW: 150, mat: 'al-6061' }, 'Bell 206': { R: 5.08, chord: 330, t: 40, rootL: 450, rootH: 90, rootW: 180, mat: 'al-6061' },
  AS350: { R: 5.35, chord: 350, t: 42, rootL: 500, rootH: 100, rootW: 200, mat: 'epoxy' }, 'UH-60': { R: 8.18, chord: 527, t: 50, rootL: 600, rootH: 120, rootW: 250, mat: 'epoxy' } };
const ROTORBLADE: PartFamily<Rotor> = {
  id: 'piece.rotorblade', name: 'Rotor blade (helicopter)', gloss: 'A main rotor blade by its radius: its root grip and its flat blade, end to end (typical; radii recalled)', domains: AERO, aisle: A('Propellers and rotors'),
  says: 'A helicopter main rotor blade by the aircraft (its radius recalled, its chord and thickness typical): its root grip (a block) and its blade (a flat plate of its chord) stacked end to end along x. Approximated: no airfoil, no twist. Its root goes on a hub\'s arm',
  rows: ROTOR_BLADES, size: 'R22', source: 'typical (radii and chords recalled)',
  recipe: (q, size) => stack(`${size} rotor blade`, 0, [{ b: made(`${size} blade root`, q.mat, { box: [mm(q.rootL), mm(q.rootH), mm(q.rootW)] }, { color: DARK }) }, { b: made(`${size} blade`, q.mat, { box: [q.R - mm(q.rootL), mm(q.t), mm(q.chord)] }, { color: q.mat === 'epoxy' ? BLACK : ALU }) }]),
  expect: (q) => ({ bound: [q.R, mm(Math.max(q.rootH, q.t)), mm(Math.max(q.rootW, q.chord))], mass: (mm(q.rootL) * mm(q.rootH) * mm(q.rootW) + (q.R - mm(q.rootL)) * mm(q.t) * mm(q.chord)) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its radius; nominal mass, root and blade' }),
  tests: [T(2, { faces: 1 })],
};
type Hub = { D: number; h: number; bore: number; n: number; armL: number; armH: number; armW: number; mat: string };
const ROTOR_HUBS: Record<string, Hub> = { 'RC 450': { D: 30, h: 25, bore: 5, n: 2, armL: 25, armH: 10, armW: 12, mat: 'al-6061' }, 'RC 700': { D: 45, h: 35, bore: 10, n: 2, armL: 40, armH: 14, armW: 20, mat: 'al-6061' }, R22: { D: 250, h: 150, bore: 50, n: 2, armL: 300, armH: 60, armW: 130, mat: 'steel-alloy' },
  R44: { D: 300, h: 180, bore: 60, n: 2, armL: 350, armH: 70, armW: 150, mat: 'steel-alloy' }, 'Bell 206': { D: 280, h: 160, bore: 60, n: 2, armL: 320, armH: 70, armW: 140, mat: 'steel-alloy' }, AS350: { D: 400, h: 200, bore: 80, n: 3, armL: 300, armH: 80, armW: 150, mat: 'steel-alloy' }, 'UH-60': { D: 600, h: 300, bore: 120, n: 4, armL: 400, armH: 100, armW: 200, mat: 'steel-alloy' } };
const ROTORHUB: PartFamily<Hub> = {
  id: 'piece.rotorhub', name: 'Rotor hub', gloss: 'A main rotor hub: its arms in a ring, its bored body through their middle (typical)', domains: AERO, aisle: A('Propellers and rotors'),
  says: 'A helicopter rotor hub by the aircraft: its blade arms (blocks) in a ring turned to face out, its body (a bored cylinder) through the ring\'s axis. Approximated: no feathering bearings, no dampers. The mast goes through its bore; a rotor blade\'s root goes on each arm',
  rows: ROTOR_HUBS, size: 'R44', source: 'typical (recalled)',
  recipe: (q, size) => fanOf(`${size} hub arms`, made(`${size} hub arm`, q.mat, { box: [mm(q.armL), mm(q.armH), mm(q.armW)] }, { color: STEEL }), q.n, mm(q.armL), mm(q.armW), mm(q.D) / 2, (r) => made(`${size} hub body`, q.mat, { tube: [mm(q.bore) / 2, r, mm(q.h)] }, { color: STEEL })),
  expect: () => ({ tol: 0.01, says: 'no size checked: its ring is grown where the ring\'s room check needs it (the head)' }),
  tests: [T(3)],
};
type Tail = { D: number; n: number; chord: number; t: number; hub: number; hubL: number; bore: number };
const TAIL_ROTORS = rowsOf(['D', 'n', 'chord', 't', 'hub', 'hubL', 'bore'], [['RC 450', 0.12, 2, 12, 2, 10, 8, 2], ['RC 700', 0.25, 2, 25, 3, 16, 12, 4], ['R22', 1.07, 2, 100, 10, 80, 60, 20], ['R44', 1.47, 2, 120, 12, 100, 70, 25], ['AS350', 1.86, 2, 185, 18, 120, 90, 30], ['UH-60', 3.35, 4, 250, 25, 300, 200, 60]]);
const TAILROTOR: PartFamily<Tail> = {
  id: 'piece.tailrotor', name: 'Tail rotor', gloss: 'A tail rotor by its diameter: its blades in a ring, its hub through their middle (typical)', domains: AERO, aisle: A('Propellers and rotors'),
  says: 'A tail rotor by the aircraft (diameter recalled): its flat blades in a ring turned to face out, its hub (a bored cylinder) through the ring\'s axis. Approximated: no pitch, no airfoil. Its hub goes on the tail rotor shaft',
  rows: TAIL_ROTORS, size: 'R44', source: 'typical (diameters recalled)',
  recipe: (q, size) => { const span = q.D / 2 - mm(q.hub) / 2 - 0.002; return fanOf(`${size} tail rotor`, made(`${size} tail blade`, 'al-6061', { box: [span, mm(q.t), mm(q.chord)] }, { color: ALU }), q.n, span, mm(q.chord), mm(q.hub) / 2, (r) => made(`${size} tail hub`, 'steel-alloy', { tube: [mm(q.bore) / 2, r, mm(q.hubL)] }, { color: STEEL })); },
  expect: () => ({ tol: 0.01, says: 'no size checked: its ring is grown where the ring\'s room check needs it (the head)' }),
  tests: [T(3)],
};
type Tube = { OD: number; t: number; L: number; mat: string };
const SKIDS: Record<string, Tube> = { 'RC 450': { OD: 6, t: 1, L: 250, mat: 'pa66' }, 'RC 700': { OD: 10, t: 1, L: 450, mat: 'al-6061' }, R22: { OD: 60, t: 3, L: 2600, mat: 'al-6061' }, R44: { OD: 70, t: 3.5, L: 3000, mat: 'al-6061' }, 'Bell 206': { OD: 80, t: 4, L: 3300, mat: 'al-6061' }, AS350: { OD: 90, t: 4, L: 3500, mat: 'al-6061' } };
const SKIDTUBE: PartFamily<Tube> = {
  id: 'piece.skidtube', name: 'Skid tube', gloss: 'A landing skid tube by the aircraft: a round tube lying along z (typical)', domains: AERO, aisle: A('Airframe'),
  says: 'A helicopter skid tube: a round tube of its outside and wall, lying along z (its upturned ends not drawn). Its cross tubes go onto it',
  rows: SKIDS, size: 'R44', source: 'typical (recalled)',
  recipe: (q, size) => turn(made(`${size} skid`, q.mat, { tube: [mm(q.OD) / 2 - mm(q.t), mm(q.OD) / 2, mm(q.L)] }, { color: ALU }), 0, 90),
  expect: (q) => ({ bound: [mm(q.OD), mm(q.OD), mm(q.L)], mass: annulus(mm(q.OD), mm(q.OD - 2 * q.t)) * mm(q.L) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its outside and length; nominal mass, the tube' }),
  tests: [T(1)],
};
type Spar = { w: number; h: number; t: number; mat: string };
const SPARS: Record<string, Spar> = { 'RC 1.5 m': { w: 12, h: 25, t: 1.5, mat: 'wood' }, 'RC 3 m': { w: 18, h: 40, t: 2, mat: 'wood' }, ultralight: { w: 60, h: 120, t: 3, mat: 'al-6061' }, LSA: { w: 80, h: 180, t: 4, mat: 'al-6061' }, 'light aircraft': { w: 100, h: 220, t: 5, mat: 'al-6061' }, glider: { w: 60, h: 260, t: 6, mat: 'epoxy' } };
const WINGSPAR: PartFamily<Spar> = {
  id: 'piece.wingspar', name: 'Wing spar (box)', gloss: 'A box spar by the wing class: a hollow rectangular section along z, by its length (typical)', domains: AERO, aisle: A('Airframe'),
  says: 'A box wing spar: a hollow rectangular section (its width across x, its depth up y, its wall) along z, so long. Ribs go over it; its root goes into a fitting',
  rows: SPARS, size: 'LSA', source: 'typical (recalled)', settings: [LEN(1000)], cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => made(`${size} spar`, q.mat, { section: { pts: M(withHole(rect(q.w, q.h), rect(q.w - 2 * q.t, q.h - 2 * q.t))), L: len(set) } }, { color: q.mat === 'wood' ? WOOD : ALU }),
  expect: (q, _s, set) => ({ bound: [mm(q.w), mm(q.h), len(set)], mass: (mm(q.w) * mm(q.h) - mm(q.w - 2 * q.t) * mm(q.h - 2 * q.t)) * len(set) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its section and length; nominal mass, the hollow section' }),
  tests: [T(1)],
};
type Rib = { c: number; t: number; mat: string };
const RIBS: Record<string, Rib> = { '150': { c: 150, t: 1.5, mat: 'wood' }, '200': { c: 200, t: 1.5, mat: 'wood' }, '250': { c: 250, t: 3, mat: 'wood' }, '300': { c: 300, t: 3, mat: 'wood' }, '400': { c: 400, t: 0.8, mat: 'al-6061' }, '600': { c: 600, t: 0.8, mat: 'al-6061' }, '1000': { c: 1000, t: 1.0, mat: 'al-6061' }, '1500': { c: 1500, t: 1.2, mat: 'al-6061' } };
const WINGRIB: PartFamily<Rib> = {
  id: 'piece.wingrib', name: 'Wing rib', gloss: 'A wing rib by its chord (mm): a NACA 0012 outline cut from sheet, its chord along x (typical)', domains: AERO, aisle: A('Airframe'),
  says: 'A wing rib by its chord: a NACA 0012 outline (22 points) of sheet (balsa or ply small, aluminium large), its chord along x, its thickness along z. Approximated: no lightening holes, no spar cut-outs. It goes over a spar',
  rows: RIBS, size: '300', source: 'NACA 0012 outline (its formula, recalled); sheet typical',
  recipe: (q, size) => made(`${size} mm rib`, q.mat, { section: { pts: M(foil(q.c, 0.12)), L: mm(q.t) } }, { color: q.mat === 'wood' ? WOOD : ALU }),
  expect: (q) => ({ bound: [mm(q.c), mm(foilThick(q.c, 0.12)), mm(q.t)], mass: areaOf(M(foil(q.c, 0.12))) * mm(q.t) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its chord and outline\'s depth; nominal mass, the outline in its sheet' }),
  tests: [T(1)],
};
type Strut = { d: number; Lr: number; OD: number; t: number; Lt: number; mat: string };
const STRUTS: Record<string, Strut> = { RC: { d: 4, Lr: 40, OD: 8, t: 1, Lt: 60, mat: 'al-6061' }, ultralight: { d: 20, Lr: 150, OD: 40, t: 4, Lt: 250, mat: 'steel-alloy' }, LSA: { d: 30, Lr: 200, OD: 50, t: 5, Lt: 300, mat: 'steel-alloy' }, 'C172 nose': { d: 50, Lr: 250, OD: 76, t: 6, Lt: 400, mat: 'steel-alloy' }, turboprop: { d: 80, Lr: 350, OD: 120, t: 10, Lt: 600, mat: 'steel-alloy' }, 'regional jet': { d: 120, Lr: 450, OD: 180, t: 15, Lt: 900, mat: 'steel-alloy' } };
const GEARSTRUT: PartFamily<Strut> = {
  id: 'piece.gearstrut', name: 'Landing gear strut (oleo)', gloss: 'An oleo strut: its piston rod under its outer cylinder, drawn extended (typical)', domains: AERO, aisle: A('Airframe'),
  says: 'A landing gear oleo strut by the aircraft class: its piston rod (a solid rod) with its outer cylinder (a tube) stacked above it, drawn fully extended. Approximated: no seals, no torque links. An axle goes through its rod\'s end; its cylinder goes into a trunnion',
  rows: STRUTS, size: 'LSA', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} oleo`, 1, [{ b: made(`${size} piston rod`, q.mat, { cyl: [mm(q.d) / 2, mm(q.Lr)] }, { color: 0xd8dcdf }) }, { b: made(`${size} oleo cylinder`, q.mat, { tube: [mm(q.OD) / 2 - mm(q.t), mm(q.OD) / 2, mm(q.Lt)] }, { color: STEEL }) }]),
  expect: (q) => ({ bound: [mm(q.OD), mm(q.Lr + q.Lt), mm(q.OD)], mass: (disc(mm(q.d)) * mm(q.Lr) + annulus(mm(q.OD), mm(q.OD - 2 * q.t)) * mm(q.Lt)) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its outside, its length extended; nominal mass, rod and tube' }),
  // (its rod and tube touched end to end before decision 0029's stack rested blocks pair by pair; now no face is written
  // between them: plan/FIX-PLAN.md root 1, left for that fix, not mended here)
  tests: [T(2)],
};
const FUEL_CELLS = rowsOf(['V'], [['5 L', 5], ['10 L', 10], ['20 L', 20], ['40 L', 40], ['60 L', 60], ['100 L', 100], ['200 L', 200]]);
const cellBox = (V: number) => { const s = Math.cbrt(V / 1000 / 2.4); return [2 * s, s, 1.2 * s] as [number, number, number]; };
const FUELCELL: PartFamily<{ V: number }> = {
  id: 'piece.fuelcell', name: 'Fuel cell (bladder tank)', gloss: 'A bladder fuel cell by its capacity: a box of its volume, 2 : 1 : 1.2 (an envelope)', domains: AERO, aisle: A('Systems'),
  says: 'A bladder fuel cell by its capacity (litres): its envelope, a rubber box of that volume at 2 : 1 : 1.2. It goes into a wing bay',
  rows: FUEL_CELLS, size: '40 L', source: 'typical (its shape ours)', envelope: 'a box of its volume: its fittings and baffles not drawn',
  recipe: (q, size) => made(`${size} fuel cell`, 'rubber', { box: cellBox(q.V) }, { color: BLACK }),
  expect: (q) => ({ bound: cellBox(q.V), tol: 0.01, says: 'its box' }),
  tests: [T(1)],
};
type Cone = { D: number; L: number; d: number; t: number; mat: string };
const CONES: Record<string, Cone> = { 'rocket 29 mm': { D: 29, L: 70, d: 2, t: 2, mat: 'abs' }, 'rocket 54 mm': { D: 54, L: 150, d: 3, t: 2.5, mat: 'abs' }, 'rocket 98 mm': { D: 98, L: 300, d: 4, t: 3, mat: 'epoxy' }, 'RC jet': { D: 150, L: 350, d: 8, t: 2, mat: 'epoxy' },
  'drone radome': { D: 300, L: 450, d: 20, t: 3, mat: 'epoxy' }, 'light aircraft spinner': { D: 330, L: 350, d: 40, t: 2, mat: 'al-6061' }, 'bizjet radome': { D: 900, L: 1200, d: 60, t: 6, mat: 'epoxy' }, 'airliner radome': { D: 2000, L: 2800, d: 150, t: 10, mat: 'epoxy' } };
const conePts = (q: Cone): [number, number][] => { const R = q.D / 2, k = (q.t * Math.hypot(R, q.L)) / R; return M([[R - q.t, 0], [R, 0], [q.d / 2, q.L], [0, q.L], [0, q.L - k]]); };
const NOSECONE: PartFamily<Cone> = {
  id: 'piece.nosecone', name: 'Nose cone', gloss: 'A nose cone or radome by its base and length: a hollow cone turned, its wall typical', domains: AERO, aisle: A('Airframe'),
  says: 'A nose cone (a rocket\'s, a radome, a spinner) by its base diameter and length: a hollow cone of its wall, turned about y, its base open at −y, its tip a small flat. It goes onto a body tube\'s end',
  rows: CONES, size: 'rocket 54 mm', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} nose cone`, q.mat, { lathe: { pts: conePts(q) } }, { color: q.mat === 'al-6061' ? ALU : WHITE }),
  expect: (q) => ({ bound: [mm(q.D), mm(q.L), mm(q.D)], mass: turnedVol(conePts(q)) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its base and length; nominal mass, the shell turned' }),
  tests: [T(1)],
};

// ==== marine =========================================================================================================
const OUTBOARDS = rowsOf(['hW', 'hH', 'hD', 'lW', 'lH', 'lD', 'gW', 'gH', 'gD', 'kg'], [['2.5 hp', 260, 330, 330, 110, 420, 180, 90, 150, 330, 17], ['5 hp', 310, 360, 380, 120, 450, 200, 100, 170, 380, 25], ['9.9 hp', 360, 430, 460, 140, 480, 240, 110, 200, 420, 40], ['20 hp', 420, 480, 520, 160, 520, 280, 120, 230, 480, 52],
  ['40 hp', 480, 560, 600, 180, 560, 320, 140, 260, 520, 85], ['60 hp', 520, 620, 680, 200, 600, 360, 160, 280, 560, 110], ['90 hp', 560, 680, 760, 220, 640, 400, 170, 300, 620, 160], ['150 hp', 620, 760, 860, 240, 700, 440, 190, 330, 700, 215], ['250 hp', 700, 820, 940, 260, 760, 480, 210, 360, 780, 280]]);
type Outboard = (typeof OUTBOARDS)[string];
const OUTBOARD: PartFamily<Outboard> = {
  id: 'piece.outboard', name: 'Outboard motor (envelope)', gloss: 'An outboard by its horsepower: gearcase, leg and powerhead as three boxes stacked (an envelope, typical)', domains: SEA, aisle: S('Propulsion'),
  says: 'An outboard motor by its power: its envelope as three boxes stacked up y, gearcase, leg and powerhead (cowl). Its bracket goes onto a transom; a propeller goes on its gearcase',
  rows: OUTBOARDS, size: '20 hp', source: 'typical (recalled)', envelope: 'three boxes: cowl, leg and gearcase',
  recipe: (q, size) => stack(`${size} outboard`, 1, [{ b: made(`${size} gearcase`, 'al-a380', { box: [mm(q.gW), mm(q.gH), mm(q.gD)] }, { color: DARK }) }, { b: made(`${size} leg`, 'al-a380', { box: [mm(q.lW), mm(q.lH), mm(q.lD)] }, { color: DARK }) }, { b: made(`${size} cowl`, 'abs', { box: [mm(q.hW), mm(q.hH), mm(q.hD)] }, { color: 0x2f4f6f }) }]),
  expect: (q) => ({ bound: [mm(Math.max(q.hW, q.lW, q.gW)), mm(q.hH + q.lH + q.gH), mm(Math.max(q.hD, q.lD, q.gD))], mass: q.kg, tol: 0.01, says: 'its height, width and depth; the row\'s mass' }),
  tests: [T(3, { faces: 2 })],
};
type Prop = { D: number; P: number; chord: number; t: number; hub: number; hubL: number; bore: number; mat: string };
const MARINE_PROPS: Record<string, Prop> = { '7.8×7': { D: 7.8, P: 7, chord: 50, t: 4, hub: 32, hubL: 50, bore: 10, mat: 'al-6061' }, '9.25×10': { D: 9.25, P: 10, chord: 70, t: 5, hub: 45, hubL: 70, bore: 14, mat: 'al-6061' }, '10.5×11': { D: 10.5, P: 11, chord: 85, t: 6, hub: 55, hubL: 80, bore: 18, mat: 'al-6061' },
  '11.5×13': { D: 11.5, P: 13, chord: 100, t: 7, hub: 70, hubL: 95, bore: 22, mat: 'al-6061' }, '13×17': { D: 13, P: 17, chord: 120, t: 8, hub: 85, hubL: 110, bore: 25, mat: 'stainless-316' }, '14.5×19': { D: 14.5, P: 19, chord: 140, t: 9, hub: 95, hubL: 125, bore: 28, mat: 'stainless-316' }, '15.25×21': { D: 15.25, P: 21, chord: 150, t: 10, hub: 105, hubL: 140, bore: 32, mat: 'stainless-316' } };
const MARINEPROP: PartFamily<Prop> = {
  id: 'piece.marineprop', name: 'Propeller (marine, 3 blade)', gloss: 'A three-blade outboard propeller by diameter × pitch (inches): its blades in a ring at their pitch, its hub through them (typical)', domains: SEA, aisle: S('Propulsion'),
  says: 'A marine propeller by its diameter × pitch (inches): three flat blades turned to the pitch angle at 70 % radius, in a ring turned to face out, its bored hub through the ring\'s axis. Approximated: no cup, no rake; its hub grown where the ring\'s room check needs it (the head). A prop shaft goes through its bore',
  rows: MARINE_PROPS, size: '10.5×11', source: 'typical (recalled: outboard prop sizes by power)',
  recipe: (q, size) => { const hubR = mm(q.hub) / 2, span = mm(q.D * 25.4) / 2 - hubR - 0.002, th = pitchOf(q, 0.7), c = mm(q.chord), t = mm(q.t);
    return fanOf(`${size} propeller`, turn(made(`${size} prop blade`, q.mat, { box: [span, t, c] }, { color: q.mat === 'al-6061' ? ALU : 0xd8dcdf }), 0, deg(th)), 3, span, c * Math.cos(th) + t * Math.sin(th), hubR, (r) => made(`${size} prop hub`, q.mat, { tube: [mm(q.bore) / 2, r, mm(q.hubL)] }, { color: ALU })); },
  expect: () => ({ tol: 0.01, says: 'no size checked: its ring is grown where the ring\'s room check needs it (the head)' }),
  tests: [T(4)],
};
type Cleat = { L: number; bL: number; bW: number; bH: number; hW: number; hH: number; mat: string };
const CLEATS: Record<string, Cleat> = { '100': { L: 100, bL: 50, bW: 22, bH: 8, hW: 14, hH: 12, mat: 'stainless-316' }, '125': { L: 125, bL: 60, bW: 25, bH: 9, hW: 16, hH: 14, mat: 'stainless-316' }, '150': { L: 150, bL: 70, bW: 28, bH: 10, hW: 18, hH: 16, mat: 'al-6061' }, '200': { L: 200, bL: 90, bW: 34, bH: 12, hW: 22, hH: 20, mat: 'al-6061' }, '250': { L: 250, bL: 110, bW: 40, bH: 14, hW: 26, hH: 24, mat: 'al-6061' }, '300': { L: 300, bL: 130, bW: 46, bH: 16, hW: 30, hH: 28, mat: 'pa66' } };
const CLEAT: PartFamily<Cleat> = {
  id: 'piece.cleat', name: 'Horn cleat', gloss: 'A horn cleat by its length (mm): its base with its horn bar across the top (typical)', domains: SEA, aisle: S('Deck hardware'),
  says: 'A horn cleat by its length: its base (a block, bolted down) with its horn (a bar of the cleat\'s length) across its top. Approximated: horns straight, not tapered. Its base goes onto a deck',
  rows: CLEATS, size: '150', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} mm cleat`, 1, [{ b: made(`${size} cleat base`, q.mat, { box: [mm(q.bL), mm(q.bH), mm(q.bW)] }, { color: ALU }) }, { b: made(`${size} cleat horn`, q.mat, { box: [mm(q.L), mm(q.hH), mm(q.hW)] }, { color: ALU }) }]),
  expect: (q) => ({ bound: [mm(q.L), mm(q.bH + q.hH), mm(Math.max(q.bW, q.hW))], mass: (mm(q.bL) * mm(q.bH) * mm(q.bW) + mm(q.L) * mm(q.hH) * mm(q.hW)) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its length and height; nominal mass, base and horn' }),
  tests: [T(2, { faces: 1 })],
};
const ANCHORS = rowsOf(['fW', 'fL', 'ft', 'sL', 'sw', 'st'], [['2 kg', 200, 180, 4, 300, 30, 6], ['4 kg', 280, 240, 5, 400, 35, 8], ['6 kg', 320, 280, 6, 480, 40, 10], ['8 kg', 360, 310, 6, 540, 45, 10], ['10 kg', 400, 340, 8, 600, 50, 12], ['15 kg', 460, 390, 10, 700, 60, 14], ['20 kg', 520, 440, 10, 800, 70, 16]]);
const BOATANCHOR: PartFamily<(typeof ANCHORS)[string]> = {
  id: 'piece.boatanchor', name: 'Anchor (envelope)', gloss: 'A fluke anchor by its mass: its fluke plate and its shank laid end to end along z (an envelope, typical)', domains: SEA, aisle: S('Deck hardware'),
  says: 'A Danforth-type anchor by its mass: its envelope, the fluke plate and the shank (two plates) end to end along z, lying flat. Its shank\'s end takes a shackle',
  rows: ANCHORS, size: '6 kg', source: 'typical (recalled)', envelope: 'two plates end to end: the stock and crown not drawn',
  recipe: (q, size) => stack(`${size} anchor`, 2, [{ b: made(`${size} anchor flukes`, 'steel-low', { box: [mm(q.fW), mm(q.ft), mm(q.fL)] }, { color: GALV }) }, { b: made(`${size} anchor shank`, 'steel-low', { box: [mm(q.sw), mm(q.st), mm(q.sL)] }, { color: GALV }) }]),
  expect: (q) => ({ bound: [mm(q.fW), mm(Math.max(q.ft, q.st)), mm(q.fL + q.sL)], tol: 0.01, says: 'its length and width' }),
  tests: [T(2, { faces: 1 })],
};
type Rudder = { c: number; span: number; t: number; mat: string };
const RUDDERS: Record<string, Rudder> = { RC: { c: 40, span: 150, t: 4, mat: 'abs' }, dinghy: { c: 300, span: 900, t: 25, mat: 'epoxy' }, 'keelboat 25 ft': { c: 400, span: 1300, t: 50, mat: 'epoxy' }, '35 ft': { c: 500, span: 1700, t: 80, mat: 'epoxy' }, '45 ft': { c: 600, span: 2100, t: 100, mat: 'epoxy' }, '60 ft': { c: 800, span: 2800, t: 130, mat: 'epoxy' } };
const rudderPts = (q: Rudder) => M(foil(q.c, q.t / q.c));
const RUDDER: PartFamily<Rudder> = {
  id: 'piece.rudder', name: 'Rudder blade', gloss: 'A rudder blade by the boat: a NACA outline of its chord and thickness, standing upright (typical)', domains: SEA, aisle: S('Steering and rig'),
  says: 'A rudder blade by the boat: a symmetric NACA outline of its chord (along x) and thickness (along z), its span up y. Approximated: no taper. Its stock goes up through a rudder tube; a tiller goes on its head',
  rows: RUDDERS, size: 'dinghy', source: 'typical (recalled)',
  recipe: (q, size) => turn(made(`${size} rudder`, q.mat, { section: { pts: rudderPts(q), L: mm(q.span) } }, { color: WHITE }), 0, 90),
  expect: (q) => ({ bound: [mm(q.c), mm(q.span), mm(foilThick(q.c, q.t / q.c))], mass: areaOf(rudderPts(q)) * mm(q.span) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its chord, span and thickness; nominal mass, the outline over its span' }),
  tests: [T(1)],
};
type Bar = { L: number; w: number; h: number; mat: string };
const TILLERS: Record<string, Bar> = { '600': { L: 600, w: 30, h: 20, mat: 'wood' }, '800': { L: 800, w: 35, h: 25, mat: 'wood' }, '1000': { L: 1000, w: 40, h: 30, mat: 'wood' }, '1200': { L: 1200, w: 45, h: 32, mat: 'wood' }, '1500': { L: 1500, w: 50, h: 35, mat: 'wood' }, 'al 1000': { L: 1000, w: 32, h: 32, mat: 'al-6063' } };
const TILLER: PartFamily<Bar> = {
  id: 'piece.tiller', name: 'Tiller', gloss: 'A tiller by its length (mm): a bar along z, ash or aluminium (typical)', domains: SEA, aisle: S('Steering and rig'),
  says: 'A tiller by its length: a bar of its width and depth along z (its taper not drawn). Its end goes onto a rudder head',
  rows: TILLERS, size: '1000', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} tiller`, q.mat, { box: [mm(q.w), mm(q.h), mm(q.L)] }, { color: q.mat === 'wood' ? WOOD : ALU }),
  expect: (q) => ({ bound: [mm(q.w), mm(q.h), mm(q.L)], mass: mm(q.w) * mm(q.h) * mm(q.L) * rho(q.mat), tol: 0.01, massTol: 0.02, says: 'its bar; nominal mass' }),
  tests: [T(1)],
};
const OARS = rowsOf(['L', 'd', 'bW', 'bL', 'bt'], [['1.5 m', 1500, 32, 120, 400, 12], ['1.8 m', 1800, 35, 130, 450, 12], ['2.1 m', 2100, 38, 140, 500, 14], ['2.4 m', 2400, 40, 150, 550, 14], ['2.7 m', 2700, 42, 160, 600, 15], ['3.0 m', 3000, 45, 170, 650, 16], ['paddle 1.2 m', 1200, 30, 180, 400, 10]]);
const OAR: PartFamily<(typeof OARS)[string]> = {
  id: 'piece.oar', name: 'Oar', gloss: 'An oar by its length: its round shaft with its flat blade stacked end to end along z (typical)', domains: SEA, aisle: S('Steering and rig'),
  says: 'An oar (ash) by its length: its shaft (a rod) and its blade (a flat plate) end to end along z. Its shaft goes through a rowlock',
  rows: OARS, size: '2.1 m', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} oar`, 2, [{ b: turn(made(`${size} oar shaft`, 'wood', { cyl: [mm(q.d) / 2, mm(q.L - q.bL)] }, { color: WOOD }), 0, 90) }, { b: made(`${size} oar blade`, 'wood', { box: [mm(q.bW), mm(q.bt), mm(q.bL)] }, { color: WOOD }) }]),
  expect: (q) => ({ bound: [mm(Math.max(q.d, q.bW)), mm(Math.max(q.d, q.bt)), mm(q.L)], mass: (disc(mm(q.d)) * mm(q.L - q.bL) + mm(q.bW) * mm(q.bt) * mm(q.bL)) * rho('wood'), tol: 0.01, massTol: 0.02, says: 'its length; nominal mass, shaft and blade' }),
  tests: [T(2, { faces: 1 })],
};
const MAST_STEPS = rowsOf(['D'], [['40', 40], ['50', 50], ['65', 65], ['80', 80], ['100', 100], ['120', 120], ['150', 150]]);
const MASTSTEP: PartFamily<{ D: number }> = {
  id: 'piece.maststep', name: 'Mast step', gloss: 'A mast step by the mast diameter (mm): a plate with four bolt holes and a socket tube on it (typical)', domains: SEA, aisle: S('Steering and rig'),
  says: 'A mast step by the mast it takes: a square plate (its bolt holes at its corners, `<size> step plate/bolts`) with a socket tube on it that the mast\'s foot goes into. Its plate goes onto a deck or keelson',
  rows: MAST_STEPS, size: '65', source: 'typical (recalled)',
  recipe: (q, size) => { const s = 2.2 * q.D, a = mm(s / 2 - 8); return stack(`${size} mast step`, 1, [{ b: made(`${size} step plate`, 'al-6061', { box: [mm(s), mm(5), mm(s)] }, { color: ALU, pattern: { name: 'bolts', points: [[-a, -a], [a, -a], [a, a], [-a, a]], hole: mm(3) } }) }, { b: made(`${size} step socket`, 'al-6061', { tube: [mm(q.D) / 2 + 0.001, mm(q.D) / 2 + 0.005, mm(40)] }, { color: ALU }) }]); },
  expect: (q) => { const s = mm(2.2 * q.D); return { bound: [s, mm(45), s], mass: ((s * s - 4 * disc(mm(6))) * mm(5) + annulus(mm(q.D) + 0.01, mm(q.D) + 0.002) * mm(40)) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its plate and height; nominal mass, plate less holes and socket' }; },
  tests: [T(2, { faces: 1 })],
};
const BOOMS = rowsOf(['OD', 't'], [['50', 50, 1.5], ['65', 65, 2], ['80', 80, 2.5], ['100', 100, 3], ['120', 120, 3.5], ['150', 150, 4], ['180', 180, 4.5]]);
const BOOM: PartFamily<(typeof BOOMS)[string]> = {
  id: 'piece.boom', name: 'Boom (sailing)', gloss: 'A sailing boom by its section (mm): a round aluminium tube along z, by its length (typical)', domains: SEA, aisle: S('Steering and rig'),
  says: 'A boom by its tube section: a round aluminium tube along z, so long (its track and fittings not drawn). Its gooseneck end goes onto a mast',
  rows: BOOMS, size: '80', source: 'typical (recalled)', settings: [LEN(3000)], cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => turn(made(`${size} boom`, 'al-6063', { tube: [mm(q.OD) / 2 - mm(q.t), mm(q.OD) / 2, len(set)] }, { color: ALU }), 0, 90),
  expect: (q, _s, set) => ({ bound: [mm(q.OD), mm(q.OD), len(set)], mass: annulus(mm(q.OD), mm(q.OD - 2 * q.t)) * len(set) * rho('al-6063'), tol: 0.01, massTol: 0.02, says: 'its outside and length; nominal mass, the tube' }),
  tests: [T(1)],
};
const WINCHES = rowsOf(['Rd', 'Rf', 'H'], [['6', 25, 32, 70], ['16', 35, 45, 95], ['30', 45, 58, 115], ['40', 50, 65, 125], ['46', 55, 70, 135], ['65', 70, 90, 160]]);
const winchPts = (q: { Rd: number; Rf: number; H: number }) => { const rb = q.Rd * 0.35, tf = 8; return M([[rb, 0], [q.Rf, 0], [q.Rf, tf], [q.Rd, tf], [q.Rd, q.H - tf], [q.Rf, q.H - tf], [q.Rf, q.H], [rb, q.H]]); };
const WINCHDRUM: PartFamily<(typeof WINCHES)[string]> = {
  id: 'piece.winchdrum', name: 'Winch drum (sailing)', gloss: 'A sailing winch drum by its size number: a waisted drum between two flanges, turned, bored (typical)', domains: SEA, aisle: S('Deck hardware'),
  says: 'A sheet winch drum by its size number: a turned drum, waisted between its base and top flanges, bored for its spindle. Its base goes onto a winch pedestal; a sheet wraps round its waist',
  rows: WINCHES, size: '30', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} winch drum`, 'al-6061', { lathe: { pts: winchPts(q) } }, { color: ALU }),
  expect: (q) => ({ bound: [mm(2 * q.Rf), mm(q.H), mm(2 * q.Rf)], mass: turnedVol(winchPts(q)) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its flange and height; nominal mass, the turned drum' }),
  tests: [T(1)],
};
const BILGE = rowsOf(['D', 'Hm', 'bW', 'bH', 'bD'], [['500 gph', 60, 90, 80, 30, 90], ['750 gph', 65, 100, 85, 32, 95], ['1100 gph', 75, 110, 95, 35, 105], ['1500 gph', 85, 125, 110, 38, 120], ['2000 gph', 95, 140, 120, 40, 135], ['3700 gph', 115, 170, 150, 45, 165]]);
const BILGEPUMP: PartFamily<(typeof BILGE)[string]> = {
  id: 'piece.bilgepump', name: 'Bilge pump (envelope)', gloss: 'A submersible bilge pump by its flow: its strainer base with its motor can on top (an envelope, typical)', domains: SEA, aisle: S('Systems'),
  says: 'A submersible bilge pump by its flow (US gph): its envelope, the strainer base (a box) with the motor can (a cylinder) on it. Its outlet and wires not drawn. Its base goes onto a hull',
  rows: BILGE, size: '1100 gph', source: 'typical (recalled)', envelope: 'a box and a cylinder: its outlet not drawn',
  recipe: (q, size) => stack(`${size} bilge pump`, 1, [{ b: made(`${size} pump strainer`, 'abs', { box: [mm(q.bW), mm(q.bH), mm(q.bD)] }, { color: DARK }) }, { b: made(`${size} pump motor`, 'abs', { cyl: [mm(q.D) / 2, mm(q.Hm)] }, { color: 0x2b4a6b }) }]),
  expect: (q) => ({ bound: [mm(Math.max(q.bW, q.D)), mm(q.bH + q.Hm), mm(Math.max(q.bD, q.D))], tol: 0.01, says: 'its height and footprint' }),
  tests: [T(2, { faces: 1 })],
};
const HULLS = rowsOf(['OD', 'bore', 'Df', 'tf', 'L'], [['1/2', 21, 13, 50, 6, 60], ['3/4', 26.5, 17, 58, 6, 70], ['1', 33.3, 22, 68, 7, 80], ['1 1/4', 42, 30, 80, 8, 90], ['1 1/2', 48, 35, 90, 8, 100], ['2', 60, 46, 105, 10, 120]]);
const hullPts = (q: { OD: number; bore: number; Df: number; tf: number; L: number }) => M([[q.bore / 2, 0], [q.Df / 2, 0], [q.Df / 2, q.tf], [q.OD / 2, q.tf], [q.OD / 2, q.L], [q.bore / 2, q.L]]);
const THROUGHHULL: PartFamily<(typeof HULLS)[string]> = {
  id: 'piece.throughhull', name: 'Through-hull fitting', gloss: 'A bronze through-hull by its BSP size: a flanged tube turned, its thread at its outside (typical)', domains: SEA, aisle: S('Systems'),
  says: 'A through-hull fitting by its BSP thread size: a flanged tube (bronze), its flange outside the hull at −y, its thread (not drawn) up its tube. It goes through a hull; a seacock screws onto it',
  rows: HULLS, size: '3/4', source: 'typical (BSP outsides recalled; the rest typical)',
  recipe: (q, size) => made(`${size} through-hull`, 'bronze', { lathe: { pts: hullPts(q) } }, { color: BRASS }),
  expect: (q) => ({ bound: [mm(q.Df), mm(q.L), mm(q.Df)], mass: turnedVol(hullPts(q)) * rho('bronze'), tol: 0.01, massTol: 0.02, says: 'its flange and length; nominal mass, turned' }),
  tests: [T(1)],
};
const FENDERS = rowsOf(['D', 'L', 't'], [['F-0', 140, 480, 4], ['F-1', 150, 560, 4], ['F-2', 200, 660, 5], ['F-3', 215, 760, 5], ['F-4', 265, 1020, 6], ['F-5', 290, 1120, 6], ['F-6', 380, 1270, 7]]);
const FENDER: PartFamily<(typeof FENDERS)[string]> = {
  id: 'piece.fender', name: 'Fender (boat)', gloss: 'An inflatable boat fender by its series size: a hollow PVC cylinder lying along z (an envelope, typical)', domains: SEA, aisle: S('Deck hardware'),
  says: 'A boat fender by its size (the common F series): its envelope, a hollow PVC cylinder of its wall lying along z, its ends drawn open. It hangs on a line from a rail',
  rows: FENDERS, size: 'F-2', source: 'typical (recalled)', envelope: 'a hollow cylinder, its rounded ends and eyes not drawn',
  recipe: (q, size) => turn(made(`${size} fender`, 'pvc', { tube: [mm(q.D) / 2 - mm(q.t), mm(q.D) / 2, mm(q.L)] }, { color: 0xeef0f2 }), 0, 90),
  expect: (q) => ({ bound: [mm(q.D), mm(q.D), mm(q.L)], tol: 0.01, says: 'its diameter and length' }),
  tests: [T(1)],
};

// ==== machine tools ==================================================================================================
const SPINDLES = rowsOf(['bore', 'D1', 'L1', 'D2', 'L'], [['20', 20, 60, 30, 45, 250], ['26', 26, 80, 35, 55, 300], ['38', 38, 100, 40, 70, 400], ['52', 52, 130, 45, 90, 500], ['80', 80, 180, 50, 120, 600], ['105', 105, 220, 60, 150, 700]]);
const spindlePts = (q: { bore: number; D1: number; L1: number; D2: number; L: number }) => M([[q.bore / 2, 0], [q.D1 / 2, 0], [q.D1 / 2, q.L1], [q.D2 / 2, q.L1], [q.D2 / 2, q.L], [q.bore / 2, q.L]]);
const SPINDLE: PartFamily<(typeof SPINDLES)[string]> = {
  id: 'piece.spindle', name: 'Lathe spindle', gloss: 'A lathe spindle by its through bore (mm): its nose and its body, turned and bored (typical)', domains: MT, aisle: K('Lathe'),
  says: 'A lathe spindle by its through bore: a turned shaft, its nose (the larger diameter, at −y) and its body behind, bored through. Bearings go over its body; a chuck goes onto its nose',
  rows: SPINDLES, size: '38', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} spindle`, 'steel-alloy', { lathe: { pts: spindlePts(q) } }, { color: STEEL }),
  expect: (q) => ({ bound: [mm(q.D1), mm(q.L), mm(q.D1)], mass: turnedVol(spindlePts(q)) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its nose and length; nominal mass, turned' }),
  tests: [T(1)],
};
const CHUCKS = rowsOf(['D', 'H', 'bore', 'jL', 'jW', 'jH'], [['80', 80, 55, 16, 28, 14, 22], ['100', 100, 65, 22, 32, 16, 25], ['125', 125, 75, 30, 38, 18, 28], ['160', 160, 85, 40, 45, 22, 32], ['200', 200, 95, 52, 55, 26, 36], ['250', 250, 105, 65, 65, 30, 40], ['315', 315, 120, 80, 80, 36, 48]]);
const CHUCK: PartFamily<(typeof CHUCKS)[string]> = {
  id: 'piece.chuck', name: 'Chuck (3 jaw)', gloss: 'A three-jaw scroll chuck by its diameter (mm): its bored body with three jaws in a ring on its face (typical)', domains: MT, aisle: K('Lathe'),
  says: 'A three-jaw chuck by its diameter: its body (cast iron, bored through) with three hardened jaws (blocks) in a ring on its face, turned to face out. Approximated: jaws drawn closed-in at a fixed radius, no scroll. Its back goes onto a spindle nose',
  rows: CHUCKS, size: '125', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} chuck`, 1, [{ b: made(`${size} chuck body`, 'cast-iron', { tube: [mm(q.bore) / 2, mm(q.D) / 2, mm(q.H)] }, { color: DARK }) }, { b: ring(`${size} chuck jaws`, made(`${size} chuck jaw`, 'steel-alloy', { box: [mm(q.jL), mm(q.jH), mm(q.jW)] }, { color: STEEL }), 3, mm(q.D) / 2 - mm(q.jL) / 2 - 0.002, 'clear', true) }], `${size} chuck jaws/axis`),
  expect: (q) => ({ bound: [mm(q.D), mm(q.H + q.jH), mm(q.D)], mass: annulus(mm(q.D), mm(q.bore)) * mm(q.H) * rho('cast-iron') + 3 * mm(q.jL) * mm(q.jH) * mm(q.jW) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its diameter, its height with jaws; nominal mass, body and jaws' }),
  tests: [T(4)],
};
const COLLETS = rowsOf(['D', 'd', 'L'], [['ER11', 11.5, 9.5, 18], ['ER16', 17, 14, 27.5], ['ER20', 21, 17, 31.5], ['ER25', 26, 21, 34], ['ER32', 33, 27, 40], ['ER40', 41, 33, 46]]);
const COLLET: PartFamily<(typeof COLLETS)[string]> = {
  id: 'piece.collet', name: 'Collet (ER)', gloss: 'An ER collet by its series: a cone of its outside and length, bored to the tool it holds (typical)', domains: MT, aisle: K('Tooling'),
  says: 'An ER collet by its series (ER11 to ER40): a spring-steel cone, bored to its tool\'s shank (set its bore). Approximated: its slits not drawn. It goes into a collet chuck\'s taper; a tool shank goes through its bore',
  rows: COLLETS, size: 'ER32', source: 'typical (ER outsides recalled)', settings: [{ key: 'bore', label: 'Bore, mm', type: 'number', default: 6 }],
  cannot: (q, size, set) => (Number(set.bore) > 0 ? (Number(set.bore) < q.d - 2 ? null : `a ${size} collet bored within its small end (${q.d} mm)`) : `a bore above 0 (${String(set.bore)} mm)`),
  recipe: (q, size, set) => made(`${size} collet`, 'steel-spring', { cone: [mm(q.D) / 2, mm(q.d) / 2, mm(q.L), Number(set.bore) / 2000] }, { color: STEEL }),
  expect: (q, _s, set) => ({ bound: [mm(q.D), mm(q.L), mm(q.D)], mass: (frustum(mm(q.D) / 2, mm(q.d) / 2, mm(q.L)) - disc(Number(set.bore) / 1000) * mm(q.L)) * rho('steel-spring'), tol: 0.01, massTol: 0.02, says: 'its outside and length; nominal mass, the cone less its bore' }),
  tests: [T(1)],
};
const ENDMILLS = rowsOf(['D', 'd', 'L', 'fl'], [['2', 2, 6, 50, 8], ['3', 3, 6, 50, 10], ['4', 4, 6, 57, 12], ['6', 6, 6, 57, 16], ['8', 8, 8, 63, 20], ['10', 10, 10, 72, 25], ['12', 12, 12, 83, 30], ['16', 16, 16, 92, 36], ['20', 20, 20, 104, 42]]);
const ENDMILL: PartFamily<(typeof ENDMILLS)[string]> = {
  id: 'piece.endmill', name: 'End mill', gloss: 'An end mill by its diameter (mm): its fluted end under its shank, drawn as two rods (typical)', domains: MT, aisle: K('Tooling'),
  says: 'An end mill by its cutting diameter: its fluted length (a rod, its flutes not cut) under its shank (a rod of its shank size), standing up y. Its shank goes into a collet',
  rows: ENDMILLS, size: '6', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} mm end mill`, 1, [{ b: made(`${size} mm flutes`, 'steel-tool', { cyl: [mm(q.D) / 2, mm(q.fl)] }, { color: 0xb8bcc0 }) }, { b: made(`${size} mm shank`, 'steel-tool', { cyl: [mm(q.d) / 2, mm(q.L - q.fl)] }, { color: STEEL }) }]),
  expect: (q) => ({ bound: [mm(Math.max(q.D, q.d)), mm(q.L), mm(Math.max(q.D, q.d))], mass: (disc(mm(q.D)) * mm(q.fl) + disc(mm(q.d)) * mm(q.L - q.fl)) * rho('steel-tool'), tol: 0.01, massTol: 0.02, says: 'its diameter and length; nominal mass, flutes solid' }),
  tests: [T(2, { faces: 1 })],
};
const TOOLBITS = rowsOf(['s', 'L'], [['1/4', 6.35, 63], ['5/16', 7.94, 80], ['3/8', 9.53, 100], ['1/2', 12.7, 100], ['5/8', 15.88, 125], ['3/4', 19.05, 150], ['1', 25.4, 200]]);
const TOOLBIT: PartFamily<(typeof TOOLBITS)[string]> = {
  id: 'piece.toolbit', name: 'Lathe tool bit (HSS blank)', gloss: 'A square HSS tool bit by its size (inches): a square bar, unground (typical)', domains: MT, aisle: K('Tooling'),
  says: 'A high-speed steel lathe tool bit by its square size: a square bar along z, unground. It goes into a tool post',
  rows: TOOLBITS, size: '3/8', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} in tool bit`, 'steel-tool', { box: [mm(q.s), mm(q.s), mm(q.L)] }, { color: 0xb8bcc0 }),
  expect: (q) => ({ bound: [mm(q.s), mm(q.s), mm(q.L)], mass: mm(q.s) * mm(q.s) * mm(q.L) * rho('steel-tool'), tol: 0.01, massTol: 0.02, says: 'its square and length; nominal mass' }),
  tests: [T(1)],
};
const QUILLS = rowsOf(['OD', 'bore', 'L'], [['drill 13 mm', 45, 25, 120], ['drill 16 mm', 50, 28, 150], ['drill 20 mm', 60, 35, 180], ['mini mill', 55, 32, 160], ['bench mill', 65, 38, 200], ['knee mill R8', 85.7, 50, 250]]);
const QUILL: PartFamily<(typeof QUILLS)[string]> = {
  id: 'piece.quill', name: 'Quill', gloss: 'A drill or mill quill by the machine: a bored sleeve the spindle turns in (typical)', domains: MT, aisle: K('Mill and drill'),
  says: 'A quill by the machine class: a steel sleeve bored for its spindle bearings, standing up y (its rack teeth not cut). A spindle goes through its bore; it slides in a head',
  rows: QUILLS, size: 'bench mill', source: 'typical (recalled; the Bridgeport quill 3.375 in)',
  recipe: (q, size) => made(`${size} quill`, 'steel-alloy', { tube: [mm(q.bore) / 2, mm(q.OD) / 2, mm(q.L)] }, { color: STEEL }),
  expect: (q) => ({ bound: [mm(q.OD), mm(q.L), mm(q.OD)], mass: annulus(mm(q.OD), mm(q.bore)) * mm(q.L) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its outside and length; nominal mass, the sleeve' }),
  tests: [T(1)],
};
const COLUMNS = rowsOf(['OD', 't', 'L'], [['drill 13 mm', 50, 3, 600], ['drill 16 mm', 60, 4, 900], ['drill 20 mm', 73, 4, 1100], ['drill 25 mm', 80, 5, 1300], ['mini mill', 60, 6, 450], ['bench mill', 90, 8, 550], ['round column mill', 115, 10, 700]]);
const COLUMN: PartFamily<(typeof COLUMNS)[string]> = {
  id: 'piece.column', name: 'Column tube', gloss: 'A drill press or mill column by the machine: a round steel tube standing up y (typical)', domains: MT, aisle: K('Mill and drill'),
  says: 'A machine column by the machine class: a round steel tube of its outside and wall, standing up y. Its foot goes into a base; a head clamps round it',
  rows: COLUMNS, size: 'drill 16 mm', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} column`, 'steel-low', { tube: [mm(q.OD) / 2 - mm(q.t), mm(q.OD) / 2, mm(q.L)] }, { color: STEEL }),
  expect: (q) => ({ bound: [mm(q.OD), mm(q.L), mm(q.OD)], mass: annulus(mm(q.OD), mm(q.OD - 2 * q.t)) * mm(q.L) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside and length; nominal mass, the tube' }),
  tests: [T(1)],
};
const TSLOTS = rowsOf(['a', 'b', 'h1', 'h2', 'n', 'W', 'H', 'L'], [['8', 8, 14, 7, 6, 3, 100, 28, 240], ['10', 10, 16, 8, 7, 3, 140, 32, 400], ['12', 12, 19, 9, 8, 3, 160, 36, 500], ['14', 14, 23, 11, 9, 3, 200, 40, 700], ['16', 16, 25, 12, 10, 3, 229, 45, 1067], ['18', 18, 30, 14, 12, 3, 300, 50, 1200], ['22', 22, 37, 16, 14, 4, 400, 60, 1600]]);
const tslotPts = (q: { a: number; b: number; h1: number; h2: number; n: number; W: number; H: number }): [number, number][] => {
  const pitch = q.W / (q.n + 1), top = q.H / 2, pts: [number, number][] = [[-q.W / 2, -top], [q.W / 2, -top], [q.W / 2, top]];
  for (let i = q.n - 1; i >= 0; i--) { const xc = (i - (q.n - 1) / 2) * pitch; pts.push([xc + q.a / 2, top], [xc + q.a / 2, top - q.h1], [xc + q.b / 2, top - q.h1], [xc + q.b / 2, top - q.h1 - q.h2], [xc - q.b / 2, top - q.h1 - q.h2], [xc - q.b / 2, top - q.h1], [xc - q.a / 2, top - q.h1], [xc - q.a / 2, top]); }
  pts.push([-q.W / 2, top]); return M(pts); };
const TSLOTTABLE: PartFamily<(typeof TSLOTS)[string]> = {
  id: 'piece.tslottable', name: 'T-slot table', gloss: 'A machine table by its T-slot size (mm, DIN 650): a cast-iron slab with its slots along z (typical)', domains: MT, aisle: K('Mill and drill'),
  says: 'A machine table by its T-slot size: a cast-iron slab, its T-slots (DIN 650 widths, recalled) cut along z across its top, so many at an even pitch. A vice or a T-nut goes into a slot; it goes onto a saddle',
  rows: TSLOTS, size: '14', source: 'DIN 650 slot widths (recalled); tables typical',
  recipe: (q, size) => made(`${size} T-slot table`, 'cast-iron', { section: { pts: tslotPts(q), L: mm(q.L) } }, { color: 0x6d7278 }),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(q.L)], mass: areaOf(tslotPts(q)) * mm(q.L) * rho('cast-iron'), tol: 0.01, massTol: 0.02, says: 'its slab; nominal mass, the slotted section' }),
  tests: [T(1)],
};
const TAILSTOCKS = rowsOf(['bW', 'bH', 'bD', 'yW', 'yH', 'yD', 'rD', 'rL'], [['7×14 mini', 120, 40, 100, 90, 90, 100, 25, 80], ['9×20', 150, 50, 120, 110, 110, 120, 32, 100], ['12×36', 220, 70, 180, 160, 160, 180, 45, 140], ['14×40', 260, 80, 220, 180, 180, 220, 52, 160], ['16×60', 300, 100, 260, 220, 220, 260, 63, 200]]);
const TAILSTOCK: PartFamily<(typeof TAILSTOCKS)[string]> = {
  id: 'piece.tailstock', name: 'Tailstock (envelope)', gloss: 'A lathe tailstock by the lathe: its base, its body and its barrel out of the body\'s front (an envelope, typical)', domains: MT, aisle: K('Lathe'),
  says: 'A lathe tailstock by the lathe size: its envelope, the base (a block) with the body on it and the barrel (a rod) out of the body\'s +z face. Its base goes onto the bed ways; a centre goes into its barrel',
  rows: TAILSTOCKS, size: '12×36', source: 'typical (recalled)', envelope: 'three blocks: its handwheel and clamp not drawn',
  recipe: (q, size) => onto(stack(`${size} tailstock`, 1, [{ b: made(`${size} tailstock base`, 'cast-iron', { box: [mm(q.bW), mm(q.bH), mm(q.bD)] }, { color: 0x6d7278 }) }, { b: made(`${size} tailstock body`, 'cast-iron', { box: [mm(q.yW), mm(q.yH), mm(q.yD)] }, { color: 0x6d7278 }) }]), '+z', turn(made(`${size} tailstock barrel`, 'steel-alloy', { cyl: [mm(q.rD) / 2, mm(q.rL)] }, { color: STEEL }), 0, 90)),
  expect: (q) => ({ bound: [mm(q.bW), mm(q.bH + q.yH), mm(q.bD + q.rL)], tol: 0.01, says: 'its envelope' }),
  tests: [T(3, { faces: 2 })],
};
const VICES = rowsOf(['W', 'L', 'Hb', 'jH', 'jT'], [['75', 75, 180, 30, 25, 22], ['100', 100, 240, 35, 32, 28], ['125', 125, 300, 40, 38, 32], ['150', 150, 360, 45, 45, 36], ['200', 200, 460, 55, 55, 45]]);
const MACHINEVICE: PartFamily<(typeof VICES)[string]> = {
  id: 'piece.machinevice', name: 'Machine vice', gloss: 'A milling vice by its jaw width (mm): its base with its fixed jaw at one end and its moving jaw at the other, drawn open (typical)', domains: MT, aisle: K('Mill and drill'),
  says: 'A machine vice by its jaw width: its cast-iron base (a block along z) with its fixed jaw on its −z end and its moving jaw on its +z end, drawn fully open. Approximated: no screw, no slide. Its base goes onto a T-slot table',
  rows: VICES, size: '100', source: 'typical (recalled)',
  recipe: (q, size) => { const jaw = (n: string) => made(`${size} vice ${n} jaw`, 'steel-alloy', { box: [mm(q.W), mm(q.jH), mm(q.jT)] }, { color: STEEL });
    return onto(onto(made(`${size} vice base`, 'cast-iron', { box: [mm(q.W), mm(q.Hb), mm(q.L)] }, { color: 0x6d7278 }), '+y', jaw('fixed'), 'touch', undefined, 'lo'), '+y', jaw('moving'), 'touch', undefined, 'hi'); },
  expect: (q) => ({ bound: [mm(q.W), mm(q.Hb + q.jH), mm(q.L)], mass: mm(q.W) * mm(q.Hb) * mm(q.L) * rho('cast-iron') + 2 * mm(q.W) * mm(q.jH) * mm(q.jT) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its width, height and length; nominal mass, base and jaws' }),
  tests: [T(3, { faces: 2 })],
};
const HOLDERS = rowsOf(['D', 'Lt', 'Df', 'tf', 'Dn', 'Ln', 'k'], [['BT30', 31.75, 48.4, 46, 16, 36, 40, 16], ['BT40', 44.45, 65.4, 63, 19, 50, 60, 16], ['BT50', 69.85, 101.8, 100, 25, 70, 80, 16], ['CAT40', 44.45, 68.3, 63, 19, 50, 60, 16], ['CAT50', 69.85, 101.8, 98, 25, 70, 80, 16], ['HSK63A', 48, 32, 63, 20, 50, 60, 20]]);
const holderPts = (q: { D: number; Lt: number; Df: number; tf: number; Dn: number; Ln: number; k: number }) => { const rs = q.D / 2 - q.Lt / q.k, rb = 4; return M([[rb, 0], [rs, 0], [q.D / 2, q.Lt], [q.Df / 2, q.Lt], [q.Df / 2, q.Lt + q.tf], [q.Dn / 2, q.Lt + q.tf], [q.Dn / 2, q.Lt + q.tf + q.Ln], [rb, q.Lt + q.tf + q.Ln]]); };
const TOOLHOLDER: PartFamily<(typeof HOLDERS)[string]> = {
  id: 'piece.toolholder', name: 'Tool holder (BT, CAT, HSK)', gloss: 'A machining-centre tool holder by its taper: its taper, its flange and its nose, turned (typical)', domains: MT, aisle: K('Tooling'),
  says: 'A tool holder by its taper (BT and CAT 7 : 24, HSK 1 : 10): its taper (small end at −y), its V-flange and its nose turned in one, a small bore through for its pull stud. Its taper goes into a spindle; a collet nut goes onto its nose',
  rows: HOLDERS, size: 'BT40', source: 'taper outsides (recalled); flanges and noses typical',
  recipe: (q, size) => made(`${size} holder`, 'steel-alloy', { lathe: { pts: holderPts(q) } }, { color: STEEL }),
  expect: (q) => ({ bound: [mm(q.Df), mm(q.Lt + q.tf + q.Ln), mm(q.Df)], mass: turnedVol(holderPts(q)) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its flange and length; nominal mass, turned' }),
  tests: [T(1)],
};
const VEES = rowsOf(['W', 'H', 'L', 'v'], [['40', 40, 32, 50, 25], ['50', 50, 40, 63, 32], ['75', 75, 50, 90, 45], ['100', 100, 63, 125, 60], ['150', 150, 90, 150, 90]]);
const veePts = (q: { W: number; H: number; v: number }) => M([[-q.W / 2, -q.H / 2], [q.W / 2, -q.H / 2], [q.W / 2, q.H / 2], [q.v / 2, q.H / 2], [0, q.H / 2 - q.v / 2], [-q.v / 2, q.H / 2], [-q.W / 2, q.H / 2]]);
const VEEBLOCK: PartFamily<(typeof VEES)[string]> = {
  id: 'piece.veeblock', name: 'Vee block', gloss: 'A vee block by its width (mm): a block with a 90° vee along z in its top (typical)', domains: MT, aisle: K('Mill and drill'),
  says: 'A vee block by its width: a hardened steel block with a 90° vee along z cut in its top. A round bar lies in its vee; it stands on a surface plate',
  rows: VEES, size: '75', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} vee block`, 'steel-tool', { section: { pts: veePts(q), L: mm(q.L) } }, { color: STEEL }),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(q.L)], mass: areaOf(veePts(q)) * mm(q.L) * rho('steel-tool'), tol: 0.01, massTol: 0.02, says: 'its block; nominal mass, the vee section' }),
  tests: [T(1)],
};

// ==== HVAC ===========================================================================================================
const DUCTS = rowsOf(['D', 't'], [['100', 100, 0.5], ['125', 125, 0.5], ['150', 150, 0.5], ['160', 160, 0.5], ['200', 200, 0.6], ['250', 250, 0.6], ['300', 300, 0.6], ['400', 400, 0.7], ['500', 500, 0.8], ['630', 630, 0.9]]);
const DUCT: PartFamily<(typeof DUCTS)[string]> = {
  id: 'piece.duct', name: 'Duct (round)', gloss: 'A round galvanised duct by its diameter (mm): a thin tube along z, by its length (typical)', domains: HV, aisle: H('Ductwork'),
  says: 'A round spiral duct by its diameter: a thin galvanised tube along z, so long (its seam not drawn). A coupler or an elbow goes over its end',
  rows: DUCTS, size: '200', source: 'typical (EN 1506 diameters recalled; walls typical)', settings: [LEN(1000)], cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => turn(made(`${size} duct`, 'steel-low', { tube: [mm(q.D) / 2 - mm(q.t), mm(q.D) / 2, len(set)] }, { color: GALV }), 0, 90),
  expect: (q, _s, set) => ({ bound: [mm(q.D), mm(q.D), len(set)], mass: annulus(mm(q.D), mm(q.D - 2 * q.t)) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its diameter and length; nominal mass, the tube' }),
  tests: [T(1)],
};
const RDUCTS = rowsOf(['W', 'H', 't'], [['200×100', 200, 100, 0.6], ['300×150', 300, 150, 0.6], ['400×200', 400, 200, 0.8], ['500×250', 500, 250, 0.8], ['600×300', 600, 300, 0.8], ['800×400', 800, 400, 1.0], ['1000×500', 1000, 500, 1.0]]);
const DUCTRECT: PartFamily<(typeof RDUCTS)[string]> = {
  id: 'piece.ductrect', name: 'Duct (rectangular)', gloss: 'A rectangular galvanised duct by its size (mm): a thin hollow section along z, by its length (typical)', domains: HV, aisle: H('Ductwork'),
  says: 'A rectangular duct by its width × height: a thin galvanised hollow section along z, so long (its flanges not drawn). It goes end to end with the next piece on a flange',
  rows: RDUCTS, size: '400×200', source: 'typical (recalled)', settings: [LEN(1000)], cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => made(`${size} duct`, 'steel-low', { section: { pts: M(withHole(rect(q.W, q.H), rect(q.W - 2 * q.t, q.H - 2 * q.t))), L: len(set) } }, { color: GALV }),
  expect: (q, _s, set) => ({ bound: [mm(q.W), mm(q.H), len(set)], mass: (mm(q.W) * mm(q.H) - mm(q.W - 2 * q.t) * mm(q.H - 2 * q.t)) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its section and length; nominal mass, the hollow section' }),
  tests: [T(1)],
};
const DUCTELBOW: PartFamily<(typeof DUCTS)[string]> = {
  id: 'piece.ductelbow', name: 'Duct elbow (round, 90°)', gloss: 'A round duct elbow by its diameter (mm): a 90° bend of the duct\'s tube at one diameter radius (typical)', domains: HV, aisle: H('Ductwork'),
  says: 'A round duct elbow by its diameter: the duct\'s tube bent through 90° at a centre-line radius of one diameter (a pressed bend). Each end goes over a duct',
  rows: DUCTS, size: '200', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} duct elbow`, 'steel-low', { bend: [mm(q.D), mm(q.D) / 2, 90, mm(q.D) / 2 - mm(q.t)] }, { color: GALV }),
  expect: (q) => ({ mass: annulus(mm(q.D), mm(q.D - 2 * q.t)) * (Math.PI / 2) * mm(q.D) * rho('steel-low'), tol: 0.01, massTol: 0.05, says: 'nominal mass, the tube along its bend' }),
  tests: [T(1)],
};
const FANCOILS = rowsOf(['W', 'H', 'D'], [['2 kW', 900, 230, 500], ['3.5 kW', 1000, 250, 550], ['5 kW', 1100, 280, 600], ['7 kW', 1200, 300, 650], ['10 kW', 1400, 350, 750], ['14 kW', 1600, 400, 850]]);
const FANCOIL: PartFamily<(typeof FANCOILS)[string]> = {
  id: 'piece.fancoil', name: 'Fan coil unit (envelope)', gloss: 'A ducted fan coil by its cooling duty: a box of its size (an envelope, typical)', domains: HV, aisle: H('Units'),
  says: 'A ducted fan coil unit by its duty: its envelope, a galvanised box of its width, height and depth. It hangs from a ceiling; ducts go onto its ends',
  rows: FANCOILS, size: '5 kW', source: 'typical (recalled)', envelope: 'a box: its coil, fan and tray not drawn',
  recipe: (q, size) => made(`${size} fan coil`, 'steel-low', { box: [mm(q.W), mm(q.H), mm(q.D)] }, { color: GALV }),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(q.D)], tol: 0.01, says: 'its box' }),
  tests: [T(1)],
};
const RADIATORS = rowsOf(['H'], [['300', 300], ['400', 400], ['500', 500], ['600', 600], ['700', 700], ['900', 900]]);
const PANEL = 1.25, FIN = 25;
const RADIATOR: PartFamily<{ H: number }> = {
  id: 'piece.radiator', name: 'Radiator (panel)', gloss: 'A steel panel radiator by its height, length and type (11, 21, 22): its panels and its fin blocks stacked through z (typical)', domains: HV, aisle: H('Units'),
  says: 'A panel radiator by its height (mm), its length and its type: type 11 one panel and one convector, 21 two panels and one, 22 two and two; each panel a steel plate, each convector drawn as one solid block (its fins not drawn: its mass over, so an envelope). Its brackets go onto a wall',
  rows: RADIATORS, size: '600', source: 'typical (EN 442 heights recalled)', envelope: 'its convectors as solid blocks', settings: [LEN(1000), { key: 'type', label: 'Type', type: 'choice', default: '22', choices: ['11', '21', '22'] }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => { const L = len(set), ty = String(set.type), panel = (i: number) => made(`${size} panel ${i}`, 'steel-low', { box: [L, mm(q.H), mm(PANEL)] }, { color: WHITE }), fins = (i: number) => made(`${size} convector ${i}`, 'steel-low', { box: [L - 0.02, mm(q.H - 60), mm(FIN)] }, { color: 0xd8d8d4 });
    const items = ty === '11' ? [panel(1), fins(1)] : ty === '21' ? [panel(1), fins(1), panel(2)] : [panel(1), fins(1), fins(2), panel(2)]; return stack(`${size} type ${ty} radiator`, 2, items.map((b) => ({ b }))); },
  expect: (q, _s, set) => { const ty = String(set.type), p = ty === '11' ? 1 : 2, f = ty === '22' ? 2 : 1; return { bound: [len(set), mm(q.H), mm(p * PANEL + f * FIN)], tol: 0.01, says: 'its length, height and depth by type' }; },
  tests: [T(4, { faces: 3 }), T(2, { faces: 1 }, { type: '11' })],
};
const COMPRESSORS = rowsOf(['D', 'H'], [['1 kW', 100, 200], ['2 kW', 115, 260], ['3.5 kW', 130, 320], ['5 kW', 140, 380], ['7 kW', 160, 420], ['10 kW', 180, 480], ['14 kW', 200, 520], ['20 kW', 240, 560]]);
const COMPRESSOR: PartFamily<(typeof COMPRESSORS)[string]> = {
  id: 'piece.compressor', name: 'Compressor (envelope)', gloss: 'A rotary or scroll refrigerant compressor by its cooling duty: a cylinder of its size (an envelope, typical)', domains: HV, aisle: H('Units'),
  says: 'A hermetic compressor by the duty it serves: its envelope, a steel can standing up y. Its feet go onto a base; its ports take refrigerant lines',
  rows: COMPRESSORS, size: '5 kW', source: 'typical (recalled)', envelope: 'a cylinder: its ports and terminals not drawn',
  recipe: (q, size) => made(`${size} compressor`, 'steel-low', { cyl: [mm(q.D) / 2, mm(q.H)] }, { color: BLACK }),
  expect: (q) => ({ bound: [mm(q.D), mm(q.H), mm(q.D)], tol: 0.01, says: 'its can' }),
  tests: [T(1)],
};
const REFLINES = rowsOf(['OD', 't', 'ins'], [['1/4', 6.35, 0.8, 9], ['3/8', 9.52, 0.8, 9], ['1/2', 12.7, 0.8, 9], ['5/8', 15.88, 1.0, 13], ['3/4', 19.05, 1.0, 13], ['7/8', 22.22, 1.0, 13], ['1 1/8', 28.58, 1.2, 13]]);
const REFLINE: PartFamily<(typeof REFLINES)[string]> = {
  id: 'piece.refline', name: 'Refrigerant line (insulated)', gloss: 'A refrigerant line by its tube size (inches): a copper tube with its foam insulation over it, along z, by its length (typical)', domains: HV, aisle: H('Pipework'),
  says: 'A refrigerant line by its copper tube size: the tube (its wall typical) with closed-cell foam insulation slid over it (Over a shaft), lying along z, so long. Its ends go into flare fittings',
  rows: REFLINES, size: '3/8', source: 'typical (ACR tube sizes recalled)', settings: [LEN(1000)], cannot: (_q, _s, set) => (len(set) >= 0.01 ? null : `a length of 10 mm or more (${String(set.length)} mm)`),
  recipe: (q, size, set) => { const L = len(set), r = mm(q.OD) / 2, tube = made(`${size} tube`, 'copper', { tube: [r - mm(q.t), r, L] }, { color: CU });
    // (wave 11 integration: the foam drawn with no bore, so over bores it to the tube at the slide fit's gap (a few µm) and
    // writes its face; before, a 0.3 mm gap (typical) stood off the tube, more than the fit's, and no face was written. Its
    // nominal mass below takes the foam's bore as the tube's outside: the fit's gap is under its 2 %)
    return turn(over(tube, `${size} tube/axis`, made(`${size} insulation`, 'foam', { cyl: [r + mm(q.ins), L - 0.002] }, { color: BLACK }), 'mid', 'slide'), 0, 90); },
  expect: (q, _s, set) => { const L = len(set), r = mm(q.OD) / 2, ro = r + mm(q.ins); return { bound: [2 * ro, 2 * ro, L], mass: annulus(mm(q.OD), mm(q.OD - 2 * q.t)) * L * rho('copper') + annulus(2 * ro, 2 * r) * (L - 0.002) * rho('foam'), tol: 0.01, massTol: 0.02, says: 'its insulated outside and length; nominal mass, tube and foam' }; },
  tests: [T(2, { faces: 1 })],
};
const GRILLES = rowsOf(['W', 'H'], [['200×100', 200, 100], ['300×150', 300, 150], ['400×200', 400, 200], ['600×300', 600, 300], ['600×600', 600, 600], ['1000×300', 1000, 300], ['1200×600', 1200, 600]]);
const BAR = 25, DEPTH = 25, LOUVRE = 1.5;
const GRILLE: PartFamily<(typeof GRILLES)[string]> = {
  id: 'piece.grille', name: 'Grille', gloss: 'An air grille by its size (mm): an aluminium frame with its louvre plate behind it (typical)', domains: HV, aisle: H('Ductwork'),
  says: 'An air grille by its face size: an aluminium frame (a hollow rectangle, 25 mm bars) with its louvre plate behind it at −z (the louvres not cut: one plate). Its frame goes onto a wall or a duct\'s face',
  rows: GRILLES, size: '400×200', source: 'typical (recalled)',
  recipe: (q, size) => stack(`${size} grille`, 2, [{ b: made(`${size} louvre plate`, 'al-6063', { box: [mm(q.W - 40), mm(q.H - 40), mm(LOUVRE)] }, { color: WHITE }) }, { b: made(`${size} grille frame`, 'al-6063', { section: { pts: M(withHole(rect(q.W, q.H), rect(q.W - 2 * BAR, q.H - 2 * BAR))), L: mm(DEPTH) } }, { color: WHITE }) }]),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(DEPTH + LOUVRE)], mass: ((mm(q.W) * mm(q.H) - mm(q.W - 2 * BAR) * mm(q.H - 2 * BAR)) * mm(DEPTH) + mm(q.W - 40) * mm(q.H - 40) * mm(LOUVRE)) * rho('al-6063'), tol: 0.01, massTol: 0.02, says: 'its face and depth; nominal mass, frame and plate' }),
  tests: [T(2, { faces: 1 })],
};
const DAMPERS = rowsOf(['D', 't', 'L'], [['100', 100, 0.6, 150], ['125', 125, 0.6, 150], ['150', 150, 0.6, 180], ['160', 160, 0.6, 180], ['200', 200, 0.6, 200], ['250', 250, 0.8, 220], ['300', 300, 0.8, 250], ['400', 400, 0.8, 280]]);
const DAMPER: PartFamily<(typeof DAMPERS)[string]> = {
  id: 'piece.damper', name: 'Damper (round)', gloss: 'A round volume damper by its diameter (mm): a short duct body with its blade disc in it, drawn closed (typical)', domains: HV, aisle: H('Ductwork'),
  says: 'A round damper by its diameter: a short galvanised body (a tube) with its blade (a disc) through its axis at the −y end, drawn closed. Approximated: no spindle, no quadrant. Each end goes over a duct',
  rows: DAMPERS, size: '200', source: 'typical (recalled)',
  recipe: (q, size) => { const r = mm(q.D) / 2; return through(made(`${size} damper body`, 'steel-low', { tube: [r - mm(q.t), r, mm(q.L)] }, { color: GALV }), made(`${size} damper blade`, 'steel-low', { cyl: [r - mm(q.t) - 0.0012, 0.001] }, { color: GALV }), { port: `${size} damper body/axis`, from: 'lo' }, 'clear'); },
  expect: (q) => ({ bound: [mm(q.D), mm(q.L), mm(q.D)], tol: 0.01, says: 'its diameter and length' }),
  tests: [T(2)],
};
const FILTERS = rowsOf(['W', 'H', 'D'], [['592×592×48', 592, 592, 48], ['592×287×48', 592, 287, 48], ['287×592×48', 287, 592, 48], ['495×495×48', 495, 495, 48], ['592×592×96', 592, 592, 96], ['20×20×1 in', 508, 508, 25], ['16×25×1 in', 406, 635, 25], ['20×25×1 in', 508, 635, 25], ['24×24×2 in', 610, 610, 48]]);
const FT = 10;
const FILTERFRAME: PartFamily<(typeof FILTERS)[string]> = {
  id: 'piece.filterframe', name: 'Filter (framed)', gloss: 'A framed air filter by its size (mm or inches): a tray frame with its media block in it, standing in the x-y plane (typical)', domains: HV, aisle: H('Units'),
  says: 'A panel air filter by its face size and depth: a plastic tray frame (a case) with its glass-wool media (a block) in its cavity (Into a room), turned to stand with its face in x-y and its depth along z. It slides into a filter rack',
  rows: FILTERS, size: '592×592×48', source: 'typical (EN 779 and inch sizes recalled)',
  recipe: (q, size) => { const frame = made(`${size} filter frame`, 'pp', { case: [mm(q.W), mm(q.D), mm(q.H), mm(FT), mm(FT)] }, { color: WHITE });
    return turn(into(frame, `${size} filter frame/cavity`, made(`${size} filter media`, 'glass-wool', { box: [mm(q.W - 2 * FT) - 0.003, mm(q.D - FT) - 0.003, mm(q.H - 2 * FT) - 0.003] }, { color: 0xf4f1e6 }), 'clear'), 0, 90); },
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(q.D)], mass: (mm(q.W) * mm(q.D) * mm(q.H) - mm(q.W - 2 * FT) * mm(q.D - FT) * mm(q.H - 2 * FT)) * rho('pp') + (mm(q.W - 2 * FT) - 0.003) * (mm(q.D - FT) - 0.003) * (mm(q.H - 2 * FT) - 0.003) * rho('glass-wool'), tol: 0.01, massTol: 0.02, says: 'its face and depth; nominal mass, frame and media' }),
  tests: [T(2)],
};
const THERMOSTATS = rowsOf(['round', 'W', 'H', 'D'], [['round dial', 1, 84, 84, 30], ['square wall', 0, 86, 86, 25], ['programmable', 0, 120, 80, 25], ['smart round', 1, 84, 84, 32], ['industrial', 0, 160, 100, 45], ['line voltage', 0, 70, 110, 35]]);
const THERMOSTAT: PartFamily<(typeof THERMOSTATS)[string]> = {
  id: 'piece.thermostat', name: 'Thermostat (envelope)', gloss: 'A wall thermostat by its kind: a disc or a box of its size, its depth along z (an envelope, typical)', domains: HV, aisle: H('Controls'),
  says: 'A room thermostat by its kind: its envelope, a round disc (its axis along z) or a box, its face in x-y. Its back goes onto a wall box',
  rows: THERMOSTATS, size: 'square wall', source: 'typical (recalled)', envelope: 'a disc or a box',
  recipe: (q, size) => (q.round ? turn(made(`${size} thermostat`, 'abs', { cyl: [mm(q.W) / 2, mm(q.D)] }, { color: WHITE }), 0, 90) : made(`${size} thermostat`, 'abs', { box: [mm(q.W), mm(q.H), mm(q.D)] }, { color: WHITE })),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(q.D)], tol: 0.01, says: 'its face and depth' }),
  tests: [T(1)],
};

// ==== electrical power ===============================================================================================
const TRANSFORMERS = rowsOf(['W', 'H', 'D', 'kg'], [['5 kVA', 400, 450, 300, 60], ['10 kVA', 450, 550, 350, 90], ['25 kVA', 550, 650, 400, 150], ['50 kVA', 650, 800, 450, 260], ['100 kVA', 800, 950, 550, 420], ['250 kVA', 1000, 1200, 700, 900], ['500 kVA', 1200, 1500, 800, 1500], ['1000 kVA', 1500, 1800, 1000, 2600]]);
const TRANSFORMER: PartFamily<(typeof TRANSFORMERS)[string]> = {
  id: 'piece.transformer', name: 'Transformer (envelope)', gloss: 'A dry-type three-phase transformer by its kVA: a box of its size (an envelope, typical)', domains: EP, aisle: E('Distribution'),
  says: 'A dry-type distribution transformer by its rating: its envelope, a steel box of its width, height and depth, its mass the row\'s. It stands on a floor; cables go onto its terminals',
  rows: TRANSFORMERS, size: '100 kVA', source: 'typical (recalled)', envelope: 'a box: its core, coils and terminals not drawn',
  recipe: (q, size) => made(`${size} transformer`, 'steel-low', { box: [mm(q.W), mm(q.H), mm(q.D)] }, { color: 0x6b7a86 }),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(q.D)], mass: q.kg, tol: 0.01, says: 'its box; the row\'s mass' }),
  tests: [T(1)],
};
const CONTACTORS = rowsOf(['W', 'H', 'D'], [['9 A', 45, 75, 85], ['12 A', 45, 75, 85], ['18 A', 45, 75, 85], ['25 A', 45, 85, 95], ['32 A', 55, 95, 100], ['40 A', 55, 95, 110], ['65 A', 75, 120, 120], ['95 A', 85, 130, 130], ['150 A', 100, 150, 150]]);
const CONTACTOR: PartFamily<(typeof CONTACTORS)[string]> = {
  id: 'piece.contactor', name: 'Contactor (envelope)', gloss: 'A three-pole contactor by its AC-3 current: a block of its size (an envelope, typical)', domains: EP, aisle: E('Switchgear'),
  says: 'A contactor by its AC-3 rating: its envelope, a block of its width, height and depth (its terminals and coil not drawn). It clips onto a DIN rail',
  rows: CONTACTORS, size: '25 A', source: 'typical (recalled)', envelope: 'a block',
  recipe: (q, size) => made(`${size} contactor`, 'pa66', { box: [mm(q.W), mm(q.H), mm(q.D)] }, { color: DARK }),
  expect: (q) => ({ bound: [mm(q.W), mm(q.H), mm(q.D)], tol: 0.01, says: 'its block' }),
  tests: [T(1)],
};
const MCCBS = rowsOf(['W', 'H', 'D'], [['100 A', 90, 130, 70], ['160 A', 105, 165, 86], ['250 A', 105, 165, 86], ['400 A', 140, 257, 103], ['630 A', 210, 275, 103], ['800 A', 210, 280, 110], ['1250 A', 210, 406, 140]]);
const MCCB: PartFamily<(typeof MCCBS)[string]> = {
  id: 'piece.mccb', name: 'MCCB (envelope)', gloss: 'A moulded-case circuit breaker by its frame (A) and poles: a block of its size (an envelope, typical)', domains: EP, aisle: E('Switchgear'),
  says: 'A moulded-case breaker by its frame rating, three or four poles (a fourth pole a third wider): its envelope, a block (its toggle and terminals not drawn). It goes onto a panel\'s mounting plate. The MCB by poles is piece.dinbreaker',
  rows: MCCBS, size: '250 A', source: 'typical (recalled)', envelope: 'a block', settings: [{ key: 'poles', label: 'Poles', type: 'choice', default: '3', choices: ['3', '4'] }],
  recipe: (q, size, set) => made(`${size} ${String(set.poles)}P MCCB`, 'pbt', { box: [mm(q.W) * (set.poles === '4' ? 4 / 3 : 1), mm(q.H), mm(q.D)] }, { color: BLACK }),
  expect: (q, _s, set) => ({ bound: [mm(q.W) * (set.poles === '4' ? 4 / 3 : 1), mm(q.H), mm(q.D)], tol: 0.01, says: 'its block by its poles' }),
  tests: [T(1)],
};
const BUSBARS = rowsOf(['w', 't'], [['15×3', 15, 3], ['20×5', 20, 5], ['25×5', 25, 5], ['30×5', 30, 5], ['40×5', 40, 5], ['50×5', 50, 5], ['40×10', 40, 10], ['60×10', 60, 10], ['80×10', 80, 10], ['100×10', 100, 10], ['120×10', 120, 10]]);
const BUSBAR: PartFamily<(typeof BUSBARS)[string]> = {
  id: 'piece.busbar', name: 'Busbar', gloss: 'A copper busbar by its section (mm): a flat bar along z, by its length (typical)', domains: EP, aisle: E('Distribution'),
  says: 'A copper busbar by its section (width × thickness): a flat bar, its width across x, along z, so long. It goes onto busbar supports; lugs bolt to it',
  rows: BUSBARS, size: '40×5', source: 'typical (common sections recalled)', settings: [LEN(1000)], cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => made(`${size} busbar`, 'copper', { box: [mm(q.w), mm(q.t), len(set)] }, { color: CU }),
  expect: (q, _s, set) => ({ bound: [mm(q.w), mm(q.t), len(set)], mass: mm(q.w) * mm(q.t) * len(set) * rho('copper'), tol: 0.01, massTol: 0.02, says: 'its bar; nominal mass' }),
  tests: [T(1)],
};
const TRAYS = rowsOf(['W', 'H', 't'], [['50', 50, 50, 1.0], ['100', 100, 50, 1.0], ['150', 150, 50, 1.2], ['200', 200, 50, 1.2], ['300', 300, 100, 1.5], ['450', 450, 100, 1.5], ['600', 600, 100, 1.5], ['900', 900, 100, 2.0]]);
const uPts = (q: { W: number; H: number; t: number }) => M([[-q.W / 2, 0], [q.W / 2, 0], [q.W / 2, q.H], [q.W / 2 - q.t, q.H], [q.W / 2 - q.t, q.t], [-q.W / 2 + q.t, q.t], [-q.W / 2 + q.t, q.H], [-q.W / 2, q.H]]);
const CABLETRAY: PartFamily<(typeof TRAYS)[string]> = {
  id: 'piece.cabletray', name: 'Cable tray', gloss: 'A galvanised cable tray by its width (mm): a U channel along z, by its length (typical)', domains: EP, aisle: E('Containment'),
  says: 'A cable tray by its width: a galvanised U section (its perforations not cut) along z, so long. It hangs on brackets; cables lie in it. Trunking is piece.trunking',
  rows: TRAYS, size: '150', source: 'typical (recalled)', settings: [LEN(3000)], cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => made(`${size} cable tray`, 'steel-low', { section: { pts: uPts(q), L: len(set) } }, { color: GALV }),
  expect: (q, _s, set) => ({ bound: [mm(q.W), mm(q.H), len(set)], mass: areaOf(uPts(q)) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its section and length; nominal mass, the U' }),
  tests: [T(1)],
};
const CONDUITS = rowsOf(['OD', 't'], [['20', 20, 1.6], ['25', 25, 1.6], ['32', 32, 1.6]]);
const STEELCONDUIT: PartFamily<(typeof CONDUITS)[string]> = {
  id: 'piece.steelconduit', name: 'Steel conduit (BS 4568)', gloss: 'Heavy-gauge galvanised steel conduit, 20, 25 or 32 mm: a tube along z, by its length (typical)', domains: EP, aisle: E('Containment'),
  says: 'Steel conduit by its size (20, 25, 32: BS 4568 class 4, its wall typical): a galvanised tube along z, so long (its thread not drawn). It screws into a coupler or a box\'s spout. PVC conduit is piece.conduit',
  rows: CONDUITS, size: '20', source: 'BS 4568 sizes (recalled); wall typical', settings: [LEN(3750)], cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => turn(made(`${size} steel conduit`, 'steel-low', { tube: [mm(q.OD) / 2 - mm(q.t), mm(q.OD) / 2, len(set)] }, { color: GALV }), 0, 90),
  expect: (q, _s, set) => ({ bound: [mm(q.OD), mm(q.OD), len(set)], mass: annulus(mm(q.OD), mm(q.OD - 2 * q.t)) * len(set) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside and length; nominal mass, the tube' }),
  tests: [T(1)],
};
const ABOXES = rowsOf(['W', 'H', 'D'], [['75', 75, 50, 75], ['100', 100, 50, 100], ['150', 150, 75, 150], ['225', 225, 100, 225], ['300', 300, 100, 300], ['450', 450, 150, 300]]);
const AT = 1.2;
const ADAPTABLEBOX: PartFamily<(typeof ABOXES)[string]> = {
  id: 'piece.adaptablebox', name: 'Adaptable box (steel)', gloss: 'A galvanised steel adaptable box by its size (mm): a tray with its lid on, or off (typical)', domains: EP, aisle: E('Containment'),
  says: 'A steel adaptable box by its size: a galvanised tray (its walls and floor 1.2 mm, its cavity offered as a room) with its flat lid on it, or off. Conduit goes into its sides (knockouts not cut). The IP65 box is piece.junctionbox',
  rows: ABOXES, size: '150', source: 'typical (recalled)', settings: [{ key: 'lid', label: 'Its lid', type: 'choice', default: 'on', choices: ['on', 'off'] }],
  recipe: (q, size, set) => { const box = made(`${size} adaptable box`, 'steel-low', { case: [mm(q.W), mm(q.H), mm(q.D), mm(AT), mm(AT)] }, { color: GALV }); return set.lid === 'off' ? box : stack(`${size} adaptable box`, 1, [{ b: box }, { b: made(`${size} box lid`, 'steel-low', { box: [mm(q.W), mm(AT), mm(q.D)] }, { color: GALV }) }]); },
  expect: (q, _s, set) => { const lid = set.lid !== 'off'; return { bound: [mm(q.W), mm(q.H) + (lid ? mm(AT) : 0), mm(q.D)], mass: (mm(q.W) * mm(q.H) * mm(q.D) - mm(q.W - 2 * AT) * mm(q.H - AT) * mm(q.D - 2 * AT) + (lid ? mm(q.W) * mm(AT) * mm(q.D) : 0)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside; nominal mass, tray and lid' }; },
  tests: [T(2, { faces: 1 }), T(1, { offers: ['150 adaptable box/cavity'] }, { lid: 'off' })],
};
const LAMPHOLDERS = rowsOf(['OD', 'ht', 'Ds', 'hs'], [['E14', 14, 18, 28, 14], ['E27', 27, 24, 40, 18], ['E40', 40, 38, 60, 25], ['B22', 22, 20, 36, 16], ['GU10', 20, 12, 50, 10]]);
const LAMPHOLDER: PartFamily<(typeof LAMPHOLDERS)[string]> = {
  id: 'piece.lampholder', name: 'Lampholder', gloss: 'A lampholder by its cap (E14, E27, E40, B22, GU10): its skirt with its shell on top (typical)', domains: EP, aisle: E('Lighting'),
  says: 'A lampholder by the lamp cap it takes: its phenolic skirt (a disc) with its shell (a thin tube, the thread not drawn) on it, open up y. A lamp\'s cap goes into its shell; its skirt goes onto a pendant or a fitting',
  rows: LAMPHOLDERS, size: 'E27', source: 'IEC 60061 cap sizes (recalled); the rest typical',
  recipe: (q, size) => stack(`${size} lampholder`, 1, [{ b: made(`${size} skirt`, 'phenolic', { cyl: [mm(q.Ds) / 2, mm(q.hs)] }, { color: BLACK }) }, { b: made(`${size} shell`, 'brass', { tube: [mm(q.OD) / 2 - 0.0005, mm(q.OD) / 2, mm(q.ht)] }, { color: BRASS }) }]),
  expect: (q) => ({ bound: [mm(q.Ds), mm(q.hs + q.ht), mm(q.Ds)], mass: disc(mm(q.Ds)) * mm(q.hs) * rho('phenolic') + annulus(mm(q.OD), mm(q.OD) - 0.001) * mm(q.ht) * rho('brass'), tol: 0.01, massTol: 0.02, says: 'its skirt and height; nominal mass, skirt and shell' }),
  tests: [T(2, { faces: 1 })],
};
type Plug = { kind: 'bs' | 'schuko' | 'euro' | 'nema'; W: number; H: number; D: number };
const PLUGS: Record<string, Plug> = { 'BS 1363': { kind: 'bs', W: 50, H: 20, D: 50 }, Schuko: { kind: 'schuko', W: 36, H: 18, D: 36 }, Europlug: { kind: 'euro', W: 35, H: 14, D: 35 }, 'NEMA 5-15': { kind: 'nema', W: 40, H: 18, D: 32 } };
type Pin = { xz: [number, number]; box?: [number, number, number]; cyl?: [number, number] };
// (each plug's pins: BS 1363 line and neutral 6.35 × 3.98 × 17.7 at 22.2 mm, its earth 7.92 × 3.98 × 22.7 at 22.2 above;
// Schuko and Europlug round 4.8 and 4 mm at 19 mm; NEMA 5-15 blades 1.5 × 6.3 × 15.9 at 12.7 mm, its ground 4.8 round
// 11.9 behind (recalled))
const pinsOf = (q: Plug): Pin[] => (q.kind === 'bs' ? [{ xz: [-11.1, -11.1], box: [6.35, 17.7, 3.98] }, { xz: [11.1, -11.1], box: [6.35, 17.7, 3.98] }, { xz: [0, 11.1], box: [7.92, 22.7, 3.98] }]
  : q.kind === 'schuko' ? [{ xz: [-9.5, 0], cyl: [4.8, 19] }, { xz: [9.5, 0], cyl: [4.8, 19] }] : q.kind === 'euro' ? [{ xz: [-9.5, 0], cyl: [4, 19] }, { xz: [9.5, 0], cyl: [4, 19] }]
  : [{ xz: [-6.35, -5], box: [1.5, 15.9, 6.3] }, { xz: [6.35, -5], box: [1.5, 15.9, 6.3] }, { xz: [0, 6.9], cyl: [4.8, 18] }]);
const pinArea = (p: Pin) => (p.box ? mm(p.box[0]) * mm(p.box[2]) : disc(mm(p.cyl![0])));
const PLUGTOP: PartFamily<Plug> = {
  id: 'piece.plugtop', name: 'Plug (BS 1363, Schuko, Europlug, NEMA)', gloss: 'A mains plug by its standard: its moulded body with its pins down through it (an envelope, typical)', domains: EP, aisle: E('Accessories'),
  says: 'A mains plug by its standard: its body (a block or a disc, an envelope) with its brass pins through it from the top down and out below (`<size> plug body/pins`), each at its standard\'s place (recalled). Its pins go into a socket outlet',
  rows: PLUGS, size: 'BS 1363', source: 'pin sizes and pitches recalled from BS 1363, CEE 7, IEC 60906, NEMA; bodies typical', envelope: 'its moulding as one block, no cord, no fuse',
  recipe: (q, size) => { const pins = pinsOf(q), body = made(`${size} plug body`, 'pa66', q.kind === 'schuko' ? { cyl: [mm(q.W) / 2, mm(q.H)] } : { box: [mm(q.W), mm(q.H), mm(q.D)] }, { color: WHITE, pattern: { name: 'pins', points: pins.map((p) => [mm(p.xz[0]), mm(p.xz[1])] as [number, number]) } });
    return pins.reduce((b, p, i) => through(b, made(`${size} pin ${i + 1}`, 'brass', p.box ? { box: [mm(p.box[0]), mm(q.H + p.box[1]), mm(p.box[2])] } : { cyl: [mm(p.cyl![0]) / 2, mm(q.H + p.cyl![1])] }, { color: BRASS }), { port: `${size} plug body/pins`, i, from: 'hi' }, 'tight'), body); },
  expect: (q) => { const pins = pinsOf(q), body = (q.kind === 'schuko' ? disc(mm(q.W)) : mm(q.W) * mm(q.D)) * mm(q.H), zs = pins.map((p) => p.xz[1] + (p.box ? p.box[2] : p.cyl![0]) / 2); return { bound: [mm(q.W), mm(q.H + Math.max(...pins.map((p) => (p.box ? p.box[1] : p.cyl![1])))), mm(Math.max(q.kind === 'schuko' ? q.W : q.D, ...zs.map((z) => 2 * Math.abs(z))))], mass: body * rho('pa66') + pins.reduce((m, p) => m + pinArea(p) * mm(p.box ? p.box[1] : p.cyl![1]), 0) * rho('brass') - pins.reduce((m, p) => m + pinArea(p) * mm(q.H), 0) * (rho('pa66') - rho('brass')), tol: 0.01, massTol: 0.03, says: 'its body and pins\' reach; nominal mass, body with its pins through it' }; },
  tests: [T(4), T(3, {}, { size: 'Schuko' })],
};
type Socket = { W: number; D: number; t: number; sets: [number, number][]; ln: [number, number][]; e: [number, number][]; rl: number; re: number };
const SOCKETS: Record<string, Socket> = { 'BS 1363 1 gang': { W: 86, D: 86, t: 9, sets: [[0, 0]], ln: [[-11.1, -11.1], [11.1, -11.1]], e: [[0, 11.1]], rl: 3.5, re: 4 }, 'BS 1363 2 gang': { W: 146, D: 86, t: 9, sets: [[-36, 0], [36, 0]], ln: [[-11.1, -11.1], [11.1, -11.1]], e: [[0, 11.1]], rl: 3.5, re: 4 },
  'Schuko 1 gang': { W: 80, D: 80, t: 12, sets: [[0, 0]], ln: [[-9.5, 0], [9.5, 0]], e: [], rl: 2.6, re: 2.6 }, 'NEMA 5-15 duplex': { W: 70, D: 114, t: 8, sets: [[0, -19], [0, 19]], ln: [[-6.35, -5], [6.35, -5]], e: [[0, 6.9]], rl: 3.3, re: 2.6 } };
const holesOf = (q: Socket, which: 'ln' | 'e') => q.sets.flatMap(([sx, sz]) => q[which].map(([x, z]) => [mm(sx + x), mm(sz + z)] as [number, number]));
const SOCKETOUTLET: PartFamily<Socket> = {
  id: 'piece.socketoutlet', name: 'Socket outlet', gloss: 'A socket outlet plate by its standard and gangs: a plate with its pin apertures through it, drawn round (typical)', domains: EP, aisle: E('Accessories'),
  says: 'A socket outlet by its standard and gangs: its front plate (polycarbonate), its apertures drawn as round holes at the pins\' places (`<size> plate/ln`, `/e`; rectangular apertures approximated round). Approximated: no shutters, no switch. A plug\'s pins go through its holes; it goes onto a back box',
  rows: SOCKETS, size: 'BS 1363 1 gang', source: 'pin pitches recalled (BS 1363, CEE 7, NEMA); plates typical',
  recipe: (q, size) => made(`${size} plate`, 'pc', { box: [mm(q.W), mm(q.t), mm(q.D)] }, { color: WHITE, patterns: [{ name: 'ln', points: holesOf(q, 'ln'), hole: mm(q.rl) }, ...(q.e.length ? [{ name: 'e', points: holesOf(q, 'e'), hole: mm(q.re) }] : [])] }),
  expect: (q) => ({ bound: [mm(q.W), mm(q.t), mm(q.D)], mass: (mm(q.W) * mm(q.D) - holesOf(q, 'ln').length * disc(2 * mm(q.rl)) - holesOf(q, 'e').length * disc(2 * mm(q.re))) * mm(q.t) * rho('pc'), tol: 0.01, massTol: 0.02, says: 'its plate; nominal mass, the plate less its holes' }),
  tests: [T(1, { offers: ['BS 1363 1 gang plate/e', 'BS 1363 1 gang plate/ln'] })],
};
type Switch = { W: number; D: number; t: number; rW: number; rH: number; rD: number; n: number };
const SWITCHES: Record<string, Switch> = { 'BS 1 gang': { W: 86, D: 86, t: 9, rW: 16, rH: 4, rD: 36, n: 1 }, 'BS 2 gang': { W: 86, D: 86, t: 9, rW: 16, rH: 4, rD: 36, n: 2 }, 'Schuko (DE) 1 gang': { W: 80, D: 80, t: 12, rW: 55, rH: 3, rD: 55, n: 1 }, 'NEMA decora': { W: 70, D: 114, t: 8, rW: 33, rH: 4, rD: 67, n: 1 }, 'NEMA toggle': { W: 70, D: 114, t: 8, rW: 8, rH: 14, rD: 10, n: 1 } };
const SWITCHPLATE: PartFamily<Switch> = {
  id: 'piece.switchplate', name: 'Switch plate', gloss: 'A light switch by its standard and gangs: its plate with its rockers (or toggle) on it (typical)', domains: EP, aisle: E('Accessories'),
  says: 'A light switch by its standard and gangs: its front plate with its rocker (a block) on it, two gangs\' rockers in a ring of two at 48 mm (the ring\'s room check refuses 36: the head). Approximated: no tilt. It goes onto a back box',
  rows: SWITCHES, size: 'BS 1 gang', source: 'typical (recalled)',
  recipe: (q, size) => { const plate = made(`${size} switch plate`, 'pc', { box: [mm(q.W), mm(q.t), mm(q.D)] }, { color: WHITE }), rocker = made(`${size} rocker`, 'pc', { box: [mm(q.rW), mm(q.rH), mm(q.rD)] }, { color: WHITE });
    return q.n === 1 ? onto(plate, '+y', rocker) : stack(`${size} switch`, 1, [{ b: plate }, { b: ring(`${size} rockers`, rocker, 2, 0.024, 'clear') }], `${size} rockers/axis`); },
  expect: (q) => ({ bound: [mm(q.W), mm(q.t + q.rH), mm(q.D)], mass: (mm(q.W) * mm(q.t) * mm(q.D) + q.n * mm(q.rW) * mm(q.rH) * mm(q.rD)) * rho('pc'), tol: 0.01, massTol: 0.02, says: 'its plate and rocker; nominal mass' }),
  tests: [T(2, { faces: 1 }), T(3, {}, { size: 'BS 2 gang' })],
};
const CABLES = rowsOf(['A', 't'], [['1.5', 1.5, 0.7], ['2.5', 2.5, 0.8], ['4', 4, 0.8], ['6', 6, 0.8], ['10', 10, 1.0], ['16', 16, 1.0], ['25', 25, 1.2], ['35', 35, 1.2], ['50', 50, 1.4], ['70', 70, 1.4], ['95', 95, 1.6]]);
const condD = (A: number) => 2 * Math.sqrt(mm(mm(A)) / Math.PI);
const POWERCABLE: PartFamily<(typeof CABLES)[string]> = {
  id: 'piece.powercable', name: 'Cable (single core, by section)', gloss: 'A single-core cable by its section (mm²): its copper conductor as a rod with its PVC insulation over it, along z, by its length (typical)', domains: EP, aisle: E('Cables'),
  says: 'A single-core cable by its conductor section: its conductor (a solid copper rod of that section) with its PVC insulation (a sleeve) slid over it (Over a shaft), lying along z, so long. Approximated: solid, not stranded. Its ends go into terminals. Flexible cords are piece.flexcable',
  rows: CABLES, size: '2.5', source: 'HD 21 sections (recalled); insulation walls typical', settings: [LEN(1000)], cannot: (_q, _s, set) => (len(set) >= 0.01 ? null : `a length of 10 mm or more (${String(set.length)} mm)`),
  recipe: (q, size, set) => { const L = len(set), r = condD(q.A) / 2, rod = made(`${size} mm² conductor`, 'copper', { cyl: [r, L] }, { color: CU });
    // (wave 11 integration: the insulation is extruded on its conductor, so it touches it: drawn with the conductor's
    // radius for its bore and laid on by the touch fit, a face written; before, a 0.3 mm gap (typical) stood off the rod,
    // more than the slide fit's, and no face was written)
    return turn(over(rod, `${size} mm² conductor/axis`, made(`${size} mm² insulation`, 'pvc', { tube: [r, r + mm(q.t), L - 0.002] }, { color: 0x8b3a2e }), 'mid', 'touch'), 0, 90); },
  expect: (q, _s, set) => { const L = len(set), r = condD(q.A) / 2, ro = r + mm(q.t); return { bound: [2 * ro, 2 * ro, L], mass: disc(2 * r) * L * rho('copper') + annulus(2 * ro, 2 * r) * (L - 0.002) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its outside and length; nominal mass, conductor and insulation' }; },
  tests: [T(2, { faces: 1 })],
};
const EARTHRODS = rowsOf(['d', 'L'], [['5/8 × 1200', 15.9, 1200], ['5/8 × 1500', 15.9, 1500], ['5/8 × 2400', 15.9, 2400], ['3/4 × 1200', 19.05, 1200], ['3/4 × 2400', 19.05, 2400], ['3/4 × 3000', 19.05, 3000], ['1 × 3000', 25.4, 3000]]);
const EARTHROD: PartFamily<(typeof EARTHRODS)[string]> = {
  id: 'piece.earthrod', name: 'Earth rod', gloss: 'A copper-bonded earth rod by its diameter (inches) and length (mm): a rod standing up y (typical)', domains: EP, aisle: E('Earthing'),
  says: 'An earth rod by its size: a copper-bonded steel rod (drawn as steel) standing up y, driven into the ground. A clamp goes onto its top',
  rows: EARTHRODS, size: '5/8 × 1200', source: 'typical (recalled)',
  recipe: (q, size) => made(`${size} earth rod`, 'steel-low', { cyl: [mm(q.d) / 2, mm(q.L)] }, { color: CU }),
  expect: (q) => ({ bound: [mm(q.d), mm(q.L), mm(q.d)], mass: disc(mm(q.d)) * mm(q.L) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its rod; nominal mass, as steel' }),
  tests: [T(1)],
};

/** Every family this file makes, by trade. */
export const MACHINE = [PROPBLADE, PROPHUB, ROTORBLADE, ROTORHUB, TAILROTOR, SKIDTUBE, WINGSPAR, WINGRIB, GEARSTRUT, FUELCELL, NOSECONE,
  OUTBOARD, MARINEPROP, CLEAT, BOATANCHOR, RUDDER, TILLER, OAR, MASTSTEP, BOOM, WINCHDRUM, BILGEPUMP, THROUGHHULL, FENDER,
  SPINDLE, CHUCK, COLLET, ENDMILL, TOOLBIT, QUILL, COLUMN, TSLOTTABLE, TAILSTOCK, MACHINEVICE, TOOLHOLDER, VEEBLOCK,
  DUCT, DUCTRECT, DUCTELBOW, FANCOIL, RADIATOR, COMPRESSOR, REFLINE, GRILLE, DAMPER, FILTERFRAME, THERMOSTAT,
  TRANSFORMER, CONTACTOR, MCCB, BUSBAR, CABLETRAY, STEELCONDUIT, ADAPTABLEBOX, LAMPHOLDER, PLUGTOP, SOCKETOUTLET, SWITCHPLATE, POWERCABLE, EARTHROD] as PartFamily<unknown>[];
/** Each table's source: every one typical or recalled (decision 0029: no source hunting). */
export const MACHINE_SOURCES: Record<string, string> = Object.fromEntries(MACHINE.map((f) => [f.id, f.source]));
export const MACHINE_STATUS: Record<string, string> = Object.fromEntries(MACHINE.map((f) => [f.id, 'typical']));
/** Their piece nodes (registered with the maker's check.row by familyNode). */
export const MACHINE_NODES: BlockDef[] = MACHINE.map((f) => familyNode(f));
void TOL; void GREY;
