// An agent: a body with senses and a goal, which plans over what the world affords and drives its motion (docs/LIFE.md,
// step 3). Nothing here is placed or told by hand. It opens a door this way:
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
import { massOfAll, place, type Assembly } from '../assembly';
import { ACTORS, bodyOf, tagsOf, type Actor } from '../aware/tags';
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

export interface Goal { /** what to open, by its name */ open: RegExp; /** of those it sees, the nearest or the farthest */ which?: 'nearest' | 'farthest' }
export interface Door { name: string; path: string; /** a point on its hinge line, the line's direction (turning by it swings it open: right-handed) */ at: V3; axis: V3;
  /** the way its free edge swings, closed: out of its face */ swing: V3; /** from its hinge line to its free edge */ latch: V3; width: number;
  /** what swings (its leaf, its handles) */ movers: string[]; handles: { path: string; at: V3 }[]; mass: number }
export interface Step { kind: 'see' | 'go to' | 'reach' | 'grasp' | 'pull' | 'push' | 'let go'; from: number; to: number; /** what makes it done */ done: string; says: string }
export interface Plan {
  actor: Actor; start: V3; facing: V3; floor: number; door: Door; side: 1 | -1; stand: V3; handle: V3; path: V3[]; walked: number; steps: Step[];
  /** the door in the physics: its run from when it is first pulled, its angle over time */ sim: SimOut; bodies: SimThing[]; placed: ReturnType<typeof bodiesOf>['placed']; pullAt: number; letGoAt: number; angle: (t: number) => number;
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

/** What stands between a body's ankles and its head, seen from above: each drawn piece's footprint. */
function planOf(ns: Node[], floor: number, actor: Actor, skip: (n: Node) => boolean): THREE.Box3[] {
  const lo = floor + 0.1, hi = floor + actor.height + 0.05, out: THREE.Box3[] = [];
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

/** Plan and run it: see, go, reach, grasp, pull or push, let go; the door in the physics. */
export function openDoor(J: Jolt, root: Part, goal: Goal = { open: /door/i }, o: { actor?: Actor; start?: { at: V3; facing: V3 }; rays?: number } = {}): Plan {
  const actor = o.actor ?? ACTORS.adult!, L = limbsOf(actor), ns = layout(root), findings: string[] = [];
  const s0 = startOf(root, ns, actor), start = o.start?.at ?? s0.at, facing = o.start?.facing ?? s0.facing, floor = s0.floor;
  const { doors, findings: df } = doorsOf(root, ns, actor); findings.push(...df);
  const wanted = doors.filter((d) => goal.open.test(d.name)); if (!wanted.length) throw new Error(`nothing here named like ${String(goal.open)} opens`);
  // it sees: the doors its rays meet from where it stands
  const eye: V3 = [start[0], floor + L.eye, start[2]], ob: Observer = { name: actor.name, at: eye, facing, kind: 'person', actor };
  const seen = new Set((perceive(root, [ob], { rays: o.rays ?? 3000 }).by[ob.name]?.notices ?? []).filter((n) => n.sense === 'sight').map((n) => n.path));
  const sees = (d: Door) => [...seen].some((x) => x === d.path || x.startsWith(d.path + '/')), visible = wanted.filter(sees), flat = (a: V3) => Math.hypot(a[0] - start[0], a[2] - start[2]);
  if (!visible.length) throw new Error(`${actor.name} sees none of the ${wanted.length} things named like ${String(goal.open)} from where it stands`);
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
  const mid = floor + L.hip, all = new THREE.Box3(); for (const n of ns) if (n.sub) all.union(n.sub);
  const slab: Part = { name: 'what is in the way', parts: plan.map((b, i) => ({ name: `in the way ${i}`, shape: { box: [Math.max(1e-3, b.max.x - b.min.x), 1, Math.max(1e-3, b.max.z - b.min.z)] }, at: [(b.min.x + b.max.x) / 2, mid, (b.min.z + b.max.z) / 2], mat: 'concrete' })) };
  const from: V3 = [start[0], mid, start[2]], to: V3 = [best.p.x, mid, best.p.z];
  const way = Math.hypot(to[0] - from[0], to[2] - from[2]) < 0.05 ? { pts: [from, to], length: 0 } : route(slab, from, to, { section: walkerOf(actor), logic: 'clear', noHeat: true, step: 0.05, region: new THREE.Box3(new THREE.Vector3(all.min.x, mid - 0.06, all.min.z), new THREE.Vector3(all.max.x, mid + 0.06, all.max.z)) });
  const path = way.pts.map((p) => [p[0], floor, p[2]] as V3), walked = path.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - path[i - 1]![0], p[2] - path[i - 1]![2]) : 0), 0);
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
  const v = WALK * Math.sqrt(actor.height / 1.75), steps: Step[] = []; let t = 0; const add = (kind: Step['kind'], dt: number, done: string, says: string) => { steps.push({ kind, from: t, to: t + dt, done, says }); t += dt; };
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
  return { actor, start, facing, floor, door, side, stand: v3(best.p), handle: h.at, path, walked, steps, sim, bodies, placed, pullAt, letGoAt, angle: (x: number) => angle(x - pullAt), end, says, findings,
    sources: ['walking 1.4 m/s: Bohannon (1997)', 'reaction 0.25 s (typical)', 'reach: Fitts\' law, a = 0.1 s, b = 0.1 s/bit (typical)', 'door force 22.2 N: ADA Standards 404.2.9', 'body proportions: Drillis and Contini (1966)', 'hinge friction 0.5 N·m, stop at 90° (estimates)'] };
}

