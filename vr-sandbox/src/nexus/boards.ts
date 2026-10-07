// Node boards: a board is words and the links between them, and nothing else is asked. What each node is comes from its
// links: each node sits under the neighbour with the most connections, when that neighbour has more than it (ties go to
// the one whose neighbours are better connected); a node no neighbour outranks heads a category. The pipeline is the
// same structure in order: a category is derived before what sits under it, and a directed link (flows to, depends
// on, …) orders its two ends. Categories are the pipeline read at once; the pipeline is how the categories are derived.
//
// The same rules run in the Node Boards artifact (one page, its own copy of them) and in the forge's board in the room
// (src/nexus/view/boards3d.ts). A board is stored as one document: nodes and edges keyed by id, a deleted one marked so
// rather than removed (a patch can only merge), and written whole without them when it is written whole.

import { find, type Node as TaxNode } from './embody/taxonomy';
import type { FlowRun, Step } from './flows';

export interface BoardNode { label: string; note?: string; x?: number | null; y?: number | null; px?: number | null; py?: number | null; deleted?: boolean; kind?: string; /** On a flow: what the node does when the flow runs. */ step?: Step }
export interface BoardEdge { from: string; to: string; rel?: string; label?: string; note?: string; deleted?: boolean }
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
}
export type View = 'categories' | 'pipeline';
export interface Live { id: string; label: string; note: string; pin: { x: number; y: number } | null }
export type LiveEdge = BoardEdge & { id: string };
export type Patch = Partial<Omit<Board, 'nodes' | 'edges'>> & { nodes?: Record<string, Partial<BoardNode>>; edges?: Record<string, Partial<BoardEdge>> };

