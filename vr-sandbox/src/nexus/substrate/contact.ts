// Couplings between places, generated from their geometry (docs/NEXUS-FROM-REALITY.md Q1; sections 17 and 20). Where
// the surfaces of two places meet, a contact forms, whatever touches: a face against a face, an edge against a face,
// or a corner against a face. The face that separates them is found from their present values (the face along whose
// normal they are farthest apart, which for touching places is zero within their resolution). The other place's
// feature nearest that face is clipped to it, and the clipped points are the contact: a polygon, a segment or a point.
// Which feature touches and how it is clipped is decided from the values, and decided again whenever they change.
// What the contact is (its corners, its centre, its normal, its area) is a term of both places' numbers.
//
// Momentum crosses a contact as a push along its normal, never a pull, and a friction along its surface. What follows
// follows by the laws, for every place alike:
// - a place on level contacts under loads along gravity needs no friction: one contact bears everything, if the load
//   falls within it; two share by moments; more depend on stiffness, a gap; none, nothing bears it, a gap;
// - a place on one contact that is not level, or under a load across gravity, bears its load as a push and a friction
//   at that contact, both determined, and stays if its load falls within the contact and the friction is within what
//   the surfaces hold;
// - a place on two contacts not level shares its load in a way balance leaves open by one force; whether it can stay
//   is still decided: it stays if some sharing pushes at both and keeps each friction within what its surfaces hold.
// A place bends under every force on it; its stress is the moment over the modulus of the section across the line it
// bends along (the kept law). Nothing here knows a beam, a support, a floor, a shelf or a ladder.

import { BENDING_STRESS } from '../book';
import { hashOf } from '../lang/identity';
import { address, type Address, type Contribution } from './journal';
import { axis, dot, gravityAxis, placeAt, sectionRelations } from './place';
import { abs, add, and, div, freeVars, ge, gt, k, le, leaf, lt, max, min, mul, or, pow, sub, variable, zero, type Leaf, type Term } from '../lang/term';

/** Two surfaces this close touch, where nothing finer is known of the places: an assumption, with grounds. */
export const CONTACT_TOLERANCE: Leaf = leaf('distance at which two faces touch', 1e-3, 'm', { class: 'assumed', by: 'the generator', grounds: 'faces placed by hand or measured by a headset are not exact; a millimetre is within both' });

type V3 = [number, number, number];
interface Box { id: string; c: V3; a: [V3, V3, V3]; h: V3; res: number }
export interface View {
  value(a: Address): number | null;
  places(): string[];
  held(place: string): boolean;
  /** How finely a place's position is known: the uncertainty its origin declares, zero where none is declared. */
  resolution(place: string): number;
}

/** A unit quaternion's turn as the place's three axes (the rotation's columns), each in the domain's coordinates. */
const rot = (q: number[]): [V3, V3, V3] => {
  const [x, y, z, w] = q as [number, number, number, number];
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)],
  ];
};
const d3 = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const s3 = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const x3 = (u: V3, v: V3): V3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const n3 = (u: V3) => Math.hypot(u[0], u[1], u[2]);
const SIGNS: V3[] = [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-1, 1].map((c) => [a, b, c] as V3)));

/** A place as numbers now, or none while any of its numbers is unbound. */
function boxOf(v: View, id: string): Box | null {
  const n = (a: Address) => v.value(a);
  const c = [0, 1, 2].map((j) => n(placeAt.centre(id, j))), q = [0, 1, 2, 3].map((j) => n(placeAt.turn(id, j))), h = [0, 1, 2].map((i) => n(placeAt.half(id, i)));
  if ([...c, ...q, ...h].some((x) => x === null)) return null;
  // rot gives the place's three axes, each in the domain's coordinates
  return { id, c: c as V3, a: rot(q as number[]), h: h as V3, res: v.resolution(id) };
}
const vertex = (b: Box, s: V3): V3 => [0, 1, 2].map((j) => b.c[j]! + s[0] * b.h[0] * b.a[0][j]! + s[1] * b.h[1] * b.a[1][j]! + s[2] * b.h[2] * b.a[2][j]!) as V3;
const reach = (b: Box) => n3(b.h);

// ---- where two places meet ------------------------------------------------------------------------------------------

/** Where a contact point came from: a corner of the touching feature, or where an edge of it crosses a side of the face. */
type Prov = { kind: 'v'; s: V3 } | { kind: 'x'; p: Prov; q: Prov; coord: 0 | 1; bound: 1 | -1 };
interface Pt { prov: Prov; u: number; w: number }

/** A contact between two places, as decided from their present values. */
interface Found {
  /** The place the contact pushes up (it is borne) and the place that bears it. */
  upper: Box; lower: Box;
  /** The face that separates them: of which place, across which axis, on which side. */
  ref: Box; inc: Box; axis: number; side: 1 | -1;
  /** The contact's points, in order around it, in the face's own two coordinates. */
  pts: Pt[];
  /** Its centre and normal (into the upper place), as numbers. */
  centre: V3; normal: V3;
  /** Its normal is along gravity within what the places' resolution can tell. */
  level: boolean;
  tol: number;
}

/**
 * Whether two places touch, and how. The face whose plane they are farthest apart across is found among all twelve;
 * if they are apart there by more than they can be told apart, they do not touch. The other place's corners within
 * that distance of the face are the feature that touches (one, two or four of them), clipped to the face.
 */
