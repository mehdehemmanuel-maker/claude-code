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
import { unzlibSync, zlibSync } from 'fflate';
import { layout } from './make/space';
import { geometry } from './view/kit3d';
import { minimize, fitBy } from './numeric';
import type { Part, V3 } from './kits';
import { tessellate, type Patch } from './surface';
import { PHOTOS, photoOf, type Mark, type Trace } from './photo-marks';
import { register, type BlockDef, type PortDef, type Type } from './blocks';
import { makeMachine, tyreOf, bodyPlanOf, bodyKit, type Machine, type BodyKit } from './machines';
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
const geos = new WeakMap<object, THREE.BufferGeometry | null>(), coarser = new Map<number, WeakMap<object, THREE.BufferGeometry | null>>();
/** A freeform skin drawn with n facets each way, not by its curvature (the viewer's): for seeing its outline many times
 *  over at a few pixels a facet, where its curvature's hundreds of facets cost more than they show. */
function coarseSurf(pt: Patch, n: number): THREE.BufferGeometry { const t = tessellate(pt, n, n), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3)); g.setIndex(t.idx); return g; }
/** The thing as the camera sees it: every drawn piece's triangles (as the viewer draws them) filled into a mask, 1 where
 *  any piece covers the pixel. `skip` leaves out pieces by name (what the photograph does not show); `coarse` draws its
 *  freeform skins with that many facets each way (see coarseSurf). */
export function silhouette(root: Part, c: Camera, skip?: RegExp, coarse?: number): Uint8Array {
  const m = new Uint8Array(c.w * c.h), B = basis(c), v = new THREE.Vector3(), kept = coarse ? (coarser.get(coarse) ?? coarser.set(coarse, new WeakMap()).get(coarse)!) : geos;
  for (const n of layout(root)) {
    const p = n.p; if (!p.shape || (skip && skip.test(p.name))) continue;
    let g = kept.get(p.shape); if (g === undefined) { try { g = coarse && 'surf' in p.shape ? coarseSurf(p.shape.surf, coarse) : geometry(p.shape, p.mat, p.make, p.facets); } catch { g = null; } kept.set(p.shape, g); }
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
// ---- the outline, dense and on the picture's own edges ----------------------------------------------------------------
/** The traced outline made dense and laid on the picture's own edges: a point every `step` pixels along it, each moved along
 *  the outline's normal to the strongest edge within r pixels (nearer ones preferred, an edge under `clear` not counted),
 *  the moves then smoothed round it (the middle of seven) so one caught on a reflection does not kink it. Each point keeps
 *  the region it lies in; one with no clear edge near stays where the trace put it. */
export function denseOutline(img: Img, outline: Mark[], step = 3, r = 6, clear = 120): { pts: Mark[]; snapped: number; moved: number } {
  const g = gradient(img), { w, h } = img, raw: { region: string; u: number; v: number; nx: number; ny: number }[] = [], regionOf = (n: string) => n.replace(/^outline /, '').replace(/ \d+$/, '');
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!, b = outline[(i + 1) % outline.length]!, L = Math.hypot(b.u - a.u, b.v - a.v); if (L < 1e-6) continue;
    const k = Math.max(1, Math.round(L / step)), nx = -(b.v - a.v) / L, ny = (b.u - a.u) / L;
    for (let j = 0; j < k; j++) raw.push({ region: regionOf(a.name), u: a.u + ((b.u - a.u) * j) / k, v: a.v + ((b.v - a.v) * j) / k, nx, ny });
  }
  const off = raw.map((p) => { let best = -Infinity, bt = NaN; for (let t = -r; t <= r; t += 0.5) { const x = Math.round(p.u + t * p.nx), y = Math.round(p.v + t * p.ny); if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue; const e = g[y * w + x]!; if (e < clear) continue; const sc = e - 8 * Math.abs(t); if (sc > best) { best = sc; bt = t; } } return bt; });
  const n = raw.length, sm = off.map((_, i) => { const q: number[] = []; for (let d = -3; d <= 3; d++) { const o = off[(i + d + n) % n]!; if (Number.isFinite(o)) q.push(o); } q.sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)]! : 0; });
  const counts = new Map<string, number>(), pts = raw.map((p, i) => { const c = (counts.get(p.region) ?? 0) + 1; counts.set(p.region, c); return { name: `outline ${p.region} ${c}`, u: p.u + sm[i]! * p.nx, v: p.v + sm[i]! * p.ny }; });
  return { pts, snapped: off.filter(Number.isFinite).length, moved: Math.max(0, ...sm.map(Math.abs)) };
}

// ---- matching both ways ------------------------------------------------------------------------------------------------
/** What a model is matched to: the outline as a filled mask at a scale k of the picture, how far every pixel is from its
 *  edge, and its points. */
export interface Target { w: number; h: number; mask: Uint8Array; dt: Float32Array; pts: { u: number; v: number }[] }
export function targetOf(outline: { u: number; v: number }[], w: number, h: number, k = 1): Target {
  const pts = outline.map((p) => ({ u: p.u * k, v: p.v * k })), W = Math.round(w * k), H = Math.round(h * k), mask = polygonMask(pts.map((p) => [p.u, p.v]), W, H);
  return { w: W, h: H, mask, dt: edgeDistance(mask, W, H), pts };
}
/** A model's silhouette against a target both ways: the mean distance from the target's outline to the model's edge
 *  (where the model falls short of it, or stands past it at those points), and from the model's edge to the target's
 *  outline (so a piece standing out where the outline is not, a wing's tip, a nose run long, counts too); their mean, in
 *  pixels at the target's scale; and their overlap (IoU). */
export function twoSided(model: Uint8Array, T: Target): { err: number; toModel: number; toTarget: number; iou: number } {
  const { w, h } = T, d = edgeDistance(model, w, h); let a = 0;
  for (const p of T.pts) a += d[Math.min(h - 1, Math.max(0, Math.round(p.v))) * w + Math.min(w - 1, Math.max(0, Math.round(p.u)))]!;
  a /= Math.max(1, T.pts.length);
  let b = 0, nb = 0, inter = 0, uni = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, v = model[i], t = T.mask[i]; if (v && t) inter++; if (v || t) uni++;
    if (v && ((x > 0 && !model[i - 1]) || (x < w - 1 && !model[i + 1]) || (y > 0 && !model[i - w]) || (y < h - 1 && !model[i + w]))) { b += T.dt[i]!; nb++; } }
  b = nb ? b / nb : w;
  return { err: (a + b) / 2, toModel: a, toTarget: b, iou: inter / Math.max(1, uni) };
}

// ---- seeing the model as the picture does ------------------------------------------------------------------------------
/** The model seen from a camera as a picture is: at each pixel which part is nearest (its index in `names`, -1 none), how
 *  far (along the camera's axis, m), and its colour shaded by a light from over the camera's shoulder (Lambert, both
 *  faces lit). From the same camera as the picture, so it is set against the picture the right way round, feature by
 *  feature. */
export interface View { w: number; h: number; depth: Float32Array; id: Int32Array; names: string[]; rgb: Uint8Array; camera: Camera }
export function renderView(root: Part, c: Camera, skip?: RegExp, coarse?: number): View {
  const { w, h } = c, depth = new Float32Array(w * h).fill(Infinity), id = new Int32Array(w * h).fill(-1), rgb = new Uint8Array(w * h * 3), names: string[] = [], B = basis(c), v = new THREE.Vector3(), kept = coarse ? (coarser.get(coarse) ?? coarser.set(coarse, new WeakMap()).get(coarse)!) : geos;
  const L = unit([-B.fw[0] + 0.6 * B.up[0] - 0.3 * B.rt[0], -B.fw[1] + 0.6 * B.up[1] - 0.3 * B.rt[1], -B.fw[2] + 0.6 * B.up[2] - 0.3 * B.rt[2]]);
  for (const n of layout(root)) {
    const p = n.p; if (!p.shape || (skip && skip.test(p.name))) continue;
    let g = kept.get(p.shape); if (g === undefined) { try { g = coarse && 'surf' in p.shape ? coarseSurf(p.shape.surf, coarse) : geometry(p.shape, p.mat, p.make, p.facets); } catch { g = null; } kept.set(p.shape, g); }
    if (!g) continue;
    const k = names.length; names.push(p.name); const col = p.color ?? 0x8a8d91, cr = (col >> 16) & 255, cg = (col >> 8) & 255, cb = col & 255;
    const pos = g.attributes.position!, idx = g.index, W: V3[] = [], pr: ([number, number, number] | null)[] = [];
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(n.m); const q: V3 = [v.x, v.y, v.z]; W.push(q); pr.push(project(c, q, B)); }
    const tri = (a: number, b: number, d: number) => {
      const A = pr[a], Bq = pr[b], C = pr[d]; if (!A || !Bq || !C) return;
      const nn = unit(cross(sub(W[b]!, W[a]!), sub(W[d]!, W[a]!))), lam = 0.32 + 0.68 * Math.abs(dot(nn, L));
      const x0 = Math.max(0, Math.floor(Math.min(A[0], Bq[0], C[0]))), x1 = Math.min(w - 1, Math.ceil(Math.max(A[0], Bq[0], C[0]))), y0 = Math.max(0, Math.floor(Math.min(A[1], Bq[1], C[1]))), y1 = Math.min(h - 1, Math.ceil(Math.max(A[1], Bq[1], C[1])));
      const e = (P: number[], Q: number[], x: number, y: number) => (Q[0]! - P[0]!) * (y - P[1]!) - (Q[1]! - P[1]!) * (x - P[0]!), area = e(A, Bq, C[0], C[1]); if (Math.abs(area) < 1e-9) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x + 0.5, py = y + 0.5, wa = e(Bq, C, px, py) / area, wb = e(C, A, px, py) / area, wc = e(A, Bq, px, py) / area; if (wa < 0 || wb < 0 || wc < 0) continue;
        // (depth across the triangle as the picture has it: its reciprocal is what varies evenly across the screen)
        const z = 1 / (wa / A[2] + wb / Bq[2] + wc / C[2]), i = y * w + x; if (z >= depth[i]!) continue;
        depth[i] = z; id[i] = k; rgb[i * 3] = Math.min(255, cr * lam + 18 * lam); rgb[i * 3 + 1] = Math.min(255, cg * lam + 18 * lam); rgb[i * 3 + 2] = Math.min(255, cb * lam + 18 * lam); }
    };
    if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)); else for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
  }
  return { w, h, depth, id, names, rgb, camera: c };
}
/** How far every pixel is from the nearest of a set of pixels (a two-pass 3–4 chamfer, Borgefors 1986), in pixels. */
export function distTo(set: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h); for (let i = 0; i < w * h; i++) d[i] = set[i] ? 0 : 1e9;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 1e9 : d[y * w + x]!);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; d[i] = Math.min(d[i]!, at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; d[i] = Math.min(d[i]!, at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
  for (let i = 0; i < w * h; i++) d[i] = d[i]! / 3; return d;
}
/** A mask's own edge: its pixels with a neighbour outside it. */
export function rim(m: Uint8Array, w: number, h: number): Uint8Array {
  const r = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (m[i] && ((x > 0 && !m[i - 1]) || (x < w - 1 && !m[i + 1]) || (y > 0 && !m[i - w]) || (y < h - 1 && !m[i + w]) || x === 0 || y === 0 || x === w - 1 || y === h - 1)) r[i] = 1; }
  return r;
}

// ---- features, one by one ------------------------------------------------------------------------------------------------
export interface FeatureRow { feature: string; found: boolean; iou: number; centrePx: number; centreMm: number; edgePx: number; edgeMm: number; area: number; du: number; dv: number; says: string }
/** Each traced feature against the model's own part of that name as the same camera sees it (only what is not hidden
 *  behind something nearer counts, and only near where the feature is traced, so a car's other wheel is not this one):
 *  their overlap, how far apart their middles are (and which way: du + the model's is to the right, dv + below), the
 *  mean distance between their edges both ways, and the model's area over the traced one; in pixels and in mm at the
 *  scale given. A traced point (a handle) against the middle of the model's part near it. */
