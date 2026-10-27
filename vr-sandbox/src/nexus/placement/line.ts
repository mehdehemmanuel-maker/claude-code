// Lines (docs/PLACEMENT.md, layer F: route, size.line). Cables, hoses, wires, pipes, brake lines, circuit traces and
// roads are one thing: a section swept along a path. The section is layers from the inside out (a core that is solid,
// copper or a cable's strands, or a bore that carries a fluid; then walls, insulation, jackets; or, flat, a trace's
// copper or a road's courses), each of a material; the path is found, not typed, by one search whose logics are costs:
// clear (the shortest through free, cool space), hug (along surfaces, where a harness is clipped), orthogonal (straight
// runs and square turns: pipes in a building, traces on a board), grade (on the ground, no steeper than it may climb:
// roads), bundle (with lines already run: a loom, a cable tray), direct (straight, to be checked). Every logic keeps out
// of solids, out of heat over its material's limit and out of what moves; each line is then made as parts, and sized by
// what it carries (a wire by its current and the volts it may drop, a bore by its flow).

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Part, V3 } from '../kits';
import { tubeLegs } from '../form';
import { layout, type Node } from '../make/space';
import { AMBIENT, MAX_SERVICE } from '../make/rules';
import { fieldOf, MOTION_READ, surfacesOf, type Field } from './fields';

export interface Layer { name: string; mat: string; /** thickness, m (the core: its radius, or its height if flat) */ t: number; /** the core: solid, or a bore (drawn hollow) */ bore?: boolean }
export type Logic = 'direct' | 'clear' | 'hug' | 'orthogonal' | 'grade' | 'bundle';
export interface Section {
  id: string; name: string; /** round (swept as tubes) or flat (a strip: a trace, a road) */ round: boolean; /** a flat one's width, m */ w?: number;
  /** from the inside out */ layers: Layer[];
  /** least bend radius: so many outside diameters, or (flat) metres */ bend: number;
  /** the gap it keeps to anything, m */ clear: number; /** how it is run where nothing says */ logic: Logic; /** the steepest it climbs (grade) */ grade?: number;
  item?: string; color: number; source: string;
}
export const outer = (s: Section) => s.layers.reduce((a, l) => a + l.t, 0);
const AWG = (n: number) => 0.000127 * 92 ** ((36 - n) / 39) / 2;
/** Sections by what they are: each figure from its standard where one says, else typical. */
export const SECTIONS: Section[] = [
  { id: 'wire-18', name: 'wire, 18 AWG', round: true, layers: [{ name: 'conductor', mat: 'copper', t: AWG(18) }, { name: 'insulation', mat: 'xlpe', t: 0.0004 }], bend: 6, clear: 0.003, logic: 'hug', item: 'wire', color: 0x2a6ad8, source: 'conductor by the AWG rule (ASTM B258: d = 0.127 mm × 92^((36 − n) / 39)); a thin cross-linked polyethylene wall, 0.4 mm, good to 125 °C (SAE J1128 TXL, typical of engine bays); bend 6 diameters (typical)' },
  { id: 'wire-12', name: 'wire, 12 AWG', round: true, layers: [{ name: 'conductor', mat: 'copper', t: AWG(12) }, { name: 'insulation', mat: 'xlpe', t: 0.0006 }], bend: 6, clear: 0.003, logic: 'hug', item: 'wire', color: 0xd83a2a, source: 'conductor by the AWG rule (ASTM B258); cross-linked polyethylene, 0.6 mm, good to 125 °C (SAE J1128 TXL); bend 6 diameters (typical)' },
  { id: 'cable-2', name: 'battery cable, 2 AWG', round: true, layers: [{ name: 'conductor', mat: 'copper', t: AWG(2) }, { name: 'jacket', mat: 'xlpe', t: 0.0015 }], bend: 6, clear: 0.005, logic: 'hug', item: 'battery-cable', color: 0x111111, source: 'conductor by the AWG rule (ASTM B258); cross-linked polyethylene jacket, 1.5 mm, good to 125 °C (SAE J1127 SGX, typical); bend 6 diameters (typical)' },
  { id: 'hose-32', name: 'coolant hose, 32 mm bore', round: true, layers: [{ name: 'bore', mat: 'glycol-50', t: 0.016, bore: true }, { name: 'wall', mat: 'epdm', t: 0.0045 }], bend: 1, clear: 0.01, logic: 'clear', item: 'coolant-hose', color: 0x1a1a1a, source: 'EPDM wall 4.5 mm (typical of SAE J20 R4 coolant hose); moulded to its shape, so its bends as tight as one outside diameter (an estimate)' },
  { id: 'fuel-8', name: 'fuel line, 8 mm', round: true, layers: [{ name: 'bore', mat: 'pe', t: 0.004, bore: true }, { name: 'wall', mat: 'nylon', t: 0.001 }], bend: 5, clear: 0.01, logic: 'hug', item: 'fuel-line', color: 0x303030, source: 'nylon wall 1 mm (typical of SAE J2260 tubing); bend 5 diameters (typical)' },
  { id: 'brake-3/16', name: 'brake line, 3/16 in', round: true, layers: [{ name: 'bore', mat: 'oil', t: 0.00168, bore: true }, { name: 'wall', mat: 'steel-low', t: 0.00071 }], bend: 2.5, clear: 0.006, logic: 'hug', item: 'brake-line', color: 0x8a8e94, source: '4.76 mm outside, 0.71 mm wall (SAE J527 double-wall tubing); bend 2.5 diameters (typical)' },
  { id: 'pipe-1in', name: 'pipe, 1 in schedule 40', round: true, layers: [{ name: 'bore', mat: 'water', t: 0.01332, bore: true }, { name: 'wall', mat: 'steel-low', t: 0.00338 }], bend: 1.5, clear: 0.02, logic: 'orthogonal', item: 'pipe', color: 0x6b7178, source: '33.4 mm outside, 3.38 mm wall (ASME B36.10M, NPS 1 schedule 40); a long-radius elbow, 1.5 diameters (ASME B16.9)' },
  { id: 'trace-1oz', name: 'trace, 0.25 mm, 1 oz copper', round: false, w: 0.00025, layers: [{ name: 'copper', mat: 'copper', t: 0.000035 }], bend: 0, clear: 0.00015, logic: 'orthogonal', item: 'trace', color: 0xc87533, source: '1 oz copper is 35 µm (IPC-2221); 0.15 mm spacing (typical of a board maker\'s standard)' },
  { id: 'road-2', name: 'road, two lanes', round: false, w: 7.2, layers: [{ name: 'base course', mat: 'granite', t: 0.2 }, { name: 'asphalt', mat: 'asphalt', t: 0.05 }], bend: 80, clear: 1, logic: 'grade', grade: 0.08, item: 'road', color: 0x34363a, source: 'two 3.6 m lanes (AASHTO, typical); 200 mm crushed stone under 50 mm of asphalt (typical); curves of 80 m at 50 km/h and grades to 8 % (typical of AASHTO for local roads)' },
];
export const sectionOf = (id: string): Section => { const s = SECTIONS.find((x) => x.id === id); if (!s) throw new Error(`no section "${id}" (there are ${SECTIONS.map((x) => x.id).join(', ')})`); return s; };
/** The least bend radius of a section, m. */
export const bendOf = (s: Section) => (s.round ? s.bend * 2 * outer(s) : s.bend);

