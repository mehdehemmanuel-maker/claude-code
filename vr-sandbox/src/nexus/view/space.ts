// The space: nothing but what you make, in x, y and z, at any scale and through time, with the panels you make it with
// floating where you can reach them. No room, no floor, no robot: a dark field, a grid of cells on the ground plane (and
// on the upright planes when asked), the three axes coloured x red, y green, z blue, and what every "Show in space" node
// on the board is given (src/nexus/view/space3d.ts).
//
// S, scale: you stay your own size and the world is scaled round you, so zooming from a bolt to a city never takes the
// camera kilometres off (which a screen's depth and a headset's comfort both dislike): a cell of the grid is always a
// few centimetres where you see it, and it says what it is (1 µm, 1 mm, 1 m, 1 km), a decade at a time. T, time: the
// board's clock (played, what moves runs: traffic, signals), or its history run back and forward. Entered from the
// dashboard (view/index.html), and back to it.
//
// The board of blocks (src/nexus/view/nodes.ts, the same board as its page) is the main panel, with its strip and its
// chosen block's inputs (src/nexus/view/nodes-wall.ts); the space bar holds S and T; chat sends to Claude Code. On a
// screen the panels ride with the view and the mouse presses them; in a headset they stand before you and a hand's ray
// presses them, the right stick zooms S, the left stick carries you.

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { NodesWall } from './nodes-wall';
import { wall } from './nodes';
import { SpaceView, type Shown } from './space3d';
import { Keyboard } from './keyboard';
import { makeRelay, type Relay } from './relay';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
// ?emulate: an emulated Quest 3 (Meta's IWER), so a browser test can put on the headset, aim a hand and pull its trigger
type Emulated = { position: { set(x: number, y: number, z: number): void }; quaternion: { set(x: number, y: number, z: number, w: number): void }; controllers: Record<'left' | 'right', { position: { set(x: number, y: number, z: number): void }; quaternion: { set(x: number, y: number, z: number, w: number): void }; updateButtonValue(id: string, v: number): void; updateAxes(id: string, x: number, y: number): void }> };
let emulated: Emulated | null = null;
if (new URLSearchParams(location.search).has('emulate')) { const { XRDevice, metaQuest3 } = await import('iwer'); const d = new XRDevice(metaQuest3); d.installRuntime({ forceInstall: true }); emulated = d as unknown as Emulated; }

// ---- the renderer and the field --------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070b);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; renderer.toneMappingExposure = 0.95;
scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x101820, 0.35));
{ const sun = new THREE.DirectionalLight(0xfff4e0, 1.6); sun.position.set(3, 6, 4); scene.add(sun); const back = new THREE.DirectionalLight(0x9ec3ff, 0.35); back.position.set(-4, 2, -3); scene.add(back); }
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 2e5);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
camera.position.set(0, 1.55, 2.3);
const orbit = new OrbitControls(camera, renderer.domElement); orbit.target.set(0, 1.0, 0); orbit.enableZoom = false; orbit.enableDamping = true; orbit.update();

