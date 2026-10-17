#!/usr/bin/env node
// An image from words, generated here: no model, no service, no key. The words are read into a scene (the time of day,
// the weather, the ground, what stands on it and how many), the scene is painted pixel by pixel (sky, sun or moon and
// stars, clouds, ranges of mountains fading into the air, water with a reflection, grass, sand, snow, a road, trees,
// houses, buildings, a car, a boat, birds, rain, snow, fog, grain), and the pixels are written as a PNG by this file's
// own encoder. One file, Node 18+, nothing to install; usable from a shell or imported (`paint`, `read`, `png`).
//
//   node tools/image.mjs "a red go-kart on a wet road at dusk, mountains behind"
//   node tools/image.mjs "three pine trees by a lake under a full moon, snow"
//   node tools/image.mjs "a city skyline at night in the rain" --size 1920x1080 --seed 7
//   node tools/image.mjs "a cabin in a foggy forest at dawn" --describe
//
//   --out <file>     where to save (default: images/<date>-<slug>.png)
//   --size WxH       picture size (default 1280x720)
//   --seed <n>       the random choices (default: from the words, so the same words give the same picture)
//   --describe       print what the words were read as (JSON) and stop, no picture
//
// What is understood: time (dawn, day, sunset/dusk, night), weather (clear, cloudy, overcast, storm, fog/mist, rain,
// snow), ground (grass/meadow, desert/sand, snow, sea/ocean/lake/water, beach, road/track/street, city), things
// (mountains, hills, trees/forest/pines, house/cabin/barn, buildings/city/skyline, car/kart/truck, boat/ship, birds,
// sun, moon, stars) with counts ("three trees", "two houses") and colours before things ("red car", "blue house").
// Anything else in the words is ignored, and --describe shows exactly what was kept.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// ── Words to a scene ──────────────────────────────────────────────────────────────────────────────────────────────

const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12, few: 3, several: 5, many: 9, lots: 12 };
const COLOURS = { red: [0.80, 0.12, 0.10], blue: [0.15, 0.35, 0.80], green: [0.15, 0.55, 0.20], yellow: [0.92, 0.80, 0.15], orange: [0.95, 0.50, 0.10], white: [0.92, 0.92, 0.92], black: [0.08, 0.08, 0.09], grey: [0.5, 0.5, 0.52], gray: [0.5, 0.5, 0.52], pink: [0.95, 0.55, 0.70], purple: [0.50, 0.20, 0.65], brown: [0.45, 0.28, 0.15], silver: [0.75, 0.77, 0.80], gold: [0.85, 0.68, 0.20] };
const THINGS = {
  mountains: /^(mountains?|alps|peaks?|range)$/, hills: /^hills?$/, trees: /^(trees?|forest|woods?|pines?|firs?)$/,
  houses: /^(houses?|cabins?|cottages?|barns?|huts?)$/, buildings: /^(buildings?|city|town|skyline|skyscrapers?|towers?)$/,
  cars: /^(cars?|karts?|go-?karts?|trucks?|vehicles?|buggy|jeep)$/, boats: /^(boats?|ships?|sailboats?|yachts?)$/,
  birds: /^(birds?|gulls?|seagulls?|crows?)$/, sun: /^sun$/, moon: /^moon$/, stars: /^(stars?|starry)$/,
};

