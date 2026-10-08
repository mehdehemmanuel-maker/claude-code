// Panelled bodies drawn as their designers draw them: lines first, then skins stretched through sections across them,
// then the skins cut into panels along their shut lines. One way for any body that wraps what it carries (a car, a van,
// a cab; next a hull, a fuselage). The tools are src/nexus/surface.ts's; the figures each body's own (its length,
// width, height, its lines as shares of them, its wheels).
//
// What is drawn:
//   - a side skin from tail to nose, its sections from the rocker up past the shoulder to the top edge, round the nose
//     and the tail to the middle, mirrored (the front and rear faces are its ends);
//   - a hood and a deck lid from that top edge to the middle, crowned, meeting the side skin's edge in one tangent
//     plane (G1: a highlight runs across the shut line unbroken) and their mirrors in another;
//   - a cabin from the belt to the roof, leaning in (tumblehome), its glass and pillars regions of it;
//   - each arch trimmed out of the side skin, concentric with its wheel, its radius the least that clears the tyre
//     wherever it goes: steered through its lock either way and risen through its bump (the room is the critic's: about
//     30 mm past the tyre and 15 mm beside it). Where the lip would stand inside the tyre's face, the skin is flared out
//     round the arch instead of the arch opened up. The arch is derived from how the wheel moves, not drawn;
//   - a wheelhouse liner inside each arch, sized the same way at every depth;
//   - doors, sills, fenders and quarters as regions of the side skin, with shut lines between them; lamps and the
//     grille as regions of its faces.
//
// Every panel is named by what it is for (the arch of the front left wheel, the hood), never by its place in a list,
// so changing a figure re-makes the same panels: there is no naming to break when the shape changes.

import { curvatures, curveAt, fairness, fromEdge, greville, patchAt, patchPoints, pointAt, skinThrough, split, surfaceAt, type Curve, type Patch, type Surface, type UV, type V3 } from './surface';
import type { Part } from './kits';
import type { Lines } from './machines';

/** A wheel as the body sees it: its middle (z its mid-plane's distance out), radius, width, and how it moves. */
export interface WheelAt { name: string; x: number; y: number; z: number; R: number; w: number; /** its lock either way, rad */ steer: number; /** how far it rises in bump, m */ bump: number; /** its tyre's section as drawn, [radius from the axle, offset along it], where known: the sweep then has its shape, rounded at the shoulder, not a square-edged cylinder's */ section?: [number, number][] }
/** What the body must clear inside it: a box, and the room kept over it (an engine under its hood). */
export interface KeepOut { name: string; min: V3; max: V3; room: number; why: string; /** where it stands: in a wheelhouse (a strut and its spring), which its liner stops short of, rather than under the hood */ in?: 'wheelhouse' }
export interface BodyPlan { L: number; W: number; H: number; c: number; lines: Lines; wheels: WheelAt[]; color: number; inside?: KeepOut[] }
/** The rules the body is made by: each a figure a designer would set, typical where not sourced. A practising critic
 *  changes these, never a made body's points (src/nexus/make/critic.ts, and RULE_UPDATES below). */
export interface BodyRules {
  /** room round a moving wheel, m (the critic's) and how many steering angles its sweep is taken at */ room: { radial: number; side: number; poses: number };
  /** how far the arch's lip stands outside the tyre's face where the skin is flared for it, m */ flare: number;
  /** the side's section: the shoulder so far below the belt, the side leaning in so far above it, tucked in so far at
   *  the rocker, rolled in so far to its top edge, m */ side: { shoulder: number; tumble: number; tuck: number; inset: number };
  /** crowns: how much higher the middle than the edges, m */ crown: { hood: number; roof: number; deck: number };
  /** the corners in plan: their radius at the nose and the tail, m, and how square (a superellipse's exponent) */ plan: { nose: number; tail: number; k: number };
  /** stations along the body: their spacing, m, and how many round each end's corner */ stations: { step: number; ends: number };
  /** the cabin: its roof's half-width as a share of the body's, the pillars' width, m */ cabin: { roof: number; pillar: number };
  /** the faces at its ends in side view: each leans back from its most forward line (at so far up its face, a share of
   *  its height) to its top edge by so much, and under it to its foot by so much, m: a bumper's face stands forward of the
   *  hood's or the deck's edge over it (typical of a car since pedestrian-protection rules lengthened its nose), never a
   *  wall from the ground to the hood */ ends: { nose: { at: number; top: number; foot: number }; tail: { at: number; top: number; foot: number } };
  /** a shut line's gap, m */ gap: number;
  /** skins fitted fairly across their stations: a control column to every so many metres of outline, so much weight on
   *  bending (none: forced through every station) */ fit: { step: number; lambda: number } | null;
}
export const BODY_RULES: BodyRules = {
  room: { radial: 0.03, side: 0.015, poses: 7 },
  flare: 0.008,
  side: { shoulder: 0.1, tumble: 0.03, tuck: 0.035, inset: 0.075 },
  crown: { hood: 0.03, roof: 0.035, deck: 0.025 },
  plan: { nose: 0.5, tail: 0.4, k: 2.6 },
  stations: { step: 0.14, ends: 8 },
  cabin: { roof: 0.72, pillar: 0.04 },
  ends: { nose: { at: 0.42, top: 0.13, foot: 0.06 }, tail: { at: 0.5, top: 0.07, foot: 0.06 } },
  gap: 0.004,
  fit: { step: 0.25, lambda: 0.2 },
};
/** The rules' own history: what a practising critic found, what the rule was, what it is now. */
export interface RuleUpdate { n: number; found: string; was: string; now: string; rule: string }
export const RULE_UPDATES: RuleUpdate[] = [
  { n: 1, rule: 'stations', found: 'a body skin forced through every station rippled along its length: up to 4.6 turns of curvature on one line of a hood, 4.2 on a fender (the critic\'s combs, 2026-10-08)', was: 'interpolated through every station', now: 'fitted fairly across its stations: least squares plus a weight on bending, its ends and end tangents kept' },
  { n: 2, rule: 'section', found: 'doors still turned 3.5 times a line, 124 times a door, up and down: each section forced through its points on parameters shared with the pinched sections at the nose', was: 'a curve through each section\'s points', now: 'each section drawn as a convex control polygon (a B-spline never wavers more than its polygon): no turns on any door' },
  { n: 3, rule: 'fit', found: 'practised on the Corolla, an SUV and a van, held out a hatchback, a sports car and a coupe: 0.02 scored 307 and 428. A weight of 0.5, or a control column every 0.35 m, did best on the bodies practised on (149, 150) and worst on those held out (12,208 and 11,179: the smoothed skin ran into the wheels\' sweep), so neither was kept', was: '{"step":0.25,"lambda":0.02}', now: '{"step":0.25,"lambda":0.2} (scored 162 and 224)' },
];

// ---- a wheel's sweep -------------------------------------------------------------------------------------------------
/** The poses a wheel goes through: steered from full lock one way to the other, at rest and at full bump. */
const posesOf = (w: WheelAt, n: number) => { const th = w.steer > 0 ? Array.from({ length: n }, (_, k) => -w.steer + (2 * w.steer * k) / (n - 1)) : [0]; return th; };
/** What a wheel's sweep is made of, worked out once per wheel: its steering poses, and its section's bounds and the
 *  radii where its outline turns (the only places the reach between two radii can be greatest, besides the ends). */
interface Prepared { poses: number[]; sec?: [number, number][]; minR: number; maxR: number; knots: number[] }
const prepared = new WeakMap<WheelAt, Map<number, Prepared>>();
const prep = (w: WheelAt, n: number): Prepared => {
  let m = prepared.get(w); if (!m) { m = new Map(); prepared.set(w, m); } let p = m.get(n);
  if (!p) { const sec = w.section?.length ? w.section : undefined, rs = sec ? sec.map((q) => q[0]) : [0]; p = { poses: posesOf(w, n), sec, minR: Math.min(...rs), maxR: Math.max(...rs), knots: [...new Set(rs)] }; m.set(n, p); }
  return p;
};
/** How far out along its axle a tyre reaches at a distance from it: its section's widest there (a tyre is rounded at
 *  its shoulder: at its tread about 78% of its section's width), or its whole width where its section is not known. */
const reachOf = (w: WheelAt, p: Prepared, rho: number): number => {
  const sec = p.sec; if (!sec) return w.w / 2;
  // (inside its bead, the rim it sits on, as wide as the bead; beyond its tread, the tread's)
  let best = 0; const r = Math.max(p.minR, Math.min(rho, p.maxR));
  for (let k = 0; k + 1 < sec.length; k++) { const r0 = sec[k]![0], z0 = sec[k]![1], r1 = sec[k + 1]![0], z1 = sec[k + 1]![1], lo = r0 < r1 ? r0 : r1, hi = r0 < r1 ? r1 : r0; if (r < lo - 1e-9 || r > hi + 1e-9) continue; const z = hi - lo < 1e-9 ? Math.max(Math.abs(z0), Math.abs(z1)) : Math.abs(z0 + ((z1 - z0) * (r - r0)) / (r1 - r0)); if (z > best) best = z; }
  return best;
};
/** Whether a point is inside the room a wheel needs anywhere through its motion: its tyre's section (or cylinder) grown
 *  by the room asked, steered about the vertical through its middle (a kingpin near the wheel's plane, typical of a
 *  modern car's small scrub radius) and risen anywhere up to its bump. */
