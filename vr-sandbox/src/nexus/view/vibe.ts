// The phone page (view/vibe.html): say what to build and see it built. The 3D view fills the screen; a chat sheet at its
// foot sends what is said to Claude through the relay (`npm run app`: the key stays under Node, never on the page),
// which builds with the node system's own tools, the pieces of common.ts and the operations of room.ts; each step comes
// back as it is taken, with the board as it stands, and is run and drawn here at once, so the thing grows as Claude
// works. The chips open the piece boards at once, with no AI and no network (they work where the page is served
// without its relay, as on GitHub Pages). The board is kept where the dashboard keeps it, so "Full board" opens it
// there, every node's settings and wires.

import * as THREE from 'three';
import '../seeds';
import { Dock3D } from './dock3d';
import type { Shown } from './space3d';
import { Engine, SHARED, blockOf, emptyBoard, groupBlock, type Env } from '../dataflow';
import { edgesOf, nodesOf, type Board } from '../boards';
import { starterBoards } from '../starters';
import { boundsOfAll, isAssembly, isPart, massOfAll, placedCount } from '../assembly';
import { register, show } from '../blocks';
import { gateOf, type AgentBlock, type AgentRun } from '../agent';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** An answer's light markdown (bold, code, line breaks) as html. */
const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

// ---- kept where the dashboard keeps it (view/nodes.ts): the board, the blocks folded and saved, and this chat --------
const KEY = 'nexus.nodeboard.v1', BLOCKS_KEY = 'nexus.nodeblocks.v1', CHAT_KEY = 'nexus.vibe.chat.v1';
const store = { get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }, set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* a private window: kept for this visit only */ } } };
const savedBlocks = (): AgentBlock[] => { try { return JSON.parse(store.get(BLOCKS_KEY) ?? '[]') as AgentBlock[]; } catch { return []; } };
for (const s of savedBlocks()) { try { register(groupBlock(s.graph, { id: s.id, name: s.name, says: s.says, domains: s.domains, by: 'you' })); } catch { /* one that no longer opens is left out */ } }

// ---- code blocks run off the page, as on the dashboard ---------------------------------------------------------------
let worker: Worker | null = null, seq = 0;
const waiting = new Map<number, { ok: (v: unknown) => void; no: (e: Error) => void; timer: number }>();
const env: Env = {
  code: (lang, code, inputs) => new Promise((ok, no) => {
    if (!worker) { worker = new Worker(new URL('./code-worker.ts', import.meta.url), { type: 'module' }); worker.onmessage = (e: MessageEvent<{ id: number; value?: unknown; error?: string }>) => { const w = waiting.get(e.data.id); if (!w) return; waiting.delete(e.data.id); clearTimeout(w.timer); if (e.data.error) w.no(new Error(e.data.error)); else w.ok(e.data.value); }; }
    const id = ++seq, w = worker, timer = window.setTimeout(() => { waiting.delete(id); w.terminate(); worker = null; no(new Error('stopped after 8 s: it ran too long')); }, 8000);
    waiting.set(id, { ok, no, timer }); w.postMessage({ id, lang, code, facts: {}, input: '', vars: inputs });
  }),
  ai: async () => { throw new Error('a node that asks Claude itself runs on the full board; here Claude builds the board'); },
};

// ---- the 3D view and the board it shows --------------------------------------------------------------------------------
const dock = new Dock3D($('view'), () => {});
// (on a phone the view ends a little under the chat sheet's rounded top, so what is fitted is seen whole above it)
new ResizeObserver(() => { document.documentElement.style.setProperty('--under', `${Math.max(0, $('sheet').offsetHeight - 22)}px`); }).observe($('sheet'));
let board: Board = emptyBoard('Nothing yet'), engine = new Engine(board, env, SHARED), runs = 0;
try { const s = store.get(KEY); if (s) { const b = JSON.parse(s) as Board; if (b.nodes && b.edges) board = b; } } catch { /* start empty */ }

