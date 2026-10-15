// OWNS: THE ONE LAW — proper time — and the one tree that every other "law" hangs from as a sensor.
//
// THE REFRAME, in the user's words (2026-10-15): "there should be no laws just sensors ... one universal law that
// governs the environment ... the universal law is time, everything is time interacting with itself ... all the
// laws you made need to be turned into math that functionally branches up to time", and then (2026-10-15, after
// measuring): "merge all systems delete the others all make all sensors map to time these are not to be seperate
// systems ... if sensorys/laws are missing to connect a sensory/law to time then creat branches of time and its
// different categories and then more branches of them sub categories and so on".
//
// THIS FILE IS THAT ONE SYSTEM. Before Run 8i it was two: `substrate/lawgraph.ts` held the graph and could not see
// this file at all — `node tools/unwired.mjs path substrate/lawgraph substrate/time` answered "Neither reaches the
// other. They are two islands". lawgraph.ts is now DELETED. Its hand-written knowledge went to
// `book/principles.ts` (what a law rests on, which law becomes which — the two things units cannot derive) and its
// value-applying half to `substrate/record.ts` (a different verb: running a law on numbers). What is left is one
// system with one root, and everything below is derived from the dimensions rather than written down.
//
// WHAT IS ESTABLISHED PHYSICS, and is therefore built here as fact:
//
//   1. c IS NOT A SPEED. It is the conversion factor between a metre and a second. The interval
//      dτ² = dt² − (dx² + dy² + dz²)/c² is the one quantity every observer agrees on; t and x are not.
//   2. PROPER TIME IS THE INVARIANT. Every worldline is parameterised by its own τ. Coordinate time is a
//      bookkeeping choice; τ is what the thing itself experiences, and it is the only frame-free fact about it.
//   3. EVERYTHING MOVES THROUGH SPACETIME AT EXACTLY c, ALWAYS. The four-velocity has constant magnitude c.
//      Standing still is spending all of it on time. Going faster spends some of it on space INSTEAD, which is
//      why the clock slows — not a side effect, the same motion seen in a different direction.
//   4. AT c, PROPER TIME IS EXACTLY ZERO. A photon's worldline has dτ = 0. Time does not merely slow; it stops.
//   5. ENERGY IS THE CONSERVED QUANTITY OF TIME. Noether: conservation of energy follows from the action being
//      unchanged under a shift in time, and from nothing else. "Everything branches up to time" is, for every
//      conservation law in the book, a theorem.
//
// WHAT IS THE USER'S AXIOM, held here because they established it, not because physics derives it: that time is
// the single generative thing and space, matter and self are modes of it. Relativity makes space and time ONE
// manifold, but not the same: the minus sign in dτ² is why a timelike interval cannot be rotated into a spacelike
// one, and causality rests on that sign. This file keeps the sign, so it is honest, and takes time as the one
// coordinate everything is expressed in, which is theirs.
//
// WHAT THAT BUYS, and it is not rhetoric — it is computed below from the book's own 252 laws: with c, ħ, k_B and
// the Coulomb constant taken as one, EVERY dimension is a power of time. A metre is time. A kilogram is inverse
// time. A SPEED IS DIMENSIONLESS — there is no such thing as a speed, only a fraction of c, an angle in spacetime.
// Action is dimensionless too, counted in ħ. Each of the 252 laws lands on an integer power of time, and
// `npm run substrate -- time` prints the whole tree.
//
// THE FIVE LEVELS, each derived, none written down:
//
//   TIME                the root, and the only law
//     └ time^n          THE TRUNK. What kind of quantity a law gives, in time's own terms. `inTime` below, exact.
//        └ SI limb      THE LIMB. The dimension before reduction — exactly the information the reduction
//                       destroys, because in natural units a speed and an action are the same thing (both time^0)
//                       and in SI they are not. Several limbs share one trunk; this is which one.
//           └ shape     THE TWIG. The kind of math: a product of powers, an exponential, a logarithm, a sum.
//                       Read off the law's own term by `shapeOf`, so two laws of different fields with one shape
//                       sit on one twig — which is the point.
//              └ law    THE LEAF. The sensor itself.
//
// AND ACROSS THE TREE, not down it: the FEED GRAPH. Law A can feed law B when A's output dimension fills one of
// B's input ports. That is 7,949 edges over 252 laws, every one derived here from the dimensions — against the 27
// that were written by hand, of which 16 turned out not to be feeds at all. `calculate` walks that graph and actually
// RUNS the chain, which is the thing that was missing: `routes` used to find a chain and nothing ever evaluated it.

import { BOOK, lawById } from '../book';
import { CONST } from '../book/constants';
import { KINSHIP, principlesOf } from '../book/principles';
import { DIMLESS, dimOf, dimText, integerNullSpace, sameDim, type Dim } from '../lang/dimension';
import { evaluate, ofLeaf, type Derivation } from '../lang/evaluate';
import type { Law, Port } from '../lang/law';
import { leaf } from '../lang/term';

import { families, monomial, readable, shapeOf, step } from './record';

