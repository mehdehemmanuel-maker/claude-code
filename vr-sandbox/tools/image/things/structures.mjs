// Structures: houses by kind in three-quarter view, towers with their windows, a city's skyline, and the things that
// stand built in a landscape (lighthouse, rocks, windmill, castle, church, bridge, tent, campfire, fence, streetlamp,
// telegraph pole, bench), each from a table in metres (HOUSES, STRUCTURES: the figures sheet scratchpad/figures/
// figures-creatures-structures.json, each row saying what is published, typical or an estimate) and drawn through
// the camera as the vehicles are: a frame at the thing's place and heading, faces projected point by point, the
// faces that look at the camera kept, each lit by its normal (a painter's light: the wall toward the sun's side of
// the frame bright, the one away from it in shade, a roof lit from above), and its detail (logs, boards, tiles,
// windows, doors, a window grid) painted by unprojecting each pixel back onto the face (a cottage is drawn as the
// house: its thatch did not read as thatch, so the kind is not claimed). Every house kind is
// drawn to the cabin's eave and ridge (SIZES.cabin: 3 m + 1.8 m, typical), because the house entry's one size frames
// the camera and the placement for the word 'house' (the image-place and image-draw tests hold it at 4.8 m); a
// two-storey house (8 m) and a barn (8-10 m to the ridge) are taller than that in life: the footprints vary, the
// heights do not, and this comment says so. skylinePass paints, before the ground (so the water and the wet
// pavement mirror it through the sky snapshot), a dense row of 25-40 silhouettes at the horizon when the words ask
// for a city, with a warm glow and a row of street lamps at night. Nothing of Node is here; the registry reads the
// words of every entry (no edit to read.mjs), things.mjs takes the house and building rows into its drawers list so
// the registry's order holds, and core.mjs installs the rest.
import { clamp, fbm, h2, lerp, mix } from '../math.mjs';
import { SIZES } from '../draw.mjs';
import { register } from '../registry.mjs';

// ── The figures, in metres ─────────

const C = SIZES.cabin; // a one-room cabin 6 x 4 m, walls 3 m, the ridge 1.8 m higher, a 0.9 x 2.1 m door: typical
/**
 * The house kinds: L along the ridge, D across, wall to the eave, rise to the ridge, over the eaves' overhang, all
 * in metres; the colours a painter's reading of the type. Every row keeps the cabin's 4.8 m to the ridge (see the
 * header: the house entry's one size); the footprints are typical of each type.
 */
export const HOUSES = {
  // a small house: the cabin's footprint, pale rendered walls, a tiled roof, two windows and a door: typical
  house: {
    L: C.w, D: C.d, wall: C.wall, rise: C.rise, over: 0.25, colour: [0.86, 0.80, 0.68], roof: [0.42, 0.26, 0.20],
    roofKind: 'tile', windows: 2, source: 'SIZES.cabin footprint and heights (typical); the look typical',
  },
  // a log cabin: SIZES.cabin whole; round logs 0.32 m a course, a shingle roof, one window: typical
  cabin: {
    L: C.w, D: C.d, wall: C.wall, rise: C.rise, over: 0.4, colour: [0.48, 0.32, 0.17], roof: [0.30, 0.21, 0.14],
    roofKind: 'shingle', windows: 1, logs: 0.32, source: 'SIZES.cabin (typical); log course 0.3-0.35 m typical',
  },
  // a farmhouse or barn: wide (10 x 6 m, typical of a small barn's footprint), barn red boards with white trim, a
  // hay door in the gable over a double door; its ridge held to 4.8 m (a barn's is 8-10 m: see the header)
  farmhouse: {
    L: 10, D: 6, wall: 3.2, rise: 1.6, over: 0.3, colour: [0.62, 0.14, 0.10], roof: [0.32, 0.33, 0.36],
    roofKind: 'corrugated', windows: 3, boards: 0.25, barn: true,
    source: 'footprint typical of a small barn; height held to the cabin envelope (see the file header)',
  },
};

/** The other structures, in metres, each row with its source from the figures sheet (2026-10-17). */
export const STRUCTURES = {
  // a coastal masonry lighthouse: 30 m to the gallery (20-40 typical), base 8 m across tapering to 5 at the
  // gallery, the gallery rail projecting 0.8 m, a 3.5 m glazed lantern under a 1.7 m dome (typical; Portland Bill
  // 41 m and Beachy Head 43 m published, Trinity House); white with one red band: typical colours
  lighthouse: {
    h: 30, base: 8, top: 5, rail: 0.8, lantern: { h: 3.5, d: 3.5, dome: 1.7 }, band: [11, 16], rock: { w: 18, h: 5 },
    headland: { lumps: [14, 20], w: [6, 2.5], h: [2.5, 0.7], drift: 2 }, // a low reef from it to the shore: estimate
    source: 'figures sheet lighthouse: typical ranges; the example towers published (Trinity House, USCG)',
  },
  // shore rocks and boulders: lumps 1-3 m tall in a cluster 5 m across, dark wet rock: an estimate; a cliff word
  // makes the mass three times as tall
  rocks: { w: 5, h: 1.5, d: 3, cliff: 4, source: 'estimate (no row in the figures sheet)' },
  // a Dutch smock mill: 15 m to the cap (12-18), base 8 m tapering to 4, cap 3.5 m, four sails 24 m across (22-28
  // published, De Hollandsche Molen), 2 m wide, leaning back 12 deg, a tail pole to the ground: typical
  windmill: {
    tower: 15, cap: 3.5, base: 8, top: 4, sail: 24, sailWidth: 2, lean: 12, tailPole: 12,
    source: 'figures sheet windmill: typical; the sail span published (De Hollandsche Molen)',
  },
  // a stone castle: a curtain wall 10 m to the walk (8-12), merlons 1.8 m tall and 2 m wide with 0.8 m embrasures,
  // round towers 20 m tall and 10 across (Conwy 21 m published), a square keep 25 m tall and 20 wide: typical
  castle: {
    wall: { L: 40, h: 10, t: 3 }, merlon: { h: 1.8, w: 2, gap: 0.8 }, tower: { h: 20, d: 10 },
    keep: { h: 25, w: 20 }, gate: { w: 3.5, h: 5 },
    source: 'figures sheet castle: typical ranges (Toy, Brown); Conwy and Rochester published',
  },
  // an English parish church: a nave 25 x 9 m, eaves 7 m, a 50 deg roof (the ridge 12.4 m), a west tower 6 m square
  // and 20 m tall under an 18 m spire: typical (Pevsner; the village steeple about 40 m)
  church: {
    L: 25, D: 9, wall: 7, rise: 5.4, tower: 6, towerH: 20, spire: 18,
    source: 'figures sheet church: typical (Pevsner, Clifton-Taylor); great-church heights published',
  },
  // a chapel: the same at three fifths: typical of a small chapel (an estimate from the church figures)
  chapel: { L: 15, D: 7, wall: 4.5, rise: 3.6, tower: 4.5, towerH: 12, spire: 10, source: 'estimate: 0.6 church' },
  // a masonry arch bridge: a 15 m segmental span (6-25) rising 5 m (span/3, Ruddock published), a 0.6 m arch ring,
  // 3 m abutments, 4 m clear over the water, a 1.1 m stone parapet following the hump: typical
  bridge: {
    span: 15, rise: 5, ring: 0.6, abutment: 3, springing: 1, deck: 0.8, parapet: 1.1,
    source: 'figures sheet bridgeStoneArch: typical; span/rise ratios published (Ruddock)',
  },
  // a two-person ridge tent: 2.1 x 1.4 m, the ridge 1.2 m, guy lines a metre past each end: typical (Vango Force
  // Ten Mk4 2.2 x 1.5 x 1.2, maker's figures)
  tent: { L: 2.1, W: 1.4, h: 1.2, guy: 1.0, source: 'figures sheet tentAFrame: typical; the Force Ten published' },
  // a campfire: a 0.9 m stone ring, logs 0.3 m high, a 0.7 m flame, the ground lit to 4 m, a 5 m smoke column:
  // typical (US Forest Service fire-ring size)
  campfire: { ring: 0.9, logs: 0.3, flame: 0.7, glow: 4, smoke: 5, source: 'figures sheet campfire: typical' },
  // a post-and-rail fence: 1.2 m, 100 mm posts every 1.8 m, three 90 x 38 mm rails (BS 1722-7 published); a run
  // of 12 m drawn: an estimate of what one picture shows
  fence: { h: 1.2, post: 0.1, spacing: 1.8, rails: 3, rail: 0.09, run: 12, source: 'BS 1722-7 (published)' },
  // a street lighting column: 8 m (BS 5489 heights 8, 10, 12 m on traffic routes, published), 0.17 m at the base
  // to 0.08 at the top, a 1 m arm, a 0.7 x 0.15 m lantern, the ground lit to about 1.2 x the height: typical
  streetlamp: {
    h: 8, base: 0.17, top: 0.08, arm: 1.0, lantern: { l: 0.7, t: 0.15 }, pool: 10,
    source: 'figures sheet streetLamp: heights published (BS 5489 / EN 40); the rest typical',
  },
  // a wooden telegraph pole: 8 m above ground (BT medium pole, published), 0.28 m at the base to 0.17, a 2.4 m
  // crossarm (US 8 ft, published), four wires sagging 0.7 m: typical
  pole: { h: 8, base: 0.28, top: 0.17, arm: 2.4, wires: 4, sag: 0.7, source: 'figures sheet telegraphPole' },
  // a park bench: 1.8 m long, seat 0.45 m, back 0.9 m, 0.45 m deep, five slats (BS EN 581 ergonomics published;
  // catalogue lengths typical)
  bench: { L: 1.8, seat: 0.45, back: 0.9, depth: 0.45, slats: 5, source: 'figures sheet parkBench' },
};

// ── Colours ────────────────────────

const DOOR = [0.30, 0.18, 0.10], TRIM = [0.92, 0.92, 0.90], GLASS = [0.32, 0.42, 0.52], LAMPLIGHT = [1, 0.82, 0.48];
const LITWINDOW = [1, 0.85, 0.5], DARKWINDOW = [0.18, 0.25, 0.34], SNOWROOF = [0.92, 0.93, 0.96];
const CHIMNEY = [0.40, 0.33, 0.30], STONE = [0.58, 0.55, 0.48], HONEY = [0.64, 0.57, 0.44], SLATE = [0.30, 0.32, 0.36];
const WHITE = [0.92, 0.90, 0.86], RED_BAND = [0.75, 0.12, 0.10], IRON = [0.18, 0.18, 0.20], ROCK = [0.36, 0.35, 0.33];
const CLIFF = [0.36, 0.33, 0.29], FOAM = [0.93, 0.95, 0.96], MILL = [0.16, 0.26, 0.18], BRICK = [0.55, 0.30, 0.22];
const SAIL = [0.88, 0.86, 0.80], TIMBER = [0.45, 0.38, 0.30], POLE = [0.38, 0.32, 0.26], COLUMN = [0.25, 0.27, 0.26];
const FLAME = [[1, 0.95, 0.6], [1, 0.6, 0.15], [0.9, 0.25, 0.05]], EMBER = [1, 0.45, 0.1], SMOKE = [0.55, 0.55, 0.56];
const BEAM = [1, 0.95, 0.75], GLOW = [0.9, 0.6, 0.35], LAMP = [1, 0.84, 0.55], BENCH_GREEN = [0.16, 0.30, 0.18];
const STONE_RING = [0.45, 0.43, 0.40], SPARK = [1, 0.7, 0.3], WIRE = [0.12, 0.12, 0.13];
/** Tent cloth an uncoloured tent picks from by the seed: canvas green, classic orange, cream canvas. */
const TENT_CLOTH = [[0.25, 0.42, 0.22], [0.92, 0.45, 0.12], [0.88, 0.84, 0.72]];

const DEG = Math.PI / 180;
const NEAR = 0.6; // metres: a face nearer the lens than this is cut off at it (as the vehicles do)
const AMBIENT_LIT = 0.46; // windows and lamps light when L.ambient x gloom falls under this: dusk, dawn, night, storm

// ── Standing in the world ──────────

/**
 * Where a thing stands: its foot's pixel, its depth, the pixels per metre there, its metres off the axis (its
 * centre pulled into the frame when the drawn width would cross an edge, as the old house did), its size factor,
 * the rows to lift it when it stands on the far bank (its foot at the horizon, the land under it out of frame: the
 * projection is made at its depth and shifted up), and shadow(), which throws nothing from the far bank.
 */
