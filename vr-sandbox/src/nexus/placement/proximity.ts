// Proximity: every part may carry the room it needs (Part.keep), worked out by its own node from its own figures: a
// door the quarter disc its leaf sweeps (its radius the leaf's width, from its hinge) and the floor to come up to it; a
// toilet or a basin the clear floor in front of it a code asks for; a kitchen run its work aisle. Nothing here knows
// what a door is. Whatever stands in another's zone is found; then what can move moves (with whatever stands on or
// against it), along the wall it stands against, or turned to another wall of its room and pushed back until it meets
// a wall, to the nearest place where it stands in no zone and its own zones hold nothing. What is there on purpose says
// so (Part.meant: the zone's name, or 'in the way') and is left.

import * as THREE from 'three';
import type { Keep, Mate, Part } from '../kits';
import type { V3 } from '../generate';
import { layout, type Node } from '../make/space';
import { inForce, measure, outBy, targetOf } from './relate';

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
