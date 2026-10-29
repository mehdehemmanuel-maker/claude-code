// What the nodes make, drawn in the space (src/nexus/view/space.ts): every thing wired into a "Show in space" node,
// placed as its assembly says (src/nexus/assembly.ts), drawn as one instanced mesh for each distinct piece and change, so
// a swarm of a hundred drones is a few draws, not thousands. A city of millions of pieces cannot all be drawn at once and
// need not be: what is too small on the screen to show its pieces is drawn as the box round it, and a thing too small to
// see is not drawn; come closer and it opens into its pieces. The level is worked out again when the view moves.

import * as THREE from 'three';
import { bentAt, boundsOfAll, cellPick, fieldAt, flatten, isAssembly, leavesOf, levelColour, matrixOf, effective, type Assembly, type Bend, type Field, type Override } from '../assembly';
import type { Part } from '../kits';
import { leafGeometry, leafMaterial, surfaceShape } from './kit3d';

const fieldDrawn = new WeakMap<Field | Bend, THREE.BufferGeometry>(), refinedOf = new WeakMap<THREE.BufferGeometry, { p: number[]; n: number[]; u: number[] }>();
let fieldMat: THREE.MeshStandardMaterial | null = null;
function refined(geo: THREE.BufferGeometry): { p: number[]; n: number[]; u: number[] } {
  const was = refinedOf.get(geo); if (was) return was;
  const src = geo.index ? geo.toNonIndexed() : geo, p = Array.from(src.getAttribute('position').array as ArrayLike<number>), n = Array.from((src.getAttribute('normal')?.array ?? new Float32Array(p.length)) as ArrayLike<number>), uv = Array.from((src.getAttribute('uv')?.array ?? new Float32Array((p.length / 3) * 2)) as ArrayLike<number>);
  src.computeBoundingBox(); const most = src.boundingBox!.getSize(new THREE.Vector3()).length() / 40, P: number[] = [], N: number[] = [], U: number[] = [];
  const split = (v: number[][], w: number[][], q: number[][], depth: number): void => {
    const d = [0, 1, 2].map((k) => Math.hypot(...v[k]!.map((x, i) => x - v[(k + 1) % 3]![i]!))), k = d.indexOf(Math.max(...d));
    if (d[k]! <= most || depth > 12) { for (let j = 0; j < 3; j++) { P.push(...v[j]!); N.push(...w[j]!); U.push(...q[j]!); } return; }
    const a = k, b = (k + 1) % 3, c = (k + 2) % 3, m = v[a]!.map((x, i) => (x + v[b]![i]!) / 2), nm0 = w[a]!.map((x, i) => (x + w[b]![i]!) / 2), l = Math.hypot(...nm0) || 1, nm = nm0.map((x) => x / l), um = q[a]!.map((x, i) => (x + q[b]![i]!) / 2);
    const vs = [], ws = []; vs[a] = v[a]!; vs[b] = m; vs[c] = v[c]!; ws[a] = w[a]!; ws[b] = nm; ws[c] = w[c]!; const qs = []; qs[a] = q[a]!; qs[b] = um; qs[c] = q[c]!; split(vs, ws, qs, depth + 1);
    const vt = [], wt = []; vt[a] = m; vt[b] = v[b]!; vt[c] = v[c]!; wt[a] = nm; wt[b] = w[b]!; wt[c] = w[c]!; const qt = []; qt[a] = um; qt[b] = q[b]!; qt[c] = q[c]!; split(vt, wt, qt, depth + 1);
  };
  for (let t = 0; t < p.length; t += 9) split([0, 1, 2].map((k) => p.slice(t + 3 * k, t + 3 * k + 3)), [0, 1, 2].map((k) => n.slice(t + 3 * k, t + 3 * k + 3)), [0, 1, 2].map((k) => uv.slice((t / 3) * 2 + 2 * k, (t / 3) * 2 + 2 * k + 2)), 0);
  const r = { p: P, n: N, u: U }; refinedOf.set(geo, r); return r;
}
/** A piece drawn with a level varying through it (`Field`), or bent (`Bend`): its shape refined (each triangle halved
 *  across its longest side until no side is longer than a fortieth of the piece), so the colour and the bend follow the
 *  law and not just the corners; coloured, and moved, at every point. Kept with what it draws. */
/** A worn piece's geometry: split finely enough (`refined`) that its faces have points away from their edges, then
 *  its curvature and its distance to its edges read on each point (kit3d `surfaceShape`), for wear to follow. */