export const LOGICS: Record<Logic, string> = {
  direct: 'straight from end to end, checked, not found',
  clear: 'the shortest through free, cool space: the least length, a little more for each turn',
  hug: 'along surfaces, where it can be clipped: a cell with nothing solid near costs more',
  orthogonal: 'straight runs and square turns only, each turn costing as much as a long run',
  grade: 'on the ground, never climbing or falling steeper than its grade; the gentler the better',
  bundle: 'with the lines already run, where it costs less: a loom, a tray',
};

export interface RouteOptions {
  logic?: Logic; section: Section;
  /** the ends' directions (out of what each end joins: the line leaves along them), and how far straight first, m */ fromDir?: V3; toDir?: V3; stub?: number;
  /** where to search (default: both ends' box grown by 0.3 m, or a tenth of their distance for a long one) and its cell */ region?: THREE.Box3; step?: number;
  /** lines already run, to follow (bundle) */ along?: V3[][];
  /** don't count heat (default: counted, against the outer layer's material) */ noHeat?: boolean;
}
export interface Route { pts: V3[]; length: number; bends: number; /** the tightest bend it makes, m, and the least it may */ tightest: number; least: number; hottest: number; limit: number; logic: Logic; cells: number; step: number; says: string }

// (a binary heap of cells by cost)
class Heap { k: number[] = []; v: number[] = []; push(c: number, f: number) { const k = this.k, v = this.v; k.push(c); v.push(f); let i = k.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (v[p]! <= v[i]!) break; [k[p], k[i]] = [k[i]!, k[p]!]; [v[p], v[i]] = [v[i]!, v[p]!]; i = p; } }
  pop(): number { const k = this.k, v = this.v, top = k[0]!, lk = k.pop()!, lv = v.pop()!; if (k.length) { k[0] = lk; v[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < k.length && v[l]! < v[m]!) m = l; if (r < k.length && v[r]! < v[m]!) m = r; if (m === i) break; [k[m], k[i]] = [k[i]!, k[m]!]; [v[m], v[i]] = [v[i]!, v[m]!]; i = m; } } return top; }
  get size() { return this.k.length; } }

/** A line's path from one end to the other through a thing (the line itself not in it), by a logic. A round line leaves
 *  each end straight for two of its bend radii, so its first turns can be as round as it may bend (a drawn bend takes at
 *  most half of each straight beside it); where that is too long to fit, one. */
