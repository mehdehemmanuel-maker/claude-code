// The board of blocks on a wall in the forge (src/nexus/view/nodes.ts, hosted): the same board, the same engine and the
// same drawing as on its page, its canvas shown as the wall's picture, so what you make on the page is on the wall and
// back. A hand's ray (or the mouse, on a screen) presses, drags and lets go on it as a mouse does on the page: wire an
// output to an input, move a block, turn a 3D view, pan the sheet. Above it a strip: the boards to start from, fit,
// tidy, zoom, undo, the heat map, back out of a group, and the library. Beside it a panel: the block chosen, each input
// it may be given with − and + (a hand cannot type well; ten percent a press), ◀ ▶ through an input's choices (a house's
// plan, a light's state), and opening or cutting it; or, with the
// library up, every block by field, a press to place it.

import * as THREE from 'three';
import { KINDS } from '../blocks';
import { wall } from './nodes';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
export const NW = 2.4, NH = 1.35, SH = 0.09, SIDE_W = 0.62, GAP = 0.015;
const SPX = 2048, SPY = Math.round((SPX * SH) / NW), LPX = 900, LPY = Math.round((LPX * (NH + SH + GAP)) / SIDE_W);
interface Hit { x0: number; y0: number; x1: number; y1: number; act: () => void }

