// Evaluation as derivation. Nothing here returns a number: evaluating a term in an environment returns a record
// that holds the term, the records it was evaluated against, the value, its status (the weakest input's), the law
// cited, and the refusal when an input lies outside the law's domain. An unknown input makes an unknown record.

import { dimText, type Dim } from './dimension';
import { hashOf } from './identity';
import { carriesValue, weakest, type Status } from './status';
import { OPERATORS, show, type Leaf, type Term } from './term';

export interface Window {
  /** The tick the observer resolves time at, s. */
  tick: number;
  /** How long the system was watched, s. */
  seconds: number;
  /** What the observer was. */
  instrument: string;
}

export interface Derivation {
  readonly name: string;
  readonly term: Term;
  /** The records bound to the term's variables, by symbol. */
  readonly inputs: Readonly<Record<string, Derivation>>;
  readonly value: number | null;
  readonly dim: Dim;
  readonly unit: string;
  readonly status: Status;
  /** First-order propagated uncertainty, SI, when the inputs declare any. */
  readonly uncertainty?: number;
  /** The hash of the law whose term this is, when it is one. */
  readonly law?: string;
  /** Further hashes the record rests on (the laws a field is composed of). */
  readonly cites?: readonly string[];
  /** The domain the inputs left, when the evaluation was refused. */
  readonly refusal?: { domain: string; law: string };
  /** For a measurement or an unobserved variable: the observer's window and its word. */
  readonly window?: Window;
  readonly because?: string;
  /** Content hash: the term, the inputs' hashes and the law. */
  readonly hash: string;
}

export type Env = Readonly<Record<string, Derivation>>;

const BRAND = Symbol('derivation');
const brand = (d: Derivation): Derivation => { Object.defineProperty(d, BRAND, { value: true, enumerable: false }); return Object.freeze(d); };
/** Whether a value is a record made here (a bare object with the same shape is not). */
export const isDerivation = (x: unknown): x is Derivation => typeof x === 'object' && x !== null && (x as Record<symbol, unknown>)[BRAND] === true;

/** A leaf as a record: its own origin is its whole derivation. */
export function ofLeaf(l: Leaf): Derivation {
  const status: Status = l.origin.class === 'configuration' ? 'given' : l.origin.class;
  return brand({
    name: l.name, term: l, inputs: {}, value: l.value, dim: l.dim, unit: l.unit, status,
    ...(l.uncertainty === undefined ? {} : { uncertainty: l.uncertainty }),
    ...(l.origin.window === undefined ? {} : { because: l.origin.window }),
    hash: hashOf({ record: 'leaf', leaf: l.hash }),
  });
}

/** A measurement: a leaf of status measured, with the window it was taken in. */
export function measurement(name: string, value: number, unit: string, m: { instrument: string; window: Window; uncertainty?: number }, leafOf: (name: string, value: number, unit: string, origin: Leaf['origin'], uncertainty?: number) => Leaf): Derivation {
  const l = leafOf(name, value, unit, { class: 'measured', source: m.instrument, window: `${m.window.seconds} s at ${m.window.tick} s ticks` }, m.uncertainty);
  const d = ofLeaf(l);
  return brand({ ...d, window: m.window });
}

/** A variable the observer cannot resolve: not unknown; the observer says why. */
export function unobserved(name: string, unit: string, because: string, window: Window, term: Term): Derivation {
  return brand({ name, term, inputs: {}, value: null, dim: term.dim, unit, status: 'unobserved', because, window, hash: hashOf({ record: 'unobserved', term: term.hash, because }) });
}

export interface DomainCheck { says: string; holds: Term }

const numeric = (t: Term, env: Env): number | null => {
  if (t.kind === 'leaf') return t.value;
  if (t.kind === 'var') { const d = env[t.sym]; if (!d) throw new Error(`${t.sym} is not bound`); return d.value; }
  const args = t.args.map((a) => numeric(a, env));
  if (args.some((a) => a === null)) return null;
  return OPERATORS[t.op].eval(args as number[], t.k);
};

/**
 * Evaluate `term` against `env`. Every variable of the term must be bound to a record (an unbound variable is an
 * error of the caller, not an unknown: an unknown is a record of status unknown). The result's status is the
 * weakest of the inputs', and never stronger than derived.
 */
