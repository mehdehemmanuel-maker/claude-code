// Typing in a headset: a keyboard of light in front of you, pressed by pointing the controller's ray at a key and
// pulling the trigger, with what you have typed on its top line. Enter sends it to Claude; the microphone key listens
// instead, where the browser can hear.

import * as THREE from 'three';

interface Key { label: string; x: number; y: number; w: number; h: number }
const ROWS = ['1234567890', 'qwertyuiop', "asdfghjkl'", 'zxcvbnm,.?'];

export class Keyboard {
  readonly mesh: THREE.Mesh;
  text = '';
  private shift = false;
  private readonly keys: Key[] = [];
  private readonly canvas = document.createElement('canvas');
  private readonly tex: THREE.CanvasTexture;
  private lit: { key: string; until: number } | null = null;

  constructor(private readonly mic: boolean, width = 0.56) {
    this.canvas.width = 1400; this.canvas.height = 560;
    const W = this.canvas.width, top = 110, kh = 92, gap = 10;
    ROWS.forEach((r, j) => { const kw = (W - 40 - gap * 9) / 10; [...r].forEach((ch, i) => this.keys.push({ label: ch, x: 20 + i * (kw + gap) + (j === 3 ? kw / 2 : 0), y: top + j * (kh + gap), w: kw, h: kh })); });
    const y = top + 4 * (kh + gap), bottom: [string, number][] = [['⇧', 150], ...(this.mic ? [['🎤', 130] as [string, number]] : []), ['space', 0], ['⌫', 170], ['send ⏎', 250]];
    const fixed = bottom.reduce((a, [, w]) => a + w, 0) + gap * (bottom.length - 1), spaceW = W - 40 - fixed;
    let x = 20; for (const [label, w] of bottom) { const ww = w || spaceW; this.keys.push({ label, x, y, w: ww, h: kh }); x += ww + gap; }
    this.canvas.height = y + kh + 20;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, (width * this.canvas.height) / W), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.renderOrder = 20; this.mesh.visible = false;
    this.draw();
  }

  /** The key under a point on the board (its texture coordinates), or null. */
  keyAt(uv: THREE.Vector2): string | null {
    const x = uv.x * this.canvas.width, y = (1 - uv.y) * this.canvas.height;
    return this.keys.find((k) => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h)?.label ?? null;
  }
  /** Press a key: what it does to the text, or 'send' / 'mic' for the caller to act on. */
  press(key: string): 'send' | 'mic' | null {
    this.lit = { key, until: performance.now() + 180 };
    let out: 'send' | 'mic' | null = null;
    if (key === '⇧') this.shift = !this.shift;
    else if (key === '⌫') this.text = this.text.slice(0, -1);
    else if (key === 'space') this.text += ' ';
    else if (key === 'send ⏎') out = 'send';
    else if (key === '🎤') out = 'mic';
    else { this.text += this.shift ? key.toUpperCase() : key; this.shift = false; }
    this.draw();
    return out;
  }
  draw(): void {
    const g = this.canvas.getContext('2d')!, W = this.canvas.width, H = this.canvas.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(2,12,20,0.78)'; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 30); g.fill();
    g.strokeStyle = '#4dd0e1'; g.lineWidth = 3; g.stroke();
    g.textBaseline = 'middle'; g.fillStyle = this.text ? '#ffffff' : '#7fb3c8'; g.font = '500 44px system-ui';
    const shown = this.text || 'type to Claude, or ask it to build anything';
    let s = shown; while (g.measureText(`${s}▏`).width > W - 70 && s.length > 1) s = s.slice(1);
    g.fillText(`${s}${this.text ? '▏' : ''}`, 34, 56);
    const now = performance.now();
    for (const k of this.keys) {
      const on = this.lit && this.lit.key === k.label && now < this.lit.until, sh = k.label === '⇧' && this.shift;
      g.fillStyle = on ? 'rgba(128,222,234,0.55)' : sh ? 'rgba(255,215,64,0.3)' : k.label === 'send ⏎' ? 'rgba(255,183,77,0.25)' : 'rgba(77,208,225,0.12)';
      g.beginPath(); g.roundRect(k.x, k.y, k.w, k.h, 14); g.fill();
      g.strokeStyle = 'rgba(77,208,225,0.5)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#e6f7ff'; g.font = `500 ${k.label.length > 1 ? 34 : 46}px system-ui`; g.textAlign = 'center';
      g.fillText(this.shift && k.label.length === 1 ? k.label.toUpperCase() : k.label, k.x + k.w / 2, k.y + k.h / 2 + 2);
      g.textAlign = 'left';
    }
    this.tex.needsUpdate = true;
    if (this.lit) window.setTimeout(() => { if (this.lit && performance.now() >= this.lit.until) { this.lit = null; this.draw(); } }, 200);
  }
}
