// The substrate: reality indexed as an alien engineer would, cross-connected, every entity carrying where it comes from
// and how much of it is known, and a queue of what to ask next. The final test is answered by traversal, never by a list.
import { describe, expect, it } from 'vitest';
import { LAWS } from '../../src/ganglia/laws';
import { interpret } from '../../src/assistant/intent';
import { answerTraversal } from '../../src/assistant/traverse';
import {
  FACETS, KINDS, RELATIONS, RELATION_KINDS, Queue, Substrate, analogues, build, constructionPath, decompose, dualRole, implementations, index, ingest, leavesOf,
  lineage, materialsForRole, mechanismsFor, missingConstructors, populate, priority, producers, ruleExpander, seedExpander, seedQueue, variants, waysToStore,
  type Entity, type Report, type WorkItem,
} from '../../src/ganglia/substrate';

const built = build();
const s = built.substrate;
const ids = (xs: { entity: Entity }[] | Entity[]) => xs.map((x) => ('entity' in x ? x.entity.id : x.id));

describe('the substrate: a cross-connected index of reality', () => {
  it('is large, and larger in arrows than in things: cross-connection over coverage', () => {
    const c = s.census();
    expect(c.entities).toBeGreaterThan(2000);
    expect(c.relations / c.entities).toBeGreaterThan(3);
    // every inverse is a distinct name, never a forward kind, so an arrow read backwards is never mistaken for one read forwards
    // (a symmetric relation, interacts-with, analogous-to, connects-to, is its own inverse)
    const inverses = RELATION_KINDS.map((k) => RELATIONS[k].inverse);
    expect(new Set(inverses).size).toBe(inverses.length);
    for (const k of RELATION_KINDS) { const inv = RELATIONS[k].inverse; if (inv !== k) expect(RELATION_KINDS as string[], inv).not.toContain(inv); }
    for (const k of RELATION_KINDS) expect(c.byRelation[k] ?? 0, `relation ${k} is never used`).toBeGreaterThan(0);
    for (const k of KINDS) expect(c.byKind[k] ?? 0, `no entity of kind ${k}`).toBeGreaterThan(0);
  });

  it('every arrow joins two things that exist: nothing dangles after the bridge is repaired', () => {
    expect(s.dangling()).toEqual([]);
    expect(built.seedReport.rejected.map((r) => `${r.relation.from} ${r.relation.kind} ${r.relation.to}: ${r.why}`)).toEqual([]);
  });

  it('every entity carries its provenance and its coverage, and a stub is marked as one', () => {
    for (const e of s.entities.values()) {
      expect(e.source, e.id).toBeDefined();
      expect(e.coverage.depth, e.id).toBeGreaterThanOrEqual(0);
      expect(e.coverage.confidence, e.id).toBeGreaterThan(0);
      expect(e.coverage.confidence, e.id).toBeLessThanOrEqual(1);
      if ('stub' in e.source) { expect(e.coverage.depth, e.id).toBe(0); expect(e.coverage.unknowns.length, e.id).toBeGreaterThan(0); }
      else expect(e.says.length, e.id).toBeGreaterThan(10);
    }
    const stubs = [...s.entities.values()].filter((e) => 'stub' in e.source);
    expect(stubs.length).toBeGreaterThan(100); // known is not complete: the frontier is explicit
  });

  it('a thing is governed only by laws, and every law in the law book is in the substrate', () => {
    for (const r of s.relations) if (r.kind === 'governed-by') expect(s.get(r.to)!.kinds, `${r.from} governed-by ${r.to}`).toContain('law');
    // a stub named as a law is a law not yet described, and says so
    const stubLaws = [...s.entities.values()].filter((e) => 'stub' in e.source && e.kinds.includes('law'));
    for (const l of stubLaws) expect(l.coverage.unknowns.length, l.id).toBeGreaterThan(0);
    for (const l of LAWS) expect(s.get(l.id)?.kinds, l.id).toContain('law');
  });

  it('a thing may reproduce itself, and nothing else is reflexive', () => {
    for (const r of s.relations) if (r.from === r.to) expect(r.kind, `${r.from} ${r.kind} ${r.to}`).toBe('reproduced-by');
    expect(s.outOf('bio.ribosome', 'reproduced-by').map((r) => r.to)).toContain('bio.ribosome');
    expect(s.outOf('machine.tool', 'reproduced-by').map((r) => r.to)).toContain('machine.tool');
  });

  it('kinds overlap: a bone is a material, a component and biological; a ribosome is a mechanism and a constructor', () => {
    expect(s.get('bio.bone')!.kinds).toEqual(expect.arrayContaining(['material', 'component', 'biological']));
    expect(s.get('bio.ribosome')!.kinds).toEqual(expect.arrayContaining(['mechanism', 'constructor']));
    expect(s.get('screw')!.kinds).toEqual(expect.arrayContaining(['component', 'manifold']));
  });
});

