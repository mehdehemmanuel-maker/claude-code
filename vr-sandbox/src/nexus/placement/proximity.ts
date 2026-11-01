// Proximity: every part may carry the room it needs (Part.keep), worked out by its own node from its own figures: a
// door the quarter disc its leaf sweeps (its radius the leaf's width, from its hinge) and the floor to come up to it; a
// toilet or a basin the clear floor in front of it a code asks for; a kitchen run its work aisle. Nothing here knows
// what a door is. Whatever stands in another's zone is found; then what can move moves (with whatever stands on or
// against it), along the wall it stands against, or turned to another wall of its room and pushed back until it meets
// a wall, to the nearest place where it stands in no zone and its own zones hold nothing. What is there on purpose says
// so (Part.meant: the zone's name, or 'in the way') and is left.

import * as THREE from 'three';
import type { Keep, Mate, Part, Port } from '../kits';
import type { V3 } from '../generate';
import { layout, type Node } from '../make/space';
import { inForce, measure, outBy, targetOf } from './relate';
import { eigenSym, leastSquares, rankOf } from '../numeric';
import { fit } from '../mate';

export const MEANT_ANYWHERE = 'in the way';
export interface Zone { owner: Node; keep: Keep; m: THREE.Matrix4 }
export interface Intrusion { zone: string; of: string; of_path: string; thing: string; path: string; why: string; did: string }

/** Every zone in a laid-out thing, each with the matrix its owner stands by. */
export function zonesIn(ns: Node[]): Zone[] { return ns.flatMap((n) => (n.p.keep ?? []).map((keep) => ({ owner: n, keep, m: n.m }))); }

/** Does a box in the room (its corners) stand in a zone, placed by matrix m? */
export function inZone(k: Keep, m: THREE.Matrix4, b: THREE.Box3): boolean {
  const inv = m.clone().invert(), lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (let i = 0; i < 8; i++) { const p = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(inv); lo.min(p); hi.max(p); }
  const e = 1e-4;
  if (k.kind === 'box') { const s = k.size!, c = k.at; return hi.x > c[0] - s[0] / 2 + e && lo.x < c[0] + s[0] / 2 - e && hi.y > c[1] - s[1] / 2 + e && lo.y < c[1] + s[1] / 2 - e && hi.z > c[2] - s[2] / 2 + e && lo.z < c[2] + s[2] / 2 - e; }
  // (a sector: within its height, and in plan the rectangle meets the swept disc's part between its two directions)
  const y0 = k.y0 ?? -Infinity, y1 = y0 + (k.h ?? Infinity); if (hi.y <= y0 + e || lo.y >= y1 - e) return false;
  const h = k.at, r = k.r!, a0 = Math.atan2(k.from![2], k.from![0]); let a1 = Math.atan2(k.to![2], k.to![0]); let span = a1 - a0; while (span <= -Math.PI) span += 2 * Math.PI; while (span > Math.PI) span -= 2 * Math.PI; a1 = a0 + span;
  const inRect = (x: number, z: number) => x > lo.x + e && x < hi.x - e && z > lo.z + e && z < hi.z - e;
  const inSector = (x: number, z: number) => { const dx = x - h[0], dz = z - h[2], d = Math.hypot(dx, dz); if (d >= r - e) return false; if (d < e) return true; let t = Math.atan2(dz, dx) - a0; while (t < Math.min(0, span) - 1e-9) t += 2 * Math.PI; while (t > Math.max(0, span) + 1e-9) t -= 2 * Math.PI; return span >= 0 ? t > e && t < span - e : t < -e && t > span + e; };
  for (const [x, z] of [[lo.x, lo.z], [hi.x, lo.z], [lo.x, hi.z], [hi.x, hi.z]] as const) if (inSector(x, z)) return true;
  for (let i = 0; i <= 24; i++) { const t = a0 + (span * i) / 24; for (const f of [0.02, 0.35, 0.7, 0.98]) if (inRect(h[0] + Math.cos(t) * r * f, h[2] + Math.sin(t) * r * f)) return true; }
  return false;
}

