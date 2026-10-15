# Nexus and the forge: read this before any work here

This file is the anchor against drift. Long recursive work loses the point when each round optimises what it can measure
(tests green, numbers sourced, findings fixed) and forgets what the person asked for. Summaries after a context reset
keep the task list and lose the why. So the why lives here.

It is short on purpose. It reached 2,166 lines, four fifths of it a round-by-round log, and an anchor too long to read
before a round is the drift it exists to prevent. The log and the reference are three files beside it; this one holds
only what every round needs:

| Read | For |
| --- | --- |
| this file | what is wanted, who owns what, the rules every round passes, what is open |
| `docs/OWNERS.md` | the full description of each owner. Read its row before touching a concern |
| `docs/ROUNDS.md` | what each round did, and the fault it found. Read the rounds for what you are about to touch |
| `docs/TOOLS.md` | every tool built for this work, and how to run it |

A round appends to `docs/ROUNDS.md`. Only a *standing rule* or a change of what is open belongs here.


## What is wanted (the user's own words, kept)

Grouped, because the asks repeat: nine things said many ways over many weeks.

**1. Never a template; always the general rule.** *"don't make templates for individual generation paths that's mock,
make it have a pipeline where it can generate trillions of different combination of just anything based on any
condition improve realism ... there needs to be an attention to detail part of the pipeline"*; *"merge them don't
discard one or just not incorporate it, they may complement each other ... why are there two different generators"*.
Per-product *data* is fine. Per-product *code* is a template.

**2. Real and buildable, down to the last part.** *"generate every single vehicle, every vehicle type, make, model ...
click it and it is a 1-1 exact model of the real product, expandable"*; *"go through every part and make sure that
every other part is inside and every part that's in those parts"*; *"don't forget bearings have sub components as
well"*; *"before confirming any measurements at the higher scale you gotta make sure the smallest sub sub components
are accurate and then so on ... don't do anything mock every build has to be treated as such"*; *"for each new part
stored it has to be queued for a break down just in case it has sub components ... some kind of table lookup"*.
Bottom up, never the whole first.

**3. One component library everything is built from.** *"design each sub component the motor and other parts but also
you first need to design the sub components of that and so on and then you can save that component under its name and
category and now every other build using any of them is already ready screws nuts bolts, radios, buttons, wires ...
mix and match and make emergent builds like a semi truck-atv hybrid, 3d printer with robot arms on it ... start small
and work your way up"*; *"break down components and break down the other components ... at like a bulk crazy scale ...
be nice on GPU and CPU ... expand your regions of CAD ... industrial ... augers ... build the machines that build the
circuit boards ... the microchips"*; *"we need a lot more embedded systems, raspberry pis, orange pis, all of
d-robotics and the rdk x5, the worlds smallest and most precise robot arm ... have a in app computer for programming"*.

**4. Teach me to build it, by hand.** *"this whole thing is for me ... you to be able to invent or help me bring my
thoughts to life and then you teach me how to build things so have a training thing don't leave any part or anything
unnoticed but make it infinite like anything I request ... tell me all parts I need and prices and you gotta try to
keep prices down ... source online ... create parts that would be cheapest to get custom made ... you will be my iron
man Jarvis"*; *"every build that user requests to be taught is a 100 percent hands on walk through so don't say solder
here que the soldering kit generation once it looks realistic use it in the build and have the user solder ... its
important these builds are 100 accurate so nothing goes wrong or wasted money"*; *"perfect the language of the
tutorials ... universal edge ... every setup that would be the same have a edge ... use the fuck out of edges ... turn
everything into a loop"*.

**5. A works that really builds it.** *"designe me a advanced actually working industrial creation engineer thing ran
by a robot or robots think of the cheapest possible enviornments where anything can be created I don't care if I gotta
build it peice by peice from the ground up"*; *"think about throwing random builds at it and how it would manage
building that in real life ... whatever you build in there I'm gonna build in real life and connect whatever program
you do into it via Bluetooth"*; *"it just needs to be super capable for under 3000$"*; *"anything that cuts price will
be done even if it causes a lot more work"*.

