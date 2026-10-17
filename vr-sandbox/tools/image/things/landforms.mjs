// Landforms: a cactus, a palm tree, a volcano and a waterfall, each a thing in metres through the camera with its
// shadow, registered into `things` so the reader reads its word and thingsPass places and draws it. Every size here
// is typical for the kind (no one specimen), as LANDFORMS says row by row. The palm: the reader's own THINGS table
// reads palm(s) as trees before any registered thing is tried, and 'palm tree' merges into one trees mention, so
// the built-in tree drawer is wrapped through the registry (register() replaces an entry by its id, no edit to
// things.mjs): a trees mention whose word says palm is drawn as a palm, in the share the mentions ask, and
// 'palm-tree' / 'palmtree' is a thing of its own. The waterfall's cliff has a rock bank either side and a pool as
// wide as itself, so it sits in the land. The volcano stands at the horizon (7-14 km away) and is drawn at
// no less than its nearest depth whatever the shore logic asks; it has no cast shadow, which at that distance would
// be half a pixel at the horizon. Two conditions come with the words: a cactus stands on sand unless a land is named
// (and the count of a bare 'cactus' is one: the reader's plural test is /s$/, which takes the word for a plural and
// 'a cactus' for the usual three; a bare 'cacti' is the usual three the other way round; hook for the reader's
// owner, who could exempt -us words there), and 'erupting' sets scene.erupting for the lava.
import { clamp, fbm, h2, lerp, mix, smooth } from '../math.mjs';
import { NUMBERS, words } from '../read.mjs';
import { register, things } from '../registry.mjs';

/** Sizes in metres, each typical for the kind. */
export const LANDFORMS = {
  // a mature saguaro, Carnegiea gigantea: trunk 3-6 m here (they reach 12-15 m), 0.45-0.75 m across, 1-3 arms from
  // a third of the way up: typical
  cactus: { h: [3, 6], d: 0.55, arms: [1, 3], armOut: 0.6, armUp: [1, 2] },
  // a coconut palm, Cocos nucifera, as a beach draws it: a curved trunk 6-12 m (they reach 20-30 m), 0.3 m across,
  // 7-9 fronds 3-4 m long, coconuts 0.25 m: typical
  palm: { h: [6, 12], d: 0.3, fronds: [7, 9], frond: [3, 4], nut: 0.12 },
  // a stratovolcano: 1500 m above its plain, 30 deg slopes (a 5.2 km base), the crater 8% of the base: typical
  volcano: { h: 1500, base: 5200, crater: 0.08, depth: [7000, 14000] },
  // a mid-sized waterfall: a 40 m cliff, the column 6 m wide, the pool 1.5 columns wide: typical
  waterfall: { h: 40, w: 30, column: 6, depth: [140, 320] },
};

/** Where a thing stands: as things.mjs's stance, with the depth held to no less than `least` metres. */
function stance(ctx, inst, least = 0) {
  const zm = Math.max(least, inst.zm ?? ctx.groundZ(inst.fy)), s = ctx.camera.focal / zm, x0 = inst.ux * ctx.W;
  const shadow = inst.fy >= ctx.hy ? ctx.shadow : () => {};
  return { x0, fy: inst.fy, zm, s, xm: (x0 - ctx.W / 2) / s, shadow };
}

// ── The cactus ─────────────────────

const CACTUS = [0.30, 0.48, 0.26], SPINE = [0.8, 0.8, 0.6];

