// Evidence on every node and every value (docs/REALITY.md, step 8). What each node's own contribution is, read from what
// the node is (a law from its kind, a typed number as given, a maker's figures as specified, a model that leaves things
// out as simplified, a design or a guess as hypothetical), set by hand only where a rule cannot tell; with its
// assumptions, its limits and how it has been checked. The engine carries the weakest evidence along every wire, so a
// value says what it rests on, and says on the node where a result cannot be physical.

import type { BlockDef } from './blocks';
import { KINDS } from './book/kinds';
import { lawById } from './book';
import { COMPARED } from './book/compared';
import { quantityOf } from './quantities';
import { BUILT, UPDATE } from './built';

/** Strongest first. A value is as strong as the weakest thing it rests on. */
export const EVIDENCE = ['exact', 'measured', 'specified', 'derived', 'given', 'empirical', 'estimated', 'simplified', 'hypothetical'] as const;
export type EvidenceKind = (typeof EVIDENCE)[number];
export const EVIDENCE_SAYS: Record<EvidenceKind, string> = {
  exact: 'holds exactly: a definition, geometry, counting',
  measured: 'read from a measurement (a die traced, a test run)',
  specified: 'a standard\'s, a maker\'s or a reference table\'s figure',
  derived: 'worked out from what it is given by laws that hold here; no weaker than its inputs',
  given: 'set by whoever made the board',
  empirical: 'a fit to measurements, or a material\'s own behaviour: holds over the range it was fitted to',
  estimated: 'typical values or an estimate, said so',
  simplified: 'a model that leaves things out (a perception model, a rigid-body simulation, an approximation)',
  hypothetical: 'a design or a guess: what something would be, not a measurement of a thing that is',
};
export const rankOf = (k: EvidenceKind) => EVIDENCE.indexOf(k);
export const weakestOf = (...ks: EvidenceKind[]): EvidenceKind => ks.reduce((w, k) => (rankOf(k) > rankOf(w) ? k : w), 'exact');

export type Validation = 'tested here' | 'compared with an independent reference' | 'validated against experiment' | 'untested';
export interface NodeEvidence { kind: EvidenceKind; why: string; assumptions: string[]; limits: string[]; validation: Validation; validationSays: string;
  /** When its definition was last changed (src/nexus/built.ts), and whether that was before the update: built before it,
   *  its own tests may be flawed and it is not yet re-checked against what the update brought. */
  built?: string; beforeUpdate: boolean }
/** When a node was built or last rebuilt, and whether before the update (a node made on a board, not in the library, is
 *  new: after it). */
export function builtOf(id: string): { at?: string; before: boolean } { const at = BUILT[id]; return { at, before: at !== undefined && at < UPDATE }; }
export const UPDATE_SAYS = `the update of ${UPDATE.slice(0, 10)} (laws with their units, evidence and ±, materials down to their elements)`;

/** Nodes whose evidence a rule cannot read from what they are: each with why. */
const SET: Record<string, [EvidenceKind, string]> = {
  'vehicle.model': ['specified', 'a real model from its maker\'s published figures'],
  'part.family': ['specified', 'a part made to its standard\'s table'],
  'card.part': ['specified', 'a part from the library, made to its standard'],
  'battery.starter': ['specified', 'a battery by its BCI group\'s published sizes'],
  'battery.cell': ['specified', 'a cell by its format\'s published sizes'],
  'chip.transistor': ['specified', 'a FinFET at its process\'s published pitches'],
  netlist: ['measured', 'the 6502 as the Visual 6502 team traced it from the die'],
  matter: ['specified', 'the material tables, each value with its own source and evidence'],
  quantity: ['exact', 'the registry of quantities: definitions'],
  'law.fields': ['specified', 'each field\'s core laws as its textbook lists them'],
  'research.notes': ['specified', 'notes kept with their sources'],
  'math.ode': ['derived', 'the rates typed are the model; the path is worked out by a method whose error is said'],
  body: ['estimated', 'a body from de Leva\'s segment shares: an average adult\'s, not one person\'s'],
  tyre: ['estimated', 'a tyre from its size code (exact) and its inner build (typical)'],
};
const SIMPLIFIED_SIM = new Set(['letgo', 'follow', 'logic.run', 'engine.run', 'drive', 'agent', 'ctrl.pid', 'push']);
const SIMPLIFIED_PERCEIVE = new Set(['sense', 'afford', 'signature', 'gas', 'field']);

