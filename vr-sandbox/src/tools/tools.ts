// Tools: the hands of the sandbox. Each tool reacts to rays (mouse or VR controller) the same way.

import * as THREE from 'three';
import type { App } from '../app/app';
import { getMaterial, MATERIALS } from '../data/materials';
import { getConnectorKind } from '../connectors/registry';
import { AUTO_JOIN, isPlannedKind, planJoin, type JoinPlan } from '../connectors/plan';
import { addConnection, addPart, deleteParts, duplicateParts, placePart, setPartPose, setPartPoses } from '../doc/commands';
import { frameOnPart, partLayout } from '../app/segments';
import { add, axisAngle, cross, fromTo, inverseTransformPoint, length, normalize, qmul, relativePose, rotate, scale, sub, transformPoint } from '../doc/math';
import type { Part, Pose, Quat, Vec3 } from '../doc/types';
import { effectiveParams, getPartKind, segmentBodyId } from '../parts/registry';
import { shapeBounds, type CollisionShape } from '../parts/shapes';
import { defaultsOf, numberOf, sanitizeParams, type Params } from '../schema/params';
import { buildVisual } from '../render/geometry';
import { ghostMaterial } from '../render/materials';
import type { Pick } from '../render/view';
import { DrawTool } from './draw';

export interface Ray {
  origin: THREE.Vector3;
  dir: THREE.Vector3;
}

export interface PointerEvt {
  ray: Ray;
  button: number;
  /** "Whole assembly" (or add to the selection): the tablet's modifier, held for the next action. */
  shift: boolean;
  ctrl: boolean;
  source: 'left' | 'right';
  /** Controller orientation (VR) so held parts can follow wrist rotation. */
  handQuat?: Quat;
}

export interface Tool {
  id: string;
  label: string;
  icon: string;
  hint: string;
  down?(e: PointerEvt): void;
  move?(e: PointerEvt): void;
  up?(e: PointerEvt): void;
  frame?(dt: number, e: PointerEvt | null): void;
  cancel?(): void;
  /** What the tool can do besides its trigger action (shown on the tablet while it is the active tool). */
  actions?(): ToolAction[];
}

export interface ToolAction {
  id: string;
  label: string;
  run: () => void;
  on?: boolean;
}

const v3 = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];

export class ToolManager {
  readonly tools: Tool[];
  active = 0;
  last: PointerEvt | null = null;
  hover: Pick | null = null;
  readonly grab: GrabTool;
  /** The tablet's modifier (what Shift was on a keyboard): whole assembly, or add to the selection. */
  whole = false;

  constructor(readonly app: App) {
    this.grab = new GrabTool(app);
    this.draw = new DrawTool(app);
    this.tools = [
      this.grab,
      new PlaceTool(app),
      new JoinTool(app),
      new EraseTool(app),
      new FreezeTool(app),
      new CloneTool(app),
      new PokeTool(app),
      new InspectTool(app),
      new MeasureTool(app),
      this.draw,
    ];
  }

  /** The interpretation wall's tool (draw and say what it is). */
  readonly draw: DrawTool;

  get tool() {
    return this.tools[this.active]!;
  }

  setActive(i: number) {
    if (i === this.active || !this.tools[i]) return;
    this.tool.cancel?.();
    this.app.view.showGhost('', null, null);
    this.app.view.setMarkers([]);
    this.active = i;
    this.app.audio.ui('click');
    this.app.notify();
  }

  byId(id: string) {
    const i = this.tools.findIndex((t) => t.id === id);
    if (i >= 0) this.setActive(i);
  }

  down(e: PointerEvt) {
    this.last = e;
    this.tool.down?.(e);
  }

  move(e: PointerEvt) {
    this.last = e;
    this.tool.move?.(e);
  }

  up(e: PointerEvt) {
    this.last = e;
    this.tool.up?.(e);
  }

