// The interface record (spec 01, tasks I1 and I2; decisions 0004 and 0014): what a part offers, or asks of, what it meets.
// Read here, never written: each port (holes, threads, pins, a frame) and each old interface (`iface`: a shaft and its
// bore, studs and their nuts, a drive, a chain, a mount) of every part in a thing becomes one record, with an id that says
// where it is (the names from the thing asked down to the part that carries it, then its own name) and a frame, where
// one is known, in the thing's own frame. No part is changed. A name repeated among siblings is told apart by where the
// sibling stands; one still alike is reported as a clash, never numbered. The negatives (the hole a bolt needs, its
// counterbore) and the standards' tables they read come next (I3 onward); mating by interfaces is mate.ts's.

import * as THREE from 'three';
import type { Iface, Part, Port, Shape, V3 } from './kits';
import { isAssembly, matrixOf, type Assembly } from './assembly';
import { matterOf } from './matter';
import { METRIC } from './threads';
import { NEMA_FACE } from './kinds/motion';

export type InterfaceKind = 'holes' | 'threads' | 'pins' | 'frame' | 'shaft' | 'bore' | 'thread.external' | 'thread.internal' | 'drive' | 'chain' | 'face';
export interface Interface {
  /** where it is: the names from the thing asked down to its part, then its own name ("frame/left motor/mount face") */ id: string;
  name: string; kind: InterfaceKind;
  /** its sizes, SI (a thread's name as a text: "M8") */ size: Record<string, number | string>;
  std?: string;
  /** where it sits and faces, in the thing asked's frame; null where nothing says */ frame: { at: V3; n: V3; u: V3 } | null;
  /** what it was read from: a port by its name, or an old interface by its kind and role */ from: { port: string } | { iface: Iface['kind']; role: Iface['role'] };
  /** the kinds it meets */ mates: InterfaceKind[];
  /** the joint its part makes where it meets (a bearing turns, a slide slides) */ joint?: string;
  to?: string; says?: string;
}

const PORT_KIND: Record<Port['sex'], { kind: InterfaceKind; mates: InterfaceKind[] }> = {
  holes: { kind: 'holes', mates: ['holes', 'threads', 'pins', 'thread.external'] }, threads: { kind: 'threads', mates: ['holes', 'thread.external'] },
  pins: { kind: 'pins', mates: ['holes'] }, frame: { kind: 'frame', mates: ['frame'] },
};
/** Old interfaces, one for one: a shaft provided is a shaft, one required a bore; studs provided are an external thread,
 *  required an internal one (every one today a nut's); a drive and a chain meet their own kind; a mount is a face. */
const IFACE_KIND: Record<`${Iface['kind']}.${Iface['role']}`, { kind: InterfaceKind; name: string; mates: InterfaceKind[] }> = {
  'shaft.provides': { kind: 'shaft', name: 'shaft', mates: ['bore'] }, 'shaft.requires': { kind: 'bore', name: 'bore', mates: ['shaft'] },
  'studs.provides': { kind: 'thread.external', name: 'thread', mates: ['thread.internal', 'threads', 'holes'] }, 'studs.requires': { kind: 'thread.internal', name: 'thread', mates: ['thread.external'] },
  'drive.provides': { kind: 'drive', name: 'drive', mates: ['drive'] }, 'drive.requires': { kind: 'drive', name: 'driven', mates: ['drive'] },
  'chain.provides': { kind: 'chain', name: 'chain', mates: ['chain'] }, 'chain.requires': { kind: 'chain', name: 'chain', mates: ['chain'] },
  'mount.provides': { kind: 'face', name: 'mount', mates: ['face'] }, 'mount.requires': { kind: 'face', name: 'mount', mates: ['face'] },
};

