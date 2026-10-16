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
//
// It also owns WHICH LAWS ARE ON (`Setting`), because the setting is the domain's own quantities and gravity is
// already one of them. The room is derived from it, never drawn: with nothing switched on a thing stands in the air
// where it is put, every law attached and none acting, and switching gravity on is what makes a surface under it
// implied by anything at all.

import { WEIGHT } from '../book';
import { address, type Address, type Contribution } from './journal';
import { abs, add, div, k, leaf, mul, pow, sub, variable, type Leaf, type Term } from '../lang/term';
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

/**
 * WHICH LAWS ARE ON. The room is not drawn; it is what this implies.
 *
 * The user, 2026-10-16: *"it should just be in the air unless time and gravity apply then it when those are on it
 * would start being g active or effected by environment"*. That is the packet's own shape applied to the room. A
 * packet is a thing with all its math attached and nothing computed until asked; a setting is a thing standing in
 * the air with every law attached and none of them acting until switched on. So a floor, a table, a bench and a
 * building are not scenery to draw: each is a CONSEQUENCE of gravity being on, and with gravity off not one of them
 * is implied by anything.
 *
 * GRAVITY OFF IS NOT GRAVITY UNKNOWN, and the difference is the whole load-bearing distinction here. Unknown is an
 * absence: `evolve` refuses outright, because nothing can be realized from an unknown. Off is a MEASURED ZERO — a
 * known number that every law reads and that makes every weight it feeds exactly zero. So nothing is special-cased
 * for the blank room: `WEIGHT` still runs, `contact.ts` still works out what a place bears, and both answer 0 N
 * because 0 × m = 0. The room goes inert by arithmetic, not by a branch.
 */
export interface Setting {
  /** Is time running? Off is no clock at all, not a slow one, so nothing advances and the evolver is not run. */
  time: boolean;
  /** The acceleration of free fall here, m/s². ZERO IS A SETTING, not an absence (see above). */
  gravity: number;
  /** Which way gravity pulls, a unit vector in the domain's coordinates. Down is never named; it is measured. */
  direction: [number, number, number];
  /** Where these numbers come from. Every setting says, including the blank one. */
  why: string;
}

/** THE DEFAULT. Nothing is on, so a thing stands in the air exactly where it is put, with all its math attached. */
export const BLANK: Setting = {
  time: false, gravity: 0, direction: [0, -1, 0],
  why: 'a blank setting: no law is switched on, so every weight is 0 N and nothing advances',
};

/** One setting that is switched on, for comparison against the blank one. */
export const EARTH: Setting = {
  time: true, gravity: 9.80665, direction: [0, -1, 0],
  why: "standard gravity at the Earth's surface (CGPM 1901, 3rd conference) — the setting's, not the stuff's: every material in it is given the same, which is what the Eötvös experiments measure",
};

/** A law switched on or off, as a new setting: the old one is never mutated, so a round can hold both and compare. */
export function switched(s: Setting, law: 'time' | 'gravity', on: boolean): Setting {
  if (law === 'time') return { ...s, time: on, why: `${s.why}; time switched ${on ? 'on' : 'off'}` };
  const g = on ? EARTH.gravity : 0;
  return { ...s, gravity: g, why: on ? EARTH.why : BLANK.why };
}

/** Whether anything in this setting can advance. Nothing to step is not a still world; it is no clock. */
export const advances = (s: Setting): boolean => s.time;

/** The setting's own leaves, at the domain's addresses: what a runtime must be given before any place is admitted. */
export function domainLeaves(s: Setting): Contribution[] {
  const o = { class: 'measured' as const, source: s.why, window: 'the setting' };
  return [
    { kind: 'leaf', at: GRAVITY, leaf: leaf('gravity', s.gravity, 'm/s^2', o) },
    ...s.direction.map((x, j) => ({ kind: 'leaf' as const, at: gravityAxis(j), leaf: leaf(`direction of gravity ${'xyz'[j]}`, x, '1', o) })),
  ];
}

/** What a mass weighs in this setting, and whether anything need bear it. The arithmetic IS the test: a weight of
 *  0 N is borne by nothing because there is nothing to bear, so no surface under it is implied by any law. */
export function borne(s: Setting, massKg: number): { newtons: number; needsBearing: boolean; says: string } {
  const N = massKg * s.gravity;
  return { newtons: N, needsBearing: N > 0,
    says: N > 0
      ? `${massKg.toFixed(3)} kg weighs ${N.toFixed(3)} N here, so something must bear it: a surface under it is implied by the law`
      : `${massKg.toFixed(3)} kg weighs 0 N here, so nothing need bear it — it stays where it is put, and no floor, table or bench is implied by anything` };
}

/** THE ROOM, DERIVED. One implication per law, from its state alone: what the setting being this way forces the
 *  room to have, and what it leaves with no ground. Nothing here is a list of furniture; a round reads it and the
 *  room follows, which is the opposite of drawing a room and hoping the laws agree. */
export function impliedRoom(s: Setting): { law: string; on: boolean; room: string }[] {
  return [
    { law: 'gravity', on: s.gravity > 0,
      room: s.gravity > 0
        ? `every thing has a weight of m × ${s.gravity} N, so anything at rest is borne by something and a surface under it is implied; what is not borne falls`
        : 'nothing weighs anything, so nothing is borne, nothing falls and no surface is implied: a thing stands in the air where it is put' },
    { law: 'time', on: s.time,
      room: s.time
        ? 'what is not in balance moves, and where it comes to rest is measured rather than asserted'
        : 'nothing advances: every quantity is attached to every thing and not one of them is computed' },
  ];
}

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
