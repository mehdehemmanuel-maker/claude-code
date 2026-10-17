// What stands in the picture, where, and whether it can be seen. place() gives every instance the reader found a
// world position (xm, zm metres), a footprint in metres, a heading and its own colour and size, by rules: the named
// subject near a third line at mid depth, extras scattered, the reader's near/far/left/right/centre hints, no
// footprint over another by more than 40%, nothing but a vehicle in the road's corridor, boats on the water and
// everything else off it. thingsPass paints them far to near, then critic() reads the owner-id buffer back (the
// nearest thing painted solidly at a pixel owns it) and counts each one's visible pixels: an asked-for thing hidden
// or under TINY rows tall is placed once more and the things repainted; the counts go to layout.things[].visible
// and scene.report.visible = { trees: [seen, asked] }, which the shell prints. Each drawer paints one thing with its
// foot on the ground plane at (ux·W, fy), zm metres away, every size taken from SIZES in metres through the camera
// (draw.mjs) times inst.size, in inst.colour when the words gave one, its shadow thrown first, and returns its box
// in pixels for the layout. The flyers (creatures.mjs) go last, in the sky.
import { clamp, fbm, h2, lerp, mix, rng } from './math.mjs';
import { COLOURS, THINGS } from './read.mjs';
import { FIT, SIZES, fitWidth } from './draw.mjs';
import { keyOf, thingByKey } from './registry.mjs';

const BAND = [0.1, 0.5]; // where a registered thing with neither size, depth nor band stands: the middle ground

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
  for (const e of ctx.things) {
    if (e.sky || e.onWater || !e.size || usual(keyOf(e), e.usual) <= 0) continue;
    const own = ctx.project(0, nearest(ctx, e.size) * SHORE_STEP).y - back;
    if (own >= least) row = Math.min(row, own);
  }
  // a thing that keeps the far bank: groundPass paints land under it (water-reflections). One judgement with
  // place(): the far bank is wanted exactly when bounds() finds no room for a land thing on the near shore
  ctx.shoreY = row;
  ctx.farBankNeeded = wants(ctx).some((w) => !w.entry.sky && !w.entry.onWater && !bounds(ctx, w, false));
  return row;
}

// ── Placement ──────────────────────

// Where subjects stand across the frame, by how many there are: one at a third line, two at both, three spread
const COLUMNS = [[0.33, 0.67], [0.33, 0.67], [0.2, 0.5, 0.8]], THIRD_JITTER = 0.06;
const SUBJECT_DEPTH = [0.45, 0.65]; // its foot, as a share of the ground band below the horizon
const SUBJECTS = 3; // an asked-for count up to this is placed as subjects, one per third line; more scatter
const TRIES = 20; // candidate positions tried before the first free gap in the depth band is taken
const OVERLAP = 0.4; // the most of the smaller footprint another may cover, in world space
const HIDE = 0.25; // the most of a subject's box a nearer thing may cover
const HIDE_EXTRA = 0.6; // the most of an extra's or a crowd's box: the usual forest is not wasted behind the cabin
const EDGE = 0.02; // a thing's box keeps this share of the width clear of the frame's sides
const SHORE_MARGIN = 0.02; // a thing stands this share of the ground band off the waterline
const READ = { asked: 0.12, extra: 0.05 }; // the least height a thing is placed at, as a share of the frame
const TINY = 12; // rows at 720 rows tall: a thing shorter than this in the frame does not read
const SKYLINE = [0.01, 0.05]; // the usual buildings stand in this band at the horizon: a skyline row
const CORRIDOR = SIZES.lanes * SIZES.lane; // metres either side of the road's centre kept free of all but vehicles
const TOWARD = 0.1; // the share of vehicles on a road that come toward the viewer
const HINTS = { left: [0.1, 0.4], right: [0.6, 0.9], centre: [0.4, 0.6] }; // the reader's place words, as ux windows
const DISC = 0.08; // share of the height round the sun's or the moon's centre no thing stands in front of
const STACK = 0.25; // the most of one vehicle's box another may cover: they never stack in a picture
const STAGGER = 0.1; // the depth a counted few subjects are spread over, as a share of the ground band (+-0.05)

