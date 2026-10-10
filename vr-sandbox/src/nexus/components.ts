// Components: each part designed once, in three dimensions, from its own standard's numbers, saved under its name and
// its category, and used by every build that needs one. The inventory says what a part is and what it is made of; its
// family sizes it to its standard (src/nexus/families.ts, src/nexus/kinds/); here it is drawn: placed shapes, in its own
// frame, each piece of it where it is in the real part, so a bolt is a hex head over a washer face over a plain shank
// over its thread, a nut a hex with its bore, an angle its two legs. A component made of components (a bolted joint: a
// bolt, two washers and a nut) is drawn from the saved ones, so what is fixed in a nut is fixed in every joint, every
// wheel and every frame that uses it.
//
// Each design is checked on its own when it is first made: its drawn mass against the mass its family works out from
// the standard, and its size against the family's box. What the drawing leaves out (a thread's helix, a channel's
// tapered flanges and root radii, a T-slot's undercut chamfers) is said in its record.
//
// Frames: a fastener's axis is y, its bearing face (under a head, a nut's or a washer's underside) at y = 0, its shank
// down -y; stock and profiles are centred, their length along y.

import { dhArmParts, ik, UR5E } from './dharm';
import { robotFor, TASKS, type Robot } from './robot';
import { DRAWN_IN, RUNS, baseName, extents, frameOf, libraryWords, lookAs, type MakerModel, type ModelPart } from './makermodel';
import { ENDER3 } from './models/ender3';
import { PRINTER_MODELS } from './kinds/robots';
import { layout } from './make/space';
import * as THREE from 'three';
import { alongZ, bmeParts, camModuleParts, changerParts, depthCamParts, earNoseParts, ftParts, gripperParts, handParts } from './kit-robot';
import { FAMILIES, callFamily } from './families';
import { BEARINGS, HEX_K, IPE, METRIC, NEMA, NEMA_FACE, NPS40, ballsOf, fanDims, gt2Dims, mgnDims, stepperDims } from './families';
import { tubeLength } from './form';
import { CLEAR, FB, VWHEEL, idlerDims } from './kinds/motion';
import { RIBS, capDims } from './kinds/fasteners';
import { SNAP } from './kinds/electrical';
import { HOTEND, rootR } from './kinds/plant';
import { SOCKET_HEAD } from './embody/stock';
import { BUTTON, PAN, SETSCREW_KEY } from './threads';
import { UPN } from './kinds/stock';
import { WHEEL } from './kinds/fasteners';
import { itemOf, type Item } from './inventory';
import type { Cut, Iface, Part, Port, V3 } from './kits';
import { DENSITY, massOf } from './mass';
import { axialBody, axialResistorSolids, chipCode, chipSolids, ledSolids, pkgItem, pkgOf, pkgSolids, smdLedSolids, solidMasses, type Role, type Solid } from './packages';
import { chipCase, ledDieOf, mlccCase, packageOf, smdLedCase } from './kinds/electrical';
import { boardComps, boardDef, screwFor, type Comp } from './sbc';
import { chip } from './boardparts';
import { breadboard, chp170, cq4lf, hakko599B, holder3951, helpingHands, pinecilV2, solderReel, standS11, permaProto } from './kit-solder';
import { LINK } from './meca';

const PI = Math.PI, mm = 1e-3;
/** A design: its part in its own frame, from its family's numbers and its item. */
type Design = (p: Record<string, string | number>, it: Item) => Part[];
export interface Component {
  words: string; item: Item; part: Part;
  /** its category, as the inventory files it */ path: string[];
  /** its drawn mass over the mass its standard gives (1 is exact), and what the drawing leaves out */ mass: number; leaves: string;
  /** what its own check found (empty when it holds) */ faults: string[];
}

// ---- how each is made to look: its material and its finish ------------------------------------------------------------
/** The drawn material of an item (its first material, as the kits' density table names it). */
const matIn = (it: Item): string => { const m = it.of.map((c) => c.id).find((id) => itemOf(id)?.kind === 'material' || /^(steel|stainless|al-|brass|bronze|copper|nylon|pvc|pom|ptfe|pe|pp|abs)/.test(id)) ?? 'steel-low'; return m; };
const plated = (it: Item) => it.of.some((c) => c.id === 'zinc');
/** Its colour and finish, as it is sold: zinc bright and blue-grey, stainless pale, black oxide near black, aluminium
 *  satin, brass yellow, hot-rolled steel mill-scale grey. */
function looks(it: Item, mat: string): { color: number; finish: string } {
  if (/black/i.test(it.name) || /black-oxid/i.test(it.says) || /12\.9/.test(it.name) || (/socket head/.test(it.name) && !/stainless/.test(it.name))) return { color: 0x2a2b2e, finish: 'plate' };
  if (plated(it) || /zinc-plated|zinc/i.test(it.says)) return { color: 0xc3c8cd, finish: 'plate' };
  if (/^stainless/.test(mat)) return { color: 0xcfd3d6, finish: 'brushed' };
  if (/^al-/.test(mat)) return { color: 0xc6cbd0, finish: 'brushed' };
  if (/brass|bronze/.test(mat)) return { color: 0xc9a54e, finish: 'brushed' };
  if (/copper/.test(mat)) return { color: 0xc8794a, finish: 'brushed' };
  if (/nylon|pom|pe$|pp$/.test(mat)) return { color: 0xeeece4, finish: 'texture' };
  if (/pvc/.test(mat)) return { color: 0x8a939c, finish: 'texture' };
  return { color: 0x55585c, finish: 'cast' }; // hot-rolled: mill scale
}
const thr = (p: Record<string, string | number>) => { const t = String(p.thread), T = METRIC[t]!, d = Number(t.slice(1)); return { t, T, d, P: T.p }; };
/** A turned shape's profile, mm, as metres. */
const lathe = (pts: [number, number][]) => ({ lathe: pts.map(([r, y]) => [r * mm, y * mm] as [number, number]) });

// ---- the designs ------------------------------------------------------------------------------------------------------
/** A hex head (ISO 4017: across flats s, height k): six flats from a 30° chamfer at its top down to a round washer face
 *  0.9 s across and 0.4 mm high (ISO 4017's dw and c, typical within their ranges). Its corners' circle is s / cos 30°. */
const hexHead = (name: string, s: number, k: number, at: Partial<Part>): Part[] => {
  const e = s / Math.cos(PI / 6), c = Math.min(0.6, Math.max(0.15, 0.05 * k * 1.25));
  return [P(name, lathe([[0, c], [e / 2, c], [e / 2, k - 0.12 * k], [0.92 * (e / 2), k], [0, k]]), { ...at, facets: 6 }), P(name, lathe([[0, 0], [0.45 * s, 0], [0.45 * s, c], [0, c]]), at)];
};
/** The share of its major cylinder a rolled thread fills: a cylinder at its pitch diameter, d - 0.6495 P (ISO 724), so
 *  a thread drawn as its major cylinder weighs what it does. */
const threadFill = (d: number, P0: number) => ((d - 0.6495 * P0) / d) ** 2;
/** The same for a nut's thread drawn solid to its root: the hex less a bore at the pitch diameter, over the hex less the
 *  root's bore. */
const nutFill = (s: number, d: number, P0: number) => { const A = ((3 * Math.sqrt(3)) / 2) * (s / Math.sqrt(3)) ** 2, r1 = (d - 1.0825 * P0) / 2, r2 = (d - 0.6495 * P0) / 2; return (A - PI * r2 * r2) / (A - PI * r1 * r1); };
/** A shank: plain under the head for a, then its thread to its end, the end chamfered to the thread's root. The thread is
 *  drawn as its major cylinder (its helix not drawn) and finished as a rolled thread. */
const shank = (name: string, d: number, P0: number, L: number, a: number, at: Partial<Part>): Part[] => {
  const root = (d - 1.0825 * P0) / 2, out: Part[] = [];
  if (a > 0) out.push(P(name, lathe([[0, 0], [d / 2, 0], [d / 2, -a], [0, -a]]), at));
  out.push(P(name, lathe([[0, -a], [d / 2, -a], [d / 2, -L + P0], [root, -L], [0, -L]]), { ...at, finish: 'thread', fill: threadFill(d, P0) }));
  return out;
};
const P = (name: string, shape: Part['shape'], more: Partial<Part> = {}): Part => ({ name, shape, at: [0, 0, 0], ...more });

