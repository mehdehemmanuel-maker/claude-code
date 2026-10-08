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
//     straight ahead through its bump, and at least 40 mm over it at rest (the room is the critic's: about 30 mm past the
//     tyre and 15 mm beside it). Where the lip would stand inside the tyre's face, the skin is flared out round the arch
//     instead of the arch opened up. The arch is derived from how the wheel moves, not drawn;
//   - a wheelhouse liner inside each arch, clear of the tyre wherever it goes, steered through its lock either way and
//     risen through its bump, at every depth: the lock is the wheelhouse's to clear, behind the skin, as on a real car;
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
export interface BodyPlan { L: number; W: number; H: number; c: number; lines: Lines; wheels: WheelAt[]; color: number; inside?: KeepOut[]; /** how much more a lid is crowned over a stretch of its length, where its maker's own check found it short of what is under it near its edge */ lift?: { x0: number; x1: number; dy: number }[] }
/** The rules the body is made by: each a figure a designer would set, typical where not sourced. A practising critic
 *  changes these, never a made body's points (src/nexus/make/critic.ts, and RULE_UPDATES below). */
export interface BodyRules {
  /** room round a moving wheel, m (the critic's) and how many steering angles its sweep is taken at */ room: { radial: number; side: number; poses: number };
  /** how far the arch's lip stands outside the tyre's face where the skin is flared for it, m */ flare: number;
  /** how far an arch's lip stands over its tyre at rest, seen from the side, m: the skin's opening is sized to the wheel
   *  straight ahead through its bump, and at least this; its sweep at lock is the wheelhouse's and its liner's to clear,
   *  inside the skin, as on a real car */ lip: number;
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
  lip: 0.04,
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
  { n: 4, rule: 'lip', found: 'the critic (round 4, F23): the front arch\'s lip stood 109 mm off the tyre against the rear\'s 56 mm, 421 mm round its axle against about 362 mm on the Corolla\'s side elevation, because the skin\'s opening was sized to clear the tyre steered 35° and risen 80 mm; on a real car the steered tyre swings inside the wheelhouse, behind the skin', was: 'the arch the least radius clear of the whole sweep (lock and bump)', now: 'the arch the least radius clear of the wheel straight ahead through its bump, and at least 40 mm over the tyre at rest; the liner and the inner wheelhouse still clear the whole sweep' },
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
  const beltAt = (x: number) => belt + (ln.wedge ?? 0.02) * Math.min(1, Math.max(0, (xCowl - x) / Math.max(0.1, xCowl - xDeck)));
  const hoodRun = xN - xCowl, deckY = ln.bed ? beltAt(xDeck) : tailH;
  // (where its windscreen's foot and its back glass's foot stand above its belt, as most cars' do, the top edge rising to
  // each from the belt: under its sail at the front, under its C pillar at the back; at the belt where not said)
  const cowlY = ln.cowlH !== undefined ? Math.max(beltAt(xCowl), ln.cowlH * H) : beltAt(xCowl), deckTop = ln.deckH !== undefined && !ln.bed ? Math.max(beltAt(xDeck), ln.deckH * H) : beltAt(xDeck);
  const rampF = Math.max(0.12, (ln.sail ?? 0) * L), rampR = Math.min(0.35, (xRoofR - xDeck) * 0.4);
  // what it must clear, as a height over x: an engine and its strut tops under the hood, and each arch with its lip over
  // the tyre risen through its whole bump (a low car's fender rises over its wheel), ramped in and out smoothly so the line lifted over it bends but never kinks
  // (lifting the drawn line's control points would not do: a B-spline only leans toward its points)
  const lip = 0.06, clears: { x0: number; x1: number; y: number }[] = [...(b.inside ?? []).filter((k) => !k.in).map((k) => ({ x0: k.min[0], x1: k.max[0], y: k.max[1] + k.room })), ...b.wheels.map((w) => ({ x0: w.x - w.R * 0.6, x1: w.x + w.R * 0.6, y: w.y + w.R + r.room.radial + w.bump + lip }))];
  const need = (x: number) => { let v = -Infinity; for (const k of clears) { const ramp = 0.18, d = x < k.x0 ? k.x0 - x : x > k.x1 ? x - k.x1 : 0; if (d >= ramp) continue; const g = 0.5 + 0.5 * Math.cos((Math.PI * d) / ramp); v = Math.max(v, k.y - (1 - g) * 0.12); } return v; };
  const drawn = lineBy([
    // (its ends a crisp edge, falling 20 to 30 mm in the last few centimetres where the face leans down from it, not a
    // roll of a hand's height: a hood or deck rolling down into its face is what makes a body read as a bar of soap)
    [xT, deckY - (ln.bed ? 0.02 : 0.03)], [xT + 0.05, deckY - (ln.bed ? 0.005 : 0.008)], [xT + 0.2, deckY], ...(xDeck - xT > 0.6 ? [[(xT + xDeck) / 2 + 0.1, deckY + 0.004] as [number, number]] : []), [xDeck, deckTop], ...(deckTop > beltAt(xDeck) + 0.005 ? [[xDeck + rampR, beltAt(xDeck + rampR)] as [number, number]] : []),
    [(xDeck + xCowl) / 2, beltAt((xDeck + xCowl) / 2)], ...(cowlY > beltAt(xCowl) + 0.005 ? [[xCowl - rampF, beltAt(xCowl - rampF)] as [number, number]] : []), [xCowl, cowlY],
    [xCowl + hoodRun * 0.4, noseH + (cowlY - noseH) * 0.55], [xN - 0.16, noseH + 0.008], [xN - 0.04, noseH - 0.004], [xN, noseH - 0.022],
  ]);
  const top = (x: number) => { const n = need(x); return n === -Infinity ? drawn(x) : -softMin(-drawn(x), -n, 0.04); };
  const shoulder = (x: number) => softMin(top(x) - 0.06, belt - r.side.shoulder, 0.08);
  // the cabin's top line: the windscreen from the cowl, rounding into the roof, the roof, the back glass to the deck
  const wsRun = xCowl - xRoofF, bgRun = xRoofR - xDeck, rb = cowlY;
  const roof = lineBy([
    [xDeck, top(xDeck) + 0.004], [xDeck + bgRun * 0.45, top(xDeck) + (H - top(xDeck)) * (ln.bow?.[1] ?? 0.62)], [xRoofR - Math.min(0.1, bgRun * 0.2), H - 0.022], [xRoofR, H - 0.012], [(xRoofF + xRoofR) / 2, H],
    [xRoofF, H - 0.012], [xRoofF + Math.min(0.1, wsRun * 0.2), H - 0.03], [xCowl - wsRun * 0.5, rb + (H - rb) * (ln.bow?.[0] ?? 0.55)], [xCowl, rb + 0.004],
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
  // (then looked at as made: its hood or deck, crowned from the side's top edge, can stand a few millimetres short of what
  // is under it near that edge, as a strut's tower; where it does, the lid alone is crowned more there, by what is
  // missing over the share of its crown that reaches that far out (about 40%), and the body made again, up to three
  // times: the creator's own check, as its liner's is; the side skin, and the doors on it, are not touched)
  let b2: BodyPlan = { ...b, color: UNPAINTED }, out = makeBody(b2, r);
  for (let k = 0; k < 3; k++) { const short = lidShort(out, b2); if (!short.some((d) => d > 0.001)) break; b2 = { ...b2, lift: [...(b2.lift ?? []), ...(b2.inside ?? []).flatMap((q, i) => (short[i]! > 0.001 ? [{ x0: q.min[0], x1: q.max[0], dy: (short[i]! + 0.004) / 0.4 }] : []))] }; out = makeBody(b2, r); }
  if (made.size > 64) made.clear(); made.set(key, out); return out.map(copy(b.color));
}
/** The nearest point on a ruled strip (a recess's wall: a degree-1 net of rows of two points), and how far: its quads
 *  split in two triangles each, the point's least distance to them (fast enough to ask many times as a part is fitted). */
function nearStrip(s: Surface, P: V3): { d: number; at: V3 } {
  let best = { d: Infinity, at: P };
  const tri = (A: V3, B: V3, C: V3) => { const q = closestOnTri(P, A, B, C), d = Math.hypot(q[0] - P[0], q[1] - P[1], q[2] - P[2]); if (d < best.d) best = { d, at: q }; };
  for (let i = 0; i + 1 < s.net.length; i++) { const a = s.net[i]!, b = s.net[i + 1]!; tri(a[0]!, a[1]!, b[1]!); tri(a[0]!, b[1]!, b[0]!); }
  return best;
}
/** The point of a triangle nearest P (Ericson, Real-Time Collision Detection, 5.1.5). */
function closestOnTri(P: V3, A: V3, B: V3, C: V3): V3 {
  const sub3 = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot3 = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], at = (u: V3, k: number, v: V3): V3 => [u[0] + k * v[0], u[1] + k * v[1], u[2] + k * v[2]];
  const ab = sub3(B, A), ac = sub3(C, A), ap = sub3(P, A), d1 = dot3(ab, ap), d2 = dot3(ac, ap); if (d1 <= 0 && d2 <= 0) return A;
  const bp = sub3(P, B), d3 = dot3(ab, bp), d4 = dot3(ac, bp); if (d3 >= 0 && d4 <= d3) return B;
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) return at(A, d1 / (d1 - d3), ab);
  const cp = sub3(P, C), d5 = dot3(ab, cp), d6 = dot3(ac, cp); if (d6 >= 0 && d5 <= d6) return C;
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) return at(A, d2 / (d2 - d6), ac);
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return at(B, w, sub3(C, B)); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return [A[0] + ab[0] * v + ac[0] * w, A[1] + ab[1] * v + ac[1] * w, A[2] + ab[2] * v + ac[2] * w];
}
/** How far short of each keep-out's room over it the lid over it (its hood, its deck lid) is, m (0 where it clears it, or
 *  where no lid is over it): read off the lid as made, at the keep-out's top over a 5 by 5 grid. */
