// What stands in the picture. Each drawer paints one thing with its foot on the ground plane at (ux·W, fy), zm metres
// away, every size taken from SIZES in metres through the camera (draw.mjs), its shadow thrown first, and returns its
// box in pixels for the layout. The drawers are listed in the order they are placed (the random draws depend on it),
// the birds last, in the sky.
import { clamp, fbm, h2, lerp, mix } from './math.mjs';
import { THINGS } from './read.mjs';
import { SIZES } from './draw.mjs';
import { keyOf } from './registry.mjs';

const BAND = [0.1, 0.5]; // where a registered thing with neither depth nor band stands: the middle ground

const FAR_BANK = [20, 400]; // how far across the water the far bank's things may stand, in metres
const FAR_BANK_SHARE = [0.25, 0.4]; // how tall a far-bank thing is drawn, as a share of the frame, so it reads
const NEAR_WIDTH = 0.5; // the widest a thing may be on the near shore, as a share of the frame

/** A depth from an entry's band in metres, `u` in 0..1 spread evenly over the screen rows between its two ends. */
const depthIn = ([zNear, zFar], u) => 1 / (1 / zFar + u * (1 / zNear - 1 / zFar));

/** The nearest a thing `size` metres wide and tall may stand and be seen whole: under NEAR_WIDTH, its top in frame. */
function nearest(ctx, size) {
  const { focal, eye } = ctx.camera;
  return Math.max(size.w * focal / (ctx.W * NEAR_WIDTH), focal * (size.h - eye) / Math.max(1, ctx.hy));
}

const WATER_LEAST = 0.3; // the water keeps at least this share of the ground band when the shore moves for a thing
const SHORE_STEP = 1.01; // a thing the shore moved for stands this much short of the waterline, not on it
/**
 * The shore's geometry the placement and the ground pass agree on (water-reflections): the shoreline wanders by
 * `wander` of the ground band about the shore row (groundPass's shoreline()), and a land thing stands `margin` of the
 * band past the deepest shore row under it (ashore(), below).
 */
export const SHORE = { wander: 0.18, margin: 0.04 };

/**
 * The shore row the named land things ask for: moved toward the horizon until the widest of them that can stand on
 * the near shore does (a house on a beach is on the beach), never leaving the water less than WATER_LEAST of the
 * ground band; the row given when nothing needs it. A tree would push the shore to the horizon: it keeps the far bank.
 * The row is set back by the shore's wander and the margin, so the thing stood past the deepest wander is still no
 * nearer than its own row (no wider than NEAR_WIDTH).
 */
export function shoreFor(ctx, shoreY) {
  const { H, hy, usual } = ctx, least = hy + (H - hy) * WATER_LEAST;
  const back = (H - hy) * (SHORE.wander / 2 + SHORE.margin);
  let row = shoreY;
  ctx.farBankNeeded = false; // a thing that keeps the far bank: groundPass paints land under it (water-reflections)
  for (const e of ctx.things) {
    if (e.sky || e.onWater || !e.size || usual(keyOf(e), e.usual) <= 0) continue;
    const own = ctx.project(0, nearest(ctx, e.size) * SHORE_STEP).y - back;
    if (own >= least) row = Math.min(row, own);
    else ctx.farBankNeeded = true;
  }
  return row;
}