/** A hex socket for a key s across flats (m), dep deep, in a head's top at height k (m): a six-sided hole down its axis. */
const socket = (s: number, dep: number, k: number): Cut => ({ r: s / Math.sqrt(3), depth: dep, at: [0, k, 0], dir: [0, -1, 0], n: 6 });
/** A port on a part, its pattern in metres (src/nexus/kits.ts Port). */
const port = (name: string, sex: Port['sex'], thread: string, pattern: [number, number][], at: V3, n: V3, u: V3, t: number, more: Partial<Port> = {}): Port => ({ name, sex, thread, pattern, at, n, u, t, ...more });
const sq = (side: number): [number, number][] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [(x! * side) / 2, (y! * side) / 2] as [number, number]);
const PKG_SAYS = 'a semiconductor in its package (its JEDEC outline, src/nexus/packages.ts): its moulded body (or a diode\'s glass) marked with its part number, its leads, the lead frame\'s paddle (or tab) its silicon die sits on, and a gold bond wire from the die to each lead the die is not on';
const PKG_LEAVES = 'its outline nominal within JEDEC\'s tolerances; its die typical in size (not its maker\'s), its wires\' loops drawn as two straights; its moulding\'s draft, its leads\' plating and its mould\'s ejector marks not drawn; its mass from these solids and their materials\' densities, checked against makers\' weights (tests/nexus/packages.test.ts)';
const TIN = 0xc4c8cb;
const LED_TINT: Record<string, number> = { red: 0xd8262e, orange: 0xffa040, yellow: 0xffe050, green: 0x6aea7a, blue: 0x6a8cff, white: 0xf2f6ff, warmwhite: 0xfff2dc };
const SBC_SAYS = 'a board as its maker makes it (src/nexus/sbc.ts): its many-layer circuit board with its mounting holes drilled, its system-on-chip a flip-chip ball-grid array under its lid, its memory, its power and interface chips, chip resistors and capacitors, each connector a part of its own (USB, Ethernet with its magnetics, HDMI, USB-C, microSD), its 40-pin header';
const SBC_LEAVES = 'its traces, vias and silkscreen not drawn; its chips other than the system-on-chip and memory drawn as library QFNs of typical size; its parts placed after its maker\'s mechanical drawing where one is published (Raspberry Pi\'s), else typical of its kind; its camera, display and fan connectors, buttons and LEDs not drawn';
const DESIGNS: Record<string, { says: string; leaves: string; make: Design; iface?: (p: Record<string, string | number>) => Iface[]; ports?: (p: Record<string, string | number>) => Port[] }> = {
  stepper: {
    says: 'a hybrid stepper (its face NEMA ICS 16): its die-cast end bells, each with a cavity for its coils\' ends and a hub round its bearing\'s pocket; its stator, a stack of laminations of eight poles of six teeth, a coil wound on each pole; its rotor, two laminated cups of fifty teeth half a tooth apart either side of an axially magnetised neodymium ring, on its shaft; a ball bearing in each bell; four tie screws from the rear clamping bells and stack; its four leads out of the rear bell to a JST XH plug',
    leaves: 'its proportions typical of makers\' drawings, not one maker\'s (the rotor 0.52 of the frame across, the air gap 0.05 mm, the coils\' copper 0.6 of their section, the leads 300 mm); its coils\' joins into two phases and to the leads, its shaft\'s flat, its bells\' ribs and its leads\' grommet not drawn',
    make: (p, it) => stepperParts(p, it.name),
    iface: (p) => [{ kind: 'shaft', role: 'provides', d: NEMA_FACE[String(p.nema)]!.shaft * mm }],
    ports: (p) => { const f = NEMA_FACE[String(p.nema)]!, d = stepperDims(p); return [port('front face', f.through ? 'holes' : 'threads', f.thread, sq(f.holes * mm), [0, 0, 0], [0, 1, 0], [1, 0, 0], f.through ? d.tf * mm : 0.0045, { pilot: f.pilot * mm, std: `NEMA ${p.nema}` })]; },
  },
  bearing: {
    says: 'a deep-groove ball bearing (ISO 15): its outer and inner rings, each with its raceway ground into a groove 0.52 of a ball across (a typical conformity), its balls on the pitch circle between them, the two pressed halves of its cage riveted between the balls, and its shields (ZZ, pressed steel) or seals (2RS, rubber) set in recesses in its outer ring',
    leaves: 'its balls about 0.3 of its rings\' section across and counted by the Conrad rule (typical, within one of makers\' counts); its cage\'s halves drawn flat beside the balls, not wrapped round them; its grease not drawn',
    make: (p, it) => bearingParts(p, it.name),
    iface: (p) => [{ kind: 'shaft', role: 'requires', d: BEARINGS[String(p.number)]![0] * mm }],
  },
  flangebearing: {
    says: 'a flanged miniature ball bearing: a deep-groove bearing (its rings, balls, cage and shields or seals) whose outer ring is turned with a flange at one face, so it seats itself in a plate\'s hole',
    leaves: 'its flange 0.07 of its outside across thick (typical of the F6xx and F69x tables), its balls counted by the Conrad rule; its cage\'s halves drawn flat beside the balls; its grease not drawn',
    make: (p, it) => { const [d, D, B, F] = FB[String(p.number)]!; return bearingParts(p, it.name, [d, D, B], [F, Math.max(0.6, 0.07 * D)]); },
    iface: (p) => [{ kind: 'shaft', role: 'requires', d: FB[String(p.number)]![0] * mm }],
  },
  idler: {
    says: 'a GT2 idler: its turned aluminium pulley, a flange each side of its face (toothed as a GT2 pulley\'s, or smooth), bored for the two miniature bearings pressed into it side by side',
    leaves: 'its flanges, face and bearings typical of the idlers sold (idlerDims names each); its grooves round-bottomed slots, not the GT2 curve; its bearings drawn by the library',
    make: (p, it) => idlerParts(p, it.name),
    iface: (p) => [{ kind: 'shaft', role: 'requires', d: Number(p.bore) * mm }],
  },
  insert: {
    says: 'a heat-set insert: a brass sleeve knurled outside in two bands, a plain waist between them that the melted plastic flows into, its lead-in tapered, threaded through',
    leaves: 'its knurls drawn as plain bands (their diamonds not cut) and its thread as a bore at its root (ISO 261); its outside 1.6 of its thread, typical of those sold',
    make: (p, it) => insertParts(p, it.name),
  },
  magnet: {
    says: 'a neodymium disc magnet: sintered NdFeB, ground and nickel-plated, magnetised through its height',
    leaves: 'its plating not drawn apart from it; its edges square',
    make: (p, it) => [P(it.name, { cyl: [(Number(p.d) / 2) * mm, Number(p.h) * mm] }, { mat: 'ndfeb', color: 0xc9cdd1, finish: 'plate', at: [0, (Number(p.h) / 2) * mm, 0] })],
  },
  rail: {
    says: 'a HIWIN MGN miniature guideway: its ground rail, a groove down each side and its holes counterbored; its carriage\'s ground block, a groove facing each of the rail\'s with a return hole beside it and four tapped holes on top; its two circuits of balls, a load row between the grooves and a return row in the hole, turned round through channels in the moulded end cap at each end; a retaining wire under each load row; a rubber seal on a steel plate at each end, its lip on the rail, held with the cap by two screws',
    leaves: 'its sizes HIWIN\'s, its balls rebuilders\' counts (MGN9, 12) or scaled (MGN7, 15), and its inner proportions typical (mgnDims names each); its grooves drawn as one arc each (not the two of a gothic arch), its end caps\' turnarounds as a straight channel through the cap, its seals\' lips square to the rail (not following its grooves); the steel\'s edges drawn square and the rail holes\' plugs not drawn',
    make: (p, it) => railParts(p, it.name),
    ports: (p) => { const d = mgnDims(p), holes = Array.from({ length: d.nh }, (_, k) => [(-d.L / 2 + d.E1 + k * d.P) * mm, 0] as [number, number]);
      return [port('rail foot', 'holes', d.bolt.split('x')[0]!, holes, [0, 0, 0], [0, -1, 0], [0, 0, 1], (d.HR - d.h) * mm, { std: `HIWIN MGN${d.size} rail, ${d.P} mm pitch` }),
        port('carriage top', 'threads', d.M, [[d.B / 2, d.blk.C / 2], [-d.B / 2, d.blk.C / 2], [-d.B / 2, -d.blk.C / 2], [d.B / 2, -d.blk.C / 2]].map(([x, z]) => [x! * mm, z! * mm] as [number, number]), [0, d.H * mm, 0], [0, 1, 0], [1, 0, 0], d.Ml * mm, { std: `HIWIN MGN${d.size}${d.t} block` })]; },
  },
  motorplate: {
    says: 'a NEMA motor plate: its clearance holes (ISO 273 medium) and pilot bore cut', leaves: 'its edges drawn square',
    make: (p, it) => { const n = String(p.nema), f = NEMA_FACE[n]!, s = NEMA[n]! + 10, t = Number(p.t), mat = matIn(it), hole = CLEAR[f.thread] ?? Number(f.thread.slice(1)) * 1.1;
      return [P(it.name, section(box(s, s), [circle((f.pilot + 0.5) / 2, 0, 0, 32), ...sq(f.holes).map(([x, y]) => circle(hole / 2, x, -y, 12))], t), { mat, ...looks(it, mat), rot: ALONG_Y, at: [0, (t / 2) * mm, 0] })]; },
    ports: (p) => { const f = NEMA_FACE[String(p.nema)]!; return [port('motor face', 'holes', f.thread, sq(f.holes * mm), [0, 0, 0], [0, -1, 0], [1, 0, 0], Number(p.t) * mm, { pilot: -(f.pilot + 0.5) * mm, std: `NEMA ${p.nema}` })]; },
  },
  bolt: {
    says: 'ISO 4017: hex head, washer face, threaded to within 2.5 pitches of the head', leaves: 'the thread drawn as its major cylinder, its helix not drawn',
    make: (p, it) => { const { t, d, P: P0 } = thr(p), L = Number(p.length), s = METRIC[t]!.s, k = HEX_K[t] ?? 0.7 * d, mat = matIn(it), lk = looks(it, mat), at = { mat, ...lk }; return [...hexHead(it.name, s, k, at), ...shank(it.name, d, P0, L, Math.min(L * 0.3, 2.5 * P0), at)]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: thr(p).d * mm, n: 1 }],
  },
  screw: {
    says: 'ISO 4762: a round head dk across and k high, its hex socket, threaded for 2d + 12 mm (or its whole length when shorter)', leaves: 'the thread its major cylinder',
    make: (p, it) => { const { t, d, P: P0, T } = thr(p), L = Number(p.length), mat = matIn(it), lk = looks(it, mat), at = { mat, ...lk }, sk = SOCKET_HEAD[t.replace('.', '_')]?.s ?? 0.75 * d * mm, dep = 0.55 * T.k, ch = 0.08 * T.k, b = 2 * d + 12;
      return [P(it.name, lathe([[0, 0], [T.dk / 2, 0], [T.dk / 2, T.k - ch], [T.dk / 2 - ch, T.k], [0, T.k]]), { ...at, cuts: [socket(sk, dep * mm, T.k * mm)] }), ...shank(it.name, d, P0, L, Math.max(0, L - b), at)]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: thr(p).d * mm, n: 1 }],
  },
  panhead: {
    says: 'ISO 7045: a pan head dk across and k high, its top rounded down to its rim, a cross recess in it, threaded to its head', leaves: 'its cross recess drawn as a cone 0.55 of the head across; the thread its major cylinder',
    make: (p, it) => { const { t, d, P: P0 } = thr(p), L = Number(p.L), mat = matIn(it), at = { mat, ...looks(it, mat) }, { dk, k } = PAN[t]!, rr = 0.275 * dk, dep = 0.6 * k;
      // (the head: its side straight for 0.45 of its height, then its top rounding in to a flat 0.55 of it across)
      return [P(it.name, lathe([[0, 0], [dk / 2, 0], [dk / 2, 0.45 * k], [0.44 * dk, 0.8 * k], [0.36 * dk, 0.96 * k], [rr, k], [0, k - dep]]), at), ...shank(it.name, d, P0, L, 0, at)]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: thr(p).d * mm, n: 1 }],
  },
  buttonhead: {
    says: 'ISO 7380-1: a low domed head dk across and k high, its hex socket, threaded to its head', leaves: 'the thread its major cylinder',
    make: (p, it) => { const { d, P: P0 } = thr(p), L = Number(p.L), mat = matIn(it), at = { mat, ...looks(it, mat) }, B = BUTTON[String(p.thread)]!;
      // (its dome: straight at its rim for an eighth of its height, then one arc, a sphere's, from the rim up to its crown)
      const a = B.dk / 2, yc = (0.9856 * B.k ** 2 - a * a) / (1.76 * B.k), R = B.k - yc, a0 = Math.atan2(0.12 * B.k - yc, a);
      const dome = Array.from({ length: 13 }, (_, i) => { const q = a0 + ((PI / 2 - a0) * i) / 12; return [R * Math.cos(q), yc + R * Math.sin(q)] as [number, number]; });
      return [P(it.name, lathe([[0, 0], [B.dk / 2, 0], ...dome]), { ...at, cuts: [socket(B.s * mm, B.t * mm, B.k * mm)] }), ...shank(it.name, d, P0, L, 0, at)]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: thr(p).d * mm, n: 1 }],
  },
  setscrew: {
    says: 'ISO 4029: a headless screw with a hex socket in its top and a cup point at its end', leaves: 'its thread its major cylinder; its socket\'s depth and cup typical (0.45 d deep, the cup 0.5 d across)',
    make: (p, it) => { const { d, P: P0 } = thr(p), L = Number(p.length), mat = matIn(it), at = { mat, ...looks(it, mat), finish: 'thread', fill: threadFill(d, P0) }, s = SETSCREW_KEY[String(p.thread)] ?? 0.5 * d, c = 0.1 * d, cup = 0.25 * d;
      // (its top at y = 0, chamfered; its end cupped)
      return [P(it.name, lathe([[0, 0], [d / 2 - c, 0], [d / 2, -c], [d / 2, -L + c], [d / 2 - c, -L], [cup, -L], [0.7 * cup, -L + 0.15 * d], [0, -L + 0.15 * d]]), { ...at, cuts: [socket(s * mm, Math.min(0.45 * d, 0.6 * L) * mm, 0)] })]; },
  },
  pulley: {
    says: 'a GT2 timing pulley: its teeth on their pitch circle (2 mm a tooth), a flange each side, its hub with its set screws in tapped holes, bored for its shaft',
    leaves: 'its pitch and outside diameters PowerDrive\'s (the outside 0.508 mm under the pitch), its set screws\' count theirs (one to 16 teeth, two at 90° above); its flanges, hub and face typical of 5 mm bore printer pulleys (flanges 1 mm, 4 mm proud of the teeth; hub 7 mm long; face 7 mm for a 6 mm belt); its grooves drawn as round-bottomed slots, not the GT2 curve',
    make: (p, it) => pulleyParts(p, it.name),
    iface: (p) => [{ kind: 'shaft', role: 'requires', d: Number(p.bore) * mm }],
  },
  nut: {
    says: 'ISO 4032 (ISO 10511 with its nylon ring): a hex s across flats and m high, chamfered 30° both faces, bored at the thread\'s root', leaves: 'its thread drawn as its root cylinder',
    make: (p, it) => { const { T, d, P: P0 } = thr(p), lock = p.lock === 'yes', e = T.s / Math.cos(PI / 6), r1 = (d - 1.0825 * P0) / 2, m = lock ? T.m * 0.72 : T.m, mat = matIn(it), lk = looks(it, mat);
      const out = [P(it.name, lathe([[r1, 0], [0.88 * (e / 2), 0], [e / 2, 0.12 * m], [e / 2, m - 0.12 * m], [0.88 * (e / 2), m], [r1, m], [r1, 0]]), { mat, ...lk, facets: 6, fill: nutFill(T.s, d, P0) })];
      // (a lock nut's ring of nylon in its collar over the hex, the ring's bore a little under the thread, so it grips it)
      if (lock) { const hN = (it.size?.[2] ?? T.m * 1.25) - m; out.push(P(`${it.name} ring`, lathe([[r1, m], [0.9 * (T.s / 2), m], [0.85 * (T.s / 2), m + hN], [r1, m + hN], [r1, m]]), { mat: 'nylon', color: 0xe8e4d4, finish: 'texture', item: 'nylon-insert', fixed: 'held in its nut\'s crimped collar' })); }
      return out; },
    iface: (p) => [{ kind: 'studs', role: 'requires', d: thr(p).d * mm }],
  },
  washer: {
    says: 'ISO 7089: d1 × d2 × h', leaves: 'nothing: a flat ring',
    make: (p, it) => { const { T } = thr(p), mat = matIn(it); return [P(it.name, lathe([[T.d1 / 2, 0], [T.d2 / 2, 0], [T.d2 / 2, T.h], [T.d1 / 2, T.h], [T.d1 / 2, 0]]), { mat, ...looks(it, mat) })]; },
  },
  fenderwasher: {
    says: 'ISO 7093: a flat ring three times its thread across', leaves: 'nothing: a flat ring',
    make: (p, it) => { const { d } = thr(p), mat = matIn(it), D = it.size?.[0] ?? 3 * d, h = it.size?.[2] ?? 0.2 * d; return [P(it.name, lathe([[(d + 0.4) / 2, 0], [D / 2, 0], [D / 2, h], [(d + 0.4) / 2, h], [(d + 0.4) / 2, 0]]), { mat, ...looks(it, mat) })]; },
  },
  springwasher: {
    says: 'DIN 127: a split ring of spring steel, its section about as thick as half its free height', leaves: 'drawn flat and whole: its split and its set (the twist that makes it spring) not drawn',
    make: (p, it) => { const { d } = thr(p), mat = 'steel-spring', D = it.size?.[0] ?? 1.9 * d, sT = (it.size?.[2] ?? 0.5 * d) / 2, d1 = d + 0.1; return [P(it.name, lathe([[d1 / 2, 0], [D / 2, 0], [D / 2, sT], [d1 / 2, sT], [d1 / 2, 0]]), { mat, ...looks(it, mat) })]; },
  },
  flangenut: {
    says: 'EN 1661: a hex nut with a round flange under it, its bearing face serrated or plain', leaves: 'its serrations not drawn; its thread its root cylinder',
    make: (p, it) => { const { T, d, P: P0 } = thr(p), mat = matIn(it), lk = looks(it, mat), e = T.s / Math.cos(PI / 6), r1 = (d - 1.0825 * P0) / 2, H = it.size?.[2] ?? T.m, Df = it.size?.[0] ?? 1.4 * T.s, hf = 0.2 * H;
      return [P(it.name, lathe([[r1, 0], [Df / 2, 0], [Df / 2, hf * 0.5], [0.5 * T.s, hf], [r1, hf], [r1, 0]]), { mat, ...lk }), P(it.name, lathe([[r1, hf], [e / 2, hf], [e / 2, H - 0.12 * H], [0.88 * (e / 2), H], [r1, H], [r1, hf]]), { mat, ...lk, facets: 6, fill: nutFill(T.s, d, P0) })]; },
    iface: (p) => [{ kind: 'studs', role: 'requires', d: thr(p).d * mm }],
  },
  threadedrod: {
    says: 'DIN 976: threaded its whole length', leaves: 'the thread drawn as its major cylinder',
    make: (p, it) => { const { d, P: P0 } = thr(p), L = Number(p.length), mat = matIn(it), root = (d - 1.0825 * P0) / 2; return [P(it.name, lathe([[0, -L / 2], [root, -L / 2], [d / 2, -L / 2 + P0], [d / 2, L / 2 - P0], [root, L / 2], [0, L / 2]]), { mat, ...looks(it, mat), finish: 'thread', fill: threadFill(d, P0) })]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: thr(p).d * mm, n: 1 }],
  },
  spring: {
    says: 'a compression spring: its wire wound in a helix of its mean diameter, its end coils closed (touching) and the rest open to its free length', leaves: 'its ends not ground flat; its helix drawn in 24 straight pieces a turn',
    make: (p, it) => { const d = Number(p.d), D = Number(p.D), L = Number(p.L), n = Number(p.n), rise = L - d, pa = Math.max(d, (rise - 2 * d) / n), k = 24, turns = n + 2;
      // (its centreline's height after t turns: a closed coil (one wire's rise), the active coils, a closed coil)
      const y = (t: number) => d / 2 + (t <= 1 ? t * d : t <= n + 1 ? d + (t - 1) * pa : d + n * pa + (t - n - 1) * d);
      const pts = Array.from({ length: turns * k + 1 }, (_, i) => { const t = i / k, a = 2 * PI * t; return [(D / 2) * Math.cos(a) * mm, y(t) * mm, (D / 2) * Math.sin(a) * mm] as V3; });
      return [P(it.name, { tube: { r: (d / 2) * mm, pts, bend: 0 } }, { mat: 'steel-spring', ...(p.coat === 'yellow' ? { color: 0xe8c22a, finish: 'paint' as const } : { color: 0xb9bdc2, finish: 'bright' as const }) })]; },
  },
  slotnut: {
    says: 'a T-slot nut: its section a hammer nut\'s (its sides upright, its top bevelled to turn into the slot), tapped through its middle, bored at its thread\'s root as a nut is', leaves: 'a roll-in\'s spring ball and a sliding nut\'s flange not drawn: each drawn as a hammer nut\'s section; its sizes the kind\'s (1.8, 1.1 and 0.7 of its slot)',
    make: (p, it) => { const w = Number(p.slot), Lx = w * 1.8, W = w * 1.1, H = w * 0.7, b = W * 0.27, { d: dT, P: P0 } = thr(p), r1 = (dT - 1.0825 * P0) / 2;
      const sec = ([[-W / 2, 0], [W / 2, 0], [W / 2, H - b], [W / 2 - b, H], [-W / 2 + b, H], [-W / 2, H - b]] as [number, number][]).map(([x, y2]) => [x * mm, y2 * mm] as [number, number]);
      // (its section in x and y, drawn along its length in z about its middle; tapped up through it)
      return [P(it.name, { prism: { pts: sec, L: Lx * mm } }, { mat: 'steel-low', color: 0xc9cdd1, finish: 'plate', cuts: [{ r: r1 * mm, depth: H * mm, at: [0, H * mm, 0], dir: [0, -1, 0] }] })]; },
  },
  heatblock: {
    says: 'the MK8 heater block as Creality\'s model has it: tapped M6 through for the nozzle below and the heat break above, bored 6 mm through for the heater and 2.2 mm in from its side for the thermistor', leaves: 'its heater\'s clamp slot and screw not drawn; its holes\' threads drawn at their root',
    make: (_p, it) => { const b = HOTEND.block, al = { mat: 'al-6061', color: 0xc9cdd1, finish: 'cast' as const };
      return [P(it.name, { box: [b.w * mm, b.h * mm, b.d * mm] }, { ...al, cuts: [{ r: rootR(6, 1) * mm, depth: b.h * mm, at: [0, (b.h / 2) * mm, b.nozzle * mm], dir: [0, -1, 0] }, { r: 3 * mm, depth: b.w * mm, at: [(b.w / 2) * mm, 0, b.heater * mm], dir: [-1, 0, 0] }, { r: 1.1 * mm, depth: 8 * mm, at: [(-b.w / 2) * mm, b.therm[1] * mm, b.therm[0] * mm], dir: [1, 0, 0] }] })]; },
  },
  heatbreak: {
    says: 'an M6 heat break: a stainless tube threaded its length, bored through; PTFE-lined, its liner 4 × 2 mm inside it', leaves: 'its thread drawn at its major diameter',
    make: (p, it) => { const L = Number(p.L), lined = p.lined === 'ptfe', b = lined ? 2.05 : 1;
      return [P(it.name, lathe([[b, -L / 2], [3, -L / 2], [3, L / 2], [b, L / 2], [b, -L / 2]]), { mat: 'stainless-304', color: 0xb9bdc2, finish: 'thread', ...(lined ? { item: 'heat-break' } : {}) }),
        ...(lined ? [P(`${it.name} liner`, lathe([[1, -L / 2], [2, -L / 2], [2, L / 2], [1, L / 2], [1, -L / 2]]), { mat: 'ptfe', color: 0xf2f2ee, finish: 'moulded', item: 'ptfe-liner' })] : [])]; },
  },
  hotendsink: {
    says: 'the Ender-3\'s heat sink as Creality\'s model sizes it: a plate below tapped M6 for the heat break, a plate above tapped M10 × 1 for the coupler, a column between them bored for the filament, eight fins either side', leaves: 'its fins\', column\'s and plates\' thicknesses typical; its mounting holes not drawn',
    make: (_p, it) => { const s = HOTEND.sink, al = { mat: 'al-6061', color: 0xc9cdd1, finish: 'cast' as const }, colH = s.h - 2 * s.plate, pitch = colH / s.fins, fx = (s.finX[0] + s.finX[1]) / 2;
      // (its bottom at y = 0)
      return [P(it.name, { box: [s.w * mm, s.plate * mm, s.d * mm] }, { ...al, at: [0, (s.plate / 2) * mm, 0], cuts: [{ r: rootR(6, 1) * mm, depth: s.plate * mm, at: [0, (-s.plate / 2) * mm, 0], dir: [0, 1, 0] }] }),
        P(`${it.name} top`, { box: [s.w * mm, s.plate * mm, s.d * mm] }, { ...al, at: [0, (s.h - s.plate / 2) * mm, 0], cuts: [{ r: rootR(10, 1) * mm, depth: s.plate * mm, at: [0, (s.plate / 2) * mm, 0], dir: [0, -1, 0] }] }),
        P(`${it.name} column`, lathe([[rootR(6, 1), s.plate], [s.col, s.plate], [s.col, s.h - s.plate], [rootR(6, 1), s.h - s.plate], [rootR(6, 1), s.plate]]), al),
        ...Array.from({ length: s.fins }, (_, k) => [-1, 1].map((e) => P(`${it.name} fin ${k + 1}${e < 0 ? 'a' : 'b'}`, { box: [(s.finX[1] - s.finX[0]) * mm, s.fin * mm, s.d * mm] }, { ...al, at: [e * fx * mm, (s.plate + (k + 0.5) * pitch) * mm, 0] }))).flat()]; },
  },
  bowden: {
    says: 'a PTFE tube, its bore for the filament', leaves: 'drawn straight',
    make: (p, it) => { const o = Number(p.od) / 2, i = Number(p.id) / 2, L = Number(p.L); return [P(it.name, lathe([[i, -L / 2], [o, -L / 2], [o, L / 2], [i, L / 2], [i, -L / 2]]), { mat: 'ptfe', color: 0xf2f2ee, finish: 'moulded' })]; },
  },
  tubefit: {
    says: 'a PC4 push-in coupler: its brass body (its thread, its hex) bored 4.1 mm, its stainless grab ring in its top, its POM release collet over the ring', leaves: 'its collet\'s teeth drawn as a ring; its O-ring not drawn; its thread drawn at four fifths filled',
    make: (p, it) => { const th = String(p.thread), f = HOTEND.fit[th]!, d = Number(th.slice(1)), hx = f.L - f.th - 3, brass = { mat: 'brass', color: 0xc9a24a, finish: 'cast' as const };
      const hex = Array.from({ length: 6 }, (_, q) => [((f.af / 2) / Math.cos(PI / 6)) * Math.cos((q * PI) / 3) * mm, ((f.af / 2) / Math.cos(PI / 6)) * Math.sin((q * PI) / 3) * mm] as [number, number]);
      // (its thread from y = 0 up, its hex over it, its collar and collet on top)
      return [group(`${it.name} body`, 'tubefit-body', [P(it.name, lathe([[2.05, 0], [d / 2, 0], [d / 2, f.th], [2.05, f.th], [2.05, 0]]), { ...brass, finish: 'thread', fill: 0.8 }),
        P(`${it.name} hex`, { prism: { pts: hex, L: hx * mm } }, { ...brass, at: [0, (f.th + hx / 2) * mm, 0], rot: [-PI / 2, 0, 0], cuts: [{ r: 2.05 * mm, depth: hx * mm, at: [0, 0, (hx / 2) * mm], dir: [0, 0, -1] }] })]),
        P(`${it.name} collar`, lathe([[2.6, f.L - 3], [f.af / 2 - 0.5, f.L - 3], [f.af / 2 - 0.5, f.L], [2.6, f.L], [2.6, f.L - 3]]), { mat: 'pom', color: 0x2f5fa8, finish: 'moulded', item: 'collet' }),
        P(`${it.name} collet`, lathe([[2.05, f.L - 1.5], [2.6, f.L - 1.5], [2.6, f.L], [2.05, f.L], [2.05, f.L - 1.5]]), { mat: 'stainless-304', color: 0xb9bdc2, finish: 'plate', item: 'grab-ring' })]; },
  },
  endcap: {
    says: 'a profile\'s end cap: its plate over the profile\'s end, a plug standing off its back into each slot', leaves: 'its plugs\' barbs not drawn',
    make: (p, it) => { const c = capDims(String(p.series)), ny = { mat: 'nylon', color: 0x1d1e21, finish: 'moulded' as const };
      return [P(it.name, { box: [c.w * mm, c.h * mm, 2.5 * mm] }, { ...ny, at: [0, 0, 1.25 * mm] }),
        ...c.plugs.map(([x, y, way], i) => P(`${it.name} plug ${i + 1}`, { box: [(way ? c.slot : 3) * mm, (way ? 3 : c.slot) * mm, 5.5 * mm] }, { ...ny, at: [x * mm, y * mm, -2.75 * mm] }))]; },
  },
  thumbwheel: {
    says: 'a thumb wheel: its moulded disc, ribs round its rim every 4 mm of it, a hex nut pressed into its middle', leaves: 'its ribs drawn square; its nut\'s pocket its nut\'s size',
    make: (p, it) => { const D = Number(p.D), T = Number(p.t), th = String(p.thread), d = Number(th.slice(1)), abs = { mat: 'abs', color: 0x1d1e21, finish: 'moulded' as const }, s = 1.6 * d + 1;
      const pocket = { r: (s / 2) / Math.cos(PI / 6) * mm, depth: 0.8 * d * mm, at: [0, (T / 2) * mm, 0] as V3, dir: [0, -1, 0] as V3, n: 6 };
      // (its disc 0.8 mm inside its diameter, its ribs standing that far off it, so it measures its diameter over them)
      return [P(it.name, { cyl: [(D / 2 - 0.8) * mm, T * mm] }, { ...abs, cuts: [pocket, { r: (d / 2) * mm, depth: T * mm, at: [0, (T / 2) * mm, 0], dir: [0, -1, 0] }] }),
        ...Array.from({ length: RIBS(D) }, (_, k) => { const a = (k * 2 * PI) / RIBS(D); return P(`${it.name} rib ${k + 1}`, { box: [0.8 * mm, T * mm, 2 * mm] }, { ...abs, at: [(D / 2 - 0.4) * Math.cos(a) * mm, 0, (D / 2 - 0.4) * Math.sin(a) * mm], rot: [0, -a, 0] }); }),
        use(`nut ${th}`, [0, (T / 2 - 0.8 * d) * mm, 0], { name: `${it.name} nut`, fixed: 'pressed into the wheel\'s pocket' })]; },
  },
  drivegear: {
    says: 'the MK8 drive gear: its brass hub bored 5 mm, its 40 teeth round its middle with the filament\'s groove cut through them, its set screw in its hub', leaves: 'its teeth drawn as 40 ridges; their hobbing not drawn',
    make: (_p, it) => { const brass = { mat: 'brass', color: 0xc9a24a, finish: 'cast' as const };
      // (its hub below and above its teeth's band, y = 0 to 11; the band at 4 to 7, its groove 1.5 mm into it)
      return [P(it.name, lathe([[2.5, 0], [5.5, 0], [5.5, 4], [4, 4], [4, 7], [5.5, 7], [5.5, 11], [2.5, 11], [2.5, 0]]), { ...brass, cuts: [{ r: 1.25 * mm, depth: 3 * mm, at: [5.5 * mm, 2 * mm, 0], dir: [-1, 0, 0] }] }),
        ...Array.from({ length: 40 }, (_, k) => { const a = (k * 2 * PI) / 40; return P(`${it.name} tooth ${k + 1}`, { box: [1.5 * mm, 3 * mm, 0.35 * mm] }, { ...brass, at: [4.75 * Math.cos(a) * mm, 5.5 * mm, 4.75 * Math.sin(a) * mm], rot: [0, -a, 0] }); }),
        // (its set screw's top flush with the hub, its point on the shaft's flat: turned to point in)
        use('setscrew M3x3', [5.5 * mm, 2 * mm, 0], { rot: [0, 0, -PI / 2], name: `${it.name} set screw`, fixed: 'threaded in its hub onto the shaft\'s flat' })]; },
  },
  belt: {
    says: 'a GT2 belt: its neoprene body and teeth, the glass cords that carry its load wound in it at its pitch line; open, a strip its length; a loop, two runs and their turns round its ends (a 20-tooth pulley\'s 12.73 mm unless said)', leaves: 'its teeth not drawn (its body 1.2 mm thick their band, its cords a 0.2 mm layer in it); a loop drawn as an oval, its path round idlers and clamps not traced',
    make: (p, it) => { const L = Number(p.length), W = Number(p.width), loop = p.loop === 'yes', d = Number(p.d ?? 12.73), neo = { mat: 'neoprene', color: 0x1a1b1d, finish: 'moulded' as const }, glass = { mat: 'fibreglass', color: 0x1a1b1d, finish: 'moulded' as const }; // (its cords inside its body: unseen, drawn its colour)
      if (!loop) return [P(it.name, { box: [W * mm, 1.2 * mm, L * mm] }, { ...neo, item: 'timing-belt-body', at: [0, 0.1 * mm, 0] }), P(`${it.name} cords`, { box: [(W - 1) * mm, 0.2 * mm, L * mm] }, { ...glass, item: 'tension-cord-glass', at: [0, -0.6 * mm, 0] })];
      const run = Math.max(0, (L - PI * d) / 2);
      // (a band of thickness t whose middle is r from each end's centre: its two runs and two half-turns, in x and y, its width along z)
      const band = (nm: string, r: number, t: number, w: number, at: Record<string, unknown>): Part[] => {
        const arc = (e: number) => { const pts: [number, number][] = []; for (let k = 0; k <= 16; k++) { const a = -PI / 2 + (k * PI) / 16; pts.push([e * (r + t / 2) * Math.cos(a) * mm, (r + t / 2) * Math.sin(a) * mm]); } for (let k = 16; k >= 0; k--) { const a = -PI / 2 + (k * PI) / 16; pts.push([e * (r - t / 2) * Math.cos(a) * mm, (r - t / 2) * Math.sin(a) * mm]); } return pts; };
        return [P(nm, { box: [run * mm, t * mm, w * mm] }, { ...at, at: [0, r * mm, 0] }), P(`${nm} lower run`, { box: [run * mm, t * mm, w * mm] }, { ...at, at: [0, -r * mm, 0] }),
          ...[-1, 1].map((e) => P(`${nm} turn ${e < 0 ? 1 : 2}`, { prism: { pts: arc(e), L: w * mm } }, { ...at, at: [((e * run) / 2) * mm, 0, 0] }))]; };
      return [group(it.name, 'timing-belt-body', band(`${it.name} body`, d / 2 + 0.1, 1.2, W, neo)), group(`${it.name} cords`, 'tension-cord-glass', band(`${it.name} cords`, d / 2 - 0.6, 0.2, W - 1, glass))]; },
  },
  snapswitch: {
    says: 'a snap-action micro switch: its moulded housing, its plunger in its top, a lever (or a roller on one) over it, its contact spring with the moving contact between two fixed ones, its three terminals out of its base', leaves: 'its works drawn as their parts\' sizes (typical), its spring\'s snap shape not drawn; its housing weighed as its share of its box',
    make: (p, it) => { const s = SNAP[String(p.size)]!, { L, T, H } = s, lever = p.lever !== 'plunger', roll = p.lever === 'roller', dark = { mat: 'pbt', color: 0x1d1e21, finish: 'moulded' as const };
      // (in its own frame: its length along x, its thickness along y, its height along z, its terminals at -z)
      const parts: Part[] = [P(it.name, { box: [L * mm, T * mm, H * mm] }, { ...dark, item: 'switch-housing', fill: s.fill }),
        P(`${it.name} plunger`, { box: [0.12 * L * mm, 0.4 * T * mm, 0.12 * H * mm] }, { mat: 'pom', color: 0xb3261e, finish: 'moulded', item: 'switch-actuator', at: [-0.2 * L * mm, 0, 0.56 * H * mm] }),
        P(`${it.name} contact spring`, { box: [0.55 * L * mm, 0.15 * mm, 0.08 * H * mm] }, { mat: 'phosphor-bronze', color: 0xc9a24a, item: 'contact-spring', at: [0, 0, 0.05 * H * mm] }),
        ...[-1, 0, 1].map((k) => P(`${it.name} contact ${k + 2}`, { cyl: [0.03 * H * mm, 0.06 * H * mm] }, { mat: 'silver', color: 0xd9d9d6, item: 'contact-silver', at: [(0.25 * L + k * 0.04 * L) * mm, 0, (k === 0 ? 0.05 : k * 0.12) * H * mm] })),
        ...[-1, 0, 1].map((k) => P(`${it.name} terminal ${k + 2}`, { box: [0.05 * L * mm, 0.08 * T * mm, 0.35 * H * mm] }, { mat: 'brass', color: 0xd9d6cc, finish: 'plate', item: 'switch-terminal', at: [k * 0.38 * L * mm, 0, -0.675 * H * mm] }))];
      if (lever) parts.push(P(`${it.name} lever`, { box: [0.95 * L * mm, 0.6 * T * mm, 0.3 * mm] }, { mat: 'stainless-304', color: 0xb9bdc2, finish: 'plate', at: [0.02 * L * mm, 0, (0.62 * H + 0.15) * mm], rot: [0, 0.08, 0] }));
      if (roll) parts.push(P(`${it.name} roller`, { cyl: [0.12 * H * mm, 0.5 * T * mm] }, { mat: 'pom', color: 0xf1ede2, at: [0.47 * L * mm, 0, (0.7 * H + 0.12 * H) * mm], rot: [PI / 2, 0, 0] }));
      return parts; },
  },
  endstop: {
    says: 'an endstop board: a lever micro switch standing on a 26 × 20 mm board (its maker\'s model\'s size), a 3-way XH socket beside it for its cable', leaves: 'its board\'s traces and the switch\'s solder joints not drawn; where the socket sits on the board typical',
    make: (_p, it) => { const sw = SNAP.subminiature!, b = 1.6;
      // (the board along x and z, y up; the switch stood on its base, its length along x, its lever up; the socket at the board's other end)
      const housing = P(`${it.name} socket housing`, { box: [9.9 * mm, 7 * mm, 5.75 * mm] }, { mat: 'nylon', color: 0xf1ede2, finish: 'texture', item: 'xh-housing', at: [-7 * mm, (b + 3.5) * mm, 5 * mm] });
      const pins = [-1, 0, 1].map((k) => P(`${it.name} socket pin ${k + 2}`, { box: [0.64 * mm, 9.5 * mm, 0.64 * mm] }, { mat: 'brass', color: 0xd9d6cc, finish: 'plate', item: 'xh-pin', at: [(-7 + k * 2.5) * mm, (b + 9.5 / 2 - 3) * mm, 5 * mm] }));
      return [P(it.name, { box: [26 * mm, b * mm, 20 * mm] }, { mat: 'fr4', color: 0xb3261e, item: 'pcb-bare', at: [0, (b / 2) * mm, 0] }),
        use('snapswitch subminiature lever', [3 * mm, (b + 0.35 * sw.H + sw.H / 2) * mm, -4 * mm], { rot: [-PI / 2, 0, 0], name: `${it.name} switch`, fixed: 'its terminals soldered through the board' }),
        group(`${it.name} socket`, 'jst-xh-3-top', [housing, ...pins])]; },
  },
  vwheel: {
    says: 'a solid V wheel turned about its axle: its hub bored for two 625 bearings, its V edge for a V-slot\'s groove (OpenBuilds\' sizes)', leaves: 'its V\'s proportions typical; its bearings drawn apart (they are their own parts)',
    make: (_p, it) => [P(it.name, lathe(VWHEEL), { mat: 'pom', color: 0x1d1e21, finish: 'moulded' })],
  },
  spacer: {
    says: 'a plain tube: its outside, bored 0.2 mm over its screw, cut to its length', leaves: 'its ends\' chamfers not drawn',
    make: (p, it) => { const D = Number(p.d), b = (Number(String(p.thread).slice(1)) + 0.2) / 2, L = Number(p.L), mat = matIn(it);
      return [P(it.name, lathe([[b, -L / 2], [D / 2, -L / 2], [D / 2, L / 2], [b, L / 2], [b, -L / 2]]), { mat, ...looks(it, mat), finish: 'cast' })]; },
  },
  eccentric: {
    says: 'an eccentric spacer: its 10 mm hex, its rim 7.1 mm across under it, both bored 5 mm 0.79 mm off their centre', leaves: 'its hex\'s chamfers not drawn',
    make: (p, it) => { const h = Number(p.h), r = Number(p.r), mat = matIn(it), at = { mat, ...looks(it, mat), finish: 'cast' as const }, e = 0.79;
      const hex = Array.from({ length: 6 }, (_, q) => [(5 / Math.cos(PI / 6)) * Math.cos((q * PI) / 3 + PI / 6) * mm, (5 / Math.cos(PI / 6)) * Math.sin((q * PI) / 3 + PI / 6) * mm] as [number, number]);
      // (its hex from y = 0 up, its rim below; the bore at x = 0.79 through both)
      // (a prism is drawn about its middle along its own z, turned up here: its bore along that z)
      return [P(it.name, { prism: { pts: hex, L: h * mm } }, { ...at, at: [0, (h / 2) * mm, 0], rot: [-PI / 2, 0, 0], cuts: [{ r: 2.5 * mm, depth: h * mm, at: [e * mm, 0, (h / 2) * mm], dir: [0, 0, -1] }] }),
        P(`${it.name} rim`, lathe([[0, -r], [3.55, -r], [3.55, 0], [0, 0]]), { ...at, cuts: [{ r: 2.5 * mm, depth: r * mm, at: [e * mm, 0, 0], dir: [0, -1, 0] }] })]; },
  },
  countersunk: {
    says: 'ISO 10642: a 90° countersunk head 2.24 d across its top and 0.62 d deep (its cone), its hex socket, threaded to its head; its length to its top', leaves: 'the thread its major cylinder; its head\'s sizes the standard\'s proportions (2.24 d, 0.62 d), its socket the standard\'s key',
    make: (p, it) => { const t = String(p.thread), d = Number(t.slice(1)), L = Number(p.L), mat = matIn(it), at = { mat, ...looks(it, mat) }, dk = 2.24 * d, k = 0.62 * d, key = ({ 3: 2, 4: 2.5, 5: 3, 6: 4, 8: 5, 10: 6, 12: 8, 16: 10, 20: 12 } as Record<number, number>)[d] ?? 0.6 * d;
      // (its top at y = 0, its cone down to the shank, the shank down to its length)
      return [P(it.name, lathe([[0, 0], [dk / 2, 0], [d / 2, -k], [d / 2, -L], [0, -L]]), { ...at, cuts: [socket(key * mm, 0.5 * k * mm, 0)] })]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: Number(String(p.thread).slice(1)) * mm, n: 1 }],
  },
  leadscrew: {
    says: 'a rolled-thread stainless screw and its flanged brass nut (for T8 the flange 22 mm across and 3.5 thick, its body 10.2 across and 15 long, four 3.5 mm holes on 16 mm: typical of T8 nuts; other sizes scaled by diameter)', leaves: 'the thread its major cylinder at four fifths filled (its trapezoid\'s share, typical); the nut at its middle (a build moves it to its carriage)',
    make: (p, it) => { const d = Number(p.d), L = Number(p.length), k = d / 8, steel = { mat: 'stainless-304', color: 0xb9bdc2, finish: 'thread' as const }, brass = { mat: 'brass', color: 0xc9a24a, finish: 'cast' as const }, h = 7.5 * k;
      const nut: Part = { name: `${it.name} nut`, item: 'lead-nut', at: [0, 0, 0], parts: [P(`${it.name} nut`, lathe([[d / 2, -h], [5.1 * k, -h], [5.1 * k, h - 3.5 * k], [11 * k, h - 3.5 * k], [11 * k, h], [d / 2, h], [d / 2, -h]]), { ...brass, cuts: [0, 1, 2, 3].map((q) => ({ r: 1.75 * k * mm, depth: 4 * k * mm, at: [8 * k * Math.cos((q * PI) / 2) * mm, h * mm, 8 * k * Math.sin((q * PI) / 2) * mm] as V3, dir: [0, -1, 0] as V3 })) })] };
      return [P(it.name, lathe([[0, -L / 2], [d / 2, -L / 2], [d / 2, L / 2], [0, L / 2]]), { ...steel, item: 'lead-screw', fill: 0.8 }), nut]; },
  },
  printnozzle: {
    says: 'a nozzle turned from bar: its M6 × 1 thread, its hex, its cone to the orifice, bored 2 mm for 1.75 mm filament down to the cone (an MK8 13 mm long overall with its thread 5 mm long: McMaster-Carr\'s listing; its hex 6 mm across flats, 6.9 across corners: Creality\'s own Ender-3 model, as Raise3D\'s guide gives a V6\'s)', leaves: 'its cone 2.5 mm and its hex 3 mm high, typical; sellers\' hexes vary 6–8 mm (Raise3D gives an MK8 7); a V6\'s 12.5 mm and a Volcano\'s 21 mm long, their threads typical (5 and 12.5 mm)',
    make: (p, it) => { const form = String(p.form), d = Number(p.d), mat = matIn(it), at = { mat, ...looks(it, mat), finish: 'cast' as const }, L = form === 'Volcano' ? 21 : form === 'V6' ? 12.5 : 13, th = form === 'Volcano' ? 12.5 : 5, cone = 2.5, hx = 3, neck = L - cone - hx - th;
      const hex = Array.from({ length: 6 }, (_, q) => [(3 / Math.cos(PI / 6)) * Math.cos((q * PI) / 3) * mm, (3 / Math.cos(PI / 6)) * Math.sin((q * PI) / 3) * mm] as [number, number]), bore = { r: 1 * mm, depth: (L - 1.5) * mm, dir: [0, -1, 0] as V3 };
      // (its tip at y = 0: the cone, bored to a land above the orifice; the hex over it; the neck and the thread above, bored through)
      return [P(it.name, lathe([[d / 2, 0], [0.5, 0], [3.2, cone], [1, cone], [1, 1.5], [d / 2, 0.6], [d / 2, 0]]), at),
        P(`${it.name} hex`, { prism: { pts: hex, L: hx * mm } }, { ...at, at: [0, (cone + hx / 2) * mm, 0], rot: [-PI / 2, 0, 0], cuts: [{ ...bore, depth: hx * mm, at: [0, 0, (hx / 2) * mm], dir: [0, 0, -1] }] }),
        P(`${it.name} thread`, lathe([[1, cone + hx], [3, cone + hx], [3, L], [1, L], [1, cone + hx]]), { ...at, finish: 'thread', fill: (neck * 1 + th * threadFill(6, 1)) / (neck + th) })]; },
  },
  coupling: {
    says: 'a beam coupling turned from aluminium bar, its two bores, a set screw over each bore twice', leaves: 'its helical cut not drawn; its set screws typical (M3 × 3)',
    make: (p, it) => { const a = Number(p.d1), b = Number(p.d2), big = Math.max(a, b) > 8, D = big ? 25 : 19, L = big ? 30 : 25, al = { mat: 'al-6061', color: 0xc9cdd1, finish: 'cast' as const };
      const body = P(it.name, lathe([[0, -L / 2], [D / 2, -L / 2], [D / 2, L / 2], [0, L / 2]]), { ...al, cuts: [{ r: (a / 2) * mm, depth: (L / 2) * mm, at: [0, (-L / 2) * mm, 0], dir: [0, 1, 0] }, { r: (b / 2) * mm, depth: (L / 2) * mm, at: [0, (L / 2) * mm, 0], dir: [0, -1, 0] }] });
      const set = [-1, 1].flatMap((e) => [0, PI / 2].map((t, k) => P(`${it.name} set screw ${e < 0 ? 'low' : 'high'} ${k + 1}`, { cyl: [1.5 * mm, 3 * mm] }, { mat: 'steel-alloy', color: 0x2a2b2e, finish: 'plate', item: 'screw-set', at: [(D / 2 - 1.5) * Math.cos(t) * mm, e * (L / 2 - 4) * mm, (D / 2 - 1.5) * Math.sin(t) * mm], rot: [0, -t, PI / 2] })));
      return [body, ...set]; },
  },
  heater: {
    says: 'a cartridge heater: its stainless sheath (its wall 6 % of its diameter, at least 0.3 mm, typical), the nichrome coil packed in magnesium oxide inside it (swaged to about 85 % of its solid density, typical), its two terminal pins out of one end; its coil a tenth of the core it winds round (typical), so its nichrome\'s gauge follows from its resistance (V² / W, at 1.1 µΩ·m): 0.2 mm for 24 V 40 W, 0.1 for 230 V 100 W', leaves: 'its coil drawn as the cylinder it winds round, its pins short (its leads not drawn)',
    make: (p, it) => { const d = Number(p.d), L = Number(p.length), wall = Math.max(0.3, 0.06 * d), ri = d / 2 - wall, rc = ri * 0.6;
      return [P(it.name, lathe([[0, -L / 2], [d / 2, -L / 2], [d / 2, L / 2], [ri, L / 2], [ri, -L / 2 + wall], [0, -L / 2 + wall]]), { mat: 'stainless-304', color: 0xb9bdc2, finish: 'cast', item: 'heater-sheath' }),
        P(`${it.name} magnesia`, { cyl: [ri * mm, (L - wall) * mm] }, { mat: 'mgo', color: 0xeeeeea, fill: 0.85, at: [0, (wall / 2) * mm, 0] }),
        P(`${it.name} coil`, { cyl: [rc * mm, (L - 2) * mm] }, { mat: 'nichrome', color: 0x8e8a80, item: 'resistance-wire', fill: 0.1, at: [0, 0.25 * mm, 0] }),
        ...[-1, 1].map((e) => P(`${it.name} terminal ${e < 0 ? 1 : 2}`, { cyl: [Math.min(0.4, 0.1 * d) * mm, 3 * mm] }, { mat: 'nickel', color: 0xc9cdd1, finish: 'bright', item: 'terminal-pin', at: [e * d * 0.18 * mm, (L / 2 + 1.5) * mm, 0] }))]; },
  },
  thermistor: {
    says: 'a glass-sealed NTC thermistor: its sintered bead between two leads, sealed in a glass body 2 mm across and 4 long, its leads 0.3 mm and 40 mm (typical)', leaves: 'its leads straight (the wires to the board not drawn)',
    make: (_p, it) => [P(it.name, { cyl: [1 * mm, 4 * mm] }, { mat: 'glass', color: 0x3a2a1a, item: 'glass-body' }), P(`${it.name} bead`, { sphere: 0.5 * mm }, { mat: 'ntc-ceramic', color: 0x1d1e21, item: 'ntc-bead', at: [0, -0.8 * mm, 0] }),
      ...[-1, 1].map((e) => P(`${it.name} lead ${e < 0 ? 1 : 2}`, { cyl: [0.15 * mm, 40 * mm] }, { mat: 'copper', color: 0xc9a24a, item: 'lead-wire', at: [e * 0.35 * mm, 22 * mm, 0] }))],
  },
  fan: {
    says: 'an axial fan: its moulded frame (the square, its round throat, its motor seat on three struts, four holes on its pattern), its impeller (a hub, seven blades, the ferrite ring magnet lining the hub), the four windings of its stator round a sintered bronze bushing, its driver chip and its two leads', leaves: 'its proportions typical (families.ts fanDims: its hub, its frame\'s flanges and throat wall); its blades flat plates pitched 30°; its frame drawn whole but weighed as its flanges and throat wall; its windings half filled with wire; its chip an MSOP-8',
    make: (p, it) => { const S = Number(p.size), t = Number(p.thick), pbt = { mat: 'pbt', color: 0x1a1b1d, finish: 'moulded' as const }, { rt, rh, fl, wall, hubH, rs } = fanDims(S, t), face = S * S - PI * rt * rt, hole = ({ 25: 20, 30: 24, 40: 32, 50: 40, 60: 50, 80: 71.5, 92: 82.5, 120: 105 } as Record<number, number>)[S] ?? S * 0.8, hd = S >= 80 ? 4.3 : 3.4, y0 = -t / 2;
      const frame: Part = { name: `${it.name} frame`, item: 'fan-frame', at: [0, 0, 0], parts: [
        P(`${it.name} frame`, { box: [S * mm, t * mm, S * mm] }, { ...pbt, fill: Math.min(1, (2 * fl * face + 2 * PI * rt * wall * t) / (face * t)), cuts: [{ r: rt * mm, depth: t * mm, at: [0, (t / 2) * mm, 0], dir: [0, -1, 0] }, ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => ({ r: (hd / 2) * mm, depth: t * mm, at: [a! * (hole / 2) * mm, (t / 2) * mm, b! * (hole / 2) * mm] as V3, dir: [0, -1, 0] as V3 }))] }),
        P(`${it.name} motor seat`, { cyl: [rh * mm, 1.5 * mm] }, { ...pbt, at: [0, (y0 + 0.75) * mm, 0] }),
        ...[0, 1, 2].map((q) => { const a = (q * 2 * PI) / 3, r = (rh + rt) / 2; return P(`${it.name} strut ${q + 1}`, { box: [(rt - rh) * mm, 1.5 * mm, 1.6 * mm] }, { ...pbt, at: [r * Math.cos(a) * mm, (y0 + 0.75) * mm, r * Math.sin(a) * mm], rot: [0, -a, 0] }); })] };
      const hy = y0 + 1.5 + hubH / 2 + 0.3;
      const imp: Part = { name: `${it.name} impeller`, item: 'fan-impeller', at: [0, 0, 0], parts: [
        P(`${it.name} hub`, lathe([[0, hy + hubH / 2], [rh, hy + hubH / 2], [rh, hy - hubH / 2], [rh - 0.8, hy - hubH / 2], [rh - 0.8, hy + hubH / 2 - 0.8], [0, hy + hubH / 2 - 0.8]]), pbt),
        ...Array.from({ length: 7 }, (_, q) => { const a = (q * 2 * PI) / 7, r = (rh + rt - 0.6) / 2; return P(`${it.name} blade ${q + 1}`, { box: [(rt - 0.6 - rh) * mm, hubH * 0.9 * mm, 0.8 * mm] }, { ...pbt, at: [r * Math.cos(a) * mm, hy * mm, r * Math.sin(a) * mm], rot: [PI / 6, -a, 0] }); }),
        P(`${it.name} magnet ring`, lathe([[rh - 2, hy - hubH / 2], [rh - 0.8, hy - hubH / 2], [rh - 0.8, hy + hubH / 2 - 1.2], [rh - 2, hy + hubH / 2 - 1.2], [rh - 2, hy - hubH / 2]]), { mat: 'ferrite-hard', color: 0x3a3b3e, item: 'magnet-ferrite-arc' })] };
      const stator = Array.from({ length: 4 }, (_, q) => { const a = (q * PI) / 2 + PI / 4; return P(`${it.name} winding ${q + 1}`, { box: [Math.max(1, rs - 1.5) * mm, hubH * 0.5 * mm, Math.max(1, rs * 0.5) * mm] }, { mat: 'magnet-wire', color: 0xb87333, item: 'winding', fill: 0.45, at: [((rh - 2.6 + 1.5) / 2) * Math.cos(a) * mm, (hy - hubH * 0.1) * mm, ((rh - 2.6 + 1.5) / 2) * Math.sin(a) * mm], rot: [0, -a, 0] }); });
      const bush = P(`${it.name} bushing`, lathe([[0.75, y0 + 1.5], [1.5, y0 + 1.5], [1.5, y0 + 1.5 + hubH * 0.7], [0.75, y0 + 1.5 + hubH * 0.7], [0.75, y0 + 1.5]]), { mat: 'bronze', color: 0xa8743a, item: 'sleeve-bearing' });
      const ic = compPart({ ...chip('MSOP-8', 'driver chip'), at: [(rh - 1.6) * 0.5, y0 + 1.5, 0] }, it.name);
      const leads = [-1, 1].map((e) => P(`${it.name} lead ${e < 0 ? 'red' : 'black'}`, { cyl: [0.6 * mm, 20 * mm] }, { mat: 'copper', color: e < 0 ? 0xb3261e : 0x1a1b1d, item: 'wire-hookup', at: [(S / 2 + 10) * mm, (y0 + 1) * mm, e * 0.7 * mm], rot: [0, 0, PI / 2] }));
      return [frame, imp, ...stator, bush, ic, ...leads]; },
  },
  dowel: {
    says: 'ISO 8734: hardened and ground, one end chamfered, the other domed', leaves: 'nothing',
    make: (p, it) => { const d = Number(p.d), L = Number(p.length), c = Math.min(0.15 * d, 0.6); return [P(it.name, lathe([[0, -L / 2], [d / 2 - c, -L / 2], [d / 2, -L / 2 + c], [d / 2, L / 2 - c], [d / 2 - c * 0.6, L / 2 - c * 0.2], [0, L / 2]]), { mat: 'steel-chrome', color: 0xb9bdc1, finish: 'brushed' })]; },
    iface: (p) => [{ kind: 'shaft', role: 'provides', d: Number(p.d) * mm }],
  },
  nail: {
    says: 'a round wire nail: a flat head 2.2 times its shank, the shank, a diamond point a shank and a half long', leaves: 'its point drawn as a cone, its grip rings (where it has them) not drawn',
    make: (p, it) => { const [d, L] = String(p.size).split('x').map(Number) as [number, number], mat = matIn(it), hH = 0.35 * d, pt = 1.5 * d; return [P(it.name, lathe([[0, 0], [1.1 * d, 0], [1.1 * d, hH], [0, hH]]), { mat, ...looks(it, mat) }), P(it.name, lathe([[0, 0], [d / 2, 0], [d / 2, -(L - hH - pt)], [0, -(L - hH)]]), { mat, ...looks(it, mat) })]; },
  },
  blindrivet: {
    says: 'ISO 15977: a domed head twice its body across, its hollow body, its mandrel through it (before it is set)', leaves: 'shown before setting: the far end not yet swelled',
    make: (p, it) => { const d = Number(p.d), L = Number(p.L), mat = matIn(it), hd = 2 * d, hk = 0.3 * d, dm = 0.55 * d;
      return [P(it.name, lathe([[dm / 2, 0], [hd / 2, 0], [hd / 2 * 0.8, hk], [dm / 2, hk], [dm / 2, 0]]), { mat, ...looks(it, mat) }), P(it.name, lathe([[dm / 2, 0], [d / 2, 0], [d / 2, -L], [dm / 2, -L], [dm / 2, 0]]), { mat, ...looks(it, mat) }),
        P(`${it.name} mandrel`, lathe([[0, -L - 1], [dm / 2 * 1.2, -L - 1], [0.25 * d, -L], [0.25 * d, 25], [0, 25]]), { mat: p.matter === 'stainless' ? 'stainless-304' : 'steel-low', color: 0xa0a4a8, finish: 'plate', item: p.matter === 'stainless' ? 'rivet-mandrel-stainless' : 'rivet-mandrel', fixed: 'drawn through its rivet\'s body, its head under the rivet\'s far end' })]; },
  },
  wheelnut: {
    says: 'a wheel nut: its hex over a 60° cone seat (DIN 74361 A) that centres the wheel on its studs, or over a flange (ISO 4107)', leaves: 'its thread drawn as its root cylinder',
    make: (p, it) => { const w = WHEEL[String(p.thread)]!, e = w.s / Math.cos(PI / 6), r1 = (w.d - 1.0825 * w.p) / 2, hs = 0.25 * w.h, mat = matIn(it), lk = looks(it, mat), fill = nutFill(w.s, w.d, w.p);
      const seat = p.seat === 'flange' ? lathe([[r1, 0], [0.725 * w.s, 0], [0.725 * w.s, hs], [r1, hs], [r1, 0]]) : lathe([[r1, 0], [0.425 * w.s - hs * Math.tan(PI / 6), 0], [0.425 * w.s, hs], [r1, hs], [r1, 0]]);
      return [P(it.name, seat, { mat, ...lk }), P(it.name, lathe([[r1, hs], [e / 2, hs], [e / 2, w.h - 0.12 * w.h], [0.9 * (e / 2), w.h], [r1, w.h], [r1, hs]]), { mat, ...lk, facets: 6, fill })]; },
    iface: (p) => [{ kind: 'studs', role: 'requires', d: WHEEL[String(p.thread)]!.d * mm }],
  },
  wheelstud: {
    says: 'a wheel stud: a flat head behind the hub\'s flange, its knurl pressed into the flange, its thread out through the wheel', leaves: 'its knurl drawn as a plain cylinder 1.12 d across; its thread its major cylinder',
    make: (p, it) => { const w = WHEEL[String(p.thread)]!, L = Number(p.L), kn = 1.1 * w.d, mat = matIn(it), lk = looks(it, mat), root = (w.d - 1.0825 * w.p) / 2;
      return [P(it.name, lathe([[0, 0], [1.05 * w.d, 0], [1.05 * w.d, 0.3 * w.d], [0, 0.3 * w.d]]), { mat, ...lk }), P(it.name, lathe([[0, 0], [0.56 * w.d, 0], [0.56 * w.d, -kn], [0, -kn]]), { mat, ...lk, finish: 'thread' }),
        P(it.name, lathe([[0, -kn], [w.d / 2, -kn], [w.d / 2, -L + w.p], [root, -L], [0, -L]]), { mat, ...lk, finish: 'thread', fill: threadFill(w.d, w.p) })]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: WHEEL[String(p.thread)]!.d * mm, n: 1 }],
  },
  // ---- stock: bar, tube, sheet, sections -------------------------------------------------------------------------------
  rod: { says: 'round bar, drawn or turned', leaves: 'nothing', make: (p, it) => { const d = Number(p.d), L = Number(p.length), mat = matIn(it); return [P(it.name, { cyl: [d / 2 * mm, L * mm] }, { mat, ...looks(it, mat) })]; }, iface: (p) => [{ kind: 'shaft', role: 'provides', d: Number(p.d) * mm }] },
  flatbar: { says: 'EN 10058 flat bar', leaves: 'its edges drawn square (rolled bar\'s are slightly rounded)', make: (p, it) => { const mat = matIn(it); return [P(it.name, { box: [Number(p.w) * mm, Number(p.L) * mm, Number(p.t) * mm] }, { mat, ...looks(it, mat) })]; } },
  squarebar: { says: 'EN 10059 square bar', leaves: 'its edges drawn square', make: (p, it) => { const a = Number(p.a) * mm, mat = matIn(it); return [P(it.name, { box: [a, Number(p.L) * mm, a] }, { mat, ...looks(it, mat) })]; } },
  hexbar: { says: 'EN 10061 hexagon bar', leaves: 'nothing', make: (p, it) => { const r = Number(p.af) / Math.sqrt(3), L = Number(p.L), mat = matIn(it); return [P(it.name, lathe([[0, -L / 2], [r, -L / 2], [r, L / 2], [0, L / 2]]), { mat, ...looks(it, mat), facets: 6 })]; } },
  sheet: { says: 'sheet cut to size', leaves: 'nothing', make: (p, it) => { const mat = matIn(it); return [P(it.name, { box: [Number(p.w) * mm, Number(p.t) * mm, Number(p.h) * mm] }, { mat, ...looks(it, mat) })]; } },
  tube: {
    says: 'round or square tube, its wall as given', leaves: 'a square tube\'s corners drawn square',
    make: (p, it) => { const od = Number(p.od), t = Number(p.wall), L = Number(p.length), mat = matIn(it), lk = looks(it, mat);
      if (p.shape === 'square') return [P(it.name, section(box(od, od), [box(od - 2 * t, od - 2 * t)], L), { mat, ...lk, rot: ALONG_Y })];
      return [P(it.name, lathe([[od / 2 - t, -L / 2], [od / 2, -L / 2], [od / 2, L / 2], [od / 2 - t, L / 2], [od / 2 - t, -L / 2]]), { mat, ...lk })]; },
  },
  pipe: {
    says: 'ASME B36.10M schedule 40: its outside and wall by its nominal size', leaves: 'its ends cut square, unthreaded',
    make: (p, it) => { const [od, wall] = NPS40[String(p.nps)]!, L = Number(p.length) * 1000, mat = matIn(it); return [P(it.name, lathe([[od / 2 - wall, -L / 2], [od / 2, -L / 2], [od / 2, L / 2], [od / 2 - wall, L / 2], [od / 2 - wall, -L / 2]]), { mat, ...looks(it, mat) })]; },
  },
  angle: {
    says: 'EN 10056-1 equal angle', leaves: 'its root and toe radii not drawn (the corners square)',
    make: (p, it) => { const [a, t] = String(p.size).split('x').map(Number) as [number, number], mat = matIn(it); return [P(it.name, section([[0, 0], [a, 0], [a, t], [t, t], [t, a], [0, a]].map(([x, y]) => [x! - a / 2, y! - a / 2] as [number, number]), [], Number(p.L)), { mat, ...looks(it, mat), rot: ALONG_Y })]; },
  },
  channel: {
    says: 'EN 10279 UPN channel', leaves: 'its flanges drawn parallel at their mean thickness (UPN\'s taper 8 %), its root radii not drawn',
    make: (p, it) => { const [h, b, tw, tf] = UPN[Number(p.size)]!, mat = matIn(it); return [P(it.name, section([[0, 0], [b, 0], [b, tf], [tw, tf], [tw, h - tf], [b, h - tf], [b, h], [0, h]].map(([x, y]) => [x! - b / 2, y! - h / 2] as [number, number]), [], Number(p.L) * 1000), { mat, ...looks(it, mat), rot: ALONG_Y })]; },
  },
  ibeam: {
    says: 'EN 10365 IPE beam', leaves: 'its root radii not drawn',
    make: (p, it) => { const [h, b, tw, tf] = IPE[String(p.size)]!, mat = matIn(it), x0 = (b - tw) / 2; return [P(it.name, section([[0, 0], [b, 0], [b, tf], [x0 + tw, tf], [x0 + tw, h - tf], [b, h - tf], [b, h], [0, h], [0, h - tf], [x0, h - tf], [x0, tf], [0, tf]].map(([x, y]) => [x! - b / 2, y! - h / 2] as [number, number]), [], Number(p.length) * 1000), { mat, ...looks(it, mat), rot: ALONG_Y })]; },
  },
  boxsection: {
    says: 'EN 10219 rectangular hollow section', leaves: 'its corners drawn square (cold-formed sections\' are rounded about 2 t)',
    make: (p, it) => { const [h, b] = String(p.size).split('x').map(Number) as [number, number], t = Number(p.t), mat = matIn(it); return [P(it.name, section(box(h, b), [box(h - 2 * t, b - 2 * t)], Number(p.L)), { mat, ...looks(it, mat), rot: ALONG_Y })]; },
  },
  extrusion: {
    says: 'a T-slot aluminium extrusion: a slot down the middle of each face of each cell, its centre bored for a tapped end', leaves: 'its slots\' undercut chamfers and its inner webs drawn square (a typical outline, not one maker\'s die)',
    make: (p, it) => { const s = String(p.series), cell = Number(s.slice(0, 2)), n = Math.max(1, Number(s.slice(2)) / cell), L = Number(p.length), mat = 'al-6063'; return [P(it.name, section(tslot(cell, n), tslotHollows(cell, n), L), { mat, color: 0xc9ced3, finish: 'brushed', rot: ALONG_Y })]; },
  },
  // ---- electronics: each drawn from its outline (src/nexus/packages.ts), down to its die and its bond wires --------------
  chip: { says: PKG_SAYS, leaves: PKG_LEAVES, make: (p, it) => semiParts(String(p.pkg), it.name, String(p.part)) },
  transistor: { says: PKG_SAYS, leaves: PKG_LEAVES, make: (p, it) => semiParts(packageOf('transistor', p)!, it.name, String(p.part)) },
  regulator: { says: PKG_SAYS, leaves: PKG_LEAVES, make: (p, it) => semiParts(packageOf('regulator', p)!, it.name, String(p.part).replace(/-.*$/, '')) },
  diode: { says: PKG_SAYS, leaves: PKG_LEAVES, make: (p, it) => semiParts(packageOf('diode', p)!, it.name, '') },
  zener: { says: PKG_SAYS, leaves: PKG_LEAVES, make: (p, it) => semiParts(packageOf('zener', p)!, it.name, '') },
  chipresistor: {
    says: 'a thick-film chip resistor: its alumina substrate, the ruthenium-oxide film printed on its top (laser-trimmed to value), its glass and epoxy overcoat marked with its value (IEC 60062\'s codes), and a termination wrapped round each end',
    leaves: 'its film\'s trim cut, its inner silver electrodes and the termination\'s three platings (silver, nickel, tin) drawn as one skin 10 µm thick; its layers\' thicknesses typical of makers\' drawings',
    make: (p, it) => { const pk = String(p.pkg), [L, W, T] = chipCase(pk)!; return passiveParts(chipSolids('resistor', L, W, T), it.name, { body: 'chip-substrate', film: 'resistive-film', glaze: 'overglaze', term: 'chip-termination' }, chipCode(Number(p.R), String(p.tol), pk)); },
  },
  mlcc: {
    says: 'a multilayer ceramic chip capacitor: its fired body of barium-titanate layers between nickel electrodes, and a termination over each end that joins every other electrode',
    leaves: 'its electrodes, hundreds of layers a micrometre or so thick, inside its body and not drawn one by one (their nickel taken in its density); the termination\'s copper, nickel and tin drawn as one skin 20 µm thick',
    make: (p, it) => { const [L, W, T] = mlccCase(String(p.pkg)); return passiveParts(chipSolids('capacitor', L, W, T), it.name, { body: 'mlcc-body', term: 'chip-termination' }, '', String(p.dielectric) === 'C0G' ? 0xa89c8a : 0x9a7a55); },
  },
  smdled: {
    says: 'a surface LED: its die (or three, in a 5050) on its lead frame, wired to the other pad, in a white moulded cup filled with silicone (yellow with phosphor where it is white), or on a laminate base under a clear block',
    leaves: 'its cup\'s reflective slope drawn square, its phosphor mixed in its silicone, its ESD diode and its lead frame\'s bends under the cup not drawn',
    make: (p, it) => { const [L, W, H] = smdLedCase(String(p.pkg))!, c = String(p.colour); return passiveParts(smdLedSolids(L, W, H, ledDieOf(c), c.includes('white')), it.name, { lead: 'lead-frame', die: ledDieOf(c) === 'gan' ? 'led-die-ingan' : 'led-die-algainp', wire: 'bond-wire' }, '', undefined, LED_TINT[c]); },
  },
  resistor: {
    says: 'a metal-film resistor: its alumina rod under a film cut in a spiral to its value, a steel cap pressed on each end with its lead welded on, its lacquer coat thicker over the caps, and its five colour bands (IEC 60062: three digits, the multiplier, brown for ±1 %)',
    leaves: 'its film and its spiral cut not drawn (a few micrometres of nickel-chromium); its bands painted on, weighing nothing here; its body\'s size typical of its power',
    make: (p, it) => { const [L, D, ld] = axialBody(Number(p.watts)); return passiveParts(axialResistorSolids(L, D, Number(p.ohms), ld), it.name, { lead: 'lead-wire' }); },
  },
  led: {
    says: 'a through-hole LED: its clear epoxy lens on its flange, its cathode\'s lead ending in the anvil whose reflector cup holds the die, its anode\'s in the post, a gold wire from the die\'s top to the post',
    leaves: 'its reflector cup drawn as a block with a wall each side of its die, its rim\'s flat at the cathode cut to its lens\'s radius (an estimate), its lens diffused and tinted its colour (Adafruit\'s 299 the red one: a milky cherry red, its tint an estimate); its proportions typical of makers\' T-1 and T-1¾ drawings',
    make: (p, it) => { const c = String(p.colour); return passiveParts(ledSolids(Number(p.size), c === 'red' || c === 'yellow' ? 'algainp' : 'gan'), it.name, { lead: 'lead-frame', die: c === 'red' || c === 'yellow' ? 'led-die-algainp' : 'led-die-ingan', wire: 'bond-wire' }, '', undefined, LED_TINT[c]); },
  },
  solderiron: { says: 'an iron as its maker makes it (src/nexus/kit-solder.ts): its shell, grip, stainless core, board, display, buttons, ports and screws, its tip cartridge with its sleeve, heater and point', leaves: 'its board\'s smallest passives as three; its shell one moulding, not its two halves; where its maker gives no size, an estimate off a photo', make: (_p, it) => kitParts(pinecilV2(), it.name) },
  helpinghands: { says: 'helping hands as they are made (src/nexus/kit-solder.ts): a cast base, its nickel-plated rods, swivel and ball joints, wing nuts, two alligator clips each its jaws and spring, its magnifier\'s rim and glass', leaves: 'every size but its lens\'s an estimate (no maker publishes a drawing); posed holding an 81 mm board upside down, the lesson\'s hold', make: (_p, it) => kitParts(helpingHands(), it.name) },
  flushcutter: { says: 'cutters as their maker makes them (src/nexus/kit-solder.ts): two forged halves, their rivet, grips and spring (the -A\'s safety clip too)', leaves: 'their outline between Hakko\'s figures an estimate; their halves lying in one plane, not lapped at the rivet', make: (p, it) => kitParts(chp170(p.model === 'chp-170-a'), it.name) },
  switchholder: { says: 'a battery holder as Adafruit sells it (src/nexus/kit-solder.ts): its tray, its springs and plates, its knife switch, its two leads', leaves: 'its sizes but its length, width, height, switch and leads estimates (its photos not reachable here); drawn open; cells not included, as sold', make: (_p, it) => kitParts(holder3951(), it.name) },
  fluxpen: { says: 'a flux pen as Chip Quik makes it (src/nexus/kit-solder.ts): its moulded barrel and the flux in it, its felt nib, its cap', leaves: 'its valve, label and print; every size but its length, width, volume and weight an estimate (its photos not reachable here)', make: (_p, it) => kitParts(cq4lf(), it.name) },
  permaproto: { says: 'a breadboard PCB as Adafruit makes it (src/nexus/kit-solder.ts): its FR-4 drilled and plated through, each hole\'s pads and wall one plating, its underside\'s strips and rails, its white mask and its silk where its board file has it', leaves: 'its logo; its corners\' radius an estimate (its photo rounds what its board file chamfers)', make: (_p, it) => kitParts(permaProto(), it.name) },
  breadboard: { says: 'a breadboard as BusBoard makes it (src/nexus/kit-solder.ts): its moulded body with every hole and the walls between its clips\' slots, a phosphor-bronze clip under each column of five and each rail, its backing, its legend', leaves: 'its clips\' fingers as one strip each (their slits taken as 72 % of the strip); the walls\' and clips\' sizes estimates', make: (p, it) => kitParts(breadboard(Number(p.points)), it.name) },
  ironstand: { says: 'a stand as its maker makes it (src/nexus/kit-solder.ts): its sheet base and rim, its two rings on their uprights, its sponge and feet', leaves: 'which of its drawing\'s figures is which read by their sizes (an estimate), its welds not drawn', make: (_p, it) => kitParts(standS11(), it.name) },
  tipcleaner: { says: 'a tip cleaner as Hakko makes it (src/nexus/kit-solder.ts): its holder\'s base and top, its brass wool', leaves: 'its holder\'s shape between Hakko\'s two figures an estimate, its wool one ball', make: (_p, it) => kitParts(hakko599B(), it.name) },
  solderreel: { says: 'a reel of solder (src/nexus/kit-solder.ts): its spool and its wire wound on it', leaves: 'its spool\'s size an estimate; its wire as one wound body, its rosin core inside it not drawn apart', make: (_p, it) => kitParts(solderReel(), it.name) },
  sbc: { says: SBC_SAYS, leaves: SBC_LEAVES, make: (p, it) => boardParts(String(p.board), it.name), ports: (p) => [boardHoles(String(p.board))] },
  pico: { says: SBC_SAYS, leaves: SBC_LEAVES, make: (p, it) => boardParts(String(p.board), it.name), ports: (p) => [boardHoles(String(p.board))] },
  robotarm: {
    says: 'a six-axis arm at its link lengths (its user manual\'s, src/nexus/meca.ts): its base with joint 1\'s drive, its shoulder turret, its upper arm, its elbow with the forearm\'s offset, its wrist, its flange; each joint a group its program turns, its drive inside its housing',
    leaves: 'its castings\' outer forms simplified to cylinders and boxes of its links\' sizes, hollow (0.45 of them metal, typical); its drives\' insides (motor, gear, encoder) not published and drawn as one solid each, sized so the whole weighs its published 4.6 kg; its cables, connectors and brake not drawn',
    make: (p, it) => (String(p.model) === 'UR5e' ? dhArmParts(UR5E, it.name) : armParts(it.name)),
  },
  robothand: { says: 'a hand as its maker gives it (src/nexus/kit-robot.ts): the RH56DFX\'s palm, its six drives and board, four fingers and a thumb of two links each; the 2F-85\'s coupling, housing and drive, and its two four-bar fingers where Robotiq\'s own model puts their pivots', leaves: 'the RH56DFX\'s sizes an adult hand\'s (Inspire publish none here), its drives drawn as blocks; the 2F-85\'s links as bars between their pivots, its drive\'s kind not published', make: (p, it) => (String(p.model) === '2F-85' ? gripperParts(it.name) : handParts(it.name)) },
  toolchanger: { says: 'a changer as its maker gives it (src/nexus/kit-robot.ts): its master plate, its tool plate and the ring its balls lock into', leaves: 'its 63 mm diameter an estimate to an ISO 50 flange; its piston and balls inside not drawn apart', make: (_p, it) => changerParts(it.name) },
  ftsensor: { says: 'a force/torque sensor as its maker gives it (src/nexus/kit-robot.ts): its stainless body and its six silicon gauges on its flexures', leaves: 'its height an estimate; its flexures and cable not drawn', make: (_p, it) => ftParts(it.name) },
  depthcamera: { says: 'a depth camera as its maker gives it (src/nexus/kit-robot.ts): its case, its glass face, its two infrared imagers and colour one behind their lenses, its projector, its board', leaves: 'its imagers\' places estimates; its vision processor not drawn apart from its board', make: (_p, it) => depthCamParts(it.name) },
  gassensor: { says: 'a gas sensor as its maker gives it (src/nexus/kit-robot.ts): its LGA package, its two dies inside', leaves: 'its dies\' sizes estimates; its lid and pads not drawn apart', make: (_p, it) => bmeParts(it.name) },
  printer3d: { says: 'a 3D printer drawn from its maker\'s own assembly (Creality\'s Ender-3 3DXML, read by tools/measure/xml3d.py; VoronDesign\'s Voron 2.4r2 STEP, read by tools/measure/stepasm.py): every part where the model puts it, each library part (extrusions, rails, steppers, bearings, the GT2 pulleys and idlers, screws, nuts, washers, inserts and T-nuts) fitted to its box', leaves: 'what the library does not make yet drawn as its measured box, or as the walls its surface covers, said as what it is and coloured as its model colours it (the Voron\'s printed parts, its panels, its bed, its boards and supplies), each its fill an estimate', make: (p, it) => modelPart(PRINTER_MODELS[String(p.model) as keyof typeof PRINTER_MODELS] ?? ENDER3, it.name).part.parts! },
  robot: { says: 'the robot its tasks design (src/nexus/robot.ts), each part the library\'s: its table, two UR5e arms bolted down by their makers\' pattern and posed ready, a QC-11 and an RH56DFX hand on each (a Nano17 at each index fingertip), the Camera Module 3 on the right wrist, the D435, microphone and gas sensor on a mast', leaves: 'its table, mast and camera bracket estimates; its cables, air lines and controllers not drawn', make: (_p, it) => robotParts(it.name) },
};

