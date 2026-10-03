// The relational structure between the laws, kept whole, and its projection (docs/LAW-GRAPH.md). A law exists once;
// its relationships place it in as many structures as relate it. Nothing here is a tree and nothing is a level: every
// relation is a typed edge with where it came from, every path between two laws is kept with the relations that
// compose it, and what is deep is computed from the derivation topology (how much rests on a law), never assigned.
// The 3D layout (`projection`) is one projection of this structure, derived from it and regenerated when it changes;
// the structure is the truth and the layout is not.
//
// The relations, and where each comes from (none is typed by hand):
//   derives-from     C = A ∘ B: the result of putting one law's output into another's input, found by composing their
//                    evaluations and testing the composite against every law of the same output on random points
//   specialises      C is A with one input held as a constant (the shapes say so: forms.ts)
//   shares-shape     the same shape at a level of forgetting (forms.ts: level 0 keeps every term, 1 forgets the
//                    inputs' dimensions, 2 the output's too); the finest level that joins them is the edge
//   co-used          applied together by a workflow, a principle or a process (ganglia registries)
//   feeds            A's output quantity is one of B's inputs (dimension and name): a composition that could be made
//   shares-constant  the same dimensional constant in both (g, R, k, c, μ0...)
//   generalised-by   an arrow of the substrate putting a law under a structure (a result of a research branch)

import { LAWS, lawById, withConstants } from './laws';
import { WORKFLOWS } from './workflows';
import { PRINCIPLES } from './principles';
import { PROCESSES } from './processes';
import { shapeOf, shapeKey, type Shape } from './native/forms';
import { dimensionOf } from './units';
import type { Law } from './types';

export type Kind = 'derives-from' | 'specialises' | 'shares-shape' | 'co-used' | 'feeds' | 'shares-constant' | 'generalised-by';
/** The weight each kind carries in the layout (the layout only; a query never adds weights across kinds). */
export const WEIGHT: Record<Kind, number> = { 'derives-from': 1, specialises: 1, 'generalised-by': 1, 'shares-shape': 0.5, 'co-used': 0.4, feeds: 0.3, 'shares-constant': 0.2 };
/** The kinds along which one law stands on another: the derivation layer, read upward from a law to what it rests on. */
export const UPWARD: ReadonlySet<Kind> = new Set<Kind>(['derives-from', 'specialises', 'generalised-by']);
/** The kinds that carry structure between two laws (what one is to the other); co-use and feeding are the dense layers of use, counted apart. */
export const STRUCTURAL: Kind[] = ['derives-from', 'specialises', 'generalised-by', 'shares-shape', 'shares-constant'];
export const USE: Kind[] = ['co-used', 'feeds'];

export interface Edge { from: string; to: string; kind: Kind; /** what carries it: a quantity, a workflow, a constant, a shape key, the other law of a composition */ via: string; source: string; weight: number }
/** C = outer ∘ inner through a quantity: the result rests on both. */
export interface Derivation { result: string; outer: string; inner: string; quantity: string; maxRel: number }
export interface Node { id: string; kind: 'law' | 'structure'; name: string }
export interface LawGraph { nodes: Map<string, Node>; edges: Edge[]; derivations: Derivation[]; adj: Map<string, Edge[]> }

const dimKey = (unit: string): string | null => { try { return dimensionOf(unit).join(','); } catch { return null; } };
const quantityMatch = (a: { name: string; unit: string; sym: string }, b: { name: string; unit: string; sym: string }): boolean => dimKey(a.unit) !== null && dimKey(a.unit) === dimKey(b.unit) && (a.name.toLowerCase() === b.name.toLowerCase() || a.sym === b.sym);

// ---- derivation by composition ---------------------------------------------------------------------------------------------

