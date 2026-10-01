// The watchdog: physical invariants checked on every tick's output, for every body.
//
// It sees the world only through what a step reports (each body's pose and velocity, and the step's timing), so it
// runs the same way in the stress-test web (Spiderweb), in tests, and live in the app. What it flags:
//   nonfinite  a pose or velocity that is NaN or infinite                                    critical
//   drift      an intact joint whose two sides came apart (reported by the world)              critical
//   fell       a body far below the floor: it fell out of the world                          critical
//   tunnel     a body on the wrong side of a wall it must not pass                           critical
//   flung      faster than anything in the scene could make it                               critical
//   energy     a passive scene (gravity, contact, friction only) gaining energy               critical
//   spin       a held body still turning after the hand has had time to steady it            critical
//   jitter     a body shaking in place instead of coming to rest                             warning
//   restless   a body that should have come to rest still moving                             warning
//   slow       a tick over the time budget                                                   warning
// Each anomaly is reported once per body and kind (with its worst value), so a report stays readable.

export type Vec3 = [number, number, number];

export type AnomalyKind = 'nonfinite' | 'drift' | 'fell' | 'tunnel' | 'flung' | 'energy' | 'spin' | 'jitter' | 'restless' | 'slow' | 'unsteady' | 'crash' | 'leak' | 'storage';

export interface Anomaly {
  kind: AnomalyKind;
  severity: 'critical' | 'warning';
  /** Body id, or "" for the whole scene. */
  id: string;
  /** Tick it was first seen. */
  tick: number;
  /** Worst value seen, and the limit it broke (units in `detail`). */
  value: number;
  limit: number;
  detail: string;
}

export interface BodyState {
  id: string;
  p: Vec3;
  v: Vec3;
  w: Vec3;
}

export interface BodyInfo {
  mass: number;
  /** Radius of gyration (m), for rim speeds (how fast its surface moves when it turns). */
  gyration: number;
  /** World-space inertia tensor now (row-major 3 x 3), for rotational kinetic energy; else m gyration^2 is used. */
  inertia?: () => number[] | null;
}

export interface WatchOptions {
  gravity: Vec3;
  floorY: number;
  /** Speed (m/s) nothing in the scene should reach. */
  flungSpeed: number;
  /** Mean tick time (ms) over a second that counts as slow. */
  budgetMs: number;
  /** The scene has no source of energy but gravity (no motors, magnets, springs wound up, or hands). */
  passive: boolean;
  /** Ticks after which bodies not held should have come to rest (Infinity: never expected to). */
  settleTicks: number;
  /** Bodies held by a hand whose target is still: they must stop turning after `settleTicks`. */
  held: Set<string>;
  /** Half-spaces bodies must stay in: n . p >= d - margin. */
  walls: { n: Vec3; d: number; margin: number }[];
}

const SEVERITY: Record<AnomalyKind, 'critical' | 'warning'> = {
  nonfinite: 'critical',
  drift: 'critical', fell: 'critical', tunnel: 'critical', flung: 'critical', energy: 'critical', spin: 'critical',
  jitter: 'warning', restless: 'warning', slow: 'warning', unsteady: 'critical', crash: 'critical', leak: 'critical', storage: 'critical',
};

const WINDOW = 30;

export class Watchdog {
  private found = new Map<string, Anomaly>();
  private hist = new Map<string, { p: Vec3[]; speed: number[] }>();
  private e0: number | null = null;
  private eMax = -Infinity;
  private ticks = 0;
  private stepMs: number[] = [];
  private sectionMs = new Map<string, number>();
  private substepSum = 0;
  private pairSum = 0;
  private spinTicks = new Map<string, number>();
  readonly opts: WatchOptions;

  constructor(private info: Map<string, BodyInfo>, opts: Partial<WatchOptions> = {}) {
    this.opts = {
      gravity: [0, -9.81, 0], floorY: 0, flungSpeed: 20, budgetMs: 4, passive: false, settleTicks: Infinity,
      held: new Set(), walls: [], ...opts,
    };
  }

  private flag(kind: AnomalyKind, id: string, value: number, limit: number, detail: string) {
    const key = `${kind}|${id}`;
    const prev = this.found.get(key);
    if (!prev) this.found.set(key, { kind, severity: SEVERITY[kind], id, tick: this.ticks, value, limit, detail });
    else if (Math.abs(value) > Math.abs(prev.value)) { prev.value = value; prev.detail = detail; }
  }

