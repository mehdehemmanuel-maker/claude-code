// The constructor's language. What can be said here is what can exist (docs/LAW-TREE-INTEGRITY.md): a part placed is
// a handle whose type is its kind's capabilities, and a joint that needs a capability is a method on the handle that
// has it. A servo horn is a method on a servo handle, at the servo's own shaft; a signal lead is a method on a board
// handle, to a servo handle; a power wire is a method on a pack handle, to a handle that draws current. A horn on a
// bar, a lead from a bar, a wire between two servos, a command from nowhere: none of these is a sentence in this
// language, so none can be asked for. What is said is made in one transaction against the document's construction
// gate (src/ganglia/tree/gate.ts, the kernel beneath this language: data arriving from anywhere else meets it there),
// so a machine is in the world whole or not at all.
//
// Templates (the walker and swimmer plans in src/world/creature.ts) are sentences in this language, not the language:
// what the language can say is wider than any plan, and a plan is one point in it.

import { createConnection, createPart, makeConnection, makePart } from '../doc/commands';
import type { DocStore, TxBuilder } from '../doc/store';
import type { Pose, Quat, Vec3 } from '../doc/types';
import { composePose, length, qconj, qmul, qnormalize, relativePose, sub } from '../doc/math';
import { AUTO_JOIN, planJoin } from '../connectors/plan';
import { getMaterial } from '../data/materials';
import { getServo, shaftOf, type ServoData } from '../data/servos';
import { packSize } from '../parts/registry';
import type { Params } from '../schema/params';

const IDENTITY: Quat = [0, 0, 0, 1];
/** Wire and lead length over the straight run, as a maker leaves slack for the joints to move. */
const SLACK = 1.5;

/** How a part is placed: of what (its kind's default material when unsaid), and held fast to the bench (frozen). */
export interface PlaceOpts { material?: string; frozen?: boolean }

/** A program a controller board sends a servo: a swing each way from centre (rad, negative the other way), at a phase in the board's rhythm (rad), as a wave. */
export interface Program { swing: number; phase: number; wave: 'sine' | 'lift' }

/** A part standing in the build: what every handle is. */
export class Solid {
  constructor(readonly build: Build, readonly id: string, readonly kind: string, readonly material: string, readonly params: Params) {}

  get pose(): Pose { return this.build.store.doc.parts[this.id]!.pose; }

  /** The world pose of a frame on this part. */
  worldOf(frame: Pose): Pose { return composePose(this.pose, frame); }

  /** The frame on this part that is a given place in the world. */
  frameAt(world: Pose): Pose { return relativePose(this.pose, world); }

  /**
   * A rigid join to another part, as the join planner chooses for the two materials and the face between them, or
   * as asked (`how`): a bought part takes only what its maker allows, and says so if asked for more.
   */
  fasten(mine: { thin: number; at: Vec3 }, other: Solid, theirs: { thin: number; at: Vec3 }, face: [number, number], how = AUTO_JOIN): string {
    const plan = planJoin(how, getMaterial(this.material), getMaterial(other.material), { thicknessA: mine.thin, thicknessB: theirs.thin, bondW: face[0], bondL: face[1] });
    // a rigid joint holds its two frames together as they are now: the frame on the other part is the same
    // orientation in the world as this part's, said in the other part's own coordinates, whichever way it is turned
    const q = qnormalize(qmul(qconj(other.pose.q), this.pose.q));
    return this.build.connect(plan.kind, { part: this.id, frame: { p: mine.at, q: IDENTITY } }, { part: other.id, frame: { p: theirs.at, q } }, { ...plan.params, bondW: face[0], bondL: face[1] });
  }
}

/** A part that draws current: it has one place its lead leaves it. */
export abstract class Powered extends Solid {
  abstract get lead(): Vec3;
}

/** A servo: its datasheet, its shaft (the one place a horn fits), and its lead. */
export class Servo extends Powered {
  readonly data: ServoData;
  constructor(build: Build, id: string, material: string, params: Params) {
    super(build, id, 'servo', material, params);
    this.data = getServo(String(params['model']));
  }

  /** Its lead leaves the case at the middle of its −x end face. */
  get lead(): Vec3 { return [-this.data.dims[0] / 2, 0, 0]; }

  /** Its output shaft, in its own coordinates. */
  get shaft(): Pose { return shaftOf(this.data); }

  /**
   * Its horn, carrying `carried` at `frame` on that part: the frame is the same place in the world as the shaft, to
   * the pose canonicalisation's rounding, which is checked before the gate sees it.
   */
  horn(carried: Solid, frame: Pose = carried.frameAt(this.worldOf(this.shaft)), offset = 0): string {
    const wa = this.worldOf(this.shaft), wb = carried.worldOf(frame);
    const apart = length(sub(wb.p, wa.p)), aligned = Math.abs(wa.q[0] * wb.q[0] + wa.q[1] * wb.q[1] + wa.q[2] * wb.q[2] + wa.q[3] * wb.q[3]);
    if (apart > 2e-5 || aligned < 1 - 1e-7) throw new Error(`${this.build.tag}: a horn's two frames are not one place (${(apart * 1e6).toFixed(0)} µm apart, alignment ${aligned.toFixed(6)})`);
    return this.build.connect('servo', { part: this.id, frame: this.shaft }, { part: carried.id, frame }, { offset });
  }
}