/** A deterministic pseudo-random sequence (so the discovered relations are the same on every build). */
function rng(seed: number): () => number { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

/**
 * Every C = A ∘ B in the book: B's output put into an input of A that is the same quantity, the composite evaluated on
 * random points around C's own example and compared with C. A relation found this way is a derivation with its path
 * (A, B, the quantity) kept, not a distance.
 */
export function compositions(laws: Law[] = LAWS, points = 6): Derivation[] {
  const out: Derivation[] = [];
  const random = rng(20261003);
  const byOut = new Map<string, Law[]>();
  for (const l of laws) { const k = dimKey(l.output.unit); if (k) byOut.set(k, [...(byOut.get(k) ?? []), l]); }
  for (const A of laws) for (const B of laws) {
    if (A === B) continue;
    for (const x of A.inputs) {
      if (!quantityMatch(x, B.output)) continue;
      // the composite's variables: A's inputs but x, then B's inputs (a symbol in both is one variable)
      const vars: { sym: string; name: string; unit: string }[] = [];
      for (const v of [...A.inputs.filter((i) => i !== x), ...B.inputs]) if (!vars.some((w) => w.sym === v.sym)) vars.push(v);
      const varDims = vars.map((v) => dimKey(v.unit) ?? '?').sort().join('|');
      for (const C of byOut.get(dimKey(A.output.unit)!) ?? []) {
        if (C === A || C === B || C.inputs.length !== vars.length) continue;
        if (C.inputs.map((i) => dimKey(i.unit) ?? '?').sort().join('|') !== varDims) continue;
        // bind C's inputs to the composite's variables, by dimension, every consistent way
        const groups = new Map<string, { c: typeof C.inputs; v: typeof vars }>();
        for (const ci of C.inputs) { const k = dimKey(ci.unit) ?? '?'; const g = groups.get(k) ?? { c: [], v: [] }; g.c.push(ci); groups.set(k, g); }
        for (const v of vars) groups.get(dimKey(v.unit) ?? '?')!.v.push(v);
        const bindings: Record<string, string>[] = [{}];
        for (const g of groups.values()) {
          const next: Record<string, string>[] = [];
          for (const perm of permutations(g.v)) for (const b of bindings) next.push({ ...b, ...Object.fromEntries(g.c.map((ci, i) => [ci.sym, perm[i]!.sym])) });
          bindings.splice(0, bindings.length, ...next);
        }
        bind: for (const binding of bindings) {
          let maxRel = 0;
          for (let p = 0; p < points; p++) {
            const cEnv: Record<string, number> = {};
            for (const ci of C.inputs) { const base = C.example.inputs[ci.sym]; if (base === undefined) continue bind; cEnv[ci.sym] = base * (0.5 + 1.5 * random()); }
            let expected: number;
            try { expected = C.eval(withConstants(C, cEnv)); } catch { continue bind; }
            const vEnv: Record<string, number> = {};
            for (const [cSym, vSym] of Object.entries(binding)) vEnv[vSym] = cEnv[cSym]!;
            let inner: number, got: number;
            try { inner = B.eval(withConstants(B, vEnv)); got = A.eval(withConstants(A, { ...vEnv, [x.sym]: inner })); } catch { continue bind; }
            if (!Number.isFinite(expected) || !Number.isFinite(got) || expected === 0) continue bind;
            maxRel = Math.max(maxRel, Math.abs(got - expected) / Math.abs(expected));
            if (maxRel > 1e-6) continue bind;
          }
          if (!out.some((d) => d.result === C.id && d.outer === A.id && d.inner === B.id)) out.push({ result: C.id, outer: A.id, inner: B.id, quantity: x.name, maxRel });
          break;
        }
      }
    }
  }
  return out;
}

// ---- the graph --------------------------------------------------------------------------------------------------------------

export interface Options { /** Arrows from the substrate that put laws under structures: `(lawId) => [{ to, says }]`. */ above?: (lawId: string) => { to: string; name?: string; says?: string }[]; /** Relations added by hand or by a later discovery, kept beside the computed ones. */ extra?: Edge[] }

let cached: LawGraph | null = null;

/** The structure, computed from the law book and the registries; cached when no options are given. */
export function lawGraph(opts: Options = {}): LawGraph {
  if (!opts.above && !opts.extra && cached) return cached;
  const nodes = new Map<string, Node>();
  for (const l of LAWS) nodes.set(l.id, { id: l.id, kind: 'law', name: l.name });
  const edges: Edge[] = [];
  const add = (e: Edge) => { if (!edges.some((f) => f.from === e.from && f.to === e.to && f.kind === e.kind && f.via === e.via)) edges.push(e); };
  // derivations by composition: the result rests on both laws, through the quantity
  const derivations = compositions();
  for (const d of derivations) { add({ from: d.result, to: d.outer, kind: 'derives-from', via: `${d.inner} through ${d.quantity}`, source: 'composition tested on 6 points', weight: WEIGHT['derives-from'] }); add({ from: d.result, to: d.inner, kind: 'derives-from', via: `${d.outer} through ${d.quantity}`, source: 'composition tested on 6 points', weight: WEIGHT['derives-from'] }); }
  // shapes: specialisation (one input held) and shared shapes at the finest level that joins two laws
  const shapes = new Map<string, Shape>();
  for (const l of LAWS) { const s = shapeOf(l); if (s) shapes.set(l.id, s); }
  const termKey = (t: Shape['terms'][number]) => `${t.dim.join(',')}^${t.exp}`;
  const ids = [...shapes.keys()];
  for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
    if (i === j) continue;
    const a = shapes.get(ids[i]!)!, c = shapes.get(ids[j]!)!;
    if (a.out.join(',') !== c.out.join(',')) continue;
    // C specialises A: C's terms are A's with exactly one of A's free inputs held as a constant in C
    const aFree = a.terms.filter((t) => !t.held).map(termKey).sort(), cFree = c.terms.filter((t) => !t.held).map(termKey).sort(), cHeld = c.terms.filter((t) => t.held).map(termKey);
    if (aFree.length === cFree.length + 1 && cHeld.length >= 1 && a.terms.filter((t) => t.held).length === c.terms.filter((t) => t.held).length - 1) {
      const extra = [...aFree]; for (const k of cFree) { const at = extra.indexOf(k); if (at < 0) { extra.length = 0; break; } extra.splice(at, 1); }
      if (extra.length === 1 && cHeld.includes(extra[0]!)) add({ from: ids[j]!, to: ids[i]!, kind: 'specialises', via: `holds ${extra[0]}`, source: 'shapes (forms.ts)', weight: WEIGHT.specialises });
    }
    if (i < j) {
      const level = ([0, 1, 2] as const).find((lv) => shapeKey(a, lv) === shapeKey(c, lv));
      if (level !== undefined) add({ from: ids[i]!, to: ids[j]!, kind: 'shares-shape', via: `level ${level}: ${shapeKey(a, level)}`, source: 'shapes (forms.ts)', weight: WEIGHT['shares-shape'] / (level + 1) });
    }
  }
  // used together
  const together = (list: string[], via: string, source: string) => { const ls = [...new Set(list)].filter((id) => nodes.has(id)); for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) add({ from: ls[i]!, to: ls[j]!, kind: 'co-used', via, source, weight: WEIGHT['co-used'] }); };
  for (const w of WORKFLOWS) together(w.uses.laws, w.id, 'workflow');
  for (const p of PRINCIPLES) together(p.laws, p.id, 'principle');
  for (const p of PROCESSES) if (p.uses?.laws) together(p.uses.laws, p.id, 'process');
  // feeds: A's output is a quantity B takes
  for (const A of LAWS) for (const B of LAWS) { if (A === B) continue; const x = B.inputs.find((i) => quantityMatch(i, A.output)); if (x) add({ from: A.id, to: B.id, kind: 'feeds', via: x.name, source: 'quantities (dimension and name)', weight: WEIGHT.feeds }); }
  // the same constant
  const withConst = LAWS.filter((l) => l.constants);
  for (let i = 0; i < withConst.length; i++) for (let j = i + 1; j < withConst.length; j++) {
    const a = withConst[i]!, b = withConst[j]!;
    for (const [sym, c] of Object.entries(a.constants!)) { const d = b.constants![sym]; if (d && Math.abs(d.value - c.value) <= 1e-9 * Math.abs(c.value) && dimKey(c.unit) !== '0,0,0,0,0') add({ from: a.id, to: b.id, kind: 'shares-constant', via: sym, source: 'constants', weight: WEIGHT['shares-constant'] }); }
  }
  // structures above laws, from the substrate when given
  if (opts.above) for (const l of LAWS) for (const up of opts.above(l.id)) { if (!nodes.has(up.to)) nodes.set(up.to, { id: up.to, kind: 'structure', name: up.name ?? up.to }); add({ from: l.id, to: up.to, kind: 'generalised-by', via: up.says ?? '', source: 'substrate', weight: WEIGHT['generalised-by'] }); }
  for (const e of opts.extra ?? []) { if (!nodes.has(e.to)) nodes.set(e.to, { id: e.to, kind: 'structure', name: e.to }); if (!nodes.has(e.from)) nodes.set(e.from, { id: e.from, kind: 'structure', name: e.from }); add(e); }
  const adj = new Map<string, Edge[]>();
  for (const e of edges) { adj.set(e.from, [...(adj.get(e.from) ?? []), e]); adj.set(e.to, [...(adj.get(e.to) ?? []), e]); }
  const g: LawGraph = { nodes, edges, derivations, adj };
  if (!opts.above && !opts.extra) cached = g;
  return g;
}

