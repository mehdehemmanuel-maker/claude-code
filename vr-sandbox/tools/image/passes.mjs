// The passes, in the order the landscape family runs them: each paints one layer over the last, back to front, from
// the shared ctx (see core.mjs). None allocates per pixel: the colour helpers write into scratch arrays.
import { clamp, fbm, h2, lerp, mix, noise, smooth } from './math.mjs';
import { SIZES } from './draw.mjs';
import { shoreFor } from './things.mjs';
import { words } from './read.mjs';
import { grain, styleFor, vignette } from './styles.mjs';
import { placeText } from './text.mjs';

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
  if ((daytime || scene.things.sun) && !L.sunk) sunDisc(ctx, sunLow(scene)); // no sun disc at night, whatever the words
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

/**
 * The storm's sky: the gradient repainted grey, in the picture and in the snapshot the water reflects; at night dimmed
 * to a little under half, so it still reads as cloud over the horizon's band and not as a void.
 */
function stormSky(ctx) {
  const { W, H, hy, scene, data, sky } = ctx;
  const k = scene.time === 'night' ? 0.45 : 1, c = [0, 0, 0];
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

const FAR_GROUND = 5000; // the rows at the horizon are this many metres away, no farther: noise needs a number

/**
 * The plane from the horizon to the foot of the picture: water up to the shore, then one of the lands. Every row is
 * zm metres away through ctx.camera, so its texture is in metres and the road is SIZES.lanes lanes wide there, in
 * step with the things standing on it.
 */
export function groundPass(ctx) {
  const { W, H, hy, scene, rand, put, air, layout, camera } = ctx;
  // Where the water ends and the land begins: moved back for a thing that must stand on the near shore (things.mjs)
  const shoreY = scene.beach ? shoreFor(ctx, hy + (H - hy) * (0.45 + rand() * 0.2)) : H;
  ctx.shoreY = shoreY;
  layout.shore = scene.beach ? shoreY / H : null;
  const water = scene.ground === 'water';
  const row = {
    y: 0, near: 0, depth: 0, zm: 0, ppm: 0, grain: 0, skyY: 0, roadHalf: 0, lineHalf: 0, dash: false, bladeK: 0,
    wet: scene.rain > 0.3 || !!scene.wet, // hook for reader + honest-report: 'wet' is wetness, not rain
    here: water ? scene.land : scene.ground, water: false,
    groundColour: GROUND[scene.ground], landColour: GROUND[water ? scene.land : scene.ground],
    ...landFields(ctx), // hook for ground-weather: the land's season tint, the road's drift, verge and ruts, the
  }; // relief's strength, the tufts' density and the flowers (set per row by landRow)
  ctx.roadX = (y) => W * (0.5 + roadDrift(ctx.foot(y))); // hook for ground-weather: the road's centre at a row
  const c = [0, 0, 0], focal = camera.focal;
  for (let y = hy | 0; y < H; y++) {
    row.y = y;
    row.near = (y - hy) / (H - hy);
    row.depth = 1 - row.near;
    row.zm = Math.min(camera.groundZ(y + 0.5), FAR_GROUND);
    row.ppm = focal / row.zm; // pixels per metre along this row
    row.grain = clamp(row.ppm * 1.2); // texture finer than a pixel is not drawn, it would only be noise
    row.water = water && y < shoreY;
    row.skyY = hy - (y - hy) * 0.7; // what a wet surface reflects: the sky above, foreshortened
    row.roadHalf = SIZES.lane * SIZES.lanes / 2 * row.ppm;
    row.lineHalf = SIZES.centreLine / 2 * row.ppm;
    row.dash = row.zm % SIZES.dash.period < SIZES.dash.on;
    row.bladeK = 0.3 + row.near;
    landRow(ctx, row); // hook for ground-weather: its per-row fields
    for (let x = 0; x < W; x++) {
      const xm = (x + 0.5 - W / 2) / row.ppm; // metres right of the lens axis
      if (row.water) waterPixel(ctx, row, x, xm, c);
      else landPixel(ctx, row, x, xm, c);
      put(x, y, air(c, row.depth * row.depth, c));
    }
  }
}

/** The sky reflected, broken by ripples, darker nearer, with the sun's glitter laid across it when a disc is up. */
function waterPixel(ctx, row, x, xm, c) {
  const { W, hy, L, sun, getSky, lit } = ctx;
  const { y, near, zm } = row;
  const ripple = (fbm(xm * 0.4 + 1, zm * 0.4, 31, 4) - 0.5) * 0.4 * row.grain;
  getSky(x, Math.max(0, hy - (y - hy) * 0.9 + ripple * 60 * near), c);
  mix(c, row.groundColour, 0.5 + near * 0.3 + ripple, c);
  const sparkle = 0.5 + h2(x, y, 33) * (ripple + 0.2) * 3; // broken up by the ripples
  const glitter = Math.exp(-(((x / W - sun.x) * (6 + near * 10)) ** 2)) * (1 - near) * sparkle * ctx.gloom *
    (ctx.scene.storm ? 0 : 1); // no glitter without a sun
  lit(c, 0.9, c);
  const shine = !sun.visible ? 0 : L.sunk ? 0.25 : 0.5; // no glitter from a disc the storm hides
  c[0] = c[0] * 1.4 + glitter * shine * L.sun[0];
  c[1] = c[1] * 1.4 + glitter * shine * L.sun[1];
  c[2] = c[2] * 1.4 + glitter * shine * L.sun[2];
}

// ── The land (ground-weather) ──────
// What the ground plane is made of, pixel by pixel: the season's tint, dunes and ripples on sand, tufts and flowers
// on grass, the swell of named hills, the wet sheen on every land but snow, and the road over it (asphalt or dirt,
// drifting, with a verge). groundPass's row loop is water-reflections'; this section adds its fields to the row
// through landFields() once and landRow() per row, and paints through landPixel().

/** The land's colour by season: autumn's straw, spring's fresh green, summer's deep green; the rest as GROUND has. */
export const SEASON = {
  autumn: { land: [0.60, 0.52, 0.26], leaf: [[0.85, 0.45, 0.10], [0.62, 0.28, 0.10], [0.90, 0.65, 0.15]] },
  spring: { land: [0.32, 0.56, 0.18], leaf: [[0.35, 0.62, 0.22], [0.55, 0.70, 0.25]] },
  summer: { land: [0.26, 0.50, 0.14], leaf: [[0.16, 0.42, 0.12], [0.22, 0.48, 0.14]] },
};
const EVERGREEN = { autumn: [0.09, 0.28, 0.13], spring: [0.10, 0.34, 0.15], summer: [0.08, 0.30, 0.14] };

/**
 * The season's leaf colours for the tree drawer (core.mjs sets ctx.leaf from this): (pine, r) -> a colour, r in
 * 0..1 picking one of the season's broadleaf tones (orange, rust or gold in autumn); a pine stays evergreen. Null
 * when no season was named, so the drawer keeps its own PINE and BROADLEAF.
 */
export function seasonLeaf(scene) {
  const s = SEASON[scene.season];
  if (!s) return null;
  return (pine, r) => (pine ? EVERGREEN[scene.season] : s.leaf[Math.min(s.leaf.length - 1, (r * s.leaf.length) | 0)]);
}

/** The land's colour in its season: grass turns to straw in autumn; sand, snow and pavement keep theirs. */
export const seasonLand = (scene) => {
  const land = scene.ground === 'water' ? scene.land : scene.ground;
  return land === 'grass' && SEASON[scene.season] ? SEASON[scene.season].land : GROUND[land];
};

/** The road's centre drifts across the picture by its depth: a share of the width to add to 0.5. */
export const roadDrift = (near) => (fbm(near * 1.5, 0.3, 51, 3) - 0.5) * 0.35 * (1 - clamp(near));

const MEADOW = /^(meadows?|fields?)$/; // the words that bring flowers with them, besides the flowers thing
const VERGE = 0.12; // the dusty verge outside each kerb, as a share of the road's width
const RUT = { at: 1.65, half: 0.22 }; // a dirt road's wheel ruts: metres from the centre, half their width
const TUFT_DENSITY = 0.028; // tufts per pixel of grass at the foot of the picture, before the clumps
const DUNE = { cell: 16, tall: 4, key: 43 }; // dunes: the noise's lattice in metres, their height in metres
const HILL = { across: 2.5, rise: 0.25, key: 47 }; // named hills: swells across the width, their rise as a share
// of the ground band at the horizon

/** The fields this section adds to the ground row: once per picture here, per row in landRow(). */
export function landFields(ctx) {
  const { scene } = ctx;
  const named = words(scene.prompt ?? '');
  return {
    landTint: seasonLand(scene),
    hills: scene.instances?.some((i) => i.kind === 'hills' && i.count > 0) ?? false,
    flowers: 'flowers' in scene.things || named.some((w) => MEADOW.test(w)),
    rc: 0, vergeHalf: 0, rutAt: 0, rutHalf: 0, relief: 0, tuft: 0, flowerCell: 1,
  };
}

/** The per-row values: the road's centre, verge and ruts in pixels, the relief's strength, the tufts' density. */
export function landRow(ctx, row) {
  const { W, gloom, scale } = ctx, { near, ppm } = row;
  row.rc = W * (0.5 + roadDrift(near));
  row.vergeHalf = row.roadHalf * (1 + VERGE * 2);
  row.rutAt = RUT.at * ppm;
  row.rutHalf = RUT.half * ppm;
  // Relief finer than a few pixels is noise, not shape; under a storm's gloom the shapes still read, a little softer.
  row.relief = clamp(ppm * 4) * (0.6 + 0.4 * gloom);
  row.tuft = smooth(0.35, 0.65, near) * TUFT_DENSITY;
  row.flowerCell = Math.max(1, Math.round(2 * scale));
}

/**
 * How a slope is lit: the ground's normal from its slopes (metres up per metre across and away) against the sun's
 * direction, as a factor on the flat ground's light, 1 +- amp at most. Facing the sun brightens, the lee darkens.
 */
export function reliefShade(dir, hx, hz, amp, k = 1) {
  const inv = 1 / Math.sqrt(1 + hx * hx + hz * hz);
  const diffuse = (-hx * dir[0] + dir[1] - hz * dir[2]) * inv; // the normal against the light
  const ratio = diffuse / Math.max(dir[1], 0.1) - 1; // 0 on flat ground
  return 1 + amp * clamp(ratio * 5, -1, 1) * k;
}

/** A dune's profile from noise: a sharp crest where the noise crosses its middle, long flanks either side. */
const crest = (n) => 1 - Math.abs(2 * clamp(0.5 + (n - 0.5) * 2.2) - 1) ** 1.3;

/** A dune field in metres: out = [height 0..1, slope across, slope away]; the slopes in metres per metre. */
export function duneAt(xm, zm, out) {
  const u = xm / DUNE.cell, v = zm / DUNE.cell, e = 0.02, rise = DUNE.tall / DUNE.cell / e;
  const d0 = crest(fbm(u * 0.6, v * 0.3, DUNE.key, 4));
  out[0] = d0;
  out[1] = (crest(fbm((u + e) * 0.6, v * 0.3, DUNE.key, 4)) - d0) * rise;
  out[2] = (crest(fbm(u * 0.6, (v + e) * 0.3, DUNE.key, 4)) - d0) * rise;
  return out;
}

/**
 * The swell of named hills, in the frame: the ground's rise at (u across, near down), as rows of displacement of
 * the y mapping (a crest shows nearer ground than the flat plane would, a hollow farther), with its slopes across
 * the frame and down it, per unit of u and of near. The rise fades to nothing at the foot, so the near grass is calm.
 */
export function hillAt(u, near, band, out) {
  const e = 0.01, v = near * 2 + 0.3, amp = band * HILL.rise * (1 - near);
  const h0 = fbm(u * HILL.across, v, HILL.key, 3);
  out[0] = h0;
  out[1] = (fbm((u + e) * HILL.across, v, HILL.key, 3) - h0) / e; // rising to the right when positive
  out[2] = (fbm(u * HILL.across, v + e * 2, HILL.key, 3) - h0) / (e * 2); // rising toward the viewer when positive
  out[3] = (h0 - 0.5) * amp;
  return out;
}

/**
 * How much of a grass tuft stands at a pixel: a tuft is a vertical stroke 3-9 px tall (at 720 rows) rising from an
 * anchor pixel, anchors scattered by h2 at the row's density, thicker in clumps; 1 at the foot, half at the tip.
 */
export function tuftAt(ctx, row, x, y, xm, zm) {
  const { scale } = ctx, maxLen = Math.max(1, Math.round(9 * scale)), minLen = Math.max(1, Math.round(3 * scale));
  const clump = 0.3 + 1.4 * noise(xm * 0.15, zm * 0.15, 45), density = row.tuft * clump;
  for (let k = 0; k <= maxLen; k++) {
    const ya = y + k;
    if (h2(x, ya, 5) >= density) continue;
    const len = minLen + Math.floor(h2(x, ya, 6) * (maxLen - minLen + 1));
    if (k < len) return 1 - 0.5 * (k / len);
  }
  return 0;
}

const FLOWER = [[0.95, 0.85, 0.30], [0.92, 0.42, 0.62]]; // the two tones: buttercup and campion
const ASPHALT = [0.38, 0.38, 0.40], ASPHALT_WET = [0.22, 0.22, 0.23], DIRT = [0.55, 0.45, 0.32];
const DUST = [0.58, 0.52, 0.40], PAINT = [0.9, 0.85, 0.5], SKY = [0, 0, 0], ROAD = [0, 0, 0];
const TUFTTONE = [0.55, 0.72, 0.55], REL = [0, 0, 0, 0], FL = [0, 0, 0];

/** Grass, sand, snow or pavement from noise, with its relief, its sheen when wet, and the road where there is one. */
function landPixel(ctx, row, x, xm, c) {
  const { W, H, hy, scene, sun, getSky, lit, litGround } = ctx;
  const { y, near, here, wet, landTint } = row;
  let { zm } = row, shade = 1;
  if (row.hills && row.relief > 0) { // named hills: the y mapping displaced by the swell, lit by its slopes
    hillAt(x / W, near, H - hy, REL);
    const zd = ctx.groundZ(y + 0.5 + REL[3]); // the depth this pixel shows, up a crest or down a hollow
    if (zd < FAR_GROUND && zd > 0) {
      xm *= zd / zm;
      zm = zd;
    }
    // a flank rising toward the sun's side is lit, one rising toward the viewer faces away from a sun in front
    const facing = REL[1] * (sun.left ? 0.3 : -0.3) - REL[2] * 0.15 * sun.dir[2];
    shade = (1 + 0.35 * clamp(facing, -1, 1) * row.relief) * (0.86 + 0.28 * REL[0]); // crests drier and paler
  }
  const n = fbm(xm * 0.3, zm * 0.3, 41, 4);
  const blades = here === 'grass' ? (h2(x, y, 3) - 0.5) * 0.25 * row.bladeK : 0;
  let tone = 0.82 + (n * 0.36 - 0.18) * row.grain + 0.18 + blades;
  if (here === 'sand' && row.relief > 0) { // dunes: a lit crest, a shadowed lee, fine ripples near the foot
    duneAt(xm, zm, REL);
    shade *= reliefShade(sun.dir, REL[1], REL[2], 0.4, row.relief) * (0.88 + 0.24 * REL[0]);
    const rip = smooth(0.5, 0.7, near) * row.grain;
    if (rip > 0) tone += (fbm(xm * 0.35 + zm * 0.08, zm * 5, 44, 2) - 0.5) * 0.14 * rip;
  }
  tone *= shade;
  c[0] = landTint[0] * tone;
  c[1] = landTint[1] * tone;
  c[2] = landTint[2] * tone;
  litGround(c, 0.9 - near * 0.1, c); // the light mixed toward white: sunset tints the grass, not mud
  if (here === 'snow' && h2(x, y, 4) > 0.995) { // a glint off a crystal here and there
    c[0] += 0.1;
    c[1] += 0.1;
    c[2] += 0.1;
  }
  if (here === 'grass' && row.tuft > 0) { // tufts in the foreground, in a darker tone of the land's own
    const t = tuftAt(ctx, row, x, y, xm, zm);
    if (t > 0) {
      FL[0] = landTint[0] * TUFTTONE[0] * shade;
      FL[1] = landTint[1] * TUFTTONE[1] * shade;
      FL[2] = landTint[2] * TUFTTONE[2] * shade;
      mix(c, litGround(FL, 0.8 - near * 0.1, FL), 0.75 * t, c);
    }
    if (row.flowers && near > 0.3) { // two-tone flower dots, in patches
      const cell = row.flowerCell, cx = (x / cell) | 0, cy = (y / cell) | 0;
      const patch = clamp((noise(xm * 0.08, zm * 0.08, 46) - 0.35) * 3) * smooth(0.3, 0.6, near);
      if (h2(cx, cy, 71) < 0.03 * patch) mix(c, litGround(FLOWER[h2(cx, cy, 72) < 0.5 ? 0 : 1], 1, FL), 0.85, c);
    }
  }
  if (wet && here !== 'snow') mix(c, getSky(x, row.skyY, SKY), here === 'pavement' ? 0.25 : 0.15, c); // the sheen
  if (scene.road) road(ctx, row, x, n, shade, c);
}

/**
 * The road at a pixel: its centre drifting by depth (row.rc), two lanes wide from the metre scale, a dusty verge
 * outside each kerb; asphalt grey by day and dark when wet, with the dashed centre line; a dirt road brown with two
 * wheel ruts and no line. The kerb and the ruts land between pixels.
 */
function road(ctx, row, x, n, shade, c) {
  const { scene, getSky, lit, litGround } = ctx;
  const { wet } = row, off = Math.abs(x + 0.5 - row.rc), verge = row.vergeHalf - off + 0.5;
  if (verge <= 0) return;
  mix(DUST, row.landTint, 0.3, FL);
  mix(c, litGround(FL, 0.85, FL), clamp(verge) * 0.75, c); // the verge, worn to dust
  const edge = row.roadHalf - off + 0.5;
  if (edge <= 0) return;
  const dirt = scene.roadKind === 'dirt', base = dirt ? DIRT : wet ? ASPHALT_WET : ASPHALT, worn = 0.85 + n * 0.3;
  ROAD[0] = base[0] * worn * shade;
  ROAD[1] = base[1] * worn * shade;
  ROAD[2] = base[2] * worn * shade;
  if (dirt) { // the wheels' ruts, darker, where the tyres run
    const rut = clamp(row.rutHalf - Math.abs(off - row.rutAt) + 0.5) * clamp(row.rutHalf * 2);
    if (rut > 0) {
      const k = 1 - 0.22 * rut;
      ROAD[0] *= k;
      ROAD[1] *= k;
      ROAD[2] *= k;
    }
  }
  if (wet) mix(ROAD, getSky(x, row.skyY, SKY), dirt ? 0.25 : 0.4, ROAD);
  lit(ROAD, 1, ROAD);
  if (!dirt && row.dash) { // a line thinner than a pixel is a fainter pixel, not a brighter one
    const paint = clamp(row.lineHalf - off + 0.5) * clamp(row.lineHalf * 2);
    if (paint > 0) mix(ROAD, PAINT, paint, ROAD);
  }
  mix(c, ROAD, clamp(edge), c);
}

/**
 * Flowers are a flag on the land more than a thing: when the words name them (or a meadow or a field), landPixel
 * sprinkles two-tone dots over the near grass. Registered as a thing so the reader knows the word and counts it
 * ('a meadow with flowers' reads flowers 1, not 'not understood: flowers'); its drawer paints one small clump where
 * each counted flower stands, so 'three flowers' are three clumps as well as the sprinkle. core.mjs registers it
 * after the six built-ins.
 */
export const FLOWERS = {
  id: 'flowers', match: /^(flowers?|wildflowers?|blossoms?|daisies|daisy|poppies|poppy|tulips?|buttercups?)$/,
  usual: 1, depth: [6, 30], size: { w: 0.8, h: 0.4 },
  draw(ctx, inst) {
    const { W, disc, litGround } = ctx, s = ctx.camera.focal / inst.zm, x0 = inst.ux * W, fy = inst.fy;
    const r = Math.max(1, 0.06 * s), col = [0, 0, 0];
    for (let i = 0; i < 7; i++) {
      const dx = (h2(i, 1, 73) - 0.5) * 0.8 * s, dy = -h2(i, 2, 73) * 0.3 * s;
      disc(x0 + dx, fy + dy, r, litGround(FLOWER[i % 2], 1, col));
    }
    return { x: x0 - 0.4 * s, y: fy - 0.35 * s, w: 0.8 * s, h: 0.4 * s };
  },
};

// ── Weather and finish ─────────────
// Weather on every surface (ground-weather): rain and snow fall in three layers sized by distance, the far two
// painted before the things (weatherFarPass) so a near thing hides them, the near one over everything; wet darkens
// every surface below the horizon; snow settles on every sprite's recorded top edges (ctx.tops: roofs, bonnets,
// decks, ledges); fog thickens on every thing by its depth through ctx.fogK (read by ctx.sprite) and lies as a band
// over the whole. The streaks and flakes are placed by h2 from a key the sun's place seeds, not by ctx.rand, so the
// far layers consume no draws before the things are placed: the compositions stay as they were.

/** Rain's three layers, far to near: a share of the drops, their length in px at 720 rows, alpha, brightness. */
export const RAIN_LAYERS = [
  { share: 0.45, len: [5, 10], alpha: 0.22, bright: 0.2, width: 1 },
  { share: 0.35, len: [10, 20], alpha: 0.38, bright: 0.35, width: 1 },
  { share: 0.20, len: [18, 40], alpha: 0.55, bright: 0.5, width: 2 },
];
/** Snow's three layers, far to near: a share of the flakes, their radius in px at 720 rows, alpha. */
export const SNOW_LAYERS = [
  { share: 0.5, r: 0.6, alpha: 0.35 }, { share: 0.3, r: 1.1, alpha: 0.5 }, { share: 0.2, r: 2.2, alpha: 0.65 },
];
const FOG_PER_THING = 1.2; // how much the fog thickens the air's fade on a sprite, per unit of scene.fog
const WET_DARK = 0.12; // how much wet darkens everything below the horizon
const RIM = 3; // the snow rim on a flat top edge, in px at 720 rows (2 px at 540, 4-5 at 1080)

/** Before the things: the fog's thickness on every sprite, and the two far layers of rain or snow. */
export function weatherFarPass(ctx) {
  const { scene } = ctx;
  ctx.fogK = 1 + scene.fog * FOG_PER_THING;
  for (const k of [0, 1]) {
    if (scene.rain > 0) rain(ctx, k);
    if (scene.snow > 0) snow(ctx, k);
  }
}

/** Over everything: wet's darkening, settled snow on the tops, the fog's band, the near rain and snow. */
export function weatherPass(ctx) {
  const { scene } = ctx;
  if ((scene.wet || scene.rain > 0.3) && scene.land !== 'snow') wet(ctx);
  if (scene.land === 'snow') settle(ctx);
  if (scene.fog > 0) fog(ctx);
  if (scene.rain > 0) rain(ctx, 2);
  if (scene.snow > 0) snow(ctx, 2);
}

/** Wet darkens every surface below the horizon, eased in over a tenth of the height so nothing shows a seam. */
function wet(ctx) {
  const { W, H, hy, data } = ctx;
  for (let y = Math.max(0, Math.ceil(hy)); y < H; y++) {
    const k = 1 - WET_DARK * smooth(hy, hy + 0.1 * H, y), row = y * W * 3;
    for (let i = row; i < row + W * 3; i++) data[i] *= k;
  }
}

const SNOWRIM = [0.97, 0.98, 1]; // fresh snow: brighter than the trodden ground's
const SNOW_DEPTH = 0.06; // metres of snow lying on a flat top, for the rim's thickness at the thing's depth

/**
 * Snow on every top edge every sprite recorded (ctx.tops): a white rim 1-3 px thick where the edge is flat (an
 * upward face: a roof, a bonnet, a deck, a ledge), thinning to nothing where it is steep (a wall's side, a pine's
 * skirt, which carries its own); nothing on a thing in the sky; faded by the air at the thing's depth.
 */
function settle(ctx) {
  const { W, layout, litGround, air, put, scale, camera } = ctx, least = Math.max(1, Math.round(RIM * scale));
  const cap = litGround(SNOWRIM, 1), c = [0, 0, 0];
  ctx.tops.forEach((tops, id) => {
    const thing = layout.things[id], entry = thing && ctx.things.find((e) => e.id === thing.kind);
    if (!tops || entry?.sky) return;
    const foot = thing ? thing.y + thing.h : ctx.hy, zm = camera.groundZ(foot);
    // a few centimetres of snow at the thing's depth, a pixel or two at the least, six at the most
    const rim = clamp(Math.round(Math.max(least, SNOW_DEPTH * camera.focal / Math.min(zm, 1e6))), least, 8 * scale);
    air(cap, (1 - clamp(ctx.foot(foot))) * 0.3, c); // fresh snow stays white in the air
    for (let x = 1; x < W - 1; x++) {
      const t = tops[x];
      if (t < 0) continue;
      const l = tops[x - 1] < 0 ? t : tops[x - 1], r = tops[x + 1] < 0 ? t : tops[x + 1];
      const flat = clamp(1 - Math.abs(r - l) / 5); // rows per column across the edge: steep edges hold no snow
      if (flat <= 0) continue;
      const thick = Math.max(1, Math.round(rim * (0.5 + 0.5 * flat)));
      for (let k = 0; k < thick; k++) put(x, t + k, c, 0.95 * flat * (1 - 0.5 * k / thick));
    }
  });
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

/** The weather's key: the sun's place is a seeded draw, so another seed moves the rain and snow too. */
const weatherKey = (ctx, k) => 80 + k * 7 + ((ctx.sun.x * 997) | 0);

/** One layer of rain: streaks slanted by the wind (one slant for all three layers), longer and brighter nearer. */
function rain(ctx, k) {
  const { W, H, scene, put, get, scale } = ctx, L = RAIN_LAYERS[k], key = weatherKey(ctx, k);
  const count = Math.round((W * H) / 1800 * scene.rain * L.share), slant = (h2(1, 1, weatherKey(ctx, 0)) - 0.5) * 0.6;
  const wide = L.width > 1 && scale >= 0.75, c = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    const x = h2(i, 2, key) * W, y = h2(i, 3, key) * H, len = lerp(L.len[0], L.len[1], h2(i, 4, key)) * scale;
    mix(get(x, y, c), RAINDROP, L.bright, c);
    for (let t = 0; t < len; t++) {
      const px = x + t * slant, py = y + t;
      put(px, py, c, L.alpha);
      if (wide) put(px + 1, py, c, L.alpha * 0.5);
    }
  }
}

/** One layer of snow: soft flakes, the far ones under a pixel (a faint dot), the near ones a few pixels across. */
function snow(ctx, k) {
  const { W, H, scene, put, scale } = ctx, L = SNOW_LAYERS[k], key = weatherKey(ctx, k);
  const count = Math.round((W * H) / 900 * scene.snow * L.share), rr = L.r * scale, R = Math.ceil(rr);
  for (let i = 0; i < count; i++) {
    const x = h2(i, 2, key) * W, y = h2(i, 3, key) * H;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const a = L.alpha * clamp(1 - Math.hypot(dx, dy) / (rr + 0.5)) * Math.min(1, rr + 0.3);
        if (a > 0.01) put(x + dx, y + dy, SNOWFLAKE, a);
      }
    }
  }
}

/**
 * Grain against banding and a soft vignette (a twelfth at the corners, none by day) over the whole, unless the style
 * named turns them off; then the style (an unknown id is an Error listing the ids); then the text, crisp over it.
 */
export function finishPass(ctx) {
  const { W, H, data, styles, scene } = ctx;
  const style = ctx.style ? styleFor(ctx.style, styles) : null;
  if (style?.grain !== false) grain(data, W, H, 0.03, 71);
  if (style?.vignette !== false && scene.time !== 'day') vignette(data, W, H, 0.12);
  if (style) style.apply(ctx.img, ctx);
  const text = scene.text ?? ctx.text;
  if (text !== undefined && text !== null && text !== '') placeText(ctx, text);
}
