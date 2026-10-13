// THE CRITIC MUST SPEAK. `make/critic.ts` has twelve checks and, before this file, exactly one test in the suite read
// its output at all — `machines.test.ts:59`, which asserts it found NOTHING. So a change that silenced the critic
// entirely would have made the suite greener, and that is not a hypothetical: a composed machine standing in mid-air
// with bolts threaded through solid aluminium passed 2,097 tests while a blind agent named both faults from one
// picture (docs/MANNY.md #82, and the same family as #39 and #49 — a check whose only assertion is that it stays
// quiet).
//
// So each check that is known to fire has a fixture here that must make it fire. The ones with no fixture are listed
// as debt, by name, and that list may only ever get shorter — adding a check to it is how this test would be
// defeated, so the list is asserted exactly rather than as a minimum.

import { describe, expect, it } from 'vitest';
import { KITS, makeKit } from '../../src/nexus/parts/kits';
import { perfect } from '../../src/nexus/make/pipeline';
import '../../src/nexus/world/creatures';
import '../../src/nexus/ask/machine';

/** Every check `critic.ts` can emit, read off its own `say(...)` calls. */
const EVERY = ['continuity', 'declared', 'density', 'draft', 'held up', 'interfaces', 'radius', 'room to move', 'room to slide', 'standing', 'through', 'walls'];

// the cheapest kits that between them exercise eight of the twelve: a car (bodywork and suspension), a bed (wall
// thickness), a street (things set into the ground), a park (standing over its own footprint), a composed machine (a
// carriage with something in its travel)
const FIXTURES: [kit: string, words: string][] = [
  ['car', 'a small hatchback'], ['bed', 'a bed'], ['street', 'a street'], ['park', 'a park'],
  ['machine', 'a gantry that prints 2000 x 1000 x 600'],
];

// Checks with no fixture yet, with why. THIS LIST MAY ONLY SHRINK — it is asserted exactly, so quietly adding a name
// to excuse a check that stopped firing fails this test by name.
// (`declared` was in this list when it was written, from a probe that recorded only the first finding per kit; the
//  assertion below caught it firing on the very first run, which is the behaviour the list exists to have.)
const NO_FIXTURE = [
  'density',     // fires where a material's density is outside what that material is
  'draft',       // fires on a moulded face with no draft angle: wants a kit with real mould geometry
  'interfaces',  // fires on `car park` (a hub bore against its shaft) — too slow to pull into the gate for one check
];

describe('the critic says something, and the suite notices when it stops', () => {
  const spoke = new Set<string>();
  for (const [id, words] of FIXTURES) {
    const k = KITS.find((x) => x.id === id);
    it(`${id} gives the critic something to say`, () => {
      expect(k, `no kit \`${id}\``).toBeTruthy();
      const r = perfect(makeKit(k!, words, 1).part, words);
      expect(r.findings.length, `${id}: the critic said nothing at all about it`).toBeGreaterThan(0);
      for (const f of r.findings) spoke.add(f.check);
    });
  }

  it('every check that has a fixture fires, and the list of those without one has not grown', () => {
    const want = EVERY.filter((c) => !NO_FIXTURE.includes(c));
    expect([...spoke].filter((c) => !EVERY.includes(c)), 'a check this file has never heard of: add it to EVERY').toEqual([]);
    expect(want.filter((c) => !spoke.has(c)), 'these checks have a fixture and said nothing: the critic has gone quiet').toEqual([]);
    expect(NO_FIXTURE.filter((c) => spoke.has(c)), 'these now fire: delete them from NO_FIXTURE').toEqual([]);
  });
});
