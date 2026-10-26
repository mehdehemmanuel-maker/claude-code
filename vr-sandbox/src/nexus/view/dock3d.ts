// The 3D view docked in the dashboard (view/index.html): what the board's "Show in space" nodes are given, drawn as the
// space draws it (space3d.ts: one instanced mesh per distinct piece, far things as their boxes), in a panel beside the
// board. Turn it, zoom it, press a thing to choose the node that shows it. Entered, it fills the page; the immersive
// space (view/space.html: any scale, a headset) is one press further.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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

  constructor(private readonly host: HTMLElement, private readonly picked: (key: string) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 0.95;
    host.appendChild(this.renderer.domElement); this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    this.scene.environment = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.6;
    this.scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x101820, 0.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(3, 6, 2); this.scene.add(sun);
    // depth at any scale: haze that thickens with distance, set from how big what is shown is (a car and a city each fade
    // at their own far edge), toward the colour of the sky behind
    this.scene.fog = new THREE.FogExp2(0x0a111c, 0.01);
    this.scene.add(this.view.group, this.grid);
    this.camera.position.set(6, 5, 8);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.zoomSpeed = 1.4;
    // a press that did not turn the view chooses what it lands on
    let down: [number, number] | null = null;
    this.renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    this.renderer.domElement.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4) this.pick(e); down = null; });
    new ResizeObserver(() => this.resize()).observe(host); this.resize();
    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  /** What to draw: the board's shown things. The first time anything is shown (or a new board), it is framed. */
  show(things: Shown[], board: string): void { this.view.show(things); if (board !== this.framed && things.length) { this.framed = board; requestAnimationFrame(() => this.fit()); } }
  /** The view turned to see everything shown, whole. */
  fit(): void {
    const b = this.view.bounds(); if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.05, b.getSize(new THREE.Vector3()).length() / 2);
    const d = r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.05, dir = new THREE.Vector3(0.75, 0.62, 1).normalize();
    this.controls.target.copy(c); this.camera.position.copy(c).addScaledVector(dir, d); this.camera.near = Math.max(1e-4, d / 1e4); this.camera.far = d * 100; this.camera.updateProjectionMatrix(); this.controls.update();
  }
  get canvas(): HTMLCanvasElement { return this.renderer.domElement; }
  /** The view put somewhere and turned to look at a point (a test's, or a bookmark's). */
  look(from: [number, number, number], at: [number, number, number]): void { this.controls.target.set(...at); this.camera.position.set(...from); this.controls.update(); }
  /** How long the last frames took to draw, ms (a moving mean). */
  frameMs = 0;

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
    this.controls.update(); this.layGrid();
    // the haze, and so the view's reach, follows how far off the view is: near, a street fades in a few hundred metres;
    // pulled back, a whole world can be seen (where it fades, nothing more is drawn: what makes no end affordable)
    const dist = this.camera.position.distanceTo(this.controls.target), fog = this.scene.fog as THREE.FogExp2;
    // and thick enough by where a world without end is cut off that its edge is never seen
    fog.density = Math.max(0.12 / Math.max(1e-6, dist), 2.6 / this.view.reach); this.view.range = 2 / fog.density; this.camera.far = Math.max(this.camera.far, this.view.range * 1.2); this.camera.near = Math.max(1e-5, dist / 5e4); this.camera.updateProjectionMatrix();
    this.view.update(this.camera, this.renderer.domElement.clientHeight || 300, now);
    const t0 = performance.now(); this.renderer.render(this.scene, this.camera); this.frameMs = 0.9 * this.frameMs + 0.1 * (performance.now() - t0); this.view.drawMs = this.frameMs;
  }
}