/** The conversion between a metre and a second. Exact by definition since the 2019 SI revision. */
export const LIGHT = CONST.c.value as number;

/* ──────────────────────────────────────────────────── the one law ─────────────────────────────────────────── */
/* ──────────────────────────────────────────────────── the one law ─────────────────────────────────────────── */

/** A thing, as the only thing it really is: its own time, where it is, and how it is moving. Nothing else about a
 *  worldline is frame-free — two observers disagree about its position and about the hour, and agree about `tau`. */
export interface Worldline {
  id: string;
  /** ITS OWN TIME, s. The one invariant. */ tau: number;
  /** where it is, in the domain's coordinates, m */ at: [number, number, number];
  /** how it is moving through space, m/s */ through: [number, number, number];
}

export const speedOf = (w: Worldline): number => Math.hypot(...w.through);

/** THE LAW. How fast a thing moves through time: dτ/dt = √(1 − v²/c²). Everything else in this file is a reading
 *  of a state this rule advanced. At rest it is 1 — a second of the world is a second of yours. At c it is 0. */
export function rate(speed: number): number {
  const b = speed / LIGHT;
  if (b > 1) throw new RangeError(`${speed} m/s is past c: no worldline goes there, and no rate exists for it`);
  return Math.sqrt(Math.max(0, 1 - b * b));
}

/** THE INVARIANT, as a number you can check: how the one motion is split between time and space. Its magnitude is
 *  c for everything, always — a thing at rest is not still, it is going through time at the speed of light. */
export function spacetimeSplit(w: Worldline): { throughTime: number; throughSpace: number; magnitude: number; says: string } {
  // v² + (c·dτ/dt)² = c², exactly: c²/γ² = c²(1 − β²) = c² − v². A Pythagoras, and it is the whole content of
  // "everything moves through spacetime at c" — speed through space and speed through time are the two legs, and
  // the hypotenuse is c for everything that exists, at every speed, with no exceptions and nothing tuned.
  const v = speedOf(w), g = rate(v);
  const throughTime = g * LIGHT, throughSpace = v;
  const magnitude = Math.hypot(throughTime, throughSpace);
  return { throughTime, throughSpace, magnitude,
    says: v === 0
      ? `at rest, so all of its motion is through time: ${(throughTime / LIGHT * 100).toFixed(4)}% of c spent on the clock and none on space`
      : `${(v / LIGHT * 100).toPrecision(3)}% of c through space, so only ${(g * 100).toFixed(6)}% of its motion is left for the clock` };
}

/** Advance a set of worldlines by `dt` of the domain's coordinate time. Each one's OWN time advances by its own
 *  rate, so they come apart: that is the whole of what this engine does to a state, and nothing else writes. */
export function elapse(ws: readonly Worldline[], dt: number): Worldline[] {
  return ws.map((w) => ({ ...w,
    tau: w.tau + rate(speedOf(w)) * dt,
    at: [w.at[0] + w.through[0] * dt, w.at[1] + w.through[1] * dt, w.at[2] + w.through[2] * dt] as [number, number, number] }));
}

/** What two worldlines disagree about after sharing a stretch of coordinate time: the twin paradox as a number. */
export function apart(a: Worldline, b: Worldline): { drift: number; says: string } {
  const drift = a.tau - b.tau;
  return { drift, says: Math.abs(drift) < 1e-12
    ? `${a.id} and ${b.id} have lived the same time`
    : `${drift > 0 ? a.id : b.id} has lived ${Math.abs(drift).toPrecision(4)} s longer: they did not travel the same way through time` };
}

/* ───────────────────────────────────── everything, as a power of time ─────────────────────────────────────── */
/** The four conversions that take an SI dimension to a power of time. Each one is a constant set to 1 — which is
 *  not a trick: it is what the constant IS, a statement that two units measure the same thing. */
export const CONVERSIONS = [
  { by: 'c', sets: 'a metre is a second', what: 'length', power: 1, src: 'c = 299 792 458 m/s, exact by definition (SI 2019): the metre is DEFINED by the second and c' },
  { by: 'ħ', sets: 'a kilogram is an inverse second', what: 'mass', power: -1, src: 'E = ħω: with c already fixing length, ħ fixes mass against time' },
  { by: 'k_B', sets: 'a kelvin is an inverse second', what: 'temperature', power: -1, src: 'E = k_B T: temperature IS an energy, and energy is an inverse time' },
  { by: '4πε₀', sets: 'an ampere is an inverse second', what: 'current', power: -1, src: 'Gaussian units: the Coulomb constant set to 1 fixes charge against the rest' },
] as const;

/** THE REDUCTION. Any dimension as the power of time it is, once c, ħ, k_B and the Coulomb constant are one.
 *  Dim is [kg, m, s, A, K], so this is −kg + m + s − A − K. */
export const inTime = (d: Dim): number => -d[0] + d[1] + d[2] - d[3] - d[4];

