// The styles: a finish over the whole picture. Each entry { id, match, apply(img, ctx), grain?, vignette?, scene? }
// works on the Float32 rgb buffer in place, from lattice noise only (no random, no clock), and keeps the width, the
// height and every value in [0, 1]. `match` is the one table of style words: the reader (read.mjs) sets scene.style
// from it, so every id the reader can name is one the finish can paint, and the synonyms live here (pixel art, 8-bit;
// cartoon as a poster; painting as a watercolour; black and white as mono; retro and an old photo as vintage).
// `scene` is what a style asks of the picture before it is painted (minimalist: no clouds, no fog, and `flat`, a sky
// with no glow round the sun or the moon and a sun with no halo); paint() in core.mjs lays it over the scene first.
// paint() resolves ctx.style through styleFor(), which throws an Error listing the ids for an unknown one; finishPass
// in passes.mjs runs the default grain and vignette unless the entry turns them off (grain: false, vignette: false),
// applies the style, then draws the text over it so it stays crisp. The helpers (luma, sobel, boxBlur, posterise,
// posteriseLuma, grain, vignette) are exported for other passes and the tests.
import { clamp, h2, noise } from './math.mjs';

// ── Helpers over the buffer ────────

/** The luminance of every pixel (Rec. 709 weights). */
export function luma(data, n, out = new Float32Array(n)) {
  for (let p = 0, i = 0; p < n; p++, i += 3) out[p] = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
  return out;
}

/** Sobel edge strength of a one-channel field, 0..1: a black-to-white step across one pixel reads 1. */
export function sobel(f, W, H, out = new Float32Array(W * H)) {
  for (let y = 0; y < H; y++) {
    const ym = Math.max(0, y - 1) * W, y0 = y * W, yp = Math.min(H - 1, y + 1) * W;
    for (let x = 0; x < W; x++) {
      const xm = Math.max(0, x - 1), xp = Math.min(W - 1, x + 1);
      const gx = f[ym + xp] + 2 * f[y0 + xp] + f[yp + xp] - f[ym + xm] - 2 * f[y0 + xm] - f[yp + xm];
      const gy = f[yp + xm] + 2 * f[yp + x] + f[yp + xp] - f[ym + xm] - 2 * f[ym + x] - f[ym + xp];
      out[y0 + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 0.25);
    }
  }
  return out;
}

/** A box blur of radius r over `ch` interleaved channels, separable, the window shrinking at the edges. */
export function boxBlur(data, W, H, r, ch = 3, out = new Float32Array(data.length)) {
  if (r < 1) {
    out.set(data);
    return out;
  }
  const tmp = new Float32Array(data.length), pre = new Float32Array((Math.max(W, H) + 1) * ch);
  for (let y = 0; y < H; y++) { // along the rows
    const row = y * W * ch;
    for (let c = 0; c < ch; c++) pre[c] = 0;
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < ch; c++) pre[(x + 1) * ch + c] = pre[x * ch + c] + data[row + x * ch + c];
    }
    for (let x = 0; x < W; x++) {
      const a = Math.max(0, x - r), b = Math.min(W, x + r + 1), k = 1 / (b - a);
      for (let c = 0; c < ch; c++) tmp[row + x * ch + c] = (pre[b * ch + c] - pre[a * ch + c]) * k;
    }
  }
  for (let x = 0; x < W; x++) { // down the columns
    for (let c = 0; c < ch; c++) pre[c] = 0;
    for (let y = 0; y < H; y++) {
      for (let c = 0; c < ch; c++) pre[(y + 1) * ch + c] = pre[y * ch + c] + tmp[(y * W + x) * ch + c];
    }
    for (let y = 0; y < H; y++) {
      const a = Math.max(0, y - r), b = Math.min(H, y + r + 1), k = 1 / (b - a);
      for (let c = 0; c < ch; c++) out[(y * W + x) * ch + c] = (pre[b * ch + c] - pre[a * ch + c]) * k;
    }
  }
  return out;
}

/** Every channel snapped to `levels` even steps between 0 and 1. */
export function posterise(data, levels) {
  const q = levels - 1;
  for (let i = 0; i < data.length; i++) data[i] = Math.round(data[i] * q) / q;
}