export const edgesOf = (g: LawGraph, id: string, kinds?: Kind[]): Edge[] => (g.adj.get(id) ?? []).filter((e) => !kinds || kinds.includes(e.kind));
const other = (e: Edge, id: string) => (e.from === id ? e.to : e.from);

// ---- paths: kept whole ---------------------------------------------------------------------------------------------------------

export interface Step { law: string; edge: Edge | null; /** read along the edge's own direction (+1) or against it (−1) */ along: 1 | -1 }
export interface Path { steps: Step[]; kinds: Kind[]; length: number }

/** Every simple path between two laws within a depth, each with the relations that compose it. Nothing is dropped for being longer than another. */
export function paths(g: LawGraph, a: string, b: string, opts: { maxDepth?: number; kinds?: Kind[]; limit?: number } = {}): Path[] {
  const maxDepth = opts.maxDepth ?? 4, limit = opts.limit ?? 200;
  const out: Path[] = [];
  const walk = (at: string, steps: Step[], seen: Set<string>) => {
    if (out.length >= limit) return;
    if (at === b && steps.length > 1) { out.push({ steps, kinds: steps.slice(1).map((s) => s.edge!.kind), length: steps.length - 1 }); return; }
    if (steps.length - 1 >= maxDepth) return;
    for (const e of edgesOf(g, at, opts.kinds)) { const n = other(e, at); if (seen.has(n)) continue; walk(n, [...steps, { law: n, edge: e, along: e.from === at ? 1 : -1 }], new Set([...seen, n])); }
  };
  walk(a, [{ law: a, edge: null, along: 1 }], new Set([a]));
  return out.sort((p, q) => p.length - q.length);
}

