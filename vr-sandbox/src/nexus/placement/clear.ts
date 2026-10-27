// What a door needs kept clear, and what stands in it moved (a television against the wall a door is in, a wardrobe in
// a door's swing). Each door is read as the agent reads it (act/agent.ts: its hinge line, the side it swings to, its
// width), and round it two zones are kept: on the side it swings to, the room its leaf sweeps (or, to the ADA, the
// floor a wheelchair needs to pull it open); on the other, the floor a body needs to come up to it and push. Whatever
// stands in one of those zones below the door's head is said; then it is slid along the wall it stands against (with
// whatever stands on it: a television on its stand) to the nearest place that is clear of every zone and of everything
// else, inside its own room. What is there on purpose says so (Part.meant: 'in a doorway') and is left where it is.

import * as THREE from 'three';
import type { Part } from '../kits';
import type { V3 } from '../generate';
import { layout, type Node } from '../make/space';
import { doorsOf, type Door } from '../act/agent';

export type Standard = 'house' | 'ada';
/** The zones each standard keeps, m, and where they come from. */
export const CLEARANCE: Record<Standard, { pull: number | 'sweep'; push: number; pastLatchPull: number; pastLatchPush: number; source: string }> = {
  house: { pull: 'sweep', push: 0.76, pastLatchPull: 0, pastLatchPush: 0, source: 'the leaf\'s own sweep on the side it swings to, and a passage its width wide and 760 mm deep on the other (an estimate: a body\'s depth and a step; a house\'s code asks only for the door\'s clear width)' },
  ada: { pull: 1.525, push: 1.22, pastLatchPull: 0.455, pastLatchPush: 0, source: 'ADA Standards 404.2.4.1, a front approach: 60 in (1525 mm) deep and 18 in (455 mm) past the latch on the side it is pulled from; 48 in (1220 mm) deep on the side it is pushed from (12 in past the latch where it has a closer and a latch)' },
};
export const MEANT_IN_DOORWAY = 'in a doorway';

interface Zone { door: Door; side: 'swings to' | 'pushed from'; o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; u0: number; u1: number; v0: number; v1: number; sweep: number; head: number }
/** Each door's two zones, in its own frame on the floor: u from its hinge line to its free edge, v out of the face it
 *  swings to. */
export function zonesOf(ns: Node[], doors: Door[], std: Standard = 'house'): Zone[] {
  const c = CLEARANCE[std], out: Zone[] = [], byPath = new Map(ns.map((n) => [n.path, n]));
  for (const d of doors) {
    const unit = byPath.get(d.path); if (!unit?.sub) continue;
    const o = new THREE.Vector3(...d.at).setY(0), u = new THREE.Vector3(...d.latch).setY(0).normalize(), v = new THREE.Vector3(...d.swing).setY(0).normalize(), W = d.width;
    // (the door's own depth on the side it is pushed from: its lining, as deep as its wall)
    let back = 0; for (const k of [0, 1, 2, 3, 4, 5, 6, 7]) { const p = new THREE.Vector3(k & 1 ? unit.sub.max.x : unit.sub.min.x, 0, k & 4 ? unit.sub.max.z : unit.sub.min.z); back = Math.min(back, p.sub(o).dot(v)); }
    const head = unit.sub.max.y, pull = c.pull === 'sweep' ? W : Math.max(W, c.pull);
    out.push({ door: d, side: 'swings to', o, u, v, u0: 0, u1: W + c.pastLatchPull, v0: 0, v1: pull, sweep: c.pull === 'sweep' ? W : 0, head });
    out.push({ door: d, side: 'pushed from', o, u, v, u0: 0, u1: W + c.pastLatchPush, v0: back - c.push, v1: back, sweep: 0, head });
  }
  return out;
}
/** Does a footprint (a box on the floor, its height from lo to hi) stand in a zone? */
function inZone(z: Zone, b: THREE.Box3): boolean {
  if (b.min.y >= z.head) return false;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const k of [0, 1, 2, 3]) { const p = new THREE.Vector3(k & 1 ? b.max.x : b.min.x, 0, k & 2 ? b.max.z : b.min.z).sub(z.o), a = p.dot(z.u), c = p.dot(z.v); u0 = Math.min(u0, a); u1 = Math.max(u1, a); v0 = Math.min(v0, c); v1 = Math.max(v1, c); }
  if (u1 <= z.u0 || u0 >= z.u1 || v1 <= z.v0 || v0 >= z.v1) return false;
  // (the sweep: the quarter disc its leaf turns through, not the square round it)
  if (z.sweep) { const a = Math.max(u0, 0), c = Math.max(v0, 0); return a < u1 && c < v1 && Math.hypot(a, c) < z.sweep; }
  return true;
}