/** A unit said as what it is in time, with the check anyone can do by hand. */
export function asTime(unit: string): { power: number; si: string; says: string } {
  const d = dimOf(unit), p = inTime(d);
  const n = p === 0 ? 'a pure number' : p === 1 ? 'a time' : p === -1 ? 'a rate' : `time^${p}`;
  return { power: p, si: dimText(d),
    says: `${unit} is ${dimText(d)}, which is ${n}${p === 0 ? ' — it has no units at all once c and ħ are one' : ''}` };
}

/** The amount of substance a unit carries. The units keep the mole dimensionless, and that is the ONE honest limit
 *  of the reduction: c, ħ and k_B convert between physical dimensions, but a mole is a COUNT, and Avogadro's number
 *  is a definition rather than a conversion. A law carrying moles reduces to a power of time only up to that count,
 *  and `timeTree().carriesACount` names every one rather than hiding it. */
export function molesOf(unit: string): number {
  const [top, ...under] = unit.split('/'), count = (s: string) => [...s.matchAll(/\bmol(?:\^(-?\d+))?\b/g)].reduce((a, m) => a + Number(m[1] ?? 1), 0);
  return count(top ?? '') - under.reduce((a, s) => a + count(s), 0);
}
const dim6 = (unit: string): number[] => [...dimOf(unit), molesOf(unit)];

/* ──────────────────────────────── the tree: time, and every sensor hanging from it ─────────────────────────── */

/** The power of time a law gives: its output reduced through c, ħ, k_B and 4πε₀. A speed is 0 — dimensionless. */
export const timePower = (l: Law): number => inTime(dimOf(l.output.unit));

/** What a power of time IS, in words, so the trunk reads as something rather than as an exponent. */
export function powerName(p: number): string {
  const known: Record<number, string> = {
    4: 'a time to the fourth — a second moment of area, the stiffest thing geometry gives',
    3: 'a time cubed — a volume',
    2: 'a time squared — an area',
    1: 'a time — a length, a duration, a distance through either',
    0: 'a pure number — a speed, an action, a ratio: nothing at all once c and ħ are one',
    [-1]: 'an inverse time — a rate, a mass, a temperature, an energy',
    [-2]: 'an inverse time squared — a force, a pressure times a length',
    [-3]: 'an inverse time cubed — a power, an energy a second',
    [-4]: 'an inverse time to the fourth — an intensity, a power a length',
  };
  return known[p] ?? `time^${p}`;
}

export interface Twig { shape: string; laws: { id: string; name: string; unit: string }[] }
export interface Limb { si: string; units: string[]; moles: number; twigs: Twig[]; laws: number }
export interface Trunk { power: number; name: string; limbs: Limb[]; laws: number }
export interface Tree {
  root: 'time'; laws: number; trunks: Trunk[];
  /** laws whose unit carries a mole, so they reduce only up to a count of particles — the reduction's one limit */
  carriesACount: string[];
  says: string[];
}

/** THE WHOLE BOOK AS ONE TREE ROOTED IN TIME. Four derived levels under the root: the power of time, the SI face
 *  that power came from, the shape of the math, the law. Nothing in here is a written-down category — every level
 *  is read off the law's own output unit or its own term, so a law added to the book places itself. */
export function timeTree(laws: readonly Law[] = BOOK): Tree {
  const byPower = new Map<number, Map<string, { units: Set<string>; moles: number; byShape: Map<string, Law[]> }>>();
  const carriesACount: string[] = [];
  for (const l of laws) {
    const p = timePower(l), si = dimText(dimOf(l.output.unit)), m = molesOf(l.output.unit);
    if (m !== 0) carriesACount.push(l.id);
    const limbs = byPower.get(p) ?? byPower.set(p, new Map()).get(p)!;
    const face = limbs.get(si) ?? limbs.set(si, { units: new Set(), moles: m, byShape: new Map() }).get(si)!;
    face.units.add(l.output.unit);
    const sh = shapeOf(l);
    face.byShape.set(sh, [...(face.byShape.get(sh) ?? []), l]);
  }
  const trunks: Trunk[] = [...byPower.entries()].sort((a, b) => b[0] - a[0]).map(([power, limbs]) => {
    const fs: Limb[] = [...limbs.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([si, f]) => ({
      si, units: [...f.units].sort(), moles: f.moles,
      twigs: [...f.byShape.entries()].sort((a, b) => b[1].length - a[1].length).map(([shape, ls]) => ({
        shape, laws: ls.map((l) => ({ id: l.id, name: l.name, unit: l.output.unit })).sort((a, b) => a.id.localeCompare(b.id)) })),
      laws: [...f.byShape.values()].reduce((n, ls) => n + ls.length, 0) }));
    return { power, name: powerName(power), limbs: fs, laws: fs.reduce((n, f) => n + f.laws, 0) };
  });
  const hi = trunks[0]?.power ?? 0, lo = trunks[trunks.length - 1]?.power ?? 0;
  return { root: 'time', laws: laws.length, trunks, carriesACount,
    says: [
      `${laws.length} sensors on one root. Every one reduces to a power of time between ${lo} and ${hi}, by c, ħ, k_B and 4πε₀ alone.`,
      `${trunks.length} trunks (powers of time), ${trunks.reduce((n, t) => n + t.limbs.length, 0)} limbs (SI dimensions), ${trunks.reduce((n, t) => n + t.limbs.reduce((m, f) => m + f.twigs.length, 0), 0)} twigs (shapes of math).`,
      carriesACount.length
        ? `${carriesACount.length} carry a mole, so they reduce only up to a count of particles: a mole is a count, not a dimension, and no constant converts it.`
        : 'No law carries a mole: the reduction is total.',
    ] };
}

