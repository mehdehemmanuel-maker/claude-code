// Domains, fields and the observer's resolution. A domain declares its coordinates: variables with dimensions, each
// bounded or not, with the scale bands its description holds in; a physical domain declares x, y, z, t in a frame,
// a configuration space declares its design variables and has no frame. A field is laws composed over a domain's
// coordinates: a quantity at every point, sampled as a derivation that cites the laws; nothing enumerates it. An
// observer resolves each coordinate to a support (what one sample averages over; absent, a point) and samples on a
// lattice; the window is the coarse-graining operator: a sample at a resolution is the field's mean over the
// support cell, uncertain by its variation across the cell, and refused when the resolution lies outside the
// field's scale bands.

import { evaluate, ofLeaf, withUncertainty, type Derivation, type Env } from './evaluate';
import type { Frame } from './field';
import { hashOf } from './identity';
import type { Law } from './law';
import { add, and, div, ge, k, le, mul, neg, substitute, unknown, variable, varsOf, type Term, type Var } from './term';
import { sameDim } from './dimension';

export interface Interval { lo: Derivation; hi: Derivation }

/** A band of scales the description holds in: a predicate over the observer's supports (d<coordinate>), lattices (l<coordinate>) and records. */
export interface ScaleBand { says: string; holds: Term; env: Env }

export interface Domain {
  /** The frame a physical domain's coordinates are laid in; a configuration space has none. */
  frame: Frame | null;
  /** The coordinates, by symbol: declared, with their dimensions. */
  coords: Record<string, Var>;
  /** Bounded coordinates; an absent one is unbounded. */
  extent: Record<string, Interval>;
  scale: ScaleBand[];
  hash: string;
}

export function domain(frame: Frame | null, coords: Record<string, Var>, extent: Record<string, Interval> = {}, scale: ScaleBand[] = []): Domain {
  for (const [sym, v] of Object.entries(coords)) if (v.sym !== sym) throw new Error(`domain: the coordinate ${sym} is the variable ${v.sym}`);
  for (const [sym, iv] of Object.entries(extent)) {
    const v = coords[sym];
    if (!v) throw new Error(`domain: ${sym} is bounded but not a coordinate`);
    if (!sameDim(iv.lo.dim, v.dim) || !sameDim(iv.hi.dim, v.dim)) throw new Error(`domain: the extent of ${sym} is not in its dimension`);
    if (iv.lo.value !== null && iv.hi.value !== null && iv.lo.value > iv.hi.value) throw new Error(`domain: ${sym} runs from ${iv.lo.value} to ${iv.hi.value}`);
  }
  const hash = hashOf({
    domain: true, frame: frame?.hash ?? null,
    coords: Object.fromEntries(Object.entries(coords).map(([s, v]) => [s, v.hash])),
    extent: Object.fromEntries(Object.entries(extent).map(([s, iv]) => [s, [iv.lo.hash, iv.hi.hash]])),
    scale: scale.map((s) => ({ says: s.says, holds: s.holds.hash, env: Object.fromEntries(Object.entries(s.env).map(([k2, d]) => [k2, d.hash])) })),
  });
  return { frame, coords, extent, scale, hash };
}

/** What an observer resolves: the support of one sample per coordinate (absent: a point) and the lattice it samples on. */
export interface Resolution {
  instrument: string;
  support: Record<string, Derivation>;
  lattice: Record<string, Derivation>;
  /** Coordinates the observer does not resolve at all but averages over entirely: a static realization is stationary on t. */
  stationary: string[];
  hash: string;
}

export function resolution(instrument: string, support: Record<string, Derivation>, lattice: Record<string, Derivation> = {}, stationary: string[] = []): Resolution {
  return { instrument, support, lattice, stationary, hash: hashOf({ resolution: true, instrument, support: Object.fromEntries(Object.entries(support).map(([a, d]) => [a, d.hash])), lattice: Object.fromEntries(Object.entries(lattice).map(([a, d]) => [a, d.hash])), stationary }) };
}

export interface Field {
  name: string;
  unit: string;
  over: Domain;
  /** Records bound to the term's variables that are not coordinates. */
  env: Env;
  term: Term;
  /** The laws the term is composed of. */
  laws: string[];
  hash: string;
}

export type Point = Record<string, Derivation>;

/** A field from a term over the domain's coordinates: every other variable of the term must be bound in `env`. */
export function fieldOf(name: string, unit: string, over: Domain, term: Term, env: Env, laws: string[]): Field {
  for (const v of varsOf(term)) {
    const c = over.coords[v.sym];
    if (c) { if (!sameDim(c.dim, v.dim)) throw new Error(`${name}: the coordinate ${v.sym} is used in another dimension`); continue; }
    if (!env[v.sym]) throw new Error(`${name}: ${v.sym} is neither a coordinate nor bound`);
  }
  return { name, unit, over, env, term, laws, hash: hashOf({ field: true, term: term.hash, over: over.hash, env: Object.fromEntries(Object.entries(env).map(([s, d]) => [s, d.hash])), laws }) };
}

