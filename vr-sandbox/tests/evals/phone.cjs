// The phone page (view/vibe.html, decision 0023) at a phone's size (an iPhone 13 as Playwright emulates it: not a
// phone), against the app as `npm run app` serves it (the relay with its key, under Node). It lands from the address
// as a phone does, opens a piece board from its chip, and, given a request, asks Claude for it and takes a picture every
// 15 s while it builds. It says what the page says of what is shown (pieces, mass, size) and any page error.
//
//   npm run app   (in another shell; it serves http://127.0.0.1:5173)
//   node tests/evals/phone.cjs <out folder> ["a request to build"]
const { chromium, devices } = require('playwright');
const { mkdirSync } = require('node:fs');
const [out, q] = [process.argv[2] ?? '.audit/phone', process.argv[3]];
const URL = process.env.NEXUS_URL ?? 'http://127.0.0.1:5173';
(async () => {
  mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  const stat = async () => (await p.$eval('#stat', (e) => e.innerText)).replace(/\n/g, ' ');
  try {
    await p.goto(`${URL}/`); await p.waitForLoadState('load'); console.log('landed on', p.url());
    await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/1-empty.png` });
    await p.click('.chip.open:has-text("DC motor")'); await p.waitForTimeout(5000); console.log('DC motor chip:', await stat()); await p.screenshot({ path: `${out}/2-chip.png` });
    if (q) {
      await p.fill('#q', q); const t0 = Date.now(); await p.click('#go');
      for (let n = 1; Date.now() - t0 < 300000; n++) { await p.waitForTimeout(15000); const busy = await p.evaluate(() => window.nexusVibe.busy()); await p.screenshot({ path: `${out}/3-ask-${n}.png` });
        console.log(`${Math.round((Date.now() - t0) / 1000)} s`, busy ? 'working' : 'done', '|', await stat()); if (!busy) break; }
      console.log('its answer:', (await p.$$eval('.msg.ai', (xs) => xs.at(-1)?.innerText ?? '')).slice(0, 400).replace(/\n+/g, ' '));
    }
  } finally { console.log('page errors:', errs.length ? errs : 'none'); await b.close(); }
})();
