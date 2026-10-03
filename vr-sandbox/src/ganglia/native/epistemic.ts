// The epistemic structure of a claim (docs/NEX-DISCOVERY.md, part 2). Nothing here is one number: a claim's
// evidence is a structure with a supporting and a contradicting ancestry, in species that answer different
// questions (a theorem and a measurement are not two rungs of one ladder); a compound claim is factored into the
// propositions evidence can actually attach to; its relation to the laws is typed (entailed, bounded, contradicted,
// outside-domain, untested, unrelated, requires-extension); all of it is held in one epistemic vector, and a human
// label (established, anomaly, radical hypothesis…) is made from the vector only at the rendering boundary, by
// structural conditions (replicated, contradicted, inside the domain), never by a scalar crossing a decimal.
//
// Human coverage, what Ego's own sources say of the things a claim names, is one coordinate of the vector and
// enters no physical label: it is a novelty coordinate, rendered beside the physical one, never under it.

import type { Law } from '../types';
import { LAWS } from '../laws';
import type { Substrate } from '../substrate/substrate';
import { d, hash, normalize, q, r, type Coords, type Evidence, type R, type Structure } from './core';
import { applicable, certificate, reaching, type Certificate, type Claim } from './discovery';

// ---- evidence species: what kind of question a leaf answers

export type Species = 'formal' | 'empirical' | 'simulation' | 'calibration' | 'none';
const SPECIES: Record<Evidence, Species> = { theorem: 'formal', derived: 'formal', measured: 'empirical', calibrated: 'calibration', simulated: 'simulation', estimated: 'calibration', extrapolated: 'calibration', hypothesized: 'none', assumed: 'none', fictional: 'none' };
/** A theorem or derivation answers "does it follow"; a measurement "was it seen"; a simulation "does the model show it"; a calibration or estimate "does a fitted model say it"; a hypothesis answers nothing yet. */
export const speciesOf = (how: Evidence): Species => SPECIES[how];

export interface Leaf { how: Evidence; species: Species; src: string; by?: string }

/** The evidence structure of one proposition: who supports it, who contradicts it, and what that amounts to by species. */
export interface Support {
  for: Leaf[];
  against: Leaf[];
  /** Independent empirical sources among the supporting leaves: 0 unmeasured, 1 measured once, 2 or more replicated. Leaves sharing a source are one. */
  replication: number;
  /** The strongest formal status: a theorem, a derivation, or none. */
  formal: 'theorem' | 'derived' | 'none';
  /** Independent sources of simulation and of calibration or model evidence. */
  simulation: number;
  calibration: number;
}

/** The bare proposition under a claim: evidence wrappers removed, evidence and verdict coordinates dropped; what is claimed, not how it is known. */
export function proposition(s: Structure): Structure {
  if (s.k === 'E') return proposition(s.of);
  if (s.k === 'R' || s.k === 'T') {
    const c: Coords = { ...s.c };
    delete c.ev; delete c.mode; delete c.margin; delete c.against;
    return { ...s, c };
  }
  return s;
}

/** The evidence leaves on a structure: its evidence wrappers, outermost first, and the evidence coordinate on its core. */
export function leavesOf(s: Structure): Leaf[] {
  const out: Leaf[] = [];
  let x = s;
  while (x.k === 'E') { out.push({ how: x.how, species: speciesOf(x.how), src: x.src, ...(x.by ? { by: x.by } : {}) }); x = x.of; }
  if ((x.k === 'R' || x.k === 'T') && x.c.ev) for (const src of x.c.ev.src?.length ? x.c.ev.src : ['unsourced']) out.push({ how: x.c.ev.how, species: speciesOf(x.c.ev.how), src });
  return out;
}

const leafKey = (l: Leaf): string => `${l.how}|${l.src}|${l.by ?? ''}`;
const dedupe = (ls: Leaf[]): Leaf[] => { const seen = new Set<string>(); return ls.filter((l) => !seen.has(leafKey(l)) && seen.add(leafKey(l))); };
const sources = (ls: Leaf[], species: Species): number => new Set(ls.filter((l) => l.species === species).map((l) => l.src)).size;