/** Where ONE law sits: the path from time down to it, which is the answer to "how does this sensor map to time". */
export function placeOf(l: Law): { path: string[]; power: number; says: string } {
  const p = timePower(l), si = dimText(dimOf(l.output.unit)), sh = shapeOf(l), m = molesOf(l.output.unit);
  const path = ['time', `time^${p}`, si, sh, l.id];
  return { path, power: p,
    says: `${path.join(' → ')}${m !== 0 ? `  (and a count of ${m > 0 ? '' : '1/'}mol^${Math.abs(m)}, which time cannot absorb)` : ''}` };
}

/** The tree as lines, deepest last, for `npm run substrate -- time`. */
export function timeTreeLines(t: Tree = timeTree(), mostPerTwig = 3): string[] {
  const out = ['TIME — the one law', ...t.says.map((s) => `  ${s}`), ''];
  for (const tr of t.trunks) {
    out.push(`time^${tr.power} · ${tr.laws} sensor${tr.laws === 1 ? '' : 's'} · ${tr.name}`);
    for (const f of tr.limbs) {
      out.push(`   ${f.si}${f.moles ? ` · mol^${f.moles}` : ''} · ${f.laws} · as ${f.units.slice(0, 3).join(', ')}`);
      for (const w of f.twigs) out.push(`      ${w.shape}: ${w.laws.slice(0, mostPerTwig).map((l) => l.id).join(', ')}${w.laws.length > mostPerTwig ? ` (+${w.laws.length - mostPerTwig})` : ''}`);
    }
  }
  return out;
}

/** Every law in the book as the power of time it gives: the trunks alone, which is the level-1 slice of the tree. */
export function bookInTime(laws: readonly Law[] = BOOK): { power: number; laws: { id: string; name: string; unit: string }[] }[] {
  return timeTree(laws).trunks.map((t) => ({ power: t.power,
    laws: t.limbs.flatMap((f) => f.twigs.flatMap((w) => w.laws)).sort((a, b) => a.name.localeCompare(b.name)) }));
}

/* ─────────────────────────────────────── a law, demoted to a sensor ───────────────────────────────────────── */
/* ─────────────────────────────────────── a law, demoted to a sensor ───────────────────────────────────────── */

/** WHAT A LAW BECOMES WHEN IT IS NOT ONE. A reading: a number got from a state, at a time, by a answersToPort instrument.
 *  It has no address and writes nothing. The difference from a relation is the whole reframe — a relation BINDS an
 *  address, so the state is defined by the laws; a reading only looks, so the state is defined by time alone and
 *  the readings explain it. */
export interface Reading {
  /** the law the instrument is made of — it keeps its citation, because an instrument is only as good as its basis */
  instrument: string; name: string;
  value: number | null; unit: string;
  /** the power of time it reads in */ power: number;
  /** WHOSE time this reading was taken at, s — a reading with no clock behind it is not a measurement */ tau: number;
  /** a domain the law refused: the instrument is out of its range, which is a fact about the instrument */ refused: string | null;
  cites: string;
  says: string;
}

/** Take a reading. The law supplies the maths and the citation; it supplies no authority. Nothing here can write:
 *  it is given plain numbers and returns a Reading, and the test that matters is that a state is unchanged after
 *  every instrument in the book has been run over it. */
export function sense(law: Law, at: Record<string, number>, tau: number): Reading {
  // 'measured' is the right origin for a reading: an instrument reporting what it saw, with when it saw it. That
  // is a different kind of fact from a law's own constants, and the derivation keeps the difference.
  // An input that was not given is not a zero and not a NaN: it is an absence, and `lang/` has a class for exactly
  // that. Passing NaN here threw — correctly — because a leaf must be a number or declare itself to have none.
  const env = Object.fromEntries(law.inputs.map((p) => [p.sym, ofLeaf(
    at[p.sym] === undefined || !Number.isFinite(at[p.sym])
      ? leaf(p.name, null, p.unit, { class: 'unknown' })
      : leaf(p.name, at[p.sym]!, p.unit, { class: 'measured', source: `read at tau = ${tau} s` }))]));
  let value: number | null = null, refused: string | null = null;
  try {
    const d = evaluate(law.name, law.term, env, { law: law.hash, domain: [...law.domain], unit: law.output.unit });
    value = d.value;
    refused = d.refusal ? d.refusal.domain : null;
  } catch (e) { refused = e instanceof Error ? e.message : String(e); }
  const power = inTime(dimOf(law.output.unit));
  return { instrument: law.id, name: law.name, value, unit: law.output.unit, power, tau, refused, cites: law.source.cite,
    says: refused
      ? `${law.name} will not read here: ${refused}. That is a fact about the instrument's range, not about the world.`
      : value === null
        ? `${law.name} had nothing to read: an input it needs was not given.`
        : `${law.name} reads ${value.toPrecision(6)} ${law.output.unit} (time^${power}) at tau = ${tau} s.` };
}