describe('the final test: every question answered by traversal', () => {
  it('every known way to store energy: mechanisms, and the implementations under them, across domains', () => {
    const w = waysToStore(s);
    expect(ids(w.mechanisms).filter((x) => x.startsWith('store.energy.')).length).toBeGreaterThanOrEqual(8);
    expect(ids(w.mechanisms)).toEqual(expect.arrayContaining(['store.energy.electrochemical', 'store.energy.inertial', 'store.energy.elastic', 'store.energy.gravitational', 'store.energy.thermal', 'store.energy.chemical', 'store.energy.pneumatic', 'store.energy.electrostatic']));
    const impl = ids(w.implementations);
    expect(impl).toEqual(expect.arrayContaining(['capacitor', 'inductor', 'bio.fat', 'bio.atp', 'bio.tendon', 'spring', 'flywheel.disc', 'cell.li-ion']));
    const domains = new Set(w.implementations.flatMap((f) => f.entity.domains));
    expect([...domains]).toEqual(expect.arrayContaining(['biology', 'electrical', 'mechanical']));
  });

  it('every mechanism that converts electrical energy into mechanical motion, with the stocked ones and the biological ones', () => {
    const found = implementations(s, 'convert.electrical.rotational');
    const got = ids(found);
    expect(got).toEqual(expect.arrayContaining(['motor.electric', 'motor.dc', 'motor.bldc', 'motor.stepper', 'motor.induction', 'solenoid', 'bio.atp-synthase', 'bio.bacterial-flagellar-motor', 'servo.micro-9g', 'motor.dc.brushed.d100-250w-24v']));
    for (const f of found) expect(f.how, f.entity.id).toMatch(/does|is a/);
  });

  it('all materials for an electrical conductor, ranked by conductivity with their tradeoffs, families by their members', () => {
    const rows = materialsForRole(s, 'role.electrical-conductor');
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(rows[0]!.entity.id).toBe('material.silver');
    expect(rows[0]!.conductivity).toBeCloseTo(6.3e7, -6);
    const copper = rows.find((r) => r.entity.id === 'copper.c110')!;
    const aluminium = rows.find((r) => r.entity.id === 'aluminum.6061-t6')!;
    expect(copper.conductivity!).toBeGreaterThan(aluminium.conductivity!);
    expect(aluminium.perMass!).toBeGreaterThan(copper.perMass!); // the tradeoff: aluminium conducts more per kilogram
    const family = rows.find((r) => r.entity.id === 'material.copper-alloy')!;
    expect(family.derivedFrom).toContain('copper.c110');
    // numbered rows come first
    const firstUnnumbered = rows.findIndex((r) => r.conductivity === undefined);
    if (firstUnnumbered >= 0) for (const r of rows.slice(firstUnnumbered)) expect(r.conductivity).toBeUndefined();
  });

  it('every type of screw, and the manifolds that generate them: parameters, refinements, standards, failures', () => {
    const v = variants(s, 'screw')!;
    expect(v.parameters.map((p) => p.sym)).toEqual(expect.arrayContaining(['d', 'L', 'head', 'drive', 'class', 'material', 'coating', 'thread']));
    expect(ids(v.kinds)).toEqual(expect.arrayContaining(['bolt', 'screw.set', 'woodscrew', 'screw.self-tapping']));
    expect(s.reach('screw', 'standardized-by').length).toBeGreaterThan(0);
    expect(s.reach('screw', 'fails-by').length).toBeGreaterThanOrEqual(5);
    expect(s.reach('thread.helix', 'generalizes').map((e) => e.id)).toEqual(expect.arrayContaining(['thread.iso-metric', 'thread.acme', 'thread.buttress']));
    expect(built.generators.has('screw')).toBe(true);
  });

  it('all the ways to make a rotational actuator, and the components of an electric motor to the leaves', () => {
    expect(ids(implementations(s, 'fn.actuate.electromagnetic'))).toEqual(expect.arrayContaining(['motor.electric', 'solenoid', 'electromagnet', 'motor.stepper']));
    const d = decompose(s, 'motor.electric', 3)!;
    expect(ids(d.children)).toEqual(expect.arrayContaining(['stator', 'rotor', 'bearing.ball', 'housing']));
    const leaves = ids(leavesOf(d));
    expect(leaves.length).toBeGreaterThan(20);
    expect(leaves).toEqual(expect.arrayContaining(['copper.c110']));
  });

  it('what manufactures a motor, what manufactures those machines, and the cycle where machines make machines', () => {
    const p = producers(s, 'motor.electric', 4);
    const first = p.steps[0]!;
    expect(first.entity.id).toBe('motor.electric');
    expect(ids(first.by)).toEqual(expect.arrayContaining(['process.winding', 'process.stamping', 'process.magnetizing', 'process.assembly']));
    const winding = p.steps.find((x) => x.entity.id === 'process.winding')!;
    expect(ids(winding.by)).toContain('machine.winding-machine');
    const lathe = p.steps.find((x) => x.entity.id === 'machine.lathe');
    expect(lathe && ids(lathe.by)).toEqual(expect.arrayContaining(['turn', 'mill', 'process.casting.sand']));
    expect(p.cycle.length).toBeGreaterThan(3);
    expect(p.cycle).toEqual(expect.arrayContaining(['turn', 'mill']));
  });

  it('biological mechanisms analogous to a bearing, and the structures of a human that are mechanical and biological at once', () => {
    const a = analogues(s, 'bearing', 'biology');
    expect(ids(a)).toEqual(expect.arrayContaining(['bio.synovial-joint']));
    for (const x of a) expect(x.entity.domains).toContain('biology');
    const dual = dualRole(s, 'bio.human', 'view.mechanical', 'view.anatomical');
    expect(ids(dual)).toEqual(expect.arrayContaining(['bio.bone', 'bio.cartilage', 'bio.synovial-joint', 'bio.tendon', 'bio.skeletal-muscle', 'bio.heart']));
    expect(dual.length).toBeGreaterThanOrEqual(8);
  });

  it('the generative lineage of a human reaches physical primitives, and so does an electric car', () => {
    const human = ids(lineage(s, 'bio.human'));
    expect(human[0]).toBe('phys.proton');
    expect(human[human.length - 1]).toBe('bio.human');
    expect(human).toEqual(expect.arrayContaining(['bio.cell', 'bio.protein']));
    const ev = ids(lineage(s, 'vehicle.electric'));
    expect(ev[0]).toBe('phys.proton');
    expect(ev).toEqual(expect.arrayContaining(['element.copper', 'copper.c110']));
  });

  it('mechanisms for a wanted behaviour, found through the function and not a template', () => {
    const m = mechanismsFor(s, 'store energy');
    expect(m.function?.id).toBe('store.energy');
    expect(m.mechanisms.length).toBeGreaterThan(20);
    const h = mechanismsFor(s, 'move fluid');
    expect(ids(h.mechanisms)).toEqual(expect.arrayContaining(['bio.heart', 'pump.centrifugal']));
  });

  it('the construction path for a thing not in stock names what to make, what to acquire, and the gaps', () => {
    const cp = constructionPath(s, 'motor.bldc', 3);
    expect(cp.steps[0]!.entity.id).toBe('motor.bldc');
    expect(cp.steps[0]!.need).toBe('make');
    expect(ids(cp.steps)).toEqual(expect.arrayContaining(['circuit.inverter', 'transistor.mosfet', 'circuit.gate-driver']));
    for (const g of cp.gaps) expect('stub' in g.source || !s.outOf(g.id, 'produced-by').length, g.id).toBe(true);
    expect(ids(cp.gaps)).toContain('sensor.hall');
  });

  it('an index of any one thing answers the alien engineer\'s questions in both directions', () => {
    const i = index(s, 'bearing')!;
    const fwd = i.answers.filter((a) => !a.backwards).map((a) => a.kind), back = i.answers.filter((a) => a.backwards).map((a) => a.kind);
    expect(fwd).toEqual(expect.arrayContaining(['does', 'fails-by', 'governed-by', 'analogous-to', 'standardized-by']));
    expect(back).toEqual(expect.arrayContaining(['is-a', 'has-part', 'interacts-with']));
    expect(i.answers.find((a) => a.kind === 'is-a' && a.backwards)!.entities.map((e) => e.id)).toEqual(expect.arrayContaining(['bearing.ball', 'bearing.plain']));
    expect(i.answers.find((a) => a.kind === 'has-part' && a.backwards)!.entities.map((e) => e.id)).toEqual(expect.arrayContaining(['gearhead', 'wheel', 'pump']));
  });
});

