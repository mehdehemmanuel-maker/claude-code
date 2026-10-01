// App: wires the document (source of truth) to physics, rendering, audio and UI.

import * as THREE from 'three';
import { getMaterial, MATERIALS, type Material } from '../data/materials';
import { getConnectorKind, hasConnectorKind } from '../connectors/registry';
import { effectiveParams, getPartKind, hasPartKind, type PartDims } from '../parts/registry';
import { shapeBounds } from '../parts/shapes';
import { commitPoses, connectedComponent, deleteParts, duplicateParts, fragmentOf, insertFragment, newDoc, recordFracture, setConnectionState, setFrozen, type Fragment } from '../doc/commands';
import { endpointWorld, isBent, partLayout, segmentPose } from './segments';
import { segmentBodyId, segmentOffset, segmentOfFrame } from '../parts/registry';
import { canonicalPose, composePose, length, relativePose, sub, transformPoint } from '../doc/math';
import { DocStore, touched, type Change, type ChangeSource } from '../doc/store';
import type { BuildDoc, Connection, Part, Pose, Vec3 } from '../doc/types';
import { decodeDocText, encodeDocText, fromShareCode, toShareCode, DecodeError } from '../persistence/codec';
import { PhysicsClient } from '../physics/client';
import { poolFluid, realFloor, workshopEnvironment } from '../physics/environment';
import type { GrabMode, PhysicsEvent, RoomSurface } from '../physics/protocol';
import type { SimSettings } from '../doc/types';
import { AudioEngine } from '../audio/audio';
import { SceneView } from '../render/view';
import { Particles } from '../render/particles';
import { FrameBudget } from '../diagnostics/budget';
import { AMBIENT, thermalOf, warm } from '../engineering/thermal';

/** What a browser keeps for one site in local storage, in characters (Chromium, as in the Quest browser). */
export const STORAGE_CHARS = 5_000_000;
/** Parts this close (m) count as resting on each other. */
const TOUCHING = 0.005;
import { BuildLibrary } from './library';
import type { Ego } from '../assistant/ego';
import { LiveState } from './live';

export interface Settings {
  grabMode: GrabMode;
  placeFrozen: boolean;
  /** Build phase: physics holds every part still and what you move snaps to the grid; Play runs the build. */
  build: boolean;
  grid: number;
  angleSnap: number;
  /** Everything you move or place snaps to the grid and the angle step, in any mode (Build mode always does). */
  gridLock: boolean;
  /** A part placed on another lines up with it: square to it, flush on its face, edges and centres matched. */
  smartSnap: boolean;
  strength: number;
  pokeImpulse: number;
  timeScale: number;
  paused: boolean;
  volume: number;
  particles: boolean;
  shadows: boolean;
  playerScale: number;
}

interface Checkpoint {
  label: string;
  time: number;
  doc: BuildDoc;
  velocities: Map<string, { linear: Vec3; angular: Vec3 }>;
}

export type Toast = { text: string; kind: 'info' | 'warn' | 'break' | 'ok' };

/** Where the build lives: the virtual workshop, or the user's real room seen through passthrough. */
export type WorldKind = 'workshop' | 'mixed';

const ENV_MATERIAL = getMaterial('concrete.c30');

/** Where Ego's reports go: new issues here are how Claude hears them. */
export const REPORT_REPO = 'mehdehemmanuel-maker/claude-code';

/** An empty workshop: the floor and its pool, nothing built. */
function emptyWorkshop(): BuildDoc {
  const d = newDoc();
  d.sim.fluids = [poolFluid()];
  return d;
}

export class App {
  readonly store: DocStore;
  readonly live = new LiveState();
  readonly audio = new AudioEngine();
  readonly particles = new Particles();
  readonly view: SceneView;
  readonly settings: Settings = {
    grabMode: 'physical', placeFrozen: false, build: false, grid: 0.01, angleSnap: 15, gridLock: false, smartSnap: true, strength: 250, pokeImpulse: 6,
    timeScale: 1, paused: false, volume: 0.8, particles: true, shadows: true, playerScale: 1,
  };
  selection = { parts: new Set<string>(), conn: null as string | null };
  spawnKind = 'block';
  spawnMaterial: string | null = null;
  /** The Join page's choice; 'auto' (Best join) lets the planner pick the process for the materials. */
  joinKind = 'auto';
  channels: Record<string, number> = { throttle: 0, steer: 0, aux: 0 };
  simTime = 0;
  fps = 0;
  checkpoints: Checkpoint[] = [];
  /** Visual pose overrides (e.g. parts being dragged before physics reports). */
  readonly overrides = new Map<string, Pose>();
  private mirrorParts = new Map<string, Part>();
  private mirrorConns = new Map<string, Connection>();
  private listeners = new Set<() => void>();
  private toastListeners = new Set<(t: Toast) => void>();
  private stepOnce = false;
  private lastChannels = '';
  private lastSlow = 0;
  private frames = 0;
  private lastStorageCheck = -Infinity;
  private storageWarned = false;
  private fpsTime = 0;
  onFrame: ((dt: number, time: number) => void)[] = [];
  /** What your right hand points at now (set by the headset), for "look at this". */
  pointing: (() => { id: string | null; point: Vec3 } | null) | null = null;
  /** The next trigger pull shows Ego what you point at, instead of using the tool. */
  showArmed = false;
  /** Names for the per-frame work, for the frame budget (by position in onFrame). */
  onFrameNames: string[] = [];
  /** Where each frame's time goes, and the watchdog's finding when a subsystem makes it run long. */
  readonly budget = new FrameBudget();