  /** The active tool's actions for the tablet, with the modifier where the tool has one. */
  actions(): ToolAction[] {
    const own = this.tool.actions?.() ?? [];
    // joined parts are one piece: these tools act on the whole assembly unless told to take just the one part
    const modifier = { grab: 'Add to selection', erase: 'Just this part', freeze: 'Just this part', clone: 'Just this part' }[this.tool.id];
    return modifier ? [...own, { id: 'whole', label: modifier, on: this.whole, run: () => { this.whole = !this.whole; } }] : own;
  }

  frame(dt: number) {
    const e = this.last;
    if (e) {
      const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
      this.hover = pick;
      this.app.view.setHover(pick && pick.type !== 'env' ? pick.id : null);
    }
    this.tool.frame?.(dt, e);
  }
}

// -------------------------------------------------------------------------------------------------

interface Hold {
  /** Part being held. */
  id: string;
  /** Physics body held: the part, or the one segment of a breakable part that was grabbed. */
  body: string;
  hand: string;
  local: Vec3;
  dist: number;
  q: Quat;
  frozen: boolean;
  relQ?: Quat;
  /** The rest of its assembly (parts joined to it), moved with it as one piece. */
  group?: string[];
}

/** Grabbing, per hand: the mouse, and each VR controller can hold its own part at the same time. */
export class GrabTool implements Tool {
  id = 'grab';
  label = 'Grab';
  icon = '✋';
  hint = 'Trigger: drag a part (it turns with your wrist) · with "Add to selection" on, trigger adds parts to the selection';
  private held = new Map<string, Hold>();

  constructor(private app: App) {}

  /** Any held part (for UI hints). */
  get holding() {
    for (const h of this.held.values()) return h.id;
    return null;
  }

