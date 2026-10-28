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
import { heatLoss } from '../engineering/thermal';
import { apply } from './law';
import { lawById } from './book';
import { setting } from './lawgraph';
import { weakestOf, type EvidenceKind } from './evidence';
import type { Evidence } from './matter';

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
  /** The resistance's standard uncertainty (K/W or Ω) from what the materials are known only as (a family's span, taken
   *  as uniform over it: span / √12, the GUM's type B), and which materials gave it; null where none is known. */
  resistanceU: number | null; uncertainFrom: string[];
  /** The weakest evidence of any material figure it rests on, and the laws each half of each contact is worked by. */
  evidence: EvidenceKind; laws: string[];
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
type Known = { v: number; ev: Evidence; span?: [number, number] } | null;
/** Each contact's conductance for what flows (by the book's law over each half, with the contact's own where given), and
 *  each piece's figure, with how it is known: what `flowOver` and `temperaturesOf` both solve over. */
export function edgeConductances(g: Graph, kind: 'heat' | 'current' | 'force', o: { contact?: number } = {}) {
  const key = kind === 'heat' ? 'k' : kind === 'force' ? 'E' : 'conductivity', lacking: string[] = [];
  const known = new Map<string, Known>(), prop = (m: string | null) => {
    if (!m) return null;
    if (!known.has(m)) {
      // (its own figure; else, known only by its family, the middle of the span its family's members here cover, as an
      // estimate, with that span as its ±)
      const mt = matterOf(m), p = mt.props.find((x) => x.key === key), sp = mt.span?.[key];
      known.set(m, p && p.value > 0 ? { v: p.value, ev: p.evidence, ...(sp ? { span: sp } : {}) } : sp && sp[0] > 0 ? { v: (sp[0] + sp[1]) / 2, ev: 'estimated', span: sp } : null);
    }
    return known.get(m)!;
  };
  const k0 = g.pieces.map((p) => prop(p.mat));
  const noK = g.pieces.filter((_, i) => !k0[i]); if (noK.length) lacking.push(`${noK.length} piece${noK.length > 1 ? 's' : ''} with no ${kind === 'heat' ? 'thermal conductivity' : kind === 'force' ? 'elastic modulus' : 'electrical conductivity'} known, carrying none (${[...new Set(noK.map((p) => p.mat ?? 'no material'))].slice(0, 6).join(', ')})`);
  const mid = g.pieces.map((p) => p.node.box!.getCenter(new THREE.Vector3()));
  // each half by the book's own law: Fourier's (heat through a thickness L of conductivity k over an area A, per kelvin)
  // or a wire's resistance (resistivity times length over section); a half the law refuses carries nothing, said
  // (force along the way it is loaded: each half a bar, E A / L, its stiffness springs in series and side by side as
  // conductances are)
  const law = lawById(kind === 'heat' ? 'conduction' : kind === 'force' ? 'bar.axial-stiffness' : 'wire.resistance'), refused: string[] = [];
  const half = (kv: number, A: number, L: number): number => {
    const d = kind === 'force' ? apply(law, { E: setting('elastic modulus', kv, 'Pa', 'its material'), A: setting('section', A, 'm^2', 'the patch'), L: setting('length', L, 'm', 'middle to patch') })
      : kind === 'heat'
      ? apply(law, { k: setting('conductivity', kv, 'W/m K', 'its material'), A: setting('area', A, 'm^2', 'the patch'), dT: setting('temperature difference', 1, 'K', 'per kelvin'), L: setting('thickness', L, 'm', 'middle to patch') })
      : apply(law, { rho: setting('resistivity', 1 / kv, 'ohm m', 'its material'), L: setting('length', L, 'm', 'middle to patch'), A: setting('section', A, 'm^2', 'the patch') });
    if (d.value === null) { refused.push(d.refusal?.domain ?? 'no value'); return 0; }
    return kind === 'current' ? 1 / d.value : d.value;
  };
  const conductances = (k: (number | null)[]) => g.edges.map((e) => {
    const ka = k[e.a], kb = k[e.b]; if (!ka || !kb || !(e.area > 0)) return 0;
    const at = new THREE.Vector3(...e.at), ga = half(ka, e.area, Math.max(mid[e.a]!.distanceTo(at), 1e-5)), gb = half(kb, e.area, Math.max(mid[e.b]!.distanceTo(at), 1e-5));
    if (!(ga > 0) || !(gb > 0)) return 0;
    return 1 / (1 / ga + 1 / gb + (o.contact ? 1 / (o.contact * e.area) : 0));
  });
  return { conductances, k0, known, law, refused, lacking, mid };
}

