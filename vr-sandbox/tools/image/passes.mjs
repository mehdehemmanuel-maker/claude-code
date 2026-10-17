// The passes, in the order the landscape family runs them: each paints one layer over the last, back to front, from
// the shared ctx (see core.mjs). None allocates per pixel: the colour helpers write into scratch arrays.
import { clamp, fbm, h2, lerp, mix, smooth } from './math.mjs';

/** What the ground is made of, by name. */
export const GROUND = {
  grass: [0.26, 0.48, 0.17], sand: [0.82, 0.70, 0.45], snow: [0.90, 0.92, 0.95], pavement: [0.40, 0.40, 0.42],
  water: [0.10, 0.25, 0.35],
};
const STAR = [0.9, 0.9, 1], MOONGLOW = [0.4, 0.45, 0.6];

// ── Sky ────────────────────────────

/** A gradient from the top down to the horizon, the sun's or moon's glow, and stars at night. */
export function skyPass(ctx) {
  const { W, H, hy, L, gloom, sun, scene, data } = ctx;
  const aspect = W / H, dim = 0.75 + gloom * 0.25, night = scene.time === 'night';
  // Stars per pixel: a taller picture gets the same number of them; below 360 rows the count shrinks with the area
  // instead, so a thumbnail is not speckled.
  const rare = 0.0025 / Math.max(ctx.scale, 0.5) ** 2;
  const starFactor = scene.things.stars ? 1 : 0.6;
  const moonlit = noMoon(scene) ? 0 : 1; // hook for sky-light: no glow where no moon is
  const base = [0, 0, 0];
  // All the rows, not only to the horizon: the water and the wet ground reflect the sky just below it, and the ground
  // paints over the rest.
  for (let y = 0; y < H; y++) {
    const t = clamp(y / hy), dy = y / H - sun.y, row = y * W * 3;
    mix(L.top, L.horizon, t * t, base);
    for (let x = 0; x < W; x++) {
      const dx = (x / W - sun.x) * aspect, d = Math.hypot(dx, dy);
      let r = base[0], g = base[1], b = base[2];
      if (!L.sunk) {
        const glow = 0.55 * Math.exp(-d * d * 18) * gloom;
        r = lerp(r, L.sun[0], glow);
        g = lerp(g, L.sun[1], glow);
        b = lerp(b, L.sun[2], glow);
      }
      if (night) {
        const star = h2(x, y, 99);
        if (star > 1 - rare && t < 0.95) {
          const a = (star - (1 - rare)) / rare * 0.9 * starFactor * gloom;
          r = lerp(r, STAR[0], a);
          g = lerp(g, STAR[1], a);
          b = lerp(b, STAR[2], a);
        }
        const halo = 0.5 * Math.exp(-d * d * 60) * moonlit;
        r = lerp(r, MOONGLOW[0], halo);
        g = lerp(g, MOONGLOW[1], halo);
        b = lerp(b, MOONGLOW[2], halo);
      }
      const i = row + x * 3;
      data[i] = r * dim;
      data[i + 1] = g * dim;
      data[i + 2] = b * dim;
    }
  }
}

// ── Sun and moon ───────────────────

const SUNWHITE = [1, 1, 0.97], DEEPORANGE = [1, 0.40, 0.08], MOONFACE = [0.95, 0.95, 0.90];
const MOONDARK = [0.10, 0.11, 0.16];
/** How much of the moon's face is lit, by the word the reader kept; no word is a full moon, as before. */
const PHASES = { full: 1, half: 0.5, crescent: 0.2 };

/** No moon tonight: the reader says 'moonless' or 'new' (undefined is today's behaviour, a moon). */
const noMoon = (scene) => scene.moonPhase === 'moonless' || scene.moonPhase === 'new';

/** Whether the words set the hour: before 8 or from 17 the sun is low, else it is high (undefined: by the time). */
const sunLow = (scene) => {
  if (typeof scene.hour === 'number') return scene.hour < 8 || scene.hour >= 17;
  return scene.time === 'sunset' || scene.time === 'dawn';
};

