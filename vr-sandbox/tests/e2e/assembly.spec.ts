// Joined parts are one piece; an assembly saved as a template places again, joints and all; smart snap lines a part
// up square and flush on what it sits on; Ada does what she's asked in plain words.

import { test } from '@playwright/test';
import { boot, counts, enterVR, expect, frames, sb, tap, triggerAt } from './helpers';

test('bolted together is one piece: select, freeze and save as a template, then place a copy', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  // two blocks, one on the other, joined by Best join
  await sb(page, (s) => { s.ada.run('place block at 0 0.05 0 as base · place block at 0 0.15 0 as top · join base top'); });
  await frames(page, 4);
  expect(await counts(page)).toEqual({ parts: 2, conns: 1 });
  // selecting the top block selects the whole assembly
  await tap(page, 'tab-tools');
  await tap(page, 'tool-grab');
  await triggerAt(page, [0, 0.15, 0.05]);
  expect(await sb(page, (s) => s.app.selection.parts.size)).toBe(2);
  // freezing from the tablet freezes both
  await tap(page, 'tab-selected');
  await tap(page, 'freeze');
  expect(await sb(page, (s) => Object.values(s.app.doc.parts).every((p: any) => p.frozen))).toBe(true);
  // save it as a template, then place a copy with the Place tool
  await tap(page, 'tpl-save');
  const tpl = await sb(page, (s) => s.app.templates.list()[0]);
  expect(tpl.name).toBe('Template 1');
  await tap(page, 'tab-builds');
  await tap(page, 'shelf-Templates');
  await tap(page, `tpl-${tpl.id}`);
  expect(await sb(page, (s) => ({ tool: s.tools.tool.id, tpl: s.app.spawnTemplate }))).toEqual({ tool: 'place', tpl: tpl.id });
  await triggerAt(page, [0.6, 0, 0]);
  await frames(page, 6);
  expect(await counts(page)).toEqual({ parts: 4, conns: 2 });
  // the copy sits on the floor where it was placed, the same shape as the original
  const ys = await sb(page, (s) => Object.values(s.app.doc.parts).filter((p: any) => p.pose.p[0] > 0.3).map((p: any) => +p.pose.p[1].toFixed(3)).sort());
  expect(ys).toEqual([0.051, 0.151]);
  expect(errors).toEqual([]);
});

test('smart snap: a block placed off-centre on another lands square, flush and centred on it', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await sb(page, (s) => { s.ada.run('place block at 0.3 0.05 -0.2 rot y 30 as base · freeze base'); });
  await frames(page, 4);
  await tap(page, 'tab-parts');
  await tap(page, 'part-block');
  // aim 1.5 cm off the top face's centre
  const top = await sb(page, (s) => { const p = Object.values(s.app.doc.parts)[0] as any; return [p.pose.p[0] + 0.015, 0.1, p.pose.p[2] + 0.01]; });
  await triggerAt(page, top as [number, number, number]);
  await frames(page, 4);
  const [base, placed] = await sb(page, (s) => Object.values(s.app.doc.parts).map((p: any) => ({ p: p.pose.p, q: p.pose.q })));
  expect(Math.hypot(placed!.p[0] - base!.p[0], placed!.p[2] - base!.p[2])).toBeLessThan(1e-6); // centred
  expect(placed!.p[1]).toBeCloseTo(0.1505, 5); // flush on top, with the 0.5 mm every placement leaves clear
  const dot = Math.abs(base!.q.reduce((s: number, x: number, i: number) => s + x * placed!.q[i]!, 0));
  expect(dot).toBeGreaterThan(0.9999); // square to it: the same turn
  expect(errors).toEqual([]);
});

test('Ada in plain words: place some, weld them, make it stronger, duplicate it', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const r1 = await sb(page, (s) => s.ada.ask('place 2 steel blocks'));
  expect(r1).toMatch(/Placed 2 blocks in Structural steel/);
  // butt them together, then ask for a weld
  await sb(page, (s) => {
    const [a, b] = Object.values(s.app.doc.parts) as any[];
    s.app.store.transact('line up', (tx: any) => { tx.update('parts', a.id, { pose: { p: [0, 0.05, -1], q: [0, 0, 0, 1] } }); tx.update('parts', b.id, { pose: { p: [0.1, 0.05, -1], q: [0, 0, 0, 1] } }); });
    s.app.select([a.id]);
  });
  await frames(page, 4);
  expect(await sb(page, (s) => s.ada.ask('weld these'))).toMatch(/Joined/);
  expect(await sb(page, (s) => (Object.values(s.app.doc.connections)[0] as any).kind)).toBe('weld');
  const before = await sb(page, (s) => JSON.stringify((Object.values(s.app.doc.connections)[0] as any).params));
  expect(await sb(page, (s) => s.ada.ask('make it stronger'))).toMatch(/^Done/);
  expect(await sb(page, (s) => JSON.stringify((Object.values(s.app.doc.connections)[0] as any).params))).not.toBe(before);
  expect(await sb(page, (s) => s.ada.ask('duplicate it 2 times'))).toBe('Made 2 copies.');
  expect(await counts(page)).toEqual({ parts: 6, conns: 3 });
  expect(errors).toEqual([]);
});
