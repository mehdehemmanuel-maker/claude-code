// VR mode on Meta's WebXR emulator (IWER, virtual Quest 3), driven like a real headset.

import { test } from '@playwright/test';
import { boot, expect, openScene } from './helpers';

test('Quest emulation: tablet taps, grip grab, tool cycling', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await page.waitForFunction(() => (window as any).sandbox.xr, null, { timeout: 30_000 });
  await openScene(page, 'catapult');
  await page.click('#vr');
  await page.waitForFunction(() => (window as any).sandbox.app.renderer.xr.isPresenting, null, { timeout: 20_000 });
  await page.evaluate(() => {
    const w = window as any;
    w.frames = (n: number) => new Promise<void>((res) => { let k = 0; const t = () => (++k >= n ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); });
    w.aim = (side: string, pos: number[], target: any) => {
      const { app } = w.sandbox;
      const V = app.view.camera.position.constructor;
      const Q = app.view.camera.quaternion.constructor;
      app.view.rig.updateMatrixWorld(true);
      const t = target.clone().applyMatrix4(app.view.rig.matrixWorld.clone().invert());
      const q = new Q().setFromUnitVectors(new V(0, 0, -1), t.sub(new V(pos[0], pos[1], pos[2])).normalize());
      w.iwer.controllers[side].position.set(pos[0], pos[1], pos[2]);
      w.iwer.controllers[side].quaternion.set(q.x, q.y, q.z, q.w);
    };
    w.tabletPoint = (id: string) => {
      const { xr, app } = w.sandbox;
      xr.tablet.draw();
      const b = xr.tablet.widgets.find((x: any) => x.id === id);
      const mesh = xr.tablet.mesh;
      mesh.updateMatrixWorld(true);
      const V = app.view.camera.position.constructor;
      const cw = xr.tablet.canvas.width, ch = xr.tablet.canvas.height;
      return mesh.localToWorld(new V(((b.x + b.w / 2) / cw - 0.5) * 0.3, (1 - (b.y + b.h / 2) / ch - 0.5) * ((0.3 * ch) / cw), 0));
    };
    w.press = async (side: string, button: string) => {
      w.iwer.controllers[side].updateButtonValue(button, 1);
      await w.frames(4);
      w.iwer.controllers[side].updateButtonValue(button, 0);
      await w.frames(4);
    };
  });
  const hands = await page.evaluate(async () => { const w = window as any; await w.frames(10); return Object.keys(w.sandbox.xr.hands).sort(); });
  expect(hands).toEqual(['left', 'right']);

  const page1 = await page.evaluate(async () => {
    const w = window as any;
    w.iwer.controllers.left.position.set(-0.15, 1.1, -0.35);
    await w.frames(6);
    w.aim('right', [0.15, 1.15, -0.1], w.tabletPoint('tab-world'));
    await w.frames(4);
    await w.press('right', 'trigger');
    return w.sandbox.xr.tablet.page;
  });
  expect(page1).toBe('world');

  const paused = await page.evaluate(async () => {
    const w = window as any;
    w.aim('right', [0.15, 1.15, -0.1], w.tabletPoint('pause'));
    await w.frames(4);
    await w.press('right', 'trigger');
    const p = w.sandbox.app.settings.paused;
    if (p) w.sandbox.app.togglePause();
    return p;
  });
  expect(paused).toBe(true);

  const grab = await page.evaluate(async () => {
    const w = window as any;
    const { app, tools } = w.sandbox;
    const part = Object.values(app.doc.parts).find((p: any) => p.name === 'Ground stake') as any;
    app.store.transact('unfreeze stake', (tx: any) => tx.update('parts', part.id, { frozen: false }));
    await w.frames(6);
    const before = app.livePose(part.id).p[1];
    const V = app.view.camera.position.constructor;
    w.aim('right', [0.3, 1.0, 0.2], new V(...app.livePose(part.id).p));
    await w.frames(4);
    w.iwer.controllers.right.updateButtonValue('squeeze', 1);
    await w.frames(4);
    const held = tools.grab.holdingWith('right') === part.id;
    w.iwer.controllers.right.position.set(0.3, 1.5, 0.2);
    await w.frames(40);
    const after = app.livePose(part.id).p[1];
    w.iwer.controllers.right.updateButtonValue('squeeze', 0);
    await w.frames(4);
    return { held, lifted: after - before, released: tools.grab.holdingWith('right') === null };
  });
  expect(grab.held).toBe(true);
  expect(grab.lifted).toBeGreaterThan(0.2);
  expect(grab.released).toBe(true);

  const cycle = await page.evaluate(async () => {
    const w = window as any;
    const before = w.sandbox.tools.active;
    await w.press('right', 'a-button');
    return [before, w.sandbox.tools.active];
  });
  expect(cycle).toEqual([0, 1]);
  expect(errors).toEqual([]);
});

