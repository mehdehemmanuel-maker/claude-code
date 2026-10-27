// The board of blocks on the dashboard (view/index.html, with dashboard.ts round it): a canvas of coloured blocks wired port to port, the library beside it
// sorted by field, by ability or by kind, and an inspector that is each block's own calculator. Every edit runs what it
// reaches at once (src/nexus/dataflow.ts), each block glows as it runs and a pulse runs down each wire that carried a
// new value; a failed block turns red and says why, a block waiting on an input says which. Groups open in place and
// fold back; a group can be saved as a library block of its own and placed anywhere after. What the engine would change
// (what is dead, what is twice, what wiring repeats) is listed when nothing is chosen, each with the press that does it.
//
// The board is kept in this browser (localStorage) and can be taken out and brought back as JSON. Code blocks run in
// the forge's own worker (code-worker.ts), off the page. Asking Claude needs the forge's relay, which this page does not
// have: such a block says so rather than pretending.

import { ABILITIES, DOMAINS, KINDS, LIBRARY, block, clockOf, defaultsOf, dimOf, elemOf, portsOf, readQuantity, register, shelves, show, testBlock, type BlockDef, type PortDef, type Ports } from '../blocks';
import { isAssembly, partOf } from '../assembly';
import { Engine, Memo, collapse, cutBranch, emptyBoard, expand, groupBlock, isWire, makeBlock, mergeTwins, placeBlock, suggest, wire, blockOf, type NodeState, type Suggestion, type Env } from '../dataflow';
import { edgesOf, nodesOf, uid, type Board, type LiveEdge } from '../boards';
import { fullScreen, shot } from './nodes3d';
import '../seeds';
import type { Part } from '../kits';

// ---- where things are kept ------------------------------------------------------------------------------------------
const KEY = 'nexus.nodeboard.v1', BLOCKS_KEY = 'nexus.nodeblocks.v1';
const store = { get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }, set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private window: kept for this visit only */ } } };
interface Saved { id: string; name: string; says: string; domains: string[]; graph: Board }
const BOARDS_KEY = 'nexus.boards.v1';
interface SavedBoard { title: string; field: string; board: Board }
function savedBoards(): SavedBoard[] { try { return JSON.parse(store.get(BOARDS_KEY) ?? '[]') as SavedBoard[]; } catch { return []; } }
/** The current board kept in the library's Boards, under its title and a field. */
function keepBoard(field: string): void { const all = savedBoards().filter((x) => x.title !== (root.title || 'My board')); all.push({ title: root.title || 'My board', field, board: JSON.parse(JSON.stringify(root)) as Board }); store.set(BOARDS_KEY, JSON.stringify(all)); }
function forgetBoard(title: string): void { store.set(BOARDS_KEY, JSON.stringify(savedBoards().filter((x) => x.title !== title))); }
function loadBlocks(): void { try { for (const s of JSON.parse(store.get(BLOCKS_KEY) ?? '[]') as Saved[]) register(groupBlock(s.graph, { id: s.id, name: s.name, says: s.says, domains: s.domains, by: 'you' })); } catch { /* none kept */ } }
function keepBlock(d: BlockDef): void { let all: Saved[] = []; try { all = JSON.parse(store.get(BLOCKS_KEY) ?? '[]') as Saved[]; } catch { /* start again */ } all = all.filter((s) => s.id !== d.id); all.push({ id: d.id, name: d.name, says: d.says, domains: d.domains, graph: d.graph! }); store.set(BLOCKS_KEY, JSON.stringify(all)); }

// ---- code, off the page ---------------------------------------------------------------------------------------------
let worker: Worker | null = null, seq = 0;
const waiting = new Map<number, { ok: (v: unknown) => void; no: (e: Error) => void; timer: number }>();
function codeWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./code-worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<{ id: number; value?: unknown; error?: string }>) => { const w = waiting.get(e.data.id); if (!w) return; waiting.delete(e.data.id); clearTimeout(w.timer); if (e.data.error) w.no(new Error(e.data.error)); else w.ok(e.data.value); };
  return worker;
}
const env: Env = {
  code: (lang, code, inputs) => new Promise((ok, no) => {
    const id = ++seq, w = codeWorker();
    const timer = window.setTimeout(() => { waiting.delete(id); w.terminate(); worker = null; no(new Error('stopped after 8 s: it ran too long')); }, 8000);
    waiting.set(id, { ok, no, timer }); w.postMessage({ id, lang, code, facts: {}, input: '', vars: inputs });
  }),
  ai: async () => { throw new Error('asking Claude needs the forge\'s relay; open this board in the forge to ask'); },
};

// ---- the board ------------------------------------------------------------------------------------------------------
let root: Board = emptyBoard('My pipeline');
let path: string[] = [];
const memo = new Memo();
let engine = new Engine(root, env, memo);
const sel = new Set<string>(); let selWire: string | null = null;
const undo: string[] = [], redo: string[] = [];
let heat = false;

const cur = (): Board => { let b = root; for (const g of path) b = b.nodes[g]!.inner!; return b; };
/** The engine that ran the board in view: the root's, or the one inside each group on the way down (once it has run). */
function curEngine(): Engine | undefined { let e: Engine | undefined = engine; for (const g of path) e = e?.inside(g); return e; }
let local = engine;
function refreshLocal(): void { const ce = curEngine(); local = ce && ce.board === cur() ? ce : new Engine(cur(), env, memo); }
const stateOf = (id: string): NodeState | undefined => curEngine()?.state.get(id);
const portsFor = (id: string): Ports => { const n = cur().nodes[id]; if (!n) return { inputs: [], outputs: [] }; const e = curEngine(); if (e && e.board === cur()) return e.ports(id); const d = blockOf(n); return d ? portsOf(d, { ...defaultsOf(d), ...(n.set ?? {}) }) : { inputs: [], outputs: [] }; };

/** Another board in view: its own engine, sharing what every board has worked out. */
function useBoard(b: Board): void { root = b; path = []; engine = new Engine(root, env, memo); refreshLocal(); sel.clear(); selWire = null; glow.clear(); pulses = []; suggestions = null; }
function snapshot(): string { return JSON.stringify({ root, path }); }
function pushUndo(): void { undo.push(snapshot()); if (undo.length > 120) undo.shift(); redo.length = 0; }
function restore(s: string): void { const o = JSON.parse(s) as { root: Board; path: string[] }; root = o.root; path = []; for (const g of o.path) { const b = cur(); if (b.nodes[g]?.inner) path.push(g); else break; } engine = new Engine(root, env, memo); refreshLocal(); sel.clear(); selWire = null; save(); runSoon(); renderAll(); }

/** Changes the board in view. A change inside a group makes a new board of each group on the way down, so every key that
 *  hangs on it is new and what it feeds runs again. `node` is set where only that node's settings changed. */
function edit(fn: (b: Board) => void, node?: string): void {
  pushUndo();
  if (!path.length) { const before = node ? sigOf(node) : ''; fn(root); if (node && sigOf(node) === before) engine.touch(node); else engine.reshape(root); }
  else {
    const chain: Board[] = [root]; for (const g of path) chain.push(chain[chain.length - 1]!.nodes[g]!.inner!);
    let child = structuredClone(chain[chain.length - 1]!); fn(child);
    for (let i = path.length - 1; i >= 0; i--) { const parent = i === 0 ? root : structuredClone(chain[i]!); parent.nodes[path[i]!] = { ...parent.nodes[path[i]!]!, inner: child }; child = parent; }
    engine.touch(path[0]!);
  }
  root.updatedAt = Date.now(); refreshLocal(); save(); runSoon();
}
const sigOf = (id: string) => { const p = portsFor(id); return `${p.inputs.map((x) => x.name + x.type + (x.unit ?? '')).join()}|${p.outputs.map((x) => x.name + x.type + (x.unit ?? '')).join()}`; };
let saveT = 0; function save(): void { clearTimeout(saveT); saveT = window.setTimeout(() => store.set(KEY, JSON.stringify(root)), 250); }

// ---- running --------------------------------------------------------------------------------------------------------
export interface RanNode { id: string; label: string; ms: number; status: NodeState['status']; error?: string; mapped?: number }
let lastRan: { at: number; time: number; report: typeof lastReport; nodes: RanNode[] } = { at: 0, time: 0, report: { ran: 0, cached: 0, failed: 0, waiting: 0, ms: 0, looked: 0 }, nodes: [] };
/** The board's clock: what every Clock node reads. Played, it runs on with the page's frames; only what reads it runs again. */
/** The clock has no end: the bar shows a window of it (`span` seconds, a minute to a year), the one the time is in. */
const clock = { t: 0, playing: false, rate: 1, span: 120 };
function setTime(t: number): void { clock.t = Math.max(0, Number.isFinite(t) ? t : 0); if (engine.tick(clock.t)) runSoon(); wall.timed?.(); }
const moves = (): boolean => nodesOf(root).some((n) => { const x = root.nodes[n.id]!, d = blockOf(x); return !!d && clockOf(d, x.set ?? {}); });
{ let last = 0; const frame = (now: number) => { if (clock.playing && last) setTime(clock.t + (Math.min(250, now - last) / 1000) * clock.rate); last = now; requestAnimationFrame(frame); }; requestAnimationFrame(frame); }
let running = false, again = false, lastReport = { ran: 0, cached: 0, failed: 0, waiting: 0, ms: 0, looked: 0 };
const glow = new Map<string, number>(); let pulses: { e: string; t0: number }[] = [];
function runSoon(): void { if (running) { again = true; return; } void runNow(); }
async function runNow(): Promise<void> {
  running = true;
  const before = new Map([...engine.state.entries()].map(([id, s]) => [id, s.runs]));
  try { lastReport = await engine.run(); } catch (e) { toast(`run stopped: ${(e as Error).message}`, true); }
  const t = performance.now();
  for (const [id, s] of engine.state) if (s.runs !== before.get(id) && !s.cached) { glow.set(id, t); for (const w of engine.wiresFrom(id)) pulses.push({ e: w.id, t0: t }); }
  // inside the group in view, its own nodes glow too
  const ce = curEngine(); if (path.length && ce) for (const [id, s] of ce.state) if (!s.cached) { glow.set(id, t); for (const w of ce.wiresFrom(id)) pulses.push({ e: w.id, t0: t }); }
  // what ran, for the run log: each node that worked something out anew, or failed, in the board's order
  lastRan = { at: Date.now(), time: clock.t, report: lastReport, nodes: engine.sequence.flatMap((id) => { const s = engine.state.get(id), n = root.nodes[id]; if (!s || !n || (s.runs === before.get(id) && s.status !== 'failed') || (s.cached && s.status !== 'failed')) return []; return [{ id, label: n.label || blockOf(n)?.name || id, ms: s.ms, status: s.status, error: s.error, mapped: s.mapped }]; }) };
  running = false; refreshLocal(); suggestions = null; wall.ran?.();
  renderInspector(false); renderStats(); draw();
  if (again) { again = false; runSoon(); }
}

// ---- colours ---------------------------------------------------------------------------------------------------------
const DIM_HUE: [number[], string][] = [[[0, 1, 0, 0, 0], '#40c4ff'], [[1, 1, -2, 0, 0], '#ff5252'], [[1, -1, -2, 0, 0], '#ff6e40'], [[1, 0, 0, 0, 0], '#b2ff59'], [[0, 0, 1, 0, 0], '#ea80fc'], [[1, 2, -3, 0, 0], '#ffab40'], [[1, 2, -2, 0, 0], '#ffd180'], [[1, 2, -3, -1, 0], '#ffff00'], [[0, 0, 0, 1, 0], '#18ffff'], [[1, 2, -3, -2, 0], '#a7ffeb'], [[0, 0, 0, 0, 1], '#ff80ab'], [[0, 1, -1, 0, 0], '#82b1ff'], [[0, 0, -1, 0, 0], '#b388ff'], [[0, 4, 0, 0, 0], '#80d8ff'], [[0, 2, 0, 0, 0], '#84ffff']];
/** A wire's colour is what it carries: each kind of quantity its own, money gold, words grey, yes or no lime, tables teal. */
function typeColour(p?: PortDef): string {
  if (!p) return '#78909c';
  const t = elemOf(p.type) ?? p.type;
  if (t === 'boolean') return '#c6ff00'; if (t === 'text') return '#b0bec5'; if (t === 'table' || t === 'record') return '#4db6ac';
  if (t === 'material' || t === 'part') return '#80cbc4'; if (t === 'any') return '#9e9e9e'; if (t === 'event') return '#eeff41';
  if (p.unit && /^(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR)$/.test(p.unit)) return '#ffd740';
  const d = dimOf(p.unit); if (!d) return '#e0e6ee';
  const named = DIM_HUE.find(([x]) => x.every((v, i) => v === d[i])); if (named) return named[1];
  let h = 0; for (const v of d) h = (h * 31 + v * 17 + 7) % 360; return `hsl(${h}, 90%, 70%)`;
}
function heatColour(id: string): string { const s = stateOf(id); if (!s) return '#455a64'; if (s.fails) return '#ff1744'; const k = Math.min(1, Math.log10(1 + s.ms * 10) / 3); return `hsl(${120 - 120 * k}, 85%, 55%)`; }

// ---- geometry --------------------------------------------------------------------------------------------------------
const W = 280, HEAD = 36, ROW = 26, FOOT = 24;
function bodyH(id: string): number {
  const n = cur().nodes[id]!; const b = n.block ?? '';
  if (b === 'view.3d') return 240; if (b === 'view.show') return 58; if (b === 'view.gauge') return 86; if (b === 'view.chart') return 150; if (b === 'view.table') return 124;
  if (b === 'note') return 16 + 16 * Math.min(10, wrapCount(String(n.set?.text ?? ''), 30));
  return 0;
}
const wrapCount = (s: string, per: number) => s.split('\n').reduce((t, l) => t + Math.max(1, Math.ceil(l.length / per)), 0);
interface Geo { x: number; y: number; w: number; h: number; ins: { p: PortDef; y: number }[]; outs: { p: PortDef; y: number }[]; bodyY: number; bodyH: number }
function geo(id: string): Geo {
  const n = cur().nodes[id]!, p = portsFor(id), rows = Math.max(p.inputs.length, p.outputs.length), x = n.x ?? 0, y = n.y ?? 0, bh = bodyH(id);
  const top = y + HEAD + 4;
  return { x, y, w: W, h: HEAD + 8 + rows * ROW + bh + FOOT, ins: p.inputs.map((q, i) => ({ p: q, y: top + i * ROW + ROW / 2 })), outs: p.outputs.map((q, i) => ({ p: q, y: top + i * ROW + ROW / 2 })), bodyY: top + rows * ROW + 4, bodyH: bh };
}
const view = { ox: 0, oy: 0, k: 1 };
const toWorld = (sx: number, sy: number) => [(sx - view.ox) / view.k, (sy - view.oy) / view.k] as const;

// ---- drawing ---------------------------------------------------------------------------------------------------------
/** On the dashboard (view/index.html), or hosted: the space puts the same board on a panel (nodes-wall.ts). */
const PAGE = !!document.getElementById('app');
const cv = (document.getElementById('cv') as HTMLCanvasElement | null) ?? hostedCanvas(), g = cv.getContext('2d')!;
/** Hosted, the board draws on a canvas of its own, laid out off the page (so it has a size) and shown by the forge. */
function hostedCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;left:-30000px;top:0;width:1600px;height:900px;pointer-events:none;visibility:hidden';
  document.body.appendChild(c); return c;
}
let drawQueued = false;
function draw(): void { if (!PAGE && !wall.active) return; if (!drawQueued) { drawQueued = true; requestAnimationFrame(paint); } }
function rr(x: number, y: number, w: number, h: number, r: number): void { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wirePath(e: LiveEdge): [number, number, number, number] | null {
  const b = cur(); if (!b.nodes[e.from] || !b.nodes[e.to]) return null;
  const a = geo(e.from), c = geo(e.to), o = a.outs.find((x) => x.p.name === e.out), i = c.ins.find((x) => x.p.name === e.in);
  if (!o || !i) return null;
  return [a.x + a.w, o.y, c.x, i.y];
}
function bez(x1: number, y1: number, x2: number, y2: number, t: number): [number, number] {
  const dx = Math.max(60, Math.abs(x2 - x1) * 0.5), cx1 = x1 + dx, cx2 = x2 - dx, u = 1 - t;
  return [u * u * u * x1 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x2, u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2];
}
let dragWire: { from: string; out: string; x: number; y: number } | null = null, box: { x0: number; y0: number; x1: number; y1: number } | null = null;
let suggestions: Suggestion[] | null = null;
/** How each 3D view is turned, and whether any turns by itself (then the board is drawn again each frame). */
const orbits = new Map<string, { yaw: number; pitch: number }>(); let spinning = false, orbiting: string | null = null;
const orbitOf = (id: string) => orbits.get(id) ?? orbits.set(id, { yaw: 0.7, pitch: 0.42 }).get(id)!;
const dimmed = (): Set<string> => new Set((suggestions ??= suggest(cur(), curEngine())).filter((s) => s.kind === 'dead').flatMap((s) => s.nodes));

function paint(): void {
  drawQueued = false; spinning = false;
  const dpr = window.devicePixelRatio || 1, W0 = cv.clientWidth, H0 = cv.clientHeight;
  if (cv.width !== Math.round(W0 * dpr) || cv.height !== Math.round(H0 * dpr)) { cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W0, H0);
  // on a wall in the room it is its own sheet, not see-through
  if (!PAGE) { g.fillStyle = '#070a10'; g.fillRect(0, 0, W0, H0); }
  // the grid
  const step = 32 * view.k; if (step > 8) { g.fillStyle = '#16202e'; for (let x = view.ox % step; x < W0; x += step) for (let y = view.oy % step; y < H0; y += step) g.fillRect(x, y, 1.5, 1.5); }
  g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  const b = cur(), t = performance.now(), dead = dimmed();
  const [vx0, vy0] = toWorld(0, 0), [vx1, vy1] = toWorld(W0, H0);
  const seen = (gg: Geo) => gg.x + gg.w > vx0 - 40 && gg.x < vx1 + 40 && gg.y + gg.h > vy0 - 40 && gg.y < vy1 + 40;
  // wires under blocks
  for (const e of edgesOf(b)) {
    if (!isWire(e)) continue; const p = wirePath(e); if (!p) continue;
    const [x1, y1, x2, y2] = p, dx = Math.max(60, Math.abs(x2 - x1) * 0.5), op = geo(e.from).outs.find((x) => x.p.name === e.out)?.p, col = typeColour(op);
    g.strokeStyle = col; g.globalAlpha = dead.has(e.from) ? 0.25 : 0.9; g.lineWidth = selWire === e.id ? 4 : 2.2;
    if (op?.type === 'any') g.setLineDash([6, 5]); else g.setLineDash([]);
    if (elemOf(op?.type ?? 'any') || (local.board === b && local.mapsOver(e.from).size)) g.lineWidth += 1.6;
    g.beginPath(); g.moveTo(x1, y1); g.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  }
  pulses = pulses.filter((p) => t - p.t0 < 700);
  for (const pu of pulses) {
    const e = b.edges[pu.e]; if (!e) continue; const p = wirePath({ ...e, id: pu.e }); if (!p) continue;
    const [px, py] = bez(p[0], p[1], p[2], p[3], (t - pu.t0) / 700);
    g.fillStyle = '#ffffff'; g.shadowColor = typeColour(geo(e.from).outs.find((x) => x.p.name === e.out)?.p); g.shadowBlur = 14; g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
  }
  // blocks
  for (const n of nodesOf(b)) {
    const id = n.id, node = b.nodes[id]!; if (!node.block && !node.inner) continue;
    const gg = geo(id); if (!seen(gg)) continue;
    const d = blockOf(node), k = d?.kind ?? 'group', hue = heat ? heatColour(id) : KINDS[k].hue, s = stateOf(id), on = sel.has(id);
    const gl = glow.get(id), ga = gl ? Math.max(0, 1 - (t - gl) / 800) : 0;
    g.globalAlpha = dead.has(id) ? 0.45 : 1;
    if (ga > 0) { g.shadowColor = hue; g.shadowBlur = 30 * ga; }
    rr(gg.x, gg.y, gg.w, gg.h, 12); g.fillStyle = '#0f1520'; g.fill(); g.shadowBlur = 0;
    // header
    const grad = g.createLinearGradient(gg.x, gg.y, gg.x + gg.w, gg.y); grad.addColorStop(0, hue); grad.addColorStop(1, shade(hue));
    g.save(); rr(gg.x, gg.y, gg.w, gg.h, 12); g.clip(); g.fillStyle = grad; g.fillRect(gg.x, gg.y, gg.w, HEAD); g.restore();
    g.fillStyle = '#05080c'; g.font = '700 14px system-ui, sans-serif'; g.textBaseline = 'middle';
    g.fillText(KINDS[k].mark, gg.x + 10, gg.y + HEAD / 2);
    g.fillText(clip(node.label || d?.name || 'Block', node.inner || d?.graph ? 26 : 30), gg.x + 32, gg.y + HEAD / 2);
    if (s?.mapped) { g.font = '700 11px system-ui'; const tx = `×${s.mapped.toLocaleString()}`, tw = g.measureText(tx).width; rr(gg.x + gg.w - tw - 16, gg.y + 8, tw + 10, 18, 9); g.fillStyle = '#05080cbb'; g.fill(); g.fillStyle = '#fff'; g.fillText(tx, gg.x + gg.w - tw - 11, gg.y + 17); }
    if (node.inner || d?.graph) { g.fillStyle = '#05080c'; g.font = '11px system-ui'; g.fillText(node.inner ? '▣ open' : '▣ block', gg.x + gg.w - 52, gg.y + HEAD / 2); }
    // outline: chosen, failed, waiting
    rr(gg.x, gg.y, gg.w, gg.h, 12); g.lineWidth = on ? 3 : 1.4;
    g.strokeStyle = on ? '#ffffff' : s?.status === 'failed' ? '#ff5252' : s?.status === 'waiting' ? '#ffb300' : '#273449';
    if (s?.status === 'waiting' && !on) g.setLineDash([6, 4]); g.stroke(); g.setLineDash([]);
    // ports
    g.font = '13px system-ui, sans-serif';
    const into = local.board === b ? local.wiresInto(id) : [];
    const outW = gg.outs.map((q) => { const v = s?.status === 'ok' ? s.out?.[q.p.name] : undefined; return g.measureText(v === undefined ? q.p.name : `${clip(q.p.name, 10)} ${clip(show(v, q.p.unit), 20)}`).width; });
    for (const [row, q] of gg.ins.entries()) {
      const wired = into.some((e) => e.in === q.p.name), c = typeColour(q.p);
      g.fillStyle = c; g.beginPath(); g.arc(gg.x, q.y, 5.5, 0, Math.PI * 2); g.fill();
      if (!wired) { g.fillStyle = '#0f1520'; g.beginPath(); g.arc(gg.x, q.y, 2.6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = q.p.optional && !wired ? '#6b7a8f' : '#c8d4e3'; g.fillText(clip(q.p.name, 12), gg.x + 12, q.y);
      const v = node.set?.[q.p.name];
      if (!wired && v !== undefined && v !== '') {
        const x0 = gg.x + 12 + g.measureText(clip(q.p.name, 12)).width + 6, room = gg.x + gg.w - 18 - (outW[row] ?? 0) - x0;
        let t = `= ${show(typeof v === 'string' && (q.p.type === 'number' || q.p.type === 'integer') ? readQuantity(v, q.p.unit) : v, q.p.unit)}`; while (t.length > 2 && g.measureText(t).width > room) t = `${t.slice(0, -2)}…`;
        if (room > 24) { g.fillStyle = '#7f8ea3'; g.fillText(t, x0, q.y); }
      }
    }
    for (const q of gg.outs) {
      const c = typeColour(q.p); g.fillStyle = c; g.beginPath(); g.arc(gg.x + gg.w, q.y, 5.5, 0, Math.PI * 2); g.fill();
      const v = s?.status === 'ok' ? s.out?.[q.p.name] : undefined, txt = v === undefined ? q.p.name : `${clip(q.p.name, 10)} ${clip(show(v, q.p.unit), 20)}`;
      g.fillStyle = v === undefined ? '#8796aa' : '#ffffff'; const tw = g.measureText(txt).width; g.fillText(txt, gg.x + gg.w - 12 - tw, q.y);
    }
    // what a viewer shows
    if (gg.bodyH) paintBody(id, gg, s);
    // its foot: what it is doing
    const fy = gg.y + gg.h - FOOT / 2; g.font = '12px system-ui';
    if (s?.status === 'failed') { g.fillStyle = '#ff8a80'; g.fillText(clip(`✕ ${s.error}`, 44), gg.x + 10, fy); }
    else if (s?.status === 'waiting') { g.fillStyle = '#ffd180'; g.fillText(clip(`… ${s.error}`, 44), gg.x + 10, fy); }
    else if (s?.status === 'ok') { g.fillStyle = '#5f6f84'; g.fillText(`${s.cached ? '✓ reused' : '● ran'} · ${s.ms < 1 ? `${(s.ms * 1000).toFixed(0)} µs` : `${s.ms.toFixed(1)} ms`}${s.runs ? ` · ${s.runs} run${s.runs > 1 ? 's' : ''}` : ''}${d?.by !== 'built in' && d ? ` · ${d.by}` : ''}`, gg.x + 10, fy); }
    else { g.fillStyle = '#5f6f84'; g.fillText(KINDS[k].name, gg.x + 10, fy); }
    g.globalAlpha = 1;
  }
  if (dragWire) {
    const a = geo(dragWire.from), o = a.outs.find((x) => x.p.name === dragWire!.out); if (o) {
      const [x2, y2] = toWorld(dragWire.x, dragWire.y), x1 = a.x + a.w, y1 = o.y, dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
      g.strokeStyle = typeColour(o.p); g.lineWidth = 2.5; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(x1, y1); g.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2); g.stroke(); g.setLineDash([]);
    }
  }
  if (box) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.strokeStyle = '#40c4ff'; g.fillStyle = '#40c4ff18'; g.lineWidth = 1; const x = Math.min(box.x0, box.x1), y = Math.min(box.y0, box.y1); g.fillRect(x, y, Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0)); g.strokeRect(x, y, Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0)); }
  paintMap(dpr, W0, H0);
  if (!nodesOf(b).length) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#5f6f84'; g.font = '15px system-ui'; g.textAlign = 'center'; g.fillText('Drag a block from the library, or type its name above (Ctrl K)', W0 / 2, H0 / 2); g.textAlign = 'left'; }
  wall.painted?.();
  if (spinning || pulses.length || [...glow.values()].some((x) => t - x < 800)) draw();
}
/** The whole board small, in a corner, with what is in view outlined: where the rest of it is. Shown only when some of
 *  the board is out of view; pressing it goes there. */