// ---- electronics from their solids ------------------------------------------------------------------------------------
/** How each solid looks: a moulding matt black, a diode's glass orange, tinned leads and tabs, a paddle bare copper, a die
 *  mirror-dark, gold wires, a resistor's substrate white under its black overcoat, its terminations tin. */
function lookOf(s: Solid): Partial<Part> {
  const L: Record<Role, Partial<Part>> = {
    body: s.mat === 'glass' ? { color: 0xe0823c } : s.mat === 'alumina' ? { color: 0xf1eee6, finish: 'texture' } : s.mat === 'epoxy' ? { color: 0x86b4d6, finish: 'paint' } : s.mat === 'epoxy-clear' ? { color: 0xf2f6ff } : s.mat === 'silicone' ? { color: 0xe8eef2, finish: 'texture' } : { color: 0x1d1d1f, finish: 'texture' },
    lead: { color: TIN, finish: 'plate' }, tab: { color: TIN, finish: 'plate' }, pad: { color: TIN, finish: 'plate' }, frame: { color: 0xc8794a, finish: 'brushed' }, die: { color: 0x3c4258, finish: 'ground' }, wire: { color: 0xd9b24c, finish: 'brushed' },
    mark: { color: 0xb5b5b0, finish: 'texture' }, film: { color: 0x2a2a2a, finish: 'texture' }, glaze: { color: 0x161616, finish: 'texture' }, term: { color: TIN, finish: 'plate' },
    core: { color: s.mat === 'ppa' ? 0xf4f4f0 : s.mat === 'fr4' ? 0xe8e0c8 : 0xf1eee6, finish: 'texture' }, cap: { color: 0xb8bcc0, finish: 'plate' }, band: { finish: 'paint' },
  };
  return { ...L[s.role], ...(s.color !== undefined ? { color: s.color } : {}), ...(s.finish ? { finish: s.finish } : {}) };
}
const NAME: Record<Role, string> = { body: '', lead: 'lead', pad: 'exposed pad', tab: 'tab', frame: 'die paddle', die: 'die', wire: 'bond wire', mark: 'band', film: 'resistive film', glaze: 'overcoat', term: 'termination', core: 'core', cap: 'end cap', band: 'colour band' };
const HOW: Partial<Record<Role, string>> = { lead: 'moulded into its body', frame: 'moulded into its body', tab: 'moulded into its body', pad: 'moulded into its body', die: 'bonded to what it sits on', wire: 'ball-bonded to the die, stitch-bonded to its lead', film: 'printed and fired on its substrate', glaze: 'printed and fired over its film', term: 'dipped and plated over its end', cap: 'pressed on the end of its rod', band: 'painted on its coat', mark: 'printed on its body' };
/** A solid as a part, mm to m: its shape, place and turn, its material and look, its item; the body's shape the share
 *  of it that is its own (what lies inside it taken out), a skin weighed as a skin. */
