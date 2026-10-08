// A kit's thing drawn (src/nexus/kits.ts makes it as a tree of parts): every part its shape, its colour, its edges as its
// material is made (src/nexus/finish.ts: a moulded edge as round as its mould, a machined one broken, a wooden one
// eased), what gives light lit by its lumens, a galaxy's stars turning faster inside, a terrain's land. It can be taken
// apart: each level of parts drawn out from the middle of what holds them.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { edgeRadius } from '../finish';
import type { Part, Shape } from '../kits';
import { sectionPoint, tubeLegs, type Loft, type Station, type Tube } from '../form';
import { patchAt, tessellate, type Patch } from '../surface';
import { findItem, resolve } from '../inventory';
import { lookOf } from '../pieces';
import { meshOfLook } from './explode';

export interface KitView { group: THREE.Group; update(dt: number): void; explode(level: number): void; dispose(): void; lights: number; /** how fast its limbs go round, strides a second (0: still) */ gait: number }

const mats = new Map<string, THREE.MeshStandardMaterial>();
// how a surface takes the light, by how it was finished (a car's paint is lacquered over its colour, a chrome trim a
// mirror, a tyre's rubber matt, cast metal dull, brushed metal satin): roughness 0 a mirror, 1 chalk (typical of
// physically based renderers' guides for each)
const FINISH: Record<string, { rough: number; metal: number; coat?: number }> = {
  paint: { rough: 0.35, metal: 0.1, coat: 1 }, chrome: { rough: 0.06, metal: 1 }, brushed: { rough: 0.32, metal: 1 }, cast: { rough: 0.7, metal: 0.8 },
  plate: { rough: 0.4, metal: 0.9 }, weld: { rough: 0.75, metal: 0.7 }, tread: { rough: 0.92, metal: 0 }, leather: { rough: 0.55, metal: 0, coat: 0.2 },
  weave: { rough: 0.95, metal: 0 }, texture: { rough: 0.8, metal: 0 }, grain: { rough: 0.7, metal: 0 }, stone: { rough: 0.85, metal: 0 }, concrete: { rough: 0.95, metal: 0 },
};
const RUST = new THREE.Color(0x7a3a1a), DIRT = new THREE.Color(0x5a5040);
const matFor = (color: number, mat: string | undefined, glow: boolean, finish?: string, wear = 0, open = false): THREE.MeshStandardMaterial => {
  const w = Math.round(wear * 10) / 10, key = `${color}|${mat}|${glow}|${finish}|${w}|${open}`; let m = mats.get(key);
  if (!m) {
    const metal = /steel|al-|copper|iron|gold|silver|titanium/.test(mat ?? ''), glass = mat === 'glass' || mat === 'pmma' || mat === 'pc', f = finish ? FINISH[finish] : undefined, rubber = mat === 'rubber';
    // worn: bare steel rusts, paint fades toward grey and gathers dirt, everything goes rougher (an estimate of how it looks)
    const c = new THREE.Color(color); if (w > 0) { if (metal && !/stainless|al-|gold|titanium/.test(mat ?? '') && finish !== 'paint') c.lerp(RUST, w * 0.7); else c.lerp(DIRT, w * 0.35).offsetHSL(0, -w * 0.3, 0); }
    const rough = Math.min(1, (f?.rough ?? (glass ? 0.05 : metal ? 0.35 : rubber ? 0.9 : mat === 'leaf' ? 0.8 : mat === 'cotton' || mat === 'foam' ? 0.95 : 0.6)) + w * 0.35);
    // (tinted glass, a car's windows, is mostly reflection: nearly opaque, dark, glossy; clear glass and lenses are see-through)
    const tinted = glass && c.getHSL({ h: 0, s: 0, l: 0 }).l < 0.2, base = { color: c, roughness: rough, metalness: f?.metal ?? (metal ? 0.85 : 0), transparent: glass && !glow, opacity: glass && !glow ? (tinted ? 0.86 : 0.3) : 1, ...(glow ? { emissive: color, emissiveIntensity: 1.6 } : {}) };
    // (a turned or lofted shell is open at its ends or its inside: drawn on both its faces; paint and glass take a clear
    // coat, the gloss that shows a body's shape in what it reflects)
    m = (f?.coat || glass) && !w ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: f?.coat ?? 1, clearcoatRoughness: 0.04 }) : new THREE.MeshStandardMaterial(base); if (open) m.side = THREE.DoubleSide;
    mats.set(key, m);
  }
  return m;
};
/** A loft drawn: its stations eased into each other (a cubic through them, every span split six times), each a ring
 *  of its superellipse, its two ends closed. */
