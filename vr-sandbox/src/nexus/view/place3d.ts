// A place drawn (src/nexus/places.ts is it as numbers): the sky for the sun's height, the sun's light, the ground and its
// relief (flat where you stand, rising beyond), the sea moving by the deep-water law (ω² = g k), whatever falls falling
// at its terminal speed, a room round you if it is indoors, and what stands in it. Everything here is the place's own
// group: taken down whole when you leave.

import * as THREE from 'three';
import { terminal, wavePeriod, type Place, type Prop } from '../places';

export interface PlaceView { group: THREE.Group; update(dt: number, you: THREE.Vector3): void; dispose(): void; sun: THREE.DirectionalLight; torch: THREE.SpotLight | null }

const std = (c: number, rough = 0.8, metal = 0, more: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, ...more });
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Smooth noise on the ground plane: bilinear between hashed lattice points, octaves summed. */
const noise = (x: number, z: number) => {
  let v = 0, a = 1, f = 1 / 40;
  for (let o = 0; o < 4; o++) {
    const X = x * f, Z = z * f, i = Math.floor(X), j = Math.floor(Z), u = X - i, w = Z - j, s = (t: number) => t * t * (3 - 2 * t);
    const h00 = hash(i, j), h10 = hash(i + 1, j), h01 = hash(i, j + 1), h11 = hash(i + 1, j + 1);
    v += a * (h00 + (h10 - h00) * s(u) + (h01 - h00) * s(w) + (h00 - h10 - h01 + h11) * s(u) * s(w) - 0.5); a *= 0.5; f *= 2;
  }
  return v;
};

/** The place's ground height at a point: flat for 12 m round where you stand, its relief rising beyond, a canyon cut. */
export function groundAt(p: Place, x: number, z: number): number {
  const r = Math.hypot(x, z), rise = Math.min(1, Math.max(0, (r - 12) / 40));
  let y = noise(x, z) * p.ground.relief * 2 * rise;
  if (p.props.some((q) => q.kind === 'canyon')) { const d = -z - 30; if (d > 0) y -= Math.min(400, 400 * Math.min(1, d / 60)) * (Math.abs(x) < 900 ? 1 : 0) * (d < 600 ? 1 : Math.max(0, 1 - (d - 600) / 60)); }
  if (p.water && !p.water.under && p.ground.kind === 'sand') y -= Math.max(0, -z - 6) * 0.06; // the beach shelves into the sea ahead of you
  return y;
}

