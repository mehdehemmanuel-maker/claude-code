// Room modes on the IWER emulator with its synthetic room (src/xr/testRoom.ts): mixed reality puts parts on the
// real (scanned) furniture; walk mode calibrates the real room into the workshop and walks instead of flying.

import { test, type Page } from '@playwright/test';
import { boot, expect, sb } from './helpers';
import { BuildBuilder } from '../../src/templates/builder';
import { encodeDocText } from '../../src/persistence/codec';

const I: [number, number, number, number] = [0, 0, 0, 1];

async function helpers(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    // software WebGL: small eye buffers keep the emulated headset's frame rate usable
    w.sandbox.app.renderer.xr.setFramebufferScaleFactor(0.25);
    w.frames = (n: number) => new Promise<void>((res) => { let k = 0; const t = () => (++k >= n ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); });
  });
}

function blocks(points: [number, number, number][]) {
  const b = new BuildBuilder('Room test', 7);
  points.forEach((p, i) => b.part('block', { p, q: I }, { name: `B${i}` }));
  return encodeDocText(b.doc);
}

/** Wait until every block has come to rest (checked over a few frames), then read the heights. */
async function settle(page: Page) {
  await page.evaluate(() => { const w = window as any; w.t0 = w.sandbox.app.simTime; w.lastHeights = undefined; });
  await page.waitForFunction(() => {
    const { app } = (window as any).sandbox;
    const now = Object.values(app.doc.parts).map((p: any) => app.livePose(p.id).p[1]);
    const w = window as any;
    const prev: number[] | undefined = w.lastHeights;
    w.lastHeights = now;
    return prev && prev.length === now.length && now.every((y: number, i: number) => Math.abs(y - prev[i]!) < 1e-4) && app.simTime - w.t0 > 0.8;
  }, null, { timeout: 60_000, polling: 250 });
  return heights(page);
}

/** Resting heights of the blocks, in the order they were given (B0, B1, ...). */
async function heights(page: Page) {
  const byName = await sb(page, (s) => Object.fromEntries(Object.values(s.app.doc.parts).map((p: any) => [p.name, s.app.livePose(p.id).p[1]])));
  return Object.keys(byName).sort().map((k) => byName[k] as number);
}

test('mixed reality: parts land on the scanned table, couch and floor; the workshop is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await page.waitForFunction(() => (window as any).sandbox.xr, null, { timeout: 30_000 });
  await helpers(page);
  expect(await page.locator('#vrmode-mixed').isDisabled()).toBe(false);
  await page.selectOption('#vrmode', 'mixed');
  await page.click('#vr');
  await page.waitForFunction(() => (window as any).sandbox.app.renderer.xr.isPresenting, null, { timeout: 20_000 });
  // floor, ceiling, four walls, the table (planes) and the couch (mesh)
  await page.waitForFunction(() => (window as any).sandbox.app.room.length === 8, null, { timeout: 10_000 });
  const state = await sb(page, (s) => ({
    world: s.app.world, workshop: s.app.view.isWorkshopVisible, style: s.xr.active,
    session: s.app.renderer.xr.getSession().environmentBlendMode, rig: s.app.view.rig.position.toArray(),
  }));
  expect(state).toEqual({ world: 'mixed', workshop: false, style: 'mixed', session: 'alpha-blend', rig: [0, 0, 0] });
  // drop blocks over the table (top 0.74 m), the couch (0.45 m) and bare floor, in room coordinates
  const text = blocks([[0.9, 1.2, -1.2], [-1.3, 1.0, 1.2], [0.2, 0.8, 0.6]]);
  await page.evaluate((t) => (window as any).sandbox.app.openText(t, 'room test'), text);
  const [table, couch, floor] = await settle(page);
  expect(table).toBeCloseTo(0.79, 1);
  expect(couch).toBeCloseTo(0.5, 1);
  expect(floor).toBeCloseTo(0.05, 1);
  // leaving the session brings the workshop back
  await page.evaluate(() => (window as any).sandbox.app.renderer.xr.getSession().end());
  await page.waitForFunction(() => !(window as any).sandbox.app.renderer.xr.isPresenting, null, { timeout: 10_000 });
  const after = await sb(page, (s) => ({ world: s.app.world, workshop: s.app.view.isWorkshopVisible, room: s.app.room.length }));
  expect(after).toEqual({ world: 'workshop', workshop: true, room: 0 });
  expect(errors).toEqual([]);
});

