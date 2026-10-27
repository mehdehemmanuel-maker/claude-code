// Fields: a map of one quantity over the space a thing's parts are in, on a grid of cells (docs/PLACEMENT.md, layer C).
// A cell inside a solid piece is marked solid; the field is read where things could go.
//
//   heat     °C in each cell: the rules' own model (make/rules.ts): each hot surface's excess over the bay's air falling
//            e times each HEAT_FALLOFF of distance, stopped by any solid piece between (glass lets it through), the
//            hottest that reaches the cell
//   motion   m of room in each cell from what moves: a wheel swept through its steer and bump, a belt or fan by its own
//            clearance, the engine rocking on its mounts (MOUNT_ROCK); negative inside what a moving part needs
//   reach    m of reach in each cell for a person leaning over the open bay from the front and the sides, within an
//            arm's reach, and only where a straight line up out of the bay is clear (a hand comes in from above)
//
// What is drawn: `show` gives the cells in a range, or a slice, as coloured boxes for the 3D view.

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Part, V3 } from '../kits';
import { layout, type Node, type OBB } from '../make/space';
import { AMBIENT, HEAT_FALLOFF } from '../make/rules';
import { leafGeometry } from '../view/kit3d';
import { MOTION_GAP, MOUNT_ROCK, regionOf } from './model';

export type FieldKind = 'heat' | 'motion' | 'reach';
export interface Field {
  kind: FieldKind | 'combined'; unit: string; says: string;
  /** the grid: its least corner, its cell, how many cells along x, y, z */ min: V3; step: number; dims: [number, number, number];
  /** a value per cell, x fastest then y then z */ values: Float32Array;
  /** 1 where the cell's middle is inside a solid piece */ solid: Uint8Array;
  /** where its figures come from */ sources: string[];
}
export interface FieldOptions {
  /** the region: the world box of everything named like this, grown by `grow` (default: the engine and 150 mm round it) */
  around?: RegExp; grow?: number;
  /** or the region itself, and the thing already laid out (so several maps share one grid and one layout) */ region?: THREE.Box3; nodes?: Node[];
  /** cell size, m (default 25 mm) */ step?: number;
  /** cap on cells (default 120,000): the step grows to keep under it */ most?: number;
}
/** Leaning over an open bay: an arm's comfortable reach, m (about 0.65 m forward, typical of adults: anthropometric
 *  tables), and the shoulders about 0.3 m in from and above the bay's edge, anywhere along it (an estimate of leaning in over a fender or the front). */
export const ARM = 0.65, LEAN = 0.3;
/** How far the motion map reads room, m: past it a cell is said to have this much (enough to judge a gap of MOTION_GAP). */
export const MOTION_READ = 0.06;

const idx = (f: { dims: [number, number, number] }, i: number, j: number, k: number) => i + f.dims[0] * (j + f.dims[1] * k);
export const cellAt = (f: Field, i: number, j: number, k: number): V3 => [f.min[0] + (i + 0.5) * f.step, f.min[1] + (j + 0.5) * f.step, f.min[2] + (k + 0.5) * f.step];

