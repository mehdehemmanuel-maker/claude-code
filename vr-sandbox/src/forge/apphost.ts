// Forge in the headset: statements act through the same commands as the tools (addPart, makeRigidJoin, setPartParam
// ...), so a script builds exactly what hands would, with the same undo, the same Best join and the same physics.

import * as THREE from 'three';
import type { App } from '../app/app';
import { getConnectorKind, CONNECTOR_KINDS } from '../connectors/registry';
import { AUTO_JOIN } from '../connectors/plan';
import { addPart, deleteParts, setFrozen, setPartMaterial, setPartParam, setSim } from '../doc/commands';
import { axisAngle, dot, fromTo, inverseTransformPoint, normalize, qmul, rotate, transformPoint } from '../doc/math';
import type { Pose, Quat, Vec3 } from '../doc/types';
import { getMaterial, STANDARD_GRAVITY } from '../data/materials';
import { effectiveParams, getPartKind } from '../parts/registry';
import { shapeBounds } from '../parts/shapes';
import { defaultsOf, sanitizeParams, type Params } from '../schema/params';
import { makeRigidJoin, rotatedMinY, type ToolManager } from '../tools/tools';
import { paramValue, resolveKind, resolveMaterial, resolveParam } from './catalog';
import type { ForgeHost, SimCommand } from './forge';

/** How far apart two faces may be and still count as touching for a joint (the physics' contact slop is 2 mm). */
const TOUCH = 0.005;

export class AppHost implements ForgeHost {
  /** Parts placed, newest last (for `last`). */
  private placed: string[] = [];

  constructor(private app: App, private tools: ToolManager | null) {}

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
    const pose: Pose = { p: at ?? this.inFront(kindId, params, material, q), q };
    const part = addPart(this.app.store, { kind: kindId, pose, params, material, frozen: this.app.settings.placeFrozen, name });
    this.placed.push(part.id);
    return part.id;
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
    return [p.x + f.x, -rotatedMinY(shape, q) + 0.0005, p.z + f.z];
  }

  join(a: string, b: string | null, kindWord: string | undefined) {
    const requested = this.connector(kindWord);
    const contact = b ? this.contact(a, b) : this.onFloor(a);
    const made = makeRigidJoin(this.app, { part: a, point: contact.point, normal: contact.normal, seg: null }, { part: b, seg: null }, requested, fromTo([0, 1, 0], contact.normal));
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

  /** Where A's surface meets B: the face of A that B lies beyond, at the point nearest B, or an error if they don't touch. */
  private contact(a: string, b: string): { point: Vec3; normal: Vec3 } {
    const A = this.box(a), B = this.box(b);
    const cB = inverseTransformPoint(A.pose, transformPoint(B.pose, B.centre));
    const d = [0, 1, 2].map((k) => (cB[k]! - A.centre[k]!) / Math.max(A.half[k]!, 1e-6));
    const k = [0, 1, 2].reduce((m, x) => (Math.abs(d[x]!) > Math.abs(d[m]!) ? x : m), 0);
    const sgn = Math.sign(d[k]!) || 1;
    const local: Vec3 = [0, 1, 2].map((j) => (j === k ? A.centre[j]! + sgn * A.half[j]! : Math.min(A.centre[j]! + A.half[j]!, Math.max(A.centre[j]! - A.half[j]!, cB[j]!)))) as Vec3;
    const nLocal: Vec3 = [0, 0, 0];
    nLocal[k] = sgn;
    const point = transformPoint(A.pose, local);
    const normal = normalize(rotate(A.pose.q, nLocal));
    // B's nearest point along the normal: none of its box may sit further off A's face than the contact slop
    let near = Infinity;
    for (const c of B.corners) near = Math.min(near, dot([c[0] - point[0], c[1] - point[1], c[2] - point[2]], normal));
    if (near > TOUCH) throw new Error(`${this.label(a)} and ${this.label(b)} aren't touching (${Math.round(near * 1000)} mm apart): a joint needs them in contact`);
    return { point, normal };
  }

  private onFloor(a: string): { point: Vec3; normal: Vec3 } {
    const A = this.box(a);
    const low = Math.min(...A.corners.map((c) => c[1]));
    if (low > TOUCH) throw new Error(`${this.label(a)} isn't on the floor (${Math.round(low * 1000)} mm up): set it down first`);
    const c = transformPoint(A.pose, A.centre);
    return { point: [c[0], low, c[2]], normal: [0, -1, 0] };
  }

  private box(id: string) {
    const part = this.app.doc.parts[id]!;
    const pose = this.app.livePose(id) ?? part.pose;
    const kind = getPartKind(part.kind);
    const bounds = shapeBounds(kind.collision(effectiveParams(kind, part.params, this.app.materialOf(part))));
    const centre: Vec3 = [0, 1, 2].map((k) => (bounds.min[k]! + bounds.max[k]!) / 2) as Vec3;
    const half: Vec3 = [0, 1, 2].map((k) => (bounds.max[k]! - bounds.min[k]!) / 2) as Vec3;
    const corners: Vec3[] = [];
    for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) corners.push(transformPoint(pose, [x, y, z]));
    return { pose, centre, half, corners };
  }

  set(id: string, given: Record<string, number | string>, material: string | undefined) {
    const part = this.app.doc.parts[id]!;
    if (Object.keys(given).length) {
      const params = this.params(part.kind, given, part.params);
      for (const [k, v] of Object.entries(params)) if (JSON.stringify(v) !== JSON.stringify(part.params[k])) setPartParam(this.app.store, id, k, v);
    }
    if (material) setPartMaterial(this.app.store, [id], resolveMaterial(part.kind, material));
  }

  remove(id: string) {
    deleteParts(this.app.store, [id]);
  }

  freeze(id: string, frozen: boolean) {
    this.app.commitLivePoses();
    setFrozen(this.app.store, [id], frozen);
  }

  select(id: string) {
    this.app.select([id]);
  }

  command(c: SimCommand) {
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

  find(ref: string) {
    const doc = this.app.doc;
    const r = ref.toLowerCase();
    if (r === 'this' || r === 'selected' || r === 'it') return [...this.app.selection.parts][0] ?? null;
    if (r === 'held') return this.tools?.grab.holding ?? null;
    if (r === 'last') {
      for (let i = this.placed.length - 1; i >= 0; i--) if (doc.parts[this.placed[i]!]) return this.placed[i]!;
      const ids = Object.keys(doc.parts);
      return ids.length ? ids[ids.length - 1]! : null;
    }
    if (doc.parts[ref]) return ref;
    return this.byName(ref);
  }

  private byName(name: string) {
    const n = name.toLowerCase();
    return Object.values(this.app.doc.parts).find((p) => p.name.toLowerCase() === n)?.id ?? null;
  }

  private label(id: string) {
    return this.app.doc.parts[id]?.name ?? id;
  }
}
