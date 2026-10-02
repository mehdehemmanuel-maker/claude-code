// Places: asked for one, Ego grows its ground and water and takes you there. What you build stands on its sand and
// floats in its sea as it would; asked to go back, the workshop returns.

import { test } from '@playwright/test';
import { boot, expect, frames, sb } from './helpers';

test('asked for a beach, she grows its sand and sea and takes you there: a block stands on the sand, pine floats in the sea', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const said = await sb(page, (s) => s.ego.ask('I just want to chill on a beach'));
  expect(said).toMatch(/taken you to a sandy beach/);
  expect(await sb(page, (s) => s.app.place?.id)).toBe('beach');
  // the sea is water in the physics world, at the level the place says
  const sea = await sb(page, (s) => (s.app as any).worldSim(s.app.doc.sim).fluids.find((f: any) => f.id === 'w_place0sea000'));
  expect(sea.density).toBe(1025);
  // a block on the sand up the beach, and a pine block out at sea
  const shore = await sb(page, (s) => s.app.place.ground.shore);
  const level = sea.max[1] as number;
  await sb(page, (s) => { s.ego.run(`place block at 0.6 ${s.app.groundAt(0.6, 4) + 0.06} 4 mat white-pine as sand1`); });
  await page.evaluate(`window.sandbox.ego.run('place block at 0 ${level + 0.3} ${shore - 20} mat white-pine as float1')`);
  await sb(page, (s) => s.app.play());
  // two seconds of the world, or more (a frame may carry several ticks)
  await frames(page, 30);
  while ((await sb(page, (s) => s.app.live.ticks)) < 180) await frames(page, 10);
  const out = await sb(page, (s) => {
    const ids = Object.keys(s.app.doc.parts);
    return ids.map((id) => { const p = s.app.livePose(id).p; return { name: s.app.doc.parts[id].name, x: p[0], y: p[1], z: p[2], ground: s.app.groundAt(p[0], p[2]) }; });
  });
  const onSand = out.find((o: any) => o.name === 'sand1')!, afloat = out.find((o: any) => o.name === 'float1')!;
  // the block sits on the sand under it, half its 0.1 m height up
  expect(Math.abs(onSand.y - (onSand.ground + 0.05))).toBeLessThan(0.01);
  // the pine floats, its top out of the water, its bottom in it
  expect(afloat.y + 0.05).toBeGreaterThan(level);
  expect(afloat.y - 0.05).toBeLessThan(level);
  // and back to the workshop
  expect(await sb(page, (s) => s.ego.ask('back to the workshop'))).toMatch(/back to the workshop/);
  expect(await sb(page, (s) => s.app.place)).toBeNull();
  expect(errors).toEqual([]);
});
