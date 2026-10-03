// The population process: a persistent, prioritised queue of questions (an entity and a facet), workers partitioned by
// domain, expanders that answer a question from a source (a seed pack's deep knowledge, a derivation rule over what
// is already known, an external source when one is connected), and a pipeline for every answer: discover, extract,
// normalise, decompose, classify, relate, cross-link, deduplicate, validate, assign provenance, build manifolds, build
// generators, build construction paths, queue deeper. Every discovery can make more questions; the queue converges
// when no question yields anything new or the budget is spent. Known is never complete: coverage says how far.
import { FACETS, KINDS, NAMED_AS, RELATION_KINDS, normalizeId, type Discovery, type Entity, type Facet, type Relation } from './model';
import { Substrate } from './substrate';
import type { Pack } from './dsl';
import { LAWS } from '../laws';
import { articled, findByWords, singular } from './names';

export interface WorkItem { id: string; facet: Facet; mode: 'fast' | 'deep'; priority: number; reason: string; domain: string }

/** A priority queue of questions, deduplicated, serialisable so population can be resumed. */
export class Queue {
  private items: WorkItem[] = [];
  private readonly keys = new Set<string>();
  readonly done = new Set<string>();
  /** Queue a question once; asking a queued question again with more urgency raises it. False when it was known already. */
  push(w: WorkItem): boolean {
    const key = `${w.id}|${w.facet}|${w.mode}`;
    if (this.keys.has(key)) {
      const have = this.items.find((x) => x.id === w.id && x.facet === w.facet && x.mode === w.mode);
      if (have && w.priority > have.priority) { have.priority = w.priority; have.reason = w.reason; }
      return false;
    }
    if (this.done.has(key)) return false;
    this.keys.add(key);
    this.items.push(w);
    return true;
  }
  /** The most valuable question, in one domain, in a set of domains (a worker's lane), or anywhere. */
  pop(domain?: string | string[]): WorkItem | undefined {
    const inLane = (d: string) => !domain || (typeof domain === 'string' ? d === domain : domain.includes(d));
    let best = -1;
    for (let i = 0; i < this.items.length; i++) if (inLane(this.items[i]!.domain) && (best < 0 || this.items[i]!.priority > this.items[best]!.priority)) best = i;
    if (best < 0) return undefined;
    const [w] = this.items.splice(best, 1);
    const key = `${w!.id}|${w!.facet}|${w!.mode}`;
    this.keys.delete(key);
    this.done.add(key);
    return w;
  }
  /** Ask a question again although it was asked before: something it depends on has changed. */
  again(w: WorkItem): boolean { this.done.delete(`${w.id}|${w.facet}|${w.mode}`); return this.push(w); }
  get size(): number { return this.items.length; }
  domains(): string[] { return [...new Set(this.items.map((w) => w.domain))]; }
  peek(n = 10): WorkItem[] { return [...this.items].sort((a, b) => b.priority - a.priority).slice(0, n); }
  serialize(): string { return JSON.stringify({ items: this.items, done: [...this.done] }); }
  static restore(text: string): Queue {
    const q = new Queue();
    const { items, done } = JSON.parse(text) as { items: WorkItem[]; done: string[] };
    for (const d of done) q.done.add(d);
    for (const w of items) q.push(w);
    return q;
  }
}

/**
 * How much a question is worth asking now: entities that unlock others (many things require or are made by them),
 * that are constructors, materials or functions, that are well connected, that are little known, and that engineering
 * leans on. Stubs named by many things come first: they are the frontier.
 */
/** What a facet is worth asking, over the entity's own priority. */
const FACET_WEIGHT: Record<Facet, number> = { constructors: 3, components: 2.5, materials: 2, mechanisms: 2, functions: 2, manufacturing: 2, laws: 1.5, failures: 1.5, interfaces: 1.5, variants: 1, standards: 1, analogues: 1, manifolds: 1, transformations: 1.5, properties: 1 };

/** The entity's part of a question's priority: how connected, how much it unlocks, its leverage, how uncertain, whether engineering. */
export function priorityBase(s: Substrate, e: Entity): number {
  const inbound = s.into(e.id).length, outbound = s.outOf(e.id).length;
  const unlock = s.into(e.id, 'requires').length + s.into(e.id, 'produced-by').length + s.into(e.id, 'has-part').length + s.into(e.id, 'made-of').length;
  const leverage = (e.kinds.includes('constructor') || e.kinds.includes('process') ? 3 : 0) + (e.kinds.includes('material') ? 2 : 0) + (e.kinds.includes('function') ? 2 : 0) + (e.kinds.includes('manifold') ? 2 : 0) + (e.kinds.includes('law') ? 1 : 0);
  const uncertainty = (3 - e.coverage.depth) * 2 + (1 - e.coverage.confidence) * 3;
  const engineering = e.domains.some((d) => ['mechanical', 'electrical', 'manufacturing', 'materials', 'robotics', 'circuits'].includes(d)) ? 2 : 0;
  return Math.log2(1 + inbound + outbound) + 2 * Math.log2(1 + unlock) + leverage + uncertainty + engineering;
}

