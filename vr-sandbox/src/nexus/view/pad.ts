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
import type { Verdict } from './dock3d';

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

// ---- the paste card (spec 01, I16): the strip of what can be pasted, the verdict beside its negative, accept or cancel ---
// The view's own words and buttons for a paste (view/dock3d.ts's PasteSession drives it): a strip along the bottom of
// the 3D view with a chip for each bolt the board makes (and one copied); pressed and dragged over the view, or tapped and
// then the part tapped, its negative is drawn and this card says what the paste node found, in the rule's own words.
// Released, the card is pinned with its buttons: Cut it (Enter) and Cancel (Esc), each at least 44 px square (WCAG 2.5.5).
/** What the card asks of the paste session. */
export interface PasteHooks { begin(key: string, x: number, y: number): void; move(x: number, y: number): void; release(x: number, y: number, moved: boolean): void; accept(): void; cancel(): void; menu(item: 'copy' | 'paste'): void; active(): boolean; pinned(): boolean; fits(): boolean }
const PASTE_CSS = `#stat3d{z-index:6;background:rgba(8,14,24,.72);padding:3px 7px;border-radius:6px;color:#c9d6e6!important}
.paste-strip{position:absolute;left:8px;right:8px;bottom:8px;z-index:7;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:12px system-ui,sans-serif;color:#d6e2f0;pointer-events:none}
.paste-strip .lab{flex:none;background:rgba(8,14,24,.72);padding:4px 8px;border-radius:6px}
.paste-strip .chip{flex:none;width:auto;height:auto;white-space:nowrap;pointer-events:auto;touch-action:none;min-height:44px;min-width:44px;display:flex;align-items:center;gap:6px;padding:0 12px;border-radius:22px;background:rgba(20,32,52,.9);border:1px solid rgba(64,196,255,.6);color:#e8f1ff;cursor:grab;user-select:none;-webkit-user-select:none;font:inherit}
.paste-strip .chip.armed{background:#00838f;border-color:#80deea}
.paste-strip .chip b{font-weight:600}
.paste-card{position:absolute;z-index:8;max-width:min(420px,calc(100% - 24px));background:rgba(8,14,24,.92);border:1px solid rgba(64,196,255,.45);border-radius:10px;padding:10px 12px;font:12px/1.45 system-ui,sans-serif;color:#e3ecf6;box-shadow:0 6px 24px rgba(0,0,0,.5)}
.paste-card .head{font-size:13px;font-weight:600;margin-bottom:4px}.paste-card .head.ok{color:#9be7a0}.paste-card .head.no{color:#ff8a80}
.paste-card .cut{color:#b8c7d9;margin-bottom:4px}.paste-card ul{list-style:none;margin:0 0 6px;padding:0}.paste-card li{margin:1px 0}
.paste-card .legend{display:flex;flex-direction:column;gap:2px;color:#b8c7d9;margin:4px 0}.paste-card .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}
.paste-card .note{color:#ffd180;margin:4px 0}.paste-card details.more summary{cursor:pointer;color:#80deea;min-height:24px}.paste-card .note.bad{color:#ff8a80}.paste-card .busy{color:#80deea}
.paste-card .btns{display:flex;gap:8px;margin-top:6px}.paste-card button{min-width:44px;min-height:44px;padding:0 14px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:#1d2b3f;color:#fff;font:inherit;cursor:pointer}
.paste-card button.go{background:#c62828;border-color:#ff8a80}.paste-card button:disabled{opacity:.45;cursor:not-allowed}
.paste-menu{position:absolute;z-index:9;background:rgba(8,14,24,.96);border:1px solid rgba(64,196,255,.5);border-radius:8px;padding:4px;display:flex;flex-direction:column;font:12px system-ui,sans-serif}
.paste-menu button{min-height:44px;text-align:left;padding:0 12px;background:none;border:none;color:#e8f1ff;font:inherit;cursor:pointer;border-radius:6px}.paste-menu button:hover:not(:disabled){background:#1d2b3f}.paste-menu button:disabled{opacity:.5;cursor:not-allowed}
.paste-menu .why{color:#9fb3c8;padding:0 12px 6px;font-size:11px}`;
export class PasteCard {
  readonly strip = document.createElement('div'); readonly card = document.createElement('div'); private readonly menuEl = document.createElement('div');
  private armedKey = ''; private onKey: (e: KeyboardEvent) => void;
  constructor(private readonly host: HTMLElement, private readonly hooks: PasteHooks) {
    if (!document.getElementById('paste-css')) { const st = document.createElement('style'); st.id = 'paste-css'; st.textContent = PASTE_CSS; document.head.appendChild(st); }
    this.strip.className = 'paste-strip'; this.card.className = 'paste-card'; this.card.style.display = 'none'; this.menuEl.className = 'paste-menu'; this.menuEl.style.display = 'none';
    host.append(this.strip, this.card, this.menuEl);
    // (Esc and Enter taken before the dashboard's, the board's and the walker's own, only while a paste is under way)
    this.onKey = (e) => { if (!hooks.active() && this.menuEl.style.display === 'none') return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.closeMenu(); hooks.cancel(); }
      else if (e.key === 'Enter' && hooks.pinned()) { e.preventDefault(); e.stopImmediatePropagation(); if (hooks.fits()) hooks.accept(); } };
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('pointerdown', (e) => { if (this.menuEl.style.display !== 'none' && !this.menuEl.contains(e.target as Node)) this.closeMenu(); }, true);
  }
  /** The strip: a chip for each thing that can be pasted, or the note of how to get one. */
  chips(list: { key: string; name: string; says: string }[], note?: string): void {
    this.strip.replaceChildren(); const lab = document.createElement('span'); lab.className = 'lab';
    lab.textContent = list.length ? 'Paste onto a surface:' : note ?? 'Put a bolt or a screw on the board (Part families: screw) and it shows here.'; this.strip.append(lab);
    for (const c of list) { const b = document.createElement('button'); b.className = 'chip'; b.dataset.key = c.key; b.title = c.says; b.innerHTML = `<b>${esc(c.name)}</b>`; if (c.key === this.armedKey) b.classList.add('armed');
      let start: [number, number] | null = null, moved = false;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); start = [e.clientX, e.clientY]; moved = false; this.hooks.begin(c.key, e.clientX, e.clientY); });
      b.addEventListener('pointermove', (e) => { if (!start) return; if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) moved = true; if (moved) this.hooks.move(e.clientX, e.clientY); });
      b.addEventListener('pointerup', (e) => { if (!start) return; start = null; this.armedKey = moved ? '' : c.key; for (const x of this.strip.querySelectorAll('.chip')) x.classList.toggle('armed', (x as HTMLElement).dataset.key === this.armedKey); this.hooks.release(e.clientX, e.clientY, moved); });
      b.addEventListener('pointercancel', () => { start = null; this.disarm(); this.hooks.cancel(); });
      this.strip.append(b); }
  }
  /** The chip armed (tapped, waiting for a tap on the view) let go. */
  disarm(): void { this.armedKey = ''; for (const x of this.strip.querySelectorAll('.chip')) x.classList.remove('armed'); }
  /** The verdict shown: held (no buttons) or pinned (its buttons), in the corner of the view farthest from the point. */
  show(v: Verdict, o: { pinned: boolean; at: [number, number] }): void {
    const c = this.card; c.replaceChildren(); c.style.display = '';
    const head = document.createElement('div'); head.className = `head ${v.fits ? 'ok' : 'no'}`; head.textContent = `${v.fits ? '✓' : '✕'} ${v.head}`; c.append(head);
    if (v.cut.length) { const cut = document.createElement('div'); cut.className = 'cut'; cut.textContent = v.cut.join('; '); c.append(cut); }
    // (on a narrow view (a phone) the checks and the legend fold under one line, so the card leaves the part in sight)
    const narrow = this.host.clientWidth < 600, box: HTMLElement = narrow ? Object.assign(document.createElement('details'), { className: 'more' }) : c;
    if (narrow) { const sm = document.createElement('summary'); sm.textContent = `${v.lines.length} checks and what the colours mean`; box.append(sm); c.append(box); }
    const ul = document.createElement('ul'); for (const l of v.lines) { const li = document.createElement('li'); li.textContent = `${l.mark} ${l.text}`; ul.append(li); } box.append(ul);
    const lg = document.createElement('div'); lg.className = 'legend'; for (const l of v.legend) { const s = document.createElement('span'); s.innerHTML = `<i class="sw" style="background:${l.colour}"></i>${esc(l.text)}`; lg.append(s); } box.append(lg);
    if (v.note) { const n = document.createElement('div'); n.className = 'note bad'; n.textContent = v.note; c.append(n); }
    const busy = document.createElement('div'); busy.className = 'busy'; busy.style.display = 'none'; busy.textContent = 'working…'; c.append(busy);
    if (o.pinned) { const bs = document.createElement('div'); bs.className = 'btns';
      const go = document.createElement('button'); go.className = 'go'; go.dataset.act = 'accept'; go.textContent = 'Cut it (Enter)'; go.disabled = !v.fits; go.title = v.fits ? 'cut it: one node on the board' : 'it does not fit: nothing can be cut here'; go.onclick = () => this.hooks.accept();
      const no = document.createElement('button'); no.dataset.act = 'cancel'; no.textContent = 'Cancel (Esc)'; no.onclick = () => this.hooks.cancel(); bs.append(go, no); c.append(bs); }
    this.place(o.at);
  }
  /** "working…" while the run for the point now held is out. */
  busy(on: boolean): void { const b = this.card.querySelector('.busy') as HTMLElement | null; if (b) b.style.display = on ? '' : 'none'; else if (on) { this.card.style.display = ''; this.card.replaceChildren(Object.assign(document.createElement('div'), { className: 'busy', textContent: 'working…' })); } }
  /** A line on its own (why nothing can be pasted here, or what an accepted paste found). */
  note(text: string, bad = false): void { this.card.style.display = ''; this.card.replaceChildren(Object.assign(document.createElement('div'), { className: `note${bad ? ' bad' : ''}`, textContent: text })); }
  hide(): void { this.card.style.display = 'none'; this.card.replaceChildren(); this.closeMenu(); }
  /** A face's menu at a point: copy its interface, paste the one copied. */
  menu(at: [number, number], items: { id: 'copy' | 'paste'; label: string; enabled: boolean; why?: string }[]): void {
    const m = this.menuEl; m.replaceChildren(); for (const it of items) { const b = document.createElement('button'); b.dataset.item = it.id; b.textContent = it.label; b.disabled = !it.enabled; b.onclick = () => { this.closeMenu(); this.hooks.menu(it.id); }; m.append(b); if (it.why) { const w = document.createElement('div'); w.className = 'why'; w.textContent = it.why; m.append(w); } }
    const r = this.host.getBoundingClientRect(); m.style.display = ''; m.style.left = `${Math.min(at[0] - r.left, r.width - 260)}px`; m.style.top = `${Math.min(at[1] - r.top, r.height - m.offsetHeight - 8)}px`;
  }
  closeMenu(): void { this.menuEl.style.display = 'none'; }
  /** The card in the corner of the view farthest from the point, so it never covers what it speaks of. */
  private place(at: [number, number]): void {
    const r = this.host.getBoundingClientRect(), x = at[0] - r.left, y = at[1] - r.top, c = this.card.style; c.left = c.right = c.top = c.bottom = '';
    if (x < r.width / 2) c.right = '12px'; else c.left = '12px'; if (y < r.height / 2) c.bottom = '64px'; else c.top = '44px';
  }
}
