# The image tool, for whoever extends it

`tools/image.mjs` turns a line of words into a PNG with no model, no service, no key and no dependency: Node 18+, one
command. This page is the longer read behind the README's "Pictures from words": how the pipeline goes, which file
owns what, how a new thing, family or style is added, what the world under the paint is, what the tool promises about
honesty, how it is tested, and the decisions made while it was built, with their reasons. The header comment of
`tools/image.mjs` (`--help`) is the vocabulary and the flags; this page does not repeat them.

## The pipeline

```
words --read()--> scene --paint()--> { width, height, data: Float32Array rgb, layout } --encode()--> PNG | PPM
                   |                   |                                                   |
                   |                   one family's passes, back to front: sky, sun or     tEXt Software and
                   |                   moon and stars, clouds, phenomena, ranges, ground,   Comment (the scene
                   |                   far weather, things, reflections, near weather,     JSON) before IDAT;
                   |                   finish (grain, vignette, style, text)               a PPM carries none
                   things, conditions, counts, colours, sizes, places, a style, a text;
                   every word it could not place in scene.ignored, every silent change in scene.overridden
```

1. **read(prompt)** (`tools/image/read.mjs`) tokenises the words (phrases joined, compounds split), tries each token
   as a thing (the built-in table and every registered thing's `match`), a family word, a condition (time, sky,
   weather, ground, water), a number, a colour, a size or place word, a style word, a negation or a stop word, binds
   counts and colours to the noun they stand before, and settles the scene (boats force water, buildings force
   pavement, the moon forces night). It returns a plain object: the scene, with `instances` (each mention of a thing
   with its own count, colour, size and place), `things` and `colours` as views over them, `ignored`, `overridden` and
   `recognised`.
2. **paint(scene, { width, height, seed, style, text })** (`tools/image/core.mjs`) builds the context every pass
   shares (the palette for the time of day, the horizon as a share of the height, the sun's place, the camera that
   frames the subject, the owner buffer, the primitives bound to the buffer), picks the first registered family whose
   `detect(scene)` answers (the landscape answers everything and is kept last) and runs its passes in order. Each pass
   paints one layer over the last into the Float32 buffer. Nothing in `tools/image/` imports Node, so the same files
   paint in a browser (`toImageData`).
3. **finish**: the last pass lays grain against banding and a soft vignette, applies the style
   (`tools/image/styles.mjs`: a function over the whole buffer, from lattice noise only) and draws the caption last so
   it stays crisp.
4. **encode(image, scene, { format })** (`tools/image.mjs`) writes the bytes: a PNG (8-bit RGB, filter 0, deflate
   level 9, CRCs from the file's own table) with a `Software` chunk and a `Comment` chunk holding the scene JSON, or a
   binary PPM. `generate()` is read, paint and encode to a file; the shell adds the report on stderr.

The seed: `--seed`, else a hash of the normalised words (`words(prompt).join(' ')`: lower case, punctuation gone), so
"A Tree." and "a tree" are one picture and `--seed` changes only the random choices, never the reading. `--count n`
and `--strip n` use seeds base, base+1, ... base+n-1, so the first is the plain picture and any cell can be had again.

## The module map

- `tools/image.mjs`: The shell: flags, the report on stderr, `generate()`, `encode()`, the PNG and PPM writers,
  `compose()` for a strip; its header is `--help` and the vocabulary.
- `tools/image/core.mjs`: `paint()`: the context (palette, horizon, sun, camera, owner buffer), the built-ins'
  registration, the pass order, `toRGBA8`/`toImageData`.
- `tools/image/registry.mjs`: The four registries (things, families, styles, conditions), `register()`, and the
  lookups the reader uses (`thingFor`, `familyFor`, `styleNamed`).
- `tools/image/read.mjs`: Words to a scene: the tables (numbers, colours, the built-in things, conditions, sizes,
  places, stop words, phrases, compounds), `read()`, `words()`, `nounLooking()`.
- `tools/image/math.mjs`: `clamp`, `lerp`, `mix`, `smooth`, the string hash, the seeded generator, lattice noise and
  fbm.
- `tools/image/draw.mjs`: The anti-aliased primitives (disc, ellipse, poly, quad, tri, rect, line), `SIZES` in metres,
  the camera and `frameCamera()`, the sun's direction, `shadow()`, `sprite()`, `attach()`.
- `tools/image/passes.mjs`: The landscape's layers: sky, sun/moon/stars, clouds, ranges, ground (grass, sand, snow,
  pavement, water, the road, hills, dunes, tufts, flowers), far and near weather, reflections, the finish.