/**
 * The sun's disc, or the moon's, BEFORE the clouds, so a cloud crossing either passes in front with its own lit edge.
 * First a snapshot of the sky without them, for the water: cloudPass paints its clouds into the snapshot as well, so
 * what the water reflects is the clouded sky without the disc, as it was when the disc came after the clouds (the
 * glitter on the water stands in for the disc).
 */
export function celestialPass(ctx) {
  const { L, scene, layout } = ctx;
  ctx.sky = Float32Array.from(ctx.data);
  layout.moon = null;
  const daytime = !L.sunk;
  if (scene.storm) return; // a storm hides both; the glow stays
  if (daytime || scene.things.sun) sunDisc(ctx, sunLow(scene));
  if ((scene.things.moon || scene.time === 'night') && !noMoon(scene)) moonDisc(ctx, daytime);
}

/** Runs shade(x, y, d) over the pixels within `reach` pixels of (cx, cy) (shares of W and H), above the horizon. */
function around(ctx, cx, cy, reach, shade) {
  const { W, H, hy } = ctx;
  const px = cx * W, py = cy * H, R = reach + 2;
  const y0 = Math.max(0, Math.floor(py - R)), y1 = Math.min(Math.ceil(hy), Math.ceil(py + R));
  const x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(W, Math.ceil(px + R));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = Math.hypot(x - px, y - py);
      if (d < reach) shade(x, y, d);
    }
  }
}

/**
 * The sun: a small disc by day, twice as wide when low, coloured from L.sun (15% white by day; none when low, where
 * it leans to a deep orange, deeper than its own glow in the sky), a soft edge, an inner halo over the sky's glow, and
 * the lower limb dissolving into the haze within a tenth of the height of the horizon.
 */
function sunDisc(ctx, low) {
  const { H, hy, L, gloom, sun, put } = ctx;
  const r = (low ? 0.07 : 0.035) * H, strength = 0.6 + 0.4 * gloom, dissolve = 0.1 * H;
  // Low, the sky's own glow is as orange as L.sun, so the disc reads as a deeper ball inside a paler halo.
  const c = low ? mix(L.sun, DEEPORANGE, 0.75) : mix(L.sun, SUNWHITE, 0.15), col = [0, 0, 0];
  const glow = mix(L.sun, SUNWHITE, low ? 0.3 : 0.1);
  around(ctx, sun.x, sun.y, 3 * r, (x, y, d) => {
    const halo = 0.5 * Math.exp(-((d / (1.8 * r)) ** 2));
    put(x, y, glow, halo * strength);
    if (d >= r) return;
    const haze = clamp(1 - (hy - y) / dissolve) ** 2; // 0 well above the horizon, 1 at it
    mix(c, L.horizon, haze * 0.5, col);
    put(x, y, col, smooth(r, 0.75 * r, d) * strength * (1 - haze * 0.5));
  });
}

/**
 * The moon, its face textured, shaded by its phase: the terminator is the ellipse x = (1 - 2f) * sqrt(1 - y²) for a
 * lit share f, the dark side a faint grey at night and nothing by day. By day it is pale, mixed with the sky behind
 * it, and stands across the sky from the sun; at night, where the sky's glow is.
 */
function moonDisc(ctx, daytime) {
  const { W, H, hy, gloom, sun, scene, layout, put, get } = ctx;
  const r = 0.05 * H;
  const mx = daytime ? 1 - sun.x : sun.x, my = daytime ? Math.min(sun.y, (hy / H) * 0.3) : sun.y;
  layout.moon = [mx, my];
  const f = PHASES[scene.moonPhase] ?? 1;
  const litSide = daytime ? Math.sign(sun.x - mx) || 1 : mx < 0.5 ? 1 : -1; // the lit limb faces the sun
  const face = [0, 0, 0], under = [0, 0, 0];
  around(ctx, mx, my, r, (x, y, d) => {
    const px = ((x - mx * W) / r) * litSide, py = (y - my * H) / r;
    const terminator = f >= 1 ? -2 : (1 - 2 * f) * Math.sqrt(Math.max(0, 1 - py * py));
    const lit = clamp((px - terminator) / 0.1 + 0.5);
    const m = 0.78 + 0.2 * fbm(x / 9, y / 9, 7, 3); // the seas and highlands
    face[0] = m * MOONFACE[0];
    face[1] = m * MOONFACE[1];
    face[2] = m * MOONFACE[2];
    const edge = smooth(r, 0.92 * r, d) * gloom;
    if (daytime) {
      mix(face, get(x, y, under), 0.5, face);
      put(x, y, face, edge * 0.55 * lit);
    } else {
      mix(MOONDARK, face, lit, face);
      put(x, y, face, edge * (0.35 + 0.65 * lit));
    }
  });
}