/** A node's own evidence, read from what it is. */
export function evidenceOf(b: BlockDef): NodeEvidence {
  let kind: EvidenceKind, why: string, assumptions: string[] = [], limits: string[] = [];
  const set = SET[b.id];
  if (b.kind === 'law' && b.id.startsWith('law.') && KINDS[b.id.slice(4)]) {
    const [k, w] = KINDS[b.id.slice(4)]!;
    kind = k === 'definition' || k === 'geometry' ? 'exact' : k === 'fundamental' || k === 'derived' ? 'derived' : k === 'approximation' ? 'simplified' : 'empirical';
    why = `${k}: ${w}`;
    const l = lawById(b.id.slice(4)); if (l.valid) assumptions = [l.valid]; limits = l.domain.map((d) => d.says);
  } else if (set) [kind, why] = set;
  else if (b.id.startsWith('seed.') || b.kind === 'generator' || (b.kind === 'logic' && b.ability === 'generate')) [kind, why] = ['hypothetical', 'a design: what it would be, made to the settings given'];
  else if (b.kind === 'ai' || b.id === 'search.web') [kind, why] = ['hypothetical', 'what a model or the web says, unchecked'];
  else if (SIMPLIFIED_SIM.has(b.id)) [kind, why] = ['simplified', 'a simulation: a model of the world that leaves things out'];
  else if (SIMPLIFIED_PERCEIVE.has(b.id)) [kind, why] = ['simplified', 'a model of what is seen, heard, smelled or reached'];
  else if (b.kind === 'input') [kind, why] = ['given', 'what is typed or chosen on the board'];
  else [kind, why] = ['derived', 'worked out from what is wired in'];
  if (b.valid && b.kind !== 'law') assumptions = [b.valid];
  // a node that says its own figures are typical or an estimate is no stronger than that
  if (rankOf(kind) < rankOf('estimated') && b.kind !== 'law' && /\b(an estimate|typical)\b/i.test(b.says)) { kind = 'estimated'; why += '; its own figures are typical or an estimate, as it says'; }
  // checked how: its own tests; a law reached another way through the book and agreeing; never "validated" by tests alone
  const compared = b.kind === 'law' && COMPARED.includes(b.id.slice(4));
  const validation: Validation = compared ? 'compared with an independent reference' : b.tests?.length ? 'tested here' : 'untested';
  const validationSays = compared ? 'its worked example is reached another way through the other laws, and agrees' : b.tests?.length ? `its ${b.tests.length} own test${b.tests.length > 1 ? 's' : ''}: a check that it does what it says, not that the world does` : 'no tests of its own';
  const when = builtOf(b.id);
  const says = when.before ? `${validationSays}; built ${when.at!.slice(0, 10)}, before ${UPDATE_SAYS}: its tests may be flawed, and it is not yet re-checked against it` : validationSays;
  return { kind, why, assumptions, limits, validation, validationSays: says, ...(when.at ? { built: when.at } : {}), beforeUpdate: when.before };
}

/** What a result cannot be: a mass, a density, a volume, an area, a resistance, a capacitance below nothing; an absolute
 *  temperature below absolute zero; an efficiency or a share outside nothing to one. Said, never corrected. */
const NEVER_NEGATIVE = new Set(['mass', 'density', 'volume', 'area', 'resistance', 'capacitance', 'inductance', 'moment-of-inertia', 'second-moment', 'concentration', 'amount', 'linear-density', 'areal-density']);
export function nonphysical(port: { name: string; unit?: string; label?: string }, v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  // (a port in a unit the parser does not read is left unjudged: a check never breaks what it checks)
  let q; try { q = quantityOf({ id: '' }, { sym: port.name, unit: port.unit ?? '1', name: port.label ?? port.name }); } catch { return null; }
  if (!q) return null;
  if (NEVER_NEGATIVE.has(q.id) && v < 0) return `${port.label ?? port.name} is ${v} ${port.unit ?? ''}: a ${q.name} cannot be below nothing`;
  if (q.id === 'temperature' && (port.unit === 'K' || !port.unit) && v < 0) return `${port.label ?? port.name} is ${v} K: below absolute zero`;
  if ((q.id === 'efficiency' || q.id === 'fraction') && (v < 0 || v > 1)) return `${port.label ?? port.name} is ${v}: a ${q.name} lies from nothing to one`;
  return null;
}
