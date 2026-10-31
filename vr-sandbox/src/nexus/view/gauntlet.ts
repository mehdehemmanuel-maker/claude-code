// The gauntlet's own space (view/gauntlet.html): what is put through it (the library's blocks, the inventory's
// entries), the gates as lanes each lights as it passes or stops a candidate, the approved and the turned back with
// why, the tasks left, the unknown queue sorted into clusters by what they share, the research loop's rounds down to
// a fixed point, and every event a listener would hear. Its state kept in this browser's storage between visits.

import { LIBRARY, defaultsOf, fits, portsOf, sameBehaviour, testBlock } from '../blocks';
import * as G from '../gauntlet';
import { INVENTORY } from '../inventory';
import { feedLinesOf, REFERENCE_NOTES, referenceOf, webParts } from '../research';
import { feed, itemOf } from '../inventory';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const lib: G.Lib = { blocks: LIBRARY, test: (b) => testBlock(b), portsOf, defaultsOf, fits, same: sameBehaviour };
const KEY = 'nexus.gauntlet.v1', GKEY = 'nexus.gauntlet.gates';
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage refused: kept for this visit only */ } } };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ---- state ------------------------------------------------------------------------------------------------------------
const on = new Set<G.GateId>((() => { try { const g = JSON.parse(store.get(GKEY) ?? 'null') as G.GateId[] | null; return g?.length ? g : [...G.GATES]; } catch { return [...G.GATES]; } })());
const live = new Map<string, Map<G.GateId, 'run' | 'ok' | 'bad' | 'na'>>(), order: string[] = [];
let picked = new Set<string>(), shown: G.Candidate[] = [], running = false, halt = { stop: false }, rounds: G.Round[] = [], lastLoop = '';
const keyOf = (c: G.Candidate) => `${c.kind}:${c.id}`;
try { const s = store.get(KEY); if (s) { G.restore(JSON.parse(s)); for (const v of G.allVerdicts()) { const k = keyOf(v.cand); order.push(k); live.set(k, new Map(v.results.map((r) => [r.gate, r.pass === null ? 'na' : r.pass ? 'ok' : 'bad']))); } } } catch { /* a store from an older page: started afresh */ }
let saveT = 0; const save = () => { clearTimeout(saveT); saveT = window.setTimeout(() => store.set(KEY, JSON.stringify(G.snapshot())), 300); };

// ---- candidates ---------------------------------------------------------------------------------------------------------
function fillKinds(): void {
  const from = $<HTMLSelectElement>('from').value; if (from === 'reference') { $('kind').innerHTML = '<option value="">every reference</option>'; return; }
  const kinds = from === 'library' ? [...new Set([...LIBRARY.values()].map((b) => b.kind))] : [...new Set([...INVENTORY.values()].map((i) => i.kind))];
  $('kind').innerHTML = `<option value="">every kind</option>${kinds.sort().map((k) => `<option>${k}</option>`).join('')}`;
}
function listCands(): void {
  const from = $<HTMLSelectElement>('from').value as 'library' | 'inventory' | 'reference', kind = $<HTMLSelectElement>('kind').value, q = $<HTMLInputElement>('q').value.toLowerCase().trim();
  // (a researched reference is put through as the entry it makes in the inventory: entered there first, its source kept)
  shown = (from === 'reference' ? Object.entries(REFERENCE_NOTES).map(([id, r]) => ({ id, kind: 'item' as const, name: r.name })) : G.candidatesOf(lib, { from, ...(kind ? { kind } : {}), most: from === 'inventory' ? 600 : Infinity })).filter((c) => !q || `${c.id} ${c.name}`.toLowerCase().includes(q));
  $('candN').textContent = `${picked.size} picked of ${shown.length}`;
  $('candList').innerHTML = shown.map((c) => { const v = G.verdictOf(keyOf(c)); return `<div data-k="${esc(keyOf(c))}"><input type="checkbox" ${picked.has(keyOf(c)) ? 'checked' : ''}/><span class="v ${v ? (v.approved ? 'ok' : 'bad') : ''}"></span><span>${esc(c.name)}</span><span class="k">${esc(c.kind === 'block' ? LIBRARY.get(c.id)?.kind ?? '' : INVENTORY.get(c.id)?.kind ?? '')}</span></div>`; }).join('') || '<div class="empty">nothing matches</div>';
}
$('candList').addEventListener('click', (e) => { const row = (e.target as HTMLElement).closest('div[data-k]') as HTMLElement | null; if (!row) return; const k = row.dataset.k!; if ((e.target as HTMLElement).tagName === 'INPUT') { if (picked.has(k)) picked.delete(k); else picked.add(k); $('candN').textContent = `${picked.size} picked of ${shown.length}`; } else if (G.verdictOf(k)) openDetail(k); });
for (const id of ['from', 'kind']) $(id).addEventListener('change', () => { if (id === 'from') fillKinds(); listCands(); });
$('q').addEventListener('input', listCands);
$('all').onclick = () => { for (const c of shown) picked.add(keyOf(c)); listCands(); };
$('none').onclick = () => { picked.clear(); listCands(); };

