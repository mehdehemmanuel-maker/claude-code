// The finish stage of the image tool (finish-styles-text): the styles registry (tools/image/styles.mjs) and the
// bitmap text (tools/image/text.mjs over tools/image/font.mjs). Every style keeps the picture's size and its values in
// [0, 1] and paints the same bytes twice; mono is grey; an unknown style is an Error that names the styles; the font
// draws exactly its bitmap plus a halo ring; a caption goes in the third of the picture that holds no thing.
import { describe, expect, it } from 'vitest';
import { paint, read, styles } from '../../tools/image.mjs';
import type { Layout, ThingBox } from '../../tools/image.mjs';
import { FONT, GLYPH_H, GLYPH_W, glyph, measure } from '../../tools/image/font.mjs';
import { HALO, drawText, fitText, placeText, textScale } from '../../tools/image/text.mjs';

const LAKE = read('a mountain lake');
const inRange = (data: Float32Array) => {
  for (const v of data) if (!(v >= 0 && v <= 1)) return false; // NaN fails both comparisons
  return true;
};

/** A scratch context: a grey W×H buffer, put() as core.mjs defines it, an empty layout. */
function scratch(W: number, H: number, things: ThingBox[] = []) {
  const data = new Float32Array(W * H * 3).fill(0.5);
  const layout: Layout = { horizon: 0.58, sun: [0.5, 0.3], shore: null, things };
  const put = (x: number, y: number, c: ArrayLike<number>, a = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = ((y | 0) * W + (x | 0)) * 3;
    for (let k = 0; k < 3; k++) data[i + k] = data[i + k]! + (c[k]! - data[i + k]!) * a;
  };
  return { W, H, data, layout, put };
}