function solidPart(m: { s: Solid; g: number; fill: number }, name: string, item: string | undefined, more: Partial<Part> = {}): Part {
  const s = m.s, sh = s.shape, k = (v: number) => v * mm;
  const shape: Part['shape'] = 'box' in sh ? { box: [k(sh.box[0]), k(sh.box[1]), k(sh.box[2])] } : 'cyl' in sh ? { cyl: [k(sh.cyl[0]), k(sh.cyl[1])] } : 'lathe' in sh ? lathe(sh.lathe) : 'prism' in sh ? { prism: { pts: sh.prism.pts.map(([x, y]) => [k(x), k(y)] as [number, number]), L: k(sh.prism.L), ...(sh.prism.holes ? { holes: sh.prism.holes.map((h) => h.map(([x, y]) => [k(x), k(y)] as [number, number])) } : {}) } } : { tube: { r: k(sh.tube.r), pts: sh.tube.pts.map((q) => [k(q[0]), k(q[1]), k(q[2])] as V3), bend: k(sh.tube.r * 4), ...(sh.tube.sides ? { sides: sh.tube.sides } : {}) } };
  const t = 'box' in sh ? sh.box[2] : 0;
  return P(name, shape, { at: [k(s.at[0]), k(s.at[1]), k(s.at[2])], ...(s.rot ? { rot: s.rot } : {}), ...(s.mat ? { mat: s.mat } : {}), ...lookOf(s), ...(item ? { item } : {}), ...(HOW[s.role] ? { fixed: HOW[s.role] } : {}),
    ...(s.shell ? { kg: m.g / 1000 } : m.fill * (s.share ?? 1) < 1 ? { fill: m.fill * (s.share ?? 1) } : {}), ...(s.hole ? { cuts: [{ r: k(s.hole.r), depth: k(t), at: [0, k(s.hole.y), k(t / 2)] as V3, dir: [0, 0, -1] as V3 }] } : {}),
    ...(s.bores?.length && 'box' in sh ? { cuts: s.bores.map((h) => ({ r: k(h.r), depth: k(sh.box[1]), at: [k(h.x), k(sh.box[1] / 2), k(h.z)] as V3, dir: [0, -1, 0] as V3 })) } : {}), ...(s.text ? { text: s.text } : {}), ...(s.facets ? { facets: s.facets } : {}), ...(s.prints ? { prints: s.prints.map((q) => ({ ...q, at: [k(q.at[0]), k(q.at[1])] as [number, number], ...(q.h ? { h: k(q.h) } : {}), ...(q.lx ? { lx: k(q.lx) } : {}), ...(q.wz ? { wz: k(q.wz) } : {}) })) } : {}), ...(s.ink != null ? { ink: s.ink } : {}), ...(s.paint ? { paint: s.paint } : {}), ...(s.inkOnly ? { inkOnly: true } : {}), ...(s.shade !== undefined ? { shade: s.shade } : {}), ...more });
}
/** A semiconductor as drawn from its package: its body under its name (marked with its part number where it is big
 *  enough to read), its lead frame (leads, paddle, tab and pad) as one, or an axial diode's two leads each its own;
 *  its die and each of its wires. On a tab, the tab is under its name, the moulding what is on it. */