/** What lies between two laws: every law on some path within the depth, with how many paths run through it. */
export function between(g: LawGraph, a: string, b: string, maxDepth = 4): { law: string; through: number }[] {
  const count = new Map<string, number>();
  for (const p of paths(g, a, b, { maxDepth })) for (const s of p.steps.slice(1, -1)) count.set(s.law, (count.get(s.law) ?? 0) + 1);
  return [...count.entries()].map(([law, through]) => ({ law, through })).sort((x, y) => y.through - x.through);
}

const shortest = (g: LawGraph, a: string, b: string, kinds?: Kind[]): number | null => {
  const seen = new Map<string, number>([[a, 0]]); const queue = [a];
  while (queue.length) { const at = queue.shift()!; const d = seen.get(at)!; if (at === b) return d; for (const e of edgesOf(g, at, kinds)) { const n = other(e, at); if (!seen.has(n)) { seen.set(n, d + 1); queue.push(n); } } }
  return null;
};

/** What a law rests on: up the derivation layer, transitively (nearest first, with the depth each was reached at). */
export function ancestry(g: LawGraph, id: string): { law: string; depth: number }[] {
  const out: { law: string; depth: number }[] = []; const seen = new Set([id]); let frontier = [id]; let depth = 0;
  while (frontier.length) { depth++; const next: string[] = []; for (const at of frontier) for (const e of edgesOf(g, at)) { if (!UPWARD.has(e.kind) || e.from !== at) continue; if (!seen.has(e.to)) { seen.add(e.to); out.push({ law: e.to, depth }); next.push(e.to); } } frontier = next; }
  return out;
}
/** What rests on a law: down the derivation layer, transitively. */
export function cone(g: LawGraph, id: string): { law: string; depth: number }[] {
  const out: { law: string; depth: number }[] = []; const seen = new Set([id]); let frontier = [id]; let depth = 0;
  while (frontier.length) { depth++; const next: string[] = []; for (const at of frontier) for (const e of edgesOf(g, at)) { if (!UPWARD.has(e.kind) || e.to !== at) continue; if (!seen.has(e.from)) { seen.add(e.from); out.push({ law: e.from, depth }); next.push(e.from); } } frontier = next; }
  return out;
}