/**
 * The luminance snapped to `levels` even steps, the chroma kept (every channel scaled alike), so a band keeps its hue:
 * per channel, a dark blue-grey rock went navy where only its blue rounded up and black where all three rounded down.
 */
export function posteriseLuma(data, levels) {
  const q = levels - 1;
  for (let i = 0; i < data.length; i += 3) {
    const l = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    const k = l > 1e-6 ? Math.round(l * q) / q / l : 0;
    data[i] *= k;
    data[i + 1] *= k;
    data[i + 2] *= k;
  }
}

/** Grain: the same small offset on the three channels of a pixel, from the lattice, so it never moves between runs. */
export function grain(data, W, H, amp, key) {
  for (let y = 0; y < H; y++) {
    const row = y * W * 3;
    for (let x = 0; x < W; x++) {
      const i = row + x * 3, g = (h2(x, y, key) - 0.5) * amp;
      data[i] = clamp(data[i] + g);
      data[i + 1] = clamp(data[i + 1] + g);
      data[i + 2] = clamp(data[i + 2] + g);
    }
  }
}

/** A vignette: the corners darkened by `strength` (0.12 is a twelfth), nothing at the centre. */
export function vignette(data, W, H, strength) {
  for (let y = 0; y < H; y++) {
    const vy = (y / H - 0.5) ** 2, row = y * W * 3;
    for (let x = 0; x < W; x++) {
      const i = row + x * 3, v = 1 - strength * ((x / W - 0.5) ** 2 + vy) * 2;
      data[i] *= v;
      data[i + 1] *= v;
      data[i + 2] *= v;
    }
  }
}

/** Every value back into [0, 1] (the styles multiply and add; this is their last word). */
function clampAll(data) {
  for (let i = 0; i < data.length; i++) data[i] = clamp(data[i]);
}

/** Darkens the pixels where the luminance gradient `edge` is high: the inked outline of the poster styles. */
function edgeDarken(data, edge, from, gain, depth) {
  for (let p = 0, i = 0; p < edge.length; p++, i += 3) {
    const k = 1 - depth * clamp((edge[p] - from) * gain);
    data[i] *= k;
    data[i + 1] *= k;
    data[i + 2] *= k;
  }
}

// ── Pixel: a reduced palette on a coarse grid ──

/** The cell: round(H / 90) pixels, never under 2, so 540 rows give 6-px cells and 1080 rows 12-px ones. */
export const pixelCell = (H) => Math.max(2, Math.round(H / 90));

/** k colours for n rgb samples: median cut to k boxes, then four rounds of k-means from their means. Deterministic. */
export function quantise(samples, n, k) {
  const boxes = [Array.from({ length: n }, (_, i) => i)];
  const range = (box) => { // the widest channel of a box and its width
    let best = 0, width = -1;
    for (let c = 0; c < 3; c++) {
      let lo = Infinity, hi = -Infinity;
      for (const i of box) {
        const v = samples[i * 3 + c];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo > width) {
        width = hi - lo;
        best = c;
      }
    }
    return { c: best, width };
  };
  while (boxes.length < k) {
    let at = -1, widest = 0, channel = 0;
    for (let b = 0; b < boxes.length; b++) {
      if (boxes[b].length < 2) continue;
      const { c, width } = range(boxes[b]);
      if (width > widest) {
        widest = width;
        at = b;
        channel = c;
      }
    }
    if (at < 0 || widest <= 0) break; // nothing left to split: fewer colours than asked, all distinct
    const box = boxes[at], c = channel;
    box.sort((i, j) => samples[i * 3 + c] - samples[j * 3 + c] || i - j);
    const half = box.length >> 1;
    boxes.splice(at, 1, box.slice(0, half), box.slice(half));
  }
  const palette = new Float32Array(boxes.length * 3), count = new Float32Array(boxes.length);
  const mean = (assign) => {
    palette.fill(0);
    count.fill(0);
    for (let i = 0; i < n; i++) {
      const b = assign[i];
      palette[b * 3] += samples[i * 3];
      palette[b * 3 + 1] += samples[i * 3 + 1];
      palette[b * 3 + 2] += samples[i * 3 + 2];
      count[b]++;
    }
    for (let b = 0; b < boxes.length; b++) {
      if (count[b]) for (let c = 0; c < 3; c++) palette[b * 3 + c] /= count[b];
      else for (let c = 0; c < 3; c++) palette[b * 3 + c] = samples[c]; // an empty bin: park it on the first sample
    }
  };
  const assign = new Int32Array(n);
  boxes.forEach((box, b) => { for (const i of box) assign[i] = b; });
  mean(assign);
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < n; i++) assign[i] = nearest(palette, boxes.length, samples, i * 3);
    mean(assign);
  }
  return palette;
}

