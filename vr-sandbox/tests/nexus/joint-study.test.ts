// Abduction over a second coupling type: the joint. The derivation bounds the joint by the bolt group's bending
// capacity only; the kernel also breaks a joint in shear. Among the observations the language predicts to hold,
// the ones that broke are separated from the ones that held by one group over the joint's quantity types.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { candidates, discriminates } from '../../src/nexus/substrate/abduce';
import { choose } from '../../src/nexus/substrate/study';
import { jointStudy, type JointCase, type JointStudy } from '../../src/nexus/substrate/study-joint';
import { varsOf } from '../../src/nexus/substrate/term';

const heavy = { patch: 0.1, across: 0.5 };
const cases: JointCase[] = [
  { mass: 20, reach: 0.5, bolt: 'M6', count: 1 },
  { mass: 40, reach: 0.3, bolt: 'M6', count: 1 },
  { mass: 122, reach: 0.12, bolt: 'M3', count: 1, ...heavy },
  { mass: 122, reach: 0.12, bolt: 'M3', count: 2, ...heavy },
  { mass: 122, reach: 0.12, bolt: 'M4', count: 1, ...heavy },
  { mass: 80, reach: 0.12, bolt: 'M3', count: 1, ...heavy },
  { mass: 220, reach: 0.12, bolt: 'M4', count: 1, patch: 0.2, across: 0.6 },
  { mass: 60, reach: 0.3, bolt: 'M3', count: 1 },
  { mass: 100, reach: 0.12, bolt: 'M3', count: 1, ...heavy },
  { mass: 100, reach: 0.08, bolt: 'M3', count: 1, ...heavy, postSide: 0.05 },
];

let study: JointStudy | null = null;
async function run(): Promise<JointStudy> { return (study ??= jointStudy(await jolt(), cases)); }

describe('the joint study', () => {
  it('the derivation predicts nine joints to hold and one to break; the kernel breaks three: two anomalies, one explained', async () => {
    const s = await run();
    expect(s.observations.length).toBe(10);
    expect(s.observations.map((o) => o.derived.value)).toEqual([1, 1, 1, 1, 1, 1, 1, 0, 1, 1]);
    expect(s.observations.map((o) => o.observed.value)).toEqual([1, 1, 0, 1, 1, 1, 0, 0, 1, 1]);
    expect(s.residual.length).toBe(9);
    expect(s.failures.length).toBe(2);
    expect(s.failures.every((f) => f.kind === 'anomaly' && f.says.startsWith('the joint holds'))).toBe(true);
  }, 180000);

  it('the missing distinction is the shear over the bolts\' section strength: found over types, with the bolt count and diameter both needed', async () => {
    const s = await run();
    expect(s.chosen).not.toBeNull();
    expect(s.chosen!.group.exponents).toEqual({ V: 1, d: -2, nb: -1, Rm: -1 });
    const by = Object.fromEntries(s.candidates.map((c) => [JSON.stringify(c.group.exponents), c]));
    expect(by[JSON.stringify({ V: 1, d: -2, Rm: -1 })]!.separates).toBe(false);
    expect(by[JSON.stringify({ V: 1, d: -1, nb: -1, Rm: -1, lever: -1 })]!.separates).toBe(false);
    expect(s.chosen!.threshold!.above).toBe(0);
    // the bound the observations fix brackets the kernel's own shear capacity, 1127 N for one M3 of 800 MPa: 0.157 in the group's terms
    expect(s.chosen!.threshold!.lo).toBeLessThan(0.157);
    expect(s.chosen!.threshold!.hi).toBeGreaterThan(0.157);
    for (const c of s.candidates) for (const v of varsOf(c.group.term)) expect(['M', 'V', 'd', 'nb', 'Rm', 'lever']).toContain(v.sym);
  }, 180000);

  it('promoted with provenance over nine systems; without the small-post case the lever group ties and the next observation is named', async () => {
    const s = await run();
    expect(s.relation).not.toBeNull();
    expect(s.relation!.generality).toBe(9);
    expect(s.relation!.provenance).toMatch(/^abduced from observations /);
    expect(s.language.all().length).toBe(1);
    const without = candidates(s.residual.filter((o) => o.quantities['lever']!.value! > 0.03));
    const c = choose(without);
    expect(c.chosen).toBeNull();
    expect(c.ambiguous.length).toBe(2);
    expect(discriminates(c.ambiguous[0]!, c.ambiguous[1]!).sort()).toEqual(['d', 'lever']);
  }, 180000);
});