let mapBox: { x: number; y: number; w: number; h: number; x0: number; y0: number; s: number } | null = null;
function paintMap(dpr: number, W0: number, H0: number): void {
  mapBox = null; const ns = nodesOf(cur()).map((n) => geo(n.id)); if (ns.length < 2) return;
  const x0 = Math.min(...ns.map((n) => n.x)), y0 = Math.min(...ns.map((n) => n.y)), x1 = Math.max(...ns.map((n) => n.x + n.w)), y1 = Math.max(...ns.map((n) => n.y + n.h));
  const [vx0, vy0] = toWorld(0, 0), [vx1, vy1] = toWorld(W0, H0); if (vx0 <= x0 && vy0 <= y0 && vx1 >= x1 && vy1 >= y1) return;
  const mw = Math.min(200, W0 * 0.3), s = mw / (x1 - x0), mh = Math.min(140, (y1 - y0) * s), sc = Math.min(s, mh / (y1 - y0)), bx = W0 - mw - 12, by = H0 - mh - 30;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); rr(bx - 6, by - 6, mw + 12, mh + 12, 8); g.fillStyle = '#0a0f17e6'; g.fill(); g.strokeStyle = '#1f2a3a'; g.lineWidth = 1; g.stroke();
  for (const n of nodesOf(cur())) { const gg = geo(n.id), d = blockOf(cur().nodes[n.id]!); g.fillStyle = KINDS[d?.kind ?? 'group'].hue; g.fillRect(bx + (gg.x - x0) * sc, by + (gg.y - y0) * sc, Math.max(2, gg.w * sc), Math.max(2, gg.h * sc)); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.strokeRect(bx + (vx0 - x0) * sc, by + (vy0 - y0) * sc, (vx1 - vx0) * sc, (vy1 - vy0) * sc);
  mapBox = { x: bx, y: by, w: mw, h: mh, x0, y0, s: sc };
}
function paintBody(id: string, gg: Geo, s: NodeState | undefined): void {
  const n = cur().nodes[id]!, x = gg.x + 10, y = gg.bodyY, w = gg.w - 20, h = gg.bodyH - 6, inV = local.board === cur() ? local.wiresInto(id)[0] : undefined;
  const inState = inV ? stateOf(inV.from) : undefined, val = inV ? inState?.out?.[inV.out!] : undefined, op = inV ? geo(inV.from).outs.find((q) => q.p.name === inV.out)?.p : undefined;
  rr(x, y, w, h, 8); g.fillStyle = '#080c13'; g.fill();
  const b = n.block;
  if (b === 'note') { g.fillStyle = '#fff59d'; g.font = '12px system-ui'; String(n.set?.text ?? '').split('\n').flatMap((l) => l.match(/.{1,30}(\s|$)|.{1,30}/g) ?? ['']).slice(0, 10).forEach((l, i) => g.fillText(l, x + 6, y + 12 + i * 16)); return; }
  if (val === undefined) { g.fillStyle = '#4a5a70'; g.font = '12px system-ui'; g.fillText(inV ? 'nothing yet' : 'wire something in', x + 8, y + h / 2); return; }
  if (b === 'view.3d') {
    const part = asDrawn(val), o = orbitOf(id), dpr = window.devicePixelRatio || 1;
    if (n.set?.spin !== false && !(mode === 'orbit' && orbiting === id)) { o.yaw += 0.006; spinning = true; }
    try { const c = shot(id, part, { yaw: o.yaw, pitch: o.pitch, explode: Math.max(0, Math.min(4, Math.round(Number(n.set?.explode ?? 0)))), w: w * view.k, h: h * view.k, dpr }); g.drawImage(c, x, y, w, h); }
    catch (e) { g.fillStyle = '#ff8a80'; g.font = '12px system-ui'; g.fillText(clip(`cannot draw in 3D here: ${(e as Error).message}`, 40), x + 8, y + h / 2); }
    g.fillStyle = '#dfe7f1'; g.font = '600 12px system-ui'; g.fillText(clip(part?.name ?? '', 34), x + 8, y + 14);
    g.fillStyle = '#7f8ea3'; g.font = '11px system-ui'; g.fillText('drag to turn · ⤢ in the panel for full screen', x + 8, y + h - 8); return;
  }
  if (b === 'view.show') { const u = String(n.set?.unit ?? ''); let v = val; if (u && typeof v === 'number') { try { v = Number((v / readUnit(u)).toPrecision(5)); } catch { /* shown in SI */ } } g.fillStyle = typeColour(op); g.font = '700 22px system-ui'; g.fillText(clip(u && typeof v === 'number' ? `${v} ${u}` : show(v, op?.unit), 18), x + 8, y + h / 2); return; }
  if (b === 'view.gauge') {
    const lo = Number(n.set?.min ?? 0), hi = Number(n.set?.max ?? 100), f = Math.max(0, Math.min(1, (Number(val) - lo) / (hi - lo || 1))), cx = x + w / 2, cy = y + h - 10, r = Math.min(w / 2 - 10, h - 18);
    g.lineWidth = 9; g.strokeStyle = '#1c2635'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 2 * Math.PI); g.stroke();
    g.strokeStyle = `hsl(${120 - 120 * f}, 90%, 55%)`; g.beginPath(); g.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * f); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 14px system-ui'; g.textAlign = 'center'; g.fillText(show(val, op?.unit), cx, cy - 6); g.textAlign = 'left'; return;
  }
  if (b === 'view.chart') {
    const ys = (Array.isArray(val) ? val : [val]).map(Number).filter(Number.isFinite), xin = local.wiresInto(id).find((e) => e.in === 'x'), xs0 = xin ? stateOf(xin.from)?.out?.[xin.out!] : undefined;
    const xs = Array.isArray(xs0) && xs0.length === ys.length ? xs0.map(Number) : ys.map((_, i) => i);
    if (ys.length < 2) { g.fillStyle = '#4a5a70'; g.font = '12px system-ui'; g.fillText('needs two or more values', x + 8, y + h / 2); return; }
    const y0 = Math.min(...ys), y1 = Math.max(...ys), x0 = Math.min(...xs), x1 = Math.max(...xs), px = (v: number) => x + 8 + ((v - x0) / (x1 - x0 || 1)) * (w - 16), py = (v: number) => y + h - 30 - ((v - y0) / (y1 - y0 || 1)) * (h - 46);
    if (y0 < 0 && y1 > 0) { g.strokeStyle = '#2b3a50'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 8, py(0)); g.lineTo(x + w - 8, py(0)); g.stroke(); }
    const col = typeColour(op), fill = g.createLinearGradient(0, y, 0, y + h); fill.addColorStop(0, col + '55'); fill.addColorStop(1, col + '00');
    g.beginPath(); g.moveTo(px(xs[0]!), py(ys[0]!)); for (let i = 1; i < ys.length; i++) g.lineTo(px(xs[i]!), py(ys[i]!)); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
    g.lineTo(px(xs[xs.length - 1]!), y + h - 30); g.lineTo(px(xs[0]!), y + h - 30); g.closePath(); g.fillStyle = col.startsWith('#') ? fill : '#ffffff18'; g.fill();
    const xp = xin ? geo(xin.from).outs.find((q) => q.p.name === xin.out)?.p : undefined;
    g.fillStyle = '#9fb0c4'; g.font = '11px system-ui'; g.fillText(show(y1, op?.unit), x + 8, y + 10); g.fillText(show(y0, op?.unit), x + 8, y + h - 24);
    g.fillStyle = '#7f8ea3'; g.fillText(xin ? show(x0, xp?.unit) : '1', x + 8, y + h - 6); const xr = xin ? show(x1, xp?.unit) : String(ys.length), tw = g.measureText(xr).width; g.fillText(xr, x + w - 8 - tw, y + h - 6); return;
  }
  if (b === 'view.table') {
    const rows = Array.isArray(val) ? (val as Record<string, unknown>[]) : [], cols = rows[0] ? Object.keys(rows[0]).slice(0, 4) : [], cw = (w - 8) / Math.max(1, cols.length);
    g.font = '600 11px system-ui'; g.fillStyle = '#9fb3c8'; cols.forEach((c, i) => g.fillText(clip(c, 10), x + 6 + i * cw, y + 11));
    g.font = '11px system-ui'; g.fillStyle = '#dfe7f1'; rows.slice(0, 6).forEach((r, j) => cols.forEach((c, i) => g.fillText(clip(show(r[c]), 10), x + 6 + i * cw, y + 28 + j * 15)));
    if (rows.length > 6) { g.fillStyle = '#5f6f84'; g.fillText(`… ${rows.length} rows`, x + 6, y + h - 6); }
  }
}
const readUnit = (u: string): number => { const v = readQuantity(`1 ${u}`); if (typeof v !== 'number') throw new Error(v.error); return v; };
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
function shade(hex: string): string { if (!hex.startsWith('#')) return hex; const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255, k = 0.62; return `rgb(${Math.round(r * k)}, ${Math.round(gg * k)}, ${Math.round(b * k)})`; }

// ---- pointing ---------------------------------------------------------------------------------------------------------
type Hit = { kind: 'in' | 'out'; id: string; port: string } | { kind: 'node'; id: string } | { kind: 'wire'; id: string } | null;
function hit(sx: number, sy: number): Hit {
  const [x, y] = toWorld(sx, sy), r = 10 / view.k, ns = nodesOf(cur()).map((n) => n.id).filter((id) => cur().nodes[id]!.block || cur().nodes[id]!.inner).reverse();
  for (const id of ns) { const gg = geo(id); for (const q of gg.outs) if (Math.hypot(x - (gg.x + gg.w), y - q.y) < r) return { kind: 'out', id, port: q.p.name }; for (const q of gg.ins) if (Math.hypot(x - gg.x, y - q.y) < r) return { kind: 'in', id, port: q.p.name }; }
  for (const id of ns) { const gg = geo(id); if (x >= gg.x && x <= gg.x + gg.w && y >= gg.y && y <= gg.y + gg.h) return { kind: 'node', id }; }
  for (const e of edgesOf(cur())) { if (!isWire(e)) continue; const p = wirePath(e); if (!p) continue; for (let i = 0; i <= 30; i++) { const [px, py] = bez(p[0], p[1], p[2], p[3], i / 30); if (Math.hypot(px - x, py - y) < 7 / view.k) return { kind: 'wire', id: e.id }; } }
  return null;
}
let mode: 'none' | 'pan' | 'drag' | 'wire' | 'box' | 'pinch' | 'orbit' = 'none', last = { x: 0, y: 0 }, moved = false, dragStart: Map<string, [number, number]> = new Map();
const touches = new Map<number, { x: number; y: number }>(); let pinch0 = { d: 0, k: 1, cx: 0, cy: 0 };
const pos = (e: PointerEvent | MouseEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
cv.addEventListener('pointerdown', (e) => { try { cv.setPointerCapture(e.pointerId); } catch { /* a pointer the page does not own */ } pointerDown(pos(e), e.pointerId, e.shiftKey); });
cv.addEventListener('pointermove', (e) => pointerMove(pos(e), e.pointerId));
cv.addEventListener('pointerup', (e) => pointerUp(pos(e), e.pointerId));
type At = { x: number; y: number };
/** A press at a point of the canvas (CSS pixels): a mouse, a finger, or a hand's ray on the forge's wall. */
function pointerDown(p: At, pid: number, shift = false): void {
  touches.set(pid, p); last = p; moved = false;
  if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), k: view.k, cx: (a!.x + b!.x) / 2, cy: (a!.y + b!.y) / 2 }; mode = 'pinch'; dragWire = null; return; }
  if (mapBox && p.x >= mapBox.x - 6 && p.x <= mapBox.x + mapBox.w + 6 && p.y >= mapBox.y - 6 && p.y <= mapBox.y + mapBox.h + 6) {
    const wx = mapBox.x0 + (p.x - mapBox.x) / mapBox.s, wy = mapBox.y0 + (p.y - mapBox.y) / mapBox.s; view.ox = cv.clientWidth / 2 - wx * view.k; view.oy = cv.clientHeight / 2 - wy * view.k; mode = 'none'; draw(); return;
  }
  const h = hit(p.x, p.y);
  if (h?.kind === 'out') { mode = 'wire'; dragWire = { from: h.id, out: h.port, ...p }; return; }
  if (h?.kind === 'in') {
    // pick up the wire already in it, to move it elsewhere
    const w = local.wiresInto(h.id).find((x) => x.in === h.port);
    if (w) { edit((b) => { b.edges[w.id] = { ...b.edges[w.id]!, deleted: true }; }); mode = 'wire'; dragWire = { from: w.from, out: w.out!, ...p }; return; }
  }
  if (h?.kind === 'node' && cur().nodes[h.id]?.block === 'view.3d') {
    const gg = geo(h.id), [, wy] = toWorld(p.x, p.y);
    if (wy >= gg.bodyY && wy <= gg.bodyY + gg.bodyH) { mode = 'orbit'; orbiting = h.id; sel.clear(); sel.add(h.id); renderInspector(true); return; }
  }
  if (h?.kind === 'node') {
    if (shift) { if (sel.has(h.id)) sel.delete(h.id); else sel.add(h.id); } else if (!sel.has(h.id)) { sel.clear(); sel.add(h.id); }
    selWire = null; mode = 'drag'; dragStart = new Map([...sel].map((id) => [id, [cur().nodes[id]!.x ?? 0, cur().nodes[id]!.y ?? 0]]));
    renderInspector(true); draw(); return;
  }
  if (h?.kind === 'wire') { selWire = h.id; sel.clear(); renderInspector(true); draw(); mode = 'none'; return; }
  if (shift) { mode = 'box'; box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; return; }
  mode = 'pan';
}
function pointerMove(p: At, pid: number): void {
  if (touches.has(pid)) touches.set(pid, p);
  if (mode === 'pinch' && touches.size === 2) { const [a, b] = [...touches.values()], d = Math.hypot(a!.x - b!.x, a!.y - b!.y); zoomAt(pinch0.cx, pinch0.cy, (pinch0.k * d) / (pinch0.d || 1) / view.k); return; }
  const dx = p.x - last.x, dy = p.y - last.y; if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
  if (mode === 'pan') { view.ox += dx; view.oy += dy; last = p; draw(); }
  else if (mode === 'orbit' && orbiting) { const o = orbitOf(orbiting); o.yaw -= dx * 0.01; o.pitch = Math.max(-1.45, Math.min(1.45, o.pitch + dy * 0.01)); last = p; draw(); }
  else if (mode === 'drag') { last = p; const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(dx, dy); for (const id of sel) { const n = cur().nodes[id]!; n.x = (n.x ?? 0) + (x1 - x0); n.y = (n.y ?? 0) + (y1 - y0); } draw(); }
  else if (mode === 'wire' && dragWire) { dragWire.x = p.x; dragWire.y = p.y; draw(); }
  else if (mode === 'box' && box) { box.x1 = p.x; box.y1 = p.y; draw(); }
  else { const h = hit(p.x, p.y); cv.style.cursor = h?.kind === 'in' || h?.kind === 'out' ? 'crosshair' : h?.kind === 'node' ? 'grab' : h?.kind === 'wire' ? 'pointer' : 'default'; }
}
function pointerUp(p: At, pid: number): void {
  touches.delete(pid);
  if (mode === 'pinch') { if (touches.size < 2) mode = 'none'; return; }
  if (mode === 'wire' && dragWire) {
    const h = hit(p.x, p.y), from = dragWire.from, out = dragWire.out;
    if (h?.kind === 'in' || h?.kind === 'node') {
      const to = h.id, ports = portsFor(to).inputs, inp = h.kind === 'in' ? h.port : ports.find((q) => local.canWire(from, out, to, q.name).ok && !local.wiresInto(to).some((w) => w.in === q.name))?.name ?? ports.find((q) => local.canWire(from, out, to, q.name).ok)?.name;
      if (!inp) toast('nothing on that block takes this', true);
      else { const r = local.canWire(from, out, to, inp); if (!r.ok) toast(r.why, true); else { edit((b) => { wire(b, from, out, to, inp); }); if (r.map) toast('a list into a single value: it runs once for each item'); else if (r.convert) toast(`converted on the wire: ${r.convert}`); } }
    } else if (!h) { pendingWire = { from, out }; const [wx, wy] = toWorld(p.x, p.y); placeAt = [wx, wy - 20]; openCmd(''); }
    dragWire = null;
  } else if (mode === 'drag' && moved) {
    const moves = [...sel].map((id) => [id, cur().nodes[id]!.x, cur().nodes[id]!.y] as const);
    for (const [id, [x, y]] of dragStart) { cur().nodes[id]!.x = x; cur().nodes[id]!.y = y; }
    edit((b) => { for (const [id, x, y] of moves) { b.nodes[id]!.x = Math.round(x ?? 0); b.nodes[id]!.y = Math.round(y ?? 0); } });
  } else if (mode === 'box' && box) {
    const [ax, ay] = toWorld(Math.min(box.x0, box.x1), Math.min(box.y0, box.y1)), [bx, by] = toWorld(Math.max(box.x0, box.x1), Math.max(box.y0, box.y1));
    for (const n of nodesOf(cur())) { const gg = geo(n.id); if (gg.x >= ax && gg.x + gg.w <= bx && gg.y >= ay && gg.y + gg.h <= by) sel.add(n.id); }
    box = null; renderInspector(true);
  } else if (mode === 'pan' && !moved) { sel.clear(); selWire = null; renderInspector(true); }
  mode = 'none'; orbiting = null; draw();
}
cv.addEventListener('dblclick', (e) => {
  const p = pos(e), h = hit(p.x, p.y);
  if (h?.kind === 'node' && cur().nodes[h.id]?.inner) { enter(h.id); return; }
  if (!h) { const [wx, wy] = toWorld(p.x, p.y); placeAt = [wx, wy]; openCmd(''); }
});
function zoomAt(sx: number, sy: number, f: number): void { const k = Math.max(0.08, Math.min(3, view.k * f)); const [wx, wy] = toWorld(sx, sy); view.k = k; view.ox = sx - wx * k; view.oy = sy - wy * k; draw(); }
cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2 && !e.shiftKey) zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015)); else { view.ox -= e.deltaX; view.oy -= e.deltaY; draw(); } }, { passive: false });
cv.addEventListener('dragover', (e) => { e.preventDefault(); });
cv.addEventListener('drop', (e) => { e.preventDefault(); const id = e.dataTransfer?.getData('text/block'); if (!id) return; const p = pos(e); const [x, y] = toWorld(p.x, p.y); addBlock(id, x - W / 2, y - 20); });
new ResizeObserver(() => draw()).observe(cv);