/** A question's priority: what asking this facet of this entity unlocks. */
export function priority(s: Substrate, e: Entity, facet: Facet): number { return priorityBase(s, e) + FACET_WEIGHT[facet]; }

/** A source that can answer a question about an entity along a facet. */
export interface Expander {
  name: string;
  facets: Facet[];
  /** Null when this source has nothing on it; a discovery otherwise, with its unknowns. An outside source answers later. */
  expand(e: Entity, facet: Facet, s: Substrate): Discovery | null | Promise<Discovery | null>;
}

/** The deep knowledge a seed pack kept back, played when the queue asks for it. */
export function seedExpander(packs: Pack[]): Expander {
  const deeps = packs.flatMap((p) => p.deeps.map((d) => ({ ...d, pack: p })));
  return {
    name: 'seeds',
    facets: [...FACETS],
    expand(e, facet) {
      const hits = deeps.filter((d) => d.id === e.id && d.facet === facet);
      if (!hits.length) return null;
      const out: Discovery = { entities: [], relations: [], unknowns: [] };
      for (const h of hits) {
        const scratch = new (h.pack.constructor as new (domain: string, source: Pack['source']) => Pack)(h.pack.domain, h.pack.source);
        h.fn(scratch);
        out.entities.push(...scratch.entities);
        out.relations.push(...scratch.relations);
      }
      return out;
    },
  };
}

/**
 * The kinds a piece's name names: the whole phrase as a thing ("bearings" are bearings, "bus capacitors" the bus capacitor),
 * each side of an "and" ("commutator and brushes" is both), or, when the phrase names nothing, its head noun ("sun gear"
 * is a kind of gear, "stator magnets" magnets) at lower confidence. Only a described component, mechanism, material or
 * circuit of this world, never a law, another block, or a living thing's part.
 */
function namedKinds(s: Substrate, e: Entity): { kind: Entity; how: string; confidence: number }[] {
  const seg = e.id.split('.').pop()!;
  const ok = (x: Entity | undefined): x is Entity => !!x && x.id !== e.id && !('stub' in x.source) && !x.id.startsWith('block.') && !x.id.startsWith('bio.') && !x.kinds.includes('biological') && !x.kinds.includes('organism') && x.kinds.some((k) => k === 'component' || k === 'mechanism' || k === 'material' || k === 'circuit') && !x.kinds.includes('law');
  const out: { kind: Entity; how: string; confidence: number }[] = [];
  for (const ph of seg.includes('-and-') ? seg.split('-and-') : [seg]) {
    const words = ph.replace(/-/g, ' ');
    // the piece's own name is a name of the piece, so each reading is tried past it
    const readings = [words, singular(words), ph.replace(/-/g, ''), singular(ph.replace(/-/g, ''))];
    const whole = readings.flatMap((w) => [findByWords(s, w), s.byWord(w)]).find(ok);
    if (whole) { out.push({ kind: whole, how: `named for it: a piece called "${words}" is ${articled(whole.name)}`, confidence: 0.5 }); continue; }
    const head = singular(ph.split('-').pop()!);
    const byHead = ph.includes('-') ? [findByWords(s, head), s.byWord(head)].find(ok) : undefined;
    if (byHead) out.push({ kind: byHead, how: `named for its head noun: a piece called "${words}" is a kind of ${byHead.name}`, confidence: 0.4 });
  }
  return out.filter((x, i, a) => a.findIndex((y) => y.kind.id === x.kind.id) === i);
}

/** The facet a new relation of a kind re-opens on the kind's members. */
const FACET_OF_RELATION: Partial<Record<Relation['kind'], Facet>> = { 'produced-by': 'constructors', 'fails-by': 'failures', 'standardized-by': 'standards', 'connects-to': 'interfaces', 'made-of': 'materials', does: 'functions' };

