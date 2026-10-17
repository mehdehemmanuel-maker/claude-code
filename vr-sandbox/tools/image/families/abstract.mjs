// The abstract family: no horizon, a seeded composition of anti-aliased shapes. Its words (abstract, geometric,
// circles, triangles, squares, shapes, pattern, gradient, mandala, stripes, bauhaus, mondrian, op-art) claim the
// family in the reader; a bare shape word (circles, stripes, a gradient) claims it only when no landscape thing
// or condition is named (bare()), else it goes back among the ignored words. The palette is the colour words of
// the prompt, else a seeded harmony (complementary, analogous or triadic); the named kinds are weighted up in the
// grammar: circles are mostly discs, stripes are bands, a mandala has rotational symmetry 6-12, mondrian is a grid
// of rectangles with black bars and primaries, gradient is one smooth two-colour field, op-art a warped ring field.
// Everything is drawn with the context's primitives from ctx.rand and the lattice noise, so the same words paint
// the same picture.
// This file also holds the helpers every family shares: note(), dropWord(), promptColours(), hsl().
import { clamp, fbm, lerp, mix, smooth } from '../math.mjs';
import { COLOURS, COMPOUNDS, CONDITIONS, THINGS, knows, words } from '../read.mjs';
import { register, thingFor } from '../registry.mjs';
import { finishPass } from '../passes.mjs';

// ── Shared by the families ─────────

/** A line for the shell's report (scene.notes), once. */
export function note(scene, text) {
  const notes = scene.notes ??= [];
  if (!notes.includes(text)) notes.push(text);
}

/**
 * A claimed word put back among the ignored, in the prompt's order: the unknown words before it go in first, so
 * the honesty list reads as it would had the family never claimed it (the reader's own loop adds the rest after).
 */
export function dropWord(scene, word) {
  const ignored = scene.ignored;
  if (ignored.includes(word)) return;
  for (const w of words(scene.prompt)) {
    if (w === word) break;
    if (!knows(w) && !ignored.includes(w)) ignored.push(w);
  }
  ignored.push(word);
}

/** Takes words a family dropped back out of the ignored list, once the family is claimed after all. */
export function undrop(scene, dropped) {
  for (const w of dropped.splice(0)) {
    const at = scene.ignored.indexOf(w);
    if (at >= 0) scene.ignored.splice(at, 1);
  }
}

/**
 * Whether the prompt names nothing of a landscape: no thing (built in or registered) and no condition word (a lake,
 * night, snow), read from the words themselves (a compound by its parts), since the reader's instances hold the
 * things alone. A bare shape or person word claims its family only in a bare prompt.
 */
export function bare(scene) {
  const landscape = (w) => Object.values(THINGS).some((re) => re.test(w)) || !!thingFor(w) ||
    CONDITIONS.some((c) => c.match.test(w));
  return !words(scene.prompt).some((w) => (COMPOUNDS[w] ?? [w]).some(landscape));
}

/** The colour words of the prompt, in order, once each. */
export function promptColours(scene) {
  const seen = [];
  for (const w of words(scene.prompt)) if (COLOURS[w] && !seen.includes(w)) seen.push(w);
  return seen;
}

/** A colour from hue (turns, 0..1), saturation and lightness. */
export function hsl(h, s, l) {
  const t = ((h % 1) + 1) % 1, c = (1 - Math.abs(2 * l - 1)) * s, m = l - c / 2;
  const x = c * (1 - Math.abs(((t * 6) % 2) - 1)), k = Math.floor(t * 6);
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k % 6];
  return [r + m, g + m, b + m];
}

/** The kinds of thing the scene names that this family will not draw, as a note for the shell. */
export function noteUndrawn(scene, family, except = []) {
  const kinds = [...new Set(scene.instances.filter((i) => i.count > 0 && !except.includes(i.kind)).map((i) => i.kind))];
  if (kinds.length) note(scene, `${kinds.join(', ')} not drawn: ${family}`);
}

// ── The words ──────────────────────

