// An agent: a body with senses and a goal, which plans over what the world affords and drives its motion (docs/LIFE.md,
// steps 3 and 6). Nothing here is placed or told by hand, and nothing knows what any thing is: a goal is a verb (open, go
// to, keep away, stay near) and a target found by its name or by what it affords. To go to a thing or keep away from it,
// it sees it, finds where to stand at the distance asked from its footprint (clear for its body, the nearest), and walks
// there by the router; to stay near a thing that moves (another agent), it goes after it, no faster than its own pace,
// whenever it is further than the range allows, and steps back when nearer. It opens a door this way:
//   it sees: what its eyes' rays meet from where it stands (aware/sense.ts), and of what affords opening (aware/tags.ts),
//     the nearest it sees;
//   it reads the door: its hinge line through its hinges' knuckles, the side it swings to (the side its knuckles stand
//     proud of), its handle on the side the agent is on (so it pulls or pushes);
//   it finds where to stand: beside the handle, clear of the leaf's sweep, within its arm's reach, where the handle stays
//     in reach the longest as the door swings;
//   it walks there: the shortest clear way over the floor (the router, placement/line.ts, through the plan of what stands
//     between its ankles and its head, kept a shoulder's half-width off), at a walking pace;
//   it reaches, grasps, pulls (or pushes) with the force a door may ask, until the handle leaves its reach, and lets go;
//   the door swings on its hinge in the physics (Jolt, sim.ts) and comes to rest on its stop.
// The body is drawn from its measured segments (act/body.ts), each part carrying its math.
// Every number says where it comes from; what is not modelled yet is said in docs/LIFE.md.

import * as THREE from 'three';
import type { Part } from '../kits';
import type { V3 } from '../generate';
import type { Jolt } from '../realize';
import { layout, type Node } from '../make/space';
import { massOfAll, partOf, place, type Assembly } from '../assembly';
import { ACTORS, bodyOf, tagsOf, type Actor, type Afford } from '../aware/tags';
import { perceive, type Observer } from '../aware/sense';
import { makeLine, route, type Section } from '../placement/line';
import { bodiesOf, posedAt, simulate, type SimJoint, type SimOut, type SimThing } from '../sim';
import { bodyParts, poseOf, rigFor } from './body';

/** The pace: an adult's comfortable walk, 1.4 m/s (Bohannon 1997, typical of adults 20 to 60); a smaller body's by
 *  dynamic similarity, as the root of its height (Alexander's Froude scaling, an estimate). */
export const WALK = 1.4;
/** A simple visual reaction, s (about 0.25 s, typical). */
export const REACT = 0.25;
/** A reach's time by Fitts' law, MT = a + b log2(2D / W), a = 0.1 s, b = 0.1 s a bit (typical of reaching studies). */
export const fitts = (D: number, W: number) => 0.1 + 0.1 * Math.log2(Math.max(1, (2 * D) / W));
/** How much further a standing body reaches by leaning, m: about 0.3 m for an adult (Duncan's functional reach, 1990,
 *  typical), taken as 0.25 of 1.75 m scaled by height, a margin kept. */
export const leanOf = (a: Actor) => 0.25 * a.height / 1.75;
/** Closing a hand on a handle, s (an estimate). */
export const GRASP = 0.3;
/** The force it opens a door with: the most an interior door may ask to be pulled or pushed open, 22.2 N (5 lbf: the
 *  ADA Standards, 404.2.9), so any door built to them opens to it. */
export const DOOR_FORCE = 22.2;
/** A hinge's friction, N·m (two butt hinges, an estimate), and the stop it swings to (a door stop at 90°, typical). */
export const HINGE_FRICTION = 0.5, DOOR_STOP = Math.PI / 2;

export type Verb = 'open' | 'go to' | 'keep away';
export interface Goal {
  verb?: Verb; /** what it acts on, by its name (any thing, when it is found by what it affords) */ what?: RegExp;
  /** (a goal made before verbs: open what is named so) */ open?: RegExp;
  /** what it acts on, by what that lets a body do (sit, open, grasp …: aware/tags.ts) */ affords?: Afford;
  /** of those it sees, the nearest or the farthest */ which?: 'nearest' | 'farthest';
  /** how far from its footprint to stand, m: to go to, within arm's reach where not said; to keep away, at least 3 m */ range?: [number, number];
  /** what it can choose from: what its eyes see from where it stands, or all that is here (a place it knows: its home) */ knows?: 'sees' | 'here';
  /** that one thing, by where it is in the place (a door the agent chose to open on its way) */ path?: string;
}
/** What a goal acts on, by name, and the verb (a goal made before verbs opens). */
export const goalOf = (g: Goal): { verb: Verb; what: RegExp } => ({ verb: g.verb ?? (g.open ? 'open' : 'go to'), what: g.what ?? g.open ?? /./ });
export interface Door { name: string; path: string; /** a point on its hinge line, the line's direction (turning by it swings it open: right-handed) */ at: V3; axis: V3;
  /** the way its free edge swings, closed: out of its face */ swing: V3; /** from its hinge line to its free edge */ latch: V3; width: number;
  /** what swings (its leaf, its handles) */ movers: string[]; handles: { path: string; at: V3 }[]; mass: number }
export interface Step { kind: 'see' | 'go to' | 'reach' | 'grasp' | 'pull' | 'push' | 'let go' | 'stay' | 'follow'; from: number; to: number; /** what makes it done */ done: string; says: string }
export interface Plan {
  actor: Actor; goal: Goal; start: V3; facing: V3; floor: number; stand: V3; path: V3[]; walked: number; steps: Step[];
  /** what it acts on: its name, where it is in the thing, where its middle is */ target: { name: string; path: string; at: V3 };
  /** opening: the door, the side it is on, its handle; the door in the physics, its run from when it is first pulled, its angle over time */
  door?: Door; side?: 1 | -1; handle?: V3; sim?: SimOut; bodies?: SimThing[]; placed?: ReturnType<typeof bodiesOf>['placed']; pullAt: number; letGoAt: number; angle: (t: number) => number;
  /** where it is at each time, where it is not walked along its path at a pace (it follows something that moves) */ track?: { t: number; at: V3; facing: V3 }[];
  /** what it does next, from where this leaves it, in the world as this leaves it (a door it opened stays open) */ then?: Plan; /** the world this is done in */ world?: Part;
  end: number; says: string; findings: string[]; sources: string[];
}

