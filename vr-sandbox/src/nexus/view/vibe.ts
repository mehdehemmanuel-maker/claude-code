// The phone page (view/vibe.html): say what to build and see it built. The 3D view fills the screen; a sheet at its foot
// builds in one of three ways (decision 0025), remembered per browser:
//   By hand: a palette of the library's pieces (piece.*), each setting a small field, joined to what is there by an
//     operation the room offers (onto a face, through a line it offers, over a shaft, into a room, stacked beside): a plan
//     of nodes and wires, run on the page at once by the AI's own tools (agent.ts runPlan). No AI, nothing sent.
//   Assist: one cheap call through the relay (agentPlan: no tool loop, no second model) answers with a plan in the same
//     form, shown here to be changed; Build runs it on the page; what fails is asked again in one tap, those lines only.
//   Auto: the agent's own loop (agentBuild), streamed: each step comes back as it is taken, with the board as it stands,
//     and is drawn at once, so the thing grows as Claude works; the second model's check only when asked for.
// Every run's tokens are shown on its message, and their running total is kept in this browser. The relay (`npm run
// app`) keeps the key under Node, never on the page; the chips open the piece boards with no AI and no network (they work
// where the page is served without its relay, as on GitHub Pages). The board is kept where the dashboard keeps it, so
// "Full board" opens it there, every node's settings and wires.

import * as THREE from 'three';
import '../seeds';
import { Dock3D } from './dock3d';
import type { Shown } from './space3d';
import { Engine, SHARED, blockOf, emptyBoard, groupBlock, type Env } from '../dataflow';
import { edgesOf, nodesOf, type Board } from '../boards';
import { starterBoards } from '../starters';
import { boundsOfAll, isAssembly, isPart, massOfAll, placedCount } from '../assembly';
import { LIBRARY, block, defaultsOf, register, show, type BlockDef, type SettingDef } from '../blocks';
import { gateOf, joinPlan, runPlan, type AgentBlock, type AgentPlan, type AgentRun, type PlanRun } from '../agent';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** An answer's light markdown (bold, code, line breaks) as html. */
const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

// ---- kept where the dashboard keeps it (view/nodes.ts): the board, the blocks folded and saved, and this chat --------
const KEY = 'nexus.nodeboard.v1', BLOCKS_KEY = 'nexus.nodeblocks.v1', CHAT_KEY = 'nexus.vibe.chat.v1', MODE_KEY = 'nexus.vibe.mode.v1', TOK_KEY = 'nexus.vibe.tokens.v1', CHECK_KEY = 'nexus.vibe.check.v1';
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
/** The boards before each step (by hand, a plan built, a run taken, a board opened): Undo goes back one. */
const history: Board[] = [];
const step = async (b: Board) => { history.push(structuredClone(board)); if (history.length > 30) history.shift(); await use(b); requestAnimationFrame(() => dock.fit()); };

