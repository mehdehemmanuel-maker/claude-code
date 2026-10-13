// Render anything the library draws from named views, as a person would first see it: serves a built viewer, opens
// its look page for each ask and saves a screenshot. Run after building the viewer
// (npx vite build --config vite.view.config.ts --logLevel error --outDir ../dist-view-dev --emptyOutDir):
//
//   node tools/look.mjs <built viewer dir> <out dir> "name|words=sbc opi5 8GB&view=top" "name2|words=…&view=three"
//
// Each ask is a name and the look page's query (kit=part is added; view=top|three|front|side|rear|under, or dir=x,y,z;
// zoom, explode, only, hide, hi, cut, ortho=1: see src/nexus/view/look.ts). Prints what each look reports, and errors.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
// --list: after each view, print the pieces actually in the picture, counted by name with their sizes. The page has
// exposed `window.look.parts()` (name, path, material, says, box, triangles) all along and nothing ever called it, so
// a reader of the PNG could see a thing come apart and still not name one piece of it - which means they could not
// tell a complete explode from one missing half its parts. (docs/MANNY.md SIGHT #38)
const LIST = process.argv.includes('--list');
const [rootArg, outArg, ...asks] = process.argv.slice(2).filter((a) => a !== '--list');
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
  // kit=part is the default, not an override: a query that names its own kit keeps it. Forcing it sent every ask
  // through the part kit, whose words-to-part lookup falls back to the family's example, so a machine ask drew a
  // 20 mm example and said nothing about it.
  const url = `http://localhost:${port}/look.html?${/(^|&)kit=/.test(query) ? '' : 'kit=part&'}${query}`;
  await p.goto(url, { waitUntil: 'commit' });
  try { await p.waitForFunction(() => window.lookReady, null, { timeout: Number(process.env.LOOK_WAIT ?? 90000), polling: 1000 }); } catch { console.log(name, 'NOT READY', errs.slice(-3).join(' | ')); continue; }
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${name}.png` }); console.log(name, JSON.stringify(await p.evaluate(() => window.lookReady)).slice(0, 300));
  if (LIST) {
    const ps = await p.evaluate(() => window.look.parts().map((q) => ({ n: q.name, mat: q.mat, mm: [q.max[0] - q.min[0], q.max[1] - q.min[1], q.max[2] - q.min[2]].map((v) => +(v * 1000).toFixed(1)) })));
    const by = new Map();
    for (const q of ps) { const k = `${q.n}|${q.mm.join('×')}|${q.mat ?? ''}`; by.set(k, (by.get(k) ?? 0) + 1); }
    console.log(`  ${ps.length} pieces in frame:`);
    for (const [k, n] of [...by].sort((a, b) => b[1] - a[1])) { const [nm, mm, mat] = k.split('|'); console.log(`    ${String(n).padStart(3)} × ${nm}  ${mm} mm${mat ? `  ${mat}` : ''}`); }
  }
}
console.log('errors:', errs.slice(0, 5).join(' | ') || 'none');
await b.close(); server.close();