function loftGeometry(l: Loft): THREE.BufferGeometry {
  // (taken from the back forward, so its faces look outward whichever way its stations were given)
  const st = [...l.st].sort((a, b) => a.x - b.x), K = 40, out: Station[] = [], at = (i: number) => st[Math.max(0, Math.min(st.length - 1, i))]!;
  const cub = (p0: number, p1: number, p2: number, p3: number, t: number) => { const m1 = (p2 - p0) / 2, m2 = (p3 - p1) / 2, t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2; };
  for (let i = 0; i < st.length - 1; i++) for (let k = 0; k < 6; k++) { const t = k / 6, f = (g: (s: Station) => number) => cub(g(at(i - 1)), g(at(i)), g(at(i + 1)), g(at(i + 2)), t); out.push({ x: f((s) => s.x), w: Math.max(0, f((s) => s.w)), lo: f((s) => s.lo), hi: f((s) => s.hi), n: Math.max(1.5, f((s) => s.n ?? 2)), wt: Math.max(0, f((s) => s.wt ?? s.w)), nt: Math.max(1.5, f((s) => s.nt ?? s.n ?? 2)), mid: f((s) => s.mid ?? (s.lo + s.hi) / 2), z: f((s) => s.z ?? 0) }); }
  out.push(st[st.length - 1]!);
  const pos: number[] = [], idx: number[] = [];
  for (const s of out) for (let j = 0; j < K; j++) { const [y, z] = sectionPoint(s, (j / K) * 2 * Math.PI); pos.push(s.x, y, z + (s.z ?? 0)); }
  for (let i = 0; i < out.length - 1; i++) for (let j = 0; j < K; j++) { const a = i * K + j, b = i * K + ((j + 1) % K), c = a + K, d = b + K; idx.push(a, c, b, b, c, d); }
  for (const [ring, flip] of [[0, true], [out.length - 1, false]] as const) { const s = out[ring]!, ci = pos.length / 3; pos.push(s.x, (s.hi + s.lo) / 2, s.z ?? 0); for (let j = 0; j < K; j++) { const a = ring * K + j, b = ring * K + ((j + 1) % K); if (flip) idx.push(ci, a, b); else idx.push(ci, b, a); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** A bent tube drawn along its straights and bends. */
function tubeGeometry(t: Tube): THREE.BufferGeometry {
  const path = new THREE.CurvePath<THREE.Vector3>(), v = (q: number[]) => new THREE.Vector3(q[0], q[1], q[2]), legs = tubeLegs(t);
  for (const l of legs) path.add(l.kind === 'line' ? new THREE.LineCurve3(v(l.a), v(l.b)) : new THREE.QuadraticBezierCurve3(v(l.a), v(l.c!), v(l.b)));
  return legs.length ? new THREE.TubeGeometry(path, Math.max(8, legs.length * 6), t.r, 12, false) : new THREE.BufferGeometry();
}
/** A cylinder (or a tapered one) with its rims rounded to r: a lathed profile. */
export function filletCyl(r0: number, h: number, r1: number, f: number, seg = 24): THREE.BufferGeometry {
  if (f < 1e-4) return new THREE.CylinderGeometry(r1, r0, h, seg);
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -h / 2)], arc = (cx: number, cy: number, a0: number, a1: number) => { for (let i = 0; i <= 4; i++) { const a = a0 + ((a1 - a0) * i) / 4; pts.push(new THREE.Vector2(cx + f * Math.cos(a), cy + f * Math.sin(a))); } };
  arc(r0 - f, -h / 2 + f, -Math.PI / 2, 0); arc(r1 - f, h / 2 - f, 0, Math.PI / 2); pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, seg);
}
/** A box's broad faces printed with characters (a number plate's): its face pair across its thinnest side textured,
 *  the rest plain. Drawn on a canvas where there is a document; plain where there is none. */
