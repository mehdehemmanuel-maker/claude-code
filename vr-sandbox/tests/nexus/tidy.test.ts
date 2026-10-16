// The lint that keeps the tree clean, because every way it got dirty is repeatable and none of them is caught by a
// type checker. Each check here is a mistake this repository actually made, not a style opinion:
//
//   1. **A file that owns six things.** `works.ts` reached 1,233 lines and six concerns before anyone noticed, because
//      adding to the file already open is always easier than finding the owner. A size limit does not make code good,
//      but it makes the moment of growth visible, and that is the moment the decision gets made.
//   2. **A file that does not say what it owns.** With no header the next round cannot tell whether a concern is
//      already covered, so it writes a second owner for it.
//   3. **Two files exporting one name.** Two owners for one concern is the specific thing CLAUDE.md's owners table
//      exists to prevent, and a clash inside one directory is that fault with no excuse left.
//   4. **A path in prose that no longer exists.** Moving 180 files left 135 of them naming `src/nexus/<name>.ts` in their
//      own comments; the geometry taxonomy happened to assert its own paths, which is the only reason it was caught.
//   5. **The same code written twice.** A hub and its axle both took a shaft diameter as `Math.max(0.03, t.rim *
//      0.12)`, written three times in one file, and all three were wrong together; the AWG formula was written out in
//      two directories. This is the name-clash fault with no name to clash: the second copy is written because the
//      first was out of sight, so the only thing that catches it is a reader that does not rely on remembering.
//   6. **A layer that reaches back up.** `world/` importing `view/` once puts the whole viewer inside a cycle with
//      everything the world touches, and nothing in the build complains.
//
// Four of the six are ratchets, not pass/fail gates, because this tree already carries the debt and a gate that
// fails on day one gets switched off by the next round. A ratchet writes the debt down to the number and refuses to
// let it grow: a new oversize file, a new name clash or one more import up a layer fails here with its own name in
// the message. Shrinking it fails too, with "delete this line" -- so the lists only ever get shorter, and each line
// is a piece of work someone can pick up. That is the difference between a lint and a lecture.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const NEXUS = join(ROOT, 'src/nexus');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}
const FILES = walk(NEXUS).sort();
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/');
const read = (p: string) => readFileSync(p, 'utf8');
const lines = (p: string) => read(p).split('\n').length;
const dirOf = (p: string) => {
  const d = relative(NEXUS, p).split('/')[0]!;
  return d.endsWith('.ts') ? '(root)' : d;
};

/** The prose that is read as instruction, and is therefore held to the same standard as the code: a path it names
 *  must exist and an `npm run` it names must be a real script. CLAUDE.md was one 2,166-line file until the round that
 *  split it, four fifths of it a round log, which is an anchor too long to read before a round. Splitting it would
 *  have quietly dropped three quarters of what this check covers, so the check follows the prose instead. Every entry
 *  is asserted to exist, so a rename fails here rather than silently un-checking a file. */
const PROSE = ['CLAUDE.md', 'docs/OWNERS.md', 'docs/ROUNDS.md', 'docs/TOOLS.md', 'docs/rounds/archive-1.md', 'docs/rounds/archive-2.md'];

/** Files a tool in `tools/measure/` wrote from a maker's own model or photo. They are data: long because the thing
 *  is, and their header carries the command that regenerates them instead of prose about a concern. */
const GENERATED = /^src\/nexus\/(models\/|boards\/sbc-)/;

/** Long because the world is. A table of real things is as long as the list of things; a file of *logic* this long is
 *  several concerns that have not been separated yet, which is what DEBT below is for. `max` is a ceiling, so a table
 *  that doubles still comes back here for a decision. */
const BIG: { file: string; max: number; why: string }[] = [
  { file: 'src/nexus/parts/inventory.ts', max: 1800, why: 'about 1,500 real products, each with what is inside it: a table of the world' },
  { file: 'src/nexus/parts/components.ts', max: 1500, why: 'one drawing generator per part family; each is small and there are many families' },
  { file: 'src/nexus/machines/machines.ts', max: 1600, why: "every wheeled machine's published figures, read by the one builder below them" },
  { file: 'src/nexus/models/voron24.ts', max: 1500, why: "generated: 1,297 parts measured out of VoronDesign's own STEP" },
];

/** Logic that is too long, with the ceiling set at what it measures today so it cannot grow while it waits its turn.
 *  Every line names what it should be split into: that is the work, not the number. */
const DEBT: { file: string; max: number; into: string }[] = [
  { file: 'src/nexus/view/forge.ts', max: 4045, into: 'the room, the asking, the phone, the benches and the pipeline player are five concerns in one file; the benches and the lighting have moved out, the rest have not' },
  { file: 'src/nexus/ask/conceive.ts', max: 3890, into: 'reading words into wants, the figures each want needs, and designing from laws are three files' },
  { file: 'src/nexus/ask/generate.ts', max: 1670, into: 'placing, repeating and turning shapes is one concern; sizing by law is another' },
  { file: 'src/nexus/substrate/manifold.ts', max: 1280, into: 'deriving structure from wants, and the balances that check it' },
  { file: 'src/nexus/embody/any.ts', max: 880, into: 'one builder per element kind, as `machines/` has one per machine kind' },
  { file: 'src/nexus/make/critic.ts', max: 860, into: 'one rule per file would let a rule be read without reading the others' },
  { file: 'src/nexus/view/boards3d.ts', max: 850, into: 'the wall, the list beside it and the controls above it' },
  { file: 'src/nexus/view/apps.ts', max: 810, into: 'one file per app on the phone' },
  { file: 'src/nexus/machines/panels.ts', max: 745, into: 'the body rules, and the skinning that applies them' },
];

/** Every exported name declared in two files, where either both are in one directory or at least one is a value.
 *  A type sharing an English word across a boundary (a `Step` in a lesson and a `Step` in a heat) is ordinary
 *  TypeScript; a *function* or *constant* with one name in two places is one concern with two owners until proven
 *  otherwise, and any clash inside a single directory is that fault with the boundary already agreed.
 *
 *  The set is asserted exactly: a new clash fails with its name, and a fixed one fails until its line is deleted.
 */
/** The one narrowing: a type alias written identically in every file whose right-hand side is a tuple or union of
 *  primitives is *notation*, not a concern with an owner. `type V3 = [number, number, number]` is declared thirteen
 *  times here, and TypeScript makes them the same type: giving them one owner would add thirteen imports and buy
 *  nothing, because the thing cannot drift without every boundary that uses it failing to compile. A clash that is
 *  the same *data* written twice is the opposite case and is a fault — the E series (IEC 60063) was written out in
 *  eight files, which is how a list of preferred values gets edited in one place and not the others. */