export function compareFeatures(view: View, traces: Trace[], mmPx: number): FeatureRow[] {
  const { w, h } = view;
  return traces.map((t): FeatureRow => {
    const re = new RegExp(t.parts), ids = new Set(view.names.flatMap((n, i) => (re.test(n) ? [i] : [])));
    const pts = t.poly ?? (t.at ? [t.at] : []), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys), pad = Math.max(40, 0.6 * Math.max(bw, bh));
    const X0 = Math.max(0, Math.floor(Math.min(...xs) - pad)), X1 = Math.min(w - 1, Math.ceil(Math.max(...xs) + pad)), Y0 = Math.max(0, Math.floor(Math.min(...ys) - pad)), Y1 = Math.min(h - 1, Math.ceil(Math.max(...ys) + pad));
    const mm = new Uint8Array(w * h); let n = 0, sx = 0, sy = 0;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = y * w + x; if (ids.has(view.id[i]!)) { mm[i] = 1; n++; sx += x + 0.5; sy += y + 0.5; } }
    if (!n) return { feature: t.name, found: false, iou: 0, centrePx: NaN, centreMm: NaN, edgePx: NaN, edgeMm: NaN, area: 0, du: NaN, dv: NaN, says: ids.size ? 'the model has it, but it is hidden or elsewhere from this camera' : 'the model has no such part' };
    const cx = sx / n, cy = sy / n;
    if (!t.poly) { const du = cx - t.at![0], dv = cy - t.at![1], c = Math.hypot(du, dv); return { feature: t.name, found: true, iou: NaN, centrePx: c, centreMm: c * mmPx, edgePx: NaN, edgeMm: NaN, area: NaN, du, dv, says: 'a point: the middle of the model\'s part near it' }; }
    const tm = polygonMask(t.poly, w, h); let inter = 0, uni = 0, tn = 0, tx = 0, ty = 0;
    for (let i = 0; i < w * h; i++) { const a = mm[i], b = tm[i]; if (a && b) inter++; if (a || b) uni++; if (b) { tn++; tx += (i % w) + 0.5; ty += Math.floor(i / w) + 0.5; } }
    const dm = distTo(rim(mm, w, h), w, h), dt = distTo(rim(tm, w, h), w, h), rm = rim(mm, w, h), rt = rim(tm, w, h); let a = 0, na = 0, b = 0, nb = 0;
    for (let i = 0; i < w * h; i++) { if (rt[i]) { a += dm[i]!; na++; } if (rm[i]) { b += dt[i]!; nb++; } }
    const du = cx - tx / tn, dv = cy - ty / tn, c = Math.hypot(du, dv), e = (a / Math.max(1, na) + b / Math.max(1, nb)) / 2;
    return { feature: t.name, found: true, iou: inter / Math.max(1, uni), centrePx: c, centreMm: c * mmPx, edgePx: e, edgeMm: e * mmPx, area: n / Math.max(1, tn), du, dv, says: '' };
  });
}

// ---- edges inside the outline ---------------------------------------------------------------------------------------------
/** The model's own edges as the camera sees them: where the nearest part changes, or the depth jumps (a panel standing
 *  proud of the next), or the shade turns sharply (a crease). */
export function viewEdges(v: View): Uint8Array {
  const { w, h } = v, e = new Uint8Array(w * h), L = (i: number) => v.rgb[i * 3]! + v.rgb[i * 3 + 1]! + v.rgb[i * 3 + 2]!;
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x;
    for (const j of [i + 1, i + w]) { if (v.id[i]! < 0 && v.id[j]! < 0) continue;
      if (v.id[i] !== v.id[j] || Math.abs(v.depth[i]! - v.depth[j]!) > 0.02 * Math.min(v.depth[i]!, v.depth[j]!) || Math.abs(L(i) - L(j)) > 90) { e[i] = 1; break; } } }
  return e;
}
export interface EdgeReport { precision: number; recall: number; modelToPicture: number; pictureToModel: number; cells: { cell: string; error: number; parts: string }[] }
/** The model's edges against the picture's (Sobel's, over `strong`), inside the thing's outline (and a few pixels round
 *  it): how many of the model's edges have a picture edge within `near` pixels (precision) and the picture's a model edge
 *  (recall), the mean distance each way (capped at 20 px, so one missing feature does not swamp the rest), and the thing
 *  cut in a 6 × 3 grid with each cell's error and the model's parts on its edges there, worst first: where the model's
 *  windows, seams, vents and creases are not where the picture's are. The picture's edges include its reflections and
 *  shadows, which no model has: its recall is a floor, not a score. */
export function compareEdges(v: View, img: Img, outline: { u: number; v: number }[], o: { strong?: number; near?: number } = {}): EdgeReport {
  const { w, h } = v, k = w / img.w, g = gradient(img), strong = o.strong ?? 160, near = o.near ?? 3;
  const T = targetOf(outline, img.w, img.h, k), inside = (i: number) => T.mask[i] || T.dt[i]! <= 4;
  const pe = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!inside(i)) continue; const gi = Math.min(img.h - 1, Math.round((y + 0.5) / k)) * img.w + Math.min(img.w - 1, Math.round((x + 0.5) / k)); if (g[gi]! > strong) pe[i] = 1; }
  const me = viewEdges(v); for (let i = 0; i < w * h; i++) if (!inside(i)) me[i] = 0;
  const dP = distTo(pe, w, h), dM = distTo(me, w, h), cap = (d: number) => Math.min(20, d);
  const xs = T.pts.map((p) => p.u), ys = T.pts.map((p) => p.v), X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
  const cells = Array.from({ length: 18 }, () => ({ s: 0, n: 0, parts: new Map<string, number>() }));
  const cellOf = (x: number, y: number) => Math.min(5, Math.max(0, Math.floor(((x - X0) / Math.max(1, X1 - X0)) * 6))) + 6 * Math.min(2, Math.max(0, Math.floor(((y - Y0) / Math.max(1, Y1 - Y0)) * 3)));
  let mt = 0, mn = 0, mp = 0, pt = 0, pn = 0, pr = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x;
    if (me[i]) { mt += cap(dP[i]!); mn++; if (dP[i]! <= near) mp++; const c = cells[cellOf(x, y)]!; c.s += cap(dP[i]!); c.n++; const nm = v.names[v.id[i]!] ?? ''; if (nm) c.parts.set(nm, (c.parts.get(nm) ?? 0) + 1); }
    if (pe[i]) { pt += cap(dM[i]!); pn++; if (dM[i]! <= near) pr++; const c = cells[cellOf(x, y)]!; c.s += cap(dM[i]!); c.n++; } }
  const cols = ['its front', 'its front wheel', 'ahead of its door', 'its door', 'its rear quarter', 'its tail'], rows = ['top', 'middle', 'bottom'];
  return { precision: mp / Math.max(1, mn), recall: pr / Math.max(1, pn), modelToPicture: (mt / Math.max(1, mn)) / k, pictureToModel: (pt / Math.max(1, pn)) / k,
    cells: cells.map((c, j) => ({ cell: `${rows[Math.floor(j / 6)]} of ${cols[j % 6]}`, error: c.n ? c.s / c.n / k : 0, parts: [...c.parts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n).join(', ') })).filter((c) => c.error > 0).sort((a, b) => b.error - a.error) };
}

// ---- onto the model's own surface ----------------------------------------------------------------------------------------
/** Where a pixel's ray meets the model's surface as the view saw it (its depth there), or, where the model has nothing
 *  at that pixel, the plane at depth `z`: the picture's point put back on the thing in 3D. */
export function onSurface(v: View, u: number, vv: number, z?: number): V3 | null {
  const c = v.camera, B = basis(c), x = Math.min(v.w - 1, Math.max(0, Math.round(u))), y = Math.min(v.h - 1, Math.max(0, Math.round(vv))), d = v.depth[y * v.w + x]!, zz = Number.isFinite(d) ? d : z; if (zz === undefined) return null;
  const a = (u - c.w / 2) / c.f, b = -(vv - c.h / 2) / c.f; return [0, 1, 2].map((j) => c.eye[j]! + zz * (B.fw[j]! + a * B.rt[j]! + b * B.up[j]!)) as V3;
}

// ---- a picture written ----------------------------------------------------------------------------------------------------
/** RGB pixels written as a PNG (8-bit truecolour, no filter), to keep or show. */
export function encodePng(w: number, h: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array((w * 3 + 1) * h); for (let y = 0; y < h; y++) raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Uint8Array) => { const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer); dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i); out.set(data, 8); dv.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length))); return out; };
  const hd = new Uint8Array(13), dv = new DataView(hd.buffer); dv.setUint32(0, w); dv.setUint32(4, h); hd[8] = 8; hd[9] = 2;
  const parts = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), chunk('IHDR', hd), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array(0))], all = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  return all;
}
/** The picture and the model side by side from the same camera, and the picture with each traced feature's edge (green)
 *  and the model's part's edge (red) over it: what a person looks at to see where the model is wrong. */
export function sideBySide(img: Img, v: View, traces: Trace[]): { w: number; h: number; rgb: Uint8Array } {
  const k = v.w / img.w, W = v.w, H = v.h, out = new Uint8Array(W * 3 * H * 3), put = (panel: number, x: number, y: number, r: number, g: number, b: number) => { const i = (y * W * 3 + panel * W + x) * 3; out[i] = r; out[i + 1] = g; out[i + 2] = b; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (Math.min(img.h - 1, Math.floor((y + 0.5) / k)) * img.w + Math.min(img.w - 1, Math.floor((x + 0.5) / k))) * 4, i = y * W + x;
    put(0, x, y, img.rgba[s]!, img.rgba[s + 1]!, img.rgba[s + 2]!);
    if (v.id[i]! >= 0) put(1, x, y, v.rgb[i * 3]!, v.rgb[i * 3 + 1]!, v.rgb[i * 3 + 2]!); else put(1, x, y, 236, 238, 240);
    put(2, x, y, img.rgba[s]! * 0.55, img.rgba[s + 1]! * 0.55, img.rgba[s + 2]! * 0.55); }
  for (const t of traces) { if (!t.poly) continue; const tm = rim(polygonMask(t.poly.map(([u, vv]) => [u * k, vv * k]), W, H), W, H), re = new RegExp(t.parts), mm = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (v.id[i]! >= 0 && re.test(v.names[v.id[i]!]!)) mm[i] = 1;
    const mr = rim(mm, W, H); for (let i = 0; i < W * H; i++) { if (mr[i]) put(2, i % W, Math.floor(i / W), 255, 40, 40); if (tm[i]) put(2, i % W, Math.floor(i / W), 40, 255, 80); } }
  return { w: W * 3, h: H, rgb: out };
}

// ---- a vehicle seen many times over --------------------------------------------------------------------------------------
/** What fitting may move. Its body lines (LINE_KEYS); its proportions: how far its body runs past each axle (its overhangs,
 *  the body made longer or shorter round wheels that stay where they are); and the camera along the one family of
 *  cameras its wheels cannot tell apart (nearer with a wider lens or further with a longer one, its wheels' plane the same
 *  size in the picture and the rest in more or less perspective): what the silhouette's depth then decides; with its lens
 *  and its aim. Its stance: its tyres' size (on their own rims) and how high its body rides over them: a picture can show
 *  bigger wheels and a lower car than its record (the Monte Carlo's goal picture does), and a camera solved from wheels of
 *  the wrong size is wrong with them. Its details: its roof's height, and its kit's wing (how high over the deck, how far
 *  ahead of the tail, how deep its blade) and front lip (how deep). */
