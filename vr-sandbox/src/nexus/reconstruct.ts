// Reconstruction from photographs (docs/RECONSTRUCT.md): image → features → camera → model → render → compare → correct,
// each step a node, each answer with what it is (observed, measured, estimated, unknown) and how far off.
//
//   photograph    pixels, decoded here (PNG; a browser's own decoder for anything else)
//   features      points marked on it (photo-marks.ts), each snapped to the strongest edge near it: measured where an edge
//                 was found and how far it moved said; observed (by eye) where none was
//   camera        a pinhole camera (its eye, what it looks at, its roll, its focal length in pixels) solved so the points
//                 whose places on the thing are known (its published wheelbase, track and tyre size) land where they are
//                 seen; the error at each point said
//   silhouette    the thing as made rendered from that camera: every drawn piece's triangles filled into a mask
//   compare       the mask against the outline traced on the photograph: how much they overlap, and at each outline point
//                 how far the model's edge is from it, in pixels and in millimetres at the thing's distance, signed
//   fit           the body's lines moved to close those errors (Nelder–Mead over its line figures, the body built and
//                 rendered each step); each figure's ± from how much the error moves when it does
//   ask           what is not seen and what is poorly fixed, and the one photograph or measurement that would fix most
//
// Nothing here guesses silently: a figure the photographs do not fix stays the estimate it was, and says so.

import * as THREE from 'three';
import { unzlibSync } from 'fflate';
import { layout } from './make/space';
import { geometry } from './view/kit3d';
import { minimize } from './numeric';
import type { Part, V3 } from './kits';
import { PHOTOS, photoOf, type Mark } from './photo-marks';
import { register, type BlockDef, type PortDef, type Type } from './blocks';
import { makeMachine, tyreOf, bodyPlanOf, type Machine } from './machines';
import { bodyPanels } from './panels';

// ---- images -----------------------------------------------------------------------------------------------------------
export interface Img { w: number; h: number; rgba: Uint8Array }
/** A PNG decoded (8-bit grey, grey and alpha, RGB, RGBA or a palette; not interlaced): its chunks read, its data inflated
 *  (fflate), each row unfiltered (PNG specification, ISO/IEC 15948, §9). */
export function decodePng(b: Uint8Array): Img {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); let p = 8, w = 0, h = 0, depth = 0, type = 0, inter = 0; const idat: Uint8Array[] = []; let pal: Uint8Array | null = null, trns: Uint8Array | null = null;
  while (p < b.length) { const len = dv.getUint32(p), t = String.fromCharCode(b[p + 4]!, b[p + 5]!, b[p + 6]!, b[p + 7]!), d = b.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); depth = d[8]!; type = d[9]!; inter = d[12]!; } else if (t === 'PLTE') pal = d; else if (t === 'tRNS') trns = d; else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break;
    p += 12 + len; }
  if (depth !== 8 || inter) throw new Error(`a PNG of ${depth}-bit depth${inter ? ', interlaced' : ''} is not read here: save it as 8-bit, not interlaced`);
  const ch = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type]; if (!ch) throw new Error(`PNG colour type ${type} not read here`);
  const all = new Uint8Array(idat.reduce((a, x) => a + x.length, 0)); let o = 0; for (const x of idat) { all.set(x, o); o += x.length; }
  const raw = unzlibSync(all), stride = w * ch, cur = new Uint8Array(stride * h), out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)]!, src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) { const a = x >= ch ? cur[row + x - ch]! : 0, up = y ? cur[row - stride + x]! : 0, c = x >= ch && y ? cur[row - stride + x - ch]! : 0, s = src[x]!;
      let v = s; if (f === 1) v = s + a; else if (f === 2) v = s + up; else if (f === 3) v = s + ((a + up) >> 1); else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v = s + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
      cur[row + x] = v & 255; } }
  for (let i = 0; i < w * h; i++) { const q = i * 4;
    if (type === 0) { out[q] = out[q + 1] = out[q + 2] = cur[i]!; out[q + 3] = 255; } else if (type === 4) { out[q] = out[q + 1] = out[q + 2] = cur[i * 2]!; out[q + 3] = cur[i * 2 + 1]!; }
    else if (type === 2) { out[q] = cur[i * 3]!; out[q + 1] = cur[i * 3 + 1]!; out[q + 2] = cur[i * 3 + 2]!; out[q + 3] = 255; } else if (type === 6) out.set(cur.subarray(i * 4, i * 4 + 4), q);
    else { const k = cur[i]!; out[q] = pal![k * 3]!; out[q + 1] = pal![k * 3 + 1]!; out[q + 2] = pal![k * 3 + 2]!; out[q + 3] = trns && k < trns.length ? trns[k]! : 255; } }
  return { w, h, rgba: out };
}
const photos = new Map<string, Promise<Img>>();
/** A photograph from the library (view/public/photos/<id>.png): fetched by the page, read from disk under the tests. */
export function loadPhoto(id: string): Promise<Img> {
  let p = photos.get(id);
  if (!p) {
    p = (async () => {
      if (typeof window !== 'undefined' && typeof fetch === 'function') { const r = await fetch(`photos/${id}.png`); if (!r.ok) throw new Error(`no photograph "${id}" (${r.status})`); return decodePng(new Uint8Array(await r.arrayBuffer())); }
      const fs = await import(/* @vite-ignore */ 'node:fs'); return decodePng(new Uint8Array(fs.readFileSync(`view/public/photos/${id}.png`)));
    })();
    photos.set(id, p);
  }
  return p;
}

// ---- features ---------------------------------------------------------------------------------------------------------
/** How strongly the brightness changes at each pixel (Sobel's 3 × 3 gradient on the luma, ITU-R BT.601 weights). */
export function gradient(img: Img): Float32Array {
  const { w, h, rgba } = img, L = new Float32Array(w * h), g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = 0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, a = (dx: number, dy: number) => L[i + dy * w + dx]!;
    const gx = a(1, -1) + 2 * a(1, 0) + a(1, 1) - a(-1, -1) - 2 * a(-1, 0) - a(-1, 1), gy = a(-1, 1) + 2 * a(0, 1) + a(1, 1) - a(-1, -1) - 2 * a(0, -1) - a(1, -1); g[i] = Math.hypot(gx, gy); }
  return g;
}
export interface Feature extends Mark { du: number; dv: number; edge: number; evidence: 'measured' | 'observed' }
/** Each marked point moved to the strongest edge within r pixels of it (nearer ones preferred: the edge's strength less a
 *  little for each pixel away), and said measured where that edge is clear (its gradient over `clear`), else left where
 *  it was marked and said observed. */
