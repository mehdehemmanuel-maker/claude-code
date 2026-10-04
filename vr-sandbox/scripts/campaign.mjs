// The user-side campaign: drive the real built app in Chromium (software WebGL, the headset emulated), ask Ego to
// build things the way a user would, and record what happened: how long she took, what she made, whether it stood,
// what the watchdog saw, what her journal says, and what the headset view and the tablet look like (PNGs).
// Usage: node campaign.mjs http://localhost:4173/ out-dir
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'campaign-out';
mkdirSync(out, { recursive: true });
const log = [];
const say = (...a) => { const line = a.join(' '); console.log(line); log.push(line); };

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/wikidata|Failed to load resource/.test(m.text())) errors.push(m.text()); });
const t00 = Date.now();
await page.goto(`${base}?iwer`);
await page.waitForFunction(() => !document.getElementById('loading') && window.sandbox, null, { timeout: 90_000 });
await page.waitForFunction(() => window.sandbox.xr, null, { timeout: 30_000 });
say(`boot: ${Date.now() - t00} ms to a running world`);
await page.evaluate(() => { document.getElementById('launch').hidden = true; });
const frames = (n) => page.evaluate((k) => new Promise((res) => { let i = 0; const t = () => (++i >= k ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); }), n);
const sb = (fn) => page.evaluate(`(${fn.toString()})(window.sandbox)`);
const world = () => sb((s) => ({ parts: Object.keys(s.app.doc.parts).length, conns: Object.keys(s.app.doc.connections).length, broken: Object.values(s.app.doc.connections).filter((c) => c.state.status === 'broken').length, watchdog: s.app.live.health.length, fps: Math.round(s.app.fps), stepMs: +(s.app.live.stats?.stepMs ?? 0).toFixed(2), bodies: s.app.live.stats?.bodies ?? 0, build: s.app.settings.build, place: s.app.place?.id ?? null }));

