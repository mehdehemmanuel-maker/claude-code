// Entry point: boot physics, the scene, desktop controls, UI, and (if available) WebXR.

import { App } from './app/app';
import { DesktopControls } from './interaction/desktop';
import { ToolManager } from './tools/tools';
import { UI } from './ui/ui';

async function main() {
  const params = new URLSearchParams(location.search);
  const host = document.getElementById('viewport')!;
  const app = await App.create(host, params.get('physics') === 'inline' ? 'inline' : 'worker');
  const tools = new ToolManager(app);
  const desktop = new DesktopControls(app, tools, app.renderer.domElement);
  const ui = new UI(app, tools);
  app.onFrame.push((dt) => {
    if (!app.renderer.xr.isPresenting) desktop.update(dt);
    tools.frame(dt);
  });
  const resize = () => app.resize(host.clientWidth, host.clientHeight);
  window.addEventListener('resize', resize);
  resize();

  // WebXR (Quest). Loaded lazily so desktop users never pay for it.
  if ('xr' in navigator) {
    try {
      const ok = await navigator.xr!.isSessionSupported('immersive-vr');
      ui.vrSupported = ok;
      if (ok) {
        const { XRMode } = await import('./xr/xr');
        const xr = new XRMode(app, tools, desktop);
        ui.onEnterVR = () => void xr.enter();
      }
    } catch {
      ui.vrSupported = false;
    }
  }

  // #build=VRSB1... links open a shared build
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith('build=')) app.openShareCode(hash.slice(6));

  app.start();
  document.getElementById('loading')?.remove();
  (window as unknown as { sandbox: unknown }).sandbox = { app, tools, ui, desktop };
  try {
    if (!localStorage.getItem('vrsb.seenTemplates') && !hash.startsWith('build=')) {
      localStorage.setItem('vrsb.seenTemplates', '1');
      ui.templatesModal();
    }
  } catch {
    /* storage unavailable (private mode): skip first-run hint */
  }
  ui.refresh();
}

main().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  if (l) l.innerHTML = `<div style="max-width:560px;text-align:center">Could not start: ${String(e?.message ?? e)}</div>`;
});
