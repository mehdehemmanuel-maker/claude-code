// Assemblies: things placed, not copied. A part (src/nexus/kits.ts) or another assembly is placed at a place, turned, at
// a scale, and with what is changed about it there (its colour, its material, its finish, its size, hidden); the thing
// itself is shared by every place it is put, never copied. So a motor saved once and put on a drone four times, the drone
// put a hundred times in a swarm, and the swarm over a city of a thousand buildings are each stored once: what grows with
// the city is the list of places, and what is drawn is one instanced mesh for each distinct piece (src/nexus/view/
// space3d.ts). What it weighs, what it spans and how many pieces it places are worked out once for each distinct thing
// and change, and kept with it.
//
// A part's own tree (a bolt's head, shank and thread) is laid out once into its leaves, each with its matrix in the
// part's frame (make/space.ts's layout); an assembly composes matrices down to them.

import * as THREE from 'three';
import type { Part, Port, V3 } from './kits';
import { DENSITY, massOf } from './mass';
import { layout } from './make/space';

/** What is changed about a thing where it is placed: on every piece, or those whose names a pattern finds. The change
 *  made further out wins (a swarm's colour over the drone's), as a variant of a whole thing should. */
export interface Override { color?: number; mat?: string; finish?: string; hide?: boolean; /** stretched along its own x, y, z */ scale?: V3; /** a pattern on the pieces' names ("motor", "prop|blade") */ path?: string }
export interface Placed { of: Part | Assembly; at: V3; rot: V3; s: number; over?: Override }
export interface Assembly {
  name: string; items: Placed[]; ports?: Port[]; says?: string;
  /** Repeated for ever on a lattice (`step` apart along x, y and z; 0: not along that one), each cell one of `variants`
   *  picked by a hash of the cell and the seed: drawn only round where it is seen from. Its items are the cell at the
   *  origin, so what it weighs and spans is one cell's. */
  tiled?: { step: V3; variants: (Part | Assembly)[]; seed: number };
}
/** The variant a cell of a lattice gets: the same cell and seed, the same one, wherever it is drawn from. */
export function cellPick(i: number, j: number, k: number, seed: number, n: number): number {
  let h = (Math.imul(i | 0, 73856093) ^ Math.imul(j | 0, 19349663) ^ Math.imul(k | 0, 83492791) ^ Math.imul(seed | 0, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
  return n > 0 ? h % n : 0;
}

export const isAssembly = (x: unknown): x is Assembly => !!x && typeof x === 'object' && Array.isArray((x as Assembly).items);
export const isPart = (x: unknown): x is Part => !!x && typeof x === 'object' && !isAssembly(x) && typeof (x as Part).name === 'string';
/** A part, or an assembly, as an assembly: a part alone is one placed at the origin. */
export function asAssembly(x: Part | Assembly): Assembly { return isAssembly(x) ? x : lifted(x); }
const lifts = new WeakMap<Part, Assembly>();
function lifted(p: Part): Assembly { let a = lifts.get(p); if (!a) { a = { name: p.name, items: [{ of: p, at: [0, 0, 0], rot: [0, 0, 0], s: 1 }] }; lifts.set(p, a); } return a; }
export const place = (of: Part | Assembly, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], s = 1, over?: Override): Placed => ({ of, at, rot, s, ...(over ? { over } : {}) });

/** A placement's matrix: moved to its place, turned (x, then y, then z, as the parts are), scaled. */
/** (Kept per placement, as worked out from these: a placement changed after is worked out again. Read it; never change it.) */
const matKept = new WeakMap<object, { at: V3; rot: V3; s: number; k?: V3; m: THREE.Matrix4 }>();
export function matrixOf(p: { at: V3; rot: V3; s: number; over?: Override }): THREE.Matrix4 {
  const k = p.over?.scale ?? [1, 1, 1], was = matKept.get(p);
  if (was && was.at === p.at && was.rot === p.rot && was.s === p.s && was.k === p.over?.scale) return was.m;
  const m = madeMatrix(p, k); matKept.set(p, { at: p.at, rot: p.rot, s: p.s, k: p.over?.scale, m }); return m;
}
function madeMatrix(p: { at: V3; rot: V3; s: number }, k: V3): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(...p.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rot)), new THREE.Vector3(p.s * k[0], p.s * k[1], p.s * k[2]));
}

