// WebXR mode (placeholder until the full controller implementation lands).
import type { App } from '../app/app';
import type { ToolManager } from '../tools/tools';
import type { DesktopControls } from '../interaction/desktop';

export class XRMode {
  constructor(private app: App, private tools: ToolManager, private desktop: DesktopControls) {}
  async enter() {
    const session = await navigator.xr!.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    await this.app.renderer.xr.setSession(session);
    void this.tools; void this.desktop;
  }
}
