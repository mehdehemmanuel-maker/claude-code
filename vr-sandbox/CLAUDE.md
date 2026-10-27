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
- "the point is to eliminate the need for manual stuff while maintaining the same results as a high level engineer from
  houses too environments too mechanical too software nodes need to be max capable eliminate the need for guessing and
  manual", "think outside the box … think about the pinnacle of it" (2026-10-27: hours had gone into hand-typed positions
  for single parts; the plan is `docs/PLACEMENT.md`: parts say what they need, a solver places, routes, sizes and explains,
  nothing placed by hand; each step shown to the user before the next)
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
| Blocks: what a node on a board of blocks can be (typed ports with units, settings, tests, sources), the library of them by field, ability and kind (every law a calculator), a duplicate refused; blocks merged into one that does more kept as adapters (`ALIASES`), boards moved on by `rewire` in `dataflow.ts` | `src/nexus/blocks.ts` |
| A board of blocks run: keys and a shared cache so only what changed runs, lists mapped, units converted on wires, groups folded, opened and saved as blocks, branches cut, dead blocks, twins and repeated wiring found | `src/nexus/dataflow.ts` (plan and status: `docs/NODE-ENGINE.md`) |
| The board of blocks: the coloured canvas, library (its Boards first: the starter boards and yours, by field), inspector-calculator, suggestions; the board's clock (played, it ticks only what reads it) | `src/nexus/view/nodes.ts` (on the dashboard; hosted in the space as `wall`) |
| The dashboard, the app's front door (`view/index.html`): the board with the library, a docked 3D view (entered to fill the page, or on to the space), the clock under it, the run log, results and metrics, variations of the chosen node; every panel read from the board as it runs | `src/nexus/view/dashboard.ts` |
| The 3D view docked in the dashboard: what the board shows, drawn by the space's renderer, pressed to choose its node | `src/nexus/view/dock3d.ts` |
| A part in 3D on a board of blocks: each 3D view block's picture, and full screen to turn and take apart | `src/nexus/view/nodes3d.ts` (draws with `kit3d.ts`) |
| The space (`view/space.html`, entered from the dashboard): nothing but what is made, in x, y, z, at any scale (S: the world scaled round you, the grid's cells a decade at a time) and through time (T: the board's clock, or its history), the panels floating where you reach them, on a screen or in a headset | `src/nexus/view/space.ts` |
| What the nodes make, drawn in the space and the dashboard: one instanced mesh per distinct piece; what is out of view culled by groups; long lists split lazily into groups; the biggest on the screen first, to a budget; far off a stand-in (4, 12 or 48 of its biggest pieces, the fewest under a pixel or two of error), tinier its box (as high and the colour most of it is); a governor on choosing and drawing time; positions from a floating origin; worlds without end (`tiled`) as super-cells; a horizon | `src/nexus/view/space3d.ts` |
| Things placed, never copied: a part or an assembly placed (at, turned, scaled, changed there), shared by every place; mass, bounds and counts once per distinct thing; rows, rings, grids, mirrors; frames (named places on a thing, found through what it places) and mating one thing onto another by them (`frame`, `findFrame`, `mateTo`) | `src/nexus/assembly.ts` |
| Rigid-body physics (Jolt): bodies falling, landing, sliding, tipping, resting, with each material's friction and bounce, hinges, slides and DC motors, the motion sampled 30 times a second; what the board makes let go as bodies and posed back at a time (`bodiesOf`, `posedAt`) | `src/nexus/sim.ts` (nodes: Let it go, Hinge, Push in `blocks.ts`) |
| A joint driven to angles at times as a servo drives it (trapezoidal speed), and the room a turn needs (Turn, Sweep in `blocks.ts`) | `src/nexus/motion.ts` (`Servo`) |
| What building complexity showed nodes need: Mate (by frames), what each touches, rules over rows, Clear away (deleting by where things are), Clashes, Onto the ground, the Clock, Signal cycle, Loop round a block, Follow a path (gaps kept, stop lines obeyed, kept every 30 s and folded into the round it repeats, so any time is always the same and a year on is fast), Forever (a lattice without end) | `src/nexus/blocks.ts` (the clock itself: `Engine.tick` and `clock` on a block in `dataflow.ts`) |
| A tyre as it is made from its size code and tread (layers, beads, belts, pitches, sipes, wear bars), made once per size; a machine's wheels as hinged bodies (`rollingOf`) | `src/nexus/machines.ts` (`tyreBuilt`; nodes Tyre, Axle, Vehicle, Vehicle (a real model) in `blocks.ts`) |
| Batteries drawn: a starting battery by its BCI group, lithium cells by format, packs of them (data: `data/batteries.ts`) | `src/nexus/components.ts` (`starterBattery`, `liCell`, `cellPack`) |
| A part's tree opened into assemblies, pieces swapped for a shared thing by name (`fitIn`), taken apart (`exploded`) | `src/nexus/assembly.ts` (nodes Fit in, Take apart) |
| A computer from its transistors: FinFETs at published process pitches, SRAM and logic cells, arrays, die, package, motherboard, PC | `src/nexus/computer.ts` (nodes Transistor, Logic or memory cell, Processor die, Processor package, Motherboard, Desktop PC) |
| How far a build comes apart: lumps (a piece drawn as one though the inventory says it is an assembly) by share of mass, recipes not met (`explodeAudit`, node Comes apart to the bottom?) | `src/nexus/components.ts` |
| What may not run into, touch or come near what: interference (triangle against triangle, unless one piece, said to pass (`passes`/`joins`, at any level of the tree), a fastener, or in a hole cut for it), clearance (`Part.clear`, `runsOn`), the heat gate (`Part.hot` against each material's `MAX_SERVICE`, falling off with distance, stopped by anything solid between) | `src/nexus/make/rules.ts` (`rulesOf`; node `check.rules` in `blocks.ts`) |
| A made part under its working loads: a spring as its maker made it (Shigley ch. 10 via `engineering/springs.ts`), a piston engine at a speed and a peak pressure (rod, rod bolts, crank pin shells, wrist pin, valve float); a part's material's handbook strength (`strengthOf`); a stress test of any block over a range of one input | `src/nexus/loads.ts` (nodes `load.spring`, `load.engine`, `sweep.range` in `blocks.ts`) |
| Parts placed by their round faces (a bore slid onto a shaft, its fit said) and a part bored where another passes through it | `src/nexus/mate.ts` (`onto`, `boreThrough`; nodes `onto`, `bore`) |
| The rules through a motion (each place in it, only what moves tried) | `src/nexus/make/rules.ts` (`rulesThrough`; node `check.turning` for an engine's crank) |
| A cutaway in the 3D view (a plane across x, y or z, the near half taken away) | `src/nexus/view/dock3d.ts` (`section`, the Cut button) |
| A surface's grain by its finish (cast sand, turned and ground marks, brushed, paint's orange peel, moulded texture), drawn in the shader from where it is, in metres | `src/nexus/view/kit3d.ts` (`GRAIN`) |
| One fastener of any size and kind (bolt, screw, rivet, stud): head by shape (hex, square, octagon, round, pan, countersunk, flange), drive, shank, helical thread, point | `src/nexus/makers.ts` `fastener` (node `make.fastener`) |
| One piece out of anything by name, to look at close up (and the 3D view's zoom to a piece: double press, `dock.focus`) | node `piece` in `blocks.ts`; `src/nexus/view/dock3d.ts`, `space3d.ts` (`pieceAt`, `piecesNamed`) |
| A piston engine from its first parts (pistons, rings, pins, rods, crank, block, liners, caps, shells, head, valve train, cams, timing, oiling, intake, exhaust, ignition, alternator, starter, pump, belt, flywheel), sized and weighed by its parts; what reads, cools, cleans and wires it (sensors, harness, thermostat, hoses, dipstick, PCV, catalyst, A/C, mounts); its maker's choices as a fit (`FITS`: electric pump, drive plate, VVT-iE, D-4S pump, EGR) | `src/nexus/engines.ts` (nodes `engine.*` in `blocks.ts`; `engineSpecOf`/`engineSize` in `machines.ts` ask it) |
| A gearbox from its first parts (case, shafts, gears, bearings, seals, final drive, differential; a manual's synchros and forks or a CVT's pulleys, push belt and torque converter) | `src/nexus/drivetrain.ts` |
| A car's closures built round their skins (doors, hood, deck lid: inner panels, beams, hinges, latches, regulators, trim) | `src/nexus/fittings.ts` `closureOf` |
| General makers by process and geometry (cast grid, coat, wrap, stack, straps, enclosure with cells, into cells, wound roll, fill) | `src/nexus/makers.ts` (nodes `make.*` in `blocks.ts`; used by `components.ts`, `engines.ts`, `drivetrain.ts`): also turned, coil, toothed, ring clip, chain run, chain path, housing, moulded chip |
| A vehicle's fittings drawn whole to their recipes (lamps, mirrors, doors, cab, hood, grille, bumper, frame, tanks, aftertreatment, stacks, fifth wheel, steps, fenders, air tanks) | `src/nexus/fittings.ts` (recipes `trk-*` in `inventory.ts`; used by `machines.ts`) |
| Seeds: things built from nodes and kept in the library as one node each, each built from the ones before (window, door, toilet, sink, bed; a room's fittings by its type; room; house by its plan; car; grass, terrain; road, stop light, crossing, road system; neighbourhood; city) | `src/nexus/seeds.ts` (their nodes: `terrain`, `scatter`, `wall`, `pick`, `rows.*`, `plan.rooms` in `blocks.ts`; `spawn` in `dataflow.ts`) |
| The board of blocks as a panel in the space: the page's own board and drawing (`wall` in `nodes.ts`), pressed by a ray; its strip and side panel | `src/nexus/view/nodes-wall.ts` |
| Research as a pipeline: sourced notes compiled into a reference tree (refusing what has no source, saying conflicts), references merged, entered in the inventory to open all the way down; a drawn thing held against its reference (drawn, short, missing, wrong: the gap); how finely a thing is drawn (its boxes by number and volume, the biggest first) | `src/nexus/research.ts` (the researched notes in `src/data/references.ts`; nodes `research.*` and `check.fidelity` in `blocks.ts`; the gap map in `docs/GAP-MAP.md`) |
| The gauntlet: what a block or an entry must come through to be approved (documented, unique, versatile, sourced, tests, robust, known, explodes, clean), each failure said; the unknown queue sorted by what its members share (one maker for a cluster) and researched in a loop to a fixed point (a family, a reference, the drawing read back, the web where reachable, a sibling as inferred); proposals fed in when sourced; tasks; events for listeners; guarded deletion | `src/nexus/gauntlet.ts` (its page `view/gauntlet.html` with `src/nexus/view/gauntlet.ts`; its nodes in `blocks.ts`; Wikidata's has-part in `research.ts` `webParts`) |
| Placement: what each part needs, read from what it states (mount, connect, keep-out from heat and motion, face, access; never typed), and maps of the space round part of a thing cell by cell (heat by the rules' own model, room from what moves, reach from a person at the open bay), as one cost, drawn as coloured cells; a part placed from the maps (every place it fits tried, what it must have held, the cheapest chosen, with why and the next best), and a catalogue item picked by the duty read from the thing | `src/nexus/placement/` (`model.ts`, `fields.ts`, `solve.ts`, `size.ts`; nodes `need`, `field`, `field.combine`, `field.show`, `place.solve`, `size.select`, `explain`; the plan in `docs/PLACEMENT.md`) |
| A winding as it is wound (on a former, round a ring's band, round a pole: its outer layer turn by turn as its wire, the layers under it as their packed solid; tested by the ring it lies within); a sensor as it is made (threaded probe, puck, block; its element by what it senses) | `src/nexus/makers.ts` `wound`, `sensor` (nodes Winding, Sensor); `Part.envelope` in `kits.ts`, read by the rules |

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
- the space has no way yet to ask for a build in words (the forge's routing to `embodyAny`, `conceive` and `kits` went with it);
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
