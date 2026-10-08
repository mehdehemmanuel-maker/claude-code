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
import { HEX_K, IPE, METRIC, NPS40 } from './families';
import { SOCKET_HEAD } from './embody/stock';
import { UPN } from './kinds/stock';
import { WHEEL } from './kinds/fasteners';
import { itemOf, type Item } from './inventory';
import type { Iface, Part, V3 } from './kits';
import { massOf } from './mass';

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

const DESIGNS: Record<string, { says: string; leaves: string; make: Design; iface?: (p: Record<string, string | number>) => Iface[] }> = {
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
  nut: {
    says: 'ISO 4032 (ISO 10511 with its nylon ring): a hex s across flats and m high, chamfered 30° both faces, bored at the thread\'s root', leaves: 'its thread drawn as its root cylinder',
    make: (p, it) => { const { T, d, P: P0 } = thr(p), lock = p.lock === 'yes', e = T.s / Math.cos(PI / 6), r1 = (d - 1.0825 * P0) / 2, m = lock ? T.m * 0.72 : T.m, mat = matIn(it), lk = looks(it, mat);
      const out = [P(it.name, lathe([[r1, 0], [0.88 * (e / 2), 0], [e / 2, 0.12 * m], [e / 2, m - 0.12 * m], [0.88 * (e / 2), m], [r1, m], [r1, 0]]), { mat, ...lk, facets: 6, fill: nutFill(T.s, d, P0) })];
      // (a lock nut's ring of nylon in its collar over the hex, the ring's bore a little under the thread, so it grips it)
      if (lock) { const hN = (it.size?.[2] ?? T.m * 1.25) - m; out.push(P(`${it.name} ring`, lathe([[r1, m], [0.9 * (T.s / 2), m], [0.85 * (T.s / 2), m + hN], [r1, m + hN], [r1, m]]), { mat: 'nylon', color: 0xe8e4d4, finish: 'texture', fixed: 'held in its nut\'s crimped collar' })); }
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
        P(`${it.name} mandrel`, lathe([[0, -L - 1], [dm / 2 * 1.2, -L - 1], [0.25 * d, -L], [0.25 * d, 25], [0, 25]]), { mat: 'steel-low', color: 0xa0a4a8, finish: 'plate', fixed: 'drawn through its rivet\'s body, its head under the rivet\'s far end' })]; },
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

// ---- the library: made once, kept, used by every build ----------------------------------------------------------------
const kept = new Map<string, Component | string>();
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
    const d = DESIGNS[r.sized.family]!, base = r.name.split(',')[0]!.trim() + (/nylon lock/.test(r.name) ? ' (nylon lock)' : ''), parts = d.make(r.sized.params, { ...r, name: base }), part: Part = { name: base, at: [0, 0, 0], item: r.id, says: `${r.name}: ${d.says} (${r.path.join(' / ')})`, parts, ...(d.iface ? { iface: d.iface(r.sized.params) } : {}) };
    const g = massOf(part) * 1000, ratio = r.g ? g / r.g : 1, faults: string[] = [];
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
  const said = (['fixed', 'passes', 'joins', 'link', 'joint', 'movesWith'] as const).filter((k) => more[k] !== undefined);
  for (const q of p.parts ?? []) if (q.name === c.part.name) { if (more.name) q.name = more.name; for (const k of said) (q as unknown as Record<string, unknown>)[k] = structuredClone(more[k]); }
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