/**
 * Where the road's centre is at a row, in metres right of the lens axis: ground-weather's ctx.roadX(y) is the drifted
 * centre in pixels (groundPass sets it), read back to metres at that row; the axis when no road was painted.
 */
const roadCentre = (ctx, fy) => (typeof ctx.roadX === 'function' ? ctx.groundX(ctx.roadX(fy), fy) : 0);

/**
 * What the words asked to stand in the picture, one want per reader instance with a registered drawer: its entry,
 * its count, its size factor, its colour as [r, g, b], its placement hint, whether it was asked for by count or
 * is the usual number. A scene without instances (built by hand) is read from scene.things as before.
 */
function wants(ctx) {
  const { scene } = ctx, out = [];
  const instances = scene.instances ?? Object.keys(scene.things).map((kind) => {
    const entry = thingByKey(kind);
    return { kind, count: scene.things[kind] || entry?.usual || 0, size: 1, usual: !scene.things[kind] };
  });
  for (const instance of instances) {
    const entry = thingByKey(instance.kind);
    if (!entry || !(instance.count > 0) || !ctx.things.includes(entry)) continue;
    const named = instance.colour ? COLOURS[instance.colour] : undefined;
    const colour = Array.isArray(instance.colour) ? instance.colour : named;
    out.push({
      entry, instance, count: instance.count, size: instance.size || 1, colour, placement: instance.placement,
      asked: !instance.usual,
    });
  }
  return out;
}

/** The ground share a depth of zm metres is at: 0 at the horizon, 1 at the frame's foot. */
const shareOf = (ctx, zm) => ctx.camera.eye * ctx.camera.focal / (zm * (ctx.H - ctx.hy));

const FRAME = 0.95; // a thing drawn at its size factor keeps its top under the frame's top by the rest of this

/**
 * Where a thing of this kind and size may stand, as [nearest, farthest] shares of the ground band: no nearer than
 * where its PLAIN size (factor 1) fits FIT.height of the rows and its kind's share of the columns, so a tiny
 * thing is drawn half as tall as the plain one there and a huge one twice (the word shows), no nearer than where
 * the sized one's top still clears the frame's top (a level camera: a thing taller than the eye climbs over the
 * horizon as it nears, so a huge cabin's height is capped by the sky above the horizon, 1.23x the plain one at a
 * 0.55 horizon) and its width FRAME of the columns, no farther than where it is still READ tall (an asked-for
 * thing larger than an extra). A registered thing without sizes keeps its depth in metres or its row band, else
 * the middle ground. The usual buildings take the skyline row.
 */
function bandFor(ctx, want) {
  const { W, H, hy } = ctx, { entry, size } = want, eye = ctx.camera.eye, band = (H - hy) / H;
  if (entry.id === 'building' && !want.asked) return SKYLINE;
  if (!entry.size) {
    if (!entry.depth) return entry.band ?? BAND;
    return [shareOf(ctx, entry.depth[1]), shareOf(ctx, entry.depth[0])].map((u) => clamp(u, 0.01, 0.95));
  }
  const { h, w } = entry.size, wide = fitWidth(entry.id, want.count), cols = W / (band * H), over = h * size / eye - 1;
  const top = over > 0 ? (hy / H - (1 - FRAME)) / (band * over) : 0.95; // where the sized one's top meets the frame's
  const uMax = Math.min(0.95, FIT.height * eye / (h * band), wide * cols * eye / w, top,
    FRAME * cols * eye / (w * size));
  const uMin = Math.max(0.02, (want.asked ? READ.asked : READ.extra) * eye / (h * size * band));
  return [Math.min(uMin, uMax), uMax];
}

/** A thing's footprint on the ground in metres, as it faces: a vehicle on the road is longer than it is wide. */
function footprintOf(entry, size, heading) {
  const s = entry.size ?? { w: 1, h: 1 }, w = s.w * size, d = (s.d ?? s.w) * size;
  if (entry.onRoad && heading !== 'side') return { w: Math.min(w, d), d: Math.max(w, d) };
  return { w, d };
}

/** The area two axis-aligned boxes { x, y, w, h } share. */
function shared(a, b) {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
}

/**
 * The shares of the ground band one copy of a want may stand in, [nearest, farthest], after the water (land things
 * on the near shore, boats on the water), the reader's near/far hint and the critic's retry (the near half) have
 * had their say. null when there is no room on this bank (a land thing goes to the far bank). A boat whose water
 * is too shallow is clamped just off the shore.
 */
