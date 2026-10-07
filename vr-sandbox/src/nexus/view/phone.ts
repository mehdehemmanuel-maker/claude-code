// A phone in your left hand: what the wrist menu was, as a phone you hold. Its home screen is apps: the camera, with a
// live viewfinder from the lens on its back and a shutter for what you see yourself; the photos it took; a chat with
// Claude, a photo attached to a message where you want one; the windows that are open or put away; the boards and
// their pipelines; a new build; the flaws; fix mode; talking; the settings; and every other control, under More. First
// among them, red on black, the Pipeline: what Claude runs on every ask, stage by stage, which you may run yourself on an
// ask of yours or one the testers wrote, edit, compare with the run before your edit, and tell Claude about.
// Point at it with your right hand and pull the trigger, as at everything else. On a screen it is the 📱 Phone button.

import * as THREE from 'three';
import { compare, EDITS0, MATTERS, noteFor, STAGES, type PipeEdits, type PipeRun, type StageId } from '../pipe';
import { bestOf, variants } from '../practice';
import { TEST_ASKS, TEST_ASKS_RUN } from '../test-asks';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const PW = 0.074, PH = 0.152, SW = 0.068, SH = 0.144;
const CW = 540, CH = Math.round((CW * SH) / SW);
const RED = '#ff1744', PINK = '#ff8a80';
export interface Photo { url: string; at: number; from: 'phone' | 'view' }
/** A run as it is kept: what was asked, with which edits, what it came to, and when. */
export interface RunKept { ask: string; edits: PipeEdits; verdict: string; failed: number; checks: number; kg: number | null; ms: number; at: number; by: 'you' | 'best' | 'rule' }
export interface ChatLine { who: 'you' | 'claude' | 'nexus' | 'system'; text: string; photo?: number }
export interface PhoneHost {
  /** What a home-screen app opens that is the forge's: the boards, a pipeline, a new build, the flaws, fix mode, talking. */
  open(app: 'boards' | 'flows' | 'build' | 'flaws' | 'fix' | 'talk'): void;
  /** Every control of the forge, for More; and the settings, each a label and what it does. */
  commands(): [string, () => void][];
  settings(): [string, () => void][];
  windows(): { id: string; title: string; state: string }[];
  window(id: string, act: 'restore' | 'close'): void;
  arrange(): void; minAll(): void; closeAll(): void;
  /** What you see yourself, as a picture. */
  eyeShot(): string;
  /** A message to Claude, a photo with it or not: Claude's answer where it can be reached, else Nexus's and where it went. */
  chat(text: string, photo: string | null): Promise<{ text: string; by: 'claude' | 'nexus'; kept?: string }>;
  /** Ask for words on the keyboard of light, or stop. */
  type(on: boolean, hint: string): void;
  listen(): boolean;
  /** Who answers here, for the status bar. */
  answers(): 'claude' | 'nexus';
  /** The pipeline Claude runs: an ask through it with your edits, stage by stage (off the room's thread where it can be). */
  pipeline(ask: string, edits: PipeEdits, o?: { build?: boolean }): Promise<PipeRun>;
  /** The table cleared of everything built, and nothing kept to bring it back: what was done. */
  resetBuild(): string;
  /** Every pipeline on the boards (yours and the robots'), its last run; one opened on the wall; a new one begun. */
  pipelines(): { id: string; title: string; armed: boolean; last: string; robot: boolean }[];
  openPipeline(id: string): void; newPipeline(): void;
  /** A note on a stage of it, to Claude Code: sent, or kept for an issue where it cannot be; what became of it. */
  tell(note: string): Promise<string>;
}
type Region = { x0: number; y0: number; x1: number; y1: number; act: string; arg?: number | string };
/** What a screen shows: an app, the page of it, and which of its own screens. */
export interface View { app: string; page: number; sub: string }
/** A screen apps are drawn on: the phone's own, or a holographic one an app was dragged out to. */
export interface Surface { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; hits: Region[]; view: View; holo: boolean }
/** How an app draws: its canvas, where a press does what, a button, a line of text, words wrapped (their height). */
export interface Kit {
  g: CanvasRenderingContext2D; W: number; H: number; bottom: number;
  hit(x0: number, y0: number, x1: number, y1: number, act: string, arg?: number | string): void;
  button(x: number, y: number, w: number, h: number, text: string, act: string, arg?: number | string, accent?: string, fill?: string): void;
  text(s: string, x: number, y: number, size: number, colour?: string, weight?: number, max?: number): void;
  wrapped(s: string, x: number, y: number, size: number, width: number, colour: string, lines?: number): number;
}
/** How an app moves about: to one of its own screens, the page it is on, and words asked for on the keyboard of light. */
export interface Nav { go(sub: string): void; page: number; sub: string; write(hint: string, then: (t: string) => void): void; redraw(): void }
/** An app the forge adds to the phone: its name, icon and colour, how it draws, and what its presses do (true: draw again). */
export interface PhoneApp {
  id: string; name: string; icon: string; colour: string;
  draw(k: Kit, v: View): void;
  act(act: string, arg: number | string | undefined, nav: Nav): boolean;
  /** how many pages its screen has, for ▲ ▼ */ pages?(sub: string): number;
}
/** The home screen's own apps: id, icon, name. */
const HOME: [string, string, string][] = [['pipeline', '', 'Pipeline'], ['camera', '📷', 'Camera'], ['gallery', '🖼', 'Photos'], ['chat', '💬', 'Chat'], ['windows', '🗂', 'Windows'], ['boards', '🧩', 'Boards'], ['build', '🔨', 'Build'], ['flaws', '⚠', 'Flaws'], ['fix', '🛠', 'Fix'], ['talk', '🎤', 'Talk'], ['settings', '⚙', 'Settings'], ['more', '☰', 'More']];

export class Phone {
  readonly group = new THREE.Group();
  private readonly canvas = document.createElement('canvas');
  private readonly g: CanvasRenderingContext2D;
  private readonly tex: THREE.CanvasTexture;
  private readonly screen: THREE.Mesh;
  private readonly finder: THREE.Mesh;
  private readonly cam = new THREE.PerspectiveCamera(62, SW / SH, 0.05, 40);
  private readonly rt = new THREE.WebGLRenderTarget(270, 572);
  typing = false; photos: Photo[] = []; lines: ChatLine[] = [];
  private photoAt = 0; private attach: number | null = null; private waiting = false; private frame = 0;
  private readonly images = new Map<string, HTMLImageElement>();
  /** What the phone's own screen shows; and the holographic screens apps were dragged out to, each showing one app. */
  readonly own: Surface;
  private readonly holos: Surface[] = [];
  /** Apps the forge adds: the warehouse, rules, the weather, data, the robot. */
  private readonly extras: PhoneApp[] = [];
  get app(): string { return this.own.view.app; }
  /** The pipeline: the ask it runs, your edits, the last run and the one before it (of the same ask), whether it is running,
   *  the stage open, and what became of the last thing you did here. */
  pipeAsk = TEST_ASKS[0]?.ask ?? 'a wall bracket that holds a 17 kg camera 400 mm out from the wall'; pipeEdits: PipeEdits = { ...EDITS0 };
  pipeRun: PipeRun | null = null; pipePrev: PipeRun | null = null; pipeBusy = false; pipeStage: StageId = 'read'; pipeSaid = '';
  /** Every run kept, newest last, to run again; and the search for the best edits of an ask, while it goes. */
  runs: RunKept[] = []; best: { done: number; of: number; ask: string } | null = null;
  /** What the keyboard of light writes: a message to Claude, an ask for the pipeline, or a note on one of its stages. */
  private writingFor: 'chat' | 'ask' | 'tell' | 'app' = 'chat';
  /** Where words written for an added app go. */
  private appWrite: ((t: string) => void) | null = null;

