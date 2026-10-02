// The law tree (docs/LAW-TREE.md): the structure every physical claim in this world derives through. A node is one
// law, assumption, structure, realisation, constant or datum; its parents are what it specialises, its dependencies
// what it needs besides; its realisations are the code that carries it, each with the obligation that code must keep
// and the property tests that hold it. The tree is data so that it can be checked (tests/unit/tree.test.ts): no node
// without a parent but the roots, no realisation naming code that isn't there, no obligation without a test, and no
// constant in the physics without a node that says what kind of number it is.

export type NodeKind =
  | 'axiom' | 'model-assumption' | 'meta-law' | 'structure' | 'law' | 'constitutive' | 'domain'
  | 'realisation' | 'parameter' | 'environment' | 'datum' | 'estimate' | 'observation' | 'proposal';

/** What kind of knowledge a node is: logic that cannot be otherwise, or physics that evidence could revise. */
export type Epistemic =
  /** Definitions, identities, theorems inside stated axioms: revised only by finding a flaw in the proof. */
  | 'mathematical'
  /** A physical regularity with evidence: corrigible, at a cost that grows with its depth and support (§revision). */
  | 'physical'
  /** Material, component or medium behaviour over a stated domain: data-bearing, revised by measurement. */
  | 'constitutive'
  /** A useful reduction with known limits: revised by narrowing or widening its domain. */
  | 'approximation'
  /** Not yet established. */
  | 'hypothesis'
  /** A choice about the realisation (a method, a tolerance, a budget): revised by engineering, not by physics. */
  | 'numerical';

export type ProofStatus = 'axiom' | 'proved' | 'tested' | 'provisional' | 'proposed' | 'violated';

/** What an approximation does to the physics it stands in for (its error contract, FOUNDATIONS and AUDIT-2 §F). */
export interface ErrorContract {
  /** The quantity approximated and why the approximation is needed. */
  quantity: string;
  why: string;
  method: string;
  /** What physical behaviour it distorts, how large the error can be, and what it depends on. */
  distorts: string;
  size: string;
  dependsOn: string[];
  /** How the error moves with the step and the precision. */
  stepDependence: string;
  /** Whether it can only remove energy, only add it, neither, or is not known. */
  sign: 'dissipative' | 'conservative' | 'neutral' | 'energy-generating' | 'unknown';
  /** When the result should no longer be trusted, and which test measures the error. */
  untrustedWhen: string;
  measuredBy: string;
}

export interface Domain {
  /** Named ranges, dimensionless where they can be ("Rm < 1", "feature size > 10 x slop"). */
  ranges: string[];
  /** What the law returns outside them. */
  exit: 'outside-validated-domain' | 'extrapolation' | 'model-not-available' | 'bound-only';
}

/** Code that carries a node: a module and the exported symbol, or `Class#method` for a method of an exported class. */
export interface Realised { module: string; symbol: string }

/** A property test that holds an obligation: the test file and the test's name (a substring of it). */
export interface Held { file: string; test: string }

export interface Node {
  id: string;
  kind: NodeKind;
  epistemic: Epistemic;
  name: string;
  /** The law in words, and in mathematics where it has a form. */
  statement: string;
  form?: string;
  /** What it specialises (the tree), and what it needs besides (the dependency graph). */
  parents: string[];
  dependsOn?: string[];
  /** Variables with their units; assumptions it adds to its parents'. */
  variables?: string[];
  assumptions?: string[];
  domain?: Domain;
  /** The invariant it preserves, where it is one. */
  invariant?: string;
  /** What this node obliges a realisation to keep. */
  obligations?: string[];
  proof: ProofStatus;
  realisedBy?: Realised[];
  heldBy?: Held[];
  contract?: ErrorContract;
  /** Where it comes from, for physical, constitutive and numerical nodes. */
  source?: string;
  /** Where it stops holding, in words. */
  limits?: string[];
  /** For a parameter or datum node: its value, unit and kind of number. */
  value?: { v: number; unit: string; kind: 'physical-constant' | 'datum' | 'numerical-parameter' | 'estimate' | 'environment' };
}

export const ROOT_KINDS: ReadonlySet<NodeKind> = new Set(['axiom', 'model-assumption']);

/** Every node by id, checked for duplicates. */
export function index(nodes: Node[]): Map<string, Node> {
  const m = new Map<string, Node>();
  for (const n of nodes) {
    if (m.has(n.id)) throw new Error(`law tree: two nodes called ${n.id}`);
    m.set(n.id, n);
  }
  return m;
}

/** The ancestors of a node, nearest first, following parents (the tree) and then dependencies (the graph). */
export function ancestors(nodes: Map<string, Node>, id: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (x: string) => {
    const n = nodes.get(x);
    if (!n) return;
    for (const p of [...n.parents, ...(n.dependsOn ?? [])]) if (!seen.has(p)) { seen.add(p); out.push(p); walk(p); }
  };
  walk(id);
  return out;
}

/**
 * WHY(id): the derivation path from a node up to the roots it rests on, as lines. It stops only at axioms, model
 * assumptions, data and declared estimates: never at code, which is a realisation of a node, not a reason.
 */
export function why(nodes: Map<string, Node>, id: string): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const walk = (x: string, depth: number) => {
    const n = nodes.get(x);
    if (!n) { lines.push(`${'  '.repeat(depth)}${x}: not in the tree (an orphan: not physical knowledge)`); return; }
    lines.push(`${'  '.repeat(depth)}${n.id} ${n.name} [${n.kind}, ${n.epistemic}, ${n.proof}]`);
    if (seen.has(x)) return;
    seen.add(x);
    for (const p of n.parents) walk(p, depth + 1);
    for (const d of n.dependsOn ?? []) walk(d, depth + 1);
  };
  walk(id, 0);
  return lines;
}
