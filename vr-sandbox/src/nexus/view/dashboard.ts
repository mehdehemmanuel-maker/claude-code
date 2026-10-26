// The dashboard (view/index.html), the app's front door: the board of blocks (nodes.ts) in the middle, the library on
// the left, and round it what the board says, each panel read from the board as it runs, none drawn for show:
// - the 3D view (dock3d.ts): what its "Show in space" nodes are given, a press away from filling the page or from the
//   immersive space (view/space.html); under it the clock, which runs what moves (traffic, signals) and nothing else;
// - the run log: what each run worked out anew, how long each node took, what failed and why;
// - results and metrics: what is shown weighs, spans, places and shares, how long the last run took, how much of the
//   board is working, how much the view draws;
// - variations: the chosen node run once for each of an input's choices (a house's plans, a light's states), side by
//   side, a press to take one.

import { wall, type RanNode } from './nodes';
import { Dock3D } from './dock3d';
import type { Shown } from './space3d';
import { runBlock } from '../dataflow';
import { show, type PortDef } from '../blocks';
import { boundsOfAll, isAssembly, isPart, leavesOf, massOfAll, placedCount, type Assembly } from '../assembly';
import type { Part } from '../kits';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const thingy = (v: unknown): v is Part | Assembly => isAssembly(v) || isPart(v);

// ---- the 3D view -----------------------------------------------------------------------------------------------------
const dock = new Dock3D($('view3d'), (key) => wall.choose(key));
const shown = (): Shown[] => wall.shown().filter((s) => thingy(s.thing)) as Shown[];
$('fit3d').onclick = () => dock.fit();
const enter = (on: boolean) => { $('dock').classList.toggle('big', on); $('enter3d').textContent = on ? '✕ Back' : '⤢ Enter'; window.setTimeout(() => dock.fit(), 60); };
$('enter3d').onclick = () => enter(!$('dock').classList.contains('big'));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('dock').classList.contains('big')) enter(false); });

// ---- the clock -------------------------------------------------------------------------------------------------------
const slider = $<HTMLInputElement>('tslider'), rate = $<HTMLSelectElement>('trate');
function drawClock(): void {
  const c = wall.clock(), [w0, w1] = wall.window(); slider.min = String(w0); slider.max = String(w1); slider.step = String(c.span / 1000); if (document.activeElement !== slider) slider.value = String(c.t);
  $('play').textContent = c.playing ? '❚❚' : '▶'; $('tread').textContent = `t = ${said(c.t)}`;
  $('tbar').classList.toggle('idle', !c.moves); slider.style.display = c.moves ? '' : 'none'; $('tread').textContent = c.moves ? `t = ${said(c.t)}` : 'Nothing on this board moves with time'; $('tbar').title = c.moves ? 'The board\'s clock: what moves with time runs as it goes' : 'Nothing on this board moves with time yet: wire a Clock into a Follow a path or a Signal cycle';
}
/** A time said as people say it: 42.0 s, 3 min 20 s, 5 h 2 min, 12 d 4 h, 3.2 yr. */
function said(t: number): string {
  if (t < 60) return `${t.toFixed(1)} s`; if (t < 3600) return `${Math.floor(t / 60)} min ${Math.floor(t % 60)} s`;
  if (t < 86400) return `${Math.floor(t / 3600)} h ${Math.floor((t % 3600) / 60)} min`; if (t < 365.25 * 86400) return `${Math.floor(t / 86400)} d ${Math.floor((t % 86400) / 3600)} h`;
  return `${(t / (365.25 * 86400)).toFixed(t < 3.15e9 ? 2 : 0)} yr`;
}
const spanSel = $<HTMLSelectElement>('tspan'); spanSel.onchange = () => wall.span(Number(spanSel.value));
$('play').onclick = () => wall.play(!wall.clock().playing);
slider.oninput = () => wall.setTime(Number(slider.value));
rate.onchange = () => wall.rate(Number(rate.value));
wall.timed = drawClock;

