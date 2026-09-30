// Foresight: what each joint will carry before anything moves. Every part of the build hangs off the ground through
// its joints (the ground being the floor it rests on, parts pinned to the world, and anchors). A joint that is the only
// way from some parts to the ground carries all of their weight: that weight as shear, and its moment about the joint
// (weight times the horizontal distance to their centre of mass) as bending. Compared with the joint's capacities,
// that says which will fail when you press Play. Joints with other load paths beside them share the load in ways a
// static check can't split, so they're left to the physics.

import type { Vec3 } from '../doc/types';

export interface FPart { id: string; mass: number; com: Vec3; grounded: boolean }
export interface FJoint { id: string; a: string; b: string | null; at: Vec3; shear: number; bending: number }
export interface Forecast { id: string; mode: 'shear' | 'bending'; load: number; capacity: number; u: number; carried: string[] }

export function foresee(parts: FPart[], joints: FJoint[], g = 9.81): Forecast[] {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const out: Forecast[] = [];
  for (const j of joints) {
    // the parts that hang on this joint: those that can't reach the ground without it
    const others = joints.filter((x) => x !== j);
    const reach = (start: string) => {
      const seen = new Set([start]);
      const stack = [start];
      let ground = false;
      while (stack.length) {
        const id = stack.pop()!;
        if (byId.get(id)?.grounded) ground = true;
        for (const x of others) {
          if (x.b === null) { if (x.a === id) ground = true; continue; }
          const n = x.a === id ? x.b : x.b === id ? x.a : null;
          if (n && !seen.has(n)) { seen.add(n); stack.push(n); }
        }
      }
      return { seen, ground };
    };
    let hanging: Set<string> | null = null;
    if (j.b === null) {
      const r = reach(j.a);
      if (!r.ground) hanging = r.seen;
    } else {
      const ra = reach(j.a), rb = reach(j.b);
      if (ra.seen.has(j.b)) continue; // another path joins them: a loop, shared load
      if (ra.ground && !rb.ground) hanging = rb.seen;
      else if (rb.ground && !ra.ground) hanging = ra.seen;
    }
    if (!hanging) continue;
    let m = 0;
    const c: Vec3 = [0, 0, 0];
    for (const id of hanging) {
      const p = byId.get(id);
      if (!p) continue;
      m += p.mass;
      for (let k = 0; k < 3; k++) c[k] += p.mass * p.com[k]!;
    }
    if (m <= 0) continue;
    for (let k = 0; k < 3; k++) c[k] /= m;
    const W = m * g;
    const arm = Math.hypot(c[0] - j.at[0], c[2] - j.at[2]);
    const cases: Forecast[] = [
      { id: j.id, mode: 'shear', load: W, capacity: j.shear, u: W / Math.max(j.shear, 1e-9), carried: [...hanging] },
      { id: j.id, mode: 'bending', load: W * arm, capacity: j.bending, u: (W * arm) / Math.max(j.bending, 1e-9), carried: [...hanging] },
    ];
    out.push(cases[0]!.u >= cases[1]!.u ? cases[0]! : cases[1]!);
  }
  return out.sort((x, y) => y.u - x.u);
}
