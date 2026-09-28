// The deployed site: GitHub Pages serves the build from a subpath (/claude-code/), and the Quest browser opens it
// from there. The page, the physics worker and its WebAssembly all have to load relative to that path.

import { test } from '@playwright/test';
import { expect } from './helpers';

const SITE = 'http://localhost:4174/claude-code/';

test('the build boots and simulates when served from a Pages subpath', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors: string[] = [];
  const missing: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => localStorage.setItem('vrsb.seenTemplates', '1'));
  await page.goto(SITE);
  await page.waitForFunction(() => !document.getElementById('loading') && (window as any).sandbox, null, { timeout: 60_000 });
  // physics runs in its worker and advances
  const state = await page.evaluate(async () => {
    const { app } = (window as any).sandbox;
    app.loadTemplate('newtons-cradle');
    const t0 = app.live.ticks;
    await new Promise<void>((res) => { const k = () => (app.live.ticks - t0 > 45 && app.live.stats ? res() : requestAnimationFrame(k)); k(); });
    return { mode: app.physics.mode, bodies: app.live.stats.bodies as number, error: app.physics.lastError };
  });
  expect(state.mode).toBe('worker');
  expect(state.error).toBeNull();
  expect(state.bodies).toBeGreaterThan(5);
  expect(missing).toEqual([]);
  expect(errors).toEqual([]);
});

test('the headset emulator and its room load from the subpath too', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('vrsb.seenTemplates', '1'));
  await page.goto(`${SITE}?iwer`);
  await page.waitForFunction(() => (window as any).sandbox?.xr, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).sandbox.app.renderer.xr.setFramebufferScaleFactor(0.25));
  await page.selectOption('#vrmode', 'mixed');
  await page.click('#vr');
  await page.waitForFunction(() => (window as any).sandbox.app.room.length === 8, null, { timeout: 20_000 });
  expect(errors).toEqual([]);
});
