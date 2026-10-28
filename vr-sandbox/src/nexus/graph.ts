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

type V3 = [number, number, number];
/** A piece of the thing: a part with a shape, where it is. */
export interface GraphPiece { id: string; name: string; mat: string | null; node: Node }
/** Two pieces that touch: where, along which normal (from a to b), how far they press into each other (negative: a gap
 *  within the tolerance), and the area they meet over (the overlap of their covering boxes, its two largest sides: exact
 *  for boxes face to face, the overlap of their boxes for round ones). */
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
  return { a, b, at: c.mid.toArray() as V3, normal: c.normal.toArray() as V3, depth: c.depth, area: s[0]! * s[1]! * k };
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
