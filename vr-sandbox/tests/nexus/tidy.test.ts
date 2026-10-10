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
//   5. **A layer that reaches back up.** `world/` importing `view/` once puts the whole viewer inside a cycle with
//      everything the world touches, and nothing in the build complains.
//
// Three of the five are ratchets, not pass/fail gates, because this tree already carries the debt and a gate that
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
  { file: 'src/nexus/view/forge.ts', max: 4050, into: 'the room, the asking, the phone, the benches and the pipeline player are five concerns in one file; the benches already moved out, the rest have not' },
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
const CLASHES: string[] = [
  'ABILITIES :: ask/abilities.ts machines/fleet.ts',
  'AIR :: machines/craft.ts substrate/sizing.ts',
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
  'E24 :: kinds/core.ts parts/catalogue.ts',
  'ELECTRICAL :: book/electrical.ts kinds/electrical.ts',
  'FAMILIES :: parts/families.ts works/families.ts',
  'Frame :: machines/machines.ts machines/meca.ts make/critic.ts substrate/field.ts substrate/frame.ts',
  'G :: machines/craft.ts world/places.ts',
  'Gap :: substrate/manifold.ts substrate/runtime.ts',
  'Group :: substrate/abduce.ts substrate/sizing.ts',
  'HANDS :: machines/kit-solder.ts machines/robot.ts',
  'HAZARDS :: machines/craft.ts machines/instruments.ts',
  'INFORMATION :: book/information.ts substrate/carrier.ts',
  'Invariant :: substrate/scale.ts substrate/tuner.ts',
  'Kind :: ask/conceive.ts ask/generate.ts life/graph.ts parts/inventory.ts substrate/manifold.ts substrate/tuner.ts world/coaster.ts',
  'LINKS :: machines/link.ts substrate/lawgraph.ts',
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
  'Station :: machines/cell.ts machines/form.ts works/stations.ts',
  'Step :: embody/embody.ts machines/processor.ts substrate/attempt.ts substrate/depth.ts substrate/flows.ts substrate/tune.ts teach/lessons.ts teach/solder-lesson.ts',
  'Structure :: substrate/manifold.ts substrate/tuner.ts',
  'TOOLS :: kinds/tools.ts machines/robot.ts',
  'Task :: machines/fleet.ts machines/robot.ts',
  'Term :: substrate/atlas.ts substrate/term.ts substrate/understand.ts',
  'Thing :: substrate/realize-space.ts teach/edges.ts teach/solder-lesson.ts',
  'Track :: world/coaster.ts world/karting.ts',
  'Tube :: machines/form.ts machines/instruments.ts',
  'UNIVERSAL :: book/universal.ts substrate/carrier.ts',
  'V3 :: ask/generate.ts embody/part.ts machines/form.ts machines/surface.ts parts/kits.ts parts/pieces.ts substrate/adapt.ts substrate/foldtree.ts teach/solder-lesson.ts world/anatomy.ts world/coaster.ts world/games.ts world/pingpong.ts',
  'Verdict :: ask/abilities.ts substrate/attempt.ts substrate/observe.ts works/can.ts',
  'View :: substrate/boards.ts substrate/contact.ts view/phone.ts',
  'Want :: ask/conceive.ts ask/want.ts works/can.ts',
  'advance :: substrate/clock.ts world/pingpong.ts',
  'boxOf :: embody/part.ts parts/pieces.ts',
  'breakdown :: parts/breakdown.ts substrate/lawgraph.ts',
  'buildSteps :: embody/tree.ts teach/solder-lesson.ts',
  'canDo :: ask/abilities.ts machines/robot.ts',
  'choose :: parts/kits.ts substrate/study.ts',
  'classOf :: make/detail.ts works/lines.ts',
  'compare :: ask/outputs.ts substrate/observe.ts substrate/pipe.ts',
  'component :: machines/cell.ts parts/components.ts',
  'contacts :: embody/tree.ts make/space.ts',
  'densityOf :: substrate/derive.ts substrate/solid.ts',
  'derive :: substrate/boards.ts substrate/space.ts',
  'describe :: substrate/manifold.ts view/brain.ts',
  'evaluate :: substrate/evaluate.ts substrate/flows.ts',
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
  'layout :: make/space.ts substrate/boards.ts',
  'leavesUnder :: substrate/lawgraph.ts substrate/why.ts',
  'linesOf :: kinds/core.ts machines/link.ts',
  'massOf :: ask/outputs.ts parts/mass.ts substrate/derive.ts',
  'matOf :: ask/generate.ts kinds/core.ts',
  'matterOf :: ask/generate.ts embody/inside.ts',
  'measured :: parts/fits.ts substrate/lawgraph.ts',
  'meltingPoint :: machines/lab.ts substrate/melt.ts',
  'observe :: substrate/scale.ts substrate/study.ts',
  'plan :: parts/inventory.ts substrate/clock.ts',
  'plateFor :: machines/craft.ts parts/fab.ts',
  'principlesOf :: embody/taxonomy.ts substrate/lawgraph.ts',
  'profileFaults :: parts/fab.ts substrate/derive.ts',
  'project :: substrate/channel-text.ts substrate/project.ts',
  'rank :: substrate/network.ts substrate/status.ts',
  'reach :: substrate/atlas.ts substrate/tuner.ts',
  'readConditions :: ask/conditions.ts make/conditions.ts',
  'resolve :: parts/inventory.ts substrate/understand.ts',
  'search :: ask/outputs.ts substrate/solve.ts',
  'shapeOf :: substrate/derive.ts substrate/lawgraph.ts substrate/shape.ts works/lines.ts',
  'solve :: substrate/lawgraph.ts substrate/solve.ts',
  'stale :: substrate/tune.ts substrate/why.ts',
  'step :: substrate/lawgraph.ts teach/solder-joint.ts',
  'termsIn :: substrate/census.ts substrate/understand.ts',
  'tune :: substrate/channel-text.ts substrate/tune.ts',
];

