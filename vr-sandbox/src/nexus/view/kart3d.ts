// The go-kart track and its karts drawn (src/nexus/world/karting.ts is them as numbers): the asphalt along the track's centre
// line at its width, red and white kerbs on its corners, white lines at its edges, the start line chequered, grid boxes,
// stacked tyre walls round it, a timing board. A kart at its real size: a rental kart about 1.85 by 1.35 m, its front
// tyres 10 × 4.50-5 and its rear 11 × 7.10-5 (inches: 254 and 279 mm across, typical), its seat, wheel, bodywork moulded
// round (rotomoulded polyethylene: its edges as round as a styled panel, src/nexus/parts/finish.ts), the engine box on the
// right behind the seat at the GX270's own size (381 × 428 × 422 mm, Honda).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { edgeRadius } from '../parts/finish';
import { filletCyl } from './kit3d';
import type { Track } from '../world/karting';

const std = (c: number, rough = 0.7, metal = 0, more: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, ...more });
const rbox = (w: number, h: number, d: number, mat: string, make?: 'pressed') => { const f = edgeRadius(mat, Math.min(w, h, d), make); return f > 1e-4 ? new RoundedBoxGeometry(w, h, d, 2, f) : new THREE.BoxGeometry(w, h, d); };

/** A ribbon along the track at offsets a..b from its centre line (+ to the right), y up off the ground. */
function ribbon(tr: Track, a: number, b: number, y: number, color: (i: number) => THREE.Color | null, every = 1): THREE.BufferGeometry {
  const pos: number[] = [], col: number[] = [], idx: number[] = [], n = tr.pts.length;
  for (let i = 0; i <= n; i += every) {
    const k = i % n, p = tr.pts[k]!, t = tr.tan[k]!, rx = -t[1], rz = t[0];
    pos.push(p[0] + rx * a, y, p[1] + rz * a, p[0] + rx * b, y, p[1] + rz * b);
    const c = color(k) ?? new THREE.Color(0x000000); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  const m = pos.length / 6;
  for (let i = 0; i < m - 1; i++) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export interface TrackView { group: THREE.Group; board: (rows: string[]) => void; lights: (n: number, out: boolean) => void; dispose(): void }
/** The track drawn: asphalt, kerbs, lines, the start, the grid, the tyre walls, the timing board and the start lights. */
export function trackView(tr: Track): TrackView {
  const group = new THREE.Group(); group.name = 'kart track'; const half = tr.width / 2, n = tr.pts.length;
  // the asphalt, a little darker where karts lay rubber on the line (an estimate of where: the inside of each corner)
  const asphalt = new THREE.Mesh(ribbon(tr, -half, half, 0.02, () => new THREE.Color(0x3a3c40)), std(0xffffff, 0.92, 0, { vertexColors: true })); asphalt.receiveShadow = true; group.add(asphalt);
  // kerbs on the corners, 0.6 m wide, red and white every 1.2 m, a little raised (typical: 25–50 mm)
  const isCorner = (i: number) => { for (let k = -6; k <= 6; k++) if (Math.abs(tr.kappa[(i + k + n) % n]!) > 1 / 40) return true; return false; };
  const kerbCol = (i: number) => (isCorner(i) ? new THREE.Color(Math.floor(tr.s[i]! / 1.2) % 2 ? 0xd8202a : 0xf2f2f2) : null);
  for (const side of [-1, 1]) {
    const g = ribbon(tr, side * half, side * (half + 0.6), 0.035, (i) => kerbCol(i) ?? new THREE.Color(0x3a3c40));
    group.add(new THREE.Mesh(g, std(0xffffff, 0.8, 0, { vertexColors: true })));
    group.add(new THREE.Mesh(ribbon(tr, side * (half - 0.15), side * (half - 0.05), 0.03, () => new THREE.Color(0xeeeeee)), std(0xffffff, 0.7, 0, { vertexColors: true })));
  }
  // the start line: a chequer 1 m deep across the track at s = 0; the grid boxes behind it every 4 m in two columns
  const p0 = tr.pts[0]!, t0 = tr.tan[0]!, heading = Math.atan2(t0[1], t0[0]);
  const cheq = new THREE.Group(); cheq.position.set(p0[0], 0.031, p0[1]); cheq.rotation.y = -heading;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 14; b++) { const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), std((a + b) % 2 ? 0x111111 : 0xffffff, 0.8)); sq.rotation.x = -Math.PI / 2; sq.position.set(-0.25 + a * 0.5, 0, -half + 0.25 + b * 0.5); cheq.add(sq); }
  group.add(cheq);
  for (let place = 0; place < 8; place++) {
    const back = 6 + place * 4, i = Math.max(0, tr.s.findIndex((x) => x >= tr.length - back)), p = tr.pts[i]!, t = tr.tan[i]!, side = (place % 2 ? -1 : 1) * 1.6;
    const box = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.3), std(0xffffff, 0.7)); box.rotation.set(-Math.PI / 2, 0, -Math.atan2(t[1], t[0])); box.position.set(p[0] - t[1] * side + t[0] * 1.1, 0.032, p[1] + t[0] * side + t[1] * 1.1); group.add(box);
  }
  // tyre walls: stacks of two tyres every 0.62 m, 3 m beyond the kerbs on both sides (a tyre about 0.6 m across, typical);
  // each tyre a coarse torus (72 triangles: some 3,500 of them is about 250,000, within a headset's budget)
  const wall: THREE.Matrix4[] = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), off = half + 0.6 + 3 + 0.3;
  for (const side of [-1, 1]) {
    let last: [number, number] = [1e9, 1e9];
    for (let i = 0; i < n; i++) {
      const p = tr.pts[i]!, t = tr.tan[i]!, x = p[0] - t[1] * side * off, z = p[1] + t[0] * side * off;
      if (Math.hypot(x - last[0], z - last[1]) < 0.62) continue;
      last = [x, z]; for (let h = 0; h < 2; h++) wall.push(m4.clone().compose(new THREE.Vector3(x, 0.1 + h * 0.2, z), q, new THREE.Vector3(1, 1, 1)));
    }
  }
  const tyres = new THREE.InstancedMesh(new THREE.TorusGeometry(0.22, 0.09, 4, 9), std(0x161616, 0.9), wall.length);
  wall.forEach((w, i) => { tyres.setMatrixAt(i, w); tyres.setColorAt(i, new THREE.Color(Math.floor(i / 2) % 2 ? 0x161616 : 0xdcdcdc)); }); tyres.castShadow = true; group.add(tyres);
  // the timing board and the start lights, over the start line on a gantry
  const gantry = new THREE.Group(); gantry.position.set(p0[0], 0, p0[1]); gantry.rotation.y = -heading; group.add(gantry);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(filletCyl(0.08, 4.2, 0.08, 0.005, 12), std(0x6a6e74, 0.4, 0.8)); post.position.set(0, 2.1, s * (half + 1.4)); gantry.add(post); }
  const beam = new THREE.Mesh(rbox(0.3, 0.3, tr.width + 3, 'steel-low'), std(0x6a6e74, 0.4, 0.8)); beam.position.set(0, 4.2, 0); gantry.add(beam);
  const lamps: THREE.MeshStandardMaterial[] = [];
  for (let k = 0; k < 5; k++) { const m = std(0x220000, 0.4, 0, { emissive: 0xff1a10, emissiveIntensity: 0 }); lamps.push(m); const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), m); l.position.set(-0.18, 3.85, (k - 2) * 0.36); gantry.add(l); }
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const ctx = cv.getContext('2d')!, tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({ map: tex })); screen.position.set(-0.2, 5.5, 0); screen.rotation.y = -Math.PI / 2; gantry.add(screen);
  const board = (rows: string[]) => { ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 30px monospace'; ctx.fillText('TIMING', 16, 38); ctx.fillStyle = '#f2f2f2'; ctx.font = '24px monospace'; rows.slice(0, 7).forEach((r, i) => ctx.fillText(r, 16, 76 + i * 28)); tex.needsUpdate = true; };
  board(['say "go" or press the throttle']);
  const lights = (k: number, out: boolean) => lamps.forEach((m, i) => { m.emissiveIntensity = !out && i < k ? 3 : 0; });
  return { group, board, lights, dispose: () => group.traverse((x) => { const mm = x as THREE.Mesh; mm.geometry?.dispose(); const mat = mm.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((y) => y.dispose()); else mat?.dispose(); }) };
}

