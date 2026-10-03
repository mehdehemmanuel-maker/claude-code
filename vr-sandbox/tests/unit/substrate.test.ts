// The substrate: reality indexed as an alien engineer would, cross-connected, every entity carrying where it comes from
// and how much of it is known, and a queue of what to ask next. The final test is answered by traversal, never by a list.
import { FAILURE_OF_FUNCTION } from '../../src/ganglia/substrate/population';
import { articled, findByWords, spokenName } from '../../src/ganglia/substrate/names';
import { describe, expect, it } from 'vitest';
import { LAWS } from '../../src/ganglia/laws';
import { interpret } from '../../src/assistant/intent';
import { answerTraversal } from '../../src/assistant/traverse';
import { hash, read } from '../../src/ganglia/native';
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

  it('a piece is made with its whole, and a living part by development, each at its own confidence and saying so', async () => {
    const s2 = build().substrate;
    // a block is made of what its pieces are made of; then what works that material makes it; then its pieces are made with it
    const whole = s2.get('block.fasten.bolt')!, piece = s2.get('block.fasten.bolt.thread')!;
    expect(s2.reach(whole.id, 'made-of')).toEqual([]);
    expect(s2.outOf(piece.id, 'produced-by')).toEqual([]);
    const organ = s2.get('bio.liver')!;
    expect(s2.outOf(organ.id, 'produced-by')).toEqual([]);
    const q = new Queue();
    for (const facet of ['materials', 'manufacturing'] as const) {
      q.push({ id: whole.id, facet, mode: 'deep', priority: 2, reason: 'test', domain: 'engineering' });
      await populate(s2, q, { expanders: [ruleExpander()], budget: 50, workers: 1 });
    }
    expect(s2.reach(whole.id, 'made-of').length, 'the bolt is made of what its head is made of').toBeGreaterThan(0);
    expect(s2.outOf(whole.id, 'produced-by').length, 'the bolt is made by what works its material').toBeGreaterThan(0);
    for (const e of [piece, organ]) q.push({ id: e.id, facet: 'constructors', mode: 'deep', priority: 1, reason: 'test', domain: 'engineering' });
    await populate(s2, q, { expanders: [ruleExpander()], budget: 50, workers: 1 });
    const byWhole = s2.outOf(piece.id, 'produced-by');
    expect(byWhole.length).toBeGreaterThan(0);
    for (const x of byWhole) { expect(x.confidence).toBe(0.5); expect(x.says).toMatch(/made with it$/); }
    const byLife = s2.outOf(organ.id, 'produced-by');
    expect(byLife.map((x) => x.to)).toEqual(['bio.development']);
    expect(byLife[0]!.confidence).toBe(0.6);
    expect(byLife[0]!.says).toMatch(/made by development/);
    expect(s2.outOf('bio.chloroplast', 'produced-by').map((x) => x.to)).toContain('bio.self-assembly');
  });

  it('a failure mode does not fail by itself: the failures facet derives nothing for a failure or a law, and a whole round rejects nothing', async () => {
    const s2 = build().substrate;
    const q = new Queue();
    for (const id of ['failure.wear', 'failure.fatigue', 'friction.coulomb']) q.push({ id, facet: 'failures', mode: 'deep', priority: 1, reason: 'test', domain: 'engineering' });
    const r = await populate(s2, q, { expanders: [ruleExpander()], budget: 50, workers: 1 });
    expect(r.rejected).toEqual([]);
    expect(s2.outOf('failure.wear', 'fails-by')).toEqual([]);
    expect(s2.outOf('friction.coulomb', 'fails-by')).toEqual([]);
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

  it('a piece of a building block that no kind can speak for says its own functions, and the bridge keeps them', async () => {
    const said = s.relations.filter((x) => x.kind === 'does' && x.says === 'the block says what its piece does');
    expect(said.length).toBeGreaterThanOrEqual(11);
    for (const x of said) { expect(x.from).toMatch(/^block\./); expect(s.get(x.to)!.kinds).toContain('function'); }
    expect(s.outOf('block.fasten.bolt.shank', 'does').map((x) => x.to)).toEqual(['fn.clamp.axial', 'fn.transmit.force']);
    // the other pieces learn their kind by name when the queue asks (the naming rule), and then do what the kind does
    const s2 = build().substrate;
    const q = new Queue();
    const pieces = [...s2.entities.values()].filter((e) => /^block\.[a-z.-]+\.[a-z-]+$/.test(e.id) && e.kinds.includes('component') && s2.reach(e.id, 'part-of').length);
    for (const e of pieces) q.push({ id: e.id, facet: 'functions', mode: 'deep', priority: 1, reason: 'test', domain: 'engineering' });
    await populate(s2, q, { expanders: [ruleExpander()], budget: 2000, workers: 1 });
    const idle = pieces.filter((e) => !s2.outOf(e.id, 'does').length && !s2.reach(e.id, 'is-a').some((k) => s2.outOf(k.id, 'does').length)).map((e) => e.id);
    // what remains is a region that is not a part and the assembly's systems: said here so a new idle piece is noticed
    expect(idle.sort()).toEqual(['block.actuation.rotary.back-emf', 'block.machine.assembly.systems']);
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

  it('every part the common pack describes can fail, and the index can say how: itself, as its kind, by its material, by its function, or as living tissue', () => {
    const fails = (id: string) => s.outOf(id, 'fails-by').length > 0;
    const canFail = (e: Entity): boolean => fails(e.id) || e.kinds.includes('biological') || s.reach(e.id, 'is-a').some((k) => fails(k.id)) || s.reach(e.id, 'made-of').some((m) => fails(m.id) || s.reach(m.id, 'is-a').some((fam) => fails(fam.id))) || s.reach(e.id, 'does').some((fn) => (FAILURE_OF_FUNCTION[fn.id] ?? []).length > 0);
    const mute = [...s.entities.values()].filter((e) => !isStub(e) && e.kinds.includes('component') && e.domains.includes('common') && !canFail(e)).map((e) => e.id);
    expect(mute).toEqual([]);
    for (const [fn, fs] of Object.entries(FAILURE_OF_FUNCTION)) { expect(s.has(fn), `${fn} in the failure table is described`).toBe(true); for (const f of fs) expect(s.has(f), `${f}, named by ${fn}, is described`).toBe(true); }
  });

  it('a thing described after a pack has named it carries the domain of the pack that describes it first, never unplaced', () => {
    const cortex = s.get('bio.cortex')!;
    expect(cortex.domains[0]).toBe('biology');
    // a cited law is physics whichever pack named it first: Wolff's law, named by the failures pack, Little's law by a network
    for (const e of [...s.entities.values()].filter((e) => e.kinds.includes('law') && e.coverage.unknowns.some((u) => /cited, not run/.test(u)))) expect(['physics', 'mechanical', 'scale'], e.id).toContain(e.domains[0]);
    expect(s.get('wolff.law')!.domains[0]).toBe('physics');
    expect([...s.entities.values()].filter((e) => !isStub(e) && e.domains[0] === 'unplaced').map((e) => e.id)).toEqual([]);
  });

  it('every part and material named five times or more is spoken by a human name, never the id as words', () => {
    const asWords = (e: Entity) => e.id.replace(/[.-]/g, ' ');
    const named = [...s.entities.values()].filter((e) => !isStub(e) && (e.kinds.includes('component') || e.kinds.includes('material') || e.kinds.includes('mechanism')) && /\./.test(e.id) && !/^(bio|block|way|cross|std|failure|fn|param|view|role|scale|observer|kind|flow|element|material|process|machine|chem|phys|earth)\./.test(e.id) && s.into(e.id).length >= 5);
    expect(named.length).toBeGreaterThan(15);
    const idWords = named.filter((e) => spokenName(e).toLowerCase() === asWords(e)).map((e) => e.id);
    expect(idWords).toEqual([]);
    expect(spokenName(s.get('copper.c110')!)).toBe('Copper C110 annealed');
    expect(spokenName(s.get('motor.electric')!)).toBe('electric motor');
    expect(spokenName(s.get('transistor.mosfet')!)).toBe('MOSFET');
    expect(spokenName(s.get('engine.internal-combustion')!)).toBe('internal combustion engine');
    // and the said layer is heard: the words find the thing
    expect(findByWords(s, 'DC motor')?.id).toBe('motor.dc');
    expect(findByWords(s, 'logic gate')?.id).toBe('gate.logic');
    // words resolve to the thing itself before anything merely indexed by the word: the bearing, not a block's
    // region called bearings; a metal's bare name is its family, never a wire or one alloy of it
    expect(findByWords(s, 'bearings')?.id).toBe('bearing');
    expect(findByWords(s, 'copper')?.id).toBe('material.copper-alloy');
    expect(findByWords(s, 'steel')?.id).toBe('material.steel');
    expect(findByWords(s, 'aluminium')?.id).toBe('material.aluminium-alloy');
    expect(findByWords(s, 'dc motor')?.id).toBe('motor.dc');
    // a name that carries its own article keeps it: "the mains grid", never "a the mains grid"
    expect(articled('the mains grid')).toBe('the mains grid');
    expect(articled('a person')).toBe('a person');
    expect(articled('engine')).toBe('an engine');
    expect(articled('bolt')).toBe('a bolt');
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

  it('Ego answers what a thing does from its function, with the law behind it, or from its kind', () => {
    const i = interpret('what does a rudder do');
    expect(i).toMatchObject({ do: 'traverse', query: 'function', of: 'rudder' });
    const a = answerTraversal(i as Extract<NonNullable<typeof i>, { do: 'traverse' }>);
    expect(a).toMatch(/^A rudder does one thing: steer: change the direction a vehicle moves/);
    // the laws said are the rudder's own (lift and drag), not the function word's generic ones (a car's cornering limit)
    expect(a).toMatch(/by Aerodynamic drag|by .*(?:drag|lift|Bernoulli)/);
    expect(interpret('what is a bearing for')).toMatchObject({ do: 'traverse', query: 'function', of: 'bearing' });
    expect(interpret('what is the function of a spring')).toMatchObject({ do: 'traverse', query: 'function', of: 'spring' });
    expect(answerTraversal({ do: 'traverse', query: 'function', of: 'wood screw' })).toMatch(/is a screw, and a screw does|does/);
  });

  it('Ego says what a thing is made of with the arrow\'s own saying, and a kind\'s material when the thing has none', () => {
    const rod = answerTraversal({ do: 'traverse', query: 'components', of: 'connecting rod' });
    expect(rod).toMatch(/^I know no parts of a connecting rod yet\. It is typically made of Steel AISI 4140 annealed \(Budynas & Nisbett\)\./);
    const bolt = answerTraversal({ do: 'traverse', query: 'components', of: 'bolt' });
    expect(bolt).toMatch(/is an? (?:cap screw|screw|fastener), and an? (?:cap screw|screw|fastener) is typically made of/);
    const servo = answerTraversal({ do: 'traverse', query: 'components', of: 'servo' });
    expect(servo).not.toMatch(/\b1 things\b/);
    expect(servo).toMatch(/Down to the leaves it is \d+ things/);
  });

  it('Ego derives how a thing fails on demand when the queue has not reached it, says so, and keeps it', () => {
    const first = answerTraversal({ do: 'traverse', query: 'failures', of: 'liver' });
    expect(first).toMatch(/^I had not been asked that\. From what a liver is made of, what it does and whether it lives, it fails \d+ ways: /);
    expect(first).toMatch(/injury|disease|aging/);
    expect(first).toMatch(/living tissue: it is injured, diseased and ages/);
    const again = answerTraversal({ do: 'traverse', query: 'failures', of: 'liver' });
    expect(again).toMatch(/^A liver fails by \d+ ways of its own/);
  });

  it('Ego derives what makes a thing on demand, says why, names things by name in a rule\'s saying, and never says "Those need ." of a maker that needs nothing', () => {
    const liver = answerTraversal({ do: 'traverse', query: 'producers', of: 'liver' });
    expect(liver).toMatch(/^I had not been asked that\. A liver is made by development \(a living part: made by development/);
    const spar = answerTraversal({ do: 'traverse', query: 'producers', of: 'spar' });
    expect(spar).toMatch(/^I had not been asked that\. A spar is made by .*\(a part of Aluminium 2024-T3 can be made by what works it/);
    expect(spar).not.toMatch(/aluminum\.2024/);
    const rudder = answerTraversal({ do: 'traverse', query: 'failures', of: 'rudder' });
    expect(rudder).toMatch(/made of Aluminium 2024-T3, which fails by fatigue/);
    expect(rudder.split(' In Nex: ')[0]).not.toMatch(/failure\.[a-z]/); // the English names things; the Nex line after it is ids by design
    const chloroplast = answerTraversal({ do: 'traverse', query: 'producers', of: 'chloroplast' });
    expect(chloroplast).toMatch(/^A chloroplast is made by self assembly\.$/);
  });

  it('what works a material makes a part of it, but joining and assembly do not; a part of an assembly is not made with it; a kidney filters by size', () => {
    // "tube" alone is a search token on every section in the catalogue and names no one thing; the square tube is a thing
    const tube = answerTraversal({ do: 'traverse', query: 'producers', of: 'square tube' });
    expect(tube).toMatch(/is made by .*saw/);
    expect(tube).not.toMatch(/glue|solder|weld|crimp/);
    expect(tube).toMatch(/\(a part of .*steel.* can be made by what works it, until its own maker is known\)/i);
    const flywheel = answerTraversal({ do: 'traverse', query: 'producers', of: 'flywheel' });
    expect(flywheel).not.toMatch(/made with it/);
    expect(answerTraversal({ do: 'traverse', query: 'function', of: 'kidney' })).toMatch(/filter: pass some of what comes and stop the rest/);
    expect(answerTraversal({ do: 'traverse', query: 'function', of: 'flywheel' })).toMatch(/store energy: energy out/);
    expect(s.reach('fn.lift', 'governed-by').map((l) => l.id)).toEqual(['lift.aero']);
  });

  it('Ego answers what is like a thing: said analogues first, then what shares a function, by name; living ones when asked', () => {
    expect(interpret('what is like a kidney')).toMatchObject({ do: 'traverse', query: 'analogues', of: 'kidney' });
    expect(interpret('what is the living analogue of a bearing')).toMatchObject({ do: 'traverse', query: 'analogues', of: 'bearing', which: 'living' });
    expect(interpret('what is a capacitor like in biology')).toMatchObject({ do: 'traverse', query: 'analogues', of: 'capacitor', which: 'living' });
    expect(interpret('analogues of a pump')).toMatchObject({ do: 'traverse', query: 'analogues', of: 'pump' });
    const kidney = answerTraversal({ do: 'traverse', query: 'analogues', of: 'kidney' });
    expect(kidney).toMatch(/^Analogues of a kidney: /);
    expect(kidney).toMatch(/\(both do filter\)/);
    expect(kidney).not.toMatch(/fn\./);
    const bearing = answerTraversal({ do: 'traverse', query: 'analogues', of: 'bearing', which: 'living' });
    expect(bearing).toMatch(/^Living analogues of a bearing: /);
  });

  it('Ego says how big and how fast a thing is, in the units that fit, with its neighbours at that size', () => {
    expect(interpret('how big is a kidney')).toMatchObject({ do: 'traverse', query: 'size', of: 'kidney' });
    expect(interpret('what size is a bearing')).toMatchObject({ do: 'traverse', query: 'size', of: 'bearing' });
    expect(interpret('how fast is a heartbeat')).toMatchObject({ do: 'traverse', query: 'size', of: 'heartbeat' });
    expect(interpret('what is the timescale of a neuron')).toMatchObject({ do: 'traverse', query: 'size', of: 'neuron' });
    expect(interpret('at what scale does a bearing live')).toMatchObject({ do: 'traverse', query: 'size', of: 'bearing' });
    const kidney = answerTraversal({ do: 'traverse', query: 'size', of: 'kidney' });
    expect(kidney).toMatch(/^A kidney is about 10 cm across and works on a timescale of about 1 min\./);
    expect(kidney).toMatch(/Beside it at that size: /);
    const transistor = answerTraversal({ do: 'traverse', query: 'size', of: 'transistor' });
    expect(transistor).toMatch(/is about \d+ (?:nm|µm) across/);
  });

  it('Ego compares two things: what they share, where they part, and each in a word', () => {
    expect(interpret('what is the difference between a bolt and a screw')).toMatchObject({ do: 'traverse', query: 'compare', of: 'bolt', which: 'screw' });
    expect(interpret('compare a bearing with a bushing')).toMatchObject({ do: 'traverse', query: 'compare', of: 'bearing', which: 'bushing' });
    expect(interpret('bolt versus screw')).toMatchObject({ do: 'traverse', query: 'compare', of: 'bolt', which: 'screw' });
    expect(interpret('how is a ball screw different from a lead screw')).toMatchObject({ do: 'traverse', query: 'compare', of: 'ball screw', which: 'lead screw' });
    expect(interpret('what do a kidney and a capacitor have in common')).toMatchObject({ do: 'traverse', query: 'compare', of: 'kidney', which: 'capacitor' });
    const bolt = answerTraversal({ do: 'traverse', query: 'compare', of: 'bolt', which: 'screw' });
    expect(bolt).toMatch(/is a kind of (?:cap screw|screw)/);
    expect(bolt).toMatch(/In a word: an? .+ is .+; an? .+ is /);
    const kidney = answerTraversal({ do: 'traverse', query: 'compare', of: 'kidney', which: 'capacitor' });
    expect(kidney).toMatch(/^Both filter\./);
    expect(kidney).toMatch(/What only a capacitor does: store charge/);
    const steel = answerTraversal({ do: 'traverse', query: 'compare', of: 'steel', which: 'aluminium' });
    expect(steel).toMatch(/In a word: steel is iron with/);
    expect(steel).not.toMatch(/\ba steel\b/);
    const motors = answerTraversal({ do: 'traverse', query: 'compare', of: 'dc motor', which: 'stepper motor' });
    expect(motors).toMatch(/^Both are a kind of electric motor\./);
    expect(motors).not.toMatch(/a brushed DC motor is a brushed DC motor/);
    expect(kidney).not.toMatch(/fn\./);
    const same = answerTraversal({ do: 'traverse', query: 'compare', of: 'bolt', which: 'hex bolt' });
    expect(same).toMatch(/are the same thing to me/);
  });

  it('what charges and discharges through a resistance cites the RC time constant, not the lumped thermal one', () => {
    for (const id of ['fn.couple.ac', 'fn.decouple', 'capacitor.bootstrap', 'interconnect.metal', 'failure.ripple', 'failure.inrush', 'failure.parasitic-capacitance']) {
      const laws = s.reach(id, 'governed-by').map((l) => l.id);
      expect(laws, id).toContain('rc.time-constant');
      expect(laws, id).not.toContain('lumped.time-constant');
    }
    expect(s.reach('heatsink', 'governed-by').map((l) => l.id)).toContain('lumped.time-constant');
    expect(s.get('rc.time-constant')!.kinds).toContain('law');
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
    expect(answerTraversal({ do: 'traverse', query: 'property', of: 'steel', which: 'melting point' })).toMatch(/^steel: melting point, carbon steel 1425 °C to 1540 °C \(The Engineering ToolBox, Metals and Alloys - Melting Temperatures/);
  });

  it('the index of a thing says where it lives in scale and what it is like, and a structure answers to its words', () => {
    const a = answerTraversal({ do: 'traverse', query: 'index', of: 'bearing' });
    expect(a).toMatch(/It lives at about \d+ (?:cm|mm|m) and about \d+ (?:ms|s)/);
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

describe('what the fifty-question probe of 3 October found, each fixed at its root', () => {
  it('bare property questions, a melting point asked as a temperature, and the process that makes a thing are understood', () => {
    expect(interpret('density of oak')).toMatchObject({ do: 'traverse', query: 'property', of: 'oak', which: 'density' });
    expect(interpret('youngs modulus of pla')).toMatchObject({ do: 'traverse', query: 'property', of: 'pla', which: 'youngs modulus' });
    expect(interpret('what temperature does pla melt at')).toMatchObject({ do: 'traverse', query: 'property', of: 'pla', which: 'melting point' });
    expect(interpret('what process makes a bolt')).toMatchObject({ do: 'traverse', query: 'producers', of: 'bolt' });
  });

  it('a metal asked bare answers for its family with the sourced range, and a plural finds the thing', () => {
    expect(answerTraversal({ do: 'traverse', query: 'property', of: 'copper', which: 'density' })).toMatch(/^copper alloy: density 7400 kg\/m\^3 to 8940 kg\/m\^3 \(The Engineering ToolBox/);
    expect(answerTraversal({ do: 'traverse', query: 'producers', of: 'bearings' })).toMatch(/A bearing is made by/);
    expect(answerTraversal({ do: 'traverse', query: 'producers', of: 'bearings' })).not.toMatch(/a bearings/);
  });

  it('a melting point is answered for a family from a sourced page, in degrees a person reads; a word that names several things asks which', () => {
    expect(interpret('what temperature does steel melt at')).toMatchObject({ do: 'traverse', query: 'property', of: 'steel', which: 'melting point' });
    expect(answerTraversal({ do: 'traverse', query: 'property', of: 'steel', which: 'melting point' })).toMatch(/^steel: melting point, carbon steel 1425 °C to 1540 °C \(The Engineering ToolBox, Metals and Alloys - Melting Temperatures \(read 2026-10-03\), https:\/\/www\.engineeringtoolbox\.com\/melting-temperature-metals-d_860\.html\)/);
    expect(answerTraversal({ do: 'traverse', query: 'property', of: 'aluminium', which: 'melting point' })).toMatch(/463 °C to 671 °C/);
    const oak = answerTraversal({ do: 'traverse', query: 'property', of: 'oak', which: 'density' });
    expect(oak).toMatch(/^I know no oak as such\. I know .*Northern red oak.*: which do you mean\?$/);
    expect(oak).toMatch(/White oak/);
  });

  it('a material is spoken without an article, sizes in human units, and what a thing does is governed by its own laws', () => {
    expect(answerTraversal({ do: 'traverse', query: 'producers', of: 'pla' })).toMatch(/(^|\. )PLA is made by/);
    expect(answerTraversal({ do: 'traverse', query: 'compare', of: 'heart', which: 'pump' })).toMatch(/lives at about 10 cm, a pump at about 30 cm/);
    expect(answerTraversal({ do: 'traverse', query: 'compare', of: 'heart', which: 'pump' })).not.toMatch(/e-1 m/);
    const fly = answerTraversal({ do: 'traverse', query: 'function', of: 'flywheel' });
    expect(fly).toMatch(/store energy/);
    expect(fly).toMatch(/by Energy a flywheel can hold per kilogram|by .*flywheel/);
    expect(fly).not.toMatch(/Electrical energy/);
  });
});

describe('the queue keeps its book', () => {
  it('a question asked again after it was done is counted, so processed equals done plus reasked, across serialize and restore', () => {
    const q = new Queue();
    const w = { id: 'bearing', facet: 'materials' as const, mode: 'deep' as const, priority: 1, reason: 'test', domain: 'engineering' };
    expect(q.push(w)).toBe(true);
    expect(q.pop()?.id).toBe('bearing');
    expect(q.push(w)).toBe(false); // done: not asked twice by itself
    expect(q.again(w)).toBe(true); // asked again on purpose
    expect(q.reasked).toBe(1);
    expect(q.pop()?.id).toBe('bearing');
    expect(q.done.size).toBe(1);
    expect(q.again({ ...w, id: 'gear' })).toBe(true); // never done before: queued, not a re-ask
    expect(q.reasked).toBe(1);
    const r = Queue.restore(q.serialize());
    expect(r.reasked).toBe(1);
    expect(r.done.has('bearing|materials|deep')).toBe(true);
  });
});

describe('what the second probe of 3 October found (lineage, construction, mechanisms, variants, materials, kinds, standards, interfaces)', () => {
  it('the phrasings are understood', () => {
    expect(interpret('what was a bicycle made from, all the way down')).toMatchObject({ do: 'traverse', query: 'lineage', of: 'bicycle' });
    expect(interpret('variants of a bolt')).toMatchObject({ do: 'traverse', query: 'variants', of: 'bolt' });
    expect(interpret('what sizes does a hex bolt come in')).toMatchObject({ do: 'traverse', query: 'variants', of: 'hex bolt' });
    expect(interpret('what material should a spring be')).toMatchObject({ do: 'traverse', query: 'materials-for', of: 'spring' });
    expect(interpret('what could a gear be made of')).toMatchObject({ do: 'traverse', query: 'materials-for', of: 'gear' });
    expect(interpret('what things store charge')).toMatchObject({ do: 'traverse', query: 'mechanisms-for', of: 'store charge' });
    expect(interpret('why does a bearing need lubrication')).toMatchObject({ do: 'reason', about: 'bearing need lubrication' });
    expect(interpret('what is a lever a kind of')).toMatchObject({ do: 'traverse', query: 'kinds', of: 'lever' });
    expect(interpret('what standards apply to a bolt')).toMatchObject({ do: 'traverse', query: 'standards', of: 'bolt' });
    expect(interpret('what does a servo connect to')).toMatchObject({ do: 'traverse', query: 'interfaces', of: 'servo' });
  });

  it('the answers come from the arrows: a thing asked for materials, a verb with an object, heat as a way of storing energy, kinds, standards, interfaces', () => {
    expect(answerTraversal({ do: 'traverse', query: 'materials-for', of: 'bearing' })).toMatch(/^A bearing is made of .*Chrome steel 52100/);
    const cut = answerTraversal({ do: 'traverse', query: 'mechanisms-for', of: 'cut steel' });
    expect(cut).toMatch(/^\d+ mechanisms cut: /);
    expect(cut).toMatch(/Which of them cut steel I have not been told/);
    expect(answerTraversal({ do: 'traverse', query: 'ways-to-store', of: 'heat' })).toMatch(/^Heat is stored as thermal storage: \d+ things do it/);
    // the lever has no kind above it in the seeds: said so, not "a kind of nothing I know" (which a test once pinned as if it were an answer)
    expect(answerTraversal({ do: 'traverse', query: 'kinds', of: 'lever' })).toMatch(/^I have no kind above a lever\. Kinds of lever: /);
    expect(answerTraversal({ do: 'traverse', query: 'standards', of: 'bolt' })).toMatch(/is standardized/);
    expect(answerTraversal({ do: 'traverse', query: 'interfaces', of: 'servo' })).toMatch(/^A hobby servo connects to /);
    // a wing lifts and a load cell measures force (Anderson; Horowitz & Hill)
    expect(answerTraversal({ do: 'traverse', query: 'mechanisms-for', of: 'lift' })).toMatch(/wing/);
    expect(answerTraversal({ do: 'traverse', query: 'mechanisms-for', of: 'measure force' })).toMatch(/load cell/);
  });
});

describe('Ego says a thing in her own language', () => {
  it('"say a bearing in your language" is her Nex structures rendered, with what English lost and the weakest evidence named', () => {
    expect(interpret('say a bearing in your language')).toMatchObject({ do: 'traverse', query: 'native', of: 'bearing' });
    expect(interpret('how do you think of a spring')).toMatchObject({ do: 'traverse', query: 'native', of: 'spring' });
    const a = answerTraversal({ do: 'traverse', query: 'native', of: 'bearing' });
    expect(a).toMatch(/^In Nex I hold a bearing as \d+ structures, hashed and compared without a word in them; \d of them, each as Nex writes it and then in English: /);
    // the Nex text of each structure is there, and reads back to a structure of the same hash as the English beside it was rendered from
    const first = /in English: (.+?) = /.exec(a)![1]!;
    expect(first).toMatch(/^(part|kind|function|influence|constrain)\(bearing, /);
    expect(hash(read(first)).slice(0, 8)).toBe(/Their hashes: #([0-9a-f]{8})/.exec(a)![1]);
    expect(a).toMatch(/English carried \d+ of \d+ pieces of those structures/);
    expect(a).toMatch(/the weakest evidence among them is (theorem|derived|measured|calibrated|simulated|estimated|extrapolated|hypothesized|assumed)/);
    expect(a).toMatch(/Their hashes: #[0-9a-f]{8}/);
  });
});

describe('the quantities themselves are things, told apart by dimension (the confusions English invites)', () => {
  it('temperature is a quantity, not a sensor; power a quantity, not a battery; weight the quantity before the law', () => {
    for (const [w, id] of [['temperature', 'qty.temperature'], ['power', 'qty.power'], ['force', 'qty.force'], ['mass', 'qty.mass'], ['speed', 'qty.speed'], ['velocity', 'qty.velocity'], ['energy', 'qty.energy'], ['weight', 'qty.weight'], ['heat', 'heat'], ['torque', 'qty.torque']]) expect(findByWords(s, w)?.id, w).toBe(id);
  });

  it('compared, heat and temperature, weight and mass, energy and power are different kinds of quantity; speed and velocity share a unit and are not the same thing', () => {
    const ht = answerTraversal({ do: 'traverse', query: 'compare', of: 'heat', which: 'temperature' });
    expect(ht).toMatch(/^Heat and temperature are different kinds of quantity: heat is counted in J, temperature in K, and neither can be more or less than the other\./);
    expect(ht).toMatch(/two bodies at one temperature exchange none/);
    expect(answerTraversal({ do: 'traverse', query: 'compare', of: 'weight', which: 'mass' })).toMatch(/^Weight and mass are different kinds of quantity: weight is counted in N, mass in kg/);
    expect(answerTraversal({ do: 'traverse', query: 'compare', of: 'energy', which: 'power' })).toMatch(/^Energy and power are different kinds of quantity: energy is counted in J, power in W/);
    const sv = answerTraversal({ do: 'traverse', query: 'compare', of: 'speed', which: 'velocity' });
    expect(sv).toMatch(/^Speed and velocity are counted in the same unit, m\/s, and are not the same thing/);
    expect(sv).toMatch(/with a direction/);
    // torque and energy share a dimension, which the answer says is not the same thing
    expect(answerTraversal({ do: 'traverse', query: 'compare', of: 'torque', which: 'energy' })).toMatch(/counted in the same unit/);
  });
});

describe('Ego answers whether one thing causes another by a chain of influences in Nex, and never from a correlation', () => {
  it('the forms are understood', () => {
    expect(interpret('does zinc plating prevent corrosion')).toMatchObject({ do: 'traverse', query: 'cause', of: 'zinc plating', which: 'corrosion' });
    expect(interpret('can redox cause combustion?')).toMatchObject({ do: 'traverse', query: 'cause', of: 'redox', which: 'combustion' });
    expect(interpret('is corrosion caused by zinc plating')).toMatchObject({ do: 'traverse', query: 'cause', of: 'zinc plating', which: 'corrosion' });
    expect(interpret('what causes corrosion')).toMatchObject({ do: 'traverse', query: 'cause', of: 'corrosion' });
  });

  it('a one-step influence, a two-step chain with its strength and evidence composed, none at all, and what influences a thing', () => {
    const zinc = answerTraversal({ do: 'traverse', query: 'cause', of: 'process.plating.zinc', which: 'chem.corrosion' });
    expect(zinc).toMatch(/contributes to \(lowers\) corrosion/);
    expect(zinc).toMatch(/The weakest evidence in that is (derived|calibrated|measured|estimated)/);
    const two = answerTraversal({ do: 'traverse', query: 'cause', of: 'chem.redox', which: 'machine.furnace' });
    expect(two).toMatch(/^Probably/);
    expect(two).toMatch(/By way of combustion/);
    const none = answerTraversal({ do: 'traverse', query: 'cause', of: 'bearing', which: 'kidney' });
    expect(none).toMatch(/^I know no mechanism by which a bearing causes a kidney/);
    expect(none).toMatch(/a correlation, which I hold as support, never as a cause/);
    const into = answerTraversal({ do: 'traverse', query: 'cause', of: 'chem.corrosion' });
    expect(into).toMatch(/^\d+ influences on (a )?corrosion that I know of: /);
    expect(into).toMatch(/lowers\) corrosion/);
  });
});

describe('Ego asks when a word has more than one sense, and settles it by structure where the question lets her', () => {
  it('"compare current and voltage" takes the electric current beside a quantity and says so; "what causes current" asks which current; a search token or a borrowed name is no longer a silent choice', () => {
    // before (3 October, 15:32 UTC): "compare current and voltage" answered of the ocean current ("a current is an ocean current; voltage is electric potential difference");
    // "what causes current" answered of the ocean current; "drive" was one motor variant, "music" was music wire, "material" was copper alloy
    const a = answerTraversal({ do: 'traverse', query: 'compare', of: 'current', which: 'voltage' });
    expect(a).toMatch(/^By current I take electric current, as a quantity\. Electric current and voltage are different kinds of quantity: electric current is counted in A, voltage in V/);
    const c = answerTraversal({ do: 'traverse', query: 'cause', of: 'current' });
    expect(c).toMatch(/^Current names 3 things to me: electric current \(a quantity, in A\); current, of earth \(a phenomenon\); .*\. Which do you mean\?$/);
    const s = built.substrate;
    expect(findByWords(s, 'drive')).toBeUndefined();
    expect(findByWords(s, 'music')).toBeUndefined();
    expect(findByWords(s, 'material')).toBeUndefined();
    expect(findByWords(s, 'glue')).toBeUndefined();
    expect(answerTraversal({ do: 'traverse', query: 'compare', of: 'drive', which: 'motor' })).toMatch(/^I know no drive as such\. I know .*: which do you mean\?/);
    expect(answerTraversal({ do: 'traverse', query: 'function', of: 'glue' })).toMatch(/^Glue names \d things to me: .*\. Which do you mean\?$/);
    // what has one sense is found as before
    expect(findByWords(s, 'copper')?.id).toBe('material.copper-alloy');
    expect(findByWords(s, 'bearing')?.id).toBe('bearing');
    expect(findByWords(s, 'heat')?.id).toBe('heat');
  });
});

describe('Ego says how her grammar has grown', () => {
  it('"what morphemes have you found" is the morphemes her own knowledge earned, by description length, each as Nex writes it with an example', () => {
    expect(interpret('what morphemes have you found')).toEqual({ do: 'traverse', query: 'grammar' });
    expect(interpret('how has your grammar grown?')).toEqual({ do: 'traverse', query: 'grammar' });
    const a = answerTraversal({ do: 'traverse', query: 'grammar' });
    expect(a).toMatch(/^My grammar grows by description length: over the \d+ structures I hold, \d+ shapes recur across domains and would each shorten the whole; I promoted 8, which shortened it by \d+%/);
    expect(a).toMatch(/The first is what you would call a textbook fact: a relation at my packs' usual confidence, derived, held true\./);
    expect(a).toMatch(/μ1 = part\(\$1, \$2\)/);
  });
});

describe('Ego answers a cause by a law when no arrow says it, keeps prevent apart from cause, and reads "the failure of X"', () => {
  it('"does the load cause the failure of a bearing": by the rating-life law, the equivalent load lowers the rating life; derived, with the sign taken at the law\'s worked example', () => {
    // before (3 October, 15:55 UTC): "I know no failure of a bearing" (the phrase was looked up as a thing)
    expect(interpret('does the load cause the failure of a bearing')).toEqual({ do: 'traverse', query: 'cause', of: 'load', which: 'failure of a bearing' });
    const a = answerTraversal({ do: 'traverse', query: 'cause', of: 'load', which: 'failure of a bearing' });
    expect(a).toMatch(/^No arrow of mine runs from a load to the failure of a bearing, but a law does: Load contributes to \(lowers\) rating life \(rev\) of bearing \(ISO 281/);
    expect(a).toMatch(/equivalent dynamic load \(P\) lowers rating life of bearing by \d\.\d % a percent at its worked example; derived, not measured here\./);
    // the rating C is a property of the bearing, not the load: never matched as the load
    expect(a).not.toMatch(/\(C\) raises/);
    expect(a).toMatch(/In Nex: influence\(flow\.load, quantity\(bearing, bearing\.life\.l10:L\)\)\{dir:1 polarity:- necessity:contributing mech:bearing\.life\.l10/);
    // a law read the other way (the cause names its output): voltage raises current by Ohm's law; and implicitly (both inputs, the output held): resistance lowers current
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'voltage', which: 'current' })).toMatch(/^No arrow of mine runs from voltage to electric current, but a law does: Voltage is needed for \(raises\) electric current .*Ohm's law \(V = I R\): voltage, the law read the other way \(V\) raises current \(I\) by 1\.0 % a percent at its worked example, and without it there is none.*In Nex: influence\(qty\.voltage, qty\.current\)\{dir:1 polarity:\+ necessity:necessary mech:ohm\^-1/);
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'resistance', which: 'current' })).toMatch(/Resistance contributes to \(lowers\) electric current .*resistance \(R\) lowers current \(I\) by 1\.0 % a percent.*mech:ohm\/I/);
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'mass', which: 'weight' })).toMatch(/Mass is needed for \(raises\) weight .*mass \(m\) raises weight \(W\) by 1\.0 % a percent at its worked example, and without it there is none/);
    // necessity is read off the law, not assumed (docs/NEX-AUDIT.md, question 3): an input whose absence zeroes the
    // output is needed (I for V in V = I R, and V for I the other way); a divisor or a term only contributes (R for I
    // with V held); the only input of a law is enough, with its constants
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'current', which: 'voltage' })).toMatch(/^No arrow of mine runs from electric current to voltage, but a law does: Electric current is needed for \(raises\) voltage .*Ohm's law \(V = I R\): current \(I\) raises voltage \(V\) by 1\.0 % a percent at its worked example, and without it there is none; derived, not measured here\. Electric current contributes to \(lowers\) voltage .*Electrical power \(P = V I\)/);
    // a law with a constant (g) now has a sensitivity at all: before, its influences were silently dropped
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'mass', which: 'raised mass' })).toMatch(/^No arrow of mine runs from mass to a raised mass on a hoist, but a law does: Mass is needed for \(raises\) potential energy \(J\) of raised mass on a hoist .*Gravitational potential energy \(E = m g h\): mass \(m\) raises potential energy of raised mass on a hoist by 1\.0 % a percent at its worked example, and without it there is none; derived, not measured here\. In Nex: influence\(qty\.mass, quantity\(mass\.raised, energy\.potential:E\)\)\{dir:1 polarity:\+ necessity:necessary mech:energy\.potential/);
    // prevent is not cause: the same words with "prevent" look for the opposite sign, and say prevent
    expect(interpret('does a lubricant prevent the failure of a bearing')).toMatchObject({ do: 'traverse', query: 'cause', of: 'lubricant', which: 'failure of a bearing', prevent: true });
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'lubricant', which: 'failure of a bearing', prevent: true })).toMatch(/^I know no mechanism by which oil prevents the failure of a bearing/);
    // a thing she does not know is no cause, and no correlation would make it one
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'ice cream', which: 'drowning' })).toBe('I know no ice cream. So I know no mechanism by which it causes drowning. Two things rising together would be a correlation, which I hold as support, never as a cause.');
    // a word of two senses beside a quantity is the quantity
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'current', which: 'heat' })).toMatch(/^I know no mechanism by which electric current causes heat/);
    // "what fails a bearing" is its failure modes
    expect(interpret('what fails a bearing')).toEqual({ do: 'traverse', query: 'failures', of: 'bearing' });
    // corrosion the chemistry and corrosion the failure are one thing seen twice: found, not asked
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'corrosion' })).toMatch(/^\d+ influences on corrosion that I know of: /);
  });
});

