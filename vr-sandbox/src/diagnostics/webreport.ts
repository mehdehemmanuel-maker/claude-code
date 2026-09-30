// The Spiderweb report as one self-contained page: the web of everything tested (group rings around the physics
// core, a node per part kind, template or case, coloured by its worst run), a panel with what each node went through,
// and every anomaly ranked by severity. The page carries its data inline and needs nothing else.

import type { WebReport } from './spiderweb';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function spiderwebHtml(report: WebReport): string {
  const data = JSON.stringify(report).replace(/</g, '\\u003c');
  const t = report.totals;
  return `<title>Spiderweb Report</title>
<style>
/* Layout: summary strip, then the web beside its detail panel (stacked on phones), then the ranked anomaly table. */
:root {
  --bg: #f3f5f2; --panel: #ffffff; --fg: #1c211d; --muted: #5d675f; --line: #d5dbd4; --thread: #b9c2b8;
  --pass: #2f7d4f; --warn: #b07a12; --fail: #b8322a; --accent: #33658a;
  --sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif; --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #111512; --panel: #181e19; --fg: #e2e8e2; --muted: #98a499; --line: #2a332c; --thread: #3a463c;
  --pass: #55c080; --warn: #e2ad3b; --fail: #f0766b; --accent: #7fb2d9; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #111512; --panel: #181e19; --fg: #e2e8e2; --muted: #98a499; --line: #2a332c; --thread: #3a463c;
  --pass: #55c080; --warn: #e2ad3b; --fail: #f0766b; --accent: #7fb2d9; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 15px/1.5 var(--sans); padding-inline: 16px; padding-block: 20px; }
main { max-width: 1100px; margin: 0 auto; display: grid; gap: 18px; }
h1 { margin: 0; font-size: 1.5rem; text-wrap: balance; }
.sub { color: var(--muted); margin: 0; }
.strip { display: flex; flex-wrap: wrap; gap: 10px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px 14px; font-variant-numeric: tabular-nums; }
.stat b { font: 600 1.25rem var(--mono); display: block; }
.stat.fail b { color: var(--fail); } .stat.warn b { color: var(--warn); } .stat.pass b { color: var(--pass); }
.webwrap { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; align-items: start; }
@media (max-width: 760px) { .webwrap { grid-template-columns: 1fr; } }
svg { width: 100%; height: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; }
svg .thread { stroke: var(--thread); stroke-width: 1; }
svg .ring { fill: none; stroke: var(--line); stroke-dasharray: 3 4; }
svg text { fill: var(--muted); font: 10px var(--sans); }
svg .grp { fill: var(--fg); font: 600 11px var(--sans); }
svg circle.node { stroke: var(--panel); stroke-width: 1.5; cursor: pointer; }
svg circle.node:focus-visible, svg circle.node.sel { stroke: var(--fg); stroke-width: 3; outline: none; }
.pass { fill: var(--pass); } .warn { fill: var(--warn); } .fail { fill: var(--fail); }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; min-width: 0; }
.panel h2 { margin: 0 0 6px; font-size: 1.05rem; }
.run { border-top: 1px solid var(--line); padding: 8px 0; }
.run:first-of-type { border-top: 0; }
.chip { font: 600 0.7rem var(--mono); letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; border: 1.5px solid currentColor; }
.chip.pass { color: var(--pass); } .chip.warn { color: var(--warn); } .chip.fail { color: var(--fail); }
.an { font: 0.8rem/1.4 var(--mono); color: var(--muted); margin: 4px 0 0; overflow-wrap: anywhere; }
.immune { display: grid; gap: 10px; }
.ab { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; min-width: 0; }
.ab summary { cursor: pointer; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.ab summary b { font-family: var(--mono); }
.ab p { margin: 6px 0 0; max-width: 75ch; }
.ab .lbl { color: var(--muted); font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase; }
.chip.holds { color: var(--pass); } .chip.breached { color: var(--fail); } .chip.open { color: var(--warn); }
.changes { color: var(--muted); margin: 0; }
h2.sec { font-size: 1.1rem; margin: 6px 0 0; }
.tablewrap { overflow-x: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; }
table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
th, td { text-align: left; padding: 7px 10px; border-top: 1px solid var(--line); vertical-align: top; }
th { font-weight: 600; color: var(--muted); border-top: 0; }
td.k { font-family: var(--mono); white-space: nowrap; }
</style>
<main>
  <div>
    <h1>Spiderweb Report</h1>
    <p class="sub">Every part, hand, magnet, template and load case, checked on every tick for physical invariants. Created ${esc(report.created)}.</p>
  </div>
  <div class="strip">
    <div class="stat"><b>${t.runs}</b>runs</div>
    <div class="stat fail"><b>${t.fail}</b>broke an invariant</div>
    <div class="stat warn"><b>${t.warn}</b>warnings only</div>
    <div class="stat pass"><b>${t.pass}</b>clean</div>
    <div class="stat"><b>${t.seconds.toFixed(0)} s</b>to run</div>
  </div>
  <h2 class="sec">Immune system</h2>
  <p class="changes" id="changes"></p>
  <div class="immune" id="immune"></div>
  <h2 class="sec">The web</h2>
  <div class="webwrap">
    <svg id="web" viewBox="0 0 760 760" role="img" aria-label="The web of tested nodes, coloured by result"></svg>
    <div class="panel" id="detail"><h2>Pick a node</h2><p class="sub">Each dot is a part kind, magnet size, template or load case; its colour is its worst run. Select one to see what it went through.</p></div>
  </div>
  <div class="tablewrap"><table id="table"><thead><tr><th>Severity</th><th>Where</th><th>Situation</th><th>What</th><th>Detail</th></tr></thead><tbody></tbody></table></div>
</main>
<script>
const R = ${data};
const rank = { fail: 2, warn: 1, pass: 0 };
const groups = [...new Set(R.runs.map((r) => r.group))];
const nodes = new Map();
for (const r of R.runs) {
  const key = r.group + '|' + r.node;
  const n = nodes.get(key) || { group: r.group, node: r.node, runs: [], status: 'pass' };
  n.runs.push(r);
  if (rank[r.status] > rank[n.status]) n.status = r.status;
  nodes.set(key, n);
}
const svg = document.getElementById('web');
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); (parent || svg).appendChild(e); return e; };
const C = 380;
el('circle', { cx: C, cy: C, r: 150, class: 'ring' });
el('circle', { cx: C, cy: C, r: 300, class: 'ring' });
const core = el('text', { x: C, y: C + 4, 'text-anchor': 'middle', class: 'grp' }); core.textContent = 'physics';
const all = [...nodes.values()];
let index = 0;
groups.forEach((g, gi) => {
  const members = all.filter((n) => n.group === g);
  const a0 = (gi / groups.length) * 2 * Math.PI, span = (2 * Math.PI) / groups.length;
  const gx = C + 150 * Math.cos(a0 + span / 2), gy = C + 150 * Math.sin(a0 + span / 2);
  el('line', { x1: C, y1: C, x2: gx, y2: gy, class: 'thread' });
  const worst = members.reduce((s, n) => (rank[n.status] > rank[s] ? n.status : s), 'pass');
  el('circle', { cx: gx, cy: gy, r: 9, class: 'node ' + worst });
  // each group's name runs along its own spoke, inside its hub, so neighbours never overprint
  const la = a0 + span / 2, lx = C + 136 * Math.cos(la), ly = C + 136 * Math.sin(la), flip = Math.cos(la) < 0;
  const deg = (la * 180) / Math.PI + (flip ? 180 : 0);
  const lbl = el('text', { x: lx, y: ly + 4, 'text-anchor': flip ? 'start' : 'end', class: 'grp', transform: 'rotate(' + deg.toFixed(1) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')' });
  lbl.textContent = g.replace('parts/', '');
  members.forEach((n, i) => {
    const a = a0 + span * ((i + 0.5) / members.length);
    const rr = 300 - (i % 2) * 40;
    const x = C + rr * Math.cos(a), y = C + rr * Math.sin(a);
    el('line', { x1: gx, y1: gy, x2: x, y2: y, class: 'thread' });
    const dot = el('circle', { cx: x, cy: y, r: 7, class: 'node ' + n.status, tabindex: '0', 'data-i': String(index) });
    const tt = el('title', {}, dot); tt.textContent = n.node + ' (' + n.status + ')';
    n.dot = dot; n.i = index++;
    if (members.length <= 16) { const t = el('text', { x: x + (Math.cos(a) > 0 ? 10 : -10), y: y + 3, 'text-anchor': Math.cos(a) > 0 ? 'start' : 'end' }); t.textContent = n.node; }
  });
});
const detail = document.getElementById('detail');
function show(n) {
  for (const m of all) m.dot.classList.toggle('sel', m === n);
  detail.replaceChildren();
  const h = document.createElement('h2'); h.textContent = n.node; detail.append(h);
  const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = n.group; detail.append(sub);
  for (const r of n.runs) {
    const d = document.createElement('div'); d.className = 'run';
    const c = document.createElement('span'); c.className = 'chip ' + r.status; c.textContent = r.status;
    const s = document.createElement('span'); s.textContent = ' ' + r.scenario + (r.material ? ' · ' + r.material : '') + ' · ' + r.meanStepMs.toFixed(2) + ' ms/tick';
    d.append(c, s);
    for (const a of r.anomalies) { const p = document.createElement('p'); p.className = 'an'; p.textContent = a.kind + (a.id ? ' [' + a.id + ']' : '') + ' at tick ' + a.tick + ': ' + a.detail; d.append(p); }
    detail.append(d);
  }
}
svg.addEventListener('click', (e) => { const i = e.target.getAttribute && e.target.getAttribute('data-i'); if (i !== null && i !== undefined) show(all[Number(i)]); });
svg.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const i = e.target.getAttribute('data-i'); if (i !== null) show(all[Number(i)]); } });
const tbody = document.querySelector('#table tbody');
const rows = [];
for (const r of R.runs) for (const a of r.anomalies) rows.push({ r, a });
rows.sort((x, y) => (x.a.severity === y.a.severity ? 0 : x.a.severity === 'critical' ? -1 : 1));
for (const { r, a } of rows) {
  const tr = document.createElement('tr');
  const cells = [a.severity, r.group.replace('parts/', '') + ' · ' + r.node, r.scenario + (r.material ? ' · ' + r.material : ''), a.kind, a.detail];
  cells.forEach((c, i) => { const td = document.createElement('td'); if (i === 3) td.className = 'k'; td.textContent = c; tr.append(td); });
  tbody.append(tr);
}
if (!rows.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5; td.textContent = 'No anomalies: every invariant held on every tick.'; tr.append(td); tbody.append(tr); }
const imm = document.getElementById('immune');
for (const x of R.immune || []) {
  const d = document.createElement('details'); d.className = 'ab';
  const sum = document.createElement('summary');
  const id = document.createElement('b'); id.textContent = x.id;
  const chip = document.createElement('span'); chip.className = 'chip ' + x.verdict; chip.textContent = x.verdict + (x.status === 'open' ? ' (known, not yet fixed)' : '');
  const g = document.createElement('span'); g.textContent = x.guards + ' · ' + x.cases + ' cases' + (x.failed.length ? ' · ' + x.failed.length + ' failing' : '');
  sum.append(id, chip, g); d.append(sum);
  for (const [label, text] of [['Found', x.found], ['Cause', x.cause], ['Fix', x.fix]]) { const p = document.createElement('p'); const l = document.createElement('span'); l.className = 'lbl'; l.textContent = label + ' '; p.append(l, document.createTextNode(text)); d.append(p); }
  for (const f of x.failed.slice(0, 12)) { const p = document.createElement('p'); p.className = 'an'; p.textContent = f; d.append(p); }
  if (x.verdict !== 'holds') d.open = true;
  imm.append(d);
}
const ch = document.getElementById('changes');
if (R.changes) ch.textContent = 'Since the last run: ' + R.changes.newFail.length + ' newly failing, ' + R.changes.fixed.length + ' fixed.' + (R.changes.newFail.length ? ' New: ' + R.changes.newFail.slice(0, 6).join('; ') : '');
const firstBad = all.find((n) => n.status === 'fail') || all.find((n) => n.status === 'warn');
if (firstBad) show(firstBad);
</script>`;
}