/** Ask Ego something as the user would, timed, with what the world is after. */
async function ask(text, settle = 60) {
  const t0 = Date.now();
  const reply = await page.evaluate((t) => window.sandbox.ego.ask(t), text);
  const ms = Date.now() - t0;
  await frames(settle);
  const w = await world();
  say(`\n> ${text}\n  [${ms} ms] ${String(reply).slice(0, 600)}\n  world: ${JSON.stringify(w)}`);
  return { reply: String(reply), ms, world: w };
}
async function forge(program, settle = 30) {
  const t0 = Date.now();
  const r = await page.evaluate((p) => window.sandbox.ego.run(p), program);
  const ms = Date.now() - t0;
  await frames(settle);
  const w = await world();
  say(`\n> Forge: ${program.slice(0, 120)}\n  [${ms} ms] ${JSON.stringify(r).slice(0, 200)}\n  world: ${JSON.stringify(w)}`);
  return { ms, world: w };
}
async function shot(name) { await frames(3); await page.screenshot({ path: join(out, `${name}.png`) }); }
async function tablet(name, pg) {
  const data = await page.evaluate((p) => { const { xr } = window.sandbox; if (p) xr.tablet.page = p; xr.tablet.draw(); return xr.tablet.canvas.toDataURL('image/png'); }, pg ?? null);
  writeFileSync(join(out, `tablet-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
}
/** Play the physics and watch: does anything break, how far do things drop or slide. */
async function standing(seconds) {
  const before = await sb((s) => Object.fromEntries(Object.keys(s.app.doc.parts).map((id) => [id, s.app.livePose(id)?.p ?? s.app.doc.parts[id].pose.p])));
  await sb((s) => s.app.play());
  const t0 = Date.now();
  const tick0 = await sb((s) => s.app.live.ticks);
  while ((await sb((s) => s.app.live.ticks)) - tick0 < seconds * 90 && Date.now() - t0 < 90_000) await frames(10);
  const after = await sb((s) => ({ broken: Object.values(s.app.doc.connections).filter((c) => c.state.status === 'broken').map((c) => c.kind), poses: Object.fromEntries(Object.keys(s.app.doc.parts).map((id) => [id, s.app.livePose(id)?.p])), ticks: s.app.live.ticks, health: s.app.live.health.map((a) => `${a.kind}:${a.id}`), energy: s.app.live.energy && { kinetic: +s.app.live.energy.kinetic.toFixed(3), lost: +s.app.live.energy.numerical.lost.toFixed(3), gained: +s.app.live.energy.numerical.gained.toFixed(3) }, stepMs: +(s.app.live.stats?.stepMs ?? 0).toFixed(2), fps: Math.round(s.app.fps) }));
  let maxDrop = 0, maxMove = 0;
  for (const id of Object.keys(before)) { const a = before[id], b = after.poses[id]; if (!a || !b) continue; maxDrop = Math.max(maxDrop, a[1] - b[1]); maxMove = Math.max(maxMove, Math.hypot(a[0] - b[0], a[2] - b[2])); }
  say(`  played ${((after.ticks - tick0) / 90).toFixed(1)} s (${Date.now() - t0} ms wall, ${after.stepMs} ms/step, ${after.fps} fps): broken ${after.broken.length} ${after.broken.join(',')}; max drop ${maxDrop.toFixed(3)} m, max sideways ${maxMove.toFixed(3)} m; watchdog ${after.health.join(' ') || 'clear'}; energy ${JSON.stringify(after.energy)}`);
  await sb((s) => s.app.stop());
  await frames(5);
  return { maxDrop, maxMove, broken: after.broken.length, health: after.health };
}
async function fresh() { await sb((s) => { s.app.newBuild(); s.app.enterBuild(); }); await frames(5); }

// ---------------------------------------------------------------- 1. designs she sizes, builds and tests on her stand
say('=== 1. designs');
await fresh();
await ask('build a table that holds 60 kg', 120);
await shot('01-table');
await tablet('01-ego', 'ego');
await standing(3);
await ask('what are you working on');
await ask('what changed');
await fresh();
await ask('build a bench that holds 150 kg in steel');
await standing(3);
await fresh();
await ask('build a shelf unit 1.8 m high with 5 shelves that holds 30 kg');
await shot('02-shelf');
await standing(3);
await fresh();
await ask('build a brick wall 2 m long and 1 m high');
await shot('03-wall');
await standing(4);
await fresh();
await ask('build a tower of 20 blocks');
await standing(4);
await fresh();
await ask('build a crate');
await standing(2);

// ---------------------------------------------------------------- 2. iteration: the user changes their mind
say('\n=== 2. iteration');
await fresh();
await ask('build a table that holds 60 kg');
await ask('make it stronger');
await ask('make it taller');
await ask('make it out of oak');
await ask('why did it break?');
await ask('build a table 2 m long that holds 200 kg');
await shot('04-big-table');
await standing(3);

// ---------------------------------------------------------------- 3. shapes, inventions, machines
say('\n=== 3. generative: shapes, inventions, machines');
await fresh();
await ask('make a 40 mm steel sphere');
await ask('make a hollow 60 mm cube with 2 mm walls filled with a gyroid lattice of 12 mm cells');
await ask('make a NACA 2412 wing 300 mm long with a 100 mm chord');
await shot('05-forms');
await ask('invent a bracket that holds 500 N at 120 mm from the wall');
await ask('make a part shaped like a dragon');
await ask('grow a machine that turns electrical energy into motion');
await ask('what does a go-kart need?');
await ask('pick a drive for a 120 kg kart at 3 m/s');
await ask('build a bridge 2 m long that holds 100 kg');
await ask('build a ladder 2 m tall');
await ask('build a chair');
await ask('build a house');

// ---------------------------------------------------------------- 4. environments and creatures
say('\n=== 4. environments and creatures');
await ask('I just want to chill on a beach', 90);
await shot('06-beach');
await ask('put a fish in the sea', 90);
await ask('put a dog on the beach', 90);
await shot('07-creatures');
await standing(3);
await ask('what is the dog doing?');
await ask('take me to a mountainside', 90);
await shot('08-mountain');
await ask('populate this forest with glowing sky-whales');
await ask('spawn a medieval village with family trees');
await ask('back to the workshop', 60);

// ---------------------------------------------------------------- 5. breaking the laws
say('\n=== 5. breaking the laws');
await fresh();
await ask('place 4 steel blocks');
await ask('zero gravity');
await standing(2);
await ask('earth gravity');
await ask('make a 100% efficient motor');
await ask('make a perpetual motion machine');
await ask('build a table that holds 100000 kg');
await ask('make a part with zero mass');
await forge('place block at 0 0.05 -1 as a\nplace block at 0 0.05 -1 as b');
await standing(2);

// ---------------------------------------------------------------- 6. complexity and speed: Forge at scale
say('\n=== 6. complexity and speed');
for (const n of [50, 200, 400]) {
  await fresh();
  await forge(`repeat ${n} { place block x=0.1 y=0.1 z=0.1 mat wood.douglas-fir at ((i % 20)*0.12 - 1.2) (0.05 + (i - i % 20) / 20 * 0.11) -1.5 as b }`);
  if (n === 400) { await shot('09-400-blocks'); await standing(3); }
}
await fresh();
await forge('repeat 30 { place block x=0.1 y=0.1 z=0.1 mat wood.douglas-fir at 0 (0.05 + i*0.1005) -1.5 as t }\nrepeat 29 { join t(i) t(i+1) }');
await shot('10-tower-30');
await standing(3);

// ---------------------------------------------------------------- 7. the tablet, every page
say('\n=== 7. the tablet');
await fresh();
await ask('build a table that holds 60 kg');
for (const p of ['ego', 'make', 'selected', 'world', 'builds']) await tablet(p, p);
await page.evaluate(() => { const { xr, app } = window.sandbox; const id = Object.keys(app.doc.parts)[0]; app.select([id]); xr.tablet.page = 'selected'; xr.tablet.draw(); });
await tablet('selected-part', null);
await page.evaluate(() => { const { xr } = window.sandbox; xr.tablet.page = 'make'; xr.tablet.shelf = 'Parts'; xr.tablet.draw(); });
await tablet('make-parts', null);

say(`\nerrors: ${errors.length ? errors.join(' | ') : 'none'}`);
writeFileSync(join(out, 'campaign.log'), log.join('\n'));
await browser.close();