/** The grid of a region, its solid cells marked: those whose middles are inside a piece, and those a thin piece crosses. */
function gridOf(nodes: Node[], region: THREE.Box3, step0: number, most: number): { min: V3; step: number; dims: [number, number, number]; solid: Uint8Array; inside: Node[] } {
  const size = region.getSize(new THREE.Vector3());
  let step = step0; while ((size.x / step) * (size.y / step) * (size.z / step) > most) step *= 1.25;
  const dims: [number, number, number] = [Math.max(1, Math.ceil(size.x / step)), Math.max(1, Math.ceil(size.y / step)), Math.max(1, Math.ceil(size.z / step))], min: V3 = [region.min.x, region.min.y, region.min.z];
  const inside = nodes.filter((n) => n.box && n.box.intersectsBox(region)), solid = new Uint8Array(dims[0] * dims[1] * dims[2]);
  const pieces = inside.flatMap((n) => n.pieces);
  // (each piece marks the cells of its box that are inside it)
  const p = new THREE.Vector3(), d = new THREE.Vector3();
  for (const b of pieces) {
    // (a thin piece, a skin or a sheet thinner than a cell, marks every cell it crosses, so a 1 mm hood is a wall and not a
    // gap; a thicker one only the cells whose middles are inside it)
    const hc = Math.min(b.h[0], b.h[1], b.h[2]) < step / 2 ? step / 2 : 0;
    const r = hc + Math.abs(b.u[0].x) * b.h[0] + Math.abs(b.u[1].x) * b.h[1] + Math.abs(b.u[2].x) * b.h[2], ry = hc + Math.abs(b.u[0].y) * b.h[0] + Math.abs(b.u[1].y) * b.h[1] + Math.abs(b.u[2].y) * b.h[2], rz = hc + Math.abs(b.u[0].z) * b.h[0] + Math.abs(b.u[1].z) * b.h[1] + Math.abs(b.u[2].z) * b.h[2];
    const lo = [Math.floor((b.c.x - r - min[0]) / step), Math.floor((b.c.y - ry - min[1]) / step), Math.floor((b.c.z - rz - min[2]) / step)], hi = [Math.floor((b.c.x + r - min[0]) / step), Math.floor((b.c.y + ry - min[1]) / step), Math.floor((b.c.z + rz - min[2]) / step)];
    for (let k = Math.max(0, lo[2]!); k <= Math.min(dims[2] - 1, hi[2]!); k++) for (let j = Math.max(0, lo[1]!); j <= Math.min(dims[1] - 1, hi[1]!); j++) for (let i = Math.max(0, lo[0]!); i <= Math.min(dims[0] - 1, hi[0]!); i++) {
      p.set(min[0] + (i + 0.5) * step, min[1] + (j + 0.5) * step, min[2] + (k + 0.5) * step); d.copy(p).sub(b.c);
      if (Math.abs(d.dot(b.u[0])) <= b.h[0] + hc * (Math.abs(b.u[0].x) + Math.abs(b.u[0].y) + Math.abs(b.u[0].z)) && Math.abs(d.dot(b.u[1])) <= b.h[1] + hc * (Math.abs(b.u[1].x) + Math.abs(b.u[1].y) + Math.abs(b.u[1].z)) && Math.abs(d.dot(b.u[2])) <= b.h[2] + hc * (Math.abs(b.u[2].x) + Math.abs(b.u[2].y) + Math.abs(b.u[2].z))) solid[idx({ dims }, i, j, k)] = 1;
    }
  }
  return { min, step, dims, solid, inside };
}
/** The drawn surfaces of some nodes as one geometry, in the world (a winding by its envelope, as the rules test it). */
function surfacesOf(ns: Node[]): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  for (const n of ns) { if (!n.p.shape) continue; const g = leafGeometry(n.p.envelope ? { ...n.p, shape: n.p.envelope, cuts: undefined } : n.p); if (!g) continue; const h = (g.index ? g.toNonIndexed() : g.clone()); h.applyMatrix4(n.m); for (const k of Object.keys(h.attributes)) if (k !== 'position') h.deleteAttribute(k); parts.push(h); }
  if (!parts.length) return null;
  const n = parts.reduce((a, g) => a + g.getAttribute('position').count, 0), pos = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.getAttribute('position').array as Float32Array, o); o += g.getAttribute('position').count * 3; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return out;
}
const hotOf = (n: Node): number => { for (let x: Node | null = n; x; x = x.parent) if (x.p.hot) return x.p.hot; return 0; };