/** How a thing that does a function can fail: a table with its reasons, each a failure mode the index knows. */
export const FAILURE_OF_FUNCTION: Record<string, string[]> = {
  'fn.support.load': ['failure.overload', 'failure.fatigue', 'failure.buckling'], 'fn.transmit.torque': ['failure.fatigue', 'failure.shear'], 'fn.transmit.force': ['failure.fatigue', 'failure.overload'],
  'fn.support.rotation': ['failure.wear', 'failure.seizure'], 'fn.support.translation': ['failure.wear', 'failure.galling'], 'fn.roll': ['failure.wear', 'failure.pitting'], 'fn.guide.motion': ['failure.wear', 'failure.backlash'],
  'fn.seal': ['failure.leak'], 'fn.contain.pressure': ['failure.leak', 'failure.burst'], 'fn.clamp.axial': ['failure.loosening', 'failure.thread-stripping'], 'fn.prevent.loosening': ['failure.loosening'],
  'fn.conduct.current': ['failure.overheating', 'failure.open'], 'fn.actuate.electromagnetic': ['failure.overheating', 'failure.insulation-breakdown'], 'fn.switch': ['failure.contact-wear', 'failure.short'], 'fn.connect.electrical': ['failure.contact-wear', 'failure.corrosion'],
  'fn.store.charge': ['failure.insulation-breakdown', 'failure.thermal-runaway'], 'fn.store.elastic': ['failure.fatigue', 'failure.creep'], 'fn.store.magnetic': ['failure.saturation', 'failure.overheating'],
  'fn.move.fluid': ['failure.cavitation', 'failure.wear'], 'fn.change.speed-ratio': ['failure.wear', 'failure.tooth-breakage'], 'fn.transfer.heat': ['failure.corrosion'], 'fn.dissipate.motion': ['failure.overheating', 'failure.wear'],

  'fn.compute': ['failure.soft-error', 'failure.bug'], 'fn.remember': ['failure.corruption', 'failure.soft-error'], 'fn.communicate': ['failure.noise', 'failure.packet-loss'], 'fn.sense': ['failure.drift', 'failure.sensor-noise', 'failure.sensor-failure'],
  'fn.convert.analog-digital': ['failure.noise', 'failure.drift'], 'fn.convert.digital-analog': ['failure.noise', 'failure.drift'], 'fn.decide': ['failure.control-loss'], 'fn.control': ['failure.oscillation', 'failure.windup'], 'fn.learn': ['failure.overfitting', 'failure.distribution-shift'],
  'fn.emit.light': ['failure.lumen-depreciation', 'failure.overheating'], 'fn.detect.light': ['failure.noise'], 'fn.display': ['failure.dead-pixel'], 'fn.focus': ['failure.contamination'], 'fn.polarize': ['failure.uv-degradation'],
  'fn.contain': ['failure.leak', 'failure.rupture'], 'fn.convey': ['failure.erosion', 'failure.leak'], 'fn.control.flow': ['failure.leak', 'failure.sticking'], 'fn.prevent.backflow': ['failure.leak', 'failure.sticking'], 'fn.control.buoyancy': ['failure.leak'], 'fn.extract.fluid-energy': ['failure.erosion', 'failure.foreign-object-damage'],
  'fn.lift': ['failure.fatigue'], 'fn.thrust': ['failure.overheating', 'failure.erosion'], 'fn.steer': ['failure.control-loss'], 'fn.move': ['failure.overload'], 'fn.grip': ['failure.slip'], 'fn.latch': ['failure.wear', 'failure.sticking'], 'fn.locate': ['failure.misalignment'], 'fn.spread.load': ['failure.overload'],
  'fn.couple.shafts': ['failure.misalignment', 'failure.fatigue'], 'fn.program.motion': ['failure.follower-jump', 'failure.wear'], 'fn.convert.rotation.translation': ['failure.wear', 'failure.backlash'], 'fn.change.axis': ['failure.wear', 'failure.tooth-breakage'], 'fn.engage.disengage': ['failure.wear', 'failure.fade'],
  'fn.reduce.friction': ['failure.lubricant-starvation', 'failure.wear'], 'fn.isolate.vibration': ['failure.compression-set', 'failure.resonance'], 'fn.prevent.overload': ['failure.nuisance-trip'], 'fn.measure.force': ['failure.drift'],
  'fn.cut': ['failure.wear', 'failure.chipping'], 'fn.form': ['failure.wrinkling', 'failure.tearing'], 'fn.heat': ['failure.overheating'], 'fn.construct': ['failure.misassembly', 'failure.missing-part'], 'fn.pattern': ['failure.overlay-error'], 'fn.separate': ['failure.contamination'],
  'fn.insulate': ['failure.insulation-breakdown'], 'fn.resist': ['failure.overheating', 'failure.drift'], 'fn.regulate.voltage': ['failure.drift', 'failure.ripple'], 'fn.filter': ['failure.drift'], 'fn.rectify': ['failure.overheating', 'failure.breakdown'], 'fn.amplify': ['failure.clipping', 'failure.oscillation'], 'fn.oscillate': ['failure.drift'],
  'fn.protect.overcurrent': ['failure.nuisance-trip'], 'fn.protect.overvoltage': ['failure.breakdown'], 'fn.make.field': ['failure.overheating', 'failure.shorted-turn'], 'fn.limit.current': ['failure.overheating'], 'fn.transform.voltage': ['failure.saturation', 'failure.shorted-turn'], 'fn.invert': ['failure.shoot-through'], 'fn.convert.dc-dc': ['failure.ripple', 'failure.overheating'],
  'fn.couple.ac': ['failure.esr-rise'], 'fn.decouple': ['failure.esr-rise'], 'fn.divide.voltage': ['failure.drift'], 'store.energy': ['failure.capacity-fade'],
  'fn.digest': ['failure.disease'], 'fn.harvest.light': ['failure.disease'], 'fn.transfer.oxygen': ['failure.disease'], 'fn.reproduce': ['failure.mutation'],
};

