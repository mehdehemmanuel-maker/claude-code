// A kit's thing drawn (src/nexus/kits.ts makes it as a tree of parts): every part its shape, its colour, its edges as its
// material is made (src/nexus/finish.ts: a moulded edge as round as its mould, a machined one broken, a wooden one
// eased), what gives light lit by its lumens, a galaxy's stars turning faster inside, a terrain's land. It can be taken
// apart: each level of parts drawn out from the middle of what holds them.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { edgeRadius } from '../finish';
import type { Part, Shape } from '../kits';

export interface KitView { group: THREE.Group; update(dt: number): void; explode(level: number): void; dispose(): void; lights: number }

const mats = new Map<string, THREE.MeshStandardMaterial>();
const matFor = (color: number, mat: string | undefined, glow: boolean): THREE.MeshStandardMaterial => {
  const key = `${color}|${mat}|${glow}`; let m = mats.get(key);
  if (!m) {
    const metal = /steel|al-|copper|iron/.test(mat ?? ''), glass = mat === 'glass' || mat === 'pmma' || mat === 'pc';
    m = new THREE.MeshStandardMaterial({ color, roughness: glass ? 0.05 : metal ? 0.35 : mat === 'leaf' ? 0.8 : mat === 'cotton' || mat === 'foam' ? 0.95 : 0.6, metalness: metal ? 0.85 : 0, transparent: glass && !glow, opacity: glass && !glow ? 0.45 : 1, ...(glow ? { emissive: color, emissiveIntensity: 1.6 } : {}) });
    mats.set(key, m);
  }
  return m;
};
/** A cylinder (or a tapered one) with its rims rounded to r: a lathed profile. */
export function filletCyl(r0: number, h: number, r1: number, f: number, seg = 24): THREE.BufferGeometry {
  if (f < 1e-4) return new THREE.CylinderGeometry(r1, r0, h, seg);
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -h / 2)], arc = (cx: number, cy: number, a0: number, a1: number) => { for (let i = 0; i <= 4; i++) { const a = a0 + ((a1 - a0) * i) / 4; pts.push(new THREE.Vector2(cx + f * Math.cos(a), cy + f * Math.sin(a))); } };
  arc(r0 - f, -h / 2 + f, -Math.PI / 2, 0); arc(r1 - f, h / 2 - f, 0, Math.PI / 2); pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, seg);
}
const thinnest = (s: Shape): number => ('box' in s ? Math.min(...s.box) : 'cyl' in s ? Math.min(2 * s.cyl[0], s.cyl[1]) : 'cone' in s ? s.cone[0] : 1);
function geometry(s: Shape, mat: string | undefined, make?: 'pressed'): THREE.BufferGeometry | null {
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
export function kitView(root: Part, o: { maxLights?: number } = {}): KitView {
  const group = new THREE.Group(), turners: ((dt: number) => void)[] = [], nodes: { obj: THREE.Object3D; home: THREE.Vector3; depth: number }[] = [];
  let lights = 0; const maxL = o.maxLights ?? 6;
  const draw = (p: Part, depth: number): THREE.Object3D => {
    const g = new THREE.Group(); g.name = p.name; g.userData.part = p;
    if (p.at) g.position.set(...p.at); if (p.rot) g.rotation.set(...p.rot);
    if (p.shape) {
      if ('stars' in p.shape) { const gx = galaxy(p.shape.stars); g.add(gx.obj); turners.push(gx.turn); }
      else if ('field' in p.shape) g.add(land(p.shape.field));
      else if ('heap' in p.shape) g.add(heap(p.shape.heap));
      else { const geo = geometry(p.shape, p.mat, p.make); if (geo) { if (p.base) { const h = 'cyl' in p.shape ? p.shape.cyl[1] : 'cone' in p.shape ? p.shape.cone[1] : 'capsule' in p.shape ? p.shape.capsule[1] : 'box' in p.shape ? p.shape.box[1] : 0; geo.translate(0, h / 2, 0); } const m = new THREE.Mesh(geo, matFor(p.color ?? 0x999999, p.mat, !!p.light)); m.castShadow = true; m.receiveShadow = true; m.name = p.name; m.userData.part = p; g.add(m); } }
    }
    if (p.light && lights < maxL) { const l = new THREE.PointLight(p.light.color, p.light.lm / (4 * Math.PI), 0, 2); g.add(l); lights++; }
    if (p.spin) { const period = p.spin; turners.push((dt) => { g.rotation.y += (2 * Math.PI * dt) / period; }); }
    for (const q of p.parts ?? []) g.add(draw(q, depth + 1));
    nodes.push({ obj: g, home: g.position.clone(), depth });
    return g;
  };
  group.add(draw(root, 0));
  const box = new THREE.Box3();
  return {
    group, lights,
    update: (dt) => { for (const t of turners) t(dt); },
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
}
