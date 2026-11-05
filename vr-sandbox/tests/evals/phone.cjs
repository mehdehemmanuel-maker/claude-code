// The phone page (view/vibe.html, decisions 0023 and 0025) at a phone's size (an iPhone 13 as Playwright emulates it: not a
// phone), against the app as `npm run app` serves it (the relay with its key, under Node). It lands from the address as
// a phone does, then works each of the three ways to build, each from an empty board and a fresh browser store:
//   by hand (no AI, nothing sent): a plate, a bolt through its first hole, a nut over the bolt's shank, then Undo;
//   Assist: given a request, one call for a plan, shown, then built on the page; with none, a plan written by hand in
//     the model's own form is shown and built instead (no call: said so);
//   Auto: given a request, the agent's streamed run, a picture every 15 s while it builds.
// It says what the page says of what is shown (pieces, mass, size), each run's tokens as the page counts them, and any
// page error. MODES=hand,assist,auto picks which (all by default; Assist and Auto make one real call each).
//
//   npm run app   (in another shell; it serves http://127.0.0.1:5173)
//   node tests/evals/phone.cjs <out folder> ["a request to build"]
const { chromium, devices } = require('playwright');
const { mkdirSync } = require('node:fs');
const [out, q] = [process.argv[2] ?? '.audit/phone', process.argv[3]];
const URL = process.env.NEXUS_URL ?? 'http://127.0.0.1:5173';
const MODES = (process.env.MODES ?? 'hand,assist,auto').split(',');
(async () => {
  mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  const stat = async () => (await p.$eval('#stat', (e) => e.innerText)).replace(/\n/g, ' ');
  const last = async () => (await p.$$eval('.msg.ai', (xs) => xs.at(-1)?.innerText ?? '')).slice(0, 500).replace(/\n+/g, ' ');
  const shot = (name) => p.screenshot({ path: `${out}/${name}.png` });
  // (the board as it stands, a node a line: its block and whether it ran, so a run can be checked, not only seen)
  const nodes = () => p.evaluate(() => { const b = window.nexusVibe.board(); return Object.entries(b.nodes).filter(([, n]) => !n.deleted).map(([id, n]) => `${id}:${n.block}`).join(' '); });
  const idle = async (ms = 120000) => { const t0 = Date.now(); await p.waitForTimeout(400); while (Date.now() - t0 < ms && await p.evaluate(() => window.nexusVibe.busy())) await p.waitForTimeout(300); };
  const fresh = async (mode) => { await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000); await p.click(`#modes button[data-mode="${mode}"]`); await p.waitForTimeout(300); };
  try {
    await p.goto(`${URL}/`); await p.waitForLoadState('load'); console.log('landed on', p.url());
    await fresh('auto'); await shot('1-empty');
    if (MODES.includes('hand')) {
      await fresh('hand'); await shot('2-hand-palette');
      // (a plate, its defaults; then a bolt through its first hole; then a nut over the bolt's shank, a touch fit)
      await p.click('.chip.piece:has-text("Plate")'); await p.waitForTimeout(300); await shot('3-hand-form');
      await p.click('#hadd'); await idle(); console.log('by hand, a plate:', await stat(), '|', await last());
      await p.click('.chip.piece:has-text("Bolt or screw")'); await p.waitForTimeout(300);
      await p.selectOption('#hj', 'room.through'); await p.waitForTimeout(300); await p.fill('#hp_length', '20'); await shot('4-hand-join');
      await p.click('#hadd'); await idle(); console.log('by hand, a bolt through its hole:', await stat(), '|', await last());
      await p.click('.chip.piece:has-text("Nut")'); await p.waitForTimeout(300);
      await p.selectOption('#hj', 'room.over'); await p.waitForTimeout(300);
      const shank = await p.$$eval('#ho_line option', (os) => os.map((o) => o.value).find((v) => /shank\/axis$/.test(v)) ?? ''); await p.selectOption('#ho_line', shank);
      await p.selectOption('#ho_where', 'hi'); await p.selectOption('#ho_fit', 'touch');
      await p.click('#hadd'); await idle(); console.log('by hand, a nut over the shank:', await stat(), '|', await last()); console.log('  its nodes:', await nodes()); await shot('5-hand-built');
      await p.click('#undo'); await idle(); console.log('undone:', await stat()); await shot('6-hand-undone');
    }
    if (MODES.includes('assist')) {
      await fresh('assist');
      if (q) { await p.fill('#q', q); await p.click('#go'); await idle(); console.log('Assist, its plan:', await last()); }
      else { console.log('Assist: no request, so no call: a plan written by hand in the model\'s form is shown');
        await p.evaluate(() => window.nexusVibe.showPlan({ tool: 'build', says: 'Two plates, bolted at two holes (written by hand: no call)', input: { nodes: { bot: { b: 'piece.plate', s: { name: 'bottom plate', t: 3 } }, top: { b: 'piece.plate', s: { name: 'top plate', t: 3 } }, st: { b: 'room.stack', s: { axis: 'y' } }, j0: { b: 'mate.bolted', s: { line: 'top plate/holes', which: 0, size: 'M8' } }, j1: { b: 'mate.bolted', s: { line: 'top plate/holes', which: 1, size: 'M8' } }, m: { b: 'measure' }, a: { b: 'assert', s: { what: 'their mass', how: 'at most', target: 0.2 } } }, wires: ['bot.block>st.blocks', 'top.block>st.blocks', 'st.block>j0.held', 'j0.block>j1.held', 'j1.thing>m.thing', 'm.mass>a.value'] } }, 'two plates bolted')); }
      await p.waitForTimeout(300); await shot('7-assist-plan');
      if (await p.$('#pbuild')) { await p.click('#pbuild'); await idle(); console.log('Assist, built:', await stat(), '|', await last()); console.log('  its nodes:', await nodes()); await shot('8-assist-built'); }
      console.log('tokens counted by the page after Assist:', JSON.stringify(await p.evaluate(() => window.nexusVibe.tokens())));
    }
    if (MODES.includes('auto') && q) {
      await fresh('auto'); await p.fill('#q', q); const t0 = Date.now(); await p.click('#go');
      for (let n = 1; Date.now() - t0 < 200000; n++) { await p.waitForTimeout(15000); const busy = await p.evaluate(() => window.nexusVibe.busy()); await shot(`9-auto-${n}`);
        console.log(`${Math.round((Date.now() - t0) / 1000)} s`, busy ? 'working' : 'done', '|', await stat()); if (!busy) break; }
      console.log('Auto, its answer:', await last()); console.log('  its nodes:', await nodes());
      console.log('tokens counted by the page after Auto:', JSON.stringify(await p.evaluate(() => window.nexusVibe.tokens())));
    }
  } finally { console.log('page errors:', errs.length ? errs : 'none'); await b.close(); }
})();