/** What a supporting and a contradicting ancestry amount to. */
export function tally(forLeaves: Leaf[], againstLeaves: Leaf[]): Support {
  const f = dedupe(forLeaves), a = dedupe(againstLeaves);
  return { for: f, against: a, replication: sources(f, 'empirical'), formal: f.some((l) => l.how === 'theorem') ? 'theorem' : f.some((l) => l.how === 'derived') ? 'derived' : 'none', simulation: sources(f, 'simulation'), calibration: sources(f, 'calibration') };
}

/**
 * The evidence structure of a claim within a corpus: the leaves on the claim itself and every evidence wrapper of
 * the same proposition support it; every `support(a, b)` whose b is the proposition adds a's leaves; every
 * `contradict(a, b)` with the proposition on one side puts the other side's leaves against it. A supporting leaf
 * never erases a contradicting one: both ancestries are kept.
 */
export function evidenceOf(claim: Structure, corpus: Structure[] = []): Support {
  const key = hash(normalize(proposition(claim)));
  const same = (x: Structure): boolean => hash(normalize(proposition(x))) === key;
  const forLeaves = leavesOf(claim), againstLeaves: Leaf[] = [];
  for (const x of corpus) {
    if (x === claim) continue;
    if (x.k === 'E' && same(x)) forLeaves.push(...leavesOf(x));
    if (x.k !== 'R' || x.args.length !== 2) continue;
    const [a, b] = x.args as [Structure, Structure];
    if (x.op === 'support' && same(b)) forLeaves.push(...leavesOf(a));
    if (x.op === 'contradict') { if (same(a)) againstLeaves.push(...leavesOf(b)); if (same(b)) againstLeaves.push(...leavesOf(a)); }
  }
  return tally(forLeaves, againstLeaves);
}

// ---- factoring a compound claim into the propositions evidence attaches to

export interface Proposition { role: 'exists' | 'quantity' | 'mechanism' | 'relation'; s: Structure; support: Support }

/**
 * "This device gives 4 N because of X" is three propositions: the device exists, its thrust is 4 N, and X causes
 * the thrust. A measurement on the compound observes the quantity and, through it, the thing; it does not observe
 * the mechanism, which gets only the evidence placed on it in its own right.
 */
export function factor(s: Structure, corpus: Structure[] = []): Proposition[] {
  const outer = leavesOf(s);
  const core = proposition(s);
  const withOuter = (p: Structure): Support => { const own = evidenceOf(p, corpus); return tally([...outer, ...own.for], own.against); };
  if (core.k === 'R' && core.op === 'quantity') {
    const thing = core.args.find((a): a is ReturnType<typeof d> => a.k === 'D');
    const mech = core.c.mech;
    const bare: R = { ...core, c: { ...core.c } };
    delete bare.c.mech;
    const out: Proposition[] = [];
    if (thing) out.push({ role: 'exists', s: thing, support: withOuter(thing) });
    out.push({ role: 'quantity', s: bare, support: withOuter(bare) });
    if (mech) { const m = r('influence', [d(mech), bare], { dir: 1 }); out.push({ role: 'mechanism', s: m, support: evidenceOf(m, corpus) }); }
    return out;
  }
  const out: Proposition[] = [];
  if (core.k === 'R') for (const a of core.args) if (a.k === 'D') out.push({ role: 'exists', s: a, support: withOuter(a) });
  out.push({ role: 'relation', s: core, support: withOuter(core) });
  return out;
}

// ---- the typed relation of a claim to the laws

export type TheoryRelation = 'entailed' | 'bounded' | 'contradicted' | 'outside-domain' | 'untested' | 'unrelated' | 'requires-extension' | 'undefined';
export interface Theory { relation: TheoryRelation; law?: Law; value?: number; certificate?: Certificate; why: string }

/**
 * Entailed: an equality law computes the claimed value within the stated uncertainty. Bounded: a bound law admits
 * it. Contradicted: a certificate exists. Outside-domain: the laws that reach it do not hold at these inputs.
 * Untested: laws reach the quantity but need inputs not given. Unrelated: no law computes or bounds the quantity.
 * Requires-extension: the claim credits a mechanism that is no law and no thing the book has. Undefined: the unit
 * cannot be read.
 */