/** A saguaro: a ribbed trunk with a round top and one to three arms that go out, then up. */
function cactus(ctx, inst) {
  const { W, rand, lit, col, sun, rect, disc, line } = ctx, C = LANDFORMS.cactus;
  const { fy, zm, s, shadow } = stance(ctx, inst), hm = lerp(C.h[0], C.h[1], rand());
  const arms = C.arms[0] + Math.floor(rand() * (C.arms[1] - C.arms[0] + 1));
  const hgt = hm * s, w = C.d * s, x0 = clamp(inst.ux * W, w * 2, W - w * 2), xm = (x0 - W / 2) / s;
  const green = col('cactus', CACTUS), toSun = sun.left ? -1 : 1, c = [0, 0, 0];
  /** The ribbed cylinder's shading about an axis at ax, half-width hw: the light across it, a rib every 18 deg. */
  const ribbed = (ax, hw) => (x, y) => {
    const side = clamp((x - ax) / hw, -1, 1), face = Math.sqrt(1 - side * side);
    const rib = 0.5 + 0.5 * Math.cos(Math.asin(side) * 10 * 2); // ten ribs across the visible half
    const k = clamp(0.3 + 0.7 * (0.55 * face + 0.45 * side * toSun)) * (0.82 + 0.18 * rib);
    lit(green, k, c);
    if (h2(x, y, 171) > 0.985) mix(c, SPINE, 0.3, c); // a spine catching the light here and there
    return c;
  };
  shadow(xm, zm, { w: C.d * 1.4, d: C.d }, hm); // the trunk's own footprint: the arms' hull read as a slab
  const armW = w * 0.72;
  for (let k = 0; k < arms; k++) {
    const side = k === 0 ? (rand() < 0.5 ? -1 : 1) : k === 1 ? -Math.sign(inst.ux - 0.5) || 1 : 1;
    const ys = fy - hgt * (0.35 + rand() * 0.25), out = C.armOut * s, up = lerp(C.armUp[0], C.armUp[1], rand()) * s;
    const ex = x0 + side * (w * 0.3 + out);
    line(x0, ys, ex, ys, armW, ribbed(x0, w * 0.5), 1, 1);
    const top = Math.max(fy - hgt * 0.92, ys - up); // an arm ends below the trunk's top
    rect(ex - armW / 2, top, armW, ys - top, ribbed(ex, armW / 2));
    disc(ex, top, armW / 2, ribbed(ex, armW / 2));
    disc(ex, ys, armW / 2, ribbed(ex, armW / 2));
  }
  rect(x0 - w / 2, fy - hgt + w / 2, w, hgt - w / 2, ribbed(x0, w / 2));
  disc(x0, fy - hgt + w / 2, w / 2, ribbed(x0, w / 2));
  const reach = w * 0.3 + C.armOut * s + armW / 2;
  return { x: x0 - reach, y: fy - hgt, w: reach * 2, h: hgt };
}

// ── The palm ───────────────────────

const PALM_TRUNK = [0.45, 0.36, 0.26], FROND = [0.16, 0.46, 0.2], NUT = [0.4, 0.26, 0.12];

/** A palm: a curved ringed trunk, 7-9 drooping tapered fronds, coconuts under the crown. */
function palm(ctx, inst) {
  const { W, rand, lit, col, sun, line, disc } = ctx, P = LANDFORMS.palm;
  const { fy, zm, s, shadow } = stance(ctx, inst), hm = lerp(P.h[0], P.h[1], rand()), hgt = hm * s;
  const lean = (rand() < 0.5 ? -1 : 1) * (0.1 + rand() * 0.2) * hgt, x0 = clamp(inst.ux * W, hgt * 0.4, W - hgt * 0.4);
  const xm = (x0 - W / 2) / s, toSun = sun.left ? -1 : 1, frondC = col('trees', FROND), c = [0, 0, 0];
  const n = P.fronds[0] + Math.floor(rand() * (P.fronds[1] - P.fronds[0] + 1));
  const span = lerp(P.frond[0], P.frond[1], rand()) * s;
  shadow(xm + lean / s * 0.7, zm, { w: span * 1.4 / s, d: span * 1.4 / s }, hm);
  const at = (t) => [x0 + lean * t * t, fy - hgt * t]; // the trunk leans more toward its top
  const trunk = (x, y) => {
    const ring = 0.85 + 0.15 * (Math.floor(y / Math.max(1, P.d * s * 0.6)) % 2); // the leaf scars as rings
    return lit(PALM_TRUNK, (0.45 + 0.35 * toSun * Math.sign(x - x0 - lean * 0.5) * 0.5 + 0.3) * ring, c);
  };
  for (let i = 0; i < 14; i++) {
    const [ax, ay] = at(i / 14), [bx, by] = at((i + 1) / 14), w = P.d * s * (1.2 - 0.5 * i / 14);
    line(ax, ay, bx, by, Math.max(1, w), trunk);
  }
  const [cx, cy] = at(1);
  const fronds = [];
  for (let k = 0; k < n; k++) {
    const th = Math.PI * (0.08 + 0.84 * k / (n - 1)) + (rand() - 0.5) * 0.15, len = span * (0.8 + rand() * 0.3);
    const dir = Math.cos(th), facing = clamp(0.5 + 0.5 * dir * toSun);
    fronds.push({ th, len, facing, back: Math.sin(th) > 0.6 && rand() < 0.5 });
  }
  const drawFrond = ({ th, len, facing }) => {
    const ux = Math.cos(th), uy = -Math.sin(th), shade = lit(frondC, 0.4 + 0.5 * facing);
    let px = cx, py = cy;
    for (let i = 1; i <= 9; i++) {
      const t = i / 9, nx = cx + ux * len * t, ny = cy + uy * len * t + len * 0.5 * t * t; // gravity bends it down
      const w = Math.max(1, len * 0.16 * (1 - t) ** 0.8);
      line(px, py, nx, ny, w, shade, (x, y) => 0.8 + 0.2 * h2(x, y, 172));
      px = nx;
      py = ny;
    }
  };
  fronds.filter((f) => f.back).forEach(drawFrond);
  const nut = P.nut * s, nutC = lit(NUT, 0.6);
  for (let k = 0; k < 3; k++) disc(cx + (k - 1) * nut * 2.2, cy + nut * 1.5, Math.max(1, nut), nutC);
  fronds.filter((f) => !f.back).forEach(drawFrond);
  ctx.layout.palms = (ctx.layout.palms ?? 0) + 1;
  const reach = span * 1.1;
  const crownTop = cy - reach * 0.9;
  return { x: Math.min(x0, cx - reach), y: crownTop, w: Math.abs(lean) + reach * 2, h: fy - crownTop };
}

