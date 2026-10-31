# Nexus and the space: read this before any work here

This file is the anchor against drift. Long recursive work loses the point when each round optimises what it can measure
(tests green, numbers sourced, findings fixed) and forgets what the person asked for. Summaries after a context reset keep
the task list and lose the why. So the why lives here, and every round is checked against it.

## What is wanted (the summary; every word the user said is in `docs/WANTED.md`)

- **A node system that builds anything** from real parts, each part from its own sub-parts down to the bolt (and the
  transistor), every piece stored once and reused (the library law), any board folded into one reusable node, so
  complexity compounds: a motor, a drone, a swarm, a car, a house, a city.
- **Real, not mocked:** real products true to their published figures, built from the inside out, explodable to the
  bottom; physics, materials (down to the elements), rules for what may touch, heat and clearance; honest about what is
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

## Where to read for what (targeted context: read only what the work needs)

| If the work is about | Read |
| --- | --- |
| What the user asked, in their words, and when | `docs/WANTED.md` |
| Which module owns a concern, in full (its nodes, its rules) | `docs/OWNERS.md` (the one-line table is below) |
| What is next, and in what order; what is done | `docs/ROADMAP.md` (status at its top) |
| What was done and measured, round by round | `docs/REALITY.md` (a log: search it, do not read it whole) |
| The engineering compiler's 30 stages | `docs/COMPILER.md` |
| Placement, routing, sizing, repair | `docs/PLACEMENT.md` |
| Agents, awareness, bodies, gases | `docs/LIFE.md` |
| Picture to model, reconstruction | `docs/RECONSTRUCT.md` |
| Detail against reference products | `docs/GAP-MAP.md` |
| Every node, generated | `docs/NODES.md`; the library's map `docs/ATLAS.md` |
| The node engine's history (why it is as it is) | `docs/NODE-ENGINE.md` (history; files it names may be gone) |
| A large module (`engines.ts`, `machines.ts`, `blocks.ts`, `dataflow.ts`) | its route map at its top: read the section named there, not the file |

## When work is slow: step back

- Past about **two minutes** on one run, or **three tries** at one fix: stop. Ask whether this is population (easy, just
  many) or a **missing pipeline** (the same judgement made by hand again and again). If it is a missing pipeline, say so
  and build the pipeline (a board of nodes, AI gates where judgement is needed) instead of doing the next one by hand.
