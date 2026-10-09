# Nexus and the forge: read this before any work here

This file is the anchor against drift. Long recursive work loses the point when each round optimises what it can measure
(tests green, numbers sourced, findings fixed) and forgets what the person asked for. Summaries after a context reset keep
the task list and lose the why. So the why lives here, and every round is checked against it.

## What is wanted (the user's own words, kept)

- "don't make templates for individual generation paths that's mock, make it have a pipeline where it can generate
  trillions of different combination of just anything based on any condition improve realism … there needs to be an
  attention to detail part of the pipeline"
- "merge them don't discard one or just not incorporate it, they may complement each other … why are there two different
  generators"
- "parts need to have more rules on them like if there a moving part like a tire an auger … then it's recommended it has a
  given amount of space"
- "I'm not sure how the car or go karts you made are such low qualities when you have so many parts mapped out and
  interconnectable and can expand any part for its sub parts"
- "generate every single vehicle, every vehicle type, make, model … forklift, semi, crane … plane, jet, with real parts …
  every go kart, four wheeler, dirt bike … every mower, every power tool, really buildable … click it and it is a 1-1
  exact model of the real product, expandable"
- "ask yourself what aren't you asking yourself; don't just think of math, think of emotion: how would they think about
  this, what would they say is bad about this, and then recursively fix it"
- "there's a lot of missing pieces … you haven't configured an environment that makes it easy for you to do certain
  things … handling texture and complicated shells … looking at how you got through the math, what could be better …
  recursively upgrade every process and sub-process: the car's fenders and panels, unibody, hoods" (the roadmap with it:
  Bezier/NURBS, proportional falloff, symmetry; a creator and a critic that changes the creator's rules; wireframe boxing
  then skinning; zebra stripes; G2/G3; practise on a front fender first)
- the CAD toolset list (2026-10-08): automatic constraints (tangency, coincidence, symmetry), a parametric feature tree,
  G2/G3 smoothing, clean quads, SubD cages, zebra and reflection maps, draft-angle analysis, wall-thickness checks,
  generative design, command prediction
- "don't just adopt all these tools: improve them, expand, find flaws, find a branch it opens that no one thought of; try
  to be the system that future systems reference"
- "Create every car there is you don't just design the outside … design each sub component the motor and other parts
  but also you first need to design the sub components of that and so on and then you can save that component under its
  name and category and now every other build using any of them is already ready screws nuts bolts, radios, buttons,
  wires … mix and match and make emergent builds like a semi truck-atv hybrid, 3d printer with robot arms on it, a new most
  efficient motor, a whole industrial plant … start small and work your way up … the most common parts" (2026-10-08:
  the component library, `components.ts`)
- "do the same thing for every 3d printer, metal filament and everything and robotic arms even the most advanced, all
  versions of filament makers, even metal filament makers, study all bots even filabot … futuristic manufacturing … tony
  stark level engineering" (2026-10-08: manufacturing built from the library)
- "money manager / business agent with employees on computers and a board room with a giant screen I can edit, basically
  a node tree that maps things in my situation out; don't lose context, find time for it" (2026-10-08: queued)
- "go through every part and make sure that every other part is inside and every part that's in those parts … almost
  100% visually accurate … scaling build up from tiny parts to full builds has 100 realistic shape and complexity; delete
  all the old build things off the app, they're old and low quality … upgrade the whole app's UI and abilities"
  (2026-10-08: `missingIn` in `components.ts`; old builds to be listed before they are removed)
- "don't forget bearings have sub components as well" (2026-10-08: rings, balls, cage, shields drawn)
- "for each new part stored it has to be queued for a break down just in case it has sub components, and then if it does
  it's the same for any new parts added … look for even more components in the sub component … some kind of table lookup;
  if the very specific part doesn't exist in the table queue it too, but first it has to be broken down" (2026-10-08:
  `breakdown.ts`, `npm run breakdown`)
- Always: no mocks; every number sourced, or labelled typical or an estimate; failures reported honestly.

## What can honestly be promised

A real product's exact surfaces are its maker's CAD and are not public. What is public and can be matched: its published
dimensions (length, width, height, wheelbase, track, seat height), its tyre and wheel sizes, its engine or motor and its
ratings, its mass, its part list and how it goes together. A product made here is true to those, with each figure's
source, and its shape approximates the surface. Say that plainly. Never call a model exact when it is not.

## One owner per concern: extend these, never write a second one

