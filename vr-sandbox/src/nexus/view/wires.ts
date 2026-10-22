// THE BOARD AS A GRAPH YOU CAN SEE: nodes as cards, links as wires between them, branching out from whatever a node
// is under. Drawn from exactly the positions `substrate/boards.ts` works out — `placesOf` lays a tree into columns
// with a step in for each level and returns where every node goes, honouring anything you have dragged. That is the
// same function the wall in the headset lays itself out with, so a board looks the same shape in both.
//
// A wire is drawn as a curve from the side of one card to the side of the next, because a straight line between
// centres disappears under the cards it crosses and gives no sense of which way it runs. Direction is the curve plus
// an arrow; a link that has no direction (connects, shares, alternative to) is drawn without one.
//
// Owner of: a board drawn as nodes and wires in 2D, and dragging one.

import { BACK, HIER, UNDIRECTED, edgesOf, moveNode, nodesOf, type Board, type Derived, type Patch, type View } from '../substrate/boards';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const CARD_H = 34;
/** How wide a card is for its words: measured roughly, and the SAME function the layout is given, so what is drawn
 *  and what was laid out agree. */
export const cardW = (label: string): number => Math.max(74, Math.min(210, Math.round(label.length * 7.3) + 30));

/** The eight colours a category and everything under it is drawn in — the hue `derive` already assigns each root. */
const HUE = ['#78909c', '#80deea', '#69f0ae', '#ffd740', '#ff8a80', '#b388ff', '#ffb74d', '#90caf9', '#f48fb1'];
const hueOf = (d: Derived, id: string): string => HUE[d.hue.get(d.root.get(id) ?? id) ?? 0] ?? HUE[0]!;

interface At { x: number; y: number; w: number; h: number }

/** WHERE EVERY CARD GOES: a tree that branches left to right, each level its own column, each parent sitting level
 *  with the middle of what hangs off it.
 *
 *  This does NOT reuse `boards.ts`'s `layout`, and the reason is worth saying because reusing it was the first
 *  attempt. That function packs a board into COLUMNS OF CARDS for a wall — a tree becomes a vertical stack with a
 *  22 px step in per level, which is right when the cards are the picture and there are no wires. Drawn with wires
 *  it reads as a diagonal staircase with the links looping back over it: the shape says nothing about what branches
 *  from what. A card wall and a node tree are two different questions about where a node goes, and the same answer
 *  cannot serve both. The wall keeps its packing; this is the tree.
 *
 *  What is shared is what should be: a node you have DRAGGED keeps where you put it (`n.pin`, which `moveNode`
 *  writes), here and on the wall alike, and the tree is laid out around whatever has been pinned. */
export function placeCards(b: Board, d: Derived, _view: View): Map<string, At> {
  const live = nodesOf(b);
  const box = (id: string) => ({ w: cardW(b.nodes[id]?.label ?? ''), h: CARD_H });
  const out = new Map<string, At>();

  // a column for each level, as wide as the widest card in it
  const depthOf = (id: string) => ((d.deg.get(id) ?? 0) === 0 ? 0 : (d.depth.get(id) ?? 0));
  const colW: number[] = [];
  for (const n of live) { const k = depthOf(n.id); colW[k] = Math.max(colW[k] ?? 0, box(n.id).w); }
  const colX: number[] = []; let x = 0;
  for (let k = 0; k < colW.length; k++) { colX[k] = x; x += (colW[k] ?? 0) + 76; }

  // leaves take the next row; a parent sits level with the middle of its children, so a branch reads as a branch
  const ROW = CARD_H + 16;
  let row = 0;
  const yOf = new Map<string, number>();
  const walk = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return yOf.get(id) ?? 0;
    seen.add(id);
    const kids = (d.kids.get(id) ?? []).filter((k) => !seen.has(k));
    if (!kids.length) { const y = row * ROW; row += 1; yOf.set(id, y); return y; }
    const ys = kids.map((k) => walk(k, seen));
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    yOf.set(id, y); return y;
  };
  const seen = new Set<string>();
  // the words not joined to anything first, then each tree, with a blank row between trees
  for (const n of live) if ((d.deg.get(n.id) ?? 0) === 0) walk(n.id, seen);
  for (const r of d.roots) if ((d.deg.get(r) ?? 0) > 0) { walk(r, seen); row += 1; }
  for (const n of live) if (!seen.has(n.id)) walk(n.id, seen);

  for (const n of live) {
    const k = depthOf(n.id), bx = box(n.id);
    out.set(n.id, n.pin ? { ...n.pin, ...bx } : { x: colX[k] ?? 0, y: yOf.get(n.id) ?? 0, ...bx });
  }
  return out;
}

/** A wire from one card to another: out of the right side, into the left, bending so it is readable where the two
 *  are stacked one above the other rather than side by side. */
function wire(a: At, c: At): string {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = c.x, y2 = c.y + c.h / 2;
  // where the next card is to the LEFT, the wire leaves the left side instead, so it never runs back under its own card
  const back = x2 < x1;
  const sx = back ? a.x : x1, ex = back ? c.x + c.w : x2;
  const k = Math.max(26, Math.min(90, Math.abs(ex - sx) * 0.5 + Math.abs(y2 - y1) * 0.25));
  return `M${sx.toFixed(1)},${y1.toFixed(1)} C${(sx + (back ? -k : k)).toFixed(1)},${y1.toFixed(1)} ${(ex + (back ? k : -k)).toFixed(1)},${y2.toFixed(1)} ${ex.toFixed(1)},${y2.toFixed(1)}`;
}

export interface WireOpts { picked: string | null; view: View; zoom: number; panX: number; panY: number }

