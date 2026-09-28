import { test } from '@playwright/test';
import { boot, counts, expect, frames, lookAt, sb, screenOf } from './helpers';

test('first visit shows the template station and opens a build', async ({ page }) => {
  const errors = await boot(page, '', true);
  await expect(page.locator('.modal .card')).toHaveCount(8);
  await page.locator('.card', { hasText: 'Go-kart' }).getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  expect((await counts(page)).parts).toBe(8);
  expect(errors).toEqual([]);
});

test('place, stack, join, undo and redo with the mouse', async ({ page }) => {
  const errors = await boot(page);
  await lookAt(page, [0, 1.2, 1.6], 0, -0.55);
  // Place tool: click the floor twice (second block lands on top of the first)
  await page.keyboard.press('Digit2');
  const floor = await screenOf(page, [0, 0, 0]);
  await page.mouse.click(floor.x, floor.y);
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(1);
  const top = await screenOf(page, [0, 0.1, 0]);
  await page.mouse.click(top.x, top.y - 2);
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(2);
  const heights = await sb(page, (s) => Object.values(s.app.doc.parts).map((p: any) => p.pose.p[1]).sort());
  expect(heights[1]).toBeGreaterThan(0.12); // second block sits on the first
  // Join tool (bolted by default): click the front faces of the lower then the upper block
  await page.keyboard.press('Digit3');
  const aFront = await screenOf(page, [0, 0.05, 0.05]);
  const bFront = await screenOf(page, [0, 0.15, 0.05]);
  await page.mouse.click(aFront.x, aFront.y);
  await page.mouse.click(bFront.x, bFront.y);
  await frames(page, 4);
  expect((await counts(page)).conns).toBe(1);
  await expect(page.locator('#inspector')).toContainText('Bolted');
  await expect(page.locator('#inspector')).toContainText('Preload per bolt');
  // undo / redo the joint
  await page.keyboard.press('Control+z');
  await frames(page, 2);
  expect((await counts(page)).conns).toBe(0);
  await page.keyboard.press('Control+y');
  await frames(page, 2);
  expect((await counts(page)).conns).toBe(1);
  // select the top block with the Grab tool and delete it: its joint goes too
  await page.keyboard.press('Digit1');
  await page.mouse.click(bFront.x, bFront.y);
  await page.mouse.up();
  await page.keyboard.press('Delete');
  await frames(page, 2);
  expect(await counts(page)).toEqual({ parts: 1, conns: 0 });
  expect(errors).toEqual([]);
});

test('parameters edited in the inspector change the part and its mass', async ({ page }) => {
  await boot(page);
  await lookAt(page, [0, 1.2, 1.6], 0, -0.55);
  await page.keyboard.press('Digit2');
  const floor = await screenOf(page, [0, 0, 0]);
  await page.mouse.click(floor.x, floor.y);
  await frames(page, 3);
  const field = page.locator('#inspector .prm', { hasText: 'Length (X)' }).locator('input.num');
  await field.fill('200');
  await field.press('Enter');
  await frames(page, 3);
  const x = await sb(page, (s) => (Object.values(s.app.doc.parts)[0] as any).params.x);
  expect(x).toBeCloseTo(0.2, 6);
  // 0.2 x 0.1 x 0.1 m of Douglas-fir at 530 kg/m^3 = 1.060 kg
  await expect(page.locator('#inspector')).toContainText('1.060 kg');
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
