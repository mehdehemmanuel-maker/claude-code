// Windows in the room: every panel the forge brings up (the rounds, the laws, the flaws, the boards, …) is a window
// with a bar along its top, as a headset's windows are. Hold the trigger on the bar and move to carry it; push the stick
// forward or back while you hold it to send it further or bring it nearer; – puts it away to the phone's Windows app,
// ✕ closes it. Several stand open at once. A window opens off to the side of what is already open, not in your face,
// at a distance its size asks; Arrange lays every open one in an arc round you, the one you last used in the middle.

import * as THREE from 'three';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
export const BAR_H = 0.05;
type Act = 'move' | 'min' | 'close';
export type WinState = 'open' | 'min' | 'closed';
export interface WinSpec {
  id: string; title: string; obj: THREE.Object3D;
  /** A space you stand in (the execution arc, the causal space): no bar, and placed by its own rule. */
  space?: boolean;
  /** Placed by the forge rather than in a slot (where it lays itself out round you). */
  selfPlaced?: boolean;
}
interface Win { spec: WinSpec; bar: THREE.Mesh | null; g: CanvasRenderingContext2D | null; tex: THREE.CanvasTexture | null; w: number; state: WinState; moved: boolean; hits: { x0: number; x1: number; act: Act }[]; at: number }
export interface WinHost {
  /** Where the person's eyes are and which way they look: level in a headset (windows stand upright round you), the
   *  camera's own way on a screen (windows open where the view looks, tilted to face it). */
  eye(): { at: THREE.Vector3; fwd: THREE.Vector3; level: boolean };
  /** A window was minimised, restored or closed by its bar or the phone: the forge does what that panel needs. */
  changed(id: string, state: WinState): void;
}