- `tools/image/things.mjs`: `place()` in world space, `thingsPass()`, `critic()`, the built-in drawers (tree, boat,
  the flowers flag; the house and building rows come from `structures.mjs`, the birds from `creatures.mjs`) and the
  shore logic for things at the water.
- `tools/image/things/vehicles.mjs`: `VEHICLES`: every kind's figures in metres with a source per row; one builder per
  silhouette family; `drawVehicle()` projects the parts through the camera.
- `tools/image/things/landforms.mjs`: Cactus, palm, volcano, waterfall, each a registered thing with typical sizes.
- `tools/image/things/structures.mjs`: `HOUSES` and `STRUCTURES` in metres (each row saying what is published,
  typical or an estimate): houses by kind in three-quarter view (a cottage is drawn as the house), towers with their
  window grids, `skylinePass` (the city's row of silhouettes at the horizon, kept under the ridge it spans), and the
  lighthouse on its reef, rocks, windmill, castle, church, bridge, tent, campfire, fence, streetlamp, telegraph pole
  and bench, each drawn through the camera as the vehicles are.
- `tools/image/things/creatures.mjs`: `CREATURES` (ten animals side-on, standing or grazing), `FIGURE` (a person
  standing, walking or sitting; a crowd), `FLYERS` (airliner, Cessna, helicopter, balloon, rocket, dragon, kite), the
  birds by word and bats, the swimmers (whale, dolphin, shark, fish), each from a table in metres with its source
  named and one drawing rule per family; and the reader's conditions for irregular plurals, collective nouns, poses
  and a sea creature's water.
- `tools/image/families/space.mjs`, `abstract.mjs`, `portrait.mjs`, `underwater.mjs`, `phenomena.mjs`: The families
  beyond the landscape (each claims its words and paints with its own pass) and the sky's phenomena (rainbow, aurora,
  lightning) inside the landscape; the helpers the families share (`note`, `dropWord`, `undrop`, `bare`) live in
  `read.mjs` and are re-exported by `abstract.mjs` beside `promptColours` and `hsl`.
- `tools/image/styles.mjs`: The eight finishes and the buffer helpers (luma, sobel, box blur, posterise, grain,
  vignette).
- `tools/image/text.mjs`, `font.mjs`: The caption: layout in the free third of the picture, wrapping to two lines; the
  original 5x7 bitmap font for ASCII 32-126.
- `tools/image.d.mts`, `tools/image-examples.d.mts`, `tools/image/*.d.mts`: Hand-written types so the TypeScript tests
  see the shapes; the `.mjs` files are the source of truth.
- `tools/image-examples.mjs`: The gallery: the `EXAMPLES` table, `npm run image:examples` to paint it into
  `docs/images/` and the README's generated regions, `-- --check` to prove the committed files are the tool's output.

## The registries, and how a new thing, family or style is added

`register(kind, entry)` (`tools/image/registry.mjs`) appends to one of four ordered arrays; an entry with the id of
one already there takes its place, which is how `landforms.mjs` wraps the built-in tree drawer to draw palms without
an edit to `things.mjs`. The reader consults the same arrays, so a registered word is read with no change to
`read.mjs`.

