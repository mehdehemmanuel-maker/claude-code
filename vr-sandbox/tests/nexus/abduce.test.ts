// Part XXIV 10: observation, comparison, journal, and language growth by abduction at the type level. A failure is
// a term; the missing distinction is searched for over the dimensionless groups of the coupling's quantities; a
// candidate that separates every observation and changes more than one system is validated on held-out
// observations and promoted with provenance; an instance is never a candidate; a tie names the next observation.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { candidates, discriminates, groups, observation, validate } from '../../src/nexus/substrate/abduce';
import { RECT_MODULUS } from '../../src/nexus/book';
import { dimOf } from '../../src/nexus/lang/dimension';
import { evaluate, measurement, ofLeaf } from '../../src/nexus/lang/evaluate';
import { anomalyOf, failuresOf } from '../../src/nexus/substrate/failure';
import { compare } from '../../src/nexus/substrate/observe';
import { solve, type System } from '../../src/nexus/substrate/solve';
import { admit, choose, noTolerance, restIntent, restStudy, toppleStudy, type Study } from '../../src/nexus/substrate/study';
import { k, leaf, varsOf, type Leaf } from '../../src/nexus/lang/term';
import { beamOnTwoSupports, lumberCatalogue, materialLeaves } from '../../src/nexus/substrate/beam';
import { stale } from '../../src/nexus/substrate/why';
import { WEIGHT, BENDING_STRESS, RECT_AREA } from '../../src/nexus/book';
import { mul, le, variable } from '../../src/nexus/lang/term';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));

describe('failure as terms', () => {
  it('an anomaly is a term citing the comparison and both records', () => {
    const c = compare('rests', given('derived', 1, '1'), given('measured', 0, '1'), { name: 'test', relative: noTolerance() });
    expect(c.verdict.kind).toBe('anomaly');
    const f = anomalyOf(c)!;
    expect(f.kind).toBe('anomaly');
    expect(f.cites).toContain(c.hash);
    expect(f.says).toMatch(/exceeds the tolerance/);
    expect(anomalyOf(compare('same', given('a', 1, '1'), given('b', 1, '1'), { name: 'test', relative: noTolerance() }))).toBeNull();
  });

  it('a variable the intent did not leave free is a failure naming the missing relation', () => {
    const v = { W: variable('W', 'N'), r: variable('r', 'm'), sigma: variable('sigma', 'Pa'), allow: variable('allow', 'Pa') };
    const sys: System = {
      name: 'a bar', vars: [{ sym: 'm', unit: 'kg', name: 'mass' }, { sym: 'g', unit: 'm/s^2', name: 'g' }, { sym: 'W', unit: 'N', name: 'weight' }, { sym: 'r', unit: 'm', name: 'arm' }, { sym: 'M', unit: 'N m', name: 'moment' }, { sym: 'b', unit: 'm', name: 'b' }, { sym: 'h', unit: 'm', name: 'h' }, { sym: 'S', unit: 'm^3', name: 'S' }, { sym: 'A', unit: 'm^2', name: 'A' }, { sym: 'sigma', unit: 'Pa', name: 'stress' }, { sym: 'allow', unit: 'Pa', name: 'allowable' }],
      relations: [
        { kind: 'law' as const, sym: 'W', law: WEIGHT, args: { m: 'm', g: 'g' } },
        { kind: 'term' as const, sym: 'M', term: mul(v.W, v.r), name: 'moment', grounds: 'test' },
        { kind: 'law' as const, sym: 'A', law: RECT_AREA, args: { b: 'b', h: 'h' } },
        { kind: 'law' as const, sym: 'sigma', law: BENDING_STRESS, args: { M: 'M', S: 'S' } },
        { kind: 'constrain' as const, holds: le(v.sigma, v.allow), says: 'within the allowable', role: 'design' as const, source: 'test' },
      ],
      bindings: { m: given('m', 20, 'kg'), g: given('g', 9.81, 'm/s^2'), r: given('r', 0.5, 'm'), b: given('b', 0.02, 'm'), h: given('h', 0.04, 'm'), allow: given('allow', 30e6, 'Pa') },
    };
    const fs = failuresOf(sys, solve(sys));
    expect(fs.map((f) => f.kind)).toEqual(['free', 'free']);
    expect(fs[0]!.says).toMatch(/S\) is free.*a relation is missing/);
    expect(fs[1]!.says).toMatch(/stress.bending waiting on S/);
    void RECT_MODULUS;
  });
});

