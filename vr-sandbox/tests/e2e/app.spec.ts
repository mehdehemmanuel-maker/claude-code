// The app in the headset (Meta's emulated Quest 3, IWER): building with the tools and the tablet, the ready-made
// builds, and save codes.

import { test } from '@playwright/test';
import { boot, counts, enterVR, expect, frames, sb, tap, triggerAt } from './helpers';

test('first visit: the tablet opens on the ready-made builds, and one opens from it', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer', true);
  await enterVR(page);
  expect(await sb(page, (s) => s.xr.tablet.page)).toBe('builds');
  await tap(page, 'tpl-go-kart');
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(8);
  expect(errors).toEqual([]);
});

test('place, stack, join, undo and redo in the headset', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  // Place tool: the trigger on the floor, then on top of the first block
  await tap(page, 'tab-tools');
  await tap(page, 'tool-place');
  await triggerAt(page, [0, 0, 0]);
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(1);
  await triggerAt(page, [0, 0.1, 0]);
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(2);
  const heights = await sb(page, (s) => Object.values(s.app.doc.parts).map((p: any) => p.pose.p[1]).sort());
  expect(heights[1]).toBeGreaterThan(0.12); // the second block sits on the first
  // Join tool (bolted by default): the front face of the lower block, then of the upper one
  await tap(page, 'tool-join');
  await triggerAt(page, [0, 0.05, 0.05]);
  await triggerAt(page, [0, 0.15, 0.05]);
  await frames(page, 4);
  expect((await counts(page)).conns).toBe(1);
  expect(await sb(page, (s) => (Object.values(s.app.doc.connections)[0] as any).kind)).toBe('bolted');
  // undo and redo the joint from the tablet
  await tap(page, 'tab-world');
  await tap(page, 'undo');
  await frames(page, 2);
  expect((await counts(page)).conns).toBe(0);
  await tap(page, 'redo');
  await frames(page, 2);
  expect((await counts(page)).conns).toBe(1);
  // select the top block with the Grab tool and delete it from the tablet: its joint goes too
  await tap(page, 'tab-tools');
  await tap(page, 'tool-grab');
  await triggerAt(page, [0, 0.15, 0.05]);
  await tap(page, 'tab-selected');
  await tap(page, 'del');
  await frames(page, 2);
  expect(await counts(page)).toEqual({ parts: 1, conns: 0 });
  expect(errors).toEqual([]);
});

test('a parameter stepped on the tablet changes the part', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-tools');
  await tap(page, 'tool-place');
  await triggerAt(page, [0, 0, 0]);
  await frames(page, 3);
  const before = await sb(page, (s) => (Object.values(s.app.doc.parts)[0] as any).params.x);
  await tap(page, 'tab-selected');
  await tap(page, 'pp-x+');
  await frames(page, 3);
  const after = await sb(page, (s) => (Object.values(s.app.doc.parts)[0] as any).params.x);
  // one step up: 10 % (25 % on a logarithmic parameter)
  expect([1.1, 1.25].some((f) => Math.abs(after / before - f) < 1e-9)).toBe(true);
  expect(errors).toEqual([]);
});

test('messages show in the headset, then fade', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await sb(page, (s) => s.app.toast('A joint gave way: 4.2 kN in shear against 3.9 kN', 'break'));
  await frames(page, 3);
  expect(await sb(page, (s) => s.xr.hud.mesh.visible)).toBe(true);
  // a message stays five seconds, then the panel clears
  await page.waitForFunction(() => !(window as any).sandbox.xr.hud.mesh.visible, null, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('save and share codes reconstruct the build byte for byte', async ({ page }) => {
  await boot(page);
  const same = await sb(page, (s) => {
    s.app.loadTemplate('magnets');
    const before = s.app.saveText();
    const code = s.app.shareCode();
    s.app.openShareCode(code);
    return { same: s.app.saveText() === before, prefix: code.slice(0, 6) };
  });
  expect(same).toEqual({ same: true, prefix: 'VRSB1.' });
});

test('catapult: erasing the latch wire throws the projectile', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 }); // software rendering: smaller is faster
  await boot(page);
  const start = await sb(page, (s) => {
    s.app.loadTemplate('catapult');
    const rope = Object.values(s.app.doc.connections).find((c: any) => c.kind === 'rope') as any;
    s.app.store.transact('Erase latch', (tx: any) => tx.delete('connections', rope.id));
    const ball = Object.values(s.app.doc.parts).find((p: any) => p.name === 'Projectile') as any;
    return { id: ball.id, x: ball.pose.p[0] };
  });
  await page.waitForFunction((b) => {
    const p = (window as any).sandbox.app.live.latest(b.id);
    return p && Math.abs(p.p[0] - b.x) > 0.5;
  }, start, { timeout: 90_000 });
});

test('every template runs without errors or spurious failures', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  for (const id of ['newtons-cradle', 'catapult', 'shelf', 'magnets', 'spring-launcher', 'raft', 'go-kart']) {
    await page.evaluate((t) => { (window as any).__tpl = t; (window as any).sandbox.app.loadTemplate(t); }, id);
    await frames(page, 30);
    const broken = await sb(page, (s) => Object.values(s.app.doc.connections).filter((c: any) => c.state.status === 'broken').length);
    expect(broken, id).toBe(0);
  }
  expect(errors).toEqual([]);
});