// ── Clouds ─────────────────────────

const STORMTOP = [0.18, 0.20, 0.26], STORMHORIZON = [0.45, 0.47, 0.50];
const STORMBASE = [0.24, 0.25, 0.29], STORMLIT = [0.50, 0.51, 0.54], STORMLOW = [0.13, 0.14, 0.17];

/**
 * Clouds from noise on a plane centred on the frame (the vanishing point in the middle, not the top left corner),
 * in two tones: a top lit from the sun's side in L.light, and a base that takes the horizon's colour, strongly at
 * dawn and sunset for the lit underside. Day clouds never fall below three quarters of L.light. Under a storm the
 * sky itself is repainted grey first and a second, lower deck darkens the lower sky. Night clouds are as they were.
 * Every cloud goes into ctx.sky too, so the water reflects the clouded sky.
 */
export function cloudPass(ctx) {
  const { W, hy, L, gloom, sun, scene, put, px } = ctx;
  if (scene.storm) stormSky(ctx);
  if (scene.clouds <= 0.05) return;
  const night = scene.time === 'night', warm = scene.time === 'sunset' || scene.time === 'dawn';
  const edge = scene.storm ? 0.25 : 0.72 - scene.clouds * 0.42, toSun = sun.left ? 0.2 : -0.2;
  // An overcast day is a little duller; a storm at night keeps its decks as dark as its sky.
  const dim = night && scene.storm ? 0.35 : night || scene.storm ? 1 : 0.7 + 0.3 * gloom;
  const top = L.light, base = [0, 0, 0], col = [0, 0, 0], sky = ctx.sky;
  mix([L.light[0] * 0.85, L.light[1] * 0.85, L.light[2] * 0.85], L.horizon, warm ? 0.85 : 0.5, base);
  const lay = (x, y, c, a) => { // into the picture and into the sky the water reflects
    put(x, y, c, a);
    if (!sky) return;
    const i = px(x, y);
    sky[i] = lerp(sky[i], c[0], a);
    sky[i + 1] = lerp(sky[i + 1], c[1], a);
    sky[i + 2] = lerp(sky[i + 2], c[2], a);
  };
  for (let y = 0; y < hy; y++) {
    const depth = y / hy, spread = 4 / (0.6 + depth * 1.4), sy = 1.5 + depth * 6;
    const cover = 0.55 + 0.45 * (1 - depth), lowDeck = scene.storm ? smooth(0.15, 0.6, depth) : 0;
    for (let x = 0; x < W; x++) {
      const sx = (x / W - 0.5) * spread;
      const n = fbm(sx + 3.1, sy, 11, 5), e = clamp((n - edge) * 5);
      if (e > 0) {
        const shade = fbm(sx + toSun, sy + 0.15, 11, 3) - n; // positive where the cloud rises toward the light
        if (night) {
          const bright = clamp(0.12 * (0.8 + shade * 2.2));
          col[0] = bright * L.light[0] * gloom;
          col[1] = bright * L.light[1] * gloom;
          col[2] = bright * L.light[2] * gloom;
        } else if (scene.storm) {
          mix(STORMBASE, STORMLIT, clamp(shade * 4), col);
        } else {
          mix(base, top, clamp(shade * 4), col);
        }
        col[0] *= dim;
        col[1] *= dim;
        col[2] *= dim;
        lay(x, y, col, e * cover);
      }
      if (lowDeck > 0) { // the storm's second deck, twice as fine, under the first
        const e2 = clamp((fbm(sx * 2 + 7.7, sy * 2, 12, 4) - 0.5) * 4) * lowDeck;
        if (e2 > 0) lay(x, y, STORMLOW, e2 * 0.7);
      }
    }
  }
}