  /** Run `fn` every frame, timed as `name` in the frame budget. */
  everyFrame(name: string, fn: (dt: number, time: number) => void) {
    this.onFrame.push(fn);
    this.onFrameNames[this.onFrame.length - 1] = name;
  }
  /** Everything the physics reports (breaks, contacts, slips...), as it arrives, before the app acts on it. */
  eventListeners: ((e: PhysicsEvent) => void)[] = [];
  /** The assistant, once the headset tools exist (main.ts). */
  ego: Ego | null = null;
  /** Best join's first try for a pair, from what you usually choose (Ego's memory), and where your choices go. */
  joinPreference: ((a: Material, b: Material | null) => string | null) | null = null;
  joinChosen: ((a: Material, b: Material | null, kind: string) => void) | null = null;
  /** Called after a whole build is loaded (template, file, share code, rewind). */
  onLoad: (() => void)[] = [];
  world: WorldKind = 'workshop';
  /** The user's real room as last scanned (world coordinates), and how it is shown. */
  room: RoomSurface[] = [];
  roomStyle: 'mixed' | 'walk' | 'none' = 'none';
  /** Walk mode: whether the real walls and furniture are solid to the parts. */
  roomSolid = true;
  showScan = false;

  private constructor(readonly renderer: THREE.WebGLRenderer, readonly physics: PhysicsClient, doc: BuildDoc) {
    this.store = new DocStore(doc);
    this.view = new SceneView(renderer);
    this.view.scene.add(this.particles.group);
    this.physics.onResult((r) => this.live.ingest(r));
    this.sendEnvironment();
    this.store.subscribe((changes, source) => this.reconcile(changes, source));
    this.reconcile([], 'load');
  }

  static async create(canvasHost: HTMLElement, physicsMode: 'worker' | 'inline'): Promise<App> {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.xr.enabled = true;
    canvasHost.appendChild(renderer.domElement);
    const doc = emptyWorkshop();
    const physics = await PhysicsClient.create(doc.sim, physicsMode);
    return new App(renderer, physics, doc);
  }

  // ---------------------------------------------------------------------------------------------
  // world: workshop or the real room

  private sendEnvironment() {
    const boxes = this.world === 'workshop' ? workshopEnvironment() : realFloor();
    this.physics.send({ op: 'environment', boxes, materials: Object.fromEntries(MATERIALS.map((m) => [m.id, m])) });
  }

  /** The build's sim settings as they apply in this world (the workshop's test pool is not in a real room). */
  private worldSim(sim: SimSettings): SimSettings {
    if (this.world === 'workshop') return sim;
    const pool = poolFluid().id;
    return { ...sim, fluids: sim.fluids.filter((f) => f.id !== pool) };
  }

  setWorld(world: WorldKind) {
    if (world === this.world) return;
    this.world = world;
    this.sendEnvironment();
    this.physics.send({ op: 'sim', sim: this.worldSim(this.doc.sim) });
    this.view.setWorkshopVisible(world === 'workshop');
    this.notify();
  }

  /**
   * The real room from the headset's scan. Mixed reality: every surface is solid and hides what is behind it.
   * Walk mode: the walls and furniture (what is drawn) are solid unless turned off; floor and ceiling are left to
   * the workshop so a build is not boxed in by a ceiling nobody can see.
   */
  setRoom(surfaces: RoomSurface[], style: 'mixed' | 'walk' | 'none') {
    this.room = surfaces;
    this.roomStyle = style;
    this.applyRoom();
  }

  applyRoom() {
    const style = this.roomStyle;
    let solid: RoomSurface[] = [];
    if (style === 'mixed') solid = this.room;
    else if (style === 'walk' && this.roomSolid) solid = this.room.filter((s) => !['floor', 'ceiling', 'global mesh'].includes(s.label));
    this.physics.send({ op: 'room', surfaces: solid });
    this.view.setRoom(this.room, style, this.showScan);
    this.notify();
  }

  // ---------------------------------------------------------------------------------------------
  // change plumbing

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onToast(fn: (t: Toast) => void) {
    this.toastListeners.add(fn);
  }

  toast(text: string, kind: Toast['kind'] = 'info') {
    for (const l of this.toastListeners) l({ text, kind });
  }

  notify() {
    for (const l of this.listeners) l();
  }

  get doc() {
    return this.store.doc;
  }

  /** Whether the build has motors or servos on the stick channels (throttle, steer): something to drive. */
  hasStickControls() {
    return Object.values(this.doc.connections).some((c) => {
      if (c.state.status === 'broken') return false;
      const ch = c.params['channel'];
      return (c.kind === 'motor' || c.kind === 'servo') && (ch === 'throttle' || ch === 'steer' || ch === undefined);
    });
  }

