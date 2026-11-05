// The phone page (view/vibe.html, decisions 0023 and 0025) at a phone's size (an iPhone 13 as Playwright emulates it: not a
// phone), against the app as `npm run app` serves it (the relay with its key, under Node). It lands from the address as
// a phone does, then works each of the three ways to build, each from an empty board and a fresh browser store:
//   by hand (no AI, nothing sent): a plate, a bolt through its first hole (the form kept for the next), a nut over the
//     bolt's shank on the operation's own fit (the page takes the loosest the room allows, and says so), Undo, then a
//     bolted joint (bolt, washer and nut in one step) on the plate's other hole; then a board with several ends, a piece
//     joined to one chosen in its row, and the four newest boards opened from their chips;
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
      console.log('palette:', await p.$$eval('.chip.step', (xs) => xs.length), 'joints,', await p.$$eval('.chip.piece', (xs) => xs.length), 'pieces; boards:', (await p.$$eval('.chip.open', (xs) => xs.map((x) => x.innerText.replace(/^\W+/, '')))).join(', '));
      // (a plate, its defaults; then a bolt through its first hole; then a nut over the bolt's shank on Over's own fit)
      await p.click('.chip.piece:has-text("Plate")'); await p.waitForTimeout(300); await shot('3-hand-form');
      await p.click('#hadd'); await idle(); console.log('by hand, a plate:', await stat(), '|', await last());
      await p.click('.chip.piece:has-text("Bolt or screw")'); await p.waitForTimeout(300);
      await p.selectOption('#hj', 'room.through'); await p.waitForTimeout(300); await p.fill('#hp_length', '20'); await shot('4-hand-join');
      await p.click('#hadd'); await idle(); console.log('by hand, a bolt through its hole:', await stat(), '|', await last());
      console.log('  the form after it: length', await p.inputValue('#hp_length'), '· joined by', await p.inputValue('#hj'), '· which', await p.inputValue('#ho_which'), '· to', await p.$$eval('.end.on, .panel .says b', (xs) => xs.map((x) => x.innerText).join()));
      await p.click('.chip.piece:has-text("Nut")'); await p.waitForTimeout(300);
      await p.selectOption('#hj', 'room.over'); await p.waitForTimeout(300);
      const shank = await p.$$eval('#ho_line option', (os) => os.map((o) => o.value).find((v) => /shank\/axis$/.test(v)) ?? ''); await p.selectOption('#ho_line', shank);
      await p.selectOption('#ho_where', 'hi');
      await p.click('#hadd'); await idle(); console.log('by hand, a nut over the shank (its fit left to the page):', await stat(), '|', await last()); console.log('  its nodes:', await nodes()); await shot('5-hand-built');
      await p.click('#undo'); await idle(); console.log('undone:', await stat());
      // (a bolted joint, bolt, washer and nut in one step, on the plate's other hole)
      await p.click('.chip.step:has-text("Bolted joint")'); await p.waitForTimeout(300); await p.fill('#ho_which', '1'); await shot('6-hand-joint-form');
      await p.click('#hadd'); await idle(); console.log('by hand, a bolted joint on the other hole:', await stat(), '|', await last()); console.log('  its nodes:', await nodes()); await shot('6-hand-joint');
      // (a board with several ends: a piece joined to the one chosen in the row of ends)
      // (the starter motor's board ends twice: the motor on its bracket, bolted; and the solenoid tried inside it)
      await p.click('.chip.open:has-text("Starter motor")'); await p.waitForTimeout(2500); console.log('Starter motor opened:', await stat(), '| its ends:', JSON.stringify(await p.evaluate(() => window.nexusVibe.ends())));
      await p.click('.chip.piece:has-text("Washer")'); await p.waitForTimeout(300); const ends = await p.$$('.end'); if (ends.length > 1) await ends[0].click(); await p.waitForTimeout(300); await shot('7-hand-ends');
      console.log('  joined to:', await p.$$eval('.end.on', (xs) => xs.map((x) => x.innerText).join()));
      // (a tap on the thing in the view chooses the end it is)
      const v = await p.$eval('#view', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await p.touchscreen.tap(v[0], v[1]); await p.waitForTimeout(400);
      console.log('  after a tap on the thing in the view, joined to:', await p.$$eval('.end.on', (xs) => xs.map((x) => x.innerText).join()), '| the view says:', await p.$eval('#picked', (e) => e.innerText)); await shot('7-hand-ends-tapped');
      for (const [k, label] of [['8a', 'Pipes that turn'], ['8b', 'Electronics'], ['8c', 'Mechanical'], ['8d', 'Small builds']]) {
        await p.click(`.chip.open:has-text("${label}")`); await p.waitForTimeout(3000); console.log(`${label} opened:`, await stat()); await shot(`${k}-board-${label.toLowerCase().replace(/ /g, '-')}`); }
    }
    // (what Auto shows of an answer that opens with a hedge: its head, the hedge under it in sight, the rest under More)
    console.log('an answer that opens with a hedge, cut:', JSON.stringify(await p.evaluate(() => window.nexusVibe.headOf("I built the assembly, but I haven't checked every detail, so please look at it before relying on it.\n\n**Built:** two 3 mm plates, 80 by 50 mm, bolted with four M5 bolts: 81 g (node m).\n\nEach bolt is an ISO 4017 hex bolt."))));
    if (MODES.includes('assist')) {
      await fresh('assist');
      // (the plan itself printed too, its wires with it, so a line that fails can be read after: the first real re-shoot's
      // stack failed, "not made by the constructor", and its wires were not kept)
      if (q) { await p.fill('#q', q); await p.click('#go'); await idle(); console.log('Assist, its plan:', await last()); console.log('  the plan:', JSON.stringify(await p.evaluate(() => window.nexusVibe.plan()?.plan ?? null))); }
      else { console.log('Assist: no request, so no call: a plan written by hand in the model\'s form is shown');
        await p.evaluate(() => window.nexusVibe.showPlan({ tool: 'build', says: 'Two plates, bolted at two holes (written by hand: no call)', input: { nodes: { bot: { b: 'piece.plate', s: { name: 'bottom plate', t: 3 } }, top: { b: 'piece.plate', s: { name: 'top plate', t: 3 } }, st: { b: 'room.stack', s: { axis: 'y' } }, j0: { b: 'mate.bolted', s: { line: 'top plate/holes', which: 0, size: 'M8' } }, j1: { b: 'mate.bolted', s: { line: 'top plate/holes', which: 1, size: 'M8' } }, m: { b: 'measure' }, a: { b: 'assert', s: { what: 'their mass', how: 'at most', target: 0.2 } } }, wires: ['bot.block>st.blocks', 'top.block>st.blocks', 'st.block>j0.held', 'j0.block>j1.held', 'j1.thing>m.thing', 'm.mass>a.value'] } }, 'two plates bolted')); }
      await p.waitForTimeout(300); await shot('9-assist-plan');
      if (await p.$('#pbuild')) { await p.click('#pbuild'); await idle(); console.log('Assist, built:', await stat(), '|', await last()); console.log('  its nodes:', await nodes()); await shot('9-assist-built'); }
      console.log('tokens counted by the page after Assist:', JSON.stringify(await p.evaluate(() => window.nexusVibe.tokens())));
    }
    if (MODES.includes('auto') && q) {
      await fresh('auto'); await p.fill('#q', q); const t0 = Date.now(); await p.click('#go');
      for (let n = 1; Date.now() - t0 < 200000; n++) { await p.waitForTimeout(15000); const busy = await p.evaluate(() => window.nexusVibe.busy()); await shot(`10-auto-${n}`);
        console.log(`${Math.round((Date.now() - t0) / 1000)} s`, busy ? 'working' : 'done', '|', await stat()); if (!busy) break; }
      console.log('Auto, its answer:', await last()); console.log('  its nodes:', await nodes());
      console.log('tokens counted by the page after Auto:', JSON.stringify(await p.evaluate(() => window.nexusVibe.tokens())));
    }
  } finally { console.log('page errors:', errs.length ? errs : 'none'); await b.close(); }
})();
