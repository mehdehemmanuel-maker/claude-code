// The ganglia: what Ego knows, as data she can reason with. Four kinds of knowledge, each carrying where it comes
// from, so nothing in it is a guess dressed as a fact:
//   laws       equations of the world, executable, each with the range it holds over and a worked example it must
//              reproduce (ganglia.test.ts)
//   processes  how a feature is made (sawn, drilled, tapped, bored, bent, welded...) and the limits of making it
//   parts      things you can buy, as their makers publish them, each checked for consistency with itself
//   workflows  design procedures: what to ask, which laws to apply in what order, which parts to choose from; each
//              run returns its decision, the alternatives, and the trace of every law it applied with the numbers
// Everything links to everything it uses, so Ego can follow a question from a part to the laws that rate it and the
// processes that make it.

/** How far a source can be trusted: a standard or the maker's own data first, a rule of thumb last. */
export type SourceKind = 'standard' | 'maker' | 'textbook' | 'distributor' | 'handbook' | 'rule of thumb';

export interface Source {
  /** The book, standard or maker's document (edition, table or page where it matters). */
  cite: string;
  url?: string;
  kind?: SourceKind;
}

export interface Quantity {
  sym: string;
  name: string;
  /** SI unit, as written (N, m, kg, s, A, V, ohm, W, J, K, Pa, rad/s, -). */
  unit: string;
}

export type Domain = 'mechanics' | 'structures' | 'machine elements' | 'electrical' | 'thermal' | 'fluids' | 'magnetism' | 'materials' | 'information';

export interface Law {
  id: string;
  name: string;
  domain: Domain;
  /** In words, as an engineer would say it. */
  statement: string;
  /** As written, e.g. "F = m a". */
  formula: string;
  inputs: Quantity[];
  output: Quantity;
  /** Physical constants it uses (g, σ, α...), each with its unit, so it can be checked for dimensions like any input. */
  constants?: Record<string, { value: number; unit: string; name: string }>;
  /** The law itself, in SI: inputs (and constants) by symbol. */
  eval(v: Record<string, number>): number;
  /** Where these inputs leave the range it holds over, in words (checked on every use): null when they don't. */
  outside?(v: Record<string, number>): string | null;
  /** Where it holds, and what it leaves out. */
  valid: string;
  /** A worked example it must reproduce (computed independently of `eval`). */
  example: { inputs: Record<string, number>; output: number; rel?: number };
  source: Source;
  tags: string[];
  /** The module that runs it in the world, when the world uses it. */
  implementedIn?: string;
}

export interface Process {
  id: string;
  name: string;
  /** The feature it makes: a cut, a hole, a thread, a bore, a bend, a bead. */
  makes: string;
  /** Material categories it works on. */
  materials: string[];
  tools: string[];
  /** Its limits, in words, each one a rule a design must keep to. */
  limits: string[];
  source: Source;
  tags: string[];
  /** The laws and parts it relates to. */
  uses?: { laws?: string[]; parts?: string[] };
}

export interface Price {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  seen: string;
  note: string;
}

/** A thing you can buy, in a family (bearing, coupling, motor...), with its maker's figures in SI. */
export interface CatalogItem {
  id: string;
  family: string;
  label: string;
  /** Its figures, SI, by name (bore, od, width, C, C0, torque, current...). */
  specs: Record<string, number | string>;
  source: Source;
  price?: Price;
  tags: string[];
}

export interface TraceStep {
  law: string;
  /** What it was used for, in words. */
  for: string;
  inputs: Record<string, number>;
  output: number;
  unit: string;
  /** Where the law was used beyond what it holds for, if it was. */
  caution?: string;
}

export interface WorkflowResult<T = unknown> {
  ok: boolean;
  /** The decision, in a sentence. */
  summary: string;
  choice: T | null;
  /** Other workable answers, best first, with what each trades. */
  alternatives: { choice: T; why: string }[];
  trace: TraceStep[];
  warnings: string[];
  /** The parts it chose from, by id. */
  parts: string[];
}

export interface Workflow<S = Record<string, number | string>, T = unknown> {
  id: string;
  name: string;
  goal: string;
  /** What it needs to know, with defaults where a sensible one exists. */
  asks: (Quantity & { default?: number })[];
  steps: string[];
  uses: { laws: string[]; families: string[]; processes: string[] };
  run(spec: S): WorkflowResult<T>;
  tags: string[];
}