const printed = new Map<string, THREE.CanvasTexture>();
function printedMats(p: Part, base: THREE.Material): THREE.Material | THREE.Material[] {
  if (!p.text || !p.shape || !('box' in p.shape) || typeof document === 'undefined') return base;
  const [w, h, d] = p.shape.box, k = w <= h && w <= d ? 0 : h <= d ? 1 : 2, [a, b] = k === 0 ? [d, h] : k === 1 ? [w, d] : [w, h], key = `${p.text}|${a.toFixed(3)}|${b.toFixed(3)}`;
  let tex = printed.get(key);
  if (!tex) { const c = document.createElement('canvas'); c.width = 1024; c.height = Math.max(64, Math.round((1024 * b) / a)); const x = c.getContext('2d')!; x.fillStyle = '#' + new THREE.Color(p.color ?? 0xffffff).getHexString(); x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#1a1a1a'; x.lineWidth = c.height * 0.05; x.strokeRect(c.height * 0.04, c.height * 0.04, c.width - c.height * 0.08, c.height - c.height * 0.08); x.fillStyle = '#141414'; x.font = `bold ${Math.round(c.height * 0.68)}px "DejaVu Sans Mono", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(p.text, c.width / 2, c.height * 0.54); tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; printed.set(key, tex); }
  // (a plate's face is a printed film, not bare metal)
  const face = (base as THREE.MeshStandardMaterial).clone(); face.map = tex; face.color = new THREE.Color(0xffffff); face.metalness = 0.05; face.roughness = 0.45;
  // (BoxGeometry's faces in order: +x, -x, +y, -y, +z, -z)
  return [0, 1, 2, 3, 4, 5].map((i) => (Math.floor(i / 2) === k ? face : base));
}
const thinnest = (s: Shape): number => ('box' in s ? Math.min(...s.box) : 'cyl' in s ? Math.min(2 * s.cyl[0], s.cyl[1]) : 'cone' in s ? s.cone[0] : 1);
/** A freeform skin as triangles: as finely as about 3 cm a step across it (between 6 and 96 steps each way), its normals
 *  the surface's own, so its highlights run as its curvature does. */
function surfGeometry(pt: Patch): THREE.BufferGeometry {
  // (a facet every 30 mm along it, and one for every 3° it turns: a tight corner is drawn round, not as a chord, so two
  // skins a few millimetres apart round it, as a lamp's lens over its housing, are drawn apart and not through each other)
  const run = (f: (t: number) => [number, number]): [number, number] => { let d = 0, turn = 0, q = patchAt(pt, ...f(0)).at, prev: number[] | null = null; for (let k = 1; k <= 32; k++) { const r = patchAt(pt, ...f(k / 32)).at, c = [r[0] - q[0], r[1] - q[1], r[2] - q[2]], l = Math.hypot(c[0]!, c[1]!, c[2]!); d += l; if (prev && l > 1e-9) { const pl = Math.hypot(prev[0]!, prev[1]!, prev[2]!); if (pl > 1e-9) turn += Math.acos(Math.max(-1, Math.min(1, (c[0]! * prev[0]! + c[1]! * prev[1]! + c[2]! * prev[2]!) / (l * pl)))); } if (l > 1e-9) prev = c; q = r; } return [d, turn]; };
  const steps = (rs: [number, number][]) => Math.max(6, Math.min(160, Math.round(Math.max(...rs.map(([d, turn]) => Math.max(d / 0.03, turn / 0.052))))));
  const t = tessellate(pt, steps([run((a) => [a, 0.5]), run((a) => [a, 0]), run((a) => [a, 1])]), steps([run((b) => [0.5, b]), run((b) => [0, b]), run((b) => [1, b])])), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nor, 3)); g.setIndex(t.idx);
  return g;
}
function geometry(s: Shape, mat: string | undefined, make?: 'pressed', facets?: number): THREE.BufferGeometry | null {
  if ('surf' in s) return surfGeometry(s.surf);
  if ('loft' in s) return loftGeometry(s.loft);
  if ('tube' in s) return tubeGeometry(s.tube);
  if ('lathe' in s) return new THREE.LatheGeometry(s.lathe.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), 40);
  // a round part with flat sides (a hex head, a nut): its flats, its edges broken
  if (facets && 'cyl' in s) return new THREE.CylinderGeometry(s.cyl[2] ?? s.cyl[0], s.cyl[0], s.cyl[1], facets);
  const f = edgeRadius(mat, thinnest(s), make);
  if ('box' in s) { const [w, h, d] = s.box; return f > 1e-4 ? new RoundedBoxGeometry(w, h, d, 2, f) : new THREE.BoxGeometry(w, h, d); }
  if ('cyl' in s) { const [r, h, r2 = r] = s.cyl; return filletCyl(r2, h, r, f); }
  if ('sphere' in s) return new THREE.SphereGeometry(s.sphere, 18, 12);
  if ('cone' in s) return new THREE.ConeGeometry(s.cone[0], s.cone[1], 16);
  if ('torus' in s) return new THREE.TorusGeometry(s.torus[0], s.torus[1], 12, 28);
  if ('capsule' in s) return new THREE.CapsuleGeometry(s.capsule[0], s.capsule[1], 4, 12);
  return null;
}
/** A galaxy's stars: on logarithmic spiral arms r = a e^(θ tan φ) (a bar across the middle if it is barred), a bulge of
 *  old stars, the disc thin; drawn as points, each going round at a flat rotation curve's speed (ω = v / r). */
