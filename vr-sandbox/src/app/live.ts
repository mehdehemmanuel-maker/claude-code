// Latest physics state on the main thread, with interpolation between the last two physics ticks.

import type { Pose, Vec3 } from '../doc/types';
import type { ConnectionLoad, PhysicsEvent } from '../physics/protocol';
import type { AdvanceResult } from '../physics/runner';
import type { Anomaly } from '../diagnostics/watchdog';
import type { Energies } from '../physics/energy';

export class LiveState {
  private slots: (string | null)[] = [];
  private index = new Map<string, number>();
  private prev: Float32Array<ArrayBufferLike> = new Float32Array(0);
  private curr: Float32Array<ArrayBufferLike> = new Float32Array(0);
  private vel: Float32Array<ArrayBufferLike> = new Float32Array(0);
  alpha = 1;
  loads = new Map<string, ConnectionLoad>();
  /** Per breakable part: utilisation of each bond between its segments (-1 = broken). */
  bonds: Record<string, number[]> = {};
  cure: Record<string, number> = {};
  stats: AdvanceResult['stats'] | null = null;
  pendingEvents: PhysicsEvent[] = [];
  /** Physics ticks actually run. Under load physics slows down rather than spiralling, so this, not the app's
   *  clock, is how much simulated time has passed. */
  ticks = 0;
  /** The energy ledger (physics/energy.ts), as of the last tick. */
  energy: Energies | null = null;
  /** Heat each part took since last read (J), from the physics, to warm it by. */
  heatIn: Record<string, number> = {};
  /** Each part's temperature, deg C, where it isn't at the room's (parts at room temperature aren't listed). */
  temps = new Map<string, number>();
  /** What the live watchdog has flagged this session, newest last (bounded). */
  health: (Anomaly & { at: number })[] = [];

  /** Something the watchdog (in the physics, or the frame budget here) found. */
  flag(a: Anomaly) {
    this.health.push({ ...a, at: this.ticks });
    if (this.health.length > 50) this.health.shift();
    console.warn(`[watchdog] ${a.severity} ${a.kind}${a.id ? ` ${a.id}` : ''}: ${a.detail}`);
  }

  ingest(r: AdvanceResult) {
    for (const a of r.watchdog ?? []) this.flag(a);
    if (r.energy) this.energy = r.energy;
    for (const [id, q] of Object.entries(r.heat ?? {})) this.heatIn[id] = (this.heatIn[id] ?? 0) + q;
    if (r.slots) {
      this.slots = r.slots;
      this.index.clear();
      r.slots.forEach((id, i) => { if (id) this.index.set(id, i); });
    }
    this.prev = r.prevTransforms.length === r.transforms.length ? r.prevTransforms : r.transforms;
    this.curr = r.transforms;
    this.vel = r.velocities;
    this.alpha = r.alpha;
    this.loads.clear();
    for (const l of r.loads) this.loads.set(l.id, l);
    this.cure = r.cure;
    this.bonds = r.bonds ?? {};
    this.stats = r.stats;
    this.ticks += r.ticksRun;
    this.pendingEvents.push(...r.events);
  }

  has(id: string) {
    const s = this.index.get(id);
    return s !== undefined && s * 7 + 6 < this.curr.length;
  }

  /** Interpolated pose, or null if physics has not reported this part yet. */
  pose(id: string, out?: Pose): Pose | null {
    const s = this.index.get(id);
    if (s === undefined) return null;
    const o = s * 7;
    if (o + 6 >= this.curr.length) return null;
    const a = this.alpha;
    const c = this.curr, p = this.prev;
    const lerp = (i: number) => p[o + i]! + (c[o + i]! - p[o + i]!) * a;
    let qx = lerp(3), qy = lerp(4), qz = lerp(5), qw = lerp(6);
    // prev/curr quaternions may be on opposite hemispheres
    if (p[o + 3]! * c[o + 3]! + p[o + 4]! * c[o + 4]! + p[o + 5]! * c[o + 5]! + p[o + 6]! * c[o + 6]! < 0) {
      qx = c[o + 3]!; qy = c[o + 4]!; qz = c[o + 5]!; qw = c[o + 6]!;
    }
    const n = Math.hypot(qx, qy, qz, qw) || 1;
    const pose = out ?? { p: [0, 0, 0], q: [0, 0, 0, 1] };
    pose.p[0] = lerp(0); pose.p[1] = lerp(1); pose.p[2] = lerp(2);
    pose.q[0] = qx / n; pose.q[1] = qy / n; pose.q[2] = qz / n; pose.q[3] = qw / n;
    return pose;
  }

  /** Latest (not interpolated) pose. */
  latest(id: string): Pose | null {
    const s = this.index.get(id);
    if (s === undefined) return null;
    const o = s * 7;
    const c = this.curr;
    if (o + 6 >= c.length) return null;
    return { p: [c[o]!, c[o + 1]!, c[o + 2]!], q: [c[o + 3]!, c[o + 4]!, c[o + 5]!, c[o + 6]!] };
  }

  velocity(id: string): { linear: Vec3; angular: Vec3 } | null {
    const s = this.index.get(id);
    if (s === undefined) return null;
    const o = s * 6;
    const v = this.vel;
    if (o + 5 >= v.length) return null;
    return { linear: [v[o]!, v[o + 1]!, v[o + 2]!], angular: [v[o + 3]!, v[o + 4]!, v[o + 5]!] };
  }

  ids() {
    return [...this.index.keys()];
  }
}
