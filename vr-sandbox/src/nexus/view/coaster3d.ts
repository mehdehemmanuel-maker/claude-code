// The roller coaster drawn (src/nexus/world/coaster.ts is it as numbers): two tubular running rails 1.1 m apart on a spine
// beneath them, tied every 1.2 m, white columns down to the ground wherever the track runs upright above it, the chain
// up the lift, the station's platform and roof, the train of six cars with their riders, and, when asked, a volcano
// whose breached crater the helix runs round over a lake of lava. Edges as things are made (src/nexus/parts/finish.ts):
// steel tube is round already; the cars' fibreglass bodies are moulded round, the platform's concrete chamfered.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { edgeRadius } from '../parts/finish';
import { at, COASTER, cross, type Ride, type Track, type V3 } from '../world/coaster';
import { filletCyl } from './kit3d';

const std = (c: number, rough = 0.6, metal = 0, more: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, ...more });
const rbox = (w: number, h: number, d: number, mat: string, make?: 'pressed') => { const f = edgeRadius(mat, Math.min(w, h, d), make); return f > 1e-4 ? new RoundedBoxGeometry(w, h, d, 2, f) : new THREE.BoxGeometry(w, h, d); };
const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);
/** a car's turn: its forward along the track, its up the track's, its right their cross */
const basis = (t: V3, u: V3) => new THREE.Matrix4().makeBasis(v3(t), v3(u), v3(cross(t, u)));

export interface CoasterView { group: THREE.Group; cars: THREE.Group[]; seat: THREE.Vector3; update(ride: Ride, dt: number): void; dispose(): void }