/** The share of the scene's trees whose mention says palm: 0 when none, 1 when all. */
function palmShare(scene) {
  const trees = scene.instances.filter((i) => i.kind === 'trees' && i.count > 0);
  const total = trees.reduce((n, i) => n + i.count, 0);
  if (!total) return 0;
  return trees.filter((i) => /palm/.test(i.word)).reduce((n, i) => n + i.count, 0) / total;
}

// ── The volcano ────────────────────

const CONE = [0.2, 0.17, 0.17], GLOW = [1, 0.4, 0.1], LAVA = [1, 0.55, 0.15], SMOKE = [0.4, 0.38, 0.38];

/** A dark cone on the horizon, a red glow at its crater, a smoke plume by noise, lava streaks when erupting. */
function volcano(ctx, inst) {
  const { W, H, rand, lit, sun, poly, put, line, scene, scale } = ctx, V = LANDFORMS.volcano;
  const { fy, s } = stance(ctx, inst, V.depth[0]), hgt = V.h * s, half = V.base * s / 2, crater = half * V.crater;
  const x0 = clamp(inst.ux * W, Math.min(half * 0.7, W / 2), Math.max(W - half * 0.7, W / 2)), top = fy - hgt;
  const toSun = sun.left ? -1 : 1;
  const night = scene.time === 'night', c = [0, 0, 0], pts = [], off = rand() * 10;
  const profile = (u) => (1 - u) ** 1.6; // the stratovolcano's concave flank: steep at the top, easing out
  for (let i = 0; i <= 12; i++) pts.push(x0 - crater - (half - crater) * (i / 12), fy - hgt * profile(i / 12));
  for (let i = 12; i >= 0; i--) pts.push(x0 + crater + (half - crater) * (i / 12), fy - hgt * profile(i / 12));
  const shade = (x, y) => {
    const side = (x - x0) / half, up = (fy - y) / hgt;
    const gully = (fbm(side * 12 + off, up * 4, 173, 3) - 0.5) * 0.5; // radial gullies down the flank
    lit(CONE, clamp(0.3 + 0.55 * (0.5 + side * toSun * 0.5) + gully), c);
    if (night) mix(c, GLOW, 0.25 * smooth(0.5, 1, up) * smooth(0.5, 0.0, Math.abs(side)), c); // lit from the crater
    return c;
  };
  poly(pts, shade);
  const glowR = crater * (night ? 6 : 3), glowA = night ? 0.6 : 0.3;
  for (let py = Math.max(0, top - glowR) | 0; py <= Math.min(H - 1, top + glowR); py++) {
    for (let px = Math.max(0, x0 - glowR) | 0; px <= Math.min(W - 1, x0 + glowR); px++) {
      const d = Math.hypot(px + 0.5 - x0, py + 0.5 - top) / glowR;
      if (d < 1) put(px, py, GLOW, glowA * Math.exp(-d * d * 4) * (1 - d));
    }
  }
  ctx.ellipse(x0, top, crater * 1.1, Math.max(1, crater * 0.3), LAVA, 0.9);
  if (scene.erupting) { // lava streaks down the flanks and embers over the crater
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const side = rand() < 0.5 ? -1 : 1, reach = 0.25 + rand() * 0.4;
      let px = x0 + side * crater * 0.5, py = top + crater * 0.2;
      for (let i = 1; i <= 8; i++) {
        const u = (i / 8) * reach, nx = x0 + side * (crater + (half - crater) * u) + (rand() - 0.5) * half * 0.04;
        const ny = fy - hgt * profile(u) + crater * 0.2;
        line(px, py, nx, ny, Math.max(1, 1.5 * scale * (1 - i / 10)), LAVA, 0.9);
        px = nx;
        py = ny;
      }
    }
    for (let k = 0; k < 12; k++) put(x0 + (rand() - 0.5) * crater * 4, top - rand() * hgt * 0.25, LAVA, 0.9);
  }
  // The plume: a column of noise widening upward and drifting with the wind, lit red underneath at night.
  const drift = (rand() < 0.5 ? -1 : 1) * 0.35, tall = Math.min(top, hgt * 1.6);
  const smoke = night ? mix(SMOKE, [0.1, 0.09, 0.1], 0.6) : SMOKE;
  for (let y = Math.max(0, top - tall) | 0; y < top + crater; y++) {
    const up = (top - y) / Math.max(1, tall), w = crater * (1.2 + up * 7), cx = x0 + drift * up * tall;
    for (let x = Math.max(0, cx - w) | 0; x <= Math.min(W - 1, cx + w); x++) {
      const across = (x - cx) / w, n = fbm(x / (crater * 2) + off, y / (crater * 2) - up * 2, 174, 4);
      const a = clamp((n - 0.35) * 2.2) * smooth(1, 0.5, Math.abs(across)) * smooth(1, 0.6, up) * 0.85;
      if (a <= 0.003) continue;
      mix(smoke, night ? GLOW : [0.7, 0.68, 0.66], (night ? 0.5 : 0.3) * smooth(0.35, 0, up), c);
      put(x, y, c, a);
    }
  }
  return { x: x0 - half, y: Math.max(0, top - tall), w: half * 2, h: fy - Math.max(0, top - tall) };
}