test('relax mode: the stick flies where you look, also after turning, and snap turns pivot on your head', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page, '?iwer=noroom');
  await page.waitForFunction(() => (window as any).sandbox.xr, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const w = window as any;
    w.sandbox.app.renderer.xr.setFramebufferScaleFactor(0.25);
    w.frames = (n: number) => new Promise<void>((res) => { let k = 0; const t = () => (++k >= n ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); });
    // head pose in the world, straight from the eye cameras three.js renders with (rig transform included)
    w.head = () => {
      const cams = w.sandbox.app.renderer.xr.getCamera().cameras;
      const V = w.sandbox.app.view.camera.position.constructor;
      const p = new V(), e = new V();
      for (const c of cams) p.add(e.setFromMatrixPosition(c.matrixWorld).multiplyScalar(1 / cams.length));
      const f = new V(0, 0, -1).transformDirection(cams[0].matrixWorld);
      return { p: p.toArray(), f: f.toArray() };
    };
    w.iwer.position.set(0.3, 1.6, 0.2);
    w.iwer.quaternion.set(0, 0, 0, 1);
  });
  await page.selectOption('#vrmode', 'relax');
  await page.click('#vr');
  await page.waitForFunction(() => (window as any).sandbox.app.renderer.xr.isPresenting, null, { timeout: 20_000 });
  const result = await page.evaluate(async () => {
    const w = window as any;
    await w.frames(10);
    const start = w.head();
    // six snap turns to the right: 180 degrees, each one pivoting about the head
    let drift = 0;
    for (let i = 0; i < 6; i++) {
      const before = w.head().p;
      w.iwer.controllers.right.updateAxes('thumbstick', 1, 0);
      await w.frames(4);
      w.iwer.controllers.right.updateAxes('thumbstick', 0, 0);
      await w.frames(4);
      const after = w.head().p;
      drift = Math.max(drift, Math.hypot(after[0] - before[0], after[2] - before[2]));
    }
    const turned = w.head();
    // fly forward: the head must move the way it now looks
    w.iwer.controllers.left.updateAxes('thumbstick', 0, -1);
    await w.frames(30);
    w.iwer.controllers.left.updateAxes('thumbstick', 0, 0);
    await w.frames(2);
    const moved = w.head().p;
    const d = [moved[0] - turned.p[0], moved[2] - turned.p[2]];
    const len = Math.hypot(d[0], d[1]);
    const along = (d[0] * turned.f[0] + d[1] * turned.f[2]) / (len * Math.hypot(turned.f[0], turned.f[2]));
    return { lookBefore: start.f[2], lookAfter: turned.f[2], drift, len, along };
  });
  expect(result.lookBefore).toBeLessThan(-0.99); // looking along -Z to start
  expect(result.lookAfter).toBeGreaterThan(0.99); // and along +Z after turning 180 degrees
  expect(result.drift).toBeLessThan(0.01); // a snap turn keeps the head where it is
  expect(result.len).toBeGreaterThan(0.3);
  expect(result.along).toBeGreaterThan(0.98); // forward is where you look
  expect(errors).toEqual([]);
});

test('relax mode: in a build with motors the left stick drives it and leaves you in place; switched to Fly, it flies you', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page, '?iwer=noroom');
  await page.waitForFunction(() => (window as any).sandbox.xr, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const w = window as any;
    w.sandbox.app.renderer.xr.setFramebufferScaleFactor(0.25);
    w.frames = (n: number) => new Promise<void>((res) => { let k = 0; const t = () => (++k >= n ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); });
  });
  await openScene(page, 'go-kart');
  await page.selectOption('#vrmode', 'relax');
  await page.click('#vr');
  await page.waitForFunction(() => (window as any).sandbox.app.renderer.xr.isPresenting, null, { timeout: 20_000 });
  const r = await page.evaluate(async () => {
    const w = window as any;
    const { app, xr } = w.sandbox;
    xr.tablet.setVisible(false);
    await w.frames(10);
    const drive0 = xr.drive;
    const rig0 = app.view.rig.position.clone();
    w.iwer.controllers.left.updateAxes('thumbstick', 0, -1);
    await w.frames(20);
    const throttle = app.channels.throttle;
    const rigMovedDriving = app.view.rig.position.distanceTo(rig0);
    w.iwer.controllers.left.updateAxes('thumbstick', 0, 0);
    await w.frames(2);
    xr.setDrive(false);
    const rig1 = app.view.rig.position.clone();
    w.iwer.controllers.left.updateAxes('thumbstick', 0, -1);
    await w.frames(20);
    const throttleFlying = app.channels.throttle;
    const rigMovedFlying = app.view.rig.position.distanceTo(rig1);
    w.iwer.controllers.left.updateAxes('thumbstick', 0, 0);
    return { drive0, throttle, rigMovedDriving, throttleFlying, rigMovedFlying };
  });
  expect(r.drive0).toBe(true); // the go-kart has motors on the stick channels
  expect(r.throttle).toBeCloseTo(1, 5);
  expect(r.rigMovedDriving).toBeLessThan(1e-6);
  expect(r.throttleFlying).toBe(0);
  expect(r.rigMovedFlying).toBeGreaterThan(0.2);
  expect(errors).toEqual([]);
});