/** The room every zone needs, found and (unless asked only to say) made: what stands where it should not, moved. */
export function proximity(root: Part, o: { move?: boolean; /** what is going on ('watching, cooking'), or '*' for all of it */ state?: string } = {}): { tree: Part; found: Intrusion[]; moved: number; zones: number; mates: number; says: string } {
  const state = o.state ?? '*', move = o.move ?? true, mateCount = { n: 0 }, rows: Intrusion[] = [], done = new Set<string>(); let tree = root, moved = 0, zoneCount = 0;
  const movable = (n: Node) => !!n.parent && /fittings$/i.test(n.parent.p.name);
  const unitOf = (n: Node): Node | null => { for (let x: Node | null = n; x; x = x.parent) if (movable(x)) return x; return null; };
  const meant = (n: Node, zone: string) => { for (let x: Node | null = n; x; x = x.parent) if (x.p.meant?.some((w) => w === zone || w === MEANT_ANYWHERE || (w === 'in a doorway' && /door/i.test(zone)))) return true; return false; };
  const within = (a: Node, b: Node) => a === b || a.path.startsWith(b.path + '/') || b.path.startsWith(a.path + '/');
  const overlapPlan = (a: THREE.Box3, b: THREE.Box3, g = 0) => a.min.x < b.max.x + g && a.max.x > b.min.x - g && a.min.z < b.max.z + g && a.max.z > b.min.z - g;
  const pieceBox = (b: { c: THREE.Vector3; u: THREE.Vector3[]; h: number[] }) => { const e = [0, 1, 2].map((k) => Math.abs(b.u[0]!.getComponent(k)) * b.h[0]! + Math.abs(b.u[1]!.getComponent(k)) * b.h[1]! + Math.abs(b.u[2]!.getComponent(k)) * b.h[2]!); return new THREE.Box3(new THREE.Vector3(b.c.x - e[0]!, b.c.y - e[1]!, b.c.z - e[2]!), new THREE.Vector3(b.c.x + e[0]!, b.c.y + e[1]!, b.c.z + e[2]!)); };
  for (let round = 0; round < 64; round++) {
    const ns = layout(tree), zones = zonesIn(ns).filter((z) => inForce(z.keep.when, state)); zoneCount = zones.length;
    const floorTop = (n: Node) => { let r: Node | null = n; while (r && !/^room$/i.test(r.p.name)) r = r.parent; const f = r ? ns.find((x) => x.path.startsWith(r!.path + '/') && /^floor$/i.test(x.p.name)) : undefined; return { room: r, floor: f }; };
    // (what stands: each movable thing whole, and every fixed drawn piece above the floor, as boxes)
    const units = ns.filter((n) => movable(n) && n.sub && !n.sub.isEmpty());
    const pieces = ns.filter((n) => n.p.shape && n.sub && !unitOf(n) && !/^floor$/i.test(n.p.name)).flatMap((n) => n.pieces.map((p) => ({ n, b: pieceBox(p) })));
    // (the first zone something stands in, where something can move)
    type Hit = { name: string; of: Node; why: string; x: Node; mover: Node; key: string; zone?: Zone; mateTarget?: Node };
    let hit: Hit | null = null;
    for (const z of zones) {
      const ou = unitOf(z.owner);
      for (const u of units) { if (within(u, z.owner) || (ou && (within(u, ou) || (u.parent === ou.parent && overlapPlan(u.sub!, ou.sub!, 0.02)))) || done.has(`${z.owner.path}|${z.keep.name}|${u.path}`)) continue; if (inZone(z.keep, z.m, u.sub!)) { hit = { name: z.keep.name, of: z.owner, why: z.keep.why, x: u, mover: u, key: `${z.owner.path}|${z.keep.name}|${u.path}`, zone: z }; break; } }
      if (hit) break;
      if (ou) for (const p of pieces) { if (within(p.n, z.owner) || done.has(`${z.owner.path}|${z.keep.name}|${ou.path}`)) continue; if (inZone(z.keep, z.m, p.b)) { hit = { name: z.keep.name, of: z.owner, why: z.keep.why, x: p.n, mover: ou, key: `${z.owner.path}|${z.keep.name}|${ou.path}`, zone: z }; break; } }
      if (hit) break;
    }
    // (then the mates in force: one out of its range moves what carries it, if that can move)
    const mates = ns.flatMap((n) => (n.p.mates ?? []).filter((k) => inForce(k.when, state)).map((k) => ({ n, k }))); mateCount.n = mates.length;
    const between = (a: Node, t: Node) => [...units.filter((u) => !within(u, a) && !within(u, t) && !(unitOf(a) && within(u, unitOf(a)!))).map((u) => u.sub!), ...pieces.filter((p) => !within(p.n, t)).map((p) => p.b)];
    if (!hit) for (const { n, k } of mates) { const ou = unitOf(n), t = targetOf(ns, n, k); if (!ou || !t || !n.sub || done.has(`${n.path}|${k.name}`)) continue;
      const v = measure(k, { box: n.sub, m: n.m }, t.sub!, between(n, t)); if (outBy(k, v) > 0) { hit = { name: k.name, of: n, why: `${k.why}: ${fmtMate(k, v)}`, x: t, mover: ou, key: `${n.path}|${k.name}`, mateTarget: unitOf(t) ?? t }; break; } }
    if (!hit) break;
    const { x, mover } = hit, row = (did: string) => rows.push({ zone: hit!.name, of: hit!.of.p.name, of_path: hit!.of.path, thing: x.p.name, path: x.path, why: hit!.why, did });
    done.add(hit.key);
    if (hit.zone && meant(x, hit.name)) { row('left: it is meant to be there'); continue; }
    if (!move) { row('said, not moved'); continue; }
    // (what moves with it: what touches it in plan in its room: a television on its stand, a sink in its worktop)
    // (and what it is mated with, in its room, with what touches that: a sofa, its table and its television move as one
    // arrangement, so their mates hold as they go)
    const mateEdges = mates.map(({ n, k }) => { const t = targetOf(ns, n, k); return [unitOf(n), t ? unitOf(t) : null] as const; }).filter((e): e is readonly [Node, Node] => !!e[0] && !!e[1] && e[0].parent === e[1].parent);
    // (to keep a mate, what carries it moves, with what touches it and what is mated to it, not what it is mated with:
    // a sofa drawn up to its television brings its table, not the television)
    const pinned = hit.mateTarget, linked = (g: Node, t: Node) => overlapPlan(g.sub!, t.sub!, 0.02) || mateEdges.some(([a, b]) => (a === g && b === t) || (a === t && b === g));
    // (first as the whole arrangement it is in; if that fits nowhere, what is in the way alone, with what touches it: its
    // mates then break, and are drawn back next)
    let found: { T: THREE.Matrix4; did: string } | null = null, group = new Set<Node>([mover]);
    for (const alone of [false, true]) {
      group = new Set([mover]); for (let grew = true; grew;) { grew = false; for (const t of units) if (!group.has(t) && t !== pinned && t.parent === mover.parent && [...group].some((g) => (alone ? overlapPlan(g.sub!, t.sub!, 0.02) : linked(g, t)))) { group.add(t); grew = true; } }
      const inGroup = (n: Node) => [...group].some((g) => within(n, g) && n.path.startsWith(g.path));
      const all = new THREE.Box3(); for (const g of group) all.union(g.sub!);
      const { floor } = floorTop(mover), fl = floor?.sub?.max.y ?? -Infinity;
      const others = [...units.filter((u) => !group.has(u)).map((u) => u.sub!), ...pieces.filter((p) => p.b.max.y > fl + 0.02).map((p) => p.b)].filter((b) => b.max.y > all.min.y + 0.02 && b.min.y < all.max.y - 0.02);
      const walls = pieces.filter((p) => /wall|lining/i.test(p.n.p.name)).map((p) => p.b);
      const theirZones = zones.filter((q) => !inGroup(q.owner)), ownZones = zones.filter((q) => inGroup(q.owner));
      const ownMates = mates.filter(({ n }) => inGroup(n)).map(({ n, k }) => ({ n, k, t: targetOf(ns, n, k) })).filter((x): x is { n: Node; k: Mate; t: Node } => !!x.t && !!x.n.sub && !inGroup(x.t));
      const stand = [...units.filter((u) => !group.has(u)).map((u) => u.sub!), ...pieces.filter((p) => p.b.max.y > fl + 0.02).map((p) => p.b)];
      const boxAfter = (T: THREE.Matrix4) => { const b = new THREE.Box3(); for (const g of group) for (let k = 0; k < 8; k++) b.expandByPoint(new THREE.Vector3(k & 1 ? g.sub!.max.x : g.sub!.min.x, k & 2 ? g.sub!.max.y : g.sub!.min.y, k & 4 ? g.sub!.max.z : g.sub!.min.z).applyMatrix4(T)); return b; };
      const room_ = (T: THREE.Matrix4) => { const b = boxAfter(T), s = b.clone().expandByVector(new THREE.Vector3(-0.005, 0, -0.005));
        if (floor?.sub && (b.min.x < floor.sub.min.x - 1e-6 || b.max.x > floor.sub.max.x + 1e-6 || b.min.z < floor.sub.min.z - 1e-6 || b.max.z > floor.sub.max.z + 1e-6)) return false; return !others.some((q) => overlapPlan(s, q)); };
      // (clear: it stands in no one else's zone, and its own zones, moved with it, hold nothing)
      const fits = (T: THREE.Matrix4) => { if (!room_(T)) return false; const b = boxAfter(T); if (theirZones.some((q) => inZone(q.keep, q.m, b))) return false;
        if (ownZones.some((q) => { const m = T.clone().multiply(q.m); return stand.some((s) => inZone(q.keep, m, s)); })) return false;
        // (and its own mates hold where it goes: a sofa still faces, sees and sits at its distance from its television)
        return ownMates.every(({ n, k, t }) => { const b = new THREE.Box3(); for (let i = 0; i < 8; i++) b.expandByPoint(new THREE.Vector3(i & 1 ? n.sub!.max.x : n.sub!.min.x, i & 2 ? n.sub!.max.y : n.sub!.min.y, i & 4 ? n.sub!.max.z : n.sub!.min.z).applyMatrix4(T));
          const moved = between(n, t).filter((q) => ![...group].some((g) => g.sub === q)); return outBy(k, measure(k, { box: b, m: T.clone().multiply(n.m) }, t.sub!, moved)) === 0; }); };
      const mid = floor?.sub?.getCenter(new THREE.Vector3()) ?? all.getCenter(new THREE.Vector3());
      
      for (const turn of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
        const R = new THREE.Matrix4().makeTranslation(mid.x, 0, mid.z).multiply(new THREE.Matrix4().makeRotationY(turn)).multiply(new THREE.Matrix4().makeTranslation(-mid.x, 0, -mid.z));
        const b0 = boxAfter(R), sz = b0.getSize(new THREE.Vector3()), long = sz.x >= sz.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
        // (one thing slides along the wall it stands against, its long way; an arrangement of several either way)
        for (const ax of group.size > 2 ? [long, new THREE.Vector3(long.z, 0, long.x)] : [long]) {
        const back = new THREE.Vector3(ax.z, 0, ax.x); if (back.dot(b0.getCenter(new THREE.Vector3()).sub(mid)) < 0) back.negate();
        // (what carries mates may stand off its wall too: a sofa drawn up to its television; tried after the wall)
        const across = ownMates.length ? [0, ...Array.from({ length: 30 }, (_, i) => -(i + 1) * 0.05)] : [0];
        for (const plain of turn && group.size > 2 ? [false, true] : [false]) for (const off of across) for (let k = 0; k <= 160 && !found; k += ownMates.length ? 2 : 1) for (const sgn of k ? [1, -1] : [1]) {
          if (turn === 0 && k === 0 && off === 0) continue;
          let T = new THREE.Matrix4().makeTranslation(ax.x * sgn * k * 0.025 + back.x * off, 0, ax.z * sgn * k * 0.025 + back.z * off).multiply(R);
          // (turned, pushed back from there until it meets the wall it now faces away from, and that is a wall)
          if (turn && !plain) { let best: number | null = null; for (let q = 24; q >= -60; q--) { const t = new THREE.Matrix4().makeTranslation(back.x * q * 0.025, 0, back.z * q * 0.025).multiply(T); if (room_(t)) { best = q; break; } }
            if (best === null) continue; T = new THREE.Matrix4().makeTranslation(back.x * best * 0.025, 0, back.z * best * 0.025).multiply(T);
            const probe = boxAfter(T).translate(back.clone().multiplyScalar(0.04)).expandByVector(new THREE.Vector3(-0.01, 0, -0.01)); if (!walls.some((w) => overlapPlan(probe, w))) continue; }
          if (off && turn && !plain) T = new THREE.Matrix4().makeTranslation(back.x * off, 0, back.z * off).multiply(T);
          if (fits(T)) { found = { T, did: `${turn ? (plain ? `turned ${Math.abs(turn) > 2 ? 'half' : 'a quarter'} round about the room's middle and ` : `turned to the wall ${Math.abs(turn) > 2 ? 'across' : 'beside'} and `) : ''}${k ? `slid ${Math.round(k * 25)} mm along it` : 'set against it'}${off ? `, ${Math.round(-off * 1000)} mm out from it` : ''}` }; break; }
        }
        if (found) break;
        }
        if (found) break;
      }
      if (found) break;
    }
    if (!found) { row(`left: nowhere against its room's walls is clear${mover !== x ? ` for the ${mover.p.name}` : ''}`); continue; }
    const moves = new Map<string, { at: V3; rot: V3 }>();
    for (const g of group) { const w = found.T.clone().multiply(g.m), l = g.parent!.m.clone().invert().multiply(w), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); l.decompose(P, Q, S); const e = new THREE.Euler().setFromQuaternion(Q, 'XYZ'); moves.set(g.path, { at: [P.x, P.y, P.z], rot: [e.x, e.y, e.z] }); }
    tree = shifted(tree, moves); moved += group.size;
    row(`the ${mover.p.name} ${found.did}${group.size > 1 ? `, with ${[...group].filter((g) => g !== mover).map((g) => `its ${g.p.name}`).join(', ')}` : ''}`);
  }
  return { tree, found: rows, moved, zones: zoneCount, mates: mateCount.n, says: rows.length ? `${zoneCount} zones and ${mateCount.n} mates in force; ${rows.length} kept: ${rows.map((r) => `the ${r.of}'s ${r.zone} with the ${r.thing} (${r.did})`).join('; ')}` : `${zoneCount} zones and ${mateCount.n} mates in force, each holding` };
}
const fmtMate = (k: Mate, v: number) => { const u = k.measure === 'facing' ? '°' : k.measure === 'sees' ? '' : ' m'; return `${k.measure} ${Math.round(v * 100) / 100}${u}, wanted ${k.min !== undefined ? `at least ${k.min}${u}` : ''}${k.min !== undefined && k.max !== undefined ? ' and ' : ''}${k.max !== undefined ? `at most ${k.max}${u}` : ''}`;
}

/** A tree with some of its parts set anew in their holders' frames (by their paths), the rest shared. */
function shifted(p: Part, moves: Map<string, { at: V3; rot: V3 }>, path = ''): Part {
  const d = moves.get(path), q = d ? { ...p, at: d.at, rot: d.rot } : p;
  if (!q.parts?.length || ![...moves.keys()].some((k) => k.startsWith(path + '/'))) return q;
  return { ...q, parts: q.parts.map((k, i) => shifted(k, moves, `${path}/${i}`)) };
}

/** A zone worked out from a thing's own size (its box in its own frame): in front of a face, so deep, as wide and as high
 *  as it; or swept from a hinge at one edge of that face, its radius the width (a door's leaf). */
export function zoneFor(box: THREE.Box3, o: { kind: 'front' | 'swing'; face: '+z' | '-z' | '+x' | '-x'; depth?: number; /** across, centred on it (else its own width) */ width?: number; r?: number; hinge?: 'left' | 'right'; name: string; why: string }): Keep {
  const ax = o.face[1] as 'x' | 'z', sg = o.face[0] === '+' ? 1 : -1, other = ax === 'z' ? 'x' : 'z', c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const faceAt = sg > 0 ? box.max[ax] : box.min[ax], y0 = box.min.y, h = s.y;
  if (o.kind === 'front') { const d = o.depth ?? 0.5, at = c.clone(); at[ax] = faceAt + (sg * d) / 2; at.y = y0 + h / 2; const size = new THREE.Vector3(); size[ax] = d; size[other] = o.width ?? s[other]; size.y = h; return { name: o.name, kind: 'box', at: at.toArray() as V3, size: size.toArray() as V3, why: o.why }; }
  // (the hinge at one edge of the face: its leaf, as wide as the thing, turns out from the face toward the side it swings)
  const edge = (o.hinge ?? 'left') === 'left' ? box.min[other] : box.max[other], hinge = new THREE.Vector3(); hinge[ax] = faceAt; hinge[other] = edge; hinge.y = 0;
  const along = new THREE.Vector3(); along[other] = (o.hinge ?? 'left') === 'left' ? 1 : -1; const out = new THREE.Vector3(); out[ax] = sg;
  return { name: o.name, kind: 'sector', at: hinge.toArray() as V3, r: o.r ?? s[other], from: along.toArray() as V3, to: out.toArray() as V3, y0, h, why: o.why };
}

// ---- joints: parts put together frame to frame, every joint solved together (spec 01, I12; design §2.7; R13) -------------
// A joint holds a frame on one part to a frame on another (each frame where it sits, n out of its part into the partner,
// u across it), and the kind of meeting says which of their six differences it holds: a fixed joint all six; a hinge
// (revolute) all but the turn about its axis; a slider all but the slide along it; a pin in a bore (cylindrical) all but
// both; two faces (planar) the tilt and the gap; a ball the point. Each part's pose is unknown (where it stands, how it
// is turned); every joint's residuals are driven to their least together (numeric.ts leastSquares), the sets the joints
// connect solved apart. Each joint says how far off it is (mm, degrees); a part given facing the wrong way (its frame's n
// with its partner's, not against it) is said to be turned end for end to meet; the freedom left is six for each part
// moved less the rank of the joints' Jacobian there (a motor's face and its four holes are 19 equations of rank 6, not
// 19 constraints), each free motion said in words; where the joints cannot all hold, a set that fights is found by
// leaving each out in turn (the deletion filter: Chinneck & Dravnieks, Locating minimal infeasible constraint sets in
// linear programs, ORSA Journal on Computing 3(2), 1991; here on a nonlinear system) and named.

export type JointKind = 'fixed' | 'revolute' | 'slider' | 'cylindrical' | 'planar' | 'ball';
/** What each kind holds: its equations (the differences it removes) and what it leaves. */
export const JOINT_KINDS: Record<JointKind, { holds: number; leaves: string }> = {
  fixed: { holds: 6, leaves: 'nothing' }, revolute: { holds: 5, leaves: 'a turn about its axis' }, slider: { holds: 5, leaves: 'a slide along its axis' },
  cylindrical: { holds: 4, leaves: 'a turn about its axis and a slide along it' }, planar: { holds: 3, leaves: 'two slides in its plane and a turn about its normal' }, ball: { holds: 3, leaves: 'three turns about its centre' },
};
/** One end of a joint: a frame on a part, given or read off one of its ports (and one hole of its pattern), in the part's own frame. */
export interface JointEnd { part: string; port?: string; /** one hole of the port's pattern, by its place in the pattern */ hole?: number; frame?: { at: V3; n: V3; u: V3 } }
export interface Joint { name: string; kind: JointKind; a: JointEnd; b: JointEnd; /** the turn of b's u from a's about a's n where it is held (rad): 0 unless said */ turn?: number; why?: string }
export interface JointRow { joint: string; kind: JointKind; a: string; b: string; /** how far its frames are off where it holds them, mm */ mm: number; /** and its axes or its turn, degrees */ deg: number; holds: boolean; /** the part turned end for end to meet it: given with its n along its partner's, not against it */ flipped: string | null; says: string }
export interface JointsSolved {
  poses: Record<string, { at: V3; rot: V3 }>; parts: Part[]; joints: JointRow[];
  /** six for each part moved, less the rank of the joints' Jacobian where they stopped */ freedom: number; rank: number; equations: number; unknowns: number;
  /** each motion the joints leave, in words */ free: string[]; flipped: string[];
  /** a set of joints that fight, where they cannot all hold (each needed to the fight; one such set, not always the smallest); and those of them that, left out alone, let all the rest hold */ fight: string[] | null; leaveOut: string[];
  held: string[]; sets: number; steps: number; says: string;
}

const HOLD_MM = 1e-3, HOLD_DEG = 1e-3;
const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]), arr = (x: THREE.Vector3): V3 => [x.x, x.y, x.z];
const clean = (x: number, dp: number) => { const r = +x.toFixed(dp); return Object.is(r, -0) ? 0 : r; };