/**
 * A field as laws composed over coordinates: each part is a law with some inputs bound to terms over the
 * coordinates (the rest to records in `env`); `compose` joins the parts' terms. The laws are cited by every sample.
 */
export function field(name: string, unit: string, over: Domain, env: Env, parts: { law: Law; bind: Record<string, Term> }[], compose: (parts: Term[]) => Term): Field {
  const terms = parts.map((p) => {
    for (const sym of Object.keys(p.bind)) if (!p.law.inputs.some((i) => i.sym === sym)) throw new Error(`${name}: ${sym} is not an input of ${p.law.id}`);
    return substitute(p.law.term, p.bind);
  });
  return fieldOf(name, unit, over, compose(terms), env, parts.map((p) => p.law.hash));
}

const unknownAt = (v: Var) => ofLeaf(unknown(`coordinate ${v.sym}`, v.unit));

/** Whether a point lies in the domain's extent: 1, 0, or unknown when a bounded coordinate is not given. */
export function inside(d: Domain, at: Point): Derivation {
  let holds: Term | null = null;
  const env: Record<string, Derivation> = {};
  for (const [sym, iv] of Object.entries(d.extent)) {
    const v = d.coords[sym]!;
    const lo = variable(`${sym}_lo`, v.unit), hi = variable(`${sym}_hi`, v.unit);
    const h = and(ge(v, lo), le(v, hi));
    holds = holds ? and(holds, h) : h;
    env[sym] = at[sym] ?? unknownAt(v);
    env[`${sym}_lo`] = iv.lo; env[`${sym}_hi`] = iv.hi;
  }
  if (!holds) return evaluate('inside an unbounded domain', k(1), {}, { unit: '1', law: `domain ${d.hash}` });
  return evaluate('inside the domain', holds, env, { unit: '1', law: `domain ${d.hash}` });
}

const envAt = (f: Field, at: Point): Record<string, Derivation> => {
  const env: Record<string, Derivation> = { ...f.env };
  for (const [sym, v] of Object.entries(f.over.coords)) env[sym] = at[sym] ?? unknownAt(v);
  return env;
};

/** The field at a point: its laws over the coordinates, refused outside the domain with the domain named. */
export function sample(f: Field, at: Point, name = `${f.name} at a point`): Derivation {
  const inDomain = inside(f.over, at);
  const check = { says: `within the field's domain ${f.over.hash}`, holds: variable('inside', '1') };
  return evaluate(name, f.term, { ...envAt(f, at), inside: inDomain }, { law: f.hash, also: f.laws, unit: f.unit, domain: [check] });
}

/** The scale bands of a domain at a resolution: each a record, 1 when the resolution lies inside the band. */
export function resolves(d: Domain, r: Resolution): { says: string; holds: Derivation }[] {
  const syms = Object.keys(d.coords);
  return d.scale.map((band) => {
    const env: Record<string, Derivation> = { ...band.env };
    const used = varsOf(band.holds).map((v) => v.sym);
    const supported = syms.filter((s) => used.includes(`d${s}`));
    const sampled = syms.filter((s) => used.includes(`l${s}`));
    // an observer stationary on a coordinate averages over all of it: any bound on its support or lattice there is met in the limit
    const stationary = [...supported, ...sampled].filter((s) => r.stationary.includes(s));
    if (stationary.length) return { says: band.says, holds: evaluate(band.says, k(1), {}, { unit: '1', law: `resolution ${r.hash}: stationary on ${stationary.join(', ')}; the band's bound there is met in the static limit` }) };
    for (const s of supported) env[`d${s}`] = r.support[s] ?? evaluate(`support on ${s}: a point`, k(0), {}, { unit: d.coords[s]!.unit, law: `resolution ${r.hash}: no support declared on ${s}` });
    for (const s of sampled) {
      const l = r.lattice[s];
      if (!l) return { says: band.says, holds: evaluate(band.says, k(0), {}, { unit: '1', law: `resolution ${r.hash}: no lattice declared on ${s}, so the band on the sampling there cannot hold` }) };
      env[`l${s}`] = l;
    }
    return { says: band.says, holds: evaluate(band.says, band.holds, env, { unit: '1', law: `scale band of domain ${d.hash}` }) };
  });
}