export function snapMarks(img: Img, marks: Mark[], r = 5, clear = 120): Feature[] {
  const g = gradient(img), { w, h } = img;
  return marks.map((m) => {
    let best = -Infinity, bu = m.u, bv = m.v, edge = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.round(m.u + dx), y = Math.round(m.v + dy); if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1 || dx * dx + dy * dy > r * r) continue; const e = g[y * w + x]!, s = e - 12 * Math.hypot(dx, dy); if (s > best) { best = s; bu = x; bv = y; edge = e; } }
    // (a wheel's centre is not an edge: kept where it was marked)
    if (/centre/.test(m.name) || edge < clear) return { ...m, du: 0, dv: 0, edge, evidence: 'observed' as const };
    return { ...m, u: bu, v: bv, du: bu - m.u, dv: bv - m.v, edge, evidence: 'measured' as const };
  });
}

// ---- the camera -------------------------------------------------------------------------------------------------------
/** A pinhole camera: its eye, the point it looks at, its roll about that line (rad), its focal length (pixels), the image's
 *  size; its principal point the image's middle (a phone's, near enough: said so where it matters). */
export interface Camera { eye: V3; target: V3; roll: number; f: number; w: number; h: number }
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], unit = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function basis(c: Camera): { fw: V3; rt: V3; up: V3 } {
  const fw = unit(sub(c.target, c.eye)), r0 = unit(cross(fw, [0, 1, 0])), u0 = cross(r0, fw), cs = Math.cos(c.roll), sn = Math.sin(c.roll);
  return { fw, rt: [r0[0] * cs + u0[0] * sn, r0[1] * cs + u0[1] * sn, r0[2] * cs + u0[2] * sn], up: [u0[0] * cs - r0[0] * sn, u0[1] * cs - r0[1] * sn, u0[2] * cs - r0[2] * sn] };
}
/** Where a point lands in the image (pixels from its top left), and how far in front of the camera it is; null behind it. */
export function project(c: Camera, P: V3, B = basis(c)): [number, number, number] | null {
  const d = sub(P, c.eye), z = dot(d, B.fw); if (z < 1e-3) return null;
  return [c.w / 2 + (c.f * dot(d, B.rt)) / z, c.h / 2 - (c.f * dot(d, B.up)) / z, z];
}
/** A point seen and where it is on the thing; `alongX`: its place along the thing is not known, only within this range
 *  (the roof's highest point: its height published, not where along the roof it is). */
export interface Pair { name: string; img: [number, number]; world: V3; alongX?: [number, number] }
/** The camera that puts the known points where they are seen: least squares on the pixel error (Nelder–Mead, from a
 *  start looking at them from the side they were seen from), with each point's error after. */
/** Solved from several starts (focal lengths from a wide phone lens to a long one, the eye at the distance each implies):
 *  the best, and how far apart the cameras are that fit within a pixel of it (their distance from the thing, their focal
 *  length): where those differ, the photograph does not fix the camera, and what is measured through it is said so. */
export function solveCameraRobust(pairs: Pair[], w: number, h: number, side: -1 | 1, mid: V3): { best: ReturnType<typeof solveCamera>; spread: { distance: [number, number]; f: [number, number] }; fitting: Camera[] } {
  const runs = [0.7, 1.4, 2.8, 5.6].map((k) => { const f = Math.max(w, h) * k, d = (f / Math.max(w, h)) * 6; return solveCamera(pairs, w, h, { eye: [mid[0], mid[1] + 0.3, mid[2] + side * d], target: mid, roll: 0, f, w, h }); }).sort((a, b) => a.rms - b.rms);
  const near = runs.filter((r) => r.rms <= runs[0]!.rms + 1), dist = near.map((r) => Math.hypot(...sub(r.cam.eye, mid))), fs = near.map((r) => r.cam.f);
  return { best: runs[0]!, spread: { distance: [Math.min(...dist), Math.max(...dist)], f: [Math.min(...fs), Math.max(...fs)] }, fitting: near.map((r) => r.cam) };
}
export function solveCamera(pairs: Pair[], w: number, h: number, start: Camera): { cam: Camera; residuals: { name: string; px: number }[]; rms: number; evaluations: number } {
  const toCam = (x: number[]): Camera => ({ eye: [x[0]!, x[1]!, x[2]!], target: [x[3]!, x[4]!, x[5]!], roll: x[6]!, f: Math.exp(x[7]!), w, h });
  const err = (c: Camera) => pairs.map((p) => {
    const at = (x: number) => { const q = project(c, [x, p.world[1], p.world[2]]); return q ? Math.hypot(q[0] - p.img[0], q[1] - p.img[1]) : 1e4; };
    if (!p.alongX) return at(p.world[0]); let best = Infinity; for (let k = 0; k <= 40; k++) best = Math.min(best, at(p.alongX[0] + ((p.alongX[1] - p.alongX[0]) * k) / 40)); return best; });
  const cost = (x: number[]) => { const e = err(toCam(x)); return e.reduce((a, v) => a + v * v, 0) / e.length; };
  let x = [...start.eye, ...start.target, start.roll, Math.log(start.f)], evals = 0;
  for (let k = 0; k < 4; k++) { const r = minimize(cost, x, { step: [0.5, 0.2, 0.5, 0.2, 0.1, 0.2, 0.02, 0.1], ftol: 1e-6, most: 3000 }); x = r.x; evals += r.evaluations; }
  const cam = toCam(x), e = err(cam);
  return { cam, residuals: pairs.map((p, i) => ({ name: p.name, px: e[i]! })), rms: Math.sqrt(e.reduce((a, v) => a + v * v, 0) / e.length), evaluations: evals };
}

// ---- rendering a silhouette -------------------------------------------------------------------------------------------
const geos = new WeakMap<object, THREE.BufferGeometry | null>();
/** The thing as the camera sees it: every drawn piece's triangles (as the viewer draws them) filled into a mask, 1 where
 *  any piece covers the pixel. `skip` leaves out pieces by name (what the photograph does not show). */