| Concern | Owner |
| --- | --- |
| Words to wants, figures, questions; designs from laws | `src/nexus/conceive.ts` |
| Generated structure for any intent; its body in space | `src/nexus/generate.ts`, `src/nexus/realize-space.ts` |
| Machines as real hardware from generated elements | `src/nexus/embody/` (`any.ts`, `tree.ts` load path, `stock.ts`) |
| Real products and what each contains, down to elements | `src/nexus/inventory.ts` (about 1,500 items) |
| Parts made to any size by their standard | `src/nexus/families.ts`, `catalogue.ts`, `partspace.ts` |
| Parts designed once in 3D from their standard, saved by name and category, used by every build (`use("bolt M8x30")`); assemblies of them (a bolted joint) | `src/nexus/components.ts` (kit `part`; checked over every catalogue size in `tests/nexus/components.test.ts`) |
| A part's mass from its shape, material and fill | `src/nexus/mass.ts` (re-exported by `kits.ts`) |
| Whether a drawn part holds every part its inventory says is in it, all the way down (`missingIn`); each component's own check runs it | `src/nexus/components.ts` |
| The breakdown queue: every item stored is queued, each thing in it looked up in the table (the inventory, its inner parts, the family that makes that size), what is not there or is listed only as its materials waits, said with what wants it | `src/nexus/breakdown.ts` (`npm run breakdown -- report.md`) |
| A part designed whole (`Part.sealed`, set on every library component) is fitted as it comes: the make pipeline's detail rules, its finish strip and its critic's moves leave it | `src/nexus/make/detail.ts` (`sealedIn`) |
| A miniature guideway's sizes (HIWIN's MGN table) and how it is drawn (every inner proportion named as typical) | `src/nexus/families.ts` (`MGN`, `mgnDims`), `src/nexus/components.ts` (`railParts`) |
| A face that carries what is fastened to it (a carriage's top, a tool flange: `Iface` kind `mount`), the free end of what moves, joined only to what holds it | `src/nexus/kits.ts`, `src/nexus/make/critic.ts` (chains) |
| A fastener locks two links only where it meets the other (apart by more than 20 µm it runs clear, as a rub does) | `src/nexus/make/critic.ts` (held) |
| A hole drilled in any part, any way (`Part.cuts`: round, or n-sided, a hex socket): cut from what is drawn (three-bvh-csg, each shape drilled once), its volume out of the mass | `src/nexus/kits.ts` (`Cut`), `src/nexus/view/kit3d.ts` (`drill`), `src/nexus/mass.ts` |
| A cutaway draws a solid's section flat and hatched in its own colour (a shell's inside as it is) | `src/nexus/view/look.ts` (`cut`) |
| Room to slide: a part that slides (`travel.slide`, a carriage on its rail) swept along its travel with all of its link; a fixed part in that sweep is in its way | `src/nexus/make/critic.ts` (critique) |
| How a picture is lit: a part alone in a bright room (a light table, so metal reads as metal), a vehicle in the softbox studio | `src/nexus/view/look.ts` |
| Parts placed by their mating faces: a port's pattern of holes, threads or pins (`Port` in `kits.ts`; NEMA faces, ISO 9409 flanges) mates its mirror, the part is placed by it and its fasteners laid from the library | `src/nexus/mate.ts` (`fit`, `mate`, `assemble`; kit `part` with "a + b") |
| What an inventory item looks like, how it comes apart | `src/nexus/pieces.ts`, `looks.ts` |
| An item the library draws, seen in 3D: drawn as the library draws it (not its look), taken apart by the viewer's own explode, each piece opening into its pieces, the part the library draws it as, or (one piece) what it is made of, drawn | `src/nexus/view/explode.ts` (`showPart`), `src/nexus/components.ts` (`componentOf`) |
| How a drawn part comes apart (`explode`): what is the part itself stays, those round it go out from its middle, those at its middle out past its ends along its length (heaviest first, each kind as one), and no piece parted onto another | `src/nexus/view/kit3d.ts` |
| The library on the phone: every drawn kind of part by trade, each size with its drawing's mass against its standard; three presses to stand it before you | `src/nexus/view/apps.ts` (`libraryApp`) |
| A clear room: in a headset nothing floats in your view unasked (one chip asks what to build; the clock is on the phone; the robot stands back to your side, its thought shown only while you look at it); the phone drawn half again a real one's size | `src/nexus/view/forge.ts` |
| Things with choices, as a placed tree of parts | `src/nexus/kits.ts` (drawn by `view/kit3d.ts`) |
| Conditions on loads, holds and reach | `src/nexus/conditions.ts` |
| Conditions on how a made thing is (age, setting, material, size) | `src/nexus/make/conditions.ts` |
| Edges as made (radius by material and process) | `src/nexus/finish.ts` |
| Oriented-box layout and contacts of a placed tree | `src/nexus/make/space.ts` |
| Attention to detail (joints, fasteners, seals, finishes, wear) | `src/nexus/make/detail.ts` |
| Critic (room to move, held up, walls, through, standing) | `src/nexus/make/critic.ts` |
| The make pipeline (conditions, detail, critic, in rounds) | `src/nexus/make/pipeline.ts` |
| Wheeled machines of every kind, from their published figures | `src/nexus/machines.ts` (cars, karts, ATVs, motorcycles, forklifts, trucks, lawn tractors) |
| Lofts, bent tubes, turned profiles: mass, bounds, covering boxes | `src/nexus/form.ts` |
| Freeform surfaces: NURBS curves and skins, interpolation, regions and trims, fairness, zebra, draft, seams | `src/nexus/surface.ts` |
| Panelled bodies on curve networks (side skin, hood, deck, cabin; arches from the wheels' sweep; keep-outs) | `src/nexus/panels.ts` (rules in `BODY_RULES`, their history in `RULE_UPDATES`) |
| Vehicles as points in a want-space (not a maker) | `src/nexus/vehicle.ts` |
| Interface contracts (shaft/bore, studs/nuts, chain/sprocket, drive/torque) | `Iface` in `src/nexus/kits.ts`, checked in `src/nexus/make/critic.ts` |
| A made thing on its own, framed, for review | `view/look.html` → `src/nexus/view/look.ts` |
| Places, rides and games | `places.ts`, `karting.ts`, `coaster.ts`, `pingpong.ts` |

## The organising principle: interfaces, envelopes, one graph

Parts declare what they provide and require (`Iface`): a hub needs a shaft of its bore, a nut needs a stud of its thread, a
driven axle carries at most a torque, a chain needs sprockets of its pitch. The critic pairs and checks every one with
numbers, and an interface is a connection, never an interference (an axle in its hub is not "in its way"). Interference is
judged by envelope, not by box: a wheel sweeps a ring (tyre to rim bore) with room to its arch and beside its sidewall, a
blade sweeps a disc inside its housing, and no repair rests a part on a moving one. Grow this, rather than adding layers:
next are mounts (bolt patterns), electrical (voltage, current), thermal (heat rejected) and service access.

Branches beyond the standard tools (the user asked for what no one thought of; keep growing these):
- **A skin is the fairest surface that clears everything inside it.** Arches come from the tyre's sweep through its lock
  and bump, not drawn; the hood from the engine and strut tops under it; next the roof from the seated people's heads.
- **The mesh is only ever a projection of the math.** Never edited, so it never needs retopology.
- **Panels are named by what they are for** (the arch of the front wheel, the hood), so changing a figure re-makes the
  same panels: no topological naming problem.
- **Constraints carry their reason**: G1 across a shut line because a highlight crosses it; a crease at the belt by
  intent; clearance because a part moves.
- **Lines are control polygons, not points forced through**: a B-spline never wavers more than its polygon.
- **Coincidence by construction, not by checking**: a panel meeting another is built on its edge (split by knot insertion,
  then built column for column on it), so they share knots and meet everywhere; the critic's check then only confirms.
- **A maker checks its own output before the critic does**: the wheelhouse liner is pushed out where it is in the sweep;
  what goes inside a body (seats, the dashboard's beam) is fitted to the body as made, measured off its skins.
- Next: shut lines placed by draft (where one press direction stops being formable); zebra judged from where people
  stand; rule updates kept only when they help cases they were not tuned on and do not worsen the blind judge.

Capability atlas (the user's direction, 2026-10-08): learn from open engineering tools (FreeCAD and Open CASCADE for
geometry and constraints, Gmsh and SALOME for meshing, MOOSE, Elmer, Code_Aster and OpenFOAM for physics, OpenModelica
for systems, LinuxCNC for machines) as ideas and architecture, each operation as UI → command → data → algorithm →
constraints → failure modes. Ideas and interfaces only: their code is GPL/LGPL and is not copied in.

Known gaps (from the 2026-10-08 audit, still open):
- the inventory knows what is in a product but not where it sits; the kits know where but not what. Joining them, so
  every placed part is an inventory item that expands into its sub-parts, is the merge that ends "two generators".
  Begun (2026-10-08, the user: "design each sub component … save that component under its name and category and now
  every other build using any of them is already ready"): `components.ts` draws stock and fasteners from their standards
  (9,074 catalogue sizes), and the wheel nuts, wheel studs, the detail pass's bolts and anchor bolts come from it; the
  ball bearings (rings, raceways, balls, cage, shields or seals), the steppers (bells, stator and coils, rotor cups
  and magnet, shaft, bearings, tie screws, leads and plug) and the HIWIN MGN7–15 guideways, C and H (rail, block,
  end caps, seals, retaining wires, both circuits of balls, seal screws; MGN15's grease nipple; within 6 % of HIWIN's
  masses, 66 balls in an MGN12H as rebuilders count) are drawn whole, every part their inventory lists inside them.
  GT2 pulleys (any tooth count and bore: PowerDrive's pitch and outside diameters and set-screw rule) and their ISO 4029
  set screws, in tapped holes drilled through the hub, are drawn whole too.
  The breakdown queue (2026-10-09) waits on nothing: 59,046 items taken, none listed only as its materials, none
  shaped from several materials in one process, nothing missing from the table, its deepest chain of things in
  things 12. The ~410 parts broken out of them have typical sizes and looks (`looks.ts`), not yet drawn as components
  of their own. Still
  drawn inline by their makers: most of every machine (brackets, bearings, springs, hinges, wiring, electronics);
  each is next to become a component, smallest and commonest first;
- the forge routes a make ask to three generators (`embodyAny`, `conceive`, `kits`) by guesswork;
- the go-kart on the track (`view/kart3d.ts`) is drawn by hand, apart from `machines.ts`;
- planes, jets, cranes and power tools are not yet in `machines.ts` (a fixed wing, a boom, a handheld tool are each new
  architectures: add them as data on general builders, as the wheeled ones are).

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

## Working here

- Gate: `npm run gate` (long; run it in the background and log to a file). Build the viewer:
  `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