export const RELS = ['connects', 'contains', 'is a kind of', 'calls', 'depends on', 'flows to', 'feeds', 'feeds back to', 'reads', 'writes', 'shares', 'causes', 'constrains', 'implements', 'alternative to'] as const;
export const HIER = new Set(['contains', 'is a kind of']);
export const UNDIRECTED = new Set(['connects', 'shares', 'alternative to']);
/** A loop back (a redesign, a critique fed into the ask again): drawn, but it orders nothing. */
export const BACK = new Set(['feeds back to']);
/** Links that only say two things belong together: they order along the derived tree, nothing else. */
export const STRUCT = (r?: string) => !r || HIER.has(r) || UNDIRECTED.has(r);
/** Which end of a directed link is derived first: what is depended on, or read, before what needs it. */
export const BEFORE = (e: BoardEdge): [string, string] => (/^(depends on|reads|is a kind of)$/.test(e.rel ?? '') ? [e.to, e.from] : [e.from, e.to]);
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
export function derive(b: Board | null): Derived {
  const ns = nodesOf(b), es = edgesOf(b);
  const key = `${ns.map((n) => `${n.id}:${n.label}`).join(',')}|${es.map((e) => `${e.from}>${e.to}:${e.rel ?? ''}`).join(',')}`;
  const nb = new Map(ns.map((n) => [n.id, new Set<string>()])), label = new Map(ns.map((n) => [n.id, n.label]));
  for (const e of es) if (e.from !== e.to && nb.has(e.from) && nb.has(e.to)) { nb.get(e.from)!.add(e.to); nb.get(e.to)!.add(e.from); }
  const deg = new Map<string, number>(), deg2 = new Map<string, number>();
  for (const [id, s] of nb) deg.set(id, s.size);
  for (const [id, s] of nb) { let t = 0; for (const x of s) t += deg.get(x)!; deg2.set(id, t); }
  const order = ns.map((n) => n.id).sort((a, c) => deg.get(c)! - deg.get(a)! || deg2.get(c)! - deg2.get(a)! || label.get(a)!.localeCompare(label.get(c)!) || (a < c ? -1 : a > c ? 1 : 0));
  const rank = new Map(order.map((id, i) => [id, i]));
  const parent = new Map<string, string>(), kids = new Map<string, string[]>(), depth = new Map<string, number>(), root = new Map<string, string>();
  for (const id of order) {
    let best: string | undefined;
    for (const x of nb.get(id)!) if (rank.get(x)! < rank.get(id)! && (best === undefined || rank.get(x)! < rank.get(best)!)) best = x;
    if (best !== undefined) { parent.set(id, best); if (!kids.has(best)) kids.set(best, []); kids.get(best)!.push(id); depth.set(id, depth.get(best)! + 1); root.set(id, root.get(best)!); }
    else { depth.set(id, 0); root.set(id, id); }
  }
  const roots = order.filter((id) => !parent.has(id));
  const hue = new Map<string, number>(); let h = 0; for (const r of roots) if (deg.get(r)! > 0) hue.set(r, (h++ % 8) + 1);
  const size = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) { const id = order[i]!; size.set(id, 1 + (kids.get(id) ?? []).reduce((t, k) => t + size.get(k)!, 0)); }
  // the order of derivation: along the tree, and along every directed link
  const into = new Map<string, string[]>(), add = (f: string, t: string) => { if (!into.has(t)) into.set(t, []); into.get(t)!.push(f); };
  for (const e of es) {
    if (BACK.has(e.rel ?? '') || e.from === e.to) continue;
    if (STRUCT(e.rel)) { if (parent.get(e.to) === e.from) add(e.from, e.to); else if (parent.get(e.from) === e.to) add(e.to, e.from); }
    else { const [f, t] = BEFORE(e); add(f, t); }
  }
  const step = new Map<string, number>(), on = new Set<string>();
  const st = (id: string): number => { if (step.has(id)) return step.get(id)!; if (on.has(id)) return 0; on.add(id); let v = 0; for (const f of into.get(id) ?? []) v = Math.max(v, st(f) + 1); on.delete(id); step.set(id, v); return v; };
  for (const id of order) st(id);
  return { key, nb, deg, order, rank, parent, kids, depth, root, roots, hue, size, step, into };
}
export type Level = (typeof LEVELS)[number] | 'item' | 'unlinked';
export const levelOf = (d: Derived, id: string): Level => ((d.deg.get(id) ?? 0) === 0 ? 'unlinked' : LEVELS[d.depth.get(id)!] ?? 'item');
/** From its category down to it. */
export const pathTo = (d: Derived, id: string): string[] => { const out: string[] = []; for (let x: string | undefined = id; x !== undefined; x = d.parent.get(x)) out.unshift(x); return out; };
/** The categories, the largest first. */
export const categoriesOf = (d: Derived): string[] => d.roots.filter((r) => d.deg.get(r)! > 0).sort((a, c) => d.size.get(c)! - d.size.get(a)! || d.rank.get(a)! - d.rank.get(c)!);

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
/** Where each node stands: where it was dragged to, else where its links put it. */
export function placesOf(b: Board, d: Derived, view: View, box: (id: string) => Box): Map<string, { x: number; y: number }> {
  const auto = layout(d, view, box), out = new Map<string, { x: number; y: number }>();
  for (const n of nodesOf(b, view)) out.set(n.id, n.pin ?? auto.get(n.id) ?? { x: 0, y: 0 });
  return out;
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
/** A new node: just its word, linked from another if given. Where it goes and what it is come from its links. */
export function addNode(label: string, linkTo?: string, id = uid('n'), rel = 'connects'): { id: string; patch: Patch } {
  const patch: Patch = { nodes: { [id]: { label: label.trim() } } };
  if (linkTo) patch.edges = { [uid('e')]: { from: linkTo, to: id, rel } };
  return { id, patch };
}
/** A name not on the board yet: the name itself where it is free, else it numbered ("Check 2", "Check 3"), so two nodes
 *  may say the same and still be told apart. */
export function freeName(b: Board | null, label: string): string {
  const base = label.trim().replace(/\s+\d+$/, ''), taken = new Set(nodesOf(b).map((n) => n.label.toLowerCase()));
  if (!taken.has(label.trim().toLowerCase())) return label.trim();
  for (let k = 2; ; k++) if (!taken.has(`${base} ${k}`.toLowerCase())) return `${base} ${k}`;
}
/** A node again, beside itself: its words, its note and its step, linked to what it is linked to, under a name of its own. */
export function duplicateNode(b: Board, id: string, nid = uid('n')): { id: string; label: string; patch: Patch } | null {
  const n = b.nodes[id]; if (!n || n.deleted) return null;
  const label = freeName(b, n.label), copy: BoardNode = { label, ...(n.note ? { note: n.note } : {}), ...(n.kind ? { kind: n.kind } : {}), ...(n.step ? { step: { ...n.step } } : {}) };
  // set just beside it where it is pinned, so the two are seen as a pair
  for (const [kx, ky] of [['x', 'y'], ['px', 'py']] as const) { const x = n[kx], y = n[ky]; if (typeof x === 'number' && typeof y === 'number') { copy[kx] = x + 40; copy[ky] = y + 40; } }
  const edges: Record<string, BoardEdge> = {};
  for (const e of edgesOf(b)) { if (e.from !== id && e.to !== id) continue; if (e.from === e.to) continue; edges[uid('e')] = { from: e.from === id ? nid : e.from, to: e.to === id ? nid : e.to, ...(e.rel ? { rel: e.rel } : {}), ...(e.label ? { label: e.label } : {}) }; }
  return { id: nid, label, patch: { nodes: { [nid]: copy }, ...(Object.keys(edges).length ? { edges } : {}) } };
}
/** A link between two nodes. One deleted before between the same two is brought back, so the board does not fill with dead ones. */
export function link(b: Board, from: string, to: string, rel = 'connects'): Patch | null {
  if (from === to) return null;
  const same = (e: BoardEdge) => (e.from === from && e.to === to) || (e.from === to && e.to === from);
  if (edgesOf(b).some((e) => same(e) && (e.rel ?? 'connects') === rel)) return null;
  const dead = Object.entries(b.edges ?? {}).find(([, e]) => e && e.deleted && same(e));
  return { edges: { [dead ? dead[0] : uid('e')]: { from, to, rel, deleted: false, label: '', note: '' } } };
}
/** Link two nodes, or unlink them if they are linked (every link between them goes). On a flow the link is "flows to",
 *  from the first to the second: the second runs after it. */
export function toggleLink(b: Board, a: string, c: string, rel = 'connects'): { patch: Patch; linked: boolean } | null {
  if (a === c) return null;
  const between = edgesOf(b).filter((e) => (e.from === a && e.to === c) || (e.from === c && e.to === a));
  if (between.length) return { patch: { edges: Object.fromEntries(between.map((e) => [e.id, { deleted: true }])) }, linked: false };
  const p = link(b, a, c, rel);
  return p ? { patch: p, linked: true } : null;
}
export function deleteNode(b: Board, id: string): Patch {
  const patch: Patch = { nodes: { [id]: { deleted: true } }, edges: {} };
  for (const e of edgesOf(b)) if (e.from === id || e.to === id) patch.edges![e.id] = { deleted: true };
  return patch;
}
export function moveNode(id: string, view: View, x: number, y: number): Patch { const [kx, ky] = KX(view); return { nodes: { [id]: { [kx]: Math.round(x), [ky]: Math.round(y) } } }; }
/** Let go of every place a node was dragged to in this view: the links lay it out again. */
export function unpin(b: Board, view: View): Patch | null {
  const [kx, ky] = KX(view), pinned = nodesOf(b, view).filter((n) => n.pin);
  return pinned.length ? { nodes: Object.fromEntries(pinned.map((n) => [n.id, { [kx]: null, [ky]: null }])) } : null;
}
/** The nodes a word finds: the one it names first, then those it begins, then those it is in; the most connected first. */
export function findNodes(b: Board, d: Derived, q: string, except?: string): Live[] {
  const qq = q.trim().toLowerCase(), score = (n: Live) => { const l = n.label.toLowerCase(); return l === qq ? 0 : l.startsWith(qq) ? 1 : 2; };
  return nodesOf(b).filter((n) => n.id !== except && (!qq || n.label.toLowerCase().includes(qq))).sort((a, c) => (qq ? score(a) - score(c) : 0) || d.rank.get(a.id)! - d.rank.get(c.id)!);
}

// ---- a board made from a build: what its parts are, as the embodiment filed them ---------------------------------------
export interface PartLike { id: string; name: string; category: string; mass?: number }
const nameOfCategory = (path: string) => find(path)?.name ?? path.split('/').pop()!.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
/** The ask, the categories its parts fall in (domain, category, subcategory, as the taxonomy files them), and the parts,
 *  alike ones as one ("4 × tyre 235/45 R18"), each linked from what contains it. What heads it is what the links make
 *  head it: the node with the most connections, which need not be the ask. */
export function boardOfBuild(ask: string, name: string, parts: PartLike[], at = Date.now()): Board {
  const b: Board = { title: `This build: ${name}`.slice(0, 80), kind: 'categories', about: `Made from the build standing in the forge, "${ask}": the categories its ${parts.length} parts are filed in, and the parts, alike ones as one.`, nodes: { in: { label: ask } }, edges: {}, createdAt: at, updatedAt: at, source: ask };
  let e = 0;
  const edge = (from: string, to: string) => { b.edges[`e${e++}`] = { from, to, rel: 'contains' }; };
  const items = new Map<string, { label: string; count: number; mass: number; under: string }>();
  for (const p of parts) {
    const segs = p.category.split('/').filter(Boolean);
    let under = 'in';
    segs.forEach((_, i) => {
      const path = segs.slice(0, i + 1).join('/'), id = `c-${path.replace(/[^a-z0-9]+/gi, '-')}`;
      if (!b.nodes[id]) { b.nodes[id] = { label: nameOfCategory(path) }; edge(under, id); }
      under = id;
    });
    // parts that differ only by their number are alike: magnet 1 and magnet 3, N42 (N out), are two of one magnet
    const alike = p.name.replace(/^([^\d,:(]+?) \d+(?=[,:(]|$)/, '$1'), key = `${under}|${alike}`, it = items.get(key) ?? { label: alike, count: 0, mass: 0, under };
    it.count++; it.mass += p.mass ?? 0; items.set(key, it);
  }
  let i = 0;
  for (const it of items.values()) { const id = `i${i++}`; b.nodes[id] = { label: it.count > 1 ? `${it.count} × ${it.label}` : it.label, note: it.mass ? `${Number(it.mass.toPrecision(4))} kg in all` : '' }; edge(it.under, id); }
  return b;
}

// ---- a board of what Nexus knows: a branch of its taxonomy -------------------------------------------------------------
/** A branch of the taxonomy as a board: each entry a node under what holds it, its note what it is, the law that decides
 *  it, and what in Nexus makes it, or that nothing does yet; an entry Nexus makes is marked so. Its categories are what
 *  the links make them, as on every board. */
export function boardOfKnowledge(t: TaxNode, at = Date.now()): Board {
  const b: Board = { title: `Nexus knows: ${t.name}`, kind: 'categories', about: '', nodes: {}, edges: {}, createdAt: at, updatedAt: at, source: `taxonomy:${t.id}` };
  let e = 0, entries = 0, made = 0;
  const add = (n: TaxNode, under?: string) => {
    const id = `k-${n.id.replace(/[^a-z0-9]+/gi, '-')}`, laws = n.principles.map((p) => p.law);
    b.nodes[id] = { label: n.name, note: [n.says, ...laws, n.made ? `Nexus makes it: ${n.made}.` : under ? 'Nexus knows it by name and law only: nothing makes it yet.' : ''].filter(Boolean).join(' · '), ...(n.made ? { kind: 'made' } : {}) };
    if (under) { b.edges[`e${e++}`] = { from: under, to: id, rel: 'contains' }; entries++; if (n.made) made++; }
    for (const c of n.children) add(c, id);
  };
  add(t);
  b.about = `What Nexus knows of ${t.name.toLowerCase()}, as its taxonomy files it: ${entries} entries, ${made} of them made or measured by Nexus (marked ●), the rest known by name and law only.`;
  return b;
}