function stance(ctx, inst, wide = 0) {
  const { W, hy } = ctx, k = inst.size || 1;
  const zm = Math.max(1, inst.zm ?? Math.min(ctx.groundZ(inst.fy), 400)), s = ctx.camera.focal / zm;
  const half = Math.min(wide * k * s / 2, W / 2), x0 = clamp(inst.ux * W, half, W - half), xm = (x0 - W / 2) / s;
  const foot = ctx.project(xm, zm).y, fy = inst.fy ?? foot, farBank = fy < hy;
  return { x0, fy, zm, s, xm, k, dy: farBank ? fy - foot : 0, shadow: farBank ? () => {} : ctx.shadow };
}

/** A frame at (xm, zm): u along the length, turned `theta` from the picture's right toward away, v across, h up. */
function frameAt(xm, zm, theta, k = 1) {
  const cos = Math.cos(theta), sin = Math.sin(theta);
  return {
    to: ([u, v, h]) => [xm + (u * cos - v * sin) * k, zm + (u * sin + v * cos) * k, h * k],
    normal: ([nu, nv, nh]) => [nu * cos - nv * sin, nu * sin + nv * cos, nh],
  };
}

/** A polygon of world points [x, z, h] cut at the near plane z = NEAR (Sutherland-Hodgman against one plane). */
function clipNear(pts) {
  if (pts.every((p) => p[1] >= NEAR)) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ain = a[1] >= NEAR, bin = b[1] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, NEAR, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return out;
}

/**
 * The painter of one thing: face(local, n, ea, eb, paint, opts) projects a planar face given in the frame F (its
 * local points, its outward normal, and the two unit axes a paint function reads its (a, b) metres along), skips it
 * when it does not look at the camera (opts.cull false keeps it), lights it by its normal and paints it, a plain
 * colour through ctx.lit or a function (a, b, k, out) -> colour per pixel found by unprojecting the pixel onto the
 * face's plane (null leaves the pixel); opts.emissive paints a colour unlit, opts.light sets k. point(local) is a
 * projected point; box() the pixels everything covered; dy lifts a far-bank thing to its foot row; `k` is the
 * thing's size factor, taken out of the metres a paint function sees.
 */
function painter(ctx, F, dy = 0, k = 1) {
  const { W, hy, camera: { focal, eye }, sun } = ctx, sx = sun.left ? -1 : 1, out = [0, 0, 0];
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const seen = (x, y) => {
    if (x < b.x0) b.x0 = x;
    if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y;
    if (y > b.y1) b.y1 = y;
  };
  const flat = (world) => {
    const pts = [];
    for (const w of clipNear(world)) {
      const p = ctx.project(w[0], w[1], w[2]);
      seen(p.x, p.y + dy);
      pts.push(p.x, p.y + dy);
    }
    return pts;
  };
  // the painter's light: a face toward the sun's side of the frame is bright, one away from it in shade, an upward
  // face lit from above, one toward the viewer a little brighter than one turned away
  const light = (nw) => clamp(0.45 + 0.45 * nw[0] * sx + 0.35 * nw[2] - 0.12 * nw[1], 0.3, 1);
  const facing = (nw, world) => {
    let cx = 0, cz = 0, ch = 0;
    for (const w of world) {
      cx += w[0];
      cz += w[1];
      ch += w[2];
    }
    return -nw[0] * cx - nw[1] * cz + nw[2] * (eye * world.length - ch) > 0;
  };
  const face = (local, n, ea, eb, paint, opts = {}) => {
    const world = local.map(F.to), nw = F.normal(n);
    if (opts.cull !== false && !facing(nw, world)) return false;
    const pts = flat(world);
    if (pts.length < 6) return false;
    const kl = opts.light ?? light(nw);
    if (typeof paint !== 'function') {
      ctx.poly(pts, opts.emissive ? paint : ctx.lit(paint, kl, out), opts.alpha, opts.soft);
      return true;
    }
    const p0 = world[0], Ea = F.normal(ea), Eb = F.normal(eb);
    const nd = nw[0] * p0[0] + nw[1] * p0[1] + nw[2] * (p0[2] - eye);
    ctx.poly(pts, (px, py) => {
      const dx = (px - W / 2) / focal, dh = (hy - py + dy) / focal, den = nw[0] * dx + nw[1] + nw[2] * dh;
      if (Math.abs(den) < 1e-9) return null;
      const t = nd / den, X = t * dx - p0[0], Z = t - p0[1], Hh = eye + t * dh - p0[2];
      return paint((X * Ea[0] + Z * Ea[1] + Hh * Ea[2]) / k, (X * Eb[0] + Z * Eb[1] + Hh * Eb[2]) / k, kl, out);
    }, opts.alpha, opts.soft);
    return true;
  };
  const point = (local) => {
    const w = F.to(local), p = ctx.project(w[0], Math.max(NEAR, w[1]), w[2]);
    return { x: p.x, y: p.y + dy, scale: p.scale, z: w[1] };
  };
  const stroke = (a, b2, width, colour, alpha = 1) => { // a line between two local points, width in metres
    const p = point(a), q = point(b2), s = Math.min(p.scale, q.scale);
    seen(p.x, p.y);
    seen(q.x, q.y);
    ctx.line(p.x, p.y, q.x, q.y, Math.max(0.7, width * k * s), colour, alpha);
  };
  const box = () => (Number.isFinite(b.x0)
    ? { x: b.x0, y: b.y0, w: Math.max(1, b.x1 - b.x0), h: Math.max(1, b.y1 - b.y0) } : null);
  return { face, flat, point, stroke, light, box, seen, sx };
}

/** The faces of a box in the frame, each with the axes its paint reads (a along, b up; the top: a along, b across). */
function boxFaces(u0, u1, v0, v1, h0, h1) {
  return [
    { pts: [[u0, v0, h0], [u1, v0, h0], [u1, v0, h1], [u0, v0, h1]], n: [0, -1, 0], ea: [1, 0, 0], eb: [0, 0, 1] },
    { pts: [[u1, v1, h0], [u0, v1, h0], [u0, v1, h1], [u1, v1, h1]], n: [0, 1, 0], ea: [-1, 0, 0], eb: [0, 0, 1] },
    { pts: [[u0, v1, h0], [u0, v0, h0], [u0, v0, h1], [u0, v1, h1]], n: [-1, 0, 0], ea: [0, -1, 0], eb: [0, 0, 1] },
    { pts: [[u1, v0, h0], [u1, v1, h0], [u1, v1, h1], [u1, v0, h1]], n: [1, 0, 0], ea: [0, 1, 0], eb: [0, 0, 1] },
    { pts: [[u0, v0, h1], [u1, v0, h1], [u1, v1, h1], [u0, v1, h1]], n: [0, 0, 1], ea: [1, 0, 0], eb: [0, 1, 0] },
  ];
}

/** The faces of a gabled house: two pentagonal ends (front at -u), two long walls, two roof planes. */
function gableFaces(L, D, wall, rise, over) {
  const hw = L / 2, hd = D / 2, eave = wall - over * rise / hd, slope = Math.hypot(hd, rise);
  const up = [0, hd / slope, rise / slope]; // up the left roof plane, from its eave to the ridge
  return {
    front: {
      pts: [[-hw, -hd, 0], [-hw, hd, 0], [-hw, hd, wall], [-hw, 0, wall + rise], [-hw, -hd, wall]], n: [-1, 0, 0],
      ea: [0, 1, 0], eb: [0, 0, 1], id: 'front',
    },
    back: {
      pts: [[hw, hd, 0], [hw, -hd, 0], [hw, -hd, wall], [hw, 0, wall + rise], [hw, hd, wall]], n: [1, 0, 0],
      ea: [0, -1, 0], eb: [0, 0, 1], id: 'back',
    },
    left: { pts: [[-hw, -hd, 0], [hw, -hd, 0], [hw, -hd, wall], [-hw, -hd, wall]], n: [0, -1, 0], ea: [1, 0, 0],
      eb: [0, 0, 1], id: 'side' },
    right: { pts: [[hw, hd, 0], [-hw, hd, 0], [-hw, hd, wall], [hw, hd, wall]], n: [0, 1, 0], ea: [-1, 0, 0],
      eb: [0, 0, 1], id: 'side' },
    roofL: {
      pts: [[-hw - over, -hd - over, eave], [hw + over, -hd - over, eave], [hw + over, 0, wall + rise],
        [-hw - over, 0, wall + rise]], n: [0, -rise / slope, hd / slope], ea: [1, 0, 0], eb: up, id: 'roof',
    },
    roofR: {
      pts: [[hw + over, hd + over, eave], [-hw - over, hd + over, eave], [-hw - over, 0, wall + rise],
        [hw + over, 0, wall + rise]], n: [0, rise / slope, hd / slope], ea: [-1, 0, 0], eb: [0, -up[1], up[2]],
      id: 'roof',
    },
  };
}

/** The heading that turns a thing's front (its -u end) toward the camera and `psi` toward the sun's side. */
const frontToward = (sx, psi) => Math.atan2(Math.cos(psi), -sx * Math.sin(psi));
/** The heading that turns a thing's -v face toward the camera and `psi` toward the sun's side. */
const faceToward = (sx, psi) => sx * psi;

const scaled = (c, t, out) => {
  out[0] = c[0] * t;
  out[1] = c[1] * t;
  out[2] = c[2] * t;
  return out;
};

/** Whether the lamps are lit: dusk, dawn, night, a storm. */
const dim = (ctx) => ctx.L.ambient * ctx.gloom < AMBIENT_LIT;
/** The share of a building's windows that are lit, by the time of day. */
const litShareOf = (scene) => (scene.time === 'night' ? 0.55 : scene.time === 'sunset' ? 0.35
  : scene.time === 'dawn' ? 0.18 : 0.08);

// ── Houses ─────────────────────────

const HOUSE_YAW = 18 * DEG; // the gable end faces the viewer, turned this much toward the sun's side
/**
 * Where the placement's foot is on the house: 'front' stands the near gable there (the house runs back from it, as
 * the old elevation stood), 'centre' the middle of its footprint. On land the front: the top the placement framed
 * is the near gable's; on a shore the centre: the back wall stays off the water the placement kept it from.
 */
export const HOUSE_ANCHOR = { land: 'front', water: 'centre' };
const HOUSE_WORDS = [
  [/\b(cabins?|huts?|lodges?|chalets?)\b/, 'cabin'], [/\b(farmhouses?|barns?|farms?)\b/, 'farmhouse'],
];

/** The kind the word names: cabin, farmhouse, else a house (a cottage and a village's houses are houses). */
export function houseKind(word) {
  for (const [re, kind] of HOUSE_WORDS) if (re.test(word)) return kind;
  return 'house';
}

/** The openings of a wall: the door and windows of the front (the gable end), the windows of a long wall. */
function openings(S, which) {
  const list = [], win = (a, w = 0.9, sill = 1.4, h = w) => list.push({ a0: a - w / 2, a1: a + w / 2, b0: sill,
    b1: sill + h, kind: 'window' });
  if (which === 'front') {
    const mid = S.D / 2;
    if (S.barn) {
      list.push({ a0: mid - 1.2, a1: mid + 1.2, b0: 0, b1: 2.8, kind: 'barndoor' });
      list.push({ a0: mid - 0.6, a1: mid + 0.6, b0: S.wall + 0.3, b1: S.wall + 1.4, kind: 'hay' });
      win(mid - 2.1, 0.8, 1.5);
      win(mid + 2.1, 0.8, 1.5);
    } else {
      list.push({ a0: mid - 0.8 - 0.45, a1: mid - 0.8 + 0.45, b0: 0, b1: 2.1, kind: 'door' });
      win(mid + 0.9);
    }
  } else if (which === 'side') {
    const n = S.windows, span = S.L - 2.4;
    for (let i = 0; i < n; i++) win(1.2 + (n === 1 ? span / 2 : (span * i) / (n - 1)), S.barn ? 0.8 : 0.9, 1.4);
  }
  return list;
}

/**
 * A wall's paint: its openings (a door, lit or dark windows with a frame, a barn's double door and hay door with
 * white trim), then its texture: round log courses, red boards with their seams, or a plain render with a little
 * grain. a runs along the wall, b up, in metres.
 */
