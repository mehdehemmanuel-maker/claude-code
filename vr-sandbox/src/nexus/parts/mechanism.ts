// How many ways a set of jointed parts can still move, and which ways they are. `mate.ts` says how two parts go
// together one pair at a time — bolted, seated, threaded, resting — and that is a constraint, not an answer: a shaft
// in one bearing turns and slides, the same shaft in two bearings still turns and slides, and the same shaft bolted
// at one end does neither. Nothing here knew that, which is what "no degrees-of-freedom count at all" meant.
//
// A joint is written by *what it leaves free*, which is the lower-pair vocabulary every assembly solver has (Reuleaux;
// Uicker, Pennock & Shigley, "Theory of Machines and Mechanisms"), and every kind of mate turns into rows of one
// matrix rather than into a case of its own: that is why concentric, tangent, gear, screw and slot cost a handful of
// lines each here instead of twenty special cases somewhere else.
//
// The count is the **rank** of those rows and never Grübler's formula, because the formula is wrong for exactly the
// assemblies people build. A flat four-bar linkage has one degree of freedom and the formula says minus two, because
// three of its twenty constraints repeat what the others already say. The rank knows that, and the difference between
// the rows there are and the rank they have is itself worth reporting: a redundant constraint is what makes a real
// assembly bind unless it is given tolerance, and it is the number a fitter feels and a drawing never shows.
import type { V3 } from './kits';

/** A rigid body of a mechanism: six freedoms, about its own point, unless a joint or the ground says otherwise. */
export interface Body { name: string; at: V3; /** held still: it is the ground, or bolted to it */ fixed?: boolean }

/** A joint between two bodies, named by what it leaves free rather than by what it is called.
 *  `fixed` 0, `revolute` 1 (turn about its axis), `prismatic` 1 (slide along it), `screw` 1 (turn, which carries a
 *  slide by its lead), `cylindrical` 2 (turn and slide), `planar` 3 (two slides and a turn about its normal),
 *  `spherical` 3 (turn any way), `gear` 1 removed (two turns held to a ratio, each body held by its own bearing). */
export type JointKind = 'fixed' | 'revolute' | 'prismatic' | 'screw' | 'cylindrical' | 'planar' | 'spherical' | 'gear';
export interface Joint {
  kind: JointKind; a: number; b: number;
  /** where it acts, in the mechanism's own frame */ at: V3;
  /** its axis, or a plane's normal (any length: it is normalised) */ axis: V3;
  /** screw: how far one turn carries it along its axis, m (a thread's lead) */ lead?: number;
  /** gear: how many turns of *a* to one of b — a 12-tooth pinion on a 36-tooth wheel is 3. It holds
   *  n·ω_a + ratio · n·ω_b = 0, so a positive ratio is an external pair, whose two bodies turn opposite ways, and a
   *  negative one is an internal pair or a pair through an idler, which turn the same way. */ ratio?: number;
  says?: string;
}

/** A way the mechanism can still move: each body's slide and turn, said as the screw it is. */
export interface Motion { says: string; of: { body: string; at: V3; slide: V3; turn: V3 }[] }

/** What a mechanism can do: how many freedoms it has left, what each one is, and how much of what holds it is said
 *  twice. `grubler` is the formula's answer, kept beside the rank's so the two can be seen to disagree. */
export interface Mobility { dof: number; motions: Motion[]; rows: number; rank: number; redundant: number; grubler: number; says: string }

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const L = len(a) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
/** Two directions across this one, so a joint's own axis and these three span everything. */
const across = (n: V3): [V3, V3] => {
  const t: V3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(n, t));
  return [u, unit(cross(n, u))];
};
const FREE: Record<JointKind, number> = { fixed: 0, revolute: 1, prismatic: 1, screw: 1, cylindrical: 2, planar: 3, spherical: 3, gear: 5 };

/** The rows a mechanism's joints make, each one an equation that must hold between the bodies' twists.
 *  A body's six columns are its own point's velocity and its turning rate, and the turning columns are scaled by the
 *  mechanism's own size so that every entry is a displacement: a rank is a comparison against zero, and comparing a
 *  metre against a radian has no meaning until both are the same kind of number. */
