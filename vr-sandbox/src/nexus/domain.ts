// Domains, fields and the observer's resolution. A domain is a region of space and time in a declared frame with
// the scale bands its description holds in. A field is laws composed over coordinates: a quantity at every point of
// its domain, sampled as a derivation that cites the laws. An observer resolves each axis to a support (what one
// sample averages over; absent, a point) and samples on a lattice; the window is the coarse-graining operator: a
// sample at a resolution is the field's mean over the support cell, uncertain by its variation across the cell,
// and refused when the resolution lies outside the field's scale bands.

import { evaluate, ofLeaf, withUncertainty, type Derivation, type Env } from './evaluate';
import type { Frame } from './field';
import { hashOf } from './identity';
import type { Law } from './law';
import { add, and, div, ge, k, le, mul, neg, substitute, unknown, variable, varsOf, type Term, type Var } from './term';

export type Axis = 'x' | 'y' | 'z' | 't';
export const AXES: readonly Axis[] = ['x', 'y', 'z', 't'];
export const AXIS_UNIT: Record<Axis, string> = { x: 'm', y: 'm', z: 'm', t: 's' };

export interface Interval { lo: Derivation; hi: Derivation }

/** A band of scales the description holds in: a predicate over the observer's supports (dx, dy, dz, dt) and records. */
export interface ScaleBand { says: string; holds: Term; env: Env }

export interface Domain {
  frame: Frame;
  /** Bounded axes; an absent axis is unbounded. */
  extent: Partial<Record<Axis, Interval>>;
  scale: ScaleBand[];
  hash: string;
}

export function domain(frame: Frame, extent: Partial<Record<Axis, Interval>>, scale: ScaleBand[] = []): Domain {
  for (const [axis, iv] of Object.entries(extent) as [Axis, Interval][]) {
    if (iv.lo.value !== null && iv.hi.value !== null && iv.lo.value > iv.hi.value) throw new Error(`domain: ${axis} runs from ${iv.lo.value} to ${iv.hi.value}`);
  }
  return { frame, extent, scale, hash: hashOf({ domain: true, frame: frame.hash, extent: Object.fromEntries(Object.entries(extent).map(([a, iv]) => [a, [iv!.lo.hash, iv!.hi.hash]])), scale: scale.map((s) => ({ says: s.says, holds: s.holds.hash, env: Object.fromEntries(Object.entries(s.env).map(([k2, d]) => [k2, d.hash])) })) }) };
}

/** What an observer resolves: the support of one sample per axis (absent: a point) and the lattice it samples on. */
export interface Resolution {
  instrument: string;
  support: Partial<Record<Axis, Derivation>>;
  lattice: Partial<Record<Axis, Derivation>>;
  hash: string;
}

export function resolution(instrument: string, support: Partial<Record<Axis, Derivation>>, lattice: Partial<Record<Axis, Derivation>> = {}): Resolution {
  return { instrument, support, lattice, hash: hashOf({ resolution: true, instrument, support: Object.fromEntries(Object.entries(support).map(([a, d]) => [a, d!.hash])), lattice: Object.fromEntries(Object.entries(lattice).map(([a, d]) => [a, d!.hash])) }) };
}

export interface Field {
  name: string;
  unit: string;
  over: Domain;
  /** The coordinate variables the term is over. */
  coords: Partial<Record<Axis, Var>>;
  /** Records bound to the term's other variables. */
  env: Env;
  term: Term;
  /** The laws the term is composed of. */
  laws: string[];
  hash: string;
}

export type Point = Partial<Record<Axis, Derivation>>;

/**
 * A field as laws composed over coordinates: each part is a law with some inputs bound to terms over the
 * coordinates (the rest to records in `env`); `compose` joins the parts' terms. The laws are cited by every sample.
 */
