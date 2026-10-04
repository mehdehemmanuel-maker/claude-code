// The wrist tablet: the VR menu, a canvas on a plane above the left controller, tapped with the right controller's
// ray. Every page is a function of the app's state to a tree of nodes (ui.ts); the engine lays it out and keeps the
// hit boxes. The canvas is redrawn only when something changed (and at 5 Hz where it shows live readouts); hovering
// moves a translucent overlay over the widget and never redraws.
//
// Five pages: Ego (her advice, her Mind, your habits and skills, talk or type), Make (one search over everything, and
// the shelves: tools, parts, materials, joints), Selected (the part or joint in hand, its loads, its numbers), World
// (time, gravity, view, the room, the energy books, the watchdog), Builds (yours, and your templates). The build/play
// strip is on every page; the hotbar runs along the bottom.

import * as THREE from 'three';
import type { App } from '../app/app';
import { REPORT_REPO } from '../app/app';
import type { ToolManager } from '../tools/tools';
import { CONNECTOR_KINDS, getConnectorKind } from '../connectors/registry';
import { AUTO_JOIN } from '../connectors/plan';
import { Voice } from '../assistant/voice';
import { issueUrl, reportText } from '../assistant/reports';
import { drawGlyph, drawMaterial, drawPart, jointGlyph, type Item } from './icons';
import { Hotbar, SLOTS } from './hotbar';
import { catalogEntries, search, type Entry } from './search';
import { PART_KINDS, effectiveParams, getPartKind, massOf } from '../parts/registry';
import { deleteParts, repairPart, setConnectionParam, setConnectionState, setFrozen, setPartMaterial, setPartParam, setSim } from '../doc/commands';
import { DISPLAY, formatForce, formatMass, type NumberParam } from '../schema/params';
import { getMaterial, MATERIALS, MATERIAL_GROUPS, STANDARD_GRAVITY } from '../data/materials';
import { pullOnSteel } from '../engineering/magnets';
import { sayBrief } from '../mind';
import { T, bar, box, btn, chips, col, font, grid, render, roundRect, row, slot, text, type Node, type Paint, type Widget } from './ui';

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

export type Page = 'ego' | 'make' | 'selected' | 'world' | 'builds';
type Shelf = 'Tools' | 'Parts' | 'Materials' | 'Joints';

const W = 1024;
const H = 840;
/** The hotbar runs along the bottom; pages draw above it. */
const HOT = 104;
const CH = H - HOT;
/** The page margin. */
const M = 20;
export const TABLET_SIZE = { w: 0.3, h: (0.3 * H) / W };

/** A page: its body, laid out from the top, and a foot pinned above the hotbar. */
interface View { body: Node; foot?: Node }

export class Tablet {
  readonly mesh: THREE.Mesh;
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private hoverMesh: THREE.Mesh;
  page: Page = 'make';
  widgets: Widget[] = [];
  private hoverId: string | null = null;
  private dirty = true;
  private lastDraw = 0;
  /** Each grid's page, by its id. */
  private pages: Record<string, number> = {};
  visible = true;
  room: XRControls | null = null;

