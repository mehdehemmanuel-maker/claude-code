// The critic's bench: the look page (view/look.html, built by `npx vite build --config vite.view.config.ts`) driven by
// a headless browser, so a critic (a person, or an agent told nothing of how a thing was made) can see anything of it
// and ask anything about it. Each argument is one job, "cmd:name|query|more…" (or "name|query" for a picture):
//
//   name|query                         a picture, saved as <out>/<name>.png (query as the look page reads it: kit, words,
//                                      seed, view, dir, aim, zoom, dist, cam, fov, only, hi, ghost, explode, cut, zebra,
//                                      draft, holes, room, rules, lines; and size=WxH for the picture's size)
//   parts:name|query                   every part drawn: name, holders, material, finish, colour, what it says, bounds
//   facts:name|query                   what the thing says of itself, and its measured size
//   pick:name|query|x,y;x,y…           the part under each pixel of the picture
//   gap:name|query|regexA|regexB       the least distance between the parts so named (0 where they cross)
//   clash:name|query|n                 every place two parts' surfaces cross or touch, and a close-up of the n worst
//                                      (each twice: as it is, and with the two parts coloured and the rest faint); each
//                                      as through, touch, layered, meets, or, where it is meant: joined (a joint laid
//                                      on them, or said by its maker: seated, clamped, bonded), fitted (through an
//                                      opening made for it), fused (one casting, moulding or weld)
//   holes:name|query                   where the thing can be seen through from inside its outline, painted green
//   sheet:name|query                   a contact sheet: whole from every side, under, and close on its faces, wheels,
//                                      doors, mirrors, lamps and inside (cut away)
//
// A '|' inside a query (a regex's alternatives in only= or hi=) is written %7C, as '|' parts a job's fields.
// Out to $BENCH_OUT (else ./bench-out). Serves dist-view (or $BENCH_ROOT) itself on a free port. Chromium from $CHROMIUM, else the
// preinstalled one; Playwright from $PLAYWRIGHT, else node_modules, else the global install.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(process.env.BENCH_ROOT ?? path.join(here, '../dist-view')), out = path.resolve(process.env.BENCH_OUT ?? 'bench-out');
fs.mkdirSync(out, { recursive: true });
const pw = await import(process.env.PLAYWRIGHT ?? 'playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const exe = process.env.CHROMIUM ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((ok) => server.listen(0, ok)); const port = server.address().port;
const browser = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function open(query) {
  const m = query.match(/(?:^|&)size=(\d+)x(\d+)/), [w, h] = m ? [Number(m[1]), Number(m[2])] : [1100, 720];
  const page = await browser.newPage({ viewport: { width: w, height: h } }); page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (c) => { if (c.type() === 'error' && !/Failed to load resource/.test(c.text())) errs.push(c.text().slice(0, 300)); });
  await page.goto(`http://localhost:${port}/look.html?${query}`);
  try { await page.waitForFunction(() => window.lookReady, null, { timeout: 120000 }); } catch { console.log('NOT READY', query, errs.slice(-3).join(' | ')); await page.close(); return null; }
  await page.waitForTimeout(250); return page;
}
async function shot(name, query) { const page = await open(query); if (!page) return null; const file = path.join(out, `${name}.png`); await page.screenshot({ path: file }); const ready = await page.evaluate(() => window.lookReady); await page.close(); console.log(`${name}.png`, JSON.stringify(ready)); return ready; }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const v3 = (a) => a.map((x) => +x.toFixed(3)).join(',');
async function clash(name, query, n) {
  const page = await open(query); if (!page) return; const t0 = Date.now();
  const all = await page.evaluate(() => window.look.clash(0.001)), facts = await page.evaluate(() => window.look.facts()); await page.close();
  fs.writeFileSync(path.join(out, `${name}.clash.json`), JSON.stringify(all, null, 1));
  // (the same pair of names met many times, as a car's four handles each in its door, counted once, at its worst)
  const byPair = new Map(); for (const c of all) { const k = `${c.kind}|${[c.a, c.b].sort().join(' ~ ')}`; const was = byPair.get(k); if (!was || c.span > was.span) byPair.set(k, { ...c, times: (was?.times ?? 0) + 1 }); else was.times++; }
  const rows = [...byPair.values()].sort((p, q) => ({ through: 0, touch: 1, layered: 2, meets: 3, joined: 4, fitted: 4, fused: 5 }[p.kind] - { through: 0, touch: 1, layered: 2, meets: 3, joined: 4, fitted: 4, fused: 5 }[q.kind]) || q.span - p.span);
  console.log(`${name}: ${all.length} meetings, ${rows.length} pairs of names (${((Date.now() - t0) / 1000).toFixed(1)} s). size ${facts.size}`);
  for (const r of rows) console.log(`  ${r.kind.padEnd(8)} ${r.a}  ~  ${r.b}  ×${r.times}  over ${(r.span * 1000).toFixed(0)} mm${r.depth !== undefined ? `, ${(r.depth * 1000).toFixed(0)} mm deep` : ''} at ${v3(r.at)}  [${r.kin}]`);
  const c0 = [0, (facts.size[1] ?? 1) / 2, 0];
  for (const [k, r] of rows.slice(0, n).entries()) {
    // (looked at from outside the thing, along the surfaces' normal there, a little from above; as close as the meeting is long)
    const out3 = [r.at[0] - c0[0], r.at[1] - c0[1], r.at[2] - c0[2]], ol = Math.hypot(...out3) || 1; let nn = r.normal; if (nn[0] * out3[0] + nn[1] * out3[1] + nn[2] * out3[2] < 0) nn = nn.map((x) => -x);
    const dir = [nn[0] + (0.7 * out3[0]) / ol, nn[1] + (0.7 * out3[1]) / ol + 0.3, nn[2] + (0.7 * out3[2]) / ol], dist = Math.max(0.25, Math.min(2.5, r.span * 3 + 0.15));
    const base = `${query}&aim=${v3(r.at)}&dir=${v3(dir)}&dist=${dist.toFixed(3)}`;
    await shot(`${name}-clash${k + 1}`, base); await shot(`${name}-clash${k + 1}-hi`, `${base}&hi=${encodeURIComponent(`^${esc(r.a)}$`)};${encodeURIComponent(`^${esc(r.b)}$`)}&ghost=1`);
  }
}
async function sheet(name, query) {
  const page = await open(query); if (!page) return; const parts = await page.evaluate(() => window.look.parts()), facts = await page.evaluate(() => window.look.facts()); await page.close();
  const [L, H, W] = facts.size, at = (re, side) => { const m = parts.filter((p) => (re.test(p.name) || re.test(p.path)) && (!side || p.min[2] + p.max[2] > 0)); if (!m.length) return null; const lo = [0, 1, 2].map((i) => Math.min(...m.map((p) => p.min[i]))), hi = [0, 1, 2].map((i) => Math.max(...m.map((p) => p.max[i]))); return { c: lo.map((x, i) => (x + hi[i]) / 2), s: Math.hypot(...hi.map((x, i) => x - lo[i])) }; };
  // (on the near side, z > 0, where a camera looking from +z sees it)
  const near = (re, dir, k = 1.4, side = false) => { const a = at(re, side); if (!a) return null; const c = a.c; return `aim=${v3(c)}&dir=${dir}&dist=${Math.max(0.35, Math.min(3, a.s * k)).toFixed(2)}`; };
  const right = true;
  const jobs = [['three', 'view=three'], ['front', 'view=front'], ['side', 'view=side'], ['rear', 'view=rear'], ['top', 'view=top'], ['under', 'view=under'], ['three-left', 'dir=1,0.35,-0.9'], ['rear-left', 'dir=-1,0.35,0.8'],
    ['face', near(/headlight|grille/i, '1,0.25,0.35', 0.9)], ['tail', near(/tail light/i, '-1,0.25,0.4', 0.9)], ['front-wheel', near(/front (left|right) wheel\/(tyre|tire)/i, '0.3,0.15,1', 0.7, right)], ['rear-wheel', near(/rear (left|right) wheel\/(tyre|tire)/i, '-0.3,0.15,1', 0.7, right)],
    ['door', near(/door handle/i, '0.1,0.1,1', 4, right)], ['mirror', near(/mirror/i, '0.6,0.3,1', 2.5, right)], ['lamp', near(/headlight/i, '1,0.2,0.6', 0.5, right)], ['arch', near(/front.*liner/i, '0.15,-0.15,1', 0.8, right)],
    ['inside', `cut=z<0.02&dir=0.15,0.35,1&zoom=0.62&aim=0,${(H * 0.55).toFixed(2)},0`], ['cabin-top', `cut=y<${(H * 0.86).toFixed(2)}&view=top&zoom=0.8`], ['zebra', 'zebra=1'], ['holes', 'holes=1&view=side']];
  for (const [k, q2] of jobs) if (q2) await shot(`${name}-${k}`, `${query}&${q2}`);
}
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^(\w+):(.*)$/), cmd = m && ['parts', 'facts', 'pick', 'gap', 'clash', 'holes', 'sheet', 'shot'].includes(m[1]) ? m[1] : 'shot', [name, query, ...more] = (m && cmd !== 'shot' ? m[2] : arg.replace(/^shot:/, '')).split('|');
  if (cmd === 'shot') await shot(name, query);
  else if (cmd === 'holes') await shot(name, `${query}&holes=1`);
  else if (cmd === 'clash') await clash(name, query, Number(more[0] ?? 8));
  else if (cmd === 'sheet') await sheet(name, query);
  else {
    const page = await open(query); if (!page) continue;
    const res = cmd === 'parts' ? await page.evaluate(() => window.look.parts()) : cmd === 'facts' ? await page.evaluate(() => window.look.facts()) : cmd === 'gap' ? await page.evaluate(([a, b]) => window.look.gap(a, b), more) : await page.evaluate((pts) => pts.map(([x, y]) => window.look.pick(x, y)), (more[0] ?? '').split(';').map((s) => s.split(',').map(Number)));
    await page.close(); fs.writeFileSync(path.join(out, `${name}.${cmd}.json`), JSON.stringify(res, null, 1));
    if (cmd === 'parts') { console.log(`${name}: ${res.length} parts drawn`); for (const p of res) console.log(`  ${p.name.padEnd(34)} ${String(p.mat).padEnd(10)} ${String(p.finish ?? '').padEnd(8)} ${p.color ?? ''}  ${p.min.map((x) => x.toFixed(2)).join(',')} → ${p.max.map((x) => x.toFixed(2)).join(',')}  ${p.path}`); }
    else console.log(`${name}.${cmd}`, JSON.stringify(res, null, 1));
  }
}
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 6).join(' | '));
await browser.close(); server.close();
