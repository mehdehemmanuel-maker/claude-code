// The substrate: reality indexed as an alien engineer would, cross-connected, every entity carrying where it comes from
// and how much of it is known, and a queue of what to ask next. The final test is answered by traversal, never by a list.
import { describe, expect, it } from 'vitest';
import { LAWS } from '../../src/ganglia/laws';
import { interpret } from '../../src/assistant/intent';
import { answerTraversal } from '../../src/assistant/traverse';
import {
  FACETS, KINDS, RELATIONS, RELATION_KINDS, Queue, Substrate, analogues, build, constructionPath, decompose, dualRole, implementations, index, ingest, leavesOf,
  lineage, materialsForRole, mechanismsFor, missingConstructors, populate, priority, producers, ruleExpander, seedExpander, seedQueue, variants, waysToStore,
  FAMILY_NUMBERS, familyOfWord, viewOfDomain, advanceBuild, buildSteps,
  type Entity, type Report, type WorkItem,
} from '../../src/ganglia/substrate';
import { MATERIALS } from '../../src/data/materials';
import { PROCESSES } from '../../src/ganglia/processes';
import { ARCHETYPES } from '../../src/ganglia/blocks';

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
    expect(s.dangling(), s.dangling().map((r) => `${r.from} -${r.kind}-> ${r.to}`).join('; ')).toEqual([]);
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
    // known is not complete: the frontier is explicit; the packs describe more each round, so the frontier at build is whatever
    // the arrows still name, and a thing named by nothing described is a stub with its question, as the repair makes it
    const s2 = build().substrate;
    s2.relate({ from: 'bearing', kind: 'has-part', to: 'a.thing.no.pack.describes', source: { estimate: 'test' }, confidence: 0.5 });
    expect(s2.repair().map((e) => e.id)).toEqual(['a.thing.no.pack.describes']);
    const made = s2.get('a.thing.no.pack.describes')!;
    expect('stub' in made.source && made.coverage.depth === 0 && made.coverage.unknowns.length > 0).toBe(true);
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

  it('the bridge\'s ways are refinements of the packs\' functions, so a building block is an implementation of the function it embodies', () => {
    for (const fn of s.reach('way.gear.reduce', 'is-a').map((e) => e.id)) expect(s.get(fn)!.kinds, fn).toContain('function');
    expect(s.reach('way.gear.reduce', 'is-a').map((e) => e.id)).toEqual(expect.arrayContaining(['fn.change.speed-ratio', 'fn.transmit.torque']));
    expect(ids(implementations(s, 'fn.change.speed-ratio'))).toContain('block.transmission.reduce');
    expect(ids(implementations(s, 'fn.actuate.electromagnetic'))).toContain('block.actuation.rotary');
    expect(ids(implementations(s, 'fn.convert.rotation.translation'))).toContain('block.transmission.screw');
    // every mapped function exists and is a function; every mapped way exists
    const ways = [...s.entities.values()].filter((e) => e.id.startsWith('way.'));
    expect(ways.length).toBeGreaterThan(30);
    for (const w of ways) for (const fn of s.reach(w.id, 'is-a')) expect(fn.kinds, `${w.id} is-a ${fn.id}`).toContain('function');
    expect(ways.filter((w) => s.outOf(w.id, 'is-a').length).length).toBeGreaterThan(30);
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
    // at build nothing is a stub, so the test names two things no pack describes, one of them three times
    const s2 = build().substrate;
    const name = (from: string, to: string) => s2.relate({ from, kind: 'has-part', to, source: { estimate: 'test' }, confidence: 0.5 });
    name('bearing', 't.once');
    for (const from of ['bearing', 'gear', 'shaft']) name(from, 't.thrice');
    expect(s2.repair().map((e) => e.id).sort()).toEqual(['t.once', 't.thrice']);
    expect(priority(s2, s2.get('t.thrice')!, 'functions')).toBeGreaterThan(priority(s2, s2.get('t.once')!, 'functions'));
    const q = new Queue();
    expect(seedQueue(s2, q, 'fast')).toBe(6); // three fast facets a stub: what it is, its parts, what makes it
    expect(q.pop()!.id).toBe('t.thrice');
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

  it('a part of a material can be made by what works that material, at low confidence and saying so, until its own maker is known', async () => {
    const s2 = build().substrate;
    const orphan = [...s2.entities.values()].find((e) => e.kinds.includes('component') && !e.id.startsWith('bio.') && s2.reach(e.id, 'made-of').some((m) => m.id === 'material.steel') && !s2.outOf(e.id, 'produced-by').length && !s2.reach(e.id, 'is-a').some((k) => s2.outOf(k.id, 'produced-by').length))!;
    expect(orphan, 'a steel part with no known maker to test on').toBeDefined();
    const q = new Queue();
    q.push({ id: orphan.id, facet: 'manufacturing', mode: 'deep', priority: 1, reason: 'test', domain: 'engineering' });
    await populate(s2, q, { expanders: [ruleExpander()], budget: 50, workers: 1 });
    const makers = s2.outOf(orphan.id, 'produced-by');
    expect(makers.map((x) => x.to)).toEqual(expect.arrayContaining(['saw', 'drill', 'mill']));
    for (const x of makers) { expect(x.confidence).toBe(0.4); expect(x.says).toMatch(/can be made by what works it/); }
  });

  it('a piece of a building block named for a kind is that kind, at half confidence, and then inherits what the kind does', async () => {
    const s2 = build().substrate;
    const q = new Queue();
    const pieces = [...s2.entities.values()].filter((e) => e.id.startsWith('block.') && s2.reach(e.id, 'part-of').length && !s2.outOf(e.id, 'is-a').length);
    expect(pieces.length).toBeGreaterThan(20); // the pieces whose block does not say their kind: enough to test the readings on
    for (const e of pieces) q.push({ id: e.id, facet: 'functions', mode: 'deep', priority: 1, reason: 'test', domain: 'engineering' });
    await populate(s2, q, { expanders: [ruleExpander()], budget: 2000, workers: 1 });
    const named = s2.relations.filter((x) => x.kind === 'is-a' && /named for it:/.test(x.says ?? ''));
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
    // both sides of an "and", and the head noun when the phrase names nothing, at lower confidence and saying so
    expect(s2.reach('block.actuation.rotary.commutator-and-brushes', 'is-a').map((e) => e.id)).toEqual(expect.arrayContaining(['commutator', 'brush']));
    const sun = s2.outOf('block.transmission.reduce.sun-gear', 'is-a');
    expect(sun.map((x) => x.to)).toContain('gear');
    expect(sun.find((x) => x.to === 'gear')!.confidence).toBe(0.4);
    expect(sun.find((x) => x.to === 'gear')!.says).toMatch(/head noun/);
    // never a living thing's part for a piece of a machine: a battery's "cells" are not biological cells
    for (const x of s2.relations.filter((x) => x.kind === 'is-a' && /named for/.test(x.says ?? ''))) expect(s2.get(x.to)!.id.startsWith('bio.') || s2.get(x.to)!.kinds.includes('biological'), `${x.from} → ${x.to}`).toBe(false);
    // the kind's functions reach the piece on the next round
    const withFn = pieces.filter((e) => s2.outOf(e.id, 'does').length).length;
    expect(withFn).toBeGreaterThan(5);
  });

  it('a characteristic scale attaches to a thing without describing it: a stub with a scale is still a stub, and nothing described is of no kind', () => {
    for (const e of s.entities.values()) if (!('stub' in e.source)) { expect(e.kinds.length, `${e.id} is described but of no kind`).toBeGreaterThan(0); expect(e.says.trim().length, e.id).toBeGreaterThan(0); }
    // the scale seed attaches a characteristic scale to the capillary without describing it; the biology pack describes it; both hold
    const cap = s.get('bio.capillary')!;
    expect('stub' in cap.source).toBe(false);
    expect(cap.says).toMatch(/one cell thick/);
    const scale = cap.params?.find((p) => p.sym === 'L_c');
    expect(scale?.low).toBe(1e-5);
    expect('estimate' in scale!.of).toBe(true);
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

describe('what an arrow names, the index describes (S-6)', () => {
  const isStub = (e: Entity) => 'stub' in e.source;
  it('what an arrow says a thing is, the index describes: no typed stub at build', () => {
    // an arrow that types its target (governed-by a law, fails-by a failure, varies-by a parameter, ...) names something a pack describes
    for (const kind of ['architecture', 'failure', 'function', 'parameter', 'standard', 'transformation', 'constructor', 'material', 'thing', 'role', 'law'] as const) expect(s.ofKind(kind).filter(isStub).map((e) => e.id), `${kind} stubs`).toEqual([]);
    // and each says something of its own, never a generated sentence
    for (const v of s.ofKind('architecture')) expect(v.says, v.id).not.toMatch(/not yet described|decomposition of a living thing/);
    for (const f of s.ofKind('failure')) expect(f.says, f.id).not.toMatch(/^$|not yet described/);
  });

  it('the domain of a law names one view, through one table, so no view has a twin', () => {
    for (const l of LAWS) expect(s.reach(l.id, 'in-view').map((v) => v.id), l.id).toEqual([viewOfDomain(l.domain)]);
    for (const twin of ['view.mechanics', 'view.fluids', 'view.structures', 'view.magnetism', 'view.information']) expect(s.has(twin), `${twin} beside its twin`).toBe(false);
    expect(viewOfDomain('machine elements')).toBe('view.machine-elements');
    expect(viewOfDomain('mechanics')).toBe(viewOfDomain('mechanical'));
    expect(viewOfDomain('something new')).toBe('view.something-new');
  });

  it('a process or a block piece names a material by its family, never by a bare word', () => {
    const words = new Set<string>([...MATERIALS.map((m) => m.category), ...PROCESSES.flatMap((p) => p.materials), ...ARCHETYPES.flatMap((a) => a.inside.flatMap((x) => (x.material ? [x.material].flat() : [])))]);
    expect(words.size).toBeGreaterThan(10);
    for (const w of words) {
      const target = familyOfWord(w) ?? w;
      if (!w.includes('.')) { expect(familyOfWord(w), `no family for the word ${w}`).toBeDefined(); const bare = s.get(w); expect(!bare || !isStub(bare), `the bare word ${w} is a stub (a word may also name a described thing: a magnet is a part and a category)`).toBe(true); }
      const e = s.get(target);
      expect(e && !isStub(e), `${w} -> ${target} is described`).toBe(true);
      expect(e!.kinds.some((k) => k === 'material' || k === 'chemical'), `${target} is a material (${e!.kinds.join(',')})`).toBe(true);
    }
    for (const r of s.relations.filter((r) => r.kind === 'interacts-with' && r.says === 'works this material')) expect(s.get(r.to)!.kinds, `${r.from} -> ${r.to}`).toContain('material');
  });

  it('everything an arrow names is described: no stub at build; the frontier is the queue, and the stubs population makes', () => {
    expect([...s.entities.values()].filter(isStub).map((e) => e.id)).toEqual([]);
  });

  it('every part named five times or more does something, itself or as its kind', () => {
    const named = [...s.entities.values()].filter((e) => !isStub(e) && e.kinds.includes('component') && s.into(e.id).length >= 5);
    expect(named.length).toBeGreaterThan(60);
    const idle = named.filter((e) => !s.outOf(e.id, 'does').length && !s.reach(e.id, 'is-a').some((k) => s.outOf(k.id, 'does').length)).map((e) => e.id);
    expect(idle).toEqual([]);
  });

  it('every part the common pack describes, every tool, and every organ does something, itself or as its kind', () => {
    const idle = (pick: (e: Entity) => boolean) => [...s.entities.values()].filter((e) => !isStub(e) && e.kinds.includes('component') && pick(e)).filter((e) => !s.outOf(e.id, 'does').length && !s.reach(e.id, 'is-a').some((k) => s.outOf(k.id, 'does').length)).map((e) => e.id);
    expect(idle((e) => e.domains.includes('common'))).toEqual([]);
    expect(idle((e) => e.domains.includes('manufacturing') && /^tool\./.test(e.id))).toEqual([]);
    expect(idle((e) => e.id.startsWith('bio.') && e.kinds.includes('biological') && !['bio.organ', 'bio.tissue'].includes(e.id))).toEqual([]);
  });

  it('every part the common pack describes and every catalogue part is made of something: itself, as its kind, or through its parts', () => {
    const hasMaterial = (e: Entity): boolean => s.reach(e.id, 'made-of').length > 0 || s.reach(e.id, 'is-a').some((k) => k.kinds.includes('material') || s.reach(k.id, 'made-of').length > 0) || s.reach(e.id, 'has-part').some((part) => s.reach(part.id, 'made-of').length > 0);
    const bare = (pick: (e: Entity) => boolean) => [...s.entities.values()].filter((e) => !isStub(e) && e.kinds.includes('component') && !e.kinds.includes('computation') && pick(e) && !hasMaterial(e)).map((e) => e.id);
    expect(bare((e) => e.domains.includes('common'))).toEqual([]);
    expect(bare((e) => e.domains.includes('catalogue'))).toEqual([]);
    const said = s.relations.filter((x) => x.kind === 'made-of' && /^typically made of/.test(x.says ?? ''));
    expect(said.length).toBeGreaterThan(150);
    for (const x of said) expect(x.confidence).toBe(0.7);
  });

  it('every part named five times or more carries a characteristic length and time, so the scale axis can place it', () => {
    const named = [...s.entities.values()].filter((e) => !isStub(e) && e.kinds.includes('component') && s.into(e.id).length >= 5);
    const unplaced = named.filter((e) => !e.params?.some((p) => p.sym === 'L_c') || !e.params?.some((p) => p.sym === 'T_c')).map((e) => e.id);
    expect(unplaced).toEqual([]);
  });

  it('what a process requires, a machine, a tool, a mould, a gas, is described, never a stub', () => {
    const needs = s.relations.filter((r) => r.kind === 'requires' && s.get(r.from)?.kinds.includes('process'));
    expect(needs.length).toBeGreaterThan(100);
    const stubs = needs.filter((r) => isStub(s.get(r.to)!)).map((r) => `${r.from} requires ${r.to}`);
    expect(stubs).toEqual([]);
  });

  it('a piece whose block says what kind of thing it is, is that kind, and every kind said is described', () => {
    let said = 0;
    for (const a of ARCHETYPES) for (const x of a.inside) if (x.kind) {
      said++;
      const k = s.get(x.kind);
      expect(k && !isStub(k), `${a.id} / ${x.name} is a ${x.kind}`).toBe(true);
      const pid = `block.${a.id}.${x.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
      expect(s.outOf(pid, 'is-a').some((r) => r.to === x.kind && /the block says/.test(r.says ?? '')), pid).toBe(true);
    }
    expect(said).toBeGreaterThan(20);
  });

  it('the numbers of a family come from a named page read on a date, and the stocked materials lie inside them', () => {
    for (const [fam, params] of Object.entries(FAMILY_NUMBERS)) {
      const e = s.get(fam)!;
      expect(e.params?.length, fam).toBe(params.length);
      for (const p of params) {
        expect('url' in p.of ? p.of.url : undefined, `${fam} ${p.name} has its address`).toMatch(/^https:\/\//);
        expect('cite' in p.of ? p.of.cite : '', `${fam} ${p.name} says the day it was read`).toMatch(/\(read \d{4}-\d{2}-\d{2}\)/);
        expect(p.low).toBeLessThanOrEqual(p.high!);
      }
    }
    // two sources agree: the stocked materials (data/materials.ts, Callister tables) lie inside the family's page ranges, density to 2 %,
    // modulus to 10 % (grade scatter); a qualified name ('..., structural grades') is a subset and makes no family-wide claim
    let checked = 0;
    for (const m of MATERIALS) {
      const fam = familyOfWord(m.category); const nums = fam ? FAMILY_NUMBERS[fam] : undefined; if (!nums) continue;
      const rho = nums.find((p) => p.name === 'density'); const E = nums.find((p) => p.name === 'Young\'s modulus');
      if (rho) { expect(m.density, `${m.id} density ${m.density} in [${rho.low}, ${rho.high}]`).toBeGreaterThanOrEqual(rho.low! * 0.98); expect(m.density, m.id).toBeLessThanOrEqual(rho.high! * 1.02); checked++; }
      if (E) { expect(m.E, `${m.id} E ${m.E} in [${E.low}, ${E.high}]`).toBeGreaterThanOrEqual(E.low! * 0.9); expect(m.E, m.id).toBeLessThanOrEqual(E.high! * 1.1); checked++; }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('how a thing fails is said as mechanisms with laws', () => {
  it('Ego answers how a thing fails from its own modes and the ones it inherits, each with the law behind it', () => {
    const i = interpret('how does a bearing fail');
    expect(i).toMatchObject({ do: 'traverse', query: 'failures', of: 'bearing' });
    const a = answerTraversal(i as Extract<NonNullable<typeof i>, { do: 'traverse' }>);
    expect(a).toMatch(/fails by \d+ ways of its own/);
    expect(a).toMatch(/spalling, rolling-contact fatigue/);
    // the law behind brinelling and pitting is Hertzian contact, never Young's wetting angle
    expect(a).toMatch(/hertz/i);
    expect(a).not.toMatch(/contact angle/i);
    for (const id of ['bearing', 'gear', 'gear.tooth', 'cam']) expect(s.reach(id, 'governed-by').map((l) => l.id), id).not.toContain('young.contact');
    expect(interpret('what could go wrong with a battery')).toMatchObject({ do: 'traverse', query: 'failures', of: 'battery' });
    expect(answerTraversal({ do: 'traverse', query: 'failures', of: 'capacitor' })).toMatch(/dielectric breakdown, the insulator/);
  });

  it('Ego answers a property of a material with the number, its unit and where it came from, and the family\'s range as well', () => {
    expect(interpret('what is the density of steel')).toMatchObject({ do: 'traverse', query: 'property', which: 'density', of: 'steel' });
    expect(interpret('how stiff is aluminium alloy')).toMatchObject({ do: 'traverse', query: 'property', which: 'stiff', of: 'aluminium alloy' });
    const a = answerTraversal({ do: 'traverse', query: 'property', of: 'steel', which: 'density' });
    expect(a).toMatch(/density 7850 kg\/m\^3/);
    expect(a).toMatch(/Engineering ToolBox.*read 2026-10-03.*engineeringtoolbox\.com/);
    const b = answerTraversal({ do: 'traverse', query: 'property', of: 'aluminum.6061-t6', which: 'modulus' });
    expect(b).toMatch(/Young's modulus 6\d\.?\d* GPa \(derived from src\/data\/materials\.ts\)/);
    expect(b).toMatch(/as an aluminium alloy: Young's modulus 69 GPa to 70 GPa/);
    expect(answerTraversal({ do: 'traverse', query: 'property', of: 'steel', which: 'melting point' })).toMatch(/I have no melting point for/);
  });

  it('the index of a thing says where it lives in scale and what it is like, and a structure answers to its words', () => {
    const a = answerTraversal({ do: 'traverse', query: 'index', of: 'bearing' });
    expect(a).toMatch(/It lives at about \d\.\de-?\d+ m/);
    expect(a).toMatch(/Analogues: synovial joint/);
    expect(answerTraversal({ do: 'traverse', query: 'index', of: 'river basin' })).toMatch(/raindrop|drainage/);
    expect(answerTraversal({ do: 'traverse', query: 'index', of: 'market' })).toMatch(/price/);
  });
});

describe('the build is stepped, so no frame pays for the whole of it', () => {
  it('the steps are the bridge, each pack made and ingested, the repair, the queue, the manifolds; stepped and at once give the same substrate', () => {
    const steps: string[] = [];
    const g = buildSteps();
    let r = g.next();
    while (!r.done) { steps.push(r.value); r = g.next(); }
    expect(steps[0]).toBe('bridge');
    expect(steps).toEqual(expect.arrayContaining(['pack:scale', 'ingest:scale', 'pack:failures', 'repair', 'queue', 'manifolds']));
    expect(steps.at(-1)).toBe('manifolds');
    expect(steps.indexOf('repair')).toBeLessThan(steps.indexOf('queue'));
    expect(steps.filter((x) => x === 'queue').length).toBeGreaterThan(3); // the queue is seeded in chunks, each a step
    expect(steps.length).toBeGreaterThan(40);
    const stepped = r.value.substrate.census(), once = s.census();
    expect(stepped.entities).toBe(once.entities);
    expect(stepped.relations).toBe(once.relations);
    expect(stepped.stubs).toBe(once.stubs);
    expect(r.value.queue.size).toBe(built.queue.size);
  });

  it('advanceBuild keeps to its budget between steps and returns the built state only when done', () => {
    let clock = 0;
    const tick = () => (clock += 0.7);
    const g = buildSteps();
    let slices = 0, done = advanceBuild(g, 1, tick);
    while (!done) { slices++; expect(slices).toBeLessThan(200); done = advanceBuild(g, 1, tick); }
    // 1 ms of a clock that moves 0.7 ms a step: two steps a slice, so about half as many slices as steps
    expect(slices).toBeGreaterThan(10);
    expect(done.substrate.census().entities).toBe(s.census().entities);
    expect(advanceBuild(buildSteps(), 1e9, tick)).not.toBeNull();
  });
});