/**
 * Derivations over what is already known: rules whose provenance is the rule. A material's roles from its numbers;
 * analogues from a shared function across domains; failures from the laws a thing is governed by; the manufacturing
 * of a thing from the processes that work its material; the constructors a thing lacks named as a known unknown.
 */
export function ruleExpander(): Expander {
  const rule = (why: string) => ({ derived: `population.ts rule: ${why}` });
  const r = (from: string, kind: Relation['kind'], to: string, why: string): Relation => ({ from, kind, to, source: rule(why), confidence: 0.6, says: why });
  return {
    name: 'rules',
    facets: ['analogues', 'failures', 'manufacturing', 'constructors', 'functions', 'materials', 'standards', 'interfaces'],
    expand(e, facet, s) {
      const out: Discovery = { entities: [], relations: [], unknowns: [] };
      if (facet === 'analogues') {
        const mine = new Set(e.domains);
        for (const fn of s.reach(e.id, 'does')) for (const other of s.reach(fn.id, 'done-by')) {
          if (other.id === e.id || other.domains.some((d) => mine.has(d))) continue;
          if (s.outOf(e.id, 'analogous-to').some((x) => x.to === other.id) || s.into(e.id, 'analogous-to').some((x) => x.from === other.id)) continue;
          out.relations.push(r(e.id, 'analogous-to', other.id, `both do ${fn.id}, in different domains (${e.domains[0]} and ${other.domains[0]})`));
        }
      }
      if (facet === 'failures') {
        const byLaw: Record<string, string> = { 'fatigue.endurance.steel': 'failure.fatigue', 'buckling.euler': 'failure.buckling', 'stress.hoop': 'failure.burst', 'friction.coulomb': 'failure.wear', 'joule': 'failure.overheating', 'nernst': 'failure.corrosion', 'arrhenius': 'failure.creep', 'natural.frequency': 'failure.resonance', 'bearing.life.l10': 'failure.spalling', 'hydrostatic': 'failure.leak' };
        for (const law of s.reach(e.id, 'governed-by')) { const f = byLaw[law.id]; if (f && s.has(f) && !s.outOf(e.id, 'fails-by').some((x) => x.to === f)) out.relations.push(r(e.id, 'fails-by', f, `governed by ${law.id}, whose limit is ${f}`)); }
      }
      if (facet === 'manufacturing' && !s.outOf(e.id, 'produced-by').length) {
        for (const m of s.reach(e.id, 'made-of')) {
          const fams = [m, ...s.reach(m.id, 'is-a')];
          // a part of a material can be made by what works that material: a steel bracket by what saws, drills, mills and welds steel. Weaker than a maker of its own, so 0.4 and said
          for (const f of fams) for (const pr of s.reach(f.id, 'interacts-with').filter((x) => x.kinds.includes('process'))) out.relations.push({ ...r(e.id, 'produced-by', pr.id, `a part of ${m.id} can be made by what works it: ${pr.id}, until its own maker is known`), confidence: 0.4 });
        }
      }
      if (facet === 'constructors') {
        const makers = s.reach(e.id, 'produced-by');
        // what makes the kind makes the member, until something more specific is known: a wood screw is made as screws are
        if (!makers.length) for (const k of s.reach(e.id, 'is-a')) for (const pr of s.reach(k.id, 'produced-by')) out.relations.push(r(e.id, 'produced-by', pr.id, `inherits from ${k.id}: what makes the kind makes the member`));
        if (!makers.length && !out.relations.length && (e.kinds.includes('component') || e.kinds.includes('system') || e.kinds.includes('material'))) out.unknowns.push({ id: e.id, facet, why: 'no constructor is known for it, nor for what it is a kind of: what produces it is an open question' });
      }
      if (facet === 'failures' && !s.outOf(e.id, 'fails-by').length) {
        for (const k of s.reach(e.id, 'is-a')) for (const f of s.reach(k.id, 'fails-by')) out.relations.push(r(e.id, 'fails-by', f.id, `inherits from ${k.id}: the kind's failures are the member's`));
      }
      if (facet === 'failures' && !e.kinds.includes('material') && !e.kinds.includes('law')) {
        const have = new Set([...s.outOf(e.id, 'fails-by').map((x) => x.to), ...out.relations.filter((x) => x.kind === 'fails-by').map((x) => x.to)]);
        // what a thing is made of fails as the material fails: steel fatigues, polymers creep, aluminium corrodes in contact
        for (const m of s.reach(e.id, 'made-of')) for (const f of [...s.reach(m.id, 'fails-by'), ...s.reach(m.id, 'is-a').flatMap((fam) => s.reach(fam.id, 'fails-by'))]) if (!have.has(f.id)) { have.add(f.id); out.relations.push(r(e.id, 'fails-by', f.id, `made of ${m.id}, which fails by ${f.id}`)); }
        // living tissue is injured, diseased and ages: every biological part fails these ways before its own
        if (e.kinds.includes('biological')) for (const f of ['failure.injury', 'failure.disease', 'failure.aging']) if (s.has(f) && !have.has(f)) { have.add(f); out.relations.push(r(e.id, 'fails-by', f, 'living tissue: it is injured, diseased and ages')); }
        // what a thing does says how it can fail: what carries load can be overloaded and fatigued, what seals can leak
        for (const fn of s.reach(e.id, 'does')) for (const f of FAILURE_OF_FUNCTION[fn.id] ?? []) if (s.has(f) && !have.has(f)) { have.add(f); out.relations.push(r(e.id, 'fails-by', f, `it does ${fn.id}, whose failure is ${f}`)); }
      }
      if (facet === 'standards' && !s.outOf(e.id, 'standardized-by').length) {
        for (const k of s.reach(e.id, 'is-a')) for (const st of s.reach(k.id, 'standardized-by')) out.relations.push(r(e.id, 'standardized-by', st.id, `inherits from ${k.id}: the kind's standard covers the member`));
      }
      if (facet === 'interfaces' && !s.outOf(e.id, 'connects-to').length) {
        for (const k of s.reach(e.id, 'is-a')) for (const c of s.reach(k.id, 'connects-to')) if (c.id !== e.id) out.relations.push(r(e.id, 'connects-to', c.id, `inherits from ${k.id}: what the kind connects to, the member connects to`));
      }
      if (facet === 'materials' && !e.kinds.includes('material') && !s.outOf(e.id, 'made-of').length) {
        for (const k of s.reach(e.id, 'is-a')) for (const m of s.reach(k.id, 'made-of')) out.relations.push(r(e.id, 'made-of', m.id, `inherits from ${k.id}: made of what the kind is made of, until its own material is known`));
        // what is a kind of a material is made of it: cardiac muscle is muscle tissue, so it is made of muscle tissue
        for (const k of s.reach(e.id, 'is-a')) if (k.kinds.includes('material')) out.relations.push(r(e.id, 'made-of', k.id, `it is a kind of ${k.id}, a material, so it is made of it`));
        // a whole is made of what its parts are made of: a motor is made of copper because its winding is
        const seen = new Set(out.relations.filter((x) => x.kind === 'made-of').map((x) => x.to));
        for (const part of s.reach(e.id, 'has-part')) for (const m of s.reach(part.id, 'made-of')) if (m.id !== e.id && !seen.has(m.id)) { seen.add(m.id); out.relations.push({ ...r(e.id, 'made-of', m.id, `through its part ${part.id}, which is made of ${m.id}`), confidence: 0.7 }); }
      }
      if (facet === 'functions' && !s.outOf(e.id, 'does').length) {
        for (const k of s.reach(e.id, 'is-a')) for (const fn of s.reach(k.id, 'does')) out.relations.push(r(e.id, 'does', fn.id, `inherits from ${k.id}`));
        // a piece of a building block named for a kind of thing is that kind of thing: "bearings" are bearings, "commutator and brushes" both, "sun gear" a gear by its head noun
        if (!s.outOf(e.id, 'is-a').length && e.id.startsWith('block.') && s.reach(e.id, 'part-of').length) for (const n of namedKinds(s, e)) out.relations.push({ ...r(e.id, 'is-a', n.kind.id, n.how), confidence: n.confidence });
      }
      if (facet === 'materials' && e.kinds.includes('material')) {
        for (const role of s.reach(e.id, 'plays')) for (const thing of s.reach(role.id, 'played-by')) if (thing.id !== e.id && !thing.kinds.includes('material') && !thing.kinds.includes('role')) out.relations.push(r(thing.id, 'made-of', e.id, `it plays ${role.id}, which ${e.id} can fill`));
      }
      return out.entities.length || out.relations.length || out.unknowns.length ? out : null;
    },
  };
}