describe('population: a queue that never needs to be finished', () => {
  it('prioritises, dedupes, and survives a round trip', () => {
    const q = new Queue();
    const w = (id: string, p: number, facet: WorkItem['facet'] = 'components'): WorkItem => ({ id, facet, mode: 'deep', priority: p, reason: 'test', domain: 'mechanical' });
    expect(q.push(w('a', 1))).toBe(true);
    expect(q.push(w('b', 5))).toBe(true);
    expect(q.push(w('a', 9))).toBe(false); // the same question is asked once, and asking it with more urgency raises it
    expect(q.push(w('c', 3, 'materials'))).toBe(true);
    const back = Queue.restore(q.serialize());
    expect(back.pop()!.id).toBe('a'); // raised to 9
    expect(back.pop()!.id).toBe('b');
    expect(back.push(w('b', 7))).toBe(false); // done is remembered across the round trip
    expect(back.pop(['electrical'])).toBeUndefined();
    expect(back.pop(['electrical', 'mechanical'])!.id).toBe('c');
  });

  it('a stub named by many things is asked about first', () => {
    const stubs = [...s.entities.values()].filter((e) => 'stub' in e.source);
    const most = stubs.reduce((a, b) => (s.into(b.id).length > s.into(a.id).length ? b : a));
    const least = stubs.reduce((a, b) => (s.into(b.id).length < s.into(a.id).length ? b : a));
    expect(priority(s, most, 'functions')).toBeGreaterThan(priority(s, least, 'functions'));
    expect(seedQueue(s, new Queue(), 'fast')).toBeGreaterThan(stubs.length - 1);
  });

  it('a round of population derives new relations by rule, marks what it could not learn, and leaves the queue non-empty', async () => {
    const s2 = build().substrate;
    const q = new Queue();
    seedQueue(s2, q, 'both');
    const before = s2.relations.length;
    const r: Report = await populate(s2, q, { expanders: [seedExpander(built.packs), ruleExpander()], budget: 200, workers: 4 });
    expect(r.processed).toBe(200);
    expect(s2.relations.length - before).toBe(r.discoveredRelations);
    expect(r.discoveredRelations).toBeGreaterThan(0);
    expect(r.rejected).toEqual([]);
    expect(r.unknowns).toBeGreaterThan(0);
    expect(r.converged).toBe(false);
    expect(Object.keys(r.byDomain).length).toBeGreaterThan(4); // every lane worked, no domain starved
    expect(s2.dangling()).toEqual([]);
    // every question processed is recorded on its entity as a facet expanded, and nowhere else
    const expanded = [...s2.entities.values()].filter((e) => e.coverage.expanded.length > 0);
    expect(expanded.length).toBeGreaterThan(0);
    expect(expanded.reduce((n, e) => n + e.coverage.expanded.length, 0)).toBeLessThanOrEqual(r.processed);
    for (const e of expanded) expect(e.coverage.lastExpanded, e.id).toBeGreaterThan(0);
  });

  it('what a kind has, its members inherit by rule at lower confidence, said as such: coverage rises and the unknowns fall', async () => {
    const s2 = build().substrate;
    const before = { relations: s2.relations.length, unknownConstructors: [...s2.entities.values()].filter((e) => e.kinds.includes('component') && !s2.outOf(e.id, 'produced-by').length && s2.reach(e.id, 'is-a').some((k) => s2.outOf(k.id, 'produced-by').length)).length };
    expect(before.unknownConstructors).toBeGreaterThan(10);
    const q = new Queue();
    for (const e of s2.entities.values()) if (e.kinds.includes('component') && !s2.outOf(e.id, 'produced-by').length) q.push({ id: e.id, facet: 'constructors', mode: 'deep', priority: 1, reason: 'test', domain: e.domains[0] ?? 'unplaced' });
    const r = await populate(s2, q, { expanders: [ruleExpander()], budget: 5000, workers: 1 });
    expect(r.discoveredRelations).toBeGreaterThan(before.unknownConstructors / 2);
    const after = [...s2.entities.values()].filter((e) => e.kinds.includes('component') && !s2.outOf(e.id, 'produced-by').length && s2.reach(e.id, 'is-a').some((k) => s2.outOf(k.id, 'produced-by').length)).length;
    expect(after).toBe(0);
    const inherited = s2.relations.filter((x) => x.kind === 'produced-by' && 'derived' in x.source && /inherits from/.test(x.says ?? ''));
    expect(inherited.length).toBeGreaterThan(0);
    for (const x of inherited) expect(x.confidence).toBeLessThan(0.7);
    expect(s2.dangling()).toEqual([]);
  });

  it('a whole is made of what its parts are made of, and a thing fails as its material and its function fail: derived, said, and re-asked when a part learns', async () => {
    const s2 = build().substrate;
    const q = new Queue();
    const components = [...s2.entities.values()].filter((e) => !('stub' in e.source) && e.kinds.includes('component'));
    const wholesBefore = components.filter((e) => !s2.outOf(e.id, 'made-of').length && s2.reach(e.id, 'has-part').some((p) => s2.outOf(p.id, 'made-of').length));
    const doersBefore = components.filter((e) => !s2.outOf(e.id, 'fails-by').length && s2.reach(e.id, 'does').length);
    expect(wholesBefore.length).toBeGreaterThan(5);
    expect(doersBefore.length).toBeGreaterThan(5);
    for (const e of components) for (const facet of ['materials', 'failures'] as const) q.push({ id: e.id, facet, mode: 'deep', priority: 1, reason: 'test', domain: e.domains[0] ?? 'unplaced' });
    const r = await populate(s2, q, { expanders: [ruleExpander()], budget: 20000, workers: 1 });
    expect(r.rejected).toEqual([]);
    for (const e of wholesBefore) expect(s2.outOf(e.id, 'made-of').length, `${e.id} has parts with materials`).toBeGreaterThan(0);
    const through = s2.relations.filter((x) => x.kind === 'made-of' && /through its part/.test(x.says ?? ''));
    expect(through.length).toBeGreaterThanOrEqual(wholesBefore.length);
    for (const x of through) expect(x.confidence).toBe(0.7);
    const byFunction = s2.relations.filter((x) => x.kind === 'fails-by' && /whose failure is/.test(x.says ?? ''));
    const byMaterial = s2.relations.filter((x) => x.kind === 'fails-by' && /which fails by/.test(x.says ?? ''));
    expect(byFunction.length).toBeGreaterThan(20);
    expect(byMaterial.length).toBeGreaterThan(20);
    for (const x of [...byFunction, ...byMaterial]) expect(s2.get(x.to)!.kinds, x.to).toContain('failure');
    expect(s2.dangling()).toEqual([]);
  });

  it('a piece of a building block named for a kind is that kind, at half confidence, and then inherits what the kind does', async () => {
    const s2 = build().substrate;
    const q = new Queue();
    const pieces = [...s2.entities.values()].filter((e) => e.id.startsWith('block.') && s2.reach(e.id, 'part-of').length && !s2.outOf(e.id, 'is-a').length);
    expect(pieces.length).toBeGreaterThan(50);
    for (const e of pieces) q.push({ id: e.id, facet: 'functions', mode: 'deep', priority: 1, reason: 'test', domain: 'engineering' });
    await populate(s2, q, { expanders: [ruleExpander()], budget: 2000, workers: 1 });
    const named = s2.relations.filter((x) => x.kind === 'is-a' && /named for it/.test(x.says ?? ''));
    expect(named.length).toBeGreaterThan(10);
    for (const x of named) {
      expect(x.confidence).toBe(0.5);
      const k = s2.get(x.to)!;
      expect(k.kinds, `${x.from} → ${x.to}`).not.toContain('law');
      expect(k.id.startsWith('block.'), `${x.from} → ${x.to}`).toBe(false);
      expect('stub' in k.source).toBe(false);
    }
    expect(s2.reach('block.actuation.rotary.bearings', 'is-a').map((e) => e.id)).toContain('bearing');
    expect(s2.reach('block.transmission.screw.nut', 'is-a').map((e) => e.id)).toContain('nut');
    // the kind's functions reach the piece on the next round
    const withFn = pieces.filter((e) => s2.outOf(e.id, 'does').length).length;
    expect(withFn).toBeGreaterThan(5);
  });

  it('a characteristic scale attaches to a thing without describing it: a stub with a scale is still a stub, and nothing described is of no kind', () => {
    for (const e of s.entities.values()) if (!('stub' in e.source)) { expect(e.kinds.length, `${e.id} is described but of no kind`).toBeGreaterThan(0); expect(e.says.trim().length, e.id).toBeGreaterThan(0); }
    const cap = s.get('bio.capillary')!;
    expect('stub' in cap.source).toBe(true);
    expect(cap.params?.find((p) => p.sym === 'L_c')?.low).toBe(1e-5);
  });

  it('ingest refuses what the index cannot mean, and stubs what it names', () => {
    const s2 = new Substrate();
    const e = (id: string, kinds: Entity['kinds']): Entity => ({ id, name: id, names: [], kinds, domains: ['test'], says: 'A thing of the test, described enough.', source: { estimate: 'test' }, coverage: { depth: 1, confidence: 0.5, sourceKind: 'estimate', expanded: [], unknowns: [] } });
    const report: Report = { processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} };
    ingest(s2, { entities: [e('t.a', ['component']), e('t.b', ['component']), e('t.law', ['law'])], relations: [
      { from: 't.a', kind: 'governed-by', to: 't.b', source: { estimate: 'test' }, confidence: 0.5 }, // not a law
      { from: 't.a', kind: 'made-of', to: 't.b', source: { estimate: 'test' }, confidence: 0.5 }, // not a substance
      { from: 't.a', kind: 'is-a', to: 't.a', source: { estimate: 'test' }, confidence: 0.5 }, // reflexive
      { from: 't.a', kind: 'governed-by', to: 't.law', source: { estimate: 'test' }, confidence: 0.5 },
      { from: 't.a', kind: 'has-part', to: 't.unknown', source: { estimate: 'test' }, confidence: 0.5 },
    ], unknowns: [] }, report);
    expect(report.rejected.map((r) => r.why)).toEqual(['t.b is not a law', 't.b is not a substance', 'a thing related to itself']);
    expect(s2.get('t.unknown')!.source).toHaveProperty('stub');
    expect(s2.get('t.unknown')!.domains).toEqual(['test']);
    expect(s2.dangling()).toEqual([]);
  });

  it('manifolds are promoted from variation, generators built from them, and missing constructors are a list of questions', () => {
    const gens = built.generators;
    expect(gens.size).toBeGreaterThan(50);
    const screws = gens.get('screw')!({});
    expect(screws.length).toBeGreaterThan(5);
    for (const m of screws) { expect(m.id.startsWith('screw#d=')).toBe(true); expect(m.parameters['d']).toBeDefined(); }
    const missing = missingConstructors(s);
    expect(missing.length).toBeGreaterThan(100);
    for (const m of missing) expect(s.outOf(m.id, 'produced-by')).toEqual([]);
  });

  it('every facet is a question some expander can answer, or is marked unknown', () => {
    const covered = new Set([...seedExpander(built.packs).facets, ...ruleExpander().facets]);
    for (const f of FACETS) expect(covered.has(f) || f === 'manifolds' || f === 'constructors', f).toBe(true);
  });
});

