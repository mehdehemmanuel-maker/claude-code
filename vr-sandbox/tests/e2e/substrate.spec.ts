import { test, expect } from '@playwright/test';
import { boot } from './helpers';

// Ego's substrate grows in the background after launch and what it asked is kept in this browser when the page hides.
test('the substrate is worked in the background and kept when the page hides', async ({ page }) => {
  const errors = await boot(page);
  // the service starts 2.5 s after launch and works a slice twice a second: wait until it has answered questions
  await page.waitForFunction(() => {
    window.dispatchEvent(new Event('pagehide'));
    const text = localStorage.getItem('ganglia.substrate');
    if (!text) return false;
    const saved = JSON.parse(text) as { done: string[]; totals: { processed: number; slices: number } };
    return saved.done.length > 20 && saved.totals.slices > 2;
  }, null, { timeout: 60_000, polling: 1000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ganglia.substrate')!) as { v: number; done: string[]; journal: unknown[]; totals: { processed: number; slices: number; sessions: number } });
  expect(saved.v).toBe(1);
  expect(saved.totals.sessions).toBe(1);
  expect(saved.totals.processed).toBe(saved.done.length);
  expect(saved.done.length).toBeGreaterThan(20);
  // a reload restores it: the second session carries the first's questions and asks new ones
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('loading') && (window as never as { sandbox?: unknown }).sandbox, null, { timeout: 60_000 });
  const before = saved.done.length;
  await page.waitForFunction((n) => {
    window.dispatchEvent(new Event('pagehide'));
    const text = localStorage.getItem('ganglia.substrate');
    if (!text) return false;
    const s = JSON.parse(text) as { done: string[]; totals: { sessions: number } };
    return s.totals.sessions === 2 && s.done.length > n;
  }, before, { timeout: 60_000, polling: 1000 });
  expect(errors).toEqual([]);
});