export function theory(c: Claim, s?: Substrate | null): Theory {
  if (c.mechanism && !LAWS.some((l) => l.id === c.mechanism) && !s?.get(c.mechanism)) return { relation: 'requires-extension', why: `${c.mechanism} is no law and no thing I have: explaining ${c.quantity} by it needs a structure the book lacks` };
  const { laws, dim } = reaching(c);
  if (!dim) return { relation: 'undefined', why: `${c.unit} is not a unit I can read` };
  if (!laws.length) return { relation: 'unrelated', why: `no law of mine computes or bounds ${c.quantity} in ${c.unit}` };
  if (!laws.some((l) => applicable(l, c.inputs))) { const cert = certificate(c); return { relation: 'untested', why: cert.impossible ? cert.derivation : cert.why }; }
  const cert = certificate(c);
  if (cert.impossible) return { relation: 'contradicted', law: cert.law, value: cert.bound, certificate: cert, why: cert.derivation };
  if (cert.mode === 'true') return { relation: cert.sense === 'equal' ? 'entailed' : 'bounded', law: cert.law, value: cert.bound, certificate: cert, why: cert.why };
  if (cert.mode === 'outside-domain') return { relation: 'outside-domain', law: cert.law, why: cert.why };
  return { relation: 'untested', why: cert.why };
}

// ---- the epistemic vector, and the labels made from it at the rendering boundary

export interface Epistemic {
  formal: Support['formal'];
  empirical: { replication: number; against: number };
  simulation: number;
  calibration: number;
  theory: TheoryRelation;
  domain: 'inside' | 'outside' | 'unknown';
  /** Human coverage: what Ego's sources say of the things the claim names, 0 to 1; a novelty coordinate, orthogonal to all the others. */
  coverage: number;
  /** The claim's own relative uncertainty when it states one. */
  uncertainty: number | null;
  /** The relative difference between the claim and the value a law computes or bounds, when one does. */
  discrepancy: number | null;
}

const LAW_SYMBOLS: ReadonlySet<string> = new Set(LAWS.flatMap((l) => [l.output.sym, ...l.inputs.map((x) => x.sym)]));
const distinctions = (s: Structure, out: string[] = []): string[] => {
  switch (s.k) {
    case 'D': out.push(s.id); break;
    case 'R': for (const x of s.args) distinctions(x, out); break;
    case 'T': distinctions(s.from, out); distinctions(s.to, out); break;
    case 'E': distinctions(s.of, out); break;
    case 'C': distinctions(s.body, out); break;
    default: break;
  }
  return out;
};

/** Human coverage of the things a structure names: the substrate's own source confidence, averaged; a coined name scores 0; a law's symbol belongs to the theory axis and is left out. */
export function coverage(s: Structure, substrate: Substrate | null | undefined): number {
  const ids = [...new Set(distinctions(s))].filter((id) => !LAW_SYMBOLS.has(id));
  const covered = ids.map((id) => { const ent = substrate?.get(id); return ent ? Math.max(0, Math.min(1, ent.coverage.confidence)) * (ent.coverage.sourceKind === 'stub' ? 0.2 : 1) : 0; });
  return covered.length ? Math.round((covered.reduce((a, b) => a + b, 0) / covered.length) * 100) / 100 : 0;
}