- Test what changed: `npm run check` on the one thing, `npm run gate:field` on the fields touched; the whole gate once,
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
| Laws (terms, kinds, nodes, solving, chains) | `nexus/book/`, `lawBlocks` in `blocks.ts`, `lawgraph.ts` |
| Numeric methods (roots, integrals, slopes, ODEs, linear systems) | `nexus/numeric.ts` |
| Materials and everything known of them; any mix worked out from its phases | `nexus/matter.ts`, `nexus/mixture.ts` (data: `mass.ts`, `elements.ts`, `data/materials.ts`, `periodic.ts`, `woods.ts`, `mixes.ts`, `constituents.ts`) |
| What a thing is made of; mass, centre, inertia, heat capacity | `nexus/madeof.ts` |
| Evidence, ±, nonphysical results, balances | `nexus/evidence.ts`; `judge`, `spreadOf` in `dataflow.ts` |
| The one test (every domain), and the generated docs (NODES, ATLAS, DEPENDENCIES, nodes' dates) | `tests/nexus/domains.test.ts`, `tests/nexus/docs.ts` (`UPDATE_DOCS=1`) |
| Nodes: blocks, stages, the library catalogue | `nexus/blocks.ts` (`docs/NODES.md` generated) |
| The built-parts library: every piece every build makes, stored by design, and its law | `nexus/stock.ts` (`src/data/stock.json` generated) |
| Running boards (cache, lists, units on wires, groups, clock) | `nexus/dataflow.ts` |
| Running many trials at once (workers, one for each core, each with the whole library) | `nexus/pool.ts`, `nexus/trial-worker.ts` |
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
| The level of detail every maker and the renderer read; a spatial index over points | `nexus/lod.ts`; `PointGrid` in `nexus/make/space.ts` |
| How a part looks: colour from optics, films, the look stack | `nexus/colour.ts`, `appearance.ts`, `data/optics.ts` |
| Parts from standards; components; catalogue | `nexus/families.ts`, `catalogue.ts`, `components.ts` |
| Makers by process (fastener, winding, sensor, …) | `nexus/makers.ts` |
| Engines, gearboxes, fittings, closures | `nexus/engines.ts`, `drivetrain.ts`, `fittings.ts` |
| Vehicles, tyres, machines | `nexus/machines.ts`, `panels.ts` |
| Computers from transistors; chips from netlists | `nexus/computer.ts`, `nexus/logic/` |
| Inventory, pieces, looks, breakdown queue | `nexus/inventory.ts`, `pieces.ts`, `looks.ts`, `breakdown.ts` |
| Research and the gap map | `nexus/research.ts`, `data/references.ts` |
| Models and services over the web: pictures judged blind as a measurement, drawn from words, wordings tried; every service a node of its own (`api.claude`, `api.gemini.see`, `api.gemini.draw`, `api.fal.draw`, `api.higgsfield`, `api.zenrows`) | `nexus/genai.ts` (keys under Node only: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `FAL_KEY`, `HIGGSFIELD_KEY_ID` and `HIGGSFIELD_KEY_SECRET`, `ZENROWS_API_KEY`) |
| The AI in the app: Claude working through the node system's own eight tools (find, card, build a board from a short plan, open a starter board, change the board in place, read, fold into a saved block, docs), on the board open and with the blocks you saved, its answer checked by a second model against its steps, told only `docs/FOR-AI.md` (keep that file short: it is sent with every call, cached), never the app's code; its relay (`npm run app`) keeps the key off the page | `nexus/agent.ts` (node Claude builds a board; panel Ask Claude; relay in `vite.view.config.ts`) |
| The engineering compiler: one design record through stages (requirements, BOM, checks with their engine and input hash), the release gate | `nexus/compiler.ts` (`docs/COMPILER.md`) |
| Exact solids: every piece made a B-rep solid by OpenCascade (replicad 1.1.0), placed, its holes cut by booleans, checked valid, measured; what is not made counted; export (STEP, STL, 3MF, glTF, BOM); interference by booleans against the rules | `nexus/brep.ts` (nodes Exact solids, Compile: exact solids, Export, Interference two ways) |
| Stress by an engine apart: CalculiX (Node only, where installed), set against the book and our frame analysis | `nexus/fea.ts` (node Stress three ways) |
| The gauntlet | `nexus/gauntlet.ts`, `view/gauntlet.ts` |
| Seeds (window to city) | `nexus/seeds.ts` |
| Bodies, agents, awareness, gases | `nexus/act/`, `nexus/aware/`, `nexus/life/segments.ts` |
| Expressions in words and units (the formula language nodes take); embodied machines | `nexus/generate.ts`, `nexus/embody/` |
| Controls worked by hand while it runs (Button, Stick, Slider; a button put on a thing); being in it (walking, keys, phone controls, gamepad) | `nexus/controls.ts`, `nexus/view/pad.ts` |
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
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing. Run them with `npm run probe --
  <file>` (stopped at two minutes). A rules check on one thing or one part of it: `CHECK=corolla [ONLY=regex]
  [WITHIN=/3/0] npm run check`. While working, the gate on the fields touched: `npm run gate:field -- Mechanical` (4 s
  for one field, against 46 s whole); the docs once with `npm run docs`; the whole gate before pushing.
- Node's built-in fetch reaches the web here only with `NODE_USE_ENV_PROXY=1` (the container's proxy; set in the
  scripts above).
- Never put API keys in the repo or in client code.