test('walk mode: calibrates the room into the workshop, walks instead of flying, real furniture is solid', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await page.waitForFunction(() => (window as any).sandbox.xr, null, { timeout: 30_000 });
  await helpers(page);
  // stand 1 m right of and 0.5 m behind the room's centre, facing -X
  await page.evaluate(() => {
    const d = (window as any).iwer;
    d.position.set(1, 1.6, 0.5);
    d.quaternion.set(0, Math.SQRT1_2, 0, Math.SQRT1_2);
  });
  await page.selectOption('#vrmode', 'walk');
  await page.click('#vr');
  await page.waitForFunction(() => (window as any).sandbox.xr.calibrated, null, { timeout: 20_000 });
  await page.evaluate(() => (window as any).frames(4));
  // you now stand at the workshop's home spot, facing the workbench
  const head = await sb(page, (s) => {
    // the head is between the eyes (the combined XR camera sits slightly behind them to cover both frusta)
    const cam = s.app.renderer.xr.getCamera();
    const V = s.app.view.camera.position.constructor;
    const p = new V(), e = new V(), f = new V();
    for (const c of cam.cameras) p.add(e.setFromMatrixPosition(c.matrixWorld).multiplyScalar(1 / cam.cameras.length));
    cam.getWorldDirection(f);
    return { p: p.toArray(), f: f.toArray(), world: s.app.world, workshop: s.app.view.isWorkshopVisible };
  });
  expect(head.p[0]).toBeCloseTo(-3, 2);
  expect(head.p[1]).toBeCloseTo(1.6, 2);
  expect(head.p[2]).toBeCloseTo(-1.6, 2);
  expect(head.f[2]).toBeLessThan(-0.99);
  expect(head.world).toBe('workshop');
  expect(head.workshop).toBe(true);
  // the stick does not move you (you walk); in relax mode it flies
  const moved = await page.evaluate(async () => {
    const w = window as any;
    const rig = w.sandbox.app.view.rig;
    const start = rig.position.clone();
    w.iwer.controllers.left.updateAxes('thumbstick', 0, -1);
    w.iwer.controllers.right.updateAxes('thumbstick', 1, 0);
    await w.frames(30);
    const walk = rig.position.distanceTo(start) + Math.abs(rig.rotation.y - -Math.PI / 2);
    w.sandbox.xr.setStyle('relax');
    w.iwer.controllers.right.updateAxes('thumbstick', 0, 0);
    await w.frames(30);
    const relax = rig.position.distanceTo(start);
    w.iwer.controllers.left.updateAxes('thumbstick', 0, 0);
    w.sandbox.xr.setStyle('walk');
    w.sandbox.xr.recalibrate();
    await w.frames(10);
    return { walk, relax, back: rig.position.distanceTo(start) };
  });
  expect(moved.walk).toBeLessThan(1e-6);
  expect(moved.relax).toBeGreaterThan(0.3);
  expect(moved.back).toBeLessThan(1e-3);
  // the real table, now in workshop coordinates: a block dropped over it lands on it
  await page.waitForFunction(() => (window as any).sandbox.app.room.length === 8, null, { timeout: 10_000 });
  const tableAt = await sb(page, (s) => {
    const t = s.app.room.find((r: any) => r.label === 'table');
    return t.pose.p as [number, number, number];
  });
  expect(tableAt[0]).toBeCloseTo(-1.3, 2);
  expect(tableAt[1]).toBeCloseTo(0.74, 2);
  expect(tableAt[2]).toBeCloseTo(-1.7, 2);
  const text = blocks([[tableAt[0], 1.2, tableAt[2]]]);
  await page.evaluate((t) => (window as any).sandbox.app.openText(t, 'walk test'), text);
  const [onTable] = await settle(page);
  expect(onTable).toBeCloseTo(0.79, 1);
  // with the room made non-solid, the same block falls through the (virtual) table to the workshop floor
  await sb(page, (s) => { s.app.roomSolid = false; s.app.applyRoom(); });
  await page.waitForFunction(() => { const { app } = (window as any).sandbox; return app.livePose(Object.keys(app.doc.parts)[0]).p[1] < 0.1; }, null, { timeout: 30_000 });
  const [dropped] = await heights(page);
  expect(dropped).toBeLessThan(0.1);
  expect(errors).toEqual([]);
});
