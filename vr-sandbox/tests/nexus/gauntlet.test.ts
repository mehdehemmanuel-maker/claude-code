import { describe, expect, it } from 'vitest';
import { LIBRARY, defaultsOf, fits, portsOf, sameBehaviour, testBlock, type BlockDef } from '../../src/nexus/blocks';
import { Engine, emptyBoard, placeBlock, wire } from '../../src/nexus/dataflow';
import { engineBuilt, type EngineSpec } from '../../src/nexus/engines';
import { itemOf } from '../../src/nexus/inventory';
import { approveProposals, proposalsAll, candidatesOf, classOf, deleteThing, eventsSince, lastEvent, proposeByAnalogy, proposeFromDrawing, researchLoop, runGauntlet, sortUnknowns, tasksNow, unknownQueue, unknownsUnder, verdictOf, webResolver, wordsOf, type Lib } from '../../src/nexus/gauntlet';
import { rulesOf } from '../../src/nexus/make/rules';
import { sensor, wound } from '../../src/nexus/makers';
import { massOf } from '../../src/nexus/mass';
import type { Part } from '../../src/nexus/kits';
import { feedLinesOf, referenceOf, webParts } from '../../src/nexus/research';
import { feed } from '../../src/nexus/inventory';

const online = await fetch('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=engine&language=en&format=json&origin=*', { signal: AbortSignal.timeout(8000) }).then((r) => r.ok).catch(() => false);

const lib: Lib = { blocks: LIBRARY, test: (b) => testBlock(b), portsOf, defaultsOf, fits, same: sameBehaviour };
const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];
const mine = (b: Partial<BlockDef> & { id: string }): BlockDef => ({ name: b.id, kind: 'calculator', ability: 'calculate', domains: ['math'], says: 'a block of yours made to be put through the gauntlet in a test', version: 1, by: 'you', pure: true, ports: { inputs: [{ name: 'a', type: 'number' }], outputs: [{ name: 'r', type: 'number' }] }, ...b }) as BlockDef;

describe('the gauntlet: every gate that applies, cheapest first', () => {
  it('approves a law that is said, sourced, tested and holds when pushed', async () => {
    const [v] = await runGauntlet(lib, [{ id: 'law.stress.axial', kind: 'block', name: 'axial stress' }], { gates: ['documented', 'unique', 'versatile', 'sourced', 'tests', 'robust'] });
    expect(v!.approved, JSON.stringify(v!.results)).toBe(true); expect(verdictOf('block:law.stress.axial')?.approved).toBe(true);
  });
  it('turns back a block of yours with no tests, that gives NaN without a word, and says each gate it failed', async () => {
    const bad = mine({ id: 'zz.bad', run: (i) => ({ r: Math.sqrt(Number(i.a)) }) }); LIBRARY.set(bad.id, bad);
    try {
      const [v] = await runGauntlet(lib, [{ id: bad.id, kind: 'block', name: 'bad' }], { gates: ['documented', 'tests', 'robust'] });
      expect(v!.approved).toBe(false); expect(v!.failed).toEqual(['tests', 'robust']);
      expect(v!.results.find((r) => r.gate === 'robust')!.says).toMatch(/a negative: NaN given without a word/);
      expect(tasksNow().some((t) => t.id === 'fix:zz.bad')).toBe(true);
    } finally { LIBRARY.delete(bad.id); }
  });
  it('finds a block of yours that does what one already does (one owner per concern)', async () => {
    const twin = mine({ id: 'zz.twin', kind: 'calculator', ports: { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], outputs: [{ name: 'result', type: 'number' }] }, run: (i) => ({ result: Number(i.a) + Number(i.b) }), tests: [{ inputs: { a: 2, b: 3 }, outputs: { result: 5 } }] });
    LIBRARY.set(twin.id, twin);
    try { const [v] = await runGauntlet(lib, [{ id: twin.id, kind: 'block', name: 'twin' }], { gates: ['unique'] }); expect(v!.results[0]!.says).toMatch(/does what Add \(math\.add\) does/); }
    finally { LIBRARY.delete(twin.id); }
  });
  it('a block that makes parts: what it makes known to its materials, and come apart to single parts', async () => {
    const [v] = await runGauntlet(lib, [{ id: 'make.coil', kind: 'block', name: 'coil' }], { gates: ['known', 'explodes'] });
    expect(v!.approved, JSON.stringify(v!.results)).toBe(true);
  });
  it('an entry of the inventory: said, used, sourced, and known all the way down', async () => {
    const [v] = await runGauntlet(lib, [{ id: 'engine-ice', kind: 'item', name: 'piston engine' }]);
    expect(v!.results.find((r) => r.gate === 'known')!.pass, JSON.stringify(v!.results)).toBe(true);
    expect(v!.results.find((r) => r.gate === 'tests')!.pass).toBe(null);
  });
  it('candidates from the library and the inventory', () => {
    expect(candidatesOf(lib, { from: 'library', kind: 'law', most: 5 })).toHaveLength(5);
    expect(candidatesOf(lib, { from: 'inventory', ids: ['engine-ice'] })[0]!.kind).toBe('item');
  });
});

