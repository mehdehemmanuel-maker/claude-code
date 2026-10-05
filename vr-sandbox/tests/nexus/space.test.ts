// The configuration space of a system, tested on the beam's own system: every bound variable a field over the
// free section (b, h), the region the conjunction of the constraints, every applied law's validity domain and the
// learned language over the couplings. The catalogue is an availability set inside the space: selecting within it
// reproduces the catalogue search. A derivation visits the space, not a list, and finds a lawful section no
// catalogue holds. At the edge of the language a derived address is an experiment: realized, observed, and when
// the kernel disagrees the language grows and the space is derived again.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { beamOnTwoSupports, beamSystem, leastMaterial, lumberCatalogue, materialLeaves, partXXV } from '../../src/nexus/beam';
import { ofLeaf, type Derivation } from '../../src/nexus/evaluate';
import { gravity, observer } from '../../src/nexus/field';
import { sample } from '../../src/nexus/domain';
import { explore, type Exploration } from '../../src/nexus/explore';
import { rigidContract } from '../../src/nexus/realize';
import { search } from '../../src/nexus/solve';
import { among, asOption, derive, evaluateAt, preferenceField, solveAt, spaceOf, type Derived } from '../../src/nexus/space';
import { observe, restStudy, type Study } from '../../src/nexus/study';
import { leaf } from '../../src/nexus/term';
import { closure, why } from '../../src/nexus/why';

const g = (n: string, v: number) => ofLeaf(leaf(n, v, 'm', { class: 'given', by: 'the test', grounds: 'the range of sections the test lets the space span' }));
const extent = { b: { lo: g('least breadth', 0.019), hi: g('most breadth', 0.3) }, h: { lo: g('least depth', 0.019), hi: g('most depth', 0.3) } };
const material = () => materialLeaves('wood.douglas-fir');
const semanticsOf = (mass?: number) => beamSystem(mass === undefined ? partXXV() : { ...partXXV(), mass: leaf('mass to carry', mass, 'kg', { class: 'given', by: 'the test' }) }, material(), gravity(), rigidContract(), observer('rigid-body kernel'));
const systemOf = (mass?: number) => semanticsOf(mass).system;
const prefer = [leastMaterial('the person')];
const spacing = { b: g('lattice spacing', 0.01), h: g('lattice spacing', 0.01) }, resolution = { b: g('resolution', 0.001), h: g('resolution', 0.001) };

let derived: Derived | null = null;
const run = () => (derived ??= derive(spaceOf(systemOf(), extent), prefer, spacing, resolution));
let study: Study | null = null;
const learned = async () => (study ??= restStudy(await jolt(), [{ patch: 0.1, across: 0.1 }, { patch: 0.1, across: 0.2 }, { patch: 0.1, across: 0.3 }, { patch: 0.1, across: 0.4 }, { patch: 0.1, across: 0.6 }, { patch: 0.1, across: 0.15 }, { patch: 0.1, across: 0.12 }, { patch: 0.3, across: 0.0255 }]));