function bounds(ctx, want, retry) {
  const { H, hy, scene } = ctx, { entry } = want, water = scene.ground === 'water';
  const uShore = water ? (ctx.shoreY - hy) / (H - hy) : 1;
  let [uMin, uMax] = bandFor(ctx, want);
  if (water && !entry.onWater && !entry.sky) uMin = Math.max(uMin, uShore + SHORE_MARGIN);
  if (water && entry.onWater) {
    uMax = Math.min(uMax, uShore - SHORE_MARGIN);
    if (uMax < uMin) uMin = uMax = Math.max(0.02, uMax);
  }
  if (!(uMax >= uMin) || uMin > 0.98) return null;
  if (want.placement === 'near') uMin = lerp(uMin, uMax, 0.66);
  if (want.placement === 'far') uMax = lerp(uMin, uMax, 0.34);
  if (retry) uMin = lerp(uMin, uMax, 0.5);
  return [uMin, uMax];
}

const isSubject = (want) => want.asked && want.count <= SUBJECTS && !want.entry.sky;

/**
 * One candidate position for a want's i-th copy: its ground share u and its column ux by the rules (a subject at
 * a third line at mid depth, an extra anywhere in its band, the reader's window), then the world position, the
 * footprint and the box it will be drawn in. `gap` is a fixed (u, ux) from the free-gap scan.
 */
function candidate(ctx, want, i, span, placed, gap = null) {
  const { H, hy, scene, rand } = ctx, { entry, size } = want, [uMin, uMax] = span, subject = isSubject(want);
  const onRoad = entry.onRoad && scene.road, skyline = entry.id === 'building' && !want.asked;
  const stagger = subject && !onRoad && want.count > 1 ? (i / (want.count - 1) - 0.5) * STAGGER : 0;
  let u, ux;
  if (gap) [u, ux] = gap;
  else {
    const window = HINTS[want.placement] ?? [EDGE + 0.04, 1 - EDGE - 0.04];
    if (subject && !HINTS[want.placement] && !onRoad) { // one at a third line, two at both, three spread
      const columns = COLUMNS[want.count - 1], flip = want.flip ?? (want.flip = rand() < 0.5);
      const col = columns[flip ? columns.length - 1 - i : i];
      ux = col + (rand() - 0.5) * 2 * THIRD_JITTER;
    } else if (skyline) ux = EDGE + (i + rand()) / want.count * (1 - 2 * EDGE); // a row along the horizon
    else ux = window[0] + rand() * (window[1] - window[0]);
    if (subject && !onRoad) { // a counted few are staggered in depth, so three pines are not one row
      u = clamp(SUBJECT_DEPTH[0] + rand() * (SUBJECT_DEPTH[1] - SUBJECT_DEPTH[0]) + stagger, uMin, uMax);
    } else u = uMin + rand() * (uMax - uMin); // a vehicle anywhere along the road, so two never share a row
  }
  const heading = onRoad ? (rand() < TOWARD ? 'toward' : 'away') : 'side';
  const fp = footprintOf(entry, size, heading), sz = entry.size ?? { w: 1, h: 1 }; // the box is its width as it faces
  const lane = placed.filter((p) => p.entry.onRoad && p.heading !== 'side').length % 2 === 0 ? 1 : -1;
  const c = { want, entry, ux, heading, fp, hm: sz.h * size, lane: onRoad ? lane : null };
  stand(ctx, c, u);
  ashore(ctx, c); // hook for water-reflections: dry feet on the wandering shore, judged before refusal() looks
  // the shore's push stands every pine on one row: the stagger is given again past it, nearer only
  if (c.u > u + 1e-9 && stagger) stand(ctx, c, Math.min(uMax, c.u + stagger + STAGGER / 2));
  return c;
}

/**
 * Stands a candidate at ground share u: its foot row, its depth, its metres off the axis (a vehicle in its lane of
 * the road at that row, anything else under its column, a thing wider than its third pulled to the middle so it
 * is whole) and the box it will be drawn in.
 */