export function flowOver(g: Graph, kind: 'heat' | 'current' | 'force', from: number[], to: number[], o: { contact?: number } = {}): Flow {
  const n = g.pieces.length, { conductances, k0, known, law, refused, lacking } = edgeConductances(g, kind, o);
  const G = conductances(k0.map((x) => x?.v ?? null));
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
  const scale = Math.max(out, ...through.map(Math.abs)), R = out > 0 ? 1 / out : null;
  // ± from what is known only by its family: each such material moved by its standard uncertainty, the network solved
  // again, the changes summed in quadrature (independent materials; the twelve that carry the most, said where more)
  const used = [...new Set(g.pieces.map((p, i) => (k0[i] && seen.has(i) ? p.mat! : null)).filter((m): m is string => !!m))];
  const unsure = used.filter((m) => known.get(m)!.span).slice(0, 12), uncertainFrom: string[] = []; let u2 = 0;
  if (R !== null) for (const m of unsure) {
    const [lo, hi] = known.get(m)!.span!, sd = (hi - lo) / Math.sqrt(12); if (!(sd > 0)) continue;
    const G2 = conductances(g.pieces.map((p, i) => (k0[i] ? (p.mat === m ? k0[i]!.v + sd : k0[i]!.v) : null)));
    const e2: [number, number, number][] = [], b2 = new Array<number>(free.length).fill(0);
    for (const i of free) { const r = at.get(i)!; let d = 0; for (const [j, q] of nb[i]!) { d += G2[q]!; const c = at.get(j); if (c !== undefined) e2.push([r, c, -G2[q]!]); else b2[r]! += G2[q]! * end.get(j)!; } e2.push([r, r, d]); }
    const x2 = free.length ? solveSparseSPD(free.length, e2, b2).x : [], lv = (i: number) => (end.has(i) ? end.get(i)! : x2[at.get(i)!]!);
    let o2 = 0; g.edges.forEach((e, q) => { const fa = from.includes(e.a), fb = from.includes(e.b); if (seen.has(e.a) && seen.has(e.b)) { if (fa && !fb) o2 += G2[q]! * (lv(e.a) - lv(e.b)); else if (fb && !fa) o2 -= G2[q]! * (lv(e.a) - lv(e.b)); } });
    if (o2 > 0) { u2 += (1 / o2 - R) ** 2; uncertainFrom.push(m); }
  }
  if (used.filter((m) => known.get(m)!.span).length > 12) lacking.push('more than twelve materials known only by their family: the twelve first met carry the ±');
  if (refused.length) lacking.push(`${refused.length} halves refused by the law (${[...new Set(refused)][0]})`);
  const ev = (e: Evidence): EvidenceKind => (e === 'handbook' || e === 'specified' || e === 'secondary' ? 'specified' : e === 'derived' ? 'derived' : 'estimated');
  const evidence = used.length ? weakestOf(...used.map((m) => ev(known.get(m)!.ev))) : 'derived';
  return { resistance: R, conductance: out, level, through, imbalance: scale > 0 ? worst / scale : 0, converged: sol.converged, steps: sol.steps, lacking, floating,
    resistanceU: uncertainFrom.length ? Math.sqrt(u2) : null, uncertainFrom, evidence, laws: [law.id] };
}

/** A thing's pieces coloured by a level from 0 to 1 (a temperature, a voltage, a force): blue at 0 through green and
 *  yellow to red at 1, as heat maps are read; grey where it has none. Each piece placed where it is, shared, not copied
 *  (step E: what flows, seen). */
export function coloured(g: Graph, level: (number | null)[], name = 'coloured by what flows'): Assembly {
  const hue = (x: number) => new THREE.Color().setHSL((2 / 3) * (1 - Math.max(0, Math.min(1, x))), 0.85, 0.5).getHex();
  const items = g.pieces.map((p, i) => {
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); p.node.m.decompose(pos, q, sc);
    const e = new THREE.Euler().setFromQuaternion(q), v = level[i];
    return { of: { ...p.node.p, at: undefined, rot: undefined, parts: [] } as Part, at: pos.toArray() as V3, rot: [e.x, e.y, e.z] as V3, s: sc.x, over: { color: v === null || v === undefined ? 0x777777 : hue(v), finish: 'satin' } };
  });
  return { name, items };
}