/** The index of the palette colour nearest the sample at `at`. */
function nearest(palette, k, samples, at) {
  let best = 0, d0 = Infinity;
  const r = samples[at], g = samples[at + 1], b = samples[at + 2];
  for (let p = 0; p < k; p++) {
    const dr = palette[p * 3] - r, dg = palette[p * 3 + 1] - g, db = palette[p * 3 + 2] - b;
    const d = dr * dr + dg * dg + db * db;
    if (d < d0) {
      d0 = d;
      best = p;
    }
  }
  return best;
}

function pixel({ width: W, height: H, data }) {
  const cell = pixelCell(H), cw = Math.ceil(W / cell), ch = Math.ceil(H / cell), n = cw * ch;
  const cells = new Float32Array(n * 3);
  for (let cy = 0; cy < ch; cy++) { // box-downsample: each cell the mean of its pixels
    for (let cx = 0; cx < cw; cx++) {
      const x0 = cx * cell, y0 = cy * cell, x1 = Math.min(W, x0 + cell), y1 = Math.min(H, y0 + cell);
      let r = 0, g = 0, b = 0;
      for (let y = y0; y < y1; y++) {
        for (let i = (y * W + x0) * 3, end = (y * W + x1) * 3; i < end; i += 3) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
      }
      const k = 1 / ((x1 - x0) * (y1 - y0)), o = (cy * cw + cx) * 3;
      cells[o] = r * k;
      cells[o + 1] = g * k;
      cells[o + 2] = b * k;
    }
  }
  const palette = quantise(cells, n, 16), k = palette.length / 3;
  for (let cy = 0; cy < ch; cy++) { // nearest palette colour, upscaled nearest-neighbour
    for (let cx = 0; cx < cw; cx++) {
      const p = nearest(palette, k, cells, (cy * cw + cx) * 3) * 3;
      const r = palette[p], g = palette[p + 1], b = palette[p + 2];
      const x0 = cx * cell, y0 = cy * cell, x1 = Math.min(W, x0 + cell), y1 = Math.min(H, y0 + cell);
      for (let y = y0; y < y1; y++) {
        for (let i = (y * W + x0) * 3, end = (y * W + x1) * 3; i < end; i += 3) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
    }
  }
}

// ── Poster and minimalist ──────────

function poster({ width: W, height: H, data }) {
  data.set(boxBlur(data, W, H, 1)); // one pixel of blur, so the water's sparkle and the grass blades do not speckle
  const edge = sobel(luma(data, W * H), W, H); // the outlines of the picture as it was, before the bands
  posterise(data, 5);
  edgeDarken(data, edge, 0.08, 3, 0.55);
}

/**
 * Flat bands: the textures blurred away (a sixtieth of the height, so the near grass flattens too), then the
 * luminance cut to five levels with the chroma kept (cut per channel, the sun's glow became coloured rings and the
 * mountains' shadows navy and black patches); no grain, no vignette, no outline; and the scene asked to leave its
 * clouds, its fog and the glow round the sun out (flat), so the sky is a two-stop gradient and the sun a plain disc.
 */
function minimalist({ width: W, height: H, data }) {
  data.set(boxBlur(data, W, H, Math.max(1, Math.round(H / 60))));
  posteriseLuma(data, 5);
}

// ── Sketch ─────────────────────────

const PAPER = [0.94, 0.91, 0.84], INK = [0.13, 0.11, 0.10];

/**
 * Lines where the luminance steps (Sobel), and along the edges of its tonal bands (the luminance blurred, cut to five
 * levels, Sobel again), so a horizon, a shoreline or a low sun at dawn, soft steps that leave no Sobel line, are
 * drawn too; the fields hatched by band, sparse strokes in the mid tones (water under a bright sky), dense in the
 * dark and crossed in the darkest, over a faint wash of the values on paper.
 */
function sketch({ width: W, height: H, data }) {
  const n = W * H, lum = boxBlur(luma(data, n), W, H, 1, 1), edge = sobel(lum, W, H);
  const soft = Math.max(2, Math.round(H / 180)), field = boxBlur(lum, W, H, soft, 1); // the broad tones, no blades
  const bands = Float32Array.from(field);
  posterise(bands, 5);
  const contour = sobel(bands, W, H), hatch = soft * 2; // diagonal strokes, spaced for the size
  for (let y = 0; y < H; y++) {
    const row = y * W * 3;
    for (let x = 0; x < W; x++) {
      const p = y * W + x, i = row + x * 3, l = lum[p], f = field[p];
      let tone = 0.74 + 0.26 * l; // a faint wash of the values, so the sky reads lighter than the ground
      if (f < 0.65 && (x + y) % (hatch * 2) === 0) tone -= 0.14; // the mid tones: sparse strokes
      if (f < 0.4 && (x + y) % hatch === 0) tone -= 0.1 + 0.25 * (0.4 - f) / 0.4; // the dark: dense, and darker
      if (f < 0.2 && (x - y + H) % hatch === 0) tone -= 0.2; // the darkest: crossed
      const line = Math.max(clamp((edge[p] - 0.05) * 3), clamp((contour[p] - 0.04) * 3) * 0.6) * 0.9;
      data[i] = PAPER[0] * tone + (INK[0] - PAPER[0] * tone) * line;
      data[i + 1] = PAPER[1] * tone + (INK[1] - PAPER[1] * tone) * line;
      data[i + 2] = PAPER[2] * tone + (INK[2] - PAPER[2] * tone) * line;
    }
  }
  grain(data, W, H, 0.035, 73);
}

// ── Watercolour ────────────────────

const WASHPAPER = [0.97, 0.95, 0.90];

function watercolour({ width: W, height: H, data }) {
  const n = W * H, soft = boxBlur(data, W, H, Math.max(1, Math.round(H / 180)));
  const amp = H / 50, f = 24 / H; // the wash wanders by up to a fiftieth of the height, in blooms a 24th across
  for (let y = 0; y < H; y++) { // the blurred picture read through a noise-displaced lens: blooms and runs
    const row = y * W * 3;
    for (let x = 0; x < W; x++) {
      const dx = (noise(x * f, y * f, 91) - 0.5) * amp, dy = (noise(x * f + 11.7, y * f + 3.3, 92) - 0.5) * amp;
      const sx = clamp(Math.round(x + dx), 0, W - 1), sy = clamp(Math.round(y + dy), 0, H - 1);
      const s = (sy * W + sx) * 3, i = row + x * 3;
      const r = soft[s], g = soft[s + 1], b = soft[s + 2], l = r * 0.2126 + g * 0.7152 + b * 0.0722;
      data[i] = 1 - (1 - (l + (r - l) * 1.35)) * 0.82; // saturation lifted, values lightened
      data[i + 1] = 1 - (1 - (l + (g - l) * 1.35)) * 0.82;
      data[i + 2] = 1 - (1 - (l + (b - l) * 1.35)) * 0.82;
    }
  }
  clampAll(data);
  edgeDarken(data, sobel(luma(data, n), W, H), 0.04, 2.5, 0.4); // pigment pooling at the edges of each wash
  for (let y = 0; y < H; y++) { // paper: a coarse tooth and a fine speckle, and a little of the paper's own tint
    const row = y * W * 3;
    for (let x = 0; x < W; x++) {
      const i = row + x * 3, p = 0.97 + (h2(x >> 2, y >> 2, 93) - 0.5) * 0.05 + (h2(x, y, 94) - 0.5) * 0.02;
      data[i] = data[i] * p * 0.94 + WASHPAPER[0] * 0.06;
      data[i + 1] = data[i + 1] * p * 0.94 + WASHPAPER[1] * 0.06;
      data[i + 2] = data[i + 2] * p * 0.94 + WASHPAPER[2] * 0.06;
    }
  }
}

// ── Mono, sepia, vintage ───────────

function mono({ data }) {
  for (let i = 0; i < data.length; i += 3) {
    const l = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    data[i] = l;
    data[i + 1] = l;
    data[i + 2] = l;
  }
}

/** Sepia: the luminance toned warm; `fade` lifts the blacks and keeps a little of the colour (vintage). */
function tone(data, W, H, fade, vig, grit) {
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2], l = r * 0.2126 + g * 0.7152 + b * 0.0722;
    data[i] = (l * 1.10 * (1 - fade) + r * fade) * (1 - fade * 0.3) + fade * 0.25;
    data[i + 1] = (l * 0.95 * (1 - fade) + g * fade) * (1 - fade * 0.3) + fade * 0.22;
    data[i + 2] = (l * 0.75 * (1 - fade) + b * fade) * (1 - fade * 0.3) + fade * 0.18;
  }
  clampAll(data);
  vignette(data, W, H, vig);
  grain(data, W, H, grit, 75);
}
const sepia = ({ width: W, height: H, data }) => tone(data, W, H, 0, 0.25, 0.05);
const vintage = ({ width: W, height: H, data }) => tone(data, W, H, 0.3, 0.4, 0.07);