function stand(ctx, c, u) {
  const { W, H, hy } = ctx, fy = hy + (H - hy) * u, zm = ctx.groundZ(fy), s = ctx.camera.focal / zm;
  const wPx = c.fp.w * s, hPx = c.hm * s, room = (1 - 2 * EDGE) / 2 - wPx / (2 * W) - 1e-3;
  let xm;
  if (c.lane !== null) xm = roadCentre(ctx, fy) + c.lane * SIZES.lane / 2; // on the road, in its lane
  else {
    if (room >= 0) c.ux = clamp(c.ux, 0.5 - room, 0.5 + room); // a huge thing leaves its third for the middle
    xm = ctx.groundX(c.ux * W, fy);
  }
  const x0 = ctx.project(xm, zm).x;
  Object.assign(c, { u, fy, zm, xm, ux: x0 / W, box: { x: x0 - wPx / 2, y: fy - hPx, w: wPx, h: hPx } });
}

/** Whether a box covers the sun's or the moon's disc (the shares in layout), when one is drawn in the sky. */
function eclipses(ctx, box) {
  const { W, H, L, scene, layout } = ctx, r = DISC * H;
  const discs = [];
  if (!L.sunk && !scene.storm) discs.push(layout.sun);
  if (layout.moon) discs.push(layout.moon);
  return discs.some(([ux, uy]) => {
    const x = ux * W, y = uy * H;
    return x > box.x - r && x < box.x + box.w + r && y > box.y - r && y < box.y + box.h + r;
  });
}

/**
 * Why a candidate is refused, or null when it may stand: cropped by the frame's side (a subject stays whole, an
 * extra keeps most of itself in), in front of the sun or the moon, in the road's corridor, over another footprint,
 * hiding a subject behind it, stacked on another vehicle, or hidden behind what is nearer: by more than HIDE of
 * its box for a subject (a boat is never stood behind a pine) or on the critic's retry, by more than HIDE_EXTRA for
 * an extra or one of a counted crowd (the usual forest is not wasted behind the cabin; forty trees may overlap as
 * a wood does). `lax` lets it stand before the sun: the last resort of a thing too big to stand anywhere else (a
 * huge cabin).
 */
function refusal(ctx, c, placed, retry = false, lax = false) {
  const { W, scene } = ctx, { entry, xm, zm, fp, box } = c, keep = isSubject(c.want) ? 1 - 1e-6 : 0.6;
  const hide = isSubject(c.want) || retry ? HIDE : HIDE_EXTRA; // a subject shows whole; a crowd or an extra mostly
  if (Math.min(box.x + box.w, W * (1 - EDGE)) - Math.max(box.x, W * EDGE) < keep * box.w) return 'cropped';
  if (!lax && eclipses(ctx, box)) return 'eclipses';
  if (scene.road && !entry.onRoad && Math.abs(xm - roadCentre(ctx, c.fy)) - fp.w / 2 < CORRIDOR) return 'road';
  const a = { x: xm - fp.w / 2, y: zm - fp.d / 2, w: fp.w, h: fp.d }, area = fp.w * fp.d;
  for (const p of placed) {
    if (p.entry.sky || p.farBank) continue;
    const b = { x: p.xm - p.fp.w / 2, y: p.zm - p.fp.d / 2, w: p.fp.w, h: p.fp.d };
    if (shared(a, b) / Math.min(area, p.fp.w * p.fp.d) > OVERLAP) return 'overlap';
    const over = shared(box, p.box);
    if (p.entry.onRoad && entry.onRoad && over > STACK * Math.min(box.w * box.h, p.box.w * p.box.h)) return 'stacked';
    if (isSubject(p.want) && zm < p.zm && over / (p.box.w * p.box.h) > HIDE) return 'hides';
    if (p.zm < zm && over / (box.w * box.h) > hide) return 'hidden';
  }
  return null;
}