  private reconcile(changes: Change[], source: ChangeSource) {
    const doc = this.store.doc;
    if (source === 'load') {
      this.physics.send({ op: 'clear' });
      this.physics.send({ op: 'sim', sim: this.worldSim(doc.sim) });
      this.mirrorParts.clear();
      this.mirrorConns.clear();
      for (const p of Object.values(doc.parts)) {
        this.physics.send({ op: 'upsertPart', part: this.physicsPart(p), material: this.materialOf(p), keepLivePose: false });
        this.mirrorParts.set(p.id, structuredClone(p));
      }
      for (const c of Object.values(doc.connections)) {
        this.physics.send({ op: 'upsertConnection', conn: c, materials: doc.materials });
        this.mirrorConns.set(c.id, structuredClone(c));
      }
      this.view.syncParts(doc, 'all');
      this.view.syncConnections(doc, 'all');
      for (const p of Object.values(doc.parts)) {
        const o = this.view.partObject(p.id);
        if (o) { o.position.set(...p.pose.p); o.quaternion.set(...p.pose.q); }
      }
      this.selection = { parts: new Set(), conn: null };
      this.view.setSelection([], null);
      this.notify();
      for (const f of this.onLoad) f();
      return;
    }
    const t = touched(changes);
    if (t.materials.size > 0) for (const p of Object.values(doc.parts)) if (t.materials.has(p.material)) t.parts.add(p.id);
    for (const id of t.parts) {
      const part = doc.parts[id];
      const prev = this.mirrorParts.get(id);
      if (!part) {
        this.physics.send({ op: 'removePart', id });
        this.mirrorParts.delete(id);
        this.selection.parts.delete(id);
        continue;
      }
      const poseChanged = !prev || JSON.stringify(prev.pose) !== JSON.stringify(part.pose);
      const shapeChanged = !prev || prev.kind !== part.kind || prev.material !== part.material || JSON.stringify(prev.params) !== JSON.stringify(part.params) || prev.frozen !== part.frozen;
      const damageChanged = !!prev && JSON.stringify(prev.damage) !== JSON.stringify(part.damage);
      const live = this.live.latest(id);
      const nearLive = live ? length(sub(live.p, part.pose.p)) < 2e-3 : false;
      if (!prev) {
        this.physics.send({ op: 'upsertPart', part: this.physicsPart(part), material: this.materialOf(part), keepLivePose: false });
      } else if (shapeChanged) {
        this.physics.send({ op: 'upsertPart', part: this.physicsPart(part), material: this.materialOf(part), keepLivePose: !poseChanged || nearLive });
      } else if (poseChanged && !nearLive) {
        this.physics.send({ op: 'setPose', id, pose: part.pose });
      }
      // undo / redo / repair of a fracture: physics re-seats or re-breaks the bonds (a no-op for its own events)
      if (prev && !shapeChanged && damageChanged) this.physics.send({ op: 'damage', id, damage: part.damage });
      this.mirrorParts.set(id, structuredClone(part));
    }
    for (const id of t.connections) {
      const c = doc.connections[id];
      const prev = this.mirrorConns.get(id);
      if (!c) {
        this.physics.send({ op: 'removeConnection', id });
        this.mirrorConns.delete(id);
        if (this.selection.conn === id) this.selection.conn = null;
        continue;
      }
      if (prev && prev.state.status === 'broken' && c.state.status !== 'broken') this.realign(c);
      this.physics.send({ op: 'upsertConnection', conn: c, materials: doc.materials });
      this.mirrorConns.set(id, structuredClone(c));
    }
    if (t.sim) this.physics.send({ op: 'sim', sim: this.worldSim(doc.sim) });
    this.view.syncParts(doc, t.parts);
    this.view.syncConnections(doc, t.connections);
    this.view.setSelection(this.selection.parts, this.selection.conn);
    this.notify();
  }

  /** Undoing a failure: bring part B back to where the joint frames coincide before rebuilding it. */
  private realign(c: Connection) {
    if (!c.b) return;
    const world = this.endpointWorld(c.a);
    const partB = this.store.doc.parts[c.b.part];
    if (!world || !partB) return;
    const origin = { p: [0, 0, 0] as Vec3, q: [0, 0, 0, 1] as [number, number, number, number] };
    const layout = partLayout(partB);
    let poseB: Pose;
    if (layout) {
      // seat the segment the joint is on, and move the whole part rigidly with it
      const s = segmentOfFrame(layout, c.b.frame);
      const segTarget = composePose(world, relativePose(s.frame, origin));
      const segNow = segmentPose(partB, layout, s.seg, (id) => this.livePose(id));
      const partNow = this.livePose(partB.id) ?? partB.pose;
      poseB = segNow ? composePose(segTarget, relativePose(segNow, partNow)) : composePose(segTarget, relativePose(segmentOffset(layout, s.seg), origin));
    } else {
      poseB = composePose(world, relativePose(c.b.frame, origin));
    }
    this.physics.send({ op: 'setPose', id: c.b.part, pose: poseB });
  }