/** An outside source (a datasheet service, a standards body, a literature search) when one is connected: here, none is, and it says so. */

export interface Report {
  processed: number;
  discoveredEntities: number;
  discoveredRelations: number;
  rejected: { relation: Relation; why: string }[];
  promotedManifolds: string[];
  generators: string[];
  constructionPaths: number;
  unknowns: number;
  converged: boolean;
  queued: number;
  byDomain: Record<string, number>;
}

const SUBSTANCE_KINDS = new Set(['material', 'chemical']);

/** The pipeline for one answer: normalise, classify, deduplicate, validate, keep provenance; what survives is merged. */
export function ingest(s: Substrate, d: Discovery, report: Report): { entities: Entity[]; relations: Relation[] } {
  const added: Entity[] = [], kept: Relation[] = [];
  for (const e of d.entities) {
    const id = normalizeId(e.id);
    const kinds = e.kinds.filter((k) => (KINDS as readonly string[]).includes(k));
    const had = s.has(id);
    const made = s.add({ ...e, id, kinds });
    if (!had) added.push(made);
  }
  for (const r of d.relations) {
    const from = normalizeId(r.from), to = normalizeId(r.to);
    if (!(RELATION_KINDS as string[]).includes(r.kind)) { report.rejected.push({ relation: r, why: `no relation ${r.kind}` }); continue; }
    // a thing may reproduce itself (a machine tool, a ribosome, a printer): no other relation may be reflexive
    if (from === to && r.kind !== 'reproduced-by') { report.rejected.push({ relation: r, why: 'a thing related to itself' }); continue; }
    for (const end of [from, to]) if (!s.has(end)) { const namer = s.get(from === end ? to : from); const named = end === to ? NAMED_AS[r.kind] : undefined; s.add({ id: end, name: end.replace(/[.-]/g, ' '), names: [], kinds: named ? [named] : [], domains: [namer?.domains[0] ?? 'unplaced'], says: `Named by ${from === end ? to : from} (${r.kind}); not yet described.`, source: { stub: `named by ${from === end ? to : from}` }, coverage: { depth: 0, confidence: 0.2, sourceKind: 'stub', expanded: [], unknowns: ['not yet described'] } }); }
    // validation: a law is cited only if it exists as a law; a substance is made of substances
    if (r.kind === 'governed-by') { const law = s.get(to)!; if (!law.kinds.includes('law') && !LAWS.some((l) => l.id === to)) { report.rejected.push({ relation: r, why: `${to} is not a law` }); continue; } }
    if (r.kind === 'made-of') { const sub = s.get(to)!; if (sub.kinds.length && !sub.kinds.some((k) => SUBSTANCE_KINDS.has(k)) && !sub.kinds.includes('biological')) { report.rejected.push({ relation: r, why: `${to} is not a substance` }); continue; } }
    if (s.relate({ ...r, from, to })) kept.push({ ...r, from, to });
  }
  report.unknowns += d.unknowns.length;
  for (const u of d.unknowns) { const e = s.get(u.id); if (e && !e.coverage.unknowns.includes(u.why)) e.coverage.unknowns.push(u.why); }
  return { entities: added, relations: kept };
}