/**
 * The graph with each piece cut into slices along its length (step G: accuracy that grows): a box across the way what
 * flows goes (its side most along the direction given; else its longest),
 * a cylinder along its axis, into n slices each its own piece, the slices of one piece joined through its own section
 * at each cut; a contact from outside lands on the slice that holds where it meets. Other shapes (tubes, lofts, pieces
 * of several covering boxes) stay whole. Splitting more and seeing the answer settle is how far to trust it.
 */
export function sliced(g: Graph, n: number, along?: THREE.Vector3): Graph {
  if (n <= 1) return g;
  const pieces: GraphPiece[] = [], edges: GraphEdge[] = [], first: number[] = [], axisOf: { k: number; L: number; c: THREE.Vector3; u: THREE.Vector3; m: number }[] = [];
  g.pieces.forEach((p) => {
    const nd = p.node, s = nd.p.shape, o = nd.obb!;
    const w = along ? o.u.map((u, i) => Math.abs(u.dot(along)) * (1 + 1e-6 * o.h[i]!)) : o.h, best = w.indexOf(Math.max(...w));
    const k = s && 'cyl' in s && (s.cyl[2] === undefined || s.cyl[2] === s.cyl[0]) ? 1 : s && 'box' in s ? best : -1;
    first.push(pieces.length);
    if (k < 0 || nd.pieces.length > 1 || !nd.local) { pieces.push(p); axisOf.push({ k: -1, L: 0, c: o.c, u: o.u[0], m: 1 }); return; }
    const L = 2 * o.h[k]!, sl = L / n, sc = new THREE.Vector3().setFromMatrixScale(nd.m), lsc = [sc.x, sc.y, sc.z][k]!;
    axisOf.push({ k, L, c: o.c, u: o.u[k]!, m: n });
    for (let j = 0; j < n; j++) {
      const off = -L / 2 + sl * (j + 0.5), c = o.c.clone().addScaledVector(o.u[k]!, off), h = [...o.h] as OBB['h']; h[k] = sl / 2;
      const ob: OBB = { c, u: o.u, h }, box = new THREE.Box3();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) box.expandByPoint(c.clone().addScaledVector(o.u[0], sx * h[0]).addScaledVector(o.u[1], sy * h[1]).addScaledVector(o.u[2], sz * h[2]));
      // its own part, a slice of the shape, at the slice's middle (in the piece's frame: offset along its own axis)
      const shape = 'cyl' in s! ? { cyl: [s.cyl[0], s.cyl[1] / n] as [number, number] } : { box: (s as { box: [number, number, number] }).box.map((v, i) => (i === k ? v / n : v)) as [number, number, number] };
      const lo = [0, 0, 0]; lo[k] = off / lsc; const m = nd.m.clone().multiply(new THREE.Matrix4().makeTranslation(lo[0]!, lo[1]!, lo[2]!));
      const local = nd.local.clone(); local.min.setComponent(k, -sl / lsc / 2); local.max.setComponent(k, sl / lsc / 2);
      pieces.push({ id: `${p.id}#${j}`, name: p.name, mat: p.mat, node: { ...nd, p: { ...nd.p, shape, parts: [] }, m, obb: ob, box, pieces: [ob], local, sub: box.clone() } });
    }
    const A = k === 1 && 'cyl' in s! ? Math.PI * o.h[0] * o.h[2] : 4 * o.h.filter((_, i) => i !== k).reduce((a, x) => a * x, 1);
    for (let j = 1; j < n; j++) edges.push({ a: first[first.length - 1]! + j - 1, b: first[first.length - 1]! + j, at: o.c.clone().addScaledVector(o.u[k]!, -L / 2 + sl * j).toArray() as V3, normal: o.u[k]!.toArray() as V3, depth: 0, area: A });
  });
  const slabAt = (i: number, at: V3) => { const a = axisOf[i]!; if (a.k < 0) return first[i]!; const t = new THREE.Vector3(...at).sub(a.c).dot(a.u) + a.L / 2; return first[i]! + Math.max(0, Math.min(a.m - 1, Math.floor((t / a.L) * a.m))); };
  for (const e of g.edges) edges.push({ ...e, a: slabAt(e.a, e.at), b: slabAt(e.b, e.at) });
  return { pieces, edges, bounds: g.bounds, worked: 0 };
}