/** The world: the grid and what is made, scaled round you. Its scale is S: a metre of the world is S metres where you see it. */
const world = new THREE.Group(); scene.add(world);
const view = new SpaceView(); world.add(view.group);
const S = () => world.scale.x;
/** S changed by a factor, about a point where you see it (it stays where it is). */
function zoomAbout(f: number, at: THREE.Vector3): void {
  const s = Math.min(1e6, Math.max(1e-6, S() * f)), k = s / S();
  world.position.sub(at).multiplyScalar(k).add(at); world.scale.setScalar(s); grid.dirty = true;
}
/** Everything shown, framed before you: its middle at the point you turn about, its largest side a metre and a bit. */
function fit(): void {
  const b = view.bounds(); if (b.isEmpty()) { world.scale.setScalar(1); world.position.copy(pivot()).sub(new THREE.Vector3(0, 0, 0)); grid.dirty = true; return; }
  // on a screen with the board up beside it, framed in the open part of the view, left of the board
  const open = !renderer.xr.isPresenting && panelsShown && !boardBig, c = b.getCenter(new THREE.Vector3()), size = Math.max(...b.getSize(new THREE.Vector3()).toArray(), 1e-6), s = (open ? 0.75 : 1.3) / size;
  const at = pivot(); if (open) at.add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(-0.85));
  world.scale.setScalar(s); world.position.copy(at).sub(c.multiplyScalar(s)); grid.dirty = true;
}
/** S set so a cell is a decade: µm, mm, m or km, about the point you turn about. */
function jump(cell: number): void { zoomAbout(0.04 / cell / S(), pivot()); }
/** A point of the world brought to where you turn about, with a cell of the grid this long. */
function focusOn(p: THREE.Vector3, cell = grid.cell || 1): void { const s = 0.04 / cell; world.scale.setScalar(s); world.position.copy(pivot()).sub(p.clone().multiplyScalar(s)); grid.dirty = true; }
const pivot = () => (renderer.xr.isPresenting ? xrPivot.clone() : orbit.target.clone());
const xrPivot = new THREE.Vector3(0, 1.0, -0.8);

// ---- the grid: cells a decade at a time, the axes, their marks ---------------------------------------------------------
const grid = { group: new THREE.Group(), cell: 0, centre: new THREE.Vector3(Infinity, 0, 0), dirty: true, planes: { xz: true, xy: false, yz: false } };
world.add(grid.group);
const lineMat = (c: number, o: number) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
const NAMES: [number, string][] = [[1e3, 'km'], [1, 'm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm']];
/** A length as it is said: 1 km, 10 m, 100 µm. */
export function lengthSaid(x: number): string { for (const [k, u] of NAMES) if (Math.abs(x) >= k * 0.999) return `${Number((x / k).toPrecision(3))} ${u}`; return `${x.toExponential(1)} m`; }
function label(text: string, colour: string): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d')!;
  g.font = `600 34px ${FONT}`; g.fillStyle = colour; g.textBaseline = 'middle'; g.fillText(text, 6, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.userData.label = true; return s;
}
/** The grid laid again where the decade changed, or you went past a major cell: centred on the point you look at. */
function layGrid(): void {
  const s = S(), cell = 10 ** Math.floor(Math.log10(0.1 / s)), focus = world.worldToLocal(pivot());
  const major = cell * 10, centre = new THREE.Vector3(Math.round(focus.x / major) * major, 0, Math.round(focus.z / major) * major);
  if (!grid.dirty && cell === grid.cell && centre.distanceTo(grid.centre) < major * 0.5) return;
  grid.dirty = false; grid.cell = cell; grid.centre.copy(centre);
  for (const o of [...grid.group.children]) { grid.group.remove(o); (o as THREE.Mesh).geometry?.dispose(); }
  const shown = cell * s, fade = Math.min(1, Math.max(0, (shown - 0.01) / 0.03)), N = 40;
  /** One plane of lines spanned by axes u and v (the third axis at its zero), `step` apart, n each way of the centre. */
  const plane = (u: 0 | 1 | 2, v: 0 | 1 | 2, step: number, n: number, o: number, c: number) => {
    const cen = [centre.x, 0, centre.z], pts: number[] = [];
    for (let i = -n; i <= n; i++) for (const [a, b] of [[u, v], [v, u]] as const) {
      const p = [0, 0, 0], q = [0, 0, 0]; p[a] = q[a] = cen[a]! + i * step; p[b] = cen[b]! - n * step; q[b] = cen[b]! + n * step; pts.push(...p, ...q);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); grid.group.add(new THREE.LineSegments(geo, lineMat(c, o)));
  };
  const each = (a: 0 | 1 | 2, b: 0 | 1 | 2) => { plane(a, b, cell, N, 0.22 * fade, 0x3b4a5e); plane(a, b, major, N / 10 + 4, 0.45, 0x5a6f88); };
  if (grid.planes.xz) each(0, 2); if (grid.planes.xy) each(0, 1); if (grid.planes.yz) each(1, 2);
  // the axes through the origin, long; x red, y green, z blue
  const L = major * 2000;
  for (const [d, c] of [[[1, 0, 0], 0xff5252], [[0, 1, 0], 0x69f0ae], [[0, 0, 1], 0x448aff]] as [number[], number][]) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-L * d[0]!, -L * d[1]!, -L * d[2]!, L * d[0]!, L * d[1]!, L * d[2]!], 3)); grid.group.add(new THREE.LineSegments(geo, lineMat(c, 0.85)));
  }
  // marks every major cell along x and z near where you look, and the names of the axes
  const k = 0.03 / s;
  for (let i = -4; i <= 4; i++) {
    if (!i) continue;
    for (const [axis, col] of [['x', '#ff8a80'], ['z', '#82b1ff']] as const) {
      const v = (axis === 'x' ? centre.x : centre.z) + i * major, l = label(lengthSaid(v), col); l.scale.set(k * 4, k, 1);
      l.position.set(axis === 'x' ? v : 0, k * 0.6, axis === 'z' ? v : 0); grid.group.add(l);
    }
  }
  for (const [name, col, at] of [['x', '#ff5252', [major * 5, 0, 0]], ['y', '#69f0ae', [0, major * 5, 0]], ['z', '#448aff', [0, 0, major * 5]]] as [string, string, number[]][]) { const l = label(name, col); l.scale.set(k * 4, k, 1); l.position.set(at[0]!, at[1]!, at[2]!); grid.group.add(l); }
  bar.draw();
}

