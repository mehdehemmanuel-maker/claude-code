// Couplings between places, generated from their geometry (docs/NEXUS-FROM-REALITY.md Q1; section 17). Where a face
// of one place lies against a face of another, a contact forms. Which faces touch is decided from the places'
// present values (faces facing each other, their planes within a tolerance, their in-plane axes aligned), and decided
// again whenever the geometry changes. What the contact is, its area and its point, is a term of the places' own
// numbers. Momentum crosses it: a place's weight, and all that rests on it, goes down its contacts to what bears it,
// until it reaches a place held at rest by what lies outside the domain (the ground).
//
// What follows from contacts follows by the laws, for every place alike:
// - with one contact below, it bears everything, if its weight falls within it;
// - with two, they share by moments along the line between them;
// - with more, the split depends on stiffness, and that is a gap;
// - with none, nothing bears it, and that is a gap.
// A place bends under every force on it: its weight spread along it, and each contact's share spread over that
// contact's patch. On two contacts it bends along the level line between them; on one, along each of the contact's
// in-plane axes. Its stress is the moment over the modulus of the section across that line (the kept law). Nothing
// here knows a beam, a support, a floor or a shelf.

import { BENDING_STRESS } from './book';
import { hashOf } from './identity';
import { address, type Address, type Contribution } from './journal';
import { axis, dot, gravityAxis, placeAt, sectionRelations } from './place';
import { abs, add, and, div, ge, k, le, leaf, lt, max, min, mul, pow, sub, variable, zero, type Leaf, type Term } from './term';

/** Two faces whose planes are within this are touching: an assumption, with grounds. */
export const CONTACT_TOLERANCE: Leaf = leaf('distance at which two faces touch', 1e-3, 'm', { class: 'assumed', by: 'the generator', grounds: 'faces placed by hand or measured by a headset are not exact; a millimetre is within both' });
const ALIGNED = 1e-6;

type V3 = [number, number, number];
interface Box { id: string; c: V3; a: [V3, V3, V3]; h: V3 }
export interface View { value(a: Address): number | null; places(): string[]; held(place: string): boolean }

const rot = (q: number[]): [V3, V3, V3] => {
  const [x, y, z, w] = q as [number, number, number, number];
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)],
  ];
};
const d3 = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

/** A place as numbers now, or none while any of its numbers is unbound. */
function boxOf(v: View, id: string): Box | null {
  const n = (a: Address) => v.value(a);
  const c = [0, 1, 2].map((j) => n(placeAt.centre(id, j))), q = [0, 1, 2, 3].map((j) => n(placeAt.turn(id, j))), h = [0, 1, 2].map((i) => n(placeAt.half(id, i)));
  if ([...c, ...q, ...h].some((x) => x === null)) return null;
  return { id, c: c as V3, a: rot(q as number[]), h: h as V3 };
}

/** A face that rests on another: the upper place's face, the lower's, and which of their in-plane axes match. */
interface Touch { upper: Box; lower: Box; iu: number; su: number; il: number; inplane: [number, number][] }