/** The tree's intended shape, most depended upon first: the laws, then the engine over them, then the parts library,
 *  then the boards and machines made of parts, then the catalogues of them, then what reads an ask, what makes,
 *  simulates and teaches, and last what draws. An import that runs the other way is a layer reaching up into one that
 *  should depend on it, which is a cycle as soon as anything answers back. Every one is written down below. */
const LAYERS = ['book', 'substrate', 'parts', 'boards', 'machines', 'models', 'kinds', 'ask', 'embody', 'make', 'life', 'world', 'teach', 'works', 'view', 'cli', '(root)'];

/** Where the tree reaches back up today, with the count as a ceiling. These are 23 lines, not 23 problems: four
 *  causes account for 63 of the 108 imports, and each has a named fix.
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
  { edge: 'book -> substrate', imports: 21, why: "the laws are written in the engine's own vocabulary (Term, Law, evaluate), which belongs below both" },
  { edge: 'parts -> machines', imports: 20, why: 'components.ts draws every kind, so it imports every drawer: a registry inside the library it registers' },
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
  { edge: 'parts -> make', imports: 2, why: "kits and the registry lay out by make/space's oriented boxes: a geometry primitive in the wrong directory" },
  { edge: 'substrate -> life', imports: 2, why: 'derive reads molecules and lifetimes' },
  { edge: 'ask -> world', imports: 1, why: 'route sends an ask for a place to world/places' },
  { edge: 'boards -> kinds', imports: 1, why: "sbc reads a chip case's figures from kinds/electrical" },
  { edge: 'machines -> ask', imports: 1, why: "vehicle.ts says a vehicle's wants in ask/want's words" },
  { edge: 'machines -> make', imports: 1, why: 'machines.ts lays its panels out by make/space: the same primitive in the wrong directory' },
  { edge: 'machines -> models', imports: 1, why: 'franka.ts reads its own measured sections' },
  { edge: 'parts -> embody', imports: 1, why: "the registry reads embody/stock's cells" },
  { edge: 'parts -> world', imports: 1, why: 'pieces.ts reaches into the anatomy' },
  { edge: 'substrate -> teach', imports: 1, why: 'flows.ts names the languages a step can be written in' },
  { edge: 'world -> view', imports: 1, why: "games.ts takes the dartboard and its scoring out of the viewer, and a game's rules are the world's: this one is simply the wrong way round" },
];

describe('the tree keeps its shape', () => {
  it('nothing loose at the root: every file is inside a boundary', () => {
    const loose = readdirSync(NEXUS).filter((n) => n.endsWith('.ts')).sort();
    expect(loose, 'a new file at the root means its concern has no home yet — give it one').toEqual(['index.ts', 'works.ts']);
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
    const where = new Map<string, { file: string; kind: string }[]>();
    for (const f of FILES) {
      for (const m of read(f).matchAll(/^export\s+(?:async\s+)?(const|let|var|function|class|enum|interface|type)\s+([A-Za-z_$][\w$]*)/gm)) {
        const at = relative(NEXUS, f).replace(/\\/g, '/');
        where.set(m[2]!, [...(where.get(m[2]!) ?? []), { file: at, kind: m[1]! }]);
      }
    }
    const found: string[] = [];
    for (const [name, all] of where) {
      const files = [...new Set(all.map((a) => a.file))].sort();
      if (files.length < 2) continue;
      const dirs = files.map((f) => (f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '(root)'));
      const sameDir = dirs.some((d, i) => dirs.indexOf(d) !== i);
      const isValue = all.some((a) => a.kind !== 'interface' && a.kind !== 'type');
      if (sameDir || isValue) found.push(`${name} :: ${files.join(' ')}`);
    }
    const known = new Set(CLASHES), now = new Set(found);
    const added = [...now].filter((c) => !known.has(c)).sort();
    const gone = [...known].filter((c) => !now.has(c)).sort();
    expect(added, 'a new name in two places: find the one owner and import it, or give one of them the name of what it actually is').toEqual([]);
    expect(gone, 'these clashes are fixed — delete their lines from CLASHES so the list keeps shrinking').toEqual([]);
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
    const sources = [...FILES, join(ROOT, 'CLAUDE.md'), ...walk(join(ROOT, 'tests'))];
    for (const f of sources) {
      if (!existsSync(f)) continue;
      for (const m of read(f).matchAll(/src\/nexus\/[\w./-]*\.ts/g)) {
        const p = m[0]!.replace(/[.,;:)]+$/, '');
        if (!existsSync(join(ROOT, p))) bad.push(`${rel(f)} names ${p}, which does not exist`);
      }
    }
    expect([...new Set(bad)].sort(), 'a path in prose goes stale the moment a file moves, and nothing else catches it').toEqual([]);
  });

  it('every npm script CLAUDE.md names is in package.json', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as { scripts: Record<string, string> };
    const named = [...read(join(ROOT, 'CLAUDE.md')).matchAll(/`npm run ([\w:-]+)/g)].map((m) => m[1]!);
    for (const s of [...new Set(named)].sort()) expect(Object.keys(pkg.scripts), `CLAUDE.md names \`npm run ${s}\`, which package.json does not have`).toContain(s);
  });
});
