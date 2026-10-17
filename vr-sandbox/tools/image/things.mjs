// What stands in the picture. Each drawer paints one thing with its foot on the ground plane at (ux·W, fy), sized by
// how far back that is, and returns its box in pixels for the layout. The drawers are listed in the order they are
// placed (the random draws depend on it), the birds last, in the sky.
import { clamp, fbm, h2, mix } from './math.mjs';
import { THINGS } from './read.mjs';

/** Where things stand: the far ones first, so the near ones are drawn over them. */
export function place(ctx, entry, n, placed) {
  const { H, hy, scene, rand } = ctx;
  const [minNear, maxNear] = entry.band, water = scene.ground === 'water';
  for (let i = 0; i < n; i++) {
    const near = minNear + rand() * (maxNear - minNear), fy = hy + (H - hy) * near;
    if (water && entry.onWater && fy >= ctx.shoreY) { // a boat stays on the water
      i--;
      continue;
    }
    if (water && !entry.onWater && fy < ctx.shoreY) { // on land: the near shore, or the far bank
      if (scene.beach && rand() < 0.7) placed.push({ entry, fy: ctx.shoreY + (H - ctx.shoreY) * rand() * 0.9 });
      else placed.push({ entry, fy: hy - 1 });
      continue;
    }
    placed.push({ entry, fy });
  }
}

/** Places and draws every registered thing the scene names, far to near, then the flyers; fills layout.things. */
export function thingsPass(ctx) {
  const { rand, horizon, layout, usual } = ctx;
  const placed = [];
  for (const entry of ctx.things) {
    if (!entry.sky) place(ctx, entry, usual(entry.word, entry.usual), placed);
  }
  placed.sort((a, b) => a.fy - b.fy);
  for (const { entry, fy } of placed) {
    const box = entry.draw(ctx, { ux: 0.05 + rand() * 0.9, fy });
    layout.things.push({ kind: entry.id, ...box });
  }
  for (const entry of ctx.things) {
    if (!entry.sky) continue;
    for (let i = 0; i < usual(entry.word, entry.usual); i++) {
      const ux = rand(), uy = rand() * horizon * 0.7;
      layout.things.push({ kind: entry.id, ...entry.draw(ctx, { ux, uy }) });
    }
  }
}

// ── The six ────────────────────────

const TRUNK = [0.30, 0.20, 0.12], PINE = [0.08, 0.30, 0.14], BROADLEAF = [0.20, 0.48, 0.16], SNOWCAP = [0.9, 0.9, 0.95];

function tree(ctx, { ux, fy }) { // a pine: a trunk and three skirts of needles, or a round broadleaf
  const { W, H, scene, rand, put, lit, col } = ctx;
  const size = ctx.sizeAt(fy), x0 = ux * W, hgt = (0.12 + rand() * 0.1) * H * size * 2.2;
  const pine = scene.land === 'snow' || scene.things.mountains || rand() < 0.5;
  const trunk = lit(TRUNK, 0.6), leaf = col('trees', pine ? PINE : BROADLEAF);
  for (let y = fy - hgt * 0.3; y < fy; y++) {
    for (let x = x0 - hgt * 0.025; x <= x0 + hgt * 0.025; x++) put(x, y, trunk);
  }
  if (pine) pineSkirts(ctx, x0, fy, hgt, leaf);
  else broadleafCrown(ctx, x0, fy, hgt, leaf);
  const w = pine ? hgt * 0.6 : hgt * 0.736;
  return { x: x0 - w / 2, y: fy - hgt, w, h: hgt };
}

function pineSkirts(ctx, x0, fy, hgt, leaf) {
  const { scene, put, lit, sun } = ctx;
  const snowy = scene.land === 'snow', cap = lit(SNOWCAP, 0.8), c = [0, 0, 0];
  for (let t = 0; t < 3; t++) {
    const top = fy - hgt * (1 - t * 0.22), bot = fy - hgt * (0.55 - t * 0.22), half = hgt * (0.16 + t * 0.07);
    for (let y = top; y < bot; y++) {
      const w = half * (y - top) / (bot - top);
      for (let x = x0 - w; x <= x0 + w; x++) {
        const side = (x - x0) / Math.max(1, w);
        put(x, y, lit(leaf, 0.5 + 0.5 * (sun.left ? -side : side) + (h2(x, y, 8) - 0.5) * 0.4, c), 1);
        if (snowy && h2(x | 0, y | 0, 9) > 0.6 && y - top < (bot - top) * 0.3) put(x, y, cap, 0.7);
      }
    }
  }
}