/** How close two laws are: several answers, never one number. Paths are counted on the structural layers and on the layers of use separately (the latter capped: a count past the cap says 'at least'). */
export interface Closeness { derivational: number | null; dependency: number | null; commonAncestor: { law: string; fromA: number; fromB: number } | null; shape: 0 | 1 | 2 | null; domains: [string, string]; structuralPaths: number; usePaths: number; usePathsCapped: boolean }
export function closeness(g: LawGraph, a: string, b: string): Closeness {
  const up = (id: string) => new Map([[id, 0], ...ancestry(g, id).map((x) => [x.law, x.depth] as const)]);
  const ua = up(a), ub = up(b);
  let common: Closeness['commonAncestor'] = null;
  for (const [law, da] of ua) { const db = ub.get(law); if (db !== undefined && (!common || da + db < common.fromA + common.fromB)) common = { law, fromA: da, fromB: db }; }
  const shapeEdge = edgesOf(g, a, ['shares-shape']).find((e) => other(e, a) === b);
  const level = shapeEdge ? (Number(shapeEdge.via.slice(6, 7)) as 0 | 1 | 2) : null;
  const use = paths(g, a, b, { maxDepth: 4, kinds: USE, limit: 200 });
  return { derivational: shortest(g, a, b, ['derives-from', 'specialises', 'generalised-by']), dependency: shortest(g, a, b, USE), commonAncestor: common, shape: level, domains: [lawById(a)?.domain ?? '?', lawById(b)?.domain ?? '?'], structuralPaths: paths(g, a, b, { maxDepth: 4, kinds: STRUCTURAL }).length, usePaths: use.length, usePathsCapped: use.length >= 200 };
}

// ---- depth from the topology ---------------------------------------------------------------------------------------------------

export interface Standing { id: string; /** laws resting on it through the derivation layer */ reach: number; depthBelow: number; heightAbove: number; foundational: boolean; /** laws its output can reach downstream through quantities (feeds), transitively: the dependency cone, kept apart from derivation */ dependencyReach: number }
/** Where every node stands, from the derivation layer alone: how much rests on it, how long the chains below and above it are, and whether nothing is above it. */
export function standing(g: LawGraph): Map<string, Standing> {
  const out = new Map<string, Standing>();
  const longestDown = new Map<string, number>(), longestUp = new Map<string, number>();
  const down = (id: string, seen: Set<string>): number => { if (longestDown.has(id)) return longestDown.get(id)!; if (seen.has(id)) return 0; seen.add(id); let best = 0; for (const e of edgesOf(g, id)) if (UPWARD.has(e.kind) && e.to === id) best = Math.max(best, 1 + down(e.from, seen)); longestDown.set(id, best); return best; };
  const upl = (id: string, seen: Set<string>): number => { if (longestUp.has(id)) return longestUp.get(id)!; if (seen.has(id)) return 0; seen.add(id); let best = 0; for (const e of edgesOf(g, id)) if (UPWARD.has(e.kind) && e.from === id) best = Math.max(best, 1 + upl(e.to, seen)); longestUp.set(id, best); return best; };
  const downstream = (id: string): number => { const seen = new Set([id]); const q = [id]; while (q.length) { const at = q.shift()!; for (const e of edgesOf(g, at, ['feeds'])) if (e.from === at && !seen.has(e.to)) { seen.add(e.to); q.push(e.to); } } return seen.size - 1; };
  for (const id of g.nodes.keys()) { const above = edgesOf(g, id).some((e) => UPWARD.has(e.kind) && e.from === id); out.set(id, { id, reach: cone(g, id).length, depthBelow: down(id, new Set()), heightAbove: upl(id, new Set()), foundational: !above && cone(g, id).length > 0, dependencyReach: downstream(id) }); }
  return out;
}
/** The deepest nodes: nothing above them and the most resting on them. */
export const deepest = (g: LawGraph, n = 10): Standing[] => [...standing(g).values()].filter((s) => s.foundational).sort((a, b) => b.reach - a.reach || a.id.localeCompare(b.id)).slice(0, n);