/** The epistemic vector of a claim: its evidence structure, its relation to the laws, its coverage, its uncertainty, held apart. */
export function epistemic(h: Structure, opts: { substrate?: Substrate | null; corpus?: Structure[]; claim?: Claim } = {}): Epistemic {
  const sup = evidenceOf(h, opts.corpus ?? []);
  // without a claim, the structure's own verdict: a contradiction or an exclusion it carries, or a law it was derived from (its mechanism a law of the book)
  const lawBehind = h.k === 'R' && h.c.mode === 'true' && !!h.c.mech && LAWS.some((l) => h.c.mech === l.id || h.c.mech!.startsWith(`${l.id}/`) || h.c.mech === `${l.id}^-1`);
  const th: Theory = opts.claim ? theory(opts.claim, opts.substrate) : h.k === 'R' && (h.c.mode === 'impossible-under' || h.c.mode === 'contradictory') ? { relation: 'contradicted', why: 'the structure carries the verdict' } : h.k === 'R' && h.c.mode === 'outside-domain' ? { relation: 'outside-domain', why: 'the structure carries the verdict' } : lawBehind ? { relation: 'entailed', why: `derived from ${h.k === 'R' ? h.c.mech : ''}, a law of the book` } : { relation: 'untested', why: 'no claim against the laws was made' };
  const domain: Epistemic['domain'] = th.relation === 'entailed' || th.relation === 'bounded' || th.relation === 'contradicted' ? 'inside' : th.relation === 'outside-domain' ? 'outside' : 'unknown';
  const claimed = opts.claim ? q(opts.claim.value, opts.claim.unit).v : null;
  const discrepancy = th.value !== undefined && claimed !== null && th.value !== 0 ? Math.abs(claimed - th.value) / Math.abs(th.value) : null;
  return { formal: sup.formal, empirical: { replication: sup.replication, against: sup.against.length }, simulation: sup.simulation, calibration: sup.calibration, theory: th.relation, domain, coverage: coverage(h, opts.substrate), uncertainty: opts.claim?.rel ?? null, discrepancy };
}

export interface Label { physical: string; novelty: string; said: string }

/**
 * The human label, made from the vector by structural conditions and nothing else: contested when measurements
 * stand both ways; an anomaly when a measurement is contradicted by a law, replicated or not; established when a
 * law entails or bounds it and it is replicated; and so on. Coverage never enters the physical label.
 */
export function labelOf(e: Epistemic): Label {
  const n = e.empirical.replication;
  const measured = n >= 2 ? 'replicated' : n === 1 ? 'measured once' : e.simulation ? 'in simulation' : e.calibration ? 'in a fitted model' : e.formal !== 'none' ? (e.formal === 'theorem' ? 'by theorem' : 'by derivation') : 'unmeasured';
  let physical: string;
  if (e.empirical.against > 0 && n > 0) physical = `contested: measurements both ways (${n} for, ${e.empirical.against} against)`;
  else if (e.theory === 'contradicted') physical = n >= 2 ? 'replicated anomaly: measured by independent sources, contradicted by a law' : n === 1 ? 'anomaly, measured once: contradicted by a law' : e.simulation || e.calibration ? `anomaly ${measured}: contradicted by a law` : e.formal !== 'none' ? `derivation against a law (${measured})` : 'radical hypothesis: contradicted by a law, unmeasured';
  else if (e.theory === 'entailed' || e.theory === 'bounded') physical = n >= 2 ? `established: ${e.theory} by a law, replicated` : `consistent: ${e.theory} by a law, ${measured}`;
  else if (e.theory === 'outside-domain') physical = `outside the laws' domain, ${measured}`;
  else if (e.theory === 'requires-extension') physical = `needs a mechanism the book lacks, ${measured}`;
  else if (e.theory === 'undefined') physical = 'ill-typed';
  else physical = n >= 2 ? `replicated, ${e.theory} by any law` : n === 1 ? `measured once, ${e.theory} by any law` : e.formal !== 'none' || e.simulation || e.calibration ? `${measured}, ${e.theory} by any law` : 'untested';
  const novelty = e.coverage === 0 ? 'unseen by sources' : e.coverage < 1 ? 'partly covered by sources' : 'covered by sources';
  return { physical, novelty, said: `${physical}; ${novelty}` };
}

/** The vector, said in full. */
export const sayEpistemic = (e: Epistemic): string => `formal ${e.formal}; empirical ${e.empirical.replication} for, ${e.empirical.against} against; simulation ${e.simulation}; calibration ${e.calibration}; theory ${e.theory} (domain ${e.domain}); coverage ${e.coverage}; uncertainty ${e.uncertainty ?? 'unstated'}; discrepancy ${e.discrepancy === null ? 'none' : e.discrepancy.toPrecision(3)}`;
