// The interface record (spec 01, tasks I1 and I2; decisions 0004 and 0014): what a part offers, or asks of, what it meets.
// Read here, never written: each port (holes, threads, pins, a frame) and each old interface (`iface`: a shaft and its
// bore, studs and their nuts, a drive, a chain, a mount) of every part in a thing becomes one record, with an id that says
// where it is (the names from the thing asked down to the part that carries it, then its own name) and a frame, where
// one is known, in the thing's own frame. No part is changed. A name repeated among siblings is told apart by where the
// sibling stands; one still alike is reported as a clash, never numbered. The negatives (the hole a bolt needs, its
// counterbore) and the standards' tables they read come next (I3 onward); mating by interfaces is mate.ts's.

import * as THREE from 'three';
import type { Iface, Part, Port, V3 } from './kits';
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
const r3 = (x: number) => Math.round(x * 1e4) / 1e4, mm = (x: number) => Math.round(x * 1e4) / 10;
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
      list.push({ id: [...path, name].join('/'), name, kind: k.kind, mates: k.mates, frame: null, from: { iface: f.kind, role: f.role },
        size: { ...(f.d !== undefined ? { [f.kind === 'chain' ? 'pitch' : 'd']: f.d } : {}), ...(f.n !== undefined ? { n: f.n } : {}), ...(f.torque !== undefined ? { torque: f.torque } : {}) },
        ...(p.joint ? { joint: p.joint } : {}), ...(f.to ? { to: f.to } : {}), ...(f.says ? { says: f.says } : {}) }); });
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
