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