// ---- the run log -----------------------------------------------------------------------------------------------------
const lines: string[] = [];
function logRun(): void {
  const r = wall.lastRun(); if (!r.at) return;
  const mark = (n: RanNode) => (n.status === 'failed' ? '<b style="color:var(--bad)">✕</b>' : n.status === 'waiting' ? '<b style="color:var(--wait)">…</b>' : '<b style="color:var(--ok)">✓</b>');
  const head = `<div class="run">${new Date(r.at).toLocaleTimeString()}${wall.clock().moves ? ` · t ${r.time.toFixed(1)} s` : ''} · ${r.report.ran} ran, ${r.report.cached} reused${r.report.failed ? `, <span style="color:var(--bad)">${r.report.failed} failed</span>` : ''} · ${r.report.ms.toFixed(1)} ms</div>`;
  const body = r.nodes.slice(0, 12).map((n) => `<div title="${esc(n.error ?? '')}">${mark(n)}<span>${esc(n.label)}${n.mapped ? ` <span class="ms">× ${n.mapped.toLocaleString()}</span>` : ''}${n.error ? ` <span style="color:var(--bad)">${esc(n.error.slice(0, 80))}</span>` : ''}</span><span class="ms">${n.ms < 1 ? `${(n.ms * 1000).toFixed(0)} µs` : `${n.ms.toFixed(1)} ms`}</span></div>`).join('') + (r.nodes.length > 12 ? `<div class="run">and ${r.nodes.length - 12} more</div>` : '');
  lines.unshift(head + body); lines.length = Math.min(lines.length, 30);
  $('log').innerHTML = lines.join(''); $('logSum').textContent = `${r.report.ran} ran · ${r.report.ms.toFixed(1)} ms`;
}

// ---- results and metrics ---------------------------------------------------------------------------------------------
/** A ring: how full it is (0 to 1), its colour, its value and what it is. */
function ring(f: number | null, hue: string, value: string, label: string, sub: string): string {
  const r = 30, c = 2 * Math.PI * r, k = f === null ? 1 : Math.max(0, Math.min(1, f));
  return `<div class="gauge"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" fill="none" stroke="#1b2536" stroke-width="7"/><circle cx="40" cy="40" r="${r}" fill="none" stroke="${hue}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c * k).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 40 40)" opacity="${f === null ? 0.35 : 1}" style="filter:drop-shadow(0 0 4px ${hue})"/><text x="40" y="44" text-anchor="middle" fill="#e6eef8" font-size="13" font-weight="700" font-family="system-ui">${esc(value)}</text></svg><div class="gl">${esc(label)}</div><div class="gs">${esc(sub)}</div></div>`;
}
/** How many distinct pieces it is drawn from (each stored once, however often it is placed). */
function kindsOf(t: Part | Assembly): number { const seen = new Set<object>(); let n = 0; const walk = (x: Part | Assembly) => { if (seen.has(x)) return; seen.add(x); if (isAssembly(x)) for (const it of x.items) walk(it.of); else n += leavesOf(x).length; }; walk(t); return n; }
function metrics(): void {
  const things = shown(), r = wall.lastRun().report, st = dock.view.stats;
  let mass = 0, placed = 0, distinct = 0; const box = { x: 0, y: 0, z: 0 };
  for (const s of things) { mass += massOfAll(s.thing); placed += placedCount(s.thing); distinct += kindsOf(s.thing); const b = boundsOfAll(s.thing); if (!b.isEmpty()) { box.x = Math.max(box.x, b.max.x - b.min.x); box.y = Math.max(box.y, b.max.y - b.min.y); box.z = Math.max(box.z, b.max.z - b.min.z); } }
  const nodes = wall.board().nodes, total = Object.keys(nodes).length, failed = r.failed, waiting = r.waiting;
  const shared = placed ? 1 - distinct / placed : 0;
  $('gauges').innerHTML = [
    ring(null, '#ff6e40', mass ? show(mass, 'kg') : '—', 'Mass', things.length ? `of ${things.length} shown` : 'nothing shown'),
    ring(shared, '#ffd740', placed ? `${shared > 0.99 ? (Math.floor(shared * 1000) / 10).toFixed(1) : (shared * 100).toFixed(0)}%` : '—', 'Shared', `${placed.toLocaleString()} pieces, ${distinct.toLocaleString()} made`),
    ring(Math.min(1, r.ms / 16.7), r.ms > 16.7 ? '#ff5252' : '#69f0ae', `${r.ms.toFixed(r.ms < 10 ? 1 : 0)} ms`, 'Last run', 'a frame is 16.7 ms'),
    ring(total ? (total - failed - waiting) / total : null, failed ? '#ff5252' : '#40c4ff', total ? `${total - failed - waiting}/${total}` : '—', 'Nodes', failed ? `${failed} failed` : waiting ? `${waiting} waiting` : 'all working'),
    ring(st.instances / 250_000, '#e040fb', st.instances >= 1000 ? `${(st.instances / 1000).toFixed(st.instances >= 1e4 ? 0 : 1)}k` : String(st.instances), 'Drawn', 'pieces, of 250k most'),
  ].join('');
  const endless = things.some((x) => isAssembly(x.thing) && x.thing.tiled);
  $('metNote').textContent = endless ? 'What is shown repeats for ever: these figures are for one cell of it.' : placed ? `What is shown spans ${show(box.x, 'm')} × ${show(box.z, 'm')}, ${show(box.y, 'm')} high.` : 'Wire something into a "Show in space" node to measure it here.';
  $('metOf').textContent = wall.boardTitle();
  $('stat3d').textContent = st.instances ? `${st.instances.toLocaleString()} pieces drawn${st.boxes ? `, ${st.boxes.toLocaleString()} of them far away, shown as plain boxes` : ''}` : '';
}

