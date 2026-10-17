// The painter's hands and its world, with nothing of Node in it. Two halves:
//
// Primitives: disc, ellipse, poly (convex or simple concave), quad, tri, rect, line. Each one finds, for every pixel
// it can touch, the signed distance from the pixel's centre to the shape's edge and turns it into coverage
// (0.5 - d / soft, clamped), which it passes to ctx.put as the alpha: an edge lands between pixels instead of on a
// stair step, and `soft` above one pixel gives a blurred edge (a shadow under a clouded sky). All clip to the frame
// and none throws on a negative, oversize, infinite or NaN coordinate: a shape that cannot be drawn is skipped.
// The colour may be a function (x, y) -> colour (null to leave the pixel), the alpha a function (x, y) -> alpha.
//
// World: a camera at a standing person's eye height looking level at the horizon, a 50 mm-equivalent lens, so every
// thing is drawn from its size in metres (SIZES) through project() and the ground plane's perspective in the ground
// pass agrees with the things standing on it. The sun is a direction (azimuth from the disc's side of the frame,
// elevation from the time of day); shadow() sweeps a footprint along it onto the ground; sprite() wraps a thing so
// its colours fade with the air and its top edges are kept for the weather to settle on.
import { clamp, lerp } from './math.mjs';
import { thingByKey } from './registry.mjs';

// ── Sizes, in metres ───────────────

/**
 * How big things are, in metres, so a car is 4.5 m long on a 7 m road whatever the picture's size. Each row says
 * where its figure is from: 'typical' is a common value for the kind, not one product; a cite names the source.
 */
export const SIZES = {
  eye: 1.6, // a standing adult's eyes: typical (stature ~1.7 m, the eyes ~0.1 m below the crown)
  person: 1.7, // an adult's height: typical
  // a mid-size hatchback or saloon: typical (VW Golf 8 is 4.28 x 1.79 x 1.46 m; its 205/55 R16 tyre is 0.63 m across)
  car: { l: 4.5, w: 1.8, h: 1.45, wheel: 0.65, wheelbase: 2.7 },
  kart: { l: 1.8, w: 1.2, h: 0.6 }, // a racing kart: typical (CIK-FIA karts run 1.8-2.1 m long)
  lane: 3.5, // one traffic lane: typical (3.5 m in most European standards; a US lane is 12 ft, 3.66 m)
  lanes: 2, // the road is two lanes, one each way
  centreLine: 0.12, // the painted centre line: typical (US MUTCD lines are 4-6 in; 100-150 mm elsewhere)
  dash: { on: 3, period: 12 }, // a broken centre line: US MUTCD 10 ft stroke, 30 ft gap (3 m on, 9 m off): cite
  pine: [15, 25], // a mature Scots pine, Pinus sylvestris, 15-25 m: typical
  broadleaf: [10, 14], // a broadleaf tree in open ground: typical
  storey: 3, // floor to floor: typical (housing 2.7-3 m, offices 3.5-4 m)
  building: { w: [18, 30], storeys: [6, 25], window: { w: 1.2, h: 1.5 } }, // a city tower: typical
  // a one-room cabin, 6 x 4 m, walls to the eave 3 m, the ridge 1.8 m higher: typical; a door leaf 2.04-2.1 m: typical
  cabin: { w: 6, d: 4, wall: 3.0, rise: 1.8, door: { w: 0.9, h: 2.1 }, window: 0.9, sill: 1.4, chimney: 0.5 },
  // a small keelboat: typical; its mainsail runs from a boom 0.9 m over the deck to the masthead, 3.5 m along the foot
  sailboat: { hull: 7, beam: 2.5, freeboard: 0.9, mast: 9, boom: 0.9, foot: 3.5 },
  birdSpan: 1.2, // a herring gull's wingspan 1.2-1.5 m: typical
};
const FRAME_MM = 24; // the height of a full 35 mm frame: what a "50 mm-equivalent" is equivalent on

// ── The camera ─────────────────────