/** Reads words into a scene: what the picture is of. Every choice is from a word, or a default named here. */
export function read(prompt) {
  const words = prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const has = (re) => words.some((w) => re.test(w));
  const s = {
    prompt, time: 'day', clouds: 0.35, fog: 0, rain: 0, snow: 0, storm: false, ground: 'grass', road: false, beach: false,
    things: {}, colours: {}, land: 'grass', // the land beside water, when both are named
  };
  if (has(/^(night|midnight|nights?|starry|stars)$/)) s.time = 'night';
  else if (has(/^(sunset|dusk|evening|sundown|twilight)$/)) s.time = 'sunset';
  else if (has(/^(dawn|sunrise|morning|daybreak)$/)) s.time = 'dawn';
  if (has(/^(cloudy|clouds?)$/)) s.clouds = 0.65;
  if (has(/^(overcast|gloomy|grey|gray)$/)) s.clouds = 0.9;
  if (has(/^(clear|cloudless)$/)) s.clouds = 0.05;
  if (has(/^(storm|stormy|thunder)$/)) { s.storm = true; s.clouds = 0.95; s.rain = 0.8; }
  if (has(/^(fog|foggy|mist|misty|haze|hazy)$/)) s.fog = 0.6;
  if (has(/^(rain|rainy|raining|wet|drizzle)$/)) s.rain = Math.max(s.rain, 0.6);
  let land;
  if (has(/^(snow|snowy|snowing|winter|blizzard)$/)) { s.snow = 0.7; land = 'snow'; }
  if (has(/^(desert|sand|dunes?|sandy)$/)) land = 'sand';
  if (has(/^(meadow|grass|field|fields|prairie|grassy)$/)) land = 'grass';
  if (has(/^(city|town|skyline|street)$/)) land = 'pavement';
  if (has(/^(road|track|street|highway|lane|racetrack)$/)) s.road = true;
  const water = has(/^(sea|ocean|lake|water|river|bay|coast|harbour|harbor)$/), beach = has(/^(beach|shore|seaside|lakeside)$/);
  if (water || beach) { s.ground = 'water'; s.beach = beach || !!land || s.road; s.land = land ?? (beach ? 'sand' : 'grass'); }
  else if (land) { s.ground = land; s.land = land; }
  for (let i = 0; i < words.length; i++) {
    for (const [thing, re] of Object.entries(THINGS)) {
      if (!re.test(words[i])) continue;
      // 0 is "the usual number of them" (a forest, mountains); a number right before the noun, or one adjective back, counts.
      const collective = /^(forest|woods|city|town|skyline|alps|range)$/.test(words[i]);
      let n = ['sun', 'moon', 'stars'].includes(thing) || !(/s$/.test(words[i]) || collective) ? 1 : 0;
      let colour;
      if (!collective) for (let j = i - 1; j >= Math.max(0, i - 2); j--) if (NUMBERS[words[j]] !== undefined && !(j === i - 2 && words[j].length <= 2)) { n = NUMBERS[words[j]]; break; }
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) if (COLOURS[words[j]]) colour = words[j];
      s.things[thing] = Math.max(s.things[thing] ?? 0, n);
      if (colour) s.colours[thing] = colour;
    }
  }
  if (s.things.boats && s.ground !== 'water') { s.beach = s.ground !== 'grass' || s.road || !!s.things.houses || !!s.things.trees; s.land = s.ground; s.ground = 'water'; }
  if (s.things.stars && s.time === 'day') s.time = 'night';
  if (s.things.moon && s.time === 'day') s.time = 'night';
  if (s.things.buildings && s.ground === 'grass') s.ground = s.land = 'pavement';
  if (s.things.buildings && s.ground === 'water') s.land = 'pavement';
  if (!('mountains' in s.things) && !('hills' in s.things) && !('buildings' in s.things) && s.ground !== 'water') s.things.hills = 0; // something to break the horizon
  return s;
}

// ── Numbers to lean on ────────────────────────────────────────────────────────────────────────────────────────────

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const h2 = (x, y, k) => { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 2246822519); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
function noise(x, y, k = 0) { // value noise, smooth between lattice points
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h2(xi, yi, k), h2(xi + 1, yi, k), u), lerp(h2(xi, yi + 1, k), h2(xi + 1, yi + 1, k), u), v);
}
function fbm(x, y, k = 0, oct = 5) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += a * noise(x, y, k + i); n += a; x *= 2.03; y *= 1.97; a *= 0.5; } return s / n; }

// ── The palette by time of day ────────────────────────────────────────────────────────────────────────────────────

const LIGHT = {
  day: { top: [0.30, 0.52, 0.90], horizon: [0.72, 0.82, 0.92], sun: [1, 0.97, 0.85], light: [1, 0.97, 0.90], ambient: 0.55, height: 0.72, sunk: false },
  dawn: { top: [0.35, 0.40, 0.70], horizon: [0.98, 0.70, 0.45], sun: [1, 0.80, 0.55], light: [1, 0.85, 0.65], ambient: 0.45, height: 0.12, sunk: false },
  sunset: { top: [0.20, 0.18, 0.45], horizon: [0.98, 0.50, 0.25], sun: [1, 0.60, 0.30], light: [1, 0.70, 0.45], ambient: 0.38, height: 0.08, sunk: false },
  night: { top: [0.02, 0.03, 0.09], horizon: [0.08, 0.10, 0.20], sun: [0.92, 0.93, 0.85], light: [0.55, 0.62, 0.80], ambient: 0.16, height: 0.55, sunk: true },
};

