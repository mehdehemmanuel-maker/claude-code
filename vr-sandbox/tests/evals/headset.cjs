// Headset comfort, measured (spec 04, task P10; decision 0012): the space page in an emulated Meta Quest 3 (Meta's IWER),
// each panel's distance and angles from the eye, the board's text and the smallest targets in degrees, before and after
// the player walks; each compared with its limit, and the run fails (exit 1) on any one outside it. An emulator, not a
// headset: a real Quest is spec 03's (W5). Run: `npm run eval:headset` (builds the pages first).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../../dist-view'), shots = process.argv[2];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.md': 'text/plain' };
// The limits (research 34 from Meta's comfort and panel pages; decision 0012 for the chat's place and the bar's size):
const LIMITS = [
  // (the board's distance and angle below the eye are its canvas's (below); the group, strip and side panel with it, is
  // what is centred)
  ['board off centre (°)', (m) => Math.abs(m.board.side), 0, 2],
  ['bar width (°, within the 58° Meta designs for)', (m) => m.bar.width, 0, 58],
  ['bar rows (two in a headset)', (m) => m.bar.rows, 2, 2],
  ['chat to the side (°, 42 by decision 0012, within the 55° most of a head turn)', (m) => Math.abs(m.chat.side), 40, 44],
  ['chat clear of the board (° between their edges)', (m) => Math.abs(m.chat.side) - m.chat.width / 2 - m.board.width / 2, 0, 90],
  ['chat distance (m)', (m) => m.chat.distance, 1.2, 1.4],
  ['keyboard distance (m, outside the 0.5 to 0.8 m band)', (m) => m.keyboard.distance, 0.85, 0.95],
  ['keyboard below the eye (°, 45 by the task)', (m) => m.keyboard.below, 43, 47],
  ['keyboard clear of the bar (° between their edges, seen from the eye)', (m) => (m.keyboard.below - m.keyboard.height / 2) - (m.bar.below + m.bar.height / 2), 0, 90],
  ['bar clear of the board (° between their edges)', (m) => (m.bar.below - m.bar.height / 2) - (m.board.below + m.board.height / 2), 0, 90],
  ['board text, smallest (11 px), em (°, 0.4 the least)', (m) => m.text.width, 0.4, 5],
  ['board text, usual (13 px), em (°, 0.6 comfortable)', (m) => m.text13.width, 0.6, 5],
  ['smallest bar target (°)', (m) => m['bar target'].width, 2.5, 90],
  ['smallest chat target (°)', (m) => m['chat target'].width, 2.5, 90],
  ['smallest key (°)', (m) => m.key.width, 2.5, 90],
  ['smallest target on the board\'s strip (°)', (m) => m['strip target'].width, 2.5, 90],
  ['strip text, smallest (°, 0.6 comfortable)', (m) => m['strip text'].width, 0.6, 5],
  ['side panel text, smallest (°, 0.6 comfortable)', (m) => m['side text'].width, 0.6, 5],
  ['smallest block on the board (°: a hand chooses and moves it; ports are wired from the side panel)', (m) => m.block.width, 2.5, 90],
  // (as the eye sees them: every target, each from its corners where it stands; the board's text at nine points across its
  // canvas; the canvas itself, its width in css px and where it stands (the evaluator, 2026-11-01))
  ['every target a hand presses, the smallest as seen (°)', (m) => m['every target'].width, 2.5, 90],
  ['board text as seen, 13 px, the least across the canvas (°)', (m) => m['board text seen'].width, 0.6, 5],
  ['board text as seen, 11 px, the least across the canvas (°)', (m) => m['board text seen'].height, 0.4, 5],
  ['board canvas drawn at 780 css px', (m) => m.canvas.width, 780, 780],
  ['board canvas below the eye (°, 10 by the task)', (m) => m.canvas.below, 8, 12],
  ['board canvas distance (m, 1.25 by the task)', (m) => m.canvas.distance, 1.15, 1.35],
];
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }).listen(4179);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  let fails = 0; const bad = (s) => { fails++; console.log(`FAIL ${s}`); };
  try {
    pg.on('pageerror', (e) => console.log('page error:', e.message));
    await pg.goto('http://localhost:4179/space.html?emulate'); await pg.waitForTimeout(4000);
    await pg.locator('button', { hasText: /enter vr/i }).first().click(); await pg.waitForTimeout(1500);
    if (!(await pg.evaluate(() => window.space.presenting()))) { bad('the emulated headset did not start'); return; }
    await pg.evaluate(() => window.space.keyboard()); await pg.waitForTimeout(300);
    const before = await pg.evaluate(() => window.space.comfort());
    for (const [name, f, lo, hi] of LIMITS) { let v; try { v = f(before); } catch { v = NaN; } const ok = v >= lo && v <= hi; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${Number.isFinite(v) ? v.toFixed(2) : 'not measured'} (limit ${lo} to ${hi})`); if (!ok) fails++; }
    console.log(`     (the smallest target seen: ${before['every target']?.what})`);
    if (shots) await pg.screenshot({ path: path.join(shots, 'headset-panels.png') });
    // (the side panel in its other states: a block chosen, with inputs a hand changes, and the library; each target and
    // each text measured there too)
    for (const mode of ['chosen', 'library']) {
      const what = await pg.evaluate((m) => window.space.emulate.side(m), mode); await pg.waitForTimeout(200); const m = await pg.evaluate(() => window.space.comfort());
      for (const [name, v, lo] of [[`side panel target, ${mode} (${what})`, m['side target']?.width, 2.5], [`side panel text, ${mode} (${what})`, m['side text']?.width, 0.6]]) { const ok = v >= lo; console.log(`${ok ? 'ok  ' : 'FAIL'} smallest ${name} (°): ${Number.isFinite(v) ? v.toFixed(2) : 'not measured'} (limit ${lo} or more)`); if (!ok) fails++; }
      if (shots) await pg.screenshot({ path: path.join(shots, `headset-side-${mode}.png`) });
    }
    await pg.evaluate(() => window.space.emulate.side('chosen'));
    // (every block stays a target a hand can press, and the board's text as drawn readable, however far the board is
    // zoomed out: ten presses of the strip's −; no minimap to press there)
    await pg.evaluate(() => { for (let i = 0; i < 10; i++) window.space.wall.zoom(1 / 1.25); }); await pg.waitForTimeout(200);
    { const m = await pg.evaluate(() => window.space.comfort()), mapShown = await pg.evaluate(() => window.space.wall.mapShown());
      for (const [name, v, lo] of [['smallest block', m.block?.width, 2.5], ['every target, the smallest as seen', m['every target']?.width, 2.5], ['board text as seen (11 px), the least', m['board text seen']?.height, 0.4], ['board text as seen (13 px), the least', m['board text seen']?.width, 0.6]]) { const ok = v >= lo; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} after zooming out ten times (°): ${Number.isFinite(v) ? v.toFixed(2) : 'not measured'} (limit ${lo} or more)`); if (!ok) fails++; }
      console.log(`${mapShown ? 'FAIL' : 'ok  '} no minimap drawn in the headset (it was 1.1° tall)`); if (mapShown) fails++; }
    // (the whole canvas scanned, every 10 css px: a ray takes a block or the sheet, never a port, a wire or anything else)
    { const kinds = await pg.evaluate(() => { const w = window.space.wall, out = {}; for (let x = 2; x < w.canvas.clientWidth; x += 10) for (let y = 2; y < w.canvas.clientHeight; y += 10) { const k = w.probe(x, y) ?? 'sheet'; out[k] = (out[k] ?? 0) + 1; } return out; });
      const bad = Object.keys(kinds).filter((k) => k !== 'node' && k !== 'sheet'); console.log(`${bad.length ? 'FAIL' : 'ok  '} the canvas scanned: a ray takes ${JSON.stringify(kinds)}`); if (bad.length) fails++; }
    // (a ray on a block's port presses no port: ports and wires are wired from the side panel in a headset)
    { const k = await pg.evaluate(() => { const w = window.space.wall; for (const id of Object.keys(w.board().nodes)) { const p = w.portPoint(id); if (p && p.x > 0 && p.y > 0 && p.x < w.canvas.clientWidth && p.y < w.canvas.clientHeight) return w.probe(p.x, p.y) ?? 'nothing'; } return 'no port in view'; });
      const ok = k !== 'out' && k !== 'in' && k !== 'wire' && k !== 'no port in view'; console.log(`${ok ? 'ok  ' : 'FAIL'} a ray on a port takes: ${k} (never the port itself)`); if (!ok) fails++; }
    // (the B key, which on a screen makes the board larger, changes nothing in a headset: every limit held after it)
    await pg.keyboard.press('b'); await pg.waitForTimeout(300);
    { const m = await pg.evaluate(() => window.space.comfort()); let n = 0; for (const [name, f, lo, hi] of LIMITS) { let v; try { v = f(m); } catch { v = NaN; } if (!(v >= lo && v <= hi)) { n++; console.log(`FAIL after pressing B: ${name}: ${Number.isFinite(v) ? v.toFixed(2) : 'not measured'}`); } } console.log(`${n ? 'FAIL' : 'ok  '} after pressing B every limit holds`); fails += n; }
    // (a wire made as a hand makes it in a headset: a block's output from the side panel, another block, its input there)
    const wired = await pg.evaluate(() => {
      const w = window.space.wall, n = () => Object.values(w.board().edges).filter((e) => !e.deleted && e.in).length, n0 = n();
      w.add('in.number'); const a = window.space.emulate.press('→ wire');
      w.add('law.newton.second'); const b = window.space.emulate.press('← here', 0);
      return { pressed: a && b, before: n0, after: n() };
    });
    { const ok = wired.pressed && wired.after === wired.before + 1; console.log(`${ok ? 'ok  ' : 'FAIL'} a wire made from the side panel's buttons: ${wired.pressed ? 'pressed' : 'a button was not there'}, wires ${wired.before} to ${wired.after}`); if (!ok) fails++; }
    if (shots) await pg.screenshot({ path: path.join(shots, 'headset-wired.png') });
    // (walked two ways: by carry(), and by the left stick as a hand pushes it, the way walking goes in use (a stick that
    // moved the player and not the panels passed when only carry() was tried: the evaluator, 2026-11-01))
    const moved = (before, after, how) => { let n = 0; for (const k of Object.keys(before)) for (const f of ['distance', 'side', 'below']) if (Math.abs(before[k][f] - after[k][f]) > 1e-4) { n++; bad(`${k} ${f} moved when the player walked ${how} (${before[k][f].toFixed(3)} to ${after[k][f].toFixed(3)})`); } return n; };
    await pg.evaluate(() => window.space.carry(2, -3)); await pg.waitForTimeout(300);
    const n1 = moved(before, await pg.evaluate(() => window.space.comfort()), 'by carry()');
    console.log(`after walking 2 m right and 3 m ahead: ${n1 ? 'see above' : 'every panel where it was'}`);
    const e0 = await pg.evaluate(() => window.space.emulate.eye()), c0 = await pg.evaluate(() => window.space.comfort());
    await pg.evaluate(() => window.space.emulate.walk(0, -1)); await pg.waitForTimeout(1500); await pg.evaluate(() => window.space.emulate.walk(0, 0)); await pg.waitForTimeout(300);
    const e1 = await pg.evaluate(() => window.space.emulate.eye()), walked = Math.hypot(e1[0] - e0[0], e1[2] - e0[2]);
    if (walked < 0.5) bad(`the left stick, pushed forward for 1.5 s, moved the player only ${walked.toFixed(2)} m`);
    const n2 = moved(c0, await pg.evaluate(() => window.space.comfort()), 'by the left stick');
    console.log(`after the left stick pushed forward (the player moved ${walked.toFixed(2)} m): ${n2 ? 'see above' : 'every panel where it was'}`);
  } finally { await b.close(); srv.close(); console.log(fails ? `\n${fails} outside their limits` : '\nall within their limits'); process.exitCode = fails ? 1 : 0; }
})();