export interface KartView { group: THREE.Group; wheels: THREE.Object3D[]; frontWheels: THREE.Object3D[]; steering: THREE.Object3D; dash: (lines: string[]) => void; seat: THREE.Vector3 }
/** A kart drawn, its forward along +x, its right along +z, its seat's eye point at `seat` (about 0.85 m up: a driver sat
 *  low, typical). With a driver in it unless it is yours. */
export function kartView(color: number, driver: boolean, number: number): KartView {
  const g = new THREE.Group(), body = std(color, 0.45), black = std(0x141414, 0.85), steel = std(0x9aa0a6, 0.35, 0.85), add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  // the chassis: tubes 30 mm across under a floor tray; the bodywork: a nose, two side pods and a rear bumper, moulded round
  for (const z of [-0.32, 0.32]) add(filletCyl(0.015, 1.5, 0.015, 0.003, 10), steel, 0.05, 0.06, z).rotation.z = Math.PI / 2;
  add(rbox(1.1, 0.012, 0.62, 'al-6061'), steel, 0.05, 0.05, 0);
  add(rbox(0.5, 0.2, 0.95, 'pp', 'pressed'), body, 0.75, 0.16, 0).rotation.z = -0.12; // the nose
  for (const z of [-0.58, 0.58]) add(rbox(0.75, 0.2, 0.22, 'pp', 'pressed'), body, -0.05, 0.16, z); // the side pods
  add(rbox(0.25, 0.24, 1.32, 'pp', 'pressed'), body, -0.85, 0.2, 0); // the rear bumper
  add(rbox(0.06, 0.2, 0.3, 'pp', 'pressed'), std(0xf2f2f2, 0.5), 0.92, 0.3, 0); // the number plate
  // the seat, moulded fibreglass; the wheel 300 mm across on its column
  const seat = add(rbox(0.42, 0.5, 0.4, 'pp', 'pressed'), black, -0.32, 0.32, 0); seat.rotation.z = 0.35;
  // the wheel faces the driver, tilted 40° back from upright on a column that rises from the front (typical)
  const tilt = new THREE.Group(); tilt.position.set(0.28, 0.48, 0); tilt.rotation.z = -0.7; g.add(tilt);
  const steering = new THREE.Group(); tilt.add(steering); // turned about the column with the steer
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 8, 24), black); rim.rotation.y = Math.PI / 2; steering.add(rim);
  const spoke = new THREE.Mesh(rbox(0.012, 0.26, 0.03, 'abs'), black); steering.add(spoke);
  const col = add(filletCyl(0.012, 0.42, 0.012, 0.002, 8), steel, 0.44, 0.345, 0); col.rotation.z = 0.87;
  // a little screen on the wheel: speed, lap, times
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const ctx = cv.getContext('2d')!, tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const dashM = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: tex })); dashM.rotation.y = -Math.PI / 2; dashM.position.set(-0.02, 0.06, 0); steering.add(dashM);
  const dash = (lines: string[]) => { ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#6cf0ff'; ctx.font = 'bold 40px monospace'; ctx.fillText(lines[0] ?? '', 10, 44); ctx.fillStyle = '#f2f2f2'; ctx.font = '20px monospace'; lines.slice(1, 4).forEach((l, i) => ctx.fillText(l, 10, 74 + i * 22)); tex.needsUpdate = true; };
  // the engine at the GX270's size on the right behind the seat, its exhaust, the chain guard
  add(rbox(0.38, 0.42, 0.43, 'cast-iron'), std(0xc8202a, 0.5, 0.3), -0.55, 0.32, 0.48);
  add(filletCyl(0.05, 0.22, 0.05, 0.01, 12), steel, -0.75, 0.3, 0.7).rotation.x = Math.PI / 2;
  add(rbox(0.3, 0.12, 0.04, 'abs'), black, -0.6, 0.12, 0.62);
  // the wheels: tyres lathed round, on rims; front 254 mm across and 114 wide, rear 279 and 180 (typical rental sizes)
  const wheels: THREE.Object3D[] = [], frontWheels: THREE.Object3D[] = [];
  const wheel = (x: number, z: number, d: number, w: number, front: boolean) => {
    const pivot = new THREE.Group(); pivot.position.set(x, d / 2, z); g.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const tyre = new THREE.Mesh(filletCyl(d / 2, w, d / 2, w * 0.3, 20), black); tyre.rotation.x = Math.PI / 2; spin.add(tyre);
    const hub = new THREE.Mesh(filletCyl(d * 0.3, w * 1.02, d * 0.3, 0.004, 14), std(0xd0d4d8, 0.3, 0.9)); hub.rotation.x = Math.PI / 2; spin.add(hub);
    wheels.push(spin); if (front) frontWheels.push(pivot); return pivot;
  };
  for (const s of [-1, 1]) { wheel(0.52, s * 0.55, 0.254, 0.114, true); wheel(-0.53, s * 0.64, 0.279, 0.18, false); }
  // the driver: a helmet, a suit, arms to the wheel (not drawn in your own kart: you are in it)
  if (driver) {
    const suit = std(0x1c2230, 0.8), helmet = std(color, 0.25, 0.1);
    add(new THREE.CapsuleGeometry(0.17, 0.32, 4, 10), suit, -0.32, 0.6, 0).rotation.z = 0.35;
    add(new THREE.SphereGeometry(0.15, 16, 12), helmet, -0.22, 0.98, 0);
    add(new THREE.SphereGeometry(0.152, 16, 12, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.35, Math.PI * 0.25), std(0x111111, 0.1, 0.4), -0.21, 0.98, 0).rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) { const arm = add(new THREE.CapsuleGeometry(0.045, 0.42, 4, 8), suit, 0.02, 0.62, s * 0.17); arm.rotation.z = Math.PI / 2 - 0.5; }
    for (const s of [-1, 1]) { const leg = add(new THREE.CapsuleGeometry(0.06, 0.55, 4, 8), suit, 0.25, 0.2, s * 0.12); leg.rotation.z = Math.PI / 2 - 0.16; }
  }
  // its number on the nose
  const nc = document.createElement('canvas'); nc.width = 64; nc.height = 64; const nx = nc.getContext('2d')!; nx.fillStyle = '#ffffff'; nx.fillRect(0, 0, 64, 64); nx.fillStyle = '#111'; nx.font = 'bold 44px sans-serif'; nx.textAlign = 'center'; nx.fillText(String(number), 32, 48);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nc) })); plate.position.set(0.951, 0.3, 0); plate.rotation.y = Math.PI / 2; g.add(plate);
  return { group: g, wheels, frontWheels, steering, dash, seat: new THREE.Vector3(-0.3, 0.84, 0) };
}
