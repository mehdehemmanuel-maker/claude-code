// What Ego can do from the first minute, with no level to reach: she notices what you repeat and learns it as a skill
// she can do herself; she sees ahead, warning before Play of a joint that won't hold.

import { test } from '@playwright/test';
import { boot, counts, expect, frames, sb } from './helpers';

test('she notices a repeat, learns it as a skill, and does it herself', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const stack = (x: number) => `place block at ${x} 0.05 -1 as a${x * 10} · place block at ${x} 0.15 -1 as b${x * 10} · join a${x * 10} b${x * 10}`;
  await page.evaluate(([one, two]) => { const s = (window as any).sandbox; s.ego.run(one); s.ego.run(two); }, [stack(0), stack(0.4)]);
  await frames(page, 2);
  const offer = await sb(page, (s) => s.ego.advice.find((a: any) => a.text.startsWith('I noticed'))?.text);
  expect(offer).toMatch(/block, block, (screwed|join)/);
  await sb(page, (s) => s.ego.advice.find((a: any) => a.text.startsWith('I noticed')).fixes[0].apply());
  expect(await sb(page, (s) => s.ego.skills.skills.length)).toBe(1);
  const before = await counts(page);
  expect(await sb(page, (s) => s.ego.ask('do skill 1'))).toMatch(/^Done/);
  await frames(page, 2);
  expect(await counts(page)).toEqual({ parts: before.parts + 2, conns: before.conns + 1 });
  expect(errors).toEqual([]);
});

test('she sees ahead: before Play, a joint that will fail is named, with a fix', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  // a long arm glued by a thin face to a pinned post: it can't carry its own moment
  await sb(page, (s) => {
    const { app } = s;
    app.enterBuild();
    s.ego.run('place block at 0 1 0 as post · freeze post · place lumber size=1x4 length=1.5m at 0.8 1 0 as arm · join post arm with glued');
    const c = Object.values(app.doc.connections)[0] as any;
    app.store.transact('weak glue', (tx: any) => tx.update('connections', c.id, { params: { ...c.params, adhesive: 'hot-melt', bondW: 0.02, bondL: 0.02 } }));
    s.ego.advice = [];
    app.play();
  });
  const warn = await sb(page, (s) => s.ego.advice.find((a: any) => a.text.startsWith('Before it runs'))) as any;
  expect(warn.text).toMatch(/glued joining post and arm will fail/);
  expect(warn.fixes.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