/** Every instrument that can read this state: the book turned on a set of numbers, each one explaining and none
 *  of them governing. What it cannot read, it says so by name rather than being absent. */
export function readAll(at: Record<string, number>, tau: number, laws: readonly Law[] = BOOK): Reading[] {
  const have = new Set(Object.keys(at));
  return laws.filter((l) => l.inputs.every((p) => have.has(p.sym))).map((l) => sense(l, at, tau));
}

/* ────────────────────────────── across the tree: who can feed whom, derived ────────────────────────────────── */

/** Can `a` feed `b`? The port of `b` that `a`'s output fills, by dimension; null when none does. This single
 *  predicate is the whole cross-connection: 7,949 edges over the book, none of them written by hand. */
export function feeds(a: Law, b: Law): Port | null {
  if (a.id === b.id) return null;
  const d = dimOf(a.output.unit);
  return b.inputs.find((p) => sameDim(dimOf(p.unit), d)) ?? null;
}

export interface Edge { from: string; to: string; port: string; unit: string; power: number }

/** THE FEED GRAPH. Every derived edge, with the port it lands on and the power of time that travels along it. */
export function feedEdges(laws: readonly Law[] = BOOK): Edge[] {
  const out: Edge[] = [];
  for (const a of laws) for (const b of laws) {
    const p = feeds(a, b);
    if (p) out.push({ from: a.id, to: b.id, port: p.sym, unit: a.output.unit, power: inTime(dimOf(a.output.unit)) });
  }
  return out;
}

/** What this law can feed, and what can feed it. The two neighbourhoods of a sensor in the derived graph. */
export const downstream = (id: string, laws: readonly Law[] = BOOK): string[] =>
  laws.filter((b) => feeds(lawById(id), b)).map((b) => b.id);
export const upstream = (id: string, laws: readonly Law[] = BOOK): string[] =>
  laws.filter((a) => feeds(a, lawById(id))).map((a) => a.id);

/** Of each hand-written kinship edge, whether the dimensions ALSO make it a feed. Run 8h measured this and found
 *  16 of 27 are not feeds: they are "this law becomes that law", which is why `book/principles.ts` keeps them by
 *  hand and why they are not the same relation as the graph above. This is the check that keeps the two apart. */
export function kinshipFeeds(): { from: string; to: string; how: string; alsoFeeds: boolean; says: string }[] {
  return KINSHIP.map(([from, to, how]) => {
    const a = lawById(from), b = lawById(to), p = feeds(a, b);
    return { from, to, how, alsoFeeds: !!p,
      says: p
        ? `${from} → ${to}: kinship, and the dimensions agree — its ${a.output.unit} lands on ${to}'s ${p.sym}`
        : `${from} → ${to}: kinship only — ${from} gives a ${a.output.unit} and ${to} takes none, so this is a derivation, not a feed` };
  });
}

/* ─────────────────────────────────────── the calculator: run the chain ────────────────────────────────────── */

export interface Reached {
  got: Derivation | null;
  /** each law fired, in order, with what it gave and WHAT IT BOUND TO WHAT */
  chain: { law: string; gives: string; unit: string; power: number; bound: { port: string; from: string; byName: boolean }[] }[];
  /** why it stopped, when it did not get there */ refused: string | null;
  /** ports filled by something of the right dimension but the wrong name: read these before trusting the number */
  stretched: string[];
  says: string;
}

/** Pooled in the pool: a quantity by a name, with the record carrying its value, and how many laws deep it was found. */
export interface Pooled { name: string; d: Derivation; steps: number }

/** TRY TO BIND EVERY PORT OF A LAW against what is held. The one binder, used by `calculate` and by `observe`, so
 *  the rules about what may fill a port live in exactly one place. Returns the binding, or why it cannot be made. */
function bindPorts(l: Law, pool: readonly Pooled[], stretch = true) {
  const env: Record<string, Derivation> = {};
  const bound: { port: string; from: string; byName: boolean }[] = [];
  let steps = 0;
  for (const p of l.inputs) {
    const bare = sameDim(dimOf(p.unit), DIMLESS) && molesOf(p.unit) === 0;
    const sameDimension = pool.filter((x) => x.d.value !== null && sameDim(x.d.dim, dimOf(p.unit)));
    const byName = sameDimension.filter((x) => answersToPort(x, p));
    // `stretch` is what separates a targeted calculation from an observation. Asked for one specific quantity, a
    // binding of the right dimension under another name is worth offering with a warning. Asked what can be known
    // about a thing, it is worth nothing: 28 of 32 findings came back stretched on the first run — "read pitch as
    // its wavelength", "read pitch as its height" — and the four real ones were buried in them.
    const hits = bare || !stretch ? byName : (byName.length ? byName : sameDimension);
    if (!hits.length) return { ok: false as const, why: null };
    if (new Set(hits.map((h) => h.d.value)).size > 1) return { ok: false as const,
      why: `${l.id} wants ${p.name} (${p.unit}) and ${hits.length} of what you have could be it — ${hits.map((h) => h.name).join(', ')} — with different values. Name which one, rather than have it pick.` };
    env[p.sym] = hits[0]!.d;
    steps = Math.max(steps, hits[0]!.steps);
    bound.push({ port: p.name, from: hits[0]!.name, byName: answersToPort(hits[0]!, p) });
  }
  return { ok: true as const, env, bound, steps, agree: bound.filter((b) => b.byName).length };
}

