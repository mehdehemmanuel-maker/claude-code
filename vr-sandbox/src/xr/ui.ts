// The tablet's layout engine: a page is a tree of nodes (text, buttons, slots, rows, columns, grids) laid out by one
// pass that measures and one that draws, never by hand-placed pixels. A row shares its width among its children by
// their grow weights; a column stacks; a wrap flows chips onto as many lines as they need; a grid pages its items to
// what fits above the bottom. Every button is also a hit box (a widget) the ray can tap. Theme tokens live here too,
// so the whole UI reads as one thing.

import type { Item } from './icons';

export const T = {
  bg: 'rgba(20,23,28,0.95)', edge: 'rgba(255,255,255,0.10)', line: 'rgba(255,255,255,0.08)',
  ink: '#e8ecf1', muted: '#9aa4af', dim: '#6f7883',
  accent: '#ffb347', blue: '#66b3ff', ego: '#8fd3ff', green: '#4dd68c', amber: '#ffc14d', red: '#ff5b4d', orange: '#ff9b73',
  face: 'rgba(255,255,255,0.07)', faceOn: 'rgba(255,179,71,0.24)', slot: 'rgba(0,0,0,0.30)', slotOn: 'rgba(255,179,71,0.22)',
  egoFill: 'rgba(143,211,255,0.10)', warnFill: 'rgba(255,193,77,0.12)', breakFill: 'rgba(255,91,77,0.12)',
  font: 'system-ui, sans-serif', mono: 'ui-monospace, monospace',
};

export type Tone = 'accent' | 'danger' | 'ego' | 'quiet';

export interface Widget { id: string; x: number; y: number; w: number; h: number; onClick: () => void }

interface Sized { w?: number; grow?: number }