- **things** `{ id, match, usual, word?, band?, depth?, size?, onWater?, onRoad?, sky?, draw(ctx, inst) }`. `match` is
  tried on every token; `usual` is how many a bare plural names; `size` is `{ w, h, d }` in metres and is what the
  camera frames and the critic reasons with; `depth` is the band in metres the thing may stand in; `onWater` keeps it
  on the water, `onRoad` in a lane, `sky` makes it a flyer with no footprint. `draw(ctx, inst)` paints one instance
  with its foot at `(inst.ux * W, inst.fy)`, `inst.zm` metres away (`ctx.camera.focal / zm` is pixels per metre
  there), scaled by `inst.size`, in `inst.colour` when the words gave one, and returns its box in pixels; `thingsPass`
  wraps the call in `ctx.sprite()`, which fades the colours with the air, keeps the top edges for snow to settle on
  and writes the owner buffer the critic reads.
- **families** `{ id, detect(scene), passes, words?, apply?(scene, word) }`: the first whose `detect` answers paints
  the scene; `words` claims tokens in the reader and `apply` (or `scene.family = id`) runs for each.
- **styles** `{ id, match, apply(img, ctx), grain?, vignette?, scene? }`: a finish over the buffer; `scene` is what
  the style asks of the picture before it is painted (minimalist: no clouds, no fog, a flat sky).
- **conditions** the time, sky, weather and ground matchers, weighed in order; one registered here is weighed last.

A thing, start to finish (fifteen lines, runnable from the repo root):

```js
import { generate, read, register } from './tools/image.mjs';

register('things', {
  id: 'lighthouse', match: /^lighthouses?$/, usual: 1, size: { w: 6, h: 24, d: 6 }, depth: [60, 220],
  draw(ctx, inst) {
    const { W, rect, disc, lit, col } = ctx, s = ctx.camera.focal / inst.zm, k = inst.size; // px per metre
    const h = 24 * k * s, w = 6 * k * s, x = inst.ux * W - w / 2, y = inst.fy - h;
    ctx.shadow(inst.xm, inst.zm, { w: 6 * k, d: 6 * k }, 24 * k); // thrown by the sun first, like every thing
    rect(x, y, w, h, lit(col('lighthouse', [0.92, 0.92, 0.9]), ctx.sun.left ? 0.9 : 0.6)); // the tower
    disc(x + w / 2, y, w * 0.55, lit([1, 0.92, 0.6], 1)); // the lamp room
    return { x, y: y - w * 0.55, w, h: h + w * 0.55 };
  },
});
console.log(read('a lighthouse on the coast').things, read('a lighthouse').ignored); // { lighthouse: 1, ... } []
generate('a tall lighthouse on the coast at dusk', { out: 'lighthouse.png', width: 960, height: 540 });
```

Nothing else changes: the reader answers `things.lighthouse 1` with nothing ignored, `frameCamera` steps the eye back
for a 24 m tower, `place()` keeps it off the water and off the road, the critic counts it (`visible: lighthouse 1/1`),
the PNG's Comment carries it. A family or a style registers the same way (see `families/space.mjs` and `styles.mjs`).
Add the words to the header of `tools/image.mjs`: the project's rule is that the vocabulary there is complete.

## The world under the paint

- **The camera** (`draw.mjs`, `camera()`): a 50 mm-equivalent lens at a standing person's eye height, 1.6 m, looking
  level at the horizon. `project(xm, zm, hm)` maps metres to pixels; `groundZ(fy)` says how far away a row of the
  ground is. Every thing is drawn from its size in metres (`SIZES`, `VEHICLES`, `LANDFORMS`, each figure typical or
  sourced), so a 4.5 m car on a 3.5 m lane and a 20 m pine behind it agree with the ground they stand on.
- **The eye frames the subject** (`frameCamera()`): a level camera draws a thing on the ground `(fy - hy) / eye` times
  its height whatever the lens, so the eye is the lever. The camera steps back and up until the largest asked-for
  thing fits 0.6 of the rows and its kind's share of the columns (three beach houses share: 0.4 / sqrt(3) each), to 12
  m at most, 2.5 m on a road (a step-ladder, never a drone). The usual extras take whatever eye results.
