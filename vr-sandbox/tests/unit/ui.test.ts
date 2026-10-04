// The tablet's layout engine (src/xr/ui.ts): a page is a tree, laid out by measure and draw, never by hand. The
// invariants a menu needs: every tappable thing gets a hit box inside its parent's width, no two overlap, a row shares
// its width by weight, a grid pages to what fits and never draws past the bottom, chips wrap instead of running off.

import { describe, expect, it } from 'vitest';
import { bar, box, btn, chips, col, grid, measure, render, row, slot, text, wrap, type Node, type Paint, type Widget } from '../../src/xr/ui';

/** A 2D context that measures text as 10 px a character and records nothing: the engine needs its metrics only. */
function fakeContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  const g = {
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: 'left', textBaseline: 'top', globalAlpha: 1,
    measureText: (s: string) => ({ width: s.length * 10 }),
    fillText: noop, beginPath: noop, moveTo: noop, lineTo: noop, arcTo: noop, closePath: noop, fill: noop, stroke: noop, save: noop, restore: noop, rect: noop, clip: noop, clearRect: noop, fillRect: noop,
  };
  return g as unknown as CanvasRenderingContext2D;
}
const paint = (): Paint => ({ g: fakeContext(), icon: () => undefined });
const draw = (n: Node, w = 984, bottom = 700): { h: number; widgets: Widget[] } => { const widgets: Widget[] = []; const h = render(paint(), n, 20, 100, w, bottom, widgets); return { h, widgets }; };
const overlap = (a: Widget, b: Widget) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('the layout engine', () => {
  it('a row shares its width by weight around fixed children, and its buttons stretch to its height', () => {
    const { h, widgets } = draw(row([btn('a', 'A', () => undefined), btn('b', 'B', () => undefined, { grow: 2 }), btn('c', 'C', () => undefined, { w: 100 })], { h: 60, gap: 8 }));
    expect(h).toBe(60);
    const [a, b, c] = widgets as [Widget, Widget, Widget];
    expect(c.w).toBe(100);
    expect(b.w).toBeCloseTo(2 * a.w, 9);
    expect(a.w + b.w + c.w + 16).toBeCloseTo(984, 9);
    expect(widgets.every((x) => x.h === 60)).toBe(true);
    expect(a.x).toBe(20);
    expect(c.x + c.w).toBeCloseTo(20 + 984, 9);
  });

  it('a column stacks with its gap; a box pads what it holds; text takes as many lines as it needs, up to its limit', () => {
    const p = paint();
    const long = 'a'.repeat(50) + ' ' + 'b'.repeat(50) + ' ' + 'c'.repeat(50);
    expect(measure(p, text(long, { size: 20, lines: 3 }), 600, 0, 1000)).toBeCloseTo(3 * 20 * 1.3, 9);
    expect(measure(p, text(long, { size: 20, lines: 2 }), 600, 0, 1000)).toBeCloseTo(2 * 20 * 1.3, 9);
    expect(measure(p, col([btn('a', 'A', () => undefined, { h: 50 }), btn('b', 'B', () => undefined, { h: 50 })], { gap: 10 }), 600, 0, 1000)).toBe(110);
    expect(measure(p, box([bar(0.5, '#fff', { h: 20 })], { pad: 14 }), 600, 0, 1000)).toBe(48);
  });

  it('chips wrap onto new lines instead of running off the page, and every chip is a hit box inside the width', () => {
    const labels = Array.from({ length: 12 }, (_, i) => `category number ${i}`);
    const { h, widgets } = draw(chips('c', labels, labels[3]!, () => undefined), 600);
    expect(widgets).toHaveLength(12);
    expect(widgets.every((w) => w.x >= 20 && w.x + w.w <= 620)).toBe(true);
    const lines = new Set(widgets.map((w) => w.y));
    expect(lines.size).toBeGreaterThan(1);
    expect(h).toBeCloseTo(lines.size * 44 + (lines.size - 1) * 8, 9);
    for (let i = 0; i < widgets.length; i++) for (let j = i + 1; j < widgets.length; j++) expect(overlap(widgets[i]!, widgets[j]!)).toBe(false);
  });

  it('a grid pages to what fits above the bottom: no item drawn past it, a pager only when needed, and the page bounded', () => {
    const items = Array.from({ length: 40 }, (_, i) => slot(`s${i}`, { type: 'part', id: 'block' }, `item ${i}`, () => undefined));
    let page = 7;
    const g = grid('g', items, { cols: 6, rowH: 150, gap: 8, page, setPage: (p) => { page = p; } });
    const { h, widgets } = draw(g, 984, 700);
    const slots = widgets.filter((w) => w.id.startsWith('s'));
    expect(slots.length).toBeLessThanOrEqual(18);
    expect(slots.every((w) => w.y + w.h <= 700)).toBe(true);
    expect(widgets.some((w) => w.id === 'g-next')).toBe(true);
    expect(h).toBeLessThanOrEqual(600);
    // the pager's next from the last page stays on it
    widgets.find((w) => w.id === 'g-next')!.onClick();
    expect(page).toBeLessThanOrEqual(Math.ceil(40 / slots.length) - 1);
    // everything fits: no pager
    const few = draw(grid('f', items.slice(0, 6), { cols: 6, rowH: 150, gap: 8, page: 0, setPage: () => undefined }), 984, 700);
    expect(few.widgets.some((w) => w.id.startsWith('f-'))).toBe(false);
    expect(few.h).toBe(150);
  });

  it('a grid followed by rows in one column leaves them room: nothing spills past the bottom into a foot', () => {
    const items = Array.from({ length: 30 }, (_, i) => btn(`t${i}`, `tool ${i}`, () => undefined));
    const page = col([
      chips('c', ['Tools', 'Parts'], 'Tools', () => undefined),
      grid('g', items, { cols: 4, rowH: 92, gap: 8, page: 0, setPage: () => undefined }),
      row([btn('act', 'Turn 90°', () => undefined, { small: true })], { h: 48 }),
      text('A hint about the tool on up to two lines of text that wraps around the width of the page', { size: 19, lines: 2 }),
      row([btn('lock', 'Grid lock', () => undefined, { small: true }), btn('snap', 'Smart snap', () => undefined, { small: true })], { h: 48 }),
    ], { gap: 8 });
    const bottom = 600;
    const { h, widgets } = draw(page, 984, bottom);
    expect(100 + h).toBeLessThanOrEqual(bottom + 1e-6);
    expect(widgets.every((w) => w.y + w.h <= bottom + 1e-6)).toBe(true);
    expect(widgets.some((w) => w.id === 'lock')).toBe(true);
    expect(widgets.some((w) => w.id === 'g-next')).toBe(true);
    for (let i = 0; i < widgets.length; i++) for (let j = i + 1; j < widgets.length; j++) expect(overlap(widgets[i]!, widgets[j]!), `${widgets[i]!.id} vs ${widgets[j]!.id}`).toBe(false);
    // too little room for even one row and a pager: what would end past the bottom is neither drawn nor tappable
    const cramped = draw(page, 984, 446);
    expect(cramped.widgets.every((w) => w.y + w.h <= 446 + 0.5)).toBe(true);
    expect(cramped.widgets.some((w) => w.id === 'c-Tools')).toBe(true);
  });

  it('a column of fixed rows that overflows loses its last rows to the bottom, never its first', () => {
    const rows = Array.from({ length: 8 }, (_, i) => row([btn(`r${i}`, `row ${i}`, () => undefined)], { h: 50 }));
    const { widgets } = draw(col(rows, { gap: 8 }), 984, 100 + 4 * 58 + 20);
    expect(widgets.map((w) => w.id)).toEqual(['r0', 'r1', 'r2', 'r3']);
  });

  it('a whole page: widgets never overlap and all sit inside the page', () => {
    const page = col([
      row([btn('t1', 'One', () => undefined, { sub: 'first' }), btn('t2', 'Two', () => undefined, { sub: 'second' }), btn('t3', 'Three', () => undefined, { sub: 'third' })], { h: 68 }),
      wrap([btn('w1', 'alpha', () => undefined, { auto: true, small: true }), btn('w2', 'beta', () => undefined, { auto: true, small: true })]),
      box([text('A box with a line of text', { size: 20 }), row([btn('b1', 'Yes', () => undefined, { small: true }), btn('b2', 'No', () => undefined, { small: true })], { h: 44 })]),
      grid('pg', Array.from({ length: 9 }, (_, i) => btn(`g${i}`, `cell ${i}`, () => undefined)), { cols: 3, rowH: 60, gap: 8, page: 0, setPage: () => undefined }),
    ], { gap: 8 });
    const { h, widgets } = draw(page, 984, 700);
    expect(widgets.length).toBe(3 + 2 + 2 + 9);
    expect(widgets.every((w) => w.x >= 20 && w.x + w.w <= 1004 + 1e-6 && w.y >= 100 && w.y + w.h <= 100 + h + 1e-6)).toBe(true);
    for (let i = 0; i < widgets.length; i++) for (let j = i + 1; j < widgets.length; j++) expect(overlap(widgets[i]!, widgets[j]!), `${widgets[i]!.id} vs ${widgets[j]!.id}`).toBe(false);
  });
});