/**
 * A camera `eye` metres up (a standing person's by default), looking level, its horizon on row `hy`, with an `equiv`
 * mm lens on a 24 mm-high frame: focal = H * equiv / 24 pixels. project(xm, zm, hm) is a point xm metres right of
 * the lens axis, zm metres away, hm metres above the ground; it answers its pixel and the pixels per metre at that
 * depth. groundZ(fy) is the depth of a ground pixel row (Infinity on and above the horizon); groundX(px, fy) the
 * metres right of the axis there.
 */
export function camera(W, H, hy, equiv = 50, eye = SIZES.eye) {
  const focal = H * equiv / FRAME_MM;
  const project = (xm, zm, hm = 0) => {
    const z = zm > 0.01 ? zm : 0.01, scale = focal / z;
    return { x: W / 2 + xm * scale, y: hy + (eye - hm) * scale, scale };
  };
  const groundZ = (fy) => (fy > hy ? focal * eye / (fy - hy) : Infinity);
  const groundX = (px, fy) => (px === W / 2 ? 0 : (px - W / 2) * groundZ(fy) / focal);
  return { eye, horizon: hy, focal, equiv, project, groundZ, groundX };
}

/** How much of the frame the subject may take: its height of the rows, its width of the columns (by thing id). */
export const FIT = { height: 0.6, width: 0.5, house: 0.4, boat: 0.12 };
/** Where the near subject stands, as a share of the ground band below the horizon: mid-field, or the near shore. */
export const NEAR_SHARE = { land: 0.45, water: 0.7 };
/** The share of the columns one of `n` things of a kind may take: its kind's share over the square root of n. */
export const fitWidth = (id, n = 1) => (FIT[id] ?? FIT.width) / Math.sqrt(Math.max(1, n));
const EYE_MOST = 12; // metres: the highest the camera climbs (a hillside, a bridge), never a drone's view
const EYE_ON_ROAD = 2.5; // on a road the photographer steps back along it, not up: a step-ladder at most

/**
 * The camera that frames the subject. A level camera draws a thing on the ground (fy - hy) / eye times its height
 * whatever the lens (the focal length cancels: it only says how many metres away a row is), so a 20 m pine 8-18 m
 * from a standing eye is three frames tall and the eye is the lever: a photographer steps back and up until the
 * largest named thing that will stand on the near ground fits FIT.height of the rows and its kind's share of the
 * columns at NEAR_SHARE of the ground band (the near shore of a water scene lies farther down the frame than the
 * middle of a field). A counted few share the columns: each of n may take its kind's share over the square root
 * of n (three beach houses at 0.23 of the width each, not three at 0.4 glued into a terrace). `instances` are the
 * reader's; a kind with no registered drawer, a flyer, a boat on the water and the usual skyline of buildings do
 * not raise the eye. The horizon share is kept. Answers { eye, equiv, near, subject }: near the ground share the
 * fit was made for, subject the kind it was made for (null: nothing asked).
 */
export function frameCamera(scene, instances, { W = 16, H = 9, horizon = 0.58 } = {}) {
  const water = scene.ground === 'water' && scene.beach, near = water ? NEAR_SHARE.water : NEAR_SHARE.land;
  const band = 1 - horizon; // the ground band's share of the rows
  let eye = SIZES.eye, subject = null;
  for (const inst of instances ?? []) {
    if (!(inst.count > 0)) continue;
    const entry = thingByKey(inst.kind);
    if (!entry || entry.sky || entry.onWater || !entry.size) continue;
    if (inst.kind === 'buildings' && inst.usual) continue; // the skyline row stands at the horizon
    const k = inst.size || 1, h = entry.size.h * k, w = entry.size.w * k, wide = fitWidth(entry.id, inst.count);
    const need = Math.max(h * near * band / FIT.height, w * near * band * H / (wide * W));
    if (need > eye) {
      eye = need;
      subject = inst.kind;
    }
  }
  return { eye: Math.min(eye, scene.road ? EYE_ON_ROAD : EYE_MOST), equiv: 50, near, subject };
}

// ── The light ──────────────────────

/** The sun's elevation by time of day, in degrees; the day's runs with how high the disc was drawn. */
export const ELEVATION = { dawn: 10, day: [55, 65], sunset: 8, night: 35 };
const DEG = Math.PI / 180;
const SUN_UP = 3; // degrees: lower than this by the clock, the time of day's own figure stands in for the hour's

