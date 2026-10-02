// The creatures that live in the world, each with its mind. Ten times a second of world time each one senses where it
// is (its body's live pose), where you are and where the water is, thinks (mind.ts), and tells its legs what stride to
// take (the physics 'gait' op). Paused, the world's time stands still and so do their thoughts; a creature whose body
// is gone from the world is gone from the herd.

import type { Pose, Vec3 } from '../doc/types';
import type { Walker } from './creature';
import { newMind, strides, think, type Mind, type Want } from './mind';

export interface HerdHost {
  /** World seconds. */
  time(): number;
  pose(id: string): Pose | null;
  exists(id: string): boolean;
  /** You, where you stand. */
  you(): Vec3;
  dry(x: number, z: number): boolean;
  gait(amplitude: Record<string, number>): void;
}

export interface Member { name: string; walker: Walker; mind: Mind; walking: boolean }

/** How often they think, s of world time. */
const THINK = 0.1;

export class Herd {
  members: Member[] = [];
  private last = -Infinity;
  /** What they chose lately, newest last: "the dog goes to look at something". */
  readonly said: string[] = [];

  constructor(private host: HerdHost) {}

  add(name: string, walker: Walker, seed = this.members.length + 1): Member {
    const m: Member = { name, walker, mind: newMind(seed), walking: true };
    this.members.push(m);
    return m;
  }

  /** What each is doing now. */
  doing(): { name: string; doing: Want }[] {
    return this.members.map((m) => ({ name: m.name, doing: m.mind.doing }));
  }

  tick() {
    const now = this.host.time();
    if (now < this.last) this.last = now - THINK; // the world was rewound
    if (now - this.last < THINK) return;
    const dt = Math.min(1, now - this.last);
    this.last = now;
    this.members = this.members.filter((m) => this.host.exists(m.walker.body));
    for (const m of this.members) {
      const self = this.host.pose(m.walker.body);
      if (!self) continue;
      const c = think(m.mind, self, { time: now, you: this.host.you(), dry: (x, z) => this.host.dry(x, z) }, dt, m.walking);
      m.walking = c.left > 0 || c.right > 0;
      this.host.gait(strides(c, m.walker));
      if (c.says) {
        this.said.push(`${m.name} ${c.says}`);
        if (this.said.length > 20) this.said.shift();
      }
    }
  }
}