// ── Painting ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Paints a scene (from `read`) into { width, height, data: Float32Array rgb in 0..1 }. */
export function paint(scene, { width = 1280, height = 720, seed } = {}) {
  const W = width, H = height, data = new Float32Array(W * H * 3);
  const rand = rng(seed ?? hash(scene.prompt));
  const L = LIGHT[scene.time], gloom = scene.storm ? 0.45 : clamp(1 - scene.clouds * 0.45 - scene.fog * 0.2);
  const horizon = 0.58 + (rand() - 0.5) * 0.06; // as a share of the height, from the top
  const hy = horizon * H;
  const sunX = 0.2 + rand() * 0.6, sunY = horizon - L.height * horizon * (0.5 + rand() * 0.5);
  const sunLeft = sunX < 0.5;
  const px = (x, y) => (y * W + x) * 3;
  const put = (x, y, c, a = 1) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = px(x | 0, y | 0); data[i] = lerp(data[i], c[0], a); data[i + 1] = lerp(data[i + 1], c[1], a); data[i + 2] = lerp(data[i + 2], c[2], a); };
  const get = (x, y) => { const i = px(clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1)); return [data[i], data[i + 1], data[i + 2]]; };
  const air = (c, depth) => mix(c, mix(L.horizon, [0.75, 0.78, 0.82], scene.fog * 0.5), clamp(depth * (0.55 + scene.fog * 0.6)));
  const lit = (c, k) => c.map((v, i) => v * (L.ambient + k * (1 - L.ambient)) * L.light[i] * gloom);
  const T = scene.things, usual = (thing, n) => (thing in T ? T[thing] || n : 0);

  // Sky: a gradient, the sun's or moon's glow, stars, then clouds.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = clamp(y / hy);
    let c = mix(L.top, L.horizon, t * t);
    const dx = (x / W - sunX) * (W / H), dy = y / H - sunY, d = Math.hypot(dx, dy);
    if (!L.sunk) c = mix(c, L.sun, 0.55 * Math.exp(-d * d * 18) * gloom);
    if (scene.time === 'night') {
      const s = h2(x, y, 99);
      if (s > 0.9975 && t < 0.95) c = mix(c, [0.9, 0.9, 1], (s - 0.9975) / 0.0025 * 0.9 * (scene.things.stars ? 1 : 0.6) * gloom);
      c = mix(c, [0.4, 0.45, 0.6], 0.5 * Math.exp(-d * d * 60));
    }
    put(x, y, c.map((v) => v * (0.75 + gloom * 0.25)));
  }
  if (scene.clouds > 0.05) { // clouds, thinner toward the horizon
    for (let y = 0; y < hy; y++) for (let x = 0; x < W; x++) {
      const depth = y / hy, sx = (x / W) * 6 / (0.25 + depth * 1.6), sy = depth * 7;
      const n = fbm(sx + 3.1, sy, 11, 5), e = clamp((n - (0.72 - scene.clouds * 0.42)) * 4);
      if (e <= 0) continue;
      const shade = fbm(sx + 0.2, sy - 0.15, 11, 3) - n; // lit where the noise rises toward the light
      const base = scene.storm ? 0.28 : scene.time === 'night' ? 0.12 : 0.92, col = L.light.map((v) => clamp(base * (0.8 + shade * 2.2)) * v * gloom);
      put(x, y, mix(col, scene.time === 'sunset' || scene.time === 'dawn' ? L.horizon : col, 0.35 * (1 - depth)), e * (0.55 + 0.45 * (1 - depth)));
    }
  }

  const sky = Float32Array.from(data); // the sky before the sun's disc: what water reflects (its glitter is drawn apart)
  const getSky = (x, y) => { const i = px(clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1)); return [sky[i], sky[i + 1], sky[i + 2]]; };
  if (!L.sunk && !scene.storm) { // the sun's disc (a storm hides it; its glow stays)
    for (let y = 0; y < hy; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x / W - sunX) * (W / H), y / H - sunY) * H;
      if (d < 0.07 * H) put(x, y, mix(L.sun, [1, 1, 0.97], 0.5).map((v) => v * 1.15), smooth(0.07 * H, 0.062 * H, d) * (0.6 + 0.4 * gloom));
    }
  } else if (scene.things.moon || scene.time === 'night') { // the moon, full
    for (let y = 0; y < hy; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x / W - sunX) * (W / H), y / H - sunY) * H;
      if (d < 0.05 * H) { const m = 0.78 + 0.2 * fbm(x / 9, y / 9, 7, 3); put(x, y, [m * 0.95, m * 0.95, m * 0.9], smooth(0.05 * H, 0.046 * H, d) * gloom); }
    }
  }

  // The land behind: ranges of mountains, then hills, each nearer one lower and darker, all fading into the air.
  const ranges = 'mountains' in T ? 3 : 0, hillRows = 'hills' in T ? 2 : 0;
  for (let r = 0; r < ranges + hillRows; r++) {
    const mountain = r < ranges, k = 20 + r, depth = 1 - (r + 1) / (ranges + hillRows + 1);
    const tall = mountain ? (0.22 - r * 0.05) * H : (0.09 - (r - ranges) * 0.03) * H, jag = mountain ? 2.2 : 3.5, off = rand() * 100;
    const ridge = (u) => { const n = fbm(u * jag * 1.8 + off, 0.5, k, 6), n2 = mountain ? Math.abs(fbm(u * jag * 4 + off, 2.1, k + 50, 4) - 0.5) * 1.6 : 0; return 0.35 + n * 1.0 - n2 * 0.6; };
    const base = scene.land === 'snow' || mountain ? [0.35, 0.35, 0.40] : { sand: [0.60, 0.48, 0.30], pavement: [0.30, 0.32, 0.30] }[scene.land] ?? [0.25, 0.42, 0.20];
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const rise = ridge(u), top = hy - tall * rise - (r > 0 ? 0 : tall * 0.1);
      const slope = (ridge(u + 0.003) - rise) / 0.003 * tall / H; // the side facing the light is brighter
      const face = clamp(0.5 + slope * (sunLeft ? -0.3 : 0.3), 0.1, 0.95), snowline = 0.62 + (fbm(u * 30, 0.5, k + 7, 3) - 0.5) * 0.25;
      for (let y = Math.max(0, top | 0); y < hy; y++) {
        const peakness = clamp((hy - y) / Math.max(1, hy - top));
        const rock = 0.85 + 0.3 * fbm(x / 23, y / 23, k + 3, 3); // the rock's own grain, so a face is not one flat column
        const facet = clamp(face + (fbm(u * 40 + off, peakness * 4, k + 9, 3) - 0.5) * 0.6); // ledges and gullies down the face
        let c = lit(base.map((v) => v * rock), 0.35 + 0.65 * facet);
        if (mountain && (scene.land === 'snow' || peakness > snowline)) c = lit([0.9, 0.92, 0.95], 0.4 + 0.6 * facet);
        if (mountain && scene.time !== 'night') c = mix(c, lit([0.2, 0.3, 0.15], 0.4 + 0.6 * facet), clamp(1 - peakness * 2.2) * (scene.land === 'snow' ? 0 : 0.6));
        put(x, y, air(c, depth));
      }
    }
  }

  // The ground: the plane from the horizon to the foot of the picture, one of grass, sand, snow, pavement or water.
  const ground = scene.ground, wet = scene.rain > 0.3;
  const COLOUR = { grass: [0.26, 0.48, 0.17], sand: [0.82, 0.70, 0.45], snow: [0.90, 0.92, 0.95], pavement: [0.40, 0.40, 0.42], water: [0.10, 0.25, 0.35] };
  const groundColour = COLOUR[ground], landColour = COLOUR[scene.land];
  const shoreY = scene.beach ? hy + (H - hy) * (0.45 + rand() * 0.2) : H; // where the water ends and the land begins
  for (let y = hy | 0; y < H; y++) {
    const near = (y - hy) / (H - hy), depth = 1 - near, scale = 1 / (0.02 + near * near * 1.2);
    for (let x = 0; x < W; x++) {
      const u = (x / W - 0.5) * scale, v = scale;
      let c;
      if (ground === 'water' && y < shoreY) { // the sky reflected, broken by ripples, darker nearer
        const ripple = (fbm(u * 3 + 1, v * 0.4, 31, 4) - 0.5) * 0.4;
        const above = getSky(x, Math.max(0, hy - (y - hy) * 0.9 + ripple * 60 * near));
        c = mix(above, groundColour, 0.5 + near * 0.3 + ripple);
        const glitter = Math.exp(-(((x / W - sunX) * (6 + near * 10)) ** 2)) * (1 - near) * (0.5 + h2(x, y, 33) * (ripple + 0.2) * 3);
        c = lit(c, 0.9).map((v, i) => v * 1.4 + glitter * (L.sunk ? 0.25 : 0.5) * L.sun[i]);
      } else {
        const g = ground === 'water' ? landColour : groundColour;
        const here = ground === 'water' ? scene.land : ground;
        const n = fbm(u * 2, v * 0.35, 41, 4), blades = here === 'grass' ? (h2(x, y, 3) - 0.5) * 0.25 * (0.3 + near) : 0;
        c = lit(g.map((ch) => ch * (0.82 + n * 0.36 + blades)), 0.9 - near * 0.1);
        if (here === 'snow') c = c.map((ch) => ch + (h2(x, y, 4) > 0.995 ? 0.1 : 0));
        if (scene.road) { // a road from the foot of the picture to the horizon, kerbed, with a dashed line
          const rw = 0.09 + near * 0.45, rc = 0.5 + (fbm(near * 1.5, 0.3, 51, 3) - 0.5) * 0.5 * (1 - near) * 0 + 0.0;
          const d = Math.abs(x / W - rc) / rw;
          if (d < 1) {
            let rcol = [0.22, 0.22, 0.23].map((ch) => ch * (0.85 + n * 0.3));
            if (wet) rcol = mix(rcol, getSky(x, hy - (y - hy) * 0.7), 0.4);
            if (d < 0.025 && Math.floor(near * near * 40) % 2 === 0) rcol = [0.9, 0.85, 0.5];
            c = mix(lit(rcol, 1), c, smooth(0.9, 1, d));
          }
        }
        if (wet && here !== 'snow' && !scene.road) c = mix(c, getSky(x, hy - (y - hy) * 0.7), 0.15);
      }
      put(x, y, air(c, depth * depth));
    }
  }

  // Things standing on the ground. Each has a foot on the ground plane at (fx, fy); its size follows its distance.
  const foot = (fy) => (fy - hy) / (H - hy); // 0 at the horizon, 1 at the foot of the picture
  const sizeAt = (fy) => 0.05 + foot(fy) * 0.95;
  const col = (thing, fallback) => (scene.colours[thing] ? COLOURS[scene.colours[thing]] : fallback);
  const placed = []; // [fy, draw] drawn far to near
  const place = (n, draw, minNear = 0.15, maxNear = 0.95, onWater = false) => {
    for (let i = 0; i < n; i++) {
      const near = minNear + rand() * (maxNear - minNear), fy = hy + (H - hy) * near;
      if (scene.ground === 'water' && onWater && fy >= shoreY) { i--; continue; } // a boat stays on the water
      if (scene.ground === 'water' && !onWater && fy < shoreY) { // on land: the far bank, or the near shore
        if (scene.beach && rand() < 0.7) { const ny = shoreY + (H - shoreY) * rand() * 0.9; placed.push([ny, (s) => draw(s, 0.05 + rand() * 0.9, ny)]); } else placed.push([hy - 1, (s) => draw(s, 0.05 + rand() * 0.9, hy - 1)]);
        continue;
      }
      placed.push([fy, (s) => draw(s, 0.05 + rand() * 0.9, fy)]);
    }
  };

  const tree = (s, ux, fy) => { // a pine: a trunk and three skirts of needles, or a round broadleaf
    const k = sizeAt(fy), x0 = ux * W, hgt = (0.12 + rand() * 0.1) * H * k * 2.2, pine = scene.land === 'snow' || scene.things.mountains || rand() < 0.5;
    const trunk = lit([0.30, 0.20, 0.12], 0.6), leaf = col('trees', pine ? [0.08, 0.30, 0.14] : [0.20, 0.48, 0.16]);
    for (let y = fy - hgt * 0.3; y < fy; y++) for (let x = x0 - hgt * 0.025; x <= x0 + hgt * 0.025; x++) put(x, y, trunk);
    if (pine) for (let t = 0; t < 3; t++) {
      const top = fy - hgt * (1 - t * 0.22), bot = fy - hgt * (0.55 - t * 0.22), half = hgt * (0.16 + t * 0.07);
      for (let y = top; y < bot; y++) { const w = half * (y - top) / (bot - top); for (let x = x0 - w; x <= x0 + w; x++) { const side = (x - x0) / Math.max(1, w); put(x, y, lit(leaf, 0.5 + 0.5 * (sunLeft ? -side : side) + (h2(x, y, 8) - 0.5) * 0.4), 1); if (scene.land === 'snow' && h2(x | 0, y | 0, 9) > 0.6 && y - top < (bot - top) * 0.3) put(x, y, lit([0.9, 0.9, 0.95], 0.8), 0.7); } }
    } else {
      const cx = x0, cy = fy - hgt * 0.68, r = hgt * 0.32;
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r * 1.15; x <= cx + r * 1.15; x++) { const d = Math.hypot((x - cx) / 1.15, y - cy) / r; if (d < 0.9 + fbm(x / 7, y / 7, 12, 3) * 0.25) { const side = (x - cx) / r, up = (cy - y) / r; put(x, y, lit(leaf, 0.35 + 0.35 * (sunLeft ? -side : side) + 0.3 * up + (h2(x, y, 8) - 0.5) * 0.5)); } }
    }
  };
  const house = (s, ux, fy) => { // a box with a gabled roof, a door, windows lit at night, a chimney
    const k = sizeAt(fy), w = (0.10 + rand() * 0.05) * W * k * 1.6, x0 = clamp(ux * W, w * 0.6, W - w * 0.6), hgt = w * 0.55, wall = col('houses', rand() < 0.5 ? [0.80, 0.72, 0.58] : [0.55, 0.30, 0.22]);
    const roof = [0.30, 0.18, 0.14], glow = scene.time === 'night' || scene.time === 'sunset' ? [1, 0.8, 0.45] : [0.35, 0.45, 0.55];
    for (let y = fy - hgt; y < fy; y++) for (let x = x0 - w / 2; x < x0 + w / 2; x++) put(x, y, lit(wall, (x < x0 ? (sunLeft ? 0.9 : 0.5) : (sunLeft ? 0.5 : 0.9))));
    for (let y = fy - hgt * 1.55; y < fy - hgt; y++) { const t = (y - (fy - hgt * 1.55)) / (hgt * 0.55), half = (w / 2 + w * 0.06) * t; for (let x = x0 - half; x <= x0 + half; x++) put(x, y, scene.land === 'snow' ? lit([0.92, 0.93, 0.96], 0.9) : lit(roof, 0.6 + 0.3 * (sunLeft ? -(x - x0) / w : (x - x0) / w))); }
    for (let y = fy - hgt * 1.5; y < fy - hgt * 1.15; y++) for (let x = x0 + w * 0.22; x < x0 + w * 0.3; x++) put(x, y, lit([0.35, 0.3, 0.3], 0.7));
    const dw = w * 0.12, dh = hgt * 0.5;
    for (let y = fy - dh; y < fy; y++) for (let x = x0 - dw / 2; x < x0 + dw / 2; x++) put(x, y, lit([0.25, 0.15, 0.1], 0.6));
    for (const wx of [x0 - w * 0.3, x0 + w * 0.3]) for (let y = fy - hgt * 0.75; y < fy - hgt * 0.45; y++) for (let x = wx - w * 0.07; x < wx + w * 0.07; x++) put(x, y, scene.time === 'night' ? glow : lit(glow, 0.9));
  };
  const building = (s, ux, fy) => { // a tower of floors with windows, some lit
    const k = sizeAt(fy), w = (0.05 + rand() * 0.06) * W * k * 1.2, x0 = clamp(ux * W, w * 0.5, W - w * 0.5), hgt = (0.18 + rand() * 0.3) * H * k * 1.1, tone = 0.3 + rand() * 0.4;
    const wall = col('buildings', [tone, tone, tone * 1.05]), winW = Math.max(2, w * 0.06), winH = Math.max(3, winW * 1.5), stepX = winW * 2.2, stepY = winH * 2;
    for (let y = fy - hgt; y < fy; y++) for (let x = x0 - w / 2; x < x0 + w / 2; x++) {
      let c = lit(wall, x < x0 ? (sunLeft ? 0.85 : 0.5) : (sunLeft ? 0.5 : 0.85));
      const gx = (x - (x0 - w / 2)) % stepX, gy = (fy - y) % stepY;
      if (gx > stepX * 0.3 && gx < stepX * 0.3 + winW && gy > stepY * 0.25 && gy < stepY * 0.25 + winH) {
        const on = h2(Math.floor((x - x0) / stepX), Math.floor((fy - y) / stepY), 13) < (scene.time === 'night' ? 0.55 : scene.time === 'sunset' ? 0.35 : 0.08);
        c = on ? [1, 0.85, 0.5] : lit([0.2, 0.28, 0.38], 0.8);
      }
      put(x, y, air(c, (1 - foot(fy)) * 0.5));
    }
  };
  const car = (s, ux, fy) => { // a body, a cabin, two wheels, lamps lit at night
    const k = sizeAt(fy), len = (0.16 + rand() * 0.04) * W * k * 1.4, x0 = clamp((scene.road ? 0.5 + (rand() - 0.5) * 0.3 * foot(fy) : ux) * W, len * 0.55, W - len * 0.55), hgt = len * 0.26, body = col('cars', [0.75, 0.12, 0.10]), r = hgt * 0.45;
    const ry = fy - r * 0.8;
    for (let y = ry - hgt * 0.9; y < ry; y++) for (let x = x0 - len / 2; x < x0 + len / 2; x++) { const side = (x - x0) / len, up = (ry - y) / hgt; put(x, y, lit(body, 0.45 + 0.5 * up + 0.2 * (sunLeft ? -side : side))); }
    for (let y = ry - hgt * 1.65; y < ry - hgt * 0.9; y++) { const t = (ry - hgt * 0.9 - y) / (hgt * 0.75), half = len * (0.33 - t * 0.1); for (let x = x0 - half + len * 0.05; x < x0 + half; x++) { const win = y < ry - hgt * 1.0 && y > ry - hgt * 1.6 && Math.abs(x - x0 - len * 0.02) < half - len * 0.03; put(x, y, win ? mix(lit([0.3, 0.4, 0.5], 0.9), L.horizon, 0.35) : lit(body, 0.8)); } }
    for (const wx of [x0 - len * 0.31, x0 + len * 0.31]) for (let y = fy - 2 * r; y <= fy; y++) for (let x = wx - r; x <= wx + r; x++) { const d = Math.hypot(x - wx, y - (fy - r)) / r; if (d <= 1) put(x, y, d < 0.55 ? lit([0.6, 0.6, 0.62], 0.9) : lit([0.06, 0.06, 0.06], 0.6)); }
    if (scene.time === 'night' || scene.time === 'sunset') for (const lx of [x0 - len * 0.47, x0 + len * 0.47]) for (let y = ry - hgt * 0.6; y < ry - hgt * 0.4; y++) for (let x = lx - len * 0.02; x < lx + len * 0.02; x++) put(x, y, [1, 0.95, 0.75]);
    for (let y = fy; y < fy + r * 0.4; y++) for (let x = x0 - len * 0.5; x < x0 + len * 0.5; x++) put(x, y, [0, 0, 0], 0.25 * (1 - (y - fy) / (r * 0.4)));
  };
  const boat = (s, ux, fy) => { // a hull and a sail, on the water, with a smear of reflection under it
    const k = sizeAt(fy), len = (0.1 + rand() * 0.05) * W * k * 1.5, x0 = clamp(ux * W, len * 0.55, W - len * 0.55), hull = col('boats', [0.85, 0.85, 0.88]), hh = len * 0.14;
    for (let y = fy - hh; y < fy; y++) { const t = (y - (fy - hh)) / hh; for (let x = x0 - len / 2 + t * len * 0.12; x < x0 + len / 2 - t * len * 0.12; x++) put(x, y, lit(hull, 0.6 + 0.3 * (1 - t))); }
    for (let y = fy - hh - len * 0.6; y < fy - hh; y++) { const t = (y - (fy - hh - len * 0.6)) / (len * 0.6); for (let x = x0 - len * 0.02; x < x0 + len * 0.02 + t * len * 0.3; x++) put(x, y, x < x0 + len * 0.01 ? lit([0.3, 0.2, 0.15], 0.6) : lit([0.95, 0.95, 0.93], 0.5 + 0.5 * (sunLeft ? 0.9 : 0.6))); }
    for (let y = fy; y < fy + hh * 2; y++) for (let x = x0 - len / 2; x < x0 + len / 2; x++) if (h2(x, y, 17) > 0.45) put(x, y, lit(hull, 0.5), 0.25 * (1 - (y - fy) / (hh * 2)));
  };
  const bird = (ux, uy) => { // a gull's two strokes, far in the sky
    const x0 = ux * W, y0 = uy * H, span = 6 + rand() * 10, c = scene.time === 'night' ? [0.1, 0.1, 0.12] : [0.12, 0.12, 0.14];
    for (let x = -span; x <= span; x++) put(x0 + x, y0 - Math.abs(Math.sin((x / span) * Math.PI)) * span * 0.25 + (x < 0 ? 0 : 0), c, 0.9);
  };

  place(usual('trees', 9), tree, 0.1, 0.9);
  place(usual('buildings', 11), building, 0.05, 0.4);
  place(usual('houses', 3), house, 0.2, 0.7);
  place(usual('boats', 2), boat, 0.15, 0.6, true);
  place(usual('cars', 2), car, 0.45, 0.85);
  placed.sort((a, b) => a[0] - b[0]);
  for (const [, draw] of placed) draw(scene);
  for (let i = 0; i < usual('birds', 7); i++) bird(rand(), rand() * horizon * 0.7);

  // Weather over everything: fog thickening toward the horizon, rain streaked by the wind, snow falling, grain.
  if (scene.fog > 0) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const near = y > hy ? (y - hy) / (H - hy) : 0, band = Math.exp(-(((y - hy) / (H * 0.25)) ** 2)); put(x, y, mix(L.horizon, [0.8, 0.8, 0.82], 0.5).map((v) => v * gloom), clamp(scene.fog * (0.25 + band * 0.6 - near * 0.3) + fbm(x / 150, y / 80, 61, 3) * scene.fog * 0.25)); }
  if (scene.rain > 0) { const n = (W * H) / 1800 * scene.rain, slant = (rand() - 0.5) * 0.6; for (let i = 0; i < n; i++) { const x = rand() * W, y = rand() * H, len = 10 + rand() * 20, c = mix(get(x, y), [0.85, 0.88, 0.95], 0.35); for (let t = 0; t < len; t++) put(x + t * slant, y + t, c, 0.5); } }
  if (scene.snow > 0) { const n = (W * H) / 900 * scene.snow; for (let i = 0; i < n; i++) { const x = rand() * W, y = rand() * H, r = rand() < 0.2 ? 2 : 1; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) put(x + dx, y + dy, [0.95, 0.96, 1], 0.6 * (1 - Math.hypot(dx, dy) / (r + 1))); } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = px(x, y), g = (h2(x, y, 71) - 0.5) * 0.03, v = 1 - 0.35 * ((x / W - 0.5) ** 2 + (y / H - 0.5) ** 2) * 2; for (let k = 0; k < 3; k++) data[i + k] = clamp((data[i + k] + g) * v); }
  return { width: W, height: H, data };
}

