// THE CRITIC MUST RUN, AND MUST STILL BE ABLE TO SPEAK — which are two assertions, and this file needed both before it
// was right.
//
// `make/critic.ts` has twelve checks and, before this file, exactly one test in the suite read its output at all —
// `machines.test.ts:59`, which asserts it found NOTHING. So a change that silenced the critic entirely would have made
// the suite greener, and that is not hypothetical: a composed machine with bolts threaded through solid aluminium
// passed 2,097 tests while a blind agent named the fault from one picture (docs/MANNY.md #82, the same family as #39
// and #49 — a check whose only assertion is that it stays quiet).
//
// The first version of this file fixed that by pinning, per fixture, the checks that must FIRE. That was wrong in a way
// worth keeping on the record (docs/MANNY.md #87). A critic speaks only where something IS wrong, so a list of what it
// said is a list of defects, and eighteen of the twenty-three pins were on `fixed: false` findings — open faults. Read
// plainly, the file required a hatchback to go on misdeclaring its own bores and a park to go on being about to tip
// over. The commit that fixed either would have turned this test red saying "these checks went quiet".
//
// What it was reaching for is whether the rule RAN, and the two come apart exactly where it matters. So:
//
//   kits        assert COVERAGE. Each fixture names the checks that must have looked at something on it
//               (`critique`'s `Looked` census, which counts candidates per check, zero included). A check that looked
//               at 46 skins and said nothing is working — and the commit that fairs those skins keeps this green. A
//               check that looked at 0 is dead, which is #78 and #79 said in one number.
//   literals    assert COMPLAINT. A part built small and built WRONG, which must still be called wrong. Here naming
//               the finding is exactly right, because the defect is constructed: nobody will ever "fix" the bowl that
//               locks in its die, so the pin can never stand in the way of the work.
//
// Measured while writing this, across all five kits at seeds 1, 2 and 3: every coverage count that was nonzero was
// nonzero at ALL THREE seeds, while two of the old complaint pins moved with the seed — the park said `standing` at
// seed 1 only, the street said `interfaces` at seeds 2 and 3 only. So the old file would have passed or failed on the
// luck of a seed, and coverage is the stable thing. That is why the kits run at two seeds here and not three: the
// question the third seed was for has been answered, and the answer is written down.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KITS, makeKit, type Part } from '../../src/nexus/parts/kits';
import { critique, type Looked } from '../../src/nexus/make/critic';
import { perfect } from '../../src/nexus/make/pipeline';
import type { Surface } from '../../src/nexus/parts/surface';
import '../../src/nexus/world/creatures';
import '../../src/nexus/ask/machine';

