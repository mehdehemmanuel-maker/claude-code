// The node board in the room (src/nexus/boards.ts): a wall of words and the links between them in front of you, a list
// beside it of every other node, and a strip of controls above. Point at a node and press to open its list; press a row
// to link it or unlink it, one press each, so you go down the list linking; hold the trigger on a node and move to drag
// it, and let go to leave it there. A word comes from the keyboard of light or your voice: one word is a node, nothing
// else is asked. What each node is (a category, a subcategory, …) is what its links make it, and the pipeline view is
// the same nodes in the order they are derived. Each surface is one canvas, so a board of hundreds of nodes is three
// textures, not hundreds.

import * as THREE from 'three';
import { BACK, STRUCT, UNDIRECTED, addNode, boardOfBuild, categoriesOf, deleteNode, derive, edgesOf, findNodes, levelOf, moveNode, nodesOf, pathTo, placesOf, toggleLink, unpin, uid, type Board, type Derived, type PartLike, type View } from '../boards';
import type { BoardStore } from './boards-store';
import { resolve, type Understanding } from '../understand';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const HUE = ['#78909c', '#80deea', '#69f0ae', '#ffd740', '#ff8a80', '#b388ff', '#ffb74d', '#90caf9', '#f48fb1'];
export const WALL_W = 2.1, WALL_H = 1.18, STRIP_H = 0.085, LIST_W = 0.62, GAP = 0.015;
const LIST_H = WALL_H + STRIP_H + GAP;
const WPX = 2560, HPX = Math.round((WPX * WALL_H) / WALL_W), SPX = Math.round((WPX * STRIP_H) / WALL_W), LPX = 1024, LHPX = Math.round((LPX * LIST_H) / LIST_W);
const ROW = 84, LIST_TOP = 420, ROWS = Math.floor((LHPX - LIST_TOP - 120) / ROW);

export interface BoardHost {
  /** Claude says it, in the room. */
  say(text: string): void;
  /** The build standing in the forge, for a board made from it. */
  build(): { ask: string; name: string; parts: PartLike[] } | null;
  /** Ask for a word, or stop asking: the keyboard of light in a headset, the box on a screen. */
  type(on: boolean, hint: string): void;
  /** Put the board away. */
  close(): void;
  /** Call Claude on the board: the person's words as they said them, read with the board and the node open. */
  understand(words: string, b: Board, sel: string | null): Promise<Understanding>;
  /** Listen for the words instead of typing them, where the browser can hear: false where it cannot. */
  listen(): boolean;
}
type Region = { x0: number; x1: number; y0: number; y1: number; act: string; id?: string };
type Typing = 'add' | 'find' | 'title' | 'ask';

function surface(w: number, h: number, pw: number, ph: number): { mesh: THREE.Mesh; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; c: HTMLCanvasElement } {
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  // a panel: drawn over the room (the machine and the robot may stand where it is), under the keyboard of light
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 14;
  return { mesh, g: c.getContext('2d')!, tex, c };
}
function wrap(g: CanvasRenderingContext2D, text: string, width: number, max = 99): string[] {
  const out: string[] = []; let line = '';
  for (const w of String(text).split(/\s+/)) { const next = line ? `${line} ${w}` : w; if (g.measureText(next).width > width && line) { out.push(line); line = w; } else line = next; }
  if (line) out.push(line);
  if (out.length > max) { out.length = max; out[max - 1] = `${out[max - 1]!.replace(/.{0,2}$/, '')}…`; }
  return out;
}
const fit2 = (g: CanvasRenderingContext2D, s: string, w: number) => { let t = s; while (t.length > 1 && g.measureText(t).width > w) t = t.slice(0, -2) + '…'; return t; };

export class Boards3D {
  readonly group = new THREE.Group();
  private readonly wall = surface(WALL_W, WALL_H, WPX, HPX);
  private readonly strip = surface(WALL_W, STRIP_H, WPX, SPX);
  private readonly list = surface(LIST_W, LIST_H, LPX, LHPX);
  private readonly measure = document.createElement('canvas').getContext('2d')!;
  id: string | null = null; view: View = 'categories'; sel: string | null = null; typing: Typing | null = null; find = '';
  private page = 0; private cam = { x: 60, y: 60, k: 1 }; private fitted = new Set<string>();
  private d: Derived = derive(null); private P = new Map<string, { x: number; y: number }>(); private geo = new Map<string, { w: number; h: number; lines: string[] }>();
  private stripHits: Region[] = []; private listHits: Region[] = [];
  private undoStack: { id: string; what: string; body: Board }[] = [];
  private drag: { node?: string; px: number; py: number; ox: number; oy: number; cam0: { x: number; y: number }; moved: boolean } | null = null;
  private confirmDel: { id: string; until: number } | null = null;
  private readonly plane = new THREE.Plane(); private readonly hitP = new THREE.Vector3();
  /** What came of calling Claude: what it understood, and the changes it proposes, each taken or not. */
  call: (Understanding & { done: Set<number> }) | null = null; calling = false;

  constructor(private readonly store: BoardStore, private readonly host: BoardHost) {
    this.group.add(this.wall.mesh, this.strip.mesh, this.list.mesh);
    this.strip.mesh.position.set(0, WALL_H / 2 + GAP + STRIP_H / 2, 0);
    // the list beside the wall, turned a little toward you
    const tilt = 0.32; this.list.mesh.rotation.y = -tilt;
    // with a gap, so its near corner never lies over the strip's end from where you stand
    this.list.mesh.position.set(WALL_W / 2 + 0.09 + (LIST_W / 2) * Math.cos(tilt), WALL_H / 2 + GAP + STRIP_H - LIST_H / 2, (LIST_W / 2) * Math.sin(tilt));
    this.group.visible = false;
    store.subscribe(() => { if (this.group.visible) this.refresh(); });
  }