// ---- a part's leaves --------------------------------------------------------------------------------------------------
/** A piece that is drawn: a part with a shape, its matrix in the frame of the part it was laid out from. */
export interface Leaf { part: Part; m: THREE.Matrix4 }
const leavesKept = new WeakMap<Part, Leaf[]>();
/** A part's drawn pieces, laid out once and kept with it. */
export function leavesOf(p: Part): Leaf[] {
  let l = leavesKept.get(p);
  if (!l) { const inv = new THREE.Matrix4().compose(new THREE.Vector3(...(p.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1)).invert(); l = layout(p).filter((n) => n.p.shape).map((n) => ({ part: n.p, m: inv.clone().multiply(n.m) })); leavesKept.set(p, l); }
  return l;
}

// ---- flattening: every piece placed, with its matrix and what is changed about it ---------------------------------------
export interface Flat { leaf: Part; m: THREE.Matrix4; over: Override }
const patterns = new Map<string, RegExp>();
const matches = (o: Override, name: string) => { if (!o.path) return true; let r = patterns.get(o.path); if (!r) { r = new RegExp(o.path, 'i'); patterns.set(o.path, r); } return r.test(name); };
/** What is changed about one piece: every change it is under that finds it, the innermost first, so the outermost wins.
 *  (A stretch is not here: it is in the matrix.) */
export function effective(overs: Override[], name: string): Override {
  const out: Override = {};
  for (let i = overs.length - 1; i >= 0; i--) { const o = overs[i]!; if (!matches(o, name)) continue; for (const k of ['color', 'mat', 'finish', 'hide'] as const) if (o[k] !== undefined) (out as Record<string, unknown>)[k] = o[k]; }
  return out;
}
/** Every drawn piece of an assembly, placed: what renders it and what checks it read. `visit` returns false to stop. */
export function flatten(a: Part | Assembly, visit: (f: Flat) => boolean | void, at = new THREE.Matrix4(), overs: Override[] = []): boolean {
  if (isPart(a)) {
    for (const l of leavesOf(a)) { const o = effective(overs, l.part.name); if (o.hide) continue; if (visit({ leaf: l.part, m: at.clone().multiply(l.m), over: o }) === false) return false; }
    return true;
  }
  for (const it of a.items) if (!flatten(it.of, visit, at.clone().multiply(matrixOf(it)), it.over ? [...overs, it.over] : overs)) return false;
  return true;
}

// ---- what it weighs, spans and holds, worked out once per distinct thing ------------------------------------------------
const massKept = new WeakMap<object, Map<string, number>>();
/** Its mass, kg: each piece's own mass (by its shape and material, or the material placed over it), times the volume its
 *  scale gives it, summed. Worked out once for each distinct thing under each set of changes. */
export function massOfAll(a: Part | Assembly, overs: Override[] = []): number {
  const key = JSON.stringify(overs.map((o) => [o.mat, o.hide, o.path])), byOver = massKept.get(a) ?? massKept.set(a, new Map()).get(a)!;
  const was = byOver.get(key); if (was !== undefined) return was;
  let m = 0;
  if (isPart(a)) {
    for (const l of leavesOf(a)) {
      const o = effective(overs, l.part.name); if (o.hide) continue;
      const own = massOf({ ...l.part, parts: [] }), rho = l.part.mat ? DENSITY[l.part.mat] : undefined, rhoNew = o.mat ? DENSITY[o.mat] : undefined;
      m += (rho && rhoNew ? (own * rhoNew) / rho : own) * Math.abs(l.m.determinant());
    }
  } else for (const it of a.items) { const k = it.over?.scale ?? [1, 1, 1]; m += massOfAll(it.of, it.over ? [...overs, it.over] : overs) * Math.abs(it.s ** 3 * k[0] * k[1] * k[2]); }
  byOver.set(key, m); return m;
}
const boundsKept = new WeakMap<object, THREE.Box3>();
/** The box round it, in its own frame. */
export function boundsOfAll(a: Part | Assembly): THREE.Box3 {
  const was = boundsKept.get(a); if (was) return was;
  const b = new THREE.Box3();
  if (isPart(a)) { for (const n of layout({ ...a, at: [0, 0, 0], rot: [0, 0, 0] })) if (n.box) b.union(n.box); }
  else for (const it of a.items) { const c = boundsOfAll(it.of); if (!c.isEmpty()) b.union(c.clone().applyMatrix4(matrixOf(it))); }
  boundsKept.set(a, b); return b;
}
const countKept = new WeakMap<object, number>();
/** How many pieces it places, all the way down (a city's every bolt). */
export function placedCount(a: Part | Assembly): number {
  const was = countKept.get(a); if (was !== undefined) return was;
  const n = isPart(a) ? leavesOf(a).length : a.items.reduce((t, it) => t + placedCount(it.of), 0);
  countKept.set(a, n); return n;
}
/** How many distinct things it is made of (each stored once however often it is placed). */
export function distinctCount(a: Part | Assembly): number {
  const seen = new Set<object>(), walk = (x: Part | Assembly) => { if (seen.has(x)) return; seen.add(x); if (isAssembly(x)) for (const it of x.items) walk(it.of); };
  walk(a); return seen.size;
}

// ---- patterns: one thing placed many times -----------------------------------------------------------------------------
/** In a row: n of it, each `step` on from the last. */
export function arrayLine(of: Part | Assembly, n: number, step: V3, name = `${n} × ${of.name}`): Assembly {
  return { name, items: Array.from({ length: Math.max(0, Math.round(n)) }, (_, i) => place(of, [step[0] * i, step[1] * i, step[2] * i])) };
}
/** Round an axis: n of it on a circle of radius r, each turned to face out (about y, the way a drone's arms go round). */
export function arrayCircle(of: Part | Assembly, n: number, r: number, turn = true, name = `${n} × ${of.name} round`): Assembly {
  const k = Math.max(0, Math.round(n));
  return { name, items: Array.from({ length: k }, (_, i) => { const a = (2 * Math.PI * i) / k; return place(of, [r * Math.cos(a), 0, r * Math.sin(a)], [0, turn ? -a : 0, 0]); }) };
}
/** On a grid: nx by nz (and ny high), `step` apart, centred on the origin in x and z. With `vary`, each one's height is
 *  stretched by a factor between 1 − vary and 1 + vary, drawn from the seed: the same seed, the same street. */
export function arrayGrid(of: Part | Assembly, nx: number, nz: number, step: V3, ny = 1, name = `${nx} × ${nz} × ${of.name}`, vary = 0, seed = 1): Assembly {
  const items: Placed[] = [], X = Math.round(nx), Z = Math.round(nz), Y = Math.max(1, Math.round(ny)); let r = (Math.abs(Math.round(seed)) % 2147483646) + 1;
  const next = () => { r = (r * 48271) % 2147483647; return r / 2147483647; };
  for (let y = 0; y < Y; y++) for (let x = 0; x < X; x++) for (let z = 0; z < Z; z++) {
    const p = place(of, [(x - (X - 1) / 2) * step[0], y * step[1], (z - (Z - 1) / 2) * step[2]]);
    if (vary > 0) p.over = { scale: [1, Math.max(0.05, 1 + vary * (2 * next() - 1)), 1] };
    items.push(p);
  }
  return { name, items };
}
/** It and its mirror image across a plane through the origin. */
export function mirror(of: Part | Assembly, axis: 'x' | 'y' | 'z', name = `${of.name} and its mirror`): Assembly {
  const k: V3 = [axis === 'x' ? -1 : 1, axis === 'y' ? -1 : 1, axis === 'z' ? -1 : 1];
  return { name, items: [place(of), { ...place(of), over: { scale: k } }] };
}
/** Several things as one, each where it already is. */
export function combine(things: (Part | Assembly)[], name = 'assembly'): Assembly { return { name, items: things.map((t) => place(t)) }; }

// ---- frames: where a thing is set on another ----------------------------------------------------------------------------
/** A frame: a named place on a thing, facing n with u up (a door's middle facing out of the room, a wall's opening). */
export const frame = (name: string, at: V3, n: V3 = [0, 0, 1], u: V3 = [0, 1, 0]): Port => ({ name, sex: 'frame', thread: '', pattern: [], at, n, u, t: 0 });
const framesKept = new WeakMap<object, Port[]>();
/** Every frame on a thing, in its own frame: its own, and those of what is placed in it, three levels down, named by the
 *  path to them ("front wall/opening"). */
export function framesOf(t: Part | Assembly, depth = 3): Port[] {
  const was = framesKept.get(t); if (was && depth === 3) return was;
  const own = (t.ports ?? []).filter((q) => q.n && q.u);
  const out = [...own];
  if (isAssembly(t) && depth > 0) for (const it of t.items) {
    const m = matrixOf(it), r = new THREE.Matrix4().extractRotation(m);
    for (const q of framesOf(it.of, depth - 1)) {
      const at = new THREE.Vector3(...q.at).applyMatrix4(m), n = new THREE.Vector3(...q.n).applyMatrix4(r).normalize(), u = new THREE.Vector3(...q.u).applyMatrix4(r).normalize();
      out.push({ ...q, name: `${it.of.name}/${q.name}`, at: [at.x, at.y, at.z], n: [n.x, n.y, n.z], u: [u.x, u.y, u.z] });
    }
  }
  if (depth === 3) framesKept.set(t, out);
  return out;
}
/** A frame found by its name, or by the end of its path ("opening" finds "front wall/opening"). */
export function findFrame(t: Part | Assembly, name: string): Port | undefined {
  const all = framesOf(t); return all.find((q) => q.name === name) ?? all.find((q) => q.name.endsWith(`/${name}`));
}
/** A thing placed so its frame `fa` lands on `fb` of what it goes on: `into` turns it to face as `fb` faces (a door in its
 *  opening), `against` turns it to face back at `fb` (a plug into its socket, a face on a face). Its up goes to `fb`'s up. */
export function mateTo(t: Part | Assembly, fa: string, onto: Part | Assembly, fb: string, how: 'into' | 'against' = 'into', s = 1): Placed | string {
  const a = findFrame(t, fa), b = findFrame(onto, fb);
  if (!a) return `${t.name} has no frame "${fa}" (it has ${framesOf(t).map((q) => q.name).join(', ') || 'none'})`;
  if (!b) return `${onto.name} has no frame "${fb}" (it has ${framesOf(onto).map((q) => q.name).join(', ') || 'none'})`;
  const basis = (n: THREE.Vector3, u: THREE.Vector3) => { const w = n.clone().cross(u).normalize(), u2 = w.clone().cross(n).normalize(); return new THREE.Matrix4().makeBasis(n, u2, w); };
  const na = new THREE.Vector3(...a.n).normalize(), ua = new THREE.Vector3(...a.u).normalize(), nb = new THREE.Vector3(...b.n).normalize().multiplyScalar(how === 'into' ? 1 : -1), ub = new THREE.Vector3(...b.u).normalize();
  const R = basis(nb, ub).multiply(basis(na, ua).transpose()), e = new THREE.Euler().setFromRotationMatrix(R);
  const off = new THREE.Vector3(...a.at).multiplyScalar(s).applyMatrix4(R), at = new THREE.Vector3(...b.at).sub(off);
  const r6 = (x: number) => Math.round(x * 1e9) / 1e9;
  return place(t, [r6(at.x), r6(at.y), r6(at.z)], [r6(e.x), r6(e.y), r6(e.z)], s);
}