const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
const vec = (a: V3) => new THREE.Vector3(...a);
const UP = new THREE.Vector3(0, 1, 0);
/** The body's other sizes, by the segment proportions of Drillis and Contini (1966). */
export const limbsOf = (a: Actor) => ({ ...bodyOf(a), hip: 0.53 * a.height, kneeH: 0.285 * a.height, ankle: 0.039 * a.height, shoulders: 0.259 * a.height, hips: 0.191 * a.height,
  upper: 0.186 * a.height, fore: 0.146 * a.height, head: 0.13 * a.height, /** a stride's step, about 0.41 of the height (typical) */ stride: 0.41 * a.height });

/** Every door in a thing: what affords opening, read for its hinge line, its swing and its handles. */
export function doorsOf(root: Part, ns: Node[] = layout(root), actor: Actor = ACTORS.adult!): { doors: Door[]; findings: string[] } {
  const t = tagsOf(root, actor, ns), byPath = new Map(ns.map((n) => [n.path, n])), doors: Door[] = [], findings: string[] = [];
  for (const tag of t.tags.filter((x) => x.affords.includes('open'))) {
    const n = byPath.get(tag.path); if (!n) continue; const under = ns.filter((x) => x.path.startsWith(n.path + '/') && x.p.shape && x.obb);
    const hinges = under.filter((x) => /hinge/i.test(x.p.name)), movers = under.filter((x) => !/lining|frame|jamb|hinge|stop|threshold/i.test(x.p.name));
    if (!hinges.length || !movers.length) { findings.push(`the ${tag.part} (${tag.path}) affords opening but has no hinge or nothing to swing in it`); continue; }
    const vol = (x: Node) => x.obb!.h[0] * x.obb!.h[1] * x.obb!.h[2], leaf = movers.reduce((a, b) => (vol(b) > vol(a) ? b : a)), c = leaf.obb!.c.clone();
    const hc = hinges.map((x) => x.obb!.c.clone()), a0 = hc[0]!;
    // (its hinge line: through its hinges' knuckles; one hinge alone, its knuckle's own axis)
    const axis = hc.length > 1 ? hc[hc.length - 1]!.clone().sub(a0).normalize() : UP.clone().applyMatrix4(new THREE.Matrix4().extractRotation(hinges[0]!.m)).normalize();
    // (its thin way, and the side its knuckles stand proud of: a butt hinge's knuckle is on the face the door swings to)
    const k = [0, 1, 2].reduce((a, b) => (leaf.obb!.h[b]! < leaf.obb!.h[a]! ? b : a)), thin = leaf.obb!.u[k]!.clone(), proud = hc.reduce((s, h) => s + h.clone().sub(c).dot(thin), 0) / hc.length;
    // (from its hinge line to its free edge, in its own plane)
    const foot = a0.clone().addScaledVector(axis, c.clone().sub(a0).dot(axis)), latch = c.clone().sub(foot); latch.addScaledVector(axis, -latch.dot(axis)).addScaledVector(thin, -latch.dot(thin));
    const half = latch.length(); latch.normalize();
    if (Math.abs(proud) < 1e-3) findings.push(`the ${tag.part} (${tag.path}): its hinges stand proud of neither face, so which way it swings is a guess (out of its +${'xyz'[k]} face)`);
    const swing = thin.multiplyScalar(proud < 0 ? -1 : 1), along = [0, 1, 2].map((j) => Math.abs(leaf.obb!.u[j]!.dot(latch)) * leaf.obb!.h[j]!).reduce((a, b) => a + b, 0);
    // (turning right-handed about its axis swings the free edge out to the swing side)
    const ax = latch.clone().cross(swing).normalize();
    doors.push({ name: tag.part, path: tag.path, at: v3(foot), axis: v3(ax), swing: v3(swing), latch: v3(latch), width: half + along, movers: movers.map((x) => x.path),
      handles: movers.filter((x) => /handle|knob|lever|pull/i.test(x.p.name)).map((x) => ({ path: x.path, at: v3(x.obb!.c) })), mass: movers.reduce((s, x) => s + massOfAll(x.p), 0) });
  }
  return { doors, findings };
}

/** Where a body stands to start: the middle of the longest floor (a hall: where people pass), facing along it. */
export function startOf(root: Part, ns: Node[] = layout(root), actor: Actor = ACTORS.adult!): { at: V3; facing: V3; floor: number; on: string } {
  const walk = tagsOf(root, actor, ns).tags.filter((t) => t.affords.includes('walk on')); if (!walk.length) throw new Error('nothing here is level and wide enough to walk on');
  const f = walk.reduce((a, b) => (Math.max(b.size[0], b.size[2]) > Math.max(a.size[0], a.size[2]) ? b : a)), n = ns.find((x) => x.path === f.path)!, c = n.sub!.getCenter(new THREE.Vector3());
  return { at: [c.x, n.sub!.max.y, c.z], facing: f.size[0] >= f.size[2] ? [1, 0, 0] : [0, 0, 1], floor: n.sub!.max.y, on: f.part };
}

/** What stands between a body's ankles (or the height given) and its head, seen from above: each drawn piece's footprint. */
function planOf(ns: Node[], floor: number, actor: Actor, skip: (n: Node) => boolean, above = 0.1): THREE.Box3[] {
  const lo = floor + above, hi = floor + actor.height + 0.05, out: THREE.Box3[] = [];
  for (const n of ns) { if (!n.p.shape || skip(n)) continue; for (const b of n.pieces) { const e = [0, 1, 2].map((k) => Math.abs(b.u[0].getComponent(k)) * b.h[0] + Math.abs(b.u[1].getComponent(k)) * b.h[1] + Math.abs(b.u[2].getComponent(k)) * b.h[2]);
    if (b.c.y + e[1]! < lo || b.c.y - e[1]! > hi) continue; out.push(new THREE.Box3(new THREE.Vector3(b.c.x - e[0]!, 0, b.c.z - e[2]!), new THREE.Vector3(b.c.x + e[0]!, 0, b.c.z + e[2]!))); } }
  return out;
}

/** A body walking as a line the router runs: round, half its shoulders across, keeping a little off things. */
export const walkerOf = (a: Actor): Section => ({ id: 'walker', name: `${a.name} walking`, round: true, layers: [{ name: 'body', mat: 'water', t: limbsOf(a).shoulders / 2 }], bend: 0.5, clear: 0.02, logic: 'clear', color: 0x3a7bff,
  source: 'half the shoulders\' breadth across (0.259 of the height: Drillis and Contini, 1966); turning about its own width (an estimate)' });