- **The sun** (`sunlight()`): an azimuth from the disc's side of the frame and an elevation from the hour
  (`ELEVATION`: dawn 10 deg, day 55-65, sunset 8, the moon 35); the clouds and the storm hide the disc and soften the
  light.
- **Shadows** (`ctx.shadow(xm, zm, { w, d }, h)`): a footprint swept along the sun's direction onto the ground plane,
  `h / tan(elevation)` long, darker and sharper under a clear sky, fainter with distance, none when no disc is in the
  sky; every drawer throws its shadow before it paints.
- **Placement** (`things.mjs`, `place()`): the named subject near a third line at mid depth, extras scattered, the
  reader's near/far/left/right/centre hints, no footprint over another by more than 40%, nothing but a vehicle in the
  road's corridor, boats on the water and everything else off it, a counted few staggered in depth.
- **The owner buffer and the critic**: `ctx.owner` is an `Int32Array` the size of the picture; `sprite()` writes the
  id of the thing painting solidly at each pixel. After the things are painted, `critic()` reads it back, counts each
  thing's visible pixels and span, and marks it seen only when it owns enough of what it painted and is more than a
  few pixels across. An asked-for thing that is hidden or too small is placed once more and the things repainted; the
  tally goes to `scene.report.visible` (`visible: trees 3/3, houses 1/2` on stderr).
- **Water** mirrors the sky snapshot taken before the sun's disc, the ranges, the far bank and the things above the
  shoreline; a wet road mirrors the sky; the shoreline wanders by fbm; a storm's sea has whitecaps and no glitter.

## The honesty contract

What the tool promises, in the file header's words: anything it does not understand is ignored, and `--describe` shows
exactly what was kept. Concretely:

- `scene.ignored`: every token that matched nothing (not a thing, condition, number, colour, modifier, style, family
  word, stop word or phrase part). Printed as `not understood: ...` after every painting.
- `scene.things`: the count each kind is painted with, the usual number resolved (a bare "mountains" is
  `mountains: 3`, "forest" is `trees: 9`); the instance under it says `usual: true` when the words gave no number,
  so the JSON never shows a count the picture does not hold. (A scene built by hand, without instances, may still
  say 0 for the usual number; the reader never writes one.)
- `scene.overridden`: every silent choice, each `{ what, from, to, because }`: `ground grass -> water (boats)`, `time
  day -> night (moon)`, `style sketch -> poster (--style)`, the hills added to break an empty horizon. Printed as
  `changed: ...`.
- `scene.notes`: what a family says of itself (`painted by the portrait family: a stylised face, not a likeness of
  anyone`; a space picture's colours are a painter's reading, not a photograph).
- `scene.report.visible`: what the critic could see once painted, against what was asked; a hidden subject is never
  counted as drawn.
- `scene.recognised`: how many tokens carried a picture; when it is zero the shell says so and paints the default day
  meadow rather than pretending.
- `--strict`: write nothing and exit 3 when nothing is understood or when an ignored word looks like a noun (three
  letters or more, not ending in -ly; it cannot tell nouns from adjectives, and says so).
- The PNG's `tEXt` chunks: `Software` (`vr-sandbox image.mjs`) and `Comment` (the scene JSON without the prompt), so
  any picture can be traced to its reading with a hex dump or `python3 -c "from PIL import Image;
  print(Image.open(f).text)"`. A PPM has no text chunk, which the help says.
- The gallery: `npm run image:examples -- --check` re-paints every committed picture into memory and compares its
  sha256 (`DRIFT`), and names any file under `docs/images/` that no row makes (`EXTRA`); either fails it, so the
  README never shows a retouched, stale or orphaned picture. `docs/images/honesty-dragon.txt` is the real stderr of
  a prompt the tool understands only in part: the dragon and the castle are read and counted as visible, the wizard
  and the drawbridge are said to be not understood.

## The tests, and how to run them

`npx vitest run tests/unit` runs the image suite with the rest of the unit tests (each file is named for its package):

