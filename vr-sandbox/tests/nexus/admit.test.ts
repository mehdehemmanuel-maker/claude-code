// Promoted relations enter construction: a slice judges its couplings by the language before anything is realized
// and refuses with the relation named; the judgements cite the language's hash, so a later promotion makes exactly
// the judgements stale, and regenerating them under the grown language changes exactly those records.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { Language } from '../../src/nexus/abduce';
import { admitBy, beamOnTwoSupports, couplingQuantities, lumberCatalogue, materialLeaves } from '../../src/nexus/beam';
import { bracketCatalogue, bracketIntent, bracketMaterial, bracketOnPost } from '../../src/nexus/bracket';
import { flatGround } from '../../src/nexus/field';
import { restIntent, restStudy } from '../../src/nexus/study';
import { jointStudy, studyBolts, type JointCase } from '../../src/nexus/study-joint';
import { stale } from '../../src/nexus/why';

const restCases = [{ patch: 0.1, across: 0.1 }, { patch: 0.1, across: 0.2 }, { patch: 0.1, across: 0.3 }, { patch: 0.1, across: 0.4 }, { patch: 0.1, across: 0.6 }, { patch: 0.1, across: 0.15 }, { patch: 0.1, across: 0.12 }, { patch: 0.3, across: 0.0255 }];
const heavy = { patch: 0.1, across: 0.5 };
const jointCases: JointCase[] = [
  { mass: 20, reach: 0.5, bolt: 'M6', count: 1 }, { mass: 40, reach: 0.3, bolt: 'M6', count: 1 },
  { mass: 122, reach: 0.12, bolt: 'M3', count: 1, ...heavy }, { mass: 122, reach: 0.12, bolt: 'M3', count: 2, ...heavy },
  { mass: 122, reach: 0.12, bolt: 'M4', count: 1, ...heavy }, { mass: 80, reach: 0.12, bolt: 'M3', count: 1, ...heavy },
  { mass: 220, reach: 0.12, bolt: 'M4', count: 1, patch: 0.2, across: 0.6 }, { mass: 60, reach: 0.3, bolt: 'M3', count: 1 },
  { mass: 100, reach: 0.12, bolt: 'M3', count: 1, ...heavy }, { mass: 100, reach: 0.08, bolt: 'M3', count: 1, ...heavy, postSide: 0.05 },
];

let language: Language | null = null;
async function grown(): Promise<Language> {
  if (!language) { language = new Language(); restStudy(await jolt(), restCases, language); }
  return language;
}

describe('the language in construction', () => {
  it('a column the rest relation refuses is not realized, and the refusal names the relation; a slab is admitted and realized', async () => {
    const L = await grown();
    expect(L.all().length).toBe(1);
    const J = await jolt();
    const column = beamOnTwoSupports(restIntent({ patch: 0.1, across: 0.1 }), materialLeaves('wood.douglas-fir'), lumberCatalogue(), J, (f, by) => flatGround(f, by, 'a level floor'), L);
    expect(column.refusedBy).toEqual([`the load on the beam: ${L.all()[0]!.name}`]);
    expect(column.realization).toBeNull();
    expect(column.journal.all().some((e) => e.kind === 'refusal' && e.what === 'the configuration')).toBe(true);
    const slab = beamOnTwoSupports(restIntent({ patch: 0.1, across: 0.4 }), materialLeaves('wood.douglas-fir'), lumberCatalogue(), J, (f, by) => flatGround(f, by, 'a level floor'), L);
    expect(slab.refusedBy).toEqual([]);
    expect(slab.admission.length).toBe(3);
    expect(slab.admission.every((a) => a.judgement.holds.value === 1)).toBe(true);
    expect(slab.realization).not.toBeNull();
  }, 180000);

  it('the joint relation, once promoted into the same language, refuses a bracket whose joint it says will shear', async () => {
    const L = await grown();
    const J = await jolt();
    jointStudy(J, jointCases, L);
    expect(L.all().length).toBe(2);
    const shearing = bracketOnPost(bracketIntent('the person', { mass: 122, reach: 0.12, ...heavy }), bracketMaterial(), bracketCatalogue().filter((o) => o.label === '2x4 flat + M6 ×1'), J, { language: L });
    // M6 ×1 carries 122 kg at 0.12 m in both bending and shear: admitted
    expect(shearing.refusedBy).toEqual([]);
    const m3 = studyBolts().find((o) => o.label === 'M3 ×1')!;
    const small = bracketOnPost(bracketIntent('the person', { mass: 122, reach: 0.12, ...heavy }), bracketMaterial(), [{ label: '2x4 flat + M3 ×1', leaves: { ...lumberCatalogue().find((o) => o.label === '2x4 flat')!.leaves, ...m3.leaves } }], J, { language: L, jointConstraint: false });
    // the very configuration that fixed the bound's edge lies on it: the language says it cannot decide, and does not refuse
    expect(small.configuration!.jointHolds.value).toBe(1);
    expect(small.admission.find((a) => a.coupling === 'the arm on the post')!.judgement.holds.status).toBe('unresolved');
    expect(small.refusedBy).toEqual([]);
    // past the bound the language refuses, with the relation named, though the derivation's bending check says it holds
    const heavier = bracketOnPost(bracketIntent('the person', { mass: 150, reach: 0.1, patch: 0.15, across: 0.5 }), bracketMaterial(), [{ label: '2x4 flat + M3 ×1', leaves: { ...lumberCatalogue().find((o) => o.label === '2x4 flat')!.leaves, ...m3.leaves } }], J, { language: L, jointConstraint: false });
    expect(heavier.configuration!.jointHolds.value).toBe(1);
    expect(heavier.refusedBy).toEqual([`the arm on the post: ${L.all()[1]!.name}`]);
    expect(heavier.realization).toBeNull();
    const refused = heavier.admission.find((a) => a.judgement.holds.value === 0)!;
    expect(refused.judgement.relation.provenance).toMatch(/^abduced from observations/);
  }, 180000);

  it('a promotion makes exactly the judgements stale; regenerating under the grown language changes them and nothing else', async () => {
    const J = await jolt();
    const L = new Language();
    restStudy(J, restCases, L);
    const before = L.hash;
    const slab = beamOnTwoSupports(restIntent({ patch: 0.1, across: 0.4 }), materialLeaves('wood.douglas-fir'), lumberCatalogue(), undefined, (f, by) => flatGround(f, by, 'a level floor'), L);
    const records = slab.journal.records();
    jointStudy(J, jointCases, L);
    expect(L.hash).not.toBe(before);
    const old = stale(records, [before]);
    expect(old.length).toBe(3);
    expect(old.every((d) => d.law === L.all()[0]!.hash)).toBe(true);
    const again = admitBy(L, couplingQuantities(slab.configuration!, slab.choice.pick!.solution.bound, slab.semantics.system.bindings['g']!, slab.observer));
    expect(again.admission.length).toBe(3);
    for (const a of again.admission) expect(a.judgement.holds.cites).toContain(L.hash);
    expect(again.admission.map((a) => a.judgement.holds.value)).toEqual(old.map((d) => d.value));
    expect(stale(records.filter((d) => !old.includes(d)), [before]).length).toBe(0);
  }, 180000);
});