/** The door's angle over time from its run, from when it is first pulled (0 before). */
const angleOf = (out: SimOut, sign: number) => (t: number) => { const j = out.joints[0]; if (!j || !j.t.length || t <= 0) return 0; let k = j.t.findIndex((x) => x >= t); if (k < 0) return sign * j.v[j.v.length - 1]!; if (k === 0) return sign * j.v[0]! * (t / j.t[0]!);
  const u = (t - j.t[k - 1]!) / (j.t[k]! - j.t[k - 1]!); return sign * (j.v[k - 1]! + u * (j.v[k]! - j.v[k - 1]!)); };

/** The paths of what an actor's eyes' rays meet from where it stands. */
export function seenFrom(root: Part, actor: Actor, at: V3, facing: V3, floor: number, rays = 3000): Set<string> {
  const ob: Observer = { name: actor.name, at: [at[0], floor + limbsOf(actor).eye, at[2]], facing, kind: 'person', actor };
  return new Set((perceive(root, [ob], { rays }).by[ob.name]?.notices ?? []).filter((n) => n.sense === 'sight').map((n) => n.path));
}
/** The way a body walks from one place to another over the floor: the router's clear logic through the plan of what
 *  stands between its ankles and its head, a slab at its hips. */
export function walkWay(ns: Node[], actor: Actor, floor: number, plan: THREE.Box3[], from0: V3, to0: V3): { path: V3[]; walked: number } {
  const L = limbsOf(actor), mid = floor + L.hip, all = new THREE.Box3(); for (const n of ns) if (n.sub) all.union(n.sub);
  all.expandByScalar(2);
  const slab: Part = { name: 'what is in the way', parts: plan.map((b, i) => ({ name: `in the way ${i}`, shape: { box: [Math.max(1e-3, b.max.x - b.min.x), 1, Math.max(1e-3, b.max.z - b.min.z)] }, at: [(b.min.x + b.max.x) / 2, mid, (b.min.z + b.max.z) / 2], mat: 'concrete' })) };
  const from: V3 = [from0[0], mid, from0[2]], to: V3 = [to0[0], mid, to0[2]];
  const way = Math.hypot(to[0] - from[0], to[2] - from[2]) < 0.05 ? { pts: [from, to], length: 0 } : route(slab, from, to, { section: walkerOf(actor), logic: 'clear', noHeat: true, step: 0.05, region: new THREE.Box3(new THREE.Vector3(all.min.x, mid - 0.06, all.min.z), new THREE.Vector3(all.max.x, mid + 0.06, all.max.z)) });
  const path = way.pts.map((p) => [p[0], floor, p[2]] as V3), walked = path.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - path[i - 1]![0], p[2] - path[i - 1]![2]) : 0), 0);
  return { path, walked };
}
/** Its pace: an adult's walk, a smaller body's by the root of its height (Froude scaling, an estimate). */
export const paceOf = (a: Actor) => WALK * Math.sqrt(a.height / 1.75);
/** How far a point is from a box, in plan. */
const planDist = (p: THREE.Vector3, b: THREE.Box3) => Math.hypot(Math.max(0, b.min.x - p.x, p.x - b.max.x), Math.max(0, b.min.z - p.z, p.z - b.max.z));

/** What a goal may act on among what the actor sees (or knows is here): by its name or by what it affords, the nearest
 *  (or the farthest) first. */
function targetsOf(root: Part, ns: Node[], actor: Actor, goal: Goal, seen: Set<string>, start: V3): Node[] {
  const { what } = goalOf(goal), afford = goal.affords ? new Set(tagsOf(root, actor, ns).tags.filter((t) => t.affords.includes(goal.affords!)).map((t) => t.path)) : null;
  const named = ns.filter((n) => n.sub && !n.sub.isEmpty() && what.test(n.p.name) && (!afford || afford.has(n.path)));
  // (the outermost of what is named so: a sofa, not its cushions too)
  const outer = named.filter((n) => !named.some((m) => m !== n && n.path.startsWith(m.path + '/')));
  if (!outer.length) throw new Error(`nothing here is named like ${String(what)}${goal.affords ? ` and lets ${actor.name} ${goal.affords}` : ''}`);
  const sees = (n: Node) => [...seen].some((x) => x === n.path || x.startsWith(n.path + '/')), visible = goal.knows === 'here' ? outer : outer.filter(sees);
  if (!visible.length) throw new Error(`${actor.name} sees none of the ${outer.length} things named like ${String(what)} from where it stands (a goal on a place it knows may choose from all that is here)`);
  const d = (n: Node) => { const c = n.sub!.getCenter(new THREE.Vector3()); return Math.hypot(c.x - start[0], c.z - start[2]); };
  return visible.sort((a, b) => (goal.which === 'farthest' ? d(b) - d(a) : d(a) - d(b)));
}

/** Go to a thing, or keep away from it: see it, find where to stand at the distance asked from its footprint (clear for
 *  its body; of those, the nearest to where it is, by the way it would walk), and walk there. */