// ---- doing things ---------------------------------------------------------------------------------------------------
let placeAt: [number, number] | null = null, pendingWire: { from: string; out: string } | null = null;
function addBlock(blockId: string, x?: number, y?: number): void {
  const [cx, cy] = toWorld(cv.clientWidth / 2, cv.clientHeight / 2), at = x !== undefined ? [x, y!] : placeAt ?? [cx - W / 2 + (Math.random() - 0.5) * 60, cy - 60 + (Math.random() - 0.5) * 60];
  placeAt = null; const id = uid('n'), pw = pendingWire; pendingWire = null;
  edit((b) => {
    placeBlock(b, blockId, Math.round(at[0]!), Math.round(at[1]!), {}, id);
    if (pw) { const e = new Engine(b), inp = portsFor(id).inputs.find((q) => e.canWire(pw.from, pw.out, id, q.name).ok); if (inp) wire(b, pw.from, pw.out, id, inp.name); }
  });
  sel.clear(); sel.add(id); renderInspector(true); draw();
}
function removeSelected(): void {
  if (selWire) { const w = selWire; edit((b) => { b.edges[w] = { ...b.edges[w]!, deleted: true }; }); selWire = null; draw(); return; }
  if (!sel.size) return;
  const ids = [...sel]; edit((b) => { for (const id of ids) { b.nodes[id] = { ...b.nodes[id]!, deleted: true }; for (const e of edgesOf(b)) if (e.from === id || e.to === id) b.edges[e.id] = { ...b.edges[e.id]!, deleted: true }; } });
  sel.clear(); renderInspector(true); draw();
}
function group(): void {
  if (!sel.size) { toast('choose blocks first: shift-drag a box round them', true); return; }
  let made = ''; const ids = [...sel];
  edit((b) => { const r = collapse(b, ids, 'Group'); tidy(r.board.nodes[r.id]!.inner!); Object.assign(b, { nodes: r.board.nodes, edges: r.board.edges }); made = r.id; if (r.folded.length > ids.length) toast(`folded ${r.folded.length - ids.length} more that lie between them, or the group would feed itself`); });
  sel.clear(); sel.add(made); renderInspector(true); draw();
}
function unfold(id: string): void { edit((b) => { const r = expand(b, id); Object.assign(b, { nodes: r.nodes, edges: r.edges }); }); sel.clear(); renderInspector(true); draw(); }
function cut(id: string): void {
  let says = ''; edit((b) => { const r = cutBranch(b, id); Object.assign(b, { nodes: r.board.nodes, edges: r.board.edges }); says = `cut ${r.removed.length} block${r.removed.length > 1 ? 's' : ''}${r.kept.length ? `; kept ${r.kept.length} that something else still feeds` : ''}`; });
  toast(says); sel.clear(); renderInspector(true); draw();
}
function merge(): void { let n = 0; edit((b) => { const r = mergeTwins(b); Object.assign(b, { nodes: r.board.nodes, edges: r.board.edges }); n = r.merged; }); toast(n ? `merged ${n} block${n > 1 ? 's' : ''} into the one each repeated` : 'nothing to merge'); renderInspector(true); draw(); }
function saveAsBlock(id: string): void {
  const name = prompt('Name the new block', cur().nodes[id]?.label || 'My block'); if (!name) return;
  let out: { block: BlockDef; duplicateOf?: string } | null = null;
  edit((b) => { const r = makeBlock(b, id, { name, domains: ['software'] }); Object.assign(b, { nodes: r.board.nodes }); out = r; });
  const r = out as { block: BlockDef; duplicateOf?: string } | null;
  if (r) { if (r.duplicateOf) toast(`that does what ${block(r.duplicateOf)?.name} already does: placed that one instead`); else { keepBlock(r.block); toast(`"${name}" is in the library, under Software & data`); } renderLibrary(); }
  renderInspector(true); draw();
}
function openCopy(id: string): void { const n = cur().nodes[id]!, d = blockOf(n); if (!d?.graph) return; edit((b) => { b.nodes[id] = { label: n.label, inner: structuredClone(d.graph!), x: n.x, y: n.y }; }); renderInspector(true); draw(); }
function enter(id: string): void { path.push(id); sel.clear(); refreshLocal(); suggestions = null; fit(); renderAll(); }
function up(to: number): void { path = path.slice(0, to); sel.clear(); refreshLocal(); suggestions = null; fit(); renderAll(); }
function fit(): void {
  const ns = nodesOf(cur()).map((n) => geo(n.id)); if (!ns.length) { view.ox = cv.clientWidth / 2; view.oy = cv.clientHeight / 2; view.k = 1; draw(); return; }
  const x0 = Math.min(...ns.map((n) => n.x)), y0 = Math.min(...ns.map((n) => n.y)), x1 = Math.max(...ns.map((n) => n.x + n.w)), y1 = Math.max(...ns.map((n) => n.y + n.h));
  // the whole board where it fits at a size that can be read; else readable, from its start (pan or zoom for the rest)
  const whole = Math.min((cv.clientWidth - 60) / (x1 - x0), (cv.clientHeight - 60) / (y1 - y0)), least = cv.clientWidth < 600 ? 0.55 : 0.8;
  const k = Math.min(1.15, Math.max(least, whole));
  view.k = k;
  view.ox = whole >= least ? cv.clientWidth / 2 - ((x0 + x1) / 2) * k : 30 - x0 * k;
  view.oy = whole >= least || (y1 - y0) * k < cv.clientHeight - 60 ? cv.clientHeight / 2 - ((y0 + y1) / 2) * k : 30 - y0 * k; draw();
}
/**
 * Lays a board out in columns by how far each block is from where its values start, each column in the order of what
 * feeds it, so wires run left to right and nothing sits on anything.
 */
function tidy(b: Board): Board {
  const e = new Engine(b), col = new Map<string, number>();
  for (const id of e.sequence) col.set(id, Math.max(0, ...e.wiresInto(id).map((w) => (col.get(w.from) ?? 0) + 1)));
  for (const n of nodesOf(b)) if (!col.has(n.id)) col.set(n.id, 0);
  // a block that only feeds one later column sits next to it: values start where they are used
  for (const id of [...e.sequence].reverse()) { const outs = e.wiresFrom(id); if (outs.length && !e.wiresInto(id).length) col.set(id, Math.max(0, Math.min(...outs.map((w) => col.get(w.to)!)) - 1)); }
  const cols = new Map<number, string[]>(); for (const [id, c] of col) (cols.get(c) ?? cols.set(c, []).get(c)!).push(id);
  const yAt = new Map<string, number>(); const save = (id: string) => b.nodes[id]!;
  for (const c of [...cols.keys()].sort((x, y) => x - y)) {
    const ids = cols.get(c)!, bary = (id: string) => { const ws = e.wiresInto(id); return ws.length ? ws.reduce((t, w) => t + (yAt.get(w.from) ?? 0), 0) / ws.length : (save(id).y ?? 0); };
    ids.sort((a, z) => bary(a) - bary(z));
    let y = 0; for (const id of ids) { const n = save(id); n.x = c * (W + 90); const want = Math.max(y, bary(id) - 20); n.y = Math.round(c === 0 ? y : want); yAt.set(id, n.y); y = n.y + geoOf(b, id) + 26; }
  }
  return b;
}
/** A block's height on a board not (yet) in view. */
/** What a 3D view block is given, as a part's tree to draw (an assembly made one, once per assembly). */
const drawnKept = new WeakMap<object, Part>();
function asDrawn(v: unknown): Part { if (isAssembly(v)) { let p = drawnKept.get(v); if (!p) { p = partOf(v); drawnKept.set(v, p); } return p; } return v as Part; }
function geoOf(b: Board, id: string): number { const n = b.nodes[id]!, d = blockOf(n), p = d ? portsOf(d, { ...defaultsOf(d), ...(n.set ?? {}) }) : { inputs: [], outputs: [] }, blk = n.block ?? ''; const bh = blk === 'view.3d' ? 240 : blk === 'view.show' ? 58 : blk === 'view.gauge' ? 86 : blk === 'view.chart' ? 150 : blk === 'view.table' ? 124 : blk === 'note' ? 16 + 16 * Math.min(10, wrapCount(String(n.set?.text ?? ''), 30)) : 0; return HEAD + 8 + Math.max(p.inputs.length, p.outputs.length) * ROW + bh + FOOT; }
function toast(s: string, bad = false): void { if (!PAGE) { wall.said?.(s, bad); return; } const t = document.getElementById('toast')!; t.textContent = s; t.className = bad ? 'bad' : ''; t.style.display = 'block'; clearTimeout((toast as unknown as { t: number }).t); (toast as unknown as { t: number }).t = window.setTimeout(() => (t.style.display = 'none'), 3200); }

// ---- the library ------------------------------------------------------------------------------------------------------
let libBy: 'domain' | 'ability' | 'kind' = 'domain';
function renderLibrary(): void {
  if (!PAGE) return;
  const q = (document.getElementById('libQ') as HTMLInputElement).value, el = document.getElementById('shelves')!;
  el.innerHTML = '';
  // boards come first: whole pipelines to start from (the starter boards, and those you saved), by field, as blocks are
  const boards = allBoards().filter((x) => !q || x.title.toLowerCase().includes(q.toLowerCase()));
  if (boards.length) {
    const d = document.createElement('details'); d.className = 'shelf'; d.open = !!q;
    d.innerHTML = `<summary>Boards <span>${boards.length}</span></summary>`;
    for (const f of [...new Set(boards.map((x) => x.field))]) {
      const h = document.createElement('div'); h.className = 'sub'; h.textContent = DOMAINS.find((x) => x.id === f)?.name ?? f; d.appendChild(h);
      for (const x of boards.filter((y) => y.field === f)) {
        const r = document.createElement('div'); r.className = 'blk'; r.title = x.mine ? 'Your board: open it (what is on the board now is kept in undo)' : 'Open this board (what is on the board now is kept in undo)';
        r.innerHTML = `<span class="chip" style="background:${x.mine ? '#b388ff' : '#18ffff'}">▦</span><span class="n">${esc(x.title)}</span>${x.mine ? '<span class="t" style="color:#b388ff">yours</span><span class="t del" title="Take it out of the library">✕</span>' : ''}`;
        r.onclick = (e) => {
          if ((e.target as HTMLElement).classList.contains('del')) { forgetBoard(x.title); renderLibrary(); return; }
          pushUndo(); useBoard(x.make()); sel.clear(); save(); fit(); runSoon(); renderAll(); document.getElementById('lib')!.classList.remove('open');
        };
        d.appendChild(r);
      }
    }
    el.appendChild(d);
  }
  for (const s of shelves(libBy, q)) {
    const d = document.createElement('details'); d.className = 'shelf'; d.open = !!q || s.blocks.length < 8;
    d.innerHTML = `<summary>${esc(s.name)} <span>${s.blocks.length}</span></summary>`;
    for (const b of s.blocks) {
      const r = document.createElement('div'); r.className = 'blk'; r.draggable = true; r.title = `${b.says}${b.valid ? `\nHolds: ${b.valid}` : ''}${b.sources?.length ? `\nFrom: ${b.sources.map((x) => x.cite).join('; ')}` : ''}`;
      r.innerHTML = `<span class="chip" style="background:${KINDS[b.kind].hue}">${esc(KINDS[b.kind].mark)}</span><span class="n">${esc(b.name)}</span>${b.tests?.length ? '' : `<span class="t" style="color:#ffb300">draft</span>`}${b.by !== 'built in' ? `<span class="t" style="color:#b388ff">${esc(b.by)}</span>` : ''}`;
      r.onclick = () => { addBlock(b.id); document.getElementById('lib')!.classList.remove('open'); };
      r.ondragstart = (e) => e.dataTransfer?.setData('text/block', b.id);
      d.appendChild(r);
    }
    el.appendChild(d);
  }
}
if (PAGE) document.getElementById('libQ')!.addEventListener('input', renderLibrary);
for (const t of document.querySelectorAll<HTMLButtonElement>('#libTop .tabs button')) t.onclick = () => { libBy = t.dataset.by as typeof libBy; for (const x of document.querySelectorAll('.tabs button')) x.classList.toggle('on', x === t); renderLibrary(); };

// ---- the inspector: each block's own calculator ---------------------------------------------------------------------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
function renderInspector(full: boolean): void {
  wall.changed?.(); if (!PAGE) return;
  const el = document.getElementById('inspector')!;
  if (!full && el.contains(document.activeElement) && document.activeElement !== document.body) { const o = document.getElementById('iouts'); if (o && sel.size === 1) o.innerHTML = outsHtml([...sel][0]!); return; }
  if (sel.size === 1) return nodeInspector(el, [...sel][0]!);
  if (sel.size > 1) {
    el.innerHTML = `<div class="ititle">${sel.size} blocks chosen</div><div class="btns"><button id="iGroup" class="hot">▣ Fold into a group</button><button id="iDel">Delete</button></div><p class="says">A group holds them as one block: what crosses its edge becomes its ports. Open it to change it; save it to the library to use it anywhere.</p>`;
    document.getElementById('iGroup')!.onclick = group; document.getElementById('iDel')!.onclick = removeSelected; return;
  }
  if (selWire) { const e = cur().edges[selWire]; el.innerHTML = `<div class="ititle">Wire</div><p class="says">${esc(cur().nodes[e?.from ?? '']?.label ?? '')}.${esc(e?.out ?? '')} → ${esc(cur().nodes[e?.to ?? '']?.label ?? '')}.${esc(e?.in ?? '')}</p><div class="btns"><button id="iDel">Delete wire</button></div>`; document.getElementById('iDel')!.onclick = removeSelected; return; }
  boardInspector(el);
}
function boardInspector(el: HTMLElement): void {
  const b = cur(), n = nodesOf(b).filter((x) => b.nodes[x.id]!.block || b.nodes[x.id]!.inner).length, sg = (suggestions ??= suggest(b, curEngine()));
  el.innerHTML = `<div class="ititle"><input id="iTitle" value="${esc(b.title ?? '')}" /></div>
    <p class="says">${n} block${n === 1 ? '' : 's'} · last change: ${lastReport.ran} block${lastReport.ran === 1 ? '' : 's'} ran, ${lastReport.cached} reused (nothing they read changed)${lastReport.failed ? `, ${lastReport.failed} failed` : ''}${lastReport.waiting ? `, ${lastReport.waiting} waiting` : ''}, in ${lastReport.ms.toFixed(1)} ms</p>
    <h3>Suggestions</h3><div id="iSug">${sg.length ? '' : '<p class="says">Nothing: no dead branches, no twins, no repeated wiring.</p>'}</div>
    <h3>Start from</h3><div id="iDemos"></div>
    <h3>This board</h3><div class="row"><label>Its field</label><select id="iField">${DOMAINS.map((d) => `<option value="${d.id}" ${d.id === (savedBoards().find((x) => x.title === b.title)?.field ?? 'everyday') ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div><div class="btns"><button id="iKeep" class="hot">Save to the library's Boards</button><button id="iExport">Export JSON</button><button id="iImport">Import JSON</button><button id="iTidy">Tidy</button><button id="iFresh">Run all afresh</button><button id="iClear">Clear</button></div>
    <h3>How</h3><div class="kbd"><b>Drag</b> from an output to an input to wire · <b>drag</b> an input's wire off to move it · <b>double-click</b> empty space to add, a group to open · <b>shift-drag</b> to choose many · <b>Ctrl G</b> fold into a group · <b>Del</b> delete · <b>Ctrl Z</b> undo · <b>F</b> fit · <b>Ctrl K</b> commands · a list wired into one value runs the block once for each item</div>`;
  (document.getElementById('iTitle') as HTMLInputElement).onchange = (e) => edit((x) => { x.title = (e.target as HTMLInputElement).value; });
  const s = document.getElementById('iSug')!;
  for (const x of sg) {
    const d = document.createElement('div'); d.className = 'sug'; d.innerHTML = `<span>${esc(x.says)}</span>`;
    const pick = document.createElement('button'); pick.textContent = 'Show'; pick.onclick = () => { sel.clear(); for (const id of x.nodes) sel.add(id); renderInspector(true); draw(); }; d.appendChild(pick);
    if (x.kind === 'twins') { const m = document.createElement('button'); m.textContent = 'Merge'; m.className = 'hot'; m.onclick = merge; d.appendChild(m); }
    if (x.kind === 'dead') { const m = document.createElement('button'); m.textContent = 'Cut'; m.onclick = () => { const ids = x.nodes; edit((bb) => { for (const id of ids) { bb.nodes[id] = { ...bb.nodes[id]!, deleted: true }; for (const e of edgesOf(bb)) if (e.from === id || e.to === id) bb.edges[e.id] = { ...bb.edges[e.id]!, deleted: true }; } }); renderInspector(true); draw(); }; d.appendChild(m); }
    if (x.kind === 'pattern') { const m = document.createElement('button'); m.textContent = 'Fold one'; m.onclick = () => { sel.clear(); for (const id of x.nodes.slice(0, x.size ?? 2)) sel.add(id); group(); }; d.appendChild(m); }
    s.appendChild(d);
  }
  const dm = document.getElementById('iDemos')!;
  for (const [name, fn] of DEMOS) { const bt = document.createElement('button'); bt.className = 'demo'; bt.textContent = name; bt.onclick = () => { pushUndo(); useBoard(fn()); sel.clear(); save(); fit(); runSoon(); renderAll(); }; dm.appendChild(bt); }
  document.getElementById('iExport')!.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(root, null, 1)], { type: 'application/json' })); a.download = `${(root.title || 'board').replace(/[^\w-]+/g, '-')}.json`; a.click(); };
  document.getElementById('iImport')!.onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { const b = JSON.parse(await i.files![0]!.text()) as Board; if (!b.nodes || !b.edges) throw new Error('not a board'); pushUndo(); useBoard(b); save(); fit(); runSoon(); renderAll(); } catch (e) { toast(`could not read it: ${(e as Error).message}`, true); } }; i.click(); };
  document.getElementById('iTidy')!.onclick = () => { edit((b) => { tidy(b); }); fit(); };
  document.getElementById('iKeep')!.onclick = () => { keepBoard((document.getElementById('iField') as HTMLSelectElement).value); renderLibrary(); toast(`"${root.title || 'My board'}" is in the library, under Boards`); };
  document.getElementById('iFresh')!.onclick = async () => { await engine.fresh(); runSoon(); };
  document.getElementById('iClear')!.onclick = () => { pushUndo(); useBoard(emptyBoard('My pipeline')); save(); runSoon(); renderAll(); };
}
function outsHtml(id: string): string {
  const s = stateOf(id), p = portsFor(id);
  let h = '';
  if (s?.status === 'failed') h += `<div class="err">✕ ${esc(s.error ?? '')}</div>`;
  if (s?.status === 'waiting') h += `<div class="wait">… ${esc(s.error ?? '')}</div>`;
  for (const o of p.outputs) { const v = s?.out?.[o.name]; h += `<div class="out" style="border-left-color:${typeColour(o)}"><span>${esc(o.label ?? o.name)}</span><b>${esc(v === undefined ? '—' : Array.isArray(v) ? show(v, o.unit) : show(v, o.unit))}</b></div>`; }
  if (s?.status === 'ok') h += `<p class="src">${s.cached ? 'reused: nothing it reads changed' : `ran in ${s.ms.toFixed(2)} ms`}${s.mapped ? `, once for each of ${s.mapped.toLocaleString()} items` : ''}</p>`;
  return h;
}
function nodeInspector(el: HTMLElement, id: string): void {
  const n = cur().nodes[id]; if (!n) { sel.clear(); return boardInspector(el); }
  const d = blockOf(n), p = portsFor(id), into = local.wiresInto(id), k = d?.kind ?? 'group';
  const settings = (d?.settings ?? []).map((s) => {
    const v = n.set?.[s.key] ?? s.default, inputId = `s_${s.key}`;
    const field = s.type === 'boolean' ? `<input type="checkbox" id="${inputId}" ${v ? 'checked' : ''} style="width:auto" />`
      : s.type === 'choice' ? `<select id="${inputId}">${(s.choices ?? []).map((c) => `<option ${c === v ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`
        : s.type === 'code' ? '' : `<input id="${inputId}" value="${esc(String(v ?? ''))}" ${s.type === 'number' ? 'inputmode="decimal"' : ''} />`;
    return s.type === 'code' ? `<label class="src">${esc(s.label)}</label><textarea id="${inputId}" spellcheck="false">${esc(String(v ?? ''))}</textarea>` : `<div class="row"><label>${esc(s.label)}</label>${field}</div>`;
  }).join('');
  const free = p.inputs.filter((q) => !into.some((e) => e.in === q.name));
  const ins = free.map((q) => {
    const v = n.set?.[q.name], shown = v === undefined ? '' : typeof v === 'number' ? String(Number(v.toPrecision(6))) : String(v);
    const typeable = q.type === 'number' || q.type === 'integer' || q.type === 'text' || q.type === 'boolean' || q.type === 'any';
    const lab = `<label title="${esc(q.label ?? q.name)}"><span class="dot" style="background:${typeColour(q)}"></span>${esc(q.label ?? q.name)}</label>`;
    if (q.choices?.length) { const now = v ?? q.default; return `<div class="row">${lab}<select id="p_${esc(q.name)}">${q.choices.map((c) => `<option ${String(c) === String(now) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`; }
    return `<div class="row">${lab}${typeable ? (q.type === 'boolean' ? `<input type="checkbox" id="p_${esc(q.name)}" ${v ? 'checked' : ''} style="width:auto" />` : `<input id="p_${esc(q.name)}" value="${esc(shown)}" placeholder="${q.unit ? `in ${esc(q.unit)}, or any unit` : q.optional ? `optional${q.default !== undefined ? `, ${esc(show(q.default))}` : ''}` : ''}" />`) : `<span class="src">wire in a ${esc(q.type)}</span>`}</div>`;
  }).join('');
  el.innerHTML = `<div class="ititle"><span class="chip" style="background:${KINDS[k].hue}">${esc(KINDS[k].mark)}</span><input id="iLabel" value="${esc(n.label || d?.name || '')}" /></div>
    <p class="says">${esc(d?.says ?? '')}</p>
    ${d?.valid ? `<p class="src">Holds: ${esc(d.valid)}</p>` : ''}
    ${settings ? `<h3>Settings</h3>${settings}` : ''}
    ${ins ? `<h3>Inputs</h3>${ins}` : ''}
    ${into.length ? `<p class="src">${into.length} input${into.length > 1 ? 's' : ''} wired</p>` : ''}
    <h3>Results</h3><div id="iouts">${outsHtml(id)}</div>
    <div class="btns">${n.inner ? '<button id="iOpen" class="hot">▣ Open inside</button><button id="iUnfold">Unfold</button><button id="iSave">Save to library</button>' : ''}${d?.graph && !n.inner ? '<button id="iCopy">Open a copy to change</button>' : ''}${n.block === 'view.3d' || n.block === 'card.part' ? '<button id="i3d" class="hot">⤢ See it in 3D, full screen</button>' : ''}${n.block === 'card.part' ? `<a href="./look.html?kit=part&words=${encodeURIComponent(String(stateOf(id)?.out?.name ? (n.set?.what ?? '') : ''))}" target="_blank"><button>Open in the part viewer</button></a>` : ''}<button id="iCut">Cut branch</button><button id="iDel">Delete</button>${d?.tests?.length ? '<button id="iTest">Run its tests</button>' : ''}</div>
    <p class="src">${esc(KINDS[k].name)} · ${esc(ABILITIES[d?.ability ?? 'transform'])} · ${esc((d?.domains ?? []).map((x) => DOMAINS.find((y) => y.id === x)?.name ?? x).join(', '))}${d ? ` · v${d.version} · ${esc(d.by)}` : ''}${d?.tests?.length ? ` · ${d.tests.length} test${d.tests.length > 1 ? 's' : ''}` : ' · draft: no tests yet'}</p>
    ${d?.sources?.length ? `<p class="src">From: ${d.sources.map((s) => esc(s.cite)).join('; ')}</p>` : ''}
    <div id="iTestOut"></div>`;
  (document.getElementById('iLabel') as HTMLInputElement).onchange = (e) => { const v = (e.target as HTMLInputElement).value; edit((b) => { b.nodes[id]!.label = v; }); draw(); };
  for (const s of d?.settings ?? []) {
    const f = document.getElementById(`s_${s.key}`) as HTMLInputElement | null; if (!f) continue;
    const ev = s.type === 'code' ? 'change' : 'input';
    f.addEventListener(s.type === 'boolean' || s.type === 'choice' ? 'change' : ev, () => {
      const raw = s.type === 'boolean' ? f.checked : f.value, v = s.type === 'number' ? Number(raw) : s.type === 'quantity' ? (Number.isFinite(Number(raw)) && String(raw).trim() !== '' ? Number(raw) : raw) : raw;
      if (s.type === 'number' && !Number.isFinite(v as number)) return;
      edit((b) => { b.nodes[id]!.set = { ...(b.nodes[id]!.set ?? {}), [s.key]: v }; }, id); draw();
    });
  }
  for (const q of free) {
    const f = document.getElementById(`p_${q.name}`) as HTMLInputElement | null; if (!f) continue;
    f.addEventListener(q.type === 'boolean' ? 'change' : 'change', () => {
      let v: unknown = q.type === 'boolean' ? f.checked : f.value.trim();
      if (v === '') { edit((b) => { const s = { ...(b.nodes[id]!.set ?? {}) }; delete s[q.name]; b.nodes[id]!.set = s; }, id); draw(); return; }
      if (q.choices?.length) { edit((b) => { b.nodes[id]!.set = { ...(b.nodes[id]!.set ?? {}), [q.name]: q.type === 'number' ? Number(v) : v }; }, id); draw(); return; }
      if (q.type === 'number' || q.type === 'integer') { const r = readQuantity(String(v), q.unit); if (typeof r !== 'number') { toast(r.error, true); return; } v = r; }
      edit((b) => { b.nodes[id]!.set = { ...(b.nodes[id]!.set ?? {}), [q.name]: v }; }, id); draw();
    });
  }
  const on = (bid: string, fn: () => void) => { const b = document.getElementById(bid); if (b) b.onclick = fn; };
  on('i3d', () => {
    const src = n.block === 'card.part' ? id : local.wiresInto(id)[0]?.from, st = src ? stateOf(src) : undefined;
    if (!st?.out?.part) { toast('nothing to draw yet: wire a Part into it', true); return; }
    fullScreen(st.out.part as Part, String(st.out.name ?? ''), String(st.out.check ?? ''));
  });
  on('iOpen', () => enter(id)); on('iUnfold', () => unfold(id)); on('iSave', () => saveAsBlock(id)); on('iCopy', () => openCopy(id)); on('iCut', () => cut(id)); on('iDel', removeSelected);
  on('iTest', async () => { const r = await testBlock(d!); document.getElementById('iTestOut')!.innerHTML = r.ok ? `<p class="src" style="color:var(--ok)">✓ all ${r.ran} test${r.ran > 1 ? 's' : ''} pass</p>` : `<div class="err">${r.fails.map(esc).join('<br>')}</div>`; });
}

// ---- the command bar --------------------------------------------------------------------------------------------------
const cmdIn = (document.getElementById('cmdIn') ?? document.createElement('input')) as HTMLInputElement, cmdList = document.getElementById('cmdList') ?? document.createElement('div');
interface Cmd { label: string; hint: string; colour: string; mark: string; run: () => void }
let cmds: Cmd[] = [], cmdAt = 0;
function commands(q: string): Cmd[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean), m = (s: string) => words.every((w) => s.toLowerCase().includes(w));
  const acts: Cmd[] = [
    { label: 'Fold the chosen blocks into a group', hint: 'Ctrl G', colour: KINDS.group.hue, mark: '▣', run: group },
    { label: 'Merge blocks that work out the same', hint: 'twins', colour: KINDS.meta.hue, mark: '⌘', run: merge },
    { label: 'Fit the board in view', hint: 'F', colour: KINDS.meta.hue, mark: '⌘', run: fit },
    { label: 'Tidy: lay the board out left to right', hint: 'T', colour: KINDS.meta.hue, mark: '⌘', run: () => { edit((b) => { tidy(b); }); fit(); } },
    { label: 'Heat view: colour by time and failures', hint: 'toggle', colour: KINDS.meta.hue, mark: '⌘', run: toggleHeat },
    { label: 'Run everything afresh', hint: 'no cache', colour: KINDS.meta.hue, mark: '⌘', run: () => { void engine.fresh().then(() => runSoon()); } },
    { label: 'Undo', hint: 'Ctrl Z', colour: KINDS.meta.hue, mark: '↶', run: doUndo }, { label: 'Redo', hint: 'Ctrl Shift Z', colour: KINDS.meta.hue, mark: '↷', run: doRedo },
    ...DEMOS.map(([name, fn]) => ({ label: `Open: ${name}`, hint: 'start from', colour: '#69f0ae', mark: '★', run: () => { pushUndo(); useBoard(fn()); sel.clear(); save(); fit(); runSoon(); renderAll(); } })),
  ];
  const bl = [...LIBRARY.values()].filter((b) => !b.id.startsWith('group.') || b.id === 'group.in' || b.id === 'group.out').map((b) => ({ label: b.name, hint: `${KINDS[b.kind].name} · ${(b.domains.map((x) => DOMAINS.find((y) => y.id === x)?.name ?? x))[0] ?? ''}`, colour: KINDS[b.kind].hue, mark: KINDS[b.kind].mark, run: () => addBlock(b.id), key: `${b.name} ${b.says} ${b.id}` }));
  return [...acts.filter((a) => m(a.label)), ...bl.filter((b) => m(b.key))].slice(0, 40);
}
function openCmd(q: string): void { if (!PAGE) { pendingWire = null; placeAt = null; return; } cmdIn.value = q; cmdIn.focus(); listCmd(); }
function listCmd(): void {
  cmds = commands(cmdIn.value); cmdAt = 0;
  cmdList.innerHTML = cmds.map((c, i) => `<div data-i="${i}" class="${i === cmdAt ? 'on' : ''}"><span class="chip" style="background:${c.colour}">${esc(c.mark)}</span><span style="flex:1">${esc(c.label)}</span><span class="src">${esc(c.hint)}</span></div>`).join('');
  cmdList.style.display = cmds.length ? 'block' : 'none';
  for (const d of cmdList.querySelectorAll<HTMLDivElement>('div')) d.onmousedown = (e) => { e.preventDefault(); const c = cmds[Number(d.dataset.i)]; closeCmd(); c?.run(); };
}
function closeCmd(): void { cmdList.style.display = 'none'; cmdIn.value = ''; cmdIn.blur(); }
cmdIn.addEventListener('input', listCmd); cmdIn.addEventListener('focus', listCmd);
cmdIn.addEventListener('blur', () => setTimeout(() => { cmdList.style.display = 'none'; if (!cmdList.matches(':hover')) { pendingWire = null; } }, 120));
cmdIn.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cmdAt = (cmdAt + (e.key === 'ArrowDown' ? 1 : cmds.length - 1)) % Math.max(1, cmds.length); for (const [i, d] of [...cmdList.children].entries()) d.classList.toggle('on', i === cmdAt); }
  else if (e.key === 'Enter') { const c = cmds[cmdAt]; closeCmd(); c?.run(); }
  else if (e.key === 'Escape') { pendingWire = null; placeAt = null; closeCmd(); }
});