function broadleafCrown(ctx, cx, fy, hgt, leaf) {
  const { put, lit, sun } = ctx;
  const cy = fy - hgt * 0.68, r = hgt * 0.32, c = [0, 0, 0];
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r * 1.15; x <= cx + r * 1.15; x++) {
      const d = Math.hypot((x - cx) / 1.15, y - cy) / r;
      if (d >= 0.9 + fbm(x / 7, y / 7, 12, 3) * 0.25) continue; // a ragged edge, not a disc
      const side = (x - cx) / r, up = (cy - y) / r;
      put(x, y, lit(leaf, 0.35 + 0.35 * (sun.left ? -side : side) + 0.3 * up + (h2(x, y, 8) - 0.5) * 0.5, c));
    }
  }
}

const CREAM = [0.80, 0.72, 0.58], BRICK = [0.55, 0.30, 0.22], ROOF = [0.30, 0.18, 0.14], SNOWROOF = [0.92, 0.93, 0.96];
const CHIMNEY = [0.35, 0.3, 0.3], DOOR = [0.25, 0.15, 0.1], LAMPLIGHT = [1, 0.8, 0.45], DAYGLASS = [0.35, 0.45, 0.55];

function house(ctx, { ux, fy }) { // a box with a gabled roof, a door, windows lit at night, a chimney
  const { W, scene, rand, put, lit, col, sun } = ctx;
  const size = ctx.sizeAt(fy), w = (0.10 + rand() * 0.05) * W * size * 1.6;
  const x0 = clamp(ux * W, w * 0.6, W - w * 0.6), hgt = w * 0.55;
  const wall = col('houses', rand() < 0.5 ? CREAM : BRICK); // the throw is made whether or not a colour was named
  const evening = scene.time === 'night' || scene.time === 'sunset', glow = evening ? LAMPLIGHT : DAYGLASS;
  const bright = lit(wall, 0.9), dark = lit(wall, 0.5), snowy = scene.land === 'snow', c = [0, 0, 0];
  for (let y = fy - hgt; y < fy; y++) {
    for (let x = x0 - w / 2; x < x0 + w / 2; x++) put(x, y, (x < x0) === sun.left ? bright : dark);
  }
  const snowRoof = lit(SNOWROOF, 0.9);
  for (let y = fy - hgt * 1.55; y < fy - hgt; y++) {
    const t = (y - (fy - hgt * 1.55)) / (hgt * 0.55), half = (w / 2 + w * 0.06) * t;
    for (let x = x0 - half; x <= x0 + half; x++) {
      put(x, y, snowy ? snowRoof : lit(ROOF, 0.6 + 0.3 * (sun.left ? -(x - x0) / w : (x - x0) / w), c));
    }
  }
  const chimney = lit(CHIMNEY, 0.7);
  for (let y = fy - hgt * 1.5; y < fy - hgt * 1.15; y++) {
    for (let x = x0 + w * 0.22; x < x0 + w * 0.3; x++) put(x, y, chimney);
  }
  const dw = w * 0.12, dh = hgt * 0.5, door = lit(DOOR, 0.6);
  for (let y = fy - dh; y < fy; y++) {
    for (let x = x0 - dw / 2; x < x0 + dw / 2; x++) put(x, y, door);
  }
  const pane = scene.time === 'night' ? glow : lit(glow, 0.9);
  for (const wx of [x0 - w * 0.3, x0 + w * 0.3]) {
    for (let y = fy - hgt * 0.75; y < fy - hgt * 0.45; y++) {
      for (let x = wx - w * 0.07; x < wx + w * 0.07; x++) put(x, y, pane);
    }
  }
  return { x: x0 - w * 0.56, y: fy - hgt * 1.55, w: w * 1.12, h: hgt * 1.55 };
}

const LITWINDOW = [1, 0.85, 0.5], DARKWINDOW = [0.2, 0.28, 0.38];