  constructor(private readonly host: PhoneHost) {
    this.canvas.width = CW; this.canvas.height = CH; this.g = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.own = { canvas: this.canvas, g: this.g, tex: this.tex, hits: [], view: { app: 'home', page: 0, sub: '' }, holo: false };
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    const body = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.009), new THREE.MeshStandardMaterial({ color: 0x10161d, metalness: 0.6, roughness: 0.35 }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 24), new THREE.MeshStandardMaterial({ color: 0x050709, metalness: 0.9, roughness: 0.15 }));
    lens.rotation.x = Math.PI / 2; lens.position.set(-PW / 2 + 0.014, PH / 2 - 0.016, -0.006);
    this.finder = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: this.rt.texture, toneMapped: false }));
    this.finder.position.z = 0.0047; this.finder.visible = false;
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false }));
    this.screen.position.z = 0.0049; this.screen.renderOrder = 21;
    // the lens looks out of the back: a camera looks along its own −z, which is the phone's back
    this.cam.position.set(lens.position.x, lens.position.y, -0.008);
    this.group.add(body, lens, this.finder, this.screen, this.cam);
    try { this.photos = JSON.parse(localStorage.getItem('nexus-phone:photos') ?? '[]') as Photo[]; } catch { this.photos = []; }
    try { this.runs = (JSON.parse(localStorage.getItem('nexus-phone:runs') ?? '[]') as RunKept[]).slice(-30); } catch { this.runs = []; }
    try { const k = JSON.parse(localStorage.getItem('nexus-phone:pipe') ?? 'null') as { ask?: string; edits?: PipeEdits } | null; if (k?.ask) this.pipeAsk = k.ask; if (k?.edits) this.pipeEdits = { ...EDITS0, ...k.edits }; } catch { /* Claude's pipeline, as it is */ }
    this.draw();
  }

  // ---- the camera: a live view from the back, rendered only while the Camera app is open ---------------------------------
  /** Before the room is drawn: the viewfinder, every other frame, while the Camera is open and the phone is in sight. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    if (this.own.view.app !== 'camera' || !visible(this.group) || this.frame++ % 2) return;
    const xr = renderer.xr.enabled, was = renderer.getRenderTarget();
    renderer.xr.enabled = false; this.group.visible = false;
    renderer.setRenderTarget(this.rt); renderer.render(scene, this.cam); renderer.setRenderTarget(was);
    this.group.visible = true; renderer.xr.enabled = xr;
  }
  /** What the lens sees, as a picture. */
  private lensShot(renderer: THREE.WebGLRenderer, scene: THREE.Scene): string {
    const w = 480, h = Math.round((w * SH) / SW), rt = new THREE.WebGLRenderTarget(w, h); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const xr = renderer.xr.enabled, was = renderer.getRenderTarget(); renderer.xr.enabled = false; this.group.visible = false;
    renderer.setRenderTarget(rt); renderer.render(scene, this.cam);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    renderer.setRenderTarget(was); renderer.xr.enabled = xr; this.group.visible = true; rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!, img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    g.putImageData(img, 0, 0); return c.toDataURL('image/jpeg', 0.75);
  }
  /** Take a photo: through the lens, or of what you see. */
  shoot(from: 'phone' | 'view', renderer: THREE.WebGLRenderer, scene: THREE.Scene): Photo {
    const p: Photo = { url: from === 'phone' ? this.lensShot(renderer, scene) : this.host.eyeShot(), at: Date.now(), from };
    this.photos.push(p); if (this.photos.length > 24) this.photos.shift(); this.keep();
    this.flash = performance.now(); this.draw(); return p;
  }
  private flash = 0;
  private keep(): void { try { localStorage.setItem('nexus-phone:photos', JSON.stringify(this.photos.slice(-6))); } catch { /* full: kept for this visit */ } }
  private keepPipe(): void { try { localStorage.setItem('nexus-phone:pipe', JSON.stringify({ ask: this.pipeAsk, edits: this.pipeEdits })); } catch { /* kept for this visit */ } }
  /** The ask through the pipeline with your edits; the run before kept where it was of the same ask, to compare with. */
  async runPipe(by: RunKept['by'] = 'you'): Promise<PipeRun | null> {
    if (this.pipeBusy) return null; this.pipeBusy = true; this.pipeSaid = ''; this.draw();
    try { const r = await this.host.pipeline(this.pipeAsk, { ...this.pipeEdits }); this.took(r, by); return r; }
    catch (e) { this.pipeSaid = `It stopped: ${(e as Error).message}`; return null; }
    finally { this.pipeBusy = false; this.draw(); }
  }
  /** A run that came back: the one before kept to compare with where it was of the same ask, and kept with the runs. */
  took(r: PipeRun, by: RunKept['by']): void {
    if (this.pipeRun?.ask === r.ask) this.pipePrev = this.pipeRun; else if (this.pipePrev?.ask !== r.ask) this.pipePrev = null; this.pipeRun = r;
    this.runs.push({ ask: r.ask, edits: { ...r.edits }, verdict: r.verdict, failed: r.failed, checks: r.checks, kg: r.kg, ms: r.ms, at: Date.now(), by }); if (this.runs.length > 30) this.runs.shift();
    try { localStorage.setItem('nexus-phone:runs', JSON.stringify(this.runs)); } catch { /* kept for this visit */ }
  }
  /** The best edits of the ask searched for: every matter at this seed and the next, quickly (no physics, nothing built),
   *  then the best of them run as you set it and built, and kept as your edits. */
  async findBest(): Promise<void> {
    if (this.pipeBusy || this.best) return;
    const ask = this.pipeAsk, tries = variants(this.pipeEdits), got: PipeRun[] = [];
    this.best = { done: 0, of: tries.length, ask }; this.pipeSaid = ''; this.draw();
    try {
      for (const e of tries) { got.push(await this.host.pipeline(ask, e, { build: false })); this.best.done++; this.draw(); }
      const b = bestOf(got); if (!b) { this.pipeSaid = 'Nothing came of it.'; return; }
      this.pipeEdits = { ...this.pipeEdits, seed: b.edits.seed, matter: b.edits.matter }; this.keepPipe();
      this.pipeSaid = `Best: ${b.edits.matter}, seed ${b.edits.seed} (${b.verdict.toLowerCase()}, ${b.failed} failed${b.kg ? `, ${+b.kg.toPrecision(3)} kg` : ''}). Kept as your edits; running it now.`;
    } catch (e) { this.pipeSaid = `The search stopped: ${(e as Error).message}`; return; }
    finally { this.best = null; this.draw(); }
    await this.runPipe('best');
  }
  private img(url: string): HTMLImageElement | null {
    let i = this.images.get(url); if (i) return i.complete ? i : null;
    i = new Image(); i.onload = () => this.draw(); i.src = url; this.images.set(url, i); return null;
  }

  // ---- pressing it ---------------------------------------------------------------------------------------------------------
  /** How far along a ray the screen is (Infinity where it misses). */
  distance(ray: THREE.Raycaster): number { return visible(this.group) ? ray.intersectObject(this.screen, false)[0]?.distance ?? Infinity : Infinity; }
  press(ray: THREE.Raycaster, renderer: THREE.WebGLRenderer, scene: THREE.Scene): boolean {
    const h = visible(this.group) ? ray.intersectObject(this.screen, false)[0] : undefined; if (!h?.uv) return false;
    this.pressAt(this.own, h.uv, renderer, scene);
    return true;
  }
  /** A press at a point of a surface's screen (its uv): what is there is done, on that surface. */
  pressAt(s: Surface, uv: THREE.Vector2, renderer?: THREE.WebGLRenderer, scene?: THREE.Scene): void {
    const r = this.regionAt(s, uv);
    if (r) this.act(r.act, r.arg, renderer, scene, s);
  }
  /** What a point of a surface's screen does, if anything. */
  regionAt(s: Surface, uv: THREE.Vector2): Region | null { const x = uv.x * CW, y = (1 - uv.y) * CH; return s.hits.find((q) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1) ?? null; }
  /** Where the phone's screen is hit by a ray, as a point of it (uv), or null. */
  uvOf(ray: THREE.Raycaster): THREE.Vector2 | null { return (visible(this.group) ? ray.intersectObject(this.screen, false)[0]?.uv?.clone() : null) ?? null; }
  /** The app whose icon is at a point of the home screen, for dragging it out. */
  appAt(uv: THREE.Vector2): string | null { if (this.own.view.app !== 'home') return null; const r = this.regionAt(this.own, uv); return r?.act === 'app' && r.arg !== 'camera' ? String(r.arg) : null; }
  // ---- apps the forge adds, and surfaces apps are dragged out to ---------------------------------------------------------
  add(app: PhoneApp): void { this.extras.push(app); this.draw(); }
  /** A new surface showing one app, for a holographic screen; drawn whenever the phone is. */
  surface(app: string): Surface {
    const canvas = document.createElement('canvas'); canvas.width = CW; canvas.height = CH;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const s: Surface = { canvas, g: canvas.getContext('2d')!, tex, hits: [], view: { app, page: 0, sub: '' }, holo: true };
    this.holos.push(s); this.paint(s); return s;
  }
  /** The newest holographic surface showing an app, for a test to press on. */
  holoSurface(app: string): Surface | null { return [...this.holos].reverse().find((x) => x.view.app === app) ?? this.holos.at(-1) ?? null; }
  /** Whether any screen (the phone's or a holographic one) shows one of these apps. */
  showing(apps: string[]): boolean { return [this.own, ...this.holos].some((x) => apps.includes(x.view.app)); }
  /** A surface let go of: no longer drawn. */
  drop(s: Surface): void { const i = this.holos.indexOf(s); if (i >= 0) this.holos.splice(i, 1); s.tex.dispose(); }
  /** What an app is called and how it looks, for a screen's title. */
  appName(id: string): string { return this.extras.find((a) => a.id === id)?.name ?? HOME.find((a) => a[0] === id)?.[2] ?? id; }
  act(act: string, arg: number | string | undefined, renderer?: THREE.WebGLRenderer, scene?: THREE.Scene, s: Surface = this.own): void {
    const v = s.view;
    // an added app's own presses, on the surface it is open on
    const extra = this.extras.find((x) => x.id === v.app);
    if (extra && !['home', 'back', 'app', 'up', 'down'].includes(act)) { if (extra.act(act, arg, this.navOf(s))) this.draw(); return; }
    switch (act) {
      case 'home': this.goOn(s, 'home'); return;
      case 'back': if (extra && v.sub) { v.sub = ''; v.page = 0; this.draw(); return; } this.goOn(s, v.app === 'photo' ? 'gallery' : ['pipeedits', 'pipetests', 'pipestage', 'piperuns', 'pipeall'].includes(v.app) ? 'pipeline' : 'home'); return;
      case 'pask': this.writeFor('ask', 'an ask for the pipeline: what it must hold, carry, span or stand'); return;
      case 'prun': void this.runPipe(); return;
      case 'pclear': this.pipeSaid = this.host.resetBuild(); this.draw(); return;
      case 'pbest': void this.findBest(); return;
      case 'pruns': this.goOn(s, 'piperuns'); return;
      case 'pall': this.goOn(s, 'pipeall'); return;
      case 'popen': this.host.openPipeline(String(arg)); this.pipeSaid = 'Opened on the board wall: ▶ Run there, or change a step.'; this.draw(); return;
      case 'pnew': this.host.newPipeline(); return;
      case 'pclaude': this.goOn(s, 'pipeline'); return;
      case 'prerun': { const k = this.runs[Number(arg)]; if (k) { this.pipeAsk = k.ask; this.pipeEdits = { ...k.edits }; this.keepPipe(); this.goOn(s, 'pipeline'); void this.runPipe(); } return; }
      case 'ptests': this.goOn(s, 'pipetests'); return;
      case 'ptest': { const t = TEST_ASKS[Number(arg)]; if (t) { this.pipeAsk = t.ask; this.keepPipe(); } this.goOn(s, 'pipeline'); return; }
      case 'pedits': this.goOn(s, 'pipeedits'); return;
      case 'pseed': this.pipeEdits.seed = Math.max(1, this.pipeEdits.seed + Number(arg)); this.keepPipe(); this.draw(); return;
      case 'pmatter': this.pipeEdits.matter = MATTERS[(MATTERS.indexOf(this.pipeEdits.matter) + 1) % MATTERS.length]!; this.keepPipe(); this.draw(); return;
      case 'pgrow': this.pipeEdits.grow = !this.pipeEdits.grow; this.keepPipe(); this.draw(); return;
      case 'pphys': this.pipeEdits.physics = !this.pipeEdits.physics; this.keepPipe(); this.draw(); return;
      case 'preset': this.pipeEdits = { ...EDITS0 }; this.keepPipe(); this.draw(); return;
      case 'pstage': this.pipeStage = String(arg) as StageId; this.goOn(s, 'pipestage'); return;
      case 'ptell': this.writeFor('tell', `what Claude should change in ${STAGES.find((x) => x.id === this.pipeStage)!.title.toLowerCase()}`); return;
      case 'app': {
        const a = String(arg);
        if (['camera', 'gallery', 'chat', 'windows', 'more', 'settings', 'pipeline'].includes(a) || this.extras.some((x) => x.id === a)) this.goOn(s, a);
        else this.host.open(a as 'boards' | 'flows' | 'build' | 'flaws' | 'fix' | 'talk');
        return;
      }
      case 'shoot': if (renderer && scene) this.shoot('phone', renderer, scene); return;
      case 'shootview': if (renderer && scene) this.shoot('view', renderer, scene); return;
      case 'photo': this.photoAt = Number(arg); this.goOn(s, 'photo'); return;
      case 'sendphoto': this.attach = this.photoAt; this.goOn(s, 'chat'); this.write(); return;
      case 'delphoto': this.photos.splice(this.photoAt, 1); this.keep(); if (this.attach === this.photoAt) this.attach = null; this.goOn(s, 'gallery'); return;
      case 'attach': this.attach = this.attach === null ? (this.photos.length ? this.photos.length - 1 : null) : null; this.draw(); return;
      case 'write': this.write(); return;
      case 'mic': if (!this.host.listen()) this.lines.push({ who: 'system', text: 'This browser does not hear: write instead.' }); else { this.typing = true; } this.draw(); return;
      case 'win': this.host.window(String(arg), 'restore'); this.draw(); return;
      case 'winx': this.host.window(String(arg), 'close'); this.draw(); return;
      case 'arrange': this.host.arrange(); this.draw(); return;
      case 'minall': this.host.minAll(); this.draw(); return;
      case 'closeall': this.host.closeAll(); this.draw(); return;
      case 'cmd': { const c = (v.app === 'settings' ? this.host.settings() : this.host.commands())[Number(arg)]; if (c) c[1](); this.draw(); return; }
      case 'up': v.page = Math.max(0, v.page - 1); this.draw(); return;
      case 'down': { const most = extra ? Math.max(0, (extra.pages?.(v.sub) ?? 1) - 1) : v.app === 'pipetests' ? Math.ceil(TEST_ASKS.length / 5) - 1 : v.app === 'piperuns' ? Math.max(0, Math.ceil(this.runs.length / 6) - 1) : v.app === 'pipeall' ? Math.max(0, Math.ceil(this.host.pipelines().length / 6) - 1) : v.app === 'pipestage' ? Math.max(0, Math.ceil((this.pipeRun?.stages.find((x) => x.id === this.pipeStage)?.lines.length ?? 0) / 7) - 1) : Infinity; v.page = Math.min(most, v.page + 1); this.draw(); return; }
    }
  }
  private goOn(s: Surface, app: string): void {
    if (s !== this.own) { s.view = { app, page: 0, sub: '' }; this.draw(); return; }
    const keep = this.typing && ((app === 'chat' && this.writingFor === 'chat') || (app === 'pipeline' && this.writingFor === 'ask') || (app === 'pipestage' && this.writingFor === 'tell')); this.own.view = { app, page: 0, sub: '' }; this.finder.visible = app === 'camera'; if (!keep && this.typing) this.stopTyping(); this.draw(); }
  /** How an added app moves about its own screens, on the surface it is open on. */
  private navOf(s: Surface): Nav { return { go: (sub: string) => { s.view.sub = sub; s.view.page = 0; }, page: s.view.page, sub: s.view.sub, write: (hint: string, then: (t: string) => void) => { this.writingFor = 'app'; this.appWrite = then; this.typing = true; this.host.type(true, hint); }, redraw: () => this.draw() }; }
  private write(): void { this.writeFor('chat', this.attach !== null ? 'a message to Claude, the photo with it' : 'a message to Claude'); }
  private writeFor(kind: 'chat' | 'ask' | 'tell', hint: string): void { this.writingFor = kind; this.typing = true; this.host.type(true, hint); this.draw(); }
  stopTyping(): void { if (!this.typing) return; this.typing = false; this.host.type(false, ''); this.draw(); }
  /** Words sent from the keyboard of light or said: the message goes, with the photo if one is attached. */
  async send(text: string): Promise<void> {
    const t = text.trim(); if (!t) return;
    // an ask for the pipeline: run at once; a note on a stage: to Claude, with the run it is about
    if (this.writingFor === 'app') { this.writingFor = 'chat'; const then = this.appWrite; this.appWrite = null; then?.(t); this.draw(); return; }
    if (this.writingFor === 'ask') { this.writingFor = 'chat'; this.pipeAsk = t; this.keepPipe(); this.own.view.app = 'pipeline'; await this.runPipe(); return; }
    if (this.writingFor === 'tell') {
      this.writingFor = 'chat'; this.own.view.app = 'pipestage'; this.pipeSaid = 'Sending to Claude…'; this.draw();
      const run = this.pipeRun?.ask === this.pipeAsk ? this.pipeRun : null;
      const note = run ? noteFor(run, this.pipeStage, t) : `Pipeline note on the ${STAGES.find((x) => x.id === this.pipeStage)!.title} stage: ${t}\n\nThe ask (not run yet): "${this.pipeAsk.slice(0, 400)}". Try it on the test asks; keep it only if more of them hold.`;
      try { this.pipeSaid = await this.host.tell(note); } catch (e) { this.pipeSaid = `Not sent: ${(e as Error).message}`; }
      this.draw(); return;
    }
    const photo = this.attach !== null ? this.photos[this.attach]?.url ?? null : null;
    this.lines.push({ who: 'you', text: t, ...(this.attach !== null ? { photo: this.attach } : {}) }); this.attach = null; this.waiting = true; this.own.view.app = 'chat'; this.draw();
    try { const r = await this.host.chat(t, photo); this.lines.push({ who: r.by, text: r.text }); if (r.kept) this.lines.push({ who: 'system', text: r.kept }); }
    catch (e) { this.lines.push({ who: 'system', text: `Not answered: ${(e as Error).message}` }); }
    finally { this.waiting = false; this.draw(); }
  }
  /** The screen as it is drawn, as a picture (for a test, or a photo of it). */
  screenUrl(): string { return this.canvas.toDataURL('image/png'); }
  /** Whether it is open on an app other than its home, for the way out. */
  get away(): boolean { return this.own.view.app !== 'home'; }

  // ---- drawing the screen ----------------------------------------------------------------------------------------------
  draw(): void { this.paint(this.own); for (const h of this.holos) this.paint(h); }
  /** One surface drawn: the phone's own screen, or a holographic screen an app was dragged out to. */
  private paint(s: Surface): void {
    const g = s.g, v = s.view; s.hits = [];
    g.clearRect(0, 0, CW, CH);
    const piped = v.app.startsWith('pipe');
    if (v.app !== 'camera') { const gr = g.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, piped ? '#1c0006' : '#0b2230'); gr.addColorStop(1, piped ? '#000000' : '#03090e'); g.fillStyle = gr; g.beginPath(); g.roundRect(0, 0, CW, CH, 40); g.fill(); }
    const hit = (x0: number, y0: number, x1: number, y1: number, act: string, arg?: number | string) => s.hits.push({ x0, y0, x1, y1, act, ...(arg !== undefined ? { arg } : {}) });
    const button = (x: number, y: number, w: number, h: number, text: string, act: string, arg?: number | string, accent = 'rgba(128,222,234,0.7)', fill = 'rgba(77,208,225,0.16)') => {
      g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, Math.min(22, h / 2)); g.fill(); g.strokeStyle = accent; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#ffffff'; g.font = `600 ${Math.min(30, h * 0.42)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + w / 2, y + h / 2 + 1); g.textAlign = 'left';
      hit(x, y, x + w, y + h, act, arg);
    };
    const text = (s: string, x: number, y: number, size: number, colour = '#e6f7ff', weight = 500, max = CW - 2 * x) => { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = colour; g.textBaseline = 'alphabetic'; const room = max > 0 ? max : CW; let t = s; while (t.length > 1 && g.measureText(t).width > room) t = `${t.slice(0, -2)}…`; g.fillText(t, x, y); };
    const wrapped = (s: string, x: number, y: number, size: number, width: number, colour: string, lines = 6) => { g.font = `400 ${size}px ${FONT}`; g.fillStyle = colour; const out: string[] = []; let line = ''; for (const w of s.split(/\s+/)) { const n = line ? `${line} ${w}` : w; if (g.measureText(n).width > width && line) { out.push(line); line = w; } else line = n; } if (line) out.push(line); out.slice(0, lines).forEach((l, i) => g.fillText(i === lines - 1 && out.length > lines ? `${l}…` : l, x, y + i * size * 1.25)); return Math.min(lines, out.length) * size * 1.25; };
    // the status bar: the time, who answers, and which app
    const now = new Date(), who = this.host.answers();
    g.fillStyle = v.app === 'camera' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)'; g.fillRect(0, 0, CW, 64);
    text(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, 34, 46, 30, '#ffffff', 600);
    g.textAlign = 'right'; text(who === 'claude' ? '● Claude' : '● Nexus', CW - 34, 46, 24, who === 'claude' ? '#69f0ae' : '#ffd740', 600); g.textAlign = 'left';
    const bottom = CH - 96;
    if (v.app === 'home') {
      text('Nexus', 40, 150, 52, '#ffffff', 700);
      text(who === 'claude' ? 'Claude answers here' : 'Claude cannot be reached from this copy', 40, 196, 22, '#9fdfee');
      const apps: [string, string, string][] = [...HOME.slice(0, -2), ...this.extras.map((x): [string, string, string] => [x.id, x.icon, x.name]), ...HOME.slice(-2)];
      const cw = (CW - 60) / 4, ch = apps.length > 16 ? 140 : 168;
      apps.forEach(([id, icon, name], i) => {
        const x = 30 + (i % 4) * cw, y = 226 + Math.floor(i / 4) * ch, s0 = Math.min(cw - 24, ch - 52), xo = (cw - s0) / 2 - 12;
        const extra = this.extras.find((a) => a.id === id);
        if (id === 'pipeline') pipeIcon(g, x + 12 + xo, y, s0);
        else {
          g.fillStyle = extra ? `${extra.colour}2e` : 'rgba(77,208,225,0.14)'; g.beginPath(); g.roundRect(x + 12 + xo, y, s0, s0, 26); g.fill(); g.strokeStyle = extra ? extra.colour : 'rgba(128,222,234,0.55)'; g.lineWidth = 2; g.stroke();
          g.font = `${s0 * 0.5}px ${FONT}`; g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, x + cw / 2, y + s0 / 2 + 4);
        }
        g.font = `${id === 'pipeline' ? 700 : 500} 20px ${FONT}`; g.fillStyle = id === 'pipeline' ? RED : '#e6f7ff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, x + cw / 2, y + s0 + 20); g.textAlign = 'left';
        hit(x, y, x + cw, y + ch - 8, 'app', id);
      });
      // the buttons, where they are learned: on the phone you hold
      g.textAlign = 'center'; text(s.holo ? 'A screen of the phone · press as on the phone' : 'Hold the trigger on an app and pull it off: a screen', CW / 2, CH - 150, 19, '#9fdfee', 500, CW - 40); text('X or Y puts this phone away, and back', CW / 2, CH - 122, 19, '#9fdfee', 500, CW - 40); g.textAlign = 'left';
    } else if (v.app === 'camera' && s.holo) {
      text('The camera stays on the phone', 40, 150, 30, '#ffffff', 700);
    } else if (v.app === 'camera') {
      // the viewfinder shows through; the shutter, your view, and the last photo over it
      if (performance.now() - this.flash < 160) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, 0, CW, CH); }
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, bottom - 170, CW, 270);
      g.beginPath(); g.arc(CW / 2, bottom - 70, 62, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke();
      hit(CW / 2 - 70, bottom - 140, CW / 2 + 70, bottom, 'shoot');
      button(CW - 200, bottom - 112, 170, 84, '👁 My view', 'shootview');
      const last = this.photos.at(-1);
      if (last) { const im = this.img(last.url); if (im) g.drawImage(im, 34, bottom - 120, 110, 100); g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(34, bottom - 120, 110, 100); hit(34, bottom - 120, 144, bottom - 20, 'photo', this.photos.length - 1); }
      text('Lens on the back · 👁 is what you see', 34, 104, 22, '#ffffff');
    } else if (v.app === 'gallery') {
      text('Photos', 40, 130, 44, '#ffffff', 700);
      if (!this.photos.length) wrapped('None yet. Open the Camera and press the shutter, or 👁 for what you see.', 40, 200, 26, CW - 80, '#9fdfee');
      const tw = (CW - 100) / 2, th = tw * 0.75, per = 6, start = v.page * per;
      this.photos.slice().reverse().slice(start, start + per).forEach((p, k) => {
        const i = this.photos.length - 1 - (start + k), x = 40 + (k % 2) * (tw + 20), y = 170 + Math.floor(k / 2) * (th + 20), im = this.img(p.url);
        if (im) g.drawImage(im, x, y, tw, th); else { g.fillStyle = 'rgba(77,208,225,0.12)'; g.fillRect(x, y, tw, th); }
        g.strokeStyle = 'rgba(128,222,234,0.6)'; g.lineWidth = 2; g.strokeRect(x, y, tw, th); hit(x, y, x + tw, y + th, 'photo', i);
      });
      if (this.photos.length > per) { button(40, bottom - 90, 120, 70, '▲', 'up'); button(180, bottom - 90, 120, 70, '▼', 'down'); }
    } else if (v.app === 'photo') {
      const p = this.photos[this.photoAt]; if (!p) { v.app = 'gallery'; this.draw(); return; }
      const im = this.img(p.url), w = CW - 60, h = w * 0.75 * (p.from === 'phone' ? 1.6 : 1);
      if (im) g.drawImage(im, 30, 110, w, Math.min(h, bottom - 330)); g.strokeStyle = 'rgba(128,222,234,0.6)'; g.strokeRect(30, 110, w, Math.min(h, bottom - 330));
      text(`${p.from === 'phone' ? 'Through the lens' : 'What you saw'} · ${new Date(p.at).toLocaleTimeString()}`, 30, bottom - 190, 22, '#9fdfee');
      button(30, bottom - 160, CW - 60, 76, '💬 Send to Claude', 'sendphoto', undefined, '#69f0ae');
      button(30, bottom - 74, (CW - 80) / 2, 64, 'Back', 'back'); button(50 + (CW - 80) / 2, bottom - 74, (CW - 80) / 2, 64, 'Delete', 'delphoto', undefined, '#ff8a80');
    } else if (v.app === 'chat') {
      text('Claude', 40, 120, 40, '#ffffff', 700); text(who === 'claude' ? 'answers here, with your photo' : 'kept for Claude Code; Nexus answers here', 40, 156, 20, who === 'claude' ? '#69f0ae' : '#ffd740');
      // newest at the bottom, as far up as there is room
      let y = bottom - 250; const shown: { line: ChatLine; h: number }[] = [];
      for (const line of [...this.lines].reverse()) { const h = 40 + Math.min(6, Math.ceil(line.text.length / 26)) * 30 + (line.photo !== undefined ? 130 : 0); if (y - h < 180) break; shown.unshift({ line, h }); y -= h + 14; }
      y = bottom - 250 - shown.reduce((a, s) => a + s.h + 14, 0) + 14;
      for (const { line, h } of shown) {
        const mine = line.who === 'you', x = mine ? 120 : 30, w = CW - 150;
        g.fillStyle = mine ? 'rgba(255,215,64,0.18)' : line.who === 'system' ? 'rgba(255,255,255,0.06)' : line.who === 'nexus' ? 'rgba(255,215,64,0.08)' : 'rgba(77,208,225,0.18)';
        g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill();
        text(mine ? 'You' : line.who === 'claude' ? 'Claude' : line.who === 'nexus' ? 'Nexus (not Claude)' : '·', x + 18, y + 30, 18, mine ? '#ffe082' : line.who === 'claude' ? '#80deea' : '#ffd740', 600);
        let off = 40;
        if (line.photo !== undefined && this.photos[line.photo]) { const im = this.img(this.photos[line.photo]!.url); if (im) g.drawImage(im, x + 18, y + off, 160, 120); off += 130; }
        wrapped(line.text, x + 18, y + off + 22, 22, w - 36, '#e6f7ff', 6);
        y += h + 14;
      }
      if (this.waiting) text('…', 40, bottom - 220, 40, '#80deea', 700);
      // the attachment, and the ways to write
      if (this.attach !== null && this.photos[this.attach]) { const im = this.img(this.photos[this.attach]!.url); if (im) g.drawImage(im, 30, bottom - 196, 100, 80); text('attached', 140, bottom - 150, 22, '#69f0ae'); }
      button(30, bottom - 100, 130, 84, this.attach !== null ? '📎 ✓' : '📎', 'attach', undefined, this.attach !== null ? '#69f0ae' : 'rgba(128,222,234,0.7)');
      button(176, bottom - 100, 210, 84, this.typing ? '⌨ Writing…' : '⌨ Write', 'write', undefined, this.typing ? '#ffd740' : 'rgba(128,222,234,0.7)');
      button(402, bottom - 100, 108, 84, '🎤', 'mic');
    } else if (v.app === 'windows') {
      text('Windows', 40, 130, 44, '#ffffff', 700);
      const ws = this.host.windows();
      if (!ws.length) wrapped('Nothing open. Open one from the home screen or More; – on a window puts it here.', 40, 196, 26, CW - 80, '#9fdfee');
      ws.slice(0, 8).forEach((w, i) => {
        const y = 170 + i * 96;
        g.fillStyle = w.state === 'open' ? 'rgba(77,208,225,0.18)' : 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect(30, y, CW - 150, 80, 18); g.fill();
        text(w.title, 50, y + 36, 26, '#ffffff', 600, CW - 190); text(w.state === 'open' ? 'open · press to bring in front' : 'put away · press to bring back', 50, y + 64, 18, '#9fdfee');
        hit(30, y, CW - 120, y + 80, 'win', w.id); button(CW - 110, y, 80, 80, '✕', 'winx', w.id, '#ffd740');
      });
      const bw = (CW - 80) / 3;
      button(30, bottom - 90, bw, 74, 'Arrange', 'arrange'); button(40 + bw, bottom - 90, bw, 74, 'Put away', 'minall'); button(50 + 2 * bw, bottom - 90, bw, 74, 'Close all', 'closeall', undefined, '#ff8a80');
    } else if (piped) {
      this.drawPipe(g, { hit, button, text, wrapped, bottom }, v);
    } else if (this.extras.some((x) => x.id === v.app)) {
      const x = this.extras.find((a) => a.id === v.app)!;
      x.draw({ g, W: CW, H: CH, bottom, hit, button, text, wrapped }, v);
      const n = x.pages?.(v.sub) ?? 1; if (n > 1) { button(CW - 250, CH - 80, 90, 64, '▲', 'up', undefined, x.colour); button(CW - 150, CH - 80, 90, 64, '▼', 'down', undefined, x.colour); text(`${v.page + 1}/${n}`, CW - 330, CH - 38, 20, '#e6f7ff'); }
    } else {
      // More and Settings: lists of what the forge does, a page at a time
      const all = v.app === 'settings' ? this.host.settings() : this.host.commands(), per = 9, start = v.page * per;
      text(v.app === 'settings' ? 'Settings' : 'More', 40, 130, 44, '#ffffff', 700);
      all.slice(start, start + per).forEach(([label], k) => { const y = 160 + k * 84; g.fillStyle = 'rgba(77,208,225,0.12)'; g.beginPath(); g.roundRect(30, y, CW - 60, 72, 16); g.fill(); text(label, 50, y + 46, 26, '#ffffff', 500, CW - 100); hit(30, y, CW - 30, y + 72, 'cmd', start + k); });
      if (all.length > per) { button(30, bottom - 90, 120, 74, '▲', 'up'); button(160, bottom - 90, 120, 74, '▼', 'down'); text(`${v.page + 1} of ${Math.ceil(all.length / per)}`, 300, bottom - 42, 24, '#9fdfee'); }
    }
    // home and back, always
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, CH - 92, CW, 92);
    button(40, CH - 80, 150, 64, '‹ Back', 'back'); button(CW / 2 - 60, CH - 80, 120, 64, '◯', 'home');
    s.tex.needsUpdate = true;
  }
  /** The pipeline's screens, red on black: the pipe itself (the ask, the run, and its stages, each lit by what it found),
   *  the edits, the testers' asks, and one stage opened, with a way to tell Claude about it. */
  private drawPipe(g: CanvasRenderingContext2D, d: { hit: (x0: number, y0: number, x1: number, y1: number, act: string, arg?: number | string) => void; button: (x: number, y: number, w: number, h: number, text: string, act: string, arg?: number | string, accent?: string, fill?: string) => void; text: (s: string, x: number, y: number, size: number, colour?: string, weight?: number, max?: number) => void; wrapped: (s: string, x: number, y: number, size: number, width: number, colour: string, lines?: number) => number; bottom: number }, v: View): void {
    const { hit, text, wrapped, bottom } = d, redButton = (x: number, y: number, w: number, h: number, t: string, act: string, arg?: number | string, on = false) => d.button(x, y, w, h, t, act, arg, on ? '#ffffff' : RED, on ? 'rgba(255,23,68,0.85)' : 'rgba(255,23,68,0.14)');
    const run = this.pipeRun?.ask === this.pipeAsk ? this.pipeRun : null, prev = this.pipePrev?.ask === this.pipeAsk ? this.pipePrev : null, e = this.pipeEdits;
    const edited = e.seed !== EDITS0.seed || e.matter !== EDITS0.matter || e.grow !== EDITS0.grow || e.physics !== EDITS0.physics;
    if (v.app === 'pipeline') {
      text('Pipeline', 40, 122, 46, RED, 800); text("Claude's build pipeline · ⚡ All for yours and the robots'", 40, 152, 18, PINK, 500, CW - 80);
      g.fillStyle = 'rgba(255,23,68,0.10)'; g.beginPath(); g.roundRect(30, 168, CW - 60, 108, 18); g.fill(); g.strokeStyle = this.typing && this.writingFor === 'ask' ? '#ffffff' : 'rgba(255,23,68,0.75)'; g.lineWidth = 2.5; g.stroke();
      wrapped(this.pipeAsk, 48, 198, 20, CW - 96, '#ffffff', 3); hit(30, 168, CW - 30, 276, 'pask');
      const bw = (CW - 80) / 3;
      redButton(30, 288, bw, 68, '🧪 Tests', 'ptests'); redButton(40 + bw, 288, bw, 68, edited ? '✎ Edits •' : '✎ Edits', 'pedits'); redButton(50 + 2 * bw, 288, bw, 68, this.pipeBusy ? '… Running' : '▶ Run', 'prun', undefined, !this.pipeBusy);
      // what the run found, and against the run before it of the same ask
      if (this.best) text(`★ Searching: ${this.best.done} of ${this.best.of} tried (each matter, two seeds)`, 40, 392, 20, PINK, 600, CW - 80);
      else if (this.pipeBusy) text('Running… a big build takes minutes', 40, 392, 21, PINK, 600);
      else if (run) {
        text(`${run.verdict} · ${run.checks - run.failed}✓ ${run.failed}✗${run.kg ? ` · ${+run.kg.toPrecision(3)} kg` : ''} · ${(run.ms / 1000).toFixed(1)} s`, 40, 390, 22, run.failed || run.verdict === 'NOTHING MADE' ? '#ff5252' : '#69f0ae', 700, CW - 80);
        const cmp = prev ? compare(prev, run) : null;
        if (cmp) text(`${cmp.is === 'better' ? '▲ better' : cmp.is === 'worse' ? '▼ worse' : '= same'} than before: ${cmp.why}`, 40, 418, 18, cmp.is === 'better' ? '#69f0ae' : cmp.is === 'worse' ? '#ff5252' : PINK, 600, CW - 80);
      } else if (this.pipeSaid) wrapped(this.pipeSaid, 40, 390, 18, CW - 80, PINK, 2);
      else text(edited ? 'your edits are on · ▶ Run to see what they do' : "Claude's pipeline as it runs · ▶ Run", 40, 392, 20, PINK, 500, CW - 80);
      // the pipe: each stage a node on it, lit by what it found; press one to open it
      const y0 = 432, sh = 88;
      STAGES.forEach((s0, i) => {
        const st = run?.stages.find((x) => x.id === s0.id), y = y0 + i * sh, cx = 64, cy = y + 34;
        if (i < STAGES.length - 1) { g.strokeStyle = st?.ok === false ? 'rgba(255,82,82,0.5)' : 'rgba(255,23,68,0.65)'; g.lineWidth = 7; g.beginPath(); g.moveTo(cx, cy + 24); g.lineTo(cx, cy + sh - 24); g.stroke(); }
        g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fillStyle = st?.ok === true ? RED : st?.ok === false ? '#000000' : 'rgba(255,23,68,0.16)'; g.fill(); g.lineWidth = 4; g.strokeStyle = st?.ok === false ? '#ff5252' : RED; g.stroke();
        g.font = `700 24px ${FONT}`; g.fillStyle = st?.ok === false ? '#ff5252' : '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(st?.ok === true ? '✓' : st?.ok === false ? '✗' : String(i + 1), cx, cy + 1); g.textAlign = 'left';
        text(s0.title, 104, y + 30, 25, '#ffffff', 700); text(st ? st.line : s0.does, 104, y + 58, 17, '#ffb3b3', 400, CW - 134);
        hit(30, y, CW - 30, y + sh - 8, 'pstage', s0.id);
      });
      const b4 = (CW - 90) / 4, yb = y0 + STAGES.length * sh + 4;
      redButton(30, yb, b4, 60, '⟲ Reset', 'pclear'); redButton(40 + b4, yb, b4, 60, `↻ ${this.runs.length}`, 'pruns'); redButton(50 + 2 * b4, yb, b4, 60, this.best ? '★ …' : '★ Best', 'pbest'); redButton(60 + 3 * b4, yb, b4, 60, '⚡ All', 'pall');
    } else if (v.app === 'pipeedits') {
      text('Edits', 40, 122, 46, RED, 800); text('change the pipeline, ▶ Run, and see if more holds', 40, 152, 18, PINK, 500, CW - 80);
      const row = (y: number, title: string, says: string) => { g.fillStyle = 'rgba(255,23,68,0.08)'; g.beginPath(); g.roundRect(30, y, CW - 60, 156, 18); g.fill(); text(title, 48, y + 38, 25, '#ffffff', 700); wrapped(says, 48, y + 68, 17, CW - 96, '#ffb3b3', 2); };
      row(172, `Seed ${e.seed}`, 'which of the lawful designs is drawn first: each seed is another draw, every one checked'); redButton(48, 172 + 96, 110, 52, '−', 'pseed', -1); redButton(170, 172 + 96, 110, 52, '+', 'pseed', 1);
      row(340, `Matter: ${e.matter}`, 'what its frame may be made of; with any, each is grown and the lightest that holds is kept'); redButton(48, 340 + 96, 232, 52, 'next matter ›', 'pmatter');
      row(508, `Read into conditions: ${e.grow ? 'on' : 'off'}`, 'off: the ask is not read into loads, holds and reach to grow from; only the ways kept for what it is called make it'); redButton(48, 508 + 96, 232, 52, e.grow ? 'turn off' : 'turn on', 'pgrow', undefined, !e.grow);
      row(676, `Physics: ${e.physics ? 'on' : 'off'}`, 'off: faster; letting it go and pushing it in the physics engine are skipped, statics kept'); redButton(48, 676 + 96, 232, 52, e.physics ? 'turn off' : 'turn on', 'pphys', undefined, !e.physics);
      redButton(30, 852, CW - 60, 68, edited ? "↺ Back to Claude's pipeline" : "This is Claude's pipeline", 'preset');
      wrapped('What you change is kept on this headset. To change the pipeline itself, open a stage and tell Claude: it is tried on the testers\' asks and kept only if more of them hold.', 40, 954, 17, CW - 80, PINK, 4);
    } else if (v.app === 'pipeall') {
      // every pipeline, on one engine: Claude's build pipeline, yours, and each robot's rules
      const per = 6, all = this.host.pipelines(), start = v.page * per;
      text('All pipelines', 40, 122, 44, RED, 800); wrapped("One engine runs them all. Claude's build pipeline is a step any of them can use (\"pipeline run\"); a robot's rules are a pipeline of IF → THEN.", 40, 150, 16, CW - 80, PINK, 3);
      g.fillStyle = 'rgba(255,23,68,0.22)'; g.beginPath(); g.roundRect(30, 210, CW - 60, 84, 16); g.fill();
      text("Claude's build pipeline", 46, 244, 22, '#ffffff', 700); text('read → conditions → grow → make → check → scale', 46, 274, 15, PINK, 500, CW - 92); hit(30, 210, CW - 30, 294, 'pclaude');
      all.slice(start, start + per).forEach((x, j) => {
        const y = 306 + j * 104; g.fillStyle = x.robot ? 'rgba(255,145,0,0.10)' : 'rgba(255,23,68,0.08)'; g.beginPath(); g.roundRect(30, y, CW - 60, 94, 16); g.fill();
        text(`${x.robot ? '🤖 ' : ''}${x.title}`, 46, y + 34, 21, '#ffffff', 700, CW - 92);
        text(`${x.armed ? '⚡ armed: starts by itself' : 'by hand: ▶ Run'}${x.last ? ` · last ${x.last}` : ''}`, 46, y + 66, 15, x.armed ? '#69f0ae' : PINK, 500, CW - 92);
        hit(30, y, CW - 30, y + 94, 'popen', x.id);
      });
      if (!all.length) wrapped('None of your own yet: ＋ New pipeline below.', 40, 340, 19, CW - 80, PINK);
      if (this.pipeSaid) wrapped(this.pipeSaid, 40, bottom - 110, 15, CW - 80, PINK, 2);
      redButton(30, bottom - 74, (CW - 70) / 2, 64, '＋ New pipeline', 'pnew'); redButton(40 + (CW - 70) / 2, bottom - 74, 76, 64, '▲', 'up'); redButton(126 + (CW - 70) / 2, bottom - 74, 76, 64, '▼', 'down');
    } else if (v.app === 'piperuns') {
      const per = 6, list = [...this.runs].reverse(), start = v.page * per;
      text('Runs', 40, 122, 46, RED, 800); text('every run kept · ↻ runs it again as it was', 40, 152, 18, PINK, 500, CW - 80);
      if (!list.length) wrapped('None yet: ▶ Run on the pipeline, or ★ Best.', 40, 200, 22, CW - 80, PINK);
      list.slice(start, start + per).forEach((k, j) => {
        const y = 176 + j * 128, i = this.runs.length - 1 - (start + j), ok = k.failed === 0 && k.verdict !== 'NOTHING MADE';
        g.fillStyle = 'rgba(255,23,68,0.08)'; g.beginPath(); g.roundRect(30, y, CW - 60, 116, 16); g.fill();
        text(`${k.verdict} · ${k.checks - k.failed}✓ ${k.failed}✗${k.kg ? ` · ${+k.kg.toPrecision(3)} kg` : ''}`, 46, y + 30, 19, ok ? '#69f0ae' : '#ff5252', 700, CW - 200);
        text(`${k.edits.matter}, seed ${k.edits.seed}${k.edits.grow ? '' : ', conditions off'}${k.edits.physics ? '' : ', no physics'} · ${k.by} · ${new Date(k.at).toLocaleTimeString()}`, 46, y + 56, 15, PINK, 500, CW - 200);
        wrapped(k.ask, 46, y + 80, 15, CW - 210, '#ffd0d0', 2);
        redButton(CW - 150, y + 24, 104, 68, '↻', 'prerun', i);
      });
      redButton(30, bottom - 92, 120, 64, '▲', 'up'); redButton(160, bottom - 92, 120, 64, '▼', 'down'); text(`${v.page + 1} of ${Math.max(1, Math.ceil(list.length / per))}`, 300, bottom - 50, 22, PINK);
    } else if (v.app === 'pipetests') {
      const held = TEST_ASKS.filter((t) => t.last === 'holds').length, per = 5, start = v.page * per;
      text('Tests', 40, 122, 46, RED, 800); text(`asks AI testers wrote · ${held} of ${TEST_ASKS.length} held, Claude's last run`, 40, 152, 17, PINK, 500, CW - 80);
      text(TEST_ASKS_RUN, 40, 176, 15, '#ff8a80', 400, CW - 80);
      TEST_ASKS.slice(start, start + per).forEach((t, k) => {
        const y = 194 + k * 136, i = start + k, ok = t.last === 'holds';
        g.fillStyle = t.ask === this.pipeAsk ? 'rgba(255,23,68,0.22)' : 'rgba(255,23,68,0.08)'; g.beginPath(); g.roundRect(30, y, CW - 60, 124, 16); g.fill();
        text(`${i + 1}. by ${t.by}`, 46, y + 28, 17, '#ffffff', 700, CW - 230); g.textAlign = 'right'; text(ok ? '✓ holds' : t.last === 'nothing made' ? '— nothing made' : '✗ fails', CW - 46, y + 28, 17, ok ? '#69f0ae' : '#ff5252', 700); g.textAlign = 'left';
        wrapped(t.ask, 46, y + 54, 16, CW - 92, '#ffd0d0', 3); hit(30, y, CW - 30, y + 124, 'ptest', i);
      });
      redButton(30, bottom - 92, 120, 64, '▲', 'up'); redButton(160, bottom - 92, 120, 64, '▼', 'down'); text(`${v.page + 1} of ${Math.ceil(TEST_ASKS.length / per)}`, 300, bottom - 50, 22, PINK);
    } else {
      // one stage, opened: what it does, what it found, and a way to tell Claude about it
      const s0 = STAGES.find((x) => x.id === this.pipeStage)!, st = run?.stages.find((x) => x.id === s0.id), per = 7, lines = st?.lines ?? [];
      text(s0.title, 40, 122, 46, RED, 800); let y = 152 + wrapped(s0.does, 40, 152, 18, CW - 80, PINK, 3);
      if (st) { text(`${st.ok === true ? '✓' : st.ok === false ? '✗' : '·'} ${st.line}`, 40, y + 18, 20, st.ok === false ? '#ff5252' : '#ffffff', 700, CW - 80); y += 36; } else { text('not run yet: ▶ Run on the pipeline first', 40, y + 18, 19, PINK); y += 36; }
      lines.slice(v.page * per, v.page * per + per).forEach((l) => { y += 8 + wrapped(l, 40, y + 18, 16, CW - 80, l.startsWith('✗') ? '#ff8a80' : '#ffe0e0', 4); });
      if (lines.length > per) { redButton(30, bottom - 196, 120, 60, '▲', 'up'); redButton(160, bottom - 196, 120, 60, '▼', 'down'); text(`${v.page + 1} of ${Math.ceil(lines.length / per)}`, 300, bottom - 156, 20, PINK); }
      if (this.pipeSaid) wrapped(this.pipeSaid, 40, bottom - 116, 16, CW - 80, PINK, 2);
      redButton(30, bottom - 74, CW - 60, 66, this.typing && this.writingFor === 'tell' ? '⌨ Writing to Claude…' : '✉ Tell Claude about this step', 'ptell', undefined, !(this.typing && this.writingFor === 'tell'));
    }
  }
  /** Where a part of the screen is in the room, for a test that points at it: by what it does (and its argument). */
  pointOf(act: string, arg?: number | string): THREE.Vector3 | null {
    const r = this.own.hits.find((h) => h.act === act && (arg === undefined || h.arg === arg)); if (!r) return null;
    this.screen.updateMatrixWorld(); return this.screen.localToWorld(new THREE.Vector3((((r.x0 + r.x1) / 2) / CW - 0.5) * SW, (0.5 - ((r.y0 + r.y1) / 2) / CH) * SH, 0.001));
  }
}
/** The Pipeline's icon, red on black: a root, and the network grown from it, three ways, each to what it feeds. */
function pipeIcon(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 512, P = (px: number, py: number): [number, number] => [x + px * k, y + py * k];
  const gr = g.createRadialGradient(x + s / 2, y + s * 0.45, 0, x + s / 2, y + s / 2, s * 0.6); gr.addColorStop(0, '#4a000c'); gr.addColorStop(1, '#000000');
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, s, s, s * 0.2); g.fill(); g.strokeStyle = RED; g.lineWidth = 2.5; g.stroke();
  g.save(); g.shadowColor = RED; g.shadowBlur = 10 * (s / 100); g.strokeStyle = RED; g.lineWidth = 26 * k; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(...P(256, 410)); g.lineTo(...P(256, 300)); g.lineTo(...P(256, 150));
  g.moveTo(...P(256, 300)); g.bezierCurveTo(...P(256, 240), ...P(150, 240), ...P(150, 170));
  g.moveTo(...P(256, 300)); g.bezierCurveTo(...P(256, 240), ...P(362, 240), ...P(362, 170)); g.stroke();
  g.fillStyle = RED; for (const [cx, cy, r] of [[256, 410, 36], [150, 150, 32], [256, 124, 32], [362, 150, 32]] as const) { g.beginPath(); g.arc(...P(cx, cy), r * k, 0, Math.PI * 2); g.fill(); }
  g.restore(); g.beginPath(); g.arc(...P(256, 300), 20 * k, 0, Math.PI * 2); g.fillStyle = '#000000'; g.fill(); g.lineWidth = 11 * k; g.strokeStyle = RED; g.stroke();
}
const visible = (o: THREE.Object3D) => { for (let x: THREE.Object3D | null = o; x; x = x.parent) if (!x.visible) return false; return true; };