- `tests/unit/image.test.ts`: Determinism (same words, same bytes; a seed changes them; case and punctuation do not),
  a valid PNG with every CRC, any size paints, the core is free of Node, the layout is size-independent, speed
  (640x360 < 400 ms, 1280x720 < 1.5 s).
- `image-read.test.ts`: The reader: binding, counts, compounds, water scenes, every ignored word and silent change
  said, nonsense sizes and seeds refused, the tEXt chunk (property-based with fast-check).
- `image-draw.test.ts`: The primitives' coverage, the camera's projection, the sun's direction, shadows, the six
  drawers in metres.
- `image-sky.test.ts`, `image-water.test.ts`, `image-ground.test.ts`: The sun's disc and clouds, the moon by phase,
  the mountains lit on the sun's side; the shoreline, reflections (the peak mirror as a share of its source), storm
  and frozen water, the river; dunes, tufts, hills, the drifting road, the seasons, settled snow, layered rain, the
  night kept dark.
- `image-styles.test.ts`: Every style keeps the size and the range and paints the same bytes twice; the font's glyphs;
  the caption's placement and truncation.
- `image-vehicles.test.ts`: Every vehicle row's figures against the project's `machines.ts`, the builders' parts, the
  rear view on the road, the lamps at night.
- `image-place.test.ts`: Placement over 5 prompts x 200 seeds: no footprint over another, nothing on the road but
  vehicles, every asked count reported, a hidden subject never counted.
- `image-families.test.ts`: The four families claim their words and only in company, paint with no horizon, and say
  what they are; the landforms and phenomena.
- `image-structures.test.ts`: Every structure read by its words and keyed as before, the house kinds, the skyline
  under its ridge, the lighthouse off the shore, each built thing drawn and seen by the critic.
- `image-creatures.test.ts`: Every creature, person, flyer and swimmer read by its words (irregular plurals,
  collectives, poses), drawn in metres, the flyers inside the sky band, the night kept dark around them.
- `tests/nexus/image-figures.test.ts`: The `VEHICLES` table is one source of figures with `src/nexus/machines.ts`.
- `image-examples.test.ts`: The gallery table paints, `--count`/`--strip`/`--format` parse and validate, the P6
  header, the README's vocabulary paragraph carries every word of the header's, the gallery's pictures are committed.

`npx tsc --noEmit` checks the tests against the hand-written `.d.mts` files. `npm run image:examples -- --check` is
the gallery's own gate. `LC_ALL=C awk 'length > 120' tools/image.mjs tools/image/*.mjs tools/image/*/*.mjs` keeps the
lines readable. `node tools/bench.mjs` is the project's wider look bench and is not needed here.

## Decisions and amendments