export function silhouette(root: Part, c: Camera, skip?: RegExp): Uint8Array {
  const m = new Uint8Array(c.w * c.h), B = basis(c), v = new THREE.Vector3();
  for (const n of layout(root)) {
    const p = n.p; if (!p.shape || (skip && skip.test(p.name))) continue;
    let g = geos.get(p.shape); if (g === undefined) { try { g = geometry(p.shape, p.mat, p.make, p.facets); } catch { g = null; } geos.set(p.shape, g); }
    if (!g) continue;
    const pos = g.attributes.position!, idx = g.index, pr: ([number, number, number] | null)[] = [];
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(n.m); pr.push(project(c, [v.x, v.y, v.z], B)); }
    const tri = (a: number, b: number, d: number) => { const A = pr[a], Bq = pr[b], C = pr[d]; if (A && Bq && C) fill(m, c.w, c.h, A, Bq, C); };
    if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)); else for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
  }
  return m;
}
function fill(m: Uint8Array, w: number, h: number, A: [number, number, number], B: [number, number, number], C: [number, number, number]): void {
  const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(w - 1, Math.ceil(Math.max(A[0], B[0], C[0]))), y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(h - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
  if (x0 > x1 || y0 > y1) return;
  const e = (P: [number, number, number], Q: [number, number, number], x: number, y: number) => (Q[0] - P[0]) * (y - P[1]) - (Q[1] - P[1]) * (x - P[0]), area = e(A, B, C[0], C[1]); if (Math.abs(area) < 1e-9) return;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x + 0.5, py = y + 0.5, a = e(B, C, px, py), b = e(C, A, px, py), d = e(A, B, px, py); if ((a >= 0 && b >= 0 && d >= 0) || (a <= 0 && b <= 0 && d <= 0)) m[y * w + x] = 1; }
}
/** A traced outline as a mask (even–odd scanline fill). */
export function polygonMask(poly: [number, number][], w: number, h: number): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { const yc = y + 0.5, xs: number[] = []; for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i]!, [bx, by] = poly[(i + 1) % poly.length]!; if ((ay <= yc) !== (by <= yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k]! - 0.5)); x <= Math.min(w - 1, Math.floor(xs[k + 1]! - 0.5)); x++) m[y * w + x] = 1; }
  return m;
}

// ---- comparing ---------------------------------------------------------------------------------------------------------
/** How far every pixel is from the nearest pixel on the mask's edge (a two-pass 3–4 chamfer, Borgefors 1986: within about
 *  8 % of the true distance), in pixels. */
function edgeDistance(m: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h).fill(1e9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, v = m[i]; if ((x > 0 && m[i - 1] !== v) || (x < w - 1 && m[i + 1] !== v) || (y > 0 && m[i - w] !== v) || (y < h - 1 && m[i + w] !== v)) d[i] = 0; }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 1e9 : d[y * w + x]!);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; d[i] = Math.min(d[i]!, at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; d[i] = Math.min(d[i]!, at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
  for (let i = 0; i < w * h; i++) d[i] = d[i]! / 3; return d;
}
export interface Compared { iou: number; over: number; under: number; points: { name: string; region: string; px: number; mm: number }[]; byRegion: { region: string; meanPx: number; meanMm: number; n: number }[]; meanAbsPx: number; mmPerPx: number }
/** The model's mask against the traced outline: their overlap (intersection over union), the share of the model outside the
 *  outline (over) and of the outline the model leaves empty (under), and at each outline point the model's edge's distance
 *  from it, + where the model falls short of it (the outline outside the model), − where the model stands beyond it, in
 *  pixels and in millimetres at the thing's distance (`mmPerPx`). */
export function compareOutline(model: Uint8Array, outline: { name: string; u: number; v: number }[], w: number, h: number, mmPerPx: number): Compared {
  const ref = polygonMask(outline.map((p) => [p.u, p.v]), w, h); let inter = 0, uni = 0, over = 0, under = 0;
  for (let i = 0; i < w * h; i++) { const a = model[i]!, b = ref[i]!; if (a && b) inter++; if (a || b) uni++; if (a && !b) over++; if (b && !a) under++; }
  const d = edgeDistance(model, w, h), points = outline.map((p) => { const x = Math.min(w - 1, Math.max(0, Math.round(p.u))), y = Math.min(h - 1, Math.max(0, Math.round(p.v))), px = d[y * w + x]! * (model[y * w + x] ? -1 : 1); return { name: p.name, region: p.name.replace(/^outline /, '').replace(/ \d+$/, ''), px, mm: px * mmPerPx }; });
  const regions = [...new Set(points.map((p) => p.region))].map((region) => { const q = points.filter((p) => p.region === region); return { region, meanPx: q.reduce((a, p) => a + p.px, 0) / q.length, meanMm: q.reduce((a, p) => a + p.mm, 0) / q.length, n: q.length }; });
  return { iou: inter / Math.max(1, uni), over: over / Math.max(1, uni), under: under / Math.max(1, uni), points, byRegion: regions, meanAbsPx: points.reduce((a, p) => a + Math.abs(p.px), 0) / Math.max(1, points.length), mmPerPx };
}

// ---- measuring on the thing ---------------------------------------------------------------------------------------------
/** Where the ray through a pixel meets the plane z = zp (the thing's middle, or its side): its x and y, metres. */
export function backProject(c: Camera, u: number, v: number, zp: number): V3 | null {
  const B = basis(c), dir = unit([B.fw[0] + ((u - c.w / 2) / c.f) * B.rt[0] - ((v - c.h / 2) / c.f) * B.up[0], B.fw[1] + ((u - c.w / 2) / c.f) * B.rt[1] - ((v - c.h / 2) / c.f) * B.up[1], B.fw[2] + ((u - c.w / 2) / c.f) * B.rt[2] - ((v - c.h / 2) / c.f) * B.up[2]]);
  if (Math.abs(dir[2]) < 1e-9) return null; const t = (zp - c.eye[2]) / dir[2]; if (t <= 0) return null;
  return [c.eye[0] + t * dir[0], c.eye[1] + t * dir[1], zp];
}
/** A camera made smaller (its image and focal length by k): the same view, fewer pixels. */
export const scaled = (c: Camera, k: number): Camera => ({ ...c, f: c.f * k, w: Math.round(c.w * k), h: Math.round(c.h * k) });
/** Its pixels made smaller by k (each the most of the k × k it covers: a thin edge is kept). */
export function shrinkMask(m: Uint8Array, w: number, h: number, k: number): { m: Uint8Array; w: number; h: number } {
  const W = Math.round(w * k), H = Math.round(h * k), out = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) out[Math.min(H - 1, Math.floor(y * k)) * W + Math.min(W - 1, Math.floor(x * k))] = 1;
  return { m: out, w: W, h: H };
}