export function route(root: Part, from: V3, to: V3, o: RouteOptions): Route {
  if (o.stub !== undefined || !o.section.round || (!o.fromDir && !o.toDir) || (o.logic ?? o.section.logic) === 'direct') return routeOnce(root, from, to, o);
  const b = bendOf(o.section); let last: Route | null = null, err: unknown = null;
  for (const stub of [2 * b, b]) { try { const r = routeOnce(root, from, to, { ...o, stub }); if (r.tightest >= r.least - 1e-6) return r; last ??= r; } catch (e) { err ??= e; } }
  if (last) return last; throw err;
}
function routeOnce(root: Part, from: V3, to: V3, o: RouteOptions): Route {
  const sec = o.section, logic = o.logic ?? sec.logic, R = sec.round ? outer(sec) : (sec.w ?? 0) / 2, A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
  const stub = o.stub ?? (sec.round ? Math.max(0.02, 2 * R, bendOf(sec)) : 0), a1 = o.fromDir ? A.clone().addScaledVector(new THREE.Vector3(...o.fromDir).normalize(), stub) : A.clone(), b1 = o.toDir ? B.clone().addScaledVector(new THREE.Vector3(...o.toDir).normalize(), stub) : B.clone();
  const outerMat = sec.layers[sec.layers.length - 1]!.mat, limit = o.noHeat ? Infinity : MAX_SERVICE[outerMat] ?? Infinity, least = bendOf(sec);
  const finish = (pts: V3[], cells: number, step: number, hottest: number): Route => {
    const legs = sec.round ? tubeLegs({ r: R, pts, bend: least }) : [], arcs = legs.filter((l) => l.kind === 'arc');
    const tightest = arcs.length ? Math.min(...arcs.map((l) => { const u = new THREE.Vector3(...l.a).sub(new THREE.Vector3(...l.c!)), v = new THREE.Vector3(...l.b).sub(new THREE.Vector3(...l.c!)), turn = Math.PI - u.angleTo(v); return turn > 1e-3 ? l.len / turn : Infinity; })) : Infinity;
    let length = 0; for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]);
    const bends = Math.max(0, pts.length - 2), tight = tightest < least - 1e-6;
    return { pts, length, bends, tightest, least, hottest, limit, logic, cells, step, says: `${sec.name}, ${logic}: ${Math.round(length * 1000)} mm, ${bends} bend${bends === 1 ? '' : 's'}${tight ? `, the tightest ${Math.round(tightest * 1000)} mm, under the ${Math.round(least * 1000)} mm it may` : ''}${Number.isFinite(limit) ? `, at most ${Math.round(hottest)} °C (its ${outerMat} stands ${limit} °C)` : ''}` };
  };
  if (logic === 'direct') return finish([from, ...(o.fromDir ? [a1.toArray() as V3] : []), ...(o.toDir ? [b1.toArray() as V3] : []), to], 0, 0, AMBIENT);
  const nodes = layout(root), span = A.distanceTo(B), region = o.region?.clone() ?? new THREE.Box3().setFromPoints([A, B, a1, b1]).expandByScalar(Math.max(0.3, span * (logic === 'grade' ? 1 : 0.1)));
  // (a road may go far round: its region as wide as the way is long, and as high as all that is there)
  if (logic === 'grade' && !o.region) for (const n of nodes) if (n.box && n.box.max.x > region.min.x && n.box.min.x < region.max.x && n.box.max.z > region.min.z && n.box.min.z < region.max.z) { region.min.y = Math.min(region.min.y, n.box.min.y); region.max.y = Math.max(region.max.y, n.box.max.y); }
  const step0 = o.step ?? Math.max(0.0005, Math.min(0.02, span / 40));
  if (logic === 'grade') return grade(nodes, region, a1, b1, from, to, sec, step0, finish);
  const heat = fieldOf(root, 'heat', { region, nodes, step: step0, most: 400_000 }), motion = fieldOf(root, 'motion', { region, nodes, step: step0, most: 400_000 }), step = heat.step, D = heat.dims;
  const I = (i: number, j: number, k: number) => i + D[0] * (j + D[1] * k), N = D[0] * D[1] * D[2], cellOf = (p: THREE.Vector3): [number, number, number] => [0, 1, 2].map((a) => Math.max(0, Math.min(D[a]! - 1, Math.floor((p.getComponent(a) - heat.min[a]!) / step)))) as [number, number, number];
  const mid = (i: number, j: number, k: number) => new THREE.Vector3(heat.min[0] + (i + 0.5) * step, heat.min[1] + (j + 0.5) * step, heat.min[2] + (k + 0.5) * step);
  // (blocked: within its radius and gap of anything solid, or of a cell hotter than its outer layer stands, or of the room
  // a moving part needs; near its two ends, only what is solid itself or too hot, so it can leave what it joins (which
  // may be what moves: a hose on the engine rocks with it))
  const blocked = new Uint8Array(N), hard = new Uint8Array(N), keep = R + sec.clear, rc = Math.ceil(keep / step), rh = Math.ceil(R / step);
  for (let c = 0; c < N; c++) if (heat.solid[c] || (!o.noHeat && heat.values[c]! > limit) || motion.values[c]! < Math.min(R, MOTION_READ * 0.999)) hard[c] = 1;
  // (the motion map reads room only so far: a line thicker than that is kept off what moves by as much as it reads, not
  // blocked everywhere)
  for (let k = 0; k < D[2]; k++) for (let j = 0; j < D[1]; j++) for (let i = 0; i < D[0]; i++) {
    const c = I(i, j, k); if (!hard[c]) continue; const solid = heat.solid[c], r = solid ? rc : rh;
    for (let dk = -r; dk <= r; dk++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const x = i + di, y = j + dj, z = k + dk; if (x < 0 || y < 0 || z < 0 || x >= D[0] || y >= D[1] || z >= D[2]) continue; if ((di * di + dj * dj + dk * dk) * step * step <= (r * step) ** 2 + 1e-12) blocked[I(x, y, z)] = 1; }
  }
  const s0 = cellOf(a1), g0 = cellOf(b1), free = (c: number) => !blocked[c];
  // (an end in heat over what it stands, or in a solid, is said, not routed round)
  for (const [nm, e] of [['start', a1], ['end', b1]] as [string, THREE.Vector3][]) { const c = I(...cellOf(e)); if (!o.noHeat && heat.values[c]! > limit) throw new Error(`the ${sec.name}'s ${nm} (${e.toArray().map((v) => Math.round(v * 1000)).join(', ')} mm) is about ${Math.round(heat.values[c]!)} °C, over the ${limit} °C its ${outerMat} stands: move what it joins, or pick a jacket that stands it`); }
  for (const [e, ex] of [[s0, a1], [g0, b1]] as [[number, number, number], THREE.Vector3][]) { void ex; const r = rc + 1; for (let dk = -r; dk <= r; dk++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const x = e[0] + di, y = e[1] + dj, z = e[2] + dk; if (x < 0 || y < 0 || z < 0 || x >= D[0] || y >= D[1] || z >= D[2]) continue; const c = I(x, y, z); if (!heat.solid[c] && (o.noHeat || heat.values[c]! <= limit)) blocked[c] = 0; } }
  // (what a step costs, by the logic: its length; a turn; for hug, open space; for bundle, less along lines already run;
  // and always a little for heat, so of two clear ways the cooler)
  const near = new Uint8Array(N); if (logic === 'hug') { const r = Math.max(1, Math.ceil((keep + step) / step)); for (let k = 0; k < D[2]; k++) for (let j = 0; j < D[1]; j++) for (let i = 0; i < D[0]; i++) { if (!heat.solid[I(i, j, k)]) continue; for (let dk = -r - 1; dk <= r + 1; dk++) for (let dj = -r - 1; dj <= r + 1; dj++) for (let di = -r - 1; di <= r + 1; di++) { const x = i + di, y = j + dj, z = k + dk; if (x >= 0 && y >= 0 && z >= 0 && x < D[0] && y < D[1] && z < D[2]) near[I(x, y, z)] = 1; } } }
  const shared = new Uint8Array(N); for (const l of o.along ?? []) for (let s = 1; s < l.length; s++) { const p = new THREE.Vector3(...l[s - 1]!), q = new THREE.Vector3(...l[s]!), n = Math.ceil(p.distanceTo(q) / (step / 2)); for (let t = 0; t <= n; t++) { const [i, j, k] = cellOf(p.clone().lerp(q, t / n)); for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj, z = k + dk; if (x >= 0 && y >= 0 && z >= 0 && x < D[0] && y < D[1] && z < D[2]) shared[I(x, y, z)] = 1; } } }
  const moves: [number, number, number][] = []; for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const n = Math.abs(di) + Math.abs(dj) + Math.abs(dk); if (n && (logic !== 'orthogonal' || n === 1)) moves.push([di, dj, dk]); }
  const turn = logic === 'orthogonal' ? Math.max(8 * step, least) : Math.max(0.3 * step, least / 2), heatW = Number.isFinite(limit) ? 1 / Math.max(1, limit - AMBIENT) : 0;
  const S = I(...s0), G = I(...g0), g = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), dirOf = new Int8Array(N).fill(-1), heap = new Heap(), h = (c: number) => { const i = c % D[0], j = Math.floor(c / D[0]) % D[1], k = Math.floor(c / (D[0] * D[1])); return Math.hypot(i - g0[0], j - g0[1], k - g0[2]) * step * (logic === 'bundle' ? 0.4 : 1); };
  g[S] = 0; heap.push(S, h(S)); let popped = 0;
  while (heap.size) {
    const c = heap.pop(); popped++; if (c === G) break; const i = c % D[0], j = Math.floor(c / D[0]) % D[1], k = Math.floor(c / (D[0] * D[1]));
    for (let m = 0; m < moves.length; m++) {
      const [di, dj, dk] = moves[m]!, x = i + di, y = j + dj, z = k + dk; if (x < 0 || y < 0 || z < 0 || x >= D[0] || y >= D[1] || z >= D[2]) continue; const n = I(x, y, z); if (!free(n)) continue;
      const len = Math.hypot(di, dj, dk) * step; let cost = len * (1 + heatW * Math.max(0, heat.values[n]! - AMBIENT));
      if (logic === 'hug' && !near[n]) cost += len * 1.5; if (logic === 'bundle' && shared[n]) cost *= 0.4; if (dirOf[c] >= 0 && dirOf[c] !== m) cost += turn;
      const ng = g[c]! + cost; if (ng < g[n]!) { g[n] = ng; came[n] = c; dirOf[n] = m; heap.push(n, ng + h(n)); }
    }
  }
  if (!Number.isFinite(g[G]!)) throw new Error(`no ${logic} way for the ${sec.name} from (${from.map((v) => Math.round(v * 1000)).join(', ')}) to (${to.map((v) => Math.round(v * 1000)).join(', ')}) mm: everything between is solid, too hot for its ${outerMat}, or in what moves (${popped} cells tried)`);
  const cells: number[] = []; for (let c = G; c >= 0; c = came[c]!) { cells.push(c); if (c === S) break; } cells.reverse();
  let pts = cells.map((c) => mid(c % D[0], Math.floor(c / D[0]) % D[1], Math.floor(c / (D[0] * D[1]))));
  // (straightened: a corner dropped where the line past it stays clear; square runs only merged where they go on straight)
  const clearLine = (p: THREE.Vector3, q: THREE.Vector3) => { const n = Math.max(1, Math.ceil(p.distanceTo(q) / (step / 3))); for (let t = 0; t <= n; t++) if (!free(I(...cellOf(p.clone().lerp(q, t / n))))) return false; return true; };
  // (its ends where they are, not at the middles of their cells: square runs, for orthogonal, from each to its cell)
  const square = (p: THREE.Vector3, q: THREE.Vector3): THREE.Vector3[] => { const out: THREE.Vector3[] = [], c = p.clone(); for (const ax of [1, 0, 2]) { if (Math.abs(q.getComponent(ax) - c.getComponent(ax)) > 1e-9) { c.setComponent(ax, q.getComponent(ax)); out.push(c.clone()); } } return out; };
  if (logic === 'orthogonal') { const m = pts, last = m[m.length - 1]!; pts = [a1.clone(), ...square(a1, m[0]!), ...m.slice(1)]; pts.push(...square(last, b1)); if (pts[pts.length - 1]!.distanceTo(b1) > 1e-9) pts.push(b1.clone()); }
  else { pts[0] = a1.clone(); pts[pts.length - 1] = b1.clone(); }
  // (a stretch's cost by the logic's own costs, so a shortcut is taken only where it costs little more (a twentieth) than the way it
  // replaces: a hugging line stays on its surfaces, a bundled one with its bundle)
  const segCost = (p: THREE.Vector3, q: THREE.Vector3) => { const n = Math.max(1, Math.ceil(p.distanceTo(q) / (step / 3))), ds = p.distanceTo(q) / n; let c0 = 0; for (let t = 0; t < n; t++) { const cc = I(...cellOf(p.clone().lerp(q, (t + 0.5) / n))); let w = 1 + heatW * Math.max(0, heat.values[cc]! - AMBIENT); if (logic === 'hug' && !near[cc]) w += 1.5; if (logic === 'bundle' && shared[cc]) w *= 0.4; c0 += w * ds; } return c0; };
  if (logic === 'orthogonal') pts = pts.filter((p, i) => i === 0 || i === pts.length - 1 || Math.abs(p.clone().sub(pts[i - 1]!).normalize().dot(pts[i + 1]!.clone().sub(p).normalize()) - 1) > 1e-6);
  else { const pre = [0]; for (let k = 1; k < pts.length; k++) pre.push(pre[k - 1]! + segCost(pts[k - 1]!, pts[k]!)); const out = [pts[0]!]; let i = 0; while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !(clearLine(pts[i]!, pts[j]!) && segCost(pts[i]!, pts[j]!) <= 1.05 * (pre[j]! - pre[i]!) + 1e-9)) j--; out.push(pts[j]!); i = j; } pts = out; }
  // (as round as it may bend: a drawn corner is rounded on at most half of each straight beside it, so where a corner is
  // tighter than its bend radius, it is dropped if the line past it is clear, or it and the next are made one where
  // their straights meet; until none is tighter or none can be changed)
  // (then eased, for a line that may bend only so tight: points laid every half a bend radius along it, each pulled
  // toward the middle of its neighbours as far as it stays clear and costs little more, so its turns spread out; then those
  // that turn it hardly at all dropped)
  if (logic !== 'orthogonal' && least > 0) {
    const gap = Math.max(step, least / 2), dense: THREE.Vector3[] = [pts[0]!];
    for (let k = 1; k < pts.length; k++) { const p0 = pts[k - 1]!, p1 = pts[k]!, n = Math.max(1, Math.round(p0.distanceTo(p1) / gap)); for (let t = 1; t <= n; t++) dense.push(p0.clone().lerp(p1, t / n)); }
    for (let it = 0; it < 60; it++) { let moved = 0; for (let k = 1; k < dense.length - 1; k++) { const p = dense[k]!, mid = dense[k - 1]!.clone().add(dense[k + 1]!).multiplyScalar(0.5), q = p.clone().lerp(mid, 0.5); if (q.distanceTo(p) < 1e-5) continue; if (clearLine(dense[k - 1]!, q) && clearLine(q, dense[k + 1]!) && segCost(dense[k - 1]!, q) + segCost(q, dense[k + 1]!) <= 1.05 * (segCost(dense[k - 1]!, p) + segCost(p, dense[k + 1]!)) + 1e-9) { dense[k] = q; moved++; } } if (!moved) break; }
    pts = dense.filter((p, k) => k === 0 || k === dense.length - 1 || p.clone().sub(dense[k - 1]!).angleTo(dense[k + 1]!.clone().sub(p)) > 0.035);
  }
  if (logic !== 'orthogonal' && least > 0) {
    const radiusAt = (q: THREE.Vector3[], i: number) => { const u = q[i - 1]!.clone().sub(q[i]!), v = q[i + 1]!.clone().sub(q[i]!), th = Math.PI - u.angleTo(v); if (th < 1e-3) return Infinity; const t = Math.tan(th / 2), cut = Math.min(least * t, u.length() * (i === 1 ? 0.9 : 0.5), v.length() * (i === q.length - 2 ? 0.9 : 0.5)); return cut / t; };
    const withEnds = () => [A, a1, ...pts.slice(1, -1), b1, B];
    for (let round = 0; round < 50; round++) {
      const q = withEnds(); let worst = -1, wr = least - 1e-6; for (let i = 1; i < q.length - 1; i++) { const r = radiusAt(q, i); if (r < wr) { wr = r; worst = i; } }
      if (worst < 0 || pts.length < 3) break;
      // (its index in pts; a corner where an end straight meets the route is eased from the corner next to it: the ends are kept)
      const k = Math.max(1, Math.min(pts.length - 2, worst - 1));
      let done = false;
      // (no change that costs more than a twentieth more by the logic's costs: a hugging line still hugs)
      if (clearLine(pts[k - 1]!, pts[k + 1]!) && segCost(pts[k - 1]!, pts[k + 1]!) <= 1.05 * (segCost(pts[k - 1]!, pts[k]!) + segCost(pts[k]!, pts[k + 1]!))) { pts.splice(k, 1); done = true; }
      else for (const [i0, i1] of [[k, k + 1], [k - 1, k]] as [number, number][]) {
        if (i0 < 1 || i1 > pts.length - 2) continue; const p0 = pts[i0 - 1]!, d0 = pts[i0]!.clone().sub(p0), p1 = pts[i1 + 1]!, d1 = pts[i1]!.clone().sub(p1);
        // (where the straight into i0 and the one out of i1 come nearest)
        const w = p0.clone().sub(p1), a = d0.dot(d0), bb = d0.dot(d1), c = d1.dot(d1), dd = d0.dot(w), e = d1.dot(w), den = a * c - bb * bb; if (Math.abs(den) < 1e-12) continue;
        const s0 = (bb * e - c * dd) / den, s1 = (a * e - bb * dd) / den; if (s0 < 0.5 || s1 < 0.5) continue;
        const m = p0.clone().addScaledVector(d0, s0).add(p1.clone().addScaledVector(d1, s1)).multiplyScalar(0.5);
        if (clearLine(p0, m) && clearLine(m, p1) && segCost(p0, m) + segCost(m, p1) <= 1.05 * (segCost(p0, pts[i0]!) + segCost(pts[i0]!, pts[i1]!) + segCost(pts[i1]!, p1))) { pts.splice(i0, 2, m); done = true; break; }
      }
      if (!done) break;
    }
  }
  const all = [A, ...(o.fromDir ? [a1] : []), ...pts.slice(o.fromDir ? 1 : 0, o.toDir ? -1 : undefined), ...(o.toDir ? [b1] : []), B].filter((p, i, arr) => i === 0 || p.distanceTo(arr[i - 1]!) > 1e-6);
  let hottest = AMBIENT; for (let s = 1; s < all.length; s++) { const n = Math.ceil(all[s - 1]!.distanceTo(all[s]!) / (step / 2)); for (let t = 0; t <= n; t++) hottest = Math.max(hottest, heat.values[I(...cellOf(all[s - 1]!.clone().lerp(all[s]!, t / n)))]!); }
  return finish(all.map((p) => p.toArray() as V3), popped, step, hottest);
}

