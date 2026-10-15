// OWNS: the one law — proper time — and what every other "law" becomes once it is not one: a sensor.
//
// THE REFRAME, in the user's words (2026-10-15): "there should be no laws just sensors ... one universal law that
// governs the environment ... the universal law is time, everything is time interacting with itself ... all the
// laws you made need to be turned into math that functionally branches up to time."
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
// Action is dimensionless too, counted in ħ. Each of the 252 laws lands on an integer power of time between −4
// and +4, and `npm run substrate -- time` prints which.

import { BOOK } from '../book';
import { CONST } from '../book/constants';
import { dimOf, dimText, type Dim } from '../lang/dimension';
import { evaluate, ofLeaf } from '../lang/evaluate';
import type { Law } from '../lang/law';
import { leaf } from '../lang/term';

/** The conversion between a metre and a second. Exact by definition since the 2019 SI revision. */
export const LIGHT = CONST.c.value as number;

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

/** Every law in the book as the power of time it gives. This is "all the laws branch up to time", computed. */
export function bookInTime(laws: readonly Law[] = BOOK): { power: number; laws: { id: string; name: string; unit: string }[] }[] {
  const by = new Map<number, { id: string; name: string; unit: string }[]>();
  for (const l of laws) {
    const p = inTime(dimOf(l.output.unit));
    (by.get(p) ?? by.set(p, []).get(p)!).push({ id: l.id, name: l.name, unit: l.output.unit });
  }
  return [...by].sort((a, b) => b[0] - a[0]).map(([power, ls]) => ({ power, laws: ls.sort((a, b) => a.name.localeCompare(b.name)) }));
}

/* ─────────────────────────────────────── a law, demoted to a sensor ───────────────────────────────────────── */

/** WHAT A LAW BECOMES WHEN IT IS NOT ONE. A reading: a number got from a state, at a time, by a named instrument.
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
