// VR mode on Meta's WebXR emulator (IWER, virtual Quest 3), driven like a real headset.

import { test } from '@playwright/test';
import { boot, expect, sb } from './helpers';

test('Quest emulation: tablet taps, grip grab, tool cycling', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await page.waitForFunction(() => (window as any).sandbox.xr, null, { timeout: 30_000 });
  await sb(page, (s) => s.app.loadTemplate('catapult'));
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
      return mesh.localToWorld(new V(((b.x + b.w / 2) / 1024 - 0.5) * 0.3, (1 - (b.y + b.h / 2) / 720 - 0.5) * ((0.3 * 720) / 1024), 0));
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