export interface Blocked { door: string; door_path: string; zone: string; thing: string; path: string; did: string }
/** Every door kept clear: what stands in its zones found, and (unless asked only to say) moved along its wall. */
export function keepClear(root: Part, o: { standard?: Standard; move?: boolean } = {}): { tree: Part; blocked: Blocked[]; moved: number; says: string; source: string } {
  const std = o.standard ?? 'house', move = o.move ?? true, rows: Blocked[] = [], done = new Set<string>(); let tree = root, moved = 0;
  const meant = (n: Node) => { for (let x: Node | null = n; x; x = x.parent) if (x.p.meant?.includes(MEANT_IN_DOORWAY)) return true; return false; };
  for (let round = 0; round < 64; round++) {
    const ns = layout(tree), { doors } = doorsOf(tree, ns), zones = zonesOf(ns, doors, std);
    // (what stands in a room: each thing its fittings hold)
    const things = ns.filter((n) => n.parent && /fittings$/i.test(n.parent.p.name) && n.sub && !n.sub.isEmpty());
    const hit = things.find((n) => !done.has(n.path) && zones.some((z) => inZone(z, n.sub!)));
    if (!hit) break;
    const zs = zones.filter((z) => inZone(z, hit.sub!)), z = zs[0]!, row = (did: string) => { for (const q of zs) rows.push({ door: q.door.name, door_path: q.door.path, zone: q.side, thing: hit.p.name, path: hit.path, did }); };
    done.add(hit.path);
    if (meant(hit)) { row('left: it is meant to be there'); continue; }
    if (!move) { row('said, not moved'); continue; }
    // (what moves with it: what touches it in plan in the same room: a television on its stand, a sink in its worktop, a
    // run of cabinets and the stove beside them)
    const overlapPlan = (a: THREE.Box3, b: THREE.Box3, g = 0) => a.min.x < b.max.x + g && a.max.x > b.min.x - g && a.min.z < b.max.z + g && a.max.z > b.min.z - g;
    const group = new Set([hit]); for (let grew = true; grew;) { grew = false; for (const t of things) if (!group.has(t) && t.parent === hit.parent && [...group].some((g) => overlapPlan(g.sub!, t.sub!, 0.02))) { group.add(t); grew = true; } }
    const all = new THREE.Box3(); for (const g of group) all.union(g.sub!);
    // (its room: the floor under it)
    let room: Node | null = hit.parent; while (room && !/^room$/i.test(room.p.name)) room = room.parent;
    const floor = room ? ns.find((n) => n.path.startsWith(room!.path + '/') && /^floor$/i.test(n.p.name)) : undefined;
    const inGroup = (n: Node) => [...group].some((g) => n === g || n.path.startsWith(g.path + '/'));
    const lo = all.min.y, hi = all.max.y, near = ns.filter((n) => n.p.shape && n.sub && !inGroup(n) && !n.path.startsWith(z.door.path + '/') && n.sub.max.y > lo + 0.02 && n.sub.min.y < hi - 0.02 && n.sub.max.y > (floor?.sub?.max.y ?? -Infinity) + 0.02), others = near.map((n) => n.sub!), walls = near.filter((n) => /wall|lining/i.test(n.p.name)).map((n) => n.sub!);
    const boxAfter = (T: THREE.Matrix4) => { const b = new THREE.Box3(); for (const g of group) for (let k = 0; k < 8; k++) b.expandByPoint(new THREE.Vector3(k & 1 ? g.sub!.max.x : g.sub!.min.x, k & 2 ? g.sub!.max.y : g.sub!.min.y, k & 4 ? g.sub!.max.z : g.sub!.min.z).applyMatrix4(T)); return b; };
    const room_ = (T: THREE.Matrix4) => { const b = boxAfter(T), s = b.clone().expandByVector(new THREE.Vector3(-0.005, 0, -0.005));
      if (floor?.sub && (b.min.x < floor.sub.min.x - 1e-6 || b.max.x > floor.sub.max.x + 1e-6 || b.min.z < floor.sub.min.z - 1e-6 || b.max.z > floor.sub.max.z + 1e-6)) return false;
      return !others.some((x) => overlapPlan(s, x)); };
    const fits = (T: THREE.Matrix4) => room_(T) && !zones.some((q) => inZone(q, boxAfter(T)));
    // (slid along the wall it stands against, the way it is longest; else turned to another wall of its room (about the
    // room's middle: half a turn to the wall across, a quarter to either side) and slid along that)
    const mid = floor?.sub?.getCenter(new THREE.Vector3()) ?? all.getCenter(new THREE.Vector3());
    let found: { T: THREE.Matrix4; did: string } | null = null;
    for (const turn of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
      const R = new THREE.Matrix4().makeTranslation(mid.x, 0, mid.z).multiply(new THREE.Matrix4().makeRotationY(turn)).multiply(new THREE.Matrix4().makeTranslation(-mid.x, 0, -mid.z));
      const b0 = boxAfter(R), sz = b0.getSize(new THREE.Vector3()), ax = sz.x >= sz.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), back = new THREE.Vector3(ax.z, 0, ax.x);
      if (back.dot(b0.getCenter(new THREE.Vector3()).sub(mid)) < 0) back.negate();
      for (let k = 0; k <= 160 && !found; k++) for (const sgn of k ? [1, -1] : [1]) {
        if (turn === 0 && k === 0) continue;
        let T = new THREE.Matrix4().makeTranslation(ax.x * sgn * k * 0.025, 0, ax.z * sgn * k * 0.025).multiply(R);
        // (turned, pushed back from there until it meets the wall it now faces away from, and that is a wall, not the
        // sofa in front of one)
        if (turn) { let best: number | null = null; for (let q = 24; q >= -60; q--) { const t = new THREE.Matrix4().makeTranslation(back.x * q * 0.025, 0, back.z * q * 0.025).multiply(T); if (room_(t)) { best = q; break; } }
          if (best === null) continue; T = new THREE.Matrix4().makeTranslation(back.x * best * 0.025, 0, back.z * best * 0.025).multiply(T);
          const probe = boxAfter(T).translate(back.clone().multiplyScalar(0.04)).expandByVector(new THREE.Vector3(-0.01, 0, -0.01)); if (!walls.some((w) => overlapPlan(probe, w))) continue; }
        if (fits(T)) { found = { T, did: `${turn ? `turned to the wall ${Math.abs(turn) > 2 ? 'across' : 'beside'} and ` : ''}${k ? `slid ${Math.round(k * 25)} mm along it` : 'set against it'}` }; break; }
      }
      if (found) break;
    }
    if (!found) { row('left: nowhere against its room\'s walls is clear'); continue; }
    const moves = new Map<string, { at: V3; rot: V3 }>();
    for (const g of group) { const w = found.T.clone().multiply(g.m), l = g.parent!.m.clone().invert().multiply(w), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); l.decompose(P, Q, S); const e = new THREE.Euler().setFromQuaternion(Q, 'XYZ'); moves.set(g.path, { at: [P.x, P.y, P.z], rot: [e.x, e.y, e.z] }); done.add(g.path); }
    tree = shifted(tree, moves); moved += group.size;
    row(`${found.did}${group.size > 1 ? `, with ${[...group].filter((g) => g !== hit).map((g) => `its ${g.p.name}`).join(', ')}` : ''}`);
  }
  const ds = new Set(rows.map((r) => r.door_path)).size;
  return { tree, blocked: rows, moved, source: CLEARANCE[std].source,
    says: rows.length ? `${rows.length} thing${rows.length === 1 ? '' : 's'} stood where ${ds} door${ds === 1 ? '' : 's'} need${ds === 1 ? 's' : ''} room: ${rows.map((r) => `the ${r.thing} in the ${r.door}'s ${r.zone === 'swings to' ? 'swing' : 'approach'} (${r.did})`).join('; ')}` : 'every door is clear' };
}

/** A tree with some of its parts set anew in their holders' frames (by their paths), the rest shared. */
function shifted(p: Part, moves: Map<string, { at: V3; rot: V3 }>, path = ''): Part {
  const d = moves.get(path), q = d ? { ...p, at: d.at, rot: d.rot } : p;
  if (!q.parts?.length || ![...moves.keys()].some((k) => k.startsWith(path + '/'))) return q;
  return { ...q, parts: q.parts.map((k, i) => shifted(k, moves, `${path}/${i}`)) };
}