export type Free = 'lines' | 'proportion' | 'stance' | 'camera' | 'details' | 'features';
export interface Key { key: string; x0: number; lo: number; hi: number; step: number; group: Free }
export const LINE_KEYS: Record<string, [number, number, number]> = { nose: [0.4, 0.7, 0.02], cowl: [0.2, 0.36, 0.01], roofF: [0.33, 0.5, 0.01], roofR: [0.55, 0.72, 0.01], deck: [0.7, 0.88, 0.01], tail: [0.6, 0.85, 0.02], belt: [0.55, 0.75, 0.01], cowlH: [0.6, 0.82, 0.01], deckH: [0.68, 0.9, 0.01] };
/** What a side view hides behind its skin (a wheelhouse's liners, a lamp's walls and back, a shut line's strip). */
const HIDDEN = /wheelhouse|inner|wall$|back$|shut line/;
/** The kit's own figures a fit may move, each by its piece and field, its range and its first step. */
export const KIT_KEYS: Record<string, [string, string, number, number, number]> = {
  'flare width': ['flares', 'w', 0.03, 0.15, 0.01], 'flare inset': ['flares', 'inset', 0, 0.1, 0.01], 'wing plate length': ['wing', 'plate', 0.15, 0.8, 0.03], 'wing plate height': ['wing', 'plateH', 0.05, 0.3, 0.02], 'flare thickness': ['flares', 't', 0.008, 0.05, 0.004], 'flare from': ['flares', 'from', 0, 40, 3], 'flare to': ['flares', 'to', 140, 180, 3],
  'skirt height': ['skirts', 'h', 0.03, 0.15, 0.01], 'lip depth': ['lip', 'd', 0.04, 0.2, 0.01], 'lip out': ['lip', 'out', 0, 0.06, 0.005], 'valance depth': ['valance', 'd', 0.04, 0.2, 0.01],
  'lip side length': ['lip', 'sd', 0.1, 0.7, 0.03], 'lip side height': ['lip', 'sh', 0.03, 0.16, 0.01], 'valance side length': ['valance', 'sd', 0.1, 0.8, 0.03], 'valance side height': ['valance', 'sh', 0.03, 0.16, 0.01], 'valance side rise': ['valance', 'rise', 0, 0.3, 0.02],
  'wing height': ['wing', 'h', 0.05, 0.3, 0.02], 'wing back': ['wing', 'back', -0.05, 0.3, 0.02], 'wing chord': ['wing', 'chord', 0.15, 0.4, 0.02], 'wing span': ['wing', 'span', 0.6, 1, 0.03], 'wing pitch': ['wing', 'pitch', 0, 20, 2],
};
/** Body lines a side view's windows and door fix (beyond LINE_KEYS): where its side glass ends and its door's top rear
 *  corner is, as shares of its length from its nose. */
export const GLASS_KEYS: Record<string, [number, number, number]> = { dloR: [0.6, 0.76, 0.006], doorR: [0.5, 0.66, 0.006] };
/** Its lamps' figures (its face's, in its lines): its headlamps' height, its tail lamps' height and how far they wrap
 *  forward along its sides, m. */
export const FACE_KEYS: Record<string, ['lamp' | 'tail' | 'wrap', number, number, number]> = { 'headlamp height': ['lamp', 0.05, 0.2, 0.01], 'tail lamp height': ['tail', 0.08, 0.4, 0.02], 'tail lamp wrap': ['wrap', 0, 0.4, 0.03] };
/** A vehicle made to be seen from one camera many times over: its body and kit made again for each trial of its figures
 *  (quickly: bodyPanels' `quick`), its wheels, which no figure moves, made once. */
export class Rig {
  readonly fa: number; readonly ra: number; readonly P0: V3; private wheelPart: Part | null = null; private wheelMasks = new Map<string, Uint8Array>();
  constructor(readonly m: Machine, readonly cam: Camera, private full?: Part) {
    const xs = m.axles.filter((a) => a.track > 0).map((a) => a.x); this.fa = Math.max(...xs); this.ra = Math.min(...xs);
    const side = cam.eye[2] < 0 ? -1 : 1, cs = knownPoints(m, side).filter((k) => /centre/.test(k.name)).map((k) => k.world);
    this.P0 = [0, 1, 2].map((j) => cs.reduce((a, p) => a + p[j]!, 0) / Math.max(1, cs.length)) as V3;
  }
  /** Its wheels as made (the whole vehicle made once, the first time they are asked for). */
  private get wheels(): Part { return (this.wheelPart ??= { name: 'wheels', parts: ((this.full ??= makeMachine(this.m)).parts ?? []).filter((p) => / wheel$/.test(p.name)) } as Part); }
  /** The figures free in a fit, each at its value now, its range and its first step. */
  keys(free: Free[], lineKeys = Object.keys(LINE_KEYS)): Key[] {
    const out: Key[] = [], ln = (this.m.lines ?? {}) as unknown as Record<string, number>;
    if (free.includes('lines')) for (const key of lineKeys) { const r = LINE_KEYS[key]; if (r) out.push({ key, x0: Number(ln[key] ?? (r[0] + r[1]) / 2), lo: r[0], hi: r[1], step: r[2], group: 'lines' }); }
    if (free.includes('proportion')) { const fo = this.m.L / 2 - this.fa, ro = this.ra + this.m.L / 2; out.push({ key: 'front overhang', x0: fo, lo: fo * 0.6, hi: fo * 1.3, step: 0.03, group: 'proportion' }, { key: 'rear overhang', x0: ro, lo: ro * 0.6, hi: ro * 1.3, step: 0.03, group: 'proportion' }); }
    if (free.includes('stance')) { const t = tyreOf(this.m.axles[0]!.tyre)!; out.push({ key: 'tyre diameter', x0: t.D, lo: t.D * 0.85, hi: t.D * 1.25, step: 0.02, group: 'stance' }, { key: 'clearance', x0: this.m.clearance, lo: Math.max(0.04, this.m.clearance * 0.4), hi: this.m.clearance * 1.6, step: 0.01, group: 'stance' }); }
    if (free.includes('details')) { const H = this.m.H; out.push({ key: 'height', x0: H, lo: H * 0.95, hi: H * 1.08, step: 0.005, group: 'details' }, ...this.named(['wing height', 'wing back', 'wing chord', 'lip depth'], 'details')); }
    if (free.includes('camera')) out.push({ key: 'camera distance ×', x0: 1, lo: 0.08, hi: 12, step: 0.1, group: 'camera' }, { key: 'lens ×', x0: 1, lo: 0.8, hi: 1.25, step: 0.02, group: 'camera' }, { key: 'aim across, px', x0: 0, lo: -60, hi: 60, step: 4, group: 'camera' }, { key: 'aim up, px', x0: 0, lo: -60, hi: 60, step: 4, group: 'camera' });
    return out;
  }
  /** Figures by name (a body line, a window's, a kit piece's), each at its value now; one its record does not have (a
   *  kit with no wing) left out. */
  named(names: string[], group: Free = 'features'): Key[] {
    const ln = (this.m.lines ?? {}) as unknown as Record<string, number>, kit = (this.m.kit ?? {}) as unknown as Record<string, Record<string, number> | undefined>;
    return names.flatMap((key): Key[] => {
      const l = LINE_KEYS[key] ?? GLASS_KEYS[key]; if (l) return [{ key, x0: Number(ln[key] ?? (l[0] + l[1]) / 2), lo: l[0], hi: l[1], step: l[2], group }];
      if (key === 'rim diameter') { const t = tyreOf(this.m.axles[0]!.tyre); return t ? [{ key, x0: Math.round(t.rim / 0.0254), lo: 14, hi: 24, step: 1, group }] : []; }
      const fk = FACE_KEYS[key]; if (fk) { const now = (this.m.lines?.face as Record<string, number> | undefined)?.[fk[0]]; return [{ key, x0: Number(now ?? (fk[1] + fk[2]) / 2), lo: fk[1], hi: fk[2], step: fk[3], group }]; }
      const k = KIT_KEYS[key]; if (!k || !kit[k[0]]) return []; const now = kit[k[0]]![k[1]];
      return [{ key, x0: Number(now ?? (k[2] + k[3]) / 2), lo: k[2], hi: k[3], step: k[4], group }];
    });
  }
  /** The vehicle's record and the camera at figures x: its body shifted (dx, m) so its wheels stay where they were seen. */
  apply(keys: Key[], x: number[]): { machine: Machine; camera: Camera; dx: number } {
    const v = new Map(keys.map((k, i) => [k.key, x[i]!])), lines = keys.filter((k) => LINE_KEYS[k.key] || GLASS_KEYS[k.key]);
    let m: Machine = lines.length ? { ...this.m, lines: { ...this.m.lines!, ...Object.fromEntries(lines.map((k) => [k.key, v.get(k.key)!])) } } : this.m, dx = 0, camera = this.cam;
    if (v.has('front overhang') || v.has('rear overhang')) { const fo = v.get('front overhang') ?? this.m.L / 2 - this.fa, ro = v.get('rear overhang') ?? this.ra + this.m.L / 2, lo = this.ra - ro, hi = this.fa + fo; dx = (lo + hi) / 2; m = { ...m, L: hi - lo, axles: m.axles.map((a) => ({ ...a, x: a.x - dx })) }; }
    // (its tyres a size of the same width on the same rim, their sidewall what makes the diameter; its body over them)
    if (v.has('tyre diameter')) m = { ...m, axles: m.axles.map((a) => { const t = tyreOf(a.tyre); if (!t || !/^\D*\d{2,3}\/\d{2,3}/.test(a.tyre)) return a; const asp = Math.max(20, Math.min(90, Math.round(((v.get('tyre diameter')! - t.rim) / (2 * t.W)) * 100))); return { ...a, tyre: `${Math.round(t.W * 1000)}/${asp}R${Math.round(t.rim / 0.0254)}` }; }) };
    // (its rims a size larger or smaller, its tyres' sidewalls taking up the difference: the same diameter, as a plus-size
    // fitment keeps it)
    if (v.has('rim diameter')) m = { ...m, axles: m.axles.map((a) => { const t = tyreOf(a.tyre); if (!t || !/^\D*\d{2,3}\/\d{2,3}/.test(a.tyre)) return a; const rin = Math.round(v.get('rim diameter')!), asp = Math.max(20, Math.min(90, Math.round(((t.D - rin * 0.0254) / (2 * t.W)) * 100))); return { ...a, tyre: `${Math.round(t.W * 1000)}/${asp}R${rin}` }; }) };
    if (v.has('clearance')) m = { ...m, clearance: v.get('clearance')! };
    if (v.has('height')) m = { ...m, H: v.get('height')! };
    const fk = keys.filter((k) => FACE_KEYS[k.key]); if (fk.length && m.lines) m = { ...m, lines: { ...m.lines, face: { ...m.lines.face, ...Object.fromEntries(fk.map((k) => [FACE_KEYS[k.key]![0], v.get(k.key)!])) } } };
    // (a kit piece's figures: each set on its piece, the rest of it as it was)
    const kk = keys.filter((k) => KIT_KEYS[k.key]);
    if (m.kit && kk.length) { const kit = { ...m.kit } as unknown as Record<string, unknown>; for (const k of kk) { const [piece, field] = KIT_KEYS[k.key]!; if (kit[piece]) kit[piece] = { ...(kit[piece] as object), [field]: v.get(k.key) }; } m = { ...m, kit: kit as unknown as BodyKit }; }
    // (a dolly zoom: the camera moved back along its own axis to k times its wheels' depth, its lens k times as long, so
    // everything in the plane through its wheels square to it is seen exactly as before)
    if (v.has('camera distance ×')) { const k = v.get('camera distance ×')!, c = camera, fw = basis(c).fw, back = (k - 1) * dot(sub(this.P0, c.eye), fw), mv = (q: V3): V3 => [q[0] - fw[0] * back, q[1] - fw[1] * back, q[2] - fw[2] * back]; camera = { ...c, eye: mv(c.eye), target: mv(c.target), f: c.f * k }; }
    if (v.has('lens ×')) camera = { ...camera, f: camera.f * v.get('lens ×')! };
    if (v.has('aim across, px') || v.has('aim up, px')) { const B = basis(camera), du = v.get('aim across, px') ?? 0, dv = v.get('aim up, px') ?? 0, k = Math.hypot(...sub(camera.target, camera.eye)) / camera.f; camera = { ...camera, target: [0, 1, 2].map((j) => camera.target[j]! + (B.rt[j]! * du + B.up[j]! * dv) * k) as V3 }; }
    return { machine: m, camera, dx };
  }
  private frozen: { front: Part[]; mid: Part[]; rear: Part[] } | null = null;
  /** Its kit fitted once to the body as it was, in three: what is ahead of its front axle, behind its rear one, and between
   *  (each piece by where its middle is). Fitting a kit to a skin is most of the time a trial takes (1.2 s of 1.9 s for the
   *  Monte Carlo, measured 2026-10-29), so a coarse stage holds it as made and slides its ends with the overhangs. */
  private kitFrozen(): { front: Part[]; mid: Part[]; rear: Part[] } {
    if (this.frozen) return this.frozen;
    const out = { front: [] as Part[], mid: [] as Part[], rear: [] as Part[] }, m = this.m;
    if (m.kit) for (const p of bodyKit(m, m.kit, bodyPanels(bodyPlanOf(m), undefined, true))) { const sh = p.shape as { surf?: Patch } | undefined, net = sh?.surf?.s.net.flat() ?? [], x = (p.at?.[0] ?? 0) + (net.length ? net.reduce((a, q) => a + q[0], 0) / net.length : 0);
      (x > this.fa ? out.front : x < this.ra ? out.rear : out.mid).push(p); }
    return (this.frozen = out);
  }
  /** What the camera sees at figures x: its body and kit (fitted to the body each trial, `live`, or held as first made and
   *  its ends slid with the overhangs, `frozen`), its wheels as the discs their tyres are where `discs`; and the camera. */
  scene(keys: Key[], x: number[], kit: 'live' | 'frozen' = 'live', discs = false): { root: Part; camera: Camera; dx: number } {
    const { machine, camera, dx } = this.apply(keys, x), ps = bodyPanels(bodyPlanOf(machine), undefined, true), parts: Part[] = [{ name: 'body', at: [dx, 0, 0], parts: ps } as Part];
    if (machine.kit && kit === 'live') ps.push(...bodyKit(machine, machine.kit, ps));
    else if (machine.kit) { const f = this.kitFrozen(), fo = this.m.L / 2 - this.fa, ro = this.ra + this.m.L / 2, v = new Map(keys.map((k, i) => [k.key, x[i]!])), dF = (v.get('front overhang') ?? fo) - fo, dR = (v.get('rear overhang') ?? ro) - ro;
      parts.push({ name: 'kit ahead', at: [dF, 0, 0], parts: f.front } as Part, { name: 'kit between', parts: f.mid } as Part, { name: 'kit behind', at: [-dR, 0, 0], parts: f.rear } as Part); }
    // (and its rims as discs of their own size, on the tyres' outer faces: what a side view sees of a wheel)
    if (discs) for (const a of machine.axles) { const t = tyreOf(a.tyre); if (!t || a.track <= 0) continue; for (const sd of [-1, 1]) parts.push({ name: 'tyre seen', shape: { cyl: [t.D / 2, t.W] }, at: [a.x + dx, t.D / 2, (sd * a.track) / 2], rot: [Math.PI / 2, 0, 0], color: 0x111111 } as Part, { name: `${Math.round(t.rim / 0.0254)} in alloy rim`, shape: { cyl: [t.rim / 2 + 0.012, 0.01] }, at: [a.x + dx, t.D / 2, (sd * (a.track + t.W)) / 2 + sd * 0.006], rot: [Math.PI / 2, 0, 0], color: 0x2a2a2a } as Part); }
    return { root: { name: 'seen', parts } as Part, camera, dx };
  }
  /** Its body, kit and wheels as a camera sees them at figures x, at scale s of the picture (coarse: see silhouette); its
   *  wheels as the discs their tyres are where their size is free (`discs`), as made where it is not. */
  render(keys: Key[], x: number[], s: number, coarse?: number, kit: 'live' | 'frozen' = 'live', discs = keys.some((k) => k.group === 'stance')): Uint8Array {
    const sc = this.scene(keys, x, kit, discs), c = scaled(sc.camera, s), m = silhouette(sc.root, c, HIDDEN, coarse);
    if (discs) return m;
    const wk = JSON.stringify([c, coarse ?? 0]);
    let wm = this.wheelMasks.get(wk); if (!wm) { wm = silhouette(this.wheels, c, undefined, coarse); if (this.wheelMasks.size > 8) this.wheelMasks.clear(); this.wheelMasks.set(wk, wm); }
    for (let i = 0; i < m.length; i++) m[i] = m[i]! | wm[i]!;
    return m;
  }
  /** The same, seen as a picture is (renderView): which part is at each pixel, how far, its shade; at scale s. */
  view(keys: Key[], x: number[], s: number, coarse?: number): View { const sc = this.scene(keys, x, 'live', true); return renderView(sc.root, scaled(sc.camera, s), HIDDEN, coarse); }
}

