// A second realization with a measured contract: the elastic line integrated on a grid. Independent of the
// closed-form laws, it checks them; it observes the sag the rigid kernel cannot; its error is measured by
// refinement, not assumed; and the comparison rule runs across realizations.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { beamOnTwoSupports, lumberCatalogue, materialLeaves, partXXV, type Slice } from '../../src/nexus/substrate/beam';
import { elasticContract, realizeCantilever, realizeElastic } from '../../src/nexus/substrate/elastic';
import { ofLeaf } from '../../src/nexus/substrate/evaluate';
import { declareFrame } from '../../src/nexus/substrate/field';
import { leaf } from '../../src/nexus/substrate/term';
import { leavesUnder, why } from '../../src/nexus/substrate/why';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));
const frame = declareFrame('test', 'x along, y up, z across');
const cells = (n: number) => ({ ...elasticContract(), cells: ofLeaf(leaf('cells', n, '1', { class: 'configuration', source: 'test' })) });
const inputs = (P: number, w: number, q: number, L: number, Lt: number, E: number, I: number) => ({ frame, P: given('P', P, 'N'), w: given('w', w, 'm'), q: given('q', q, 'N/m'), L: given('L', L, 'm'), Lt: given('Lt', Lt, 'm'), E: given('E', E, 'Pa'), I: given('I', I, 'm^4') });

describe('the elastic realization', () => {
  it('measures its own error by refinement, and on a smooth load the error falls with the square of the cell', () => {
    const inp = inputs(0, 0.1, 1000, 2, 2, 200e9, 1.0666666666666668e-7);
    const e60 = realizeElastic(cells(60), inp).error.value!, e120 = realizeElastic(cells(120), inp).error.value!;
    expect(e60 / e120).toBeGreaterThan(3.2);
    expect(e60 / e120).toBeLessThan(4.8);
    // under a patch the convergence is at least as fast; the error is still measured, never assumed
    const patch = inputs(1000, 0.1, 0, 2, 2, 200e9, 1.0666666666666668e-7);
    expect(realizeElastic(cells(60), patch).error.value! / realizeElastic(cells(120), patch).error.value!).toBeGreaterThan(3);
  });

  it('reproduces the book at its limits: a point load and a load spread over the span', () => {
    const I = 1.0666666666666668e-7, E = 200e9, L = 2;
    const point = realizeElastic(cells(240), inputs(1000, L / 480, 0, L, L, E, I));
    expect(Math.abs(point.sag.value! / 0.0078125 - 1)).toBeLessThan(2e-4);
    const spread = realizeElastic(cells(240), inputs(2000, L, 0, L, L, E, I));
    expect(Math.abs(spread.sag.value! / 0.009765625 - 1)).toBeLessThan(1e-4);
    const self = realizeElastic(cells(240), inputs(0, 0.1, 1000, L, L, E, I));
    expect(Math.abs(self.sag.value! / 0.009765625 - 1)).toBeLessThan(1e-4);
    expect(self.reactions[0]!.value).toBeCloseTo(1000, 6);
    expect(point.sag.status).toBe('measured');
    expect(why(point.sag).origin?.source).toMatch(/elastic line/);
  });

  it('an overhang relieves the span: the sag drops below the no-overhang case', () => {
    const I = 1.0666666666666668e-7, E = 200e9, L = 2;
    const flat = realizeElastic(cells(240), inputs(0, 0.1, 1000, L, L, E, I)).sag.value!;
    const over = realizeElastic(cells(240), inputs(0, 0.1, 1000, L, 2.4, E, I)).sag.value!;
    expect(over).toBeLessThan(flat);
    // Roark: an end moment M0 lifts mid-span by M0 L² / (8 E I); the overhang's hogging moment is q c² / 2
    const lift = ((1000 * 0.2 ** 2) / 2) * L ** 2 / (8 * E * I);
    expect(Math.abs((flat - over) / lift - 1)).toBeLessThan(1e-3);
  });
});