const wornOf = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
function wornGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const was = wornOf.get(geo); if (was) return was;
  const { p, n, u } = refined(geo), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
  surfaceShape(g); wornOf.set(geo, g); return g;
}
function fieldGeometry(geo: THREE.BufferGeometry, f: Field | Bend): THREE.BufferGeometry {
  const was = fieldDrawn.get(f); if (was) return was;
  const { p: p0, n } = refined(geo), p = p0.slice(), col = new Float32Array(p.length), c = new THREE.Color(), bend = 'most' in f ? f : null;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!, y = p[i + 1]!, z = p[i + 2]!;
    if (bend) { const d = bentAt(bend, x, y, z); p[i] = x + d[0]; p[i + 1] = y + d[1]; p[i + 2] = z + d[2]; c.setHex(levelColour(Math.hypot(...d) / bend.most)); } else c.setHex(levelColour(fieldAt(f as Field, x, y, z)));
    col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere(); fieldDrawn.set(f, g); return g;
}
const overlayMats = new Map<number, THREE.MeshBasicMaterial>();
/** A marker drawn over everything (`overlay`): unlit, not hidden by what is in front. */
const overlayMaterial = (c: number) => overlayMats.get(c) ?? overlayMats.set(c, new THREE.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 })).get(c)!;
const fieldMaterial = () => (fieldMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.5 }));

/** A thing to show, and which node shows it (so pressing it in the space chooses that node). */
export interface Shown { key: string; thing: Part | Assembly }
export interface ViewStats { instances: number; draws: number; boxes: number; hidden: number; ms: number; /** things drawn as their stand-ins */ standins: number; /** groups left out because they are out of view */ culled: number; /** how much coarser than its best the view is drawing, to keep its time */ coarse: number }

const PIECE_PX = 2.5, OPEN_PX = 10, BOX_PX = 4, ERR_PX = 1.5, BUDGET = 250_000;
const unitBox = new THREE.BoxGeometry(1, 1, 1);
/** Each box's sphere, worked out once. */
const spheres = new WeakMap<THREE.Box3, THREE.Sphere>();
const boxMats = new Map<number, THREE.MeshStandardMaterial>();
const boxMat = (c: number) => boxMats.get(c) ?? boxMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.1 })).get(c)!;
/** The box a thing is drawn as from far off: its own, but only as high as most of it is (its stand-in's pieces' tops, each
 *  by how much of the view it fills): a street of lawns and low houses is a slab at about the lawns, not a block as high
 *  as its tallest roof, which from far off made a plateau with a cliff where it began. */
const farBoxes = new WeakMap<object, THREE.Box3>();
function farBox(t: Assembly): THREE.Box3 {
  const was = farBoxes.get(t); if (was) return was;
  const b = boundsOfAll(t).clone(), p = proxyOf(t), tmp = new THREE.Box3(); let top = 0, w = 0;
  for (const q of p.pieces) { const pb = boundsOfAll(q.part); if (pb.isEmpty()) continue; tmp.copy(pb).applyMatrix4(q.m); const k = q.size * q.size; top += tmp.max.y * k; w += k; }
  if (w > 0 && !b.isEmpty()) b.max.y = Math.max(b.min.y + (b.max.y - b.min.y) * 0.02, Math.min(b.max.y, top / w));
  farBoxes.set(t, b); return b;
}
/** A thing's colour, seen from far off: its first piece's. */
const colourKept = new WeakMap<object, number>();
function colourOf(t: Part | Assembly): number {
  const was = colourKept.get(t); if (was !== undefined) return was;
  let c = 0x8a929c;
  // seen from far off, a thing is the colour most of it is: its stand-in's pieces' colours, each by how much of the
  // view it fills (its size squared), so a street of lawns reads green, not the grey of its first road
  if (isAssembly(t)) {
    const p = proxyOf(t); let r = 0, g = 0, b = 0, w = 0;
    for (const q of p.pieces) { const col = q.over.color ?? q.part.color ?? 0x8a929c, k = q.size * q.size; r += ((col >> 16) & 255) * k; g += ((col >> 8) & 255) * k; b += (col & 255) * k; w += k; }
    if (w > 0) c = (Math.round(r / w) << 16) | (Math.round(g / w) << 8) | Math.round(b / w);
  } else { const l = leavesOf(t)[0]; if (l) c = l.part.color ?? c; }
  colourKept.set(t, c); return c;
}

interface Batch { geo: THREE.BufferGeometry; mat: THREE.Material; m: number[]; owners: string[]; names: string[] }