// ── The waterfall ──────────────────

const CLIFF = [0.26, 0.23, 0.2], FALL = [0.88, 0.92, 0.95], POOL = [0.1, 0.26, 0.32], MIST = [0.9, 0.93, 0.95];
const BANK_TURF = [0.36, 0.56, 0.24];

/**
 * A white column down a dark cliff into a pool, mist at the foot. The cliff sits in the land, not on it: a low rock
 * bank runs out from either flank (a cliff-width wide, a third of the cliff's height at the flank, falling to the
 * ground, grassed on top) and the pool is as wide as the cliff, so on a bare meadow it reads as a rock face with
 * a stream over it, not a standing stone. The cliff's outline is traced round (up the left flank, across the broken
 * top, down the right flank, back along the ground), so the polygon never crosses itself.
 */
function waterfall(ctx, inst) {
  const { W, rand, lit, sun, poly, rect, ellipse, put, L, scale } = ctx, F = LANDFORMS.waterfall;
  const { fy, zm, s, shadow } = stance(ctx, inst), hgt = F.h * s, w = F.w * s, colW = F.column * s;
  const x0 = clamp(inst.ux * W, w * 0.55, W - w * 0.55), xm = (x0 - W / 2) / s, toSun = sun.left ? -1 : 1;
  const off = rand() * 10, top = fy - hgt, pts = [], c = [0, 0, 0];
  shadow(xm, zm, { w: F.w, d: 10 }, F.h);
  const flank = (u, side) => // the cliff's side at height u (0 at the foot): narrower at the top, broken by noise
    x0 + side * (w / 2) * (0.55 + 0.45 * u) + (fbm(u * 5 + off + side, side, 181, 3) - 0.5) * w * 0.12;
  const stratum = mix(CLIFF, [0.5, 0.42, 0.34], 0.5);
  const rock = (x, y) => { // strata and cracks on a dark face, the lit flank toward the sun
    const band = fbm(x / (w * 0.25), y / (hgt * 0.035), 176, 3), crack = fbm(x / (w * 0.06), y / (hgt * 0.3), 177, 2);
    mix(CLIFF, stratum, smooth(0.5, 0.65, band), c);
    return lit(c, clamp(0.3 + 0.5 * (0.5 + toSun * (x - x0) / w)) * (0.85 + 0.3 * band) * (crack < 0.35 ? 0.6 : 1), c);
  };
  // The banks: from a third of the way up each flank out to the ground a cliff-width away, the top edge broken by
  // noise and easing out (a (1 - t)^1.5 fall), grassed where it faces up.
  const bankUp = 0.34, bankW = w * 0.95;
  for (const side of [-1, 1]) {
    const edge = flank(bankUp, side), foot = flank(0, side), bank = [foot, fy + 1, edge, fy - hgt * bankUp];
    const topAt = (t) => fy - hgt * bankUp * (1 - t) ** 1.5 * (0.85 + 0.3 * fbm(t * 4 + off, side * 2, 183, 3));
    for (let j = 1; j <= 10; j++) bank.push(edge + side * bankW * (j / 10), j === 10 ? fy + 1 : topAt(j / 10));
    poly(bank, (x, y) => {
      const t = clamp(Math.abs(x - edge) / bankW), below = (y - topAt(t)) / Math.max(1, hgt * bankUp);
      rock(x, y);
      const turf = smooth(0.45, 0, below) * (0.6 + 0.4 * fbm(x / (w * 0.1), y / (w * 0.1), 184, 2));
      return mix(c, lit(BANK_TURF, 0.7 + 0.4 * (0.5 + side * toSun * 0.5)), clamp(turf), c);
    });
  }
  for (let i = 0; i <= 8; i++) pts.push(flank(i / 8, -1), fy + 1 - hgt * (i / 8)); // up the left flank
  for (let i = 0; i <= 16; i++) { // the cliff's broken top edge
    const u = i / 16, dip = smooth(0.3, 0.5, Math.abs(u - 0.5)) * hgt * 0.1; // lower where the column goes over
    const left = flank(1, -1), ridge = (fbm(u * 6 + off, 0.5, 175, 3) - 0.5) * hgt * 0.3;
    pts.push(left + (flank(1, 1) - left) * u, top + dip + ridge);
  }
  for (let i = 0; i <= 8; i++) pts.push(flank(1 - i / 8, 1), top + hgt * (i / 8)); // down the right flank
  poly(pts, rock);
  for (const side of [-1, 1]) { // the fallen rocks at the foot
    const rx = x0 + side * colW * (1.1 + 0.4 * h2(side, 1, 182)), ry = fy - colW * 0.1, r = colW * 0.35;
    ellipse(rx, ry, r, r * 0.6, lit(CLIFF, side * toSun > 0 ? 0.8 : 0.45));
  }
  const lip = top + hgt * 0.02, fall = mix(FALL, L.horizon, 0.2), poolY = fy, poolRx = w * 0.5; // as wide as the cliff
  const pool = ctx.project(0, zm), nearer = ctx.project(0, Math.max(1, zm - F.column * 3)).y;
  const poolRy = Math.max(1, (nearer - pool.y) * 0.5);
  ellipse(x0, poolY, poolRx, poolRy, (x, y) => { // darker under the cliff, a ring of foam where the column lands
    const foam = smooth(colW * 1.3, colW * 0.6, Math.abs(x - x0)) * smooth(poolRy, 0, Math.abs(y - poolY)) * 0.5;
    return mix(lit(POOL, 0.65 + 0.3 * (y - poolY + poolRy) / (2 * poolRy), c), fall, foam, c);
  });
  rect(x0 - colW / 2, lip, colW, fy - lip, (x, y) => { // the column: vertical streaks, widening a little as it falls
    const down = (y - lip) / Math.max(1, fy - lip);
    const streak = fbm(x / Math.max(1, colW * 0.08), y / (hgt * 0.5) - down * 3, 178, 3);
    return mix(fall, [0.6, 0.72, 0.8], 0.5 - streak * 0.6 + down * 0.2, c);
  }, (x, y) => 0.75 + 0.25 * fbm(x / 3, (y - lip) / 7, 179, 2));
  for (let k = 0; k < 2; k++) { // the mist at the foot, in two soft discs
    const mx = x0 + (k - 0.5) * colW * 0.8, my = fy - colW * 0.3, r = colW * (1.2 + k * 0.4);
    for (let py = Math.max(0, my - r) | 0; py <= Math.min(ctx.H - 1, my + r); py++) {
      for (let px = Math.max(0, mx - r) | 0; px <= Math.min(W - 1, mx + r); px++) {
        const d = Math.hypot(px + 0.5 - mx, py + 0.5 - my) / r;
        if (d < 1) put(px, py, MIST, 0.6 * Math.exp(-d * d * 3) * (1 - d) * (0.7 + 0.3 * fbm(px / 6, py / 6, 180, 2)));
      }
    }
  }
  put(x0, lip, FALL, 0.1 * scale); // a hand's touch so an empty 1 px column still reads
  return { x: x0 - w / 2, y: top - hgt * 0.08, w, h: fy - top + hgt * 0.08 + poolRy };
}

