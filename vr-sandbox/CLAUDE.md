# Nexus and the space: read this before any work here

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
- "build a universal card engine that spans across all domains … a node graph that gets smarter meaning a node can be
  a tree that can branch more trees and even delete branches and it should become the most efficient system" (a
  challenge against another AI); "it should be colourful … mainly node pipeline but nodes can be blocks of code, can be
  artifacts like different types of calculators and yes you can make new ones and they act like efficiency building
  blocks like programming" (2026-10-25: plan drafted in `docs/NODE-ENGINE.md`, grown from `boards.ts` and `flows.ts`)
- "delete the environment the robot the factory all of that … make it just floating structured ui and you need a 3d
  renderer the space needs to become a x,y,z,s(scale),t(time) environment with grid cells … the main thing is nodes …
  collapse a whole nodded generation into one node and save that node into the node library as a reusable node
  permanently … create a motor … save it … put multiple of those nodes in and assign them different locations … create a
  drone out of those motors … save the drone … a drone swarm … generate cities just from 10 nodes … variant nodes that
  allow the change of a colour a material a size a shape an axis a hole a cut anything and mating logic and geometry and
  position for compatible parts like a bolt and a bolt hole or an input and output … advanced physics nodes … precise
  material values down to the element table densities and behaviours" (2026-10-26: the forge and its room deleted; the
  space, `assembly.ts` and its nodes built; mating, then physics and the periodic table, are next: the plan in
  `docs/NODE-ENGINE.md`)
- "the point of the city is not for you to just build a city no build a car out of nodes collapse it into one node save
  it the library as car build a window do the same build a door … a room … a toilet … the things that can change what
  type of room so you can just plug it in to the house node and change houses layout rooms layout by simply just clicking
  things on a node build a square foot patch of grass generate a whole terrain build a road and stop light generate a
  whole road system, build a sink … generate house with a few nodes … make them adjustable and generate a neighbourhood
  … a whole city" (2026-10-26, with the Seed Node System document: the boundary rule, the ten-level ladder, seeds as
  cached stand-ins placed by pointer, variants as overlays, spawners; `seeds.ts`)
- "I want the ui to look like this kind of like colorful … but real don't mock it don't build it without being usable
  fake pages no parts of the page that you try to copy the picture but don't have any meaning or connection to
  everything also the 3d viewer can be entered or just remained a normal sized tab … this city is just an example … to
  show you what tools the nodes will need to be able to build complexity … the point is to have the ability to generate
  such complexity and you trying to generate complexity and being honest with yourself where it's hard will allow you to
  be like one well then nodes need this ability mating ability proximity ability deletion abilities moving ability
  movement needs and all types of stuff" (2026-10-26: the dashboard, every panel read from the board; frames and Mate,
  what touches what, rules over rows, Clear away, Clashes, Onto the ground, the Clock, signal cycles, Follow a path; what
  is still missing listed in `docs/NODE-ENGINE.md`)
- "Could traffic board be under a board category in the library there's circuit boards and all types of stuff also how
  do we handle realism at scale like right now you're just like stress testing to find flaws and making things more and
  more powerful but yea keep reading the file and executing" (2026-10-26: Boards in the library, by field, yours saved
  beside them; stand-ins with error bounds and a frame governor, the Seed document's 3.12; cars that speed up and brake)
- "try to break rendering at some point once you finish up try to break rendering try to render tons of stuff make this
  space infinite in all axes and scale and time try to break rendering find the cause and find a trick" (2026-10-26: the
  breaks and their tricks in `docs/NODE-ENGINE.md`; culling, lazy groups, largest first, a stand-in pyramid, a governor,
  a floating origin, Forever, a horizon, folded time)
- "Okay now what next in the doc maybe realism or motion or physics" (2026-10-26: motion and physics as nodes, the
  document's 3.5 to 3.7: Let it go over the Jolt engine already here, Hinge, Push, Turn as a servo drives a joint, Sweep
  and Clashes for the room a motion needs; the next in `docs/NODE-ENGINE.md`)
- "build something complex like a car but you need it explode or down to its bolts … reuse things to make the build
  faster … batteries lots of cars use the same batteries or tires design realistic tires … geometry and sizing settings
  on the tires … build truck from the ground up develop a logic that would allow you to build different kind of vehicle
  easily … then a computer … the tiniest individual functional component is the transistor … test yourself with realism
  and physics … texture lighting physics" (2026-10-26: tyres as made, batteries by their standards, Fit in and Take
  apart, vehicles from their axles, wheels that roll in the physics, `computer.ts` from FinFET to PC; shadows)
