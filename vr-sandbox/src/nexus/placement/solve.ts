// Placing a part from what it needs (docs/PLACEMENT.md, layer D: place.solve). The part is taken out; the space round
// where it could go is mapped (heat, motion, reach) without it; every place it fits whole, standing on something
// solid (or within a bracket's reach of it) and under the hood or the body, is tried, at each of its turns about the vertical; what it must have is held (no cell of it hotter than the
// least of its materials stands, none in what a moving part needs), and among the places that hold, the cheapest by
// what it would like is chosen: less heat, a hand able to reach its top, near what it is wired or piped to, little
// moved from where it was. The choice comes with its reason (what bound it), the next best places with their costs,
// and why the place it had was or was not good.

import * as THREE from 'three';
import type { Part, V3 } from '../kits';
import { layout, type Node, type OBB } from '../make/space';
import { AMBIENT, MAX_SERVICE } from '../make/rules';
import { HEAT_HARMED } from './model';
import { fieldOf, MOTION_READ, type Field } from './fields';

export interface PlaceOptions {
  /** what to map round, besides where the part is (default: the engine), and how far round (default 0.25 m) */ around?: RegExp; grow?: number;
  /** cell size, m (default 25 mm) */ step?: number;
  /** what it is wired or piped to, to keep near (a battery: its starter) */ near?: RegExp;
  /** weights of what it would like: heat, reach, near, moved (default 1, 1, 0.5, 0.2) */ weights?: { heat?: number; reach?: number; near?: number; moved?: number };
  /** share of its footprint that must stand on something solid (default 0.4), within this far below (default 75 mm: a
   *  bracket bridges the gap, made to fit in step 5) */ support?: number; bridge?: number;
}
export interface Spot { at: V3; yaw: number; cost: number; /** the most a bracket must bridge under it, m */ gap: number; heat: number; room: number; reach: number; near: number; moved: number; holds: boolean; why: string[] }
export interface Placed {
  part: string; from: V3; to: V3; yaw: number; limit: number;
  chosen: Spot; was: Spot | null; others: Spot[];
  tried: number; fits: number; holds: number;
  /** of the places tried, how many failed each test: outside the region, into something solid, nothing over it, nothing to stand on */ rejected: { outside: number; solid: number; roof: number; support: number };
  /** why the place it had does not do, where it does not fit at all */ wasNot?: string;
  reason: string; sources: string[];
}

/** Where a part sits in a tree: its holder's parts and its index there; by a pattern on its name (the first found), or by
 *  its place ("/12/3"). */
function locate(root: Part, re: RegExp | string): { path: number[]; part: Part } | null {
  if (typeof re === 'string') { const path = re.split('/').filter(Boolean).map(Number); let part: Part | undefined = root; for (const i of path) part = part?.parts?.[i]; return part && path.length ? { path, part } : null; }
  const walk = (p: Part, path: number[]): { path: number[]; part: Part } | null => { for (let i = 0; i < (p.parts ?? []).length; i++) { const q = p.parts![i]!; if (re.test(q.name)) return { path: [...path, i], part: q }; const r = walk(q, [...path, i]); if (r) return r; } return null; };
  return walk(root, []);
}
/** A tree with the part at `path` replaced (or taken out, if `by` is null), everything else shared. */
export function replaceAt(root: Part, path: number[], by: Part | null): Part {
  if (!path.length) throw new Error('not the whole thing');
  const [i, ...rest] = path as [number, ...number[]], kids = [...(root.parts ?? [])];
  if (rest.length) kids[i] = replaceAt(kids[i]!, rest, by); else if (by) kids[i] = by; else kids.splice(i, 1);
  return { ...root, parts: kids };
}
/** The least service temperature among a part's materials that heat harms (a battery's polyethylene separators: 80 °C). */
export function heatLimit(p: Part): number { let lim = Infinity; const walk = (q: Part) => { if (q.shape && HEAT_HARMED.test(q.mat ?? '')) lim = Math.min(lim, MAX_SERVICE[q.mat!] ?? Infinity); (q.parts ?? []).forEach(walk); }; walk(p); return lim; }

