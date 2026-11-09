// The interface record (spec 01, tasks I1 and I2; decisions 0004 and 0014): what a part offers, or asks of, what it meets.
// Read here, never written: each port (holes, threads, pins, a frame) and each old interface (`iface`: a shaft and its
// bore, studs and their nuts, a drive, a chain, a mount) of every part in a thing becomes one record, with an id that says
// where it is (the names from the thing asked down to the part that carries it, then its own name) and a frame, where
// one is known, in the thing's own frame. No part is changed. A name repeated among siblings is told apart by where the
// sibling stands; one still alike is reported as a clash, never numbered. The negatives (the hole a bolt needs, its
// counterbore) and the standards' tables they read come next (I3 onward); mating by interfaces is mate.ts's.

import * as THREE from 'three';
import type { Iface, Limit, Part, Port, Shape, V3 } from './kits';
import { num, scopeOf, truth } from './generate';
import { notchedCircle, roundedRect } from './form';
import { isAssembly, matrixOf, type Assembly } from './assembly';
import { matterOf } from './matter';
import { METRIC } from './threads';
import { NEMA_FACE } from './kinds/motion';
import { BEARINGS, KEYS } from './families';
import { BSP } from './kinds/fluid';
import type { Block, Line, LineLimit, Piece } from './room';

export type InterfaceKind = 'holes' | 'threads' | 'pins' | 'frame' | 'shaft' | 'bore' | 'thread.external' | 'thread.internal' | 'drive' | 'chain' | 'face'
  // (the port contract, AUDIT §4 4E: the kinds the directive's classes need that no part offered before)
  | 'power' | 'signal' | 'fluid' | 'thermal' | 'optical' | 'acoustic' | 'data' | 'mount';
/** The ten classes of connection the directive names (plan/DIRECTIVE-2026-11-07.md, 4E), in its words and order. */
export const PORT_CLASSES = ['mechanical rotational', 'mechanical translational', 'structural mounting', 'electrical power', 'electrical signal', 'fluid', 'thermal', 'optical', 'acoustic', 'data communication'] as const;
export type PortClass = typeof PORT_CLASSES[number];
/** The classes each kind serves: a shaft or a bore carries a turn and, on a slide fit, a slide; holes, pins, threads,
 *  frames, faces and mounts hold one thing to another; a drive and a chain pass a turn on; the rest one class each. */
const CLASS_OF: Record<InterfaceKind, readonly PortClass[]> = {
  shaft: ['mechanical rotational', 'mechanical translational'], bore: ['mechanical rotational', 'mechanical translational'], drive: ['mechanical rotational'], chain: ['mechanical rotational'],
  holes: ['structural mounting'], threads: ['structural mounting'], pins: ['structural mounting'], frame: ['structural mounting'], face: ['structural mounting'], mount: ['structural mounting'],
  'thread.external': ['structural mounting'], 'thread.internal': ['structural mounting'],
  power: ['electrical power'], signal: ['electrical signal'], fluid: ['fluid'], thermal: ['thermal'], optical: ['optical'], acoustic: ['acoustic'], data: ['data communication'],
};
export const classOf = (k: InterfaceKind): readonly PortClass[] => CLASS_OF[k];
/** What each kind meets: the rule PORT_KIND and IFACE_KIND below give the kinds parts offered before, kept as it was; a
 *  new kind meets its own kind, a mount a mount, a face or holes. */