/** Does this quantity answer to that port's name? The one name test, used by the binder and by the
 *  resolver in `derive.ts`, so what counts as "the same quantity" is decided in exactly one place. */
export const answersToPort = (x: { name: string; d: { name: string } }, p: { name: string; sym: string }): boolean => {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const a = norm(x.name), b = norm(p.name), sym = norm(p.sym);
  return a === b || a === sym || norm(x.d.name) === b || b.includes(a) || a.includes(b);
};

/** THE LAW CALCULATOR. Given what you have, as records, get what you want — by walking the derived feed graph and
 *  actually RUNNING each law through `step`, so the answer comes back as a Derivation whose `breakdown` reads the
 *  whole tree down to every measurement. This is the join that was missing: a chain used to be found and never
 *  evaluated.
 *
 *  DIMENSION IS NOT IDENTITY, and this is the thing to understand before trusting any number out of here. A chain
 *  pitch and a pendulum length are both `m`, so a search that binds by dimension alone will happily read one as the
 *  other and hand back an "impact speed" computed from a sprocket. The maths is right and the physics is nonsense.
 *  Three things are done about it, none of them a guess:
 *
 *    1. A DIMENSIONLESS PORT IS NEVER BOUND BY DIMENSION. Every ratio in the book is `-` — a Froude number, an
 *       efficiency, a count of teeth — and they are not interchangeable at all. Such a port binds only to something
 *       NAMED for it, and otherwise the law simply does not fire.
 *    2. A BINDING WHOSE NAMES AGREE IS PREFERRED. Where several laws could fire, the one whose ports are filled by
 *       quantities actually called that wins, so the sensible chain beats the dimensional coincidence.
 *    3. WHAT WAS STRETCHED IS REPORTED. Every port filled by the right dimension under a different name is listed in
 *       `stretched` and answersToPort in `says`. A number whose chain stretched something is not wrong, it is unverified,
 *       and the caller is told which binding to check rather than left to assume.
 *
 *  AND IT WILL NOT GUESS between two records that could both fill one port and disagree: it stops and names them.
 *  Binding the wrong temperature is exactly the silent error that poisons every number downstream of it. */
export function calculate(target: string, given: Record<string, Derivation>, laws: readonly Law[] = BOOK, mostSteps = 6): Reached {
  const want = dimOf(target);
  const pool: Pooled[] = Object.entries(given).map(([name, d]) => ({ name, d, steps: 0 }));
  const chain: Reached['chain'] = [];
  const fired = new Set<string>();
  const done = () => pool.find((x) => sameDim(x.d.dim, want) && x.d.value !== null);
  let ambiguous: string | null = null;

  for (let round = 0; round < mostSteps; round++) {
    const there = done();
    if (there) break;
    // Every law that COULD fire this round, best binding first: one that reaches the target, then one whose names
    // agree most, then the simplest. Firing the first merely-dimensionally-valid law is how a sprocket became a
    // pendulum; ranking is what makes the sensible chain win when one exists.
    const ready: { l: Law; env: Record<string, Derivation>; bound: { port: string; from: string; byName: boolean }[]; agree: number }[] = [];
    for (const l of laws) {
      if (fired.has(l.id)) continue;
      const b = bindPorts(l, pool);
      if (!b.ok) { if (b.why) ambiguous ??= b.why; continue; }
      ready.push({ l, env: b.env, bound: b.bound, agree: b.agree });
    }
    if (!ready.length) break;
    ready.sort((a, b) =>
      Number(sameDim(dimOf(b.l.output.unit), want)) - Number(sameDim(dimOf(a.l.output.unit), want))
      || b.agree - a.agree
      || a.l.inputs.length - b.l.inputs.length);
    let moved = false;
    for (const r of ready) {
      fired.add(r.l.id);
      let got: Derivation;
      try { got = step(r.l.id, r.env); } catch { continue; }
      if (got.value === null) continue;
      pool.push({ name: r.l.output.name, d: got, steps: chain.length + 1 });
      chain.push({ law: r.l.id, gives: r.l.output.name, unit: r.l.output.unit, power: timePower(r.l), bound: r.bound });
      moved = true;
      break;
    }
    if (!moved) break;
  }

  const stretched = chain.flatMap((c) => c.bound.filter((b) => !b.byName).map((b) => `${c.law} read "${b.from}" as its ${b.port}`));
  const there = done();
  if (there) {
    const how = chain.length
      ? `${target} in ${chain.length} step${chain.length === 1 ? '' : 's'}: ${chain.map((c) => c.law).join(' → ')}`
      : `${target} was already given — no law needed`;
    return { got: there.d, chain, refused: null, stretched,
      says: stretched.length ? `${how}. CHECK THESE BINDINGS: ${stretched.join('; ')} — right dimension, different name.` : how };
  }
  const none = `no chain of at most ${mostSteps} laws in the book makes a ${target} from what was given (${Object.keys(given).join(', ') || 'nothing'})`;
  // Both can be true at once, and reporting only the ambiguity would be a lie about why it stopped: an ambiguity met
  // on some unrelated law along the way is not the reason a target is unreachable.
  const refused = ambiguous ? `${none}. Along the way: ${ambiguous}` : none;
  return { got: null, chain, refused, stretched, says: refused };
}