const NOTATION = /^=\s*(readonly\s*)?(\[[\w\s,|'"-]*\]|[\w\s|'"-]+);?$/;

/** What the rule above cannot see, kept by hand so the knowledge is not lost: a *type* exported from two files in
 *  different directories, where the two really are one concern. The rule skips those by design, because across a
 *  boundary a shared English word is usually two different things (an x-ray `Tube` and a bent `Tube`), and flagging
 *  them all would bury the real ones in sixty false positives. A line here is deleted when it is fixed. */
const ALSO: { name: string; files: string; why: string }[] = [
  { name: 'Station', files: 'machines/cell.ts works/stations.ts', why: 'both mean a machine you take work to, and there are two models of a shop in this tree: the forge room\u2019s workshop corner (which simulates its printer, kiln and furnace) and the works (which routes a job to a station and prices it). Merging them is its own job, and until then this is two owners for one idea' },
];

const CLASHES: string[] = [
  'ABILITIES :: ask/abilities.ts machines/fleet.ts',
  'Address :: substrate/journal.ts substrate/space.ts',
  'Arm :: machines/cell.ts machines/robot.ts view/robot.ts',
  'Boundary :: substrate/clock.ts substrate/tuner.ts',
  'Box :: substrate/boards.ts substrate/foldtree.ts',
  'CELLS :: embody/stock.ts life/cells.ts',
  'CLEAR :: kinds/motion.ts parts/fab.ts',
  'Call :: substrate/atlas.ts substrate/calls.ts',
  'Candidate :: substrate/abduce.ts substrate/solve.ts',
  'Carrier :: substrate/atlas.ts substrate/carrier.ts',
  'Crossing :: substrate/scale.ts substrate/tuner.ts',
  'Derived :: substrate/boards.ts substrate/space.ts',
  'Domain :: substrate/atlas.ts substrate/domain.ts',
  'ELECTRICAL :: book/electrical.ts kinds/electrical.ts',
  'FAMILIES :: parts/families.ts works/families.ts',
  'Frame :: machines/machines.ts machines/meca.ts make/critic.ts substrate/field.ts substrate/frame.ts',
  'Gap :: substrate/manifold.ts substrate/runtime.ts',
  'Group :: substrate/abduce.ts substrate/sizing.ts',
  'HANDS :: machines/kit-solder.ts machines/robot.ts',
  'HAZARDS :: machines/craft.ts machines/instruments.ts',
  'INFORMATION :: book/information.ts substrate/carrier.ts',
  'Invariant :: substrate/scale.ts substrate/tuner.ts',
  'Kind :: ask/conceive.ts ask/generate.ts life/graph.ts parts/inventory.ts substrate/manifold.ts substrate/tuner.ts world/coaster.ts',
  'Language :: substrate/abduce.ts teach/languages.ts',
  'Level :: substrate/boards.ts substrate/depth.ts',
  'MATERIALS :: book/materials.ts parts/elements.ts',
  'MOTION :: kinds/motion.ts machines/fleet.ts',
  'Matter :: ask/invent.ts substrate/matter.ts substrate/pipe.ts',
  'Observer :: substrate/field.ts substrate/perceive.ts substrate/scale.ts',
  'Of :: substrate/depth.ts substrate/tuner.ts',
  'PROCESSES :: parts/inventory.ts works/families.ts',
  'Place :: boards/sbc.ts world/places.ts world/weather.ts',
  'Printer :: machines/cell.ts machines/processor.ts',
  'Profile :: machines/profile.ts parts/fab.ts substrate/derive.ts',
  'Relation :: embody/execution.ts substrate/abduce.ts substrate/atlas.ts substrate/solve.ts',
  'Robot :: machines/robot.ts view/robot.ts',
  'Role :: boards/packages.ts substrate/carrier.ts substrate/tuner.ts teach/edges.ts works/families.ts',
  'Round :: embody/embody.ts substrate/explore.ts substrate/round.ts',
  'SOURCES :: ask/invent.ts machines/vehicle.ts',
  'STAGES :: substrate/pipe.ts view/notes.ts',
  'STATIONS :: machines/cell.ts works/stations.ts',
  'STOCK :: kinds/stock.ts works/lines.ts',
  'Shape :: embody/part.ts parts/kits.ts substrate/realize-space.ts substrate/shape.ts works/families.ts',
  'Space :: substrate/realize-space.ts substrate/space.ts',
  'Step :: embody/embody.ts machines/processor.ts substrate/attempt.ts substrate/depth.ts substrate/flows.ts substrate/tune.ts teach/lessons.ts teach/solder-lesson.ts',
  'Structure :: substrate/manifold.ts substrate/tuner.ts',
  'TOOLS :: kinds/tools.ts machines/robot.ts',
  'Task :: machines/fleet.ts machines/robot.ts',
  'Term :: lang/term.ts substrate/atlas.ts substrate/understand.ts',
  'Thing :: substrate/realize-space.ts teach/edges.ts teach/solder-lesson.ts',
  'Track :: world/coaster.ts world/karting.ts',
  'UNIVERSAL :: book/universal.ts substrate/carrier.ts',
  'Verdict :: ask/abilities.ts substrate/attempt.ts substrate/observe.ts works/can.ts',
  'View :: substrate/boards.ts substrate/contact.ts view/phone.ts',
  'Want :: ask/conceive.ts ask/want.ts works/can.ts',
  'advance :: substrate/clock.ts world/pingpong.ts',
  'boxOf :: embody/part.ts parts/pieces.ts',
  'breakdown :: parts/breakdown.ts substrate/record.ts',
  'buildSteps :: embody/tree.ts teach/solder-lesson.ts',
  'canDo :: ask/abilities.ts machines/robot.ts',
  'choose :: parts/kits.ts substrate/study.ts',
  'compare :: ask/outputs.ts substrate/observe.ts substrate/pipe.ts',
  'component :: machines/cell.ts parts/components.ts',
  'contacts :: embody/tree.ts parts/space.ts',
  'derive :: substrate/boards.ts substrate/space.ts',
  'describe :: substrate/manifold.ts view/brain.ts',
  'evaluate :: lang/evaluate.ts substrate/flows.ts',
  'explain :: embody/execution.ts substrate/depth.ts substrate/why.ts',
  'extentOf :: embody/part.ts world/anatomy.ts',
  'factName :: machines/fleet.ts world/person.ts',
  'fk :: machines/dharm.ts machines/meca.ts',
  'generate :: substrate/manifold.ts substrate/scale.ts',
  'held :: make/critic.ts view/merge-static.ts',
  'ik :: machines/dharm.ts machines/meca.ts',
  'inside :: embody/inside.ts substrate/domain.ts',
  'lattice :: substrate/adapt.ts substrate/domain.ts',
  'layOut :: embody/breadboard.ts world/anatomy.ts',
  'layout :: parts/space.ts substrate/boards.ts',
  'leavesUnder :: substrate/record.ts substrate/why.ts',
  'linesOf :: kinds/core.ts machines/link.ts',
  'massOf :: ask/outputs.ts parts/mass.ts substrate/derive.ts',
  'matOf :: ask/generate.ts kinds/core.ts',
  'matterOf :: ask/generate.ts embody/inside.ts',
  'measured :: parts/fits.ts substrate/record.ts',
  'observe :: substrate/scale.ts substrate/study.ts',
  'plan :: parts/inventory.ts substrate/clock.ts',
  'principlesOf :: book/principles.ts embody/taxonomy.ts',
  'profileFaults :: parts/fab.ts substrate/derive.ts',
  'project :: substrate/channel-text.ts substrate/project.ts',
  'rank :: lang/status.ts substrate/network.ts',
  'reach :: substrate/atlas.ts substrate/tuner.ts',
  'readConditions :: ask/conditions.ts make/conditions.ts',
  'resolve :: parts/inventory.ts substrate/understand.ts',
  'search :: ask/outputs.ts substrate/solve.ts',
  'shapeOf :: substrate/derive.ts substrate/record.ts substrate/shape.ts works/lines.ts',
  'solve :: substrate/record.ts substrate/solve.ts',
  'stale :: substrate/tune.ts substrate/why.ts',
  'step :: substrate/record.ts teach/solder-joint.ts',
  'termsIn :: substrate/census.ts substrate/understand.ts',
  'tune :: substrate/channel-text.ts substrate/tune.ts',
];

/** The tree's intended shape, most depended upon first: the laws, then the engine over them, then the parts library,
 *  then the boards and machines made of parts, then the catalogues of them, then what reads an ask, what makes,
 *  simulates and teaches, and last what draws. An import that runs the other way is a layer reaching up into one that
 *  should depend on it, which is a cycle as soon as anything answers back. Every one is written down below. */
const LAYERS = ['lang', 'book', 'substrate', 'parts', 'boards', 'machines', 'models', 'kinds', 'ask', 'embody', 'make', 'life', 'world', 'teach', 'works', 'view', 'cli', '(root)'];

/** Where the tree reaches back up today, with the count as a ceiling. These are 20 lines, not 20 problems: three
 *  causes account for 55 of the 100 imports, and each has a named fix.
 *
 *  Three are already fixed, and they are what fixing one of these looks like. `world -> view`: the dartboard's own
 *  figures and what a dart scores sat in the viewer, and a game's rules belong to the world, so they moved and the
 *  viewer reads them. `parts -> make` and `machines -> make` were both one thing: `space.ts` — where every part of a
 *  made thing is and which parts touch — is geometry, not a stage of the make pipeline, and it had dragged
 *  `machines/form.ts` (lofts, bent tubes, turned profiles) and `machines/surface.ts` (NURBS) along with it, neither of
 *  which is a machine either. All three are now in `parts/`, beside the placed tree they are about, which also took
 *  `parts -> machines` from 20 imports to 15.
 *
 *  Three of them are the same mistake — a *vocabulary* (a type everyone speaks in) living inside one of the two
 *  layers that speak it. `Term`, `Law` and `evaluate` live in the engine, so the book of laws has to import the
 *  engine; `Want` lives in `ask/`, so the engine has to import the asking. Moving a vocabulary down below both
 *  closes those two knots and nothing else changes.
 *
 *  The fourth is a registry in the wrong place: `parts/components.ts` draws every kind there is, so it imports every
 *  machine's, board's and catalogue's drawing function — 45 of these imports are that one file reaching up out of the
 *  library it lives in. A registry belongs above what it registers (or the drawers register themselves into it),
 *  and that one change settles `parts -> machines`, `parts -> kinds`, `parts -> boards` and `parts -> models` at once. */
const REACHES_BACK: { edge: string; imports: number; why: string }[] = [
  { edge: 'parts -> machines', imports: 15, why: 'components.ts draws every kind, so it imports every drawer: a registry inside the library it registers' },
  { edge: 'parts -> kinds', imports: 16, why: 'the same registry, reaching up for each kind’s own figures' },
  { edge: 'substrate -> ask', imports: 14, why: "the engine speaks in ask/want's Want, which is vocabulary and belongs below both" },
  { edge: 'parts -> boards', imports: 6, why: 'the same registry, reaching up for a board and its packages' },
  { edge: 'substrate -> parts', imports: 4, why: 'derive and beam ask the library what stock and what products exist' },
  { edge: 'parts -> models', imports: 3, why: "the inventory and the registry name the printers measured from their makers' CAD" },
  { edge: 'substrate -> embody', imports: 3, why: 'understand, census and the boards read the embodiment taxonomy' },
  { edge: 'life -> world', imports: 2, why: "a body's segments are the anatomy's, which sits in world/" },
  { edge: 'machines -> kinds', imports: 2, why: "machines.ts and makermodel.ts read a fastener's and a wheel's catalogue figures" },
  { edge: 'machines -> teach', imports: 2, why: "robot.ts says a robot's soldering in the lessons' own steps" },
  { edge: 'parts -> life', imports: 2, why: 'the elements and the inventory reach into molecules' },
  { edge: 'substrate -> life', imports: 2, why: 'derive reads molecules and lifetimes' },
  { edge: 'ask -> world', imports: 1, why: 'route sends an ask for a place to world/places' },
  { edge: 'boards -> kinds', imports: 1, why: "sbc reads a chip case's figures from kinds/electrical" },
  { edge: 'machines -> ask', imports: 1, why: "vehicle.ts says a vehicle's wants in ask/want's words" },
  { edge: 'machines -> models', imports: 1, why: 'franka.ts reads its own measured sections' },
  { edge: 'parts -> embody', imports: 1, why: "the registry reads embody/stock's cells" },
  { edge: 'parts -> world', imports: 1, why: 'pieces.ts reaches into the anatomy' },
  { edge: 'substrate -> teach', imports: 1, why: 'flows.ts names the languages a step can be written in' },
];

describe('the tree keeps its shape', () => {
  it('nothing loose at the root: every file is inside a boundary', () => {
    const loose = readdirSync(NEXUS).filter((n) => n.endsWith('.ts')).sort();
    // `index.ts` was a barrel re-exporting fifteen directories: a second owner for every name in the tree, named by
    // nothing in src/ and by no test, deleted in Run 7s when `tools/unwired.mjs` found it unreachable from every door.
    expect(loose, 'a new file at the root means its concern has no home yet — give it one').toEqual(['works.ts']);
  });

  // RULE 24. Every tool is named in docs/TOOLS.md.
  //
  // This rule exists because of a specific failure, in the same session that was lecturing about it. `tools/wired.mjs`
  // was written to answer "what is connected to what" — the question `tools/unwired.mjs` had already answered since
  // Run 7s, documented in docs/TOOLS.md under a heading two screens long. Nothing caught it: the name-clash ratchet
  // reads `src/` only, so a second owner of one concern in `tools/` costs nothing and fails nothing. Two tools gave
  // two different answers about the same tree, and the worse one was the one being quoted.
  //
  // The fix is not a cleverer clash detector; it is making the duplicate impossible to write without reading the
  // list. A new tool has to be added to TOOLS.md to pass, and adding it means opening the file where its twin
  // already sits. The two were merged (unwired.mjs gained `path`, and its walk widened from src/nexus to all of
  // src/, which is what had hidden engineering/gears.ts from it), and wired.mjs was deleted.
  it('every tool is named in docs/TOOLS.md, so a second one cannot be written without meeting the first', () => {
    const tools = readdirSync(join(ROOT, 'tools')).filter((n) => /\.(mjs|js)$/.test(n)).sort();
    const doc = readFileSync(join(ROOT, 'docs/TOOLS.md'), 'utf8');
    const missing = tools.filter((t) => !doc.includes(`tools/${t}`));
    expect(missing, 'a tool nothing documents is a tool the next round writes again: add it to docs/TOOLS.md, and read what is already there while you are in the file').toEqual([]);
  });

  it('every directory is named in LAYERS, and every directory holds more than one file', () => {
    for (const d of readdirSync(NEXUS)) {
      const p = join(NEXUS, d);
      if (!statSync(p).isDirectory()) continue;
      expect(LAYERS, `${d}/ is not in LAYERS: say where it sits in the tree`).toContain(d);
      const n = walk(p).length;
      expect(n, `${d}/ is empty`).toBeGreaterThan(0);
      if (n === 1) expect(['book', 'life'], `${d}/ holds one file: either that is not a directory's worth of concern, or it is unfinished`).toContain(d);
    }
  });

  it('nothing imports up a layer except where it is written down, and never more than before', () => {
    const edges = new Map<string, number>();
    for (const f of FILES) {
      const from = dirOf(f);
      for (const m of read(f).matchAll(/from\s+'(\.[^']+)'/g)) {
        const target = resolve(f, '..', m[1]!);
        if (!target.startsWith(NEXUS)) continue;
        const to = dirOf(target);
        if (to === from) continue;
        const a = LAYERS.indexOf(from), b = LAYERS.indexOf(to);
        if (a < b) edges.set(`${from} -> ${to}`, (edges.get(`${from} -> ${to}`) ?? 0) + 1);
      }
    }
    const faults: string[] = [];
    for (const [edge, n] of [...edges].sort()) {
      const known = REACHES_BACK.find((r) => r.edge === edge);
      if (!known) faults.push(`${edge} (${n}) imports up a layer and is not written down: import the other way, move the shared piece down, or add it to REACHES_BACK with why`);
      else if (n > known.imports) faults.push(`${edge} is now ${n} imports, was ${known.imports}: a knot this file calls debt is being tied tighter`);
    }
    for (const r of REACHES_BACK) {
      if (r.why.length < 20) faults.push(`${r.edge} is written down with no reason`);
      const n = edges.get(r.edge) ?? 0;
      if (n === 0) faults.push(`${r.edge} is gone — delete its line from REACHES_BACK`);
      else if (n < r.imports) faults.push(`${r.edge} is down to ${n} imports from ${r.imports} — lower its number to hold the gain`);
    }
    expect(faults).toEqual([]);
  });
});

describe("the bundle's inputs stay enumerable", () => {
  // `tools/bundle.mjs` skips the door build when nothing it is built from changed, and its key is the hash of every
  // file under src/ plus the config and the lockfile. That key is the whole truth only while the module graph under
  // src/ stays inside src/: one relative import reaching out of it (a data file in models/, a helper in tools/)
  // would put a file in the bundle that the key does not hash, and the cache would serve a stale bundle with no
  // window in which anyone could notice. Run 7x declined to build that cache because it feared exactly this; the
  // cache is honest BECAUSE this holds, so it is checked rather than remembered.
  it('no relative import under src/ reaches outside src/', () => {
    const out: string[] = [];
    for (const f of FILES) {
      for (const m of read(f).matchAll(/from\s+'(\.[^']+)'/g)) {
        const target = resolve(f, '..', m[1]!);
        if (!target.startsWith(join(ROOT, 'src'))) out.push(`${relative(ROOT, f)} imports ${m[1]} — outside src/, so tools/bundle.mjs would not hash it`);
      }
    }
    expect(out).toEqual([]);
  });

  it('every file tools/bundle.mjs hashes beside src/ is a file that exists', () => {
    const named = [...readFileSync(join(ROOT, "tools/bundle.mjs"), 'utf8').matchAll(/'([\w.-]+\.(?:ts|json|mjs))'/g)].map((m) => m[1]!);
    expect(named.length, 'bundle.mjs no longer names the files it hashes beside src/ — the list below is read from it').toBeGreaterThan(3);
    for (const n of named) {
      if (n === 'tsconfig.json' && !existsSync(join(ROOT, n))) continue; // bundle.mjs skips a missing one by design
      expect(existsSync(join(ROOT, n)), `tools/bundle.mjs hashes ${n}, which is not there: either it moved and the cache is blind to it, or the line is dead`).toBe(true);
    }
  });
});

describe('every file says what it owns', () => {
  it('a header comment long enough to be a sentence about the concern', () => {
    const bare: string[] = [];
    for (const f of FILES) {
      let chars = 0;
      for (const line of read(f).split('\n')) {
        if (!(line.startsWith('//') || line.startsWith('/*') || line.startsWith(' *'))) break;
        chars += line.length;
      }
      if (chars < 80) bare.push(`${rel(f)} (${chars} characters of header)`);
    }
    expect(bare, 'a file with no header is a file the next round cannot tell is already the owner of something').toEqual([]);
  });

  it('a generated file says what wrote it and how to run that again', () => {
    for (const f of FILES) {
      if (!GENERATED.test(rel(f))) continue;
      const head = read(f).slice(0, 3000);
      expect(/tools\/measure|generated by|photo\.py|xml3d|stepasm|meshloft/i.test(head), `${rel(f)} is generated data with nothing in it saying what made it`).toBe(true);
    }
  });
});

describe('no file quietly becomes six concerns', () => {
  it('nothing over 700 lines without a written allowance', () => {
    const over: string[] = [];
    for (const f of FILES) {
      const n = lines(f), r = rel(f);
      const big = BIG.find((b) => b.file === r), debt = DEBT.find((b) => b.file === r);
      if (!big && !debt && n > 700) over.push(`${r}: ${n} lines, and nothing says why. Split it to its owners, or add it to BIG (it is a table of real things) or DEBT (it is logic, with what it splits into)`);
      if (big && n > big.max) over.push(`${r}: ${n} lines of data, allowed ${big.max}. Raise the ceiling deliberately or split the table`);
      if (debt && n > debt.max) over.push(`${r}: ${n} lines, allowed ${debt.max}. It is already down as debt and it grew: ${debt.into}`);
    }
    expect(over).toEqual([]);
  });

  it('every allowance names a file that exists, is still big, and says why', () => {
    for (const b of [...BIG, ...DEBT]) {
      expect(existsSync(join(ROOT, b.file)), `${b.file} does not exist — delete its line`).toBe(true);
      const n = lines(join(ROOT, b.file));
      expect(n, `${b.file} is ${n} lines, under the 700-line limit \u2014 delete its line`).toBeGreaterThan(700);
      expect(b.max, `${b.file} is ${n} lines and its ceiling is ${b.max}: a ceiling that far above the file can never fire, so lower it`).toBeLessThan(n * 1.5);
      expect(('why' in b ? b.why : b.into).length, `${b.file}'s line gives no reason`).toBeGreaterThan(20);
    }
    for (const d of DEBT) expect(BIG.some((b) => b.file === d.file), `${d.file} is in both BIG and DEBT: it is either data or logic`).toBe(false);
  });
});

describe('one owner per name', () => {
  it('the set of name clashes is exactly the set written down', () => {
    const where = new Map<string, { file: string; kind: string; body: string }[]>();
    for (const f of FILES) {
      for (const m of read(f).matchAll(/^export\s+(?:async\s+)?(const|let|var|function|class|enum|interface|type)\s+([A-Za-z_$][\w$]*)([^\n]*)/gm)) {
        const at = relative(NEXUS, f).replace(/\\/g, '/');
        where.set(m[2]!, [...(where.get(m[2]!) ?? []), { file: at, kind: m[1]!, body: m[3]!.trim() }]);
      }
    }
    const found: string[] = [];
    for (const [name, all] of where) {
      const files = [...new Set(all.map((a) => a.file))].sort();
      if (files.length < 2) continue;
      const dirs = files.map((f) => (f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '(root)'));
      const sameDir = dirs.some((d, i) => dirs.indexOf(d) !== i);
      const isValue = all.some((a) => a.kind !== 'interface' && a.kind !== 'type');
      const sameNotation = all.every((a) => a.kind === 'type' && a.body === all[0]!.body && NOTATION.test(a.body));
      if ((sameDir || isValue) && !sameNotation) found.push(`${name} :: ${files.join(' ')}`);
    }
    const known = new Set(CLASHES), now = new Set(found);
    const added = [...now].filter((c) => !known.has(c)).sort();
    const gone = [...known].filter((c) => !now.has(c)).sort();
    expect(added, 'a new name in two places: find the one owner and import it, or give one of them the name of what it actually is').toEqual([]);
    expect(gone, 'these clashes are fixed — delete their lines from CLASHES so the list keeps shrinking').toEqual([]);
  });

  it('every name the rule cannot see is still declared in both places it names', () => {
    for (const a of ALSO) {
      const files = a.files.split(' ');
      for (const f of files) expect(existsSync(join(NEXUS, f)), `ALSO names ${f}, which does not exist`).toBe(true);
      const found = files.filter((f) => new RegExp(`^export\\s+(type|interface|const|function|class|enum)\\s+${a.name}\\b`, 'm').test(read(join(NEXUS, f))));
      expect(found, `${a.name} is no longer declared in all of ${a.files} \u2014 delete its line from ALSO`).toEqual(files);
      expect(a.why.length, `${a.name}'s line gives no reason`).toBeGreaterThan(40);
    }
  });

  it('no name clashes inside one file-pair twice over (every CLASHES line is well formed)', () => {
    for (const c of CLASHES) {
      const [name, files] = c.split(' :: ');
      expect(name, `${c} has no name`).toBeTruthy();
      for (const f of files!.split(' ')) expect(existsSync(join(NEXUS, f)), `CLASHES names ${f}, which does not exist`).toBe(true);
    }
    expect(new Set(CLASHES).size, 'CLASHES has a duplicate line').toBe(CLASHES.length);
  });
});

describe('what the prose says is true', () => {
  it('every src/nexus path named anywhere in the repo exists', () => {
    const bad: string[] = [];
    const sources = [...FILES, ...PROSE.map((f) => join(ROOT, f)), ...walk(join(ROOT, 'tests'))];
    for (const f of sources) {
      if (!existsSync(f)) continue;
      for (const m of read(f).matchAll(/src\/nexus\/[\w./-]*\.ts/g)) {
        const p = m[0]!.replace(/[.,;:)]+$/, '');
        if (!existsSync(join(ROOT, p))) bad.push(`${rel(f)} names ${p}, which does not exist`);
      }
    }
    expect([...new Set(bad)].sort(), 'a path in prose goes stale the moment a file moves, and nothing else catches it').toEqual([]);
  });

  it('every file in PROSE exists, so a rename cannot drop these checks', () => {
    for (const f of PROSE) expect(existsSync(join(ROOT, f)), `PROSE names ${f}, which does not exist: either restore it or take its line out`).toBe(true);
  });

  // EVERY CHECK ENDS IN ITS OWN VERDICT, so reading its output is never ambiguous and truncating it is never a lie.
  // `npm run tidy 2>&1 | tail -3` once "verified" this file while the gate failed on the same rule, because a pipe
  // replaces the exit status — and `tail -100` would have passed too (docs/ROUNDS.md Run 7n–7o). Banning the pipe bans
  // a spelling; `tools/verdict.mjs` removes the cause by making the last line the answer.
  //
  // A SCRIPT IS A CHECK BY WHAT IT RUNS, NOT BY ITS NAME. The first version of this rule listed four names — which is
  // the fault two rounds were spent taking out of `turning()`, written straight back in: a fifth check under a new name
  // passed it (docs/MANNY.md #101). A verifier in the command is the property, so `test:watch` (`vitest` with no `run`,
  // a watcher) is correctly not a check, and anything calling vitest or tsc tomorrow is caught whatever it is called.
  const VERIFIERS = [/\bvitest run\b/, /\btsc --noEmit\b/];
  it('every script that runs a verifier says PASS or FAIL as its last line', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as { scripts: Record<string, string> };
    const checks = Object.entries(pkg.scripts).filter(([, v]) => VERIFIERS.some((re) => re.test(v)));
    expect(checks.length, 'no script runs a verifier: either the checks are gone or VERIFIERS has stopped matching them').toBeGreaterThan(0);
    for (const [k, v] of checks) {
      expect(v, `\`npm run ${k}\` runs a verifier without \`tools/verdict.mjs\`, so its output can be truncated into a lie`).toMatch(/^node tools\/verdict\.mjs [A-Z]+ /);
      // (and a test run with no count is a pass that cannot fail: 16 skipped, 0 run, exit 0 — docs/MANNY.md #100.
      //  `tsc` is asked for no count because it has no test to count; `verdict.mjs` then says so rather than implying
      //  work it cannot see.)
      if (/\bvitest run\b/.test(v)) expect(v, `\`npm run ${k}\` runs tests with no \`--ran\`, so it would report PASS on a run that executed nothing`).toMatch(/--ran \S+/);
    }
  });

  it('every npm script the prose names is in package.json', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as { scripts: Record<string, string> };
    const named = PROSE.flatMap((f) => [...read(join(ROOT, f)).matchAll(/`npm run ([\w:-]+)/g)].map((m) => m[1]!));
    for (const s of [...new Set(named)].sort()) expect(Object.keys(pkg.scripts), `the prose names \`npm run ${s}\`, which package.json does not have`).toContain(s);
  });
});