/** Where things stand: the far ones first, so the near ones are drawn over them. */
export function place(ctx, entry, n, placed) {
  const { H, hy, scene, rand } = ctx, water = scene.ground === 'water', size = entry.size ?? { w: 1, h: 1 };
  for (let i = 0; i < n; i++) {
    let zm, fy;
    if (entry.depth) {
      zm = depthIn(entry.depth, rand());
      fy = ctx.project(0, zm).y;
    } else { // an entry placed by screen band, as before the camera: its depth read back from its row
      const [minNear, maxNear] = entry.band ?? BAND;
      fy = hy + (H - hy) * (minNear + rand() * (maxNear - minNear));
      zm = Math.min(ctx.groundZ(fy), FAR_BANK[1]);
    }
    if (water && entry.onWater && fy >= ctx.shoreY) { // a boat stays on the water: out past the shore
      zm = ctx.groundZ(ctx.shoreY) * (1.3 + rand());
      fy = ctx.project(0, zm).y;
    }
    if (water && !entry.onWater && fy < ctx.shoreY) { // on land: the near shore whenever it fits, else the far bank
      const zShore = ctx.groundZ(ctx.shoreY), zFit = nearest(ctx, size);
      if (scene.beach && zFit <= zShore) {
        zm = Math.max(zFit, zShore * (0.85 + rand() * 0.15));
        fy = ctx.project(0, zm).y;
      } else { // its foot on the water's far edge, drawn at a depth that keeps it a readable share of the frame tall
        const share = FAR_BANK_SHARE[0] + rand() * (FAR_BANK_SHARE[1] - FAR_BANK_SHARE[0]);
        zm = clamp(size.h * ctx.camera.focal / (H * share), FAR_BANK[0], FAR_BANK[1]);
        fy = hy - 1;
      }
    }
    placed.push({ entry, fy, zm });
  }
}

/**
 * The shore wanders (ctx.shoreLine, from groundPass), so a land thing stood against the mean shore row would wade
 * where the water reaches below it: its foot is moved down to SHORE.margin of the ground band past the deepest shore
 * row under the columns it spans (its depth read back from the row, so it grows a little nearer; a second look
 * covers the columns it grew into). Nothing on the far bank, on the water or in the sky moves, and no random draw is
 * made, so every other composition stays. water-reflections' agreement between the shore and the placement.
 */
function ashore(ctx, entry, inst) {
  const { W, H, hy, scene, shoreLine } = ctx, size = entry.size ?? { w: 1, h: 1 };
  if (scene.ground !== 'water' || entry.onWater || entry.sky || !shoreLine || inst.fy < hy) return;
  for (let look = 0; look < 2; look++) {
    const half = size.w * ctx.camera.focal / inst.zm / 2, x0 = clamp(inst.ux * W, half * 1.2, W - half * 1.2);
    let deepest = 0; // the drawers clamp their own x0 inside the frame and span about it: looked at a little wider
    for (let x = Math.max(0, Math.floor(x0 - half * 1.3)); x <= Math.min(W - 1, Math.ceil(x0 + half * 1.3)); x++) {
      if (shoreLine[x] > deepest) deepest = shoreLine[x];
    }
    const foot = deepest + (H - hy) * SHORE.margin;
    if (deepest >= H || inst.fy >= foot) return;
    inst.fy = foot;
    inst.zm = ctx.groundZ(foot);
  }
}

/** Places and draws every registered thing the scene names, far to near, then the flyers; fills layout.things. */
export function thingsPass(ctx) {
  const { rand, horizon, layout, usual } = ctx;
  const placed = [];
  for (const entry of ctx.things) {
    if (!entry.sky) place(ctx, entry, usual(keyOf(entry), entry.usual), placed);
  }
  placed.sort((a, b) => a.fy - b.fy || b.zm - a.zm); // painter's order: the farthest first
  for (const { entry, fy, zm } of placed) {
    const inst = { ux: 0.05 + rand() * 0.9, fy, zm }, id = layout.things.length;
    ashore(ctx, entry, inst); // hook for water-reflections: dry feet on the wandering shore
    const box = ctx.sprite(inst.zm, () => entry.draw(ctx, inst), id);
    layout.things.push({ kind: entry.id, ...box });
  }
  for (const entry of ctx.things) {
    if (!entry.sky) continue;
    for (let i = 0; i < usual(keyOf(entry), entry.usual); i++) {
      const ux = rand(), uy = rand() * horizon * 0.7, id = layout.things.length;
      const zm = depthIn(entry.depth ?? [25, 120], rand());
      const box = ctx.sprite(zm, () => entry.draw(ctx, { ux, uy, zm }), id);
      layout.things.push({ kind: entry.id, ...box });
    }
  }
}

/**
 * Where a thing stands: its foot's pixel, its depth, the pixels per metre there, its metres off the axis, and
 * shadow(), which throws its shadow unless it stands on the far bank (its foot at the horizon, the land under it
 * out of frame: a shadow drawn at its depth would lie loose on the water).
 */