export const MATES: Record<InterfaceKind, readonly InterfaceKind[]> = {
  holes: ['holes', 'threads', 'pins', 'thread.external'], threads: ['holes', 'thread.external'], pins: ['holes'], frame: ['frame'], shaft: ['bore'], bore: ['shaft'],
  'thread.external': ['thread.internal', 'threads', 'holes'], 'thread.internal': ['thread.external'], drive: ['drive'], chain: ['chain'], face: ['face'],
  power: ['power'], signal: ['signal'], fluid: ['fluid'], thermal: ['thermal'], optical: ['optical'], acoustic: ['acoustic'], data: ['data'], mount: ['mount', 'face', 'holes'],
};
export interface Interface {
  /** where it is: the names from the thing asked down to its part, then its own name ("frame/left motor/mount face") */ id: string;
  name: string; kind: InterfaceKind;
  /** its sizes, SI (a thread's name as a text: "M8") */ size: Record<string, number | string>;
  std?: string;
  /** where it sits and faces, in the thing asked's frame; null where nothing says */ frame: { at: V3; n: V3; u: V3 } | null;
  /** what it was read from: a port by its name, or an old interface by its kind and role */ from: { port: string } | { iface: Iface['kind']; role: Iface['role'] };
  /** the kinds it meets */ mates: InterfaceKind[];
  /** the joint its part makes where it meets (a bearing turns, a slide slides) */ joint?: string;
  /** its operating limits, by the quantity each bounds, where its line states them (room.ts `Line.limits`) */ limits?: Readonly<Record<string, LineLimit>>;
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

// ---- a room line's kind, read from its name (AUDIT §4, 4E: so no piece needs an edit) -------------------------------------
// A line's port is "<its piece's name>/<what the line is>" (room.ts). Its kind is the one written on it where there is
// one; else it is read from those words by the rules below, in order, the first that holds. This is a reading of names,
// said on every record it makes ("read from its name: …"), never a measurement: a name that says nothing is read as a
// mechanical line (a shaft; a bore where its piece is hollow on it, which interfacesOf sees from the solid).
const electric = (piece: string): InterfaceKind => (DATA.test(piece) ? 'data' : POWER.test(piece) ? 'power' : 'signal');
/** A line's kind and how it was read: the kind written on it, or what its name says by the first rule that holds. */
export function lineKind(line: Pick<Line, 'port' | 'kind'> | string): { kind: InterfaceKind; why: string } {
  const l = typeof line === 'string' ? { port: line } as Pick<Line, 'port' | 'kind'> : line;
  if (l.kind) return { kind: l.kind, why: 'written on its line' };
  const cut = l.port.lastIndexOf('/'), role = (cut < 0 ? l.port : l.port.slice(cut + 1)).trim(), piece = cut < 0 ? '' : l.port.slice(0, cut);
  const by = (kind: InterfaceKind, rule: string) => ({ kind, why: `read from its name: ${rule}` });
  if (ROLE_MOUNT.test(role)) return /breadboard|perfboard/i.test(piece) ? by('signal', `"${role}" on a board leads go in`) : /wire entries/i.test(piece) ? by('power', `"${role}" where wires enter`) : by('holes', `"${role}" fix one thing to another`);
  if (/^studs?$/.test(role)) return POWER.test(piece) ? by('power', `a stud of ${piece}`) : by('thread.external', `"${role}"`);
  if (/^stud \d+$/.test(role)) return by('pins', `"${role}"`);
  if (ROLE_FLUID.test(role)) return by('fluid', `"${role}" something flows through`);
  if (ROLE_ELEC.test(role) && (ELEC.test(piece) || /^(ln|e|leads?|pads?|terminals?|contacts?|wires|cores)$/.test(role))) return by(electric(piece), `"${role}" of ${piece}`);
  if (ROLE_PINS.test(role)) return ELEC.test(piece) ? by(electric(piece), `"${role}" of ${piece}`) : by('pins', `"${role}"`);
  if (/^(thread|set screw)$/.test(role)) return by('threads', `"${role}"`);
  if (role === 'socket') return by('drive', 'a socket a key turns');
  if (/^(bore|pockets|eye|cross|pilot|hole)$/.test(role)) return by('bore', `"${role}"`);
  if (/^(stem|spindle|pedal|axle|output|actuators)$/.test(role)) return by('shaft', `"${role}"`);
  if (/^(one|six)$/.test(role)) return by('face', `"${role}"`);
  // (an axis, and every other name: what its piece is)
  if (THREADED.test(piece)) return by('thread.external', `${piece}: a thread its name gives`);
  if (MECH_FIRST.test(piece)) return by('shaft', `${piece} moves or holds on it`);
  if (FLUID.test(piece)) return by('fluid', `${piece} carries a fluid`);
  if (/\b(leads?|wire|pin|contact)\b/i.test(piece) && ELEC.test(piece)) return by(electric(piece), `${piece} conducts`);
  if (POWER.test(piece)) return by('power', `${piece} carries current`);
  if (DATA.test(piece)) return by('data', `${piece} carries data`);
  if (OPTICAL.test(piece)) return by('optical', `light passes along ${piece}`);
  if (ACOUSTIC.test(piece)) return by('acoustic', `sound leaves or reaches ${piece}`);
  if (THERMAL.test(piece)) return by('thermal', `heat passes through ${piece}`);
  return by('shaft', `"${role}": nothing in it says more than a line to turn or slide on`);
}
export const kindOfLine = (line: Pick<Line, 'port' | 'kind'> | string): InterfaceKind => lineKind(line).kind;
const isBlock = (t: object): t is Block => 'pieces' in t && 'faces' in t && 'rooms' in t;
/** Hollow on its line (a tube, a cup, a bend, a line with an opening, a solid with a round cut whose middle is on the line,
 *  within its radius): what turns on it is a bore. */
const hollowOn = (p: Piece, l: Line): boolean => { const s = p.solid.base as { k: string; ri?: number };
  if (s.k === 'cup' || s.k === 'bend' || (s.ri ?? 0) > 0 || l.opening !== undefined) return true;
  const o: V3 = [l.x, l.y ?? p.solid.base.c[1], l.z], d = l.dir ?? [0, 1, 0], k = Math.hypot(...d) || 1;
  return p.solid.minus.some((m) => { if (m.k !== 'cyl') return false; const w: V3 = [m.c[0] - o[0], m.c[1] - o[1], m.c[2] - o[2]], t = (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / k;
    return Math.hypot(w[0] - (t * d[0]) / k, w[1] - (t * d[1]) / k, w[2] - (t * d[2]) / k) < m.r; }); };
const perpOf = (n: V3): V3 => { const a: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], d = a[0] * n[0] + a[1] * n[1] + a[2] * n[2], u: V3 = [a[0] - d * n[0], a[1] - d * n[1], a[2] - d * n[2]], k = Math.hypot(...u); return [u[0] / k, u[1] / k, u[2] / k]; };
/** Every line of a room block as an interface record: its kind (lineKind), what it meets (MATES), its sizes (its slot and
 *  opening radii, m, and any size written on it), its standard and limits where written, and its frame (its point; its
 *  direction as n; u any square to it). A port repeated is told apart by its point, in mm. */
function linesOf(b: Block): { list: Interface[]; clashes: { id: string; count: number }[] } {
  const all = b.pieces.flatMap((p) => p.lines.map((l) => ({ p, l }))), ids = all.map(({ l }) => l.port), list: Interface[] = [];
  for (const { p, l } of all) {
    const at: V3 = [l.x, l.y ?? p.solid.base.c[1], l.z], d = l.dir ?? [0, 1, 0], k = Math.hypot(...d), n: V3 = [d[0] / k, d[1] / k, d[2] / k], r = lineKind(l);
    // (a tapped piece's line is its internal thread; a hollow one's a bore)
    const kind: InterfaceKind = (r.kind === 'shaft' || r.kind === 'bore') && p.tapped ? 'thread.internal' : r.kind === 'shaft' && hollowOn(p, l) ? 'bore' : r.kind;
    const says = kind === r.kind ? r.why : `${r.why}; ${kind === 'bore' ? 'its piece is hollow on it: a bore' : 'its piece is tapped: an internal thread'}`;
    const id = ids.filter((x) => x === l.port).length > 1 ? `${l.port}@${at.map(mm).join(',')}` : l.port;
    list.push({ id, name: l.port.slice(l.port.lastIndexOf('/') + 1) || l.port, kind, mates: [...MATES[kind]], size: { slot: l.slot, ...(l.opening !== undefined ? { opening: l.opening } : {}), ...(l.size ?? {}) },
      ...(l.std ? { std: l.std } : {}), frame: { at: toV3(new THREE.Vector3(...at)), n: toV3(new THREE.Vector3(...n)), u: toV3(new THREE.Vector3(...perpOf(n))) }, from: { port: l.port },
      ...(p.joint ? { joint: p.joint.name } : {}), ...(l.limits ? { limits: l.limits } : {}), says });
  }
  const seen = new Map<string, number>(); for (const x of list) seen.set(x.id, (seen.get(x.id) ?? 0) + 1);
  return { list, clashes: [...seen].filter(([, c]) => c > 1).map(([id, count]) => ({ id, count })) };
}

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

/** Every interface of a thing, read from its parts as they are, and the ids two of them would share (each a clash); of a
 *  room block, from its pieces' lines (linesOf above). */
export function interfacesOf(t: Part | Assembly | Block): { list: Interface[]; clashes: { id: string; count: number }[] } {
  if (isBlock(t)) return linesOf(t);
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
  'ISO 286-2': { title: 'ISO 286-2:2010 limits and fits, Table 1: the standard tolerance grades by size (taken from ISO 286-1:2010), its sample pages', url: 'https://cdn.standards.iteh.ai/samples/54915/7d6147c29fed4e31af36b60561e88752/ISO-286-2-2010.pdf', publisher: 'ISO, sample pages hosted by iTeh Standards', standard: true, second: 'read 2026-11-01 by two readers apart (spec 01, I15), every row agreeing with Roymech\'s and the Technical University of Košice\'s ISO 286-2 tables' },
  'ISO 286-2 deviations': { title: 'ISO 286-2 fundamental deviations of holes and shafts (k, m, G, N at the sizes held), as tabulated by Roymech and by the Technical University of Košice, and in IS 919 (Part 2):1993, identical to ISO 286-2:1988', url: 'https://www.roymech.co.uk/Useful_Tables/ISO_Tolerances/ISO_286_2s.html', publisher: 'Roymech; the Technical University of Košice; the Bureau of Indian Standards', standard: false, second: 'https://silvia.malakova.website.tuke.sk/konst-ANG/ISO%20Tolerances%20for%20Shafts%20and%20Holes.pdf; https://law.resource.org/pub/in/bis/S01/is.919.2.1993.pdf (read 2026-11-01 by two readers apart, spec 01, I15)' },
  'ISO 15': { title: 'ISO 15 radial bearings, boundary dimensions, as SKF gives them for each bearing (the 6205 checked on its product page: d 25, D 52, B 15 mm)', url: 'https://www.skf.com/us/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-6205', publisher: 'SKF (product pages; the standard itself not read here)', standard: false },
  'SKF 6205': { title: 'SKF 6205 deep groove ball bearing: its dimensions and abutment dimensions (da min, Da max, ra max), read in inches and converted', url: 'https://www.skf.com/us/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-6205', publisher: 'SKF (a bearing maker)', standard: false },
  'SKF 17000/1': { title: 'SKF Rolling bearings catalogue 17000/1 EN (2018): shaft and housing tolerance classes for radial ball bearings, by load and which ring turns', url: 'https://www.skf.com/binaries/pub12/Images/0901d196802809de-Rolling-bearings---17000_1-EN_tcm_12-121486.pdf', publisher: 'SKF (a bearing maker)', standard: false },
  'ISO 8734': { title: 'ISO 8734:1997 parallel pins of hardened steel and martensitic stainless steel (dowel pins): the diameter m6', url: 'https://standards.iteh.ai/catalog/standards/iso/63b23e14-2faf-4202-b387-3db6074db25a/iso-8734-1997', publisher: 'ISO (sample pages hosted by iTeh Standards)', standard: true, second: 'ISO 2338:1997, unhardened pins, m6 or h8: https://cdn.standards.iteh.ai/samples/20001/5b26cece48c448b782c0de1eccb5b16c/ISO-2338-1997.pdf' },
  'MISUMI fits': { title: 'MISUMI, basis of selection for fits (an m6 pin in an H7 hole: a transition fit), and its excerpt of JIS B 0401 (H7, G7, m6 over 3 to 6 mm)', url: 'https://us.misumi-ec.com/pdf/press/us_12e_pr1261.pdf', publisher: 'MISUMI (a parts maker)', standard: false, second: 'https://us.misumi-ec.com/pdf/tech/mech/US2010_fa_p3539_3540.pdf' },
  'EKINSUN dowels': { title: 'EKINSUN dowel pin size chart: H7 for the side pressed, G7 for the side that comes off (a maker\'s advice, not a standard)', url: 'https://www.ekinsun.com/custom-fasteners/dowel-pin-size-chart/', publisher: 'EKINSUN (a pin maker)', standard: false },
  'DIN 6885-1': { title: 'DIN 6885-1 parallel keys and keyways, high form: the key for each shaft, the keyways\' depths t1 and t2 with their deviations, the normal fit N9 and JS9', url: 'https://live-katalog.ganternorm.com/pdf/ganter/en/6885-1.pdf?dispositiontype=attachment', publisher: 'Ganter Norm (an extract of the standard)', standard: false, second: 'Wilhelm Wernecke\'s data sheet; fasten.it (reproduced by permission of DIN); SIST ISO/R 773 via iTeh: https://cdn.standards.iteh.ai/samples/5056/1948771c55e14209b6e286c4c8fa1401/SIST-ISO-R-773-1996.pdf' },
  'ISO 228-1': { title: 'ISO 228-1:2000 pipe threads where pressure-tight joints are not made on the threads, Table 1 (G 1/2: 14 threads an inch, major 20.955 mm, minor 18.631 mm)', url: 'https://cdn.standards.iteh.ai/samples/33777/842b7c5409454ceba69c7dad9c308be1/ISO-228-1-2000.pdf', publisher: 'ISO (sample pages hosted by iTeh Standards)', standard: true },
  'ISO 1179-1': { title: 'ISO 1179-1:2013 connections for general use and fluid power, ports with ISO 228-1 threads and elastomeric or metal sealing, Table 1', url: 'https://cdn.standards.iteh.ai/samples/60250/561ffb56c93146bc84ccdccb047bf4bd/ISO-1179-1-2013.pdf', publisher: 'ISO (sample pages hosted by iTeh Standards)', standard: true, second: 'Parker Hannifin, Catalog 4300, its ISO 1179-1 port table: https://www.parker.com/content/dam/Parker-com/Literature/Tube-Fittings-Division/4300_Catalog_Cover.pdf' },
  'BSP taps': { title: 'Newman Tools, BSP taps and the drills for them (G 1/2: 19.0 mm)', url: 'https://www.newmantools.com/taps/bsp.htm', publisher: 'Newman Tools (a tool seller)', standard: false, second: 'Emuge and Trask give the same drill (spec 01, I15\'s readers)' },
  'IEC 60947-5-1': { title: 'IEC 60947-5-1 control circuit devices: the 22 mm device\'s mounting hole, its key recess, the panel\'s thickness and the devices\' spacing (IS/IEC 60947-5-1:2003, identical)', url: 'https://law.resource.org/pub/in/bis/S05/is.iec.60947.5.1.2003.pdf', publisher: 'Bureau of Indian Standards (an identical adoption)', standard: true, second: 'Siemens SIRIUS ACT 3SU1, Schneider Harmony XB4 and Eaton M22 give the same hole' },
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
/** Table 1's own values, µm, by size step (over the first, up to and including the second): what rules where held. The
 *  rows from ISO 286-2:2010's Table 1 agree with the reproduction of ISO 286-1 on every grade both give. */
export const IT_TABLE: Record<string, { IT5?: number; IT6?: number; IT7?: number; IT8?: number; IT9?: number; src: 'ISO 286-1' | 'ISO 286-2'; /** a cell from elsewhere, said */ also?: string }> = {
  '3-6': { IT5: 5, IT6: 8, IT7: 12, IT8: 18, IT9: 30, src: 'ISO 286-2' }, '6-10': { IT6: 9, IT7: 15, IT8: 22, IT9: 36, src: 'ISO 286-1', also: 'IT9 from ISO 286-2:2010 Table 1, read there by I15\'s evaluator (2026-11-01), and the width of IS 919-2\'s N9 row' },
  '18-30': { IT5: 9, IT6: 13, IT7: 21, IT8: 33, src: 'ISO 286-2' }, '50-80': { IT5: 13, IT6: 19, IT7: 30, IT8: 46, src: 'ISO 286-2' },
};
/** A standard tolerance, µm: Table 1's own value where its row is held here, else the formula's (itFormula), said so. The
 *  formula is not the table at every size: IT6 over 3 to 6 mm is 7.3 by it and 8 by the table (fault D17, 2026-11-01). */
export function itTolerance(size: number, grade: number): { um: number; step: [number, number]; derived: string } {
  const f = itFormula(size, grade), row = IT_TABLE[`${f.step[0]}-${f.step[1]}`], v = row?.[`IT${grade}` as 'IT5'];
  return v !== undefined ? { um: v, step: f.step, derived: `${row!.src}, Table 1: IT${grade} over ${f.step[0]} to ${f.step[1]} mm` } : f;
}
/** ISO 286-2's fundamental deviations, µm: for a class letter, over a size step (over, up to and including) and its grades,
 *  the one limit it sets beside its IT grade (a hole's EI as lower or ES as upper; a shaft's ei as lower or es as upper). H, h
 *  and JS, js are ISO 286-1's own definitions (EI 0, es 0, ±IT/2) and need no row. Read 2026-11-01 for the evaluation set's
 *  cases 6, 11 and 12 by two readers apart from ISO 286-2's tables (the Technical University of Košice's, Roymech's, IS
 *  919-2:1993); only the cells those cases read are held, and any other is refused, never derived. */
export interface DeviationRow { cls: string; over: number; upTo: number; grades: [number, number]; lower?: number; upper?: number; /** what it was read from (a TABLE_SOURCES key) */ src?: string }
export const DEVIATION: DeviationRow[] = [
  { cls: 'k', over: 18, upTo: 30, grades: [5, 5], lower: 2, src: 'ISO 286-2 deviations' }, { cls: 'm', over: 3, upTo: 6, grades: [6, 6], lower: 4, src: 'ISO 286-2 deviations' },
  { cls: 'G', over: 3, upTo: 6, grades: [7, 7], lower: 4, src: 'ISO 286-2 deviations' }, { cls: 'N', over: 6, upTo: 10, grades: [9, 9], upper: 0, src: 'ISO 286-2 deviations' },
];
/** A tolerance class at a basic size: its lower and upper deviations, µm, and what they were read from; or why not. Its IT
 *  grade only where Table 1's row for that size is held (the formula is not the table: fault D17), never derived. */
export function limitsOf(cls: string, basicMm: number, table: DeviationRow[] = DEVIATION): { loUm: number; hiUm: number; src: string; says: string } | Refusal {
  const m = /^(JS|js|[A-Za-z])(\d{1,2})$/.exec(cls); if (!m) return refuse('an ISO 286 class', 0, 0, '', 'ISO 286-1', `no tolerance class ${cls}`);
  const letter = m[1]!, grade = Number(m[2]), k = IT_STEPS.findIndex((x, i) => i > 0 && basicMm <= x); if (basicMm <= 0 || k < 1) return refuse('a size ISO 286 covers', 500, basicMm, 'mm', 'ISO 286-1', `${basicMm} mm: ISO 286 is read here to 500 mm`);
  const over = IT_STEPS[k - 1]!, upTo = IT_STEPS[k]!, row = IT_TABLE[`${over}-${upTo}`], w = row?.[`IT${grade}` as 'IT5'];
  if (w === undefined) return refuse('a tolerance grade held', 0, 0, '', 'ISO 286-1', `IT${grade} over ${over} to ${upTo} mm: its Table 1 row is not held here, and the formula is not the table (D17)`);
  const said = (lo: number, hi: number, how: string, src: string) => ({ loUm: lo, hiUm: hi, src, says: `${basicMm} ${cls}: ${lo >= 0 ? '+' : ''}${lo} to ${hi >= 0 ? '+' : ''}${hi} µm (${how}; IT${grade} ${w} µm, ${row!.src} Table 1)` });
  if (letter === 'H') return said(0, w, 'H: EI 0', 'ISO 286-1'); if (letter === 'h') return said(-w, 0, 'h: es 0', 'ISO 286-1');
  if (letter === 'JS' || letter === 'js') { if (w % 2) return refuse('ISO 286-1\'s rounding of JS', 0, 0, '', 'ISO 286-1', `${cls} at ${basicMm} mm: IT${grade} is ${w} µm, odd, and how ISO 286-1 rounds its half is not read here`); return said(-w / 2, w / 2, 'JS: ±IT/2', 'ISO 286-1'); }
  const d = table.find((x) => x.cls === letter && basicMm > x.over && basicMm <= x.upTo && grade >= x.grades[0] && grade <= x.grades[1]);
  if (!d) return refuse('a fundamental deviation held', 0, 0, '', 'ISO 286-2', `no ISO 286-2 row for ${letter} over ${over} to ${upTo} mm at IT${grade} here`);
  const src = d.src ?? 'ISO 286-2'; return d.lower !== undefined ? said(d.lower, d.lower + w, `${letter}: its lower deviation ${d.lower}, ${src}`, src) : said(d.upper! - w, d.upper!, `${letter}: its upper deviation ${d.upper}, ${src}`, src);
}
/** A hole on a shaft of one size, by their deviations (µm): the most clearance, the most interference, and so the kind. */
export interface FitJudged { kind: 'clearance' | 'transition' | 'interference'; mostClearUm: number; mostTightUm: number; why: string }
export function fitOf(hole: { loUm: number; hiUm: number }, shaft: { loUm: number; hiUm: number }): FitJudged {
  const mostClearUm = +(hole.hiUm - shaft.loUm).toFixed(3), mostTightUm = +(shaft.hiUm - hole.loUm).toFixed(3), kind = hole.loUm >= shaft.hiUm ? 'clearance' : hole.hiUm <= shaft.loUm ? 'interference' : 'transition';
  return { kind, mostClearUm, mostTightUm, why: `a ${kind} fit: at most ${Math.max(0, mostClearUm)} µm clear, at most ${Math.max(0, mostTightUm)} µm tight (ISO 286-1)` };
}
/** ISO 286-1's formula, unrounded (where Table 1 holds no row here). */
export function itFormula(size: number, grade: number): { um: number; step: [number, number]; derived: string } {
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
export type Ex = string; // an expression over a row's names, read by generate.ts num()/truth() (SI; lengths with their unit: '0.5 mm', '59 deg')
export type MirrorKind = 'hole.clearance' | 'hole.tapped' | 'hole.insert' | 'bore' | 'holes' | 'shaft' | 'keyway' | 'thread.internal' | 'cutout';
export type Joint = 'fixed' | 'slider' | 'revolute' | 'cylindrical';
export type Measure = 'value' | 'across' | 'spacing' | 'breaking in' | 'room';
export interface ToolBody { role: 'remove' | 'keep' | 'add' | 'contact'; /** a turned body: [radius, depth] from the face, m */ prof?: [number, number][];
  /** a section in the face (m): x along u, z along w = n × u, cut `depth` along −n (spec 01, I17) */ sect?: [number, number][]; depth?: number;
  at?: V3; /** a keep's or a contact's size */ r?: number; r0?: number; length?: number; /** a keep behind the face rather than before it */ along?: '+n' | '-n'; why: string }
/** A check a negative asks before anything is cut (spec 01, I17): what it measures on the host, the least and most it
 *  allows, where along its line (m), from its axis or from its outline, and only when a condition over its sizes holds. */
export interface PlannedCheck { check: string; measure: Measure; need?: number | [number, number]; most?: number; at?: number; from?: 'axis' | 'outline'; when?: Ex;
  rule: string; source: string; /** a 'value' check, settled where the negative was made */ done?: { have: number } }
export interface Negative {
  mirror: { kind: MirrorKind; size: Record<string, number | string>; std?: string; fit?: string; /** given by a row; else applyImprint infers them */ sex?: Port['sex']; takes?: string; t?: number; joint?: Joint };
  tools: ToolBody[]; parts: Part[]; why: string[]; checks: PlannedCheck[];
  limits?: Limit[]; fit?: FitJudged; /** parts it adds, as catalogue words, never drawn here */ adds?: { words: string; at: V3; why: string }[];
  row?: string; side?: string; frame?: 'surface' | 'axis'; scope?: Record<string, number>;
}
export interface Refusal { refused: true; rule: string; need: number; have: number; unit: string; source: string; why: string }
/** A negative asked of a row (spec 01, I17): its row, the sizes asked (numbers SI, or words such as a bearing's number), its side. */
export type RowAsking = { row: string; size: Record<string, number | string>; side?: string };
/** What an interface asks of the part it meets (I5's two kinds), or a row's negative. */
export type Asking = { kind: 'thread.external'; thread: string; head?: 'socket' | 'hex' | 'pan'; class?: '8.8' | '10.9' | '12.9'; through?: boolean } | { kind: 'face'; nema: string } | RowAsking;
/** The host as imprint measures it where an interface stands: its material, its depth along the line, how far it runs either
 *  way along u from the point (span; mid, the middle's offset), and how far is clear before the face along n (free). */
export interface HostMeasure { material: string; thickness: number; span?: number; mid?: number; free?: number }
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
export function negativeOf(it: Asking, host: HostMeasure, o: { fit?: 'fine' | 'medium' | 'coarse'; rows?: Record<string, NegativeRow> } = {}): Negative | Refusal {
  // (a row's negative: one general path for every kind written as data (spec 01, I17))
  if ('row' in it) return negativeOfRow(it, host, o.rows ?? NEGATIVE_ROWS);
  const t = host.thickness, fit = o.fit ?? 'medium', fam = matterOf(host.material).family;
  if (it.kind === 'face') {
    const f = NEMA_FACE_OF(it.nema); if (!f) return refuse('a NEMA face we hold', 0, 0, '', 'NEMA ICS 16 (kinds/motion.ts)', `no NEMA ${it.nema} face here`);
    const c = CLEARANCE[f.thread]; if (!c) return refuse('ISO 273', 0, 0, '', 'ISO 273', `no clearance hole for ${f.thread}`);
    const h = (f.holes / 2) * MM, r = (c[fit] / 2) * MM, it7 = itTolerance(f.pilot, 7), dev = it7.um, pil = !/^derived/.test(it7.derived);
    const tools: ToolBody[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ role: 'remove' as const, prof: [[r, 0], [r, t]] as [number, number][], at: [a! * h, 0, b! * h] as V3, why: `ISO 273 ${fit} clearance for the face's ${f.thread} screws: ${c[fit]} mm, on its ${f.holes} mm square` }));
    tools.push({ role: 'remove', prof: [[(f.pilot / 2) * MM, 0], [(f.pilot / 2) * MM, t]], at: [0, 0, 0], why: `the pilot's bore, ${f.pilot} H7 (ISO 286-1: 0 to +${dev} µm${pil ? ', its Table 1' : ', derived'}), through: the shaft passes it` });
    return { mirror: { kind: 'holes', size: { holes: f.holes, thread: f.thread, pilot: f.pilot }, std: 'NEMA ICS 16', fit: `ISO 273 ${fit}; pilot H7` }, tools, parts: [], why: tools.map((x) => x.why), checks: bolted(c[fit] * MM) };
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
    return { mirror: { kind: 'hole.clearance', size: { thread: th, d: c[fit] * MM }, std: 'ISO 273', fit: `ISO 273 ${fit}` }, tools, parts: [], why, checks: bolted(c[fit] * MM) };
  }
  // (into the host: a metal is tapped, as deep as the thread must reach (Bossard), drilled for tapping (ISO 2306) with two
  // pitches more for the tap's run-out (typical) and the drill's 118° point; a polymer takes a heat-set insert)
  if (fam === 'polymer') {
    const ins = INSERT[th]; if (!ins) return refuse('an insert maker\'s table', 0, 0, '', 'INSERT', `no heat-set insert row for ${th}`);
    const r = (ins.hole / 2) * MM, depth = ins.depth * MM; if (depth > t) return refuse('the insert\'s hole within the part', ins.depth, t / MM, 'mm', ins.src, `the ${ins.series}'s hole is ${ins.depth} mm deep, the part ${(t / MM).toFixed(1)} mm`);
    const insert: Part = { name: `heat-set insert ${th}`, item: `insert-${th.toLowerCase()}`, shape: { tube: { r: (ins.od / 2) * MM, wall: ((ins.od - d) / 2) * MM, pts: [[0, 0, 0], [0, -ins.L * MM, 0]] } }, at: [0, 0, 0], mat: 'brass', says: `${ins.series}: ${ins.L} mm long, ${ins.od} mm across, pressed in hot (${TABLE_SOURCES[ins.src]?.publisher ?? ins.src})` };
    const why = [`a ${fam}: a thread is not cut in it; a heat-set insert (${ins.series}) in a ${ins.hole} mm hole ${ins.depth} mm deep (${ins.src})`];
    return { mirror: { kind: 'hole.insert', size: { thread: th, d: ins.hole * MM, depth }, std: ins.src, fit: 'insert' }, tools: [{ role: 'remove', prof: [[r, 0], [r, depth], [0, depth + r / Math.tan(POINT)]], why: why[0]! }], parts: [insert], why, checks: bolted(ins.hole * MM) };
  }
  const e = engagementOf(host.material, it.class ?? '8.8'); if (!e) return refuse('a thread\'s engagement in this material', 0, 0, '', 'Bossard engagement', `no engagement row for ${fam}: ${host.material}`);
  const need = e.k * d; if (need * MM > t) return refuse('engagement', need, t / MM, 'mm', 'Bossard engagement', `an ${th} needs ${need.toFixed(1)} mm of thread (${e.why}); the part is ${(t / MM).toFixed(1)} mm`);
  const dr = TAP_DRILL[th]; if (!dr) return refuse('ISO 2306', 0, 0, '', 'ISO 2306', `no tap drill for ${th}`);
  const rd = (dr.drill / 2) * MM, depth = Math.min(t, (need + 2 * dr.P) * MM), blind = depth < t;
  const prof: [number, number][] = blind ? [[rd, 0], [rd, depth], [0, depth + rd / Math.tan(POINT)]] : [[rd, 0], [rd, t]];
  const why = [`tapped ${th}: drilled ${dr.drill} mm (ISO 2306), ${need.toFixed(1)} mm of thread (${e.why})${blind ? `, the drill ${(depth / MM).toFixed(1)} mm deep (two pitches for the tap's run-out, typical) and its 118° point` : ', through'}`];
  return { mirror: { kind: 'hole.tapped', size: { thread: th, drill: dr.drill * MM, thread_depth: need * MM }, std: 'ISO 2306', fit: '6H' }, tools: [{ role: 'remove', prof, why: why[0]! }], parts: [], why, checks: bolted(dr.drill * MM) };
}
const METRIC_OF = (th: string) => METRIC[th], NEMA_FACE_OF = (n: string) => NEMA_FACE[n];
const refuse = (rule: string, need: number, have: number, unit: string, source: string, why: string): Refusal => ({ refused: true, rule, need: +need.toFixed(3), have: +have.toFixed(3), unit, source, why });

/** The checks a bolt's or a screw's hole asks before it is cut (EN 1993-1-8 Table 3.3, from its hole d0, m): its edge
 *  distance from the hole's axis, that it breaks into no other hole, its spacing from them, the room its keep needs. */
function bolted(d0: number): PlannedCheck[] {
  const mmv = d0 / MM;
  return [{ check: 'edge distance', measure: 'across', need: BOLT_SPACING.e2.least(mmv) * MM, from: 'axis', rule: `e₂ ≥ 1.2 d₀ = 1.2 × ${mmv.toFixed(1)} mm`, source: 'EN 1993-1-8' },
    { check: 'breaking in', measure: 'breaking in', rule: 'the hole clear of the piece\'s other holes', source: 'its own cuts' },
    { check: 'spacing', measure: 'spacing', need: BOLT_SPACING.p1.least(mmv) * MM, rule: `p₁ ≥ 2.2 d₀ = 2.2 × ${mmv.toFixed(1)} mm`, source: 'EN 1993-1-8' },
    { check: 'room', measure: 'room', rule: 'room along the axis', source: 'its keep' }];
}

// ---- negatives as rows (spec 01, I17): one general path; every kind of seat a row of data ------------------------------
// A row says what a negative is in terms any kind shares: tables it looks up by a key or by the size band a size falls in,
// names worked out from them (expressions in generate.ts's language, SI with units written), the tools (turned, or any
// outline cut a depth), the limits its surfaces are held to (an ISO 286 class, or a table's own), the checks before cutting
// (each a measure the imprint makes on the host), the interface the host gains, and parts it adds (catalogue words). A row
// may have sides (a bearing's housing and its shaft; a key's shaft and hub). Nothing below names a kind: a new one is a row.
export interface TableDef { rows: Record<string, unknown> | unknown[]; /** a tuple's columns */ cols?: string[]; unit: Record<string, 'mm' | 'um' | '1' | 'text'>; /** a TABLE_SOURCES key, where a row has none */ src: string }
export interface Lookup { table: string; /** a key, its names in braces: '{b}x{h}' */ key?: Ex; /** a size whose band (over, up to) the row is */ band?: Ex; where?: Record<string, string>; /** a column's name in the scope */ as?: Record<string, string> }
export interface LetRow { name: string; ex: Ex; unit: 'mm' | '1'; says: string }
export interface ZoneRow { on: string; basic: Ex; /** an ISO 286 class, its names in braces */ cls?: string; lo?: Ex; hi?: Ex; src?: string; /** held only where this is true (the surface is made) */ when?: Ex }
export interface ToolRow { role: 'remove' | 'keep' | 'contact'; when?: Ex; turned?: [Ex, Ex][];
  outline?: { rect: [Ex, Ex]; r?: Ex } | { circle: Ex; notch?: { w: Ex; to: Ex } } | { pts: [Ex, Ex][] }; depth?: Ex;
  at?: [Ex, Ex, Ex]; r?: Ex; r0?: Ex; length?: Ex; along?: '+n' | '-n'; why: string }
export interface CheckRow { check: string; measure: Measure; have?: Ex; need?: Ex | [Ex, Ex]; most?: Ex; at?: Ex; from?: 'axis' | 'outline'; when?: Ex; rule: string; source: string }
export interface SideRow { frame: 'surface' | 'axis'; /** the material families it is made in (matter.ts) */ family?: string[]; lookups?: Lookup[]; let?: LetRow[];
  tools: ToolRow[]; zones?: ZoneRow[]; checks: CheckRow[];
  mirror: { kind: MirrorKind; sex: Port['sex']; takes: string; size: Record<string, Ex>; std: string; fit?: string; t?: Ex; joint: Joint };
  adds?: { words: string; at: [Ex, Ex, Ex]; why: string }[] }
export interface NegativeRow { of: { kind: string; says: string }; /** the sizes it is asked for */ asks: string[]; lookups: Lookup[]; let?: LetRow[];
  /** the asker's own surface and its class, so a fit is judged against it */ partner?: { on: string; cls: string }; /** why no fit is judged, where the asker's own limits are not held */ unjudged?: string;
  /** what it is asked for, as a board asks it by default (lengths in mm) */ example?: Record<string, number | string>;
  sides: Record<string, SideRow>; side: string; sources: string[] }
const UNIT = { mm: MM, um: 1e-6, '1': 1 } as const;
// ---- rows (data): the tables rows read and the rows; no code above or below names a row ---------------------------------
// (the words a line's name is read by (lineKind, above): data, as the rows are; read only when lineKind is called)
const ROLE_MOUNT = /^(holes|hole|screw holes|mounting holes|rack holes|truck holes|bolts|screws|screw|fixings|mounting|mount|hinge cups|slots?|tabs|tie rods|ends|tine \d+)$/;
const ROLE_FLUID = /^(ports?|in port|out port|work ports|supply ports|windows)$/;
const ROLE_ELEC = /^(leads?|side leads|pads?|exposed pad|terminals?|contacts?|wires|cores|lugs|entries|ln|e|line|bend|points|detent)$/;
const ROLE_PINS = /^(pins?|legs)$/;
const ELEC = /\b(header|DIP|SOIC|TSSOP|MSOP|QFN|TQFP|PLCC|SOT|TO-\d+|DO-\d+|1N\d+|L78\d+\w*|relay|switch|DHT\d*|buzzer|JST|digit|trimmer|LED|PCB|crystal|HC-49\/U|inductor|resistor|capacitor|tantalum|encoder|pot|jack|XT60|terminal|cable|core|wire|winding|transistor|cell|fuse|ferrule|lug|rocker|toggle|inlet|SG90 lead|perfboard|breadboard|1363|C14|6LR61|splice|tab|poles|insulator|plug)\b/i;
const POWER = /\b(cell|battery|fuse|cable(?! tie)|core \d|winding|lug|ferrule|XT60|terminal block|2\.5 mm²|mains|power|BS 1363|C14|6LR61|9 V|DC jack|DC plug|4 mm plug|rocker|toggle|tab|splice|copper wire|wire entries|poles|AA|18650|21700)\b/i;
const DATA = /\b(USB(-[A-C])?|RJ45|8P8C|Ethernet|HDMI|DE-9|D-sub|ICSP|SD card)\b/i;
const FLUID = /(\b(G ?\d+(\/\d+)?|NPT|BSP|DN ?\d+|NPS ?\d*|PN ?\d+|PEX|PVC|SDR ?\d+|JIC|ORB|ORFS|R\dAT)\b|pipe|hose|valve|nozzle|spout|inlet|outlet|downpipe|drain|air tube|compression|copper 15|barb|silencer|socket coupler|junction|gasket|bonded seal|filter regulator)/i;
const MECH_FIRST = /lead screw|lead nut|set screw|stem|knob|lever|handle|bonnet|clamp band|crimp ring/i;
const OPTICAL = /\b(lens|glass|lamp|bulb|LED|shade|optic|fibre|fiber|laser|mirror|prism)\b/i;
const ACOUSTIC = /\b(buzzer|speaker|microphone|ultrasonic|piezo|siren)\b/i;
const THREADED = /\b(M\d+(\.\d+)?|#\d+-\d+|\d+\/\d+-\d+|UNC|UNF)\b.*\b(shank|thread|stud|screw|bolt)\b/;
const THERMAL = /\b(heat ?sink|heat pipe|radiator|cooler|peltier|heater|thermal pad)\b/i;
// (each cell read by two readers apart from its source (spec 01, I15, its cases 6 and 11 to 14); only the cells those cases
// read are held, so any other size or kind is refused, never guessed: reading more is the readers' work, row by row)
/** SKF's abutments for a bearing (its product page, read in inches and converted): the shaft's shoulder at least da_min, the
 *  housing's at most Da_max, their fillets at most ra_max, mm. */
export const SEAT: Record<string, { da_min: number; Da_max: number; ra_max: number; src: string }> = { '6205': { da_min: 30.6, Da_max: 46.4, ra_max: 1.0, src: 'SKF 6205' } };
/** SKF's classes for a radial ball bearing's shaft and housing, by its duty and ring, read at 25 and 52 mm only: the bands
 *  as SKF prints them are still to be read, so a size between is refused. */
export const BEARING_FIT: { duty: string; ring: 'inner' | 'outer'; over: number; upTo: number; cls: string; src: string }[] = [
  { duty: 'rotating inner ring, normal load', ring: 'inner', over: 24.999, upTo: 25, cls: 'k5', src: 'SKF 17000/1' },
  { duty: 'rotating inner ring, normal load', ring: 'outer', over: 51.999, upTo: 52, cls: 'H7', src: 'SKF 17000/1' },
];
/** DIN 6885-1 keyways for a key b × h: the shaft's depth t1 and the hub's t2, each with its upper deviation, mm. */
export const KEYWAY: Record<string, { t1: number; t1_hi: number; t2: number; t2_hi: number; src: string }> = { '8x7': { t1: 4.0, t1_hi: 0.2, t2: 3.3, t2_hi: 0.2, src: 'DIN 6885-1' } };
/** DIN 6885-1's fits for a keyway's width, by the fit asked: the shaft's class and the hub's. */
export const KEY_FIT: Record<string, { shaft: string; hub: string; src: string }> = { normal: { shaft: 'N9', hub: 'JS9', src: 'DIN 6885-1' } };
/** A dowel's own class, by its standard (ISO 8734, hardened: m6 only). */
export const PIN_FIT: Record<string, { cls: string; src: string }> = { 'ISO 8734': { cls: 'm6', src: 'ISO 8734' } };
/** A dowel's hole, by how the part is held: located for good (H7, its makers' transition fit with m6), or to come off (G7,
 *  the makers' advice, not a standard). */
export const HOLE_FIT: Record<string, { cls: string; src: string }> = { located: { cls: 'H7', src: 'MISUMI fits' }, removable: { cls: 'G7', src: 'EKINSUN dowels' } };
/** ISO 228-1 Table 1: a G thread's minor diameter, mm (the table rules: the formula gives 18.6315 for G 1/2). */
export const G_THREAD: Record<string, { minor: number; src: string }> = { 'G1/2': { minor: 18.631, src: 'ISO 228-1' } };
/** A G thread's tapping drill for a cutting tap, mm. */
export const G_TAP_DRILL: Record<string, { drill: number; src: string }> = { 'G1/2': { drill: 19.0, src: 'BSP taps' } };
/** ISO 1179-1 Table 1, a port for a G thread: the drill at least drillDepth deep (a bottoming tap), full thread at least
 *  threadDepth, a 90° chamfer to chamfer (+chamferHi), a spot face at least spot across (type N) no more than spotDepthMax
 *  below the surface, mm. */
export const G_PORT: Record<string, { drillDepth: number; threadDepth: number; spot: number; spotDepthMax: number; chamfer: number; chamferHi: number; src: string }> = {
  'G1/2': { drillDepth: 19, threadDepth: 15, spot: 28, spotDepthMax: 2.5, chamfer: 21, chamferHi: 0.2, src: 'ISO 1179-1' },
};
/** IEC 60947-5-1, a 22 mm control device's cut-out: the hole d (+dHi), its key recess notchW wide (+notchWHi), the hole and
 *  recess across both (+acrossHi), its corners at most cornerMax round; the panel panelMin to panelMax thick; centres at
 *  least pitchRow apart in a row and pitchRows between rows (the standard's preferred), mm. */
export const CUTOUT: Record<string, { d: number; dHi: number; notchW: number; notchWHi: number; across: number; acrossHi: number; cornerMax: number; panelMin: number; panelMax: number; pitchRow: number; pitchRows: number; src: string }> = {
  D22: { d: 22.3, dHi: 0.4, notchW: 3.2, notchWHi: 0.2, across: 24.1, acrossHi: 0.4, cornerMax: 0.8, panelMin: 1, panelMax: 6, pitchRow: 30, pitchRows: 50, src: 'IEC 60947-5-1' },
};
/** The tables rows read, by name: each the standard's own table, held once (joined here, never copied). */
export const TABLES: Record<string, TableDef> = {
  CLEARANCE: { rows: CLEARANCE, unit: { fine: 'mm', medium: 'mm', coarse: 'mm' }, src: 'ISO 273' },
  BEARINGS: { rows: BEARINGS, cols: ['d', 'D', 'B'], unit: { d: 'mm', D: 'mm', B: 'mm' }, src: 'ISO 15' },
  KEYS: { rows: KEYS, cols: ['over', 'upTo', 'b', 'h'], unit: { b: 'mm', h: 'mm' }, src: 'DIN 6885-1' },
  BSP: { rows: BSP, cols: ['d', 'tpi'], unit: { d: 'mm', tpi: '1' }, src: 'ISO 228-1' },
  SEAT: { rows: SEAT, unit: { da_min: 'mm', Da_max: 'mm', ra_max: 'mm' }, src: 'SKF 6205' },
  BEARING_FIT: { rows: BEARING_FIT, unit: { cls: 'text' }, src: 'SKF 17000/1' },
  KEYWAY: { rows: KEYWAY, unit: { t1: 'mm', t1_hi: 'mm', t2: 'mm', t2_hi: 'mm' }, src: 'DIN 6885-1' },
  KEY_FIT: { rows: KEY_FIT, unit: { shaft: 'text', hub: 'text' }, src: 'DIN 6885-1' },
  PIN_FIT: { rows: PIN_FIT, unit: { cls: 'text' }, src: 'ISO 8734' },
  HOLE_FIT: { rows: HOLE_FIT, unit: { cls: 'text' }, src: 'MISUMI fits' },
  G_THREAD: { rows: G_THREAD, unit: { minor: 'mm' }, src: 'ISO 228-1' },
  G_TAP_DRILL: { rows: G_TAP_DRILL, unit: { drill: 'mm' }, src: 'BSP taps' },
  G_PORT: { rows: G_PORT, unit: { drillDepth: 'mm', threadDepth: 'mm', spot: 'mm', spotDepthMax: 'mm', chamfer: 'mm', chamferHi: 'mm' }, src: 'ISO 1179-1' },
  CUTOUT: { rows: CUTOUT, unit: { d: 'mm', dHi: 'mm', notchW: 'mm', notchWHi: 'mm', across: 'mm', acrossHi: 'mm', cornerMax: 'mm', panelMin: 'mm', panelMax: 'mm', pitchRow: 'mm', pitchRows: 'mm' }, src: 'IEC 60947-5-1' },
};
const CLEAR_OF_HOLES: CheckRow = { check: 'breaking in', measure: 'breaking in', rule: 'clear of the piece\'s other holes', source: 'its own cuts' };
/** The rows, by name: each kind of seat, hole or cut-out a row of data, read by negativeOfRow. */
export const NEGATIVE_ROWS: Record<string, NegativeRow> = {
  // (a 6205's seats: the housing's bore and shoulder, the shaft's journal and shoulder, each ring's class from SKF's tables
  // and its limits from ISO 286; the fit with the ring is not judged, its own tolerance (ISO 492) not held)
  'bearing seat': { of: { kind: 'bearing seat', says: 'a rolling bearing\'s seat: the housing\'s bore and shoulder, or the shaft\'s journal and shoulder' }, asks: ['number', 'duty'], example: { number: '6205', duty: 'rotating inner ring, normal load' },
    lookups: [{ table: 'BEARINGS', key: '{number}' }, { table: 'SEAT', key: '{number}' }], unjudged: 'the ring\'s own tolerance (ISO 492) is not held here',
    sides: {
      housing: { frame: 'surface', lookups: [{ table: 'BEARING_FIT', band: 'D', where: { ring: 'outer', duty: '{duty}' }, as: { cls: 'fit' } }],
        tools: [{ role: 'remove', when: 't > B + 0.5 mm', turned: [['D/2', '0'], ['D/2', 'B'], ['Da_max/2', 'B'], ['Da_max/2', 't']], why: 'the outer ring\'s bore Ø{D} mm, {B} mm deep (ISO 15), then its shoulder Ø{Da_max} mm through (SKF 6205: at most)' },
          { role: 'remove', when: 't <= B + 0.5 mm', turned: [['D/2', '0'], ['D/2', 't']], why: 'the outer ring\'s bore Ø{D} mm through (ISO 15): no shoulder, the ring held otherwise' },
          { role: 'contact', when: 't > B + 0.5 mm', r0: 'Da_max/2', r: 'D/2', at: ['0', '-B', '0'], why: 'the outer ring bears on the shoulder from Ø{Da_max} to Ø{D} mm, {B} mm in (SKF 6205)' }],
        zones: [{ on: 'D', basic: 'D', cls: '{fit}' }, { on: 'Da', basic: 'Da_max', hi: '0', src: 'SKF 6205', when: 't > B + 0.5 mm' }, { on: 'ra', basic: 'ra_max', hi: '0', src: 'SKF 6205', when: 't > B + 0.5 mm' }],
        checks: [{ check: 'depth', measure: 'value', have: 't', need: 'B', rule: 'the ring\'s width within the housing: t ≥ B = {B} mm (ISO 15)', source: 'ISO 15' },
          { check: 'edge distance', measure: 'across', need: '0', from: 'outline', rule: 'the seat within the housing (no least housing wall is sourced: only that it is whole)', source: 'derived' }, CLEAR_OF_HOLES],
        mirror: { kind: 'bore', sex: 'holes', takes: 'Ø{D}', size: { d: 'D', B: 'B' }, std: 'ISO 15', fit: '{fit}', t: 'B', joint: 'fixed' } },
      shaft: { frame: 'axis', lookups: [{ table: 'BEARING_FIT', band: 'd', where: { ring: 'inner', duty: '{duty}' }, as: { cls: 'fit' } }],
        tools: [{ role: 'contact', r0: 'd/2', r: 'da_min/2', at: ['0', '-B', '0'], why: 'the inner ring bears on the shaft\'s shoulder from Ø{d} to Ø{da_min} mm, {B} mm along (SKF 6205)' }],
        zones: [{ on: 'd', basic: 'd', cls: '{fit}' }, { on: 'da', basic: 'da_min', lo: '0', src: 'SKF 6205' }, { on: 'ra', basic: 'ra_max', hi: '0', src: 'SKF 6205' }],
        checks: [{ check: 'depth', measure: 'value', have: 't', need: 'B', rule: 'the ring\'s width on the shaft: t ≥ B = {B} mm (ISO 15)', source: 'ISO 15' },
          { check: 'seat', measure: 'across', at: 'B/2', need: 'd/2 - 0.25 mm', most: 'd/2 + 0.25 mm', rule: 'the journal Ø{d} mm within 0.5 mm as it stands: a seat to turn down is not made here (derived)', source: 'derived' },
          { check: 'shoulder', measure: 'across', at: 'B + 0.5 mm', need: 'da_min/2', when: 'have > d/2 + 0.25 mm', rule: 'the shoulder at least Ø{da_min} mm (SKF 6205); where the shaft runs on no wider than its journal, none: the ring located otherwise', source: 'SKF 6205' }],
        mirror: { kind: 'shaft', sex: 'pins', takes: 'Ø{d}', size: { d: 'd', B: 'B' }, std: 'ISO 15', fit: '{fit}', joint: 'fixed' } } },
    side: 'housing', sources: ['ISO 15', 'SKF 6205', 'SKF 17000/1', 'ISO 286-2 deviations'] },
  // (a dowel's hole in each plate it locates: its class by how the part is held, judged against the pin's own m6)
  'dowel hole': { of: { kind: 'dowel hole', says: 'a dowel\'s hole: the pin locating two parts, its hole held to a class' }, asks: ['d', 'std', 'hold'], example: { d: 6, std: 'ISO 8734', hold: 'located' },
    lookups: [{ table: 'PIN_FIT', key: '{std}', as: { cls: 'pin' } }, { table: 'HOLE_FIT', key: '{hold}', as: { cls: 'hole' } }], partner: { on: 'd', cls: '{pin}' },
    sides: { plate: { frame: 'surface', tools: [{ role: 'remove', turned: [['d/2', '0'], ['d/2', 't']], why: 'the hole for an {std} dowel, Ø{d} mm through, {hole} ({hold})' }],
      zones: [{ on: 'd', basic: 'd', cls: '{hole}' }],
      checks: [{ check: 'edge distance', measure: 'across', need: '0', from: 'outline', rule: 'the hole within the plate (no edge distance for a dowel is sourced: only that it is whole)', source: 'derived' }, CLEAR_OF_HOLES],
      mirror: { kind: 'bore', sex: 'holes', takes: 'Ø{d}', size: { d: 'd' }, std: '{std}', fit: '{hole}/{pin}', joint: 'fixed' } } },
    side: 'plate', sources: ['ISO 8734', 'MISUMI fits', 'EKINSUN dowels', 'ISO 286-2 deviations'] },
  // (a parallel key's keyways: the shaft's milled with round ends and the key standing out of it; the hub's broached
  // through its length, square, started where the bore falls away under its corners)
  'parallel key': { of: { kind: 'parallel key', says: 'a parallel key\'s keyways: the shaft\'s, milled with round ends, and the hub\'s, broached through' }, asks: ['d', 'L', 'fit'], example: { d: 30, L: 40, fit: 'normal' },
    lookups: [{ table: 'KEYS', band: 'd' }, { table: 'KEYWAY', key: '{b}x{h}' }, { table: 'KEY_FIT', key: '{fit}', as: { shaft: 'shaftFit', hub: 'hubFit' } }],
    sides: {
      shaft: { frame: 'surface', tools: [{ role: 'remove', outline: { rect: ['L', 'b'], r: 'b/2' }, depth: 't1', why: 'the shaft\'s keyway {b} mm wide and {L} mm long, its ends round (an end mill\'s), {t1} mm deep (DIN 6885-1)' }],
        zones: [{ on: 'b', basic: 'b', cls: '{shaftFit}' }, { on: 't1', basic: 't1', lo: '0', hi: 't1_hi', src: 'DIN 6885-1' }],
        checks: [{ check: 'shaft', measure: 'value', have: 't', need: 'd - 0.5 mm', most: 'd + 0.5 mm', rule: 'the shaft met as asked, Ø{d} mm within 0.5 mm (derived)', source: 'derived' },
          { check: 'length', measure: 'across', at: 't1/2', need: '0', from: 'outline', rule: 'the keyway within the shaft (derived)', source: 'derived' }, CLEAR_OF_HOLES],
        mirror: { kind: 'keyway', sex: 'holes', takes: 'key {b}x{h}', size: { b: 'b', h: 'h', L: 'L', t1: 't1' }, std: 'DIN 6885-1', fit: '{shaftFit}', t: 't1', joint: 'slider' },
        adds: [{ words: 'key {b}x{h}x{L}', at: ['0', 'h/2 - t1', '0'], why: 'the key in its keyway, standing out of it (DIN 6885-1); the hub held along it by a circlip or a set screw, not made here' }] },
      hub: { frame: 'surface', tools: [{ role: 'remove', outline: { rect: ['span + 0.02 mm', 'b'] }, depth: 't2', at: ['mid', '0', '0'], why: 'the hub\'s keyway {b} mm wide through its length, {t2} mm deep, its corners square (broached; DIN 6885-1)' }],
        zones: [{ on: 'b', basic: 'b', cls: '{hubFit}' }, { on: 't2', basic: 't2', lo: '0', hi: 't2_hi', src: 'DIN 6885-1' }],
        checks: [{ check: 'bore', measure: 'value', have: 'free', need: 'd - 0.5 mm', most: 'd + 0.5 mm', rule: 'the hub\'s bore met as asked, Ø{d} mm within 0.5 mm (derived)', source: 'derived' },
          { check: 'wall', measure: 'value', have: 't', need: 't2', rule: 'the hub\'s wall deeper than its keyway (no least wall is sourced; derived)', source: 'derived' }],
        mirror: { kind: 'keyway', sex: 'holes', takes: 'key {b}x{h}', size: { b: 'b', h: 'h', t2: 't2' }, std: 'DIN 6885-1', fit: '{hubFit}', t: 't2', joint: 'slider' } } },
    side: 'shaft', sources: ['DIN 6885-1', 'ISO 286-2 deviations'] },
  // (a port for a parallel pipe thread: drilled, chamfered and tapped, its seal on the face; in metal only)
  'pipe port': { of: { kind: 'pipe port', says: 'a port for a parallel pipe thread, sealed on its face (ISO 1179-1)' }, asks: ['thread'], example: { thread: 'G1/2' },
    lookups: [{ table: 'BSP', key: '{thread}' }, { table: 'G_THREAD', key: '{thread}' }, { table: 'G_PORT', key: '{thread}' }, { table: 'G_TAP_DRILL', key: '{thread}' }],
    let: [{ name: 'P', ex: '25.4 mm / tpi', unit: 'mm', says: 'its pitch, 25.4 mm over the threads in it (derived)' }],
    sides: { port: { frame: 'surface', family: ['steel', 'stainless steel', 'cast iron', 'aluminium', 'copper alloy'],
      tools: [{ role: 'remove', turned: [['chamfer/2', '0'], ['drill/2', '(chamfer - drill)/2'], ['drill/2', 'drillDepth'], ['0', 'drillDepth + drill/2 / tan(59 deg)']], why: 'the tap drill Ø{drill} mm (BSP taps), {drillDepth} mm deep and its 118° point beyond, under a 90° chamfer to Ø{chamfer} mm (ISO 1179-1)' },
        { role: 'contact', r0: 'chamfer/2', r: 'spot/2', at: ['0', '0', '0'], why: 'the seal on the face from Ø{chamfer} to Ø{spot} mm (ISO 1179-1): a G thread does not seal on its flanks (ISO 228-1)' }],
      zones: [{ on: 'chamfer', basic: 'chamfer', lo: '0', hi: 'chamferHi', src: 'ISO 1179-1' }, { on: 'drill depth', basic: 'drillDepth', lo: '0', src: 'ISO 1179-1' }, { on: 'thread depth', basic: 'threadDepth', lo: '0', src: 'ISO 1179-1' },
        { on: 'spot face', basic: 'spot', lo: '0', src: 'ISO 1179-1' }, { on: 'spot face depth', basic: 'spotDepthMax', hi: '0', src: 'ISO 1179-1' }],
      checks: [{ check: 'depth', measure: 'value', have: 't', need: 'drillDepth', rule: 'the tap drill at least {drillDepth} mm deep within the block (ISO 1179-1)', source: 'ISO 1179-1' },
        { check: 'drill point', measure: 'value', have: 't', need: 'drillDepth + drill/2 / tan(59 deg)', rule: 'the drill\'s 118° point within the block too (derived)', source: 'derived' },
        { check: 'face', measure: 'across', at: '0.5 mm', need: 'spot/2', rule: 'a face at least Ø{spot} mm round the port, taken as machined flat (ISO 1179-1)', source: 'ISO 1179-1' }, CLEAR_OF_HOLES],
      mirror: { kind: 'thread.internal', sex: 'threads', takes: '{thread}', size: { d: 'd', minor: 'minor', P: 'P' }, std: 'ISO 1179-1', fit: 'ISO 228-1', t: 'threadDepth', joint: 'fixed' } } },
    side: 'port', sources: ['ISO 228-1', 'ISO 1179-1', 'BSP taps'] },
  // (a panel's cut-out for a 22 mm control device, its key recess cut with it, its corners sharp within the limit)
  'panel cut-out': { of: { kind: 'panel cut-out', says: 'a panel\'s cut-out for a 22 mm control device, its key recess with it' }, asks: ['device'], example: { device: 'D22' },
    lookups: [{ table: 'CUTOUT', key: '{device}' }],
    sides: { panel: { frame: 'surface', tools: [{ role: 'remove', outline: { circle: 'd', notch: { w: 'notchW', to: 'across - d/2' } }, depth: 't', why: 'the cut-out Ø{d} mm and its key recess {notchW} mm wide, {across} mm across both (IEC 60947-5-1)' }],
      zones: [{ on: 'd', basic: 'd', lo: '0', hi: 'dHi', src: 'IEC 60947-5-1' }, { on: 'recess width', basic: 'notchW', lo: '0', hi: 'notchWHi', src: 'IEC 60947-5-1' }, { on: 'across the recess', basic: 'across', lo: '0', hi: 'acrossHi', src: 'IEC 60947-5-1' },
        { on: 'corner radius', basic: 'cornerMax', hi: '0', src: 'IEC 60947-5-1' }],
      checks: [{ check: 'panel', measure: 'value', have: 't', need: 'panelMin', most: 'panelMax', rule: 'a panel {panelMin} to {panelMax} mm thick (IEC 60947-5-1)', source: 'IEC 60947-5-1' },
        { check: 'spacing', measure: 'spacing', need: ['pitchRow', 'pitchRows'], rule: 'centres at least {pitchRow} mm apart in a row, {pitchRows} mm between rows (IEC 60947-5-1)', source: 'IEC 60947-5-1' },
        { check: 'edge distance', measure: 'across', need: '0', from: 'outline', rule: 'the cut-out within the panel (derived)', source: 'derived' }, CLEAR_OF_HOLES],
      mirror: { kind: 'cutout', sex: 'holes', takes: '{device}', size: { d: 'd', across: 'across', notchW: 'notchW' }, std: 'IEC 60947-5-1', joint: 'fixed' } } },
    side: 'panel', sources: ['IEC 60947-5-1'] },
};
// ---- end of rows
const named = (T: TableDef, r: unknown): Record<string, unknown> | null => (r === undefined || r === null ? null : Array.isArray(r) ? Object.fromEntries((T.cols ?? []).map((c, i) => [c, r[i]])) : (r as Record<string, unknown>));
function keyedRow(T: TableDef, key: string): Record<string, unknown> | null { return Array.isArray(T.rows) ? null : named(T, (T.rows as Record<string, unknown>)[key]); }
function bandedRow(T: TableDef, x: number, where: Record<string, string>): Record<string, unknown> | null {
  const all = (Array.isArray(T.rows) ? T.rows : Object.values(T.rows)).map((r) => named(T, r)!);
  return all.find((r) => x > Number(r.over) && x <= Number(r.upTo) && Object.entries(where).every(([k, v]) => String(r[k]) === v)) ?? null;
}
const fmt = (v: number, unit: 'mm' | '1' = 'mm') => (unit === '1' ? `${+v.toPrecision(6)}` : `${+(v / MM).toFixed(3)} mm`);
/** An outline from a row (m): a rectangle or slot, a circle with its key recess, or points. */
function outlineOf(o: NonNullable<ToolRow['outline']>, ev: (e: Ex) => number): [number, number][] {
  if ('rect' in o) return roundedRect(ev(o.rect[0]), ev(o.rect[1]), o.r ? ev(o.r) : 0);
  if ('circle' in o) return notchedCircle(ev(o.circle), o.notch ? { w: ev(o.notch.w), to: ev(o.notch.to) } : undefined);
  return o.pts.map(([x, y]) => [ev(x), ev(y)]);
}
/** Whether a negative stands on a surface where it is met, or on the axis of the round piece it is put on (a shaft's seat). */
export function frameOfAsking(a: Asking, rows: Record<string, NegativeRow> = NEGATIVE_ROWS): 'surface' | 'axis' {
  if (!('row' in a)) return 'surface'; const row = rows[a.row]; return row?.sides[a.side ?? row.side]?.frame ?? 'surface';
}
/** A row's negative for the host as measured: its tables read, its names worked out, its 'value' checks settled (the first
 *  that fails refuses), its tools, limits and fit made, its mirror and the parts it adds said; what cannot be read refused. */
function negativeOfRow(a: RowAsking, host: HostMeasure, rows: Record<string, NegativeRow>): Negative | Refusal {
  try {
    const row = rows[a.row]; if (!row) return refuse('a negative row', 0, 0, '', 'NEGATIVE_ROWS', `no row "${a.row}"`);
    const sideName = a.side ?? row.side, side = row.sides[sideName]; if (!side) return refuse('a side of the row', 0, 0, '', row.sources[0] ?? '', `the ${a.row} row has no side "${sideName}" (it has ${Object.keys(row.sides).join(', ')})`);
    const fam = matterOf(host.material).family;
    if (side.family && !side.family.includes(fam)) return refuse('a negative for this material', 0, 0, '', row.sources[0] ?? '', `no ${a.row} (${sideName}) row for a ${fam}`);
    const nums: Record<string, number> = { t: host.thickness }, texts: Record<string, string> = {}, units: Record<string, 'mm' | '1'> = { t: 'mm' }, why: string[] = [];
    for (const k of ['span', 'mid', 'free'] as const) if (host[k] !== undefined && Number.isFinite(host[k])) { nums[k] = host[k]!; units[k] = 'mm'; }
    for (const [k, v] of Object.entries(a.size)) if (typeof v === 'number') { nums[k] = v; units[k] = 'mm'; } else texts[k] = v;
    const ev = (e: Ex) => num(e, scopeOf(nums)), fill = (x: string) => x.replace(/\{(\w+)\}/g, (_, k: string) => texts[k] ?? (k in nums ? fmt(nums[k]!, units[k]).replace(/ mm$/, '') : `{${k}}`));
    for (const L of [...row.lookups, ...(side.lookups ?? [])]) {
      const T = TABLES[L.table]; if (!T) return refuse(`a ${L.table} table`, 0, 0, '', 'TABLES', `no table ${L.table}`);
      const key = L.key !== undefined ? fill(L.key) : undefined, x = L.band !== undefined ? Math.round(ev(L.band) / MM * 1000) / 1000 : undefined; // (to a µm: a measured 30.0000001 is 30)
      const r = key !== undefined ? keyedRow(T, key) : bandedRow(T, x!, Object.fromEntries(Object.entries(L.where ?? {}).map(([k, v]) => [k, fill(v)])));
      if (!r) return refuse(`a ${L.table} row`, 0, 0, '', T.src, `no ${L.table} row for ${key ?? `${x} mm`} (${TABLE_SOURCES[T.src]?.title ?? T.src}): not read for it`);
      for (const [c, v] of Object.entries(r)) { if (['src', 'over', 'upTo'].includes(c) || (L.where && c in L.where)) continue; const nm = L.as?.[c] ?? c, u = T.unit[c];
        if (u === undefined) continue; if (u === 'text') texts[nm] = String(v); else { nums[nm] = Number(v) * UNIT[u]; units[nm] = u === '1' ? '1' : 'mm'; } }
      why.push(`${L.table} ${key ?? `over ${String(r.over)} to ${String(r.upTo)} mm`} (${String(r.src ?? T.src)})`);
    }
    for (const l of [...(row.let ?? []), ...(side.let ?? [])]) { nums[l.name] = ev(l.ex); units[l.name] = l.unit; why.push(`${l.name} ${fmt(nums[l.name]!, l.unit)}: ${l.says}`); }
    const checks: PlannedCheck[] = [];
    for (const c of side.checks) {
      const base: PlannedCheck = { check: c.check, measure: c.measure, rule: fill(c.rule), source: c.source, ...(c.when ? { when: c.when } : {}), ...(c.from ? { from: c.from } : {}),
        ...(c.need !== undefined ? { need: Array.isArray(c.need) ? (c.need.map(ev) as [number, number]) : ev(c.need) } : {}), ...(c.most !== undefined ? { most: ev(c.most) } : {}), ...(c.at !== undefined ? { at: ev(c.at) } : {}) };
      if (c.measure !== 'value') { checks.push(base); continue; }
      const have = ev(c.have!); if (c.when && !truth(c.when, scopeOf({ ...nums, have }))) { checks.push({ ...base, done: { have } }); continue; }
      const need = base.need as number | undefined;
      if (need !== undefined && have < need - 1e-9) return refuse(c.check, need / MM, have / MM, 'mm', c.source, `${c.check} ${fmt(have)}: ${base.rule}`);
      if (base.most !== undefined && have > base.most + 1e-9) return refuse(c.check, base.most / MM, have / MM, 'mm', c.source, `${c.check} ${fmt(have)}: ${base.rule}`);
      checks.push({ ...base, done: { have } });
    }
    const tools = side.tools.filter((x) => !x.when || truth(x.when, scopeOf(nums))).map((x): ToolBody => ({ role: x.role, why: fill(x.why),
      ...(x.turned ? { prof: x.turned.map(([r, d]) => [ev(r), ev(d)] as [number, number]) } : {}),
      ...(x.outline ? { sect: outlineOf(x.outline, ev), depth: ev(x.depth!) } : {}),
      ...(x.at ? { at: x.at.map(ev) as V3 } : {}), ...(x.r !== undefined ? { r: ev(x.r) } : {}), ...(x.r0 !== undefined ? { r0: ev(x.r0) } : {}), ...(x.length !== undefined ? { length: ev(x.length) } : {}), ...(x.along ? { along: x.along } : {}) }));
    const limits: Limit[] = [];
    for (const z of side.zones ?? []) { if (z.when && !truth(z.when, scopeOf(nums))) continue; const basic = ev(z.basic);
      if (z.cls) { const L = limitsOf(fill(z.cls), +(basic / MM).toFixed(6)); if ('refused' in L) return L; limits.push({ on: z.on, basic, loUm: L.loUm, hiUm: L.hiUm, cls: fill(z.cls), src: L.src, says: `${z.on}: ${L.says}` }); }
      else { const lo = z.lo !== undefined ? +(ev(z.lo) / 1e-6).toFixed(3) : undefined, hi = z.hi !== undefined ? +(ev(z.hi) / 1e-6).toFixed(3) : undefined;
        limits.push({ on: z.on, basic, ...(lo !== undefined ? { loUm: lo } : {}), ...(hi !== undefined ? { hiUm: hi } : {}), src: z.src ?? row.sources[0] ?? '', says: `${z.on} ${fmt(basic)}${lo !== undefined && hi !== undefined ? `, ${lo >= 0 ? '+' : ''}${lo} to ${hi >= 0 ? '+' : ''}${hi} µm` : lo !== undefined ? ', at least' : hi !== undefined ? ', at most' : ''} (${z.src ?? row.sources[0] ?? ''})` }); } }
    let fit: FitJudged | undefined;
    if (row.partner) { const mine = limits.find((l) => l.on === row.partner!.on); const P = mine ? limitsOf(fill(row.partner.cls), +(mine.basic / MM).toFixed(6)) : null;
      if (P && 'refused' in P) return P; if (mine && P && mine.loUm !== undefined && mine.hiUm !== undefined) fit = side.mirror.sex === 'holes' ? fitOf({ loUm: mine.loUm, hiUm: mine.hiUm }, P) : fitOf(P, { loUm: mine.loUm, hiUm: mine.hiUm }); }
    const m = side.mirror;
    return { row: a.row, side: sideName, frame: side.frame, tools, parts: [], checks, limits, scope: nums, ...(fit ? { fit } : {}),
      mirror: { kind: m.kind, sex: m.sex, takes: fill(m.takes), size: Object.fromEntries(Object.entries(m.size).map(([k, v]) => [k, ev(v)])), std: fill(m.std), ...(m.fit ? { fit: fill(m.fit) } : {}), ...(m.t !== undefined ? { t: ev(m.t) } : {}), joint: m.joint },
      adds: (side.adds ?? []).map((p) => ({ words: fill(p.words), at: p.at.map(ev) as V3, why: fill(p.why) })),
      why: [...why, ...tools.map((x) => x.why), ...limits.map((l) => l.says), fit?.why ?? (row.partner ? 'the fit not judged: a limit not held' : row.unjudged ? `the fit not judged: ${row.unjudged}` : '')].filter(Boolean) };
  } catch (e) { return refuse('a row that evaluates', 0, 0, '', 'NEGATIVE_ROWS', `${a.row}: ${(e as Error).message}`); }
}