export function field(name: string, unit: string, over: Domain, coords: Partial<Record<Axis, Var>>, env: Env, parts: { law: Law; bind: Record<string, Term> }[], compose: (parts: Term[]) => Term): Field {
  const terms = parts.map((p) => {
    for (const sym of Object.keys(p.bind)) if (!p.law.inputs.some((i) => i.sym === sym)) throw new Error(`${name}: ${sym} is not an input of ${p.law.id}`);
    return substitute(p.law.term, p.bind);
  });
  const term = compose(terms);
  const coordSyms = new Set(Object.values(coords).map((v) => v!.sym));
  for (const v of varsOf(term)) if (!coordSyms.has(v.sym) && !env[v.sym]) throw new Error(`${name}: ${v.sym} is neither a coordinate nor bound`);
  return { name, unit, over, coords, env, term, laws: parts.map((p) => p.law.hash), hash: hashOf({ field: true, term: term.hash, over: over.hash, env: Object.fromEntries(Object.entries(env).map(([s, d]) => [s, d.hash])), laws: parts.map((p) => p.law.hash) }) };
}

const axisVar = (axis: Axis) => variable(axis, AXIS_UNIT[axis], `coordinate ${axis}`);

/** Whether a point lies in the domain's extent: 1, 0, or unknown when a bounded axis is not given. */
export function inside(d: Domain, at: Point): Derivation {
  let holds: Term | null = null;
  const env: Record<string, Derivation> = {};
  for (const [axis, iv] of Object.entries(d.extent) as [Axis, Interval][]) {
    const p = at[axis];
    const pv = axisVar(axis), lo = variable(`${axis}_lo`, AXIS_UNIT[axis]), hi = variable(`${axis}_hi`, AXIS_UNIT[axis]);
    const h = and(ge(pv, lo), le(pv, hi));
    holds = holds ? and(holds, h) : h;
    env[axis] = p ?? unknownAt(axis);
    env[`${axis}_lo`] = iv.lo; env[`${axis}_hi`] = iv.hi;
  }
  if (!holds) return evaluate('inside an unbounded domain', k(1), {}, { unit: '1', law: `domain ${d.hash}` });
  return evaluate('inside the domain', holds, env, { unit: '1', law: `domain ${d.hash}` });
}

const unknownAt = (axis: Axis) => ofLeaf(unknown(`coordinate ${axis}`, AXIS_UNIT[axis]));

/** The field at a point: its laws over the coordinates, refused outside the domain with the domain named. */
export function sample(f: Field, at: Point, name = `${f.name} at a point`): Derivation {
  const env: Record<string, Derivation> = { ...f.env };
  for (const [axis, v] of Object.entries(f.coords) as [Axis, Var][]) {
    const p = at[axis];
    env[v.sym] = p ?? unknownAt(axis);
  }
  const inDomain = inside(f.over, at);
  const check = { says: `within the field's domain ${f.over.hash}`, holds: variable('inside', '1') };
  return evaluate(name, f.term, { ...env, inside: inDomain }, { law: f.hash, also: f.laws, unit: f.unit, domain: [check] });
}

/** The scale bands of a domain at a resolution: each a record, 1 when the resolution lies inside the band. */
export function resolves(d: Domain, r: Resolution): { says: string; holds: Derivation }[] {
  return d.scale.map((band) => {
    const env: Record<string, Derivation> = { ...band.env };
    for (const axis of AXES) {
      const sym = `d${axis}`;
      if (varsOf(band.holds).some((v) => v.sym === sym)) env[sym] = r.support[axis] ?? evaluate(`support on ${axis}: a point`, k(0), {}, { unit: AXIS_UNIT[axis], law: `resolution ${r.hash}: no support declared on ${axis}` });
    }
    return { says: band.says, holds: evaluate(band.says, band.holds, env, { unit: '1', law: `scale band of domain ${d.hash}` }) };
  });
}

/**
 * The window as the coarse-graining operator: the field's mean over the resolution's support cell around `at`
 * (Simpson's rule on each resolved axis), uncertain by half its range across the cell; refused when the resolution
 * lies outside one of the domain's scale bands, with the band named.
 */
