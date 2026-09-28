// Wrist tablet: the VR menu, drawn to a canvas texture on a plane held in the left hand and operated
// with the right controller's ray. Redrawn only when something changes (or at 5 Hz for live readouts).

import * as THREE from 'three';
import type { App } from '../app/app';
import type { ToolManager } from '../tools/tools';
import { CONNECTOR_KINDS, getConnectorKind } from '../connectors/registry';
import { PART_KINDS, effectiveParams, getPartKind } from '../parts/registry';
import { deleteParts, repairPart, setConnectionParam, setConnectionState, setFrozen, setPartParam, setSim } from '../doc/commands';
import { DISPLAY, formatForce, formatMass, type NumberParam } from '../schema/params';
import { STANDARD_GRAVITY } from '../data/materials';
import { TEMPLATES } from '../templates/templates';

/** What the tablet needs from the XR mode to offer the room controls. */
export interface RoomControls {
  style: 'relax' | 'walk' | 'mixed';
  active: 'relax' | 'walk' | 'mixed';
  passthrough: boolean;
  calibrated: boolean;
  canScan: boolean;
  setStyle(style: 'relax' | 'walk' | 'mixed'): void;
  recalibrate(): void;
  scan(): void;
}

type Page = 'tools' | 'parts' | 'join' | 'selected' | 'world' | 'builds';

interface Widget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  onClick: () => void;
}

const W = 1024;
const H = 720;
export const TABLET_SIZE = { w: 0.3, h: (0.3 * H) / W };

export class Tablet {
  readonly mesh: THREE.Mesh;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  page: Page = 'tools';
  widgets: Widget[] = [];
  private hoverId: string | null = null;
  private dirty = true;
  private lastDraw = 0;
  private scroll = 0;
  visible = true;
  room: RoomControls | null = null;