export function inSweep(P: V3, w: WheelAt, room = BODY_RULES.room): boolean {
  const RR = w.R + room.radial, dx = P[0] - w.x, dz = P[2] - w.z, lo = P[1] - w.y - w.bump, hi = P[1] - w.y; // (its height over the axle, risen 0…bump)
  // (nothing further from the axle than its radius and room, nor further along it than its half-width and room, can be in it)
  if (dx * dx + dz * dz > (RR + w.w / 2 + room.side) ** 2 || (lo > RR) || (hi < -RR)) return false;
  const pr = prep(w, room.poses);
  for (const th of pr.poses) {
    const t = dx * Math.sin(th) + dz * Math.cos(th); if (Math.abs(t) > w.w / 2 + room.side + 1e-9) continue;
    const d2 = Math.max(0, dx * dx + dz * dz - t * t), yMin = lo <= 0 && hi >= 0 ? 0 : Math.min(lo * lo, hi * hi), yMax = Math.max(lo * lo, hi * hi);
    const rMin = Math.sqrt(d2 + yMin), rMax = Math.min(RR, Math.sqrt(d2 + yMax)); if (rMin > RR) continue;
    // (the widest the tyre reaches anywhere it can be over this point, risen or not)
    let reach = Math.max(reachOf(w, pr, rMin), reachOf(w, pr, rMax)); for (const k of pr.knots) if (k > rMin && k < rMax) reach = Math.max(reach, reachOf(w, pr, k));
    if (Math.abs(t) <= reach + room.side) return true;
  }
  return false;
}

// ---- the body's lines ------------------------------------------------------------------------------------------------
/** A line in side view (or plan), as a designer draws it: a cubic B-spline on a polygon of control points, read as y at
 *  any x. It passes through its first and last points and is pulled toward the rest; it is C2 throughout, and it never
 *  wavers more than its polygon does (a B-spline's variation diminishing property), so a line drawn by a few points has
 *  no ripples between them, as one forced through them would. */
export function lineBy(pts: [number, number][]): (x: number) => number {
  const c: Curve = { P: pts.map(([x, y]) => [x, y, 0] as V3) };
  const n = 600, xs: number[] = [], ys: number[] = []; for (let i = 0; i <= n; i++) { const q = curveAt(c, i / n).at; xs.push(q[0]); ys.push(q[1]); }
  return (x: number) => { if (x <= xs[0]!) return ys[0]!; if (x >= xs[n]!) return ys[n]!; let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m]! <= x) lo = m; else hi = m; } const f = (x - xs[lo]!) / Math.max(1e-9, xs[hi]! - xs[lo]!); return ys[lo]! + (ys[hi]! - ys[lo]!) * f; };
}
/** The smaller of two, blended over so much so the line through them has no corner. */
const softMin = (a: number, b: number, k: number) => { const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k)); return b + (a - b) * h - k * h * (1 - h); };
interface Lined { xN: number; xT: number; xCowl: number; xRoofF: number; xRoofR: number; xDeck: number; xB: number; belt: number; noseH: number; tailH: number; plan: (x: number) => number; low: (x: number) => number; top: (x: number) => number; shoulder: (x: number) => number; roof: (x: number) => number; crownAt: (x: number) => number }
function lined(b: BodyPlan, r: BodyRules): Lined {
  const { L, W, H, c, lines: ln } = b, xN = L / 2, xT = -L / 2, X = (f: number) => L / 2 - f * L, W2 = W / 2;
  const xCowl = X(ln.cowl), xRoofF = X(ln.roofF), xRoofR = X(ln.roofR), xDeck = X(ln.deck), belt = ln.belt * H, noseH = ln.nose * H, tailH = ln.tail * H;
  const front = b.wheels.filter((w) => w.x > 0), rear = b.wheels.filter((w) => w.x <= 0);
  const fA = front.length ? Math.max(...front.map((w) => w.x + w.R)) : xN - 0.6, rA = rear.length ? Math.min(...rear.map((w) => w.x - w.R)) : xT + 0.6;
  // in plan: a rounded rectangle, its corners superellipses (G2 where they meet the straight), flared out round each arch
  // where the tyre's face needs it
  const corner = (d: number, R: number) => (d >= R ? 1 : (1 - (1 - d / R) ** r.plan.k) ** (1 / r.plan.k));
  const plan = (x: number) => {
    let w = W2 * Math.min(corner(xN - x, r.plan.nose), corner(x - xT, r.plan.tail));
    for (const wh of b.wheels) { const need = wh.z + wh.w / 2 + r.room.side + r.flare, reach = wh.R + r.room.radial + 0.25, d = Math.abs(x - wh.x); if (need > W2 * 0.97 && d < reach) { const t = 0.5 + 0.5 * Math.cos((Math.PI * d) / reach), s3 = t * t * (3 - 2 * t); w = Math.max(w, Math.min(W2, need) * s3 + w * (1 - s3)); } }
    return w;
  };
  // the bottom line: the rocker between the arches; the bumpers' lower edges rising to the nose and tail (approach and
  // departure, typical), rolling up under them
  const low = lineBy([[xT, c + 0.2], [xT + 0.08, c + 0.14], [xT + 0.3, c + 0.08], [rA, c + 0.035], [(rA + fA) / 2, c + 0.03], [fA, c + 0.035], [xN - 0.3, c + 0.06], [xN - 0.07, c + 0.1], [xN, c + 0.16]]);
  // the top edge: the hood's line rising from where it rolls down into the nose to the cowl, the belt along the cabin
  // (rising a little to the rear: its wedge), the deck's line to where it rolls down into the tail
  const beltAt = (x: number) => belt + 0.02 * Math.min(1, Math.max(0, (xCowl - x) / Math.max(0.1, xCowl - xDeck)));
  const hoodRun = xN - xCowl, deckY = ln.bed ? beltAt(xDeck) : tailH;
  // what it must clear, as a height over x: an engine and its strut tops under the hood, and each arch with its lip over
  // the tyre risen through its whole bump (a low car's fender rises over its wheel), ramped in and out smoothly so the line lifted over it bends but never kinks
  // (lifting the drawn line's control points would not do: a B-spline only leans toward its points)
  const lip = 0.06, clears: { x0: number; x1: number; y: number }[] = [...(b.inside ?? []).filter((k) => !k.in).map((k) => ({ x0: k.min[0], x1: k.max[0], y: k.max[1] + k.room })), ...b.wheels.map((w) => ({ x0: w.x - w.R * 0.6, x1: w.x + w.R * 0.6, y: w.y + w.R + r.room.radial + w.bump + lip }))];
  const need = (x: number) => { let v = -Infinity; for (const k of clears) { const ramp = 0.18, d = x < k.x0 ? k.x0 - x : x > k.x1 ? x - k.x1 : 0; if (d >= ramp) continue; const g = 0.5 + 0.5 * Math.cos((Math.PI * d) / ramp); v = Math.max(v, k.y - (1 - g) * 0.12); } return v; };
  const drawn = lineBy([
    // (its ends a crisp edge, falling 20 to 30 mm in the last few centimetres where the face leans down from it, not a
    // roll of a hand's height: a hood or deck rolling down into its face is what makes a body read as a bar of soap)
    [xT, deckY - (ln.bed ? 0.02 : 0.03)], [xT + 0.05, deckY - (ln.bed ? 0.005 : 0.008)], [xT + 0.2, deckY], ...(xDeck - xT > 0.6 ? [[(xT + xDeck) / 2 + 0.1, deckY + 0.004] as [number, number]] : []), [xDeck, beltAt(xDeck)],
    [(xDeck + xCowl) / 2, beltAt((xDeck + xCowl) / 2)], [xCowl, beltAt(xCowl)],
    [xCowl + hoodRun * 0.4, noseH + (belt - noseH) * 0.55], [xN - 0.16, noseH + 0.008], [xN - 0.04, noseH - 0.004], [xN, noseH - 0.022],
  ]);
  const top = (x: number) => { const n = need(x); return n === -Infinity ? drawn(x) : -softMin(-drawn(x), -n, 0.04); };
  const shoulder = (x: number) => softMin(top(x) - 0.06, belt - r.side.shoulder, 0.08);
  // the cabin's top line: the windscreen from the cowl, rounding into the roof, the roof, the back glass to the deck
  const wsRun = xCowl - xRoofF, bgRun = xRoofR - xDeck, rb = beltAt(xCowl);
  const roof = lineBy([
    [xDeck, top(xDeck) + 0.004], [xDeck + bgRun * 0.45, top(xDeck) + (H - top(xDeck)) * 0.62], [xRoofR - Math.min(0.1, bgRun * 0.2), H - 0.022], [xRoofR, H - 0.012], [(xRoofF + xRoofR) / 2, H],
    [xRoofF, H - 0.012], [xRoofF + Math.min(0.1, wsRun * 0.2), H - 0.03], [xCowl - wsRun * 0.5, rb + (H - rb) * 0.55], [xCowl, rb + 0.004],
  ]);
  const crownAt = (x: number) => (x >= xCowl ? r.crown.hood : x <= xDeck ? r.crown.deck : 0);
  return { xN, xT, xCowl, xRoofF, xRoofR, xDeck, xB: (xRoofF + xRoofR) / 2, belt, noseH, tailH, plan, low, top, shoulder, roof, crownAt };
}

/** Stations' parameters across a skin: how far along its outline in plan each stands (its length, and its width's
 *  change, together), so every station is a flat section of it and where the outline turns round a nose the skin's
 *  parameter turns with it (a station's place along x alone crowds the nose's whole width into a sliver of the skin, and
 *  what is interpolated there overshoots). */
const outlineLength = (xs: number[], w: (x: number) => number) => { let d = 0; for (let i = 1; i < xs.length; i++) d += Math.hypot(xs[i]! - xs[i - 1]!, w(xs[i]!) - w(xs[i - 1]!)); return d; };
const byOutline = (xs: number[], w: (x: number) => number) => { const d = [0]; for (let i = 1; i < xs.length; i++) d.push(d[i - 1]! + Math.hypot(xs[i]! - xs[i - 1]!, w(xs[i]!) - w(xs[i - 1]!))); const T = d[d.length - 1]! || 1; return d.map((x) => x / T); };
/** Stations along a run: about so far apart, closer round its ends where its corners turn (cosine spaced). */
function stationsOf(x0: number, x1: number, step: number, ends: { at0?: number; at1?: number; n: number }): number[] {
  // (kept exact, never rounded: where an outline turns square to its run at its end, as a nose does, a station a hair
  // short of the end is a whole width short of closing)
  const xs: number[] = [x0, x1];
  if (ends.at0) for (let k = 1; k <= ends.n; k++) xs.push(x0 + ends.at0 * (1 - Math.cos((Math.PI / 2) * (k / ends.n))));
  if (ends.at1) for (let k = 1; k <= ends.n; k++) xs.push(x1 - ends.at1 * (1 - Math.cos((Math.PI / 2) * (k / ends.n))));
  const a = x0 + (ends.at0 ?? 0), b = x1 - (ends.at1 ?? 0), n = Math.max(1, Math.round((b - a) / step)); for (let k = 0; k <= n; k++) xs.push(a + ((b - a) * k) / n);
  const out = xs.filter((x) => x >= x0 && x <= x1).sort((p, q) => p - q), kept: number[] = [];
  for (const x of out) if (!kept.length || x - kept[kept.length - 1]! > 0.004 || x === x1) { if (x === x1 && kept.length && x1 - kept[kept.length - 1]! <= 0.004) kept.pop(); kept.push(x); }
  if (kept[0] !== x0) kept.unshift(x0);
  return kept;
}

