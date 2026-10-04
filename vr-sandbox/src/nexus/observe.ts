// Observation, comparison and the journal. A comparison sets a derived record against a measured one with the
// tolerance the realization's contract and the window allow: within, an anomaly naming the contract, or
// unobserved when the realization declares it cannot see the variable. The journal is append-only and has one
// rule: nothing is ever removed; a change is a new entry.

import { evaluate, type Derivation } from './evaluate';
import { hashOf } from './identity';
import { abs, add, mul, sub, variable } from './term';

export type Verdict =
  | { kind: 'within'; error: number; tolerance: number }
  | { kind: 'anomaly'; error: number; tolerance: number; contract: string }
  | { kind: 'unobserved'; because: string }
  | { kind: 'undecidable'; because: string };

export interface Comparison {
  name: string;
  derived: Derivation;
  measured: Derivation;
  /** The difference as a record, so a comparison is itself traced. */
  difference: Derivation | null;
  tolerance: Derivation | null;
  verdict: Verdict;
  hash: string;
}

const D = variable('d', '1'), M = variable('m', '1'), T = variable('t', '1'), X = variable('x', '1');

/**
 * Compare a derivation with a measurement under a contract: `relative` is the realization's declared relative error
 * for this observable (its own measured error); the derived record's and the measurement's uncertainties add.
 */
export function compare(name: string, derived: Derivation, measured: Derivation, contract: { name: string; relative: Derivation; absolute?: Derivation }): Comparison {
  const base = { name, derived, measured };
  const hash = hashOf({ comparison: true, derived: derived.hash, measured: measured.hash, contract: contract.relative.hash });
  if (measured.status === 'unobserved') return { ...base, difference: null, tolerance: null, verdict: { kind: 'unobserved', because: measured.because ?? 'the realization does not observe it' }, hash };
  if (derived.value === null || measured.value === null) return { ...base, difference: null, tolerance: null, verdict: { kind: 'undecidable', because: `${derived.value === null ? derived.name : measured.name} has no value (${derived.value === null ? derived.status : measured.status})` }, hash };
  if (!derived.dim.every((e, i) => e === measured.dim[i])) throw new Error(`${name}: ${derived.name} and ${measured.name} differ in dimension`);
  const dv = variable('d', derived.unit), mv = variable('m', derived.unit);
  const difference = evaluate(`${name}: measured − derived`, abs(sub(mv, dv)), { d: derived, m: measured }, { unit: derived.unit, law: 'comparison: the magnitude of the difference' });
  const tolerance = contract.absolute
    ? evaluate(`${name}: tolerance`, add(mul(T, abs(X)), variable('a', derived.unit)), { t: contract.relative, x: derived, a: contract.absolute }, { unit: derived.unit, law: `contract ${contract.name}: relative error times the derived value, plus the absolute allowance` })
    : evaluate(`${name}: tolerance`, mul(T, abs(X)), { t: contract.relative, x: derived }, { unit: derived.unit, law: `contract ${contract.name}: relative error times the derived value` });
  void D; void M;
  const tol = tolerance.value! + (derived.uncertainty ?? 0) + (measured.uncertainty ?? 0);
  const err = difference.value!;
  const verdict: Verdict = err <= tol ? { kind: 'within', error: err, tolerance: tol } : { kind: 'anomaly', error: err, tolerance: tol, contract: contract.name };
  return { ...base, difference, tolerance, verdict, hash };
}

export type Entry =
  | { kind: 'record'; at: number; record: Derivation }
  | { kind: 'comparison'; at: number; comparison: Comparison }
  | { kind: 'choice'; at: number; why: Derivation; among: number; label: string }
  | { kind: 'refusal'; at: number; what: string; domain: string }
  | { kind: 'note'; at: number; text: string };

type Without<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Append-only. The one rule: an entry, once written, is never changed or removed. */
export class Journal {
  private readonly entries: Entry[] = [];
  private seq = 0;
  append(e: Without<Entry, 'at'>): Entry {
    const entry = Object.freeze({ ...e, at: this.seq++ }) as Entry;
    this.entries.push(entry);
    return entry;
  }
  all(): readonly Entry[] { return this.entries; }
  records(): Derivation[] { return this.entries.flatMap((e) => (e.kind === 'record' ? [e.record] : e.kind === 'comparison' ? [e.comparison.derived, e.comparison.measured] : e.kind === 'choice' ? [e.why] : [])); }
  comparisons(): Comparison[] { return this.entries.flatMap((e) => (e.kind === 'comparison' ? [e.comparison] : [])); }
}
