// Part XXV: the first vertical slice, a beam on two supports under a load, traced from the intent to the measured
// moment and back. Part XX's tests of the architecture are run on it: trace, derivation, unknown, construction
// without a kind, placement solved, causal closure, realization contract, staleness, unobserved is not unknown.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { beamOnTwoSupports, lumberCatalogue, materialLeaves, partXXV, type Slice } from '../../src/nexus/beam';
import { PATCH_MOMENT, RECT_MODULUS, WEIGHT } from '../../src/nexus/book';
import type { Derivation } from '../../src/nexus/evaluate';
import { explain, impact, leavesUnder, stale, why, type WhyNode } from '../../src/nexus/why';

const KIND_WORDS = ['plate', 'block', 'lumber', 'table', 'shelf', 'template', 'default'];

let built: Slice | null = null;
async function slice(): Promise<Slice> {
  if (!built) built = beamOnTwoSupports(partXXV('the person'), materialLeaves('wood.douglas-fir'), lumberCatalogue(), await jolt());
  return built;
}

const everyRecord = (s: Slice): Derivation[] => s.journal.records();

describe('the beam slice: semantics and the solver', () => {
  it('with the section free, the solver binds the load and the limit and reports breadth and depth free, nothing filled', async () => {
    const s = await slice();
    expect(s.open.free.map((f) => f.sym)).toEqual(['b', 'h', 'q', 'Wself', 'R', 'Mself', 'M', 'A', 'S', 'I', 'sigma', 'dload', 'dself', 'delta']);
    expect(s.open.bound['P']!.value).toBeCloseTo(60 * 9.80665, 9);
    expect(s.open.bound['deltaLim']!.value).toBeCloseTo(1.2 / 300, 12);
    expect(s.open.bound['Mload']!.value).toBeCloseTo(60 * 9.80665 * (0.3 - 0.1 / 8), 9);
    expect(s.open.constraints.every((c) => c.holds === null)).toBe(true);
    expect(s.open.free.find((f) => f.sym === 'S')!.wouldBind).toEqual([{ by: 'section.rect.modulus', waitingOn: ['b', 'h'] }]);
  });

  it('the catalogue under least material picks a 2×4 laid flat; the refusals name their domain', async () => {
    const s = await slice();
    expect(s.choice.pick!.option.label).toBe('2x4 flat');
    expect(s.choice.manifold.map((c) => c.option.label)).toEqual(['2x4 flat', '2x6 flat', '2x8 flat']);
    const by = Object.fromEntries(s.choice.candidates.map((c) => [c.option.label, c]));
    expect(by['1x4 on edge']!.refused).toContain('lateral stability of an unbraced sawn beam: d/b ≤ 2 needs no lateral support');
    expect(by['2x4 on edge']!.refused[0]).toMatch(/lateral stability/);
    expect(by['2x2 on edge']!.unsatisfied).toEqual(['stiffness: the sag is within the declared limit']);
    expect(by['4x4 on edge']!.refused[0]).toMatch(/slender/);
    const pick = s.choice.pick!.solution.bound;
    expect(pick['delta']!.value!).toBeLessThan(1.2 / 300);
    expect(pick['sigma']!.value!).toBeLessThan(85e6 / 3);
    expect(pick['delta']!.status).toBe('given');
    expect(pick['sigmaAllow']!.status).toBe('assumed');
    expect(s.choice.pick!.solution.constraints[0]!.record.status).toBe('assumed');
    expect(s.choice.why!.law).toMatch(/^[0-9a-f]{16}$/);
    expect(why(s.choice.why!).inputs['A']!.inputs['b']!.origin?.source).toMatch(/PS 20/);
  });
});

describe('the beam slice: construction', () => {
  it('no derivation names a kind of thing: names and laws, down every path', async () => {
    const s = await slice();
    const walk = (n: WhyNode, path: string) => {
      const text = `${n.name} | ${n.law ?? ''}`.toLowerCase();
      for (const w of KIND_WORDS) expect(new RegExp(`\\b${w}\\b`).test(text), `${path}: "${n.name}" / "${n.law}" names "${w}"`).toBe(false);
      for (const [sym, c] of Object.entries(n.inputs)) walk(c, `${path}/${sym}`);
    };
    for (const d of everyRecord(s)) walk(why(d), d.name);
    expect(explain(why(s.configuration!.bodies.load.centre!.y)).split('\n').length).toBeGreaterThan(6);
  });

  it('every coordinate is a coupling solution derived from the declared frame', async () => {
    const s = await slice();
    const c = s.configuration!;
    for (const body of [c.bodies.beam, ...c.bodies.supports, c.bodies.load]) {
      for (const axis of ['x', 'y', 'z'] as const) {
        const d = body.centre![axis];
        expect(d.law, `${body.name} ${axis}`).toBeDefined();
        expect(leavesUnder(d).some((l) => l.name.startsWith('origin')), `${body.name} ${axis} cites the frame`).toBe(true);
      }
    }
    expect(c.bodies.supports[0].centre!.x.value).toBeCloseTo(-0.6, 12);
    expect(c.bodies.supports[1].centre!.x.value).toBeCloseTo(0.6, 12);
    expect(c.bodies.beam.centre!.y.value).toBeCloseTo(0.5 + 0.0005 + 0.019, 12);
    expect(c.bodies.load.centre!.y.value).toBeCloseTo(0.5 + 0.0005 + 0.038 + 0.0005 + 60 / (7850 * 0.1 * 0.3) / 2, 9);
    expect(c.bodies.beam.extents.x.value).toBeCloseTo(1.206, 12);
  });

  it('the ledger balances the two reactions against the load and the beam, and the beam is rigid at the window', async () => {
    const s = await slice();
    expect(s.configuration!.balance.balanced).toBe(true);
    expect(s.configuration!.rigid.rigid).toBe(true);
    expect(s.configuration!.rigid.ratio.value!).toBeLessThan(0.1);
  });
});