/** A battery pack: its terminals are on its +x end face. */
export class Pack extends Solid {
  get terminals(): Vec3 { return [packSize(this.params)[0] / 2, 0, 0]; }

  /** A power wire from the terminals to a part's lead, with slack. */
  wire(load: Powered): string {
    const L = length(sub(load.worldOf({ p: load.lead, q: IDENTITY }).p, this.worldOf({ p: this.terminals, q: IDENTITY }).p));
    return this.build.connect('wire', { part: this.id, frame: { p: this.terminals, q: IDENTITY } }, { part: load.id, frame: { p: load.lead, q: IDENTITY } }, { gauge: '18', length: Math.max(0.05, SLACK * L) });
  }
}

/** A board: its lead (its power header) is at its −x edge, its signal headers along its +x edge. */
export abstract class Board extends Powered {
  get lead(): Vec3 { return [-0.02, 0, 0]; }
  get headers(): Vec3 { return [0.02, 0, 0]; }

  protected leadTo(servo: Servo, params: Params): string {
    const L = length(sub(servo.worldOf({ p: servo.lead, q: IDENTITY }).p, this.worldOf({ p: this.headers, q: IDENTITY }).p));
    return this.build.connect('signal', { part: this.id, frame: { p: this.headers, q: IDENTITY } }, { part: servo.id, frame: { p: servo.lead, q: IDENTITY } }, { ...params, length: Math.max(0.05, SLACK * L) });
  }
}

/** A controller board: its program speaks to servos down its leads. */
export class Controller extends Board {
  /** A signal lead carrying this board's program for one servo. */
  lead_(servo: Servo, program: Program): string {
    const phase = ((program.phase + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    return this.leadTo(servo, { swing: program.swing, phase, wave: program.wave, channel: 'none' });
  }
}

/** A radio receiver: your sticks reach servos down its leads. */
export class Receiver extends Board {
  /** A signal lead carrying one stick to one servo: full stick turns it `swing` (rad). */
  stick(servo: Servo, channel: string, swing: number): string {
    return this.leadTo(servo, { swing, phase: 0, wave: 'sine', channel });
  }
}

/**
 * A machine going into a document as one. Its parts and joints are made against the document's gate inside one
 * transaction, placed in the frame `at`, `q` (a yaw), so that nothing of it is there unless all of it is.
 */
export class Build {
  parts: string[] = [];
  joints: string[] = [];
  constructor(readonly store: DocStore, private readonly tx: TxBuilder, readonly at: Vec3, readonly q: Quat, readonly tag: string) {}

  /** A part at `local` in the build's frame, turned by `localQ` there: a handle typed by what its kind can do. */
  place(kind: 'servo', local: Vec3, localQ: Quat, params: { model: string }, name: string, opts?: PlaceOpts): Servo;
  place(kind: 'battery', local: Vec3, localQ: Quat, params: { model: string; series: number; parallel: number; charge: number }, name: string, opts?: PlaceOpts): Pack;
  place(kind: 'controller', local: Vec3, localQ: Quat, params: { rhythm: number }, name: string, opts?: PlaceOpts): Controller;
  place(kind: 'receiver', local: Vec3, localQ: Quat, params: Record<string, never>, name: string, opts?: PlaceOpts): Receiver;
  place(kind: string, local: Vec3, localQ: Quat, params: Params, name: string, opts?: PlaceOpts): Solid;
  place(kind: string, local: Vec3, localQ: Quat, params: Params, name: string, opts: PlaceOpts = {}): Solid {
    const pose: Pose = composePose({ p: this.at, q: this.q }, { p: local, q: localQ });
    const p = createPart(this.tx, this.store, makePart({ kind, pose, material: opts.material, params, name: `${this.tag}-${name}`, frozen: opts.frozen }));
    this.parts.push(p.id);
    switch (kind) {
      case 'servo': return new Servo(this, p.id, p.material, p.params);
      case 'battery': return new Pack(this, p.id, kind, p.material, p.params);
      case 'controller': return new Controller(this, p.id, kind, p.material, p.params);
      case 'receiver': return new Receiver(this, p.id, kind, p.material, p.params);
      default: return new Solid(this, p.id, kind, p.material, p.params);
    }
  }

  /** @internal The joints the handles make: not for saying anything the handles cannot. */
  connect(kind: string, a: { part: string; frame: Pose }, b: { part: string; frame: Pose } | null, params: Params): string {
    const c = createConnection(this.tx, makeConnection({ kind, a, b, params }));
    this.joints.push(c.id);
    return c.id;
  }
}

/** Build a machine into a document in one transaction: what `fn` says is made whole, or a refusal leaves nothing. */
export function construct<T>(store: DocStore, label: string, at: Vec3, q: Quat, tag: string, fn: (b: Build) => T): T {
  let out: T | undefined;
  store.transact(label, (tx) => { out = fn(new Build(store, tx, at, q, tag)); });
  return out as T;
}
