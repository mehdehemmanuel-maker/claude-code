// WHAT IS ACTUALLY IN THE ROOM, as a count rather than a glance. Run after building the viewer:
//   npx vite build --config vite.view.config.ts --logLevel error
//   node tools/room-census.mjs                      what is in the forge as it opens
//   node tools/room-census.mjs "gravity on" "time on"   …and again after each thing you tell it
//   node tools/room-census.mjs --query gravity=on   open it with a query instead
//
// WHY IT EXISTS. 2026-10-16: a screenshot of the forge from the front showed an empty room, and the whole warehouse
// — racking, totes, painted lanes, three named robots — was still standing behind the camera. The user had to say
// so. A room judged from one angle is not judged, and "it looks blank" is not a measurement. This asks the room
// instead: every top-level group, how many of its meshes are actually drawn, and what the room says is switched on.
// Zero shown everywhere is the only thing that means blank.
//
// It reads `window.forgeProfile()`, which the forge already exposes, and talks through `window.tell`.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2);
const qi = args.indexOf('--query'), query = qi >= 0 ? args[qi + 1] ?? '' : '';
const says = args.filter((a, i) => i !== qi && !(qi >= 0 && i === qi + 1)); // with no --query, qi is -1: qi+1 is 0, which would silently drop the first word
const root = path.resolve('dist-view');
if (!fs.existsSync(root)) { console.log('no dist-view: npx vite build --config vite.view.config.ts --logLevel error'); process.exit(1); }
let pw; try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((ok) => server.listen(0, ok)); const port = server.address().port;
const b = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${port}/forge.html${query ? `?${query}` : ''}`);
await p.waitForFunction(() => window.ready === true && typeof window.forgeProfile === 'function', null, { timeout: 120000 });
await p.waitForTimeout(3000);
const census = async (head) => {
  const g = await p.evaluate(() => window.forgeProfile().groups.filter((x) => x.shown > 0).map((x) => ({ name: x.name || '(unnamed)', shown: x.shown, meshes: x.meshes, tris: x.tris })));
  const tris = g.reduce((s, x) => s + x.tris, 0), shown = g.reduce((s, x) => s + x.shown, 0);
  console.log(`\n=== ${head} === ${shown} meshes drawn, ${tris} triangles, in ${g.length} group${g.length === 1 ? '' : 's'}${shown ? '' : ' — the room is empty'}`);
  for (const x of g.sort((m, n) => n.shown - m.shown)) console.log(`  ${x.name.padEnd(34)} ${String(x.shown).padStart(4)}/${String(x.meshes).padEnd(5)} meshes  ${x.tris} tris`);
};
const reply = () => p.evaluate(() => (document.body.innerText.match(/Nexus:[^\n]*/g) ?? []).slice(-1)[0] ?? '(no reply)');
await census(`as it opens${query ? ` (?${query})` : ''}`);
await p.evaluate(() => window.tell("what's on")); await p.waitForTimeout(600);
console.log(`\n${await reply()}`);
for (const s of says) {
  await p.evaluate((t) => window.tell(`${t}`), s); await p.waitForTimeout(1500);
  console.log(`\n> ${s}\n${await reply()}`);
  await census(`after "${s}"`);
}
console.log('\nerrors:', errs.slice(0, 3).join(' | ') || 'none');
await b.close(); server.close();