function semiParts(pk: string, nm: string, mark: string): Part[] {
  const q = pkgOf(pk); if (!q) throw new Error(`${nm}: no outline is kept for its package ${pk}`);
  // (a package on a tab, a TO-220's or a D²PAK's, is its tab: the moulding comes off it)
  const ms = solidMasses(pkgSolids(q)), frame: Part[] = [], leads = new Map<number, Part[]>(), out: Part[] = [], onTab = q.form === 'to220' || q.form === 'to263';
  for (const m of ms) {
    const it = pkgItem(q, m.s.role), name = m.s.role === 'body' ? (onTab ? `${nm} moulding` : nm) : `${nm} ${NAME[m.s.role]}`;
    if (it === 'lead-frame') { frame.push(solidPart(m, name, undefined)); continue; }
    if (it === 'lead-wire') { const l = m.s.lead ?? 0; (leads.get(l) ?? leads.set(l, []).get(l)!).push(solidPart(m, `${nm} lead`, undefined)); continue; }
    out.push(solidPart(m, name, it, m.s.role === 'body' && mark && q.L >= 4 && q.form !== 'to92' ? { text: mark } : {}));
  }
  if (frame.length) out.push(group(onTab ? nm : `${nm} lead frame`, 'lead-frame', onTab ? frame.map((f) => (f.name === `${nm} tab` ? { ...f, name: nm } : f)) : frame));
  for (const ps of leads.values()) out.push(ps.length === 1 ? { ...ps[0]!, item: 'lead-wire' } : group(`${nm} lead`, 'lead-wire', ps));
  return out;
}
/** A passive (a chip resistor or capacitor, a leaded resistor, an LED) as drawn from its solids: each under the item its
 *  role is (its leads grouped by lead, under one lead frame where the items say so), its body marked where it says. */
function passiveParts(ss: Solid[], nm: string, items: Partial<Record<Role, string>>, mark = '', bodyColor?: number, lens?: number): Part[] {
  const ms = solidMasses(ss), out: Part[] = [], leads = new Map<number, Part[]>();
  for (const m of ms) {
    const r = m.s.role, name = r === 'body' ? nm : `${nm} ${NAME[r]}`, it = items[r], colour = r === 'body' && (bodyColor ?? (lens && m.s.mat !== 'silicone' ? lens : undefined));
    if (r === 'lead') { const l = m.s.lead ?? 0; (leads.get(l) ?? leads.set(l, []).get(l)!).push(solidPart(m, `${nm} lead`, undefined)); continue; }
    out.push(solidPart(m, name, it, { ...(colour ? { color: colour } : {}), ...(r === 'glaze' && mark ? { text: mark } : {}) }));
  }
  const li = items.lead;
  if (li === 'lead-frame') out.push(group(`${nm} lead frame`, 'lead-frame', [...leads.values()].flat()));
  else for (const ps of leads.values()) out.push(ps.length === 1 ? { ...ps[0]!, ...(li ? { item: li } : {}) } : group(`${nm} lead`, li ?? '', ps));
  return out;
}

// ---- boards from their parts --------------------------------------------------------------------------------------------
/** A board as drawn from its parts (src/nexus/sbc.ts): each part under its item, its pieces under it, placed and turned,
 *  what is under the board turned over; the board itself under its own name, what the rest is on. */
function boardParts(id: string, nm: string): Part[] {
  return boardComps(id).map((c, i) => { const p = compPart(c, nm); return i === 0 ? { ...p, name: nm, parts: p.parts!.map((q, j) => (j === 0 ? { ...q, name: nm } : q)) } : p; });
}
/** A thing drawn from its parts as a board's are (src/nexus/sbc.ts's Comp): each part under its item, its pieces under
 *  it, placed and turned. */
export function compPart(c: Comp, nm: string): Part {
  const own = c.solids ? solidMasses(c.solids).map((m) => solidPart(m, `${nm} ${c.name}`, undefined)) : [], kids = (c.kids ?? []).map((k) => compPart(k, nm));
  const rot = c.turn || c.under ? ([c.under ? PI : 0, c.turn ?? 0, 0] as V3) : undefined, at: V3 = [c.at[0] * mm, c.at[1] * mm, c.at[2] * mm];
  return group(`${nm} ${c.name}`, c.item ?? '', [...own, ...kids], { at, ...(rot ? { rot } : {}) });
}
/** A tool of the soldering kit (src/nexus/kit-solder.ts), its parts under it; the thing itself under its own name. */
function kitParts(c: Comp, nm: string): Part[] { const p = compPart(c, nm); return (p.parts ?? []).map((q, i) => (i === 0 ? { ...q, name: nm } : q)); }
/** A board's mounting holes as a mating face: their pattern, the screw they take (M2.5 in a 2.7 mm hole), from its
 *  maker's drawing, on its underside. */
function boardHoles(id: string): Port {
  const b = boardDef(id), pat = b.holes.map(([x, z]) => [(x - b.L / 2) * mm, (b.W / 2 - z) * mm] as [number, number]);
  const t = (b.t ?? 1.6) * mm;
  return port('mounting holes', 'holes', screwFor(b.hole), pat, [0, -t, 0], [0, -1, 0], [1, 0, 0], t, { std: `${b.name}'s mechanical drawing`, pilot: b.hole * mm });
}

// ---- a six-axis arm --------------------------------------------------------------------------------------------------
/** The axis each joint of the arm turns about in the view's frame (its base frame's z is the view's y, its y the view's
 *  -z): joint 1 about y, 2, 3 and 5 about -z, 4 and 6 about x. */
export const ARM_AXES: ('y' | '-z' | 'x')[] = ['y', '-z', '-z', 'x', '-z', 'x'];
/** The Meca500 drawn at its zero joints, m: each joint a group named "<it> joint k" holding its link and the joints past
 *  it, so turning one turns everything it carries. */
function armParts(nm: string): Part[] {
  const m = (v: number) => v * mm, al = { mat: 'al-6061', color: 0xe9eaec, finish: 'brushed', fill: 0.45 }, drive = { mat: 'steel-electrical', color: 0x55585c, finish: 'cast', fill: 0.5 };
  const Z: V3 = [PI / 2, 0, 0], X: V3 = [0, 0, PI / 2], { d1, a2, a3, d4, d6 } = LINK, j0 = 90;
  const link = (k: number, parts: Part[]) => group(`${nm} link ${k}`, 'arm-casting', parts);
  const drv = (k: number, r: number, h: number, at: V3, rot?: V3) => P(`${nm} joint ${k} drive`, { cyl: [m(r), m(h)] }, { ...drive, item: 'joint-drive', at: at.map(m) as V3, ...(rot ? { rot } : {}), fixed: 'bolted inside its housing' });
  const joint = (k: number, at: V3, parts: Part[]): Part => group(`${nm} joint ${k}`, '', parts, { at: at.map(m) as V3, joint: 'bearing', fixed: `turning about its axis (joint ${k})` } as Partial<Part>);
  const flange = P(`${nm} flange`, { cyl: [m(16), m(8)] }, { mat: 'stainless-304', color: 0xcfd3d6, finish: 'brushed', item: 'robot-flange', at: [m(d6 - 4), 0, 0], rot: X });
  const j6 = joint(6, [0, 0, 0], [flange]);
  const j5 = joint(5, [0, 0, 0], [link(6, [P(`${nm} wrist link`, { box: [m(50), m(28), m(28)] }, { ...al, at: [m(35), 0, 0] })]), drv(6, 12, 30, [35, 0, 0], X), j6]);
  const j4 = joint(4, [d4, a3, 0], [link(5, [P(`${nm} wrist housing`, { cyl: [m(22), m(50)] }, { ...al, rot: Z })]), drv(5, 15, 40, [0, 0, 0], Z), j5]);
  const j3 = joint(3, [0, a2, 0], [link(4, [P(`${nm} elbow`, { cyl: [m(30), m(75)] }, { ...al, rot: Z }), P(`${nm} elbow riser`, { box: [m(40), m(a3), m(45)] }, { ...al, at: [0, m(a3 / 2), 0] }), P(`${nm} forearm`, { box: [m(d4 - 10), m(36), m(42)] }, { ...al, at: [m((d4 - 10) / 2 + 2), m(a3), 0] })]), drv(3, 24, 50, [0, 0, 0], Z), drv(4, 18, 50, [55, a3, 0], X), j4]);
  const j2 = joint(2, [0, d1 - j0, 0], [link(3, [P(`${nm} upper arm`, { box: [m(44), m(a2), m(50)] }, { ...al, at: [0, m(a2 / 2), 0] })]), j3]);
  const j1 = joint(1, [0, j0, 0], [link(2, [P(`${nm} shoulder turret`, { cyl: [m(40), m(d1 - j0)] }, { ...al, at: [0, m((d1 - j0) / 2), 0] }), P(`${nm} shoulder`, { cyl: [m(38), m(90)] }, { ...al, at: [0, m(d1 - j0), 0], rot: Z })]), drv(2, 28, 60, [0, d1 - j0, 0], Z), j2]);
  const base = P(nm, lathe([[0, 0], [60, 0], [60, 12], [42, 18], [42, j0], [0, j0]]), { ...al, item: 'arm-casting', fixed: 'bolted to its table through its base' });
  return [base, drv(1, 30, 60, [0, 50, 0]), j1];
}

/** A robot designed for its tasks (robot.ts's `robotFor`), drawn from the library's parts: its welded table, its arms
 *  bolted to it by their makers' pattern, each posed ready by its own inverse kinematics (its tool pointing down at the
 *  work), a QC-11 changer where a tool bolts on, its hand on each flange (each index fingertip a Nano17 where it feels),
 *  the Camera Module 3 on the right wrist where the soldering task needs it (it sees a 0.6 mm lead from 200 mm), the
 *  D435 on a mast behind looking down on the whole table, its microphone and gas sensor on the mast: only what its
 *  design has. Its table's, mast's and bracket's sizes estimates. What is not drawn yet said instead. */
export function robotPart(r: Robot, nm = 'the robot'): Part | string {
  const no = [...new Set(r.arms.flatMap((a) => [...(a.arm.id !== 'ur5e' ? [`${a.arm.name} on a robot's table (it is drawn on its own: "robotarm Meca500")`] : []), ...(!['rh56dfx', '2f-85'].includes(a.hand.id) ? [`${a.hand.name}`] : [])]))];
  if (no.length) return `not drawn yet: ${no.join('; ')}`;
  return { name: nm, at: [0, 0, 0], parts: robotParts(nm, r) };
}
function robotParts(nm: string, r: Robot = robotFor(TASKS.map((t) => t.id)).robot): Part[] {
  // (each arm stands on the table turned a quarter about its own z (its x toward the back, its y to the left), and is
  // posed by its own inverse kinematics: its tool pointing down 300 mm over the table at a work point in front of the
  // mast, to its side of the middle, put into its base's frame)
  const m = (v: number) => v * mm, { top, work, reach, depth, back } = ROBOT_CELL, n = r.arms.length, sides = n === 1 ? [0] : Array.from({ length: n }, (_, k) => -1 + (2 * k) / (n - 1));
  const base = (side: number): V3 => [side * 250, top, -back], has = (s: string) => r.senses.some((x) => x.sense === s);
  const inArm = (side: number, w: V3): V3 => { const b = base(side); return [-(w[2] - b[2]), -(w[0] - b[0]), w[1] - b[1]]; };
  const ready = (side: number) => ik(UR5E, inArm(side, [side * reach, top + 300, work[2]]), [0, 0, -1]).q;
  const steel = { mat: 'steel-low', color: 0x3d4247, finish: 'paint' as const };
  // (its top on a frame welded of 50 mm square tube: four legs, an apron under the top and stretchers 150 mm off the
  // floor between them, so it stands stiff under the arms moving; sizes estimates)
  const tube = (name: string, L: number, at: V3, along: 'x' | 'y' | 'z') => P(`${nm} table ${name}`, { box: along === 'x' ? [m(L), m(50), m(50)] : along === 'y' ? [m(50), m(L), m(50)] : [m(50), m(50), m(L)] }, { ...steel, at: at.map(m) as V3, fill: 0.15 });
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const;
  const lz = depth / 2 - 35, table: Part = { name: `${nm} table`, item: 'robot-table', at: [0, 0, 0], parts: [P(`${nm} table top`, { box: [m(900), m(12), m(depth)] }, { ...steel, at: [0, m(top - 6), 0] }),
    ...corners.map(([sx, sz], i) => tube(`leg ${i + 1}`, top - 12, [sx * 415, (top - 12) / 2, sz * lz], 'y')),
    ...[top - 37, 150].flatMap((y) => [...[-1, 1].map((sz) => tube(`${y > 300 ? 'apron' : 'stretcher'} ${sz < 0 ? 'back' : 'front'}`, 780, [0, y, sz * lz], 'x')), ...[-1, 1].map((sx) => tube(`${y > 300 ? 'apron' : 'stretcher'} ${sx < 0 ? 'left' : 'right'}`, 2 * lz - 50, [sx * 415, y, 0], 'z'))])] };
  const arm = (side: number, k: number): Part[] => {
    const sideName = n === 1 ? '' : side < 0 ? ' left' : side > 0 ? ' right' : ` ${k + 1}`, b = base(side), bolts = UR5E.base.bolts!, foot = UR5E.base.foot!.h, a = r.arms[k]!;
    const changer: Part[] = a.changer ? [{ name: `${nm}${sideName} tool changer`, item: 'toolchanger-qc-11', at: [0, 0, 0], parts: [alongZ(changerParts(), 'its stack')] }] : [];
    const grip = a.hand.id === '2f-85', hand: Part = { name: `${nm}${sideName} ${grip ? 'gripper' : 'hand'}`, item: grip ? 'robothand-2f-85' : 'robothand-rh56dfx', at: [0, 0, a.changer ? m(52.4) : 0], parts: [alongZ(grip ? gripperParts(`${nm}${sideName} gripper`) : handParts(`${nm}${sideName} hand`, has('touch')), 'its fingers out of the wrist')] };
    // (the right wrist's camera (the only arm's, if one) on a printed bracket off the flange's side, looking along the
    // tool past the back of the hand: 250 mm or so from the work it is over)
    const eye: Part[] = has('sight') && k === n - 1 ? [P(`${nm} wrist camera bracket`, { box: [m(20), m(14), m(5.5)] }, { mat: 'pla', color: 0x2b2d30, finish: 'printed', item: 'camera-bracket', at: [0, m(38), m(26.75)], fixed: 'clamped round the wrist\'s tool plate' }),
      { name: `${nm} wrist camera`, at: [0, m(45), m(30)], parts: camModuleParts(`${nm} wrist camera`) }] : [];
    const drawn = dhArmParts(UR5E, `${nm}${sideName} arm`, ready(side), [...changer, hand, ...eye])[0]!;
    const screws = Array.from({ length: bolts.n }, (_, j) => { const t = PI / 4 + (2 * PI * j) / bolts.n, rr = bolts.pcd / 2;
      return use(bolts.words, [m(b[0] + rr * Math.cos(t)), m(top + foot), m(b[2] + rr * Math.sin(t))], { name: `${nm}${sideName} arm base screw ${j + 1}`, fixed: `down through the arm's foot into a thread tapped in the table's top, at ${bolts.torque} N·m (Universal Robots' manual)` }); });
    return [{ ...drawn, name: `${nm}${sideName} arm`, item: 'robotarm-ur5e', at: [m(b[0]), m(b[1]), m(b[2])], rot: [-PI / 2, 0, PI / 2] }, ...screws];
  };
  // (the mast behind the arms, if it carries anything (beside a middle arm's base, if there is one): the D435 at its top
  // turned down onto the work, the ear and nose board below it)
  const mz = -back - 60, mx = n % 2 === 1 ? -220 : 0, eyeY = 720, tilt = Math.atan2(eyeY - (work[1] - top), work[2] - (mz + 25)), ear = has('hearing'), nose = has('smell');
  const mast: Part[] = has('depth') || ear || nose ? [{ name: `${nm} mast`, item: 'sensor-mast', at: [m(mx), m(top), m(mz)], parts: [P(`${nm} mast post`, { box: [m(40), m(eyeY), m(40)] }, { mat: 'al-6063', color: 0xc9cdd1, finish: 'brushed', at: [0, m(eyeY / 2), 0], fill: 0.45 }),
    ...(has('depth') ? [{ name: `${nm} depth camera`, item: 'depthcamera-d435', at: [0, m(eyeY - 12.5), m(25)] as V3, rot: [tilt, 0, 0] as V3, parts: depthCamParts(`${nm} depth camera`) }] : []),
    ...(ear || nose ? [{ name: `${nm} ${ear && nose ? 'ear and nose' : ear ? 'ear' : 'nose'}`, at: [0, m(eyeY - 160), m(21)] as V3, parts: earNoseParts(`${nm} ${ear && nose ? 'ear and nose' : ear ? 'ear' : 'nose'} board`, ear, nose) }] : [])] }] : [];
  return [table, ...sides.flatMap((s, k) => arm(s, k)), ...mast];
}
/** A maker's own assembly drawn from the library (makermodel.ts reads its parts' names into the library's words): each
 *  library part fitted to the model's part by its box (its axes matched to the model's by their lengths) and by where
 *  its surface's middle lies (so a screw's head, a motor's shaft and a pulley's hub face the way the model's do), then
 *  placed by the model's own matrix; what the library does not make yet drawn as its measured box, said as what it is.
 *  The whole stood on the floor, its footprint centred. */