  holdingWith(hand: string) {
    return this.held.get(hand)?.id ?? null;
  }

  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    if (!pick || pick.type === 'env' || !pick.id) {
      if (!e.shift) this.app.select([]);
      return;
    }
    if (pick.type === 'conn') {
      this.app.select([], pick.id);
      return;
    }
    if (e.shift) {
      this.app.toggleSelect(pick.id);
      return;
    }
    this.app.select([pick.id, ...this.app.component(pick.id).filter((x) => x !== pick.id)]);
    this.begin(pick.id, v3(pick.point), pick.distance, e, e.source, pick.seg);
  }

  begin(id: string, point: Vec3, dist: number, e: PointerEvt, hand: string = e.source, seg: number | null = null) {
    const part = this.app.doc.parts[id];
    // a breakable part is held by the piece that was grabbed (its still-bonded neighbours come along)
    const body = seg !== null && part && partLayout(part) ? segmentBodyId(id, seg) : id;
    const pose = this.app.livePose(body) ?? this.app.livePose(id);
    if (!pose || !part) return;
    for (const [h, other] of this.held) if (other.id === id && h !== hand) this.release(h); // hand-over
    const local = inverseTransformPoint(pose, point);
    const relQ = e.handQuat ? qmul(qconj(e.handQuat), pose.q) : undefined;
    // in the build phase every part is held still, so moving one is a design edit, as for a frozen part
    const hold: Hold = { id, body, hand, local, dist, q: pose.q, frozen: part.frozen || this.app.settings.build, relQ };
    // joined parts are one piece: moved precisely, the assembly moves with it
    hold.group = this.app.component(id).filter((x) => x !== id);
    this.held.set(hand, hold);
    this.app.physics.send({ op: 'grab', hand, id: body, mode: this.app.settings.grabMode, target: this.target(hold, e), strength: this.app.settings.strength, group: hold.group });
    this.app.audio.ui('grab', point);
    this.app.haptic?.(0.3, 20, hand);
  }

  private target(h: Hold, e: PointerEvt): Pose {
    const q = e.handQuat && h.relQ ? qmul(e.handQuat, h.relQ) : h.q;
    const hit = add(v3(e.ray.origin), scale(v3(e.ray.dir), h.dist));
    const pose = { p: sub(hit, rotate(q, h.local)), q };
    const s = this.app.settings;
    return s.build || s.gridLock ? snapPose(pose, s.grid, s.angleSnap) : pose;
  }

  /** Feed the latest pointer for a hand (mouse via move/frame, VR controllers every frame). */
  updateHand(e: PointerEvt) {
    const h = this.held.get(e.source);
    if (h) this.app.physics.send({ op: 'grabTarget', hand: h.hand, target: this.target(h, e) });
  }

  move(e: PointerEvt) {
    this.updateHand(e);
  }

  up(e: PointerEvt) {
    if (this.held.has(e.source)) this.release(e.source);
  }

  release(hand?: string) {
    const hands = hand ? [hand] : [...this.held.keys()];
    for (const hd of hands) {
      const h = this.held.get(hd);
      if (!h) continue;
      this.held.delete(hd);
      this.app.physics.send({ op: 'release', hand: h.hand });
      // Frozen parts moved by hand are a design edit (undoable). Free parts keep flying under physics.
      if (h.frozen && h.group?.length) {
        // the assembly moved as one: every part of it lands where it now is, in one undoable edit
        const poses = new Map<string, Pose>();
        for (const id of [h.id, ...h.group]) { const live = this.app.live.latest(id); if (live) poses.set(id, live); }
        setPartPoses(this.app.store, poses, `Move assembly (${poses.size} parts)`);
      } else if (h.frozen) {
        const live = this.app.live.latest(h.id);
        const part = this.app.doc.parts[h.id];
        const layout = part ? partLayout(part) : null;
        if (live && part && layout) {
          const segs: Pose[] = [];
          for (let k = 0; k < layout.count; k++) { const sp = this.app.live.latest(segmentBodyId(h.id, k)); if (sp) segs.push(sp); }
          placePart(this.app.store, h.id, live, segs.length === layout.count && (part.damage.segments || part.damage.broken.length) ? segs : null);
        } else if (live) {
          setPartPose(this.app.store, h.id, live);
        }
      }
      this.app.audio.ui('drop');
    }
  }

  /** Push or pull a held part along the ray (mouse wheel, VR thumbstick). */
  adjustDistance(hand: string, factor: number) {
    const h = this.held.get(hand);
    if (!h) return false;
    h.dist = Math.min(30, Math.max(0.1, h.dist * factor));
    return true;
  }

  rotateHeld(hand: string, axis: Vec3, angle: number) {
    const h = this.held.get(hand);
    if (!h) return false;
    h.q = qmul(axisAngle(axis, angle), h.q);
    if (h.relQ) h.relQ = qmul(axisAngle(axis, angle), h.relQ);
    return true;
  }

  cancel() {
    // the trigger-held part (grip holds are the grip's own, whatever the tool)
    this.release('right');
  }
}

const qconj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

/**
 * A pose on the build grid: its origin on the nearest point of a `grid` metre lattice, its rotation to the nearest
 * multiple of `angle` degrees about each world axis (yaw, then pitch, then roll). 0 leaves that part free.
 */
export function snapPose(pose: Pose, grid: number, angle: number): Pose {
  const p: Vec3 = grid > 0 ? [Math.round(pose.p[0] / grid) * grid, Math.round(pose.p[1] / grid) * grid, Math.round(pose.p[2] / grid) * grid] : pose.p;
  if (!(angle > 0)) return { p, q: pose.q };
  const step = (angle * Math.PI) / 180;
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...pose.q), 'YXZ');
  e.set(Math.round(e.x / step) * step, Math.round(e.y / step) * step, Math.round(e.z / step) * step, 'YXZ');
  const q = new THREE.Quaternion().setFromEuler(e);
  return { p, q: [q.x, q.y, q.z, q.w] };
}

// -------------------------------------------------------------------------------------------------

export function rotatedMinY(shape: CollisionShape, q: Quat) {
  const b = shapeBounds(shape);
  let minY = Infinity;
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
    minY = Math.min(minY, rotate(q, [x, y, z])[1]);
  }
  return minY;
}

