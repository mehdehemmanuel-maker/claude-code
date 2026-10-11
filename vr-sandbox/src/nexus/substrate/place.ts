// Places in the domain (docs/NEXUS-FROM-REALITY.md R1, S1; section 16). A place is a shape in the domain's
// coordinates, here a box: where its centre is, how it is turned (a unit quaternion), and its half-extents along its
// own three axes, every number a leaf with its origin. Directions are never named: down is the direction of the
// measured gravity, a vector leaf of the domain.
//
// What a place's geometry implies is generated from it by rules that hold for every place, never for a kind of
// place. These are its volume; its extent along gravity; its mass and weight once its matter's density is known; the
// area of the section across each of its axes; and, for each section gravity has a part across, its second moment and
// modulus about the line gravity bends it around, generated with the couplings (contact.ts) since which sections
// those are is decided from the present values. Each is an integral of the shape relative to a direction, written as
// a term. A board on
// edge and a board flat differ only by how they are turned: which length is a breadth and which a depth is a
// consequence of the direction of the load, never a name.

import { WEIGHT } from '../book';
import { address, type Address, type Contribution } from './journal';
import { abs, add, div, k, mul, pow, sub, variable, type Leaf, type Term } from '../lang/term';
import { hashOf } from '../lang/identity';

/** The domain's own quantities: gravity's magnitude and its direction, a unit vector in the domain's coordinates. */
export const DOMAIN = 'the domain';
export const GRAVITY = address(DOMAIN, 'gravity');
export const gravityAxis = (j: number): Address => address(DOMAIN, `direction of gravity ${'xyz'[j]}`);

/** A place: a box in the domain, every number a leaf with its origin. */
export interface PlaceSpec { id: string; centre: [Leaf, Leaf, Leaf]; turn: [Leaf, Leaf, Leaf, Leaf]; half: [Leaf, Leaf, Leaf] }

/** Where each number of a place is held. */
export const placeAt = {
  centre: (p: string, j: number) => address(p, `centre ${'xyz'[j]}`),
  turn: (p: string, j: number) => address(p, `turn ${'xyzw'[j]}`),
  half: (p: string, i: number) => address(p, `half-extent along its axis ${i + 1}`),
  density: (p: string) => address(p, 'density of its matter'),
  volume: (p: string) => address(p, 'volume'),
  mass: (p: string) => address(p, 'mass'),
  weight: (p: string) => address(p, 'weight'),
  alongGravity: (p: string) => address(p, 'extent along gravity'),
  sectionArea: (p: string, i: number) => address(p, `area of its section across its axis ${i + 1}`),
  sectionI: (p: string, i: number) => address(p, `second moment of its section across its axis ${i + 1}, about the line gravity bends it around`),
  sectionS: (p: string, i: number) => address(p, `modulus of its section across its axis ${i + 1}, about the line gravity bends it around`),
};

/** A place's numbers as leaf contributions, each at its address. */
export function placeLeaves(p: PlaceSpec): Contribution[] {
  return [
    ...p.centre.map((l, j) => ({ kind: 'leaf' as const, at: placeAt.centre(p.id, j), leaf: l })),
    ...p.turn.map((l, j) => ({ kind: 'leaf' as const, at: placeAt.turn(p.id, j), leaf: l })),
    ...p.half.map((l, i) => ({ kind: 'leaf' as const, at: placeAt.half(p.id, i), leaf: l })),
  ];
}

const one = k(1), two = k(2);
const sq = (t: Term) => pow(t, 2);
/** Column i of the rotation a unit quaternion (x, y, z, w) makes: the place's axis i in the domain's coordinates. */
export function axis(q: Term[], i: number): Term[] {
  const [x, y, z, w] = q as [Term, Term, Term, Term];
  const R: Term[][] = [
    [sub(one, mul(two, add(sq(y), sq(z)))), mul(two, sub(mul(x, y), mul(z, w))), mul(two, add(mul(x, z), mul(y, w)))],
    [mul(two, add(mul(x, y), mul(z, w))), sub(one, mul(two, add(sq(x), sq(z)))), mul(two, sub(mul(y, z), mul(x, w)))],
    [mul(two, sub(mul(x, z), mul(y, w))), mul(two, add(mul(y, z), mul(x, w))), sub(one, mul(two, add(sq(x), sq(y))))],
  ];
  return [R[0]![i]!, R[1]![i]!, R[2]![i]!];
}
export const dot = (a: Term[], b: Term[]) => a.slice(1).reduce((s, x, j) => add(s, mul(x, b[j + 1]!)), mul(a[0]!, b[0]!));

/**
 * The relations every place carries, generated from its geometry and the domain's gravity. They are recomputed from
 * the place whenever it is applied, so they are derivations of the place, not contributions of their own.
 */