  /** World pose of a joint endpoint (on the segment it is attached to, for breakable parts). */
  endpointWorld(ep: { part: string; frame: Pose }): Pose | null {
    return endpointWorld(this.store.doc.parts[ep.part], ep, (id) => this.livePose(id));
  }

  materialOf(p: Part): Material {
    return this.store.doc.materials[p.material] ?? getMaterial(p.material);
  }

  partDims(p: Part): PartDims {
    const kind = getPartKind(p.kind);
    return kind.dims(effectiveParams(kind, p.params, this.materialOf(p)));
  }

  /** Live (physics) pose if known, otherwise the design pose. */
  livePose(id: string): Pose | null {
    return this.overrides.get(id) ?? this.live.latest(id) ?? this.store.doc.parts[id]?.pose ?? null;
  }

  // ---------------------------------------------------------------------------------------------
  // selection and bulk actions

  select(parts: Iterable<string>, conn: string | null = null) {
    this.selection = { parts: new Set(parts), conn };
    this.view.setSelection(this.selection.parts, conn);
    this.notify();
  }

  toggleSelect(id: string) {
    const s = new Set(this.selection.parts);
    if (s.has(id)) s.delete(id); else s.add(id);
    this.select(s, null);
  }

  deleteSelection() {
    if (this.selection.conn) {
      this.store.transact('Disconnect', (tx) => tx.delete('connections', this.selection.conn!));
      this.audio.ui('delete');
      return;
    }
    const ids = [...this.selection.parts];
    if (!ids.length) return;
    deleteParts(this.store, ids);
    this.audio.ui('delete');
  }

  duplicateSelection() {
    const ids = [...this.selection.parts];
    if (!ids.length) return;
    this.commitLivePoses();
    const map = duplicateParts(this.store, ids, [0.05, 0.05, 0.05]);
    this.select(map.values());
    this.audio.ui('place');
  }

  freezeToggle(ids: string[]) {
    if (!ids.length) return;
    const anyDynamic = ids.some((id) => this.store.doc.parts[id] && !this.store.doc.parts[id]!.frozen);
    this.commitLivePoses();
    setFrozen(this.store, ids, anyDynamic);
    this.audio.ui(anyDynamic ? 'freeze' : 'unfreeze');
  }

  component(id: string) {
    return [...connectedComponent(this.store.doc, id)];
  }

  /**
   * Everything that is together with these parts as you built it: what is joined to them, and what rests on or
   * against them (touching within a few millimetres), and so on outwards. A part you froze in place as a base is
   * taken only if it is joined in, not because something rests on it.
   */
  together(ids: string[]): string[] {
    const doc = this.store.doc;
    const out = new Set<string>();
    const queue = [...ids.filter((id) => doc.parts[id])];
    const box = new Map<string, ReturnType<App['boundsOf']>>();
    const boundsOf = (id: string) => box.get(id) ?? box.set(id, this.boundsOf([id])).get(id)!;
    const near = (a: ReturnType<App['boundsOf']>, b: ReturnType<App['boundsOf']>) => [0, 1, 2].every((k) => a.min[k]! <= b.max[k]! + TOUCHING && b.min[k]! <= a.max[k]! + TOUCHING);
    const others = Object.keys(doc.parts);
    while (queue.length) {
      const id = queue.pop()!;
      if (out.has(id)) continue;
      out.add(id);
      for (const j of connectedComponent(doc, id)) if (!out.has(j)) queue.push(j);
      const b = boundsOf(id);
      for (const o of others) if (!out.has(o) && !doc.parts[o]!.frozen && near(b, boundsOf(o))) queue.push(o);
    }
    return [...out];
  }

  undo() {
    const t = this.store.undo();
    if (t) this.toast(`Undo: ${t.label}`); else this.audio.ui('error');
  }

  redo() {
    const t = this.store.redo();
    if (t) this.toast(`Redo: ${t.label}`); else this.audio.ui('error');
  }

  // ---------------------------------------------------------------------------------------------
  // time

  togglePause() {
    this.settings.paused = !this.settings.paused;
    this.toast(this.settings.paused ? 'Paused' : 'Running');
    this.notify();
  }

  step() {
    this.settings.paused = true;
    this.stepOnce = true;
    this.notify();
  }

  setTimeScale(s: number) {
    this.settings.timeScale = s;
    this.toast(`Time ×${s}`);
    this.notify();
  }

  // ---------------------------------------------------------------------------------------------
  // checkpoints