describe('the configuration space', () => {
  it('every bound variable is a field over the free section; the symbolic and the stepwise evaluations agree at every catalogue address', () => {
    const system = systemOf();
    const space = spaceOf(system, extent);
    expect(space.unexpressed).toEqual([]);
    expect(Object.keys(space.fields).sort()).toEqual(['A', 'I', 'Lt', 'M', 'Mload', 'Mself', 'P', 'R', 'S', 'Wself', 'dload', 'delta', 'deltaLim', 'dself', 'q', 'sigma', 'sigmaAllow', 'hl', 'hcmL', 'hxL', 'hzL', 'hcmB', 'hxB', 'hzB'].sort());
    for (const o of lumberCatalogue()) {
      const at = Object.fromEntries(Object.entries(o.leaves).map(([s, l]) => [s, ofLeaf(l as Parameters<typeof ofLeaf>[0])]));
      const stepwise = solveAt(space, at);
      const inside = evaluateAt(space, at, []).admissible;
      for (const [sym, f] of Object.entries(space.fields)) {
        const a = sample(f, at).value, b = stepwise.bound[sym]?.value ?? null;
        // the stepwise solve refuses a law outside its validity domain; the space keeps the term and puts the domain in the region
        if (b === null) { expect(stepwise.bound[sym]?.refusal ?? Object.values(stepwise.bound).some((d) => d.refusal)).toBeTruthy(); expect(inside).toBe(false); continue; }
        expect(Math.abs(a! - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)));
      }
    }
  });

  it('the region refuses what the catalogue search refused, and selecting within the catalogue picks what the search picked', () => {
    const system = systemOf();
    const space = spaceOf(system, extent);
    const s = search(system, lumberCatalogue(), prefer);
    const a = among(space, prefer, lumberCatalogue());
    const label = (x: unknown) => a.labels[a.visited.indexOf(x as never)];
    expect(label(a.pick)).toBe(s.pick!.option.label);
    expect(a.admissible.map(label).sort()).toEqual(s.manifold.map((c) => c.option.label).sort());
    for (const c of s.candidates.filter((x) => !x.admissible)) expect(a.visited[s.candidates.indexOf(c)]!.failing.length).toBeGreaterThan(0);
  });

  it('a derivation finds a lawful section no catalogue holds, with less material than the catalogue\'s pick, least at its resolution', () => {
    const d = run();
    const space = spaceOf(systemOf(), extent);
    const pick = d.pick!;
    expect(pick.admissible).toBe(true);
    expect(d.solution!.satisfied).toBe(true);
    const catalogue = search(systemOf(), lumberCatalogue(), prefer).pick!;
    expect(pick.preferences[0]!.value!).toBeLessThan(catalogue.preference!.value! / 2);
    const b = pick.at['b']!.value!, h = pick.at['h']!.value!;
    for (const o of lumberCatalogue()) expect(Math.abs((o.leaves['b'] as { value: number }).value - b) + Math.abs((o.leaves['h'] as { value: number }).value - h)).toBeGreaterThan(1e-4);
    // least at the resolution: no address one final step away is admissible and preferred
    const pf = prefer.map((p) => preferenceField(space, p));
    const step = { b: d.spacing['b']!.value!, h: d.spacing['h']!.value! };
    expect(step.b).toBeLessThanOrEqual(0.001);
    for (const db of [-1, 0, 1]) for (const dh of [-1, 0, 1]) {
      if (!db && !dh) continue;
      const n = evaluateAt(space, { b: g('b', b + db * step.b), h: g('h', h + dh * step.h) }, pf);
      if (n.admissible === true) expect(n.preferences[0]!.value!).toBeGreaterThanOrEqual(pick.preferences[0]!.value! * (1 - 1e-12));
    }
    // the section the space reaches is on the region's boundary: on edge, at the lateral-stability limit and the sag limit
    expect(h / b).toBeLessThanOrEqual(2);
    expect(h / b).toBeGreaterThan(1.9);
  }, 120000);

  it('the derived address has a lineage: each coordinate a record from the lattice and the steps taken, the choice citing the space and the preference; the history is kept', () => {
    const d = run();
    const space = spaceOf(systemOf(), extent);
    const lawsUnder = (x: Derivation): string[] => [x.law ?? '', ...Object.values(x.inputs).flatMap(lawsUnder)];
    const lineage = lawsUnder(d.pick!.at['b']!);
    expect(lineage.some((l) => l.startsWith(`lattice over domain ${space.over.hash}`))).toBe(true);
    expect(lineage.some((l) => l.startsWith(`space ${space.hash}: the pattern search`))).toBe(true);
    expect(d.why!.law).toMatch(new RegExp(`^space ${space.hash}: least admissible on the lattice`));
    expect(closure(d.why!).has(prefer[0]!.hash)).toBe(true);
    expect(() => why(d.solution!.bound['delta']!)).not.toThrow();
    expect(d.visited.length).toBeGreaterThan(29 * 29);
    expect(d.admissible.length).toBeLessThan(d.visited.length);
  }, 120000);

  it('an undeclared freedom is refused by name, and the space\'s identity follows the intent', () => {
    expect(() => spaceOf(systemOf(), { b: extent.b })).toThrow(/needs .*h.*an undeclared freedom/);
    expect(() => spaceOf(systemOf(), { m: null })).toThrow(/m is bound, not free/);
    expect(spaceOf(systemOf(), extent).hash).toBe(spaceOf(systemOf(), extent).hash);
    expect(spaceOf(systemOf(80), extent).hash).not.toBe(spaceOf(systemOf(), extent).hash);
  });

  it('the learned language enters the region over the couplings\' quantities, and the space\'s identity follows the language', async () => {
    const s = await learned();
    const sem = semanticsOf();
    const space = spaceOf(sem.system, extent, { language: s.language, couplings: sem.couplings });
    const parts = space.region.filter((p) => p.source === s.relation!.hash);
    expect(parts.map((p) => p.says.split(':')[0])).toEqual(['the load on the beam', 'the beam on the left support', 'the beam on the right support']);
    expect(space.hash).not.toBe(spaceOf(sem.system, extent).hash);
    // the derivation without the language reached a section the language refuses
    const d = run();
    expect(evaluateAt(space, d.pick!.at, []).failing.some((f) => f.startsWith('the load on the beam: rests in place'))).toBe(true);
  }, 240000);

  it('without the language, the derived section carries its stress and sag but the load does not rest on it: the kernel shows it fall', async () => {
    const d = run();
    const s = beamOnTwoSupports(partXXV(), material(), [asOption('the derived section', d.pick!.at)], await jolt());
    expect(s.choice.pick!.option.label).toBe('the derived section');
    expect(s.realization!.stood.value).toBe(0);
    expect(s.realization!.drop.value!).toBeGreaterThan(0.1);
  }, 240000);

  it('with the language, a derived address at its edge is an experiment: the kernel contradicts it, the language grows over nine observations, and the next derived section rests in place with less material than the catalogue\'s pick', async () => {
    const s = await learned();
    const J = await jolt();
    const sem = semanticsOf();
    const before = s.language.hash;
    const e: Exploration = explore((lang) => spaceOf(sem.system, extent, { language: lang, couplings: sem.couplings }), prefer, spacing, resolution,
      (at, lang) => observe(beamOnTwoSupports(partXXV(), material(), [asOption('a derived section', at)], J, undefined, lang)), s.language, s.observations, 4);
    expect(e.ended).toBe('agreed');
    expect(e.rounds.length).toBe(2);
    const [first, second] = e.rounds;
    // the first derived section sits at the relation's edge and rocks: the observation contradicts the relation
    expect(first!.observation!.observed.value).toBe(0);
    expect(first!.superseded!.old.hash).toBe(s.relation!.hash);
    expect(first!.superseded!.by.group.text).toBe('hcm · halfX · halfZ^-2');
    expect(first!.superseded!.by.generality).toBe(9);
    expect(s.language.history().supersessions.length).toBe(1);
    expect(s.language.history().relations.map((r) => r.hash)).toContain(s.relation!.hash);
    expect(s.language.all().map((r) => r.hash)).not.toContain(s.relation!.hash);
    // only the relations in force judge: the superseded one is silent, its replacement speaks
    const q = s.observations[0]!.quantities;
    expect(s.language.judge(q).map((j) => j.relation.hash)).not.toContain(s.relation!.hash);
    expect(s.language.judge(q).map((j) => j.relation.hash)).toContain(first!.superseded!.by.hash);
    expect(s.language.hash).not.toBe(before);
    // the second rests in place, observed, with less material than the catalogue's pick
    expect(second!.agreed).toBe(true);
    expect(second!.observation!.observed.value).toBe(1);
    const catalogue = search(systemOf(), lumberCatalogue(), prefer).pick!;
    expect(second!.derived.pick!.preferences[0]!.value!).toBeLessThan(catalogue.preference!.value!);
    expect(e.observations.length).toBe(9);
    const realized = beamOnTwoSupports(partXXV(), material(), [asOption('the explored section', e.configuration!.pick!.at)], J, undefined, s.language);
    for (const c of realized.comparisons.filter((x) => x.name.startsWith('moment at bond'))) expect(c.verdict.kind).toBe('within');
    expect(realized.elastic!.sag.value!).toBeLessThanOrEqual(realized.choice.pick!.solution.bound['deltaLim']!.value!);
  }, 600000);
});