- "that semi … very low quality and fake parts that probably couldn't be exploded to accurate parts … the fact that parts
  can be exploded down to the bottom is what makes designs more accurate upgrade the design logic for things so it's easy
  to make things look realistic and detailed and accurate" (2026-10-26: recipes in the inventory held by `explodeAudit`;
  the truck's fittings drawn whole in `fittings.ts`; every build's lumps said by mass)
- "you can't build anything by designing what it looks like … you gotta build each part each sub part each subsubpart
  and make it easier to generate new parts and assemble new parts … the build of a battery can fall into a lot of
  categories … follows a lot of the same processes and geometries of many things that's what I mean by node efficiency
  and versatility" and "parts exploded that have their own assemblies should be able to be exploded as well … showing
  screen shot of it on the node graph and it's small parts on the node graph" (2026-10-26: makers by process in
  `makers.ts`; the battery built from them node by node; explode inside an explode with focus; batteries in the vehicles)
- "the problem is you built the outer layer before the first parts every single piece need to be able to be exploded"
  (2026-10-27: the engine and the gearbox built from their first parts, sized and weighed by them; every vehicle's tyres
  built in depth; doors, hood and deck lid built round their skins; the audit now says what is only said, not built (a
  stated mass, "the rest of it") and what nothing identifies, so the outer-layer-first fault is measured, not hidden)
- "more attention to detail you can zoom in like you did to the computer chip make it easy to do that create more tools
  for yourself in the nodes … the engine looks all sorts of fucked up … make sure nothing intersects, touches, that
  shouldn't certain nodes need to define their parameters like shit that can't intersect touch or anything or like heat
  things it has a proximity gate for which certain materials can't exist stably … a bolt one node can be any size bolt
  screw or whatever assign the base geometry like a octagon for bolt circle for screw … then have a smaller circle
  protrude given the parameters of the length … then assign its rivets [threads] … one node that covers so much ground"
  (2026-10-27: the rules checker `make/rules.ts` (interference, clearance, heat gate) and node Nothing runs into
  anything?; every engine the machines use comes back clean of it; the one fastener node; zoom to a piece; take out a
  piece; turned parts with sharp edges)
- "what does the node setups look like and all of the sub parts setups and all of the sub sub parts … everything needs
  to be a node calculator nodes can be stress testers don't just rely on the nodes you have see if you need another node
  that would make things more efficient … what determines texture do you have advanced textures", then "Ok execute"
  (2026-10-27: parts placed by their round faces and bored where others pass (`mate.ts` `onto`, `boreThrough`; nodes
  Onto a shaft, Bore where it passes); the engine board made of its parts, each wired into what it is in (Engine piece,
  the head's and the engine's part inputs); load cases on drawn parts (`loads.ts`; Spring under load, Engine under load)
  and a stress test of any block over a range (Sweep (stress test)); parts sized from their loads (a valve spring by its
  redline, a rod's big end by its firing force); the rules through a turn of the crank (Turn it over and check); a
  cutaway in the 3D view; each finish's grain drawn in the shader. The checker was found blind to anything thinner than
  6 mm and was fixed)
- (with a photoreal cutaway of an inline four: fuel rail and regulator, coil packs, harness and ECU, alternators, A/C
  compressor, clutch, heat-wrapped header, dipstick) "you need to ask why it's not at this level of detail and define the
  gap map the bridge to getting this level of detail across different builds and execute create node pipelines for
  researching create a pipeline for compiling research create a pipeline for looking for sub components and sub sub
  components and then defining what's all missing and more pipelines to take stress out of your hands this nodes will
  make your life more advanced use them right" (2026-10-27: `docs/GAP-MAP.md`; research as sourced notes compiled into a
  reference (`research.ts`, `data/references.ts`; nodes Research notes, Researched reference, Compile research, Into
  the inventory, Its parts and theirs, What is missing?, How finely is it made?); the Corolla's engine held against
  Toyota's M20A-FKS went from 42 % to 82 % of the parts its sources name, its rules still clean; the maker's choices a
  `fit` (`FITS` in `engines.ts`). In-app research cannot reach the web or Claude (the relay is gone): the research is
  done by Claude with web search and kept as sourced data)
