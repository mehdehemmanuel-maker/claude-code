// Node boards: a board is words and the links between them, and nothing else is asked. What each node is comes from its
// links: each node sits under the neighbour with the most connections, when that neighbour has more than it (ties go to
// the one whose neighbours are better connected); a node no neighbour outranks heads a category. The pipeline is the
// same structure in order: a category is derived before what sits under it, and a directed link (flows to, depends
// on, …) orders its two ends. Categories are the pipeline read at once; the pipeline is how the categories are derived.
//
// The same rules run in the Node Boards artifact (one page, its own copy of them) and in the forge's board in the room
// (src/nexus/view/boards3d.ts). A board is stored as one document: nodes and edges keyed by id, a deleted one marked so
// rather than removed (a patch can only merge), and written whole without them when it is written whole.

import type { FlowRun, Step } from './flows';

export interface BoardNode { label: string; note?: string; x?: number | null; y?: number | null; px?: number | null; py?: number | null; deleted?: boolean; kind?: string; /** On a flow: what the node does when the flow runs. */ step?: Step
  /** On a pipeline of blocks (src/nexus/dataflow.ts): the library block it is (src/nexus/blocks.ts), its settings, and,
   *  for a group, the board inside it. */
  block?: string; set?: Record<string, unknown>; inner?: Board }
export interface BoardEdge { from: string; to: string; rel?: string; label?: string; note?: string; deleted?: boolean
  /** A wire between blocks: from the output port named `out` to the input port named `in`. */
  out?: string; in?: string }
export interface Board {
  title: string; kind?: string; about?: string;
  nodes: Record<string, BoardNode>; edges: Record<string, BoardEdge>;
  /** What Claude wrote back: on the board, and on the nodes it means. */
  review?: { text: string; at?: number }; notes?: Record<string, string>;
  createdAt?: number; updatedAt?: number; by?: string;
  /** Where it came from, when it was made from something: the build it reads. */
  source?: string;
  /** Each time the person called Claude on it: their words as they said them, and what was understood. */
  calls?: { words: string; understood: string; by: 'claude' | 'nexus'; at: number; node?: string }[];
  /** On a flow: whether its triggers start it by themselves, and its last runs, newest last. */
  armed?: boolean; runs?: FlowRun[];
  /** Runs without saying so in the chat (a robot's rules, which run often): its runs are kept on it, to read there. */
  quiet?: boolean;
  /** The least time (ms) between two starts by itself; 10 s where not said (a device's program runs oftener). */
  cooldown?: number;
}
export type View = 'categories' | 'pipeline';
export interface Live { id: string; label: string; note: string; pin: { x: number; y: number } | null }
export type LiveEdge = BoardEdge & { id: string };
export type Patch = Partial<Omit<Board, 'nodes' | 'edges'>> & { nodes?: Record<string, Partial<BoardNode>>; edges?: Record<string, Partial<BoardEdge>> };

/** Which end of a directed link is derived first: what is depended on, or read, before what needs it. */
export const LEVELS = ['category', 'subcategory', 'sub-subcategory'] as const;

/** Each view keeps its own places: the categories' x, y; the pipeline's px, py. A node has a place only once it is dragged. */
const KX = (v: View): ['x', 'y'] | ['px', 'py'] => (v === 'pipeline' ? ['px', 'py'] : ['x', 'y']);
export function nodesOf(b: Board | null, view: View = 'categories'): Live[] {
  const [kx, ky] = KX(view);
  return Object.entries(b?.nodes ?? {}).filter(([, n]) => n && !n.deleted).map(([id, n]) => {
    const x = n[kx], y = n[ky];
    return { id, label: String(n.label ?? ''), note: n.note ?? '', pin: typeof x === 'number' && typeof y === 'number' ? { x, y } : null };
  });
}
export function edgesOf(b: Board | null): LiveEdge[] {
  const ns = b?.nodes ?? {};
  return Object.entries(b?.edges ?? {}).filter(([, e]) => e && !e.deleted && ns[e.from] && !ns[e.from]!.deleted && ns[e.to] && !ns[e.to]!.deleted).map(([id, e]) => ({ id, ...e }));
}

export interface Derived {
  key: string;
  /** Each node's neighbours, whatever the kind of link. */
  nb: Map<string, Set<string>>;
  deg: Map<string, number>;
  /** Most connected first. */
  order: string[]; rank: Map<string, number>;
  parent: Map<string, string>; kids: Map<string, string[]>;
  depth: Map<string, number>; root: Map<string, string>; roots: string[];
  /** A colour index (1–8) for each category, by its rank. */
  hue: Map<string, number>;
  /** The node and everything under it. */
  size: Map<string, number>;
  /** Its step in the pipeline: one past the longest chain of what it is derived from. */
  step: Map<string, number>; into: Map<string, string[]>;
}
/** What the links make: each node's place under the most connected neighbour, the categories, and the steps of the pipeline. */
export type Level = (typeof LEVELS)[number] | 'item' | 'unlinked';

export interface Box { w: number; h: number }
/** Where each node goes, unless it has been dragged: in the categories view, each category a column with what sits under
 *  it stacked beneath, a step in for each level (a category over a large tree heads it, its children's trees the columns);
 *  in the pipeline view, a column for each step, left to right. Words not linked yet come first in both. */