describe('Ego answers the final test in words, by traversal', () => {
  const ask = (line: string) => {
    const i = interpret(line);
    expect(i?.do, line).toBe('traverse');
    return { intent: i as Extract<NonNullable<ReturnType<typeof interpret>>, { do: 'traverse' }>, answer: answerTraversal(i as never) };
  };

  it('understands each question of the final test as a traversal', () => {
    expect(ask('show me every way to store energy').intent).toMatchObject({ query: 'ways-to-store', of: 'energy' });
    expect(ask('every mechanism that converts electrical energy into mechanical motion').intent).toMatchObject({ query: 'implementations', of: 'convert.electrical.rotational' });
    expect(ask('all the ways to make a rotational actuator').intent).toMatchObject({ query: 'implementations' });
    expect(ask('all materials for an electrical conductor with their tradeoffs').intent).toMatchObject({ query: 'materials-for', of: 'electrical conductor' });
    expect(ask('every type of screw').intent).toMatchObject({ query: 'variants', of: 'screw' });
    expect(ask('what are the components of an electric motor?').intent).toMatchObject({ query: 'components', of: 'electric motor' });
    expect(ask('what manufactures an electric motor').intent).toMatchObject({ query: 'producers', of: 'electric motor' });
    expect(ask('what makes the machines that make an electric motor').intent).toMatchObject({ query: 'producers-of-producers', of: 'electric motor' });
    expect(ask('biological mechanisms analogous to a bearing').intent).toMatchObject({ query: 'analogues', of: 'bearing' });
    expect(ask('structures in a human that are both mechanical and biological').intent).toMatchObject({ query: 'dual-role' });
    expect(ask('the generative lineage of a human').intent).toMatchObject({ query: 'lineage', of: 'human' });
    expect(ask('which mechanisms can move fluid').intent).toMatchObject({ query: 'mechanisms-for', of: 'move fluid' });
    expect(ask('what do I need to build a brushless motor').intent).toMatchObject({ query: 'construction-path', of: 'brushless motor' });
    expect(ask('how big is your substrate').intent).toMatchObject({ query: 'census' });
    // and what is not a traversal stays what it was
    expect(interpret('what makes up a kart')?.do).not.toBe('traverse');
    expect(interpret('how much do you know')?.do).toBe('ganglia');
  });

  it('answers with the traversal, naming things from every domain and what is still unknown', () => {
    const energy = ask('show me every way to store energy').answer;
    expect(energy).toMatch(/\d+ mechanisms store energy/);
    expect(energy).toMatch(/in biology/);
    expect(energy).toMatch(/flywheel|spring|fat|tendon/i);
    const motors = ask('every mechanism that converts electrical energy into mechanical motion').answer;
    expect(motors).toMatch(/In biology: .*(flagellar|ATP synthase)/);
    expect(motors).toMatch(/In stock here: .*(servo|motor)/i);
    const cond = ask('all materials for an electrical conductor with their tradeoffs').answer;
    expect(cond).toMatch(/silver 6\.3e7 S\/m/);
    expect(cond).toMatch(/wins per kilogram/);
    const screws = ask('every type of screw').answer;
    expect(screws).toMatch(/varies by nominal diameter/);
    expect(screws).toMatch(/fails by/);
    const parts = ask('what are the components of an electric motor?').answer;
    expect(parts).toMatch(/stator/i);
    expect(parts).toMatch(/Down to the leaves/);
    const makers = ask('what makes the machines that make an electric motor').answer;
    expect(makers).toMatch(/closes on itself/);
    const bio = ask('biological mechanisms analogous to a bearing').answer;
    expect(bio).toMatch(/synovial joint/i);
    const dual = ask('structures in a human that are both mechanical and biological').answer;
    expect(dual).toMatch(/tendon/i);
    const lin = ask('the generative lineage of a human').answer;
    expect(lin).toMatch(/proton.*→.*human/);
    expect(lin).toMatch(/reaches the physical primitives/);
    const path = ask('what do I need to build a brushless motor').answer;
    expect(path).toMatch(/Gaps, where I know no way yet/);
    const census = ask('how big is your substrate').answer;
    expect(census).toMatch(/questions I have been asked by other things and not answered yet/);
    const unknown = ask('index of a warp drive').answer;
    expect(unknown).toMatch(/I know no warp drive/);
  });
});