/** A joint end's frame in its part's own frame: as given, or its port's (w = n × u, as mate() reads a port), or one hole of its pattern. */
function endFrame(parts: Map<string, Part>, e: JointEnd): { at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3 } | string {
  if (e.frame) return { at: v3(e.frame.at), n: v3(e.frame.n).normalize(), u: v3(e.frame.u).normalize() };
  const p = parts.get(e.part); if (!p) return `no part ${e.part}`;
  const q = p.ports?.find((x) => x.name === e.port); if (!q) return `no port ${e.port} on the ${e.part}`;
  const n = v3(q.n).normalize(), u = v3(q.u).normalize(), w = n.clone().cross(u), at = v3(q.at);
  if (e.hole !== undefined) { const h = q.pattern[e.hole]; if (!h) return `the ${e.part}'s ${e.port} has no hole ${e.hole + 1}`; at.addScaledVector(u, h[0]).addScaledVector(w, h[1]); }
  return { at, n, u };
}

/** The joints two ports make where one is mated onto the other: their faces (planar), and each hole on its partner's
 *  (cylindrical), the partner found as fit() turns the second's pattern, mirrored, onto the first's. */
export function jointsOfPorts(a: Part, pa: string, b: Part, pb: string): Joint[] | string {
  const qa = a.ports?.find((q) => q.name === pa), qb = b.ports?.find((q) => q.name === pb);
  if (!qa || !qb) return `no port ${!qa ? `${pa} on the ${a.name}` : `${pb} on the ${b.name}`}`;
  const f = fit(qa as Port, qb as Port); if (typeof f === 'string') return `the ${b.name}'s ${pb} does not mate the ${a.name}'s ${pa}: ${f}`;
  const c = Math.cos(f.turn), s = Math.sin(f.turn), out: Joint[] = [{ name: `${b.name} ${pb} on ${a.name} ${pa}: face`, kind: 'planar', a: { part: a.name, port: pa }, b: { part: b.name, port: pb }, why: 'the two faces meet: the tilt and the gap held' }];
  qb.pattern.forEach(([x, y], j) => { const X = x * c + y * s, Y = x * s - y * c, i = qa.pattern.findIndex(([p, q]) => Math.hypot(p - X, q - Y) < 1e-6);
    if (i >= 0) out.push({ name: `${b.name} ${pb} on ${a.name} ${pa}: hole ${i + 1}`, kind: 'cylindrical', a: { part: a.name, port: pa, hole: i }, b: { part: b.name, port: pb, hole: j }, why: `the ${b.name}'s hole ${j + 1} on the ${a.name}'s hole ${i + 1}: their axes one` }); });
  return out;
}