export function layout(d: Derived, view: View, box: (id: string) => Box, aspect = 1.78): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const loose = d.order.filter((id) => d.deg.get(id) === 0);
  if (view !== 'pipeline') {
    const cols: { id: string; d: number }[][] = [], heads: string[] = [];
    for (let i = 0; i < loose.length; i += 8) cols.push(loose.slice(i, i + 8).map((id) => ({ id, d: 0 })));
    const walk = (col: { id: string; d: number }[], id: string, dd: number): void => { col.push({ id, d: dd }); for (const k of d.kids.get(id) ?? []) walk(col, k, dd + 1); };
    // a large tree is headed by its root, its children's trees the columns, and so on down: no column taller than a
    // tree of `TALL`, so a board of hundreds stays a page of columns rather than one long one
    const TALL = 24;
    const lay = (id: string, top: boolean): void => {
      const ks = d.kids.get(id) ?? [];
      if (ks.length >= 2 && d.size.get(id)! > (top ? 16 : TALL)) { heads.push(id); for (const k of ks) lay(k, false); return; }
      const col: { id: string; d: number }[] = []; walk(col, id, 0); cols.push(col);
    };
    const own = cols.length;
    for (const r of d.roots) if (d.deg.get(r)! > 0) lay(r, true);
    // short trees side by side share a column, up to eight cards, as the words not linked yet do
    const packed = cols.slice(0, own), shared = new Set<number>();
    for (const col of cols.slice(own)) {
      const i = packed.length - 1;
      if (col.length <= 2 && shared.has(i) && packed[i]!.length + col.length <= 8) packed[i]!.push(...col);
      else { packed.push([...col]); if (col.length <= 2) shared.add(packed.length - 1); }
    }
    const size = packed.map((col) => ({ w: Math.max(...col.map(({ id, d: dd }) => dd * 22 + box(id).w)), h: col.reduce((t, { id }) => t + box(id).h + 10, 0) }));
    let hx = 0; for (const id of heads) { pos.set(id, { x: hx, y: 0 }); hx += box(id).w + 60; }
    const top0 = heads.length ? Math.max(...heads.map((id) => box(id).h)) + 50 : 0;
    // as many columns to a row as fill a wall of `aspect` best: wide enough, and not so wide its words go small
    const extent = (per: number) => { let w = 0, h = top0; for (let r = 0; r * per < size.length; r++) { const row = size.slice(r * per, r * per + per); w = Math.max(w, row.reduce((t, c) => t + c.w + 56, 0)); h += Math.max(...row.map((c) => c.h)) + 90; } return { w: Math.max(w, hx), h }; };
    let perRow = 1, best = 0;
    for (let per = 1; per <= Math.min(12, Math.max(1, size.length)); per++) { const e = extent(per), k = Math.min(aspect / Math.max(1, e.w), 1 / Math.max(1, e.h)); if (k > best * 1.0001) { best = k; perRow = per; } }
    let y0 = top0;
    for (let r = 0; r * perRow < packed.length; r++) {
      const row = packed.slice(r * perRow, r * perRow + perRow); let tallest = 0, x = 0;
      for (const col of row) { let y = y0, wide = 0; for (const { id, d: dd } of col) { pos.set(id, { x: x + dd * 22, y }); y += box(id).h + 10; wide = Math.max(wide, dd * 22 + box(id).w); } tallest = Math.max(tallest, y - y0); x += wide + 56; }
      y0 += tallest + 90;
    }
    return pos;
  }
  const layers = new Map<number, string[]>();
  for (const id of d.order) { const k = d.deg.get(id) === 0 ? -1 : d.step.get(id) ?? 0; if (!layers.has(k)) layers.set(k, []); layers.get(k)!.push(id); }
  const row = new Map<string, number>(); let x = 0;
  for (const k of [...layers.keys()].sort((a, c) => a - c)) {
    const ids = layers.get(k)!.map((id) => { const ps = (d.into.get(id) ?? []).map((p) => row.get(p)).filter((v): v is number => v !== undefined); return { id, bary: ps.length ? ps.reduce((a, v) => a + v, 0) / ps.length : Infinity }; }).sort((a, c) => a.bary - c.bary);
    let y = 0, wide = 0; ids.forEach(({ id }, i) => { row.set(id, i); pos.set(id, { x, y }); y += box(id).h + 14; wide = Math.max(wide, box(id).w); });
    x += wide + 80;
  }
  return pos;
}

// ---- edits: each a patch, merged into the board and written as it is --------------------------------------------------
export const deepMerge = <T extends object>(a: T | undefined, b: object): T => {
  const o: Record<string, unknown> = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' ? deepMerge(o[k] as object, v as object) : v;
  return o as T;
};
/** A whole board without what was deleted: what is written when a board is written whole. */
export function compact(b: Board): Board {
  const o: Board = { ...b, nodes: {}, edges: {} };
  for (const [k, n] of Object.entries(b.nodes ?? {})) if (n && !n.deleted) o.nodes[k] = n;
  for (const [k, e] of Object.entries(b.edges ?? {})) if (e && !e.deleted && o.nodes[e.from] && o.nodes[e.to]) o.edges[k] = e;
  return o;
}
export const uid = (p: string): string => p + Math.random().toString(36).slice(2, 9);
/** A link between two nodes. One deleted before between the same two is brought back, so the board does not fill with dead ones. */
export function link(b: Board, from: string, to: string, rel = 'connects'): Patch | null {
  if (from === to) return null;
  const same = (e: BoardEdge) => (e.from === from && e.to === to) || (e.from === to && e.to === from);
  if (edgesOf(b).some((e) => same(e) && (e.rel ?? 'connects') === rel)) return null;
  const dead = Object.entries(b.edges ?? {}).find(([, e]) => e && e.deleted && same(e));
  return { edges: { [dead ? dead[0] : uid('e')]: { from, to, rel, deleted: false, label: '', note: '' } } };
}

// ---- a board of what Nexus knows: a branch of its taxonomy -------------------------------------------------------------
/** A branch of the taxonomy as a board: each entry a node under what holds it, its note what it is, the law that decides
 *  it, and what in Nexus makes it, or that nothing does yet; an entry Nexus makes is marked so. Its categories are what
 *  the links make them, as on every board. */