// ---- variations: one node, each of an input's choices -----------------------------------------------------------------
let varFor = '', varPort = '', varJob = 0;
async function variations(force = false): Promise<void> {
  const id = wall.selected(), el = $('vars'), ctl = $('varCtl');
  if (!id) { varFor = ''; ctl.innerHTML = ''; el.innerHTML = '<div class="why">Choose a node with choices (a house\'s plan, a room\'s type, a light\'s state) and each choice is worked out here, side by side.</div>'; return; }
  const { block: d, inputs, ports } = wall.inputsOf(id), choosy = ports.filter((p: PortDef) => p.choices?.length);
  if (!d || !choosy.length) { varFor = id; ctl.innerHTML = ''; el.innerHTML = `<div class="why">${esc(d?.name ?? 'This node')} has no input with choices to compare. Seeds do: a House\'s plan, a Room\'s type, a Car\'s paint.</div>`; return; }
  if (!d.run && !d.id.startsWith('seed.') && !d.graph) { el.innerHTML = '<div class="why">Only a block from the library can be run again here.</div>'; return; }
  if (!choosy.some((p) => p.name === varPort)) varPort = choosy[0]!.name;
  if (!force && varFor === `${id}|${varPort}`) return; varFor = `${id}|${varPort}`;
  ctl.innerHTML = `<select id="varSel">${choosy.map((p) => `<option value="${esc(p.name)}" ${p.name === varPort ? 'selected' : ''}>${esc(p.label ?? p.name)}</option>`).join('')}</select>`;
  ($('varSel') as HTMLSelectElement).onchange = (e) => { varPort = (e.target as HTMLSelectElement).value; void variations(true); };
  const port = choosy.find((p) => p.name === varPort)!, now = String(inputs[port.name] ?? port.default ?? port.choices![0]), job = ++varJob;
  el.innerHTML = '<div class="why">Working each out…</div>';
  const rows: { choice: string; mass?: number; placed?: number; size?: string; error?: string; ms: number }[] = [];
  for (const choice of port.choices!) {
    const t0 = performance.now();
    try {
      const out = await runBlock(d.id, { ...inputs, [port.name]: choice }, { time: wall.clock().t }), first = Object.values(out).find(thingy);
      if (first) { const b = boundsOfAll(first); rows.push({ choice, mass: massOfAll(first), placed: placedCount(first), size: b.isEmpty() ? '—' : `${show(b.max.x - b.min.x, 'm')} × ${show(b.max.z - b.min.z, 'm')}`, ms: performance.now() - t0 }); }
      else rows.push({ choice, error: Object.entries(out).map(([k, v]) => `${k} ${show(v)}`).join(', ').slice(0, 60), ms: performance.now() - t0 });
    } catch (e) { rows.push({ choice, error: (e as Error).message, ms: performance.now() - t0 }); }
    if (job !== varJob) return;
  }
  el.innerHTML = `<table><tr><th>${esc(port.label ?? port.name)}</th><th>Mass</th><th>Pieces</th><th>Footprint</th></tr>${rows.map((r) => `<tr class="pickable ${r.choice === now ? 'on' : ''}" data-c="${esc(r.choice)}"><td>${r.choice === now ? '★ ' : ''}${esc(r.choice)}</td>${r.error ? `<td colspan="3" style="color:var(--dim)">${esc(r.error)}</td>` : `<td>${show(r.mass!, 'kg')}</td><td>${r.placed!.toLocaleString()}</td><td>${r.size}</td>`}</tr>`).join('')}</table><div class="why" style="padding:6px 8px">Each run on its own with this node's inputs as they are now; press a row to take it.</div>`;
  for (const tr of el.querySelectorAll<HTMLTableRowElement>('tr.pickable')) tr.onclick = () => { wall.setInput(id, port.name, tr.dataset.c); varFor = ''; };
}

// ---- keeping them up to date --------------------------------------------------------------------------------------------
wall.ran = () => { const title = wall.boardTitle(); dock.show(shown(), title); logRun(); metrics(); drawClock(); $('boardName').textContent = title; };
wall.changed = () => { void variations(); };
$('stripBtn').onclick = () => $('strip').classList.toggle('open');
window.setInterval(metrics, 1000);
drawClock(); void variations();
// what a browser test drives it by
(window as unknown as { dashboard: object }).dashboard = { dock, wall, variations: () => variations(true), enter };
