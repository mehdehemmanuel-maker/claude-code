import { test } from '@playwright/test';
import { boot, enterVR, expect, frames, sb, tap } from './helpers';
import { BuildBuilder } from '../../src/templates/builder';
import { encodeDocText } from '../../src/persistence/codec';
import { weightD } from '../../src/parts/registry';

test('overloaded lumber snaps; the fracture is recorded, undone and repaired', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  // a 1.2 m Douglas-fir 2x4, laid flat and clamped to the world at one end, with 250 kg bolted to the other:
  // about 2.4 kN m at the first bond against a weak-axis capacity of 1.7 kN m (S x MOR)
  const b = new BuildBuilder('Snap test', 99);
  const beam = b.part('lumber', { p: [0.6, 1.2, -1], q: [0, 0, 0, 1] }, { material: 'wood.douglas-fir', params: { size: '2x4', length: 1.2, fracture: '6' }, name: 'Beam' });
  b.joint('fixed', beam, null, { p: [0, 1.2, -1], q: [0, 0, 0, 1] });
  // the load stands just past the beam's end, touching it: two solids cannot share space (K-5), so it cannot sit inside the beam
  const d = weightD({ mass: 250 });
  const w = b.part('weight', { p: [1.2 + d / 2 + 0.0005, 1.2, -1], q: [0, 0, 0, 1] }, { params: { mass: 250 }, name: 'Load' });
  b.joint('fixed', beam, w, { p: [1.2, 1.2, -1], q: [0, 0, 0, 1] });
  const text = encodeDocText(b.doc);
  await page.evaluate((t) => (window as any).sandbox.app.openText(t, 'snap test'), text);
  const id = beam.id;
  await page.waitForFunction((pid) => (window as any).sandbox.app.doc.parts[pid].damage.broken.length > 0, id, { timeout: 60_000 });
  const broken = await sb(page, (s) => s.app.doc.parts[Object.keys(s.app.doc.parts).find((k: string) => s.app.doc.parts[k].name === 'Beam')!].damage.broken);
  expect(broken).toEqual([0]); // it breaks at the most loaded bond, next to the clamp
  // the far piece falls away with the load
  await page.waitForFunction((pid) => {
    const p = (window as any).sandbox.app.live.latest(`${pid}#5`);
    return p && p.p[1] < 0.9;
  }, id, { timeout: 30_000 });
  // undo while paused: the pieces are re-seated straight against the clamped one
  await sb(page, (s) => { s.app.settings.paused = true; s.app.undo(); });
  await frames(page, 4);
  const gap = await page.evaluate((pid) => {
    const { app } = (window as any).sandbox;
    const a = app.live.latest(`${pid}#0`), z = app.live.latest(`${pid}#5`);
    return { broken: app.doc.parts[pid].damage.broken.length, span: Math.hypot(z.p[0] - a.p[0], z.p[1] - a.p[1], z.p[2] - a.p[2]) };
  }, id);
  expect(gap.broken).toBe(0);
  expect(Math.abs(gap.span - 1.0)).toBeLessThan(0.01);
  // redo, then repair from the tablet
  await sb(page, (s) => { s.app.redo(); s.app.select([Object.keys(s.app.doc.parts).find((k: string) => s.app.doc.parts[k].name === 'Beam')]); });
  await frames(page, 2);
  await tap(page, 'tab-selected');
  await tap(page, 'repair');
  const after = await sb(page, (s) => s.app.doc.parts[Object.keys(s.app.doc.parts).find((k: string) => s.app.doc.parts[k].name === 'Beam')!].damage);
  expect(after).toEqual({ broken: [], segments: null });
  expect(errors).toEqual([]);
});