// ---- panels -----------------------------------------------------------------------------------------------------------
interface Hit { x0: number; y0: number; x1: number; y1: number; act: (x: number) => void }
/** A flat panel drawn on a canvas, pressed where its buttons are. */
class Panel {
  readonly mesh: THREE.Mesh; readonly c = document.createElement('canvas'); readonly g: CanvasRenderingContext2D; readonly tex: THREE.CanvasTexture; hits: Hit[] = [];
  constructor(readonly w: number, readonly h: number, readonly px: number, private readonly paint: (p: Panel) => void) {
    this.c.width = px; this.c.height = Math.round((px * h) / w); this.g = this.c.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true }));
  }
  draw(): void { this.hits = []; this.g.clearRect(0, 0, this.c.width, this.c.height); this.paint(this); this.tex.needsUpdate = true; }
  press(uv: THREE.Vector2): void { const x = uv.x * this.c.width, y = (1 - uv.y) * this.c.height; this.hits.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)?.act(x); }
  button(label: string, x: number, y: number, w: number, h: number, act: () => void, on = false): void {
    const g = this.g; g.fillStyle = on ? '#12324a' : '#162132'; round(g, x, y, w, h, 12); g.fill(); if (on) { g.strokeStyle = '#40c4ff'; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = '#e6eef8'; g.font = `600 ${Math.round(h * 0.42)}px ${FONT}`; g.textBaseline = 'middle'; const tw = g.measureText(label).width; g.fillText(label, x + (w - tw) / 2, y + h / 2);
    this.hits.push({ x0: x, y0: y, x1: x + w, y1: y + h, act });
  }
}
function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

let tMode: 'auto' | 'clock' | 'history' = 'auto';
/** The space bar: S (what a cell is, the decades to jump to, fit), the planes of the grid, T (the clock, or the board's history), and
 *  what is drawn. */
