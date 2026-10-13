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
//
// EACH FIXTURE NAMES THE CHECKS IT MUST PRODUCE, which is the difference between this file working and this file
// looking like it works. The first version collected one `Set` across all five and asked only that each check fired
// SOMEWHERE — so `standing` was satisfied by a park and `through` by a street, and **a composed machine could emit
// nothing but `room to slide` for ever while this stayed green**. That is exactly the fault the file exists to
// catch, in the file that catches it (docs/MANNY.md #83). The union is still asserted below, as a backstop.
const FIXTURES: [kit: string, words: string, mustFire: string[]][] = [
  ['car', 'a small hatchback', ['continuity', 'declared', 'radius', 'room to move', 'walls']],
  ['bed', 'a bed', ['held up', 'walls']],
  ['street', 'a street', ['continuity', 'held up', 'radius', 'room to move', 'through']],
  ['park', 'a park', ['held up', 'standing']],
  // A composed machine produces ONE check today, and that is the finding rather than the fixture: `standing` cannot
  // fire because nothing in `machine-draw.ts` declares a foot, and `through` cannot because a machine is one thing
  // and `critic.ts:246` skips parts within one thing on purpose. When #78 and #79 land, both names come in here and
  // this line is what stops them regressing to true-on-the-day.
  ['machine', 'a gantry that prints 2000 x 1000 x 600', ['room to slide']],
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
  for (const [id, words, mustFire] of FIXTURES) {
    const k = KITS.find((x) => x.id === id);
    it(`${id}: the critic says ${mustFire.join(', ')}`, () => {
      expect(k, `no kit \`${id}\``).toBeTruthy();
      const r = perfect(makeKit(k!, words, 1).part, words);
      expect(r.findings.length, `${id}: the critic said nothing at all about it`).toBeGreaterThan(0);
      for (const f of r.findings) spoke.add(f.check);
      const said = new Set(r.findings.map((f) => f.check));
      expect(mustFire.filter((c) => !said.has(c)), `${id}: these checks went quiet ON THIS FIXTURE`).toEqual([]);
    });
  }

  it('every check that has a fixture fires, and the list of those without one has not grown', () => {
    const want = EVERY.filter((c) => !NO_FIXTURE.includes(c));
    expect([...spoke].filter((c) => !EVERY.includes(c)), 'a check this file has never heard of: add it to EVERY').toEqual([]);
    expect(want.filter((c) => !spoke.has(c)), 'these checks have a fixture and said nothing: the critic has gone quiet').toEqual([]);
    expect(NO_FIXTURE.filter((c) => spoke.has(c)), 'these now fire: delete them from NO_FIXTURE').toEqual([]);
  });
});