function galaxy(g: Extract<Shape, { stars: unknown }>['stars']): { obj: THREE.Points; turn: (dt: number) => void } {
  let s = g.seed >>> 0 || 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }, gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const n = g.n, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), rad = new Float32Array(n), ang = new Float32Array(n), hgt = new Float32Array(n), R = g.radius, k = Math.tan((g.pitch * Math.PI) / 180), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let rr: number, a: number, y: number; const inBulge = r() < g.bulge * (g.kind === 'elliptical' ? 3 : 1);
    if (g.kind === 'elliptical' || inBulge) { rr = Math.abs(gauss()) * R * (g.kind === 'elliptical' ? 0.35 : g.bulge * 0.6); a = r() * Math.PI * 2; y = gauss() * rr * (g.kind === 'elliptical' ? 1 - g.flat / 10 : 0.6); }
    else if (g.kind === 'irregular') { rr = Math.sqrt(r()) * R * 0.7; a = r() * Math.PI * 2; y = gauss() * R * 0.04; }
    else {
      const arm = Math.floor(r() * g.arms), t = r(); rr = R * (0.08 + 0.92 * t);
      a = (arm / g.arms) * Math.PI * 2 + Math.log(rr / (R * 0.08)) / k + gauss() * (g.kind === 'lenticular' ? 3 : 0.28);
      if (g.kind === 'barred' && rr < R * 0.25) { a = (arm % 2) * Math.PI + gauss() * 0.15; }
      y = gauss() * R * 0.015;
    }
    rad[i] = rr; ang[i] = a; hgt[i] = y;
    const young = !inBulge && g.kind !== 'elliptical' ? 1 - g.tint / 2 : 0.1;
    c.setHSL(young > 0.5 ? 0.6 - 0.05 * r() : 0.08 + 0.05 * r(), 0.6, 0.55 + 0.35 * r()); col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const obj = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })); obj.frustumCulled = false;
  const turn = (dt: number) => { for (let i = 0; i < n; i++) { ang[i]! += (dt * 0.08 * R) / Math.max(rad[i]!, R * 0.05); pos[i * 3] = Math.cos(ang[i]!) * rad[i]!; pos[i * 3 + 1] = hgt[i]!; pos[i * 3 + 2] = Math.sin(ang[i]!) * rad[i]!; } geo.attributes.position!.needsUpdate = true; };
  turn(0); return { obj, turn };
}
/** Land on a table: relief by noise for its kind, water at its level. */
function land(f: Extract<Shape, { field: unknown }>['field']): THREE.Group {
  const g = new THREE.Group(), seg = 96, geo = new THREE.PlaneGeometry(f.size, f.size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position!, c = new THREE.Color(f.color), cols = new Float32Array(p.count * 3), h = (x: number, z: number) => Math.sin(x * 3.1 + f.seed) * Math.cos(z * 2.7 + f.seed * 0.7) * 0.5 + Math.sin(x * 7.3 - z * 5.1 + f.seed) * 0.25 + Math.sin(x * 15 + z * 13) * 0.08;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / f.size, z = p.getZ(i) / f.size, edge = Math.min(1, (0.5 - Math.max(Math.abs(x), Math.abs(z))) * 8);
    let y = h(x * 6, z * 6); if (f.kind === 'canyon') y -= Math.max(0, 0.6 - Math.abs(x) * 6) * 1.5; if (f.kind === 'mesa') y = Math.min(0.5, y * 2); if (f.kind === 'dunes') y = Math.abs(Math.sin(x * 20 + z * 4)) * 0.5; if (f.kind === 'islands') y -= 0.2;
    y = Math.max(-0.5, y) * f.relief * Math.max(0, edge); p.setY(i, y);
    const shade = new THREE.Color(f.color).multiplyScalar(0.8 + 0.4 * (y / (f.relief || 1))); if (f.kind === 'mountains' && y > f.relief * 0.6) shade.set(0xf2f4f8); cols.set([shade.r, shade.g, shade.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals(); void c;
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })));
  if (f.water > 0) { const w = new THREE.Mesh(new THREE.PlaneGeometry(f.size, f.size), new THREE.MeshStandardMaterial({ color: 0x1f6a8a, transparent: true, opacity: 0.7, roughness: 0.1 })); w.rotation.x = -Math.PI / 2; w.position.y = f.relief * (f.water - 0.45); g.add(w); }
  return g;
}

