// Desktop UI overlay. Every panel of parameters is generated from the schemas in the registries.

import type { App, Toast } from '../app/app';
import type { ToolManager } from '../tools/tools';
import { allowedMaterial } from '../tools/tools';
import { CONNECTOR_KINDS, getConnectorKind } from '../connectors/registry';
import { PART_CATEGORIES, PART_KINDS, effectiveParams, getPartKind } from '../parts/registry';
import { MATERIALS, MATERIAL_GROUPS, getMaterial, STANDARD_GRAVITY } from '../data/materials';
import { DISPLAY, formatForce, formatMass, type NumberParam, type ParamDef, type Params, type ParamValue } from '../schema/params';
import { renamePart, repairPart, setConnectionParam, setConnectionState, setFrozen, setPartMaterial, setPartParam, setSim } from '../doc/commands';
import { maxBend, partLayout } from '../app/segments';
import { bondCapacity, isWoodMaterial } from '../engineering/fracture';
import { composePose, length, sub } from '../doc/math';
import type { Connection, Part } from '../doc/types';
import { TEMPLATES } from '../templates/templates';
import { clear, h } from './dom';
import { isTyping } from '../interaction/desktop';

export class UI {
  private palette = document.getElementById('palette')!;
  private inspector = document.getElementById('inspector')!;
  private hotbar = document.getElementById('hotbar')!;
  private status = document.getElementById('status')!;
  private toasts = document.getElementById('toasts')!;
  private modalRoot = document.getElementById('modal-root')!;
  private topbar = document.getElementById('topbar')!;
  private tooltip = document.getElementById('tooltip')!;
  private inspectorKey = '';
  private dragging = false;
  private liveRefs: { el: HTMLElement; get: () => string }[] = [];
  private loadBar: { bar: HTMLElement; text: HTMLElement; id: string } | null = null;
  private search = '';
  onEnterVR: (() => void) | null = null;
  vrSupported = false;

  constructor(private app: App, private tools: ToolManager) {
    this.buildTopbar();
    this.buildPalette();
    this.buildHotbar();
    app.subscribe(() => this.refresh());
    app.onToast((t) => this.showToast(t));
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.inspector.addEventListener('pointerdown', (e) => { if ((e.target as HTMLInputElement).type === 'range') this.dragging = true; });
    window.addEventListener('pointerup', () => { if (this.dragging) { this.dragging = false; this.refresh(); } });
    this.refresh();
  }

  // ---------------------------------------------------------------------------------------------
  // top bar

  private buildTopbar() {
    const app = this.app;
    const btn = (label: string, title: string, onClick: () => void, id?: string) =>
      h('button', { class: 'tb', title, onclick: () => { void app.audio.start(); onClick(); }, id }, label);
    const speed = h('select', { title: 'Time scale', id: 'speed', onchange: (e: Event) => app.setTimeScale(Number((e.target as HTMLSelectElement).value)) },
      ...[0.05, 0.1, 0.25, 0.5, 1, 2].map((s) => h('option', { value: s, selected: s === 1 }, `×${s}`)));
    this.topbar.append(
      h('div', { class: 'brand' }, h('span', { class: 'logo' }, '⚙'), ' Creative Sandbox'),
      h('div', { class: 'group' },
        btn('New', 'Empty workshop', () => app.loadTemplate('blank')),
        btn('Templates', 'Open a ready-made build', () => this.templatesModal()),
        btn('Open', 'Open a .vrsb.json file', () => this.openFile()),
        btn('Save', 'Download this build (Ctrl+S)', () => this.saveFile()),
        btn('Share', 'Copy a share code', () => this.shareModal()),
        btn('Library', 'Builds saved in this browser', () => this.libraryModal()),
      ),
      h('div', { class: 'group' },
        btn('↶', 'Undo (Ctrl+Z)', () => app.undo(), 'undo'),
        btn('↷', 'Redo (Ctrl+Y)', () => app.redo(), 'redo'),
      ),
      h('div', { class: 'group' },
        btn('⏸', 'Pause / run (P)', () => app.togglePause(), 'pause'),
        btn('⏭', 'Step one tick (.)', () => app.step()),
        speed,
        btn('⚑', 'Checkpoint (C)', () => app.checkpoint()),
        btn('⟲', 'Rewind to last checkpoint (Backspace)', () => app.rewind(), 'rewind'),
      ),
      h('div', { class: 'group' },
        btn('Stress', 'Stress overlay (T)', () => { app.view.setStressOverlay(!app.view.stressOverlay); app.notify(); }, 'stress'),
        btn('Grab: physical', 'Physical grab (strength-limited) or creative grab (G)', () => this.toggleGrab(), 'grabmode'),
      ),
      h('div', { class: 'group right' },
        btn('Enter VR', 'Enter VR on Quest (WebXR)', () => this.onEnterVR?.(), 'vr'),
        btn('?', 'Controls and help (H)', () => this.helpModal()),
      ),
    );
  }

  private toggleGrab() {
    this.app.settings.grabMode = this.app.settings.grabMode === 'physical' ? 'creative' : 'physical';
    this.app.toast(this.app.settings.grabMode === 'physical'
      ? `Physical grab: your hands are limited to ${this.app.settings.strength} N, heavy parts feel heavy`
      : 'Creative grab: infinite strength, exact placement');
    this.app.notify();
  }

  // ---------------------------------------------------------------------------------------------
  // palette

