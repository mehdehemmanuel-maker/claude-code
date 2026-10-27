import { describe, expect, it } from 'vitest';
import { compileNotes, feedLinesOf, fidelityOf, gapOf, mergeReferences, referenceOf, referenceTree } from '../../src/nexus/research';
import { engineBuilt, type EngineSpec } from '../../src/nexus/engines';
import { feed, itemOf } from '../../src/nexus/inventory';
import { judge } from '../../src/nexus/breakdown';
import { Engine, emptyBoard, placeBlock, wire } from '../../src/nexus/dataflow';
import type { Part } from '../../src/nexus/kits';

const NOTES = `
@A | https://example.org/a | a page
@B | https://example.org/b | another
sys | the system | | 1 | | | typical | its parts
plug | spark plug | sys | 4 | ^spark plug$ | A | typical | one a cylinder
ins | insulator | plug | 1 | insulator | A | typical | round its electrode
pump | water pump | sys | 1 | water pump | B | confirmed | electric | water pump pulley
`;
const corolla: EngineSpec = { cyl: 4, bore: 0.0805, stroke: 0.0976, fuel: 'petrol', block: 'al', cams: 'dohc', valves: 4, fit: 'm20a-fks' };

describe('research notes compiled into a reference', () => {
  it('keeps each sourced part, refuses one with no source, and says a count written twice differently', () => {
    const c = compileNotes('t', 'test', `${NOTES}\nbad | coil | sys | 4 | coil | | typical | no source\nplug | spark plug | sys | 6 | ^spark plug$ | B | typical | six?`);
    expect(c.reference.entries.map((e) => e.id)).toEqual(['sys', 'plug', 'ins', 'pump']);
    expect(c.refused.some((r) => /^bad: no source/.test(r))).toBe(true);
    expect(c.conflicts).toEqual(['plug: 4 by A against 6 by B']);
    expect(referenceTree(c.reference)[0]).toBe('the system');
  });
  it('refuses a part in something not written, a level not one of the three, and a source not named', () => {
    const c = compileNotes('t', 't', '@A | https://x.org | x\na | thing | nowhere | 1 | a | A | typical | x\nb | thing | | 1 | b | A | maybe | x\nc | thing | | 1 | c | Z | typical | x');
    expect(c.reference.entries).toHaveLength(0); expect(c.refused).toHaveLength(3);
  });
  it('merges references, keeping all their sources', () => {
    const a = compileNotes('a', 'a', NOTES).reference, b = compileNotes('b', 'b', '@C | https://example.org/c | c\ncoil | ignition coil | | 4 | ignition coil | C | typical | on each plug').reference;
    const m = mergeReferences([a, b], 'm', 'm'); expect(m.refused).toEqual([]); expect(m.reference.sources).toHaveLength(3); expect(m.reference.entries).toHaveLength(5);
  });
  it('the M20A-FKS reference compiles whole: every part named has a source with its address', () => {
    const c = referenceOf('m20a-fks')!; expect(c.refused).toEqual([]); expect(c.conflicts).toEqual([]);
    for (const e of c.reference.entries.filter((x) => x.finds)) expect(c.reference.sources.find((s) => s.key === e.source)?.url, e.id).toMatch(/^https:\/\//);
  });
});

describe('the gap: what is drawn against what the sources say', () => {
  const thing: Part = { name: 'engine', parts: [{ name: 'spark plug', parts: [{ name: 'insulator', shape: { cyl: [0.005, 0.02] } }] }, { name: 'spark plug', shape: { cyl: [0.007, 0.05] } }, { name: 'water pump', parts: [{ name: 'water pump pulley', shape: { cyl: [0.03, 0.02] } }] }] };
  it('says each part drawn, short, missing (a part\'s parts looked for inside it), or drawn the way the sources say it is not', () => {
    const g = gapOf(thing, compileNotes('t', 't', NOTES).reference), by = Object.fromEntries(g.rows.map((r) => [r.id, r]));
    expect(by.plug!.status).toBe('short'); expect(by.plug!.have).toBe(2);
    // (one insulator, in one of the two plugs: wanted in each)
    expect(by.ins!.status).toBe('short'); expect(by.ins!.want).toBe('1 × 2');
    expect(by.pump!.status).toBe('wrong'); expect(by.sys!.status).toBe('grouping');
  });
  it('the Corolla\'s engine against Toyota\'s: most of what the sources name is drawn, and what is not is said', () => {
    const g = gapOf(engineBuilt(corolla).engine, referenceOf('m20a-fks')!.reference);
    expect(g.coverage).toBeGreaterThan(0.75);
    // (what is still to bridge, said honestly: its valvetrain is drawn on bucket tappets where the M20A has lash adjusters)
    expect(g.wrong.map((r) => r.id)).toEqual(['hla']);
    expect(g.missing.map((r) => r.id)).toContain('di');
    for (const id of ['knock', 'ckp', 'thermo', 'ewp', 'cat', 'egr', 'ac', 'harness', 'dipstick', 'hpp']) expect(g.rows.find((r) => r.id === id)?.status, id).toBe('drawn');
  });
  it('and drawn without its maker\'s choices, the same engine is short of them', () => {
    const g = gapOf(engineBuilt({ ...corolla, fit: undefined }).engine, referenceOf('m20a-fks')!.reference);
    expect(g.wrong.map((r) => r.id).sort()).toEqual(['drive', 'ewp', 'hla']);
  });
});

describe('fidelity: how finely a thing is made', () => {
  it('counts its boxes, by number and by volume, and names the biggest', () => {
    const f = fidelityOf({ name: 't', parts: [{ name: 'slab', shape: { box: [1, 1, 1] } }, { name: 'rod', shape: { cyl: [0.1, 1] } }, { name: 'bolt', shape: { lathe: [[0, 0], [0.01, 0], [0.01, 0.05], [0, 0.05]] } }] });
    expect(f.pieces).toBe(3); expect(f.boxes).toBe(1); expect(f.shaped).toBe(1); expect(f.fasteners).toBe(1);
    expect(f.boxVolume).toBeCloseTo(1 / (1 + Math.PI * 0.01 + Math.PI * 0.0001 * 0.05), 6); expect(f.biggestBoxes[0]!.name).toBe('slab');
  });
});

describe('a reference into the inventory', () => {
  it('enters each part holding its own, so it opens all the way down, and what has nothing in it waits to be broken down', () => {
    const r = compileNotes('zz-ref', 'a test reference', NOTES).reference, f = feed(feedLinesOf(r));
    expect(f.refused).toEqual([]); expect(itemOf('zz-ref')!.of.map((c) => c.id)).toEqual(['zz-ref.sys']);
    expect(itemOf('zz-ref.plug')!.of).toEqual([{ id: 'zz-ref.ins', n: 1 }]);
    expect(judge(itemOf('zz-ref.ins')!, (id) => itemOf(id) ?? undefined)).toBe('nothing in it listed');
    expect(itemOf('zz-ref.pump')!.says).toMatch(/example\.org\/b/);
  });
});

describe('research as a pipeline of nodes', () => {
  it('a researched reference and a drawn engine into the gap node, its parts tree opened, its fidelity measured', async () => {
    const b = emptyBoard('research');
    placeBlock(b, 'research.ref', 0, 0, { which: 'm20a-fks' }, 'ref');
    placeBlock(b, 'engine.whole', 0, 0, { fit: 'm20a-fks' }, 'eng');
    placeBlock(b, 'research.gap', 0, 0, {}, 'gap'); wire(b, 'eng', 'engine', 'gap', 'thing'); wire(b, 'ref', 'reference', 'gap', 'reference');
    placeBlock(b, 'check.fidelity', 0, 0, {}, 'fid'); wire(b, 'eng', 'engine', 'fid', 'thing');
    placeBlock(b, 'research.toInventory', 0, 0, {}, 'inv'); wire(b, 'ref', 'reference', 'inv', 'reference');
    placeBlock(b, 'research.parts', 0, 0, { depth: 4 }, 'tree'); wire(b, 'inv', 'item', 'tree', 'item');
    const run = new Engine(b); await run.run();
    for (const id of ['ref', 'eng', 'gap', 'fid', 'inv', 'tree']) expect(run.state.get(id)?.status, `${id}: ${run.state.get(id)?.error}`).toBe('ok');
    expect(run.state.get('gap')!.out!.coverage as number).toBeGreaterThan(0.75);
    expect(run.state.get('fid')!.out!.pieces as number).toBeGreaterThan(1400);
    // (its parts and theirs down three levels: the engine, its systems, their parts, their parts' parts)
    expect(run.state.get('tree')!.out!.deepest).toBe(3);
    expect((run.state.get('tree')!.out!.waiting as unknown[]).length).toBeGreaterThan(40);
  }, 120000);
});