export function approach(root: Part, goal: Goal, o: { actor?: Actor; start?: { at: V3; facing: V3 }; rays?: number } = {}): Plan {
  const actor = o.actor ?? ACTORS.adult!, ns = layout(root), findings: string[] = [];
  const s0 = startOf(root, ns, actor), start = o.start?.at ?? s0.at, facing = o.start?.facing ?? s0.facing, floor = s0.floor;
  const seen = seenFrom(root, actor, start, facing, floor, o.rays), targets = targetsOf(root, ns, actor, goal, seen, start);
  // (the nearest it can get to as asked; one it has no way to (a shut door between) is passed over for the next, and said)
  let last: Error | null = null;
  for (const target of targets) {
    try { const p = approachOne(root, ns, actor, goal, target, start, facing, floor); if (findings.length) p.findings.unshift(...findings); return p; }
    catch (e) { last = e as Error; findings.push(`passed over the ${target.p.name}: ${last.message}`); }
  }
  throw last ?? new Error('nothing to go to');
}
function approachOne(root: Part, ns: Node[], actor: Actor, goal: Goal, target: Node, start: V3, facing: V3, floor: number): Plan {
  const L = limbsOf(actor), { verb } = goalOf(goal), findings: string[] = [];
  const T = target.sub!.clone(), R = L.shoulders / 2, reach = L.reach + leanOf(actor);
  const [lo, hi] = goal.range ?? (verb === 'keep away' ? [3, Infinity] : [0, reach]);
  const plan = planOf(ns, floor, actor, (n) => n.path === target.path || n.path.startsWith(target.path + '/'));
  // (clear as the router keeps clear: half its shoulders, the gap it keeps off things and a step of its grid)
  const Rw = R + walkerOf(actor).clear + 0.05, clearAt = (p: THREE.Vector3) => !plan.some((b) => p.x > b.min.x - Rw && p.x < b.max.x + Rw && p.z > b.min.z - Rw && p.z < b.max.z + Rw) && planDist(p, T) >= R;
  // (and nothing standing chest high between it and the thing, in plan: to be by a thing is not to be behind a wall from it; keeping
  //  away, a wall between is as good as distance, so it is not asked)
  const tall = planOf(ns, floor, actor, (n) => n.path === target.path || n.path.startsWith(target.path + '/'), L.shoulder - 0.15);
  const nearOn = (p: THREE.Vector3) => new THREE.Vector3(Math.max(T.min.x, Math.min(T.max.x, p.x)), 0, Math.max(T.min.z, Math.min(T.max.z, p.z)));
  const open = (p: THREE.Vector3) => { const a = new THREE.Vector3(p.x, 0, p.z), b = nearOn(p), d = b.clone().sub(a), len = d.length(); if (len < 1e-6) return true; const r = new THREE.Ray(a, d.normalize()), hit = new THREE.Vector3();
    return !tall.some((x) => { const box = new THREE.Box3(new THREE.Vector3(x.min.x, -1, x.min.z), new THREE.Vector3(x.max.x, 1, x.max.z)); return r.intersectBox(box, hit) !== null && hit.distanceTo(a) < len - 1e-3 && !box.containsPoint(a); }); };
  const here = new THREE.Vector3(start[0], floor, start[2]), ok = (p: THREE.Vector3) => { const d = planDist(p, T); return d >= lo - 1e-9 && d <= hi + 1e-9 && clearAt(p) && (verb === 'keep away' || open(p)); };
  // (where it may stand: on what it can walk on, each 5 cm, at the distance asked; nearest first)
  // (over all of the place, each 5 cm; what is clear, at the distance, and has a way to it is where it may stand)
  const floors = [ns.reduce((b, n) => (n.sub ? b.union(n.sub) : b), new THREE.Box3())].map((b) => new THREE.Box3(b.min.clone().setX(Math.max(b.min.x, T.min.x - hi - R)).setZ(Math.max(b.min.z, T.min.z - hi - R)), b.max.clone().setX(Math.min(b.max.x, T.max.x + hi + R)).setZ(Math.min(b.max.z, T.max.z + hi + R))));
  let best: THREE.Vector3 | null = ok(here) ? here.clone() : null;
  if (!best) {
    const cands: THREE.Vector3[] = [];
    for (const f of floors) for (let x = f.min.x + R; x <= f.max.x - R + 1e-9; x += 0.05) for (let z = f.min.z + R; z <= f.max.z - R + 1e-9; z += 0.05) { const p = new THREE.Vector3(x, floor, z); if (ok(p)) cands.push(p); }
    cands.sort((a, b) => a.distanceTo(here) - b.distanceTo(here));
    // (of the nearest in a straight line, those it can walk to (a shut door shuts a room off), the shortest way: tried
    //  nearest first, spread out, until a few are found)
    let bw = Infinity, found = 0, tried = 0; const gone: THREE.Vector3[] = [];
    for (const p of cands) { if (found >= 4 || tried >= 16) break; if (gone.some((q) => q.distanceTo(p) < 0.4)) continue; gone.push(p); tried++;
      try { const w = walkWay(ns, actor, floor, plan, start, [p.x, floor, p.z]).walked; found++; if (w < bw) { bw = w; best = p; } } catch { /* no way there */ } }
    if (!best && cands.length) throw new Error(`${actor.name} can stand ${lo.toFixed(2)} to ${Number.isFinite(hi) ? hi.toFixed(2) : 'any'} m from the ${target.p.name}, but has no way to walk there from where it is (a shut door between, or no room to pass)`);
  }
  if (!best) throw new Error(`there is nowhere on the floor ${lo.toFixed(2)} to ${Number.isFinite(hi) ? hi.toFixed(2) : 'any'} m from the ${target.p.name} that ${actor.name} has room to stand`);
  const way = walkWay(ns, actor, floor, plan, start, [best.x, floor, best.z]), c = target.sub!.getCenter(new THREE.Vector3()), v = paceOf(actor), steps: Step[] = []; let t = 0;
  const add = (kind: Step['kind'], dt: number, done: string, says: string) => { steps.push({ kind, from: t, to: t + dt, done, says }); t += dt; };
  const d0 = planDist(here, T), d1 = planDist(best, T);
  add('see', REACT, `the ${target.p.name} among what its rays meet`, `sees the ${target.p.name} ${d0.toFixed(1)} m off (a ${REACT} s reaction, typical)`);
  if (way.walked > 0.01) add('go to', way.walked / v, `${d1.toFixed(2)} m from it`, `walks ${way.walked.toFixed(2)} m at ${v.toFixed(2)} m/s, to ${d1.toFixed(2)} m from the ${target.p.name} (${verb === 'keep away' ? `at least ${lo} m` : `${lo} to ${hi.toFixed(2)} m`} asked)`);
  else add('stay', 0.4, 'where it stands already holds', `stays: ${d0.toFixed(2)} m from the ${target.p.name} already holds`);
  // (it ends facing it, or, keeping away, facing away from it)
  const toT = c.clone().sub(best).setY(0).normalize(), endFacing = verb === 'keep away' ? toT.clone().negate() : toT;
  const path = way.walked > 0.01 ? way.path : [start, [best.x, floor, best.z] as V3];
  return { actor, goal, start, facing, floor, stand: v3(best), path, walked: way.walked, steps, target: { name: target.p.name, path: target.path, at: v3(c) }, pullAt: Infinity, letGoAt: Infinity, angle: () => 0,
    track: undefined, end: t, says: `${actor.name} ${steps.map((x) => x.says).join('; ')}; faces ${verb === 'keep away' ? 'away from' : ''} it`.replace(/faces +it/, 'faces it'), findings: [...findings, ...(endFacing.lengthSq() ? [] : [])],
    sources: ['walking 1.4 m/s: Bohannon (1997)', 'reaction 0.25 s (typical)', 'body proportions: Drillis and Contini (1966)', 'reach with a lean: Duncan (1990), typical'] };
}