**6. Invent, do not catalogue.** *"no create new machines and new inventions so go find components and you already
have other machines to reference ... rails could be mobility robotic hands"*; *"you need to think of an assembly of
things that already exist or things that can be combined ... like a robot that has a whole workshop that it can build
whatever it want or even use a computer to order parts"*; *"everything you build needs to be able to be exploded to
see components and then the components should be able to be exploded also ... make a tool called visualize or fast
plan"*; *"don't just adopt all these tools: improve them, expand, find flaws, find a branch it opens that no one
thought of; try to be the system that future systems reference"*.

**7. Recursive self-improvement, and tools for the tools.** *"ask yourself what aren't you asking yourself; don't just
think of math, think of emotion: how would they think about this, what would they say is bad about this, and then
recursively fix it"*; *"recursively upgrade every process and sub-process: the car's fenders and panels, unibody,
hoods"* (with it the CAD roadmap: Bezier/NURBS, proportional falloff, symmetry; a creator and a critic that changes
the creator's rules; wireframe boxing then skinning; zebra stripes; G2/G3; practise on a front fender first; and the
toolset list of 2026-10-08: automatic constraints, a parametric feature tree, clean quads, SubD cages, draft-angle
analysis, wall-thickness checks, generative design, command prediction); *"make more advanced tools for yourself to
make life a lot easier and add them to the process"*; *"increase efficiency, add ability, stop having to think and
make a tool for anything that does make you think or makes things hard or gets tricky"*; *"look at how messy you have
the code ... organize hard"*; *"make everything editable go around the whole thing once you've circled iterate make
the whole thing cheaper better make yourself faster think outside the box"*.

**8. Me.** *"submit some images of me and you put a model of me in the app"*; *"a node graph, every node I connect to
any other node will be able to see it when I click on either node: time, people, places, memories, dopamine,
melatonin, oxytocin, adrenaline, cortisol, endorphins, serotonin, acetylcholine, norepinephrine, GABA, glutamate ...
a map of all the brain regions"*; *"money manager / business agent with employees on computers and a board room with a
giant screen I can edit, basically a node tree that maps things in my situation out; don't lose context, find time for
it"*.

**9. Always.** No mocks. Every number sourced, or labelled typical or an estimate. Failures reported honestly.
*"no room for context drift ... use md to keep yourself on point"*.

## What can honestly be promised

A real product's exact surfaces are its maker's CAD and are not public. What is public and can be matched: its published
dimensions (length, width, height, wheelbase, track, seat height), its tyre and wheel sizes, its engine or motor and its
ratings, its mass, its part list and how it goes together. A product made here is true to those, with each figure's
source, and its shape approximates the surface. Say that plainly. Never call a model exact when it is not.

## One owner per concern: extend these, never write a second one

Seventy-one owners. One line each here; `docs/OWNERS.md` has the full row for every one, and each file's own header
says what it owns (the tidy lint requires it). **Before writing anything: find the owner and extend it.** Two owners
for one concern is the fault this index exists to prevent, and the lint catches the forms of it that have a name.

**`ask/`** - words in, wants out.
`conceive.ts` words to wants, figures, questions, designs from laws - `route.ts` where a make ask goes and what of it
was not done - `invent.ts` a flow that turns one thing into another, its ports mated and sized by conservation -
`machine.ts` a machine composed from units by what each affords, checked the way its arrangement fails, with
`machine-read.ts` (the ask read into what it must do, and what nothing consumed) and `machine-draw.ts` (how a
composed machine is laid out in space) beside it -
`generate.ts` structure for any intent - `sketch.ts` an invention sketched as blocks and pins before it is designed -
`conditions.ts` conditions on loads, holds and reach.

**`parts/`** - the library, and the geometry a part is made of.
`inventory.ts` ~1,500 real products and what each contains - `components.ts` every part designed once in 3D from its
standard, and whether a drawing holds all its inventory lists (`missingIn`) - `families.ts` + `catalogue.ts` +
`partspace.ts` parts made to any size by their standard and the words that ask for one - `kits.ts` a placed tree, a
`Cut`, a `Port`, an `Iface` - `mate.ts` parts placed by mating faces, ports read off the geometry, and what a part
promises against what it draws - `mechanism.ts` how many ways jointed parts can still move, and which ways -
`gears.ts` the involute: a gear's real teeth, what meshes with what, what a train does when one is turned, and a
planetary set from its counts - `drive.ts` a shaft line: what spins, what drives it, what loads it, and the speed the
whole thing settles at - the one place a torque source, a transmission and a load meet, and deliberately not about
gears (a source is anything with a torque at a speed) -
`mass.ts` a part's mass from shape, material and fill - `space.ts` oriented-box layout and contacts -
`form.ts` lofts, bent tubes, turned profiles - `surface.ts` NURBS curves, skins, fairness, zebra, draft -
`fits.ts` how close is close enough, and whether a machine can hold it - `finish.ts` edges as made, and the burr -
`fab.ts` custom parts written as a file for a service - `prices.ts` what things cost, each a page and a date -
`supply.ts` how good each price is and how old - `breakdown.ts` the queue every stored part goes through -
`pieces.ts` + `looks.ts` what an item looks like and how it comes apart - `threads.ts` ISO thread tables -
`kit-safety.ts` the works' safety kit.

