// The contact sheet: every seed.* assembly of the library opened at its default settings on a board holding it, one
// 320x240 picture each in the 3D view's three-quarter view (front right, above), on ONE page, docs/sheet/index.html,
// each captioned by id and piece count, with a line for every assembly that did not open (its error).
//   node scripts/sheet.cjs            (ONLY=<regexp> limits it to some ids; SHEET_TMP=<dir> moves the build's scratch)
// It builds the viewer, serves it on a port from 5900 to 5999, and stops the server and the browser when it ends.
const { chromium } = require('playwright');
const { createServer } = require('node:http'), { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, rmSync } = require('node:fs'), { join, extname, resolve } = require('node:path');

const ROOT = resolve(__dirname, '..'), TMP = process.env.SHEET_TMP ?? '/tmp/claude-0/-home-user-claude-code/3ceee736-75a9-5144-bf35-df6b73639671/scratchpad/sheet';
const DIST = join(TMP, 'dist'), OUT = join(ROOT, 'docs/sheet'), ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The seed.* ids, read from the library itself (its source bundled for node by vite, as the viewer is). */
async function seedIds() {
  mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'ids.ts'), `import '${ROOT}/src/nexus/seeds';\nimport { LIBRARY } from '${ROOT}/src/nexus/blocks';\nexport const ids = [...LIBRARY.values()].filter((b) => b.id.startsWith('seed.')).map((b) => ({ id: b.id, name: b.name }));\n`);
  const { build } = await import(join(ROOT, 'node_modules/vite/dist/node/index.js'));
  await build({ configFile: false, logLevel: 'error', root: TMP, ssr: { noExternal: true }, build: { ssr: join(TMP, 'ids.ts'), outDir: join(TMP, 'ids'), emptyOutDir: true, target: 'node22', rollupOptions: { output: { format: 'es', entryFileNames: 'ids.mjs' } } } });
  return (await import(join(TMP, 'ids/ids.mjs') + `?t=${Date.now()}`)).ids;
}

