// Wrist tablet: the VR menu, drawn to a canvas texture on a plane held in the left hand and operated
// with the right controller's ray. Redrawn only when something changes (or at 5 Hz for live readouts).

import * as THREE from 'three';
import type { App } from '../app/app';
import type { ToolManager } from '../tools/tools';
import { CONNECTOR_KINDS, getConnectorKind } from '../connectors/registry';
import { AUTO_JOIN } from '../connectors/plan';
import { Voice } from '../assistant/voice';
import { issueUrl, reportText } from '../assistant/reports';
import { REPORT_REPO } from '../app/app';
import { drawGlyph, drawMaterial, drawPart, jointGlyph, type Item } from './icons';
import { Hotbar, SLOTS } from './hotbar';
import { catalogEntries, search, type Entry } from './search';
import { PART_KINDS, effectiveParams, getPartKind, massOf } from '../parts/registry';
import { deleteParts, repairPart, setConnectionParam, setConnectionState, setFrozen, setPartMaterial, setPartParam, setSim } from '../doc/commands';
import { DISPLAY, formatForce, formatMass, type NumberParam } from '../schema/params';
import { getMaterial, MATERIALS, MATERIAL_GROUPS, STANDARD_GRAVITY } from '../data/materials';
import { pullOnSteel } from '../engineering/magnets';

/** What the tablet needs from the XR mode: room modes and controls, and what the left stick does. */
export interface XRControls {
  style: 'relax' | 'walk' | 'mixed';
  active: 'relax' | 'walk' | 'mixed';
  passthrough: boolean;
  calibrated: boolean;
  canScan: boolean;
  setStyle(style: 'relax' | 'walk' | 'mixed'): void;
  drive: boolean;
  setDrive(drive: boolean): void;
  recalibrate(): void;
  scan(): void;
}

type Page = 'tools' | 'parts' | 'materials' | 'join' | 'search' | 'selected' | 'world' | 'builds' | 'ego';

interface Widget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  onClick: () => void;
}