// ---- the gates, as lanes ------------------------------------------------------------------------------------------------
function renderHist(): void {
  const vs = G.allVerdicts(), most = Math.max(1, ...G.GATES.map((g) => vs.filter((v) => v.failed.includes(g)).length));
  $('hist').innerHTML = G.GATES.map((g) => { const n = vs.filter((v) => v.failed.includes(g)).length; return `<div class="h ${on.has(g) ? '' : 'off'}" data-g="${g}" title="${esc(G.GATE_SAYS[g])} — press to ${on.has(g) ? 'leave this gate out' : 'put this gate back'}"><div class="b"><i style="height:${(100 * n) / most}%"></i></div><span class="c">${n}</span><span>${g}</span></div>`; }).join('');
  $('gateN').textContent = `${on.size} of ${G.GATES.length} gates on, cheapest first`;
}
$('hist').addEventListener('click', (e) => { const g = ((e.target as HTMLElement).closest('.h') as HTMLElement | null)?.dataset.g as G.GateId | undefined; if (!g || running) return; if (on.has(g)) on.delete(g); else on.add(g); store.set(GKEY, JSON.stringify([...on])); renderHist(); renderMatrix(); });
function renderMatrix(): void {
  const gs = G.GATES.filter((g) => on.has(g));
  $('mh').innerHTML = `<tr><th>candidate</th>${gs.map((g) => `<th title="${esc(G.GATE_SAYS[g])}">${g}</th>`).join('')}<th>verdict</th></tr>`;
  const rows = [...order].reverse().slice(0, 400);
  $('mb').innerHTML = rows.map((k) => { const v = G.verdictOf(k), cells = live.get(k), name = v?.cand.name ?? k.split(':')[1]!; return `<tr data-k="${esc(k)}"><td class="nm" title="${esc(k)}">${esc(name)}</td>${gs.map((g) => { const st = cells?.get(g), r = v?.results.find((x) => x.gate === g); return `<td><span class="cell ${st ?? ''}" title="${esc(r ? `${g}: ${r.says}` : g)}"></span></td>`; }).join('')}<td class="verd ${v ? (v.approved ? 'ok' : 'bad') : ''}">${v ? (v.approved ? 'APPROVED' : 'turned back') : '…'}</td></tr>`; }).join('');
  const vs = G.allVerdicts(), ok = vs.filter((v) => v.approved).length; $('sOk').textContent = String(ok); $('sBad').textContent = String(vs.length - ok);
}
$('mb').addEventListener('click', (e) => { const k = ((e.target as HTMLElement).closest('tr') as HTMLElement | null)?.dataset.k; if (k && G.verdictOf(k)) openDetail(k); });
function renderLists(): void {
  const vs = G.allVerdicts(), ok = vs.filter((v) => v.approved), bad = vs.filter((v) => !v.approved);
  $('okN').textContent = String(ok.length); $('badN').textContent = String(bad.length);
  $('okL').innerHTML = ok.map((v) => `<div data-k="${esc(keyOf(v.cand))}">✓ ${esc(v.cand.name)}<span class="kind">${v.cand.kind}</span></div>`).join('') || '<div class="empty">nothing approved yet</div>';
  $('badL').innerHTML = bad.map((v) => `<div data-k="${esc(keyOf(v.cand))}">✗ ${esc(v.cand.name)}<span class="kind">${v.failed.join(', ')}</span><span class="why">${esc(v.results.filter((r) => r.pass === false).map((r) => r.says).join('; '))}</span></div>`).join('') || '<div class="empty">nothing turned back</div>';
  const ts = G.tasksNow(); $('taskN').textContent = `${ts.filter((t) => !t.done).length} open`;
  $('taskL').innerHTML = ts.slice(0, 200).map((t) => `<div>${t.done ? '☑' : '☐'} ${esc(t.title)}<span class="kind">${t.kind}</span><span class="why">${esc(t.says)}</span></div>`).join('') || '<div class="empty">no tasks</div>';
}
for (const id of ['okL', 'badL']) $(id).addEventListener('click', (e) => { const k = ((e.target as HTMLElement).closest('div[data-k]') as HTMLElement | null)?.dataset.k; if (k) openDetail(k); });
function renderClusters(): void {
  const q = G.unknownQueue(), cls = G.sortUnknowns(q), props = new Map(G.proposalsAll().map((p) => [p.id, p]));
  $('unkN').textContent = `${q.length} unknown in ${cls.length} clusters; ${props.size} proposed`;
  $('clusters').innerHTML = cls.map((c) => `<div class="cl"><div class="t"><b>${esc(c.key)}</b><span>${c.members.length} thing${c.members.length > 1 ? 's' : ''}</span><span class="d">wanted ${c.demand}×${c.maker ? ` · made by ${esc(c.maker)}` : ''}</span></div><div class="s">${esc(c.says)}</div>${c.members.slice(0, 24).map((m) => { const p = props.get(m.id); return `<span class="chip ${p ? (p.level === 'inferred' ? 'i' : 'p') : ''}" title="${esc(`${m.why}; wanted by ${m.wantedBy.slice(0, 4).join(', ')}${p ? `; proposed (${p.level}) from ${p.from}` : ''}`)}">${esc(m.id)}</span>`; }).join('')}</div>`).join('') || '<div class="empty">the queue is empty: everything the gates found is known to its materials</div>';
}
function renderRounds(): void {
  if (!rounds.length) return;
  const W = 420, H = 150, most = Math.max(1, ...rounds.map((r) => r.unknowns)), bw = Math.min(46, (W - 40) / rounds.length - 6);
  const bars = rounds.map((r, i) => { const x = 30 + i * (bw + 6), h = ((H - 40) * r.unknowns) / most, got = r.resolved.family + r.resolved.table + r.resolved.reference + r.resolved.drawn + r.resolved.web + r.resolved.inferred, hg = ((H - 40) * Math.min(got, r.unknowns)) / most;
    return `<rect x="${x}" y="${H - 22 - h}" width="${bw}" height="${h}" fill="#ff6e4055" stroke="#ff6e40"/><rect x="${x}" y="${H - 22 - hg}" width="${bw}" height="${hg}" fill="#18ffff88"/><text x="${x + bw / 2}" y="${H - 8}" fill="#8796aa" font-size="10" text-anchor="middle">${r.round}</text><text x="${x + bw / 2}" y="${H - 26 - h}" fill="#dfe7f1" font-size="10" text-anchor="middle">${r.unknowns}</text>`; }).join('');
  $('rounds').innerHTML = `<svg viewBox="0 0 ${W} ${H}"><text x="4" y="12" fill="#8796aa" font-size="10">unknown each round (orange), resolved (cyan)</text>${bars}</svg><div id="roundsNote">${esc(lastLoop)}</div>`;
}
const evs: G.GEvent[] = [];
G.onEvent((e) => { evs.push(e); if (evs.length > 400) evs.shift(); renderEventsSoon(); });
let evT = 0; function renderEventsSoon(): void { if (evT) return; evT = window.setTimeout(() => { evT = 0; $('evN').textContent = String(G.lastEvent()); $('events').innerHTML = [...evs].reverse().slice(0, 200).map((e) => `<div><span class="kd k-${e.kind}">${e.kind}</span><span>${esc(e.says)}</span></div>`).join(''); }, 120); }
function renderAll(): void { renderHist(); renderMatrix(); renderLists(); renderClusters(); renderRounds(); listCands(); }