const bar = new Panel(1.7, 0.1, 2400, (p) => {
  const g = p.g, H = p.c.height; g.fillStyle = '#0b1220ee'; round(g, 0, 0, p.c.width, H, 24); g.fill();
  g.textBaseline = 'middle'; g.font = `700 22px ${FONT}`; g.fillStyle = '#ffd740'; g.fillText('S · SCALE', 24, H / 2 - 18);
  g.font = `600 28px ${FONT}`; g.fillStyle = '#e6eef8'; g.fillText(`1 cell = ${lengthSaid(grid.cell || 1)}`, 24, H / 2 + 16);
  let x = 300; for (const [name, cell] of [['µm', 1e-6], ['mm', 1e-3], ['m', 1], ['km', 1e3]] as const) { p.button(name, x, 22, 84, H - 44, () => { jump(cell); }, Math.abs(Math.log10((grid.cell || 1) / cell)) < 0.5); x += 92; }
  p.button('Fit', x, 22, 90, H - 44, fit); x += 100; p.button('Board', x, 22, 110, H - 44, () => { boardBig = !boardBig; layPanels(); }, boardBig); x += 130;
  for (const k of ['xz', 'xy', 'yz'] as const) { p.button(k.toUpperCase(), x, 22, 84, H - 44, () => { grid.planes[k] = !grid.planes[k]; grid.dirty = true; }, grid.planes[k]); x += 92; }
  x += 22; g.font = `700 22px ${FONT}`; g.fillStyle = '#69f0ae'; g.fillText('T · TIME', x, H / 2 - 18);
  // T is the clock (what moves: traffic, signals) or the board's history; the clock first when anything moves with it
  const ck = wall.clock(), clockMode = tMode === 'clock' || (tMode === 'auto' && ck.moves);
  p.button(clockMode ? 'clock' : 'history', x - 4, H / 2 + 2, 104, 34, () => { tMode = clockMode ? 'history' : 'clock'; bar.draw(); }); x += 112;
  const tx = x, tw = 470, sx = tx + 84, sw = tw - 170;
  const slide = (f: number, act: (f: number) => void) => {
    g.fillStyle = '#1c2a3d'; round(g, sx, H / 2 - 8, sw, 16, 8); g.fill(); g.fillStyle = '#69f0ae'; round(g, sx, H / 2 - 8, Math.max(16, sw * f), 16, 8); g.fill();
    g.beginPath(); g.arc(sx + sw * f, H / 2, 16, 0, Math.PI * 2); g.fill();
    p.hits.push({ x0: sx - 10, y0: 0, x1: sx + sw + 10, y1: H, act: (px) => act(Math.max(0, Math.min(1, (px - sx) / sw))) });
  };
  if (clockMode) {
    p.button(ck.playing ? '❚❚' : '▶', tx, 22, 64, H - 44, () => { wall.play(!wall.clock().playing); bar.draw(); }, ck.playing);
    slide(ck.t / ck.max, (f) => wall.setTime(f * ck.max));
    p.button('×' + String(ck.rate), sx + sw + 14, 22, 64, H - 44, () => { wall.rate(({ 1: 2, 2: 5, 5: 10 } as Record<number, number>)[ck.rate] ?? 1); bar.draw(); });
    g.font = `500 24px ${FONT}`; g.fillStyle = ck.moves ? '#a7ffeb' : '#5f6f84'; g.fillText(ck.moves ? `t = ${ck.t.toFixed(1)} s` : 'nothing moves', tx + tw + 8, H / 2 - 16);
  } else {
    const h = wall.history();
    p.button('◀', tx, 22, 64, H - 44, () => wall.goto(h.at - 1));
    slide(h.count > 1 ? h.at / (h.count - 1) : 1, (f) => wall.goto(Math.round(f * (h.count - 1))));
    p.button('▶', sx + sw + 14, 22, 64, H - 44, () => wall.goto(h.at + 1));
    g.font = `500 24px ${FONT}`; g.fillStyle = '#9fb3c8'; g.fillText(`${h.at + 1} / ${h.count}`, tx + tw + 8, H / 2 - 16);
  }
  const st = view.stats; g.fillStyle = '#7f8ea3'; g.font = `500 22px ${FONT}`;
  const sayIt = `${st.instances.toLocaleString()} drawn in ${st.draws} draw${st.draws === 1 ? '' : 's'}${st.boxes ? `, ${st.boxes.toLocaleString()} far off as boxes` : ''}`; g.fillText(sayIt, tx + tw + 8, H / 2 + 16);
});