  commitLivePoses() {
    const poses = new Map<string, Pose>();
    const segments = new Map<string, Pose[]>();
    const latest = (id: string) => this.live.latest(id);
    for (const id of this.live.ids()) {
      const p = this.live.latest(id);
      const part = this.store.doc.parts[id];
      if (!p || !part || part.frozen) continue;
      const cp = canonicalPose(p);
      if (JSON.stringify(cp) !== JSON.stringify(part.pose)) poses.set(id, cp);
      // broken or bent stock keeps each piece where it is
      const layout = partLayout(part);
      if (layout && (part.damage.broken.length > 0 || isBent(part, layout, latest))) {
        const segs: Pose[] = [];
        for (let k = 0; k < layout.count; k++) {
          const sp = this.live.latest(segmentBodyId(id, k));
          if (!sp) break;
          segs.push(canonicalPose(sp));
        }
        if (segs.length === layout.count && JSON.stringify(segs) !== JSON.stringify(part.damage.segments)) segments.set(id, segs);
      }
    }
    if (poses.size || segments.size) commitPoses(this.store, poses, segments);
    // cure progress is physical state worth keeping
    const cure = this.live.cure;
    const doc = this.store.doc;
    for (const [id, t] of Object.entries(cure)) {
      const c = doc.connections[id];
      if (c && Math.abs(c.state.cure - t) > 1e-3) {
        this.store.transact('Cure', (tx) => tx.update('connections', id, { state: { ...c.state, cure: t } }), { undoable: false });
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // build and play

  /** The build as it was when Play was pressed: Stop returns to it. */
  private buildPoint: Checkpoint | null = null;

  /** What physics is given for a part: in the build phase every part is held still, whatever the document says. */
  private physicsPart(p: Part): Part {
    return this.settings.build && !p.frozen ? { ...p, frozen: true } : p;
  }

  private resyncParts() {
    for (const p of Object.values(this.store.doc.parts)) {
      this.physics.send({ op: 'upsertPart', part: this.physicsPart(p), material: this.materialOf(p), keepLivePose: true });
    }
  }

  /** Into the build phase: everything stops where it is, and that is the design. */
  enterBuild() {
    if (this.settings.build) return;
    this.commitLivePoses();
    this.settings.build = true;
    this.resyncParts();
    this.toast('Build: parts hold still, and what you move snaps to the grid. Play runs it.', 'info');
    this.notify();
  }

  /** Run the build under real physics; Stop comes back to it as it is now. */
  play() {
    if (!this.settings.build) return;
    // Ego looks ahead at what every joint will carry (once she can)
    this.ego?.foresee('play');
    this.ego?.gain('play');
    this.buildPoint = { label: 'the build', time: this.simTime, doc: structuredClone(this.store.doc), velocities: new Map() };
    this.settings.build = false;
    this.resyncParts();
    this.toast('Playing: real physics. Back to build returns to it as it was.', 'info');
    this.notify();
  }

  get canStop() {
    return !this.settings.build && this.buildPoint !== null;
  }

  /** Back to the build as it was when Play was pressed. */
  stop() {
    if (!this.canStop) return;
    this.settings.build = true;
    this.store.restore(structuredClone(this.buildPoint!.doc));
    this.simTime = this.buildPoint!.time;
    this.toast('Back to the build', 'ok');
    this.notify();
  }

  checkpoint(label = 'Checkpoint', announce = true) {
    this.commitLivePoses();
    const velocities = new Map<string, { linear: Vec3; angular: Vec3 }>();
    for (const id of this.live.ids()) {
      const v = this.live.velocity(id);
      if (v) velocities.set(id, v);
    }
    this.checkpoints.push({ label, time: this.simTime, doc: structuredClone(this.store.doc), velocities });
    if (this.checkpoints.length > 12) this.checkpoints.shift();
    if (announce) {
      this.toast(`Checkpoint ${this.checkpoints.length} saved: rewind returns here`, 'ok');
      this.audio.ui('save');
    }
    this.notify();
  }

  rewind(index = this.checkpoints.length - 1) {
    const cp = this.checkpoints[index];
    if (!cp) { this.toast('No checkpoint yet: ⚑ Checkpoint on the tablet (or click the left stick) takes one', 'warn'); this.audio.ui('error'); return; }
    this.store.restore(structuredClone(cp.doc));
    for (const [id, v] of cp.velocities) {
      const p = cp.doc.parts[id];
      if (p && !p.frozen) this.physics.send({ op: 'setPose', id, pose: p.pose, linear: v.linear, angular: v.angular });
    }
    this.simTime = cp.time;
    this.toast(`Rewound to “${cp.label}”`, 'ok');
    this.audio.ui('unfreeze');
  }

  // ---------------------------------------------------------------------------------------------
  // files

  loadDoc(doc: BuildDoc, label: string) {
    this.store.replace(doc);
    this.checkpoints = [];
    // a silent checkpoint, so rewind always has the build as loaded to return to
    this.checkpoint(`Loaded ${label}`, false);
  }

  // your builds (nothing ships pre-made: every build in the library is one you saved)

  readonly library = new BuildLibrary();
  /** The library entry the open build came from, or null for one not yet saved. */
  libraryId: string | null = null;

  /** Save the build: over the one it was opened from, or (`asNew`, or never saved) as a new entry. */
  saveBuild(asNew = false) {
    let entry;
    try {
      entry = this.library.save(this.saveText(), asNew ? null : this.libraryId);
    } catch (e) {
      this.saveFailed('build', e);
      return null;
    }
    this.libraryId = entry.id;
    this.toast(this.library.persistent ? `Saved “${entry.name}”` : `Saved “${entry.name}” for now: this browser keeps no storage, so it goes when the page closes`, this.library.persistent ? 'ok' : 'warn');
    this.audio.ui('click');
    this.notify();
    return entry;
  }

  /**
   * Parts warm by the heat the physics says they took (friction, impacts, bending past yield, induced currents), over
   * their heat capacity, and cool to the room by convection and radiation (engineering/thermal.ts).
   */
  private warmParts(dt: number) {
    const live = this.live;
    const ids = new Set([...Object.keys(live.heatIn), ...live.temps.keys()]);
    if (!ids.size) return;
    for (const id of ids) {
      const p = this.doc.parts[id];
      if (!p) { live.temps.delete(id); continue; }
      const k = getPartKind(p.kind), m = this.materialOf(p), th = thermalOf(m);
      const eff = effectiveParams(k, p.params, m);
      const mass = k.volume(eff, m) * m.density;
      const d = k.dims(eff);
      const area = 2 * (d.length * d.a + d.a * d.b + d.b * d.length);
      const T = warm(live.temps.get(id) ?? AMBIENT, live.heatIn[id] ?? 0, mass, th.c, area, d.length, th.emissivity, dt);
      if (Math.abs(T - AMBIENT) < 1e-4) live.temps.delete(id); else live.temps.set(id, T);
    }
    live.heatIn = {};
  }

  /** A save that didn't stick: said plainly, and a finding for the watchdog (so Ego writes it up). */
  private saveFailed(what: string, e: unknown) {
    const why = e instanceof Error ? e.message : String(e);
    this.toast(`Not saved: ${why}`, 'warn');
    this.audio.ui('error');
    this.live.flag({ kind: 'storage', severity: 'critical', id: '', tick: this.live.ticks, value: this.storageUsed(), limit: STORAGE_CHARS, detail: `a ${what} save failed: ${why}` });
    this.notify();
  }

  /** Characters this app keeps in the browser's storage (it allows about five million per site). */
  storageUsed() {
    let n = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; n += k.length + (localStorage.getItem(k)?.length ?? 0); }
    } catch { /* no storage */ }
    return n;
  }

  openBuild(id: string) {
    const entry = this.library.get(id);
    if (!entry || !this.openText(entry.text, entry.name)) return;
    this.libraryId = id;
    this.toast(`Opened “${entry.name}”`, 'ok');
  }

  deleteBuild(id: string) {
    const entry = this.library.get(id);
    if (!entry) return;
    this.library.remove(id);
    if (this.libraryId === id) this.libraryId = null;
    this.toast(`Deleted “${entry.name}”`, 'info');
    this.notify();
  }

  // templates: assemblies you saved to place again (nothing ships pre-made here either)

  readonly templates = new BuildLibrary(globalThis.localStorage ?? null, 'vrsb.templates', 'Template');
  /** The template the Place tool is stamping out, or null to place single parts. */
  spawnTemplate: string | null = null;

  /** World bounds of parts, from their shapes at their current poses. */
  boundsOf(ids: string[]) {
    const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const id of ids) {
      const part = this.doc.parts[id];
      if (!part) continue;
      const pose = this.livePose(id) ?? part.pose;
      const kind = getPartKind(part.kind);
      const b = shapeBounds(kind.collision(effectiveParams(kind, part.params, this.materialOf(part))));
      for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
        const w = transformPoint(pose, [x, y, z]);
        for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k]!, w[k]!); max[k] = Math.max(max[k]!, w[k]!); }
      }
    }
    return { min, max };
  }

  /** Save parts (an assembly) as a template: its parts and joints, relative to the middle of its base. */
  saveTemplate(ids: string[]) {
    const parts = ids.filter((id) => this.doc.parts[id]);
    if (!parts.length) return null;
    this.commitLivePoses();
    const b = this.boundsOf(parts);
    const base: Pose = { p: [(b.min[0] + b.max[0]) / 2, b.min[1], (b.min[2] + b.max[2]) / 2], q: [0, 0, 0, 1] };
    const frag = fragmentOf(this.doc, parts, (id) => this.doc.parts[id]!.pose, base);
    let entry;
    try {
      entry = this.templates.save(JSON.stringify({ v: 1, ...frag }));
    } catch (e) {
      this.saveFailed('template', e);
      return null;
    }
    this.toast(`Saved template “${entry.name}”: ${frag.parts.length} part${frag.parts.length === 1 ? '' : 's'}, ${frag.connections.length} joint${frag.connections.length === 1 ? '' : 's'}. Place copies from My builds › Templates`, 'ok');
    this.audio.ui('save');
    this.ego?.gain('template');
    this.notify();
    return entry;
  }

  /** A saved template, checked against the catalog (a kind it uses may have gone). */
  templateFragment(id: string): Fragment | null {
    const entry = this.templates.get(id);
    if (!entry) return null;
    try {
      const f = JSON.parse(entry.text) as Fragment & { v: number };
      if (!Array.isArray(f.parts) || !Array.isArray(f.connections)) return null;
      if (f.parts.some((p) => !hasPartKind(p.kind)) || f.connections.some((c) => !hasConnectorKind(c.kind))) return null;
      return { parts: f.parts, connections: f.connections };
    } catch {
      return null;
    }
  }

  /** Stamp out a template with its base at `at`. */
  placeTemplate(id: string, at: Pose) {
    const frag = this.templateFragment(id);
    const name = this.templates.get(id)?.name ?? 'template';
    if (!frag) { this.toast(`“${name}” can't be placed: it uses parts this version doesn't have`, 'warn'); return []; }
    const map = insertFragment(this.store, frag, at, `Place ${name}`);
    this.select(map.values());
    this.audio.ui('place', at.p);
    return [...map.values()];
  }

  deleteTemplate(id: string) {
    const entry = this.templates.get(id);
    if (!entry) return;
    this.templates.remove(id);
    if (this.spawnTemplate === id) this.spawnTemplate = null;
    this.toast(`Deleted template “${entry.name}”`, 'info');
    this.notify();
  }

  /** The tablet's switch: the aux channel, for electromagnets and anything else wired to it. */
  get switchOn() {
    return (this.channels['aux'] ?? 0) > 0;
  }

  toggleSwitch() {
    this.channels['aux'] = this.switchOn ? 0 : 1;
    this.toast(this.switchOn ? 'Switch on: electromagnets on the switch are live' : 'Switch off: electromagnets on the switch let go', 'info');
    this.audio.ui('click');
    this.notify();
  }

  /** An empty workshop to start a new build in. */
  newBuild() {
    this.loadDoc(emptyWorkshop(), 'new build');
    this.libraryId = null;
    this.toast('New build: an empty workshop', 'ok');
  }

  saveText(): string {
    this.commitLivePoses();
    return encodeDocText(this.store.doc);
  }

  shareCode(): string {
    this.commitLivePoses();
    return toShareCode(this.store.doc);
  }

  openText(text: string, label = 'file') {
    try {
      this.loadDoc(decodeDocText(text), label);
      this.libraryId = null;
      return true;
    } catch (e) {
      this.toast(e instanceof DecodeError ? e.message : `Could not open: ${String(e)}`, 'warn');
      this.audio.ui('error');
      return false;
    }
  }

  openShareCode(code: string) {
    try {
      this.loadDoc(fromShareCode(code), 'share code');
      this.libraryId = null;
      return true;
    } catch (e) {
      this.toast(e instanceof DecodeError ? e.message : `Could not open: ${String(e)}`, 'warn');
      this.audio.ui('error');
      return false;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // frame loop

  start() {
    let last = performance.now();
    this.renderer.setAnimationLoop((time) => {
      const dt = Math.min(0.1, Math.max(0, (time - last) / 1000));
      last = time;
      this.frame(dt, time);
    });
  }

  private frame(dt: number, time: number) {
    const t0 = performance.now();
    const B = this.budget;
    this.onFrame.forEach((f, i) => B.measure(this.onFrameNames[i] ?? `frame ${i}`, () => f(dt, time)));
    const ch = JSON.stringify(this.channels);
    if (ch !== this.lastChannels) {
      this.physics.send({ op: 'controls', channels: this.channels });
      this.lastChannels = ch;
    }
    const simDt = this.settings.paused ? 0 : dt * this.settings.timeScale;
    this.simTime += simDt;
    B.measure('physics', () => this.physics.advance(simDt, this.stepOnce));
    B.measure('heat', () => this.warmParts(simDt));
    this.stepOnce = false;
    const events = this.live.pendingEvents.splice(0);
    if (events.length) B.measure('events', () => this.handleEvents(events));
    B.measure('scene', () => this.view.update(this.store.doc, this.live, this.overrides));
    this.particles.enabled = this.settings.particles;
    B.measure('particles', () => this.particles.update(dt));
    if (time - this.lastSlow > 150) {
      this.lastSlow = time;
      B.measure('stress and sound', () => this.slowUpdate());
    }
    if (time - this.lastStorageCheck > 10_000) {
      this.lastStorageCheck = time;
      // the watchdog for saves: warn while there is still room, not when a save has already failed
      const used = this.storageUsed();
      if (used > 0.7 * STORAGE_CHARS && !this.storageWarned) {
        this.storageWarned = true;
        this.live.flag({ kind: 'storage', severity: 'warning', id: '', tick: this.live.ticks, value: used, limit: STORAGE_CHARS, detail: `the headset's storage for this app is ${Math.round((100 * used) / STORAGE_CHARS)}% full: delete builds or templates you don't need before saving more` });
      }
    }
    const cam = this.view.camera;
    const pos = new THREE.Vector3();
    cam.getWorldPosition(pos);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    this.audio.updateListener([pos.x, pos.y, pos.z], [fwd.x, fwd.y, fwd.z], [0, 1, 0]);
    B.measure('render', () => this.renderer.render(this.view.scene, cam));
    B.endFrame(performance.now() - t0);
    for (const a of B.take()) this.live.flag(a);
    this.frames++;
    if (time - this.fpsTime > 500) {
      this.fps = (this.frames * 1000) / (time - this.fpsTime);
      this.frames = 0;
      this.fpsTime = time;
    }
  }

  private slowUpdate() {
    const doc = this.store.doc;
    this.view.applyStress(doc, this.live);
    const creaks: { u: number; p: Vec3; wood: boolean }[] = [];
    let motorFreq = 0, motorLevel = 0, motorPos: Vec3 = [0, 0, 0];
    for (const [id, l] of this.live.loads) {
      const c = doc.connections[id];
      if (!c || c.state.status === 'broken') continue;
      const wa = this.endpointWorld(c.a);
      if (!wa) continue;
      const p = wa.p;
      if (l.u > 0.8) {
        const m = doc.parts[c.a.part] ? this.materialOf(doc.parts[c.a.part]!) : null;
        creaks.push({ u: l.u, p, wood: m?.sound === 'wood' });
      }
      if (c.kind === 'motor') {
        const a = doc.parts[c.b?.part ?? c.a.part];
        const w = a ? this.live.velocity(a.id)?.angular : null;
        const speed = w ? length(w) : 0;
        const f = (speed * Number(c.params['ratio'] ?? 1) / (2 * Math.PI)) * 4;
        if (f > motorFreq) { motorFreq = f; motorLevel = Math.abs(this.channels[String(c.params['channel'])] ?? 0) * 0.05 + (speed > 1 ? 0.02 : 0); motorPos = p; }
      }
    }
    this.audio.updateCreaks(creaks);
    this.audio.updateMotor(motorFreq, motorLevel, motorPos);
    this.notify();
  }

  private handleEvents(events: PhysicsEvent[]) {
    const doc = this.store.doc;
    for (const e of events) {
      for (const l of this.eventListeners) l(e);
      if (e.type === 'contact') {
        const pa = e.a ? doc.parts[e.a] : null;
        const pb = e.b ? doc.parts[e.b] : null;
        const ma = pa ? this.materialOf(pa) : ENV_MATERIAL;
        const mb = pb ? this.materialOf(pb) : ENV_MATERIAL;
        if (pa) this.audio.impact(pa.id, ma, this.partDims(pa), e.impulse, e.speed, e.point);
        if (pb) this.audio.impact(pb.id, mb, this.partDims(pb), e.impulse, e.speed, e.point);
        if (!pa || !pb) this.audio.impact(`env:${e.a ?? e.b}`, ENV_MATERIAL, { length: 2, a: 1, b: 0.2 }, e.impulse * 0.5, e.speed, e.point);
        if (e.speed > 2) {
          const metal = (m: Material) => m.sparks !== 'none';
          if (metal(ma) && (metal(mb) || mb === ENV_MATERIAL)) this.particles.sparksFor(ma, e.point, e.normal, e.speed / 4);
          else if (metal(mb) && ma === ENV_MATERIAL) this.particles.sparksFor(mb, e.point, e.normal, e.speed / 4);
          if (e.impulse > 5 && (ma.sound === 'wood' || ma.sound === 'stone' || mb.sound === 'stone')) this.particles.dustFor(ma.sound === 'wood' ? ma : mb, e.point, Math.min(3, e.impulse / 20));
        }
      } else if (e.type === 'break') {
        const c = doc.connections[e.conn];
        if (!c) continue;
        setConnectionState(this.store, c.id, { status: 'broken', note: e.note }, `Failed: ${getConnectorKind(c.kind).label}`);
        const pa = doc.parts[c.a.part];
        const m = pa ? this.materialOf(pa) : null;
        this.audio.breakSound(m, e.load, e.point);
        if (m) {
          this.particles.debris(m, e.point, 14);
          if (m.sparks !== 'none' && e.mode !== 'instant') this.particles.sparksFor(m, e.point, [0, 1, 0], 1.5);
        }
        this.toast(e.note, 'break');
        this.haptic?.(1, 60);
      } else if (e.type === 'slip') {
        const c = doc.connections[e.conn];
        if (!c) continue;
        setConnectionState(this.store, c.id, { status: 'slipped', note: e.note }, 'Joint slipped');
        this.audio.slip(e.point);
        this.toast(e.note, 'warn');
      } else if (e.type === 'splash') {
        this.audio.splash(e.speed, e.size, e.point);
        this.particles.splash(e.point, e.speed, e.size);
      } else if (e.type === 'fracture') {
        const part = doc.parts[e.part];
        if (!part) continue;
        recordFracture(this.store, part.id, e.bond, e.segments, `Fractured: ${part.name}`);
        const m = this.materialOf(part);
        this.audio.breakSound(m, e.load * (e.mode === 'bending' || e.mode === 'torsion' ? 10 : 1), e.point);
        this.particles.debris(m, e.point, m.sound === 'wood' ? 24 : 12);
        if (m.sound === 'wood' || m.sound === 'stone') this.particles.dustFor(m, e.point, 2);
        this.toast(e.note, 'break');
        this.haptic?.(1, 80);
      } else if (e.type === 'yield') {
        const part = doc.parts[e.part];
        if (!part) continue;
        this.audio.slip(e.point);
        this.toast(e.note, 'warn');
        this.haptic?.(0.5, 40);
      } else if (e.type === 'fault') {
        console.error(`[physics fault] ${e.body}: ${e.note}`);
        this.toast(`${doc.parts[e.part]?.name ?? 'A part'}: ${e.note}`, 'warn');
      }
    }
  }

  /** Optional XR haptic hook (set by the XR controller). */
  haptic?: (intensity: number, ms: number, hand?: string) => void;

  resize(w: number, h: number) {
    this.renderer.setSize(w, h);
    this.view.resize(w, h);
  }
}

export { deleteParts };