export const WORDS = new RegExp(
  '^(abstract|geometric|geometry|circles?|triangles?|squares?|shapes|pattern|patterns|gradient|mandala|stripes' +
  '|bauhaus|mondrian|op-art)$',
);
/** The words that make the picture abstract whatever else is named; the rest need a scene with no thing in it. */
const HEAD = /^(abstract|geometric|geometry|mandala|bauhaus|mondrian|op-art|shapes|patterns?)$/;
const KIND = {
  circle: 'disc', circles: 'disc', triangle: 'tri', triangles: 'tri', square: 'rect', squares: 'rect',
  stripes: 'stripes', gradient: 'gradient', mandala: 'mandala', mondrian: 'mondrian', 'op-art': 'opart',
  bauhaus: 'bauhaus',
};

function apply(scene, word) {
  const a = scene.abstract ??= { kinds: [], dropped: [] };
  if (scene.family !== 'abstract' && (HEAD.test(word) || bare(scene))) {
    scene.family = 'abstract';
    undrop(scene, a.dropped);
    note(scene, 'painted by the abstract family (no ground, no horizon): a seeded composition of shapes');
    noteUndrawn(scene, 'an abstract composition has no ground');
  }
  if (scene.family !== 'abstract') {
    a.dropped.push(word);
    dropWord(scene, word);
    return;
  }
  const kind = KIND[word];
  if (kind && !a.kinds.includes(kind)) a.kinds.push(kind);
}

// ── The palette ────────────────────

const CREAM = [0.94, 0.92, 0.87], INK = [0.09, 0.09, 0.11], PRIMARIES = { red: 1, blue: 1, yellow: 1 };

/** The colours to paint with and the field behind them: the prompt's colour words, else a seeded harmony. */
function palette(ctx) {
  const { rand, scene } = ctx, named = promptColours(scene);
  const dark = rand() < 0.3, ground = dark ? INK : CREAM;
  if (named.length) return { colours: named.map((w) => COLOURS[w]), ground, named };
  const h0 = rand(), scheme = rand(), s = 0.55 + rand() * 0.3, l = 0.45 + rand() * 0.15;
  const hues = scheme < 0.33 ? [h0, h0 + 0.5, h0 + 0.08] : scheme < 0.66 ? [h0 - 0.08, h0, h0 + 0.08]
    : [h0, h0 + 1 / 3, h0 + 2 / 3];
  return { colours: hues.map((h, i) => hsl(h, s, i === 2 ? l + 0.15 : l)), ground, named };
}

// ── The grammar ────────────────────

function fill(ctx, c) {
  const { W, H, data } = ctx;
  for (let i = 0; i < W * H * 3; i += 3) {
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
  }
}

/** One smooth two-colour field along a seeded direction. */
function gradient(ctx, pal) {
  const { W, H, rand, data } = ctx, th = rand() * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
  const [a, b] = pal.colours.length > 1 ? pal.colours : [pal.colours[0], pal.ground], c = [0, 0, 0];
  const reach = Math.abs(dx) * W + Math.abs(dy) * H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = ((x - W / 2) * dx + (y - H / 2) * dy) / reach + 0.5, i = (y * W + x) * 3;
      mix(a, b, smooth(0, 1, t), c);
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
    }
  }
}

/** Bands across the frame, horizontal, vertical or diagonal, their widths varied. */
function stripes(ctx, pal) {
  const { W, H, rand, poly } = ctx, dir = rand(), n = 8 + Math.floor(rand() * 9), cols = pal.colours;
  const span = dir < 0.33 ? H : dir < 0.66 ? W : W + H, widths = [];
  for (let i = 0; i < n; i++) widths.push(0.5 + rand());
  const total = widths.reduce((s, w) => s + w, 0);
  let at = 0;
  for (let i = 0; i < n; i++) {
    const w = widths[i] / total * span, a = at, b = at + w, c = cols[i % cols.length];
    if (dir < 0.33) poly([0, a, W, a, W, b, 0, b], c);
    else if (dir < 0.66) poly([a, 0, b, 0, b, H, a, H], c);
    else poly([a, 0, b, 0, b - H, H, a - H, H], c); // a diagonal band: sheared by the height
    at = b;
  }
}