/** Chat: what you say goes to Claude Code (src/nexus/view/relay.ts); its last lines, and the line being typed. */
const said: string[] = ['Claude: Build with the board; what a "Show in space" node is given stands here. Say anything to send it to Claude Code.'];
let typing = '';
const chat = new Panel(0.62, 0.22, 900, (p) => {
  const g = p.g; g.fillStyle = '#0b1220e6'; round(g, 0, 0, p.c.width, p.c.height, 22); g.fill();
  g.font = `700 30px ${FONT}`; g.fillStyle = '#b388ff'; g.textBaseline = 'top'; g.fillText('Chat with Claude', 24, 20);
  g.font = `400 24px ${FONT}`; let y = 70;
  for (const l of said.slice(-4)) { for (const line of wrap(g, l, p.c.width - 48).slice(0, 3)) { g.fillStyle = l.startsWith('You:') ? '#e6eef8' : '#9fb3c8'; g.fillText(line, 24, y); y += 30; } y += 6; if (y > p.c.height - 80) break; }
  g.fillStyle = '#162132'; round(g, 20, p.c.height - 62, p.c.width - 40, 46, 10); g.fill(); g.fillStyle = typing ? '#e6eef8' : '#5f6f84'; g.textBaseline = 'middle';
  g.fillText(typing || (renderer.xr.isPresenting ? 'Press here to type' : 'Type in the box at the top left'), 34, p.c.height - 39);
  p.hits.push({ x0: 0, y0: p.c.height - 70, x1: p.c.width, y1: p.c.height, act: () => { if (renderer.xr.isPresenting) { keyboard.mesh.visible = !keyboard.mesh.visible; placeKeyboard(); } else chatInput.focus(); } });
});
function wrap(g: CanvasRenderingContext2D, t: string, w: number): string[] { const out: string[] = []; let line = ''; for (const word of t.split(/\s+/)) { const tryL = line ? `${line} ${word}` : word; if (g.measureText(tryL).width > w && line) { out.push(line); line = word; } else line = tryL; } if (line) out.push(line); return out; }
let relay: Relay | null = null; void makeRelay().then((r) => { relay = r; });
async function send(text: string): Promise<void> {
  const t = text.trim(); if (!t) return; said.push(`You: ${t}`); typing = ''; chat.draw();
  if (!relay) { said.push('Claude: not reachable from here yet; kept.'); chat.draw(); return; }
  const r = await relay.send(`From the space: ${t}`, renderer.domElement); said.push(`Claude: ${r.said}`); chat.draw();
}
const chatInput = document.createElement('input');
chatInput.placeholder = 'Say something to Claude…'; chatInput.style.cssText = 'position:fixed;left:16px;top:16px;width:min(420px,calc(100vw - 32px));padding:10px 12px;border-radius:10px;border:1px solid #2b3a50;background:#0b1220e6;color:#e6eef8;font:14px system-ui;z-index:5';
chatInput.addEventListener('input', () => { typing = chatInput.value; chat.draw(); });
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const t = chatInput.value; chatInput.value = ''; void send(t); } e.stopPropagation(); });
document.body.appendChild(chatInput);
const back = document.createElement('a'); back.href = './index.html'; back.textContent = '◀ Dashboard';
back.style.cssText = 'position:fixed;left:16px;bottom:16px;padding:8px 14px;border-radius:10px;border:1px solid #5a3f9a;background:linear-gradient(90deg,#1b3a5a,#3a1b5a);color:#e6eef8;font:14px system-ui;text-decoration:none;z-index:5';
document.body.appendChild(back);
const keyboard = new Keyboard(false); keyboard.mesh.visible = false;
function placeKeyboard(): void { keyboard.mesh.position.set(-0.2, -0.38, -0.55); keyboard.mesh.rotation.set(-0.5, 0, 0); }