/** Stay near a thing that moves (another agent: where it is at each time), within a range of it: each tenth of a second
 *  it goes after it at no more than its own pace when further than the range allows, steps back when nearer, and
 *  stands while it holds; what is in the way it goes round, sideways, as the floor lets it. */
export function follow(root: Part, leader: (t: number) => V3, o: { actor?: Actor; start: V3; range: [number, number]; until: number; name?: string; dt?: number }): Plan {
  const actor = o.actor ?? ACTORS.adult!, L = limbsOf(actor), ns = layout(root), floor = startOf(root, ns, actor).floor, dt = o.dt ?? 0.1, v = paceOf(actor), R = L.shoulders / 2;
  const plan = planOf(ns, floor, actor, () => false), clear = (p: THREE.Vector3) => !plan.some((b) => p.x > b.min.x - R && p.x < b.max.x + R && p.z > b.min.z - R && p.z < b.max.z + R);
  let at = new THREE.Vector3(o.start[0], floor, o.start[2]), facing = new THREE.Vector3(1, 0, 0), walked = 0, held = 0, n = 0, worst = 0;
  const track: NonNullable<Plan['track']> = [], [lo, hi] = o.range;
  for (let t = 0; t <= o.until + 1e-9; t += dt) {
    const l = new THREE.Vector3(...leader(t)).setY(floor), d = at.distanceTo(l), to = l.clone().sub(at).normalize();
    if (d > hi || d < lo) {
      // (toward it, or away; round what is in the way by turning up to 90° either side)
      const want = d > hi ? to : to.clone().negate(), step = Math.min(v * dt, Math.abs(d - (d > hi ? hi : lo)) + 0.02);
      for (const a of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.57, -1.57]) { const dir = want.clone().applyAxisAngle(UP, a), p = at.clone().addScaledVector(dir, step); if (clear(p)) { at = p; walked += step; facing = dir; break; } }
    } else if (to.lengthSq() > 0) facing = to;
    const d1 = at.distanceTo(l); if (d1 >= lo - 0.05 && d1 <= hi + 0.05) held++; n++; worst = Math.max(worst, d1 - hi);
    track.push({ t, at: v3(at), facing: v3(facing) });
  }
  const share = held / Math.max(1, n), steps: Step[] = [{ kind: 'follow', from: 0, to: o.until, done: `within ${lo} to ${hi} m of ${o.name ?? 'it'}`, says: `stays ${lo} to ${hi} m from ${o.name ?? 'it'}, going after it at up to ${v.toFixed(2)} m/s: within it ${(share * 100).toFixed(0)} % of the time, at worst ${Math.max(0, worst).toFixed(2)} m over, ${walked.toFixed(1)} m walked` }];
  const last = track[track.length - 1]!;
  return { actor, goal: { verb: 'go to', what: /./, range: o.range }, start: o.start, facing: track[0]!.facing, floor, stand: last.at, path: track.map((x) => x.at), walked, steps, target: { name: o.name ?? 'what it follows', path: '', at: leader(o.until) },
    pullAt: Infinity, letGoAt: Infinity, angle: () => 0, track, end: o.until, says: `${actor.name} ${steps[0]!.says}`, findings: share < 0.9 ? [`${actor.name} kept within the range only ${(share * 100).toFixed(0)} % of the time: what it follows is faster than its pace, or the way is blocked`] : [],
    sources: ['walking 1.4 m/s: Bohannon (1997); a smaller body\'s by the root of its height (an estimate)', 'body proportions: Drillis and Contini (1966)'] };
}

/** The world as a plan leaves it: a door it opened, where it came to rest. */
export function worldAfter(world: Part, p: Plan): Part {
  if (!p.door || !p.sim) return world;
  const rest = without(world, new Set(p.door.movers)) ?? { name: world.name, parts: [] }, door = partOf(posedAt(p.sim, p.bodies!, p.placed!, p.sim.restedAt ?? p.sim.seconds));
  return { ...rest, parts: [...(rest.parts ?? []), door] };
}
/** How it ends: where it stands, facing what it last acted on. */
const endOf = (p: Plan): { at: V3; facing: V3 } => { const last = lastOf(p), b = bodyAt(last, last.end); return { at: b.at, facing: b.facing }; };
const lastOf = (p: Plan): Plan => (p.then ? lastOf(p.then) : p);
/** All of it, end to end, s. */
export const doneBy = (p: Plan): number => p.end + (p.then ? doneBy(p.then) : 0);
/** Every step, each at its time from the start. */
export const stepsOf = (p: Plan, at = 0): Step[] => [...p.steps.map((x) => ({ ...x, from: x.from + at, to: x.to + at })), ...(p.then ? stepsOf(p.then, at + p.end) : [])];
/** Goals one after another: each from where the last left it, in the world as the last left it. */
export function actAll(J: Jolt, root: Part, goals: Goal[], o: { actor?: Actor; rays?: number } = {}): Plan {
  if (!goals.length) throw new Error('no goal');
  let world = root, first: Plan | null = null, prev: Plan | null = null;
  for (const g of goals) {
    const p = act(J, world, g, { ...o, ...(prev ? { start: endOf(prev) } : {}) }); p.world = world;
    if (prev) prev.then = p; else first = p; prev = p; world = worldAfter(world, p);
  }
  return first!;
}

/** Whatever the goal asks: open (a door, a lid), go to, keep away. Going somewhere it has no way to, it opens what is
 *  shut on its way: the doors it sees, nearest first, each opened and the way tried again in the world as that leaves
 *  it (up to three), and says which. */
