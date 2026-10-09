// The forge room as the user stands in it: serves a built viewer, opens the forge, stands what is asked before you (as
// "3d <words>" does: the library's drawing, whole) and saves a screenshot, so a part is judged in the room it will be
// seen in, not only on the look page's bench. Run after building the viewer:
//   node tools/forge-look.mjs <built viewer dir> <out dir> "name|sbc pi5 8GB" ["name2|bolt M8x30|key=1&env=0.4"] …
// (a third field: the forge's own query, its light to try: key=, sky=, env=)
// LOOK_W, LOOK_H: the window's size. Prints what the forge said, and errors.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [rootArg, outArg, ...asks] = process.argv.slice(2);
if (!rootArg || !outArg || !asks.length) { console.log('node tools/forge-look.mjs <viewer dir> <out dir> "name|words" …'); process.exit(1); }
const root = path.resolve(rootArg), out = path.resolve(outArg); fs.mkdirSync(out, { recursive: true });
let pw; try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((ok) => server.listen(0, ok)); const port = server.address().port;
const b = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: Number(process.env.LOOK_W ?? 1280), height: Number(process.env.LOOK_H ?? 820) } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
let at = null;
for (const a of asks) {
  const [name, words, query = ''] = a.split('|');
  if (at !== query) { at = query; await p.goto(`http://localhost:${port}/forge.html${query ? `?${query}` : ''}`); await p.waitForFunction(() => window.ready === true && typeof window.see3d === 'function', null, { timeout: 120000 }); }
  const said = await p.evaluate((w) => window.see3d(`${w}`), words);
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${name}.png` }); console.log(name, String(said).slice(0, 200));
}
console.log('errors:', errs.slice(0, 5).join(' | ') || 'none');
await b.close(); server.close();