function stance(ctx, inst) {
  const zm = inst.zm ?? Math.min(ctx.groundZ(inst.fy), FAR_BANK[1]), s = ctx.camera.focal / zm, x0 = inst.ux * ctx.W;
  const shadow = inst.fy >= ctx.hy ? ctx.shadow : () => {};
  return { x0, fy: inst.fy, zm, s, xm: (x0 - ctx.W / 2) / s, shadow };
}

// ── The six ────────────────────────

const TRUNK = [0.30, 0.20, 0.12], PINE = [0.08, 0.30, 0.14], BROADLEAF = [0.20, 0.48, 0.16], SNOWCAP = [0.9, 0.9, 0.95];

function tree(ctx, inst) { // a pine: a trunk and three skirts of needles, or a round broadleaf
  const { scene, rand, lit, col, rect } = ctx;
  const grow = rand(), pine = scene.land === 'snow' || scene.things.mountains || rand() < 0.5;
  const [low, high] = pine ? SIZES.pine : SIZES.broadleaf, hm = lerp(low, high, grow);
  const { x0, fy, zm, s, xm, shadow } = stance(ctx, inst), hgt = hm * s;
  const trunk = lit(TRUNK, 0.6);
  const leaf = col('trees', ctx.leaf ? ctx.leaf(pine, rand()) : pine ? PINE : BROADLEAF); // hook for ground-weather
  const crown = pine ? hm * 0.6 : hm * 0.736; // the crown's width in metres, as the skirts and the ball below draw it
  shadow(xm, zm, { w: crown * 0.6, d: crown * 0.6 }, hm * 0.9);
  rect(x0 - hgt * 0.025, fy - hgt * 0.3, hgt * 0.05, hgt * 0.3, trunk);
  if (pine) pineSkirts(ctx, x0, fy, hgt, leaf);
  else broadleafCrown(ctx, x0, fy, hgt, leaf);
  const w = crown * s;
  return { x: x0 - w / 2, y: fy - hgt, w, h: hgt };
}

function pineSkirts(ctx, x0, fy, hgt, leaf) {
  const { scene, lit, sun, poly } = ctx;
  const snowy = scene.land === 'snow', cap = lit(SNOWCAP, 0.8), c = [0, 0, 0];
  for (let t = 0; t < 3; t++) {
    const top = fy - hgt * (1 - t * 0.22), bot = fy - hgt * (0.55 - t * 0.22), half = hgt * (0.16 + t * 0.07);
    const shade = (x, y) => {
      const w = Math.max(1, half * (y - top) / (bot - top)), side = (x - x0) / w;
      lit(leaf, 0.5 + 0.5 * (sun.left ? -side : side) + (h2(x, y, 8) - 0.5) * 0.4, c);
      if (snowy && h2(x, y, 9) > 0.6 && y - top < (bot - top) * 0.3) mix(c, cap, 0.7, c);
      return c;
    };
    poly([x0, top, x0 + half, bot, x0 - half, bot], shade);
  }
}

const CROWN_SIDES = 20;

function broadleafCrown(ctx, cx, fy, hgt, leaf) { // a ragged ball: a polygon whose radius wanders round it
  const { lit, sun, poly } = ctx;
  const cy = fy - hgt * 0.68, r = hgt * 0.32, c = [0, 0, 0], pts = [];
  for (let k = 0; k < CROWN_SIDES; k++) {
    const th = (k / CROWN_SIDES) * Math.PI * 2, rk = r * (0.9 + (fbm(k * 0.7, cx * 0.013, 12, 3) - 0.5) * 0.5);
    pts.push(cx + Math.cos(th) * rk * 1.15, cy + Math.sin(th) * rk);
  }
  poly(pts, (x, y) => {
    const side = (x - cx) / r, up = (cy - y) / r;
    return lit(leaf, 0.35 + 0.35 * (sun.left ? -side : side) + 0.3 * up + (h2(x, y, 8) - 0.5) * 0.5, c);
  });
}

