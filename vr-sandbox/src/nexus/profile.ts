// What a frame costs, part by part: each part of the room's step timed as it runs, kept as a running mean and its worst
// lately, so the slowest part is the one fixed first, and the fix shows in the numbers. A headset gives a frame 11 ms
// (Quest 3 at 90 Hz); what the parts take together, against that, is the room's budget.

export interface PartCost { name: string; mean: number; worst: number; share: number; n: number }
interface Kept { mean: number; worst: number; n: number }

/** A frame at 90 Hz, the Quest 3's default refresh rate, ms. */
export const BUDGET_MS = 1000 / 90;

export class Profile {
  private readonly parts = new Map<string, Kept>();
  private frameKept: Kept = { mean: 0, worst: 0, n: 0 };
  /** a = how fast the mean follows (0.05: about the last 20 frames); the worst decays by 0.5 % a frame */
  constructor(private readonly now: () => number = () => performance.now(), private readonly a = 0.05) {}
  /** f timed as the part called name; what it returns is returned, and what it throws thrown, after it is counted. */
  time<T>(name: string, f: () => T): T { const t0 = this.now(); try { return f(); } finally { this.add(name, this.now() - t0); } }
  add(name: string, ms: number): void { let k = this.parts.get(name); if (!k) { k = { mean: ms, worst: ms, n: 0 }; this.parts.set(name, k); } this.keep(k, ms); }
  /** A whole frame's time, from one frame's start to the next. */
  frame(ms: number): void { this.keep(this.frameKept, ms); }
  private keep(k: Kept, ms: number): void {
    // the first frames as a plain mean, then a running one: one slow start does not stand for the rest
    k.mean += (ms - k.mean) * (k.n < 20 ? 1 / (k.n + 1) : this.a);
    k.worst = Math.max(ms, k.worst * 0.995); k.n++;
  }
  get frameMean(): number { return this.frameKept.mean; }
  get frameWorst(): number { return this.frameKept.worst; }
  /** Each part, the slowest first, with its share of what the parts took together. */
  report(): PartCost[] {
    const all = [...this.parts].map(([name, k]) => ({ name, mean: k.mean, worst: k.worst, n: k.n, share: 0 }));
    const sum = all.reduce((a, p) => a + p.mean, 0) || 1;
    for (const p of all) p.share = p.mean / sum;
    return all.sort((x, y) => y.mean - x.mean);
  }
  /** The parts and the frame in a line: "render 4.1 ms (52 %), robot 1.2 ms …; frame 8.0 ms of 11.1". */
  line(top = 5): string {
    const r = this.report();
    return `${r.slice(0, top).map((p) => `${p.name} ${p.mean.toFixed(2)} ms (${Math.round(p.share * 100)} %)`).join(', ')}; frame ${this.frameMean.toFixed(1)} ms of the ${BUDGET_MS.toFixed(1)} a 90 Hz headset gives`;
  }
  reset(): void { this.parts.clear(); this.frameKept = { mean: 0, worst: 0, n: 0 }; }
}