// ── The registry entries ───────────

/** Each apply ends by clamping every value into [0, 1], whatever the style did. `flags.scene` is the style's ask. */
const entry = (id, match, fn, flags = {}) => ({
  id, match, grain: true, vignette: true, ...flags,
  apply(img, ctx) {
    fn(img, ctx);
    clampAll(img.data);
  },
});

/**
 * The styles in the order they are registered; `match` is tested against the reader's tokens (single lower-case words,
 * phrases joined with '-': 'pixel-art', 'black-and-white', 'line-art', 'oil-painting', 'old-photo'; see read.mjs).
 */
export const STYLES = [
  entry('pixel', /^(pixel|pixels|pixelated|pixel-art|8-?bit|16-?bit)$/, pixel, { grain: false }),
  entry('poster', /^(poster|posterised|posterized|screenprint|graphic|flat|cartoon|cartoony|comic|anime)$/, poster,
    { grain: false }),
  entry('minimalist', /^(minimal|minimalist|minimalism|minimalistic)$/, minimalist,
    { grain: false, vignette: false, scene: { clouds: 0.05, fog: 0, flat: true } }),
  entry('sketch', /^(sketch|sketched|sketchy|pencil|pencilled|drawing|drawn|ink|inked|charcoal|line-art)$/, sketch,
    { grain: false, vignette: false }),
  entry('watercolour',
    /^(watercolou?r|watercolou?rs|aquarelle|painted|painting|painterly|oil-painting|acrylic|impressionist)$/,
    watercolour, { grain: false, vignette: false }),
  entry('mono', /^(mono|monochrome|black-and-white|b-?w|greyscale|grayscale|noir)$/, mono),
  entry('sepia', /^(sepia|sepia-toned)$/, sepia, { grain: false, vignette: false }),
  entry('vintage', /^(vintage|retro|old-fashioned|old-photo|old-photograph|faded|aged|antique)$/, vintage,
    { grain: false, vignette: false }),
];

/** The style with this id out of `styles` (the registry), or an Error naming every id there is. */
export function styleFor(id, styles) {
  const style = styles.find((s) => s.id === id);
  if (style) return style;
  const ids = styles.map((s) => s.id).join(', ');
  throw new Error(`unknown style "${id}": the styles are ${ids}`);
}

/** The first style whose match answers one of the words, or undefined: for a reader that sets scene.style. */
export function styleOf(words, styles = STYLES) {
  return styles.find((s) => words.some((w) => s.match.test(w)));
}