**`boards/`** - `packages.ts` every electronic package drawn whole from its outline - `boardparts.ts` every connector,
switch, socket and chip from its maker's drawing. (The boards themselves: `kinds/sbc.ts`.)

**`machines/`** - real machines from their makers' figures, and the wire out.
`machines.ts` every wheeled machine - `vehicle.ts` vehicles as points in a want-space - `panels.ts` panelled bodies on
curve networks - `craft.ts` drones, hovercraft, jet suits, submarines, each sized by what holds it up -
`instruments.ts` x-ray, thermal, FTIR, lidar, each sized by the law that makes it work - `lab.ts` the bench
instruments - `headset.ts` the Quest 3 and a headset's optics - `seeed.ts` the XIAO and Grove systems -
`dharm.ts` six-axis arms by their makers' DH tables - `franka.ts` the FR3 - `meca.ts` the Meca500 -
`robot.ts` what a robot can do, as edges between tasks and parts - `kit-solder.ts` the soldering kit -
`makermodel.ts` a maker's own 3D assembly drawn from the library - `processor.ts` what a material becomes by what
process - `link.ts` the wire out, the Bluetooth bridge, and what a cutter does in a material.

**`works/`** - any build routed to real machines (see `works/index.ts`).
`plan.ts` routes - `can.ts` decides - `audit.ts` checks the plan - `schedule.ts` lays it on the machines -
`designer.ts` every build's numbers from its own geometry, and a build edited - `budget.ts` spends a budget -
`builds.ts` what to throw at it - `pack.ts` the works as a thing to order - `floor.ts` where each station stands -
`tend.ts` the robot that runs it - `families.ts` the MGN table.

**`teach/`** - `edges.ts` the language every lesson is said in - `lessons.ts` a lesson per step of making something -
`solder-lesson.ts` a lesson done by hand - `solder-joint.ts` one through-hole joint as physics -
`buildpack.ts` what to buy, at its cheapest real offer - `codesim.ts` the computer in the room.

**`make/`** - the pipeline. `pipeline.ts` the rounds - `conditions.ts` how a made thing is - `detail.ts` joints,
fasteners, seals, finishes, wear - `critic.ts` room to move, held up, walls, through, standing, declared.

**`view/`** - everything drawn. `forge.ts` the room - `benches.ts` setting a bench out in it - `gear-bench.ts` the
plate you put gears on by hand - `look.ts` the look page, how a picture is lit, cutaways -
`kit3d.ts` how a drawn part comes apart, and drilling - `explode.ts` an item seen in 3D - `apps.ts` the phone -
`solder-bench.ts` + `robot-bench.ts` the benches - `light.ts` the lighting.

**`world/`**, **`life/`**, **`embody/`**, **`kinds/`**, **`cli/`** - `world/places.ts`, `karting.ts`, `coaster.ts`,
`pingpong.ts` places, rides and games - `life/graph.ts` + `life/rhythm.ts` the life graph and the day's rhythms -
`embody/any.ts`, `tree.ts`, `stock.ts` hardware from generated elements - `kinds/core.ts` how a kind's words are read -
`cli/` every command-line door.

**The tree itself** - `tests/nexus/tidy.test.ts` (`npm run tidy`): nothing loose at the root, every file saying what
it owns, no file grown into six concerns, no name with two owners, no stale path in prose, no layer importing one that
should depend on it, and no rule written twice. Four of those are ratchets. **Never raise a number to make it pass.**


## The organising principle: interfaces, envelopes, one graph

