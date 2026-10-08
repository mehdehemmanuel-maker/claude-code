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

import { curveAt, fairness, fromEdge, greville, patchAt, patchPoints, pointAt, skinThrough, split, type Curve, type Patch, type Surface, type UV, type V3 } from './surface';
import type { Part } from './kits';
import type { Lines } from './machines';

/** A wheel as the body sees it: its middle (z its mid-plane's distance out), radius, width, and how it moves. */
export interface WheelAt { name: string; x: number; y: number; z: number; R: number; w: number; /** its lock either way, rad */ steer: number; /** how far it rises in bump, m */ bump: number }
/** What the body must clear inside it: a box, and the room kept over it (an engine under its hood). */
export interface KeepOut { name: string; min: V3; max: V3; room: number; why: string }
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
  /** a shut line's gap, m */ gap: number;
  /** skins fitted fairly across their stations: a control column to every so many metres of outline, so much weight on
   *  bending (none: forced through every station) */ fit: { step: number; lambda: number } | null;
}
export const BODY_RULES: BodyRules = {
  room: { radial: 0.03, side: 0.015, poses: 7 },
  flare: 0.008,
  side: { shoulder: 0.1, tumble: 0.03, tuck: 0.06, inset: 0.075 },
  crown: { hood: 0.03, roof: 0.035, deck: 0.025 },
  plan: { nose: 0.5, tail: 0.4, k: 2.6 },
  stations: { step: 0.14, ends: 8 },
  cabin: { roof: 0.72, pillar: 0.04 },
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
/** Whether a point is inside the room a wheel needs anywhere through its motion: its tyre's cylinder grown by the room
 *  asked, steered about the vertical through its middle (a kingpin near the wheel's plane, typical of a modern car's
 *  small scrub radius) and risen anywhere up to its bump. */
export function inSweep(P: V3, w: WheelAt, room = BODY_RULES.room): boolean {
  const RR = w.R + room.radial, hw = w.w / 2 + room.side, dx = P[0] - w.x, dz = P[2] - w.z;
  for (const th of posesOf(w, room.poses)) {
    const t = dx * Math.sin(th) + dz * Math.cos(th); if (Math.abs(t) > hw) continue;
    const r2 = RR * RR - (dx * dx + dz * dz - t * t); if (r2 < 0) continue;
    const r = Math.sqrt(r2), lo = P[1] - w.y - w.bump, hi = P[1] - w.y; // the offsets from the centre it can have, risen 0…bump
    if (hi >= -r && lo <= r) return true;
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
  // what it must clear, as a height over x: an engine and its strut tops under the hood, and each arch with its lip (a
  // low car's fender rises over its wheel), ramped in and out smoothly so the line lifted over it bends but never kinks
  // (lifting the drawn line's control points would not do: a B-spline only leans toward its points)
  const lip = 0.06, clears: { x0: number; x1: number; y: number }[] = [...(b.inside ?? []).map((k) => ({ x0: k.min[0], x1: k.max[0], y: k.max[1] + k.room })), ...b.wheels.map((w) => ({ x0: w.x - w.R * 0.6, x1: w.x + w.R * 0.6, y: w.y + w.R + r.room.radial + w.bump * 0.5 + lip }))];
  const need = (x: number) => { let v = -Infinity; for (const k of clears) { const ramp = 0.18, d = x < k.x0 ? k.x0 - x : x > k.x1 ? x - k.x1 : 0; if (d >= ramp) continue; const g = 0.5 + 0.5 * Math.cos((Math.PI * d) / ramp); v = Math.max(v, k.y - (1 - g) * 0.12); } return v; };
  const drawn = lineBy([
    [xT, deckY - (ln.bed ? 0.02 : 0.09)], [xT + 0.06, deckY - (ln.bed ? 0.005 : 0.03)], [xT + 0.2, deckY], ...(xDeck - xT > 0.6 ? [[(xT + xDeck) / 2 + 0.1, deckY + 0.004] as [number, number]] : []), [xDeck, beltAt(xDeck)],
    [(xDeck + xCowl) / 2, beltAt((xDeck + xCowl) / 2)], [xCowl, beltAt(xCowl)],
    [xCowl + hoodRun * 0.4, noseH + (belt - noseH) * 0.55], [xN - 0.16, noseH + 0.01], [xN - 0.05, noseH - 0.025], [xN, noseH - 0.075],
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
const copy = (p: Part): Part => ({ ...p, parts: p.parts?.map(copy) });
export function bodyPanels(b: BodyPlan, r: BodyRules = BODY_RULES): Part[] {
  const key = JSON.stringify([b, r]), kept = made.get(key); if (kept) return kept.map(copy);
  const out = makeBody(b, r); if (made.size > 64) made.clear(); made.set(key, out); return out.map(copy);
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
  // each section drawn as its control polygon, bottom to top: tucked in at the rocker, out through the lower door to the
  // shoulder (two points at its widest, so it is held there), leaning in above it, and rolled over to the top edge along
  // the direction the hood leaves it. A B-spline never wavers more than its polygon, so a convex polygon makes a section
  // with no ripple in it, whatever its neighbours are like.
  const section = (x: number): V3[] => {
    // (convex as drawn: each leg of it leans in more than the one below it, from the tuck under to the roll over the top)
    const w = ln.plan(x), f = w / W2, lo = ln.low(x), top = ln.top(x), sh = Math.max(lo + 0.08, ln.shoulder(x)), tk = tuckAt(x), d = sh - lo, ar = arrive(x), zt = w - r.side.inset * f, hand = Math.min(0.03, 0.3 * (top - sh)) * Math.max(0.15, f);
    return [[x, lo, w - tk * f], [x, lo + Math.min(0.1, 0.25 * d), w - tk * 0.55 * f], [x, lo + 0.5 * d, w - tk * 0.12 * f], [x, sh - 0.04, w + 0.004 * f], [x, sh + 0.02, w + 0.004 * f], [x, sh + 0.02 + 0.6 * (top - sh - 0.02), w - r.side.tumble * 0.4 * f], [x, top - hand * ar[1], zt - hand * ar[2]], [x, top, zt]];
  };
  const rows = xs.map(section);
  const fitOf = (xs2: number[]) => (r.fit ? { n: Math.max(5, Math.round(outlineLength(xs2, ln.plan) / r.fit.step)), lambda: r.fit.lambda } : undefined);
  const uo = byOutline(xs, ln.plan), side = skinThrough(rows, { mirror: true, control: true, u: uo, e0: [0, 0, 1], e1: [0, 0, -1], fit: fitOf(xs) });
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
  const xFD = Math.min(ln.xCowl + 0.05, fArchRear - 0.1), g = r.gap / 2, xB = ln.xB, open = !!b.lines.open; let xRD = Math.max(rArchFront + 0.04, ln.xRoofR - 0.2);
  // its doors: two a side where it has them (its maker's count, else by its length), or one long one (a coupe's, about
  // 1.15 m: typical), the rear quarter running forward to meet it
  const doors = !b.lines.bed && xFD - xRD > 0.6, twoDoors = doors && (b.lines.doors ? b.lines.doors === 2 : xFD - xRD > 1.6);
  if (doors && !twoDoors) xRD = Math.max(xRD, xFD - 1.15);
  // a panel trimmed round the arches in its run: its bottom edge along v = 0, rising round each arch and falling back
  const trimmed = (u0: number, u1: number): UV[] => { const pts: UV[] = [[u0, 0]]; for (const a of arches) for (const q of a.line) if (q[0] > u0 && q[0] < u1) pts.push(q); pts.push([u1, 0]); return pts.sort((p, q) => p[0] - q[0]); };
  const uFD = U(xFD), uRD = U(xRD), du = (x: number) => U(x + g) - U(x - g);
  if (doors) {
    out.push(paint('front fender', { s: side, above: trimmed(uFD + du(xFD), 1) }, { meets: [{ part: 'front fender', edge: 'a1', kind: 'mirror', why: 'its nose crosses the middle in one tangent plane, or a ridge runs down its face' }], says: 'its front fenders, and the nose and front bumper they run into: pressed steel about 0.8 mm (typical of car skins); each arch round its wheel by how far the wheel steers and rises' }));
    out.push(paint('rear quarter panel', { s: side, above: trimmed(0, uRD - du(xRD)) }, { meets: [{ part: 'rear quarter panel', edge: 'a0', kind: 'mirror', why: 'its tail crosses the middle in one tangent plane' }], says: 'its rear quarters and the tail: pressed steel about 0.8 mm (typical)' }));
    out.push(paint('sills', { s: side, uv: [[uRD, 0], [uFD, 0], [uFD, vSill - 0.004], [uRD, vSill - 0.004]] }, { shell: 0.0012, says: 'the sills under the doors (rocker panels): pressed steel, thicker (typical)' }));
    const door = (name: string, x0: number, x1: number) => paint(name, { s: side, uv: [[U(x0 + g), vSill], [U(x1 - g), vSill], [U(x1 - g), 1], [U(x0 + g), 1]] }, { says: 'a door skin: pressed steel about 0.8 mm, between its shut lines (4 mm gaps, typical)' });
    if (twoDoors) out.push(door('front doors', xB, xFD), door('rear doors', xRD, xB)); else out.push(door('doors', xRD, xFD));
    // a handle near each door's back edge, a little under its shoulder, standing a few millimetres proud (typical)
    for (const x1 of twoDoors ? [xB, xRD] : [xRD]) out.push(paint('door handles', { s: side, uv: [[U(x1 + 0.07), sv[3]! - 0.055], [U(x1 + 0.24), sv[3]! - 0.055], [U(x1 + 0.24), sv[3]! - 0.025], [U(x1 + 0.07), sv[3]! - 0.025]], off: 0.002 }, { shell: 0.002, says: 'a door handle (typical)' }));
  } else out.push(paint('body sides', { s: side, above: trimmed(0, 1) }, { says: 'its sides: pressed steel about 0.8 mm (typical)' }));
  // ---- lamps and the grille, on the faces at its ends ----
  const uN = (d: number) => U(ln.xN - d), uTl = (d: number) => U(ln.xT + d);
  // the face: the grille a slot between the headlamps under the hood's edge, the bumper below it in the body's colour
  // (where the plate goes), and the intake under that (typical of a modern car's face)
  out.push({ name: 'lower grille', shape: { surf: { s: side, uv: [[uN(0.012), sv[0]! + 0.015], [1, sv[0]! + 0.015], [1, sv[1]! + 0.02], [uN(0.012), sv[1]! + 0.02]], off: 0.002 } }, at: [0, 0, 0], mat: 'abs', color: 0x101010, shell: 0.003, finish: 'texture', says: 'the lower intake in the front bumper (typical)' });
  // a headlamp as it is built, in layers on the skin: its dark housing, two lamp units in it (projectors, typical of a
  // modern car's), and the clear lens over them
  const lampUV = (a0: number, a1: number, b0: number, b1: number): [UV, UV, UV, UV] => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]], hl0 = uN(0.42), hl1 = uN(0.03), hb0 = sv[3]! + 0.005, hb1 = sv[5]! - 0.03;
  const unit = (k: number): Part => { const a = hl0 + (hl1 - hl0) * (0.22 + 0.3 * k), w2 = (hl1 - hl0) * 0.1, b = (hb0 + hb1) / 2, h2 = (hb1 - hb0) * 0.28; return { name: 'lamp unit', shape: { surf: { s: side, uv: lampUV(a - w2, a + w2, b - h2, b + h2), off: 0.0026 } }, at: [0, 0, 0], mat: 'pc', color: 0xfff4dc, glow: true, shell: 0.002, says: 'an LED projector (typical)' }; };
  out.push({ name: 'headlights', shape: { surf: { s: side, uv: lampUV(hl0, hl1, hb0, hb1), off: 0.004 } }, at: [0, 0, 0], mat: 'pc', color: 0xd8e0e8, shell: 0.003, light: { lm: 1500, color: 0xfff4e0 }, says: 'its headlamps wrapping round the nose\'s corners: a polycarbonate lens over each (typical)',
    parts: [{ name: 'headlamp housing', shape: { surf: { s: side, uv: lampUV(hl0, hl1, hb0, hb1), off: 0.0012 } }, at: [0, 0, 0], mat: 'pp', color: 0x0c0d0f, shell: 0.002, finish: 'texture', says: 'the dark housing behind each lens (typical)' }, unit(0), unit(1)] });
  out.push({ name: 'grille', shape: { surf: { s: side, uv: [[uN(0.03), sv[3]! + 0.01], [1, sv[3]! + 0.01], [1, sv[5]! - 0.05], [uN(0.03), sv[5]! - 0.05]], off: 0.002 } }, at: [0, 0, 0], mat: 'abs', color: 0x121212, shell: 0.003, finish: 'texture', says: 'its grille between the headlamps (moulded ABS, typical)' });
  out.push({ name: 'tail lights', shape: { surf: { s: side, uv: [[uTl(0.012), sv[3]! - 0.02], [uTl(0.3), sv[3]! - 0.02], [uTl(0.3), sv[5]! - 0.03], [uTl(0.012), sv[5]! - 0.03]], off: 0.002 } }, at: [0, 0, 0], mat: 'pmma', color: 0xb01818, shell: 0.003, says: 'its tail lamps round the tail\'s corners: red acrylic lenses (typical)' });
  // ---- each wheelhouse liner: from the arch's lip in past the tyre's inner face, as far out at each depth as the sweep is ----
  for (const a of arches) {
    const pts = a.line.filter((q) => q[1] > 0.0005).map((q) => pointAt(side, q[0], q[1])); if (pts.length < 4) continue;
    const w = a.w, zIn = w.z - w.w / 2 - 0.04, zs = [0, 0, 0.25, 0.5, 0.75, 1], K = zs.length;
    // its net drawn, not interpolated (so every point of it is a blend of its control points with no negative weights, and
    // moving one out only moves it out): along the arch, one column per point of the lip; across it, from the lip, out at
    // the lip's own depth to where a risen tyre is clear (the return a fender's lip has, which the tyre tucks up behind),
    // then in past the tyre's inner face, each row no nearer the axle than the one outside it (the liner widens inward,
    // so its core pulls out toward the car's middle)
    const ang = pts.map((P) => Math.atan2(P[1] - w.y, P[0] - w.x)), rad = pts.map((P) => zs.map(() => Math.hypot(P[0] - w.x, P[1] - w.y))), zOf = (n: number, k: number) => pts[n]![2] + (zIn - pts[n]![2]) * zs[k]!;
    const build = (): Surface => ({ net: pts.map((_, n) => zs.map((_, k) => [w.x + Math.cos(ang[n]!) * rad[n]![k]!, w.y + Math.sin(ang[n]!) * rad[n]![k]!, zOf(n, k)] as V3)), mirror: true });
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
      for (const id of push) rad[Math.floor(id / K)]![id % K]! += 0.005;
      for (const row of rad) for (let k = 2; k < K; k++) row[k] = Math.max(row[k]!, row[k - 1]!);
      s2 = build();
    }
    out.push({ name: `${w.name.replace(/ wheel$/, '')} wheelhouse liners`, shape: { surf: { s: s2 } }, at: [0, 0, 0], mat: 'pp', color: 0x161616, shell: 0.0025, finish: 'texture', says: `the liner of the arch over each ${w.name}: moulded polypropylene, its every point clear of the tyre steered ${Math.round((w.steer * 180) / Math.PI)}° either way and risen ${Math.round(w.bump * 1000)} mm (the arch ${Math.round(a.Ra * 1000)} mm round the axle)` });
  }
  // ---- the hood and the deck lid: from the side's top edge to the middle, crowned ----
  const lid = (name: string, x0: number, x1: number, crown: number, says: string, meets: string): Part | null => {
    if (x1 - x0 < 0.08) return null;
    // built on the side skin's own top edge, cut from it between its ends (so the two share their knots and meet along
    // all of it, not only where sections were drawn): each section's control polygon leaving that edge set in by the
    // shut line's gap, along the side's own last leg there and twice it (so the side's tangent across the edge and the
    // lid's are one, G1, all along; shortened only in the last centimetres of the nose, where it would cross the crown);
    // then crowned, and level across the middle (one tangent plane with its mirror), its points on the two tangent lines
    // a parabola's crown has, so it is convex
    const a = x0 <= ln.xT + 1e-6 ? 0 : uAt(side, x0, 1), c = x1 >= ln.xN - 1e-6 ? 1 : uAt(side, x1, 1);
    const s = fromEdge(split(side, a, c), (E, d): V3[] => {
      const t = unit3(d), P0: V3 = [E[0], E[1] + t[1] * r.gap, Math.max(0, E[2] + t[2] * r.gap)], zt = P0[2], y = P0[1], k = Math.min(2, (zt * 0.25) / (Math.hypot(...d) || 1));
      return [P0, [E[0], y + d[1] * k, zt + d[2] * k], [E[0], y + crown, zt * 0.5], [E[0], y + crown, zt * 0.16], [E[0], y + crown, 0]];
    }, { mirror: true });
    return paint(name, { s }, { says, meets: [{ part: meets, edge: 'b0', kind: 'G1', why: `a highlight runs off the ${meets}'s top onto the ${name} across their shut line` }, { part: name, edge: 'b1', kind: 'mirror', why: 'it crosses its middle in one tangent plane, or a ridge runs down it' }] });
  };
  const hood = lid('hood', ln.xCowl + r.gap, ln.xN, r.crown.hood, 'its hood: pressed steel about 0.7 mm, crowned about 30 mm (typical), its edges in one tangent plane with the fenders\' tops', doors ? 'front fender' : 'body sides');
  if (hood) out.push(hood);
  if (!b.lines.bed) { const deck = lid('deck lid', ln.xT, ln.xDeck - r.gap, r.crown.deck, 'its deck lid (or tailgate): pressed steel (typical)', doors ? 'rear quarter panel' : 'body sides'); if (deck) out.push(deck); }
  // ---- the cabin: from the belt leaning in to the roof's rails, then across; its glass and pillars regions of it ----
  {
    const xEnd = ln.xCowl, xStart = open ? ln.xRoofF : ln.xDeck, zRoof = W2 * r.cabin.roof;
    // (built on the side skin's top edge between its ends, as the lids are: its belt edge is the doors' top edge, a
    // crease there by design, but one edge)
    const cab = fromEdge(split(side, uAt(side, xStart, 1), uAt(side, xEnd, 1)), (E): V3[] => {
      const x = E[0], zt = E[2], y0 = E[1], yT = Math.max(y0 + 0.004, ln.roof(x)), k = Math.min(1, Math.max(0.02, (yT - y0) / Math.max(0.05, b.H - y0)));
      // its control polygon: up the glass from the belt, leaning in and bowed out a little, round the rail (a radius there,
      // not an edge: its corner a control point, its neighbours a few centimetres off it), across the roof, level at the middle
      // (its rail leaning in faster than the cabin rises, by the root of how far it has risen: so where the cabin runs out
      // into the deck and the hood, its section lies down flat as a lid does, rather than shrinking into a fold too tight to press)
      const rail = yT - r.crown.roof * k, zR = zt - (zt - zRoof) * Math.sqrt(k), rr = 0.05 * k;
      return [[x, y0, zt], [x, y0 + (rail - y0) * 0.35, zt + (zR - zt) * 0.35 + 0.012 * k], [x, rail - rr, zR + rr * 0.35], [x, rail + rr * 0.15, zR - rr * 0.25], [x, yT - r.crown.roof * k * 0.2, zR * 0.55], [x, yT, zR * 0.18], [x, yT, 0]];
    }, { mirror: true }), cg = greville(cab.net[0]!.length, 3), Uc = (x: number) => uAt(cab, x, (cg[2]! + cg[3]!) / 2);
    const p = r.cabin.pillar / 1.2, vg0 = 0.022, v3 = (cg[2]! + cg[3]!) / 2;
    const glass = (name: string, uv: [UV, UV, UV, UV], says: string): Part => ({ name, shape: { surf: { s: cab, uv, off: 0.0015 } }, at: [0, 0, 0], mat: 'glass', color: 0x1e2a33, shell: 0.0045, says });
    const trim = (name: string, uv: [UV, UV, UV, UV], more: Partial<Part> = {}): Part => paint(name, { s: cab, uv }, more);
    const uWs = Uc(ln.xRoofF), uRr = Uc(ln.xRoofR), uB0 = Uc(xB - r.cabin.pillar), uB1 = Uc(xB + r.cabin.pillar), uCe = Uc(ln.xRoofR - 0.05);
    out.push(trim('belt mouldings', [[0, 0], [1, 0], [1, vg0], [0, vg0]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', says: 'the belt mouldings where the side glass leaves the doors (typical)' }));
    if (!open) {
      out.push(glass('windscreen', [[uWs, v3 + p], [1, v3 + p], [1, 1], [uWs, 1]], 'its windscreen: laminated glass, about 4.5 mm (typical)'));
      out.push(trim('roof', [[uRr, v3 - p], [uWs, v3 - p], [uWs, 1], [uRr, 1]], { says: 'its roof panel: pressed steel about 0.7 mm (typical)', meets: [{ part: 'roof', edge: 'b1', kind: 'mirror', why: 'it crosses its middle in one tangent plane' }] }));
      out.push(trim('pillars and roof rails', [[0, v3 - p], [uRr, v3 - p], [uRr, v3 + p], [0, v3 + p]], { says: 'its C pillars and the rails along the roof (typical)' }));
      out.push(trim('A pillars', [[uWs, v3 - p], [1, v3 - p], [1, v3 + p], [uWs, v3 + p]], { says: 'its A pillars beside the windscreen (typical)' }));
      out.push(glass('back glass', [[0, v3 + p], [uRr, v3 + p], [uRr, 1], [0, 1]], 'its back glass: toughened glass about 4 mm (typical)'));
      out.push(trim('C pillars', [[0, vg0], [uCe, vg0], [uCe, v3 - p], [0, v3 - p]], { says: 'its C pillars (typical)' }));
      if (twoDoors) {
        out.push(trim('B pillars', [[uB0, vg0], [uB1, vg0], [uB1, v3 - p], [uB0, v3 - p]], { mat: 'pp', color: 0x141414, shell: 0.002, make: undefined, finish: 'texture', says: 'its B pillars, trimmed black (typical)' }));
        out.push(glass('front side windows', [[uB1, vg0], [1, vg0], [1, v3 - p], [uB1, v3 - p]], 'its front door glass: toughened, about 4 mm (typical)'));
        out.push(glass('rear side windows', [[uCe, vg0], [uB0, vg0], [uB0, v3 - p], [uCe, v3 - p]], 'its rear door glass (typical)'));
      } else out.push(glass('side windows', [[uCe, vg0], [1, vg0], [1, v3 - p], [uCe, v3 - p]], 'its side glass (typical)'));
    } else {
      out.push(glass('windscreen', [[0, v3 + p], [1, v3 + p], [1, 1], [0, 1]], 'its windscreen (typical)'));
      out.push(trim('windscreen frame', [[0, v3 - p], [1, v3 - p], [1, v3 + p], [0, v3 + p]], { says: 'its windscreen frame (typical)' }));
    }
  }
  return out;
}

// ---- what is inside it ------------------------------------------------------------------------------------------------
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
