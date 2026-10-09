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

import { FAMILIES, callFamily } from './families';
import { BEARINGS, HEX_K, IPE, METRIC, NEMA, NEMA_FACE, NPS40, ballsOf, mgnDims, stepperDims } from './families';
import { tubeLength } from './form';
import { CLEAR } from './kinds/motion';
import { SOCKET_HEAD } from './embody/stock';
import { PAN } from './threads';
import { UPN } from './kinds/stock';
import { WHEEL } from './kinds/fasteners';
import { itemOf, type Item } from './inventory';
import type { Iface, Part, Port, V3 } from './kits';
import { DENSITY, massOf } from './mass';

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

/** A port on a part, its pattern in metres (src/nexus/kits.ts Port). */
const port = (name: string, sex: Port['sex'], thread: string, pattern: [number, number][], at: V3, n: V3, u: V3, t: number, more: Partial<Port> = {}): Port => ({ name, sex, thread, pattern, at, n, u, t, ...more });
const sq = (side: number): [number, number][] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [(x! * side) / 2, (y! * side) / 2] as [number, number]);
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
  rail: {
    says: 'a HIWIN MGN miniature guideway: its ground rail, a groove down each side and its holes counterbored; its carriage\'s ground block, a groove facing each of the rail\'s with a return hole beside it and four tapped holes on top; its two circuits of balls, a load row between the grooves and a return row in the hole, turned round through channels in the moulded end cap at each end; a retaining wire under each load row; a rubber seal on a steel plate at each end, its lip on the rail, held with the cap by two screws',
    leaves: 'its sizes HIWIN\'s, its balls rebuilders\' counts (MGN9, 12) or scaled (MGN7, 15), and its inner proportions typical (mgnDims names each); its grooves drawn as one arc each (not the two of a gothic arch), its end caps\' turnarounds as a straight channel through the cap, its seals\' lips square to the rail (not following its grooves); the steel\'s edges drawn square and the rail holes\' plugs not drawn; drawn in pieces where it is cut two ways (its rail in layers, its block\'s top on its body), a fine seam can show where they meet',
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
    says: 'ISO 4762: a round head dk across and k high, its hex socket, threaded for 2d + 12 mm (or its whole length when shorter)', leaves: 'the socket drawn round at its key\'s corners; the thread its major cylinder',
    make: (p, it) => { const { t, d, P: P0, T } = thr(p), L = Number(p.length), mat = matIn(it), lk = looks(it, mat), at = { mat, ...lk }, sk = SOCKET_HEAD[t.replace('.', '_')]?.s ?? 0.75 * d * mm, rs = (sk / mm) / Math.sqrt(3), dep = 0.55 * T.k, ch = 0.08 * T.k, b = 2 * d + 12;
      return [P(it.name, lathe([[0, 0], [T.dk / 2, 0], [T.dk / 2, T.k - ch], [T.dk / 2 - ch, T.k], [rs, T.k], [rs, T.k - dep], [0, T.k - dep]]), at), ...shank(it.name, d, P0, L, Math.max(0, L - b), at)]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: thr(p).d * mm, n: 1 }],
  },
  panhead: {
    says: 'ISO 7045: a pan head dk across and k high, its top rounded down to its rim, a cross recess in it, threaded to its head', leaves: 'its cross recess drawn as a cone 0.55 of the head across; the thread its major cylinder',
    make: (p, it) => { const { t, d, P: P0 } = thr(p), L = Number(p.L), mat = matIn(it), at = { mat, ...looks(it, mat) }, { dk, k } = PAN[t]!, rr = 0.275 * dk, dep = 0.6 * k;
      // (the head: its side straight for 0.45 of its height, then its top rounding in to a flat 0.55 of it across)
      return [P(it.name, lathe([[0, 0], [dk / 2, 0], [dk / 2, 0.45 * k], [0.44 * dk, 0.8 * k], [0.36 * dk, 0.96 * k], [rr, k], [0, k - dep]]), at), ...shank(it.name, d, P0, L, 0, at)]; },
    iface: (p) => [{ kind: 'studs', role: 'provides', d: thr(p).d * mm, n: 1 }],
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
};
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
function bearingParts(p: Record<string, string | number>, nm: string): Part[] {
  const n = String(p.number), [d, D, B] = BEARINGS[n]!, { Db, dm, z } = ballsOf(d, D), seal = String(p.seal), shut = seal !== 'open';
  // (a radial internal clearance of 10 µm, CN-class, typical: half of it at each raceway)
  const cl = 0.005, rg = 0.52 * Db, sh = 0.22 * Db, ri = dm / 2 - Db / 2 - cl, ro = dm / 2 + Db / 2 + cl, Ri = ri + sh, Ro = ro - sh, ch = Math.max(0.1, Math.min(0.5, 0.03 * D));
  const phi0 = Math.acos(1 - sh / rg), yg = rg * Math.sin(phi0);
  // (a raceway's groove: an arc of its radius rg, from shoulder to shoulder)
  const groove = (r0: number, s: number, a0: number, a1: number) => Array.from({ length: 13 }, (_, k) => { const f = a0 + ((a1 - a0) * k) / 12; return [r0 + s * (rg - rg * Math.cos(f)), rg * Math.sin(f)] as [number, number]; });
  // (its cage's halves beside the balls, its shields outside them in recesses in the outer ring's bore)
  const tc = Math.max(0.15, 0.06 * Db), y0 = Db / 2 + 0.03 * Db, ys = y0 + tc + 0.04 * Db, ts = Math.min((seal === '2RS' ? 2 : 1) * (0.02 * D + 0.05), B / 2 - 0.05 - ys), Rr = shut ? Ro + 0.4 * (D / 2 - Ro) : Ro;
  const ring = { mat: 'steel-chrome', color: 0xb9bdc1, finish: 'brushed' };
  const outer: [number, number][] = [[Rr, -B / 2], [D / 2 - ch, -B / 2], [D / 2, -B / 2 + ch], [D / 2, B / 2 - ch], [D / 2 - ch, B / 2], [Rr, B / 2], ...(shut ? [[Rr, ys], [Ro, ys]] as [number, number][] : []), [Ro, yg], ...groove(ro, -1, phi0, -phi0), [Ro, -yg], ...(shut ? [[Ro, -ys], [Rr, -ys]] as [number, number][] : []), [Rr, -B / 2]];
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
 *  carriage at the middle of its travel. A part cut across two ways is drawn in pieces of one name: the rail's middle
 *  as layers across it with its holes, its sides along it with their grooves; the block's body along it with its grooves
 *  and return holes, its top across it with its tapped holes. */
function railParts(p: Record<string, string | number>, nm: string): Part[] {
  const d = mgnDims(p), { L, Db, rg, cl, yb, xb, xw, xr, rh } = d, L1 = d.blk.L1, Lb = d.blk.L, steel = { mat: 'stainless-440c', color: 0xc9cdd0, finish: 'ground' };
  // (a groove: an arc of rg about its centre cx, facing out (s = 1, the rail's) or in (s = -1, the block's), from where it
  // leaves the face at x0 to where it meets it again)
  const groove = (cx: number, s: 1 | -1, x0: number): [number, number][] => { const f = Math.acos(Math.min(1, Math.abs(x0 - cx) / rg)); return Array.from({ length: 11 }, (_, k) => { const q = -f + (2 * f * k) / 10; return [cx - s * rg * Math.cos(q), yb + rg * Math.sin(q)] as [number, number]; }); };
  const cxr = xb - Db / 2 - cl + rg, cxb = xb + Db / 2 + cl - rg, out: Part[] = [];
  // ---- the rail: in layers across it with its holes (through below its counterbores, counterbored above), full width
  // over and under its grooves; in the band of its grooves, its middle in those layers and its sides along it with them
  // (so its top and its foot are each one face: where the pieces meet is in its grooves' edges)
  const zs = Array.from({ length: d.nh }, (_, k) => -L / 2 + d.E1 + k * d.P), hr = rg * Math.sin(Math.acos(Math.min(1, (cxr - d.WR / 2) / rg)));
  const y1 = yb - hr - 0.05, y2 = yb + hr + 0.05, yc = d.HR - d.h, plan = (w: number): [number, number][] => [[-w, -L / 2], [w, -L / 2], [w, L / 2], [-w, L / 2]];
  const layers = (w: number, a0: number, a1: number): Part[] => [[a0, Math.min(a1, yc), d.d], [Math.max(a0, yc), a1, d.D]].filter(([u, v]) => v! > u! + 1e-6).map(([u, v, dia]) => slab(nm, plan(w), zs.map((z) => hole(dia! / 2, 0, z)), u!, v!, steel));
  const side = (sx: 1 | -1): Part => {
    const pts: [number, number][] = [[d.a, y1], [d.WR / 2, y1], ...[...groove(cxr, 1, d.WR / 2)].reverse().map(([x, y]) => [x, 2 * yb - y] as [number, number]), [d.WR / 2, y2], [d.a, y2]];
    return P(nm, section(sx > 0 ? pts : pts.map(([x, y]) => [-x, y] as [number, number]).reverse(), [], L), steel);
  };
  out.push(group(nm, `mgn${d.size}-rail-${L}`, [...layers(d.WR / 2, 0, y1), ...layers(d.a, y1, y2), side(1), side(-1), ...layers(d.WR / 2, y2, d.HR)]));
  // ---- the carriage, one link sliding on the rail: its block, end caps, seals, wires, balls and screws
  const car = { link: `${nm} carriage` }, rs = d.sdd / 2 / Math.cos(PI / 16) + 0.02, td = d.te + 0.5;
  const hb = (x0: number) => Math.sqrt(Math.max(0, rg * rg - (x0 - cxb) ** 2)), hB = hb(xw);
  const body: [number, number][] = [[-d.W / 2, d.H1], [-xw, d.H1], [-xw, yb - hB], ...groove(cxb, -1, xw).map(([x, y]) => [-x, y] as [number, number]), [-xw, yb + hB], [-xw, d.HR + d.gt], [xw, d.HR + d.gt], [xw, yb + hB], ...[...groove(cxb, -1, xw)].reverse(), [xw, yb - hB], [xw, d.H1], [d.W / 2, d.H1], [d.W / 2, d.Ht], [-d.W / 2, d.Ht]];
  const ret = [circle(rh, xr, yb), circle(rh, -xr, yb)], tapped = [circle(rs, d.xs, d.ys), circle(rs, -d.xs, d.ys)];
  const seg = (z0: number, z1: number, holes: [number, number][][]) => P(`${nm} carriage`, section(body, holes, z1 - z0), { ...steel, ...car, at: [0, 0, ((z0 + z1) / 2) * mm] });
  const rM = Number(d.M.slice(1)) / 2 / Math.cos(PI / 16) + 0.02, top: [number, number][] = [[-d.W / 2, -L1 / 2], [d.W / 2, -L1 / 2], [d.W / 2, L1 / 2], [-d.W / 2, L1 / 2]];
  out.push(group(`${nm} carriage`, `mgn${d.size}${d.t.toLowerCase()}-block`, [seg(-L1 / 2, -L1 / 2 + td, [...ret, ...tapped]), seg(-L1 / 2 + td, L1 / 2 - td, ret), seg(L1 / 2 - td, L1 / 2, [...ret, ...tapped]),
    slab(`${nm} carriage`, top, [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => hole(rM, (sx! * d.B) / 2, (sz! * d.blk.C) / 2)), d.Ht, d.H, { ...steel, ...car, iface: [{ kind: 'mount', role: 'provides', says: `its four ${d.M} holes carry what rides on it` }] })], car));
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
    group(`${nm} rear end bell`, 'end-bell', [...back, skirtR, hubR]), ...screws, group(`${nm} leads and plug`, 'jst-xh', [...leadParts, plug, ...contacts])];
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
  else {
    // (drawn under its name up to its first comma, the thing it is ("M8 × 30 hex bolt"), so what is said of it by name
    // reads its head noun; its class and its make in what it says)
    const d = DESIGNS[r.sized.family]!, base = r.name.split(',')[0]!.trim() + (/nylon lock/.test(r.name) ? ' (nylon lock)' : ''), parts = d.make(r.sized.params, { ...r, name: base }), part: Part = { name: base, at: [0, 0, 0], item: r.id, sealed: 'designed whole from its standard in the component library', says: `${r.name}: ${d.says} (${r.path.join(' / ')})`, parts, ...(d.iface ? { iface: d.iface(r.sized.params) } : {}), ...(d.ports ? { ports: d.ports(r.sized.params) } : {}) };
    keptByItem.set(r.id, r);
    const g = massOf(part) * 1000, ratio = r.g ? g / r.g : 1, faults: string[] = [...missingIn(part, r)];
    // (a part a family weighs to a hundredth of a gram is not faulted for its rounding)
    if (r.g && Math.abs(ratio - 1) > 0.2 && Math.abs(g - r.g) > 0.01) faults.push(`drawn ${g.toFixed(2)} g against ${r.g.toFixed(2)} g from its standard (${((ratio - 1) * 100).toFixed(0)} %)`);
    out = { words, item: r, part, path: r.path, mass: ratio, leaves: d.leaves, faults };
  }
  kept.set(k, out); return out;
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
export function library(): Map<string, Component[]> { const m = new Map<string, Component[]>(); for (const c of kept.values()) if (typeof c !== 'string') { const k = c.path.join(' / '); (m.get(k) ?? m.set(k, []).get(k)!).push(c); } return m; }

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
