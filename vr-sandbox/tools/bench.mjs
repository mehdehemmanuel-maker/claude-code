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
//   gap:name|query|regexA|regexB       the least distance between the parts so named (0 where they cross), measured as
//                                      the clash finder measures (triangle to triangle), given up on after 20 s
//   clash:name|query|n                 every place two parts' surfaces cross or touch, and a close-up of the n worst
//                                      (each twice: as it is, and with the two parts coloured and the rest faint); each
//                                      as through, touch, layered, meets, or, where it is meant: joined (a joint laid
//                                      on them, or said by its maker: seated, clamped, bonded), fitted (through an
//                                      opening said to be made for it; marked where it is said, not drawn), fused (one
//                                      casting, moulding or weld: a weld bead is one only with what it welds)
//   holes:name|query                   where the thing can be seen through from inside its outline, painted green
//   section:name|query|x=1.3           every part cut by a plane (x=, y= or z=, m): their outlines there, drawn to scale
//                                      on a 50 mm grid (a .svg and a .png), and every segment of each (a .json, mm)
//   mass:name|query                    its mass part by part, its centre of mass, the share each axle carries
//   lint:name|query                    what no part should be: paper thin, hidden inside another, a weld on a casting, a
//                                      bolt thicker than what it holds
//   ref:name|query|photo|landmarks     a reference photograph laid over it, from the camera that took it: landmarks as the
//                                      photo's pixels, "front wheel centre:x,y;front wheel top:x,y;...": each wheel's centre,
//                                      top, bottom, front and back (its tyre's outer edge), and any landmark marked with a
//                                      leading * ("*roof peak:x,y"), find the camera; nose, tail, roof
//                                      peak, A pillar foot, roof front, roof back and C pillar foot are measured: each
//                                      one's miss in the picture and in mm on the car, the silhouettes' IoU where the
//                                      photo's background is plain, and the lines the photo says
//   ref:name|query|drawing|landmarks|elevation
//                                      the same over a side elevation (a drawing square to its side, no perspective): its
//                                      scale from its two wheel centres (the wheelbase is published), and in every column
//                                      the model's top and bottom against the drawing's outermost ink above its ground, in
//                                      mm, charted under the picture and listed every 2.5 % of its length (in the .json
//                                      column by column)
//   grid:name|image|x0,y0,x1,y1|k      a corner of any picture enlarged k times with its pixels numbered (a line every 5 px,
//                                      or every pixel from 8×), so landmarks can be read off it as pixels
//   diff:name|query|otherdir           what changed between this build and another built viewer's (parts, held root, systems, pixels)
//   frame:name|query                   what a frame is built of: body-in-white by structure alone, loads, links, joint kinds
//   held:name|query|n                  what holds what, from the heaviest group held together, by joints that carry load
//                                      (a face-to-face meeting a record explains, or a joint across it: no crossing, no
//                                      point's touch, and the ground holds nothing up): every group held by nothing (the
//                                      part of the rest nearest it, how far, and how it touches the rest), links in pieces,
//                                      links joined at too few ends, anything rigid across a joint, links that meet with
//                                      no joint, openings said and not drawn; and pictures of the n worst
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
async function open(query, at = port) {
  const m = query.match(/(?:^|&)size=(\d+)x(\d+)/), [w, h] = m ? [Number(m[1]), Number(m[2])] : [1100, 720];
  const page = await browser.newPage({ viewport: { width: w, height: h } }); page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (c) => { if (c.type() === 'error' && !/Failed to load resource/.test(c.text())) errs.push(c.text().slice(0, 300)); });
  await page.goto(`http://localhost:${at}/look.html?${query}`);
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
  for (const r of rows) console.log(`  ${r.kind.padEnd(8)} ${r.a}  ~  ${r.b}  ×${r.times}  over ${(r.span * 1000).toFixed(0)} mm${r.depth !== undefined ? `, ${(r.depth * 1000).toFixed(0)} mm deep` : ''} at ${v3(r.at)}  [${r.kin}]${r.opening === false ? ' (opening said, not drawn: they cross)' : ''}${r.by ? ` (by ${r.by})` : ''}`);
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
// a section drawn to scale: each part's segments in its own colour (dark enough to see on white), on a 50 mm grid with a
// heavier line every 250 mm, its axes in mm, and a key of the parts cut
async function section(name, query, spec) {
  const m = /^([xyz])=(-?[\d.]+)$/.exec(spec ?? ''); if (!m) { console.log('section needs x=, y= or z=', spec); return; }
  const page = await open(query); if (!page) return; const res = await page.evaluate(([a, v]) => window.look.section(a, v), [m[1], Number(m[2])]); await page.close();
  fs.writeFileSync(path.join(out, `${name}.section.json`), JSON.stringify(res));
  const all = res.parts.flatMap((p) => p.segs.flatMap((s2) => [[s2[0], s2[1]], [s2[2], s2[3]]])); if (!all.length) { console.log(`${name}: nothing cut at ${spec}`); return; }
  const x0 = Math.min(...all.map((q) => q[0])) - 60, x1 = Math.max(...all.map((q) => q[0])) + 60, y0 = Math.min(...all.map((q) => q[1])) - 60, y1 = Math.max(...all.map((q) => q[1])) + 60, W = x1 - x0, H = y1 - y0;
  const pal = ['#d62728', '#1f77b4', '#2ca02c', '#9467bd', '#ff7f0e', '#8c564b', '#e377c2', '#17becf', '#7f7f00', '#393b79'];
  const colOf = (p, i) => { const c = p.color && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : null; if (c) { const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); if (0.3 * r + 0.59 * g + 0.11 * b < 150) return c; } return pal[i % pal.length]; };
  const sw = Math.max(0.6, W / 1400), fs2 = Math.max(9, W / 90), grid = [];
  for (let gx = Math.ceil(x0 / 50) * 50; gx <= x1; gx += 50) grid.push(`<line x1="${gx}" y1="${-y1}" x2="${gx}" y2="${-y0}" stroke="${gx % 250 ? '#e6e6e6' : '#c4c4c4'}" stroke-width="${sw * 0.6}"/>`, gx % 250 ? '' : `<text x="${gx + 2}" y="${-y0 - 4}" font-size="${fs2}" fill="#666">${gx}</text>`);
  for (let gy = Math.ceil(y0 / 50) * 50; gy <= y1; gy += 50) grid.push(`<line x1="${x0}" y1="${-gy}" x2="${x1}" y2="${-gy}" stroke="${gy % 250 ? '#e6e6e6' : '#c4c4c4'}" stroke-width="${sw * 0.6}"/>`, gy % 250 ? '' : `<text x="${x0 + 4}" y="${-gy - 3}" font-size="${fs2}" fill="#666">${gy}</text>`);
  const lines = res.parts.map((p, i) => `<g stroke="${colOf(p, i)}" stroke-width="${sw * 1.6}" stroke-linecap="round">${p.segs.map((s2) => `<line x1="${s2[0]}" y1="${-s2[1]}" x2="${s2[2]}" y2="${-s2[3]}"/>`).join('')}</g>`);
  const names = [...new Map(res.parts.map((p, i) => [p.name, colOf(p, i)])).entries()].slice(0, 60);
  const key = names.map(([n2, c], i) => `<text x="${x1 + 20}" y="${-y1 + (i + 1) * fs2 * 1.3}" font-size="${fs2}" fill="${c}">${n2.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${-y1} ${W + fs2 * 22} ${H}" width="${Math.round((W + fs2 * 22) / Math.max(W, H) * 1800)}" height="${Math.round(H / Math.max(W, H) * 1800)}" style="background:#fff"><rect x="${x0}" y="${-y1}" width="${W + fs2 * 22}" height="${H}" fill="#fff"/>${grid.join('')}${lines.join('')}${key.join('')}<text x="${x0 + 4}" y="${-y1 + fs2 * 1.4}" font-size="${fs2 * 1.3}" fill="#222">section ${res.axis} = ${res.at} m, looking along +${res.axis}: ${res.plane[0]} across, ${res.plane[1]} up, mm (grid 50 mm)</text></svg>`;
  const svgFile = path.join(out, `${name}.svg`); fs.writeFileSync(svgFile, svg);
  const p2 = await browser.newPage({ viewport: { width: 1900, height: 1900 } }); await p2.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`); const el = await p2.$('svg'); await el.screenshot({ path: path.join(out, `${name}.png`) }); await p2.close();
  console.log(`${name}.png section ${spec}: ${res.parts.length} parts cut`);
}
// what holds what: groups held by nothing (with the nearest part of the rest), rigid things laid across a joint between
// links, links rubbing with no joint between them, links with no joint at all; and a picture of each of the n worst
// ---- diff: what changed between two builds of one query (the build in $BENCH_ROOT, or dist-view, against another built
// viewer's directory): parts removed, added, moved, resized, re-materialed, re-linked; what fell out of the held root
// since; whole systems gone; and the pictures from four cameras compared pixel by pixel. Exits non-zero where a removed part
// was in the held root and something fell out of it since, or where a system lost all its parts ----
const serve = (dir) => { const d = path.resolve(dir); const sv = http.createServer((req, res) => { const p = path.join(d, decodeURIComponent((req.url ?? '/').split('?')[0])); if (!p.startsWith(d) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }); return new Promise((ok) => sv.listen(0, () => ok(sv))); };
async function diffJob(name, query, other) {
  if (!other || !fs.existsSync(path.join(other, 'look.html'))) { console.log(`${name}: diff needs another built viewer's directory (one with look.html), not "${other}"`); return; }
  const svB = await serve(other), portB = svB.address().port, t0 = Date.now();
  const take = async (at) => { const page = await open(query, at); if (!page) return null; const r = await page.evaluate(() => ({ parts: window.look.parts(), held: window.look.held() })); await page.close(); return r; };
  const [A, B] = [await take(port), await take(portB)]; if (!A || !B) { svB.close(); return; }
  const c = (p) => p.min.map((v, i) => (v + p.max[i]) / 2), ext = (p) => p.max.map((v, i) => v - p.min[i]), key = (p) => `${p.path}|${p.name}`;
  const groupBy = (ps) => { const g = new Map(); for (const p of ps) (g.get(key(p)) ?? g.set(key(p), []).get(key(p))).push(p); return g; };
  const gA = groupBy(A.parts), gB = groupBy(B.parts), removed = [], added = [], changed = [];
  for (const k of new Set([...gA.keys(), ...gB.keys()])) {
    const as = [...(gA.get(k) ?? [])], bs = [...(gB.get(k) ?? [])];
    // (paired nearest first, by where each is)
    const pairs = []; for (const a of as) for (const b of bs) pairs.push([Math.hypot(...c(a).map((v, i) => v - c(b)[i])), a, b]); pairs.sort((p, q) => p[0] - q[0]);
    const usedA = new Set(), usedB = new Set();
    for (const [d, a, b] of pairs) { if (usedA.has(a) || usedB.has(b)) continue; usedA.add(a); usedB.add(b);
      const ea = ext(a), eb = ext(b), what = [];
      if (d > 0.005) what.push(`moved ${(d * 1000).toFixed(0)} mm`);
      if (ea.some((v, i) => Math.abs(v - eb[i]) > Math.max(0.001, 0.02 * Math.max(v, eb[i])))) what.push(`resized ${ea.map((v) => (v * 1000).toFixed(0)).join('×')} → ${eb.map((v) => (v * 1000).toFixed(0)).join('×')} mm`);
      if ((a.mat ?? '') !== (b.mat ?? '')) what.push(`material ${a.mat ?? '-'} → ${b.mat ?? '-'}`);
      if ((a.link ?? '') !== (b.link ?? '')) what.push(`link ${a.link ?? 'frame'} → ${b.link ?? 'frame'}`);
      if ((a.joint ?? '') !== (b.joint ?? '')) what.push(`joint ${a.joint ?? '-'} → ${b.joint ?? '-'}`);
      if (what.length) changed.push({ name: a.name, path: a.path, what }); }
    for (const a of as) if (!usedA.has(a)) removed.push(a); for (const b of bs) if (!usedB.has(b)) added.push(b);
  }
  // (the held root: what was in it, and what fell out of it since; each removed part that was in it)
  const rootA = new Set(A.held.main.parts), rootB = new Set(B.held.main.parts), namesB = new Set(B.parts.map((p) => p.name));
  const fell = [...rootA].filter((n) => namesB.has(n) && !rootB.has(n)), rose = [...rootB].filter((n) => !rootA.has(n));
  const removedHeld = [...new Set(removed.filter((p) => rootA.has(p.name) && !namesB.has(p.name)).map((p) => p.name))];
  // (each system, its path's first two steps, and the systems that lost every part)
  const sys = (ps) => { const m = new Map(); for (const p of ps) { const s2 = p.path.split('/').slice(0, 2).join('/'); m.set(s2, (m.get(s2) ?? 0) + 1); } return m; }, sA = sys(A.parts), sB = sys(B.parts);
  const gone = [...sA.keys()].filter((s2) => !sB.has(s2)), born = [...sB.keys()].filter((s2) => !sA.has(s2));
  // (the pictures: four cameras, each pixel compared, a red mark where they differ by more than 24 levels)
  const cams = [['three', 'view=three'], ['side', 'view=side'], ['rear', 'view=rear'], ['under', 'view=under']], pix = [];
  for (const [cn, cq] of cams) {
    const shotAt = async (at) => { const page = await open(`${query}&${cq}`, at); if (!page) return null; const b = await page.screenshot(); await page.close(); return b.toString('base64'); };
    const [ia, ib] = [await shotAt(port), await shotAt(portB)]; if (!ia || !ib) continue;
    const pg = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    await pg.setContent(`<body style="margin:0"><img id="a" src="data:image/png;base64,${ia}"><img id="b" src="data:image/png;base64,${ib}"><canvas id="c"></canvas></body>`);
    await pg.waitForFunction(() => document.getElementById('a').complete && document.getElementById('b').complete);
    const r = await pg.evaluate(() => { const a = document.getElementById('a'), b = document.getElementById('b'), w = a.naturalWidth, h = a.naturalHeight, cv = document.getElementById('c'); cv.width = w; cv.height = h; const x = cv.getContext('2d');
      x.drawImage(a, 0, 0); const da = x.getImageData(0, 0, w, h); x.drawImage(b, 0, 0); const db = x.getImageData(0, 0, w, h), o = x.createImageData(w, h); let n = 0;
      for (let i = 0; i < da.data.length; i += 4) { const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2])), g = (db.data[i] + db.data[i + 1] + db.data[i + 2]) / 6;
        if (d > 24) { n++; o.data[i] = 255; o.data[i + 1] = 0; o.data[i + 2] = 0; } else { o.data[i] = o.data[i + 1] = o.data[i + 2] = 128 + g / 2; } o.data[i + 3] = 255; }
      x.putImageData(o, 0, 0); return { share: n / (w * h), url: cv.toDataURL('image/png') }; });
    fs.writeFileSync(path.join(out, `${name}-${cn}.diff.png`), Buffer.from(r.url.split(',')[1], 'base64')); pix.push([cn, r.share]); await pg.close();
  }
  svB.close();
  const res = { a: root, b: path.resolve(other), removed: removed.map((p) => ({ name: p.name, path: p.path })), added: added.map((p) => ({ name: p.name, path: p.path })), changed, held: { a: A.held.main, b: B.held.main, fell, rose, floatsA: A.held.floats.length, floatsB: B.held.floats.length }, removedHeld, systems: { gone, born }, pixels: Object.fromEntries(pix) };
  fs.writeFileSync(path.join(out, `${name}.diff.json`), JSON.stringify(res, null, 1));
  const cnt = (ps) => { const m = new Map(); for (const p of ps) m.set(p.name, (m.get(p.name) ?? 0) + 1); return [...m.entries()].map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)); };
  console.log(`${name}: ${root} → ${path.resolve(other)}: ${removed.length} parts removed, ${added.length} added, ${changed.length} changed; held root ${A.held.main.n} → ${B.held.main.n} parts (${A.held.main.kg} → ${B.held.main.kg} kg), floats ${A.held.floats.length} → ${B.held.floats.length}; ${gone.length} systems gone, ${born.length} new (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (removed.length) console.log(`  REMOVED  ${cnt(removed).slice(0, 40).join(', ')}`);
  if (added.length) console.log(`  ADDED    ${cnt(added).slice(0, 40).join(', ')}`);
  for (const ch of changed.slice(0, 40)) console.log(`  CHANGED  ${ch.name}: ${ch.what.join('; ')}`);
  for (const s2 of gone) console.log(`  SYSTEM GONE ${s2} (${sA.get(s2)} parts in the first build, none in the second)`);
  for (const s2 of born) console.log(`  SYSTEM NEW  ${s2} (${sB.get(s2)} parts)`);
  if (fell.length) console.log(`  FELL FROM THE ROOT ${fell.slice(0, 30).join(', ')}`);
  if (removedHeld.length && fell.length) console.log(`  REMOVED-HELD ${removedHeld.join(', ')} were in the held root, and since they went, ${fell.length} parts fell out of it`);
  for (const [cn, sh] of pix) console.log(`  PIXELS   ${cn}: ${(sh * 100).toFixed(2)} % differ (${name}-${cn}.diff.png)`);
  if ((removedHeld.length && fell.length) || gone.length) process.exitCode = 1;
}
// what a frame is built of (held v3): its body-in-white in pieces joined by structure alone (welds, bonds, drawn bolts,
// castings; never rubber, a mount, a bush, a spring or a moving joint), each with its cut; where a load comes into the frame
// and the part it comes to is not in its structure; each moving link's joints, flagged where it cannot move as they say;
// joints said by parts that cannot be them; what is held only through openings said and not drawn. FAIL lines for each.
async function frameJob(name, query) {
  const page = await open(query); if (!page) return; const t0 = Date.now(); const f = await page.evaluate(() => window.look.frame()); await page.close();
  fs.writeFileSync(path.join(out, `${name}.frame.json`), JSON.stringify(f, null, 1));
  const faults = f.links.filter((l) => l.fault);
  console.log(`${name}: body-in-white in ${f.biw.length} piece${f.biw.length === 1 ? '' : 's'} (${f.biw[0]?.n ?? 0} parts, ${f.biw[0]?.kg ?? 0} kg in the first); structure ${f.structure.n} parts, ${f.structure.kg} kg; ${f.loads.length} loads into what is not structure; ${faults.length} links that cannot move as they say; ${f.kinds.length} joints said by what cannot be one; ${f.saidHeld.length} groups held only by what is said (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  for (const [i, b] of f.biw.entries()) console.log(`  ${i ? 'BODY SPLIT' : 'BIW       '} ${b.parts.slice(0, 6).join(', ')}${b.n > 6 ? ` (+${b.n - 6} more)` : ''}, ${b.kg} kg${i ? `; joined to the rest only by ${b.cut.join('; ') || 'nothing'}` : ''}`);
  for (const l of f.loads) console.log(`  LOAD PATH  ${l.at} takes ${l.from} (${l.by}): ${l.reaches}`);
  for (const l of faults) console.log(`  ${l.fault.split(':')[0]} ${l.link}: ${l.joints.join('; ')} — ${l.fault.split(': ').slice(1).join(': ')}`);
  for (const k of f.kinds) console.log(`  JOINT KIND ${k.joint} said by ${k.part}: ${k.why}`);
  const sh = new Map(); for (const g of f.saidHeld) { const k = `${g.parts.join(', ')} (${g.kg} kg)`; sh.set(k, (sh.get(k) ?? 0) + 1); } for (const [k, n] of sh) console.log(`  HELD-BY-SAID ${k}${n > 1 ? ` ×${n}` : ''}`);
}
async function heldJob(name, query, n) {
  const page = await open(query); if (!page) return; const t0 = Date.now(); const h = await page.evaluate(() => window.look.held()); await page.close();
  fs.writeFileSync(path.join(out, `${name}.held.json`), JSON.stringify(h, null, 1));
  console.log(`${name}: held from ${h.main.root} (${h.main.n} parts, ${h.main.kg} kg); ${h.floats.length} groups held by nothing (${h.floats.filter((f) => f.via[0]?.startsWith('standing')).length} only standing on the ground), ${h.splits.length} links in pieces, ${h.chains.length} links joined at too few ends, ${h.blocks.length} rigid across a joint, ${h.rubs.length} rubbing, ${h.unjointed.length} links with no joint, ${h.saidNotDrawn.length} openings said and not drawn (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  console.log(`  ROOT    ${h.main.parts.join(', ')}`);
  for (const f of h.floats) console.log(`  FLOAT   ${f.parts.slice(0, 3).join(', ')}${f.n > 3 ? ` (+${f.n - 3} more)` : ''}, ${f.kg} kg: nearest ${f.nearest ? `${f.nearest.a} to ${f.nearest.b}, ${(f.nearest.d * 1000).toFixed(1)} mm at ${v3(f.nearest.at)}` : 'none'}${f.via.length ? `; touching the rest only by ${f.via.join('; ')}` : ''}`);
  for (const s2 of h.splits) console.log(`  SPLIT   ${s2.link}: ${s2.pieces.map((p) => p.join(', ')).join(' | ')}${s2.gap !== null ? `, the two largest ${(s2.gap * 1000).toFixed(1)} mm apart` : ''}`);
  for (const c of h.chains) console.log(`  CHAIN   ${c.link}: joined to ${c.joinedTo.length ? c.joinedTo.join(', ') : 'nothing'}; needs ${c.needs}`);
  for (const s2 of h.saidNotDrawn) console.log(`  SAID    ${s2.a} through ${s2.b} ×${s2.n}: its opening said, not drawn`);
  for (const b of h.blocks) console.log(`  BLOCK   ${b.links.join(' / ')}: ${b.by}, ${b.a} ~ ${b.b} at ${v3(b.at)}`);
  const rubs = new Map(); for (const r of h.rubs) { const k = `${r.links.join(' / ')}: ${[r.a, r.b].sort().join(' ~ ')}`; if (!rubs.has(k)) rubs.set(k, r); } for (const [k, r] of rubs) console.log(`  RUB     ${k} (${r.kind}) at ${v3(r.at)}`);
  for (const u of h.unjointed) console.log(`  NOJOINT ${u.link} (${u.parts} parts)${u.meets.length ? `: meets ${u.meets.join(', ')} with no joint` : ': meets no other link'}`);
  for (const j of h.joints) console.log(`  joint   ${j.links.join(' / ')}: ${j.joint} (${j.a} ~ ${j.b})`);
  const shots = [...h.floats.filter((f) => f.nearest).map((f) => ({ a: f.parts, b: [f.nearest.b], at: f.nearest.at })), ...h.blocks.map((b) => ({ a: [b.a], b: [b.b], at: b.at }))].slice(0, n);
  for (const [k, s2] of shots.entries()) await shot(`${name}-held${k + 1}`, `${query}&aim=${v3(s2.at)}&dir=0.4,0.35,1&dist=0.9&hi=${encodeURIComponent(s2.a.map((x) => `^${esc(x)}$`).join('|'))};${encodeURIComponent(s2.b.map((x) => `^${esc(x)}$`).join('|'))}&ghost=1`);
}
// ---- ref: a reference photograph laid over it, the camera that took it found from the wheels ----
// (a wheel's size is published, so its tyre's outer face is known: its middle, top, bottom, front and back. The camera
// that took the photo, where it stood, which way it looked and how wide its lens was, is the one that puts those points
// where the photo has them, found by least squares (Levenberg and Marquardt). The model is drawn from that camera, the
// photo laid over it at half strength, and every other landmark the photo gives is measured against the model's: in the
// picture, and on the car, by taking the photo's point back along its ray onto the car's side.)
const v3sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], v3cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], v3norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
// (the camera as three.js sets it: at C, looking at A with y up, its lens fov degrees tall)
function camOf(p) {
  const C = [p[0], p[1], p[2]], d = [Math.cos(p[4]) * Math.sin(p[3]), Math.sin(p[4]), Math.cos(p[4]) * Math.cos(p[3])], zc = d.map((x) => -x), x0 = v3norm(v3cross([0, 1, 0], zc)), y0 = v3cross(zc, x0), r = p[6] ?? 0;
  // (its roll: its up turned about its line of sight)
  const up = [0, 1, 2].map((i) => Math.cos(r) * y0[i] - Math.sin(r) * x0[i]);
  return { C, A: [C[0] + d[0], C[1] + d[1], C[2] + d[2]], fov: p[5], up };
}
function projectCam(X, cam, W, H) {
  const zc = v3norm(v3sub(cam.C, cam.A)), xc = v3norm(v3cross(cam.up ?? [0, 1, 0], zc)), yc = v3cross(zc, xc), d = v3sub(X, cam.C), x = v3dot(d, xc), y = v3dot(d, yc), z = v3dot(d, zc), f = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
  return [W / 2 + (f * x) / -z, H / 2 - (f * y) / -z];
}
function rayOf(px, cam, W, H) { const zc = v3norm(v3sub(cam.C, cam.A)), xc = v3norm(v3cross(cam.up ?? [0, 1, 0], zc)), yc = v3cross(zc, xc), f = H / 2 / Math.tan((cam.fov * Math.PI) / 360), u = (px[0] - W / 2) / f, v = -(px[1] - H / 2) / f; return v3norm([xc[0] * u + yc[0] * v - zc[0], xc[1] * u + yc[1] * v - zc[1], xc[2] * u + yc[2] * v - zc[2]]); }
function solveCam(pairs, p0, W, H, prior = true, free = null) {
  // (and, as weak priors, so a few points cannot put the camera anywhere: a photographer's eye 1.5 m up, give or take 0.5 m,
  // and standing at least 3 m off; each worth as much as a few pixels)
  const res = (p) => { const cam = camOf(p), r = pairs.flatMap(([X, u]) => { const q = projectCam(X, cam, W, H); return [q[0] - u[0], q[1] - u[1]]; }); if (prior) { r.push(((p[1] - 1.5) / 0.5) * 3); const off = Math.hypot(p[0], p[2]); r.push(off < 3 ? (3 - off) * 30 : 0); } return r; };
  let p = p0.slice(), r = res(p), e = r.reduce((s, x) => s + x * x, 0), lam = 1e-2;
  for (let it = 0; it < 200; it++) {
    const J = p.map((_, k) => { if (free && !free.includes(k)) return r.map(() => 0); const h = k < 3 ? 1e-4 : k === 5 ? 1e-4 : 1e-6, q = p.slice(); q[k] += h; return res(q).map((x, i) => (x - r[i]) / h); });
    const n = p.length, A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => J[i].reduce((s, x, m) => s + x * J[j][m], 0))), g = J.map((col) => col.reduce((s, x, m) => s + x * r[m], 0));
    const tryStep = (l) => { const M = A.map((row, i) => row.map((x, j) => x + (i === j ? l * (x || 1) : 0))), b = g.map((x) => -x);
      // (Gauss elimination on the small normal equations)
      for (let i = 0; i < n; i++) { let piv = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k; [M[i], M[piv]] = [M[piv], M[i]]; [b[i], b[piv]] = [b[piv], b[i]]; for (let k = i + 1; k < n; k++) { const f = M[k][i] / (M[i][i] || 1e-18); for (let j = i; j < n; j++) M[k][j] -= f * M[i][j]; b[k] -= f * b[i]; } }
      const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / (M[i][i] || 1e-18); } return p.map((v, i) => v + x[i]); };
    const q = tryStep(lam), rq = res(q), eq = rq.reduce((s, x) => s + x * x, 0);
    if (eq < e && q[5] > 1e-4 && q[5] < 120) { p = q; r = rq; if (e - eq < 1e-9 * e) { e = eq; break; } e = eq; lam = Math.max(1e-7, lam / 3); } else lam *= 4;
  }
  const pix = pairs.reduce((s2, [X, u]) => { const q = projectCam(X, camOf(p), W, H); return s2 + (q[0] - u[0]) ** 2 + (q[1] - u[1]) ** 2; }, 0);
  return { p, rms: Math.sqrt(pix / pairs.length) };
}
async function refJob(name, query, photo, lms, mode) {
  // (mode "elevation": the picture is a draughtsman's side elevation, drawn square to the side with no perspective; else a
  // photograph, with its camera to be found)
  const elev = /^elev/.test(mode ?? '');
  const buf = fs.readFileSync(photo), mime = /\.png$/i.test(photo) ? 'image/png' : 'image/jpeg', url = `data:${mime};base64,${buf.toString('base64')}`;
  const star = new Set(), L = Object.fromEntries((lms ?? '').split(';').filter(Boolean).map((t) => { const i = t.lastIndexOf(':'); let n = t.slice(0, i).trim(); if (n.startsWith('*')) { n = n.slice(1); star.add(n); } return [n, t.slice(i + 1).split(',').map(Number)]; }));
  const fw = L['front wheel centre'], rw = L['rear wheel centre']; if (!fw || !rw) { console.log(`${name}: ref needs at least the picture's front wheel centre and rear wheel centre (and better, each wheel's top, bottom, front and back)`); return; }
  const p0 = await browser.newPage(); await p0.setContent(`<img id="i" src="${url}">`); await p0.waitForFunction(() => document.getElementById('i').complete); const [W, H] = await p0.evaluate(() => [document.getElementById('i').naturalWidth, document.getElementById('i').naturalHeight]); await p0.close();
  // (its nose to the right in the picture: seen from its right, +z; to the left: from its left)
  const side = fw[0] > rw[0] ? 1 : -1;
  const pg = await open(`${query}&size=${W}x${H}`); if (!pg) return; const lm = await pg.evaluate((sd) => window.look.landmarks(sd), side), facts = await pg.evaluate(() => window.look.facts()); await pg.close();
  const wheelPts = Object.keys(L).filter((n) => (/wheel/.test(n) || star.has(n)) && lm[n]), pairs = wheelPts.map((n) => [lm[n], L[n]]);
  const lF = lm['front wheel centre'], lR = lm['rear wheel centre'], wbM = Math.hypot(lF[0] - lR[0], lF[1] - lR[1]), wbPx = Math.hypot(fw[0] - rw[0], fw[1] - rw[1]);
  let best = null;
  if (elev) {
    // (an elevation's scale is its wheelbase, which is published: its pixels between the wheels' centres over the model's
    // metres. It is drawn as by a camera 1 km off with a lens so long that it draws the same, to 0.1 %, its roll the tilt of
    // its wheels' line; only where it stands across the picture, its lens and its roll are fitted, to the wheels' points)
    const s = wbPx / wbM, um = (fw[0] + rw[0]) / 2, vm = (fw[1] + rw[1]) / 2, xm = (lF[0] + lR[0]) / 2, ym = (lF[1] + lR[1]) / 2, D = 1000;
    const s0 = [xm + (side * (W / 2 - um)) / s, ym - (H / 2 - vm) / s, side * D, side > 0 ? Math.PI : 0, 0, (2 * Math.atan(H / 2 / (s * D)) * 180) / Math.PI, 0];
    best = solveCam(pairs, s0, W, H, false, [0, 1, 5, 6]);
  } else {
    // (from many first guesses, standing anywhere from 5 to 25 m off and up to 40° round from square, as a photo may be taken
    // from a car's quarter: the best of what each settles to)
    const xm = (lF[0] + lR[0]) / 2;
    for (const yaw of [-0.7, -0.45, -0.2, 0, 0.2, 0.45, 0.7]) for (const D2 of [5, 9, 16, 25]) for (const pitch of [-0.12, -0.03, 0.06]) {
      const yw = (side > 0 ? Math.PI : 0) + yaw, C0 = [xm - Math.sin(yw) * D2, 1.0, -Math.cos(yw) * D2], f2 = (wbPx * D2) / wbM, s0 = [C0[0], C0[1], C0[2], yw, pitch, (2 * Math.atan(H / 2 / f2) * 180) / Math.PI, 0];
      const r = solveCam(pairs, s0, W, H); if (!best || r.rms < best.rms) best = r; }
  }
  const { p, rms } = best, cam = camOf(p), fpx2 = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
  // (an elevation's camera looks at the car itself, 1 km on, so the drawing's far plane is past it)
  if (elev) cam.A = cam.C.map((c, i) => c + (cam.A[i] - c) * Math.abs(cam.C[2]));
  const q2 = `${query}&cam=${cam.C.map((x) => x.toFixed(5)).join(',')}&aim=${cam.A.map((x) => x.toFixed(5)).join(',')}&fov=${cam.fov.toPrecision(9)}&up=${cam.up.map((x) => x.toFixed(7)).join(',')}&size=${W}x${H}`;
  const page = await open(q2); if (!page) return; const rpath = path.join(out, `${name}-render.png`); await page.screenshot({ path: rpath }); await page.close();
  // (each landmark the picture gives: its miss in the picture, and on the car, the picture's ray taken onto the plane across
  // the car where the model's landmark is)
  const rows = [];
  for (const [n, u] of Object.entries(L)) {
    if (!lm[n]) { rows.push({ name: n, photoPx: u, model: null }); continue; }
    const q = projectCam(lm[n], cam, W, H), ray = rayOf(u, cam, W, H), t = (lm[n][2] - cam.C[2]) / ray[2], at = [cam.C[0] + ray[0] * t, cam.C[1] + ray[1] * t, lm[n][2]];
    rows.push({ name: n, photoPx: u, modelPx: q.map((x) => +x.toFixed(1)), missPx: +Math.hypot(q[0] - u[0], q[1] - u[1]).toFixed(1), photo: at.map((x) => +x.toFixed(4)), model: lm[n], dx: +((lm[n][0] - at[0]) * 1000).toFixed(0), dy: +((lm[n][1] - at[1]) * 1000).toFixed(0), matched: wheelPts.includes(n) });
  }
  const mpage = await open(`${q2}&mask=1`); if (!mpage) return; const mpath = path.join(out, `${name}-mask.png`); await mpage.screenshot({ path: mpath }); await mpage.close();
  const rUrl = `data:image/png;base64,${fs.readFileSync(rpath).toString('base64')}`, mUrl = `data:image/png;base64,${fs.readFileSync(mpath).toString('base64')}`;
  // (the ground in the picture: where the model's tyres stand, so the drawing's ground line is not taken for the car)
  const groundV = Math.max(...['front wheel bottom', 'rear wheel bottom'].filter((n) => lm[n]).map((n) => projectCam(lm[n], cam, W, H)[1]));
  const sPx = elev ? fpx2 / Math.abs(cam.C[2]) : null, CH = elev ? 230 : 0;
  const cv = await browser.newPage({ viewport: { width: W, height: H + CH } });
  await cv.setContent(`<body style="margin:0;background:#fff"><canvas id="c" width="${W}" height="${H + CH}"></canvas><img id="r" src="${rUrl}" style="display:none"><img id="m" src="${mUrl}" style="display:none"><img id="p" src="${url}" style="display:none"></body>`);
  await cv.waitForFunction(() => ['r', 'm', 'p'].every((i) => document.getElementById(i).complete));
  const marks = rows.map((r) => ({ name: r.name, p: r.photoPx, m: r.modelPx ?? null, matched: !!r.matched }));
  const sil = await cv.evaluate(({ W, H, CH, marks, groundV, sPx, side }) => {
    const c = document.getElementById('c'), x = c.getContext('2d'), img = (i) => document.getElementById(i);
    // (the picture's background, the middle colour of its border, and how much its border varies: a busy one gives no silhouette)
    const pc = document.createElement('canvas'); pc.width = W; pc.height = H; const px = pc.getContext('2d'); px.drawImage(img('p'), 0, 0, W, H); const pd = px.getImageData(0, 0, W, H).data, bord = [];
    for (let i = 0; i < W; i += 3) for (const j of [0, H - 1]) bord.push(j * W + i); for (let j = 0; j < H; j += 3) for (const i of [0, W - 1]) bord.push(j * W + i);
    const med = [0, 1, 2].map((ch) => { const v = bord.map((q) => pd[q * 4 + ch]).sort((p, q) => p - q); return v[v.length >> 1]; }), dev = bord.map((q) => Math.abs(pd[q * 4] - med[0]) + Math.abs(pd[q * 4 + 1] - med[1]) + Math.abs(pd[q * 4 + 2] - med[2])).sort((p, q) => p - q)[Math.floor(bord.length * 0.8)];
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H; const mg = mc.getContext('2d'); mg.drawImage(img('m'), 0, 0, W, H); const md = mg.getImageData(0, 0, W, H).data;
    const inkP = (q) => Math.abs(pd[q * 4] - med[0]) + Math.abs(pd[q * 4 + 1] - med[1]) + Math.abs(pd[q * 4 + 2] - med[2]) > 60, inkM = (q) => md[q * 4] < 128;
    // (each column's top and bottom: the model's outline, and the picture's outermost ink above its ground; between them, as
    // a silhouette, filled, for the overlap of the two)
    const gv = Math.floor(groundV) - 2, top = (f) => Array.from({ length: W }, (_, u) => { for (let v = 0; v < gv; v++) if (f(v * W + u)) return v; return null; }), bot = (f) => Array.from({ length: W }, (_, u) => { for (let v = gv - 1; v >= 0; v--) if (f(v * W + u)) return v; return null; });
    const plain = dev < 40, mT = top(inkM), mB = bot(inkM), dT = plain ? top(inkP) : null, dB = plain ? bot(inkP) : null;
    let inter = 0, uni = 0; if (plain) for (let u = 0; u < W; u++) { const a = mT[u] === null ? null : [mT[u], mB[u]], b = dT[u] === null ? null : [dT[u], dB[u]]; if (a && b) { inter += Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]) + 1); uni += Math.max(a[1], b[1]) - Math.min(a[0], b[0]) + 1; } else if (a) uni += a[1] - a[0] + 1; else if (b) uni += b[1] - b[0] + 1; }
    // (the picture: the drawing, the reference over it at half strength, the model's outline in blue; the reference's landmarks
    // red rings, the model's blue crosses, the wheels' points it was matched by in green)
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H + CH); x.drawImage(img('r'), 0, 0, W, H); x.globalAlpha = 0.5; x.drawImage(img('p'), 0, 0, W, H); x.globalAlpha = 1;
    const od = x.getImageData(0, 0, W, H); for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) { const q = yy * W + xx, A = md[q * 4] < 128; if (A && (md[(q - 1) * 4] >= 128 || md[(q + 1) * 4] >= 128 || md[(q - W) * 4] >= 128 || md[(q + W) * 4] >= 128)) { od.data[q * 4] = 40; od.data[q * 4 + 1] = 110; od.data[q * 4 + 2] = 255; } } x.putImageData(od, 0, 0);
    x.lineWidth = 2; x.font = '12px sans-serif';
    for (const mk of marks) { const col = mk.matched ? '#18a84a' : '#ff2a2a'; x.strokeStyle = col; x.beginPath(); x.arc(mk.p[0], mk.p[1], 6, 0, 7); x.stroke(); if (mk.m) { x.strokeStyle = '#2a6bff'; x.beginPath(); x.moveTo(mk.m[0] - 7, mk.m[1]); x.lineTo(mk.m[0] + 7, mk.m[1]); x.moveTo(mk.m[0], mk.m[1] - 7); x.lineTo(mk.m[0], mk.m[1] + 7); x.stroke(); x.strokeStyle = col; x.beginPath(); x.moveTo(mk.p[0], mk.p[1]); x.lineTo(mk.m[0], mk.m[1]); x.stroke(); } if (!mk.matched) { x.fillStyle = '#111'; x.fillText(mk.name, mk.p[0] + 8, mk.p[1] - 8); } }
    let prof = null;
    if (sPx && plain) {
      // (an elevation's profile: in each column, how much higher the model's top and bottom stand than the drawing's, in mm,
      // charted under the picture, column for column, from -80 to +80 mm)
      const mm = (v) => ((groundV - v) / sPx) * 1000, cols = [];
      for (let u = 0; u < W; u++) if (mT[u] !== null && dT[u] !== null) cols.push({ u, top: [mm(dT[u]), mm(mT[u])], bot: [mm(dB[u]), mm(mB[u])] });
      const y0 = H + CH / 2, k = (CH / 2 - 14) / 80; x.font = '11px sans-serif';
      for (const g of [-80, -40, -20, 0, 20, 40, 80]) { x.strokeStyle = g === 0 ? '#555' : '#ddd'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, y0 - g * k); x.lineTo(W, y0 - g * k); x.stroke(); x.fillStyle = '#555'; x.fillText(`${g > 0 ? '+' : ''}${g} mm`, 4, y0 - g * k - 2); }
      for (const [key, col] of [['top', '#2a6bff'], ['bot', '#e8860c']]) { x.strokeStyle = col; x.lineWidth = 1.5; x.beginPath(); let pen = false, last = -9; for (const cc of cols) { const d = Math.max(-80, Math.min(80, cc[key][1] - cc[key][0])), yy = y0 - d * k; if (pen && cc.u === last + 1) x.lineTo(cc.u, yy); else x.moveTo(cc.u, yy); pen = true; last = cc.u; } x.stroke(); }
      x.fillStyle = '#2a6bff'; x.fillText('top: model minus drawing (mm, + where the model stands higher)', W - 380, H + 14); x.fillStyle = '#e8860c'; x.fillText('bottom: model minus drawing', W - 380, H + 28);
      const xs = cols.map((cc) => cc.u), uN = side > 0 ? Math.max(...xs) : Math.min(...xs), uT = side > 0 ? Math.min(...xs) : Math.max(...xs);
      prof = { cols: cols.map((cc) => ({ share: +((uN - cc.u) / (uN - uT)).toFixed(4), top: cc.top.map((v) => +v.toFixed(1)), bot: cc.bot.map((v) => +v.toFixed(1)) })) };
      const inkCols = dT.map((v, u) => (v === null ? null : u)).filter((u) => u !== null), mCols = mT.map((v, u) => (v === null ? null : u)).filter((u) => u !== null);
      prof.extent = { drawing: [(Math.max(...inkCols) - Math.min(...inkCols) + 1) / sPx, (groundV - Math.min(...dT.filter((v) => v !== null))) / sPx].map((v) => +(v * 1000).toFixed(0)), model: [(Math.max(...mCols) - Math.min(...mCols) + 1) / sPx, (groundV - Math.min(...mT.filter((v) => v !== null))) / sPx].map((v) => +(v * 1000).toFixed(0)) };
    }
    return { iou: plain && uni ? inter / uni : null, border: dev, prof };
  }, { W, H, CH, marks, groundV, sPx, side });
  const opath = path.join(out, `${name}.png`); await (await cv.$('#c')).screenshot({ path: opath }); await cv.close();
  // (lines are shares of its length from its nose: what the reference's landmarks say each is, what the model's are, the move)
  const Ln = facts.size[0], nose = lm.nose?.[0] ?? Ln / 2, share = (xx) => +((nose - xx) / Ln).toFixed(3), lineOf = { cowl: 'A pillar foot', roofF: 'roof front', roofR: 'roof back', deck: 'C pillar foot' }, lines = {};
  for (const [ln, n] of Object.entries(lineOf)) { const r = rows.find((q) => q.name === n && q.photo); if (r) lines[ln] = { photo: share(r.photo[0]), model: share(lm[n][0]), move: +(share(r.photo[0]) - share(lm[n][0])).toFixed(3) }; }
  // (the profile in stations: every 2.5 % of its length from its nose, the drawing's height and the model's there, top and
  // bottom, and over all its columns, the root mean square and the worst)
  let profile = null;
  if (sil.prof) {
    const cols = sil.prof.cols, at = (sh) => cols.reduce((b, cc) => (Math.abs(cc.share - sh) < Math.abs(b.share - sh) ? cc : b)), stat = (key) => { const d = cols.map((cc) => cc[key][1] - cc[key][0]), worst = cols[d.reduce((b, v, i) => (Math.abs(v) > Math.abs(d[b]) ? i : b), 0)]; return { rms: +Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length).toFixed(1), worst: { share: worst.share, mm: +(worst[key][1] - worst[key][0]).toFixed(1) } }; };
    profile = { cols, stations: Array.from({ length: 41 }, (_, i) => { const cc = at(i / 40); return { share: +(i / 40).toFixed(3), top: cc.top, bot: cc.bot }; }), top: stat('top'), bottom: stat('bot'), extent: sil.prof.extent, columns: cols.length };
  }
  const res = { photo, kind: elev ? 'elevation' : 'photograph', side: side > 0 ? 'right' : 'left', camera: { at: cam.C.map((x) => +x.toFixed(3)), aim: cam.A.map((x) => +x.toFixed(3)), fov: +cam.fov.toPrecision(6), roll: +(((p[6] ?? 0) * 180) / Math.PI).toFixed(3), focalPx: +fpx2.toFixed(1) }, ...(elev ? { scale: { pxPerM: +(wbPx / wbM).toFixed(3), mmPerPx: +((1000 * wbM) / wbPx).toFixed(4), from: `the wheelbase: ${wbPx.toFixed(2)} px in the drawing, ${(wbM * 1000).toFixed(1)} mm in the model` } } : {}), matchedBy: wheelPts, rmsPx: +rms.toFixed(2), iou: sil.iou === null ? null : +sil.iou.toFixed(4), ...(sil.iou === null ? { iouSays: `no silhouette: the picture's border is not plain (it varies by ${sil.border} in its three channels together, more than 40)` } : {}), landmarks: rows, lines, profile, method: elev ? 'an elevation scaled by the wheelbase (its pixels between the wheel centres over the model\'s metres), placed and rolled to the wheels\' points by least squares; the model drawn from 1 km off with a lens to match, its outline laid over the drawing; in each column the model\'s top and bottom against the drawing\'s outermost ink above its ground, in mm' : "the camera (where it stood, its yaw, pitch and roll, its lens's height in degrees) that puts the model's tyres' outer faces (middle, top, bottom, front, back) where the photo has them, by Levenberg-Marquardt; each other landmark's miss in the picture, and on the car where the photo's ray meets the plane across the car through the model's landmark" };
  fs.writeFileSync(path.join(out, `${name}.ref.json`), JSON.stringify(res, null, 1));
  console.log(`${name}.png: ${res.kind}; ${elev ? `${res.scale.mmPerPx} mm a pixel (${res.scale.from}), roll ${res.camera.roll}°` : `camera at ${res.camera.at.join(', ')}, lens ${res.camera.fov}°`} (matched by ${wheelPts.length} wheel points to ${res.rmsPx} px rms); silhouette IoU ${res.iou ?? `none (${res.iouSays})`}`);
  if (profile) {
    console.log(`  extent: drawing ${profile.extent.drawing.join(' × ')} mm (length × height), model ${profile.extent.model.join(' × ')} mm`);
    console.log(`  top profile, model minus drawing: rms ${profile.top.rms} mm, worst ${profile.top.worst.mm} mm at ${profile.top.worst.share} of its length from the nose; bottom: rms ${profile.bottom.rms} mm, worst ${profile.bottom.worst.mm} mm at ${profile.bottom.worst.share}`);
    console.log(`  station  top: drawing  model   diff | bottom: drawing  model   diff (mm above ground)`);
    for (const st of profile.stations.filter((_, i) => i % 2 === 0)) console.log(`  ${st.share.toFixed(3).padStart(6)}  ${String(st.top[0].toFixed(0)).padStart(13)} ${String(st.top[1].toFixed(0)).padStart(6)} ${String((st.top[1] - st.top[0]).toFixed(0)).padStart(6)} | ${String(st.bot[0].toFixed(0)).padStart(15)} ${String(st.bot[1].toFixed(0)).padStart(6)} ${String((st.bot[1] - st.bot[0]).toFixed(0)).padStart(6)}`);
  }
  for (const r of rows.filter((q) => !q.matched)) console.log(`  ${r.name.padEnd(18)} ${r.model ? `misses by ${String(r.missPx).padStart(5)} px; on the car, model minus reference: dx ${String(r.dx).padStart(5)} mm, dy ${String(r.dy).padStart(5)} mm` : 'not a landmark the model has'}`);
  for (const [ln, v] of Object.entries(lines)) console.log(`  line ${ln.padEnd(6)} reference ${v.photo}, model ${v.model}: move it by ${v.move} of its length`);
}
// ---- grid: a picture's corner, enlarged, with its pixels numbered, so landmarks can be read off it as pixels ----
async function gridJob(name, image, box, k) {
  const buf = fs.readFileSync(image), mime = /\.png$/i.test(image) ? 'image/png' : 'image/jpeg', url = `data:${mime};base64,${buf.toString('base64')}`;
  const [x0, y0, x1, y1] = (box ?? '').split(',').map(Number), K = Math.max(1, Math.min(12, Number(k ?? 4))), w = (x1 - x0) * K, h = (y1 - y0) * K;
  if (!(w > 0 && h > 0)) { console.log(`${name}: grid needs a box "x0,y0,x1,y1" inside the picture`); return; }
  const pg = await browser.newPage({ viewport: { width: w, height: h } });
  await pg.setContent(`<body style="margin:0"><canvas id="c" width="${w}" height="${h}"></canvas><img id="i" src="${url}" style="display:none"></body>`);
  await pg.waitForFunction(() => document.getElementById('i').complete);
  await pg.evaluate(({ x0, y0, x1, y1, K, w, h }) => {
    const x = document.getElementById('c').getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(document.getElementById('i'), x0, y0, x1 - x0, y1 - y0, 0, 0, w, h);
    // (a line every pixel where the enlargement allows it, darker every 10, labelled every 50)
    const step = K >= 8 ? 1 : 5; x.font = '11px sans-serif';
    for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) { const X = (v - x0) * K + 0.5; x.strokeStyle = v % 50 === 0 ? 'rgba(0,90,255,0.9)' : v % 10 === 0 ? 'rgba(0,90,255,0.45)' : 'rgba(0,90,255,0.15)'; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, h); x.stroke(); if (v % 50 === 0) { x.fillStyle = '#0030a0'; x.fillText(String(v), X + 2, 11); } }
    for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) { const Y = (v - y0) * K + 0.5; x.strokeStyle = v % 50 === 0 ? 'rgba(0,90,255,0.9)' : v % 10 === 0 ? 'rgba(0,90,255,0.45)' : 'rgba(0,90,255,0.15)'; x.beginPath(); x.moveTo(0, Y); x.lineTo(w, Y); x.stroke(); if (v % 50 === 0) { x.fillStyle = '#0030a0'; x.fillText(String(v), 2, Y - 2); } }
  }, { x0, y0, x1, y1, K, w, h });
  const file = path.join(out, `${name}.png`); await (await pg.$('#c')).screenshot({ path: file }); await pg.close();
  console.log(`${name}.png: ${image} from ${x0},${y0} to ${x1},${y1}, ${K}× (a line every ${K >= 8 ? 1 : 5} px, labelled every 50)`);
}
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^(\w+):(.*)$/), cmd = m && ['parts', 'facts', 'pick', 'gap', 'clash', 'holes', 'sheet', 'shot', 'section', 'mass', 'lint', 'held', 'frame', 'diff', 'ref', 'grid'].includes(m[1]) ? m[1] : 'shot', [name, query, ...more] = (m && cmd !== 'shot' ? m[2] : arg.replace(/^shot:/, '')).split('|');
  if (cmd === 'shot') await shot(name, query);
  else if (cmd === 'holes') await shot(name, `${query}&holes=1`);
  else if (cmd === 'clash') await clash(name, query, Number(more[0] ?? 8));
  else if (cmd === 'held') await heldJob(name, query, Number(more[0] ?? 4));
  else if (cmd === 'frame') await frameJob(name, query);
  else if (cmd === 'diff') await diffJob(name, query, more[0]);
  else if (cmd === 'ref') await refJob(name, query, more[0], more[1], more[2]);
  else if (cmd === 'grid') await gridJob(name, query, more[0], more[1]);
  else if (cmd === 'sheet') await sheet(name, query);
  else if (cmd === 'section') await section(name, query, more[0]);
  else {
    const page = await open(query); if (!page) continue;
    const res = cmd === 'parts' ? await page.evaluate(() => window.look.parts()) : cmd === 'mass' ? await page.evaluate(() => window.look.mass()) : cmd === 'lint' ? await page.evaluate(() => window.look.lint()) : cmd === 'facts' ? await page.evaluate(() => window.look.facts()) : cmd === 'gap' ? await page.evaluate(([a, b]) => window.look.gap(a, b), more) : await page.evaluate((pts) => pts.map(([x, y]) => window.look.pick(x, y)), (more[0] ?? '').split(';').map((s) => s.split(',').map(Number)));
    await page.close(); fs.writeFileSync(path.join(out, `${name}.${cmd}.json`), JSON.stringify(res, null, 1));
    if (cmd === 'mass') { console.log(`${name}: ${res.kg} kg drawn${res.published ? ` (published ${res.published.toFixed(0)} kg)` : ''}; centre of mass at ${res.cog.join(', ')}; axles at x ${res.axles.join(', ')}${res.frontShare !== undefined ? `; front axle carries ${(res.frontShare * 100).toFixed(1)}%` : ''}`); for (const r of res.parts.slice(0, 25)) console.log(`  ${r.kg.toFixed(2).padStart(9)} kg  ${r.name.padEnd(34)} at ${r.at.join(',')}`); }
    else if (cmd === 'lint') { console.log(`${name}: ${res.length} found`); const by = new Map(); for (const r of res) { const k = `${r.rule}|${r.part}`; by.set(k, [...(by.get(k) ?? []), r]); } for (const [k, rs] of by) console.log(`  ${k.split('|')[0].padEnd(18)} ${k.split('|')[1]}  ×${rs.length}: ${rs[0].says}`); }
    else if (cmd === 'parts') { console.log(`${name}: ${res.length} parts drawn`); for (const p of res) console.log(`  ${p.name.padEnd(34)} ${String(p.mat).padEnd(10)} ${String(p.finish ?? '').padEnd(8)} ${p.color ?? ''}  ${p.min.map((x) => x.toFixed(2)).join(',')} → ${p.max.map((x) => x.toFixed(2)).join(',')}  ${p.path}`); }
    else console.log(`${name}.${cmd}`, JSON.stringify(res, null, 1));
  }
}
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 6).join(' | '));
await browser.close(); server.close();
