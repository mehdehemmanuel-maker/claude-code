// The creatures that live in the world, each with its mind. A mind lives in the physics (runner.ts): ten times a second
// of world time it senses where its body is, where you are and where the water is, thinks (mind.ts), and tells its
// legs what stride to take (the world's 'gait'), on the world's own ticks whatever a frame carries (F-6.3). Paused, the
// world's time stands still and so do their thoughts; a creature whose body is gone from the world is gone from the
// herd. This is the herd's book: who is in it, what each is doing, and what they said, from the minds' events.

import type { PhysicsEvent, PhysicsOp } from '../physics/protocol';
import type { Walker } from './creature';
import type { Want } from './mind';

export interface HerdHost {
  /** Into the physics, where the minds live. */
  send(op: PhysicsOp): void;
  exists(id: string): boolean;
}

export interface Member { name: string; walker: Walker; doing: Want }

export class Herd {
  members: Member[] = [];
  /** What they chose lately, newest last: "the dog goes to look at something". */
  readonly said: string[] = [];

  constructor(private host: HerdHost) {}

  /** A creature joins: its nerves go to the physics with its own seed (where curiosity takes it). */
  add(name: string, walker: Walker, seed = this.members.length + 1): Member {
    const m: Member = { name, walker, doing: 'company' };
    this.members.push(m);
    this.host.send({ op: 'mind', name, nerves: { body: walker.body, parts: walker.parts, left: walker.left, right: walker.right, servos: walker.servos }, seed });
    return m;
  }

  /** What each is doing now. */
  doing(): { name: string; doing: Want }[] {
    this.prune();
    return this.members.map((m) => ({ name: m.name, doing: m.doing }));
  }

  /** A mind's choice, as the physics reported it. */
  ingest(e: PhysicsEvent) {
    if (e.type !== 'mind') return;
    const m = this.members.find((x) => x.walker.body === e.body);
    if (m) m.doing = e.doing;
    if (e.says) {
      this.said.push(`${e.name} ${e.says}`);
      if (this.said.length > 20) this.said.shift();
    }
  }

  /** A creature whose body is gone is gone. */
  prune() {
    this.members = this.members.filter((m) => this.host.exists(m.walker.body));
  }
}