// ---- stand-ins: a thing far off drawn as its biggest pieces --------------------------------------------------------------
/** How many pieces a stand-in keeps. */
const PROXY_PIECES = 48;
/** A stand-in: a thing's biggest pieces (by the size of each one's box), placed in its frame, and how far it can differ
 *  from the whole: the size of the biggest piece it leaves out (0 when it leaves none). Made once per distinct thing,
 *  the first time it is far enough off to need one (the Seed document's render pyramid, 3.12: the error, projected to
 *  the screen, chooses the level). */
interface Proxy { pieces: { part: Part; m: THREE.Matrix4; over: Override; size: number }[]; error: number; /** coarser levels: the first k pieces, and the size of the biggest each leaves out */ levels: { k: number; error: number }[]; /** markers drawn over everything (`overlay`): always drawn, whatever the level */ marks: Proxy['pieces'] }
const proxies = new WeakMap<object, Proxy>();
function proxyOf(t: Assembly): Proxy {
  const was = proxies.get(t); if (was) return was;
  const all: Proxy['pieces'] = [], tmp = new THREE.Box3();
  flatten(t, (f) => { const b = boundsOfAll(f.leaf); if (b.isEmpty()) return; tmp.copy(b).applyMatrix4(f.m); all.push({ part: f.leaf, m: f.m, over: f.over, size: tmp.getSize(new THREE.Vector3()).length() }); return all.length < 200_000; });
  all.sort((a, b) => b.size - a.size);
  // (what a stand-in leaves out is not only its biggest piece left out: many small pieces left out together fill as much
  // of the view as one piece as big as all of them gathered, the root of their sizes squared summed, halved, as they lie
  // scattered (a sub-array's sixteen thousand bits are not drawn by forty-eight of them). And a thing too big to list,
  // its stand-in made from only some of it, is never stood in for by that: its error is the whole of it)
  const rest = new Float64Array(all.length + 1); for (let i = all.length - 1; i >= 0; i--) rest[i] = rest[i + 1]! + all[i]!.size ** 2;
  const whole = all.length >= 200_000 ? boundsOfAll(t).getSize(new THREE.Vector3()).length() : 0, err = (k: number) => Math.max(whole, all[k]?.size ?? 0, Math.sqrt(rest[Math.min(k, all.length)]!) / 2);
  const p: Proxy = { pieces: all.slice(0, PROXY_PIECES), error: err(PROXY_PIECES), levels: [4, 12, PROXY_PIECES].map((k) => ({ k: Math.min(k, all.length), error: err(k) })), marks: all.filter((q) => q.over.overlay).slice(0, 300) };
  proxies.set(t, p); return p;
}

// ---- a big flat list made a tree, as it is looked at: a million placed things are not all looked at to draw the few in view
/** Where each of a long list's things is, in flat arrays (its box's middle and half-size in the list's frame), made once
 *  per list: what the view splits it by. */
interface Spread { cx: Float64Array; cy: Float64Array; cz: Float64Array; ex: Float64Array; ey: Float64Array; ez: Float64Array }
const spreads = new WeakMap<object, Spread>();
function spreadOf(a: Assembly): Spread {
  const was = spreads.get(a); if (was) return was;
  const n = a.items.length, sp: Spread = { cx: new Float64Array(n), cy: new Float64Array(n), cz: new Float64Array(n), ex: new Float64Array(n), ey: new Float64Array(n), ez: new Float64Array(n) };
  const c = new THREE.Vector3(), e = new THREE.Vector3(), m = new THREE.Matrix4();
  a.items.forEach((it, k) => {
    const b = boundsOfAll(it.of); if (b.isEmpty()) { sp.cx[k] = it.at[0]; sp.cy[k] = it.at[1]; sp.cz[k] = it.at[2]; return; }
    b.getCenter(c); b.getSize(e).multiplyScalar(0.5); m.copy(matrixOf(it)); c.applyMatrix4(m);
    // the half-size of the box turned and scaled: |R| e, per axis
    const r = m.elements; sp.cx[k] = c.x; sp.cy[k] = c.y; sp.cz[k] = c.z;
    sp.ex[k] = Math.abs(r[0]!) * e.x + Math.abs(r[4]!) * e.y + Math.abs(r[8]!) * e.z; sp.ey[k] = Math.abs(r[1]!) * e.x + Math.abs(r[5]!) * e.y + Math.abs(r[9]!) * e.z; sp.ez[k] = Math.abs(r[2]!) * e.x + Math.abs(r[6]!) * e.y + Math.abs(r[10]!) * e.z;
  });
  spreads.set(a, sp); return sp;
}
/** Some of a list's things, by index: its box worked out from the spread, split in two along its longest side at the
 *  median (a quickselect, not a sort) only when the view opens it. */