export function placeOne(root: Part, re: RegExp | string, o: PlaceOptions = {}): { placed: Placed; tree: Part } {
  const at = locate(root, re); if (!at) throw new Error(`nothing named like ${String(re)} to place`);
  const nodes0 = layout(root), me = nodes0.find((n) => n.p === at.part); if (!me?.sub) throw new Error(`${at.part.name} has no size to place`);
  // (places are found in the world; its holder must not be moved or turned, so the world is its holder's frame)
  if (me.parent && !me.parent.m.equals(new THREE.Matrix4())) throw new Error(`${at.part.name} sits in ${me.parent.p.name}, which is moved or turned: placing inside a moved holder is not done yet`);
  // (turned about the vertical only where that adds to the turns it has: none about x)
  const r0 = (at.part.rot ?? [0, 0, 0]) as V3, yaws = r0[0] ? [0] : [0, Math.PI / 2];
  const from = (at.part.at ?? [0, 0, 0]) as V3, box0 = me.sub.clone(), size = box0.getSize(new THREE.Vector3()), off = new THREE.Vector3(box0.min.x - from[0], box0.min.y - from[1], box0.min.z - from[2]);
  // (the region: what it is mapped round, and where it was, grown)
  const region = new THREE.Box3(); for (const n of nodes0) if (n.sub && (o.around ?? /^(petrol|diesel) engine/).test(n.p.name)) region.union(n.sub);
  region.union(box0); region.expandByScalar(o.grow ?? 0.25);
  const without = replaceAt(root, at.path, null), nodes = layout(without), step = o.step ?? 0.025;
  const fo = { region, nodes, step }, heat = fieldOf(without, 'heat', fo), motion = fieldOf(without, 'motion', fo), reach = fieldOf(without, 'reach', fo);
  const lim = heatLimit(at.part), w = { heat: 1, reach: 1, near: 0.5, moved: 0.2, ...(o.weights ?? {}) }, support = o.support ?? 0.4;
  const near = o.near ? nodes.filter((n) => n.sub && o.near!.test(n.p.name)).map((n) => n.sub!.getCenter(new THREE.Vector3())) : [];
  const bridge = o.bridge ?? 0.075;
  // (a spot: the part's box with its least corner at a cell's least corner, turned a quarter or not)
  // (what it must not run into: every piece left, as its covering boxes, in a hash of 100 mm cells for quick finding)
  const HC = 0.1, hash = new Map<string, OBB[]>(), key = (x: number, y: number, z: number) => `${x},${y},${z}`, reachOf = (b: OBB): THREE.Vector3 => new THREE.Vector3(Math.abs(b.u[0].x) * b.h[0] + Math.abs(b.u[1].x) * b.h[1] + Math.abs(b.u[2].x) * b.h[2], Math.abs(b.u[0].y) * b.h[0] + Math.abs(b.u[1].y) * b.h[1] + Math.abs(b.u[2].y) * b.h[2], Math.abs(b.u[0].z) * b.h[0] + Math.abs(b.u[1].z) * b.h[1] + Math.abs(b.u[2].z) * b.h[2]);
  const big = region.clone().expandByScalar(0.3), ownerOf = new Map<OBB, Node>();
  for (const n of nodes) { if (!n.box || !n.box.intersectsBox(big)) continue; for (const b of n.pieces) { ownerOf.set(b, n); const r = reachOf(b); for (let x = Math.floor((b.c.x - r.x) / HC); x <= Math.floor((b.c.x + r.x) / HC); x++) for (let y = Math.floor((b.c.y - r.y) / HC); y <= Math.floor((b.c.y + r.y) / HC); y++) for (let z = Math.floor((b.c.z - r.z) / HC); z <= Math.floor((b.c.z + r.z) / HC); z++) (hash.get(key(x, y, z)) ?? hash.set(key(x, y, z), []).get(key(x, y, z))!).push(b); } }
  const near3 = (bx: THREE.Box3): OBB[] => { const out = new Set<OBB>(); for (let x = Math.floor(bx.min.x / HC); x <= Math.floor(bx.max.x / HC); x++) for (let y = Math.floor(bx.min.y / HC); y <= Math.floor(bx.max.y / HC); y++) for (let z = Math.floor(bx.min.z / HC); z <= Math.floor(bx.max.z / HC); z++) for (const b of hash.get(key(x, y, z)) ?? []) out.add(b); return [...out]; };
  // (an upright box against a turned one: apart if some axis of either parts them; faces touching, to 0.1 mm, are apart:
  // standing on something is not running into it)
  const TOUCH = 1e-4, hits = (bx: THREE.Box3, b: OBB): boolean => { const c = bx.getCenter(new THREE.Vector3()), h = bx.getSize(new THREE.Vector3()).multiplyScalar(0.5), d = b.c.clone().sub(c), r = reachOf(b);
    if (Math.abs(d.x) >= h.x + r.x - TOUCH || Math.abs(d.y) >= h.y + r.y - TOUCH || Math.abs(d.z) >= h.z + r.z - TOUCH) return false;
    for (let k = 0; k < 3; k++) { const u = b.u[k]!; if (Math.abs(d.dot(u)) >= b.h[k]! + h.x * Math.abs(u.x) + h.y * Math.abs(u.y) + h.z * Math.abs(u.z) - TOUCH) return false; }
    return true; };
  const blocker = (bx: THREE.Box3) => near3(bx).find((b) => hits(bx, b)), blocked = (bx: THREE.Box3) => !!blocker(bx);
  const D = heat.dims, I = (i: number, j: number, k: number) => i + D[0] * (j + D[1] * k), ci = (v: number, a: number) => Math.floor((v - heat.min[a]!) / step);
  const fail = { outside: 0, solid: 0, roof: 0, support: 0 }; let failed = '';
  // (a spot: the part's box with its least corner at lo, turned a quarter or not)
  const judge = (lo: THREE.Vector3, yaw: number): Spot | null => {
    const sx = yaw ? size.z : size.x, sz = yaw ? size.x : size.z, bx = new THREE.Box3(lo.clone(), lo.clone().add(new THREE.Vector3(sx, size.y, sz)));
    if (!region.containsBox(bx)) { fail.outside++; failed = 'outside the region mapped'; return null; }
    const hit = blocker(bx); if (hit) { fail.solid++; failed = `into the ${ownerOf.get(hit)?.p.name ?? 'something solid'}`; return null; }
    // (standing: a 5 by 5 lattice of its footprint, each with something solid within a bracket's reach under it; and
    // inside: something over each, up to the top of the region)
    let under = 0, gapMax = 0, roof = 0;
    for (let a = 0; a < 5; a++) for (let b2 = 0; b2 < 5; b2++) {
      const x = lo.x + ((a + 0.5) / 5) * sx, z = lo.z + ((b2 + 0.5) / 5) * sz, e = 0.004;
      for (let d = 0; d <= bridge; d += 0.0125) if (blocked(new THREE.Box3(new THREE.Vector3(x - e, lo.y - d - 0.0125, z - e), new THREE.Vector3(x + e, lo.y - d, z + e)))) { under++; gapMax = Math.max(gapMax, d); break; }
      if (blocked(new THREE.Box3(new THREE.Vector3(x - e, bx.max.y, z - e), new THREE.Vector3(x + e, region.max.y, z + e)))) roof++;
    }
    if (roof < 25) { fail.roof++; failed = `not under the hood or the body at ${25 - roof} of 25 points of its top`; return null; }
    if (under / 25 < support) { fail.support++; failed = `standing on something at only ${under} of 25 points under it`; return null; }
    // (what the maps say over the cells it covers; reach over its top layer)
    let hot = AMBIENT, room = Infinity, top = 0, topOk = 0; const j1 = Math.min(D[1] - 1, ci(bx.max.y - 1e-6, 1));
    for (let k = Math.max(0, ci(bx.min.z, 2)); k <= Math.min(D[2] - 1, ci(bx.max.z - 1e-6, 2)); k++) for (let i = Math.max(0, ci(bx.min.x, 0)); i <= Math.min(D[0] - 1, ci(bx.max.x - 1e-6, 0)); i++) {
      for (let j = Math.max(0, ci(bx.min.y, 1)); j <= j1; j++) { const c = I(i, j, k); hot = Math.max(hot, heat.values[c]!); room = Math.min(room, motion.values[c]!); }
      top++; if (reach.values[I(i, j1, k)]! >= 0) topOk++;
    }
    // (where its anchor goes: its box's corners turned about the anchor, their least corner put here)
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), m = new THREE.Vector3(Infinity, Infinity, Infinity);
    for (const cx of [0, size.x]) for (const cz of [0, size.z]) for (const cy of [0, size.y]) m.min(new THREE.Vector3(off.x + cx, off.y + cy, off.z + cz).applyQuaternion(q));
    const anchor: V3 = [lo.x - m.x, lo.y - m.y, lo.z - m.z], mid = bx.getCenter(new THREE.Vector3());
    const reachShare = top ? topOk / top : 0, dNear = near.length ? Math.min(...near.map((p2) => p2.distanceTo(mid))) : 0, moved = Math.hypot(anchor[0] - from[0], anchor[1] - from[1], anchor[2] - from[2]);
    const why: string[] = []; if (hot > lim) why.push(`${Math.round(hot)} °C where it would be, over its ${lim} °C`); if (room < 0) why.push(`in what a moving part needs, by ${Math.round(-room * 1000)} mm`);
    const cost = w.heat * Math.max(0, hot - AMBIENT) / Math.max(1, lim - AMBIENT) + w.reach * (1 - reachShare) + w.near * dNear + w.moved * moved;
    return { at: anchor, yaw, cost, gap: gapMax, heat: hot, room, reach: reachShare, near: dNear, moved, holds: !why.length, why };
  };
  // (every place on a lattice half a cell across (12.5 mm at the usual 25 mm cell), a cell up; the boxes say whether it
  // fits, the maps what it is like)
  const spots: Spot[] = []; let tried = 0; const FINE = step / 2;
  for (const yaw of yaws) { const sx = yaw ? size.z : size.x, sz = yaw ? size.x : size.z;
    for (let z = region.min.z; z + sz <= region.max.z; z += FINE) for (let x = region.min.x; x + sx <= region.max.x; x += FINE) for (let y = region.min.y; y + size.y <= region.max.y; y += step) { tried++; const sp = judge(new THREE.Vector3(x, y, z), yaw); if (sp) spots.push(sp); } }
  const holds = spots.filter((s) => s.holds).sort((a, b) => a.cost - b.cost);
  if (!holds.length) throw new Error(`nowhere in the region holds for ${at.part.name}: ${spots.length} places fit, each ${spots.length ? spots.sort((a, b) => a.cost - b.cost)[0]!.why.join('; ') : 'none standing on anything'}`);
  const chosen = holds[0]!;
  // (the next best, each at least 100 mm from those before it, so they are other places, not the same one moved a cell)
  const others: Spot[] = []; for (const s of holds.slice(1)) { if ([chosen, ...others].every((x) => Math.hypot(x.at[0] - s.at[0], x.at[1] - s.at[1], x.at[2] - s.at[2]) > 0.1)) others.push(s); if (others.length >= 3) break; }
  // (where it was, judged the same way)
  const was = judge(box0.min.clone(), 0), wasNot = was ? undefined : failed;
  const binding: string[] = [];
  binding.push(`its hottest cell ${Math.round(chosen.heat)} °C, under the ${lim} °C its materials stand`);
  binding.push(`${chosen.room >= MOTION_READ - 1e-6 ? `${Math.round(MOTION_READ * 1000)} mm or more` : `${Math.round(chosen.room * 1000)} mm`} spare past the room what moves needs (read at ${Math.round(step * 1000)} mm cells)`); if (chosen.gap > 0) binding.push(`a bracket of up to ${Math.round(chosen.gap * 1000)} mm under it`);
  binding.push(`${Math.round(chosen.reach * 100)} % of its top within a hand's reach`);
  if (near.length) binding.push(`${Math.round(chosen.near * 1000)} mm from what it is wired to`);
  const reason = `${at.part.name}: of ${spots.length} places it fits standing on something (${tried} tried), ${holds.length} hold; the cheapest: ${binding.join(', ')}`;
  const tree = replaceAt(root, at.path, { ...at.part, at: chosen.at, rot: [r0[0], r0[1] + chosen.yaw, r0[2]] });
  return { placed: { part: at.part.name, from, to: chosen.at, yaw: chosen.yaw, limit: lim, chosen, was, others, tried, fits: spots.length, holds: holds.length, rejected: fail, wasNot, reason, sources: [...new Set([...heat.sources, ...motion.sources, ...reach.sources, 'MAX_SERVICE (make/rules.ts)'])] }, tree };
}
export type { Field, Node };