/** The far bank: its foot on the water's far edge, at a depth that keeps it a readable share of the frame tall. */
function farBank(ctx, want) {
  const { H, hy, rand } = ctx, { entry, size } = want, sz = entry.size ?? { w: 1, h: 1 }, hm = sz.h * size;
  const share = FAR_BANK_SHARE[0] + rand() * (FAR_BANK_SHARE[1] - FAR_BANK_SHARE[0]);
  const zm = clamp(hm * ctx.camera.focal / (H * share), FAR_BANK[0], FAR_BANK[1]), s = ctx.camera.focal / zm;
  const ux = 0.1 + rand() * 0.8, xm = (ux - 0.5) * ctx.W / s, fp = footprintOf(entry, size, 'side');
  const box = { x: ux * ctx.W - fp.w * s / 2, y: hy - 1 - hm * s, w: fp.w * s, h: hm * s };
  return { want, entry, u: 0, ux, fy: hy - 1, zm, xm, heading: 'side', fp, box, farBank: true };
}

/**
 * Where one copy of a want stands: TRIES seeded candidates, the first that nothing refuses; then the first free
 * gap in a scan of the depth band (the row it wanted first, then five rows of the band, the columns across from
 * the one meant for it), once more letting it stand before the sun; then the last candidate, crowded. A land
 * thing with no room on the near shore of a water scene stands on the far bank, as before; a flyer anywhere in
 * the sky. `retry` is the critic's second go for a thing it could not see.
 */
export function place(ctx, want, i, placed, retry = false) {
  const { rand } = ctx, { entry } = want;
  if (entry.sky) {
    const ux = rand(), uy = rand() * ctx.horizon * 0.7, zm = depthIn(entry.depth ?? [25, 120], rand());
    const xm = (ux - 0.5) * ctx.W * zm / ctx.camera.focal;
    return { want, entry, ux, uy, zm, xm, heading: 'side', fp: { w: 0, d: 0 }, box: null, fy: 0, u: 0 };
  }
  const span = bounds(ctx, want, retry);
  if (!span) return ctx.scene.ground === 'water' && !entry.onWater ? farBank(ctx, want) : null;
  let last = null;
  for (let t = 0; t < TRIES; t++) {
    const c = candidate(ctx, want, i, span, placed);
    if (!refusal(ctx, c, placed, retry)) return c;
    last = c;
  }
  const columns = []; // the free-gap scan: the columns nearest the one meant for it first, then outward
  for (let ux = EDGE + 0.04; ux <= 1 - EDGE - 0.04; ux += 0.04) columns.push(ux);
  columns.sort((a, b) => Math.abs(a - last.ux) - Math.abs(b - last.ux));
  const rows = [last.u, ...[0.5, 0.75, 0.25, 0.9, 0.1].map((k) => lerp(span[0], span[1], k))];
  for (const lax of [false, true]) {
    for (const u of rows) {
      for (const ux of columns) {
        const c = candidate(ctx, want, i, span, placed, [u, ux]);
        if (!refusal(ctx, c, placed, retry, lax)) return c;
      }
    }
  }
  last.crowded = true;
  return last;
}

/**
 * The shore wanders (ctx.shoreLine, from groundPass), so a land thing stood against the mean shore row would wade
 * where the water reaches below it: its foot is moved down to SHORE.margin of the ground band past the deepest shore
 * row under the columns it spans (its depth read back from the row, so it grows a little nearer; a second look
 * covers the columns it grew into), and its box and metres off the axis follow. Nothing on the far bank, on the
 * water or in the sky moves, and no random draw is made. candidate() calls it before refusal() judges, so the
 * overlaps and the fit are judged where the thing will stand, and the painter's order is taken after it.
 * water-reflections' agreement between the shore and the placement.
 */
function ashore(ctx, p) {
  const { W, H, hy, scene, shoreLine } = ctx, { entry } = p, size = entry.size ?? { w: 1, h: 1 };
  if (scene.ground !== 'water' || entry.onWater || entry.sky || !shoreLine || p.fy < hy) return;
  for (let look = 0; look < 2; look++) {
    const half = size.w * ctx.camera.focal / p.zm / 2, x0 = clamp(p.ux * W, half * 1.2, W - half * 1.2);
    let deepest = 0; // the drawers clamp their own x0 inside the frame and span about it: looked at a little wider
    for (let x = Math.max(0, Math.floor(x0 - half * 1.3)); x <= Math.min(W - 1, Math.ceil(x0 + half * 1.3)); x++) {
      if (shoreLine[x] > deepest) deepest = shoreLine[x];
    }
    const foot = deepest + (H - hy) * SHORE.margin;
    if (deepest >= H || p.fy >= foot) return;
    stand(ctx, p, (foot - hy) / (H - hy));
  }
}