describe('the elastic cantilever', () => {
  const I = 1.0666666666666668e-7, E = 200e9;
  const inp = (P: number, a: number, w: number, q: number, ell: number) => ({ frame, P: given('P', P, 'N'), a: given('a', a, 'm'), w: given('w', w, 'm'), q: given('q', q, 'N/m'), ell: given('ell', ell, 'm'), E: given('E', E, 'Pa'), I: given('I', I, 'm^4') });
  it('reproduces the book at its limits: a load at the tip, and a load spread along the arm', () => {
    const tip = realizeCantilever(cells(240), inp(1000, 1 - 1 / 960, 1 / 480, 0, 1));
    expect(Math.abs(tip.tipSag.value! / 0.015625 - 1)).toBeLessThan(2e-3);
    expect(tip.rootMoment.value).toBeCloseTo(1000 * (1 - 1 / 960), 3);
    expect(tip.rootShear.value).toBeCloseTo(1000, 6);
    const spread = realizeCantilever(cells(240), inp(0, 0.5, 0.1, 1000, 1));
    expect(Math.abs(spread.tipSag.value! / (1000 / (8 * E * I)) - 1)).toBeLessThan(1e-4);
    expect(spread.rootMoment.value).toBeCloseTo(500, 6);
  });
  it('a load at a reach short of the tip: P a² (3ℓ − a) / (6 E I) at the tip', () => {
    const r = realizeCantilever(cells(240), inp(1000, 0.5, 1 / 480, 0, 1));
    expect(Math.abs(r.tipSag.value! / ((1000 * 0.25 * 2.5) / (6 * E * I)) - 1)).toBeLessThan(2e-3);
    expect(r.error.status).toBe('measured');
  });
});

describe('two realizations of one configuration', () => {
  let built: Slice | null = null;
  async function slice(): Promise<Slice> { return (built ??= beamOnTwoSupports(partXXV('the person'), materialLeaves('wood.douglas-fir'), lumberCatalogue(), await jolt())); }

  it('the sag is observed by the elastic realization and unobserved by the rigid one, and the derived sag is within the measured error', async () => {
    const s = await slice();
    const rigid = s.comparisons.find((c) => c.name === 'mid-span sag')!, elastic = s.comparisons.find((c) => c.name === 'mid-span sag (elastic)')!;
    expect(rigid.verdict.kind).toBe('unobserved');
    expect(elastic.verdict.kind, JSON.stringify(elastic.verdict)).toBe('within');
    expect(elastic.measured.value).toBeCloseTo(s.choice.pick!.solution.bound['delta']!.value!, 6);
    expect(s.elastic!.error.value!).toBeLessThan(1e-6);
  }, 120000);

  it('the moment field agrees with both realizations within each contract, and the reactions with the statics', async () => {
    const s = await slice();
    const elastic = s.comparisons.filter((c) => c.name.endsWith('(elastic)') && c.name.startsWith('bending moment'));
    expect(elastic.length).toBeGreaterThanOrEqual(10);
    for (const c of elastic) expect(c.verdict.kind, `${c.name}: ${JSON.stringify(c.verdict)}`).toBe('within');
    for (const c of s.comparisons.filter((x) => x.name.startsWith('reaction'))) expect(c.verdict.kind, c.name).toBe('within');
    for (const c of s.comparisons.filter((x) => x.name.startsWith('moment at bond'))) expect(c.verdict.kind, c.name).toBe('within');
  }, 120000);

  it('WHY on the elastic sag ends in the realization\'s measurement, with its measured error', async () => {
    const s = await slice();
    const sag = s.elastic!.sag;
    expect(why(sag).origin?.class).toBe('measured');
    expect(sag.uncertainty).toBe(s.elastic!.error.value);
    expect(leavesUnder(s.elastic!.error).every((l) => l.origin.class === 'measured')).toBe(true);
  }, 120000);
});