class PlaceTool implements Tool {
  id = 'place';
  label = 'Place';
  icon = '＋';
  hint = 'Trigger: place the part chosen on the Parts page · turn or tip it first with the buttons below';
  private yaw = 0;
  private tilt = 0;

  constructor(private app: App) {}

  private spec() {
    const kind = getPartKind(this.app.spawnKind);
    const matId = allowedMaterial(kind.id, this.app.spawnMaterial ?? kind.defaultMaterial);
    const params: Params = sanitizeParams(kind.params, defaultsOf(kind.params));
    return { kind, matId, params, material: getMaterial(matId) };
  }

  private posePreview(pick: Pick | null): Pose | null {
    if (!pick) return null;
    const { kind, params, material } = this.spec();
    const shape = kind.collision(effectiveParams(kind, params, material));
    const base = qmul(qmul(axisAngle([0, 1, 0], this.yaw), axisAngle([1, 0, 0], this.tilt)), kind.spawnRotation);
    const s = this.app.settings;
    if (s.smartSnap && pick.type === 'part' && pick.id && !this.app.spawnTemplate) {
      const snapped = smartPlace(this.app, pick.id, v3(pick.point), normalize(v3(pick.normal)), shape, base, s.grid);
      if (snapped) return snapped;
    }
    const n = normalize(v3(pick.normal));
    const align = fromTo([0, 1, 0], n);
    const q = qmul(align, base);
    const lift = this.app.spawnTemplate ? 0.0005 : -rotatedMinY(shape, base) + 0.0005;
    let p = add(v3(pick.point), scale(n, lift));
    const g = s.grid;
    if (g > 0 && (Math.abs(n[1]) > 0.9 || s.gridLock)) p = [Math.round(p[0] / g) * g, Math.abs(n[1]) > 0.9 ? p[1] : Math.round(p[1] / g) * g, Math.round(p[2] / g) * g];
    // a template keeps its own shape: only the turn applies, upright
    return this.app.spawnTemplate ? { p, q: axisAngle([0, 1, 0], this.yaw) } : { p, q };
  }

  frame(_dt: number, e: PointerEvt | null) {
    if (!e) return;
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    const pose = this.posePreview(pick);
    const tpl = this.app.spawnTemplate ? this.app.templateFragment(this.app.spawnTemplate) : null;
    if (tpl) {
      // the whole template as a ghost, as it will land
      this.app.view.showGhost(`tpl:${this.app.spawnTemplate}`, () => {
        const g = new THREE.Group();
        for (const p of tpl.parts) {
          const k = getPartKind(p.kind);
          const o = buildVisual(k.visual(effectiveParams(k, p.params, getMaterial(p.material))), ghostMaterial, () => ghostMaterial);
          o.position.set(...p.pose.p);
          o.quaternion.set(...p.pose.q);
          g.add(o);
        }
        return g;
      }, pose);
      return;
    }
    const { kind, params, material } = this.spec();
    const key = `${kind.id}:${material.id}:${JSON.stringify(params)}`;
    this.app.view.showGhost(key, () => buildVisual(kind.visual(effectiveParams(kind, params, material)), ghostMaterial, () => ghostMaterial), pose);
  }

  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    const pose = this.posePreview(pick);
    if (!pose) return;
    if (this.app.spawnTemplate) {
      this.app.placeTemplate(this.app.spawnTemplate, pose);
      this.app.haptic?.(0.3, 20);
      return;
    }
    const { kind, params, matId } = this.spec();
    const part = addPart(this.app.store, { kind: kind.id, pose, params, material: matId, frozen: this.app.settings.placeFrozen });
    this.app.select([part.id]);
    this.app.audio.ui('place', pose.p);
    this.app.haptic?.(0.2, 15);
  }

  actions(): ToolAction[] {
    return [
      { id: 'turn', label: 'Turn 90°', run: () => { this.yaw += Math.PI / 2; } },
      { id: 'tip', label: 'Tip 90°', run: () => { this.tilt += Math.PI / 2; } },
      { id: 'upright', label: 'Upright', run: () => { this.yaw = 0; this.tilt = 0; } },
    ];
  }

  cancel() {
    this.app.view.showGhost('', null, null);
  }
}

