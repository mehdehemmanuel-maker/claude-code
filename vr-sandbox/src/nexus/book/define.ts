// How a law of the book is written: ports, a term over them, the domain predicates, the source and the kept worked
// example. The variables are made from the ports, so a term can only mention inputs.

import type { DomainCheck } from '../lang/evaluate';
import { law, type Law, type Source } from '../lang/law';
import { variable, type Term, type Var } from '../lang/term';

export type Port = [sym: string, unit: string, name: string];

export interface Spec {
  id: string;
  name: string;
  statement: string;
  formula: string;
  valid: string;
  inputs: Port[];
  output: Port;
  term: (v: Record<string, Var>) => Term;
  domain?: (v: Record<string, Var>) => DomainCheck[];
  source: Source;
  /** The kept data's worked example, in the ports' units. */
  example: { inputs: Record<string, number>; output: number; rel?: number };
}

export function L(s: Spec): Law {
  const v: Record<string, Var> = {};
  for (const [sym, unit, name] of s.inputs) v[sym] = variable(sym, unit, name);
  const [osym, ounit, oname] = s.output;
  return law({
    id: s.id, name: s.name, statement: s.statement, formula: s.formula, valid: s.valid,
    inputs: s.inputs.map(([sym, unit, name]) => ({ sym, unit, name })), output: { sym: osym, unit: ounit, name: oname },
    term: s.term(v), domain: s.domain?.(v) ?? [], source: s.source,
    example: { ...s.example, from: `ganglia/laws.ts ${s.id}` },
  });
}