- "I want a separate node space where nodes have to go through gauntlets before they get approved like if there's any
  component that have sub components that aren't explodable and if them sub components have components or stress tests
  or even versatility … universal nodes all types of nodes real search nodes input output read nodes pass nodes task
  nodes event listeners … a unknown library queue a tester node a deletion node get creative", "make that unknown node
  research and gauntlets flow more advanced like have sorter … sorts them by things they have in common so a lot more of
  them can be made a lot faster … make sure that it's recursive … looks for components sub components sub sub components
  and it keeps going through gates until there's no more and even more advanced", and "the detail ain't there textures
  are too smooth … the copper is too smooth when it's supposed to be wire that's geometry don't half do stuff or no
  mocking because that ruins this app's integrity" (2026-10-27: the gauntlet (`gauntlet.ts`, page `view/gauntlet.html`,
  nodes `gauntlet.*`, `read.*`, `pass`, `task`, `on.event`, `unknown.*`, `research.loop`, `search.*`, `test.block`,
  `delete`, `make.sensor`); windings drawn as their wire (`makers.ts` `wound`, node Winding). Put through it, the
  library's 318 blocks first came back with 25 that gave NaN without a word, engine nodes that crashed on an 80 m bore,
  brake pads and zirconia that weighed nothing, a starter solenoid listed only as its materials, and the Rancher's
  engine with 6 collisions: each fixed)
- "Cables, hoses, circuits, wires, roads, piping all fall into the same category you can literally take a cylinder node
  make the material changeable make the inside either hollow or of a material like copper … and for routing logic you can
  have various different routing logics make sure to be thinking smart" (2026-10-27: `placement/line.ts`, nodes `line`,
  `route`, `size.line`; the autopilot's `reroute`)
- "switch to large scale operation like actually building and running 36 million transistors resistors actually running a
  real engine that actually will move thing like actually giving things life energy time meaning people driving cars
  walking dogs opening doors grabbing things … maybe there's a node system like proximity nodes where based off of its
  material or size you can automatically calculate its field of view proximity and tag it … wayyyy more advanced"
  (2026-10-27: the plan is `docs/LIFE.md`: signatures and affordances read from what things are, awareness by sensory
  reach, agents, characterise-once logic, an engine that drives; each step shown before the next)
- "smell isn't just a smell it's more like a chemical thing … a gas thing … there's more logic to it than smell but it
  can be tagged to smell" (2026-10-27: `aware/gas.ts`: substances with what they do at each concentration, sources by
  their physics, carried by the air; smell one sense's reading of it)
- "the point is to eliminate the need for manual stuff while maintaining the same results as a high level engineer from
  houses too environments too mechanical too software nodes need to be max capable eliminate the need for guessing and
  manual", "think outside the box … think about the pinnacle of it" (2026-10-27: hours had gone into hand-typed positions
  for single parts; the plan is `docs/PLACEMENT.md`: parts say what they need, a solver places, routes, sizes and explains,
  nothing placed by hand; each step shown to the user before the next)
- "sort everything every node ever node flow every type of flow every library every library type just organize
  everything make it so easy to navigate and use that it puts shame to other structures … how well everything can be
  reached and seen when needed even when you didn't know you needed it the navigation showed you that you need it", and
  before it "how does this node … apply to various other things … don't make anything too specific too the subject …
  ask yourself what already exists" (2026-10-28: `navigate.ts`; steps 6 to 8 of `docs/LIFE.md` made universal: a mate
  with force, a goal to any thing, any body from its segment table, sense wired into goal)
- "be careful with the library if there's a library of something that wasn't created from the node setup then it's
  outdated and not to be merged with this like old builds before nodes need to be deleted anything taken up space that
  is outdated needs to be permanently terminated and deleted" (2026-10-28: every file no page of the node app reaches
  was deleted (138 source files, 26,300 lines: the words-to-build pipeline, the old embodiment, the census and manifold,
  places and games, the old physics client), with their tests, their command-line programs, 43 docs about systems
  before nodes and `spikes/`; then every export nothing used; what is kept is what the node app reaches. Commit
  `e70944a` holds the last of it, if any of it is ever wanted back)
- "analyze everything what all is retired … merged, connected down the line … did you update the whole system or does
  that come later if so put it in system population and take all previous builds as before the update", and "the way
  nodes are categorized and named is bad it needs to be more technical, scientifically specified" (2026-10-29: steps J
  and K in `docs/REALITY.md`; builds dated from git like nodes, those before the update marked in the library)
