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
// (in a headset the strip and the side panel are drawn larger, so every target is 2.5° or more and every text 0.6° or more
// from the eye with the board at its smaller scale (spec 04, P10): on a screen their buttons were 1.1° and 0.9°, their text
// 0.3° to 0.6° (the evaluator, 2026-11-01). The same pixels per metre as on a screen; more metres.)
const SH_XR = 0.38, SIDE_W_XR = 0.92; // (the strip in two rows in a headset: measured as the eye sees them, its end buttons in one row of 0.16 were 2.21°, seen at a slant)
const SPX = 2048, LPX0 = 900, PX_PER_M = LPX0 / SIDE_W;
interface Hit { x0: number; y0: number; x1: number; y1: number; act: () => void; label?: string }
/** The side panel's sizes, in its pixels: on a screen, and in a headset. */
const SIDE = {
  screen: { title: 30, label: 40, says: 26, saysLh: 34, saysLines: 3, inLabel: 28, inValue: 34, bw: 100, bh: 80, rowH: 104, top: 290, lib: 84, libGap: 12, libName: 32, help: 30, helpLh: 50, foot: 84, footW: 260, font: 30, nav: 80 },
  xr: { title: 60, label: 66, says: 58, saysLh: 66, saysLines: 2, inLabel: 58, inValue: 62, bw: 236, bh: 236, rowH: 252, top: 300, lib: 236, libGap: 16, libName: 58, help: 58, helpLh: 74, foot: 236, footW: 520, font: 58, nav: 236 },
} as const;