/** Every copy of every want placed, subjects first (so extras keep clear of them), each with a seed to draw by. */
function placeAll(ctx) {
  const { rand } = ctx, placed = [], list = wants(ctx);
  const subjects = list.filter(isSubject), rest = list.filter((w) => !subjects.includes(w));
  for (const want of [...subjects, ...rest]) {
    for (let i = 0; i < want.count; i++) {
      const p = place(ctx, want, i, placed);
      if (!p) continue;
      p.seed = (rand() * 4294967296) >>> 0;
      placed.push(p);
    }
  }
  return { placed, list };
}

/** The instance a drawer is handed: today's ux/fy/zm and the shared fields every package reads. */
function instanceOf(p) {
  const { want } = p;
  return {
    ux: p.ux, fy: p.fy, uy: p.uy, zm: p.zm, xm: p.xm, heading: p.heading, colour: want.colour, size: want.size,
    instance: want.instance,
  };
}

/** Paints the placed things in painter's order (the farthest first, the flyers last) and fills layout.things. */
function paintPlaced(ctx, placed) {
  const { layout, rand } = ctx;
  placed.sort((a, b) => (a.entry.sky ? 1 : 0) - (b.entry.sky ? 1 : 0) || a.fy - b.fy || b.zm - a.zm);
  layout.things.length = 0;
  ctx.tops.length = 0;
  ctx.owner?.fill(-1);
  ctx.painted = []; // per id, the pixels it painted solidly, covered since or not (the sprite's put counts them)
  for (const [id, p] of placed.entries()) {
    p.id = id;
    ctx.rand = rng(p.seed); // each thing draws by its own seed, so moving one does not change the others' looks
    try {
      const box = ctx.sprite(p.zm, () => p.entry.draw(ctx, instanceOf(p)), id);
      const where = { xm: p.xm, zm: p.zm, heading: p.heading, footprint: p.fp, crowded: !!p.crowded };
      layout.things.push({ kind: p.entry.id, ...box, ...where, visible: true, pixels: 0 });
    } finally {
      ctx.rand = rand;
    }
  }
}

const SHOWING = 0.5; // the least of the pixels a thing painted that must still be its own for it to count as seen

/**
 * The critic: counts each placed thing's pixels in the owner-id buffer (a nearer thing painted over it took them)
 * and the rows they span, against the pixels it painted (ctx.painted, kept by the sprite: what it would show
 * alone), marks each visible or not in layout.things (visible: at least SHOWING of its own pixels left AND a span of
 * TINY rows or columns), and names the asked-for things that are hidden or too short to read. Answers { tally,
 * again }: the per-kind { trees: [seen, asked] } over every copy the words asked for (placed or not) and the list to
 * place again.
 */
export function critic(ctx, placed, list = placed.map((p) => p.want)) {
  const { W, H, owner, layout, scale } = ctx, n = placed.length, count = new Int32Array(n), painted = ctx.painted;
  const top = new Int32Array(n).fill(H), bottom = new Int32Array(n).fill(-1);
  const left = new Int32Array(n).fill(W), right = new Int32Array(n).fill(-1);
  if (owner) {
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        const id = owner[i];
        if (id < 0 || id >= n) continue;
        count[id]++;
        if (y < top[id]) top[id] = y;
        if (y > bottom[id]) bottom[id] = y;
        if (x < left[id]) left[id] = x;
        if (x > right[id]) right[id] = x;
      }
    }
  }
  const tally = {}, again = [], least = Math.max(2, TINY * scale);
  for (const want of new Set(list)) {
    const key = keyOf(want.entry);
    tally[key] = tally[key] ?? [0, 0];
    tally[key][1] += want.count;
  }
  for (const p of placed) {
    const span = Math.max(bottom[p.id] - top[p.id], right[p.id] - left[p.id]) + 1; // a gull is wide, not tall
    const alone = painted?.[p.id] ?? count[p.id], t = layout.things[p.id];
    // hook for scene-families: a sky phenomenon (rainbow, aurora, lightning) is painted by its own pass behind the
    // land, nothing through the sprite; its draw() hands on the box that pass painted (no area when it did not)
    const byPass = p.entry.sky && alone === 0 && count[p.id] === 0;
    const seen = byPass ? t.w >= least && t.h >= 1 : count[p.id] > 0 && count[p.id] >= SHOWING * alone && span >= least;
    t.visible = seen;
    t.pixels = count[p.id];
    t.painted = alone;
    if (seen) tally[keyOf(p.entry)][0]++;
    else if (p.want.asked && !p.entry.sky && !p.replaced) again.push(p);
  }
  return { tally, again };
}