export function placeView(p: Place, g: number): PlaceView {
  const group = new THREE.Group(); group.name = `place ${p.name}`;
  // ---- the sky: a dome coloured by height above the horizon, the sun's disc and glow, stars when it is dark ----
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - p.sun.elev), THREE.MathUtils.degToRad(p.sun.az));
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zen: { value: new THREE.Color(p.sky.zenith) }, hor: { value: new THREE.Color(p.sky.horizon) }, glow: { value: new THREE.Color(p.sky.glow) }, sun: { value: sunDir }, stars: { value: p.sky.stars ? 1 : 0 }, under: { value: p.water?.under ? 1 : 0 } },
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 zen, hor, glow, sun; uniform float stars, under; varying vec3 vd;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){ float y = max(vd.y, 0.0); vec3 c = mix(hor, zen, pow(y, 0.5));
        float d = max(dot(vd, sun), 0.0); c += glow * (pow(d, 600.0) * 4.0 + pow(d, 12.0) * 0.35 * (1.0 - y));
        if (vd.y < 0.0) c = mix(hor, hor * 0.35, min(1.0, -vd.y * 4.0));
        if (stars > 0.5 && vd.y > 0.0) { vec3 q = floor(vd * 420.0); float s = h(q); c += vec3(step(0.9975, s)) * (0.6 + 0.4 * h(q + 1.0)); }
        if (under > 0.5) c = mix(hor, zen, clamp(vd.y * 0.5 + 0.5, 0.0, 1.0)) + glow * pow(max(vd.y, 0.0), 8.0) * 0.4;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; group.add(sky);
  // ---- light: the sun (warm and weak when low, none below the horizon but the sky's), and the sky's own ----
  const day = THREE.MathUtils.clamp((p.sun.elev + 6) / 30, 0, 1), low = THREE.MathUtils.clamp(1 - p.sun.elev / 25, 0, 1);
  const sunC = new THREE.Color(0xfff4e0).lerp(new THREE.Color(0xff9a50), low * day), sun = new THREE.DirectionalLight(sunC, p.room ? 0.25 : 0.15 + 2.4 * day);
  sun.position.copy(sunDir).multiplyScalar(60); group.add(sun, sun.target);
  group.add(new THREE.HemisphereLight(p.sky.zenith, p.ground.color, p.room ? 0.25 : 0.2 + 0.7 * day));
  // ---- the ground ----
  if (p.ground.radius > 0) {
    const R = p.ground.radius, seg = 160, geo = new THREE.PlaneGeometry(2 * R, 2 * R, seg, seg); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position!, col = new Float32Array(pos.count * 3), base = new THREE.Color(p.ground.color), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = groundAt(p, x, z); pos.setY(i, y);
      c.copy(base).multiplyScalar(0.85 + 0.3 * hash(Math.floor(x / 3), Math.floor(z / 3))); if (y < -50) c.multiplyScalar(0.8); col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, std(0xffffff, p.ground.kind === 'snow' ? 0.6 : 0.95, 0, { vertexColors: true })); ground.receiveShadow = true; group.add(ground);
  }
  if (p.room) group.add(room(p));
  // ---- the sea: waves by ω² = g k, three trains summed (a swell and two shorter seas) ----
  let water: THREE.Mesh | null = null; const waterU = { t: { value: 0 } };
  if (p.water) {
    const L = p.water.wave.length, trains = [[L, p.water.wave.height / 2, 0.0], [L * 0.53, p.water.wave.height / 5, 0.6], [L * 0.31, p.water.wave.height / 9, -0.9]] as const;
    const geo = new THREE.PlaneGeometry(3000, 3000, 220, 220); geo.rotateX(-Math.PI / 2);
    const m = std(p.water.color, 0.15, 0.1, { transparent: true, opacity: p.water.under ? 0.55 : 0.85, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.t = waterU.t;
      const terms = trains.map(([len, amp, dir]) => { const k = (2 * Math.PI) / len, w = Math.sqrt(g * k) || Math.sqrt(9.81 * k); return `h += ${amp.toFixed(4)} * sin(${k.toFixed(5)} * (position.x * ${Math.sin(dir).toFixed(4)} + position.z * ${(-Math.cos(dir)).toFixed(4)}) - ${w.toFixed(5)} * t);`; }).join(' ');
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float t;').replace('#include <begin_vertex>', `vec3 transformed = vec3(position); float h = 0.0; ${terms} transformed.y += h;`);
    };
    water = new THREE.Mesh(geo, m); water.position.y = p.water.level; group.add(water);
  }
  // ---- what stands in it ----
  for (const q of p.props) { const o = prop(q, p); if (!o) continue; o.position.set(q.at[0], p.room ? 0 : groundAt(p, q.at[0], q.at[1]), q.at[1]); o.rotation.y = q.yaw ?? 0; o.scale.multiplyScalar(q.s ?? 1); group.add(o); }
  // ---- lights it has: fire, lamps, spots; a torch is handed to you ----
  let torch: THREE.SpotLight | null = null; const fires: THREE.PointLight[] = [];
  for (const l of p.lights) {
    if (l.kind === 'torch') { torch = new THREE.SpotLight(l.color, l.power * 12, 30, 0.38, 0.5, 1.5); continue; }
    if (l.kind === 'spot') { const s = new THREE.SpotLight(l.color, l.power * 60, 60, 0.5, 0.4, 1.2); s.position.set(...l.at); s.target.position.set(0, 1, 0); group.add(s, s.target); continue; }
    const pl = new THREE.PointLight(l.color, l.power * (l.kind === 'fire' ? 6 : 4), l.kind === 'fire' && l.at[1] > 20 ? 2000 : 14, 1.6); pl.position.set(...l.at); group.add(pl); if (l.kind === 'fire') fires.push(pl);
  }
  // ---- what falls, at its terminal speed: as many in the air round you as fall per square metre per second ----
  let fall: { obj: THREE.Points | THREE.InstancedMesh; pos: Float32Array; v: number; n: number; box: number; top: number } | null = null;
  if (p.fall) {
    const v = Math.min(60, terminal(p.fall, g || 9.81, p.air.density || 1.225)), box = p.fall.shape === 'bear' ? 14 : 22, top = 16;
    const n = Math.max(50, Math.min(p.fall.shape === 'bear' ? 700 : 9000, Math.round((p.fall.perM2s * box * box * top) / Math.max(v, 0.3))));
    const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * box, Math.random() * top, (Math.random() - 0.5) * box], i * 3);
    let obj: THREE.Points | THREE.InstancedMesh;
    if (p.fall.shape === 'bear') {
      const s = p.fall.size, body = new THREE.CapsuleGeometry(s * 0.28, s * 0.35, 3, 8);
      obj = new THREE.InstancedMesh(body, std(p.fall.color, 0.35, 0, { transparent: true, opacity: 0.88 }), n);
      const cols = [0xff4f6d, 0xffb02e, 0x4cd964, 0xfff15a, 0xff7a2e, 0xe8e8e8]; for (let i = 0; i < n; i++) obj.setColorAt(i, new THREE.Color(cols[i % cols.length]!));
    } else {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      obj = new THREE.Points(geo, new THREE.PointsMaterial({ color: p.fall.color, size: p.fall.shape === 'flake' ? 0.03 : 0.012, transparent: true, opacity: p.fall.shape === 'flake' ? 0.9 : 0.55, depthWrite: false }));
    }
    obj.frustumCulled = false; group.add(obj); fall = { obj, pos, v, n, box, top };
  }
  // the air you see through
  const fogC = new THREE.Color(p.sky.horizon), fog = p.water?.under ? new THREE.FogExp2(p.water.color, 2.6 / p.sees) : new THREE.Fog(fogC, Math.min(p.sees * 0.15, 200), p.sees);
  group.userData.fog = fog; group.userData.background = fogC;
  let t = 0; const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler();
  const update = (dt: number, you: THREE.Vector3) => {
    t += dt; waterU.t.value = t; sky.position.copy(you);
    for (const f of fires) f.intensity = (f.userData.base ??= f.intensity) * (0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3));
    if (fall) {
      const { pos, v, n, box, top } = fall, inRoom = (x: number, z: number) => p.room && Math.abs(x) < p.room.w / 2 + 0.3 && z < 0.3 && z > -p.room.d - 0.3;
      for (let i = 0; i < n; i++) {
        let y = pos[i * 3 + 1]! - v * dt; let x = pos[i * 3]!, z = pos[i * 3 + 2]!;
        if (y < 0) { y += top; x = (Math.random() - 0.5) * box; z = (Math.random() - 0.5) * box; }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        if (fall.obj instanceof THREE.InstancedMesh) { const hide = inRoom(x + you.x, z + you.z); e.set(t * 2 + i, i * 0.7, t + i); q4.setFromEuler(e); m4.compose(new THREE.Vector3(x + you.x, hide ? -100 : y + groundAt(p, x + you.x, z + you.z), z + you.z), q4, new THREE.Vector3(1, 1, 1)); fall.obj.setMatrixAt(i, m4); }
      }
      if (fall.obj instanceof THREE.Points) { fall.obj.position.set(you.x, 0, you.z); const a = fall.obj.geometry.attributes.position!; if (p.room) for (let i = 0; i < n; i++) if (inRoom(pos[i * 3]! + you.x, pos[i * 3 + 2]! + you.z)) a.setY(i, -100); a.needsUpdate = true; }
      else fall.obj.instanceMatrix.needsUpdate = true;
    }
  };
  return { group, update, sun, torch, dispose: () => { group.traverse((x) => { const m = x as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((y) => y.dispose()); else mat?.dispose(); }); } };
}