export function modelPart(model: MakerModel, nm = model.name): { part: Part; drawn: number; boxed: number } {
  type M3 = number[][];
  const rotOf = (m: number[]): M3 => [[m[0]!, m[1]!, m[2]!], [m[4]!, m[5]!, m[6]!], [m[8]!, m[9]!, m[10]!]], tOf = (m: number[]): V3 => [m[3]!, m[7]!, m[11]!];
  const mv = (R: M3, v: V3): V3 => [R[0]![0]! * v[0] + R[0]![1]! * v[1] + R[0]![2]! * v[2], R[1]![0]! * v[0] + R[1]![1]! * v[1] + R[1]![2]! * v[2], R[2]![0]! * v[0] + R[2]![1]! * v[1] + R[2]![2]! * v[2]];
  const mm3 = (A: M3, B: M3): M3 => A.map((r) => [0, 1, 2].map((j) => r[0]! * B[0]![j]! + r[1]! * B[1]![j]! + r[2]! * B[2]![j]!));
  const det = (R: M3) => R[0]![0]! * (R[1]![1]! * R[2]![2]! - R[1]![2]! * R[2]![1]!) - R[0]![1]! * (R[1]![0]! * R[2]![2]! - R[1]![2]! * R[2]![0]!) + R[0]![2]! * (R[1]![0]! * R[2]![1]! - R[1]![1]! * R[2]![0]!);
  // (the Euler angles, x then y then z, the drawing turns a part by)
  const euler = (R: M3): V3 => { const m13 = Math.max(-1, Math.min(1, R[0]![2]!)), y = Math.asin(m13); return Math.abs(m13) < 0.9999999 ? [Math.atan2(-R[1]![2]!, R[2]![2]!), y, Math.atan2(-R[0]![1]!, R[0]![0]!)] : [Math.atan2(R[2]![1]!, R[1]![1]!), y, 0]; };
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  // (a drawn part's box and the middle of its pieces, weighted by their boxes, in its own frame, m: its body's, its
  // leads, wires and plug left out, as a maker's model leaves them out: a lead screw and its nut are not leads)
  const loose = (x: { p: Part; parent: { p: Part } | null }): boolean => /\b(leads?(?!\s*(?:screw|nut))|wire|cable|plug|connector)\b/i.test(x.p.name) || /wire|cable|jst/i.test(x.p.item ?? '') || (!!x.p.shape && 'tube' in x.p.shape) || (!!x.parent && loose(x.parent as never));
  // (a part that is all wire-like, a coil spring, fitted whole)
  // (and a rail's carriage, which the model has apart: the rail fitted to its own box)
  const tied = (x: { p: Part; parent: { p: Part } | null }, re: RegExp): boolean => (!!x.p.link && re.test(x.p.link)) || (!!x.parent && tied(x.parent as never, re));
  const own = (p: Part, skip?: RegExp) => { const q = { ...p, at: [0, 0, 0] as V3, rot: [0, 0, 0] as V3 }, all = layout(q).filter((x) => x.box && !x.box.isEmpty()), body = all.filter((x) => !loose(x) && !(skip && tied(x, skip))), ns = body.length ? body : all, b = new THREE.Box3(); let w = 0; const c = new THREE.Vector3();
    for (const x of ns) { b.union(x.box!); const s = x.box!.getSize(new THREE.Vector3()), v = Math.max(1e-12, s.x * s.y * s.z); c.addScaledVector(x.box!.getCenter(new THREE.Vector3()), v); w += v; }
    return { min: b.min.toArray() as V3, max: b.max.toArray() as V3, mid: (w ? c.divideScalar(w) : b.getCenter(new THREE.Vector3())).toArray() as V3 }; };
  const placed: { p: Part; corners: V3[] }[] = []; let drawn = 0, boxed = 0;
  // (the model turned so it faces the library's front, +x, and stands on its own up, +y: each part's place turned with it)
  const Ry: M3 = frameOf(model.id);
  const rotIn = (m: number[]): M3 => mm3(Ry, rotOf(m)), tIn = (m: number[]): V3 => mv(Ry, tOf(m));
  // (a part the library draws inside another, where the model has it: its box's middle in the model's frame)
  const middleOf = (mp: ModelPart): V3 => { const R = rotIn(mp[2]), t = tIn(mp[2]), c = mv(R, [0, 1, 2].map((k) => (mp[3][k]! + mp[3][k + 3]!) / 2) as V3); return [c[0] + t[0], c[1] + t[1], c[2] + t[2]]; };
  const inside = DRAWN_IN.map((d) => ({ ...d, at: model.parts.filter((mp) => d.name.test(baseName(mp[0]))).map(middleOf) }));
  const has = (re: RegExp) => model.parts.some((q) => re.test(baseName(q[0])));
  model.parts.forEach((mp: ModelPart, i) => {
    if (inside.some((d) => d.name.test(baseName(mp[0])) && model.parts.some((q) => d.in.test(baseName(q[0])) && libraryWords(q)))) return;
    // (a part the model has that is run by us instead, between its two ends)
    if (RUNS.some((r) => r.replaces?.test(baseName(mp[0])) && has(r.from) && has(r.to))) return;
    const R = rotIn(mp[2]), t = tIn(mp[2]), lo: V3 = [mp[3][0]!, mp[3][1]!, mp[3][2]!], hi: V3 = [mp[3][3]!, mp[3][4]!, mp[3][5]!], ext = extents(mp), cm: V3 = [0, 1, 2].map((k) => (lo[k]! + hi[k]!) / 2) as V3;
    const corners = [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((c) => { const v = mv(R, [a ? hi[0] : lo[0], b ? hi[1] : lo[1], c ? hi[2] : lo[2]]); return [v[0] + t[0], v[1] + t[1], v[2] + t[2]] as V3; })));
    const words = libraryWords(mp); let lib: Part | null = null; try { lib = words ? use(words) : null; } catch { lib = null; }
    if (lib) {
      const o = own(lib, DRAWN_IN.find((d) => d.link && d.in.test(baseName(mp[0])))?.link), le = [0, 1, 2].map((k) => (o.max[k]! - o.min[k]!) * 1000), cl = [0, 1, 2].map((k) => ((o.min[k]! + o.max[k]!) / 2) * 1000), ml = o.mid.map((v) => v * 1000);
      const perm = PERMS.map((pm) => ({ pm, e: pm.reduce((s, j, k) => s + Math.abs(le[j]! - ext[k]!) / Math.max(1, ext[k]!), 0) })).sort((a, b) => a.e - b.e)[0]!.pm;
      // (each axis's way by the side its weight lies on, where both lean clearly; else as it comes)
      const conf = [0, 1, 2].map((k) => { const dm = mp[4][k]! - cm[k]!, dl = ml[perm[k]!]! - cl[perm[k]!]!; return { s: Math.abs(dm) > 0.02 * ext[k]! && Math.abs(dl) > 0.02 * le[perm[k]!]! ? Math.sign(dm * dl) : 1, sure: Math.min(Math.abs(dm) / Math.max(1, ext[k]!), Math.abs(dl) / Math.max(1, le[perm[k]!]!)) }; });
      const F: M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; conf.forEach((c, k) => { F[k]![perm[k]!] = c.s; });
      if (det(F) < 0) { const k = [0, 1, 2].sort((a, b) => conf[a]!.sure - conf[b]!.sure)[0]!; F[k]![perm[k]!]! *= -1; }
      const fc = mv(F, cl as V3), tt: V3 = [cm[0] - fc[0], cm[1] - fc[1], cm[2] - fc[2]], W = mm3(R, F), wt = mv(R, tt);
      const at: V3 = [wt[0] + t[0], wt[1] + t[1], wt[2] + t[2]];
      // (what it holds that the model has elsewhere, moved there: in its own frame, the world's offset turned back by W, m)
      for (const d of inside.filter((d) => d.in.test(baseName(mp[0])) && d.at.length)) {
        const WT: M3 = [0, 1, 2].map((r) => [W[0]![r]!, W[1]![r]!, W[2]![r]!]), local = (w: V3) => mv(WT, [w[0] - at[0], w[1] - at[1], w[2] - at[2]]);
        if (d.link) {
          // (a carriage: the model's nearest to this rail's line and within its length, slid along it there; its travel
          // still the rail's)
          const k = d.at.map((w, j) => ({ j, l: local(w) })).filter(({ l }) => Math.abs(l[2]) <= le[2]! / 2 && Math.hypot(l[0], l[1]) < 30).sort((a, b) => Math.hypot(a.l[0], a.l[1]) - Math.hypot(b.l[0], b.l[1]))[0];
          if (!k) continue;
          d.at.splice(k.j, 1); const dz = k.l[2] * mm, re = d.link;
          const slide = (q: Part): Part => (q.link && re.test(q.link) ? { ...q, at: [q.at?.[0] ?? 0, q.at?.[1] ?? 0, (q.at?.[2] ?? 0) + dz] as V3, ...(q.travel?.slide ? { travel: { ...q.travel, slide: { ...q.travel.slide, from: q.travel.slide.from - dz, to: q.travel.slide.to - dz } } } : {}) } : q.parts ? { ...q, parts: q.parts.map(slide) } : q);
          lib = slide(lib); continue;
        }
        const lo = local(d.at.shift()!);
        const move = (q: Part): Part => (q.item === d.item ? { ...q, at: [lo[0] * mm, lo[1] * mm, lo[2] * mm] as V3 } : q.parts ? { ...q, parts: q.parts.map(move) } : q);
        lib = move(lib);
      }
      placed.push({ p: { ...lib, name: mp[1], at, rot: euler(W) } as Part, corners }); drawn++;
    } else {
      // (a part folded from sheet, deeper than its sheet: what of its box its sheet fills, its two largest faces' worth)
      const b = lookAs(baseName(mp[0]), mp[6]), wc = mv(R, cm), [e0, e1, e2] = [...ext].sort((a, b2) => b2 - a) as [number, number, number];
      const fill = b.sheet && e2 > 2 * b.sheet ? Math.min(1, (b.sheet * (e0 * e1 + e0 * e2)) / (e0 * e1 * e2)) : b.fill;
      // (a sheet's or a moulding's box drawn as the walls its own surface covers, its open sides open: each face its model
      // covers three fifths or more of, a wall its sheet thick (a moulding's 2 mm, typical); a plate, a closed box, or a
      // moulding whose surface lies on none of its box's faces drawn as its box)
      const fc = mp[5], wt = b.sheet ?? 2, look = { mat: b.mat, color: b.color, finish: b.finish as Part['finish'] }, at: V3 = [wc[0] + t[0], wc[1] + t[1], wc[2] + t[2]];
      const open = fc && Math.min(...ext) > 2.5 * wt && fc.filter((v) => v >= 0.6).length < 5, walls = open ? [0, 1, 2].flatMap((k) => [0, 1].filter((sd) => fc[2 * k + sd]! >= 0.6).map((sd) => ({ k, sd }))) : [];
      // (a sheet part whose surface lies on none of its box's faces, a plate standing off bosses: its sheet across its
      // thinnest way at its surface's middle)
      const thin = ext.indexOf(Math.min(...ext)), sheetMid = open && !walls.length && b.sheet ? mp[4][thin]! - cm[thin]! : null;
      if (walls.length || sheetMid !== null) placed.push({ p: { name: mp[1], at, rot: euler(R), parts: (walls.length ? walls : [{ k: thin, sd: -1 }]).map(({ k, sd }, i) => { const sz = [...ext] as V3; sz[k] = wt; const off: V3 = [0, 0, 0]; off[k] = sd < 0 ? sheetMid! : (sd ? 1 : -1) * (ext[k]! / 2 - wt / 2);
        return P(i ? `${mp[1]} wall ${i + 1}` : mp[1], { box: [sz[0] * mm, sz[1] * mm, sz[2] * mm] }, { ...look, at: [off[0] * mm, off[1] * mm, off[2] * mm] }); }) } as Part, corners });
      else {
        // (a thin part whose two broad faces its surface covers only a fraction of, a tape round a panel's edge or a belt
        // loop: a frame round its edge, as wide as covers that fraction of them, measured)
        const [i1, i2] = [0, 1, 2].filter((k) => k !== thin) as [number, number], L1 = ext[i1]!, L2 = ext[i2]!, cov = fc ? Math.max(fc[2 * thin]!, fc[2 * thin + 1]!) : 1;
        const fw = ext[thin]! < 0.15 * Math.min(L1, L2) && cov > 0.005 && cov < 0.5 ? (L1 + L2 - Math.sqrt((L1 + L2) ** 2 - 4 * cov * L1 * L2)) / 4 : 0;
        if (fw > 0) placed.push({ p: { name: mp[1], at, rot: euler(R), parts: [[i1, 1], [i1, -1], [i2, 1], [i2, -1]].map(([k, sd], j) => { const o = k === i1 ? i2 : i1, sz = [...ext] as V3; sz[o] = fw; if (k === i2) sz[i2] = L2 - 2 * fw; const off: V3 = [0, 0, 0]; off[o] = sd * (ext[o]! / 2 - fw / 2);
          return P(j ? `${mp[1]} side ${j + 1}` : mp[1], { box: [sz[0] * mm, sz[1] * mm, sz[2] * mm] }, { ...look, at: [off[0] * mm, off[1] * mm, off[2] * mm] }); }) } as Part, corners });
        else if (mp[6]?.hull) {
          // (else its outline from its least box-like side, measured, drawn through its depth that way: a prism along its
          // axis k, its section in the other two axes' order, turned from the prism's z to k)
          const [k, ratio, flat] = mp[6].hull, u = (k + 1) % 3, v = (k + 2) % 3, Pk: M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
          Pk[u]![0] = 1; Pk[v]![1] = 1; Pk[k]![2] = 1;
          const pts = Array.from({ length: flat.length / 2 }, (_, j) => [flat[2 * j]! * mm, flat[2 * j + 1]! * mm] as [number, number]);
          placed.push({ p: P(mp[1], { prism: { pts, L: ext[k]! * mm } }, { ...look, at, rot: euler(mm3(R, Pk)), fill: Math.min(1, fill / ratio) }), corners });
        } else placed.push({ p: P(mp[1], { box: [ext[0]! * mm, ext[1]! * mm, ext[2]! * mm] }, { ...look, at, rot: euler(R), fill }), corners });
      }
      boxed++;
    }
    void i;
  });
  // (what runs between two of its parts that the model leaves out: from the top of one, up, over and down into the top of
  // the other, a smooth tube; its length the path's)
  for (const run of RUNS) {
    const a = model.parts.find((q) => run.from.test(baseName(q[0]))), b2 = model.parts.find((q) => run.to.test(baseName(q[0])));
    if (!a || !b2) continue;
    const top = (q: ModelPart): V3 => { const c = middleOf(q), R = rotIn(q[2]), e = extents(q), hy = [0, 1, 2].reduce((h, k) => h + Math.abs(R[1]![k]!) * e[k]! / 2, 0); return [c[0], c[1] + hy, c[2]]; };
    const A = top(a), B = top(b2), over = Math.max(A[1], B[1]) + 80;
    const pts: V3[] = [A, [A[0], A[1] + 30, A[2]], [(A[0] + B[0]) / 2, over, (A[2] + B[2]) / 2], [B[0], B[1] + 30, B[2]], B];
    const len = pts.slice(1).reduce((l, q, i) => l + Math.hypot(q[0] - pts[i]![0], q[1] - pts[i]![1], q[2] - pts[i]![2]), 0);
    let it: Part | null = null; try { it = use(`${run.words} L${Math.round(len)}`); } catch { it = null; }
    if (!it) continue;
    placed.push({ p: { name: `${it.name} (run)`, item: it.item, at: [0, 0, 0], says: run.says, parts: [P(`${it.name} (run)`, { tube: { r: run.r * mm, pts: pts.map((q) => q.map((v) => v * mm) as V3), bend: 25 * mm } }, { mat: 'ptfe', color: 0xf2f2ee, finish: 'moulded' })] } as Part, corners: pts }); drawn++;
  }
  // (stood on the floor, its footprint centred; mm to m)
  const all = placed.flatMap((x) => x.corners), lo = [0, 1, 2].map((k) => Math.min(...all.map((c) => c[k]!))), hi = [0, 1, 2].map((k) => Math.max(...all.map((c) => c[k]!)));
  const shift: V3 = [(lo[0]! + hi[0]!) / 2, lo[1]!, (lo[2]! + hi[2]!) / 2];
  const parts = placed.map(({ p }) => ({ ...p, at: [((p.at?.[0] ?? 0) - shift[0]) * mm, ((p.at?.[1] ?? 0) - shift[1]) * mm, ((p.at?.[2] ?? 0) - shift[2]) * mm] as V3 }));
  return { part: { name: nm, at: [0, 0, 0], parts }, drawn, boxed };
}
/** Where the robot's work is: its table's top (mm above the floor), the point its tasks are done at (mm, the table's
 *  frame: a board held 60 mm over the table, in front of the mast), how far to each side of it each hand works, its
 *  table's depth and how far behind its middle the arms stand (so a tool held at a slant over the work keeps its
 *  flange 250 mm or more out from its arm's own axis, where a UR5e reaches; estimates). */
export const ROBOT_CELL = { top: 750, work: [0, 810, 80] as V3, reach: 120, depth: 800, back: 275 };

/** A section drawn along z, its length L mm, turned so its length runs along y. */
const ALONG_Y: V3 = [-PI / 2, 0, 0];
const section = (outer: [number, number][], holes: [number, number][][], L: number): Part['shape'] => ({ prism: { pts: outer.map(([x, y]) => [x * mm, y * mm] as [number, number]), ...(holes.length ? { holes: holes.map((h) => h.map(([x, y]) => [x * mm, y * mm] as [number, number])) } : {}), L: L * mm } });
const box = (w: number, h: number): [number, number][] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
const circle = (r: number, x0: number, y0: number, n = 16): [number, number][] => Array.from({ length: n }, (_, i) => [x0 + r * Math.cos((2 * PI * i) / n), y0 + r * Math.sin((2 * PI * i) / n)] as [number, number]);
/** A T-slot profile of n cells side by side (a 2040 is two 20 mm cells): each face of each cell has its slot, an opening
 *  0.31 of the cell wide through a lip 0.09 deep, opening to a cavity 0.43 wide and 0.19 deep (typical of 20 to 40 mm
 *  series, scaled), drawn square. */
/** Its hollows: each cell's centre bore (0.21 of the cell across, for a tapped end), a hollow in each of its corners
 *  (0.25 to 0.425 of the cell out from its middle each way, leaving walls about 0.035 of the cell to the slots and 0.075
 *  to the faces), and one where two cells meet (0.34 by 0.5 of a cell). Typical of the 20 to 40 mm series; each drawn
 *  section is within 20 % of the mass its family gives. */
function tslotHollows(cell: number, n: number): [number, number][][] {
  const out: [number, number][][] = [], sq = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  for (let k = 0; k < n; k++) { const cy = (k - (n - 1) / 2) * cell; out.push(circle(0.105 * cell, 0, cy)); for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const a = 0.25 * cell, b = 0.425 * cell; out.push(sq(Math.min(sx * a, sx * b), cy + Math.min(sy * a, sy * b), Math.max(sx * a, sx * b), cy + Math.max(sy * a, sy * b))); } }
  for (let k = 1; k < n; k++) { const yj = (k - n / 2) * cell; out.push(sq(-0.17 * cell, yj - 0.25 * cell, 0.17 * cell, yj + 0.25 * cell)); }
  return out;
}
function tslot(cell: number, n: number): [number, number][] {
  const W = cell / 2, H = (n * cell) / 2, o = 0.31 * cell / 2, lip = 0.09 * cell, cw = 0.43 * cell / 2, cd = 0.19 * cell, out: [number, number][] = [];
  // a slot inward from a face: along the face from its start, in at the opening, out to the cavity, back
  const slot = (c: number, run: (u: number, v: number) => [number, number]) => { for (const [u, v] of [[c - o, 0], [c - o, lip], [c - cw, lip], [c - cw, lip + cd], [c + cw, lip + cd], [c + cw, lip], [c + o, lip], [c + o, 0]] as [number, number][]) out.push(run(u, v)); };
  const cs = Array.from({ length: n }, (_, k) => (k - (n - 1) / 2) * cell);
  out.push([-W, -H]); slot(0, (u, v) => [u, -H + v]); out.push([W, -H]);
  for (const c of cs) slot(c, (u, v) => [W - v, u]); out.push([W, H]);
  slot(0, (u, v) => [-u, H - v]); out.push([-W, H]);
  for (const c of [...cs].reverse()) slot(-c, (u, v) => [-W + v, -u]);
  return out;
}

// ---- the designs made of parts within parts ----------------------------------------------------------------------------
/** A point on a circle, mm, by its angle from x toward z: as world x and z. */
const polar = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];
/** World x, z (mm) as a section's x, y: a section drawn along z and turned by ALONG_Y lies with its y along world -z. */
const S = (pts: [number, number][]): [number, number][] => pts.map(([x, z]) => [x, -z] as [number, number]);
/** A square of side F with its corners cut c back each way (a NEMA frame's outline), world x, z. */
const octagon = (F: number, c: number): [number, number][] => { const h = F / 2; return [[h, -h + c], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h], [h - c, -h]]; };
/** A round hole of radius r at world x, z, as a section's opening. */
const hole = (r: number, x: number, z: number, n = 16) => circle(r, x, -z, n);
/** A part made of pieces, filed under its item: what it is in the inventory, so what is in it can be counted. */
const group = (name: string, item: string, parts: Part[], more: Partial<Part> = {}): Part => ({ name, item, at: [0, 0, 0], parts, ...more });
/** A prism along y, mm: its section's outline and openings in world x, z, from y0 to y1. */
const slab = (name: string, outline: [number, number][], holes: [number, number][][], y0: number, y1: number, more: Partial<Part>): Part =>
  P(name, section(S(outline), holes, y1 - y0), { rot: ALONG_Y, at: [0, ((y0 + y1) / 2) * mm, 0], ...more });