function lidShort(parts: Part[], b: BodyPlan): number[] {
  const lids = parts.filter((p) => (p.name === 'hood' || p.name === 'deck lid') && p.shape && 'surf' in p.shape).map((p) => patchPoints((p.shape as { surf: Patch }).surf, 40, 20));
  return (b.inside ?? []).map((k) => {
    if (k.in) return 0; let short = 0;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const x = k.min[0] + ((k.max[0] - k.min[0]) * i) / 4, z = Math.abs(k.min[2] + ((k.max[2] - k.min[2]) * j) / 4);
      let best = Infinity, y = Infinity; for (const pts of lids) for (const q of pts) { const d = Math.hypot(q[0] - x, Math.abs(q[2]) - z); if (d < best) { best = d; y = q[1]; } }
      if (best < 0.03) short = Math.max(short, k.max[1] + k.room * 0.5 - y);
    }
    return short;
  });
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
    // (each column cut where the skin, as it rises, last leaves the circle: by its own distance from the axle at each height,
    // not by where its foot is along the car, as a skin curving round under itself comes nearer the wheel higher up)
    // (and more columns where the cut climbs steeply between two, as at the circle's sides, so no sliver of skin is left
    // inside it between them)
    const trimAt = (Ra: number) => { const u0 = U(w.x - Ra - 0.05), u1 = U(w.x + Ra + 0.05), n = 72, inside = (u: number, v: number) => { const P = pointAt(side, u, v); return Math.hypot(P[0] - w.x, P[1] - w.y) < Ra; };
      const cut = (u: number): UV => { let last = -1; for (let j = 0; j <= 32; j++) if (inside(u, j / 32)) last = j;
        if (last < 0) return [u, 0]; if (last === 32) return [u, 1];
        let lo = last / 32, hi = (last + 1) / 32; for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2; if (inside(u, m)) lo = m; else hi = m; } return [u, hi]; };
      let pts: UV[] = Array.from({ length: n + 1 }, (_, k) => cut(u0 + ((u1 - u0) * k) / n));
      for (let depth = 0; depth < 4; depth++) { const next: UV[] = [pts[0]!]; for (let k = 1; k < pts.length; k++) { const a = pts[k - 1]!, b = pts[k]!; if (Math.abs(b[1] - a[1]) > 0.03) next.push(cut((a[0] + b[0]) / 2)); next.push(b); } if (next.length === pts.length) break; pts = next; }
      return pts; };
    // (the wheel straight ahead through its bump, and at full lock at ride height: the two at once (lock in bump) are cleared
    // inside the skin, by the wheelhouse and its liner)
    const wS: WheelAt = { ...w, steer: 0 }, wL: WheelAt = { ...w, bump: 0 };
    let Ra = w.R + Math.max(r.room.radial, r.lip);
    for (let tries = 0; tries < 40; tries++) {
      const line = trimAt(Ra); let hit = false;
      for (let k = 0; k < line.length && !hit; k++) { const [u, v0] = line[k]!; for (let j = 0; j <= 16 && !hit; j++) { const v = v0 + ((1 - v0) * j) / 16; const P = pointAt(side, u, v); if (inSweep(P, wS, r.room) || inSweep(P, wL, r.room)) hit = true; } }
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
  // (a lamp's opening only where the skin turns gently enough to set its housing in as deep as it asks, its back no
  // nearer than 80% of its depth to folding: round a box van's tight tail corner, the longest run of the window that
  // does, not all of it)
  const roomy = (w: Win, deep0: number): Win => {
    const N = 24, ok = Array.from({ length: N + 1 }, (_, i) => { const u = w.u0 + ((w.u1 - w.u0) * i) / N; let rm = Infinity; for (let j = 0; j <= 8; j++) { const c = curvatures(surfaceAt(side, u, w.v0 + ((w.v1 - w.v0) * j) / 8)), k = Math.max(Math.abs(c.k1), Math.abs(c.k2)); if (k > 1e-9) rm = Math.min(rm, 1 / k); } return rm * 0.75 >= deep0 * 0.8; });
    if (ok.every(Boolean)) return w; let best: [number, number] = [0, -1]; for (let i = 0; i <= N; i++) if (ok[i]) { let j = i; while (j + 1 <= N && ok[j + 1]) j++; if (j - i > best[1] - best[0]) best = [i, j]; i = j; }
    return best[1] - best[0] >= 4 ? { ...w, u0: w.u0 + ((w.u1 - w.u0) * best[0]) / N, u1: w.u0 + ((w.u1 - w.u0) * best[1]) / N } : w;
  };
  const tailW: Win = roomy({ u0: uZ(W2 * 0.5, false), u1: Math.min(uTl(0.45), U(rArchBack - 0.08)), v0: tb0, v1: Math.min(vAt(uMidT, yTopT - 0.015), vUnder(uZ(W2 * 0.5, false), Math.min(uTl(0.45), U(rArchBack - 0.08)), 0.015)) }, 0.04), valW: Win = { u0: 0, u1: uTl(0.35), v0: vAt(uTl(0.01), lowT + 0.025), v1: vAt(uTl(0.01), lowT + 0.085) };
  const fWins = [lampW, grilleW, intakeW], tWins = [tailW, valW];
  // a panel round openings: its run in slabs along u, each from its foot (round the arches in it) up to its top, less the
  // openings over that slab
  // (lean: where its start's edge meets its top, as u, where that edge leans: a front fender's rear edge, the door's shut line)
  // (leanEnd: where its end's edge meets its top, as u, leaning only above v: a rear quarter's front edge, upright by its arch)
  const region = (name: string, u0: number, u1: number, wins: Win[], more: Partial<Part>, end?: { at: 0 | 1; meets: Part['meets'] }, lean?: number, leanEnd?: { at: number; v: number }): Part[] => {
    const cuts = [...new Set([u0, u1, ...wins.flatMap((w) => [w.u0, w.u1]).filter((u) => u > u0 + 1e-6 && u < u1 - 1e-6)])].sort((p, q) => p - q), res: Part[] = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i]!, c = cuts[i + 1]!, mid = (a + c) / 2, ex = wins.filter((w) => w.u0 <= mid && w.u1 >= mid).map((w) => [w.v0, w.v1] as [number, number]).sort((p, q) => p[0] - q[0]);
      const m2 = end && ((end.at === 1 && c > 1 - 1e-6) || (end.at === 0 && a < 1e-6)) ? { ...more, meets: end.meets } : more;
      if (!ex.length && leanEnd && c === cuts[cuts.length - 1] && leanEnd.at > a && leanEnd.at < c) { res.push(paint(name, { s: side, above: trimmed(a, c), to: leanEnd.v }, m2), paint(name, { s: side, uv: [[a, leanEnd.v], [c, leanEnd.v], [leanEnd.at, 1], [a, 1]] }, m2)); continue; }
      res.push(paint(name, { s: side, above: trimmed(a, c), ...(ex.length ? { to: ex[0]![0] } : lean !== undefined && a === cuts[0] && lean < c ? { top: [lean, c] as [number, number] } : {}) }, m2));
      for (let k = 0; k < ex.length; k++) { const top = k + 1 < ex.length ? ex[k + 1]![0] : 1; if (top - ex[k]![1] > 1e-4) res.push(paint(name, { s: side, uv: quad(a, c, ex[k]![1], top) }, m2)); }
    }
    return res;
  };
  const fMeets = { at: 1 as const, meets: [{ part: 'front fender', edge: 'a1' as const, kind: 'mirror' as const, why: 'its nose crosses the middle in one tangent plane, or a ridge runs down its face' }] }, tMeets = { at: 0 as const, meets: [{ part: 'rear quarter panel', edge: 'a0' as const, kind: 'mirror' as const, why: 'its tail crosses the middle in one tangent plane' }] };
  // (its front door's shut line: behind the front arch at the sill, forward as it rises, to the A pillar's foot at the
  // belt, where the cowl puts it: so the door glass, which runs to the A pillar, always stands in its door; or, where its
  // maker sets its door back from its windscreen's foot (its sail), to there, the fender running back to meet it)
  const xFDt = Math.max(xFD, ln.xCowl - (b.lines.sail ?? 0) * b.L), xLine = (v: number) => xFD + (xFDt - xFD) * v;
  // (its rear door's: upright by the rear arch, up to a little over the arch's lip, then leaning back to its top rear corner
  // where its maker puts it there, over the arch, so the door never reaches into the wheel's opening)
  const vArch = Math.min(0.9, Math.max(vSill + 0.05, ...rr.flatMap((a) => a.line.map((q) => q[1])), 0) + 0.04), xRDt = twoDoors && b.lines.doorR !== undefined ? Math.min(xRD, b.L / 2 - b.lines.doorR * b.L) : xRD;
  const xRLine = (v: number) => (v <= vArch ? xRD : xRD + ((xRDt - xRD) * (v - vArch)) / (1 - vArch));
  if (doors) {
    out.push(...region('front fender', uFD + du(xFD), 1, fWins, { says: 'its front fenders, and the nose and front bumper they run into, open for its lamps, grille and intake: pressed steel about 0.8 mm (typical of car skins); each arch round its wheel by how far the wheel steers and rises' }, fMeets, U(xFDt + g)));
    out.push(...region('rear quarter panel', 0, uRD - du(xRD), tWins, { fixed: 'pressed as one with the pillars, roof rails and sill of its body side (one stamping: typical); its inner flanges spot-welded to the rear inner wheelhouses and the back panel (the flanges not drawn)', says: 'its rear quarters and the tail, open for its lamps: pressed steel about 0.8 mm (typical)' }, tMeets, undefined, xRDt < xRD - 0.01 ? { at: U(xRDt - g), v: vArch } : undefined));
    // (back under the rear door's shut line to the quarter's front edge: below the door there is no gap, the side being one
    // stamping)
    out.push(paint('sills', { s: side, uv: [[uRD - du(xRD), 0], [uFD, 0], [U(xLine(vSill - 0.004)), vSill - 0.004], [uRD - du(xRD), vSill - 0.004]] }, { shell: 0.0012, fixed: 'pressed as one with the quarter panel, pillars and roof rails of its body side (one stamping: typical); spot-welded along its inner flange to the sill\'s inner', says: 'the sills under the doors (rocker panels): pressed steel, thicker (typical)' }));
    const door = (name: string, x0: number, x1: number, x1t = x1) => paint(name, { s: side, uv: [[U(x0 + g), vSill], [U(x1 - g), vSill], [U(x1t - g), 1], [U(x0 + g), 1]] }, { says: 'a door skin: pressed steel about 0.8 mm, between its shut lines (4 mm gaps, typical)' });
    if (twoDoors) { out.push(door('front doors', xB, xLine(vSill), xFDt)); if (xRDt < xRD - 0.01) out.push(paint('rear doors', { s: side, uv: [[U(xRD + g), vSill], [U(xB - g), vSill], [U(xB - g), vArch], [U(xRD + g), vArch]] }, { says: 'a door skin: pressed steel about 0.8 mm, between its shut lines (4 mm gaps, typical)' }), paint('rear doors', { s: side, uv: [[U(xRD + g), vArch], [U(xB - g), vArch], [U(xB - g), 1], [U(xRDt + g), 1]] }, { says: 'a door skin: pressed steel about 0.8 mm, between its shut lines (4 mm gaps, typical); its rear edge leaning back over the rear arch' })); else out.push(door('rear doors', xRD, xB)); } else out.push(door('doors', xRD, xLine(vSill), xFDt));
    // a handle near each door's back edge, a little under its shoulder, standing a few millimetres proud (typical)
    // (each handle a bar on the door, in a dark pocket pressed into it for the fingers: the pocket a region of the skin,
    // the bar a part standing just off it on each side)
    for (const x1 of twoDoors ? [xB, xRLine(sv[3]! - 0.04)] : [xRD]) {
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
  const recess = (name: string, w: Win, deep0: number, back: Partial<Part>, says: string, kids: Part[] | ((deep: number, walls: Surface[]) => Part[]) = [], skip: { u0?: number } = {}): Part => {
    // (no deeper than three quarters of the tightest radius the skin turns through in the opening, so its back, set in
    // along the skin's normal, never folds through itself)
    // (looked at closely enough that a tight corner between the places looked at is not missed: 25 by 13 across it)
    let rmin = Infinity; for (let i = 0; i <= 24; i++) for (let j = 0; j <= 12; j++) { const sp = surfaceAt(side, w.u0 + ((w.u1 - w.u0) * i) / 24, w.v0 + ((w.v1 - w.v0) * j) / 12), c = curvatures(sp); const k = Math.max(Math.abs(c.k1), Math.abs(c.k2)); if (k > 1e-9) rmin = Math.min(rmin, 1 / k); }
    const deep = Math.min(deep0, 0.75 * rmin);
    const edge = (a: UV, c: UV): Surface => { const N = 24; return { net: Array.from({ length: N + 1 }, (_, k) => { const u = a[0] + ((c[0] - a[0]) * k) / N, v = a[1] + ((c[1] - a[1]) * k) / N, q = surfaceAt(side, u, v); return [q.at, [q.at[0] - q.n[0] * deep, q.at[1] - q.n[1] * deep, q.at[2] - q.n[2] * deep]] as V3[]; }), p: 1, q: 1, mirror: true }; };
    const walls = [edge([w.u0, w.v0], [w.u1, w.v0]), edge([w.u0, w.v1], [w.u1, w.v1]), ...(w.u0 > 1e-6 && Math.min(w.v1, skip.u0 ?? w.v1) - w.v0 > 1e-4 ? [edge([w.u0, w.v0], [w.u0, Math.min(w.v1, skip.u0 ?? w.v1)])] : []), ...(w.u1 < 1 - 1e-6 ? [edge([w.u1, w.v0], [w.u1, w.v1])] : [])];
    return { name, at: [0, 0, 0], says, parts: [
      { name: `${name} back`, shape: { surf: { s: side, uv: quad(w.u0, w.u1, w.v0, w.v1), off: -deep } }, at: [0, 0, 0], mat: 'pp', color: 0x15161a, shell: 0.002, finish: 'texture', kg: 0, ...back },
      // (its walls drawn in from the opening's edge: one pressing or moulding with the skin there)
      ...walls.map((sw) => ({ name: `${name} wall`, shape: { surf: { s: sw } }, at: [0, 0, 0] as V3, mat: 'pp', color: 0x111214, shell: 0.002, finish: 'texture', kg: 0, joins: ['front fender', 'rear quarter panel', 'body sides', 'front bumper', 'rear bumper'] })), ...(typeof kids === 'function' ? kids(deep, walls) : kids)] };
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
  // (a dark strip drawn on the skin where a shut line runs: it stands for the gap, which is not cut, and says so)
  const seam = (name: string, a0: number, a1: number, v: number, says: string): Part => ({ name, shape: { surf: { s: side, uv: quad(a0, a1, v - 0.0025, v + 0.0025), off: 0.0006 } }, at: [0, 0, 0], mat: 'rubber', color: 0x0b0b0c, shell: 0.001, finish: 'texture', kg: 0, fixed: 'drawn on what it meets, standing for a shut line\'s gap that is not cut', says });
  // (bars across an opening from wall to wall, moulded with its walls: not stopping short of them, held by nothing)
  const slats = (name: string, w: Win, n: number, off: number, color: number, finish: string): Part[] => Array.from({ length: n }, (_, k) => { const f0 = (k + 0.62) / (n + 0.5), hv = (w.v1 - w.v0) / (n + 0.5); return { name, shape: { surf: { s: side, uv: quad(w.u0 + 0.0001, w.u1, w.v0 + hv * (k + 0.55), w.v0 + hv * (k + 0.55) + hv * 0.32), off } }, at: [0, 0, 0] as V3, mat: 'abs', color, shell: 0.003, finish, kg: 0, fixed: 'moulded across the opening, one with its walls', says: f0 > 2 ? '' : undefined }; });
  {
    // a headlamp: a dark housing, a chrome reflector across its middle, a projector each for the low and the high beam (a
    // bowl, its lens in a dark ring, set in along the skin's normal), a light guide along its foot lit as its daytime
    // running light; under a clear lens flush with the body (typical of a modern car's LED lamp)
    const wl = lampW.u1 - lampW.u0, hh = lampW.v1 - lampW.v0, rp0 = Math.min(0.034, 0.3 * fc.lamp), vMid = lampW.v0 + hh * 0.5;
    // (each as big as the lamp has room for where it stands, a fifth of its height clear above and below, and as deep as
    // the housing is, its bowl's foot 12 mm off the housing's back)
    // (and then shrunk, 15% at a time, until its rim and its lens stand 3 mm clear of every wall of the housing: round a
    // corner the walls, drawn in along the skin's normals, close in behind the opening, and a bowl as wide as the
    // opening there would pass through them; the creator's own check, as the liner's is)
    const projector = (deep: number, k: number, walls: Surface[]): Part[] => { const u = lampW.u0 + wl * k, room = Math.hypot(...(pointAt(side, u, lampW.v1).map((x, i) => x - pointAt(side, u, lampW.v0)[i]!) as V3)), bd = Math.max(0.006, Math.min(0.024, deep - 0.02));
      const q = surfaceAt(side, u, vMid), y = unit3(q.n), ref: V3 = Math.abs(y[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1], x = unit3([y[1] * ref[2] - y[2] * ref[1], y[2] * ref[0] - y[0] * ref[2], y[0] * ref[1] - y[1] * ref[0]]), z: V3 = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
      // (clear, and inside: on the same side of each wall as the housing's own middle, half its depth in; its rim, its
      // lens, its bowl and its foot, at 24 places round each)
      const qm = surfaceAt(side, (lampW.u0 + lampW.u1) / 2, vMid), inner: V3 = [qm.at[0] - qm.n[0] * deep * 0.5, qm.at[1] - qm.n[1] * deep * 0.5, qm.at[2] - qm.n[2] * deep * 0.5];
      const clear = (r: number, pin: number) => { const c: V3 = [q.at[0] - y[0] * pin, q.at[1] - y[1] * pin, q.at[2] - y[2] * pin]; return Array.from({ length: 24 * 5 }, (_, i) => { const t = ((i % 24) / 24) * 2 * Math.PI, ring = Math.floor(i / 24), d = [0, 0.011, -bd * 0.5, -bd * 0.88, -bd][ring]!, rr = r * [1, 0.6, 0.86, 0.5, 0][ring]! + (ring === 4 ? 0.004 : 0); return [c[0] + rr * (Math.cos(t) * x[0] + Math.sin(t) * z[0]) + d * y[0], c[1] + rr * (Math.cos(t) * x[1] + Math.sin(t) * z[1]) + d * y[1], c[2] + rr * (Math.cos(t) * x[2] + Math.sin(t) * z[2]) + d * y[2]] as V3; }).every((P) => walls.every((wsf) => { const h = nearStrip(wsf, P), R = inner; return h.d > 0.003 && (P[0] - h.at[0]) * (R[0] - h.at[0]) + (P[1] - h.at[1]) * (R[1] - h.at[1]) + (P[2] - h.at[2]) * (R[2] - h.at[2]) > 0; })); };
      // (narrower and less deep, a step at a time, its lens kept 4 mm under the lamp's own, until it fits; where none fits, as where the housing's walls cross
      // behind a tight corner, no projector there)
      let rp = Math.min(rp0, room * 0.3, bd * 1.6), pin = Math.max(0.012, deep - bd - 0.012); for (let t = 0; t < 8 && !clear(rp, pin); t++) { rp *= 0.88; pin = Math.max(0.015, pin * 0.85); } if (!clear(rp, pin)) return []; return [
      ...onSkin('projector bowl', { lathe: [[0.004, -bd], [rp * 0.5, -bd * 0.88], [rp * 0.86, -bd * 0.5], [rp, 0]] }, u, vMid, pin, { mat: 'al-6061', color: 0xd4d8dc, finish: 'chrome', kg: 0 }),
      ...onSkin('projector lens', { lathe: [[0, 0.011], [rp * 0.42, 0.008], [rp * 0.6, 0.002], [rp * 0.6, -0.004]] }, u, vMid, pin, { mat: 'glass', color: 0xe8f0ff, kg: 0 }),
      // (its dark ring from round the lens out to the bowl's rim, clipped on it; and the bowl on a mount from its foot to the
      // housing's back, screwed there)
      ...onSkin('projector ring', { lathe: [[rp * 0.6, -0.004], [rp * 0.62, 0.003], [rp * 0.95, 0.002], [rp, 0]] }, u, vMid, pin, { mat: 'pp', color: 0x16171a, finish: 'texture', kg: 0, joins: ['projector lens'], fixed: 'clipped onto the rim of its bowl' }),
      ...(deep - pin - bd > 0.002 ? onSkin('projector mount', { lathe: [[0.004, -(deep - pin - 0.0012)], [0.004, -bd]] }, u, vMid, pin, { mat: 'al-6061', color: 0x8a8c8e, finish: 'cast', kg: 0, fixed: 'screwed through its reflector to the back of its housing, holding its projector\'s bowl' }) : [])]; };
    out.push(recess('headlamp', lampW, 0.05, { color: 0x24272c }, 'its headlamps\' housings, open behind their lenses (typical)', (deep, walls) => [
      // (its reflector and its light guide laid on the housing's back, clipped there: not 4 and 10 mm off it, held by nothing)
      { name: 'headlamp reflector', shape: { surf: { s: side, uv: quad(lampW.u0 + wl * 0.12, lampW.u1 - wl * 0.06, lampW.v0 + hh * 0.2, lampW.v1 - hh * 0.18), off: -deep + 0.0008 } }, at: [0, 0, 0], mat: 'al-6061', color: 0xc8ccd2, shell: 0.001, finish: 'chrome', kg: 0, fixed: 'clipped onto the back of its housing', says: 'a chrome reflector in the housing (typical)' },
      ...projector(deep, 0.38, walls), ...projector(deep, 0.66, walls),
      { ...lit('daytime running light', quad(lampW.u0 + wl * 0.06, lampW.u1 - wl * 0.03, lampW.v0 + hh * 0.07, lampW.v0 + hh * 0.115), -deep + 0.0008, 0xf4f8ff, 'its daytime running light: an LED light guide along the lamp\'s foot (typical)'), fixed: 'clipped onto the back of its housing' }]));
    out.push({ name: 'headlights', shape: { surf: { s: side, uv: quad(lampW.u0, lampW.u1, lampW.v0, lampW.v1), off: 0.0005 } }, at: [0, 0, 0], mat: 'pc', color: 0xe6ecf2, shell: 0.003, light: { lm: 1500, color: 0xfff4e0 }, says: 'its headlamps\' lenses, flush with the body: clear polycarbonate (typical)', fixed: 'bonded to its housing', joins: ['headlamp wall'] });
    // the grille: its throat dark, its bars across it gloss black, a bright strip along its top (typical of a sedan's)
    out.push(recess('grille', grilleW, 0.05, {}, 'its upper grille between the headlamps: moulded ABS, its throat open to the radiator behind (typical)', (deep) => [...slats('grille bar', { ...grilleW, u0: Math.max(grilleW.u0, lampW.u1) }, Math.max(2, Math.round(fc.grille / 0.04)), -Math.min(0.012, deep * 0.4), 0x0d0e10, 'paint'),
      { name: 'grille trim', fixed: 'moulded across the opening, one with its walls', shape: { surf: { s: side, uv: quad(Math.max(grilleW.u0, lampW.u1) + 0.0001, 1, grilleW.v1 - (grilleW.v1 - grilleW.v0) * 0.16, grilleW.v1 - (grilleW.v1 - grilleW.v0) * 0.08), off: -Math.min(0.006, deep * 0.2) } }, at: [0, 0, 0], mat: 'abs', color: 0xc0c4ca, shell: 0.002, finish: 'chrome', kg: 0, says: 'a chrome strip along its grille (typical)' }], { u0: lampW.v0 }));
    out.push(recess('lower grille', intakeW, 0.06, {}, 'the lower intake in its front bumper: its throat open, bars across it (typical)', (deep) => slats('lower grille bar', intakeW, 3, -Math.min(0.014, deep * 0.4), 0x111214, 'texture')));
    // (where its number plate goes: on the bumper over the intake's middle, a plate's height above its foot)
    const uP = 1, vP = vAt(uN(0.005), lowN + 0.04 + Math.max(0.05, iH) + 0.06), qP = surfaceAt(side, uP, vP); out.push({ name: 'plate mount', at: [qP.at[0] + qP.n[0] * 0.0033, qP.at[1] + qP.n[1] * 0.0033, qP.at[2] + qP.n[2] * 0.0033], shape: { box: [0.004, 0.08, 0.3] }, mat: 'pp', color: 0x111214, finish: 'texture', kg: 0, joins: ['front fender'], says: 'its front number plate\'s bracket (typical)' });
    // (its bumper cover: the face below a shut line under the lamps and the grille, round to the front arches)
    const uB0 = fArch.length ? U(Math.max(...fArch.map((a) => a.w.x + a.Ra)) + 0.03) : uN(0.6);
    out.push(seam('front bumper shut line', uB0, 1, vAt(uMidF, yBF), 'where its front bumper cover meets the fenders (typical)'));
  }
  {
    // the back: each tail lamp a recess, red within, its light lit along it, under a red lens flush with the body; the
    // valance low across the bumper a dark recess; the bumper cover below a shut line
    const wt = tailW.u1 - tailW.u0, ht = tailW.v1 - tailW.v0;
    out.push(recess('tail lamp', tailW, 0.04, { color: 0x2a0606 }, 'its tail lamps\' housings (typical)', (deep) => [
      // (its reflector on the housing's back, its light guide on the reflector, each clipped there)
      { name: 'tail lamp reflector', shape: { surf: { s: side, uv: quad(tailW.u0 + wt * 0.05, tailW.u1 - wt * 0.08, tailW.v0 + ht * 0.18, tailW.v1 - ht * 0.18), off: -deep + 0.0008 } }, at: [0, 0, 0], mat: 'al-6061', color: 0x8a1a1a, shell: 0.001, finish: 'chrome', kg: 0, fixed: 'clipped onto the back of its housing' },
      { ...lit('tail lamp', quad(tailW.u0 + wt * 0.06, tailW.u1 - wt * 0.1, tailW.v0 + ht * 0.55, tailW.v0 + ht * 0.72), -deep + 0.0016, 0xff2a1a, 'its tail lamps lit: an LED light guide (typical)'), fixed: 'clipped onto its reflector' }]));
    out.push({ name: 'tail lights', shape: { surf: { s: side, uv: quad(tailW.u0, tailW.u1, tailW.v0, tailW.v1), off: 0.0005 } }, at: [0, 0, 0], mat: 'pmma', color: 0xb01010, shell: 0.003, says: 'its tail lamps\' lenses, flush with the body: red acrylic (typical)', fixed: 'bonded to its housing', joins: ['tail lamp wall'] });
    out.push(recess('rear valance', valW, 0.02, {}, 'the dark valance low across its rear bumper (typical)'));
    // (its back on the skin, not its middle: the mount stands out of the skin by its own thickness, not half sunk in it)
    const vPt = vAt(uTl(0.005), yTopT - 0.03 - 0.12 - 0.07), qPt = surfaceAt(side, 0, vPt); out.push({ name: 'plate mount', at: [qPt.at[0] + qPt.n[0] * 0.0022, qPt.at[1] + qPt.n[1] * 0.0022, qPt.at[2] + qPt.n[2] * 0.0022], shape: { box: [0.004, 0.08, 0.3] }, mat: 'pp', color: 0x111214, finish: 'texture', kg: 0, joins: ['rear quarter panel'], says: 'its rear number plate\'s place (typical)' });
    const yB = yTopT - 0.03 - 0.12 - 0.06, uB1 = rArch.length ? U(Math.min(...rArch.map((a) => a.w.x - a.Ra)) - 0.03) : uTl(0.6);
    out.push(seam('rear bumper shut line', 0, uB1, vAt(uMidT, yB), 'where its rear bumper cover meets the quarters (typical)'));
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
      // (and crowned more where its maker's check found it short over something under it, easing in and out over 150 mm)
      const liftAt = (x: number) => (b.lift ?? []).reduce((a, l) => { const d = x < l.x0 ? l.x0 - x : x > l.x1 ? x - l.x1 : 0; return a + (d >= 0.15 ? 0 : l.dy * (0.5 + 0.5 * Math.cos((Math.PI * d) / 0.15))); }, 0);
      const crown = crown0 * (1 - 0.6 * Math.max(ease(ln.xN - E[0], 0.35), ease(E[0] - ln.xT, 0.25))) + liftAt(E[0]);
      const t = unit3(d), P0: V3 = [E[0], E[1] + t[1] * r.gap, Math.max(0, E[2] + t[2] * r.gap)], zt = P0[2], y = P0[1], k = Math.min(2, (zt * 0.25) / (Math.hypot(...d) || 1), Math.max(0, crown * 0.8) / Math.max(1e-6, Math.abs(d[1]) || 1e-6));
      return [P0, [E[0], y + d[1] * k, zt + d[2] * k], [E[0], y + crown, zt * 0.5], [E[0], y + crown, zt * 0.16], [E[0], y + crown, 0]];
    }, { mirror: true });
    return paint(name, { s }, { says, meets: [{ part: meets, edge: 'b0', kind: 'G1', why: `a highlight runs off the ${meets}'s top onto the ${name} across their shut line` }, { part: name, edge: 'b1', kind: 'mirror', why: 'it crosses its middle in one tangent plane, or a ridge runs down it' }] });
  };
  const hood = lid('hood', ln.xCowl + r.gap, ln.xN, r.crown.hood, 'its hood: pressed steel about 0.7 mm, crowned about 30 mm (typical), its edges in one tangent plane with the fenders\' tops', doors ? 'front fender' : 'body sides');
  if (hood) out.push(hood);
  if (deckLid) { const deck = lid('deck lid', ln.xT, xCab - r.gap, r.crown.deck, 'its deck lid (or tailgate): pressed steel (typical)', doors ? 'rear quarter panel' : 'body sides'); if (deck) out.push(deck); }
  // (the lids are made first, so a liner is held under them)
  const lidPts = out.filter((p) => (p.name === 'hood' || p.name === 'deck lid') && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 90, 40));
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
    // (and nothing of it higher than 15 mm under the skin's top edge there: a liner never stands out of its fender; where
    // the sweep would want it higher, it stays, and the critic says so)
    // (and at each depth in, no higher than where the skin over it, leaning in toward its top, is still 4 mm outside that
    // depth, less 15 mm: a liner standing deeper in than the skin's top edge stops under the fender's roll-over too; each
    // read at the point's own place along the car, where its ray reaches, not at its lip's)
    const edgeY = (x: number) => pointAt(side, U(x), 1)[1];
    const skinOver = (x: number, z: number) => { const u = U(x); for (let j = 0; j <= 48; j++) { const v = 1 - j / 48, P = pointAt(side, u, v); if (P[1] < w.y) break; if (P[2] >= z + 0.004) return j === 0 ? edgeY(x) : P[1]; } return edgeY(x); };
    const capMemo = new Map<number, number>();
    // (and under the hood or the deck lid over it, which can dip under the skin's top edge where the skin rolls over)
    const lidY = (x: number, z: number) => { let y = Infinity; for (const q of lidPts) if (Math.abs(q[0] - x) < 0.02 && Math.abs(Math.abs(q[2]) - Math.abs(z)) < 0.02 && q[1] < y) y = q[1]; return y; };
    const capR = (n: number, k = 1) => { const id = n * K + k, c0 = capMemo.get(id); if (c0 !== undefined) return c0; const sn = Math.sin(ang[n]!), cs = Math.cos(ang[n]!); let r2 = Infinity;
      if (sn > 0.2) { r2 = (topY[n]! - 0.015 - w.y) / sn; for (let it = 0; it < 4; it++) { const x = w.x + cs * r2, z = k >= 2 ? zOf(n, k) : pts[n]![2], yc = Math.min(k >= 2 ? Math.min(edgeY(x), skinOver(x, z)) : edgeY(x), lidY(x, z)) - 0.015; r2 = (yc - w.y) / sn; } }
      capMemo.set(id, r2); return r2; }, radOf = (n: number, k: number) => Math.min(rad[n]![k]!, Math.max(rad[n]![0]!, capR(n, k)));
    // (the return's depth read off the skin where the return is, along the car, not at its lip: the skin curves in toward
    // the arch's ends in plan)
    const skinZAt = (x: number, y: number) => { const u = U(x); if (y >= pointAt(side, u, 1)[1]) return pointAt(side, u, 1)[2]; let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (pointAt(side, u, m)[1] < y) lo = m; else hi = m; } return pointAt(side, u, (lo + hi) / 2)[2]; };
    const at = (n: number, k: number): V3 => { const rr2 = radOf(n, k), x = w.x + Math.cos(ang[n]!) * rr2, y = w.y + Math.sin(ang[n]!) * rr2; return [x, y, k === 1 ? Math.min(pts[n]![2], skinZAt(x, y)) - 0.004 : zOf(n, k)]; };
    const build = (): Surface => ({ net: pts.map((_, n) => zs.map((_, k) => at(n, k))), mirror: true });
    // then looked at, point by point, against the sweep; where it is in it, the control points under that point moved out
    // 5 mm, until it is clear everywhere (the creator's own check, as the arch's radius is found)
    // (looked at coarsely until clear, then finely, with 5 mm to spare, so what is between the points looked at is clear too)
    let s2 = build(); const spare = { ...r.room, radial: r.room.radial + 0.005, side: r.room.side + 0.005 };
    for (const [NA, NB] of [[pts.length * 2, 24], [pts.length * 4, 48]] as const) for (let tries = 0; tries < 40; tries++) {
      // (each control point under any point in the sweep moved once a round, however many such points it is under)
      const push = new Set<number>();
      // (the lip's own strip, where the liner turns in from the skin, is the arch's: the tyre passes just behind it in bump
      // and swings out through the opening at lock, as on a real car; the liner clears the sweep from there in)
      for (let ia = 0; ia <= NA; ia++) for (let ib = Math.ceil(NB * 0.15); ib <= NB; ib++) {
        if (!inSweep(pointAt(s2, ia / NA, ib / NB), w, spare)) continue;
        const n0 = Math.round((ia / NA) * (pts.length - 1)), k0 = Math.round((ib / NB) * (K - 1));
        for (let n = Math.max(0, n0 - 1); n <= Math.min(pts.length - 1, n0 + 1); n++) for (let k = Math.max(1, k0 - 1); k <= Math.min(K - 1, k0 + 1); k++) push.add(n * K + k);
      }
      if (!push.size) break;
      let moved = 0; for (const id of push) { const n = Math.floor(id / K), k = id % K; if (rad[n]![k]! < capR(n, k)) { rad[n]![k]! += 0.005; moved++; } }
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
    out.push({ name: `${w.name.replace(/ wheel$/, '')} wheelhouse liners`, shape: { surf: { s: s2 } }, at: [0, 0, 0], mat: 'pp', color: 0x161616, shell: 0.0025, finish: 'texture', joins: [`${w.name.replace(/ wheel$/, '')} inner wheelhouses`], fixed: 'clipped to its inner wheelhouse and onto the arch lip of the fender or quarter panel over it', says: `the liner of the arch over each ${w.name}: moulded polypropylene, its every point clear of the tyre steered ${Math.round((w.steer * 180) / Math.PI)}° either way and risen ${Math.round(w.bump * 1000)} mm (the arch ${Math.round(a.Ra * 1000)} mm round the axle)` });
  }
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
    const p = r.cabin.pillar / 1.2, vg0 = 0.022, v3 = (cg[2]! + cg[3]!) / 2, uS = doors && xFDt < ln.xCowl - 0.01 ? Uc(xFDt - g) : 1;
    // (flush in its opening, as a flush-glazed car's is: its edge on its frame's edge, bonded there on a urethane bead to
    // the flange behind (the bead and the flange not drawn); not set 1.5 mm off its frame, touching nothing)
    // (a door's glass is not bonded: it drops into the door, running in channels along its frame, not drawn)
    const glass = (name: string, uv: [UV, UV, UV, UV], says: string): Part => ({ name, shape: { surf: { s: cab, uv } }, at: [0, 0, 0], mat: 'glass', color: 0x1e2a33, shell: 0.0045, fixed: /side windows/.test(name) ? 'its door\'s drop glass, running in channels in its door\'s frame (not drawn)' : 'bonded round its edge to what it meets, on a urethane bead (not drawn)', says });
    const trim = (name: string, uv: [UV, UV, UV, UV], more: Partial<Part> = {}): Part => paint(name, { s: cab, uv }, more);
    const xCe = b.lines.dloR !== undefined ? Math.min(ln.xRoofR - 0.05, b.L / 2 - b.lines.dloR * b.L) : ln.xRoofR - 0.05, uWs = Uc(ln.xRoofF), uRr = Uc(ln.xRoofR), uB0 = Uc(xB - r.cabin.pillar), uB1 = Uc(xB + r.cabin.pillar), uCe = Uc(xCe);
    // (its belt mouldings where the side glass leaves the doors: one on each door's top, parted at its shut lines so the
    // door can open, clipped to that door; one on the quarter behind them, clipped to it. Not one strip across the shut
    // lines, which would hold the doors shut and say they were held by it)
    const belt = { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture' as const }, uBeltR = doors && twoDoors && xRDt > xCe + 0.03 ? Uc(xRDt + g / 2) : open ? 0 : uCe;
    if (doors && twoDoors && !open) {
      out.push(trim('front door belt moulding', [[Uc(xB + g / 2), 0], [uS, 0], [uS, vg0], [Uc(xB + g / 2), vg0]], { ...belt, fixed: 'clipped onto the top of its door', says: 'the belt moulding where the side glass leaves its front door (typical)' }));
      out.push(trim('rear door belt moulding', [[uBeltR, 0], [Uc(xB - g / 2), 0], [Uc(xB - g / 2), vg0], [uBeltR, vg0]], { ...belt, fixed: 'clipped onto the top of its door', says: 'the belt moulding where the side glass leaves its rear door (typical)' }));
      if (uBeltR > uCe + 1e-6) out.push(trim('quarter belt moulding', [[uCe, 0], [Uc(xRDt - g / 2), 0], [Uc(xRDt - g / 2), vg0], [uCe, vg0]], { ...belt, fixed: 'clipped onto the top of its quarter panel', says: 'the belt moulding under its quarter glass (typical)' }));
    } else out.push(trim('belt mouldings', [[open ? 0 : uCe, 0], [1, 0], [1, vg0], [open ? 0 : uCe, vg0]], { ...belt, says: 'the belt mouldings where the side glass leaves the doors (typical)' }));
    if (!open) {
      out.push(glass('windscreen', [[uWs, v3 + p], [1, v3 + p], [1, 1], [uWs, 1]], 'its windscreen: laminated glass, about 4.5 mm (typical)'));
      out.push(trim('roof', [[uRr, v3 - p], [uWs, v3 - p], [uWs, 1], [uRr, 1]], { fixed: 'spot-welded along its edges to the roof rails and the tops of the pillars', says: 'its roof panel: pressed steel about 0.7 mm (typical)', meets: [{ part: 'roof', edge: 'b1', kind: 'mirror', why: 'it crosses its middle in one tangent plane' }] }));
      out.push(trim('pillars and roof rails', [[0, v3 - p], [uRr, v3 - p], [uRr, v3 + p], [0, v3 + p]], { fixed: 'pressed as one with the pillars, roof rails, quarter panel and sill of its body side (the body side outer, one stamping: typical)', says: 'its C pillars and the rails along the roof (typical)' }));
      out.push(trim('A pillars', [[uWs, v3 - p], [1, v3 - p], [1, v3 + p], [uWs, v3 + p]], { fixed: 'pressed as one with the pillars, roof rails, quarter panel and sill of its body side (the body side outer, one stamping: typical)', says: 'its A pillars beside the windscreen (typical)' }));
      out.push(glass('back glass', [[0, v3 + p], [uRr, v3 + p], [uRr, 1], [0, 1]], 'its back glass: toughened glass about 4 mm (typical)'));
      out.push(trim('C pillars', [[0, 0], [uCe, 0], [uCe, v3 - p], [0, v3 - p]], { fixed: 'pressed as one with the pillars, roof rails, quarter panel and sill of its body side (the body side outer, one stamping: typical)', says: 'its C pillars (typical)' }));
      if (twoDoors) {
        out.push(trim('B pillars', [[uB0, vg0], [uB1, vg0], [uB1, v3 - p], [uB0, v3 - p]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', fixed: 'a black applique clipped over its pillar\'s pressing (not drawn)', says: 'its B pillars, trimmed black (typical)' }));
        out.push(glass('front side windows', [[uB1, vg0], [uS, vg0], [uS, v3 - p], [uB1, v3 - p]], 'its front door glass: toughened, about 4 mm (typical)'));
        // (a long cabin's glass behind the B pillars split by pillars: at the rear doors' back edge, and every 1.1 m or so
        // behind that, as a van's or an estate's is)
        // (or, where the glass runs on behind a rear door that leans back over its arch, at that door's frame: a thin bar, the
        // glass behind it fixed in the body)
        const frame = xRDt < xRD - 0.01 && xRDt - xCe > 0.03, cuts = frame ? [xRDt] : xRD - xCe > 0.35 && xB - r.cabin.pillar - xRD > 0.3 ? [xRD] : [], last = cuts.length ? cuts[0]! : xB - r.cabin.pillar, more = frame ? 0 : Math.floor((last - xCe) / 1.1);
        for (let k = 1; k <= more; k++) cuts.push(last - ((last - xCe) * k) / (more + 1));
        const half = frame ? 0.012 : r.cabin.pillar, edges = [uB0, ...cuts.sort((a2, b2) => b2 - a2).flatMap((x) => [Uc(x + half), Uc(x - half)]), uCe];
        for (let k = 0; k + 1 < edges.length; k += 2) out.push(frame && k > 0 ? glass('rear quarter windows', [[edges[k + 1]!, vg0], [edges[k]!, vg0], [edges[k]!, v3 - p], [edges[k + 1]!, v3 - p]], 'its rear quarter glass, fixed in the body behind its rear door (typical)') : glass('rear side windows', [[edges[k + 1]!, vg0], [edges[k]!, vg0], [edges[k]!, v3 - p], [edges[k + 1]!, v3 - p]], 'its rear side glass (typical)'));
        for (const x of cuts) out.push(trim(frame ? 'rear door frames' : 'D pillars', [[Uc(x - half), vg0], [Uc(x + half), vg0], [Uc(x + half), v3 - p], [Uc(x - half), v3 - p]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', says: frame ? 'its rear door\'s window frame, where its glass runs on behind the door, trimmed black (typical)' : 'a pillar between its rear side windows, trimmed black (typical)' }));
      } else out.push(glass('side windows', [[uCe, vg0], [uS, vg0], [uS, v3 - p], [uCe, v3 - p]], 'its side glass (typical)'));
      // (where its door is set back from its windscreen's foot, the corner between its glass and its A pillar a black sail,
      // fixed: its glass in its door)
      if (uS < 1 - 1e-6) out.push(trim('mirror sails', [[uS, vg0], [1, vg0], [1, v3 - p], [uS, v3 - p]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', fixed: 'clipped into the corner at the foot of its A pillar', says: 'the black sail between its front door glass and its A pillar, ahead of its door (typical)' }));
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

/** The body's tail from inside: at height y, the most forward its skins that face rearward come within z of the middle
 *  (where a bed's floor or a boot's floor must end to stay inside it). */
export function tailOf(parts: Part[]): (y: number, z: number) => number {
  const pts: V3[] = [];
  for (const p of parts) {
    if (!p.shape || !('surf' in p.shape) || /liner|handle|lamp|light|grille|plate|seam|shut line/.test(p.name)) continue;
    const pt = p.shape.surf; for (let i = 0; i <= 32; i++) for (let j = 0; j <= 12; j++) { const q = patchAt(pt, i / 32, j / 12); if (q.n[0] < -0.5 && q.at[0] < 0) pts.push(q.at); }
  }
  return (y, z) => { let best = -Infinity; for (const P of pts) if (Math.abs(P[1] - y) < 0.06 && Math.abs(P[2]) <= z + 0.02) best = Math.max(best, P[0]); return best; };
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
    // (a skin is in a wheel's way where the wheel goes straight ahead through its bump, or at full lock at ride height: the
    // two at once are the wheelhouse's, behind the skin, BODY_RULES 'lip')
    if (!/liner/.test(p.name)) for (const w of plan.wheels) blocked += patchPoints(p.shape.surf, 24, 10).filter((q) => inSweep(q, { ...w, steer: 0 }, room) || inSweep(q, { ...w, bump: 0 }, room)).length;
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