Recorded during the build (the critique panel's plan of 2026-10-17 and the review rounds after it), with the reason
for each, so the next person does not re-litigate them without the evidence.

- **The seed is hashed from the normalised words, not the raw prompt.** The header promised that the same words give
  the same picture; hashing the raw string made "a tree" and "A Tree." different pictures (code reviewer, 1/S). The
  hash is over `words(prompt).join(' ')` and `--seed` is the only other source. Changed once, in core-split, as the
  plan allowed.
- **The camera frames the subject rather than the subject fitting the camera.** A level camera at 1.6 m draws a 20 m
  pine standing 8-18 m away three frames tall; the honest fix is not to shrink the pine but to do what a photographer
  does: step back and up (`frameCamera`, to 12 m, 2.5 m on a road). The acceptance for a pine on the near shore was
  amended to "fits 0.6 H at the near shore" instead of a fixed depth.
- **"huge" reaches only 1.23x on a level camera.** A thing taller than the eye climbs over the horizon as it nears, so
  a huge cabin's height is capped by the sky above the horizon: 1.23x the plain one at a 0.55 horizon. The size word
  is still honoured by placing the sized thing where its top clears the frame; the test asserts the achievable factor,
  not the dictionary's 2x.
- **The peak's reflection is about 0.7 of its source's contrast, so the test asserts a share.** Water mirrors the
  snapshot through the surface's own tint and ripple; measured, the mirrored peaks keep ~0.7 of the contrast of the
  peaks above. The water test asserts that share with the measured values in its comment rather than a fixed
  luminance.
- **The kart has no roll hoop and no tail lamps.** `VEHICLES.kart` is drawn from the sourced rental kart's figures
  (`src/nexus/machines.ts`), which has neither; drawing them would be a template's idea of a kart, not the figures'.
  The forklift's mast, the semi's trailer and the bus's windows come from their rows the same way.
- **"tractor" draws a lawn tractor and "jeep" a crossover.** Those are the figures the project holds (a John Deere
  X350, an SUV body style); a farm tractor and a Wrangler would be invented. The vehicles sheet in the README labels
  the jeep "(a crossover)" for that reason.
- **A portrait is a stylised face, never a likeness.** Proportions from the project's adult-head figures, hair from
  the colour word, the rest seeded; `scene.notes` says so on every portrait, and no word is read as a person's name.
- **The night must stay dark.** The fix that kept grass green at sunset (the air's neutral halved toward grey, the
  ground light lifted toward white) lit a moonlit meadow 2.4x; it is gated on the sun being up (`L.sunk`), and the
  night keeps the palette's own dark blue.
- **The families' words are narrowed so landscapes stay landscapes.** "face" after cliff, rock or a compass point is a
  landscape's; "northern lights" is a phrase and a bare "northern" is not the aurora, so "a northern forest at noon"
  is a day forest; "earth" claims space only beside a space word, "space" only alone or with outer/deep/stars, "coral"
  before a colour or sky word is a colour; a bare shape word claims the abstract family only when nothing of a
  landscape is named. Every narrowed word goes back among the ignored words, where `--describe` shows it.
- **The honest report before the picture.** When nothing is understood the tool says so and paints the default meadow
  instead of exiting, because the picture is still the tool's output and the message is on stderr and in the file;
  `--strict` is the refusal for scripts (project-values 5/S, prompt robustness 5/S).
- **Gallery sizes.** A 960x540 PNG from this tool is 0.6-0.8 MB because the grain against banding fights deflate; the
  two leads are 960x540 and the rest 640x360 or 320-400 px cells, which keeps `docs/images` under 6 MB.
- **`--count` and `--strip` seeds are base + i - 1.** So the first cell is the plain picture and any cell can be had
  alone with `--seed`; the strip lists them in a `Seeds` tEXt chunk.
- **The cloud field does not follow the seed.** `cloudPass` samples its noise at fixed offsets, so the header
  prompts' default pictures keep their skies; a `--strip` moves the boats and the sun and not the clouds, and the
  README's caption says so (the review of 2026-10-17 offered reseeding the field; the captions were made true
  instead, so the four header pictures stay as they were).
- **`things` carries the resolved count.** The reader used to write 0 for "the usual number" and the first JSON a
  reader opened said `mountains: 0` under a picture with three; now it writes the count painted and the instance
  keeps `usual: true`. The painter still takes 0 as the usual number from a hand-built scene.
- **A re-mention is the same thing.** "a bridge over a river, a boat beneath the bridge" read two bridges and painted
  two arches; a singular mention by its own word after the, that, this or same, of a kind already named, merges
  into the earlier one ("a man and the woman" are two words, so two people).