// ---- the projection: P3D(structure) ------------------------------------------------------------------------------------------------

export interface Placed { id: string; kind: Node['kind']; x: number; y: number; z: number; reach: number; depthBelow: number; group: number }
export interface Projection { nodes: Placed[]; edges: Edge[]; groups: string[][] }

/** The symmetric eigen-decomposition of a small matrix (Jacobi): values ascending with their vectors. */
function jacobi(A: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length; const a = A.map((r) => [...r]); const v: number[][] = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i]![j]! ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p]![q]!) < 1e-15) continue;
      const theta = (a[q]![q]! - a[p]![p]!) / (2 * a[p]![q]!); const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1)); const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k]![p]!, akq = a[k]![q]!; a[k]![p] = c * akp - s * akq; a[k]![q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p]![k]!, aqk = a[q]![k]!; a[p]![k] = c * apk - s * aqk; a[q]![k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = v[k]![p]!, vkq = v[k]![q]!; v[k]![p] = c * vkp - s * vkq; v[k]![q] = s * vkp + c * vkq; }
    }
  }
  const order = a.map((r, i) => [r[i]!, i] as const).sort((x, y) => x[0] - y[0]);
  return { values: order.map((o) => o[0]), vectors: order.map((o) => v.map((row) => row[o[1]])) };
}

/**
 * The layout, derived: height from the derivation topology (how long the chains below a node are, so what most
 * rests on stands highest), the plane from the spectral embedding of the whole weighted structure (the two smallest
 * non-trivial eigenvectors of the Laplacian: laws that relate much, by any relation, lie near each other). Groups are
 * the connected components of the derivation and shape layers. A change in the structure changes the layout.
 */
export function projection(g: LawGraph): Projection {
  const ids = [...g.nodes.keys()].sort();
  const n = ids.length; const index = new Map(ids.map((id, i) => [id, i]));
  const W = ids.map(() => new Array<number>(n).fill(0));
  for (const e of g.edges) { const i = index.get(e.from), j = index.get(e.to); if (i === undefined || j === undefined || i === j) continue; W[i]![j]! += e.weight; W[j]![i]! += e.weight; }
  // normalised Laplacian; isolated nodes get a weak tie to everything so the embedding stays defined
  const deg = W.map((r) => r.reduce((s, x) => s + x, 0));
  const L = ids.map((_, i) => ids.map((__, j) => { const dij = Math.max(deg[i]!, 1e-9), djj = Math.max(deg[j]!, 1e-9); return (i === j ? 1 : 0) - W[i]![j]! / Math.sqrt(dij * djj); }));
  const { vectors } = jacobi(L);
  const fix = (vec: number[]) => { let k = 0; for (let i = 1; i < vec.length; i++) if (Math.abs(vec[i]!) > Math.abs(vec[k]!)) k = i; return vec[k]! < 0 ? vec.map((x) => -x) : vec; };
  const vx = fix(vectors[1] ?? ids.map(() => 0)), vz = fix(vectors[2] ?? ids.map(() => 0));
  const scale = (v: number[]) => { const m = Math.max(1e-9, ...v.map(Math.abs)); return v.map((x) => x / m); };
  const sx = scale(vx), sz = scale(vz);
  const st = standing(g);
  const maxDepth = Math.max(1, ...[...st.values()].map((s) => s.depthBelow));
  // groups: components of the derivation and shape layers (level 0 and 1 shapes)
  const parent = new Map(ids.map((id) => [id, id])); const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  for (const e of g.edges) if (UPWARD.has(e.kind) || (e.kind === 'shares-shape' && !e.via.startsWith('level 2'))) { const a = find(e.from), b = find(e.to); if (a !== b) parent.set(a, b); }
  const groupIndex = new Map<string, number>(); const groups: string[][] = [];
  for (const id of ids) { const root = find(id); if (!groupIndex.has(root)) { groupIndex.set(root, groups.length); groups.push([]); } groups[groupIndex.get(root)!]!.push(id); }
  const nodes: Placed[] = ids.map((id, i) => { const s = st.get(id)!; return { id, kind: g.nodes.get(id)!.kind, x: +sx[i]!.toFixed(4), y: +(s.depthBelow / maxDepth).toFixed(4), z: +sz[i]!.toFixed(4), reach: s.reach, depthBelow: s.depthBelow, group: groupIndex.get(find(id))! }; });
  return { nodes, edges: g.edges, groups };
}