describe('the beam slice: realization and observation', () => {
  it('a body exists in the kernel if and only if a configuration body binds it', async () => {
    const s = await slice();
    expect(s.realization!.bodies.map((b) => b.role).sort()).toEqual(['beam', 'load', 'support', 'support']);
    expect(new Set(s.realization!.bodies.map((b) => b.kernelId)).size).toBe(4);
  });

  it('it stood, and the measured moment at every observed station is within the contract of the derived one', async () => {
    const s = await slice();
    expect(s.realization!.events).toEqual([]);
    expect(s.realization!.stood.value).toBe(1);
    const moments = s.comparisons.filter((c) => c.name.startsWith('moment'));
    expect(moments.length).toBe(4);
    for (const c of moments) {
      expect(c.verdict.kind, `${c.name}: ${JSON.stringify(c.verdict)} derived ${c.derived.value} measured ${c.measured.value}`).toBe('within');
      expect(c.measured.status).toBe('measured');
      expect(c.measured.window?.seconds).toBeCloseTo(0.3, 2);
      expect(c.measured.uncertainty).toBeDefined();
      expect(c.derived.cites).toContain(PATCH_MOMENT.hash);
    }
    // the kernel observes the span at seams only: a set of measure zero; the field between is derived
    expect(s.observed!.value).toBe(0);
    expect(s.moment!.over.scale[0]!.says).toMatch(/quasi-static/);
    expect(moments.map((c) => c.derived.value!).sort((a, b) => a - b)[0]!).toBeGreaterThan(50);
  });

  it('the sag is unobserved, not unknown: the contract says why, and the derived sag keeps its value', async () => {
    const s = await slice();
    const sag = s.comparisons.find((c) => c.name === 'mid-span sag')!;
    expect(sag.verdict.kind).toBe('unobserved');
    expect(sag.verdict.kind === 'unobserved' && sag.verdict.because).toMatch(/elastic deflection/);
    expect(sag.measured.status).toBe('unobserved');
    expect(sag.derived.value!).toBeGreaterThan(0.003);
    expect(sag.derived.status).toBe('given');
  });

  it('WHY on the measured moment and on the derived one is total and ends in leaves with origins', async () => {
    const s = await slice();
    const c = s.comparisons.find((x) => x.name.startsWith('moment'))!;
    expect(why(c.measured).origin?.class).toBe('measured');
    const leaves = leavesUnder(c.derived);
    const classes = new Set(leaves.map((l) => l.origin.class));
    expect(classes.has('given')).toBe(true);
    expect(classes.has('fundamental')).toBe(true);
    expect(classes.has('measured')).toBe(true);
    expect(classes.has('configuration')).toBe(true);
    expect(leaves.some((l) => l.origin.source?.includes('ISO 80000-3'))).toBe(true);
    expect(leaves.some((l) => l.origin.source?.includes('Wood Handbook'))).toBe(true);
    expect(leaves.some((l) => l.origin.by === 'the person' && l.name === 'mass to carry')).toBe(true);
    for (const d of everyRecord(s)) expect(() => why(d), d.name).not.toThrow();
  });

  it('IMPACT of the moment law reaches the stress, the comparisons and the choice; not the section, not the coordinates', async () => {
    const s = await slice();
    const records = everyRecord(s);
    const hit = new Set(impact(PATCH_MOMENT.hash, records).map((d) => d.name));
    expect(hit.has('bending stress')).toBe(true);
    expect(hit.has('moment at mid-span')).toBe(true);
    expect([...hit].some((n) => n.endsWith('derived'))).toBe(true);
    expect(hit.has('section modulus')).toBe(false);
    expect(hit.has('x of the left support: half a span before mid-span')).toBe(false);
    expect(hit.has('sag')).toBe(false);
  });

  it('changing a law marks exactly the records that cite it', async () => {
    const s = await slice();
    const records = everyRecord(s);
    const fromWeight = new Set(stale(records, [WEIGHT.hash]).map((d) => d.name));
    expect(fromWeight.has('load')).toBe(true);
    expect(fromWeight.has('reaction at each support')).toBe(true);
    expect(fromWeight.has('sag')).toBe(true);
    expect(fromWeight.has('section modulus')).toBe(false);
    expect(fromWeight.has('sag limit')).toBe(false);
    expect(fromWeight.has('beam length')).toBe(false);
    const fromModulus = new Set(stale(records, [RECT_MODULUS.hash]).map((d) => d.name));
    expect(fromModulus.has('bending stress')).toBe(true);
    expect(fromModulus.has('sag')).toBe(false);
  });

  it('the journal is append-only and holds the whole slice', async () => {
    const s = await slice();
    const all = s.journal.all();
    expect(all.length).toBeGreaterThan(40);
    expect(all.every((e, i) => e.at === i)).toBe(true);
    expect(Object.isFrozen(all[0])).toBe(true);
    expect(all.filter((e) => e.kind === 'refusal').length).toBeGreaterThanOrEqual(9);
    expect(all.filter((e) => e.kind === 'choice').length).toBe(1);
  });
});