// (on the ground: each column's height from the surfaces under it, moves between neighbouring columns allowed no steeper
// than its grade, the steeper the dearer)
// (on the ground: each column's height from the surfaces under it; between neighbouring columns a move no steeper than
// its grade costs its length, a little more the steeper; a steeper one is earthwork, cutting into the ground or building it
// up, and costs as much as the earth it moves. Then straightened and eased where that moves no more earth, its corners
// rounded to its curve radius, and its height fitted to the ground within its grade: what is cut and filled is said)
function grade(nodes: Node[], region: THREE.Box3, a1: THREE.Vector3, b1: THREE.Vector3, from: V3, to: V3, sec: Section, step0: number, finish: (pts: V3[], cells: number, step: number, hottest: number) => Route): Route {
  const geo = surfacesOf(nodes.filter((n) => n.box && n.box.intersectsBox(region))); if (!geo) throw new Error('nothing to lay it on');
  const bvh = new MeshBVH(geo), size = region.getSize(new THREE.Vector3()); let step = Math.max(step0, sec.w ? sec.w / 2 : step0); while ((size.x / step) * (size.z / step) > 60_000) step *= 1.25;
  const nx = Math.max(2, Math.ceil(size.x / step)), nz = Math.max(2, Math.ceil(size.z / step)), H = new Float64Array(nx * nz).fill(NaN), ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { ray.origin.set(region.min.x + (i + 0.5) * step, region.max.y + 1, region.min.z + (k + 0.5) * step); const hit = bvh.raycastFirst(ray, THREE.DoubleSide); if (hit) H[i + nx * k] = hit.point.y; }
  const col = (p: THREE.Vector3): [number, number] => [Math.max(0, Math.min(nx - 1, Math.floor((p.x - region.min.x) / step))), Math.max(0, Math.min(nz - 1, Math.floor((p.z - region.min.z) / step)))];
  const gmax = sec.grade ?? 0.08, W = sec.w ?? step, [si, sk] = col(a1), [gi, gk] = col(b1), S = si + nx * sk, G = gi + nx * gk, g = new Float64Array(nx * nz).fill(Infinity), came = new Int32Array(nx * nz).fill(-1), heap = new Heap();
  // (earth moved over a run steeper than its grade, m³ a metre of road: half the excess rise over the run, its width wide;
  // a cubic metre of earth moved weighed as this many metres of road (an estimate: what a detour is worth against a cutting))
  const EARTH = 0.5;
  g[S] = 0; heap.push(S, 0); let popped = 0;
  while (heap.size) {
    const c = heap.pop(); popped++; if (c === G) break; const i = c % nx, k = Math.floor(c / nx);
    for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) { if (!di && !dk) continue; const x = i + di, z = k + dk; if (x < 0 || z < 0 || x >= nx || z >= nz) continue; const n = x + nx * z; if (Number.isNaN(H[n]!)) continue;
      const run = Math.hypot(di, dk) * step, rise = Math.abs(H[n]! - H[c]!), s = rise / run, over = Math.max(0, rise - gmax * run);
      const ng = g[c]! + run * (1 + 2 * Math.min(1, s / gmax) ** 2) + EARTH * (over / 2) * W * run; if (ng < g[n]!) { g[n] = ng; came[n] = c; heap.push(n, ng + Math.hypot(x - gi, z - gk) * step); } }
  }
  if (!Number.isFinite(g[G]!)) throw new Error(`no ground for the ${sec.name} between its ends (${popped} cells tried)`);
  const cs: number[] = []; for (let c = G; c >= 0; c = came[c]!) { cs.push(c); if (c === S) break; } cs.reverse();
  // (the ground's height anywhere, between the columns' middles)
  const at = (x: number, z: number): number => { const fx = (x - region.min.x) / step - 0.5, fz = (z - region.min.z) / step - 0.5, i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), k = Math.max(0, Math.min(nz - 2, Math.floor(fz))), u = Math.max(0, Math.min(1, fx - i)), w = Math.max(0, Math.min(1, fz - k)), h = (a: number, b: number) => H[a + nx * b]!;
    let sum = 0, wt = 0; for (const [a, b, f] of [[i, k, (1 - u) * (1 - w)], [i + 1, k, u * (1 - w)], [i, k + 1, (1 - u) * w], [i + 1, k + 1, u * w]] as [number, number, number][]) { const y = h(a, b); if (!Number.isNaN(y) && f > 0) { sum += f * y; wt += f; } }
    return wt > 1e-9 ? sum / wt : NaN; };
  // (what a straight run in plan costs by the same measure: its length, and the earth where the ground under it is steeper
  // than its grade; Infinity off the ground)
  const runCost = (p: [number, number], q: [number, number]) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / (step / 2))), d = L / n; let y0 = at(p[0], p[1]), c0 = 0; if (Number.isNaN(y0)) return Infinity;
    for (let t = 1; t <= n; t++) { const y1 = at(p[0] + ((q[0] - p[0]) * t) / n, p[1] + ((q[1] - p[1]) * t) / n); if (Number.isNaN(y1)) return Infinity; const rise = Math.abs(y1 - y0); c0 += d * (1 + 2 * Math.min(1, rise / d / gmax) ** 2) + EARTH * (Math.max(0, rise - gmax * d) / 2) * W * d; y0 = y1; } return c0; };
  let xz: [number, number][] = cs.map((c) => [region.min.x + ((c % nx) + 0.5) * step, region.min.z + (Math.floor(c / nx) + 0.5) * step]);
  xz[0] = [a1.x, a1.z]; xz[xz.length - 1] = [b1.x, b1.z];
  // (straightened where it costs no more; eased, points every quarter of its curve radius each pulled to its neighbours'
  // middle where that costs no more)
  { const pre = [0]; for (let k = 1; k < xz.length; k++) pre.push(pre[k - 1]! + runCost(xz[k - 1]!, xz[k]!)); const out = [xz[0]!]; let i = 0; while (i < xz.length - 1) { let j = xz.length - 1; while (j > i + 1 && !(runCost(xz[i]!, xz[j]!) <= pre[j]! - pre[i]! + 1e-9)) j--; out.push(xz[j]!); i = j; } xz = out; }
  { const gap = Math.max(step, sec.bend / 4), dense: [number, number][] = [xz[0]!]; for (let k = 1; k < xz.length; k++) { const n = Math.max(1, Math.round(Math.hypot(xz[k]![0] - xz[k - 1]![0], xz[k]![1] - xz[k - 1]![1]) / gap)); for (let t = 1; t <= n; t++) dense.push([xz[k - 1]![0] + ((xz[k]![0] - xz[k - 1]![0]) * t) / n, xz[k - 1]![1] + ((xz[k]![1] - xz[k - 1]![1]) * t) / n]); }
    for (let it = 0; it < 80; it++) { let moved = 0; for (let k = 1; k < dense.length - 1; k++) { const p = dense[k]!, q: [number, number] = [(p[0] + (dense[k - 1]![0] + dense[k + 1]![0]) / 2) / 2, (p[1] + (dense[k - 1]![1] + dense[k + 1]![1]) / 2) / 2]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-4) continue; if (runCost(dense[k - 1]!, q) + runCost(q, dense[k + 1]!) <= 1.02 * (runCost(dense[k - 1]!, p) + runCost(p, dense[k + 1]!)) + 1e-9) { dense[k] = q; moved++; } } if (!moved) break; }
    // (points that turn it hardly at all dropped, so what is left are its true corners)
    xz = dense.filter((p, k) => k === 0 || k === dense.length - 1 || Math.abs(Math.atan2(dense[k + 1]![1] - p[1], dense[k + 1]![0] - p[0]) - Math.atan2(p[1] - dense[k - 1]![1], p[0] - dense[k - 1]![0])) % (2 * Math.PI) > 0.01); }
  // (each corner rounded: an arc of its curve radius where both straights beside it allow, else as round as they do)
  const R = sec.bend; let tightest = Infinity; const plan: [number, number][] = [xz[0]!];
  for (let k = 1; k < xz.length - 1; k++) {
    const p = xz[k]!, a = xz[k - 1]!, b = xz[k + 1]!, u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]], lu = Math.hypot(u[0]!, u[1]!), lv = Math.hypot(v[0]!, v[1]!);
    const th = Math.PI - Math.acos(Math.max(-1, Math.min(1, (u[0]! * v[0]! + u[1]! * v[1]!) / (lu * lv)))); if (th < 1e-3) { plan.push(p); continue; }
    const t = Math.tan(th / 2), cut = Math.min(R * t, lu * (k === 1 ? 0.9 : 0.5), lv * (k === xz.length - 2 ? 0.9 : 0.5)), r = cut / t; tightest = Math.min(tightest, r);
    const s0: [number, number] = [p[0] + (u[0]! / lu) * cut, p[1] + (u[1]! / lu) * cut], s1: [number, number] = [p[0] + (v[0]! / lv) * cut, p[1] + (v[1]! / lv) * cut], n = Math.max(2, Math.ceil(th / 0.05));
    // (on the arc: quadratic Bézier through the corner, close to a circle for the turns a road takes)
    for (let q = 0; q <= n; q++) { const f = q / n; plan.push([(1 - f) ** 2 * s0[0] + 2 * (1 - f) * f * p[0] + f * f * s1[0], (1 - f) ** 2 * s0[1] + 2 * (1 - f) * f * p[1] + f * f * s1[1]]); }
  }
  plan.push(xz[xz.length - 1]!);
  // (laid along at least its width at a time, the ground's height under each point; then its height fitted within its grade
  // (from each end in turn, no rise between two points more than its grade allows): cut where it runs under the ground,
  // fill where over)
  const along: [number, number][] = [plan[0]!]; for (let k = 1; k < plan.length; k++) { const p = plan[k - 1]!, q = plan[k]!, n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / Math.max(step, W))); for (let t = 1; t <= n; t++) along.push([p[0] + ((q[0] - p[0]) * t) / n, p[1] + ((q[1] - p[1]) * t) / n]); }
  const ground = along.map(([x, z]) => at(x, z)), h = ground.slice(), d = along.map((p, k) => (k ? Math.hypot(p[0] - along[k - 1]![0], p[1] - along[k - 1]![1]) : 0));
  for (let k = 1; k < h.length; k++) h[k] = Math.min(Math.max(h[k]!, h[k - 1]! - gmax * d[k]!), h[k - 1]! + gmax * d[k]!);
  for (let k = h.length - 2; k >= 0; k--) h[k] = Math.min(Math.max(h[k]!, h[k + 1]! - gmax * d[k + 1]!), h[k + 1]! + gmax * d[k + 1]!);
  let cut = 0, fill = 0, deepest = 0, highest = 0; for (let k = 1; k < h.length; k++) { const e = ((h[k]! - ground[k]!) + (h[k - 1]! - ground[k - 1]!)) / 2; if (e < 0) cut += -e * W * d[k]!; else fill += e * W * d[k]!; deepest = Math.max(deepest, ground[k]! - h[k]!); highest = Math.max(highest, h[k]! - ground[k]!); }
  const th0 = outer(sec), out = along.map(([x, z], k) => [x, h[k]! + th0 / 2, z] as V3);
  void from; void to;
  const r = finish(out, popped, step, AMBIENT); r.tightest = tightest; r.least = R;
  const earth = cut + fill > 0.5 ? `; earthwork ${Math.round(cut)} m³ cut (to ${deepest.toFixed(1)} m deep), ${Math.round(fill)} m³ filled (to ${highest.toFixed(1)} m high)` : '; on the ground as it lies';
  r.says += `${tightest < R - 1e-6 ? `, its tightest curve ${Math.round(tightest)} m, under the ${Math.round(R)} m it should` : `, every curve at least ${Math.round(R)} m`}${earth}`;
  return r;
}