export function act(J: Jolt, root: Part, goal: Goal, o: { actor?: Actor; start?: { at: V3; facing: V3 }; rays?: number } = {}): Plan {
  if (goalOf(goal).verb === 'open') return openDoor(J, root, goal, o);
  try { return approach(root, goal, o); }
  catch (e) {
    if (!/no way to walk there/.test((e as Error).message)) throw e;
    const actor = o.actor ?? ACTORS.adult!, ns = layout(root), s0 = startOf(root, ns, actor), start = o.start?.at ?? s0.at, facing = o.start?.facing ?? s0.facing;
    const seen = seenFrom(root, actor, start, facing, s0.floor, o.rays), d = (x: Door) => Math.hypot(x.at[0] - start[0], x.at[2] - start[2]);
    const doors = doorsOf(root, ns, actor).doors.filter((x) => [...seen].some((q) => q === x.path || q.startsWith(x.path + '/'))).sort((a, b) => d(a) - d(b)).slice(0, 3), tried: string[] = [];
    for (const door of doors) {
      try {
        const first = openDoor(J, root, { verb: 'open', what: /./, path: door.path }, o), world = worldAfter(root, first);
        first.world = root; const next = approach(world, goal, { ...o, start: endOf(first) }); next.world = world; first.then = next;
        next.findings.unshift(`it had no way there, so it opened the ${door.name} on its way first`); return first;
      } catch (e2) { tried.push(`${door.name} at ${door.at.map((x) => x.toFixed(1)).join(', ')}: ${(e2 as Error).message.slice(0, 80)}`); }
    }
    throw new Error(`${(e as Error).message}; opening the doors it sees did not give one (${tried.join('; ') || 'it sees none'})`);
  }
}