function building(ctx, { ux, fy }) { // a tower of floors with windows, some lit
  const { W, H, scene, rand, put, lit, air, col, sun, scale } = ctx;
  const size = ctx.sizeAt(fy), w = (0.05 + rand() * 0.06) * W * size * 1.2;
  const x0 = clamp(ux * W, w * 0.5, W - w * 0.5), hgt = (0.18 + rand() * 0.3) * H * size * 1.1;
  const tone = 0.3 + rand() * 0.4, wall = col('buildings', [tone, tone, tone * 1.05]);
  const winW = Math.max(2 * scale, w * 0.06), winH = Math.max(3 * scale, winW * 1.5); // never under 2x3 px at 720 rows
  const stepX = winW * 2.2, stepY = winH * 2;
  const litShare = scene.time === 'night' ? 0.55 : scene.time === 'sunset' ? 0.35 : 0.08;
  const bright = lit(wall, 0.85), dark = lit(wall, 0.5), unlit = lit(DARKWINDOW, 0.8), c = [0, 0, 0];
  const depth = (1 - ctx.foot(fy)) * 0.5;
  for (let y = fy - hgt; y < fy; y++) {
    for (let x = x0 - w / 2; x < x0 + w / 2; x++) {
      let face = (x < x0) === sun.left ? bright : dark;
      const gx = (x - (x0 - w / 2)) % stepX, gy = (fy - y) % stepY;
      if (gx > stepX * 0.3 && gx < stepX * 0.3 + winW && gy > stepY * 0.25 && gy < stepY * 0.25 + winH) {
        const on = h2(Math.floor((x - x0) / stepX), Math.floor((fy - y) / stepY), 13) < litShare;
        face = on ? LITWINDOW : unlit;
      }
      put(x, y, air(face, depth, c));
    }
  }
  return { x: x0 - w / 2, y: fy - hgt, w, h: hgt };
}

const PAINTWORK = [0.75, 0.12, 0.10], GLASS = [0.3, 0.4, 0.5], HUB = [0.6, 0.6, 0.62], TYRE = [0.06, 0.06, 0.06];
const HEADLAMP = [1, 0.95, 0.75], SHADOW = [0, 0, 0];

function car(ctx, { ux, fy }) { // a body, a cabin, two wheels, lamps lit at night
  const { W, L, scene, rand, put, lit, col, sun } = ctx;
  const size = ctx.sizeAt(fy), len = (0.16 + rand() * 0.04) * W * size * 1.4;
  const onRoad = scene.road ? 0.5 + (rand() - 0.5) * 0.3 * ctx.foot(fy) : ux; // on the road, near its middle
  const x0 = clamp(onRoad * W, len * 0.55, W - len * 0.55), hgt = len * 0.26;
  const body = col('cars', PAINTWORK), r = hgt * 0.45, ry = fy - r * 0.8, c = [0, 0, 0];
  for (let y = ry - hgt * 0.9; y < ry; y++) {
    for (let x = x0 - len / 2; x < x0 + len / 2; x++) {
      const side = (x - x0) / len, up = (ry - y) / hgt;
      put(x, y, lit(body, 0.45 + 0.5 * up + 0.2 * (sun.left ? -side : side), c));
    }
  }
  const glass = mix(lit(GLASS, 0.9), L.horizon, 0.35), roof = lit(body, 0.8);
  for (let y = ry - hgt * 1.65; y < ry - hgt * 0.9; y++) {
    const t = (ry - hgt * 0.9 - y) / (hgt * 0.75), half = len * (0.33 - t * 0.1);
    for (let x = x0 - half + len * 0.05; x < x0 + half; x++) {
      const win = y < ry - hgt * 1.0 && y > ry - hgt * 1.6 && Math.abs(x - x0 - len * 0.02) < half - len * 0.03;
      put(x, y, win ? glass : roof);
    }
  }
  const hub = lit(HUB, 0.9), tyre = lit(TYRE, 0.6);
  for (const wx of [x0 - len * 0.31, x0 + len * 0.31]) {
    for (let y = fy - 2 * r; y <= fy; y++) {
      for (let x = wx - r; x <= wx + r; x++) {
        const d = Math.hypot(x - wx, y - (fy - r)) / r;
        if (d <= 1) put(x, y, d < 0.55 ? hub : tyre);
      }
    }
  }
  if (scene.time === 'night' || scene.time === 'sunset') {
    for (const lx of [x0 - len * 0.47, x0 + len * 0.47]) {
      for (let y = ry - hgt * 0.6; y < ry - hgt * 0.4; y++) {
        for (let x = lx - len * 0.02; x < lx + len * 0.02; x++) put(x, y, HEADLAMP);
      }
    }
  }
  for (let y = fy; y < fy + r * 0.4; y++) {
    for (let x = x0 - len * 0.5; x < x0 + len * 0.5; x++) put(x, y, SHADOW, 0.25 * (1 - (y - fy) / (r * 0.4)));
  }
  return { x: x0 - len / 2, y: ry - hgt * 1.65, w: len, h: fy - (ry - hgt * 1.65) };
}