// ---- fitting its figures to what is seen ---------------------------------------------------------------------------------
export interface Fitted { key: string; was: number; now: number; pm: number; evidence: 'measured' | 'estimated'; says: string }
/** Figures of a thing moved so its rendered outline meets the traced one: `render(x)` makes its mask for figures x (at the
 *  camera given), `outline` the traced points (in that camera's pixels), `keys` what each figure is. The error is the mean
 *  of |distance| over the outline points of the regions named; minimised by Nelder–Mead within each figure's range. Each
 *  figure's ± after: how far it can move before the error grows by one pixel (from the error's curvature there); a figure
 *  that moves the error by less than a pixel over its whole range is not fixed by this view: said estimated, left as it
 *  was. */
export function fitFigures(render: (x: number[]) => Uint8Array, outline: { name: string; u: number; v: number }[], w: number, h: number, keys: { key: string; x0: number; lo: number; hi: number; step: number }[], regions: RegExp, o: { most?: number } = {}): { figures: Fitted[]; before: number; after: number; evaluations: number } {
  const pts = outline.filter((p) => regions.test(p.name));
  const cost = (x: number[]) => { const m = render(x), c = compareOutline(m, pts, w, h, 1); return c.meanAbsPx; };
  const x0 = keys.map((k) => k.x0), before = cost(x0);
  const r = minimize(cost, x0, { step: keys.map((k) => k.step), lo: keys.map((k) => k.lo), hi: keys.map((k) => k.hi), most: o.most ?? 60, ftol: 0.05 });
  let evals = r.evaluations + 1;
  const figures = keys.map((k, i): Fitted => {
    // (the error's curvature along this figure alone: at ± one step)
    const at = (d: number) => { const x = r.x.slice(); x[i] = Math.min(k.hi, Math.max(k.lo, x[i]! + d)); evals++; return cost(x); };
    const up = at(k.step), dn = at(-k.step), curv = (up + dn - 2 * r.value) / (k.step * k.step), pm = curv > 1e-9 ? Math.sqrt(2 / curv) : Infinity, fixed = pm < (k.hi - k.lo) / 2;
    return { key: k.key, was: k.x0, now: fixed ? r.x[i]! : k.x0, pm, evidence: fixed ? 'measured' : 'estimated', says: fixed ? `fitted to the outline: ${r.x[i]!.toPrecision(4)} ± ${pm.toPrecision(2)} (the error grows a pixel over that)` : 'not fixed by this view: the outline hardly moves with it; kept as it was' };
  });
  return { figures, before, after: r.value, evaluations: evals };
}

// ---- what to ask for next ----------------------------------------------------------------------------------------------
/** What would settle most of what is unknown or poorly fixed: each kind of view or measurement, the figures it would fix
 *  (by name pattern), and how to take it. The one asked for is the one whose figures weigh most among those not measured
 *  (unknown 1, estimated 1, measured by its ± as a share of its range). */
export const ASKS: { ask: string; fixes: RegExp }[] = [
  // (the camera first where it is not fixed: everything measured through it hangs on it)
  { ask: 'the photograph\'s original file, as the phone saved it (its EXIF keeps the lens\'s focal length, which fixes how far away the camera was), or the phone\'s make and model and which of its lenses took it', fixes: /camera|length|overhang|nose|cowl|roof|deck|tail|belt|cowlH|deckH/ },
  { ask: 'a photograph straight on the front, at headlamp height, the whole car in frame and the ground under its tyres in view', fixes: /width|plan|nose|face|lamp|grille|haunch\.waist|tumble/ },
  { ask: 'a photograph straight on the back, at tail-lamp height, the whole car in frame', fixes: /width|plan|tail|deck|haunch|spoiler|wing/ },
  { ask: 'a photograph square to its side from the other side, at door-handle height, the whole car in frame', fixes: /cowl|roof|deck|belt|nose|tail|door|dlo|sail|length|overhang/ },
  { ask: 'a photograph from above (a drone, or a ladder at a corner), the whole car in frame', fixes: /plan|width|haunch|crown|roof/ },
  { ask: 'a tape measure along the ground from each tyre\'s centre to its bumper\'s face, front and back (its overhangs), and bumper to bumper (its length)', fixes: /length|overhang|nose|tail/ },
  { ask: 'a tape measure from the ground to the top of the front fender over the wheel\'s centre, and the same at the rear', fixes: /clearance|belt|shoulder|ride/ },
];
export function askNext(table: { key: string; evidence: string; pm?: number; range?: number }[]): { ask: string; fixes: string[]; weight: number } {
  const w = (r: (typeof table)[number]) => (r.evidence === 'conflict' || r.evidence === 'not fixed' ? 2 : r.evidence === 'measured' ? Math.min(1, (r.pm ?? 0) / Math.max(1e-9, r.range ?? 1)) : 1);
  const scored = ASKS.map((a) => { const hit = table.filter((r) => a.fixes.test(r.key)); return { ask: a.ask, fixes: hit.map((r) => r.key), weight: hit.reduce((s, r) => s + w(r), 0) }; });
  return scored.sort((a, b) => b.weight - a.weight)[0]!;
}

// ---- a vehicle's known points ----------------------------------------------------------------------------------------
/** The points of a vehicle whose places its published figures fix: each wheel's centre, and its tyre's top, bottom, front
 *  and back on its side, on the side the camera sees (z < 0 its left, as the frame here has it). Named as the photograph's
 *  marks are ("front wheel centre", "rear tyre top"). */