/** The storm's sky: the gradient repainted grey, in the picture and in the snapshot the water reflects. */
function stormSky(ctx) {
  const { W, H, hy, scene, data, sky } = ctx;
  const k = scene.time === 'night' ? 0.3 : 1, c = [0, 0, 0];
  for (let y = 0; y < H; y++) {
    const t = clamp(y / hy), row = y * W * 3;
    mix(STORMTOP, STORMHORIZON, t * t, c);
    for (let x = 0; x < W; x++) {
      const i = row + x * 3;
      data[i] = c[0] * k;
      data[i + 1] = c[1] * k;
      data[i + 2] = c[2] * k;
      if (sky) {
        sky[i] = data[i];
        sky[i + 1] = data[i + 1];
        sky[i + 2] = data[i + 2];
      }
    }
  }
}

// ── The land behind ────────────────

/**
 * Ranges of mountains, then rows of hills, each nearer one lower, darker and warmer, all fading into the air: as
 * many ranges as the words counted, up to four (a count of 0 is the usual three), and up to three rows of hills.
 */
export function landBehindPass(ctx) {
  const T = ctx.scene.things;
  const ranges = 'mountains' in T ? Math.min(T.mountains || 3, 4) : 0;
  const hillRows = 'hills' in T ? Math.min(T.hills || 2, 3) : 0;
  ctx.layout.ranges = [];
  for (let r = 0; r < ranges + hillRows; r++) range(ctx, r, r < ranges, ranges, ranges + hillRows);
}

const ROCK = [0.35, 0.35, 0.40], NEARROCK = [0.22, 0.19, 0.17], SNOWCAP = [0.9, 0.92, 0.95];
const SNOWSHADE = [0.62, 0.70, 0.85], TREELINE = [0.07, 0.17, 0.08];
const LAND = { sand: [0.60, 0.48, 0.30], pavement: [0.30, 0.32, 0.30] };

/**
 * One range: a ridge of ridged noise (sharp peaks, offset and lower than the range behind, so they interleave), each
 * flank lit by which way it faces, the sun's side bright like the trees and houses are; facets from a 2D field in
 * screen units, so no column is a stripe; snow above an absolute height over the horizon, blue-grey on the shadow
 * side; a scattered treeline at the foot of the nearest range. Reports each ridge to layout.ranges.
 */