const board = new NodesWall((t) => { said.push(`Board: ${t}`); chat.draw(); });

/** The panels: riding with the view on a screen, standing before you in a headset. */
const ui = new THREE.Group(); scene.add(ui);
ui.add(board.group, bar.mesh, chat.mesh, keyboard.mesh);
let panelsShown = true, boardBig = false;
function layPanels(): void {
  const xr = renderer.xr.isPresenting;
  if (xr) { chat.mesh.visible = true; board.group.scale.setScalar(boardBig ? 0.6 : 0.42); board.group.position.set(0.12, 0.08, -1.25); board.group.rotation.set(0, 0, 0); bar.mesh.position.set(0, -0.44, -1.05); bar.mesh.scale.setScalar(0.9); chat.mesh.position.set(-0.95, 0.15, -1.0); chat.mesh.rotation.set(0, 0.45, 0); chat.mesh.scale.setScalar(1); }
  else if (boardBig) { board.group.scale.setScalar(0.5); board.group.position.set(-0.12, 0.06, -1.25); bar.mesh.position.set(0, -0.5, -1.25); bar.mesh.scale.setScalar(1); chat.mesh.visible = false; }
  else { chat.mesh.visible = true; board.group.scale.setScalar(0.36); board.group.position.set(0.36, 0.1, -1.25); bar.mesh.position.set(0, -0.5, -1.25); bar.mesh.scale.setScalar(1); chat.mesh.position.set(-0.78, 0.4, -1.25); chat.mesh.scale.setScalar(0.65); chat.mesh.rotation.set(0, 0, 0); }
  // the panels are drawn over what is made: they are what you work with, never hidden inside it
  ui.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) { m.depthTest = false; m.depthWrite = false; } o.renderOrder = 50; });
}
/** Where the panels stand in a headset: before you, where you are when you ask. */
function recentre(): void { const head = renderer.xr.getCamera(), p = head.getWorldPosition(new THREE.Vector3()), f = head.getWorldDirection(new THREE.Vector3()); f.y = 0; f.normalize(); ui.position.copy(p); ui.lookAt(p.clone().sub(f)); xrPivot.copy(p).addScaledVector(f, 0.9).setY(p.y - 0.4); }

// ---- what is shown ---------------------------------------------------------------------------------------------------
function refresh(): void { view.show(wall.shown() as Shown[]); bar.draw(); }
wall.ran = refresh;