export function knownPoints(m: Machine, side: -1 | 1): { name: string; world: V3 }[] {
  const xs = m.axles.filter((a) => a.track > 0).map((a) => a.x), front = Math.max(...xs), rear = Math.min(...xs), out: { name: string; world: V3 }[] = [];
  for (const a of m.axles) { if (a.track <= 0) continue; const k = a.x === front ? 'front' : a.x === rear ? 'rear' : null, t = tyreOf(a.tyre); if (!k || !t) continue; const R = t.D / 2, z = (side * a.track) / 2;
    out.push({ name: `${k} wheel centre`, world: [a.x, R, z] }, { name: `${k} tyre top`, world: [a.x, 2 * R, z] }, { name: `${k} tyre bottom`, world: [a.x, 0, z] }, { name: `${k} tyre front`, world: [a.x + R, R, z] }, { name: `${k} tyre back`, world: [a.x - R, R, z] }); }
  return out;
}
/** Pixels said briefly where they are shown (a board's results), not a million numbers. */
const brief = <T extends object>(o: T, says: string): T => { Object.defineProperty(o, 'toJSON', { value: () => says, enumerable: false }); return o; };

// ---- the nodes ---------------------------------------------------------------------------------------------------------
const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more }), N = (name: string, unit?: string, label?: string | Partial<PortDef>): PortDef => ({ name, type: 'number', ...(unit ? { unit } : {}), ...(typeof label === 'string' ? { label } : label ?? {}) });
const VISION = { scheme: 'MSC2020' as const, code: '68U10', label: 'Computing methodologies for image processing' }, ACM_CV = { scheme: 'ACM CCS 2012' as const, code: '10010147.10010178.10010224', label: 'Computing methodologies: computer vision' }, MEAS = { scheme: 'ICS' as const, code: '17.040.30', label: 'Measuring instruments (dimensions)' };
const node = (b: Omit<BlockDef, 'version' | 'by' | 'pure'> & { pure?: boolean }) => register({ version: 1, by: 'built in', pure: true, ...b } as BlockDef);
const imgOf = (v: unknown): Img => { const i = v as Img; if (!i || !i.rgba || !i.w) throw new Error('wire a photograph in (Photograph node)'); return i; };
const camOf = (v: unknown): Camera => { const c = v as Camera; if (!c || !c.eye || !c.f) throw new Error('wire a camera in (Camera from known points)'); return c; };
const rowsOf = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const outlineOf = (v: unknown) => rowsOf(v).filter((r) => String(r.name).startsWith('outline')).map((r) => ({ name: String(r.name), u: Number(r.u), v: Number(r.v) }));
const machineOf = (v: unknown): Machine => { const m = v as Machine; if (!m || !m.axles) throw new Error('wire a vehicle\'s record in (Vehicle (a real model) → machine)'); return m; };
const mmPerPx = (c: Camera, at: V3 = [0, 0.7, 0]) => (Math.hypot(...sub(c.eye, at)) / c.f) * 1000;

node({ id: 'photo.load', name: 'Photograph (pixels and its marks)', kind: 'generator', ability: 'generate', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'A reference photograph of the thing to rebuild, and what is marked on it', discipline: 'electrical.signals', role: 'I/O', codes: [VISION, ACM_CV] },
  says: 'A photograph from the library (view/public/photos), decoded to its pixels, with the points marked on it (photo-marks.ts: its wheels, its outline round it by region), who marked them and how, and the thing it is of',
  settings: [{ key: 'id', label: 'Photograph', type: 'choice', default: PHOTOS[0]!.id, choices: PHOTOS.map((p) => p.id) }],
  ports: { inputs: [], outputs: [P('image', 'record'), P('marks', 'table'), P('object', 'text', { label: 'the record it is of' }), P('w', 'integer'), P('h', 'integer'), P('says', 'text')] },
  run: async (_i, c) => { const ph = photoOf(String(c.set.id)); if (!ph) throw new Error(`no photograph "${String(c.set.id)}"`); const img = await loadPhoto(ph.id);
    return { image: brief(img, `${img.w} × ${img.h} pixels`), marks: ph.marks.map((m) => ({ ...m })), object: ph.object, w: img.w, h: img.h, says: `${ph.says}; ${ph.marks.length} points ${ph.by}` }; },
  tests: [{ set: { id: 'mc-side' }, inputs: {}, outputs: { w: 1152, h: 864 } }] });

node({ id: 'photo.features', name: 'Edge-snapped image features (Sobel)', kind: 'logic', ability: 'transform', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'Where exactly are the marked points, by the edges in the photograph?', discipline: 'electrical.signals', role: 'data transformation', codes: [VISION, ACM_CV] },
  says: 'Each marked point moved to the strongest edge near it (Sobel\'s gradient on the brightness, nearer edges preferred): measured where a clear edge was found, with how far it moved; observed (by eye) where none was. A wheel\'s centre is not an edge and stays where it was marked',
  settings: [{ key: 'r', label: 'Search radius, pixels', type: 'number', default: 5 }],
  ports: { inputs: [P('image', 'record'), P('marks', 'table')], outputs: [P('features', 'table'), P('measured', 'integer', { label: 'snapped to an edge' }), P('observed', 'integer', { label: 'by eye only' }), N('moved', undefined, { label: 'the most any moved, px' })] },
  run: (i, c) => { const f = snapMarks(imgOf(i.image), rowsOf(i.marks).map((r) => ({ name: String(r.name), u: Number(r.u), v: Number(r.v) })), Number(c.set.r ?? 5));
    return { features: f.map((x) => ({ ...x })), measured: f.filter((x) => x.evidence === 'measured').length, observed: f.filter((x) => x.evidence === 'observed').length, moved: Math.max(0, ...f.map((x) => Math.hypot(x.du, x.dv))) }; } });