/** The sun's elevation at an hour of the clock: a sine over the twelve hours from six to eighteen, `noon` its top. */
export const elevationAt = (hour, noon) => noon * Math.sin(Math.PI * (hour - 6) / 12);

/**
 * The light's direction from the scene: the azimuth is where the disc is across the frame (atan of its offset over
 * the focal length, so a disc left of centre lights from the left and shadows lean right and toward the viewer),
 * the elevation is the hour's when the reader gave one and the sun is up by it (morning 9 lower than noon, golden
 * hour 17 low), else the time of day's (an unknown time counts as day). visible says whether a disc is in the sky
 * to cast shadows at all.
 */
export function sunlight(scene, sun, L, cam, W, horizon) {
  const time = scene.time, byTime = ELEVATION[time] ?? ELEVATION.day;
  let el = byTime;
  if (Array.isArray(byTime)) { // by day the disc is drawn at half to all of the palette's height: higher is steeper
    const share = L.height > 0 ? (horizon - sun.y) / (L.height * horizon) : 1;
    el = byTime[0] + (byTime[1] - byTime[0]) * clamp((share - 0.5) * 2);
  }
  const noon = Array.isArray(byTime) ? el : (ELEVATION.day[0] + ELEVATION.day[1]) / 2;
  const byHour = Number.isFinite(scene.hour) ? elevationAt(scene.hour, noon) : 0;
  if (byHour >= SUN_UP) el = byHour;
  el *= DEG;
  const az = Math.atan((sun.x - 0.5) * W / cam.focal), moon = time === 'night';
  const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  return { az, el, dir, moon, visible: moon || !scene.storm };
}

/** How far a thing `h` metres tall throws its shadow, in metres, under a light `el` radians up. */
export const shadowLength = (h, el) => h / Math.max(Math.tan(el), 1e-3);

/**
 * The ground outline of the shadow of a box: its footprint { w, d } metres, centred at (xm, zm), `lift` metres off
 * the ground and `h` metres tall, swept away from the light. Answers the convex hull as flat [x, z, ...] metres.
 */
export function shadowPoints(az, el, xm, zm, fp, h, lift = 0) {
  const t = 1 / Math.max(Math.tan(el), 1e-3), dx = -Math.sin(az) * t, dz = -Math.cos(az) * t;
  const hw = fp.w / 2, hd = fp.d / 2, pts = [];
  for (const k of [lift, lift + h]) {
    const ox = xm + dx * k, oz = zm + dz * k;
    pts.push(ox - hw, oz - hd, ox + hw, oz - hd, ox + hw, oz + hd, ox - hw, oz + hd);
  }
  return hull(pts);
}

/** The convex hull of flat [x, y, ...] points, counter-clockwise, as flat points (Andrew's monotone chain). */
export function hull(flat) {
  const p = [];
  for (let i = 0; i + 1 < flat.length; i += 2) p.push([flat[i], flat[i + 1]]);
  p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return flat.slice();
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  const out = [];
  for (const q of lower.slice(0, -1).concat(upper.slice(0, -1))) out.push(q[0], q[1]);
  return out;
}

// ── Primitives ─────────────────────

const sane = (v) => v > -1e7 && v < 1e7; // finite and within any frame's reach (NaN fails both)
const alphaAt = (a, fa, x, y) => (fa ? a(x, y) : a);

