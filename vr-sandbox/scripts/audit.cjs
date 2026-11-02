// The audit: every starter board opened in the built app, as a person would open it, and what is wrong with it written
// down without anyone having to ask. For each board: whether it ran (its nodes failed or its checks fail, from the
// dashboard's own gauges), how long the page did not answer while it opened, what the page threw, and a screenshot to
// be looked at (blocky, pieces through each other, nothing shown, panels clipped: a person's eye, or a vision model's,
// judges those; this script only takes the pictures). Then what the code says of itself: places still written by hand
// (scripts/by-hand.mjs). The critic agent (../.claude/agents/critic.md) runs this first and works from what it writes.
//
//   npx vite build --config vite.view.config.ts --logLevel error && node scripts/audit.cjs [out folder] [only boards
//   whose title starts so]
// Writes <out>/audit.json and <out>/<n>.png (out: .audit/, kept out of git).

const { chromium } = require('playwright');
const { createServer } = require('node:http'), { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } = require('node:fs'), { join, extname, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = resolve(__dirname, '..'), DIST = join(ROOT, 'dist-view'), OUT = resolve(process.argv[2] ?? join(ROOT, '.audit')), ONLY = process.argv[3] ?? '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
// (the starter boards' titles, read from their source: each is the first string of a [title, () => …] row)
const titles = [...readFileSync(join(ROOT, 'src/nexus/starters.ts'), 'utf8').matchAll(/^  \['((?:[^'\\]|\\.)*)', \(\) => \{/gm)].map((m) => m[1].replace(/\\'/g, "'")).filter((t) => t.startsWith(ONLY));

(async () => {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('build the app first: npx vite build --config vite.view.config.ts --logLevel error');
  mkdirSync(OUT, { recursive: true });
  const server = createServer((req, res) => { const u = decodeURIComponent((req.url ?? '/').split('?')[0]), p = join(DIST, u === '/' ? 'index.html' : u);
    if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
  await new Promise((ok) => server.listen(0, ok));
  const port = server.address().port, browser = await chromium.launch(), rows = [];
  try {
    for (const [n, title] of titles.entries()) {
      const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } }), errors = []; p.on('pageerror', (e) => errors.push(e.message.split('\n')[0])); p.setDefaultTimeout(180000);
      const row = { n, title, ran: false, nodes: '', fails: '', freezeMs: 0, errors, shot: '' };
      try {
        await p.goto(`http://127.0.0.1:${port}/index.html`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
        const q = title.slice(0, 40); await p.fill('#libQ', q); await p.waitForTimeout(500);
        let hit = null; for (const r of await p.$$('#shelves .blk')) if ((await r.textContent()).includes(q.slice(0, 25))) { hit = r; break; }
        if (!hit) { row.fails = 'not found in the library by its title'; rows.push(row); await p.close(); continue; }
        const t0 = Date.now(); await hit.click({ noWaitAfter: true });
        // (the page answers between tasks only: the longest wait for an answer is the longest freeze while it opens)
        let longest = 0; while (Date.now() < t0 + 15000) { const a = Date.now(); await p.evaluate(() => 0); longest = Math.max(longest, Date.now() - a); await p.waitForTimeout(250); }
        row.freezeMs = longest;
        const gauges = await p.$eval('#gauges', (e) => e.innerText).catch(() => '');
        const m = /(\d+)\/(\d+)\s*NODES/i.exec(gauges); row.nodes = m ? `${m[1]}/${m[2]}` : '—'; row.ran = !!m && m[1] === m[2];
        row.fails = (gauges.match(/\d+ failed|\d+ checks? fails?/gi) ?? []).join(', ');
        row.shot = join(OUT, `${n}.png`); await p.screenshot({ path: row.shot });
      } catch (e) { row.fails = `the audit could not open it: ${e.message.split('\n')[0]}`; }
      rows.push(row); await p.close();
      console.log(`${row.ran && !row.fails && !errors.length && row.freezeMs < 2000 ? 'ok  ' : 'BAD '} ${String(row.freezeMs).padStart(6)} ms  ${row.nodes.padEnd(7)} ${row.fails || ''}${errors.length ? ` (${errors.length} page errors)` : ''}  ${title.slice(0, 70)}`);
    }
  } finally { await browser.close(); server.close(); }
  let byHand = ''; try { byHand = execFileSync('node', [join(ROOT, 'scripts/by-hand.mjs')], { encoding: 'utf8' }).trim().split('\n').pop(); } catch (e) { byHand = `by-hand failed: ${e.message}`; }
  const bad = rows.filter((r) => !r.ran || r.fails || r.errors.length || r.freezeMs >= 2000);
  writeFileSync(join(OUT, 'audit.json'), JSON.stringify({ boards: rows, bad: bad.length, byHand }, null, 1));
  console.log(`${rows.length} boards opened, ${bad.length} with something wrong a person would see (failed nodes or checks, page errors, a freeze of 2 s or more); ${byHand}; written to ${OUT}`);
})();