describe('abduction over types', () => {
  it('finds the dimensionless groups of the quantities from their dimensions alone', () => {
    const gs = groups({ rho: dimOf('kg/m^3'), v: dimOf('m/s'), L: dimOf('m'), mu: dimOf('Pa s') });
    expect(gs.map((g) => g.exponents)).toContainEqual({ rho: 1, v: 1, L: 1, mu: -1 });
    for (const g of gs) for (const x of varsOf(g.term)) expect(['rho', 'v', 'L', 'mu']).toContain(x.sym);
  });

  it('with no observation of the other outcome, nothing separates and nothing is promoted', () => {
    const q = () => ({ hcm: given('hcm', 0.1, 'm'), half: given('half', 0.05, 'm') });
    const obs = [0, 1].map((i) => observation({ system: `s${i}`, coupling: 'c', quantities: q(), observed: given('settled', 1, '1'), derived: given('rests', 1, '1') }));
    const cs = candidates(obs);
    expect(cs.length).toBeGreaterThan(0);
    expect(cs.every((c) => !c.separates)).toBe(true);
    expect(choose(cs).chosen).toBeNull();
  });
});

describe('the rest study on the kernel: the tall column that never settled', () => {
  let study: Study | null = null;
  const cases = [{ patch: 0.1, across: 0.1 }, { patch: 0.1, across: 0.2 }, { patch: 0.1, across: 0.3 }, { patch: 0.1, across: 0.4 }, { patch: 0.1, across: 0.6 }, { patch: 0.1, across: 0.15 }, { patch: 0.1, across: 0.12 }, { patch: 0.3, across: 0.0255 }];
  async function run(): Promise<Study> { return (study ??= restStudy(await jolt(), cases)); }

  it('the static derivation says every configuration rests; in the kernel four of eight rest in place (three rock, one topples): anomalies as terms', async () => {
    const s = await run();
    expect(s.observations.map((o) => o.derived.value)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(s.observations.map((o) => o.observed.value)).toEqual([0, 1, 1, 1, 1, 0, 0, 0]);
    const rests = s.failures.filter((f) => f.says.startsWith('rests'));
    expect(rests.length).toBe(4);
    // the toppled slab also takes its moments with it: the field's premise failed, so its samples are anomalies too
    expect(s.failures.filter((f) => f.says.startsWith('moment')).length).toBe(4);
    expect(s.failures.every((f) => f.kind === 'anomaly')).toBe(true);
  }, 120000);

  it('the discriminating observable is found over the coupling\'s quantity types: the centre of mass over half the contact across, not along', async () => {
    const s = await run();
    const by = Object.fromEntries(s.candidates.map((c) => [c.group.text, c]));
    expect(by['hcm · halfZ^-1']!.separates).toBe(true);
    expect(by['hcm · halfX^-1']!.separates).toBe(false);
    expect(s.chosen!.group.text).toBe('hcm · halfZ^-1');
    expect(s.chosen!.threshold!.above).toBe(0);
    expect(s.chosen!.threshold!.lo).toBeCloseTo(0.191 / 0.0445, 1);
    expect(s.chosen!.threshold!.hi).toBeCloseTo(0.255 / 0.0445, 1);
    expect(s.chosen!.generality).toBe(8);
    // every candidate is over quantity types: no term names a body or a system
    for (const c of s.candidates) for (const v of varsOf(c.group.term)) expect(['hcm', 'halfX', 'halfZ', 'g', 'patience', 'mass']).toContain(v.sym);
  }, 120000);

  it('the candidate is validated on held-out observations and promoted with provenance; the language then refuses the column and admits the slab', async () => {
    const s = await run();
    expect(s.relation).not.toBeNull();
    const r = s.relation!;
    expect(r.provenance).toMatch(/^abduced from observations /);
    expect(r.observations.length).toBe(8);
    // eight systems, eight observations: an outcome seen twice is two observations, not one cited twice
    expect(new Set(r.observations).size).toBe(8);
    const v = validate(s.chosen!);
    expect(v.holds).toBe(true);
    expect(v.predicted).toBeGreaterThanOrEqual(6);
    expect(v.undecided).toBe(2);
    expect(r.bound.uncertainty).toBeGreaterThan(0);
    expect(r.bound.status).toBe('measured');
    expect(s.language.all().length).toBe(1);
    const g = s.slices[0]!.choice.pick!.solution.bound['g']!, m = s.slices[0]!.choice.pick!.solution.bound['m']!;
    const column = admit(s.language, s.slices[0]!, g, m);
    expect(column.find((j) => j.coupling === 'the load on the beam')!.holds.value).toBe(0);
    expect(column.find((j) => j.coupling === 'the beam on the left support')!.holds.value).toBe(1);
    const slab = admit(s.language, s.slices[3]!, g, m);
    expect(slab.every((j) => j.holds.value === 1)).toBe(true);
    // inside the bound's uncertainty the language says it cannot decide, and why
    const gap = beamOnTwoSupports(restIntent({ patch: 0.1, across: 0.18 }), materialLeaves('wood.douglas-fir'), lumberCatalogue());
    const j = admit(s.language, gap, g, m).find((x) => x.coupling === 'the load on the beam')!;
    expect(j.holds.status).toBe('unresolved');
    expect(j.holds.because).toMatch(/inside the bound's uncertainty/);
    // the relation reaches exactly the records that rest on it
    const records = [...column, ...slab].map((j) => j.holds);
    expect(stale(records, [r.hash]).length).toBe(records.length);
    expect(stale(s.slices[0]!.journal.records(), [r.hash]).length).toBe(0);
  }, 120000);

  it('the second distinction: among what did not rest in place, the drop separates rocking from falling by the same group, further out', async () => {
    const s = await run();
    const more = restStudy(await jolt(), [{ patch: 0.1, across: 0.08 }, { patch: 0.2, across: 0.05 }, { patch: 0.1, across: 0.0255 }, { patch: 0.2, across: 0.03 }], s.language);
    const slices = [...s.slices, ...more.slices];
    const t = toppleStudy(slices, s.language);
    const outcomes = t.observations.map((o) => o.observed.value);
    expect(outcomes.filter((x) => x === 1).length).toBeGreaterThanOrEqual(4);
    expect(outcomes.filter((x) => x === 0).length).toBeGreaterThanOrEqual(3);
    expect(t.chosen).not.toBeNull();
    expect(t.chosen!.group.text).toBe('hcm · halfZ^-1');
    expect(t.chosen!.threshold!.above).toBe(0);
    expect(t.chosen!.threshold!.lo).toBeGreaterThan(s.chosen!.threshold!.hi);
    expect(t.relation).not.toBeNull();
    expect(s.language.all().length).toBe(2);
    // a column that rocks is refused by the first relation and admitted by the second; a slab on edge by neither
    const g = s.slices[0]!.choice.pick!.solution.bound['g']!, m = s.slices[0]!.choice.pick!.solution.bound['m']!;
    const column = admit(s.language, s.slices[0]!, g, m).filter((j) => j.coupling === 'the load on the beam');
    expect(column.map((j) => j.holds.value)).toEqual([0, 1]);
    const onEdge = admit(s.language, s.slices[7]!, g, m).filter((j) => j.coupling === 'the load on the beam');
    expect(onEdge.map((j) => j.holds.value)).toEqual([0, 0]);
  }, 180000);

  it('with the five observations that share one footprint along the beam, two candidates tie and the next observation is named', async () => {
    const s = await run();
    const five = candidates(s.observations.slice(0, 5));
    const c = choose(five);
    expect(c.chosen).toBeNull();
    expect(c.ambiguous.map((x) => x.group.text).sort()).toEqual(['hcm · halfX^-1', 'hcm · halfZ^-1']);
    expect(discriminates(c.ambiguous[0]!, c.ambiguous[1]!).sort()).toEqual(['halfX', 'halfZ']);
    expect(s.vary).toEqual([]);
  }, 120000);

  it('a slice run on its own carries the rests comparison, within when it settles', async () => {
    const J = await jolt();
    const s = beamOnTwoSupports(restIntent({ patch: 0.1, across: 0.3 }), materialLeaves('wood.douglas-fir'), lumberCatalogue(), J);
    const c = s.comparisons.find((x) => x.name === 'rests')!;
    expect(c.verdict.kind).toBe('within');
  }, 60000);
});

describe('the identity of an observation', () => {
  it('two observations of one outcome in two systems are two observations; a measurement over another window is another measurement', () => {
    const w = { seconds: 2, tick: 1 / 90, instrument: 'a' };
    const mk = (name: string, value: number, unit: string, origin: Leaf['origin'], u?: number) => leaf(name, value, unit, origin, u);
    const seen = measurement('stood', 1, '1', { instrument: 'the kernel', window: w }, mk);
    const again = measurement('stood', 1, '1', { instrument: 'the kernel', window: { ...w, seconds: 3 } }, mk);
    expect(again.hash).not.toBe(seen.hash);
    const derived = evaluate('rests', k(1), {}, { unit: '1', law: 'statics' });
    const q = (v: number) => ofLeaf(leaf('hcm', v, 'm', { class: 'given', by: 'the test' }));
    const a = observation({ system: 'A', coupling: 'the load', quantities: { hcm: q(0.1) }, observed: seen, derived });
    const b = observation({ system: 'B', coupling: 'the load', quantities: { hcm: q(0.2) }, observed: seen, derived });
    const a2 = observation({ system: 'A', coupling: 'the load', quantities: { hcm: q(0.1) }, observed: seen, derived });
    expect(a.hash).not.toBe(b.hash);
    expect(a.hash).toBe(a2.hash);
  });
});