/** A filled circle of radius r about (cx, cy). */
export function disc(ctx, cx, cy, r, c, a = 1, soft = 1) {
  if (!(r > 0) || !sane(cx) || !sane(cy) || !sane(r)) return;
  if (!(soft >= 1)) soft = 1;
  const { W, H } = ctx, m = soft * 0.5 + 0.5, reach = r + m;
  const Y0 = Math.max(0, Math.floor(cy - reach)), Y1 = Math.min(H - 1, Math.ceil(cy + reach));
  const fn = typeof c === 'function', fa = typeof a === 'function';
  for (let y = Y0; y <= Y1; y++) {
    const dy = y + 0.5 - cy, half = Math.sqrt(Math.max(0, reach * reach - dy * dy));
    const X0 = Math.max(0, Math.floor(cx - half)), X1 = Math.min(W - 1, Math.ceil(cx + half));
    for (let x = X0; x <= X1; x++) {
      const dx = x + 0.5 - cx, cov = clamp(0.5 - (Math.sqrt(dx * dx + dy * dy) - r) / soft);
      if (cov <= 0.002) continue;
      const alpha = alphaAt(a, fa, x + 0.5, y + 0.5) * cov;
      if (alpha <= 0.002) continue;
      const col = fn ? c(x + 0.5, y + 0.5) : c;
      if (col) ctx.put(x, y, col, alpha);
    }
  }
}

/** A filled ellipse with half-axes rx across and ry down. */
export function ellipse(ctx, cx, cy, rx, ry, c, a = 1, soft = 1) {
  if (!(rx > 0) || !(ry > 0) || !sane(cx) || !sane(cy) || !sane(rx) || !sane(ry)) return;
  if (!(soft >= 1)) soft = 1;
  const { W, H } = ctx, m = soft * 0.5 + 0.5;
  const Y0 = Math.max(0, Math.floor(cy - ry - m)), Y1 = Math.min(H - 1, Math.ceil(cy + ry + m));
  const X0 = Math.max(0, Math.floor(cx - rx - m)), X1 = Math.min(W - 1, Math.ceil(cx + rx + m));
  const fn = typeof c === 'function', fa = typeof a === 'function', rx2 = rx * rx, ry2 = ry * ry;
  for (let y = Y0; y <= Y1; y++) {
    const dy = y + 0.5 - cy;
    for (let x = X0; x <= X1; x++) {
      const dx = x + 0.5 - cx, f = (dx * dx) / rx2 + (dy * dy) / ry2;
      // the distance to the edge, as the level set's value over its gradient (exact on a circle, close on an ellipse)
      const g = 2 * Math.sqrt((dx * dx) / (rx2 * rx2) + (dy * dy) / (ry2 * ry2));
      const d = g > 1e-9 ? (f - 1) / g : -Math.min(rx, ry), cov = clamp(0.5 - d / soft);
      if (cov <= 0.002) continue;
      const alpha = alphaAt(a, fa, x + 0.5, y + 0.5) * cov;
      if (alpha <= 0.002) continue;
      const col = fn ? c(x + 0.5, y + 0.5) : c;
      if (col) ctx.put(x, y, col, alpha);
    }
  }
}

/**
 * A filled polygon from flat points [x0, y0, x1, y1, ...], convex or simply concave (even-odd inside). Each row's
 * crossings say which pixels are inside; the pixels within reach of an edge take their coverage from the distance
 * to the nearest edge, the rest take the full alpha.
 */