  /** One tick's output. */
  observe(bodies: BodyState[], stepMs = 0, sections?: Record<string, number>, substeps = 1, magnetPairs = 0) {
    this.ticks++;
    const o = this.opts;
    const g = Math.hypot(...o.gravity);
    let energy = 0;
    this.stepMs.push(stepMs);
    for (const [k, v] of Object.entries(sections ?? {})) this.sectionMs.set(k, (this.sectionMs.get(k) ?? 0) + v);
    this.substepSum += substeps;
    this.pairSum += magnetPairs;
    if (this.stepMs.length >= 90) {
      const n = this.stepMs.length;
      const mean = this.stepMs.reduce((s, x) => s + x, 0) / n;
      // what took the time, so the finding says where to look (magnets, joints, the solver...)
      const top = [...this.sectionMs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${(v / n).toFixed(1)} ms`);
      const why = top.length ? `: ${top.join(', ')}; ${(this.substepSum / n).toFixed(1)} substeps, ${(this.pairSum / n).toFixed(0)} magnetic pairs a tick` : '';
      if (mean > o.budgetMs) this.flag('slow', '', mean, o.budgetMs, `ticks took ${mean.toFixed(2)} ms on average (budget ${o.budgetMs} ms)${why}`);
      this.stepMs = [];
      this.sectionMs.clear();
      this.substepSum = 0;
      this.pairSum = 0;
    }
    for (const b of bodies) {
      const vals = [...b.p, ...b.v, ...b.w];
      if (vals.some((x) => !Number.isFinite(x))) { this.flag('nonfinite', b.id, NaN, 0, 'pose or velocity is not a number'); continue; }
      const info = this.info.get(b.id) ?? { mass: 1, gyration: 0.05 };
      const speed = Math.hypot(...b.v), spin = Math.hypot(...b.w);
      const I = info.inertia?.();
      // w . I w, and from it the radius of gyration about the axis it is actually turning on
      const wIw = I
        ? b.w[0] * (I[0]! * b.w[0] + I[1]! * b.w[1] + I[2]! * b.w[2]) + b.w[1] * (I[3]! * b.w[0] + I[4]! * b.w[1] + I[5]! * b.w[2]) + b.w[2] * (I[6]! * b.w[0] + I[7]! * b.w[1] + I[8]! * b.w[2])
        : null;
      const gyration = wIw !== null && spin > 0 ? Math.sqrt(wIw / (info.mass * spin * spin)) : info.gyration;
      const rim = speed + spin * gyration;
      if (b.p[1] < o.floorY - 2) this.flag('fell', b.id, b.p[1], o.floorY - 2, `at y = ${b.p[1].toFixed(2)} m, below the floor at ${o.floorY} m`);
      if (speed > o.flungSpeed) this.flag('flung', b.id, speed, o.flungSpeed, `moving at ${speed.toFixed(1)} m/s (nothing here should pass ${o.flungSpeed} m/s)`);
      for (const w of o.walls) {
        const s = w.n[0] * b.p[0] + w.n[1] * b.p[1] + w.n[2] * b.p[2];
        if (s < w.d - w.margin) this.flag('tunnel', b.id, w.d - s, w.margin, `${((w.d - s) * 1000).toFixed(0)} mm through a wall`);
      }
      const rot = wIw ?? info.mass * (spin * info.gyration) ** 2;
      energy += 0.5 * (info.mass * speed * speed + rot) + info.mass * g * (b.p[1] - o.floorY);
      // history for jitter and rest
      let h = this.hist.get(b.id);
      if (!h) this.hist.set(b.id, (h = { p: [], speed: [] }));
      h.p.push(b.p);
      h.speed.push(rim);
      if (h.p.length > WINDOW) { h.p.shift(); h.speed.shift(); }
      if (this.ticks > o.settleTicks && h.p.length === WINDOW) {
        const rms = Math.sqrt(h.speed.reduce((s, x) => s + x * x, 0) / WINDOW);
        const a = h.p[0]!, z = h.p[WINDOW - 1]!;
        const net = Math.hypot(z[0] - a[0], z[1] - a[1], z[2] - a[2]);
        if (o.held.has(b.id)) {
          const n = spin > 2 ? (this.spinTicks.get(b.id) ?? 0) + 1 : 0;
          this.spinTicks.set(b.id, n);
          if (n >= 20) this.flag('spin', b.id, spin, 2, `still turning at ${spin.toFixed(1)} rad/s in a still hand`);
        } else if (rms > 0.01 && net < 0.002) {
          this.flag('jitter', b.id, rms, 0.01, `shaking in place at ${(rms * 1000).toFixed(0)} mm/s rms, going nowhere`);
        } else if (rim > 0.01) {
          this.flag('restless', b.id, rim, 0.01, `still moving at ${(rim * 1000).toFixed(0)} mm/s when it should be at rest`);
        }
      }
    }
    if (o.passive && bodies.length) {
      if (this.e0 === null) this.e0 = energy;
      this.eMax = Math.max(this.eMax, energy);
      const gain = energy - this.e0;
      const tol = 0.02 * Math.abs(this.e0) + 1e-3;
      if (gain > tol) this.flag('energy', '', gain, tol, `the scene gained ${gain.toFixed(4)} J with nothing to supply it (started with ${this.e0.toFixed(4)} J)`);
    }
  }

  anomalies(): Anomaly[] {
    return [...this.found.values()].sort((a, b) => (a.severity === b.severity ? a.tick - b.tick : a.severity === 'critical' ? -1 : 1));
  }
}
