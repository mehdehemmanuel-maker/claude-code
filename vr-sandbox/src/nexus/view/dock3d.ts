// The 3D view docked in the dashboard (view/index.html): what the board's "Show in space" nodes are given, drawn as the
// space draws it (space3d.ts: one instanced mesh per distinct piece, far things as their boxes), in a panel beside the
// board. Turn it, zoom it, press a thing to choose the node that shows it. Entered, it fills the page; the immersive
// space (view/space.html: any scale, a headset) is one press further.

import * as THREE from 'three';
import { studioScene } from './kit3d';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SpaceView, type Shown } from './space3d';

export class Dock3D {
  readonly view = new SpaceView();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2e5);
  private readonly controls: OrbitControls;
  private readonly grid = new THREE.Group();
  private gridCell = 0; private framed = '';
  private readonly ray = new THREE.Raycaster();
  private readonly sun = new THREE.DirectionalLight(0xffffff, 1.4);
  private readonly catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.38, depthWrite: false }));

  constructor(private readonly host: HTMLElement, private readonly picked: (key: string) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.localClippingEnabled = true;
    host.appendChild(this.renderer.domElement); this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    this.scene.environment = new THREE.PMREMGenerator(this.renderer).fromScene(studioScene(), 0.02).texture; this.scene.environmentIntensity = 0.75;
    this.scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x101820, 0.4));
    // the sun: high and to one side, casting shadows onto what is under it and onto the ground (a plane that shows only
    // the shadows on it), both sized each frame by how far off the view is, so a bolt and a truck are each lit alike
    const sun = this.sun; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; this.scene.add(sun, sun.target);
    this.catcher.rotation.x = -Math.PI / 2; this.catcher.receiveShadow = true; this.catcher.renderOrder = -1; this.scene.add(this.catcher);
    // depth at any scale: haze that thickens with distance, set from how big what is shown is (a car and a city each fade
    // at their own far edge), toward the colour of the sky behind
    this.scene.fog = new THREE.FogExp2(0x0a111c, 0.01);
    this.scene.add(this.view.group, this.grid);
    this.camera.position.set(6, 5, 8);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.zoomSpeed = 1.4;
    // (the wheel zooms toward what is under the pointer, so a valve's keeper is reached by pointing at it and turning)
    this.controls.zoomToCursor = true;
    // (a double press on any piece flies the view to it, framed close: a bolt in a truck, a gate in a chip)
    this.renderer.domElement.addEventListener('dblclick', (e) => { const h = this.hitAt(e.clientX, e.clientY); if (h) { this.frameBox(h.box); this.lastPiece = h.name; } });
    // a press that did not turn the view chooses what it lands on
    let down: [number, number] | null = null;
    this.renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    this.renderer.domElement.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4) this.pick(e); down = null; });
    new ResizeObserver(() => this.resize()).observe(host); this.resize();
    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  /** What to draw: the board's shown things. The first time anything is shown (or a new board), it is framed. */
  show(things: Shown[], board: string): void { this.view.show(things); if (board !== this.framed && things.length) { this.framed = board; requestAnimationFrame(() => this.fit()); } }
  /** A cutaway: what is shown cut by a plane square to an axis, through its middle (or `at` along that axis), the half
   *  toward the viewer taken away, so its insides show (its castings' cores, its crank in its bearings); null puts it whole
   *  again. Says the axis it cuts across, if any. */
  section(axis: 'x' | 'y' | 'z' | null, at?: number): 'x' | 'y' | 'z' | null {
    this.cut = null; if (axis) { const b = new THREE.Box3().setFromObject(this.view.group), c = b.isEmpty() ? new THREE.Vector3() : b.getCenter(new THREE.Vector3()), k = { x: 0, y: 1, z: 2 }[axis];
      const n = new THREE.Vector3().setComponent(k, -1), p = c.clone(); if (at !== undefined) p.setComponent(k, at);
      // (the half nearer the camera is the half taken away)
      if (this.camera.position.getComponent(k) < p.getComponent(k)) n.negate();
      this.cut = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p); }
    this.cutAxis = axis; this.clipAll(); return axis;
  }
  /** Turns the cutaway on round its axes: none, across x, across z, across y, none. */
  nextSection(): 'x' | 'y' | 'z' | null { const order: ('x' | 'y' | 'z' | null)[] = [null, 'x', 'z', 'y']; return this.section(order[(order.indexOf(this.cutAxis) + 1) % order.length]!); }
  private cut: THREE.Plane | null = null; private cutAxis: 'x' | 'y' | 'z' | null = null;
  // (every material of what is shown clipped by it, its inside faces drawn too so a cut solid shows its wall; set again as
  // the view makes meshes anew)
  private clipAll(): void { const planes = this.cut ? [this.cut] : null; this.view.group.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined; if (!m) return; for (const x of Array.isArray(m) ? m : [m]) if (x.clippingPlanes !== planes) { x.clippingPlanes = planes; x.clipShadows = true; if (planes) { x.userData.side ??= x.side; x.side = THREE.DoubleSide; } else if (x.userData.side !== undefined) x.side = x.userData.side; x.needsUpdate = true; } }); }
  /** The view turned to see everything shown, whole. */
  fit(): void {
    const b = this.view.bounds(); if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.05, b.getSize(new THREE.Vector3()).length() / 2);
    const d = r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.05, dir = new THREE.Vector3(0.75, 0.62, 1).normalize();
    this.controls.target.copy(c); this.camera.position.copy(c).addScaledVector(dir, d); this.camera.near = Math.max(1e-12, d / 1e4); this.camera.far = d * 100; this.camera.updateProjectionMatrix(); this.controls.update();
  }
  get canvas(): HTMLCanvasElement { return this.renderer.domElement; }
  /** The view put somewhere and turned to look at a point (a test's, or a bookmark's). */
  look(from: [number, number, number], at: [number, number, number]): void { this.controls.target.set(...at); this.camera.position.set(...from); this.controls.update(); }
  /** The view flown to frame the pieces named like `re` (every one that matches, together), as close as shows them
   *  whole: how a test, a bookmark or the command bar zooms into a part. Says how many it framed. */
  focus(re: RegExp): number { const { box, n } = this.view.piecesNamed(re); if (n) this.frameBox(box); return n; }
  /** The name of the piece last flown to (a double press on it). */
  lastPiece = '';
  /** The view turned and moved to see a box whole, from the side it is looked at now. */
  frameBox(b: THREE.Box3): void {
    if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(1e-6, b.getSize(new THREE.Vector3()).length() / 2), d = (r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.15;
    const dir = this.camera.position.clone().sub(this.controls.target); if (dir.lengthSq() < 1e-20) dir.set(0.75, 0.62, 1); dir.normalize();
    this.controls.target.copy(c); this.camera.position.copy(c).addScaledVector(dir, d); this.camera.near = Math.max(1e-12, d / 1e4); this.camera.far = d * 1e4; this.camera.updateProjectionMatrix(); this.controls.update();
  }
  private hitAt(x: number, y: number): { name: string; box: THREE.Box3 } | null {
    const r = this.renderer.domElement.getBoundingClientRect(), ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera); return this.view.pieceAt(this.ray);
  }
  /** How long the last frames took to draw, ms (a moving mean). */
  frameMs = 0;

  /** The sun and its shadows fitted round what is looked at: its shadow's box as wide as the view, the ground under what
   *  is shown. Below a few centimetres off, no shadows: a GPU's 32-bit positions cannot place a shadow at those scales
   *  away from the world's middle, and the light there would not be a sun's anyway. */
  private light(dist: number): void {
    const t = this.controls.target, on = dist > 0.03, sh = this.sun.shadow.camera, r = dist * 1.3, b = this.view.bounds();
    this.sun.castShadow = on; this.catcher.visible = on && !b.isEmpty();
    if (!on) return;
    this.sun.position.set(t.x + dist * 0.9, t.y + dist * 2.2, t.z + dist * 0.6); this.sun.target.position.copy(t); this.sun.target.updateMatrixWorld();
    sh.left = -r; sh.right = r; sh.top = r; sh.bottom = -r; sh.near = dist * 0.05; sh.far = dist * 6; sh.updateProjectionMatrix(); this.sun.shadow.normalBias = dist * 0.002;
    if (!b.isEmpty()) { this.catcher.position.set(t.x, b.min.y + dist * 1e-4, t.z); this.catcher.scale.set(dist * 12, dist * 12, 1); }
  }
  private resize(): void { const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private pick(e: PointerEvent): void {
    const r = this.renderer.domElement.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera); const hit = this.view.pick(this.ray); if (hit) this.picked(hit.key);
  }
  /** The ground's grid: cells a decade at a time, by how far the view is from what it looks at. */
  private layGrid(): void {
    const dist = this.camera.position.distanceTo(this.controls.target), cell = 10 ** Math.floor(Math.log10(Math.max(1e-6, dist / 4)));
    if (cell === this.gridCell) return; this.gridCell = cell;
    for (const c of [...this.grid.children]) { this.grid.remove(c); ((c as THREE.LineSegments).geometry as THREE.BufferGeometry).dispose(); }
    const minor = new THREE.GridHelper(cell * 100, 100, 0x1d2b3f, 0x16202e), major = new THREE.GridHelper(cell * 100, 10, 0x2f4a6a, 0x2f4a6a);
    for (const g of [minor, major]) { (g.material as THREE.Material).transparent = true; (g.material as THREE.Material).opacity = g === minor ? 0.55 : 0.8; (g.material as THREE.Material).depthWrite = false; this.grid.add(g); }
  }
  private frame(now: number): void {
    if (!this.host.offsetParent && this.host.clientWidth === 0) return;
    this.controls.update(); this.layGrid(); if (this.cut) this.clipAll();
    // the haze, and so the view's reach, follows how far off the view is: near, a street fades in a few hundred metres;
    // pulled back, a whole world can be seen (where it fades, nothing more is drawn: what makes no end affordable)
    const dist = this.camera.position.distanceTo(this.controls.target), fog = this.scene.fog as THREE.FogExp2;
    // and thick enough by where a world without end is cut off that its edge is never seen
    fog.density = Math.max(0.12 / Math.max(1e-6, dist), 2.6 / this.view.reach); this.view.range = 2 / fog.density; this.camera.far = Math.max(this.camera.far, this.view.range * 1.2); this.camera.near = Math.max(1e-12, dist / 5e4); this.camera.updateProjectionMatrix();
    this.light(dist);
    this.view.update(this.camera, this.renderer.domElement.clientHeight || 300, now);
    const t0 = performance.now(); this.renderer.render(this.scene, this.camera); this.frameMs = 0.9 * this.frameMs + 0.1 * (performance.now() - t0); this.view.drawMs = this.frameMs;
  }
}