export function poly(ctx, pts, c, a = 1, soft = 1) {
  const n = pts.length >> 1;
  if (n < 3) return;
  if (!(soft >= 1)) soft = 1;
  const { W, H } = ctx, m = soft * 0.5 + 0.5;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    if (!sane(x) || !sane(y)) return;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const X0 = Math.max(0, Math.floor(x0 - m)), X1 = Math.min(W - 1, Math.ceil(x1 + m));
  const Y0 = Math.max(0, Math.floor(y0 - m)), Y1 = Math.min(H - 1, Math.ceil(y1 + m));
  if (X0 > X1 || Y0 > Y1) return;
  const ax = new Float64Array(n), ay = new Float64Array(n), dx = new Float64Array(n), dy = new Float64Array(n);
  const nx = new Float64Array(n), ny = new Float64Array(n), inv = new Float64Array(n);
  const lo = new Float64Array(n), hi = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ax[i] = pts[i * 2];
    ay[i] = pts[i * 2 + 1];
    dx[i] = pts[j * 2] - ax[i];
    dy[i] = pts[j * 2 + 1] - ay[i];
    const len2 = dx[i] * dx[i] + dy[i] * dy[i], len = Math.sqrt(len2);
    inv[i] = len2 > 0 ? 1 / len2 : 0;
    nx[i] = len > 0 ? -dy[i] / len : 0;
    ny[i] = len > 0 ? dx[i] / len : 0;
    lo[i] = Math.min(ay[i], ay[i] + dy[i]) - m;
    hi[i] = Math.max(ay[i], ay[i] + dy[i]) + m;
  }
  const xs = new Float64Array(n), cand = new Int32Array(n), m2 = m * m;
  const fn = typeof c === 'function', fa = typeof a === 'function';
  for (let y = Y0; y <= Y1; y++) {
    const yc = y + 0.5;
    let nx_ = 0, nc = 0;
    for (let e = 0; e < n; e++) {
      const by = ay[e] + dy[e];
      if ((ay[e] <= yc) !== (by <= yc)) xs[nx_++] = ax[e] + (yc - ay[e]) * dx[e] / dy[e];
      if (inv[e] > 0 && lo[e] <= yc && yc <= hi[e]) cand[nc++] = e;
    }
    if (nx_ === 0 && nc === 0) continue;
    for (let i = 1; i < nx_; i++) { // insertion sort: a handful of crossings
      const v = xs[i];
      let j = i - 1;
      while (j >= 0 && xs[j] > v) {
        xs[j + 1] = xs[j];
        j--;
      }
      xs[j + 1] = v;
    }
    let k = 0;
    for (let x = X0; x <= X1; x++) {
      const xc = x + 0.5;
      while (k < nx_ && xs[k] < xc) k++;
      const inside = (k & 1) === 1;
      let d2 = m2 + 1;
      for (let q = 0; q < nc; q++) {
        const e = cand[q], px = xc - ax[e], py = yc - ay[e];
        const ld = px * nx[e] + py * ny[e];
        if (ld > m || ld < -m) continue;
        let t = (px * dx[e] + py * dy[e]) * inv[e];
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - t * dx[e], ey = py - t * dy[e], dd = ex * ex + ey * ey;
        if (dd < d2) d2 = dd;
      }
      let cov;
      if (d2 > m2) {
        if (!inside) continue;
        cov = 1;
      } else {
        const d = Math.sqrt(d2);
        cov = clamp(0.5 - (inside ? -d : d) / soft);
        if (cov <= 0.002) continue;
      }
      const alpha = alphaAt(a, fa, xc, yc) * cov;
      if (alpha <= 0.002) continue;
      const col = fn ? c(xc, yc) : c;
      if (col) ctx.put(x, y, col, alpha);
    }
  }
}

/** A four-cornered polygon, the corners in order round it. */
export function quad(ctx, x0, y0, x1, y1, x2, y2, x3, y3, c, a = 1, soft = 1) {
  poly(ctx, [x0, y0, x1, y1, x2, y2, x3, y3], c, a, soft);
}

/** A triangle. */
export function tri(ctx, x0, y0, x1, y1, x2, y2, c, a = 1, soft = 1) {
  poly(ctx, [x0, y0, x1, y1, x2, y2], c, a, soft);
}

/** An axis-aligned rectangle from its top-left corner; a negative width or height runs the other way. */
export function rect(ctx, x, y, w, h, c, a = 1, soft = 1) {
  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }
  if (!(w > 0) || !(h > 0) || !sane(x) || !sane(y) || !sane(w) || !sane(h)) return;
  if (!(soft >= 1)) soft = 1;
  const { W, H } = ctx, m = soft * 0.5 + 0.5, x1 = x + w, y1 = y + h;
  const X0 = Math.max(0, Math.floor(x - m)), X1 = Math.min(W - 1, Math.ceil(x1 + m));
  const Y0 = Math.max(0, Math.floor(y - m)), Y1 = Math.min(H - 1, Math.ceil(y1 + m));
  if (X0 > X1 || Y0 > Y1) return;
  const covX = new Float32Array(X1 - X0 + 1);
  for (let px = X0; px <= X1; px++) covX[px - X0] = clamp(0.5 - Math.max(x - px - 0.5, px + 0.5 - x1) / soft);
  const fn = typeof c === 'function', fa = typeof a === 'function';
  for (let py = Y0; py <= Y1; py++) {
    const covY = clamp(0.5 - Math.max(y - py - 0.5, py + 0.5 - y1) / soft);
    if (covY <= 0.002) continue;
    for (let px = X0; px <= X1; px++) {
      const cov = Math.min(covX[px - X0], covY);
      if (cov <= 0.002) continue;
      const alpha = alphaAt(a, fa, px + 0.5, py + 0.5) * cov;
      if (alpha <= 0.002) continue;
      const col = fn ? c(px + 0.5, py + 0.5) : c;
      if (col) ctx.put(px, py, col, alpha);
    }
  }
}