/** A window's extent in its own frame, without its bar. */
function localBounds(obj: THREE.Object3D, skip: THREE.Object3D | null): THREE.Box3 {
  obj.updateMatrixWorld(true);
  const inv = obj.matrixWorld.clone().invert(), box = new THREE.Box3(), m = new THREE.Matrix4();
  obj.traverse((o) => {
    for (let x: THREE.Object3D | null = o; x; x = x.parent) { if (x === skip) return; if (x === obj) break; }
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined; if (!g || !(o instanceof THREE.Mesh)) return;
    if (!g.boundingBox) g.computeBoundingBox();
    box.union(g.boundingBox!.clone().applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
  });
  return box.isEmpty() ? new THREE.Box3(new THREE.Vector3(-0.3, -0.2, 0), new THREE.Vector3(0.3, 0.2, 0)) : box;
}
// round you in a headset; within the view on a screen, where you cannot turn your head
const SLOTS = [0, -40, 40, -75, 75, -110, 110, 150, -150].map((d) => (d * Math.PI) / 180), SCREEN = [0, -27, 27, -52, 52].map((d) => (d * Math.PI) / 180);
const slots = (level: boolean) => (level ? SLOTS : SCREEN);

export class Windows {
  private readonly wins = new Map<string, Win>();
  private grab: { id: string; dist: number; offset: THREE.Vector3 } | null = null;
  private clock = 0;
  constructor(private readonly host: WinHost) {}

  add(spec: WinSpec): void {
    let bar: THREE.Mesh | null = null, g: CanvasRenderingContext2D | null = null, tex: THREE.CanvasTexture | null = null, w = 0.4;
    if (!spec.space) {
      const b = localBounds(spec.obj, null); w = Math.max(0.3, Math.min(0.8, b.max.x - b.min.x));
      const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round((1024 * BAR_H) / w);
      g = c.getContext('2d')!; tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      bar = new THREE.Mesh(new THREE.PlaneGeometry(w, BAR_H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      bar.renderOrder = 17; bar.userData.windowBar = spec.id; bar.userData.fixOk = true;
      bar.position.set((b.min.x + b.max.x) / 2, b.max.y + 0.014 + BAR_H / 2, b.max.z + 0.003);
      spec.obj.add(bar);
    }
    const win: Win = { spec, bar, g, tex, w, state: 'closed', moved: false, hits: [], at: 0 };
    this.wins.set(spec.id, win); this.draw(win);
  }
  has(id: string): boolean { return this.wins.has(id); }
  state(id: string): WinState { return this.wins.get(id)?.state ?? 'closed'; }
  isOpen(id: string): boolean { return this.state(id) === 'open'; }
  /** Every window that is open or put away, the one used last first. */
  list(): { id: string; title: string; state: WinState }[] { return [...this.wins.values()].filter((w) => w.state !== 'closed').sort((a, b) => b.at - a.at).map((w) => ({ id: w.spec.id, title: w.spec.title, state: w.state })); }
  /** The window used last that is open, or null. */
  top(): string | null { return this.list().find((w) => w.state === 'open')?.id ?? null; }
  title(id: string, t: string): void { const w = this.wins.get(id); if (w && w.spec.title !== t) { w.spec.title = t; this.draw(w); } }

  /** Open it: where it was carried to, if that is still near you; else in the next free place round you. */
  open(id: string): void {
    const w = this.wins.get(id); if (!w) return;
    w.state = 'open'; w.at = ++this.clock;
    if (w.spec.space || w.spec.selfPlaced) return;
    // where you carried it, while that is near and not behind you; else the next free place
    const { at: eye, fwd } = this.host.eye(), to = w.spec.obj.getWorldPosition(new THREE.Vector3()).sub(eye);
    const near = to.length() < 3.2 && to.setY(0).normalize().dot(fwd) > -0.2;
    if (!(w.moved && near)) this.place(w, this.freeSlot(w));
  }
  /** In the middle, in front of you, nearer than the rest. */
  focus(id: string): void { const w = this.wins.get(id); if (!w) return; w.state = 'open'; w.at = ++this.clock; if (!w.spec.space && !w.spec.selfPlaced) this.place(w, 0); }
  min(id: string): void { const w = this.wins.get(id); if (!w || w.state !== 'open') return; w.state = 'min'; this.host.changed(id, 'min'); }
  restore(id: string): void { const w = this.wins.get(id); if (!w) return; this.open(id); this.host.changed(id, 'open'); }
  close(id: string): void { const w = this.wins.get(id); if (!w || w.state === 'closed') return; w.state = 'closed'; if (this.grab?.id === id) this.grab = null; this.host.changed(id, 'closed'); }
  closeAll(): void { for (const w of this.wins.values()) if (w.state !== 'closed') this.close(w.spec.id); }
  minAll(): void { for (const w of this.wins.values()) if (w.state === 'open' && !w.spec.space) this.min(w.spec.id); }
  /** Every open window in an arc round you: the one used last in the middle, the rest out to either side. */
  arrange(): void {
    const open = [...this.wins.values()].filter((w) => w.state === 'open' && !w.spec.space && !w.spec.selfPlaced).sort((a, b) => b.at - a.at);
    const n = slots(this.host.eye().level).length;
    open.forEach((w, i) => { w.moved = false; this.place(w, Math.min(i, n - 1)); });
  }

  private size(w: Win): { w: number; h: number; box: THREE.Box3 } { const box = localBounds(w.spec.obj, w.bar); return { w: box.max.x - box.min.x, h: box.max.y - box.min.y + BAR_H, box }; }
  /** How far away a window is put: a large one further, so all of it is in view; a small one at reading distance. */
  private distOf(ww: number, h: number, level: boolean): number { return Math.max(1.05, Math.min(1.9, 0.85 + 0.45 * Math.max(ww, h))) * (level ? 1 : 1.35); }
  /** The first place round you clear of every open window by their widths as you see them, not only their middles:
   *  a wide board takes the room of three small windows. Where none is clear, the one with the most room. */
  private freeSlot(w: Win): number {
    const { at: eye, fwd: f, level } = this.host.eye(), fwd = f.clone().setY(0).normalize();
    const angle = (v: THREE.Vector3) => Math.atan2(fwd.x * v.z - fwd.z * v.x, fwd.x * v.x + fwd.z * v.z);
    const taken = [...this.wins.values()].filter((o) => o !== w && o.state === 'open' && !o.spec.space && !o.spec.selfPlaced && seen(o.spec.obj)).map((o) => {
      const { w: ow, box } = this.size(o); o.spec.obj.updateMatrixWorld(true);
      const mid = box.getCenter(new THREE.Vector3()).applyMatrix4(o.spec.obj.matrixWorld).sub(eye).setY(0), dist = Math.max(0.3, mid.length());
      return { a: angle(mid.normalize()), half: Math.atan2(ow / 2, dist) };
    });
    const { w: ww, h } = this.size(w), mine = Math.atan2(ww / 2, this.distOf(ww, h, level));
    const room = (s: number) => Math.min(Infinity, ...taken.map((t) => Math.abs(Math.atan2(Math.sin(t.a - s), Math.cos(t.a - s))) - t.half - mine));
    const all = slots(level), i = all.findIndex((s) => room(s) > 0.03);
    if (i >= 0) return i;
    let best = 0; all.forEach((s, j) => { if (room(s) > room(all[best]!)) best = j; }); return best;
  }
  private place(w: Win, slot: number): void {
    const { at: eye, fwd, level } = this.host.eye(), { w: ww, h, box } = this.size(w), a = slots(level)[slot] ?? 0;
    const d = this.distOf(ww, h, level);
    // round you about the vertical, keeping how far up or down you look
    const dir = (level ? fwd.clone().setY(0) : fwd.clone()).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    const want = eye.clone().addScaledVector(dir, d).add(new THREE.Vector3(0, level ? -0.06 : 0, 0));
    const o = w.spec.obj; o.position.copy(want); if (level) o.lookAt(eye.x, want.y, eye.z); else o.lookAt(eye); o.updateMatrixWorld(true);
    // its middle where it should be, whatever its origin
    const mid = box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, BAR_H / 2, 0)).applyMatrix4(o.matrixWorld);
    o.position.add(want.clone().sub(mid)); o.updateMatrixWorld(true);
  }

  // ---- pointing at a bar -----------------------------------------------------------------------------------------------
  /** The nearest bar a ray hits, and what that part of it does. */
  barAt(ray: THREE.Raycaster): { id: string; act: Act; distance: number; point: THREE.Vector3 } | null {
    const bars = [...this.wins.values()].filter((w) => w.bar && w.state === 'open' && seen(w.spec.obj)).map((w) => w.bar!);
    const h = ray.intersectObjects(bars, false)[0]; if (!h?.uv) return null;
    const w = this.wins.get(h.object.userData.windowBar as string)!, x = h.uv.x * 1024;
    return { id: w.spec.id, act: w.hits.find((r) => x >= r.x0 && x <= r.x1)?.act ?? 'move', distance: h.distance, point: h.point.clone() };
  }
  /** A press on a bar: – or ✕ act, the rest of it takes hold to carry. */
  press(ray: THREE.Raycaster): boolean {
    const b = this.barAt(ray); if (!b) return false;
    const w = this.wins.get(b.id)!; w.at = ++this.clock;
    if (b.act === 'min') this.min(b.id);
    else if (b.act === 'close') this.close(b.id);
    else this.grab = { id: b.id, dist: b.point.distanceTo(ray.ray.origin), offset: w.spec.obj.position.clone().sub(b.point) };
    return true;
  }
  get holding(): string | null { return this.grab?.id ?? null; }
  /** While held: it follows the ray at the distance it was taken at, turned to face you. */
  move(ray: THREE.Raycaster): void {
    const g = this.grab; if (!g) return; const w = this.wins.get(g.id); if (!w) { this.grab = null; return; }
    const { at: eye } = this.host.eye(), p = ray.ray.origin.clone().addScaledVector(ray.ray.direction, g.dist).add(g.offset), o = w.spec.obj;
    o.position.copy(p); if (this.host.eye().level) o.lookAt(eye.x, p.y, eye.z); else o.lookAt(eye); w.moved = true;
  }
  /** The stick, while held: further away or nearer, between 40 cm and 4 m. */
  push(by: number): void { if (this.grab) this.grab.dist = Math.max(0.4, Math.min(4, this.grab.dist + by)); }
  release(): void { this.grab = null; }

  private draw(w: Win): void {
    const g = w.g; if (!g || !w.tex) return;
    const W = g.canvas.width, H = g.canvas.height; w.hits = [];
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(3,12,19,0.94)'; g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, H / 2); g.fill(); g.strokeStyle = 'rgba(128,222,234,0.7)'; g.lineWidth = 3; g.stroke();
    const bw = H * 1.25, pad = H * 0.18;
    // – and ✕, at the right end
    [['close', '✕', '#ffd740'], ['min', '–', '#80deea']].forEach(([act, t, col], i) => {
      const x1 = W - pad - i * (bw + pad), x0 = x1 - bw;
      g.fillStyle = 'rgba(77,208,225,0.14)'; g.beginPath(); g.roundRect(x0, pad, bw, H - pad * 2, (H - pad * 2) / 2); g.fill(); g.strokeStyle = col!; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#ffffff'; g.font = `600 ${H * 0.55}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t!, (x0 + x1) / 2, H / 2 + 1);
      w.hits.push({ x0, x1, act: act as Act });
    });
    // the grip and the title: hold anywhere here to carry it
    g.textAlign = 'left'; g.fillStyle = '#7fb3c8'; g.font = `600 ${H * 0.5}px ${FONT}`; g.fillText('⠿', pad * 2, H / 2 + 1);
    g.fillStyle = '#e6f7ff'; g.font = `600 ${H * 0.46}px ${FONT}`;
    let t = w.spec.title; const room = W - pad * 6 - (bw + pad) * 2 - H; while (t.length > 1 && g.measureText(t).width > room) t = `${t.slice(0, -2)}…`;
    g.fillText(t, pad * 2 + H * 0.7, H / 2 + 1);
    w.tex.needsUpdate = true;
  }
  /** Where a bar's part is in the room, for a test that points at it. */
  pointOf(id: string, act: Act): THREE.Vector3 | null {
    const w = this.wins.get(id); if (!w?.bar) return null;
    const r = act === 'move' ? { x0: 120, x1: 240 } : w.hits.find((h) => h.act === act); if (!r) return null;
    w.bar.updateMatrixWorld(); return w.bar.localToWorld(new THREE.Vector3(((r.x0 + r.x1) / 2 / 1024 - 0.5) * w.w, 0, 0.001));
  }
}
const seen = (o: THREE.Object3D) => { for (let x: THREE.Object3D | null = o; x; x = x.parent) if (!x.visible) return false; return true; };
