// Forge in the headset: statements act through the same commands as the tools (addPart, makeRigidJoin, setPartParam
// ...), so a script builds exactly what hands would, with the same undo, the same Best join and the same physics.

import * as THREE from 'three';
import type { App } from '../app/app';
import { getConnectorKind, CONNECTOR_KINDS } from '../connectors/registry';
import { AUTO_JOIN } from '../connectors/plan';
import { addPart, deleteParts, setFrozen, setPartMaterial, setPartParam, setSim } from '../doc/commands';
import { axisAngle, fromTo, qmul, transformPoint } from '../doc/math';
import type { Pose, Quat, Vec3 } from '../doc/types';
import { getMaterial, STANDARD_GRAVITY } from '../data/materials';
import { effectiveParams, getPartKind } from '../parts/registry';
import { shapeBounds } from '../parts/shapes';
import { defaultsOf, sanitizeParams, type Params } from '../schema/params';
import { makeRigidJoin, rotatedMinY, type ToolManager } from '../tools/tools';
import type { Workshop } from '../app/workshop';
import { boxOf, contactBetween, TOUCH } from '../tools/contact';
import { paramValue, resolveKind, resolveMaterial, resolveParam } from './catalog';
import type { ForgeHost, SimCommand } from './forge';

/** How far apart two faces may be and still count as touching for a joint (the physics' contact slop is 2 mm). */

/**
 * Forge on any workshop: placing parts where it says, joining what touches, changing, removing. What needs a headset
 * (in front of you, play, the selection, your hands) is the AppHost's.
 */
export class BuildHost implements ForgeHost {
  /** Parts placed, newest last (for `last`). */
  protected placed: string[] = [];

  constructor(protected w: Workshop) {}

  kind(word: string) {
    return resolveKind(word);
  }

  material(kind: string, word: string | undefined) {
    return resolveMaterial(kind, word);
  }

  private params(kindId: string, given: Record<string, number | string>, base: Params): Params {
    const kind = getPartKind(kindId);
    const out: Params = { ...base };
    for (const [k, v] of Object.entries(given)) {
      const def = resolveParam(kind.params, k, kind.label);
      out[def.key] = paramValue(def, v, kind.label);
    }
    return sanitizeParams(kind.params, out);
  }

  place(kindId: string, given: Record<string, number | string>, material: string, at: [number, number, number] | null, rot: { axis: 'x' | 'y' | 'z'; angle: number }[], name: string | undefined) {
    const kind = getPartKind(kindId);
    if (name && this.byName(name)) throw new Error(`there is already a part called ${name}`);
    const params = this.params(kindId, given, defaultsOf(kind.params));
    const axes: Record<string, Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
    let q: Quat = kind.spawnRotation;
    for (const r of rot) q = qmul(axisAngle(axes[r.axis]!, r.angle), q);
    const pose: Pose = { p: at ?? this.defaultSpot(kindId, params, material, q), q };
    const part = addPart(this.w.store, { kind: kindId, pose, params, material, frozen: this.w.settings.placeFrozen, name });
    this.placed.push(part.id);
    return part.id;
  }

  /** Where a part goes when Forge doesn't say: on a bench there is no "in front of you". */
  protected defaultSpot(_kindId: string, _params: Params, _material: string, _q: Quat): Vec3 {
    throw new Error('say where it goes: at x y z');
  }

  join(a: string, b: string | null, kindWord: string | undefined) {
    const requested = this.connector(kindWord);
    const contact = b ? this.contact(a, b) : this.onFloor(a);
    const made = makeRigidJoin(this.w, { part: a, point: contact.point, normal: contact.normal, seg: null }, { part: b, seg: null }, requested, fromTo([0, 1, 0], contact.normal));
    const what = made.plan ? (made.plan.substituted ? `${made.plan.substituted} ${made.plan.summary}` : made.plan.summary) : made.kind.label;
    return `${this.label(a)} + ${b ? this.label(b) : 'floor'}: ${what}`;
  }

  private connector(word: string | undefined) {
    if (!word || ['best', 'auto', 'best-join'].includes(word.toLowerCase())) return AUTO_JOIN;
    const w = word.toLowerCase();
    const k = CONNECTOR_KINDS.find((c) => c.id === w || c.label.toLowerCase() === w || c.id.startsWith(w));
    if (!k) throw new Error(`no joint called "${word}" (best, weld, bolted, screwed, glued, riveted, nailed, soldered)`);
    if (k.model !== 'rigid') throw new Error(`${k.label} joints need their axis placed by hand: use the Join tool`);
    return getConnectorKind(k.id).id;
  }

  private contact(a: string, b: string): { point: Vec3; normal: Vec3 } {
    return contactBetween(this.w, a, b, (id) => this.label(id));
  }

  private onFloor(a: string): { point: Vec3; normal: Vec3 } {
    const A = this.box(a);
    const low = Math.min(...A.corners.map((c) => c[1]));
    if (low > TOUCH) throw new Error(`${this.label(a)} isn't on the floor (${Math.round(low * 1000)} mm up): set it down first`);
    const c = transformPoint(A.pose, A.centre);
    return { point: [c[0], low, c[2]], normal: [0, -1, 0] };
  }

  private box(id: string) {
    return boxOf(this.w, id);
  }

  set(id: string, given: Record<string, number | string>, material: string | undefined) {
    const part = this.w.doc.parts[id]!;
    if (Object.keys(given).length) {
      const params = this.params(part.kind, given, part.params);
      for (const [k, v] of Object.entries(params)) if (JSON.stringify(v) !== JSON.stringify(part.params[k])) setPartParam(this.w.store, id, k, v);
    }
    if (material) setPartMaterial(this.w.store, [id], resolveMaterial(part.kind, material));
  }