const HULL = [0.85, 0.85, 0.88], MAST = [0.3, 0.2, 0.15], SAIL = [0.95, 0.95, 0.93];

function boat(ctx, { ux, fy }) { // a hull and a sail, on the water, with a smear of reflection under it
  const { W, rand, put, lit, col, sun } = ctx;
  const size = ctx.sizeAt(fy), len = (0.1 + rand() * 0.05) * W * size * 1.5;
  const x0 = clamp(ux * W, len * 0.55, W - len * 0.55), hull = col('boats', HULL), hh = len * 0.14, c = [0, 0, 0];
  for (let y = fy - hh; y < fy; y++) {
    const t = (y - (fy - hh)) / hh, shade = lit(hull, 0.6 + 0.3 * (1 - t), c);
    for (let x = x0 - len / 2 + t * len * 0.12; x < x0 + len / 2 - t * len * 0.12; x++) put(x, y, shade);
  }
  const mast = lit(MAST, 0.6), sail = lit(SAIL, 0.5 + 0.5 * (sun.left ? 0.9 : 0.6));
  for (let y = fy - hh - len * 0.6; y < fy - hh; y++) {
    const t = (y - (fy - hh - len * 0.6)) / (len * 0.6);
    for (let x = x0 - len * 0.02; x < x0 + len * 0.02 + t * len * 0.3; x++) {
      put(x, y, x < x0 + len * 0.01 ? mast : sail);
    }
  }
  const wake = lit(hull, 0.5);
  for (let y = fy; y < fy + hh * 2; y++) {
    for (let x = x0 - len / 2; x < x0 + len / 2; x++) {
      if (h2(x, y, 17) > 0.45) put(x, y, wake, 0.25 * (1 - (y - fy) / (hh * 2)));
    }
  }
  return { x: x0 - len / 2, y: fy - hh - len * 0.6, w: len, h: hh + len * 0.6 };
}

const NIGHTBIRD = [0.1, 0.1, 0.12], DAYBIRD = [0.12, 0.12, 0.14];

function bird(ctx, { ux, uy }) { // a gull's two strokes, far in the sky
  const { W, H, scene, rand, put, scale } = ctx;
  const x0 = ux * W, y0 = uy * H, span = (6 + rand() * 10) * scale, c = scene.time === 'night' ? NIGHTBIRD : DAYBIRD;
  for (let x = -span; x <= span; x++) put(x0 + x, y0 - Math.abs(Math.sin((x / span) * Math.PI)) * span * 0.25, c, 0.9);
  return { x: x0 - span, y: y0 - span * 0.25, w: span * 2, h: span * 0.25 };
}

/** The registry entries, in placing order: band is how near a thing may stand, 0 at the horizon, 1 at the foot. */
export const drawers = [
  { id: 'tree', word: 'trees', match: THINGS.trees, usual: 9, band: [0.1, 0.9], draw: tree },
  { id: 'building', word: 'buildings', match: THINGS.buildings, usual: 11, band: [0.05, 0.4], draw: building },
  { id: 'house', word: 'houses', match: THINGS.houses, usual: 3, band: [0.2, 0.7], draw: house },
  { id: 'boat', word: 'boats', match: THINGS.boats, usual: 2, band: [0.15, 0.6], onWater: true, draw: boat },
  { id: 'car', word: 'cars', match: THINGS.cars, usual: 2, band: [0.45, 0.85], draw: car },
  { id: 'bird', word: 'birds', match: THINGS.birds, usual: 7, band: null, sky: true, draw: bird },
];