export type Node =
  | ({ t: 'text'; s: string; size: number; color: string; weight: string; align: CanvasTextAlign; lines: number; mono: boolean } & Sized)
  | ({ t: 'button'; id: string; label: string; onClick: () => void; sub?: string; on?: boolean; tone?: Tone; h: number; auto: boolean; small: boolean } & Sized)
  | ({ t: 'slot'; id: string; item: Item; label: string; onClick: () => void; h: number; compact: boolean; on: boolean } & Sized)
  | ({ t: 'row'; children: Node[]; gap: number; h?: number } & Sized)
  | ({ t: 'col'; children: Node[]; gap: number } & Sized)
  | ({ t: 'wrap'; children: Node[]; gap: number } & Sized)
  | ({ t: 'box'; children: Node[]; gap: number; pad: number; fill: string; stroke?: string; radius: number } & Sized)
  | ({ t: 'bar'; value: number; color: string; h: number; label?: string } & Sized)
  | ({ t: 'gap'; h: number } & Sized)
  | ({ t: 'grid'; id: string; items: Node[]; cols: number; rowH: number; gap: number; page: number; setPage: (p: number) => void } & Sized)
  | ({ t: 'draw'; h: number; paint: (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void } & Sized);

// ---- constructors --------------------------------------------------------------------------------------------------

export const text = (s: string, o: Partial<{ size: number; color: string; weight: string; align: CanvasTextAlign; lines: number; mono: boolean; w: number; grow: number }> = {}): Node =>
  ({ t: 'text', s, size: o.size ?? 22, color: o.color ?? T.ink, weight: o.weight ?? '400', align: o.align ?? 'left', lines: o.lines ?? 1, mono: o.mono ?? false, w: o.w, grow: o.grow });
export const btn = (id: string, label: string, onClick: () => void, o: Partial<{ sub: string; on: boolean; tone: Tone; h: number; w: number; grow: number; auto: boolean; small: boolean }> = {}): Node =>
  ({ t: 'button', id, label, onClick, sub: o.sub, on: o.on, tone: o.tone, h: o.h ?? (o.sub ? 64 : o.small ? 44 : 56), w: o.w, grow: o.grow, auto: o.auto ?? false, small: o.small ?? false });
export const slot = (id: string, item: Item, label: string, onClick: () => void, o: Partial<{ h: number; w: number; grow: number; compact: boolean; on: boolean }> = {}): Node =>
  ({ t: 'slot', id, item, label, onClick, h: o.h ?? 132, w: o.w, grow: o.grow, compact: o.compact ?? false, on: o.on ?? false });
export const row = (children: Node[], o: Partial<{ gap: number; h: number; w: number; grow: number }> = {}): Node => ({ t: 'row', children, gap: o.gap ?? 8, h: o.h, w: o.w, grow: o.grow });
export const col = (children: Node[], o: Partial<{ gap: number; w: number; grow: number }> = {}): Node => ({ t: 'col', children, gap: o.gap ?? 8, w: o.w, grow: o.grow });
export const wrap = (children: Node[], o: Partial<{ gap: number; w: number; grow: number }> = {}): Node => ({ t: 'wrap', children, gap: o.gap ?? 8, w: o.w, grow: o.grow });
export const box = (children: Node[], o: Partial<{ gap: number; pad: number; fill: string; stroke: string; radius: number; w: number; grow: number }> = {}): Node =>
  ({ t: 'box', children, gap: o.gap ?? 8, pad: o.pad ?? 14, fill: o.fill ?? T.face, stroke: o.stroke, radius: o.radius ?? 14, w: o.w, grow: o.grow });
export const bar = (value: number, color: string, o: Partial<{ h: number; label: string; w: number; grow: number }> = {}): Node => ({ t: 'bar', value, color, h: o.h ?? 18, label: o.label, w: o.w, grow: o.grow });
export const gap = (h: number): Node => ({ t: 'gap', h });
export const grid = (id: string, items: Node[], o: { cols: number; rowH: number; gap?: number; page: number; setPage: (p: number) => void }): Node =>
  ({ t: 'grid', id, items, cols: o.cols, rowH: o.rowH, gap: o.gap ?? 8, page: o.page, setPage: o.setPage });
export const draw = (h: number, paint: (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void): Node => ({ t: 'draw', h, paint });

/** Chips: one chosen among labels, wrapping onto more lines when they do not fit. */
export const chips = (prefix: string, labels: string[], current: string, set: (l: string) => void): Node =>
  wrap(labels.map((l) => btn(`${prefix}-${l}`, l, () => set(l), { on: current === l, small: true, auto: true })));

// ---- the engine ----------------------------------------------------------------------------------------------------

export interface Paint {
  g: CanvasRenderingContext2D;
  /** Draw an item's icon (a part, a material, a joint, a tool) in a square of side s. */
  icon: (g: CanvasRenderingContext2D, item: Item, x: number, y: number, s: number) => void;
}

const LINE = 1.3;
const PAGER = 56;

export function font(g: CanvasRenderingContext2D, size: number, weight = '400', mono = false) {
  g.font = `${weight} ${size}px ${mono ? T.mono : T.font}`;
}

/** Words into at most `max` lines of `width`; the last line ends in an ellipsis when the text runs on. */
export function wrapText(g: CanvasRenderingContext2D, s: string, width: number, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of s.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (g.measureText(next).width <= width || !cur) { cur = next; continue; }
    out.push(cur);
    cur = word;
  }
  if (cur) out.push(cur);
  if (out.length > max) {
    let last = out.slice(max - 1).join(' ');
    while (last && g.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    out.splice(max - 1, out.length, `${last.trimEnd()}…`);
  }
  return out;
}

export function fit(g: CanvasRenderingContext2D, s: string, w: number): string {
  if (g.measureText(s).width <= w) return s;
  let t = s;
  while (t.length > 1 && g.measureText(`${t}…`).width > w) t = t.slice(0, -1);
  return `${t}…`;
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** The natural width of a node that has one (an auto button); null when it takes what it is given. */
function naturalWidth(p: Paint, n: Node): number | null {
  if (n.w !== undefined) return n.w;
  if (n.t === 'button' && n.auto) { font(p.g, n.small ? 20 : 24, '600'); return Math.ceil(p.g.measureText(n.label).width) + 36; }
  return null;
}

/** Widths of a row's children: fixed ones as given, the rest sharing what is left by grow weight. */
function rowWidths(p: Paint, n: Extract<Node, { t: 'row' }>, w: number): number[] {
  const fixed = n.children.map((c) => naturalWidth(p, c));
  const free = w - n.gap * Math.max(0, n.children.length - 1) - fixed.reduce<number>((s, x) => s + (x ?? 0), 0);
  const weights = n.children.map((c, i) => (fixed[i] === null ? (c.grow ?? 1) : 0));
  const total = weights.reduce((s, x) => s + x, 0) || 1;
  return n.children.map((_, i) => fixed[i] ?? Math.max(0, (free * weights[i]!) / total));
}

/** Where a wrap puts each child: its line and x, and the lines' heights. */
function wrapLayout(p: Paint, n: Extract<Node, { t: 'wrap' }>, w: number, y: number, bottom: number): { at: { x: number; y: number; w: number; h: number }[]; h: number } {
  const at: { x: number; y: number; w: number; h: number }[] = [];
  let x = 0, ly = 0, lineH = 0;
  for (const c of n.children) {
    const cw = Math.min(w, naturalWidth(p, c) ?? w);
    const ch = measure(p, c, cw, y + ly, bottom);
    if (x > 0 && x + cw > w) { x = 0; ly += lineH + n.gap; lineH = 0; }
    at.push({ x, y: ly, w: cw, h: ch });
    x += cw + n.gap;
    lineH = Math.max(lineH, ch);
  }
  return { at, h: n.children.length ? ly + lineH : 0 };
}

function gridPages(n: Extract<Node, { t: 'grid' }>, y: number, bottom: number): { perPage: number; pages: number; rows: number } {
  const avail = bottom - y;
  const need = Math.ceil(n.items.length / n.cols);
  // everything fits without a pager: one page, as many rows as the items need
  const rows1 = Math.max(1, Math.floor((avail + n.gap) / (n.rowH + n.gap)));
  if (need <= rows1) return { perPage: Math.max(1, need) * n.cols, pages: 1, rows: need };
  const rows = Math.max(1, Math.floor((avail - PAGER) / (n.rowH + n.gap)));
  return { perPage: rows * n.cols, pages: Math.ceil(n.items.length / (rows * n.cols)), rows };
}

/**
 * For each child of a column, the room its followers need below it: a grid pages to the bottom less this, so what
 * comes after it in the column still fits above the bottom instead of spilling under the foot. Followers are measured
 * with the full bottom (a second grid in one column takes what the first leaves).
 */
/** Whether a node pages (a grid), or holds one: only those take a bottom reduced by their followers. */
function pages(n: Node): boolean {
  switch (n.t) {
    case 'grid': return true;
    case 'row': case 'col': case 'wrap': case 'box': return n.children.some(pages);
    default: return false;
  }
}

function roomAfter(p: Paint, children: Node[], gapPx: number, w: number, bottom: number): number[] {
  const after = new Array<number>(children.length).fill(0);
  let acc = 0;
  for (let i = children.length - 1; i >= 0; i--) {
    after[i] = acc;
    acc += (children[i]!.t === 'grid' ? 0 : measure(p, children[i]!, w, 0, bottom)) + (i ? gapPx : 0);
  }
  return after;
}

/** The height a node takes at width w, starting at y, with the page's bottom (grids page to it). */
export function measure(p: Paint, n: Node, w: number, y: number, bottom: number): number {
  switch (n.t) {
    case 'text': { font(p.g, n.size, n.weight, n.mono); return wrapText(p.g, n.s, w, n.lines).length * n.size * LINE; }
    case 'button': case 'slot': case 'bar': case 'gap': case 'draw': return n.h;
    case 'row': {
      if (n.h !== undefined) return n.h;
      const ws = rowWidths(p, n, w);
      return n.children.reduce((m, c, i) => Math.max(m, measure(p, c, ws[i]!, y, bottom)), 0);
    }
    case 'col': {
      const after = roomAfter(p, n.children, n.gap, w, bottom);
      return n.children.reduce((s, c, i) => s + (i ? n.gap : 0) + measure(p, c, w, y + s + (i ? n.gap : 0), pages(c) ? bottom - after[i]! : bottom), 0);
    }
    case 'wrap': return wrapLayout(p, n, w, y, bottom).h;
    case 'box': { const inner = measure(p, { t: 'col', children: n.children, gap: n.gap }, w - 2 * n.pad, y + n.pad, bottom - n.pad); return inner + 2 * n.pad; }
    case 'grid': {
      const { pages, rows } = gridPages(n, y, bottom);
      const body = n.items.length ? rows * n.rowH + (rows - 1) * n.gap : 0;
      return body + (pages > 1 ? n.gap + PAGER : 0);
    }
  }
}

/** Draw a node at (x, y) in width w; widgets for every tappable thing go into `out`. Returns the height drawn. */
export function render(p: Paint, n: Node, x: number, y: number, w: number, bottom: number, out: Widget[]): number {
  const g = p.g;
  switch (n.t) {
    case 'text': {
      font(g, n.size, n.weight, n.mono);
      g.fillStyle = n.color;
      g.textAlign = n.align;
      g.textBaseline = 'top';
      const lines = wrapText(g, n.s, w, n.lines);
      const lx = n.align === 'center' ? x + w / 2 : n.align === 'right' ? x + w : x;
      lines.forEach((l, i) => g.fillText(l, lx, y + i * n.size * LINE + n.size * 0.12));
      return lines.length * n.size * LINE;
    }
    case 'button': {
      const h = n.h;
      if (y + h > bottom + 0.5) return h;
      g.fillStyle = n.on ? T.faceOn : n.tone === 'quiet' ? 'rgba(255,255,255,0.03)' : T.face;
      roundRect(g, x, y, w, h, 12);
      g.fill();
      g.strokeStyle = n.on ? T.accent : n.tone === 'danger' ? 'rgba(255,91,77,0.7)' : n.tone === 'accent' ? T.blue : n.tone === 'ego' ? T.ego : T.edge;
      g.lineWidth = n.on ? 3 : 2;
      g.stroke();
      g.fillStyle = n.tone === 'quiet' ? T.muted : T.ink;
      font(g, n.small ? 20 : n.sub ? 23 : 25, '600');
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(fit(g, n.label, w - 16), x + w / 2, y + h / 2 - (n.sub ? 11 : 0));
      if (n.sub) {
        font(g, 18);
        g.fillStyle = T.muted;
        g.fillText(fit(g, n.sub, w - 16), x + w / 2, y + h / 2 + 16);
      }
      out.push({ id: n.id, x, y, w, h, onClick: n.onClick });
      return h;
    }
    case 'slot': {
      const h = n.h;
      if (y + h > bottom + 0.5) return h;
      g.fillStyle = n.on ? T.slotOn : T.slot;
      roundRect(g, x, y, w, h, 10);
      g.fill();
      g.strokeStyle = n.on ? T.accent : T.edge;
      g.lineWidth = n.on ? 3 : 2;
      g.stroke();
      const s = n.compact ? h - 28 : Math.min(w - 24, h - 48);
      p.icon(g, n.item, x + (w - s) / 2, y + (n.compact ? 2 : 6), s);
      g.fillStyle = n.on ? '#ffd9a0' : T.ink;
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      if (n.compact) {
        font(g, 15, '600');
        g.fillText(fit(g, n.label, w - 8), x + w / 2, y + h - 8);
      } else {
        font(g, 17, '600');
        const [a, b] = twoLines(g, n.label, w - 12);
        g.fillText(fit(g, a, w - 10), x + w / 2, y + h - (b ? 28 : 12));
        if (b) g.fillText(fit(g, b, w - 10), x + w / 2, y + h - 8);
      }
      out.push({ id: n.id, x, y, w, h, onClick: n.onClick });
      return h;
    }
    case 'row': {
      const ws = rowWidths(p, n, w);
      const h = n.h ?? measure(p, n, w, y, bottom);
      let cx = x;
      n.children.forEach((c, i) => {
        const cw = ws[i]!;
        // a button or slot stretches to the row; text sits at the top
        if (c.t === 'button' || c.t === 'slot') render(p, { ...c, h }, cx, y, cw, bottom, out);
        else render(p, c, cx, y, cw, bottom, out);
        cx += cw + n.gap;
      });
      return h;
    }
    case 'col': {
      // a grid pages to the room its followers leave; everything else keeps the real bottom, so an overflowing column
      // loses its last rows, never its first
      const after = roomAfter(p, n.children, n.gap, w, bottom);
      let cy = y;
      n.children.forEach((c, i) => { if (i) cy += n.gap; cy += render(p, c, x, cy, w, pages(c) ? bottom - after[i]! : bottom, out); });
      return cy - y;
    }
    case 'wrap': {
      const { at, h } = wrapLayout(p, n, w, y, bottom);
      n.children.forEach((c, i) => { const a = at[i]!; render(p, c, x + a.x, y + a.y, a.w, bottom, out); });
      return h;
    }
    case 'box': {
      const h = measure(p, n, w, y, bottom);
      g.fillStyle = n.fill;
      roundRect(g, x, y, w, h, n.radius);
      g.fill();
      if (n.stroke) { g.strokeStyle = n.stroke; g.lineWidth = 2; g.stroke(); }
      render(p, { t: 'col', children: n.children, gap: n.gap }, x + n.pad, y + n.pad, w - 2 * n.pad, bottom - n.pad, out);
      return h;
    }
    case 'bar': {
      g.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(g, x, y, w, n.h, n.h / 2);
      g.fill();
      const v = Math.max(0, Math.min(1, n.value));
      if (v > 0) { g.fillStyle = n.color; roundRect(g, x, y, Math.max(n.h, w * v), n.h, n.h / 2); g.fill(); }
      if (n.label) {
        font(g, Math.max(14, n.h - 4), '600');
        g.fillStyle = T.ink;
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillText(fit(g, n.label, w - 16), x + 10, y + n.h / 2 + 1);
      }
      return n.h;
    }
    case 'gap': return n.h;
    case 'draw': n.paint(g, x, y, w, n.h); return n.h;
    case 'grid': {
      const { perPage, pages, rows } = gridPages(n, y, bottom);
      const page = Math.min(n.page, pages - 1);
      const cw = (w - (n.cols - 1) * n.gap) / n.cols;
      n.items.slice(page * perPage, (page + 1) * perPage).forEach((it, i) => {
        const cx = x + (i % n.cols) * (cw + n.gap), cy = y + Math.floor(i / n.cols) * (n.rowH + n.gap);
        render(p, it.t === 'button' || it.t === 'slot' ? { ...it, h: n.rowH } : it, cx, cy, cw, bottom, out);
      });
      const body = n.items.length ? rows * n.rowH + (rows - 1) * n.gap : 0;
      if (pages > 1) {
        const py = y + body + n.gap;
        render(p, row([
          text(`${page + 1} / ${pages}`, { color: T.muted, size: 20 }),
          btn(`${n.id}-prev`, '◀', () => n.setPage(Math.max(0, page - 1)), { w: 110, h: PAGER - 8 }),
          btn(`${n.id}-next`, '▶', () => n.setPage(Math.min(pages - 1, page + 1)), { w: 110, h: PAGER - 8 }),
        ], { h: PAGER - 8 }), x, py + 4, w, bottom, out);
        return body + n.gap + PAGER;
      }
      return body;
    }
  }
}

/** A label on at most two lines: the first takes what fits, the rest goes below. */
function twoLines(g: CanvasRenderingContext2D, label: string, w: number): [string, string] {
  let a = '', b = '';
  for (const wd of label.split(' ')) {
    if (!b && g.measureText(a ? `${a} ${wd}` : wd).width <= w) a = a ? `${a} ${wd}` : wd;
    else b = b ? `${b} ${wd}` : wd;
  }
  return [a, b];
}
