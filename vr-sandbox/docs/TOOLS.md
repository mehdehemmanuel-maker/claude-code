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
- `tools/manny-see.mjs`: **the critic's eyes**, and the first thing to reach for when a round is about to say "I could
  not see it". One command gives the two halves a judgement needs, together: the NUMBERS (every door that really takes
  words, run on the same ask — `machine.mjs` composed from the library, `invent.mjs` for what the intent pipeline heard
  and what it could not use, `plan.mjs` fed the words as a sketch — each one's refusals kept rather than swallowed) and
  the PICTURE (the viewer built, the look page opened from the views that expose fakery rather than flatter: `three`
  what a person sees first, `explode` whether it comes apart into real parts or is one lump wearing a name, `cut`
  whether it is hollow). It prints the PNG paths, and **the `Read` tool shows a PNG as a picture**, so they are really
  looked at.
  `node tools/manny-see.mjs "<words>"` · `--numbers` (figures only, no browser) · `--part` (the words name a library
  part) · `--views three,top,explode,cut` · `--out <dir>` (default `/tmp/manny-see`).
  It only hands a door the input that door takes — `works.mjs` wants a build id, `plan.mjs` a sketch on stdin — and
  says so where it skipped one, because a stack trace reads like a refusal and is not one. Everything it could not do
  (a build that failed, a view that did not render) it says as the failure it was: a tool that quietly shows less than
  it promised is worse than none, because the critic then reports on what he thinks he saw. **Known gap it names
  itself:** there is no door that prints one library part's figures (mass, size, interfaces, what it contains), so
  `--part` is the picture only.
- `tools/look.mjs`: render any ask from named views (`node tools/look.mjs <viewer dir> <out dir> "name|words=…&view=…"`; a view that looks all but straight down or up (`top`, `under`) is squared — its camera's up is ∓z, not the degenerate roll three.js picks when up is nearly the way it looks, which had turned every plan view 45°;
  `ortho=1` for a view to set beside a photo, `exposure=`, `env=`, `sun=`, `tone=aces` to try the light; it prints the
  part's `lift`; the light tent's `back=` (a backdrop as bright as the photo's studio had it), `floor=rrggbb` (what it
  stands on), `probe=1` (each metal face's reflection captured from where it stands, itself left out, box-projected:
  a socket's mouth dark inside as photographed; each plate (two sizes over `probeown=` mm, 4 by default, the third a
  millimetre or less) its own, a shield bent round a part sharing its part's; a board in about 90 s on software GL:
  `LOOK_WAIT=` ms for longer); `ao=` mm, screen-space occlusion, does not darken
  a mouth yet and drops the sun's shadow: not to be trusted); `npm run boardmap -- <id> <out.json>` writes a board's drawn outlines for `photo.py overlay`.
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

