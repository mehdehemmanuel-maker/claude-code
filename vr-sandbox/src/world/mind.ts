// A creature's mind: what it senses, what it wants, what it chooses, and how the choice reaches its legs. Nothing here
// moves it. A mind can only do what an animal's brain does to its spinal cord: lengthen or shorten each side's stride
// (the 'gait' op scales each hip servo's swing), and still them. The rhythms keep their own time and the legs do the
// walking; turning comes from strides of different lengths on each side, as it does for a dog.
//
//   sense   what it can see: you, its goal, where the water is. Its eyes take in a wide arc ahead (a dog's about 240°,
//           Miller & Murphy, Vision in dogs, J. Am. Vet. Med. Assoc. 207, 1995), not behind it, and along straight
//           rays: what stands between you and it hides you (F-6.2, the world's ray cast); what it no longer sees it
//           remembers where it last saw.
//   want    urges that rise and fall: company (to be near you, more the further you are), curiosity (to go somewhere it
//           hasn't been, rising while nothing is new) and tiredness (rising as it walks, falling as it rests).
//   choose  the strongest urge, with a little favour to what it is already doing so it doesn't dither between two;
//           worn out, it rests whatever else it wants.
//   act     a goal on dry ground; strides shortened on the side it turns toward; slower as it nears; still when there;
//           no closer for five seconds, it gives up on that goal and goes another way.

import type { Pose, Vec3 } from '../doc/types';
import { rotate } from '../doc/math';

export type Want = 'company' | 'curiosity' | 'rest';

export interface Mind {
  /** Its eyes: the arc they take in, rad, and how far, m. */
  fov: number;
  sight: number;
  /** Its urges, each 0 to 1. */
  urge: Record<Want, number>;
  /** What it is doing now, and since when (s). */
  doing: Want;
  since: number;
  /** Where it is going, if anywhere. */
  goal: Vec3 | null;
  /** Where it last saw you, and when. */
  sawYou: { at: Vec3; time: number } | null;
  /** Its choices, newest last, in words. */
  said: string[];
  /** Its own random sequence: where curiosity takes it. */
  seed: number;
  /** How close it has come to its goal, and when it last came closer: going nowhere, it gives up. */
  closest?: { d: number; time: number };
}

/**
 * Where a walker is released so that its first want is you: the distance at which its company urge, which grows with
 * how far you are, first outweighs a fresh mind's curiosity by itself (it would otherwise set off to look at something
 * and turn hard on the spot), plus its own length to walk toward you.
 */
export const releaseDistance = (bodyLength: number, m: Mind = newMind()): number => NEAR_YOU + 2 * m.urge.curiosity + bodyLength;

export function newMind(seed = 1): Mind {
  return { fov: (240 * Math.PI) / 180, sight: 30, urge: { company: 0.5, curiosity: 0.2, rest: 0 }, doing: 'company', since: 0, goal: null, sawYou: null, said: [], seed: seed >>> 0 || 1 };
}

