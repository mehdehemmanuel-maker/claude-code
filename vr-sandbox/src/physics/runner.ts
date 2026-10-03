// Fixed-timestep driver around PhysicsWorld, shared by the worker and the inline (main-thread) mode.

import type { SimSettings, Vec3 } from '../doc/types';
import { PhysicsWorld, TICK } from './world';
import type { Nerves, PhysicsEvent, PhysicsOp, StepResult, TerrainField } from './protocol';
import { Watchdog, type Anomaly, type BodyInfo } from '../diagnostics/watchdog';
import { newMind, strides, think, type Mind, type Want } from '../world/mind';
import { groundAt } from '../world/place';

/** How often a creature thinks: a tenth of a second of world time, in ticks (F-6.3). */
export const THINK = 0.1;
export const THINK_TICKS = Math.round(THINK / TICK);

/** A creature's nervous system as the runner keeps it: its mind, what its legs were last told, what it is doing. */
interface Nervous { name: string; nerves: Nerves; mind: Mind; walking: boolean; doing: Want }

export interface AdvanceResult extends StepResult {
  /** Transforms before the last tick, for interpolation. */
  prevTransforms: Float32Array;
  /** Fraction of a tick left in the accumulator (0..1). */
  alpha: number;
  ticksRun: number;
  /** Anomalies the live watchdog found since the last advance (each at most once per body and kind). */
  watchdog: Anomaly[];
}

export class Runner {
  private acc = 0;
  private last: StepResult | null = null;
  private pendingEvents: PhysicsEvent[] = [];
  private slots: (string | null)[] | undefined;
  /**
   * The live watchdog: in play, only what is wrong whatever the user does (a non-number, a part leaving the world
   * or moving faster than anything thrown by hand, a part shaking in place, a tick over budget).
   */
  private watchdog: Watchdog;
  private info = new Map<string, BodyInfo>();
  private reported = new Set<string>();
  /**
   * The creatures' nervous systems. Each thinks every THINK_TICKS ticks of world time on its body's live pose, inside
   * the step, so a creature thinks at the same ticks whether a frame carries one tick or four (F-6.3); its command
   * reaches its servos the next tick. Paused, no tick, no thought.
   */
  private minds: Nervous[] = [];
  /** Where you stand (op 'you'), for what they see. */
  private you: Vec3 = [0, 0, 0];
  /** The place's ground and water (op 'terrain'), for where they may go. */
  private terrain: TerrainField | null = null;
  private water: number | null = null;
  /** Ticks since the scene began: the minds' clock. */
  private ticks = 0;

  constructor(readonly world: PhysicsWorld) {
    this.watchdog = this.makeWatchdog();
  }

  private makeWatchdog() {
    return new Watchdog(this.info, { gravity: this.world.gravity(), floorY: 0, flungSpeed: 60, budgetMs: 11, settleTicks: 90 });
  }

  /**
   * One message's worth: the time that passed before these edits were made (it is simulated first, against the world
   * as it was), then the edits, then the time since. Events, heat and findings from both are reported together.
   */
  run(pre: number, ops: PhysicsOp[], dt: number, maxTicks = 4, singleStep = false): AdvanceResult {
    if (!(pre > 0) || !ops.length) {
      this.apply(ops);
      return this.advance(pre + dt, maxTicks, singleStep);
    }
    const before = this.advance(pre, maxTicks);
    const events = [...before.events], watchdog = [...before.watchdog], heat = { ...before.heat };
    this.apply(ops);
    const after = this.advance(dt, maxTicks, singleStep);
    for (const [id, q] of Object.entries(after.heat ?? {})) heat[id] = (heat[id] ?? 0) + q;
    return { ...after, events: [...events, ...after.events], watchdog: [...watchdog, ...after.watchdog], heat, ticksRun: before.ticksRun + after.ticksRun, prevTransforms: after.ticksRun ? after.prevTransforms : before.prevTransforms };
  }

  apply(ops: PhysicsOp[]) {
    for (const op of ops) {
      // the creatures' nerves and your whereabouts live here, with the ticks they think on
      if (op.op === 'mind') {
        this.minds = this.minds.filter((m) => m.nerves.body !== op.nerves.body);
        const mind = newMind(op.seed);
        this.minds.push({ name: op.name, nerves: op.nerves, mind, walking: true, doing: mind.doing });
        continue;
      }
      if (op.op === 'you') { this.you = [op.at[0], op.at[1], op.at[2]]; continue; }
      if (op.op === 'terrain') { this.terrain = op.field; this.water = op.water ?? null; }
      this.world.apply(op);
      // a new scene starts a new watch, and a new clock
      if (op.op === 'clear') { this.watchdog = this.makeWatchdog(); this.reported.clear(); this.minds = []; this.ticks = 0; }
    }
  }

  /** The creatures in the world, with what each is doing. */
  creatures(): { name: string; body: string; doing: Want }[] {
    return this.minds.map((m) => ({ name: m.name, body: m.nerves.body, doing: m.doing }));
  }

  /** One moment of every creature's thought, on this tick; what they chose goes out as 'mind' events. */
  private think(events: PhysicsEvent[]) {
    // a creature whose body is gone from the world is gone with it
    this.minds = this.minds.filter((m) => this.world.livePose(m.nerves.body) !== null);
    for (const m of this.minds) {
      const self = this.world.livePose(m.nerves.body);
      if (!self) continue;
      const w = { time: this.ticks * TICK, you: this.you, dry: (x: number, z: number) => this.dry(x, z), clear: (a: Vec3, b: Vec3) => this.world.lineOfSight(a, b, m.nerves.parts) };
      const c = think(m.mind, self, w, THINK, m.walking);
      m.walking = c.left > 0 || c.right > 0;
      this.world.gait(strides(c, m.nerves));
      if (c.says !== null || c.doing !== m.doing) events.push({ type: 'mind', body: m.nerves.body, name: m.name, doing: c.doing, says: c.says });
      m.doing = c.doing;
    }
  }