// ---- the detail of one verdict --------------------------------------------------------------------------------------------
let detailK = '';
function openDetail(k: string): void {
  const v = G.verdictOf(k); if (!v) return; detailK = k;
  $('dT').textContent = `${v.cand.name} (${k}): ${v.approved ? 'approved' : `turned back at ${v.failed.join(', ')}`}`;
  $('dB').innerHTML = `<table>${v.results.map((r) => `<tr><td class="g">${r.gate}</td><td><span class="cell ${r.pass === null ? 'na' : r.pass ? 'ok' : 'bad'}"></span></td><td>${esc(r.says)}</td><td class="g">${r.ms} ms</td></tr>`).join('')}</table>${v.cand.kind === 'block' ? `<p class="tag">${esc(LIBRARY.get(v.cand.id)?.says ?? '')}</p>` : `<p class="tag">${esc(INVENTORY.get(v.cand.id)?.says ?? '')}</p>`}`;
  $('detail').classList.add('on'); $('shade').classList.add('on');
}
const closeDetail = () => { $('detail').classList.remove('on'); $('shade').classList.remove('on'); };
$('dX').onclick = closeDetail; $('shade').onclick = closeDetail;
$('dRe').onclick = () => { const v = G.verdictOf(detailK); closeDetail(); if (v) void putThrough([v.cand]); };
$('dDel').onclick = () => { const v = G.verdictOf(detailK); if (!v) return; const kind = v.cand.kind === 'block' ? 'block' : 'item', dry = G.deleteThing(lib, { kind, id: v.cand.id }); if (!dry.ok) { alert(dry.says); return; } if (confirm(`${dry.says}?`)) { const r = G.deleteThing(lib, { kind, id: v.cand.id }, true); alert(r.says); closeDetail(); save(); renderAll(); } };