/** A placement said in lines, shortest first: where it went and what bound it; then where it was and why that did not do;
 *  the next best and what each gives up; how many places failed each test; where the figures come from. */
export function explainPlaced(p: Placed, depth: 'one line' | 'full' = 'full'): string[] {
  const mm = (v: V3) => `(${v.map((x) => Math.round(x * 1000)).join(', ')}) mm`, spot = (s: Spot) => `${Math.round(s.heat)} °C, ${Math.round(s.reach * 100)} % of its top in reach, ${Math.round(s.near * 1000)} mm from what it is wired to, moved ${Math.round(s.moved * 1000)} mm`;
  const lines = [`${p.part} goes to ${mm(p.to)}${p.yaw ? ', turned a quarter' : ''}: ${spot(p.chosen)} (cost ${p.chosen.cost.toFixed(2)})`];
  if (depth === 'one line') return lines;
  lines.push(`why: ${p.reason}`);
  lines.push(p.was ? `where it was, ${mm(p.from)}: ${p.was.holds ? 'holds' : `does not hold (${p.was.why.join('; ')})`}, ${spot(p.was)} (cost ${p.was.cost.toFixed(2)})` : `where it was, ${mm(p.from)}, it does not fit: ${p.wasNot ?? 'it fails a test'}`);
  p.others.forEach((s, i) => lines.push(`next best ${i + 1}, ${mm(s.at)}: ${spot(s)} (cost ${s.cost.toFixed(2)}, ${(s.cost - p.chosen.cost).toFixed(2)} more)`));
  const r = p.rejected; lines.push(`of ${p.tried} places tried: ${r.solid} run into something, ${r.support} have nothing to stand on, ${r.roof} are not under the hood or the body, ${r.outside} leave the region; ${p.fits} fit, ${p.holds} hold`);
  lines.push(`from: ${p.sources.join('; ')}`);
  return lines;
}
