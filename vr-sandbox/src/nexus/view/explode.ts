// Anything, in three dimensions, coming apart in front of you: an item of the inventory, or a build on the table. Whole,
// it turns slowly on a ring of light. Apart, its parts fly out round where it was, each in its own shape and finish at
// the same scale as the whole (src/nexus/pieces.ts says how each looks and where each goes), each named under it.
// Point at a part (the trigger, or a click) and it comes forward and opens in turn: down through its parts, then the
// material, then the elements, the same few dozen under everything. Back goes up a level; close puts it away.
// A build on the table comes apart where it stands, from its real places, and its parts open the same way.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { INVENTORY } from '../inventory';
import { planOf, type Look, type Plan } from '../pieces';
import { card, label } from './holo';

const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const matOf = (l: Look, ghost = false) => {
  const m = new THREE.MeshStandardMaterial({ color: l.finish.color, metalness: l.finish.metal, roughness: l.finish.rough, transparent: ghost || !!l.finish.clear, opacity: ghost ? 0.14 : l.finish.clear ? 0.45 : 1, depthWrite: !ghost });
  return m;
};
/** A gear's outline: a tooth for each of its teeth, a bore at its middle. */
function gearShape(r: number, teeth: number, bore: number): THREE.Shape {
  const s = new THREE.Shape(), rr = r * (1 - 2.5 / Math.max(12, teeth)), n = teeth * 4;
  for (let k = 0; k <= n; k++) { const t = (k / n) * Math.PI * 2, up = k % 4 === 1 || k % 4 === 2; const R = up ? r : rr; if (k === 0) s.moveTo(R * Math.cos(t), R * Math.sin(t)); else s.lineTo(R * Math.cos(t), R * Math.sin(t)); }
  if (bore > 0) { const h = new THREE.Path(); h.absarc(0, 0, r * bore, 0, Math.PI * 2, true); s.holes.push(h); }
  return s;
}
/** A T-slot profile: a square with a slot in each side. */
function tslotShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape(), a = w / 2, b = h / 2, sl = Math.min(w, h) * 0.13, dp = Math.min(w, h) * 0.22;
  s.moveTo(-a, -b); s.lineTo(-sl, -b); s.lineTo(-sl, -b + dp); s.lineTo(sl, -b + dp); s.lineTo(sl, -b); s.lineTo(a, -b);
  s.lineTo(a, -sl); s.lineTo(a - dp, -sl); s.lineTo(a - dp, sl); s.lineTo(a, sl); s.lineTo(a, b);
  s.lineTo(sl, b); s.lineTo(sl, b - dp); s.lineTo(-sl, b - dp); s.lineTo(-sl, b); s.lineTo(-a, b);
  s.lineTo(-a, sl); s.lineTo(-a + dp, sl); s.lineTo(-a + dp, -sl); s.lineTo(-a, -sl); s.lineTo(-a, -b);
  return s;
}
const steel = () => new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.9, roughness: 0.3 });
const dark = () => new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.1, roughness: 0.7 });
const rubber = () => new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0, roughness: 0.9 });
const greenBoard = () => new THREE.MeshStandardMaterial({ color: 0x1f6f43, metalness: 0.05, roughness: 0.6 });
/** A tube along a path of points: a frame's member, a spoke, a coil of wire. */
const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) => { const len = a.distanceTo(b), g = new THREE.CylinderGeometry(r, r, len, 10), me = new THREE.Mesh(g, m); me.position.copy(a).lerp(b, 0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return me; };
/** A look drawn: its shape at its size, in its finish, centred on the origin. Axial shapes stand upright, disc shapes
 *  face you, the rest sit as boxes (src/nexus/pieces.ts says which is which). */
export function meshOfLook(l: Look, ghost = false): THREE.Object3D {
  const big = Math.max(...l.size), [x, y, z] = l.size.map((v) => Math.max(v, big * 0.01)) as [number, number, number], mat = matOf(l, ghost), g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material = mat) => { const me = new THREE.Mesh(geo, ghost ? mat : m); g.add(me); return me; };
  const across = Math.max(x, y), axisLen = z;
  switch (l.kind) {
    // axial: a × b across, c along an upright axis
    case 'screw': { const d = Math.min(x, y), shank = add(new THREE.CylinderGeometry(d * 0.32, d * 0.32, axisLen * 0.82, 16)); shank.position.y = -axisLen * 0.09; const hd = l.mark === 'hex' ? new THREE.CylinderGeometry(d * 0.55, d * 0.55, axisLen * 0.18, 6) : l.mark === 'flat' ? new THREE.CylinderGeometry(d * 0.55, d * 0.3, axisLen * 0.14, 24) : l.mark === 'dome' ? new THREE.SphereGeometry(d * 0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.CylinderGeometry(d * 0.5, d * 0.5, axisLen * 0.18, 24); const h = add(hd); h.position.y = axisLen * 0.41; if (l.mark === 'dome') h.scale.y = 0.5; for (let k = 0; k < 6; k++) { const r = add(new THREE.TorusGeometry(d * 0.32, d * 0.035, 5, 18)); r.rotation.x = Math.PI / 2; r.position.y = -axisLen * 0.45 + k * axisLen * 0.11; } break; }
    case 'rod': { const d = Math.min(x, y); add(new THREE.CylinderGeometry(d / 2, d / 2, axisLen, 20)); if (l.mark === 'thread') for (let k = -6; k <= 6; k++) { const r = add(new THREE.TorusGeometry(d / 2, d * 0.04, 5, 18)); r.rotation.x = Math.PI / 2; r.position.y = (k / 14) * axisLen; } break; }
    case 'can': case 'motor': { const d = Math.min(x, y), sq = l.mark === 'square'; add(sq ? new RoundedBoxGeometry(d, axisLen * 0.9, d, 2, d * 0.06) : new THREE.CylinderGeometry(d / 2, d / 2, axisLen * (l.kind === 'motor' ? 0.9 : 1), 32)); const cap = add(new THREE.CylinderGeometry(d * (l.kind === 'motor' ? 0.06 : 0.22), d * (l.kind === 'motor' ? 0.06 : 0.22), axisLen * (l.kind === 'motor' ? 0.3 : 0.04), 16), steel()); cap.position.y = axisLen * (l.kind === 'motor' ? 0.55 : 0.51); break; }
    case 'tube': { const D = across, b = l.bore ?? 0.8; add(new THREE.LatheGeometry([new THREE.Vector2((D * b) / 2, -axisLen / 2), new THREE.Vector2(D / 2, -axisLen / 2), new THREE.Vector2(D / 2, axisLen / 2), new THREE.Vector2((D * b) / 2, axisLen / 2), new THREE.Vector2((D * b) / 2, -axisLen / 2)], 32)); break; }
    case 'spring': { const D = across, w = Math.max(l.wire ?? D * 0.1, D * 0.04), n = l.coils ?? 8, pts: THREE.Vector3[] = []; for (let k = 0; k <= n * 24; k++) { const t = (k / 24) * Math.PI * 2; pts.push(new THREE.Vector3((Math.cos(t) * (D - w)) / 2, -axisLen / 2 + (k / (n * 24)) * axisLen, (Math.sin(t) * (D - w)) / 2)); } add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 24, w / 2, 8, false)); break; }
    case 'dome': { const r = Math.min(x, y) / 2, c = add(new THREE.CylinderGeometry(r, r, axisLen * 0.6, 24)); c.position.y = -axisLen * 0.2; const top = add(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)); top.position.y = axisLen * 0.1; break; }
    case 'hex': { const hx = add(new THREE.CylinderGeometry(across / 2, across / 2, Math.min(axisLen, across * 3), 6)); hx.rotation.y = Math.PI / 6; if ((l.bore ?? 0) > 0) { const h = add(new THREE.CylinderGeometry(across * (l.bore ?? 0.5) * 0.5, across * (l.bore ?? 0.5) * 0.5, Math.min(axisLen, across * 3) * 1.02, 16), dark()); h.scale.set(1, 1, 1); } break; }
    // discs: a × b across their face, c thick, facing you
    case 'bearing': { const D = across, w = z, b = l.bore ?? 0.4; const outer = add(new THREE.LatheGeometry([new THREE.Vector2(D * 0.38, -w / 2), new THREE.Vector2(D / 2, -w / 2), new THREE.Vector2(D / 2, w / 2), new THREE.Vector2(D * 0.38, w / 2), new THREE.Vector2(D * 0.38, -w / 2)], 40)), inner = add(new THREE.LatheGeometry([new THREE.Vector2((D * b) / 2, -w / 2), new THREE.Vector2(D * 0.27, -w / 2), new THREE.Vector2(D * 0.27, w / 2), new THREE.Vector2((D * b) / 2, w / 2), new THREE.Vector2((D * b) / 2, -w / 2)], 40));
      outer.rotation.x = inner.rotation.x = Math.PI / 2; const n = 9, rb = Math.min(D * 0.06, w * 0.45); for (let k = 0; k < n; k++) { const t = (k / n) * Math.PI * 2, ball = add(new THREE.SphereGeometry(rb, 12, 8), steel()); ball.position.set(Math.cos(t) * D * 0.325, Math.sin(t) * D * 0.325, 0); } break; }
    case 'ring': { const D = across, b = l.bore ?? 0.5, r = add(new THREE.LatheGeometry([new THREE.Vector2((D * b) / 2, -z / 2), new THREE.Vector2(D / 2, -z / 2), new THREE.Vector2(D / 2, z / 2), new THREE.Vector2((D * b) / 2, z / 2), new THREE.Vector2((D * b) / 2, -z / 2)], 40)); r.rotation.x = Math.PI / 2; break; }
    case 'torus': add(new THREE.TorusGeometry(Math.max(across / 2 - z / 2, z * 0.6), z / 2, 14, 48)); break;
    case 'gear': { const geo = new THREE.ExtrudeGeometry(gearShape(across / 2, l.teeth ?? 20, l.bore ?? 0.2), { depth: z, bevelEnabled: false, curveSegments: 8 }); geo.translate(0, 0, -z / 2); add(geo); break; }
    case 'wheel': { const D = across, w = z, tyre = add(new THREE.TorusGeometry(D / 2 - w / 2, w / 2, 14, 48), rubber()); void tyre; const rim = add(new THREE.TorusGeometry(D / 2 - w, w * 0.18, 8, 48), steel()); void rim; const hub = add(new THREE.CylinderGeometry(D * 0.06, D * 0.06, w * 1.4, 20), steel()); hub.rotation.x = Math.PI / 2; for (let k = 0; k < 16; k++) { const t = (k / 16) * Math.PI * 2; g.add(strut(new THREE.Vector3(Math.cos(t) * D * 0.05, Math.sin(t) * D * 0.05, 0), new THREE.Vector3(Math.cos(t) * (D / 2 - w), Math.sin(t) * (D / 2 - w), 0), Math.max(D * 0.003, 0.0006), steel())); } break; }
    case 'fan': { const D = Math.min(x, y), t = z; add(new RoundedBoxGeometry(D, D, t, 2, D * 0.05)).scale.set(1, 1, 1); const hole = add(new THREE.CylinderGeometry(D * 0.46, D * 0.46, t * 1.02, 32), dark()); hole.rotation.x = Math.PI / 2; for (let k = 0; k < 7; k++) { const bl = add(new THREE.BoxGeometry(D * 0.36, D * 0.12, t * 0.2), mat); const a = (k / 7) * Math.PI * 2; bl.position.set(Math.cos(a) * D * 0.22, Math.sin(a) * D * 0.22, t * 0.55); bl.rotation.set(0.5, 0, a); } break; }
    case 'blade': { const D = across, t = z; const hub = add(new THREE.CylinderGeometry(D * 0.1, D * 0.1, t, 16)); hub.rotation.x = Math.PI / 2; for (let k = 0; k < 4; k++) { const bl = add(new THREE.BoxGeometry(D * 0.45, D * 0.1, t * 0.15)); const a = (k / 4) * Math.PI * 2; bl.position.set(Math.cos(a) * D * 0.25, Math.sin(a) * D * 0.25, 0); bl.rotation.set(k % 2 ? 0.5 : -0.5, 0, a); } break; }
    case 'loop': { const R = across / 2, t = add(new THREE.TorusGeometry(R, Math.max(z, R * 0.04) / 2, 8, 64)); t.scale.set(1.35, 0.6, 1); break; }
    case 'coil': { const w = Math.max(Math.min(x, y), 0.0015), R = Math.max(0.025, Math.min(0.12, Math.sqrt((axisLen * w) / 40))), n = 6, pts: THREE.Vector3[] = []; for (let k = 0; k <= n * 20; k++) { const t = (k / 20) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * R, (k / (n * 20) - 0.5) * w * n * 2.2, Math.sin(t) * R)); } add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 20, w / 2, 8, false)); break; }
    // boxes: x wide, y high, z deep
    case 'sheet': add(new RoundedBoxGeometry(x, y, z, 2, Math.min(x, y, z) * 0.2)); break;
    case 'board': { add(new THREE.BoxGeometry(x, Math.min(y, big * 0.03), z), greenBoard()); const n = Math.max(1, Math.min(5, Math.round((x * z) / (big * big * 0.15)))); for (let k = 0; k < n; k++) { const c = add(new THREE.BoxGeometry(x * 0.18, Math.max(y * 0.4, big * 0.02), z * 0.18), dark()); c.position.set(-x * 0.3 + (k / Math.max(1, n - 1)) * x * 0.6, Math.max(y * 0.4, big * 0.02) / 2 + Math.min(y, big * 0.03) / 2, (k % 2 ? 0.15 : -0.15) * z); } const hdr = add(new THREE.BoxGeometry(x * 0.8, big * 0.03, z * 0.06), dark()); hdr.position.set(0, big * 0.02, z * 0.44); break; }
    case 'chip': { add(new RoundedBoxGeometry(x, Math.max(z, Math.min(x, y) * 0.15), y, 1, Math.min(x, y) * 0.04), dark()); const n = Math.max(2, Math.min(14, Math.round((y / Math.max(x, y)) * 10))); for (let k = 0; k < n; k++) for (const sx of [-1, 1]) { const leg = add(new THREE.BoxGeometry(x * 0.12, z * 0.3, y / (n * 2.5)), steel()); leg.position.set((sx * x) / 2, -z * 0.2, -y / 2 + ((k + 0.5) / n) * y); } break; }
    case 'tslot': { const geo = l.mark === 'tslot' ? new THREE.ExtrudeGeometry(tslotShape(x, y), { depth: z, bevelEnabled: false }) : new THREE.BoxGeometry(x, y, z); if (l.mark === 'tslot') geo.translate(0, 0, -z / 2); add(geo); if (l.mark === 'fins') for (let k = -4; k <= 4; k++) { const f = add(new THREE.BoxGeometry(x * 0.03, y * 0.9, z)); f.position.set((k / 9) * x, y * 0.05, 0); } if (z > Math.max(x, y) * 2) g.rotation.y = Math.PI / 2; break; }
    case 'frame': { const r = Math.max(big * 0.012, Math.min(x, y, z) * 0.06), V = (a: number, b: number, c: number) => new THREE.Vector3(a, b, c);
      if (l.mark === 'tri') { const pts = [V(-x * 0.4, -y * 0.25, 0), V(x * 0.05, -y * 0.3, 0), V(x * 0.35, y * 0.35, 0), V(-x * 0.3, y * 0.3, 0)]; for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 1], [3, 0]] as const) g.add(strut(pts[a]!, pts[b]!, r, mat)); }
      else { const hx = x / 2, hy = y / 2, hz = z / 2, cs = [V(-hx, -hy, -hz), V(hx, -hy, -hz), V(hx, -hy, hz), V(-hx, -hy, hz), V(-hx, hy, -hz), V(hx, hy, -hz), V(hx, hy, hz), V(-hx, hy, hz)]; for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]] as const) g.add(strut(cs[a]!, cs[b]!, r, mat)); }
      break; }
    case 'vehicle': { const four = l.mark === 'four', D = Math.min(y * (four ? 0.45 : 0.62), x * 0.38), w = Math.max(z * 0.08, D * 0.08);
      for (const sx of [-1, 1]) for (const sz of four ? [-1, 1] : [0]) { const wh = meshOfLook({ kind: 'wheel', size: [D, D, w], finish: l.finish }, ghost); wh.position.set(sx * (x / 2 - D / 2), -y / 2 + D / 2, sz * (z / 2 - w)); g.add(wh); }
      if (four) { const body = add(new RoundedBoxGeometry(x * 0.95, y * 0.3, z * 0.8, 2, y * 0.05)); body.position.y = -y / 2 + D * 0.9; }
      else { const fr = meshOfLook({ kind: 'frame', size: [x * 0.6, y * 0.55, z * 0.2], finish: l.finish, mark: 'tri' }, ghost); fr.position.y = -y / 2 + D * 0.85; g.add(fr); const bar = add(new THREE.CylinderGeometry(w * 0.3, w * 0.3, z * 0.8, 10), steel()); bar.rotation.x = Math.PI / 2; bar.position.set(x * 0.28, y * 0.42, 0); }
      break; }
    case 'case': add(new RoundedBoxGeometry(x, y, z, 4, Math.min(x, y, z) * 0.25)); break;
    case 'ball': add(new THREE.SphereGeometry(across / 2, 24, 16)); break;
    case 'swatch': add(new RoundedBoxGeometry(x, y, z, 3, x * 0.12)); break;
    case 'atom': { const r = x / 2; add(new THREE.SphereGeometry(r, 24, 16)); for (let k = 0; k < 3; k++) { const o = add(new THREE.TorusGeometry(r * 1.6, r * 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: 0x80deea, transparent: true, opacity: ghost ? 0.1 : 0.6 })); o.rotation.set((k * Math.PI) / 3, (k * Math.PI) / 5, 0); } break; }
    default: add(new RoundedBoxGeometry(x, y, z, 2, Math.min(x, y, z) * 0.12));
  }
  return g;
}