- "I would rather get textures stunning and different tools that govern how something looks maybe math can determine
  something color like why is metal silvery grey why is copper its color … a auto texture that is editable like paint
  jobs or design", and "thing built before the update just throw it away it's gonna be too buggy … you can rebuild it
  way faster and way better now" (2026-10-29: phases 3 and 5 of the plan in `docs/REALITY.md`)
- "Make sure every peice built is stored correctly in node librarie every sub component stored every sub sub component
  make that a law you either use what's in the library or create something and store in the library" (2026-10-29: the
  built-parts library, `stock.ts`, and law 4 below)
- "Look everything your doing needs to be done in nodes or if missing a tool make it and put it in nodes Upgrade CAD
  Visual Reconstruction Accuracy … The system generates plausible geometry instead of faithfully reconstructing the actual
  object … Multi-view analysis … Feature extraction … Geometric constraints … Uncertainty tracking: Separate observed,
  measured, inferred, and unknown geometry. Never silently treat guesses as facts … Parametric reconstruction … Visual
  verification loop: Render the model from the original camera angles, compare silhouettes and feature positions against
  the reference images, identify errors, and iteratively correct them … Targeted clarification … Build a closed-loop image
  → geometry → CAD → render → compare → correct pipeline … Audit the existing implementation first. Reuse working
  components … Report measurable discrepancies and unresolved ambiguities instead of claiming unverified accuracy"
  (2026-10-29: the plan in `docs/RECONSTRUCT.md`)
- Always: no mocks; every number sourced, or labelled typical or an estimate; failures reported honestly.
- "don't lie again it hurt my feelings" (2026-10-29, after times and claims were stated as facts that were never
  measured): never state a time, a speed, a count or a result that was not measured or checked. Measure it first, or say
  plainly "I don't know" or "a guess". A headline number says what it counts (not "371 current" when 332 are laws), and
  "nothing contradicts it" is said only where something was there to contradict it.

## What can honestly be promised

A real product's exact surfaces are its maker's CAD and are not public. What is public and can be matched: its published
dimensions (length, width, height, wheelbase, track, seat height), its tyre and wheel sizes, its engine or motor and its
ratings, its mass, its part list and how it goes together. A product made here is true to those, with each figure's
source, and its shape approximates the surface. Say that plainly. Never call a model exact when it is not.

## One owner per concern: extend these, never write a second one

One line each, paths under `src/`; the full row (what each owns, its nodes, its rules) is in `docs/OWNERS.md`: read the row before working on
its concern. The organising principle (interfaces, envelopes, one graph), the branches beyond standard tools and the
known gaps are there too.