describe('the styles registry', () => {
  it('has at least seven entries, the named ones among them, each with a word matcher and an apply', () => {
    const ids = styles.map((s) => s.id);
    expect(ids.length).toBeGreaterThanOrEqual(7);
    for (const id of ['pixel', 'poster', 'minimalist', 'sketch', 'watercolour', 'mono', 'sepia']) {
      expect(ids, id).toContain(id);
    }
    for (const s of styles) {
      expect(s.match).toBeInstanceOf(RegExp);
      expect(s.match.test(s.id), `${s.id} matches its own name`).toBe(true);
      expect(typeof s.apply).toBe('function');
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('applied at 160x90 keeps width and height, every value finite in [0, 1], and paints the same twice', () => {
    for (const s of styles) {
      const a = paint(LAKE, { width: 160, height: 90, seed: 4, style: s.id });
      const b = paint(LAKE, { width: 160, height: 90, seed: 4, style: s.id });
      expect([a.width, a.height], s.id).toEqual([160, 90]);
      expect(a.data.length, s.id).toBe(160 * 90 * 3);
      expect(inRange(a.data), `${s.id} in range`).toBe(true);
      expect(Buffer.from(a.data.buffer).equals(Buffer.from(b.data.buffer)), `${s.id} deterministic`).toBe(true);
    }
  });

  it('survives tiny and odd sizes', () => {
    for (const s of styles) {
      for (const [w, h] of [[1, 1], [3, 2], [7, 5], [40, 3]] as const) {
        const img = paint(LAKE, { width: w, height: h, seed: 2, style: s.id });
        expect(img.data.length, `${s.id} ${w}x${h}`).toBe(w * h * 3);
        expect(inRange(img.data), `${s.id} ${w}x${h}`).toBe(true);
      }
    }
  });

  it('mono gives r = g = b everywhere; pixel gives few colours on a coarse grid', () => {
    const mono = paint(LAKE, { width: 160, height: 90, seed: 4, style: 'mono' });
    for (let i = 0; i < mono.data.length; i += 3) {
      if (mono.data[i] !== mono.data[i + 1] || mono.data[i] !== mono.data[i + 2]) {
        throw new Error(`pixel ${i / 3} is not grey`);
      }
    }
    const pix = paint(LAKE, { width: 160, height: 90, seed: 4, style: 'pixel' });
    const colours = new Set<string>();
    for (let i = 0; i < pix.data.length; i += 3) colours.add(`${pix.data[i]},${pix.data[i + 1]},${pix.data[i + 2]}`);
    expect(colours.size).toBeLessThanOrEqual(16);
    expect(colours.size).toBeGreaterThan(4);
    const cell = 2; // max(2, round(90 / 90))
    for (let y = 0; y < 90; y += cell) { // every cell one flat colour
      for (let x = 0; x < 160; x += cell) {
        const i = (y * 160 + x) * 3, j = ((y + 1) * 160 + x + 1) * 3;
        expect(pix.data[i]).toBe(pix.data[j]);
      }
    }
  });

  it('throws for an unknown style, naming the styles there are', () => {
    expect(() => paint(LAKE, { width: 16, height: 9, style: 'neon' })).toThrow(/neon/);
    expect(() => paint(LAKE, { width: 16, height: 9, style: 'neon' })).toThrow(/pixel.*sketch.*mono/);
    expect(() => paint({ ...LAKE, style: 'neon' }, { width: 16, height: 9 })).toThrow(/pixel/);
  });

  it('matches the words a prompt would carry', () => {
    const byWord = (w: string) => styles.find((s) => s.match.test(w))?.id;
    expect(byWord('watercolor')).toBe('watercolour');
    expect(byWord('pixelated')).toBe('pixel');
    expect(byWord('pencil')).toBe('sketch');
    expect(byWord('grayscale')).toBe('mono');
    expect(byWord('retro')).toBe('vintage');
    expect(byWord('lake')).toBeUndefined();
  });
});

describe('the bitmap text', () => {
  it('reads a sound font: 95 glyphs of 7 rows under 32, only the space blank, letters and digits distinct', () => {
    expect(FONT.length).toBe(95 * 9);
    const seen = new Map<string, string>();
    for (let code = 32; code <= 126; code++) {
      const ch = String.fromCharCode(code), rows = glyph(ch);
      expect(rows.length, ch).toBe(GLYPH_H);
      for (const r of rows) expect(r >= 0 && r < 32 && Number.isInteger(r), ch).toBe(true);
      expect(rows.every((r) => r === 0), `${JSON.stringify(ch)} blank`).toBe(ch === ' ');
      if (/[A-Z0-9]/.test(ch)) {
        expect(seen.has(rows.join()), `${ch} same as ${seen.get(rows.join())}`).toBe(false);
        seen.set(rows.join(), ch);
      }
    }
    expect(glyph('é')).toEqual(glyph('?'));
    expect(measure('HELLO', 2)).toEqual({ width: 58, height: 14 });
    expect(textScale(540)).toBe(3);
    expect(textScale(90)).toBe(2);
  });

  it("drawText('A') at scale 1 sets exactly the glyph's pixels, ringed by the halo, and nothing else", () => {
    const ctx = scratch(16, 16), rows = glyph('A'), x0 = 5, y0 = 4;
    drawText(ctx, 'A', { x: x0, y: y0, scale: 1, colour: [1, 1, 1] });
    const ink = new Set<string>();
    for (let r = 0; r < GLYPH_H; r++) {
      for (let c = 0; c < GLYPH_W; c++) if (rows[r]! & (16 >> c)) ink.add(`${x0 + c},${y0 + r}`);
    }
    expect(ink.size).toBeGreaterThan(5);
    const halo = new Set<string>();
    for (const k of ink) {
      const [x, y] = k.split(',').map(Number) as [number, number];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) if (!ink.has(`${x + dx},${y + dy}`)) halo.add(`${x + dx},${y + dy}`);
      }
    }
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const i = (y * 16 + x) * 3, got = [ctx.data[i], ctx.data[i + 1], ctx.data[i + 2]], k = `${x},${y}`;
        const want = ink.has(k) ? [1, 1, 1] : halo.has(k) ? HALO : [0.5, 0.5, 0.5];
        expect(got, `pixel ${k}`).toEqual([...Float32Array.from(want)]); // the buffer holds float32
      }
    }
  });

  it('places a caption in the third without things, bottom by default, and wraps or truncates to fit', () => {
    const W = 320, H = 180;
    const free = placeText(scratch(W, H), 'HELLO');
    expect(free.at).toBe('bottom');
    expect(free.lines).toEqual(['HELLO']);
    expect(free.truncated).toBe(false);
    expect(free.y).toBeGreaterThan((2 * H) / 3);
    expect(Math.abs(free.x + free.w / 2 - W / 2)).toBeLessThanOrEqual(1); // centred
    const low = placeText(scratch(W, H, [{ kind: 'car', x: 100, y: 140, w: 80, h: 30 }]), 'HELLO');
    expect(low.at).toBe('top');
    expect(low.y + low.h).toBeLessThan(H / 3);
    const high = placeText(scratch(W, H, [{ kind: 'bird', x: 10, y: 10, w: 20, h: 5 }]), 'HELLO');
    expect(high.at).toBe('bottom');
    const sixty = 'The quick brown fox jumps over the lazy dog by the shore at dusk';
    const wrapped = placeText(scratch(960, 540), sixty);
    expect(wrapped.lines.length).toBe(2);
    expect(wrapped.truncated).toBe(false);
    expect(wrapped.w).toBeLessThanOrEqual(0.9 * 960);
    const cut = placeText(scratch(W, H), sixty);
    expect(cut.truncated).toBe(true);
    expect(cut.lines.length).toBe(2);
    expect(cut.lines[1]!.endsWith('...')).toBe(true);
    expect(measure(cut.lines[1]!, textScale(H)).width).toBeLessThanOrEqual(0.9 * W);
    expect(fitText('ab', 2, 5)).toEqual({ lines: [], truncated: true }); // nothing fits: say so, draw nothing
    expect(fitText('   ', 2, 500)).toEqual({ lines: [], truncated: false });
  });

  it('paints the caption from paint() options or scene.text, after the style, and records it in the layout', () => {
    const img = paint(read('a sunset over the sea'), { width: 160, height: 90, seed: 1, text: 'HELLO', style: 'mono' });
    expect(img.layout.text?.lines).toEqual(['HELLO']);
    let white = 0;
    for (let i = 0; i < img.data.length; i += 3) if (img.data[i] === 1 && img.data[i + 1] === 1) white++;
    expect(white).toBeGreaterThan(40); // the ink survived the style: drawn after it
    const fromScene = paint({ ...read('a lake'), text: 'Nexus' }, { width: 160, height: 90, seed: 1 });
    expect(fromScene.layout.text?.at).toBe('bottom');
    expect(paint(read('a lake'), { width: 160, height: 90, seed: 1 }).layout.text).toBeUndefined();
  });
});
