import { expect, type Page } from '@playwright/test';
import { getTemplate } from '../../src/templates/templates';
import { toShareCode } from '../../src/persistence/codec';

/**
 * Open one of the physics test scenes. The app ships none of them (every build in it is one you made); a test opens
 * a scene the way a shared build opens, from its share code.
 */
export async function openScene(page: Page, id: string) {
  const code = toShareCode(getTemplate(id).build());
  await page.evaluate((c) => (window as any).sandbox.app.openShareCode(c), code);
}

export async function boot(page: Page, query = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`/${query}`);
  await page.waitForFunction(() => !document.getElementById('loading') && (window as never as { sandbox?: unknown }).sandbox, null, { timeout: 60_000 });
  return errors;
}

/** Evaluate against the running app (window.sandbox). */
export function sb<T>(page: Page, fn: (s: any) => T | Promise<T>): Promise<T> {
  // Functions are serialised into the page, so apply them to window.sandbox there.
  return page.evaluate(`(${fn.toString()})(window.sandbox)`) as Promise<T>;
}

export async function frames(page: Page, n: number) {
  await page.evaluate((k) => new Promise<void>((res) => { let i = 0; const t = () => (++i >= k ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); }), n);
}

export async function counts(page: Page) {
  return sb(page, (s) => ({ parts: Object.keys(s.app.doc.parts).length, conns: Object.keys(s.app.doc.connections).length }));
}

/**
 * Enter VR on Meta's emulated Quest 3 (boot with ?iwer) and install helpers in the page for driving it like a
 * headset: aim a controller at a point, press its buttons, point at a tablet widget.
 */
export async function enterVR(page: Page, style: 'relax' | 'walk' | 'mixed' = 'relax') {
  await page.waitForFunction(() => (window as any).sandbox?.xr, null, { timeout: 30_000 });
  await page.selectOption('#vrmode', style);
  await page.click('#vr');
  await page.waitForFunction(() => (window as any).sandbox.app.renderer.xr.isPresenting, null, { timeout: 20_000 });
  await page.evaluate(async () => {
    const w = window as any;
    w.frames = (n: number) => new Promise<void>((res) => { let k = 0; const t = () => (++k >= n ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); });
    const V = w.sandbox.app.view.camera.position.constructor;
    const Q = w.sandbox.app.view.camera.quaternion.constructor;
    w.vec = (p: number[]) => new V(p[0], p[1], p[2]);
    // a controller at `pos` (in the player's space) pointing at a world point
    w.aim = (side: string, pos: number[], target: any) => {
      const { app } = w.sandbox;
      app.view.rig.updateMatrixWorld(true);
      const t = target.clone().applyMatrix4(app.view.rig.matrixWorld.clone().invert());
      const q = new Q().setFromUnitVectors(new V(0, 0, -1), t.sub(new V(pos[0], pos[1], pos[2])).normalize());
      w.iwer.controllers[side].position.set(pos[0], pos[1], pos[2]);
      w.iwer.controllers[side].quaternion.set(q.x, q.y, q.z, q.w);
    };
    w.tabletPoint = (id: string) => {
      const { xr } = w.sandbox;
      xr.tablet.draw();
      const b = xr.tablet.widgets.find((x: any) => x.id === id);
      if (!b) throw new Error(`no tablet widget ${id} on page ${xr.tablet.page}`);
      const mesh = xr.tablet.mesh;
      mesh.updateMatrixWorld(true);
      return mesh.localToWorld(new V(((b.x + b.w / 2) / 1024 - 0.5) * 0.3, (1 - (b.y + b.h / 2) / 720 - 0.5) * ((0.3 * 720) / 1024), 0));
    };
    w.press = async (side: string, button: string) => {
      w.iwer.controllers[side].updateButtonValue(button, 1);
      await w.frames(4);
      w.iwer.controllers[side].updateButtonValue(button, 0);
      await w.frames(4);
    };
    await w.frames(10);
  });
}

/** Pull the right trigger on a tablet widget (the tablet held up on the left controller). */
export async function tap(page: Page, widget: string) {
  await page.evaluate(async (id) => {
    const w = window as any;
    w.sandbox.xr.tablet.setVisible(true);
    w.iwer.controllers.left.position.set(-0.15, 1.1, -0.35);
    w.iwer.controllers.left.quaternion.set(0, 0, 0, 1);
    await w.frames(6);
    w.aim('right', [0.15, 1.15, -0.1], w.tabletPoint(id));
    await w.frames(4);
    await w.press('right', 'trigger');
  }, widget);
}

/** Pull the right trigger aimed at a world point, with the tablet lowered out of the way. */
export async function triggerAt(page: Page, point: [number, number, number]) {
  await page.evaluate(async (p) => {
    const w = window as any;
    w.iwer.controllers.left.position.set(-0.45, 0.5, 0.25);
    await w.frames(6);
    w.aim('right', [0.15, 1.15, -0.1], w.vec(p));
    await w.frames(4);
    await w.press('right', 'trigger');
  }, point);
}

export { expect };
