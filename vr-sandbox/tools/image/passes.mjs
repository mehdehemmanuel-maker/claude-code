// The passes, in the order the landscape family runs them: each paints one layer over the last, back to front, from
// the shared ctx (see core.mjs). None allocates per pixel: the colour helpers write into scratch arrays.
import { clamp, fbm, h2, lerp, mix, smooth } from './math.mjs';
import { SIZES } from './draw.mjs';
import { shoreFor } from './things.mjs';

/** What the ground is made of, by name. */
export const GROUND = {
  grass: [0.26, 0.48, 0.17], sand: [0.82, 0.70, 0.45], snow: [0.90, 0.92, 0.95], pavement: [0.40, 0.40, 0.42],
  water: [0.10, 0.25, 0.35],
};
const STAR = [0.9, 0.9, 1], MOONGLOW = [0.4, 0.45, 0.6], SUNCORE = [1, 1, 0.97];

// ── Sky ────────────────────────────

/** A gradient from the top down to the horizon, the sun's or moon's glow, and stars at night. */
export function skyPass(ctx) {
  const { W, H, hy, L, gloom, sun, scene, data } = ctx;
  const aspect = W / H, dim = 0.75 + gloom * 0.25, night = scene.time === 'night';
  // Stars per pixel: a taller picture gets the same number of them; below 360 rows the count shrinks with the area
  // instead, so a thumbnail is not speckled.
  const rare = 0.0025 / Math.max(ctx.scale, 0.5) ** 2;
  const starFactor = scene.things.stars ? 1 : 0.6;
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
        const halo = 0.5 * Math.exp(-d * d * 60);
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

/** Clouds from two layers of noise, lit where the noise rises toward the light, thinner toward the horizon. */
export function cloudPass(ctx) {
  const { W, hy, L, gloom, scene, put } = ctx;
  if (scene.clouds <= 0.05) return;
  const base = scene.storm ? 0.28 : scene.time === 'night' ? 0.12 : 0.92;
  const warm = scene.time === 'sunset' || scene.time === 'dawn', edge = 0.72 - scene.clouds * 0.42;
  const col = [0, 0, 0], out = [0, 0, 0];
  for (let y = 0; y < hy; y++) {
    const depth = y / hy, spread = 0.25 + depth * 1.6, sy = depth * 7;
    const tint = 0.35 * (1 - depth), cover = 0.55 + 0.45 * (1 - depth);
    for (let x = 0; x < W; x++) {
      const sx = (x / W) * 6 / spread;
      const n = fbm(sx + 3.1, sy, 11, 5), e = clamp((n - edge) * 4);
      if (e <= 0) continue;
      const shade = fbm(sx + 0.2, sy - 0.15, 11, 3) - n;
      const bright = clamp(base * (0.8 + shade * 2.2));
      col[0] = bright * L.light[0] * gloom;
      col[1] = bright * L.light[1] * gloom;
      col[2] = bright * L.light[2] * gloom;
      put(x, y, mix(col, warm ? L.horizon : col, tint, out), e * cover);
    }
  }
}

/** The sun's disc, or the moon's, over the clouds; first a snapshot of the sky without it, for the water. */
export function celestialPass(ctx) {
  const { W, H, hy, L, gloom, sun, scene, put } = ctx;
  ctx.sky = Float32Array.from(ctx.data); // the glitter on the water is drawn apart, so the disc is not reflected
  const cx = sun.x * W, cy = sun.y * H;
  const disc = (radius, shade) => { // only the rows and columns the disc can reach
    const reach = radius * H + 2;
    const y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(Math.ceil(hy), Math.ceil(cy + reach));
    const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(W, Math.ceil(cx + reach));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const d = Math.hypot((x / W - sun.x) * (W / H), y / H - sun.y) * H;
        if (d < radius * H) shade(x, y, d);
      }
    }
  };
  if (!L.sunk && !scene.storm) { // a storm hides the disc; its glow stays
    const core = mix(L.sun, SUNCORE, 0.5).map((v) => v * 1.15);
    disc(0.07, (x, y, d) => put(x, y, core, smooth(0.07 * H, 0.062 * H, d) * (0.6 + 0.4 * gloom)));
  } else if (scene.things.moon || scene.time === 'night') { // the moon, full
    const face = [0, 0, 0];
    disc(0.05, (x, y, d) => {
      const m = 0.78 + 0.2 * fbm(x / 9, y / 9, 7, 3);
      face[0] = m * 0.95;
      face[1] = m * 0.95;
      face[2] = m * 0.9;
      put(x, y, face, smooth(0.05 * H, 0.046 * H, d) * gloom);
    });
  }
}

// ── The land behind ────────────────

/** Ranges of mountains, then hills, each nearer one lower and darker, all fading into the air. */
export function landBehindPass(ctx) {
  const T = ctx.scene.things;
  const ranges = 'mountains' in T ? 3 : 0, hillRows = 'hills' in T ? 2 : 0;
  for (let r = 0; r < ranges + hillRows; r++) range(ctx, r, r < ranges, ranges, ranges + hillRows);
}

const ROCK = [0.35, 0.35, 0.40], SNOWCAP = [0.9, 0.92, 0.95], FOOTHILL = [0.2, 0.3, 0.15];
const LAND = { sand: [0.60, 0.48, 0.30], pavement: [0.30, 0.32, 0.30] };