node({ id: 'camera.solve', name: 'Camera resection from known points (pinhole, least squares)', kind: 'solver', ability: 'solve', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'Where was the camera, and how was it pointed?', discipline: 'electrical.signals', role: 'numerical solver', codes: [ACM_CV, { scheme: 'MSC2020', code: '68T45', label: 'Machine vision and scene understanding' }],
    model: { equations: ['u = cₓ + f (d·r)/(d·w), v = c_y − f (d·u)/(d·w), d = P − eye; w, r, u the camera\'s forward, right and up', 'minimise Σ ‖(u, v) − (û, v̂)‖² over eye, target, roll, f'], class: 'analytical', time: 'steady', linear: false, method: 'Nelder–Mead downhill simplex (numeric.ts minimize), restarted four times; both sides tried, the better kept', references: ['Hartley & Zisserman, Multiple View Geometry, 2nd ed., ch. 6–7 (camera models, resection)', 'Nelder & Mead, Comput. J. 7, 308 (1965)'] } },
  says: 'The camera that took the photograph, solved from the points whose places on the thing its published figures fix (a vehicle\'s wheel centres and tyre edges, from its wheelbase, track and tyre size): its eye, aim, roll and focal length, which side it saw, and the error left at each point in pixels. Its principal point taken as the image\'s middle (an assumption, said)',
  ports: { inputs: [P('features', 'table'), P('machine', 'any', { label: 'the vehicle\'s record' }), N('w', undefined, { label: 'image width, px' }), N('h', undefined, { label: 'image height, px' })], outputs: [P('camera', 'record'), N('rms', undefined, { label: 'error left (rms), px' }), P('residuals', 'table'), P('side', 'text'), N('mmPerPx', undefined, { label: 'mm a pixel at the thing' }), P('ambiguity', 'text', { label: 'how well its distance is fixed' }), P('cameras', 'any', { label: 'every camera that fits within a pixel' })] },
  run: (i) => {
    const m = machineOf(i.machine), w = Number(i.w), h = Number(i.h), by = new Map(rowsOf(i.features).map((r) => [String(r.name), r]));
    let best: ReturnType<typeof solveCameraRobust> | null = null, bs: -1 | 1 = -1;
    // (and off the wheels' plane, so the camera's distance is fixed, not only its aim: the outline's highest point is its
    // roof, at its published height on its middle plane, somewhere along it)
    const top = outlineOf(i.features).reduce<{ u: number; v: number } | null>((a, b) => (!a || b.v < a.v ? b : a), null);
    for (const side of [-1, 1] as const) { const pairs: Pair[] = knownPoints(m, side).flatMap((k) => { const r = by.get(k.name); return r ? [{ name: k.name, img: [Number(r.u), Number(r.v)] as [number, number], world: k.world }] : []; });
      if (pairs.length < 5) throw new Error(`only ${pairs.length} known points marked: mark at least five (each wheel's centre and its tyre's top, bottom, front and back)`);
      if (top) pairs.push({ name: 'roof (its published height)', img: [top.u, top.v], world: [0, m.H, 0], alongX: [-m.L / 4, m.L / 4] });
      const s = solveCameraRobust(pairs, w, h, side, [0, 0.6, 0]); if (!best || s.best.rms < best.best.rms) { best = s; bs = side; } }
    const b = best!.best, sp = best!.spread;
    return { camera: b.cam, cameras: best!.fitting, rms: b.rms, residuals: b.residuals, side: bs < 0 ? 'its left' : 'its right', mmPerPx: mmPerPx(b.cam),
      ambiguity: sp.distance[1] - sp.distance[0] > 0.1 * sp.distance[0] ? `not fixed: cameras from ${sp.distance[0].toFixed(1)} to ${sp.distance[1].toFixed(1)} m away (focal ${sp.f[0].toFixed(0)}–${sp.f[1].toFixed(0)} px) fit within a pixel of the best; what is measured through it is uncertain by as much` : `fixed: every start that fits within a pixel of the best puts it ${sp.distance[0].toFixed(1)}–${sp.distance[1].toFixed(1)} m away` };
  } });

node({ id: 'photo.measure', name: 'Photogrammetric dimensions (back-projection onto its middle plane)', kind: 'calculator', ability: 'measure', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'How long, how high is it, by the photograph?', discipline: 'manufacturing.metrology.inspection', role: 'analysis', codes: [MEAS, ACM_CV], model: { equations: ['X = eye + t·ray(u, v), t where X·ẑ = 0'], class: 'analytical', time: 'steady', linear: false, references: ['Hartley & Zisserman, Multiple View Geometry, 2nd ed., §8.1 (back-projection)'] } },
  says: 'Its length, overhangs and roof height read off the photograph: the outline\'s foremost, rearmost and highest points cast back through the camera onto the vehicle\'s middle plane, each ± the camera\'s error at that distance; set against its record\'s figures, and any that disagree by more than three times that said as a conflict, not overwritten',
  ports: { inputs: [P('features', 'table'), P('camera', 'record'), P('machine', 'any'), P('cameras', 'any', { optional: true, label: 'every camera that fits (Camera node): measured through each' })], outputs: [P('dimensions', 'table'), P('conflicts', 'integer'), P('unfixed', 'integer', { label: 'not fixed by the photograph' })] },
  run: (i) => {
    const c0 = camOf(i.camera), m = machineOf(i.machine), o = outlineOf(i.features); if (o.length < 3) throw new Error('no outline marked');
    const fa = Math.max(...m.axles.map((a) => a.x)), ra = Math.min(...m.axles.map((a) => a.x)), cams = Array.isArray(i.cameras) && i.cameras.length ? (i.cameras as Camera[]) : [c0];
    // (each dimension measured through every camera that fits: its value through the best, its ± the camera's pixel error
    // there and half the spread across them)
    const through = (c: Camera) => { const nose = o.reduce((a, b) => (b.u < a.u === (c.eye[2] < 0) ? b : a)), tail = o.reduce((a, b) => (b.u > a.u === (c.eye[2] < 0) ? b : a)), top = o.reduce((a, b) => (b.v < a.v ? b : a));
      const N0 = backProject(c, nose.u, nose.v, 0), T0 = backProject(c, tail.u, tail.v, 0), R0 = backProject(c, top.u, top.v, 0); if (!N0 || !T0 || !R0) return null;
      return [N0[0] - T0[0], N0[0] - fa, ra - T0[0], R0[1]]; };
    const best = through(c0); if (!best) throw new Error('the outline does not cast back onto its middle plane from this camera');
    const all = cams.map(through).filter((x): x is number[] => !!x), rec = [m.L, m.L / 2 - fa, ra + m.L / 2, m.H], names = ['length', 'front overhang', 'rear overhang', 'height'], src = ['published', 'its record (an estimate)', 'its record', 'published'];
    const rows = names.map((k, j) => { const vs = all.map((x) => x[j]!), spread = (Math.max(...vs) - Math.min(...vs)) / 2, pm = Math.hypot((3 * mmPerPx(c0)) / 1000, spread), d = best[j]! - rec[j]!;
      // (its height placed the camera (Camera node): read back through it, it is no check of itself)
      if (k === 'height') return { dimension: k, photograph: +best[j]!.toFixed(3), pm: +pm.toFixed(3), record: +rec[j]!.toFixed(3), source: 'published, and used to place the camera: not checked by it', differs: +d.toFixed(3), evidence: 'given' };
      return { dimension: k, photograph: +best[j]!.toFixed(3), pm: +pm.toFixed(3), record: +rec[j]!.toFixed(3), source: src[j], differs: +d.toFixed(3), evidence: pm > 0.05 * rec[j]! ? 'not fixed' : Math.abs(d) > pm ? 'conflict' : 'measured' }; });
    return { dimensions: rows, conflicts: rows.filter((r) => r.evidence === 'conflict').length, unfixed: rows.filter((r) => r.evidence === 'not fixed').length };
  } });