function contactOf(A: Box, B: Box, down: V3, floor: number): Found | null {
  const tol = Math.max(floor, A.res + B.res);
  const up: V3 = [-down[0], -down[1], -down[2]];
  type Cand = { R: Box; I: Box; i: number; s: 1 | -1; d: number; upn: number };
  let best: Cand | null = null;
  const cands: Cand[] = [];
  for (const [R, I] of [[A, B], [B, A]] as const) for (let i = 0; i < 3; i++) for (const s of [1, -1] as const) {
    const n = R.a[i]!.map((x) => x * s) as V3;
    const d = Math.min(...SIGNS.map((sg) => d3(s3(vertex(I, sg), R.c), n))) - R.h[i]!;
    cands.push({ R, I, i, s, d, upn: d3(n, up) });
  }
  const maxd = Math.max(...cands.map((c) => c.d));
  if (maxd > tol || maxd < -tol) return null;
  // among faces they are equally far apart across, within resolution, the face that faces most upward bears
  for (const c of cands) if (c.d >= maxd - tol && (!best || c.upn > best.upn)) best = c;
  const { R, I, i, s, d } = best!;
  const n = R.a[i]!.map((x) => x * s) as V3;
  const [j, kk] = [0, 1, 2].filter((x) => x !== i) as [number, number];
  const touching = SIGNS.filter((sg) => d3(s3(vertex(I, sg), R.c), n) - R.h[i]! <= d + tol);
  let pts: Pt[] = touching.map((sg) => { const v = s3(vertex(I, sg), R.c); return { prov: { kind: 'v', s: sg }, u: d3(v, R.a[j]!), w: d3(v, R.a[kk]!) }; });
  if (pts.length >= 3) { const mu = pts.reduce((a, p) => a + p.u, 0) / pts.length, mw = pts.reduce((a, p) => a + p.w, 0) / pts.length; pts.sort((p, q) => Math.atan2(p.w - mw, p.u - mu) - Math.atan2(q.w - mw, q.u - mu)); }
  const hb = [R.h[j]!, R.h[kk]!];
  const inside = (p: Pt, coord: 0 | 1, bound: 1 | -1) => bound * (coord ? p.w : p.u) <= hb[coord]! + tol;
  const cross = (p: Pt, q: Pt, coord: 0 | 1, bound: 1 | -1): Pt => {
    const pc = coord ? p.w : p.u, qc = coord ? q.w : q.u, t = (bound * hb[coord]! - pc) / (qc - pc);
    return { prov: { kind: 'x', p: p.prov, q: q.prov, coord, bound }, u: p.u + t * (q.u - p.u), w: p.w + t * (q.w - p.w) };
  };
  const sides: [0 | 1, 1 | -1][] = [[0, 1], [0, -1], [1, 1], [1, -1]];
  if (pts.length === 1) { if (!sides.every(([c, b]) => inside(pts[0]!, c, b))) return null; }
  else if (pts.length === 2) {
    // an edge: clipped where it crosses a side of the face
    let [p, q] = pts as [Pt, Pt];
    for (const [c, b] of sides) {
      const ip = inside(p, c, b), iq = inside(q, c, b);
      if (!ip && !iq) return null;
      if (!ip) p = cross(p, q, c, b); else if (!iq) q = cross(p, q, c, b);
    }
    pts = [p, q];
  } else {
    // a face: clipped by each side of the other face in turn
    for (const [c, b] of sides) {
      const next: Pt[] = [];
      pts.forEach((p, m) => {
        const q = pts[(m + 1) % pts.length]!, ip = inside(p, c, b), iq = inside(q, c, b);
        if (ip) next.push(p);
        if (ip !== iq) next.push(cross(p, q, c, b));
      });
      pts = next;
      if (!pts.length) return null;
    }
  }
  // the normal into the place the contact pushes up; a contact whose normal lies across gravity bears neither
  const upn = d3(n, up);
  const [upper, lower, normal] = upn >= 0 ? [I, R, n] : [R, I, n.map((x) => -x) as V3];
  const ang = tol / reach(upper);
  if (Math.abs(upn) <= Math.sin(ang)) return null;
  const F = [0, 1, 2].map((m) => R.c[m]! + s * R.h[i]! * R.a[i]![m]!) as V3;
  const p3 = (p: Pt) => [0, 1, 2].map((m) => F[m]! + p.u * R.a[j]![m]! + p.w * R.a[kk]![m]!) as V3;
  const c3 = pts.map(p3), centre = [0, 1, 2].map((m) => c3.reduce((a, p) => a + p[m]!, 0) / c3.length) as V3;
  return { upper, lower, ref: R, inc: I, axis: i, side: s, pts, centre, normal, level: n3(x3(normal, up)) <= Math.sin(ang), tol };
}

// ---- the terms a contact is made of -------------------------------------------------------------------------------

/** Variables for a place's numbers, under a prefix, with the addresses they read. */
function placeVars(id: string, pre: string) {
  const q = [0, 1, 2, 3].map((j) => variable(`${pre}q${j}`, '1')), h = [0, 1, 2].map((i) => variable(`${pre}h${i}`, 'm')), c = [0, 1, 2].map((j) => variable(`${pre}c${j}`, 'm'));
  const ports: Record<string, Address> = {};
  q.forEach((v, j) => { ports[v.sym] = placeAt.turn(id, j); });
  h.forEach((v, i) => { ports[v.sym] = placeAt.half(id, i); });
  c.forEach((v, j) => { ports[v.sym] = placeAt.centre(id, j); });
  return { q, h, c, axes: [0, 1, 2].map((i) => axis(q, i)), ports };
}
const tsub = (a: Term[], b: Term[]) => a.map((x, j) => sub(x, b[j]!));
const tadd = (a: Term[], b: Term[]) => a.map((x, j) => add(x, b[j]!));
const tscale = (s: Term, a: Term[]) => a.map((x) => mul(s, x));
const tcross = (a: Term[], b: Term[]) => [sub(mul(a[1]!, b[2]!), mul(a[2]!, b[1]!)), sub(mul(a[2]!, b[0]!), mul(a[0]!, b[2]!)), sub(mul(a[0]!, b[1]!), mul(a[1]!, b[0]!))];
const tnorm = (a: Term[]) => pow(dot(a, a), 0.5);