/** A stroke of the given width from (x0, y0) to (x1, y1), its ends round. */
export function line(ctx, x0, y0, x1, y1, width, c, a = 1, soft = 1) {
  if (!sane(x0) || !sane(y0) || !sane(x1) || !sane(y1) || !(width >= 0) || !sane(width)) return;
  if (!(soft >= 1)) soft = 1;
  const { W, H } = ctx, hw = width / 2, m = soft * 0.5 + 0.5, reach = hw + m;
  const X0 = Math.max(0, Math.floor(Math.min(x0, x1) - reach));
  const X1 = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + reach));
  const Y0 = Math.max(0, Math.floor(Math.min(y0, y1) - reach));
  const Y1 = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + reach));
  if (X0 > X1 || Y0 > Y1) return;
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy, inv = len2 > 0 ? 1 / len2 : 0;
  const fn = typeof c === 'function', fa = typeof a === 'function';
  for (let y = Y0; y <= Y1; y++) {
    const py = y + 0.5 - y0;
    for (let x = X0; x <= X1; x++) {
      const px = x + 0.5 - x0;
      let t = (px * dx + py * dy) * inv;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - t * dx, ey = py - t * dy, cov = clamp(0.5 - (Math.sqrt(ex * ex + ey * ey) - hw) / soft);
      if (cov <= 0.002) continue;
      const alpha = alphaAt(a, fa, x + 0.5, y + 0.5) * cov;
      if (alpha <= 0.002) continue;
      const col = fn ? c(x + 0.5, y + 0.5) : c;
      if (col) ctx.put(x, y, col, alpha);
    }
  }
}

/** A bare float canvas with put() and get(), the least a primitive needs: for tests and for painting apart. */
export function canvas(W, H) {
  const data = new Float32Array(W * H * 3);
  const put = (x, y, c, a = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = ((y | 0) * W + (x | 0)) * 3;
    data[i] = lerp(data[i], c[0], a);
    data[i + 1] = lerp(data[i + 1], c[1], a);
    data[i + 2] = lerp(data[i + 2], c[2], a);
  };
  const get = (x, y, out = [0, 0, 0]) => {
    const i = (clamp(y | 0, 0, H - 1) * W + clamp(x | 0, 0, W - 1)) * 3;
    out[0] = data[i];
    out[1] = data[i + 1];
    out[2] = data[i + 2];
    return out;
  };
  return { W, H, data, put, get };
}

// ── On the context ─────────────────

const SHADE = [0.03, 0.03, 0.06]; // what a shadow is painted toward: the sky's blue, not black
const TOP_ALPHA = 0.5; // a pixel put this solidly counts as the thing's own edge, not its shadow or a haze
const OWN_ALPHA = 0.3; // a pixel put this solidly is the thing's own (a gull's one-pixel wing stroke counts)

/**
 * Puts the primitives, the camera, the light, shadow() and sprite() on a paint context (core.mjs calls this once
 * per picture, after the colour helpers). It reads W, H, hy, horizon, L, gloom, scene, sun, scale, air and foot.
 */