/** A fragment of code written in two places, which is the name-clash fault with no name to clash: nothing declares a
 *  second owner, so nothing but a reader can see it. The reader is deliberately narrow, because a clone detector that
 *  reports everything is switched off within a day:
 *
 *  - it compares *code*, so a fragment that starts inside a string or a comment is not one. Prose repeats itself
 *    honestly ("about 0.8 mm (typical)" belongs beside every part it is typical of), and string arguments are kept
 *    *in* the comparison, because they are what makes `unit('L', 'length', …)` and `unit('V', 'voltage', …)` two
 *    rows of a table rather than one rule written twice.
 *  - it wants a measured number in the fragment (a decimal point). `parts.push(P(name, shape, at))` is the shape of
 *    every drawing in this tree and repeating it is the point; `Math.max(0.6, 0.07 * D)` is a *rule*, and a rule has
 *    one owner.
 *  - it wants arithmetic on that number, or twenty more characters without it, so `mat('aluminum.6061-t6')` — a
 *    lookup by name, which is already one owner — is not a clone of itself.
 *  - and it wants the two in different files, because a run of `it(...)` cases or a table's rows inside one file is
 *    how a table is written.
 */
function inText(raw: string): boolean[] {
  const flag = new Array<boolean>(raw.length).fill(false);
  let q = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]!;
    if (q) { flag[i] = true; if (c === '\\') { flag[++i] = true; continue; } if (c === q) q = ''; continue; }
    if (c === '/' && raw[i + 1] === '/') { for (let j = i; j < raw.length; j++) flag[j] = true; break; }
    if (c === "'" || c === '"' || c === '`') { q = c; flag[i] = true; }
  }
  return flag;
}