const contactPlace = (t: { upper: string; lower: string }) => `${t.upper} on ${t.lower}`;
export const contactAt = {
  area: (upper: string, lower: string) => address(contactPlace({ upper, lower }), 'area'),
  point: (upper: string, lower: string, j: number) => address(contactPlace({ upper, lower }), `point ${'xyz'[j]}`),
  normal: (upper: string, lower: string, j: number) => address(contactPlace({ upper, lower }), `normal ${'xyz'[j]}`),
  corner: (upper: string, lower: string, m: number, j: number) => address(contactPlace({ upper, lower }), `corner ${m + 1} ${'xyz'[j]}`),
  force: (upper: string, lower: string) => address(contactPlace({ upper, lower }), 'force borne'),
  friction: (upper: string, lower: string, j: number) => address(contactPlace({ upper, lower }), `friction ${'xyz'[j]}`),
  coefficient: (upper: string, lower: string) => address(contactPlace({ upper, lower }), 'coefficient of friction'),
  load: (p: string) => address(p, 'load it bears down'),
  bearer: (p: string) => address(p, 'what bears it'),
  split: (p: string) => address(p, 'how its load splits among its contacts (their stiffness)'),
  sloped: (p: string) => address(p, 'bending on contacts that are not level'),
  spread: (p: string, line: string, of: string, end: 'from' | 'to') => address(p, `${of}, spread along ${line}: ${end}`),
  moment: (p: string) => address(p, 'largest bending moment along it'),
  stress: (p: string) => address(p, 'largest bending stress along it'),
  momentAlong: (p: string, i: number) => address(p, `largest bending moment along its axis ${i + 1}`),
  stressAlong: (p: string, i: number) => address(p, `largest bending stress along its axis ${i + 1}`),
  rests: (p: string) => address(p, 'at rest on what bears it'),
};

/** What a contact is, as terms of both places' numbers: its corners, its centre, its normal, its area. */
function contactTerms(f: Found) {
  const R = placeVars(f.ref.id, 'r'), I = placeVars(f.inc.id, 'i');
  const [j, kk] = [0, 1, 2].filter((x) => x !== f.axis) as [number, number];
  const n = R.axes[f.axis]!.map((x) => mul(k(f.side), x));
  const face = tadd(R.c, tscale(mul(k(f.side), R.h[f.axis]!), R.axes[f.axis]!));
  const hb = [R.h[j]!, R.h[kk]!];
  const memo = new Map<Prov, [Term, Term]>();
  const uw = (p: Prov): [Term, Term] => {
    const hit = memo.get(p);
    if (hit) return hit;
    let r: [Term, Term];
    if (p.kind === 'v') {
      const v = tsub(tadd(I.c, [0, 1, 2].map((m) => add(add(mul(k(p.s[0]), I.h[0]!, I.axes[0]![m]!), mul(k(p.s[1]), I.h[1]!, I.axes[1]![m]!)), mul(k(p.s[2]), I.h[2]!, I.axes[2]![m]!)))), R.c);
      r = [dot(v, R.axes[j]!), dot(v, R.axes[kk]!)];
    } else {
      // where the edge from p to q crosses the side of the face at coordinate `coord` = bound times its half-extent
      const a = uw(p.p), b = uw(p.q), side = mul(k(p.bound), hb[p.coord]!);
      const t = div(sub(side, a[p.coord]!), sub(b[p.coord]!, a[p.coord]!));
      r = p.coord ? [add(a[0], mul(t, sub(b[0], a[0]))), side] : [side, add(a[1], mul(t, sub(b[1], a[1])))];
    }
    memo.set(p, r);
    return r;
  };
  const flat = f.pts.map((p) => uw(p.prov));
  const to3 = ([u, w]: [Term, Term]) => tadd(face, tadd(tscale(u, R.axes[j]!), tscale(w, R.axes[kk]!)));
  const corners = flat.map(to3);
  // its centre: a polygon's centroid; a segment's middle; a point itself
  let centre: Term[], area: Term;
  const numericArea = f.pts.length >= 3 ? f.pts.reduce((a, p, m) => { const q = f.pts[(m + 1) % f.pts.length]!; return a + (p.u * q.w - q.u * p.w) / 2; }, 0) : 0;
  if (f.pts.length >= 3 && Math.abs(numericArea) > f.tol * f.tol) {
    const terms = flat.map((p, m) => { const q = flat[(m + 1) % flat.length]!; return { p, q, c: sub(mul(p[0], q[1]), mul(q[0], p[1])) }; });
    const A2 = terms.reduce((acc: Term, t) => add(acc, t.c), zero('m^2') as Term);
    const cu = div(terms.reduce((acc: Term, t) => add(acc, mul(add(t.p[0], t.q[0]), t.c)), zero('m^3') as Term), mul(k(3), A2));
    const cw = div(terms.reduce((acc: Term, t) => add(acc, mul(add(t.p[1], t.q[1]), t.c)), zero('m^3') as Term), mul(k(3), A2));
    centre = to3([cu, cw]);
    area = abs(div(A2, k(2)));
  } else {
    centre = corners.reduce((acc, c) => tadd(acc, c)).map((x) => div(x, k(corners.length)));
    area = zero('m^2');
  }
  const normal = f.upper === f.inc ? n : n.map((x) => mul(k(-1), x));
  return { corners, centre, normal, area, ports: { ...R.ports, ...I.ports } };
}

// ---- the structure contacts make -----------------------------------------------------------------------------------

/**
 * Every relation and constraint the places' contacts imply now: what each contact is, the load that goes across it,
 * and what that makes in the places it joins.
 */