// ---- keys and buttons -------------------------------------------------------------------------------------------------
function doUndo(): void { const s = undo.pop(); if (!s) return; redo.push(snapshot()); restore(s); }
function doRedo(): void { const s = redo.pop(); if (!s) return; undo.push(snapshot()); restore(s); }
function toggleHeat(): void { heat = !heat; document.getElementById('heat')?.classList.toggle('on', heat); draw(); }
window.addEventListener('keydown', (e) => {
  if (!PAGE) return;
  const typing = (e.target as HTMLElement).closest('input, textarea, select');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(''); return; }
  if (typing) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); group(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') removeSelected();
  else if (e.key === 'f' || e.key === 'F') fit();
  else if (e.key === 't' || e.key === 'T') { edit((b) => { tidy(b); }); fit(); }
  else if (e.key === 'Escape') { if (path.length) up(path.length - 1); else { sel.clear(); renderInspector(true); draw(); } }
  else if (e.key === '/') { e.preventDefault(); openCmd(''); }
});
if (PAGE) {
document.getElementById('fit')!.onclick = fit; document.getElementById('heat')!.onclick = toggleHeat;
document.getElementById('undo')!.onclick = doUndo; document.getElementById('redo')!.onclick = doRedo;
document.getElementById('libBtn')!.onclick = () => { document.getElementById('lib')!.classList.toggle('open'); document.getElementById('inspector')!.classList.remove('open'); };
document.getElementById('insBtn')!.onclick = () => { document.getElementById('inspector')!.classList.toggle('open'); document.getElementById('lib')!.classList.remove('open'); };
}

function renderCrumbs(): void {
  if (!PAGE) return;
  const el = document.getElementById('crumbs')!; let b = root; const names = [root.title || 'Board'];
  for (const gid of path) { names.push(b.nodes[gid]?.label || 'Group'); b = b.nodes[gid]!.inner!; }
  el.innerHTML = names.map((n, i) => (i < names.length - 1 ? `<a data-i="${i}">${esc(n)}</a> ›` : `<span>${esc(n)}</span>`)).join(' ');
  for (const a of el.querySelectorAll<HTMLAnchorElement>('a')) a.onclick = () => up(Number(a.dataset.i));
}
function renderStats(): void { if (!PAGE) return; const nb = nodesOf(root).length; document.getElementById('stats')!.textContent = `${nb} blocks · last change: ${lastReport.ran} ran, ${lastReport.cached} reused, ${lastReport.ms.toFixed(1)} ms · ${memo.size.toLocaleString()} results cached · library of ${LIBRARY.size}`; }
function renderAll(): void { renderCrumbs(); renderLibrary(); renderInspector(true); renderStats(); draw(); }

