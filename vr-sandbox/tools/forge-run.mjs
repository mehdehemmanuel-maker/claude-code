// A script of moves played in the forge, with screenshots along the way: serves a built viewer, opens the forge, and
// runs each step in order. A step is one of:
//   js:<expression>    evaluated in the page (its window's test hooks: benchStart(), benchAct('heat pin 1'), …); printed
//   say:<words>        sent as if typed (the forge's own words)
//   wait:<ms>          the room runs on for so long
//   shot:<name>        a screenshot, <out>/<name>.png
//   view:x,y,z,tx,ty,tz  the camera put at x,y,z looking at tx,ty,tz (metres)
// Run after building the viewer:
//   node tools/forge-run.mjs <built viewer dir> <out dir> "js:benchStart()" "wait:3000" "shot:bench" "js:benchAct('place the headers')" …
// LOOK_W, LOOK_H: the window's size; FORGE_Q: the forge's own query (its light: key=, sky=, env=). Prints what each
// step returned, and errors.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [rootArg, outArg, ...steps] = process.argv.slice(2);
if (!rootArg || !outArg || !steps.length) { console.log('node tools/forge-run.mjs <viewer dir> <out dir> "js:…" "wait:…" "shot:…" …'); process.exit(1); }
const root = path.resolve(rootArg), out = path.resolve(outArg); fs.mkdirSync(out, { recursive: true });
let pw; try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.data': 'application/octet-stream', '.whl': 'application/octet-stream', '.zip': 'application/zip' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((ok) => server.listen(0, ok)); const port = server.address().port;
const b = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: Number(process.env.LOOK_W ?? 1280), height: Number(process.env.LOOK_H ?? 820) } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
const q = process.env.FORGE_Q ?? '';
await p.goto(`http://localhost:${port}/forge.html${q ? `?${q}` : ''}`, { waitUntil: 'commit' });
await p.waitForFunction(() => window.ready === true, null, { timeout: Number(process.env.LOOK_WAIT ?? 120000), polling: 1000 });
for (const s of steps) {
  const k = s.indexOf(':'), kind = s.slice(0, k), arg = s.slice(k + 1);
  try {
    if (kind === 'js') { const r = await p.evaluate(async (e) => { const v = await (0, eval)(e); return typeof v === 'object' ? JSON.stringify(v) : String(v); }, arg); console.log(`${arg.slice(0, 60)} → ${String(r).slice(0, Number(process.env.FORGE_OUT ?? 400))}`); }
    else if (kind === 'say') { await p.evaluate((w) => window.forgeSend(w), arg); console.log(`said: ${arg}`); }
    else if (kind === 'wait') await p.waitForTimeout(Number(arg));
    else if (kind === 'shot') { await p.screenshot({ path: `${out}/${arg}.png`, timeout: Number(process.env.FORGE_SHOT_MS ?? 30000) }); console.log(`shot ${arg}`); }
    else if (kind === 'view') { const v = arg.split(',').map(Number); await p.evaluate((a) => window.lookFrom(...a), v); }
    else console.log(`? ${s}`);
  } catch (e) { console.log(`${s} failed: ${e.message.slice(0, 300)}`); }
}
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none');
await b.close(); server.close();