/** Puts parts together by their joints: each part's pose found so that every joint holds, or as near as they let it;
 *  `fixed` parts stay where they stand (a set of joints with none fixed holds its first part where it stands, and says so). */
export function solveJoints(parts: Part[], joints: Joint[], o: { fixed?: string[] } = {}): JointsSolved {
  const byName = new Map(parts.map((p) => [p.name, p])), fixed = new Set(o.fixed ?? []), held: string[] = [];
  const frames = new Map<Joint, { A: ReturnType<typeof endFrame>; B: ReturnType<typeof endFrame> }>();
  for (const j of joints) frames.set(j, { A: endFrame(byName, j.a), B: endFrame(byName, j.b) });
  const bad = joints.find((j) => typeof frames.get(j)!.A === 'string' || typeof frames.get(j)!.B === 'string');
  if (bad) { const f = frames.get(bad)!, why = typeof f.A === 'string' ? f.A : f.B as string; return { poses: {}, parts, joints: [], freedom: NaN, rank: 0, equations: 0, unknowns: 0, free: [], flipped: [], fight: null, leaveOut: [], held, sets: 0, steps: 0, says: `the joint ${bad.name}: ${why}` }; }
  const F = (j: Joint) => frames.get(j)! as { A: { at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3 }; B: { at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3 } };
  // (each part's pose as given: where it stands and how it is turned)
  const given = new Map<string, { t: THREE.Vector3; q: THREE.Quaternion }>();
  for (const p of parts) given.set(p.name, { t: v3(p.at ?? [0, 0, 0]), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))) });
  // (the sets the joints connect: each solved apart)
  const named = [...new Set(joints.flatMap((j) => [j.a.part, j.b.part]))], sets = setsOf(joints);
  const poses = new Map<string, { t: THREE.Vector3; q: THREE.Quaternion }>(), rows: JointRow[] = [], free: string[] = [], flippedAll: string[] = [];
  let freedom = 0, rank = 0, equations = 0, unknowns = 0, steps = 0, fight: string[] | null = null, leaveOut: string[] = [];
  for (const set of sets) {
    const js = joints.filter((j) => set.includes(j.a.part)), ground = set.filter((n) => fixed.has(n));
    if (!ground.length) { ground.push(set[0]!); held.push(set[0]!); }
    const solved = solveTried(set, ground, js, given, F);
    for (const [k, p] of solved.poses) poses.set(k, p);
    rows.push(...solved.rows); free.push(...solved.free); flippedAll.push(...solved.flipped);
    freedom += solved.freedom; rank += solved.rank; equations += solved.equations; unknowns += solved.unknowns; steps += solved.steps;
    if (!solved.rows.every((r) => r.holds)) {
      // (the joints that fight: each left out in turn, kept out where the rest still cannot all hold, so every one named is
      // needed to the fight; it is one such set, not always the smallest, and one in each set of parts at a time)
      const holdsAll = (sub: Joint[]) => setsOf(sub).every((ss) => { const g = ss.filter((n) => ground.includes(n)); if (!g.length) g.push(ss[0]!);
        return solveTried(ss, g, sub.filter((j) => ss.includes(j.a.part)), given, F).rows.every((r) => r.holds); });
      let S = js.slice(); for (const j of js) { const T = S.filter((x) => x !== j); if (!holdsAll(T)) S = T; }
      fight = [...(fight ?? []), ...S.map((j) => j.name)]; leaveOut.push(...S.filter((j) => holdsAll(js.filter((x) => x !== j))).map((j) => j.name));
    }
  }
  const placed = parts.map((p) => { const ps = poses.get(p.name); if (!ps) return p; const e = new THREE.Euler().setFromQuaternion(ps.q); return { ...p, at: arr(ps.t), rot: [e.x, e.y, e.z] as V3 }; });
  const out: Record<string, { at: V3; rot: V3 }> = {}; for (const p of placed) if (poses.has(p.name)) out[p.name] = { at: p.at!, rot: p.rot! };
  const worst = rows.filter((r) => !r.holds);
  const says = [`${joints.length} joint${joints.length === 1 ? '' : 's'} on ${named.length} parts, ${equations} equations of rank ${rank} for ${unknowns} unknowns: ${freedom} freedom left${free.length ? ` (${free.join('; ')})` : ''}`,
    worst.length ? `${worst.length} do not hold: ${worst.map((r) => `${r.joint} ${r.mm} mm, ${r.deg}°`).join('; ')}` : 'every joint holds',
    ...(fight ? [`these fight, each needed to it: ${fight.join(', ')}${leaveOut.length ? `; leave out ${leaveOut.join(' or ')} and the rest hold` : ''}`] : []),
    ...(flippedAll.length ? [`turned end for end to meet: ${flippedAll.join(', ')}`] : []), ...(held.length ? [`nothing fixed in its set: held where it stands, ${held.join(', ')}`] : [])].join('; ');
  return { poses: out, parts: placed, joints: rows, freedom, rank, equations, unknowns, free, flipped: flippedAll, fight, leaveOut, held, sets: sets.length, steps, says };
}