// ---- fitting figures to what is seen -----------------------------------------------------------------------------------

// ---- correcting the geometry feature by feature ------------------------------------------------------------------------
/** What owns each feature: the figures that move it (its windows by its body lines, its flares by the kit's flares …). */
export const FEATURE_FIT: { features: RegExp; keys: string[]; says: string }[] = [
  { features: /glass|door/, keys: ['belt', 'roofF', 'roofR', 'cowl', 'dloR', 'doorR'], says: 'its windows and door: its belt, its roof\'s ends, its windscreen\'s foot, where its side glass ends and its door\'s top rear corner' },
  { features: /flare/, keys: ['flare width', 'flare thickness', 'flare from', 'flare to', 'flare inset'], says: 'its flares: how wide, how proud, round from and to where, how far in over the opening' },
  { features: /wing/, keys: ['wing height', 'wing back', 'wing chord', 'wing span', 'wing pitch', 'wing plate length', 'wing plate height'], says: 'its wing: how high, how far ahead of the tail, how deep, how wide, its pitch, its end plates' },
  { features: /rim/, keys: ['rim diameter'], says: 'its rims: their size (its tyres the same diameter)' },
  { features: /lamp/, keys: ['headlamp height', 'tail lamp height', 'tail lamp wrap'], says: 'its lamps: how tall, and how far its tail lamps wrap round its sides' },
  { features: /skirt|lip|valance/, keys: ['skirt height', 'lip out', 'lip side length', 'lip side height', 'valance side length', 'valance side height', 'valance side rise'], says: 'its skirts, its lip and valance and their side pieces' },
];
/** A feature's error as one number: the mean distance between its edges both ways and half the distance between its
 *  middles, px; one the model does not have, or hides, counted as 30 px (so it is looked for, not ignored). */
const featureCost = (rows: FeatureRow[]) => rows.reduce((a, r) => a + (r.found && Number.isFinite(r.edgePx) ? r.edgePx + 0.5 * r.centrePx : r.found ? r.centrePx : 30), 0) / Math.max(1, rows.length);
export interface FeatureFit { group: string; features: string; before: number; after: number; trials: number; figures: { figure: string; was: number; now: number; pm: number; fixed: boolean }[] }
/** Each feature group's figures moved so the model's own parts meet the traced features as the camera sees them: its
 *  windows and door, its flares, its wing, its skirts, lip and valance, one group at a time, each by the features it owns
 *  and the outline together (so a window is not put right by putting the roof wrong). At scale s of the picture. */
export function fitFeatures(rig: Rig, traces: Trace[], outline: { u: number; v: number }[], w: number, h: number, o: { scale?: number; most?: number } = {}): { keys: Key[]; x: number[]; groups: FeatureFit[] } {
  const s = o.scale ?? 0.5, T = targetOf(outline, w, h, s), trs = traces.map((t) => ({ ...t, ...(t.poly ? { poly: t.poly.map(([u, v]) => [u * s, v * s] as [number, number]) } : {}), ...(t.at ? { at: [t.at[0] * s, t.at[1] * s] as [number, number] } : {}) }));
  const keys = rig.named([...new Set(FEATURE_FIT.flatMap((g) => g.keys))]); let x = keys.map((k) => k.x0); const groups: FeatureFit[] = [];
  for (const g of FEATURE_FIT) {
    const mine = trs.filter((t) => g.features.test(t.name)), idx = keys.flatMap((k, j) => (g.keys.includes(k.key) ? [j] : [])); if (!mine.length || !idx.length) continue;
    const full = (q: number[]) => { const y = x.slice(); idx.forEach((j, n) => (y[j] = q[n]!)); return y; };
    const cost = (q: number[]) => { const v = rig.view(keys, full(q), s), m = new Uint8Array(v.w * v.h); for (let i = 0; i < m.length; i++) m[i] = v.id[i]! >= 0 ? 1 : 0; return (featureCost(compareFeatures(v, mine, 1)) + twoSided(m, T).err) / s; };
    const f = fitBy(cost, idx.map((j) => keys[j]!), { x0: idx.map((j) => x[j]!), most: o.most ?? 30 }); x = full(f.x);
    groups.push({ group: g.says, features: mine.map((t) => t.name).join(', '), before: f.before, after: f.after, trials: f.evaluations, figures: idx.map((j, n) => ({ figure: keys[j]!.key, was: keys[j]!.x0, now: f.fixed[n] ? f.x[n]! : keys[j]!.x0, pm: f.pm[n]!, fixed: f.fixed[n]! })) });
    // (a figure the picture does not fix goes back to what it was: nothing guessed is kept as found)
    idx.forEach((j, n) => { if (!f.fixed[n]) x[j] = keys[j]!.x0; });
  }
  return { keys, x, groups };
}
/** A side intake's outline taken straight off the picture: each traced point's ray put onto the model's own surface where
 *  it meets it (else onto the plane at the median depth of those that did), and said as the kit says it, m ahead of the
 *  rear axle and over the ground. Not fitted: reconstructed. */
export function outlineOnto(v: View, poly: [number, number][], k: number, ra: number): [number, number][] {
  const hits = poly.map(([u, vv]) => { const x = Math.round(u * k), y = Math.round(vv * k), d = v.depth[Math.min(v.h - 1, Math.max(0, y)) * v.w + Math.min(v.w - 1, Math.max(0, x))]!; return Number.isFinite(d) ? d : NaN; }), ok = hits.filter(Number.isFinite).sort((a, b) => a - b), z = ok[Math.floor(ok.length / 2)];
  return poly.flatMap(([u, vv]) => { const P = onSurface(v, u * k, vv * k, z); return P ? [[+(P[0] - ra).toFixed(3), +P[1].toFixed(3)] as [number, number]] : []; });
}

// ---- how right it is, four ways --------------------------------------------------------------------------------------------
export interface Accuracy { objectives: { objective: string; measure: string; value: number | string; unit: string; notes: string }[]; features: FeatureRow[]; regions: EdgeReport['cells']; dimensions: { dimension: string; picture: number | string; model: number; published: number; differs: number | string; evidence: string }[]; orientation: string }
/** The model against the picture from the picture's own camera, as four separate answers, never one blended score:
 *  its silhouette (does the outline match?), its features (are its windows, seams, wheels, vents, wing where the picture's
 *  are, and their shape?), its surface (its edges inside the outline: creases, seams, panel edges; and what one view
 *  cannot show at all: depth, curvature, thickness, the far side), and its dimensions (the model's figures against the
 *  published ones and against the picture's, read through the camera). And whether it faces the way the picture's does. */
