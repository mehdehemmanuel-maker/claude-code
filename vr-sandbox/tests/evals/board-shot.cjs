// A starter board opened in the built dashboard and photographed, as a person sees it: its nodes, the 3D view of what it
// makes, its run log. Build the pages first (npx vite build --config vite.view.config.ts), then:
//   node tests/evals/board-shot.cjs "Paste a bolt onto anything" out.png [wait ms]
// It serves dist-view itself, opens the board by searching the library for its title, and prints whether it was found and
// any page errors. Playwright as the headset's run loads it: preinstalled, found by require.
const { chromium } = require('playwright');
const { createServer } = require('node:http'), { readFileSync, existsSync, statSync } = require('node:fs'), { join, extname, resolve } = require('node:path');
const DIST = resolve(__dirname, '../../dist-view'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
(async () => {
  const [q, out, wait] = process.argv.slice(2); if (!q || !out) { console.log('usage: node tests/evals/board-shot.cjs "<board title>" out.png [wait ms]'); process.exit(2); }
  const server = createServer((req, res) => { const u = decodeURIComponent((req.url ?? '/').split('?')[0]), p = join(DIST, u === '/' ? 'index.html' : u);
    if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
  await new Promise((ok) => server.listen(0, ok)); const port = server.address().port, b = await chromium.launch(), errs = [];
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${port}/index.html`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
    await p.fill('#libQ', q); await p.waitForTimeout(700);
    let hit = false; for (const r of await p.$$('#shelves .blk')) if ((await r.textContent()).includes(q)) { await r.click({ noWaitAfter: true, timeout: 120000 }).catch(() => {}); hit = true; break; }
    await p.fill('#libQ', '', { timeout: 180000 }).catch(() => {}); await p.waitForTimeout(Number(wait ?? 6000));
    const fit = await p.$('button:has-text("Fit")'); if (fit) await fit.click(); await p.waitForTimeout(1500);
    await p.screenshot({ path: out }); console.log(hit ? 'opened' : 'NOT FOUND', errs.length ? errs.join('\n') : 'no errors');
  } finally { await b.close(); server.close(); }
})();