/**
 * Places and draws every thing the scene names, far to near, then the flyers; the critic then counts what can be
 * seen, an asked-for thing it cannot see is placed once more (seeded) and the things are painted again over the
 * picture as it was. layout.things carries each box with visible and pixels (replaced on the ones moved),
 * layout.camera the eye frameCamera chose, scene.report.visible the tally.
 */
export function thingsPass(ctx) {
  const { scene, layout, data } = ctx;
  layout.camera = { eye: ctx.camera.eye, equiv: ctx.camera.equiv, near: ctx.framing?.near ?? null };
  const { placed, list } = placeAll(ctx), before = data.slice();
  paintPlaced(ctx, placed);
  let { tally, again } = critic(ctx, placed, list);
  if (again.length) {
    for (const p of again) {
      const moved = place(ctx, p.want, 0, placed.filter((o) => o !== p), true);
      if (!moved) continue;
      moved.seed = p.seed;
      moved.replaced = true;
      placed[placed.indexOf(p)] = moved;
    }
    data.set(before);
    paintPlaced(ctx, placed);
    ({ tally } = critic(ctx, placed, list));
    for (const p of placed) if (p.replaced) layout.things[p.id].replaced = true;
  }
  scene.report = { ...(scene.report ?? {}), visible: tally };
}

/**
 * Where a thing stands: its foot's pixel, its depth, the pixels per metre there, its metres off the axis, its size
 * factor, and shadow(), which throws its shadow unless it stands on the far bank (its foot at the horizon, the
 * land under it out of frame: a shadow drawn at its depth would lie loose on the water).
 */
function stance(ctx, inst) {
  const zm = inst.zm ?? Math.min(ctx.groundZ(inst.fy), FAR_BANK[1]), s = ctx.camera.focal / zm, x0 = inst.ux * ctx.W;
  const shadow = inst.fy >= ctx.hy ? ctx.shadow : () => {};
  return { x0, fy: inst.fy, zm, s, xm: (x0 - ctx.W / 2) / s, shadow, k: inst.size || 1 };
}

// ── The six ────────────────────────

const TRUNK = [0.30, 0.20, 0.12], PINE = [0.08, 0.30, 0.14], BROADLEAF = [0.20, 0.48, 0.16], SNOWCAP = [0.9, 0.9, 0.95];
const CONIFER = /\b(pines?|firs?|spruces?|cedars?)\b/, LEAFY = /\b(oaks?|palms?|birches?)\b/; // the word says which