interface Shown { /** in a hand, held */ held?: boolean; id: string; obj: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; tag: THREE.Sprite; delay: number; /** how far below its middle its name hangs */ drop: number; /** a build's own part: its geometry is the room's, not to be freed */ borrowed?: boolean }
const free = (o: THREE.Object3D) => o.traverse((x) => { const m = x as THREE.Mesh; if (!m.isMesh && !(x as THREE.LineSegments).isLineSegments) return; m.geometry?.dispose(); for (const mt of Array.isArray(m.material) ? m.material : [m.material]) mt?.dispose(); });
/** A source of parts to take apart: the inventory (by its plans), or a build's own parts (from where they stand). */
export interface BuildPiece { id: string; name: string; obj: THREE.Object3D; note: string }

export class Exploded {
  readonly group = new THREE.Group();
  private readonly stage = new THREE.Group();
  private wholeObj: THREE.Object3D | null = null;
  private shown: Shown[] = [];
  private trail: { id: string; name: string }[] = [];
  private mode: 'whole' | 'apart' = 'whole';
  private t0 = 0;
  private plan: Plan | null = null;
  private build: { name: string; pieces: BuildPiece[] } | null = null;
  readonly info = card(0.5, 0.3, 768);
  private readonly ring: THREE.Mesh;
  /** The chips under it: back up a level, put it away. */
  readonly chips: { mesh: THREE.Mesh; act: 'back' | 'close' | 'whole' }[] = [];
  get visible(): boolean { return this.group.visible; }
  get showing(): string | null { return this.plan?.id ?? (this.build ? `build:${this.build.name}` : null); }
  get path(): string { return this.trail.map((t) => t.name).join(' › '); }