/** What a thing varies by, promoted: siblings under one parent sharing functions make their parent a manifold. */
export function promoteManifolds(s: Substrate): string[] {
  const promoted: string[] = [];
  for (const parent of s.entities.values()) {
    const kids = s.reach(parent.id, 'generalizes');
    if (kids.length < 3 || parent.kinds.includes('manifold')) continue;
    const fns = kids.map((k) => new Set(s.reach(k.id, 'does').map((f) => f.id)));
    const shared = [...(fns[0] ?? new Set<string>())].filter((f) => fns.every((set) => set.has(f)));
    const own = new Set(s.reach(parent.id, 'does').map((f) => f.id));
    if (shared.length >= 1 || (own.size && kids.every((k) => s.reach(k.id, 'is-a').some((x) => x.id === parent.id)))) {
      parent.kinds.push('manifold');
      promoted.push(parent.id);
      for (const k of kids) for (const p of k.params ?? []) if (!parent.params?.some((q) => q.sym === p.sym)) (parent.params ??= []).push({ ...p, of: { derived: `promoted from ${k.id}` } });
      for (const f of shared) s.relate({ from: parent.id, kind: 'does', to: f, source: { derived: `every refinement of ${parent.id} does it` }, confidence: 0.7 });
    }
  }
  return promoted;
}