Parts declare what they provide and require (`Iface`): a hub needs a shaft of its bore, a nut needs a stud of its
thread, a chain needs sprockets of its pitch. The critic pairs and checks every one with numbers, and an interface is
a connection, never an interference (an axle in its hub is not in its way). Interference is judged by **envelope, not
box**: a wheel sweeps a ring with room to its arch and beside its sidewall, a blade sweeps a disc inside its housing,
and no repair rests a part on a moving one. Grow this rather than adding layers: next are electrical (voltage,
current), thermal (heat rejected) and service access.

Branches beyond the standard tools, which the user asked for and which keep growing:

- **A skin is the fairest surface that clears everything inside it.** Arches come from the tyre's sweep through lock
  and bump, not drawn; the hood from the engine and strut tops under it; next the roof from the seated heads.
- **The mesh is only ever a projection of the math**, never edited, so it never needs retopology.
- **Panels are named by what they are for** (the front wheel's arch, the hood), so changing a figure re-makes the same
  panels: no topological naming problem.
- **Constraints carry their reason**: G1 across a shut line because a highlight crosses it; clearance because a part
  moves.
- **Coincidence by construction, not by checking**: a panel meeting another is built on its edge, so they share knots
  and meet everywhere; the critic's check then only confirms.
- **A maker checks its own output before the critic does.**
- Next: shut lines placed by draft; zebra judged from where people stand; a rule update kept only when it helps cases
  it was not tuned on.

Learn from the open engineering tools (FreeCAD and Open CASCADE, Gmsh, MOOSE and OpenFOAM, OpenModelica, LinuxCNC) as
ideas and architecture - each operation as UI, command, data, algorithm, constraints, failure modes. Ideas and
interfaces only: their code is GPL/LGPL and is not copied in.

## Where the code lives

`src/nexus/` is sixteen directories and two files, not 183 files. Each directory's boundary is one sentence; if a new
file does not clearly belong to one, that is the signal that its concern is not understood yet, not that it belongs at
the root.

| Directory | What is in it |
| --- | --- |
| `lang/` | the vocabulary both the law book and the engine speak, and nothing else: a dimension, an identity, a status, a `Term` and the arithmetic over it, `evaluate`, and a `Law`. It imports nothing in `src/nexus`, which is the point — it used to live in `substrate/`, so the book reached *up* into the engine 21 times to write a law in the only words there are for one |
| `substrate/` | the Nexus engine: domains, places, couplings, and the loop that evolves them, over `lang/`'s terms and laws |
| `ask/` | words in, wants out: how an ask becomes something to make (`conceive`, `route`, `generate`, `invent` for flows, `machine` for mechanisms, `spec`) |
| `parts/` | the parts library and the geometry a part is made of: every part designed once from its standard, the shapes it is drawn from (lofts, bent tubes, turned profiles, NURBS surfaces), where its pieces end up in space and which of them touch, its mass and what it costs |
| `boards/` | single-board computers, their parts, and the photo-measured data files |
| `machines/` | real machines from their makers' figures, and the wire out to them (`link.ts`). Not geometry: a loft, a surface and an oriented box are `parts/`, because a body is not a machine |
| `works/` | any build routed to real machines, and the robot that runs them: seventeen files, one concern each (see `works/index.ts`) |
| `teach/` | teaching a build by hand: edges, lessons, the soldering bench, the build pack |
| `world/` | places, creatures, games, people |
| `make/` | the make pipeline: conditions, detail, critic, in rounds |
| `view/` | everything drawn: the forge room, the look page, the phone, the benches |
| `kinds/` | the catalogue of kinds, by trade |
| `models/` | generated data files from makers' own CAD |
| `book/`, `life/`, `embody/` | the law book, the life graph, embodiment |
| `cli/` | every command-line entry point (`npm run nexus`, `works`, `breakdown`, `pack`, …) |
| `index.ts`, `works.ts` | the two doors kept at the root so existing imports go on meaning what they meant; both own nothing but `export *` lines |
## Before writing a new file or function

1. `ls src/nexus` (the whole listing: never `| head`, which hid `vehicle.ts` once and it was overwritten) and grep for the
   concern. If it is in the table, extend its owner. Before writing a file, check that it does not already exist.
2. If what you are about to write makes one named thing (a car builder, a kart builder), stop. Find the general rule
   that makes it and its relatives from data (a wheeled vehicle from its axles, tyres, frame, seats, power, implements).
   Per-product data (a real model's published figures) is fine; per-product code is a template.
## The drift gate: before spending a round on a fix

Recursive work drifts toward the most efficient path for the measurement, not toward what was asked. The gate is
the pause before a round where you ask whether this fix is still worth making. Pass it before tuning anything:

- **Will what I am tuning against still exist?** Do not tune a critic, a test or a threshold against a thing about
  to be replaced. (2026-10-08: the critic was not tuned to the box-bodied car, because that car was being replaced by
  a general vehicle maker. Tuning to it would have made the critic fit a template.)
- **Is the number I am moving the thing they care about?** Joint counts, test totals and finding counts are proxies.
  The person cares whether the thing is real, recognisable, buildable and expandable.
- **Am I picking this fix because it is easy to measure, or because it matters most?** If the most visible flaw
  in the screenshot is not what this round fixes, say why.
- **Would the user call this round progress if they saw only its result?** If not, stop and re-aim.

Say the gate's answer out loud in the round's notes when it changes what gets done, so the choice can be seen.
## Every round, ask these, then act on the answers

1. Does this already exist somewhere? Am I about to make a second one?
2. What does a person see first? Render it, framed so it can be seen whole, take a screenshot, and look at it.
   Would they recognise it at a glance? What would they call cheap, wrong or fake?
3. Blind check: give the screenshot to an agent with no context. Ask what it is and what is wrong with it. If it
   cannot name the thing, the thing is not done, whatever the tests say.
4. Am I measuring what they care about, or what is easy to measure?
5. Re-read "What is wanted" above. Is this round still aimed at it?
6. What am I not asking? (Scale against a person? How does it move? What does it sound like? What happens when it
   is clicked, taken apart, driven?)
7. What would a real engineer expect that is plainly absent? Ask a fresh agent each round, with this file's owners table,
   for the concepts a mechanical, electrical and manufacturing engineer would expect and do not find (2026-10-08: the
   user had to name mating parts, a bolt pattern finding its reverse and connecting, though "next are mounts (bolt
   patterns)" was already written here; holes cut, fits and tolerances, placement by constraints, fasteners sized by
   load, motion, electrical and fluid ports, shape from process and cost were absent with it). Act on what it names
   before polishing what the critic counts: a missing concept costs every build, a patched overlap costs one.
8. Run the breakdown queue (`npm run breakdown -- report.md`). Nothing new may wait as "not in the table", and the families
   at the top of "only its materials listed" and "several materials in one shaping" are broken out before new ones are
   added: a part is not stored until it is broken down. A new id is checked against the table first: an id written twice
   replaces the first unseen (`WRITTEN_TWICE` in `inventory.ts` must stay empty).
## Measuring a real product (a board, a tool, a machine)

Bottom up, never the whole first: the smallest parts are drawn from their makers' drawings before the thing they make
is put together from them.

1. Name each part: the maker's own list (its schematic, its manual's parts), else the part whose drawing fits what the
   photos show, said as "fits by its size", never as its part number.