  remove(id: string) {
    deleteParts(this.w.store, [id]);
  }

  freeze(id: string, frozen: boolean) {
    setFrozen(this.w.store, [id], frozen);
  }

  select(_id: string) {
    /* a bench has no selection */
  }

  command(c: SimCommand): string {
    throw new Error(`"${c}" is for the headset, not the test bench`);
  }

  find(ref: string) {
    const doc = this.w.doc;
    const r = ref.toLowerCase();
    if (r === 'last') {
      for (let i = this.placed.length - 1; i >= 0; i--) if (doc.parts[this.placed[i]!]) return this.placed[i]!;
      const ids = Object.keys(doc.parts);
      return ids.length ? ids[ids.length - 1]! : null;
    }
    if (doc.parts[ref]) return ref;
    return this.byName(ref);
  }

  protected byName(name: string) {
    const n = name.toLowerCase();
    return Object.values(this.w.doc.parts).find((p) => p.name.toLowerCase() === n)?.id ?? null;
  }

  protected label(id: string) {
    return this.w.doc.parts[id]?.name ?? id;
  }
}

/** Forge in the headset: everything a bench can do, plus in front of you, the selection, your hands, and play. */
export class AppHost extends BuildHost {
  constructor(private app: App, private tools: ToolManager | null) {
    super(app);
  }

  protected override defaultSpot(kindId: string, params: Params, material: string, q: Quat): Vec3 {
    return this.inFront(kindId, params, material, q);
  }

  /** Part k of n in a row a metre in front of you, across your view, each resting on the floor. */
  placeInRow(kindId: string, material: string, k: number, n: number) {
    const kind = getPartKind(kindId);
    const params = defaultsOf(kind.params);
    const q = kind.spawnRotation;
    const shape = kind.collision(effectiveParams(kind, params, getMaterial(material)));
    const b = shapeBounds(shape);
    const width = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) + 0.05;
    const p = this.inFront(kindId, params, material, q);
    const cam = this.app.renderer.xr.isPresenting ? this.app.renderer.xr.getCamera() : this.app.view.camera;
    const f = cam.getWorldDirection(new THREE.Vector3()).setY(0);
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    f.normalize();
    const right: Vec3 = [-f.z, 0, f.x];
    const off = (k - (n - 1) / 2) * width;
    const x = p[0] + right[0] * off, z = p[2] + right[2] * off;
    return this.place(kindId, {}, material, [x, this.groundUnder(shape, x, z) - rotatedMinY(shape, q) + 0.0005, z], [], undefined);
  }

  /** The floor `dist` metres in front of you. */
  frontFloor(dist = 1): Vec3 {
    const cam = this.app.renderer.xr.isPresenting ? this.app.renderer.xr.getCamera() : this.app.view.camera;
    const p = cam.getWorldPosition(new THREE.Vector3());
    const f = cam.getWorldDirection(new THREE.Vector3()).setY(0);
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    f.normalize();
    const x = p.x + f.x * dist, z = p.z + f.z * dist;
    return [x, this.app.groundAt(x, z), z];
  }

  /** A metre in front of you, resting on the floor. */
  private inFront(kindId: string, params: Params, material: string, q: Quat): Vec3 {
    const kind = getPartKind(kindId);
    const cam = this.app.renderer.xr.isPresenting ? this.app.renderer.xr.getCamera() : this.app.view.camera;
    const p = cam.getWorldPosition(new THREE.Vector3());
    const f = cam.getWorldDirection(new THREE.Vector3()).setY(0);
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    f.normalize();
    const shape = kind.collision(effectiveParams(kind, params, getMaterial(material)));
    const x = p.x + f.x, z = p.z + f.z;
    return [x, this.groundUnder(shape, x, z) - rotatedMinY(shape, q) + 0.0005, z];
  }

  /** The highest ground under a shape's footprint at a point: on a slope it is set down on it, not into it. */
  private groundUnder(shape: ReturnType<ReturnType<typeof getPartKind>['collision']>, x: number, z: number): number {
    const b = shapeBounds(shape);
    const r = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2;
    return Math.max(...[[0, 0], [r, r], [r, -r], [-r, r], [-r, -r]].map(([dx, dz]) => this.app.groundAt(x + dx!, z + dz!)));
  }

  override freeze(id: string, frozen: boolean) {
    this.app.commitLivePoses();
    super.freeze(id, frozen);
  }

  override select(id: string) {
    this.app.select([id]);
  }

  override command(c: SimCommand) {
    const app = this.app;
    switch (c) {
      case 'play': app.play(); return 'playing';
      case 'build': app.enterBuild(); return 'building';
      case 'undo': app.undo(); return 'undone';
      case 'redo': app.redo(); return 'redone';
      case 'save': app.saveBuild(); return 'saved';
      case 'new': app.newBuild(); return 'new build';
      case 'switch on': if (!app.switchOn) app.toggleSwitch(); return 'switch on';
      case 'switch off': if (app.switchOn) app.toggleSwitch(); return 'switch off';
      case 'gravity earth': setSim(app.store, { gravity: [0, -STANDARD_GRAVITY, 0] }); return 'Earth gravity';
      case 'gravity moon': setSim(app.store, { gravity: [0, -1.62, 0] }); return 'Moon gravity';
      case 'gravity zero': setSim(app.store, { gravity: [0, 0, 0] }); return 'zero gravity';
    }
  }

  override find(ref: string) {
    const r = ref.toLowerCase();
    if (r === 'this' || r === 'selected' || r === 'it') return [...this.app.selection.parts][0] ?? null;
    if (r === 'held') return this.tools?.grab.holding ?? null;
    return super.find(ref);
  }
}