export function rowsOf(bodies: Body[], joints: Joint[], L: number): number[][] {
  const n = bodies.length, w = 6 * n, rows: number[][] = [];
  // e · (the velocity of point p on a, less its velocity on b) = 0
  const point = (j: Joint, p: V3, e: V3) => {
    const row = new Array<number>(w).fill(0);
    for (const [i, s] of [[j.a, 1], [j.b, -1]] as [number, number][]) {
      if (i < 0) continue;
      const r = sub(p, bodies[i]!.at), m = cross(r, e);
      row[6 * i] = s * e[0]; row[6 * i + 1] = s * e[1]; row[6 * i + 2] = s * e[2];
      row[6 * i + 3] = (s * m[0]) / L; row[6 * i + 4] = (s * m[1]) / L; row[6 * i + 5] = (s * m[2]) / L;
    }
    return row;
  };
  // d · (a's turning rate less b's) = 0
  const turn = (j: Joint, d: V3, scale = 1) => {
    const row = new Array<number>(w).fill(0);
    for (const [i, s] of [[j.a, 1], [j.b, -1]] as [number, number][]) {
      if (i < 0) continue;
      row[6 * i + 3] += s * scale * d[0]; row[6 * i + 4] += s * scale * d[1]; row[6 * i + 5] += s * scale * d[2];
    }
    return row;
  };
  const add = (...rs: number[][]) => rows.push(...rs);
  const E: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  for (const j of joints) {
    const nx = unit(j.axis), [u, v] = across(nx), p = j.at;
    if (j.kind === 'fixed') add(...E.map((e) => point(j, p, e)), ...E.map((e) => turn(j, e)));
    else if (j.kind === 'spherical') add(...E.map((e) => point(j, p, e)));
    else if (j.kind === 'revolute') add(...E.map((e) => point(j, p, e)), turn(j, u), turn(j, v));
    else if (j.kind === 'cylindrical') add(point(j, p, u), point(j, p, v), turn(j, u), turn(j, v));
    else if (j.kind === 'prismatic') add(point(j, p, u), point(j, p, v), turn(j, nx), turn(j, u), turn(j, v));
    else if (j.kind === 'planar') add(point(j, p, nx), turn(j, u), turn(j, v));
    else if (j.kind === 'screw') {
      // a turn of one carries it along the axis by the lead: n·Δv − (lead/2π) n·Δω = 0, which is the one row that
      // makes a screw a screw and not a cylinder (it is the same rows otherwise)
      const slide = point(j, p, nx), spin = turn(j, nx, (j.lead ?? 0) / (2 * Math.PI) / L);
      add(point(j, p, u), point(j, p, v), turn(j, u), turn(j, v), slide.map((x, i) => x - spin[i]!));
    }
    // (a gear pair is the loop below: it is the one kind that holds neither a point nor a whole axis)
  }
  // a gear pair holds one turn to the other by its ratio and holds nothing else — each body is carried by its own
  // bearing, which is a joint of its own: n·ω_a + ratio · n·ω_b = 0, so an external pair's two bodies turn opposite
  // ways (which is why the ratio of a meshing pair is positive here and an idler's chain is not)
  for (const j of joints) if (j.kind === 'gear') {
    const nx = unit(j.axis), row = new Array<number>(w).fill(0), r = j.ratio ?? 1;
    if (j.a >= 0) { row[6 * j.a + 3] += nx[0]; row[6 * j.a + 4] += nx[1]; row[6 * j.a + 5] += nx[2]; }
    if (j.b >= 0) { row[6 * j.b + 3] += r * nx[0]; row[6 * j.b + 4] += r * nx[1]; row[6 * j.b + 5] += r * nx[2]; }
    rows.push(row);
  }
  for (const [i, b] of bodies.entries()) if (b.fixed) for (let k = 0; k < 6; k++) {
    const row = new Array<number>(w).fill(0); row[6 * i + k] = 1; rows.push(row);
  }
  return rows;
}

/** Row-reduce, and say which columns took a pivot. The rank is what it found; the columns it did not are the
 *  mechanism's freedoms, and the basis built on them is the motions themselves. */