function touches(a: Box, b: Box, down: V3, tol: number): Touch | null {
  for (let iu = 0; iu < 3; iu++) for (const su of [1, -1]) {
    const nu = a.a[iu]!.map((x) => x * su) as V3;
    if (d3(nu, down) <= ALIGNED) continue; // the face does not face downward
    for (let il = 0; il < 3; il++) for (const sl of [1, -1]) {
      const nl = b.a[il]!.map((x) => x * sl) as V3;
      if (d3(nu, nl) > -1 + ALIGNED) continue; // not facing each other
      const fu = a.c.map((x, j) => x + su * a.h[iu]! * a.a[iu]![j]!) as V3, fl = b.c.map((x, j) => x + sl * b.h[il]! * b.a[il]![j]!) as V3;
      if (Math.abs(d3(fu.map((x, j) => x - fl[j]!) as V3, nl)) > tol) continue; // planes apart
      const inplane: [number, number][] = [];
      for (const ju of [0, 1, 2].filter((x) => x !== iu)) {
        const jl = [0, 1, 2].filter((x) => x !== il).find((x) => Math.abs(Math.abs(d3(a.a[ju]!, b.a[x]!)) - 1) < ALIGNED);
        if (jl === undefined) return null; // turned against each other in their plane: not generated
        inplane.push([ju, jl]);
      }
      // the faces overlap along both in-plane axes
      const overlaps = inplane.every(([ju, jl]) => { const pu = d3(a.c, a.a[ju]!), pl = d3(b.c, a.a[ju]!); return Math.min(pu + a.h[ju]!, pl + b.h[jl]!) - Math.max(pu - a.h[ju]!, pl - b.h[jl]!) > 0; });
      if (overlaps) return { upper: a, lower: b, iu, su, il, inplane };
    }
  }
  return null;
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

const contactPlace = (t: { upper: string; lower: string }) => `${t.upper} on ${t.lower}`;
export const contactAt = {
  area: (upper: string, lower: string) => address(contactPlace({ upper, lower }), 'area'),
  point: (upper: string, lower: string, j: number) => address(contactPlace({ upper, lower }), `point ${'xyz'[j]}`),
  force: (upper: string, lower: string) => address(contactPlace({ upper, lower }), 'force borne'),
  load: (p: string) => address(p, 'load it bears down'),
  bearer: (p: string) => address(p, 'what bears it'),
  split: (p: string) => address(p, 'how its load splits among more than two contacts (their stiffness)'),
  patch: (upper: string, lower: string, n: number) => address(contactPlace({ upper, lower }), `length along its in-plane axis ${n + 1}`),
  moment: (p: string) => address(p, 'largest bending moment along it'),
  stress: (p: string) => address(p, 'largest bending stress along it'),
  spread: (p: string, line: string, of: string, end: 'from' | 'to') => address(p, `${of}, spread along ${line}: ${end}`),
  momentAlong: (p: string, i: number) => address(p, `largest bending moment along its axis ${i + 1}`),
  stressAlong: (p: string, i: number) => address(p, `largest bending stress along its axis ${i + 1}`),
  rests: (p: string) => address(p, 'at rest on what bears it'),
};

/** The area of a touching pair and its point, as terms of both places' numbers. */
function contactTerms(t: Touch) {
  const U = placeVars(t.upper.id, 'u'), L = placeVars(t.lower.id, 'l');
  const lens: Term[] = [], mids: Term[] = [], patch: { axis: Term[]; lo: Term; hi: Term }[] = [];
  for (const [ju, jl] of t.inplane) {
    const ax = U.axes[ju]!;
    const pu = dot(U.c, ax), pl = dot(L.c, ax);
    const lo = max(sub(pu, U.h[ju]!), sub(pl, L.h[jl]!)), hi = min(add(pu, U.h[ju]!), add(pl, L.h[jl]!));
    lens.push(max(zero('m'), sub(hi, lo)));
    mids.push(div(add(lo, hi), k(2)));
    patch.push({ axis: ax, lo, hi });
  }
  const area = mul(lens[0]!, lens[1]!);
  // the point: the upper's face centre, moved within the face to the middle of the overlap along each in-plane axis
  const point = [0, 1, 2].map((j) => {
    let t0: Term = add(U.c[j]!, mul(k(t.su), U.h[t.iu]!, U.axes[t.iu]![j]!));
    t.inplane.forEach(([ju], m) => { t0 = add(t0, mul(sub(mids[m]!, dot(U.c, U.axes[ju]!)), U.axes[ju]![j]!)); });
    return t0;
  });
  return { area, point, patch, lens, upper: U, ports: { ...U.ports, ...L.ports } };
}

// ---- the structure contacts make -----------------------------------------------------------------------------------

/**
 * Every relation and constraint the places' contacts imply now: what each contact is, the load that goes down
 * through it, and what that makes in the places it crosses.
 */
export function contactStructure(v: View, cache = new Map<string, Contribution[]>()): Contribution[] {
  const down = [0, 1, 2].map((j) => v.value(gravityAxis(j)));
  if (down.some((x) => x === null)) return [];
  const boxes = v.places().map((id) => boxOf(v, id)).filter((b): b is Box => !!b);
  const touching: Touch[] = [];
  for (const a of boxes) for (const b of boxes) if (a !== b) { const t = touches(a, b, down as V3, CONTACT_TOLERANCE.value!); if (t) touching.push(t); }
  const out: Contribution[] = [];
  const rel = (rule: unknown, outAt: Address, name: string, unit: string, term: Term, ports: Record<string, Address>, law = `contact: ${name}`): Contribution =>
    ({ kind: 'relation', id: hashOf({ contact: rule }), out: outAt, name, unit, term, ports, law });
  // the terms depend only on which faces touch which, never on the values: they are built once for each such decision
  const memo = (key: unknown, build: () => Contribution[]) => { const h = hashOf(key); let got = cache.get(h); if (!got) { got = build(); cache.set(h, got); } out.push(...got); };
  // a section bends about the line gravity crosses it by only where gravity has a part across it
  for (const b of boxes) for (let i = 0; i < 3; i++) {
    const [j, kk] = [0, 1, 2].filter((x) => x !== i) as [number, number];
    const cj = d3(b.a[j]!, down as V3), ck = d3(b.a[kk]!, down as V3);
    if (cj * cj + ck * ck > 1e-12) memo({ section: b.id, i }, () => sectionRelations(b.id, i));
  }
  const sig = (t: Touch) => ({ u: t.upper.id, l: t.lower.id, iu: t.iu, su: t.su, il: t.il, inplane: t.inplane });
  for (const t of touching) memo({ touch: sig(t) }, () => {
    const ct = contactTerms(t);
    const ports = ct.ports, got: Contribution[] = [];
    got.push(rel({ area: [t.upper.id, t.lower.id] }, contactAt.area(t.upper.id, t.lower.id), 'area of the contact', 'm^2', ct.area, pick(ct.area, ports)));
    ct.point.forEach((pt, j) => got.push(rel({ point: [t.upper.id, t.lower.id, j] }, contactAt.point(t.upper.id, t.lower.id, j), `contact point ${'xyz'[j]}`, 'm', pt, pick(pt, ports))));
    ct.lens.forEach((len, n) => got.push(rel({ patch: [t.upper.id, t.lower.id, n] }, contactAt.patch(t.upper.id, t.lower.id, n), `length of the contact along its in-plane axis ${n + 1}`, 'm', len, pick(len, ports))));
    return got;
  });
  for (const b of boxes) {
    if (v.held(b.id)) continue; // held at rest from outside the domain: its load leaves the domain
    const below = touching.filter((t) => t.upper.id === b.id), above = touching.filter((t) => t.lower.id === b.id);
    // the section that spans between two contacts is a decision on the values, so it is part of what decides the terms
    const spanAxis = below.length === 2 ? (() => { const dir = diff(boxPoint(touching, b.id, below[1]!.lower.id), boxPoint(touching, b.id, below[0]!.lower.id)); const al = [0, 1, 2].map((i) => Math.abs(d3(b.a[i]!, dir))); return al.indexOf(Math.max(...al)); })() : -1;
    memo({ place: b.id, below: below.map(sig), above: above.map(sig), spanAxis }, () => placeStructure(b, below, above, spanAxis));
  }
  return out;
}

/**
 * The largest bending moment along a line through a place, under forces each spread evenly over an interval of the
 * line (upward positive): its own weight over its extent, each contact's share over that contact's patch. With every
 * force spread, the shear is continuous and piecewise linear, so the moment at any station is exact for every
 * arrangement, and its largest is at an interval's end or where the shear crosses zero just past one. Every station
 * tried is a real station of the place, so the largest found is never more than the true largest, and the true one is
 * among them. `q` is the weight per length, a slope the shear has wherever nothing else cancels it.
 */
function largestMoment(forces: { f: Term; lo: Term; hi: Term }[], ext: { lo: Term; hi: Term }, q: Term): Term {
  const z = zero('m');
  const M = (x: Term) => forces.reduce((acc: Term, { f, lo, hi }) => add(acc, div(mul(f, sub(pow(max(sub(x, lo), z), 2), pow(max(sub(x, hi), z), 2))), mul(k(2), sub(hi, lo)))), zero('N m') as Term);
  const V = (x: Term) => forces.reduce((acc: Term, { f, lo, hi }) => add(acc, div(mul(f, min(max(sub(x, lo), z), sub(hi, lo))), sub(hi, lo))), zero('N') as Term);
  const slope = (x: Term) => forces.reduce((acc: Term, { f, lo, hi }) => add(acc, div(mul(f, mul(ge(x, lo), lt(x, hi))), sub(hi, lo))), zero('N/m') as Term);
  const ends = forces.flatMap(({ lo, hi }) => [lo, hi]);
  const zeros = ends.map((p) => { const s0 = slope(p), s1 = add(s0, mul(le(abs(s0), zero('N/m')), q)); return min(max(sub(p, div(V(p), s1)), ext.lo), ext.hi); });
  return [...ends, ...zeros].map((x) => abs(M(x))).reduce((a, b) => max(a, b));
}

/** What a place's contacts make in it: the load it bears down, how it is shared, and how it bends. */
function placeStructure(b: Box, below: Touch[], above: Touch[], spanAxis: number): Contribution[] {
  const out: Contribution[] = [];
  const rel = (rule: unknown, outAt: Address, name: string, unit: string, term: Term, ports: Record<string, Address>, law = `contact: ${name}`, domain?: { says: string; holds: Term }[]): Contribution =>
    ({ kind: 'relation', id: hashOf({ contact: rule }), out: outAt, name, unit, term, ports, law, ...(domain ? { domain } : {}) });
  // the load it bears down: its own weight and every force borne on it from above. It is a load at rest only where
  // each of those presses on it: a share that pulls is a place tipping off, and nothing beneath it is at rest either
  const W = variable('W', 'N'), F = above.map((_, m) => variable(`F${m}`, 'N'));
  const Pk = above.map((_, m) => [0, 1, 2].map((j) => variable(`k${m}${j}`, 'm')));
  const Lk = above.map((_, m) => [0, 1].map((n) => variable(`kl${m}${n}`, 'm')));
  const ppk = Object.fromEntries(above.flatMap((t, m) => [[F[m]!.sym, contactAt.force(t.upper.id, b.id)], ...Pk[m]!.map((x, j) => [x.sym, contactAt.point(t.upper.id, b.id, j)]), ...Lk[m]!.map((x, n) => [x.sym, contactAt.patch(t.upper.id, b.id, n)])]));
  const presses = above.map((t, m) => ({ says: `${t.upper.id} presses on ${b.id}`, holds: ge(F[m]!, zero('N')) }));
  out.push(rel({ load: b.id }, contactAt.load(b.id), 'load it bears down', 'N', F.reduce((s0: Term, f) => add(s0, f), W), pick(F.reduce((s0: Term, f) => add(s0, f), W), { W: placeAt.weight(b.id), ...ppk }), 'momentum is conserved: what a place bears down is its weight and all that is borne on it', presses.length ? presses : undefined));
  if (!below.length) { out.push({ kind: 'constraint', id: hashOf({ borne: b.id }), says: `${b.id} is borne`, by: 'momentum is conserved: a place at rest is borne by what it touches', holds: ge(variable('x', '1'), zero('1')), ports: { x: contactAt.bearer(b.id) } }); return out; }
  if (below.length > 2) { out.push({ kind: 'constraint', id: hashOf({ split: b.id }), says: `how ${b.id}'s load splits among ${below.length} contacts`, by: 'the split among more than two contacts depends on their stiffness, which is not generated', holds: ge(variable('x', '1'), zero('1')), ports: { x: contactAt.split(b.id) } }); return out; }
  const P = placeVars(b.id, 'p');
  const d = [0, 1, 2].map((j) => variable(`d${j}`, '1')), dp = Object.fromEntries(d.map((x, j) => [x.sym, gravityAxis(j)]));
  // a direction made level: levers for weights are measured across gravity
  const level = (v: Term[]) => { const along = dot(v, d), h = v.map((x, j) => sub(x, mul(along, d[j]!))), n = pow(dot(h, h), 0.5); return { e: h.map((x) => div(x, n)), n }; };
  const lv = variable('Fl', 'N');
  const R = below.map((_, r) => variable(`R${r}`, 'N'));
  const Pr = below.map((_, r) => [0, 1, 2].map((j) => variable(`${'ab'[r]}${j}`, 'm')));
  const Lr = below.map((_, r) => [0, 1].map((n) => variable(`rl${r}${n}`, 'm')));
  const ppr = Object.fromEntries(below.flatMap((t, r) => [[R[r]!.sym, contactAt.force(b.id, t.lower.id)], ...Pr[r]!.map((x, j) => [x.sym, contactAt.point(b.id, t.lower.id, j)]), ...Lr[r]!.map((x, n) => [x.sym, contactAt.patch(b.id, t.lower.id, n)])]));
  const all = { ...P.ports, ...dp, ...ppk, ...ppr, W: placeAt.weight(b.id), Fl: contactAt.load(b.id) };
  /**
   * The forces on the place along a level line through `origin`, each spread over its interval of the line. Where
   * each interval lies is a quantity of its own, derived at an address, so the moment reads only the forces and their
   * intervals.
   */
  const along = (line: string, e: Term[], origin: Term[]) => {
    const at = (pt: Term[]) => dot(pt.map((x, j) => sub(x, origin[j]!)), e);
    const width = (lens: Term[], axes: Term[][]) => lens.reduce((s0: Term, len, n) => add(s0, mul(len, abs(dot(axes[n]!, e)))), zero('m') as Term);
    const half = P.h.reduce((s0: Term, hh, i) => add(s0, mul(hh, abs(dot(P.axes[i]!, e)))), zero('m') as Term);
    const acting = [
      { of: 'its weight', f: mul(k(-1), W), centre: at(P.c), w: mul(k(2), half) },
      ...below.map((t, r) => ({ of: `the share through ${contactPlace({ upper: b.id, lower: t.lower.id })}`, f: R[r]! as Term, centre: at(Pr[r]!), w: width(Lr[r]!, t.inplane.map(([ju]) => P.axes[ju]!)) })),
      ...above.map((t, m) => ({ of: `the share through ${contactPlace({ upper: t.upper.id, lower: b.id })}`, f: mul(k(-1), F[m]!), centre: at(Pk[m]!), w: width(Lk[m]!, t.inplane.map(([, jl]) => P.axes[jl]!)) })),
    ];
    const rels: Contribution[] = [], ports: Record<string, Address> = {};
    const forces = acting.map(({ of, f, centre, w }, n) => {
      const ends = (['from', 'to'] as const).map((end, side) => {
        const outAt = contactAt.spread(b.id, line, of, end), term = side ? add(centre, div(w, k(2))) : sub(centre, div(w, k(2)));
        rels.push(rel({ spread: [b.id, line, n, end] }, outAt, `${of}, spread along ${line}: ${end}`, 'm', term, pick(term, all), 'where a force spread evenly over an interval of a line lies along it'));
        const v = variable(`${side ? 'hi' : 'lo'}${n}`, 'm');
        ports[v.sym] = outAt;
        return v;
      });
      return { f, lo: ends[0]! as Term, hi: ends[1]! as Term };
    });
    const own = forces[0]!;
    return { rels, ports: { ...all, ...ports }, forces, ext: { lo: own.lo, hi: own.hi }, q: div(W, sub(own.hi, own.lo)), at };
  };
  // whether it is at rest: its own contacts hold it, and what bears it is at rest, down to what is held. What it
  // derives as a place at rest (its bending) holds only while it is
  const lowerRest = below.map((_, r) => variable(`z${r}`, '1')), lrp = Object.fromEntries(below.map((t, r) => [lowerRest[r]!.sym, contactAt.rests(t.lower.id)]));
  const restVar = variable('rest', '1');
  const restLaw = 'a place is at rest while its contacts hold it and what bears it is at rest';
  const atRest = (own: Term, ports: Record<string, Address>) => {
    const holds = lowerRest.reduce((acc: Term, z) => and(acc, ge(z, k(1))), own);
    return rel({ rests: b.id }, contactAt.rests(b.id), 'at rest on what bears it', '1', holds, pick(holds, { ...ports, ...lrp }), restLaw);
  };
  const rests = [{ says: `${b.id} is at rest on what bears it`, holds: ge(restVar, k(1)) }, ...presses];
  const restPort = { [restVar.sym]: contactAt.rests(b.id) };
  const mSym = BENDING_STRESS.inputs.find((x) => x.unit === 'N m')!.sym, sSym = BENDING_STRESS.inputs.find((x) => x.unit === 'm^3')!.sym;
  const stress = (outAt: Address, moment: Address, i: number, rule: unknown) => ({ kind: 'relation' as const, id: hashOf({ contact: rule }), out: outAt, name: BENDING_STRESS.output.name, unit: BENDING_STRESS.output.unit, term: BENDING_STRESS.term, ports: { [mSym]: moment, [sSym]: placeAt.sectionS(b.id, i) }, law: BENDING_STRESS.hash });
  const bendLaw = 'the moment along a place under every force on it, each spread over its interval: largest at an interval\'s end or where the shear crosses zero';
  if (below.length === 1) {
    const t = below[0]!;
    out.push(rel({ force: [b.id, t.lower.id] }, contactAt.force(b.id, t.lower.id), 'force borne through the contact', 'N', lv, { Fl: contactAt.load(b.id) }, 'momentum is conserved: one contact bears all of it'));
    // it stays only if its load falls within the patch it rests on: its own weight at its centre, and what rests on it where it rests
    const ct = contactTerms(t);
    const total = F.reduce((s0: Term, f) => add(s0, f), W);
    const centre = [0, 1, 2].map((j) => div(F.reduce((s0: Term, f, m) => add(s0, mul(f, Pk[m]![j]!)), mul(W, ct.upper.c[j]!)), total));
    const within = ct.patch.map((pa) => { const x = dot(centre, pa.axis); return and(ge(x, pa.lo), le(x, pa.hi)); });
    const holds = and(within[0]!, within[1]!);
    out.push({ kind: 'constraint', id: hashOf({ over: [b.id, t.lower.id] }), says: `the load on ${b.id} falls within what bears it`, by: 'a place on one contact tips unless its load falls within the patch it rests on', holds, ports: pick(holds, { ...ct.ports, ...all }) });
    out.push(atRest(holds, { ...ct.ports, ...all }));
    // on one contact it bends along each of the contact's in-plane axes, as far as it reaches beyond the patch
    for (const [ju] of t.inplane) {
      const { rels, ports, forces, ext, q } = along(`its axis ${ju + 1}`, level(P.axes[ju]!).e, P.c);
      out.push(...rels);
      const M = largestMoment(forces, ext, q);
      out.push(rel({ momentAlong: [b.id, ju] }, contactAt.momentAlong(b.id, ju), `largest bending moment along its axis ${ju + 1}`, 'N m', M, { ...pick(M, ports), ...restPort }, bendLaw, rests));
      out.push(stress(contactAt.stressAlong(b.id, ju), contactAt.momentAlong(b.id, ju), ju, { stressAlong: [b.id, ju] }));
    }
    const [m0, m1] = t.inplane.map(([ju]) => variable(`m${ju}`, 'N m')), [s0, s1] = t.inplane.map(([ju]) => variable(`s${ju}`, 'Pa'));
    out.push(rel({ moment: b.id }, contactAt.moment(b.id), 'largest bending moment along it', 'N m', max(m0!, m1!), Object.fromEntries(t.inplane.map(([ju], n) => [[m0, m1][n]!.sym, contactAt.momentAlong(b.id, ju)])), 'the largest of its moments along each line it bends along'));
    out.push(rel({ stress: b.id }, contactAt.stress(b.id), 'largest bending stress along it', 'Pa', max(s0!, s1!), Object.fromEntries(t.inplane.map(([ju], n) => [[s0, s1][n]!.sym, contactAt.stressAlong(b.id, ju)])), 'the largest of its stresses along each line it bends along'));
    return out;
  }
  // two contacts: they share by moments about the level line between them
  const { e, n: dist } = level([0, 1, 2].map((j) => sub(Pr[1]![j]!, Pr[0]![j]!)));
  const { rels, ports, forces, ext, q, at } = along('the line between its contacts', e, Pr[0]!);
  out.push(...rels);
  const moment1 = above.reduce((s0: Term, _, m) => add(s0, mul(F[m]!, at(Pk[m]!))), mul(W, at(P.c)));
  const R2 = div(moment1, dist), R1 = sub(lv, R2);
  out.push(rel({ force: [b.id, below[1]!.lower.id] }, contactAt.force(b.id, below[1]!.lower.id), 'force borne through the contact', 'N', R2, pick(R2, all), 'moment balance about the other contact'));
  out.push(rel({ force: [b.id, below[0]!.lower.id] }, contactAt.force(b.id, below[0]!.lower.id), 'force borne through the contact', 'N', R1, pick(R1, all), 'momentum is conserved: what the other contact does not bear, this one does'));
  for (const [r, t] of below.entries()) out.push({ kind: 'constraint', id: hashOf({ within: [b.id, t.lower.id] }), says: `${b.id} presses on ${t.lower.id}, never pulls`, by: 'a contact pushes; it cannot pull: a negative share is a place tipping off its contacts', holds: ge(variable('x', 'N'), zero('N')), ports: { x: contactAt.force(b.id, below[r]!.lower.id) } });
  const press = R.reduce((acc: Term | null, x) => (acc ? and(acc, ge(x, zero('N'))) : ge(x, zero('N'))), null)!;
  out.push(atRest(press, all));
  const M = largestMoment(forces, ext, q);
  out.push(rel({ moment: b.id }, contactAt.moment(b.id), 'largest bending moment along it', 'N m', M, { ...pick(M, ports), ...restPort }, bendLaw, rests));
  // the stress: the moment over the modulus of the section across the span (the axis most along the line between its contacts)
  out.push(stress(contactAt.stress(b.id), contactAt.moment(b.id), spanAxis, { stress: b.id }));
  return out;
}

/** Only the ports a term reads. */
function pick(t: Term, ports: Record<string, Address>): Record<string, Address> {
  const syms = new Set<string>();
  const walk = (x: Term) => { if (x.kind === 'var') syms.add(x.sym); else if (x.kind === 'app') x.args.forEach(walk); };
  walk(t);
  return Object.fromEntries([...syms].map((s) => { if (!ports[s]) throw new Error(`contact: no address for ${s}`); return [s, ports[s]!]; }));
}

/** A contact point as numbers, from the boxes, for deciding which section spans between two contacts. */
function boxPoint(touching: Touch[], upper: string, lower: string): V3 {
  const t = touching.find((x) => x.upper.id === upper && x.lower.id === lower)!;
  const a = t.upper, b = t.lower;
  const f = a.c.map((x, j) => x + t.su * a.h[t.iu]! * a.a[t.iu]![j]!) as V3;
  let p = f;
  for (const [ju, jl] of t.inplane) {
    const ax = a.a[ju]!, pu = d3(a.c, ax), pl = d3(b.c, ax);
    const mid = (Math.max(pu - a.h[ju]!, pl - b.h[jl]!) + Math.min(pu + a.h[ju]!, pl + b.h[jl]!)) / 2;
    p = p.map((x, j) => x + (mid - pu) * ax[j]!) as V3;
  }
  return p;
}
const diff = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