// ---- pointing: the mouse on a screen, a hand's ray in a headset --------------------------------------------------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
type Target = { kind: 'board' } | { kind: 'panel'; panel: Panel; uv: THREE.Vector2 } | { kind: 'keys'; uv: THREE.Vector2 } | { kind: 'thing'; key: string } | null;
function aimed(): Target {
  if (!panelsShown) { const t = view.pick(ray); return t ? { kind: 'thing', key: t.key } : null; }
  const hits = ray.intersectObjects([bar.mesh, chat.mesh, ...(keyboard.mesh.visible ? [keyboard.mesh] : [])], false), dBoard = board.distance(ray);
  const h = hits[0];
  if (h && h.distance <= dBoard) { if (h.object === keyboard.mesh) return { kind: 'keys', uv: h.uv! }; return { kind: 'panel', panel: h.object === bar.mesh ? bar : chat, uv: h.uv! }; }
  if (dBoard < Infinity) return { kind: 'board' };
  const t = view.pick(ray); return t ? { kind: 'thing', key: t.key } : null;
}
function press(t: Target): boolean {
  if (!t) return false;
  if (t.kind === 'board') return board.down(ray);
  if (t.kind === 'panel') { t.panel.press(t.uv); t.panel.draw(); return true; }
  if (t.kind === 'keys') { const k = keyboard.keyAt(t.uv); if (k) { const r = keyboard.press(k); typing = keyboard.text; if (r === 'send') { void send(keyboard.text); keyboard.text = ''; } keyboard.draw(); chat.draw(); } return true; }
  if (t.kind === 'thing') { wall.choose(t.key); return false; }
  return false;
}
let mouseOnBoard = false;
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (renderer.xr.isPresenting) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const t = aimed();
  if (t?.kind === 'thing') { press(t); return; }
  if (press(t)) { orbit.enabled = false; mouseOnBoard = t?.kind === 'board'; }
});
renderer.domElement.addEventListener('pointermove', (e) => { if (!mouseOnBoard) return; ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); board.move(ray); });
window.addEventListener('pointerup', () => { if (mouseOnBoard) board.up(); mouseOnBoard = false; orbit.enabled = true; });
renderer.domElement.addEventListener('dblclick', (e) => {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (panelsShown && board.distance(ray) < Infinity) return;
  const t = view.pick(ray); if (t) focusOn(world.worldToLocal(t.point.clone()), Math.max(1e-7, grid.cell / 10));
});
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  // over the board, the wheel zooms the board; elsewhere it zooms the world about what is under the pointer
  if (panelsShown && board.distance(ray) < Infinity) { wall.zoom(Math.exp(-e.deltaY * 0.0015)); return; }
  const hit = view.pick(ray)?.point ?? ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), world.localToWorld(new THREE.Vector3())), new THREE.Vector3()) ?? orbit.target.clone();
  if (hit.distanceTo(camera.position) > 50) hit.copy(orbit.target);
  zoomAbout(Math.exp(-e.deltaY * 0.0015), hit);
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input, textarea')) return;
  if (e.key === 'f' || e.key === 'F') fit();
  else if (e.key === 'b' || e.key === 'B') { boardBig = !boardBig; layPanels(); bar.draw(); }
  else if (e.key === 'h' || e.key === 'H' || e.key === 'Tab') { e.preventDefault(); panelsShown = !panelsShown; ui.visible = panelsShown; }
  else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (e.shiftKey) wall.redo(); else wall.undo(); }
});
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// ---- the headset --------------------------------------------------------------------------------------------------------
const hands: { ctl: THREE.XRTargetRaySpace; line: THREE.Line; ball: THREE.Mesh; held: boolean }[] = [];
const models = new XRControllerModelFactory();
for (let i = 0; i < 2; i++) {
  const ctl = renderer.xr.getController(i); rig.add(ctl);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x80deea, transparent: true, opacity: 0.7 }));
  line.scale.z = 3; ctl.add(line);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.008), new THREE.MeshBasicMaterial({ color: 0xffffff })); ball.visible = false; scene.add(ball);
  const grip = renderer.xr.getControllerGrip(i); grip.add(models.createControllerModel(grip)); rig.add(grip);
  const hand = { ctl, line, ball, held: false }; hands.push(hand);
  ctl.addEventListener('selectstart', () => { ray.setFromXRController(ctl); const t = aimed(); if (press(t) && t?.kind === 'board') hand.held = true; });
  ctl.addEventListener('selectend', () => { if (hand.held) { board.up(); hand.held = false; } });
  ctl.addEventListener('squeezestart', () => recentre());
}
renderer.xr.addEventListener('sessionstart', () => { layPanels(); window.setTimeout(recentre, 300); bar.draw(); chat.draw(); });
renderer.xr.addEventListener('sessionend', () => { ui.position.set(0, 0, 0); ui.rotation.set(0, 0, 0); layPanels(); chat.draw(); });
/** The sticks: the right zooms S about the point before you, the left carries you where you look, and turns you. */
function sticks(dt: number): void {
  const session = renderer.xr.getSession(); if (!session) return;
  for (const src of session.inputSources) {
    const ax = src.gamepad?.axes; if (!ax || ax.length < 4) continue;
    const x = Math.abs(ax[2]!) > 0.15 ? ax[2]! : 0, y = Math.abs(ax[3]!) > 0.15 ? ax[3]! : 0;
    if (src.handedness === 'right' && y) zoomAbout(Math.exp(-y * dt * 1.6), xrPivot);
    if (src.handedness === 'left' && (x || y)) { const head = renderer.xr.getCamera(), f = head.getWorldDirection(new THREE.Vector3()); f.y = 0; f.normalize(); const r = new THREE.Vector3(-f.z, 0, f.x); rig.position.addScaledVector(f, -y * dt * 1.2).addScaledVector(r, x * dt * 1.2); }
  }
}