interface Cluster { a: Assembly; idx: Int32Array; box: THREE.Box3 }
function clusterOf(a: Assembly, idx: Int32Array): Cluster {
  const sp = spreadOf(a), box = new THREE.Box3();
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const k of idx) { x0 = Math.min(x0, sp.cx[k]! - sp.ex[k]!); x1 = Math.max(x1, sp.cx[k]! + sp.ex[k]!); y0 = Math.min(y0, sp.cy[k]! - sp.ey[k]!); y1 = Math.max(y1, sp.cy[k]! + sp.ey[k]!); z0 = Math.min(z0, sp.cz[k]! - sp.ez[k]!); z1 = Math.max(z1, sp.cz[k]! + sp.ez[k]!); }
  box.min.set(x0, y0, z0); box.max.set(x1, y1, z1); return { a, idx, box };
}
const rootClusters = new WeakMap<object, Cluster>();
function rootCluster(a: Assembly): Cluster { let c = rootClusters.get(a); if (!c) { c = clusterOf(a, Int32Array.from(a.items.keys())); rootClusters.set(a, c); } return c; }
const halves = new WeakMap<Cluster, [Cluster, Cluster]>();
function split(c: Cluster): [Cluster, Cluster] {
  const was = halves.get(c); if (was) return was;
  const sp = spreadOf(c.a), s = c.box.getSize(new THREE.Vector3()), key = s.x >= s.y && s.x >= s.z ? sp.cx : s.y >= s.z ? sp.cy : sp.cz;
  const idx = c.idx.slice(), h = idx.length >> 1;
  // quickselect: idx[h] is the median along that side, those before it no further, those after no nearer
  let lo = 0, hi = idx.length - 1;
  while (lo < hi) {
    const pv = key[idx[(lo + hi) >> 1]!]!; let i = lo, j = hi;
    while (i <= j) { while (key[idx[i]!]! < pv) i++; while (key[idx[j]!]! > pv) j--; if (i <= j) { const t = idx[i]!; idx[i] = idx[j]!; idx[j] = t; i++; j--; } }
    if (h <= j) hi = j; else if (h >= i) lo = i; else break;
  }
  const out: [Cluster, Cluster] = [clusterOf(c.a, idx.subarray(0, h)), clusterOf(c.a, idx.subarray(h))]; halves.set(c, out); return out;
}

export class SpaceView {
  readonly group = new THREE.Group();
  stats: ViewStats = { instances: 0, draws: 0, boxes: 0, hidden: 0, ms: 0, standins: 0, coarse: 1, culled: 0 };
  private readonly v = new THREE.Vector3();
  /** The frame governor (3.12): when building what to draw takes too long, the stand-ins are allowed a bigger error; when
   *  there is time to spare, a smaller one again. Never finer than its best (1). */
  private coarse = 1;
  /** How many pieces a frame draws at most: as many as fit in about 40 ms of choosing them, learnt from the last frame
   *  (never under 20,000 nor over 250,000). */
  private budget = BUDGET;
  /** How far the view reaches, in the space's own units (beyond the haze nothing is drawn: a horizon, so a world without
   *  end costs what the view holds). */
  range = Infinity;
  /** How long the last frames took to draw on the GPU, ms (told by whoever draws it). */
  drawMs = 0;
  /** Where a world without end was last cut off, in the view's units (Infinity: nowhere): the haze should be thick there. */
  reach = Infinity;
  /** Where the instances' positions are measured from: near the eye, so a thing a thousand kilometres out is placed as
   *  exactly as one at hand (a GPU keeps 24 bits: at 10,000 km that is a metre). */
  readonly origin = new THREE.Vector3();
  private shown: Shown[] = []; private dirty = true; private lastCam = ''; private lastBuild = 0;
  private meshes = new Map<string, THREE.InstancedMesh>(); private owners = new Map<THREE.InstancedMesh, string[]>(); private names = new Map<THREE.InstancedMesh, string[]>();
  private readonly sphere = new THREE.Sphere(); 

  /** The things to draw now. */
  show(things: Shown[]): void { this.shown = things; this.dirty = true; }
  /** The box round everything shown, in the space's frame. */
  bounds(): THREE.Box3 { const b = new THREE.Box3(); for (const s of this.shown) { const c = boundsOfAll(s.thing); if (!c.isEmpty()) b.union(c); } return b; }

