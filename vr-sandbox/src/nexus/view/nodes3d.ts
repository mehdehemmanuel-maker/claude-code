// A part in 3D on a board of blocks (src/nexus/view/nodes.ts): drawn as the forge draws it (kitView, every piece of it,
// its holes drilled, its finish), lit as a part alone is lit in the part viewer (a bright room, so metal reads as metal),
// framed whole from three-quarters above. One renderer draws every 3D view on the board, each into its own picture, and
// only when what it shows, or how it is turned, changes; and full screen, to be turned, zoomed and taken apart by hand.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { kitView, type KitView } from './kit3d';
import { massOf } from '../mass';
import type { Part } from '../kits';

let renderer: THREE.WebGLRenderer | null = null, env: THREE.Texture | null = null;
function gl(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  return renderer;
}
interface Staged { scene: THREE.Scene; view: KitView; radius: number; centre: THREE.Vector3; explode: number }
/** Framed on what is drawn as it now stands: taken apart, it is bigger. */
function frame(s: Staged): void { const sp = drawnBox(s.view.group).getBoundingSphere(new THREE.Sphere()); s.radius = Math.max(1e-4, sp.radius); s.centre.copy(sp.center); }
/** The box round what is drawn of the part itself, not the shadow laid under it. */
function drawnBox(o: THREE.Object3D): THREE.Box3 { o.updateMatrixWorld(true); const b = new THREE.Box3(); o.traverse((x) => { if ((x as THREE.Mesh).isMesh && !x.userData.decor && !x.parent?.userData.decor) b.expandByObject(x); }); return b.isEmpty() ? new THREE.Box3().setFromObject(o) : b; }
const staged = new WeakMap<Part, Staged>();
function stage(part: Part, explode: number): Staged {
  let s = staged.get(part);
  if (!s) {
    gl(); const scene = new THREE.Scene(); scene.environment = env;
    const view = kitView(part, { maxLights: 2 }); scene.add(view.group);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(2, 4, 3); scene.add(sun); scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x20242c, 0.5));
    const sphere = drawnBox(view.group).getBoundingSphere(new THREE.Sphere());
    s = { scene, view, radius: Math.max(1e-4, sphere.radius), centre: sphere.center.clone(), explode: 0 }; staged.set(part, s);
  }
  if (s.explode !== explode) { s.view.explode(explode); s.explode = explode; frame(s); }
  return s;
}
const camera = new THREE.PerspectiveCamera(32, 1, 0.0001, 1000);
function aim(cam: THREE.PerspectiveCamera, s: Staged, yaw: number, pitch: number, zoom = 1): void {
  const d = (s.radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2))) * 1.05 * zoom;
  cam.position.set(s.centre.x + d * Math.cos(pitch) * Math.sin(yaw), s.centre.y + d * Math.sin(pitch), s.centre.z + d * Math.cos(pitch) * Math.cos(yaw));
  cam.near = d / 200; cam.far = d * 20; cam.lookAt(s.centre); cam.updateProjectionMatrix();
}

/** Each 3D view's picture, kept until what it shows or how it is turned changes. */
const shots = new Map<string, { key: string; canvas: HTMLCanvasElement; part: Part }>();
/** The picture of a part turned so, at a size in CSS pixels. Throws where WebGL cannot be had. */
export function shot(id: string, part: Part, o: { yaw: number; pitch: number; explode: number; w: number; h: number; dpr: number }): HTMLCanvasElement {
  const W = Math.round(o.w * o.dpr), H = Math.round(o.h * o.dpr), key = `${o.yaw.toFixed(3)},${o.pitch.toFixed(3)},${o.explode},${W}x${H}`;
  const kept = shots.get(id);
  if (kept && kept.key === key && kept.part === part) return kept.canvas;
  const r = gl(), s = stage(part, o.explode);
  r.setPixelRatio(1); r.setSize(W, H, false); r.setClearColor(0x000000, 0);
  camera.aspect = W / H; aim(camera, s, o.yaw, o.pitch); r.render(s.scene, camera);
  const c = kept?.canvas ?? document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!; g.clearRect(0, 0, W, H); g.drawImage(r.domElement, 0, 0);
  const out = { key, canvas: c, part }; shots.set(id, out); return c;
}

/** The part full screen: turned and zoomed by hand, taken apart by a slider, with what it is. Closes on Esc or ✕. */
export function fullScreen(part: Part, name: string, check: string): void {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.setClearColor(0x000000, 0);
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:50;background:radial-gradient(circle at 50% 40%,#2a3445,#07090d);display:flex;flex-direction:column';
  const count = (q: Part): number => (q.parts?.length ? q.parts.reduce((t, x) => t + count(x), 0) : 1);
  wrap.innerHTML = `<div style="display:flex;gap:14px;align-items:center;padding:10px 16px;background:#0b1018cc;border-bottom:1px solid #1f2a3a;flex-wrap:wrap">
    <b style="font-size:15px">${esc(name)}</b><span style="color:#8796aa">${(massOf(part) * 1000).toPrecision(4)} g · ${count(part)} pieces · ${esc(check)}</span>
    <label style="margin-left:auto;color:#b8c6d8">Take apart <input id="x3" type="range" min="0" max="4" step="1" value="0" style="vertical-align:middle"></label>
    <button id="c3">✕ Close</button></div>`;
  wrap.appendChild(r.domElement); r.domElement.style.cssText = 'flex:1;min-height:0;width:100%;touch-action:none';
  document.body.appendChild(wrap);
  // its room's light made by its own renderer: a texture belongs to the context that made it
  const s = stage(part, 0), own = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture, was = s.scene.environment; s.scene.environment = own;
  const cam = new THREE.PerspectiveCamera(32, 1, 0.0001, 1000), ctl = new OrbitControls(cam, r.domElement);
  aim(cam, s, 0.7, 0.42); ctl.target.copy(s.centre); ctl.enableDamping = true; ctl.update();
  let live = true;
  const size = () => { const w = r.domElement.clientWidth, h = r.domElement.clientHeight; r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
  const tick = () => { if (!live) return; size(); ctl.update(); r.render(s.scene, cam); requestAnimationFrame(tick); };
  const close = () => { live = false; s.scene.environment = was; own.dispose(); s.view.explode(0); s.explode = 0; frame(s); shots.clear(); ctl.dispose(); r.dispose(); wrap.remove(); window.removeEventListener('keydown', key); };
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  window.addEventListener('keydown', key, true);
  (wrap.querySelector('#c3') as HTMLButtonElement).onclick = close;
  (wrap.querySelector('#x3') as HTMLInputElement).oninput = (e) => { const v = Number((e.target as HTMLInputElement).value); s.view.explode(v); s.explode = v; frame(s); ctl.target.copy(s.centre); };
  requestAnimationFrame(tick);
}
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