export function contactStructure(v: View, cache = new Map<string, Contribution[]>()): Contribution[] {
  const down = [0, 1, 2].map((j) => v.value(gravityAxis(j)));
  if (down.some((x) => x === null)) return [];
  const boxes = v.places().map((id) => boxOf(v, id)).filter((b): b is Box => !!b);
  const found: Found[] = [];
  for (let x = 0; x < boxes.length; x++) for (let y = x + 1; y < boxes.length; y++) { const f = contactOf(boxes[x]!, boxes[y]!, down as V3, CONTACT_TOLERANCE.value!); if (f) found.push(f); }
  const out: Contribution[] = [];
  const rel = (rule: unknown, outAt: Address, name: string, unit: string, term: Term, ports: Record<string, Address>, law = `contact: ${name}`): Contribution =>
    ({ kind: 'relation', id: hashOf({ contact: rule }), out: outAt, name, unit, term, ports, law });
  // the terms depend only on what touches what and how, never on the values: they are built once for each decision
  const memo = (key: unknown, build: () => Contribution[]) => { const h = hashOf(key); let got = cache.get(h); if (!got) { got = build(); cache.set(h, got); } out.push(...got); };
  // a section bends about the line gravity crosses it by only where gravity has a part across it
  for (const b of boxes) for (let i = 0; i < 3; i++) {
    const [j, kk] = [0, 1, 2].filter((x) => x !== i) as [number, number];
    const cj = d3(b.a[j]!, down as V3), ck = d3(b.a[kk]!, down as V3);
    if (cj * cj + ck * ck > 1e-12) memo({ section: b.id, i }, () => sectionRelations(b.id, i));
  }
  const sig = (f: Found) => ({ u: f.upper.id, l: f.lower.id, r: f.ref.id, i: f.axis, s: f.side, pts: f.pts.map((p) => p.prov), level: f.level });
  for (const f of found) memo({ contact: sig(f) }, () => {
    const ct = contactTerms(f), u = f.upper.id, l = f.lower.id, got: Contribution[] = [];
    got.push(rel({ area: [u, l] }, contactAt.area(u, l), 'area of the contact', 'm^2', ct.area, pick(ct.area, ct.ports)));
    ct.centre.forEach((t, j) => got.push(rel({ point: [u, l, j] }, contactAt.point(u, l, j), `contact point ${'xyz'[j]}`, 'm', t, pick(t, ct.ports))));
    ct.normal.forEach((t, j) => got.push(rel({ normal: [u, l, j] }, contactAt.normal(u, l, j), `contact normal ${'xyz'[j]}`, '1', t, pick(t, ct.ports))));
    ct.corners.forEach((c, m) => c.forEach((t, j) => got.push(rel({ corner: [u, l, m, j] }, contactAt.corner(u, l, m, j), `contact corner ${m + 1} ${'xyz'[j]}`, 'm', t, pick(t, ct.ports)))));
    return got;
  });
  // whether what crosses a contact is along gravity: its normal is, and what pushes the upper place through it needs no
  // friction (it is itself on level contacts under loads along gravity), decided from the top down
  const kind = new Map<string, 'level' | 'sloped'>();
  const kindOf = (id: string, path = new Set<string>()): 'level' | 'sloped' => {
    const hit = kind.get(id);
    if (hit) return hit;
    if (path.has(id)) return 'sloped';
    path.add(id);
    const below = found.filter((f) => f.upper.id === id), above = found.filter((f) => f.lower.id === id);
    const k0 = below.every((f) => f.level) && above.every((f) => f.level && (v.held(f.upper.id) || kindOf(f.upper.id, path) === 'level')) ? 'level' : 'sloped';
    kind.set(id, k0);
    return k0;
  };
  for (const b of boxes) {
    if (v.held(b.id)) continue; // held at rest from outside the domain: its load leaves the domain
    const below = found.filter((f) => f.upper.id === b.id), above = found.filter((f) => f.lower.id === b.id);
    const kb = kindOf(b.id), kAbove = above.map((f) => kindOf(f.upper.id));
    // the section that spans between two contacts is a decision on the values, so it is part of what decides the terms
    const spanAxis = below.length === 2 ? (() => { const dir = s3(below[1]!.centre, below[0]!.centre); const al = [0, 1, 2].map((i) => Math.abs(d3(b.a[i]!, dir))); return al.indexOf(Math.max(...al)); })() : -1;
    // on two contacts not level, which of the open forces is taken as free, and whether the forces lie in one plane
    const open = kb === 'sloped' && below.length === 2 ? openPlane(below, down as V3) : null;
    // what a polygon's corners turn about seen along its normal: the sense its edges are walked in
    const sense = below.map((f) => { if (f.pts.length < 3) return 0; const c = f.pts.map((p) => p); const a = c.reduce((acc, p, m) => { const q = c[(m + 1) % c.length]!; return acc + (p.u * q.w - q.u * p.w); }, 0); const [j, kk] = [0, 1, 2].filter((x) => x !== f.axis); const nrm = x3(f.ref.a[j!]!, f.ref.a[kk!]!); return Math.sign(a) * Math.sign(d3(nrm, f.normal)); });
    memo({ place: b.id, kb, kAbove, below: below.map(sig), above: above.map(sig), spanAxis, open, sense }, () => placeStructure(b, below, above, kb, kAbove, spanAxis, open, sense));
  }
  return out;
}

/**
 * For a place on two contacts not level: the upright plane the forces lie in, and which force balance leaves free.
 * The plane holds gravity and the normal that slopes most (or, where both are level, the line between the contacts);
 * every normal must lie in it within resolution. A contact's offset across the plane is carried along its own extent,
 * so it does not decide the plane.
 */
function openPlane(below: Found[], down: V3): { free: 'push' | 'friction'; by: number } | 'apart' {
  const up: V3 = [-down[0], -down[1], -down[2]];
  const slope = below.map((f) => n3(x3(f.normal, up)));
  const by = slope[0]! >= slope[1]! ? 0 : 1;
  const r = s3(below[1]!.centre, below[0]!.centre);
  const m0 = below.every((f) => f.level) ? x3(up, r) : x3(below[by]!.normal, up), mn = n3(m0);
  if (mn === 0) return 'apart';
  const m = m0.map((x) => x / mn) as V3;
  const tol = Math.max(below[0]!.tol, below[1]!.tol), ang = Math.sin(tol / reach(below[0]!.upper));
  if (below.some((f) => Math.abs(d3(f.normal, m)) > ang)) return 'apart';
  const n2 = below[1]!.normal, t2 = x3(m, n2);
  const alpha = d3(x3(r, n2), m), beta = d3(x3(r, t2), m);
  return { free: Math.abs(alpha) >= Math.abs(beta) ? 'friction' : 'push', by: below.every((f) => f.level) ? -1 : by };
}