/** A line made as parts: round, each layer a tube round the one in it (a bore left hollow); flat, each layer a strip on
 *  the one under it, a box along each run. */
export function makeLine(sec: Section, pts: V3[], name = sec.name, more: Partial<Part> = {}): Part {
  const bend = bendOf(sec);
  if (sec.round) {
    let r = 0; const parts: Part[] = [];
    for (const l of sec.layers) { const r0 = r; r += l.t; if (l.bore) continue; parts.push({ name: l.name, shape: { tube: { r, pts, bend, ...(r0 > 0 ? { wall: l.t } : {}) } }, mat: l.mat, color: l === sec.layers[sec.layers.length - 1] ? sec.color : l.mat === 'copper' ? 0xb87333 : 0x888888 }); }
    return { name, item: sec.item, parts, says: `${sec.name}: ${sec.layers.map((l) => `${l.name} ${l.bore ? `${Math.round(l.t * 2000 * 10) / 10} mm bore` : `${l.mat} ${Math.round(l.t * 1e5) / 100} mm`}`).join(', ')} (${sec.source})`, ...more };
  }
  const parts: Part[] = []; let y = 0;
  for (const l of sec.layers) {
    // (each run lengthened at a joint by as much as the turn there opens its outer edge: half its width by the tangent of
    // half the turn, in plan)
    const turnAt = (k: number) => { if (k <= 0 || k >= pts.length - 1) return 0; const u = new THREE.Vector2(pts[k]![0] - pts[k - 1]![0], pts[k]![2] - pts[k - 1]![2]), v = new THREE.Vector2(pts[k + 1]![0] - pts[k]![0], pts[k + 1]![2] - pts[k]![2]); return u.lengthSq() && v.lengthSq() ? Math.acos(Math.max(-1, Math.min(1, u.dot(v) / (u.length() * v.length())))) : 0; };
    for (let s = 1; s < pts.length; s++) {
      const p = new THREE.Vector3(...pts[s - 1]!), q = new THREE.Vector3(...pts[s]!), d = q.clone().sub(p), len = d.length(); if (len < 1e-9) continue;
      const yaw = Math.atan2(-d.z, d.x), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)), half = (sec.w ?? 0) / 2, e0 = half * Math.tan(Math.min(1.2, turnAt(s - 1)) / 2), e1 = half * Math.tan(Math.min(1.2, turnAt(s)) / 2), m = p.clone().add(q).multiplyScalar(0.5).addScaledVector(d.clone().normalize(), (e1 - e0) / 2);
      parts.push({ name: `${l.name} ${s}`, shape: { box: [len + e0 + e1, l.t, sec.w ?? 0.001] }, at: [m.x, m.y - outer(sec) / 2 + y + l.t / 2, m.z], rot: [0, yaw, pitch], mat: l.mat, color: l === sec.layers[sec.layers.length - 1] ? sec.color : 0x77756f });
    }
    y += l.t;
  }
  return { name, item: sec.item, parts, says: `${sec.name}: ${sec.layers.map((l) => `${l.name} ${l.mat} ${Math.round(l.t * 1e5) / 100} mm`).join(' under ')} (${sec.source})`, ...more };
}