// ---- zoom: the same structure at several resolutions, cross-links kept at every one ------------------------------------------------

export interface Super { root: string; members: string[]; /** cross-links to other supers: how many edges of each kind leave this cone for that one */ links: { to: string; kind: Kind; count: number }[] }
/** The root view: every foundational node with its cone as one super-node, laws in no cone as their own, and every edge between cones aggregated by kind; nothing between cones is dropped. */
export function roots(g: LawGraph): Super[] {
  const st = standing(g);
  const supers = new Map<string, Super>();
  const home = new Map<string, string>();
  for (const s of [...st.values()].filter((x) => x.foundational).sort((a, b) => b.reach - a.reach)) { supers.set(s.id, { root: s.id, members: [s.id, ...cone(g, s.id).map((c) => c.law)], links: [] }); for (const m of supers.get(s.id)!.members) if (!home.has(m)) home.set(m, s.id); }
  for (const id of g.nodes.keys()) if (!home.has(id)) { supers.set(id, { root: id, members: [id], links: [] }); home.set(id, id); }
  for (const e of g.edges) { const a = home.get(e.from)!, b = home.get(e.to)!; if (a === b) continue; const link = supers.get(a)!.links.find((l) => l.to === b && l.kind === e.kind); if (link) link.count++; else supers.get(a)!.links.push({ to: b, kind: e.kind, count: 1 }); }
  return [...supers.values()];
}
/** One cone opened: its members, the edges within, and every edge that leaves it, one by one. */
export function branch(g: LawGraph, root: string): { members: string[]; within: Edge[]; leaving: Edge[] } {
  const members = new Set([root, ...cone(g, root).map((c) => c.law)]);
  const within: Edge[] = [], leaving: Edge[] = [];
  for (const e of g.edges) { const a = members.has(e.from), b = members.has(e.to); if (a && b) within.push(e); else if (a || b) leaving.push(e); }
  return { members: [...members], within, leaving };
}

// ---- said -----------------------------------------------------------------------------------------------------------------------------

