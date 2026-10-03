// Entry point. The app runs in a Meta Quest headset; this page boots physics and the scene, then offers to enter VR
// (a WebXR session can only start from a button press). Everything else happens in the headset.

import { TEMPLATES } from './templates/templates';
import { App, REPORT_REPO } from './app/app';
import { ToolManager } from './tools/tools';
import { Ego } from './assistant/ego';
import { issueUrl, reportText } from './assistant/reports';

async function main() {
  const params = new URLSearchParams(location.search);
  const host = document.getElementById('viewport')!;
  const launch = document.getElementById('launch')!;
  const status = document.getElementById('status')!;
  const button = document.getElementById('vr') as HTMLButtonElement;
  const mode = document.getElementById('vrmode') as HTMLSelectElement;
  document.getElementById('build')!.textContent = `Version ${__BUILD__}`;
  const app = await App.create(host, params.get('physics') === 'inline' ? 'inline' : 'worker');
  const tools = new ToolManager(app);
  // the assistant: she sees the world, learns your habits, and runs Forge
  app.ego = new Ego(app, tools);
  const handles: Record<string, unknown> = { app, tools, ego: app.ego, xr: null, templates: TEMPLATES };
  (window as unknown as { sandbox: unknown }).sandbox = handles;
  app.everyFrame('tools', (dt) => tools.frame(dt));
  // behind the launch card, a still view into the workshop
  app.view.camera.position.set(0, 1.7, 3.4);
  app.view.camera.rotation.set(-0.28, 0, 0);
  const resize = () => app.resize(host.clientWidth, host.clientHeight);
  window.addEventListener('resize', resize);
  resize();

  // ?iwer installs Meta's WebXR emulator (a virtual Quest 3) so the headset can be emulated in tests and in
  // development. It never loads otherwise.
  if (params.has('iwer')) {
    const { XRDevice, metaQuest3 } = await import('iwer');
    const device = new XRDevice(metaQuest3);
    device.installRuntime({ forceInstall: true });
    (window as unknown as { iwer: unknown }).iwer = device;
    // a synthetic room (floor, walls, a table) so walk and mixed reality have a scan to use
    if (params.get('iwer') !== 'noroom') {
      const { installTestRoom } = await import('./xr/testRoom');
      installTestRoom(device);
    }
  }

  let supported = false;
  try {
    supported = 'xr' in navigator && (await navigator.xr!.isSessionSupported('immersive-vr'));
  } catch {
    supported = false;
  }
  if (supported) {
    const { XRMode } = await import('./xr/xr');
    const xr = new XRMode(app, tools);
    handles['xr'] = xr;
    const passthrough = await XRMode.passthroughSupported();
    (document.getElementById('vrmode-mixed') as HTMLOptionElement).disabled = !passthrough;
    mode.value = xr.style === 'mixed' && !passthrough ? 'walk' : xr.style;
    mode.disabled = false;
    button.disabled = false;
    status.textContent = 'Ready. Press Enter VR.';
    button.onclick = () => {
      void xr.enter(mode.value as 'relax' | 'walk' | 'mixed').catch((e) => {
        status.textContent = `Could not enter VR: ${String(e?.message ?? e)}`;
      });
    };
    app.renderer.xr.addEventListener('sessionstart', () => { launch.hidden = true; });
    app.renderer.xr.addEventListener('sessionend', () => {
      launch.hidden = false;
      showReports();
      app.view.camera.position.set(0, 1.7, 3.4);
      app.view.camera.rotation.set(-0.28, 0, 0);
    });
  } else {
    status.textContent = 'This is a Meta Quest app: open this page in the Quest browser to enter VR.';
  }

  // what you told Ego is wrong, waiting to go to Claude: sending opens a GitHub issue, which Claude reads
  const reportsBox = document.getElementById('reports')!;
  const showReports = () => {
    const unsent = app.ego?.reports.unsent ?? [];
    reportsBox.hidden = !unsent.length;
    document.getElementById('reports-text')!.textContent = `Ego has ${unsent.length} report${unsent.length === 1 ? '' : 's'} for Claude: “${unsent[unsent.length - 1]?.words ?? ''}”${unsent.length > 1 ? ' and more' : ''}.`;
  };
  document.getElementById('reports-send')!.addEventListener('click', () => {
    const unsent = app.ego?.reports.unsent ?? [];
    if (!unsent.length) return;
    window.open(issueUrl(unsent, REPORT_REPO), '_blank');
    app.ego!.reports.markSent(unsent.map((r) => r.id));
    showReports();
  });
  document.getElementById('reports-copy')!.addEventListener('click', () => {
    void navigator.clipboard?.writeText(reportText(app.ego?.reports.unsent ?? [])).then(
      () => { document.getElementById('reports-text')!.textContent = 'Copied: paste it to Claude.'; },
      () => { document.getElementById('reports-text')!.textContent = 'This browser would not copy.'; },
    );
  });
  showReports();

  // #build=VRSB1... links open a shared build
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith('build=')) app.openShareCode(hash.slice(6));

  // ask the browser to keep what you save even when the headset runs short of space
  void navigator.storage?.persist?.().catch(() => false);
  app.start();
  document.getElementById('loading')?.remove();
}

main().catch((e) => {
  console.error(e);
  const s = document.getElementById('status');
  if (s) s.textContent = `Could not start: ${String(e?.message ?? e)}`;
});