/** Copper's resistivity at 20 °C, Ω·m (IACS: 1.7241 × 10⁻⁸). */
export const RHO_CU = 1.7241e-8;
/** A wire by what it carries: the thinnest AWG whose drop over its length (out and back, unless the return is the
 *  chassis) is within what is allowed; a bore by its flow at a speed. */
export function sizeWire(amps: number, length: number, o: { volts?: number; drop?: number; chassisReturn?: boolean } = {}): { awg: number; area: number; dropV: number; allowed: number; says: string } {
  const V = o.volts ?? 12, allowed = (o.drop ?? 0.03) * V, run = length * (o.chassisReturn ? 1 : 2);
  for (let n = 30; n >= -3; n--) { const d = 2 * AWG(n), area = (Math.PI * d * d) / 4, dropV = (amps * RHO_CU * run) / area; if (dropV <= allowed) return { awg: n, area, dropV, allowed, says: `${amps} A over ${Math.round(length * 1000)} mm${o.chassisReturn ? ' (back through the chassis)' : ' and back'}: ${n > 0 ? n : `${1 - n}/0`} AWG (${(area * 1e6).toFixed(2)} mm²) drops ${dropV.toFixed(3)} V of the ${allowed.toFixed(2)} V allowed (${Math.round((o.drop ?? 0.03) * 100)} % of ${V} V, typical)` }; }
  throw new Error(`${amps} A over ${length} m: no wire up to 4/0 AWG keeps the drop under ${allowed.toFixed(2)} V`);
}
export function sizeBore(flow: number, speed: number): { bore: number; says: string } { const d = Math.sqrt((4 * flow) / (Math.PI * speed)); return { bore: d, says: `${(flow * 60000).toFixed(1)} L/min at ${speed} m/s: a ${(d * 1000).toFixed(1)} mm bore` }; }
export type { Field };