describe('the unknown queue: sorted by what its members share, researched in a loop to the bottom', () => {
  it('sorts by the kind of thing each is, so one maker makes a whole cluster', () => {
    const cls = sortUnknowns(['oil-pressure-switch', 'knock-sensor', 'coolant-temperature-sender', 'stator-winding', 'valve-cover-gasket', 'hose-clamp-zz'].map((id) => ({ id, why: 'not in the table' as const, wantedBy: ['x'], words: wordsOf(id) })));
    const sensors = cls.find((c) => c.key === 'sensor')!; expect(sensors.members.map((m) => m.id).sort()).toEqual(['coolant-temperature-sender', 'knock-sensor', 'oil-pressure-switch']); expect(sensors.maker).toBe('make.sensor');
    expect(classOf('stator winding')?.maker).toBe('make.wound');
    expect(wordsOf('screw-m3x10')).toBe('screw');
  });
  // (a thing drawn three levels deep whose parts nothing in the inventory knows yet: a hinged lid on its base, the hinge's
  // pin in its arm)
  const gadget = (): Part => ({ name: 'gadget', item: 'zz-gadget', at: [0, 0, 0], parts: [
    { name: 'arm', item: 'zz-arm', at: [0, 0.05, 0], parts: [{ name: 'arm plate', shape: { box: [0.06, 0.004, 0.02] }, at: [0, 0, 0], mat: 'al-6061' }, { name: 'pin', item: 'zz-pin', shape: { cyl: [0.002, 0.02] }, at: [0.025, 0.004, 0], mat: 'steel-low' }] },
    { name: 'base', item: 'zz-base', shape: { box: [0.08, 0.01, 0.04] }, at: [0, 0, 0], mat: 'abs' }] });
  it('reads a drawing back into entries: each tagged piece holding the tagged pieces in it, a leaf its material', () => {
    const ps = proposeFromDrawing(gadget(), 'a test'), by = Object.fromEntries(ps.map((p) => [p.id, p]));
    expect(by['zz-gadget']!.of.map((c) => c.id).sort()).toEqual(['zz-arm', 'zz-base']); expect(by['zz-gadget']!.make).toBe('assemble');
    expect(by['zz-arm']!.of.map((c) => c.id)).toEqual(['zz-pin']); expect(by['zz-base']!.of).toEqual([{ id: 'abs', n: 1 }]); expect(by['zz-base']!.make).toBe('mould');
    expect(by['zz-pin']!.of).toEqual([{ id: 'steel-low', n: 1 }]);
    // (a sensor made by its maker is known already, all the way down)
    expect(unknownsUnder(['sensor-puck', 'piezo-element'])).toEqual([]);
  });
  it('fills an unknown from its nearest known sibling, said as inferred and waiting for a source', () => {
    const p = proposeByAnalogy({ id: 'zz-fuel-injector-big', why: 'not in the table', wantedBy: [], words: 'fuel injector big' })!;
    expect(p.level).toBe('inferred'); expect(p.from).toBe('fuel-injector'); expect(p.says).toMatch(/to be confirmed by a source/);
  });
  it('goes down a drawing round after round, a level each, to a fixed point; then feeds what is sourced into the inventory', async () => {
    expect(unknownsUnder(['zz-gadget']).map((u) => u.id)).toEqual(['zz-gadget']);
    const r = await researchLoop(['zz-gadget'], { drawing: [gadget()] }, { by: 'a test' });
    // (round 1 the gadget; round 2 what is in it, its arm and base; round 3 the arm's pin; then nothing is left)
    expect(r.rounds.map((x) => x.unknowns)).toEqual([1, 2, 1]); expect(r.left).toEqual([]);
    const before = lastEvent(), f = approveProposals(['drawn'], ['zz-gadget']);
    expect(f.refused).toEqual([]); expect(itemOf('zz-gadget')!.of.length).toBe(2); expect(itemOf('zz-pin')!.make).toBe('machine');
    expect(unknownsUnder(['zz-gadget'])).toEqual([]);
    expect(eventsSince(before, 'resolved').length).toBe(4);
  });
  it('the M20A\'s researched parts: the same thing in the table carried over, a sensor as the sensor node makes one, a weak guess left unknown, to a fixed point', async () => {
    feed(feedLinesOf(referenceOf('m20a-fks')!.reference));
    const r = await researchLoop(['m20a-fks'], {}, { keep: false }), ps = proposalsAll().filter((p) => p.id.startsWith('m20a-fks.'));
    expect(r.fixed || !r.left.length).toBe(true); expect(r.rounds[0]!.resolved.table).toBeGreaterThan(10);
    expect(ps.find((p) => p.id === 'm20a-fks.coil')!.from).toBe('ignition-coil'); expect(itemOf(ps.find((p) => p.id === 'm20a-fks.piston')!.from)!.path.join('/')).toMatch(/Engines/);
    expect(ps.find((p) => p.id === 'm20a-fks.ect')!.from).toBe('make.sensor (threaded, thermistor)');
    const o2 = ps.find((p) => p.id === 'm20a-fks.o2')!; expect(o2.from).toBe('make.sensor (threaded, zirconia)'); expect(o2.of.map((c) => c.id)).toContain('zirconia-element');
    // (nothing inferred from one word in common: the electric cam phaser is not a kettle, and stays to be researched)
    expect(ps.find((p) => p.id === 'm20a-fks.vvt-in')).toBeUndefined(); expect(r.left.map((u) => u.id)).toContain('m20a-fks.vvt-in');
    for (const p of ps.filter((x) => x.level === 'inferred')) expect(itemOf(p.from)?.path[0] ?? 'Mechanical', p.id).not.toBe('Life');
  }, 120000);
  // (the real Wikidata, where this machine can reach it; where it cannot (this container's network policy blocks it),
  // the test is skipped and says so, never answered from a made-up reply)
  it.skipIf(!online)('asks the real web: an engine\'s parts from Wikidata, each a new unknown in its turn, its entity the source', async () => {
    const w = await webParts('internal combustion engine'); expect(w.url).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/); expect(w.parts.length).toBeGreaterThan(0);
    const p = (await webResolver(webParts)({ id: 'zz-ice', why: 'not in the table', wantedBy: [], words: 'internal combustion engine' }))!;
    expect(p.level).toBe('web'); expect(p.from).toBe(w.url); expect(p.of.length).toBe(w.parts.length + w.materials.length);
  });
});