/* ───────────────────────────── the branches that are NOT there, and the laws units force ──────────────────── */

/** Rayleigh's method: the product of powers the units of these quantities allow for the output, when they allow one;
 *  otherwise the dimensionless groups the answer is some function of. */
export function discover(output: [name: string, unit: string], inputs: [name: string, unit: string][]): { forced: boolean; exponents?: Record<string, number>; groups: number[][]; says: string } {
  const dims = [output[1], ...inputs.map(([, u]) => u)].map(dim6), groups = integerNullSpace([0, 1, 2, 3, 4, 5].map((r) => dims.map((d) => d[r]!)), dims.length);
  const withOut = groups.filter((g) => g[0] !== 0);
  if (groups.length === 1 && withOut.length === 1) {
    const g = withOut[0]!, exponents = Object.fromEntries(inputs.map(([n], i) => [n, -g[i + 1]! / g[0]!]));
    const terms = Object.entries(exponents).filter(([, e]) => e !== 0).map(([n, e]) => (e === 1 ? n : `${n}^${+e.toFixed(3)}`));
    return { forced: true, exponents, groups, says: `${output[0]} ∝ ${terms.join(' × ')}: the only product of powers their units allow (a constant is all that is left to measure)` };
  }
  return { forced: false, groups, says: groups.length ? `${groups.length} dimensionless groups: the answer is a function of them that units alone cannot give` : 'their units make no dimensionless group: there is no law among only these' };
}

/** Of a law in the book: whether its exponents are what its units force (so only its constant carries information), what
 *  units leave open, or (a fault) what units forbid. Its constants with units (R, F, g) count as quantities. */
export function forcedByUnits(l: Law): { verdict: 'forced' | 'open' | 'not a product of powers' | 'contradicts its units'; says: string } {
  const m = monomial(l.term); if (!m) return { verdict: 'not a product of powers', says: `${shapeOf(l)}: its shape comes from more than units` };
  const syms = Object.keys(m.e).filter((s) => Math.abs(m.e[s]!) > 1e-12);
  const ports = syms.map((s) => l.inputs.find((p) => p.sym === s)!);
  const free = ports.filter((p) => dim6(p.unit).every((x) => x === 0));
  const consts = m.k.filter((x) => Math.abs(x.e) > 1e-12);
  const qs: [string, string, number][] = [...ports.filter((p) => !free.includes(p)).map((p) => [p.sym, p.unit, m.e[p.sym]!] as [string, string, number]), ...consts.map((x) => [x.name, x.unit, x.e] as [string, string, number])];
  const d = discover([l.output.name, l.output.unit], qs.map(([n, u]) => [n, u]));
  if (!d.forced) return { verdict: 'open', says: free.length ? `${free.map((p) => p.name).join(', ')} ${free.length > 1 ? 'are' : 'is'} dimensionless: its exponent is the physics, not the units` : d.says };
  for (const [n, , e] of qs) if (Math.abs((d.exponents![n] ?? 0) - e) > 1e-9) return { verdict: 'contradicts its units', says: `${n}: units force ${d.exponents![n]}, the law has ${e}` };
  return { verdict: free.length ? 'open' : 'forced', says: free.length ? `its dimensional part is forced; ${free.map((p) => p.name).join(', ')} carry the rest` : `forced: ${d.says.split(':')[0]} — its constant ${readable(m.c)} is all it adds` };
}
export interface Branch {
  kind: 'needs what nothing gives' | 'gives what nothing needs' | 'no power of time' | 'alone';
  /** the unit or the law the finding is about */ at: string;
  /** who is affected */ laws: string[];
  /** where units alone can write the missing law, the law they force */ forced?: string;
  says: string;
}