export function accuracy(v: View, img: Img, outline: { name: string; u: number; v: number }[], traces: Trace[], marks: { name: string; u: number; v: number }[], m: Machine, pub: Machine, concept: boolean): Accuracy {
  const k = v.w / img.w, mmPx = mmPerPx(v.camera) / 1, T = targetOf(outline, img.w, img.h, k), mask = new Uint8Array(v.w * v.h); for (let i = 0; i < mask.length; i++) mask[i] = v.id[i]! >= 0 ? 1 : 0;
  const sil = twoSided(mask, T), trs = traces.map((t) => ({ ...t, ...(t.poly ? { poly: t.poly.map(([u, vv]) => [u * k, vv * k] as [number, number]) } : {}), ...(t.at ? { at: [t.at[0] * k, t.at[1] * k] as [number, number] } : {}) }));
  const feats = compareFeatures(v, trs, mmPx).map((r) => ({ ...r, centrePx: r.centrePx / k, edgePx: r.edgePx / k, du: r.du / k, dv: r.dv / k })), found = feats.filter((r) => r.found);
  const edges = compareEdges(v, img, outline), mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  // (the way it faces: the model's lamps where the picture's are, front and back, not swapped)
  const at = (n: string) => feats.find((r) => r.feature === n), hl = traces.find((t) => t.name === 'headlamp'), tl = traces.find((t) => t.name === 'tail lamp');
  const cx = (t: Trace) => mean((t.poly ?? [t.at!]).map((p) => p[0])), mh = at('headlamp'), mt = at('tail lamp');
  const orientation = hl && tl && mh?.found && mt?.found ? (Math.sign(cx(hl) + mh.du - (cx(tl) + mt.du)) === Math.sign(cx(hl) - cx(tl)) ? `agrees: its nose to the picture's ${cx(hl) < cx(tl) ? 'left' : 'right'}, as the picture's is` : 'REVERSED: its nose where the picture\'s tail is') : 'not checked: its lamps are not both traced and seen';
  // (its dimensions: the model's, the published, and the picture's through the camera, each where it can be read)
  const xs = m.axles.filter((a) => a.track > 0).map((a) => a.x), side = v.camera.eye[2] < 0 ? -1 : 1, plane = (z: number) => (u: number, vv: number) => { const c = v.camera, B = basis(c), a = (u * k - c.w / 2) / c.f, b = -(vv * k - c.h / 2) / c.f, d: V3 = [B.fw[0] + a * B.rt[0] + b * B.up[0], B.fw[1] + a * B.rt[1] + b * B.up[1], B.fw[2] + a * B.rt[2] + b * B.up[2]], t = (z - c.eye[2]) / d[2]; return t > 0 ? ([c.eye[0] + t * d[0], c.eye[1] + t * d[1], z] as V3) : null; };
  // (the picture's ends and top are not on any one plane through a near camera: a rounded car's ends are seen at its
  // corners. So each is read as the model's own, and how far the picture's outline stands past the model's edge there, in
  // mm at the depth of the model's surface nearest it: + where the picture's stands further out)
  const wheelPlane = plane((side * (m.axles[0]?.track ?? 0)) / 2), o = outline, nose = o.reduce((a, b) => ((b.u < a.u) === (side < 0) ? b : a)), tail = o.reduce((a, b) => ((b.u > a.u) === (side < 0) ? b : a)), top = o.reduce((a, b) => (b.v < a.v ? b : a));
  const dM = edgeDistance(mask, v.w, v.h), past = (q: { u: number; v: number }) => { const x = Math.min(v.w - 1, Math.max(0, Math.round(q.u * k))), y = Math.min(v.h - 1, Math.max(0, Math.round(q.v * k))), i = y * v.w + x; let z = v.depth[i]!; for (let r = 1; !Number.isFinite(z) && r < 80; r++) for (const j of [i - r, i + r, i - r * v.w, i + r * v.w]) if (j >= 0 && j < v.w * v.h && Number.isFinite(v.depth[j]!)) { z = v.depth[j]!; break; } return (dM[i]! * (mask[i] ? -1 : 1) * z) / v.camera.f; };
  const pN = past(nose), pT = past(tail), pR = past(top), mk = (n: string) => marks.find((q) => q.name === n), fwc = mk('front wheel centre'), rwc = mk('rear wheel centre'), ftt = mk('front tyre top'), ftb = mk('front tyre bottom');
  const F = fwc && wheelPlane(fwc.u, fwc.v), Rw = rwc && wheelPlane(rwc.u, rwc.v), FT = ftt && wheelPlane(ftt.u, ftt.v), FB = ftb && wheelPlane(ftb.u, ftb.v), fo = m.L / 2 - Math.max(...xs), ro = Math.min(...xs) + m.L / 2;
  const wb = (q: Machine) => { const ys = q.axles.filter((a) => a.track > 0).map((a) => a.x); return Math.max(...ys) - Math.min(...ys); }, tyreD = (q: Machine) => tyreOf(q.axles[0]!.tyre)?.D ?? NaN;
  const ev = concept ? 'the picture\'s (a made picture: how it is drawn)' : 'measured off the photograph';
  const dims: Accuracy['dimensions'] = [
    { dimension: 'length', picture: +(m.L + pN + pT).toFixed(3), model: +m.L.toFixed(3), published: +pub.L.toFixed(3), differs: +(m.L - pub.L).toFixed(3), evidence: `${ev}; the picture's: the model's, its outline ${(pN * 1000).toFixed(0)} mm past it at the nose and ${(pT * 1000).toFixed(0)} mm at the tail` },
    { dimension: 'height', picture: +(m.H + pR).toFixed(3), model: +m.H.toFixed(3), published: +pub.H.toFixed(3), differs: +(m.H - pub.H).toFixed(3), evidence: `${ev}; the picture's: the model's and its outline ${(pR * 1000).toFixed(0)} mm past it at the roof` },
    { dimension: 'wheelbase', picture: F && Rw ? `${Math.abs(F[0] - Rw[0]).toFixed(3)} ± ${((2 * 3 * Math.hypot(...sub(F, v.camera.eye))) / v.camera.f).toFixed(3)}` : 'not read', model: +wb(m).toFixed(3), published: +wb(pub).toFixed(3), differs: +(wb(m) - wb(pub)).toFixed(3), evidence: ev },
    { dimension: 'tyre diameter', picture: FT && FB ? `${Math.abs(FT[1] - FB[1]).toFixed(3)} ± ${((2 * 3 * Math.hypot(...sub(FT, v.camera.eye))) / v.camera.f).toFixed(3)}` : 'not read', model: +tyreD(m).toFixed(3), published: +tyreD(pub).toFixed(3), differs: +(tyreD(m) - tyreD(pub)).toFixed(3), evidence: `${ev}; the record's tyres (${m.axles[0]!.tyre}) against the stock car's (${pub.axles[0]!.tyre})` },
    { dimension: 'rear overhang', picture: +(ro + pT).toFixed(3), model: +ro.toFixed(3), published: +(Math.min(...pub.axles.map((a) => a.x)) + pub.L / 2).toFixed(3), differs: '', evidence: `${ev}; the published one is an estimate (its record's)` },
    { dimension: 'front overhang', picture: +(fo + pN).toFixed(3), model: +fo.toFixed(3), published: +(pub.L / 2 - Math.max(...pub.axles.map((a) => a.x))).toFixed(3), differs: '', evidence: `${ev}; the published one is an estimate (its record's)` },
    { dimension: 'ground clearance', picture: 'not marked', model: +m.clearance.toFixed(3), published: +pub.clearance.toFixed(3), differs: +(m.clearance - pub.clearance).toFixed(3), evidence: 'the model\'s against the published' },
    { dimension: 'width', picture: 'not seen from the side', model: +m.W.toFixed(3), published: +pub.W.toFixed(3), differs: +(m.W - pub.W).toFixed(3), evidence: 'unknown from this picture: a front or back view would show it' },
  ];
  const objectives: Accuracy['objectives'] = [
    { objective: 'silhouette', measure: 'outline error both ways', value: +(sil.err / k).toFixed(2), unit: 'px', notes: `${((sil.err / k) * mmPerPx(v.camera) * k).toFixed(0)} mm at the car; IoU ${sil.iou.toFixed(3)}` },
    { objective: 'features', measure: 'mean edge error of the features found', value: +mean(found.filter((r) => Number.isFinite(r.edgePx)).map((r) => r.edgePx)).toFixed(2), unit: 'px', notes: `${found.length} of ${feats.length} traced features found in the model; worst: ${[...found].filter((r) => Number.isFinite(r.edgePx)).sort((a, b) => b.edgePx - a.edgePx).slice(0, 3).map((r) => `${r.feature} ${r.edgePx.toFixed(1)} px`).join(', ')}` },
    { objective: 'features', measure: 'mean offset of their middles', value: +mean(found.map((r) => r.centrePx)).toFixed(2), unit: 'px', notes: 'how far each found feature\'s middle is from the traced one\'s' },
    { objective: 'features', measure: 'mean overlap (IoU) of the features found', value: +mean(found.filter((r) => Number.isFinite(r.iou)).map((r) => r.iou)).toFixed(3), unit: '', notes: 'each feature\'s own region against its tracing' },
    { objective: 'surface', measure: 'model edges to the picture\'s (creases, seams, panel edges)', value: +edges.modelToPicture.toFixed(2), unit: 'px', notes: `${(edges.precision * 100).toFixed(0)} % of the model's edges within 3 px of one of the picture's` },
    { objective: 'surface', measure: 'picture edges to the model\'s', value: +edges.pictureToModel.toFixed(2), unit: 'px', notes: `${(edges.recall * 100).toFixed(0)} % within 3 px: a floor, the picture's reflections and shadows counted as edges` },
    { objective: 'surface', measure: 'depth, curvature, thickness, the far side, the top, its plan', value: 'unknown', unit: '', notes: 'one side view does not show them; nothing here says they are right' },
    { objective: 'dimensions', measure: 'model against published, largest difference', value: +Math.max(...dims.filter((d) => typeof d.differs === 'number').map((d) => Math.abs(d.differs as number))).toFixed(3), unit: 'm', notes: dims.filter((d) => typeof d.differs === 'number' && Math.abs(d.differs) > 0.005).map((d) => `${d.dimension} ${(d.differs as number) > 0 ? '+' : ''}${((d.differs as number) * 1000).toFixed(0)} mm`).join(', ') || 'none over 5 mm' },
    { objective: 'orientation', measure: 'the way it faces', value: orientation.split(':')[0]!, unit: '', notes: orientation },
  ];
  return { objectives, features: feats, regions: edges.cells.slice(0, 6), dimensions: dims, orientation };
}

// ---- pipelines tried, and the one kept --------------------------------------------------------------------------------------
/** One way of fitting a model to a picture: which outline it is held to (the trace's few points, or the dense one on the
 *  picture's edges), its cost (one way: the outline's points to the model's edge; or both ways), what is free, and its
 *  stages (each at a scale of the picture, its skins drawn coarse or not, at most so many trials). */