function range(ctx, r, mountain, ranges, rows) {
  const { W, H, hy, scene, rand, put, lit, air, sun, scale, layout } = ctx;
  const key = 20 + r, depth = 1 - (r + 1) / (rows + 1), snowy = scene.land === 'snow';
  // Each nearer range is lower and its peaks broader (closer), so the ranges interleave instead of stacking.
  const tall = mountain ? (0.24 - r * 0.055) * H : (0.09 - (r - ranges) * 0.03) * H;
  const jag = mountain ? 3.0 - r * 0.4 : 3.5;
  const off = rand() * 100;
  // Ridged noise: the crease of 1 - |2n - 1| is a peak. The noise is stretched first (fbm sits close to 0.5), or the
  // crease would run along the whole top as a plateau with notches, instead of standing up as summits.
  const ridged = (u, oct) => {
    const n = clamp(0.5 + (fbm(u * jag * 1.8 + off, 0.5, key, oct) - 0.5) * 2.4);
    return 0.3 + (1 - Math.abs(2 * n - 1)) ** 1.6 * 1.1;
  };
  const ridge = mountain ? (u) => ridged(u, 6) : (u) => 0.35 + fbm(u * jag * 1.8 + off, 0.5, key, 6);
  const far = snowy || mountain ? ROCK : LAND[scene.land] ?? [0.25, 0.42, 0.20];
  const base = mountain ? mix(far, NEARROCK, (1 - depth) * 0.55) : far; // the near range darker and warmer
  // The faces are lit from the broad shape of the ridge (three octaves), not from every notch of its six.
  const broad = mountain ? (u) => ridged(u, 3) : (u) => 0.35 + fbm(u * jag * 1.8 + off, 0.5, key, 3);
  const nearest = mountain && r === ranges - 1, trees = nearest && (scene.land === 'grass' || snowy);
  // The snowline is an absolute height over the horizon, set against the farthest range, so only the tall parts carry
  // snow; the treeline a little way up the foot of the nearest range.
  const snowBase = 0.24 * H * (snowy ? 0.55 : 0.9), grain = 23 * scale, dot = Math.max(1, Math.round(1.5 * scale));
  const toSun = sun.left ? 0.35 : -0.35, lit1 = (slope) => clamp(0.5 + slope * toSun, 0.08, 0.95);
  const c = [0, 0, 0], s = [0, 0, 0], tops = [], faces = [], feet = [];
  for (let x = 0; x < W; x++) { // the ridge and how each column of it faces the light, at the crest and at the foot
    const u = x / W;
    const slope = (broad(u + 0.004) - broad(u - 0.004)) / 0.008 * tall / H; // > 0: rising to the right, facing left
    const face = lit1(slope); // the flank facing the sun is lit
    tops.push(hy - tall * ridge(u));
    faces.push(face);
    feet.push(lit1((broad(u + 0.02) - broad(u - 0.02)) / 0.04 * tall / H)); // a spire's foot is a broader shape
    ctx.probe?.('face', r, x, face, slope);
  }
  for (let x = 0; x < W; x++) {
    const u = x / W, top = tops[x];
    const snowAt = snowBase + (fbm(u * 30, 0.5, key + 7, 3) - 0.5) * 0.08 * H;
    const treeAt = (0.035 + (fbm(u * 25, 1.5, key + 8, 3) - 0.5) * 0.03) * H;
    for (let y = Math.max(0, top | 0); y < hy; y++) {
      const up = hy - y, down = 1 - up / (hy - top + 1); // pixels over the horizon; 0 at the crest, 1 at the foot
      // The gully between two faces wanders as it comes down, so the faces are not panels with straight seams.
      const wander = (fbm(u * 8 + off, (up / H) * 6, key + 11, 2) - 0.5) * 0.06 * W * down;
      const col = clamp((x + wander) | 0, 0, W - 1), face = lerp(faces[col], feet[col], down);
      const rock = 0.85 + 0.3 * fbm(x / grain, y / grain, key + 3, 3); // the rock's own grain
      const facet = clamp(face + (fbm(u * 25 + off, (up / H) * 25, key + 9, 3) - 0.5) * 0.6); // ledges and gullies
      c[0] = base[0] * rock;
      c[1] = base[1] * rock;
      c[2] = base[2] * rock;
      lit(c, mountain ? 0.15 + 0.85 * facet : 0.35 + 0.65 * facet, c); // rock takes the light harder than turf
      if (mountain) {
        const fringe = 0.012 * H * (0.5 + h2(x, y, key + 5)); // a broken edge to the snow
        const snow = smooth(snowAt - fringe, snowAt + fringe, up);
        if (snow > 0) {
          mix(SNOWSHADE, SNOWCAP, facet, s);
          mix(c, lit(s, 0.4 + 0.6 * facet, s), snow, c);
        }
        if (trees && up < treeAt + 0.015 * H) { // scattered, in clumps, thinning upward
          const clump = clamp((fbm(u * 50, (up / H) * 50, key + 10, 2) - 0.3) * 2);
          const density = smooth(treeAt + 0.015 * H, treeAt - 0.03 * H, up) * 0.5 * clump;
          if (h2((x / dot) | 0, (y / dot) | 0, key + 6) < density) mix(c, lit(TREELINE, 0.3 + 0.7 * facet, s), 0.85, c);
        }
      }
      put(x, y, air(c, depth, c));
    }
  }
  layout.ranges.push({ kind: mountain ? 'mountains' : 'hills', depth, top: tops });
}