export function evaluate(name: string, term: Term, env: Env, cite?: { law: string; also?: string[]; domain?: DomainCheck[]; unit?: string }): Derivation {
  const inputs: Record<string, Derivation> = {};
  const collect = (t: Term) => {
    if (t.kind === 'var') { const d = env[t.sym]; if (!d) throw new Error(`${name}: ${t.sym} is not bound`); if (!isDerivation(d)) throw new Error(`${name}: ${t.sym} is bound to something that is not a derivation`); inputs[t.sym] = d; }
    else if (t.kind === 'app') t.args.forEach(collect);
  };
  collect(term);
  for (const dc of cite?.domain ?? []) collect(dc.holds);
  const statuses = Object.values(inputs).map((d) => d.status);
  let status = weakest('derived', ...statuses);
  const unit = cite?.unit ?? dimText(term.dim);
  const base = { name, term, inputs, dim: term.dim, unit, ...(cite ? { law: cite.law } : {}), ...(cite?.also?.length ? { cites: [...cite.also] } : {}) };
  const hash = hashOf({ record: 'eval', term: term.hash, law: cite?.law ?? null, cites: cite?.also ?? [], inputs: Object.fromEntries(Object.entries(inputs).map(([s, d]) => [s, d.hash])) });
  if (!carriesValue(status)) return brand({ ...base, value: null, status, hash });
  // validity: each domain predicate must hold; one that cannot be decided leaves the result unknown
  for (const dc of cite?.domain ?? []) {
    const h = numeric(dc.holds, env);
    if (h === null) return brand({ ...base, value: null, status: 'unknown', because: `the domain "${dc.says}" cannot be decided: an input is unknown`, hash });
    if (h === 0) return brand({ ...base, value: null, status: 'outside-validity', refusal: { domain: dc.says, law: cite!.law }, hash });
  }
  const value = numeric(term, env);
  if (value === null || !Number.isFinite(value)) return brand({ ...base, value: null, status: value === null ? 'unknown' : 'outside-validity', ...(value === null ? {} : { refusal: { domain: `${show(term)} is not finite here`, law: cite?.law ?? '' } }), hash });
  // first-order uncertainty: central differences on each input that declares one
  let u2 = 0;
  for (const [sym, d] of Object.entries(inputs)) {
    if (!d.uncertainty || d.value === null) continue;
    const h = Math.max(Math.abs(d.value) * 1e-6, 1e-12);
    const bump = (dv: number) => numeric(term, { ...env, [sym]: brand({ ...d, value: d.value! + dv }) });
    const hi = bump(h), lo = bump(-h);
    if (hi === null || lo === null) continue;
    u2 += (((hi - lo) / (2 * h)) * d.uncertainty) ** 2;
  }
  if (statuses.length === 0) status = 'derived';
  return brand({ ...base, value, status, ...(u2 > 0 ? { uncertainty: Math.sqrt(u2) } : {}), hash });
}

/** Re-evaluate a record from its own term and inputs: the value must come back (the derivation test). */
export const recompute = (d: Derivation): Derivation => (d.term.kind === 'leaf' ? ofLeaf(d.term) : evaluate(d.name, d.term, d.inputs, d.law ? { law: d.law, unit: d.unit, ...(d.cites ? { also: [...d.cites] } : {}) } : undefined));

/** The same record with a wider uncertainty and the reason: an observer's resolution, never a smaller one. */
export function withUncertainty(d: Derivation, uncertainty: number, because: string): Derivation {
  if (uncertainty < (d.uncertainty ?? 0)) throw new Error(`${d.name}: an uncertainty is never narrowed by hand`);
  return brand({ ...d, uncertainty, because: d.because ? `${d.because}; ${because}` : because });
}

/** Two evidences for one variable that disagree past tolerance: both kept, the variable unusable. */
export function contradiction(name: string, a: Derivation, b: Derivation): Derivation {
  return brand({ name, term: a.term, inputs: { a, b }, value: null, dim: a.dim, unit: a.unit, status: 'contradicted', because: `${a.name} = ${a.value} and ${b.name} = ${b.value} disagree past tolerance`, hash: hashOf({ record: 'contradiction', a: a.hash, b: b.hash }) });
}