/** Every balanced-bracket fragment of a line that starts in code, as the doc comment above describes it. */
function fragments(raw: string): string[] {
  const text = inText(raw), out: string[] = [];
  for (let s = 0; s < raw.length; s++) {
    if (text[s] || !/[A-Za-z_(]/.test(raw[s]!)) continue;
    if (s > 0 && /[A-Za-z0-9_.$]/.test(raw[s - 1]!)) continue;
    let depth = 0, end = -1;
    for (let j = s; j < raw.length; j++) {
      if (text[j]) continue;
      if (raw[j] === '(') depth++;
      else if (raw[j] === ')') { depth--; if (depth === 0) { end = j; break; } if (depth < 0) break; }
    }
    if (end < 0) continue;
    const frag = raw.slice(s, end + 1).trim().replace(/\s+/g, ' ');
    if (frag.length < 22 || frag.length > 120 || !/\d*\.\d/.test(frag)) continue;
    if (frag.length < 42 && !/[*/]|\*\*| [+-] /.test(frag)) continue;
    out.push(frag);
  }
  return out;
}

/** The fragments written in more than one file today, each with where, so a new one fails by name and a fixed one
 *  fails until its line is deleted. Worked down by giving the rule one owner and importing it, never by widening the
 *  reader above: four went that way the round this was written (the AWG formula to `parts/families.ts`, a flanged
 *  bearing's flange and a GT2 loop's default diameter to `kinds/motion.ts`, a set screw's socket depth to
 *  `parts/threads.ts`). What is left is mostly `view/`, where two games and two rooms each wrote their own
 *  `std(…)` material helper, and `boards/`, where one solder-ball drawing is written in two files. */
const DUPES: string[] = [
  "M: fixed('molar mass of water', 0.018015, 'kg/mol', 'IUPAC') :: life/decay.ts:219 life/flows.ts:42 life/flows.ts:43 life/flows.ts:47",
  "Math.abs(Math.sin(t * 5.3)) :: view/forge.ts:582 view/jarvis.ts:172",
  "box('die', [4, 0.6, 4], [0, 0.4, 0], 'silicon') :: boards/boardparts.ts:606 boards/sbc.ts:572",
  "box('lead', [a * 0.94, ball, a * 0.94], [0, ball / 2, 0], 'solder', { inBody: 0, share, color: 0xb8bcc0 }) :: boards/boardparts.ts:634 boards/boardparts.ts:643 boards/sbc.ts:348",
  "const std = (c: number, rough = 0.6, metal = 0, more: THREE.MeshStandardMaterialParameters = {}) :: view/coaster3d.ts:13 view/pingpong3d.ts:13",
  "const std = (color: number, metalness = 0.4, roughness = 0.55) :: view/cell-view.ts:14 view/warehouse.ts:14",
  "fill: Math.max(0.03, Math.min(1, left / solid)) :: machines/headset.ts:121 machines/headset.ts:153 machines/lab.ts:143",
  "lines.forEach((l, i) => g.fillText(l, pad, pad + i * font * 1.25)) :: view/holo.ts:18 view/main.ts:58",
  "measured('skin area', 1.9, 'm^2', 'ICRP 89') :: life/decay.ts:199 life/flows.ts:48",
  "this.acc = Math.min(this.acc + dt, 0.1) :: world/games.ts:85 world/person.ts:412",
  "unit('L', 'length', 'm', [1, 3, 6], [0.1, 6, 0.01]) :: kinds/goods.ts:192 kinds/plant.ts:55",
  "unit('L', 'length', 'm', [1, 5, 10, 25], [0.01, 100, 0.01]) :: kinds/fluid.ts:50 kinds/stock.ts:134",
  "unit('L', 'length', 'm', [1, 5, 10], [0.01, 100, 0.01]) :: kinds/electrical.ts:253 kinds/fluid.ts:104",
];

// EVERY JUDGE THE PICTURE OWNS SPEAKS WHERE A PERSON MEETS IT. The first version of this block asserted that each
// member of the page's API is "read by a tool", and the round that wrote it claimed `held`, `frame` and `clash` had
// **zero callers in tools/**. That claim was false: `tools/bench.mjs` has had `held:` and `frame:` subcommands since
// the commits that added the judges, and `clash` since before. So the rule as written PASSED on the exact case that
// motivated it — measured three ways, including against `bench.mjs` alone (docs/MANNY.md #105).
//
// The true statement, and the one worth a rule, is narrower: no tool printed them **unasked**. A verdict behind a
// subcommand is a verdict you must already suspect you need. So the property is membership of the door that speaks
// without being asked — `tools/look.mjs`, which prints under every picture — and `bench.mjs` answering when asked
// does not satisfy it. An excuse must sit on a comment line of its own, because an excuse at the end of a one-line
// member's own line was silently excusing the member BELOW it.
const UNASKED = 'tools/look.mjs';
const lookApi = () => {
  const s = read(join(NEXUS, 'view/look.ts')), at = s.indexOf('const look = {');
  const lit = s.slice(at, at + s.slice(at).indexOf('\n};\n'));
  // every spelling an object member can take: `name: (`, `: async`, `: function`, `: <T>`, shorthand `name(`, and a
  // getter. Seven of eight spellings were invisible to the first version, which only matched `^  name: [(<]`.
  const re = /^[ \t]*(?:get[ \t]+)?([A-Za-z_$][\w$]*)[ \t]*(?::[ \t]*(?:async[ \t]+)?(?:function\b|[(<])|\()/gm;
  // a broadened reader matches `if (`, `for (` and `switch (` inside a member's own body, so the words a call can
  // never be are excluded by name — the one place a list is the right shape, because this is JavaScript's list.
  const KEYWORD = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'new', 'typeof', 'await', 'do', 'else', 'of', 'in', 'yield', 'void', 'delete', 'throw']);
  const names = [...lit.matchAll(re)].map((m) => ({ name: m[1]!, at: m.index! })).filter((n) => !KEYWORD.has(n.name));
  // the whole line immediately above the member, and only that one: an excuse at the end of a one-line member's
  // own line was silently excusing the member BELOW it (docs/MANNY.md #105)
  const prev = (i: number) => { const nl = lit.lastIndexOf('\n', i - 2); return nl < 0 ? '' : lit.slice(nl + 1, i - 1); };
  const out = names.map((n) => ({ name: n.name, excused: /^\s*\/\/.*nobody calls/.test(prev(n.at)) }));
  // a member added by `Object.assign(look, { … })` is defined on its own somewhere above, so its excuse lives there
  for (const m of s.matchAll(/Object\.assign\(look,\s*\{([\s\S]*?)\}\s*\)/g)) for (const tk of m[1]!.split(',')) {
    const nm = tk.trim().split(':')[0]!.trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(nm)) continue;
    const def = new RegExp(`(^|\\n)(// [^\\n]*\\n)?(const|function) ${tk.trim().split(':').pop()!.trim()}\\b`).exec(s);
    out.push({ name: nm, excused: !!def && /nobody calls/.test(def[2] ?? '') });
  }
  return out;
};