const CREAM = [0.80, 0.72, 0.58], BRICK = [0.55, 0.30, 0.22], ROOF = [0.30, 0.18, 0.14], SNOWROOF = [0.92, 0.93, 0.96];
const CHIMNEY = [0.35, 0.3, 0.3], DOOR = [0.25, 0.15, 0.1], LAMPLIGHT = [1, 0.8, 0.45], DAYGLASS = [0.35, 0.45, 0.55];

function house(ctx, inst) { // a cabin: a box with a gabled roof, a door, windows lit at night, a chimney
  const { W, scene, rand, lit, col, sun, rect, poly } = ctx, C = SIZES.cabin;
  const { fy, zm, s, shadow } = stance(ctx, inst), w = C.w * s, hgt = C.wall * s, rise = C.rise * s;
  const x0 = clamp(inst.ux * W, w * 0.6, W - w * 0.6), xm = (x0 - W / 2) / s;
  const wall = col('houses', rand() < 0.5 ? CREAM : BRICK); // the throw is made whether or not a colour was named
  const evening = scene.time === 'night' || scene.time === 'sunset', glow = evening ? LAMPLIGHT : DAYGLASS;
  const bright = lit(wall, 0.9), dark = lit(wall, 0.5), snowy = scene.land === 'snow', c = [0, 0, 0];
  shadow(xm, zm, { w: C.w, d: C.d }, C.wall + C.rise * 0.5);
  rect(x0 - w / 2, fy - hgt, w, hgt, (x) => ((x < x0) === sun.left ? bright : dark));
  const snowRoof = lit(SNOWROOF, 0.9), over = w * 0.06, eave = fy - hgt;
  const roofShade = (x) => lit(ROOF, 0.6 + 0.3 * (sun.left ? -(x - x0) / w : (x - x0) / w), c);
  poly([x0, eave - rise, x0 + w / 2 + over, eave, x0 - w / 2 - over, eave], snowy ? snowRoof : roofShade);
  rect(x0 + w * 0.22, eave - rise * 0.9, C.chimney * s, rise * 0.63, lit(CHIMNEY, 0.7));
  rect(x0 - C.door.w * s / 2, fy - C.door.h * s, C.door.w * s, C.door.h * s, lit(DOOR, 0.6));
  const pane = scene.time === 'night' ? glow : lit(glow, 0.9), win = C.window * s;
  for (const wx of [x0 - w * 0.3, x0 + w * 0.3]) rect(wx - win / 2, fy - (C.sill + C.window) * s, win, win, pane);
  return { x: x0 - w * 0.56, y: eave - rise, w: w * 1.12, h: hgt + rise };
}

const LITWINDOW = [1, 0.85, 0.5], DARKWINDOW = [0.2, 0.28, 0.38];

function building(ctx, inst) { // a tower of floors with windows, some lit
  const { W, scene, rand, lit, col, sun, scale, rect, camera } = ctx, B = SIZES.building;
  const { fy, zm, s, shadow } = stance(ctx, inst);
  const wm = lerp(B.w[0], B.w[1], rand());
  let storeys = Math.round(lerp(B.storeys[0], B.storeys[1], rand()));
  const roomAbove = Math.floor((camera.eye + 0.85 * ctx.hy / s) / SIZES.storey); // the storeys that leave some sky
  storeys = Math.max(2, Math.min(storeys, roomAbove));
  const w = wm * s, hgt = storeys * SIZES.storey * s;
  const x0 = clamp(inst.ux * W, w * 0.5, W - w * 0.5), xm = (x0 - W / 2) / s;
  const tone = 0.3 + rand() * 0.4, wall = col('buildings', [tone, tone, tone * 1.05]);
  const winW = Math.max(2 * scale, B.window.w * s), winH = Math.max(3 * scale, B.window.h * s); // 2x3 px at least
  const stepX = winW * 2.2, stepY = winH * 2, left = x0 - w / 2;
  const litShare = scene.time === 'night' ? 0.55 : scene.time === 'sunset' ? 0.35 : 0.08;
  const bright = lit(wall, 0.85), dark = lit(wall, 0.5), unlit = lit(DARKWINDOW, 0.8);
  shadow(xm, zm, { w: wm, d: wm * 0.8 }, storeys * SIZES.storey);
  rect(left, fy - hgt, w, hgt, (x, y) => {
    const gx = (x - left) % stepX, gy = (fy - y) % stepY;
    if (gx > stepX * 0.3 && gx < stepX * 0.3 + winW && gy > stepY * 0.25 && gy < stepY * 0.25 + winH) {
      return h2(Math.floor((x - x0) / stepX), Math.floor((fy - y) / stepY), 13) < litShare ? LITWINDOW : unlit;
    }
    return (x < x0) === sun.left ? bright : dark;
  });
  return { x: left, y: fy - hgt, w, h: hgt };
}