// ---- boards to start from: real work, each across fields ------------------------------------------------------------
type Make = () => Board;
/** A board of seeds, each placed where it is to be seen, all shown and measured: choose one and click through its choices. */
function seedBoard(title: string, items: [string, string, Record<string, unknown>, Record<string, number>, string][]): Board {
  const b = emptyBoard(title), all = placeBlock(b, 'combine', 0, 0, { name: title }, 'all');
  items.forEach(([blockId, label, set, at, out], i) => {
    const id = placeBlock(b, blockId, 0, 0, set, `s${i}`); b.nodes[id]!.label = label;
    const p = placeBlock(b, 'place', 0, 0, at, `p${i}`); wire(b, id, out, p, 'thing'); wire(b, p, 'placed', all, 'things');
  });
  wire(b, all, 'assembly', placeBlock(b, 'space.show', 0, 0, {}, 'show'), 'thing'); wire(b, all, 'assembly', placeBlock(b, 'measure', 0, 0, {}, 'measure'), 'thing');
  // and whether any of them run into one another
  wire(b, all, 'assembly', placeBlock(b, 'clash', 0, 0, { depth: 1 }, 'clash'), 'thing');
  return b;
}
const DEMOS: [string, Make][] = ([
  ['A house from seeds: pick its plan, its rooms change', () => seedBoard('A house from seeds', [
    ['seed.house', 'House (choose it: its plan, its roof on or off, its colours)', { plan: '2 bed', show: 'roof off' }, {}, 'house'],
    ['seed.car', 'Car in the drive', { paint: '#1565c0' }, { x: 9.5, z: 2, ry: Math.PI / 2 }, 'car'],
    ['seed.room', 'One room on its own (choose it: its type)', { type: 'bathroom' }, { x: -10 }, 'room'],
  ])],
  ['Traffic on the clock: cars round a block, stopping at red', () => {
    // two blocks each way of 60 m (typical of a suburb), its lights on a fixed-time cycle; eight cars at 11 m/s (40 km/h)
    // round its edge, each 8 m behind the one ahead: press ▶ under the 3D view and watch them queue at red
    const b = emptyBoard('Traffic on the clock');
    placeBlock(b, 'seed.roads', 0, 0, { nx: 2, nz: 2, block: 60, lights: 'cycle' }, 'roads'); b.nodes.roads!.label = 'Road system (its lights on the clock)';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'path.loop', 0, 0, { w: 120, d: 120, inset: 1.8, every: 60, before: 5 }, 'ring'); b.nodes.ring!.label = 'Lane round its edge';
    placeBlock(b, 'follow', 0, 0, { n: 8, speed: 11, gap: 8, phases: 'green 30, yellow 4, red 34' }, 'drive'); b.nodes.drive!.label = 'Cars follow the lane';
    wire(b, 'ring', 'path', 'drive', 'path'); wire(b, 'ring', 'stops', 'drive', 'stops'); wire(b, 'clock', 't', 'drive', 't');
    placeBlock(b, 'rows.set', 0, 0, { column: 'paint', turns: true, value: '#1565c0|#eceff1|#c62828|#212121|#f9a825|#2e7d32' }, 'paint'); b.nodes.paint!.label = 'Each its paint'; wire(b, 'drive', 'rows', 'paint', 'rows');
    placeBlock(b, 'spawn', 0, 0, { seed: 'seed.car' }, 'cars'); b.nodes.cars!.label = 'A Car at each'; wire(b, 'paint', 'rows', 'cars', 'rows');
    placeBlock(b, 'combine', 0, 0, { name: 'streets and traffic' }, 'all'); wire(b, 'roads', 'roads', 'all', 'things'); wire(b, 'cars', 'things', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['A world without end: neighbourhoods for ever, each its own', () => {
    // three neighbourhoods, each from its own seed, laid for ever along x and z (130 m a cell: two blocks of 60 m and a
    // street), each cell one of them by its hash: drawn only out to the haze, so walking or flying never reaches an edge
    const b = emptyBoard('A world without end');
    for (const k of [1, 2, 3]) { placeBlock(b, 'seed.neighbourhood', 0, 0, { nx: 2, nz: 2, seed: k, traffic: 4 }, `h${k}`); b.nodes[`h${k}`]!.label = `Neighbourhood, seed ${k}`; }
    placeBlock(b, 'forever', 0, 0, { sx: 130, sz: 130, seed: 7 }, 'world'); b.nodes.world!.label = 'For ever along x and z';
    for (const k of [1, 2, 3]) wire(b, `h${k}`, 'neighbourhood', 'world', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'world', 'world', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); b.nodes.measure!.label = 'Measure (one cell)'; wire(b, 'world', 'world', 'measure', 'thing');
    return b;
  }],
  ['A battery built from its parts, node by node: grid, paste, separator, plates, cell, case', () => {
    // a BCI group 35 starting battery (230 × 175 × 225 mm, its case the standard's), made the way one is made, every
    // step a node that makes other things too: a grid cast (as a fan guard is), pasted (as anything is coated), the
    // positive wrapped in a separator (as a bag wraps), plates stacked alternately (as fins and laminations are), a strap
    // cast over their lugs (as a busbar joins terminals), the cells into a moulded case of partitions (as a toolbox's),
    // joined in series zig-zag, posts on its free ends, its lid. Take it apart: case, cells, plates, each plate's grid and
    // paste
    const b = emptyBoard('A battery built from its parts');
    const pw = 0.1636, ph = 0.1299;
    placeBlock(b, 'make.grid', 0, 0, { lug: 'right', w: pw, h: ph, t: 0.0011, bars: 7, wires: 9, rim: 0.003 }, 'gp'); b.nodes.gp!.label = 'Cast grid (positive, lug right)';
    placeBlock(b, 'make.grid', 0, 0, { lug: 'left', w: pw, h: ph, t: 0.0011, bars: 7, wires: 9, rim: 0.003 }, 'gn'); b.nodes.gn!.label = 'Cast grid (negative, lug left)';
    placeBlock(b, 'make.coat', 0, 0, { name: 'positive plate', item: 'plate-positive', layer: 'positive paste', layerItem: 'paste-positive', mat: 'lead', color: '#4a2c1c', t: 0.00035, fill: 0.2 }, 'cp'); b.nodes.cp!.label = 'Paste it: lead dioxide'; wire(b, 'gp', 'grid', 'cp', 'part');
    placeBlock(b, 'make.coat', 0, 0, { name: 'negative plate', item: 'plate-negative', layer: 'negative paste', layerItem: 'paste-negative', mat: 'lead', color: '#6a6d72', t: 0.0002, fill: 0.2 }, 'cn'); b.nodes.cn!.label = 'Paste it: sponge lead'; wire(b, 'gn', 'grid', 'cn', 'part');
    placeBlock(b, 'make.wrap', 0, 0, { name: 'separator envelope', item: 'plate-separator', mat: 'pe', t: 0.0006, fill: 0.4 }, 'wp'); b.nodes.wp!.label = 'Wrap the positive in a separator'; wire(b, 'cp', 'coated', 'wp', 'part');
    placeBlock(b, 'make.stack', 0, 0, { n: 13, pitch: 0.00264, y: ph / 2 }, 'st'); b.nodes.st!.label = 'Stack them: 13 plates'; wire(b, 'cn', 'coated', 'st', 'things'); wire(b, 'wp', 'wrapped', 'st', 'things');
    placeBlock(b, 'make.strap', 0, 0, { path: '^lug$', name: 'strap', item: 'la-strap', result: 'cell (13 plates)' }, 'cell'); b.nodes.cell!.label = 'Strap their lugs: a 2 V cell'; wire(b, 'st', 'stack', 'cell', 'thing');
    placeBlock(b, 'make.enclosure', 0, 0, { L: 0.2302, W: 0.1746, H: 0.1954, wall: 0.0025, cells: 6, rib: 0.012, lid: 0.012 }, 'case'); b.nodes.case!.label = 'Case: six cells, moulded';
    placeBlock(b, 'make.into', 0, 0, { alternate: true }, 'into'); b.nodes.into!.label = 'Cells into the case, alternate turned'; wire(b, 'cell', 'joined', 'into', 'thing'); wire(b, 'case', 'case', 'into', 'into');
    placeBlock(b, 'make.strap', 0, 0, { path: '^strap \\d+$', series: true, name: 'intercell connector', item: 'la-intercell', result: 'six cells in series' }, 'ser'); b.nodes.ser!.label = 'Join them in series'; wire(b, 'into', 'filled', 'ser', 'thing');
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'post', mat: 'lead', color: '#9a9da2', finish: 'satin', r: 0.0093, h: 0.034 }, 'pc'); b.nodes.pc!.label = 'Post (SAE, about 18 mm)';
    placeBlock(b, 'tag', 0, 0, { name: 'terminal post', item: 'battery-post' }, 'pt'); wire(b, 'pc', 'part', 'pt', 'part');
    placeBlock(b, 'place', 0, 0, { y: 0.017 }, 'posts'); b.nodes.posts!.label = 'Posts on its free ends'; wire(b, 'pt', 'tagged', 'posts', 'thing'); wire(b, 'ser', 'ends', 'posts', 'points');
    placeBlock(b, 'place', 0, 0, { y: 0.1954 + 0.006 }, 'lidAt'); b.nodes.lidAt!.label = 'Lid on top'; wire(b, 'case', 'lid', 'lidAt', 'thing');
    placeBlock(b, 'make.fill', 0, 0, { name: 'electrolyte', mat: 'acid', h: ph + 0.012, share: 0.55 }, 'acid'); b.nodes.acid!.label = 'Fill each cell: acid'; wire(b, 'case', 'case', 'acid', 'into'); wire(b, 'case', 'cellL', 'acid', 'L'); wire(b, 'case', 'cellW', 'acid', 'W');
    placeBlock(b, 'combine', 0, 0, { name: '12 V battery, group 35 (built here)' }, 'all'); wire(b, 'case', 'case', 'all', 'things'); wire(b, 'ser', 'joined', 'all', 'things'); wire(b, 'acid', 'filled', 'all', 'things'); wire(b, 'posts', 'placed', 'all', 'things'); wire(b, 'lidAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0.5, levels: 64 }, 'apart'); b.nodes.apart!.label = 'Take it apart (to the bottom)'; wire(b, 'all', 'assembly', 'apart', 'thing');
    // (each step's part on the board itself, turning: the grid, the pasted plate, the wrapped plate, the cell)
    for (const [k, from, out, label, ex] of [['v1', 'gp', 'grid', 'The cast grid', 0], ['v2', 'cp', 'coated', 'The pasted plate', 1], ['v3', 'wp', 'wrapped', 'In its separator', 1], ['v4', 'cell', 'joined', 'A cell, its plates strapped', 0]] as [string, string, string, string, number][]) { placeBlock(b, 'view.3d', 0, 0, { explode: ex }, k); b.nodes[k]!.label = label; wire(b, from, out, k, 'part'); }
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'all', 'assembly', 'audit', 'thing');
    return b;
  }],
  ['An engine from its first parts: piston, rod, crank, block, head, then the whole', () => {
    // Toyota's 2.0 L four (M20A-FKS: 80.5 mm bore, 97.6 mm stroke, Toyota), built the way an engine is built, and every
    // part on the board is a part of it: one bore and one stroke size every node; the head's pieces (valves, the spring off
    // the coil maker, retainer, tappet, plug, coil) are wired into the head; the piston, rod, crank, block and head are
    // wired into the engine. Change any of them (the spring's wire, the bore) and it flows up into the engine, its mass
    // and its checks: does it come apart to the bottom, and does nothing run into anything
    const b = emptyBoard('An engine from its first parts');
    const e = { layout: 'inline', fuel: 'petrol', block: 'al', cooling: 'liquid', cams: 'dohc', valves: '4', turbo: 'no', starter: 'electric', fit: 'm20a-fks' };
    placeBlock(b, 'in.number', 0, 0, { value: 0.0805, unit: 'm' }, 'bore'); b.nodes.bore!.label = 'Bore (Toyota: 80.5 mm)';
    placeBlock(b, 'in.number', 0, 0, { value: 0.0976, unit: 'm' }, 'stroke'); b.nodes.stroke!.label = 'Stroke (Toyota: 97.6 mm)';
    const sized = (id: string) => { wire(b, 'bore', 'value', id, 'bore'); wire(b, 'stroke', 'value', id, 'stroke'); };
    for (const [k, id, label] of [['pis', 'engine.piston', 'Piston, rings, pin, clips'], ['rod', 'engine.rod', 'Rod, cap, shells, bolts'], ['crk', 'engine.crank', 'Crankshaft, forged in one'], ['blk', 'engine.block', 'Block, liners, caps, shells'], ['hd', 'engine.head', 'Head, from its pieces'], ['eng', 'engine.whole', 'The engine, from its parts']] as [string, string, string][]) { placeBlock(b, id, 0, 0, e, k); b.nodes[k]!.label = label; sized(k); }
    // (the head's pieces, each a node: made to size, or the spring off the coil maker: the wire, coil and preload the head's
    // own spring is sized to, to hold its valves on their cams at speed (src/nexus/engines.ts springOf))
    for (const [k, which, port, label] of [['vin', 'intake valve', 'intakeValve', 'Intake valve'], ['vex', 'exhaust valve', 'exhaustValve', 'Exhaust valve (stainless)'], ['ret', 'valve spring retainer', 'valveSpringRetainer', 'Spring retainer'], ['tap', 'bucket tappet', 'bucketTappet', 'Bucket tappet'], ['plg', 'spark plug', 'sparkPlug', 'Spark plug'], ['ign', 'ignition coil', 'ignitionCoil', 'Ignition coil']] as [string, string, string, string][]) { placeBlock(b, 'engine.piece', 0, 0, { ...e, which }, k); b.nodes[k]!.label = label; sized(k); wire(b, k, 'piece', 'hd', port); }
    placeBlock(b, 'make.coil', 0, 0, { name: 'valve spring', item: 'valve-spring', d: 0.0029, D: 0.0185, L: 0.037, L0: 0.0452, n: 5 }, 'spr'); b.nodes.spr!.label = 'Coil: the valve spring'; wire(b, 'spr', 'spring', 'hd', 'valveSpring');
    for (const [from, out, port] of [['pis', 'piston', 'piston'], ['rod', 'rod', 'rod'], ['crk', 'crank', 'crank'], ['blk', 'block', 'block'], ['hd', 'head', 'head']] as [string, string, string][]) wire(b, from, out, 'eng', port);
    for (const [k, from, out, label, ex] of [['v1', 'pis', 'piston', 'The piston', 1], ['v2', 'rod', 'rod', 'The rod', 1], ['v3', 'crk', 'crank', 'The crank', 0], ['v4', 'hd', 'head', 'The head, apart', 1], ['v5', 'spr', 'spring', 'The valve spring', 0], ['v6', 'vex', 'piece', 'An exhaust valve', 0]] as [string, string, string, string, number][]) { placeBlock(b, 'view.3d', 0, 0, { explode: ex }, k); b.nodes[k]!.label = label; wire(b, from, out, k, 'part'); }
    placeBlock(b, 'explode', 0, 0, { amount: 0.35, levels: 64 }, 'apart'); b.nodes.apart!.label = 'Take it apart (to the bottom)'; wire(b, 'eng', 'engine', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'eng', 'engine', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'eng', 'engine', 'audit', 'thing');
    placeBlock(b, 'check.rules', 0, 0, {}, 'rules'); b.nodes.rules!.label = 'Does nothing run into anything?'; wire(b, 'eng', 'engine', 'rules', 'thing');
    // (and under load: at the 6,600 rpm Toyota gives its peak power at, and swept from 1,000 to 7,000 rpm for where it gives)
    placeBlock(b, 'load.engine', 0, 0, { ...e }, 'load'); b.nodes.load!.label = 'Under load at 6,600 rpm'; b.nodes.load!.set = { ...(b.nodes.load!.set ?? {}), rpm: 6600 }; sized('load'); wire(b, 'spr', 'spring', 'load', 'spring');
    placeBlock(b, 'view.table', 0, 0, {}, 'loadRows'); b.nodes.loadRows!.label = 'Each part: its stress, its limit, its margin'; wire(b, 'load', 'rows', 'loadRows', 'rows');
    placeBlock(b, 'sweep.range', 0, 0, { block: 'load.engine', vary: 'rpm', from: 1000, to: 7000, steps: 13, watch: 'worst', worstIs: 'lowest', blockSet: JSON.stringify(e) }, 'sweep'); b.nodes.sweep!.label = 'Stress test: 1,000 to 7,000 rpm'; sized('sweep'); wire(b, 'spr', 'spring', 'sweep', 'spring');
    placeBlock(b, 'view.chart', 0, 0, {}, 'sweepChart'); b.nodes.sweepChart!.label = 'Least margin by speed'; wire(b, 'sweep', 'ys', 'sweepChart', 'y'); wire(b, 'sweep', 'xs', 'sweepChart', 'x');
    return b;
  }],
  ['Research to what is missing: Toyota\'s engine held against its sources', () => {
    // research as a pipeline: what the M20A-FKS is made of, read off its sources and kept (src/data/references.ts), and
    // notes of your own compiled with it (every part named with its source, or refused); the engine drawn from its parts
    // held against the whole of it (what is drawn, short, missing, or drawn the way the sources say it is not); how finely
    // it is drawn (how much is still plain boxes, and the biggest); the reference entered in the inventory and opened all
    // the way down, its parts and theirs, and what of them waits to be researched; and every check on the engine at once
    const b = emptyBoard('Research to what is missing');
    const e = { layout: 'inline', fuel: 'petrol', block: 'al', cooling: 'liquid', cams: 'dohc', valves: '4', turbo: 'no', starter: 'electric', fit: 'm20a-fks' };
    placeBlock(b, 'note', 0, 0, { text: 'Research → compile → its parts and theirs → what is missing → what to reshape. Add a line to the notes (a part, its pattern over drawn names, its source) and the gap and the inventory follow it.' }, 'about');
    placeBlock(b, 'research.notes', 0, 0, { from: 'm20a-fks' }, 'ref'); b.nodes.ref!.label = 'Researched: the M20A-FKS, part by part, each sourced';
    placeBlock(b, 'research.notes', 0, 0, { id: 'd4s-injector', name: 'a D-4S direct injector, inside', notes: '@TOY | https://global.toyota/en/mobility/tnga/powertrain2018/engine/index.html | Toyota: TNGA powertrain 2018 (a multi-hole direct injector)\ndi-in | a direct injector, inside | | 1 | | | typical | its nozzle and its solenoid\ndi-nozzle | multi-hole nozzle | di-in | 4 | multi-hole nozzle | TOY | confirmed | one on each direct injector' }, 'notes'); b.nodes.notes!.label = 'Notes of your own (sourced, or refused)';
    placeBlock(b, 'research.merge', 0, 0, { id: 'm20a-compiled', name: 'the M20A-FKS, compiled' }, 'merge'); b.nodes.merge!.label = 'Compile the research'; wire(b, 'ref', 'reference', 'merge', 'references'); wire(b, 'notes', 'reference', 'merge', 'references');
    placeBlock(b, 'in.number', 0, 0, { value: 0.0805, unit: 'm' }, 'bore'); b.nodes.bore!.label = 'Bore (Toyota: 80.5 mm)';
    placeBlock(b, 'in.number', 0, 0, { value: 0.0976, unit: 'm' }, 'stroke'); b.nodes.stroke!.label = 'Stroke (Toyota: 97.6 mm)';
    placeBlock(b, 'engine.whole', 0, 0, { ...e }, 'eng'); b.nodes.eng!.label = 'The engine, from its parts (its maker\'s choices: M20A-FKS)'; wire(b, 'bore', 'value', 'eng', 'bore'); wire(b, 'stroke', 'value', 'eng', 'stroke');
    placeBlock(b, 'research.gap', 0, 0, {}, 'gap'); b.nodes.gap!.label = 'What is missing?'; wire(b, 'eng', 'engine', 'gap', 'thing'); wire(b, 'merge', 'reference', 'gap', 'reference');
    placeBlock(b, 'view.table', 0, 0, {}, 'gapRows'); b.nodes.gapRows!.label = 'Each part the sources name: drawn, short, missing, wrong'; wire(b, 'gap', 'rows', 'gapRows', 'rows');
    placeBlock(b, 'view.gauge', 0, 0, { min: 0, max: 1 }, 'cover'); b.nodes.cover!.label = 'Share drawn as the sources say'; wire(b, 'gap', 'coverage', 'cover', 'value');
    placeBlock(b, 'check.fidelity', 0, 0, {}, 'fid'); b.nodes.fid!.label = 'How finely is it drawn?'; wire(b, 'eng', 'engine', 'fid', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'boxes'); b.nodes.boxes!.label = 'Its biggest plain boxes: reshape these first'; wire(b, 'fid', 'biggest', 'boxes', 'rows');
    placeBlock(b, 'research.toInventory', 0, 0, {}, 'inv'); b.nodes.inv!.label = 'Into the inventory'; wire(b, 'merge', 'reference', 'inv', 'reference');
    placeBlock(b, 'research.parts', 0, 0, { depth: 6 }, 'tree'); b.nodes.tree!.label = 'Its parts, and theirs, and what waits'; wire(b, 'inv', 'item', 'tree', 'item');
    placeBlock(b, 'view.table', 0, 0, {}, 'treeRows'); b.nodes.treeRows!.label = 'Sub-components and theirs'; wire(b, 'tree', 'rows', 'treeRows', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'waits'); b.nodes.waits!.label = 'Waiting to be researched'; wire(b, 'tree', 'waiting', 'waits', 'rows');
    placeBlock(b, 'check.rules', 0, 0, {}, 'rules'); b.nodes.rules!.label = 'Does nothing run into anything?'; wire(b, 'eng', 'engine', 'rules', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'eng', 'engine', 'audit', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'eng', 'engine', 'show', 'thing');
    return b;
  }],
  ['The gauntlet as nodes: makers through gate after gate, the unknown sorted and researched to the bottom', () => {
    // every maker of the library put through the gauntlet gate by gate (what passes one goes on to the next, what fails
    // is shown with why); what they want that nothing knows queued, sorted by what it shares, and researched round after
    // round to the bottom from what a maker draws; a listener hearing each approval; the tasks left; a block read, a
    // block tested, a search; and a deletion that only says what it would do. The gauntlet's own page shows all of this
    // as lanes (Gauntlet ↗ above)
    const b = emptyBoard('The gauntlet as nodes');
    placeBlock(b, 'gauntlet.candidates', 0, 0, { from: 'library', kind: 'generator', most: 16 }, 'cands'); b.nodes.cands!.label = 'Candidates: the makers';
    const gates = ['documented', 'unique', 'tests', 'robust', 'known', 'explodes'];
    gates.forEach((g, k) => { placeBlock(b, 'gauntlet.run', 0, 0, { gates: g }, `g${k}`); b.nodes[`g${k}`]!.label = `Gate: ${g}`; wire(b, k ? `g${k - 1}` : 'cands', k ? 'approved' : 'candidates', `g${k}`, 'candidates'); });
    gates.forEach((g, k) => { placeBlock(b, 'view.table', 0, 0, {}, `t${k}`); b.nodes[`t${k}`]!.label = `${g}: who and why`; wire(b, `g${k}`, 'rows', `t${k}`, 'rows'); });
    placeBlock(b, 'gauntlet.approved', 0, 0, {}, 'ok'); b.nodes.ok!.label = 'Approved so far'; wire(b, `g${gates.length - 1}`, 'approved', 'ok', 'after');
    placeBlock(b, 'on.event', 0, 0, { kind: 'approved' }, 'heard'); b.nodes.heard!.label = 'When something is approved'; wire(b, `g${gates.length - 1}`, 'approved', 'heard', 'after');
    placeBlock(b, 'unknown.queue', 0, 0, {}, 'queue'); b.nodes.queue!.label = 'Unknown library queue, sorted by what they share'; wire(b, `g${gates.length - 1}`, 'approved', 'queue', 'after');
    placeBlock(b, 'make.sensor', 0, 0, { body: 'puck', element: 'piezo', name: 'knock sensor', item: 'knock-sensor-puck' }, 'sens'); b.nodes.sens!.label = 'A sensor, from the one sensor node';
    placeBlock(b, 'research.loop', 0, 0, { rounds: 8 }, 'loop'); b.nodes.loop!.label = 'Research loop, to the bottom'; wire(b, 'sens', 'sensor', 'loop', 'drawing');
    placeBlock(b, 'view.table', 0, 0, {}, 'rounds'); b.nodes.rounds!.label = 'Each round: found, resolved, left'; wire(b, 'loop', 'rounds', 'rounds', 'rows');
    placeBlock(b, 'task', 0, 0, { list: true }, 'tasks'); b.nodes.tasks!.label = 'Tasks left'; wire(b, 'g5', 'approved', 'tasks', 'done');
    placeBlock(b, 'view.table', 0, 0, {}, 'taskRows'); b.nodes.taskRows!.label = 'Tasks'; wire(b, 'tasks', 'tasks', 'taskRows', 'rows');
    placeBlock(b, 'read', 0, 0, { id: 'make.wound', kind: 'block' }, 'read'); b.nodes.read!.label = 'Read a block';
    placeBlock(b, 'test.block', 0, 0, { id: 'make.wound' }, 'tester'); b.nodes.tester!.label = 'Tester';
    placeBlock(b, 'search.library', 0, 0, { q: 'sensor' }, 'search'); b.nodes.search!.label = 'Search what is known';
    placeBlock(b, 'delete', 0, 0, { what: 'block', really: false }, 'del'); b.nodes.del!.label = 'Delete (only says, until told)'; wire(b, 'g2', 'rejected', 'del', 'ids');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'sens', 'sensor', 'show', 'thing');
    return b;
  }],
  ['Doorways kept clear: a living room with its door behind the television, before and after', () => {
    // a room whose fittings were laid out by its type alone puts its television against the wall its door is in. Keep
    // doorways clear reads each door (its hinge line, the side it swings to, its width) and keeps the room its leaf sweeps
    // and the floor to come up to it; what stands there is slid along its wall with what stands on it, or turned to
    // another wall, unless it is meant to be there. The house seed runs it on every house
    const b = emptyBoard('Doorways kept clear');
    placeBlock(b, 'seed.room', 0, 0, { type: 'living', front: 'wall', back: 'door' }, 'room'); b.nodes.room!.label = 'A living room, its door in its back wall';
    placeBlock(b, 'keep.clear', 0, 0, { move: 'only said' }, 'said'); b.nodes.said!.label = 'What stands in a doorway (said)'; wire(b, 'room', 'room', 'said', 'thing');
    placeBlock(b, 'keep.clear', 0, 0, { move: 'moved' }, 'moved'); b.nodes.moved!.label = 'Doorways kept clear (moved)'; wire(b, 'room', 'room', 'moved', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'rows'); b.nodes.rows!.label = 'What stood where, and what was done'; wire(b, 'moved', 'blocked', 'rows', 'rows');
    placeBlock(b, 'pick', 0, 0, { options: 'before|after', which: 'after' }, 'pick'); b.nodes.pick!.label = 'Before or after'; wire(b, 'said', 'thing', 'pick', 'before'); wire(b, 'moved', 'thing', 'pick', 'after');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'pick', 'chosen', 'show', 'thing');
    return b;
  }],
  ['A body from its measured segments, its math on every part', () => {
    // a human body as numbers: laid out from its height (Drillis and Contini), each of its sixteen segments the share of
    // its mass de Leva measured, the long limbs tapered so each centre of mass is where he measured it; each part carries
    // its mass, length, centre and moments of inertia, set beside the measured ones; its joints with their AAOS ranges
    const b = emptyBoard('A body from its measured segments');
    placeBlock(b, 'body', 0, 0, { height: 1.75, mass: 75, sex: 'male', pose: 'standing' }, 'man'); b.nodes.man!.label = 'A man, 1.75 m, 75 kg, standing';
    placeBlock(b, 'body', 0, 0, { height: 1.63, mass: 60, sex: 'female', pose: 'walking' }, 'woman'); b.nodes.woman!.label = 'A woman, 1.63 m, 60 kg, walking';
    placeBlock(b, 'body', 0, 0, { height: 1.75, mass: 75, sex: 'male', pose: 'reaching' }, 'reach'); b.nodes.reach!.label = 'Reaching';
    placeBlock(b, 'view.table', 0, 0, {}, 'segs'); b.nodes.segs!.label = 'Each segment: mass, length, centre, inertia (worked out, and measured)'; wire(b, 'man', 'segments', 'segs', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'joints'); b.nodes.joints!.label = 'Each joint: its range, its torque'; wire(b, 'man', 'joints', 'joints', 'rows');
    placeBlock(b, 'place', 0, 0, { x: 0.8 }, 'w2'); wire(b, 'woman', 'body', 'w2', 'thing');
    placeBlock(b, 'place', 0, 0, { x: -0.8 }, 'r2'); wire(b, 'reach', 'body', 'r2', 'thing');
    placeBlock(b, 'combine', 0, 0, {}, 'all'); wire(b, 'man', 'body', 'all', 'things'); wire(b, 'w2', 'placed', 'all', 'things'); wire(b, 'r2', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    return b;
  }],
  ['An agent opens a door: it sees it, walks to it, takes hold, pulls; the door swings in the physics', () => {
    // nothing placed by hand: the person stands where people pass (the middle of the hall), sees by its rays the doors it
    // can open, reads each door (its hinge line through its hinges' knuckles, which side it swings to, the handle on its
    // side), finds where to stand beside the handle (clear of the door's sweep, in reach, where the handle stays in reach
    // longest), walks there by the router's clear way, reaches (Fitts' law), grasps, pulls the bedroom door toward it, or
    // pushes the front door out, with the 22.2 N a door may ask (ADA), and lets go; the door swings on its hinges in Jolt and
    // stops on its stop. The clock plays it
    const b = emptyBoard('An agent opens a door');
    placeBlock(b, 'seed.house', 0, 0, { show: 'roof off' }, 'house'); b.nodes.house!.label = 'A house, its roof off to see in';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'goal', 0, 0, { open: '^door$', which: 'nearest' }, 'near'); b.nodes.near!.label = 'Open the nearest door it sees';
    placeBlock(b, 'goal', 0, 0, { open: '^door$', which: 'farthest' }, 'far'); b.nodes.far!.label = 'Open the farthest door it sees';
    placeBlock(b, 'pick', 0, 0, { options: 'the nearest (a bedroom\'s, pulled)|the farthest (the front door, pushed)', which: 'the nearest (a bedroom\'s, pulled)' }, 'pick'); b.nodes.pick!.label = 'Which goal';
    wire(b, 'near', 'goal', 'pick', 'the nearest (a bedroom\'s, pulled)'); wire(b, 'far', 'goal', 'pick', 'the farthest (the front door, pushed)');
    placeBlock(b, 'agent', 0, 0, { who: 'adult' }, 'agent'); b.nodes.agent!.label = 'An adult';
    wire(b, 'house', 'house', 'agent', 'thing'); wire(b, 'pick', 'chosen', 'agent', 'goal'); wire(b, 'clock', 't', 'agent', 't');
    placeBlock(b, 'view.table', 0, 0, {}, 'steps'); b.nodes.steps!.label = 'Its plan, step by step'; wire(b, 'agent', 'steps', 'steps', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'doing'); b.nodes.doing!.label = 'What it is doing now'; wire(b, 'agent', 'doing', 'doing', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'angle'); b.nodes.angle!.label = 'The door open by, °'; wire(b, 'agent', 'angle', 'angle', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'agent', 'view', 'show', 'thing');
    return b;
  }],
  ['Who notices what: a car running, a person behind it, one at its door, a CO alarm; in the open or shut in a garage', () => {
    // senses as physics, nothing typed: the people stand by what is named (behind the muffler, at the driver's door), facing
    // it; each sees by rays out from its eyes packed as its acuity is, hears the engine over a quiet street, smells the
    // exhaust's hydrocarbons; carbon monoxide has no smell, so it harms unnoticed, and the alarm sounds at 70 ppm. Gases as
    // substances: given off by the engine's breathing at idle (at most what a catalyst car may give), spread in still air,
    // or shut in a 60 m³ garage changed twice in four hours. Lines show what each attends to: sight white, hearing violet,
    // warmth orange, smell yellow, harm red
    const b = emptyBoard('Who notices what');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'gas', 0, 0, { running: 'running', air: 'still' }, 'gas'); b.nodes.gas!.label = 'What it gives off, running, in still air'; wire(b, 'car', 'vehicle', 'gas', 'thing');
    placeBlock(b, 'gas', 0, 0, { running: 'running', air: 'shut in a room', volume: 60, changes: 0.5 }, 'garage'); b.nodes.garage!.label = 'The same, shut in a 60 m³ garage'; wire(b, 'car', 'vehicle', 'garage', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'gasRows'); b.nodes.gasRows!.label = 'Each gas: smelled, harmful, flammable to'; wire(b, 'gas', 'releases', 'gasRows', 'rows');
    placeBlock(b, 'sense', 0, 0, { air: 'still' }, 'open'); b.nodes.open!.label = 'Who notices what, in the open'; wire(b, 'car', 'vehicle', 'open', 'thing');
    placeBlock(b, 'sense', 0, 0, { air: 'shut in a room', minutes: 30 }, 'shut'); b.nodes.shut!.label = 'Who notices what, 30 min shut in'; wire(b, 'car', 'vehicle', 'shut', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'openRows'); b.nodes.openRows!.label = 'Attended, in the open'; wire(b, 'open', 'noticed', 'openRows', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'shutRows'); b.nodes.shutRows!.label = 'Attended, shut in'; wire(b, 'shut', 'noticed', 'shutRows', 'rows');
    placeBlock(b, 'pick', 0, 0, { options: 'in the open|shut in the garage', which: 'in the open' }, 'pick'); b.nodes.pick!.label = 'Which to see'; wire(b, 'open', 'view', 'pick', 'in the open'); wire(b, 'shut', 'view', 'pick', 'shut in the garage');
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'The car and who notices what'; wire(b, 'car', 'vehicle', 'scene', 'things'); wire(b, 'pick', 'chosen', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['What things give off and let you do: a house and a car, tagged from what they are', () => {
    // nothing tagged by hand: every part's signature (how far it is seen, heard, felt; hot, heavy, fragile, live, what it
    // smells of) and what it affords a body (grasp, lift, push, open, sit, walk on, drive) read from its size, mass,
    // joints and material against that body; an adult's or a child's. Each affordance outlined in its colour (open
    // blue, grasp green, lift teal, sit orange, step yellow, walk grey, drive violet, hot red); what is made for
    // something it cannot do is said (a cabinet with nothing hinged, a seat with no headroom)
    const b = emptyBoard('What things give off and let you do');
    placeBlock(b, 'seed.house', 0, 0, {}, 'house'); b.nodes.house!.label = 'A house (its plan picked)';
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'pick', 0, 0, { options: 'the house|the car', which: 'the house' }, 'pick'); b.nodes.pick!.label = 'Which to tag'; wire(b, 'house', 'house', 'pick', 'the house'); wire(b, 'car', 'vehicle', 'pick', 'the car');
    placeBlock(b, 'afford', 0, 0, { who: 'adult' }, 'aff'); b.nodes.aff!.label = 'What it lets an adult do'; wire(b, 'pick', 'chosen', 'aff', 'thing');
    placeBlock(b, 'afford', 0, 0, { who: 'child' }, 'affChild'); b.nodes.affChild!.label = 'What it lets a child of 8 do'; wire(b, 'pick', 'chosen', 'affChild', 'thing');
    placeBlock(b, 'signature', 0, 0, {}, 'sig'); b.nodes.sig!.label = 'What it gives off'; wire(b, 'pick', 'chosen', 'sig', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'affRows'); b.nodes.affRows!.label = 'Each part, what it affords, why'; wire(b, 'aff', 'affords', 'affRows', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'sigRows'); b.nodes.sigRows!.label = 'Seen, heard, felt'; wire(b, 'sig', 'signatures', 'sigRows', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'found'); b.nodes.found!.label = 'What it is made for but cannot do'; wire(b, 'aff', 'findings', 'found', 'value');
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'The thing and its tags'; wire(b, 'pick', 'chosen', 'scene', 'things'); wire(b, 'aff', 'view', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Lines: one section, any material, any route (a battery cable, a road)', () => {
    // cables, hoses, wires, pipes, traces and roads as one thing: a section (layers from the inside out, its core solid or
    // hollow, each layer's material changeable) swept along a way that is found, not drawn. Here the Corolla's battery
    // placed by the solver, then its cable run from the positive post (leaving it sideways, as a terminal does) to the
    // starter along surfaces (hug), sized for the starter's draw over
    // the length it came to; and a road laid over hills, never steeper than 8 %, round what it cannot climb. Pick which
    // the 3D view shows
    const b = emptyBoard('Lines: one section, any route');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'place.solve', 0, 0, { check: 'no' }, 'solve'); b.nodes.solve!.label = 'The battery placed first (out of the exhaust\'s heat)'; wire(b, 'car', 'vehicle', 'solve', 'thing');
    placeBlock(b, 'line', 0, 0, { section: 'cable-2' }, 'cable'); b.nodes.cable!.label = 'Battery cable: copper in XLPE (change its core, its jacket)';
    placeBlock(b, 'route', 0, 0, { from: '^battery and its tray$', fromPort: 'positive', to: '^starter motor$', toPort: 'battery terminal', logic: 'hug', leave: 'square to it (a terminal on a post)' }, 'run'); b.nodes.run!.label = 'Route it: along surfaces, clear of heat'; wire(b, 'solve', 'thing', 'run', 'thing'); wire(b, 'cable', 'section', 'run', 'section');
    placeBlock(b, 'in.number', 0, 0, { value: 200, unit: 'A' }, 'amps'); b.nodes.amps!.label = 'The starter\'s draw, A (typical of a 2 L petrol engine)';
    placeBlock(b, 'size.line', 0, 0, { chassis: 'yes' }, 'size'); b.nodes.size!.label = 'Is it thick enough?'; wire(b, 'amps', 'value', 'size', 'amps'); wire(b, 'run', 'length', 'size', 'length');
    placeBlock(b, 'piece', 0, 0, { name: '^petrol engine', where: 'where it sits' }, 'eng'); b.nodes.eng!.label = 'The engine'; wire(b, 'solve', 'thing', 'eng', 'thing');
    placeBlock(b, 'piece', 0, 0, { name: '^battery and its tray$', where: 'where it sits' }, 'bat'); b.nodes.bat!.label = 'The battery'; wire(b, 'solve', 'thing', 'bat', 'thing');
    placeBlock(b, 'combine', 0, 0, {}, 'bay'); b.nodes.bay!.label = 'Engine, battery, cable'; wire(b, 'eng', 'piece', 'bay', 'things'); wire(b, 'bat', 'piece', 'bay', 'things'); wire(b, 'run', 'line', 'bay', 'things');
    placeBlock(b, 'terrain', 0, 0, {}, 'land'); b.nodes.land!.label = 'Hills'; for (const [k, v] of [['w', 200], ['d', 200], ['relief', 6]] as [string, number][]) { placeBlock(b, 'in.number', 0, 0, { value: v }, `land${k}`); wire(b, `land${k}`, 'value', 'land', k); }
    placeBlock(b, 'line', 0, 0, { section: 'road-2' }, 'roadSec'); b.nodes.roadSec!.label = 'A road: asphalt on a base course';
    placeBlock(b, 'route', 0, 0, { from: '-90 -90', fromPort: '', to: '90 90', toPort: '', logic: 'grade' }, 'road'); b.nodes.road!.label = 'Lay it: never steeper than 8 %'; wire(b, 'land', 'ground', 'road', 'thing'); wire(b, 'roadSec', 'section', 'road', 'section');
    placeBlock(b, 'pick', 0, 0, { options: 'the battery cable|the road', which: 'the battery cable' }, 'pick'); b.nodes.pick!.label = 'Which to see';
    wire(b, 'bay', 'assembly', 'pick', 'the battery cable'); wire(b, 'road', 'with', 'pick', 'the road');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'pick', 'chosen', 'show', 'thing');
    return b;
  }],
  ['The autopilot on the Corolla: checked, repaired, checked again, what is left named', () => {
    // the Corolla as it was made, checked by the rules; what is wrong grouped into problems and each tried with the
    // repairs, least costly first (nudge it clear, route a line again, move it by the solver, a heat shield between), a
    // repair kept only if its problem is gone and the parts it changed have less wrong than before; then the whole checked
    // again. Nothing typed by hand. What no repair clears is a named task with why. The 3D view: the engine, the battery
    // where it was moved, and the upper hose routed again, clear of the exhaust's heat
    const b = emptyBoard('The autopilot on the Corolla');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'repair.library', 0, 0, {}, 'lib'); b.nodes.lib!.label = 'The repairs it may make';
    placeBlock(b, 'view.table', 0, 0, {}, 'libRows'); wire(b, 'lib', 'repairs', 'libRows', 'rows');
    placeBlock(b, 'auto.loop', 0, 0, {}, 'auto'); b.nodes.auto!.label = 'Autopilot'; wire(b, 'car', 'vehicle', 'auto', 'thing'); wire(b, 'lib', 'library', 'auto', 'library');
    placeBlock(b, 'view.table', 0, 0, {}, 'tried'); b.nodes.tried!.label = 'Every repair tried'; wire(b, 'auto', 'attempts', 'tried', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'left'); b.nodes.left!.label = 'What is left, and why'; wire(b, 'auto', 'tasks', 'left', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); wire(b, 'auto', 'says', 'said', 'value');
    for (const [k, name, label] of [['eng', '^petrol engine', 'The engine'], ['bat', '^battery and its tray$', 'The battery, moved'], ['hose', '^upper hose$', 'The upper hose']] as [string, string, string][]) {
      placeBlock(b, 'piece', 0, 0, { name, where: 'where it sits' }, k); b.nodes[k]!.label = label; wire(b, 'auto', 'thing', k, 'thing');
    }
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'What the autopilot changed'; for (const k of ['eng', 'bat', 'hose']) wire(b, k, 'piece', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['A battery placed by the solver: where it goes, why, and what it gives up', () => {
    // the Corolla's battery placed from what it needs, not typed: taken out, the bay mapped without it (heat, motion,
    // reach), every place it fits standing on something and under the hood tried at each quarter turn; held to what it
    // must have (no cell over the 80 °C its separators stand, none in what moves), the cheapest of the rest chosen (cool,
    // a hand reaching its top, near its starter, little moved). Beside it: why, the next best and what each gives up, the
    // rule findings before and after, and the battery its engine's duty calls for. The 3D view: the engine, the battery
    // where the solver put it, and the heat round it
    const b = emptyBoard('A battery placed by the solver');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'place.solve', 0, 0, {}, 'solve'); b.nodes.solve!.label = 'Place the battery'; wire(b, 'car', 'vehicle', 'solve', 'thing');
    placeBlock(b, 'explain', 0, 0, {}, 'why'); b.nodes.why!.label = 'Why there'; wire(b, 'solve', 'placed', 'why', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'whyShow'); wire(b, 'why', 'lines', 'whyShow', 'value');
    placeBlock(b, 'view.table', 0, 0, {}, 'others'); b.nodes.others!.label = 'The next best places'; wire(b, 'solve', 'others', 'others', 'rows');
    placeBlock(b, 'size.select', 0, 0, {}, 'size'); b.nodes.size!.label = 'The battery its engine calls for'; wire(b, 'car', 'vehicle', 'size', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'groups'); b.nodes.groups!.label = 'Every group, weighed'; wire(b, 'size', 'options', 'groups', 'rows');
    placeBlock(b, 'piece', 0, 0, { name: '^petrol engine', where: 'where it sits' }, 'eng'); b.nodes.eng!.label = 'The engine'; wire(b, 'solve', 'thing', 'eng', 'thing');
    placeBlock(b, 'piece', 0, 0, { name: '^battery and its tray$', where: 'where it sits' }, 'bat'); b.nodes.bat!.label = 'The battery, where it was put'; wire(b, 'solve', 'thing', 'bat', 'thing');
    placeBlock(b, 'field', 0, 0, { kind: 'heat', grow: 0.25 }, 'heat'); b.nodes.heat!.label = 'Map: heat, the battery moved'; wire(b, 'solve', 'thing', 'heat', 'thing');
    placeBlock(b, 'field.show', 0, 0, { slice: 'y', at: 0.55 }, 'heatShow'); b.nodes.heatShow!.label = 'Heat: a level slice'; wire(b, 'heat', 'field', 'heatShow', 'field');
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'Engine, battery and heat'; wire(b, 'eng', 'piece', 'scene', 'things'); wire(b, 'bat', 'piece', 'scene', 'things'); wire(b, 'heatShow', 'view', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Fields over the engine bay: what each part needs, and maps of heat, motion and reach', () => {
    // the Corolla's engine bay as maps, not as positions: what every part needs, read from what its parts state (nothing
    // typed); then the space round the engine cell by cell: how hot (the rules' own fall-off from each hot surface, a
    // solid between blocking it), how much room from what moves (wheels through their steer and bump, the belt, the engine
    // rocking on its mounts), and where a hand reaches leaning over the open bay; and the three as one cost. Pick which
    // the 3D view shows; each cell coloured blue (good) to red (bad)
    const b = emptyBoard('Fields over the engine bay');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'need', 0, 0, {}, 'needs'); b.nodes.needs!.label = 'What every part needs'; wire(b, 'car', 'vehicle', 'needs', 'thing');
    placeBlock(b, 'need', 0, 0, { kind: 'access' }, 'reachNeeds'); b.nodes.reachNeeds!.label = 'Who must reach what, how often'; wire(b, 'car', 'vehicle', 'reachNeeds', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'reachRows'); b.nodes.reachRows!.label = 'Reached, a year'; wire(b, 'reachNeeds', 'needs', 'reachRows', 'rows');
    placeBlock(b, 'piece', 0, 0, { name: '^petrol engine', where: 'where it sits' }, 'eng'); b.nodes.eng!.label = 'The engine, to see the maps round'; wire(b, 'car', 'vehicle', 'eng', 'thing');
    for (const [k, kind, show] of [['h', 'heat', { slice: 'y', at: 0.45 }], ['m', 'motion', { slice: 'y', at: 0.45 }], ['r', 'reach', { slice: 'y', at: 0.7 }]] as [string, string, Record<string, unknown>][]) {
      placeBlock(b, 'field', 0, 0, { kind }, `f${k}`); b.nodes[`f${k}`]!.label = `Map: ${kind}`; wire(b, 'car', 'vehicle', `f${k}`, 'thing');
      placeBlock(b, 'field.show', 0, 0, show, `s${k}`); b.nodes[`s${k}`]!.label = `Show ${kind}: a level slice`; wire(b, `f${k}`, 'field', `s${k}`, 'field');
    }
    placeBlock(b, 'field.combine', 0, 0, { weights: '1 1 1' }, 'fc'); b.nodes.fc!.label = 'Heat, motion and reach as one cost'; for (const k of ['h', 'm', 'r']) wire(b, `f${k}`, 'field', 'fc', 'fields');
    placeBlock(b, 'field.show', 0, 0, { slice: 'y', at: 0.7 }, 'sc'); b.nodes.sc!.label = 'The three as one cost: a level slice'; wire(b, 'fc', 'field', 'sc', 'field');
    placeBlock(b, 'pick', 0, 0, { options: 'heat|motion|reach|all three', which: 'heat' }, 'pick'); b.nodes.pick!.label = 'Which map to see';
    for (const [k, o] of [['h', 'heat'], ['m', 'motion'], ['r', 'reach'], ['c', 'all three']] as [string, string][]) wire(b, `s${k}`, 'view', 'pick', o);
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'The engine and the map'; wire(b, 'eng', 'piece', 'scene', 'things'); wire(b, 'pick', 'chosen', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['A car down to its bolts: tyres made in depth, a shared battery, taken apart', () => {
    // a Toyota Corolla by Toyota's figures, built part by part down to its wheel nuts; its four tyres swapped for one tyre
    // made in depth (layers, beads, belts, a tread of pitches), the same one on every wheel; a group 35 battery (typical
    // of Toyotas) over its gearbox on the left, where Toyota puts it; then taken apart three levels down: turn "how far
    // apart" to 0 to put it back together
    const b = emptyBoard('A car down to its bolts');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'tyre', 0, 0, { pattern: 'all-season', code: '205/55R16' }, 'tyre'); b.nodes.tyre!.label = 'Tyre 205/55R16, made in depth';
    placeBlock(b, 'fit', 0, 0, {}, 'fit'); b.nodes.fit!.label = 'Fit it on every wheel'; wire(b, 'car', 'vehicle', 'fit', 'thing'); wire(b, 'tyre', 'tyre', 'fit', 'with');
    placeBlock(b, 'battery.starter', 0, 0, { group: '35' }, 'bat'); b.nodes.bat!.label = 'Battery, BCI group 35';
    placeBlock(b, 'place', 0, 0, { x: 1.56, y: 0.645, z: -0.275 }, 'batAt'); b.nodes.batAt!.label = 'Over the gearbox, left'; wire(b, 'bat', 'battery', 'batAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'Corolla, to its bolts' }, 'all'); wire(b, 'fit', 'fitted', 'all', 'things'); wire(b, 'batAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0.5, levels: 3 }, 'apart'); wire(b, 'all', 'assembly', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'car', 'vehicle', 'audit', 'thing');
    return b;
  }],
  ['A truck from the ground up: axles, then tyres, then batteries', () => {
    // a 6x4 highway tractor built from its axles up (where each is, its track, its tyres, steer or drive, twin tyres, how
    // it hangs: the Cascadia's figures), its kind giving its cab, tanks, stacks and fifth wheel; a rib tyre fitted to its
    // steer axle and a drive tyre to its eight drive wheels; three group 31 batteries in a row on its left rail behind
    // its tank. Add an axle (wire another Axle in) and it is an 8x4; take one away and it is a 4x2
    const b = emptyBoard('A truck from the ground up');
    placeBlock(b, 'vehicle.axle', 0, 0, { steer: true, susp: 'leaf', x: 2.268, track: 2.05, tyre: '315/80R22.5', brakeD: 0.43 }, 'a1'); b.nodes.a1!.label = 'Steer axle';
    placeBlock(b, 'vehicle.axle', 0, 0, { drive: true, dual: true, susp: 'air', x: -1.51, track: 1.85, tyre: '11R22.5', brakeD: 0.43 }, 'a2'); b.nodes.a2!.label = 'Drive axle, front';
    placeBlock(b, 'vehicle.axle', 0, 0, { drive: true, dual: true, susp: 'air', x: -2.805, track: 1.85, tyre: '11R22.5', brakeD: 0.43 }, 'a3'); b.nodes.a3!.label = 'Drive axle, rear';
    placeBlock(b, 'vehicle', 0, 0, { kind: 'truck', power: 'diesel', extras: 'cab, tanks, stacks, fifth wheel', L: 7.166, W: 2.5, H: 3.03, kW: 375, cc: 14800, color: '#c62828' }, 'truck'); b.nodes.truck!.label = 'Truck from its axles';
    for (const a of ['a1', 'a2', 'a3']) wire(b, a, 'axle', 'truck', 'axles');
    placeBlock(b, 'tyre', 0, 0, { pattern: 'rib', code: '315/80R22.5' }, 'ts'); b.nodes.ts!.label = 'Steer tyre (rib)';
    placeBlock(b, 'tyre', 0, 0, { pattern: 'drive', code: '11R22.5' }, 'td'); b.nodes.td!.label = 'Drive tyre (lug)';
    placeBlock(b, 'fit', 0, 0, { path: '^((outer|inner) )?tyre 315' }, 'f1'); b.nodes.f1!.label = 'Fit on the steer axle'; wire(b, 'truck', 'vehicle', 'f1', 'thing'); wire(b, 'ts', 'tyre', 'f1', 'with');
    placeBlock(b, 'fit', 0, 0, { path: '^((outer|inner) )?tyre 11R' }, 'f2'); b.nodes.f2!.label = 'Fit on the drive axles'; wire(b, 'f1', 'fitted', 'f2', 'thing'); wire(b, 'td', 'tyre', 'f2', 'with');
    placeBlock(b, 'battery.starter', 0, 0, { group: '31' }, 'bat'); b.nodes.bat!.label = 'Battery, BCI group 31';
    placeBlock(b, 'place', 0, 0, { ry: Math.PI / 2 }, 'batTurn'); b.nodes.batTurn!.label = 'Turned across'; wire(b, 'bat', 'battery', 'batTurn', 'thing');
    placeBlock(b, 'array', 0, 0, { pattern: 'line', n: 3, dx: 0.185 }, 'bats'); b.nodes.bats!.label = 'Three in a row'; wire(b, 'batTurn', 'placed', 'bats', 'thing');
    placeBlock(b, 'place', 0, 0, { x: -0.83, y: 0.62, z: -0.66 }, 'batAt'); b.nodes.batAt!.label = 'On the left rail, behind the tank'; wire(b, 'bats', 'row', 'batAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'truck' }, 'all'); wire(b, 'f2', 'fitted', 'all', 'things'); wire(b, 'batAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0, levels: 3 }, 'apart'); b.nodes.apart!.label = 'Take apart (turn it up)'; wire(b, 'all', 'assembly', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'truck', 'vehicle', 'audit', 'thing');
    return b;
  }],
  ['An electric car\'s pack: 3,360 cells, one stored', () => {
    // a sedan with electric drive; the box that stood for its pack swapped for a pack of 21700 cells: 96 in series of 35,
    // six modules of 16 groups, 60 kWh (what the room under its floor takes laid this way); the same pack again beside it, so
    // it can be seen (stored once, placed twice), and the cell itself
    const b = emptyBoard('An electric car\'s pack');
    placeBlock(b, 'vehicle', 0, 0, { kind: 'car', body: 'sedan', power: 'electric', color: '#eceff1' }, 'car'); b.nodes.car!.label = 'Sedan, electric';
    placeBlock(b, 'battery.pack', 0, 0, { format: '21700', s: 96, p: 35, rows: 5, modules: '16, 16, 16, 16, 16, 16' }, 'pack'); b.nodes.pack!.label = 'Pack of 21700s, 96s35p';
    placeBlock(b, 'fit', 0, 0, { path: '^battery pack' }, 'fit'); b.nodes.fit!.label = 'Fit it under the floor'; wire(b, 'car', 'vehicle', 'fit', 'thing'); wire(b, 'pack', 'pack', 'fit', 'with');
    placeBlock(b, 'battery.cell', 0, 0, { format: '21700' }, 'cell'); b.nodes.cell!.label = 'One cell (21700)';
    placeBlock(b, 'place', 0, 0, { x: -1.5, y: 0.035, z: 2.0 }, 'cellAt'); b.nodes.cellAt!.label = 'Beside it'; wire(b, 'cell', 'cell', 'cellAt', 'thing');
    placeBlock(b, 'place', 0, 0, { x: 0, y: 0.04, z: 2.6 }, 'packAt'); b.nodes.packAt!.label = 'The same pack, beside it to be seen'; wire(b, 'pack', 'pack', 'packAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'electric car' }, 'all'); wire(b, 'fit', 'fitted', 'all', 'things'); wire(b, 'cellAt', 'placed', 'all', 'things'); wire(b, 'packAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0, levels: 2 }, 'apart'); b.nodes.apart!.label = 'Take apart (turn it up)'; wire(b, 'all', 'assembly', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['A computer down to the transistor: FinFET, cell, die, package, board, PC', () => {
    // two FinFETs at Intel 14 nm's published pitches (an n-type, a p-type); made into a 6T SRAM bit and a NAND2 gate; those
    // placed by the billion into a 4-core die (each core's logic and graphics an estimate); the die flipped into an
    // LGA1151 package, socketed in an ATX board, in a tower PC. The same die beside the PC, face up, at its true size:
    // zoom the 3D view (or the space's S) down into it, through its caches and rows of gates, to a single transistor
    const b = emptyBoard('A computer down to the transistor');
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'n', fins: 1 }, 'tn'); b.nodes.tn!.label = 'nFET, 1 fin';
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'p', fins: 1 }, 'tp'); b.nodes.tp!.label = 'pFET, 1 fin';
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'n', fins: 2 }, 'tn2'); b.nodes.tn2!.label = 'nFET, 2 fins';
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'p', fins: 2 }, 'tp2'); b.nodes.tp2!.label = 'pFET, 2 fins';
    placeBlock(b, 'chip.cell', 0, 0, { proc: 'intel-14nm', kind: 'SRAM bit (6T)' }, 'bit'); b.nodes.bit!.label = 'SRAM bit (6 transistors)'; wire(b, 'tn', 'transistor', 'bit', 'n'); wire(b, 'tp', 'transistor', 'bit', 'p');
    placeBlock(b, 'chip.cell', 0, 0, { proc: 'intel-14nm', kind: 'NAND2 gate' }, 'gate'); b.nodes.gate!.label = 'NAND2 gate (4 transistors)'; wire(b, 'tn2', 'transistor', 'gate', 'n'); wire(b, 'tp2', 'transistor', 'gate', 'p');
    placeBlock(b, 'chip.die', 0, 0, { proc: 'intel-14nm', cores: 4, coreMm2: 7, l2KB: 256, l3MB: 8, uncoreMm2: 50 }, 'die'); b.nodes.die!.label = 'Die, 4 cores'; wire(b, 'bit', 'cell', 'die', 'sram'); wire(b, 'gate', 'cell', 'die', 'nand');
    placeBlock(b, 'chip.package', 0, 0, { socket: 'LGA1151' }, 'pkg'); wire(b, 'die', 'die', 'pkg', 'die');
    placeBlock(b, 'pc.board', 0, 0, { form: 'ATX' }, 'board'); wire(b, 'pkg', 'package', 'board', 'package');
    placeBlock(b, 'pc.desktop', 0, 0, {}, 'pc'); wire(b, 'board', 'board', 'pc', 'board');
    placeBlock(b, 'place', 0, 0, { x: 0.45, y: 0.001 }, 'dieAt'); b.nodes.dieAt!.label = 'The die beside it, face up'; wire(b, 'die', 'die', 'dieAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'a computer, to its transistors' }, 'all'); wire(b, 'pc', 'pc', 'all', 'things'); wire(b, 'dieAt', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['Physics: a steel ball let go into a tower of wooden blocks', () => {
    // 24 oak blocks 100 mm a side, two by two and six high; a 120 mm steel ball shoved at the tower for 0.1 s with 300 N.
    // Let it go runs Jolt once (each block a body, its mass from oak's density, friction and bounce from the materials
    // table); press ▶ under the 3D view to watch it fall
    const b = emptyBoard('A ball let go into a tower');
    placeBlock(b, 'shape.box', 0, 0, { name: 'block', mat: 'oak', color: '#c8a26b', finish: 'grain', w: 0.1, h: 0.1, d: 0.1 }, 'block');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 2, nz: 2, ny: 6, sx: 0.1, sy: 0.1, sz: 0.1 }, 'tower'); b.nodes.tower!.label = 'Tower, 2 × 2 × 6'; wire(b, 'block', 'part', 'tower', 'thing');
    placeBlock(b, 'place', 0, 0, { y: 0.05 }, 'towerAt'); wire(b, 'tower', 'grid', 'towerAt', 'thing');
    placeBlock(b, 'shape.sphere', 0, 0, { name: 'ball', mat: 'steel-low', color: '#b0bec5', finish: 'chrome', r: 0.06 }, 'ball');
    placeBlock(b, 'place', 0, 0, { x: -0.8, y: 0.06 }, 'ballAt'); wire(b, 'ball', 'part', 'ballAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'scene' }, 'all'); wire(b, 'towerAt', 'placed', 'all', 'things'); wire(b, 'ballAt', 'placed', 'all', 'things');
    placeBlock(b, 'push', 0, 0, { name: 'ball', fx: 300, seconds: 0.1 }, 'shove'); b.nodes.shove!.label = 'Shove the ball';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'letgo', 0, 0, { seconds: 8 }, 'go'); wire(b, 'all', 'assembly', 'go', 'things'); wire(b, 'shove', 'push', 'go', 'push'); wire(b, 'clock', 't', 'go', 't');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Physics: a cart on two motor-driven wheels', () => {
    // an aluminium deck 1 × 0.5 m on four rubber wheels 200 mm across, each on a hinge; the back two each turned by a maxon
    // RE 40 (24 V) through its 12:1 gearhead, from their datasheets: it pulls away and settles at the speed the motors'
    // constants give (about 6.5 m/s). The motors are not current-limited: they draw their stall current (80 A) to start,
    // over the motor's 6 A continuous rating and the gearhead's 7.5 N·m (a driver would limit it: not yet modelled)
    const b = emptyBoard('A cart on motor-driven wheels');
    placeBlock(b, 'shape.box', 0, 0, { name: 'chassis', mat: 'al-6061', color: '#90a4ae', finish: 'brushed', w: 1, h: 0.06, d: 0.5 }, 'deck'); b.nodes.deck!.label = 'Deck';
    placeBlock(b, 'place', 0, 0, { y: 0.16 }, 'deckAt'); wire(b, 'deck', 'part', 'deckAt', 'thing');
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'wheel', mat: 'rubber', color: '#212121', finish: 'tread', r: 0.1, h: 0.05 }, 'wheel'); b.nodes.wheel!.label = 'Wheel';
    placeBlock(b, 'combine', 0, 0, { name: 'cart' }, 'all'); wire(b, 'deckAt', 'placed', 'all', 'things');
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'letgo', 0, 0, { seconds: 8 }, 'go'); wire(b, 'clock', 't', 'go', 't');
    const W: [number, number][] = [[-0.4, 0.3], [-0.4, -0.3], [0.4, 0.3], [0.4, -0.3]], names = ['wheel', 'wheel 2', 'wheel 3', 'wheel 4'];
    W.forEach(([x, z], k) => {
      placeBlock(b, 'place', 0, 0, { x, y: 0.1, z, rx: Math.PI / 2 }, `w${k}`); b.nodes[`w${k}`]!.label = `${names[k]}, on its axle`; wire(b, 'wheel', 'part', `w${k}`, 'thing'); wire(b, `w${k}`, 'placed', 'all', 'things');
      placeBlock(b, 'hinge', 0, 0, { a: names[k], b: 'chassis', axis: 'z', x, y: 0.1, z, ...(k < 2 ? { motor: 'motor.dc.coreless.d40-150w-24v', gear: 'gearhead.planetary.d42-12to1', reverse: 1 } : {}) }, `h${k}`);
      b.nodes[`h${k}`]!.label = k < 2 ? `${names[k]}: motor and gearhead` : `${names[k]}: free`; wire(b, `h${k}`, 'joint', 'go', 'joints');
    });
    wire(b, 'all', 'assembly', 'go', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Motion: a door swinging, and what it hits', () => {
    // a door mated into its wall, turned on its hinge edge (0 to 90° and back, at most 90°/s, 180°/s², about how a door is
    // swung by hand: an estimate); its swing swept, and checked against a bed put too close
    const b = emptyBoard('A door swinging, and what it hits');
    placeBlock(b, 'wall', 0, 0, { opening: 'door', name: 'wall', mat: 'brick', color: '#eceff1', finish: 'paint', L: 4, h: 2.4 }, 'wall');
    placeBlock(b, 'seed.door', 0, 0, {}, 'door');
    placeBlock(b, 'mate', 0, 0, { frame: 'fit', onto: 'opening', how: 'into' }, 'mate'); wire(b, 'door', 'door', 'mate', 'thing'); wire(b, 'wall', 'wall', 'mate', 'on');
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'turn', 0, 0, { axis: 'y', keys: '0 s 0°, 2 s 90°, 5 s 90°, 7 s 0°', x: -0.43, y: 0, z: 0, speed: 90, accel: 180 }, 'swing'); b.nodes.swing!.label = 'Turn it on its hinge';
    wire(b, 'mate', 'placed', 'swing', 'thing'); wire(b, 'clock', 't', 'swing', 't');
    placeBlock(b, 'seed.bed', 0, 0, { size: 'queen' }, 'bed');
    placeBlock(b, 'place', 0, 0, { x: 0.3, z: -1.2, ry: Math.PI / 2 }, 'bedAt'); b.nodes.bedAt!.label = 'Bed, too close'; wire(b, 'bed', 'bed', 'bedAt', 'thing');
    placeBlock(b, 'sweep', 0, 0, { axis: 'y', x: -0.43, from: 0, to: 90, n: 12 }, 'sweep'); b.nodes.sweep!.label = 'The room its swing needs'; wire(b, 'mate', 'placed', 'sweep', 'thing');
    placeBlock(b, 'clash', 0, 0, { depth: 1 }, 'clash'); b.nodes.clash!.label = 'Does the swing hit the bed?'; wire(b, 'sweep', 'swept', 'clash', 'thing'); wire(b, 'bedAt', 'placed', 'clash', 'with');
    placeBlock(b, 'combine', 0, 0, { name: 'room corner' }, 'all'); wire(b, 'wall', 'wall', 'all', 'things'); wire(b, 'swing', 'turned', 'all', 'things'); wire(b, 'bedAt', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Physics: a pendulum on a hinge', () => {
    // an oak plank 1 m long hung from a hinge 2 m up, let go from 60°: it swings, and the hinge's angle is kept over time
    const b = emptyBoard('A pendulum on a hinge');
    placeBlock(b, 'shape.box', 0, 0, { name: 'plank', mat: 'oak', color: '#a1887f', w: 0.05, h: 1, d: 0.05 }, 'plank');
    placeBlock(b, 'place', 0, 0, { x: 0.433, y: 1.75, rz: Math.PI / 3 }, 'plankAt'); b.nodes.plankAt!.label = 'Plank, raised 60°'; wire(b, 'plank', 'part', 'plankAt', 'thing');
    placeBlock(b, 'hinge', 0, 0, { a: 'plank', axis: 'z', x: 0, y: 2, z: 0 }, 'hinge'); b.nodes.hinge!.label = 'Hinge, 2 m up';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'letgo', 0, 0, { seconds: 20 }, 'go'); wire(b, 'plankAt', 'placed', 'go', 'things'); wire(b, 'hinge', 'joint', 'go', 'joints'); wire(b, 'clock', 't', 'go', 't');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Mating: a door set in its wall by their frames', () => {
    // the wall's opening is a frame; the door's middle is a frame; Mate puts the one on the other, facing as it faces.
    // Change the wall's length or the opening's offset and the door follows
    const b = emptyBoard('Mating by frames');
    placeBlock(b, 'wall', 0, 0, { opening: 'door', name: 'wall', mat: 'brick', color: '#eceff1', finish: 'paint', L: 4, h: 2.4, off: 0.8 }, 'wall'); b.nodes.wall!.label = 'Wall with a door opening';
    placeBlock(b, 'seed.door', 0, 0, { colour: '#8d6e63' }, 'door'); b.nodes.door!.label = 'Door (its frame: "fit")';
    placeBlock(b, 'mate', 0, 0, { frame: 'fit', onto: 'opening', how: 'into' }, 'mate'); b.nodes.mate!.label = 'Mate: fit into opening';
    wire(b, 'door', 'door', 'mate', 'thing'); wire(b, 'wall', 'wall', 'mate', 'on');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'mate', 'both', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'mate', 'both', 'measure', 'thing');
    return b;
  }],
  ['Clear away: a field of grass, cleared where a road goes', () => {
    // a flat field 20 m square covered a foot at a time with grass; the patches the road comes within 0.2 m of taken away
    // whole (depth 0: each patch stays one shared thing; deeper, it would cut patches blade by blade)
    const b = emptyBoard('Clearing by where things are');
    placeBlock(b, 'terrain', 0, 0, { w: 20, d: 20, relief: 0, cells: 8, color: '#4e7d32' }, 'field'); b.nodes.field!.label = 'Field';
    placeBlock(b, 'seed.grass', 0, 0, { blades: 16, soil: 'none' }, 'patch'); b.nodes.patch!.label = 'A foot of grass';
    placeBlock(b, 'scatter', 0, 0, { mode: 'grid', step: 0.3048, w: 20, d: 20, turn: true }, 'lawn'); b.nodes.lawn!.label = 'Patches all over it';
    wire(b, 'patch', 'patch', 'lawn', 'thing'); wire(b, 'field', 'ground', 'lawn', 'on');
    placeBlock(b, 'seed.road', 0, 0, { L: 20 }, 'road'); b.nodes.road!.label = 'Road across it';
    placeBlock(b, 'place', 0, 0, { y: 0.1 }, 'roadAt'); wire(b, 'road', 'road', 'roadAt', 'thing');
    placeBlock(b, 'clear', 0, 0, { keep: false, depth: 0, gap: 0.2 }, 'clear'); b.nodes.clear!.label = 'Clear the grass the road is on';
    wire(b, 'lawn', 'scattered', 'clear', 'thing'); wire(b, 'roadAt', 'placed', 'clear', 'near');
    placeBlock(b, 'combine', 0, 0, { name: 'field with a road' }, 'all'); wire(b, 'field', 'ground', 'all', 'things'); wire(b, 'clear', 'cleared', 'all', 'things'); wire(b, 'roadAt', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['Seeds, one of each: window, door, toilet, sink, bed, car, stop light', () => seedBoard('Seeds, one of each', [
    ['seed.window', 'Window', {}, { x: -6, y: 1.5 }, 'window'],
    ['seed.door', 'Door', {}, { x: -4.5, y: 1.05 }, 'door'],
    ['seed.toilet', 'Toilet', {}, { x: -3 }, 'toilet'],
    ['seed.sink', 'Sink (choose it: its kind)', { kind: 'vanity' }, { x: -2 }, 'sink'],
    ['seed.bed', 'Bed (choose it: its size)', {}, { x: 0 }, 'bed'],
    ['seed.car', 'Car (choose it: its paint)', {}, { x: 4.5, z: 1 }, 'car'],
    ['seed.stoplight', 'Stop light (choose it: which is lit)', { state: 'green' }, { x: 8.5 }, 'light'],
    ['seed.grass', 'A foot of grass', {}, { x: 10 }, 'patch'],
  ])],
  ['Ground: a foot of grass, then a whole terrain of it', () => seedBoard('Ground from a foot of grass', [
    ['seed.terrain', 'Terrain (choose it: its seed, its size, grassed or bare)', { size: 24 }, {}, 'terrain'],
  ])],
  ['Streets: a road and a stop light, then a road system', () => seedBoard('Streets from a road and a stop light', [
    ['seed.roads', 'Road system (choose it: blocks each way, which light is lit)', {}, {}, 'roads'],
  ])],
  ['A neighbourhood, then a city, from seeds', () => seedBoard('A city from seeds', [
    ['seed.city', 'City (choose it: neighbourhoods each way, its seed)', { n: 3 }, {}, 'city'],
  ])],
  ['A city from a few nodes: motor, drone, swarm, buildings', () => {
    // a racing quad's parts at typical sizes: a 2207 brushless motor's bell about 28 mm across and 18 mm tall, a 5 inch
    // (127 mm) prop, a frame of about 220 mm between opposite motors; buildings 20 m square, streets 10 m (typical)
    const b = emptyBoard('A city from a few nodes');
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'motor bell', mat: 'al-6061', color: '#c9ced6', finish: 'brushed', r: 0.014, h: 0.018 }, 'bell');
    placeBlock(b, 'shape.box', 0, 0, { name: 'prop', mat: 'pp', color: '#ff5252', w: 0.127, h: 0.002, d: 0.012 }, 'prop');
    placeBlock(b, 'place', 0, 0, { y: 0.011 }, 'propUp'); wire(b, 'prop', 'part', 'propUp', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'motor' }, 'motor'); wire(b, 'bell', 'part', 'motor', 'things'); wire(b, 'propUp', 'placed', 'motor', 'things');
    placeBlock(b, 'shape.box', 0, 0, { name: 'frame', mat: 'fibreglass', color: '#263238', w: 0.16, h: 0.004, d: 0.16 }, 'frame');
    placeBlock(b, 'array', 0, 0, { pattern: 'ring', n: 4, r: 0.11 }, 'arms'); wire(b, 'motor', 'assembly', 'arms', 'thing');
    placeBlock(b, 'place', 0, 0, { y: 0.011 }, 'armsUp'); wire(b, 'arms', 'ring', 'armsUp', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'drone' }, 'drone'); wire(b, 'frame', 'part', 'drone', 'things'); wire(b, 'armsUp', 'placed', 'drone', 'things');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 10, nz: 10, sx: 1, sz: 1 }, 'swarm'); b.nodes.swarm!.label = 'Swarm'; wire(b, 'drone', 'assembly', 'swarm', 'thing');
    placeBlock(b, 'place', 0, 0, { y: 45 }, 'swarmUp'); wire(b, 'swarm', 'grid', 'swarmUp', 'thing');
    placeBlock(b, 'shape.box', 0, 0, { name: 'tower', mat: 'concrete', color: '#90a4ae', finish: 'concrete', w: 20, h: 30, d: 20 }, 'tower'); b.nodes.tower!.label = 'Tower';
    placeBlock(b, 'place', 0, 0, { y: 15 }, 'towerUp'); wire(b, 'tower', 'part', 'towerUp', 'thing');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 4, nz: 4, sx: 30, sz: 30, vary: 0.6, seed: 7 }, 'block'); b.nodes.block!.label = 'City block'; wire(b, 'towerUp', 'placed', 'block', 'thing');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 5, nz: 5, sx: 140, sz: 140 }, 'city'); b.nodes.city!.label = 'City'; wire(b, 'block', 'grid', 'city', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'city and swarm' }, 'all'); wire(b, 'city', 'grid', 'all', 'things'); wire(b, 'swarmUp', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    // the motor and the drone folded into nodes of their own: open them to change them, save them to use anywhere
    let r = collapse(b, ['bell', 'prop', 'propUp', 'motor'], 'Motor', 'gMotor'); tidy(r.board.nodes.gMotor!.inner!);
    r = collapse(r.board, ['gMotor', 'frame', 'arms', 'armsUp', 'drone'], 'Drone', 'gDrone'); tidy(r.board.nodes.gDrone!.inner!);
    return r.board;
  }],

  ['Parts in 3D: a bolt sized from its load, drawn whole', () => {
    // the load picks the bolt: the shank area its shear needs, the next ISO 262 size up, and that bolt drawn from its
    // standard (ISO 4014's hex bolt) with its head, shank and thread
    const b = emptyBoard('A bolt from its load');
    const F = placeBlock(b, 'in.number', 0, 0, { value: '10 kN', unit: 'N' }, 'F'); b.nodes.F!.label = 'Shear load';
    const Sy = placeBlock(b, 'in.number', 0, 0, { value: '640 MPa', unit: 'Pa' }, 'Sy'); b.nodes.Sy!.label = 'Yield, class 8.8 (ISO 898-1)';
    const n = placeBlock(b, 'in.number', 0, 0, { value: 2 }, 'n'); b.nodes.n!.label = 'Factor of safety wanted';
    const d = placeBlock(b, 'math.expr', 0, 0, { expr: 'sqrt(4 * F * n / (pi * 0.577 * Sy))', unit: 'm' }, 'd'); b.nodes.d!.label = 'Least diameter for that';
    wire(b, F, 'value', d, 'F'); wire(b, Sy, 'value', d, 'Sy'); wire(b, n, 'value', d, 'n');
    const pick = placeBlock(b, 'logic.next-size', 0, 0, {}, 'pick'); b.nodes.pick!.label = 'Next metric size (ISO 262)'; wire(b, d, 'result', pick, 'need');
    const L = placeBlock(b, 'in.number', 0, 0, { value: 40 }, 'L'); b.nodes.L!.label = 'Length, mm';
    const w = placeBlock(b, 'text.format', 0, 0, { template: 'bolt M{d}x{L}' }, 'words'); b.nodes.words!.label = 'Its name'; wire(b, pick, 'inUnit', w, 'd'); wire(b, L, 'value', w, 'L');
    const part = placeBlock(b, 'card.part', 0, 0, {}, 'part'); b.nodes.part!.label = 'The bolt'; wire(b, w, 'text', part, 'what');
    const v = placeBlock(b, 'view.3d', 0, 0, {}, 'v3'); b.nodes.v3!.label = 'The bolt, in 3D'; wire(b, part, 'part', v, 'part');
    const m = placeBlock(b, 'view.show', 0, 0, { unit: 'g' }, 'm'); b.nodes.m!.label = 'Its mass'; wire(b, part, 'mass', m, 'value');
    const br = placeBlock(b, 'card.part', 0, 0, { what: 'bearing 6205' }, 'br'); b.nodes.br!.label = 'A bearing beside it';
    const v2 = placeBlock(b, 'view.3d', 0, 0, { explode: 1 }, 'v4'); b.nodes.v4!.label = 'The bearing, taken apart'; wire(b, br, 'part', v2, 'part');
    return b;
  }],
  ['Cantilever: how far it bends, for every length', () => {
    const b = emptyBoard('Cantilever sweep');
    const P = placeBlock(b, 'in.number', 0, 0, { value: '500 N', unit: 'N' }, 'P'); b.nodes.P!.label = 'End load';
    const L = placeBlock(b, 'in.range', 0, 130, { from: 0.5, to: 2, count: 31, unit: 'm' }, 'L'); b.nodes.L!.label = 'Lengths';
    const m = placeBlock(b, 'card.material', 0, 300, { id: 'steel.a36' }, 'mat');
    const I = placeBlock(b, 'math.expr', 0, 520, { expr: 'w * h^3 / 12', unit: 'm^4', w: 0.03, h: 0.06 }, 'I'); b.nodes.I!.label = 'Section I (30 × 60 mm)';
    const d = placeBlock(b, 'law.beam.cantilever.point', 330, 120, {}, 'd');
    wire(b, P, 'value', d, 'P'); wire(b, L, 'value', d, 'L'); wire(b, m, 'E', d, 'E'); wire(b, I, 'result', d, 'I');
    const ch = placeBlock(b, 'view.chart', 660, 0, {}, 'chart'); b.nodes.chart!.label = 'Tip deflection against length'; wire(b, d, 'd', ch, 'y'); wire(b, L, 'value', ch, 'x');
    const st = placeBlock(b, 'math.stats', 660, 220, {}, 'stats'); wire(b, d, 'd', st, 'values');
    const lim = placeBlock(b, 'in.number', 660, 420, { value: '15 mm', unit: 'm' }, 'lim'); b.nodes.lim!.label = 'Most it may bend';
    const ck = placeBlock(b, 'check.limit', 960, 260, { what: 'deflection' }, 'ck'); wire(b, st, 'max', ck, 'value'); wire(b, lim, 'value', ck, 'limit');
    const g = placeBlock(b, 'view.gauge', 1260, 260, { min: 0, max: 3 }, 'g'); b.nodes.g!.label = 'Stiffness: limit ÷ worst bend'; wire(b, ck, 'factor', g, 'value');
    // and its strength: the moment at the root, over the section modulus, against the steel's yield
    const M = placeBlock(b, 'math.multiply', 330, 300, {}, 'M'); b.nodes.M!.label = 'Moment at the root (P L)'; wire(b, P, 'value', M, 'a'); wire(b, L, 'value', M, 'b');
    const S = placeBlock(b, 'math.expr', 330, 420, { expr: 'w * h^2 / 6', unit: 'm^3', w: 0.03, h: 0.06 }, 'S'); b.nodes.S!.label = 'Section modulus (30 × 60 mm)';
    const sb = placeBlock(b, 'law.stress.bending', 600, 300, {}, 'sb'); wire(b, M, 'result', sb, 'M'); wire(b, S, 'result', sb, 'S');
    const sm = placeBlock(b, 'math.stats', 900, 300, {}, 'sm'); b.nodes.sm!.label = 'Bending stress over the lengths'; wire(b, sb, 'sigma', sm, 'values');
    const ck2 = placeBlock(b, 'check.limit', 1200, 300, { what: 'bending stress' }, 'ck2'); wire(b, sm, 'max', ck2, 'value'); wire(b, m, 'yield', ck2, 'limit');
    const g2 = placeBlock(b, 'view.gauge', 1500, 300, { min: 0, max: 3 }, 'g2'); b.nodes.g2!.label = 'Strength: yield ÷ worst stress'; wire(b, ck2, 'factor', g2, 'value');
    const nt = placeBlock(b, 'note', 330, 470, { text: 'Change the load, the section or the material: only what it reaches runs again. The law runs once for each of the 31 lengths.' }, 'note');
    void nt; return b;
  }],
  ['Bolt: shear, tightening torque and margin', () => {
    // an M8 property class 8.8 bolt: its figures from ISO 898-1:2013 (tables 3 and 7) and ISO 898-1's stress area
    const b = emptyBoard('Bolted joint, M8 class 8.8');
    const F = placeBlock(b, 'in.number', 0, 0, { value: '10 kN', unit: 'N' }, 'F'); b.nodes.F!.label = 'Shear load';
    const dd = placeBlock(b, 'in.number', 0, 0, { value: '8 mm', unit: 'm' }, 'dd'); b.nodes.dd!.label = 'Bolt diameter';
    const As = placeBlock(b, 'in.number', 0, 0, { value: '36.6 mm^2', unit: 'm^2' }, 'As'); b.nodes.As!.label = 'Stress area, M8 (ISO 898-1)';
    const Sy = placeBlock(b, 'in.number', 0, 0, { value: '640 MPa', unit: 'Pa' }, 'Sy'); b.nodes.Sy!.label = 'Yield, class 8.8 (ISO 898-1)';
    const Sp = placeBlock(b, 'in.number', 0, 0, { value: '580 MPa', unit: 'Pa' }, 'Sp'); b.nodes.Sp!.label = 'Proof stress, class 8.8 (ISO 898-1)';
    const tau = placeBlock(b, 'math.expr', 0, 0, { expr: 'F / (pi * d^2 / 4)', unit: 'Pa' }, 'tau'); b.nodes.tau!.label = 'Shear stress on the shank';
    wire(b, F, 'value', tau, 'F'); wire(b, dd, 'value', tau, 'd');
    const allow = placeBlock(b, 'math.expr', 0, 0, { expr: '0.577 * Sy', unit: 'Pa' }, 'allow'); b.nodes.allow!.label = 'Allowed shear (von Mises)'; wire(b, Sy, 'value', allow, 'Sy');
    const ck = placeBlock(b, 'check.limit', 0, 0, { what: 'bolt shear' }, 'ck'); wire(b, tau, 'result', ck, 'value'); wire(b, allow, 'result', ck, 'limit');
    const pre = placeBlock(b, 'math.expr', 0, 0, { expr: '0.75 * Sp * As', unit: 'N' }, 'pre'); b.nodes.pre!.label = 'Preload, 75 % of proof load (Shigley 8-31)'; wire(b, Sp, 'value', pre, 'Sp'); wire(b, As, 'value', pre, 'As');
    const T = placeBlock(b, 'law.bolt.torque.nut-factor', 0, 0, { K: 0.2 }, 'T'); wire(b, dd, 'value', T, 'd'); wire(b, pre, 'result', T, 'F');
    const s1 = placeBlock(b, 'view.show', 0, 0, { unit: 'N m' }, 's1'); b.nodes.s1!.label = 'Tighten to'; wire(b, T, 'T', s1, 'value');
    const s2 = placeBlock(b, 'view.gauge', 0, 0, { min: 0, max: 4 }, 's2'); b.nodes.s2!.label = 'Factor of safety in shear'; wire(b, ck, 'factor', s2, 'value');
    placeBlock(b, 'note', 0, 0, { text: 'K = 0.2 is the nut factor for dry, as-received steel threads (Shigley table 8-15). Try 0.15 for lubricated threads, or a 12 kN load.' }, 'note');
    return b;
  }],
  ['Business: cash flow, loan and what it is worth', () => {
    const b = emptyBoard('Cash flow');
    const t = placeBlock(b, 'in.table', 0, 0, { value: 'month, in, out\n1, 12000, 9000\n2, 13500, 9400\n3, 11000, 9800\n4, 15000, 10200\n5, 16200, 10900\n6, 14800, 11000' }, 'tab'); b.nodes.tab!.label = 'Monthly money';
    const ci = placeBlock(b, 'list.column', 300, 0, { column: 'in' }, 'ci'), co = placeBlock(b, 'list.column', 300, 140, { column: 'out' }, 'co');
    wire(b, t, 'rows', ci, 'rows'); wire(b, t, 'rows', co, 'rows');
    const net = placeBlock(b, 'math.subtract', 580, 60, {}, 'net'); b.nodes.net!.label = 'Net each month'; wire(b, ci, 'values', net, 'a'); wire(b, co, 'values', net, 'b');
    const loan = placeBlock(b, 'fin.loan', 0, 320, { principal: 40000, rate: 0.07, years: 5, perYear: 12 }, 'loan'); b.nodes.loan!.label = 'Van loan, 60 payments';
    const left = placeBlock(b, 'math.subtract', 580, 360, {}, 'left'); b.nodes.left!.label = 'Net after the loan payment'; wire(b, net, 'result', left, 'a'); wire(b, loan, 'payment', left, 'b');
    const run = placeBlock(b, 'list.running', 860, 0, { start: 5000 }, 'bal'); b.nodes.bal!.label = 'Bank balance, with the loan'; wire(b, left, 'result', run, 'values');
    const ch = placeBlock(b, 'view.chart', 1160, 0, {}, 'chart'); b.nodes.chart!.label = 'Balance by month'; wire(b, run, 'totals', ch, 'y');
    const npv = placeBlock(b, 'fin.npv', 860, 260, { rate: 0.01 }, 'npv'); b.nodes.npv!.label = 'Worth today, at 1 % a month'; wire(b, left, 'result', npv, 'flows');
    const sv = placeBlock(b, 'view.show', 1160, 300, {}, 'sv'); b.nodes.sv!.label = 'These 6 months, after the loan, worth today'; wire(b, npv, 'npv', sv, 'value');
    const t2 = placeBlock(b, 'list.zip', 860, 470, { names: 'net, after' }, 'zip'); wire(b, net, 'result', t2, 'net'); wire(b, left, 'result', t2, 'after');
    const tv = placeBlock(b, 'view.table', 1160, 470, {}, 'tv'); b.nodes.tv!.label = 'Each month, before and after the loan'; wire(b, t2, 'rows', tv, 'rows');
    return b;
  }],
  ['Electrical: a resistor heating, swept over current', () => {
    const b = emptyBoard('Resistor');
    const I = placeBlock(b, 'in.range', 0, 0, { from: 0, to: 3, count: 31, unit: 'A' }, 'I'); b.nodes.I!.label = 'Current';
    const R = placeBlock(b, 'in.number', 0, 160, { value: 4.7, unit: 'ohm' }, 'R'); b.nodes.R!.label = 'Resistance';
    const V = placeBlock(b, 'law.ohm', 300, 0, {}, 'V'), P = placeBlock(b, 'law.joule', 300, 200, {}, 'P');
    wire(b, I, 'value', V, 'I'); wire(b, R, 'value', V, 'R'); wire(b, I, 'value', P, 'I'); wire(b, R, 'value', P, 'R');
    const c1 = placeBlock(b, 'view.chart', 620, 0, {}, 'c1'); b.nodes.c1!.label = 'Voltage'; wire(b, V, 'V', c1, 'y'); wire(b, I, 'value', c1, 'x');
    const c2 = placeBlock(b, 'view.chart', 620, 200, {}, 'c2'); b.nodes.c2!.label = 'Heat'; wire(b, P, 'P', c2, 'y'); wire(b, I, 'value', c2, 'x');
    const st = placeBlock(b, 'math.stats', 620, 400, {}, 'st'); wire(b, P, 'P', st, 'values');
    const rating = placeBlock(b, 'in.number', 620, 600, { value: '5 W', unit: 'W' }, 'rt'); b.nodes.rt!.label = 'Its rating';
    const ck = placeBlock(b, 'check.limit', 940, 450, { what: 'power' }, 'ck'); wire(b, st, 'max', ck, 'value'); wire(b, rating, 'value', ck, 'limit');
    const code = placeBlock(b, 'code', 940, 120, { lang: 'js', inputs: 'P, I', outputs: 'firstOver', code: 'const k = P.findIndex(p => p > 5);\nreturn { firstOver: k < 0 ? "never over 5 W" : `over 5 W from ${I[k].toFixed(1)} A` };' }, 'code'); b.nodes.code!.label = 'Where it overheats (code)';
    wire(b, P, 'P', code, 'P'); wire(b, I, 'value', code, 'I');
    const sv = placeBlock(b, 'view.show', 1240, 120, {}, 'sv'); wire(b, code, 'firstOver', sv, 'value');
    return b;
  }],
] as [string, Make][]).map(([n, f]) => [n, () => tidy(f())]);