function tree(ctx, inst) { // a pine: a trunk and three skirts of needles, or a round broadleaf
  const { scene, rand, lit, rect } = ctx, word = inst.instance?.word ?? '';
  const grow = rand(), bySeed = scene.land === 'snow' || scene.things.mountains || rand() < 0.5;
  const pine = CONIFER.test(word) || (!LEAFY.test(word) && bySeed);
  const { x0, fy, zm, s, xm, shadow, k } = stance(ctx, inst);
  const [low, high] = pine ? SIZES.pine : SIZES.broadleaf, hm = lerp(low, high, grow) * k, hgt = hm * s;
  const trunk = lit(TRUNK, 0.6);
  const leaf = inst.colour ?? (ctx.leaf ? ctx.leaf(pine, rand()) : pine ? PINE : BROADLEAF); // hook for ground-weather
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
  const { W, scene, rand, lit, sun, rect, poly } = ctx, { fy, zm, shadow, k } = stance(ctx, inst), C = SIZES.cabin;
  const s = stance(ctx, inst).s * k, w = C.w * s, hgt = C.wall * s, rise = C.rise * s; // a tiny cabin: half in all
  const x0 = clamp(inst.ux * W, w * 0.6, W - w * 0.6), xm = (x0 - W / 2) * k / s;
  const thrown = rand() < 0.5, wall = inst.colour ?? (thrown ? CREAM : BRICK); // the throw is made either way
  const evening = scene.time === 'night' || scene.time === 'sunset', glow = evening ? LAMPLIGHT : DAYGLASS;
  const bright = lit(wall, 0.9), dark = lit(wall, 0.5), snowy = scene.land === 'snow', c = [0, 0, 0];
  shadow(xm, zm, { w: C.w * k, d: C.d * k }, (C.wall + C.rise * 0.5) * k);
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
  const { W, scene, rand, lit, sun, scale, rect, camera } = ctx, B = SIZES.building;
  const { fy, zm, s, shadow, k } = stance(ctx, inst);
  const wm = lerp(B.w[0], B.w[1], rand()) * k;
  let storeys = Math.round(lerp(B.storeys[0], B.storeys[1], rand()) * k);
  const roomAbove = Math.floor((camera.eye + 0.85 * ctx.hy / s) / SIZES.storey); // the storeys that leave some sky
  storeys = Math.max(2, Math.min(storeys, roomAbove));
  const w = wm * s, hgt = storeys * SIZES.storey * s;
  const x0 = clamp(inst.ux * W, w * 0.5, W - w * 0.5), xm = (x0 - W / 2) / s;
  const tone = 0.3 + rand() * 0.4, wall = inst.colour ?? [tone, tone, tone * 1.05];
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

const HULL = [0.85, 0.85, 0.88], MAST = [0.3, 0.2, 0.15], SAIL = [0.95, 0.95, 0.93];

function boat(ctx, inst) { // a hull and a sail, on the water, with a smear of reflection under it
  const { W, rand, put, lit, sun, poly, rect } = ctx, B = SIZES.sailboat;
  const { fy, zm, shadow, k } = stance(ctx, inst), s = stance(ctx, inst).s * k, len = B.hull * (0.9 + rand() * 0.3) * s;
  const x0 = clamp(inst.ux * W, len * 0.55, W - len * 0.55), xm = (x0 - W / 2) * k / s;
  const hull = inst.colour ?? HULL, hh = B.freeboard * s, deck = fy - hh, c = [0, 0, 0];
  shadow(xm, zm, { w: B.hull * k, d: B.beam * k }, (B.freeboard + 0.6) * k);
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

// hook for creatures-flyers: the bird drawer is tools/image/things/creatures.mjs's now (gull, crow, sparrow, bat)

/**
 * The registry entries, in placing order. size is a thing's typical width, height and depth in metres as drawn:
 * place() stands it where it fits the frame and keeps its footprint (w by d) clear of the others', the shore
 * judges whether it fits on the near sand and the far bank takes its depth from it; depth (metres) and band (rows)
 * are the older fields, kept for readers of the shape and used for a registered thing that has no size.
 */
export const drawers = [
  {
    id: 'tree', word: 'trees', match: THINGS.trees, usual: 9, band: [0.03, 0.1], depth: [75, 260],
    size: { w: 12, h: (SIZES.pine[0] + SIZES.pine[1]) / 2, d: 12 }, draw: tree,
  },
  {
    id: 'building', word: 'buildings', match: THINGS.buildings, usual: 11, band: [0.01, 0.05], depth: [150, 700],
    size: { w: SIZES.building.w[1], h: SIZES.building.storeys[1] * SIZES.storey, d: SIZES.building.w[1] * 0.8 },
    draw: building,
  },
  {
    id: 'house', word: 'houses', match: THINGS.houses, usual: 3, band: [0.06, 0.3], depth: [25, 130],
    size: { w: SIZES.cabin.w * 1.12, h: SIZES.cabin.wall + SIZES.cabin.rise, d: SIZES.cabin.d }, draw: house,
  },
  {
    id: 'boat', word: 'boats', match: THINGS.boats, usual: 2, band: [0.03, 0.2], depth: [40, 250], onWater: true,
    size: { w: SIZES.sailboat.hull, h: SIZES.sailboat.mast, d: SIZES.sailboat.beam }, draw: boat,
  },
  // hook for vehicles: the car drawer is tools/image/things/vehicles.mjs's now, with every other vehicle
  // hook for creatures-flyers: the bird row is creatures.mjs's now (the key stays 'birds')
];
