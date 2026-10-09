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
- "break down components and break down the other components … expanding the whole library … at like a bulk crazy scale
  like thousands and thousands … be nice on GPU and CPU … the only time you would load all that type of stuff anyways is
  if they expand and look into it … expand your regions of CAD … industrial … augers … electrical you're gonna need to
  know everything about circuit boards, build the machines that build the circuit boards … the microchips" (2026-10-09:
  `packages.ts`, every electronic package drawn to its die and bond wires)
- "we need a lot more embedded systems, raspberry pis, orange pis, all of d-robotics and the rdk x5, the worlds smallest
  and most precise robot arm, the actual language and programming processes and code … have a in app computer for
  programming and coding with you on the screen showing how I would use you to help me with that"
- "this whole thing is for me … you to be able to invent or help me bring my thoughts to life and then you teach me how
  to build things so have a training thing don't leave any part or anything unnoticed but make it infinite like anything
  I request … I'm gonna need that computer … my phone, soldering kit … tell me all parts I need and prices and you gotta
  try to keep prices down … source online … create parts that would be cheapest to get custom made within my current
  constraints … hand me what I need to take to a website that makes custom parts … you will be my iron man Jarvis … make
  it as realistic as possible"
- "every build that user requests to be taught is a 100 percent hands on walk through so don't say solder here que the
  soldering kit generation once it looks realistic use it in the build and have the user solder … that doesn't look like
  a orange pi 5 some logic is broken its important these builds are 100 accurate so nothing goes wrong or wasted money"
  (2026-10-09: a lesson is done by the user's hands in the room, with the tools drawn as they are; a board is drawn from
  its own measured layout, its maker's drawing and photo, or marked approximate where it is not yet)
- "make sure everything including these has to run through the que solver for any new parts or specific parts"
  (2026-10-09: every new part, the soldering kit's and a board's connectors among them, goes through the breakdown queue)
- "before confirming any measurements at the higher scale you gotta make sure the smallest sub sub components are
  accurate and then so on and then you will have 100% accuracy don't do anything mock every build has to be treated as
  such … do the same with the other stuff you recently made its flawed because you decided to skip the build process …
  make sure everything is 100 percent accurate internally at each sub component scale and externally from texture
  movement etc … it shouldn't just be the photo for things that hard to see grab multiple photos … make more advanced
  tools for yourself to make life a lot easier and add them to the process" (2026-10-09: parts first, each from its
  maker's drawing; then the thing they make, placed from several measured photos; see "Measuring a real product")
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
| Where a make ask goes (designed, invented, a kit by the thing's own name, a place, the inventory's own) and what of it was not done, said beside what was made | `src/nexus/route.ts` (`routeMake`; the forge's `perform` carries it out) |
| Inventing what turns one thing into another (waves into drinking water, a weight's fall into light, a flame into cold): a chain of real effects whose ports mate (power as effort × flow, a bond graph's rule; shafts of one kind but not one speed matched by as many gear stages as the ratio needs), sized by conservation from its source, under the floor of the laws, each effect made of inventory parts or said as a gap; on a board as steps | `src/nexus/invent.ts` (`invent`, `boardOfInvention`) |
| Generated structure for any intent; its body in space | `src/nexus/generate.ts`, `src/nexus/realize-space.ts` |
| Machines as real hardware from generated elements | `src/nexus/embody/` (`any.ts`, `tree.ts` load path, `stock.ts`) |
| Real products and what each contains, down to elements | `src/nexus/inventory.ts` (about 1,500 items) |
| Parts made to any size by their standard | `src/nexus/families.ts`, `catalogue.ts`, `partspace.ts` |
| Parts designed once in 3D from their standard, saved by name and category, used by every build (`use("bolt M8x30")`); assemblies of them (a bolted joint) | `src/nexus/components.ts` (kit `part`; checked over every catalogue size in `tests/nexus/components.test.ts`) |
| A part's mass from its shape, material and fill | `src/nexus/mass.ts` (re-exported by `kits.ts`) |
| Whether a drawn part holds every part its inventory says is in it, all the way down (`missingIn`); each component's own check runs it | `src/nexus/components.ts` |
| Every electronic package drawn whole from its outline (JEDEC: DIP, SOIC, SSOP, TSSOP, MSOP, QFP, QFN, SOT, TO-92, TO-220, TO-263, DO-35/41/201, SMA; EIA chip cases; leaded resistors with IEC 60062 bands; LEDs): one list of solids each, its die on its paddle and a bond wire to each lead, from which both its mass (the kinds' and families' g) and its drawing are read, checked against makers' published weights (MCC, Yageo) | `src/nexus/packages.ts` (`pkgSolids`, `chipSolids`, `axialResistorSolids`, `ledSolids`, `smdLedSolids`, `pkgMass`, `chipCode`, `bandsOf`), drawn by `src/nexus/components.ts` (`semiParts`, `passiveParts`); `tests/nexus/packages.test.ts` |
| Board parts drawn from their makers' drawings, each its own pieces down to its contacts (USB-C, HDMI A/C/D, USB-A single and stacked, RJ45 with its magnetics and lights, microSD push-push, pin headers, FPC and board-to-board sockets, tact switches, the 3.5 mm jack, a PicoBlade wafer, an electret microphone, FCCSP and LPDDR packages, moulded inductors), placed by a board's layout | `src/nexus/boardparts.ts` (`BOARD_PARTS`) |
| Single-board computers and Picos from their makers' pages (Raspberry Pi 5, 4 B, 3 B+, Zero 2 W, CM5, Pico family; Orange Pi 5 line; D-Robotics RDK X3, X5, S100): their figures and sources, their layouts (measured from photos where `layout` is given, else their class's rules and marked approximate), every part on them (BGA SoC, LPDDR, QFNs, chip passives, each connector, the header pin by pin; a measured board's small parts from its photo's table), every through-hole lead soldered (its pad and fillet, found from the parts as drawn), its silkscreen and copper from its photo as paint on its mask, their holes as mating patterns by bore, weighed from their solids | `src/nexus/sbc.ts` (`BOARD_DEFS`, `boardComps`, `thtJoints`, `boardMass`), kinds in `src/nexus/kinds/sbc.ts`, drawn by `components.ts` (`boardParts`); `tests/nexus/sbc.test.ts` |
| The Meca500 (Mecademic's six-axis arm): its figures from its manuals, its kinematics (forward, and inverse over its eight postures), its controller taking its manual's commands and answering in its codes, and the arm drawn with each joint a group a program turns | `src/nexus/meca.ts` (`MECA500`, `fk`, `ik`, `Meca500`), kind `src/nexus/kinds/robots.ts`, drawn by `components.ts` (`armParts`, `ARM_AXES`); `tests/nexus/meca.test.ts` |
| The computer in the room: programs for the boards and the arm in their makers' languages and libraries, run here (Python in Pyodide, shipped with the forge, against stand-ins for gpiozero, RPi.GPIO, Hobot.GPIO, machine, wiringpi and mecademicpy that keep every pin's change in the program's own time; the arm's commands on its controller, the arm moving before you), Claude beside it (the artifact's `sample`, else the ask sent to Claude Code), and each target's steps on the real thing | `src/nexus/codesim.ts` (`TARGETS`, `PY_PRELUDE`, `readPy`, `runMeca`), the phone's Computer app (`computerApp` in `src/nexus/view/apps.ts`), the forge's `computerRun`, `computerAsk`, `playArm`; `tests/nexus/codesim.test.ts` |
| What things cost and where they are sold: each price a seller's own page, the figure it showed and the day seen (prices move: a sighting, never a constant), stock only where the page said it, used or asked-for marked so; the cheapest offer for so many with what it needs that you lack counted in (a Pinecil and the USB-C supply it does not come with) | `src/nexus/prices.ts` (`PRICES`, `cheapest`, `costBy`); `tests/nexus/buildpack.test.ts` |
| Custom parts made from a file by a service: a flat profile (outline, rounded corners, holes; first, a plate drilled to each board's own pattern, ISO 273 clearances, brought in to fit a board maker's $2 size), written as DXF, STL and Gerbers with an Excellon drill file; every way to have it made, costed by each service's own published terms or said to need its quote, cheapest first | `src/nexus/fab.ts` (`plateFor`, `dxf`, `stl`, `gerbers`, `routesFor`, `fabPack`) |
| The soldering kit, each tool drawn whole from what its maker publishes and the rest an estimate said so: PINE64's Pinecil V2 (shell, grip, stainless core, its board's chips in their packages, display, switches, USB-C and DC jack, screws; its TS100-type tip's contacts, sleeve, heater and iron-plated point; 28.65 g drawn against 28) and Hakko's CHP-170 cutters (bulletin PB489: 2.5 mm high-carbon steel, 138 mm, 62 g) | `src/nexus/kit-solder.ts` (`pinecilV2`, `tsTip`, `chp170`), kinds `solderiron`, `flushcutter` (`src/nexus/kinds/tools.ts`), drawn by `components.ts` (`kitParts`, `compPart`) |
| A hand-soldered through-hole joint: the tip's heat into pad and pin (wet or dry contact), the alloy's solidus and liquidus, the solder fed melting or not, the fillet's volume, graded as IPC-A-610 would (good, too little, too much, cold, overheated) with what to do; its figures estimates chosen so a tinned 330 °C tip melts 60/40 at a Pico pin in about a second | `src/nexus/solder-joint.ts` (`step`, `grade`, `idealVolume`, `timeToMelt`, `ALLOYS`, `PICO_PIN`); `tests/nexus/solder-joint.test.ts` |
| A lesson for every step of making a thing for real: steps in order, each with a check you can see, its dangers first, its tools by their price keys, its source; which a build's processes call for, and those no lesson covers said | `src/nexus/lessons.ts` (`LESSONS`, `lessonsFor`, `ledResistor`) |
| A build pack: what is asked for (and what you have, and would spend) read into the library's parts, each at its cheapest real offer; what making it calls for worked out from what it is (a card and supply for a Pi, headers soldered or bought on, whichever costs less overall); only the bench those steps need; the custom part and its cheapest maker; what would spend less; the lessons; as a page, a zip, the phone's Build pack app, words in the room ("what do I need to build …") and `npm run pack` | `src/nexus/buildpack.ts` (`pack`, `haveOf`, `packText`, `packZip`, `packPart`), `src/nexus/pack-main.ts`, the phone's `packApp` (`src/nexus/view/apps.ts`), the forge's `packFor`, `packWords` |
| The breakdown queue: every item stored is queued, each thing in it looked up in the table (the inventory, its inner parts, the family that makes that size), what is not there or is listed only as its materials waits, said with what wants it | `src/nexus/breakdown.ts` (`npm run breakdown -- report.md`) |
| A part designed whole (`Part.sealed`, set on every library component) is fitted as it comes: the make pipeline's detail rules, its finish strip and its critic's moves leave it | `src/nexus/make/detail.ts` (`sealedIn`) |
| A miniature guideway's sizes (HIWIN's MGN table) and how it is drawn (every inner proportion named as typical) | `src/nexus/families.ts` (`MGN`, `mgnDims`), `src/nexus/components.ts` (`railParts`) |
| A face that carries what is fastened to it (a carriage's top, a tool flange: `Iface` kind `mount`), the free end of what moves, joined only to what holds it | `src/nexus/kits.ts`, `src/nexus/make/critic.ts` (chains) |
| A fastener locks two links only where it meets the other (apart by more than 20 µm it runs clear, as a rub does) | `src/nexus/make/critic.ts` (held) |
| A hole drilled in any part, any way (`Part.cuts`: round, or n-sided, a hex socket): cut from what is drawn (three-bvh-csg, each shape drilled once), its volume out of the mass | `src/nexus/kits.ts` (`Cut`), `src/nexus/view/kit3d.ts` (`drill`), `src/nexus/mass.ts` |
| A cutaway draws a solid's section flat and hatched in its own colour (a shell's inside as it is) | `src/nexus/view/look.ts` (`cut`) |
| Room to slide: a part that slides (`travel.slide`, a carriage on its rail) swept along its travel with all of its link; a fixed part in that sweep is in its way | `src/nexus/make/critic.ts` (critique) |
| How a picture is lit: a part alone in a light tent, as a maker's product photograph is taken (white walls, a softbox overhead and in front, a lit sweep under it, so metal mirrors white: a Pi 5's shells and pins read their photo's), exposed as for a grey card so a colour reads as itself, on Khronos' PBR Neutral curve so a colour keeps its hue (a Pi 5's mask reads its photo's), a vehicle in the softbox studio; an underside lit from below, as a board is turned over to photograph it; the forge room the same way (a room for metal to mirror, its light exposed for a grey card, `forge.ts`) | `src/nexus/view/look.ts`, `src/nexus/view/forge.ts` |
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
- the forge routes a make ask by `route.ts` (2026-10-09: a kit found by the thing's own name, never by a word in what it does, which had made nine sunflowers of "a drone that plants trees"; what it does that was not done, said); `embodyAny` is still apart from it;
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
  silkscreen (pale grey ink, saturation under 45 and value over 215, a tin end's solid blob dropped) as a bilevel PNG
  with `--ts`, and the ink's colour. `traces`: the copper under the mask, its mask's hue read off the board, and the
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
- `tools/look.mjs`: render any ask from named views (`node tools/look.mjs <viewer dir> <out dir> "name|words=…&view=…"`;
  `ortho=1` for a view to set beside a photo, `exposure=`, `env=`, `sun=`, `tone=aces` to try the light; it prints the
  part's `lift`; the light tent's `back=` (a backdrop as bright as the photo's studio had it), `floor=rrggbb` (what it
  stands on), `probe=1` (each metal face's reflection captured from where it stands, itself left out, box-projected:
  a socket's mouth dark inside as photographed; each plate (two sizes over `probeown=` mm, 4 by default, the third a
  millimetre or less) its own, a shield bent round a part sharing its part's; a board in about 90 s on software GL:
  `LOOK_WAIT=` ms for longer); `ao=` mm, screen-space occlusion, does not darken
  a mouth yet and drops the sun's shadow: not to be trusted); `npm run boardmap -- <id> <out.json>` writes a board's drawn outlines for `photo.py overlay`.
- `tools/forge-look.mjs`: the forge room as the user stands in it, what is asked stood before you as "3d <words>" does
  (`"name|words|key=…&sky=…&env=…&lamp=…"` to try its light): a part judged in the room it is seen in, not only on
  the look page's bench.
- `views.py`: every photo on one sheet; one photo in full-size tiles to scan; a zoom; `find`: a part boxed in one photo
  found in the others by its features (says "not found" rather than guess when the views differ too much: then
  calibrate each photo by four points of the same plane and use `photo.py same`).
- `kicad.py`: a part's drawing from KiCad's footprints, with the datasheet it was drawn from.
When a step takes working out by hand twice, it becomes a tool here, and a line in this list.

## Now (2026-10-09; read before resuming)

In order; each through the breakdown queue, rendered, compared with its photos and judged blind before it is done:
1. The Orange Pi 5 (done 2026-10-09 but for its underside): its parts first (`src/nexus/boardparts.ts`: each
   connector, switch, header, socket and chip from its maker's drawing or standard, with what fits by size said so),
   placed from its measured photos (`BOARD_DEFS` layouts in `sbc.ts`), the right way round; its 98 small parts placed
   where its photo shows them (`sbc-opi5-small.ts`, by `photo.py small`); its HDMI's top lanced for its two spring
   fingers and open at the back where the contacts go down, as its photo shows; its chips marked as read off the photo;
   its mask and its small parts coloured as the photo shows them. Its underside has no photo reachable here yet
   (orangepi.org/.net refuse this network): the M.2 socket is placed from its two holes, the rest said as not placed.
   The look page's light room is exposed as for a grey card (0.44: its floor and a Pi's mask read their own colours;
   at the old 1.3 everything read nearly three times too bright); the forge is a dark room with no environment, so a
   colour is kept as its photo's. Metal is drawn by what it reflects head on (gold's linear (1.0, 0.77, 0.34)), and brass,
   bronze, tin and solder are metal to the viewer.
2. The Raspberry Pi 5 (done 2026-10-09 but for its underside's look): placed from its maker's 3D model (RP-004882-DD),
   its board 1.4 mm with R3 corners and the Active Cooler's two holes; its USB stacks and RJ45 inside and under as their
   footprints have them (mouths lined, insulator blocks, tails and legs through the board, soldered); its silkscreen,
   copper, mask colour, chip markings (BCM2712's lid measured at its height: 16.4 mm, pressed with a band), a crystal
   the model leaves out and 18 small parts from Raspberry Pi's own photo (raspberrypi/documentation 5.jpg). Many of its
   0201s are past what that photo resolves and are not placed. Then rendered from its photo's own camera and set beside
   it part by part (photo.py camera): its header pins tin, its FPC sockets cream with brown locks, its USB stacks'
   latch springs, side springs, windows, detents and insulator posts and its jack's skirts and marking (a Trxcom
   TRJG0926HENL) where the photo shows them, every shell bright nickel; the forge's light, which had washed its mask
   to a clipped mint (#63ffdd for 0x21b984), exposed for a grey card with a room for metal to mirror (its shells had
   drawn black). Still to do: the LPDDR's marking turned and its maker's logo, RP1's logo, the micro-HDMIs' backs.
3. Every other board the same way, each marked approximate until it is: the Pi 4B, 3B+ and Zero 2 W next (their photos
   are in raspberrypi/documentation's computers/raspberry-pi/images; look for their makers' STEP models first). The
   Pi 4B (measured 2026-10-09, no longer approximate): its photo calibrated by three holes and six header pin tips (its
   fourth hole hidden: 2.5 px rms); its ports from Raspberry Pi's drawing (its Ethernet on the far side, the USB stacks
   nearer); its sockets, SoC, memory and can from the OpenSCAD Raspberry Pi library's Pi 4 (its frame x across, y
   along: our z = 56 − its x), which agrees with the drawing on every port; its VL805, PHY, PMIC, inductors and PoE
   header cast down from the photo; its silk, copper, mask and 28 small parts from the photo; its camera and display
   sockets 15 contacts at 1 mm, their lock a grey bar up the outer side, contacts tin; every chip's marking as read.
   Its AV jack (J7, the 3B+'s too) its own body off both photos: a black face 6.7 × 6.1 with its bore (r 1.75, fitted
   to its ellipse) centred 3.05 up, its nose 1.5 past the edge, a tin-plated shell with windows and soldered legs, a
   back housing open on its lever; at 53.85 mm, as its photo puts it (its drawing says 53.5, the hole beside it true
   to a pixel). Its two lights at its left edge (paler than any capacitor, ACT and PWR printed by them; 0603s by their
   blur, the photo soft there). Its power chip's corner read by eye: a SOD-123F diode, two DFNs, a SOT-23-6, its
   capacitors 0603 and 0805 (the finder had taken some for inductors), its R47 inductor 3.6 × 4.0 × 2.5 (its base's
   edge, not its top, gave its place), J2's three unfitted holes. Its USB-A tongues' tips 0.6 mm behind their faces
   (the photo shows a band of tongue under each lip, which a tip 1.3 mm in hides) and their four USB 2.0 contacts
   springs bowed 0.5 mm under them. Its USB 2.0 stack 0.8 mm further out than the OpenSCAD model put it (its face
   2.95 mm past the edge, not 2.1): its legs' plated holes by J11 read on the board at 71.88 and 77.55, its footprint's
   0.98 and 6.65 from its back; its side read square-on (rectify): springs U-cuts 7.0 to 1.55 behind its face, rooted
   in front and tapering, two embossed slots near its face, a rib between its mouths, its back plate's flap 2.6 mm onto
   each side with two latch windows. Its USB 3.0 stack 0.5 mm further out (its top's front edge against the render's,
   read as the USB 2.0's was: 0.08 mm off once its legs placed it). Its Ethernet jack Trxcom's outline (TRJG0926HENL's
   listing: 15.90 × 21.30 × 13.40; its face reads 15.8 wide) 0.7 mm further out by its top's back edge (±0.5: the
   photo's camera is fitted far from that corner and its two edges disagree); its face read square-on: the shield
   across it, the moulded mouth 11.6 × 8.4 a millimetre under its top with the latch's notch under it, the shield's
   cut 12.7 wide round it, its green light in the corner toward the USB ports. Still to do: its Ethernet's place to
   0.2 (a photo with that corner in view, or its own drawing), its marking's sizes (Trxcom's logo large), the
   metal's tone (the photo's shells grey with deep reflections, the tent's all bright), the DFN under its power chip
   larger than drawn, its USB-C's rear legs, its underside (no photo).
4. The Meca500 checked the same way: each link and drive against its manual's drawing; how it moves against its limits.
   Its `joint-drive` (listed only as its materials) is the one item the breakdown queue leaves waiting: it is broken
   out (motor, reduction, encoder, bearings, each drawn) in this round, not before.
5. The soldering kit as real tools (iron, stand, sponge, solder, flux, helping hands, cutters), judged until real.
6. Hands-on lessons in the room: the user holds the iron, heats pad and pin, feeds solder; a joint judged cold, good or
   bridged; a step done only when done (the Pico's headers first).
7. Prices for the common parts the build packs list without one (motors, hot ends, boards, belts, rails…).
The network allows GitHub and package registries only: makers' sites and datasheets come through search snippets,
Tavily's extract (it returned Würth's datasheet text), Firecrawl (its credits are low) or GitHub (KiCad's libraries,
makers' documentation repos: ask for each with add_repo first, then a blobless clone and fetch only the files needed);
the user can widen it under the environment's Network access.

## Working here

- Gate: `npm run gate` (long; run it in the background and log to a file). Build the viewer:
  `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
