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
  /** the inventory item it is, where it is one (a cell, a battery), so a tree made of it says so */ item?: string;
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
    // (and what is weighed but not drawn: a part with a mass and no shape, as a machine's "rest of it")
    const unseen = (q: Part): number => (!q.shape && q.kg !== undefined && !effective(overs, q.name).hide ? q.kg : 0) + (q.parts ?? []).reduce((t, c) => t + unseen(c), 0);
    m += unseen(a);
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

// ---- a part's tree opened: each part that holds parts an assembly of them, so any of them can be taken out, swapped or
// moved apart without copying the rest ------------------------------------------------------------------------------------
const openedKept = new WeakMap<Part, Map<string, Assembly>>(), ids = new WeakMap<object, number>(); let nextId = 1;
const idOf = (x: object) => ids.get(x) ?? (ids.set(x, nextId++), nextId - 1);
export interface Swap { /** what the swap is called, so the same swap is made once */ key: string; by: (q: Part) => Part | Assembly | null }
/** A part's tree as assemblies, one for each part holding parts (its own shape, if it has one, the first thing in it),
 *  each part where it was. With a swap, every part the swap gives something for is replaced by that, placed where the
 *  part was and turned as it was: shared, so a car's four tyres are one tyre stored once. Made once per part and swap. */
export function opened(p: Part, swap?: Swap): Assembly {
  const k = swap?.key ?? '', byKey = openedKept.get(p) ?? openedKept.set(p, new Map()).get(p)!, was = byKey.get(k); if (was) return was;
  const items: Placed[] = [];
  if (p.shape) items.push(place({ ...p, at: [0, 0, 0], rot: [0, 0, 0], parts: undefined }));
  for (const c of p.parts ?? []) { const s = swap?.by(c); items.push(place(s ?? (c.parts?.length ? opened(c, swap) : c), c.at ?? [0, 0, 0], c.rot ?? [0, 0, 0])); }
  const a: Assembly = { name: p.name, items, ...(p.ports ? { ports: p.ports } : {}) }; byKey.set(k, a); return a;
}
/** Every piece of a thing whose name the pattern finds, taken out and `by` put in its place (where it was, turned as it
 *  was), the same one in every place: a tyre made in depth on every wheel of a car, one battery in every machine that
 *  takes it. How many it replaced is said. */
export function fitIn(t: Part | Assembly, pattern: string, by: Part | Assembly): { thing: Part | Assembly; fitted: number } {
  let re: RegExp; try { re = new RegExp(pattern, 'i'); } catch { throw new Error(`"${pattern}" is not a pattern`); }
  const swap: Swap = { key: `${pattern}#${idOf(by)}`, by: (q) => (re.test(q.name) ? by : null) };
  const walk = (x: Part | Assembly): Part | Assembly => {
    if (isPart(x)) return re.test(x.name) ? by : x.parts?.length ? opened(x, swap) : x;
    // (a thing named like it is swapped whole, whether drawn as one piece or built of many: a tyre built in depth too)
    if (re.test(x.name)) return by;
    return { name: x.name, items: x.items.map((it) => ({ ...it, of: walk(it.of) })), ...(x.ports ? { ports: x.ports } : {}) };
  };
  const thing = walk(t), kept = new Map<object, number>();
  const count = (x: Part | Assembly): number => { if (x === by) return 1; if (isPart(x)) return 0; let c = kept.get(x); if (c === undefined) { c = x.items.reduce((s, it) => s + count(it.of), 0); kept.set(x, c); } return c; };
  const n = count(thing);
  return { thing, fitted: n };
}
/** A thing taken apart: each thing in it moved out from the middle of what holds it by `f` of how far its own middle is
 *  from there (0: together; 1: twice as far out), so many levels down (to the bottom by default), each level apart about
 *  its own middle, so what is inside a piece comes apart inside it; what is at the middle stays. With `focus`, only the
 *  pieces named like it are taken apart (all the way down) and pulled out of what holds them; the rest stays put: a
 *  battery taken out of a truck and opened, a cell out of the battery, a plate out of the cell. Nothing is copied. */