const W = 1024;
const H = 840;
/** The hotbar runs along the bottom; pages draw above it. */
const HOT = 104;
const CH = H - HOT;
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
  room: XRControls | null = null;

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
    const live = (this.page === 'selected' || this.page === 'world') && time - this.lastDraw > 200;
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

  private btn(id: string, x: number, y: number, w: number, h: number, label: string, onClick: () => void, opts: { on?: boolean; sub?: string; tone?: 'danger' | 'accent'; small?: boolean } = {}) {
    const g = this.ctx;
    const hover = this.hoverId === id;
    g.fillStyle = opts.on ? 'rgba(255,179,71,0.28)' : hover ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)';
    roundRect(g, x, y, w, h, 12);
    g.fill();
    g.strokeStyle = opts.on ? '#ffb347' : opts.tone === 'danger' ? 'rgba(255,91,77,0.7)' : opts.tone === 'accent' ? '#66b3ff' : 'rgba(255,255,255,0.12)';
    g.lineWidth = opts.on || hover ? 3 : 2;
    g.stroke();
    g.fillStyle = '#e8ecf1';
    g.font = `600 ${opts.small ? 20 : opts.sub ? 24 : 26}px system-ui, sans-serif`;
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

  /** Text in at most `lines` lines of `width` pixels, `size * 1.3` apart from the baseline y down. */
  private wrapped(s: string, x: number, y: number, width: number, size: number, color: string, lines: number) {
    const g = this.ctx;
    g.font = `400 ${size}px system-ui, sans-serif`;
    const out: string[] = [];
    let cur = '';
    for (const word of s.split(/\s+/)) {
      const next = cur ? `${cur} ${word}` : word;
      if (g.measureText(next).width <= width || !cur) { cur = next; continue; }
      out.push(cur);
      cur = word;
    }
    if (cur) out.push(cur);
    if (out.length > lines) {
      let last = out.slice(lines - 1).join(' ');
      while (last && g.measureText(`${last}…`).width > width) last = last.slice(0, -1);
      out.splice(lines - 1, out.length, `${last.trimEnd()}…`);
    }
    out.forEach((l, i) => this.text(l, x, y + i * size * 1.3, size, color));
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
    const rowsVisible = Math.floor((CH - y0 - 20) / (ch + gap));
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
      this.btn('pg-prev', W - 250, CH - 62, 110, 48, '◀', () => { this.scroll = Math.max(0, this.scroll - 1); });
      this.btn('pg-next', W - 130, CH - 62, 110, 48, '▶', () => { this.scroll = Math.min(pages - 1, this.scroll + 1); });
      this.text(`${this.scroll + 1}/${pages}`, W - 270, CH - 30, 22, '#9aa4af', 'right');
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
    const egoNews = this.app.ego?.advice.length ?? 0;
    const tabs: [Page, string, string][] = [
      ['tools', '🛠', 'Tools'], ['parts', '🧱', 'Parts'], ['materials', '🎨', 'Materials'], ['join', '🔩', 'Join'], ['search', '🔍', 'Search'],
      ['selected', '👆', 'Selected'], ['world', '🌍', 'World'], ['builds', '💾', 'Builds'], ['ego', '✦', egoNews ? `Ego • ${egoNews}` : 'Ego'],
    ];
    // the tabs, and at the end, always there: show Ego something
    const tw = (W - 40 - tabs.length * 6) / (tabs.length + 1);
    tabs.forEach(([p, icon, label], i) => this.btn(`tab-${p}`, 20 + i * (tw + 6), 12, tw, 72, icon, () => { this.page = p; this.scroll = 0; }, { on: this.page === p, sub: label }));
    this.btn('show', 20 + tabs.length * (tw + 6), 12, tw, 72, '👁', () => {
      this.app.showArmed = !this.app.showArmed;
      if (this.app.showArmed) this.app.toast('Point at it and pull the trigger: Ego will look', 'info');
      this.app.notify();
    }, { on: this.app.showArmed, tone: 'accent', sub: this.app.showArmed ? 'point…' : 'Show Ego' });
    const y0 = 96;
    const app = this.app;
    switch (this.page) {
      case 'tools': {
        const cols = Math.ceil(this.tools.tools.length / 3), cw = (W - 40 - (cols - 1) * 8) / cols;
        this.grid(this.tools.tools, 20, y0, cols, cw, 112, 8, (t, x, y, i) =>
          this.btn(`tool-${t.id}`, x, y, cw, 112, `${t.icon} ${t.label}`, () => this.tools.setActive(i), { on: this.tools.active === i, sub: `${i + 1}` }));
        this.drawBuildRow(y0 + 3 * 120 + 6);
        {
          const s = app.settings, bw = (W - 40 - 8) / 2, ys = y0 + 3 * 120 + 6 + 72;
          this.btn('gridlock', 20, ys, bw, 52, s.gridLock ? '🔒 Grid lock: on' : '🔓 Grid lock: off', () => { s.gridLock = !s.gridLock; app.notify(); }, { on: s.gridLock, small: true });
          this.btn('smartsnap', 20 + bw + 8, ys, bw, 52, s.smartSnap ? '🧲 Smart snap: on' : 'Smart snap: off', () => { s.smartSnap = !s.smartSnap; app.notify(); }, { on: s.smartSnap, small: true });
        }
        // what the active tool can do besides its trigger action
        const acts = this.tools.actions();
        const aw = (W - 40 - 3 * 8) / 4;
        acts.slice(0, 4).forEach((a, i) => this.btn(`act-${a.id}`, 20 + i * (aw + 8), CH - 142, aw, 64, a.label, () => a.run(), { on: a.on }));
        this.wrapped(this.tools.tool.hint, 24, CH - 50, W - 48, 21, '#9aa4af', 2);
        break;
      }
      case 'parts': {
        const cats = ['All', ...new Set(PART_KINDS.map((k) => k.category))];
        const yg = this.chips('pcat', cats, this.partCat, (c) => { this.partCat = c; this.scroll = 0; }, y0);
        const list = PART_KINDS.filter((k) => this.partCat === 'All' || k.category === this.partCat);
        const sw = (W - 40 - 5 * 8) / 6;
        this.grid(list, 20, yg, 6, sw, 150, 8, (k, x, y) =>
          this.slot(`part-${k.id}`, x, y, sw, 150, { type: 'part', id: k.id }, k.label, () => this.pick({ type: 'part', id: k.id })));
        break;
      }
      case 'materials':
        this.drawMaterials(y0);
        break;
      case 'join': {
        const sw = (W - 40 - 5 * 8) / 6;
        // Best join first: the process that works for the two materials, sized to the stock
        const kinds = [{ id: AUTO_JOIN, label: 'Best join' }, ...CONNECTOR_KINDS];
        this.grid(kinds, 20, y0, 6, sw, 132, 8, (k, x, y) =>
          this.slot(`join-${k.id}`, x, y, sw, 132, { type: 'joint', id: k.id }, k.label, () => this.pick({ type: 'joint', id: k.id })));
        break;
      }
      case 'search':
        this.drawSearch(y0);
        break;
      case 'selected':
        this.drawSelected(y0);
        break;
      case 'world':
        this.drawWorld(y0);
        break;
      case 'builds':
        this.drawBuilds(y0);
        break;
      case 'ego':
        if (this.typing) this.drawForge(y0);
        else if (this.reportsView) this.drawReports(y0);
        else if (this.lifeView) this.drawLife(y0);
        else this.drawEgo(y0);
        break;
    }
    this.drawHotbar();
    this.texture.needsUpdate = true;
  }

  private stepper(id: string, x: number, y: number, def: NumberParam, value: number, set: (v: number) => void) {
    const d = DISPLAY[def.display] ?? DISPLAY['']!;
    this.text(def.label, x, y + 30, 22, '#9aa4af');
    this.text(`${(value * d.scale).toFixed(def.integer ? 0 : d.digits)} ${d.unit}`, x + 470, y + 30, 24, '#e8ecf1', 'right', '600');
    const f = def.integer ? 1 : def.log ? 1.25 : 1.1;
    const next = (dir: number) => {
      let v = def.integer ? value + dir
        : def.linear && def.step ? Math.round(value * d.scale / def.step + dir) * def.step / d.scale
        : dir > 0 ? (value === 0 ? Math.max(def.min, (def.max - def.min) * 0.01) : value * f) : value / f;
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
      const by = CH - 76;
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
    const mass = massOf(kind, effectiveParams(kind, part.params, m), m);
    this.text(part.name, 24, y0 + 36, 34, '#e8ecf1', 'left', '700');
    this.text(`${m.name} · ${formatMass(mass)} · ${formatForce(mass * STANDARD_GRAVITY)}`, 24, y0 + 74, 22, '#9aa4af');
    const nums = kind.params.filter((p): p is NumberParam => p.type === 'number').slice(0, 5);
    nums.forEach((p, i) => this.stepper(`pp-${p.key}`, 24, y0 + 96 + i * 56, p, Number(part.params[p.key]), (v) => setPartParam(app.store, part.id, p.key, v)));
    // the material; for a permanent magnet that is its grade, so this is its power: weaker to the left, stronger right
    const choices = MATERIALS.filter((x) => (kind.materialFilter ? kind.materialFilter(x) : true));
    if (choices.every((x) => x.remanence)) choices.sort((a, b) => a.remanence! - b.remanence!);
    const my = y0 + 96 + nums.length * 56;
    if (choices.length > 1) {
      const at = Math.max(0, choices.findIndex((x) => x.id === m.id));
      const magnet = m.category === 'magnet';
      this.text(magnet ? 'Grade (power)' : 'Material', 24, my + 30, 22, '#9aa4af');
      this.text(m.name, 24 + 470, my + 30, 22, '#e8ecf1', 'right', '600');
      const step = (d: number) => setPartMaterial(app.store, [part.id], choices[(at + d + choices.length) % choices.length]!.id);
      this.btn('mat-', 24 + 490, my, 80, 46, magnet ? '−' : '◀', () => step(-1));
      this.btn('mat+', 24 + 580, my, 80, 46, magnet ? '+' : '▶', () => step(1));
    }
    // what a magnet holds on thick steel, from the same pull model the physics uses
    const mg = kind.magnet?.(part.params);
    if (mg) {
      const on = mg.drive ? app.switchOn : true;
      const Br = (mg.Br ?? m.remanence ?? 0) * (on ? 1 : 0);
      const kg = pullOnSteel(mg, Br) / STANDARD_GRAVITY;
      const say = Br > 0 ? `Holds ≈ ${kg < 10 ? kg.toFixed(1) : kg.toFixed(0)} kg on thick steel` : mg.drive ? 'Switched off: plain steel' : 'Power 0: plain steel';
      this.text(say, 24, my + 56 + 30, 24, Br > 0 ? '#4dd68c' : '#9aa4af', 'left', '600');
      if (mg.drive) this.btn('switch', 24 + 490, my + 56, 170, 46, app.switchOn ? '🧲 On' : '🧲 Off', () => app.toggleSwitch(), { on: app.switchOn });
    }
    const by = CH - 76;
    const damaged = part.damage.broken.length > 0 || part.damage.segments !== null;
    if (damaged) {
      this.text(`Damaged: ${part.damage.broken.length} fracture(s)`, W - 24, y0 + 36, 22, '#ff9b73', 'right');
      this.btn('repair', W - 254, by - 66, 230, 56, 'Repair', () => repairPart(app.store, part.id), { tone: 'accent' });
    }
    // joined parts are one piece: these act on the whole assembly (the one part only where it says so)
    const group = app.component(part.id);
    const joints = Object.values(app.doc.connections).filter((c) => group.includes(c.a.part) && c.state.status !== 'broken').length;
    if (group.length > 1) this.text(`Assembly: ${group.length} parts, ${joints} joint${joints === 1 ? '' : 's'}`, W - 24, y0 + 74, 22, '#8fd3ff', 'right', '600');
    // what you built: the assembly and whatever rests on it
    const built = app.together([part.id]);
    this.btn('tpl-save', 24, by - 66, 230, 56, `📐 Save template (${built.length})`, () => app.saveTemplate(app.together([part.id])), { tone: 'accent' });
    if (group.length > 1) this.btn('del-one', 264, by - 66, 230, 56, 'Delete just this', () => deleteParts(app.store, [part.id]));
    const allFrozen = group.every((id) => app.doc.parts[id]?.frozen);
    this.btn('freeze', 24, by, 230, 56, allFrozen ? 'Unfreeze' : 'Freeze', () => { app.commitLivePoses(); setFrozen(app.store, group, !allFrozen); }, { on: allFrozen });
    this.btn('dup', 264, by, 230, 56, 'Duplicate', () => { app.select([part.id, ...group.filter((x) => x !== part.id)]); app.duplicateSelection(); });
    this.btn('del', W - 254, by, 230, 56, group.length > 1 ? `Delete all ${group.length}` : 'Delete', () => deleteParts(app.store, group), { tone: 'danger' });
  }

  // ---- inventory: slots, chips, the hotbar, search ----------------------------------------------

  readonly hotbar = new Hotbar();
  private partCat = 'All';
  private matGroup = 'All';
  private query = '';
  private catalog: Entry[] | null = null;

  /** An inventory slot: the item's icon, its name under it. `compact` for the hotbar. */
  private slot(id: string, x: number, y: number, w: number, h: number, item: Item, label: string, onClick: () => void, compact = false) {
    const g = this.ctx;
    const hover = this.hoverId === id;
    const on = this.isActive(item);
    g.fillStyle = on ? 'rgba(255,179,71,0.25)' : hover ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.3)';
    roundRect(g, x, y, w, h, 10);
    g.fill();
    g.strokeStyle = on ? '#ffb347' : hover ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.1)';
    g.lineWidth = on || hover ? 3 : 2;
    g.stroke();
    const s = compact ? h - 28 : Math.min(w - 24, h - 48);
    this.icon(item, x + (w - s) / 2, y + (compact ? 2 : 6), s);
    g.fillStyle = on ? '#ffd9a0' : '#e8ecf1';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    if (compact) {
      g.font = '600 15px system-ui, sans-serif';
      g.fillText(fit(g, label, w - 8), x + w / 2, y + h - 8);
    } else {
      g.font = '600 17px system-ui, sans-serif';
      const words = label.split(' ');
      let a = '', b = '';
      for (const wd of words) { if (!b && g.measureText(a ? `${a} ${wd}` : wd).width <= w - 12) a = a ? `${a} ${wd}` : wd; else b = b ? `${b} ${wd}` : wd; }
      g.fillText(fit(g, a, w - 10), x + w / 2, y + h - (b ? 28 : 12));
      if (b) g.fillText(fit(g, b, w - 10), x + w / 2, y + h - 8);
    }
    this.widgets.push({ id, x, y, w, h, onClick });
  }

  private icon(item: Item, x: number, y: number, s: number) {
    const g = this.ctx;
    switch (item.type) {
      case 'part': drawPart(g, item.id, x, y, s, this.app.spawnKind === item.id ? this.app.spawnMaterial ?? undefined : undefined); break;
      case 'material': drawMaterial(g, item.id, x, y, s); break;
      case 'joint': drawGlyph(g, jointGlyph(item.id), x, y, s); break;
      case 'tool': drawGlyph(g, this.tools.tools.find((t) => t.id === item.id)?.icon ?? '🛠', x, y, s); break;
      case 'build': drawGlyph(g, '💾', x, y, s); break;
      case 'template': drawGlyph(g, '📐', x, y, s); break;
      case 'action': drawGlyph(g, this.actions().find((a) => a.id === item.id)?.glyph ?? '⚙️', x, y, s); break;
    }
  }

  private itemLabel(item: Item): string {
    try {
      switch (item.type) {
        case 'part': return getPartKind(item.id).label;
        case 'material': return getMaterial(item.id).name;
        case 'joint': return item.id === AUTO_JOIN ? 'Best join' : getConnectorKind(item.id).label;
        case 'tool': return this.tools.tools.find((t) => t.id === item.id)?.label ?? item.id;
        case 'build': return this.app.library.get(item.id)?.name ?? 'Build';
        case 'template': return this.app.templates.get(item.id)?.name ?? 'Template';
        case 'action': return this.actions().find((a) => a.id === item.id)?.label ?? item.id;
      }
    } catch { /* an item no longer in the catalog */ }
    return item.id;
  }

  private isActive(item: Item): boolean {
    const app = this.app, t = this.tools.tool.id;
    switch (item.type) {
      case 'tool': return t === item.id;
      case 'part': return t === 'place' && !app.spawnTemplate && app.spawnKind === item.id;
      case 'material': return t === 'place' && !app.spawnTemplate && app.spawnMaterial === item.id;
      case 'template': return t === 'place' && app.spawnTemplate === item.id;
      case 'joint': return t === 'join' && app.joinKind === item.id;
      default: return false;
    }
  }

  /** Pick something up, as from an inventory: the tool that uses it becomes active, and it goes in the hotbar. */
  pick(item: Item) {
    const app = this.app;
    switch (item.type) {
      case 'tool': this.tools.byId(item.id); break;
      case 'part': app.spawnKind = item.id; app.spawnTemplate = null; this.tools.byId('place'); break;
      case 'template':
        if (!app.templates.get(item.id)) return;
        app.spawnTemplate = item.id;
        this.tools.byId('place');
        app.toast(`Placing “${app.templates.get(item.id)!.name}”: trigger where it goes`, 'info');
        break;
      case 'material': {
        const m = getMaterial(item.id);
        const kind = getPartKind(app.spawnKind);
        if (kind.materialFilter && !kind.materialFilter(m)) {
          // a part that can be made of it: a block, a plate, else the first that can
          const k = ['block', 'plate'].map((id) => getPartKind(id)).find((x) => !x.materialFilter || x.materialFilter(m)) ?? PART_KINDS.find((x) => !x.materialFilter || x.materialFilter(m))!;
          app.toast(`A ${kind.label.toLowerCase()} can't be ${m.name}: placing a ${k.label.toLowerCase()}`, 'info');
          app.spawnKind = k.id;
        }
        app.spawnMaterial = item.id;
        app.spawnTemplate = null;
        this.tools.byId('place');
        break;
      }
      case 'joint': app.joinKind = item.id; this.tools.byId('join'); break;
      case 'build': app.openBuild(item.id); return;
      case 'action': this.actions().find((a) => a.id === item.id)?.run(); return;
    }
    this.hotbar.use(item);
    app.notify();
  }

  /** Category chips: a row (or two) of labels, one chosen. Returns the y below them. */
  private chips(prefix: string, labels: string[], current: string, set: (l: string) => void, y: number) {
    const g = this.ctx;
    g.font = '600 20px system-ui, sans-serif';
    let x = 20;
    for (const l of labels) {
      const w = Math.min(W - 40, g.measureText(l).width + 36);
      if (x + w > W - 20) { x = 20; y += 50; }
      this.btn(`${prefix}-${l}`, x, y, w, 42, l, () => set(l), { on: current === l, small: true });
      g.font = '600 20px system-ui, sans-serif';
      x += w + 8;
    }
    return y + 54;
  }

  private drawHotbar() {
    const g = this.ctx;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(g, 12, CH + 2, W - 24, HOT - 10, 16);
    g.fill();
    const n = SLOTS, sw = (W - 40 - (n - 1) * 8) / n;
    this.hotbar.items.forEach((it, i) => {
      this.slot(`hot-${i}`, 20 + i * (sw + 8), CH + 10, sw, HOT - 26, it, this.itemLabel(it), () => this.pick(it), true);
      this.text(`${i + 1}`, 28 + i * (sw + 8), CH + 30, 15, '#6f7883');
    });
  }

  private drawMaterials(y0: number) {
    const app = this.app;
    const groups = ['All', ...MATERIAL_GROUPS.map((gr) => gr.label)];
    const yg = this.chips('mgrp', groups, this.matGroup, (l) => { this.matGroup = l; this.scroll = 0; }, y0);
    const ids = this.matGroup === 'All' ? MATERIALS.map((m) => m.id) : MATERIAL_GROUPS.find((gr) => gr.label === this.matGroup)?.ids ?? [];
    const sel = [...app.selection.parts].filter((id) => app.doc.parts[id]);
    const sw = (W - 40 - 5 * 8) / 6;
    this.grid(ids, 20, yg + (sel.length ? 56 : 0), 6, sw, 132, 8, (id, x, y) =>
      this.slot(`mat-${id}`, x, y, sw, 132, { type: 'material', id }, getMaterial(id).name, () => this.pick({ type: 'material', id })));
    if (sel.length && app.spawnMaterial) {
      const m = getMaterial(app.spawnMaterial);
      this.btn('mat-apply', 20, yg, W - 40, 48, `Make the selected part${sel.length > 1 ? 's' : ''} ${m.name}`, () => {
        const ok = sel.filter((id) => { const k = getPartKind(app.doc.parts[id]!.kind); return !k.materialFilter || k.materialFilter(m); });
        if (ok.length) setPartMaterial(app.store, ok, m.id);
        if (ok.length < sel.length) app.toast(`${sel.length - ok.length} of them can't be ${m.name}`, 'warn');
      }, { tone: 'accent' });
    }
  }

  /** Everything the search finds: the catalog, your tools, your builds, and world actions. */
  private entries(): Entry[] {
    this.catalog ??= catalogEntries();
    const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    return [
      ...this.catalog,
      ...this.tools.tools.map((t) => ({ item: { type: 'tool' as const, id: t.id }, label: t.label, sub: 'Tool', words: [...words(t.label), ...words(t.hint), 'tool'] })),
      ...this.app.library.list().map((b) => ({ item: { type: 'build' as const, id: b.id }, label: b.name, sub: 'My build', words: [...words(b.name), 'build', 'saved', 'my'] })),
      ...this.app.templates.list().map((t) => ({ item: { type: 'template' as const, id: t.id }, label: t.name, sub: 'My template', words: [...words(t.name), 'template', 'assembly', 'my', 'prefab'] })),
      ...this.actions().map((a) => ({ item: { type: 'action' as const, id: a.id }, label: a.label, sub: 'Action', words: [...words(a.label), ...a.words] })),
    ];
  }

  private actions(): { id: string; label: string; glyph: string; words: string[]; run: () => void }[] {
    const app = this.app, s = app.settings;
    return [
      { id: 'pause', label: s.paused ? 'Run' : 'Pause', glyph: '⏯️', words: ['pause', 'run', 'time', 'freeze'], run: () => app.togglePause() },
      { id: 'checkpoint', label: 'Checkpoint', glyph: '⚑', words: ['checkpoint', 'save', 'point'], run: () => app.checkpoint() },
      { id: 'rewind', label: 'Rewind', glyph: '⏪', words: ['rewind', 'back', 'restore'], run: () => app.rewind() },
      { id: 'undo', label: 'Undo', glyph: '↶', words: ['undo', 'back'], run: () => app.undo() },
      { id: 'redo', label: 'Redo', glyph: '↷', words: ['redo'], run: () => app.redo() },
      { id: 'build-mode', label: 'Build mode', glyph: '🏗️', words: ['build', 'mode', 'hold', 'snap', 'still'], run: () => app.enterBuild() },
      { id: 'play', label: 'Play', glyph: '▶️', words: ['play', 'start', 'simulate', 'go'], run: () => app.play() },
      { id: 'save-build', label: 'Save build', glyph: '💾', words: ['save', 'build', 'keep'], run: () => app.saveBuild() },
      { id: 'new-build', label: 'New build', glyph: '🆕', words: ['new', 'empty', 'clear', 'start'], run: () => app.newBuild() },
      { id: 'switch', label: app.switchOn ? 'Switch off' : 'Switch on', glyph: '🧲', words: ['switch', 'magnet', 'electromagnet', 'aux', 'power'], run: () => app.toggleSwitch() },
      { id: 'zero-g', label: 'Zero gravity', glyph: '🪐', words: ['zero', 'gravity', 'space', 'float'], run: () => setSim(app.store, { gravity: [0, 0, 0] }) },
      { id: 'moon', label: 'Moon gravity', glyph: '🌙', words: ['moon', 'gravity', 'low'], run: () => setSim(app.store, { gravity: [0, -1.62, 0] }) },
      { id: 'earth', label: 'Earth gravity', glyph: '🌍', words: ['earth', 'gravity', 'normal'], run: () => setSim(app.store, { gravity: [0, -STANDARD_GRAVITY, 0] }) },
      { id: 'shrink', label: 'Shrink me', glyph: '🐭', words: ['shrink', 'small', 'tiny', 'scale', 'mouse'], run: () => { s.playerScale = Math.max(0.05, s.playerScale / 2); app.notify(); } },
      { id: 'grow', label: 'Grow me', glyph: '🦖', words: ['grow', 'big', 'giant', 'scale', 'godzilla'], run: () => { s.playerScale = Math.min(20, s.playerScale * 2); app.notify(); } },
      { id: 'stress', label: 'Stress view', glyph: '📈', words: ['stress', 'load', 'strain', 'view'], run: () => { app.view.setStressOverlay(!app.view.stressOverlay); app.notify(); } },
    ];
  }

  /** Search: type, and everything that matches shows as you go. */
  private drawSearch(y0: number) {
    const g = this.ctx;
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, 20, y0, W - 40, 54, 12);
    g.fill();
    this.text(this.query ? `🔍 ${this.query}▏` : '🔍 Type to search parts, materials, joints, tools, builds…▏', 34, y0 + 36, 24, this.query ? '#e8ecf1' : '#7d8792');
    const found = this.query ? search(this.entries(), this.query, 12) : [];
    const sw = (W - 40 - 5 * 8) / 6;
    if (this.query && !found.length) this.text(`Nothing called “${this.query}”. Try fewer letters.`, 24, y0 + 110, 22, '#9aa4af');
    if (!this.query) this.wrapped('Try: steel, pipe, oak, weld, magnet, glue, zero gravity, save…', 24, y0 + 100, W - 48, 22, '#9aa4af', 2);
    found.forEach((e, i) => this.slot(`found-${i}`, 20 + (i % 6) * (sw + 8), y0 + 64 + Math.floor(i / 6) * 128, sw, 120, e.item, e.label, () => this.pick(e.item)));
    this.keyboard('skey', y0 + 64 + 2 * 128 + 4, () => this.query, (v) => { this.query = v; });
  }

  /** A keyboard: digits, letters and the symbols Forge uses, space, backspace and clear. */
  private keyboard(prefix: string, y: number, get: () => string, set: (v: string) => void, extra?: [string, string, () => void]) {
    const rows = ['1234567890.-', 'qwertyuiop=⌫', 'asdfghjkl()*', 'zxcvbnm{}/+%'];
    const kw = (W - 40 - 11 * 6) / 12, kh = 52;
    rows.forEach((r, j) => [...r].forEach((k, i) => this.btn(`${prefix}-${k}`, 20 + i * (kw + 6), y + j * (kh + 6), kw, kh, k, () => {
      set(k === '⌫' ? get().slice(0, -1) : get() + k);
    })));
    const yl = y + 4 * (kh + 6);
    const sw = (W - 40 - 3 * 6) / 4;
    this.btn(`${prefix}-space`, 20, yl, sw * 2 + 6, kh, 'space', () => set(`${get()} `));
    this.btn(`${prefix}-clear`, 20 + 2 * (sw + 6), yl, sw, kh, 'Clear', () => set(''));
    if (extra) this.btn(extra[0], 20 + 3 * (sw + 6), yl, sw, kh, extra[1], extra[2]);
  }

  /** Ego's page: the command line and keyboard instead of her advice. */
  private typing = false;

  /** Ego: what she sees, what she advises (with fixes you apply in one tap), and what you'll likely want next. */
  /** After you showed her something: what she sees, and what's wrong with it, in a tap or in your words. */
  openShown() {
    this.page = 'ego';
    this.shownView = true;
    this.scroll = 0;
    this.app.notify();
  }

  private shownView = false;

  private drawShown(y0: number) {
    const ego = this.app.ego!, w = ego.shown!;
    const g = this.ctx;
    this.text('👁 What I see', 24, y0 + 30, 26, '#8fd3ff', 'left', '700');
    g.fillStyle = 'rgba(143,211,255,0.10)';
    roundRect(g, 20, y0 + 44, W - 40, 150, 14);
    g.fill();
    this.wrapped(w.said, 36, y0 + 74, W - 72, 21, '#e8ecf1', 6);
    this.text("What's wrong with it?", 24, y0 + 226, 22, '#9aa4af');
    const asks: [string, string][] = [
      ['〰 Shaking', "it's shaking"], ['⤓ Went through', 'it went through the floor'], ['💥 Flew off', 'it flew off'], ['💔 Came apart', 'it came apart'],
      ['🤨 Not realistic', "that wouldn't happen in real life"], ['🐢 Laggy', "it's laggy"], ["💾 Won't save", "it won't save"], ['✓ It\'s fine', ''],
    ];
    const bw = (W - 40 - 3 * 8) / 4;
    asks.forEach(([label, words], i) => this.btn(`shown-${i}`, 20 + (i % 4) * (bw + 8), y0 + 240 + Math.floor(i / 4) * 76, bw, 68, label, () => {
      this.shownView = false;
      if (words) ego.reply(ego.ask(words));
      this.app.notify();
    }, { tone: words ? undefined : 'accent' }));
    const by = CH - 76;
    const half = (W - 40 - 8) / 2;
    if (Voice.canListen) this.btn('shown-talk', 20, by, half, 60, this.listening ? '🎙 Listening…' : '🎙 Tell her in your words', () => { this.shownView = false; this.talk(); }, { on: this.listening, tone: 'accent' });
    this.btn('shown-type', Voice.canListen ? 20 + half + 8 : 20, by, Voice.canListen ? half : W - 40, 60, '⌨ Type it', () => { this.shownView = false; this.typing = true; ego.command = "it's "; this.app.notify(); });
  }

  private drawEgo(y0: number) {
    const ego = this.app.ego;
    if (!ego) return;
    if (this.shownView && ego.shown) return this.drawShown(y0);
    const g = this.ctx;
    // how far she has grown: her level, and how far to the next
    const lv = ego.growth.level, nx = ego.growth.next;
    this.text(`● ${ego.name} · level ${lv.level}`, 24, y0 + 28, 26, '#8fd3ff', 'left', '700');
    const bx = 250, bwid = W - bx - 24;
    g.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(g, bx, y0 + 10, bwid, 18, 9);
    g.fill();
    const frac = nx ? (ego.growth.xp - lv.xp) / (nx.xp - lv.xp) : 1;
    g.fillStyle = '#8fd3ff';
    roundRect(g, bx, y0 + 10, Math.max(18, bwid * Math.min(1, frac)), 18, 9);
    g.fill();
    this.text(nx ? `next: ${nx.ability} at ${nx.xp} xp (${Math.floor(ego.growth.xp)})` : 'fully grown, for now', W - 24, y0 + 50, 17, '#9aa4af', 'right');
    this.text(`${ego.observe()} · ${ego.focus()}`, 24, y0 + 56, 19, '#9aa4af');
    let y = y0 + 70;
    const cards = ego.advice.slice(0, 3);
    if (!cards.length) this.wrapped('All good. When something is close to failing, or breaks, I\'ll say why and how to make it hold. Everything we do together helps me grow.', 24, y + 36, W - 48, 22, '#9aa4af', 2);
    for (const a of cards) {
      g.fillStyle = a.kind === 'break' ? 'rgba(255,91,77,0.12)' : a.kind === 'warn' ? 'rgba(255,193,77,0.12)' : 'rgba(143,211,255,0.10)';
      roundRect(g, 20, y, W - 40, 104, 14);
      g.fill();
      this.wrapped(a.text, 36, y + 26, W - 140, 19, a.kind === 'break' ? '#ffb3aa' : a.kind === 'warn' ? '#ffd98a' : '#e8ecf1', 2);
      this.btn(`adv-x-${a.id}`, W - 84, y + 8, 52, 38, '✕', () => ego.dismiss(a.id));
      const fw = (W - 72 - 8) / 2;
      a.fixes.slice(0, 2).forEach((f, i) => this.btn(`fix-${a.id}-${i}`, 36 + i * (fw + 8), y + 56, fw, 40, f.label, () => f.apply(), { tone: 'accent', small: true }));
      if (!a.fixes.length && a.kind === 'break') this.text('No stronger joint fits here: try bigger parts, or brace it.', 36, y + 84, 18, '#9aa4af');
      y += 112;
    }
    const yn = y0 + 70 + 3 * 112;
    const nw = (W - 40 - 3 * 8) / 4;
    const next = ego.suggestions();
    this.text(ego.growth.has('habits') ? (next.length ? 'Next, from your habits:' : 'Next: I\'m learning your habits.') : 'Habits: I\'ll learn them at level 2.', 24, yn + 20, 19, '#9aa4af');
    next.forEach((n, i) => this.btn(`next-${i}`, 20 + i * (nw + 8), yn + 28, nw, 46, n.label, () => n.run(), { small: true }));
    // the skills she taught herself from what you repeat
    const ys = yn + 84;
    const skills = ego.skills.skills.slice(0, 4);
    this.text(ego.growth.has('skills') ? (skills.length ? 'Skills I learned from you:' : 'Skills: repeat something and I\'ll offer to learn it.') : 'Skills: I\'ll be able to learn them at level 3.', 24, ys + 20, 19, '#9aa4af');
    skills.forEach((sk, i) => this.btn(`skill-${i}`, 20 + i * (nw + 8), ys + 28, nw, 46, `🧠 ${sk.name}`, () => ego.reply(ego.runSkill(sk.id)), { small: true }));
    const by = CH - 76;
    const bw = (W - 40 - 24) / 4;
    this.btn('forge', 20, by, bw, 60, '⌨ Ask Ego', () => { this.typing = true; }, { tone: 'accent', sub: 'or type Forge' });
    if (Voice.canListen) this.btn('talk', 20 + (bw + 8), by, bw, 60, this.listening ? '🎙 Listening…' : '🎙 Talk', () => this.talk(), { on: this.listening, tone: 'accent' });
    else this.btn('voice', 20 + (bw + 8), by, bw, 60, ego.voice.enabled ? '🔊 Voice on' : '🔈 Voice off', () => { ego.voice.enabled = !ego.voice.enabled; }, { on: ego.voice.enabled });
    const unsent = ego.reports.unsent.length;
    this.btn('reports', 20 + 2 * (bw + 8), by, bw, 60, '📨 Reports', () => { this.reportsView = true; }, { sub: unsent ? `${unsent} for Claude` : 'to Claude', tone: unsent ? 'accent' : undefined });
    this.btn('life', 20 + 3 * (bw + 8), by, bw, 60, '📒 Life', () => { this.lifeView = true; }, { sub: 'memory · reminders · money' });
  }

  private listening = false;
  /** Speak to Ego: one request, heard by the browser's own recognition, then done as if typed. */
  private talk() {
    const ego = this.app.ego;
    if (!ego || this.listening) return;
    this.listening = true;
    ego.voice.listen((heard) => {
      this.listening = false;
      if (heard) ego.ask(heard);
      else this.app.toast('Ego didn\'t catch that: try again, or type it', 'warn');
      this.app.notify();
    });
  }

  private reportsView = false;
  private lifeView = false;

  /** What Ego keeps for you: what you told her, what's coming up, and the week's money. All on this headset. */
  private drawLife(y0: number) {
    const life = this.app.ego!.life;
    const money = (x: number) => `$${x.toFixed(x % 1 ? 2 : 0)}`;
    this.text('📒 What I keep for you (only on this headset)', 24, y0 + 28, 24, '#8fd3ff', 'left', '700');
    let y = y0 + 70;
    this.text('Remembered', 24, y, 20, '#9aa4af', 'left', '600');
    const facts = life.facts.slice(-5).reverse();
    if (!facts.length) this.text('Nothing yet: say "remember my locker code is 4471".', 24, y + 30, 19, '#6f7883');
    facts.forEach((f, i) => this.text(`• ${f.said}`, 24, y + 30 + i * 28, 20, '#e8ecf1'));
    y += 30 + Math.max(1, facts.length) * 28 + 16;
    this.text('Coming up', 24, y, 20, '#9aa4af', 'left', '600');
    const next = life.reminders.filter((r) => !r.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
    if (!next.length) this.text('No reminders: say "remind me to stretch in 30 minutes".', 24, y + 30, 19, '#6f7883');
    next.forEach((r, i) => this.text(`⏰ ${new Date(r.due).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}: ${r.what}`, 24, y + 30 + i * 28, 20, '#e8ecf1'));
    y += 30 + Math.max(1, next.length) * 28 + 16;
    const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    const week = life.summary(from);
    this.text(`This week: ${money(week.spent)} out, ${money(week.earned)} in`, 24, y, 20, '#9aa4af', 'left', '600');
    const cats = Object.entries(week.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!cats.length) this.text('Say what you spend: "I spent $12 on lunch".', 24, y + 30, 19, '#6f7883');
    cats.forEach(([c, v], i) => {
      const over = week.over.find((o) => o.category === c);
      this.text(`${c}: ${money(v)}${over ? `  (over budget ${money(over.budget)})` : life.budgets[c] ? `  of ${money(life.budgets[c]!)}` : ''}`, 24 + (i % 2) * 480, y + 30 + Math.floor(i / 2) * 28, 20, over ? '#ffb3aa' : '#e8ecf1');
    });
    const by = CH - 76;
    const bw = (W - 40 - 8) / 2;
    if (Voice.canListen) this.btn('life-talk', 20, by, bw, 60, this.listening ? '🎙 Listening…' : '🎙 Tell her', () => this.talk(), { on: this.listening, tone: 'accent' });
    else this.btn('life-type', 20, by, bw, 60, '⌨ Tell her', () => { this.lifeView = false; this.typing = true; });
    this.btn('life-back', 20 + bw + 8, by, bw, 60, '← Ego', () => { this.lifeView = false; });
  }

  /** What you've told Ego is wrong, and sending it to Claude. */
  private drawReports(y0: number) {
    const ego = this.app.ego;
    if (!ego) return;
    const list = [...ego.reports.reports].reverse();
    this.text(`📨 Reports for Claude · ${ego.reports.unsent.length} not sent`, 24, y0 + 30, 26, '#8fd3ff', 'left', '700');
    this.wrapped('Tell Ego what\'s wrong in your own words ("it\'s shaking", "it fell through the floor"). She fixes what she can and writes the rest up here, with what she saw and the build as it was.', 24, y0 + 64, W - 48, 19, '#9aa4af', 2);
    let y = y0 + 112;
    const g = this.ctx;
    if (!list.length) this.text('No reports yet.', 24, y + 30, 22, '#9aa4af');
    for (const r of list.slice(0, 5)) {
      g.fillStyle = r.sent ? 'rgba(255,255,255,0.05)' : 'rgba(143,211,255,0.10)';
      roundRect(g, 20, y, W - 40, 76, 12);
      g.fill();
      this.text(`${r.sent ? '✓ ' : ''}“${r.words.length > 70 ? `${r.words.slice(0, 69)}…` : r.words}”`, 36, y + 28, 20, '#e8ecf1', 'left', '600');
      this.text(`${r.trouble}${r.fixed ? ` · Ego ${r.fixed}` : ' · for Claude'}`.slice(0, 96), 36, y + 56, 17, '#9aa4af');
      y += 84;
    }
    const by = CH - 76;
    const bw = (W - 40 - 24) / 4;
    this.btn('rep-send', 20, by, bw, 60, '📨 Send to Claude', () => this.sendReports(), { tone: 'accent', sub: 'as a GitHub issue' });
    this.btn('rep-copy', 20 + (bw + 8), by, bw, 60, '📋 Copy', () => this.copyForClaude(), { sub: 'reports + transcript' });
    this.btn('rep-clear', 20 + 2 * (bw + 8), by, bw, 60, 'Clear sent', () => { ego.reports.reports = ego.reports.reports.filter((r) => !r.sent); ego.reports.markSent([]); this.app.notify(); });
    this.btn('rep-back', 20 + 3 * (bw + 8), by, bw, 60, '← Ego', () => { this.reportsView = false; });
  }

  /** Open the reports as a new GitHub issue (Claude reads the repository's issues). */
  private sendReports() {
    const ego = this.app.ego;
    const unsent = ego?.reports.unsent ?? [];
    if (!ego || !unsent.length) { this.app.toast('No reports waiting', 'info'); return; }
    const w = window.open(issueUrl(unsent, REPORT_REPO), '_blank');
    if (w) { ego.reports.markSent(unsent.map((r) => r.id)); this.app.toast('Opened the report as a GitHub issue: press Submit there, and Claude will see it', 'ok'); }
    else this.app.toast('The browser wouldn\'t open it from VR: take the headset view out of VR, and the launch page has a Send button', 'warn');
  }

  private copyForClaude() {
    const text = [reportText(this.app.ego?.reports.unsent ?? []), this.app.ego?.forClaude() ?? ''].join('\n');
    const done = () => this.app.toast('Copied: paste it to Claude to show exactly what you built', 'ok');
    const fail = () => this.app.toast('The browser would not copy here: the share code is on My builds via Save', 'warn');
    try {
      const w = navigator.clipboard?.writeText(text);
      if (w) void w.then(done, fail); else fail();
    } catch { fail(); }
  }

  /** Forge on the tablet: a command line, what it did, and a keyboard. */
  private drawForge(y0: number) {
    const ego = this.app.ego;
    if (!ego) return;
    const g = this.ctx;
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, 20, y0, W - 40 - 170, 56, 12);
    g.fill();
    g.font = '500 24px ui-monospace, monospace';
    let shown = ego.command;
    while (shown && g.measureText(`${shown}▏`).width > W - 250) shown = shown.slice(1);
    this.text(`${shown}▏`, 34, y0 + 36, 24, '#e8ecf1');
    this.btn('forge-run', W - 20 - 160, y0, 160, 56, 'Go ⏎', () => { if (ego.command.trim()) { ego.ask(ego.command); ego.command = ''; } }, { tone: 'accent' });
    ego.output.slice(-5).forEach((l, i) => this.text(l.length > 78 ? `${l.slice(0, 77)}…` : l, 24, y0 + 90 + i * 26, 19, l.startsWith('✗') ? '#ff9b73' : l.startsWith('›') ? '#8fd3ff' : '#c7ccd1'));
    const ex: [string, string][] = [['make it stronger', 'make it stronger'], ['weld these', 'weld these'], ['4 steel blocks', 'place 4 steel blocks'], ['Forge: 4 legs', 'repeat 4 { place lumber size=2x2 length=0.7m at (i*0.4) 0.35 -1 rot z 90 as leg }']];
    const ew = (W - 40 - 24) / 4;
    ex.forEach(([label, code], i) => this.btn(`ex-${i}`, 20 + i * (ew + 8), y0 + 222, ew, 44, label, () => { ego.command = code; }, { small: true }));
    this.keyboard('key', y0 + 276, () => ego.command, (v) => { ego.command = v; }, ['forge-back', '← Ego', () => { this.typing = false; }]);
  }

  /** Delete mode on My builds: a tap deletes instead of opening. */
  private deleting = false;

  /** Your builds, saved on this headset. Nothing here is pre-made. */
  /** My builds or my templates. */
  private shelf: 'Builds' | 'Templates' = 'Builds';

  private drawBuilds(y0: number) {
    const y = this.chips('shelf', ['Builds', 'Templates'], this.shelf, (l) => { this.shelf = l as 'Builds' | 'Templates'; this.deleting = false; this.scroll = 0; }, y0);
    if (this.shelf === 'Templates') this.drawTemplates(y);
    else this.drawMyBuilds(y);
  }

  /** Your templates: assemblies saved to place again. Pick one and the Place tool stamps out copies. */
  private drawTemplates(y0: number) {
    const app = this.app;
    const list = app.templates.list();
    const sel = [...app.selection.parts].filter((id) => app.doc.parts[id]);
    const bw = (W - 40 - 8) / 2;
    const built = sel.length ? app.together(sel) : [];
    this.btn('tpl-save2', 20, y0, bw, 72, '📐 Save what you built as a template', () => app.saveTemplate(app.together(sel)), { tone: sel.length ? 'accent' : undefined, sub: sel.length ? `${built.length} parts: joined, and resting on it` : 'select a part of it first' });
    if (this.deleting && !list.length) this.deleting = false;
    this.btn('tpl-delmode', 20 + bw + 8, y0, bw, 72, this.deleting ? '🗑 Tap to delete' : '🗑 Delete…', () => { this.deleting = !this.deleting; }, { on: this.deleting, tone: this.deleting ? 'danger' : undefined });
    const y1 = y0 + 86;
    if (!list.length) {
      this.wrapped('No templates yet. Join parts into something, select it, then 📐 Save as template: pick it here and the Place tool stamps out copies.', 24, y1 + 40, W - 48, 24, '#9aa4af', 3);
      return;
    }
    const sw = (W - 40 - 5 * 8) / 6;
    this.grid(list, 20, y1, 6, sw, 132, 8, (e, x, y) =>
      this.slot(`tpl-${e.id}`, x, y, sw, 132, { type: 'template', id: e.id }, e.name, () => {
        if (this.deleting) app.deleteTemplate(e.id);
        else this.pick({ type: 'template', id: e.id });
      }));
  }

  private drawMyBuilds(y0: number) {
    const app = this.app;
    const lib = app.library.list();
    const open = app.libraryId ? app.library.get(app.libraryId) : null;
    const bw = (W - 40 - 24) / 4;
    this.btn('save', 20, y0, bw, 84, '💾 Save', () => app.saveBuild(), { tone: 'accent', sub: open ? `over “${open.name}”` : 'as a new build' });
    this.btn('saveas', 20 + (bw + 8), y0, bw, 84, '➕ Save as new', () => app.saveBuild(true), { sub: 'a copy' });
    this.btn('new', 20 + 2 * (bw + 8), y0, bw, 84, '🆕 New build', () => app.newBuild(), { sub: 'empty workshop' });
    if (this.deleting && !lib.length) this.deleting = false;
    this.btn('delmode', 20 + 3 * (bw + 8), y0, bw, 84, this.deleting ? '🗑 Tap to delete' : '🗑 Delete…', () => { this.deleting = !this.deleting; },
      { on: this.deleting, tone: this.deleting ? 'danger' : undefined, sub: this.deleting ? 'tap here to stop' : undefined });
    const y1 = y0 + 100;
    if (!lib.length) {
      this.wrapped('No builds yet. Build something, then 💾 Save: your builds stay on this headset, and only builds you save appear here.', 24, y1 + 40, W - 48, 26, '#9aa4af', 3);
      return;
    }
    const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const cw = (W - 40 - 16) / 3;
    this.grid(lib, 20, y1, 3, cw, 110, 8, (e, x, y) =>
      this.btn(`build-${e.id}`, x, y, cw, 110, e.name, () => {
        if (this.deleting) this.app.deleteBuild(e.id);
        else this.app.openBuild(e.id);
      }, { on: app.libraryId === e.id, tone: this.deleting ? 'danger' : undefined, sub: when(e.saved) }));
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
    this.btn('switch-w', 20 + 3 * (bw + 8), row(4), bw, 76, app.switchOn ? '🧲 Switch: on' : '🧲 Switch: off', () => app.toggleSwitch(), { on: app.switchOn, sub: 'electromagnets, aux' });
    const r = this.room;
    if (r && r.active === 'relax') {
      this.btn('stick', 20 + (bw + 8), row(4), bw * 2 + 8, 76, r.drive ? 'Left stick: Drive' : 'Left stick: Fly', () => r.setDrive(!r.drive), {
        on: r.drive, sub: r.drive ? 'motors and steering (menu hidden)' : 'fly where you look',
      });
    }
    this.drawRoom(row(5) + 10, bw);
    // the energy books: where every joule is, what put it there, and what became heat
    const e = app.live.energy;
    if (e) {
      const J = (x: number) => (Math.abs(x) >= 1000 ? `${(x / 1000).toFixed(2)} kJ` : `${x.toFixed(Math.abs(x) < 10 ? 2 : 1)} J`);
      const heat = e.heat.friction + e.heat.impact + e.heat.plastic + e.heat.air + e.heat.eddy + e.heat.damping + e.heat.electric;
      const work = e.work.hands + e.work.batteries + e.work.magnets + e.work.fluids;
      this.text(`⚡ motion ${J(e.kinetic)} · height ${J(e.potential)} · springs ${J(e.elastic)} · put in ${J(work)} (hands ${J(e.work.hands)}, batteries ${J(e.work.batteries)}, magnets ${J(e.work.magnets)})`, 24, CH - 100, 18, '#c9d2dc');
      this.text(`🔥 heat ${J(heat)} (friction ${J(e.heat.friction)}, impacts ${J(e.heat.impact)}, bending ${J(e.heat.plastic)}, air ${J(e.heat.air)}, eddy ${J(e.heat.eddy)}, electric ${J(e.heat.electric)}) · integrator lost ${J(e.numerical.lost)}, made ${J(e.numerical.gained)}${e.numerical.gainedHeld > 0 ? ` (${J(e.numerical.gainedHeld)} while held)` : ''}`, 24, CH - 76, 18, '#c9d2dc');
    }
    this.drawHealth(CH - 46);
    this.text(`${app.fps.toFixed(0)} fps · physics ${(app.live.stats?.stepMs ?? 0).toFixed(1)} ms · ${app.live.stats?.awake ?? 0}/${app.live.stats?.bodies ?? 0} awake`, 24, CH - 14, 22, '#9aa4af');
    this.text(`v ${__BUILD__}`, W - 24, CH - 14, 18, '#6f7883', 'right');
  }

  /**
   * Build and play (as in Besiege): in the build phase physics holds every part still and a moved part snaps to the
   * grid and to the angle step; Play runs the build for real; Back to build returns to it as it was.
   */
  private drawBuildRow(y: number) {
    const app = this.app, s = app.settings;
    const bw = (W - 40 - 4 * 8) / 5;
    const grids: [number, string][] = [[0, 'off'], [0.001, '1 mm'], [0.005, '5 mm'], [0.01, '1 cm'], [0.05, '5 cm'], [0.1, '10 cm']];
    const angles = [0, 5, 15, 45, 90];
    const next = <T,>(list: T[], cur: T) => list[(Math.max(0, list.indexOf(cur)) + 1) % list.length]!;
    this.btn('build', 20, y, bw, 64, '■ Build', () => app.enterBuild(), { on: s.build });
    this.btn('play', 20 + (bw + 8), y, bw, 64, '▶ Play', () => app.play(), { on: !s.build });
    this.btn('stop', 20 + 2 * (bw + 8), y, bw, 64, '⏮ Back to build', () => app.stop(), { tone: app.canStop ? 'accent' : undefined });
    const g = grids.find(([v]) => Math.abs(v - s.grid) < 1e-9) ?? grids[3]!;
    this.btn('grid', 20 + 3 * (bw + 8), y, bw, 64, `Grid ${g[1]}`, () => { s.grid = next(grids.map(([v]) => v), g[0]); app.notify(); });
    this.btn('angle', 20 + 4 * (bw + 8), y, bw, 64, `Angle ${s.angleSnap ? `${s.angleSnap}°` : 'off'}`, () => { s.angleSnap = next(angles, s.angleSnap); app.notify(); });
  }

  /** The live watchdog's verdict on this session: all clear, or how many problems and the latest one. */
  private drawHealth(y: number) {
    const h = this.app.live.health;
    if (!h.length) { this.text('● Watchdog: all clear', 24, y, 22, '#4dd68c', 'left', '600'); return; }
    const crit = h.filter((a) => a.severity === 'critical').length;
    const last = h[h.length - 1]!;
    const name = last.id ? (this.app.doc.parts[last.id.split('#')[0]!]?.name ?? 'a part') : 'the scene';
    const line = `● Watchdog: ${crit ? `${crit} critical` : ''}${crit && h.length > crit ? ', ' : ''}${h.length > crit ? `${h.length - crit} warning` : ''} · ${last.kind}: ${name} ${last.detail}`;
    this.text(line.length > 92 ? `${line.slice(0, 91)}…` : line, 24, y, 22, crit ? '#ff5b4d' : '#ffc14d', 'left', '600');
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