  constructor(private app: App, private tools: ToolManager) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLET_SIZE.w, TABLET_SIZE.h),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.mesh.name = 'tablet';
    this.mesh.renderOrder = 5;
    app.subscribe(() => { this.dirty = true; });
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.mesh.visible = v;
  }

  /** Update hover from a ray hit (uv) and redraw if needed. */
  update(time: number, hoverUv: THREE.Vector2 | null) {
    const id = hoverUv ? this.hitId(hoverUv) : null;
    if (id !== this.hoverId) { this.hoverId = id; this.dirty = true; }
    const live = this.page === 'selected' && time - this.lastDraw > 200;
    if ((this.dirty || live) && this.visible) {
      this.draw();
      this.lastDraw = time;
      this.dirty = false;
    }
  }

  click(uv: THREE.Vector2) {
    const id = this.hitId(uv);
    const w = this.widgets.find((x) => x.id === id);
    if (w) {
      w.onClick();
      this.app.audio.ui('click');
      this.app.haptic?.(0.25, 15, 'right');
      this.dirty = true;
      return true;
    }
    return false;
  }

  private hitId(uv: THREE.Vector2) {
    const x = uv.x * W;
    const y = (1 - uv.y) * H;
    for (const w of this.widgets) if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return w.id;
    return null;
  }

  // ---------------------------------------------------------------------------------------------

  private btn(id: string, x: number, y: number, w: number, h: number, label: string, onClick: () => void, opts: { on?: boolean; sub?: string; tone?: 'danger' | 'accent' } = {}) {
    const g = this.ctx;
    const hover = this.hoverId === id;
    g.fillStyle = opts.on ? 'rgba(255,179,71,0.28)' : hover ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)';
    roundRect(g, x, y, w, h, 12);
    g.fill();
    g.strokeStyle = opts.on ? '#ffb347' : opts.tone === 'danger' ? 'rgba(255,91,77,0.7)' : opts.tone === 'accent' ? '#66b3ff' : 'rgba(255,255,255,0.12)';
    g.lineWidth = opts.on || hover ? 3 : 2;
    g.stroke();
    g.fillStyle = '#e8ecf1';
    g.font = `600 ${opts.sub ? 24 : 26}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(fit(g, label, w - 16), x + w / 2, y + h / 2 - (opts.sub ? 11 : 0));
    if (opts.sub) {
      g.font = '19px system-ui, sans-serif';
      g.fillStyle = '#9aa4af';
      g.fillText(fit(g, opts.sub, w - 16), x + w / 2, y + h / 2 + 17);
    }
    this.widgets.push({ id, x, y, w, h, onClick });
  }

  private text(s: string, x: number, y: number, size = 24, color = '#e8ecf1', align: CanvasTextAlign = 'left', weight = '400') {
    const g = this.ctx;
    g.font = `${weight} ${size}px system-ui, sans-serif`;
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    g.fillText(s, x, y);
  }

  private grid<T>(items: T[], x0: number, y0: number, cols: number, cw: number, ch: number, gap: number, each: (it: T, x: number, y: number, i: number) => void) {
    const rowsVisible = Math.floor((H - y0 - 20) / (ch + gap));
    const perPage = rowsVisible * cols;
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    this.scroll = Math.min(this.scroll, pages - 1);
    const start = this.scroll * perPage;
    items.slice(start, start + perPage).forEach((it, i) => {
      const cx = x0 + (i % cols) * (cw + gap);
      const cy = y0 + Math.floor(i / cols) * (ch + gap);
      each(it, cx, cy, start + i);
    });
    if (pages > 1) {
      this.btn('pg-prev', W - 250, H - 62, 110, 48, '◀', () => { this.scroll = Math.max(0, this.scroll - 1); });
      this.btn('pg-next', W - 130, H - 62, 110, 48, '▶', () => { this.scroll = Math.min(pages - 1, this.scroll + 1); });
      this.text(`${this.scroll + 1}/${pages}`, W - 270, H - 30, 22, '#9aa4af', 'right');
    }
  }

  draw() {
    const g = this.ctx;
    this.widgets = [];
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(22,25,30,0.94)';
    roundRect(g, 0, 0, W, H, 28);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 3;
    g.stroke();
    const tabs: [Page, string][] = [['tools', 'Tools'], ['parts', 'Parts'], ['join', 'Join'], ['selected', 'Selected'], ['world', 'World'], ['builds', 'Builds']];
    const tw = (W - 40 - 5 * 8) / 6;
    tabs.forEach(([p, label], i) => this.btn(`tab-${p}`, 20 + i * (tw + 8), 16, tw, 58, label, () => { this.page = p; this.scroll = 0; }, { on: this.page === p }));
    const y0 = 96;
    const app = this.app;
    switch (this.page) {
      case 'tools': {
        this.grid(this.tools.tools, 20, y0, 3, (W - 40 - 16) / 3, 150, 8, (t, x, y, i) =>
          this.btn(`tool-${t.id}`, x, y, (W - 40 - 16) / 3, 150, `${t.icon} ${t.label}`, () => this.tools.setActive(i), { on: this.tools.active === i, sub: `${i + 1}` }));
        this.text(this.tools.tool.hint.split('·')[0]!.trim(), 24, H - 24, 22, '#9aa4af');
        break;
      }
      case 'parts': {
        const cw = (W - 40 - 24) / 4;
        this.grid(PART_KINDS, 20, y0, 4, cw, 92, 8, (k, x, y) =>
          this.btn(`part-${k.id}`, x, y, cw, 92, k.label, () => { app.spawnKind = k.id; this.tools.byId('place'); }, { on: app.spawnKind === k.id && this.tools.tool.id === 'place', sub: k.category }));
        break;
      }
      case 'join': {
        const cw = (W - 40 - 24) / 4;
        this.grid(CONNECTOR_KINDS, 20, y0, 4, cw, 92, 8, (k, x, y) =>
          this.btn(`join-${k.id}`, x, y, cw, 92, k.label, () => { app.joinKind = k.id; this.tools.byId('join'); }, { on: app.joinKind === k.id && this.tools.tool.id === 'join', sub: k.category }));
        break;
      }
      case 'selected':
        this.drawSelected(y0);
        break;
      case 'world':
        this.drawWorld(y0);
        break;
      case 'builds': {
        const cw = (W - 40 - 16) / 3;
        this.grid(TEMPLATES, 20, y0, 3, cw, 120, 8, (t, x, y) =>
          this.btn(`tpl-${t.id}`, x, y, cw, 120, t.name, () => app.loadTemplate(t.id), { sub: 'template' }));
        break;
      }
    }
    this.texture.needsUpdate = true;
  }

  private stepper(id: string, x: number, y: number, def: NumberParam, value: number, set: (v: number) => void) {
    const d = DISPLAY[def.display] ?? DISPLAY['']!;
    this.text(def.label, x, y + 30, 22, '#9aa4af');
    this.text(`${(value * d.scale).toFixed(def.integer ? 0 : d.digits)} ${d.unit}`, x + 470, y + 30, 24, '#e8ecf1', 'right', '600');
    const f = def.integer ? 1 : def.log ? 1.25 : 1.1;
    const next = (dir: number) => {
      let v = def.integer ? value + dir : dir > 0 ? (value === 0 ? Math.max(def.min, (def.max - def.min) * 0.01) : value * f) : value / f;
      if (def.integer) v = Math.round(v);
      set(Math.min(def.max, Math.max(def.min, v)));
    };
    this.btn(`${id}-`, x + 490, y, 80, 46, '−', () => next(-1));
    this.btn(`${id}+`, x + 580, y, 80, 46, '+', () => next(1));
  }

  private drawSelected(y0: number) {
    const app = this.app;
    const sel = app.selection;
    if (sel.conn && app.doc.connections[sel.conn]) {
      const c = app.doc.connections[sel.conn]!;
      const kind = getConnectorKind(c.kind);
      const l = app.live.loads.get(c.id);
      this.text(kind.label, 24, y0 + 36, 34, '#e8ecf1', 'left', '700');
      this.text(c.state.status.toUpperCase(), W - 24, y0 + 36, 24, c.state.status === 'intact' ? '#4dd68c' : '#ff5b4d', 'right', '700');
      const u = l?.u ?? 0;
      const g = this.ctx;
      g.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(g, 24, y0 + 58, W - 48, 22, 11); g.fill();
      g.fillStyle = u > 0.9 ? '#ff5b4d' : u > 0.7 ? '#ffc14d' : '#4dd68c';
      roundRect(g, 24, y0 + 58, Math.max(22, (W - 48) * Math.min(1, u)), 22, 11); g.fill();
      this.text(`${(u * 100).toFixed(0)}% of capacity ${l?.mode ? `(${l.mode})` : ''}   axial ${formatForce(l?.axial ?? 0)} · shear ${formatForce(l?.shear ?? 0)} · bending ${(l?.bending ?? 0).toFixed(1)} N·m`, 24, y0 + 112, 22, '#9aa4af');
      const nums = kind.params.filter((p): p is NumberParam => p.type === 'number').slice(0, 5);
      nums.forEach((p, i) => this.stepper(`cp-${p.key}`, 24, y0 + 136 + i * 56, p, Number(c.params[p.key]), (v) => setConnectionParam(app.store, c.id, p.key, v)));
      const by = H - 76;
      if (c.state.status !== 'intact') this.btn('repair', 24, by, 300, 56, 'Repair', () => setConnectionState(app.store, c.id, { status: 'intact', note: '' }, 'Repair joint'), { tone: 'accent' });
      this.btn('cdel', W - 324, by, 300, 56, 'Delete joint', () => app.deleteSelection(), { tone: 'danger' });
      return;
    }
    const id = [...sel.parts][0];
    const part = id ? app.doc.parts[id] : null;
    if (!part) {
      this.text('Nothing selected', 24, y0 + 40, 30, '#9aa4af');
      this.text('Point at a part and pull the trigger (Grab or Inspect tool) to select it.', 24, y0 + 84, 22, '#9aa4af');
      return;
    }
    const kind = getPartKind(part.kind);
    const m = app.materialOf(part);
    const mass = kind.volume(effectiveParams(kind, part.params, m), m) * m.density;
    this.text(part.name, 24, y0 + 36, 34, '#e8ecf1', 'left', '700');
    this.text(`${m.name} · ${formatMass(mass)} · ${formatForce(mass * STANDARD_GRAVITY)}`, 24, y0 + 74, 22, '#9aa4af');
    const nums = kind.params.filter((p): p is NumberParam => p.type === 'number').slice(0, 5);
    nums.forEach((p, i) => this.stepper(`pp-${p.key}`, 24, y0 + 96 + i * 56, p, Number(part.params[p.key]), (v) => setPartParam(app.store, part.id, p.key, v)));
    const by = H - 76;
    const damaged = part.damage.broken.length > 0 || part.damage.segments !== null;
    if (damaged) {
      this.text(`Damaged: ${part.damage.broken.length} fracture(s)`, W - 24, y0 + 36, 22, '#ff9b73', 'right');
      this.btn('repair', W - 254, by - 66, 230, 56, 'Repair', () => repairPart(app.store, part.id), { tone: 'accent' });
    }
    this.btn('freeze', 24, by, 230, 56, part.frozen ? 'Unfreeze' : 'Freeze', () => { app.commitLivePoses(); setFrozen(app.store, [part.id], !part.frozen); }, { on: part.frozen });
    this.btn('dup', 264, by, 230, 56, 'Duplicate', () => app.duplicateSelection());
    this.btn('del', W - 254, by, 230, 56, 'Delete', () => deleteParts(app.store, [part.id]), { tone: 'danger' });
  }

  private drawWorld(y0: number) {
    const app = this.app;
    const s = app.settings;
    const bw = (W - 40 - 24) / 4;
    const row = (i: number) => y0 + i * 88;
    this.btn('pause', 20, row(0), bw, 76, s.paused ? '▶ Run' : '⏸ Pause', () => app.togglePause(), { on: s.paused });
    this.btn('step', 20 + (bw + 8), row(0), bw, 76, '⏭ Step', () => app.step());
    this.btn('slower', 20 + 2 * (bw + 8), row(0), bw, 76, 'Slower', () => app.setTimeScale(Math.max(0.05, s.timeScale / 2)), { sub: `×${s.timeScale}` });
    this.btn('faster', 20 + 3 * (bw + 8), row(0), bw, 76, 'Faster', () => app.setTimeScale(Math.min(2, s.timeScale * 2)));
    this.btn('ckpt', 20, row(1), bw, 76, '⚑ Checkpoint', () => app.checkpoint());
    this.btn('rewind', 20 + (bw + 8), row(1), bw, 76, '⟲ Rewind', () => app.rewind());
    this.btn('undo', 20 + 2 * (bw + 8), row(1), bw, 76, '↶ Undo', () => app.undo());
    this.btn('redo', 20 + 3 * (bw + 8), row(1), bw, 76, '↷ Redo', () => app.redo());
    this.btn('stress', 20, row(2), bw, 76, 'Stress view', () => { app.view.setStressOverlay(!app.view.stressOverlay); app.notify(); }, { on: app.view.stressOverlay });
    this.btn('grabmode', 20 + (bw + 8), row(2), bw, 76, s.grabMode === 'physical' ? 'Grab: physical' : 'Grab: creative', () => { s.grabMode = s.grabMode === 'physical' ? 'creative' : 'physical'; app.notify(); }, { on: s.grabMode === 'creative' });
    this.btn('frozen', 20 + 2 * (bw + 8), row(2), bw, 76, 'Place frozen', () => { s.placeFrozen = !s.placeFrozen; app.notify(); }, { on: s.placeFrozen });
    this.btn('shadows', 20 + 3 * (bw + 8), row(2), bw, 76, 'Shadows', () => { s.shadows = !s.shadows; app.view.sun.castShadow = s.shadows; app.notify(); }, { on: s.shadows });
    this.btn('small', 20, row(3), bw, 76, 'Shrink me', () => { s.playerScale = Math.max(0.05, s.playerScale / 2); app.notify(); }, { sub: `scale ×${s.playerScale}` });
    this.btn('big', 20 + (bw + 8), row(3), bw, 76, 'Grow me', () => { s.playerScale = Math.min(20, s.playerScale * 2); app.notify(); });
    const g = Math.hypot(...app.doc.sim.gravity);
    const presets: [string, number][] = [['Earth', STANDARD_GRAVITY], ['Moon', 1.62]];
    presets.forEach(([n, v], i) => this.btn(`g-${n}`, 20 + (2 + i) * (bw + 8), row(3), bw, 76, n, () => setSim(app.store, { gravity: [0, -v, 0] }), { on: Math.abs(g - v) < 0.01, sub: `${v} m/s²` }));
    this.btn('zerog', 20, row(4), bw, 76, 'Zero-g', () => setSim(app.store, { gravity: [0, 0, 0] }), { on: g < 1e-3 });
    this.drawRoom(row(5) + 10, bw);
    this.text(`${app.fps.toFixed(0)} fps · physics ${(app.live.stats?.stepMs ?? 0).toFixed(1)} ms · ${app.live.stats?.awake ?? 0}/${app.live.stats?.bodies ?? 0} awake`, 20 + bw + 16, row(4) + 48, 22, '#9aa4af');
  }

  /** Mode row: relax / walk / mixed, and what each needs (calibrate, scan, what the room does). */
  private drawRoom(y: number, bw: number) {
    const r = this.room;
    if (!r) return;
    const app = this.app;
    const sw = (bw * 2 + 8 - 16) / 3;
    const modes: ['relax' | 'walk' | 'mixed', string][] = [['relax', 'Relax'], ['walk', 'Walk'], ['mixed', 'Mixed']];
    modes.forEach(([m, label], i) =>
      this.btn(`mode-${m}`, 20 + i * (sw + 8), y, sw, 76, label, () => r.setStyle(m), {
        on: r.active === m,
        sub: m === 'relax' ? 'fly' : m === 'walk' ? '1:1 room' : r.passthrough ? 'passthrough' : 'needs AR',
      }));
    const x2 = 20 + 2 * (bw + 8);
    if (r.active === 'walk') {
      this.btn('recal', x2, y, bw, 76, 'Recalibrate', () => r.recalibrate(), { sub: r.calibrated ? 'stand + face, then press' : 'waiting…' });
      this.btn('solid', x2 + bw + 8, y, bw, 76, 'Room solid', () => { app.roomSolid = !app.roomSolid; app.applyRoom(); }, { on: app.roomSolid, sub: `${app.room.length} surfaces` });
    } else if (r.active === 'mixed') {
      this.btn('scan', x2, y, bw, 76, 'Scan room', () => r.scan(), { sub: r.canScan ? 'Space Setup' : 'not on this device' });
      this.btn('showscan', x2 + bw + 8, y, bw, 76, 'Show scan', () => { app.showScan = !app.showScan; app.applyRoom(); }, { on: app.showScan, sub: `${app.room.length} surfaces` });
    } else {
      this.text('Walk: your real room, 1:1 in the workshop.', x2, y + 32, 21, '#9aa4af');
      this.text('Mixed: build in your room (passthrough).', x2, y + 62, 21, '#9aa4af');
    }
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function fit(g: CanvasRenderingContext2D, s: string, w: number) {
  if (g.measureText(s).width <= w) return s;
  let t = s;
  while (t.length > 1 && g.measureText(`${t}…`).width > w) t = t.slice(0, -1);
  return `${t}…`;
}