/** The sets of parts the joints connect (each part in one). */
function setsOf(joints: Joint[]): string[][] {
  const named = [...new Set(joints.flatMap((j) => [j.a.part, j.b.part]))], root = new Map(named.map((n) => [n, n]));
  const find = (n: string): string => { while (root.get(n) !== n) n = root.get(n)!; return n; };
  for (const j of joints) { const a = find(j.a.part), b = find(j.b.part); if (a !== b) root.set(a, b); }
  return [...new Set(named.map(find))].map((r) => named.filter((n) => find(n) === r));
}
/** A set solved from where its parts were given, and, where its joints do not all hold, again from other starting turns
 *  (seeded, so alike every run) before they are said to fight: a least-squares descent can stop short of where they all
 *  hold (two hinges and a pin, consistent, once stopped so: the evaluator, 2026-11-01). The least of the tries is kept; a
 *  part's flip is judged against the pose it was given, never a start. */
function solveTried(set: string[], ground: string[], js: Joint[], given: Map<string, { t: THREE.Vector3; q: THREE.Quaternion }>, F: Frames) {
  const first = solveSet(set, ground, js, given, F); if (first.rows.every((r) => r.holds)) return first;
  let best = first, cost = (x: typeof first) => x.rows.reduce((a, r) => a + r.mm + r.deg, 0), seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let k = 0; k < 6; k++) {
    const start = new Map([...given].map(([n, g]) => { if (ground.includes(n)) return [n, g]; const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); return [n, { t: g.t, q: new THREE.Quaternion().setFromAxisAngle(ax, Math.PI * (0.5 + rnd())).multiply(g.q) }]; }));
    const s = solveSet(set, ground, js, start, F, given); if (s.rows.every((r) => r.holds)) return s; if (cost(s) < cost(best)) best = s;
  }
  return best;
}
type Frames = (j: Joint) => { A: { at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3 }; B: { at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3 } };
/** One set the joints connect: started where each moving part meets the parts placed before it (the least turn from where
 *  it was given), then every joint solved together. */
