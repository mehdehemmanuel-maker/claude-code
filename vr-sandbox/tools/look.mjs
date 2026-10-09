// Render anything the library draws from named views, as a person would first see it: serves a built viewer, opens
// its look page for each ask and saves a screenshot. Run after building the viewer
// (npx vite build --config vite.view.config.ts --logLevel error --outDir ../dist-view-dev --emptyOutDir):
//
//   node tools/look.mjs <built viewer dir> <out dir> "name|words=sbc opi5 8GB&view=top" "name2|words=…&view=three"
//
// Each ask is a name and the look page's query (kit=part is added; view=top|three|front|side|rear|under, or dir=x,y,z;
// zoom, explode, only, hide, hi, cut, ortho=1: see src/nexus/view/look.ts). Prints what each look reports, and errors.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [rootArg, outArg, ...asks] = process.argv.slice(2);
if (!rootArg || !outArg || !asks.length) { console.log('node tools/look.mjs <viewer dir> <out dir> "name|query" …'); process.exit(1); }
const root = path.resolve(rootArg), out = path.resolve(outArg); fs.mkdirSync(out, { recursive: true });
let pw; try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((ok) => server.listen(0, ok)); const port = server.address().port;
const b = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: Number(process.env.LOOK_W ?? 1280), height: Number(process.env.LOOK_H ?? 820) } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); else if (/^probes:/.test(m.text())) console.log(m.text()); });
for (const a of asks) {
  const [name, query] = a.split('|');
  // (a page that works long before it is ready, its reflection probes on software GL: waited on past its load, LOOK_WAIT ms)
  await p.goto(`http://localhost:${port}/look.html?kit=part&${query}`, { waitUntil: 'commit' });
  try { await p.waitForFunction(() => window.lookReady, null, { timeout: Number(process.env.LOOK_WAIT ?? 90000), polling: 1000 }); } catch { console.log(name, 'NOT READY', errs.slice(-3).join(' | ')); continue; }
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${name}.png` }); console.log(name, JSON.stringify(await p.evaluate(() => window.lookReady)).slice(0, 300));
}
console.log('errors:', errs.slice(0, 5).join(' | ') || 'none');
await b.close(); server.close();