/** Each starter board's field, for the library's Boards (by the start of its name). */
const BOARD_FIELD: [string, string][] = [['Doorways kept clear', 'structural'], ['A body from its measured', 'everyday'], ['An agent opens', 'everyday'], ['Who notices what', 'everyday'], ['What things give off', 'everyday'], ['Lines: one section', 'mechanical'], ['The autopilot on', 'mechanical'], ['A battery placed', 'mechanical'], ['Fields over', 'mechanical'], ['A battery built', 'electrical'], ['An engine from', 'mechanical'], ['Research to', 'mechanical'], ['The gauntlet', 'software'], ['A computer down', 'electrical'], ['A car down', 'vehicles'], ['A truck from', 'vehicles'], ['An electric car', 'energy'], ['Physics', 'mechanical'], ['Motion', 'mechanical'], ['A house', 'structural'], ['A world without end', 'structural'], ['Traffic', 'vehicles'], ['Mating', 'mechanical'], ['Clear away', 'energy'], ['Seeds, one of each', 'everyday'], ['Ground', 'energy'], ['Streets', 'vehicles'], ['A neighbourhood', 'structural'], ['A city from a few nodes', 'aerospace'], ['Parts in 3D', 'mechanical'], ['Cantilever', 'structural'], ['Bolt', 'mechanical'], ['Business', 'finance'], ['Electrical', 'electrical']];
function allBoards(): { title: string; field: string; mine: boolean; make: () => Board }[] {
  const starters = DEMOS.map(([title, make]) => ({ title, field: BOARD_FIELD.find(([k]) => title.startsWith(k))?.[1] ?? 'everyday', mine: false, make }));
  const mine = savedBoards().map((x) => ({ title: x.title, field: x.field, mine: true, make: () => JSON.parse(JSON.stringify(x.board)) as Board }));
  return [...mine, ...starters];
}