/** A deep-groove ball bearing, mm, centred, its axis y. */
function bearingParts(p: Record<string, string | number>, nm: string, dims?: [number, number, number], flange?: [number, number]): Part[] {
  const n = String(p.number), [d, D, B] = dims ?? BEARINGS[n]!, { Db, dm, z } = ballsOf(d, D), seal = String(p.seal), shut = seal !== 'open';
  // (a radial internal clearance of 10 µm, CN-class, typical: half of it at each raceway)
  const cl = 0.005, rg = 0.52 * Db, sh = 0.22 * Db, ri = dm / 2 - Db / 2 - cl, ro = dm / 2 + Db / 2 + cl, Ri = ri + sh, Ro = ro - sh, ch = Math.max(0.1, Math.min(0.5, 0.03 * D));
  const phi0 = Math.acos(1 - sh / rg), yg = rg * Math.sin(phi0);
  // (a raceway's groove: an arc of its radius rg, from shoulder to shoulder)
  const groove = (r0: number, s: number, a0: number, a1: number) => Array.from({ length: 13 }, (_, k) => { const f = a0 + ((a1 - a0) * k) / 12; return [r0 + s * (rg - rg * Math.cos(f)), rg * Math.sin(f)] as [number, number]; });
  // (its cage's halves beside the balls, its shields outside them in recesses in the outer ring's bore)
  const tc = Math.max(0.15, 0.06 * Db), y0 = Db / 2 + 0.03 * Db, ys = y0 + tc + 0.04 * Db, ts = Math.min((seal === '2RS' ? 2 : 1) * (0.02 * D + 0.05), B / 2 - 0.05 - ys), Rr = shut ? Ro + 0.4 * (D / 2 - Ro) : Ro;
  const ring = { mat: 'steel-chrome', color: 0xb9bdc1, finish: 'brushed' };
  // (a flanged one's flange at its -y face: F across, T thick)
  const cf = flange ? Math.min(ch, flange[1] / 3) : 0, face0: [number, number][] = flange ? [[flange[0] / 2 - cf, -B / 2], [flange[0] / 2, -B / 2 + cf], [flange[0] / 2, -B / 2 + flange[1] - cf], [flange[0] / 2 - cf, -B / 2 + flange[1]], [D / 2, -B / 2 + flange[1]]] : [[D / 2 - ch, -B / 2], [D / 2, -B / 2 + ch]];
  const outer: [number, number][] = [[Rr, -B / 2], ...face0, [D / 2, B / 2 - ch], [D / 2 - ch, B / 2], [Rr, B / 2], ...(shut ? [[Rr, ys], [Ro, ys]] as [number, number][] : []), [Ro, yg], ...groove(ro, -1, phi0, -phi0), [Ro, -yg], ...(shut ? [[Ro, -ys], [Rr, -ys]] as [number, number][] : []), [Rr, -B / 2]];
  const inner: [number, number][] = [[d / 2, -B / 2 + ch], [d / 2 + ch, -B / 2], [Ri, -B / 2], [Ri, -yg], ...groove(ri, 1, -phi0, phi0), [Ri, yg], [Ri, B / 2], [d / 2 + ch, B / 2], [d / 2, B / 2 - ch], [d / 2, -B / 2 + ch]];
  const out: Part[] = [P(nm, lathe(outer), { ...ring, item: 'bearing-ring' }), P(`${nm} inner ring`, lathe(inner), { ...ring, item: 'bearing-ring' })];
  for (let k = 0; k < z; k++) { const [x, zz] = polar(dm / 2, (2 * PI * k) / z); out.push(P(`${nm} ball`, { sphere: (Db / 2) * mm }, { at: [x * mm, 0, zz * mm], mat: 'steel-chrome', color: 0xd5d8db, finish: 'brushed', item: 'bearing-ball', joint: 'bearing', fixed: 'rolling in the grooves of its rings' })); }
  const wc = 0.24 * Db, half = (s: number) => P(`${nm} cage`, lathe(s > 0 ? [[dm / 2 - wc, y0], [dm / 2 + wc, y0], [dm / 2 + wc, y0 + tc], [dm / 2 - wc, y0 + tc], [dm / 2 - wc, y0]] : [[dm / 2 - wc, -y0 - tc], [dm / 2 + wc, -y0 - tc], [dm / 2 + wc, -y0], [dm / 2 - wc, -y0], [dm / 2 - wc, -y0 - tc]]), { mat: 'steel-low', color: 0x9a9286, finish: 'plate', joint: 'bearing', fixed: 'riding on its balls' });
  const rivets = Array.from({ length: z }, (_, k) => { const [x, zz] = polar(dm / 2, (2 * PI * (k + 0.5)) / z); return P(`${nm} cage`, { cyl: [0.11 * Db * mm, 2 * y0 * mm] }, { at: [x * mm, 0, zz * mm], mat: 'steel-low', color: 0x9a9286, finish: 'plate', fixed: 'riveted between the halves of its cage' }); });
  out.push(group(`${nm} cage`, 'bearing-cage', [half(1), half(-1), ...rivets]));
  if (shut) for (const s of [1, -1]) {
    const gap = seal === '2RS' ? 0 : 0.1, yA = s > 0 ? ys : -ys - ts, yB = s > 0 ? ys + ts : -ys;
    out.push(P(`${nm} ${seal === '2RS' ? 'seal' : 'shield'}`, lathe([[Ri + gap, yA], [Rr, yA], [Rr, yB], [Ri + gap, yB], [Ri + gap, yA]]), seal === '2RS' ? { mat: 'nbr', color: 0x2a2a2c, finish: 'texture', fixed: 'pressed into the recess of its outer ring, its lip on its inner ring' } : { mat: 'steel-low', color: 0xc4c8cc, finish: 'plate', item: 'bearing-shield', fixed: 'snapped into the recess of its outer ring' }));
  }
  return out;
}

/** An MGN rail and its carriage, mm (src/nexus/families.ts mgnDims): the rail along z with its foot at y = 0, the
 *  carriage at the middle of its travel: the rail and the block each one piece, their holes drilled in them. */
function railParts(p: Record<string, string | number>, nm: string): Part[] {
  const d = mgnDims(p), { L, Db, rg, cl, yb, xb, xw, xr, rh } = d, L1 = d.blk.L1, Lb = d.blk.L, steel = { mat: 'stainless-440c', color: 0xc9cdd0, finish: 'ground' };
  // (a groove: an arc of rg about its centre cx, facing out (s = 1, the rail's) or in (s = -1, the block's), from where it
  // leaves the face at x0 to where it meets it again)
  const groove = (cx: number, s: 1 | -1, x0: number): [number, number][] => { const f = Math.acos(Math.min(1, Math.abs(x0 - cx) / rg)); return Array.from({ length: 11 }, (_, k) => { const q = -f + (2 * f * k) / 10; return [cx - s * rg * Math.cos(q), yb + rg * Math.sin(q)] as [number, number]; }); };
  const cxr = xb - Db / 2 - cl + rg, cxb = xb + Db / 2 + cl - rg, out: Part[] = [];
  // ---- the rail: one ground bar, a groove down each side, its holes drilled through and counterbored from its top
  const zs = Array.from({ length: d.nh }, (_, k) => -L / 2 + d.E1 + k * d.P), c0 = Math.min(0.3, 0.04 * d.WR), yc = d.HR - d.h;
  const right: [number, number][] = [[d.WR / 2 - c0, 0], [d.WR / 2, c0], ...[...groove(cxr, 1, d.WR / 2)].reverse().map(([x, y]) => [x, 2 * yb - y] as [number, number]), [d.WR / 2, d.HR - c0], [d.WR / 2 - c0, d.HR]];
  const bar = [...right, ...[...right].reverse().map(([x, y]) => [-x, y] as [number, number])];
  const bores: Cut[] = zs.flatMap((z) => [{ r: (d.D / 2) * mm, depth: d.h * mm, at: [0, d.HR * mm, z * mm] as V3, dir: [0, -1, 0] as V3 }, { r: (d.d / 2) * mm, depth: yc * mm, at: [0, yc * mm, z * mm] as V3, dir: [0, -1, 0] as V3 }]);
  out.push(P(nm, section(bar, [], L), { ...steel, item: `mgn${d.size}-rail-${L}`, cuts: bores }));
  // ---- the carriage, one link sliding on the rail: its block, end caps, seals, wires, balls and screws
  const car = { link: `${nm} carriage` }, rs = d.sdd / 2 / Math.cos(PI / 16) + 0.02, td = d.te + 0.5;
  const hb = (x0: number) => Math.sqrt(Math.max(0, rg * rg - (x0 - cxb) ** 2)), hB = hb(xw);
  const ret = [circle(rh, xr, yb), circle(rh, -xr, yb)], rM = Number(d.M.slice(1)) / 2 / Math.cos(PI / 16) + 0.02;
  // ---- the block: one piece along the rail (its grooves, return holes), its four holes tapped from the top and the seal
  // screws' tapped into its ends (drawn at their major diameter)
  const block: [number, number][] = [[-d.W / 2, d.H1], [-xw, d.H1], [-xw, yb - hB], ...groove(cxb, -1, xw).map(([x, y]) => [-x, y] as [number, number]), [-xw, yb + hB], [-xw, d.HR + d.gt], [xw, d.HR + d.gt], [xw, yb + hB], ...[...groove(cxb, -1, xw)].reverse(), [xw, yb - hB], [xw, d.H1], [d.W / 2, d.H1], [d.W / 2, d.H], [-d.W / 2, d.H]];
  const taps: Cut[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => ({ r: rM * mm, depth: d.Ml * mm, at: [((sx! * d.B) / 2) * mm, d.H * mm, ((sz! * d.blk.C) / 2) * mm] as V3, dir: [0, -1, 0] as V3, n: 16 }));
  const ends: Cut[] = [1, -1].flatMap((s) => [1, -1].map((sx) => ({ r: rs * mm, depth: td * mm, at: [sx * d.xs * mm, d.ys * mm, ((s * L1) / 2) * mm] as V3, dir: [0, 0, -s] as V3, n: 16 })));
  out.push(P(`${nm} carriage`, section(block, ret, L1), { ...steel, ...car, item: `mgn${d.size}${d.t.toLowerCase()}-block`, cuts: [...taps, ...ends], travel: { slide: { dir: [0, 0, 1], from: (-d.travel / 2) * mm, to: (d.travel / 2) * mm } }, iface: [{ kind: 'mount', role: 'provides', says: `its four ${d.M} holes carry what rides on it` }] }));
  // (an end cap: the block's outline less 0.2 mm, the slot round the rail, a channel each side at the balls' height out past
  // the return row where the balls turn round, the screws' holes; MGN15's a port for its grease nipple)
  const Wc = d.W / 2 - 0.2, Hc = d.H - 0.3, xo = xr + rh, yn = (d.HR + d.gt + Hc) / 2;
  const cap: [number, number][] = [[-Wc, d.H1 + 0.1], [-xw, d.H1 + 0.1], [-xw, yb - rh], [-xo, yb - rh], [-xo, yb + rh], [-xw, yb + rh], [-xw, d.HR + d.gt], [xw, d.HR + d.gt], [xw, yb + rh], [xo, yb + rh], [xo, yb - rh], [xw, yb - rh], [xw, d.H1 + 0.1], [Wc, d.H1 + 0.1], [Wc, Hc], [-Wc, Hc]];
  const clear = [circle(d.sdd / 2 + 0.1, d.xs, d.ys), circle(d.sdd / 2 + 0.1, -d.xs, d.ys)], port15 = d.size === 15 ? [circle(1.55, 0, yn)] : [];
  // (a seal: a rubber wiper hugging the rail, its lip on it, on a steel plate that clears it)
  const lip = (g: number, c: number): [number, number][] => [[-Wc, d.H1 + 0.1], [-(d.WR / 2 + g), d.H1 + 0.1], [-(d.WR / 2 + g), d.HR + c], [d.WR / 2 + g, d.HR + c], [d.WR / 2 + g, d.H1 + 0.1], [Wc, d.H1 + 0.1], [Wc, Hc], [-Wc, Hc]];
  const tr = 0.65 * d.ls, tp = d.ls - tr;
  for (const s of [1, -1]) {
    const zc = s * (L1 / 2 + d.lc / 2), zr = s * (L1 / 2 + d.lc + tr / 2), zp = s * (L1 / 2 + d.lc + tr + tp / 2);
    out.push(P(`${nm} end cap`, section(cap, [...clear, ...port15], d.lc), { mat: 'pom', color: 0x1d1e20, finish: 'texture', item: `mgn${d.size}-end-cap`, ...car, at: [0, 0, zc * mm], fixed: 'screwed to its block\'s end with its seal' }));
    out.push(group(`${nm} end seal`, `mgn${d.size}-end-seal`, [P(`${nm} end seal`, section(lip(0, 0), [...clear, ...port15], tr), { mat: 'nbr', color: 0x242426, finish: 'texture', at: [0, 0, zr * mm], joint: 'slide', fixed: 'its lip wiping the rail' }), P(`${nm} end seal`, section(lip(d.gs, d.gt), [...clear, ...port15], tp), { mat: 'steel-low', color: 0xb8bcc0, finish: 'plate', at: [0, 0, zp * mm] })], car));
    for (const sx of [1, -1]) out.push({ ...use(`panhead ${d.sd}x${d.SL} PH A2`, [sx * d.xs * mm, d.ys * mm, (s * Lb) / 2 * mm], { name: `${nm} seal screw`, rot: [s * PI / 2, 0, 0], fixed: 'through its seal and cap into its block' }), ...car });
  }
  if (d.size === 15) out.push(P(`${nm} grease nipple`, lathe([[0, -3], [1.5, -3], [1.5, 0], [2, 0], [2, 2.2], [1.2, 2.2], [1.2, 3], [2, 3.4], [2, 4.1], [0, 4.5]]), { mat: 'brass', color: 0xc8c2b0, finish: 'plate', item: 'grease-nipple-m3', ...car, rot: [PI / 2, 0, 0], at: [0, yn * mm, (Lb / 2) * mm], fixed: 'screwed into its end cap' }));
  // (the retaining wires under the load rows, held in the end caps)
  for (const sx of [1, -1]) out.push(P(`${nm} retaining wire`, { cyl: [d.rw * mm, (L1 + 2 * d.lc - 0.2) * mm] }, { mat: 'stainless-304', color: 0xbfc3c6, finish: 'brushed', item: `mgn${d.size}-retainer`, ...car, rot: [PI / 2, 0, 0], at: [sx * xb * mm, d.yw * mm, 0], fixed: 'its ends in the end caps' }));
  // (the balls round each circuit: a load row between the grooves, out half a ball into the cap, turned round on rt to the
  // return row in its hole, and back)
  const run = d.run, A = L1 + 2 * d.e0, half = PI * d.rt, xm = (xb + xr) / 2;
  const at = (q: number): [number, number] => { if (q < A) return [xb, -A / 2 + q]; q -= A; if (q < half) { const th = q / d.rt; return [xm - d.rt * Math.cos(th), A / 2 + d.rt * Math.sin(th)]; } q -= half; if (q < A) return [xr, A / 2 - q]; q -= A; const th = q / d.rt; return [xm + d.rt * Math.cos(th), -A / 2 - d.rt * Math.sin(th)]; };
  for (const sx of [1, -1]) for (let k = 0; k < d.n; k++) { const [x, z] = at(((k + 0.5) * run) / d.n); out.push(P(`${nm} ball`, { sphere: (Db / 2) * mm }, { at: [sx * x * mm, yb * mm, z * mm], mat: 'stainless-440c', color: 0xd5d8db, finish: 'brushed', item: `steel-ball-${Db}`, ...car, joint: 'slide', fixed: 'rolling in the grooves of the rail and the block, round through the end caps' })); }
  return out;
}

/** A GT2 pulley, mm (src/nexus/families.ts gt2Dims), its axis y: its hub at the bottom, a flange, its teeth, a flange. */
/** A GT2 face's outline, world x, z: its outside circle with a groove each pitch, round-bottomed, 0.75 mm deep and 1.15
 *  mm across at the top. */
function gt2Teeth(Ro: number, teeth: number): [number, number][] {
  const out: [number, number][] = [], hg = 0.575 / Ro, phi = (2 * PI) / teeth;
  for (let k = 0; k < teeth; k++) { const a = k * phi; for (let i = 0; i <= 6; i++) { const u = -1 + i / 3; out.push(polar(Ro - 0.75 * Math.cos((u * PI) / 2), a + u * hg)); } out.push(polar(Ro, a + phi / 2)); }
  return out;
}
/** A GT2 idler, mm (src/nexus/kinds/motion.ts idlerDims): along y from its first flange, its two bearings side by side
 *  in its bore. */
function idlerParts(p: Record<string, string | number>, nm: string): Part[] {
  const d = idlerDims(p), al = { mat: 'al-6061', color: 0xc9ced3, finish: 'brushed' }, rB = d.bD / 2, y1 = d.fl, y2 = y1 + d.face, y3 = y2 + d.fl;
  const ringP = (r: number, a: number, b: number) => lathe([[rB, a], [r, a], [r, b], [rB, b], [rB, a]]);
  const out: Part[] = [P(nm, ringP(d.Rf, 0, y1), al), p.face === 'smooth' ? P(nm, ringP(d.Ro, y1, y2), al) : slab(nm, gt2Teeth(d.Ro, d.t), [hole(rB, 0, 0, 32)], y1, y2, al), P(nm, ringP(d.Rf, y2, y3), al)];
  for (const s2 of [-1, 1]) out.push(use(`bearing ${d.bearing}`, [0, (y3 / 2 + (s2 * d.bB) / 2) * mm, 0], { name: `${nm} bearing`, fixed: 'pressed into its bore beside the other' }));
  return out;
}
/** A heat-set insert, mm: along y from its tapered lead-in, its two knurled bands and its waist, bored at its thread's
 *  root. */
function insertParts(p: Record<string, string | number>, nm: string): Part[] {
  const t = String(p.thread), d = Number(t.slice(1)), L = Number(p.length), R = (1.6 * d) / 2, rb = (d - 1.0825 * (METRIC[t]?.p ?? 0.5)) / 2, w = Math.min(0.3, 0.1 * d);
  return [P(nm, lathe([[rb, 0], [R - w, 0], [R - w, 0.12 * L], [R, 0.18 * L], [R, 0.4 * L], [R - w, 0.4 * L], [R - w, 0.6 * L], [R, 0.6 * L], [R, L], [rb, L], [rb, 0]]), { mat: 'brass', color: 0xc9a24a, finish: 'cast' })];
}
function pulleyParts(p: Record<string, string | number>, nm: string): Part[] {
  const d = gt2Dims(p), al = { mat: 'al-6061', color: 0xc9ced3, finish: 'brushed' }, rb = d.bore / 2, out: Part[] = [];
  const teeth = gt2Teeth(d.Ro, d.teeth), y1 = d.hubL, y2 = y1 + d.fl, y3 = y2 + d.face, y4 = y3 + d.fl, ring = (r: number, a: number, b: number) => lathe([[rb, a], [r, a], [r, b], [rb, b], [rb, a]]);
  const taps: Cut[] = d.angles.map((t) => ({ r: (d.ss / 2 / Math.cos(PI / 16) + 0.02) * mm, depth: (d.Rh - rb + 0.05) * mm, at: [d.Rh * Math.cos(t) * mm, (d.hubL / 2) * mm, d.Rh * Math.sin(t) * mm] as V3, dir: [-Math.cos(t), 0, -Math.sin(t)] as V3, n: 16 }));
  out.push(P(nm, ring(d.Rh, 0, y1), { ...al, cuts: taps }), P(nm, ring(d.Rf, y1, y2), al), slab(nm, teeth, [hole(rb, 0, 0, 32)], y2, y3, al), P(nm, ring(d.Rf, y3, y4), al));
  // (its set screws in their tapped holes, each cupped onto the shaft, its top within the hub)
  for (const t of d.angles) out.push(use(`setscrew M${d.ss}x${d.sL}`, [(rb + d.sL) * Math.cos(t) * mm, (d.hubL / 2) * mm, (rb + d.sL) * Math.sin(t) * mm], { name: `${nm} set screw`, rot: Math.abs(t) < 1e-6 ? [0, 0, -PI / 2] : [PI / 2, 0, 0], joins: [nm], fixed: 'threaded into its hub, its cup on the shaft' }));
  return out;
}

/** The stator's laminations' opening, world x, z: the bore of eight pole shoes of six teeth each (the rotor's tooth
 *  pitch, 7.2°), the slots between the poles out to the back iron. */
function statorBore(d: ReturnType<typeof stepperDims>): [number, number][] {
  const pitch = (2 * PI) / 50, wt = 0.45 * pitch, as = 2.5 * pitch + wt / 2, out: [number, number][] = [];
  const pole = (k: number, u: number, v: number): [number, number] => { const a = (k * PI) / 4; return [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)]; };
  const uc = Math.sqrt(d.Rb ** 2 - (d.wp / 2) ** 2);
  for (let k = 0; k < 8; k++) {
    const a = (k * PI) / 4; out.push(polar(d.Rs + d.hs, a - as), polar(d.Rs, a - as));
    for (let j = 0; j < 6; j++) { const cj = a + (j - 2.5) * pitch; out.push(polar(d.Rs, cj - wt / 2), polar(d.Rs, cj + wt / 2)); if (j < 5) out.push(polar(d.Rs + d.td, cj + wt / 2), polar(d.Rs + d.td, cj + pitch - wt / 2)); }
    out.push(polar(d.Rs, a + as), polar(d.Rs + d.hs, a + as), pole(k, d.Rs + d.hs, d.wp / 2), pole(k, uc, d.wp / 2));
    const da = Math.atan2(d.wp / 2, uc), a0 = a + da, a1 = a + PI / 4 - da;
    for (let i = 1; i < 6; i++) out.push(polar(d.Rb, a0 + ((a1 - a0) * i) / 6));
    out.push(pole(k + 1, uc, -d.wp / 2), pole(k + 1, d.Rs + d.hs, -d.wp / 2));
  }
  return out;
}
/** A rotor cup's outline, world x, z: fifty teeth round it, turned by `turn`. */
const rotorTeeth = (d: ReturnType<typeof stepperDims>, turn: number): [number, number][] => { const pitch = (2 * PI) / 50, wt = 0.42 * pitch, r = d.Dr / 2, out: [number, number][] = []; for (let k = 0; k < 50; k++) { const a = turn + k * pitch; out.push(polar(r, a - wt / 2), polar(r, a + wt / 2), polar(r - d.td, a + wt / 2), polar(r - d.td, a + pitch - wt / 2)); } return out; };
/** A ring cut open across +x (the rear bell's skirt, its leads' slot), world x, z: the outline round, in along the slot,
 *  round the inside, and out. */
