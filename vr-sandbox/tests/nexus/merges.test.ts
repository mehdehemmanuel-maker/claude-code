// Blocks merged into the one that does what they did and more (docs/PLACEMENT.md, section 13): an old id still runs as it
// did, through the kept block, and a board made with it is moved on to the kept block, its wires renamed.
import { describe, expect, it } from 'vitest';
import { ALIASES, LIBRARY, block } from '../../src/nexus/blocks';
import { Engine, emptyBoard, placeBlock, rewire, wire } from '../../src/nexus/dataflow';

describe('merged blocks', () => {
  it('every old id is gone from the library and runs through the block kept', () => {
    for (const [old, a] of Object.entries(ALIASES)) {
      expect(LIBRARY.has(old), old).toBe(false);
      expect(LIBRARY.has(a.to), `${old} → ${a.to}`).toBe(true);
      expect(block(old)?.alias, old).toBe(a.to);
    }
  });
  it('an old block run as itself gives what it gave, under its old port names', async () => {
    const ring = await block('array.circle')!.run!({ thing: { name: 'b' }, n: 2, r: 1 }, { set: {} });
    expect((ring.ring as { items: unknown[] }).items).toHaveLength(2);
    const sum = await block('math.sum')!.run!({ values: [1, 2, 3.5] }, { set: {} });
    expect(sum).toMatchObject({ sum: 6.5, count: 3 });
    const sl = await block('in.slider')!.run!({}, { set: { value: 150, min: 0, max: 100 } });
    expect(sl.value).toBe(100);
  });
  it('a board made with old blocks is moved on to the kept ones, its wires renamed, and runs', async () => {
    const b = emptyBoard('old');
    placeBlock(b, 'in.slider', 0, 0, { value: 150, min: 0, max: 100 }, 's');
    placeBlock(b, 'math.sum', 0, 0, {}, 'sum'); wire(b, 's', 'value', 'sum', 'values');
    placeBlock(b, 'gauntlet.candidates', 0, 0, { ids: 'law.stress.axial' }, 'c');
    placeBlock(b, 'gauntlet.gate', 0, 0, { gate: 'documented' }, 'g'); wire(b, 'c', 'candidates', 'g', 'candidates');
    placeBlock(b, 'view.show', 0, 0, {}, 'p'); wire(b, 'g', 'passed', 'p', 'value');
    placeBlock(b, 'unknown.sort', 0, 0, {}, 'u');
    placeBlock(b, 'view.show', 0, 0, {}, 'q'); wire(b, 'u', 'count', 'q', 'value');
    const run = new Engine(b); await run.run();
    expect(b.nodes.s!.block).toBe('in.number'); expect(b.nodes.s!.set?.style).toBe('slider');
    expect(b.nodes.g!.block).toBe('gauntlet.run'); expect(b.nodes.g!.set?.gates).toBe('documented');
    expect(Object.values(b.edges).find((e) => e.from === 'g')?.out).toBe('approved');
    expect(Object.values(b.edges).find((e) => e.from === 'u')?.out).toBe('clusterCount');
    for (const id of ['s', 'sum', 'c', 'g', 'p', 'u', 'q']) expect(run.state.get(id)?.status, `${id}: ${run.state.get(id)?.error}`).toBe('ok');
    expect(run.state.get('sum')!.out!.sum).toBe(100);
    expect(run.state.get('g')!.out!.approved).toEqual(['block:law.stress.axial']);
    expect(typeof run.state.get('u')!.out!.clusterCount).toBe('number');
    expect(rewire(b)).toBe(0);
  });
});
