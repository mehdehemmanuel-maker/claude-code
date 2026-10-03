// Nex and the Nexus are one system (section X of docs/EGO-NATIVE-LANGUAGE.md): a law of the book, a node of the law
// tree, an arrow of the substrate each have a native form, built here from what they already carry (inputs, output,
// validity, source, confidence, proof status), so nothing is said twice. Tuners (section L) are projections of a
// thing's structures: the same motor seen through energy, heat, control, failure or making.

import { dimensionOf } from '../units';
import type { Law, Source } from '../types';
import type { Node } from '../tree/schema';
import type { Entity, Relation } from '../substrate/model';
import type { Substrate } from '../substrate/substrate';
import { spokenName } from '../substrate/names';
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

/** The operator each arrow of the substrate is; `swap` where the arrow is written from the thing but the influence runs to it (a failure lowers the thing; a requirement is necessary for it). */
const OP_OF_RELATION: Partial<Record<Relation['kind'], { op: R['op']; c?: Coords; swap?: boolean }>> = {
  'is-a': { op: 'kind' }, 'has-part': { op: 'part' }, 'made-of': { op: 'part' }, does: { op: 'function' }, 'governed-by': { op: 'constrain' },
  'fails-by': { op: 'influence', c: { dir: 1, polarity: '-', necessity: 'contributing' }, swap: true }, requires: { op: 'influence', c: { dir: 1, polarity: '+', necessity: 'necessary' }, swap: true },
  enables: { op: 'influence', c: { dir: 1, polarity: '+', necessity: 'contributing' } }, prevents: { op: 'influence', c: { dir: 1, polarity: '-', necessity: 'contributing' } },
  'analogous-to': { op: 'same', c: { mode: 'unknown' } }, 'coarse-grains-to': { op: 'abstract' }, 'invariant-under': { op: 'invariant' }, 'measured-by': { op: 'morphism' },
  'standardized-by': { op: 'constrain' }, 'connects-to': { op: 'morphism' }, 'interacts-with': { op: 'influence', c: { dir: 0 } }, 'produced-by': { op: 'morphism' }, transforms: { op: 'morphism' }, plays: { op: 'kind' },
};

/** An arrow of the substrate as a structure: its operator by kind, its confidence as uncertainty, its source as evidence. */
export function fromRelation(rel: Relation, s?: Substrate): R | null {
  const map = OP_OF_RELATION[rel.kind];
  if (!map) return null;
  const alias = (id: string): D => { const ent = s?.get(id); return d(id, ent ? { en: spokenName(ent) } : undefined); };
  const how: Evidence = 'stub' in rel.source ? 'assumed' : 'derived' in rel.source ? 'derived' : 'estimate' in rel.source ? 'estimated' : 'cite' in rel.source ? evidenceOfSource({ cite: rel.source.cite, kind: (rel.source as { kind?: Source['kind'] }).kind ?? 'textbook' }) : 'assumed';
  const c: Coords = { ...(map.c ?? {}), cert: { kind: 'interval', lo: Math.round(Math.max(0, rel.confidence - 0.1) * 1000) / 1000, hi: Math.round(Math.min(1, rel.confidence + 0.1) * 1000) / 1000, source: 'epistemic' }, ev: { how }, mode: map.c?.mode ?? 'true' };
  return r(map.op, map.swap ? [alias(rel.to), alias(rel.from)] : [alias(rel.from), alias(rel.to)], c);
}

/**
 * Everything the substrate says of a thing, as structures, for its fingerprint (section Q): its arrows, and, when the
 * law book is given, the laws that govern it as structures too, so that dimensions enter the fingerprint (a spring and
 * a capacitor both store an energy: the same shape under the energy tuner, whatever either is called).
 */