/** The board run and what its "Show in space" nodes are given drawn; a later run started meanwhile wins. */
async function use(b: Board, keep = true): Promise<void> {
  const mine = ++runs; board = b; engine = new Engine(b, env, SHARED);
  const t0 = performance.now(); let failed = 0;
  try { const r = await engine.run(); failed = r.failed; } catch (e) { say(`It could not run: ${(e as Error).message}`, true); }
  if (mine !== runs) return;
  const things: Shown[] = [], thing = (v: unknown): v is Shown['thing'] => !!v && typeof v === 'object' && (isAssembly(v) || isPart(v));
  for (const n of nodesOf(b)) { if (b.nodes[n.id]!.block !== 'space.show') continue; const w = engine.wiresInto(n.id)[0], v = w ? engine.state.get(w.from)?.out?.[w.out!] : undefined; if (thing(v)) things.push({ key: n.id, thing: v }); }
  // (a board with no "Show in space" node shows what it ends with: the first thing given by each node nothing builds on;
  // a node whose block goes on to the next operation is a stage of what that one makes, and is drawn inside it)
  if (!things.length) { const feeds = new Set(edgesOf(b).map((e) => e.from));
    for (const n of nodesOf(b)) { if (feeds.has(n.id)) continue; const o = engine.state.get(n.id)?.out ?? {};
      // (its drawn output first: an operation's `block` has a name too, and is not drawn)
      const v = [o.thing, o.assembly, o.part, ...Object.entries(o).filter(([k]) => k !== 'block').map(([, x]) => x)].find(thing); if (v) things.push({ key: n.id, thing: v }); } }
  dock.show(things, b.title ?? '');
  $('title').textContent = b.title ?? '';
  $('empty').style.display = things.length || nodesOf(b).length ? 'none' : '';
  let pieces = 0, mass = 0; const box = new THREE.Box3();
  for (const s of things) { pieces += placedCount(s.thing); mass += massOfAll(s.thing); box.union(boundsOfAll(s.thing)); }
  const size = box.isEmpty() ? null : box.getSize(new THREE.Vector3());
  $('stat').innerHTML = things.length ? `<b>${pieces.toLocaleString()}</b> piece${pieces === 1 ? '' : 's'} · <b>${esc(show(mass, 'kg'))}</b>${size ? ` · ${esc(show(size.x, 'm'))} × ${esc(show(size.y, 'm'))} × ${esc(show(size.z, 'm'))}` : ''} · ${nodesOf(b).length} nodes${failed ? ` · <span style="color:var(--bad)">${failed} failed</span>` : ''} · ran in ${((performance.now() - t0) / 1000).toFixed(1)} s`
    : nodesOf(b).length ? `${nodesOf(b).length} nodes, nothing shown yet${failed ? ` · <span style="color:var(--bad)">${failed} failed</span>` : ''}` : '';
  if (keep) store.set(KEY, JSON.stringify(b));
  if ($('board').classList.contains('on')) listNodes();
}

