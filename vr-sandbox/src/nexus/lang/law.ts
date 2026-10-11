// Laws as terms. A law is a term over named inputs with an output dimension, a validity domain of predicate terms,
// a source and a worked example it must reproduce. Its identity is the content: term, domain, output dimension,
// statement and source. No closures: the same term evaluates forward and is inverted numerically.

import { DimensionError, dimOf, dimText, sameDim } from './dimension';
import { evaluate, type Derivation, type DomainCheck, type Env } from './evaluate';
import { hashOf } from './identity';
import { varsOf, type Term } from './term';

export type SourceKind = 'standard' | 'textbook' | 'handbook' | 'derivation' | 'measurement' | 'declaration' | 'maker' | 'distributor' | 'rule of thumb' | 'press' | 'patent' | 'paper' | 'database';
export interface Source { cite: string; kind: SourceKind; url?: string }
export interface Port { sym: string; unit: string; name: string }

export interface Law {
  readonly id: string;
  readonly name: string;
  readonly statement: string;
  readonly formula: string;
  readonly inputs: readonly Port[];
  readonly output: Port;
  readonly term: Term;
  readonly domain: readonly DomainCheck[];
  /** Where it holds and what it leaves out, in words (the domain predicates are the checked part). */
  readonly valid?: string;
  readonly source: Source;
  /** A worked example, computed independently of the term (the compiler's test). */
  readonly example?: { inputs: Record<string, number>; output: number; rel?: number; from: string };
  readonly hash: string;
}

export function law(spec: Omit<Law, 'hash'>): Law {
  const out = dimOf(spec.output.unit);
  if (!sameDim(spec.term.dim, out)) throw new DimensionError(`${spec.id}: the term is ${dimText(spec.term.dim)}, the output ${spec.output.unit} is ${dimText(out)}`);
  for (const v of varsOf(spec.term)) {
    const port = spec.inputs.find((p) => p.sym === v.sym);
    if (!port) throw new Error(`${spec.id}: ${v.sym} is not an input`);
    if (!sameDim(dimOf(port.unit), v.dim)) throw new DimensionError(`${spec.id}: ${v.sym} is ${dimText(v.dim)} in the term and ${port.unit} at the port`);
  }
  for (const dc of spec.domain) for (const v of varsOf(dc.holds)) if (!spec.inputs.some((p) => p.sym === v.sym)) throw new Error(`${spec.id}: the domain "${dc.says}" uses ${v.sym}, not an input`);
  const hash = hashOf({ law: true, term: spec.term.hash, domain: spec.domain.map((d) => ({ says: d.says, holds: d.holds.hash })), out, statement: spec.statement, source: spec.source.cite });
  return { ...spec, hash };
}

/** The law applied: a derivation record citing it, refused with the domain named when an input lies outside it. */
export function apply(l: Law, env: Env, name = l.output.name): Derivation {
  return evaluate(name, l.term, env, { law: l.hash, domain: [...l.domain], unit: l.output.unit });
}

/**
 * The input `sym` that makes the law's output `target`, with every other input bound: a numeric inversion of the
 * same term (bisection on a bracket where the output crosses the target). Null when it does not cross there.
 */
export function invert(l: Law, sym: string, target: number, env: Env, bracket: [number, number], mk: (name: string, value: number, unit: string) => Derivation): number | null {
  const port = l.inputs.find((p) => p.sym === sym);
  if (!port) throw new Error(`${l.id}: ${sym} is not an input`);
  const f = (x: number) => { const d = apply(l, { ...env, [sym]: mk(port.name, x, port.unit) }); return d.value === null ? NaN : d.value - target; };
  let [lo, hi] = bracket;
  let flo = f(lo), fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) <= 1e-13 * Math.max(Math.abs(target), Number.MIN_VALUE) || hi - lo <= 1e-14 * Math.abs(mid)) return mid;
    if (fm * flo < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  void fhi;
  return (lo + hi) / 2;
}
