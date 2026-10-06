// The node board in the room (src/nexus/boards.ts): a wall of words and the links between them in front of you, a list
// beside it of every other node, and a strip of controls above. Point at a node and press to open its list; press a row
// to link it or unlink it, one press each, so you go down the list linking; hold a node (the right grip in a headset,
// the mouse on a screen) and move to drag it, and let go to leave it there. A word comes from the keyboard of light or
// your voice: one word is a node, nothing else is asked. What each node is (a category, a subcategory, …) is what its links make it, and the pipeline view is
// the same nodes in the order they are derived. Each surface is one canvas, so a board of hundreds of nodes is three
// textures, not hundreds.
//
// A pipeline is a board whose nodes are steps (src/nexus/flows.ts): each says what it does in a word or two, a link from
// one to the next runs them in that order, ▶ Run runs it, Armed lets its trigger start it by itself, and every step
// shows on its card what it did as it runs.

import * as THREE from 'three';
import { BACK, STRUCT, UNDIRECTED, addNode, boardOfBuild, boardOfKnowledge, categoriesOf, deleteNode, derive, edgesOf, findNodes, levelOf, moveNode, nodesOf, pathTo, placesOf, toggleLink, unpin, uid, type Board, type Derived, type PartLike, type View } from '../boards';
import type { BoardStore } from './boards-store';
import { resolve, type Understanding } from '../understand';
import { TAXONOMY, find as findKnown, type Node as TaxNode } from '../embody/taxonomy';
import { SUGGEST, TEMPLATES, boardOfTemplate, graphOf, guessStep, keptRun, orderFrom, runFlow, saidOf, starts, stepOf, triggerOf, triggersOf, type FlowApi, type FlowEvent, type FlowRun, type Step, type StepKind, type StepRun } from '../flows';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const HUE = ['#78909c', '#80deea', '#69f0ae', '#ffd740', '#ff8a80', '#b388ff', '#ffb74d', '#90caf9', '#f48fb1'];
export const WALL_W = 2.1, WALL_H = 1.18, STRIP_H = 0.085, LIST_W = 0.62, GAP = 0.015;
const LIST_H = WALL_H + STRIP_H + GAP;
const WPX = 2560, HPX = Math.round((WPX * WALL_H) / WALL_W), SPX = Math.round((WPX * STRIP_H) / WALL_W), LPX = 1024, LHPX = Math.round((LPX * LIST_H) / LIST_W);
const ROW = 84, LIST_TOP = 420, ROWS = Math.floor((LHPX - LIST_TOP - 120) / ROW);
/** A step's kind, as its card names it and its colour. */
const KIND: Record<StepKind | 'plain', [string, string]> = { trigger: ['TRIGGER', '#ffd740'], ai: ['AI', '#b388ff'], action: ['ACTION', '#80deea'], check: ['CHECK', '#69f0ae'], repeat: ['REPEAT', '#ffb74d'], plain: ['STEP', '#78909c'] };
const DONE: Record<StepRun['status'], [string, string]> = { ok: ['✓', '#69f0ae'], no: ['NOT ON', '#ffd740'], failed: ['FAILED', '#ff5252'], skipped: ['SKIPPED', '#78909c'] };
const FIRST: Record<StepKind, string> = { trigger: 'when I press run', ai: 'Say, in one sentence, what to do about this: {input}', action: 'flaws', check: 'flaws > 0', repeat: 'until flaws = 0, at most 3 times' };
const ago = (t: number) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`; };

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
  /** What a pipeline's steps act through: the room's own actions, Claude (or Nexus, saying so), and its numbers. */
  flowApi(): FlowApi;
}
type Region = { x0: number; x1: number; y0: number; y1: number; act: string; id?: string };
type Typing = 'add' | 'find' | 'title' | 'ask' | 'what';
/** How a hand is on the board: the mouse both presses and drags; in a headset the trigger presses and the grip holds. */
export type Hold = 'both' | 'press' | 'grab';

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
  private drag: { node?: string; px: number; py: number; ox: number; oy: number; cam0: { x: number; y: number }; moved: boolean; how: Hold } | null = null;
  private confirmDel: { id: string; until: number } | null = null;
  private readonly plane = new THREE.Plane(); private readonly hitP = new THREE.Vector3();
  /** What came of calling Claude: what it understood, and the changes it proposes, each taken or not. */
  call: (Understanding & { done: Set<number> }) | null = null; calling = false;
  /** The list shows the pipelines to start from; the last run in full; a step's words being typed. */
  picking = false; log = false; knowing = false; private draft = '';
  /** Pipelines running now, by board, and when each last started by itself. */
  readonly running = new Map<string, { from: string; run: FlowRun | null; ac: AbortController }>(); private auto = new Map<string, number>();

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
  private open(id: string | null): void { this.id = id; this.sel = null; this.page = 0; this.find = ''; this.log = false; if (id && this.store.boards.get(id)?.kind === 'flow') this.view = 'pipeline'; try { if (id) localStorage.setItem('nexus-boards:open', id); } catch { /* fine */ } this.refresh(); }
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
    const flow = b?.kind === 'flow', live = !!this.id && this.running.has(this.id);
    g.font = `600 38px ${FONT}`;
    const items: [string, string, string?][] = [['prev', '‹'], ['title', fit2(g, b?.title ?? 'No board', flow ? 320 : 400)], ['next', '›'],
      ...(flow ? [['run', live ? '■ Stop' : '▶ Run', live ? 'on' : undefined], ['arm', b!.armed ? '⚡ Armed' : 'Arm', b!.armed ? 'on' : undefined], ['log', 'Log', this.log ? 'on' : b!.runs?.length || live ? undefined : 'off']] as [string, string, string?][] : []),
      ['word', flow ? '＋ Step' : '＋ Word', this.typing === 'add' ? 'on' : undefined], ['find', 'Find', this.typing === 'find' ? 'on' : undefined], ['cat', 'Categories', this.view === 'categories' ? 'on' : undefined], ['pipe', 'Pipeline', this.view === 'pipeline' ? 'on' : undefined], ['undo', 'Undo', this.undoStack.some((u) => u.id === this.id) ? undefined : 'off'], ['tidy', 'Tidy'], ['zout', '−'], ['fit', 'Fit'], ['zin', '+'], ['call', '🎙 Call Claude', this.typing === 'ask' || this.calling ? 'on' : undefined], ['flows', '⚡ Pipelines', this.picking ? 'on' : undefined], ['know', '📚 Knowledge', this.knowing ? 'on' : undefined], ['build', 'This build'], ['new', 'New board', this.typing === 'title' ? 'on' : undefined], ['close', '✕']];
    g.textBaseline = 'middle';
    // as many controls as there are, each still a press wide: the words get smaller before they run off the end
    let fs = 38, pad = 22, widths: number[] = [];
    for (;;) { g.font = `600 ${fs}px ${FONT}`; widths = items.map(([, t]) => g.measureText(t).width + pad * 2); if (widths.reduce((a, w) => a + w, 0) + (items.length - 1) * 8 <= WPX - 40 || fs <= 22) break; fs -= 2; pad = Math.max(12, pad - 1); }
    const total = widths.reduce((a, w) => a + w, 0), space = (WPX - 40 - total) / (items.length - 1);
    let x = 20;
    items.forEach(([act, text, state], i) => {
      const w = widths[i]!, on = state === 'on', off = state === 'off';
      if (act !== 'title') { g.fillStyle = on ? (act === 'run' ? 'rgba(255,82,82,0.35)' : 'rgba(77,208,225,0.35)') : act === 'run' ? 'rgba(105,240,174,0.22)' : 'rgba(77,208,225,0.1)'; g.beginPath(); g.roundRect(x, 12, w, SPX - 24, 14); g.fill(); g.strokeStyle = act === 'close' ? '#ffd740' : act === 'run' ? (on ? '#ff8a80' : '#69f0ae') : on ? '#80deea' : 'rgba(77,208,225,0.55)'; g.lineWidth = 2; g.stroke(); }
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
    // the nodes: index cards, the colour of their category, what the links make them over the word; on a pipeline, the
    // colour of what the step does, and what it did in the run, the one running lit
    const flow = b.kind === 'flow', sh = flow ? this.shown(b) : null;
    for (const [id, p] of this.P) {
      const gm = this.geo.get(id)!, q = S(p), w = gm.w * k, h = gm.h * k; if (q.x > WPX || q.y > HPX || q.x + w < 0 || q.y + h < 0) continue;
      const on = id === sel, nb = near.has(id), deg = this.d.deg.get(id) ?? 0, lv = levelOf(this.d, id);
      const kd = KIND[(flow && stepOf(b, id)?.kind) || 'plain'], done = sh?.last.get(id), now = sh?.next === id, col = flow ? kd[1] : this.colour(id);
      g.fillStyle = now ? 'rgba(52,52,18,0.98)' : on ? 'rgba(20,60,72,0.98)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(q.x, q.y, w, h, 7 * k); g.fill();
      g.strokeStyle = now ? '#ffffff' : on ? '#ffffff' : done ? DONE[done.status][1] : nb ? '#80deea' : 'rgba(128,222,234,0.35)'; g.lineWidth = Math.max(1.5, (now ? 3.5 : on ? 2.5 : done || nb ? 2 : 1) * k); g.stroke();
      g.fillStyle = col; g.beginPath(); g.roundRect(q.x, q.y + 5 * k, 4 * k, h - 10 * k, 2 * k); g.fill();
      if (k > 0.35) {
        const tag = flow ? `${kd[0]}${now ? ' · RUNNING…' : done ? ` · ${DONE[done.status][0]}${done.by ? ` · ${done.by.toUpperCase()}` : ''}` : ''}` : (lv === 'unlinked' ? 'NOT LINKED' : `${lv} · ${deg}`).toUpperCase();
        g.font = `600 ${9.5 * k}px ${FONT}`; g.fillStyle = flow && done && !now ? DONE[done.status][1] : col; g.textBaseline = 'alphabetic'; g.fillText(fit2(g, tag, w - 16 * k), q.x + 13 * k, q.y + 15 * k);
        g.font = `500 ${13 * k}px ${FONT}`; g.fillStyle = '#ffffff'; gm.lines.forEach((l, i) => g.fillText(l, q.x + 13 * k, q.y + (33 + i * 16) * k));
      }
      if (b.notes?.[id]) { g.fillStyle = '#ff8a80'; g.beginPath(); g.arc(q.x + w - 8 * k, q.y + 8 * k, 4 * k, 0, Math.PI * 2); g.fill(); }
      // what Nexus makes, on a board of what it knows
      if (b.nodes[id]?.kind === 'made') { g.fillStyle = '#69f0ae'; g.beginPath(); g.arc(q.x + w - 19 * k, q.y + 8 * k, 4 * k, 0, Math.PI * 2); g.fill(); }
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
    if (this.picking) { this.drawPicker(hit, button); tex.needsUpdate = true; return; }
    if (this.knowing) { this.drawKnow(hit, button); tex.needsUpdate = true; return; }
    if (b?.kind === 'flow' && this.log) { this.drawLog(b, button); tex.needsUpdate = true; return; }
    if (b?.kind === 'flow' && !this.sel) { this.drawFlow(b, hit, button); tex.needsUpdate = true; return; }
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
    const flow = b.kind === 'flow', st = flow ? stepOf(b, id) : null;
    let fy = 330, top = LIST_TOP;
    if (flow) { this.drawStep(b, id, st, hit); fy = 720; top = 850; }
    else {
      g.font = `600 26px ${FONT}`; g.fillStyle = this.colour(id); g.fillText((lv === 'unlinked' ? 'NOT LINKED' : lv).toUpperCase(), 36, 128);
      const path = pathTo(this.d, id).map((x) => b.nodes[x]!.label);
      g.font = `400 28px ${FONT}`; g.fillStyle = '#9fdfee';
      const said = wrap(g, deg === 0 ? 'Not linked to anything yet. Press the nodes below that it connects to.' : `${path.join(' › ')} · ${deg} link${deg === 1 ? '' : 's'}. ${lv === 'category' ? 'It heads a category: no node it links to has more links.' : `It sits under ${b.nodes[this.d.parent.get(id)!]!.label}, its most connected neighbour.`}`, LPX - 72, 4);
      said.forEach((l, i) => g.fillText(l, 36, 172 + i * 38));
      // what it is, where the board knows: its note (on a board of what Nexus knows, what it is, its law, what makes it)
      if (n.note) {
        g.font = `400 26px ${FONT}`; g.fillStyle = n.kind === 'made' ? '#b9f6ca' : '#e6f7ff';
        const lines = wrap(g, n.note, LPX - 72, 7), y0 = 172 + said.length * 38 + 14; lines.forEach((l, i) => g.fillText(l, 36, y0 + i * 34));
        const more = Math.max(0, y0 + lines.length * 34 - 310); fy += more; top += more;
      }
    }
    // the find box, pressed to type into
    g.fillStyle = this.typing === 'find' ? 'rgba(77,208,225,0.22)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, fy, LPX - 60, 72, 12); g.fill(); g.strokeStyle = this.typing === 'find' ? '#80deea' : 'rgba(128,222,234,0.45)'; g.lineWidth = 2; g.stroke();
    g.font = `400 32px ${FONT}`; g.fillStyle = this.find ? '#ffffff' : '#7fb3c8'; g.fillText(this.find ? `${this.find}${this.typing === 'find' ? '▏' : ''}` : flow ? 'Find a step, or type a new one to run after it…' : 'Find a node, or type a new one…', 52, fy + 47); hit(30, fy, LPX - 30, fy + 72, 'find');
    if (flow) { g.font = `600 24px ${FONT}`; g.fillStyle = '#7fb3c8'; g.fillText(st?.kind === 'repeat' ? 'PRESS THE STEP IT GOES BACK TO, EACH ROUND' : 'PRESS A STEP TO RUN IT AFTER THIS ONE; AGAIN TO UNLINK', 36, top - 16); }
    const rows = this.rowsFrom(top);
    const found = findNodes(b, this.d, this.find, id).sort((a, c) => (this.find ? 0 : Number(lk.has(c.id)) - Number(lk.has(a.id))));
    const exact = this.find.trim() && found.some((r) => r.label.toLowerCase() === this.find.trim().toLowerCase());
    const list: { id?: string; add?: boolean }[] = [...(this.find.trim() && !exact && !found.length ? [{ add: true }] : []), ...found.map((r) => ({ id: r.id })), ...(this.find.trim() && !exact && found.length ? [{ add: true }] : [])];
    const pages = Math.max(1, Math.ceil(list.length / rows)); if (this.page >= pages) this.page = pages - 1;
    list.slice(this.page * rows, this.page * rows + rows).forEach((r, i) => {
      const y = top + i * ROW, on = !!r.id && lk.has(r.id);
      g.fillStyle = on ? 'rgba(77,208,225,0.24)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, y, LPX - 150, ROW - 10, 12); g.fill(); g.strokeStyle = on ? '#80deea' : 'rgba(128,222,234,0.35)'; g.lineWidth = 2; g.setLineDash(r.add ? [10, 8] : []); g.stroke(); g.setLineDash([]);
      // the tick
      g.strokeStyle = on ? '#80deea' : '#7fb3c8'; g.lineWidth = 3; g.strokeRect(50, y + 22, 30, 30); if (on) { g.fillStyle = '#80deea'; g.fillRect(50, y + 22, 30, 30); g.strokeStyle = '#03141c'; g.beginPath(); g.moveTo(56, y + 38); g.lineTo(63, y + 45); g.lineTo(75, y + 29); g.stroke(); }
      if (r.add) { g.font = `500 32px ${FONT}`; g.fillStyle = '#e6f7ff'; g.fillText(fit2(g, `＋ Add “${this.find.trim()}” and link it`, LPX - 280), 100, y + 48); hit(30, y, LPX - 120, y + ROW - 10, 'add'); return; }
      g.font = `500 32px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(fit2(g, b.nodes[r.id!]!.label, LPX - 470), 100, y + 46);
      g.font = `500 22px ${FONT}`; g.fillStyle = flow ? KIND[stepOf(b, r.id!)?.kind ?? 'plain'][1] : '#9fdfee'; g.textAlign = 'right'; g.fillText(fit2(g, flow ? this.flowTag(b, id, r.id!) : this.tag(r.id!), 260), LPX - 140, y + 46); g.textAlign = 'left';
      hit(30, y, LPX - 120, y + ROW - 10, 'row', r.id);
      button(LPX - 110, y, 80, ROW - 10, '›', 'open', 'rgba(77,208,225,0.55)', r.id);
    });
    if (!list.length) { g.font = `400 30px ${FONT}`; g.fillStyle = '#9fdfee'; wrap(g, 'Nothing else on the board yet. Press Find and type a word: it is added already linked to this.', LPX - 72).forEach((l, i) => g.fillText(l, 36, top + 40 + i * 42)); }
    this.pager(list.length, button, rows);
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
  private rowsFrom = (top: number) => Math.max(1, Math.floor((LHPX - top - 120) / ROW));
  private pager(count: number, button: (x: number, y: number, w: number, h: number, text: string, act: string, accent?: string) => void, rows = ROWS): void {
    const pages = Math.max(1, Math.ceil(count / rows)); if (pages < 2) return;
    const y = LHPX - 96, g = this.list.g;
    button(30, y, 110, 70, '▲', 'up'); button(150, y, 110, 70, '▼', 'down');
    g.font = `500 26px ${FONT}`; g.fillStyle = '#9fdfee'; g.fillText(`${this.page + 1} of ${pages}`, 278, y + 46);
  }

  // ---- pipelines: what to start from, the flow and its run, a step and what it does ------------------------------------
  /** The run shown: the one going now, else the last kept; what each step did in it, and what runs next. */
  private shown(b: Board): { run: FlowRun | null; live: boolean; last: Map<string, StepRun>; next: string | null } {
    const r = this.id ? this.running.get(this.id) : undefined, run = r ? r.run : b.runs?.at(-1) ?? null, last = new Map<string, StepRun>();
    for (const x of run?.steps ?? []) last.set(x.node, x);
    let next: string | null = null;
    if (r && (!run || run.status === 'running')) {
      const end = run?.steps.at(-1), g = graphOf(b);
      if (!end) next = r.from;
      else if (end.kind === 'repeat' && end.status === 'ok' && /^Again/.test(end.output)) next = g.back.get(end.node) ?? null;
      else { const order = orderFrom(b, g, r.from); next = order[order.indexOf(end.node) + 1] ?? null; }
    }
    return { run, live: !!r, last, next };
  }
  /** How a step stands to the one open: after it, before it, where its loop goes back to; else what it does. */
  private flowTag(b: Board, sel: string, id: string): string {
    const e = edgesOf(b).find((x) => (x.from === sel && x.to === id) || (x.from === id && x.to === sel));
    if (!e) return KIND[stepOf(b, id)?.kind ?? 'plain'][0].toLowerCase();
    if (BACK.has(e.rel ?? '')) return e.from === sel ? 'it goes back to this' : 'comes back here';
    return e.from === sel ? 'runs after this' : 'runs before this';
  }
  private para(y: number, text: string, size: number, colour: string, max = 6, weight = 400): number { const g = this.list.g; g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = colour; for (const l of wrap(g, text, LPX - 72, max)) { g.fillText(l, 36, y + size); y += size * 1.3; } return y + 8; }
  private drawPicker(hit: (x0: number, y0: number, x1: number, y1: number, act: string, id?: string) => void, button: (x: number, y: number, w: number, h: number, text: string, act: string, accent?: string, id?: string) => void): void {
    const g = this.list.g;
    g.font = `600 44px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText('⚡ Pipelines', 36, 76); button(LPX - 120, 22, 90, 70, '✕', 'closepick', '#ffd740');
    let y = this.para(110, 'A pipeline is a board of steps. A trigger starts it; then AI calls, actions on the room, checks that let it on only where they hold, and repeats that go round until they hold, each in the order its links say. Press one to start from; its steps are yours to change.', 28, '#9fdfee', 7);
    g.font = `600 26px ${FONT}`; g.fillStyle = '#7fb3c8'; g.fillText('START FROM', 36, y + 30); y += 50;
    for (const t of TEMPLATES) {
      g.fillStyle = 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, y, LPX - 60, 150, 12); g.fill(); g.strokeStyle = 'rgba(255,215,64,0.55)'; g.lineWidth = 2; g.stroke();
      g.font = `600 32px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(fit2(g, t.title, LPX - 120), 52, y + 46);
      g.font = `400 22px ${FONT}`; g.fillStyle = '#9fdfee'; wrap(g, t.about, LPX - 120, 3).forEach((l, i) => g.fillText(l, 52, y + 82 + i * 28));
      hit(30, y, LPX - 30, y + 150, 'tpl', t.id); y += 162;
    }
    const mine = [...this.store.boards.entries()].filter(([, x]) => x.kind === 'flow').sort((a, c) => (c[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0));
    g.font = `600 26px ${FONT}`; g.fillStyle = '#7fb3c8'; g.fillText(`YOURS · ${mine.length}`, 36, y + 30); y += 50;
    if (!mine.length) { this.para(y, 'None yet: press one above.', 28, '#7fb3c8'); return; }
    for (const [id, x] of mine.slice(0, Math.max(0, Math.floor((LHPX - y - 30) / ROW)))) {
      const live = this.running.has(id), last = x.runs?.at(-1);
      g.fillStyle = 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, y, LPX - 60, ROW - 10, 12); g.fill(); g.strokeStyle = x.armed ? '#ffd740' : 'rgba(128,222,234,0.35)'; g.lineWidth = 2; g.stroke();
      g.font = `500 30px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(fit2(g, `${x.armed ? '⚡ ' : ''}${x.title}`, LPX - 380), 52, y + 46);
      g.font = `500 22px ${FONT}`; g.fillStyle = live ? '#ffffff' : last ? (last.status === 'done' ? '#69f0ae' : last.status === 'failed' ? '#ff8a80' : '#ffd740') : '#7fb3c8'; g.textAlign = 'right'; g.fillText(live ? 'running…' : last ? `${last.status} · ${ago(last.ended ?? last.started)}` : 'not run yet', LPX - 52, y + 46); g.textAlign = 'left';
      hit(30, y, LPX - 30, y + ROW - 10, 'openb', id); y += ROW;
    }
  }
  /** What Nexus knows, a board of each branch a press away: how many entries it has, how many Nexus makes. */
  private drawKnow(hit: (x0: number, y0: number, x1: number, y1: number, act: string, id?: string) => void, button: (x: number, y: number, w: number, h: number, text: string, act: string, accent?: string, id?: string) => void): void {
    const g = this.list.g;
    g.font = `600 44px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText('📚 What Nexus knows', 36, 76); button(LPX - 120, 22, 90, 70, '✕', 'closeknow', '#ffd740');
    let y = this.para(110, 'Each is a branch of Nexus\'s taxonomy: what each thing is, the law that decides it, and whether Nexus makes or measures it (● on the board) or knows it by name and law only. Press one for a board of it.', 28, '#9fdfee', 6);
    const count = (t: TaxNode) => { let e = 0, m = 0; const w = (x: TaxNode) => { for (const c of x.children) { e++; if (c.made) m++; w(c); } }; w(t); return { e, m }; };
    for (const t of TAXONOMY.slice(0, Math.max(0, Math.floor((LHPX - y - 30) / ROW)))) {
      const { e, m } = count(t), open = this.id === `know-${t.id}`;
      g.fillStyle = open ? 'rgba(77,208,225,0.24)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, y, LPX - 60, ROW - 10, 12); g.fill(); g.strokeStyle = m ? 'rgba(105,240,174,0.6)' : 'rgba(128,222,234,0.35)'; g.lineWidth = 2; g.stroke();
      g.font = `500 32px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(fit2(g, t.name, LPX - 420), 52, y + 48);
      g.font = `500 23px ${FONT}`; g.fillStyle = '#9fdfee'; g.textAlign = 'right'; g.fillText(`${e} entries${m ? ` · ${m} made` : ''}`, LPX - 52, y + 46); g.textAlign = 'left';
      hit(30, y, LPX - 30, y + ROW - 10, 'kb', t.id); y += ROW;
    }
  }
  /** A pipeline with no step open: what starts it, how its last run went, and its steps in the order they run. */
  private drawFlow(b: Board, hit: (x0: number, y0: number, x1: number, y1: number, act: string, id?: string) => void, button: (x: number, y: number, w: number, h: number, text: string, act: string, accent?: string, id?: string) => void): void {
    const g = this.list.g, sh = this.shown(b), ts = triggersOf(b);
    g.font = `600 40px ${FONT}`; g.fillStyle = '#ffffff'; let y = 30; for (const l of wrap(g, b.title, LPX - 72, 2)) { g.fillText(l, 36, y + 40); y += 50; }
    if (b.about) y = this.para(y, b.about, 24, '#9fdfee', 3);
    y = this.para(y + 6, ts.length ? `Starts ${ts.map((t) => { const k = triggerOf(t.step.what); return k ? t.step.what : `${t.step.what} (not read: say it like "when a build finishes")`; }).join('; or ')}.` : 'No trigger yet: open a step and make it a Trigger.', 26, '#ffe082', 3, 500);
    y = this.para(y, b.armed ? 'Armed: its trigger starts it by itself. What a pipeline does never starts another, so two cannot set each other off.' : 'Not armed: it runs when you press ▶ Run. Press Arm to let its trigger start it by itself.', 24, b.armed ? '#ffd740' : '#7fb3c8', 3);
    const r = sh.run;
    if (r) {
      const end = r.steps.at(-1), col = sh.live ? '#ffffff' : r.status === 'done' ? '#69f0ae' : r.status === 'failed' ? '#ff8a80' : '#ffd740';
      g.font = `600 26px ${FONT}`; g.fillStyle = col; g.fillText(`${sh.live ? 'RUNNING' : `LAST RUN · ${r.status.toUpperCase()}`} · ${r.rounds} round${r.rounds === 1 ? '' : 's'} · ${r.steps.length} steps · ${ago(r.started)}`, 36, y + 28); y += 40;
      if (end) y = this.para(y, `${end.label}: ${end.output || '(nothing)'}`, 24, '#cfe8f0', 3);
      button(LPX - 200, y - 4, 170, 60, 'Log', 'log'); y += 64;
    } else y = this.para(y, 'Not run yet: press ▶ Run on the strip.', 24, '#7fb3c8', 2);
    // the steps, in the order they run from its first trigger; what no link reaches after them
    const from = ts[0]?.id, order = from ? orderFrom(b, graphOf(b), from) : [], rest = nodesOf(b).filter((n) => !order.includes(n.id)).map((n) => n.id), all = [...order, ...rest];
    g.font = `600 26px ${FONT}`; g.fillStyle = '#7fb3c8'; g.fillText(`STEPS, IN THE ORDER THEY RUN · ${order.length}${rest.length ? ` (+${rest.length} not linked in)` : ''}`, 36, y + 28); y += 44;
    const top = y, rows = this.rowsFrom(top), pages = Math.max(1, Math.ceil(all.length / rows)); if (this.page >= pages) this.page = pages - 1;
    all.slice(this.page * rows, this.page * rows + rows).forEach((id, i) => {
      const ry = top + i * ROW, kd = KIND[stepOf(b, id)?.kind ?? 'plain'], done = sh.last.get(id), now = sh.next === id, loose = rest.includes(id);
      g.fillStyle = now ? 'rgba(52,52,18,0.98)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, ry, LPX - 60, ROW - 10, 12); g.fill(); g.strokeStyle = now ? '#ffffff' : done ? DONE[done.status][1] : 'rgba(128,222,234,0.35)'; g.lineWidth = 2; g.setLineDash(loose ? [10, 8] : []); g.stroke(); g.setLineDash([]);
      g.fillStyle = kd[1]; g.beginPath(); g.arc(60, ry + (ROW - 10) / 2, 10, 0, Math.PI * 2); g.fill();
      g.font = `500 30px ${FONT}`; g.fillStyle = loose ? '#9fdfee' : '#ffffff'; g.fillText(fit2(g, `${loose ? '' : `${order.indexOf(id) + 1}. `}${b.nodes[id]!.label}`, LPX - 420), 86, ry + 48);
      g.font = `600 22px ${FONT}`; g.fillStyle = now ? '#ffffff' : done ? DONE[done.status][1] : kd[1]; g.textAlign = 'right'; g.fillText(now ? 'RUNNING…' : `${kd[0]}${done ? ` · ${DONE[done.status][0]}` : ''}`, LPX - 52, ry + 46); g.textAlign = 'left';
      hit(30, ry, LPX - 30, ry + ROW - 10, 'open', id);
    });
    this.pager(all.length, button, rows);
  }
  /** The run in full: every step, in the order it ran, what it did and how long it took. */
  private drawLog(b: Board, button: (x: number, y: number, w: number, h: number, text: string, act: string, accent?: string, id?: string) => void): void {
    const g = this.list.g, sh = this.shown(b), r = sh.run;
    g.font = `600 40px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText('Run log', 36, 70); button(LPX - 120, 22, 90, 70, '✕', 'log', '#ffd740');
    if (!r) { this.para(110, 'Not run yet.', 28, '#7fb3c8'); return; }
    let y = this.para(100, `${sh.live ? 'Running' : r.status === 'done' ? 'Done' : r.status === 'failed' ? 'Failed' : 'Stopped'}: ${r.rounds} round${r.rounds === 1 ? '' : 's'}, ${r.steps.length} steps, started ${ago(r.started)} because ${r.why}${r.ended ? `, ${((r.ended - r.started) / 1000).toFixed(1)} s` : ''}.`, 26, '#9fdfee', 3);
    const H = 124, per = Math.max(1, Math.floor((LHPX - y - 120) / H)), pages = Math.max(1, Math.ceil(r.steps.length / per)); if (this.page >= pages) this.page = pages - 1;
    for (const x of r.steps.slice(this.page * per, this.page * per + per)) {
      const [word, col] = DONE[x.status];
      g.fillStyle = 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, y, LPX - 60, H - 10, 12); g.fill(); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
      g.font = `600 24px ${FONT}`; g.fillStyle = col; g.fillText(fit2(g, `R${x.round} · ${KIND[x.kind][0]} · ${x.label}`, LPX - 330), 50, y + 34);
      g.textAlign = 'right'; g.fillText(`${word}${x.by ? ` · ${x.by === 'claude' ? 'Claude' : 'Nexus'}` : ''} · ${x.ms < 1000 ? `${x.ms} ms` : `${(x.ms / 1000).toFixed(1)} s`}`, LPX - 50, y + 34); g.textAlign = 'left';
      g.font = `400 22px ${FONT}`; g.fillStyle = '#cfe8f0'; wrap(g, x.output || '(nothing)', LPX - 110, 2).forEach((l, i) => g.fillText(l, 50, y + 68 + i * 28));
      y += H;
    }
    this.pager(r.steps.length, button, per);
  }
  /** A step open: what kind it is, what it does in words, a few to press, and what it did in the last run. */
  private drawStep(b: Board, id: string, st: Step | null, hit: (x0: number, y0: number, x1: number, y1: number, act: string, id?: string) => void): void {
    const g = this.list.g, kind: StepKind | 'plain' = st?.kind ?? 'plain';
    const kinds: (StepKind | 'plain')[] = ['plain', 'trigger', 'ai', 'action', 'check', 'repeat'], cw = (LPX - 60 - 5 * 10) / 6;
    kinds.forEach((k, i) => {
      const x = 30 + i * (cw + 10), on = k === kind, col = KIND[k][1];
      g.globalAlpha = on ? 0.35 : 0.1; g.fillStyle = col; g.beginPath(); g.roundRect(x, 140, cw, 66, 12); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = col; g.lineWidth = on ? 3 : 1.5; g.stroke();
      g.font = `600 25px ${FONT}`; g.fillStyle = on ? '#ffffff' : col; g.textAlign = 'center'; g.fillText(k === 'plain' ? 'Plain' : k === 'ai' ? 'AI' : k[0]!.toUpperCase() + k.slice(1), x + cw / 2, 182); g.textAlign = 'left';
      hit(x, 140, x + cw, 206, 'kind', k);
    });
    if (kind === 'plain') { this.para(226, 'A plain step passes on what comes to it. Press what it should do: a Trigger starts the pipeline, AI asks Claude, an Action does something in the room, a Check lets it on only where it holds, a Repeat goes back round until it holds.', 26, '#9fdfee', 8); }
    else {
      // what it does, in words: pressed to type or say it
      const typing = this.typing === 'what', text = typing ? `${this.draft}▏` : st!.what;
      g.fillStyle = typing ? 'rgba(77,208,225,0.22)' : 'rgba(10,30,40,0.95)'; g.beginPath(); g.roundRect(30, 222, LPX - 60, 116, 12); g.fill(); g.strokeStyle = typing ? '#80deea' : KIND[kind][1]; g.lineWidth = 2; g.stroke();
      g.font = `400 28px ${FONT}`; g.fillStyle = text ? '#ffffff' : '#7fb3c8'; wrap(g, text || 'Press to say what it does…', LPX - 110, 3).forEach((l, i) => g.fillText(l, 52, 262 + i * 34)); hit(30, 222, LPX - 30, 338, 'what');
      // a few to press
      g.font = `500 23px ${FONT}`; let x = 30, y = 352;
      SUGGEST[kind].forEach(([label], i) => {
        const w = Math.min(LPX - 60, g.measureText(label).width + 36); if (x + w > LPX - 30) { x = 30; y += 60; } if (y > 352 + 2 * 60) return;
        g.fillStyle = 'rgba(77,208,225,0.1)'; g.beginPath(); g.roundRect(x, y, w, 50, 10); g.fill(); g.strokeStyle = 'rgba(77,208,225,0.5)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = '#e6f7ff'; g.textAlign = 'center'; g.fillText(fit2(g, label, w - 20), x + w / 2, y + 33); g.textAlign = 'left';
        hit(x, y, x + w, y + 50, 'sugg', String(i)); x += w + 10;
      });
    }
    // what it did, the last time it ran
    const done = this.shown(b).last.get(id);
    g.font = `600 24px ${FONT}`; g.fillStyle = done ? DONE[done.status][1] : '#7fb3c8'; g.fillText(done ? `LAST RUN · ${DONE[done.status][0]}${done.by ? ` · ANSWERED BY ${done.by === 'claude' ? 'CLAUDE' : 'NEXUS'}` : ''} · ROUND ${done.round}` : 'NOT RUN YET', 36, 566);
    if (done) this.para(578, done.output || '(nothing)', 24, '#cfe8f0', 4);
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
  /** The mouse pressed, the trigger pulled (`press`: it clicks, never drags) or the grip closed (`grab`: it holds a node
   *  to move it, or the sheet to slide it; the strip and the list are the board's frame, which the window carries, so a
   *  grab there is not the board's): true when the board took it. */
  down(ray: THREE.Raycaster, how: Hold = 'both'): boolean {
    const u = this.uvOf(ray); if (!u) return false;
    if (how === 'grab' && u.on !== 'wall') return false;
    if (u.on === 'strip') { const x = u.uv.x * WPX, r = this.stripHits.find((h) => x >= h.x0 && x <= h.x1); if (r) this.act(r.act); return true; }
    if (u.on === 'list') { const x = u.uv.x * LPX, y = (1 - u.uv.y) * LHPX, r = this.listHits.find((h) => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1); if (r) this.act(r.act, r.id); return true; }
    const px = u.uv.x * WPX, py = (1 - u.uv.y) * HPX, bx = (px - this.cam.x) / this.cam.k, by = (py - this.cam.y) / this.cam.k;
    const node = [...this.P].reverse().find(([id, p]) => { const gm = this.geo.get(id)!; return bx >= p.x && bx <= p.x + gm.w && by >= p.y && by <= p.y + gm.h; })?.[0];
    const p = node ? this.P.get(node)! : { x: 0, y: 0 };
    this.drag = { ...(node ? { node } : {}), px, py, ox: bx - p.x, oy: by - p.y, cam0: { x: this.cam.x, y: this.cam.y }, moved: false, how };
    return true;
  }
  get pressing(): boolean { return !!this.drag; }
  /** The ray moved while held: a node follows it across the wall, or the sheet does. */
  move(ray: THREE.Raycaster): void {
    const d = this.drag; if (!d || d.how === 'press') return;
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
  /** Let go: a node moved stays where it is; a press that did not move opens the node, or on the bare sheet closes it; a
   *  hold let go where it was taken does nothing. */
  up(): void {
    const d = this.drag; this.drag = null; if (!d) return;
    if (d.node && d.moved) { const p = this.P.get(d.node)!; this.remember(`move ${this.label(d.node)}`); this.store.write(this.id!, moveNode(d.node, this.view, p.x, p.y)); return; }
    if (d.how === 'grab') return;
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
      case 'deselect': this.sel = null; this.page = 0; this.find = ''; if (this.typing === 'find' || this.typing === 'what') this.stopTyping(); this.drawAll(); return;
      // pipelines
      case 'flows': this.picking = !this.picking; this.page = 0; if (this.picking) { this.call = null; this.log = false; } this.drawAll(); return;
      case 'closepick': this.picking = false; this.drawAll(); return;
      case 'know': this.knowing = !this.knowing; this.page = 0; if (this.knowing) { this.picking = false; this.call = null; this.log = false; } this.drawAll(); return;
      case 'closeknow': this.knowing = false; this.drawAll(); return;
      case 'kb': {
        const t = id ? findKnown(id) : null; if (!t) return;
        const bid = `know-${t.id}`, was = this.store.boards.get(bid), made = boardOfKnowledge(t);
        // made again only when what Nexus knows has changed; else as you left it, moved nodes and all
        if (!was || was.about !== made.about || Object.keys(was.nodes).length !== Object.keys(made.nodes).length) { if (was) { made.createdAt = was.createdAt ?? made.createdAt; if (was.review) made.review = was.review; if (was.notes) made.notes = was.notes; } this.store.write(bid, made, true); this.fitted.delete(`${bid}|${this.view}`); }
        this.knowing = false; this.open(bid); this.host.say(`${made.title}. ${made.about}`); return;
      }
      case 'tpl': { const t = TEMPLATES.find((x) => x.id === id); if (!t) return; const nid = uid('f'); this.store.write(nid, boardOfTemplate(t), true); this.picking = false; this.open(nid); this.host.say(`${t.title}. ${t.about} Press ▶ Run.`); return; }
      case 'openb': if (id && this.store.boards.has(id)) { this.picking = false; this.open(id); this.host.say(`${this.board()!.title}.`); } return;
      case 'run': {
        if (!b || b.kind !== 'flow' || !this.id) return;
        const r = this.running.get(this.id); if (r) { r.ac.abort(); this.host.say('Stopping it after the step it is on.'); return; }
        void this.runBoard(this.id, null, 'you pressed ▶ Run'); return;
      }
      case 'arm': if (!b || b.kind !== 'flow') return; this.store.write(this.id!, { armed: !b.armed }); this.host.say(!b.armed ? `Armed: ${b.title} starts by itself ${triggersOf(b).map((t) => t.step.what).join(', or ') || 'when its trigger happens'}.` : `${b.title} runs only when you press ▶ Run now.`); return;
      case 'log': this.log = !this.log; this.page = 0; this.drawAll(); return;
      case 'kind': {
        if (!b || !this.sel || !id) return;
        const was = stepOf(b, this.sel), k = id as StepKind | 'plain';
        this.remember(`make ${this.label(this.sel)} ${k}`);
        const step = k === 'plain' ? null : { kind: k, what: was?.kind === k ? was.what : (guessStep(this.label(this.sel))?.kind === k ? guessStep(this.label(this.sel))!.what : FIRST[k]) };
        this.store.write(this.id!, { nodes: { [this.sel]: { step: step as Step } } });
        if (k === 'repeat' && !edgesOf(b).some((e) => e.from === this.sel && BACK.has(e.rel ?? ''))) this.host.say('A repeat goes back round: press the step below that it goes back to.');
        return;
      }
      case 'what': if (!this.sel) return; this.typing === 'what' ? this.stopTyping() : this.startTyping('what'); return;
      case 'sugg': { const st = b && this.sel ? stepOf(b, this.sel) : null; const s2 = st ? SUGGEST[st.kind][Number(id)] : undefined; if (!st || !s2) return; this.remember(`change ${this.label(this.sel!)}`); this.store.write(this.id!, { nodes: { [this.sel!]: { step: { kind: st.kind, what: s2[1] } } } }); if (this.typing === 'what') this.stopTyping(); return; }
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
    // on a pipeline a link is an order: the second runs after the first; from a repeat it is the way back round
    const t = toggleLink(b, a, c, b.kind !== 'flow' ? 'connects' : stepOf(b, a)?.kind === 'repeat' ? 'feeds back to' : 'flows to'); if (!t) return;
    this.remember(`${t.linked ? 'link' : 'unlink'} ${this.label(a)} and ${this.label(c)}`);
    this.store.write(this.id!, t.patch);
  }
  private add(word: string, linkTo?: string): string | null {
    const b = this.board(); if (!b || !word.trim()) return null;
    const same = nodesOf(b).find((n) => n.label.toLowerCase() === word.trim().toLowerCase());
    if (same && !linkTo) { this.sel = same.id; this.drawAll(); this.host.say(`${same.label} is already on the board: here it is.`); return same.id; }
    if (same && linkTo) { if (!this.d.nb.get(linkTo)?.has(same.id)) this.toggle(linkTo, same.id); return same.id; }
    this.remember(`add ${word.trim()}`);
    const flow = b.kind === 'flow', { id, patch } = addNode(word, linkTo, uid('n'), flow ? (linkTo && stepOf(b, linkTo)?.kind === 'repeat' ? 'feeds back to' : 'flows to') : 'connects');
    // on a pipeline, what the word does is read from it: one word is enough
    if (flow) { const st = guessStep(word); if (st) patch.nodes![id]!.step = st; }
    this.store.write(this.id!, patch);
    return id;
  }
  undo(): void {
    let i = this.undoStack.length - 1; while (i >= 0 && this.undoStack[i]!.id !== this.id) i--;
    if (i < 0) { this.host.say('Nothing to undo on this board.'); return; }
    const [u] = this.undoStack.splice(i, 1); this.store.write(u!.id, u!.body, true); this.host.say(`Undone: ${u!.what}.`);
  }
  /** A board of the build standing here: made, or made again from it as it stands now. */
  /** A board of the build standing here, made without turning the board you are looking at (a pipeline's step). */
  buildBoard(): string | null { return this.fromBuild(false, false); }
  private fromBuild(say: boolean, show = true): string | null {
    const m = this.host.build(); if (!m || !m.parts.length) { if (say) this.host.say('Nothing stands here yet to make a board of.'); return null; }
    const id = `build-${m.ask.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`, was = this.store.boards.get(id);
    const b = boardOfBuild(m.ask, m.name, m.parts);
    if (was) { b.createdAt = was.createdAt ?? b.createdAt; if (was.review) b.review = was.review; if (was.notes) b.notes = was.notes; this.remember('make it again from the build'); }
    this.store.write(id, b, true); this.fitted.delete(`${id}|${this.view}`);
    if (!show) return `${b.title}: ${nodesOf(b).length} nodes from ${m.parts.length} parts, on the board ${b.title}.`;
    this.open(id);
    return `${b.title}: ${nodesOf(b).length} nodes from ${m.parts.length} parts. ${this.board() ? `${categoriesOf(this.d).length} categories from its links.` : ''}`;
  }

  // ---- typing: a word for a node, a word to find, a board's name -------------------------------------------------------
  private hint(t: Typing): string {
    const b = this.board(), flow = b?.kind === 'flow', st = b && this.sel ? stepOf(b, this.sel) : null;
    if (t === 'what') return st?.kind === 'trigger' ? 'when it starts: "when a build finishes", "every 10 minutes", "when I say go"' : st?.kind === 'ai' ? 'what to ask; {input} is what came to it' : st?.kind === 'check' || st?.kind === 'repeat' ? 'a condition: "flaws > 0", "no gaps", "mass under 500"' : 'what to do: flaws, again {input}, operate, make a cart, note flaw: {input}, say {input}, show flaws, board, wait 5 s';
    return t === 'ask' ? 'say or type what you mean, in your own words' : t === 'add' ? (flow ? `a step${this.sel ? ` to run after ${this.label(this.sel)}` : ''}: one word is enough ("flaws", "any flaws?", "ask how to fix")` : 'a word for a new node, then send') : t === 'find' ? `find or add a node linked to ${this.label(this.sel ?? '')}` : 'a name for the new board, then send';
  }
  startTyping(t: Typing): void { this.typing = t; if (t === 'find') this.find = ''; if (t === 'what') { const b = this.board(); this.draft = b && this.sel ? stepOf(b, this.sel)?.what ?? '' : ''; } this.host.type(true, this.hint(t)); this.drawAll(); }
  stopTyping(): void { if (!this.typing) return; this.typing = null; this.host.type(false, ''); if (this.group.visible) this.drawAll(); }
  /** What is typed so far: the list follows a word being found. */
  key(text: string): void { if (this.typing === 'find') { this.find = text; this.page = 0; this.drawList(); } else if (this.typing === 'what') { this.draft = text; this.drawList(); } }
  /** A word sent, typed or said. */
  enter(text: string): void {
    const w = text.trim(); if (!w || !this.typing) return;
    if (this.typing === 'ask') { void this.ask(w); return; }
    if (this.typing === 'what') {
      const b = this.board(); if (!b || !this.sel) return;
      const was = stepOf(b, this.sel); this.remember(`change ${this.label(this.sel)}`);
      this.store.write(this.id!, { nodes: { [this.sel]: { step: { kind: was?.kind ?? guessStep(w)?.kind ?? 'action', what: w } } } });
      this.draft = ''; this.stopTyping(); return;
    }
    if (this.typing === 'title') {
      const id = uid('b'), at = Date.now();
      this.store.write(id, { title: w.slice(0, 80), kind: 'categories', about: '', nodes: {}, edges: {}, createdAt: at, updatedAt: at }, true);
      this.open(id); this.startTyping('add'); this.host.say(`${w}: say or type a word for each node.`); return;
    }
    // a word sent is a node; on a pipeline, a step run after the one open, so steps typed one after another are a chain
    if (this.typing === 'add') { const flow = this.board()?.kind === 'flow', id = this.add(w, flow ? this.sel ?? undefined : undefined); if (id) { this.sel = id; this.page = 0; this.find = ''; } this.host.type(true, this.hint('add')); this.drawAll(); return; }
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

  // ---- running a pipeline ---------------------------------------------------------------------------------------------
  /** Run a pipeline from a trigger (else the one pressed to run, else its first): every step through the room, the board
   *  drawn as each finishes, and the run kept on the board. */
  async runBoard(id: string, from: string | null, why: string): Promise<FlowRun | null> {
    const b = this.store.boards.get(id); if (!b || b.kind !== 'flow' || this.running.has(id)) return null;
    const ts = triggersOf(b), t = from ?? (this.id === id && this.sel && stepOf(b, this.sel)?.kind === 'trigger' ? this.sel : ts.find((x) => triggerOf(x.step.what)?.kind === 'run')?.id ?? ts[0]?.id);
    if (!t) { this.host.say(`${b.title} has nothing to start from: open a step and make it a Trigger.`); return null; }
    const slot = { from: t, run: null as FlowRun | null, ac: new AbortController() };
    this.running.set(id, slot); if (this.id === id && this.group.visible) this.drawAll();
    let r: FlowRun;
    try { r = await runFlow(b, t, this.host.flowApi(), why, (x) => { slot.run = x; if (this.id === id && this.group.visible) { this.drawWall(); this.drawList(); } }, slot.ac.signal); }
    finally { this.running.delete(id); }
    const cur = this.store.boards.get(id); if (cur) this.store.write(id, { runs: [...(cur.runs ?? []), keptRun(r)].slice(-8) });
    const end = r.steps.at(-1);
    this.host.say(`⚡ ${b.title}: ${r.status === 'done' ? 'done' : r.status}${r.rounds > 1 ? ` after ${r.rounds} rounds` : ''}.${end ? ` ${end.label}: ${end.output.slice(0, 220)}` : ''}`);
    if (this.id === id && this.group.visible) this.drawAll();
    return r;
  }
  /** Something happened in the room: each armed pipeline whose trigger it is starts. Not while a pipeline is running (what
   *  one does never starts another, so two cannot set each other off), nor within 10 s of starting by itself. */
  event(...es: FlowEvent[]): string[] {
    if (this.running.size) return [];
    const started: string[] = [];
    for (const [id, b] of this.store.boards) {
      if (b.kind !== 'flow' || !b.armed) continue;
      let e: FlowEvent | undefined; const t = triggersOf(b).find((x) => (e = es.find((y) => starts(x.step, y)))); if (!t || !e) continue;
      if (Date.now() - (this.auto.get(id) ?? 0) < 10_000) continue;
      this.auto.set(id, Date.now()); started.push(b.title);
      this.host.say(`⚡ ${b.title} starts: ${saidOf(e)}.`);
      void this.runBoard(id, t.id, saidOf(e));
    }
    return started;
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
    else { const [act, label] = key.split(':'); const id = label && b ? nodesOf(b).find((n) => n.label === label)?.id ?? label : label; const r = this.listHits.find((h) => h.act === act && (!label || h.id === id)); if (!r) return null; mesh = this.list.mesh; u = (r.x0 + r.x1) / 2 / LPX; v = 1 - (r.y0 + r.y1) / 2 / LHPX; }
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