/** One range: a ridge line from noise, each column shaded by which way its slope faces, snow above a line. */
function range(ctx, r, mountain, ranges, rows) {
  const { W, H, hy, scene, rand, put, lit, air, sun } = ctx;
  const key = 20 + r, depth = 1 - (r + 1) / (rows + 1), snowy = scene.land === 'snow';
  const tall = mountain ? (0.22 - r * 0.05) * H : (0.09 - (r - ranges) * 0.03) * H, jag = mountain ? 2.2 : 3.5;
  const off = rand() * 100;
  const ridge = (u) => {
    const n = fbm(u * jag * 1.8 + off, 0.5, key, 6);
    const n2 = mountain ? Math.abs(fbm(u * jag * 4 + off, 2.1, key + 50, 4) - 0.5) * 1.6 : 0;
    return 0.35 + n * 1.0 - n2 * 0.6;
  };
  const base = snowy || mountain ? ROCK : LAND[scene.land] ?? [0.25, 0.42, 0.20];
  const night = scene.time === 'night', c = [0, 0, 0], green = [0, 0, 0];
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const rise = ridge(u), top = hy - tall * rise - (r > 0 ? 0 : tall * 0.1);
    const slope = (ridge(u + 0.003) - rise) / 0.003 * tall / H; // the side facing the light is brighter
    const face = clamp(0.5 + slope * (sun.left ? -0.3 : 0.3), 0.1, 0.95);
    const snowline = 0.62 + (fbm(u * 30, 0.5, key + 7, 3) - 0.5) * 0.25;
    for (let y = Math.max(0, top | 0); y < hy; y++) {
      const peakness = clamp((hy - y) / Math.max(1, hy - top));
      const rock = 0.85 + 0.3 * fbm(x / 23, y / 23, key + 3, 3); // the rock's own grain: no face is one flat column
      const facet = clamp(face + (fbm(u * 40 + off, peakness * 4, key + 9, 3) - 0.5) * 0.6); // ledges and gullies
      c[0] = base[0] * rock;
      c[1] = base[1] * rock;
      c[2] = base[2] * rock;
      lit(c, 0.35 + 0.65 * facet, c);
      if (mountain && (snowy || peakness > snowline)) lit(SNOWCAP, 0.4 + 0.6 * facet, c);
      if (mountain && !night) { // green climbing the lower slopes
        lit(FOOTHILL, 0.4 + 0.6 * facet, green);
        mix(c, green, clamp(1 - peakness * 2.2) * (snowy ? 0 : 0.6), c);
      }
      put(x, y, air(c, depth, c));
    }
  }
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
  };
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
  const glitter = Math.exp(-(((x / W - sun.x) * (6 + near * 10)) ** 2)) * (1 - near) * sparkle;
  lit(c, 0.9, c);
  const shine = !sun.visible ? 0 : L.sunk ? 0.25 : 0.5; // no glitter from a disc the storm hides
  c[0] = c[0] * 1.4 + glitter * shine * L.sun[0];
  c[1] = c[1] * 1.4 + glitter * shine * L.sun[1];
  c[2] = c[2] * 1.4 + glitter * shine * L.sun[2];
}

const ASPHALT = [0.22, 0.22, 0.23], PAINT = [0.9, 0.85, 0.5], SKY = [0, 0, 0], ROAD = [0, 0, 0];

/** Grass, sand, snow or pavement from noise, and the road over it where there is one. */
function landPixel(ctx, row, x, xm, c) {
  const { W, scene, getSky, lit } = ctx;
  const { y, near, here, wet, zm } = row;
  const n = fbm(xm * 0.3, zm * 0.3, 41, 4);
  const blades = here === 'grass' ? (h2(x, y, 3) - 0.5) * 0.25 * row.bladeK : 0;
  const tone = 0.82 + (n * 0.36 - 0.18) * row.grain + 0.18 + blades;
  c[0] = row.landColour[0] * tone;
  c[1] = row.landColour[1] * tone;
  c[2] = row.landColour[2] * tone;
  lit(c, 0.9 - near * 0.1, c);
  if (here === 'snow' && h2(x, y, 4) > 0.995) { // a glint off a crystal here and there
    c[0] += 0.1;
    c[1] += 0.1;
    c[2] += 0.1;
  }
  if (scene.road) { // a road from the foot of the picture to the horizon, kerbed, with a dashed centre line
    const off = Math.abs(x + 0.5 - W / 2), edge = row.roadHalf - off + 0.5; // straight up the middle, 2 lanes wide
    if (edge > 0) {
      const worn = 0.85 + n * 0.3;
      ROAD[0] = ASPHALT[0] * worn;
      ROAD[1] = ASPHALT[1] * worn;
      ROAD[2] = ASPHALT[2] * worn;
      let surface = ROAD;
      if (wet) surface = mix(ROAD, getSky(x, row.skyY, SKY), 0.4, ROAD);
      lit(surface, 1, ROAD);
      const paint = row.dash ? clamp(row.lineHalf - off + 0.5) * clamp(row.lineHalf * 2) : 0; // a line thinner than a
      if (paint > 0) mix(ROAD, PAINT, paint, ROAD); // pixel is a fainter pixel, not a brighter one
      mix(c, ROAD, clamp(edge), c); // the kerb lands between pixels
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