/**
 * The largest bending moment along a line through a place, under forces each spread evenly over an interval of the
 * line (upward positive): its own weight over its extent, each contact's share over that contact's extent along the
 * line. With every force spread, the shear is continuous and piecewise linear, so the moment at any station is exact
 * for every arrangement, and its largest is at an interval's end or where the shear crosses zero just past one. Every
 * station tried is a real station of the place, so the largest found is never more than the true largest, and the true
 * one is among them. A force on a point of the line (a contact's extent along it is nothing) is the limit of a spread
 * one: it bends by its lever past it. `q` is the weight per length, a slope the shear has wherever nothing else cancels.
 */
function largestMoment(forces: { f: Term; lo: Term; hi: Term; point: boolean }[], ext: { lo: Term; hi: Term }, q: Term): Term {
  const z = zero('m');
  const M = (x: Term) => forces.reduce((acc: Term, { f, lo, hi, point }) => add(acc, point ? mul(f, max(sub(x, lo), z)) : div(mul(f, sub(pow(max(sub(x, lo), z), 2), pow(max(sub(x, hi), z), 2))), mul(k(2), sub(hi, lo)))), zero('N m') as Term);
  const V = (x: Term) => forces.reduce((acc: Term, { f, lo, hi, point }) => add(acc, point ? mul(f, ge(x, lo)) : div(mul(f, min(max(sub(x, lo), z), sub(hi, lo))), sub(hi, lo))), zero('N') as Term);
  const slope = (x: Term) => forces.reduce((acc: Term, { f, lo, hi, point }) => (point ? acc : add(acc, div(mul(f, mul(ge(x, lo), lt(x, hi))), sub(hi, lo)))), zero('N/m') as Term);
  const ends = forces.flatMap(({ lo, hi, point }) => (point ? [lo] : [lo, hi]));
  const zeros = ends.map((p) => { const s0 = slope(p), s1 = add(s0, mul(le(abs(s0), zero('N/m')), q)); return min(max(sub(p, div(V(p), s1)), ext.lo), ext.hi); });
  return [...ends, ...zeros].map((x) => abs(M(x))).reduce((a, b) => max(a, b));
}

/**
 * Whether a set of linear conditions in one free quantity s, each `a + b s ≥ 0`, can all hold at once: every bound from
 * below lies under every bound from above, and every condition that does not depend on s holds (Fourier–Motzkin).
 */
function someHolds(conds: { a: Term; b: Term }[]): Term {
  const zN = zero('N'), z1 = zero('1');
  const parts: Term[] = conds.map(({ a, b }) => or(gt(abs(b), z1), ge(a, zN)));
  for (const [x, p] of conds.entries()) for (const [y, q] of conds.entries()) if (x !== y) {
    // p bounds s from below and q from above only when p.b > 0 > q.b; then −p.a/p.b ≤ −q.a/q.b
    parts.push(or(or(le(p.b, z1), ge(q.b, z1)), ge(sub(mul(p.a, mul(k(-1), q.b)), mul(k(-1), mul(q.a, p.b))), zN)));
  }
  return parts.reduce((acc, t) => and(acc, t));
}