  /** Drawn again where what is shown changed, or the view moved enough to change what opens (at most every 120 ms). */
  update(camera: THREE.PerspectiveCamera, heightPx: number, now: number): void {
    this.group.updateMatrixWorld();
    const e = camera.matrixWorld.elements, sig = `${e.map((x) => x.toFixed(3)).join(',')}|${this.group.matrixWorld.elements.map((x) => x.toPrecision(5)).join(',')}`;
    if (!this.dirty && (sig === this.lastCam || now - this.lastBuild < 120)) return;
    this.lastCam = sig; this.dirty = false; this.lastBuild = now; this.build(camera, heightPx);
  }

  private build(camera: THREE.PerspectiveCamera, heightPx: number): void {
    const t0 = performance.now(), batches = new Map<string, Batch>(), eye = camera.getWorldPosition(new THREE.Vector3());
    const px = (heightPx / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), world = this.group.matrixWorld;
    const toLocal = world.clone().invert(); this.origin.copy(eye).applyMatrix4(toLocal);
    const worldScale = new THREE.Vector3().setFromMatrixScale(world).x || 1;
    let count = 0, boxes = 0, hidden = 0, stand = 0;
    const add = (key: string, geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4, owner: string, name = '') => {
      let b = batches.get(key); if (!b) { b = { geo, mat, m: [], owners: [], names: [] }; batches.set(key, b); }
      const e = m.elements, o = this.origin; b.m.push(e[0]!, e[1]!, e[2]!, e[3]!, e[4]!, e[5]!, e[6]!, e[7]!, e[8]!, e[9]!, e[10]!, e[11]!, e[12]! - o.x, e[13]! - o.y, e[14]! - o.z, e[15]!); b.owners.push(owner); b.names.push(name); count++;
    };
    const scratch = new THREE.Matrix4();
    // what can be seen at all: the view's frustum, in the space's frame (whole groups leave it by one test)
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let culled = 0, cut = Infinity;
    /** How big a box looks from here, in pixels across; -1 when it is out of the view altogether. */
    const seen = (box: THREE.Box3, m: THREE.Matrix4): number => {
      // the box's own sphere, kept with it, carried out by its matrix: a point and a scale, not eight corners twice
      let sp = spheres.get(box); if (!sp) { sp = box.getBoundingSphere(new THREE.Sphere()); spheres.set(box, sp); }
      const e = m.elements, sc = Math.sqrt(Math.max(e[0]! * e[0]! + e[1]! * e[1]! + e[2]! * e[2]!, e[4]! * e[4]! + e[5]! * e[5]! + e[6]! * e[6]!, e[8]! * e[8]! + e[9]! * e[9]! + e[10]! * e[10]!));
      this.sphere.center.copy(sp.center).applyMatrix4(m).applyMatrix4(world); this.sphere.radius = sp.radius * sc * worldScale;
      if (!frustum.intersectsSphere(this.sphere)) return -1;
      const d = this.sphere.center.distanceTo(eye) - this.sphere.radius; if (d > this.range) return 0;
      return d <= 1e-9 ? Infinity : (2 * this.sphere.radius * px) / d;
    };
    const asBox = (t: Part | Assembly, m: THREE.Matrix4, over: Override, owner: string) => {
      const b = isAssembly(t) ? farBox(t) : boundsOfAll(t); if (b.isEmpty()) return;
      const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).max(new THREE.Vector3(1e-9, 1e-9, 1e-9));
      const col = over.color ?? colourOf(t);
      add(`box|${col}`, unitBox, boxMat(col), m.clone().multiply(new THREE.Matrix4().compose(c, new THREE.Quaternion(), s)), owner); boxes++;
    };
    // biggest on the screen first (the Seed document's 3.12: budget spent where the error is largest), so when the budget
    // runs out what is left is what matters least, and it is drawn as its box, never left a hole
    interface Job { t: Part | Assembly; cl?: Cluster; m: THREE.Matrix4; overs: Override[]; owner: string; size: number }
    const heap: Job[] = [];
    const up = (i: number) => { while (i > 0) { const p = (i - 1) >> 1; if (heap[p]!.size >= heap[i]!.size) break; [heap[p], heap[i]] = [heap[i]!, heap[p]!]; i = p; } };
    const down = (i: number) => { for (;;) { const l = 2 * i + 1, r = l + 1; let k = i; if (l < heap.length && heap[l]!.size > heap[k]!.size) k = l; if (r < heap.length && heap[r]!.size > heap[k]!.size) k = r; if (k === i) return; [heap[k], heap[i]] = [heap[i]!, heap[k]!]; i = k; } };
    const push = (t: Part | Assembly, m: THREE.Matrix4, overs: Override[], owner: string, cl?: Cluster) => {
      // a world without end has no box: it is always looked into
      if (!cl && isAssembly(t) && t.tiled) { heap.push({ t, m, overs, owner, size: Infinity }); up(heap.length - 1); return; }
      const b = cl ? cl.box : boundsOfAll(t); if (b.isEmpty()) return;
      const size = seen(b, m); if (size < 0) { culled++; return; } if (size < 0.5 * this.coarse) { hidden++; return; }
      heap.push({ t, cl, m, overs, owner, size }); up(heap.length - 1);
    };
    const boxOf = (c: Cluster, m: THREE.Matrix4, owner: string) => { const ctr = c.box.getCenter(new THREE.Vector3()), sz = c.box.getSize(new THREE.Vector3()).max(new THREE.Vector3(1e-9, 1e-9, 1e-9)), col = colourOf(c.a.items[c.idx[0]!]!.of); add(`box|${col}`, unitBox, boxMat(col), m.clone().multiply(new THREE.Matrix4().compose(ctr, new THREE.Quaternion(), sz)), owner); boxes++; };
    /** A lattice without end, as a tree of super-cells (2, 4, 8 … cells a side): one is drawn as a slab of the cells'
     *  average colour and height while it is small on the screen, and split only when it is big, so the work follows the
     *  pixels whether the view holds a street or a continent of it; the cells themselves (each one of the variants by its
     *  hash) only where a cell is worth drawing. Out to the view's reach, and never more than 60,000 super-cells looked at. */
    const tile = (t: Assembly, m: THREE.Matrix4, overs: Override[], owner: string) => {
      const L = t.tiled!, inv = m.clone().invert(), p = this.origin.clone().applyMatrix4(inv), sm = new THREE.Vector3().setFromMatrixScale(m).x || 1;
      const used = [0, 1, 2].filter((a) => L.step[a]! > 0), reach = this.range / worldScale / sm;
      // the cells' average: colour by the area each fills, height as the far boxes' (a slab at about where most of it is)
      let r = 0, g = 0, bl = 0, w = 0, lo = Infinity, hi = 0;
      for (const v of L.variants) { const fb = isAssembly(v) ? farBox(v) : boundsOfAll(v), col = colourOf(v), k = 1; r += ((col >> 16) & 255) * k; g += ((col >> 8) & 255) * k; bl += (col & 255) * k; w += k; lo = Math.min(lo, fb.min.y); hi += fb.max.y; }
      const avg = (Math.round(r / w) << 16) | (Math.round(g / w) << 8) | Math.round(bl / w), top = hi / L.variants.length, base = Number.isFinite(lo) ? lo : 0;
      const cellAt = (a: number) => (L.step[a]! > 0 ? Math.floor(p.getComponent(a) / L.step[a]! + 0.5) : 0);
      const top0 = Math.max(0, Math.min(48, Math.ceil(Math.log2(Math.max(1, (Number.isFinite(reach) ? reach : 1e9) / Math.min(...used.map((a) => L.step[a]!)))))));
      const box = new THREE.Box3(), ctr = new THREE.Vector3(), size = new THREE.Vector3(); let looked = 0;
      const node = (level: number, i0: number, j0: number, k0: number) => {
        if (++looked > 60_000) return;
        const n = 2 ** level, idx = [i0, j0, k0];
        for (const a of [0, 1, 2]) { if (L.step[a]! > 0) { box.min.setComponent(a, (idx[a]! - 0.5) * L.step[a]!); box.max.setComponent(a, (idx[a]! + n - 0.5) * L.step[a]!); } else { box.min.setComponent(a, a === 1 ? base : -0.5); box.max.setComponent(a, a === 1 ? top : 0.5); } }
        if (L.step[1]! === 0) { box.min.y = base; box.max.y = Math.max(top, base + 1e-6); }
        // how big it is from here (its own sphere, carried out)
        box.getCenter(ctr); const rad = box.getSize(size).length() / 2;
        this.sphere.center.copy(ctr).applyMatrix4(m).applyMatrix4(world); this.sphere.radius = rad * sm * worldScale;
        if (!frustum.intersectsSphere(this.sphere)) { culled++; return; }
        const d = this.sphere.center.distanceTo(eye) - this.sphere.radius; if (d > this.range) { hidden++; return; }
        const px2 = d <= 1e-9 ? Infinity : (2 * this.sphere.radius * px) / d;
        if (px2 < 0.5 * this.coarse) { hidden++; return; }
        if (level === 0) { const v = L.variants[cellPick(i0, j0, k0, L.seed, L.variants.length)]; if (v) push(v, m.clone().multiply(new THREE.Matrix4().makeTranslation(i0 * L.step[0]!, j0 * L.step[1]!, k0 * L.step[2]!)), overs, owner); return; }
        if (px2 < BOX_PX * 4 * this.coarse || count >= this.budget) { add(`box|${avg}`, unitBox, boxMat(avg), m.clone().multiply(new THREE.Matrix4().compose(ctr.clone(), new THREE.Quaternion(), size.clone().max(new THREE.Vector3(1e-9, 1e-9, 1e-9)))), owner); boxes++; return; }
        const h = n / 2;
        for (const di of L.step[0]! > 0 ? [0, h] : [0]) for (const dj of L.step[1]! > 0 ? [0, h] : [0]) for (const dk of L.step[2]! > 0 ? [0, h] : [0]) node(level - 1, i0 + di, j0 + dj, k0 + dk);
      };
      // the top super-cells: those round the point below the eye, at the level whose cells span the reach
      const N = 2 ** top0, base0 = [0, 1, 2].map((a) => (L.step[a]! > 0 ? Math.floor(cellAt(a) / N) * N : 0));
      for (const di of L.step[0]! > 0 ? [-2, -1, 0, 1, 2] : [0]) for (const dj of L.step[1]! > 0 ? [-2, -1, 0, 1, 2] : [0]) for (const dk of L.step[2]! > 0 ? [-2, -1, 0, 1, 2] : [0]) node(top0, base0[0]! + di * N, base0[1]! + dj * N, base0[2]! + dk * N);
    };
    for (const s of this.shown) push(s.thing, new THREE.Matrix4(), [], s.key);
    while (heap.length) {
      const j = heap[0]!, last = heap.pop()!; if (heap.length) { heap[0] = last; down(0); }
      const { t, m, overs, owner, size, cl } = j, eff = effective(overs, t.name); if (eff.hide) continue;
      if (count >= this.budget * 1.25) { hidden++; continue; }
      if (cl) {
        if (count >= this.budget || size < BOX_PX * this.coarse) { boxOf(cl, m, owner); continue; }
        if (cl.idx.length <= 32) { for (const k of cl.idx) { const it = cl.a.items[k]!; push(it.of, m.clone().multiply(matrixOf(it)), it.over ? [...overs, it.over] : overs, owner); } continue; }
        for (const h of split(cl)) push(t, m, overs, owner, h);
        continue;
      }
      if (count >= this.budget || (isAssembly(t) ? size < BOX_PX * this.coarse : size < PIECE_PX * 2 * this.coarse)) { asBox(t, m, eff, owner); continue; }
      if (isAssembly(t) && t.tiled) { tile(t, m, overs, owner); continue; }
      if (isAssembly(t)) {
        // far enough off that what its stand-in leaves out is under a pixel or two (more when the frame is behind): its stand-in
        if (size < OPEN_PX * 40) {
          const p = proxyOf(t), per = size / Math.max(1e-9, boundsOfAll(t).getSize(this.v).length());
          // the coarsest level of its stand-in whose error is under the threshold (4 pieces, 12, 48)
          const lv = p.levels.find((l) => l.error * per < ERR_PX * this.coarse);
          if (lv) {
            for (const q of [...p.pieces.slice(0, lv.k), ...p.marks.filter((x) => !p.pieces.slice(0, lv.k).includes(x))]) { const o = { ...q.over, ...effective(overs, q.part.name) }; if (o.hide) continue; const g0 = leafGeometry(q.part); if (!g0) continue; const fb = o.bend ?? o.field, geo = fb ? fieldGeometry(g0, fb) : (o.look ?? q.part.look)?.wear ? wornGeometry(g0) : g0, mat = o.overlay ? overlayMaterial(o.color ?? q.part.color ?? 0xffffff) : fb ? fieldMaterial() : leafMaterial(q.part, o); add(`${geo.uuid}|${mat.uuid}`, geo, mat, scratch.multiplyMatrices(m, q.m), owner, q.part.name); }
            stand++; continue;
          }
        }
        if (t.items.length > 32) { push(t, m, overs, owner, rootCluster(t)); continue; }
        for (const it of t.items) push(it.of, m.clone().multiply(matrixOf(it)), it.over ? [...overs, it.over] : overs, owner);
        continue;
      }
      for (const l of leavesOf(t)) {
        const o = effective(overs, l.part.name); if (o.hide) continue;
        const g0 = leafGeometry(l.part); if (!g0) continue;
        const fb = o.bend ?? o.field, geo = fb ? fieldGeometry(g0, fb) : (o.look ?? l.part.look)?.wear ? wornGeometry(g0) : g0, mat = o.overlay ? overlayMaterial(o.color ?? l.part.color ?? 0xffffff) : fb ? fieldMaterial() : leafMaterial(l.part, o);
        add(`${geo.uuid}|${mat.uuid}`, geo, mat, scratch.multiplyMatrices(m, l.m), owner, l.part.name);
      }
    }
    // the meshes: kept and grown when they must be, so moving the view does not make them again
    const used = new Set<string>();
    for (const [key, b] of batches) {
      used.add(key); const n = b.owners.length; let mesh = this.meshes.get(key);
      if (!mesh || mesh.instanceMatrix.count < n) {
        if (mesh) { this.group.remove(mesh); mesh.dispose(); }
        mesh = new THREE.InstancedMesh(b.geo, b.mat, Math.max(16, 2 ** Math.ceil(Math.log2(n))));
        const top = (b.mat as THREE.Material).depthTest === false; mesh.castShadow = !top; mesh.receiveShadow = !top; if (top) mesh.renderOrder = 10;
        mesh.frustumCulled = false; this.meshes.set(key, mesh); this.group.add(mesh);
      }
      mesh.position.copy(this.origin); mesh.updateMatrix();
      (mesh.instanceMatrix.array as Float32Array).set(b.m); mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.visible = true; mesh.boundingSphere = null; mesh.boundingBox = null;
      this.owners.set(mesh, b.owners); this.names.set(mesh, b.names);
    }
    for (const [key, mesh] of this.meshes) if (!used.has(key)) { mesh.count = 0; mesh.visible = false; }
    const ms = performance.now() - t0; this.reach = cut;
    // the governor: the slower of choosing and drawing (a slow GPU coarsens the view as a slow CPU does); a change of it
    // asks for another build, so it settles while the view stands still
    const slow = Math.max(ms, this.drawMs * 1.5), was = this.coarse;
    this.coarse = slow > 30 || count > this.budget * 0.9 ? Math.min(16, this.coarse * Math.min(4, Math.max(1.3, slow / 30))) : slow < 18 && count < this.budget * 0.7 ? Math.max(1, this.coarse / 1.15) : this.coarse;
    if (Math.abs(this.coarse - was) > 1e-9) this.dirty = true;
    if (count > 1000) this.budget = Math.round(Math.max(20_000, Math.min(BUDGET, 0.8 * this.budget + 0.2 * (40 / Math.max(1e-6, ms / count)))));
    this.stats = { instances: count, draws: batches.size, boxes, hidden, ms, standins: stand, coarse: this.coarse, culled };
  }

  /** The box of one drawn piece (one instance of a mesh), in the world. */
  private boxOf(mesh: THREE.InstancedMesh, i: number): THREE.Box3 {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return mesh.geometry.boundingBox!.clone().applyMatrix4(m.premultiply(mesh.matrixWorld));
  }
  /** The piece a ray meets first: its name and its box (to fly the view to it). */
  pieceAt(ray: THREE.Raycaster): { name: string; box: THREE.Box3 } | null {
    const vis = [...this.meshes.values()].filter((m) => m.visible && m.count > 0), h = ray.intersectObjects(vis, false)[0];
    if (!h || h.instanceId === undefined) return null; const mesh = h.object as THREE.InstancedMesh;
    return { name: this.names.get(mesh)?.[h.instanceId] ?? '', box: this.boxOf(mesh, h.instanceId) };
  }
  /** The box round every drawn piece whose name is like `re`, and how many there are. */
  piecesNamed(re: RegExp): { box: THREE.Box3; n: number } {
    const box = new THREE.Box3(); let n = 0;
    for (const mesh of this.meshes.values()) { if (!mesh.visible) continue; const nm = this.names.get(mesh) ?? []; for (let i = 0; i < mesh.count; i++) if (re.test(nm[i] ?? '')) { box.union(this.boxOf(mesh, i)); n++; } }
    return { box, n };
  }
  /** The node whose thing a ray meets first, and where. */
  pick(ray: THREE.Raycaster): { key: string; point: THREE.Vector3; distance: number } | null {
    const vis = [...this.meshes.values()].filter((m) => m.visible && m.count > 0);
    const h = ray.intersectObjects(vis, false)[0]; if (!h || h.instanceId === undefined) return null;
    const key = this.owners.get(h.object as THREE.InstancedMesh)?.[h.instanceId]; return key ? { key, point: h.point, distance: h.distance } : null;
  }
}