const unit3 = (d: V3): V3 => { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
/** The u at which a skin's line of constant v reaches x (its stations run along x, so x rises with u). */
export function uAt(s: Surface, x: number, v = 0.5): number {
  let lo = 0, hi = 1; for (let k = 0; k < 32; k++) { const m = (lo + hi) / 2; if (pointAt(s, m, v)[0] < x) lo = m; else hi = m; } return (lo + hi) / 2;
}

/** The body made: its skins, cut into panels. (The same figures under the same rules make the same body, so a car park
 *  of one model makes it once; each caller gets its own parts, the skins themselves shared, as they are never changed.) */
const made = new Map<string, Part[]>();
// (made once per shape, in a colour no paint has, and painted as asked when copied out: a car park of one model in ten
// colours makes its body once)
const UNPAINTED = 0xfe01fe;
const copy = (color: number) => { const c = (p: Part): Part => ({ ...p, ...(p.color === UNPAINTED ? { color } : {}), parts: p.parts?.map(c) }); return c; };
/** A trial: rules and lines tried on every body made until it is cleared. What a critic uses to show what it would change
 *  (the look page's &rules= and &lines=), so a proposal is seen before it is argued; a maker never sets it, and a rule is
 *  only changed in BODY_RULES after it helps bodies it was not tried on (RULE_UPDATES). */
type Deep<T> = { [K in keyof T]?: T[K] extends object ? Deep<T[K]> : T[K] };
let trial: { rules?: Deep<BodyRules>; lines?: Partial<Lines> } | null = null;
export function tryBody(t: { rules?: Deep<BodyRules>; lines?: Partial<Lines> } | null): void { trial = t; made.clear(); }
const merged = <T>(a: T, b: Deep<T> | undefined): T => { if (!b) return a; const o = { ...(a as object) } as Record<string, unknown>; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' ? merged(o[k], v as Deep<unknown>) : v; return o as T; };
export function bodyPanels(b0: BodyPlan, r0: BodyRules = BODY_RULES): Part[] {
  const r = trial ? merged(r0, trial.rules) : r0, b = trial?.lines ? { ...b0, lines: { ...b0.lines, ...trial.lines } } : b0;
  const key = JSON.stringify([{ ...b, color: 0 }, r]), kept = made.get(key); if (kept) return kept.map(copy(b.color));
  const out = makeBody({ ...b, color: UNPAINTED }, r); if (made.size > 64) made.clear(); made.set(key, out); return out.map(copy(b.color));
}
function makeBody(b: BodyPlan, r: BodyRules): Part[] {
  const ln = lined(b, r), W2 = b.W / 2, col = b.color, out: Part[] = [];
  const paint = (name: string, pt: Patch, more: Partial<Part> = {}): Part => ({ name, shape: { surf: pt }, at: [0, 0, 0], mat: 'steel-low', color: col, shell: 0.0008, make: 'pressed', finish: 'paint', ...more });
  // ---- the side skin ----
  const xs = stationsOf(ln.xT, ln.xN, r.stations.step, { at0: r.plan.tail, at1: r.plan.nose, n: r.stations.ends });
  // round each arch the side is not tucked under: its lip stays outside the tyre's face by the room beside it, so the
  // tyre can rise behind it (a fender's lip is what a raised tyre tucks up inside)
  const tuckAt = (x: number) => { let t = r.side.tuck; for (const w of b.wheels) { const reach = w.R + r.room.radial + 0.25, d = Math.abs(x - w.x); if (d >= reach) continue; const g = 0.5 + 0.5 * Math.cos((Math.PI * d) / reach), s3 = g * g * (3 - 2 * g), allowed = Math.max(0, ln.plan(x) - (w.z + w.w / 2 + r.room.side + 0.002)); t = t - (t - Math.min(t, allowed)) * s3; } return t; };
  // arriving at its top edge going in, at the slope the hood's or deck's crown leaves it (G1 across the shut line); at
  // the very ends, where the section closes to the middle, along itself
  const edgeSlope = (x: number) => { const zt = Math.max(1e-3, ln.plan(x) * (1 - r.side.inset / W2)); return (2 * ln.crownAt(x)) / zt; };
  // (only in the last few centimetres, where the outline closes to the middle, does a section turn to run along itself)
  const closing = (x: number) => Math.min(1, ln.plan(x) / W2 / 0.15), arrive = (x: number): V3 => { const f = closing(x), d: V3 = [0, edgeSlope(x) * f + (1 - f), -f], l = Math.hypot(d[1], d[2]) || 1; return [0, d[1] / l, d[2] / l]; };
  // (a deck lid where there is room for one; where there is not, as a van's, the cabin runs to the tail)
  const deckLid = !b.lines.bed && ln.xDeck - r.gap - ln.xT >= 0.08, xBack = b.lines.bed || deckLid ? ln.xDeck : ln.xT;
  // (the cabin begins where its roof has risen over the belt, by 30 mm at least: where a wheel's haunch lifts the belt as
  // high as the roof falling to the deck, what lies flat there is the deck lid's, not a cabin folded flat; a bed's cab
  // keeps its back where the bed begins)
  let xCab = xBack; if (!b.lines.bed) while (xCab < ln.xRoofR - 0.1 && ln.roof(xCab) - ln.top(xCab) < 0.03) xCab += 0.01;
  // each section drawn as its control polygon, bottom to top: tucked in at the rocker, out through the lower door to the
  // shoulder (two points at its widest, so it is held there), leaning in above it, and rolled over to the top edge along
  // the direction the hood leaves it. A B-spline never wavers more than its polygon, so a convex polygon makes a section
  // with no ripple in it, whatever its neighbours are like.
  const section = (x: number): V3[] => {
    // (convex as drawn: each leg of it leans in more than the one below it, from the tuck under to the roll over the top)
    const w = ln.plan(x), f = w / W2, lo = ln.low(x), top = ln.top(x), sh = Math.max(lo + 0.08, ln.shoulder(x)), tk = tuckAt(x), d = sh - lo, zt = w - r.side.inset * f, hand = Math.min(0.03, 0.3 * (top - sh)) * Math.max(0.15, f);
    const ar = arrive(x);
    // (its sill a tight turn under the door's foot, the door upright above it, its shoulder a crisp line: the widest two
    // points 30 mm apart, so a highlight runs along it)
    return [[x, lo, w - tk * f], [x, lo + Math.min(0.045, 0.15 * d), w - tk * 0.4 * f], [x, lo + 0.5 * d, w - tk * 0.08 * f], [x, sh - 0.015, w + 0.004 * f], [x, sh + 0.015, w + 0.004 * f], [x, sh + 0.015 + 0.6 * (top - sh - 0.015), w - r.side.tumble * 0.4 * f], [x, top - hand * ar[1], zt - hand * ar[2]], [x, top, zt]];
  };
  // each end's face leaned back from its most forward line, above it and below (in side view a bumper stands forward of
  // the hood's edge and the chin under it), easing in from where the plan begins to turn round the corner: every point
  // of a section moved back along the body by its height up its face, so the face is a curve in side view, not a wall
  // (and the plan's corner tighter at the hood's edge than at the bumper's, as a car's is)
  const leanOf = (e: { at: number; top: number; foot: number }, t: number) => (t > e.at ? e.top * ((t - e.at) / (1 - e.at)) ** 2 : e.foot * ((e.at - t) / e.at) ** 2);
  const ease = (d: number, R: number) => { const t = Math.max(0, Math.min(1, 1 - d / R)); return t * t * (3 - 2 * t); };
  const leaned = (x: number, row: V3[]): V3[] => {
    const fN = ease(ln.xN - x, r.plan.nose), fT = ease(x - ln.xT, r.plan.tail); if (fN <= 0 && fT <= 0) return row;
    const lo = row[0]![1], hi = row[row.length - 1]![1], h = Math.max(1e-3, hi - lo);
    return row.map((P) => { const t = (P[1] - lo) / h; return [P[0] - fN * leanOf(r.ends.nose, t) + fT * leanOf(r.ends.tail, t), P[1], P[2]] as V3; });
  };
  const rows = xs.map((x) => leaned(x, section(x)));
  const fitOf = (xs2: number[]) => (r.fit ? { n: Math.max(5, Math.round(outlineLength(xs2, ln.plan) / r.fit.step)), lambda: r.fit.lambda } : undefined);
  const uo = byOutline(xs, ln.plan), skinOf = (rs: V3[][]) => skinThrough(rs, { mirror: true, control: true, u: uo, e0: [0, 0, 1], e1: [0, 0, -1], fit: fitOf(xs) });
  // (its length its published length: the faces leaned back, the skin is measured at each end and the leaned stations
  // moved out by what it falls short, as the ends ease in, so its nose and tail are where its figures put them)
  let side = skinOf(rows);
  {
    let xMax = -Infinity, xMin = Infinity; for (let i = 0; i <= 40; i++) for (let j = 0; j <= 24; j++) { const P0 = pointAt(side, 1 - (0.15 * i) / 40, j / 24), P1 = pointAt(side, (0.15 * i) / 40, j / 24); xMax = Math.max(xMax, P0[0]); xMin = Math.min(xMin, P1[0]); }
    const dN = ln.xN - xMax, dT = xMin - ln.xT;
    if (dN > 1e-4 || dT > 1e-4) side = skinOf(rows.map((row, i) => { const x = xs[i]!, fN = ease(ln.xN - x, r.plan.nose), fT = ease(x - ln.xT, r.plan.tail); return row.map((P) => [P[0] + fN * Math.max(0, dN) - fT * Math.max(0, dT), P[1], P[2]] as V3); }));
  }
  // where on the skin each line of its sections runs: the parameter under each control point (its Greville abscissa)
  const gv = greville(rows[0]!.length, 3), sv = [0, gv[1]!, gv[2]!, (gv[3]! + gv[4]!) / 2, gv[5]!, 1];
  const vSill = sv[1]!, U = (x: number) => uAt(side, x, sv[3]!);
  // ---- each arch: concentric with its wheel, the least radius that clears its sweep on the skin ----
  const archOf = (w: WheelAt): { line: UV[]; Ra: number } => {
    const trimAt = (Ra: number) => { const pts: UV[] = [], u0 = U(w.x - Ra - 0.01), u1 = U(w.x + Ra + 0.01), n = 72;
      for (let k = 0; k <= n; k++) { const u = u0 + ((u1 - u0) * k) / n, P = pointAt(side, u, 0), dx = P[0] - w.x; if (Math.abs(dx) >= Ra) { pts.push([u, 0]); continue; }
        const yT = w.y + Math.sqrt(Ra * Ra - dx * dx); let lo = 0, hi = 1; if (pointAt(side, u, 1)[1] <= yT) { pts.push([u, 1]); continue; } if (pointAt(side, u, 0)[1] >= yT) { pts.push([u, 0]); continue; }
        for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2; if (pointAt(side, u, m)[1] < yT) lo = m; else hi = m; } pts.push([u, hi]); }
      return pts; };
    let Ra = w.R + r.room.radial;
    for (let tries = 0; tries < 40; tries++) {
      const line = trimAt(Ra); let hit = false;
      for (let k = 0; k < line.length && !hit; k++) { const [u, v0] = line[k]!; for (let j = 0; j <= 16 && !hit; j++) { const v = v0 + ((1 - v0) * j) / 16; if (inSweep(pointAt(side, u, v), w, r.room)) hit = true; } }
      // (clear: and 5 mm more, so what is between the points looked at is clear too)
      if (!hit) return { line: trimAt(Ra + 0.005), Ra: Ra + 0.005 }; Ra += 0.005;
    }
    return { line: trimAt(Ra), Ra };
  };
  const right = b.wheels.filter((w) => w.z > 0), arches = right.map((w) => ({ w, ...archOf(w) })).sort((p, q) => p.w.x - q.w.x);
  // ---- shut lines: the doors between the arches, under the cabin ----
  const fr = arches.filter((a) => a.w.x > 0), rr = arches.filter((a) => a.w.x <= 0);
  const fArchRear = fr.length ? Math.min(...fr.map((a) => a.w.x - a.Ra)) : ln.xCowl, rArchFront = rr.length ? Math.max(...rr.map((a) => a.w.x + a.Ra)) : ln.xRoofR;
  const xFD = Math.min(ln.xCowl + 0.05, fArchRear - 0.1), g = r.gap / 2, open = !!b.lines.open; let xRD = Math.max(rArchFront + 0.04, ln.xRoofR - 0.2);
  // its doors: two a side where it has them (its maker's count, else by its length), or one long one (a coupe's, about
  // 1.15 m: typical), the rear quarter running forward to meet it
  const doors = !b.lines.bed && xFD - xRD > 0.6, twoDoors = doors && (b.lines.doors ? b.lines.doors === 2 : xFD - xRD > 1.6);
  if (doors && !twoDoors) xRD = Math.max(xRD, xFD - 1.15);
  // (the B pillar between the doors by their lengths, the front one a little longer (typical), not by the roof: a short
  // car's rear arch would otherwise leave its rear door a hand's width)
  const xB = twoDoors ? xRD + 0.47 * (xFD - xRD) : ln.xB;
  // a panel trimmed round the arches in its run: its bottom edge along v = 0, rising round each arch and falling back
  const trimmed = (u0: number, u1: number): UV[] => { const pts: UV[] = [[u0, 0]]; for (const a of arches) for (const q of a.line) if (q[0] > u0 && q[0] < u1) pts.push(q); pts.push([u1, 0]); return pts.sort((p, q) => p[0] - q[0]); };
  const uFD = U(xFD), uRD = U(xRD), du = (x: number) => U(x + g) - U(x - g);
  // ---- its faces' openings, laid out first, so the panels round them are cut to leave them open ----
  // (laid out along the face's most forward line, where it does not lean: a lamp or a grille a few centimetres from the nose
  // is found there, not on the shoulder, which leans back from it)
  const vF = gv[2]!, UF = (x: number) => uAt(side, x, vF), uN = (d: number) => UF(ln.xN - d), uTl = (d: number) => UF(ln.xT + d), fc = { lamp: 0.1, grille: 0.08, ...(b.lines.face ?? {}) };
  // (the skin's sections rise with v, so the v at a height is found by halving)
  const vAt = (u: number, y: number) => { let lo = 0, hi = 1; for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (pointAt(side, u, m)[1] < y) lo = m; else hi = m; } return (lo + hi) / 2; };
  // (and the u where the face, round its corner, is so far off the middle: a grille's or a lamp's inner end)
  const uZ = (z: number, front: boolean) => { let lo = front ? UF(ln.xN - r.plan.nose - 0.2) : 0, hi = front ? 1 : UF(ln.xT + r.plan.tail + 0.2); for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2, zm = pointAt(side, m, vF)[2]; if (front ? zm > z : zm < z) lo = m; else hi = m; } return (lo + hi) / 2; };
  const quad = (a0: number, a1: number, b0: number, b1: number): [UV, UV, UV, UV] => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
  interface Win { u0: number; u1: number; v0: number; v1: number }
  const fArch = arches.filter((a) => a.w.x > 0), rArch = arches.filter((a) => a.w.x <= 0);
  // the front: its headlamps from half a metre back along the side round the corner to the grille, up to the hood's
  // edge, as tall as its kind's; the grille between them (an SUV's or a pickup's taller and wider than a sedan's); the
  // lower intake in the bumper under its shut line
  const yTopF = pointAt(side, uN(0.08), 1)[1], uMidF = uN(0.22), lampBot = yTopF - 0.02 - fc.lamp, gShare = 0.25 + 0.3 * Math.min(1, fc.grille / 0.3);
  // (its lamps reaching back along the side no further than 80 mm short of the front arch, on a short nose)
  const fArchFront = fArch.length ? Math.max(...fArch.map((a) => a.w.x + a.Ra)) : -Infinity, rArchBack = rArch.length ? Math.min(...rArch.map((a) => a.w.x - a.Ra)) : Infinity;
  const uG = uZ(W2 * gShare, true), hl0 = Math.max(uN(0.5), U(fArchFront + 0.08)), hb0 = vAt(uMidF, lampBot), gv0 = vAt(uN(0.01), yTopF - 0.012 - fc.grille);
  const yBF = Math.min(lampBot, yTopF - 0.012 - fc.grille) - 0.035, lowN = ln.low(ln.xN - 0.05), iH = Math.min(0.1 + 0.3 * fc.grille, yBF - 0.06 - (lowN + 0.04));
  const uI = uZ(W2 * Math.min(0.62, gShare + 0.22), true), vI0 = vAt(uN(0.01), lowN + 0.04), vI1 = vAt(uN(0.01), lowN + 0.04 + Math.max(0.05, iH));
  // (each up to just under the roll of the top edge into the hood, 12 mm under it: set in along a surface turning tighter
  // than its depth, its back would fold through itself)
  // (12 mm under the top edge all along the window, not only where it was measured: the edge falls toward the nose, and a
  // window as high as the edge is there would leave the hood's edge over nothing)
  const vUnder = (u0: number, u1: number, d: number) => Math.min(...Array.from({ length: 9 }, (_, k) => { const u = u0 + ((u1 - u0) * k) / 8; return vAt(u, pointAt(side, u, 1)[1] - d); }));
  const vTopF = Math.min(vAt(uMidF, yTopF - 0.012), vUnder(hl0, uG, 0.012)), lampW: Win = { u0: hl0, u1: uG, v0: hb0, v1: vTopF }, grilleW: Win = { u0: uG, u1: 1, v0: Math.min(gv0, hb0), v1: Math.min(vAt(uN(0.01), yTopF - 0.012), vUnder(uG, 1, 0.012)) }, intakeW: Win = { u0: uI, u1: 1, v0: vI0, v1: vI1 };
  // the back: its tail lamps round the corners, under the deck's edge, from the tail's face out along the sides; the
  // valance low across the bumper
  const yTopT = pointAt(side, uTl(0.08), 1)[1], uMidT = uTl(0.22), tb0 = vAt(uMidT, yTopT - 0.03 - 0.12), lowT = ln.low(ln.xT + 0.05);
  const tailW: Win = { u0: uZ(W2 * 0.5, false), u1: Math.min(uTl(0.45), U(rArchBack - 0.08)), v0: tb0, v1: vAt(uMidT, yTopT - 0.015) }, valW: Win = { u0: 0, u1: uTl(0.35), v0: vAt(uTl(0.01), lowT + 0.025), v1: vAt(uTl(0.01), lowT + 0.085) };
  const fWins = [lampW, grilleW, intakeW], tWins = [tailW, valW];
  // a panel round openings: its run in slabs along u, each from its foot (round the arches in it) up to its top, less the
  // openings over that slab
  const region = (name: string, u0: number, u1: number, wins: Win[], more: Partial<Part>, end?: { at: 0 | 1; meets: Part['meets'] }): Part[] => {
    const cuts = [...new Set([u0, u1, ...wins.flatMap((w) => [w.u0, w.u1]).filter((u) => u > u0 + 1e-6 && u < u1 - 1e-6)])].sort((p, q) => p - q), res: Part[] = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i]!, c = cuts[i + 1]!, mid = (a + c) / 2, ex = wins.filter((w) => w.u0 <= mid && w.u1 >= mid).map((w) => [w.v0, w.v1] as [number, number]).sort((p, q) => p[0] - q[0]);
      const m2 = end && ((end.at === 1 && c > 1 - 1e-6) || (end.at === 0 && a < 1e-6)) ? { ...more, meets: end.meets } : more;
      res.push(paint(name, { s: side, above: trimmed(a, c), ...(ex.length ? { to: ex[0]![0] } : {}) }, m2));
      for (let k = 0; k < ex.length; k++) { const top = k + 1 < ex.length ? ex[k + 1]![0] : 1; if (top - ex[k]![1] > 1e-4) res.push(paint(name, { s: side, uv: quad(a, c, ex[k]![1], top) }, m2)); }
    }
    return res;
  };
  const fMeets = { at: 1 as const, meets: [{ part: 'front fender', edge: 'a1' as const, kind: 'mirror' as const, why: 'its nose crosses the middle in one tangent plane, or a ridge runs down its face' }] }, tMeets = { at: 0 as const, meets: [{ part: 'rear quarter panel', edge: 'a0' as const, kind: 'mirror' as const, why: 'its tail crosses the middle in one tangent plane' }] };
  if (doors) {
    out.push(...region('front fender', uFD + du(xFD), 1, fWins, { says: 'its front fenders, and the nose and front bumper they run into, open for its lamps, grille and intake: pressed steel about 0.8 mm (typical of car skins); each arch round its wheel by how far the wheel steers and rises' }, fMeets));
    out.push(...region('rear quarter panel', 0, uRD - du(xRD), tWins, { says: 'its rear quarters and the tail, open for its lamps: pressed steel about 0.8 mm (typical)' }, tMeets));
    out.push(paint('sills', { s: side, uv: [[uRD, 0], [uFD, 0], [uFD, vSill - 0.004], [uRD, vSill - 0.004]] }, { shell: 0.0012, says: 'the sills under the doors (rocker panels): pressed steel, thicker (typical)' }));
    const door = (name: string, x0: number, x1: number) => paint(name, { s: side, uv: [[U(x0 + g), vSill], [U(x1 - g), vSill], [U(x1 - g), 1], [U(x0 + g), 1]] }, { says: 'a door skin: pressed steel about 0.8 mm, between its shut lines (4 mm gaps, typical)' });
    if (twoDoors) out.push(door('front doors', xB, xFD), door('rear doors', xRD, xB)); else out.push(door('doors', xRD, xFD));
    // a handle near each door's back edge, a little under its shoulder, standing a few millimetres proud (typical)
    // (each handle a bar on the door, in a dark pocket pressed into it for the fingers: the pocket a region of the skin,
    // the bar a part standing just off it on each side)
    for (const x1 of twoDoors ? [xB, xRD] : [xRD]) {
      out.push({ name: 'door handle pockets', shape: { surf: { s: side, uv: [[U(x1 + 0.06), sv[3]! - 0.062], [U(x1 + 0.25), sv[3]! - 0.062], [U(x1 + 0.25), sv[3]! - 0.018], [U(x1 + 0.06), sv[3]! - 0.018]], off: 0.0008 } }, at: [0, 0, 0], mat: 'abs', color: 0x1a1b1d, shell: 0.002, finish: 'texture', kg: 0, joins: ['front doors', 'rear doors'], says: 'the pocket under each door handle (typical)' });
      const q = surfaceAt(side, U(x1 + 0.155), sv[3]! - 0.04);
      for (const e of [1, -1]) out.push({ name: 'door handle', shape: { capsule: [0.011, 0.11] }, at: [q.at[0] + q.n[0] * 0.012, q.at[1] + q.n[1] * 0.012, e * (q.at[2] + q.n[2] * 0.012)], rot: [0, 0, Math.PI / 2], mat: 'abs', color: col, shell: 0.002, finish: 'paint', joins: ['front doors', 'rear doors', 'door handle pockets'], says: 'a door handle (typical)' });
    }
  } else out.push(...region('body sides', 0, 1, [...fWins, ...tWins], { says: 'its sides, open for its lamps, grille and intake: pressed steel about 0.8 mm (typical)' }));
  // (a pickup's bed a box of its own behind the cab, a gap between them: drawn as a shut line down the side at the cab's back)
  if (b.lines.bed) { const ub = U(ln.xDeck - 0.012), dub = du(ln.xDeck) * 1.5; out.push({ name: 'cab to bed gap', shape: { surf: { s: side, uv: [[ub - dub, 0], [ub + dub, 0], [ub + dub, 1], [ub - dub, 1]], off: 0.0006 } }, at: [0, 0, 0], mat: 'rubber', color: 0x0b0b0c, shell: 0.001, finish: 'texture', kg: 0, says: 'the gap between its cab and its bed (typical)' }); }
  // ---- its faces in their openings: each a recess, its back set in along the skin's normal and its walls from the opening's
  // edge down to it (a lamp's housing, a grille's throat), built on the skin itself so it meets the panels round it ----
  // (skip: where its side wall at u0 is a neighbour's, from that v up)
  const recess = (name: string, w: Win, deep0: number, back: Partial<Part>, says: string, kids: Part[] | ((deep: number) => Part[]) = [], skip: { u0?: number } = {}): Part => {
    // (no deeper than three quarters of the tightest radius the skin turns through in the opening, so its back, set in
    // along the skin's normal, never folds through itself)
    let rmin = Infinity; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 6; j++) { const sp = surfaceAt(side, w.u0 + ((w.u1 - w.u0) * i) / 8, w.v0 + ((w.v1 - w.v0) * j) / 6), c = curvatures(sp); const k = Math.max(Math.abs(c.k1), Math.abs(c.k2)); if (k > 1e-9) rmin = Math.min(rmin, 1 / k); }
    const deep = Math.min(deep0, 0.75 * rmin);
    const edge = (a: UV, c: UV): Surface => { const N = 24; return { net: Array.from({ length: N + 1 }, (_, k) => { const u = a[0] + ((c[0] - a[0]) * k) / N, v = a[1] + ((c[1] - a[1]) * k) / N, q = surfaceAt(side, u, v); return [q.at, [q.at[0] - q.n[0] * deep, q.at[1] - q.n[1] * deep, q.at[2] - q.n[2] * deep]] as V3[]; }), p: 1, q: 1, mirror: true }; };
    const walls = [edge([w.u0, w.v0], [w.u1, w.v0]), edge([w.u0, w.v1], [w.u1, w.v1]), ...(w.u0 > 1e-6 && Math.min(w.v1, skip.u0 ?? w.v1) - w.v0 > 1e-4 ? [edge([w.u0, w.v0], [w.u0, Math.min(w.v1, skip.u0 ?? w.v1)])] : []), ...(w.u1 < 1 - 1e-6 ? [edge([w.u1, w.v0], [w.u1, w.v1])] : [])];
    return { name, at: [0, 0, 0], says, parts: [
      { name: `${name} back`, shape: { surf: { s: side, uv: quad(w.u0, w.u1, w.v0, w.v1), off: -deep } }, at: [0, 0, 0], mat: 'pp', color: 0x15161a, shell: 0.002, finish: 'texture', kg: 0, ...back },
      // (its walls drawn in from the opening's edge: one pressing or moulding with the skin there)
      ...walls.map((sw) => ({ name: `${name} wall`, shape: { surf: { s: sw } }, at: [0, 0, 0] as V3, mat: 'pp', color: 0x111214, shell: 0.002, finish: 'texture', kg: 0, joins: ['front fender', 'rear quarter panel', 'body sides', 'front bumper', 'rear bumper'] })), ...(typeof kids === 'function' ? kids(deep) : kids)] };
  };
  // a part standing on the skin along its normal at (u, v), set in by `inset`, its axis (+y) out along the normal; on each side
  const onSkin = (name: string, shape: Part['shape'], u: number, v: number, inset: number, more: Partial<Part>): Part[] => [1, -1].map((e) => {
    const q = surfaceAt(side, u, v), n: V3 = [q.n[0], q.n[1], e * q.n[2]], y = unit3(n), ref: V3 = Math.abs(y[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
    const x = unit3([y[1] * ref[2] - y[2] * ref[1], y[2] * ref[0] - y[0] * ref[2], y[0] * ref[1] - y[1] * ref[0]]), z: V3 = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    const ey = Math.asin(Math.max(-1, Math.min(1, z[0]))), rot: V3 = Math.abs(z[0]) < 0.9999999 ? [Math.atan2(-z[1], z[2]), ey, Math.atan2(-y[0], x[0])] : [Math.atan2(y[2], y[1]), ey, 0];
    return { name, shape, at: [q.at[0] - n[0] * inset, q.at[1] - n[1] * inset, e * q.at[2] - n[2] * inset], rot, ...more } as Part;
  });
  const lit = (name: string, uv: [UV, UV, UV, UV], off: number, color: number, says: string): Part => ({ name, shape: { surf: { s: side, uv, off } }, at: [0, 0, 0], mat: 'pc', color, glow: true, shell: 0.002, kg: 0, says });
  // a seam: the dark line of a shut line drawn where one panel meets the next on the same skin (4 mm, typical)
  const seam = (name: string, a0: number, a1: number, v: number, says: string): Part => ({ name, shape: { surf: { s: side, uv: quad(a0, a1, v - 0.0025, v + 0.0025), off: 0.0006 } }, at: [0, 0, 0], mat: 'rubber', color: 0x0b0b0c, shell: 0.001, finish: 'texture', kg: 0, says });
  const slats = (name: string, w: Win, n: number, off: number, color: number, finish: string): Part[] => Array.from({ length: n }, (_, k) => { const f0 = (k + 0.62) / (n + 0.5), hv = (w.v1 - w.v0) / (n + 0.5); return { name, shape: { surf: { s: side, uv: quad(w.u0 + 0.004, w.u1, w.v0 + hv * (k + 0.55), w.v0 + hv * (k + 0.55) + hv * 0.32), off } }, at: [0, 0, 0] as V3, mat: 'abs', color, shell: 0.003, finish, kg: 0, says: f0 > 2 ? '' : undefined }; });
  {
    // a headlamp: a dark housing, a chrome reflector across its middle, a projector each for the low and the high beam (a
    // bowl, its lens in a dark ring, set in along the skin's normal), a light guide along its foot lit as its daytime
    // running light; under a clear lens flush with the body (typical of a modern car's LED lamp)
    const wl = lampW.u1 - lampW.u0, hh = lampW.v1 - lampW.v0, rp0 = Math.min(0.034, 0.3 * fc.lamp), vMid = lampW.v0 + hh * 0.5;
    // (each as big as the lamp has room for where it stands, a fifth of its height clear above and below, and as deep as
    // the housing is, its bowl's foot 12 mm off the housing's back)
    const projector = (deep: number, k: number): Part[] => { const u = lampW.u0 + wl * k, room = Math.hypot(...(pointAt(side, u, lampW.v1).map((x, i) => x - pointAt(side, u, lampW.v0)[i]!) as V3)), bd = Math.max(0.006, Math.min(0.024, deep - 0.02)), rp = Math.min(rp0, room * 0.3, bd * 1.6), pin = Math.max(0.012, deep - bd - 0.012); return [
      ...onSkin('projector bowl', { lathe: [[0.004, -bd], [rp * 0.5, -bd * 0.88], [rp * 0.86, -bd * 0.5], [rp, 0]] }, u, vMid, pin, { mat: 'al-6061', color: 0xd4d8dc, finish: 'chrome', kg: 0 }),
      ...onSkin('projector lens', { lathe: [[0, 0.011], [rp * 0.42, 0.008], [rp * 0.6, 0.002], [rp * 0.6, -0.004]] }, u, vMid, pin, { mat: 'glass', color: 0xe8f0ff, kg: 0 }),
      ...onSkin('projector ring', { lathe: [[rp * 0.6, -0.004], [rp * 0.62, 0.003], [rp * 0.74, 0.004], [rp * 0.76, -0.006]] }, u, vMid, pin, { mat: 'pp', color: 0x16171a, finish: 'texture', kg: 0, joins: ['projector lens'] })]; };
    out.push(recess('headlamp', lampW, 0.05, { color: 0x24272c }, 'its headlamps\' housings, open behind their lenses (typical)', (deep) => [
      { name: 'headlamp reflector', shape: { surf: { s: side, uv: quad(lampW.u0 + wl * 0.12, lampW.u1 - wl * 0.06, lampW.v0 + hh * 0.2, lampW.v1 - hh * 0.18), off: -deep + Math.min(0.004, deep * 0.15) } }, at: [0, 0, 0], mat: 'al-6061', color: 0xc8ccd2, shell: 0.001, finish: 'chrome', kg: 0, says: 'a chrome reflector in the housing (typical)' },
      ...projector(deep, 0.38), ...projector(deep, 0.66),
      lit('daytime running light', quad(lampW.u0 + wl * 0.06, lampW.u1 - wl * 0.03, lampW.v0 + hh * 0.07, lampW.v0 + hh * 0.115), -Math.min(0.01, deep * 0.3), 0xf4f8ff, 'its daytime running light: an LED light guide along the lamp\'s foot (typical)')]));
    out.push({ name: 'headlights', shape: { surf: { s: side, uv: quad(lampW.u0, lampW.u1, lampW.v0, lampW.v1), off: 0.0005 } }, at: [0, 0, 0], mat: 'pc', color: 0xe6ecf2, shell: 0.003, light: { lm: 1500, color: 0xfff4e0 }, says: 'its headlamps\' lenses, flush with the body: clear polycarbonate (typical)', fixed: 'bonded to its housing', joins: ['headlamp wall'] });
    // the grille: its throat dark, its bars across it gloss black, a bright strip along its top (typical of a sedan's)
    out.push(recess('grille', grilleW, 0.05, {}, 'its upper grille between the headlamps: moulded ABS, its throat open to the radiator behind (typical)', (deep) => [...slats('grille bar', grilleW, Math.max(2, Math.round(fc.grille / 0.04)), -Math.min(0.012, deep * 0.4), 0x0d0e10, 'paint'),
      { name: 'grille trim', shape: { surf: { s: side, uv: quad(grilleW.u0 + 0.004, 1, grilleW.v1 - (grilleW.v1 - grilleW.v0) * 0.16, grilleW.v1 - (grilleW.v1 - grilleW.v0) * 0.08), off: -Math.min(0.006, deep * 0.2) } }, at: [0, 0, 0], mat: 'abs', color: 0xc0c4ca, shell: 0.002, finish: 'chrome', kg: 0, says: 'a chrome strip along its grille (typical)' }], { u0: lampW.v0 }));
    out.push(recess('lower grille', intakeW, 0.06, {}, 'the lower intake in its front bumper: its throat open, bars across it (typical)', (deep) => slats('lower grille bar', intakeW, 3, -Math.min(0.014, deep * 0.4), 0x111214, 'texture')));
    // (where its number plate goes: on the bumper over the intake's middle, a plate's height above its foot)
    const uP = 1, vP = vAt(uN(0.005), lowN + 0.04 + Math.max(0.05, iH) + 0.06); out.push({ name: 'plate mount', at: pointAt(side, uP, vP), shape: { box: [0.004, 0.08, 0.3] }, mat: 'pp', color: 0x111214, finish: 'texture', kg: 0, joins: ['front fender'], says: 'its front number plate\'s bracket (typical)' });
    // (its bumper cover: the face below a shut line under the lamps and the grille, round to the front arches)
    const uB0 = fArch.length ? U(Math.max(...fArch.map((a) => a.w.x + a.Ra)) + 0.03) : uN(0.6);
    out.push(seam('front bumper shut line', uB0, 1, vAt(uMidF, yBF), 'where its front bumper cover meets the fenders (typical)'));
  }
  {
    // the back: each tail lamp a recess, red within, its light lit along it, under a red lens flush with the body; the
    // valance low across the bumper a dark recess; the bumper cover below a shut line
    const wt = tailW.u1 - tailW.u0, ht = tailW.v1 - tailW.v0;
    out.push(recess('tail lamp', tailW, 0.04, { color: 0x2a0606 }, 'its tail lamps\' housings (typical)', (deep) => [
      { name: 'tail lamp reflector', shape: { surf: { s: side, uv: quad(tailW.u0 + wt * 0.05, tailW.u1 - wt * 0.08, tailW.v0 + ht * 0.18, tailW.v1 - ht * 0.18), off: -deep * 0.7 } }, at: [0, 0, 0], mat: 'al-6061', color: 0x8a1a1a, shell: 0.001, finish: 'chrome', kg: 0 },
      lit('tail lamp', quad(tailW.u0 + wt * 0.06, tailW.u1 - wt * 0.1, tailW.v0 + ht * 0.55, tailW.v0 + ht * 0.72), -deep * 0.2, 0xff2a1a, 'its tail lamps lit: an LED light guide (typical)')]));
    out.push({ name: 'tail lights', shape: { surf: { s: side, uv: quad(tailW.u0, tailW.u1, tailW.v0, tailW.v1), off: 0.0005 } }, at: [0, 0, 0], mat: 'pmma', color: 0xb01010, shell: 0.003, says: 'its tail lamps\' lenses, flush with the body: red acrylic (typical)', fixed: 'bonded to its housing', joins: ['tail lamp wall'] });
    out.push(recess('rear valance', valW, 0.02, {}, 'the dark valance low across its rear bumper (typical)'));
    const vPt = vAt(uTl(0.005), yTopT - 0.03 - 0.12 - 0.07); out.push({ name: 'plate mount', at: pointAt(side, 0, vPt), shape: { box: [0.004, 0.08, 0.3] }, mat: 'pp', color: 0x111214, finish: 'texture', kg: 0, joins: ['rear quarter panel'], says: 'its rear number plate\'s place (typical)' });
    const yB = yTopT - 0.03 - 0.12 - 0.06, uB1 = rArch.length ? U(Math.min(...rArch.map((a) => a.w.x - a.Ra)) - 0.03) : uTl(0.6);
    out.push(seam('rear bumper shut line', 0, uB1, vAt(uMidT, yB), 'where its rear bumper cover meets the quarters (typical)'));
  }
  // ---- each wheelhouse liner: from the arch's lip in past the tyre's inner face, as far out at each depth as the sweep is ----
  for (const a of arches) {
    const pts = a.line.filter((q) => q[1] > 0.0005).map((q) => pointAt(side, q[0], q[1])); if (pts.length < 4) continue;
    // (in as far as the inner wheelhouse it meets: beyond where the tyre's inner corners reach at full lock)
    // (and short of what stands in the wheelhouse above the wheel, as a strut and its spring do: the liner is shaped in
    // front of it, not through it)
    const w = a.w, zW = Math.min(w.z - w.w / 2 - 0.04, w.z - (w.w / 2) * Math.cos(w.steer) - (w.R + r.room.radial) * Math.sin(w.steer) - r.room.side - 0.01), zs = [0, 0, 0.25, 0.5, 0.75, 1], K = zs.length;
    const stands = (b.inside ?? []).filter((k) => k.in === 'wheelhouse' && k.max[2] > 0 && Math.abs((k.min[0] + k.max[0]) / 2 - w.x) < w.R && k.max[1] > w.y), zIn = Math.max(zW, ...stands.map((k) => Math.min(w.z - w.w / 2 - 0.005, k.max[2] + k.room)));
    // its net drawn, not interpolated (so every point of it is a blend of its control points with no negative weights, and
    // moving one out only moves it out): along the arch, one column per point of the lip; across it, from the lip, out at
    // the lip's own depth to where a risen tyre is clear (the return a fender's lip has, which the tyre tucks up behind),
    // then in past the tyre's inner face, each row no nearer the axle than the one outside it (the liner widens inward,
    // so its core pulls out toward the car's middle)
    const ang = pts.map((P) => Math.atan2(P[1] - w.y, P[0] - w.x)), rad = pts.map((P) => zs.map(() => Math.hypot(P[0] - w.x, P[1] - w.y))), zOf = (n: number, k: number) => pts[n]![2] + (zIn - pts[n]![2]) * zs[k]!;
    // (its return just inside the skin it turns out from, 4 mm in from it at each height, as read off the skin's own
    // column there: the skin is clear of the sweep by its arch, so the return following it is too, and never stands out of
    // the fender where the skin leans in over the wheel)
    const lipU = a.line.filter((q) => q[1] > 0.0005).map((q) => q[0]), topY = lipU.map((u) => pointAt(side, u, 1)[1]);
    const skinZ = (n: number, y: number) => { if (y >= topY[n]!) return pointAt(side, lipU[n]!, 1)[2]; let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (pointAt(side, lipU[n]!, m)[1] < y) lo = m; else hi = m; } return pointAt(side, lipU[n]!, (lo + hi) / 2)[2]; };
    // (and nothing of it higher than 15 mm under the skin's top edge there: a liner never stands out of its fender; where
    // the sweep would want it higher, it stays, and the critic says so)
    const capR = (n: number) => { const sn = Math.sin(ang[n]!); return sn > 0.2 ? (topY[n]! - 0.015 - w.y) / sn : Infinity; }, radOf = (n: number, k: number) => Math.min(rad[n]![k]!, Math.max(rad[n]![0]!, capR(n)));
    const at = (n: number, k: number): V3 => { const rr2 = radOf(n, k), x = w.x + Math.cos(ang[n]!) * rr2, y = w.y + Math.sin(ang[n]!) * rr2; return [x, y, k === 1 ? Math.min(pts[n]![2], skinZ(n, y)) - 0.004 : zOf(n, k)]; };
    const build = (): Surface => ({ net: pts.map((_, n) => zs.map((_, k) => at(n, k))), mirror: true });
    // then looked at, point by point, against the sweep; where it is in it, the control points under that point moved out
    // 5 mm, until it is clear everywhere (the creator's own check, as the arch's radius is found)
    // (looked at coarsely until clear, then finely, with 5 mm to spare, so what is between the points looked at is clear too)
    let s2 = build(); const spare = { ...r.room, radial: r.room.radial + 0.005, side: r.room.side + 0.005 };
    for (const [NA, NB] of [[pts.length * 2, 24], [pts.length * 4, 48]] as const) for (let tries = 0; tries < 40; tries++) {
      // (each control point under any point in the sweep moved once a round, however many such points it is under)
      const push = new Set<number>();
      for (let ia = 0; ia <= NA; ia++) for (let ib = 1; ib <= NB; ib++) {
        if (!inSweep(pointAt(s2, ia / NA, ib / NB), w, spare)) continue;
        const n0 = Math.round((ia / NA) * (pts.length - 1)), k0 = Math.round((ib / NB) * (K - 1));
        for (let n = Math.max(0, n0 - 1); n <= Math.min(pts.length - 1, n0 + 1); n++) for (let k = Math.max(1, k0 - 1); k <= Math.min(K - 1, k0 + 1); k++) push.add(n * K + k);
      }
      if (!push.size) break;
      let moved = 0; for (const id of push) { const n = Math.floor(id / K), k = id % K; if (rad[n]![k]! < capR(n)) { rad[n]![k]! += 0.005; moved++; } }
      if (!moved) break;
      for (const row of rad) for (let k = 2; k < K; k++) row[k] = Math.max(row[k]!, row[k - 1]!);
      s2 = build();
    }
    // and the wheelhouse closed on its inner side, as a car's inner wheelhouse panel closes it: a flat wall beyond where the
    // tyre's inner corners reach at full lock (so it is clear of the sweep), from the rocker up past the liner's top (so
    // nothing is seen through the arch but the dark of the wheelhouse)
    // (its top the liner's own inner edge, which is held under the skin, so the wall never stands through the hood or the
    // deck; down to the rocker)
    // (above where the wheel's own drive shaft, spindle and arms pass under it: 60 mm over its axle, the frame rail's
    // height; under that the wheelhouse is open to the underbody, as a car's is)
    const yLoW = Math.max(ln.low(w.x) + 0.02, w.y + 0.06), wallTop = Array.from({ length: 25 }, (_, i) => pointAt(s2, i / 24, 1));
    out.push({ name: `${w.name.replace(/ wheel$/, '')} inner wheelhouses`, shape: { surf: { s: { net: wallTop.map((P) => [[P[0], Math.min(yLoW, P[1]), zW], [P[0], P[1], zW]] as V3[]), p: 1, q: 1, mirror: true } } }, at: [0, 0, 0], mat: 'steel-low', color: 0x121212, shell: 0.0008, finish: 'paint', says: `the inner wheelhouse beside each ${w.name}: pressed steel, flat, beyond where the tyre's corners reach at full lock (typical)` });
    out.push({ name: `${w.name.replace(/ wheel$/, '')} wheelhouse liners`, shape: { surf: { s: s2 } }, at: [0, 0, 0], mat: 'pp', color: 0x161616, shell: 0.0025, finish: 'texture', joins: [`${w.name.replace(/ wheel$/, '')} inner wheelhouses`], fixed: 'clipped to its inner wheelhouse', says: `the liner of the arch over each ${w.name}: moulded polypropylene, its every point clear of the tyre steered ${Math.round((w.steer * 180) / Math.PI)}° either way and risen ${Math.round(w.bump * 1000)} mm (the arch ${Math.round(a.Ra * 1000)} mm round the axle)` });
  }
  // ---- the hood and the deck lid: from the side's top edge to the middle, crowned ----
  const lid = (name: string, x0: number, x1: number, crown0: number, says: string, meets: string): Part | null => {
    if (x1 - x0 < 0.08) return null;
    // built on the side skin's own top edge, cut from it between its ends (so the two share their knots and meet along
    // all of it, not only where sections were drawn): each section's control polygon leaving that edge set in by the
    // shut line's gap, along the side's own last leg there and twice it (so the side's tangent across the edge and the
    // lid's are one, G1, all along; shortened only in the last centimetres of the nose, where it would cross the crown);
    // then crowned, and level across the middle (one tangent plane with its mirror), its points on the two tangent lines
    // a parabola's crown has, so it is convex
    const a = x0 <= ln.xT + 1e-6 ? 0 : uAt(side, x0, 1), c = x1 >= ln.xN - 1e-6 ? 1 : uAt(side, x1, 1);
    const s = fromEdge(split(side, a, c), (E, d): V3[] => {
      // (its crown easing off toward the face it ends at, to 40% of it at the edge: a hood is crowned across, and flattens
      // to its leading edge rather than doming over it)
      const crown = crown0 * (1 - 0.6 * Math.max(ease(ln.xN - E[0], 0.35), ease(E[0] - ln.xT, 0.25)));
      const t = unit3(d), P0: V3 = [E[0], E[1] + t[1] * r.gap, Math.max(0, E[2] + t[2] * r.gap)], zt = P0[2], y = P0[1], k = Math.min(2, (zt * 0.25) / (Math.hypot(...d) || 1), Math.max(0, crown * 0.8) / Math.max(1e-6, Math.abs(d[1]) || 1e-6));
      return [P0, [E[0], y + d[1] * k, zt + d[2] * k], [E[0], y + crown, zt * 0.5], [E[0], y + crown, zt * 0.16], [E[0], y + crown, 0]];
    }, { mirror: true });
    return paint(name, { s }, { says, meets: [{ part: meets, edge: 'b0', kind: 'G1', why: `a highlight runs off the ${meets}'s top onto the ${name} across their shut line` }, { part: name, edge: 'b1', kind: 'mirror', why: 'it crosses its middle in one tangent plane, or a ridge runs down it' }] });
  };
  const hood = lid('hood', ln.xCowl + r.gap, ln.xN, r.crown.hood, 'its hood: pressed steel about 0.7 mm, crowned about 30 mm (typical), its edges in one tangent plane with the fenders\' tops', doors ? 'front fender' : 'body sides');
  if (hood) out.push(hood);
  if (deckLid) { const deck = lid('deck lid', ln.xT, xCab - r.gap, r.crown.deck, 'its deck lid (or tailgate): pressed steel (typical)', doors ? 'rear quarter panel' : 'body sides'); if (deck) out.push(deck); }
  // ---- the cabin: from the belt leaning in to the roof's rails, then across; its glass and pillars regions of it ----
  {
    // (to the tail where it has no deck lid, as a van: its roof and back glass close the body there)
    const xEnd = ln.xCowl, xStart = open ? ln.xRoofF : xCab;
    // (built on the side skin's top edge between its ends, as the lids are: its belt edge is the doors' top edge, a
    // crease there by design, but one edge)
    const cab = fromEdge(split(side, uAt(side, xStart, 1), uAt(side, xEnd, 1)), (E): V3[] => {
      const x = E[0], zt = E[2], y0 = E[1], yT = Math.max(y0 + 0.004, ln.roof(x)), k = Math.min(1, Math.max(0.02, (yT - y0) / Math.max(0.05, b.H - y0)));
      // its control polygon: up the glass from the belt, leaning in and bowed out a little, round the rail (a radius there,
      // not an edge: its corner a control point, its neighbours a few centimetres off it), across the roof, level at the middle
      // (its rail leaning in faster than the cabin rises, by the root of how far it has risen: so where the cabin runs out
      // into the deck and the hood, its section lies down flat as a lid does, rather than shrinking into a fold too tight to press)
      // (its roof as wide, as a share of the body's width there, as its rules say: so it narrows as the body does at its ends)
      const rail = yT - r.crown.roof * k, zR = zt * (1 - (1 - r.cabin.roof) * Math.sqrt(k)), rr = 0.05 * k;
      return [[x, y0, zt], [x, y0 + (rail - y0) * 0.35, zt + (zR - zt) * 0.35 + 0.012 * k], [x, rail - rr, zR + rr * 0.35], [x, rail + rr * 0.15, zR - rr * 0.25], [x, yT - r.crown.roof * k * 0.2, zR * 0.55], [x, yT, zR * 0.18], [x, yT, 0]];
    }, { mirror: true }), cg = greville(cab.net[0]!.length, 3), Uc = (x: number) => uAt(cab, x, (cg[2]! + cg[3]!) / 2);
    const p = r.cabin.pillar / 1.2, vg0 = 0.022, v3 = (cg[2]! + cg[3]!) / 2;
    const glass = (name: string, uv: [UV, UV, UV, UV], says: string): Part => ({ name, shape: { surf: { s: cab, uv, off: 0.0015 } }, at: [0, 0, 0], mat: 'glass', color: 0x1e2a33, shell: 0.0045, says });
    const trim = (name: string, uv: [UV, UV, UV, UV], more: Partial<Part> = {}): Part => paint(name, { s: cab, uv }, more);
    const uWs = Uc(ln.xRoofF), uRr = Uc(ln.xRoofR), uB0 = Uc(xB - r.cabin.pillar), uB1 = Uc(xB + r.cabin.pillar), uCe = Uc(ln.xRoofR - 0.05);
    out.push(trim('belt mouldings', [[open ? 0 : uCe, 0], [1, 0], [1, vg0], [open ? 0 : uCe, vg0]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', says: 'the belt mouldings where the side glass leaves the doors (typical)' }));
    if (!open) {
      out.push(glass('windscreen', [[uWs, v3 + p], [1, v3 + p], [1, 1], [uWs, 1]], 'its windscreen: laminated glass, about 4.5 mm (typical)'));
      out.push(trim('roof', [[uRr, v3 - p], [uWs, v3 - p], [uWs, 1], [uRr, 1]], { says: 'its roof panel: pressed steel about 0.7 mm (typical)', meets: [{ part: 'roof', edge: 'b1', kind: 'mirror', why: 'it crosses its middle in one tangent plane' }] }));
      out.push(trim('pillars and roof rails', [[0, v3 - p], [uRr, v3 - p], [uRr, v3 + p], [0, v3 + p]], { says: 'its C pillars and the rails along the roof (typical)' }));
      out.push(trim('A pillars', [[uWs, v3 - p], [1, v3 - p], [1, v3 + p], [uWs, v3 + p]], { says: 'its A pillars beside the windscreen (typical)' }));
      out.push(glass('back glass', [[0, v3 + p], [uRr, v3 + p], [uRr, 1], [0, 1]], 'its back glass: toughened glass about 4 mm (typical)'));
      out.push(trim('C pillars', [[0, 0], [uCe, 0], [uCe, v3 - p], [0, v3 - p]], { says: 'its C pillars (typical)' }));
      if (twoDoors) {
        out.push(trim('B pillars', [[uB0, vg0], [uB1, vg0], [uB1, v3 - p], [uB0, v3 - p]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', says: 'its B pillars, trimmed black (typical)' }));
        out.push(glass('front side windows', [[uB1, vg0], [1, vg0], [1, v3 - p], [uB1, v3 - p]], 'its front door glass: toughened, about 4 mm (typical)'));
        // (a long cabin's glass behind the B pillars split by pillars: at the rear doors' back edge, and every 1.1 m or so
        // behind that, as a van's or an estate's is)
        const xCe = ln.xRoofR - 0.05, cuts = xRD - xCe > 0.35 && xB - r.cabin.pillar - xRD > 0.3 ? [xRD] : [], last = cuts.length ? cuts[0]! : xB - r.cabin.pillar, more = Math.floor((last - xCe) / 1.1);
        for (let k = 1; k <= more; k++) cuts.push(last - ((last - xCe) * k) / (more + 1));
        const edges = [uB0, ...cuts.sort((a2, b2) => b2 - a2).flatMap((x) => [Uc(x + r.cabin.pillar), Uc(x - r.cabin.pillar)]), uCe];
        for (let k = 0; k + 1 < edges.length; k += 2) out.push(glass('rear side windows', [[edges[k + 1]!, vg0], [edges[k]!, vg0], [edges[k]!, v3 - p], [edges[k + 1]!, v3 - p]], 'its rear side glass (typical)'));
        for (const x of cuts) out.push(trim('D pillars', [[Uc(x - r.cabin.pillar), vg0], [Uc(x + r.cabin.pillar), vg0], [Uc(x + r.cabin.pillar), v3 - p], [Uc(x - r.cabin.pillar), v3 - p]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', says: 'a pillar between its rear side windows, trimmed black (typical)' }));
      } else out.push(glass('side windows', [[uCe, vg0], [1, vg0], [1, v3 - p], [uCe, v3 - p]], 'its side glass (typical)'));
    } else {
      out.push(glass('windscreen', [[0, v3 + p], [1, v3 + p], [1, 1], [0, 1]], 'its windscreen (typical)'));
      out.push(trim('windscreen frame', [[0, v3 - p], [1, v3 - p], [1, v3 + p], [0, v3 + p]], { says: 'its windscreen frame (typical)' }));
    }
  }
  return out;
}

// ---- what is inside it ------------------------------------------------------------------------------------------------
/** The body's roof from inside: at x, the lowest of its cabin's skins over its middle (its roof, its glass, its pillars),
 *  so what goes under them (a seat's back, a passenger's head) is fitted to the body as made. */
const overhead = new WeakMap<Patch, V3[]>();
export function roofOf(parts: Part[]): (x: number) => number {
  const pts: V3[] = [];
  for (const p of parts) { if (!p.shape || !('surf' in p.shape) || !/roof|glass|windscreen|pillar/i.test(p.name)) continue; const pt = p.shape.surf; let got = overhead.get(pt); if (!got) { got = patchPoints(pt, 24, 12, false).filter((q) => Math.abs(q[2]) < 0.35); overhead.set(pt, got); } pts.push(...got); }
  return (x) => { let y = Infinity; for (const q of pts) if (Math.abs(q[0] - x) < 0.06 && q[1] > 0.6 && q[1] < y) y = q[1]; return y; };
}
/** The body's sides from inside: at x and height y, the least half-width of its skins that face sideways there (its
 *  doors, quarters and glass), so what goes in it (a seat) is fitted to the body as made, its tumblehome included. */
const sideways = new WeakMap<Patch, V3[]>();
export function insideOf(parts: Part[]): (x: number, y: number) => number {
  const pts: V3[] = [];
  for (const p of parts) {
    if (!p.shape || !('surf' in p.shape) || /liner|handle|lamp|light|grille/.test(p.name)) continue;
    const pt = p.shape.surf; let got = sideways.get(pt);
    if (!got) { got = []; for (let i = 0; i <= 32; i++) for (let j = 0; j <= 12; j++) { const q = patchAt(pt, i / 32, j / 12); if (Math.abs(q.n[2]) > 0.5) got.push(q.at); } sideways.set(pt, got); }
    pts.push(...got);
  }
  return (x, y) => { let best = Infinity; for (const P of pts) if (Math.abs(P[0] - x) < 0.08 && Math.abs(P[1] - y) < 0.06) best = Math.min(best, Math.abs(P[2])); return best; };
}

// ---- practice: the critic changes the rules, never a body ---------------------------------------------------------------
/** How the critic finds a body: for each painted panel, the most times any one line on it turns the other way (a ripple
 *  a person sees in its reflections), how many such turns there are, and how fast its curvature changes; and anything
 *  in a wheel's way, which outweighs all of that. Lower is better. */
export function bodyScore(parts: Part[], plan: BodyPlan, room = BODY_RULES.room): { score: number; rows: { panel: string; worstLine: number; wobbles: number; roughness: number }[]; blocked: number } {
  const rows: { panel: string; worstLine: number; wobbles: number; roughness: number }[] = []; let blocked = 0;
  for (const p of parts) {
    if (!p.shape || !('surf' in p.shape)) continue;
    if (p.finish === 'paint') { const f = fairness(p.shape.surf, 30, 14); rows.push({ panel: p.name, worstLine: f.worstLine, wobbles: f.wobbles, roughness: f.roughness }); }
    if (!/liner/.test(p.name)) for (const w of plan.wheels) blocked += patchPoints(p.shape.surf, 24, 10).filter((q) => inSweep(q, w, room)).length;
  }
  const score = rows.reduce((a, r) => a + r.worstLine * 10 + r.wobbles * 0.2 + Math.log1p(r.roughness / 100), 0) + blocked * 1000;
  return { score, rows, blocked };
}
/** A rule practised: each value tried on the bodies it practises on and on bodies it has not seen (held out), and kept
 *  only if it does better on both than the rule as it is (a change that helps only the bodies it was tried on is fitting
 *  to them, not learning). Says what it found. */
export function practise<K extends keyof BodyRules>(rule: K, values: BodyRules[K][], on: BodyPlan[], heldOut: BodyPlan[], base: BodyRules = BODY_RULES): { kept: BodyRules[K]; tried: { value: BodyRules[K]; on: number; held: number }[]; update: RuleUpdate | null } {
  const total = (plans: BodyPlan[], rules: BodyRules) => plans.reduce((a, b) => a + bodyScore(bodyPanels(b, rules), b, rules.room).score, 0);
  const now = { on: total(on, base), held: total(heldOut, base) }, tried = values.map((value) => { const rules = { ...base, [rule]: value }; return { value, on: total(on, rules), held: total(heldOut, rules) }; });
  const better = tried.filter((t) => t.on < now.on && t.held < now.held).sort((a, b) => a.on + a.held - (b.on + b.held))[0];
  if (!better) return { kept: base[rule], tried, update: null };
  return { kept: better.value, tried, update: { n: RULE_UPDATES.length + 1, rule: String(rule), found: `on ${on.length} bodies the critic scored ${now.on.toFixed(0)}, on ${heldOut.length} it had not seen ${now.held.toFixed(0)}`, was: JSON.stringify(base[rule]), now: `${JSON.stringify(better.value)} (scored ${better.on.toFixed(0)} and ${better.held.toFixed(0)})` } };
}
