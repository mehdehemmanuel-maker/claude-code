// The make pipeline: conditions read and applied, the attention to detail, the critic, in rounds.
import { describe, expect, test } from 'vitest';
import { KITS, makeKit, massOf, type Part } from '../../src/nexus/kits';
import { applyConditions, readConditions } from '../../src/nexus/make/conditions';
import { critique, turning } from '../../src/nexus/make/critic';
import { RULES } from '../../src/nexus/make/detail';
import { perfect } from '../../src/nexus/make/pipeline';
import { contacts, layout } from '../../src/nexus/make/space';

const kit = (id: string, words = id, seed = 7) => makeKit(KITS.find((k) => k.id === id)!, words, seed).part;
const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('conditions', () => {
  test('read from the words, whatever the thing', () => {
    const a = readConditions('an old rusty car by the sea');
    expect(a.age).toBe(0.8); expect(a.env).toBe('marine');
    expect(readConditions('a golden bed').material).toBe('gold');
    expect(readConditions('an ice castle').material).toBe('ice');
    // a colour and a dessert are not what it is made of
    expect(readConditions('a silver car').material).toBeNull();
    expect(readConditions('an ice cream van').material).toBeNull();
    expect(readConditions('a tiny house').scale).toBe(0.1);
    expect(readConditions('a bed for a child').child).toBe(true);
  });
  test('applied by material and size: glass stays glass, the mass goes with the cube of the size', () => {
    const bed = kit('bed'), gold = applyConditions(bed, readConditions('a bed made of gold')).part;
    expect(all(gold).filter((p) => p.mat === 'gold').length).toBeGreaterThan(3);
    expect(all(gold).some((p) => p.mat === 'foam' || p.mat === 'cotton' || p.mat === 'wool')).toBe(true);
    const small = applyConditions(bed, readConditions('a small bed')).part;
    expect(massOf(small) / massOf(bed)).toBeCloseTo(0.6 ** 3, 2);
  });
});

describe('space', () => {
  test('a turned bar touches only what it really meets, not what its bounds overlap', () => {
    const root: Part = { name: 'r', parts: [
      { name: 'bar', shape: { box: [1, 0.1, 0.1] }, rot: [0, 0, Math.PI / 4], mat: 'steel-low' },
      { name: 'block', shape: { box: [0.1, 0.1, 0.1] }, at: [0.3, -0.3, 0], mat: 'steel-low' },
      { name: 'on it', shape: { box: [0.1, 0.1, 0.1] }, at: [0.3, 0.3 + 0.1 / Math.SQRT2, 0], mat: 'steel-low' },
    ] };
    const n = layout(root), names = contacts(n).map((c) => [c.a.p.name, c.b.p.name].sort().join('+'));
    expect(names).toContain('bar+on it'); expect(names).not.toContain('bar+block');
  });
});

describe('critic', () => {
  test('what turns, by what it is: a saw blade turns, a sword blade does not', () => {
    expect(turning({ name: 'saw blade' })).not.toBeNull();
    expect(turning({ name: 'sword blade' })).toBeNull();
    expect(turning({ name: 'turbine rim' })!.clearance).toBe(0.03);
    expect(turning({ name: 'auger flight' })!.clearance).toBeCloseTo(0.006);
  });
  test('a wheel turning inside a shell: the shell opened round it, flush with its side, the opening weighing nothing', () => {
    const root: Part = { name: 'cart', parts: [
      { name: 'body', shape: { box: [2, 0.6, 1.2] }, at: [0, 0.6, 0], mat: 'steel-low', shell: 0.0015 },
      { name: 'wheel', at: [0.6, 0.3, 0.45], parts: [{ name: 'tyre', shape: { torus: [0.22, 0.08] }, mat: 'rubber' }] },
    ] };
    const m0 = massOf(root), f = critique(root), room = f.find((x) => x.check === 'room to move')!;
    expect(room.fixed).toBe(true);
    const opening = root.parts![0]!.parts!.find((p) => p.name === 'opening for wheel')!;
    expect(opening.kg).toBe(0); expect(massOf(root)).toBeCloseTo(m0, 6);
    // flush: its outer face 10 mm inside the body's side (z = 0.6)
    expect(root.parts![1]!.at![2] + 0.08).toBeCloseTo(0.6 - 0.01, 3);
    // and once opened, not opened again
    expect(critique(root).filter((x) => x.check === 'room to move')).toHaveLength(0);
  });
  test('held up: a part near what holds it is set onto it; one far off is said, not moved', () => {
    const root: Part = { name: 'shelf', parts: [
      { name: 'post', shape: { box: [0.1, 1, 0.1] }, at: [0, 0.5, 0], mat: 'steel-low' },
      { name: 'board', shape: { box: [0.6, 0.02, 0.3] }, at: [0.35, 1.03, 0], mat: 'steel-low' },
      { name: 'lost', shape: { box: [0.1, 0.1, 0.1] }, at: [3, 2, 0], mat: 'steel-low' },
    ] };
    const f = critique(root);
    expect(f.find((x) => x.part === 'board')?.fixed).toBe(true);
    expect(root.parts![1]!.at![1]).toBeCloseTo(1.01, 3);
    expect(f.find((x) => x.part === 'lost')?.fixed).toBe(false);
  });
  test('what grew is not propped: a tree says nothing about its twigs', () => {
    expect(critique(kit('tree')).filter((x) => x.check === 'held up')).toHaveLength(0);
  });
});

describe('pipeline', () => {
  test('a car: wheels bolted on a pitch circle, tyres given valves, settled in two rounds, the car given unchanged', () => {
    const car = kit('car', 'a car', 3), before = JSON.stringify(car), m = perfect(car, 'a car');
    expect(JSON.stringify(car)).toBe(before);
    expect(m.rounds).toBeLessThanOrEqual(2);
    expect(all(m.part).filter((p) => p.name === 'tyre valve')).toHaveLength(4);
    const heads = all(m.part).filter((p) => /hex head/.test(p.name)).length; expect(heads).toBeGreaterThan(16);
    // what the details weigh is said, rule by rule, and adds up to what was added
    const added = Object.values(m.detailKg).reduce((a, b) => a + b, 0);
    expect(added).toBeGreaterThan(0); expect(m.kg[1] - m.kg[0]).toBeGreaterThanOrEqual(added - 1e-6);
  });
  test('every rule says where it comes from, and edges are finish.ts\'s', () => {
    for (const r of RULES) { expect(r.source.length).toBeGreaterThan(3); expect(r.says.length).toBeGreaterThan(10); }
    expect(RULES.find((r) => r.id === 'edges')!.source).toContain('finish.ts');
  });
  test('every kit goes through it without a crash, and nothing grown is joined', () => {
    for (const k of KITS) {
      const m = perfect(makeKit(k, k.name, 7).part, k.name);
      expect(m.parts[1]).toBeGreaterThanOrEqual(m.parts[0]);
      if (k.id === 'tree' || k.id === 'forest' || k.id === 'plant') expect(m.details.joints).toBe(0);
    }
  });
});