/** One field over a thing, in its region. */
export function fieldOf(root: Part, kind: FieldKind, o: FieldOptions = {}): Field {
  const nodes = o.nodes ?? layout(root), region = o.region?.clone() ?? regionOf(nodes, o.around ?? /^(petrol|diesel) engine/, o.grow ?? 0.15);
  if (!region) throw new Error(`nothing named like ${String(o.around ?? 'an engine')} to map round`);
  const g = gridOf(nodes, region, o.step ?? 0.025, o.most ?? 120_000), n = g.dims[0] * g.dims[1] * g.dims[2], values = new Float32Array(n);
  const f: Field = { kind, unit: kind === 'heat' ? '°C' : 'm', says: '', min: g.min, step: g.step, dims: g.dims, values, solid: g.solid, sources: [] };
  const P = new THREE.Vector3();
  if (kind === 'heat') {
    // (each temperature's hot surfaces as one tree; every solid surface near as the tree that blocks)
    const hot = new Map<number, Node[]>(); for (const x of g.inside) { const t = hotOf(x); if (t > AMBIENT && x.p.shape) (hot.get(t) ?? hot.set(t, []).get(t)!).push(x); }
    const blockG = surfacesOf(g.inside.filter((x) => x.p.shape && !/glass/.test(x.p.mat ?? ''))), block = blockG ? new MeshBVH(blockG) : null;
    const trees = [...hot].map(([t, ns]) => { const geo = surfacesOf(ns); return geo ? { t, bvh: new MeshBVH(geo), reach: HEAT_FALLOFF * Math.log((t - AMBIENT) / 0.5) } : null; }).filter((x): x is NonNullable<typeof x> => !!x);
    const hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 }, ray = new THREE.Ray();
    for (let k = 0; k < g.dims[2]; k++) for (let j = 0; j < g.dims[1]; j++) for (let i = 0; i < g.dims[0]; i++) {
      const c = idx(f, i, j, k); P.set(...cellAt(f, i, j, k)); let T = AMBIENT;
      for (const tr of trees) {
        const r = tr.bvh.closestPointToPoint(P, hit, 0, tr.reach); if (!r) continue;
        const Tc = AMBIENT + (tr.t - AMBIENT) * Math.exp(-r.distance / HEAT_FALLOFF); if (Tc <= T) continue;
        // (in the open between them it reaches the cell; behind anything solid it does not)
        if (block && r.distance > 1e-3) { ray.origin.copy(P); ray.direction.copy(r.point).sub(P).normalize(); const b = block.raycastFirst(ray, THREE.DoubleSide); if (b && b.distance < r.distance - 2e-3) continue; }
        T = Tc;
      }
      values[c] = T;
    }
    f.sources = ['make/rules.ts: HEAT_FALLOFF 40 mm (an estimate), AMBIENT 40 °C, shielding by solids', 'Part.hot on each hot surface'];
    f.says = `heat over ${trees.length} hot surface temperature${trees.length === 1 ? '' : 's'}`;
  } else if (kind === 'motion') {
    // (what moves, each with the room it needs: a wheel at each corner of its steer and bump (its box turned and raised),
    // a belt or fan's surfaces grown by its clearance, the engine's surfaces by how far it rocks; room read up to 60 mm)
    const CAP = MOTION_READ, wheels: { b: OBB; need: number }[] = [], byNeed = new Map<number, Node[]>();
    for (const x of nodes) {
      if (x.p.travel && x.sub) {
        const c = x.sub.getCenter(new THREE.Vector3()), h = x.sub.getSize(new THREE.Vector3()).multiplyScalar(0.5), st = x.p.travel.steer ?? 0, bu = x.p.travel.bump ?? 0;
        for (const a of st ? [-st, 0, st] : [0]) for (const dy of bu ? [-bu, 0, bu] : [0]) { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); wheels.push({ b: { c: c.clone().add(new THREE.Vector3(0, dy, 0)), u: [new THREE.Vector3(1, 0, 0).applyQuaternion(q), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1).applyQuaternion(q)], h: [h.x, h.y, h.z] }, need: MOTION_GAP }); }
      }
      if (x.p.clear && x.p.shape && x.box && x.box.intersectsBox(region.clone().expandByScalar(0.2))) (byNeed.get(x.p.clear) ?? byNeed.set(x.p.clear, []).get(x.p.clear)!).push(x);
    }
    const eng = nodes.find((x) => x.p.item === 'engine-ice');
    if (eng) { const ns: Node[] = []; const walk = (x: Node) => { if (x.p.shape && x.box && x.box.intersectsBox(region.clone().expandByScalar(0.1))) ns.push(x); x.kids.forEach(walk); }; walk(eng); byNeed.set(MOUNT_ROCK, [...(byNeed.get(MOUNT_ROCK) ?? []), ...ns]); }
    const trees = [...byNeed].map(([need, ns]) => { const geo = surfacesOf(ns); return geo ? { need, bvh: new MeshBVH(geo) } : null; }).filter((x): x is NonNullable<typeof x> => !!x);
    const d = new THREE.Vector3(), hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
    for (let k = 0; k < g.dims[2]; k++) for (let j = 0; j < g.dims[1]; j++) for (let i = 0; i < g.dims[0]; i++) {
      const c = idx(f, i, j, k); P.set(...cellAt(f, i, j, k)); let room = CAP;
      for (const m of wheels) { d.copy(P).sub(m.b.c); const ex = Math.max(0, Math.abs(d.dot(m.b.u[0])) - m.b.h[0]), ey = Math.max(0, Math.abs(d.dot(m.b.u[1])) - m.b.h[1]), ez = Math.max(0, Math.abs(d.dot(m.b.u[2])) - m.b.h[2]); room = Math.min(room, Math.hypot(ex, ey, ez) - m.need); }
      for (const t of trees) { const r = t.bvh.closestPointToPoint(P, hit, 0, room + t.need); if (r) room = Math.min(room, r.distance - t.need); }
      values[c] = room;
    }
    const movers = wheels.length + trees.length;
    f.sources = ['Part.travel (each wheel at its steer and bump)', 'Part.clear (belts, fans)', 'MOUNT_ROCK ±10 mm (an estimate) for the engine on its mounts', 'MOTION_GAP 10 mm (typical)'];
    f.says = `room from what moves: ${wheels.length / 9 || 0} wheels through their travel, ${trees.length} surfaces by the room each needs (read to ${CAP * 1000} mm)`; void movers;
  } else {
    // (a person leaning over the open bay from the front or from either side, standing anywhere along that edge: the
    // shoulders slide along a line set LEAN in from the edge and LEAN above it; a hand comes in from above, so a cell
    // counts only where the line straight up from it is clear of everything but the hood, which is open)
    // (the bay's edge is the hood's: its front and its two sides, as high as it is; without a hood, the region's)
    const hood = new THREE.Box3(); for (const x of nodes) if (x.box && /^hood$/i.test(x.p.name)) hood.union(x.box);
    const e = hood.isEmpty() ? region : hood, top = Math.max(region.max.y, e.max.y) + 0.4, y = e.max.y + LEAN, side = Math.max(Math.abs(e.min.z), Math.abs(e.max.z)) - LEAN, V = (x: number, z: number) => new THREE.Vector3(x, y, z);
    const shoulders = [new THREE.Line3(V(e.max.x - LEAN, -side), V(e.max.x - LEAN, side)), ...[-1, 1].map((sd) => new THREE.Line3(V(e.min.x, sd * side), V(e.max.x - LEAN, sd * side)))], Q = new THREE.Vector3();
    const openG = surfacesOf(g.inside.filter((x) => x.p.shape && !/^hood\b|bonnet/i.test(x.p.name) && !/^hood /i.test(x.parent?.p.name ?? ''))), open = openG ? new MeshBVH(openG) : null, ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    for (let k = 0; k < g.dims[2]; k++) for (let j = 0; j < g.dims[1]; j++) for (let i = 0; i < g.dims[0]; i++) {
      const c = idx(f, i, j, k); P.set(...cellAt(f, i, j, k)); let r = ARM - Math.min(...shoulders.map((sh) => sh.closestPointToPoint(P, true, Q).distanceTo(P)));
      if (open) { ray.origin.copy(P); const b = open.raycastFirst(ray, THREE.DoubleSide); if (b && b.distance < top - P.y) r = -1; }
      values[c] = r;
    }
    f.sources = ['ARM 0.65 m: anthropometric tables, typical of adults', 'LEAN 0.3 m in from and above the hood\'s edges (front and sides), standing anywhere along them, an estimate', 'a clear line straight up, the hood open'];
    f.says = 'reach from the front and the sides, the hood open';
  }
  return f;
}