| Concern | Owner |
| --- | --- |
| Constants, quantities, units | `data/constants.ts`, `nexus/quantities.ts` |
| Laws (terms, kinds, nodes, solving, chains) | `nexus/book/`, `lawBlocks` in `blocks.ts`, `lawgraph.ts` |
| Numeric methods (roots, integrals, slopes, ODEs, linear systems) | `nexus/numeric.ts` |
| Materials and everything known of them; any mix worked out from its phases | `nexus/matter.ts`, `nexus/mixture.ts` (data: `mass.ts`, `elements.ts`, `data/materials.ts`, `periodic.ts`, `woods.ts`, `mixes.ts`, `constituents.ts`) |
| What a thing is made of; mass, centre, inertia, heat capacity | `nexus/madeof.ts` |
| Evidence, ±, nonphysical results, balances | `nexus/evidence.ts`; `judge`, `spreadOf` in `dataflow.ts` |
| The one test (every domain), and the generated docs (NODES, ATLAS, DEPENDENCIES, nodes' dates) | `tests/nexus/domains.test.ts`, `tests/nexus/docs.ts` (`UPDATE_DOCS=1`) |
| Nodes: blocks, stages, the library catalogue | `nexus/blocks.ts` (`docs/NODES.md` generated) |
| The built-parts library: every piece every build makes, stored by design, and its law | `nexus/stock.ts` (`src/data/stock.json` generated) |
| Running boards (cache, lists, units on wires, groups, clock) | `nexus/dataflow.ts` |
| Starter boards | `nexus/starters.ts` |
| Navigation (libraries, flows, search) | `nexus/navigate.ts` (`docs/ATLAS.md` generated) |
| Only what the app reaches is kept | the reach check in `tests/nexus/domains.test.ts` |
| Things placed, never copied; frames; fit in; take apart | `nexus/assembly.ts` |
| Layout, contacts, contact patches of a placed tree | `nexus/make/space.ts` |
| The contact graph of any thing (what touches what, from the geometry; each distinct thing once); what flows through it, how it bends, buckles and grows when warmed (steps C to F) | `nexus/graph.ts` (nodes `graph`, `flow`, `bend`) |
| Rules: interference, clearance, heat gate | `nexus/make/rules.ts` |
| Critic, detail, conditions, the make pipeline | `nexus/make/` (`critic.ts`, `detail.ts`, `conditions.ts`, `pipeline.ts`) |
| Mating by faces, ports, round faces, bores | `nexus/mate.ts` |
| Mates as measures in ranges; proximity | `nexus/placement/proximity.ts`, `relate.ts` |
| Placement, fields, sizing, repair, lines and routing | `nexus/placement/` |
| Loads on made parts; stress sweeps | `nexus/loads.ts` |
| Rigid-body physics (Jolt) | `nexus/sim.ts` |
| Servo motion | `nexus/motion.ts` |
| Power: engines run from their numbers, powertrains | `nexus/power/` |
| Parts: kits, shapes, cuts, mass | `nexus/kits.ts`, `mass.ts`, `form.ts`, `surface.ts`, `finish.ts` (and the surface a process leaves) |
| How a part looks: colour from optics, films, the look stack | `nexus/colour.ts`, `appearance.ts`, `data/optics.ts` |
| Parts from standards; components; catalogue | `nexus/families.ts`, `catalogue.ts`, `components.ts` |
| Makers by process (fastener, winding, sensor, …) | `nexus/makers.ts` |
| Engines, gearboxes, fittings, closures | `nexus/engines.ts`, `drivetrain.ts`, `fittings.ts` |
| Vehicles, tyres, machines | `nexus/machines.ts`, `panels.ts` |
| Computers from transistors; chips from netlists | `nexus/computer.ts`, `nexus/logic/` |
| Inventory, pieces, looks, breakdown queue | `nexus/inventory.ts`, `pieces.ts`, `looks.ts`, `breakdown.ts` |
| Research and the gap map | `nexus/research.ts`, `data/references.ts` |
| The gauntlet | `nexus/gauntlet.ts`, `view/gauntlet.ts` |
| Seeds (window to city) | `nexus/seeds.ts` |
| Bodies, agents, awareness, gases | `nexus/act/`, `nexus/aware/`, `nexus/life/segments.ts` |
| Expressions in words and units (the formula language nodes take); embodied machines | `nexus/generate.ts`, `nexus/embody/` |
| The app: dashboard, board, 3D dock, space, renderer, look | `nexus/view/` (`dashboard.ts`, `nodes.ts`, `dock3d.ts`, `space.ts`, `space3d.ts`, `kit3d.ts`, `look.ts`) |

## Before writing a new file or function

1. `ls src/nexus` (the whole listing: never `| head`, which hid `vehicle.ts` once and it was overwritten) and grep for the
   concern. If it is in the table, extend its owner. Before writing a file, check that it does not already exist.
2. Only the node setup is current. A library, a build or a module that the node app (its pages, its nodes, the boards
   they make) does not reach is outdated: never merge it in or build on it; delete it. Check with the reach scan
   (what `view/*.html` imports, followed through every import) before keeping anything that looks old.
3. If what you are about to write makes one named thing (a car builder, a kart builder), stop. Find the general rule
   that makes it and its relatives from data (a wheeled vehicle from its axles, tyres, frame, seats, power, implements).
   Per-product data (a real model's published figures) is fine; per-product code is a template.
4. The library law: every piece a build makes, at every depth (the car, its engine, the head, the valve, its spring), is
   taken from the library or made and stored in it. The built-parts library (`nexus/stock.ts`, kept in
   `src/data/stock.json`) stores each piece once by its design; every node that makes a thing is a build, and the one test
   fails on a piece built and not stored, one stored that no build makes any more, or one stored where its build no
   longer has it. `UPDATE_DOCS=quick` stores what is new and deletes what is outdated; reach for what is stored (search
   the library, the Stored part node) before drawing a piece again.

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

- Gate: `npm run gate`: the type check and the one test, `tests/nexus/domains.test.ts` (every domain's nodes, their own
  tests, one quick board per field, the reach check), under a minute; CI runs the same. `UPDATE_DOCS=1 npx vitest run`
  writes the generated docs and the nodes' dates (twice where nodes' code changed). Nodes built before the update are
  marked as such: the queue to re-check. Build the viewer: `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