(async () => {
  const t00 = Date.now();
  execFileSync('npx', ['vite', 'build', '--config', 'vite.view.config.ts', '--logLevel', 'error', '--outDir', DIST], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  const all = (await seedIds()).filter((s) => !ONLY || ONLY.test(s.id)); console.log(`${all.length} seed assemblies; built in ${((Date.now() - t00) / 1000).toFixed(0)} s`);
  rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });

  const server = createServer((req, res) => { const u = decodeURIComponent((req.url ?? '/').split('?')[0]), p = join(DIST, u === '/' ? 'index.html' : u);
    if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
  let port = 0; for (let p = 5900; p < 6000 && !port; p++) { try { await new Promise((ok, no) => { server.once('error', no); server.listen(p, '127.0.0.1', () => { server.removeListener('error', no); ok(); }); }); port = p; } catch { /* taken */ } }
  if (!port) throw new Error('no free port from 5900 to 5999');
  const browser = await chromium.launch(), done = [], failed = [];
  try {
    // (a page that shrinks a picture to 320x240 as a jpeg at quality 60, the whole picture kept and the rest of the frame its own colour)
    const queue = [...all], work = async () => { const shrink = await browser.newPage();
    for (let job; (job = queue.shift());) { const { id, name } = job;
      const t0 = Date.now(), p = await browser.newPage({ viewport: { width: 1200, height: 800 } }), errs = []; p.on('pageerror', (e) => errs.push(e.message.split('\n')[0])); p.setDefaultTimeout(40000);
      try {
        const board = { title: `Sheet: ${id}`, kind: 'pipeline', nodes: { a: { label: name, block: id, set: {}, x: 0, y: 0 } }, edges: {}, createdAt: 0, updatedAt: 0 };
        await p.addInitScript((b) => { try { localStorage.clear(); localStorage.setItem('nexus.nodeboard.v1', b); } catch { /* none */ } }, JSON.stringify(board));
        await p.goto(`http://127.0.0.1:${port}/index.html?full`); await p.waitForTimeout(800);
        const tw = Date.now(); let calm = 0;
        while (Date.now() < tw + 30000) { const settled = await p.evaluate(() => window.nexusNodes?.settled?.() ?? false); calm = settled ? (calm || Date.now()) : 0; if (calm && Date.now() - calm > 800) break; await p.waitForTimeout(200); }
        const info = await p.evaluate(() => { const st = window.nexusNodes.state('a'), b = window.dashboard.wall.outputsOf('a')?.block; return { pieces: b ? b.pieces.length : -1, error: st?.error ? String(st.error) : '', status: String(st?.status ?? st?.state ?? '') }; });
        if (info.pieces < 0) throw new Error(info.error || `it made no block (${info.status || 'no state'})`);
        await p.click('#enter3d'); await p.waitForTimeout(500); await p.click('#fit3d'); await p.waitForTimeout(900);
        const canvas = await p.$('#dock canvas'); if (!canvas) throw new Error('no 3D view canvas');
        const png = (await canvas.screenshot({ type: 'png' })).toString('base64');
        const jpg = await shrink.evaluate(async (src) => { const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode(); const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.fillStyle = '#10151f'; g.fillRect(0, 0, 320, 240);
          const k = Math.min(320 / img.width, 240 / img.height); g.drawImage(img, (320 - img.width * k) / 2, (240 - img.height * k) / 2, img.width * k, img.height * k); return c.toDataURL('image/jpeg', 0.6).split(',')[1]; }, png);
        const file = id.replace(/[^\w.-]/g, '_') + '.jpg'; writeFileSync(join(OUT, file), Buffer.from(jpg, 'base64'));
        done.push({ id, name, pieces: info.pieces, file }); console.log(`ok   ${String(Date.now() - t0).padStart(6)} ms  ${id}  ${info.pieces} pieces${errs.length ? `  (${errs.length} page errors)` : ''}`);
      } catch (e) { failed.push({ id, name, error: e.message.split('\n')[0] }); console.log(`FAIL ${String(Date.now() - t0).padStart(6)} ms  ${id}  ${e.message.split('\n')[0]}`); }
      await p.close();
    } };
    await Promise.all([work(), work(), work()]);
  } finally { await browser.close(); server.close(); }

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nexus contact sheet</title>
<style>body{margin:0;padding:16px;background:#070a10;color:#dfe7f1;font:13px/1.4 system-ui,sans-serif}h1{font-size:18px;margin:0 0 4px}p{color:#8796aa;margin:0 0 14px}
.g{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;width:320px;background:#0d121b;border:1px solid #1f2a3a;border-radius:8px;overflow:hidden}figure img{display:block;width:320px;height:240px}
figcaption{padding:5px 8px;display:flex;justify-content:space-between;gap:8px}figcaption b{font-weight:600}figcaption span{color:#8796aa;white-space:nowrap}
.bad{margin-top:18px}.bad li{color:#ff8a80;margin:3px 0}.bad code{color:#dfe7f1}</style></head><body>
<h1>Nexus contact sheet</h1><p>${done.length} of ${done.length + failed.length} seed assemblies, each at its default settings, seen from the front right above (the 3D view's own fit). Made by <code>node scripts/sheet.cjs</code>.</p>
<div class="g">${done.map((d) => `<figure><img src="${esc(d.file)}" alt="${esc(d.id)}" width="320" height="240"><figcaption><b>${esc(d.id)}</b><span>${d.pieces} pieces</span></figcaption></figure>`).join('')}</div>
${failed.length ? `<ul class="bad"><li><b>${failed.length} did not open:</b></li>${failed.map((f) => `<li><code>${esc(f.id)}</code>: ${esc(f.error)}</li>`).join('')}</ul>` : ''}</body></html>\n`;
  writeFileSync(join(OUT, 'index.html'), html);
  console.log(`docs/sheet/index.html: ${done.length} pictures, ${failed.length} failed, ${((Date.now() - t00) / 1000).toFixed(0)} s`);
})().catch((e) => { console.error(e); process.exit(1); });