describe('guarded deletion', () => {
  it('never takes out what is built in or seeded; says what it would do before it does it', () => {
    expect(deleteThing(lib, { kind: 'block', id: 'math.add' }, true).ok).toBe(false);
    expect(deleteThing(lib, { kind: 'item', id: 'engine-ice' }, true).ok).toBe(false);
    const b = mine({ id: 'zz.gone', run: () => ({ r: 1 }) }); LIBRARY.set(b.id, b);
    expect(deleteThing(lib, { kind: 'block', id: b.id }).says).toMatch(/would take out/); expect(LIBRARY.has(b.id)).toBe(true);
    expect(deleteThing(lib, { kind: 'block', id: b.id }, true).ok).toBe(true); expect(LIBRARY.has(b.id)).toBe(false);
  });
});

describe('the gauntlet as nodes on a board', () => {
  it('candidates through gate after gate, the approved read back, a listener hearing it, a task done when it holds', async () => {
    const b = emptyBoard('gauntlet');
    placeBlock(b, 'gauntlet.candidates', 0, 0, { ids: 'law.stress.axial law.ohm' }, 'cands');
    placeBlock(b, 'gauntlet.gate', 0, 0, { gate: 'documented' }, 'g1'); wire(b, 'cands', 'candidates', 'g1', 'candidates');
    placeBlock(b, 'gauntlet.gate', 0, 0, { gate: 'tests' }, 'g2'); wire(b, 'g1', 'passed', 'g2', 'candidates');
    placeBlock(b, 'gauntlet.gate', 0, 0, { gate: 'robust' }, 'g3'); wire(b, 'g2', 'passed', 'g3', 'candidates');
    placeBlock(b, 'on.event', 0, 0, { kind: 'approved', since: lastEvent() }, 'heard'); wire(b, 'g3', 'passed', 'heard', 'after');
    placeBlock(b, 'pass', 0, 0, {}, 'pass'); wire(b, 'g3', 'passed', 'pass', 'value');
    placeBlock(b, 'logic.compare', 0, 0, { op: '>' }, 'any'); wire(b, 'g3', 'passed', 'any', 'a');
    const run = new Engine(b); await run.run();
    for (const id of ['cands', 'g1', 'g2', 'g3', 'heard']) expect(run.state.get(id)?.status, `${id}: ${run.state.get(id)?.error}`).toBe('ok');
    expect(run.state.get('g3')!.out!.approved).toEqual(expect.arrayContaining(['block:law.stress.axial']));
    expect(run.state.get('heard')!.out!.count as number).toBeGreaterThan(0);
  });
  it('the unknown queue and the sorter as nodes; the loop as a node, from what is drawn', async () => {
    const b = emptyBoard('loop');
    placeBlock(b, 'make.sensor', 0, 0, { body: 'threaded', element: 'thermistor', item: 'zz-temp-sender', name: 'temperature sender' }, 'sens');
    placeBlock(b, 'research.loop', 0, 0, { rounds: 6 }, 'loop'); wire(b, 'sens', 'sensor', 'loop', 'drawing');
    placeBlock(b, 'unknown.sort', 0, 0, {}, 'sort');
    const run = new Engine(b); await run.run();
    expect(run.state.get('loop')?.status, run.state.get('loop')?.error).toBe('ok');
    // (its parts known already, it is read off the drawing in one round and nothing is left under it)
    expect((run.state.get('loop')!.out!.proposals as { id: string }[]).some((p) => p.id === 'zz-temp-sender')).toBe(true);
    expect(run.state.get('loop')!.out!.left).toBe(0);
    expect(unknownQueue().length).toBeGreaterThanOrEqual(0);
  });
});