/** How close (m) a placed part's edge or centre must come to the target's to lock onto it. */
const SNAP_REACH = 0.03;

/**
 * Smart placement on another part: square to it (the face's normal taken as the target's nearest axis, the new part
 * turned with it), flush on that face, and along the face locked to the target's centre or edges when within reach,
 * else to the grid measured from the target's centre. How a builder lines things up against a square.
 */
export function smartPlace(app: App, targetId: string, point: Vec3, worldNormal: Vec3, shape: CollisionShape, base: Quat, grid: number): Pose | null {
  const target = app.doc.parts[targetId];
  const T = app.livePose(targetId) ?? target?.pose;
  if (!target || !T) return null;
  const tk = getPartKind(target.kind);
  const tb = shapeBounds(tk.collision(effectiveParams(tk, target.params, app.materialOf(target))));
  // the target's face: its local axis nearest the surface normal
  const nL = rotate(qconj(T.q), worldNormal);
  const k = [0, 1, 2].reduce((m, x) => (Math.abs(nL[x]!) > Math.abs(nL[m]!) ? x : m), 0);
  const sgn = Math.sign(nL[k]!) || 1;
  const axis: Vec3 = [0, 0, 0];
  axis[k] = sgn;
  const qRel = qmul(fromTo([0, 1, 0], axis), base);
  // the new part's extent in the target's frame, about its own origin
  const nb = shapeBounds(shape);
  const nmin: Vec3 = [Infinity, Infinity, Infinity], nmax: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const x of [nb.min[0], nb.max[0]]) for (const y of [nb.min[1], nb.max[1]]) for (const z of [nb.min[2], nb.max[2]]) {
    const c = rotate(qRel, [x, y, z]);
    for (let j = 0; j < 3; j++) { nmin[j] = Math.min(nmin[j]!, c[j]!); nmax[j] = Math.max(nmax[j]!, c[j]!); }
  }
  const pl = inverseTransformPoint(T, point);
  const out: Vec3 = [0, 0, 0];
  for (let j = 0; j < 3; j++) {
    if (j === k) { out[j] = sgn > 0 ? tb.max[j]! - nmin[j]! + 0.0005 : tb.min[j]! - nmax[j]! - 0.0005; continue; }
    const tc = (tb.min[j]! + tb.max[j]!) / 2;
    const want = pl[j]! - (nmin[j]! + nmax[j]!) / 2; // origin that centres the new part on the pointer
    const lock = [tc - (nmin[j]! + nmax[j]!) / 2, tb.min[j]! - nmin[j]!, tb.max[j]! - nmax[j]!];
    const best = lock.reduce((m, x) => (Math.abs(x - want) < Math.abs(m - want) ? x : m), lock[0]!);
    out[j] = Math.abs(best - want) <= SNAP_REACH ? best : grid > 0 ? tc + Math.round((want - tc) / grid) * grid : want;
  }
  return { p: transformPoint(T, out), q: qmul(T.q, qRel) };
}

export function allowedMaterial(kindId: string, material: string) {
  const kind = getPartKind(kindId);
  const m = MATERIALS.find((x) => x.id === material);
  if (!m) return kind.defaultMaterial;
  return !kind.materialFilter || kind.materialFilter(m) ? material : kind.defaultMaterial;
}

// -------------------------------------------------------------------------------------------------

/** Extents of a part's face (in its local frame) whose normal is closest to a world normal. */
function faceDims(app: App, partId: string, worldNormal: Vec3): [number, number] {
  const part = app.doc.parts[partId];
  const pose = app.livePose(partId);
  if (!part || !pose) return [0.03, 0.03];
  const kind = getPartKind(part.kind);
  const shape = kind.collision(effectiveParams(kind, part.params, app.materialOf(part)));
  const b = shapeBounds(shape);
  const ln = rotate(qconj(pose.q), worldNormal);
  const ax = [Math.abs(ln[0]), Math.abs(ln[1]), Math.abs(ln[2])];
  const i = ax[0]! >= ax[1]! && ax[0]! >= ax[2]! ? 0 : ax[1]! >= ax[2]! ? 1 : 2;
  const ext = [0, 1, 2].filter((k) => k !== i).map((k) => b.max[k]! - b.min[k]!).sort((x, y) => y - x);
  return [ext[0]!, ext[1]!];
}