/** A heap of like things in a cone: as many as it holds drawn, up to 20,000 (those on its surface, as you would see). */
function heap(h: Extract<Shape, { heap: unknown }>['heap']): THREE.Object3D {
  let s = h.seed >>> 0 || 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const n = Math.min(h.n, 20000), [w, hh, d] = h.size, geo = new RoundedBoxGeometry(w, hh, d, 1, edgeRadius('abs', hh)), m = new THREE.MeshStandardMaterial({ roughness: 0.35 }), inst = new THREE.InstancedMesh(geo, m, n);
  const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, u = h.n > n ? Math.sqrt(r()) : Math.cbrt(r()), y = h.h * (1 - u) * (h.n > n ? 1 : r()), rr = (h.r * (1 - y / h.h)) * (h.n > n ? 0.92 + 0.08 * r() : Math.sqrt(r()));
    e.set(r() * 6.28, r() * 6.28, r() * 6.28); q.setFromEuler(e); mat4.compose(new THREE.Vector3(Math.cos(a) * rr, y + hh / 2, Math.sin(a) * rr), q, one); inst.setMatrixAt(i, mat4);
    inst.setColorAt(i, c.set(h.colors[i % h.colors.length]!));
  }
  inst.castShadow = true; return inst;
}
/** A thing drawn from its parts; up to so many of its lights really lit (the rest glow). */
let blob: THREE.CanvasTexture | null = null;
const blobTexture = (): THREE.CanvasTexture | null => {
  if (blob) return blob; if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); if (!x) return null;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); blob = new THREE.CanvasTexture(c); return blob;
};
/** The ground's shading under a thing that rests on it: one soft patch its footprint's size, and a darker one under each
 *  part that touches the ground. Null for a thing that does not rest on the ground (or where there is no canvas). */