export function wiresSvg(b: Board, d: Derived, o: WireOpts): string {
  const at = placeCards(b, d, o.view);
  const live = nodesOf(b, o.view);
  if (!live.length) return `<p class="none">Nothing on this board yet. Add a page and put some nodes on it.</p>`;
  const xs = [...at.values()];
  const minX = Math.min(...xs.map((p) => p.x)) - 30, minY = Math.min(...xs.map((p) => p.y)) - 30;
  const maxX = Math.max(...xs.map((p) => p.x + p.w)) + 30, maxY = Math.max(...xs.map((p) => p.y + p.h)) + 30;
  const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);

  const wires = edgesOf(b).map((e) => {
    const a = at.get(e.from), c = at.get(e.to);
    if (!a || !c) return '';
    const rel = e.rel ?? 'connects';
    const hier = HIER.has(rel), none = UNDIRECTED.has(rel), back = BACK.has(rel);
    const lit = o.picked && (e.from === o.picked || e.to === o.picked);
    return `<path class="wire ${lit ? 'lit' : ''}" d="${wire(a, c)}"
      stroke="${lit ? '#d9a441' : hier ? '#2b3542' : hueOf(d, e.from)}"
      stroke-width="${lit ? 2.2 : hier ? 1.5 : 1.3}" stroke-opacity="${lit ? 1 : hier ? 0.9 : 0.55}"
      ${back ? 'stroke-dasharray="5 4"' : ''} fill="none"
      marker-end="${none ? '' : `url(#${lit ? 'tip-lit' : hier ? 'tip' : 'tip-soft'})`}"><title>${esc(rel)}</title></path>`;
  }).join('');

  const cards = live.map((n) => {
    const p = at.get(n.id); if (!p) return '';
    const picked = o.picked === n.id, kin = b.nodes[n.id]?.kind === 'page';
    const near = o.picked && o.picked !== n.id && (d.nb.get(o.picked)?.has(n.id) ?? false);
    const label = n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label;
    return `<g class="card ${picked ? 'picked' : ''} ${near ? 'near' : ''}" data-node="${n.id}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">
      <rect width="${p.w}" height="${p.h}" rx="8"
        fill="${picked ? '#231d10' : kin ? '#182029' : '#141a23'}"
        stroke="${picked ? '#d9a441' : near ? '#6fbf84' : kin ? hueOf(d, n.id) : '#1d242e'}" stroke-width="${picked ? 2 : kin ? 1.6 : 1}"/>
      ${kin ? `<rect width="3" height="${p.h}" rx="1.5" fill="${hueOf(d, n.id)}"/>` : ''}
      <text x="${kin ? 12 : 10}" y="${p.h / 2 + 4.5}" fill="${picked ? '#f0d9a8' : '#d8dee9'}" font-size="12.5"
        font-family="system-ui,-apple-system,sans-serif" ${kin ? 'font-weight="600"' : ''}>${esc(label)}</text>
      <title>${esc(n.label)}${kin ? ' — a page' : ''}, ${d.deg.get(n.id) ?? 0} link${(d.deg.get(n.id) ?? 0) === 1 ? '' : 's'}</title>
    </g>`;
  }).join('');

  const tip = (id: string, c: string, op: number) =>
    `<marker id="${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,1 L7,4 L0,7 z" fill="${c}" fill-opacity="${op}"/></marker>`;

  return `<svg class="wires" viewBox="${minX} ${minY} ${w} ${h}" preserveAspectRatio="xMidYMid meet"
    style="--zoom:${o.zoom}" data-w="${w.toFixed(0)}" data-h="${h.toFixed(0)}" data-minx="${minX.toFixed(0)}" data-miny="${minY.toFixed(0)}">
    <defs>${tip('tip', '#2b3542', 0.9)}${tip('tip-soft', '#5d6878', 0.6)}${tip('tip-lit', '#d9a441', 1)}</defs>
    <g transform="translate(${o.panX.toFixed(1)},${o.panY.toFixed(1)}) scale(${o.zoom})">${wires}${cards}</g>
  </svg>`;
}

/** Dragging a card. The engine keeps where a node was put (`moveNode` writes a pin that `placesOf` reads back), so a
 *  board you have arranged stays arranged — in here and on the wall in the headset alike.
 *
 *  It returns whether the pointer actually MOVED, because the same press is also how a node is picked: a press that
 *  does not move is a click, and only a press that does is a drag. Without that, every attempt to connect two nodes
 *  would nudge the first one. */
export function dragCard(
  svg: SVGSVGElement, id: string, ev: PointerEvent, view: View, zoom: number,
  write: (p: Patch) => void, redraw: () => void,
): void {
  const g = svg.querySelector<SVGGElement>(`[data-node="${CSS.escape(id)}"]`); if (!g) return;
  const box = svg.viewBox.baseVal, rect = svg.getBoundingClientRect();
  // the picture is fitted into the element, so one screen pixel is this many of the board's own units
  const per = Math.max(box.width / rect.width, box.height / rect.height) / (zoom || 1);
  const t = g.getAttribute('transform') ?? '';
  const [x0, y0] = (/translate\(([-\d.]+),([-\d.]+)\)/.exec(t) ?? ['', '0', '0']).slice(1).map(Number) as [number, number];
  const sx = ev.clientX, sy = ev.clientY;
  let moved = false;
  const move = (e: PointerEvent) => {
    const dx = (e.clientX - sx) * per, dy = (e.clientY - sy) * per;
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 4) return;
    moved = true; g.setAttribute('transform', `translate(${(x0 + dx).toFixed(1)},${(y0 + dy).toFixed(1)})`);
  };
  const up = (e: PointerEvent) => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    if (!moved) return;                                  // a press that did not move is a click, handled elsewhere
    write(moveNode(id, view, x0 + (e.clientX - sx) * per, y0 + (e.clientY - sy) * per));
    redraw();
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