/**
 * Each piece's steady temperature (step H: the heat gate by conduction): the hot pieces held at their temperatures, heat
 * conducted through every contact (as `flowOver`, by Fourier's law over each half), and every piece losing heat to the air
 * round it from its surface (its covering box's), by natural convection and radiation (`heatLoss`: Holman's correlation,
 * the material's emissivity, else 0.9), taken as linear and worked again from the temperatures it gives, a few rounds.
 * A piece joined to nothing hot stays at the air's temperature.
 */
export function temperaturesOf(g: Graph, hot: Map<number, number>, ambient: number, o: { rounds?: number } = {}): { T: number[]; lacking: string[] } {
  const { conductances, k0, lacking } = edgeConductances(g, 'heat'), G = conductances(k0.map((x) => x?.v ?? null));
  const area = g.pieces.map((p) => { const h = p.node.obb!.h; return 8 * (h[0] * h[1] + h[1] * h[2] + h[0] * h[2]); }), size = g.pieces.map((p) => 2 * Math.max(...p.node.obb!.h));
  const eps = g.pieces.map((p) => (p.mat ? matterOf(p.mat).props.find((x) => x.key === 'emissivity')?.value : undefined) ?? 0.9);
  const nb: [number, number][][] = g.pieces.map(() => []); g.edges.forEach((e, q) => { if (G[q]! > 0) { nb[e.a]!.push([e.b, q]); nb[e.b]!.push([e.a, q]); } });
  const free = g.pieces.map((_, i) => i).filter((i) => !hot.has(i)), at = new Map(free.map((i, r) => [i, r]));
  let T = g.pieces.map((_, i) => hot.get(i) ?? ambient + (Math.max(...hot.values(), ambient) - ambient) / 2);
  for (let r = 0; r < (o.rounds ?? 4); r++) {
    // what each piece loses to the air per kelvin above it, at the temperature it was last found at
    const Ga = T.map((t, i) => { const dT = t - ambient; return Math.abs(dT) < 1e-6 ? heatLoss(ambient + 1, area[i]!, size[i]!, eps[i]!, ambient) : heatLoss(t, area[i]!, size[i]!, eps[i]!, ambient) / dT; });
    const entries: [number, number, number][] = [], b = new Array<number>(free.length).fill(0);
    for (const i of free) { const row = at.get(i)!; let d = Ga[i]!; b[row]! += Ga[i]! * ambient; for (const [j, q] of nb[i]!) { d += G[q]!; const c = at.get(j); if (c !== undefined) entries.push([row, c, -G[q]!]); else b[row]! += G[q]! * hot.get(j)!; } entries.push([row, row, d]); }
    const x = free.length ? solveSparseSPD(free.length, entries, b).x : [];
    T = g.pieces.map((_, i) => hot.get(i) ?? x[at.get(i)!]!);
  }
  return { T, lacking };
}

export interface Bent {
  /** Each piece's movement (m) and turn (rad) under the load, in the thing's frame; null where joined to nothing held. */
  moved: (V3 | null)[]; turned: (V3 | null)[];
  /** How far the loaded pieces move along the load, on average (m), and the stiffness that is (N/m). */
  give: number | null; stiffness: number | null;
  converged: boolean; steps: number; residual: number; floating: number; lacking: string[];
  evidence: EvidenceKind;
}

/**
 * How a thing bends, stretches and twists under a load (docs/REALITY.md, section 6, step F, second round): its pieces
 * (cut into slices) as a 3D frame of Euler–Bernoulli beams, each node free to move and turn six ways. Between the slices
 * of a piece, a beam of its own section (a box's, a cylinder's) and material (E, and G from E and Poisson's ratio, else
 * 0.3); between pieces that touch, a beam bonded through the patch they meet over (its section the patch, as a round
 * one; its E the two moduli in series). The held pieces fixed, the load shared among the loaded; solved at once
 * (conjugate gradients). Exact for prismatic bars at their nodes (a cantilever's tip, a bar's stretch); a solid block is a
 * beam too (shear deformation and the block's own spreading left out); contacts never part (bonded). Small movements.
 */