/** A part's own placing in its holder's frame: where it stands and how it is turned (as every view draws it). */
export const matrixOfPart = (p: Part): THREE.Matrix4 => new THREE.Matrix4().compose(new THREE.Vector3(...(p.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
const v = (a: V3) => new THREE.Vector3(...a);

// ---- round faces (moved here from mate.ts, unchanged: what a part offers is read here; mate.ts reads these back) --------
/** Every drawn piece of a part with where it is in the part's frame (through every group it is in). */
export function piecesIn(root: Part, m0 = new THREE.Matrix4()): { p: Part; m: THREE.Matrix4; path: number[] }[] {
  const out: { p: Part; m: THREE.Matrix4; path: number[] }[] = [];
  const walk = (p: Part, m: THREE.Matrix4, path: number[]) => { const mm = m.clone().multiply(matrixOfPart(p)); if (p.shape) out.push({ p, m: mm, path }); (p.parts ?? []).forEach((q, i) => walk(q, mm, [...path, i])); };
  walk(root, m0, []); return out;
}
/** A round piece's axis in its own frame (along its y: a cylinder's, a turned part's; along its z: an extruded part's),
 *  its two ends there, its outside radius and its bore (0 where it is solid). */
export function roundOf(s: Shape, base?: boolean): { a: V3; b: V3; r: number; bore: number } | null {
  if ('cyl' in s) { const h = s.cyl[1], lo = base ? 0 : -h / 2; return { a: [0, lo, 0], b: [0, lo + h, 0], r: Math.max(s.cyl[0], s.cyl[2] ?? s.cyl[0]), bore: 0 }; }
  if ('lathe' in s) { const ys = s.lathe.map((q) => q[1]), xs = s.lathe.map((q) => q[0]); return { a: [0, Math.min(...ys), 0], b: [0, Math.max(...ys), 0], r: Math.max(...xs), bore: Math.min(...xs) }; }
  if ('prism' in s) { const L = s.prism.L, hole = s.prism.holes?.[0]; return { a: [0, 0, -L / 2], b: [0, 0, L / 2], r: Math.max(...s.prism.pts.map(([x, y]) => Math.hypot(x, y))), bore: hole ? Math.min(...hole.map(([x, y]) => Math.hypot(x, y))) * Math.cos(Math.PI / hole.length) : 0 }; }
  return null;
}
/** Where a part's bore is, in its own frame: the round piece of it with the narrowest hole through it (a gear's teeth, a
 *  bearing's inner ring, a pulley's hub): its axis's two ends and the hole's radius. */
export function boreOf(p: Part): { a: THREE.Vector3; b: THREE.Vector3; r: number; piece: string } | null {
  let best: { a: THREE.Vector3; b: THREE.Vector3; r: number; piece: string } | null = null;
  for (const n of piecesIn({ ...p, at: [0, 0, 0], rot: [0, 0, 0] })) { const q = roundOf(n.p.shape!, n.p.base); if (!q || q.bore <= 0) continue; if (!best || q.bore < best.r) best = { a: v(q.a).applyMatrix4(n.m), b: v(q.b).applyMatrix4(n.m), r: q.bore, piece: n.p.name }; }
  return best;
}
/** A shaft: the first round piece of a part named like `re` (a cam's nose, a crank's nose, an axle): its axis's two ends
 *  in the part's frame and its radius. */
export function shaftOf(p: Part, re: RegExp): { a: THREE.Vector3; b: THREE.Vector3; r: number; piece: string } | null {
  for (const n of piecesIn(p)) { if (!re.test(n.p.name)) continue; const q = roundOf(n.p.shape!, n.p.base); if (q) return { a: v(q.a).applyMatrix4(n.m), b: v(q.b).applyMatrix4(n.m), r: q.r, piece: n.p.name }; }
  return null;
}

const r3 = (x: number) => Math.round(x * 1e4) / 1e4, mm = (x: number) => Math.round(x * 1e4) / 10;
/** A frame on a round piece's axis: at its middle, n along it (the drawn sense), u the part's x made square to n (else z). */
function axisFrame(a: THREE.Vector3, b: THREE.Vector3): { at: V3; n: V3; u: V3 } {
  const n = b.clone().sub(a).normalize(), x = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), u = x.sub(n.clone().multiplyScalar(x.dot(n))).normalize();
  const at = a.clone().add(b).multiplyScalar(0.5); return { at: [at.x, at.y, at.z], n: [n.x, n.y, n.z], u: [u.x, u.y, u.z] };
}
/** Where an old interface sits, where it can be told: a stud's (a bolt's shank) and a nut's thread by the components'
 *  own convention (axis y, bearing face at y = 0, the shank down −y); a bore or a shaft by the round piece drawn, where
 *  its size agrees with the one said within 0.5 mm (the critic's own tolerance). Otherwise none, and why. */
function placeOf(p: Part, f: Iface): { frame: { at: V3; n: V3; u: V3 } | null; drawn?: number; why?: string } {
  if (f.kind === 'studs' && (f.role === 'requires' || (f.n ?? 1) === 1)) return { frame: { at: [0, 0, 0], n: [0, -1, 0], u: [1, 0, 0] } };
  if (f.kind === 'shaft' && f.d !== undefined) {
    const found = f.role === 'requires' ? boreOf(p) : longestShaft(p, f.d);
    if (!found) return { frame: null, why: `no round ${f.role === 'requires' ? 'bore' : 'piece'} drawn` };
    const drawn = 2 * found.r; if (Math.abs(drawn - f.d) > 0.0005) return { frame: null, drawn, why: `said ${mm(f.d)} mm, drawn ${mm(drawn)} mm` };
    return { frame: axisFrame(found.a, found.b), drawn };
  }
  return { frame: null };
}
/** A shaft said of a part: its longest round piece whose diameter is within 0.5 mm of the one said. */
function longestShaft(p: Part, d: number): { a: THREE.Vector3; b: THREE.Vector3; r: number } | null {
  let best: { a: THREE.Vector3; b: THREE.Vector3; r: number; len: number } | null = null;
  for (const n of piecesIn({ ...p, at: [0, 0, 0], rot: [0, 0, 0] })) { const q = roundOf(n.p.shape!, n.p.base); if (!q || Math.abs(2 * q.r - d) > 0.0005) continue;
    const a = v(q.a).applyMatrix4(n.m), b = v(q.b).applyMatrix4(n.m), len = a.distanceTo(b); if (!best || len > best.len) best = { a, b, r: q.r, len }; }
  return best;
}
const toV3 = (v: THREE.Vector3): V3 => [r3(v.x), r3(v.y), r3(v.z)];

/** Every interface of a thing, read from its parts as they are, and the ids two of them would share (each a clash). */
export function interfacesOf(t: Part | Assembly): { list: Interface[]; clashes: { id: string; count: number }[] } {
  const list: Interface[] = [];
  const frame = (m: THREE.Matrix4, q: { at: V3; n: V3; u: V3 }) => { const r = new THREE.Matrix4().extractRotation(m);
    return { at: toV3(new THREE.Vector3(...q.at).applyMatrix4(m)), n: toV3(new THREE.Vector3(...q.n).applyMatrix4(r).normalize()), u: toV3(new THREE.Vector3(...q.u).applyMatrix4(r).normalize()) }; };
  const own = (p: Part | Assembly, path: string[], m: THREE.Matrix4) => {
    for (const q of p.ports ?? []) { const k = PORT_KIND[q.sex]; list.push({ id: [...path, q.name].join('/'), name: q.name, kind: k.kind, mates: k.mates,
      size: { thread: q.thread, holes: q.pattern.length, t: q.t, ...(q.pilot !== undefined ? { pilot: q.pilot } : {}) }, ...(q.std ? { std: q.std } : {}),
      frame: q.n && q.u ? frame(m, q) : null, from: { port: q.name } }); }
    if (isAssembly(p)) return;
    const fs = p.iface ?? [], named = fs.map((f) => IFACE_KIND[`${f.kind}.${f.role}`].name);
    fs.forEach((f, i) => { const k = IFACE_KIND[`${f.kind}.${f.role}`];
      // (two of one name on a part told apart by what they go to, then their size)
      let name = k.name; if (named.filter((x) => x === name).length > 1) name = f.to ? `${name}>${f.to}` : f.d !== undefined ? `${name} ${mm(f.d)} mm` : name;
      const at = placeOf(p, f), says = [f.says, at.why].filter(Boolean).join('; ');
      list.push({ id: [...path, name].join('/'), name, kind: k.kind, mates: k.mates, frame: at.frame ? frame(m, at.frame) : null, from: { iface: f.kind, role: f.role },
        size: { ...(f.d !== undefined ? { [f.kind === 'chain' ? 'pitch' : 'd']: f.d } : {}), ...(f.n !== undefined ? { n: f.n } : {}), ...(f.torque !== undefined ? { torque: f.torque } : {}), ...(at.drawn !== undefined ? { drawn: r3(at.drawn * 1e3) / 1e3 } : {}) },
        ...(p.joint ? { joint: p.joint } : {}), ...(f.to ? { to: f.to } : {}), ...(says ? { says } : {}) }); });
  };
  // (a child's segment is its name; where siblings share a name, its place in its holder, in mm, tells them apart)
  const segs = (names: string[], at: (i: number) => V3) => names.map((n, i) => names.filter((x) => x === n).length > 1 ? `${n}@${at(i).map(mm).join(',')}` : n);
  const walk = (p: Part | Assembly, path: string[], m: THREE.Matrix4, depth: number) => {
    if (depth > 24) return; own(p, path, m);
    if (isAssembly(p)) { const seg = segs(p.items.map((it) => it.of.name), (i) => { const it = p.items[i]!, o = new THREE.Vector3(...((it.of as Part).at ?? [0, 0, 0])).applyMatrix4(matrixOf(it)); return [o.x, o.y, o.z]; });
      p.items.forEach((it, i) => walk(it.of, [...path, seg[i]!], m.clone().multiply(matrixOf(it)), depth + 1)); return; }
    const kids = p.parts ?? [], seg = segs(kids.map((k) => k.name), (i) => kids[i]!.at ?? [0, 0, 0]);
    kids.forEach((k, i) => walk(k, [...path, seg[i]!], m.clone().multiply(matrixOfPart(k)), depth + 1));
  };
  walk(t, [], isAssembly(t) ? new THREE.Matrix4() : new THREE.Matrix4(), 0);
  const seen = new Map<string, number>(); for (const x of list) seen.set(x.id, (seen.get(x.id) ?? 0) + 1);
  return { list, clashes: [...seen].filter(([, n]) => n > 1).map(([id, count]) => ({ id, count })) };
}

// ---- the tables a negative is sized from (spec 01, I3; design §2.3) ------------------------------------------------------
// Each row from a document opened on 2026-11-01 and read again by a second reader against another publisher's copy (a
// workflow of two agents a table: every value agreed, but where the second copy lacked the row). Each row names its source;
// what a standard does not fix is said, never filled in. Values in mm unless said.

/** Where the rows come from: the document opened, who published it, whether it is the standard's own text. */
export interface TableSource { title: string; url: string; publisher: string; standard: boolean; second?: string }
export const TABLE_SOURCES: Record<string, TableSource> = {
  'ISO 273': { title: 'ISO 273:1979 Fasteners: clearance holes for bolts and screws (its table, p. 2)', url: 'https://cdn.standards.iteh.ai/samples/4183/1a8db2e6de054d2e9bed7d40be64d6e1/ISO-273-1979.pdf', publisher: 'ISO (a preview hosted by iTeh Standards)', standard: true, second: 'IS 1821:1987, identical to ISO 273 (Bureau of Indian Standards): https://law.resource.org/pub/in/bis/S01/is.1821.1987.pdf' },
  'ISO 2306': { title: 'ISO 2306:1972 Drills for use prior to tapping screw threads (Table 1)', url: 'https://cdn.standards.iteh.ai/samples/7135/5bef5f85e78040d6b848307ffd62d83f/ISO-2306-1972.pdf', publisher: 'ISO (a preview hosted by iTeh Standards)', standard: true, second: 'Darmet, recommended drill sizes for taps: https://darmet.com.pl/en/technical/4179-recommended-drill-bit-sizes-for-taps-and-forming-taps' },
  'DIN 974-1': { title: 'DIN 974-1:2008-02 Counterbores, Table 1, series 1 (for ISO 4762), as reproduced in Tabellenbuch Schrauben, Muttern und Zubehör (2014)', url: 'https://api.pageplace.de/preview/DT0400.9783410231622_A34075842/preview-9783410231622_A34075842.pdf', publisher: 'Beuth Verlag (DIN\'s publisher), a reproduction', standard: false, second: 'Ifanger, Flachsenkungen nach DIN 974-1: https://www.defruytier.be/uploads/product/files/ifanger-VFL.pdf' },
  'ISO 15065': { title: 'ISO 15065:2005 Countersinks for countersunk head screws with head configuration in accordance with ISO 7721 (Table 1)', url: 'https://cdn.standards.iteh.ai/samples/37365/57c8c6dac6864ac5a6f7bfa6fdd06111/ISO-15065-2005.pdf', publisher: 'ISO (a preview hosted by iTeh Standards)', standard: true },
  'EN 1993-1-8': { title: 'EN 1993-1-8:2005 Eurocode 3, design of joints, Table 3.3', url: 'https://dokumen.pub/eurocode-3-design-of-steel-structures-part-1-8-design-of-joints-2005nbsped.html', publisher: 'CEN (a copy on dokumen.pub; and a BSI scan)', standard: true, second: 'DSTU-N B EN 1993-1-8, the Ukrainian adoption' },
  'Bossard engagement': { title: 'Bossard, length of engaged thread (recommended from trials, M6 to M16; bracketed values by the VDI 2230 formula)', url: 'https://assets.eu.ctfassets.net/0vp0u5uh75zd/3wPlDC2XQOYT3XOdwCk6lz/9a9282ffd29746a7a7f6b0149509f1cf/052_Length_engaged_thread_Fastening_EN_01_2025.pdf', publisher: 'Bossard (a fastener maker)', standard: false },
  'CNC Kitchen inserts': { title: 'CNC Kitchen heat-set insert dimensions and design guidelines (standard inserts, metric)', url: 'https://www.cnckitchen.com/s/CNCKitchen_Heat-Set-Insert-Dimensions-and-Design-Guidelines.pdf', publisher: 'CNC Kitchen (TwoChefs GmbH), the insert maker', standard: false, second: 'ruthex RX inserts, its table on its product pages: https://www.ruthex.de/en/products/ruthex-gewindeeinsatz-m4-50-stuck-rx-m4x8-1-messing-gewindebuchsen (its holes 0.1 mm smaller from M4 up)' },
  'ISO 286-1': { title: 'ISO 286-1:1988 limits and fits: the tolerance factor, the grades as multiples of it, the size steps, Table 1, as reproduced in BHEL corporate standard AA0230201', url: 'https://www.bhel.com/sites/default/files/specificationaa0230201-1440410133.pdf', publisher: 'Bharat Heavy Electricals Ltd, a reproduction', standard: false, second: 'IS 919 (Part 1):1993, identical to ISO 286-1 (Bureau of Indian Standards)' },
};

/** ISO 273 clearance holes, fine, medium and coarse series (tolerance fields H12, H13, H14, for information there). */
export const CLEARANCE: Record<string, { fine: number; medium: number; coarse: number; src: 'ISO 273' }> = Object.fromEntries(([
  ['M1.6', 1.7, 1.8, 2], ['M2', 2.2, 2.4, 2.6], ['M2.5', 2.7, 2.9, 3.1], ['M3', 3.2, 3.4, 3.6], ['M4', 4.3, 4.5, 4.8], ['M5', 5.3, 5.5, 5.8], ['M6', 6.4, 6.6, 7],
  ['M8', 8.4, 9, 10], ['M10', 10.5, 11, 12], ['M12', 13, 13.5, 14.5], ['M14', 15, 15.5, 16.5], ['M16', 17, 17.5, 18.5], ['M20', 21, 22, 24], ['M24', 25, 26, 28], ['M30', 31, 33, 35],
] as const).map(([k, fine, medium, coarse]) => [k, { fine, medium, coarse, src: 'ISO 273' as const }]));

/** ISO 2306 drills before tapping, coarse threads: the drill, and the pitch it is for (about d − P, the standard says). */
export const TAP_DRILL: Record<string, { drill: number; P: number; src: 'ISO 2306' }> = Object.fromEntries(([
  ['M1.6', 1.25, 0.35], ['M1.8', 1.45, 0.35], ['M2', 1.6, 0.4], ['M2.2', 1.75, 0.45], ['M2.5', 2.05, 0.45], ['M3', 2.5, 0.5], ['M3.5', 2.9, 0.6], ['M4', 3.3, 0.7],
  ['M4.5', 3.7, 0.75], ['M5', 4.2, 0.8], ['M6', 5, 1], ['M7', 6, 1], ['M8', 6.8, 1.25], ['M9', 7.8, 1.25], ['M10', 8.5, 1.5], ['M11', 9.5, 1.5], ['M12', 10.2, 1.75],
  ['M14', 12, 2], ['M16', 14, 2], ['M18', 15.5, 2.5], ['M20', 17.5, 2.5], ['M22', 19.5, 2.5], ['M24', 21, 3],
] as const).map(([k, drill, P]) => [k, { drill, P, src: 'ISO 2306' as const }]));

/** DIN 974-1 counterbores, series 1 (for ISO 4762 heads): the counterbore's diameter d1, the through hole d2 (medium).
 *  DIN 974-1 fixes no depth: it gives a way to work one out, so a counterbore's depth here is the head's height and an
 *  allowance, labelled so where it is used. */
export const COUNTERBORE: Record<string, { d1: number; d2: number; src: 'DIN 974-1' }> = Object.fromEntries(([
  ['M3', 6.5, 3.4], ['M3.5', 6.5, 3.9], ['M4', 8, 4.5], ['M5', 10, 5.5], ['M6', 11, 6.6], ['M8', 15, 9], ['M10', 18, 11], ['M12', 20, 13.5], ['M14', 24, 15.5],
  ['M16', 26, 17.5], ['M18', 30, 20], ['M20', 33, 22], ['M22', 36, 24], ['M24', 40, 26],
] as const).map(([k, d1, d2]) => [k, { d1, d2, src: 'DIN 974-1' as const }]));

/** ISO 15065 countersinks (90°) for countersunk heads to ISO 7721 (ISO 2009, 7046 and their kin): Dc, its least and its
 *  most, and the hole. The standard ends at M10; ISO 10642 socket heads are outside it (DIN 74 F gives theirs: not here). */
export const COUNTERSINK: Record<string, { Dc: number; DcMax: number; dh: number; src: 'ISO 15065' }> = Object.fromEntries(([
  ['M3', 6.3, 6.5, 3.4], ['M3.5', 8.2, 8.4, 3.9], ['M4', 9.4, 9.6, 4.5], ['M5', 10.4, 10.65, 5.5], ['M6', 12.6, 12.85, 6.6], ['M8', 17.3, 17.55, 9], ['M10', 20, 20.3, 11],
] as const).map(([k, Dc, DcMax, dh]) => [k, { Dc, DcMax, dh, src: 'ISO 15065' as const }]));

/** EN 1993-1-8 Table 3.3: the least and the most end and edge distances and spacings of bolts in steel, from the hole d0
 *  and the thinner outer part's thickness t (mm): the most for steel to EN 10025 exposed to the weather (no most is given
 *  where not exposed; the slotted-hole distances e3, e4 and the staggered rows' p1,0, p1,i are in the standard, not here). */
export const BOLT_SPACING = {
  e1: { least: (d0: number) => 1.2 * d0, most: (t: number) => 4 * t + 40 }, e2: { least: (d0: number) => 1.2 * d0, most: (t: number) => 4 * t + 40 },
  p1: { least: (d0: number) => 2.2 * d0, most: (t: number) => Math.min(14 * t, 200) }, p2: { least: (d0: number) => 2.4 * d0, most: (t: number) => Math.min(14 * t, 200) },
  src: 'EN 1993-1-8' as const,
};

/** How far a screw must go into a tapped hole, as a multiple of its diameter, by the host's material and the screw's class
 *  (coarse thread): Bossard's recommended values from trials, M6 to M16 (a VDI 2230 calculation gives the exact one). */
export const ENGAGEMENT: Record<string, { Rm: number; '8.8'?: number; '10.9'?: number; '12.9'?: number; src: 'Bossard engagement' }> = {
  'steel, Rm over 360 (S235, C15)': { Rm: 360, '8.8': 1, '10.9': 1.25, '12.9': 1.4, src: 'Bossard engagement' },
  'steel, Rm over 500 (S355, C35)': { Rm: 500, '8.8': 0.9, '10.9': 1, '12.9': 1.2, src: 'Bossard engagement' },
  'steel heat-treated, Rm over 800 (42CrMo4 V)': { Rm: 800, '8.8': 0.8, '10.9': 0.9, '12.9': 1, src: 'Bossard engagement' },
  'grey cast iron, Rm over 220 (GJL 250)': { Rm: 220, '8.8': 1, '10.9': 1.25, '12.9': 1.4, src: 'Bossard engagement' },
  'aluminium, Rm over 180 (AlMg3 F18)': { Rm: 180, '8.8': 2, src: 'Bossard engagement' },
  'aluminium, Rm over 330 (AlMgSi1 F32)': { Rm: 330, '8.8': 1.4, '10.9': 1.6, src: 'Bossard engagement' },
};

/** Heat-set inserts for thermoplastics (PLA, ABS, PETG): CNC Kitchen's standard inserts, their length L, outside D1, the hole
 *  D2 and the least wall W round it (its table); a blind hole L + 1 mm deep (its drawing: "min. L+1mm"). */
export const INSERT: Record<string, { series: string; L: number; od: number; hole: number; depth: number; wall: number; src: 'CNC Kitchen inserts' }> = Object.fromEntries(([
  ['M2', 'TC-M2x3.0', 3, 3.6, 3.2, 1.3], ['M2.5', 'TC-M2.5x4.0', 4, 4.6, 4, 1.6], ['M3', 'TC-M3x5.7', 5.7, 4.6, 4, 1.6], ['M4', 'TC-M4x8.1', 8.1, 6.3, 5.7, 2.1],
  ['M5', 'TC-M5x9.5', 9.5, 7.1, 6.5, 2.6], ['M6', 'TC-M6x12.7', 12.7, 8.7, 8.1, 3.3], ['M8', 'TC-M8x12.7', 12.7, 10.2, 9.7, 4.5],
] as const).map(([k, series, L, od, hole, wall]) => [k, { series, L, od, hole, depth: +(L + 1).toFixed(1), wall, src: 'CNC Kitchen inserts' as const }]));

/** ISO 286-1's standard tolerance for a size and a grade (IT5 to IT16, sizes to 500 mm), in µm: i = 0.45∛D + 0.001 D, D the
 *  geometric mean of the size's step, the grade a multiple of i. Derived from the formula and said so: the standard's Table 1
 *  is rounded by its own rules and is to be preferred (its values at three steps are kept here to set beside). */
export const IT_STEPS = [0, 3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
export const IT_MULTIPLE: Record<number, number> = { 5: 7, 6: 10, 7: 16, 8: 25, 9: 40, 10: 64, 11: 100, 12: 160, 13: 250, 14: 400, 15: 640, 16: 1000 };
export const IT_TABLE: Record<string, { IT6: number; IT7: number; IT8: number; src: 'ISO 286-1' }> = { '6-10': { IT6: 9, IT7: 15, IT8: 22, src: 'ISO 286-1' }, '18-30': { IT6: 13, IT7: 21, IT8: 33, src: 'ISO 286-1' }, '50-80': { IT6: 19, IT7: 30, IT8: 46, src: 'ISO 286-1' } };
export function itTolerance(size: number, grade: number): { um: number; step: [number, number]; derived: string } {
  const k = IT_STEPS.findIndex((x, i) => i > 0 && size <= x); if (size <= 0 || k < 1) throw new Error(`ISO 286-1's formula is for sizes above 0 and to 500 mm: ${size}`);
  const m = IT_MULTIPLE[grade]; if (!m) throw new Error(`IT${grade}: the formula gives IT5 to IT16`);
  const lo = Math.max(IT_STEPS[k - 1]!, 1), hi = IT_STEPS[k]!, D = Math.sqrt(lo * hi), i = 0.45 * Math.cbrt(D) + 0.001 * D;
  return { um: m * i, step: [IT_STEPS[k - 1]!, hi], derived: `derived: ${m} i, i = 0.45∛D + 0.001 D, D = ${D.toFixed(3)} mm (ISO 286-1's formula; its Table 1 rounds)` };
}

// ---- the negative: what a part's interface asks of the part that receives it (spec 01, I5; design §2.2) ------------------
// A screw's thread through a plate asks a clearance hole (and a counterbore for a cap screw's head); into a metal, a tapped
// hole as deep as the thread must reach; into a plastic, a heat-set insert's hole and the insert; a motor's face, its holes
// and its pilot's bore. Every size from §2.3's tables, or labelled typical; what cannot be done is refused, with its rule,
// its numbers and its source, and nothing is cut.

/** A body of the negative, in the interface's frame (its face at the origin, the hole running along −y, into the host). */
export interface ToolBody { role: 'remove' | 'keep' | 'add' | 'contact'; /** a turned body: [radius, depth] from the face, m */ prof?: [number, number][]; at?: V3; /** a keep's or a contact's size */ r?: number; r0?: number; length?: number; why: string }
export interface Negative { mirror: { kind: 'hole.clearance' | 'hole.tapped' | 'hole.insert' | 'bore' | 'holes'; size: Record<string, number | string>; std?: string; fit?: string }; tools: ToolBody[]; parts: Part[]; why: string[] }
export interface Refusal { refused: true; rule: string; need: number; have: number; unit: string; source: string; why: string }
/** What asks for a negative: a screw's thread (its head's kind, its class), or a motor's face by its NEMA frame. */
export type Asking = { kind: 'thread.external'; thread: string; head?: 'socket' | 'hex' | 'pan'; class?: '8.8' | '10.9' | '12.9'; through?: boolean } | { kind: 'face'; nema: string };
const MM = 1e-3, POINT = (59 * Math.PI) / 180; // (a twist drill's point, 118°: half of it from the axis)

/** How far a screw of this class must go into this material (Bossard's rows, by the host's family and its Rm; the
 *  nearest row of its family below where its Rm is under every row's, said so). */
export function engagementOf(material: string, cls: '8.8' | '10.9' | '12.9' = '8.8'): { k: number; row: string; why: string } | null {
  const m = matterOf(material), Rm = (m.props.find((p) => p.key === 'ultimate')?.value ?? 0) / 1e6;
  const fam = m.family === 'steel' || m.family === 'stainless steel' ? /^steel/ : m.family === 'cast iron' ? /cast iron/ : m.family === 'aluminium' ? /^aluminium/ : null; if (!fam) return null;
  const rows = Object.entries(ENGAGEMENT).filter(([k, r]) => fam.test(k) && r[cls] !== undefined).sort((a, b) => b[1].Rm - a[1].Rm); if (!rows.length) return null;
  const hit = rows.find(([, r]) => Rm > r.Rm) ?? rows[rows.length - 1]!, under = !(Rm > hit[1].Rm);
  return { k: hit[1][cls]!, row: hit[0], why: `${hit[1][cls]} d for class ${cls} in ${hit[0]} (Bossard; its Rm ${Rm.toFixed(0)} MPa${under ? `, under the row's ${hit[1].Rm}: the nearest row, so it may be short` : ''})` };
}

/** The negative an interface asks of a host of this material and thickness (m), or a refusal. */
export function negativeOf(it: Asking, host: { material: string; thickness: number }, o: { fit?: 'fine' | 'medium' | 'coarse' } = {}): Negative | Refusal {
  const t = host.thickness, fit = o.fit ?? 'medium', fam = matterOf(host.material).family;
  if (it.kind === 'face') {
    const f = NEMA_FACE_OF(it.nema); if (!f) return refuse('a NEMA face we hold', 0, 0, '', 'NEMA ICS 16 (kinds/motion.ts)', `no NEMA ${it.nema} face here`);
    const c = CLEARANCE[f.thread]; if (!c) return refuse('ISO 273', 0, 0, '', 'ISO 273', `no clearance hole for ${f.thread}`);
    const h = (f.holes / 2) * MM, r = (c[fit] / 2) * MM, pil = IT_TABLE[f.pilot <= 30 && f.pilot > 18 ? '18-30' : ''], dev = pil ? pil.IT7 : itTolerance(f.pilot, 7).um;
    const tools: ToolBody[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ role: 'remove' as const, prof: [[r, 0], [r, t]] as [number, number][], at: [a! * h, 0, b! * h] as V3, why: `ISO 273 ${fit} clearance for the face's ${f.thread} screws: ${c[fit]} mm, on its ${f.holes} mm square` }));
    tools.push({ role: 'remove', prof: [[(f.pilot / 2) * MM, 0], [(f.pilot / 2) * MM, t]], at: [0, 0, 0], why: `the pilot's bore, ${f.pilot} H7 (ISO 286-1: 0 to +${dev} µm${pil ? ', its Table 1' : ', derived'}), through: the shaft passes it` });
    return { mirror: { kind: 'holes', size: { holes: f.holes, thread: f.thread, pilot: f.pilot }, std: 'NEMA ICS 16', fit: `ISO 273 ${fit}; pilot H7` }, tools, parts: [], why: tools.map((x) => x.why) };
  }
  const th = it.thread, T = METRIC_OF(th), d = Number(th.slice(1)); if (!T) return refuse('ISO 261', 0, 0, '', 'ISO 261', `no thread ${th}`);
  if (it.through ?? true) {
    // (through: a clearance hole; a cap screw's head in a counterbore (DIN 974-1, series 1), its depth the head's height
    // and 0.5 mm (typical: DIN 974-1 fixes none))
    const c = CLEARANCE[th]; if (!c) return refuse('ISO 273', 0, 0, '', 'ISO 273', `no clearance hole for ${th}`);
    const r = (c[fit] / 2) * MM, why = [`ISO 273 ${fit} clearance for ${th}: ${c[fit]} mm`], tools: ToolBody[] = [];
    if (it.head === 'socket') {
      const cb = COUNTERBORE[th]; if (!cb) return refuse('DIN 974-1', 0, 0, '', 'DIN 974-1', `no counterbore for ${th}`);
      const depth = (T.k + 0.5) * MM, R = (cb.d1 / 2) * MM; if (depth >= t) return refuse('the counterbore within the plate', depth / MM, t / MM, 'mm', 'DIN 974-1; ISO 4762', `a counterbore ${(depth / MM).toFixed(1)} mm deep for an ISO 4762 head of ${T.k} mm does not fit a ${(t / MM).toFixed(1)} mm plate`);
      tools.push({ role: 'remove', prof: [[R, 0], [R, depth], [r, depth], [r, t]], why: `counterbore ${cb.d1} mm (DIN 974-1, series 1) ${(depth / MM).toFixed(1)} mm deep (the ISO 4762 head's ${T.k} mm and 0.5 mm, typical), over the ${c[fit]} mm hole` });
      tools.push({ role: 'contact', r0: r, r: (T.dk / 2) * MM, at: [0, -depth, 0], why: `the head bears on the counterbore's floor: from the hole's ${c[fit]} mm to the head's ${T.dk} mm (ISO 4762)` });
      tools.push({ role: 'keep', r: R, length: 3 * d * MM, at: [0, 0, 0], why: `room along the axis for the hex key: the counterbore's ${cb.d1} mm, ${3 * d} mm out (typical)` });
      why.push(tools[0]!.why);
    } else tools.push({ role: 'remove', prof: [[r, 0], [r, t]], why: why[0]! });
    return { mirror: { kind: 'hole.clearance', size: { thread: th, d: c[fit] * MM }, std: 'ISO 273', fit: `ISO 273 ${fit}` }, tools, parts: [], why };
  }
  // (into the host: a metal is tapped, as deep as the thread must reach (Bossard), drilled for tapping (ISO 2306) with two
  // pitches more for the tap's run-out (typical) and the drill's 118° point; a polymer takes a heat-set insert)
  if (fam === 'polymer') {
    const ins = INSERT[th]; if (!ins) return refuse('an insert maker\'s table', 0, 0, '', 'INSERT', `no heat-set insert row for ${th}`);
    const r = (ins.hole / 2) * MM, depth = ins.depth * MM; if (depth > t) return refuse('the insert\'s hole within the part', ins.depth, t / MM, 'mm', ins.src, `the ${ins.series}'s hole is ${ins.depth} mm deep, the part ${(t / MM).toFixed(1)} mm`);
    const insert: Part = { name: `heat-set insert ${th}`, item: `insert-${th.toLowerCase()}`, shape: { tube: { r: (ins.od / 2) * MM, wall: ((ins.od - d) / 2) * MM, pts: [[0, 0, 0], [0, -ins.L * MM, 0]] } }, at: [0, 0, 0], mat: 'brass', says: `${ins.series}: ${ins.L} mm long, ${ins.od} mm across, pressed in hot (${TABLE_SOURCES[ins.src]?.publisher ?? ins.src})` };
    const why = [`a ${fam}: a thread is not cut in it; a heat-set insert (${ins.series}) in a ${ins.hole} mm hole ${ins.depth} mm deep (${ins.src})`];
    return { mirror: { kind: 'hole.insert', size: { thread: th, d: ins.hole * MM, depth }, std: ins.src, fit: 'insert' }, tools: [{ role: 'remove', prof: [[r, 0], [r, depth], [0, depth + r / Math.tan(POINT)]], why: why[0]! }], parts: [insert], why };
  }
  const e = engagementOf(host.material, it.class ?? '8.8'); if (!e) return refuse('a thread\'s engagement in this material', 0, 0, '', 'Bossard engagement', `no engagement row for ${fam}: ${host.material}`);
  const need = e.k * d; if (need * MM > t) return refuse('engagement', need, t / MM, 'mm', 'Bossard engagement', `an ${th} needs ${need.toFixed(1)} mm of thread (${e.why}); the part is ${(t / MM).toFixed(1)} mm`);
  const dr = TAP_DRILL[th]; if (!dr) return refuse('ISO 2306', 0, 0, '', 'ISO 2306', `no tap drill for ${th}`);
  const rd = (dr.drill / 2) * MM, depth = Math.min(t, (need + 2 * dr.P) * MM), blind = depth < t;
  const prof: [number, number][] = blind ? [[rd, 0], [rd, depth], [0, depth + rd / Math.tan(POINT)]] : [[rd, 0], [rd, t]];
  const why = [`tapped ${th}: drilled ${dr.drill} mm (ISO 2306), ${need.toFixed(1)} mm of thread (${e.why})${blind ? `, the drill ${(depth / MM).toFixed(1)} mm deep (two pitches for the tap's run-out, typical) and its 118° point` : ', through'}`];
  return { mirror: { kind: 'hole.tapped', size: { thread: th, drill: dr.drill * MM, thread_depth: need * MM }, std: 'ISO 2306', fit: '6H' }, tools: [{ role: 'remove', prof, why: why[0]! }], parts: [], why };
}
const METRIC_OF = (th: string) => METRIC[th], NEMA_FACE_OF = (n: string) => NEMA_FACE[n];
const refuse = (rule: string, need: number, have: number, unit: string, source: string, why: string): Refusal => ({ refused: true, rule, need, have, unit, source, why });