/** The room you stand in when the place is indoors: its floor, walls (a window in one if it has one), ceiling. You stand
 *  at its near wall's middle, facing in. */
function room(p: Place): THREE.Group {
  const r = p.room!, gr = new THREE.Group(), wall = std(r.wall, 0.9), z0 = 0.4;
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.receiveShadow = true; gr.add(b); return b; };
  box(r.w, 0.05, r.d, std(r.floor, 0.85), 0, -0.025, z0 - r.d / 2); box(r.w, 0.05, r.d, std(r.ceiling, 0.9), 0, r.h, z0 - r.d / 2);
  box(0.1, r.h, r.d, wall, -r.w / 2, r.h / 2, z0 - r.d / 2); box(r.w, r.h, 0.1, wall, 0, r.h / 2, z0);
  if (r.window) { // the far wall with a window 1.4 by 1.1 m, its sill at 0.9 m
    const W = 1.4, Hh = 1.1, sill = 0.9, side = (r.w - W) / 2;
    box(side, r.h, 0.1, wall, -(W + side) / 2, r.h / 2, z0 - r.d); box(side, r.h, 0.1, wall, (W + side) / 2, r.h / 2, z0 - r.d);
    box(W, sill, 0.1, wall, 0, sill / 2, z0 - r.d); box(W, r.h - sill - Hh, 0.1, wall, 0, sill + Hh + (r.h - sill - Hh) / 2, z0 - r.d);
    box(W, Hh, 0.01, std(0xbfd8ff, 0.05, 0, { transparent: true, opacity: 0.18 }), 0, sill + Hh / 2, z0 - r.d);
  } else box(r.w, r.h, 0.1, wall, 0, r.h / 2, z0 - r.d);
  box(0.1, r.h, r.d, wall, r.w / 2, r.h / 2, z0 - r.d / 2);
  return gr;
}