2. Each part's sizes from its maker's drawing or its standard. KiCad's footprints (github.com/KiCad/kicad-footprints)
   are drawn from datasheets and name them: `python3 tools/measure/kicad.py '<library>.pretty/<glob>'` gives each one's
   outline, pads and datasheet. A size from nowhere is labelled typical or measured, with how.
3. Where it sits: calibrate every photo by four points known in millimetres (its mounting holes):
   `tools/measure/photo.py calibrate`, then read positions off its millimetre grid (`photo.py grid`) and outlines
   (`photo.py outline`). Tall parts lean out from the photo's middle: their tops are not their footprints.
4. More than one photo: a top view for where things are, the sides and corners for what a top view hides (a port on
   its side, a button pushed sideways, what lights are in a jack's face), the underside for what is under it. Where a
   side has no photo, its parts are marked as not placed from one.
5. Check the drawing against every photo: `npm run boardmap -- <id> <out.json>` writes each placed part's outline, and
   `photo.py overlay` draws them on each calibrated photo. A part not on its own outline is wrong.
6. Where its maker publishes a 3D model (a STEP: Raspberry Pi's mechanical reference models), read every solid's box
   from it (`tools/measure/step.py boxes`) and check the layout against it (`step.py check`): that model is the
   placement, the photo the look (mask, ink, copper, markings, what the model leaves out).
7. From each photo, in this order, each step feeding the next: `photo.py silk` (the silkscreen as a PNG on the board's
   mm), `photo.py small --silk` (the small parts, the ink left out), the board's small table into its layout, the map
   again, then `silk` and `traces` once more with the small parts placed. Vet every find on the photo by eye and
   `--skip` (recorded in the generated file) the regions where they were words, test pads or a hole's rim.
8. Through-hole joints are not drawn by hand: every lead, leg or tail that goes down through the board gets its pad and
   a solder fillet from `thtJoints` in `sbc.ts`. Give a through-hole part its tails (from its footprint and drawing)
   and it is soldered.
9. Then the room: render it, compare it beside its photos, and a blind judge (the round's steps 2 and 3).

The tools each step uses are in `docs/TOOLS.md`. When a step takes working out by hand twice, it becomes a tool there.


## What is open

The whole picture is in `docs/ROUNDS.md`; this is only what is not finished, with what blocks it.

**Being worked now** - mating and the geometry readers (`parts/mate.ts`). In order: a pocket's floor in a *box* or a
rolled section, which is the same well rule the rings and turned bores already get; then the mates of a whole assembly
chosen rather than listed, which is what would let a drawn machine be asked how it moves.

**Blocked on something outside this container**
- The user's likeness - waiting on the user's photos. Nothing else to do on it.
- 19 unpriced bill lines, and the parts sellers' category trees - the sellers' size tables render in JavaScript this
  network cannot run. Widening the network (environment settings, Network access) unblocks both.
- Some undersides and side views (the Orange Pi 5, the Pi 4B's Ethernet corner, the Pico's switch heights) - no photo
  of that face is reachable here.

**Open work, each with a named next step**
- The works: 16 stations at $2,395, judged 3/10. Two stand-ins left (the welder, the MSLA printer), the brake's own
  stand, bare walls, no stock or swarf, and the composed machines still read as lattices of posts and cubes.
- Boards: the Pi 3B+, Zero 2 W, Pico 2 and 2 W are still their class's layout; measure them as the Pi 4B and Pico were.
- The robot: its grips are not drawn (the pen grip round the iron); welding and typing on their own benches next.
- Lessons: the Pico's headers on the same edges; parts of three leads and more; words in the room making the circuit.
- The materials processor: milling and turning, refining, and a material's edges back to what it was.
- The life graph: the other messengers' rhythms where a study gives one, regions drawn as shapes, the 3D brain.
- The printers: the most advanced one by the same builder; the Voron's Stealthburner is still a rounded block.
- The four tidy ratchets, worked down by cause.
- **Internal gears and planetary sets now hold**, and what remains is the small-pinion case. Run 7z refused an
  internal pair over a 0.2 mm overlap it could not explain; Run 8a found it was one sign in the ring's flank (for
  an internal pair the line of action is the tangent touching both base circles on the SAME side, so the ring's
  flank is concave and its involute runs the other way round the tooth). The overlap test now reads zero at every
  tooth count and addendum tried, and a planetary set is built, drawn and proved. STILL OPEN: at 20° full depth a
  pinion wants 34 teeth or the ring's tip lands inside its base circle, where there is no involute to roll on —
  `meshing()` says so as a note rather than refusing, because the drawn pair still clears. The fixes are stub
  teeth or profile shift, neither of which this library does yet, and profile shift is the bigger prize: it is
  what lets a pair be cut for centres it was not designed for.

**Known gaps in the architecture**
- **One law, and the rest demoted to sensors** (`substrate/time.ts`, `npm run substrate -- time`). The user's
  reframe: nothing should be kept stable by a pile of laws; one thing advances the state (time) and everything
  else only reads it. Built as the kernel: proper time, the four-velocity invariant (v² + (c·dτ/dt)² = c², exact
  at every speed), and `sense()`, which turns any of the book's 252 into a `Reading` with no address — the
  decisive test runs every instrument over a state and asserts the state is unchanged. With c, ħ, k_B and 4πε₀
  set to one, every dimension is a power of time: a metre is time¹, a speed is **time⁰ (dimensionless — there is
  no such thing as a speed, only a fraction of c)**, action is time⁰, and each of the 252 lands on an integer
  between −4 and +4. **STILL A KERNEL BESIDE THE ENGINE, NOT THE ENGINE**: `substrate/`'s relations still bind
  addresses, so the state is still defined by laws rather than by time. Making the evolver the only writer is the
  large job this opens. Absent with it: the action principle as the generator (δS = 0, from which the 252 would be
  *derived* rather than reduced), gravity (the metric is flat), and the join to `clock.ts`, which already advances
  each region at its own time and is where this belongs.
- **Connectedness is a command, not an opinion — and the command is `node tools/unwired.mjs`, which already
  existed.** Run 8d wrote a second one (`tools/wired.mjs`) without listing `tools/` first, quoted its worse
  answer, and only found the duplicate by reading an unrelated file header. The two are merged: `unwired.mjs`
  keeps its census (every export no door reaches: test-only, dead, whole unreached files) and gained `path <a>
  <b>`, which says whether any chain of imports joins two modules and prints it — `parts/gears` "reached"
  `engineering/dcmotor` in seven hops through `inventory`, which is not a connection, and only the printed chain
  makes that obvious. Its walk also widened from `src/nexus` to all of `src/`, the scoping that had hidden
  `engineering/gears.ts` (the Lewis bending equation, unreached while `parts/drive.ts` went without it).
  **Tidy rule 24 is the causal fix**: every tool must be named in `docs/TOOLS.md`, so a second one cannot be
  written without opening the file where its twin already sits.
- **What a world does NOT account for is also a command**: `npm run substrate -- unaccounted`
  (`substrate/holes.ts`). `Runtime.gaps()` reports evaluations that could not finish; an absent law raises no gap
  at all — it raises nothing, runs clean and looks finished. Three findings: a **hole** (something reads an
  address nothing produces), a **dead end** (something produces one nothing reads — which is exactly how
  `parts/drive.ts` computes a mesh's friction loss in watts and drops it), and an **unapplied law** (one in the
  book whose every input is bindable here and which nothing instances). The first two are facts about the wiring;
  the third is a prompt, not a verdict — binding is by dimension plus a shared word, which is enough to be useful
  and not enough to be right. Its first run on a bare steel cube found one hole (`what bears it` — a lone place
  has nothing holding it up), nine dead ends (every place works out its section areas, second moments and moduli
  and nothing reads them until something bends it), and named `Moment of inertia of a rectangular prism about its
  centre` as applicable and unapplied, which is the rotational quantity the substrate lacks and `drive.ts`
  hand-codes.
- **`parts/drive.ts` joins torque only, and only on one shaft line.** A motor, a hand-placed train and a load now
  find their own operating point and spin-up, with the tooth strength and the shaft-into-bore fit checked. What has
  no equivalent yet: anything LINEAR (a leadscrew, a cylinder, a rack driving a load — the rack is drawn and
  meshes, but a drive line cannot end in one), more than one source on a shaft, a branching tree rather than a
  path, and the whole electrical and thermal side. Specifically: `motorrun.ts` already steps a winding's
  temperature over time but takes a constant load, so the next joint is feeding the drive's referred load into it
  and the drive's "it will cook" becoming a temperature instead of a warning; and the battery (task 52) is not in
  the loop, so the motor still assumes an ideal voltage source.
- **`mechanism.ts`'s `JointKind` has had `'gear'` in it since it was written and nothing produces one**, so the
  degree-of-freedom counter does not know a gear train exists. `drive.ts` solves the dynamics without it; the
  kinematics are still unjoined.
- The drive is reachable from `npm run gears`, not from the bench in the room: `view/gear-bench.ts` draws and
  turns the gears but does not yet show a motor on them.
- The inventory knows what is *in* a product; the kits know *where*. Joining them is the merge that ends "two
  generators". Begun: `parts/components.ts` draws 9,074 catalogue sizes, and most machines' brackets, springs, hinges
  and wiring are still drawn inline by their makers - each is next to become a component, commonest first.
- `embodyAny` is still apart from `ask/route.ts`.
- The go-kart on the track (`src/nexus/view/kart3d.ts`) is drawn by hand, apart from `machines.ts`.
- Planes, jets, cranes and power tools are not in `machines.ts` yet: each is a new architecture, to be added as data on
  a general builder the way the wheeled ones are.


## Working here

- **Before saying "I could not see it": `node tools/manny-see.mjs "<words>"`.** One command, the numbers and the
  picture together — every door that takes words, run on the same ask with its refusals kept, then the look page from
  the views that expose fakery (`three`, `explode`, `cut`) — and `Read` on a PNG shows it as a picture. `--numbers`
  skips the browser. It is the fastest way for any round to look at what it just made.
  What it cannot show, say so and ask for it in the round's notes. (It is named for the critic agent that is now
  retired — `docs/MANNY.md` says why and keeps his findings as a record — but the tool is a plain instrument and
  belongs to whatever round is running.)
- Gate: `npm run gate` (long; run it in the background and log to a file). Build the viewer:
  `npx vite build --config vite.view.config.ts --logLevel error`.
- The gate is around three minutes, and its wall clock swings by a sixth run to run on this host, so measure the suite's
  own test time (`npm run perf -- time`) rather than the clock. Its two long sweeps — every kit at three seeds and every
  kit through the make pipeline — are dealt over three files each (`tests/nexus/kits-every-*.test.ts`,
  `tests/nexus/make-every-*.test.ts`, which take their shard from `tests/nexus/sweep.ts`), because vitest runs files in
  parallel and a file's own tests in order, so one `it` over every kit is a shard no worker can split. Which kits are
  heavy is measured, not guessed (`PERF_SWEEP=<file>` writes what each one cost): of the thirty, the car park is 21.7 s
  of the 30.9 that making them all costs, the street 6.0 and the car 2.9, and the other twenty-seven are 0.19 s
  together — so the three are dealt apart and the car park sets the longest shard. Put a new long sweep in its own file
  for the same reason, and a test asserts the shards are the whole catalogue with no kit twice.
- Two tiers, because the full gate is 190 s and an inner iteration does not need it: `npm run quick` is
  `tsc --noEmit`, `tidy`, and `vitest run --changed HEAD` — only the test files whose module graph holds something that
  changed (10 files and 193 tests in 28 s, against 175 files and 190 s). It can miss a test that depends on a *data*
  file it does not import, so nothing is pushed without the full `npm run gate`.
- What the gate's wall clock is *not* bound by, each measured rather than assumed: `--no-isolate` (191 s against 191,
  and it breaks `pieces.test.ts`, which is the cross-file state leak that option risks), `--pool=threads` (190 s), and
  the two long sweeps' tails (sharding them left the wall where it was). The suite is bound by its own work spread over
  the workers there are, and 545 s of test time over 190 s of wall is 2.9 of this host's 4 cores.