  private buildPalette() {
    const app = this.app;
    clear(this.palette);
    const q = this.search.toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const searchBox = h('input', {
      class: 'search', placeholder: 'Search parts & joints…', value: this.search,
      oninput: (e: Event) => { this.search = (e.target as HTMLInputElement).value; this.buildPalette(); (this.palette.querySelector('.search') as HTMLInputElement)?.focus(); },
    });
    this.palette.append(searchBox);
    this.palette.append(h('div', { class: 'section' }, 'Parts'));
    for (const cat of PART_CATEGORIES) {
      const items = PART_KINDS.filter((k) => k.category === cat && (match(k.label) || match(cat)));
      if (!items.length) continue;
      this.palette.append(h('div', { class: 'cat' }, cat));
      const grid = h('div', { class: 'items' });
      for (const k of items) {
        grid.append(h('button', {
          class: `item${app.spawnKind === k.id && this.tools.tool.id === 'place' ? ' on' : ''}`,
          title: `${k.label} (${getMaterial(k.defaultMaterial).name} by default)`,
          onclick: () => { app.spawnKind = k.id; this.tools.byId('place'); this.buildPalette(); },
        }, k.label));
      }
      this.palette.append(grid);
    }
    const kindForMat = getPartKind(app.spawnKind);
    const matSel = h('select', {
      class: 'matsel', title: 'Material for new parts',
      onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; app.spawnMaterial = v === '' ? null : v; },
    }, h('option', { value: '' }, `Default (${getMaterial(kindForMat.defaultMaterial).name})`),
      ...MATERIAL_GROUPS.map((g) => h('optgroup', { label: g.label }, ...g.ids.filter((id) => !kindForMat.materialFilter || kindForMat.materialFilter(getMaterial(id)))
        .map((id) => h('option', { value: id, selected: app.spawnMaterial === id }, getMaterial(id).name)))));
    this.palette.append(h('div', { class: 'row small' }, 'New part material', matSel));
    this.palette.append(h('div', { class: 'section' }, 'Join'));
    for (const cat of ['Joining', 'Joints', 'Energy', 'Powered'] as const) {
      const items = CONNECTOR_KINDS.filter((k) => k.category === cat && (match(k.label) || match(cat)));
      if (!items.length) continue;
      this.palette.append(h('div', { class: 'cat' }, cat));
      const grid = h('div', { class: 'items' });
      for (const k of items) {
        grid.append(h('button', {
          class: `item${app.joinKind === k.id && this.tools.tool.id === 'join' ? ' on' : ''}`,
          title: k.blurb,
          onclick: () => { app.joinKind = k.id; this.tools.byId('join'); this.buildPalette(); },
        }, k.label));
      }
      this.palette.append(grid);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // hotbar and status

  private buildHotbar() {
    clear(this.hotbar);
    const hint = h('div', { class: 'hint' }, this.tools.tool.hint);
    const row = h('div', { class: 'tools' });
    this.tools.tools.forEach((t, i) => {
      row.append(h('button', {
        class: `tool${i === this.tools.active ? ' on' : ''}`, title: `${t.label} (${i + 1})`,
        onclick: () => { this.tools.setActive(i); },
      }, h('span', { class: 'icon' }, t.icon), h('span', { class: 'lbl' }, t.label), h('span', { class: 'key' }, String(i + 1))));
    });
    this.hotbar.append(hint, row);
  }

  private refreshTopbar() {
    const s = this.app.settings;
    const set = (id: string, text?: string, on?: boolean) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (text !== undefined) el.textContent = text;
      if (on !== undefined) el.classList.toggle('on', on);
    };
    set('pause', s.paused ? '▶' : '⏸', s.paused);
    set('stress', undefined, this.app.view.stressOverlay);
    set('grabmode', s.grabMode === 'physical' ? 'Grab: physical' : 'Grab: creative', s.grabMode === 'creative');
    (document.getElementById('undo') as HTMLButtonElement).disabled = !this.app.store.canUndo;
    (document.getElementById('redo') as HTMLButtonElement).disabled = !this.app.store.canRedo;
    const vr = document.getElementById('vr') as HTMLButtonElement;
    vr.disabled = !this.vrSupported;
    vr.title = this.vrSupported ? 'Enter VR (WebXR)' : 'No WebXR headset detected. Open this page in the Meta Quest browser.';
    const speed = document.getElementById('speed') as HTMLSelectElement | null;
    if (speed && document.activeElement !== speed) speed.value = String(s.timeScale);
  }

  private refreshStatus() {
    const st = this.app.live.stats;
    const s = this.app.settings;
    this.status.textContent = [
      `${this.app.fps.toFixed(0)} fps`,
      st ? `physics ${st.stepMs.toFixed(1)} ms` : 'physics starting…',
      st ? `${st.awake}/${st.bodies} awake` : '',
      st && st.substeps > 1 ? `${st.substeps} substeps` : '',
      st && st.magnetPairs ? `${st.magnetPairs} magnet pairs` : '',
      `t ${this.app.simTime.toFixed(1)} s`,
      s.paused ? 'PAUSED' : s.timeScale !== 1 ? `×${s.timeScale}` : '',
      this.app.physics.mode === 'inline' ? 'inline physics' : '',
    ].filter(Boolean).join(' · ');
  }

  private lastTool = -1;