node({ id: 'render.silhouette', name: 'Silhouette rendering from a camera', kind: 'logic', ability: 'transform', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'What would the camera see of the model?', discipline: 'electrical.signals', role: 'visualisation', codes: [ACM_CV, { scheme: 'ACM CCS 2012', code: '10010147.10010371.10010372', label: 'Computing methodologies: rendering' }] },
  says: 'The thing as made, seen by the camera: every drawn piece\'s triangles (as the viewer draws them) projected and filled into a mask; its area in pixels',
  ports: { inputs: [P('thing', 'assembly'), P('camera', 'record')], outputs: [P('mask', 'record'), P('area', 'integer', { label: 'pixels covered' })] },
  run: (i) => { const c = camOf(i.camera), t = i.thing as Part; if (!t || !('name' in t)) throw new Error('wire a thing in'); const m = silhouette(t, c);
    return { mask: brief({ w: c.w, h: c.h, m }, `a ${c.w} × ${c.h} mask`), area: m.reduce((a, b) => a + b, 0) }; } });

node({ id: 'compare.outline', name: 'Silhouette comparison (IoU, signed contour error)', kind: 'critic', ability: 'check', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'Where, and by how much, does the model miss the photograph?', discipline: 'manufacturing.metrology.inspection', role: 'assessment', codes: [MEAS, ACM_CV] },
  says: 'The model\'s silhouette against the outline traced on the photograph: their overlap (intersection over union), and at each outline point how far the model\'s edge is, + where the model falls short of the photograph, − where it stands beyond it, in pixels and millimetres at the thing\'s distance, by region (its nose, roof, tail …)',
  ports: { inputs: [P('mask', 'record'), P('features', 'table'), P('camera', 'record')], outputs: [N('iou', undefined, { label: 'overlap (IoU)' }), N('error', 'mm', 'mean |error|'), P('regions', 'table'), P('points', 'table')] },
  run: (i) => { const mk = i.mask as { w: number; h: number; m: Uint8Array }, c = camOf(i.camera); if (!mk?.m) throw new Error('wire a silhouette in'); const o = outlineOf(i.features); if (o.length < 3) throw new Error('no outline marked');
    const r = compareOutline(mk.m, o, mk.w, mk.h, mmPerPx(c)); return { iou: r.iou, error: r.meanAbsPx * r.mmPerPx, regions: r.byRegion.map((x) => ({ region: x.region, px: +x.meanPx.toFixed(1), mm: +x.meanMm.toFixed(0), points: x.n })), points: r.points.map((x) => ({ ...x, px: +x.px.toFixed(1), mm: +x.mm.toFixed(0) })) }; },
  // (a 20 × 20 square drawn where a square outline is traced: they overlap wholly)
  tests: [{ inputs: { mask: { w: 40, h: 40, m: Uint8Array.from({ length: 1600 }, (_, k) => (k % 40 >= 10 && k % 40 < 30 && k >= 400 && k < 1200 ? 1 : 0)) }, camera: { eye: [0, 0, -10], target: [0, 0, 0], roll: 0, f: 100, w: 40, h: 40 }, features: [{ name: 'outline a 1', u: 10, v: 10 }, { name: 'outline a 2', u: 30, v: 10 }, { name: 'outline a 3', u: 30, v: 30 }, { name: 'outline a 4', u: 10, v: 30 }] }, outputs: { iou: 1 } }] });