function wallPaint(ctx, S, colour, which, index) {
  const { scene } = ctx, list = openings(S, which), night = scene.time === 'night', glow = dim(ctx);
  const frameW = 0.07, c = [0, 0, 0];
  return (a, b, k, out) => {
    for (const [i, o] of list.entries()) {
      if (a < o.a0 || a > o.a1 || b < o.b0 || b > o.b1) continue;
      const edge = Math.min(a - o.a0, o.a1 - a, o.b1 - b) < frameW;
      if (o.kind === 'door') return ctx.lit(DOOR, k * 0.9, out);
      if (o.kind === 'barndoor') {
        if (edge || Math.abs(a - (o.a0 + o.a1) / 2) < 0.03) return ctx.lit(TRIM, k, out);
        return ctx.lit(scaled(colour, 0.8, c), k, out);
      }
      if (o.kind === 'hay') return edge ? ctx.lit(TRIM, k, out) : ctx.lit(DOOR, k * 0.7, out);
      if (edge) return ctx.lit(TRIM, k, out); // the frame
      if (!S.barn && Math.abs(a - (o.a0 + o.a1) / 2) < 0.03) return ctx.lit(TRIM, k, out); // the mullion
      const on = glow && h2(index, i, 131) < (night ? 0.8 : 0.6);
      if (on) return mix(LAMPLIGHT, GLASS, night ? 0 : 0.3, out);
      return ctx.lit(mix(GLASS, ctx.L.horizon, 0.3, c), k * 1.1, out);
    }
    let tone = 1;
    if (S.logs) { // round logs: a crevice between courses, the belly of each catching the light
      const t = ((b % S.logs) + S.logs) % S.logs / S.logs;
      tone = 0.72 + 0.28 * Math.sin(t * Math.PI) + (fbm(a * 2, b * 20, 192, 2) - 0.5) * 0.1;
    } else if (S.boards) {
      tone = ((a % S.boards) + S.boards) % S.boards < 0.03 ? 0.78 : 0.95 + 0.1 * fbm(a * 4, b, 193, 2);
    } else tone = 0.93 + 0.14 * fbm(a * 3, b * 3, 191, 2);
    if (S.barn && (a < 0.15 || b > S.wall - 0.12)) return ctx.lit(TRIM, k, out); // the corner board and the fascia
    return ctx.lit(scaled(colour, tone, c), k, out);
  };
}

/** A roof plane's paint: tile courses, staggered shingles, corrugated ribs; snow when it lies. */
function roofPaint(ctx, S, snowy) {
  const c = [0, 0, 0];
  return (a, b, k, out) => {
    if (snowy) return ctx.lit(SNOWROOF, 0.6 + 0.4 * k, out);
    let tone;
    if (S.roofKind === 'tile') {
      tone = ((b % 0.35) + 0.35) % 0.35 < 0.05 ? 0.72 : 0.92 + 0.12 * fbm(a * 3, b * 3, 194, 2);
    } else if (S.roofKind === 'shingle') {
      const row = Math.floor(b / 0.5), seam = ((a + row * 0.25) % 0.5 + 0.5) % 0.5 < 0.04;
      tone = ((b % 0.5) + 0.5) % 0.5 < 0.06 || seam ? 0.7 : 0.85 + 0.25 * fbm(a * 5, b * 0.5, 195, 2);
    } else tone = ((a % 0.3) + 0.3) % 0.3 < 0.06 ? 0.8 : 1;
    return ctx.lit(scaled(S.roof, tone, c), k, out);
  };
}

/**
 * A house of the kind its word names, in three-quarter view: its gable end toward the viewer turned HOUSE_YAW
 * toward the sun's side (so the end with the door is the lit wall and the long wall recedes in shade), two roof
 * planes (the one over the visible long wall shows), a chimney on the ridge, the walls in inst.colour when the
 * words gave one, every metre times inst.size, its shadow thrown first from its footprint as it stands. The box
 * answered is the house's elevation at its depth, as the layout always had it: its foot row and its ridge height
 * through the camera, its width as drawn; the near corner and the chimney of the three-quarter view fall a little
 * outside it.
 */
export function drawHouse(ctx, inst) {
  const { scene, rand, hy } = ctx, word = inst.instance?.word ?? inst.word ?? '';
  const kind = houseKind(word), S = HOUSES[kind], index = (rand() * 1e6) | 0;
  const wide = S.D * Math.cos(HOUSE_YAW) + S.L * Math.sin(HOUSE_YAW) + 2 * S.over;
  const st = stance(ctx, inst, wide), sx = ctx.sun.left ? -1 : 1, theta = frontToward(sx, HOUSE_YAW);
  const anchor = scene.ground === 'water' && inst.fy >= hy ? HOUSE_ANCHOR.water : HOUSE_ANCHOR.land;
  const near = S.L / 2 + S.over, back = anchor === 'front' ? near : 0; // the frame's origin behind the foot
  const cx = st.xm + back * Math.cos(theta) * st.k, cz = st.zm + back * Math.sin(theta) * st.k;
  const F = frameAt(cx, cz, theta, st.k), P = painter(ctx, F, st.dy, st.k);
  const cos = Math.abs(Math.cos(theta)), sin = Math.abs(Math.sin(theta));
  st.shadow(cx, cz, { w: (S.L * cos + S.D * sin) * st.k, d: (S.L * sin + S.D * cos) * st.k },
    (S.wall + S.rise * 0.5) * st.k);
  const colour = inst.colour ?? S.colour, faces = gableFaces(S.L, S.D, S.wall, S.rise, S.over);
  const snowy = scene.land === 'snow', roof = roofPaint(ctx, S, snowy);
  for (const f of [faces.front, faces.back, faces.left, faces.right]) {
    P.face(f.pts, f.n, f.ea, f.eb, wallPaint(ctx, S, colour, f.id, index + (f.id === 'front' ? 0 : 7)));
  }
  for (const f of [faces.roofL, faces.roofR]) P.face(f.pts, f.n, f.ea, f.eb, roof);
  // the chimney: a stack on the visible slope at the far end of the roof, up to the ridge's height, so it stands on
  // the roof in the picture and never higher than the ridge's ends (the box below is measured to the ridge)
  const cu = S.L / 2 - 1.4, cw = C.chimney / 2, cv = (Math.cos(theta) > 0 ? -1 : 1) * 0.3 * S.D / 2;
  const roofAt = S.wall + S.rise * (1 - (Math.abs(cv) + cw) / (S.D / 2)), top = S.wall + S.rise;
  for (const f of boxFaces(cu - cw, cu + cw, cv - cw, cv + cw, roofAt, top)) {
    P.face(f.pts, f.n, f.ea, f.eb, snowy && f.n[2] > 0 ? SNOWROOF : S.logs ? STONE : CHIMNEY);
  }
  // the box: from the highest painted row, the house's height to the ridge through the camera at the depth of the
  // ridge end that stands highest in the picture (the near one from a standing eye, the far one from an eye above
  // the ridge), so its foot row reads the ridge height, as the elevation drawers' boxes did; on the far bank, down
  // to the horizon row the placement gave
  const drawn = P.box(), ends = [P.point([-near, 0, S.wall + S.rise]), P.point([near, 0, S.wall + S.rise])];
  const apex = ends[0].y <= ends[1].y ? ends[0] : ends[1], hgt = (S.wall + S.rise) * st.k * apex.scale;
  if (!drawn) return { x: st.x0, y: apex.y, w: 1, h: Math.max(1, hgt) };
  return { x: drawn.x, y: drawn.y, w: drawn.w, h: st.dy !== 0 ? st.fy - drawn.y : hgt };
}

// ── Buildings ──────────────────────

const BUILDING_YAW = 20 * DEG; // a tower's front turned this much toward the sun's side
const KERB = SIZES.lane * SIZES.lanes / 2 + 1.0; // metres from the road's centre to the kerb's back
const STREET_DEPTHS = [360, 50]; // the usual buildings along a street stand from here to here, far to near

/** The road's centre at a row in metres (ground-weather's drifted centre), the axis when no road was painted. */
const roadCentre = (ctx, fy) => (typeof ctx.roadX === 'function' ? ctx.groundX(ctx.roadX(fy), fy) : 0);

/**
 * A tower: a box of storeys with a window grid of its own pitch (seeded), a darker floor line every storey, lit
 * windows by the time of day and by the seed, a setback and an antenna on a tall one, two faces lit and shaded by
 * the sun; never taller than leaves some sky. The usual towers of a street (scene.road) stand along both kerbs
 * instead of at the skyline row, far to near in the order they are drawn, each facing the road; the box records
 * where it stood (stood: { xm, zm }).
 */
