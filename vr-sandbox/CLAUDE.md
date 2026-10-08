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
| What an inventory item looks like, how it comes apart | `src/nexus/pieces.ts`, `looks.ts` |
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
- Next: shut lines placed by draft (where one press direction stops being formable); zebra judged from where people
  stand; rule updates kept only when they help cases they were not tuned on and do not worsen the blind judge.

Capability atlas (the user's direction, 2026-10-08): learn from open engineering tools (FreeCAD and Open CASCADE for
geometry and constraints, Gmsh and SALOME for meshing, MOOSE, Elmer, Code_Aster and OpenFOAM for physics, OpenModelica
for systems, LinuxCNC for machines) as ideas and architecture, each operation as UI → command → data → algorithm →
constraints → failure modes. Ideas and interfaces only: their code is GPL/LGPL and is not copied in.

Known gaps (from the 2026-10-08 audit, still open):
- the inventory knows what is in a product but not where it sits; the kits know where but not what. Joining them, so
  every placed part is an inventory item that expands into its sub-parts, is the merge that ends "two generators";
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

## Working here

- Gate: `npm run gate` (long; run it in the background and log to a file). Build the viewer:
  `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