export function attach(ctx) {
  const { W, H, hy, L, gloom, scene } = ctx;
  ctx.disc = (cx, cy, r, c, a, soft) => disc(ctx, cx, cy, r, c, a, soft);
  ctx.ellipse = (cx, cy, rx, ry, c, a, soft) => ellipse(ctx, cx, cy, rx, ry, c, a, soft);
  ctx.poly = (pts, c, a, soft) => poly(ctx, pts, c, a, soft);
  ctx.quad = (x0, y0, x1, y1, x2, y2, x3, y3, c, a, soft) => quad(ctx, x0, y0, x1, y1, x2, y2, x3, y3, c, a, soft);
  ctx.tri = (x0, y0, x1, y1, x2, y2, c, a, soft) => tri(ctx, x0, y0, x1, y1, x2, y2, c, a, soft);
  ctx.rect = (x, y, w, h, c, a, soft) => rect(ctx, x, y, w, h, c, a, soft);
  ctx.line = (x0, y0, x1, y1, width, c, a, soft) => line(ctx, x0, y0, x1, y1, width, c, a, soft);

  const framing = ctx.framing, cam = camera(W, H, hy, framing?.equiv, framing?.eye); // frameCamera's choice
  ctx.camera = cam;
  ctx.project = cam.project;
  ctx.groundZ = cam.groundZ;
  ctx.groundX = cam.groundX;

  Object.assign(ctx.sun, sunlight(scene, ctx.sun, L, cam, W, ctx.horizon)); // sun.left stays as it was
  ctx.light = ctx.sun;

  // The shadow of a box { w, d } metres at (xm, zm), `lift` metres up and h tall, on the ground: darker and sharper
  // under a clear sky, fainter toward its far end and the farther away it lies, nothing when no disc is in the sky.
  // It darkens the ground as painted (not through sprite()'s haze, which would turn it the horizon's colour).
  const floor = { W, H, put: ctx.put }, haze = 0.55 + scene.fog * 0.6; // the air's thickness, as ctx.air has it
  ctx.shadow = (xm, zm, fp, h, lift = 0) => {
    const S = ctx.sun;
    if (!S.visible || !(h > 0) || !(zm > 0)) return;
    const far = (1 - clamp(ctx.foot(cam.project(0, zm).y))) * 0.6 * haze; // what the air takes, as it does of the thing
    const strength = 0.35 * gloom * (1 - scene.clouds * 0.6) * (S.moon ? 0.5 : 1) * (1 - far);
    if (strength <= 0.01) return;
    const ground = shadowPoints(S.az, S.el, xm, zm, fp, h, lift), px = [];
    for (let i = 0; i < ground.length; i += 2) {
      const p = cam.project(ground[i], Math.max(0.3, ground[i + 1])); // behind the lens: far below the frame
      px.push(p.x, p.y);
    }
    const reach = shadowLength(h, S.el) + shadowLength(lift, S.el), ux = -Math.sin(S.az), uz = -Math.cos(S.az);
    const along = reach > 0 ? (x, y) => { // fainter the farther along the sweep
      const zg = cam.groundZ(y), t = zg === Infinity ? 0 : ((cam.groundX(x, y) - xm) * ux + (zg - zm) * uz) / reach;
      return strength * (1 - 0.5 * clamp(t));
    } : strength;
    poly(floor, px, SHADE, along, (1 + scene.clouds * 5) * ctx.scale);
  };

  // A thing zm metres away: every colour it puts is seen through that much air, and the top edge it leaves in each
  // column is kept in ctx.tops[id] (an Int16Array over x, -1 where it put nothing) for weather to settle on.
  ctx.tops = [];
  ctx.sprite = (zm, drawFn, id = ctx.tops.length) => {
    const fy = cam.project(0, zm).y, fade = (1 - clamp(ctx.foot(fy))) * 0.6;
    const tops = new Int16Array(W).fill(-1), base = ctx.put, seen = [0, 0, 0], owner = ctx.owner;
    ctx.tops[id] = tops;
    ctx.put = (x, y, c, a = 1) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const xi = x | 0, yi = y | 0;
      if (a >= TOP_ALPHA && (tops[xi] < 0 || yi < tops[xi])) tops[xi] = yi;
      if (owner && a >= OWN_ALPHA) owner[yi * W + xi] = id; // hook for placement-critic: the last painted here owns it
      base(xi, yi, fade > 0 ? ctx.air(c, fade, seen) : c, a);
    };
    try {
      return drawFn();
    } finally {
      ctx.put = base;
    }
  };
}