  refresh() {
    if (this.lastTool !== this.tools.active) {
      this.lastTool = this.tools.active;
      this.buildHotbar();
      this.buildPalette();
    }
    this.refreshTopbar();
    this.refreshStatus();
    this.renderInspector();
    this.updateTooltip();
  }

  // ---------------------------------------------------------------------------------------------
  // inspector

  private renderInspector() {
    const app = this.app;
    const sel = app.selection;
    let key: string;
    if (sel.conn) {
      const c = app.doc.connections[sel.conn];
      key = c ? `c:${c.id}:${JSON.stringify(c.params)}:${c.state.status}` : 'none';
    } else if (sel.parts.size === 1) {
      const p = app.doc.parts[[...sel.parts][0]!];
      key = p ? `p:${p.id}:${p.material}:${JSON.stringify(p.params)}:${p.frozen}:${p.name}` : 'none';
    } else if (sel.parts.size > 1) {
      key = `m:${[...sel.parts].join(',')}`;
    } else {
      key = `w:${JSON.stringify(app.doc.sim)}:${JSON.stringify(app.settings)}`;
    }
    // Rebuild whenever the inspected state changes, except mid slider-drag (that would drop the drag);
    // keyboard focus is restored to the same control afterwards so typing flows on.
    if (key !== this.inspectorKey && !this.dragging) {
      const active = document.activeElement as HTMLElement | null;
      const focusKey = active && this.inspector.contains(active) ? active.dataset['key'] : undefined;
      this.inspectorKey = key;
      const scroll = this.inspector.scrollTop;
      clear(this.inspector);
      this.liveRefs = [];
      this.loadBar = null;
      if (sel.conn && app.doc.connections[sel.conn]) this.connectionPanel(app.doc.connections[sel.conn]!);
      else if (sel.parts.size === 1 && app.doc.parts[[...sel.parts][0]!]) this.partPanel(app.doc.parts[[...sel.parts][0]!]!);
      else if (sel.parts.size > 1) this.multiPanel([...sel.parts]);
      else this.worldPanel();
      this.inspector.scrollTop = scroll;
      if (focusKey) (this.inspector.querySelector(`[data-key="${CSS.escape(focusKey)}"]`) as HTMLElement | null)?.focus();
    }
    for (const r of this.liveRefs) r.el.textContent = r.get();
    if (this.loadBar) {
      const l = app.live.loads.get(this.loadBar.id);
      const u = l?.u ?? 0;
      this.loadBar.bar.style.width = `${Math.min(100, u * 100)}%`;
      this.loadBar.bar.style.background = u > 0.9 ? '#ff5b4d' : u > 0.7 ? '#ffc14d' : '#4dd68c';
      this.loadBar.text.textContent = l ? `${(u * 100).toFixed(0)}% of capacity${l.mode ? ` (${l.mode})` : ''}` : 'no load';
    }
  }