// ---- running ----------------------------------------------------------------------------------------------------------
{ const vr = VRButton.createButton(renderer); document.body.appendChild(vr); window.setTimeout(() => { vr.style.bottom = ''; vr.style.top = '16px'; vr.style.left = ''; vr.style.right = '16px'; vr.style.width = 'auto'; vr.style.padding = '8px 14px'; if (/not supported|not allowed/i.test(vr.textContent ?? '')) vr.style.display = 'none'; }, 400); }
layPanels(); bar.draw(); chat.draw(); keyboard.draw(); placeKeyboard();
board.show();
let first = true, last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!renderer.xr.isPresenting) { orbit.update(); ui.position.copy(camera.getWorldPosition(new THREE.Vector3())); ui.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion())); }
  else {
    sticks(dt);
    for (const h of hands) { ray.setFromXRController(h.ctl); if (h.held) board.move(ray); const t = ray.intersectObjects([board.group, bar.mesh, chat.mesh], true)[0]; h.ball.visible = !!t; if (t) h.ball.position.copy(t.point); h.line.scale.z = t ? t.distance : 3; }
  }
  if (first && view.bounds().isEmpty() === false) { first = false; fit(); }
  layGrid();
  const xrCam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  view.update(xrCam as THREE.PerspectiveCamera, renderer.domElement.clientHeight || window.innerHeight, now);
  board.update(now);
  if (now % 500 < 17 || (wall.clock().playing && now % 100 < 17)) bar.draw();
  renderer.render(scene, camera);
});
// the first time, a board that shows something in the space: the city from a few nodes
try { if (!localStorage.getItem('nexus.space.seen')) { localStorage.setItem('nexus.space.seen', '1'); window.setTimeout(() => { if (!wall.shown().length) wall.demo(0); }, 400); } } catch { /* a private window: nothing kept */ }
window.setTimeout(refresh, 300);
// what a browser test drives it by
const emulate = emulated && {
  /** The right hand at the head's side, aimed at a button of the space bar by its label. */
  aimAtBar(label: string): boolean {
    bar.draw(); const i = ['µm', 'mm', 'm', 'km'].indexOf(label); const h = bar.hits[i]; if (!h) return false;
    const uv = new THREE.Vector3(((h.x0 + h.x1) / 2 / bar.c.width - 0.5) * bar.w, (0.5 - (h.y0 + h.y1) / 2 / bar.c.height) * bar.h, 0), target = bar.mesh.localToWorld(uv);
    const from = new THREE.Vector3(0.2, 1.3, -0.1), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), target.clone().sub(from).normalize());
    emulated!.controllers.right.position.set(from.x, from.y, from.z); emulated!.controllers.right.quaternion.set(q.x, q.y, q.z, q.w); return true;
  },
  trigger: (v: number) => emulated!.controllers.right.updateButtonValue('trigger', v),
  stick: (y: number) => emulated!.controllers.right.updateAxes('thumbstick', 0, y),
};
(window as unknown as { space: object }).space = { emulate, presenting: () => renderer.xr.isPresenting, S, fit, jump, focusOn: (x: number, y: number, z: number, cell: number) => focusOn(new THREE.Vector3(x, y, z), cell), zoomAbout, stats: () => view.stats, shown: () => wall.shown().length, pivot, grid: () => ({ cell: grid.cell, planes: grid.planes }), panels: (on: boolean) => { panelsShown = on; ui.visible = on; }, demo: (i: number) => wall.demo(i), wall, camera, orbit };