// ── The ground ─────────────────────

/** The plane from the horizon to the foot of the picture: water up to the shore, then one of the lands. */
export function groundPass(ctx) {
  const { W, H, hy, scene, rand, put, air, layout } = ctx;
  const shoreY = scene.beach ? hy + (H - hy) * (0.45 + rand() * 0.2) : H; // where the water ends and the land begins
  ctx.shoreY = shoreY;
  layout.shore = scene.beach ? shoreY / H : null;
  const water = scene.ground === 'water';
  const row = {
    y: 0, near: 0, depth: 0, scale: 0, skyY: 0, roadWidth: 0, dash: false, bladeK: 0,
    wet: scene.rain > 0.3, here: water ? scene.land : scene.ground, water: false,
    groundColour: GROUND[scene.ground], landColour: GROUND[water ? scene.land : scene.ground],
  };
  const c = [0, 0, 0];
  for (let y = hy | 0; y < H; y++) {
    row.y = y;
    row.near = (y - hy) / (H - hy);
    row.depth = 1 - row.near;
    row.scale = 1 / (0.02 + row.near * row.near * 1.2);
    row.water = water && y < shoreY;
    row.skyY = hy - (y - hy) * 0.7; // what a wet surface reflects: the sky above, foreshortened
    row.roadWidth = 0.09 + row.near * 0.45;
    row.dash = Math.floor(row.near * row.near * 40) % 2 === 0;
    row.bladeK = 0.3 + row.near;
    for (let x = 0; x < W; x++) {
      const u = (x / W - 0.5) * row.scale;
      if (row.water) waterPixel(ctx, row, x, u, c);
      else landPixel(ctx, row, x, u, c);
      put(x, y, air(c, row.depth * row.depth, c));
    }
  }
}

/** The sky reflected, broken by ripples, darker nearer, with the sun's glitter laid across it. */
function waterPixel(ctx, row, x, u, c) {
  const { W, hy, L, sun, getSky, lit } = ctx;
  const { y, near } = row;
  const ripple = (fbm(u * 3 + 1, row.scale * 0.4, 31, 4) - 0.5) * 0.4;
  getSky(x, Math.max(0, hy - (y - hy) * 0.9 + ripple * 60 * near), c);
  mix(c, row.groundColour, 0.5 + near * 0.3 + ripple, c);
  const sparkle = 0.5 + h2(x, y, 33) * (ripple + 0.2) * 3; // broken up by the ripples
  const glitter = Math.exp(-(((x / W - sun.x) * (6 + near * 10)) ** 2)) * (1 - near) * sparkle * ctx.gloom *
    (ctx.scene.storm ? 0 : 1); // no glitter without a sun
  lit(c, 0.9, c);
  const shine = L.sunk ? 0.25 : 0.5;
  c[0] = c[0] * 1.4 + glitter * shine * L.sun[0];
  c[1] = c[1] * 1.4 + glitter * shine * L.sun[1];
  c[2] = c[2] * 1.4 + glitter * shine * L.sun[2];
}

const ASPHALT = [0.22, 0.22, 0.23], PAINT = [0.9, 0.85, 0.5], SKY = [0, 0, 0], ROAD = [0, 0, 0];