function reduce(rows: number[][], w: number): { pivots: number[]; m: number[][] } {
  const m = rows.map((r) => r.slice()), pivots: number[] = [];
  const big = Math.max(1e-12, ...m.flat().map(Math.abs)), tol = 1e-9 * big;
  let r = 0;
  for (let c = 0; c < w && r < m.length; c++) {
    let best = r, bv = Math.abs(m[r]![c]!);
    for (let i = r + 1; i < m.length; i++) if (Math.abs(m[i]![c]!) > bv) { best = i; bv = Math.abs(m[i]![c]!); }
    if (bv <= tol) continue;
    [m[r], m[best]] = [m[best]!, m[r]!];
    const pv = m[r]![c]!;
    for (let k = c; k < w; k++) m[r]![k]! /= pv;
    for (let i = 0; i < m.length; i++) if (i !== r && Math.abs(m[i]![c]!) > 0) { const f = m[i]![c]!; for (let k = c; k < w; k++) m[i]![k]! -= f * m[r]![k]!; }
    pivots.push(c); r++;
  }
  return { pivots, m };
}

/** What this set of bodies and joints can still do. */
export function mobility(bodies: Body[], joints: Joint[]): Mobility {
  const n = bodies.length, w = 6 * n;
  if (!n) return { dof: 0, motions: [], rows: 0, rank: 0, redundant: 0, grubler: 0, says: 'nothing is here to move' };
  const span = Math.max(...bodies.map((b) => len(b.at)), ...joints.map((j) => len(j.at)));
  const L = Math.max(0.001, span);
  const rows = rowsOf(bodies, joints, L);
  const { pivots, m } = reduce(rows, w);
  const rank = pivots.length, dof = w - rank, held = new Set(pivots);
  const free = Array.from({ length: w }, (_, i) => i).filter((i) => !held.has(i));

  const motions: Motion[] = free.map((f) => {
    const x = new Array<number>(w).fill(0); x[f] = 1;
    for (const [i, c] of pivots.entries()) x[c] = -m[i]![f]!;
    const big = Math.max(...x.map(Math.abs)) || 1;
    const of = bodies.map((b, i) => ({ body: b.name, at: b.at, slide: [x[6 * i]! / big, x[6 * i + 1]! / big, x[6 * i + 2]! / big] as V3, turn: [x[6 * i + 3]! / big / L, x[6 * i + 4]! / big / L, x[6 * i + 5]! / big / L] as V3 }));
    return { says: sayMotion(of, L), of };
  });

  // the formula, for comparison only: 6 (links less the ground) less what every joint takes away
  // (the formula counts motion against a ground, so with nothing fixed there is no link to take away)
  const ground = bodies.some((b) => b.fixed) ? 1 : 0;
  const grubler = 6 * (n - ground) - joints.reduce((s, j) => s + (6 - FREE[j.kind]), 0);
  const says = dof === 0 ? `nothing moves: ${rank} of the ${rows.length} constraints hold all ${w} freedoms`
    : `${dof} degree${dof === 1 ? '' : 's'} of freedom: ${motions.map((x) => x.says).join('; ')}`;
  return { dof, motions, rows: rows.length, rank, redundant: rows.length - rank, grubler, says: `${says}${rows.length > rank ? `. ${rows.length - rank} of its ${rows.length} constraints are said twice over, which is what binds an assembly that is built to its drawing` : ''}` };
}

const n3 = (v: V3) => `[${v.map((x) => (Math.abs(x) < 5e-4 ? 0 : +x.toFixed(3))).join(', ')}]`;
/** A rigid motion in words: a slide, a turn about an axis through a point, or the screw that is both (Chasles). */
function sayMotion(of: { body: string; at: V3; slide: V3; turn: V3 }[], L: number): string {
  const moving = of.filter((x) => len(x.slide) > 1e-6 || len(x.turn) * L > 1e-6);
  if (!moving.length) return 'nothing (a constraint that holds nothing)';
  return moving.map((x) => {
    const w = len(x.turn);
    if (w * L <= 1e-6) return `${x.body} slides along ${n3(unit(x.slide))}`;
    // the axis it turns about is where that body's own point is *not* moving across it, and a slide is reported at
    // the body's own point, so the axis passes through at + (ω × v)/|ω|² and not through the offset alone
    const d = unit(x.turn), pitch = dot(x.slide, d) / w, off = cross(x.turn, x.slide).map((c) => c / (w * w)) as V3;
    const on: V3 = [x.at[0] + off[0], x.at[1] + off[1], x.at[2] + off[2]];
    const turns = `${x.body} turns about ${n3(d)} through ${n3(on)}`;
    return Math.abs(pitch) > 1e-6 ? `${turns}, carrying ${(pitch * 2 * Math.PI * 1000).toFixed(2)} mm along it a turn` : turns;
  }).join(' and ');
}