  board(): Board | null { return this.id ? this.store.boards.get(this.id) ?? null : null; }
  /** Bring the board up: the one open last, else the first; with none, a board of the build standing here. */
  show(): string {
    this.group.visible = true;
    if (!this.store.boards.size) { const made = this.fromBuild(false); if (!made) this.refresh(); return made ?? 'No boards yet: press New board, or This build for a board of what stands here.'; }
    this.refresh();
    const b = this.board()!;
    return `${b.title}: ${nodesOf(b).length} nodes, ${categoriesOf(this.d).length} categories. Press a node to link it; ＋ Word adds one.`;
  }
  hide(): void { this.group.visible = false; this.stopTyping(); this.drag = null; }
  private pick(): void {
    if (this.id && this.store.boards.has(this.id)) return;
    let last: string | null = null; try { last = localStorage.getItem('nexus-boards:open'); } catch { /* fine */ }
    this.id = last && this.store.boards.has(last) ? last : [...this.store.boards.entries()].sort((a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0))[0]?.[0] ?? null;
  }
  private open(id: string | null): void { this.id = id; this.sel = null; this.page = 0; this.find = ''; try { if (id) localStorage.setItem('nexus-boards:open', id); } catch { /* fine */ } this.refresh(); }
  refresh(): void {
    this.pick();
    const b = this.board();
    if (this.sel && !(b?.nodes[this.sel] && !b.nodes[this.sel]!.deleted)) this.sel = null;
    this.layOut();
    const key = `${this.id}|${this.view}`;
    if (b && this.P.size && !this.fitted.has(key)) { this.fitted.add(key); this.fit(); }
    this.drawAll();
  }
  private boxOf = (label: string) => {
    const g = this.measure; g.font = `500 13px ${FONT}`;
    const lines = wrap(g, label || 'untitled', 190, 3), w = Math.max(104, Math.min(214, Math.max(...lines.map((l) => g.measureText(l).width)) + 30));
    return { w, h: 26 + lines.length * 16, lines };
  };
  private layOut(): void {
    const b = this.board(); this.geo.clear();
    if (!b) { this.d = derive(null); this.P = new Map(); return; }
    for (const n of nodesOf(b)) this.geo.set(n.id, this.boxOf(n.label));
    this.d = derive(b); this.P = placesOf(b, this.d, this.view, (id) => this.geo.get(id) ?? { w: 140, h: 44 });
  }
  fit(): void {
    if (!this.P.size) { this.cam = { x: 80, y: 80, k: 2 }; return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [id, p] of this.P) { const g = this.geo.get(id)!; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + g.w); y1 = Math.max(y1, p.y + g.h); }
    if (this.view === 'pipeline') y0 -= 40;
    // a word should be readable from where you stand: small boards are drawn large
    const k = Math.max(0.1, Math.min(2.6, Math.min((WPX - 120) / Math.max(1, x1 - x0), (HPX - 120) / Math.max(1, y1 - y0))));
    this.cam = { k, x: (WPX - (x1 - x0) * k) / 2 - x0 * k, y: Math.max(60, (HPX - (y1 - y0) * k) / 2) - y0 * k };
  }
  private zoom(f: number): void { const cx = WPX / 2, cy = HPX / 2, k = Math.max(0.08, Math.min(5, this.cam.k * f)); this.cam.x = cx - (cx - this.cam.x) * (k / this.cam.k); this.cam.y = cy - (cy - this.cam.y) * (k / this.cam.k); this.cam.k = k; }

  // ---- drawing ---------------------------------------------------------------------------------------------------------
  drawAll(): void { this.drawStrip(); this.drawWall(); this.drawList(); }
  private colour(id: string): string { return (this.d.deg.get(id) ?? 0) === 0 ? HUE[0]! : HUE[this.d.hue.get(this.d.root.get(id)!) ?? 1]!; }
  private tag(id: string): string { const lv = levelOf(this.d, id), b = this.board()!; return lv === 'unlinked' ? 'not linked yet' : lv === 'category' ? `category · ${this.d.deg.get(id)} links` : `${lv} · ${b.nodes[this.d.root.get(id)!]?.label ?? ''}`; }
  private drawStrip(): void {
    const { g, tex } = this.strip, b = this.board(); this.stripHits = [];
    g.clearRect(0, 0, WPX, SPX);
    g.fillStyle = 'rgba(3,12,19,0.95)'; g.beginPath(); g.roundRect(2, 2, WPX - 4, SPX - 4, 18); g.fill(); g.strokeStyle = '#4dd0e1'; g.lineWidth = 3; g.stroke();
    const items: [string, string, string?][] = [['prev', '‹'], ['title', fit2(g, b?.title ?? 'No board', 400)], ['next', '›'], ['word', '＋ Word', this.typing === 'add' ? 'on' : undefined], ['find', 'Find', this.typing === 'find' ? 'on' : undefined], ['cat', 'Categories', this.view === 'categories' ? 'on' : undefined], ['pipe', 'Pipeline', this.view === 'pipeline' ? 'on' : undefined], ['undo', 'Undo', this.undoStack.some((u) => u.id === this.id) ? undefined : 'off'], ['tidy', 'Tidy'], ['zout', '−'], ['fit', 'Fit'], ['zin', '+'], ['call', '🎙 Call Claude', this.typing === 'ask' || this.calling ? 'on' : undefined], ['build', 'This build'], ['new', 'New board', this.typing === 'title' ? 'on' : undefined], ['close', '✕']];
    g.font = `600 38px ${FONT}`; g.textBaseline = 'middle';
    const pad = 22, widths = items.map(([, t]) => g.measureText(t).width + pad * 2), total = widths.reduce((a, w) => a + w, 0), space = (WPX - 40 - total) / (items.length - 1);
    let x = 20;
    items.forEach(([act, text, state], i) => {
      const w = widths[i]!, on = state === 'on', off = state === 'off';
      if (act !== 'title') { g.fillStyle = on ? 'rgba(77,208,225,0.35)' : 'rgba(77,208,225,0.1)'; g.beginPath(); g.roundRect(x, 12, w, SPX - 24, 14); g.fill(); g.strokeStyle = act === 'close' ? '#ffd740' : on ? '#80deea' : 'rgba(77,208,225,0.55)'; g.lineWidth = 2; g.stroke(); }
      g.fillStyle = off ? 'rgba(230,247,255,0.35)' : act === 'title' ? '#ffffff' : '#e6f7ff'; g.textAlign = 'center'; g.fillText(text, x + w / 2, SPX / 2 + 2);
      if (act !== 'title') this.stripHits.push({ x0: x, x1: x + w, y0: 0, y1: SPX, act });
      x += w + space;
    });
    g.textAlign = 'left'; tex.needsUpdate = true;
  }
  private drawWall(): void {
    const { g, tex } = this.wall, b = this.board(), { x: vx, y: vy, k } = this.cam;
    g.clearRect(0, 0, WPX, HPX);
    g.fillStyle = 'rgba(3,12,19,0.95)'; g.beginPath(); g.roundRect(2, 2, WPX - 4, HPX - 4, 24); g.fill(); g.strokeStyle = 'rgba(77,208,225,0.7)'; g.lineWidth = 3; g.stroke();
    g.save(); g.beginPath(); g.roundRect(4, 4, WPX - 8, HPX - 8, 22); g.clip();
    // the sheet's dots, moving with it
    g.fillStyle = 'rgba(77,208,225,0.12)'; const step = 24 * k; if (step > 9) for (let x = ((vx % step) + step) % step; x < WPX; x += step) for (let y = ((vy % step) + step) % step; y < HPX; y += step) g.fillRect(x, y, 2, 2);
    if (!b || !this.P.size) {
      g.fillStyle = '#e6f7ff'; g.font = `600 64px ${FONT}`; g.textAlign = 'center'; g.fillText(b ? `${b.title} is empty` : 'No board yet', WPX / 2, HPX / 2 - 60);
      g.font = `400 40px ${FONT}`; g.fillStyle = '#9fdfee';
      g.fillText(b ? 'Press ＋ Word above and say or type a word: that is a node. Add a few, then press one and link it to others.' : 'Press New board, or This build for a board of the build standing here.', WPX / 2, HPX / 2 + 20);
      g.textAlign = 'left'; g.restore(); tex.needsUpdate = true; return;
    }
    const S = (p: { x: number; y: number }) => ({ x: vx + p.x * k, y: vy + p.y * k });
    const sel = this.sel, near = sel ? this.d.nb.get(sel) ?? new Set<string>() : new Set<string>();
    // steps of the pipeline, as columns
    if (this.view === 'pipeline') {
      const cols = new Map<number, { x: number; y: number; n: number }>();
      for (const [id, p] of this.P) { const s = this.d.deg.get(id) === 0 ? -1 : this.d.step.get(id) ?? 0, c = cols.get(s) ?? { x: Infinity, y: Infinity, n: 0 }; c.x = Math.min(c.x, p.x); c.y = Math.min(c.y, p.y); c.n++; cols.set(s, c); }
      const top = Math.min(...[...cols.values()].map((c) => c.y)) - 34;
      g.font = `600 ${Math.max(14, 11 * k)}px ${FONT}`; g.fillStyle = 'rgba(159,223,238,0.85)';
      for (const [s, c] of cols) { const q = S({ x: c.x, y: top }); g.fillText(`${s < 0 ? 'NOT LINKED' : `STEP ${s + 1}`} · ${c.n}`, q.x, q.y); }
    }
    // links: the tree's solid, a link across dashed and faint, a directed one amber with its arrow
    for (const e of edgesOf(b)) {
      const pa = this.P.get(e.from), pb = this.P.get(e.to), ga = this.geo.get(e.from), gb = this.geo.get(e.to); if (!pa || !pb || !ga || !gb) continue;
      const a = S({ x: pa.x + ga.w / 2, y: pa.y + ga.h / 2 }), c = S({ x: pb.x + gb.w / 2, y: pb.y + gb.h / 2 });
      const tree = this.d.parent.get(e.to) === e.from || this.d.parent.get(e.from) === e.to, across = STRUCT(e.rel) && !tree, lit = sel && (e.from === sel || e.to === sel);
      g.strokeStyle = lit ? '#ffffff' : !STRUCT(e.rel) ? 'rgba(255,183,77,0.85)' : across ? 'rgba(128,222,234,0.28)' : 'rgba(128,222,234,0.6)';
      g.lineWidth = Math.max(1.5, (lit ? 2.6 : 1.4) * k); g.setLineDash(across || BACK.has(e.rel ?? '') ? [6 * k, 6 * k] : []);
      const mx = (a.x + c.x) / 2; g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo(mx, a.y, mx, c.y, c.x, c.y); g.stroke(); g.setLineDash([]);
      if (!UNDIRECTED.has(e.rel ?? 'connects') && !STRUCT(e.rel)) { const ang = Math.atan2(c.y - a.y, c.x - a.x), r = 9 * k; g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(c.x - r * Math.cos(ang - 0.4), c.y - r * Math.sin(ang - 0.4)); g.lineTo(c.x - r * Math.cos(ang + 0.4), c.y - r * Math.sin(ang + 0.4)); g.fill(); }
    }
    // the nodes: index cards, the colour of their category, what the links make them over the word
    for (const [id, p] of this.P) {
      const gm = this.geo.get(id)!, q = S(p), w = gm.w * k, h = gm.h * k; if (q.x > WPX || q.y > HPX || q.x + w < 0 || q.y + h < 0) continue;
      const col = this.colour(id), on = id === sel, nb = near.has(id), deg = this.d.deg.get(id) ?? 0, lv = levelOf(this.d, id);
      g.fillStyle = on ? 'rgba(20,60,72,0.98)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(q.x, q.y, w, h, 7 * k); g.fill();
      g.strokeStyle = on ? '#ffffff' : nb ? '#80deea' : 'rgba(128,222,234,0.35)'; g.lineWidth = Math.max(1.5, (on ? 2.5 : nb ? 2 : 1) * k); g.stroke();
      g.fillStyle = col; g.beginPath(); g.roundRect(q.x, q.y + 5 * k, 4 * k, h - 10 * k, 2 * k); g.fill();
      if (k > 0.35) {
        g.font = `600 ${9.5 * k}px ${FONT}`; g.fillStyle = col; g.textBaseline = 'alphabetic'; g.fillText(fit2(g, (lv === 'unlinked' ? 'NOT LINKED' : `${lv} · ${deg}`).toUpperCase(), w - 16 * k), q.x + 13 * k, q.y + 15 * k);
        g.font = `500 ${13 * k}px ${FONT}`; g.fillStyle = '#ffffff'; gm.lines.forEach((l, i) => g.fillText(l, q.x + 13 * k, q.y + (33 + i * 16) * k));
      }
      if (b.notes?.[id]) { g.fillStyle = '#ff8a80'; g.beginPath(); g.arc(q.x + w - 8 * k, q.y + 8 * k, 4 * k, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    // the store's word, small, in the corner
    g.font = `400 26px ${FONT}`; g.fillStyle = 'rgba(159,223,238,0.7)'; g.fillText(`${nodesOf(b).length} nodes · ${edgesOf(b).length} links · ${categoriesOf(this.d).length} categories · ${this.store.status()}`, 28, HPX - 22);
    tex.needsUpdate = true;
  }
  private drawList(): void {
    const { g, tex } = this.list, b = this.board(); this.listHits = [];
    g.clearRect(0, 0, LPX, LHPX);
    g.fillStyle = 'rgba(3,12,19,0.95)'; g.beginPath(); g.roundRect(2, 2, LPX - 4, LHPX - 4, 22); g.fill(); g.strokeStyle = '#4dd0e1'; g.lineWidth = 3; g.stroke();
    g.textBaseline = 'alphabetic';
    const hit = (x0: number, y0: number, x1: number, y1: number, act: string, id?: string) => this.listHits.push({ x0, x1, y0, y1, act, ...(id ? { id } : {}) });
    const button = (x: number, y: number, w: number, h: number, text: string, act: string, accent = 'rgba(77,208,225,0.55)', id?: string) => { g.fillStyle = 'rgba(77,208,225,0.1)'; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.strokeStyle = accent; g.lineWidth = 2; g.stroke(); g.font = `600 32px ${FONT}`; g.fillStyle = '#e6f7ff'; g.textAlign = 'center'; g.fillText(text, x + w / 2, y + h / 2 + 11); g.textAlign = 'left'; hit(x, y, x + w, y + h, act, id); };
    if (b && (this.call || this.calling || this.typing === 'ask')) { this.drawCall(b, hit, button); tex.needsUpdate = true; return; }
    if (!b) { g.font = `600 44px ${FONT}`; g.fillStyle = '#e6f7ff'; g.fillText('Boards', 36, 80); g.font = `400 32px ${FONT}`; g.fillStyle = '#9fdfee'; wrap(g, 'A board is words and the links between them. Press New board above, or This build for a board of what stands here.', LPX - 72).forEach((l, i) => g.fillText(l, 36, 150 + i * 44)); tex.needsUpdate = true; return; }
    if (!this.sel) {
      // the board: what the links have made of it, every category a press away
      g.font = `600 44px ${FONT}`; g.fillStyle = '#ffffff'; wrap(g, b.title, LPX - 72, 2).forEach((l, i) => g.fillText(l, 36, 76 + i * 52));
      const cats = categoriesOf(this.d), loose = nodesOf(b).filter((n) => !this.d.deg.get(n.id)).length;
      g.font = `400 30px ${FONT}`; g.fillStyle = '#9fdfee';
      wrap(g, `${nodesOf(b).length} nodes, ${edgesOf(b).length} links. Each node sits under the neighbour with the most links, when it has more than the node; a node no neighbour outranks heads a category.${loose ? ` ${loose} not linked yet.` : ''}`, LPX - 72, 5).forEach((l, i) => g.fillText(l, 36, 190 + i * 40));
      g.font = `600 26px ${FONT}`; g.fillStyle = '#7fb3c8'; g.fillText(`CATEGORIES, FROM THE LINKS · ${cats.length}`, 36, LIST_TOP - 10);
      const shown = cats.slice(this.page * ROWS, this.page * ROWS + ROWS);
      shown.forEach((id, i) => {
        const y = LIST_TOP + i * ROW, col = this.colour(id);
        g.fillStyle = 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, y, LPX - 60, ROW - 10, 12); g.fill(); g.strokeStyle = 'rgba(128,222,234,0.35)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = col; g.beginPath(); g.arc(60, y + (ROW - 10) / 2, 10, 0, Math.PI * 2); g.fill();
        g.font = `500 34px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(fit2(g, b.nodes[id]!.label, LPX - 360), 86, y + 50);
        g.font = `500 24px ${FONT}`; g.fillStyle = '#9fdfee'; g.textAlign = 'right'; g.fillText(`${this.d.size.get(id)! - 1} under · ${this.d.deg.get(id)} links`, LPX - 48, y + 48); g.textAlign = 'left';
        hit(30, y, LPX - 30, y + ROW - 10, 'open', id);
      });
      if (!cats.length) { g.font = `400 30px ${FONT}`; g.fillStyle = '#9fdfee'; wrap(g, 'None yet: press a node and link it to others. The most connected become the categories.', LPX - 72).forEach((l, i) => g.fillText(l, 36, LIST_TOP + 40 + i * 42)); }
      this.pager(cats.length, button);
      tex.needsUpdate = true; return;
    }
    // a node: its name, where its links put it, and every other node to link with one press
    const id = this.sel, n = b.nodes[id]!, lk = this.d.nb.get(id) ?? new Set<string>(), lv = levelOf(this.d, id), deg = this.d.deg.get(id) ?? 0;
    g.fillStyle = this.colour(id); g.beginPath(); g.arc(46, 58, 12, 0, Math.PI * 2); g.fill();
    g.font = `600 46px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(fit2(g, n.label, LPX - 210), 70, 74);
    button(LPX - 120, 22, 90, 70, '✕', 'deselect', '#ffd740');
    g.font = `600 26px ${FONT}`; g.fillStyle = this.colour(id); g.fillText((lv === 'unlinked' ? 'NOT LINKED' : lv).toUpperCase(), 36, 128);
    const path = pathTo(this.d, id).map((x) => b.nodes[x]!.label);
    g.font = `400 28px ${FONT}`; g.fillStyle = '#9fdfee';
    wrap(g, deg === 0 ? 'Not linked to anything yet. Press the nodes below that it connects to.' : `${path.join(' › ')} · ${deg} link${deg === 1 ? '' : 's'}. ${lv === 'category' ? 'It heads a category: no node it links to has more links.' : `It sits under ${b.nodes[this.d.parent.get(id)!]!.label}, its most connected neighbour.`}`, LPX - 72, 4).forEach((l, i) => g.fillText(l, 36, 172 + i * 38));
    // the find box, pressed to type into
    const fy = 330; g.fillStyle = this.typing === 'find' ? 'rgba(77,208,225,0.22)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, fy, LPX - 60, 72, 12); g.fill(); g.strokeStyle = this.typing === 'find' ? '#80deea' : 'rgba(128,222,234,0.45)'; g.lineWidth = 2; g.stroke();
    g.font = `400 32px ${FONT}`; g.fillStyle = this.find ? '#ffffff' : '#7fb3c8'; g.fillText(this.find ? `${this.find}${this.typing === 'find' ? '▏' : ''}` : 'Find a node, or type a new one…', 52, fy + 47); hit(30, fy, LPX - 30, fy + 72, 'find');
    const rows = findNodes(b, this.d, this.find, id).sort((a, c) => (this.find ? 0 : Number(lk.has(c.id)) - Number(lk.has(a.id))));
    const exact = this.find.trim() && rows.some((r) => r.label.toLowerCase() === this.find.trim().toLowerCase());
    const list: { id?: string; add?: boolean }[] = [...(this.find.trim() && !exact && !rows.length ? [{ add: true }] : []), ...rows.map((r) => ({ id: r.id })), ...(this.find.trim() && !exact && rows.length ? [{ add: true }] : [])];
    const pages = Math.max(1, Math.ceil(list.length / ROWS)); if (this.page >= pages) this.page = pages - 1;
    list.slice(this.page * ROWS, this.page * ROWS + ROWS).forEach((r, i) => {
      const y = LIST_TOP + i * ROW, on = !!r.id && lk.has(r.id);
      g.fillStyle = on ? 'rgba(77,208,225,0.24)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, y, LPX - 150, ROW - 10, 12); g.fill(); g.strokeStyle = on ? '#80deea' : 'rgba(128,222,234,0.35)'; g.lineWidth = 2; g.setLineDash(r.add ? [10, 8] : []); g.stroke(); g.setLineDash([]);
      // the tick
      g.strokeStyle = on ? '#80deea' : '#7fb3c8'; g.lineWidth = 3; g.strokeRect(50, y + 22, 30, 30); if (on) { g.fillStyle = '#80deea'; g.fillRect(50, y + 22, 30, 30); g.strokeStyle = '#03141c'; g.beginPath(); g.moveTo(56, y + 38); g.lineTo(63, y + 45); g.lineTo(75, y + 29); g.stroke(); }
      if (r.add) { g.font = `500 32px ${FONT}`; g.fillStyle = '#e6f7ff'; g.fillText(fit2(g, `＋ Add “${this.find.trim()}” and link it`, LPX - 280), 100, y + 48); hit(30, y, LPX - 120, y + ROW - 10, 'add'); return; }
      g.font = `500 32px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(fit2(g, b.nodes[r.id!]!.label, LPX - 470), 100, y + 46);
      g.font = `500 22px ${FONT}`; g.fillStyle = '#9fdfee'; g.textAlign = 'right'; g.fillText(fit2(g, this.tag(r.id!), 260), LPX - 140, y + 46); g.textAlign = 'left';
      hit(30, y, LPX - 120, y + ROW - 10, 'row', r.id);
      button(LPX - 110, y, 80, ROW - 10, '›', 'open', 'rgba(77,208,225,0.55)', r.id);
    });
    if (!list.length) { g.font = `400 30px ${FONT}`; g.fillStyle = '#9fdfee'; wrap(g, 'Nothing else on the board yet. Press Find and type a word: it is added already linked to this.', LPX - 72).forEach((l, i) => g.fillText(l, 36, LIST_TOP + 40 + i * 42)); }
    this.pager(list.length, button);
    const dy = LHPX - 96, del = this.confirmDel && this.confirmDel.id === id && performance.now() < this.confirmDel.until;
    button(LPX - 330, dy, 300, 70, del ? 'Press again' : 'Delete node', 'delete', '#ff8a80');
    tex.needsUpdate = true;
  }
  /** Calling Claude: what you said, what was understood, the names for what you meant, and each change to take or leave. */
  private drawCall(b: Board, hit: (x0: number, y0: number, x1: number, y1: number, act: string, id?: string) => void, button: (x: number, y: number, w: number, h: number, text: string, act: string, accent?: string, id?: string) => void): void {
    const g = this.list.g, c = this.call;
    g.font = `600 30px ${FONT}`; g.fillStyle = c?.by === 'nexus' ? '#ffd740' : '#80deea';
    g.fillText(this.calling ? 'READING WHAT YOU MEANT…' : !c ? 'CALL CLAUDE' : c.by === 'claude' ? 'CLAUDE UNDERSTOOD' : 'READ BY NEXUS (CLAUDE NOT REACHABLE HERE)', 36, 60);
    button(LPX - 120, 18, 90, 64, '✕', 'dismiss', '#ffd740');
    let y = 110;
    const para = (text: string, size: number, colour: string, max = 8) => { g.font = `400 ${size}px ${FONT}`; g.fillStyle = colour; for (const l of wrap(g, text, LPX - 72, max)) { g.fillText(l, 36, y + size); y += size * 1.3; } y += 10; };
    if (!c) {
      para(this.typing === 'ask' ? 'Say it, or type it, in your own words: what you mean, what you are trying to get at, the thing you do not have the word for. I look at the board and work out what you mean.' : 'Press 🎙 Call Claude and say what you mean.', 32, '#e6f7ff', 9);
      if (this.sel) para(`About ${b.nodes[this.sel]?.label ?? ''}, the node open now.`, 28, '#9fdfee');
      para('e.g. “the spinny thing that pushes the wheels goes under motion”, “add rim and tyre to wheels”, “this needs a batery”', 26, '#7fb3c8', 5);
      return;
    }
    para(`You said: “${c.heard}”`, 28, '#ffe082', 4);
    para(c.understood, 32, '#ffffff', 7);
    for (const t of c.terms.slice(0, 4)) para(t.said === t.means ? `${t.means}: ${t.why}` : `“${t.said}” → ${t.means}: ${t.why}`, 25, '#9fdfee', 3);
    if (!c.proposals.length) { para(c.by === 'nexus' ? 'No change found in it. Your words are kept on the board for Claude to read when you ask in chat.' : 'No change proposed.', 26, '#7fb3c8', 3); return; }
    g.font = `600 26px ${FONT}`; g.fillStyle = '#7fb3c8'; g.fillText(`WHAT IT WOULD CHANGE · ${c.proposals.length}`, 36, y + 24); y += 40;
    const top = y, max = Math.floor((LHPX - 120 - top) / ROW);
    c.proposals.slice(0, max).forEach((p, i) => {
      const ry = top + i * ROW, done = c.done.has(i);
      g.fillStyle = done ? 'rgba(105,240,174,0.16)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, ry, LPX - 60, ROW - 10, 12); g.fill(); g.strokeStyle = done ? '#69f0ae' : 'rgba(128,222,234,0.4)'; g.lineWidth = 2; g.stroke();
      g.font = `500 28px ${FONT}`; g.fillStyle = done ? '#b9f6ca' : '#ffffff'; g.fillText(fit2(g, `${done ? '✓ ' : ''}${p.say}`, LPX - 300), 50, ry + 47);
      if (!done) { button(LPX - 230, ry + 6, 190, ROW - 22, 'Do it', 'take', '#69f0ae', String(i)); }
    });
    if (c.proposals.some((_, i) => !c.done.has(i))) button(30, LHPX - 96, 260, 70, 'Do all', 'takeall', '#69f0ae');
  }
  private pager(count: number, button: (x: number, y: number, w: number, h: number, text: string, act: string, accent?: string) => void): void {
    const pages = Math.max(1, Math.ceil(count / ROWS)); if (pages < 2) return;
    const y = LHPX - 96, g = this.list.g;
    button(30, y, 110, 70, '▲', 'up'); button(150, y, 110, 70, '▼', 'down');
    g.font = `500 26px ${FONT}`; g.fillStyle = '#9fdfee'; g.fillText(`${this.page + 1} of ${pages}`, 278, y + 46);
  }

  // ---- pointing: a press on the strip or the list acts; on the wall it opens a node, or holds it to move ------------------
  private uvOf(ray: THREE.Raycaster): { on: 'strip' | 'list' | 'wall'; uv: THREE.Vector2 } | null {
    if (!this.group.visible) return null;
    const h = ray.intersectObjects([this.strip.mesh, this.list.mesh, this.wall.mesh], false)[0];
    if (!h?.uv) return null;
    return { on: h.object === this.strip.mesh ? 'strip' : h.object === this.list.mesh ? 'list' : 'wall', uv: h.uv };
  }
  /** Whether a ray would press the board. */
  hits(ray: THREE.Raycaster): boolean { return !!this.uvOf(ray); }
  /** How far along a ray the board is (Infinity where it misses): what is nearer is pressed first. */
  distance(ray: THREE.Raycaster): number { return this.group.visible ? ray.intersectObjects([this.strip.mesh, this.list.mesh, this.wall.mesh], false)[0]?.distance ?? Infinity : Infinity; }
  /** The trigger pulled, or the mouse pressed: true when it is on the board. */
  down(ray: THREE.Raycaster): boolean {
    const u = this.uvOf(ray); if (!u) return false;
    if (u.on === 'strip') { const x = u.uv.x * WPX, r = this.stripHits.find((h) => x >= h.x0 && x <= h.x1); if (r) this.act(r.act); return true; }
    if (u.on === 'list') { const x = u.uv.x * LPX, y = (1 - u.uv.y) * LHPX, r = this.listHits.find((h) => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1); if (r) this.act(r.act, r.id); return true; }
    const px = u.uv.x * WPX, py = (1 - u.uv.y) * HPX, bx = (px - this.cam.x) / this.cam.k, by = (py - this.cam.y) / this.cam.k;
    const node = [...this.P].reverse().find(([id, p]) => { const gm = this.geo.get(id)!; return bx >= p.x && bx <= p.x + gm.w && by >= p.y && by <= p.y + gm.h; })?.[0];
    const p = node ? this.P.get(node)! : { x: 0, y: 0 };
    this.drag = { ...(node ? { node } : {}), px, py, ox: bx - p.x, oy: by - p.y, cam0: { x: this.cam.x, y: this.cam.y }, moved: false };
    return true;
  }
  get pressing(): boolean { return !!this.drag; }
  /** The ray moved while held: a node follows it across the wall, or the sheet does. */
  move(ray: THREE.Raycaster): void {
    const d = this.drag; if (!d) return;
    this.wall.mesh.updateMatrixWorld(); this.plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).transformDirection(this.wall.mesh.matrixWorld), this.wall.mesh.getWorldPosition(new THREE.Vector3()));
    if (!ray.ray.intersectPlane(this.plane, this.hitP)) return;
    const local = this.wall.mesh.worldToLocal(this.hitP.clone()), px = (local.x / WALL_W + 0.5) * WPX, py = (0.5 - local.y / WALL_H) * HPX;
    // a hand always trembles a little: it is a press until it has gone this far
    if (!d.moved && Math.hypot(px - d.px, py - d.py) < 18) return;
    d.moved = true;
    if (d.node) { const b = this.board()!, bx = (px - this.cam.x) / this.cam.k - d.ox, by = (py - this.cam.y) / this.cam.k - d.oy; this.P.set(d.node, { x: Math.round(bx), y: Math.round(by) }); void b; }
    else { this.cam.x = d.cam0.x + px - d.px; this.cam.y = d.cam0.y + py - d.py; }
    this.drawWall();
  }
  /** Let go: a node moved stays where it is; a press that did not move opens the node, or on the bare sheet closes it. */
  up(): void {
    const d = this.drag; this.drag = null; if (!d) return;
    if (d.node && d.moved) { const p = this.P.get(d.node)!; this.remember(`move ${this.label(d.node)}`); this.store.write(this.id!, moveNode(d.node, this.view, p.x, p.y)); return; }
    if (d.node) { this.sel = d.node; this.page = 0; this.find = ''; if (this.typing === 'find') this.host.type(true, `find or add a node linked to ${this.label(d.node)}`); this.drawAll(); return; }
    if (!d.moved && this.sel) { this.sel = null; this.page = 0; this.drawAll(); }
  }

  // ---- what the presses do ---------------------------------------------------------------------------------------------
  private label(id: string): string { return this.board()?.nodes[id]?.label ?? ''; }
  private remember(what: string): void { const b = this.board(); if (!b || !this.id) return; this.undoStack.push({ id: this.id, what, body: JSON.parse(JSON.stringify(b)) as Board }); if (this.undoStack.length > 40) this.undoStack.shift(); }
  act(act: string, id?: string): void {
    const b = this.board(), ids = [...this.store.boards.keys()].sort((a, c) => String(this.store.boards.get(a)!.title).localeCompare(String(this.store.boards.get(c)!.title)));
    switch (act) {
      case 'prev': case 'next': { if (!ids.length) return; const i = ids.indexOf(this.id ?? ''), j = (i + (act === 'next' ? 1 : -1) + ids.length) % ids.length; this.open(ids[j]!); this.host.say(`${this.board()!.title}.`); return; }
      case 'word': if (!b) { this.startTyping('title'); return; } this.typing === 'add' ? this.stopTyping() : this.startTyping('add'); return;
      case 'find': if (!this.sel) { this.host.say('Press a node first: Find looks for nodes to link to it.'); return; } this.typing === 'find' ? this.stopTyping() : this.startTyping('find'); return;
      case 'cat': case 'pipe': this.view = act === 'cat' ? 'categories' : 'pipeline'; this.refresh(); return;
      case 'undo': this.undo(); return;
      case 'tidy': { if (!b) return; const p = unpin(b, this.view); if (!p) { this.host.say('Nothing to tidy: every node is where its links put it.'); return; } this.remember('tidy'); this.store.write(this.id!, p); this.fitted.delete(`${this.id}|${this.view}`); return; }
      case 'zout': this.zoom(1 / 1.25); this.drawWall(); return;
      case 'zin': this.zoom(1.25); this.drawWall(); return;
      case 'fit': this.fit(); this.drawWall(); return;
      case 'build': { const said = this.fromBuild(true); if (said) this.host.say(said); return; }
      case 'call': if (!b) { this.host.say('Open or make a board first.'); return; } if (this.typing === 'ask') { this.stopTyping(); return; } this.call = null; this.startTyping('ask'); if (this.host.listen()) this.host.say('Listening: say what you mean.'); return;
      case 'dismiss': this.call = null; this.calling = false; if (this.typing === 'ask') this.stopTyping(); this.drawList(); this.drawStrip(); return;
      case 'take': if (id !== undefined) this.take(Number(id)); return;
      case 'takeall': if (this.call) this.call.proposals.forEach((_, i) => this.take(i)); return;
      case 'new': this.typing === 'title' ? this.stopTyping() : this.startTyping('title'); return;
      case 'close': this.host.close(); return;
      case 'deselect': this.sel = null; this.page = 0; this.find = ''; if (this.typing === 'find') this.stopTyping(); this.drawAll(); return;
      case 'up': this.page = Math.max(0, this.page - 1); this.drawList(); return;
      case 'down': this.page++; this.drawList(); return;
      case 'open': if (id) { this.sel = id; this.page = 0; this.find = ''; this.drawAll(); } return;
      case 'row': if (id && this.sel) this.toggle(this.sel, id); return;
      case 'add': if (this.sel && this.find.trim()) { const w = this.find.trim(); this.add(w, this.sel); this.find = ''; this.host.type(this.typing === 'find', `find or add a node linked to ${this.label(this.sel)}`); this.host.say(`${w}, linked to ${this.label(this.sel)}.`); } return;
      case 'delete': {
        if (!this.sel || !b) return;
        if (!(this.confirmDel && this.confirmDel.id === this.sel && performance.now() < this.confirmDel.until)) { this.confirmDel = { id: this.sel, until: performance.now() + 3000 }; this.drawList(); setTimeout(() => this.drawList(), 3100); return; }
        const name = this.label(this.sel); this.remember(`delete ${name}`); this.store.write(this.id!, deleteNode(b, this.sel)); this.sel = null; this.confirmDel = null; this.host.say(`Deleted ${name}. Undo brings it back.`); return;
      }
    }
  }
  /** A proposed change taken: made on the board as it is now, so a node added by an earlier one is there for a later. */
  private take(i: number): void {
    const c = this.call, b = this.board(); if (!c || !b || c.done.has(i)) return;
    const p = c.proposals[i]; if (!p) return;
    const name = (r: string) => (r.startsWith('@') ? r.slice(1) : b.nodes[r]?.label ?? r);
    if (p.op === 'rename') { if (!b.nodes[p.node] || b.nodes[p.node]!.deleted) return; this.remember(`rename ${b.nodes[p.node]!.label}`); this.store.write(this.id!, { nodes: { [p.node]: { label: p.to } } }); }
    else if (p.op === 'add') { const under = resolve(b, p.under); if (p.under && !under) { this.host.say(`Add ${name(p.under)} first.`); return; } this.add(p.label, under); }
    else { const a = resolve(b, p.a), d = resolve(b, p.c); if (!a || !d) { this.host.say(`Add ${!a ? name(p.a) : name(p.c)} first.`); return; } const linked = this.d.nb.get(a)?.has(d) ?? false; if (linked !== (p.op === 'link')) this.toggle(a, d); }
    c.done.add(i); this.drawList();
  }
  private toggle(a: string, c: string): void {
    const b = this.board(); if (!b) return;
    const t = toggleLink(b, a, c); if (!t) return;
    this.remember(`${t.linked ? 'link' : 'unlink'} ${this.label(a)} and ${this.label(c)}`);
    this.store.write(this.id!, t.patch);
  }
  private add(word: string, linkTo?: string): string | null {
    const b = this.board(); if (!b || !word.trim()) return null;
    const same = nodesOf(b).find((n) => n.label.toLowerCase() === word.trim().toLowerCase());
    if (same && !linkTo) { this.sel = same.id; this.drawAll(); this.host.say(`${same.label} is already on the board: here it is.`); return same.id; }
    if (same && linkTo) { if (!this.d.nb.get(linkTo)?.has(same.id)) this.toggle(linkTo, same.id); return same.id; }
    this.remember(`add ${word.trim()}`);
    const { id, patch } = addNode(word, linkTo); this.store.write(this.id!, patch);
    return id;
  }
  undo(): void {
    let i = this.undoStack.length - 1; while (i >= 0 && this.undoStack[i]!.id !== this.id) i--;
    if (i < 0) { this.host.say('Nothing to undo on this board.'); return; }
    const [u] = this.undoStack.splice(i, 1); this.store.write(u!.id, u!.body, true); this.host.say(`Undone: ${u!.what}.`);
  }
  /** A board of the build standing here: made, or made again from it as it stands now. */
  private fromBuild(say: boolean): string | null {
    const m = this.host.build(); if (!m || !m.parts.length) { if (say) this.host.say('Nothing stands here yet to make a board of.'); return null; }
    const id = `build-${m.ask.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`, was = this.store.boards.get(id);
    const b = boardOfBuild(m.ask, m.name, m.parts);
    if (was) { b.createdAt = was.createdAt ?? b.createdAt; if (was.review) b.review = was.review; if (was.notes) b.notes = was.notes; this.remember('make it again from the build'); }
    this.store.write(id, b, true); this.fitted.delete(`${id}|${this.view}`); this.open(id);
    return `${b.title}: ${nodesOf(b).length} nodes from ${m.parts.length} parts. ${this.board() ? `${categoriesOf(this.d).length} categories from its links.` : ''}`;
  }

  // ---- typing: a word for a node, a word to find, a board's name -------------------------------------------------------
  private hint(t: Typing): string { return t === 'ask' ? 'say or type what you mean, in your own words' : t === 'add' ? 'a word for a new node, then send' : t === 'find' ? `find or add a node linked to ${this.label(this.sel ?? '')}` : 'a name for the new board, then send'; }
  startTyping(t: Typing): void { this.typing = t; if (t === 'find') this.find = ''; this.host.type(true, this.hint(t)); this.drawAll(); }
  stopTyping(): void { if (!this.typing) return; this.typing = null; this.host.type(false, ''); if (this.group.visible) this.drawAll(); }
  /** What is typed so far: the list follows a word being found. */
  key(text: string): void { if (this.typing === 'find') { this.find = text; this.page = 0; this.drawList(); } }
  /** A word sent, typed or said. */
  enter(text: string): void {
    const w = text.trim(); if (!w || !this.typing) return;
    if (this.typing === 'ask') { void this.ask(w); return; }
    if (this.typing === 'title') {
      const id = uid('b'), at = Date.now();
      this.store.write(id, { title: w.slice(0, 80), kind: 'categories', about: '', nodes: {}, edges: {}, createdAt: at, updatedAt: at }, true);
      this.open(id); this.startTyping('add'); this.host.say(`${w}: say or type a word for each node.`); return;
    }
    if (this.typing === 'add') { const id = this.add(w); if (id) { this.sel = id; this.page = 0; this.find = ''; } this.host.type(true, this.hint('add')); this.drawAll(); return; }
    // find: a word that names a node links it, else it is added linked
    const b = this.board(); if (!b || !this.sel) return;
    const hit = findNodes(b, this.d, w, this.sel)[0];
    if (hit && hit.label.toLowerCase() === w.toLowerCase()) this.toggle(this.sel, hit.id);
    else this.add(w, this.sel);
    this.find = ''; this.host.type(true, this.hint('find')); this.drawList();
  }

  /** Call Claude with the words: it reads them with the board, and what it understood is laid out to take or leave. */
  async ask(words: string): Promise<void> {
    const b = this.board(), id = this.id; if (!b || !id) return;
    this.stopTyping(); this.calling = true; this.call = null; this.drawList(); this.drawStrip();
    let u: Understanding;
    try { u = await this.host.understand(words, b, this.sel); } finally { this.calling = false; }
    this.call = { ...u, done: new Set() };
    // kept on the board: what was said and what was understood, for Claude to read back
    const cur = this.store.boards.get(id); if (cur) this.store.write(id, { calls: [...(cur.calls ?? []), { words, understood: u.understood, by: u.by, at: Date.now(), ...(this.sel ? { node: this.sel } : {}) }].slice(-30) });
    this.host.say(u.understood);
    this.drawAll();
  }

  // ---- for a test, and for Claude: where things are on the board ---------------------------------------------------------
  /** The world point of a node on the wall (by its label), a strip control, or a list row or control. */
  pointOf(on: 'node' | 'strip' | 'list', key: string): THREE.Vector3 | null {
    const b = this.board(); let mesh: THREE.Mesh, u: number, v: number;
    if (on === 'node') {
      const id = b ? nodesOf(b).find((n) => n.label === key)?.id : undefined, p = id ? this.P.get(id) : undefined; if (!id || !p) return null;
      const gm = this.geo.get(id)!; mesh = this.wall.mesh; u = (this.cam.x + (p.x + gm.w / 2) * this.cam.k) / WPX; v = 1 - (this.cam.y + (p.y + gm.h / 2) * this.cam.k) / HPX;
      if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    } else if (on === 'strip') { const r = this.stripHits.find((h) => h.act === key); if (!r) return null; mesh = this.strip.mesh; u = (r.x0 + r.x1) / 2 / WPX; v = 0.5; }
    else { const [act, label] = key.split(':'); const id = label && b ? nodesOf(b).find((n) => n.label === label)?.id : undefined; const r = this.listHits.find((h) => h.act === act && (!label || h.id === id)); if (!r) return null; mesh = this.list.mesh; u = (r.x0 + r.x1) / 2 / LPX; v = 1 - (r.y0 + r.y1) / 2 / LHPX; }
    const geo = mesh.geometry as THREE.PlaneGeometry, { width, height } = geo.parameters;
    mesh.updateMatrixWorld(); return mesh.localToWorld(new THREE.Vector3((u - 0.5) * width, (v - 0.5) * height, 0.001));
  }
  /** The board as it stands, in words: what the links make of it. */
  summary(): string {
    const b = this.board(); if (!b) return 'No board open.';
    const cats = categoriesOf(this.d).slice(0, 8).map((id) => `${b.nodes[id]!.label} (${this.d.size.get(id)! - 1} under)`);
    return `${b.title}: ${nodesOf(b).length} nodes, ${edgesOf(b).length} links; categories by their links: ${cats.join(', ') || 'none yet'}.`;
  }
}