// ---- running it -----------------------------------------------------------------------------------------------------------
function enterReferences(cands: G.Candidate[]): void { for (const c of cands) if (c.kind === 'item' && !itemOf(c.id) && REFERENCE_NOTES[c.id]) { const r = referenceOf(c.id); if (r) feed(feedLinesOf(r.reference)); } }
async function putThrough(cands: G.Candidate[]): Promise<void> {
  if (running || !cands.length) return; enterReferences(cands); running = true; halt = { stop: false }; $<HTMLButtonElement>('go').disabled = true; $<HTMLButtonElement>('stop').disabled = false;
  const gs = G.GATES.filter((g) => on.has(g)); let done = 0;
  for (const c of cands) { const k = keyOf(c); const i = order.indexOf(k); if (i >= 0) order.splice(i, 1); order.push(k); live.set(k, new Map(gs.map((g) => [g, 'run' as const]))); }
  renderMatrix();
  await G.runGauntlet(lib, cands, { gates: gs, halt, tick: () => new Promise((r) => requestAnimationFrame(() => r())),
    onGate: (c, r) => { live.get(keyOf(c))?.set(r.gate, r.pass === null ? 'na' : r.pass ? 'ok' : 'bad'); $('now').textContent = `${c.name}: ${r.gate}`; const row = document.querySelector(`tr[data-k="${CSS.escape(keyOf(c))}"]`); if (row) { const idx = gs.indexOf(r.gate); const cell = row.querySelectorAll('.cell')[idx]; if (cell) cell.className = `cell ${r.pass === null ? 'na' : r.pass ? 'ok' : 'bad'}`; } },
    onVerdict: () => { done++; ($('bar').firstElementChild as HTMLElement).style.width = `${(100 * done) / cands.length}%`; renderMatrix(); renderHist(); } });
  running = false; $<HTMLButtonElement>('go').disabled = false; $<HTMLButtonElement>('stop').disabled = true; $('now').textContent = halt.stop ? `stopped after ${done}` : `${done} put through`;
  save(); renderAll();
}
$('go').onclick = () => { const all = [...G.candidatesOf(lib, { from: 'library' }), ...G.candidatesOf(lib, { from: 'inventory', most: Infinity }), ...shown], cs = all.filter((c) => picked.has(keyOf(c))); void putThrough(cs.length ? cs : shown); };
$('stop').onclick = () => { halt.stop = true; };
async function researchLoop(): Promise<void> {
  if (running) return; running = true; $<HTMLButtonElement>('loop').disabled = true; $('roundsNote') && ($('roundsNote').textContent = 'going down…');
  // (its roots: everything queued and every entry the gates were put to; its drawings: what the blocks put through draw)
  const vs = G.allVerdicts(), roots = [...new Set([...G.unknownQueue().map((u) => u.id), ...vs.filter((v) => v.cand.kind === 'item').map((v) => v.cand.id)])];
  const drawing = await G.drawingsOf(lib, vs.filter((v) => v.cand.kind === 'block').map((v) => v.cand.id));
  const r = await G.researchLoop(roots, { drawing, ...($<HTMLInputElement>('web').checked ? { web: G.webResolver((q) => webParts(q)) } : {}) }, { by: 'the gauntlet' });
  rounds = r.rounds; lastLoop = `${r.rounds.length} round${r.rounds.length === 1 ? '' : 's'} from ${roots.length} roots and ${drawing.length} drawings; ${r.left.length} still unknown${r.fixed ? ': a fixed point (nothing more to find this way)' : ''}. Proposals: ${G.proposalsAll().length} (feed the sourced ones in; the inferred wait for a source).`;
  running = false; $<HTMLButtonElement>('loop').disabled = false; save(); renderAll();
}
$('loop').onclick = () => void researchLoop();
$('feedB').onclick = () => { const r = G.approveProposals(); alert(`${r.added} entered in the inventory${r.refused.length ? `; ${r.refused.length} refused: ${r.refused.slice(0, 3).join('; ')}` : ''}`); save(); renderAll(); };
$('clear').onclick = () => { if (!confirm('Forget every verdict, the queue and the proposals?')) return; G.clearAll(); order.length = 0; live.clear(); rounds = []; save(); renderAll(); };

fillKinds(); renderAll(); renderEventsSoon();
// (for scripts and the screenshots: put these through, go down, read the state)
(window as unknown as { gauntlet: unknown }).gauntlet = {
  run: (ids?: string[]) => putThrough(ids ? ids.map((s) => { const m = /^(block|item):(.+)$/.exec(s)!; return { id: m[2]!, kind: m[1] as 'block', name: m[1] === 'block' ? LIBRARY.get(m[2]!)?.name ?? m[2]! : INVENTORY.get(m[2]!)?.name ?? m[2]! }; }) : shown),
  loop: researchLoop, feed: () => G.approveProposals(), state: () => ({ verdicts: G.allVerdicts().length, approved: G.approved().length, queue: G.unknownQueue().length, proposals: G.proposalsAll().length, rounds }), running: () => running, detail: openDetail,
};