export function placeRelations(id: string): Contribution[] {
  const q = [0, 1, 2, 3].map((j) => variable(`q${j}`, '1', `turn ${'xyzw'[j]}`));
  const h = [0, 1, 2].map((i) => variable(`h${i}`, 'm', `half-extent along axis ${i + 1}`));
  const d = [0, 1, 2].map((j) => variable(`d${j}`, '1', `direction of gravity ${'xyz'[j]}`));
  const qp = Object.fromEntries(q.map((v, j) => [v.sym, placeAt.turn(id, j)]));
  const hp = Object.fromEntries(h.map((v, i) => [v.sym, placeAt.half(id, i)]));
  const dp = Object.fromEntries(d.map((v, j) => [v.sym, gravityAxis(j)]));
  const axes = [0, 1, 2].map((i) => axis(q, i));
  const along = axes.map((a) => dot(a, d)); // each axis's share of gravity's direction
  const rel = (rule: string, out: Address, name: string, unit: string, term: Term, ports: Record<string, Address>, domain?: { says: string; holds: Term }[]): Contribution =>
    ({ kind: 'relation', id: hashOf({ place: id, rule }), out, name, unit, term, ports, law: `the geometry of a place: ${rule}`, ...(domain ? { domain } : {}) });
  const out: Contribution[] = [];
  out.push(rel('volume', placeAt.volume(id), 'volume', 'm^3', mul(k(8), h[0]!, h[1]!, h[2]!), hp));
  out.push(rel('extent along gravity', placeAt.alongGravity(id), 'extent along gravity', 'm',
    mul(two, add(add(mul(h[0]!, abs(along[0]!)), mul(h[1]!, abs(along[1]!))), mul(h[2]!, abs(along[2]!)))), { ...hp, ...qp, ...dp }));
  // its matter: mass from density, weight by the kept law
  const rho = variable('rho', 'kg/m^3', 'density of its matter'), V = variable('V', 'm^3', 'volume');
  out.push(rel('mass', placeAt.mass(id), 'mass', 'kg', mul(rho, V), { rho: placeAt.density(id), V: placeAt.volume(id) }));
  const mPort = WEIGHT.inputs.find((p) => p.unit === 'kg')!.sym, gPort = WEIGHT.inputs.find((p) => p.unit === 'm/s^2')!.sym;
  out.push({ kind: 'relation', id: hashOf({ place: id, rule: 'weight' }), out: placeAt.weight(id), name: WEIGHT.output.name, unit: WEIGHT.output.unit, term: WEIGHT.term, ports: { [mPort]: placeAt.mass(id), [gPort]: GRAVITY }, law: WEIGHT.hash });
  // across each axis, the section's area; its stiffness about the line gravity bends it around is generated only
  // where gravity has a part across it (sectionRelations), decided from the present values
  for (let i = 0; i < 3; i++) {
    const [j, kk] = [0, 1, 2].filter((x) => x !== i) as [number, number];
    out.push(rel(`section area ${i}`, placeAt.sectionArea(id, i), `area of the section across axis ${i + 1}`, 'm^2', mul(k(4), h[j]!, h[kk]!), hp));
  }
  return out;
}

/**
 * The section across a place's axis i, its second moment and modulus about the line gravity bends it around. It
 * applies only where gravity has a part across the section, so it is generated only there: a place standing along
 * gravity is pressed along that axis, not bent across it, and no such section is generated for it.
 */
export function sectionRelations(id: string, i: number): Contribution[] {
  const q = [0, 1, 2, 3].map((j) => variable(`q${j}`, '1', `turn ${'xyzw'[j]}`));
  const h = [0, 1, 2].map((n) => variable(`h${n}`, 'm', `half-extent along axis ${n + 1}`));
  const d = [0, 1, 2].map((j) => variable(`d${j}`, '1', `direction of gravity ${'xyz'[j]}`));
  const ports = { ...Object.fromEntries(q.map((v, j) => [v.sym, placeAt.turn(id, j)])), ...Object.fromEntries(h.map((v, n) => [v.sym, placeAt.half(id, n)])), ...Object.fromEntries(d.map((v, j) => [v.sym, gravityAxis(j)])) };
  const [j, kk] = [0, 1, 2].filter((x) => x !== i) as [number, number];
  const cj = dot(axis(q, j), d), ck = dot(axis(q, kk), d), across = add(sq(cj), sq(ck));
  const area = mul(k(4), h[j]!, h[kk]!);
  const rel = (rule: string, out: Address, name: string, unit: string, term: Term): Contribution => ({ kind: 'relation', id: hashOf({ place: id, rule }), out, name, unit, term, ports: pick(term, ports), law: `the geometry of a place: ${rule}` });
  // I about the line across the section perpendicular to gravity's part in it: A/3 (hj² ej² + hk² ek²), e the unit part
  const I = div(mul(div(area, k(3)), add(mul(sq(h[j]!), sq(cj)), mul(sq(h[kk]!), sq(ck)))), across);
  // the outermost fibre along gravity's part: hj |ej| + hk |ek|
  const c = div(add(mul(h[j]!, abs(cj)), mul(h[kk]!, abs(ck))), pow(across, 0.5));
  return [rel(`section second moment ${i}`, placeAt.sectionI(id, i), `second moment of the section across axis ${i + 1}`, 'm^4', I), rel(`section modulus ${i}`, placeAt.sectionS(id, i), `modulus of the section across axis ${i + 1}`, 'm^3', div(I, c))];
}

function pick(t: Term, ports: Record<string, Address>): Record<string, Address> {
  const syms = new Set<string>();
  const walk = (x: Term) => { if (x.kind === 'var') syms.add(x.sym); else if (x.kind === 'app') x.args.forEach(walk); };
  walk(t);
  return Object.fromEntries([...syms].map((s) => [s, ports[s]!]));
}