// ---- the board as a list (a phone is too small for wires): each node, how it ran, what it gave --------------------------
function listNodes(): void {
  $('nodes').innerHTML = nodesOf(board).map((n) => { const x = board.nodes[n.id]!, d = blockOf(x), st = engine.state.get(n.id), status = st?.status ?? 'waiting';
    const outs = Object.entries(st?.out ?? {}).filter(([k, v]) => k !== 'says' && (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')).slice(0, 3).map(([k, v]) => `${esc(k)} ${esc(show(v).slice(0, 40))}`).join(' · ');
    return `<div class="node ${status}"><div class="h"><i></i><b>${esc(x.label || d?.name || n.id)}</b><span>${esc(d?.name ?? (x.inner ? 'a group' : ''))}</span></div>${st?.error ? `<div class="e">${esc(st.error.slice(0, 200))}</div>` : outs ? `<div class="o">${outs}</div>` : ''}</div>`; }).join('') || '<p style="color:var(--dim)">No nodes yet: ask for something, or tap a piece.</p>';
}
$('showBoard').onclick = () => { listNodes(); $('board').classList.add('on'); };
$('hideBoard').onclick = () => $('board').classList.remove('on');
$('toFull').onclick = () => { store.set(KEY, JSON.stringify(board)); location.href = './index.html?full'; };
$('fit').onclick = () => dock.fit();
$('cut').onclick = () => { const a = dock.nextSection(); $('cut').textContent = a ? `Cut ${a}` : 'Cut'; };

// (a tap on a piece names it; a drag turns the view, a pinch zooms)
let downAt: [number, number] | null = null;
dock.canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
dock.canvas.addEventListener('pointerup', (e) => { if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return; downAt = null;
  const ray = dock.rayAt(e.clientX, e.clientY), h = dock.view.pieceAt(new THREE.Raycaster(ray.origin, ray.direction)), p = $('picked');
  if (!h) { p.style.display = 'none'; return; }
  const kind = h.leaf?.mat ? ` · ${h.leaf.mat}` : ''; p.innerHTML = `<b>${esc(h.name)}</b>${esc(kind)}`; p.style.display = 'block'; clearTimeout(pickT); pickT = window.setTimeout(() => { p.style.display = 'none'; }, 3500); });
let pickT = 0;

// ---- the chat ----------------------------------------------------------------------------------------------------------
interface Said { who: 'me' | 'ai'; html: string; bad?: boolean }
let chat: Said[] = []; try { chat = JSON.parse(store.get(CHAT_KEY) ?? '[]') as Said[]; } catch { chat = []; }
function drawChat(): void { $('msgs').innerHTML = chat.slice(-30).map((m) => `<div class="msg ${m.who}${m.bad ? ' bad' : ''}">${m.html}</div>`).join(''); $('msgs').scrollTop = $('msgs').scrollHeight; }
function say(text: string, bad = false): void { chat.push({ who: 'ai', html: md(text), ...(bad ? { bad: true } : {}) }); keepChat(); drawChat(); }
const keepChat = () => store.set(CHAT_KEY, JSON.stringify(chat.slice(-30)));
$('grab').onclick = () => $('sheet').classList.toggle('low');

/** What was asked and answered before, short: sent with a request, so "make it longer" knows what "it" is. The board
 *  sent with it is what came of them. */
function before(): string {
  const turns = chat.filter((m) => !m.bad).slice(-6).map((m) => `${m.who === 'me' ? 'Asked' : 'Answered'}: ${m.html.replace(/<details>[^]*?<\/details>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)}`);
  return turns.length ? `Before this, on this board (the board sent is what came of it):\n${turns.join('\n')}\n\nNow: ` : '';
}

const STEP_SAYS: Record<string, string> = { find: 'searched the library', card: 'read a block', build: 'built a board and ran it', open: 'opened a starter board', change: 'changed the board and ran it', read: 'read an output', fold: 'folded nodes into one block', docs: 'read the docs' };
let busy = false;
async function ask(q: string): Promise<void> {
  if (busy || !q.trim()) return; busy = true; ($('go') as HTMLButtonElement).disabled = true; $('sheet').classList.remove('low');
  const request = before() + q.trim();
  chat.push({ who: 'me', html: esc(q.trim()) }); keepChat();
  const live: Said = { who: 'ai', html: '' }; chat.push(live);
  const steps: string[] = [], t0 = Date.now(), was = board; let note = 'Claude is reading what you asked', lastBoard: Board | null = null;
  const paint = () => { live.html = `<div class="live"><span class="dots">${esc(note)}</span> · ${Math.round((Date.now() - t0) / 1000)} s</div>${steps.length ? `<div class="steps">${steps.slice(-6).join('')}</div>` : ''}`; drawChat(); };
  const tick = window.setInterval(paint, 1000); paint();
  try {
    const res = await fetch('./api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request, board: nodesOf(board).length ? board : undefined, blocks: savedBlocks(), stream: true }) });
    if (res.status === 404 || res.status === 405) throw new Error('this copy of the app is served without its AI relay (it holds no key, and a page never does). The pieces below open without it; to talk to Claude, open the app the session serves (npm run app).');
    if (!res.ok || !res.body) throw new Error(`the relay answered ${res.status}`);
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '', done: AgentRun | null = null;
    for (;;) {
      const { value, done: end } = await reader.read(); if (value) buf += dec.decode(value, { stream: true });
      let k; while ((k = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1); if (!line) continue;
        const o = JSON.parse(line) as { step?: { tool: string; result: string; failed?: true }; board?: Board; say?: string; done?: AgentRun; error?: string; alive?: number };
        if (o.error) throw new Error(o.error);
        if (o.say) note = o.say.split('\n')[0]!.slice(0, 120);
        if (o.step) { steps.push(`<span${o.step.failed ? ' class="f"' : ''}>${o.step.failed ? '✕' : '✓'} ${esc(STEP_SAYS[o.step.tool] ?? o.step.tool)}${o.step.failed ? `: ${esc(o.step.result.slice(0, 90))}` : ''}</span>`); note = `${steps.length} step${steps.length === 1 ? '' : 's'} so far`; }
        // (the board as it stands after a build or a change: drawn now, so the thing grows while Claude works)
        if (o.board) { lastBoard = o.board; void use(o.board, false); }
        if (o.done) done = o.done; }
      if (end) break;
    }
    if (!done) throw new Error('the relay stopped before the run ended');
    const g = gateOf(done.certificates), n = done.steps.length, secs = Math.round((Date.now() - t0) / 1000);
    for (const x of done.made ?? []) { try { register(groupBlock(x.graph, { id: x.id, name: x.name, says: x.says, domains: x.domains, by: 'you' })); const all = savedBlocks().filter((s) => s.id !== x.id); all.push(x); store.set(BLOCKS_KEY, JSON.stringify(all)); } catch { /* said below if it matters */ } }
    // (on a phone, the answer's first paragraph; the rest a press away)
    const answer = (done.answer || done.stopped || '(no answer: it stopped)').trim(), cut = answer.search(/\n\s*\n/), head = cut > 0 ? answer.slice(0, cut) : answer, rest = cut > 0 ? answer.slice(cut).trim() : '';
    live.html = `${md(head)}${rest ? `<details><summary>More</summary>${md(rest)}</details>` : ''}${done.made?.length ? `<br><b>Saved as a node of its own:</b> ${done.made.map((x) => esc(x.name)).join(', ')}` : ''}<details><summary>${n} step${n === 1 ? '' : 's'} · ${secs} s${done.checked ? ` · checked: ${esc(done.checked.trim().split('\n').pop()?.slice(0, 40) ?? '')}` : ''}</summary>${done.steps.map((s, i) => `${i + 1}. ${esc(s.tool)}: ${esc(s.result.slice(0, 140))}`).join('<br>')}</details>`;
    if (g.take) await use(done.board); else { live.bad = true; live.html += '<br>The board was not taken: the kernel refused one of its certificates as wrong, so the board is as it was.'; await use(was); }
  } catch (e) { live.bad = true; live.html = md(`Could not: ${(e as Error).message}${lastBoard ? '\n\nWhat it had built when it stopped is shown and kept.' : ''}`); if (lastBoard) await use(lastBoard); }
  finally { clearInterval(tick); busy = false; ($('go') as HTMLButtonElement).disabled = false; keepChat(); drawChat(); }
}
const qEl = $<HTMLTextAreaElement>('q');
const grow = () => { qEl.style.height = 'auto'; qEl.style.height = `${Math.min(120, qEl.scrollHeight)}px`; };
qEl.addEventListener('input', grow);
qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const q = qEl.value; qEl.value = ''; grow(); void ask(q); } });
$('go').onclick = () => { const q = qEl.value; qEl.value = ''; grow(); void ask(q); };