  // page state
  private shelf: Shelf = 'Tools';
  private partCat = 'All';
  private matGroup = 'All';
  private query = '';
  private searching = false;
  private typing = false;
  private shownView = false;
  private reportsView = false;
  private lifeView = false;
  private deleting = false;
  private buildShelf: 'Builds' | 'Templates' = 'Builds';
  private listening = false;
  readonly hotbar = new Hotbar();
  private catalog: Entry[] | null = null;

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
    this.hoverMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthTest: false, depthWrite: false, toneMapped: false }));
    this.hoverMesh.renderOrder = 6;
    this.hoverMesh.visible = false;
    this.mesh.add(this.hoverMesh);
    app.subscribe(() => { this.dirty = true; });
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.mesh.visible = v;
  }

  /** Update hover from a ray hit (uv) and redraw if needed. */
  update(time: number, hoverUv: THREE.Vector2 | null) {
    const id = hoverUv ? this.hitId(hoverUv) : null;
    if (id !== this.hoverId) { this.hoverId = id; this.placeHover(); if (id) this.app.haptic?.(0.08, 8, 'right'); }
    const live = (this.page === 'selected' || this.page === 'world' || this.page === 'ego') && time - this.lastDraw > 200;
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

  /** The hover overlay over the hovered widget: a quad on the tablet, moved, never a redraw of the canvas. */
  private placeHover() {
    const w = this.widgets.find((x) => x.id === this.hoverId);
    if (!w) { this.hoverMesh.visible = false; return; }
    this.hoverMesh.position.set(((w.x + w.w / 2) / W - 0.5) * TABLET_SIZE.w, (0.5 - (w.y + w.h / 2) / H) * TABLET_SIZE.h, 0.0005);
    this.hoverMesh.scale.set((w.w / W) * TABLET_SIZE.w, (w.h / H) * TABLET_SIZE.h, 1);
    this.hoverMesh.visible = true;
  }

  /** After you showed her something: what she sees, and what's wrong with it, in a tap or in your words. */
  openShown() {
    this.page = 'ego';
    this.shownView = true;
    this.app.notify();
  }

  // ---- drawing ------------------------------------------------------------------------------------------

  draw() {
    const g = this.ctx;
    this.widgets = [];
    g.clearRect(0, 0, W, H);
    g.fillStyle = T.bg;
    roundRect(g, 0, 0, W, H, 28);
    g.fill();
    g.strokeStyle = T.edge;
    g.lineWidth = 3;
    g.stroke();
    const p: Paint = { g, icon: (gg, item, x, y, s) => this.icon(gg, item, x, y, s) };
    const w = W - 2 * M;
    let y = 12 + render(p, this.header(), M, 12, w, CH, this.widgets) + 8;
    const view = this.view();
    const footH = view.foot ? measureFoot(p, view.foot, w) : 0;
    const bottom = CH - 8 - (view.foot ? footH + 8 : 0);
    g.save();
    g.beginPath();
    g.rect(0, y, W, Math.max(0, bottom - y));
    g.clip();
    render(p, view.body, M, y, w, bottom, this.widgets);
    g.restore();
    if (view.foot) render(p, view.foot, M, CH - 8 - footH, w, CH - 8, this.widgets);
    this.drawHotbar(p);
    this.placeHover();
    this.texture.needsUpdate = true;
  }

  /** The tabs, Show Ego, and the build/play strip: on every page. */
  private header(): Node {
    const app = this.app, s = app.settings;
    const news = app.ego?.advice.length ?? 0;
    const open = app.ego?.mind?.unresolved().length ?? 0;
    const tabs: [Page, string, string][] = [
      ['ego', '✦', news ? `Ego · ${news}` : open ? `Ego · ${open} open` : 'Ego'], ['make', '🧱', 'Make'], ['selected', '👆', 'Selected'], ['world', '🌍', 'World'], ['builds', '💾', 'Builds'],
    ];
    const grids: [number, string][] = [[0, 'off'], [0.001, '1 mm'], [0.005, '5 mm'], [0.01, '1 cm'], [0.05, '5 cm'], [0.1, '10 cm']];
    const angles = [0, 5, 15, 45, 90];
    const next = <X,>(list: X[], cur: X) => list[(Math.max(0, list.indexOf(cur)) + 1) % list.length]!;
    const gr = grids.find(([v]) => Math.abs(v - s.grid) < 1e-9) ?? grids[3]!;
    return col([
      row([
        ...tabs.map(([pg, icon, label]) => btn(`tab-${pg}`, icon, () => { this.page = pg; this.pages = {}; }, { on: this.page === pg, sub: label, tone: pg === 'ego' && news ? 'ego' : undefined })),
        btn('show', '👁', () => {
          app.showArmed = !app.showArmed;
          if (app.showArmed) app.toast('Point at it and pull the trigger: Ego will look', 'info');
          app.notify();
        }, { on: app.showArmed, tone: 'accent', sub: app.showArmed ? 'point…' : 'Show Ego' }),
      ], { h: 68, gap: 6 }),
      row([
        btn('build', '■ Build', () => app.enterBuild(), { on: s.build, small: true }),
        btn('play', '▶ Play', () => app.play(), { on: !s.build, small: true }),
        btn('stop', '⏮ Back to build', () => app.stop(), { tone: app.canStop ? 'accent' : 'quiet', small: true }),
        btn('grid', `Grid ${gr[1]}`, () => { s.grid = next(grids.map(([v]) => v), gr[0]); app.notify(); }, { small: true }),
        btn('angle', `Angle ${s.angleSnap ? `${s.angleSnap}°` : 'off'}`, () => { s.angleSnap = next(angles, s.angleSnap); app.notify(); }, { small: true }),
      ], { h: 44, gap: 6 }),
    ], { gap: 8 });
  }

  private view(): View {
    switch (this.page) {
      case 'ego': return this.egoView();
      case 'make': return this.makeView();
      case 'selected': return this.selectedView();
      case 'world': return this.worldView();
      case 'builds': return this.buildsView();
    }
  }

  // ---- Ego ------------------------------------------------------------------------------------------------

  private egoView(): View {
    const ego = this.app.ego;
    if (!ego) return { body: text('Ego is not awake yet.', { color: T.muted }) };
    if (this.shownView && ego.shown) return this.shownV();
    if (this.reportsView) return this.reportsV();
    if (this.lifeView) return this.lifeV();
    if (this.typing) return this.forgeV();
    const mind = ego.mind;
    const open = mind?.unresolved() ?? [];
    const cur = mind?.current() ?? null;
    const cards = ego.advice.slice(0, 2);
    const next = ego.suggestions().slice(0, 4);
    const skills = ego.skills.skills.slice(0, 4);
    const body = col([
      row([
        text(`● ${ego.name}`, { size: 26, color: T.ego, weight: '700' }),
        text(open.length ? `${open.length} open: ${open.slice(0, 2).join(', ')}${open.length > 2 ? '…' : ''}` : mind ? `${mind.journal.commits.length} commits in my journal, nothing open` : 'opening my journal…', { align: 'right', color: T.muted, size: 17 }),
      ], { h: 30 }),
      text(`${ego.observe()} · ${ego.focus()}`, { size: 19, color: T.muted }),
      ...(cards.length ? cards.map((a) => box([
        row([
          text(a.text, { size: 19, lines: 2, color: a.kind === 'break' ? '#ffb3aa' : a.kind === 'warn' ? '#ffd98a' : T.ink }),
          btn(`adv-x-${a.id}`, '✕', () => ego.dismiss(a.id), { w: 52, h: 38, small: true }),
        ], { h: 50 }),
        ...(a.fixes.length ? [row(a.fixes.slice(0, 2).map((f, i) => btn(`fix-${a.id}-${i}`, f.label, () => f.apply(), { tone: 'accent', small: true })), { h: 40 })]
          : a.kind === 'break' ? [text('No stronger joint fits here: try bigger parts, or brace it.', { size: 18, color: T.muted })] : []),
      ], { fill: a.kind === 'break' ? T.breakFill : a.kind === 'warn' ? T.warnFill : T.egoFill, pad: 12, gap: 6 }))
        : [text('All good. When something is close to failing, or breaks, I\'ll say why and how to make it hold.', { size: 19, color: T.muted, lines: 2 })]),
      box([
        text(cur && mind ? sayBrief(mind.journal.commits, cur, 'My Mind') : 'My Mind: nothing on the stand yet. Ask me to build a table that holds 60 kg and I will test it before you do.', { size: 18, lines: 2 }),
        row([
          btn('mind-working', 'What are you working on?', () => ego.reply(ego.ask('what are you working on')), { small: true }),
          btn('mind-changed', 'What changed?', () => ego.reply(ego.ask('what changed')), { small: true }),
          btn('mind-open', 'What is open?', () => ego.reply(ego.ask('what is open')), { small: true }),
        ], { h: 42 }),
      ], { fill: T.egoFill, pad: 12, gap: 8 }),
      text(next.length ? 'Next, from your habits' : 'Next: I\'m learning your habits.', { size: 18, color: T.muted }),
      ...(next.length ? [row(next.map((n, i) => btn(`next-${i}`, n.label, () => n.run(), { small: true })), { h: 42 })] : []),
      text(skills.length ? 'Skills I learned from you' : 'Skills: repeat something and I\'ll offer to learn it.', { size: 18, color: T.muted }),
      ...(skills.length ? [row(skills.map((sk, i) => btn(`skill-${i}`, `🧠 ${sk.name}`, () => ego.reply(ego.runSkill(sk.id)), { small: true })), { h: 42 })] : []),
    ], { gap: 8 });
    const unsent = ego.reports.unsent.length;
    const foot = row([
      btn('forge', '⌨ Ask Ego', () => { this.typing = true; }, { tone: 'accent', sub: 'or type Forge' }),
      Voice.canListen
        ? btn('talk', this.listening ? '🎙 Listening…' : '🎙 Talk', () => this.talk(), { on: this.listening, tone: 'accent', sub: 'in your words' })
        : btn('voice', ego.voice.enabled ? '🔊 Voice on' : '🔈 Voice off', () => { ego.voice.enabled = !ego.voice.enabled; }, { on: ego.voice.enabled, sub: 'she speaks' }),
      btn('reports', '📨 Reports', () => { this.reportsView = true; }, { sub: unsent ? `${unsent} for Claude` : 'to Claude', tone: unsent ? 'accent' : undefined }),
      btn('life', '📒 Life', () => { this.lifeView = true; }, { sub: 'memory · reminders · money' }),
    ], { h: 64 });
    return { body, foot };
  }

  private shownV(): View {
    const ego = this.app.ego!, w = ego.shown!;
    const asks: [string, string][] = [
      ['〰 Shaking', "it's shaking"], ['⤓ Went through', 'it went through the floor'], ['💥 Flew off', 'it flew off'], ['💔 Came apart', 'it came apart'],
      ['🤨 Not realistic', "that wouldn't happen in real life"], ['🐢 Laggy', "it's laggy"], ["💾 Won't save", "it won't save"], ['✓ It\'s fine', ''],
    ];
    const ask = ([label, words]: [string, string], i: number) => btn(`shown-${i}`, label, () => { this.shownView = false; if (words) ego.reply(ego.ask(words)); this.app.notify(); }, { tone: words ? undefined : 'accent', h: 64 });
    const body = col([
      text('👁 What I see', { size: 26, color: T.ego, weight: '700' }),
      box([text(w.said, { size: 21, lines: 6 })], { fill: T.egoFill }),
      text("What's wrong with it?", { size: 22, color: T.muted }),
      row(asks.slice(0, 4).map(ask), { h: 64 }),
      row(asks.slice(4).map((a, i) => ask(a, i + 4)), { h: 64 }),
    ], { gap: 10 });
    const foot = row([
      ...(Voice.canListen ? [btn('shown-talk', this.listening ? '🎙 Listening…' : '🎙 Tell her in your words', () => { this.shownView = false; this.talk(); }, { on: this.listening, tone: 'accent' })] : []),
      btn('shown-type', '⌨ Type it', () => { this.shownView = false; this.typing = true; ego.command = "it's "; this.app.notify(); }),
    ], { h: 60 });
    return { body, foot };
  }

  private forgeV(): View {
    const ego = this.app.ego!;
    const g = this.ctx;
    font(g, 24, '500', true);
    let shown = ego.command;
    while (shown && g.measureText(`${shown}▏`).width > W - 2 * M - 200) shown = shown.slice(1);
    const ex: [string, string][] = [['make it stronger', 'make it stronger'], ['weld these', 'weld these'], ['4 steel blocks', 'place 4 steel blocks'], ['Forge: 4 legs', 'repeat 4 { place lumber size=2x2 length=0.7m at (i*0.4) 0.35 -1 rot z 90 as leg }']];
    const body = col([
      row([
        box([text(`${shown}▏`, { size: 24, mono: true })], { pad: 12, radius: 12 }),
        btn('forge-run', 'Go ⏎', () => { if (ego.command.trim()) { ego.ask(ego.command); ego.command = ''; } }, { tone: 'accent', w: 160 }),
      ], { h: 56 }),
      ...ego.output.slice(-5).map((l) => text(l, { size: 19, color: l.startsWith('✗') ? T.orange : l.startsWith('›') ? T.ego : '#c7ccd1' })),
      row(ex.map(([label, code], i) => btn(`ex-${i}`, label, () => { ego.command = code; }, { small: true })), { h: 44 }),
    ], { gap: 8 });
    return { body, foot: this.keyboard(() => ego.command, (v) => { ego.command = v; }, ['forge-back', '← Ego', () => { this.typing = false; }]) };
  }

  /** What Ego keeps for you: what you told her, what's coming up, and the week's money. All on this headset. */
  private lifeV(): View {
    const life = this.app.ego!.life;
    const money = (x: number) => `$${x.toFixed(x % 1 ? 2 : 0)}`;
    const facts = life.facts.slice(-4).reverse();
    const next = life.reminders.filter((r) => !r.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
    const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    const week = life.summary(from);
    const cats = Object.entries(week.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const body = col([
      text('📒 What I keep for you (only on this headset)', { size: 24, color: T.ego, weight: '700' }),
      text('Remembered', { size: 20, color: T.muted, weight: '600' }),
      ...(facts.length ? facts.map((f) => text(`• ${f.said}`, { size: 20 })) : [text('Nothing yet: say "remember my locker code is 4471".', { size: 19, color: T.dim })]),
      text('Coming up', { size: 20, color: T.muted, weight: '600' }),
      ...(next.length ? next.map((r) => text(`⏰ ${new Date(r.due).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}: ${r.what}`, { size: 20 })) : [text('No reminders: say "remind me to stretch in 30 minutes".', { size: 19, color: T.dim })]),
      text(`This week: ${money(week.spent)} out, ${money(week.earned)} in`, { size: 20, color: T.muted, weight: '600' }),
      ...(cats.length ? [row([col(cats.filter((_, i) => i % 2 === 0).map(([c, v]) => this.moneyLine(c, v, week.over, life.budgets, money)), { gap: 6 }), col(cats.filter((_, i) => i % 2 === 1).map(([c, v]) => this.moneyLine(c, v, week.over, life.budgets, money)), { gap: 6 })])]
        : [text('Say what you spend: "I spent $12 on lunch".', { size: 19, color: T.dim })]),
    ], { gap: 8 });
    const foot = row([
      Voice.canListen ? btn('life-talk', this.listening ? '🎙 Listening…' : '🎙 Tell her', () => this.talk(), { on: this.listening, tone: 'accent' }) : btn('life-type', '⌨ Tell her', () => { this.lifeView = false; this.typing = true; }),
      btn('life-back', '← Ego', () => { this.lifeView = false; }),
    ], { h: 60 });
    return { body, foot };
  }

  private moneyLine(c: string, v: number, over: { category: string; budget: number }[], budgets: Record<string, number>, money: (x: number) => string): Node {
    const o = over.find((x) => x.category === c);
    return text(`${c}: ${money(v)}${o ? `  (over budget ${money(o.budget)})` : budgets[c] ? `  of ${money(budgets[c]!)}` : ''}`, { size: 20, color: o ? '#ffb3aa' : T.ink });
  }

  /** What you've told Ego is wrong, and sending it to Claude. */
  private reportsV(): View {
    const ego = this.app.ego!;
    const list = [...ego.reports.reports].reverse().slice(0, 4);
    const body = col([
      text(`📨 Reports for Claude · ${ego.reports.unsent.length} not sent`, { size: 26, color: T.ego, weight: '700' }),
      text('Tell Ego what\'s wrong in your own words ("it\'s shaking", "it fell through the floor"). She fixes what she can and writes the rest up here, with what she saw and the build as it was.', { size: 19, color: T.muted, lines: 2 }),
      ...(list.length ? list.map((r) => box([
        text(`${r.sent ? '✓ ' : ''}“${r.words}”`, { size: 20, weight: '600' }),
        text(`${r.trouble}${r.fixed ? ` · Ego ${r.fixed}` : ' · for Claude'}`, { size: 17, color: T.muted }),
      ], { fill: r.sent ? 'rgba(255,255,255,0.05)' : T.egoFill, pad: 10, gap: 4, radius: 12 })) : [text('No reports yet.', { size: 22, color: T.muted })]),
    ], { gap: 8 });
    const foot = row([
      btn('rep-send', '📨 Send to Claude', () => this.sendReports(), { tone: 'accent', sub: 'as a GitHub issue' }),
      btn('rep-copy', '📋 Copy', () => this.copyForClaude(), { sub: 'reports + transcript' }),
      btn('rep-clear', 'Clear sent', () => { ego.reports.reports = ego.reports.reports.filter((r) => !r.sent); ego.reports.markSent([]); this.app.notify(); }, { sub: 'keep the rest' }),
      btn('rep-back', '← Ego', () => { this.reportsView = false; }, { sub: 'back' }),
    ], { h: 64 });
    return { body, foot };
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

  /** A keyboard: digits, letters and the symbols Forge uses, space, backspace and clear. */
  private keyboard(get: () => string, set: (v: string) => void, extra?: [string, string, () => void]): Node {
    const rows = ['1234567890.-', 'qwertyuiop=⌫', 'asdfghjkl()*', 'zxcvbnm{}/+%'];
    return col([
      ...rows.map((r) => row([...r].map((k) => btn(`key-${k}`, k, () => set(k === '⌫' ? get().slice(0, -1) : get() + k), { h: 50 })), { gap: 6, h: 50 })),
      row([
        btn('key-space', 'space', () => set(`${get()} `), { grow: 2, h: 50 }),
        btn('key-clear', 'Clear', () => set(''), { h: 50 }),
        ...(extra ? [btn(extra[0], extra[1], extra[2], { h: 50 })] : []),
      ], { gap: 6, h: 50 }),
    ], { gap: 6 });
  }

  // ---- Make: one search, and the shelves -------------------------------------------------------------------

  private makeView(): View {
    const field = row([
      btn('search', this.query ? `🔍 ${this.query}▏` : '🔍 Search parts, materials, joints, tools, builds, actions…', () => { this.searching = !this.searching; }, { on: this.searching, h: 52, small: true }),
      ...(this.query ? [btn('search-clear', '✕', () => { this.query = ''; }, { w: 64, h: 52 })] : []),
    ], { h: 52 });
    // with the keyboard up there is room for the field and what it finds, not for a shelf as well
    const body = col([field, this.query ? this.results() : this.searching ? text('Type to search: steel, pipe, oak, weld, magnet, glue, zero gravity, save…', { size: 20, color: T.muted, lines: 2 }) : this.shelfV()], { gap: 8 });
    return { body, foot: this.searching ? this.keyboard(() => this.query, (v) => { this.query = v; this.pages = {}; }, ['search-done', 'Done', () => { this.searching = false; }]) : undefined };
  }

  private results(): Node {
    const found = search(this.entries(), this.query, 12);
    if (!found.length) return text(`Nothing called “${this.query}”. Try fewer letters.`, { size: 22, color: T.muted });
    return this.gridOf('found', found.map((e, i) => slot(`found-${i}`, e.item, e.label, () => this.pick(e.item), { on: this.isActive(e.item) })), 6, 120);
  }

  private shelfV(): Node {
    const app = this.app;
    const shelves = chips('make', ['Tools', 'Parts', 'Materials', 'Joints'], this.shelf, (l) => { this.shelf = l as Shelf; this.pages = {}; });
    switch (this.shelf) {
      case 'Tools': {
        const tools = this.tools.tools;
        const acts = this.tools.actions().slice(0, 4);
        const s = app.settings;
        return col([
          shelves,
          this.gridOf('tools', tools.map((t, i) => btn(`tool-${t.id}`, `${t.icon} ${t.label}`, () => this.tools.setActive(i), { on: this.tools.active === i, sub: `${i + 1}` })), Math.ceil(tools.length / 3), 92),
          ...(acts.length ? [row(acts.map((a) => btn(`act-${a.id}`, a.label, () => a.run(), { on: a.on, small: true })), { h: 48 })] : []),
          text(this.tools.tool.hint, { size: 19, color: T.muted, lines: 2 }),
          row([
            btn('gridlock', s.gridLock ? '🔒 Grid lock: on' : '🔓 Grid lock: off', () => { s.gridLock = !s.gridLock; app.notify(); }, { on: s.gridLock, small: true }),
            btn('smartsnap', s.smartSnap ? '🧲 Smart snap: on' : 'Smart snap: off', () => { s.smartSnap = !s.smartSnap; app.notify(); }, { on: s.smartSnap, small: true }),
          ], { h: 48 }),
        ], { gap: 8 });
      }
      case 'Parts': {
        const cats = ['All', ...new Set(PART_KINDS.map((k) => k.category))];
        const list = PART_KINDS.filter((k) => this.partCat === 'All' || k.category === this.partCat);
        return col([
          shelves,
          chips('pcat', cats, this.partCat, (c) => { this.partCat = c; this.pages = {}; }),
          this.gridOf('parts', list.map((k) => slot(`part-${k.id}`, { type: 'part', id: k.id }, k.label, () => this.pick({ type: 'part', id: k.id }), { on: this.isActive({ type: 'part', id: k.id }) })), 6, 150),
        ], { gap: 8 });
      }
      case 'Materials': {
        const groups = ['All', ...MATERIAL_GROUPS.map((gr) => gr.label)];
        const ids = this.matGroup === 'All' ? MATERIALS.map((m) => m.id) : MATERIAL_GROUPS.find((gr) => gr.label === this.matGroup)?.ids ?? [];
        const sel = [...app.selection.parts].filter((id) => app.doc.parts[id]);
        const apply: Node[] = [];
        if (sel.length && app.spawnMaterial) {
          const m = getMaterial(app.spawnMaterial);
          apply.push(btn('mat-apply', `Make the selected part${sel.length > 1 ? 's' : ''} ${m.name}`, () => {
            const ok = sel.filter((id) => { const k = getPartKind(app.doc.parts[id]!.kind); return !k.materialFilter || k.materialFilter(m); });
            if (ok.length) setPartMaterial(app.store, ok, m.id);
            if (ok.length < sel.length) app.toast(`${sel.length - ok.length} of them can't be ${m.name}`, 'warn');
          }, { tone: 'accent', h: 48, small: true }));
        }
        return col([
          shelves,
          chips('mgrp', groups, this.matGroup, (l) => { this.matGroup = l; this.pages = {}; }),
          ...apply,
          this.gridOf('mats', ids.map((id) => slot(`mat-${id}`, { type: 'material', id }, getMaterial(id).name, () => this.pick({ type: 'material', id }), { on: this.isActive({ type: 'material', id }) })), 6, 132),
        ], { gap: 8 });
      }
      case 'Joints': {
        const kinds = [{ id: AUTO_JOIN, label: 'Best join' }, ...CONNECTOR_KINDS];
        return col([
          shelves,
          text('Best join picks the process that works for the two materials and sizes it to the stock.', { size: 19, color: T.muted }),
          this.gridOf('joins', kinds.map((k) => slot(`join-${k.id}`, { type: 'joint', id: k.id }, k.label, () => this.pick({ type: 'joint', id: k.id }), { on: this.isActive({ type: 'joint', id: k.id }) })), 6, 132),
        ], { gap: 8 });
      }
    }
  }

  private gridOf(id: string, items: Node[], cols: number, rowH: number): Node {
    return grid(id, items, { cols, rowH, page: this.pages[id] ?? 0, setPage: (p) => { this.pages[id] = p; } });
  }

  // ---- Selected ------------------------------------------------------------------------------------------

  private stepper(id: string, def: NumberParam, value: number, set: (v: number) => void): Node {
    const d = DISPLAY[def.display] ?? DISPLAY['']!;
    const f = def.integer ? 1 : def.log ? 1.25 : 1.1;
    const next = (dir: number) => {
      let v = def.integer ? value + dir
        : def.linear && def.step ? Math.round(value * d.scale / def.step + dir) * def.step / d.scale
        : dir > 0 ? (value === 0 ? Math.max(def.min, (def.max - def.min) * 0.01) : value * f) : value / f;
      if (def.integer) v = Math.round(v);
      set(Math.min(def.max, Math.max(def.min, v)));
    };
    return row([
      text(def.label, { size: 21, color: T.muted }),
      text(`${(value * d.scale).toFixed(def.integer ? 0 : d.digits)} ${d.unit}`, { size: 23, weight: '600', align: 'right', w: 220 }),
      btn(`${id}-`, '−', () => next(-1), { w: 80, h: 44 }),
      btn(`${id}+`, '+', () => next(1), { w: 80, h: 44 }),
    ], { h: 44 });
  }

  private selectedView(): View {
    const app = this.app;
    const sel = app.selection;
    if (sel.conn && app.doc.connections[sel.conn]) {
      const c = app.doc.connections[sel.conn]!;
      const kind = getConnectorKind(c.kind);
      const l = app.live.loads.get(c.id);
      const u = l?.u ?? 0;
      const nums = kind.params.filter((p): p is NumberParam => p.type === 'number').slice(0, 5);
      const body = col([
        row([text(kind.label, { size: 32, weight: '700' }), text(c.state.status.toUpperCase(), { size: 22, weight: '700', align: 'right', color: c.state.status === 'intact' ? T.green : T.red })], { h: 40 }),
        bar(u, u > 0.9 ? T.red : u > 0.7 ? T.amber : T.green, { h: 24, label: `${(u * 100).toFixed(0)}% of capacity${l?.mode ? ` (${l.mode})` : ''}` }),
        text(`axial ${formatForce(l?.axial ?? 0)} · shear ${formatForce(l?.shear ?? 0)} · bending ${(l?.bending ?? 0).toFixed(1)} N·m`, { size: 20, color: T.muted }),
        ...(c.state.note ? [text(c.state.note, { size: 18, color: T.orange, lines: 2 })] : []),
        ...nums.map((p) => this.stepper(`cp-${p.key}`, p, Number(c.params[p.key]), (v) => setConnectionParam(app.store, c.id, p.key, v))),
      ], { gap: 10 });
      const foot = row([
        ...(c.state.status !== 'intact' ? [btn('repair', 'Repair', () => setConnectionState(app.store, c.id, { status: 'intact', note: '' }, 'Repair joint'), { tone: 'accent' })] : []),
        btn('cdel', 'Delete joint', () => app.deleteSelection(), { tone: 'danger' }),
      ], { h: 56 });
      return { body, foot };
    }
    const id = [...sel.parts][0];
    const part = id ? app.doc.parts[id] : null;
    if (!part) {
      return { body: col([
        text('Nothing selected', { size: 30, color: T.muted }),
        text('Point at a part and pull the trigger (Grab or Inspect tool) to select it. Joined parts select as one piece.', { size: 21, color: T.muted, lines: 2 }),
      ], { gap: 10 }) };
    }
    const kind = getPartKind(part.kind);
    const m = app.materialOf(part);
    const mass = massOf(kind, effectiveParams(kind, part.params, m), m);
    const nums = kind.params.filter((p): p is NumberParam => p.type === 'number').slice(0, 4);
    const group = app.component(part.id);
    const joints = Object.values(app.doc.connections).filter((c) => group.includes(c.a.part) && c.state.status !== 'broken').length;
    const damaged = part.damage.broken.length > 0 || part.damage.segments !== null;
    const built = app.together([part.id]);
    // the Mind's note on this part: outside the rigid model's domain (longer than one tick of sound in its material)
    const note = app.ego?.mind?.journal.commits.find((x) => x.inv === `construct:${part.id}`);
    const dom = note?.data['domain'] as { crossing: number; tick: number; critical: number } | undefined;
    const rows: Node[] = [
      row([text(part.name, { size: 32, weight: '700' }), text(damaged ? `Damaged: ${part.damage.broken.length} fracture(s)` : group.length > 1 ? `Assembly: ${group.length} parts, ${joints} joint${joints === 1 ? '' : 's'}` : '', { size: 21, align: 'right', color: damaged ? T.orange : T.ego, weight: '600' })], { h: 40 }),
      text(`${m.name} · ${formatMass(mass)} · ${formatForce(mass * STANDARD_GRAVITY)}`, { size: 21, color: T.muted }),
      ...(dom ? [text(`Outside the rigid model's domain: sound crosses it in ${(dom.crossing * 1000).toFixed(1)} ms, longer than the ${(dom.tick * 1000).toFixed(1)} ms tick (past ${dom.critical.toFixed(2)} m). What it does under load is the model, not the material.`, { size: 18, color: T.orange, lines: 2 })] : []),
      ...nums.map((p) => this.stepper(`pp-${p.key}`, p, Number(part.params[p.key]), (v) => setPartParam(app.store, part.id, p.key, v))),
    ];
    // the material; for a permanent magnet that is its grade, so this is its power: weaker to the left, stronger right
    const choices = MATERIALS.filter((x) => (kind.materialFilter ? kind.materialFilter(x) : true));
    if (choices.every((x) => x.remanence)) choices.sort((a, b) => a.remanence! - b.remanence!);
    if (choices.length > 1) {
      const at = Math.max(0, choices.findIndex((x) => x.id === m.id));
      const magnet = m.category === 'magnet';
      const step = (d: number) => setPartMaterial(app.store, [part.id], choices[(at + d + choices.length) % choices.length]!.id);
      rows.push(row([
        text(magnet ? 'Grade (power)' : 'Material', { size: 21, color: T.muted }),
        text(m.name, { size: 21, weight: '600', align: 'right', w: 320 }),
        btn('mat-', magnet ? '−' : '◀', () => step(-1), { w: 80, h: 44 }),
        btn('mat+', magnet ? '+' : '▶', () => step(1), { w: 80, h: 44 }),
      ], { h: 44 }));
    }
    // what a magnet holds on thick steel, from the same pull model the physics uses
    const mg = kind.magnet?.(part.params);
    if (mg) {
      const on = mg.drive ? app.switchOn : true;
      const Br = (mg.Br ?? m.remanence ?? 0) * (on ? 1 : 0);
      const kg = pullOnSteel(mg, Br) / STANDARD_GRAVITY;
      const say = Br > 0 ? `Holds ≈ ${kg < 10 ? kg.toFixed(1) : kg.toFixed(0)} kg on thick steel` : mg.drive ? 'Switched off: plain steel' : 'Power 0: plain steel';
      rows.push(row([
        text(say, { size: 23, weight: '600', color: Br > 0 ? T.green : T.muted }),
        ...(mg.drive ? [btn('switch', app.switchOn ? '🧲 On' : '🧲 Off', () => app.toggleSwitch(), { on: app.switchOn, w: 170, h: 44 })] : []),
      ], { h: 44 }));
    }
    const allFrozen = group.every((x) => app.doc.parts[x]?.frozen);
    const foot = col([
      row([
        btn('tpl-save', `📐 Save template (${built.length})`, () => app.saveTemplate(app.together([part.id])), { tone: 'accent' }),
        ...(group.length > 1 ? [btn('del-one', 'Delete just this', () => deleteParts(app.store, [part.id]))] : []),
        ...(damaged ? [btn('repair', 'Repair', () => repairPart(app.store, part.id), { tone: 'accent' })] : []),
      ], { h: 52 }),
      row([
        btn('freeze', allFrozen ? 'Unfreeze' : 'Freeze', () => { app.commitLivePoses(); setFrozen(app.store, group, !allFrozen); }, { on: allFrozen }),
        btn('dup', 'Duplicate', () => { app.select([part.id, ...group.filter((x) => x !== part.id)]); app.duplicateSelection(); }),
        btn('del', group.length > 1 ? `Delete all ${group.length}` : 'Delete', () => deleteParts(app.store, group), { tone: 'danger' }),
      ], { h: 52 }),
    ], { gap: 8 });
    return { body: col(rows, { gap: 10 }), foot };
  }

  // ---- World ------------------------------------------------------------------------------------------------

  private worldView(): View {
    const app = this.app, s = app.settings;
    const g = Math.hypot(...app.doc.sim.gravity);
    const r = this.room;
    const h = 46;
    const body = col([
      row([
        btn('pause', s.paused ? '▶ Run' : '⏸ Pause', () => app.togglePause(), { on: s.paused, small: true }),
        btn('step', '⏭ Step', () => app.step(), { small: true }),
        btn('slower', `Slower (×${s.timeScale})`, () => app.setTimeScale(Math.max(0.05, s.timeScale / 2)), { small: true }),
        btn('faster', 'Faster', () => app.setTimeScale(Math.min(2, s.timeScale * 2)), { small: true }),
      ], { h }),
      row([
        btn('ckpt', '⚑ Checkpoint', () => app.checkpoint(), { small: true }),
        btn('rewind', '⟲ Rewind', () => app.rewind(), { small: true }),
        btn('undo', '↶ Undo', () => app.undo(), { small: true }),
        btn('redo', '↷ Redo', () => app.redo(), { small: true }),
      ], { h }),
      row([
        btn('stress', 'Stress view', () => { app.view.setStressOverlay(!app.view.stressOverlay); app.notify(); }, { on: app.view.stressOverlay, small: true }),
        btn('grabmode', s.grabMode === 'physical' ? 'Grab: physical' : 'Grab: creative', () => { s.grabMode = s.grabMode === 'physical' ? 'creative' : 'physical'; app.notify(); }, { on: s.grabMode === 'creative', small: true }),
        btn('frozen', 'Place frozen', () => { s.placeFrozen = !s.placeFrozen; app.notify(); }, { on: s.placeFrozen, small: true }),
        btn('shadows', 'Shadows', () => { s.shadows = !s.shadows; app.view.sun.castShadow = s.shadows; app.notify(); }, { on: s.shadows, small: true }),
      ], { h }),
      row([
        btn('small', `Shrink me (×${s.playerScale})`, () => { s.playerScale = Math.max(0.05, s.playerScale / 2); app.notify(); }, { small: true }),
        btn('big', 'Grow me', () => { s.playerScale = Math.min(20, s.playerScale * 2); app.notify(); }, { small: true }),
        btn('g-Earth', `Earth ${STANDARD_GRAVITY} m/s²`, () => setSim(app.store, { gravity: [0, -STANDARD_GRAVITY, 0] }), { on: Math.abs(g - STANDARD_GRAVITY) < 0.01, small: true }),
        btn('g-Moon', 'Moon 1.62 m/s²', () => setSim(app.store, { gravity: [0, -1.62, 0] }), { on: Math.abs(g - 1.62) < 0.01, small: true }),
      ], { h }),
      row([
        btn('zerog', 'Zero-g', () => setSim(app.store, { gravity: [0, 0, 0] }), { on: g < 1e-3, small: true }),
        ...(r && r.active === 'relax' ? [btn('stick', r.drive ? 'Left stick: Drive (motors, steering)' : 'Left stick: Fly where you look', () => r.setDrive(!r.drive), { on: r.drive, small: true, grow: 2 })] : [text('', { grow: 2 })]),
        btn('switch-w', app.switchOn ? '🧲 Switch: on' : '🧲 Switch: off', () => app.toggleSwitch(), { on: app.switchOn, small: true }),
      ], { h }),
      this.roomRow(h),
      this.energyBox(),
    ], { gap: 8 });
    const foot = col([this.healthLine(), row([
      text(`${app.fps.toFixed(0)} fps · physics ${(app.live.stats?.stepMs ?? 0).toFixed(1)} ms · ${app.live.stats?.awake ?? 0}/${app.live.stats?.bodies ?? 0} awake`, { size: 20, color: T.muted }),
      text(`v ${__BUILD__}`, { size: 17, color: T.dim, align: 'right', w: 200 }),
    ], { h: 26 })], { gap: 4 });
    return { body, foot };
  }

  /** Mode row: relax / walk / mixed, and what each needs (calibrate, scan, what the room does). */
  private roomRow(h: number): Node {
    const r = this.room, app = this.app;
    if (!r) return text('', { size: 1 });
    const modes: ['relax' | 'walk' | 'mixed', string, string][] = [['relax', 'Relax', 'fly'], ['walk', 'Walk', '1:1 room'], ['mixed', 'Mixed', r.passthrough ? 'passthrough' : 'needs AR']];
    const extra: Node[] = r.active === 'walk'
      ? [btn('recal', 'Recalibrate', () => r.recalibrate(), { sub: r.calibrated ? 'stand + face, then press' : 'waiting…', small: true }), btn('solid', 'Room solid', () => { app.roomSolid = !app.roomSolid; app.applyRoom(); }, { on: app.roomSolid, sub: `${app.room.length} surfaces`, small: true })]
      : r.active === 'mixed'
        ? [btn('scan', 'Scan room', () => r.scan(), { sub: r.canScan ? 'Space Setup' : 'not on this device', small: true }), btn('showscan', 'Show scan', () => { app.showScan = !app.showScan; app.applyRoom(); }, { on: app.showScan, sub: `${app.room.length} surfaces`, small: true })]
        : [text('Walk: your real room, 1:1 in the workshop. Mixed: build in your room (passthrough).', { size: 18, color: T.muted, lines: 2, grow: 2 })];
    return row([...modes.map(([m, label, sub]) => btn(`mode-${m}`, label, () => r.setStyle(m), { on: r.active === m, sub, small: true })), ...extra], { h: h + 8 });
  }

  /** The energy books as bars: where every joule is, what put it there, and what became heat. */
  private energyBox(): Node {
    const e = this.app.live.energy;
    if (!e) return text('Energy: nothing moving yet.', { size: 19, color: T.muted });
    const J = (x: number) => (Math.abs(x) >= 1000 ? `${(x / 1000).toFixed(2)} kJ` : `${x.toFixed(Math.abs(x) < 10 ? 2 : 1)} J`);
    const heat = e.heat.friction + e.heat.impact + e.heat.plastic + e.heat.air + e.heat.eddy + e.heat.damping + e.heat.electric;
    const work = e.work.hands + e.work.batteries + e.work.magnets + e.work.fluids;
    const rows: [string, number, string][] = [['motion', e.kinetic, T.blue], ['height', e.potential, T.ego], ['springs', e.elastic, T.green], ['heat', heat, T.orange], ['put in', work, T.accent]];
    const max = Math.max(1e-9, ...rows.map(([, v]) => Math.abs(v)));
    return box([
      ...rows.map(([label, v, color]) => bar(Math.abs(v) / max, color, { h: 20, label: `${label} ${J(v)}` })),
      text(`heat: friction ${J(e.heat.friction)}, impacts ${J(e.heat.impact)}, bending ${J(e.heat.plastic)}, air ${J(e.heat.air)}, eddy ${J(e.heat.eddy)}, electric ${J(e.heat.electric)} · put in: hands ${J(e.work.hands)}, batteries ${J(e.work.batteries)}, magnets ${J(e.work.magnets)} · integrator lost ${J(e.numerical.lost)}, made ${J(e.numerical.gained)}${e.numerical.gainedHeld > 0 ? ` (${J(e.numerical.gainedHeld)} while held)` : ''}`, { size: 15, color: T.muted, lines: 2 }),
    ], { pad: 10, gap: 4, fill: 'rgba(255,255,255,0.04)' });
  }

  /** The live watchdog's verdict on this session: all clear, or how many problems and the latest one. */
  private healthLine(): Node {
    const h = this.app.live.health;
    if (!h.length) return text('● Watchdog: all clear', { size: 20, color: T.green, weight: '600' });
    const crit = h.filter((a) => a.severity === 'critical').length;
    const last = h[h.length - 1]!;
    const name = last.id ? (this.app.doc.parts[last.id.split('#')[0]!]?.name ?? 'a part') : 'the scene';
    return text(`● Watchdog: ${crit ? `${crit} critical` : ''}${crit && h.length > crit ? ', ' : ''}${h.length > crit ? `${h.length - crit} warning` : ''} · ${last.kind}: ${name} ${last.detail}`, { size: 20, color: crit ? T.red : T.amber, weight: '600' });
  }

  // ---- Builds ------------------------------------------------------------------------------------------------

  private buildsView(): View {
    const app = this.app;
    const shelves = chips('shelf', ['Builds', 'Templates'], this.buildShelf, (l) => { this.buildShelf = l as 'Builds' | 'Templates'; this.deleting = false; this.pages = {}; });
    if (this.buildShelf === 'Templates') {
      const list = app.templates.list();
      const sel = [...app.selection.parts].filter((id) => app.doc.parts[id]);
      const built = sel.length ? app.together(sel) : [];
      if (this.deleting && !list.length) this.deleting = false;
      return { body: col([
        shelves,
        row([
          btn('tpl-save2', '📐 Save what you built as a template', () => app.saveTemplate(app.together(sel)), { tone: sel.length ? 'accent' : undefined, sub: sel.length ? `${built.length} parts: joined, and resting on it` : 'select a part of it first' }),
          btn('tpl-delmode', this.deleting ? '🗑 Tap a template to delete it' : '🗑 Delete…', () => { this.deleting = !this.deleting; }, { on: this.deleting, tone: this.deleting ? 'danger' : undefined, sub: this.deleting ? 'tap here to stop' : 'one at a time' }),
        ], { h: 68 }),
        list.length
          ? this.gridOf('tpls', list.map((e) => slot(`tpl-${e.id}`, { type: 'template', id: e.id }, e.name, () => { if (this.deleting) app.deleteTemplate(e.id); else this.pick({ type: 'template', id: e.id }); }, { on: this.isActive({ type: 'template', id: e.id }) })), 6, 132)
          : text('No templates yet. Join parts into something, select it, then 📐 Save as template: pick it here and the Place tool stamps out copies.', { size: 23, color: T.muted, lines: 3 }),
      ], { gap: 8 }) };
    }
    const lib = app.library.list();
    const open = app.libraryId ? app.library.get(app.libraryId) : null;
    if (this.deleting && !lib.length) this.deleting = false;
    const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return { body: col([
      shelves,
      row([
        btn('save', '💾 Save', () => app.saveBuild(), { tone: 'accent', sub: open ? `over “${open.name}”` : 'as a new build' }),
        btn('saveas', '➕ Save as new', () => app.saveBuild(true), { sub: 'a copy' }),
        btn('new', '🆕 New build', () => app.newBuild(), { sub: 'empty workshop' }),
        btn('delmode', this.deleting ? '🗑 Tap to delete' : '🗑 Delete…', () => { this.deleting = !this.deleting; }, { on: this.deleting, tone: this.deleting ? 'danger' : undefined, sub: this.deleting ? 'tap here to stop' : 'one at a time' }),
      ], { h: 76 }),
      lib.length
        ? this.gridOf('lib', lib.map((e) => btn(`build-${e.id}`, e.name, () => { if (this.deleting) app.deleteBuild(e.id); else app.openBuild(e.id); }, { on: app.libraryId === e.id, tone: this.deleting ? 'danger' : undefined, sub: when(e.saved) })), 3, 96)
        : text('No builds yet. Build something, then 💾 Save: your builds stay on this headset, and only builds you save appear here.', { size: 24, color: T.muted, lines: 3 }),
    ], { gap: 8 }) };
  }

  // ---- inventory: icons, the hotbar, search, picking --------------------------------------------------------

  private drawHotbar(p: Paint) {
    const g = p.g;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(g, 12, CH + 2, W - 24, HOT - 10, 16);
    g.fill();
    const items = this.hotbar.items.slice(0, SLOTS);
    render(p, row(items.map((it, i) => slot(`hot-${i}`, it, this.itemLabel(it), () => this.pick(it), { compact: true, on: this.isActive(it) })), { h: HOT - 26 }), M, CH + 10, W - 2 * M, H, this.widgets);
    font(g, 15);
    g.fillStyle = T.dim;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    const sw = (W - 2 * M - (SLOTS - 1) * 8) / SLOTS;
    items.forEach((_, i) => g.fillText(`${i + 1}`, M + 8 + i * (sw + 8), CH + 30));
  }

  private icon(g: CanvasRenderingContext2D, item: Item, x: number, y: number, s: number) {
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
      { id: 'ask-working', label: 'What is Ego working on?', glyph: '✦', words: ['ego', 'working', 'mind', 'journal', 'investigation'], run: () => { const e = app.ego; if (e) e.reply(e.ask('what are you working on')); } },
      { id: 'ask-open', label: 'What is open?', glyph: '✦', words: ['ego', 'open', 'unresolved', 'questions', 'frontier'], run: () => { const e = app.ego; if (e) e.reply(e.ask('what is open')); } },
    ];
  }
}

/** The height of a foot node at the page width (a foot never pages, so the bottom is far away). */
function measureFoot(p: Paint, n: Node, w: number): number {
  const probe: Widget[] = [];
  p.g.save();
  p.g.globalAlpha = 0;
  const h = render(p, n, -10_000, 0, w, 10_000, probe);
  p.g.restore();
  return h;
}