const PAINTWORK = [0.75, 0.12, 0.10], GLASS = [0.3, 0.4, 0.5], HUB = [0.6, 0.6, 0.62], TYRE = [0.06, 0.06, 0.06];
const HEADLAMP = [1, 0.95, 0.75];

function car(ctx, inst) { // a body, a cabin, two wheels, lamps lit at night, seen from the side
  const { W, L, scene, rand, lit, col, sun, rect, poly, disc } = ctx, C = SIZES.car;
  const { fy, zm, s, shadow } = stance(ctx, inst), len = C.l * s; // a car is 4.5 m long, whatever the picture's size
  const lane = (rand() - 0.5) * 2.4; // on the road: within 1.2 m of its middle
  const x0 = scene.road ? W / 2 + lane * s : clamp(inst.ux * W, len * 0.55, W - len * 0.55), xm = (x0 - W / 2) / s;
  const body = col('cars', PAINTWORK), r = C.wheel / 2 * s, c = [0, 0, 0];
  shadow(xm, zm, { w: C.l, d: C.w }, C.h * 0.85);
  const sill = fy - 0.3 * s, shoulder = fy - 0.95 * s, roof = fy - C.h * s, bodyH = sill - shoulder;
  rect(x0 - len / 2, shoulder, len, bodyH, (x, y) => {
    const side = (x - x0) / len, up = (sill - y) / bodyH;
    return lit(body, 0.45 + 0.5 * up + 0.2 * (sun.left ? -side : side), c);
  });
  const glass = mix(lit(GLASS, 0.9), L.horizon, 0.35), top = lit(body, 0.8);
  const cab = (inset, dy) => { // the cabin's trapezoid, pulled in by `inset` of the length and `dy` rows: the glass
    const hb = len * 0.33 - inset, ht = len * 0.23 - inset, front = len * 0.05, yb = shoulder - dy, yt = roof + dy;
    return [x0 - hb + front, yb, x0 + hb, yb, x0 + ht, yt, x0 - ht + front, yt];
  };
  poly(cab(0, 0), top);
  poly(cab(len * 0.03, (shoulder - roof) * 0.1), glass);
  const hub = lit(HUB, 0.9), tyre = lit(TYRE, 0.6);
  for (const wx of [x0 - len * 0.31, x0 + len * 0.31]) {
    disc(wx, fy - r, r, tyre);
    disc(wx, fy - r, r * 0.55, hub);
  }
  if (scene.time === 'night' || scene.time === 'sunset') {
    for (const lx of [x0 - len * 0.47, x0 + len * 0.47]) {
      rect(lx - len * 0.02, fy - 0.85 * s, len * 0.04, 0.2 * s, HEADLAMP);
    }
  }
  return { x: x0 - len / 2, y: roof, w: len, h: fy - roof };
}

const HULL = [0.85, 0.85, 0.88], MAST = [0.3, 0.2, 0.15], SAIL = [0.95, 0.95, 0.93];