- **Every door builds through `node tools/bundle.mjs`, never a raw `vite build`.** It skips the build when nothing
  it is built from changed (the hash of every file under `src/` plus the config and lockfile), which takes a repeat
  door run from 2946 ms to 2108 ms. A door script with its own `vite build` in it pays the second again, and two
  tidy rules hold the key honest — among them that no relative import under `src/` may leave `src/`, which is what
  makes the key the whole truth. `node tools/cost.mjs` is how any such cost is argued: it prints the legs and the
  floor it judges by, because Run 7x's "not worth it" was a feeling about a saving and the floor reversed it.
- `npm run tidy` is the half-second part of the gate that checks the tree's own shape, and it is the thing to run
  before and after moving anything. Its four ratchets (oversize files, name clashes, imports up a layer, a rule written twice) hold the
  present debt to the number: they fail on a new one by name, and they fail on a fixed one until its line is
  deleted, so the lists only ever get shorter. Never raise a number to make it pass.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
- The network allows GitHub and package registries only: makers' sites and datasheets come through search snippets,
  Tavily's extract, Firecrawl (its credits are low) or GitHub (KiCad's libraries, makers' documentation repos: ask
  for each with `add_repo` first, then a blobless clone and fetch only the files needed). The user can widen it
  under the environment's Network access.

## Last line

The user, 2026-10-12, on why a round that has to be told what to do step by step is the fault and not the task:
*"it's as complex as you make it you can make a tools for your tools you make pipelines for your pipelines you can
make codes for your codes you can make inventions for your inventions you can make anything"*. Every fault this file
records came back because it lived in someone's memory instead of in something that runs: duplicated files because
the first was out of sight, stale prose, a number nobody checked. So when something here is hard, slow, or keeps
going wrong, the answer is never that it cannot be done — it is a tool, a check or a loop that makes it ordinary,
and that tool goes in the list above, so the next round is not told again.

**"Don't take impossible as an answer" — always find a way.**