// Every check the critic can emit, READ OFF ITS OWN SOURCE rather than retyped here: a check added with no fixture and
// no literal fails the last test in this file, by name, without anyone having to remember this list exists
// (docs/MANNY.md #84).
//
// EVERY `critic*.ts`, not one file. The first version read `critic.ts` alone, and within the hour `critic.ts` was split
// at its oversize ratchet and `continuity`, `draft` and `radius` moved to `critic-skin.ts` — so the derived list would
// have silently shrunk from twelve to nine and every assertion below would have gone on passing. A list derived from
// one file is a list that a refactor can empty, which is the same fault as a check that cannot fire.
const DIR = new URL('../../src/nexus/make/', import.meta.url);
const SOURCE = readdirSync(DIR).filter((f) => /^critic.*\.ts$/.test(f)).map((f) => readFileSync(new URL(f, DIR), 'utf8')).join('\n');
const EVERY = [...new Set([...SOURCE.matchAll(/\bsay\('([^']+)'/g)].map((m) => m[1]!))].sort();

// The cheapest kits that between them exercise every check: a car (bodywork, suspension, declared bores), a bed (wall
// thickness and support), a street (things set into the ground, one thing passing into another), a park (standing over
// its own footprint), a composed machine (a carriage with something in its travel).
//
// EACH FIXTURE NAMES THE CHECKS THAT MUST HAVE LOOKED AT IT, measured per fixture rather than assumed. The first
// version collected one `Set` across all five and asked only that each check fired SOMEWHERE — so `standing` was
// satisfied by a park and `through` by a street, and a composed machine could have gone on emitting nothing but `room
// to slide` for ever while this stayed green (docs/MANNY.md #83). The union is still asserted below, as a backstop.
const FIXTURES: [kit: string, words: string, mustRun: string[]][] = [
  ['car', 'a small hatchback', ['continuity', 'declared', 'density', 'draft', 'held up', 'interfaces', 'radius', 'room to move', 'standing', 'walls']],
  ['bed', 'a bed', ['density', 'held up', 'walls']],
  ['street', 'a street', ['continuity', 'declared', 'density', 'draft', 'held up', 'interfaces', 'radius', 'room to move', 'standing', 'through', 'walls']],
  ['park', 'a park', ['declared', 'density', 'held up', 'standing', 'walls']],
  // `standing` on the machine looked at SEVEN grounded parts, which is worth saying plainly because the comment that
  // stood here before claimed the opposite: that it could not fire "because nothing in machine-draw.ts declares a
  // foot". That was written without measuring and was false — six 2040 extrusions stand at y = 0. The claim then came
  // back to me in a critic's report as established fact, which is how an unchecked claim does its damage. What the
  // measurement did find is a PTFE tube reaching 24 mm BELOW the floor (docs/MANNY.md #91).
  // `through`, `continuity`, `draft`, `radius`, `walls` and `interfaces` still look at nothing here: a machine is one
  // thing (so `critic.ts` skips its internal pairs on purpose), and it is drawn from solids with no skins. #78 and #79
  // are what bring those in, and this line is what stops them regressing to true-on-the-day.
  ['machine', 'a gantry that prints 2000 x 1000 x 600', ['declared', 'density', 'held up', 'room to slide', 'standing']],
];
const SEEDS = [1, 2];
/** Every pin above, counted: weakening a fixture (`'a small hatchback'` → `'a car'`, five pins → two) is green and
 *  strictly weaker, and nothing outside the fixture notices — unless the total is asserted, which it is here the way
 *  `NO_DEFECT` is asserted, so a weakened fixture fails by arithmetic (docs/MANNY.md #88). */
const PINS = 34;

// ---- the literals: defects built on purpose, where asserting the complaint is sound ----------------------------
const R = 0.1;
/** A bowl taken past its own equator — 135° of polar angle, so its lip curls back under itself and no direction the
 *  press can be set parts it from its die. Measured: its least draft is −7.8°, against the check's −0.5°. */
const BOWL: Surface = {
  net: Array.from({ length: 7 }, (_, i) => { const ph = (i / 6) * 0.75 * Math.PI; return Array.from({ length: 5 }, (_, j) => { const th = (j / 4) * 0.5 * Math.PI; return [R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph) + R, R * Math.sin(ph) * Math.sin(th)] as [number, number, number]; }); }),
};
// (a prism was the first attempt and it does NOT fire: a swept section has exactly zero draft, so the search sets the
//  die to pull along the sweep and reports 0°, not an undercut. Zero draft is itself unmouldable in a real press, which
//  is a question for the check and not for this fixture — docs/MANNY.md #92.)
const DEFECTS: [check: string, part: Part][] = [
  ['density', { name: 'a cubic metre that weighs half a kilo', shape: { box: [1, 1, 1] }, at: [0, 0.5, 0], mat: 'al-6061', kg: 0.5 }],
  ['draft', { name: 'a pressing that locks in its die', shape: { surf: { s: BOWL } }, at: [0, 0, 0], mat: 'steel', shell: 0.001, make: 'pressed' }],
  ['interfaces', { name: 'a bore on the wrong shaft', parts: [
    { name: 'the shaft', shape: { cyl: [0.0125, 0.2] }, at: [0, 0.1, 0], rot: [Math.PI / 2, 0, 0], mat: 'steel', iface: [{ kind: 'shaft', role: 'provides', d: 0.025 }] },
    { name: 'the hub', shape: { cyl: [0.03, 0.02] }, at: [0, 0.1, 0], rot: [Math.PI / 2, 0, 0], mat: 'steel', iface: [{ kind: 'shaft', role: 'requires', d: 0.02, to: 'the shaft' }] },
  ] }],
];
/** Checks with no constructed defect yet: nothing in the suite proves these can still SPEAK, only that they run.
 *  THIS LIST MAY ONLY SHRINK — it is asserted exactly, so adding a name to excuse a check that stopped speaking fails
 *  this test by name. It replaces the old `NO_FIXTURE`, whose entries were excused on cost; these are excused only on
 *  not being written yet, and each is a few lines of `Part` (docs/MANNY.md #85, #86). */
const NO_DEFECT = ['continuity', 'declared', 'held up', 'radius', 'room to move', 'room to slide', 'standing', 'through', 'walls'];

describe('the critic runs, and the suite notices when a check goes dead', () => {
  const ran = new Set<string>();
  for (const [id, words, mustRun] of FIXTURES) for (const seed of SEEDS) {
    const k = KITS.find((x) => x.id === id);
    it(`${id} (seed ${seed}): ${mustRun.length} checks look at it`, () => {
      expect(k, `no kit \`${id}\``).toBeTruthy();
      const m = perfect(makeKit(k!, words, seed).part, words);
      for (const [c, n] of Object.entries(m.looked)) if (n > 0) ran.add(c);
      expect(mustRun.filter((c) => !(m.looked[c]! > 0)), `${id}: these checks LOOKED AT NOTHING on this fixture, so their silence about it means nothing`).toEqual([]);
    }, 120000);
  }

  it('every check has a fixture it looks at, and the fixtures have not been weakened', () => {
    expect([...ran].filter((c) => !EVERY.includes(c)), 'a check this file has never heard of: `critic.ts` says it, and no fixture claims it').toEqual([]);
    expect(EVERY.filter((c) => !ran.has(c)), 'these checks looked at nothing on any fixture: either they are dead, or a kit stopped containing what they judge').toEqual([]);
    expect(FIXTURES.reduce((a, [, , p]) => a + p.length, 0), 'the fixtures were weakened: a pin was dropped rather than a fixture fixed').toBe(PINS);
    for (const [, , p] of FIXTURES) expect(p.filter((c) => !EVERY.includes(c)), 'a fixture pins a check `critic.ts` does not say').toEqual([]);
  });

  for (const [check, part] of DEFECTS) {
    it(`${check}: a part built wrong is still called wrong`, () => {
      const looked: Looked = {}, said = critique(structuredClone(part), looked);
      expect(looked[check]! > 0, `${check}: the defect was built for this check and the check did not look at it`).toBe(true);
      expect(said.map((f) => f.check), `${check}: a defect built for it, and it said nothing`).toContain(check);
    });
  }

  it('the list of checks with no constructed defect has not grown', () => {
    const proved = DEFECTS.map(([c]) => c);
    expect(NO_DEFECT.filter((c) => proved.includes(c)), 'these now have a defect that proves them: delete them from NO_DEFECT').toEqual([]);
    expect([...NO_DEFECT, ...proved].sort(), 'NO_DEFECT plus the defects must account for every check, exactly: a check with neither is unproven and unnamed').toEqual(EVERY);
  });
});
