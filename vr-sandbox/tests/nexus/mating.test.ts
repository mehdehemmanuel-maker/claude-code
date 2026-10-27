import { describe, expect, it } from 'vitest';
import { boreOf, boreThrough, lineOf, onto } from '../../src/nexus/mate';
import { toothed } from '../../src/nexus/makers';
import { rulesOf } from '../../src/nexus/make/rules';
import { massOf } from '../../src/nexus/mass';
import type { Part } from '../../src/nexus/kits';

const shaft: Part = { name: 'camshaft', item: 'camshaft', at: [0, 0.3, 0], rot: [0, 0, Math.PI / 2], parts: [{ name: 'cam nose', shape: { cyl: [0.0095, 0.08] }, at: [0, 0, 0], mat: 'steel-alloy' }] };

describe('parts placed by their round faces', () => {
  it('finds a cut sprocket\'s bore, and slides it onto a shaft lying along x, at its end', () => {
    const spk = toothed({ name: 'cam sprocket', m: 0.003, z: 42, b: 0.006, bore: 0.0193, mat: 'steel-alloy', item: 'timing-sprocket' });
    const b = boreOf(spk)!; expect(b.r).toBeGreaterThan(0.0095); expect(b.r).toBeLessThan(0.00966);
    const r = onto(shaft, /nose/, spk, { inset: 0.003 }); if (typeof r === 'string') throw new Error(r);
    // (the shaft's far end is at x = -0.04 (its y turned onto -x); the sprocket's middle 3 mm in from it, on its axis)
    expect(r.part.at![0]).toBeCloseTo(-0.037, 4); expect(r.part.at![1]).toBeCloseTo(0.3, 6); expect(r.says).toMatch(/clearance/);
    expect(rulesOf({ name: 'both', parts: [shaft, r.part] }).findings).toEqual([]);
  });
  it('will not put a bore on a shaft too big for it', () => {
    const small = toothed({ name: 'gear', m: 0.002, z: 20, b: 0.01, bore: 0.012, mat: 'steel-alloy' });
    expect(onto(shaft, /nose/, small)).toMatch(/too small/);
  });
  it('bores a plate stack where a slanted rod passes, in the plates it passes and no other, and the rules then pass it', () => {
    const rod: Part = { name: 'pushrod', item: 'pushrod', shape: { tube: { r: 0.003, pts: [[0, -0.05, 0], [0.02, 0.1, 0.01]] } }, at: [0, 0, 0], mat: 'steel-low' };
    const L = lineOf(rod); expect(L.r).toBeCloseTo(0.003, 3); expect(L.a.distanceTo(L.b)).toBeGreaterThan(0.15);
    const stack: Part = { name: 'stack', item: 'stack', at: [0, 0, 0], parts: [{ name: 'lower plate', shape: { box: [0.1, 0.01, 0.1] }, at: [0, 0, 0], mat: 'al-6061' }, { name: 'upper plate', shape: { box: [0.1, 0.01, 0.1] }, at: [0, 0.05, 0], mat: 'al-6061' }, { name: 'plate aside', shape: { box: [0.05, 0.01, 0.05] }, at: [0.2, 0.05, 0], mat: 'al-6061' }] };
    expect(rulesOf({ name: 'x', parts: [stack, rod] }).findings.length).toBeGreaterThan(0);
    const r = boreThrough(stack, rod); expect(r.holes).toEqual(['lower plate', 'upper plate']); expect(massOf(r.part)).toBeLessThan(massOf(stack));
    expect(rulesOf({ name: 'x', parts: [r.part, rod] }).findings).toEqual([]);
  });
});