/** A creature's heading: rad about up, 0 facing +x (as buildWalker builds it). */
export function headingOf(q: Pose['q']): number {
  const f = rotate(q, [1, 0, 0]);
  return Math.atan2(-f[2], f[0]);
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Where something is from where it stands: how far, and how far round to its left (rad, + left). */
export function bearing(self: Pose, at: Vec3): { distance: number; turn: number } {
  const dx = at[0] - self.p[0], dz = at[2] - self.p[2];
  return { distance: Math.hypot(dx, dz), turn: wrap(Math.atan2(-dz, dx) - headingOf(self.q)) };
}

/** Whether it sees a point: ahead within its eyes' arc and in sight. */
export function sees(m: Mind, self: Pose, at: Vec3): boolean {
  const b = bearing(self, at);
  return b.distance <= m.sight && Math.abs(b.turn) <= m.fov / 2;
}

/** The world as its senses give it. */
export interface World {
  time: number;
  /** You, where you stand. */
  you: Vec3;
  /** Whether ground is dry there (above the water, if any). */
  dry(x: number, z: number): boolean;
  /** Whether a straight ray from its eyes reaches a point with nothing in the way (F-6.2). */
  clear(from: Vec3, to: Vec3): boolean;
}

/** What its legs are told: each side's stride (0 still, 1 full), and what it is doing, in words. */
export interface Command { left: number; right: number; doing: Want; says: string | null }

/** How near is near enough: to you, and to a place it is going; and how far ahead it looks at the ground, m. */
const NEAR_YOU = 1.0, ARRIVE = 0.3, LOOK = 0.8;

function random(m: Mind): number {
  // mulberry32: a creature's own reproducible chance
  let t = (m.seed = (m.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Somewhere new to go: ahead of it more than behind, a metre or three off, on dry ground. */
function somewhereNew(m: Mind, self: Pose, w: World): Vec3 | null {
  const h = headingOf(self.q);
  for (let k = 0; k < 12; k++) {
    const a = h + (random(m) - 0.5) * Math.PI, r = 1 + 2 * random(m);
    const x = self.p[0] + r * Math.cos(a), z = self.p[2] - r * Math.sin(a);
    if (w.dry(x, z)) return [x, self.p[1], z];
  }
  return null;
}

/**
 * One moment of thought, `dt` seconds after the last: sense, feel, choose, act. Pure but for the mind it changes, so a
 * creature thinks the same in a test as in the world.
 */
export function think(m: Mind, self: Pose, w: World, dt: number, walking: boolean): Command {
  // sense
  // within its eyes' arc and reach, and nothing between: its eyes are at its body, which is its own to see past
  if (sees(m, self, w.you) && w.clear(self.p, w.you)) m.sawYou = { at: [...w.you], time: w.time };
  const you = m.sawYou ? bearing(self, m.sawYou.at) : null;
  // feel: company grows with how far you are; curiosity while nothing is new; tiredness with walking (two minutes of
  // walking tire it, half a minute of rest restores it)
  m.urge.company = you ? Math.min(1, Math.max(0, (you.distance - NEAR_YOU) / 2)) : 0.3;
  m.urge.curiosity = Math.min(1, m.urge.curiosity + dt / 40);
  m.urge.rest = Math.min(1, Math.max(0, m.urge.rest + (walking ? dt / 120 : -dt / 30)));
  // choose: the strongest, with a little favour to what it is doing; worn out, it rests whatever else it wants
  const favour = (k: Want) => m.urge[k] + (k === m.doing ? 0.15 : 0);
  const pick = m.urge.rest >= 1 ? 'rest' : (['company', 'curiosity', 'rest'] as Want[]).reduce((a, b) => (favour(b) > favour(a) ? b : a));
  let says: string | null = null;
  if (pick !== m.doing) {
    m.doing = pick;
    m.since = w.time;
    m.goal = null;
    m.closest = undefined;
    says = pick === 'company' ? 'comes back to you' : pick === 'curiosity' ? 'goes to look at something' : 'lies down to rest';
    m.said.push(says);
    if (m.said.length > 20) m.said.shift();
  }
  // act
  if (m.doing === 'rest') return { left: 0, right: 0, doing: m.doing, says };
  if (m.doing === 'company') m.goal = m.sawYou ? m.sawYou.at : null;
  if (m.doing === 'curiosity' && !m.goal) { m.goal = somewhereNew(m, self, w); m.closest = undefined; }
  if (!m.goal) {
    // nothing to go to: look about for you, turning on the spot (one side still, the other striding)
    return { left: 0, right: 1, doing: m.doing, says };
  }
  const g = bearing(self, m.goal);
  // no closer for five seconds (stuck, or circling it): it gives up on that goal and looks for another way
  if (!m.closest || g.distance < m.closest.d - 0.05) m.closest = { d: g.distance, time: w.time };
  else if (w.time - m.closest.time > 5) {
    // the urge to go another way: somewhere new, before it tries again
    m.closest = undefined;
    m.goal = null;
    m.urge.curiosity = 1;
    m.doing = 'curiosity';
    m.since = w.time;
    m.said.push('gives up and goes another way');
    if (m.said.length > 20) m.said.shift();
    const c = think(m, self, w, 0, walking);
    return { ...c, says: 'gives up and goes another way' };
  }
  const near = m.doing === 'company' ? NEAR_YOU : ARRIVE;
  if (g.distance < near) {
    if (m.doing === 'curiosity') { m.urge.curiosity = 0; m.goal = null; m.closest = undefined; }
    return { left: 0, right: 0, doing: m.doing, says };
  }
  // water ahead: turn from it as if it were behind. It looks as far ahead as three seconds of walking take it, the
  // time a one-sided turn needs to come round 90° (measured 3 October 2026 at a floor's edge over water: a look of
  // 0.4 m turned it too late by 0.15 m and it went over; 0.8 m turns it on the floor)
  const ahead: Vec3 = [self.p[0] + LOOK * Math.cos(headingOf(self.q)), 0, self.p[2] - LOOK * Math.sin(headingOf(self.q))];
  const turn = !w.dry(ahead[0], ahead[2]) ? Math.PI : g.turn;
  // the stride on the side it turns toward shortens, fully 25° off: a stride only a little shorter on one side
  // hardly turns a four-legged walk (one side still turns it about 30° a second)
  const k = Math.max(-1, Math.min(1, turn / ((25 * Math.PI) / 180)));
  const pace = Math.min(1, 0.5 + g.distance / 2);
  return { left: pace * (1 - Math.max(0, k)), right: pace * (1 - Math.max(0, -k)), doing: m.doing, says };
}

/** The 'gait' op's amplitudes for a walker's servos from a command: its hips by side; its knees still only when it is. */
export function strides(c: Command, w: { left: string[]; right: string[]; servos: string[] }): Record<string, number> {
  const out: Record<string, number> = {};
  const moving = c.left > 0 || c.right > 0 ? 1 : 0;
  for (const id of w.servos) out[id] = moving;
  for (const id of w.left) out[id] = c.left;
  for (const id of w.right) out[id] = c.right;
  return out;
}