const nameOf = (g: LawGraph, id: string) => g.nodes.get(id)?.name ?? id;
export function sayPath(g: LawGraph, p: Path): string {
  return p.steps.map((s, i) => (i === 0 ? nameOf(g, s.law) : ` ${s.along === 1 ? '→' : '←'}[${s.edge!.kind}${s.edge!.kind === 'co-used' || s.edge!.kind === 'feeds' || s.edge!.kind === 'shares-constant' ? ` via ${s.edge!.via}` : ''}]${s.along === 1 ? '→' : '←'} ${nameOf(g, s.law)}`)).join('');
}
export function sayConnected(g: LawGraph, a: string, b: string, maxDepth = 4): string {
  const structural = paths(g, a, b, { maxDepth, kinds: STRUCTURAL });
  const use = paths(g, a, b, { maxDepth, kinds: USE, limit: 200 });
  if (!structural.length && !use.length) return `${nameOf(g, a)} and ${nameOf(g, b)} are not connected within ${maxDepth} steps by any relation I hold.`;
  const say = (ps: Path[], what: string, capped: boolean) => { const shown = ps.slice(0, 3); return `${ps.length}${capped ? ' or more' : ''} ${what} path${ps.length === 1 ? '' : 's'}${ps.length > shown.length ? ` (the shortest ${shown.length})` : ''}: ${shown.map((p) => sayPath(g, p)).join('; ')}`; };
  return `${nameOf(g, a)} and ${nameOf(g, b)}, within ${maxDepth} steps: ${[structural.length ? say(structural, 'structural', false) : 'no structural path', use.length ? say(use, 'use', use.length >= 200) : 'no path of use'].join('. ')}.`;
}
export function sayBetween(g: LawGraph, a: string, b: string): string {
  const b2 = between(g, a, b);
  return b2.length ? `Between ${nameOf(g, a)} and ${nameOf(g, b)}, within 4 steps: ${b2.slice(0, 8).map((x) => `${nameOf(g, x.law)} (${x.through} path${x.through === 1 ? '' : 's'})`).join(', ')}.` : `Nothing lies between ${nameOf(g, a)} and ${nameOf(g, b)} within 4 steps.`;
}
export function sayCloseness(g: LawGraph, a: string, b: string): string {
  const c = closeness(g, a, b);
  const bits = [
    `derivational distance ${c.derivational ?? 'none within reach'}`,
    `dependency distance ${c.dependency ?? 'none'}`,
    c.commonAncestor ? `common ancestor ${nameOf(g, c.commonAncestor.law)} (${c.commonAncestor.fromA} and ${c.commonAncestor.fromB} steps up)` : 'no common ancestor',
    c.shape !== null ? `one shape at level ${c.shape}` : 'no shared shape',
    `${c.domains[0] === c.domains[1] ? 'one' : 'two'} human domain${c.domains[0] === c.domains[1] ? '' : 's'} (${c.domains.join(', ')})`,
    `${c.structuralPaths} structural path${c.structuralPaths === 1 ? '' : 's'} and ${c.usePathsCapped ? 'at least ' : ''}${c.usePaths} path${c.usePaths === 1 ? '' : 's'} of use within 4 steps`,
  ];
  return `How close ${nameOf(g, a)} and ${nameOf(g, b)} are has several answers: ${bits.join('; ')}.`;
}
export function sayStanding(g: LawGraph, id: string): string {
  const s = standing(g).get(id)!;
  const up = ancestry(g, id), down = cone(g, id);
  return `${nameOf(g, id)}: ${down.length} law${down.length === 1 ? '' : 's'} rest${down.length === 1 ? 's' : ''} on it by derivation${down.length ? ` (${down.slice(0, 6).map((x) => nameOf(g, x.law)).join(', ')}${down.length > 6 ? ', …' : ''})` : ''}; it rests on ${up.length}${up.length ? ` (${up.slice(0, 6).map((x) => nameOf(g, x.law)).join(', ')}${up.length > 6 ? ', …' : ''})` : ''}; chains ${s.depthBelow} deep below and ${s.heightAbove} above; its output reaches ${s.dependencyReach} law${s.dependencyReach === 1 ? '' : 's'} downstream through quantities; ${s.foundational ? 'nothing above it: deepest in its cone' : up.length ? 'not the deepest' : 'in no derivation chain yet'}.`;
}
export function sayDeepest(g: LawGraph): string {
  const d = deepest(g, 6);
  const byUse = [...standing(g).values()].sort((a, b) => b.dependencyReach - a.dependencyReach || a.id.localeCompare(b.id)).slice(0, 4);
  return `The deepest by derivation (nothing above them, the most resting on them): ${d.length ? d.map((s) => `${nameOf(g, s.id)} (${s.reach} below, chains ${s.depthBelow} deep)`).join('; ') : 'none yet'}. The widest by use (whose output reaches the most laws through quantities): ${byUse.map((s) => `${nameOf(g, s.id)} (${s.dependencyReach})`).join('; ')}. Computed from the topology, not assigned.`;
}
export function sayCensus(g: LawGraph): string {
  const by = new Map<Kind, number>(); for (const e of g.edges) by.set(e.kind, (by.get(e.kind) ?? 0) + 1);
  return `${g.nodes.size} nodes, ${g.edges.length} relations (${[...by.entries()].map(([k, n]) => `${k} ${n}`).join(', ')}), ${g.derivations.length} derivations found by composition.`;
}
