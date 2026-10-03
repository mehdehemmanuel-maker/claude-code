// Nex and the Nexus are one system (section X of docs/EGO-NATIVE-LANGUAGE.md): a law of the book, a node of the law
// tree, an arrow of the substrate each have a native form, built here from what they already carry (inputs, output,
// validity, source, confidence, proof status), so nothing is said twice. Tuners (section L) are projections of a
// thing's structures: the same motor seen through energy, heat, control, failure or making.

import { dimensionOf } from '../units';
import type { Law, Source } from '../types';
import type { Node } from '../tree/schema';
import type { Entity, Relation } from '../substrate/model';
import type { Substrate } from '../substrate/substrate';
import { d, e, q, r, type Coords, type D, type Evidence, type Mode, type R, type Structure } from './core';

/** How a source of the law book is known, in the evidence morphology. */
export function evidenceOfSource(src: Source | undefined): Evidence {
  switch (src?.kind) {
    case 'textbook': case 'paper': case 'patent': return 'derived';
    case 'standard': case 'handbook': case 'database': case 'distributor': return 'calibrated';
    case 'maker': return 'measured';
    case 'rule of thumb': case 'press': return 'estimated';
    default: return src?.cite ? 'derived' : 'assumed';
  }
}

/** A proof status of the tree, as evidence. */
export function evidenceOfProof(proof: Node['proof'], epistemic: Node['epistemic']): Evidence {
  if (proof === 'axiom') return 'assumed';
  if (proof === 'proved') return epistemic === 'mathematical' ? 'theorem' : 'derived';
  if (proof === 'tested') return 'simulated';
  if (proof === 'provisional') return 'hypothesized';
  return 'hypothesized';
}

/**
 * A law as a structure: its output quantity is a function of its input quantities (each a distinction bound to a
 * dimension), mediated by the law itself, known as its source is, valid where it says, in mode true. The English
 * statement is an alias on the law's distinction, outside the hash.
 */
export function fromLaw(law: Law): R {
  const inputs = law.inputs.map((x) => r('quantity', [d(x.sym, { en: x.name }), q(0, x.unit)], {}));
  const output = r('quantity', [d(law.output.sym, { en: law.output.name }), q(0, law.output.unit)], {});
  const c: Coords = { dir: 1, mech: law.id, mode: 'true', ev: { how: evidenceOfSource(law.source), src: [law.source.cite] }, dom: [d(`valid:${law.id}`, { en: law.valid })] };
  return r('function', [d(law.id, { en: law.name, statement: law.statement, formula: law.formula }), r('state', inputs, {}), output], c);
}

/** Evaluate a law's structure with quantities bound by symbol: the structure is executable through the book (section X). */
export function evaluate(s: R, laws: Map<string, Law>, bound: Record<string, number>): { value: number; dim: number[]; mode: Mode; why?: string } {
  const id = s.c.mech;
  const law = id ? laws.get(id) : undefined;
  if (!law) return { value: NaN, dim: [0, 0, 0, 0, 0], mode: 'unmodelled', why: 'no law stands behind this structure' };
  const outside = law.outside?.(bound);
  if (outside) return { value: NaN, dim: dimensionOf(law.output.unit), mode: 'outside-domain', why: outside };
  const missing = law.inputs.filter((x) => bound[x.sym] === undefined).map((x) => x.sym);
  if (missing.length) return { value: NaN, dim: dimensionOf(law.output.unit), mode: 'unknown', why: `unbound: ${missing.join(', ')}` };
  return { value: law.eval(bound), dim: dimensionOf(law.output.unit), mode: 'true' };
}

/** A node of the law tree as a structure: what it specialises (kind), how it is held (evidence of its proof), where it stops (its limits as domain). */
export function fromNode(node: Node): Structure[] {
  const self = d(node.id, { en: node.name, statement: node.statement });
  const ev = { how: evidenceOfProof(node.proof, node.epistemic) };
  const out: Structure[] = node.parents.map((p) => r('kind', [self, d(p)], { ev }));
  if (!out.length) out.push(r('kind', [self, d('root')], { ev }));
  for (const h of node.heldBy ?? []) out.push(e(self, 'simulated', `${h.file}: ${h.test}`));
  for (const x of node.realisedBy ?? []) out.push(r('morphism', [self, d(`${x.module}#${x.symbol}`)], { ev, mode: 'true' }));
  if (node.limits?.length) out.push(r('constrain', [self, r('state', node.limits.map((l) => d(`limit:${node.id}:${l.slice(0, 24)}`, { en: l })), {})], { mode: 'outside-domain' }));
  return out;
}