describe('Ego says how she knows each failure, from the arrow\'s structure in Nex', () => {
  it('the tally of evidence behind the failures, none measured in her world, and the first arrow as Nex writes it; a thing with no failure of its own says so', () => {
    const bearing = answerTraversal({ do: 'traverse', query: 'failures', of: 'bearing' });
    expect(bearing).toMatch(/^A bearing fails by 5 ways of its own: spalling, /);
    expect(bearing).toMatch(/Each is a mechanism with a law behind it, not a label\. \d+ derived(, \d+ \w+)*; none measured in my world\. In Nex: influence\(failure\.spalling, bearing\)\{dir:1 polarity:- necessity:contributing cert:\{kind:interval lo:0\.75 hi:0\.95 source:epistemic\} ev:\{how:derived\} mode:true\}$/);
    // before: "A hex bolt fails by 0 ways of its own: . And 9 more it inherits"
    const bolt = answerTraversal({ do: 'traverse', query: 'failures', of: 'bolt' });
    expect(bolt).toMatch(/^A hex bolt fails in no way of its own that I know\. \d+ it inherits: thread stripping/);
    expect(bolt).not.toMatch(/0 ways/);
  });
});

describe('Ego decomposes a symptom into candidates, none chosen (section M in her own path)', () => {
  it('"that motor is struggling" is five readings of a motor with what would settle each; "the bearing is noisy" is the failure modes that carry the word; a word no failure carries is said so', () => {
    // before (3 October, 16:16 UTC): none of these was understood at all
    expect(interpret('that motor is struggling')).toEqual({ do: 'traverse', query: 'symptom', of: 'motor', which: 'struggling' });
    expect(interpret('the bearing is noisy')).toEqual({ do: 'traverse', query: 'symptom', of: 'bearing', which: 'noisy' });
    const motor = answerTraversal({ do: 'traverse', query: 'symptom', of: 'motor', which: 'struggling' });
    // the electric motor's failures that carry the word (overheating, brush wear, a bearing past its life), then the five readings of a motor's quantities
    expect(motor).toMatch(/^"Struggling" of a motor could be [6-9] things to me, none chosen: .*the torque asked of it is near what it can give \(settled by a torque reading against the stall torque\); its speed has fallen under its load/);
    expect(motor).toMatch(/the word is where my certainty is lowest\. In Nex: influence\(failure\.[a-z-]+, motor\)\{dir:1 polarity:- necessity:contributing cert:\{kind:interval lo:0 hi:[0-9.]+ source:epistemic\} ev:\{how:hypothesized src:\["said: \\"struggling\\""\]\} mode:unmeasured instrument:/);
    const bearing = answerTraversal({ do: 'traverse', query: 'symptom', of: 'bearing', which: 'noisy' });
    expect(bearing).toMatch(/^"Noisy" of a bearing could be 4 things to me, none chosen: spalling: .*; brinelling: .*; wear: .*; lubricant starvation: /);
    expect(bearing).toMatch(/In Nex: influence\(failure\.spalling, bearing\)\{dir:1 polarity:- necessity:contributing cert:\{kind:interval lo:0 hi:0\.5 source:epistemic\} ev:\{how:hypothesized src:\["said: \\"noisy\\""\]\} mode:unmeasured instrument:"measuring /);
    // a motor's readings are a motor's: a weak heart gets only what fails a heart, and none of those carries the word
    expect(answerTraversal({ do: 'traverse', query: 'symptom', of: 'heart', which: 'weak' })).toBe('"weak" names no failure I know of a heart. What I know fails it: infarction, arrhythmia, valve stenosis; none of them carries that word, so I cannot say which you mean.');
    expect(answerTraversal({ do: 'traverse', query: 'symptom', of: 'bearing', which: 'purple' })).toMatch(/^"purple" names no failure I know of a bearing\. What I know fails it: spalling/);
    // a complaint about a build in the world stays a complaint
    expect(interpret('the kart is slow')).toEqual({ do: 'complain', words: 'the kart is slow' });
  });
});

describe('Ego says the form of a law and the laws that share it across theories', () => {
  it('"what laws have the same form as the spring energy" is the four other quadratic stores; Carnot has no form', () => {
    expect(interpret('what laws have the same form as the energy in a spring')).toEqual({ do: 'traverse', query: 'form', of: 'energy in a spring' });
    expect(interpret("which laws look like ohm's law")).toEqual({ do: 'traverse', query: 'form', of: 'ohms law' });
    const a = answerTraversal({ do: 'traverse', query: 'form', of: 'energy in a spring' });
    expect(a).toMatch(/^Energy in a spring \(E = ½ k x²\) has the form J:1,2: an energy, one input times one input squared, read off its own evaluation with every symbol gone\. 4 laws have the same form in other theories: Kinetic energy \(E = ½ m v²\); .*Energy in a capacitor \(E = ½ C V²\); Energy in an inductor \(E = ½ L I²\): one structure said 5 ways\. In Nex: morphism\(spring\.energy, energy\.kinetic\)\{mech:"J:1,2" ev:\{how:derived/);
    expect(answerTraversal({ do: 'traverse', query: 'form', of: 'ohms law' })).toMatch(/^Ohm's law \(V = I R\) has the form V:1,1: a voltage, 2 inputs, .* 2 laws have the same form in the same theory: Back-EMF/);
    expect(answerTraversal({ do: 'traverse', query: 'form', of: 'carnot' })).toMatch(/^Carnot efficiency \(η = 1 − T_c \/ T_h\) has no form I can take/);
  });
});

describe('Ego on what causes a thing: its laws speak when no arrow does, and one word for two things is told apart by kind', () => {
  it('"what causes brush wear" is answered from the laws that govern it; "what causes fatigue" tells the phenomenon from the failure; "what are the kinds of motor" parses', () => {
    // before (3 October, 16:32 UTC): "I know no mechanism that causes brush wear"; "fatigue contributes to (raises) fatigue"; "what are the kinds of motor" was a recall
    const brush = answerTraversal({ do: 'traverse', query: 'cause', of: 'brush wear' });
    expect(brush).toMatch(/^I know no arrow that causes brush wear: none of mine runs into it\. Its laws say, derived at their worked examples: by Coulomb friction \(F ≤ μ N\): friction coefficient \(mu\) raises it, normal force \(N\) raises it; by Joule heating \(P = I² R\): current \(I\) raises it, resistance \(R\) raises it\. Two things rising together/);
    // a thing that is an input of its law is never its own cause: the law is read for it (before: "current (I) raises it, resistance (R) raises it")
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'electric current' })).toMatch(/^I know no arrow that causes electric current: none of mine runs into it\. Its laws say, derived at their worked examples: by Ohm's law \(V = I R\) read for current \(I\): voltage \(V\) raises it, resistance \(R\) lowers it with voltage held\. Two things rising together/);
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'temperature' })).toMatch(/by Heat capacity \(Q = m c ΔT\) read for temperature rise \(dT\): heat \(Q\) raises it, mass \(m\) lowers it with heat held, specific heat \(c\) lowers it with heat held\./);
    // a law with a constant (g) is read at all (before: its evaluation without g was NaN and it was dropped without a word)
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'pressure' })).toMatch(/by Hydrostatic pressure \(p = ρ g h\): density \(rho\) raises it, depth \(h\) raises it\./);
    const fatigue = answerTraversal({ do: 'traverse', query: 'cause', of: 'fatigue' });
    expect(fatigue).toMatch(/fatigue \(the \w+\) contributes to \(raises\) fatigue \(the \w+\)/);
    expect(interpret('what are the kinds of motor')).toEqual({ do: 'traverse', query: 'kinds', of: 'motor' });
    expect(answerTraversal({ do: 'traverse', query: 'kinds', of: 'bearing' })).toMatch(/^I have no kind above a bearing\. Kinds of bearing: /);
    // "current" beside overheating is the current Joule heating takes, not the ocean current
    expect(answerTraversal({ do: 'traverse', query: 'cause', of: 'current', which: 'overheating' })).toMatch(/^No arrow of mine runs from electric current to overheating, but a law does: Electric current is needed for \(raises\) heat \(W\) of overheating .*Joule heating \(P = I² R\): current \(I\) raises heat of overheating by 2\.0 % a percent at its worked example, and without it there is none/);
    // a generic motor sparks as its kinds' kinds do: the brushed motor's brush wear
    expect(answerTraversal({ do: 'traverse', query: 'symptom', of: 'motor', which: 'sparking' })).toMatch(/^"Sparking" of a motor could be .*brush wear: /);
    expect(interpret('what are the standards for a bearing')).toMatchObject({ do: 'traverse', query: 'standards', of: 'bearing' });
    expect(interpret('what is the lineage of a transistor')).toMatchObject({ do: 'traverse', query: 'lineage', of: 'transistor' });
  });
});