/**
 * The window as the coarse-graining operator: the field's mean over the resolution's support cell around `at`
 * (Simpson's rule on each resolved coordinate), uncertain by half its range across the cell; refused when the
 * resolution lies outside one of the domain's scale bands, with the band named.
 */
export function coarse(f: Field, r: Resolution, at: Point, name = `${f.name} as resolved`): Derivation {
  for (const band of resolves(f.over, r)) {
    if (band.holds.value === null) return evaluate(name, f.term, envAt(f, at), { law: f.hash, also: f.laws, unit: f.unit, domain: [{ says: band.says, holds: band.holds.term }] });
    if (band.holds.value === 0) return refused(name, f, at, band.says, band.holds);
  }
  // a coordinate the term does not depend on needs no averaging: the mean of a field constant along it is the field, exactly
  const depends = new Set(varsOf(f.term).map((v) => v.sym));
  const resolved = Object.entries(f.over.coords).filter(([sym]) => { const s = r.support[sym]; return depends.has(sym) && !!s && s.value !== null && s.value > 0; });
  if (!resolved.length) return sample(f, at, name);
  // Simpson's weights 1, 4, 1 over 6 on each resolved coordinate; the tensor product over the resolved coordinates
  let points: { at: Point; weight: number; tag: string }[] = [{ at: { ...at }, weight: 1, tag: '' }];
  for (const [sym, v] of resolved) {
    const half = r.support[sym]!;
    const centre = at[sym];
    if (!centre) throw new Error(`${name}: no ${sym} given for a sample resolved on ${sym}`);
    const next: typeof points = [];
    for (const p of points) {
      for (const [where, w, off] of [['lo', 1 / 6, -0.5], ['mid', 4 / 6, 0], ['hi', 1 / 6, 0.5]] as const) {
        const coord = off === 0 ? centre : evaluate(`${sym} at the ${where} edge of the support`, add(v, mul(k(off), variable('s', v.unit, 'support'))), { [sym]: centre, s: half }, { unit: v.unit, law: `resolution ${r.hash}: the support cell` });
        next.push({ at: { ...p.at, [sym]: coord }, weight: p.weight * w, tag: `${p.tag}${sym}:${where} ` });
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
  return evaluate(name, f.term, { ...envAt(f, at), band: holds }, { law: f.hash, also: f.laws, unit: f.unit, domain: [{ says, holds: variable('band', '1') }] });
}

/**
 * The share of the domain's extent on a coordinate that the samples' supports cover: with point samples it is zero,
 * which is the truth of a lattice: the field between the samples is derived, not observed.
 */
export function coverage(d: Domain, r: Resolution, samples: Point[], sym: string): Derivation {
  const iv = d.extent[sym];
  if (!iv) throw new Error(`coverage: the domain is unbounded on ${sym}`);
  const v = d.coords[sym]!;
  const support = r.support[sym] ?? evaluate(`support on ${sym}: a point`, k(0), {}, { unit: v.unit, law: `resolution ${r.hash}: no support declared on ${sym}` });
  const n = samples.filter((p) => p[sym]).length;
  const term = div(mul(k(n, `${n} samples`), variable('s', v.unit, 'support')), add(variable('hi', v.unit), neg(variable('lo', v.unit))));
  return evaluate(`observed share of the domain on ${sym}`, term, { s: support, hi: iv.hi, lo: iv.lo }, { unit: '1', law: `resolution ${r.hash}: samples' supports over the extent` });
}

/**
 * The lattice of a domain at a spacing on each bounded coordinate: every point a record deriving from the extent's
 * ends and the spacing. The addresses a search visits; the field between them is derived, not visited.
 */
export function lattice(d: Domain, spacing: Record<string, Derivation>): Point[] {
  let points: Point[] = [{}];
  for (const [sym, h] of Object.entries(spacing)) {
    const iv = d.extent[sym];
    const v = d.coords[sym];
    if (!v) throw new Error(`lattice: ${sym} is not a coordinate`);
    if (!iv) throw new Error(`lattice: the domain is unbounded on ${sym}`);
    if (iv.lo.value === null || iv.hi.value === null || h.value === null || h.value <= 0) throw new Error(`lattice: the extent and spacing on ${sym} must be known and the spacing positive`);
    const n = Math.floor((iv.hi.value - iv.lo.value) / h.value + 1e-9);
    const next: Point[] = [];
    for (const p of points) for (let i = 0; i <= n; i++) {
      const coord = evaluate(`${sym} on the lattice`, add(variable('lo', v.unit), mul(k(i, `${i}`), variable('h', v.unit, 'spacing'))), { lo: iv.lo, h }, { unit: v.unit, law: `lattice over domain ${d.hash}: the extent's start plus ${i} spacings` });
      next.push({ ...p, [sym]: coord });
    }
    points = next;
  }
  return points;
}
