# Nexus and the space: read this before any work here

This file is the anchor against drift. Long recursive work loses the point when each round optimises what it can measure
(tests green, numbers sourced, findings fixed) and forgets what the person asked for. Summaries after a context reset keep
the task list and lose the why. So the why lives here, and every round is checked against it.

## What is wanted (the summary; every word the user said is in `docs/WANTED.md`)

- **A node system that builds anything** from real parts, each part from its own sub-parts down to the bolt (and the
  transistor), every piece stored once and reused (the library law), any board folded into one reusable node, so
  complexity compounds: a motor, a drone, a swarm, a car, a house, a city.
- **Real, not mocked:** real products true to their published figures, built from the inside out, explodable to the
  bottom; physics, materials (down to the elements), rules for heat, and no overlap possible (never checked for: made
  impossible, decision 0021); honest about what is
  approximated. A real product's own data is held fixed: a finding on it is checked against the real product first and
  never tuned away to please our checker.
- **No manual work, no guessing:** parts say what they need and solvers place, route, size, check and fix (constraints,
  changes that follow, repair loops as nodes); the eight fundamental systems (spatial, material, physical laws, time and
  change, causality, composition, multiscale, rendering) as the frame, rendering the output, not the foundation.
- **AI in the loop, engineered:** every service a node; prompts engineered like circuits (one tagged task per call,
  failure-aware pipelines of AI gates, judged blind, never one giant prompt); an AI in the app that works through nodes;
  every AI flow explained step by step (who waits for what, reads what, writes what, where it can fail).
- **Speed and focus:** small cases first; stop anything past two minutes and ask whether a pipeline is missing; test what
  changed, not everything; targeted context (this file routes to the rest); screenshots as work lands.
- **Always:** no mocks; every number sourced, or labelled typical or an estimate; failures reported honestly. "don't lie
  again it hurt my feelings": never state a time, a count or a result that was not measured or checked; say "I don't
  know" or "a guess" where it is one.

## Build only with the operations (decision 0021; the user, 2026-11-02)

- Everything made is made with the operations of `nexus/room.ts` (the nodes Make a solid, Stack, Around, Into a room,
  Onto a face, Ring of copies, Through a line): no x, y or z is ever an input, so no piece can be put where another is.
  Never write an `at` or a `rot` by hand; the count of those (`node scripts/by-hand.mjs`) may only fall.
- The old builds were deleted at the user's word ("get rid of the old builds", 2026-11-02): the cars, trucks and karts,
  the engines, gearboxes, body panels and fittings, the computer, the creatures, the house, room, road and city seeds,
  and picture to model. Do not restore them or copy from them out of git history; a thing they made is made again with
  the operations, from its published figures.
- Old and not to be built on, still in the library until the operations cover what they do: the nodes that set a place
  by number (`place`, `array`, `mirror`, `mate`, `onto` (onto a shaft), `turn`, `move`) and the coordinate solvers
  (`place.solve`, `auto.loop`, the placement fields and routes in `nexus/placement/`). Entries in `docs/REALITY.md`
  before 2026-11-02 describe builds that are gone.

## The critic, every session (the user, 2026-11-02: "why do I have to say all of this")

The user should never have to say that code is broken or left over, that a build is blocky or has pieces through each
other, or that something researched was never built. At the start of every session, and before telling the user that
anything is done, run the critic (`../.claude/agents/critic.md`: it opens every board with `node scripts/audit.cjs`,
looks at every picture, holds the app to `docs/WANTED.md`, finds dead code and planned work never built, and fixes the
worst). What it finds that a person would see comes before any planned task. What the user has to point out is the
critic's miss: add it to the critic's checks.

## Where to read for what (targeted context: read only what the work needs)