// ── PNG ───────────────────────────────────────────────────────────────────────────────────────────────────────────

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, body) { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const tb = Buffer.concat([Buffer.from(type, 'ascii'), body]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(tb)); return Buffer.concat([len, tb, crc]); }

/** Encodes { width, height, data (rgb floats 0..1) } as a PNG (8-bit RGB, no filter, deflated). */
export function png({ width, height, data }) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) { const row = y * (width * 3 + 1); raw[row] = 0; for (let i = 0; i < width * 3; i++) raw[row + 1 + i] = Math.round(clamp(data[y * width * 3 + i]) * 255); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Words to a PNG file. Returns the path written. */
export function generate(prompt, { out, width, height, seed } = {}) {
  const scene = read(prompt), image = paint(scene, { width, height, seed });
  const file = path.resolve(out ?? path.join('images', `${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}-${prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image'}.png`));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png(image));
  return file;
}

// ── The shell ─────────────────────────────────────────────────────────────────────────────────────────────────────

function usage() { const head = []; for (const l of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)) { if (!l.startsWith('//')) break; head.push(l.slice(3)); } return head.join('\n'); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = { words: [] }, argv = process.argv.slice(2);
  try {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
      if (a === '--out' || a === '-o') o.out = next();
      else if (a === '--size' || a === '-s') { const m = /^(\d+)x(\d+)$/.exec(next()); if (!m) throw new Error('--size wants WxH, e.g. 1280x720'); o.width = +m[1]; o.height = +m[2]; }
      else if (a === '--seed') o.seed = Number(next()) >>> 0;
      else if (a === '--describe') o.describe = true;
      else if (a === '--help' || a === '-h') { console.log(usage()); process.exit(0); }
      else if (a.startsWith('-') && a.length > 1) throw new Error(`unknown option ${a}`);
      else o.words.push(a);
    }
    const prompt = o.words.join(' ').trim();
    if (!prompt) { console.log(usage()); process.exit(2); }
    if (o.describe) { console.log(JSON.stringify(read(prompt), null, 2)); process.exit(0); }
    const t = Date.now(), file = generate(prompt, o);
    process.stderr.write(`${file} (${((Date.now() - t) / 1000).toFixed(1)} s)\n`); console.log(file);
  } catch (e) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); }
}