export function bentUnder(g: Graph, held: number[], loaded: number[], load: V3): Bent {
  const n = g.pieces.length, lacking: string[] = [], ev: Evidence[] = [];
  const Eof = new Map<string, { E: number; nu: number } | null>(), mat = (m: string | null) => {
    if (!m) return null;
    if (!Eof.has(m)) { const mt = matterOf(m), E = mt.props.find((p) => p.key === 'E'), nu = mt.props.find((p) => p.key === 'nu'), sp = mt.span?.E; Eof.set(m, E ? { E: E.value, nu: nu?.value ?? 0.3 } : sp ? { E: (sp[0] + sp[1]) / 2, nu: 0.3 } : null); if (E) ev.push(E.evidence); else if (sp) ev.push('estimated'); }
    return Eof.get(m)!;
  };
  const props = g.pieces.map((p) => mat(p.mat)), centre = g.pieces.map((p) => p.node.obb!.c);
  const noE = g.pieces.filter((_, i) => !props[i]); if (noE.length) lacking.push(`${noE.length} pieces with no elastic modulus known, carrying nothing (${[...new Set(noE.map((p) => p.mat ?? 'no material'))].slice(0, 6).join(', ')})`);
  // a piece's section across an axis: area, second moments about its two other axes (in that axis's frame), torsion
  const sectionOf = (i: number, k: number) => {
    const p = g.pieces[i]!, s = p.node.p.shape, h = p.node.obb!.h, o = [0, 1, 2].filter((x) => x !== k) as [number, number];
    if (s && 'cyl' in s && k === 1) { const r = Math.sqrt(h[0] * h[2]), A = Math.PI * r * r, I = (Math.PI * r ** 4) / 4; return { A, I1: I, I2: I, J: 2 * I, u1: o[0], u2: o[1] }; }
    const b = 2 * h[o[0]]!, d = 2 * h[o[1]]!, A = b * d, a = Math.max(b, d), c = Math.min(b, d);
    // (a rectangle's torsion constant, Roark table 10.7: a c³ (1/3 − 0.21 c/a (1 − c⁴ / 12 a⁴)))
    return { A, I1: (b * d ** 3) / 12, I2: (d * b ** 3) / 12, J: a * c ** 3 * (1 / 3 - 0.21 * (c / a) * (1 - c ** 4 / (12 * a ** 4))), u1: o[0], u2: o[1] };
  };
  const entries: [number, number, number][] = [];
  const beam = (a: number, b: number, E: number, G: number, A: number, Iy: number, Iz: number, J: number, ey?: THREE.Vector3) => {
    const d = centre[b]!.clone().sub(centre[a]!), L = d.length(); if (!(L > 1e-9)) return;
    const ex = d.clone().multiplyScalar(1 / L); let y = ey ? ey.clone().addScaledVector(ex, -ey.dot(ex)) : new THREE.Vector3();
    if (y.lengthSq() < 1e-12) { y = Math.abs(ex.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); y.addScaledVector(ex, -y.dot(ex)); }
    y.normalize(); const z = new THREE.Vector3().crossVectors(ex, y), R = [ex, y, z];
    const K = Array.from({ length: 12 }, () => new Array<number>(12).fill(0)), set = (i: number, j: number, v: number) => { K[i]![j] = v; K[j]![i] = v; };
    const EA = (E * A) / L, GJ = (G * J) / L, z12 = (12 * E * Iz) / L ** 3, z6 = (6 * E * Iz) / L ** 2, z4 = (4 * E * Iz) / L, z2 = (2 * E * Iz) / L, y12 = (12 * E * Iy) / L ** 3, y6 = (6 * E * Iy) / L ** 2, y4 = (4 * E * Iy) / L, y2 = (2 * E * Iy) / L;
    set(0, 0, EA); set(0, 6, -EA); set(6, 6, EA); set(3, 3, GJ); set(3, 9, -GJ); set(9, 9, GJ);
    set(1, 1, z12); set(1, 5, z6); set(1, 7, -z12); set(1, 11, z6); set(5, 5, z4); set(5, 7, -z6); set(5, 11, z2); set(7, 7, z12); set(7, 11, -z6); set(11, 11, z4);
    set(2, 2, y12); set(2, 4, -y6); set(2, 8, -y12); set(2, 10, -y6); set(4, 4, y4); set(4, 8, y6); set(4, 10, y2); set(8, 8, y12); set(8, 10, y6); set(10, 10, y4);
    // to the thing's frame: Kg = Tᵀ K T, T four blocks of the local axes
    const Tm = (r: number, c: number) => (Math.floor(r / 3) === Math.floor(c / 3) ? R[r % 3]!.getComponent(c % 3) : 0);
    const KT = K.map((row) => Array.from({ length: 12 }, (_, c) => row.reduce((s2, v, k) => s2 + v * Tm(k, c), 0)));
    const dof = (q: number) => (q < 6 ? a * 6 + q : b * 6 + q - 6);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) { let v = 0; for (let k = 0; k < 12; k++) v += Tm(k, r) * KT[k]![c]!; if (v !== 0) entries.push([dof(r), dof(c), v]); }
  };
  for (const e of g.edges) {
    const pa = props[e.a], pb = props[e.b]; if (!pa || !pb) continue;
    const same = g.pieces[e.a]!.node.p === g.pieces[e.b]!.node.p || (g.pieces[e.a]!.id.split('#')[0] === g.pieces[e.b]!.id.split('#')[0] && g.pieces[e.a]!.id.includes('#'));
    if (same) {
      // two slices of one piece: a beam of the piece's own section along its axis
      const o = g.pieces[e.a]!.node.obb!, ax = centre[e.b]!.clone().sub(centre[e.a]!).normalize(), k = o.u.map((u) => Math.abs(u.dot(ax))).reduce((m, v, i, arr) => (v > arr[m]! ? i : m), 0), s = sectionOf(e.a, k);
      beam(e.a, e.b, pa.E, pa.E / (2 * (1 + pa.nu)), s.A, s.I1, s.I2, s.J, o.u[s.u1]);
    } else {
      // two pieces bonded through their patch, as a round section of its area; moduli in series
      const E = (2 * pa.E * pb.E) / (pa.E + pb.E), nu = (pa.nu + pb.nu) / 2, A = Math.max(e.area, 1e-12), I = (A * A) / (4 * Math.PI);
      beam(e.a, e.b, E, E / (2 * (1 + nu)), A, I, I, 2 * I);
    }
  }
  // only what is joined to what is held
  const nb: number[][] = g.pieces.map(() => []); for (const e of g.edges) if (props[e.a] && props[e.b]) { nb[e.a]!.push(e.b); nb[e.b]!.push(e.a); }
  const seen = new Set(held), st = [...held]; while (st.length) { const x = st.pop()!; for (const y of nb[x]!) if (!seen.has(y)) { seen.add(y); st.push(y); } }
  const fixed = new Set(held), free = [...seen].filter((i) => !fixed.has(i)).sort((x, y) => x - y), at = new Map<number, number>(); free.forEach((i, r) => { for (let q = 0; q < 6; q++) at.set(i * 6 + q, r * 6 + q); });
  const rows: [number, number, number][] = []; for (const [r, c, v] of entries) { const R2 = at.get(r), C2 = at.get(c); if (R2 !== undefined && C2 !== undefined) rows.push([R2, C2, v]); }
  const live = loaded.filter((i) => at.has(i * 6)), f = new Array<number>(free.length * 6).fill(0);
  for (const i of live) for (let q = 0; q < 3; q++) f[at.get(i * 6 + q)!]! += load[q]! / live.length;
  if (!live.length) lacking.push('none of the loaded pieces is joined to what holds it');
  const sol = free.length && live.length ? solveSparseSPD(free.length * 6, rows, f, { maxSteps: 40 * free.length * 6 + 1000 }) : { x: [], converged: true, steps: 0, residual: 0 };
  const moved = g.pieces.map((_, i) => (fixed.has(i) ? [0, 0, 0] as V3 : at.has(i * 6) ? [0, 1, 2].map((q) => sol.x[at.get(i * 6 + q)!]!) as V3 : null));
  const turned = g.pieces.map((_, i) => (fixed.has(i) ? [0, 0, 0] as V3 : at.has(i * 6) ? [3, 4, 5].map((q) => sol.x[at.get(i * 6 + q)!]!) as V3 : null));
  const L = Math.hypot(...load), dir = L > 0 ? load.map((v) => v / L) : [0, 0, 0];
  const give = live.length && L > 0 ? live.reduce((s2, i) => s2 + moved[i]!.reduce((t, v, q) => t + v * dir[q]!, 0), 0) / live.length : null;
  const evidence = ev.length ? weakestOf(...ev.map((e): EvidenceKind => (e === 'handbook' || e === 'specified' || e === 'secondary' ? 'specified' : e === 'derived' ? 'derived' : 'estimated'))) : 'derived';
  return { moved, turned, give, stiffness: give && give > 0 ? L / give : null, converged: sol.converged, steps: sol.steps, residual: sol.residual, floating: n - seen.size, lacking, evidence };
}
