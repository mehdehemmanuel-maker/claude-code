// The contact graph of any thing (docs/REALITY.md, section 6, step B): every piece of it a node, every two pieces that
// touch an edge, with where they touch, which way, how hard they press and over what patch. Read from the geometry,
// nothing typed: the contacts are `contacts` and the patches `patchIn` (src/nexus/make/space.ts), the same the critic
// and the rules use. What flows through a thing (heat, current, force: steps C to F) is solved over this graph.
//
// A thing placed many times is worked out once: each distinct part or assembly keeps its own graph in its own frame, and
// an assembly's graph is its placements' graphs, placed, joined by the contacts between different placements (looked
// for only where two placements' bounds come within reach of each other). A city of one drone builds one drone's graph.

import * as THREE from 'three';
import { isAssembly, matrixOf, type Assembly } from './assembly';
import { contacts, layout, patchIn, type Node, type OBB } from './make/space';
import type { Part } from './kits';
import { matterOf } from './matter';
import { solveSparseSPD } from './numeric';

type V3 = [number, number, number];
/** A piece of the thing: a part with a shape, where it is. */
export interface GraphPiece { id: string; name: string; mat: string | null; node: Node }
/** Two pieces that touch: where (the middle of the patch they meet over), along which normal (from a to b), how far they press into each other (negative: a gap
 *  within the tolerance), and the area they meet over: the overlap of their covering boxes (its two largest sides), no
 *  more than either piece's own section across the normal where that is known (a box square to it, a cylinder's end:
 *  π r², not its box's square). */
export interface GraphEdge { a: number; b: number; at: V3; normal: V3; depth: number; area: number }
export interface Graph { pieces: GraphPiece[]; edges: GraphEdge[]; bounds: THREE.Box3; /** distinct things whose graph was worked out for it (the rest reused) */ worked: number }

const kept = new WeakMap<Part | Assembly, Graph>();

/** The graph of a thing, in its own frame. */
export function graphOf(t: Part | Assembly): Graph {
  const was = kept.get(t); if (was) return { ...was, worked: 0 };
  const g = isAssembly(t) ? assemblyGraph(t) : partGraph(t);
  kept.set(t, g); return g;
}

function edgeOf(c: { a: Node; b: Node; normal: THREE.Vector3; depth: number; mid: THREE.Vector3; pa: OBB; pb: OBB }, a: number, b: number): GraphEdge {
  // (the patch in a's own frame, so its sides are a's: the normal's side is the thin one)
  const p = patchIn(c.a, c.b, c.pb), s = p ? p.getSize(new THREE.Vector3()).toArray().sort((x, y) => y - x) : [0, 0, 0];
  const sc = new THREE.Vector3().setFromMatrixScale(c.a.m), k = Math.abs(sc.x * sc.y * sc.z) ** (2 / 3);
  // (where they meet: the middle of the patch, in the world; else halfway between the pieces that met)
  const at = p ? p.getCenter(new THREE.Vector3()).applyMatrix4(c.a.m) : c.mid;
  return { a, b, at: at.toArray() as V3, normal: c.normal.toArray() as V3, depth: c.depth, area: Math.min(s[0]! * s[1]! * k, sectionAcross(c.a, c.normal), sectionAcross(c.b, c.normal)) };
}
/** A piece's own section across a direction, where its shape says it: a box square to it, the end of a cylinder along
 *  it; else no limit. */
function sectionAcross(n: Node, d: THREE.Vector3): number {
  const s = n.p.shape, o = n.obb; if (!s || !o || n.pieces.length > 1) return Infinity;
  const along = o.u.map((u) => Math.abs(u.dot(d)));
  if ('box' in s) { const k = along.findIndex((x) => x > 0.999); if (k < 0) return Infinity; const h = o.h.filter((_, i) => i !== k); return 4 * h[0]! * h[1]!; }
  if ('cyl' in s && along[1]! > 0.999 && (s.cyl[2] === undefined || s.cyl[2] === s.cyl[0])) return Math.PI * o.h[0] * o.h[2];
  return Infinity;
}

function partGraph(p: Part): Graph {
  const nodes = layout(p, undefined, { sealedWhole: true }).filter((n) => n.obb), index = new Map(nodes.map((n, i) => [n, i]));
  const pieces = nodes.map((n) => ({ id: n.path || '/', name: n.p.name, mat: n.p.mat ?? null, node: n }));
  const edges = contacts(nodes).map((c) => edgeOf(c, index.get(c.a)!, index.get(c.b)!));
  const bounds = new THREE.Box3(); for (const n of nodes) bounds.union(n.box!);
  return { pieces, edges, bounds, worked: 1 };
}

