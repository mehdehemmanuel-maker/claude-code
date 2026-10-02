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

/**
 * Every joint that alone holds some parts off the ground, with what it will carry. One pass (Tarjan's bridges, from
 * the ground): a joint is a bridge when no other path joins its two sides, and the side away from the ground hangs on
 * it, its weight and moment summed as the search unwinds. Linear in parts and joints, so it stays instant however big
 * the build.
 */
export function foresee(parts: FPart[], joints: FJoint[], g: number): Forecast[] {
  const GROUND = parts.length;
  const index = new Map(parts.map((p, i) => [p.id, i]));
  // adjacency: [neighbour, edge id]; edges 0..J-1 are joints, the rest tie grounded parts to the ground
  const adj: [number, number][][] = Array.from({ length: parts.length + 1 }, () => []);
  const link = (u: number, v: number, e: number) => { adj[u]!.push([v, e]); adj[v]!.push([u, e]); };
  joints.forEach((j, e) => {
    const u = index.get(j.a);
    if (u === undefined) return;
    const v = j.b === null ? GROUND : index.get(j.b);
    if (v === undefined || v === u) return;
    link(u, v, e);
  });
  parts.forEach((p, i) => { if (p.grounded) link(i, GROUND, joints.length + i); });
  const n = parts.length + 1;
  const tin = new Array<number>(n).fill(-1), low = new Array<number>(n).fill(0);
  const mass = new Array<number>(n).fill(0), mc = parts.map((p) => [p.mass * p.com[0]!, p.mass * p.com[1]!, p.mass * p.com[2]!]);
  mc.push([0, 0, 0]);
  const order: number[] = [];
  const out: Forecast[] = [];
  let time = 0;
  // iterative depth-first search from the ground: [node, edge it came in by, next neighbour to look at]
  const stack: [number, number, number][] = [[GROUND, -1, 0]];
  tin[GROUND] = low[GROUND] = time++;
  order.push(GROUND);
  while (stack.length) {
    const top = stack[stack.length - 1]!;
    const [u, via] = top;
    if (top[2] < adj[u]!.length) {
      const [v, e] = adj[u]![top[2]++]!;
      if (e === via) continue;
      if (tin[v] === -1) {
        tin[v] = low[v] = time++;
        order.push(v);
        mass[v] = parts[v]?.mass ?? 0;
        stack.push([v, e, 0]);
      } else low[u] = Math.min(low[u]!, tin[v]!);
      continue;
    }
    stack.pop();
    const parent = stack[stack.length - 1];
    if (!parent) break;
    const p = parent[0];
    low[p] = Math.min(low[p]!, low[u]!);
    mass[p] += mass[u]!;
    for (let k = 0; k < 3; k++) mc[p]![k] += mc[u]![k]!;
    // the edge it came in by is a bridge when nothing below reaches above it; a real joint, not a ground tie
    if (low[u]! > tin[p]! && via < joints.length && mass[u]! > 0) {
      const j = joints[via]!;
      const m = mass[u]!;
      const c = mc[u]!.map((x) => x / m);
      const W = m * g;
      const arm = Math.hypot(c[0]! - j.at[0], c[2]! - j.at[2]);
      // the parts below it in the search are the ones it holds up
      const from = order.indexOf(u);
      const carried: string[] = [];
      for (let i = from; i < order.length && tin[order[i]!]! >= tin[u]!; i++) if (order[i] !== GROUND) carried.push(parts[order[i]!]!.id);
      const shear: Forecast = { id: j.id, mode: 'shear', load: W, capacity: j.shear, u: W / Math.max(j.shear, 1e-9), carried };
      const bending: Forecast = { id: j.id, mode: 'bending', load: W * arm, capacity: j.bending, u: (W * arm) / Math.max(j.bending, 1e-9), carried };
      out.push(shear.u >= bending.u ? shear : bending);
    }
  }
  return out.sort((x, y) => y.u - x.u);
}