describe('Ego says impossible only with a certificate, and holds her anomalies (docs/NEX-DISCOVERY.md)', () => {
  it('"is an efficiency of 0.5 possible with a cold side of 300 K and a hot side of 400 K" is a certificate: the law, the bound, the assumptions, and what dropping one does', () => {
    expect(interpret('is an efficiency of 0.5 possible with a cold side of 300 K and a hot side of 400 K')).toEqual({ do: 'traverse', query: 'possible', of: 'efficiency', claim: { value: 0.5, unit: '', given: 'a cold side of 300 K and a hot side of 400 K' } });
    const no = answerTraversal({ do: 'traverse', query: 'possible', of: 'efficiency', claim: { value: 0.5, unit: '', given: 'a cold side of 300 K and a hot side of 400 K' } });
    expect(no).toMatch(/^No, not under those assumptions: Carnot efficiency \(η = 1 − T_c \/ T_h\) at these inputs gives at most 0\.25 -; the claim is 0\.5 -; so assumptions \+ law \+ claim ⇒ ⊥\. Assumptions: Carnot efficiency holds: Reversible limit; real engines reach about half to three quarters of it\.; cold side = 300; hot side = 400\. Drop one and it is unknown again, not impossible\. In Nex: contradict\(quantity\(eta, 0\.5\[-\]\)\{ev:\{how:hypothesized\}\}, quantity\(eta, 0\.25\[-\]\)/);
    expect(no).toMatch(/mode:impossible-under under:\["Carnot efficiency holds/);
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'efficiency', claim: { value: 0.2, unit: '', given: 'a cold side of 300 K and a hot side of 400 K' } })).toBe('Yes, within the law: Carnot efficiency allows it: the ceiling is 0.25 - and the claim is 0.2 -.');
    // the law outside its domain is not a certificate
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'efficiency', claim: { value: 0.2, unit: '', given: 'a cold side of 400 K and a hot side of 300 K' } })).toBe('Carnot efficiency does not hold at these inputs: no work flows from cold to hot: the law does not hold there, so I cannot say impossible: outside its domain.');
    // the givens are read in the unit said and carried into the law's: 27 °C and 127 °C
    expect(interpret('Is an efficiency of 0.2 possible with a cold side of 27 degC and a hot side of 127 degC?')?.do).toBe('traverse');
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'efficiency', claim: { value: 0.2, unit: '', given: 'a cold side of 27 degC and a hot side of 127 degC' } })).toBe('Yes, within the law: Carnot efficiency allows it: the ceiling is 0.2499 - and the claim is 0.2 -.');
  });

  it('an equality law entails or contradicts a value; units are carried (0.5 kJ); a missing input or a wrong unit is said, and no law means unknown, never impossible', () => {
    expect(interpret('can the kinetic energy reach 500 J with a mass of 120 kg and a speed of 2.2 m/s')).toEqual({ do: 'traverse', query: 'possible', of: 'kinetic energy', claim: { value: 500, unit: 'J', given: 'a mass of 120 kg and a speed of 2.2 m/s' } });
    const no = answerTraversal({ do: 'traverse', query: 'possible', of: 'kinetic energy', claim: { value: 0.5, unit: 'kJ', given: 'a mass of 120 kg and a speed of 2.2 m/s' } });
    expect(no).toMatch(/^No, not under those assumptions: Kinetic energy \(E = ½ m v²\) at these inputs gives 290\.4 J; the claim is 500 J, beyond the claim taken at its word; so assumptions \+ law \+ claim ⇒ ⊥\. Assumptions: Kinetic energy holds: Translation only; a spinning body adds ½ I ω²\.; mass = 120; speed = 2\.2\. Drop one and it is unknown again, not impossible\. In Nex: contradict\(quantity\(E, 500\[J\]\)/);
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'kinetic energy', claim: { value: 290.4, unit: 'J', given: 'a mass of 120 kg and a speed of 2.2 m/s' } })).toBe('Yes: Kinetic energy gives 290.4 J at these inputs and the claim is 290.4 J, within the claim taken at its word.');
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'kinetic energy', claim: { value: 500, unit: 'J', given: 'a mass of 120 kg' } })).toBe('Kinetic energy reaches kinetic energy but needs speed (v); no certificate, so not impossible: unknown.');
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'kinetic energy', claim: { value: 500, unit: 'J', given: 'a mass of 120 s and a speed of 2.2 m/s' } })).toBe('Kinetic energy reaches kinetic energy but needs mass (m); no certificate, so not impossible: unknown. (a unit does not fit: s for mass, which is in kg)');
    expect(interpret('is 1000 N of tractive force possible with a tyre-road friction of 0.8 and a load on driven wheels of 600 N')).toEqual({ do: 'traverse', query: 'possible', of: 'tractive force', claim: { value: 1000, unit: 'N', given: 'a tyre-road friction of 0.8 and a load on driven wheels of 600 N' } });
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'tractive force', claim: { value: 1000, unit: 'N', given: 'a tyre-road friction of 0.8 and a load on driven wheels of 600 N' } })).toMatch(/^No, not under those assumptions: Traction limit \(F ≤ μ N_driven\) at these inputs gives at most 480 N; the claim is 1000 N/);
    expect(answerTraversal({ do: 'traverse', query: 'possible', of: 'harvest mass', claim: { value: 5, unit: 'kg', given: '' } })).toBe('No law of mine computes or bounds harvest mass in kg, so I cannot call it impossible: unknown. Impossible needs a certificate, and I have none.');
  });

  it('"what anomalies do you hold" is the register: counts by status, the explained one kept with its explanation and the skeptic\'s computed candidate', () => {
    expect(interpret('what anomalies do you hold')).toEqual({ do: 'traverse', query: 'anomalies' });
    expect(interpret('is anything unexplained')).toEqual({ do: 'traverse', query: 'anomalies' });
    const a = answerTraversal({ do: 'traverse', query: 'anomalies' });
    expect(a).toMatch(/^I hold 11 observations against the law book: 0 alive, 1 explained, 10 within tolerance\. Nothing is alive: every observation beyond tolerance has its explanation kept under it\. Explained and kept: observation\.cooling-size:against-froude: observed 2\.181 against predicted 1\.414, 54\.2 times the tolerance \(/);
    expect(a).toMatch(/; explained: the thermal world is not Froude-similar: free convection/);
    expect(a).toMatch(/the skeptic computes: the observation would be exact if the exponent were 1\.125 instead of 0\.5\. No two anomalies share a law ancestry\.$/);
  });
});