export interface Recipe { id: string; says: string; outline: 'traced' | 'dense'; cost: 'one-sided' | 'two-sided'; free: Free[]; stages: { scale: number; coarse?: number; most: number; kit?: 'live' | 'frozen'; only?: Free[]; scan?: { key: string; at: number[] } }[] }
export const RECIPES: Recipe[] = [
  { id: 'A', says: 'as first built: the traced points one way, its lines only, at half size', outline: 'traced', cost: 'one-sided', free: ['lines'], stages: [{ scale: 0.5, most: 60 }] },
  { id: 'B', says: 'the dense outline one way, its lines only', outline: 'dense', cost: 'one-sided', free: ['lines'], stages: [{ scale: 0.5, most: 60 }] },
  { id: 'C', says: 'the dense outline both ways, its lines only', outline: 'dense', cost: 'two-sided', free: ['lines'], stages: [{ scale: 0.5, most: 60 }] },
  { id: 'D', says: 'both ways, its lines and its overhangs', outline: 'dense', cost: 'two-sided', free: ['lines', 'proportion'], stages: [{ scale: 0.5, most: 80 }] },
  { id: 'E', says: 'both ways, its lines, its overhangs and the camera\'s distance', outline: 'dense', cost: 'two-sided', free: ['lines', 'proportion', 'camera'], stages: [{ scale: 0.5, most: 80 }] },
  { id: 'F', says: 'as E, coarse to fine: a quarter size, coarse skins and its kit held as made first, then half size with its kit fitted each trial', outline: 'dense', cost: 'two-sided', free: ['lines', 'proportion', 'camera'], stages: [{ scale: 0.25, coarse: 10, most: 200, kit: 'frozen' }, { scale: 0.5, most: 60 }] },
  { id: 'H', says: 'as F, its stance (tyre size, ride height) and the whole camera (distance, lens, aim) free too: the camera\'s distance scanned from 0.08 to eight times and the camera alone fitted first (its body made once), then everything coarse, then fine', outline: 'dense', cost: 'two-sided', free: ['lines', 'proportion', 'stance', 'camera'], stages: [{ scale: 0.25, coarse: 10, most: 150, kit: 'frozen', only: ['camera'], scan: { key: 'camera distance ×', at: [0.08, 0.11, 0.15, 0.2, 0.28, 0.4, 0.56, 0.8, 1, 1.4, 2, 4, 8] } }, { scale: 0.25, coarse: 10, most: 300, kit: 'frozen' }, { scale: 0.5, most: 60 }] },
  { id: 'I', says: 'as H, then its details (its roof\'s height, its wing\'s height, setback and depth, its lip\'s depth) and its lines once more at half size, its kit fitted each trial', outline: 'dense', cost: 'two-sided', free: ['lines', 'proportion', 'stance', 'camera', 'details'], stages: [{ scale: 0.25, coarse: 10, most: 150, kit: 'frozen', only: ['camera'], scan: { key: 'camera distance ×', at: [0.08, 0.11, 0.15, 0.2, 0.28, 0.4, 0.56, 0.8, 1, 1.4, 2, 4, 8] } }, { scale: 0.25, coarse: 10, most: 300, kit: 'frozen', only: ['lines', 'proportion', 'stance', 'camera'] }, { scale: 0.5, most: 60, only: ['lines', 'proportion', 'stance', 'camera'] }, { scale: 0.5, most: 80, only: ['details', 'lines'] }] },
  { id: 'G', says: 'as F\'s first stage only (the fastest)', outline: 'dense', cost: 'two-sided', free: ['lines', 'proportion', 'camera'], stages: [{ scale: 0.25, coarse: 10, most: 300, kit: 'frozen' }] },
];
/** One recipe run: the figures it ends at (each with its ± in pixels of its last stage), and what it is worth by one judge
 *  for all: both ways against the dense outline at half size, its skins drawn fine and its wheels as their tyres' discs
 *  (so a recipe that sizes them is judged as one that does not), in the picture's pixels and in mm at
 *  the scale its wheelbase sets (`mmPerPx`); its time, measured. */
export function runRecipe(r: Recipe, rig: Rig, traced: Mark[], dense: Mark[], w: number, h: number, mmPx: number, lineKeys?: string[]): { recipe: string; keys: Key[]; x: number[]; pm: number[]; fixed: boolean[]; iou: number; errPx: number; errMm: number; before: { iou: number; errPx: number }; ms: number; evaluations: number } {
  const t0 = Date.now(), keys = rig.keys(r.free, lineKeys?.length ? lineKeys : undefined); let x = keys.map((k) => k.x0), last: ReturnType<typeof fitBy> | null = null, evals = 0;
  const J0 = twoSided(rig.render(keys, x, 0.5, undefined, 'live', true), targetOf(dense, w, h, 0.5));
  for (const st of r.stages) {
    const T = targetOf(r.outline === 'dense' ? dense : traced, w, h, st.scale);
    // (a stage that frees only some groups moves those, the rest held where they are)
    const idx = keys.map((k, j) => (!st.only || st.only.includes(k.group) ? j : -1)).filter((j) => j >= 0), full = (q: number[]) => { const y = x.slice(); idx.forEach((j, n) => (y[j] = q[n]!)); return y; };
    const cost = (q: number[]) => { const tw = twoSided(rig.render(keys, full(q), st.scale, st.coarse, st.kit), T); return (r.cost === 'two-sided' ? tw.err : tw.toModel) / st.scale; };
    // (a figure whose cost has more than one valley, as the camera's distance along the cameras its wheels cannot tell
    // apart, scanned over its range first, and the fit started from the best: Nelder–Mead finds the bottom of the valley
    // it starts in, not the deepest)
    const sj = st.scan ? keys.findIndex((k) => k.key === st.scan!.key) : -1;
    if (sj >= 0) { let best = Infinity, bx = x[sj]!; for (const a of st.scan!.at) { const y = x.slice(); y[sj] = a; const q = idx.map((j) => y[j]!), c = cost(q); evals++; if (c < best) { best = c; bx = a; } } x = x.slice(); x[sj] = bx; }
    const f = fitBy(cost, idx.map((j) => keys[j]!), { x0: idx.map((j) => x[j]!), most: st.most }); x = full(f.x); evals += f.evaluations;
    last = { ...f, x, pm: keys.map((_, j) => { const n = idx.indexOf(j); return n >= 0 ? f.pm[n]! : last?.pm[j] ?? Infinity; }), fixed: keys.map((_, j) => { const n = idx.indexOf(j); return n >= 0 ? f.fixed[n]! : last?.fixed[j] ?? false; }) };
  }
  const J = twoSided(rig.render(keys, x, 0.5, undefined, 'live', true), targetOf(dense, w, h, 0.5));
  return { recipe: r.id, keys, x, pm: last!.pm, fixed: last!.fixed, iou: J.iou, errPx: J.err / 0.5, errMm: (J.err / 0.5) * mmPx, before: { iou: J0.iou, errPx: J0.err / 0.5 }, ms: Date.now() - t0, evaluations: evals };
}
/** The recipe kept for a vehicle's side seen in one picture: the best of RECIPES by the judge (docs/RECONSTRUCT.md, where
 *  each one's result is kept). */
export const BEST_RECIPE = 'I';
/** Millimetres a pixel at a vehicle's wheels, from its wheelbase and its wheel centres as marked (a made picture has no
 *  camera to ask; its own wheels set its scale). */
export function mmPerPxOf(m: Machine, marks: { name: string; u: number; v: number }[]): number {
  const f = marks.find((p) => p.name === 'front wheel centre'), r = marks.find((p) => p.name === 'rear wheel centre'), xs = m.axles.filter((a) => a.track > 0).map((a) => a.x);
  return f && r ? ((Math.max(...xs) - Math.min(...xs)) * 1000) / Math.hypot(f.u - r.u, f.v - r.v) : NaN;
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
/** What is asked beside a made picture of the goal: photographs of the thing as it is, from the same side and as square. */
export const CONCEPT_ASK = 'a photograph of the car as it is now, square to the same side as the picture (its left), at door-handle height, the whole car and the ground under its tyres in frame: the real car set beside the goal, line by line';
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
  says: 'A photograph from the library (view/public/photos), decoded to its pixels, with the points marked on it (photo-marks.ts: its wheels, its outline round it by region), who marked them and how, the thing it is of, and whether it is a photograph of it or a made picture (an AI\'s, a render) of how it is wanted: matched as a goal, never read as a measurement',
  settings: [{ key: 'id', label: 'Photograph', type: 'choice', default: PHOTOS[0]!.id, choices: PHOTOS.map((p) => p.id) }],
  ports: { inputs: [P('id', 'text', { optional: true, label: 'which picture (the setting, if not wired)' })], outputs: [P('image', 'record'), P('marks', 'table'), P('object', 'text', { label: 'the record it is of' }), P('base', 'text', { label: 'the record as its maker published it' }), P('w', 'integer'), P('h', 'integer'), P('says', 'text'), P('concept', 'boolean', { label: 'a made picture of how it is wanted, not a photograph of it' }), P('traces', 'table', { label: 'its features traced (windows, door, flares, wing …), each with the model\'s part it is' })] },
  run: async (i, c) => { const id = String(i.id ?? c.set.id), ph = photoOf(id); if (!ph) throw new Error(`no photograph "${id}"`); const img = await loadPhoto(ph.id);
    return { image: brief(img, `${img.w} × ${img.h} pixels`), marks: ph.marks.map((m) => ({ ...m })), object: ph.object, base: ph.base ?? ph.object, w: img.w, h: img.h, says: `${ph.says}; ${ph.marks.length} points ${ph.by}`, concept: !!ph.concept, traces: (ph.traces ?? []).map((t) => ({ ...t })) }; },
  tests: [{ set: { id: 'mc-side' }, inputs: {}, outputs: { w: 1152, h: 864 } }] });

node({ id: 'photo.features', name: 'Edge-snapped image features (Sobel)', kind: 'logic', ability: 'transform', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'Where exactly are the marked points, by the edges in the photograph?', discipline: 'electrical.signals', role: 'data transformation', codes: [VISION, ACM_CV] },
  says: 'Each marked point moved to the strongest edge near it (Sobel\'s gradient on the brightness, nearer edges preferred): measured where a clear edge was found, with how far it moved; observed (by eye) where none was. A wheel\'s centre is not an edge and stays where it was marked',
  settings: [{ key: 'r', label: 'Search radius, pixels', type: 'number', default: 5 }],
  ports: { inputs: [P('image', 'record'), P('marks', 'table')], outputs: [P('features', 'table'), P('measured', 'integer', { label: 'snapped to an edge' }), P('observed', 'integer', { label: 'by eye only' }), N('moved', undefined, { label: 'the most any moved, px' })] },
  run: (i, c) => { const f = snapMarks(imgOf(i.image), rowsOf(i.marks).map((r) => ({ name: String(r.name), u: Number(r.u), v: Number(r.v) })), Number(c.set.r ?? 5));
    return { features: f.map((x) => ({ ...x })), measured: f.filter((x) => x.evidence === 'measured').length, observed: f.filter((x) => x.evidence === 'observed').length, moved: Math.max(0, ...f.map((x) => Math.hypot(x.du, x.dv))) }; } });