/** THE BRANCHES THAT ARE NOT THERE. Four kinds, each a fact about the graph rather than an opinion about it:
 *
 *   needs what nothing gives   a law reads a dimension no law in the book produces. It can only ever be measured,
 *                              never derived — which is right for a material property and wrong for a quantity
 *                              that has a law somewhere in the world.
 *   gives what nothing needs   a law produces a dimension no other law consumes. The book stops there.
 *   no power of time           a power between the lowest and the highest with no law at all: a hole in the trunk.
 *   alone                      a law whose output feeds nothing and whose inputs are fed by nothing.
 *
 * Where a gap is an output nothing gives, `discover` is asked whether the book's own quantities force a law for it
 * by units alone (Rayleigh, Buckingham π). When they do, the missing law is written out rather than only answersToPort. */
export function branches(laws: readonly Law[] = BOOK): Branch[] {
  const out: Branch[] = [];
  const gives = (d: Dim) => laws.filter((l) => sameDim(dimOf(l.output.unit), d));
  const needs = (d: Dim) => laws.filter((l) => l.inputs.some((p) => sameDim(dimOf(p.unit), d)));

  const seenIn = new Map<string, { unit: string; dim: Dim; by: string[] }>();
  const seenOut = new Map<string, { unit: string; dim: Dim; by: string[] }>();
  for (const l of laws) {
    for (const p of l.inputs) { const k = dimText(dimOf(p.unit)); (seenIn.get(k) ?? seenIn.set(k, { unit: p.unit, dim: dimOf(p.unit), by: [] }).get(k)!).by.push(l.id); }
    const k = dimText(dimOf(l.output.unit)); (seenOut.get(k) ?? seenOut.set(k, { unit: l.output.unit, dim: dimOf(l.output.unit), by: [] }).get(k)!).by.push(l.id);
  }

  for (const [k, v] of seenIn) {
    if (gives(v.dim).length) continue;
    // can units alone write it? ask with the quantities the laws that WANT it already have beside it
    const wanters = v.by.slice(0, 4).map((id) => lawById(id));
    const beside = new Map<string, [string, string]>();
    for (const w of wanters) for (const p of w.inputs) if (!sameDim(dimOf(p.unit), v.dim)) beside.set(p.unit, [p.name, p.unit]);
    const pool = [...beside.values()].slice(0, 5);
    let forced: string | undefined;
    if (pool.length >= 2) { const d = discover([v.unit, v.unit], pool); if (d.forced) forced = d.says; }
    out.push({ kind: 'needs what nothing gives', at: v.unit, laws: v.by, ...(forced ? { forced } : {}),
      says: `${v.by.length} ${v.by.length === 1 ? 'law reads' : 'laws read'} a ${k} (${v.unit}) and no law in the book produces one: it can only be measured.${forced ? ` Units alone force a candidate: ${forced}` : ''}` });
  }
  for (const [k, v] of seenOut) {
    if (needs(v.dim).length) continue;
    out.push({ kind: 'gives what nothing needs', at: v.unit, laws: v.by,
      says: `${v.by.length} ${v.by.length === 1 ? 'law gives' : 'laws give'} a ${k} (${v.unit}) and nothing in the book reads one: the chain ends there.` });
  }
  const trunks = timeTree(laws).trunks, hi = trunks[0]?.power ?? 0, lo = trunks[trunks.length - 1]?.power ?? 0;
  const have = new Set(trunks.map((t) => t.power));
  for (let p = hi; p >= lo; p--) if (!have.has(p)) out.push({ kind: 'no power of time', at: `time^${p}`, laws: [],
    says: `no law gives a time^${p}, though the book reaches past it on both sides: a hole in the trunk.` });
  for (const l of laws) {
    const fedBy = laws.some((o) => feeds(o, l));
    const alsoFeeds = laws.some((o) => feeds(l, o));
    if (!fedBy && !alsoFeeds) out.push({ kind: 'alone', at: l.id, laws: [l.id],
      says: `${l.name} takes nothing any law gives and gives nothing any law takes: it stands alone in the graph.` });
  }
  return out;
}

/** The system in numbers: the tree, the derived graph against the written kinship, and what the book lacks. */
export function graphSummary(laws: readonly Law[] = BOOK) {
  const t = timeTree(laws), edges = feedEdges(laws), k = kinshipFeeds(), b = branches(laws);
  const byKind: Record<string, number> = {};
  for (const x of b) byKind[x.kind] = (byKind[x.kind] ?? 0) + 1;
  const units: Record<string, string[]> = {}, byPrinciple: Record<string, string[]> = {};
  for (const l of laws) {
    (units[forcedByUnits(l).verdict] ??= []).push(l.id);
    const pr = principlesOf(l);
    for (const x of pr === 'unplaced' ? ['unplaced'] : pr) (byPrinciple[x] ??= []).push(l.id);
  }
  return {
    laws: laws.length, trunks: t.trunks.length, byPrinciple, families: families(laws),
    limbs: t.trunks.reduce((n, x) => n + x.limbs.length, 0),
    twigs: t.trunks.reduce((n, x) => n + x.limbs.reduce((m, f) => m + f.twigs.length, 0), 0),
    carriesACount: t.carriesACount.length,
    derivedEdges: edges.length, writtenKinship: k.length, kinshipAlsoFeeds: k.filter((x) => x.alsoFeeds).length,
    units, branches: byKind,
  };
}