// ---- start ----------------------------------------------------------------------------------------------------------
loadBlocks();
try { const s = store.get(KEY); if (s) { const b = JSON.parse(s) as Board; if (b.nodes && b.edges) root = b; } } catch { /* start fresh */ }
if (!nodesOf(root).length) root = DEMOS[0]![1]();
engine = new Engine(root, env, memo); refreshLocal();
requestAnimationFrame(() => { fit(); renderAll(); runSoon(); });
// what a browser test drives it by (tests reach the page only through this)
(window as unknown as { nexusNodes: object }).nexusNodes = {
  board: () => root, path: () => path, select: (ids: string[]) => { sel.clear(); for (const id of ids) sel.add(id); renderInspector(true); draw(); },
  at: (id: string, port?: string, side: 'in' | 'out' = 'out') => { const gg = geo(id), q = port ? (side === 'in' ? gg.ins : gg.outs).find((x) => x.p.name === port) : null; const wx = q ? (side === 'in' ? gg.x : gg.x + gg.w) : gg.x + gg.w / 2, wy = q ? q.y : gg.y + HEAD / 2, r = cv.getBoundingClientRect(); return [wx * view.k + view.ox + r.left, wy * view.k + view.oy + r.top]; },
  state: (id: string) => curEngine()?.state.get(id), settled: () => !running,
};