  private paramControl(def: ParamDef, value: ParamValue, onChange: (v: ParamValue) => void): HTMLElement {
    if (def.type === 'bool') {
      return h('label', { class: 'prm bool', title: def.help ?? '' },
        h('input', { type: 'checkbox', checked: value === true, onchange: (e: Event) => onChange((e.target as HTMLInputElement).checked) }), def.label);
    }
    if (def.type === 'enum') {
      return h('div', { class: 'prm', title: def.help ?? '' }, h('span', { class: 'plabel' }, def.label),
        h('select', { onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value) },
          ...def.options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label))));
    }
    return this.numberControl(def, Number(value), onChange);
  }

  private numberControl(def: NumberParam, value: number, onChange: (v: number) => void) {
    const d = DISPLAY[def.display] ?? DISPLAY['']!;
    const lo = def.min, hi = def.max;
    const useLog = def.log && lo >= 0;
    const toSlider = (v: number) => useLog ? Math.log10(Math.max(v, loLog(lo, hi)) / loLog(lo, hi)) / Math.log10(hi / loLog(lo, hi)) * 1000 : ((v - lo) / (hi - lo)) * 1000;
    const fromSlider = (s: number) => useLog ? (s <= 0 && lo === 0 ? 0 : loLog(lo, hi) * Math.pow(hi / loLog(lo, hi), s / 1000)) : lo + (s / 1000) * (hi - lo);
    const fmt = (v: number) => def.integer ? String(Math.round(v * d.scale)) : (v * d.scale).toFixed(d.digits);
    const num = h('input', { type: 'number', class: 'num', value: fmt(value), step: def.step ?? (def.integer ? 1 : 'any'), 'data-key': `${def.key}:num` });
    const slider = h('input', { type: 'range', min: 0, max: 1000, step: 1, value: toSlider(value), 'data-key': `${def.key}:range` });
    slider.addEventListener('input', () => {
      let v = fromSlider(Number(slider.value));
      if (def.integer) v = Math.round(v);
      num.value = fmt(v);
      onChange(v);
    });
    num.addEventListener('change', () => {
      const v = Math.min(hi, Math.max(lo, Number(num.value) / d.scale));
      if (!Number.isFinite(v)) return;
      slider.value = String(toSlider(v));
      onChange(def.integer ? Math.round(v) : v);
    });
    return h('div', { class: 'prm', title: def.help ?? '' }, h('span', { class: 'plabel' }, def.label),
      h('div', { class: 'numrow' }, slider, num, h('span', { class: 'unit' }, d.unit)));
  }

  private paramGroups(defs: ParamDef[], values: Params, onChange: (k: string, v: ParamValue) => void) {
    const groups = new Map<string, ParamDef[]>();
    for (const d of defs) {
      const g = d.group ?? 'Settings';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(d);
    }
    const out: HTMLElement[] = [];
    for (const [g, list] of groups) {
      out.push(h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, g), ...list.map((d) => this.paramControl(d, values[d.key] ?? d.default, (v) => onChange(d.key, v)))));
    }
    return out;
  }

  private put(...nodes: (HTMLElement | null)[]) {
    for (const n of nodes) if (n) this.inspector.append(n);
  }

  private live(el: HTMLElement, get: () => string) {
    this.liveRefs.push({ el, get });
    el.textContent = get();
    return el;
  }

  private partPanel(part: Part) {
    const app = this.app;
    const kind = getPartKind(part.kind);
    const mat = app.materialOf(part);
    const params = effectiveParams(kind, part.params, mat);
    const volume = kind.volume(params, mat);
    const mass = volume * mat.density;
    const matSel = h('select', { onchange: (e: Event) => setPartMaterial(app.store, [part.id], (e.target as HTMLSelectElement).value) },
      ...MATERIAL_GROUPS.map((g) => h('optgroup', { label: g.label },
        ...g.ids.filter((id) => !kind.materialFilter || kind.materialFilter(getMaterial(id))).map((id) => h('option', { value: id, selected: id === part.material }, getMaterial(id).name)))));
    const conns = Object.values(app.doc.connections).filter((c) => c.a.part === part.id || c.b?.part === part.id);
    const speed = h('span');
    this.put(
      h('div', { class: 'ptitle' }, h('input', { class: 'name', value: part.name, onchange: (e: Event) => renamePart(app.store, part.id, (e.target as HTMLInputElement).value) }),
        h('span', { class: 'kind' }, kind.label)),
      h('div', { class: 'prm' }, h('span', { class: 'plabel' }, 'Material'), matSel),
      h('div', { class: 'facts' },
        fact('Mass', formatMass(mass), 'volume × density'),
        fact('Weight', formatForce(mass * STANDARD_GRAVITY)),
        fact('Volume', `${(volume * 1e6).toFixed(1)} cm³`),
        fact('Density', `${mat.density} kg/m³`),
        fact('E', `${(mat.E / 1e9).toFixed(1)} GPa`),
        fact('Yield / UTS', `${(mat.yield / 1e6).toFixed(0)} / ${(mat.ultimate / 1e6).toFixed(0)} MPa`),
      ),
      h('div', { class: `source ${mat.confidence}` }, mat.confidence === 'estimated' ? 'ⓘ estimated · ' : '', mat.source),
      ...this.paramGroups(kind.params, part.params, (k, v) => setPartParam(app.store, part.id, k, v)),
      this.damagePanel(part),
      h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, 'State'),
        h('label', { class: 'prm bool' }, h('input', { type: 'checkbox', checked: part.frozen, onchange: (e: Event) => { app.commitLivePoses(); setFrozen(app.store, [part.id], (e.target as HTMLInputElement).checked); } }), 'Frozen (pinned to the world)'),
        h('div', { class: 'facts' }, fact('Speed', '', undefined, this.live(speed, () => {
          const v = app.live.velocity(part.id);
          return v ? `${length(v.linear).toFixed(2)} m/s` : '—';
        })))),
      conns.length ? h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, `Joints (${conns.length})`),
        ...conns.map((c) => h('button', { class: 'link', onclick: () => app.select([], c.id) }, `${getConnectorKind(c.kind).label}${c.state.status !== 'intact' ? ` · ${c.state.status}` : ''}`))) : null,
      h('div', { class: 'actions' },
        h('button', { onclick: () => app.duplicateSelection() }, 'Duplicate'),
        h('button', { onclick: () => app.select(app.component(part.id)) }, 'Select assembly'),
        h('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete')),
    );
  }

  private multiPanel(ids: string[]) {
    const app = this.app;
    let mass = 0;
    for (const id of ids) {
      const p = app.doc.parts[id];
      if (!p) continue;
      const kind = getPartKind(p.kind);
      const m = app.materialOf(p);
      mass += kind.volume(effectiveParams(kind, p.params, m), m) * m.density;
    }
    this.put(
      h('div', { class: 'ptitle' }, h('b', {}, `${ids.length} parts selected`)),
      h('div', { class: 'facts' }, fact('Total mass', formatMass(mass))),
      h('div', { class: 'prm' }, h('span', { class: 'plabel' }, 'Set material'),
        h('select', { onchange: (e: Event) => setPartMaterial(app.store, ids.filter((id) => allowedMaterial(app.doc.parts[id]!.kind, (e.target as HTMLSelectElement).value) === (e.target as HTMLSelectElement).value), (e.target as HTMLSelectElement).value) },
          h('option', { value: '' }, '—'), ...MATERIALS.map((m) => h('option', { value: m.id }, m.name)))),
      h('div', { class: 'actions' },
        h('button', { onclick: () => app.freezeToggle(ids) }, 'Freeze / unfreeze'),
        h('button', { onclick: () => app.duplicateSelection() }, 'Duplicate'),
        h('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete')),
    );
  }

  /** Breakable stock: segments, section strength, live bond utilisation, damage and repair. */
  private damagePanel(part: Part) {
    const app = this.app;
    const layout = partLayout(part);
    const kind = getPartKind(part.kind);
    if (!layout || !kind.bond) return null;
    const cap = bondCapacity(kind.bond(part.params), app.materialOf(part));
    const Nm = (v: number) => (!Number.isFinite(v) ? '∞' : v >= 1000 ? `${(v / 1000).toFixed(2)} kN·m` : `${v.toFixed(v >= 10 ? 0 : 1)} N·m`);
    const bending = cap.ductile
      ? `yields at ${Nm(Math.min(cap.Mp[0], cap.Mp[1]))}–${Nm(Math.max(cap.Mp[0], cap.Mp[1]))} (Mp = Z·Fy), tears after ~${Math.round((cap.thetaF * 180) / Math.PI)}° of hinge rotation`
      : `snaps at ${Nm(Math.min(cap.Me[0], cap.Me[1]))}–${Nm(Math.max(cap.Me[0], cap.Me[1]))} (S × ${isWoodMaterial(app.materialOf(part)) ? 'MOR' : 'Fu'})`;
    const util = h('span');
    const broken = part.damage.broken.length;
    const bent = maxBend(part, layout, (id) => app.livePose(id));
    const damaged = broken > 0 || part.damage.segments !== null || bent > 0.01;
    return h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, 'Strength of the stock'),
      h('div', { class: 'facts' },
        fact('Segments', `${layout.count} × ${(layout.segLen * 1000).toFixed(0)} mm`, 'bonded pieces; a bond yields or breaks at the section capacity'),
        fact('Bending', bending, cap.source),
        fact('Tension', formatForce(cap.tension)),
        fact('Worst bond now', '', undefined, this.live(util, () => {
          const u = app.live.bonds[part.id];
          if (!u?.length) return '—';
          const max = Math.max(0, ...u);
          return `${(max * 100).toFixed(0)}% of capacity`;
        })),
        damaged ? fact('Damage', `${broken ? `${broken} fracture${broken > 1 ? 's' : ''}` : 'no fractures'}${bent > 0.01 ? ` · bent ${Math.round((bent * 180) / Math.PI)}°` : ''}`) : null,
      ),
      damaged ? h('div', { class: 'actions' }, h('button', { onclick: () => { repairPart(app.store, part.id); app.audio.ui('place'); } }, 'Repair (straighten and re-bond)')) : null,
    );
  }

  private connectionPanel(c: Connection) {
    const app = this.app;
    const kind = getConnectorKind(c.kind);
    const pa = app.doc.parts[c.a.part];
    const pb = c.b ? app.doc.parts[c.b.part] : null;
    if (!pa) return;
    const wa = app.endpointWorld(c.a) ?? composePose(pa.pose, c.a.frame);
    const wb = pb && c.b ? app.endpointWorld(c.b) ?? wa : wa;
    const derived = kind.derive({
      params: c.params, matA: app.materialOf(pa), matB: pb ? app.materialOf(pb) : null,
      thicknessA: app.partDims(pa).b, thicknessB: pb ? app.partDims(pb).b : app.partDims(pa).b,
      distance: length(sub(wb.p, wa.p)), cure: app.doc.sim.cureClock <= 0 ? 1e12 : (app.live.cure[c.id] ?? c.state.cure),
    });
    const bar = h('div', { class: 'ubar-fill' });
    const text = h('div', { class: 'utext' });
    this.loadBar = { bar, text, id: c.id };
    const loadFact = (label: string, get: () => string) => fact(label, '', undefined, this.live(h('span'), get));
    const L = () => app.live.loads.get(c.id);
    this.put(
      h('div', { class: 'ptitle' }, h('b', {}, kind.label), h('span', { class: `status ${c.state.status}` }, c.state.status)),
      h('div', { class: 'blurb' }, kind.blurb),
      h('div', { class: 'small' }, `${pa.name} → ${pb ? pb.name : 'world anchor'}`),
      c.state.note ? h('div', { class: 'note' }, c.state.note) : null,
      c.state.status !== 'intact' ? h('button', { class: 'repair', onclick: () => setConnectionState(app.store, c.id, { status: 'intact', note: '' }, 'Repair joint') }, 'Repair (re-make this joint)') : null,
      h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, 'Live load'),
        h('div', { class: 'ubar' }, bar), text,
        h('div', { class: 'facts' },
          loadFact('Axial', () => { const l = L(); return l ? formatForce(l.axial) : '—'; }),
          loadFact('Shear', () => { const l = L(); return l ? formatForce(l.shear) : '—'; }),
          loadFact('Bending', () => { const l = L(); return l ? `${l.bending.toFixed(2)} N·m` : '—'; }),
          loadFact('Torsion', () => { const l = L(); return l ? `${l.torsion.toFixed(2)} N·m` : '—'; }),
          kind.model === 'revolute' ? loadFact('Angle', () => { const l = L(); return l ? `${((l.extent * 180) / Math.PI).toFixed(1)}°` : '—'; }) : null,
          ['spring', 'rope', 'band', 'prismatic'].includes(kind.model) ? loadFact(kind.model === 'prismatic' ? 'Travel' : 'Length', () => { const l = L(); return l ? `${(l.extent * 1000).toFixed(1)} mm` : '—'; }) : null)),
      h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, 'Derived from spec'),
        ...derived.readouts.map((r) => h('div', { class: 'readout', title: r.formula ?? '' }, h('span', {}, r.label), h('b', {}, r.value), r.formula ? h('code', {}, r.formula) : null)),
        h('div', { class: 'facts caps' },
          fact('Tension cap.', capFmt(derived.capacities.tension)), fact('Shear cap.', capFmt(derived.capacities.shear)),
          fact('Bending cap.', capFmt(derived.capacities.bending, 'N·m')), fact('Torsion cap.', capFmt(derived.capacities.torsion, 'N·m')),
          derived.slip ? fact('Slip at', formatForce(derived.slip.shear)) : null),
        ...derived.warnings.map((w) => h('div', { class: 'warn' }, '⚠ ', w)),
        derived.instantFailure ? h('div', { class: 'warn' }, '✖ ', derived.instantFailure) : null),
      ...this.paramGroups(kind.params, c.params, (k, v) => setConnectionParam(app.store, c.id, k, v)),
      h('div', { class: 'actions' }, h('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete joint')),
    );
  }

  private worldPanel() {
    const app = this.app;
    const sim = app.doc.sim;
    const s = app.settings;
    const g = Math.hypot(...sim.gravity);
    const presets: [string, number][] = [['Earth', STANDARD_GRAVITY], ['Moon', 1.62], ['Mars', 3.71], ['Jupiter', 24.79], ['Zero-g', 0]];
    const cureOpts: [string, number][] = [['Instant (creative)', 0], ['Real time', 1], ['×60', 60], ['×3600', 3600]];
    this.put(
      h('div', { class: 'ptitle' }, h('b', {}, 'World'), h('span', { class: 'kind' }, 'nothing selected')),
      h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, 'Physics'),
        h('div', { class: 'prm' }, h('span', { class: 'plabel' }, 'Gravity'),
          h('select', { onchange: (e: Event) => setSim(app.store, { gravity: [0, -Number((e.target as HTMLSelectElement).value), 0] }) },
            ...presets.map(([n, v]) => h('option', { value: v, selected: Math.abs(v - g) < 1e-3 }, `${n} (${v} m/s²)`)))),
        this.numberControl({ type: 'number', key: 'g', label: 'Gravity (custom)', default: STANDARD_GRAVITY, min: 0, max: 50, display: 'm/s²' }, g, (v) => setSim(app.store, { gravity: [0, -v, 0] }, 'gravity')),
        h('label', { class: 'prm bool' }, h('input', { type: 'checkbox', checked: sim.airDrag, onchange: (e: Event) => setSim(app.store, { airDrag: (e.target as HTMLInputElement).checked }) }), 'Air drag (½ρC_dAv²)'),
        this.numberControl({ type: 'number', key: 'rho', label: 'Air density', default: 1.204, min: 0, max: 10, display: 'kg/m³' }, sim.airDensity, (v) => setSim(app.store, { airDensity: v }, 'air')),
        h('label', { class: 'prm bool' }, h('input', { type: 'checkbox', checked: sim.magnetism, onchange: (e: Event) => setSim(app.store, { magnetism: (e.target as HTMLInputElement).checked }) }), 'Magnetism'),
        h('div', { class: 'prm' }, h('span', { class: 'plabel' }, 'Adhesive cure clock'),
          h('select', { onchange: (e: Event) => setSim(app.store, { cureClock: Number((e.target as HTMLSelectElement).value) }) },
            ...cureOpts.map(([n, v]) => h('option', { value: v, selected: v === sim.cureClock }, n)))),
        ...sim.fluids.map((f) => this.numberControl({ type: 'number', key: f.id, label: `${f.name} density`, default: 998.2, min: 500, max: 2000, display: 'kg/m³' }, f.density,
          (v) => setSim(app.store, { fluids: app.doc.sim.fluids.map((x) => (x.id === f.id ? { ...x, density: v } : x)) }, `fluid:${f.id}`)))),
      h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, 'Hands & building'),
        h('div', { class: 'prm' }, h('span', { class: 'plabel' }, 'Grab mode'),
          h('select', { onchange: (e: Event) => { s.grabMode = (e.target as HTMLSelectElement).value as never; app.notify(); } },
            h('option', { value: 'physical', selected: s.grabMode === 'physical' }, 'Physical (strength-limited)'),
            h('option', { value: 'creative', selected: s.grabMode === 'creative' }, 'Creative (infinite strength)'))),
        this.numberControl({ type: 'number', key: 'st', label: 'Hand strength', default: 250, min: 10, max: 5000, display: 'N', log: true }, s.strength, (v) => { s.strength = v; }),
        h('label', { class: 'prm bool' }, h('input', { type: 'checkbox', checked: s.placeFrozen, onchange: (e: Event) => { s.placeFrozen = (e.target as HTMLInputElement).checked; } }), 'Place new parts frozen'),
        this.numberControl({ type: 'number', key: 'grid', label: 'Placement grid', default: 0.01, min: 0, max: 0.5, display: 'mm' }, s.grid, (v) => { s.grid = v; }),
        this.numberControl({ type: 'number', key: 'ang', label: 'Rotate step', default: 15, min: 1, max: 90, display: '', integer: true }, s.angleSnap, (v) => { s.angleSnap = v; }),
        this.numberControl({ type: 'number', key: 'poke', label: 'Poke impulse', default: 6, min: 0.1, max: 500, display: '', log: true }, s.pokeImpulse, (v) => { s.pokeImpulse = v; })),
      h('div', { class: 'pgroup' }, h('div', { class: 'gtitle' }, 'Look & sound'),
        this.numberControl({ type: 'number', key: 'vol', label: 'Volume', default: 0.8, min: 0, max: 1, display: '%' }, s.volume, (v) => { s.volume = v; app.audio.setVolume(v); }),
        h('label', { class: 'prm bool' }, h('input', { type: 'checkbox', checked: s.particles, onchange: (e: Event) => { s.particles = (e.target as HTMLInputElement).checked; } }), 'Particles'),
        h('label', { class: 'prm bool' }, h('input', { type: 'checkbox', checked: s.shadows, onchange: (e: Event) => { s.shadows = (e.target as HTMLInputElement).checked; app.view.sun.castShadow = s.shadows; } }), 'Shadows')),
      h('div', { class: 'tip' }, 'Tip: open Templates for ready-made builds, or pick a part in the palette and click to place it.'),
    );
  }

  // ---------------------------------------------------------------------------------------------
  // tooltip

  private updateTooltip() {
    const hv = this.tools.hover;
    const t = this.tooltip;
    if (!hv || hv.type === 'env' || !hv.id || this.tools.grab.holding) { t.style.display = 'none'; return; }
    const app = this.app;
    if (hv.type === 'part') {
      const p = app.doc.parts[hv.id];
      if (!p) { t.style.display = 'none'; return; }
      const kind = getPartKind(p.kind);
      const m = app.materialOf(p);
      const mass = kind.volume(effectiveParams(kind, p.params, m), m) * m.density;
      t.textContent = `${p.name} · ${m.name} · ${formatMass(mass)}${p.frozen ? ' · frozen' : ''}`;
    } else {
      const c = app.doc.connections[hv.id];
      const l = app.live.loads.get(hv.id);
      if (!c) { t.style.display = 'none'; return; }
      t.textContent = `${getConnectorKind(c.kind).label} · ${l ? `${(l.u * 100).toFixed(0)}% loaded` : ''} · ${c.state.status}`;
    }
    t.style.display = 'block';
  }

  // ---------------------------------------------------------------------------------------------
  // toasts

  private showToast(t: Toast) {
    const el = h('div', { class: `toast ${t.kind}` }, t.text);
    this.toasts.append(el);
    while (this.toasts.children.length > 5) this.toasts.firstElementChild?.remove();
    setTimeout(() => el.classList.add('out'), t.kind === 'break' ? 5200 : 3200);
    setTimeout(() => el.remove(), t.kind === 'break' ? 5800 : 3800);
  }

  // ---------------------------------------------------------------------------------------------
  // modals

  private modal(title: string, ...body: (HTMLElement | null)[]) {
    clear(this.modalRoot);
    const close = () => clear(this.modalRoot);
    const box = h('div', { class: 'modal' }, h('div', { class: 'mhead' }, h('b', {}, title), h('button', { class: 'x', onclick: close }, '✕')), ...body);
    const back = h('div', { class: 'backdrop', onclick: (e: Event) => { if (e.target === back) close(); } }, box);
    this.modalRoot.append(back);
    return close;
  }

  templatesModal() {
    const close = this.modal('Template station',
      h('div', { class: 'cards' }, ...TEMPLATES.map((t) => h('div', { class: 'card' },
        h('b', {}, t.name), h('p', {}, t.blurb), h('ul', {}, ...t.tryThis.map((x) => h('li', {}, x))),
        h('button', { class: 'primary', onclick: () => { this.app.loadTemplate(t.id); close(); } }, 'Open')))));
  }

  private saveFile() {
    const text = this.app.saveText();
    const blob = new Blob([text], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${this.app.doc.meta.name.replace(/[^\w-]+/g, '_') || 'build'}.vrsb.json` });
    document.body.append(a);
    a.click();
    a.remove();
    this.app.toast(`Saved ${(text.length / 1024).toFixed(1)} KB`, 'ok');
    this.app.audio.ui('save');
  }

  private openFile() {
    const input = h('input', { type: 'file', accept: '.json,.vrsb,.vrsb.json,application/json' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      this.app.openText(await f.text(), f.name);
    });
    input.click();
  }

  private shareModal() {
    const code = this.app.shareCode();
    const out = h('textarea', { class: 'code', readonly: true }, code);
    const inp = h('textarea', { class: 'code', placeholder: 'Paste a VRSB1… code here' });
    const url = `${location.origin}${location.pathname}#build=${code}`;
    const close = this.modal('Share build',
      h('p', {}, `This code is the whole build, byte for byte (${code.length} characters). Anyone can paste it to get the exact same parts, joints and materials.`),
      out,
      h('div', { class: 'actions' },
        h('button', { class: 'primary', onclick: () => { void navigator.clipboard?.writeText(code); this.app.toast('Share code copied', 'ok'); } }, 'Copy code'),
        h('button', { onclick: () => { void navigator.clipboard?.writeText(url); this.app.toast('Link copied', 'ok'); } }, 'Copy link')),
      h('p', {}, 'Open a code:'), inp,
      h('div', { class: 'actions' }, h('button', { onclick: () => { if (this.app.openShareCode(inp.value)) close(); } }, 'Open code')));
    out.addEventListener('focus', () => out.select());
  }

  private libraryModal() {
    const load = (): { name: string; time: string; code: string }[] => {
      try { return JSON.parse(localStorage.getItem('vrsb.library') ?? '[]'); } catch { return []; }
    };
    const store = (list: unknown[]) => {
      try { localStorage.setItem('vrsb.library', JSON.stringify(list)); return true; } catch { this.app.toast('Browser storage is full or unavailable', 'warn'); return false; }
    };
    const render = () => {
      const list = load();
      const name = h('input', { value: this.app.doc.meta.name, class: 'name' });
      const close = this.modal('Library (this browser)',
        h('div', { class: 'row' }, name, h('button', { class: 'primary', onclick: () => {
          const l = load();
          this.app.doc.meta.name = name.value || 'Untitled build';
          l.unshift({ name: name.value || 'Untitled build', time: new Date().toLocaleString(), code: this.app.shareCode() });
          if (store(l.slice(0, 50))) { this.app.toast('Saved to library', 'ok'); render(); }
        } }, 'Save current')),
        list.length ? h('div', { class: 'lib' }, ...list.map((b, i) => h('div', { class: 'librow' },
          h('span', {}, h('b', {}, b.name), h('small', {}, ` ${b.time}`)),
          h('button', { onclick: () => { if (this.app.openShareCode(b.code)) close(); } }, 'Open'),
          h('button', { class: 'danger', onclick: () => { const l = load(); l.splice(i, 1); store(l); render(); } }, 'Delete')))) : h('p', {}, 'Nothing saved yet.'));
    };
    render();
  }

  helpModal() {
    const rows: [string, string][] = [
      ['Right-drag', 'Look around'], ['W A S D', 'Fly'], ['E / Space, Q', 'Up, down'], ['Shift', 'Fly faster'],
      ['1 … 9', 'Tools: Grab, Place, Join, Erase, Freeze, Clone, Poke, Inspect, Measure'],
      ['Left click', 'Use the tool'], ['Wheel', 'Push/pull a held part (or dolly)'], ['R / Y (+Shift)', 'Rotate held part or placement'],
      ['G', 'Physical / creative grab'], ['F', 'Freeze / unfreeze selection'], ['Del', 'Delete selection'], ['Ctrl+D', 'Duplicate selection'],
      ['Ctrl+Z / Ctrl+Y', 'Undo / redo (including breaks)'], ['P', 'Pause'], ['.', 'Step one tick'], ['[ ]', 'Slower / faster time'],
      ['C', 'Checkpoint'], ['Backspace', 'Rewind to last checkpoint'], ['T', 'Stress overlay'], ['Arrow keys', 'Drive motors and servos'],
      ['Z / X', 'Aux channel'], ['Ctrl+S', 'Save file'], ['Esc', 'Cancel / deselect'], ['H', 'This help'],
    ];
    this.modal('Controls',
      h('table', { class: 'keys' }, ...rows.map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v)))),
      h('p', { class: 'small' }, 'In VR: trigger uses the tool, grip grabs, left stick flies, right stick turns and rises, A/X duplicate, B/Y toggle the wrist menu.'));
  }

  // ---------------------------------------------------------------------------------------------
  // keyboard

  private onKey(e: KeyboardEvent) {
    if (isTyping(e)) return;
    const app = this.app;
    void app.audio.start();
    if (this.tools.key(e)) { e.preventDefault(); return; }
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) app.redo(); else app.undo(); return; }
    if (ctrl && e.code === 'KeyY') { e.preventDefault(); app.redo(); return; }
    if (ctrl && e.code === 'KeyS') { e.preventDefault(); this.saveFile(); return; }
    if (ctrl && e.code === 'KeyD') { e.preventDefault(); app.duplicateSelection(); return; }
    if (ctrl) return;
    if (/^Digit[1-9]$/.test(e.code)) { this.tools.setActive(Number(e.code.slice(5)) - 1); return; }
    switch (e.code) {
      case 'Delete': app.deleteSelection(); break;
      case 'KeyF': app.freezeToggle([...app.selection.parts]); break;
      case 'KeyP': app.togglePause(); break;
      case 'Period': app.step(); break;
      case 'BracketLeft': app.setTimeScale(stepScale(app.settings.timeScale, -1)); break;
      case 'BracketRight': app.setTimeScale(stepScale(app.settings.timeScale, 1)); break;
      case 'KeyC': app.checkpoint(); break;
      case 'Backspace': e.preventDefault(); app.rewind(); break;
      case 'KeyT': app.view.setStressOverlay(!app.view.stressOverlay); app.notify(); break;
      case 'KeyG': this.toggleGrab(); break;
      case 'KeyH': this.helpModal(); break;
      case 'Escape': this.tools.tool.cancel?.(); app.select([]); clear(this.modalRoot); break;
    }
  }
}

const SCALES = [0.05, 0.1, 0.25, 0.5, 1, 2];
function stepScale(cur: number, dir: number) {
  const i = SCALES.findIndex((s) => s >= cur - 1e-9);
  return SCALES[Math.max(0, Math.min(SCALES.length - 1, (i < 0 ? SCALES.length - 1 : i) + dir))]!;
}

function fact(label: string, value: string, title?: string, el?: HTMLElement) {
  return h('div', { class: 'fact', title: title ?? '' }, h('span', {}, label), el ?? h('b', {}, value));
}

function capFmt(v: number, unit = 'N') {
  if (!Number.isFinite(v)) return '—';
  return unit === 'N' ? formatForce(v) : `${v.toFixed(v >= 100 ? 0 : 2)} ${unit}`;
}

function loLog(lo: number, hi: number) {
  return lo > 0 ? lo : hi / 1e5;
}