/** Thinnest section of a part, as the joint capacities see it. */
function thicknessOf(app: App, part: Part): number {
  const kind = getPartKind(part.kind);
  return kind.dims(effectiveParams(kind, part.params, app.materialOf(part))).b;
}

/** One end of a joint: the part, the point and surface normal where it is joined, and which piece of breakable stock. */
export interface JoinEnd {
  part: string;
  point: Vec3;
  normal: Vec3;
  seg: number | null;
}

/**
 * A rigid joint at a face, the way the Join tool makes it: A's frame at the point, its y along `q`; the bond sized from
 * the two touching faces; and, for Best join or a joining process, the process that holds these materials, sized to
 * the stock (connectors/plan.ts). B null anchors A to the world.
 */
export function makeRigidJoin(app: App, a: JoinEnd, b: { part: string | null; seg: number | null }, requested: string, q: Quat) {
  const aPart = app.doc.parts[a.part]!;
  const bPart = b.part ? app.doc.parts[b.part] ?? null : null;
  const source = (id: string) => app.livePose(id);
  const world: Pose = { p: a.point, q };
  let kind = getConnectorKind(requested === AUTO_JOIN ? 'bolted' : requested);
  let params = sanitizeParams(kind.params, defaultsOf(kind.params));
  if ('bondW' in params) {
    const [wa, la] = faceDims(app, a.part, a.normal);
    const [wb, lb] = bPart ? faceDims(app, bPart.id, scale(a.normal, -1)) : [wa, la];
    params['bondW'] = Math.max(0.002, Math.min(wa, wb));
    params['bondL'] = Math.max(0.002, Math.min(la, lb));
  }
  let plan: JoinPlan | null = null;
  if (isPlannedKind(requested)) {
    const matA = app.materialOf(aPart), matB = bPart ? app.materialOf(bPart) : null;
    const geom = {
      thicknessA: thicknessOf(app, aPart), thicknessB: bPart ? thicknessOf(app, bPart) : thicknessOf(app, aPart),
      bondW: numberOf(params, 'bondW', 0.03), bondL: numberOf(params, 'bondL', 0.03),
    };
    plan = planJoin(requested, matA, matB, geom);
    if (requested === AUTO_JOIN) {
      // your usual joint for these materials, when it holds here
      const pref = app.joinPreference?.(matA, matB);
      if (pref && pref !== plan.kind) { const mine = planJoin(pref, matA, matB, geom); if (!mine.substituted) plan = mine; }
    } else {
      app.joinChosen?.(matA, matB, requested);
    }
    kind = getConnectorKind(plan.kind);
    params = plan.params;
  }
  const conn = addConnection(app.store, {
    kind: kind.id,
    a: { part: a.part, frame: frameOnPart(aPart, world, a.seg, source) },
    b: bPart ? { part: bPart.id, frame: frameOnPart(bPart, world, b.seg, source) } : null,
    params,
  });
  return { conn, kind, plan };
}

class JoinTool implements Tool {
  id = 'join';
  label = 'Join';
  icon = '🔩';
  hint = 'Trigger part A, then part B (or the floor to anchor it) · Best join picks the right process for the materials';
  private first: JoinEnd | null = null;
  private axisMode = 0;

