// Representational failure as terms. Four conditions are detectable (docs/NEXUS-RESTART.md Part V): a derivation
// disagrees with a measurement past the combined tolerance; the solver finds a contradiction; the solver finds a
// variable free that the intent did not leave free; a measurement arrives with a dimension no variable of the
// system carries. Each is a record with a hash, citing what it rests on, never a log line.

import { dimText, sameDim } from './dimension';
import type { Derivation } from './evaluate';
import { hashOf } from './identity';
import type { Comparison } from './observe';
import type { Solution, System } from './solve';

export type Failure =
  | { kind: 'anomaly'; says: string; comparison: Comparison; cites: string[]; hash: string }
  | { kind: 'contradiction'; says: string; sym: string; record: Derivation; cites: string[]; hash: string }
  | { kind: 'free'; says: string; sym: string; wouldBind: string[]; cites: string[]; hash: string }
  | { kind: 'unplaced'; says: string; measurement: Derivation; cites: string[]; hash: string };

/** The anomaly in a comparison, when its verdict is one. */
export function anomalyOf(c: Comparison): Failure | null {
  if (c.verdict.kind !== 'anomaly') return null;
  const says = `${c.name}: derived ${c.derived.value} ${c.derived.unit}, measured ${c.measured.value} ${c.measured.unit}; the difference ${c.verdict.error} exceeds the tolerance ${c.verdict.tolerance} of ${c.verdict.contract}`;
  const cites = [c.hash, c.derived.hash, c.measured.hash];
  return { kind: 'anomaly', says, comparison: c, cites, hash: hashOf({ failure: 'anomaly', comparison: c.hash }) };
}

/** The failures a solution holds: contradictions, and variables free that the intent did not leave free. */
export function failuresOf(system: System, solution: Solution, leftFree: string[] = []): Failure[] {
  const out: Failure[] = [];
  for (const c of solution.contradictions) out.push({ kind: 'contradiction', says: `${system.name}: ${c.record.because ?? `${c.sym} is bound twice and the bindings disagree`}`, sym: c.sym, record: c.record, cites: [c.record.hash], hash: hashOf({ failure: 'contradiction', record: c.record.hash }) });
  for (const f of solution.free) {
    if (leftFree.includes(f.sym)) continue;
    const wouldBind = f.wouldBind.map((w) => `${w.by} waiting on ${w.waitingOn.join(', ')}`);
    out.push({ kind: 'free', says: `${system.name}: ${f.name} (${f.sym}) is free and the intent did not leave it free; ${wouldBind.length ? `it would be bound by ${wouldBind.join('; ')}` : 'no relation of the system binds it: a relation is missing'}`, sym: f.sym, wouldBind, cites: [], hash: hashOf({ failure: 'free', system: system.name, sym: f.sym, wouldBind }) });
  }
  return out;
}

/** A measurement whose dimension no variable of the system carries: a variable is missing. */
export function unplaced(system: System, m: Derivation): Failure | null {
  const fits = system.vars.some((v) => { try { return sameDim(variableDim(v.unit), m.dim); } catch { return false; } });
  if (fits) return null;
  return { kind: 'unplaced', says: `${system.name}: the measurement ${m.name} is ${dimText(m.dim)} and no variable of the system has that dimension`, measurement: m, cites: [m.hash], hash: hashOf({ failure: 'unplaced', measurement: m.hash, system: system.name }) };
}

import { dimOf } from './dimension';
const variableDim = (unit: string) => dimOf(unit);
