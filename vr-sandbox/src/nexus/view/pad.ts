// Being in it, and working what is in it: the controls a board's Button, Stick and Slider nodes ask for (src/nexus/
// controls.ts), drawn over a 3D view and worked by whatever the person has, and a walk through the world at your own
// height. One owner for both views: the dashboard's 3D view (dock3d.ts) and the space (space.ts).
//
// - A computer: a button's key (its setting), the arrow keys for a stick (W A S D too when not walking), a gamepad's left
//   stick and its first buttons; the mouse on the buttons and sliders drawn, or on a button put on a thing in 3D.
// - A phone: the same drawn buttons, sliders and sticks under a finger; a drag on the view looks about while walking.
// - Walking: W A S D (or the left drawn stick) walk where you look, Shift runs, a drag looks; you stand on the ground at
//   1.6 m, eye height. Walk again, or Esc, to stand back and turn about the thing as before.
//
// The flow: a key, a finger or a mouse works a control here; its state is written in controls.ts by its name; the board
// is asked to run its control nodes again (wall.controlsChanged) at most once a frame, and only what they feed runs.
import * as THREE from 'three';
import { pressButton, pushStick, controlState, setControl, type ButtonState, type ControlSpec } from '../controls';
import { wall } from './nodes';

const CSS = `.pad{position:absolute;inset:0;pointer-events:none;z-index:5;font:12px system-ui,sans-serif;color:#e8f1ff;user-select:none;-webkit-user-select:none}
.pad .stick{position:absolute;bottom:18px;width:116px;height:116px;border-radius:50%;background:rgba(20,32,52,.55);border:1px solid rgba(128,222,234,.45);pointer-events:auto;touch-action:none}
.pad .stick .knob{position:absolute;left:38px;top:38px;width:40px;height:40px;border-radius:50%;background:rgba(128,222,234,.85);box-shadow:0 0 12px rgba(128,222,234,.6)}
.pad .stick .lab{position:absolute;top:-18px;left:0;right:0;text-align:center;color:#9fb3c8}
.pad .btns{position:absolute;right:16px;bottom:18px;display:flex;flex-wrap:wrap-reverse;gap:10px;justify-content:flex-end;max-width:240px;pointer-events:none}
.pad .btn{pointer-events:auto;touch-action:none;width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:600;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.5);text-align:center;line-height:1.1;padding:2px}
.pad .btn small{font-weight:400;opacity:.75;font-size:10px}
.pad .btn.on{transform:scale(.92);filter:brightness(1.4);box-shadow:0 0 16px currentColor}
.pad .sliders{position:absolute;right:16px;top:12px;display:flex;flex-direction:column;gap:6px;pointer-events:auto;background:rgba(10,18,30,.6);padding:8px 10px;border-radius:10px;border:1px solid rgba(128,222,234,.25)}
.pad .sliders:empty{display:none}
.pad .sliders label{display:flex;gap:8px;align-items:center;justify-content:space-between}
.pad .sliders input{width:130px;touch-action:none}
.pad .walk{position:absolute;left:12px;top:12px;pointer-events:auto;background:rgba(10,18,30,.75);color:#e8f1ff;border:1px solid rgba(128,222,234,.5);border-radius:8px;padding:6px 10px;cursor:pointer;font:inherit}
.pad .walk.on{background:#00838f}
.pad .hint{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(10,18,30,.7);padding:5px 10px;border-radius:8px;color:#b8c7d9;pointer-events:none;white-space:nowrap}
/* (a page with its own links along the bottom raises the sticks over them) */
.pad.raised .stick{bottom:64px}
@media (max-width:640px),(pointer:coarse){#stat3d{display:none}.pad .hint{display:none!important}.pad .sliders{top:52px;left:12px;right:12px}.pad .sliders input{flex:1;width:auto}}
.pad .cross{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:rgba(255,255,255,.7);pointer-events:none}`;
const HEX: Record<string, string> = { red: '#e53935', green: '#43a047', blue: '#1e88e5', yellow: '#fdd835', white: '#eceff1' };