export function saidOf(s: Substrate, id: string, laws?: Map<string, Law>): Structure[] {
  const out: Structure[] = [];
  const ent = s.get(id);
  const self = d(id, ent ? { en: spokenName(ent) } : undefined);
  for (const rel of s.outOf(id)) {
    const x = fromRelation(rel, s);
    if (x) out.push(x);
    if (laws && rel.kind === 'governed-by') { const law = laws.get(rel.to); if (law) out.push(r('constrain', [self, fromLaw(law)], { mode: 'true', ev: { how: evidenceOfSource(law.source) } })); }
  }
  for (const rel of s.into(id)) { const x = fromRelation(rel, s); if (x) out.push(x); }
  // what governs its kinds governs it (inheritance along is-a), said as derived
  if (laws) for (const kind of s.reach(id, 'is-a')) for (const rel of s.outOf(kind.id, 'governed-by')) { const law = laws.get(rel.to); if (law) out.push(r('constrain', [self, fromLaw(law)], { mode: 'true', ev: { how: 'derived', src: [`as ${spokenName(kind)}`] } })); }
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

// ---- human → native (section M), from what the substrate knows of a thing

/** The stems a complaint word points at in what a failure says of itself: the human side of the lexicon, never a structure. */
const SYMPTOM_STEMS: Record<string, string[]> = {
  noisy: ['noise', 'vibrat', 'rattl', 'wear', 'spall', 'brinell', 'imbalance', 'loose'], loud: ['noise', 'vibrat', 'imbalance'], rough: ['wear', 'spall', 'brinell', 'pit', 'scor', 'galling'],
  hot: ['heat', 'temperature', 'overheat', 'thermal', 'joule', 'friction'], warm: ['heat', 'temperature', 'overheat'], smoking: ['overheat', 'insulation', 'burn'], smelly: ['overheat', 'insulation', 'burn'],
  slow: ['speed', 'stall', 'drag', 'friction', 'wear', 'resistance'], weak: ['torque', 'stall', 'demagnet', 'wear', 'fatigue', 'voltage'], struggling: ['stall', 'torque', 'overheat', 'current', 'wear', 'friction'],
  stuck: ['stall', 'jam', 'seiz', 'galling', 'lubricant', 'corrosion'], seized: ['seiz', 'galling', 'lubricant', 'corrosion', 'overheat'], jammed: ['jam', 'seiz', 'obstruct'],
  slipping: ['slip', 'friction', 'wear', 'loosen'], loose: ['loosen', 'wear', 'fatigue', 'creep', 'backlash'], wobbly: ['imbalance', 'loosen', 'bearing', 'wear', 'misalign'], vibrating: ['imbalance', 'resonan', 'loosen', 'misalign'],
  leaking: ['leak', 'seal', 'crack', 'corrosion'], cracked: ['crack', 'fatigue', 'overload', 'brittle'], bent: ['yield', 'overload', 'buckl'], broken: ['fracture', 'overload', 'fatigue', 'shear'],
  sparking: ['brush', 'arc', 'insulation', 'commutat'], dead: ['open', 'insulation', 'fuse', 'burn', 'demagnet', 'voltage'], flickering: ['loose', 'contact', 'voltage', 'brush'],
};

/** The stems of a complaint word: its table entry, plus the word and its root (noisy: nois; slipping: slip). */
export function symptomStems(word: string): string[] {
  const w = word.toLowerCase();
  const root = w.replace(/(?:ing|ed|ies|y|s)$/, '');
  return [...new Set([...(SYMPTOM_STEMS[w] ?? []), w, ...(root.length >= 3 ? [root] : [])])];
}

/**
 * What "that bearing is noisy" may mean, from the bearing's own failure modes (its own, its kinds', its materials'):
 * every mode whose name or saying carries a stem of the word, each a candidate held as not yet measured, with an
 * uncertainty no higher than its share, and what would settle it (a sensor the thing or its quantities are measured
 * by, else a reading of the law's own inputs). Nothing is chosen.
 */
export function symptoms(s: Substrate, thing: Entity, word: string, laws?: Map<string, Law>): { structure: R; cert: NonNullable<Coords['cert']>; settledBy: string; says: string; failure: Entity }[] {
  const stems = symptomStems(word);
  const modes = new Map<string, Entity>();
  for (const f of s.reach(thing.id, 'fails-by')) modes.set(f.id, f);
  for (const k of s.reach(thing.id, 'is-a')) for (const f of s.reach(k.id, 'fails-by')) modes.set(f.id, f);
  for (const m of s.reach(thing.id, 'made-of')) for (const f of s.reach(m.id, 'fails-by')) modes.set(f.id, f);
  // a generic thing with no failure of its own ("a motor") fails as its kinds do (a brushed DC motor, a brushless one)
  if (!modes.size) for (const rel of s.into(thing.id, 'is-a')) for (const f of s.reach(rel.from, 'fails-by')) modes.set(f.id, f);
  const hits = [...modes.values()].filter((f) => { const hay = `${f.id} ${f.name} ${f.says}`.toLowerCase(); return stems.some((st) => hay.includes(st)); });
  if (!hits.length) return [];
  const share = 1 / hits.length;
  const self = d(thing.id, { en: spokenName(thing) });
  return hits.map((f) => {
    const sensors = [...s.reach(f.id, 'measured-by'), ...s.reach(thing.id, 'measured-by')].map(spokenName);
    const inputs = laws ? s.reach(f.id, 'governed-by').flatMap((l) => laws.get(l.id)?.inputs.map((x) => x.name) ?? []) : [];
    const settledBy = sensors.length ? `a ${sensors[0]}` : inputs.length ? `measuring ${[...new Set(inputs)].slice(0, 2).join(' and ')}` : 'inspection';
    const cert: NonNullable<Coords['cert']> = { kind: 'interval', lo: 0, hi: Math.min(1, share * 2), source: 'epistemic' };
    const structure = r('influence', [d(f.id, { en: spokenName(f) }), self], { dir: 1, polarity: '-', necessity: 'contributing', cert, mode: 'unmeasured', instrument: settledBy, ev: { how: 'hypothesized', src: [`said: "${word}"`] } });
    const first = f.says.split(/(?<=[a-z0-9%°)])[:;.] /)[0]!.replace(/\.$/, '');
    return { structure, cert, settledBy, says: `${spokenName(f)}: ${first.charAt(0).toLowerCase()}${first.slice(1)}`, failure: f };
  });
}