/** A node moved by a placement: its frame, boxes and covering pieces. */
function moved(n: Node, M: THREE.Matrix4): Node {
  const mv = (o: OBB): OBB => { const c = o.c.clone().applyMatrix4(M), u = o.u.map((v) => v.clone().transformDirection(M)) as OBB['u'], s = new THREE.Vector3().setFromMatrixScale(M).x; return { c, u, h: o.h.map((h) => h * s) as OBB['h'] }; };
  return { ...n, m: M.clone().multiply(n.m), box: n.box ? n.box.clone().applyMatrix4(M) : null, obb: n.obb ? mv(n.obb) : null, pieces: n.pieces.map(mv), sub: n.sub ? n.sub.clone().applyMatrix4(M) : null, parent: null, kids: [] };
}

function assemblyGraph(t: Assembly): Graph {
  let worked = 0;
  const parts = t.items.map((it, k) => { const g0 = kept.get(it.of); const g = graphOf(it.of); if (!g0) worked += g.worked; return { g, M: matrixOf(it), k }; });
  const pieces: GraphPiece[] = [], edges: GraphEdge[] = [], start: number[] = [], boxes: THREE.Box3[] = [];
  for (const { g, M, k } of parts) {
    start.push(pieces.length);
    for (const p of g.pieces) pieces.push({ ...p, id: `${k}/${p.id}`, node: moved(p.node, M) });
    for (const e of g.edges) {
      const n = new THREE.Vector3(...e.normal).transformDirection(M), sc = new THREE.Vector3().setFromMatrixScale(M).x;
      edges.push({ a: e.a + start[k]!, b: e.b + start[k]!, at: new THREE.Vector3(...e.at).applyMatrix4(M).toArray() as V3, normal: n.toArray() as V3, depth: e.depth * sc, area: e.area * sc * sc });
    }
    boxes.push(g.bounds.clone().applyMatrix4(M));
  }
  // between placements: only where two placements' bounds come within reach, and only their pieces near each other
  const reach = 0.01;
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    if (boxes[i]!.isEmpty() || boxes[j]!.isEmpty() || !boxes[i]!.clone().expandByScalar(reach).intersectsBox(boxes[j]!)) continue;
    const near = (k: number, other: THREE.Box3) => { const out: number[] = [], grown = other.clone().expandByScalar(reach); for (let q = start[k]!; q < (start[k + 1] ?? pieces.length); q++) if (pieces[q]!.node.box!.intersectsBox(grown)) out.push(q); return out; };
    const A = near(i, boxes[j]!), B = near(j, boxes[i]!); if (!A.length || !B.length) continue;
    const of = new Map<Node, number>([...A, ...B].map((q) => [pieces[q]!.node, q])), side = new Set(A);
    for (const c of contacts([...of.keys()])) { const a = of.get(c.a)!, b = of.get(c.b)!; if (side.has(a) !== side.has(b)) edges.push(edgeOf(c, a, b)); }
  }
  const bounds = new THREE.Box3(); for (const b of boxes) bounds.union(b);
  return { pieces, edges, bounds, worked };
}

/** Each piece's neighbours, by index. */
export function neighbours(g: Graph): number[][] {
  const out = g.pieces.map(() => [] as number[]); for (const e of g.edges) { out[e.a]!.push(e.b); out[e.b]!.push(e.a); } return out;
}
/** The pieces in groups that touch each other, through any chain of contacts (what holds together as one). */
export function groupsOf(g: Graph): number[][] {
  const nb = neighbours(g), seen = new Set<number>(), out: number[][] = [];
  for (let i = 0; i < g.pieces.length; i++) { if (seen.has(i)) continue; const grp: number[] = [], st = [i]; seen.add(i); while (st.length) { const x = st.pop()!; grp.push(x); for (const y of nb[x]!) if (!seen.has(y)) { seen.add(y); st.push(y); } } out.push(grp); }
  return out;
}

/** Pieces chosen by what they are, never by typing a path: the highest or the lowest (within a millimetre of the top or
 *  the bottom of the thing), or those whose name or material says the words given. */
export function piecesBy(g: Graph, what: string): number[] {
  const w = what.trim().toLowerCase(), all = g.pieces.map((_, i) => i);
  if (/^(the )?highest/.test(w)) { const top = Math.max(...g.pieces.map((p) => p.node.box!.max.y)); return all.filter((i) => g.pieces[i]!.node.box!.max.y > top - 1e-3); }
  if (/^(the )?lowest/.test(w)) { const bot = Math.min(...g.pieces.map((p) => p.node.box!.min.y)); return all.filter((i) => g.pieces[i]!.node.box!.min.y < bot + 1e-3); }
  return all.filter((i) => g.pieces[i]!.name.toLowerCase().includes(w) || (g.pieces[i]!.mat ?? '').toLowerCase() === w);
}