- **Rain and falling snow bring cloud, and an unnamed moon stays behind it.** A full moon and a starfield shone
  through "heavy rain at night" (the critique's finding, lost on the way to "a moon at every night"). Rain and
  snowing set the cloud cover to at least 0.8; from 0.8 the moon is drawn only when the words name it, the
  starfield fades from 0.6 cover to none at a storm's 0.95, night clouds under a hidden moon are half as bright,
  and a city's glow grows and reaches higher under low cloud, as a rainy city's sky is lit from below. The third
  header picture (the city in the rain) changed with it: its moon went, and the towers moved since nothing is
  refused for standing before a moon that is not there.
- **A vehicle beside water brings the near shore.** "a bus by a lake" stood the bus in the lake (the far bank is a
  foot row at the horizon with a visual depth of 20-400 m, and a vehicle drawn through the camera at that depth
  stands in the water) while the critic said "buses 1/1". The reader now gives the water a near shore when a
  vehicle is named with no shore word, says so in `overridden`, and a vehicle with no room on the shore is left
  unplaced and counted 0/1 rather than sent to the far bank.
- **The road's corridor is the road.** The strip kept free of all but vehicles was the road's whole width either
  side of its centre (14 m), which within 20 m of the camera left nothing but the road to stand on, so the third cow
  of a farm prompt was placed on it, crowded; it is the road's half width and half a metre of verge (4 m), and a
  thing crowded after every try stands off the road when any try was.
- **A flyer stays inside the frame, and a cropped one is not seen.** The airliner over the desert was a wing at the
  right edge counted 1/1: a flyer's column is kept in by its own width (it hangs farther off when its band would
  draw it wider than 0.4 of the frame), a flyer under 70 % inside the frame is not counted, and the airliner's box
  is the aircraft, not its contrail.
- **The ranges' count is said.** "five mountains" read 5 and painted 4 (the land pass draws four ranges and three
  rows of hills at most); the reader clamps the count and says so in `overridden`.
- **The abstract family's colour words are kept.** "abstract art in blue and gold" painted blue and gold and reported
  colours {} and recognised 1; the family puts its palette words in `scene.palette` and the reader counts them.
- **Stars are a constant count across sizes.** The plan's row (1080p has 2.25x the stars of 720p) is amended:
  `skyPass` keeps the number of stars the same from 360 rows up (0.93 measured between the two), so a thumbnail
  predicts the full render and is not speckled.
- **No `--aa` flag.** Coverage anti-aliasing from the signed distance replaced the plan's supersample path; 960x540
  stays under 0.6 s without it.
- **The passes are under 70 lines, not 40.** Six functions in `passes.mjs` run 45-66 lines (range, groundPass,
  landRow, landPixel, cloudPass, skyPass); their inner loops are the pass, and splitting them would name nothing.
- **The pine is 5-8.3 cabin walls, not 2-4.** `SIZES` holds a pine at 15-25 m and a wall at 3 m; the test asserts
  3-8.4 (a broadleaf is 3.3-4.7).
- **`read()` lives in `read.mjs`; `core.mjs` re-exports it** with `words` and `COLOURS`, so the plan's single
  core import gives a script the reader and the painter together.
- **The lake-mirror test asserts all six seeds at 0.09.** Three seeds at 0.1 chose the ones that passed; 0.09 is the
  share the mirror carries at every seed (0.096-0.113 measured).
