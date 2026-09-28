// Desktop fallback controls: fly camera (WASD + mouse look on right-drag), tools on the left button.

import * as THREE from 'three';
import type { App } from '../app/app';
import type { PointerEvt, ToolManager } from '../tools/tools';

export class DesktopControls {
  yaw = 0;
  pitch = -0.28;
  readonly pos = new THREE.Vector3(0, 1.7, 3.4);
  private keys = new Set<string>();
  private looking = false;
  private ndc = new THREE.Vector2(0, 0);
  private raycaster = new THREE.Raycaster();
  enabled = true;

  constructor(private app: App, private tools: ToolManager, private canvas: HTMLCanvasElement) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('keydown', (e) => { if (!isTyping(e)) this.keys.add(e.code); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  private setNdc(e: PointerEvent | MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  evt(e?: { button?: number; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }): PointerEvt {
    this.raycaster.setFromCamera(this.ndc, this.app.view.camera);
    return {
      ray: { origin: this.raycaster.ray.origin.clone(), dir: this.raycaster.ray.direction.clone() },
      button: e?.button ?? 0,
      shift: !!e?.shiftKey,
      ctrl: !!(e?.ctrlKey || e?.metaKey),
      source: 'mouse',
    };
  }

  private onDown(e: PointerEvent) {
    void this.app.audio.start();
    this.setNdc(e);
    if (e.button === 2) {
      this.looking = true;
      this.canvas.requestPointerLock?.();
      return;
    }
    if (e.button === 0) this.tools.down(this.evt(e));
  }

  private onMove(e: PointerEvent) {
    if (this.looking) {
      this.yaw -= e.movementX * 0.0035;
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - e.movementY * 0.0035));
      return;
    }
    if (e.target !== this.canvas && !this.tools.grab.holding) return;
    this.setNdc(e);
    this.tools.move(this.evt(e));
  }

  private onUp(e: PointerEvent) {
    if (e.button === 2) {
      this.looking = false;
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    if (e.button === 0) this.tools.up(this.evt(e));
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (this.tools.wheel(e.deltaY)) return;
    const f = this.forward();
    this.pos.addScaledVector(f, -e.deltaY * 0.002 * this.app.settings.playerScale);
  }

  private forward() {
    return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  update(dt: number) {
    if (!this.enabled) return;
    const s = this.app.settings.playerScale;
    const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 9 : 3) * s;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const v = new THREE.Vector3();
    if (this.keys.has('KeyW')) v.add(fwd);
    if (this.keys.has('KeyS')) v.sub(fwd);
    if (this.keys.has('KeyD')) v.add(right);
    if (this.keys.has('KeyA')) v.sub(right);
    if (this.keys.has('KeyE') || this.keys.has('Space')) v.y += 1;
    if (this.keys.has('KeyQ')) v.y -= 1;
    if (v.lengthSq() > 0) this.pos.addScaledVector(v.normalize(), speed * dt);
    this.pos.y = Math.max(0.05 * s, this.pos.y);
    const rig = this.app.view.rig;
    rig.position.copy(this.pos);
    rig.rotation.set(0, this.yaw, 0);
    rig.scale.setScalar(1);
    this.app.view.camera.position.set(0, 0, 0);
    this.app.view.camera.rotation.set(this.pitch, 0, 0);
    // vehicle controls on the arrow keys (always) and aux on Z/X
    const ch = this.app.channels;
    const throttle = (this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('ArrowDown') ? 1 : 0);
    const steer = (this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('ArrowRight') ? 1 : 0);
    const aux = (this.keys.has('KeyX') ? 1 : 0) - (this.keys.has('KeyZ') ? 1 : 0);
    ch['throttle'] = throttle;
    ch['steer'] = steer;
    ch['aux'] = aux;
    // hover / ghost follow the mouse even when it is still
    this.tools.last = this.evt();
  }
}

export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
