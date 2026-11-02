// Drag to imprint (spec 01, I16), in the built dashboard, by real input: a bolt held over a plate shows its negative and
// the paste node's verdict, cuts on accept, comes back on undo, leaves nothing on Esc, refuses near the edge; a face's
// interface copied and pasted elsewhere; the same on a phone by taps; and fault D16's view (contrast, the grid at the floor,
// the label above the canvas). Build the pages first (npx vite build --config vite.view.config.ts), then:
//   node tests/evals/imprint-drag.cjs <outDir> [paste|cancel|copy|phone|d16]   (all five when none is named)
// It serves dist-view itself (as board-shot.cjs does) and opens each board through the library. Each part runs in a fresh
// page, under two minutes, and prints its time; ok/FAIL lines as headset.cjs prints them; any FAIL exits 1.
// Screen points are worked out here from the view's own camera and the canvas's place on the page; pixels are read from
// each screenshot itself (decoded in the page), as the mean of a 7 × 7 patch. Test choices, labelled: a role's colour is
// seen where the hue is within 30° of the role's and the colour moved by at least 40 (RGB distance) from shot 0; the
// contrast is sampled every 8 px, a sample kept where its neighbours 8 px away are of its class, the backdrop being the
// empty samples within 64 px of the piece, by WCAG's relative luminance against SC 1.4.11's 3:1.
const { chromium } = require('playwright');
const { createServer } = require('node:http'), { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } = require('node:fs'), { join, extname, resolve } = require('node:path');
const DIST = resolve(__dirname, '../../dist-view'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const [outDir, only] = process.argv.slice(2); if (!outDir) { console.log('usage: node tests/evals/imprint-drag.cjs <outDir> [paste|cancel|copy|phone|d16]'); process.exit(2); }
mkdirSync(outDir, { recursive: true });
let fails = 0, current = null; const ok = (cond, what) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails++; return cond; };
const ROLE = { remove: [255, 82, 82], keep: [255, 179, 0], contact: [76, 175, 80] };
const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-9) return NaN; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
const hueOff = (a, b) => { const d = Math.abs(hue(a) - hue(b)) % 360; return Math.min(d, 360 - d); };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

async function serve() { const server = createServer((req, res) => { const u = decodeURIComponent((req.url ?? '/').split('?')[0]), p = join(DIST, u === '/' ? 'index.html' : u);
  if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
  await new Promise((r) => server.listen(0, r)); return server; }
async function open(browser, port, title, o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport ?? { width: 1600, height: 1000 }, deviceScaleFactor: 2, ...(o.touch ? { hasTouch: true, isMobile: true } : {}) });
  current = ctx; const p = await ctx.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => !!window.dashboard, null, { timeout: 60000 });
  // (opened through the library, as a person would)
  if (o.touch) await p.evaluate((t) => { const n = window.nexusNodes; const d = window.dashboard.wall; const i = d.demos().findIndex((x) => x.startsWith(t)); d.demo(i); }, title);
  else { await p.fill('#libQ', title); await p.waitForTimeout(500); let hit = false; for (const r of await p.$$('#shelves .blk')) if ((await r.textContent()).includes(title)) { await r.click({ noWaitAfter: true, timeout: 60000 }).catch(() => {}); hit = true; break; } ok(hit, `${title}: found in the library`); await p.fill('#libQ', '').catch(() => {}); await p.evaluate(() => document.activeElement?.blur()); }
  await settle(p, title); return { p, ctx, errs };
}
const settle = (p, title) => p.waitForFunction((t) => { const w = window.dashboard.wall; return w.settled() && w.lastRun().at > 0 && (!t || t.startsWith(w.boardTitle())); }, title ?? null, { timeout: 90000 }).then(() => p.waitForTimeout(600));
// (until the view has drawn again what is now so: its frames counted, never a fixed sleep; a few animation frames first,
// so whatever was queued for them (a board's first fit) has run)
const frames = (p, n = 1) => p.evaluate(async (n) => { for (let k = 0; k < 3; k++) await new Promise((r) => requestAnimationFrame(r)); const d = window.dashboard.dock; d.redraw(); const d0 = d.drawn; await new Promise((r) => { const f = () => (d.drawn >= d0 + n && d.still() ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }); }, n);
/** A world point on the page, from the view's own camera and the canvas's rectangle (css px). */
const proj = (p, w) => p.evaluate((w) => { const d = window.dashboard.dock, cam = d.eyes.camera, cv = d.eyes.canvas; cam.updateMatrixWorld(); const V = cam.matrixWorld.clone().invert().elements, P = cam.projectionMatrix.elements;
  const m = (M, v) => [0, 1, 2, 3].map((r) => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r] * v[3]), c = m(P, m(V, [...w, 1])), r = cv.getBoundingClientRect();
  return [r.left + ((c[0] / c[3] + 1) / 2) * r.width, r.top + ((1 - c[1] / c[3]) / 2) * r.height]; }, w);