const OP_OF_RELATION: Partial<Record<Relation['kind'], { op: R['op']; c?: Coords }>> = {
  'is-a': { op: 'kind' }, 'has-part': { op: 'part' }, 'made-of': { op: 'part' }, does: { op: 'function' }, 'governed-by': { op: 'constrain' },
  'fails-by': { op: 'influence', c: { dir: 1, polarity: '-', necessity: 'contributing' } }, requires: { op: 'influence', c: { dir: 1, polarity: '+', necessity: 'necessary' } },
  enables: { op: 'influence', c: { dir: 1, polarity: '+', necessity: 'contributing' } }, prevents: { op: 'influence', c: { dir: 1, polarity: '-', necessity: 'contributing' } },
  'analogous-to': { op: 'same', c: { mode: 'unknown' } }, 'coarse-grains-to': { op: 'abstract' }, 'invariant-under': { op: 'invariant' }, 'measured-by': { op: 'morphism' },
  'standardized-by': { op: 'constrain' }, 'connects-to': { op: 'morphism' }, 'interacts-with': { op: 'influence', c: { dir: 0 } }, 'produced-by': { op: 'morphism' }, transforms: { op: 'morphism' }, plays: { op: 'kind' },
};

/** An arrow of the substrate as a structure: its operator by kind, its confidence as uncertainty, its source as evidence. */
export function fromRelation(rel: Relation, s?: Substrate): R | null {
  const map = OP_OF_RELATION[rel.kind];
  if (!map) return null;
  const alias = (id: string): D => { const ent = s?.get(id); return d(id, ent ? { en: ent.name } : undefined); };
  const how: Evidence = 'stub' in rel.source ? 'assumed' : 'derived' in rel.source ? 'derived' : 'estimate' in rel.source ? 'estimated' : 'cite' in rel.source ? evidenceOfSource({ cite: rel.source.cite, kind: (rel.source as { kind?: Source['kind'] }).kind ?? 'textbook' }) : 'assumed';
  const c: Coords = { ...(map.c ?? {}), cert: { kind: 'interval', lo: Math.max(0, rel.confidence - 0.1), hi: Math.min(1, rel.confidence + 0.1), source: 'epistemic' }, ev: { how }, mode: map.c?.mode ?? 'true' };
  return r(map.op, [alias(rel.from), alias(rel.to)], c);
}

/**
 * Everything the substrate says of a thing, as structures, for its fingerprint (section Q): its arrows, and, when the
 * law book is given, the laws that govern it as structures too, so that dimensions enter the fingerprint (a spring and
 * a capacitor both store an energy: the same shape under the energy tuner, whatever either is called).
 */
export function saidOf(s: Substrate, id: string, laws?: Map<string, Law>): Structure[] {
  const out: Structure[] = [];
  for (const rel of s.outOf(id)) {
    const x = fromRelation(rel, s);
    if (x) out.push(x);
    if (laws && rel.kind === 'governed-by') { const law = laws.get(rel.to); if (law) out.push(r('constrain', [d(id), fromLaw(law)], { mode: 'true', ev: { how: evidenceOfSource(law.source) } })); }
  }
  for (const rel of s.into(id)) { const x = fromRelation(rel, s); if (x) out.push(x); }
  // what governs its kinds governs it (inheritance along is-a), said as derived
  if (laws) for (const kind of s.reach(id, 'is-a')) for (const rel of s.outOf(kind.id, 'governed-by')) { const law = laws.get(rel.to); if (law) out.push(r('constrain', [d(id), fromLaw(law)], { mode: 'true', ev: { how: 'derived', src: [`as ${kind.id}`] } })); }
  return out;
}

// ---- tuners (section L): one structure, many projections

export type Tuner = 'energy' | 'thermal' | 'control' | 'failure' | 'manufacturing' | 'causal' | 'structure' | 'english';

const dimHas = (s: Structure, test: (dim: number[]) => boolean): boolean => (s.k === 'Q' ? test(s.dim) : s.k === 'R' ? s.args.some((x) => dimHas(x, test)) : s.k === 'T' ? dimHas(s.from, test) || dimHas(s.to, test) : false);
const idHas = (s: Structure, re: RegExp): boolean => (s.k === 'D' ? re.test(s.id) : s.k === 'R' ? s.args.some((x) => idHas(x, re)) : s.k === 'T' ? idHas(s.from, re) || idHas(s.to, re) : false);

/** Keep of a thing's structures what a tuner selects: the energy tuner keeps energy and power, the failure tuner what lowers its functions, and so on. */
export function tune(said: Structure[], tuner: Tuner): Structure[] {
  switch (tuner) {
    case 'energy': return said.filter((x) => dimHas(x, (dim) => dim[0] === 1 && dim[1] === 2 && (dim[2] === -2 || dim[2] === -3)) || idHas(x, /energy|power|work|store|battery|cell|efficien/));
    case 'thermal': return said.filter((x) => dimHas(x, (dim) => dim[4] !== 0) || idHas(x, /heat|thermal|temperature|cool|insulat|conduct/));
    case 'control': return said.filter((x) => idHas(x, /control|feedback|sensor|command|loop|servo|driver|regulat/));
    case 'failure': return said.filter((x) => x.k === 'R' && x.op === 'influence' && x.c.polarity === '-');
    case 'manufacturing': return said.filter((x) => x.k === 'R' && (idHas(x, /process\.|tool\.|machine\./) || (x.op === 'morphism' && idHas(x, /process/))));
    case 'causal': return said.filter((x) => x.k === 'R' && x.op === 'influence');
    case 'structure': return said.filter((x) => x.k === 'R' && (x.op === 'part' || x.op === 'kind'));
    case 'english': return said;
  }
}

export const entityAlias = (ent: Entity): D => d(ent.id, { en: ent.name });