/** Plan and run it: see, go, reach, grasp, pull or push, let go; the door in the physics. */
export function openDoor(J: Jolt, root: Part, goal: Goal = { open: /door/i }, o: { actor?: Actor; start?: { at: V3; facing: V3 }; rays?: number } = {}): Plan {
  const actor = o.actor ?? ACTORS.adult!, L = limbsOf(actor), ns = layout(root), findings: string[] = [];
  const s0 = startOf(root, ns, actor), start = o.start?.at ?? s0.at, facing = o.start?.facing ?? s0.facing, floor = s0.floor;
  const { doors, findings: df } = doorsOf(root, ns, actor); findings.push(...df);
  const { what } = goalOf(goal), wanted = doors.filter((d) => what.test(d.name) && (!goal.path || d.path === goal.path)); if (!wanted.length) throw new Error(`nothing here named like ${String(what)} opens`);
  // it sees: the doors its rays meet from where it stands
  const seen = seenFrom(root, actor, start, facing, floor, o.rays);
  const sees = (d: Door) => [...seen].some((x) => x === d.path || x.startsWith(d.path + '/')), visible = wanted.filter(sees), flat = (a: V3) => Math.hypot(a[0] - start[0], a[2] - start[2]);
  if (!visible.length) throw new Error(`${actor.name} sees none of the ${wanted.length} things named like ${String(what)} from where it stands`);
  const far = goal.which === 'farthest', door = visible.reduce((a, b) => ((far ? flat(b.at) > flat(a.at) : flat(b.at) < flat(a.at)) ? b : a));
  // which side it is on: the swing side, it pulls; the other, it pushes; and the handle on its side
  const sw = vec(door.swing), side: 1 | -1 = vec(start).sub(vec(door.at)).dot(sw) >= 0 ? 1 : -1, foot = vec(door.at), ax = vec(door.axis), lat = vec(door.latch);
  const h = door.handles.filter((x) => vec(x.at).sub(foot).dot(sw) * side > 0).sort((a, b) => flat(a.at) - flat(b.at))[0] ?? door.handles[0];
  if (!h) throw new Error(`the ${door.name} has nothing to take hold of`);
  const H = vec(h.at), R = L.shoulders / 2, moving = new Set(door.movers);
  // where it stands: beside the handle on its side, clear of the leaf's sweep (if it pulls) and of everything else, the
  // handle within its reach; of those, where the handle stays in reach through the most of its swing, then the nearest
  const plan = planOf(ns, floor, actor, (n) => moving.has(n.path)), leafPlan = planOf(ns.filter((n) => moving.has(n.path)), floor, actor, () => false);
  if ((globalThis as any).DBG) for (const b of plan) if (b.max.x > -1 && b.min.x < 1.5 && b.max.z > -0.7 && b.min.z < 0.7) console.log("PLAN", [b.min.x, b.min.z, b.max.x, b.max.z].map((x) => x.toFixed(2)).join(" "));
  const clearAt = (p: THREE.Vector3, r: number) => !plan.some((b) => p.x > b.min.x - r && p.x < b.max.x + r && p.z > b.min.z - r && p.z < b.max.z + r);
  const shoulderOf = (p: THREE.Vector3, at: THREE.Vector3) => { const f = at.clone().sub(p).setY(0).normalize(), right = f.clone().cross(UP).normalize(), a = p.clone().setY(floor + L.shoulder);
    const l = a.clone().addScaledVector(right, -L.shoulders / 2), r = a.clone().addScaledVector(right, L.shoulders / 2); return l.distanceTo(at) < r.distanceTo(at) ? l : r; };
  const handleAt = (th: number) => H.clone().sub(foot).applyAxisAngle(ax, th).add(foot), reach = L.reach + leanOf(actor);
  let best: { p: THREE.Vector3; held: number; d: number } | null = null;
  for (let a = -0.3; a <= 0.7; a += 0.05) for (let b = 0.25; b <= 0.8; b += 0.05) {
    const p = H.clone().addScaledVector(lat, a).addScaledVector(sw, side * b).setY(floor);
    if (!clearAt(p, R) || (side > 0 && p.clone().sub(foot).setY(0).length() < door.width + R + 0.03)) continue;
    if (side < 0 && leafPlan.some((x) => p.x > x.min.x - R && p.x < x.max.x + R && p.z > x.min.z - R && p.z < x.max.z + R)) continue;
    let held = 0; for (let th = 0; th <= DOOR_STOP + 1e-9; th += Math.PI / 180) { const q = handleAt(th); if (shoulderOf(p, q).distanceTo(q) > reach) break; held = th; }
    if (shoulderOf(p, H).distanceTo(H) > reach) continue;
    const d = flat(v3(p)); if (!best || held > best.held + 1e-9 || (Math.abs(held - best.held) < 1e-9 && d < best.d)) best = { p, held, d };
  }
  if (!best) throw new Error(`there is nowhere beside the ${door.name}'s handle for ${actor.name} to stand: everything in reach of it is in the way or in its sweep`);
  // it walks there: the router's clear logic through the plan, a slab at its hips
  const { path, walked } = walkWay(ns, actor, floor, plan, start, [best.p.x, floor, best.p.z]);
  // the door in the physics: what swings as one body on its hinge line, held on the world; pushed at its handle the way it
  // swings, with the force a door may ask, until the handle leaves the hand's reach (or it is on its stop)
  const byPath = new Map(ns.map((n) => [n.path, n])), parts: Part[] = door.movers.map((pth) => { const n = byPath.get(pth)!, p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); n.m.decompose(p, q, s); const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    return { ...n.p, parts: undefined, at: [p.x, p.y, p.z], rot: [e.x, e.y, e.z] } as Part; });
  const leafPart: Part = { name: `${door.name} (swinging)`, parts }, { bodies, placed } = bodiesOf(leafPart), boxes = [{ at: door.at, w: 0.01, h: 0.01, d: 0.01 }];
  // (what it may swing into: what stands near, not in it and not touching it shut (its lining, its wall))
  const swept = new THREE.Box3().setFromCenterAndSize(foot, new THREE.Vector3(1, 0, 1).multiplyScalar(2 * door.width + 0.4)).expandByVector(new THREE.Vector3(0, 10, 0)), shut = new THREE.Box3(); for (const pth of door.movers) shut.union(byPath.get(pth)!.sub!); shut.expandByScalar(0.012);
  for (const n of ns) { if (!n.p.shape || !n.sub || n.path.startsWith(door.path + '/') || n.sub.max.y <= floor + 0.01 || !n.sub.intersectsBox(swept) || n.sub.intersectsBox(shut)) continue; const c = n.sub.getCenter(new THREE.Vector3()), z = n.sub.getSize(new THREE.Vector3()); boxes.push({ at: v3(c), w: z.x, h: z.y, d: z.z }); }
  const joint: SimJoint = { kind: 'hinge', name: `the ${door.name}'s hinges`, a: bodies[0]!.name, b: { fixed: 0 }, at: door.at, axis: door.axis, limits: [-0.01, DOOR_STOP], friction: HINGE_FRICTION };
  const run = (secs: number) => simulate(J, bodies, boxes, { seconds: 8, floor, joints: [joint], push: { name: bodies[0]!.name, force: v3(sw.clone().multiplyScalar(DOOR_FORCE)), seconds: secs, at: h.at } });
  const outOfReach = (out: SimOut) => { const ang = angleOf(out, 1); for (let t = 0; t <= out.seconds; t += 1 / 60) { const q = handleAt(ang(t)); if (shoulderOf(best!.p, q).distanceTo(q) > reach || ang(t) >= DOOR_STOP - 0.02) return t; } return out.seconds; };
  let sim = run(8), letGo = outOfReach(sim); for (let k = 0; k < 3; k++) { const next = run(letGo), lg = outOfReach(next); sim = next; if (Math.abs(lg - letGo) < 1 / 60) break; letGo = Math.min(letGo, lg); }
  const angle = angleOf(sim, 1);
  // the timeline
  const v = paceOf(actor), steps: Step[] = []; let t = 0; const add = (kind: Step['kind'], dt: number, done: string, says: string) => { steps.push({ kind, from: t, to: t + dt, done, says }); t += dt; };
  add('see', REACT, `the ${door.name} among what its rays meet`, `sees the ${door.name} ${flat(door.at).toFixed(1)} m off, of ${seen.size} things it sees (a ${REACT} s reaction, typical)`);
  add('go to', walked / v, `stands ${best.p.distanceTo(new THREE.Vector3(...path[path.length - 1]!)) < 0.05 ? 'where it found' : 'near where it found'}`, `walks ${walked.toFixed(2)} m to beside its handle at ${v.toFixed(2)} m/s`);
  const hang = shoulderOf(best.p, H).clone().setY(floor + L.hip - 0.05), D = hang.distanceTo(H), mt = fitts(D, 0.02);
  add('reach', mt, 'its hand at the handle', `reaches ${(D * 1000).toFixed(0)} mm to a 20 mm handle in ${mt.toFixed(2)} s (Fitts\' law, typical constants)`);
  add('grasp', GRASP, 'its hand closed on it', `closes its hand on the ${door.name}'s handle`);
  const pullAt = t; add(side > 0 ? 'pull' : 'push', letGo, 'the handle out of its reach, or the door on its stop', `${side > 0 ? 'pulls' : 'pushes'} with ${DOOR_FORCE} N (the most a door may ask: ADA 404.2.9) for ${letGo.toFixed(2)} s, to ${(angle(letGo) * 180 / Math.PI).toFixed(0)}°`);
  const letGoAt = t; add('let go', 0.4, 'its hand back at its side', `lets go; the door swings on by itself`);
  const rest = sim.restedAt ?? sim.seconds, end = Math.max(t, pullAt + rest), fin = angle(rest) * 180 / Math.PI;
  if (fin < 60) findings.push(`the ${door.name} opened only to ${fin.toFixed(0)}°: not wide enough to walk through (a person needs about 60°, an estimate)`);
  const says = `${actor.name} ${steps.map((s) => s.says).join('; ')}; the ${door.name} (${door.mass.toFixed(1)} kg) comes to rest at ${fin.toFixed(0)}° after ${(end).toFixed(1)} s`;
  return { actor, goal, start, facing, floor, door, side, stand: v3(best.p), handle: h.at, path, walked, steps, target: { name: door.name, path: door.path, at: door.at }, sim, bodies, placed, pullAt, letGoAt, angle: (x: number) => angle(x - pullAt), end, says, findings,
    sources: ['walking 1.4 m/s: Bohannon (1997)', 'reaction 0.25 s (typical)', 'reach: Fitts\' law, a = 0.1 s, b = 0.1 s/bit (typical)', 'door force 22.2 N: ADA Standards 404.2.9', 'body proportions: Drillis and Contini (1966)', 'hinge friction 0.5 N·m, stop at 90° (estimates)'] };
}

// ---- the body drawn ------------------------------------------------------------------------------------------------------------

/** Where the body is and what it does at a time: along its way (or its track, following), turning to what it acts on,
 *  its arm to a handle while it holds one. */