// ---- the body drawn ------------------------------------------------------------------------------------------------------------

/** Where the body is and what it does at a time: along its way, turning to the handle, its arm to it while it holds. */
export function bodyAt(p: Plan, t: number): { at: V3; facing: V3; hand: V3 | null; moving: boolean; phase: number; step: Step | undefined } {
  const L = limbsOf(p.actor), step = p.steps.find((s) => t >= s.from && t < s.to) ?? (t >= p.end ? undefined : p.steps[p.steps.length - 1]), go = p.steps.find((s) => s.kind === 'go to')!;
  let at = vec(p.path[0]!), dir = vec(p.facing), dist = 0;
  const along = Math.max(0, Math.min(p.walked, ((t - go.from) / Math.max(1e-6, go.to - go.from)) * p.walked));
  for (let i = 1; i < p.path.length; i++) { const a = vec(p.path[i - 1]!), b = vec(p.path[i]!), len = a.distanceTo(b); if (len < 1e-9) continue; if (dist + len >= along || i === p.path.length - 1) { at = a.clone().lerp(b, Math.min(1, (along - dist) / len)); dir = b.clone().sub(a).normalize(); break; } dist += len; }
  const H = vec(p.handle), toH = H.clone().sub(at).setY(0).normalize(), reach = p.steps.find((s) => s.kind === 'reach')!, u = Math.max(0, Math.min(1, (t - reach.from) / (reach.to - reach.from)));
  if (t >= go.to) dir = dir.clone().lerp(toH, Math.min(1, (t - go.to) / Math.max(0.2, reach.to - go.to))).normalize();
  // (its hand: hanging; reaching out to the handle; on the handle as it swings while it holds; back to its side)
  const right = dir.clone().cross(UP).normalize(), sh = [at.clone().setY(p.floor + L.shoulder).addScaledVector(right, -L.shoulders / 2), at.clone().setY(p.floor + L.shoulder).addScaledVector(right, L.shoulders / 2)], s = sh[0]!.distanceTo(H) < sh[1]!.distanceTo(H) ? sh[0]! : sh[1]!;
  const hang = s.clone().setY(p.floor + L.hip - 0.05), Hn = H.clone().sub(vec(p.door.at)).applyAxisAngle(vec(p.door.axis), p.angle(Math.min(t, p.letGoAt))).add(vec(p.door.at));
  let hand: THREE.Vector3 | null = null;
  if (t >= reach.from && t < reach.to) hand = hang.clone().lerp(H, u * u * (3 - 2 * u)); else if (t >= reach.to && t < p.letGoAt) hand = Hn; else if (t >= p.letGoAt && t < p.letGoAt + 0.4) { const w = (t - p.letGoAt) / 0.4; hand = Hn.clone().lerp(hang, w * w * (3 - 2 * w)); }
  return { at: v3(at), facing: v3(dir), hand: hand ? v3(hand) : null, moving: t > go.from && t < go.to, phase: (2 * Math.PI * along) / (2 * L.stride), step };
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
/** The world at a time: the thing with its door swinging where the physics has it, the body, the way it walked. */
export function sceneAt(root: Part, p: Plan, t: number): Assembly {
  const rest = without(root, new Set(p.door.movers)) ?? { name: root.name, parts: [] }, door = posedAt(p.sim, p.bodies, p.placed, Math.max(0, t - p.pullAt));
  const trail: Section = { id: 'way', name: 'the way it walked', round: false, w: 0.04, layers: [{ name: 'way', mat: 'pvc', t: 0.002 }], bend: 0, clear: 0, logic: 'clear', color: 0x3a7bff, source: '' };
  const way = p.path.length > 1 ? [makeLine(trail, p.path.map((q) => [q[0], p.floor + 0.004, q[2]] as V3), 'the way it walked', { color: 0x3a7bff })] : [];
  return { name: 'an agent opening a door', items: [place(rest), ...door.items, place(figureAt(p, t)), ...way.map((w) => place(w))] };
}
