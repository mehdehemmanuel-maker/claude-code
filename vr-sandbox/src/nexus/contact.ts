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
// A place on two contacts bends under its own weight between them; its stress is the moment over the modulus of the
// section across the span (the kept law). Nothing here knows a beam, a support, a floor or a shelf.

import { BENDING_STRESS } from './book';
import { hashOf } from './identity';
import { address, type Address, type Contribution } from './journal';
import { axis, dot, gravityAxis, placeAt, sectionRelations } from './place';
import { abs, add, and, div, ge, k, le, leaf, max, min, mul, pow, sub, variable, zero, type Leaf, type Term } from './term';

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
  moment: (p: string) => address(p, 'largest bending moment between its contacts, from its own weight'),
  stress: (p: string) => address(p, 'largest bending stress between its contacts, from its own weight'),
  fromAbove: (p: string) => address(p, 'bending from what rests on it'),
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
  return { area, point, patch, upper: U, ports: { ...U.ports, ...L.ports } };
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

/** What a place's contacts make in it: the load it bears down, how it is shared, and how it bends. */
function placeStructure(b: Box, below: Touch[], above: Touch[], spanAxis: number): Contribution[] {
  const out: Contribution[] = [];
  const rel = (rule: unknown, outAt: Address, name: string, unit: string, term: Term, ports: Record<string, Address>, law = `contact: ${name}`, domain?: { says: string; holds: Term }[]): Contribution =>
    ({ kind: 'relation', id: hashOf({ contact: rule }), out: outAt, name, unit, term, ports, law, ...(domain ? { domain } : {}) });
  {
    // the load it bears down: its own weight and every force borne on it from above. It is a load at rest only where
    // each of those presses on it: a share that pulls is a place tipping off, and nothing beneath it is at rest either
    const W = variable('W', 'N'), F = above.map((_, m) => variable(`F${m}`, 'N'));
    const presses = above.map((t, m) => ({ says: `${t.upper.id} presses on ${b.id}`, holds: ge(F[m]!, zero('N')) }));
    out.push(rel({ load: b.id }, contactAt.load(b.id), 'load it bears down', 'N', F.reduce((s: Term, f) => add(s, f), W), { W: placeAt.weight(b.id), ...Object.fromEntries(above.map((t, m) => [F[m]!.sym, contactAt.force(t.upper.id, b.id)])) }, 'momentum is conserved: what a place bears down is its weight and all that is borne on it', presses.length ? presses : undefined));
    if (!below.length) { out.push({ kind: 'constraint', id: hashOf({ borne: b.id }), says: `${b.id} is borne`, by: 'momentum is conserved: a place at rest is borne by what it touches', holds: ge(variable('x', '1'), zero('1')), ports: { x: contactAt.bearer(b.id) } }); return out; }
    if (below.length > 2) { out.push({ kind: 'constraint', id: hashOf({ split: b.id }), says: `how ${b.id}'s load splits among ${below.length} contacts`, by: 'the split among more than two contacts depends on their stiffness, which is not generated', holds: ge(variable('x', '1'), zero('1')), ports: { x: contactAt.split(b.id) } }); return out; }
    const P = placeVars(b.id, 'p');
    const lv = variable('Fl', 'N');
    const P1 = [0, 1, 2].map((j) => variable(`a${j}`, 'm'));
    const pp1 = Object.fromEntries(P1.map((x, j) => [x.sym, contactAt.point(b.id, below[0]!.lower.id, j)]));
    if (below.length === 1) {
      const t = below[0]!;
      out.push(rel({ force: [b.id, t.lower.id] }, contactAt.force(b.id, t.lower.id), 'force borne through the contact', 'N', lv, { Fl: contactAt.load(b.id) }, 'momentum is conserved: one contact bears all of it'));
      // it stays only if its load falls within the patch it rests on: its own weight at its centre, and what rests on it where it rests
      const ct = contactTerms(t);
      const Fs = above.map((_, m) => variable(`F${m}`, 'N')), Ps = above.map((_, m) => [0, 1, 2].map((j) => variable(`k${m}${j}`, 'm')));
      const total = Fs.reduce((s0: Term, f) => add(s0, f), W);
      const centre = [0, 1, 2].map((j) => div(Fs.reduce((s0: Term, f, m) => add(s0, mul(f, Ps[m]![j]!)), mul(W, ct.upper.c[j]!)), total));
      const within = ct.patch.map((pa) => { const x = dot(centre, pa.axis); return and(ge(x, pa.lo), le(x, pa.hi)); });
      const ports = { ...ct.ports, W: placeAt.weight(b.id), ...Object.fromEntries(above.flatMap((u, m) => [[Fs[m]!.sym, contactAt.force(u.upper.id, b.id)], ...Ps[m]!.map((x, j) => [x.sym, contactAt.point(u.upper.id, b.id, j)])])) };
      const holds = and(within[0]!, within[1]!);
      out.push({ kind: 'constraint', id: hashOf({ over: [b.id, t.lower.id] }), says: `the load on ${b.id} falls within what bears it`, by: 'a place on one contact tips unless its load falls within the patch it rests on', holds, ports: pick(holds, ports) });
      return out;
    }
    // two contacts: they share by moments along the line between them
    const P2 = [0, 1, 2].map((j) => variable(`b${j}`, 'm'));
    const pp2 = Object.fromEntries(P2.map((x, j) => [x.sym, contactAt.point(b.id, below[1]!.lower.id, j)]));
    const D = [0, 1, 2].map((j) => sub(P2[j]!, P1[j]!)), dist = pow(dot(D, D), 0.5), e = D.map((x) => div(x, dist));
    const at = (pt: Term[]) => dot(pt.map((x, j) => sub(x, P1[j]!)), e);
    const xW = at(P.c);
    const Fk = above.map((_, m) => variable(`F${m}`, 'N')), Pk = above.map((_, m) => [0, 1, 2].map((j) => variable(`k${m}${j}`, 'm')));
    const ppk = Object.fromEntries(above.flatMap((t, m) => [[Fk[m]!.sym, contactAt.force(t.upper.id, b.id)], ...Pk[m]!.map((x, j) => [x.sym, contactAt.point(t.upper.id, b.id, j)])]));
    const moment1 = Fk.reduce((s: Term, f, m) => add(s, mul(f, at(Pk[m]!))), mul(W, xW));
    const shared = { ...P.ports, ...pp1, ...pp2, ...ppk, W: placeAt.weight(b.id), Fl: contactAt.load(b.id) };
    const R2 = div(moment1, dist), R1 = sub(lv, R2);
    out.push(rel({ force: [b.id, below[1]!.lower.id] }, contactAt.force(b.id, below[1]!.lower.id), 'force borne through the contact', 'N', R2, pick(R2, shared), 'moment balance about the other contact'));
    out.push(rel({ force: [b.id, below[0]!.lower.id] }, contactAt.force(b.id, below[0]!.lower.id), 'force borne through the contact', 'N', R1, pick(R1, shared), 'momentum is conserved: what the other contact does not bear, this one does'));
    for (const [m, t] of below.entries()) out.push({ kind: 'constraint', id: hashOf({ within: [b.id, t.lower.id] }), says: `${b.id} presses on ${t.lower.id}, never pulls`, by: 'a contact pushes; it cannot pull: a negative share is a place tipping off its contacts', holds: ge(variable('x', 'N'), zero('N')), ports: { x: contactAt.force(b.id, below[m]!.lower.id) } });
    // its own weight bends it between them: the largest moment, at zero shear in the span or at a contact over an overhang
    if (above.length) { out.push({ kind: 'constraint', id: hashOf({ fromAbove: b.id }), says: `the bending of ${b.id} from what rests on it`, by: 'the bending from loads borne at points along a place is not generated', holds: ge(variable('x', '1'), zero('1')), ports: { x: contactAt.fromAbove(b.id) } }); return out; }
    const half = P.h.reduce((s: Term, hh, i) => add(s, mul(hh, abs(dot(P.axes[i]!, e)))), zero('m') as Term);
    const e0 = sub(xW, half), e1 = add(xW, half);
    const q = div(W, sub(e1, e0));
    const R1own = sub(W, div(mul(W, xW), dist));
    const xs = min(max(add(e0, div(R1own, q)), zero('m')), dist);
    const Mspan = sub(mul(R1own, xs), div(mul(q, pow(sub(xs, e0), 2)), k(2)));
    const Mleft = div(mul(q, pow(sub(zero('m'), e0), 2)), k(2)), Mright = div(mul(q, pow(sub(e1, dist), 2)), k(2));
    const M = max(abs(Mspan), max(Mleft, Mright));
    const mPorts = { ...P.ports, ...pp1, ...pp2, W: placeAt.weight(b.id) };
    // it bends at rest only while it rests on both: its weight falls between its contacts
    const rests = { says: `${b.id} rests on both its contacts: its weight falls between them`, holds: and(ge(xW, zero('m')), le(xW, dist)) };
    out.push(rel({ moment: b.id }, contactAt.moment(b.id), 'largest bending moment between its contacts, from its own weight', 'N m', M, pick(M, mPorts), 'the moment along a place on two contacts under its own weight: the reaction times its lever less the weight beyond, largest at zero shear or over a contact', [rests]));
    // the stress: the moment over the modulus of the section across the span (the axis most along the line between its contacts)
    const i = spanAxis;
    const mSym = BENDING_STRESS.inputs.find((x) => x.unit === 'N m')!.sym, sSym = BENDING_STRESS.inputs.find((x) => x.unit === 'm^3')!.sym;
    out.push({ kind: 'relation', id: hashOf({ contact: { stress: b.id } }), out: contactAt.stress(b.id), name: BENDING_STRESS.output.name, unit: BENDING_STRESS.output.unit, term: BENDING_STRESS.term, ports: { [mSym]: contactAt.moment(b.id), [sSym]: placeAt.sectionS(b.id, i) }, law: BENDING_STRESS.hash });
  }
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