/** Grass, sand, snow or pavement from noise, and the road over it where there is one. */
function landPixel(ctx, row, x, u, c) {
  const { W, scene, getSky, lit } = ctx;
  const { y, near, here, wet } = row;
  const n = fbm(u * 2, row.scale * 0.35, 41, 4);
  const blades = here === 'grass' ? (h2(x, y, 3) - 0.5) * 0.25 * row.bladeK : 0;
  const tone = 0.82 + n * 0.36 + blades;
  c[0] = row.landColour[0] * tone;
  c[1] = row.landColour[1] * tone;
  c[2] = row.landColour[2] * tone;
  lit(c, 0.9 - near * 0.1, c);
  if (here === 'snow' && h2(x, y, 4) > 0.995) { // a glint off a crystal here and there
    c[0] += 0.1;
    c[1] += 0.1;
    c[2] += 0.1;
  }
  if (scene.road) { // a road from the foot of the picture to the horizon, kerbed, with a dashed line
    const d = Math.abs(x / W - 0.5) / row.roadWidth; // straight up the middle (a wandering road is a later round)
    if (d < 1) {
      const worn = 0.85 + n * 0.3;
      ROAD[0] = ASPHALT[0] * worn;
      ROAD[1] = ASPHALT[1] * worn;
      ROAD[2] = ASPHALT[2] * worn;
      let surface = ROAD;
      if (wet) surface = mix(ROAD, getSky(x, row.skyY, SKY), 0.4, ROAD);
      if (d < 0.025 && row.dash) surface = PAINT;
      mix(lit(surface, 1, ROAD), c, smooth(0.9, 1, d), c);
    }
  }
  if (wet && here !== 'snow' && !scene.road) mix(c, getSky(x, row.skyY, SKY), 0.15, c);
}

// ── Weather and finish ─────────────

/** Over everything: fog thickening toward the horizon, rain streaked by the wind, snow falling. */
export function weatherPass(ctx) {
  const { scene } = ctx;
  if (scene.fog > 0) fog(ctx);
  if (scene.rain > 0) rain(ctx);
  if (scene.snow > 0) snow(ctx);
}

function fog(ctx) {
  const { W, H, hy, L, gloom, scene, put } = ctx;
  const bank = mix(L.horizon, [0.8, 0.8, 0.82], 0.5).map((v) => v * gloom), fogginess = scene.fog;
  for (let y = 0; y < H; y++) {
    const near = y > hy ? (y - hy) / (H - hy) : 0, band = Math.exp(-(((y - hy) / (H * 0.25)) ** 2));
    const thick = fogginess * (0.25 + band * 0.6 - near * 0.3);
    for (let x = 0; x < W; x++) put(x, y, bank, clamp(thick + fbm(x / 150, y / 80, 61, 3) * fogginess * 0.25));
  }
}

const RAINDROP = [0.85, 0.88, 0.95], SNOWFLAKE = [0.95, 0.96, 1];

function rain(ctx) {
  const { W, H, scene, rand, put, get, scale } = ctx;
  const count = (W * H) / 1800 * scene.rain, slant = (rand() - 0.5) * 0.6;
  for (let i = 0; i < count; i++) {
    const x = rand() * W, y = rand() * H, len = (10 + rand() * 20) * scale;
    const c = mix(get(x, y), RAINDROP, 0.35);
    for (let t = 0; t < len; t++) put(x + t * slant, y + t, c, 0.5);
  }
}

function snow(ctx) {
  const { W, H, scene, rand, put, scale } = ctx;
  const count = (W * H) / 900 * scene.snow;
  for (let i = 0; i < count; i++) {
    const x = rand() * W, y = rand() * H, r = Math.max(1, Math.round((rand() < 0.2 ? 2 : 1) * scale)); // whole pixels
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) put(x + dx, y + dy, SNOWFLAKE, 0.6 * (1 - Math.hypot(dx, dy) / (r + 1)));
    }
  }
}

/** Grain and a vignette over the whole, then the style, when one is named. */
export function finishPass(ctx) {
  const { W, H, data, styles } = ctx;
  for (let y = 0; y < H; y++) {
    const vy = (y / H - 0.5) ** 2, row = y * W * 3;
    for (let x = 0; x < W; x++) {
      const i = row + x * 3, g = (h2(x, y, 71) - 0.5) * 0.03, v = 1 - 0.35 * ((x / W - 0.5) ** 2 + vy) * 2;
      data[i] = clamp((data[i] + g) * v);
      data[i + 1] = clamp((data[i + 1] + g) * v);
      data[i + 2] = clamp((data[i + 2] + g) * v);
    }
  }
  const style = ctx.style && styles.find((s) => s.id === ctx.style);
  if (style) style.apply(ctx.img, ctx);
}