export function coarse(f: Field, r: Resolution, at: Point, name = `${f.name} as resolved`): Derivation {
  for (const band of resolves(f.over, r)) {
    if (band.holds.value === null) return evaluate(name, f.term, { ...f.env, ...Object.fromEntries(Object.entries(f.coords).map(([a, v]) => [v!.sym, at[a as Axis] ?? unknownAt(a as Axis)])) }, { law: f.hash, also: f.laws, unit: f.unit, domain: [{ says: band.says, holds: band.holds.term }] });
    if (band.holds.value === 0) return refused(name, f, at, band.says, band.holds);
  }
  const resolved = (Object.entries(f.coords) as [Axis, Var][]).filter(([axis]) => { const s = r.support[axis]; return !!s && s.value !== null && s.value > 0; });
  if (!resolved.length) return sample(f, at, name);
  // Simpson's weights 1, 4, 1 over 6 on each resolved axis; the tensor product over the resolved axes
  let points: { at: Point; weight: number; tag: string }[] = [{ at: { ...at }, weight: 1, tag: '' }];
  for (const [axis] of resolved) {
    const half = r.support[axis]!;
    const centre = at[axis];
    if (!centre) throw new Error(`${name}: no ${axis} given for a sample resolved on ${axis}`);
    const next: typeof points = [];
    for (const p of points) {
      for (const [where, w, off] of [['lo', 1 / 6, -0.5], ['mid', 4 / 6, 0], ['hi', 1 / 6, 0.5]] as const) {
        const coord = off === 0 ? centre : evaluate(`${axis} at the ${where} edge of the support`, add(axisVar(axis), mul(k(off), variable('s', AXIS_UNIT[axis], 'support'))), { [axis]: centre, s: half }, { unit: AXIS_UNIT[axis], law: `resolution ${r.hash}: the support cell` });
        next.push({ at: { ...p.at, [axis]: coord }, weight: p.weight * w, tag: `${p.tag}${axis}:${where} ` });
      }
    }
    points = next;
  }
  const samples = points.map((p, i) => ({ sym: `s${i}`, rec: sample(f, p.at, `${f.name} at ${p.tag.trim()}`), weight: p.weight }));
  if (samples.some((s) => s.rec.value === null)) return samples.find((s) => s.rec.value === null)!.rec;
  let term: Term | null = null;
  const env: Record<string, Derivation> = {};
  for (const s of samples) { const t = mul(k(s.weight), variable(s.sym, f.unit)); term = term ? add(term, t) : t; env[s.sym] = s.rec; }
  const mean = evaluate(name, term!, env, { law: `resolution ${r.hash}: Simpson's mean over the support cell`, also: f.laws, unit: f.unit });
  const values = samples.map((s) => s.rec.value!);
  const halfRange = (Math.max(...values) - Math.min(...values)) / 2;
  return withUncertainty(mean, Math.max(mean.uncertainty ?? 0, halfRange), `half the field's range across the support cell (${halfRange} ${f.unit})`);
}

function refused(name: string, f: Field, at: Point, says: string, holds: Derivation): Derivation {
  const env: Record<string, Derivation> = { ...f.env };
  for (const [axis, v] of Object.entries(f.coords) as [Axis, Var][]) env[v.sym] = at[axis] ?? unknownAt(axis);
  return evaluate(name, f.term, { ...env, band: holds }, { law: f.hash, also: f.laws, unit: f.unit, domain: [{ says, holds: variable('band', '1') }] });
}

/**
 * The share of the domain's extent on an axis that the samples' supports cover: with point samples it is zero,
 * which is the truth of a lattice: the field between the samples is derived, not observed.
 */
export function coverage(d: Domain, r: Resolution, samples: Point[], axis: Axis): Derivation {
  const iv = d.extent[axis];
  if (!iv) throw new Error(`coverage: the domain is unbounded on ${axis}`);
  const support = r.support[axis] ?? evaluate(`support on ${axis}: a point`, k(0), {}, { unit: AXIS_UNIT[axis], law: `resolution ${r.hash}: no support declared on ${axis}` });
  const n = samples.filter((p) => p[axis]).length;
  const term = div(mul(k(n, `${n} samples`), variable('s', AXIS_UNIT[axis], 'support')), add(variable('hi', AXIS_UNIT[axis]), neg(variable('lo', AXIS_UNIT[axis]))));
  return evaluate(`observed share of the domain on ${axis}`, term, { s: support, hi: iv.hi, lo: iv.lo }, { unit: '1', law: `resolution ${r.hash}: samples' supports over the extent` });
}