/** What stands in a place, by its kind, at its real size where it has one. */
function prop(q: Prop, p: Place): THREE.Object3D | null {
  const g = new THREE.Group(), add = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  switch (q.kind) {
    case 'palm': { const bark = std(0x7a5c3a, 0.9), leaf = std(0x2f7a3a, 0.7, 0, { side: THREE.DoubleSide }); let y = 0, x = 0; for (let i = 0; i < 9; i++) { const s = add(new THREE.CylinderGeometry(0.14 - i * 0.008, 0.17 - i * 0.008, 0.9, 7), bark, x, y + 0.45, 0); s.rotation.z = -0.05 * i; y += 0.88; x += 0.045 * i; }
      for (let k = 0; k < 8; k++) { const f = add(new THREE.PlaneGeometry(0.5, 3.2, 1, 6), leaf, x, y, 0); f.rotation.set(-1.0, (k / 8) * Math.PI * 2, 0.3); f.translateY(1.4); } return g; }
    case 'rock': { const r = add(new THREE.DodecahedronGeometry(0.4 + hash(q.at[0], q.at[1]) * 1.2, 1), std(p.ground.color, 0.95)); r.scale.y = 0.6; return g; }
    case 'pine': { add(new THREE.CylinderGeometry(0.12, 0.18, 2, 6), std(0x5a3e28, 0.9), 0, 1, 0); for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(1.6 - i * 0.32, 2.2, 8), std(p.ground.kind === 'snow' ? 0x2c4a3a : 0x24502c, 0.85), 0, 2 + i * 1.3, 0); return g; }
    case 'cactus': { const m = std(0x3f7a3a, 0.7); add(new THREE.CapsuleGeometry(0.22, 2.4, 4, 10), m, 0, 1.4, 0); add(new THREE.CapsuleGeometry(0.14, 0.8, 4, 8), m, 0.42, 1.6, 0).rotation.z = 0.2; return g; }
    case 'flower': { add(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 4), std(0x3c7a2a), 0, 0.2, 0); const c = [0xff6b9a, 0xffd23f, 0xb48cff, 0xffffff][Math.floor(hash(q.at[0], q.at[1]) * 4)]!; add(new THREE.SphereGeometry(0.05, 8, 6), std(c, 0.6), 0, 0.42, 0).scale.y = 0.4; return g; }
    case 'fern': { const m = std(0x3a7a2e, 0.75, 0, { side: THREE.DoubleSide }); for (let k = 0; k < 7; k++) { const f = add(new THREE.PlaneGeometry(0.25, 1.4), m, 0, 0.4, 0); f.rotation.set(-0.9, (k / 7) * Math.PI * 2, 0); f.translateY(0.6); } return g; }
    case 'kelp': { const m = std(0x4a6a24, 0.6, 0, { side: THREE.DoubleSide }); for (let k = 0; k < 3; k++) add(new THREE.PlaneGeometry(0.18, 6 + k), m, k * 0.2, 3 + k / 2, 0).rotation.y = k; return g; }
    case 'volcano': { add(new THREE.ConeGeometry(420, 520, 48, 1, true), std(0x2a2422, 0.95, 0, { side: THREE.DoubleSide }), 0, 250, 0); add(new THREE.CircleGeometry(60, 24), std(0xff5a1f, 0.6, 0, { emissive: 0xff4a10, emissiveIntensity: 2 }), 0, 505, 0).rotation.x = -Math.PI / 2; return g; }
    case 'peaks': { for (let k = -3; k <= 3; k++) { add(new THREE.ConeGeometry(500, 900 + 300 * hash(k, 3), 7), std(0x5a5852, 0.95), k * 600, 400, -hash(k, 9) * 600); add(new THREE.ConeGeometry(160, 260, 7), std(0xf2f4f8, 0.6), k * 600, 820 + 150 * hash(k, 3), -hash(k, 9) * 600); } return g; }
    case 'earth': { add(new THREE.SphereGeometry(160, 48, 32), std(0x2a5ab0, 0.6, 0, { emissive: 0x0a1a40, emissiveIntensity: 0.4 }), 0, -120, 0); return g; }
    case 'canyon': return null; // cut into the ground itself
    case 'kart track': return null; // drawn with its karts by the forge (src/nexus/view/kart3d.ts)
    case 'fireplace': { const st = std(0x6a6460, 0.95); add(new THREE.BoxGeometry(1.6, 1.2, 0.5), st, 0, 0.6, 0); add(new THREE.BoxGeometry(0.9, 0.7, 0.3), std(0x111111), 0, 0.42, 0.12); add(new THREE.BoxGeometry(0.5, 1.4, 0.4), st, 0, 1.9, -0.05);
      add(new THREE.ConeGeometry(0.18, 0.4, 8), std(0xff7a2a, 0.5, 0, { emissive: 0xff6a1a, emissiveIntensity: 2.2 }), 0, 0.35, 0.18); return g; }
    case 'sofa': { const m = std(0x6a3a2a, 0.9); add(new THREE.BoxGeometry(2, 0.42, 0.9), m, 0, 0.21, 0); add(new THREE.BoxGeometry(2, 0.5, 0.2), m, 0, 0.62, 0.35); return g; }
    case 'rug': { add(new THREE.BoxGeometry(2.4, 0.01, 1.6), std(0x8a2a24, 0.95), 0, 0.005, 0); return g; }
    case 'bar counter': { add(new THREE.BoxGeometry(4.5, 1.07, 0.6), std(0x4a2a18, 0.6), 0, 0.535, 0); add(new THREE.BoxGeometry(4.6, 0.05, 0.75), std(0x2a160c, 0.3), 0, 1.095, 0);
      for (let k = 0; k < 9; k++) add(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 10), std([0x2a7a3a, 0x7a3a1a, 0xc8b070][k % 3]!, 0.15, 0, { transparent: true, opacity: 0.8 }), -2 + k * 0.5, 1.26, -0.15); return g; }
    case 'stool': { add(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 16), std(0x7a2a1e, 0.7), 0, 0.76, 0); add(new THREE.CylinderGeometry(0.025, 0.04, 0.74, 8), std(0x888888, 0.3, 0.8), 0, 0.37, 0); return g; }
    case 'pool table': return poolTable();
    case 'dartboard': return dartboard();
    case 'oche': { add(new THREE.BoxGeometry(0.6, 0.01, 0.04), std(0xc8b070, 0.6), 0, 0.005, 0); return g; }
    case 'staircase': { for (let k = 0; k < 16; k++) add(new THREE.BoxGeometry(3, 0.18, 0.28), std(0x3a2a22, 0.8), 0, 0.09 + k * 0.18, -k * 0.28); return g; }
    case 'chandelier': { add(new THREE.TorusGeometry(0.6, 0.03, 6, 24), std(0x8a7a50, 0.4, 0.7), 0, 3.4, 0).rotation.x = Math.PI / 2; for (let k = 0; k < 8; k++) add(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), std(0xf0e8d0, 0.6, 0, { emissive: 0xffd080, emissiveIntensity: 0.6 }), Math.cos(k * 0.785) * 0.6, 3.48, Math.sin(k * 0.785) * 0.6); return g; }
    case 'armchair': { const m = std(0x3a1a2a, 0.9); add(new THREE.BoxGeometry(0.9, 0.45, 0.9), m, 0, 0.22, 0); add(new THREE.BoxGeometry(0.9, 0.7, 0.18), m, 0, 0.75, -0.36); return g; }
    case 'clock': { add(new THREE.BoxGeometry(0.5, 2.1, 0.35), std(0x3a2416, 0.7), 0, 1.05, 0); add(new THREE.CircleGeometry(0.17, 24), std(0xe8e0c8, 0.6), 0, 1.7, 0.18); return g; }
    case 'stage': { add(new THREE.BoxGeometry(16, 1.2, 10), std(0x111114, 0.6), 0, 0.6, -6); for (const x of [-7, 7]) add(new THREE.BoxGeometry(0.4, 9, 0.4), std(0x333333, 0.4, 0.8), x, 4.5, -10.5); return g; }
    case 'stands': { add(new THREE.CylinderGeometry(160, 110, 40, 64, 1, true), std(0x2a2a34, 0.9, 0, { side: THREE.DoubleSide }), 0, 18, 40); return g; }
    default: return null;
  }
}