node({ id: 'photo.outline', name: 'Dense outline on the image\'s edges (active contour, one step)', kind: 'logic', ability: 'transform', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'Where exactly is the thing\'s edge, all the way round?', discipline: 'electrical.signals', role: 'data transformation', codes: [VISION, ACM_CV],
    model: { equations: ['p\' = p + t* n, t* = argmax over |t| ≤ r of (|∇I|(p + t n) − 8|t|), |∇I| ≥ clear; t* smoothed by the median of 7 round the outline'], class: 'analytical', time: 'steady', linear: false, references: ['Kass, Witkin & Terzopoulos, Snakes: active contour models, IJCV 1, 321 (1988)', 'Sobel & Feldman (1968), the 3 × 3 gradient'] } },
  says: 'The outline traced round the thing made dense (a point every few pixels) and laid on the picture\'s own edges: each point moved along the outline\'s normal to the strongest edge near it, the moves smoothed round it so one caught on a reflection does not kink it. Each point keeps its region (its nose, roof, tail …); one with no clear edge near stays where the trace put it. The other marks (its wheels) pass through as they were',
  settings: [{ key: 'step', label: 'A point every, pixels', type: 'number', default: 3 }, { key: 'r', label: 'Search across it, pixels', type: 'number', default: 6 }],
  ports: { inputs: [P('image', 'record'), P('features', 'table')], outputs: [P('features', 'table', { label: 'its marks, the outline dense' }), P('points', 'integer', { label: 'outline points' }), P('snapped', 'integer', { label: 'on a clear edge' }), N('moved', undefined, { label: 'the most any moved, px' })] },
  run: (i, c) => { const rows = rowsOf(i.features), d = denseOutline(imgOf(i.image), outlineOf(rows), Number(c.set.step ?? 3), Number(c.set.r ?? 6));
    return { features: [...rows.filter((r) => !String(r.name).startsWith('outline')), ...d.pts.map((p) => ({ ...p, evidence: 'measured' }))], points: d.pts.length, snapped: d.snapped, moved: d.moved }; } });

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
  ports: { inputs: [P('features', 'table'), P('camera', 'record'), P('machine', 'any'), P('cameras', 'any', { optional: true, label: 'every camera that fits (Camera node): measured through each' }), P('concept', 'boolean', { optional: true, label: 'a made picture, not a photograph (Photograph node)' })], outputs: [P('dimensions', 'table'), P('conflicts', 'integer'), P('unfixed', 'integer', { label: 'not fixed by the photograph' })] },
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
    // (a made picture is no measurement of the thing: what it shows is the picture's, set beside the record, never against it)
    if (i.concept === true) return { dimensions: rows.map((r) => (r.evidence === 'given' ? r : { ...r, evidence: 'the picture\'s', source: `${r.source}; the picture is made, not a photograph: its figure is how it is drawn` })), conflicts: 0, unfixed: 0 };
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

node({ id: 'fit.lines', name: 'Body fitted to a picture (analysis by synthesis)', kind: 'solver', ability: 'optimise', domains: ['vehicles', 'manufacturing', 'science'], pure: true,
  spec: { gloss: 'Which body lines, proportions and camera make the model look like the picture?', discipline: 'mechanical.design', role: 'numerical solver', codes: [ACM_CV, { scheme: 'MSC2020', code: '65K10', label: 'Numerical optimization and variational techniques' }],
    model: { equations: ['minimise ½ (mean d(outline, model edge) + mean d(model edge, outline)) over its free figures, the body and its kit built and rendered from the camera each trial', '± from the curvature of that error: ±σ = √(2 / ∂²E/∂x²) (a pixel\'s growth)'], class: 'analytical', time: 'steady', linear: false, method: 'Nelder–Mead within each figure\'s range, in the stages of its recipe (RECIPES; the one kept, BEST_RECIPE, chosen by Pipelines tried)', references: ['Nelder & Mead, Comput. J. 7, 308 (1965)', 'Hartley & Zisserman, Multiple View Geometry, 2nd ed. (analysis by synthesis: render, compare, correct)', 'Borgefors, Distance transformations in digital images, CVGIP 34, 344 (1986)'] } },
  says: 'The vehicle moved until its rendered silhouette meets the outline on the picture, both ways (where it falls short and where it stands past it): its body lines (where its windscreen\'s foot, its roof, its back glass\'s foot are along it, how high its nose, tail and the glass\'s feet stand), its overhangs (its body longer or shorter round its wheels) and the camera\'s distance along the family of cameras its wheels cannot tell apart, by a recipe (the one kept is the best Pipelines tried found). Each figure with its ±; one the picture does not fix kept as it was and said estimated. On a made picture (an AI\'s, a render) what is fitted is the picture\'s, the goal it shows, not a measurement of the thing. Gives the fitted vehicle, its record and the camera it is seen from',
  settings: [{ key: 'recipe', label: 'Recipe', type: 'choice', default: BEST_RECIPE, choices: RECIPES.map((r) => r.id) }, { key: 'keys', label: 'Body lines to fit', type: 'text', default: 'nose cowl roofF roofR deck tail cowlH deckH' }],
  ports: { inputs: [P('machine', 'any'), P('camera', 'record'), P('features', 'table', { label: 'its marks and outline (dense: Dense outline)' }), P('cameras', 'any', { optional: true, label: 'every camera that fits (Camera node)' }), P('concept', 'boolean', { optional: true, label: 'a made picture, not a photograph (Photograph node)' })],
    outputs: [P('figures', 'table'), N('before', undefined, { label: 'error both ways before, px' }), N('after', undefined, { label: 'error both ways after, px' }), N('iou', undefined, { label: 'overlap after (IoU)' }), P('machine', 'any', { label: 'the fitted record' }), P('vehicle', 'part', { label: 'the fitted vehicle' }), P('camera', 'record', { label: 'the camera it is seen from, fitted' }), P('recipe', 'text')] },
  run: (i, c) => {
    const m = machineOf(i.machine), cam = camOf(i.camera), rows = rowsOf(i.features), o = outlineOf(rows), concept = i.concept === true; if (!m.lines) throw new Error('its record has no body lines to fit'); if (o.length < 3) throw new Error('no outline marked');
    const r = RECIPES.find((x) => x.id === String(c.set.recipe ?? BEST_RECIPE)) ?? RECIPES.find((x) => x.id === BEST_RECIPE)!, rig = new Rig(m, cam);
    const marks = rows.map((q) => ({ name: String(q.name), u: Number(q.u), v: Number(q.v) })), fit = runRecipe(r, rig, o, o, cam.w, cam.h, mmPerPxOf(m, marks), String(c.set.keys ?? '').split(/\s+/).filter((k) => LINE_KEYS[k]));
    const x = fit.keys.map((k, j) => (fit.fixed[j] ? fit.x[j]! : k.x0)), got = rig.apply(fit.keys, x), fitted = got.machine;
    // (what it is seen from: the camera fitted, moved with the body, so the vehicle as made (its own middle at x = 0) is seen as fitted)
    const seen: Camera = { ...got.camera, eye: [got.camera.eye[0] - got.dx, got.camera.eye[1], got.camera.eye[2]], target: [got.camera.target[0] - got.dx, got.camera.target[1], got.camera.target[2]] };
    // (fitted through the solved camera alone, where the camera is not free: no better fixed than the camera is)
    const cs2 = Array.isArray(i.cameras) ? (i.cameras as Camera[]) : [], ds = cs2.map((q) => Math.hypot(...sub(q.eye, [0, 0.6, 0]))), loose = !r.free.includes('camera') && ds.length > 1 && Math.max(...ds) - Math.min(...ds) > 0.1 * Math.min(...ds);
    const ev = (fixed: boolean) => (!fixed ? 'estimated' : concept ? 'the picture\'s' : loose ? 'not fixed' : 'measured');
    const figures = fit.keys.map((k, j) => ({ figure: k.key, was: +k.x0.toFixed(3), now: +x[j]!.toFixed(3), pm: Number.isFinite(fit.pm[j]!) ? +fit.pm[j]!.toFixed(3) : 'unbounded', evidence: ev(fit.fixed[j]!),
      says: !fit.fixed[j] ? 'not fixed by this picture: the outline hardly moves with it; kept as it was' : concept ? 'fitted to a made picture: how it is drawn there, the goal, not a measurement of the car' : loose ? 'fitted, but only through the best of the cameras that fit as well: not fixed until the camera is' : 'fitted to the photograph\'s outline' }));
    if (r.free.includes('proportion')) figures.push({ figure: 'length', was: +m.L.toFixed(3), now: +fitted.L.toFixed(3), pm: 'from its overhangs', evidence: ev(true), says: `its length as the picture has it, ${(fitted.L - m.L >= 0 ? '+' : '')}${((fitted.L - m.L) * 1000).toFixed(0)} mm on the record's ${m.L.toFixed(3)} m${concept ? ' (a made picture: drawn so, not measured)' : ''}` });
    return { figures, before: fit.before.errPx, after: fit.errPx, iou: fit.iou, machine: fitted, vehicle: makeMachine(fitted), camera: seen, recipe: `${r.id}: ${r.says}; ${fit.evaluations} trials in ${(fit.ms / 1000).toFixed(0)} s` };
  } });

node({ id: 'recon.search', name: 'Pipelines tried (which way of fitting matches best)', kind: 'critic', ability: 'check', domains: ['vehicles', 'manufacturing', 'science'], pure: true,
  spec: { gloss: 'Of the ways to fit a model to a picture, which matches it best, and at what cost?', discipline: 'manufacturing.metrology.inspection', role: 'assessment', codes: [ACM_CV, { scheme: 'MSC2020', code: '65K10', label: 'Numerical optimization and variational techniques' }] },
  says: 'Each recipe (RECIPES: which outline it is held to, its cost one way or both, what is free, its stages) run on the same picture and the same model, and each judged alike: both ways against the dense outline at half size with its skins drawn fine, its overlap, its error in pixels and in millimetres at the scale its wheelbase sets, and its time as measured. The best is the one Body fitted to a picture keeps (BEST_RECIPE, set from this, its results kept in docs/RECONSTRUCT.md)',
  settings: [{ key: 'recipes', label: 'Recipes to try', type: 'text', default: RECIPES.map((r) => r.id).join(' ') }],
  ports: { inputs: [P('image', 'record'), P('features', 'table', { label: 'its marks, snapped (Edge-snapped features)' }), P('machine', 'any'), P('camera', 'record')], outputs: [P('results', 'table'), P('best', 'text'), P('kept', 'text', { label: 'the recipe kept now' })] },
  run: (i, c) => {
    const img = imgOf(i.image), m = machineOf(i.machine), cam = camOf(i.camera), rows = rowsOf(i.features), traced = outlineOf(rows), dense = denseOutline(img, traced).pts, rig = new Rig(m, cam);
    const mmPx = mmPerPxOf(m, rows.map((q) => ({ name: String(q.name), u: Number(q.u), v: Number(q.v) }))), ids = String(c.set.recipes ?? '').split(/\s+/);
    const results = RECIPES.filter((r) => ids.includes(r.id)).map((r) => { const f = runRecipe(r, rig, traced, dense, img.w, img.h, mmPx);
      return { recipe: r.id, says: r.says, iou: +f.iou.toFixed(4), px: +f.errPx.toFixed(2), mm: +f.errMm.toFixed(1), seconds: +(f.ms / 1000).toFixed(1), trials: f.evaluations, before: `IoU ${f.before.iou.toFixed(4)}, ${f.before.errPx.toFixed(2)} px` }; });
    const best = [...results].sort((a, b) => a.px - b.px)[0];
    return { results, best: best ? `${best.recipe}: ${best.px} px (${best.mm} mm), IoU ${best.iou}, ${best.seconds} s` : 'none run', kept: BEST_RECIPE };
  } });


const tracesOf = (v: unknown): Trace[] => rowsOf(v).map((r) => ({ name: String(r.name), parts: String(r.parts), ...(Array.isArray(r.poly) ? { poly: r.poly as [number, number][] } : {}), ...(Array.isArray(r.at) ? { at: r.at as [number, number] } : {}) }));
const viewOf = (v: unknown): View => { const x = v as View; if (!x?.id || !x.camera) throw new Error('wire a view in (Same-camera view)'); return x; };