function boat(ctx, inst) { // a hull and a sail, on the water, with a smear of reflection under it
  const { W, rand, put, lit, col, sun, poly, rect } = ctx, B = SIZES.sailboat;
  const { fy, zm, s, shadow } = stance(ctx, inst), len = B.hull * (0.9 + rand() * 0.3) * s;
  const x0 = clamp(inst.ux * W, len * 0.55, W - len * 0.55), xm = (x0 - W / 2) / s;
  const hull = col('boats', HULL), hh = B.freeboard * s, deck = fy - hh, c = [0, 0, 0];
  shadow(xm, zm, { w: B.hull, d: B.beam }, B.freeboard + 0.6);
  const tuck = len * 0.12;
  poly([x0 - len / 2, deck, x0 + len / 2, deck, x0 + len / 2 - tuck, fy, x0 - len / 2 + tuck, fy],
    (x, y) => lit(hull, 0.6 + 0.3 * (1 - (y - deck) / hh), c));
  const mast = lit(MAST, 0.6), sail = lit(SAIL, 0.5 + 0.5 * (sun.left ? 0.9 : 0.6)), mastH = B.mast * s;
  const mx = x0 - len * 0.02, mw = Math.max(1, len * 0.03);
  const boom = deck - B.boom * s;
  poly([mx + mw, deck - mastH, mx + mw + B.foot * s, boom, mx + mw, boom], sail);
  rect(mx, deck - mastH, mw, mastH, mast);
  const wake = lit(hull, 0.5);
  for (let y = fy; y < fy + hh * 2; y++) {
    for (let x = x0 - len / 2; x < x0 + len / 2; x++) {
      if (h2(x, y, 17) > 0.45) put(x, y, wake, 0.25 * (1 - (y - fy) / (hh * 2)));
    }
  }
  return { x: x0 - len / 2, y: deck - mastH, w: len, h: hh + mastH };
}

const NIGHTBIRD = [0.1, 0.1, 0.12], DAYBIRD = [0.12, 0.12, 0.14], WING_STEPS = 5;

function bird(ctx, inst) { // a gull's two strokes, far in the sky
  const { W, H, scene, rand, line } = ctx;
  const x0 = inst.ux * W, y0 = inst.uy * H, s = ctx.camera.focal / (inst.zm ?? 60);
  const span = SIZES.birdSpan * (0.8 + rand() * 0.4) * s, half = span / 2, lift = half * 0.25;
  const c = scene.time === 'night' ? NIGHTBIRD : DAYBIRD, width = Math.max(0.8, span * 0.04);
  for (const dir of [-1, 1]) {
    for (let k = 0; k < WING_STEPS; k++) {
      const u0 = k / WING_STEPS, u1 = (k + 1) / WING_STEPS;
      const ya = y0 - Math.sin(u0 * Math.PI) * lift, yb = y0 - Math.sin(u1 * Math.PI) * lift;
      line(x0 + dir * u0 * half, ya, x0 + dir * u1 * half, yb, width, c, 0.9);
    }
  }
  return { x: x0 - half, y: y0 - lift, w: span, h: lift };
}

/**
 * The registry entries, in placing order. depth is how far away a thing may stand, in metres, chosen so it is seen
 * whole through the camera; size is its typical width and height in metres as drawn, for the shore to judge the
 * same and for the far bank's depth; band is the older screen-row band, kept for readers of the shape.
 */
export const drawers = [
  {
    id: 'tree', word: 'trees', match: THINGS.trees, usual: 9, band: [0.03, 0.1], depth: [75, 260],
    size: { w: 12, h: (SIZES.pine[0] + SIZES.pine[1]) / 2 }, draw: tree,
  },
  {
    id: 'building', word: 'buildings', match: THINGS.buildings, usual: 11, band: [0.01, 0.05], depth: [150, 700],
    size: { w: SIZES.building.w[1], h: SIZES.building.storeys[1] * SIZES.storey }, draw: building,
  },
  {
    id: 'house', word: 'houses', match: THINGS.houses, usual: 3, band: [0.06, 0.3], depth: [25, 130],
    size: { w: SIZES.cabin.w * 1.12, h: SIZES.cabin.wall + SIZES.cabin.rise }, draw: house, // the eaves hang over
  },
  {
    id: 'boat', word: 'boats', match: THINGS.boats, usual: 2, band: [0.03, 0.2], depth: [40, 250], onWater: true,
    size: { w: SIZES.sailboat.hull, h: SIZES.sailboat.mast }, draw: boat,
  },
  {
    id: 'car', word: 'cars', match: THINGS.cars, usual: 2, band: [0.12, 0.55], depth: [14, 60],
    size: { w: SIZES.car.l, h: SIZES.car.h }, draw: car,
  },
  { id: 'bird', word: 'birds', match: THINGS.birds, usual: 7, band: null, depth: [25, 120], sky: true, draw: bird },
];