  constructor(scene: THREE.Scene) {
    this.group.visible = false; this.group.add(this.stage); scene.add(this.group);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.166, 96), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = -0.3; this.group.add(this.ring);
    this.info.mesh.position.set(0.56, 0.08, 0.06); this.info.mesh.rotation.y = -0.4; this.group.add(this.info.mesh);
    (['back', 'whole', 'close'] as const).forEach((act, k) => { const c = card(0.12, 0.04, 384); c.draw('', [{ text: act === 'back' ? '‹ Back' : act === 'whole' ? '⟳ Whole / apart' : '✕ Close', size: 2.4 }], act === 'close' ? '#ff8a80' : '#4dd0e1'); c.mesh.position.set(0.44 + k * 0.125, -0.13, 0.1); c.mesh.rotation.y = -0.4; this.group.add(c.mesh); this.chips.push({ mesh: c.mesh, act }); });
  }
  /** Set it before you, a metre off at chest height, facing you. */
  place(eye: THREE.Vector3, forward: THREE.Vector3, far = 0.85, left = 0): void {
    const f = forward.clone(); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    this.group.position.copy(eye).addScaledVector(f, far).addScaledVector(new THREE.Vector3(f.z, 0, -f.x), left); this.group.position.y = Math.max(0.9, eye.y - 0.12);
    this.group.lookAt(eye.x, this.group.position.y, eye.z);
  }
  private clearStage(): void {
    this.release();
    for (const s of this.shown) { this.stage.remove(s.obj); if (!s.borrowed) free(s.obj); this.group.remove(s.tag); s.tag.material.map?.dispose(); s.tag.material.dispose(); }
    if (this.wholeObj) { this.stage.remove(this.wholeObj); free(this.wholeObj); }
    this.shown = []; this.wholeObj = null;
  }
  /** An item of the inventory, whole, then apart. */
  show(id: string, now: number, apart = true, fresh = true): string {
    const p = planOf(id, 0.22); if (!p) return `Nothing in the inventory called ${id}.`;
    this.clearStage(); this.build = null; this.plan = p;
    if (fresh) this.trail = [];
    this.trail.push({ id, name: p.name });
    this.wholeObj = meshOfLook(p.whole); this.stage.add(this.wholeObj);
    p.pieces.forEach((pc, k) => {
      const obj = meshOfLook(pc.look); obj.userData.piece = pc.id; obj.visible = false; this.stage.add(obj);
      const tag = label(pc.note.length > 52 ? `${pc.note.slice(0, 50)}…` : pc.note, 0.019); tag.visible = false; this.group.add(tag);
      this.shown.push({ id: pc.id, obj, from: new THREE.Vector3(...pc.whole), to: new THREE.Vector3(...pc.apart), tag, delay: k * 0.04, drop: (() => { const bb = new THREE.Box3().setFromObject(obj); return (bb.isEmpty() ? 0.03 : (bb.max.y - bb.min.y) / 2) + 0.016; })() });
    });
    this.mode = 'whole'; this.t0 = now; this.group.visible = true;
    if (apart && p.pieces.length) this.mode = 'apart';
    this.drawInfo();
    return p.says;
  }
  /** A build on the table, its parts as they stand, then each pushed out from its middle. */
  showBuild(name: string, pieces: BuildPiece[], now: number): string {
    this.clearStage(); this.plan = null; this.build = { name, pieces }; this.trail = [{ id: `build:${name}`, name }];
    const box = new THREE.Box3(); for (const p of pieces) { p.obj.updateMatrixWorld(true); box.expandByObject(p.obj); }
    const c = box.getCenter(new THREE.Vector3()), ext = Math.max(1e-3, ...box.getSize(new THREE.Vector3()).toArray()), k = 0.5 / ext;
    pieces.forEach((p, j) => {
      const obj = p.obj; obj.userData.piece = p.id;
      const at = obj.getWorldPosition(new THREE.Vector3()).sub(c).multiplyScalar(k);
      const wrap = new THREE.Group(); wrap.add(obj); obj.position.set(0, 0, 0); obj.scale.multiplyScalar(k); wrap.userData.piece = p.id; this.stage.add(wrap);
      const dir = at.lengthSq() > 1e-8 ? at.clone().normalize() : new THREE.Vector3(Math.cos(j), 0.3, Math.sin(j)).normalize();
      const tag = label(p.note.length > 40 ? `${p.note.slice(0, 38)}…` : p.note, 0.016); tag.visible = false; this.group.add(tag);
      const bb = new THREE.Box3().setFromObject(wrap);
      this.shown.push({ id: p.id, obj: wrap, from: at, to: at.clone().addScaledVector(dir, 0.16 + 0.18 * (at.length() / 0.21)), tag, delay: j * 0.02, drop: (bb.isEmpty() ? 0.03 : (bb.max.y - bb.min.y) / 2) + 0.016, borrowed: true });
    });
    this.mode = 'apart'; this.t0 = now; this.group.visible = true; this.drawInfo();
    return `${name}: ${pieces.length} parts, pushed out from where they stand. Point at one to open it.`;
  }
  /** Go into a part: its own parts round it (a build's part goes into the inventory if the inventory has it). */
  open(id: string, now: number): string { const i = INVENTORY.get(id); if (!i) return `${id} is a shape made here, not in the inventory: it has no parts inside.`; return this.show(id, now, true, false); }
  back(now: number): string {
    if (this.trail.length < 2) { this.close(); return 'Put away.'; }
    this.trail.pop(); const up = this.trail.pop()!;
    if (up.id.startsWith('build:') && this.build) { this.trail = []; return this.showBuild(this.build.name, this.build.pieces, now); }
    return this.show(up.id, now, true, false);
  }
  toggle(now: number): void { this.mode = this.mode === 'apart' ? 'whole' : 'apart'; this.t0 = now; this.drawInfo(); }
  close(): void { this.release(); this.clearStage(); this.plan = null; this.build = null; this.trail = []; this.group.visible = false; }
  /** What a ray points at: a part's id, a chip, or nothing. */
  pick(ray: THREE.Raycaster): { piece: string } | { chip: 'back' | 'close' | 'whole' } | null {
    if (!this.group.visible) return null;
    const chip = ray.intersectObjects(this.chips.map((c) => c.mesh), false)[0]; if (chip) return { chip: this.chips.find((c) => c.mesh === chip.object)!.act };
    const hits = ray.intersectObjects(this.shown.filter((s) => s.obj.visible).map((s) => s.obj), true);
    for (const h of hits) { let o: THREE.Object3D | null = h.object; while (o && !o.userData.piece) o = o.parent; if (o) return { piece: String(o.userData.piece) }; }
    return null;
  }
  /** A part taken in the hand: it leaves its place and goes with the hand, as it is, until let go. */
  grab(id: string, hand: THREE.Object3D): string | null {
    const s = this.shown.find((x) => x.id === id && x.obj.visible); if (!s) return null;
    this.release(); hand.attach(s.obj); s.held = true; s.tag.visible = false;
    const i = INVENTORY.get(id); return i ? `${i.name}${i.spec ? `: ${i.spec.replace(/ \(sizes: .*\)$/, '')}` : ''}` : id;
  }
  /** What is in the hand put back: it flies home to its place round the whole. */
  release(): void { for (const s of this.shown) if (s.held) { this.stage.attach(s.obj); s.held = false; } }
  get holding(): boolean { return this.shown.some((s) => s.held); }
  /** Where a part (or a chip) is in the room, for a test or a guide. */
  pointOf(id: string): THREE.Vector3 | null {
    const c = this.chips.find((x) => x.act === id); if (c) return c.mesh.getWorldPosition(new THREE.Vector3());
    const s = this.shown.find((x) => x.id === id); return s ? s.obj.getWorldPosition(new THREE.Vector3()) : null;
  }
  /** The parts shown now, by id. */
  ids(): string[] { return this.shown.map((s) => s.id); }
  distance(ray: THREE.Raycaster): number {
    if (!this.group.visible) return Infinity;
    const hit = ray.intersectObjects([...this.chips.map((c) => c.mesh), ...this.shown.filter((s) => s.obj.visible).map((s) => s.obj), ...(this.wholeObj ? [this.wholeObj] : [])], true)[0];
    return hit?.distance ?? Infinity;
  }
  update(now: number): void {
    if (!this.group.visible) return;
    const k = now - this.t0, apart = this.mode === 'apart';
    if (this.wholeObj) { this.wholeObj.rotation.y = now * 0.4; this.wholeObj.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'opacity' in m) { const ghost = apart ? 0.22 : 1; m.transparent = ghost < 1 || m.transparent; m.opacity += (ghost - m.opacity) * 0.15; m.depthWrite = m.opacity > 0.9; } }); }
    for (const s of this.shown) {
      if (s.held) continue;
      const u = ease((apart ? k - s.delay : 1.2 - k) / 1.1);
      s.obj.visible = this.build ? true : u > 0.02;
      const home = new THREE.Vector3().lerpVectors(s.from, s.to, u);
      if (s.obj.position.distanceToSquared(home) > 1e-6 && u >= 1) s.obj.position.lerp(home, 0.18); else s.obj.position.copy(home);
      if (!this.build) { s.obj.rotation.y = now * 0.3 + s.delay * 10; s.obj.rotation.x *= 0.85; s.obj.rotation.z *= 0.85; }
      s.tag.visible = apart && u > 0.95;
      s.tag.position.copy(s.obj.position).add(new THREE.Vector3(0, -s.drop, 0.02));
    }
  }
  private drawInfo(): void {
    const p = this.plan;
    if (this.build) { this.info.draw(this.build.name, [{ text: `${this.build.pieces.length} parts, apart from where they stand`, color: '#a5f3ff', size: 1 }, { text: 'Point at a part to open it; ⟳ puts it back together.', color: '#7fb3c8', size: 0.85 }], '#ffd740'); return; }
    if (!p) return;
    const i = INVENTORY.get(p.id)!;
    this.info.draw(p.name, [
      { text: this.path, color: '#7fb3c8', size: 0.75 },
      { text: p.says, color: '#e6fbff', size: 0.82 },
      ...(i.kind === 'element' ? [{ text: `${i.spec ?? ''} · ${i.says}`, color: '#ffe082', size: 0.8 }] : []),
      { text: p.deeper ? `${p.pieces.length} shown${p.more ? `, ${p.more} more not shown` : ''}: point at one to open it` : 'the bottom: everything comes down to elements like this', color: '#69f0ae', size: 0.82 },
    ], i.kind === 'element' ? '#b388ff' : i.kind === 'material' ? '#ffd740' : '#4dd0e1');
  }
}