/** The board run and what its "Show in space" nodes are given drawn; a later run started meanwhile wins. */
async function use(b: Board, keep = true): Promise<void> {
  const mine = ++runs; board = b; engine = new Engine(b, env, SHARED);
  const t0 = performance.now(); let failed = 0;
  try { const r = await engine.run(); failed = r.failed; } catch (e) { say(`It could not run: ${(e as Error).message}`, true); }
  if (mine !== runs) return;
  const things: Shown[] = [], thing = (v: unknown): v is Shown['thing'] => !!v && typeof v === 'object' && (isAssembly(v) || isPart(v));
  for (const n of nodesOf(b)) { if (b.nodes[n.id]!.block !== 'space.show') continue; const w = engine.wiresInto(n.id)[0], v = w ? engine.state.get(w.from)?.out?.[w.out!] : undefined; if (thing(v)) things.push({ key: n.id, thing: v }); }
  // (a board with no "Show in space" node shows what it ends with: the first thing given by each node nothing builds on;
  // a node whose block goes on to the next operation is a stage of what that one makes, and is drawn inside it. Only a
  // node that gives a thing builds on another: a joint read by a measure and an assert is still what the board ends
  // with (it was not drawn, so a board that held its mass showed nothing: 2026-11-05, decision 0025))
  if (!things.length) { const gives = (id: string) => Object.entries(engine.state.get(id)?.out ?? {}).some(([k, x]) => k !== 'block' && thing(x));
    const feeds = new Set(edgesOf(b).filter((e) => gives(e.to)).map((e) => e.from));
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
  ($('undo') as HTMLButtonElement).disabled = !history.length;
  if (mode === 'hand') drawHand();
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
$('undo').onclick = () => { const b = history.pop(); if (!b) return; say('Undone: the board as it was before the last step.'); void use(b); };
$('fresh').onclick = () => { if (busy) return; history.push(structuredClone(board)); chat = []; keepChat(); drawChat(); plan = null; drawPlan(); void use(emptyBoard('Nothing yet')); };

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

/** What was asked and answered before, short: sent with a request, so "make it longer" knows what "it" is (the board is
 *  sent with it, and the relay lists its nodes to the model). */
function before(): string {
  const turns = chat.filter((m) => !m.bad).slice(-4).map((m) => `${m.who === 'me' ? 'Asked' : 'Answered'}: ${m.html.replace(/<details>[^]*?<\/details>/g, '').replace(/<div class="tok">[^]*?<\/div>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)}`);
  return turns.length ? `Before this, on this board:\n${turns.join('\n')}\n\nNow: ` : '';
}

// ---- tokens: each run's on its message, their total kept in this browser ------------------------------------------------
type Tok = AgentRun['tokens'];
const kilo = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const tokLine = (t: Tok) => `<div class="tok">tokens: ${t.in.toLocaleString()} in · ${t.written.toLocaleString()} written to the cache · ${t.cached.toLocaleString()} read from it · ${t.out.toLocaleString()} out</div>`;
let total: Tok & { runs: number } = { in: 0, out: 0, cached: 0, written: 0, runs: 0 };
try { total = { ...total, ...(JSON.parse(store.get(TOK_KEY) ?? '{}') as Partial<typeof total>) }; } catch { /* from nothing */ }
function drawTok(): void { $('tok').innerHTML = total.runs ? `Σ ${kilo(total.in + total.written)} in · ${kilo(total.cached)} cached<br>${kilo(total.out)} out · ${total.runs} run${total.runs === 1 ? '' : 's'}` : 'no tokens used'; }
function spent(t: Tok): void { total = { in: total.in + t.in, out: total.out + t.out, cached: total.cached + t.cached, written: total.written + t.written, runs: total.runs + 1 }; store.set(TOK_KEY, JSON.stringify(total)); drawTok(); }
$('tok').onclick = () => { if (!total.runs || !confirm('Set the token count back to nothing?')) return; total = { in: 0, out: 0, cached: 0, written: 0, runs: 0 }; store.set(TOK_KEY, JSON.stringify(total)); drawTok(); };

// ---- the three ways ----------------------------------------------------------------------------------------------------
type Mode = 'hand' | 'assist' | 'auto';
let mode: Mode = (['hand', 'assist', 'auto'] as const).find((m) => m === store.get(MODE_KEY)) ?? 'auto';
const checkBox = $<HTMLInputElement>('check'); checkBox.checked = store.get(CHECK_KEY) === '1'; checkBox.onchange = () => store.set(CHECK_KEY, checkBox.checked ? '1' : '0');
function setMode(m: Mode): void {
  mode = m; store.set(MODE_KEY, m);
  for (const b of document.querySelectorAll<HTMLButtonElement>('#modes .seg button')) b.classList.toggle('on', b.dataset.mode === m);
  $('checkL').style.display = m === 'auto' ? '' : 'none';
  $('ask').style.display = m === 'hand' ? 'none' : '';
  $('hand').classList.toggle('on', m === 'hand'); if (m === 'hand') drawHand();
  $('plan').classList.toggle('on', m === 'assist' && !!plan);
  $<HTMLTextAreaElement>('q').placeholder = m === 'assist' ? 'Describe it: one call plans it, you check it, then Build' : 'Describe what to build…';
  drawChips();
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#modes .seg button')) b.onclick = () => setMode(b.dataset.mode as Mode);

// ---- a block's settings as small fields (read from the library), and read back ------------------------------------------
const fieldOf = (id: string, sd: SettingDef, v: unknown, choices?: string[]) => {
  const c = choices ?? sd.choices, val = v ?? sd.default;
  const input = c ? `<select id="${id}">${c.map((x) => `<option${String(x) === String(val) ? ' selected' : ''}>${esc(String(x))}</option>`).join('')}</select>`
    : sd.type === 'boolean' ? `<input type="checkbox" id="${id}"${val ? ' checked' : ''} style="width:auto" />`
    : `<input id="${id}" ${sd.type === 'number' ? 'type="number" step="any" inputmode="decimal"' : ''} value="${esc(String(val ?? ''))}" />`;
  return `<label class="f">${esc(sd.label)}${input}</label>`; };
/** The settings read back from their fields: only those not the block's own default. */
function readFields(prefix: string, d: BlockDef, extra: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {}, def = defaultsOf(d);
  for (const sd of d.settings ?? []) { const f = document.getElementById(`${prefix}${sd.key}`) as HTMLInputElement | HTMLSelectElement | null; if (!f) continue;
    const v = sd.type === 'boolean' ? (f as HTMLInputElement).checked : sd.type === 'number' ? Number(f.value) : f.value;
    if (JSON.stringify(v) !== JSON.stringify(def[sd.key])) out[sd.key] = v; }
  for (const k of extra) { const f = document.getElementById(`${prefix}${k}`) as HTMLInputElement | null; if (f && f.value.trim() !== '') out[k] = Number.isFinite(Number(f.value)) && f.value.trim() !== '' ? Number(f.value) : f.value; }
  return out;
}

// ---- by hand: a piece from the palette, joined by an operation the room offers ------------------------------------------
/** The operations a new piece joins what is there by, each with the setting that names a line or a room it offers. */
const JOINS: { op: string; says: string; names?: 'line' | 'room' }[] = [
  { op: 'room.onto', says: 'Onto a face' }, { op: 'room.through', says: 'Through a hole or line', names: 'line' }, { op: 'room.over', says: 'Over a shaft', names: 'line' },
  { op: 'room.into', says: 'Into a room', names: 'room' }, { op: 'room.stack', says: 'Stacked beside' },
];
const pieces = (): BlockDef[] => [...LIBRARY.values()].filter((d) => d.id.startsWith('piece.') || d.id === 'room.make').sort((a, b) => a.name.localeCompare(b.name));
let handPiece: string | null = null, handJoin = 'room.onto', handHost = '';
/** What is there to join to: each node nothing builds on that gives a block, with what it offers. */
function endsOf(): { id: string; name: string; offers: string[] }[] {
  const feeds = new Set(edgesOf(board).map((e) => e.from));
  return nodesOf(board).filter((n) => !feeds.has(n.id)).flatMap((n) => { const o = engine.state.get(n.id)?.out; if (!o || !o.block) return [];
    const x = board.nodes[n.id]!; return [{ id: n.id, name: x.label || blockOf(x)?.name || n.id, offers: Array.isArray(o.offers) ? (o.offers as unknown[]).map(String) : [] }]; });
}
function drawHand(): void {
  const el = $('hand'); if (mode !== 'hand') return;
  if (!handPiece) { el.innerHTML = `<h4><span>${nodesOf(board).length ? 'Tap a piece below to add it to what is there' : 'Tap a piece below to start'}</span></h4>`; return; }
  const d = block(handPiece)!, ends = endsOf(); if (!ends.some((e) => e.id === handHost)) handHost = ends.at(-1)?.id ?? '';
  const host = ends.find((e) => e.id === handHost), j = JOINS.find((x) => x.op === handJoin)!, jd = block(j.op)!;
  const lines = (host?.offers ?? []).filter((o) => (j.names === 'room' ? !/\/(axis|holes)$/.test(o) : /\/(axis|holes)$/.test(o) || !/cavity/.test(o)));
  const joinFields = ends.length ? `<div class="row"><label class="f" style="flex:1">Joined by<select id="hj">${JOINS.map((x) => `<option value="${x.op}"${x.op === handJoin ? ' selected' : ''}>${esc(x.says)}</option>`).join('')}</select></label><label class="f" style="flex:1">to<select id="hh">${ends.map((e) => `<option value="${esc(e.id)}"${e.id === handHost ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label></div>
    <div class="fields">${(jd.settings ?? []).filter((sd) => sd.key !== 'name').map((sd) => fieldOf(`ho_${sd.key}`, sd, undefined, sd.key === j.names ? (lines.length ? lines : ['']) : undefined)).join('')}</div>` : '<i style="color:var(--dim);font-size:12px">The first piece: it stands alone. The next is joined to it.</i>';
  el.innerHTML = `<h4><span>${esc(d.name)}</span><button id="hx" title="Close">✕</button></h4><div class="fields">${(d.settings ?? []).map((sd) => fieldOf(`hp_${sd.key}`, sd, undefined)).join('')}</div>${joinFields}
    <div class="row"><button id="hadd" class="hot">Add it</button><button id="hundo"${history.length ? '' : ' disabled'}>↶ Undo</button></div>`;
  $('hx').onclick = () => { handPiece = null; drawHand(); };
  if (ends.length) { $<HTMLSelectElement>('hj').onchange = (e) => { handJoin = (e.target as HTMLSelectElement).value; drawHand(); }; $<HTMLSelectElement>('hh').onchange = (e) => { handHost = (e.target as HTMLSelectElement).value; drawHand(); }; }
  $('hundo').onclick = () => $('undo').click();
  $('hadd').onclick = () => void handAdd();
}
/** The piece as its fields say, joined as they say: a plan, run by the AI's own tools on the page. */
async function handAdd(): Promise<void> {
  if (!handPiece || busy) return; const d = block(handPiece)!, ends = endsOf();
  const piece = { b: d.id, s: readFields('hp_', d) }, jd = block(handJoin)!;
  const p: AgentPlan = joinPlan(board, piece, ends.length && handHost ? { op: handJoin, s: readFields('ho_', jd), host: handHost } : undefined);
  if (!nodesOf(board).length) p.says = `By hand: ${d.name.toLowerCase()}`;
  await runShown(p, `<span class="k">✋</span> ${esc(p.says)}`);
}
/** A plan run on the board by the tools, the board taken (so Undo can go back) and what failed said. */
async function runShown(p: AgentPlan, asked: string): Promise<string[]> {
  busy = true; chat.push({ who: 'me', html: asked }); keepChat(); drawChat();
  try { const r = await runPlan(p, board, savedBlocks());
    // (a board a plan starts is named for what it makes)
    if (p.tool === 'build' || !nodesOf(board).length) r.board.title = (p.says || 'Built here').replace(/^./, (c) => c.toUpperCase()).slice(0, 80);
    await step(r.board);
    const n = Object.keys(p.input.nodes ?? p.input.add ?? {}).length;
    if (r.failing.length) say(`Built, but these failed or were refused:\n${r.failing.slice(0, 6).map((l) => `• ${l}`).join('\n')}`, true);
    else say(`${p.tool === 'build' ? 'Built' : 'Changed'}: ${n} node${n === 1 ? '' : 's'}${p.input.wires?.length ? `, ${p.input.wires.length} wire${p.input.wires.length === 1 ? '' : 's'}` : ''}, nothing failed. No tokens: run here.`);
    return r.failing; }
  catch (e) { say(`Could not: ${(e as Error).message}`, true); return [(e as Error).message]; }
  finally { busy = false; }
}

// ---- Assist: one call, a plan shown to be changed, then built here --------------------------------------------------------
let plan: { asked: string; plan: AgentPlan; failing: string[]; built: boolean } | null = null;
function drawPlan(): void {
  const el = $('plan'); el.classList.toggle('on', mode === 'assist' && !!plan); if (!plan) { el.innerHTML = ''; return; }
  const p = plan.plan, nodes = p.input.nodes ?? p.input.add ?? {};
  el.innerHTML = `<h4><span>${p.tool === 'build' ? 'A new board' : 'A change'}: ${esc(p.says || `${Object.keys(nodes).length} nodes`)}</span>${plan.built ? (plan.failing.length ? `<button id="pagain" class="hot">Ask again: ${plan.failing.length} failed</button>` : '') : '<button id="pbuild" class="hot">Build it</button>'}<button id="px" title="Put it away">✕</button></h4>
    ${Object.entries(nodes).map(([nm, n]) => { const d = block(n.b); if (!d) return `<div class="pn"><b>${esc(nm)}</b> <i>no block "${esc(n.b)}" in this library: it will be refused</i></div>`;
      const keys = new Set((d.settings ?? []).map((s) => s.key)), extra = Object.keys(n.s ?? {}).filter((k) => !keys.has(k));
      return `<div class="pn"><b>${esc(nm)}</b> <i>${esc(d.name)}</i><div class="fields">${(d.settings ?? []).filter((sd) => sd.key in (n.s ?? {}) || !['name'].includes(sd.key)).map((sd) => fieldOf(`pp_${nm}_${sd.key}`, sd, n.s?.[sd.key])).join('')}${extra.map((k) => `<label class="f">${esc(k)}<input id="pp_${esc(nm)}_${esc(k)}" value="${esc(String(n.s![k]))}" /></label>`).join('')}</div></div>`; }).join('')}
    ${p.input.set ? `<div class="wires">set: ${esc(JSON.stringify(p.input.set))}</div>` : ''}${p.input.remove?.length ? `<div class="wires">remove: ${esc(p.input.remove.join(', '))}</div>` : ''}${p.input.wires?.length ? `<div class="wires">wires: ${esc(p.input.wires.join('  '))}</div>` : ''}
    ${plan.failing.length ? `<div class="why">${esc(plan.failing.slice(0, 6).join('\n'))}</div>` : ''}`;
  $('px').onclick = () => { plan = null; drawPlan(); };
  document.getElementById('pbuild')?.addEventListener('click', () => void buildPlan());
  document.getElementById('pagain')?.addEventListener('click', () => void askPlan(plan!.asked, plan!.failing));
}
/** The plan as its fields now say (each node's settings read back), built on the page. */
async function buildPlan(): Promise<void> {
  if (!plan || busy) return; const p = structuredClone(plan.plan), nodes = p.input.nodes ?? p.input.add ?? {};
  for (const [nm, n] of Object.entries(nodes)) { const d = block(n.b); if (!d) continue; const keys = new Set((d.settings ?? []).map((s) => s.key));
    n.s = { ...readFields(`pp_${nm}_`, d, Object.keys(n.s ?? {}).filter((k) => !keys.has(k))) }; if (!Object.keys(n.s).length) delete n.s; }
  const failing = await runShown(p, `<span class="k">✦</span> Build the plan`);
  plan = failing.length ? { ...plan, plan: p, failing, built: true } : null; drawPlan();
}
/** One call for a plan (or, asked again, a change that mends only what failed); its tokens on its message. */
async function askPlan(q: string, failing: string[] = []): Promise<void> {
  if (busy || !q.trim()) return; busy = true; ($('go') as HTMLButtonElement).disabled = true; $('sheet').classList.remove('low');
  chat.push({ who: 'me', html: failing.length ? `<span class="k">✦</span> Ask again with the ${failing.length} line${failing.length === 1 ? '' : 's'} that failed` : esc(q.trim()) }); keepChat();
  const live: Said = { who: 'ai', html: '<div class="live"><span class="dots">One call: writing a plan</span></div>' }; chat.push(live); drawChat();
  try {
    const res = await fetch('./api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'plan', request: failing.length ? q : before() + q.trim(), board: nodesOf(board).length ? board : undefined, ...(failing.length ? { failing } : {}) }) });
    if (res.status === 404 || res.status === 405) throw new Error('this copy of the app is served without its AI relay (it holds no key, and a page never does). By hand works without it; to plan with Claude, open the app the session serves (npm run app).');
    const r = await res.json() as PlanRun & { error?: string };
    if (r.tokens) spent(r.tokens);
    if (!r.plan) throw Object.assign(new Error(r.error ?? `the relay answered ${res.status}`), { tok: r.tokens });
    plan = { asked: failing.length ? q : q.trim(), plan: r.plan, failing: [], built: false };
    const n = Object.keys(r.plan.input.nodes ?? r.plan.input.add ?? {}).length;
    live.html = `${md(r.plan.says || 'A plan.')}<br>${r.plan.tool === 'build' ? 'A new board' : 'A change'} of ${n} node${n === 1 ? '' : 's'}${r.plan.input.wires?.length ? ` and ${r.plan.input.wires.length} wires` : ''}: check it below, change any setting, then Build. ${(r.ms / 1000).toFixed(1)} s.${tokLine(r.tokens)}`;
    drawPlan();
  } catch (e) { live.bad = true; const t = (e as { tok?: Tok }).tok; live.html = md(`Could not plan it: ${(e as Error).message}`) + (t ? tokLine(t) : ''); }
  finally { busy = false; ($('go') as HTMLButtonElement).disabled = false; keepChat(); drawChat(); }
}

// ---- Auto: the agent's loop, streamed ------------------------------------------------------------------------------------
const STEP_SAYS: Record<string, string> = { find: 'searched the library', card: 'read a block', build: 'built a board and ran it', open: 'opened a starter board', change: 'changed the board and ran it', read: 'read an output', fold: 'folded nodes into one block', docs: 'read the docs' };
let busy = false;
async function ask(q: string): Promise<void> {
  if (mode === 'assist') return askPlan(q);
  if (busy || !q.trim()) return; busy = true; ($('go') as HTMLButtonElement).disabled = true; $('sheet').classList.remove('low');
  const request = before() + q.trim();
  chat.push({ who: 'me', html: esc(q.trim()) }); keepChat();
  const live: Said = { who: 'ai', html: '' }; chat.push(live);
  const steps: string[] = [], t0 = Date.now(), was = board; let note = 'Claude is reading what you asked', lastBoard: Board | null = null;
  const paint = () => { live.html = `<div class="live"><span class="dots">${esc(note)}</span> · ${Math.round((Date.now() - t0) / 1000)} s</div>${steps.length ? `<div class="steps">${steps.slice(-6).join('')}</div>` : ''}`; drawChat(); };
  const tick = window.setInterval(paint, 1000); paint();
  try {
    const res = await fetch('./api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request, board: nodesOf(board).length ? board : undefined, blocks: savedBlocks(), stream: true, check: checkBox.checked }) });
    if (res.status === 404 || res.status === 405) throw new Error('this copy of the app is served without its AI relay (it holds no key, and a page never does). By hand and the pieces below work without it; to talk to Claude, open the app the session serves (npm run app).');
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
    spent(done.tokens);
    const g = gateOf(done.certificates), n = done.steps.length, secs = Math.round((Date.now() - t0) / 1000);
    for (const x of done.made ?? []) { try { register(groupBlock(x.graph, { id: x.id, name: x.name, says: x.says, domains: x.domains, by: 'you' })); const all = savedBlocks().filter((s) => s.id !== x.id); all.push(x); store.set(BLOCKS_KEY, JSON.stringify(all)); } catch { /* said below if it matters */ } }
    // (on a phone, the answer's first paragraph; the rest a press away)
    const answer = (done.answer || done.stopped || '(no answer: it stopped)').trim(), cut = answer.search(/\n\s*\n/), head = cut > 0 ? answer.slice(0, cut) : answer, rest = cut > 0 ? answer.slice(cut).trim() : '';
    live.html = `${md(head)}${rest ? `<details><summary>More</summary>${md(rest)}</details>` : ''}${done.made?.length ? `<br><b>Saved as a node of its own:</b> ${done.made.map((x) => esc(x.name)).join(', ')}` : ''}<details><summary>${n} step${n === 1 ? '' : 's'} · ${secs} s${done.checked ? ` · checked: ${esc(done.checked.trim().split('\n').pop()?.slice(0, 40) ?? '')}` : ''}</summary>${done.steps.map((s, i) => `${i + 1}. ${esc(s.tool)}: ${esc(s.result.slice(0, 140))}`).join('<br>')}</details>${tokLine(done.tokens)}`;
    if (g.take) { history.push(structuredClone(was)); await use(done.board); } else { live.bad = true; live.html += '<br>The board was not taken: the kernel refused one of its certificates as wrong, so the board is as it was.'; await use(was); }
  } catch (e) { live.bad = true; live.html = md(`Could not: ${(e as Error).message}${lastBoard ? '\n\nWhat it had built when it stopped is shown and kept.' : ''}`); if (lastBoard) { history.push(structuredClone(was)); await use(lastBoard); } }
  finally { clearInterval(tick); busy = false; ($('go') as HTMLButtonElement).disabled = false; keepChat(); drawChat(); }
}
const qEl = $<HTMLTextAreaElement>('q');
const grow = () => { qEl.style.height = 'auto'; qEl.style.height = `${Math.min(120, qEl.scrollHeight)}px`; };
qEl.addEventListener('input', grow);
qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const q = qEl.value; qEl.value = ''; grow(); void ask(q); } });
$('go').onclick = () => { const q = qEl.value; qEl.value = ''; grow(); void ask(q); };

// ---- the chips: by hand, the pieces; else things to ask for; and the piece boards opened at once (no AI, no network) -----
const OPEN: [string, string][] = [
  ['Bolts & nuts', 'Common pieces: bolts'], ['Wire & LEDs', 'Common pieces: copper wire'], ['Matings', 'Matings: two plates bolted'],
  ['Angles & beams', 'Common pieces: angles'], ['DC motor', 'Built from pieces: a small DC motor'], ['Switch box', 'Built from pieces: a switch box'],
  ['Starter motor', 'Nothing can overlap: a starter motor'],
];
const ASK = [
  'Two 3 mm aluminium plates, 80 by 50 mm, bolted with four M5 bolts',
  'A red 5 mm LED and a push button on a small board',
  'A copper winding of three layers on a 20 mm bobbin',
  'A steel angle bolted to a plate with two M8 bolts',
  'A 22 mm copper pipe with a coupling at each end',
];
function drawChips(): void {
  const chips = $('chips'); chips.innerHTML = '';
  const add = (cls: string, k: string, label: string, title: string, on: () => void) => { const b = document.createElement('button'); b.className = `chip ${cls}`; b.innerHTML = `<span class="k">${k}</span>${esc(label)}`; b.title = title; b.onclick = on; chips.appendChild(b); };
  if (mode === 'hand') for (const d of pieces()) add('piece', '＋', d.name.replace(/^Bar of a section$/, 'Section'), d.says ?? '', () => { handPiece = d.id; drawHand(); $('sheet').classList.remove('low'); });
  else for (const q of ASK) add('ask', '✦', q, mode === 'assist' ? 'One call plans this' : 'Ask Claude to build this', () => void ask(q));
  for (const [label, title] of OPEN) add('open', '▦', label, 'Open it now (no AI needed)', () => { const hit = starterBoards().find(([t]) => t.startsWith(title)); if (!hit) { say(`No board "${title}" in this copy of the app.`, true); return; } chat.push({ who: 'me', html: `<span class="k">▦</span> ${esc(label)}` }); say(`Opened "${hit[0]}". ${mode === 'hand' ? 'Add pieces to it below.' : 'Ask me to change it: bigger, another material, more of them.'}`); void step(hit[1]()); });
}

drawChat(); drawTok(); setMode(mode);
void use(board);
// what a browser test drives it by
(window as unknown as { nexusVibe: object }).nexusVibe = { board: () => board, ask, open: (title: string) => { const hit = starterBoards().find(([t]) => t.startsWith(title)); return hit ? step(hit[1]()) : Promise.reject(new Error(`no board ${title}`)); }, busy: () => busy, mode: setMode, tokens: () => total, plan: () => plan,
  /** a plan, as the model would write it, shown in Assist's panel to be built (the browser test builds one by its own hand) */ showPlan: (p: AgentPlan, asked = 'a plan') => { plan = { asked, plan: p, failing: [], built: false }; drawPlan(); } };