export interface FieldStats { cells: number; open: number; min: number; max: number; mean: number }
/** Over the open cells (not inside a solid). */
export function statsOf(f: Field): FieldStats {
  let n = 0, s = 0, lo = Infinity, hi = -Infinity;
  for (let c = 0; c < f.values.length; c++) { if (f.solid[c]) continue; const v = f.values[c]!; n++; s += v; if (v < lo) lo = v; if (v > hi) hi = v; }
  return { cells: f.values.length, open: n, min: n ? lo : 0, max: n ? hi : 0, mean: n ? s / n : 0 };
}
/** The share of open cells where a test holds. */
export function shareWhere(f: Field, test: (v: number) => boolean): number { let n = 0, k = 0; for (let c = 0; c < f.values.length; c++) { if (f.solid[c]) continue; n++; if (test(f.values[c]!)) k++; } return n ? k / n : 0; }

/** Fields on one grid as one cost: each normalised to how bad it is (heat over a limit, room under a gap, reach short of
 *  an arm), weighted, summed. 0 is a good place; more is worse. */
export function combineFields(fs: Field[], w: number[] = fs.map(() => 1), limits: { heat?: number; gap?: number } = {}): Field {
  const a = fs[0]; if (!a) throw new Error('nothing to combine');
  for (const f of fs) if (f.dims.join() !== a.dims.join() || f.step !== a.step || f.min.join() !== a.min.join()) throw new Error('fields on different grids: map them over the same region and step');
  const values = new Float32Array(a.values.length), lim = limits.heat ?? 100, gap = limits.gap ?? 0.01;
  fs.forEach((f, q) => { for (let c = 0; c < values.length; c++) { const v = f.values[c]!, bad = f.kind === 'heat' ? Math.max(0, (v - lim) / Math.max(1, lim - AMBIENT)) : f.kind === 'motion' ? Math.max(0, (gap - v) / gap) : f.kind === 'reach' ? Math.max(0, -v / ARM) : v; values[c] = values[c]! + (w[q] ?? 1) * bad; } });
  return { kind: 'combined', unit: '', says: `${fs.map((f) => f.kind).join(' + ')}, weighted`, min: a.min, step: a.step, dims: a.dims, values, solid: a.solid, sources: fs.flatMap((f) => f.sources) };
}