describe('every judge the picture owns speaks where a person meets it', () => {
  const unasked = read(join(ROOT, UNASKED));
  const asked = readdirSync(join(ROOT, 'tools')).filter((f) => /\.mjs$/.test(f) && f !== 'look.mjs').map((f) => read(join(ROOT, 'tools', f))).join('\n');
  it('every member of the page API is printed by the door that speaks unasked, or says why not', () => {
    const api = lookApi();
    expect(api.length, 'the page API could not be read, so this check would pass on an empty list').toBeGreaterThan(10);
    expect(api.map((a) => a.name), 'the member spellings the reader must see').toContain('landmarks');
    for (const { name, excused } of api) {
      if (excused) continue;
      expect(unasked, `window.look.${name}() is on the page and ${UNASKED} never prints it: a verdict only reached by asking for it is a verdict nobody asks for. Print it there, or write "nobody calls" on its own comment line above it with the reason.${new RegExp(`look\\.${name}\\s*\\(`).test(asked) ? ` (another tool calls it on request, which is not the same thing.)` : ''}`).toContain(`look.${name}(`);
    }
  });
  it('nothing is excused that the unasked door now prints, so an excuse cannot outlive its reason', () => {
    for (const { name, excused } of lookApi()) if (excused) expect(unasked, `window.look.${name}() says nobody calls it, but ${UNASKED} prints it: delete the excuse.`).not.toContain(`look.${name}(`);
  });
});

// A FIGURE QUOTED IN THE LEDGER NAMES THE COMMAND THAT PRODUCED IT. This is the one thing the retired critic agent
// did that nothing else could, kept as a rule instead of as an agent (docs/MANNY.md's retirement note).
//
// Over his last three passes he raised 14 findings, and **four were statements already written into ROUNDS.md as
// established fact** with 2,100 tests and 18 lint rules green over every one: a degrees-of-freedom number that was
// entirely an artefact of my own fallback and that the ledger then blamed on the data; "zero callers in tools/",
// written from a grep of two of eight tools; 21 floating bodies counted as motion; 348 of 605 parts never entering
// the graph. None of those is code. **They were sentences, and nothing in this tree read sentences.**
//
// A count cannot be verified statically — but a pasted block of numbers can be required to say where it came from,
// which is what makes it re-runnable by the next reader instead of quotable on trust. The faults this catches are
// already recorded: `npm run why` named in prose before it existed, `npm run --silent` quoted as if run, and three
// rounds whose output blocks nobody could reproduce without guessing the invocation.
//
// It is a RATCHET, like the other four, because the ledger already carries blocks that are hand-made tables rather
// than tool output (a predicted-against-measured column, a tally of what rules caught against what looking caught).
// Those are listed; the list may only shrink, and a new bare block fails by name.
const LEDGER_CODE = /=>|^\s*(?:const|function|export|import|it\(|expect\()/m;
const LEDGER_CMD = /\b(?:npm run [a-z:]+|node tools\/[\w.-]+|npx vitest|npx tsc|vitest run)\b/;
/** Blocks of figures in ROUNDS.md that name no command: hand-made tables, not tool output. Only ever shorter. */
const UNSOURCED: string[] = [
  "saw('room to slide', 0)",
  'declared      38     a part states a feature size',
  '4 wheels                        6 findings',
  'predicted   got',
  '4-rotor drone battery · camera · foot 1–4',
  'cited  critic.ts:246   as the `through` skip',
  'rules    2   critic.ts over its line ratchet',
  'all skipped →  FAIL (exit 0 but nothing ran',
];

describe('a figure quoted in the ledger says where it came from', () => {
  // THE LOG IS NOW SEVERAL FILES (Run 8g: ROUNDS.md was 3,181 lines, over half of it one stale section). The
  // citation discipline follows the content rather than the filename — splitting a file must not be a way to
  // escape the rule that every block of figures names the command that produced it.
  const ROUNDS = ['docs/ROUNDS.md', ...readdirSync(join(ROOT, 'docs/rounds')).sort().map((n) => `docs/rounds/${n}`)]
    .map((p) => read(join(ROOT, p))).join('\n');
  const blocks = () => {
    const lines = ROUNDS.split('\n'), out: { at: number; body: string; above: string; first: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*```/.test(lines[i]!)) continue;
      let j = i + 1;
      while (j < lines.length && !/^\s*```\s*$/.test(lines[j]!)) j++;
      const body = lines.slice(i + 1, j);
      out.push({ at: i + 1, body: body.join('\n'), above: lines.slice(Math.max(0, i - 6), i).join('\n'), first: (body[0] ?? '').trim() });
      i = j;
    }
    return out;
  };
  /** a block of figures: at least two lines carrying a number, and not a code sample */
  const figures = () => blocks().filter((b) => b.body.split('\n').filter((l) => /\d/.test(l)).length >= 2 && !LEDGER_CODE.test(b.body));

  it('every block of figures in ROUNDS.md names the command that produced it, or is on the list', () => {
    const all = figures();
    expect(all.length, 'no blocks of figures found at all, so this check would pass on nothing').toBeGreaterThan(8);
    const bare = all.filter((b) => !LEDGER_CMD.test(b.body) && !LEDGER_CMD.test(b.above));
    const unlisted = bare.filter((b) => !UNSOURCED.some((u) => b.first.startsWith(u)));
    expect(unlisted.map((b) => `docs/ROUNDS.md:${b.at}  ${b.first.slice(0, 60)}`), 'a pasted block of figures with no command beside it cannot be re-run by the next reader, which is how four wrong numbers survived three rounds and a green gate. Name the command, or add it to UNSOURCED with the reason it is not tool output.').toEqual([]);
  });
  it('every UNSOURCED line still matches a bare block, so a fixed one cannot linger on the list', () => {
    const bare = figures().filter((b) => !LEDGER_CMD.test(b.body) && !LEDGER_CMD.test(b.above));
    for (const u of UNSOURCED) expect(bare.some((b) => b.first.startsWith(u)), `UNSOURCED names "${u}" and no bare block in ROUNDS.md starts with it: delete the line`).toBe(true);
  });
  it('every command a ledger block cites can actually be run', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as { scripts: Record<string, string> };
    const named = new Set<string>();
    for (const b of blocks()) for (const m of `${b.above}\n${b.body}`.matchAll(/\bnpm run ([a-z:]+)|\bnode (tools\/[\w.-]+)/g)) named.add(m[1] ? `script:${m[1]}` : `file:${m[2]}`);
    expect(named.size, 'the reader found no commands, so it is checking nothing').toBeGreaterThan(2);
    for (const n of [...named].sort()) {
      if (n.startsWith('script:')) expect(Object.keys(pkg.scripts), `docs/ROUNDS.md cites \`npm run ${n.slice(7)}\`, which is not a script: a command named in prose and never run is how "npm run why" got quoted before it existed`).toContain(n.slice(7));
      else expect(existsSync(join(ROOT, n.slice(5))), `docs/ROUNDS.md cites \`node ${n.slice(5)}\`, which does not exist`).toBe(true);
    }
  });
});

describe('nothing is written twice', () => {
  it('the set of repeated code fragments is exactly the set written down', () => {
    const where = new Map<string, string[]>();
    for (const f of FILES) {
      read(f).split('\n').forEach((raw, i) => {
        for (const frag of fragments(raw)) {
          if (!where.has(frag)) where.set(frag, []);
          where.get(frag)!.push(`${relative(NEXUS, f).replace(/\\/g, '/')}:${i + 1}`);
        }
      });
    }
    let found = [...where].filter(([, w]) => new Set(w.map((x) => x.split(':')[0])).size >= 2);
    // only the longest of a nest: `d = Number(p.d ?? 12.73)` inside `loop = …, d = Number(p.d ?? 12.73)` is one fault
    found = found.filter(([k, w]) => !found.some(([k2, w2]) => k2 !== k && k2.includes(k) && w2.length >= w.length));
    const said = found.map(([k, w]) => `${k} :: ${w.join(' ')}`).sort();
    expect(said, 'a fragment in two files is one rule with two owners: give it one and import it, and never widen the reader to make this pass').toEqual([...DUPES].sort());
  });

  it('every line written down is well formed, so a stale one cannot hide', () => {
    for (const d of DUPES) {
      const [frag, w] = d.split(' :: ');
      expect(frag, `${d} has no fragment`).toBeTruthy();
      for (const at of w!.split(' ')) expect(existsSync(join(NEXUS, at.split(':')[0]!)), `DUPES names ${at}, whose file does not exist`).toBe(true);
    }
    expect(new Set(DUPES).size, 'DUPES has a duplicate line').toBe(DUPES.length);
  });
});