export function drawBuilding(ctx, inst) {
  const { scene, rand, camera } = ctx, B = SIZES.building, st = stance(ctx, inst, 0);
  const street = !!scene.road && !!inst.instance?.usual;
  let { xm, zm, dy } = st, stood;
  const wm = lerp(B.w[0], B.w[1], rand()) * st.k, dm = wm * 0.8, seed = (rand() * 1e6) | 0;
  let storeys = Math.round(lerp(B.storeys[0], B.storeys[1], rand()) * st.k), side = 1;
  if (street) { // hook for the street: along both kerbs, far to near as the painter's order draws them
    const n = Math.max(1, inst.instance.count), i = ctx.layout.things.filter((t) => t.kind === 'building').length;
    zm = lerp(STREET_DEPTHS[0], STREET_DEPTHS[1], Math.min(1, i / Math.max(1, n - 1)));
    side = i % 2 === 0 ? 1 : -1;
    const fy = ctx.project(0, zm).y;
    xm = roadCentre(ctx, fy) + side * (KERB + 1.5 + dm / 2);
    dy = 0;
    stood = { xm, zm };
  }
  const s = camera.focal / zm, roomAbove = Math.floor((camera.eye + 0.85 * ctx.hy / s) / SIZES.storey);
  storeys = Math.max(2, Math.min(storeys, roomAbove));
  const hgt = storeys * SIZES.storey, theta = street ? 0 : faceToward(ctx.sun.left ? -1 : 1, BUILDING_YAW);
  const F = frameAt(xm, zm, theta), P = painter(ctx, F, dy);
  const cos = Math.abs(Math.cos(theta)), sin = Math.abs(Math.sin(theta));
  if (st.dy === 0 && !street) ctx.shadow(xm, zm, { w: wm * cos + dm * sin, d: wm * sin + dm * cos }, hgt);
  else if (street) ctx.shadow(xm, zm, { w: wm, d: dm }, hgt);
  const tone = 0.3 + rand() * 0.4, warm = rand() * 0.12; // concrete grey, some of it warmer, some cooler
  const wall = inst.colour ?? [tone * (0.96 + warm), tone * (0.97 + warm * 0.5), tone * 1.05];
  const share = litShareOf(scene);
  const stepX = B.window.w * (1.9 + rand() * 1.1), glow = dim(ctx), c = [0, 0, 0], unlit = [0, 0, 0];
  mix(DARKWINDOW, ctx.L.horizon, scene.time === 'day' ? 0.35 : 0.1, unlit);
  const paint = (faceKey) => (a, b, k, out) => {
    const gx = ((a % stepX) + stepX) % stepX, gy = ((b % SIZES.storey) + SIZES.storey) % SIZES.storey;
    if (gy < 0.15) return ctx.lit(scaled(wall, 0.72, c), k, out); // the floor line
    if (gx > 0.45 && gx < 0.45 + B.window.w && gy > 0.9 && gy < 0.9 + B.window.h) {
      const lit = h2(Math.floor(a / stepX), Math.floor(b / SIZES.storey), seed + faceKey) < share;
      return lit && glow ? LITWINDOW : lit ? mix(LITWINDOW, unlit, 0.6, out) : ctx.lit(unlit, k, out);
    }
    return ctx.lit(wall, k, out);
  };
  const setback = storeys >= 14 && rand() < 0.5, split = setback ? Math.round(storeys * 0.65) * SIZES.storey : hgt;
  for (const [i, f] of boxFaces(-wm / 2, wm / 2, -dm / 2, dm / 2, 0, split).entries()) {
    if (f.n[2] > 0) continue; // the roof is never seen from the ground
    P.face(f.pts, f.n, f.ea, f.eb, paint(i));
  }
  if (setback) {
    for (const [i, f] of boxFaces(-wm * 0.33, wm * 0.33, -dm * 0.33, dm * 0.33, split, hgt).entries()) {
      if (f.n[2] > 0) continue;
      P.face(f.pts, f.n, f.ea, f.eb, paint(i + 5));
    }
  }
  if (storeys >= 14) { // an antenna, its warning light at night
    P.stroke([0, 0, hgt], [0, 0, hgt + 6], 0.3, ctx.lit(IRON, 0.6));
    if (glow) {
      const tip = P.point([0, 0, hgt + 6]);
      ctx.disc(tip.x, tip.y, Math.max(1, 0.4 * tip.scale), [1, 0.2, 0.15]);
    }
  }
  const box = P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

// ── The skyline ────────────────────

const CITY = /^(city|cities|skyline|cityscape|metropolis|downtown|urban)$/, TOWN = /^towns?$/;
/**
 * Whether the words ask for a city: the usual buildings or a city word; not a town's (the usual eleven, no
 * skyline behind them) nor a harbour's four.
 */
export function citySkyline(scene) {
  if (scene.family) return false;
  return (scene.instances ?? []).some((i) => {
    const ws = String(i.word ?? '').split(' ');
    if (i.kind !== 'buildings' || !(i.count > 0) || ws.some((w) => TOWN.test(w))) return false;
    return !!i.usual || ws.some((w) => CITY.test(w));
  });
}

const SKYLINE_ROWS = [ // two rows of silhouettes: the far one taller and hazier, the near one over it
  { share: 0.45, depth: 0.95, tall: [0.035, 0.13], tone: [0.30, 0.52] },
  { share: 0.55, depth: 0.85, tall: [0.045, 0.18], tone: [0.26, 0.46] },
];
const GLOW_SIGMA = 0.12; // the horizon glow's reach, as a share of the height
const GLOW_SHARE = { night: 0.5, sunset: 0.2 };
const UNDER_RIDGE = 0.012; // a silhouette's top keeps this share of the height under a named ridge over it

/**
 * Before the ground, when the words ask for a city: a warm glow over the horizon at night (the sky mixed toward
 * GLOW by exp(-((hy - y) / (0.12 H))^2) * 0.5, dusk at 0.2), then 25-40 adjoining silhouettes across the full width
 * in two rows (heights from fbm over their order, a landmark spike here and there, far to near, lit windows by the
 * time of day), then a row of street-lamp points at their feet when the lamps are lit. Under a named ridge of hills
 * or mountains (layout.ranges) each silhouette's top stays UNDER_RIDGE below the lowest ridge point over it, so the
 * hills asked for are not hidden (layout.skyline.under names the ridge). Everything is painted into the sky
 * snapshot too (ctx.sky), so the water and the wet pavement mirror it. Keyed on the sun's place, not ctx.rand: no
 * draw is spent, so every scene without a city paints exactly as before. layout.skyline says what was drawn.
 */
export function skylinePass(ctx) {
  const { W, H, hy, scene, layout, data, sky, scale, px } = ctx;
  if (!citySkyline(scene)) return;
  const key = 300 + ((ctx.sun.x * 997) | 0), night = scene.time === 'night';
  const lay = (x, y, col, a) => { // into the picture and into the sky the water reflects
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = px(x | 0, y | 0);
    data[i] = lerp(data[i], col[0], a);
    data[i + 1] = lerp(data[i + 1], col[1], a);
    data[i + 2] = lerp(data[i + 2], col[2], a);
    if (!sky) return;
    sky[i] = lerp(sky[i], col[0], a);
    sky[i + 1] = lerp(sky[i + 1], col[1], a);
    sky[i + 2] = lerp(sky[i + 2], col[2], a);
  };
  // low cloud throws a city's light back: from 0.6 cover (rain, overcast) the glow grows, to 1.8x as strong and
  // twice as high at a storm's 0.95, as a rainy city's sky is lit from below
  const back = clamp((scene.clouds - 0.6) / 0.35), sigma = GLOW_SIGMA * (1 + back);
  const glow = (GLOW_SHARE[scene.time] ?? 0) * (1 + 0.8 * back);
  if (glow > 0) {
    for (let y = Math.max(0, Math.floor(hy - 3 * sigma * H)); y < Math.min(H, Math.ceil(hy)); y++) {
      const a = Math.exp(-(((hy - y) / (sigma * H)) ** 2)) * glow;
      for (let x = 0; x < W; x++) lay(x, y, GLOW, a);
    }
  }
  const n = 25 + Math.floor(h2(0, 0, key) * 16), towers = [], share = litShareOf(scene), lit = dim(ctx);
  const haze = 0.55 + scene.fog * 0.6; // the air's thickness, as ctx.air has it
  const cw = Math.max(2, Math.round(3 * scale)), chh = Math.max(3, Math.round(4 * scale)); // the window cells
  const ww = Math.max(1, Math.round(scale)), wh = Math.max(1, Math.round(2 * scale)), win = [0, 0, 0];
  mix(LITWINDOW, ctx.L.horizon, 0.2, win);
  const glass = ctx.lit(mix(DARKWINDOW, ctx.L.horizon, 0.3), 0.6);
  const ranges = layout.ranges ?? [], ridgeAt = (x) => Math.min(hy, ...ranges.map((g) => g.top[x]));
  let under = null;
  let left = Math.floor(n * SKYLINE_ROWS[0].share);
  SKYLINE_ROWS.forEach((row, r) => {
    const count = r === 0 ? left : n - left, widths = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      widths.push(0.5 + h2(i, 1, key + r));
      sum += widths[i];
    }
    const depth = night ? Math.min(row.depth, 0.3 / haze) : row.depth; // never faded past 0.3 at night
    let x = -0.02 * W;
    for (let i = 0; i < count; i++) {
      const w = widths[i] / sum * 1.04 * W, u = fbm(i * 0.45 + r * 3.3, 0.5, key + 5 + r, 3);
      let tall = H * lerp(row.tall[0], row.tall[1], clamp((u - 0.3) * 2));
      if (h2(i, 2, key + r) > 0.88) tall = Math.min(tall * 1.5, 0.25 * H); // a landmark
      const x0 = Math.max(0, Math.floor(x)), x1 = Math.min(W - 1, Math.ceil(x + w) - 1);
      if (ranges.length) { // under the ridge: no taller than the lowest ridge point it spans, less a margin
        let low = 0;
        for (let xx = x0; xx <= x1; xx++) low = Math.max(low, ridgeAt(xx));
        if (tall > hy - low - UNDER_RIDGE * H) {
          tall = Math.max(2, hy - low - UNDER_RIDGE * H);
          under = ranges[ranges.length - 1].kind;
        }
      }
      const tone = lerp(row.tone[0], row.tone[1], h2(i, 3, key + r)), top = hy - tall;
      const wall = ctx.air(ctx.lit([tone, tone, tone * 1.06], 0.55 - r * 0.1), depth, [0, 0, 0]);
      const roof = ctx.air(ctx.lit([tone, tone, tone * 1.06], 0.8), depth, [0, 0, 0]);
      for (let yy = Math.max(0, Math.floor(top)); yy < Math.min(H, Math.ceil(hy)); yy++) {
        const edge = yy === Math.floor(top) ? Math.min(1, yy + 1 - top) : 1;
        for (let xx = x0; xx <= x1; xx++) {
          const cx = Math.floor((xx - x0) / cw), cy = Math.floor((hy - yy) / chh);
          const inWin = (xx - x0) % cw < ww && Math.floor(hy - yy) % chh < wh && cx > 0 && (xx - x0) < (x1 - x0) - 1;
          const on = inWin && h2(cx, cy, key + 11 + r * 50 + i) < share;
          if (on && lit) lay(xx, yy, win, edge * 0.9);
          else if (inWin && !lit && on) lay(xx, yy, glass, edge);
          else lay(xx, yy, yy === Math.floor(top) && !night ? roof : wall, edge);
        }
      }
      towers.push({ x: x0, y: top, w: x1 - x0 + 1, h: tall });
      x += w;
    }
    left = count;
  });
  let lamps = 0;
  if (lit) { // the street-level row of lamps at the silhouettes' feet
    for (let x = 2 * scale, j = 0; x < W; x += (5 + h2(j, 7, key) * 9) * scale, j++) {
      lay(x, hy - 1, LAMP, 0.85);
      if (scale >= 1.4) lay(x, hy - 2, LAMP, 0.4);
      lamps++;
    }
  }
  layout.skyline = { count: n, glow: glow > 0, lamps, towers, under };
}

// ── Rocks ──────────────────────────

/**
 * A mass of dark lumps `wPx` wide at (x0, fy), reaching `hPx` up: each lump an irregular polygon lit from the
 * sun's side and from above, with the rock's grain; where the scene is water the lumps spread back to the shore row
 * and foam breaks along the ones that meet it. Used by the rocks thing and under the lighthouse.
 */
function rockMass(ctx, x0, fy, wPx, hPx, key, colour, lumps) {
  const { W, hy, scene, poly, sun, lit, put, scale } = ctx, sx = sun.left ? -1 : 1, c = [0, 0, 0];
  const water = scene.ground === 'water' && !scene.frozen && typeof ctx.shoreAt === 'function';
  const ashore = water && fy >= hy && fy > ctx.shoreAt(x0); // on the near shore: the mass runs back to the water
  const shore = ashore ? ctx.shoreAt(x0) : fy, back = ashore ? Math.max(shore + scale, fy - hPx * 1.6) : fy - hPx * 0.4;
  const inWater = water && !ashore && fy >= hy; // standing in the water: the sea breaks about its foot
  const foamAt = (x, y) => put(x, y, FOAM, 0.7 * (0.6 + 0.4 * ctx.gloom));
  for (let j = 0; j < lumps; j++) {
    const t = h2(j, 1, key), cx = x0 + (t - 0.5) * wPx * 0.85, cy = lerp(fy, back, h2(j, 2, key) * 0.9);
    const depthK = Math.max(0.35, 1 - (fy - cy) / Math.max(1, fy - back) * 0.5); // the farther lumps smaller
    const rx = hPx * (0.35 + 0.4 * h2(j, 3, key)) * depthK, ry = rx * (0.6 + 0.35 * h2(j, 4, key));
    lump(ctx, cx, cy, rx, ry, key, j, colour);
    const x1 = Math.max(0, cx - rx) | 0, x2 = Math.min(W - 1, cx + rx);
    if (ashore && cy + 2 * scale >= shore - ry) { // foam along the lump where the water reaches it
      for (let x = x1; x <= x2; x++) {
        const sy = ctx.shoreAt(x);
        for (let k = -2; k <= 1; k++) {
          const yy = sy + k * scale;
          if (yy >= cy - ry && h2(x, yy | 0, 199) >= 0.45) foamAt(x, yy);
        }
      }
    } else if (inWater) { // the surf about a rock standing in the sea
      for (let x = x1; x <= x2; x++) {
        for (let k = -1; k <= 2; k++) if (h2(x, (cy + k * scale) | 0, 199) >= 0.4) foamAt(x, cy + k * scale);
      }
    }
  }
}

/**
 * One boulder: a rounded top, a flat foot at cy, its outline wandering slowly round; lit from the sun's side and
 * from above, the foot in shade, with the rock's grain and a few cracks.
 */
function lump(ctx, cx, cy, rx, ry, key, j, colour) {
  const { poly, sun, lit, scale } = ctx, sx = sun.left ? -1 : 1, c = [0, 0, 0], pts = [];
  for (let i = 0; i < 16; i++) {
    const th = (i / 16) * Math.PI * 2, rk = 0.82 + 0.36 * fbm(i * 0.4 + j * 7, key * 0.01, 197 + j, 2);
    pts.push(cx + Math.cos(th) * rx * rk, cy - Math.abs(Math.sin(th)) * ry * rk * (Math.sin(th) < 0 ? 1 : 0.25));
  }
  poly(pts, (x, y) => {
    const side = (x - cx) / rx, up = clamp((cy - y) / ry), d = Math.hypot(side, 1 - up);
    const grain = 0.82 + 0.36 * fbm(x / (5 * scale), y / (5 * scale), 198, 3);
    const crack = fbm(x / (3 * scale), y / (9 * scale), 196, 2) < 0.3 ? 0.7 : 1;
    const k = clamp(0.25 + 0.3 * side * sx + 0.55 * up + 0.2 * (1 - clamp(d)), 0.2, 1);
    return lit(scaled(colour, grain * crack, c), k, c);
  });
}

/**
 * The rocky point a lighthouse stands at the end of: lumps from the tower's foot down the tower's own column to
 * the shore row (a spit running out from the shore straight toward the viewer), each at its own depth, the lumps
 * lower and narrower toward the shore (a spit's foot is low rock; the near ones are big in pixels as it is),
 * drifting a little across, foam where the water meets them. Reports the pixels it covered to the painter's box.
 */
function headland(ctx, P, st, shoreRow, key) {
  const { W, H, put, scale, camera: { focal } } = ctx, Hd = STRUCTURES.lighthouse.headland;
  const n = Hd.lumps[0] + Math.floor(h2(1, 9, key) * (Hd.lumps[1] - Hd.lumps[0] + 1)), foam = [0, 0, 0];
  mix(FOAM, ctx.L.horizon, 0.2, foam);
  for (let j = 0; j < n; j++) { // far to near, so the nearer lump covers the farther
    const t = j / Math.max(1, n - 1), row = lerp(st.fy, shoreRow, t), zm = ctx.groundZ(row), s = focal / zm;
    const cx = st.x0 + (h2(j, 5, key) - 0.5) * Hd.drift * st.k * s;
    const rx = lerp(Hd.w[0], Hd.w[1], t) * (0.8 + 0.4 * h2(j, 6, key)) * st.k * s / 2;
    const ry = lerp(Hd.h[0], Hd.h[1], t) * (0.8 + 0.4 * h2(j, 7, key)) * st.k * s;
    lump(ctx, cx, row, rx, ry, key, j + 20, ROCK);
    P.seen(clamp(cx - rx, 0, W - 1), clamp(row - ry, 0, H - 1));
    P.seen(clamp(cx + rx, 0, W - 1), clamp(row + 1, 0, H - 1));
    for (const side of [-1, 1]) { // foam along its waterline
      for (let k = 0; k < 4; k++) {
        const x = cx + side * rx * (0.55 + 0.15 * k), y = row - h2(j, 30 + k, key) * 2 * scale;
        if (h2(x | 0, y | 0, 199) > 0.3) put(x, y, foam, 0.6 * (0.6 + 0.4 * ctx.gloom));
      }
    }
  }
}