/** A grid of rectangles with black bars between, most white, some in the primaries (or the named colours). */
function mondrian(ctx, pal) {
  const { W, H, rand, rect } = ctx, bar = Math.max(1, 0.012 * Math.min(W, H));
  const cols = pal.named.length ? pal.colours : Object.keys(PRIMARIES).map((k) => COLOURS[k]);
  fill(ctx, [0.96, 0.95, 0.92]);
  const cells = [{ x: 0, y: 0, w: W, h: H }];
  for (let round = 0; round < 4; round++) {
    for (const cell of cells.splice(0)) {
      const big = Math.max(cell.w / W, cell.h / H);
      if (big < 0.22 || rand() < 0.25) { // small enough, or left whole by chance
        cells.push(cell);
        continue;
      }
      const across = cell.w / W >= cell.h / H, t = 0.3 + rand() * 0.4;
      if (across) {
        cells.push({ ...cell, w: cell.w * t }, { ...cell, x: cell.x + cell.w * t, w: cell.w * (1 - t) });
      } else cells.push({ ...cell, h: cell.h * t }, { ...cell, y: cell.y + cell.h * t, h: cell.h * (1 - t) });
    }
  }
  for (const c of cells) {
    if (rand() < 0.35) rect(c.x, c.y, c.w, c.h, cols[Math.floor(rand() * cols.length)]);
  }
  for (const c of cells) { // the bars along every cell's right and bottom edge, and the frame's own
    if (c.x + c.w < W - 0.5) rect(c.x + c.w - bar / 2, c.y, bar, c.h, INK);
    if (c.y + c.h < H - 0.5) rect(c.x, c.y + c.h - bar / 2, c.w, bar, INK);
  }
}

/** Rings of petals repeated n times round the centre, n in 6..12, a disc at the heart. */
function mandala(ctx, pal) {
  const { W, H, rand, poly, disc, line, layout } = ctx, cx = W / 2, cy = H / 2, R = 0.46 * Math.min(W, H);
  const n = 6 + Math.floor(rand() * 7), cols = pal.colours, rings = 3 + Math.floor(rand() * 3);
  layout.mandala = { n, cx: 0.5, cy: 0.5, r: R / Math.min(W, H) };
  for (let ring = rings - 1; ring >= 0; ring--) { // the outer ring first, the inner ones over it
    const r0 = R * (ring + 1) / rings, len = R / rings * (1.1 + rand() * 0.5);
    const wid = r0 * Math.PI / n * (0.5 + rand() * 0.5);
    const c = cols[ring % cols.length], kind = rand(), twist = (ring % 2) * Math.PI / n;
    for (let k = 0; k < n; k++) {
      const th = (k / n) * Math.PI * 2 + twist, ux = Math.cos(th), uy = Math.sin(th);
      const bx = cx + ux * (r0 - len), by = cy + uy * (r0 - len), tx = cx + ux * r0, ty = cy + uy * r0;
      const px = -uy * wid, py = ux * wid;
      if (kind < 0.4) { // a petal: a lens of two arcs
        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const t = i / 8, s = Math.sin(t * Math.PI);
          pts.push(lerp(bx, tx, t) + px * s, lerp(by, ty, t) + py * s);
        }
        for (let i = 8; i >= 0; i--) {
          const t = i / 8, s = Math.sin(t * Math.PI);
          pts.push(lerp(bx, tx, t) - px * s, lerp(by, ty, t) - py * s);
        }
        poly(pts, c, 0.92);
      } else if (kind < 0.7) poly([bx, by, tx + px, ty + py, tx - px, ty - py], c, 0.92); // a spoke
      else disc(tx - ux * wid, ty - uy * wid, wid, c, 0.92); // a bead at the ring's edge
    }
    const segs = 72, lw = Math.max(1, R * 0.006), ring_ = pal.ground === INK ? CREAM : INK;
    for (let i = 0; i < segs; i++) { // a thin ring line
      const a = (i / segs) * Math.PI * 2, b = ((i + 1) / segs) * Math.PI * 2;
      line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(b) * r0, cy + Math.sin(b) * r0, lw, ring_, 0.6);
    }
  }
  disc(cx, cy, R / rings * 0.45, cols[(rings) % cols.length]);
  disc(cx, cy, R / rings * 0.2, pal.ground);
}

