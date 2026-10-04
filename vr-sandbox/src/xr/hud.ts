// Messages in the headset. The app's toasts (a joint giving way, a hint, a fault the watchdog found) appear on a
// small panel low in the view, where a glance finds them without covering the work, and fade after a few seconds.

import * as THREE from 'three';
import type { App, Toast } from '../app/app';
import { T, wrapText } from './ui';

const W = 1024;
const H = 200;
/** Seconds a message stays, and the last of them it spends fading. */
const LIFE = 5;
const FADE = 1;
const COLOURS: Record<Toast['kind'], string> = { info: T.ink, ok: T.green, warn: T.amber, break: T.red };
/** The rule down a message's left edge: its kind at a glance (Ego's own words in her colour). */
const RULES: Record<Toast['kind'], string> = { info: T.ego, ok: T.green, warn: T.amber, break: T.red };

export class Hud {
  readonly mesh: THREE.Mesh;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private messages: (Toast & { age: number })[] = [];
  private dirty = false;

  constructor(app: App, camera: THREE.Camera) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false });
    // 1 m ahead and 0.3 m down: about 17 degrees below the line of sight, 29 degrees wide
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.52, (0.52 * H) / W), material);
    this.mesh.position.set(0, -0.3, -1);
    this.mesh.rotation.x = 0.29;
    this.mesh.renderOrder = 1000;
    this.mesh.visible = false;
    camera.add(this.mesh);
    app.onToast((t) => {
      this.messages = [...this.messages.filter((m) => m.text !== t.text), { ...t, age: 0 }].slice(-3);
      this.dirty = true;
    });
  }

  update(dt: number) {
    if (!this.messages.length) return;
    for (const m of this.messages) m.age += dt;
    const before = this.messages.length;
    this.messages = this.messages.filter((m) => m.age < LIFE);
    if (this.messages.length !== before || this.messages.some((m) => m.age > LIFE - FADE)) this.dirty = true;
    if (this.dirty) this.draw();
  }

  private draw() {
    this.dirty = false;
    const g = this.ctx;
    g.clearRect(0, 0, W, H);
    this.mesh.visible = this.messages.length > 0;
    g.font = '600 28px system-ui, sans-serif';
    g.textBaseline = 'middle';
    // newest at the bottom; each message wrapped to at most two lines, stacked upward while they fit
    let bottom = H - 6;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i]!;
      const lines = wrapText(g, m.text, W - 70, 2);
      const h = lines.length * 34 + 18;
      if (bottom - h < 0) break;
      g.globalAlpha = Math.min(1, (LIFE - m.age) / FADE);
      g.fillStyle = T.bg;
      g.beginPath();
      g.roundRect(8, bottom - h, W - 16, h, 14);
      g.fill();
      g.fillStyle = RULES[m.kind];
      g.beginPath();
      g.roundRect(8, bottom - h, 8, h, 4);
      g.fill();
      g.fillStyle = COLOURS[m.kind];
      lines.forEach((l, k) => g.fillText(l, 34, bottom - h + 9 + 17 + k * 34));
      bottom -= h + 6;
    }
    g.globalAlpha = 1;
    this.texture.needsUpdate = true;
  }
}