/** Rocks, boulders or a cliff: a cluster of lumps on the ground, along the shore with a foam line when water. */
function drawRocks(ctx, inst) {
  const R = STRUCTURES.rocks, word = inst.instance?.word ?? inst.word ?? '', cliff = /cliff|crag/.test(word);
  const tall = R.h * (cliff ? R.cliff : 1), st = stance(ctx, inst, R.w), key = (ctx.rand() * 1e6) | 0;
  st.shadow(st.xm, st.zm, { w: R.w * st.k, d: R.d * st.k }, tall * 0.7 * st.k);
  const wPx = R.w * st.k * st.s, hPx = tall * st.k * st.s, lumps = 5 + Math.floor(ctx.rand() * 5);
  rockMass(ctx, st.x0, st.fy + st.dy, wPx, hPx, key, inst.colour ?? (cliff ? CLIFF : ROCK), lumps);
  return { x: st.x0 - wPx / 2, y: st.fy + st.dy - hPx * 1.2, w: wPx, h: hPx * 1.2 };
}

// ── The lighthouse ─────────────────

const OFF_SHORE = 0.12; // the lighthouse stands this share of the shore's band off the shore row, as the bridge does
const TOWER_TOP = 0.03; // the share of the height its lantern keeps under the frame's top

/**
 * A tapering white tower on a rock mass: one red band, a dark gallery with its rail, a glazed lantern under a dark
 * dome, lit with a two-stroke beam at night or in a storm (layout.lighthouse.beam says whether). On a shore it
 * stands just off the shore row, or as near as its height fits under the frame's top, at the end of a rocky point
 * running out from the shore (the box records where it stood); on the far bank, as it was placed.
 */