function panel(w: number, h: number, c: HTMLCanvasElement): { mesh: THREE.Mesh; tex: THREE.CanvasTexture } {
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  mesh.renderOrder = 15; mesh.userData.fixOk = true; return { mesh, tex };
}
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export class NodesWall {
  readonly group = new THREE.Group();
  private readonly board = panel(NW, NH, wall.canvas);
  private sh = SH; private sw = SIDE_W; private xr = false;
  private spy = Math.round((SPX * SH) / NW); private lpx = LPX0; private lpy = Math.round(PX_PER_M * (NH + SH + GAP));
  private stripC = canvas(SPX, this.spy); private readonly strip = panel(NW, SH, this.stripC);
  private sideC = canvas(this.lpx, this.lpy); private readonly side = panel(SIDE_W, NH + SH + GAP, this.sideC);
  private stripHits: Hit[] = []; private sideHits: Hit[] = [];
  /** The text sizes drawn on the strip and the side panel, in their pixels (the smallest is measured). */
  private stripFonts: number[] = []; private sideFonts: number[] = [];
  private demo = 0; private library = false; private shelf = 0; private page = 0; private inPage = 0;
  /** In a headset, a wire being made from the side panel: its output chosen, its input not yet. */
  private wiring: { from: string; out: string; label: string } | null = null;
  private pressing: { on: 'board'; x: number; y: number } | null = null;
  private stale = true; private lastUpload = 0; private size = '';
  private readonly plane = new THREE.Plane(); private readonly at = new THREE.Vector3();

  constructor(private readonly say: (s: string) => void) {
    this.group.add(this.board.mesh, this.strip.mesh, this.side.mesh);
    this.lay();
    wall.painted = () => { this.stale = true; };
    wall.said = (s) => this.say(s);
    wall.changed = () => this.drawSide();
    this.group.visible = false; wall.active = false;
  }
  /** The strip above and the panel beside, placed for their size. */
  private lay(): void {
    this.strip.mesh.position.set(0, NH / 2 + GAP + this.sh / 2, 0);
    const tilt = 0.3; this.side.mesh.rotation.y = -tilt;
    this.side.mesh.position.set(NW / 2 + 0.08 + (this.sw / 2) * Math.cos(tilt), GAP / 2 + this.sh / 2, (this.sw / 2) * Math.sin(tilt));
  }
  /** In a headset or on a screen: in a headset the strip is taller and the panel wider, each drawn at the same pixels per
   *  metre, so its targets and text are larger as the eye sees them. */
  headset(on: boolean): void {
    if (on === this.xr) return;
    this.xr = on; this.sh = on ? SH_XR : SH; this.sw = on ? SIDE_W_XR : SIDE_W; this.wiring = null;
    this.spy = Math.round((SPX * this.sh) / NW); this.lpx = Math.round(PX_PER_M * this.sw); this.lpy = Math.round(PX_PER_M * (NH + this.sh + GAP));
    const remake = (p: { mesh: THREE.Mesh; tex: THREE.CanvasTexture }, c: HTMLCanvasElement, w: number, h: number) => {
      p.mesh.geometry.dispose(); p.mesh.geometry = new THREE.PlaneGeometry(w, h); p.tex.dispose();
      p.tex = new THREE.CanvasTexture(c); p.tex.colorSpace = THREE.SRGBColorSpace; p.tex.anisotropy = 4; (p.mesh.material as THREE.MeshBasicMaterial).map = p.tex; };
    this.stripC = canvas(SPX, this.spy); remake(this.strip, this.stripC, NW, this.sh);
    this.sideC = canvas(this.lpx, this.lpy); remake(this.side, this.sideC, this.sw, NH + this.sh + GAP);
    this.lay(); this.drawStrip(); this.drawSide();
  }
  /** The smallest target and the smallest text on the strip and on the side panel, in metres as drawn in the world, and
   *  the meshes they are on (for their distance from the eye). */
  sizes(): { name: string; mesh: THREE.Object3D; target?: number; text: number }[] {
    const out: { name: string; mesh: THREE.Object3D; target?: number; text: number }[] = [];
    for (const [name, p, hits, fonts, wpx, hpx, w, h] of [['strip', this.strip, this.stripHits, this.stripFonts, SPX, this.spy, NW, this.sh], ['side', this.side, this.sideHits, this.sideFonts, this.lpx, this.lpy, this.sw, NH + this.sh + GAP]] as const) {
      p.mesh.updateWorldMatrix(true, false); const sc = p.mesh.getWorldScale(new THREE.Vector3()), mx = (w * sc.x) / wpx, my = (h * sc.y) / hpx;
      out.push({ name, mesh: p.mesh, ...(hits.length ? { target: Math.min(...hits.map((r) => Math.min((r.x1 - r.x0) * mx, (r.y1 - r.y0) * my))) } : {}), text: fonts.length ? Math.min(...fonts) * my : NaN });
    }
    return out;
  }
  /** Every button on the strip and the side panel, with its mesh and that mesh's size in metres and in its canvas's pixels:
   *  for measuring each as the eye sees it. And the board's canvas mesh, for its blocks and its text. */
  hitRects(): { name: string; mesh: THREE.Mesh; w: number; h: number; cw: number; ch: number; rects: { x0: number; y0: number; x1: number; y1: number }[] }[] {
    return [{ name: 'strip', mesh: this.strip.mesh, w: NW, h: this.sh, cw: SPX, ch: this.spy, rects: this.stripHits }, { name: 'side panel', mesh: this.side.mesh, w: this.sw, h: NH + this.sh + GAP, cw: this.lpx, ch: this.lpy, rects: this.sideHits }];
  }
  get canvasMesh(): THREE.Mesh { return this.board.mesh; }
  /** A side-panel button pressed by its label: what a hand's ray on it sets off (for a browser test). */
  pressLabel(label: string, nth = 0): boolean { const h = this.sideHits.filter((x) => x.label === label)[nth]; h?.act(); return !!h; }
  /** The library shown in the side panel, or the chosen block (as the strip's ＋ Blocks button does). */
  libraryShown(on: boolean): void { this.library = on; this.page = 0; this.drawStrip(); this.drawSide(); }
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
    if (h.object === this.strip.mesh) { this.press(this.stripHits, h.uv.x * SPX, (1 - h.uv.y) * this.spy); return true; }
    if (h.object === this.side.mesh) { this.press(this.sideHits, h.uv.x * this.lpx, (1 - h.uv.y) * this.lpy); return true; }
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
    const g = this.stripC.getContext('2d')!, H = this.spy; this.stripHits = []; this.stripFonts = [];
    g.clearRect(0, 0, SPX, H); g.fillStyle = '#0b1220ee'; round(g, 0, 0, SPX, H, 18); g.fill();
    // (in a headset two rows, each button at least as wide as its row is tall (and a tenth more), its label at 48 px: 2.5°
    // and 0.6° or more as the eye sees them, the ends at a slant included)
    const font = this.xr ? 48 : 30, RH = this.xr ? H / 2 : H, least = this.xr ? RH * 1.1 : 0, pad = this.xr ? 6 : 10;
    let x = this.xr ? 8 : 14, row = 0;
    const btn = (label: string, act: () => void, hue = '#1c2a3d', w?: number) => {
      g.font = `600 ${font}px ${FONT}`; const bw = Math.max(least, w ?? g.measureText(label).width + 40), y0 = row * RH;
      g.fillStyle = hue; round(g, x, y0 + pad, bw, RH - 2 * pad, 12); g.fill(); g.fillStyle = '#e6eef8'; g.textBaseline = 'middle'; const tw = g.measureText(label).width; g.fillText(label, x + Math.max(20, (bw - tw) / 2), y0 + RH / 2); this.stripFonts.push(font);
      this.stripHits.push({ x0: x, y0, x1: x + bw, y1: y0 + RH, act }); x += bw + (this.xr ? 6 : 10);
    };
    const nextRow = () => { if (this.xr) { row = 1; x = 8; } };
    const names = wall.demos();
    btn('◀', () => { this.demo = (this.demo + names.length - 1) % names.length; this.say(wall.demo(this.demo)); this.drawStrip(); });
    btn(clip(names[this.demo] ?? '', this.xr ? 20 : 34), () => { this.say(wall.demo(this.demo)); this.drawStrip(); }, '#173a2c', this.xr ? 560 : 560);
    btn('▶', () => { this.demo = (this.demo + 1) % names.length; this.say(wall.demo(this.demo)); this.drawStrip(); });
    btn('Fit', () => wall.fit()); btn('Tidy', () => wall.tidy()); btn('−', () => wall.zoom(1 / 1.25)); btn('+', () => wall.zoom(1.25));
    nextRow(); btn('↶', () => wall.undo()); btn('↷', () => wall.redo()); btn('Heat', () => wall.heat()); btn('↑ Out', () => { wall.up1(); this.drawSide(); });
    btn(this.library ? '✕ Library' : '＋ Blocks', () => { this.library = !this.library; this.page = 0; this.drawStrip(); this.drawSide(); }, this.library ? '#3a2a10' : '#2a1c3d');
    this.strip.tex.needsUpdate = true;
  }

  // ---- the panel beside it ----------------------------------------------------------------------------------------------
  drawSide(): void {
    const g = this.sideC.getContext('2d')!, M = this.xr ? SIDE.xr : SIDE.screen, W = this.lpx, H = this.lpy; this.sideHits = []; this.sideFonts = [];
    g.clearRect(0, 0, W, H); g.fillStyle = '#0b1220ee'; round(g, 0, 0, W, H, 26); g.fill();
    g.textBaseline = 'middle';
    const text = (t: string, x: number, y: number, size: number = M.font, colour = '#dfe7f1', weight = 400) => { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = colour; g.fillText(t, x, y); if (t) this.sideFonts.push(size); };
    const btn = (label: string, x: number, y: number, w: number, h: number, act: () => void, hue = '#1c2a3d') => { g.fillStyle = hue; round(g, x, y, w, h, 12); g.fill(); g.font = `600 ${M.font}px ${FONT}`; g.fillStyle = '#e6eef8'; const tw = g.measureText(label).width; g.fillText(label, x + (w - tw) / 2, y + h / 2); if (label) this.sideFonts.push(M.font); this.sideHits.push({ x0: x, y0: y, x1: x + w, y1: y + h, act, label }); };
    // (how many characters fit a width at a size: a clip by measure, so the larger text in a headset never runs off the panel)
    const fit = (t: string, size: number, w: number, weight = 400) => { g.font = `${weight} ${size}px ${FONT}`; if (g.measureText(t).width <= w) return t; let n = t.length; while (n > 1 && g.measureText(`${t.slice(0, n)}…`).width > w) n--; return `${t.slice(0, n)}…`; };
    text(fit(wall.title(), M.title, W - 60, 600), 30, M.title * 1.5, M.title, '#9fb3c8', 600);
    const navY = M.title * 3, pagesAt = H - M.nav - 30;
    if (this.library) {
      const shelves = wall.shelves('domain'), s = shelves[this.shelf % shelves.length]!, top = navY + M.nav + 24;
      const per = Math.max(1, Math.floor((pagesAt - 20 - top) / (M.lib + M.libGap))), pages = Math.max(1, Math.ceil(s.blocks.length / per));
      btn('◀', 30, navY, M.bw, M.nav, () => { this.shelf = (this.shelf + shelves.length - 1) % shelves.length; this.page = 0; this.drawSide(); });
      text(fit(`${s.name} (${s.blocks.length})`, M.label * 0.85, W - 2 * M.bw - 100, 700), M.bw + 50, navY + M.nav / 2, Math.round(M.label * 0.85), '#ffffff', 700);
      btn('▶', W - 30 - M.bw, navY, M.bw, M.nav, () => { this.shelf = (this.shelf + 1) % shelves.length; this.page = 0; this.drawSide(); });
      s.blocks.slice(this.page * per, this.page * per + per).forEach((b, i) => {
        const y = top + i * (M.lib + M.libGap), mark = Math.round(M.lib * 0.52);
        btn('', 30, y, W - 60, M.lib, () => { wall.add(b.id); this.say(`${b.name} placed in the middle of the board`); }, '#111a28');
        g.fillStyle = KINDS[b.kind].hue; round(g, 46, y + (M.lib - mark) / 2, mark, mark, 10); g.fill(); text(KINDS[b.kind].mark, 46 + mark * 0.25, y + M.lib / 2, Math.round(mark * 0.55), '#000', 700);
        text(fit(b.name, M.libName, W - 120 - mark), 70 + mark, y + M.lib / 2, M.libName);
      });
      if (pages > 1) { btn('▲', 30, pagesAt, Math.max(160, M.bw), M.nav, () => { this.page = (this.page + pages - 1) % pages; this.drawSide(); }); text(`${this.page + 1} / ${pages}`, W / 2 - M.font, pagesAt + M.nav / 2, M.font, '#9fb3c8'); btn('▼', W - 30 - Math.max(160, M.bw), pagesAt, Math.max(160, M.bw), M.nav, () => { this.page = (this.page + 1) % pages; this.drawSide(); }); }
      this.side.tex.needsUpdate = true; return;
    }
    const c = wall.chosen();
    if (!c) {
      const help = ['Point at a block and press to choose it.', 'Press an output dot and drag to an input to wire them. Drag a block to move it, a 3D view to turn it, the sheet to pan.', '', '＋ Blocks above: the library, by field.', '◀ ▶ above: the boards to start from.'];
      let y = navY + 20; for (const [i, l] of help.entries()) { y = l ? wrapText(g, l, 30, y, W - 60, M.help, M.helpLh, 4, i < 2 ? '#c8d4e3' : '#8796aa', this.sideFonts) : y + M.helpLh; }
      this.side.tex.needsUpdate = true; return;
    }
    text(fit(c.label, M.label, W - 60, 700), 30, navY + M.label * 0.5, M.label, '#ffffff', 700);
    const after = wrapText(g, c.says, 30, navY + M.label * 1.75, W - 60, M.says, M.saysLh, M.saysLines, '#8796aa', this.sideFonts);
    // (inputs a page at a time when they do not all fit: in a headset, about six; there its outputs too, each to wire
    // from, and each input to wire into or cut, since a hand's ray cannot hit the board's ports (each 1.1°))
    let top = Math.max(M.top, after + 10); const foot = H - M.foot - 30;
    const wiring = this.wiring;
    if (this.xr && wiring) { text(fit(`Wiring from ${wiring.label}: choose a block, then ← here`, M.inLabel, W - 90 - M.bw), 30, top + M.bh / 2, M.inLabel, '#ffd740', 600); btn('✕', W - 30 - M.bw, top, M.bw, M.bh, () => { this.wiring = null; this.drawSide(); }); top += M.rowH; }
    type Row = { kind: 'in'; q: (typeof c.inputs)[number] } | { kind: 'out'; o: (typeof c.outputs)[number] };
    const rows: Row[] = [...c.inputs.map((q) => ({ kind: 'in' as const, q })), ...(this.xr ? c.outputs.map((o) => ({ kind: 'out' as const, o })) : [])];
    const room = (this.xr ? foot - M.nav - 30 : foot) - top;
    const per = Math.max(1, Math.min(12, Math.floor(room / M.rowH))), pages = Math.max(1, Math.ceil(rows.length / per)); this.inPage = Math.min(this.inPage, pages - 1);
    let y = top; const textW = W - 60 - 2 * M.bw - 40;
    for (const r of rows.slice(this.inPage * per, this.inPage * per + per)) {
      const bx = W - 30 - 2 * M.bw - 20, by = y + (M.rowH - M.bh) / 2;
      if (r.kind === 'out') {
        text(fit(`${r.o.label} (out)`, M.inLabel, textW), 30, y + M.rowH / 2, M.inLabel, '#9be7c4');
        btn('→ wire', bx, by, 2 * M.bw + 20, M.bh, () => { this.wiring = { from: c.id, out: r.o.name, label: `${c.label}.${r.o.label}` }; this.say(`wiring from ${c.label}.${r.o.label}: choose a block, then its input`); this.drawSide(); }, '#173a2c');
        y += M.rowH; continue;
      }
      const q = r.q;
      text(fit(q.label, M.inLabel, textW), 30, y + M.inLabel * 0.7, M.inLabel, q.wired ? '#6b7a8f' : '#c8d4e3');
      text(fit(q.value, M.inValue, textW, 600), 30, y + M.inLabel * 1.4 + M.inValue * 0.6, M.inValue, q.wired ? '#6b7a8f' : '#ffffff', 600);
      if (this.xr && wiring && wiring.from !== c.id) { btn('← here', bx, by, 2 * M.bw + 20, M.bh, () => { if (wall.connect(wiring.from, wiring.out, c.id, q.name)) { this.say(`wired ${wiring.label} into ${c.label}.${q.label}`); this.wiring = null; } this.drawSide(); }, '#1b3a5a'); y += M.rowH; continue; }
      if (this.xr && q.wired) { btn('✕ cut', bx, by, 2 * M.bw + 20, M.bh, () => { wall.unwire(c.id, q.name); this.say(`the wire into ${c.label}.${q.label} cut`); this.drawSide(); }, '#3a1b1b'); y += M.rowH; continue; }
      if (q.choices && !q.wired) { btn('◀', bx, by, M.bw, M.bh, () => { this.say(`${q.label}: ${wall.step(q.name, -1)}`); this.drawSide(); }); btn('▶', bx + M.bw + 20, by, M.bw, M.bh, () => { this.say(`${q.label}: ${wall.step(q.name, 1)}`); this.drawSide(); }); }
      if (q.number && !q.wired) { btn('−', bx, by, M.bw, M.bh, () => wall.nudge(q.name, 1 / 1.1)); btn('+', bx + M.bw + 20, by, M.bw, M.bh, () => wall.nudge(q.name, 1.1)); }
      y += M.rowH;
    }
    if (pages > 1) { const py = this.xr ? foot - M.nav - 20 : y; btn('▲', 30, py, M.bw, M.nav, () => { this.inPage = (this.inPage + pages - 1) % pages; this.drawSide(); }); text(`${this.inPage + 1} / ${pages}`, W / 2 - M.font, py + M.nav / 2, M.font, '#9fb3c8'); btn('▼', W - 30 - M.bw, py, M.bw, M.nav, () => { this.inPage = (this.inPage + 1) % pages; this.drawSide(); }); }
    const fy = Math.max(this.xr ? foot : y, H - M.foot - 30);
    if (c.group) btn('▣ Open', 30, fy, M.footW, M.foot, () => { wall.open(); this.drawSide(); }, '#1b3a5a');
    btn('Cut branch', W - 30 - M.footW, fy, M.footW, M.foot, () => { wall.cut(); this.drawSide(); }, '#3a1b1b');
    this.side.tex.needsUpdate = true;
  }
}

function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
function wrapText(g: CanvasRenderingContext2D, t: string, x: number, y: number, w: number, size: number, lh: number, most: number, colour: string, fonts?: number[]): number {
  g.font = `400 ${size}px ${FONT}`; g.fillStyle = colour; const words = t.split(/\s+/); let line = '', n = 0;
  if (t.trim()) fonts?.push(size);
  for (const wd of words) { const tryL = line ? `${line} ${wd}` : wd; if (g.measureText(tryL).width > w && line) { g.fillText(n === most - 1 ? `${line}…` : line, x, y + n * lh); n++; line = wd; if (n >= most) return y + n * lh; } else line = tryL; }
  if (line && n < most) { g.fillText(line, x, y + n * lh); n++; }
  return y + n * lh;
}