// ---- hosted: the same board on the forge's wall (src/nexus/view/nodes-wall.ts) ----------------------------------------
let wallActive = false;
export interface WallInput { name: string; label: string; unit?: string; value: string; number: boolean; wired: boolean; choices?: string[] }
/** What the forge drives the board by, and hears from it. Points are in the canvas's CSS pixels. */
export const wall = {
  canvas: cv,
  /** Hosted and up: drawn; put away, it draws nothing (a 3D view turning by itself would otherwise draw every frame). */
  get active(): boolean { return wallActive; }, set active(v: boolean) { wallActive = v; if (v) draw(); },
  /** Drawn again: the forge's texture of it is out of date. */
  painted: null as null | (() => void),
  /** Something to say (a refused wire, what a cut took). */
  said: null as null | ((s: string, bad: boolean) => void),
  /** What is chosen, or the board, changed. */
  changed: null as null | (() => void),
  down: (x: number, y: number) => pointerDown({ x, y }, 901), move: (x: number, y: number) => pointerMove({ x, y }, 901), up: (x: number, y: number) => pointerUp({ x, y }, 901),
  fit, tidy: () => { edit((b) => { tidy(b); }); fit(); }, undo: doUndo, redo: doRedo, heat: toggleHeat,
  zoom: (f: number) => zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, f),
  up1: () => { if (path.length) up(path.length - 1); },
  demos: () => DEMOS.map(([n]) => n),
  demo: (i: number) => { const d = DEMOS[((i % DEMOS.length) + DEMOS.length) % DEMOS.length]!; pushUndo(); useBoard(d[1]()); save(); fit(); runSoon(); renderAll(); return d[0]; },
  add: (blockId: string) => addBlock(blockId),
  title: () => [root.title || 'Board', ...path.map((g0, i) => { let b = root; for (const x of path.slice(0, i)) b = b.nodes[x]!.inner!; return b.nodes[g0]?.label || 'Group'; })].join(' › '),
  /** The block chosen, with each input you may set (those not wired), as it stands. */
  chosen(): { id: string; label: string; says: string; inputs: WallInput[]; group: boolean } | null {
    if (sel.size !== 1) return null; const id = [...sel][0]!, n = cur().nodes[id]; if (!n) return null; const d = blockOf(n), into = local.wiresInto(id);
    const inputs = portsFor(id).inputs.map((q) => { const v = n.set?.[q.name] ?? q.default, wired = into.some((e) => e.in === q.name); return { name: q.name, label: q.label ?? q.name, ...(q.unit ? { unit: q.unit } : {}), value: wired ? 'wired' : v === undefined ? '—' : show(typeof v === 'string' && q.type === 'number' ? readQuantity(v, q.unit) : v, q.unit), number: (q.type === 'number' || q.type === 'integer') && !q.choices?.length, wired, ...(q.choices?.length ? { choices: q.choices } : {}) }; });
    const st = d?.settings?.find((x) => x.type === 'quantity' || x.type === 'number');
    if (st) inputs.unshift({ name: `set:${st.key}`, label: st.label, value: show(typeof n.set?.[st.key] === 'string' ? readQuantity(String(n.set?.[st.key]), String(n.set?.unit ?? '') || undefined) : n.set?.[st.key] ?? st.default, String(n.set?.unit ?? '') || undefined), number: true, wired: false });
    return { id, label: n.label || d?.name || '', says: d?.says ?? '', inputs, group: !!n.inner };
  },
  /** An input of the chosen block made bigger or smaller by a factor (a hand cannot type well): 1.1 is ten percent more. */
  nudge(name: string, f: number): void {
    const c = wall.chosen(); if (!c) return; const n = cur().nodes[c.id]!, set = name.startsWith('set:') ? name.slice(4) : null, key = set ?? name;
    const d = blockOf(n), q = portsFor(c.id).inputs.find((x) => x.name === key), raw = n.set?.[key] ?? q?.default ?? d?.settings?.find((x) => x.key === key)?.default;
    let v = typeof raw === 'number' ? raw : typeof raw === 'string' ? readQuantity(raw, set ? String(n.set?.unit ?? '') || undefined : q?.unit) : NaN;
    if (typeof v !== 'number' || !Number.isFinite(v)) v = 0;
    const next = v === 0 ? (f > 1 ? 1 : -1) : Number((v * f).toPrecision(4));
    edit((b) => { b.nodes[c.id]!.set = { ...(b.nodes[c.id]!.set ?? {}), [key]: next }; }, c.id); draw();
  },
  /** An input with choices of the chosen block set to the next (or, by −1, the one before): a house's plan, a light's state. */
  step(name: string, by: number): string {
    const c = wall.chosen(), q = c?.inputs.find((x) => x.name === name); if (!c || !q?.choices?.length) return '';
    const n = cur().nodes[c.id]!, now = String(n.set?.[name] ?? portsFor(c.id).inputs.find((x) => x.name === name)?.default ?? q.choices[0]);
    const k = q.choices.indexOf(now), next = q.choices[(((k < 0 ? 0 : k + by) % q.choices.length) + q.choices.length) % q.choices.length]!;
    edit((b) => { b.nodes[c.id]!.set = { ...(b.nodes[c.id]!.set ?? {}), [name]: next }; }, c.id); draw(); return next;
  },
  open: () => { const c = wall.chosen(); if (c?.group) enter(c.id); },
  cut: () => { const c = wall.chosen(); if (c) cut(c.id); },
  fold: group,
  shelves: (by: 'domain' | 'ability' | 'kind') => shelves(by),
  /** It ran: what it shows may have changed. */
  ran: null as null | (() => void),
  /** Every thing a "Show in space" node on the board is given, with that node's id. */
  shown(): { key: string; thing: unknown }[] {
    const out: { key: string; thing: unknown }[] = [];
    for (const n of nodesOf(root)) { if (root.nodes[n.id]!.block !== 'space.show') continue; const w = engine.wiresInto(n.id)[0], v = w ? engine.state.get(w.from)?.out?.[w.out!] : undefined; if (v && typeof v === 'object') out.push({ key: n.id, thing: v }); }
    return out;
  },
  /** A node chosen from outside (pressed in the space): the board goes to it. */
  choose(id: string): void {
    if (path.length) up(0);
    let at = id; for (const e of edgesOf(root)) if (e.to === id && isWire(e)) { at = e.from; break; }
    sel.clear(); sel.add(at); const gg = geo(at); view.ox = cv.clientWidth / 2 - (gg.x + gg.w / 2) * view.k; view.oy = cv.clientHeight / 2 - (gg.y + gg.h / 2) * view.k; renderInspector(true); draw();
  },
  /** The clock: where it is, whether it is running, and whether anything on the board moves with it. */
  clock: () => ({ ...clock, moves: moves() }),
  setTime, play(on: boolean): void { clock.playing = on; wall.timed?.(); }, rate(r: number): void { clock.rate = r; wall.timed?.(); }, span(sp: number): void { clock.span = Math.max(1, sp); wall.timed?.(); },
  /** The window of the clock the bar shows: from, to. */
  window: (): [number, number] => { const a = Math.floor(clock.t / clock.span) * clock.span; return [a, a + clock.span]; },
  /** The clock moved. */
  timed: null as null | (() => void),
  /** What the last run worked out anew, and how long each took. */
  lastRun: () => lastRan,
  /** The block a node is, and what goes into it now: each wired input's value, else what it is set to, else its default. */
  inputsOf(id: string): { block: BlockDef | null; inputs: Record<string, unknown>; ports: PortDef[] } {
    const n = cur().nodes[id], d = n ? blockOf(n) : null; if (!n || !d) return { block: null, inputs: {}, ports: [] };
    const e = curEngine(), ports = portsFor(id).inputs, inputs: Record<string, unknown> = {};
    for (const q of ports) {
      const w = e?.wiresInto(id).find((x) => x.in === q.name);
      if (w) { const v = e?.state.get(w.from)?.out?.[w.out!]; if (v !== undefined) inputs[q.name] = v; }
      else if (n.set && q.name in n.set && n.set[q.name] !== '') inputs[q.name] = n.set[q.name];
    }
    return { block: d, inputs, ports };
  },
  /** An input of a node set (a variation chosen from the table). */
  setInput(id: string, name: string, v: unknown): void { if (!cur().nodes[id]) return; edit((b) => { b.nodes[id]!.set = { ...(b.nodes[id]!.set ?? {}), [name]: v }; }, id); renderInspector(true); draw(); },
  /** The node chosen on the board (one), if any. */
  selected: (): string | null => (sel.size === 1 ? [...sel][0]! : null),
  /** The board's title. */
  boardTitle: () => root.title || 'Board',
  board: () => root,
  /** The board's history: how many states, and which it is at; and going to any of them. */
  history: () => ({ count: undo.length + redo.length + 1, at: undo.length, saved: undo.length ? 'changes' : 'start' }),
  goto(i: number): void { const k = Math.max(0, Math.min(undo.length + redo.length, Math.round(i))); while (undo.length > k) doUndo(); while (undo.length < k && redo.length) doRedo(); },
};
