// The image tool (tools/image.mjs and tools/image/*): the same words paint the same picture, the PNG it writes is a
// PNG, any size paints without a crash, the core has nothing of Node in it, the layout does not move with the size,
// and it stays fast enough to use from a shell.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { crc32 } from '../../src/persistence/codec';
import { paint, png, read } from '../../tools/image.mjs';

const WORDS = 'a red car on a wet road at sunset, mountains, trees, a house, a boat, birds';
const bytes = (prompt: string, width: number, height: number, seed?: number) =>
  png(paint(read(prompt), { width, height, seed }));
const chunks = (file: Buffer) => { // every chunk: its type, its body, its stored CRC and the CRC of type + body
  const out: { type: string; body: Buffer; stored: number; actual: number }[] = [];
  for (let at = 8; at < file.length;) {
    const len = file.readUInt32BE(at), type = file.subarray(at + 4, at + 8).toString('ascii');
    const body = file.subarray(at + 8, at + 8 + len);
    const stored = file.readUInt32BE(at + 8 + len), actual = crc32(file.subarray(at + 4, at + 8 + len));
    out.push({ type, body, stored, actual });
    at += 12 + len;
  }
  return out;
};

describe('the image tool', () => {
  it('paints the same words into the same bytes, another seed into other bytes, and reads past case and stops', () => {
    expect(bytes(WORDS, 160, 90).equals(bytes(WORDS, 160, 90))).toBe(true);
    expect(bytes(WORDS, 160, 90, 1).equals(bytes(WORDS, 160, 90, 2))).toBe(false);
    expect(read('A Tree.')).toEqual({ ...read('a tree'), prompt: 'A Tree.' }); // one scene; the seed is the typed words
    expect(bytes('a tree', 160, 90, 5).equals(bytes('A Tree.', 160, 90, 5))).toBe(true);
  });

  it('writes a valid PNG: signature, IHDR, every CRC, raw rows with a zero filter byte, the pixels it painted', () => {
    const img = paint(read('three pine trees by a lake under a full moon, snow'), { width: 97, height: 61, seed: 3 });
    const file = png(img);
    expect([...file.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const parts = chunks(file);
    expect(parts.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    for (const c of parts) expect(c.actual, `${c.type} crc`).toBe(c.stored);
    const ihdr = parts[0]!.body;
    const fields = [ihdr.readUInt32BE(0), ihdr.readUInt32BE(4), ihdr[8], ihdr[9], ihdr[10], ihdr[11], ihdr[12]];
    expect(fields).toEqual([97, 61, 8, 2, 0, 0, 0]);
    const raw = inflateSync(parts[1]!.body), stride = 97 * 3 + 1;
    expect(raw.length).toBe(stride * 61);
    for (let y = 0; y < 61; y++) expect(raw[y * stride], `filter byte of row ${y}`).toBe(0);
    const x = 40, y = 50, i = (y * 97 + x) * 3, at = y * stride + 1 + x * 3;
    const want = [0, 1, 2].map((k) => Math.round(Math.min(1, Math.max(0, img.data[i + k]!)) * 255));
    expect([raw[at], raw[at + 1], raw[at + 2]]).toEqual(want);
  });

  it('paints any size without a crash, every value finite and in 0..1', () => {
    for (const [w, h] of [[1, 1], [3, 2], [7, 5], [2000, 8], [8, 2000]] as const) {
      const img = paint(read(WORDS), { width: w, height: h, seed: 7 });
      expect(img.data.length).toBe(w * h * 3);
      let ok = true;
      for (const v of img.data) if (!(v >= 0 && v <= 1)) ok = false; // NaN fails both comparisons
      expect(ok, `${w}x${h}`).toBe(true);
    }
  });

  it('keeps the core free of Node, so it can paint in a browser', async () => {
    const files = ['core', 'read', 'passes', 'things', 'math', 'draw', 'styles', 'text', 'font', 'registry'];
    for (const name of files) {
      const src = readFileSync(fileURLToPath(new URL(`../../tools/image/${name}.mjs`, import.meta.url)), 'utf8');
      for (const banned of ['node:', 'Buffer', 'process.']) {
        expect(src.includes(banned), `${name}.mjs has ${banned}`).toBe(false);
      }
    }
    const core = await import(/* @vite-ignore */ new URL('../../tools/image/core.mjs', import.meta.url).href);
    expect(Object.keys(core).sort()).toEqual(expect.arrayContaining([
      'LIGHT', 'conditions', 'families', 'paint', 'register', 'styles', 'things', 'toImageData', 'toRGBA8',
    ]));
    expect(core.things.map((t: { id: string }) => t.id)).toEqual(['tree', 'building', 'house', 'boat', 'car', 'bird']);
    const rgba = core.toRGBA8(paint(read('a tree'), { width: 4, height: 3, seed: 1 }));
    expect(rgba.length).toBe(4 * 3 * 4);
    expect(rgba[3]).toBe(255);
  });

  it('lays the picture out the same at any size: horizon, sun and shore are shares, things fill the layout', () => {
    const small = paint(read(WORDS), { width: 160, height: 90, seed: 7 }).layout;
    const large = paint(read(WORDS), { width: 640, height: 360, seed: 7 }).layout;
    expect(small.horizon).toBe(large.horizon);
    expect(small.sun).toEqual(large.sun);
    expect(small.shore).toBe(large.shore);
    expect(large.shore).not.toBeNull();
    expect(large.things.length).toBe(small.things.length);
    expect(large.things.map((t) => t.kind).sort()).toEqual([
      'bird', 'bird', 'bird', 'bird', 'bird', 'bird', 'bird', 'boat', 'car',
      'house', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree',
    ]);
    for (const t of large.things) {
      expect(t.w > 0 && t.h > 0 && Number.isFinite(t.x) && Number.isFinite(t.y), t.kind).toBe(true);
    }
    expect(read(WORDS).things).toEqual({ cars: 1, mountains: 0, trees: 0, houses: 1, boats: 1, birds: 0 });
  });

  it('stays fast: 640x360 under 400 ms and 1280x720 under 1.5 s (median of 3 after a warm-up)', () => {
    const scene = read(WORDS);
    const median = (w: number, h: number) => {
      paint(scene, { width: w, height: h, seed: 7 });
      const t = [0, 1, 2].map(() => {
        const t0 = performance.now();
        paint(scene, { width: w, height: h, seed: 7 });
        return performance.now() - t0;
      });
      return t.sort((a, b) => a - b)[1]!;
    };
    const small = median(640, 360), large = median(1280, 720);
    expect(small, `640x360 took ${small.toFixed(0)} ms`).toBeLessThan(400);
    expect(large, `1280x720 took ${large.toFixed(0)} ms`).toBeLessThan(1500);
  });
});
