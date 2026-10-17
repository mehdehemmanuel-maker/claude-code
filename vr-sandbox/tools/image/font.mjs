// font.mjs — an original 5×7 bitmap font for ASCII 32–126, as a tiny ES module with no imports and nothing of the
// platform in it, for a painter that paints its own pixels (no canvas, no system fonts). The glyph shapes are original
// work drawn pixel by pixel for this tool: on a 5×7 grid many letters can only be drawn one way, so they coincide with
// the familiar dot-matrix forms; the deliberate choices are a pointed A, a round O against a dotted 0 (a centre pixel,
// no slash), a barred G, 2×2 dots for . and : so they survive a 1:1 render, and the descender letters (g, p, q, y)
// with their bowls on the x-line (row 2, where every lowercase body starts) and their tails inside the seven rows:
// drawn a row higher they read as capitals (a p with a four-row bowl from row 1 is a P moved down one row).
// text.mjs lays text out and paints it through this file; tests/unit/image-styles.test.ts checks the glyphs.
//
// PACKING FORMAT
// --------------
// FONT holds 95 glyphs (codes 32..126, in order), 9 hex digits each (855 digits).
// A glyph is 7 rows × 5 columns = 35 bits.  Row 0 (top) is the most significant
// 5-bit group, row 6 (bottom) the least; inside a row bit 4 is the LEFTMOST
// column and bit 0 the rightmost.  The 35 bits are written as a 36-bit hex
// number whose top bit is always 0:
//
//     value = r0<<30 | r1<<25 | r2<<20 | r3<<15 | r4<<10 | r5<<5 | r6
//     hex   = value.toString(16).padStart(9, '0')
//
// Example: 'T' = #####/..#../..#../..#../..#../..#../..#.. ->
//          rows [31,4,4,4,4,4,4] -> "7c8421084".
//
// To see a glyph as art: glyph('T').map((bits) => [...Array(5)].map((_, c) => (bits & (16 >> c) ? '#' : '.')).join(''))
//
// PUBLIC API
// ----------
//   FONT                                  packed string constant
//   glyph(ch)                             -> [r0..r6], 5-bit rows; '?' for anything outside 32..126
//   measure(text, scale=1, gap=1, lineGap=1) -> { width, height } in pixels (no halo)
//   drawText(put, text, x, y, { scale=1, gap=1, lineGap=1, halo=true })
//                                         calls put(px, py, isHalo) for every pixel to paint
//
// Metrics: a glyph cell is 5×7 font pixels; `gap` font pixels separate glyphs on
// a line and `lineGap` font pixels separate lines ('\n' breaks a line).  All of
// these are multiplied by `scale`, so measure('HELLO', 2) is (5·5 + 4·1)·2 = 58
// wide and 7·2 = 14 tall.  The halo is a 1-screen-pixel ring (pass a number for
// a thicker one) painted before the ink, so it may extend `halo` pixels outside
// the measured box.

export const GLYPH_W = 5;
export const GLYPH_H = 7;
export const FIRST = 32;
export const LAST = 126;
const COUNT = LAST - FIRST + 1; // 95
const HEX_PER_GLYPH = 9;

export const FONT =
  /*FONT-BEGIN*/
  '000000000108421004294a00000295f57d4a11f4717c463222226332544564d308800000' +
  '0888420822082108880095754800084f90800000030880000f800000000018c044222110' +
  '3a31ac62e11842108e3a211111f7c441062e08ca97c427e1e0862e1910f462e7c2222108' +
  '3a317462e3a317844c018c03180018c03088004441040001f07c000104111003a2111004' +
  '3a216d6ae11518fe317a31f463e3a308422e72518c65c7e10f421f7e10f42103a30bc62e' +
  '4631fc63138842108e1c4210a4c4654c525142108421f4775ac6314639ace313a318c62e' +
  '7a31f42103a318d64d7a31f52513e107043e7c842108446318c62e46318c5444631ad771' +
  '462a22a314631510847c222221f39084210e41082084138421084e11510000000000001f' +
  '308200000000e0be2f4216cc63e000e8422e042d9c62f000e8fe0e1928e2108000f8bc2e' +
  '4216cc631100c2108e080610a4c4212a629230842108e001aad6310016cc631000e8c62e' +
  '001e8fa10000f8bc210016cc210000f8383e211c4212600118c66d00118c54400118d6aa' +
  '00115115100118bc2e001f1111f0884410821084210842084110880008a8800' +
  ''
  /*FONT-END*/;