/** What a place's contacts make in it: the load it bears down, how it is shared, whether it stays, and how it bends. */
function placeStructure(b: Box, below: Found[], above: Found[], kb: 'level' | 'sloped', kAbove: ('level' | 'sloped')[], spanAxis: number, open: ReturnType<typeof openPlane> | null, sense: number[]): Contribution[] {
  const out: Contribution[] = [];
  const rel = (rule: unknown, outAt: Address, name: string, unit: string, term: Term, ports: Record<string, Address>, law = `contact: ${name}`, domain?: { says: string; holds: Term }[]): Contribution =>
    ({ kind: 'relation', id: hashOf({ contact: rule }), out: outAt, name, unit, term, ports, law, ...(domain ? { domain } : {}) });
  const constraint = (rule: unknown, says: string, by: string, holds: Term, ports: Record<string, Address>): Contribution => ({ kind: 'constraint', id: hashOf(rule), says, by, holds, ports: pick(holds, ports) });
  const gap = (rule: unknown, says: string, by: string, at: Address) => constraint(rule, says, by, ge(variable('x', '1'), zero('1')), { x: at });
  const P = placeVars(b.id, 'p');
  const d = [0, 1, 2].map((j) => variable(`d${j}`, '1')), dp = Object.fromEntries(d.map((x, j) => [x.sym, gravityAxis(j)]));
  const W = variable('W', 'N');
  // what each contact is, read from its addresses
  const contactVars = (f: Found, pre: string) => {
    const u = f.upper.id, l = f.lower.id;
    const pt = [0, 1, 2].map((j) => variable(`${pre}p${j}`, 'm')), nn = [0, 1, 2].map((j) => variable(`${pre}n${j}`, '1'));
    const cs = f.pts.map((_, m) => [0, 1, 2].map((j) => variable(`${pre}c${m}${j}`, 'm')));
    const N = variable(`${pre}N`, 'N'), T = [0, 1, 2].map((j) => variable(`${pre}T${j}`, 'N')), mu = variable(`${pre}mu`, '1');
    const ports: Record<string, Address> = { [N.sym]: contactAt.force(u, l), [mu.sym]: contactAt.coefficient(u, l) };
    pt.forEach((x, j) => { ports[x.sym] = contactAt.point(u, l, j); });
    nn.forEach((x, j) => { ports[x.sym] = contactAt.normal(u, l, j); });
    cs.forEach((c, m) => c.forEach((x, j) => { ports[x.sym] = contactAt.corner(u, l, m, j); }));
    T.forEach((x, j) => { ports[x.sym] = contactAt.friction(u, l, j); });
    return { f, pt, nn, cs, N, T, mu, ports };
  };
  const Bv = below.map((f, r) => contactVars(f, `b${r}`)), Av = above.map((f, m) => contactVars(f, `a${m}`));
  const all: Record<string, Address> = { ...P.ports, ...dp, W: placeAt.weight(b.id), ...Object.assign({}, ...Bv.map((c) => c.ports), ...Av.map((c) => c.ports)) };
  // what pushes on it from above: through each contact, the push along the normal and, where its upper place is not
  // level, the friction, both turned back on this place
  const fromAbove = Av.map((c, m) => (kAbove[m] === 'level' ? tscale(mul(k(-1), c.N), c.nn) : tscale(k(-1), tadd(tscale(c.N, c.nn), c.T))));
  const weight = tscale(W, d);
  const loadVec = fromAbove.reduce((acc, f) => tadd(acc, f), weight);
  const presses = Av.map((c) => ({ says: `${c.f.upper.id} presses on ${b.id}`, holds: ge(c.N, zero('N')) }));
  if (kb === 'level') {
    const total = Av.reduce((s0: Term, c) => add(s0, c.N), W as Term);
    out.push(rel({ load: b.id }, contactAt.load(b.id), 'load it bears down', 'N', total, pick(total, all), 'momentum is conserved: what a place bears down is its weight and all that is borne on it', presses.length ? presses : undefined));
  }
  if (!below.length) { out.push(gap({ borne: b.id }, `${b.id} is borne`, 'momentum is conserved: a place at rest is borne by what it touches', contactAt.bearer(b.id))); return out; }
  if (below.length > 2) { out.push(gap({ split: b.id }, `how ${b.id}'s load splits among ${below.length} contacts`, 'the split among more than two contacts depends on their stiffness, which is not generated', contactAt.split(b.id))); return out; }
  // whether it is at rest: its own contacts hold it, and what bears it is at rest, down to what is held. What it
  // derives as a place at rest (its bending) holds only while it is
  const lowerRest = below.map((_, r) => variable(`z${r}`, '1')), lrp = Object.fromEntries(below.map((f, r) => [lowerRest[r]!.sym, contactAt.rests(f.lower.id)]));
  const restVar = variable('rest', '1');
  const atRest = (own: Term) => {
    const holds = lowerRest.reduce((acc: Term, z) => and(acc, ge(z, k(1))), own);
    return rel({ rests: b.id }, contactAt.rests(b.id), 'at rest on what bears it', '1', holds, pick(holds, { ...all, ...lrp }), 'a place is at rest while its contacts hold it and what bears it is at rest');
  };
  const rests = [{ says: `${b.id} is at rest on what bears it`, holds: ge(restVar, k(1)) }, ...presses];
  const restPort = { [restVar.sym]: contactAt.rests(b.id) };
  const pressesOn = (r: number) => constraint({ within: [b.id, below[r]!.lower.id] }, `${b.id} presses on ${below[r]!.lower.id}, never pulls`, 'a contact pushes; it cannot pull: a negative share is a place tipping off its contacts', ge(Bv[r]!.N, zero('N')), all);
  // where the load's line meets a contact: inside its polygon, on its segment, or at its point, within resolution
  const within = (c: ReturnType<typeof contactVars>, through: Term[], dir: Term[], r: number): Term => {
    const lam = div(dot(tsub(c.cs[0]!, through), c.nn), dot(dir, c.nn));
    const at = tadd(through, tscale(lam, dir));
    const tol = leaf('how far apart two surfaces can be told', c.f.tol, 'm', { class: 'assumed', by: 'the generator', grounds: 'what the two places\' origins resolve, or the contact tolerance where they declare nothing' });
    if (c.cs.length >= 3) return c.cs.map((p, m) => { const q = c.cs[(m + 1) % c.cs.length]!; return ge(mul(k(sense[r]!), dot(tcross(tsub(q, p), tsub(at, p)), c.nn)), zero('m^2')); }).reduce((x, y) => and(x, y));
    if (c.cs.length === 2) {
      const e = tsub(c.cs[1]!, c.cs[0]!), rel0 = tsub(at, c.cs[0]!), len = tnorm(e);
      return and(and(le(tnorm(tcross(e, rel0)), mul(tol, len)), ge(dot(rel0, e), zero('m^2'))), le(dot(rel0, e), dot(e, e)));
    }
    return le(tnorm(tsub(at, c.cs[0]!)), tol);
  };
  const mSym = BENDING_STRESS.inputs.find((x) => x.unit === 'N m')!.sym, sSym = BENDING_STRESS.inputs.find((x) => x.unit === 'm^3')!.sym;
  const stress = (outAt: Address, moment: Address, i: number, rule: unknown) => ({ kind: 'relation' as const, id: hashOf({ contact: rule }), out: outAt, name: BENDING_STRESS.output.name, unit: BENDING_STRESS.output.unit, term: BENDING_STRESS.term, ports: { [mSym]: moment, [sSym]: placeAt.sectionS(b.id, i) }, law: BENDING_STRESS.hash });
  const bendLaw = 'the moment along a place under every force on it, each spread over its interval: largest at an interval\'s end or where the shear crosses zero';
  // a direction made level: levers for weights are measured across gravity
  const level = (v0: Term[]) => { const al = dot(v0, d), h = v0.map((x, j) => sub(x, mul(al, d[j]!))), n = tnorm(h); return { e: h.map((x) => div(x, n)), n }; };
  /** The forces along a level line through `origin`, each spread over its interval of the line, the intervals at addresses. */
  const along = (line: string, e: Term[], origin: Term[]) => {
    const at = (pt: Term[]) => dot(tsub(pt, origin), e);
    const half = P.h.reduce((s0: Term, hh, i) => add(s0, mul(hh, abs(dot(P.axes[i]!, e)))), zero('m') as Term);
    const extent = (cs: Term[][]) => { const xs = cs.map(at); return { lo: xs.reduce((a, x) => min(a, x)), hi: xs.reduce((a, x) => max(a, x)) }; };
    const acting = [
      { of: 'its weight', f: mul(k(-1), W), lo: sub(at(P.c), half), hi: add(at(P.c), half), point: false },
      ...Bv.map((c) => ({ of: `the share through ${contactPlace({ upper: b.id, lower: c.f.lower.id })}`, f: c.N as Term, ...extent(c.cs), point: c.cs.length < 2 })),
      ...Av.map((c) => ({ of: `the share through ${contactPlace({ upper: c.f.upper.id, lower: b.id })}`, f: mul(k(-1), c.N), ...extent(c.cs), point: c.cs.length < 2 })),
    ];
    const rels: Contribution[] = [], ports: Record<string, Address> = {};
    const forces = acting.map(({ of, f, lo, hi, point }, n) => {
      const ends = (['from', 'to'] as const).map((end, side) => {
        const outAt = contactAt.spread(b.id, line, of, end), term = side ? hi : lo;
        rels.push(rel({ spread: [b.id, line, n, end] }, outAt, `${of}, spread along ${line}: ${end}`, 'm', term, pick(term, all), 'where a force spread evenly over an interval of a line lies along it'));
        const v0 = variable(`${side ? 'hi' : 'lo'}${n}`, 'm');
        ports[v0.sym] = outAt;
        return v0;
      });
      return { f, lo: ends[0]! as Term, hi: ends[1]! as Term, point };
    });
    const own = forces[0]!;
    return { rels, ports: { ...all, ...ports }, forces, ext: { lo: own.lo, hi: own.hi }, q: div(W, sub(own.hi, own.lo)), at };
  };

  if (kb === 'sloped') {
    // a place on contacts not level, or under loads across gravity: what balance gives, and whether it can stay
    out.push(gap({ sloped: b.id }, `the bending of ${b.id} on contacts that are not level`, 'bending under forces across a place on sloped contacts is not generated', contactAt.sloped(b.id)));
    // the line the whole load acts along: through the point where its moment about the centre vanishes
    const moment = Av.reduce((acc, c, m) => tadd(acc, tcross(tsub(c.pt, P.c), fromAbove[m]!)), [zero('N m'), zero('N m'), zero('N m')] as Term[]);
    const L2 = dot(loadVec, loadVec), through = tadd(P.c, tscale(div(k(1), L2), tcross(loadVec, moment)));
    if (below.length === 1) {
      const c = Bv[0]!, u = b.id, l = c.f.lower.id;
      // the contact bears the whole load: its push along the normal, and the rest as friction along its surface
      const push = mul(k(-1), dot(loadVec, c.nn));
      out.push(rel({ force: [u, l] }, contactAt.force(u, l), 'force borne through the contact', 'N', push, pick(push, all), 'momentum is conserved: one contact bears all of it, as a push along its normal'));
      const fr = tsub(tscale(k(-1), loadVec), tscale(c.N, c.nn));
      fr.forEach((t, j) => out.push(rel({ friction: [u, l, j] }, contactAt.friction(u, l, j), `friction ${'xyz'[j]}`, 'N', t, pick(t, all), 'momentum is conserved: what the push along the normal does not bear, the friction along the surface does')));
      out.push(pressesOn(0));
      const inside = within(c, through, loadVec, 0);
      out.push(constraint({ over: [u, l] }, `the load on ${u} falls within what bears it`, 'a place on one contact tips unless its load falls within the patch it rests on', inside, all));
      const holds = and(and(ge(c.N, zero('N')), inside), le(tnorm(c.T), mul(c.mu, c.N)));
      out.push(atRest(holds));
      return out;
    }
    if (open === 'apart' || !open) { out.push(gap({ apart: b.id }, `the balance of ${b.id} on two contacts whose forces do not lie in one upright plane`, 'balance out of one plane on two contacts is not generated', contactAt.split(b.id))); return out; }
    // two contacts in one upright plane: balance gives three conditions on four forces, so one is free (s). Whether it
    // can stay: some s pushes at both and keeps each friction within its coefficient times its push
    const [c1, c2] = Bv as [ReturnType<typeof contactVars>, ReturnType<typeof contactVars>];
    const up = tscale(k(-1), d), r = tsub(c2.pt, c1.pt);
    const m0 = open.by < 0 ? tcross(up, r) : tcross(Bv[open.by]!.nn, up), mm = tscale(div(k(1), tnorm(m0)), m0);
    const t1 = tcross(mm, c1.nn), t2 = tcross(mm, c2.nn);
    const ML = dot(tadd(tcross(tsub(P.c, c1.pt), weight), Av.reduce((acc, c, m) => tadd(acc, tcross(tsub(c.pt, c1.pt), fromAbove[m]!)), [zero('N m'), zero('N m'), zero('N m')] as Term[])), mm);
    const alpha = dot(tcross(r, c2.nn), mm), beta = dot(tcross(r, t2), mm);
    // each force as a + b s: the free one is the friction at the second contact, or its push
    const N2 = open.free === 'friction' ? { a: div(mul(k(-1), ML), alpha), b: div(mul(k(-1), beta), alpha) } : { a: zero('N') as Term, b: k(1) as Term };
    const F2 = open.free === 'friction' ? { a: zero('N') as Term, b: k(1) as Term } : { a: div(mul(k(-1), ML), beta), b: div(mul(k(-1), alpha), beta) };
    const Ga = tadd(loadVec, tadd(tscale(N2.a, c2.nn), tscale(F2.a, t2))), Gb = tadd(tscale(N2.b, c2.nn), tscale(F2.b, t2));
    const N1 = { a: mul(k(-1), dot(Ga, c1.nn)), b: mul(k(-1), dot(Gb, c1.nn)) }, F1 = { a: mul(k(-1), dot(Ga, t1)), b: mul(k(-1), dot(Gb, t1)) };
    const cone = (N: { a: Term; b: Term }, Fr: { a: Term; b: Term }, mu: Term) => [
      { a: sub(mul(mu, N.a), Fr.a), b: sub(mul(mu, N.b), Fr.b) },
      { a: add(mul(mu, N.a), Fr.a), b: add(mul(mu, N.b), Fr.b) },
    ];
    const feasible = someHolds([N1, N2, ...cone(N1, F1, c1.mu), ...cone(N2, F2, c2.mu)]);
    out.push(constraint({ stays: b.id }, `${b.id} can stay on its two contacts`, 'some sharing of its load pushes at both contacts and keeps each friction within what its surfaces hold', feasible, all));
    out.push(atRest(feasible));
    out.push(gap({ split: b.id }, `how ${b.id}'s load splits between its two contacts`, 'balance leaves one force free; the split depends on the contacts\' stiffness, which is not generated', contactAt.split(b.id)));
    return out;
  }

  if (below.length === 1) {
    const c = Bv[0]!, u = b.id, l = c.f.lower.id;
    const lv = variable('Fl', 'N');
    out.push(rel({ force: [u, l] }, contactAt.force(u, l), 'force borne through the contact', 'N', lv, { Fl: contactAt.load(u) }, 'momentum is conserved: one contact bears all of it'));
    // it stays only if its load falls within what it rests on: its own weight at its centre, and what rests on it where it rests
    const total = Av.reduce((s0: Term, a) => add(s0, a.N), W as Term);
    const centre = [0, 1, 2].map((j) => div(Av.reduce((s0: Term, a) => add(s0, mul(a.N, a.pt[j]!)), mul(W, P.c[j]!)), total));
    const holds = within(c, centre, d, 0);
    out.push(constraint({ over: [u, l] }, `the load on ${u} falls within what bears it`, 'a place on one contact tips unless its load falls within the patch it rests on', holds, all));
    out.push(atRest(holds));
    // on one contact it bends along each of its level axes, as far as it reaches beyond what bears it
    const lines = [0, 1, 2].map((i) => ({ i, al: Math.abs(d3(b.a[i]!, below[0]!.normal)) })).sort((x, y) => x.al - y.al).slice(0, 2).map((x) => x.i).sort();
    for (const ju of lines) {
      const { rels, ports, forces, ext, q } = along(`its axis ${ju + 1}`, level(P.axes[ju]!).e, P.c);
      out.push(...rels);
      const M = largestMoment(forces, ext, q);
      out.push(rel({ momentAlong: [u, ju] }, contactAt.momentAlong(u, ju), `largest bending moment along its axis ${ju + 1}`, 'N m', M, { ...pick(M, ports), ...restPort }, bendLaw, rests));
      out.push(stress(contactAt.stressAlong(u, ju), contactAt.momentAlong(u, ju), ju, { stressAlong: [u, ju] }));
    }
    const [m0, m1] = lines.map((ju) => variable(`m${ju}`, 'N m')), [s0, s1] = lines.map((ju) => variable(`s${ju}`, 'Pa'));
    out.push(rel({ moment: u }, contactAt.moment(u), 'largest bending moment along it', 'N m', max(m0!, m1!), Object.fromEntries(lines.map((ju, n) => [[m0, m1][n]!.sym, contactAt.momentAlong(u, ju)])), 'the largest of its moments along each line it bends along'));
    out.push(rel({ stress: u }, contactAt.stress(u), 'largest bending stress along it', 'Pa', max(s0!, s1!), Object.fromEntries(lines.map((ju, n) => [[s0, s1][n]!.sym, contactAt.stressAlong(u, ju)])), 'the largest of its stresses along each line it bends along'));
    return out;
  }
  // two contacts: they share by moments about the level line between them
  const [c1, c2] = Bv as [ReturnType<typeof contactVars>, ReturnType<typeof contactVars>];
  const lv = variable('Fl', 'N');
  const { e, n: dist } = level(tsub(c2.pt, c1.pt));
  const { rels, ports, forces, ext, q, at } = along('the line between its contacts', e, c1.pt);
  out.push(...rels);
  const moment1 = Av.reduce((s0: Term, a) => add(s0, mul(a.N, at(a.pt))), mul(W, at(P.c)));
  const R2 = div(moment1, dist), R1 = sub(lv, R2);
  const allL = { ...all, Fl: contactAt.load(b.id) };
  out.push(rel({ force: [b.id, c2.f.lower.id] }, contactAt.force(b.id, c2.f.lower.id), 'force borne through the contact', 'N', R2, pick(R2, allL), 'moment balance about the other contact'));
  out.push(rel({ force: [b.id, c1.f.lower.id] }, contactAt.force(b.id, c1.f.lower.id), 'force borne through the contact', 'N', R1, pick(R1, allL), 'momentum is conserved: what the other contact does not bear, this one does'));
  out.push(pressesOn(0), pressesOn(1));
  out.push(atRest(and(ge(c1.N, zero('N')), ge(c2.N, zero('N')))));
  const M = largestMoment(forces, ext, q);
  out.push(rel({ moment: b.id }, contactAt.moment(b.id), 'largest bending moment along it', 'N m', M, { ...pick(M, ports), ...restPort }, bendLaw, rests));
  // the stress: the moment over the modulus of the section across the span (the axis most along the line between its contacts)
  out.push(stress(contactAt.stress(b.id), contactAt.moment(b.id), spanAxis, { stress: b.id }));
  return out;
}

/** Only the ports a term reads. */
function pick(t: Term, ports: Record<string, Address>): Record<string, Address> {
  return Object.fromEntries(freeVars(t).map(({ sym }) => { if (!ports[sym]) throw new Error(`contact: no address for ${sym}`); return [sym, ports[sym]!]; }));
}
