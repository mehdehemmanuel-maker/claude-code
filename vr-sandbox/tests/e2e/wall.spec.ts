// The interpretation wall in the headset: draw with the trigger, say what it is, and build it.

import { test } from '@playwright/test';
import { boot, counts, enterVR, expect, frames, sb, tap } from './helpers';

test('draw a line on the wall with the controller, say "steel pipe", and build it: a steel tube as long as the line', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tool-draw');
  expect(await sb(page, (s) => s.tools.tool.id)).toBe('draw');
  // the wall goes up in front of you; draw a stroke 1 m long across it with the right controller
  await sb(page, (s) => s.tools.draw.placeWall());
  await page.evaluate(async () => {
    const w = window as any;
    const draw = w.sandbox.tools.draw;
    w.iwer.controllers.left.position.set(-0.45, 0.5, 0.25); // the tablet out of the way
    await w.frames(6);
    const at = (u: number) => w.vec(draw.wallPoint([u, 0.7]));
    w.aim('right', [0.15, 1.15, -0.1], at(0.6));
    await w.frames(3);
    w.iwer.controllers.right.updateButtonValue('trigger', 1);
    await w.frames(3);
    for (let i = 1; i <= 20; i++) { w.aim('right', [0.15, 1.15, -0.1], at(0.6 + i * 0.05)); await w.frames(2); }
    w.iwer.controllers.right.updateButtonValue('trigger', 0);
    await w.frames(4);
  });
  const read = await sb(page, (s) => s.tools.draw.marks.map((m: any) => ({ kind: m.part.kind, length: m.part.params.length })));
  expect(read.length).toBe(1);
  expect(read[0]!.length).toBeGreaterThan(0.9);
  expect(read[0]!.length).toBeLessThan(1.1);
  // nothing real yet: a ghost on the wall
  expect((await counts(page)).parts).toBe(0);
  // say what it is, then build it
  expect(await sb(page, (s) => s.ego.ask("it's a steel pipe"))).toMatch(/^Now: tube round in steel/);
  expect(await sb(page, (s) => s.ego.ask('build it'))).toMatch(/^Built 1 part from your drawing/);
  await frames(page, 4);
  const part = await sb(page, (s) => { const p = Object.values(s.app.doc.parts)[0] as any; return { kind: p.kind, material: p.material, length: p.params.length }; });
  expect(part.kind).toBe('tube.round');
  expect(part.material.startsWith('steel')).toBe(true);
  expect(part.length).toBeGreaterThan(0.9);
  expect(await sb(page, (s) => s.tools.draw.marks.length)).toBe(0);
  // one undo takes the built drawing back
  await sb(page, (s) => s.app.undo());
  expect((await counts(page)).parts).toBe(0);
  expect(errors).toEqual([]);
});

test('Ego keeps your life: remembers, reminds you when it is due, and keeps your money straight', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  expect(await sb(page, (s) => s.ego.ask("Ego, remember that my sister's birthday is March 3"))).toBe("I'll remember: my sister's birthday is March 3.");
  expect(await sb(page, (s) => s.ego.ask("when is my sister's birthday?"))).toBe("You told me my sister's birthday is March 3.");
  expect(await sb(page, (s) => s.ego.ask('I spent $40 on gas'))).toMatch(/^Noted: \$40 on transport\. This week: \$40 out, \$0 in\./);
  await sb(page, (s) => s.ego.ask('set a budget of $30 a week for food'));
  expect(await sb(page, (s) => s.ego.ask('paid $45 for groceries'))).toMatch(/over your food budget \(\$45 of \$30\)/);
  expect(await sb(page, (s) => s.ego.ask('how much did I spend this week'))).toBe('This week: $85 out (food $45, transport $40), $0 in.');
  expect(await sb(page, (s) => s.ego.ask('remind me to stretch in 2 seconds'))).toMatch(/^I'll remind you to stretch at /);
  await page.waitForFunction(() => (window as any).sandbox.ego.advice.some((a: any) => a.text === '⏰ Reminder: stretch.'), null, { timeout: 20_000 });
  // and it's all on her Life page
  await tap(page, 'tab-ego');
  await tap(page, 'life');
  await tap(page, 'life-back');
  // kept across a reload, on this headset
  await page.reload();
  await page.waitForFunction(() => (window as any).sandbox?.ego, null, { timeout: 30_000 });
  expect(await sb(page, (s) => s.ego.life.recall("my sister's birthday")?.value)).toBe('March 3');
  expect(errors).toEqual([]);
});
