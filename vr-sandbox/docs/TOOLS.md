# The tools built for this work

Every one of these was a step worked out by hand twice and then made into a tool. When that happens again, the tool
goes here and a line goes in CLAUDE.md's index.

The measuring tools live in `tools/measure/` (Python 3 with numpy, opencv-python-headless, scipy and pillow:
`pip install -r tools/measure/requirements.txt`):
- `photo.py`: calibrate a photo by known points, its mm grid, where a pixel is, part outlines, the drawn layout over the
  photo, and `same`: one region of the thing cut from every calibrated photo of it, side by side. `small`: every small
  part a board's photo shows (tan ceramic bodies and dark bodies found in two masks so a shadow does not join them; each
  blob eroded until it is one part; capacitors and resistors put to their EIA case by width, a resistor only with tin
  past its ends, SOT-23 or SOT-323 by body length and their legs counted, moulded inductors near square; what is like
  none of these listed, not guessed), `--ts` writing the board's table (`sbc-opi5-small.ts`), `--why X,Z` saying how
  the blob at a point was taken or why not, `--skip` for a logo; its mask told by the board's own hue and tin as far
  paler than it (a green board as well as a blue), two pale ends 0.45 or 0.75 mm apart paired into an 0201 or 0402,
  `--silk` to leave the ink out, `--keep` a picture of where it looked, `--tins` the lone ends it saw. `silk`: the
  silkscreen (pale grey ink, saturation under 45 and value over 215 or `--val`, a tin end's solid blob dropped) as a
  bilevel PNG with `--ts`, and the ink's colour; `--skip X0:Z0:X1:Z1` blanks a box (a part's tin read as ink). `traces`: the copper under the mask, its mask's hue read off the board, and the
  bare mask's and copper's colours printed. The camera is recovered from each calibration as a rigid pose (solvePnP),
  its lens from the homography or, given `calibrate --tall PX,PY=X,Z,Y` (points of known height: a pin's tip, a jack's
  top corner), the lens that puts them where they are seen; with three holes and such points the plane itself comes
  from the camera they fit (a fourth hole hidden), and a point given as `=X,Z!` is not pulled onto a pad: `at PX,PY@H`
  reads a point on a top H mm up, and every part hides what its solids' corners, each at its own height (the
  boardmap's `pts`), cover when seen along the camera's rays. `camera`: that camera as the look page's query (`cam`,
  `aim`, `up`, `fov`; render at the photo's size with `LOOK_W`/`LOOK_H`, `--top` the look page's `lift`), so the
  drawing is rendered as the photo saw it, with a calibration for the render: then `same` on the photo and the render
  sets every part beside itself, and `colour` (`X,Z@Y` a place Y mm up) reads the same places in both and the colour
  to draw to match. A feature on a part's face (a spring lanced in a shell, a seam) is measured by casting its pixel's
  ray onto that face's plane. Tools for reading a part off a photo by its camera: `px X,Z@Y` (where a point Y mm up is
  seen), `rise FX,FY:TX,TY` (how tall an edge stands, from its foot and its top), `wall CAL y=H|x=X|z=Z LO1:HI1:LO2:HI2`
  (a millimetre grid on a part's top or side plane over the photo), `mark CAL X,Z@Y …` (guessed corners and edges,
  ranges `X0:X1,Z@Y`, drawn over the photo: a guess checked by eye) and `same --edges` (a render from the photo's own
  camera, its edges drawn over the photo: every edge that is not where the photo has it shows). A circle (a jack's
  bore) is fitted to its ellipse in the photo through the camera; its size does not fix how far along the ray it is,
  so hold one coordinate (a drawing's centre) or match a second feature. `small --why X,Z` names what hides a point
  (the part, its shadow, a word, the ink, a hole or a skip) or the mask its colour falls in; the small parts it placed
  before are not counted as drawn; a blob is left out for the ink only where it is ink with no tan body; tin is told
  from a tan body by its greyness as well as its brightness. Where a photo is too soft for it, its parts are read by
  eye off the photo at its own size (a native-pixel grid), located through the camera at their tops' height, and
  kept beside the finder's rows (`PI4_HAND`), the finder skipping that region. `rectify CAL y=H|x=X|z=Z
  LO1:HI1:LO2:HI2 --ppmm --blobs dark|bright --edge --both`: a part's face warped square-on through the camera, a mm
  grid on it, its cuts, slots and ribs listed as mm boxes; run on a render's calibration too and the two lists are
  what the model has wrong. A plane a little off the true face, or a camera fitted far from that part, shifts all it
  reads alike: read features against the face's own edges, and the camera's error at a known hole near it.
- `step.py`: a maker's STEP model read with gmsh: `boxes` (every solid's box on the board's drawing frame, top or under)
  and `check` (each drawn part against the solid it should be, coverage both ways).
- `npm run part -- "<words>"`: **what the library makes of one part's words**, printed — the id and kind, the mass both
  as the inventory declares it and as the drawing actually weighs (the two disagreeing is the finding), the box, what
  it is made of with each child's mass, what its drawing is missing against its own inventory list (`missingIn`), and
  the cheapest real offer with the page and the day it was read. Where the words are refused, the refusal IS the
  answer and is printed whole. `--like "<words>"` lists the catalogue lines nearest them.
  It exists because this was the one question with no door: checking whether a worm reducer is in the library meant
  bundling `src/` with esbuild and calling `catalogue()` by hand in a scratch directory (docs/MANNY.md #48).
- `node tools/doors.mjs`: **every door into this project**, what each opens (from its own file header), and when it was
  last touched, newest first; `--cold` prints only the ones nothing has opened in longest. A critic judged one door
  five runs running and had never opened `teach/`, `life/` or the forge room — not from choosing badly, but because
  nothing anywhere said what there was to look at (docs/MANNY.md #33). Last-touched is a proxy for attention, not for
  quality: a door nobody has changed may be finished or forgotten, and the point is to see which ones they are.
- `tools/manny-see.mjs`: **the critic's eyes**, and the first thing to reach for when a round is about to say "I could
  not see it". One command gives the two halves a judgement needs, together: the NUMBERS (every door that really takes
  words, run on the same ask — `machine.mjs` composed from the library, `invent.mjs` for what the intent pipeline heard
  and what it could not use, `plan.mjs` fed the words as a sketch — each one's refusals kept rather than swallowed) and
  the PICTURE (the viewer built, the look page opened from the views that expose fakery rather than flatter: `three`
  what a person sees first, and `explode` whether it comes apart into real parts or is one lump wearing a name).
  It prints the PNG paths, and
  **the `Read` tool shows a PNG as a picture**, so they are really looked at — and it prints `it drew: <name>` beside
  them, raising `*** THE RENDER IS NOT OF YOUR ASK ***` when the library could not make the words and drew its
  family's example instead, which it used to do in silence. A cutaway (`--views cut`) is NOT among the default views:
  the clipping works but no rule yet chooses the plane on a part with a long thin appendage, so it can render a thing
  uncut and read as "solid" (docs/MANNY.md #34), and it says so when asked for.
  Under every picture it prints **the pieces in frame**, counted by name with their sizes and materials
  (`tools/look.mjs --list`, which calls the page's own `window.look.parts()`). Without it a reader can see a thing
  come apart and still not name one piece, so cannot tell a complete explode from one missing half its parts.
  `node tools/manny-see.mjs "<words>"` · `--numbers` (figures only, no browser) · `--part` (the words name a library
  part) · `--views three,top,explode,cut` · `--out <dir>` (default `/tmp/manny-see`).
  It only hands a door the input that door takes — `works.mjs` wants a build id, `plan.mjs` a sketch on stdin — and
  says so where it skipped one, because a stack trace reads like a refusal and is not one. Everything it could not do
  (a build that failed, a view that did not render) it says as the failure it was: a tool that quietly shows less than
  it promised is worse than none, because the critic then reports on what he thinks he saw. **Known gap it names
  itself:** there is no door that prints one library part's figures (mass, size, interfaces, what it contains), so
  `--part` is the picture only.
- `npm run part -- --audit`: how much of the library the two-mass check can actually check, over BOTH populations —
  every inventory item and every catalogue family at one example line — in four classes: not drawn (the check is
  silent), summed from its solids (a real check), the drawing declares its mass, and its fill solved back from a
  published mass (the last two being the same number printed twice). It ranks the least independent figures and, in
  the same pass, every item whose declared mass is less than the parts its own `of` names, worst ratio first. It
  exists because a critic could sample 29 families by hand and raise a finding, and nobody could size it: the answer
  is 92.1 % of items and 70.6 % of families not drawn at all (docs/MANNY.md SIGHT #55). Asking by id alone misses a
  drawing a maker file registers only when asked by words, so it tries both and prints how many the second door found.
- `npm run why -- --kit <id> "<words>"`: every finding on what those words make, grouped by cause and attributed to
  the part that owns it — each check with its share, the parts under it, the distinct things they say, the exact
  **drawn / declared ratios** where a finding compares a stated figure with a drawn one, and last the checks that
  looked at NOTHING. It exists because the same throwaway probe was written by hand five times in one session; those
  probes found that 92 % of a car's findings were two checks, that eight of sixteen came from one cast housing, and
  that thirty-eight `declared` findings fall on exactly three ratios (1.26, 0.6, 1.2) — one sizing bug, not
  thirty-eight broken parts. A repeated ratio is one bug; a spread of them is many.
  **It refuses to guess a kit**: no kit named in the words means no answer, because that default is how "the critic is
  silent" was reported twice, and the first run of this very door drew an end cap for a 2020 profile.
- `tools/verdict.mjs`: wraps a check so its LAST LINE is its verdict — `TIDY: PASS (16 of 16 ran) — 1.8s`,
  `GATE: FAIL (exit 1) — 182.3s`, `TYPECHECK: PASS (no work counted) — 3.3s`. The VERDICT comes from the exit status
  alone, never from the child's own words; the COUNT comes from a JSON report written to a path the wrapper names and
  deletes first, so a stale count cannot be read as this run's. Takes several commands separated by `--` and stops at
  the first failure, so a chain needs no shell and no second script holding the real command.
  It exists because `npm run tidy 2>&1 | tail -3` once reported a pass while the gate failed on the same rule: a pipe
  replaces the exit status, so the check could not fail at any truncation. Banning the pipe would ban a spelling
  (`> file; tail file` has none and fails the same way); this removes the cause. **No verdict line is not a pass, it is
  no answer** — a log cut from the top, a killed run or a crashed wrapper prints none.
  `tidy` asserts that every script running a verifier is wrapped and that every test run carries a count;
  `tests/nexus/verdict.test.ts` pins the wrapper's own six behaviours, since every check now speaks through it.
- `tools/look.mjs`: render any ask from named views (`node tools/look.mjs <viewer dir> <out dir> "name|words=…&view=…"`;
  `kit=machine` draws what `npm run machine` composes — the same units, bill and refusals, from the ask's own sentence
  (`"rail|kit=machine&words=a rail-mounted machine that picks things up over 2000 mm carrying 25 kg&view=three"`),
  where `kit=part` (the default) draws one component by its words; a view that looks all but straight down or up (`top`, `under`) is squared — its camera's up is ∓z, not the degenerate roll three.js picks when up is nearly the way it looks, which had turned every plan view 45°;
  `ortho=1` for a view to set beside a photo, `exposure=`, `env=`, `sun=`, `tone=aces` to try the light; it prints the
  part's `lift`; the light tent's `back=` (a backdrop as bright as the photo's studio had it), `floor=rrggbb` (what it
  stands on), `probe=1` (each metal face's reflection captured from where it stands, itself left out, box-projected:
  a socket's mouth dark inside as photographed; each plate (two sizes over `probeown=` mm, 4 by default, the third a
  millimetre or less) its own, a shield bent round a part sharing its part's; a board in about 90 s on software GL:
  `LOOK_WAIT=` ms for longer); `ao=` mm, screen-space occlusion, does not darken
  a mouth yet and drops the sun's shadow: not to be trusted); `npm run boardmap -- <id> <out.json>` writes a board's drawn outlines for `photo.py overlay`.
  Under each picture it prints what the critic said (open defects first, at most three per check, since the first
  version printed twelve identical `walls … thickened` lines and a reader never reached a real fault), the
  interface verdict (`contracts`), and **which checks looked at nothing in it** — the difference between "it is
  fine" and "nobody asked" (src/nexus/make/critic.ts's `Looked`).
- `tools/forge-run.mjs`: a script of moves played in the forge with screenshots along it (`js:` an expression in the page,
  awaited; `say:` words; `wait:`; `shot:`; `view:`; `png:name|expr` a picture the page makes, as `phonePeek('life',
  'map')` gives any phone app's screen; each answer printed to 400 characters, `FORGE_OUT=` for more, `FORGE_SHOT_MS=`
  for a slow close view), `FORGE_Q=xr=quest3` for an emulated Quest 3 whose hands the hooks
  move and press: how the soldering lesson is played through by hand and checked.
- `tools/forge-look.mjs`: the forge room as the user stands in it, what is asked stood before you as "3d <words>" does
  (`"name|words|key=…&sky=…&env=…&lamp=…"` to try its light): a part judged in the room it is seen in, not only on
  the look page's bench.
- `xml3d.py`: a maker's 3D assembly in 3DXML (SOLIDWORKS and CATIA export it; Creality's Ender-3 is published so): `tree`,
  `parts` (every part's world matrix, its box in its own frame and the world's, its surface's middle, how much of each box
  face its surface covers: its triangles, strips and fans read per rep), `count` (its bill of materials) and `ts` (the
  data file `makermodel.ts` draws from). Read in place: a 3DXML is a zip, nothing extracted.
- `stepasm.py`: a maker's 3D assembly in STEP (AP203/AP214: Fusion 360, SOLIDWORKS, Onshape, FreeCAD; the Voron's is
  published so), read straight from its entities, no CAD kernel (gmsh's OCC import of the Voron's 241 MB ran 25 min
  without finishing; this reads it in 50 s): the same `tree`, `parts`, `count` and `ts` as xml3d.py, each part's box
  from its edges walked along their curves (lines, circles and ellipses by angle, B-splines by de Boor), a sphere cap's
  pole added, its cover from its flat faces' areas, its material, density and look (appearance name and colour) from
  the model, the assembly it is in; `--drop REGEX` leaves an instance and all under it out (a model's alternatives:
  one option built), `--whole REGEX` measures an assembly as one part (a carriage, a board), `--no-outline REGEX` writes no outline for
  the parts the library draws (its fasteners, rails, motors: a smaller file). Each part's outline (`outline`): its
  edges' convex hull along whichever of its axes shows it least like its box, 20 corners at most. The Voron's options
  are in the header of `models/voron24.ts`; rerun the same command to regenerate.
- `meshloft.py`: a closed mesh (an STL) measured as loft stations (`fr3_ts.sh` regenerates the FR3's): cut across an axis every so many mm, each section's
  bottom and top one way, its half-width and middle the other, and how square it is (the superellipse exponent whose
  area in that box is the section's own; a faceted round no less than an ellipse); `--clip` keeps one piece (an axis,
  < or >, a value: an L-shaped part's arms, or where its maker's colours change), `ts` writes the data file (the FR3's
  is `models/fr3.ts`: the commands are in the header of its generator, rerun to regenerate). Sizes measured, no
  triangles copied.
- `views.py`: every photo on one sheet; one photo in full-size tiles to scan; a zoom; `find`: a part boxed in one photo
  found in the others by its features (says "not found" rather than guess when the views differ too much: then
  calibrate each photo by four points of the same plane and use `photo.py same`).
- `kicad.py`: a part's drawing from KiCad's footprints, with the datasheet it was drawn from.
When a step takes working out by hand twice, it becomes a tool here, and a line in this list.
- `npm run machine`: a machine composed from the library and printed — `npm run machine -- units` lists every unit the
  library affords with its mass, its price and what limits it; `npm run machine -- "a machine that cuts 400x300x80" works`
  composes it and throws its bill at the $3,000 works. Written the same round it was needed, for the same reason as
  `npm run works`: the alternative was a probe test that prints what the engine says and is then deleted.
- `npm run plan -- <file> works`: an invention sketched as labelled blocks and pins, printed, weighed and thrown
  at the works before anything in it is designed (`src/nexus/ask/sketch.ts`).
- `npm run perf`: the measuring and proving tool, which is the fifth probe-test-and-delete in one day made into a tool.
  `perf time` is every test file's own time, longest first, and the ten slowest tests; `perf profile <test file>` is a
  sampled profile from inside the worker (vitest's workers swallow `--cpu-prof`, which profiles the runner and comes out
  96 % idle in module loading), printed by self time; `perf bench [case]` runs a fixed workload three times and keeps
  the least, because this host's wall clock swings a fifth run to run and the least of several is the only number worth
  quoting; `perf dump [case]` prints every number a generator makes as one hash a case, which is the proof a refactor
  changed nothing — run it, change the code, run it again, and no line may differ; `perf dump <case> --full` prints the
  numbers themselves, to find which one moved. `src/nexus/cli/perf-main.ts` holds the benches and the dumps,
  `tools/perf.mjs` the two halves that run vitest, `tests/perf-setup.ts` the profiler (inert unless asked for).
- `npm run works`: a plan, a budget or a build printed from the command line. Four rounds in a row opened by writing a probe
  test whose only job was to print what the engine says, and then deleting it; this is that, kept.

## `npm run moves` — what moves, how far, and what its sweep needs

```
npm run moves -- --kit car "a small hatchback"
npm run moves -- --kit car --part "wheel|damper" "a small hatchback"
```

Every moving part with its range of motion and the edges round it: what it is connected to, what it moves within,
what constrains it, what force it passes on, and the envelope its sweep needs kept clear of anything not carried with
it. Then the whole mechanism through `mobility()` (`src/nexus/parts/mechanism.ts`), which before this door had no
caller outside its own unit test.

It will not give a degrees-of-freedom number over an axis it made up. A joint's axis comes from a declared slide
direction, or from the one axis a solid of revolution has by construction; anything else is left out of the count and
listed, with the count of what was left out printed *before* the count of what was computed. `npm run why` prints the
one-line version of the same thing unasked.

**It reads the far end off the drawing when the part does not name one.** `joins` is written by hand and mostly is
not: of a car's 56 jointed parts, **none** names a link across its joint, so on declarations alone the tool could
build no mechanism at all — honest, and useless. `space.ts:contacts()` finds what meets what over the layout this
already walks (605 nodes, 1,324 contacts, 58 ms), and a bearing's far end is the thing it MEETS in another link.
That took the car from **0 usable joints to 43 of 56**, and its floating bodies from 21 to 3.

Each joint says which of the two gave it its far end — `43 of 56 joints (0 named, 53 from touching)` — because a
joint whose other end the part itself names is worth more than one read off geometry, and a reader who cannot tell
them apart cannot weigh the count. The contact taken is the **nearest** one, not the first: taking the first
touching part in another link married a right-hand CV spider to the left-hand drive shaft.

Its numbers are pinned exactly by `tests/nexus/moves.test.ts` — 56 declared, 43 usable, 53 from touching, 3 floating,
66 movers — and moved by hand with a ledger line, because a floor once hid a fabricated answer for a whole round.

## `node tools/unwired.mjs` — what is built and cannot be reached

```
node tools/unwired.mjs              the census
node tools/unwired.mjs mobility     one export, or one file
```

Walks the module graph from the real entry points — `src/nexus/cli/*.ts` and `src/nexus/view/*.ts` — and reports
every export no running path arrives at: **test-only** (named by nothing but `tests/`, which is finished work with no
door) and **dead** (named nowhere at all), plus whole files no door reaches.

It is the measurement that would have found `mobility()` four rounds before Run 7r did. A passing test is
indistinguishable from a working feature when the test is the only caller, and nothing in the gate can tell them
apart — so the gate stayed green over a degrees-of-freedom solver nothing could run.

It counts **imports, not words**, and walks side-effect imports (`import '../world/creatures'`) as well as `from`
ones. Both of those were faults in its own first drafts, each found by checking its answer against a case whose
answer was already known: it called `mobility` live on the strength of the string `'mobility'` in a comment, and
called `world/creatures.ts` unreachable because the import that runs it has no `from` clause. A census only earns
belief by being checked against what is already certain.

## `npm run substrate` — the Nexus engine's only door

```
npm run substrate                  every slice: the beam, the bracket, the swinging bar
npm run substrate -- beam          one of them
```

Runs each slice of `src/nexus/substrate/` end to end and prints its verdict: how many symbols its system bound, how
many it left free, whether every constraint holds or one cannot be decided, and what its choice came to out of the
catalogue. Before this existed, **no entry point reached any of those twenty files** — `node tools/unwired.mjs` found
the whole directory unreachable, so every export in it was finished work only its own test could run.

It starts no Jolt (that lives in `tests/conformance/helpers`), so a realization is reported as not attempted rather
than as absent. Eleven `substrate/` files are reachable through it; eleven more are not, and they are named in
`docs/ROUNDS.md` Run 7s rather than quietly left out.

## `npm run cite` — re-runs what the ledger cites, and checks its figures still come out

```
npm run cite              every citation it can run
npm run cite -- --list    what it would run, and what it cannot
npm run cite -- moves     only citations whose command matches /moves/
```

`tidy`'s claim rule makes a block of figures in `ROUNDS.md` name the command that produced it. That catches a
**missing** citation. It does not catch a **wrong** one — and that hole was proved on its author within the hour:
Run 7w's first draft cited `node tools/unwired.mjs` for numbers a deleted probe had produced, and the lint accepted
it because a command was present.

So this runs them. For each cited block it takes out the figures (two digits or more — a version or a line number is
not a measurement), runs the command, and says whether those figures are still in its output: `holds`,
`DRIFTED` with the figures that are gone, or `SKIP` with the reason (a placeholder only a person can fill, a probe
the ledger says was deleted, nothing of two digits to check).

**A block the ledger itself marks historical is not drift.** An old round's numbers are *supposed* to differ from
today's — that is what a ledger is for — so a note like *"Run 7t and 7u changed them"* reads as `historic`. Without
that it would cry on its ordinary path, which is the fault that teaches a reader to ignore the tool.

It is a **door and not a gate**: these take minutes and one needs a browser, so in `npm run gate` it would make the
gate unusable and the rule would be deleted inside a week. The gate holds the cheap half (a command is named, and it
exists); this holds the expensive half, run when a round quotes figures it wants trusted.

Its first run found a real one: Run 7w's own block said **19** rigid bodies where the command says **24** — a figure
typed into a block presented as output, in the first entry written after the lint that was supposed to stop exactly
that.

## `node tools/cost.mjs` — what a door actually costs, in three legs

```
node tools/cost.mjs                                 the moves door on the car
node tools/cost.mjs --door why --words "a drone"    any door, any ask
node tools/cost.mjs --runs 3                        median of n runs per leg
```

Run 7x nearly spent a day caching the bundle every door rebuilds, on a figure ("30–60 s") carried in its author's
head from nothing. Timing it took ninety seconds. So the timing is a command now, and it reads the door's **own npm
script** rather than a command typed into the tool — split on `&&`, the last leg is the door's work and the rest is
what it pays to get there — so it goes on measuring the truth after the scripts change.

It prints the cold build, the rebuild with nothing changed, the door's own run, the build's share of a second run,
and what skipping the build could save, against the **10% floor** it judges by: under that, the saving is inside this
host's run-to-run swing. Stating the floor is the point — Run 7x's "not worth it" was a feeling about a saving, and
once the floor was written down the same measurement said 36% and the opposite answer.

Every figure it prints is a wall clock and will differ run to run, which is why its ledger block is marked a wall
clock and `cite` holds it to the checkable claim (the command still runs, and still prints timings) instead of
demanding the same milliseconds back.

## `node tools/bundle.mjs` — builds the doors, and only when an input changed

```
node tools/bundle.mjs            build if needed   (every `npm run <door>` goes through this)
node tools/bundle.mjs --force    build regardless
node tools/bundle.mjs --why      what it would do, and what changed
```

The sixteen door scripts were `vite build && node dist-nexus/<door>.mjs`, so every round paid a 1.07 s rebuild on
every door run, almost always to emit a byte-identical bundle. This skips it. A repeat door run went **2946 ms →
2108 ms** (`node tools/cost.mjs`), and the build fell from 36% of it to 5%.

A build cache goes stale when its key is a **proxy** for the inputs — a timestamp, a marker file, a directory list
someone has to remember to update. This key *is* the inputs: the SHA-256 of all 403 files under `src/`, plus the
vite config, `package.json`, the lockfile, the tsconfig and the tool itself. Change a byte of any of them and vite
runs. Two things hold it honest, both checked rather than remembered:

- **`npm run tidy`** asserts no relative import under `src/` reaches outside `src/` — the one way a file could enter
  the bundle unhashed — and that every file named beside `src/` exists.
Not `tools/doors.mjs`, which is the **map** of the doors. This one only builds them — and its first draft was
written straight over that map, because the name was never checked (ROUNDS 7y).

- **The stamp records the bundles it emitted, by name**, and every one must still be on disk. The first version
  counted them and asked for more than zero; deleting `moves.mjs` left fifteen, the count passed, and the tool said
  "up to date" with the door's own bundle missing. A floor cannot catch a number wrong in the admissible direction —
  the same shape as `joints >= 23` two rounds earlier, rebuilt inside an hour by the same hand.

## `npm run gears` — the gear bench from the command line

```
npm run gears                                    how to say a placement, and what is on the stock rail
npm run gears -- 20@0,0 40@60,0                  a 20-tooth driving a 40-tooth: 2 to 1, the other way round
npm run gears -- 20@0,0 60@80,0 20@80,0 60@160,0 --key 60T-2,20T-3     a compound 9 to 1
npm run gears -- 20@0,0 15@35,0 20@70,0          an idler: same ratio, same direction
npm run gears -- 20@0,0 rack@0,-20               a rack and pinion
npm run gears -- 20@0,0 40@55,0                  refused, with the interference measured in millimetres
```

Say where each gear goes in millimetres and it says what that arrangement does — the ratio, the speed and torque at
every shaft, the teeth in contact, the backlash — or **why it does not work**. It runs the same `GearBench` the forge
room uses, so the numbers here and the numbers in the room cannot drift apart.

It refuses to invent a placement: with no arguments it says how to say one. A board that builds itself teaches
nothing about centre distances, which are the whole skill.

After the readout it **turns the train one whole revolution in twelve steps and prints where every gear stands**,
because a ratio printed is a claim and a train that runs is the evidence: a phase that is wrong shows up as a gear
that jumps, a gear nothing drives shows up as one that never moves, and a rack's column is how far it has travelled.

### `npm run gears -- --planetary`

```
npm run gears -- --planetary 5        a set that comes to 5 to 1 with the ring held
npm run gears -- --planetary 24:16:4  a 24-tooth sun, 16-tooth planets, four of them
```

A planetary is not a placement on the plate — its planets ride a carrier, so their axes move and the fixed-axis
solver cannot describe it. It is asked for by what it is and answered by **Willis**: one set gives three ratios
depending on which member is held still, and the middle one reverses. It prints all three, every mesh judged where
the geometry puts it, and the two things that decide whether it can be assembled at all: `(z_sun + z_ring)` must
divide by the number of planets, or the last one will not drop in; and the planets' tips must clear each other.
