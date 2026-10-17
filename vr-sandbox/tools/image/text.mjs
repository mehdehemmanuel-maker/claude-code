// Text over the picture, from the 5×7 bitmap font in font.mjs. drawText paints a string at a pixel position with a
// dark halo so it reads over any sky; placeText lays a caption out for finishPass: top- or bottom-centre, whichever
// third of the picture has no placed thing in it (the bottom when both are free), wrapped to two lines when wider
// than 0.9 W, cut with an ellipsis past that, and says what it did in ctx.layout.text { text, lines, truncated,
// substituted, … }: the lines are what was drawn, a character outside the font (code points 32-126) as the '?' it was
// drawn as, counted in `substituted`. When not even the ellipsis fits, or the caption is taller than the picture,
// nothing is drawn and lines is []. Both need only ctx.W, ctx.H and ctx.put (placeText also ctx.layout), so a scratch
// context serves the tests.
import { GLYPH_H, GLYPH_W, drawText as raster, measure } from './font.mjs';

export const INK = [1, 1, 1], HALO = [0.04, 0.04, 0.06];
const ELLIPSIS = '...';

/** The font scale for a picture of H rows: 2 px per font pixel at least, 3 at 540 rows, 6 at 1080. */
export const textScale = (H) => Math.max(2, Math.round(H / 180));

/**
 * Paints `text` with its top-left glyph corner at (x, y). The halo is a dark ring half as thick as the scale (1 px at
 * scales 1 and 2); pass a number for another thickness, false for none. Returns the box the glyphs cover.
 */
export function drawText(ctx, text, { x, y, scale = textScale(ctx.H), colour = INK, halo = true, haloColour = HALO }) {
  const s = Math.max(1, Math.floor(scale));
  const ring = halo === true ? Math.max(1, Math.round(s / 2)) : halo === false ? 0 : Math.max(0, Math.floor(halo));
  raster((px, py, isHalo) => ctx.put(px, py, isHalo ? haloColour : colour), text, x, y, { scale: s, halo: ring });
  const { width, height } = measure(text, s);
  return { x, y, w: width, h: height };
}

/** How many glyph cells fit in `width` pixels at `scale`: (5n + (n − 1)) · scale ≤ width. */
const cellsAcross = (width, scale) => Math.floor((width / scale + 1) / (GLYPH_W + 1));

/**
 * `text` as one line, or two, or two with the end cut and an ellipsis, so no line is wider than `maxWidth`; a
 * character the font has no glyph for (outside code points 32-126) becomes the '?' it is drawn as, and `substituted`
 * counts them. When not even the ellipsis and one character fit on a line, nothing is drawn: lines is [].
 */
export function fitText(text, scale, maxWidth) {
  let substituted = 0;
  const ascii = Array.from(String(text)).map((ch) => {
    const code = ch.codePointAt(0);
    if (code >= 32 && code <= 126) return ch;
    if (/\s/.test(ch)) return ' ';
    substituted++;
    return '?';
  }).join('');
  const clean = ascii.replace(/\s+/g, ' ').trim(), cells = cellsAcross(maxWidth, scale);
  if (!clean || cells < ELLIPSIS.length + 1) return { lines: [], truncated: !!clean, substituted };
  if (clean.length <= cells) return { lines: [clean], truncated: false, substituted };
  let first = clean.lastIndexOf(' ', cells); // break at the last space that fits, or inside a word that does not
  if (first < 1) first = cells;
  const second = clean.slice(first).trim(), head = clean.slice(0, first).trimEnd();
  if (second.length <= cells) return { lines: [head, second], truncated: false, substituted };
  const keep = Math.max(0, cells - ELLIPSIS.length);
  return { lines: [head, second.slice(0, keep).trimEnd() + ELLIPSIS], truncated: true, substituted };
}

/** The area of the layout's things inside the rows y0..y1. */
function covered(things, y0, y1) {
  let area = 0;
  for (const t of things) area += Math.max(0, Math.min(y1, t.y + t.h) - Math.max(y0, t.y)) * t.w;
  return area;
}

/** Lays `text` out and paints it; records ctx.layout.text and returns it (null when nothing could be drawn). */
export function placeText(ctx, text) {
  const { W, H, layout } = ctx, scale = textScale(H);
  const fit = fitText(text, scale, 0.9 * W);
  const { width, height } = measure(fit.lines.join('\n'), scale);
  if (!fit.lines.length || height > H) { // nothing fits: say so, draw nothing
    layout.text = { text: String(text), ...fit, lines: [], at: 'bottom', x: 0, y: 0, w: 0, h: 0 };
    return layout.text;
  }
  const third = H / 3, things = layout.things ?? [];
  const top = covered(things, 0, third), bottom = covered(things, H - third, H);
  const at = top < bottom ? 'top' : 'bottom'; // the free third; the bottom when both are free or equally taken
  const y = Math.round((at === 'top' ? third / 2 : H - third / 2) - height / 2), step = (GLYPH_H + 1) * scale;
  fit.lines.forEach((line, i) => { // each line centred on its own
    drawText(ctx, line, { x: Math.round((W - measure(line, scale).width) / 2), y: y + i * step, scale });
  });
  layout.text = { text: String(text), ...fit, at, x: Math.round((W - width) / 2), y, w: width, h: height };
  return layout.text;
}
