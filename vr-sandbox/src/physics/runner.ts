// Fixed-timestep driver around PhysicsWorld, shared by the worker and the inline (main-thread) mode.

import type { SimSettings } from '../doc/types';
import { PhysicsWorld, TICK } from './world';
import type { PhysicsEvent, PhysicsOp, StepResult } from './protocol';

export interface AdvanceResult extends StepResult {
  /** Transforms before the last tick, for interpolation. */
  prevTransforms: Float32Array;
  /** Fraction of a tick left in the accumulator (0..1). */
  alpha: number;
  ticksRun: number;
}

export class Runner {
  private acc = 0;
  private last: StepResult | null = null;
  private pendingEvents: PhysicsEvent[] = [];
  private slots: (string | null)[] | undefined;

  constructor(readonly world: PhysicsWorld) {}

  apply(ops: PhysicsOp[]) {
    for (const op of ops) this.world.apply(op);
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
    for (let i = 0; i < ticks; i++) {
      if (i === ticks - 1 && this.last) prev = this.last.transforms;
      const r = this.world.step();
      stepMs += r.stats.stepMs;
      if (r.slots) this.slots = r.slots;
      events.push(...r.events);
      this.last = r;
    }
    if (!this.last) this.last = this.world.step();
    const cur = this.last;
    const out: AdvanceResult = {
      ...cur,
      slots: this.slots,
      events,
      prevTransforms: ticks > 0 ? prev : cur.transforms,
      alpha: singleStep ? 1 : Math.min(1, this.acc / TICK),
      ticksRun: ticks,
      stats: { ...cur.stats, stepMs },
    };
    return out;
  }

  static create(J: ConstructorParameters<typeof PhysicsWorld>[0], sim: SimSettings) {
    return new Runner(new PhysicsWorld(J, sim));
  }
}