- **A man's portrait hair is short or curly.** The long style fell past the shoulders both sides and read as a hood.
- **The font's descender letters sit on the x-line.** The 5x7 font keeps g, p, q and y inside the seven rows; drawn
  with a four-row bowl from row 1 the p was a P moved down one row ("Pixel", "sePia" in the gallery's labels).
  Their bowls now start at row 2 with the other lowercase bodies and their tails take the two rows under them.

## Known gaps

What a judge would still call thin, said plainly:

- The things are flat-shaded boxes, cones and discs with anti-aliased edges: no texture on a wall, no bark, no cloth.
  A pine is three cones; the kart at 400 px is two masses, four wheels and the ring of its steering wheel: the
  figures hold a seat shell, a steering column, a GX270 and pods (`vehicles.mjs`) that the drawer does not paint
  (the owner's words: a red brick with a floating ring). A detail ladder by pixels per metre, the parts drawn when
  they would be more than a few pixels, is the next package for every vehicle, the car's pillars and lamps with it.
- The city is a skyline row of silhouettes and a few towers with window grids, not a street seen from its pavement:
  no ground floors, no traffic unless cars are named, and the eleven usual towers of "a city in the mountains" hide
  much of the ridge between them.
- The lighthouse stands on a rock mass and a reef drawn as grey lumps, not a rock face; "cliffs" paint as big lumps
  too, not a face.
- A cottage is drawn as the house: its thatch did not read as thatch, so the roof is the house's and the kind is not
  claimed in the header.
- The dragon reads as a pterodactyl: a long head, bat wings and a spade tail, no scales, no fire.
- A helicopter at night is its lights (red and green by heading, a white tail light, a red beacon, a lit cabin) on a
  dark shape a few pixels across at its depth; it is in the frame and counted, not recognisable without them.
- The speed budget in `image.test.ts` (640x360 under 400 ms, median of three) has held in every run so far, the full
  gate's 155 test files in parallel included (2026-10-17: 1793 tests, 295 s); it is a budget for a quiet minute of
  the machine, not a guarantee: the kitchen-sink prompt at 960x540 paints in 435-500 ms quiet and has taken 630 ms
  under the suite's load.
- One lens, one level camera: no wide or portrait composition words, no looking up or down.
- The portrait reads "smiling" but the mouth barely changes; expressions are a line.
- The vocabulary is finite (the header lists it); there are no learned synonyms, and a word outside it is ignored,
  however plain ("tarmac", "pond-side").
- Weather and light are a few numbers (clouds, fog, rain, snow, storm, wet, an hour): no wind, no temperature, no
  season on anything but leaves and snow.
- The critic counts what it painted and whether it can be seen; it does not judge whether it looks right. The blind
  check CLAUDE.md asks for (a context-free agent names the picture) was a judge round at the end, not a script in
  the repo; `npm run image:blind` (a contact sheet of the header prompts for a stranger) is still to write.
- A cow's neck is drawn long and raised, so a brown-and-white cow reads as a horse or a camel with patches; the
  creatures are flat side elevations from a table, with no joints.
- A counted few near the camera can stand one before another: the overlap rule is on footprints in metres, and the
  critic counts each by its own pixels, so two cows half over each other are "cows 2/2". A screen-space overlap
  rule is not written.
- "by a lake" with no shore word keeps the camera in the water: a tent and a campfire by a lake at night are a strip
  on the far bank. Only a vehicle brings the near shore (it cannot stand on the far bank); a house, a tree, a tent
  or a person by water needs "shore", "beach", "lakeside" or a named land to stand on the near bank.
- Relations and density words are read as plain nouns: "a castle on a hill" stands the castle on the flat with the
  hills behind it (both blind namers called it "on a plain"), "forest" is nine trees spread across the frame (they
  called it "a field"), and in, on, beneath, beside place nothing.
- Actions and poses other than standing, walking and sitting are not read: jumping, lifting, parked, flying go among
  the ignored words like any unknown noun, with no hint that they are verbs.
- The forge's own words are unknown here: bearing, bolt, stepper motor, gear, robot arm, crane, excavator, train,
  chainsaw, 3D printer paint the default meadow. `inventory.ts` (about 1,500 items) and `components.ts` are one
  import away as a vocabulary that could say "known to the forge, not painted here"; drawing a library part
  through `look.ts`'s light table into this tool's frame is the merge that would end the second generator.
- Three of the eight styles are weak: sketch hatches the whole frame and buries the subject, watercolour washes a
  pale sailboat out (one blind namer asked whether it was fog or a rendering mistake), poster quantises a blue noon
  sky and green pines to violet and teal.
- The camera frames the largest asked thing, so a person beside a pine is a 78 px figure under a 503 px tree; the
  noon sun's disc sits a quarter of the way down a level 50 mm frame, where a 60 degree sun would be out of it, and
  reads as a moon at times; the wet road mirrors the ranges nearly as a lake would.
- 4K: 3840x2160 paints in about 6.2 s plus 1.1 s for the PNG at 473 MB RSS, against the plan's budget of 6 s and
  250 MB (two Float32 frames, the Int32 owner buffer, level-9 deflate); 1080p takes about 2 s.
- A PPM carries no reading; only the PNG does. There is no SVG, JPEG or GIF.
- No preview page; the browser-safe core is exercised only by the tests.