// ---- decoding --------------------------------------------------------------

const cache = new Array(COUNT);

function decode(index) {
  const hex = FONT.slice(index * HEX_PER_GLYPH, (index + 1) * HEX_PER_GLYPH);
  let v = parseInt(hex, 16); // < 2^36, exact as a double
  const rows = new Array(GLYPH_H);
  for (let r = GLYPH_H - 1; r >= 0; r--) {
    rows[r] = v % 32;
    v = Math.floor(v / 32);
  }
  return Object.freeze(rows);
}

/** Index into FONT for a character (string) or code point (number); -1 if unsupported. */
export function glyphIndex(ch) {
  const code = typeof ch === 'number' ? ch : typeof ch === 'string' && ch.length ? ch.codePointAt(0) : NaN;
  return code >= FIRST && code <= LAST ? code - FIRST : -1;
}

/**
 * Rows of a glyph: an array of 7 numbers, each 0..31, bit 4 = leftmost column.
 * Characters outside 32..126 (or empty input) fall back to '?'.
 */
export function glyph(ch) {
  let i = glyphIndex(ch);
  if (i < 0) i = 63 - FIRST; // '?'
  return cache[i] || (cache[i] = decode(i));
}

// ---- layout ----------------------------------------------------------------

function splitLines(text) {
  return String(text ?? '').split('\n').map((line) => Array.from(line));
}

/** Size in pixels of the glyph boxes for `text` (the halo, if any, is not counted). */
export function measure(text, scale = 1, gap = 1, lineGap = 1) {
  const s = Math.max(1, Math.floor(scale));
  const lines = splitLines(text);
  let cells = 0;
  for (const line of lines) cells = Math.max(cells, line.length);
  const width = cells ? (cells * GLYPH_W + (cells - 1) * gap) * s : 0;
  const height = (lines.length * GLYPH_H + (lines.length - 1) * lineGap) * s;
  return { width, height };
}

/**
 * Paint `text` with its top-left glyph corner at (x, y).
 * `put(px, py, isHalo)` is called once per pixel: first for every halo pixel
 * (the 8-neighbours of the ink that are not ink themselves), then for every ink
 * pixel, so the caller can simply overwrite.  `halo` may be false, true (1px) or
 * a thickness in screen pixels.
 */
export function drawText(put, text, x, y, opts = {}) {
  const { scale = 1, gap = 1, lineGap = 1, halo = true } = opts;
  const s = Math.max(1, Math.floor(scale));
  const t = halo === true ? 1 : halo ? Math.max(0, Math.floor(halo)) : 0;
  const lines = splitLines(text);
  const { width, height } = measure(text, s, gap, lineGap);
  if (!width || !height) return;

  // Raster the text into a small buffer with a `t`-pixel margin: 2 = ink, 1 = halo.
  const W = width + 2 * t;
  const H = height + 2 * t;
  const buf = new Uint8Array(W * H);
  let cy = t;
  for (const line of lines) {
    let cx = t;
    for (const ch of line) {
      const rows = glyph(ch);
      for (let r = 0; r < GLYPH_H; r++) {
        const bits = rows[r];
        if (!bits) continue;
        for (let c = 0; c < GLYPH_W; c++) {
          if (!(bits & (16 >> c))) continue;
          for (let dy = 0; dy < s; dy++) {
            const base = (cy + r * s + dy) * W + cx + c * s;
            for (let dx = 0; dx < s; dx++) buf[base + dx] = 2;
          }
        }
      }
      cx += (GLYPH_W + gap) * s;
    }
    cy += (GLYPH_H + lineGap) * s;
  }

  // Grow the halo one ring at a time (8-neighbourhood).
  for (let k = 0; k < t; k++) {
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        if (buf[py * W + px] !== 0) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) {
          const ny = py + dy;
          if (ny < 0 || ny >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            if (nx < 0 || nx >= W) continue;
            const v = buf[ny * W + nx];
            if (v === 1 || v === 2) { near = true; break; }
          }
        }
        if (near) buf[py * W + px] = 3; // provisional, so this pass does not chain
      }
    }
    for (let i = 0; i < buf.length; i++) if (buf[i] === 3) buf[i] = 1;
  }

  const ox = x - t;
  const oy = y - t;
  if (t) {
    for (let py = 0; py < H; py++)
      for (let px = 0; px < W; px++)
        if (buf[py * W + px] === 1) put(ox + px, oy + py, true);
  }
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++)
      if (buf[py * W + px] === 2) put(ox + px, oy + py, false);
}