/** A 9-foot pool table (WPA): its bed 2.54 by 1.27 m and its top 0.76 m up (a choice inside WPA's 0.74–0.79), six pockets,
 *  the cushions, and fifteen balls racked with the cue ball, each 57.15 mm across. */
export function poolTable(): THREE.Group {
  const g = new THREE.Group(), L = 2.54, W = 1.27, top = 0.76, felt = new THREE.MeshStandardMaterial({ color: 0x1f6a3a, roughness: 0.95 }), wood = new THREE.MeshStandardMaterial({ color: 0x4a2814, roughness: 0.5 });
  const b = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); };
  b(L, 0.04, W, felt, 0, top - 0.02, 0); b(L + 0.3, 0.2, W + 0.3, wood, 0, top - 0.14, 0);
  for (const [w, d, x, z] of [[L, 0.15, 0, W / 2 + 0.075], [L, 0.15, 0, -W / 2 - 0.075], [0.15, W, L / 2 + 0.075, 0], [0.15, W, -L / 2 - 0.075, 0]] as const) b(w, 0.05, d, felt, x, top + 0.025, z);
  for (const [x, z] of [[-L / 2, -W / 2], [0, -W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [0, W / 2], [L / 2, W / 2]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x050505 })); p.position.set(x!, top + 0.005, z!); g.add(p); }
  for (const [x, z] of [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]]) b(0.14, top - 0.24, 0.14, wood, x! * (L / 2 - 0.1), (top - 0.24) / 2, z! * (W / 2 - 0.1));
  const r = 0.028575, cols = [0xf2c200, 0x1a3ca8, 0xc81e1e, 0x5a1a8a, 0xe8601a, 0x1a7a3a, 0x7a1a1a, 0x111111, 0xf2c200, 0x1a3ca8, 0xc81e1e, 0x5a1a8a, 0xe8601a, 0x1a7a3a, 0x7a1a1a];
  let k = 0; for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ color: cols[k++]!, roughness: 0.15 })); s.position.set(L / 4 + row * r * Math.sqrt(3), top + r, (i - row / 2) * 2 * r); s.name = `ball ${k}`; g.add(s); }
  const cue = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.15 })); cue.position.set(-L / 4, top + r, 0); cue.name = 'cue ball'; g.add(cue);
  return g;
}
/** A dartboard as the WDF has it: 451 mm across, the bull 12.7 mm and the outer bull 31.8 mm across, the treble ring 8 mm
 *  wide with its outside 107 mm from the middle, the double ring's outside 170 mm; twenty numbered segments, 20 at the top.
 *  Hung with the bull 1.73 m up. */