/** A generator: a manifold whose parameters have values or ranges can enumerate members. */
export type Generator = (spec?: Record<string, number | string>) => { id: string; says: string; parameters: Record<string, number | string> }[];
export function buildGenerators(s: Substrate): Map<string, Generator> {
  const out = new Map<string, Generator>();
  for (const e of s.entities.values()) {
    if (!e.kinds.includes('manifold') || !e.params?.length) continue;
    const enumerable = e.params.filter((p) => p.values?.length || (p.low !== undefined && p.high !== undefined && p.high > p.low));
    if (!enumerable.length) continue;
    out.set(e.id, (spec = {}) => {
      const first = enumerable[0]!;
      const choices = first.values ?? Array.from({ length: 5 }, (_, i) => first.low! + ((first.high! - first.low!) * i) / 4);
      return choices.slice(0, 12).map((v) => ({ id: `${e.id}#${first.sym}=${v}`, says: `a ${e.name} with ${first.name} ${v}${first.unit ? ` ${first.unit}` : ''}`, parameters: { ...spec, [first.sym]: v } }));
    });
    e.kinds.includes('generator') || e.kinds.push('generator');
  }
  return out;
}

/** Things that no constructor is known for: the frontier of the manufacturing graph. */
export function missingConstructors(s: Substrate): Entity[] {
  return [...s.entities.values()].filter((e) => (e.kinds.includes('component') || e.kinds.includes('system')) && !('stub' in e.source) && !s.outOf(e.id, 'produced-by').length && !s.reach(e.id, 'is-a').some((k) => s.outOf(k.id, 'produced-by').length));
}

/** Ask one question first: it goes to the front of the queue. */
export function ask(s: Substrate, q: Queue, id: string, facet: Facet, mode: 'fast' | 'deep' = 'deep'): boolean {
  const e = s.get(id);
  if (!e) return false;
  return q.push({ id: e.id, facet, mode, priority: 1e6, reason: 'asked for', domain: e.domains[0] ?? 'unplaced' });
}

export interface PopulateOptions { budget?: number; workers?: number; expanders: Expander[]; mode?: 'fast' | 'deep' | 'both'; /** stop early when this says so: a time slice of a frame */ until?: () => boolean; /** every discovery an expander made, for a journal */ onDiscovery?: (x: Expander, w: WorkItem, d: Discovery) => void; /** false: a slice, without the end-of-round promotion of manifolds and generators */ finish?: boolean }

/** Seed the queue: every stub asks what it is (fast); every described thing asks its facets (deep). */
export function seedQueue(s: Substrate, q: Queue, mode: 'fast' | 'deep' | 'both' = 'both', only?: Iterable<Entity>): number {
  let n = 0;
  for (const e of only ?? s.entities.values()) {
    const domain = e.domains[0] ?? 'unplaced';
    const base = priorityBase(s, e);
    if (e.coverage.depth === 0 && mode !== 'deep') { for (const f of ['functions', 'components', 'constructors'] as Facet[]) if (q.push({ id: e.id, facet: f, mode: 'fast', priority: base + FACET_WEIGHT[f], reason: 'a stub: named by something, not yet described', domain })) n++; }
    else if (mode !== 'fast') for (const f of FACETS) if (!e.coverage.expanded.includes(f) && q.push({ id: e.id, facet: f, mode: 'deep', priority: base + FACET_WEIGHT[f], reason: `${f} of a described thing`, domain })) n++;
  }
  return n;
}