// ---- drawn --------------------------------------------------------------------------------------------------------------
/** Colour of a value: blue (cool, roomy, reachable) to red (hot, tight, out of reach), in ten steps. */
const RAMP = [0x2b6cb0, 0x3182ce, 0x38a169, 0x68d391, 0xecc94b, 0xed8936, 0xdd6b20, 0xe53e3e, 0xc53030, 0x822727];
export function badness(f: Field, v: number): number {
  if (f.kind === 'heat') return Math.min(1, Math.max(0, (v - AMBIENT) / 260));
  if (f.kind === 'motion') return v < 0 ? 1 : Math.max(0, 1 - v / 0.05);
  // (out of reach or blocked from above: red; within reach, greener the more to spare, blue with 150 mm or more)
  if (f.kind === 'reach') return v < 0 ? 1 : Math.max(0, 0.5 * (1 - v / 0.15));
  // (a cost: blue only where it costs nothing; any cost yellow, rising to red)
  return v <= 1e-9 ? 0 : Math.min(1, 0.45 + v / 2);
}
export interface ShowOptions { /** only cells at least this bad, 0–1 (default 0.5) */ from?: number; to?: number; /** or a slice across one axis, at a share of the way along it */ slice?: { axis: 'x' | 'y' | 'z'; at: number } }
/** The cells to see as coloured boxes, open cells only: a part the 3D view draws (a picture of the field, not a thing). */
export function showField(f: Field, o: ShowOptions = {}): Part {
  const parts: Part[] = [], lo = o.from ?? 0.5, hi = o.to ?? 1, s = f.step * 0.82;
  const sl = o.slice ? { a: 'xyz'.indexOf(o.slice.axis), i: Math.min(f.dims['xyz'.indexOf(o.slice.axis)]! - 1, Math.max(0, Math.round(o.slice.at * (f.dims['xyz'.indexOf(o.slice.axis)]! - 1)))) } : null;
  for (let k = 0; k < f.dims[2]; k++) for (let j = 0; j < f.dims[1]; j++) for (let i = 0; i < f.dims[0]; i++) {
    const c = idx(f, i, j, k); if (f.solid[c]) continue;
    if (sl && [i, j, k][sl.a] !== sl.i) continue;
    const b = badness(f, f.values[c]!); if (!sl && (b < lo || b > hi)) continue;
    parts.push({ name: 'field cell', shape: { box: [s, s, s] }, at: cellAt(f, i, j, k), color: RAMP[Math.min(9, Math.floor(b * 10))]!, finish: 'matte' });
  }
  return { name: `${f.kind} field`, at: [0, 0, 0], parts, says: `${parts.length} cells of the ${f.kind} field, coloured blue (good) to red (bad); a picture, not a thing` };
}
