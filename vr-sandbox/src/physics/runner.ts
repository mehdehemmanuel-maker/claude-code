// Fixed-timestep driver around PhysicsWorld, shared by the worker and the inline (main-thread) mode.

import type { SimSettings } from '../doc/types';
import { PhysicsWorld, TICK } from './world';
import type { PhysicsEvent, PhysicsOp, StepResult } from './protocol';
import { Watchdog, type Anomaly, type BodyInfo } from '../diagnostics/watchdog';

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
      this.world.apply(op);
      // a new scene starts a new watch
      if (op.op === 'clear') { this.watchdog = this.makeWatchdog(); this.reported.clear(); }
    }
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
    this.watchdog.observe(bodies, r.stats.stepMs, r.stats.sections, r.stats.substeps, r.stats.magnetPairs);
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