export function exploded(t: Part | Assembly, f: number, levels = 64, focus?: RegExp): Part | Assembly {
  // (a piece made in one (a moulding's walls, a casting's bars: its parts all `one`) stays one: it does not come apart)
  const a = isPart(t) ? (t.parts?.length && !t.parts.every((q) => q.one) ? opened(t) : t) : t;
  if (levels <= 0 || f === 0 || isPart(a)) return a;
  const whole = boundsOfAll(a), c = whole.getCenter(new THREE.Vector3()), H = whole.getSize(new THREE.Vector3());
  // (a container and what is in it: the biggest thing here whose box holds the middles of others (a case and its cells) goes
  // down, and what it holds comes up out of it together, as a drawing takes a thing apart; the rest go out from the middle)
  const placedBox = (it: Placed) => { const b = boundsOfAll(it.of); return b.isEmpty() ? null : b.clone().applyMatrix4(matrixOf(it)); };
  const boxes = new Map(a.items.map((it) => [it, placedBox(it)] as const)), vol = (b: THREE.Box3) => { const z = b.getSize(new THREE.Vector3()); return z.x * z.y * z.z; };
  const lift = new Map<Placed, number>(), wholeVol = vol(whole) || 1;
  const host = [...a.items].filter((it) => boxes.get(it) && vol(boxes.get(it)!) > 0.25 * wholeVol).sort((x, y) => vol(boxes.get(y)!) - vol(boxes.get(x)!))
    .find((it) => a.items.some((o) => o !== it && boxes.get(o) && boxes.get(it)!.containsPoint(boxes.get(o)!.getCenter(new THREE.Vector3()))));
  if (host) { lift.set(host, -f * H.y * 0.6); for (const o of a.items) if (o !== host && boxes.get(o) && boxes.get(host)!.containsPoint(boxes.get(o)!.getCenter(new THREE.Vector3()))) lift.set(o, f * H.y * 0.6); }
  const out = (it: Placed): Placed => { const b = boxes.get(it) ?? placedBox(it); if (!b) return it; const d = b.getCenter(new THREE.Vector3()).sub(c).multiplyScalar(f); d.y += lift.get(it) ?? 0; return { ...it, at: [it.at[0] + d.x, it.at[1] + d.y, it.at[2] + d.z] as V3 }; };
  if (!focus) return { name: a.name, items: a.items.map((it) => ({ ...out(it), of: exploded(it.of, f, levels - 1) })) };
  return { name: a.name, items: a.items.map((it) => focus.test(it.of.name) ? { ...out(it), of: exploded(it.of, f, levels - 1) } : holds(it.of, focus) ? { ...it, of: exploded(it.of, f, levels - 1, focus) } : it) };
}
/** Whether anything in it, all the way down, is named like the pattern. */
const holdsKept = new WeakMap<object, Map<string, boolean>>();
function holds(t: Part | Assembly, re: RegExp): boolean {
  const m = holdsKept.get(t) ?? holdsKept.set(t, new Map()).get(t)!, was = m.get(re.source); if (was !== undefined) return was;
  const v = isPart(t) ? (t.parts ?? []).some((q) => re.test(q.name) || holds(q, re)) : t.items.some((it) => re.test(it.of.name) || holds(it.of, re));
  m.set(re.source, v); return v;
}
/** An assembly as a part's tree (for a maker that builds trees of parts: a machine fitting a battery built as an
 *  assembly): each placement a part at its place, turned as it is; the placed pieces' own parts shared, not copied.
 *  (Scales and changes made where a thing is placed are not carried: a tree of parts has neither.) */
export function partOf(t: Part | Assembly, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], more: Partial<Part> = {}): Part {
  if (isPart(t)) return { ...t, at, rot, ...more };
  let parts = partsOf.get(t); if (!parts) { parts = t.items.map((it) => partOf(it.of, it.at, it.rot)); partsOf.set(t, parts); }
  return { name: t.name, at, rot, ...(t.item ? { item: t.item } : {}), ...(t.ports ? { ports: t.ports } : {}), ...more, parts };
}
// (an assembly's pieces as parts, made once and shared by every place it is put: a pack of 3,000 cells is one cell's parts,
// not 3,000 copies; never changed in place, as nothing here changes a part in place)
const partsOf = new WeakMap<Assembly, Part[]>();