/**
 * Run the queue: workers take questions from their domains in priority order, expanders answer, the pipeline ingests,
 * new things queue their own questions. Returns what happened; the queue keeps what is left.
 */
export async function populate(s: Substrate, q: Queue, opts: PopulateOptions): Promise<Report> {
  const report: Report = { processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} };
  const budget = opts.budget ?? 500;
  const domains = q.domains();
  const workers = Math.max(1, Math.min(opts.workers ?? 4, domains.length || 1));
  const lanes: string[][] = Array.from({ length: workers }, () => []);
  domains.forEach((d, i) => lanes[i % workers]!.push(d));
  let spent = 0;
  const work = async (lane: string[]) => {
    for (;;) {
      if (spent >= budget || opts.until?.()) return;
      // the best question across the lane's domains, else the best anywhere: no domain starves the others
      let w = q.pop(lane);
      if (!w) w = q.pop();
      if (!w) return;
      spent++;
      report.processed++;
      report.byDomain[w.domain] = (report.byDomain[w.domain] ?? 0) + 1;
      const e = s.get(w.id);
      if (!e) continue;
      for (const x of opts.expanders) {
        if (!x.facets.includes(w.facet)) continue;
        const d = await x.expand(e, w.facet, s);
        if (!d) continue;
        opts.onDiscovery?.(x, w, d);
        const { entities, relations } = ingest(s, d, report);
        report.discoveredEntities += entities.length;
        report.discoveredRelations += relations.length;
        for (const n of entities) { const f: Facet[] = n.coverage.depth === 0 ? ['functions', 'components'] : ['components', 'materials', 'constructors']; for (const facet of f) if (q.push({ id: n.id, facet, mode: n.coverage.depth === 0 ? 'fast' : 'deep', priority: priority(s, n, facet), reason: `discovered by ${x.name} expanding ${w.id} (${w.facet})`, domain: n.domains[0] ?? 'unplaced' })) report.queued++; }
        for (const r of relations) {
          for (const end of [r.from, r.to]) { const n = s.get(end)!; if (n.coverage.depth === 0 && q.push({ id: n.id, facet: 'functions', mode: 'fast', priority: priority(s, n, 'functions'), reason: `named by a new relation from ${w.id}`, domain: n.domains[0] ?? 'unplaced' })) report.queued++; }
          // a kind that learned something: its members are asked the same facet again, so what the kind has reaches them (recursion along is-a)
          const facet = FACET_OF_RELATION[r.kind];
          if (facet) for (const m of s.reach(r.from, 'generalizes')) if (q.again({ id: m.id, facet, mode: 'deep', priority: priority(s, m, facet) + 1, reason: `${r.from}, which it is a kind of, learned ${r.kind} ${r.to}`, domain: m.domains[0] ?? 'unplaced' })) report.queued++;
          // a thing that learned what it is a kind of re-opens everything it can now inherit
          if (r.kind === 'is-a') for (const f of ['functions', 'failures', 'materials', 'constructors', 'standards', 'interfaces'] as const) { const x = s.get(r.from)!; if (q.again({ id: x.id, facet: f, mode: 'deep', priority: priority(s, x, f) + 1, reason: `it learned it is a kind of ${r.to}`, domain: x.domains[0] ?? 'unplaced' })) report.queued++; }
          // a part that learned its material re-opens the whole's materials (and so its failures)
          if (r.kind === 'made-of') for (const whole of s.reach(r.from, 'part-of')) for (const f of ['materials', 'failures'] as const) if (q.again({ id: whole.id, facet: f, mode: 'deep', priority: priority(s, whole, f) + 1, reason: `its part ${r.from} learned made-of ${r.to}`, domain: whole.domains[0] ?? 'unplaced' })) report.queued++;
        }
      }
      if (!e.coverage.expanded.includes(w.facet)) e.coverage.expanded.push(w.facet);
      e.coverage.lastExpanded = spent;
      if (e.coverage.depth < 3 && e.coverage.expanded.length >= 4) e.coverage.depth = 3;
      else if (e.coverage.depth < 2 && e.coverage.expanded.length >= 1 && !('stub' in e.source)) e.coverage.depth = 2;
      await Promise.resolve();
    }
  };
  await Promise.all(lanes.map(work));
  if (opts.finish !== false) {
    report.promotedManifolds = promoteManifolds(s);
    report.generators = [...buildGenerators(s).keys()];
    report.constructionPaths = [...s.entities.values()].filter((e) => s.outOf(e.id, 'produced-by').length).length;
  }
  report.converged = q.size === 0;
  return report;
}