export function bodyAt(p: Plan, t: number): { at: V3; facing: V3; hand: V3 | null; moving: boolean; phase: number; step: Step | undefined } {
  if (p.then && t >= p.end) return bodyAt(p.then, t - p.end);
  const L = limbsOf(p.actor), step = p.steps.find((s) => t >= s.from && t < s.to) ?? (t >= p.end ? undefined : p.steps[p.steps.length - 1]);
  if (p.track?.length) {
    // (following: where its track has it, between two samples)
    const tr = p.track; let k = tr.findIndex((x) => x.t > t); if (k < 0) k = tr.length - 1; const a = tr[Math.max(0, k - 1)]!, b = tr[k]!, u = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 1;
    const at = vec(a.at).lerp(vec(b.at), u), moving = vec(a.at).distanceTo(vec(b.at)) > 1e-4, along = tr.slice(0, k).reduce((s2, x, i) => (i ? s2 + vec(x.at).distanceTo(vec(tr[i - 1]!.at)) : 0), 0);
    return { at: v3(at), facing: v3(vec(a.facing).lerp(vec(b.facing), u).normalize()), hand: null, moving, phase: (2 * Math.PI * along) / (2 * L.stride), step };
  }
  const go = p.steps.find((s) => s.kind === 'go to');
  let at = vec(p.path[0]!), dir = vec(p.facing), dist = 0;
  const along = go ? Math.max(0, Math.min(p.walked, ((t - go.from) / Math.max(1e-6, go.to - go.from)) * p.walked)) : 0;
  for (let i = 1; i < p.path.length; i++) { const a = vec(p.path[i - 1]!), b = vec(p.path[i]!), len = a.distanceTo(b); if (len < 1e-9) continue; if (dist + len >= along || i === p.path.length - 1) { at = a.clone().lerp(b, Math.min(1, (along - dist) / len)); dir = b.clone().sub(a).normalize(); break; } dist += len; }
  if (!go) at = vec(p.stand);
  const aim = vec(p.handle ?? p.target.at), toH = aim.clone().sub(at).setY(0).normalize(), after = go?.to ?? p.steps[0]?.to ?? 0;
  const keepAway = goalOf(p.goal).verb === 'keep away', look = keepAway ? toH.clone().negate() : toH;
  if (t >= after && look.lengthSq() > 0) dir = dir.clone().lerp(look, Math.min(1, (t - after) / 0.6)).normalize();
  const reach = p.steps.find((s) => s.kind === 'reach');
  if (!reach || !p.door || !p.handle) return { at: v3(at), facing: v3(dir), hand: null, moving: !!go && t > go.from && t < go.to, phase: (2 * Math.PI * along) / (2 * L.stride), step };
  // (its hand: hanging; reaching out to the handle; on the handle as it swings while it holds; back to its side)
  const H = vec(p.handle), u = Math.max(0, Math.min(1, (t - reach.from) / (reach.to - reach.from)));
  const right = dir.clone().cross(UP).normalize(), sh = [at.clone().setY(p.floor + L.shoulder).addScaledVector(right, -L.shoulders / 2), at.clone().setY(p.floor + L.shoulder).addScaledVector(right, L.shoulders / 2)], s = sh[0]!.distanceTo(H) < sh[1]!.distanceTo(H) ? sh[0]! : sh[1]!;
  const hang = s.clone().setY(p.floor + L.hip - 0.05), Hn = H.clone().sub(vec(p.door.at)).applyAxisAngle(vec(p.door.axis), p.angle(Math.min(t, p.letGoAt))).add(vec(p.door.at));
  let hand: THREE.Vector3 | null = null;
  if (t >= reach.from && t < reach.to) hand = hang.clone().lerp(H, u * u * (3 - 2 * u)); else if (t >= reach.to && t < p.letGoAt) hand = Hn; else if (t >= p.letGoAt && t < p.letGoAt + 0.4) { const w = (t - p.letGoAt) / 0.4; hand = Hn.clone().lerp(hang, w * w * (3 - 2 * w)); }
  return { at: v3(at), facing: v3(dir), hand: hand ? v3(hand) : null, moving: !!go && t > go.from && t < go.to, phase: (2 * Math.PI * along) / (2 * L.stride), step };
}
/** The body at a time, drawn from its measured segments (act/body.ts), each carrying its math: walking, its legs and
 *  arms swinging; turning to the handle; leaning and reaching to it; its hand on it as it swings; back to its side. */
export function figureAt(p: Plan, t: number, color = 0x3a7bff): Part {
  const b = bodyAt(p, t), built = rigFor(p.actor), { pose } = poseOf(built, { at: b.at, facing: b.facing, floor: p.floor, swing: b.moving ? 0.35 * Math.sin(b.phase) : 0, hand: b.hand });
  return bodyParts(built, pose, `${p.actor.name}${b.step ? `, ${b.step.kind}` : ''}`, color);
}

/** A thing with some of its parts taken out (by their paths in its layout), the rest shared, not copied. */
export function without(root: Part, paths: Set<string>, path = ''): Part | null {
  if (paths.has(path)) return null; if (!root.parts?.length) return root;
  let changed = false; const kids: Part[] = []; root.parts.forEach((k, i) => { const x = without(k, paths, `${path}/${i}`); if (x !== k) changed = true; if (x) kids.push(x); });
  return changed ? { ...root, parts: kids } : root;
}
/** The world at a time: the thing (its door swinging where the physics has it, if it opened one), the body, the way it
 *  walked. */
export function sceneAt(root: Part, p: Plan, t: number, more: { plan: Plan; color: number }[] = []): Assembly {
  if (p.then && t >= p.end) return sceneAt(p.then.world ?? root, p.then, t - p.end, more.map((m) => ({ ...m })));
  const rest = p.door ? without(root, new Set(p.door.movers)) ?? { name: root.name, parts: [] } : root, door = p.door && p.sim ? posedAt(p.sim, p.bodies!, p.placed!, Math.max(0, t - p.pullAt)).items : [];
  const trail = (c: number): Section => ({ id: 'way', name: 'the way it walked', round: false, w: 0.04, layers: [{ name: 'way', mat: 'pvc', t: 0.002 }], bend: 0, clear: 0, logic: 'clear', color: c, source: '' });
  const way = (q: Plan, c: number) => (q.path.length > 1 && q.walked > 0.01 ? [place(makeLine(trail(c), q.path.map((x) => [x[0], q.floor + 0.004, x[2]] as V3), 'the way it walked', { color: c }))] : []);
  return { name: 'agents', items: [place(rest), ...door, place(figureAt(p, t)), ...way(p, 0x3a7bff), ...more.flatMap((m) => [place(figureAt(m.plan, t, m.color)), ...way(m.plan, m.color)])] };
}