/** A line's end on what it joins, found, not typed: a port of that name if it has one (where it is and which way it
 *  faces), else the point of its box nearest the other end, leaving square out of that face; or, given as numbers, a
 *  point ("x y z", or "x z" on whatever is under it). */
export function endOn(root: Part, what: string, toward: THREE.Vector3 | null, port?: RegExp, nodes: Node[] = layout(root), /** leave a port square to it (a terminal clamped on a post: the cable leaves sideways), not along it */ square = false): { at: V3; dir?: V3; how: string } {
  const nums = what.trim().split(/[\s,]+/).map(Number);
  if (nums.length >= 2 && nums.every((x) => Number.isFinite(x))) {
    if (nums.length >= 3) return { at: [nums[0]!, nums[1]!, nums[2]!], how: 'the point given' };
    const geo = surfacesOf(nodes); let y = 0; if (geo) { const hit = new MeshBVH(geo).raycastFirst(new THREE.Ray(new THREE.Vector3(nums[0]!, 1e4, nums[1]!), new THREE.Vector3(0, -1, 0)), THREE.DoubleSide); if (hit) y = hit.point.y; }
    return { at: [nums[0]!, y, nums[1]!], how: 'on the ground under the point given' };
  }
  let re: RegExp; try { re = new RegExp(what, 'i'); } catch { throw new Error(`"${what}" is not a pattern`); }
  const n = nodes.find((x) => re.test(x.p.name)); if (!n) throw new Error(`nothing named like "${what}"`);
  if (port) for (let x of nodes.filter((y) => y === n || y.path.startsWith(n.path + '/'))) { void x; const p = x.p.ports?.find((q) => port.test(q.name)); if (!p) continue;
    const at = new THREE.Vector3(...p.at).applyMatrix4(x.m), n = new THREE.Vector3(...p.n).transformDirection(x.m);
    // (square to it: toward the other end, with the part along the port taken out)
    let dir = n; if (square) { const t = (toward ?? at.clone().add(new THREE.Vector3(1, 0, 0))).clone().sub(at); t.addScaledVector(n, -t.dot(n)); dir = t.lengthSq() > 1e-12 ? t.normalize() : new THREE.Vector3(1, 0, 0).addScaledVector(n, -n.x).normalize(); }
    return { at: at.toArray() as V3, dir: dir.toArray() as V3, how: `its ${p.name} (a port of the ${x.p.name}), leaving ${square ? 'square to it' : 'along it'}` }; }
  const box = n.sub ?? n.box; if (!box) throw new Error(`the ${n.p.name} has no size`);
  const c = box.getCenter(new THREE.Vector3()), t = toward ?? c.clone().add(new THREE.Vector3(0, 1, 0)), q = box.clampPoint(t, new THREE.Vector3());
  // (square out of the face nearest the other end)
  const h = box.getSize(new THREE.Vector3()).multiplyScalar(0.5), d = t.clone().sub(c), ax = [0, 1, 2].reduce((a, b) => (Math.abs(d.getComponent(b)) / Math.max(1e-9, h.getComponent(b)) > Math.abs(d.getComponent(a)) / Math.max(1e-9, h.getComponent(a)) ? b : a), 0), dir: V3 = [0, 0, 0]; dir[ax] = Math.sign(d.getComponent(ax)) || 1;
  q.setComponent(ax, ax === 0 ? (dir[0] > 0 ? box.max.x : box.min.x) : ax === 1 ? (dir[1] > 0 ? box.max.y : box.min.y) : dir[2] > 0 ? box.max.z : box.min.z);
  return { at: q.toArray() as V3, dir, how: `the face of the ${n.p.name} nearest the other end (no port says where)` };
}