| If the work is about | Read |
| --- | --- |
| What the user asked, in their words, and when | `docs/WANTED.md` |
| Which module owns a concern, in full (its nodes, its rules) | `docs/OWNERS.md` (the one-line table is below) |
| What is next, and in what order; the task in hand | `PROGRESS.md` (the task in hand, the next three, what is open), `plan/INDEX.md` (the start queue, every task) |
| The plan: the vision and the advantage, the rules and their checks (`CONSTITUTION.md`), the phases' specs with failing tasks, the decisions, the research, the questions | `plan/README.md` (how it works), `plan/INDEX.md` (its state, compiled: every task, every fault found in the code, the open questions) |
| How the AI in the app is told to build (its whole instruction) | `docs/FOR-AI.md` |
| What depends on what in the code; the disciplines tree nodes are classed by | `docs/DEPENDENCIES.md`, `docs/DISCIPLINES.md` (both generated) |
| What was done and measured, round by round | `docs/REALITY.md` (a log: search it, do not read it whole) |
| The engineering compiler's 30 stages | `docs/COMPILER.md` |
| Agents, awareness, bodies, gases | `docs/LIFE.md` |
| Every node, generated | `docs/NODES.md`; the library's map `docs/ATLAS.md` |
| A large module (`blocks.ts`, `dataflow.ts`) | its route map at its top: read the section named there, not the file |

## When work is slow: step back

