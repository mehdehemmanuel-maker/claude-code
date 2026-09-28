import { expect, type Page } from '@playwright/test';

export async function boot(page: Page, query = '', firstVisit = false) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (!firstVisit) await page.addInitScript(() => localStorage.setItem('vrsb.seenTemplates', '1'));
  await page.goto(`/${query}`);
  await page.waitForFunction(() => !document.getElementById('loading') && (window as never as { sandbox?: unknown }).sandbox, null, { timeout: 60_000 });
  return errors;
}

/** Evaluate against the running app (window.sandbox). */
export function sb<T>(page: Page, fn: (s: any) => T | Promise<T>): Promise<T> {
  // Functions are serialised into the page, so apply them to window.sandbox there.
  return page.evaluate(`(${fn.toString()})(window.sandbox)`) as Promise<T>;
}

/** Client pixel coordinates of a world point in the desktop camera. */
export async function screenOf(page: Page, p: [number, number, number]) {
  return page.evaluate((pt) => {
    const { app } = (window as any).sandbox;
    const cam = app.view.camera;
    cam.updateMatrixWorld(true);
    const v = new cam.position.constructor(pt[0], pt[1], pt[2]).project(cam);
    const r = app.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }, p);
}

export async function frames(page: Page, n: number) {
  await page.evaluate((k) => new Promise<void>((res) => { let i = 0; const t = () => (++i >= k ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); }), n);
}

export async function counts(page: Page) {
  return sb(page, (s) => ({ parts: Object.keys(s.app.doc.parts).length, conns: Object.keys(s.app.doc.connections).length }));
}

export async function lookAt(page: Page, pos: [number, number, number], yaw: number, pitch: number) {
  await page.evaluate(([p, y, pi]) => {
    const { desktop } = (window as any).sandbox;
    desktop.pos.set(p[0], p[1], p[2]);
    desktop.yaw = y;
    desktop.pitch = pi;
  }, [pos, yaw, pitch] as const);
  await frames(page, 3);
}

export { expect };
