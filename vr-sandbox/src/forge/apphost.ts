// Forge in the headset: statements act through the same commands as the tools (addPart, makeRigidJoin, setPartParam
// ...), so a script builds exactly what hands would, with the same undo, the same Best join and the same physics.

import * as THREE from 'three';
import type { App } from '../app/app';
import { getConnectorKind, CONNECTOR_KINDS } from '../connectors/registry';
import { AUTO_JOIN } from '../connectors/plan';
import { addPart, deleteParts, setFrozen, setPartMaterial, setPartParam, setSim } from '../doc/commands';
import { axisAngle, fromTo, normalize, qmul, rotate, transformPoint } from '../doc/math';
import type { Part, Quat, Vec3 } from '../doc/types';
import { freeSpot } from '../ganglia/tree/gate';
import { getMaterial, STANDARD_GRAVITY } from '../data/materials';
import { effectiveParams, getPartKind } from '../parts/registry';
import { shapeBounds } from '../parts/shapes';
import { defaultsOf, sanitizeParams, type Params } from '../schema/params';
import { makeRigidJoin, rotatedMinY, type ToolManager } from '../tools/tools';
import type { Workshop } from '../app/workshop';
import { boxOf, contactBetween, TOUCH } from '../tools/contact';
import { paramValue, resolveKind, resolveMaterial, resolveParam } from './catalog';
import type { ForgeHost, SimCommand, Where } from './forge';