let T0 = Date.now(); async function shot(p, name) { const buf = await p.screenshot({ path: join(outDir, `${name}.png`) }); console.log(`     ${name} at ${((Date.now() - T0) / 1000).toFixed(1)} s`); return buf; }
/** The mean colour of a 7 × 7 patch round each point (css px), read from the screenshot itself. */
const patches = (p, buf, pts) => p.evaluate(async ({ b64, pts }) => { const bm = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob()), c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0); const k = bm.width / innerWidth;
  return pts.map(([px, py]) => { const d = x.getImageData(Math.round(px * k) - 3, Math.round(py * k) - 3, 7, 7).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return [r / n, g / n, b / n]; }); }, { b64: buf.toString('base64'), pts });
/** A piece's contrast against the backdrop beside it (WCAG relative luminance), sampled every 8 px of the canvas. */
const contrast = (p, buf, re) => p.evaluate(async ({ b64, re }) => {
  const bm = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob()), c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0); const k = bm.width / innerWidth;
  const d = window.dashboard.dock, cv = d.eyes.canvas, R = cv.getBoundingClientRect(), S = 8, rx = re ? new RegExp(re) : null, cols = Math.floor(R.width / S), rows = Math.floor(R.height / S), cls = [];
  // (only within the box of what is shown on the page, widened by 64 px: the backdrop farther off is never read)
  const bb = d.view.bounds(), corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => d.screenOf(bb.min.clone().set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z))), x0 = Math.min(...corners.map((c) => c[0])) - 72, x1 = Math.max(...corners.map((c) => c[0])) + 72, y0 = Math.min(...corners.map((c) => c[1])) - 72, y1 = Math.max(...corners.map((c) => c[1])) + 72;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const px = R.left + S / 2 + i * S, py = R.top + S / 2 + j * S; if (px < x0 || px > x1 || py < y0 || py > y1) { cls.push(null); continue; } const el = document.elementFromPoint(px, py); if (el !== cv) { cls.push(null); continue; } const n = d.pieceUnder(px, py); cls.push(n === '' ? 'empty' : rx ? (rx.test(n) ? 'piece' : 'other') : 'piece'); }
  const at = (i, j) => (i < 0 || j < 0 || i >= cols || j >= rows ? null : cls[j * cols + i]), lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (i, j) => { const dd = x.getImageData(Math.round((R.left + S / 2 + i * S) * k) - 1, Math.round((R.top + S / 2 + j * S) * k) - 1, 3, 3).data; let r = 0, g = 0, b = 0; for (let q = 0; q < dd.length; q += 4) { r += dd[q]; g += dd[q + 1]; b += dd[q + 2]; } const n = dd.length / 4; return 0.2126 * lin(r / n) + 0.7152 * lin(g / n) + 0.0722 * lin(b / n); };
  const piece = [], bg = [], near = 64 / S;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const c0 = at(i, j); if (!c0 || c0 === 'other') continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(i + a, j + b) !== c0)) continue; if (c0 === 'piece') piece.push([i, j]); }
  const ps = new Set(piece.map(([i, j]) => `${i},${j}`));
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { if (at(i, j) !== 'empty' || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(i + a, j + b) !== 'empty')) continue; let close = false; for (let b = -near; b <= near && !close; b++) for (let a = -near; a <= near; a++) if (ps.has(`${i + a},${j + b}`)) { close = true; break; } if (close) bg.push([i, j]); }
  if (!piece.length || !bg.length) return { ratio: 0, piece: piece.length, bg: bg.length };
  const Lp = piece.reduce((s, [i, j]) => s + lum(i, j), 0) / piece.length, Lb = bg.reduce((s, [i, j]) => s + lum(i, j), 0) / bg.length;
  return { ratio: (Math.max(Lp, Lb) + 0.05) / (Math.min(Lp, Lb) + 0.05), piece: piece.length, bg: bg.length, Lp, Lb };
}, { b64: buf.toString('base64'), re });
const boardJSON = (p) => p.evaluate(() => JSON.stringify({ nodes: window.dashboard.wall.board().nodes, edges: window.dashboard.wall.board().edges }));
const history = (p) => p.evaluate(() => window.dashboard.wall.history().at);
const state = (p) => p.evaluate(() => window.dashboard.paste.state());
async function drag(p, from, to, steps = 20) { await p.mouse.move(...from); await p.mouse.down(); const ts = []; for (let k = 1; k <= steps; k++) { const t = Date.now(); await p.mouse.move(from[0] + ((to[0] - from[0]) * k) / steps, from[1] + ((to[1] - from[1]) * k) / steps); ts.push(Date.now() - t); } ts.sort((a, b) => a - b); console.log(`     ${steps} moves: median ${ts[steps >> 1]} ms, slowest ${ts[steps - 1]} ms`); }
/** Until the preview for the point now held has come back (never a fixed sleep). */
const previewed = (p) => p.waitForFunction(() => { const s = window.dashboard.paste, l = s.last(); return !!l && !document.querySelector('.paste-card .busy:not([style*="none"])') && s.state() !== 'idle'; }, null, { timeout: 30000 }).then(() => frames(p, 4));
const chipAt = async (p) => { const b = await (await p.$('.paste-strip .chip')).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const cardBox = async (p) => (await p.$('.paste-card')).boundingBox();

async function partPaste(browser, port) {
  const { p, ctx, errs } = await open(browser, port, 'Paste a bolt onto anything');
  try {
    await p.evaluate(() => window.dashboard.enter(true)); await frames(p); await p.evaluate(() => window.dashboard.dock.focus(/^plate$/)); await frames(p);
    const start = await boardJSON(p), h0 = await history(p);
    // shot 0: before
    const s0 = await shot(p, 'i16-0-before'), g = await p.evaluate(() => { const d = window.dashboard.dock; return { grid: d.gridAt(), floor: d.view.bounds().min.y }; });
    ok(g.grid.visible && Math.abs(g.grid.y - g.floor) < 0.01 * Math.max(0.01, g.grid.cell * 10), `0: the grid laid at the floor of what is shown (grid ${g.grid.y.toFixed(5)} m, floor ${g.floor.toFixed(5)} m)`);
    const c0 = await contrast(p, s0, '^plate$'); ok(c0.ratio >= 3, `0: the plate against the backdrop beside it ${c0.ratio.toFixed(2)}:1 (${c0.piece} samples on it, ${c0.bg} beside), at least 3:1`);
    // shot 1: held at (−30, top, −30) mm
    const P = [-0.03, 0.005, -0.03], pt = await proj(p, P), t0 = Date.now(); await drag(p, await chipAt(p), pt); await previewed(p); const tPrev = Date.now() - t0;
    const s1 = await shot(p, 'i16-1-held'), st1 = await p.evaluate(() => ({ st: window.dashboard.paste.state(), drawn: window.dashboard.paste.drawn(), at: window.dashboard.paste.last()?.plan.drop.at, head: document.querySelector('.paste-card .head')?.textContent }));
    console.log(`     the drag to its preview took ${tPrev} ms (moves and one or more runs)`);
    ok(st1.st === 'held', `1: held (${st1.st})`); ok(JSON.stringify(st1.drawn) === JSON.stringify({ remove: 1, keep: 1, contact: 1 }), `1: drawn ${JSON.stringify(st1.drawn)}`);
    ok(st1.at && st1.at.every((v, i) => Math.abs(v - P[i]) < 2e-4), `1: dropped at (${(st1.at ?? []).map((v) => (v * 1000).toFixed(2)).join(', ')}) mm`); ok(/^✓ Fits:/.test(st1.head ?? ''), `1: the card says "${st1.head}"`);
    const ptsRole = { remove: await proj(p, [-0.03, 0.001, -0.03]), contact: await proj(p, [-0.03 + 0.0055, -0.0035, -0.03]), keep: await proj(p, [-0.03 + 0.006, 0.005 + 0.018, -0.03 + 0.006]) };
    const [b0, b1] = await Promise.all([patches(p, s0, Object.values(ptsRole)), patches(p, s1, Object.values(ptsRole))]);
    Object.keys(ptsRole).forEach((k, i) => { const off = hueOff(b1[i], ROLE[k]), moved = dist(b1[i], b0[i]); ok(off <= 30 && moved >= 40, `1: ${k} seen where it is drawn: hue ${off.toFixed(0)}° from its colour, moved ${moved.toFixed(0)} from shot 0 (rgb ${b1[i].map((v) => v.toFixed(0)).join(',')})`); });
    const cb1 = await cardBox(p); ok(!(pt[0] >= cb1.x && pt[0] <= cb1.x + cb1.width && pt[1] >= cb1.y && pt[1] <= cb1.y + cb1.height), '1: the card does not cover the point');
    ok((await boardJSON(p)) === start && (await history(p)) === h0, '1: the board and its history unchanged while held');
    // shot 2: released, pinned
    await p.mouse.up(); await frames(p); await shot(p, 'i16-2-pinned');
    const pin = await p.evaluate(() => { const s = window.dashboard.paste, v = window.dashboard.verdictLines(s.last().out, s.last().plan); return { st: s.state(), lines: [...document.querySelectorAll('.paste-card li')].map((x) => x.textContent), want: v.lines.map((l) => `${l.mark} ${l.text}`), go: !document.querySelector('.paste-card button[data-act=accept]').disabled }; });
    ok(pin.st === 'pinned', `2: pinned (${pin.st})`); ok(JSON.stringify(pin.lines) === JSON.stringify(pin.want) && pin.lines.length === 5, `2: the card's ${pin.lines.length} lines are verdictLines' (${pin.lines[0]})`); ok(pin.go, '2: Cut it is enabled');
    const cardChecks = await p.evaluate(() => JSON.stringify(window.dashboard.paste.last().out.checks));
    // shot 3: Enter cuts it
    await p.keyboard.press('Enter'); await settle(p); await frames(p); await shot(p, 'i16-3-cut');
    const cut = await p.evaluate(() => { const w = window.dashboard.wall, b = w.board(), ids = Object.keys(b.nodes).filter((k) => k.startsWith('pasted ')), id = ids[0], o = w.outputsOf(id), plate = (function find(x) { if (x.name === 'plate' && x.shape) return x; for (const c of x.parts ?? []) { const f = find(c); if (f) return f; } return null; })(o.part);
      return { ids, sel: w.selected(), set: b.nodes[id].set, checks: JSON.stringify(o.checks), cuts: plate?.cuts?.length, drawn: window.dashboard.paste.drawn(), st: window.dashboard.paste.state(), edges: Object.values(b.edges).filter((e) => !e.deleted && (e.to === id || e.from === id)).map((e) => `${e.from}.${e.out}>${e.to}.${e.in}`).sort() }; });
    ok((await history(p)) === h0 + 1, `3: one step of history (${h0} → ${await history(p)})`);
    ok(cut.ids.length === 1 && JSON.stringify(cut.set) === JSON.stringify({ toward: '-y', how: 'through', fit: 'medium', x: -0.03, y: 0.005, z: -0.03 }), `3: one node added, set ${JSON.stringify(cut.set)}`);
    ok(JSON.stringify(cut.edges) === JSON.stringify([`on plate.pasted>${cut.ids[0]}.part`, `screw.part>${cut.ids[0]}.it`, `${cut.ids[0]}.pasted>p1.thing`].sort()), `3: its wires ${cut.edges.join('; ')}`);
    ok(cut.checks === cardChecks, '3: the board\'s checks are the card\'s'); ok(cut.cuts === 2, `3: the plate cut twice (${cut.cuts})`); ok(cut.sel === cut.ids[0], `3: the new node chosen on the board (${cut.sel})`);
    ok(cut.st === 'idle' && cut.drawn.remove === 0, '3: no red left');
    // shot 4: Ctrl+Z
    await p.keyboard.press('Control+z'); await settle(p); await p.evaluate(() => window.dashboard.dock.focus(/^plate$/)); await frames(p); const s4 = await shot(p, 'i16-4-undone');
    ok((await boardJSON(p)) === start, '4: undone: the board as it started');
    const pz = await proj(p, P), [q0, q4] = await Promise.all([patches(p, s0, [pz]), patches(p, s4, [pz])]); ok(dist(q0[0], q4[0]) <= 12, `4: the plate there as in shot 0 (moved ${dist(q0[0], q4[0]).toFixed(1)})`);
    ok(!errs.length, `paste: no page errors${errs.length ? `: ${errs.join(' | ')}` : ''}`);
  } finally { await ctx.close(); }
}
async function partCancel(browser, port) {
  const { p, ctx, errs } = await open(browser, port, 'Paste a bolt onto anything');
  try {
    await p.evaluate(() => window.dashboard.enter(true)); await frames(p); await p.evaluate(() => window.dashboard.dock.focus(/^plate$/)); await frames(p);
    const s0 = await shot(p, 'i16-0b-before'), P = [-0.03, 0.005, -0.03], pz = await proj(p, P);
    // shots 5 and 6: Esc while held, and while pinned
    for (const [name, pinned] of [['i16-5-esc-held', false], ['i16-6-esc-pinned', true]]) {
      const j0 = await boardJSON(p), hh = await history(p), at0 = await p.evaluate(() => window.dashboard.wall.lastRun().at);
      await drag(p, await chipAt(p), await proj(p, P)); await previewed(p); if (pinned) { await p.mouse.up(); await frames(p, 2); }
      await p.keyboard.press('Escape'); if (!pinned) await p.mouse.up(); await frames(p); const s = await shot(p, name);
      const after = await p.evaluate(() => ({ st: window.dashboard.paste.state(), big: document.getElementById('dock').classList.contains('big'), at: window.dashboard.wall.lastRun().at, drawn: window.dashboard.paste.drawn() }));
      ok(after.st === 'idle' && after.drawn.remove === 0, `${name}: nothing left of the paste (${after.st})`); ok((await boardJSON(p)) === j0 && (await history(p)) === hh && after.at === at0, `${name}: board, history and last run unchanged`); ok(after.big, `${name}: still in the big view`);
      const [m0, m1] = await Promise.all([patches(p, s0, [pz]), patches(p, s, [pz])]); ok(dist(m0[0], m1[0]) <= 12, `${name}: the patch as in shot 0 (moved ${dist(m0[0], m1[0]).toFixed(1)})`);
    }
    // shot 7: refused 4 mm from the edge
    const j7 = await boardJSON(p); await drag(p, await chipAt(p), await proj(p, [-0.046, 0.005, 0])); await previewed(p); await p.mouse.up(); await frames(p); await shot(p, 'i16-7-refused');
    const r7 = await p.evaluate(() => ({ head: document.querySelector('.paste-card .head')?.textContent, go: document.querySelector('.paste-card button[data-act=accept]')?.disabled, drawn: window.dashboard.paste.drawn() }));
    ok(/Does not fit: edge distance, short by 6\.8 mm/.test(r7.head ?? ''), `7: "${r7.head}"`); ok(r7.go === true, '7: Cut it disabled');
    await p.keyboard.press('Enter'); await frames(p); ok((await boardJSON(p)) === j7, '7: Enter changes nothing'); ok(r7.drawn.remove === 1, '7: the red still drawn');
    await p.keyboard.press('Escape');
    ok(!errs.length, `cancel: no page errors${errs.length ? `: ${errs.join(' | ')}` : ''}`);
  } finally { await ctx.close(); }
}
async function partCopy(browser, port) {
  const { p, ctx, errs } = await open(browser, port, 'Paste a bolt onto anything');
  try {
    await p.evaluate(() => window.dashboard.enter(true)); await frames(p); await p.evaluate(() => window.dashboard.dock.focus(/^plate$|^round boss$/)); await frames(p);
    // (right-click the screw sitting in the first hole: the hole's record found under it, on the plate it stands in)
    const hole = await proj(p, [0.02, 0.0045, 0]);
    ok(/screw/.test(await p.evaluate(([x, y]) => window.dashboard.dock.hit(x, y)?.name ?? '', hole)), '8: the screw in the first hole under the pointer');
    await p.mouse.click(...hole, { button: 'right' }); await frames(p);
    const items = await p.$$eval('.paste-menu button', (bs) => bs.map((b) => ({ t: b.textContent, on: !b.disabled, id: b.dataset.item })));
    ok(items.some((x) => x.id === 'copy' && x.on && /made by/.test(x.t)), `8: the menu offers "${items.find((x) => x.id === 'copy')?.t}"`);
    await p.click('.paste-menu button[data-item=copy]'); await frames(p, 2);
    ok(await p.$$eval('.paste-strip .chip', (cs) => cs.some((c) => /^Copied:/.test(c.textContent))), '8: a Copied chip in the strip');
    await shot(p, 'i16-8a-copied'); const j8 = await boardJSON(p), top = await proj(p, [0.155, 0.02, 0.003]); console.log(`     the boss's top at ${top.map((v) => v.toFixed(0)).join(', ')} px`); /* (off the top's middle: the drawn lathe's pole, where its facets meet, is no point to aim a ray at) */ ok(await p.evaluate(([x, y]) => window.dashboard.dock.hit(x, y)?.name ?? '', top) === 'round boss', `8: the boss's top under the pointer (${await p.evaluate(([x, y]) => window.dashboard.dock.hit(x, y)?.name ?? 'nothing', top)})`); await p.mouse.click(...top, { button: 'right' }); await frames(p, 2); await p.click('.paste-menu button[data-item=paste]'); await previewed(p); await shot(p, 'i16-8-copy');
    const v8 = await p.evaluate(() => { const s = window.dashboard.paste, v = window.dashboard.verdictLines(s.last().out, s.last().plan); return { st: s.state(), lines: [...document.querySelectorAll('.paste-card li')].map((x) => x.textContent), want: v.lines.map((l) => `${l.mark} ${l.text}`), head: document.querySelector('.paste-card .head')?.textContent, its: s.last().plan.recipe.wires }; });
    ok(v8.st === 'pinned', `8: pinned on the boss's top (${v8.head})`); ok(JSON.stringify(v8.lines) === JSON.stringify(v8.want), '8: the card is verdictLines of the session\'s run');
    ok(JSON.stringify(v8.its) === JSON.stringify([{ in: 'it', from: 'screw', out: 'part' }]), '8: its screw from the one screw node (R15)');
    await p.keyboard.press('Escape'); await frames(p, 2); ok((await boardJSON(p)) === j8 && (await state(p)) === 'idle', '8: Esc changes nothing');
    ok(!errs.length, `copy: no page errors${errs.length ? `: ${errs.join(' | ')}` : ''}`);
  } finally { await ctx.close(); }
}
async function partPhone(browser, port) {
  const { p, ctx, errs } = await open(browser, port, 'Paste a bolt onto anything', { viewport: { width: 390, height: 844 }, touch: true });
  try {
    await p.evaluate(() => window.dashboard.enter(true)); await frames(p); await p.evaluate(() => window.dashboard.dock.focus(/^plate$/)); await frames(p);
    const j9 = await boardJSON(p); await p.tap('.paste-strip .chip'); await frames(p, 2); ok((await state(p)) === 'armed', `9: the chip armed by a tap (${await state(p)})`);
    const at = await proj(p, [-0.03, 0.005, -0.03]); await p.touchscreen.tap(...at); await previewed(p); await shot(p, 'i16-9-phone');
    const btns = await p.$$eval('.paste-card button', (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return [b.textContent, r.width, r.height]; }));
    ok(await p.$eval('.paste-card', (c) => !!c.querySelector('details.more') && !c.querySelector('details.more').open), '9: the checks folded on the phone, the part left in sight'); ok((await state(p)) === 'pinned' && btns.length === 2 && btns.every(([, w, h]) => w >= 44 && h >= 44), `9: pinned, its buttons ${btns.map(([t, w, h]) => `${t} ${w.toFixed(0)}×${h.toFixed(0)}`).join(', ')} px`);
    await p.tap('.paste-card button[data-act=cancel]'); await frames(p, 2); ok((await boardJSON(p)) === j9 && (await state(p)) === 'idle', '9: Cancel leaves the board unchanged');
    ok(!errs.length, `phone: no page errors${errs.length ? `: ${errs.join(' | ')}` : ''}`);
  } finally { await ctx.close(); }
}
async function partD16(browser, port) {
  for (const [title, name] of [['Paste a bolt onto anything', 'd16-paste'], ['The cover follows the bore', 'd16-cover']]) {
    const { p, ctx, errs } = await open(browser, port, title);
    try {
      await p.evaluate(() => window.dashboard.dock.fit()); await frames(p); const s = await shot(p, name), c = await contrast(p, s, null);
      const g = await p.evaluate(() => { const d = window.dashboard.dock, el = document.getElementById('stat3d'), r = el.getBoundingClientRect(), was = el.style.pointerEvents; el.style.pointerEvents = 'auto'; /* (a label no press takes is skipped by hit testing: made pressable for the look, so what is painted on top is what is found) */ const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); el.style.pointerEvents = was; return { grid: d.gridAt(), floor: d.view.bounds().min.y, label: top === el || el.contains(top), text: el.textContent }; });
      ok(c.ratio >= 3, `${name}: what is shown against the backdrop beside it ${c.ratio.toFixed(2)}:1 (${c.piece} samples on it, ${c.bg} beside)`);
      ok(g.grid.visible && Math.abs(g.grid.y - g.floor) < 0.01 * Math.max(0.01, g.grid.cell * 10), `${name}: the grid at the floor (${g.grid.y.toFixed(4)} m; floor ${g.floor.toFixed(4)} m)`);
      ok(g.label, `${name}: the label above the canvas: "${g.text}"`);
      ok(!errs.length, `${name}: no page errors${errs.length ? `: ${errs.join(' | ')}` : ''}`);
    } finally { await ctx.close(); }
  }
}
(async () => {
  const server = await serve(), port = server.address().port, browser = await chromium.launch(), parts = { paste: partPaste, cancel: partCancel, copy: partCopy, phone: partPhone, d16: partD16 };
  try { for (const [k, f] of Object.entries(parts)) { if (only && only !== k) continue; const t0 = Date.now(); T0 = t0; console.log(`— ${k}`); await Promise.race([f(browser, port), new Promise((_, no) => setTimeout(() => no(new Error(`${k}: over two minutes`)), 120000))]).catch(async (e) => { ok(false, e.message); await current?.close().catch(() => {}); }); console.log(`     ${k} took ${((Date.now() - t0) / 1000).toFixed(1)} s`); } }
  finally { await browser.close(); server.close(); }
  console.log(fails ? `${fails} FAIL` : 'all ok'); process.exit(fails ? 1 : 0);
})();