- **Rough the whole first, polish at the end** (the user, 2026-11-05: "if something takes too long cut it wether it's a
  audit test or whatever we build rough the whole thing then come back at the end and polish it"). Every part of a round
  is built rough before any one is polished; anything past its time (an audit, a test, a run, a build) is cut, never
  waited on, and what was cut is said and listed for the polish pass. Long runs carry their own limit (`timeout 120`,
  the audit's `AUDIT_SECONDS`).
- Past about **two minutes** on one run, or **three tries** at one fix: stop. Ask whether this is population (easy, just
  many) or a **missing pipeline** (the same judgement made by hand again and again). If it is a missing pipeline, say so
  and build the pipeline (a board of nodes, AI gates where judgement is needed) instead of doing the next one by hand.
- Test what changed: a probe on the one thing, `npm run gate:field` on the fields touched; the whole gate once,
  before pushing. A test that guards nothing the change touches is not run while working.

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
| Laws (terms, kinds, nodes, solving, chains) | `nexus/book/`, `lawBlocks` in `blocks.ts`, `lawgraph.ts`; the algebra under them: `term.ts`, `dimension.ts`, `evaluate.ts`, `status.ts`, `identity.ts`, `law.ts` |
| Numeric methods (roots, integrals, slopes, ODEs, linear systems) | `nexus/numeric.ts` |
| Materials and everything known of them; any mix worked out from its phases | `nexus/matter.ts`, `nexus/mixture.ts` (data: `mass.ts`, `elements.ts`, `data/materials.ts`, `periodic.ts`, `woods.ts`, `mixes.ts`, `constituents.ts`) |
| What a thing is made of; mass, centre, inertia, heat capacity | `nexus/madeof.ts` |
| Evidence, ±, nonphysical results, balances | `nexus/evidence.ts`; `judge`, `spreadOf` in `dataflow.ts` |
| The kernel: it checks certificates, never searches; exact rationals and outward-rounded intervals; imports nothing outside itself; a second checker apart (`scripts/kernel2.py`) | `kernel/` (its one door `check`); the certificates Nexus builds for it, and an AI change's diff | `nexus/certify.ts` |
| The hooks that refuse: the push gate (a push only of what the gate passed), the change budget (a commit within its task's owners), honesty (a number with its command), the loop breaker (three failed gate runs, then ask whether a pipeline is missing) | `scripts/gate.mjs`, `scripts/hooks/` (`npm run hooks` installs git's; Claude Code's in `../.claude/settings.json`) |
| The one test (every domain), the scans of what is written (sources, placeholders, keys), and the generated docs (NODES, ATLAS, DEPENDENCIES, nodes' dates) | `tests/nexus/domains.test.ts`, `tests/nexus/scans.ts`, `tests/nexus/docs.ts` (`UPDATE_DOCS=1`; it writes the nodes' dates to `nexus/built.ts`) |
| Nodes: blocks, stages, the library catalogue | `nexus/blocks.ts` (`docs/NODES.md` generated) |
| The built-parts library: every piece every build makes, stored by design, and its law | `nexus/stock.ts` (`src/data/stock.json` generated) |
| Running boards (cache, lists, units on wires, groups, clock); repeats made nodes and proved equal before they are offered (`offersOf`, `useOffer`), a board folded whole (`foldBoard`), a made node opened with its values (`copyInside`) (spec 13, not built); a many-input's wires by their sources' ids as text, or as a Stack's order setting lists them; an input that sets inner settings (group.in `into`, `boundBoard`, `bindSetting`: a folded board's block takes settings; spec 13 NC5) and a wire made in place of another keeps its place (`BoardEdge.order`, D32) | `nexus/dataflow.ts`; a board's own record `boards.ts`, and its event log, the one record of who changed a board and how (spec 13, not built) |
| Running many trials at once (workers, one for each core, each with the whole library); a saved block carried with every saved block it reaches, inner first (`carryOf`, D34) | `nexus/pool.ts`, `nexus/trial-worker.ts` |
| Parts remembered (decision 0028): every part the AI or a person built, kept as a library block with what it was made for and what was checked, recalled by its words before anything is built again; kept in the page's browser store (with the blocks a person saves), on claude.ai also the page's shared store; `forget`, `usesOf`; under Node a file when `NEXUS_MEMORY` names one | `nexus/memory.ts` |
| Starter boards | `nexus/starters.ts` |
| Navigation (libraries, flows, search); the parts catalogue: trade, category, family, size, searched by size words ("M8 nut", "608 bearing", "2x4") (decision 0027) | `nexus/navigate.ts` (`docs/ATLAS.md` generated); pipelines you run as boards `flows.ts` |
| Only what the app reaches is kept | the reach check in `tests/nexus/domains.test.ts` |
| Things placed, never copied; frames; fit in; take apart | `nexus/assembly.ts` |
| The space where nothing can overlap: solids (boxes, rods, tubes, cups, hexes, domes, spheres, cones, turned profiles, cases, sections, coils, bends) made with holes on any face (through or blind, counterbored, countersunk) and put together only by operations (make, stack, around, into, onto, ring (copies turned to face out if asked), through, over (at an end, the middle or a distance from an end), turn (about any direction), run, branch), no place ever an input, a room used once, a refusal with both sizes and what is offered (decisions 0021, 0024, 0026); a line or room named almost right read as the one it plainly means and said back as a note, two that fit refused with both named (`namedIn`); over: a sleeve's bore what its pieces leave free round its axis, a tapped piece on by its thread, a sleeve whose place is taken slid to the nearest free stretch; a section's bore opened to its shaft (`boreTo`) (decision 0026 step 4), mesh (a gear set beside another at m(z1+z2)/2 with its teeth in the other's gaps, `room.mesh`, `gearOf`); nuts tapped, turned passers laid as made, a bolted joint on a turned hole, a face wherever pieces touch (decision 0027); a rack laid against a gear (`rack`, room.rack), a belt round two pulleys or the second pulley put a centre distance off (`belt`, room.belt), a section's pilot hole an opening a shaft turns in, a ring's own axis offered as a line (`<ring>/axis`), a stack centred on a line its items offer (room.stack `align`), a block in a stack or onto a face resting on the first pair of pieces in each other's path (not past the highest piece anywhere under it) (decision 0028); decision 0029, rough: a member between two named points (`between`, room.between), onto with a tilt, copies along a line (`along`, room.along), the same block twice in a stack, through with `which` where several pieces offer the line, over boring a hub with no bore, a round piece seated in a section, a key in a shaft and its hub (`key`, room.key), `end` one word an axis; a lofted solid (`loft`: room.make loft, its stations as text "x:w:lo:hi; …", inside by `stationAt`, its box from its stations, weighed by `loftVolume`, drawn as form.ts's loft) | `nexus/room.ts` (nodes Make a solid, Stack, Around, Into a room, Onto a face, Ring of copies, Through a line, Over a shaft, Turn, Run of tube, Branch into a side) |
| Common pieces made by those operations, by their standards, each saying how it mates (bolts, screws, nuts, washers, standoffs, plates, sections (angles, channels, I-beams, tees), hollow boxes and their lids, pipes, couplings, socket elbows, bent pipe and pipe runs, copper wire, coils and windings, LEDs, lamps, headers, buttons, terminals; resistors, capacitors, transistors, cells, switches, fuses, connectors, pots; L brackets, ball bearings, dowels, set screws, gears, pulleys, springs, hinges, inserts; DIP ICs (JEDEC MS-001), DC barrel jacks and their plugs, copper tees; the bolted joint, a lid, bolted down to a plate) | `nexus/common.ts` (nodes `piece.*`, `mate.bolted`, `mate.lid`, `mate.plate`) |
| Part tables copied with their notices, and the table-driven maker: a family is rows + one recipe of the room operations, one piece node with every row a size, refusals that say which standard stops, every size held to its row (`check.row`); every family of bought part as its envelope (`piece.kind`); a family's piece at a size along a wire (`piece.sized`). Decision 0027: 224 more families by trade, 3,530 sized parts: `drive.ts` (bearings, gears, belts, chains, couplings, ball screws, springs), `electro.ts` (packages, LEDs, controls, connectors, modules, cells, heat sinks, inductors), `fixings.ts` (inch fasteners, self-tapping screws, studs, eye bolts, rigging, clips, pins, latches, hinges), `structure.ts` (aluminium profiles, steel tubes and sections, purlins, engineered timber, boards, paving, drainage), `fluid.ts` (pneumatic cylinders and valves, NPT, compression, PEX, couplings, gauges, gate and butterfly valves), `install.ts` (enclosures, rack panels, DIN rail, glands, conduit, ferrules, crimps, knobs); every part on an aisle (`aisles.ts`); decision 0029, rough, sizes typical: `home.ts` (tools, garden, kitchen, household, sports, toys: 71), `vehicle.ts` (vehicle and bicycle: 52), `machine.ts` (aerospace, marine, machine tools, HVAC, electrical power: 60) | `nexus/parts/` (`bdw.ts` bd_warehouse Apache-2.0, `bosl2.ts` BOSL2 BSD-2, `maker.ts`, `index.ts`; nodes `piece.bolt`, `piece.nut`, `piece.washer`, `piece.setscrew`, `piece.bearing`, `piece.circlip`, `piece.key`, `piece.oring`, `piece.npspipe`, `piece.stepper`, `piece.kind`, `check.row`); the families by trade (decision 0026, step 2): `hardware.ts` (screws, nuts, pins, rivets, inserts, magnets, handles, slides, struts, hinges), `motion.ts` (extrusion, shafts, couplers, bushings, rails, pillow blocks, belts, wheels, castors, motors, servos), `electronics.ts` (dev boards, connectors, displays, fans, packages, relays, switches, breadboards), `plumbing.ts` (ISO 228 fittings, valves, hose, push-fit, PVC and copper, flanges, tanks), `building.ts` (timber, sheet, bricks and a wall of them, steel sections, bar, rebar, anchors, nails, hangers) |
| Layout, contacts, contact patches of a placed tree | `nexus/make/space.ts` |
| The contact graph of any thing (what touches what, from the geometry; each distinct thing once); what flows through it, how it bends, buckles and grows when warmed (steps C to F) | `nexus/graph.ts` (nodes `graph`, `flow`, `bend`) |
| Rules: the heat gate; nothing checks for overlap (decision 0021): places still written by hand counted, each count only falls | `nexus/make/rules.ts`; the count `../scripts/by-hand.mjs` |
| Critic, detail, conditions, the make pipeline | `nexus/make/` (`critic.ts`, `detail.ts`, `conditions.ts`, `pipeline.ts`) |
| The interface record: what a part offers or asks where it meets another, read from its ports and old interfaces, with a stable id (spec 01; decisions 0004, 0014) | `nexus/interfaces.ts` |
| Mating by faces, ports, round faces, bores | `nexus/mate.ts` |
| Mates as measures in ranges; proximity | `nexus/placement/proximity.ts`, `relate.ts` |
| Placement, fields, sizing, repair, lines and routing | `nexus/placement/` |
| Loads on made parts; stress sweeps | `nexus/loads.ts` |
| Rigid-body physics (Jolt); Let it go takes a room block, each piece a body by its name, `fixed` pieces held; a hinge on a line a block offers; movement in general (decision 0027): `motionOf` reads bodies, joints (a gap fit turns about its line) and gear meshes from the faces, `LiveMotion` steps Jolt live with frozen pieces static, loose ones on hinges, meshing gears at their ratio, torque, pull, spin; decision 0028: slides within their room (two parallel slide fits only slide), a rack moved by its gear, pulleys a belt joins turning together, servo and gear-motor joints held by a motor (servo stall torque; only what it stands on frozen), a held joint posed by dragging, a touch that would lock a joint giving way to it, unjoined bodies colliding | `nexus/sim.ts`; its realization of bodies `realize.ts` |
| Servo motion | `nexus/motion.ts` |
| Parts: kits, shapes, cuts, mass | `nexus/kits.ts`, `mass.ts`, `form.ts`, `surface.ts`, `finish.ts` (and the surface a process leaves), the share of its box a shape fills `boxfill.ts` |
| The level of detail every maker and the renderer read; a spatial index over points | `nexus/lod.ts`; `PointGrid` in `nexus/make/space.ts` |
| How a part looks: colour from optics, films, the look stack | `nexus/colour.ts`, `appearance.ts`, `data/optics.ts` |
| Parts from standards; components; catalogue | `nexus/families.ts`, `catalogue.ts`, `components.ts`; ISO metric threads `threads.ts` |
| Kinds of bought part as data (sizes, materials, standards, mass), by trade: each becomes a family | `nexus/kinds/` (`core.ts` says how one is written) |
| Units and dimensions; the typed knowledge the laws are checked against | `ganglia/units.ts`, `ganglia/types.ts` |
| Engineering by its own equations: springs (Shigley), DC motors, heat, fusion of materials, joining | `engineering/` (`springs.ts`, `dcmotor.ts`, `thermal.ts`, `fusion.ts`, `joining.ts`) |
| Makers by process (fastener, winding, sensor, …); only what components.ts still draws with remains (the fastener, sensor, winding, turned, gear and chain makers and their `make.*` nodes are deleted, decision 0026 step 3; `make.coil` kept for a seed) | `nexus/makers.ts` |
| Chips from netlists (the 6502 from its transistors) | `nexus/logic/` |
| Inventory, pieces, looks, breakdown queue | `nexus/inventory.ts`, `pieces.ts`, `looks.ts`, `breakdown.ts` (run as a program by `breakdown-main.ts`) |
| Research and the gap map | `nexus/research.ts`, `data/references.ts` |
| Models and services over the web: pictures judged blind as a measurement, drawn from words, wordings tried; every service a node of its own (`api.claude`, `api.gemini.see`, `api.gemini.draw`, `api.fal.draw`, `api.higgsfield`, `api.zenrows`) | `nexus/genai.ts` (keys under Node only: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `FAL_KEY`, `HIGGSFIELD_KEY_ID` and `HIGGSFIELD_KEY_SECRET`, `ZENROWS_API_KEY`) |
| The AI in the app: Claude working through the node system's own eight tools (find, card, build a board from a short plan, open a starter board, change the board in place, read, fold into a saved block, docs), on the board open and with the blocks you saved, its answer checked by a second model against its steps when asked (on the phone, a toggle); Assist's one call for a plan in the build or change tool's form (`agentPlan`), a plan run by its tools wherever written (`runPlan`, `joinPlan` for a step by hand), told only `docs/FOR-AI.md` (keep that file short: it is sent with every call, cached), never the app's code; its relay (`npm run app`) keeps the key off the page; its plans checked as they are made (a thing where a block goes, an output or input not there, a second wire into a single input, an add over a name, each refused with the fix), a node left waiting counted as failing, the cards with each piece's offers (the core in full, the rest their short ids by trade), worked plans after them; `find` answers a build with what builds first (saved blocks, room.*, piece.*, mate.*), a line each with its inputs, settings, offers and a worked starter board; Assist's call carries the saved blocks' cards; the guide, cards and worked plans one cached system block (`cachedSystem`); a setting named otherwise read and said back as a note (`readSetting`); Assist sent the cards of the pieces its request names (`namedCards`, plain-word synonyms `NAMED_AS`); the forty things to build scored with no model (`tests/evals/builds.eval.ts`, `npm run eval:builds`); a thing of several things built from its parts by small calls, each one task (`composeBuild`: split, each part from an assembly, a starter board or one plan, folded to one node, joined, checked; its `ask` the SDK in the relay or the viewer's account on claude.ai; decision 0027; 25 compound requests in `tests/evals/compose.eval.ts`, `npm run eval:compose`); decision 0028: an orchestrator that remembers: parts remembered recalled before the split, a part of several things split again (two levels), parts built three at once, a part with nothing to start from built by one plan, each part that runs with nothing failing and is one group remembered, what is left loose named and joined by more calls, a final check that builds what is missing, the run as a tree (`ComposeRun.tree`); 25 more requests (`EVAL_SET=more`), the set run twice to show reuse (`EVAL_REPEAT=2`), a kind read by what a part is (`tests/evals/score.ts` KINDS) | `nexus/agent.ts` (node Claude builds a board; panel Ask Claude; relay in `vite.view.config.ts`) |
| The engineering compiler: one design record through stages (requirements, BOM, checks with their engine and input hash), the release gate | `nexus/compiler.ts` (`docs/COMPILER.md`) |
| Exact solids: every piece made a B-rep solid by OpenCascade (replicad 1.1.0), placed, its holes cut by booleans, checked valid, measured; what is not made counted; export (STEP, STL, 3MF, glTF, BOM) | `nexus/brep.ts` (nodes Exact solids, Compile: exact solids, Export) |
| Stress by an engine apart: CalculiX (Node only, where installed), set against the book and our frame analysis | `nexus/fea.ts` (node Stress three ways) |
| The gauntlet | `nexus/gauntlet.ts`, `view/gauntlet.ts` |
| The library's loading; seeds that place nothing (a coil spring made and loaded); assemblies as blocks of settings: a small DC motor (`seed.motor-dc`: R, L, shaft) and a pack of two cells (`seed.pack-two`), decision 0026 step 3; what the AI's plans repeat, folded: bolted at two or four holes (`seed.bolted-two`, `seed.bolted-four`), into a box with its lid on (`seed.boxed`), a board on four standoffs (`seed.standoffs`) (decision 0026 step 4); robot and machine assemblies in `nexus/assemblies/` (`robots.ts`: quadcopter, robot arm, gripper, pan-tilt, wheeled base; `machines.ts`: linear axis, XY gantry, conveyor, car chassis, crane, table, shelf, lamp arm, pump loop) (decision 0027); `things.ts`: wind turbine, a lofted boat hull with its transom and foredeck (`seed.hull`, decision 0029), boat with an outboard on it, camera, tripod, servo leg, quadruped, hexapod, winch, centrifugal pump, truck of 4 or 6 wheels; `everyday.ts`: chair, desk, bed frame, door on a hinge, window, stud wall, fence, go-kart, trailer, wheelbarrow, mast, solar panel, satellite dish (decision 0028); `vehicles.ts` (decision 0029, rough): bicycle, helicopter, excavator, forklift, train, 3D printer, drill press, ceiling fan, lathe, mower, scooter, motorcycle, tractor, bus, van, robot dog | `nexus/seeds.ts` |
| Bodies, agents, awareness, gases | `nexus/act/`, `nexus/aware/`, `nexus/life/segments.ts`; a human body laid out `anatomy.ts` |
| Expressions in words and units (the formula language nodes take); embodied machines | `nexus/generate.ts`, `nexus/embody/` |
| Controls worked by hand while it runs (Button, Stick, Slider; a button put on a thing); being in it (walking, keys, phone controls, gamepad); a stick drives a named piece of a thing, a button with a block gives a row of copies laid by the room's stack | `nexus/controls.ts`, `nexus/view/pad.ts` |
| The app: dashboard, board, 3D dock, space, renderer, look; the phone page, a chat that builds three ways: by hand (pieces and the joints made on what is there, on the loosest fit the room allows), Assist (one call, a plan to change), Auto (decisions 0023, 0025), `move3d.ts` (Move in the 3D view: Freeze, Loose, Spin, Motor at so many rpm, Hold, drag to turn or slide, a held joint posed), `parts.ts` (the parts browser; its aisle Yours / Remembered, placed or deleted; Keep this build; a build's orchestration as a tree), `viewer.ts` (the app as a page on claude.ai: the in-app AI on the viewer's account, reports to the session, the remembered parts in the page's shared store) | `nexus/view/` (`dashboard.ts`, `nodes.ts`, `dock3d.ts`, `space.ts`, `space3d.ts`, `kit3d.ts`, `look.ts`, `vibe.ts`) |

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

## Speed (the user, 2026-11-07: "I want it fast ... there never a need for a digital entity to be taking hours on a task unless it's populating"; the panel's critique, `plan/CRITIQUE.md`)

- **Nothing waits in the foreground past two minutes.** Anything longer runs in the background with a timeout and is
  reported when it ends. A wave of builders ends at a hard stop (about an hour); what is left is reported, not waited for.
- **Builders: at most six at once**, each committing every 20 minutes so a death loses 20 minutes, not an hour. Population
  (families, assemblies) runs on the cheaper model; only roots (geometry, motion, the AI's prompts) on the strongest.
  A builder's brief is under 400 words: the files, the deliverable, the test anchor, "done when", the stop time; it reads
  its owner row and nothing else; no pictures or blind checks unless the brief asks.
- **The usage pool is shared by every builder.** When a wave dies on the limit, a resume is scheduled at the reset minute
  (`send_later`), never left to chance; the next wave is smaller.
- **Checks while working:** the type check and `npm run gate:field -- <field>` on the fields touched. The whole gate runs
  once, before a push. The docs pass runs once per push. Nothing is evaluated with real calls until the geometry root
  (`plan/FIX-PLAN.md`, root 1) is in.
- **Bookkeeping in the same commit as the work, never alone:** the user's words appended to `docs/WANTED.md`, the round's
  line in `docs/REALITY.md`, the owner row. No decision file unless the user asks for one; `plan/FIX-PLAN.md` is the plan.
- **Estimates in waves, never days.** One wave, hard stop, the remainder reported. A number not measured is "a guess".
- **Every green push is merged to `main`** the same hour (a pull request, merged), so the repo's front page is the work.

## Working here

- **The session loop** (spec 00, S2): read `PROGRESS.md` (the task in hand, the next three, what is open); take the next
  task of the start queue (`plan/README.md`); write its failing test first; build it within the task's owners; run the
  gate; commit with the task's id in the message (`[00.S3]`); push (the push hook refuses a commit the gate has not
  passed); ask the evaluator (`plan/specs/00-structure/evaluator.md`) for a verdict; then rewrite `PROGRESS.md`.
- Gate: `npm run gate` (`scripts/gate.mjs`): the type check and the one test, then a stamp of exactly what passed (the push
  hook reads it), `tests/nexus/domains.test.ts` (every domain's nodes, their own
  tests, one quick board per field, the reach check), under a minute; CI runs the same. `UPDATE_DOCS=1 npx vitest run`
  writes the generated docs and the nodes' dates (twice where nodes' code changed). Nodes built before the update are
  marked as such: the queue to re-check. Build the viewer: `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing. Run them with `npm run probe --
  <file>` (stopped at two minutes). Where places are still written by hand, builder by builder: `node scripts/by-hand.mjs`.
  While working, the gate on the fields touched: `npm run gate:field -- Mechanical` (4 s
  for one field, against 46 s whole); the docs once with `npm run docs`; the whole gate before pushing.
- Node's built-in fetch reaches the web here only with `NODE_USE_ENV_PROXY=1` (the container's proxy; set in the
  scripts above).
- Never put API keys in the repo or in client code.
