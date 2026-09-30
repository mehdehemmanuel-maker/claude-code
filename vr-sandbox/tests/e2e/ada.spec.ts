// Ada in the headset: Forge typed on the tablet builds; a break gets a diagnosis and a fix that holds; the tablet's
// search finds anything and puts what you pick in the hotbar.

import { test } from '@playwright/test';
import { boot, counts, enterVR, expect, frames, sb, tap } from './helpers';

test('Forge on the tablet: typed on the keys, run, and journalled', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-ada');
  await tap(page, 'forge');
  // a few real key presses, then the rest of the line
  for (const k of ['p', 'l', 'a', 'c', 'e']) await tap(page, `key-${k}`);
  expect(await sb(page, (s) => s.ada.command)).toBe('place');
  await sb(page, (s) => { s.ada.command = 'repeat 3 { place block at (i*0.3) 0.05 -1 as leg }'; });
  await tap(page, 'forge-run');
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(3);
  const names = await sb(page, (s) => Object.values(s.app.doc.parts).map((p: any) => p.name).sort());
  expect(names).toEqual(['leg0', 'leg1', 'leg2']);
  expect(await sb(page, (s) => s.ada.journal.filter((l: string) => l.startsWith('place block')).length)).toBe(3);
  // a mistake is explained, not thrown
  await sb(page, (s) => { s.ada.command = 'join leg0 leg2'; });
  await tap(page, 'forge-run');
  expect(await sb(page, (s) => s.ada.output.at(-1))).toMatch(/aren't touching/);
  expect(errors).toEqual([]);
});

test('Ada: a joint that breaks gets the reason and a fix that holds', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  // a 2x4 arm on a frozen post with the old 40 mm screws: they never reach through the post, so it falls apart
  await sb(page, (s) => {
    const { app } = s;
    const post = app.ada.host.place('block', {}, 'wood.douglas-fir', [0, 1, 0], [], 'post');
    app.store.transact('freeze', (tx: any) => tx.update('parts', post, { frozen: true }));
    app.ada.host.place('lumber', { length: 0.6 }, 'wood.douglas-fir', [0.35, 1, 0], [], 'arm');
    app.ada.run('join post arm with screwed');
    const c = Object.values(app.doc.connections)[0] as any;
    app.store.transact('old screws', (tx: any) => tx.update('connections', c.id, { params: { ...c.params, length: 0.04 } }));
  });
  await page.waitForFunction(() => (window as any).sandbox.ada.advice.some((a: any) => a.kind === 'break'), null, { timeout: 60_000 });
  const advice = await sb(page, (s) => { const a = s.ada.advice.find((x: any) => x.kind === 'break'); return { text: a.text, fixes: a.fixes.map((f: any) => f.label) }; });
  expect(advice.text).toMatch(/screwed joining post and arm broke/);
  expect(advice.fixes.length).toBeGreaterThan(0);
  // apply the first fix: the arm is set back and fastened with something that carries 1.5x the load
  await sb(page, (s) => s.ada.advice.find((x: any) => x.kind === 'break').fixes[0].apply());
  await frames(page, 90);
  const after = await sb(page, (s) => {
    const c = Object.values(s.app.doc.connections)[0] as any;
    const arm = Object.values(s.app.doc.parts).find((p: any) => p.name === 'arm') as any;
    return { status: c.state.status as string, y: s.app.livePose(arm.id).p[1] as number };
  });
  expect(after.status).toBe('intact');
  expect(Math.abs(after.y - 1)).toBeLessThan(0.02);
  expect(errors).toEqual([]);
});

test('search finds anything as you type; what you pick goes in the hotbar', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-search');
  for (const k of ['o', 'a', 'k']) await tap(page, `skey-${k}`);
  await frames(page, 2);
  await tap(page, 'found-0');
  const picked = await sb(page, (s) => ({ mat: s.app.spawnMaterial, tool: s.tools.tool.id, hot: s.xr.tablet.hotbar.items[0] }));
  expect(picked.mat).toMatch(/oak/);
  expect(picked.tool).toBe('place');
  expect(picked.hot).toEqual({ type: 'material', id: picked.mat });
  // a hotbar slot picks it up again
  await tap(page, 'tab-tools');
  await tap(page, 'tool-grab');
  await tap(page, 'hot-0');
  expect(await sb(page, (s) => s.tools.tool.id)).toBe('place');
  expect(errors).toEqual([]);
});