export const DARTBOARD = { r: 0.2255, bull: 0.00635, outerBull: 0.0159, trebleOut: 0.107, doubleOut: 0.17, ring: 0.008, height: 1.73, line: 2.37, order: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] };
export function dartboard(): THREE.Group {
  const g = new THREE.Group(), D = DARTBOARD, cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const c = cv.getContext('2d')!, px = 512 / D.r, C = 512;
  c.fillStyle = '#111'; c.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 20; i++) {
    const a0 = (-90 - 9 + i * 18) * Math.PI / 180, a1 = a0 + Math.PI / 10, even = i % 2 === 0;
    const ring = (r0: number, r1: number, col: string) => { c.beginPath(); c.arc(C, C, r1 * px, a0, a1); c.arc(C, C, r0 * px, a1, a0, true); c.closePath(); c.fillStyle = col; c.fill(); };
    ring(D.outerBull, D.trebleOut - D.ring, even ? '#111' : '#efe6c8'); ring(D.trebleOut - D.ring, D.trebleOut, even ? '#c81e1e' : '#1a7a3a');
    ring(D.trebleOut, D.doubleOut - D.ring, even ? '#111' : '#efe6c8'); ring(D.doubleOut - D.ring, D.doubleOut, even ? '#c81e1e' : '#1a7a3a');
    c.save(); c.translate(C + Math.cos(a0 + Math.PI / 20) * 0.195 * px, C + Math.sin(a0 + Math.PI / 20) * 0.195 * px); c.fillStyle = '#eee'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(D.order[i]), 0, 0); c.restore();
  }
  c.beginPath(); c.arc(C, C, D.outerBull * px, 0, 7); c.fillStyle = '#1a7a3a'; c.fill(); c.beginPath(); c.arc(C, C, D.bull * px, 0, 7); c.fillStyle = '#c81e1e'; c.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.CircleGeometry(D.r, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); face.position.set(0, D.height, 0.04); g.add(face);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(D.r, D.r, 0.04, 48), new THREE.MeshStandardMaterial({ color: 0x1a1410 })); back.rotation.x = Math.PI / 2; back.position.set(0, D.height, 0.02); g.add(back);
  return g;
}
/** What a dart scores where it sticks, by the board's rings and segments (x right, y up from the bull, metres). */
export function dartScore(x: number, y: number): { score: number; says: string } {
  const D = DARTBOARD, r = Math.hypot(x, y);
  if (r <= D.bull) return { score: 50, says: 'bull, 50' }; if (r <= D.outerBull) return { score: 25, says: 'outer bull, 25' }; if (r > D.doubleOut) return { score: 0, says: 'off the board' };
  const a = ((90 - Math.atan2(y, x) * 180 / Math.PI) + 9 + 360) % 360, n = D.order[Math.floor(a / 18) % 20]!;
  if (r > D.doubleOut - D.ring) return { score: 2 * n, says: `double ${n}, ${2 * n}` }; if (r > D.trebleOut - D.ring && r <= D.trebleOut) return { score: 3 * n, says: `treble ${n}, ${3 * n}` };
  return { score: n, says: String(n) };
}
export { wavePeriod };