function solveSet(set: string[], ground: string[], js: Joint[], given: Map<string, { t: THREE.Vector3; q: THREE.Quaternion }>, F: Frames, asGiven = given) {
  const moving = set.filter((n) => !ground.includes(n)), pose = new Map<string, { t: THREE.Vector3; q: THREE.Quaternion }>();
  for (const g of ground) pose.set(g, { t: given.get(g)!.t.clone(), q: given.get(g)!.q.clone() });
  const world = (name: string, f: { at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3 }, P = pose) => { const p = P.get(name)!; return { p: f.at.clone().applyQuaternion(p.q).add(p.t), n: f.n.clone().applyQuaternion(p.q), u: f.u.clone().applyQuaternion(p.q) }; };
  // (a length the set is measured by, so a turn and a slide weigh alike: how far its joints' frames spread)
  const pts = js.flatMap((j) => { const f = F(j); return [given.get(j.a.part)!, given.get(j.b.part)!].map((g, k) => (k ? f.B.at : f.A.at).clone().applyQuaternion(g.q).add(g.t)); });
  const mid = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, pts.length)), L = Math.max(1e-3, ...pts.map((p) => p.distanceTo(mid)));
  // (where each moving part starts: placed on the parts before it by every joint to them, the least turn from its given pose)
  const flipped = new Map<string, string>(), order: string[] = []; // (each joint met by turning its part end for end, and that part)
  const todo = new Set(moving);
  while (todo.size) {
    let next: string | undefined; for (const n of todo) if (js.some((j) => (j.a.part === n && pose.has(j.b.part)) || (j.b.part === n && pose.has(j.a.part)))) { next = n; break; }
    if (!next) break; todo.delete(next); order.push(next);
    const g = given.get(next)!, mine = js.filter((j) => (j.a.part === next && pose.has(j.b.part)) || (j.b.part === next && pose.has(j.a.part)));
    // (pairs: a point of this part's frame and where it must go, by each joint to a placed part)
    const pairs: { l: THREE.Vector3; w: THREE.Vector3; k: number }[] = [];
    for (const j of mine) { const f = F(j), meB = j.b.part === next, mine2 = meB ? f.B : f.A, other = world(meB ? j.a.part : j.b.part, meB ? f.A : f.B);
      // (seen from either end the turn is the same: b's u is a's turned by it about a's n, and a's is b's turned by it about b's)
      const th = j.turn ?? 0, wO = other.n.clone().cross(other.u), U = other.u.clone().multiplyScalar(Math.cos(th)).addScaledVector(wO, Math.sin(th));
      // (a part given with its frame's n along its partner's, not against it, is turned end for end to meet; a ball holds only
      // a point, so its n says nothing and it is never said to be flipped)
      if (j.kind !== 'ball' && other.n.dot(mine2.n.clone().applyQuaternion(asGiven.get(next)!.q)) > 1e-9) flipped.set(j.name, next);
      pairs.push({ l: mine2.at.clone(), w: other.p.clone(), k: 1 }, { l: mine2.at.clone().addScaledVector(mine2.n, L), w: other.p.clone().addScaledVector(other.n, -L), k: 1 });
      if (j.kind === 'fixed' || j.kind === 'slider') pairs.push({ l: mine2.at.clone().addScaledVector(mine2.u, L), w: other.p.clone().addScaledVector(U, L), k: 1 }); }
    // (and, lightly, its own axes where it was given: what the joints leave free stays as it was turned)
    for (const e of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as V3[]) { const l = v3(e).multiplyScalar(L); pairs.push({ l, w: l.clone().applyQuaternion(g.q).add(g.t), k: 1e-4 }); }
    pose.set(next, bestFit(pairs));
  }
  for (const n of todo) pose.set(n, { t: given.get(n)!.t.clone(), q: given.get(n)!.q.clone() });
  const all = [...order, ...todo];
  // (the residuals: each joint's differences, lengths over L)
  const parts = (x: number[]) => { const P = new Map(pose); all.forEach((n, i) => P.set(n, { t: new THREE.Vector3(x[7 * i]!, x[7 * i + 1]!, x[7 * i + 2]!), q: new THREE.Quaternion(x[7 * i + 3]!, x[7 * i + 4]!, x[7 * i + 5]!, x[7 * i + 6]!) })); return P; };
  const diffs = (j: Joint, P: Map<string, { t: THREE.Vector3; q: THREE.Quaternion }>) => { const f = F(j), A = world(j.a.part, f.A, P), B = world(j.b.part, f.B, P), d = B.p.clone().sub(A.p), w = A.n.clone().cross(A.u), th = j.turn ?? 0;
    const U = A.u.clone().multiplyScalar(Math.cos(th)).addScaledVector(w, Math.sin(th)), along = d.dot(A.n), line = d.clone().addScaledVector(A.n, -along), axes = A.n.clone().add(B.n), twist = B.u.clone().sub(U);
    const k = j.kind, r: number[] = [];
    if (k === 'fixed' || k === 'revolute' || k === 'ball') r.push(d.x / L, d.y / L, d.z / L);
    if (k === 'slider' || k === 'cylindrical') r.push(line.x / L, line.y / L, line.z / L);
    if (k === 'planar') r.push(along / L);
    if (k !== 'ball') r.push(axes.x, axes.y, axes.z);
    if (k === 'fixed' || k === 'slider') r.push(twist.x, twist.y, twist.z);
    const mm = (k === 'fixed' || k === 'revolute' || k === 'ball' ? d.length() : k === 'planar' ? Math.abs(along) : line.length()) * 1e3;
    const deg = k === 'ball' ? 0 : Math.max(Math.acos(Math.min(1, Math.max(-1, -A.n.dot(B.n)))), k === 'fixed' || k === 'slider' ? Math.acos(Math.min(1, Math.max(-1, B.u.clone().addScaledVector(A.n, -B.u.dot(A.n)).normalize().dot(U)))) : 0) * 180 / Math.PI;
    return { r, mm, deg }; };
  const res = (x: number[]) => { const P = parts(x); return js.flatMap((j) => diffs(j, P).r); };
  const plus = (x: number[], dx: number[]) => { const y = x.slice(); all.forEach((_, i) => { for (let k = 0; k < 3; k++) y[7 * i + k] = x[7 * i + k]! + L * dx[6 * i + k]!;
    const w = new THREE.Vector3(dx[6 * i + 3]!, dx[6 * i + 4]!, dx[6 * i + 5]!), a = w.length(), dq = a > 0 ? new THREE.Quaternion().setFromAxisAngle(w.clone().normalize(), a) : new THREE.Quaternion(), q = dq.multiply(new THREE.Quaternion(x[7 * i + 3]!, x[7 * i + 4]!, x[7 * i + 5]!, x[7 * i + 6]!)).normalize();
    y[7 * i + 3] = q.x; y[7 * i + 4] = q.y; y[7 * i + 5] = q.z; y[7 * i + 6] = q.w; }); return y; };
  const x0 = all.flatMap((n) => { const p = pose.get(n)!; return [p.t.x, p.t.y, p.t.z, p.q.x, p.q.y, p.q.z, p.q.w]; });
  const ls = all.length ? leastSquares(res, x0, { n: 6 * all.length, plus, h: 1e-7 }) : null;
  const P = ls ? parts(ls.x) : pose, ranked = ls ? rankOf(ls.J) : { rank: 0, singular: [], free: [] };
  const rows: JointRow[] = js.map((j) => { const d = diffs(j, P), holds = d.mm < HOLD_MM && d.deg < HOLD_DEG, fl = flipped.get(j.name) ?? null;
    return { joint: j.name, kind: j.kind, a: j.a.part, b: j.b.part, mm: clean(d.mm, 4), deg: clean(d.deg, 4), holds, flipped: fl, says: `${j.name} (${j.kind}): ${holds ? 'holds' : `off by ${clean(d.mm, 3)} mm and ${clean(d.deg, 3)}°`}${fl ? `; the ${fl} was given facing the wrong way (its n along its partner's) and turned end for end to meet` : ''}` }; });
  // (each free motion in words: pure slides split from turns, then the part that moves most and how)
  const free: string[] = [];
  if (ranked.free.length) {
    const N = ranked.free, k = N.length, rotRows = all.flatMap((_, i) => [3, 4, 5].map((c) => N.map((col) => col[6 * i + c]!)));
    const G = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => rotRows.reduce((s, row) => s + row[a]! * row[b]!, 0))), { values, V } = eigenSym(G);
    const motions = values.map((val, m) => ({ turns: val > 1e-8, v: N[0]!.map((_, r) => N.reduce((s, col, c) => s + col[r]! * V[c]![m]!, 0)) })).sort((a, b) => Number(a.turns) - Number(b.turns));
    for (const mo of motions) {
      const each = all.map((n, i) => ({ n, d: new THREE.Vector3(mo.v[6 * i]!, mo.v[6 * i + 1]!, mo.v[6 * i + 2]!).multiplyScalar(L), w: new THREE.Vector3(mo.v[6 * i + 3]!, mo.v[6 * i + 4]!, mo.v[6 * i + 5]!) }));
      const top = each.reduce((a, b) => (b.d.length() + b.w.length() * L > a.d.length() + a.w.length() * L ? b : a)), dir = (x: THREE.Vector3) => { const u = x.clone().normalize(); const big = [u.x, u.y, u.z].reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a)); if (big < 0) u.negate(); return `(${[u.x, u.y, u.z].map((c) => clean(c, 3)).join(', ')})`; };
      if (!mo.turns) free.push(`the ${top.n} slides along ${dir(top.d)}`);
      else { const t = P.get(top.n)!.t, w2 = top.w.lengthSq(), c = t.clone().add(top.w.clone().cross(top.d).multiplyScalar(1 / w2)), pitch = top.w.dot(top.d) / w2;
        free.push(`the ${top.n} turns about ${dir(top.w)} through (${[c.x, c.y, c.z].map((x) => clean(x * 1e3, 1)).join(', ')}) mm${Math.abs(pitch) > 1e-6 ? `, moving ${clean(pitch * 1e3, 3)} mm along it a radian` : ''}`); }
    }
  }
  return { poses: new Map(all.map((n) => [n, P.get(n)!])), rows, free, flipped: [...new Set(flipped.values())], freedom: 6 * all.length - ranked.rank, rank: ranked.rank,
    equations: js.reduce((s, j) => s + JOINT_KINDS[j.kind].holds, 0), unknowns: 6 * all.length, steps: ls?.steps ?? 0 };
}