/** A drawn stick under a finger or the mouse: where it is pushed, x right and y forward, each −1 to 1. */
class Stick {
  readonly el = document.createElement('div'); x = 0; y = 0; private readonly knob = document.createElement('div');
  constructor(label: string) {
    this.el.className = 'stick'; this.knob.className = 'knob'; const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = label; this.el.append(lab, this.knob);
    let id = -1;
    const at = (e: PointerEvent) => { const r = this.el.getBoundingClientRect(), dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2), m = Math.max(1, Math.hypot(dx, dy)); this.set(dx / m, -dy / m); };
    this.el.addEventListener('pointerdown', (e) => { id = e.pointerId; this.el.setPointerCapture(id); at(e); e.stopPropagation(); e.preventDefault(); });
    this.el.addEventListener('pointermove', (e) => { if (e.pointerId === id) at(e); });
    const end = (e: PointerEvent) => { if (e.pointerId === id) { id = -1; this.set(0, 0); } };
    this.el.addEventListener('pointerup', end); this.el.addEventListener('pointercancel', end);
  }
  set(x: number, y: number): void { this.x = x; this.y = y; this.knob.style.transform = `translate(${x * 38}px, ${-y * 38}px)`; }
}

/** A walk through the world at a person's height: the camera stood on the ground (y = 0) at eye height, moved where it
 *  looks, turned by a drag. The orbit control is put aside while walking and given back after. */
export class Walker {
  on = false; yaw = 0; pitch = 0; readonly keys = new Set<string>(); stick: Stick | null = null;
  /** Walking speed, m/s (a brisk walk: 1.4 m/s; running with Shift: 4 m/s). */
  speed = 1.4;
  /** The ground's height and the scale a metre of the world is drawn at, where the view scales its world (the space). */
  ground = () => 0; metre = () => 1;
  constructor(private readonly camera: THREE.Camera, el: HTMLElement, private readonly orbit: { enabled: boolean; target: THREE.Vector3; update(): void }, private readonly eye = 1.6) {
    let last: [number, number] | null = null;
    el.addEventListener('pointerdown', (e) => { if (this.on) last = [e.clientX, e.clientY]; });
    window.addEventListener('pointermove', (e) => { if (!this.on || !last) return; this.yaw -= (e.clientX - last[0]) * 0.004; this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - (e.clientY - last[1]) * 0.004)); last = [e.clientX, e.clientY]; });
    window.addEventListener('pointerup', () => { last = null; });
    window.addEventListener('keydown', (e) => { if (this.on && !(e.target as HTMLElement).closest?.('input, textarea')) this.keys.add(e.code); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }
  /** Stood at a ground point, looking toward another. */
  enter(at: THREE.Vector3, toward: THREE.Vector3): void {
    this.on = true; this.orbit.enabled = false; const d = toward.clone().sub(at); this.yaw = Math.atan2(-d.x, -d.z); this.pitch = 0;
    this.camera.position.set(at.x, this.ground() + this.eye * this.metre(), at.z); this.apply();
  }
  exit(): void { this.on = false; this.keys.clear(); const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion); this.orbit.target.copy(this.camera.position).addScaledVector(f, 3 * this.metre()); this.orbit.enabled = true; this.orbit.update(); }
  private apply(): void { this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')); }
  /** A frame's walk: where the keys and the stick push, for dt seconds. */
  update(dt: number): void {
    if (!this.on) return;
    const k = (c: string) => (this.keys.has(c) ? 1 : 0), fwd = k('KeyW') - k('KeyS') + (this.stick?.y ?? 0), side = k('KeyD') - k('KeyA') + (this.stick?.x ?? 0);
    const v = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : this.speed) * this.metre() * dt, f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new THREE.Vector3(-f.z, 0, f.x);
    this.camera.position.addScaledVector(f, fwd * v).addScaledVector(r, side * v); this.camera.position.y = this.ground() + this.eye * this.metre(); this.apply();
  }
}