function drawLighthouse(ctx, inst) {
  const { W, H, hy, scene, scale, poly, line, disc, ellipse, lit, camera } = ctx, T = STRUCTURES.lighthouse;
  let st = stance(ctx, inst, T.rock.w), stood, shoreRow = null;
  const water = scene.ground === 'water' && !scene.frozen && typeof ctx.shoreAt === 'function';
  if (water && inst.fy >= hy) { // off the near shore: the deepest shore row under the rock's span
    let shore = 0;
    const half = T.rock.w * st.k * st.s / 2;
    for (let x = Math.max(0, st.x0 - half) | 0; x <= Math.min(W - 1, st.x0 + half); x++) {
      shore = Math.max(shore, ctx.shoreAt(x));
    }
    if (shore < H - 1) {
      const hgt = (T.h + T.lantern.h + T.lantern.dome + 1) * st.k;
      const zmFit = camera.focal * Math.max(0, hgt - camera.eye) / Math.max(1, hy - TOWER_TOP * H);
      const zm = Math.min(st.zm, Math.max(ctx.groundZ(shore - (shore - hy) * OFF_SHORE), zmFit));
      const fy = ctx.project(0, zm).y;
      if (fy > hy + 1 && zm !== st.zm) {
        const s = camera.focal / zm, wide = Math.min(T.rock.w * st.k * s / 2, W / 2), x0 = clamp(st.x0, wide, W - wide);
        st = { ...st, fy, zm, s, x0, xm: (x0 - W / 2) / s, dy: 0 };
        stood = { xm: st.xm, zm };
      }
      if (shore > st.fy + 2 * scale) shoreRow = shore;
    }
  }
  const F = frameAt(st.xm, st.zm, 0, st.k), P = painter(ctx, F, st.dy, st.k);
  const sx = P.sx, beam = scene.time === 'night' || !!scene.storm, key = (ctx.rand() * 1e6) | 0;
  st.shadow(st.xm, st.zm, { w: T.base * st.k, d: T.base * st.k }, (T.h + T.lantern.h) * st.k);
  if (shoreRow !== null) headland(ctx, P, st, shoreRow, key);
  rockMass(ctx, st.x0, st.fy + st.dy, T.rock.w * st.k * st.s, T.rock.h * st.k * st.s, key, ROCK, 6);
  const r0 = T.base / 2, r1 = T.top / 2, c = [0, 0, 0];
  const across = (a, b) => (a - r0) / lerp(r0, r1, clamp(b / T.h)); // -1 at the left edge, 1 at the right
  const shade = (a, b, k, out) => {
    const x = clamp(across(a, b), -1, 1), kk = clamp(0.35 + 0.5 * Math.sqrt(1 - x * x) + 0.3 * x * sx, 0.3, 1);
    if (b < 2.2 && Math.abs(x) < 0.14) return lit(DOOR, kk, out);
    if ((Math.abs(b - 9) < 0.5 || Math.abs(b - 20) < 0.5) && Math.abs(x) < 0.07) return lit(DARKWINDOW, kk, out);
    return lit(b > T.band[0] && b < T.band[1] ? RED_BAND : WHITE, kk, out);
  };
  const flat = { cull: false }, X = [1, 0, 0], UP = [0, 0, 1], N = [0, -1, 0]; // the tower's one face, square to us
  P.face([[-r0, 0, 0], [r0, 0, 0], [r1, 0, T.h], [-r1, 0, T.h]], N, X, UP, shade, flat);
  const g = r1 + T.rail, gy = T.h; // the gallery: a dark slab a rail's width proud of the tower, its rail over it
  P.face([[-g, 0, gy - 0.3], [g, 0, gy - 0.3], [g, 0, gy + 0.4], [-g, 0, gy + 0.4]], N, X, UP, IRON, flat);
  const rail = lit(IRON, 0.6);
  P.stroke([-g, 0, gy + 1.3], [g, 0, gy + 1.3], 0.08, rail);
  for (let u = -g + 0.3; u < g; u += 0.8) P.stroke([u, 0, gy + 0.4], [u, 0, gy + 1.3], 0.06, rail);
  const lr = T.lantern.d / 2, l0 = gy + 0.4, l1 = l0 + T.lantern.h;
  const lantern = (a, b, k, out) => {
    const mullion = ((a % 0.7) + 0.7) % 0.7 < 0.1 || b < l0 + 0.15 || b > l1 - 0.15;
    if (mullion) return lit(WHITE, k, out);
    return beam ? mix(BEAM, LAMPLIGHT, 0.5, out) : lit(mix(DARKWINDOW, ctx.L.horizon, 0.35, c), k * 1.1, out);
  };
  P.face([[-lr, 0, l0], [lr, 0, l0], [lr, 0, l1], [-lr, 0, l1]], N, X, UP, lantern, flat);
  const top = P.point([0, 0, l1]), s = top.scale * st.k;
  ellipse(top.x, top.y, (lr + 0.3) * s, T.lantern.dome * s, lit(IRON, 0.7), (x, y) => (y <= top.y ? 1 : 0));
  disc(top.x, top.y - T.lantern.dome * s, Math.max(1, 0.25 * s), lit(IRON, 0.8));
  P.seen(top.x, top.y - T.lantern.dome * s);
  if (beam) { // two strokes of the rotating light, one a little up, one a little down, fading along their reach
    const mid = P.point([0, 0, (l0 + l1) / 2]), reach = 0.34 * W, half = 0.04 * H;
    const strength = scene.storm ? 0.45 : 0.4;
    for (const [dir, tilt] of [[-1, -0.08], [1, 0.06]]) {
      const ex = mid.x + dir * reach, ey = mid.y + tilt * reach, len = Math.hypot(1, tilt);
      const nx = -tilt / len, ny = dir / len;
      poly([mid.x, mid.y, ex + nx * half, ey + ny * half, ex - nx * half, ey - ny * half], BEAM,
        (x) => strength * (1 - clamp((x - mid.x) * dir / reach)) ** 1.4, 3 * scale);
    }
    disc(mid.x, mid.y, Math.max(2, lr * 2.2 * s), BEAM, 0.35, Math.max(2, lr * 2 * s));
    line(mid.x - lr * s, mid.y, mid.x + lr * s, mid.y, 1, BEAM, 0.2);
  }
  ctx.layout.lighthouse = { beam, headland: shoreRow !== null };
  const box = P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

// ── The windmill ───────────────────

/** A smock mill: a tapering boarded body on a brick plinth, a rounded cap, four lattice sails, a tail pole. */
function drawWindmill(ctx, inst) {
  const { lit, rand, scene } = ctx, M = STRUCTURES.windmill, st = stance(ctx, inst, M.sail);
  const sx = ctx.sun.left ? -1 : 1, theta = faceToward(sx, 30 * DEG), F = frameAt(st.xm, st.zm, theta, st.k);
  const P = painter(ctx, F, st.dy, st.k), body = inst.colour ?? MILL, c = [0, 0, 0];
  st.shadow(st.xm, st.zm, { w: M.base * st.k, d: M.base * st.k }, M.tower * st.k);
  const hb = M.base / 2, ht = M.top / 2, capBase = M.tower - M.cap, axisH = capBase + 1.3;
  P.stroke([0, hb * 0.6, capBase + 0.5], [sx * 6, M.tailPole, 0], 0.25, lit(TIMBER, 0.6)); // the tail pole, behind
  const boards = (a, b, k, out) => {
    if (b < 1.5) return lit(scaled(BRICK, 0.9 + 0.2 * fbm(a * 3, b * 8, 201, 2), c), k, out); // the plinth
    const seam = ((b % 0.25) + 0.25) % 0.25 < 0.03;
    return lit(scaled(body, seam ? 0.75 : 0.95 + 0.1 * fbm(a, b * 2, 202, 2), c), k, out);
  };
  const frustum = [ // four tapering faces, the normals leaning up a little
    { pts: [[-hb, -hb, 0], [hb, -hb, 0], [ht, -ht, capBase], [-ht, -ht, capBase]], n: [0, -0.96, 0.27] },
    { pts: [[hb, hb, 0], [-hb, hb, 0], [-ht, ht, capBase], [ht, ht, capBase]], n: [0, 0.96, 0.27] },
    { pts: [[-hb, hb, 0], [-hb, -hb, 0], [-ht, -ht, capBase], [-ht, ht, capBase]], n: [-0.96, 0, 0.27] },
    { pts: [[hb, -hb, 0], [hb, hb, 0], [ht, ht, capBase], [ht, -ht, capBase]], n: [0.96, 0, 0.27] },
  ];
  for (const f of frustum) P.face(f.pts, f.n, [1, 0, 0], [0, 0, 1], boards);
  const cr = ht + 0.25;
  for (const f of boxFaces(-cr, cr, -cr, cr, capBase, capBase + M.cap * 0.55)) {
    if (f.n[2] > 0) continue;
    P.face(f.pts, f.n, f.ea, f.eb, scene.land === 'snow' ? SNOWROOF : SLATE);
  }
  const capTop = P.point([0, 0, capBase + M.cap * 0.55]), cs = capTop.scale * st.k;
  ctx.ellipse(capTop.x, capTop.y, cr * 1.05 * cs, M.cap * 0.5 * cs, lit(scene.land === 'snow' ? SNOWROOF : SLATE, 0.75),
    (x, y) => (y <= capTop.y ? 1 : 0));
  P.seen(capTop.x, capTop.y - M.cap * 0.5 * cs);
  const lean = M.lean * DEG, phi0 = rand() * Math.PI / 2, R = M.sail / 2, stock = lit(TIMBER, 0.7), cloth = [0, 0, 0];
  lit(SAIL, 0.8, cloth);
  const at = (r, w, phi) => { // a point r out along a sail and w across it, in the leaning sail plane before the cap
    const px = r * Math.cos(phi) - w * Math.sin(phi), ph = r * Math.sin(phi) + w * Math.cos(phi);
    return [px, -cr - 0.6 + ph * Math.sin(lean), axisH + ph * Math.cos(lean)];
  };
  for (let i = 0; i < 4; i++) {
    const phi = phi0 + i * Math.PI / 2;
    P.stroke(at(0.3, 0, phi), at(R, 0, phi), 0.3, stock);
    const q = [at(R * 0.2, 0.1, phi), at(R * 0.96, 0.1, phi), at(R * 0.96, M.sailWidth, phi),
      at(R * 0.2, M.sailWidth, phi)];
    const along = [Math.cos(phi), 0, Math.sin(phi)], across = [-Math.sin(phi), 0, Math.cos(phi)];
    P.face(q, [0, -Math.cos(lean), Math.sin(lean)], along, across,
      (a, b) => { // the lattice: bars every half metre along, three along the width; the cells open
        const bar = ((a % 0.6) + 0.6) % 0.6 < 0.07 || ((b % 0.65) + 0.65) % 0.65 < 0.07 || b > M.sailWidth - 0.06;
        return bar ? cloth : null;
      }, { cull: false });
  }
  const hub = P.point([0, -cr - 0.6, axisH]);
  ctx.disc(hub.x, hub.y, Math.max(1.5, 0.5 * hub.scale * st.k), lit(IRON, 0.6));
  return P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
}

// ── The castle ─────────────────────

/** The crenellated top of a wall `L` long: the points along it from a0 to a1 at height h with merlons of M. */
function battlements(a0, a1, h, M, pts, lay) {
  const period = M.w + M.gap;
  for (let a = a0; a < a1; a += period) {
    const m1 = Math.min(a1, a + M.w);
    pts.push(lay(a, h + M.h), lay(m1, h + M.h), lay(m1, h), lay(Math.min(a1, m1 + M.gap), h));
  }
}

/** The nearest hills' ridge in the layout: the row of its top per column, or null when no hills stand behind. */
function hillRidge(ctx) {
  const hills = (ctx.layout.ranges ?? []).filter((r) => r.kind === 'hills');
  return hills.length ? hills[hills.length - 1].top : null;
}

/**
 * A curtain wall with battlements and a gate arch between two round towers, a square keep behind the middle; when
 * hills stand behind, on the nearest ridge (its foot on the ridge row, its depth chosen so it reads a fifth of the
 * frame tall; the box records where it stood), else on the ground where it was placed. Stone by fbm with mortar
 * courses; the towers shaded round.
 */
function drawCastle(ctx, inst) {
  const { W, H, hy, lit } = ctx, K = STRUCTURES.castle, Wl = K.wall, Tw = K.tower, Kp = K.keep, M = K.merlon;
  const wide = Wl.L + Tw.d, ridge = hillRidge(ctx);
  let st = stance(ctx, inst, wide), stood;
  if (ridge && inst.fy >= hy) { // onto the ridge: a far thing drawn at a readable size, its foot on the ridge row
    const hm = Kp.h * st.k, zm = clamp(hm * ctx.camera.focal / (H * 0.2), 60, 2000), s = ctx.camera.focal / zm;
    const half = Math.min(wide * st.k * s / 2, W / 2), x0 = clamp(inst.ux * W, half, W - half);
    let foot = 0;
    for (let x = Math.max(0, x0 - half) | 0; x <= Math.min(W - 1, x0 + half); x++) foot = Math.max(foot, ridge[x]);
    const xm = (x0 - W / 2) / s;
    st = { ...st, x0, zm, s, xm, fy: foot + 2, dy: foot + 2 - ctx.project(xm, zm).y, shadow: () => {} };
    stood = { xm, zm };
  }
  const sx = ctx.sun.left ? -1 : 1, theta = faceToward(sx, 15 * DEG), F = frameAt(st.xm, st.zm, theta, st.k);
  const P = painter(ctx, F, st.dy, st.k), c = [0, 0, 0], colour = inst.colour ?? STONE;
  st.shadow(st.xm, st.zm, { w: wide * st.k, d: (Kp.w + 20) * st.k }, Tw.h * st.k);
  const stone = (a, b, k, out) => {
    const course = ((b % 0.8) + 0.8) % 0.8 < 0.06, block = fbm(a * 1.5, b * 3, 203, 2);
    return lit(scaled(colour, (course ? 0.78 : 0.88 + 0.26 * block), c), k, out);
  };
  const hwall = Wl.L / 2, kv = Wl.t / 2 + Kp.w / 2 + 4;
  for (const f of boxFaces(-Kp.w / 2, Kp.w / 2, kv - Kp.w / 2, kv + Kp.w / 2, 0, Kp.h)) { // the keep, behind
    if (f.n[2] > 0) continue;
    const p = f.pts.slice(0, 2), top = [];
    battlements(0, Kp.w, Kp.h, M, top, (a, h) => [p[0][0] + (p[1][0] - p[0][0]) * a / Kp.w,
      p[0][1] + (p[1][1] - p[0][1]) * a / Kp.w, h]);
    P.face([p[0], p[1], ...top.reverse()], f.n, f.ea, f.eb, stone);
  }
  for (const s2 of [-1, 1]) { // the two corner turrets of the keep that face us
    const tu = s2 * (Kp.w / 2 - 1), tv = kv - Kp.w / 2 + 1;
    for (const f of boxFaces(tu - 1.5, tu + 1.5, tv - 1.5, tv + 1.5, Kp.h - 2, Kp.h + 3)) {
      if (f.n[2] > 0) continue;
      P.face(f.pts, f.n, f.ea, f.eb, stone);
    }
  }
  const gate = (a, b, k, out) => { // the curtain wall's face: the gate arch in its middle
    const da = Math.abs(a - Wl.L / 2), gw = K.gate.w / 2;
    if (da < gw && b < K.gate.h - (da / gw) ** 2 * gw) return lit(IRON, k * 0.6, out);
    return stone(a, b, k, out);
  };
  const wallPts = [[-hwall, -Wl.t / 2, 0], [hwall, -Wl.t / 2, 0]], top = [];
  battlements(0, Wl.L, Wl.h, M, top, (a, h) => [-hwall + a, -Wl.t / 2, h]);
  P.face([...wallPts, ...top.reverse()], [0, -1, 0], [1, 0, 0], [0, 0, 1], gate);
  for (const s2 of [-1, 1]) { // the round towers: a shaded quad for the drum, battlements on top
    const cu = s2 * hwall, r = Tw.d / 2, drum = [[cu - r, 0, 0], [cu + r, 0, 0]], tt = [];
    battlements(0, 2 * r, Tw.h, M, tt, (a, h) => [cu - r + a, 0, h]);
    P.face([...drum, ...tt.reverse()], [0, -1, 0], [1, 0, 0], [0, 0, 1], (a, b, k, out) => {
      const x = clamp((a - r) / r, -1, 1), kk = clamp(0.35 + 0.5 * Math.sqrt(1 - x * x) + 0.3 * x * sx, 0.3, 1);
      if (Math.abs(x) < 0.05 && ((b % 6) + 6) % 6 > 2.5 && ((b % 6) + 6) % 6 < 4) return lit(IRON, 0.5, out); // slits
      return stone(a, b, kk, out);
    }, { cull: false });
  }
  const box = P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

// ── The church ─────────────────────

/** A pointed window: inside the rect, under the arch of its top. */
const pointed = (da, hw, b, b0, b1) => Math.abs(da) < hw && b > b0 && b < b1 - (Math.abs(da) / hw) ** 2 * hw;

/** A nave with pointed windows under a steep slate roof, a square west tower with its belfry, a spire, a cross. */
function drawChurch(ctx, inst) {
  const { scene, lit } = ctx, word = inst.instance?.word ?? inst.word ?? '';
  const S = /chapel/.test(word) ? STRUCTURES.chapel : STRUCTURES.church, c = [0, 0, 0];
  const yaw = 30 * DEG, wide = S.tower * Math.cos(yaw) + (S.L + S.tower) * Math.sin(yaw) + S.D;
  const st = stance(ctx, inst, wide), sx = ctx.sun.left ? -1 : 1, theta = frontToward(sx, yaw);
  const F = frameAt(st.xm, st.zm, theta, st.k), P = painter(ctx, F, st.dy, st.k), colour = inst.colour ?? HONEY;
  const cos = Math.abs(Math.cos(theta)), sin = Math.abs(Math.sin(theta)), Lall = S.L + S.tower;
  st.shadow(st.xm, st.zm, { w: (Lall * cos + S.D * sin) * st.k, d: (Lall * sin + S.D * cos) * st.k }, S.towerH * st.k);
  const stone = (a, b, k, out) => {
    const course = ((b % 0.6) + 0.6) % 0.6 < 0.05;
    return lit(scaled(colour, course ? 0.8 : 0.9 + 0.2 * fbm(a * 2, b * 2, 204, 2), c), k, out);
  };
  const night = dim(ctx);
  const glass = (on) => (on ? mix(LAMPLIGHT, GLASS, 0.4, c) : lit(mix(GLASS, ctx.L.horizon, 0.3, c), 0.9));
  const naveWall = (a, b, k, out) => {
    const pitch = 4, i = Math.round((a - 2) / pitch), da = a - 2 - i * pitch;
    if (i >= 0 && i * pitch + 2 < S.L - 1 && pointed(da, 0.6, b, 2, 5.5)) return glass(night && h2(i, 1, 205) < 0.7);
    return stone(a, b, k, out);
  };
  const faces = gableFaces(S.L, S.D, S.wall, S.rise, 0.4), snowy = scene.land === 'snow';
  const roof = (a, b, k, out) => (snowy ? lit(SNOWROOF, 0.6 + 0.4 * k, out)
    : lit(scaled(SLATE, ((b % 0.5) + 0.5) % 0.5 < 0.05 ? 0.8 : 0.95 + 0.1 * fbm(a, b, 206, 2), c), k, out));
  for (const f of [faces.back, faces.left, faces.right]) P.face(f.pts, f.n, f.ea, f.eb, naveWall);
  P.face(faces.front.pts, faces.front.n, faces.front.ea, faces.front.eb, stone);
  for (const f of [faces.roofL, faces.roofR]) P.face(f.pts, f.n, f.ea, f.eb, roof);
  const tu = -S.L / 2 - S.tower / 2 + 1, ht = S.tower / 2; // the tower at the west end, overlapping the nave by a metre
  const towerWall = (a, b, k, out) => {
    const da = a - ht;
    if (pointed(da, 0.9, b, 0, 3.2)) return lit(DOOR, k * 0.8, out); // the west door (every face: one shows)
    if (pointed(da, 0.55, b, S.towerH * 0.7, S.towerH * 0.88)) { // the belfry louvres
      return ((b % 0.3) + 0.3) % 0.3 < 0.12 ? lit(IRON, k, out) : lit(scaled(colour, 0.6, c), k, out);
    }
    return stone(a, b, k, out);
  };
  for (const f of boxFaces(tu - ht, tu + ht, -ht, ht, 0, S.towerH)) {
    if (f.n[2] > 0) continue;
    P.face(f.pts, f.n, f.ea, f.eb, towerWall);
  }
  const apex = [tu, 0, S.towerH + S.spire];
  const sides = [ // each spire face: its two base corners and its outward lean
    [-ht, -ht, ht, -ht, 0, -1], [ht, -ht, ht, ht, 1, 0], [ht, ht, -ht, ht, 0, 1], [-ht, ht, -ht, -ht, -1, 0],
  ];
  const nz = S.spire / Math.hypot(S.spire, ht), nh = ht / Math.hypot(S.spire, ht);
  for (const [u0, v0, u1, v1, nu, nv] of sides) {
    P.face([[tu + u0, v0, S.towerH], [tu + u1, v1, S.towerH], apex], [nu * nz, nv * nz, nh], [1, 0, 0], [0, 0, 1],
      snowy ? SNOWROOF : SLATE);
  }
  const cross = lit(IRON, 0.6);
  P.stroke(apex, [tu, 0, S.towerH + S.spire + 1.6], 0.15, cross);
  P.stroke([tu - 0.5, 0, S.towerH + S.spire + 1.1], [tu + 0.5, 0, S.towerH + S.spire + 1.1], 0.15, cross);
  return P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
}

// ── The bridge ─────────────────────

/**
 * A stone arch bridge seen from the side: a segmental arch between two abutments, its ring of voussoirs, a humped
 * deck and parapet; standing in the water band of a river (its foot held between the far bank and the shore) or of
 * a lake or sea, so reflectPass mirrors it; on land, where it was placed.
 */
function drawBridge(ctx, inst) {
  const { hy, scene, lit } = ctx, Bg = STRUCTURES.bridge, half = Bg.span / 2 + Bg.abutment;
  let st = stance(ctx, inst, half * 2), stood;
  if (scene.ground === 'water' && !scene.frozen && ctx.shoreAt && inst.fy >= hy) { // into the water: a river's band,
    const shore = ctx.shoreAt(st.x0), far = scene.river && ctx.farAt ? ctx.farAt(st.x0) : hy; // else just off the shore
    const fy = scene.river ? clamp(st.fy, far + (shore - far) * 0.3, shore - (shore - far) * 0.2)
      : Math.min(st.fy, shore - (shore - hy) * 0.12);
    if (fy !== st.fy) {
      const zm = ctx.groundZ(fy), s = ctx.camera.focal / zm, xm = (st.x0 - ctx.W / 2) / s;
      st = { ...st, fy, zm, s, xm, dy: 0 };
      stood = { xm, zm };
    }
  }
  const F = frameAt(st.xm, st.zm, 0, st.k), P = painter(ctx, F, st.dy, st.k), c = [0, 0, 0];
  const colour = inst.colour ?? STONE, tall = Bg.springing + Bg.rise;
  if (scene.ground !== 'water') st.shadow(st.xm, st.zm, { w: half * 2 * st.k, d: 5 * st.k }, tall * st.k);
  const R = (Bg.span * Bg.span / 4 + Bg.rise * Bg.rise) / (2 * Bg.rise), cy = tall - R; // the arc's radius and centre
  const deckAt = (x) => Bg.springing + Bg.rise + Bg.ring + Bg.deck - 0.6 * (x / half) ** 2; // the hump
  const outline = [[-half, 0, 0]];
  for (let i = 0; i <= 10; i++) outline.push([-half + (2 * half * i) / 10, 0, deckAt(-half + (2 * half * i) / 10)]);
  outline.push([half, 0, 0], [Bg.span / 2, 0, 0]);
  const a0 = Math.atan2(Bg.springing - cy, Bg.span / 2), a1 = Math.PI - a0;
  for (let i = 0; i <= 16; i++) {
    const t = a0 + (a1 - a0) * (i / 16);
    outline.push([Math.cos(t) * R, 0, cy + Math.sin(t) * R]);
  }
  outline.push([-Bg.span / 2, 0, 0]);
  const stone = (a, b, k, out) => {
    const x = a - half, d = Math.hypot(x, b - cy), ring = d >= R && d < R + Bg.ring && b > Bg.springing - 0.2;
    const course = ((b % 0.5) + 0.5) % 0.5 < 0.05;
    const tone = ring ? 1.1 : course ? 0.78 : 0.88 + 0.22 * fbm(a * 2, b * 3, 207, 2);
    return lit(scaled(colour, tone, c), k, out);
  };
  P.face(outline, [0, -1, 0], [1, 0, 0], [0, 0, 1], stone, { cull: false });
  const parapet = [], xAt = (i) => -half + (2 * half * i) / 10;
  for (let i = 0; i <= 10; i++) parapet.push([xAt(i), -0.2, deckAt(xAt(i)) + Bg.parapet]);
  for (let i = 10; i >= 0; i--) parapet.push([xAt(i), -0.2, deckAt(xAt(i))]);
  const coping = (a, b, k, out) => lit(scaled(colour, 0.82 + 0.2 * fbm(a * 3, b * 6, 208, 2), c), k, out);
  P.face(parapet, [0, -1, 0], [1, 0, 0], [0, 0, 1], coping, { cull: false });
  const box = P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

// ── The tent and the campfire ──────

/** A pool of light on the ground: an ellipse rx by ry about (cx, cy), its alpha a Gaussian falling to the rim. */
function groundGlow(ctx, cx, cy, rx, ry, colour, strength) {
  const ryy = Math.max(1, ry);
  const fall = (x, y) => strength * Math.exp(-3 * (((x - cx) / rx) ** 2 + ((y - cy) / ryy) ** 2));
  ctx.ellipse(cx, cy, rx, ryy, colour, fall);
}

/** A ridge tent: two sloping faces and a door end, guy lines to pegs, the cloth glowing from inside at night. */
function drawTent(ctx, inst) {
  const { rand, lit } = ctx, T = STRUCTURES.tent, st = stance(ctx, inst, T.L + 2 * T.guy);
  const sx = ctx.sun.left ? -1 : 1, theta = frontToward(sx, 35 * DEG), F = frameAt(st.xm, st.zm, theta, st.k);
  const P = painter(ctx, F, st.dy, st.k), cloth = inst.colour ?? TENT_CLOTH[Math.floor(rand() * TENT_CLOTH.length)];
  const glow = dim(ctx), c = [0, 0, 0], hw = T.W / 2, hl = T.L / 2;
  st.shadow(st.xm, st.zm, { w: T.L * st.k, d: T.W * st.k }, T.h * st.k);
  if (glow) { // the ground lit by the lamp inside
    const foot = P.point([0, 0, 0]), ahead = P.point([0, -2.5, 0]), back = P.point([0, 2.5, 0]);
    groundGlow(ctx, foot.x, foot.y, 2.5 * foot.scale * st.k, (ahead.y - back.y) / 2, [1, 0.7, 0.4], 0.22);
  }
  const paint = (door) => (a, b, k, out) => {
    const seam = ((a % 0.5) + 0.5) % 0.5 < 0.02;
    if (door && Math.abs(a) < 0.03 && b < T.h * 0.85) return lit(scaled(cloth, 0.5, c), k, out); // the zip
    const col = scaled(cloth, seam ? 0.85 : 1, c);
    return glow ? mix(lit(col, k, out), LAMPLIGHT, 0.45, out) : lit(col, k, out);
  };
  const slope = Math.hypot(hw, T.h);
  P.face([[-hl, -hw, 0], [-hl, hw, 0], [-hl, 0, T.h]], [-1, 0, 0], [0, 1, 0], [0, 0, 1], paint(true)); // the door end
  P.face([[hl, hw, 0], [hl, -hw, 0], [hl, 0, T.h]], [1, 0, 0], [0, -1, 0], [0, 0, 1], paint(false));
  P.face([[-hl, -hw, 0], [hl, -hw, 0], [hl, 0, T.h], [-hl, 0, T.h]], [0, -T.h / slope, hw / slope], [1, 0, 0],
    [0, hw / slope, T.h / slope], paint(false));
  P.face([[hl, hw, 0], [-hl, hw, 0], [-hl, 0, T.h], [hl, 0, T.h]], [0, T.h / slope, hw / slope], [-1, 0, 0],
    [0, -hw / slope, T.h / slope], paint(false));
  const guy = lit([0.8, 0.8, 0.75], 0.7);
  for (const e of [-1, 1]) P.stroke([e * hl, 0, T.h], [e * (hl + T.guy), 0, 0], 0.01, guy, 0.8);
  return P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
}

/** A campfire: a ring of stones, crossed logs, a flame; the ground glowing and sparks at night, smoke by day. */
function drawCampfire(ctx, inst) {
  const { W, H, rand, lit, put, disc, poly, line, scale } = ctx, Cf = STRUCTURES.campfire;
  const st = stance(ctx, inst, Cf.ring), F = frameAt(st.xm, st.zm, 0, st.k), P = painter(ctx, F, st.dy, st.k);
  const foot = P.point([0, 0, 0]), s = foot.scale * st.k, night = dim(ctx), c = [0, 0, 0];
  const ry = Math.max(1, (P.point([0, -Cf.ring / 2, 0]).y - P.point([0, Cf.ring / 2, 0]).y) / 2), rx = Cf.ring / 2 * s;
  if (night) { // the ground lit to four metres
    const reach = (P.point([0, -Cf.glow, 0]).y - P.point([0, Cf.glow, 0]).y) / 2;
    groundGlow(ctx, foot.x, foot.y, Cf.glow * s, reach, EMBER, 0.4);
  }
  st.shadow(st.xm, st.zm, { w: Cf.ring * st.k, d: Cf.ring * st.k }, Cf.logs * st.k);
  for (let i = 0; i < 10; i++) { // the stones
    const th = (i / 10) * Math.PI * 2 + rand() * 0.3, r = Math.max(1, 0.12 * s);
    disc(foot.x + Math.cos(th) * rx, foot.y + Math.sin(th) * ry, r, lit(STONE_RING, 0.5 + 0.4 * h2(i, 1, 209)));
  }
  const logC = lit(DOOR, 0.5);
  for (let i = 0; i < 3; i++) {
    const th = i * 1.1 + 0.3, l = 0.5 * s;
    line(foot.x - Math.cos(th) * l / 2, foot.y - Math.sin(th) * l * 0.4 - 0.1 * s, foot.x + Math.cos(th) * l / 2,
      foot.y + Math.sin(th) * l * 0.4 - 0.1 * s, Math.max(1, 0.12 * s), logC);
  }
  const fh = Cf.flame * s, fw = 0.35 * s, base = foot.y - 0.15 * s, pts = [], key = (rand() * 1e6) | 0;
  for (let i = 0; i <= 12; i++) { // a teardrop whose edge flickers
    const t = i / 12, th = Math.PI * t, wob = 1 + (fbm(t * 4, key * 0.001, 210, 2) - 0.5) * 0.6;
    const lick = th < Math.PI / 2 ? 1 : 0.4; // the far side of the teardrop lower: a flame leans
    pts.push(foot.x - Math.cos(th) * fw * Math.sin(th) ** 0.5 * wob, base - Math.sin(th) ** 0.7 * fh * lick);
  }
  poly(pts, (x, y) => {
    const up = clamp((base - y) / fh);
    return up < 0.5 ? mix(FLAME[0], FLAME[1], up * 2, c) : mix(FLAME[1], FLAME[2], (up - 0.5) * 2, c);
  }, (x, y) => 0.95 - 0.5 * clamp((base - y) / fh), 2);
  disc(foot.x, base - fh * 0.25, fh * 0.5, FLAME[1], 0.25, fh * 0.6); // the glow about the flame
  if (night) {
    for (let i = 0; i < 14; i++) {
      const sx2 = foot.x + (h2(i, 2, key) - 0.5) * fw * 4, sy = base - fh * (0.5 + h2(i, 3, key) * 2.5);
      put(sx2, sy, SPARK, 0.9);
      if (scale > 1.2) put(sx2 + 1, sy, SPARK, 0.5);
    }
  } else { // the smoke column, drifting
    const drift = (h2(1, 1, key) - 0.5) * 0.6, tall = Cf.smoke * s;
    for (let i = 0; i < 10; i++) {
      const t = (i + 0.5) / 10, cx = foot.x + drift * tall * t * t, cy = base - fh * 0.6 - tall * t;
      disc(cx, cy, Math.max(1.5, (0.15 + 0.5 * t) * s), SMOKE, 0.22 * (1 - t * 0.7), Math.max(2, 0.3 * s * (1 + t)));
    }
  }
  P.seen(foot.x - fw * 2, base - fh * 3);
  P.seen(foot.x + fw * 2, foot.y + ry);
  const box = P.box();
  return box ? { x: Math.max(0, box.x), y: Math.max(0, box.y), w: Math.min(W, box.w), h: Math.min(H, box.h) }
    : { x: st.x0, y: st.fy, w: 1, h: 1 };
}

// ── Fence, lamps, poles, bench ─────

/** A post-and-rail fence: posts every 1.8 m along a 12 m run, three rails, each post with its shadow. */
function drawFence(ctx, inst) {
  const { lit, scene } = ctx, Fn = STRUCTURES.fence;
  let st = stance(ctx, inst, Fn.run), stood;
  if (scene.road && st.dy === 0) { // along the verge, not across the carriageway
    st = kerbSide(ctx, st, st.xm < roadCentre(ctx, st.fy) ? -1 : 1, 0.3);
    stood = { xm: st.xm, zm: st.zm };
  }
  const F = frameAt(st.xm, st.zm, stood ? Math.PI / 2 : 0, st.k), P = painter(ctx, F, st.dy, st.k);
  const timber = lit(TIMBER, 0.75);
  const n = Math.floor(Fn.run / Fn.spacing) + 1, u0 = -Fn.run / 2;
  for (let i = 0; i < n; i++) {
    const u = u0 + i * Fn.spacing;
    const [px, , pz] = F.to([u, 0, 0]);
    if (st.dy === 0 && pz > NEAR) ctx.shadow(px, pz, { w: Fn.post * st.k, d: Fn.post * st.k }, Fn.h * st.k);
  }
  for (let r = 1; r <= Fn.rails; r++) {
    const h = Fn.h * r / Fn.rails - Fn.rail / 2;
    P.stroke([u0, 0, h], [u0 + (n - 1) * Fn.spacing, 0, h], Fn.rail, lit(TIMBER, 0.65));
  }
  for (let i = 0; i < n; i++) {
    P.stroke([u0 + i * Fn.spacing, 0, 0], [u0 + i * Fn.spacing, 0, Fn.h + 0.05], Fn.post, timber);
  }
  const box = P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

/** Where a thing along a road stands: at the kerb, on `side` of the road's drifted centre at its row. */
function kerbSide(ctx, st, side, inset) {
  const centre = roadCentre(ctx, st.fy), xm = centre + side * (KERB + inset), x0 = ctx.project(xm, st.zm).x;
  return { ...st, xm, x0 };
}

/**
 * A street lamp: a tapering column with a single arm and a flat lantern, lit when the light is low with a halo and
 * a pool of light on the ground; along a road it stands at the kerb, the lamps alternating sides in the order they
 * are drawn.
 */
function drawStreetlamp(ctx, inst) {
  const { scene, lit, W } = ctx, Sl = STRUCTURES.streetlamp, on = dim(ctx);
  let st = stance(ctx, inst, 0), stood;
  const drawn = ctx.layout.things.filter((t) => t.kind === 'streetlamp').length, side = drawn % 2 === 0 ? 1 : -1;
  if (scene.road && st.dy === 0) {
    st = kerbSide(ctx, st, side, 0.5);
    stood = { xm: st.xm, zm: st.zm };
  }
  const F = frameAt(st.xm, st.zm, 0, st.k), P = painter(ctx, F, st.dy, st.k), arm = scene.road ? -side : -P.sx;
  st.shadow(st.xm, st.zm, { w: Sl.base * st.k, d: Sl.base * st.k }, Sl.h * st.k);
  const head = [arm * Sl.arm, 0, Sl.h + 0.1], ground = P.point([arm * Sl.arm, 0, 0]), hp = P.point(head);
  if (on) { // the pool of light on the ground, then the halo
    const r = Sl.pool * st.k, far = P.point([arm * Sl.arm, r, 0]), near = P.point([arm * Sl.arm, -r, 0]);
    groundGlow(ctx, ground.x, ground.y, r * ground.scale * st.k, (near.y - far.y) / 2, LAMP, 0.2);
  }
  const column = lit(COLUMN, 0.7);
  P.stroke([0, 0, 0], [0, 0, Sl.h * 0.5], Sl.base, column);
  P.stroke([0, 0, Sl.h * 0.5], [0, 0, Sl.h], (Sl.base + Sl.top) / 2, column);
  P.stroke([0, 0, Sl.h], head, Sl.top, column);
  const ls = hp.scale * st.k;
  ctx.rect(hp.x - Sl.lantern.l / 2 * ls, hp.y - Sl.lantern.t * ls, Sl.lantern.l * ls, Math.max(1, Sl.lantern.t * ls),
    on ? LAMP : lit(IRON, 0.7));
  if (on) ctx.disc(hp.x, hp.y, Math.max(2, 0.9 * ls), LAMP, 0.45, Math.max(2, 0.9 * ls));
  P.seen(hp.x - ls, hp.y - ls);
  const box = P.box() ?? { x: Math.min(W - 1, st.x0), y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

/**
 * A telegraph pole with a crossarm and its wires back to the last pole drawn (layout.things, farther along: the
 * painter's order runs far to near), sagging between them; along a road, on the right kerb.
 */
function drawPole(ctx, inst) {
  const { scene, lit } = ctx, Pl = STRUCTURES.pole;
  let st = stance(ctx, inst, 0), stood;
  if (scene.road && st.dy === 0) {
    st = kerbSide(ctx, st, 1, 0.4);
    stood = { xm: st.xm, zm: st.zm };
  }
  const F = frameAt(st.xm, st.zm, 0, st.k), P = painter(ctx, F, st.dy, st.k), wood = lit(POLE, 0.65);
  st.shadow(st.xm, st.zm, { w: Pl.base * st.k, d: Pl.base * st.k }, Pl.h * st.k);
  P.stroke([0, 0, 0], [0, 0, Pl.h], (Pl.base + Pl.top) / 2, wood);
  P.stroke([-Pl.arm / 2, 0, Pl.h - 0.4], [Pl.arm / 2, 0, Pl.h - 0.4], 0.1, wood);
  const prev = ctx.layout.things.filter((t) => t.kind === 'pole').pop();
  if (prev && st.dy === 0) {
    const from = prev.stood ?? { xm: prev.xm, zm: prev.zm }, wire = lit(WIRE, 0.5), spread = Pl.arm / 2;
    for (let w = 0; w < Pl.wires; w++) {
      const off = (-1 + (2 * w) / (Pl.wires - 1)) * spread, h = Pl.h - 0.4 + (w % 2 === 0 ? 0 : -0.3);
      let last = null;
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, x = lerp(st.xm + off * st.k, from.xm + off * st.k, t), z = lerp(st.zm, from.zm, t);
        const hh = h * st.k - Pl.sag * 4 * t * (1 - t);
        const p = ctx.project(x, Math.max(NEAR, z), hh);
        if (last) ctx.line(last.x, last.y, p.x, p.y, Math.max(0.6, 0.03 * p.scale), wire, 0.85);
        last = p;
      }
    }
  }
  const box = P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

/** A park bench: slatted seat and back on two cast ends, in three-quarter view. */
function drawBench(ctx, inst) {
  const { lit, scene } = ctx, Bn = STRUCTURES.bench, sx = ctx.sun.left ? -1 : 1;
  let st = stance(ctx, inst, Bn.L), stood, theta = faceToward(sx, 30 * DEG);
  if (scene.road && st.dy === 0) { // on the pavement, turned to the road
    const side = st.xm < roadCentre(ctx, st.fy) ? -1 : 1;
    st = kerbSide(ctx, st, side, 0.6);
    stood = { xm: st.xm, zm: st.zm };
    theta = -side * (Math.PI / 2 - 0.5);
  }
  const F = frameAt(st.xm, st.zm, theta, st.k);
  const P = painter(ctx, F, st.dy, st.k), hl = Bn.L / 2, hd = Bn.depth / 2, slat = inst.colour ?? TIMBER;
  st.shadow(st.xm, st.zm, { w: Bn.L * st.k, d: Bn.depth * st.k }, Bn.back * st.k);
  const gap = Bn.depth / Bn.slats;
  const slats = (a, b, k, out) => (((b % gap) + gap) % gap < gap * 0.22 ? null : lit(slat, k, out));
  for (const e of [-1, 1]) { // the cast ends
    for (const f of boxFaces(e * hl - 0.03, e * hl + 0.03, -hd, hd, 0, Bn.back)) {
      if (f.n[2] > 0) continue;
      P.face(f.pts, f.n, f.ea, f.eb, BENCH_GREEN);
    }
  }
  const seat = boxFaces(-hl, hl, -hd, hd, Bn.seat - 0.04, Bn.seat);
  P.face(seat[4].pts, seat[4].n, seat[4].ea, seat[4].eb, slats); // the top, seen from the standing eye
  P.face(seat[0].pts, seat[0].n, seat[0].ea, seat[0].eb, slat);
  const back = [[-hl, hd - 0.02, Bn.seat + 0.08], [hl, hd - 0.02, Bn.seat + 0.08], [hl, hd + 0.08, Bn.back],
    [-hl, hd + 0.08, Bn.back]];
  P.face(back, [0, -0.99, 0.12], [1, 0, 0], [0, 0.12, 0.99], (a, b, k, out) => (((b % 0.14) + 0.14) % 0.14 < 0.04 ? null
    : lit(slat, k, out)), { cull: false });
  const box = P.box() ?? { x: st.x0, y: st.fy, w: 1, h: 1 };
  return stood ? { ...box, stood } : box;
}

// ── The registry ───────────────────

/** The words the old THINGS rows read houses and buildings by, kept whole (read.mjs's rows moved here). */
export const HOUSE_WORDS_RE =
  /^(houses?|cabins?|cottages?|barns?|huts?|homes?|lodges?|chalets?|village|villages|hamlet|hamlets)$/;
export const BUILDING_WORDS_RE =
  /^(buildings?|city|cities|towns?|skyline|skyscrapers?|towers?|cityscape|metropolis|downtown|urban)$/;

/** The building row of things.mjs's drawers list: its place in the registry's order is kept there. */
export const BUILDING_THING = {
  id: 'building', word: 'buildings', match: BUILDING_WORDS_RE, usual: 11, band: [0.01, 0.05], depth: [150, 700],
  size: { w: SIZES.building.w[1], h: SIZES.building.storeys[1] * SIZES.storey, d: SIZES.building.w[1] * 0.8 },
  draw: drawBuilding,
};
/** The house row of things.mjs's drawers list: the cabin's envelope (see the file header). */
export const HOUSE_THING = {
  id: 'house', word: 'houses', match: HOUSE_WORDS_RE, usual: 3, band: [0.06, 0.3], depth: [25, 130],
  size: { w: C.w * 1.12, h: C.wall + C.rise, d: C.d }, draw: drawHouse,
};

const S = STRUCTURES;
/** The new kinds: each read by its words, keyed by its id in scene.things, sized in metres for the placement. */
export const STRUCTURE_THINGS = [
  { id: 'lighthouse', match: /^lighthouses?$/, usual: 1, band: null, depth: [60, 400], onWater: true,
    size: { w: S.lighthouse.rock.w, h: S.lighthouse.h + S.lighthouse.lantern.h + 2, d: S.lighthouse.base },
    draw: drawLighthouse },
  { id: 'rocks', match: /^(rocks|rocky|cliffs?|boulders?|crags?)$/, usual: 4, band: null, depth: [8, 120],
    size: { w: S.rocks.w, h: S.rocks.h, d: S.rocks.d }, draw: drawRocks },
  { id: 'windmill', match: /^windmills?$/, usual: 1, band: null, depth: [40, 300],
    size: { w: S.windmill.sail, h: S.windmill.tower - S.windmill.cap + 1.3 + S.windmill.sail / 2, d: S.windmill.base },
    draw: drawWindmill },
  { id: 'castle', match: /^(castles?|fortress|fortresses|citadels?)$/, usual: 1, band: null, depth: [80, 600],
    size: { w: S.castle.wall.L + S.castle.tower.d, h: S.castle.keep.h, d: S.castle.keep.w + 20 }, draw: drawCastle },
  { id: 'church', match: /^(church|churches|chapels?|cathedrals?)$/, usual: 1, band: null, depth: [40, 400],
    size: { w: S.church.L * 0.6 + S.church.D, h: S.church.towerH + S.church.spire, d: S.church.D }, draw: drawChurch },
  { id: 'bridge', match: /^(bridges?|viaducts?|footbridges?)$/, usual: 1, band: null, depth: [20, 200],
    size: { w: S.bridge.span + 2 * S.bridge.abutment, h: S.bridge.springing + S.bridge.rise + 2.5, d: 5 },
    draw: drawBridge },
  { id: 'tent', match: /^tents?$/, usual: 1, band: null, depth: [5, 40],
    size: { w: S.tent.L + 1, h: S.tent.h, d: S.tent.W }, draw: drawTent },
  { id: 'campfire', match: /^(campfires?|bonfires?)$/, usual: 1, band: null, depth: [4, 30],
    size: { w: 1.2, h: 1.0, d: 1.2 }, draw: drawCampfire },
  { id: 'fence', match: /^(fences?|fencing|railings?)$/, usual: 1, band: null, depth: [8, 60],
    size: { w: S.fence.run, h: S.fence.h, d: 0.3 }, draw: drawFence },
  { id: 'streetlamp', match: /^(streetlamps?|street-?lamps?|lamp-?posts?|streetlights?|street-?lights?)$/,
    usual: 4, band: null, depth: [10, 120], size: { w: 1.4, h: S.streetlamp.h, d: 0.3 }, draw: drawStreetlamp },
  { id: 'pole', match: /^(telegraph-poles?|utility-poles?|pylons?)$/, usual: 5, band: null,
    depth: [10, 200], size: { w: S.pole.arm, h: S.pole.h, d: 0.3 }, draw: drawPole },
  { id: 'bench', match: /^(bench|benches)$/, usual: 1, band: null, depth: [4, 30],
    size: { w: S.bench.L, h: S.bench.back, d: S.bench.depth }, draw: drawBench },
];

/**
 * Registers the new kinds and three readings that come with the words: a lighthouse brings a shore (and water when
 * none is named, said in scene.overridden), a rock word beside water gives the water a shore to stand on, and a street
 * brings the usual streetlamps as it brings the usual buildings. The house and building rows are things.mjs's.
 */
export function installStructures() {
  for (const entry of STRUCTURE_THINGS) register('things', entry);
  register('conditions', {
    id: 'lighthouse-coast', kind: 'water', match: /^lighthouses?$/,
    apply: (s, g) => { // a lighthouse stands on a shore: the water gets one (a lake's of grass), and water is
      if (g.beach) return; // brought when none was named (said in scene.overridden; 'read as' names the shore)
      if (!g.water) {
        s.overridden.push({ what: 'ground', from: g.land ?? 'grass', to: 'water', because: 'lighthouse' });
        g.water = true;
        s.waterWord = s.waterWord ?? 'coast';
        s.lake = false;
      }
      g.beach = true;
      if (s.lake) g.land = g.land ?? 'grass';
    },
  });
  register('conditions', {
    id: 'rocky-shore', kind: 'water', match: /^(rocks|rocky|cliffs?|boulders?|crags?)$/,
    apply: (s, g) => { if (g.water) g.beach = true; },
  });
  register('conditions', {
    id: 'street-lamps', kind: 'ground', match: /^(streets?|avenues?|boulevards?)$/,
    apply: (s, g, w) => { g.extra.push({ kind: 'streetlamp', count: 4, usual: true, word: w }); },
  });
}