/** The pose that takes a part's points nearest where they must go (weighted): its turn by Horn's quaternion (Closed-form
 *  solution of absolute orientation using unit quaternions, JOSA A 4(4), 1987), then its place. */
function bestFit(pairs: { l: THREE.Vector3; w: THREE.Vector3; k: number }[]): { t: THREE.Vector3; q: THREE.Quaternion } {
  const K = pairs.reduce((s, p) => s + p.k, 0), cl = pairs.reduce((s, p) => s.addScaledVector(p.l, p.k / K), new THREE.Vector3()), cw = pairs.reduce((s, p) => s.addScaledVector(p.w, p.k / K), new THREE.Vector3());
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (const p of pairs) { const a = p.l.clone().sub(cl), b = p.w.clone().sub(cw), A = [a.x, a.y, a.z], B = [b.x, b.y, b.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i]![j]! += p.k * A[i]! * B[j]!; }
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S as [[number, number, number], [number, number, number], [number, number, number]];
  const Nm = [[xx + yy + zz, yz - zy, zx - xz, xy - yx], [yz - zy, xx - yy - zz, xy + yx, zx + xz], [zx - xz, xy + yx, -xx + yy - zz, yz + zy], [xy - yx, zx + xz, yz + zy, -xx - yy + zz]];
  const { values, V } = eigenSym(Nm), i = values.indexOf(Math.max(...values)), q = new THREE.Quaternion(V[1]![i]!, V[2]![i]!, V[3]![i]!, V[0]![i]!).normalize();
  return { q, t: cw.clone().sub(cl.clone().applyQuaternion(q)) };
}