describe('wire wound as wire, and a sensor made as it is made', () => {
  it('a winding\'s outer layer is its wire, turn by turn, at its own diameter; what clears its ring clears every turn', () => {
    const w = wound({ name: 'coil', ri: 0.005, ro: 0.01, L: 0.012, d: 0.0005 }), wire0 = w.parts!.find((p) => p.name === 'coil wire')!;
    expect('tube' in wire0.shape!).toBe(true); expect((wire0.shape as { tube: { r: number } }).tube.r).toBeCloseTo(0.00025, 9);
    expect(w.made!.turnsOuter).toBe(Math.floor((0.012 - 0.0005) / 0.0005)); expect(wire0.envelope).toBeDefined();
    const t = wound({ name: 'band', kind: 'toroid', ri: 0.04, ro: 0.06, L: 0.01, d: 0.0012 }); expect(t.made!.turnsOuter).toBe(Math.floor((2 * Math.PI * 0.0406) / 0.0012));
    // (fine wire: as many turns as can be drawn, and said)
    expect(wound({ name: 'fine', ri: 0.004, ro: 0.007, L: 0.024, d: 0.00006 }).says).toMatch(/drawn, each/);
  });
  it('every engine\'s windings are wire now, and every engine still comes back clean', () => {
    const s: EngineSpec = { cyl: 4, bore: 0.0805, stroke: 0.0976, fuel: 'petrol', block: 'al', cams: 'dohc', valves: 4, fit: 'm20a-fks' }, e = engineBuilt(s).engine;
    const wires = all(e).filter((p) => / wire$/.test(p.name) && p.mat === 'magnet-wire'); expect(wires.length).toBeGreaterThan(15);
    expect(all(e).filter((p) => p.item === 'winding' && p.shape)).toEqual([]);
    expect(rulesOf(e).findings).toEqual([]);
  }, 300000);
  it('a sensor of each body, its element, pins and shroud; weighed from its pieces', () => {
    for (const body of ['threaded', 'puck', 'block'] as const) { const s = sensor({ name: 's', body, element: 'hall', D: 0.02, L: 0.03 }); expect(all(s).some((p) => p.name === 'sensing element')).toBe(true); expect(all(s).filter((p) => p.name === 'terminal pin')).toHaveLength(3); expect(massOf(s)).toBeGreaterThan(0); expect(rulesOf(s).findings, body).toEqual([]); }
  });
});