  constructor(private app: App) {}

  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    const requested = this.app.joinKind;
    let kind = getConnectorKind(requested === AUTO_JOIN ? 'bolted' : requested);
    if (!pick) return;
    if (!this.first) {
      if (pick.type !== 'part' || !pick.id) {
        this.app.toast('Start a joint on a part (A), then click part B or the floor.', 'warn');
        this.app.audio.ui('error');
        return;
      }
      this.first = { part: pick.id, point: v3(pick.point), normal: normalize(v3(pick.normal)), seg: pick.seg };
      this.app.view.setMarkers([pick.point.clone()], 0xffc14d);
      this.app.audio.ui('click', this.first.point);
      return;
    }
    const a = this.first;
    const bId = pick.type === 'part' ? pick.id : null;
    if (bId === a.part) {
      this.app.toast('Pick a different part for B.', 'warn');
      this.app.audio.ui('error');
      return;
    }
    const aPart = this.app.doc.parts[a.part]!;
    const bPart = bId ? this.app.doc.parts[bId] ?? null : null;
    const source = (id: string) => this.app.livePose(id);
    // frames in part coordinates; on breakable stock, relative to the piece that was clicked
    const onA = (world: Pose) => frameOnPart(aPart, world, a.seg, source);
    const onB = (world: Pose) => frameOnPart(bPart!, world, pick.seg, source);
    const model = kind.model;
    let conn;
    if (model === 'spring' || model === 'rope' || model === 'band') {
      const pb = v3(pick.point);
      const dir = normalize(sub(pb, a.point));
      const q = fromTo([0, 1, 0], dir);
      conn = addConnection(this.app.store, {
        kind: kind.id,
        a: { part: a.part, frame: onA({ p: a.point, q }) },
        b: bId && bPart ? { part: bId, frame: onB({ p: pb, q }) } : null,
        params: sanitizeParams(kind.params, defaultsOf(kind.params)),
      });
    } else {
      const made = makeRigidJoin(this.app, a, { part: bId, seg: pick.seg }, requested, this.jointFrame(a.normal));
      kind = made.kind;
      conn = made.conn;
      if (made.plan) this.app.toast(made.plan.substituted ? `${made.plan.substituted} ${made.plan.summary}.` : `${made.plan.summary}${bId ? '' : ', to the floor'}.`, made.plan.substituted ? 'warn' : 'ok');
    }
    this.first = null;
    this.app.view.setMarkers([]);
    this.app.select([], conn.id);
    const at = a.point;
    if (kind.id === 'weld') {
      this.app.audio.ui('weld', at);
      const m = this.app.materialOf(this.app.doc.parts[a.part]!);
      this.app.particles.sparksFor(m.sparks === 'none' ? { ...m, sparks: 'low-carbon' } : m, at, a.normal, 1);
    } else if (kind.id === 'bolted' || kind.id === 'screwed') this.app.audio.ui('ratchet', at);
    else this.app.audio.ui('connect', at);
    this.app.haptic?.(0.5, 30);
    if (!bId && !isPlannedKind(requested)) this.app.toast(`${kind.label} anchored to the world`, 'info');
  }

  private jointFrame(n: Vec3): Quat {
    const base = fromTo([0, 1, 0], n);
    if (this.axisMode === 0) return base;
    // in-plane axes: rotate the frame so +Y lies along a tangent of the surface
    const t = normalize(Math.abs(n[1]) < 0.9 ? cross([0, 1, 0], n) : cross([1, 0, 0], n));
    const t2 = cross(n, t);
    return fromTo([0, 1, 0], this.axisMode === 1 ? t : t2);
  }

  actions(): ToolAction[] {
    const axes = ['Axis: through the surface', 'Axis: along it (1)', 'Axis: along it (2)'];
    return [
      { id: 'axis', label: axes[this.axisMode]!, run: () => { this.axisMode = (this.axisMode + 1) % 3; } },
      ...(this.first ? [{ id: 'restart', label: 'Start again', run: () => this.cancel() }] : []),
    ];
  }

  cancel() {
    this.first = null;
    this.app.view.setMarkers([]);
  }

  frame(_dt: number, e: PointerEvt | null) {
    if (!this.first || !e) return;
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    const pts = [new THREE.Vector3(...this.first.point)];
    if (pick) pts.push(pick.point.clone());
    this.app.view.setMarkers(pts, 0xffc14d);
  }
}

