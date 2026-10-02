// Lessons that check what you do: asked to teach a table, Ego shows where each part goes and moves on only when it is
// done in your world; built and played, and holding, the lesson is done.

import { test } from '@playwright/test';
import { boot, expect, frames, sb } from './helpers';

test('teach me to build a table: each step shown by a guide, done only when done, and finished when it stands', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const said = await sb(page, (s) => s.ego.ask('teach me to build a table'));
  expect(said).toMatch(/Let's build a table together: \d+ parts to place, \d+ joints, then a test/);
  await frames(page, 3);
  expect(await sb(page, (s) => s.app.view.guideShown)).toMatch(/^lesson:/);
  // a part placed well off its guide does nothing
  await sb(page, (s) => { const t = s.ego.lesson.steps[0].target; s.ego.host.place(t.kind, t.params, t.material, [t.pose.p[0] + 3, t.pose.p[1], t.pose.p[2]], [], 'stray'); });
  await frames(page, 3);
  expect(await sb(page, (s) => s.ego.lesson.at)).toBe(0);
  // your hands: each part where its guide is, then each joint, as the steps ask
  await sb(page, (s) => {
    const l = s.ego.lesson;
    for (const st of l.steps) if (st.do === 'place') {
      const t = st.target;
      const id = s.ego.host.place(t.kind, t.params, t.material, t.pose.p, [], undefined);
      // turned as its guide is
      s.app.store.transact('turn it', (tx: any) => tx.update('parts', id, { pose: t.pose }));
    }
  });
  // she sees each part land on its guide, and moves on to the joints
  for (let i = 0; i < 30 && (await sb(page, (s) => s.ego.lesson.steps[s.ego.lesson.at].do)) === 'place'; i++) await frames(page, 2);
  expect(await sb(page, (s) => s.ego.lesson.steps[s.ego.lesson.at].do)).toBe('join');
  // physics catches up with where your hands put them before you join them
  await frames(page, 10);
  await sb(page, (s) => {
    const l = s.ego.lesson;
    for (const st of l.steps) if (st.do === 'join') s.ego.host.join(l.matched[st.a], st.b ? l.matched[st.b] : null, st.kind);
  });
  await frames(page, 3);
  expect(await sb(page, (s) => s.ego.lesson.steps[s.ego.lesson.at].do)).toBe('test');
  // what she says next (among what else she has said: on a slow machine, a render hitch is said too)
  expect(await sb(page, (s) => s.ego.advice.slice(0, 4).map((a: { text: string }) => a.text).join('\n'))).toMatch(/Next \(\d+ of \d+\): Play it/);
  // played: three seconds standing, every joint holding
  await sb(page, (s) => s.app.play());
  for (let i = 0; i < 60 && (await sb(page, (s) => s.ego.lesson !== null)); i++) await frames(page, 10);
  expect(await sb(page, (s) => s.ego.lesson)).toBeNull();
  expect(await sb(page, (s) => s.ego.advice.slice(0, 4).map((a: { text: string }) => a.text).join('\n'))).toMatch(/You built a table, and it holds/);
  expect(await sb(page, (s) => s.app.view.guideShown)).toBe('');
  expect(errors).toEqual([]);
});
