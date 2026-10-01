// The frame budget: where each frame's time goes, by subsystem, and the watchdog's finding when it runs over. On a
// Quest a frame has 13.9 ms (72 Hz) for everything; a frame that runs long is felt as lag. A finding names what took
// the time (Ego's foresight, the physics, the tablet...), so a slow build is caught and traced before you notice it.

import type { Anomaly } from './watchdog';

/** A frame at 72 Hz. */
export const FRAME_BUDGET_MS = 1000 / 72;
/** One call this long is a hitch you feel, whatever the average. */
export const HITCH_MS = 50;

export class FrameBudget {
  private sums = new Map<string, number>();
  private frames = 0;
  private frameMs = 0;
  private flagged = new Set<string>();
  private out: Anomaly[] = [];
  private tick = 0;

  constructor(private windowFrames = 144, private budgetMs = FRAME_BUDGET_MS) {}

  /** Time one subsystem's work this frame. */
  measure<T>(name: string, fn: () => T): T {
    const t = performance.now();
    try {
      return fn();
    } finally {
      const ms = performance.now() - t;
      this.sums.set(name, (this.sums.get(name) ?? 0) + ms);
      if (ms > HITCH_MS && !this.flagged.has(`hitch:${name}`)) {
        this.flagged.add(`hitch:${name}`);
        this.out.push({ kind: 'slow', severity: 'warning', id: '', tick: this.tick, value: ms, limit: HITCH_MS, detail: `${name} took ${ms.toFixed(0)} ms in one go (a hitch: over ${HITCH_MS} ms)` });
      }
    }
  }

  /** A frame is done: `ms` is its whole CPU time. Over a window, a frame that averages over budget is a finding. */
  endFrame(ms: number) {
    this.tick++;
    this.frames++;
    this.frameMs += ms;
    if (this.frames < this.windowFrames) return;
    const mean = this.frameMs / this.frames;
    if (mean > this.budgetMs) {
      const top = [...this.sums].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${(v / this.frames).toFixed(1)} ms`);
      const key = `slow:${top[0]?.split(' ')[0] ?? ''}`;
      if (!this.flagged.has(key)) {
        this.flagged.add(key);
        this.out.push({ kind: 'slow', severity: 'warning', id: '', tick: this.tick, value: mean, limit: this.budgetMs, detail: `frames took ${mean.toFixed(1)} ms of CPU on average (budget ${this.budgetMs.toFixed(1)} ms): ${top.join(', ')}` });
      }
    }
    this.sums.clear();
    this.frames = 0;
    this.frameMs = 0;
  }

  /** Average ms per frame of each subsystem over the window so far (for the stats page). */
  breakdown(): [string, number][] {
    return [...this.sums].map(([k, v]) => [k, v / Math.max(1, this.frames)] as [string, number]).sort((a, b) => b[1] - a[1]);
  }

  /** Findings since last asked. */
  take(): Anomaly[] {
    const o = this.out;
    this.out = [];
    return o;
  }
}