function contactShadow(group: THREE.Group): THREE.Group | null {
  const tex = blobTexture(); if (!tex) return null;
  group.updateMatrixWorld(true); const all = new THREE.Box3().setFromObject(group); if (all.isEmpty() || all.min.y > 0.05) return null;
  const out = new THREE.Group(); out.name = 'contact shadow'; out.userData.decor = true;
  const patch = (cx: number, cz: number, sx: number, sz: number, opacity: number, lift: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.set(cx, all.min.y + lift, cz); m.renderOrder = 1; m.userData.decor = true; out.add(m);
  };
  const size = all.getSize(new THREE.Vector3()), ctr = all.getCenter(new THREE.Vector3());
  patch(ctr.x, ctr.z, size.x * 1.15, size.z * 1.2, 0.45, 0.002);
  const b = new THREE.Box3();
  group.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; b.setFromObject(m); if (b.isEmpty() || b.min.y > all.min.y + 0.01 || b.max.y - b.min.y < 0.02) return; const s2 = b.getSize(new THREE.Vector3()), c2 = b.getCenter(new THREE.Vector3()); patch(c2.x, c2.z, Math.max(0.05, s2.x) * 1.3, Math.max(0.05, s2.z) * 1.3, 0.55, 0.003); });
  return out;
}
export function kitView(root: Part, o: { maxLights?: number } = {}): KitView {
  const swingers: ((t: number, f: number) => void)[] = []; let clockT = 0;
  const group = new THREE.Group(), turners: ((dt: number) => void)[] = [], nodes: { obj: THREE.Object3D; home: THREE.Vector3; depth: number }[] = [];
  let lights = 0; const maxL = o.maxLights ?? 6;
  const draw = (p: Part, depth: number): THREE.Object3D => {
    const g = new THREE.Group(); g.name = p.name; g.userData.part = p;
    if (p.at) g.position.set(...p.at); if (p.rot) g.rotation.set(...p.rot);
    if (p.shape) {
      if ('stars' in p.shape) { const gx = galaxy(p.shape.stars); g.add(gx.obj); turners.push(gx.turn); }
      else if ('field' in p.shape) g.add(land(p.shape.field));
      else if ('heap' in p.shape) g.add(heap(p.shape.heap));
      else { const geo = geometry(p.shape, p.mat, p.make, p.facets); if (geo) { if (p.base) { const h = 'cyl' in p.shape ? p.shape.cyl[1] : 'cone' in p.shape ? p.shape.cone[1] : 'capsule' in p.shape ? p.shape.capsule[1] : 'box' in p.shape ? p.shape.box[1] : 0; geo.translate(0, h / 2, 0); } const m = new THREE.Mesh(geo, printedMats(p, matFor(p.color ?? 0x999999, p.mat, (!!p.light && !('surf' in p.shape)) || !!p.glow, p.finish, p.wear, 'lathe' in p.shape || 'loft' in p.shape || 'surf' in p.shape))); m.castShadow = true; m.receiveShadow = true; m.name = p.name; m.userData.part = p; g.add(m); } }
    }
    else if (p.item) {
      // a part that is an item of the inventory and has no shape of its own: drawn as that item looks, at its size
      const it = findItem(p.item) ?? ((r) => (r && typeof r === 'object' ? r : null))(resolve(p.item)); if (it) { try { const o = meshOfLook(lookOf(it)); o.name = p.name; o.userData.part = p; g.add(o); } catch { /* an item with no look is left undrawn */ } }
    }
    if (p.light && lights < maxL) { const l = new THREE.PointLight(p.light.color, p.light.lm / (4 * Math.PI), 0, 2); g.add(l); lights++; }
    if (p.spin) { const period = p.spin; turners.push((dt) => { g.rotation.y += (2 * Math.PI * dt) / period; }); }
    if (p.swing) { const sw = p.swing, base = sw.axis === 'x' ? g.rotation.x : g.rotation.z; swingers.push((t, f) => { const a = f > 0 ? sw.amp * Math.sin(2 * Math.PI * (f * t + sw.phase)) : 0; if (sw.axis === 'x') g.rotation.x = base + a; else g.rotation.z = base + a; }); }
    for (const q of p.parts ?? []) g.add(draw(q, depth + 1));
    nodes.push({ obj: g, home: g.position.clone(), depth });
    return g;
  };
  group.add(draw(root, 0));
  // grounded: what rests on the ground darkens the ground under it (the sky's light taken by what is over it), softly
  // under its whole footprint and more where it touches (a tyre, a foot). Drawn, not cast, so it costs nothing on a
  // headset that cannot afford shadow maps, and a thing never looks as if it floats.
  const shade = contactShadow(group); if (shade) group.add(shade);
  const box = new THREE.Box3();
  const view: KitView = {
    group, lights, gait: 0,
    update: (dt) => { for (const t of turners) t(dt); clockT += dt; for (const s of swingers) s(clockT, view.gait); },
    /** Taken apart to so many levels: each part at that depth or less drawn out from its holder's middle, by its size. */
    explode(level) {
      for (const n of nodes) n.obj.position.copy(n.home);
      if (level <= 0) return;
      for (const n of nodes) {
        if (n.depth === 0 || n.depth > level || !n.obj.parent) continue;
        box.setFromObject(n.obj.parent); const size = box.getSize(new THREE.Vector3()).length() || 1, dir = n.home.clone(); if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
        n.obj.position.add(dir.normalize().multiplyScalar(size * 0.25 / n.depth));
      }
    },
    dispose: () => group.traverse((x) => { (x as THREE.Mesh).geometry?.dispose(); }),
  };
  return view;
}
