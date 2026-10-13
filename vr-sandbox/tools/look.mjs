// Render anything the library draws from named views, as a person would first see it: serves a built viewer, opens
// its look page for each ask and saves a screenshot. Run after building the viewer
// (npx vite build --config vite.view.config.ts --logLevel error --outDir ../dist-view-dev --emptyOutDir):
//
//   node tools/look.mjs <built viewer dir> <out dir> "name|words=sbc opi5 8GB&view=top" "name2|words=…&view=three"
//
// Each ask is a name and the look page's query (kit=part is added; view=top|three|front|side|rear|under, or dir=x,y,z;
// zoom, explode, only, hide, hi, cut, ortho=1: see src/nexus/view/look.ts). Prints what each look reports, and errors.
import { execSync } from 'node:child_process';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
// --list: after each view, print the pieces actually in the picture, counted by name with their sizes. The page has
// exposed `window.look.parts()` (name, path, material, says, box, triangles) all along and nothing ever called it, so
// a reader of the PNG could see a thing come apart and still not name one piece of it - which means they could not
// tell a complete explode from one missing half its parts. (docs/MANNY.md SIGHT #38)
const LIST = process.argv.includes('--list');
const SHA = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: new URL('..', import.meta.url).pathname }).toString().trim(); } catch { return 'no commit'; } })();
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
  // BURNED INTO THE IMAGE. A PNG travels without its log: it is read days later, pasted into a report, judged by
  // someone who never saw the command. So the ask, what the library actually resolved it to, the view and the commit
  // go in the corner of the picture itself — then a render cannot be mistaken for a render of something else, which
  // is the whole of docs/MANNY.md #32 and the fault that made every alarm necessary.
  await p.evaluate(([n, sha]) => {
    const r = window.lookReady ?? {}; const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;bottom:0;z-index:99999;font:11px/1.45 ui-monospace,monospace;color:#111;background:rgba(255,255,255,.82);padding:5px 8px;max-width:100%;white-space:pre-wrap;word-break:break-word';
    d.textContent = `ask: ${decodeURIComponent(new URLSearchParams(location.search).get('words') ?? '(none)')}\ndrew: ${r.name ?? '?'}   view: ${n}   ${r.meshes ?? '?'} meshes   ${sha}`;
    document.body.appendChild(d);
  }, [name, SHA]);
  await p.waitForTimeout(120);
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${name}.png` });
  const ready = await p.evaluate(() => window.lookReady);
  console.log(name, JSON.stringify(ready).slice(0, 300));
  // WHAT THE CRITIC SAID, on its own lines rather than cut off at 300 characters of JSON. `make/critic.ts` has run on
  // every render this project has ever made and `view/look.ts` binned its verdict; now that it reaches `lookReady`,
  // the one thing that must not happen is that it arrives and is still unread (docs/MANNY.md #77).
  if (Array.isArray(ready?.critic) && ready.critic.length) {
    // OPEN DEFECTS FIRST. Shipped as `slice(0, 12)` of the findings in the order the critic emits them, which puts
    // `walls` first — so the car's twelve printed lines were twelve identical "thickened" normalisations and a reader
    // never reached one thing that is actually wrong. A list cut to twelve is a choice of which twelve.
    const open = ready.critic.filter((f) => typeof f !== 'string' && !f.fixed), fixed = ready.critic.filter((f) => typeof f === 'string' || f.fixed);
    console.log(`  the critic, on this very picture (${open.length} still wrong, ${fixed.length} put right):`);
    // and AT MOST THREE PER CHECK, because one check floods the list: open defects first still gave twelve lines of
    // `declared` about the same five wheel studs, and a reader of the car learned about one check out of ten.
    const per = new Map(), pick = [];
    for (const f of [...open, ...fixed]) { const k = typeof f === 'string' ? '' : f.check, n = per.get(k) ?? 0; if (n < 3) { per.set(k, n + 1); pick.push(f); } }
    for (const f of pick.slice(0, 14)) console.log(`    - ${typeof f === 'string' ? f : `${f.fixed ? 'put right' : 'STILL WRONG'} — ${f.check}: ${f.part}: ${f.says}`}`.slice(0, 240));
    const more = [...per].filter(([, n]) => n >= 3).map(([k]) => k).filter(Boolean);
    if (more.length) console.log(`    (three shown of each; ${more.join(', ')} said more)`);
  } else if (ready && 'critic' in ready) console.log(`  the critic found nothing on this picture${ready.critic === null ? ' (it was not run: perfect=0)' : ''}`);
  // ITS INTERFACES, the same way. `contracts` arrived on `lookReady` in the same commit as `critic` above and no tool
  // printed it — the comment two lines up was written and then broken by its own author, three lines later
  // (docs/MANNY.md #89). It is the verdict that pairs a nut with the stud it needs, so "no bolt circle, the bearing
  // sits in a hole with no retention" is a sentence this line can write instead of a blind judge.
  if (Array.isArray(ready?.contracts) && ready.contracts.length) {
    const bad = ready.contracts.filter((c) => !c.ok);
    console.log(`  its interfaces (${ready.contracts.length} checked, ${ready.contracts.length - bad.length} meet, ${bad.length} fail):`);
    for (const c of bad.slice(0, 8)) console.log(`    - ${c.requirer} on the ${c.provider}: ${c.rows.filter((r) => !r.ok).map((r) => `${r.what} needs ${r.required}, has ${r.provided}`).join('; ')}`.slice(0, 240));
  } else if (ready && 'contracts' in ready) console.log(`  no interface was checked on this picture${ready.contracts === null ? ' (the critic was not run: perfect=0)' : ': nothing in it declares one'}`);
  // THE JUDGES THAT WERE ALREADY ON THE PAGE AND HAD NO CALLER. `window.look.held`, `.frame` and `.clash` have been
  // exposed by `view/look.ts` all along — three judges, nothing reading any of them, in a session whose own count was
  // that seven of nine faults were found by looking and two by rules (docs/ROUNDS.md Run 7m). The blind judge's
  // "nothing sits on anything" and "no bolt circle, the bearing in a hole with no retention" are sentences `held` can
  // write itself. Each prints its verdict and its worst case, under the picture, whether or not anyone asks.
  const judge = async (name, fn) => { try { return await p.evaluate(fn); } catch (e) { console.log(`  ${name}: could not run (${String(e).slice(0, 80)})`); return null; } };
  const h = await judge('held', () => { const r = window.look.held(); return { floats: r.floats.length, worstFloat: r.floats[0] ? { parts: r.floats[0].parts.slice(0, 3), n: r.floats[0].n, kg: +r.floats[0].kg.toFixed(1), via: r.floats[0].via.slice(0, 2) } : null, blocks: r.blocks.length, worstBlock: r.blocks[0] ?? null, rubs: (r.rubs ?? []).length }; });
  if (h) {
    console.log(`  held: ${h.floats} group${h.floats === 1 ? '' : 's'} held by nothing, ${h.blocks} joint${h.blocks === 1 ? '' : 's'} with something rigid laid across, ${h.rubs} link${h.rubs === 1 ? '' : 's'} that rub`);
    if (h.worstFloat) console.log(`    worst float: ${h.worstFloat.n} parts, ${h.worstFloat.kg} kg — ${h.worstFloat.parts.join(', ')}${h.worstFloat.via.length ? ` (touches ${h.worstFloat.via.join(', ')} without being held by it)` : ''}`);
    if (h.worstBlock) console.log(`    worst block: the ${h.worstBlock.by} laid across ${h.worstBlock.links?.join(' / ') ?? '?'}`);
  }
  const fr = await judge('frame', () => { const r = window.look.frame(); return { biw: r.biw.length, big: r.biw[0] ? { n: r.biw[0].n, kg: +r.biw[0].kg.toFixed(1), cut: r.biw[0].cut.slice(0, 2) } : null, structure: r.structure ? { n: r.structure.n, kg: +r.structure.kg.toFixed(1) } : null }; });
  if (fr) console.log(`  frame: its sheet is ${fr.biw} piece${fr.biw === 1 ? '' : 's'} joined by structure alone${fr.big ? `, the largest ${fr.big.n} parts / ${fr.big.kg} kg${fr.big.cut.length ? ` (cut from the rest at ${fr.big.cut.join(', ')})` : ''}` : ''}${fr.structure ? `; its structure ${fr.structure.n} parts / ${fr.structure.kg} kg` : ''}`);
  const cl = await judge('clash', () => { const r = window.look.clash(); const bad = r.filter((c) => c.kind === 'through' || c.kind === 'into'); return { n: r.length, bad: bad.length, worst: bad.sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0))[0] ?? null }; });
  if (cl) console.log(`  clashes: ${cl.n} touching pairs, ${cl.bad} where one passes into another${cl.worst ? ` — worst: ${cl.worst.pa} into ${cl.worst.pb} by ${((cl.worst.depth ?? 0) * 1000).toFixed(1)} mm` : ''}`);
  // WHICH CHECKS LOOKED AT NOTHING, which is the difference between "it is fine" and "nobody asked"
  // (src/nexus/make/critic.ts's `Looked`, docs/MANNY.md #87).
  if (ready?.looked) {
    const dead = Object.entries(ready.looked).filter(([, n]) => !n).map(([c]) => c);
    console.log(`  ${Object.keys(ready.looked).length - dead.length} of the critic's checks looked at this picture${dead.length ? `; these looked at nothing in it: ${dead.join(', ')}` : ''}`);
  }
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