/** Concentric rings warped by a sine, black and white (or the first two colours): the eye swims. */
function opart(ctx, pal) {
  const { W, H, rand, data } = ctx, cx = W / 2, cy = H / 2, k = (10 + rand() * 10) / Math.min(W, H);
  const m = 3 + Math.floor(rand() * 5), warp = 0.1 + rand() * 0.2, c = [0, 0, 0];
  const [a, b] = pal.named.length > 1 ? pal.colours : [INK, [0.97, 0.97, 0.96]];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      const v = Math.sin((r * (1 + warp * Math.sin(th * m))) * k * Math.PI * 2), i = (y * W + x) * 3;
      mix(a, b, smooth(-0.12, 0.12, v), c); // a soft step: the edge lands between pixels
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
    }
  }
}

/** A few large shapes and many small, overlapping with alpha, the named kinds four times as likely. */
function shapes(ctx, pal, kinds) {
  const { W, H, rand, disc, poly } = ctx, cols = pal.colours, S = Math.min(W, H);
  const pool = ['disc', 'tri', 'rect', 'ring'];
  const weights = pool.map((k) => (kinds.includes(k) ? 4 : kinds.length && k !== 'ring' ? 0.5 : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  const pick = () => {
    let r = rand() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  };
  const large = 2 + Math.floor(rand() * 3), small = 12 + Math.floor(rand() * 19);
  for (let i = 0; i < large + small; i++) {
    const big = i < large, r = S * (big ? 0.18 + rand() * 0.17 : 0.02 + rand() * 0.07);
    const x = rand() * W, y = rand() * H, c = cols[Math.floor(rand() * cols.length)];
    const a = big ? 0.8 + rand() * 0.2 : 0.5 + rand() * 0.5, kind = pick(), rot = rand() * Math.PI * 2;
    if (kind === 'disc') disc(x, y, r, c, a);
    else if (kind === 'ring') disc(x, y, r, (px, py) => (Math.hypot(px - x, py - y) > r * 0.72 ? c : null), a);
    else {
      const n = kind === 'tri' ? 3 : 4, pts = [];
      for (let k = 0; k < n; k++) {
        const th = rot + (k / n) * Math.PI * 2;
        pts.push(x + Math.cos(th) * r, y + Math.sin(th) * r);
      }
      poly(pts, c, a);
    }
  }
}

/** Bauhaus: the primaries on cream, a few large discs, triangles and bars, ruled and spare. */
function bauhaus(ctx, pal) {
  const cols = pal.named.length ? pal.colours : [COLOURS.red, COLOURS.blue, COLOURS.yellow, INK];
  shapes(ctx, { ...pal, colours: cols }, ['disc', 'tri', 'rect']);
}

/** The abstract family's one pass: the field, then the grammar the words asked for. */
export function abstractPass(ctx) {
  const { scene, layout } = ctx, kinds = scene.abstract?.kinds ?? [];
  layout.horizon = null;
  layout.shore = null;
  layout.family = 'abstract';
  const pal = palette(ctx);
  fill(ctx, pal.ground);
  // A texture under everything: the field is paper, not a flat number.
  const { W, H, data } = ctx;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const g = (fbm(x / 40, y / 40, 81, 2) - 0.5) * 0.04, i = (y * W + x) * 3;
      data[i] = clamp(data[i] + g);
      data[i + 1] = clamp(data[i + 1] + g);
      data[i + 2] = clamp(data[i + 2] + g);
    }
  }
  const only = (k) => kinds.includes(k) && kinds.length === 1;
  if (only('gradient')) gradient(ctx, pal);
  else if (kinds.includes('mondrian')) mondrian(ctx, pal);
  else if (kinds.includes('mandala')) mandala(ctx, pal);
  else if (kinds.includes('opart')) opart(ctx, pal);
  else if (only('stripes')) stripes(ctx, pal);
  else if (kinds.includes('bauhaus')) bauhaus(ctx, pal);
  else {
    if (kinds.includes('gradient')) gradient(ctx, pal);
    if (kinds.includes('stripes')) stripes(ctx, pal);
    shapes(ctx, pal, kinds.filter((k) => ['disc', 'tri', 'rect'].includes(k)));
  }
}

export function installAbstract() {
  register('families', {
    id: 'abstract', detect: (scene) => scene.family === 'abstract', passes: [abstractPass, finishPass],
    words: WORDS, apply,
  });
}