describe('Ego finds the edge of a law along one input (Nex Space)', () => {
  it('"how far can the load go before the rating life law stops applying" walks the family and bisects; a law with no computed domain says so', () => {
    expect(interpret('how far can the load go before the rating life law stops applying')).toEqual({ do: 'traverse', query: 'edge', of: 'rating life law', which: 'load' });
    const a = answerTraversal({ do: 'traverse', query: 'edge', of: 'rating life law', which: 'load' });
    expect(a).toMatch(/^Bearing rating life \(L10\) \(L10 = \(C \/ P\)\^p × 10⁶ rev\) stops applying going up at equivalent dynamic load \(P\) = 7\.4 N: a load past half the dynamic rating \(P\/C 0\.50\) .* \(found in \d+ evaluations to a millionth, with the other inputs at the worked example\)\. Between the example and that edge the law generates every value on demand; none is stored\. In Nex at the edge: function\(bearing\.life\.l10, /);
    expect(answerTraversal({ do: 'traverse', query: 'edge', of: 'traction limit', which: 'friction' })).toMatch(/stops applying going up at tyre-road friction \(mu\) = 1\.6/);
    expect(answerTraversal({ do: 'traverse', query: 'edge', of: 'kinetic energy', which: 'speed' })).toMatch(/^Kinetic energy \(E = ½ m v²\) declares no edge along speed: its domain is said only in words/);
  });
});

describe('Ego on whether two things lie on one continuum (Nex Space)', () => {
  it('heat and temperature have no space between them; torque and energy lie on one line that laws make a family; a motor and a bearing share no coordinate', () => {
    expect(interpret('is there a continuum between heat and temperature')).toEqual({ do: 'traverse', query: 'between', of: 'heat', which: 'temperature' });
    expect(answerTraversal({ do: 'traverse', query: 'between', of: 'heat', which: 'temperature' })).toMatch(/^No: heat \(J\) and temperature \(K\) have different dimensions, so there is no space between them to interpolate in; what looks like a scale from one to the other is a word, not a coordinate\.$/);
    expect(answerTraversal({ do: 'traverse', query: 'between', of: 'torque', which: 'energy' })).toMatch(/^Torque and energy are both counted in N m: numbers of one dimension lie on a line, and a law makes the line a family\. \d+ laws? of mine take both/);
    expect(answerTraversal({ do: 'traverse', query: 'between', of: 'motor', which: 'bearing' })).toMatch(/^A motor and a bearing are two distinctions: they share no coordinate/);
    // "the weight law" finds the law named Weight
    expect(answerTraversal({ do: 'traverse', query: 'form', of: 'weight law' })).toMatch(/^Weight \(W = m g\) has the form N:1,1/);
  });
});