/** A section changed where it is said: its core (hollow, or another material) and its size, its outer layer's material
 *  and thickness; the rest as it was. */
export function vary(sec: Section, o: { core?: string; coreSize?: number; outer?: string; wall?: number }): Section {
  const layers = sec.layers.map((l) => ({ ...l })), core = layers[0]!, out = layers[layers.length - 1]!;
  if (o.core && o.core !== 'as it is') { if (o.core === 'hollow') { core.bore = true; core.name = 'bore'; } else { core.bore = false; core.mat = o.core; core.name = 'core'; } }
  if (o.coreSize) core.t = sec.round ? o.coreSize / 2 : o.coreSize;
  if (o.outer && o.outer !== 'as it is') out.mat = o.outer;
  if (o.wall && out !== core) out.t = o.wall;
  const changed = o.core !== undefined && o.core !== 'as it is' || !!o.coreSize || (!!o.outer && o.outer !== 'as it is') || !!o.wall;
  return changed ? { ...sec, id: `${sec.id}*`, name: `${sec.name}, changed`, layers, source: `${sec.source}; changed: ${[o.core && o.core !== 'as it is' ? `core ${o.core}` : '', o.coreSize ? `core ${Math.round(o.coreSize * 1e4) / 10} mm` : '', o.outer && o.outer !== 'as it is' ? `outer ${o.outer}` : '', o.wall ? `outer ${Math.round(o.wall * 1e4) / 10} mm` : ''].filter(Boolean).join(', ')}` } : sec;
}