/** The controls drawn over a 3D view (`host`, positioned), with a walk if one is given. */
export class Pad {
  readonly el = document.createElement('div');
  private readonly btns = document.createElement('div'); private readonly sliders = document.createElement('div'); private readonly hint = document.createElement('div');
  private readonly walkBtn = document.createElement('button'); private readonly cross = document.createElement('div');
  private specs: ControlSpec[] = []; private sig = ''; private boardStick: Stick | null = null; private readonly walkStick = new Stick('walk');
  private readonly keysDown = new Set<string>(); private dirty = false; private last = performance.now(); private stickWasIdle = new Map<string, boolean>();
  constructor(host: HTMLElement, private readonly walker: Walker | null, private readonly onWalk?: (on: boolean) => void) {
    if (!document.getElementById('pad-css')) { const st = document.createElement('style'); st.id = 'pad-css'; st.textContent = CSS; document.head.appendChild(st); }
    this.el.className = 'pad'; this.btns.className = 'btns'; this.sliders.className = 'sliders'; this.hint.className = 'hint'; this.cross.className = 'cross';
    this.walkBtn.className = 'walk'; this.walkBtn.textContent = '🚶 Walk'; this.walkBtn.title = 'Walk in it at your own height (V): W A S D or the stick, drag to look, Shift to run';
    this.walkBtn.onclick = () => this.walk(!this.walker?.on);
    this.el.append(this.btns, this.sliders, this.hint); if (walker) { this.el.append(this.walkBtn, this.cross); walker.stick = this.walkStick; this.walkStick.el.style.left = '18px'; }
    host.appendChild(this.el); this.layout();
    window.addEventListener('keydown', (e) => this.key(e, true)); window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => { for (const c of this.keysDown) this.key({ code: c, key: '' } as KeyboardEvent, false); });
    const loop = (now: number) => { this.frame(Math.min(0.1, (now - this.last) / 1000)); this.last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  /** Walking, or standing back to turn about. */
  walk(on: boolean): void {
    if (!this.walker || on === this.walker.on) return; this.onWalk?.(on); this.walkBtn.classList.toggle('on', on); this.walkBtn.textContent = on ? '✕ Stop walking' : '🚶 Walk'; this.layout();
  }
  /** A press on a piece in 3D: a button put on a thing is pressed (down) or let go (up). True when it was one. */
  pressPiece(name: string, down: boolean): boolean {
    const m = /^button: (.+)$/.exec(name); if (!m) return false; const s = this.specs.find((x) => x.block === 'control.button' && x.name === m[1]); if (!s) return false;
    this.press(s, down); return true;
  }
  /** A button let go if it was held by a piece pressed in 3D (the pointer came up somewhere else). */
  releaseAll(): void { for (const s of this.specs) if (s.block === 'control.button' && s.set.mode !== 'toggle' && controlState<ButtonState>(s.name, { on: false, presses: 0 }).on) this.press(s, false); }
  private press(s: ControlSpec, down: boolean): void { pressButton(s.name, down, s.set.mode === 'toggle'); this.dirty = true; this.paint(); }
  private key(e: KeyboardEvent, down: boolean): void {
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]')) return;
    if (down && e.repeat) return;
    if (down) this.keysDown.add(e.code); else this.keysDown.delete(e.code);
    if (down && (e.code === 'KeyV') && this.walker) { this.walk(!this.walker.on); return; }
    if (down && e.code === 'Escape' && this.walker?.on) { this.walk(false); return; }
    for (const s of this.specs) if (s.block === 'control.button' && keyOf(String(s.set.key ?? '')) === e.code) { this.press(s, down); e.preventDefault(); }
  }
  /** What the board asks for, drawn again when it changed. */
  private layout(): void {
    this.specs = wall.controls(); const sig = JSON.stringify([this.specs.map((s) => [s.block, s.name, s.set]), this.walker?.on]); if (sig === this.sig) return; this.sig = sig;
    this.btns.innerHTML = ''; this.sliders.innerHTML = ''; this.boardStick?.el.remove(); this.boardStick = null; this.walkStick.el.remove();
    for (const s of this.specs) {
      if (s.block === 'control.button') {
        const b = document.createElement('div'); b.className = 'btn'; b.dataset.name = s.name; const col = HEX[String(s.set.colour)] ?? HEX.red!; b.style.background = `radial-gradient(circle at 35% 30%, ${col}, ${col}99 70%)`; b.style.color = '#fff';
        b.innerHTML = `<span>${esc(s.name)}</span><small>${esc(String(s.set.key ?? ''))}${s.set.mode === 'toggle' ? ' ⇄' : ''}</small>`;
        b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); this.press(s, true); e.stopPropagation(); e.preventDefault(); });
        const up = () => this.press(s, false); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
        this.btns.appendChild(b);
      } else if (s.block === 'control.slider') {
        const lo = Number(s.set.min), hi = Number(s.set.max), v = Number(controlState(s.name, Number(s.set.value)));
        const l = document.createElement('label'); l.innerHTML = `<span>${esc(s.name)}</span><input type="range" min="${lo}" max="${hi}" step="${(hi - lo) / 200}" value="${v}"><b>${fmt(v)}${s.set.unit ? ` ${esc(String(s.set.unit))}` : ''}</b>`;
        const inp = l.querySelector('input')!, out = l.querySelector('b')!; inp.oninput = () => { setControl(s.name, Number(inp.value)); out.textContent = `${fmt(Number(inp.value))}${s.set.unit ? ` ${s.set.unit}` : ''}`; this.dirty = true; };
        inp.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.sliders.appendChild(l);
      } else if (s.block === 'control.stick' && !this.boardStick) {
        this.boardStick = new Stick(s.name); this.el.appendChild(this.boardStick.el);
        // (walking, the left hand walks you and the board's stick moves to the middle; standing, it is on the left)
        this.boardStick.el.style.left = this.walker?.on ? 'calc(50% - 58px)' : '18px';
      }
    }
    if (this.walker?.on) this.el.appendChild(this.walkStick.el);
    this.cross.style.display = this.walker?.on ? '' : 'none';
    const n = this.specs.length, keys = this.specs.filter((s) => s.block === 'control.button').map((s) => `${s.set.key} ${s.name}`).join(' · '), stick = this.specs.some((s) => s.block === 'control.stick');
    this.hint.textContent = this.walker?.on ? `Walking: W A S D, drag to look, Shift runs, Esc stops${stick ? ' · arrows drive' : ''}${keys ? ` · ${keys}` : ''}` : n ? `${keys}${stick ? `${keys ? ' · ' : ''}arrows or W A S D drive` : ''}` : '';
    this.hint.style.display = this.hint.textContent ? '' : 'none';
  }
  private paint(): void { for (const el of this.btns.querySelectorAll<HTMLElement>('.btn')) el.classList.toggle('on', controlState<ButtonState>(el.dataset.name!, { on: false, presses: 0 }).on); }
  private frame(dt: number): void {
    this.layout(); this.walker?.update(dt);
    // the board's sticks: the arrow keys (and W A S D when not walking), the drawn stick, a gamepad's left stick
    const k = (c: string) => (this.keysDown.has(c) ? 1 : 0), walking = !!this.walker?.on, pads = navigator.getGamepads?.() ?? [], gp = [...pads].find((g) => g && g.connected);
    for (const s of this.specs) {
      if (s.block !== 'control.stick') continue;
      let x = k('ArrowRight') - k('ArrowLeft') + (walking ? 0 : k('KeyD') - k('KeyA')) + (this.boardStick?.x ?? 0), y = k('ArrowUp') - k('ArrowDown') + (walking ? 0 : k('KeyW') - k('KeyS')) + (this.boardStick?.y ?? 0);
      if (gp) { const gx = gp.axes[0] ?? 0, gy = gp.axes[1] ?? 0; if (Math.abs(gx) > 0.15) x += gx; if (Math.abs(gy) > 0.15) y -= gy; }
      x = Math.max(-1, Math.min(1, x)); y = Math.max(-1, Math.min(1, y));
      const idle = !x && !y; if (idle && this.stickWasIdle.get(s.name)) continue; this.stickWasIdle.set(s.name, idle);
      pushStick(s.name, x, y, dt, Number(s.set.speed ?? 2), s.set.mode !== 'slide'); this.dirty = true;
    }
    if (gp) gp.buttons.slice(0, 4).forEach((b, i) => { const s = this.specs.filter((x) => x.block === 'control.button')[i]; if (!s) return; const on = controlState<ButtonState>(s.name, { on: false, presses: 0 }).on; if (s.set.mode !== 'toggle' ? b.pressed !== on : false) this.press(s, b.pressed); });
    if (this.dirty) { this.dirty = false; wall.controlsChanged(); }
  }
}
/** A key's setting as the code a keyboard sends: "E" is KeyE, "1" Digit1, "Space" Space, "Enter" Enter. */
export function keyOf(k: string): string { const t = k.trim(); if (/^[a-z]$/i.test(t)) return `Key${t.toUpperCase()}`; if (/^[0-9]$/.test(t)) return `Digit${t}`; if (/^space$/i.test(t) || t === ' ') return 'Space'; return t.charAt(0).toUpperCase() + t.slice(1); }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmt = (v: number) => String(Number(v.toPrecision(3)));
