// App: wires the document (source of truth) to physics, rendering, audio and UI.

import * as THREE from 'three';
import { getMaterial, MATERIALS, type Material } from '../data/materials';
import { getConnectorKind } from '../connectors/registry';
import { effectiveParams, getPartKind, type PartDims } from '../parts/registry';
import { commitPoses, connectedComponent, deleteParts, duplicateParts, recordFracture, setConnectionState, setFrozen } from '../doc/commands';
import { endpointWorld, isBent, partLayout, segmentPose } from './segments';
import { segmentBodyId, segmentOffset, segmentOfFrame } from '../parts/registry';
import { canonicalPose, composePose, length, relativePose, sub } from '../doc/math';
import { DocStore, touched, type Change, type ChangeSource } from '../doc/store';
import type { BuildDoc, Connection, Part, Pose, Vec3 } from '../doc/types';
import { decodeDocText, encodeDocText, fromShareCode, toShareCode, DecodeError } from '../persistence/codec';
import { PhysicsClient } from '../physics/client';
import { workshopEnvironment } from '../physics/environment';
import type { GrabMode, PhysicsEvent } from '../physics/protocol';
import { AudioEngine } from '../audio/audio';
import { SceneView } from '../render/view';
import { Particles } from '../render/particles';
import { getTemplate } from '../templates/templates';
import { LiveState } from './live';

export interface Settings {
  grabMode: GrabMode;
  placeFrozen: boolean;
  grid: number;
  angleSnap: number;
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

const ENV_MATERIAL = getMaterial('concrete.c30');

export class App {
  readonly store: DocStore;
  readonly live = new LiveState();
  readonly audio = new AudioEngine();
  readonly particles = new Particles();
  readonly view: SceneView;
  readonly settings: Settings = {
    grabMode: 'physical', placeFrozen: false, grid: 0.01, angleSnap: 15, strength: 250, pokeImpulse: 6,
    timeScale: 1, paused: false, volume: 0.8, particles: true, shadows: true, playerScale: 1,
  };
  selection = { parts: new Set<string>(), conn: null as string | null };
  spawnKind = 'block';
  spawnMaterial: string | null = null;
  joinKind = 'bolted';
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
  private fpsTime = 0;
  onFrame: ((dt: number, time: number) => void)[] = [];

  private constructor(readonly renderer: THREE.WebGLRenderer, readonly physics: PhysicsClient, doc: BuildDoc) {
    this.store = new DocStore(doc);
    this.view = new SceneView(renderer);
    this.view.scene.add(this.particles.group);
    this.physics.onResult((r) => this.live.ingest(r));
    this.physics.send({ op: 'environment', boxes: workshopEnvironment(), materials: Object.fromEntries(MATERIALS.map((m) => [m.id, m])) });
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
    const doc = getTemplate('blank').build();
    const physics = await PhysicsClient.create(doc.sim, physicsMode);
    return new App(renderer, physics, doc);
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

  private reconcile(changes: Change[], source: ChangeSource) {
    const doc = this.store.doc;
    if (source === 'load') {
      this.physics.send({ op: 'clear' });
      this.physics.send({ op: 'sim', sim: doc.sim });
      this.mirrorParts.clear();
      this.mirrorConns.clear();
      for (const p of Object.values(doc.parts)) {
        this.physics.send({ op: 'upsertPart', part: p, material: this.materialOf(p), keepLivePose: false });
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
        this.physics.send({ op: 'upsertPart', part, material: this.materialOf(part), keepLivePose: false });
      } else if (shapeChanged) {
        this.physics.send({ op: 'upsertPart', part, material: this.materialOf(part), keepLivePose: !poseChanged || nearLive });
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
    if (t.sim) this.physics.send({ op: 'sim', sim: doc.sim });
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

  checkpoint(label = 'Checkpoint') {
    this.commitLivePoses();
    const velocities = new Map<string, { linear: Vec3; angular: Vec3 }>();
    for (const id of this.live.ids()) {
      const v = this.live.velocity(id);
      if (v) velocities.set(id, v);
    }
    this.checkpoints.push({ label, time: this.simTime, doc: structuredClone(this.store.doc), velocities });
    if (this.checkpoints.length > 12) this.checkpoints.shift();
    this.toast(`${label} saved (${this.checkpoints.length})`, 'ok');
    this.audio.ui('save');
    this.notify();
  }

  rewind(index = this.checkpoints.length - 1) {
    const cp = this.checkpoints[index];
    if (!cp) { this.toast('No checkpoint yet (press C to take one)', 'warn'); this.audio.ui('error'); return; }
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
    this.checkpoint(`Loaded ${label}`);
  }

  loadTemplate(id: string) {
    const t = getTemplate(id);
    this.loadDoc(t.build(), t.name);
    this.toast(`${t.name}: ${t.tryThis[0] ?? ''}`, 'info');
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
    for (const f of this.onFrame) f(dt, time);
    const ch = JSON.stringify(this.channels);
    if (ch !== this.lastChannels) {
      this.physics.send({ op: 'controls', channels: this.channels });
      this.lastChannels = ch;
    }
    const simDt = this.settings.paused ? 0 : dt * this.settings.timeScale;
    this.simTime += simDt;
    this.physics.advance(simDt, this.stepOnce);
    this.stepOnce = false;
    const events = this.live.pendingEvents.splice(0);
    if (events.length) this.handleEvents(events);
    this.view.update(this.store.doc, this.live, this.overrides);
    this.particles.enabled = this.settings.particles;
    this.particles.update(dt);
    if (time - this.lastSlow > 150) {
      this.lastSlow = time;
      this.slowUpdate();
    }
    const cam = this.view.camera;
    const pos = new THREE.Vector3();
    cam.getWorldPosition(pos);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    this.audio.updateListener([pos.x, pos.y, pos.z], [fwd.x, fwd.y, fwd.z], [0, 1, 0]);
    this.renderer.render(this.view.scene, cam);
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