// ---- the chips: piece boards opened at once (no AI, no network), and things to ask for ---------------------------------
const OPEN: [string, string][] = [
  ['Bolts & nuts', 'Common pieces: bolts'], ['Wire & LEDs', 'Common pieces: copper wire'], ['Matings', 'Matings: two plates bolted'],
  ['Angles & beams', 'Common pieces: angles'], ['DC motor', 'Built from pieces: a small DC motor'], ['Switch box', 'Built from pieces: a switch box'],
  ['Starter motor', 'Nothing can overlap: a starter motor'],
];
const ASK = [
  'Two 3 mm aluminium plates bolted with four M5 bolts',
  'A red 5 mm LED and a push button on a small board',
  'A copper winding of three layers on a 20 mm bobbin',
  'A steel angle bolted to a plate with two M8 bolts',
  'A 22 mm copper pipe with a coupling at each end',
];
const chips = $('chips');
for (const [label, title] of OPEN) { const b = document.createElement('button'); b.className = 'chip open'; b.innerHTML = `<span class="k">▦</span>${esc(label)}`; b.title = 'Open it now (no AI needed)';
  b.onclick = () => { const hit = starterBoards().find(([t]) => t.startsWith(title)); if (!hit) { say(`No board "${title}" in this copy of the app.`, true); return; } chat.push({ who: 'me', html: `<span class="k">▦</span> ${esc(label)}` }); say(`Opened "${hit[0]}". Ask me to change it: bigger, another material, more of them.`); void use(hit[1]()); };
  chips.appendChild(b); }
for (const q of ASK) { const b = document.createElement('button'); b.className = 'chip ask'; b.innerHTML = `<span class="k">✦</span>${esc(q)}`; b.title = 'Ask Claude to build this'; b.onclick = () => void ask(q); chips.appendChild(b); }

drawChat();
void use(board);
// what a browser test drives it by
(window as unknown as { nexusVibe: object }).nexusVibe = { board: () => board, ask, open: (title: string) => { const hit = starterBoards().find(([t]) => t.startsWith(title)); return hit ? use(hit[1]()) : Promise.reject(new Error(`no board ${title}`)); }, busy: () => busy };