node({ id: 'render.view', name: 'Same-camera view (z-buffered render)', kind: 'logic', ability: 'transform', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'What does the model look like from exactly where the picture was taken?', discipline: 'electrical.signals', role: 'visualisation', codes: [ACM_CV, { scheme: 'ACM CCS 2012', code: '10010147.10010371.10010372', label: 'Computing methodologies: rendering' }],
    model: { equations: ['each triangle projected through the camera; at each pixel the nearest kept (1/z interpolated across it); shade = 0.32 + 0.68 |n · l|'], class: 'analytical', time: 'steady', linear: false, references: ['Catmull, A subdivision algorithm for computer display of curved surfaces (1974): the z-buffer', 'Lambert, Photometria (1760)'] } },
  says: 'The thing as made, seen from the camera the picture was taken from, the right way round: at each pixel which of its parts is nearest, how far, and its colour shaded. What the comparisons read (each feature against its own part), and what a person sets beside the picture',
  settings: [{ key: 'scale', label: 'Scale of the picture', type: 'number', default: 1 }],
  ports: { inputs: [P('thing', 'assembly'), P('camera', 'record')], outputs: [P('view', 'record'), P('parts', 'integer', { label: 'parts seen' })] },
  run: (i, c) => { const t = i.thing as Part; if (!t || !('name' in t)) throw new Error('wire a thing in'); const v = renderView(t, scaled(camOf(i.camera), Number(c.set.scale ?? 1)));
    return { view: brief(v, `a ${v.w} × ${v.h} view of ${v.names.length} parts`), parts: new Set(v.id).size - (v.id.includes(-1) ? 1 : 0) }; } });

node({ id: 'fit.features', name: 'Geometry fitted to its features (windows, flares, wing, skirts; the intake taken off the picture)', kind: 'solver', ability: 'optimise', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'Which figures put each of its features where the picture has it?', discipline: 'mechanical.design', role: 'numerical solver', codes: [ACM_CV, { scheme: 'MSC2020', code: '65K10', label: 'Numerical optimization and variational techniques' }],
    model: { equations: ['for each group of features: minimise mean over its features of (edge error both ways + ½ the offset of their middles) + the outline\'s error both ways, over the figures that own them', 'a traced outline put onto the model\'s surface: P = eye + z (w + a r + b u) at the view\'s depth z'], class: 'analytical', time: 'steady', linear: false, method: 'Nelder–Mead, group by group (FEATURE_FIT); each figure\'s ± from the curvature; a figure not fixed goes back to what it was', references: ['Nelder & Mead, Comput. J. 7, 308 (1965)', 'Hartley & Zisserman, Multiple View Geometry, 2nd ed., §8.1 (back-projection)'] } },
  says: 'The model\'s own parts moved to where the picture\'s features are, as the same camera sees them, group by group: its windows and door by its body lines, its flares, its wing, its skirts, lip and valance by the kit\'s figures; each by the features it owns and the outline together. A side intake traced on the picture is not fitted but taken off it: its outline put onto the model\'s own surface through the camera. Each figure with its ±; one the picture does not fix goes back to what it was',
  settings: [{ key: 'most', label: 'At most, trials a group', type: 'number', default: 30 }, { key: 'scale', label: 'Scale of the picture while fitting', type: 'number', default: 0.5 }],
  ports: { inputs: [P('machine', 'any'), P('camera', 'record', { label: 'the camera it is seen from (fitted)' }), P('traces', 'table'), P('features', 'table', { label: 'its outline (Dense outline)' }), P('concept', 'boolean', { optional: true })],
    outputs: [P('groups', 'table', { label: 'each group, before and after, px' }), P('figures', 'table'), P('machine', 'any', { label: 'the fitted record' }), P('vehicle', 'part', { label: 'the fitted vehicle' }), P('camera', 'record')] },
  run: (i, c) => {
    const m = machineOf(i.machine), cam = camOf(i.camera), traces = tracesOf(i.traces), o = outlineOf(i.features); if (!traces.length) throw new Error('no features traced on the picture (Photograph → traces)');
    const rig = new Rig(m, cam), f = fitFeatures(rig, traces, o, cam.w, cam.h, { scale: Number(c.set.scale ?? 0.5), most: Number(c.set.most ?? 30) });
    let fitted = rig.apply(f.keys, f.x).machine;
    // (the intake and its vent: put onto the model's own surface, not fitted)
    const intake = traces.find((t) => t.name === 'intake' && t.poly), vent = traces.find((t) => t.name === 'intake vent' && t.poly), extra: Record<string, unknown>[] = [];
    if (fitted.kit && intake) { const sc = new Rig(fitted, cam).scene([], [], 'live', true), v = renderView(sc.root, cam, HIDDEN), ra = Math.min(...fitted.axles.filter((a) => a.track > 0).map((a) => a.x));
      const sco = outlineOnto(v, intake.poly!, 1, ra), ve = vent ? outlineOnto(v, vent.poly!, 1, ra) : fitted.kit.vent;
      fitted = { ...fitted, kit: { ...fitted.kit, scoop: sco, ...(ve ? { vent: ve } : {}) } }; extra.push({ figure: 'intake outline', was: 'its record\'s', now: sco.map((p) => p.join(' ')).join(', '), pm: 'the trace\'s', evidence: i.concept === true ? 'the picture\'s' : 'measured', says: 'taken off the picture onto the model\'s surface, m ahead of the rear axle and over the ground' }); }
    const ev = (fx: boolean) => (!fx ? 'estimated' : i.concept === true ? 'the picture\'s' : 'measured');
    return { groups: f.groups.map((g) => ({ group: g.group, features: g.features, before: +g.before.toFixed(2), after: +g.after.toFixed(2), trials: g.trials })),
      figures: [...f.groups.flatMap((g) => g.figures.map((q) => ({ figure: q.figure, was: +q.was.toFixed(3), now: +q.now.toFixed(3), pm: Number.isFinite(q.pm) ? +q.pm.toFixed(3) : 'unbounded', evidence: ev(q.fixed), says: q.fixed ? `fitted to its features (${g.features})` : 'not fixed by this picture: kept as it was' }))), ...extra],
      machine: fitted, vehicle: makeMachine(fitted), camera: cam };
  } });

node({ id: 'check.accuracy', name: 'Accuracy, four ways (silhouette, features, surface, dimensions)', kind: 'critic', ability: 'check', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'How right is the model: its outline, its features, its surface, its dimensions, each apart?', discipline: 'manufacturing.metrology.inspection', role: 'assessment', codes: [MEAS, ACM_CV] },
  says: 'The model against the picture from the picture\'s own camera, as four separate answers, never one blended score: its silhouette (does the outline match, both ways), its features (each traced feature against the model\'s own part: overlap, offset, edge error), its surface (the model\'s edges inside the outline against the picture\'s, where they disagree most and which parts are there; and what one view cannot show, said unknown), and its dimensions (the model\'s against the published and against the picture\'s, read through the camera). And whether it faces the way the picture does',
  ports: { inputs: [P('view', 'record'), P('image', 'record'), P('features', 'table', { label: 'its marks and outline' }), P('traces', 'table'), P('machine', 'any', { label: 'the model\'s record' }), P('published', 'any', { label: 'the record as published (Vehicle)' }), P('concept', 'boolean', { optional: true })],
    outputs: [P('objectives', 'table'), P('features', 'table', { label: 'each feature' }), P('regions', 'table', { label: 'where its edges disagree most' }), P('dimensions', 'table'), P('orientation', 'text')] },
  run: (i) => { const rows = rowsOf(i.features), a = accuracy(viewOf(i.view), imgOf(i.image), outlineOf(rows), tracesOf(i.traces), rows.map((r) => ({ name: String(r.name), u: Number(r.u), v: Number(r.v) })), machineOf(i.machine), machineOf(i.published), i.concept === true);
    const r2 = (x: number) => (Number.isFinite(x) ? +x.toFixed(2) : 'not found');
    return { objectives: a.objectives, features: a.features.map((r) => ({ feature: r.feature, found: r.found, iou: Number.isFinite(r.iou) ? +r.iou.toFixed(3) : '', middle_px: r2(r.centrePx), edge_px: r2(r.edgePx), edge_mm: Number.isFinite(r.edgeMm) ? +r.edgeMm.toFixed(0) : '', model_is: Number.isFinite(r.du) ? `${Math.abs(r.du).toFixed(0)} px ${r.du > 0 ? 'right' : 'left'}, ${Math.abs(r.dv).toFixed(0)} px ${r.dv > 0 ? 'low' : 'high'}` : '', area: Number.isFinite(r.area) ? +r.area.toFixed(2) : '', says: r.says })),
      regions: a.regions.map((r) => ({ ...r, error: +r.error.toFixed(1) })), dimensions: a.dimensions, orientation: a.orientation }; } });

node({ id: 'view.compare', name: 'Side by side from the same camera', kind: 'view', ability: 'show', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'The picture, the model from the same camera, and where their features differ', discipline: 'electrical.signals', role: 'visualisation', codes: [ACM_CV] },
  says: 'Three panels: the picture; the model from the picture\'s own camera (the right way round); and the picture dimmed with each traced feature\'s edge in green and the model\'s own part\'s in red. As a PNG to keep',
  ports: { inputs: [P('image', 'record'), P('view', 'record'), P('traces', 'table')], outputs: [P('picture', 'record'), P('png', 'any', { label: 'as a PNG file' })] },
  run: (i) => { const p = sideBySide(imgOf(i.image), viewOf(i.view), tracesOf(i.traces)); return { picture: brief(p, `${p.w} × ${p.h} pixels`), png: brief(encodePng(p.w, p.h, p.rgb), 'a PNG') }; } });

node({ id: 'ask.next', name: 'Next best view or measurement (uncertainty ranking)', kind: 'critic', ability: 'ask', domains: ['vehicles', 'manufacturing', 'science'],
  spec: { gloss: 'What one photograph or measurement would settle the most?', discipline: 'manufacturing.metrology.inspection', role: 'assessment', codes: [MEAS, ACM_CV] },
  says: 'What is still not known, or not well fixed, after fitting and measuring (a figure the photograph does not fix, a dimension that conflicts with the record, what no photograph yet shows: its width and its plan, its face, its tail), weighed (unknown 1, a conflict 2, a measured figure by its ± over its range), and the single photograph or measurement that would settle the most of it',
  ports: { inputs: [P('figures', 'table', { optional: true }), P('dimensions', 'table', { optional: true }), P('ambiguity', 'text', { optional: true, label: 'how well the camera is fixed (Camera node)' }), P('concept', 'boolean', { optional: true, label: 'a made picture, not a photograph (Photograph node)' })], outputs: [P('ask', 'text'), P('settles', 'list<text>'), P('open', 'table', { label: 'what is still open' })] },
  run: (i) => {
    // (a made picture is the goal: the camera it was not taken with is nothing to ask for; what is open is the real thing)
    if (i.concept === true) { const open = [{ what: 'the real thing, as it is', evidence: 'unknown' }, ...rowsOf(i.figures).filter((r) => r.evidence === 'estimated').map((r) => ({ what: String(r.figure), evidence: 'estimated' }))];
      return { ask: CONCEPT_ASK, settles: ['the real car beside the goal: how far each line is from it'], open }; }
    const rows = [...rowsOf(i.figures).map((r) => ({ key: String(r.figure), evidence: String(r.evidence), pm: Number(r.pm), range: 0.1 })), ...rowsOf(i.dimensions).map((r) => ({ key: String(r.dimension), evidence: String(r.evidence), pm: Number(r.pm), range: 0.5 })),
      ...(String(i.ambiguity ?? '').startsWith('not fixed') ? [{ key: 'camera distance', evidence: 'not fixed' }] : []),
      // (what a single side view never shows)
      { key: 'width plan haunch.waist tumble', evidence: 'unknown' }, { key: 'face lamp grille', evidence: 'unknown' }, { key: 'tail face', evidence: 'unknown' }];
    const a = askNext(rows); return { ask: a.ask, settles: a.fixes, open: rows.filter((r) => r.evidence !== 'measured').map((r) => ({ what: r.key, evidence: r.evidence })) };
  },
  tests: [{ inputs: { ambiguity: 'not fixed: cameras from 4 to 50 m away fit', dimensions: [{ dimension: 'length', evidence: 'not fixed', pm: 0.5 }] }, outputs: { ask: ASKS[0]!.ask } }, { inputs: { dimensions: [{ dimension: 'length', evidence: 'measured', pm: 0.01 }] }, outputs: { ask: ASKS[1]!.ask } }] });