const LINE_KEYS: Record<string, [number, number, number]> = { nose: [0.4, 0.7, 0.02], cowl: [0.2, 0.36, 0.01], roofF: [0.33, 0.5, 0.01], roofR: [0.55, 0.72, 0.01], deck: [0.7, 0.88, 0.01], tail: [0.6, 0.85, 0.02], belt: [0.55, 0.75, 0.01], cowlH: [0.6, 0.82, 0.01], deckH: [0.68, 0.9, 0.01] };
node({ id: 'fit.lines', name: 'Body lines fitted to a photograph (analysis by synthesis)', kind: 'solver', ability: 'optimise', domains: ['vehicles', 'manufacturing', 'science'], pure: true,
  spec: { gloss: 'Which body lines make the model look like the photograph?', discipline: 'mechanical.design', role: 'numerical solver', codes: [ACM_CV, { scheme: 'MSC2020', code: '65K10', label: 'Numerical optimization and variational techniques' }],
    model: { equations: ['minimise mean |d(outline point, model edge)| over the line figures, the body built and rendered from the photograph\'s camera each step', '± from the curvature of that error: ±σ = √(2 / ∂²E/∂x²) (a pixel\'s growth)'], class: 'analytical', time: 'steady', linear: false, method: 'Nelder–Mead within each figure\'s range; at half the photograph\'s size', references: ['Nelder & Mead, Comput. J. 7, 308 (1965)', 'Hartley & Zisserman, Multiple View Geometry, 2nd ed. (analysis by synthesis: render, compare, correct)'] } },
  says: 'The vehicle\'s body lines (where its windscreen\'s foot, its roof, its back glass\'s foot are along it, how high its nose, tail and the glass\'s feet stand) moved until its rendered silhouette meets the outline traced on the photograph: the body built and rendered from the photograph\'s camera at every step (the rest of the vehicle rendered once). Each figure with its ±; one the view does not fix (the outline hardly moves with it) kept as it was and said estimated. Gives the fitted vehicle and its record, to render and compare again',
  settings: [{ key: 'keys', label: 'Figures to fit', type: 'text', default: 'nose cowl roofF roofR deck tail cowlH deckH' }, { key: 'most', label: 'At most, evaluations', type: 'number', default: 60 }, { key: 'scale', label: 'Image scale while fitting', type: 'number', default: 0.5 }],
  ports: { inputs: [P('machine', 'any'), P('camera', 'record'), P('features', 'table'), P('cameras', 'any', { optional: true, label: 'every camera that fits (Camera node)' })], outputs: [P('figures', 'table'), N('before', undefined, { label: 'error before (mean, at its scale), px' }), N('after', undefined, { label: 'error after, px' }), P('machine', 'any', { label: 'the fitted record' }), P('vehicle', 'part', { label: 'the fitted vehicle' })] },
  run: (i, c) => {
    const m = machineOf(i.machine), cam = camOf(i.camera), o = outlineOf(i.features); if (!m.lines) throw new Error('its record has no body lines to fit'); if (o.length < 3) throw new Error('no outline marked');
    const k = Number(c.set.scale ?? 0.5), cs = scaled(cam, k), full = makeMachine(m), names = new Set(bodyPanels(bodyPlanOf(m)).map((p) => p.name)), rest = silhouette(full, cs, new RegExp(`^(${[...names].map((n) => n.replace(/[()]/g, '\\$&')).join('|')})$`));
    const keys = String(c.set.keys ?? '').split(/\s+/).filter((x) => LINE_KEYS[x]).map((key) => { const [lo, hi, step] = LINE_KEYS[key]!; return { key, x0: Number((m.lines as unknown as Record<string, number>)[key] ?? (lo + hi) / 2), lo, hi, step }; });
    const linesOf = (x: number[]) => ({ ...m.lines!, ...Object.fromEntries(keys.map((kk, j) => [kk.key, x[j]!])) });
    const render = (x: number[]) => { const b = silhouette({ name: 'body', parts: bodyPanels(bodyPlanOf({ ...m, lines: linesOf(x) })) }, cs), r = new Uint8Array(rest); for (let j = 0; j < r.length; j++) r[j] = r[j]! | b[j]!; return r; };
    const fit = fitFigures(render, o.map((p) => ({ ...p, u: p.u * k, v: p.v * k })), cs.w, cs.h, keys, /nose|hood|windscreen|roof|backlight|tail/, { most: Number(c.set.most ?? 60) });
    const fitted: Machine = { ...m, lines: linesOf(fit.figures.map((f) => f.now)) };
    // (fitted through the best camera: where others fit the photograph as well from elsewhere, what is fitted is no better
    // fixed than the camera is, and is said so)
    const cs2 = Array.isArray(i.cameras) ? (i.cameras as Camera[]) : [], ds = cs2.map((q) => Math.hypot(...sub(q.eye, [0, 0.6, 0]))), loose = ds.length > 1 && Math.max(...ds) - Math.min(...ds) > 0.1 * Math.min(...ds);
    return { figures: fit.figures.map((f) => ({ figure: f.key, was: +f.was.toFixed(3), now: +f.now.toFixed(3), pm: Number.isFinite(f.pm) ? +f.pm.toFixed(3) : 'unbounded', evidence: loose && f.evidence === 'measured' ? 'not fixed' : f.evidence, says: loose && f.evidence === 'measured' ? `${f.says}; but only through the best of cameras ${Math.min(...ds).toFixed(1)}–${Math.max(...ds).toFixed(1)} m away that fit as well: not fixed until the camera is` : f.says })), before: fit.before / k, after: fit.after / k, machine: fitted, vehicle: makeMachine(fitted) };
  } });

node({ id: 'ask.next', name: 'Next best view or measurement (uncertainty ranking)', kind: 'critic', ability: 'ask', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'What one photograph or measurement would settle the most?', discipline: 'manufacturing.metrology.inspection', role: 'assessment', codes: [MEAS, ACM_CV] },
  says: 'What is still not known, or not well fixed, after fitting and measuring (a figure the photograph does not fix, a dimension that conflicts with the record, what no photograph yet shows: its width and its plan, its face, its tail), weighed (unknown 1, a conflict 2, a measured figure by its ± over its range), and the single photograph or measurement that would settle the most of it',
  ports: { inputs: [P('figures', 'table', { optional: true }), P('dimensions', 'table', { optional: true }), P('ambiguity', 'text', { optional: true, label: 'how well the camera is fixed (Camera node)' })], outputs: [P('ask', 'text'), P('settles', 'list<text>'), P('open', 'table', { label: 'what is still open' })] },
  run: (i) => {
    const rows = [...rowsOf(i.figures).map((r) => ({ key: String(r.figure), evidence: String(r.evidence), pm: Number(r.pm), range: 0.1 })), ...rowsOf(i.dimensions).map((r) => ({ key: String(r.dimension), evidence: String(r.evidence), pm: Number(r.pm), range: 0.5 })),
      ...(String(i.ambiguity ?? '').startsWith('not fixed') ? [{ key: 'camera distance', evidence: 'not fixed' }] : []),
      // (what a single side view never shows)
      { key: 'width plan haunch.waist tumble', evidence: 'unknown' }, { key: 'face lamp grille', evidence: 'unknown' }, { key: 'tail face', evidence: 'unknown' }];
    const a = askNext(rows); return { ask: a.ask, settles: a.fixes, open: rows.filter((r) => r.evidence !== 'measured').map((r) => ({ what: r.key, evidence: r.evidence })) };
  },
  tests: [{ inputs: { ambiguity: 'not fixed: cameras from 4 to 50 m away fit', dimensions: [{ dimension: 'length', evidence: 'not fixed', pm: 0.5 }] }, outputs: { ask: ASKS[0]!.ask } }, { inputs: { dimensions: [{ dimension: 'length', evidence: 'measured', pm: 0.01 }] }, outputs: { ask: ASKS[1]!.ask } }] });