/** The gap left between faces placed against each other by relation: within the contact slop, outside the physics' penetration. */
const CLEAR = 0.0005;
const dotv = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** A part's half extent along a world direction, from its box where it is. */
function extentAlong(B: ReturnType<typeof boxOf>, d: Vec3): number {
  return [rotate(B.pose.q, [1, 0, 0]), rotate(B.pose.q, [0, 1, 0]), rotate(B.pose.q, [0, 0, 1])].reduce((s, r, i) => s + B.half[i]! * Math.abs(dotv(r, d)), 0);
}
/** The point on a part's centre line (its longest axis) at a height, for a leaning or upright member; its centre for one lying flat. */
function axisPointAt(B: ReturnType<typeof boxOf>, y: number): Vec3 {
  const C = transformPoint(B.pose, B.centre);
  const i = B.half.indexOf(Math.max(...B.half));
  const e: Vec3 = [0, 0, 0]; e[i] = 1;
  const L = rotate(B.pose.q, e);
  if (Math.abs(L[1]) < 0.2) return C;
  const t = Math.max(-B.half[i]!, Math.min(B.half[i]!, (y - C[1]) / L[1]));
  return [C[0] + L[0] * t, C[1] + L[1] * t, C[2] + L[2] * t];
}

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

  place(kindId: string, given: Record<string, number | string>, material: string, at: Where | [number, number, number] | null, rot: { axis: 'x' | 'y' | 'z'; angle: number }[], name: string | undefined) {
    const where: Where | null = Array.isArray(at) ? { how: 'at', at } : at;
    const kind = getPartKind(kindId);
    if (name && this.byName(name)) throw new Error(`there is already a part called ${name}`);
    let params = this.params(kindId, given, defaultsOf(kind.params));
    const axes: Record<string, Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
    let q: Quat = kind.spawnRotation;
    for (const r of rot) q = qmul(axisAngle(axes[r.axis]!, r.angle), q);
    let p: Vec3;
    if (!where) p = this.defaultSpot(kindId, params, material, q);
    else if (where.how === 'at') p = where.at;
    else { const r = this.resolve(kindId, params, material, q, where); p = r.p; q = r.q; params = r.params; }
    const part = addPart(this.w.store, { kind: kindId, pose: { p, q }, params, material, frozen: this.w.settings.placeFrozen, name });
    this.placed.push(part.id);
    return part.id;
  }

  /**
   * A placement said by relation, resolved from the parts that are there (their boxes where they are now): what rests
   * on what, what spans between what. The member's length is set to the gap it spans, its direction to the line it
   * spans, and it is left CLEAR of the faces it touches (the contact slop is wider; the physics must not start it
   * interpenetrating). Nothing here is a special case for one structure: a rail, a cap, a rung, a brace are all one
   * of these relations.
   */
  private resolve(kindId: string, params: Params, material: string, q: Quat, where: Exclude<Where, { how: 'at' }>): { p: Vec3; q: Quat; params: Params } {
    const kind = getPartKind(kindId);
    const m = getMaterial(material);
    const box = (id: string) => boxOf(this.w, id);
    const ys = (ids: (string | null)[]) => ids.flatMap((id) => (id === null ? [0] : box(id).corners.map((c) => c[1])));
    const centre = (id: string) => { const B = box(id); return transformPoint(B.pose, B.centre); };
    const names = (ids: (string | null)[]) => ids.map((id) => (id === null ? 'the floor' : this.label(id))).join(' and ');
    /** The world extents of this part at a rotation: half sizes along x, y, z, and where its box centre sits from its origin. */
    const ext = (qq: Quat, prms: Params) => {
      const b = shapeBounds(kind.collision(effectiveParams(kind, prms, m)));
      const c: Vec3 = [0, 1, 2].map((k) => (b.min[k]! + b.max[k]!) / 2) as Vec3, h: Vec3 = [0, 1, 2].map((k) => (b.max[k]! - b.min[k]!) / 2) as Vec3;
      const R = [rotate(qq, [1, 0, 0]), rotate(qq, [0, 1, 0]), rotate(qq, [0, 0, 1])];
      return { half: [0, 1, 2].map((j) => R.reduce((s, r, i) => s + h[i]! * Math.abs(r[j]!), 0)) as Vec3, off: rotate(qq, c) };
    };
    const lengthKey = kind.segment?.lengthKey ?? 'length';
    const withLength = (L: number): Params => {
      const def = kind.params.find((d) => d.key === lengthKey);
      if (!def || def.type !== 'number') throw new Error(`a ${kind.label.toLowerCase()} has no length to span with: say its size and place it at a point`);
      return { ...params, [lengthKey]: Math.min(def.max, Math.max(def.min, L)) };
    };
    /** The member aimed along d: its length axis turned onto d (the other turns it was given kept). */
    const aim = (qq: Quat, d: Vec3) => { const e0: Vec3 = kind.segment?.axis === 'y' ? [0, 1, 0] : [1, 0, 0]; return qmul(fromTo(rotate(qq, e0), d), qq); };
    switch (where.how) {
      case 'on': case 'under': {
        const e = ext(q, params);
        const cs = where.ids.filter((id): id is string => id !== null).map(centre);
        const cx = cs.length ? cs.reduce((s, c) => s + c[0], 0) / cs.length : 0, cz = cs.length ? cs.reduce((s, c) => s + c[2], 0) / cs.length : 0;
        const y = where.how === 'on' ? Math.max(...ys(where.ids)) + CLEAR + e.half[1] - e.off[1] : Math.min(...ys(where.ids)) - CLEAR - e.half[1] - e.off[1];
        return { p: [cx + where.offset[0] - e.off[0], y, cz + where.offset[1] - e.off[2]], q, params };
      }
      case 'between': {
        const A = box(where.a), B = box(where.b);
        const cA = centre(where.a), cB = centre(where.b);
        const dx = cB[0] - cA[0], dz = cB[2] - cA[2];
        if (dx * dx + dz * dz < 1e-8) throw new Error(`${names([where.a, where.b])} are not apart sideways: nothing to span`);
        const d: Vec3 = normalize([dx, 0, dz]);
        const qq = aim(q, d);
        const e = ext(qq, params);
        const yc = where.under !== undefined ? Math.min(...ys([where.under])) - CLEAR - e.half[1] - e.off[1]
          : where.flush !== undefined ? Math.max(...ys([where.flush])) - CLEAR - e.half[1] - e.off[1]
            : where.height !== undefined ? where.height : (cA[1] + cB[1]) / 2;
        const yBox = yc + e.off[1];
        const PA = axisPointAt(A, yBox), PB = axisPointAt(B, yBox);
        const faceA = PA.map((v, i) => v + d[i]! * extentAlong(A, d)) as Vec3, faceB = PB.map((v, i) => v - d[i]! * extentAlong(B, d)) as Vec3;
        const gap = (faceB[0] - faceA[0]) * d[0]! + (faceB[2] - faceA[2]) * d[2]! - 2 * CLEAR;
        if (gap <= 0.005) throw new Error(`${names([where.a, where.b])} leave no room between them at that height (${Math.round(gap * 1000)} mm)`);
        const prms = withLength(gap);
        const e2 = ext(qq, prms);
        const mid: Vec3 = [(faceA[0] + faceB[0]) / 2, yBox, (faceA[2] + faceB[2]) / 2];
        return { p: [mid[0] - e2.off[0], mid[1] - e2.off[1], mid[2] - e2.off[2]], q: qq, params: prms };
      }
      case 'across': {
        const A = box(where.a), B = box(where.b);
        const n: Vec3 = where.side === 'x' ? [1, 0, 0] : where.side === '-x' ? [-1, 0, 0] : where.side === 'z' ? [0, 0, 1] : [0, 0, -1];
        const yA = ys([where.a]), yB = ys([where.b]);
        const low = axisPointAt(A, Math.min(...yA) + 0.06), high = axisPointAt(B, Math.max(...yB) - 0.06);
        // the plane the brace lies in: on side n of both, clear of the farther face
        const plane = Math.max(dotv(centre(where.a), n) + extentAlong(A, n), dotv(centre(where.b), n) + extentAlong(B, n)) + CLEAR;
        const dir: Vec3 = normalize([high[0] - low[0], high[1] - low[1], high[2] - low[2]].map((v, i) => v - n[i]! * ((high[i]! - low[i]!) * 0 + 0)) as Vec3);
        const qq = aim(q, [dir[0] - n[0]! * dotv(dir, n), dir[1] - n[1]! * dotv(dir, n), dir[2] - n[2]! * dotv(dir, n)].map((v, _, a) => v / Math.hypot(...a)) as Vec3);
        const e = ext(qq, params);
        const thick = e.half[0] * Math.abs(n[0]!) + e.half[1] * Math.abs(n[1]!) + e.half[2] * Math.abs(n[2]!);
        const onPlane = (P: Vec3): Vec3 => P.map((v, i) => v + n[i]! * (plane + thick - dotv(P, n))) as Vec3;
        return this.resolve(kindId, params, material, q, { how: 'from', from: onPlane(low), to: onPlane(high) });
      }
      case 'from': {
        const v: Vec3 = [where.to[0] - where.from[0], where.to[1] - where.from[1], where.to[2] - where.from[2]];
        const L = Math.hypot(...v);
        if (L < 0.005) throw new Error('from and to are the same point: nothing to span');
        const qq = aim(q, normalize(v));
        const prms = withLength(L);
        const e = ext(qq, prms);
        return { p: [(where.from[0] + where.to[0]) / 2 - e.off[0], (where.from[1] + where.to[1]) / 2 - e.off[1], (where.from[2] + where.to[2]) / 2 - e.off[2]], q: qq, params: prms };
      }
    }
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
    // a metre in front of you, and beside whatever already stands there: two solids cannot share space (K-5)
    const spot = this.inFront(kindId, params, material, q);
    const kind = getPartKind(kindId);
    const b = shapeBounds(kind.collision(effectiveParams(kind, params, getMaterial(material))));
    const width = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) + 0.05;
    const cam = this.app.renderer.xr.isPresenting ? this.app.renderer.xr.getCamera() : this.app.view.camera;
    const f = cam.getWorldDirection(new THREE.Vector3()).setY(0);
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    f.normalize();
    const candidate: Part = { id: '', kind: kindId, name: '', material, params, pose: { p: spot, q }, frozen: false, assembly: null, features: [], damage: { broken: [], segments: null } };
    return freeSpot(candidate, Object.values(this.app.doc.parts), (id) => getMaterial(id), [-f.z, 0, f.x], width);
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

  /** Where you stand: under your head, on the floor. */
  viewer(): Vec3 {
    const cam = this.app.renderer.xr.isPresenting ? this.app.renderer.xr.getCamera() : this.app.view.camera;
    const p = cam.getWorldPosition(new THREE.Vector3());
    return [p.x, this.app.groundAt(p.x, p.z), p.z];
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
