// Creatures with bodies: asked for a fish in the sea, Ego takes you to one and puts a swimmer of real parts in it; it
// swims out by its own rhythm, pushed by the water.

import { test } from '@playwright/test';
import { boot, expect, frames, sb } from './helpers';

test('put a fish in the sea: a swimmer of plates and rhythmic servos, swimming out from the shore by the water\'s push', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const said = await sb(page, (s) => s.ego.ask('put a fish in the sea'));
  expect(said).toMatch(/taken you to a sandy beach/);
  expect(said).toMatch(/swimming by its own rhythm/);
  const body = await sb(page, (s) => ({ plates: Object.values(s.app.doc.parts).filter((p: any) => p.kind === 'plate').length, servos: Object.values(s.app.doc.connections).filter((c: any) => c.kind === 'servo').length, playing: !s.app.settings.build }));
  expect(body).toEqual({ plates: 5, servos: 4, playing: true });
  const headOf = (s: any) => { const id = Object.values(s.app.doc.parts).find((p: any) => /head/.test(p.name)) as any; return s.app.livePose(id.id).p; };
  await frames(page, 20);
  const t0 = await sb(page, (s) => s.app.live.ticks), z0 = (await sb(page, headOf))[2];
  // ten seconds of the world
  while ((await sb(page, (s) => s.app.live.ticks)) - t0 < 900) await frames(page, 20);
  const z1 = (await sb(page, headOf))[2];
  // out to sea is -z from the shore: it has swum at least 20 cm
  expect(z0 - z1).toBeGreaterThan(0.2);
  expect(errors).toEqual([]);
});