// ── The registry ───────────────────

/** The registry entries: depth is how far away each may stand, size its typical width and height in metres. */
export const landforms = [
  {
    id: 'cactus', match: /^(cactus|cacti|cactuses|saguaros?)$/, usual: 3, band: null, depth: [12, 50],
    size: { w: 2.5, h: LANDFORMS.cactus.h[1] }, draw: cactus,
  },
  {
    id: 'palm', match: /^(palm-trees?|palmtrees?|coconut-palms?)$/, usual: 3, band: null, depth: [30, 150],
    size: { w: LANDFORMS.palm.frond[1] * 2, h: LANDFORMS.palm.h[1] }, draw: palm,
  },
  {
    id: 'volcano', match: /^(volcano|volcanoes|volcanos)$/, usual: 1, band: null, depth: LANDFORMS.volcano.depth,
    size: { w: LANDFORMS.volcano.base, h: LANDFORMS.volcano.h }, draw: volcano,
  },
  {
    id: 'waterfall', match: /^(waterfalls?|cascades?)$/, usual: 1, band: null, depth: LANDFORMS.waterfall.depth,
    size: { w: LANDFORMS.waterfall.w, h: LANDFORMS.waterfall.h }, draw: waterfall,
  },
];

export function installLandforms() {
  for (const entry of landforms) register('things', entry);
  const tree = things.find((t) => t.id === 'tree');
  if (tree && !tree.palmAware) { // the built-in tree drawer, wrapped: a trees mention that says palm is a palm
    const base = tree.draw;
    register('things', {
      ...tree, palmAware: true,
      draw: (ctx, inst) => {
        const share = palmShare(ctx.scene);
        if (share <= 0) return base(ctx, inst); // no rand spent: the base picture stays byte for byte
        return share >= 1 || ctx.rand() < share ? palm(ctx, inst) : base(ctx, inst);
      },
    });
  }
  register('conditions', {
    id: 'cactus-sand', kind: 'ground', match: /^(cactus|cacti|cactuses|saguaros?)$/,
    apply: (s, g) => { // a cactus stands on sand unless a land is named; 'cactus' is one, a bare 'cacti' the usual
      g.land = g.land ?? 'sand';
      const ws = words(s.prompt), numbered = (at) => at > 0 && (/^\d+$/.test(ws[at - 1]) || NUMBERS[ws[at - 1]] > 1);
      for (const inst of s.instances) {
        if (inst.kind !== 'cactus') continue;
        const last = inst.word.split(' ').pop();
        if (last === 'cactus' && inst.usual) {
          inst.count = 1;
          delete inst.usual;
        } else if (last === 'cacti' && inst.count === 1 && !inst.usual && !numbered(ws.indexOf('cacti'))) {
          inst.count = 3;
          inst.usual = true;
        }
      }
    },
  });
  register('conditions', {
    id: 'erupting', kind: 'weather', match: /^(erupting|erupts?|eruptions?)$/, apply: (s) => { s.erupting = true; },
  });
}