export function coasterView(tr: Track): CoasterView {
  const group = new THREE.Group(); group.name = 'roller coaster'; const n = tr.p.length;
  const off = (i: number, side: number, down: number): THREE.Vector3 => { const p = v3(tr.p[i]!), u = v3(tr.u[i]!), r = v3(cross(tr.t[i]!, tr.u[i]!)); return p.addScaledVector(r, side).addScaledVector(u, -down); };
  const tube = (side: number, down: number, radius: number, m: THREE.Material, from = 0, to = n, closed = true) => {
    const pts: THREE.Vector3[] = []; for (let i = from; i < to; i += 2) pts.push(off(i, side, down));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), pts.length, radius, 6, closed), m); mesh.castShadow = true; group.add(mesh); return mesh;
  };
  const rail = std(0x1f6fd1, 0.35, 0.6), white = std(0xf2f2f2, 0.5, 0.4);
  tube(-COASTER.gauge / 2, 0, 0.07, rail); tube(COASTER.gauge / 2, 0, 0.07, rail); tube(0, 0.55, 0.2, rail);
  // ties every 1.2 m: a crossbar under the rails, a strut from it down to the spine
  const bars: THREE.Matrix4[] = [], struts: THREE.Matrix4[] = [];
  for (let i = 0; i < n; i += Math.round(1.2 / tr.ds)) { const m = basis(tr.t[i]!, tr.u[i]!); bars.push(m.clone().setPosition(off(i, 0, 0.08))); struts.push(m.clone().setPosition(off(i, 0, 0.32))); }
  const barMesh = new THREE.InstancedMesh(rbox(0.07, 0.07, COASTER.gauge, 'steel-low'), rail, bars.length), strutMesh = new THREE.InstancedMesh(rbox(0.07, 0.45, 0.07, 'steel-low'), rail, struts.length);
  bars.forEach((m, i) => barMesh.setMatrixAt(i, m)); struts.forEach((m, i) => strutMesh.setMatrixAt(i, m)); group.add(barMesh, strutMesh);
  // columns: every 6 m where the track runs upright more than 3 m up, from under the spine to the ground
  const cols: THREE.Matrix4[] = [];
  for (let i = 0; i < n; i += Math.round(6 / tr.ds)) {
    if (tr.u[i]![1] < 0.6) continue; const base = off(i, 0, 0.75); if (base.y < 2.5) continue;
    if (tr.volcano && Math.hypot(base.x - tr.volcano.at[0], base.z - tr.volcano.at[2]) < tr.volcano.crater * 0.45) continue; // not down into the lava
    cols.push(new THREE.Matrix4().compose(new THREE.Vector3(base.x, base.y / 2, base.z), new THREE.Quaternion(), new THREE.Vector3(1, base.y, 1)));
  }
  const colMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.32, 1, 10), white, Math.max(1, cols.length)); cols.forEach((m, i) => colMesh.setMatrixAt(i, m)); colMesh.count = cols.length; colMesh.castShadow = true; group.add(colMesh);
  // the chain up the lift (dark, down the middle), the brakes' fins under the brake run
  const lift = tr.kind.map((k, i) => (k === 'lift' ? i : -1)).filter((i) => i >= 0);
  if (lift.length > 4) tube(0, 0.12, 0.04, std(0x222222, 0.8, 0.5), lift[0]!, lift[lift.length - 1]!, false);
  const fins: THREE.Matrix4[] = []; tr.kind.forEach((k, i) => { if (k === 'brake' && i % 3 === 0) fins.push(basis(tr.t[i]!, tr.u[i]!).setPosition(off(i, 0, 0.32))); });
  const finMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.25, 0.02), std(0xb8bcc0, 0.3, 0.9), Math.max(1, fins.length)); fins.forEach((m, i) => finMesh.setMatrixAt(i, m)); finMesh.count = fins.length; group.add(finMesh);
  // the station: a concrete platform on the right of the track the length of the station, a roof on posts over it
  const st = tr.kind.map((k, i) => (k === 'station' ? i : -1)).filter((i) => i >= 0), s0 = tr.p[st[0]!]!, s1 = tr.p[st[st.length - 1]!]!, len = Math.hypot(s1[0] - s0[0], s1[2] - s0[2]);
  const mid = new THREE.Vector3((s0[0] + s1[0]) / 2, 0, (s0[2] + s1[2]) / 2), concrete = std(0xb8b4ac, 0.9);
  const plat = new THREE.Mesh(rbox(len, 0.9, 3, 'concrete'), concrete); plat.position.set(mid.x, 0.45, mid.z + 2.4); plat.receiveShadow = true; group.add(plat);
  const roof = new THREE.Mesh(rbox(len + 2, 0.25, 7, 'steel-low', 'pressed'), std(0xd8202a, 0.5, 0.3)); roof.position.set(mid.x, 4.6, mid.z + 1); group.add(roof);
  for (let k = 0; k <= 4; k++) { const post = new THREE.Mesh(filletCyl(0.12, 3.8, 0.12, 0.01, 10), white); post.position.set(s0[0] + (len * k) / 4, 2.7, mid.z + 3.6); group.add(post); }
  // the volcano: a cone 30 m high, its crater round the helix, breached on the side the track runs in and out
  let lava: THREE.Mesh | null = null; const smoke: THREE.Sprite[] = [];
  if (tr.volcano) {
    const V = tr.volcano, c = new THREE.Vector3(V.at[0], 0, V.at[2]), rim = 30, inner = V.crater, outer = inner + 55;
    // where the track crosses the crater's wall: the breach must take in those bearings
    const bear: number[] = []; for (let i = 0; i < n; i++) { const d = Math.hypot(tr.p[i]![0] - c.x, tr.p[i]![2] - c.z); if (Math.abs(d - inner) < 1.5) bear.push(Math.atan2(tr.p[i]![0] - c.x, tr.p[i]![2] - c.z)); }
    const mean = Math.atan2(bear.reduce((a, b) => a + Math.sin(b), 0), bear.reduce((a, b) => a + Math.cos(b), 0)), half = Math.max(0.35, ...bear.map((b) => Math.abs(Math.atan2(Math.sin(b - mean), Math.cos(b - mean))))) + 0.15;
    const prof = [new THREE.Vector2(inner * 0.5, 0.2), new THREE.Vector2(inner, 2), new THREE.Vector2(inner + 3, rim * 0.7), new THREE.Vector2(inner + 6, rim), new THREE.Vector2(inner + 12, rim - 1), new THREE.Vector2(outer, 0)];
    const cone = new THREE.Mesh(new THREE.LatheGeometry(prof, 48, mean + half, Math.PI * 2 - 2 * half), std(0x2a2422, 0.95, 0, { side: THREE.DoubleSide, emissive: 0x3a0e04, emissiveIntensity: 0.25 }));
    cone.position.copy(c); cone.castShadow = true; group.add(cone);
    lava = new THREE.Mesh(new THREE.CircleGeometry(inner * 0.95, 48), new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff3a08, emissiveIntensity: 2.2, roughness: 0.6 }));
    lava.rotation.x = -Math.PI / 2; lava.position.set(c.x, 0.25, c.z); group.add(lava);
    const glow = new THREE.PointLight(0xff6a20, 4, inner * 4, 1.2); glow.position.set(c.x, 6, c.z); group.add(glow);
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d')!, grd = cx.createRadialGradient(32, 32, 2, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = grd; cx.fillRect(0, 0, 64, 64);
    const puff = new THREE.SpriteMaterial({ color: 0x6a6262, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.45, depthWrite: false });
    for (let k = 0; k < 30; k++) { const sp = new THREE.Sprite(puff); sp.position.set(c.x + (Math.random() - 0.5) * inner, 5 + Math.random() * 60, c.z + (Math.random() - 0.5) * inner); sp.scale.setScalar(8 + Math.random() * 10); group.add(sp); smoke.push(sp); }
  }
  // the train: six cars, two rows of two seats each, riders in all but your seat (the front car's left)
  const cars: THREE.Group[] = [], body = [0xf2c12e, 0xd8202a];
  for (let k = 0; k < COASTER.cars; k++) {
    const car = new THREE.Group(), add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; car.add(o); return o; };
    add(rbox(1.9, 0.55, 1.45, 'pc', 'pressed'), std(body[k % 2]!, 0.35, 0.1), 0, 0.5, 0);
    for (const x of [0.4, -0.45]) for (const z of [-0.33, 0.33]) {
      // a seat: its cushion, and its back behind the rider; the lap bar down over the rider's lap
      const pad = std(0x161616, 0.8); add(rbox(0.45, 0.12, 0.46, 'foam'), pad, x - 0.05, 0.84, z); add(rbox(0.12, 0.75, 0.46, 'foam'), pad, x - 0.3, 1.2, z);
      const bar = add(new THREE.TorusGeometry(0.17, 0.025, 6, 12, Math.PI), std(0x9aa0a6, 0.3, 0.9), x + 0.12, 0.92, z); bar.rotation.y = Math.PI / 2;
      if (!(k === 0 && x > 0 && z < 0)) { add(new THREE.SphereGeometry(0.11, 12, 8), std([0xe0b090, 0xc08060, 0x8a5a3c, 0xf0c8a8][(k + Math.round(x * 3) + Math.round(z * 3) + 8) % 4]!, 0.7), x - 0.08, 1.7, z); add(new THREE.CapsuleGeometry(0.15, 0.35, 4, 8), std([0x3a6ad8, 0x2a2a30, 0xd84a3a, 0x3aa86a][(k + Math.round(z * 3) + 4) % 4]!, 0.8), x - 0.1, 1.25, z); }
    }
    for (const x of [0.65, -0.65]) for (const z of [-COASTER.gauge / 2, COASTER.gauge / 2]) { const w = add(filletCyl(0.12, 0.08, 0.12, 0.01, 12), std(0x2a2a2a, 0.9), x, 0.12, z); w.rotation.x = Math.PI / 2; }
    group.add(car); cars.push(car);
  }
  const update = (ride: Ride, dt: number) => {
    cars.forEach((car, k) => { const q = at(tr, ride.s - k * COASTER.gap); car.matrixAutoUpdate = false; car.matrix.copy(basis(q.t, q.u).setPosition(v3(q.p))); car.matrixWorldNeedsUpdate = true; });
    for (const sp of smoke) { sp.position.y += dt * 1.5; if (sp.position.y > 70) sp.position.y = 5; }
    if (lava) (lava.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + 0.4 * Math.sin(performance.now() / 700);
  };
  return { group, cars, seat: new THREE.Vector3(0.32, 1.66, -0.33), update, dispose: () => group.traverse((x) => { const m = x as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((y) => y.dispose()); else mat?.dispose(); }) };
}