function slotted(F: number, c: number, R: number, wg: number): [number, number][] {
  const h = F / 2, t = Math.asin(wg / 2 / R), out: [number, number][] = [[h, wg / 2], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h], [h - c, -h], [h, -h + c], [h, -wg / 2]];
  for (let i = 0; i <= 40; i++) out.push(polar(R, -t - ((2 * PI - 2 * t) * i) / 40));
  return out;
}
/** A hybrid stepper, its face at y = 0, its body down -y, its shaft out +y. */
function stepperParts(p: Record<string, string | number>, nm: string): Part[] {
  const d = stepperDims(p), { F, f, L, fb, tf, rb, P1, Bb, D, dm, hw, through, c, cb } = d, al = { mat: 'al-a380', color: 0x2a2b2e, finish: 'cast' };
  const clear = CLEAR[d.tie] ?? d.dt * 1.1;
  const tieName = `${nm} tie screw`, leads = ['A+ (black)', 'A− (green)', 'B+ (red)', 'B− (blue)'].map((x) => `${nm} lead ${x}`), passes = [tieName];
  // (a tapped hole drawn at its thread's major diameter, as the screw in it is drawn: its thread fills it)
  const body = through ? octagon(F, cb) : octagon(F, c), tapped = (x: number, z: number) => hole(Number(d.tie.slice(1)) / 2 / Math.cos(PI / 12) + 0.02, x, z, 12);
  // the front end bell: its face (the NEMA square's tapped holes, or a through frame's flange and its clearance holes), its
  // skirt round the cavity the coils' ends turn in, its hub round the front bearing's pocket, its pilot boss
  const fbell = { ...al, fixed: 'clamped to its stator by its tie screws', passes };
  const face = through ? slab(`${nm} front end bell`, octagon(F, 0.08 * F), [hole(dm / 2, 0, 0, 32), ...sq(f.holes).map(([x, z]) => hole((CLEAR[f.thread] ?? 5.5) / 2, x, z, 12))], -tf, 0, fbell)
    : slab(`${nm} front end bell`, body, [hole(dm / 2, 0, 0, 32), ...d.ties.map(([x, z]) => tapped(x, z))], -tf, 0, fbell);
  const skirtF = slab(`${nm} front end bell`, body, [hole(d.Rcav, 0, 0, 48), ...d.ties.map(([x, z]) => tapped(x, z))], -fb, -tf, fbell);
  const lip = fb - tf - Bb > 0.05, hubF = P(`${nm} front end bell`, lathe(lip ? [[D / 2, -fb], [D / 2 + hw, -fb], [D / 2 + hw, -tf], [dm / 2, -tf], [dm / 2, -fb + Bb], [D / 2, -fb + Bb], [D / 2, -fb]] : [[D / 2, -fb], [D / 2 + hw, -fb], [D / 2 + hw, -tf], [D / 2, -tf], [D / 2, -fb]]), fbell);
  const boss = P(`${nm} front end bell`, lathe([[f.shaft / 2 + 1, 0], [f.pilot / 2, 0], [f.pilot / 2, f.boss], [f.shaft / 2 + 1, f.boss], [f.shaft / 2 + 1, 0]]), fbell);
  // the stator: its stack of laminations (the bore, the slots, the tie screws' holes), a coil wound round each pole
  const yS = -L + rb, yF = -fb, mid = (yS + yF) / 2;
  const stack = slab(`${nm} stator`, through ? body : body.map(([x, z]) => [x * 0.985, z * 0.985] as [number, number]), [S(statorBore(d)), ...d.ties.map(([x, z]) => hole(clear / 2, x, z, 12))], yS, yF, { mat: 'steel-electrical', color: 0x6a6e72, finish: 'texture', fill: 0.95, item: 'lamination-stack', fixed: 'clamped between its end bells by its tie screws', passes });
  const coil = (k: number) => { const a = (k * PI) / 4, w2 = d.wp / 2 + d.g, Lz = d.r2 - d.r1, rc = (d.r1 + d.r2) / 2, hy = d.Ls / 2 + d.g, [x, z] = polar(rc, a);
    return P(`${nm} winding`, section([[-d.w, -hy - d.tc], [d.w, -hy - d.tc], [d.w, hy + d.tc], [-d.w, hy + d.tc]], [[[-w2, -hy], [w2, -hy], [w2, hy], [-w2, hy]]], Lz), { rot: [0, PI / 2 - a, 0], at: [x * mm, mid * mm, z * mm], mat: 'magnet-wire', color: 0xb4643c, finish: 'plate', fill: 0.6, item: 'winding', fixed: 'wound round a pole of its stator' }); };
  const stator = group(`${nm} stator`, 'stator-stepper', [stack, ...Array.from({ length: 8 }, (_, k) => coil(k))]);
  // the rotor: on its shaft, two toothed cups half a tooth apart either side of its magnet; the shaft in its bearings
  const rj = d.db / 2, rs = f.shaft / 2, yR0 = -L + rb - Bb, yr0 = yS + 0.5, yr1 = yF - 0.5, tm = Math.max(1, 0.1 * d.Ls), lc = (yr1 - yr0 - tm) / 2, rotor = { link: `${nm} rotor` };
  const cup = (y0: number, turn: number) => slab(`${nm} rotor cup`, rotorTeeth(d, turn), [hole(rj / Math.cos(PI / 24), 0, 0, 24)], y0, y0 + lc, { ...rotor, mat: 'steel-electrical', color: 0x7a7e82, finish: 'texture', fill: 0.95, item: 'lamination-stack', fixed: 'pressed onto its shaft' });
  const shaft = P(`${nm} shaft`, lathe(rj > rs + 1e-6 ? [[0, yR0], [rj, yR0], [rj, -fb + Bb], [rs, -fb + Bb], [rs, f.out], [0, f.out]] : [[0, yR0], [rs, yR0], [rs, f.out], [0, f.out]]), { ...rotor, mat: 'steel-alloy', color: 0xb9bdc1, finish: 'brushed', item: 'shaft-steel', joint: 'bearing', iface: [{ kind: 'shaft', role: 'provides', d: rs * 2 * mm }], fixed: 'its rotor\'s shaft, turning in its bearings\' inner rings' });
  const magnet = P(`${nm} rotor magnet`, lathe([[rj, yr0 + lc], [0.4 * d.Dr, yr0 + lc], [0.4 * d.Dr, yr0 + lc + tm], [rj, yr0 + lc + tm], [rj, yr0 + lc]]), { ...rotor, mat: 'ndfeb', color: 0xc8ccd0, finish: 'plate', item: 'magnet-ndfeb', fixed: 'bonded between the cups of its rotor on its shaft' });
  const rotorG = group(`${nm} rotor`, 'rotor-stepper', [cup(yr0, 0), magnet, cup(yr0 + lc + tm, PI / 50), shaft], rotor);
  // its bearings, each pressed into its bell's pocket and onto the shaft
  const brg = (y: number, which: string) => { const b = use(`bearing ${d.bearing}`, [0, y * mm, 0], { name: `${nm} ${which} bearing`, fixed: `pressed into the pocket of its ${which} end bell` });
    const ir = (q: Part): void => { if (/inner ring$/.test(q.name)) Object.assign(q, rotor, { fixed: 'pressed onto its shaft' }); for (const r of q.parts ?? []) ir(r); }; ir(b); return b; };
  // the rear end bell: its back (the tie screws' counterbores, or their holes), a relief behind the bearing's inner ring,
  // its skirt slotted for the leads, its hub round the rear bearing's pocket
  // (the tie screws run clear through it, their heads bearing on its skirt: nothing passes through it but its leads)
  const rbell = { ...al, fixed: 'clamped to its stator by its tie screws', passes: leads }, cbr = (d.T.dk + 0.6) / 2;
  const tieHoles = (sink: boolean) => d.ties.map(([x, z]) => hole(sink ? cbr : clear / 2, x, z, 16));
  const back = [slab(`${nm} rear end bell`, body, tieHoles(d.sunk), -L, -L + Math.min(1, P1 / 2), rbell), slab(`${nm} rear end bell`, body, [hole(dm / 2, 0, 0, 32), ...tieHoles(d.sunk)], -L + Math.min(1, P1 / 2), -L + P1, rbell)];
  const wg = 6.8, skirtR = slab(`${nm} rear end bell`, slotted(F, through ? cb : c, d.Rcav, wg), d.ties.map(([x, z]) => hole(clear / 2, x, z, 12)), -L + P1, -L + rb, rbell);
  const lipR = rb - P1 - Bb > 0.05, hubR = P(`${nm} rear end bell`, lathe(lipR ? [[dm / 2, -L + P1], [D / 2 + hw, -L + P1], [D / 2 + hw, -L + rb], [D / 2, -L + rb], [D / 2, -L + rb - Bb], [dm / 2, -L + rb - Bb], [dm / 2, -L + P1]] : [[D / 2, -L + P1], [D / 2 + hw, -L + P1], [D / 2 + hw, -L + rb], [D / 2, -L + rb], [D / 2, -L + P1]]), rbell);
  // the tie screws, from the rear, their heads in its counterbores (or on its back), their ends short of the face's holes
  const yHead = -L + (d.sunk ? P1 : 0), tieL = d.tieL;
  const screws = d.ties.map(([x, z]) => use(`screw ${d.tie}x${tieL}`, [x * mm, yHead * mm, z * mm], { rot: [PI, 0, 0], name: tieName, fixed: 'through its rear end bell and stator, threaded into its front end bell' }));
  // its leads: out of the rear bell's slot between its back and the coils' ends, along the ground 300 mm to a JST XH plug
  // (four ways, 2.5 mm pitch: a housing 12.4 × 5.75 × 9.8 mm, its contacts crimped on the leads; JST's XH, typical)
  const rw = 0.7, yL = -L + P1 + rw + 0.01, x0 = D / 2 + hw + rw + 0.05, X0 = F / 2 + 300, yc = -L + 5.75 / 2, colours = [0x1d1d1f, 0x2f8f3a, 0xc0392b, 0x2c5aa0];
  const cu = PI * 0.2025 ** 2, pvc = PI * rw * rw - cu;
  const leadParts = leads.map((ln, i) => { const zi = (i - 1.5) * 1.6, zp = (i - 1.5) * 2.5, pts: V3[] = ([[x0, yL, zi], [F / 2 + 6, yL, zi], [F / 2 + 6 + 4 * (yL + L), -L + rw, zi], [X0 - 25, -L + rw, zi], [X0 - 6, yc, zp], [X0 + 6, yc, zp]] as V3[]).map((q) => q.map((v) => v * mm) as V3);
    const tube = { r: rw * mm, pts, bend: 3 * mm }; return P(ln, { tube }, { mat: 'pvc', color: colours[i]!, item: 'wire-hookup', kg: tubeLength(tube) * (cu * 8960 + pvc * 1400) * 1e-6, fixed: 'out through the slot in its rear end bell, its end soldered to its coils (not drawn), crimped into its plug' }); });
  const plug = P(`${nm} plug`, section([[-6.2, -5.75 / 2], [6.2, -5.75 / 2], [6.2, 5.75 / 2], [-6.2, 5.75 / 2]], [0, 1, 2, 3].map((i) => [[-0.75, -0.75], [0.75, -0.75], [0.75, 0.75], [-0.75, 0.75]].map(([x, y]) => [x! - (i - 1.5) * 2.5, y!] as [number, number])), 9.8), { rot: [0, PI / 2, 0], at: [(X0 + 4.9) * mm, yc * mm, 0], mat: 'nylon', color: 0xf1ede2, finish: 'texture', item: 'connector-housing', passes: leads, fixed: 'on the ends of its leads' });
  const contacts = [0, 1, 2, 3].map((i) => P(`${nm} plug contact`, { box: [3.6 * mm, 1.1 * mm, 1.1 * mm] }, { at: [(X0 + 6 + 1.8) * mm, yc * mm, (i - 1.5) * 2.5 * mm], mat: 'brass', color: 0xd9d6cc, finish: 'plate', item: 'crimp-contact', fixed: 'crimped on its lead, clicked into its plug' }));
  return [group(`${nm} front end bell`, 'end-bell', [face, skirtF, hubF, boss]), stator, rotorG, brg(-fb + Bb / 2, 'front'), brg(-L + rb - Bb / 2, 'rear'),
    group(`${nm} rear end bell`, 'end-bell', [...back, skirtR, hubR]), ...screws, ...(p.leads === 'socket' ? socketParts() : [group(`${nm} leads and plug`, 'jst-xh', [...leadParts, plug, ...contacts])])];
  // (socketed, as a 3D printer's are: its coils' ends on a small board in its rear bell, a 6-way JST PH side-entry socket on
  // it, its mouth flush with its side where the leads would come out; the board 1.6 mm, as wide as the socket and 8 mm
  // deep (typical); the bell's opening for it not cut)
  function socketParts(): Part[] {
    const yc = -L + Math.max(2.6, rb / 2), xs = F / 2 - 4.5 / 2, nyl = { mat: 'nylon', color: 0xf1ede2, finish: 'texture' as const };
    const board = P(`${nm} socket board`, { box: [8 * mm, 1.6 * mm, 15 * mm] }, { mat: 'fr4', color: 0x1f5a2a, item: 'pcb-bare', at: [(F / 2 - 4.5 - 4) * mm, (yc - 2.4 - 0.8) * mm, 0], fixed: 'held in its rear end bell, its coils\' ends soldered to it' });
    const housing = P(`${nm} socket housing`, { box: [4.5 * mm, 4.8 * mm, 13.9 * mm] }, { ...nyl, item: 'ph-housing', at: [xs * mm, yc * mm, 0] });
    const pins = Array.from({ length: 6 }, (_, i) => P(`${nm} socket pin ${i + 1}`, { box: [6 * mm, 0.5 * mm, 0.5 * mm] }, { mat: 'brass', color: 0xd9d6cc, finish: 'plate', item: 'ph-pin', at: [(F / 2 - 3) * mm, yc * mm, (i - 2.5) * 2 * mm] }));
    return [board, group(`${nm} socket`, 'jst-ph-6-side', [housing, ...pins])];
  }
}

/** What a part's inventory says is in it that is not drawn in it: for each thing it is made of (not its materials), as
 *  many pieces drawn in it filed under that thing (or a size of it: "screw-m3" is any M3 screw, "bearing-625" a 625 of
 *  any seal), and so on in each of those, all the way down. Empty when it is whole. */
export function missingIn(p: Part, it: Item | null | undefined = p.item ? itemOf(p.item) ?? keptByItem.get(p.item) ?? null : null, where = p.name): string[] {
  const out: string[] = [], is = (got: string, want: string) => got === want || (got.startsWith(want) && !/\d/.test(got[want.length] ?? ''));
  if (it) {
    const found = (q: Part, want: string): number => (q.item && is(q.item, want) ? 1 : (q.parts ?? []).reduce((a, r) => a + found(r, want), 0));
    for (const c of it.of) { const ci = itemOf(c.id); if (ci && (ci.kind === 'material' || ci.kind === 'element')) continue; if (!ci && DENSITY_KNOWN.has(c.id)) continue;
      const got = (p.parts ?? []).reduce((a, r) => a + found(r, c.id), 0); if (got < c.n) out.push(`${where}: ${c.n - got} of ${c.n} ${ci?.name ?? c.id} not drawn in it`); }
  }
  for (const q of p.parts ?? []) out.push(...missingIn(q, undefined, q.name));
  return out;
}

// ---- the library: made once, kept, used by every build ----------------------------------------------------------------
const kept = new Map<string, Component | string>();
/** Each component made, by its item's id: one drawing of each part, however it was asked for. */
const byItem = new Map<string, Component>();
/** Each made component by its item's id, so what is in a drawn part can be found where the inventory has no entry for its size. */
const keptByItem = new Map<string, Item>();
/** Materials the drawing knows by density, though the inventory may not list them. */
const DENSITY_KNOWN = new Set(Object.keys(DENSITY));
/** The families drawn here (every size each family makes). */
export const DESIGNED = Object.keys(DESIGNS);
/** A component by its words ("bolt M8x30", "angle 40x4 steel 1000mm"), designed the first time it is asked for and kept;
 *  or why it cannot be (not a part, or not yet drawn). */
export function component(words: string): Component | string {
  const k = words.trim().toLowerCase(); const was = kept.get(k); if (was) return was;
  const r = callFamily(words); let out: Component | string;
  if (!r || typeof r === 'string') out = r ?? `"${words}" is not a part any family makes.`;
  else if (!r.sized || !DESIGNS[r.sized.family]) out = `${r.name} is known (${r.path.join(' / ')}) but not drawn yet: its family has no design.`;
  else out = byItem.get(r.id) ?? designed(r, words);
  kept.set(k, out); return out;
}
/** The component an item is drawn as, by its id (an item made to sizes by a family the library draws, in the inventory or
 *  drawn inside another component), or null: so what the inventory lists, and what is inside a drawn part, opens as drawn. */
export function componentOf(id: string): Component | null {
  const was = byItem.get(id); if (was) return was;
  const r = itemOf(id) ?? keptByItem.get(id); return r?.sized && DESIGNS[r.sized.family] ? designed(r, r.name) : null;
}
function designed(r: Item, words: string): Component {
  // (drawn under its name up to its first comma, the thing it is ("M8 × 30 hex bolt"), so what is said of it by name
  // reads its head noun; its class and its make in what it says)
  const d = DESIGNS[r.sized!.family]!, base = r.name.split(',')[0]!.trim() + (/nylon lock/.test(r.name) ? ' (nylon lock)' : ''), parts = d.make(r.sized!.params, { ...r, name: base }), part: Part = { name: base, at: [0, 0, 0], item: r.id, sealed: 'designed whole from its standard in the component library', says: `${r.name}: ${d.says} (${r.path.join(' / ')})`, parts, ...(d.iface ? { iface: d.iface(r.sized!.params) } : {}), ...(d.ports ? { ports: d.ports(r.sized!.params) } : {}) };
  keptByItem.set(r.id, r);
  const g = massOf(part) * 1000, ratio = r.g ? g / r.g : 1, faults: string[] = [...missingIn(part, r)];
  // (a part a family weighs to a hundredth of a gram is not faulted for its rounding)
  if (r.g && Math.abs(ratio - 1) > 0.2 && Math.abs(g - r.g) > 0.01) faults.push(`drawn ${g.toFixed(2)} g against ${r.g.toFixed(2)} g from its standard (${((ratio - 1) * 100).toFixed(0)} %)`);
  const out: Component = { words, item: r, part, path: r.path, mass: ratio, leaves: d.leaves, faults };
  byItem.set(r.id, out); return out;
}
/** A copy of a component to place in a build: its root at `at`, turned by `rot`, with anything else said of it (a name
 *  in this build, how it is fixed here, what passes through it). Throws where the words are not a drawn part, so a build
 *  never silently draws a stand-in. */
export function use(words: string, at: V3 = [0, 0, 0], more: Partial<Part> = {}): Part {
  const c = component(words); if (typeof c === 'string') throw new Error(c);
  const p: Part = { ...structuredClone(c.part), at, ...more };
  // (named here, its pieces under that name too, so what is said of it by name, an opening it passes through, finds them;
  // a piece of its own, a lock nut's ring, keeps its own)
  // (and what is said of it here, how it is fixed, what passes through it, what it is joined to, its link and joint, is
  // said of each of its pieces, which are what is drawn and met)
  // (and a piece of its own under its name, "… inner ring", is named after it here: "front bearing inner ring")
  const said = (['fixed', 'passes', 'joins', 'link', 'joint', 'movesWith'] as const).filter((k) => more[k] !== undefined), base = c.part.name;
  const walk = (q: Part): void => { if (q.name === base) { for (const k of said) (q as unknown as Record<string, unknown>)[k] = structuredClone(more[k]); if (more.name) q.name = more.name; } else if (more.name && q.name.startsWith(`${base} `)) q.name = more.name + q.name.slice(base.length); for (const r of q.parts ?? []) walk(r); };
  for (const q of p.parts ?? []) walk(q);
  return p;
}
/** The words that call a drawn part: its family's id or the thing it is ("bolt", "hex nut", "flat bar", "I-beam"),
 *  with its size said after it ("a pipe organ" is not a pipe; "pipe 1in 1m" is). */
export const partWords = (): RegExp => new RegExp(`\\b(${[...DESIGNED, 'bolted joint', 'hex bolt', 'cap screw', 'hex nut', 'lock nut', 'flat bar', 'square bar', 'hex bar', 'round bar', 'box section', 'i-beam', 't-slot'].map((w) => w.replace(/[-]/g, '\\-')).join('|')})\\b(?=[^.]*\\d)`, 'i');
/** A family's first example, as its family writes it ("bolt M8x30"). */
export const exampleOf = (family: string): string => FAMILIES.find((f) => f.id === family)?.examples[0] ?? 'bolt M8x30';
/** Every component made so far, by category: the saved library. */
export function library(): Map<string, Component[]> { const m = new Map<string, Component[]>(); for (const c of byItem.values()) { const k = c.path.join(' / '); (m.get(k) ?? m.set(k, []).get(k)!).push(c); } return m; }

// ---- assemblies of components -----------------------------------------------------------------------------------------
/** The ISO preferred lengths a bolt is sold in, mm. */
const LENGTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200];
/** A bolted joint through a grip (mm, the plies' total): a hex bolt with a washer under its head and under its nut, the
 *  bolt the shortest the standard sells that leaves two pitches past the nut (the least engagement of a full nut, typical
 *  practice), each piece the saved component, laid along -y from the head's washer at y = 0. */
export function boltedJoint(thread: string, grip: number, o: { class?: string; lock?: boolean; name?: string } = {}): Part {
  const T = METRIC[thread]; if (!T) throw new Error(`no thread ${thread}`);
  const need = grip + 2 * T.h + T.m * (o.lock ? 1.25 : 1) + 2 * T.p, L = LENGTHS.find((x) => x >= need) ?? Math.ceil(need);
  const bolt = `bolt ${thread}x${L}${o.class ? ` ${o.class}` : ''}`, name = o.name ?? `${thread} bolted joint`, bName = (component(bolt) as Component).part.name, nut = `nut ${thread}${o.lock ? ' lock' : ''}`;
  return { name, at: [0, 0, 0], says: `${name}: an ${bName} through ${grip} mm of grip, a washer under its head and under its nut (ISO 7089), the nut ISO 4032; the bolt the shortest sold leaving two pitches past its nut`, parts: [
    use(`washer ${thread}`, [0, -T.h * mm, 0], { name: `${thread} washer under the head`, passes: [bName], fixed: 'under its bolt\'s head' }),
    use(bolt, [0, 0, 0], { fixed: 'through its plies, its nut torqued' }),
    use(`washer ${thread}`, [0, -(T.h + grip + T.h) * mm, 0], { name: `${thread} washer under the nut`, passes: [bName], fixed: 'under its nut' }),
    use(nut, [0, -(T.h + grip + T.h) * mm, 0], { rot: [PI, 0, 0], passes: [bName], fixed: `run onto its bolt and torqued` }),
  ] };
}