// -------------------------------------------------------------------------------------------------

class EraseTool implements Tool {
  id = 'erase';
  label = 'Erase';
  icon = '✂';
  hint = 'Trigger a part to remove it with everything joined to it, or a joint to undo just that · "Just this part" takes one';
  constructor(private app: App) {}
  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    if (!pick?.id) return;
    if (pick.type === 'conn') {
      this.app.store.transact('Disconnect', (tx) => tx.delete('connections', pick.id!));
    } else {
      const ids = e.shift ? [pick.id] : this.app.component(pick.id);
      const m = this.app.materialOf(this.app.doc.parts[pick.id]!);
      deleteParts(this.app.store, ids);
      this.app.particles.dustFor(m, v3(pick.point), 1);
    }
    this.app.audio.ui('delete', v3(pick.point));
  }
}

class FreezeTool implements Tool {
  id = 'freeze';
  label = 'Freeze';
  icon = '❄';
  hint = 'Trigger a part to pin its whole assembly to the world (or free it) · "Just this part" pins one';
  constructor(private app: App) {}
  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    if (pick?.type !== 'part' || !pick.id) return;
    this.app.freezeToggle(e.shift ? [pick.id] : this.app.component(pick.id));
  }
}

class CloneTool implements Tool {
  id = 'clone';
  label = 'Clone';
  icon = '⧉';
  hint = 'Trigger a part to duplicate its whole assembly, joints and all · "Just this part" copies one';
  constructor(private app: App) {}
  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    if (pick?.type !== 'part' || !pick.id) return;
    const ids = e.shift ? [pick.id] : this.app.component(pick.id);
    this.app.commitLivePoses();
    const part = this.app.doc.parts[pick.id]!;
    const lift = this.app.partDims(part).a + 0.02;
    const map = duplicateParts(this.app.store, ids, [0, lift, 0]);
    this.app.select(map.values());
    this.app.audio.ui('place', v3(pick.point));
  }
}

class PokeTool implements Tool {
  id = 'poke';
  label = 'Poke';
  icon = '👉';
  hint = 'Trigger: strike a part along your aim';
  constructor(private app: App) {}
  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    if (pick?.type !== 'part' || !pick.id) return;
    const imp = scale(normalize(v3(e.ray.dir)), this.app.settings.pokeImpulse * (e.shift ? 5 : 1));
    this.app.physics.send({ op: 'impulse', id: pick.id, point: v3(pick.point), impulse: imp });
    this.app.haptic?.(0.6, 25);
  }
}

class InspectTool implements Tool {
  id = 'inspect';
  label = 'Inspect';
  icon = '🔍';
  hint = 'Trigger a part or joint: its properties and live loads, on the Selected page';
  constructor(private app: App) {}
  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    if (!pick?.id) { this.app.select([]); return; }
    if (pick.type === 'conn') this.app.select([], pick.id);
    else if (e.shift) this.app.toggleSelect(pick.id);
    else this.app.select([pick.id]);
    this.app.audio.ui('click');
  }
}

class MeasureTool implements Tool {
  id = 'measure';
  label = 'Measure';
  icon = '📏';
  hint = 'Trigger two points: the distance between them';
  private a: Vec3 | null = null;
  constructor(private app: App) {}
  down(e: PointerEvt) {
    const pick = this.app.view.pick(e.ray.origin, e.ray.dir);
    if (!pick) return;
    const p = v3(pick.point);
    if (!this.a) {
      this.a = p;
      this.app.view.setMarkers([pick.point.clone()], 0x7dffb2);
      return;
    }
    const d = length(sub(p, this.a));
    this.app.toast(`Distance: ${(d * 1000).toFixed(1)} mm (${d.toFixed(3)} m)`, 'ok');
    this.app.view.setMarkers([new THREE.Vector3(...this.a), pick.point.clone()], 0x7dffb2);
    this.a = null;
    this.app.audio.ui('click');
  }
  cancel() {
    this.a = null;
    this.app.view.setMarkers([]);
  }
}