function panel(w: number, h: number, c: HTMLCanvasElement): { mesh: THREE.Mesh; tex: THREE.CanvasTexture } {
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  mesh.renderOrder = 15; mesh.userData.fixOk = true; return { mesh, tex };
}
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export class NodesWall {
  readonly group = new THREE.Group();
  private readonly board = panel(NW, NH, wall.canvas);
  private readonly stripC = canvas(SPX, SPY); private readonly strip = panel(NW, SH, this.stripC);
  private readonly sideC = canvas(LPX, LPY); private readonly side = panel(SIDE_W, NH + SH + GAP, this.sideC);
  private stripHits: Hit[] = []; private sideHits: Hit[] = [];
  private demo = 0; private library = false; private shelf = 0; private page = 0;
  private pressing: { on: 'board'; x: number; y: number } | null = null;
  private stale = true; private lastUpload = 0; private size = '';
  private readonly plane = new THREE.Plane(); private readonly at = new THREE.Vector3();

  constructor(private readonly say: (s: string) => void) {
    this.group.add(this.board.mesh, this.strip.mesh, this.side.mesh);
    this.strip.mesh.position.set(0, NH / 2 + GAP + SH / 2, 0);
    const tilt = 0.3; this.side.mesh.rotation.y = -tilt;
    this.side.mesh.position.set(NW / 2 + 0.08 + (SIDE_W / 2) * Math.cos(tilt), GAP / 2 + SH / 2, (SIDE_W / 2) * Math.sin(tilt));
    wall.painted = () => { this.stale = true; };
    wall.said = (s) => this.say(s);
    wall.changed = () => this.drawSide();
    this.group.visible = false; wall.active = false;
  }
  show(): string { this.group.visible = true; wall.active = true; wall.fit(); this.drawStrip(); this.drawSide(); return `${wall.title()}: point and press to wire, move and turn; the strip above for the boards to start from.`; }
  hide(): void { this.group.visible = false; wall.active = false; this.pressing = null; }
  /** Called each frame: the wall's picture sent to the headset when it changed, at most thirty times a second. */
  update(now: number): void {
    if (!this.group.visible || !this.stale || now - this.lastUpload < 33) return;
    // a texture keeps the size it was first sent at: when the board's canvas changes size, a new one is made for it
    const c = wall.canvas, size = `${c.width}x${c.height}`;
    if (size !== this.size) { const old = this.board.tex; this.board.tex = new THREE.CanvasTexture(c); this.board.tex.colorSpace = THREE.SRGBColorSpace; this.board.tex.anisotropy = 4; (this.board.mesh.material as THREE.MeshBasicMaterial).map = this.board.tex; (this.board.mesh.material as THREE.MeshBasicMaterial).needsUpdate = true; old.dispose(); this.size = size; }
    this.board.tex.needsUpdate = true; this.stale = false; this.lastUpload = now;
  }

  distance(ray: THREE.Raycaster): number { return this.group.visible ? ray.intersectObjects([this.board.mesh, this.strip.mesh, this.side.mesh], false)[0]?.distance ?? Infinity : Infinity; }
  /** A press: on the board, it is the mouse pressed there; on the strip or the panel, the button under it. True when taken. */
  down(ray: THREE.Raycaster): boolean {
    const h = ray.intersectObjects([this.board.mesh, this.strip.mesh, this.side.mesh], false)[0]; if (!h?.uv) return false;
    if (h.object === this.strip.mesh) { this.press(this.stripHits, h.uv.x * SPX, (1 - h.uv.y) * SPY); return true; }
    if (h.object === this.side.mesh) { this.press(this.sideHits, h.uv.x * LPX, (1 - h.uv.y) * LPY); return true; }
    const x = h.uv.x * wall.canvas.clientWidth, y = (1 - h.uv.y) * wall.canvas.clientHeight;
    this.pressing = { on: 'board', x, y }; wall.down(x, y); return true;
  }
  /** The ray moved while pressed: carried on across the wall's plane, so a drag may leave the wall and come back. */
  move(ray: THREE.Raycaster): void {
    if (!this.pressing) return;
    this.board.mesh.updateMatrixWorld();
    this.plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).transformDirection(this.board.mesh.matrixWorld), this.board.mesh.getWorldPosition(new THREE.Vector3()));
    if (!ray.ray.intersectPlane(this.plane, this.at)) return;
    const l = this.board.mesh.worldToLocal(this.at.clone()), x = (l.x / NW + 0.5) * wall.canvas.clientWidth, y = (0.5 - l.y / NH) * wall.canvas.clientHeight;
    this.pressing.x = x; this.pressing.y = y; wall.move(x, y);
  }
  up(): void { const p = this.pressing; this.pressing = null; if (p) wall.up(p.x, p.y); this.drawSide(); }
  get holding(): boolean { return !!this.pressing; }

  private press(hits: Hit[], x: number, y: number): void { hits.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)?.act(); }

  // ---- the strip --------------------------------------------------------------------------------------------------------
  drawStrip(): void {
    const g = this.stripC.getContext('2d')!, H = SPY; this.stripHits = [];
    g.clearRect(0, 0, SPX, H); g.fillStyle = '#0b1220ee'; round(g, 0, 0, SPX, H, 18); g.fill();
    let x = 14;
    const btn = (label: string, act: () => void, hue = '#1c2a3d', w?: number) => {
      g.font = `600 30px ${FONT}`; const bw = w ?? g.measureText(label).width + 40;
      g.fillStyle = hue; round(g, x, 10, bw, H - 20, 12); g.fill(); g.fillStyle = '#e6eef8'; g.textBaseline = 'middle'; g.fillText(label, x + 20, H / 2);
      this.stripHits.push({ x0: x, y0: 0, x1: x + bw, y1: H, act }); x += bw + 10;
    };
    const names = wall.demos();
    btn('◀', () => { this.demo = (this.demo + names.length - 1) % names.length; this.say(wall.demo(this.demo)); this.drawStrip(); });
    btn(clip(names[this.demo] ?? '', 34), () => { this.say(wall.demo(this.demo)); this.drawStrip(); }, '#173a2c', 560);
    btn('▶', () => { this.demo = (this.demo + 1) % names.length; this.say(wall.demo(this.demo)); this.drawStrip(); });
    btn('Fit', () => wall.fit()); btn('Tidy', () => wall.tidy()); btn('−', () => wall.zoom(1 / 1.25)); btn('+', () => wall.zoom(1.25));
    btn('↶', () => wall.undo()); btn('↷', () => wall.redo()); btn('Heat', () => wall.heat()); btn('↑ Out', () => { wall.up1(); this.drawSide(); });
    btn(this.library ? '✕ Library' : '＋ Blocks', () => { this.library = !this.library; this.page = 0; this.drawStrip(); this.drawSide(); }, this.library ? '#3a2a10' : '#2a1c3d');
    this.strip.tex.needsUpdate = true;
  }

  // ---- the panel beside it ----------------------------------------------------------------------------------------------
  drawSide(): void {
    const g = this.sideC.getContext('2d')!; this.sideHits = [];
    g.clearRect(0, 0, LPX, LPY); g.fillStyle = '#0b1220ee'; round(g, 0, 0, LPX, LPY, 26); g.fill();
    g.textBaseline = 'middle';
    const text = (t: string, x: number, y: number, size = 30, colour = '#dfe7f1', weight = 400) => { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = colour; g.fillText(t, x, y); };
    const btn = (label: string, x: number, y: number, w: number, h: number, act: () => void, hue = '#1c2a3d') => { g.fillStyle = hue; round(g, x, y, w, h, 12); g.fill(); g.font = `600 30px ${FONT}`; g.fillStyle = '#e6eef8'; const tw = g.measureText(label).width; g.fillText(label, x + (w - tw) / 2, y + h / 2); this.sideHits.push({ x0: x, y0: y, x1: x + w, y1: y + h, act }); };
    text(clip(wall.title(), 40), 30, 46, 30, '#9fb3c8', 600);
    if (this.library) {
      const shelves = wall.shelves('domain'), s = shelves[this.shelf % shelves.length]!, per = 14, pages = Math.max(1, Math.ceil(s.blocks.length / per));
      btn('◀', 30, 86, 80, 70, () => { this.shelf = (this.shelf + shelves.length - 1) % shelves.length; this.page = 0; this.drawSide(); });
      text(clip(`${s.name} (${s.blocks.length})`, 26), 130, 121, 34, '#ffffff', 700);
      btn('▶', LPX - 110, 86, 80, 70, () => { this.shelf = (this.shelf + 1) % shelves.length; this.page = 0; this.drawSide(); });
      s.blocks.slice(this.page * per, this.page * per + per).forEach((b, i) => {
        const y = 180 + i * 96;
        btn('', 30, y, LPX - 60, 84, () => { wall.add(b.id); this.say(`${b.name} placed in the middle of the board`); }, '#111a28');
        g.fillStyle = KINDS[b.kind].hue; round(g, 46, y + 20, 44, 44, 10); g.fill(); text(KINDS[b.kind].mark, 56, y + 43, 24, '#000', 700);
        text(clip(b.name, 30), 108, y + 42, 32);
      });
      if (pages > 1) { btn('▲', 30, LPY - 110, 160, 80, () => { this.page = (this.page + pages - 1) % pages; this.drawSide(); }); text(`${this.page + 1} / ${pages}`, LPX / 2 - 40, LPY - 70, 30, '#9fb3c8'); btn('▼', LPX - 190, LPY - 110, 160, 80, () => { this.page = (this.page + 1) % pages; this.drawSide(); }); }
      this.side.tex.needsUpdate = true; return;
    }
    const c = wall.chosen();
    if (!c) {
      ['Point at a block and press to choose it.', 'Press an output dot and drag to an input', 'to wire them. Drag a block to move it,', 'a 3D view to turn it, the sheet to pan.', '', '＋ Blocks above: the library, by field.', '◀ ▶ above: the boards to start from.'].forEach((l, i) => text(l, 30, 130 + i * 50, 30, i < 4 ? '#c8d4e3' : '#8796aa'));
      this.side.tex.needsUpdate = true; return;
    }
    text(clip(c.label, 26), 30, 110, 40, '#ffffff', 700);
    wrapText(g, c.says, 30, 160, LPX - 60, 26, 34, 3, '#8796aa');
    let y = 290;
    for (const q of c.inputs.slice(0, 12)) {
      text(clip(q.label, 26), 30, y + 20, 28, q.wired ? '#6b7a8f' : '#c8d4e3');
      text(clip(q.value, 18), 30, y + 60, 34, q.wired ? '#6b7a8f' : '#ffffff', 600);
      if (q.choices && !q.wired) { btn('◀', LPX - 250, y + 6, 100, 80, () => { this.say(`${q.label}: ${wall.step(q.name, -1)}`); this.drawSide(); }); btn('▶', LPX - 130, y + 6, 100, 80, () => { this.say(`${q.label}: ${wall.step(q.name, 1)}`); this.drawSide(); }); }
      if (q.number && !q.wired) { btn('−', LPX - 250, y + 6, 100, 80, () => wall.nudge(q.name, 1 / 1.1)); btn('+', LPX - 130, y + 6, 100, 80, () => wall.nudge(q.name, 1.1)); }
      y += 104;
    }
    y = Math.max(y, LPY - 120);
    if (c.group) btn('▣ Open', 30, y, 260, 84, () => { wall.open(); this.drawSide(); }, '#1b3a5a');
    btn('Cut branch', LPX - 290, y, 260, 84, () => { wall.cut(); this.drawSide(); }, '#3a1b1b');
    this.side.tex.needsUpdate = true;
  }
}

function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
function wrapText(g: CanvasRenderingContext2D, t: string, x: number, y: number, w: number, size: number, lh: number, most: number, colour: string): void {
  g.font = `400 ${size}px ${FONT}`; g.fillStyle = colour; const words = t.split(/\s+/); let line = '', n = 0;
  for (const wd of words) { const tryL = line ? `${line} ${wd}` : wd; if (g.measureText(tryL).width > w && line) { g.fillText(n === most - 1 ? `${line}…` : line, x, y + n * lh); n++; line = wd; if (n >= most) return; } else line = tryL; }
  if (line && n < most) g.fillText(line, x, y + n * lh);
}
