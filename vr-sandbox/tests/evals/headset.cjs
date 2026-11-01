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
  ['board distance (m)', (m) => m.board.distance, 1.15, 1.35],
  ['board below the eye (°)', (m) => m.board.below, 8, 12],
  ['board off centre (°)', (m) => Math.abs(m.board.side), 0, 2],
  ['bar width (°, within the 58° Meta designs for)', (m) => m.bar.width, 0, 58],
  ['chat to the side (°, within the 55° most of a head turn)', (m) => Math.abs(m.chat.side), 0, 55],
  ['chat clear of the board (° between their edges)', (m) => Math.abs(m.chat.side) - m.chat.width / 2 - m.board.width / 2, 0, 90],
  ['chat distance (m)', (m) => m.chat.distance, 1.2, 1.4],
  ['keyboard distance (m, outside the 0.5 to 0.8 m band)', (m) => m.keyboard.distance, 0.85, 0.95],
  ['keyboard clear of the bar (° between their edges, seen from the eye)', (m) => (m.keyboard.below - m.keyboard.height / 2) - (m.bar.below + m.bar.height / 2), 0, 90],
  ['bar clear of the board (° between their edges)', (m) => (m.bar.below - m.bar.height / 2) - (m.board.below + m.board.height / 2), 0, 90],
  ['board text, smallest (11 px), em (°, 0.4 the least)', (m) => m.text.width, 0.4, 5],
  ['board text, usual (13 px), em (°, 0.6 comfortable)', (m) => m.text13.width, 0.6, 5],
  ['smallest bar target (°)', (m) => m['bar target'].width, 2.5, 90],
  ['smallest chat target (°)', (m) => m['chat target'].width, 2.5, 90],
  ['smallest key (°)', (m) => m.key.width, 2.5, 90],
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
    if (shots) await pg.screenshot({ path: path.join(shots, 'headset-panels.png') });
    await pg.evaluate(() => window.space.carry(2, -3)); await pg.waitForTimeout(300);
    const after = await pg.evaluate(() => window.space.comfort());
    for (const k of Object.keys(before)) for (const f of ['distance', 'side', 'below']) if (Math.abs(before[k][f] - after[k][f]) > 1e-6) bad(`${k} ${f} moved when the player walked (${before[k][f].toFixed(3)} to ${after[k][f].toFixed(3)})`);
    console.log(`after walking 2 m right and 3 m ahead: ${fails ? 'see above' : 'every panel where it was'}`);
  } finally { await b.close(); srv.close(); console.log(fails ? `\n${fails} outside their limits` : '\nall within their limits'); process.exitCode = fails ? 1 : 0; }
})();