export interface Flow {
  /** Between the two ends: their resistance (K/W or Ω) and what flows for a unit difference (W/K or A/V). */
  resistance: number | null; conductance: number;
  /** Each piece's level between the ends, 1 at the first and 0 at the second (null: not joined to either through
   *  pieces that carry it); and what goes through each contact, from a to b, for a unit difference. */
  level: (number | null)[]; through: number[];
  /** The worst balance at any piece between the ends (Kirchhoff: what comes in goes out), as a share of the flow. */
  imbalance: number; converged: boolean; steps: number;
  /** Pieces carrying none of it: their material's figure not known, or touching nothing that leads to the ends. */
  lacking: string[]; floating: number;
}

/**
 * What flows through a thing between two sets of its pieces (docs/REALITY.md, section 6, step C): heat by each
 * material's thermal conductivity, current by its electrical conductivity, over the contact graph. Each piece is held
 * at its middle (lumped); between two that touch, the way is half of each, from its middle to where they meet, through
 * the area they meet over (L / k A each), and the contact between them if a contact conductance is given (1 / h A), in
 * series. The network is solved at once (each piece's balance one row; conjugate gradients). A piece's own gradient is
 * left out (step G splits pieces where it matters), and so is any contact resistance not given: the result is the
 * least the way can resist.
 */
export function flowOver(g: Graph, kind: 'heat' | 'current', from: number[], to: number[], o: { contact?: number } = {}): Flow {
  const key = kind === 'heat' ? 'k' : 'conductivity', n = g.pieces.length, lacking: string[] = [];
  const kOf = new Map<string, number | null>(), prop = (m: string | null) => { if (!m) return null; if (!kOf.has(m)) kOf.set(m, matterOf(m).props.find((p) => p.key === key)?.value ?? null); return kOf.get(m)!; };
  const k = g.pieces.map((p) => prop(p.mat));
  const noK = g.pieces.filter((_, i) => k[i] === null || !(k[i]! > 0)); if (noK.length) lacking.push(`${noK.length} piece${noK.length > 1 ? 's' : ''} with no ${kind === 'heat' ? 'thermal' : 'electrical'} conductivity known, carrying none (${[...new Set(noK.map((p) => p.mat ?? 'no material'))].slice(0, 6).join(', ')})`);
  const mid = g.pieces.map((p) => p.node.box!.getCenter(new THREE.Vector3()));
  const G = g.edges.map((e) => {
    const ka = k[e.a], kb = k[e.b]; if (!ka || !kb || !(e.area > 0)) return 0;
    const at = new THREE.Vector3(...e.at), da = Math.max(mid[e.a]!.distanceTo(at), 1e-5), db = Math.max(mid[e.b]!.distanceTo(at), 1e-5);
    return 1 / (da / (ka * e.area) + db / (kb * e.area) + (o.contact ? 1 / (o.contact * e.area) : 0));
  });
  const end = new Map<number, number>(); for (const i of to) end.set(i, 0); for (const i of from) end.set(i, 1);
  // only pieces joined to an end through pieces that carry it
  const nb: [number, number][][] = g.pieces.map(() => []); g.edges.forEach((e, q) => { if (G[q]! > 0) { nb[e.a]!.push([e.b, q]); nb[e.b]!.push([e.a, q]); } });
  const seen = new Set<number>(end.keys()), st = [...end.keys()]; while (st.length) { const x = st.pop()!; for (const [y] of nb[x]!) if (!seen.has(y)) { seen.add(y); st.push(y); } }
  const free = [...seen].filter((i) => !end.has(i)), at = new Map(free.map((i, r) => [i, r])), entries: [number, number, number][] = [], b = new Array<number>(free.length).fill(0);
  for (const i of free) { const r = at.get(i)!; let d = 0; for (const [j, q] of nb[i]!) { d += G[q]!; const c = at.get(j); if (c !== undefined) entries.push([r, c, -G[q]!]); else b[r]! += G[q]! * end.get(j)!; } entries.push([r, r, d]); }
  const sol = free.length ? solveSparseSPD(free.length, entries, b) : { x: [], converged: true, steps: 0, residual: 0 };
  const level = g.pieces.map((_, i) => (end.has(i) ? end.get(i)! : at.has(i) ? sol.x[at.get(i)!]! : null));
  const through = g.edges.map((e, q) => (level[e.a] === null || level[e.b] === null ? 0 : G[q]! * (level[e.a]! - level[e.b]!)));
  let out = 0; g.edges.forEach((e, q) => { const fa = from.includes(e.a), fb = from.includes(e.b); if (fa && !fb) out += through[q]!; else if (fb && !fa) out -= through[q]!; });
  const net = new Array<number>(n).fill(0); g.edges.forEach((e, q) => { net[e.a]! -= through[q]!; net[e.b]! += through[q]!; });
  let worst = 0; for (const i of free) worst = Math.max(worst, Math.abs(net[i]!));
  const floating = n - seen.size;
  const scale = Math.max(out, ...through.map(Math.abs));
  return { resistance: out > 0 ? 1 / out : null, conductance: out, level, through, imbalance: scale > 0 ? worst / scale : 0, converged: sol.converged, steps: sol.steps, lacking, floating };
}