  /** Whether the ground there is dry: above the water, when the place has any. */
  private dry(x: number, z: number): boolean {
    return this.water === null || !this.terrain || groundAt(this.terrain, x, z) > this.water;
  }

  private observe(r: StepResult) {
    const slots = this.slots;
    if (!slots) return;
    const bodies = [];
    for (let i = 0; i < slots.length; i++) {
      const id = slots[i];
      // bodies only: a breakable part's own slot is its frame, already counted in its segments
      if (!id || !this.world.isBody(id)) continue;
      if (!this.info.has(id)) {
        const m = this.world.bodyMass(id);
        if (m === undefined) continue;
        this.info.set(id, { mass: m, gyration: 0.05, inertia: () => this.world.bodyInertia(id) });
      }
      const t = r.transforms, v = r.velocities;
      bodies.push({ id, p: [t[i * 7]!, t[i * 7 + 1]!, t[i * 7 + 2]!] as [number, number, number], v: [v[i * 6]!, v[i * 6 + 1]!, v[i * 6 + 2]!] as [number, number, number], w: [v[i * 6 + 3]!, v[i * 6 + 4]!, v[i * 6 + 5]!] as [number, number, number] });
    }
    // held parts move with a hand, not on their own
    this.watchdog.opts.held = new Set(this.world.heldBodies());
    // what the drives put into each body this tick: motion a drive paid for has its cause
    this.watchdog.observeDrives(this.world.driveWork());
    this.watchdog.observe(bodies, r.stats.stepMs, r.stats.sections, r.stats.substeps, r.stats.magnetPairs);
    this.watchdog.observePower(r.power);
  }

  /** Advance simulated time by dt seconds (already scaled by the time-scale). At most maxTicks ticks run. */
  advance(dt: number, maxTicks = 4, singleStep = false): AdvanceResult {
    this.acc += dt;
    let ticks = singleStep ? 1 : Math.floor(this.acc / TICK);
    if (singleStep) this.acc = 0;
    if (ticks > maxTicks) {
      ticks = maxTicks;
      this.acc = 0; // fall behind gracefully: simulation slows instead of spiralling
    } else if (!singleStep) {
      this.acc -= ticks * TICK;
    }
    let prev = this.last?.transforms ?? new Float32Array(0);
    const events: PhysicsEvent[] = this.pendingEvents;
    this.pendingEvents = [];
    let stepMs = 0;
    const heat: Record<string, number> = {};
    for (let i = 0; i < ticks; i++) {
      if (i === ticks - 1 && this.last) prev = this.last.transforms;
      const r = this.world.step();
      stepMs += r.stats.stepMs;
      for (const [id, q] of Object.entries(r.heat ?? {})) heat[id] = (heat[id] ?? 0) + q;
      if (r.slots) { this.slots = r.slots; this.info.clear(); }
      events.push(...r.events);
      this.last = r;
      this.observe(r);
      this.ticks++;
      if (this.minds.length && this.ticks % THINK_TICKS === 0) this.think(events);
    }
    // nothing stepped (paused, or too little time): still report the world as the ops just left it
    if (!this.last) this.last = this.world.step();
    else if (ticks === 0) {
      const snap = this.world.snapshot();
      if (snap.slots) this.slots = snap.slots;
      events.push(...snap.events);
      prev = snap.transforms;
      this.last = snap;
    }
    const cur = this.last;
    const out: AdvanceResult = {
      ...cur,
      slots: this.slots,
      events,
      prevTransforms: ticks > 0 ? prev : cur.transforms,
      alpha: singleStep ? 1 : Math.min(1, this.acc / TICK),
      ticksRun: ticks,
      stats: { ...cur.stats, stepMs },
      heat: ticks > 0 ? heat : {},
      watchdog: [],
    };
    // a contained fault (world.ts, F3) is still a defect: the world put the body back, the watch must still see it
    for (const e of events) if (e.type === 'fault' && !this.reported.has(`nonfinite|${e.body}`)) {
      this.reported.add(`nonfinite|${e.body}`);
      out.watchdog.push({ kind: 'nonfinite', severity: 'critical', id: e.body, tick: this.last.stats.ticks, value: NaN, limit: 0, detail: `contained: ${e.note}` });
    }
    // a joint that came apart while intact breaks a rule no real joint breaks
    for (const e of events) if (e.type === 'drift' && !this.reported.has(`drift|${e.conn}`)) {
      this.reported.add(`drift|${e.conn}`);
      out.watchdog.push({ kind: 'drift', severity: 'critical', id: e.conn, tick: this.last.stats.ticks, value: e.gap, limit: 0.005, detail: e.note });
    }
    for (const a of this.watchdog.anomalies()) {
      const k = `${a.kind}|${a.id}`;
      if (!this.reported.has(k)) { this.reported.add(k); out.watchdog.push(a); }
    }
    return out;
  }

  static create(J: ConstructorParameters<typeof PhysicsWorld>[0], sim: SimSettings) {
    return new Runner(new PhysicsWorld(J, sim));
  }
}
