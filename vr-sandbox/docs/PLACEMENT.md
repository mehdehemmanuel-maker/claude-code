# Engineering at any scale as nodes

Status: plan, not built. Base: commit `14e3283`.
Design target: 1,000,000 components, 100,000 unique, solved, checked, changed and understood without hand edits.
End state: a person states what they want; the system does the rest, asks only the questions that matter, and hands back a buildable, proven design.

## Contents

1. [Rules](#1-rules)
2. [Pipeline](#2-pipeline)
3. [Effortless use](#3-effortless-use)
4. [Autopilot loop](#4-autopilot-loop)
5. [Scale model](#5-scale-model)
6. [Node contract](#6-node-contract)
7. [Glossary](#7-glossary)
8. [Existing base](#8-existing-base)
9. [Node groups](#9-node-groups)
10. [Node index](#10-node-index)
11. [Steps](#11-steps)
12. [Measures](#12-measures)
13. [Limits](#13-limits)
14. [Starting state](#14-starting-state)

## 1. Rules

1. No hand-typed positions or sizes.
2. Parts state needs; solvers place, route and size, and give the reason.
3. Every figure from a law, standard or source; otherwise labelled typical or estimate.
4. Unsolved → named task with its cause.
5. Never solve flat: solve by hierarchy, interface and unique part.
6. Every finding has an automatic repair, or it is a named gap in the repair library.
7. Every figure is checked: units, conservation, invariants.
8. Ask the person only what changes the answer most.
9. Each step shown before the next.

## 2. Pipeline

```
intent → requirements → functions → architecture → space claims → layout → routing → sizing
→ generated parts → detail → proof → manufacture → assembly → service → as-built twin → back to intent
```

| Property | Meaning |
| --- | --- |
| Bidirectional | A change at any stage flows up and down |
| Incremental | Only what a change reaches is redone |
| Traceable | Every result links to the requirement and source behind it |
| Explainable | Every result can say why |
| Closed loop | What is built and measured feeds back into design |

## 3. Effortless use

| The person | The system |
| --- | --- |
| Says, sketches, photographs, or points at a product | Turns it into requirements, each with its source or assumption |
| Answers at most a few questions | Asks only those with the highest value to the answer |
| Watches it build | Generates, checks and repairs in the autopilot loop, live in 3D |
| Picks among trade-offs | Offers the Pareto front with costs |
| Grabs and moves anything | Re-solves around the choice and says what resists |
| Asks anything | Answers from the system and the knowledge graph |
| Exports | CAD, drawings, toolpaths, prints, instructions, wiring, permits, orders |

## 4. Autopilot loop

```
generate → check (rules, fields, budgets, contracts, codes, invariants) → findings
→ repair (strategy library, cheapest first) → re-check → keep if better
→ until clean, or blocked → blocked findings become named tasks with their cause
```

| Part | Does |
| --- | --- |
| Repair library | For each finding kind, ordered strategies: move, reroute, shield, resize, bore, join, swap part, change choice, rebalance budget, renegotiate contract |
| Fidelity on demand | Cheap checks first; full physics only where margins are thin |
| Learning | Which repair worked for which finding is kept and tried first next time |
| Guard | A repair that makes anything worse elsewhere is undone |
| Stop | Clean, blocked, or out of budget; always reported |

## 5. Scale model

How 1,000,000 parts become small problems:

| Lever | Effect | Node |
| --- | --- | --- |
| Hierarchy | About 5 levels of about 16 children: no solve sees more than about 100 things | `system.tree`, `system.partition` |
| Interfaces as contracts | A module solves against its neighbours' contracts, not their insides | `interface.contract` |
| Solve each unique once | 100,000 unique solves, not 1,000,000; placements share results | `cache.content` |
| Variety reduction | Near-duplicates merged into families: unique count falls | `dedupe.parts`, `family.extract` |
| Spatial index | Clash and field queries in O(n log n), not O(n²) | `index.spatial`, `clash.broad` |
| Incremental | A change re-solves its module and the contracts it touches | `change.impact`, `solve.incremental` |
| Parallel | Modules solved at once on workers or agents | `solve.distribute`, `agent.team` |
| Budgets | Mass, power, heat, cost, volume roll up and are allocated down | `budget.*` |
| Queries over browsing | Ask the system, do not scroll it | `query` |
| Streaming | Load and draw only what is in view, by level of detail | `stream.load`, `lod.auto` |

Figures in this table are estimates for planning.

## 6. Node contract

Every node, existing and new:

| Requirement | Meaning |
| --- | --- |
| Units | Typed ports with units, converted on wires |
| Lists | Maps over lists of any length without change |
| References | Takes shared assemblies by reference; never copies |
| Cached | Keyed by content hash; same inputs, no rerun |
| Incremental | Reruns only on changed inputs |
| Streaming | Gives partial results while running; cancellable |
| Explained | Every output carries its reason |
| Sourced | Every figure carries its source or label |
| Confidence | Every output carries how sure it is and why |
| Scoped | Runs on a whole system, a module, a selection or a query result |
| Tested | Own tests; passes the gauntlet |
| Budgeted | Reports its time and memory; respects a limit |
| Self-checked | Units, conservation and invariants verified on its outputs |
| Versioned | Every output kept by version; any past state can be replayed |
| Shared | Many people and agents can edit at once without conflicts |
| Repairable | Its failures name a repair strategy or a gap |

## 7. Glossary

| Term | Meaning |
| --- | --- |
| Need | What a part requires: mount, connect, keep-out, face, access |
| Field | Map of one quantity over space: heat, motion, reach, air, wet, noise, load |
| Keep-out | Required distance from material limits, motion or code; hard or soft |
| Envelope | Volume occupied; moving envelope includes everything swept |
| Space claim | Zone given to one subsystem before detailing |
| Budget | Allowance of mass, power, heat, cost, volume or data, allocated down and rolled up |
| Margin | Budget left; tracked per level |
| Bid | Subsystem's claim on contested space: need and cost of elsewhere |
| Choice | Discrete decision (gearbox side, exhaust side, radiator count) |
| Solver | Places from needs, fields, claims: search for choices, optimisation for positions |
| Reason | What holds a result where it is |
| Trade-off | Ranked option with its cost when something will not fit |
| Interface contract | What a module promises its neighbours: ports, envelope, loads, heat, budget |
| Frozen interface | A contract that may not change without approval |
| Module | A subtree solved as a unit against its contracts |
| Partition | Split of a system into modules by coupling strength |
| Unique part | A distinct design; placements of it share one solve |
| Family | Unique parts merged as one parametric design |
| Variant | A configuration of options over one design (150 % BOM) |
| Baseline | A frozen, named version of the whole system |
| Impact | Everything a change reaches, through contracts and fields |
| Route | Path of a hose, wire, pipe, duct, road or data link |
| Harness | Wires routed as one bundle with branches, clips, connectors |
| Connective parts | Brackets, clips, shields, ducts, harnesses; generated |
| Topology optimisation | Shape grown from loads |
| Removal path | Clear way in and out of a part's place |
| FMEA | Failure modes and effects per part, rolled up per system |
| Tolerance stack | Summed manufacturing variation at worst case |
| Requirement | A stated need of the whole, traced to the parts and tests that meet it |
| Precedent | Sourced placement from real products |
| Seed | Solved thing kept as one reusable node |
| Surrogate | Fast learned approximation of a slow solve |
| Reduced-order model | A system model small enough to simulate the whole at once |
| Spatial index | Tree over space for fast nearest and overlap queries |
| Broad phase | Cheap pass that finds candidate clashes before exact checks |
| Content hash | Identity of a result from its inputs; the cache key |
| Hand coordinate | Position typed into code; target 0 |
| Intent | What the person wants, in any form: words, sketch, photo, reference product, spec sheet |
| Autopilot | The generate–check–repair loop that runs until clean or blocked |
| Repair strategy | An automatic fix for one kind of finding |
| Fidelity ladder | Rule of thumb → law → surrogate → full simulation → physical test, climbed only as needed |
| Invariant | Something that must always hold: mass conserved, energy balanced, units consistent |
| Knowledge graph | One linked store of parts, materials, processes, laws, standards, suppliers and precedent |
| Value of information | How much an answer would change the design; decides what to ask |
| Node synthesis | Drafting a missing node from a specification, proven by the gauntlet before use |
| Digital twin | The design linked to the built thing's measurements |
| GD&T | Geometric dimensioning and tolerancing on drawings |
| CRDT | A data structure that lets many editors change one design at once without conflicts |
| Finding | Rules-checker problem: interference, clearance, heat |

## 8. Existing base

| Have | Where | Becomes |
| --- | --- | --- |
| Typed ports, units, incremental runs, groups as blocks | `blocks.ts`, `dataflow.ts` | Node contract base |
| Shared placement, instancing | `assembly.ts`, `space3d.ts` | `cache.content`, `stream.load`, `lod.auto` |
| Iface, Port | `kits.ts`, `mate.ts` | `need.connect`, `need.mount`, `interface.contract` |
| Interference, clearance, heat gate | `make/rules.ts` | Exact checks after `clash.broad` |
| Oriented-box layout | `make/space.ts` | Solver geometry |
| `clearPath` | `make/space.ts` | Replaced by `route.path` |
| Swept room, servo | `make/critic.ts`, `motion.ts` | `field.motion` |
| Load cases, strength | `loads.ts` | `size.bolt`, `make.bracket`, `field.load` |
| Jolt physics | `sim.ts` | Mount rock, assembly paths, `sim.system` |
| Explode | `view/kit3d.ts` | `check.assembly` |
| Inventory to elements | `inventory.ts`, `breakdown.ts` | BOM, `dedupe.parts`, `cost.estimate` |
| Families from standards | `families.ts`, `components.ts` | `family.extract`, `standardize` |
| Seeds | `seeds.ts` | `layout.seed` |
| Sourced notes | `research.ts` | `precedent.mine`, `req.capture` |
| Gauntlet | `gauntlet.ts` | `gauntlet.solver`, `bench.scale` |

## 9. Node groups

### U1 Needs
| Node | Does | Options |
| --- | --- | --- |
| `need.mount` | Mount surface, orientation, fastener pattern | Any face, rail, floor, wall; isolated or rigid; serviceable or permanent |
| `need.connect` | Port and max distance | Mechanical, fluid, electrical, data, thermal; length limits; flexible or rigid link |
| `need.keepout` | Distance from heat, motion, water, noise, people | Hard or soft; directional; time-varying; from material limits or code |
| `need.face` | Required facing | Exact, within a cone, or away from |
| `need.access` | Who reaches it, how often | Hand, tool, robot, person; daily to never; with what removed first |
| `need.group` | Parts that must stay together or apart | Same module, same zone, separated for redundancy |
| `infer.needs` | Needs read from a hand-placed build | Confidence per need; review list for low confidence |

### U2 Fields
| Node | Map | Options |
| --- | --- | --- |
| `field.heat` | Temperature | Conduction, convection, radiation; steady or transient; surrogate for live |
| `field.motion` | Moving envelopes | Kinematic sweep, mount rock, thermal growth, deflection under load |
| `field.reach` | Hand and tool reach | Body size range, tool kinds, posture |
| `field.air` | Airflow | Ram air, fan, natural draft; surrogate for live |
| `field.wet` | Spray, drip, flood | Leak sources, gravity, splash |
| `field.signal` | Electrical noise | Sources by frequency; shielding |
| `field.load` | Load paths | Static, dynamic, crash |
| `field.sound` | Noise at listeners | Sources, paths, absorbers |
| `field.light` | Daylight and lighting | Sun path, fixtures |
| `field.combine` | Weighted sum of fields as one cost | Per need; per priority profile |
| `field.show` | Draw any field in 3D | Slices, isosurfaces, glow on parts |

### U3 Space claims and choices
| Node | Does | Options |
| --- | --- | --- |
| `space.claim` | Top-down zoning | Fixed, flexible, shared zones |
| `space.bid` | Resolve contested space | By need, by cost, by priority |
| `choose.options` | Search discrete choices | Exhaustive for few; tree search for many; seeded by precedent |
| `choose.pareto` | All best trade-offs, none dominated | Any objectives: mass, cost, service, noise |

### U4 Solve
| Node | Does | Options |
| --- | --- | --- |
| `place.solve` | Place all | Global or local; anytime; incremental |
| `place.why` | Reason per result | Binding constraints, their sources |
| `place.whatif` | Uncommitted trial | Side by side with current |
| `place.negotiate` | Ranked trade-offs | Auto-pick by profile or ask |
| `place.lock` | Pin a result the person chose | Lock position, choice or contract |

### U5 Routing
| Node | Does | Options |
| --- | --- | --- |
| `route.path` | Cost path | Hose, wire, pipe, duct, road, data; bend radius; surface-following |
| `route.bundle` | Harness bundling | By signal class, segregation rules |
| `route.clip` | Clips and supports | By weight, vibration, code spacing |
| `route.slope` | Required falls | Drains, condensate, fuel return |
| `route.network` | Whole networks at once | Power, data, plumbing, HVAC, roads; redundancy |

### U6 Sizing
| Node | Sizes | From |
| --- | --- | --- |
| `size.wire` | Gauge | Current, length, voltage drop, bundle derating, temperature |
| `size.hose` | Bore | Flow, pressure, temperature |
| `size.pipe` | Bore | Flow, pressure, code |
| `size.duct` | Section | Airflow, velocity, noise |
| `size.bolt` | Diameter, grade | Joint load, fatigue |
| `size.beam` | Section | Span, load, deflection limit |
| `size.battery` | Group or pack | Load profile, climate |
| `size.motor` | Frame | Torque, speed, duty |
| `size.drain` | Pipe, slope | Fixture units |
| `size.fan` | Size, speed | Flow, pressure, noise |

### U7 Generated parts
| Node | Makes | Options |
| --- | --- | --- |
| `make.bracket` | Bracket from load | Pressed, cast, machined, printed |
| `make.shield` | Heat or splash shield | From field; material by temperature |
| `make.harness` | Harness | Trunk, branches, clips, connectors, conduit, labels |
| `make.duct` | Duct | Between ends, by airflow |
| `make.enclosure` | Housing round contents | Process, sealing, cooling |
| `make.mount` | Isolation mount | Stiffness from vibration target |

### U8 People
| Node | Does | Options |
| --- | --- | --- |
| `body.model` | Body sizes | Published percentiles, posture, clothing |
| `check.reach` | Reachability | Seated, standing, kneeling |
| `check.sight` | Sightlines | Obstruction, glare |
| `check.circulation` | Walkways, swings, turning | To code |
| `check.ergonomics` | Force, posture, repetition | Task by task |

### U9 Lifecycle
| Node | Does | Options |
| --- | --- | --- |
| `check.assembly` | Build order, removal paths | Manual, robot, line |
| `check.service` | Service minutes | Per task, per interval |
| `check.failure` | FMEA | Per part, rolled up |
| `check.tolerance` | Worst-case and statistical stack | Monte Carlo |
| `check.reliability` | Life and failure rates | From sourced rates |

### U10 Precedent
| Node | Does | Options |
| --- | --- | --- |
| `precedent.mine` | Sourced placements as priors | By product class |
| `layout.seed` | Solved layouts reused | Nearest match, adapted |

### U11 Domains
| Domain | Places | By |
| --- | --- | --- |
| Chips | Blocks, cells | Area, heat, timing |
| Boards | Components, traces | Heat, signal, noise |
| Machines | Bays, robots, appliances | All fields |
| Vehicles | Systems, harnesses, plumbing | All fields, crash |
| Buildings | Rooms, fixtures, services, structure | Codes, circulation, daylight, loads |
| Plants | Equipment, piping, cable trays | Process flow, safety distance, access |
| Land | Buildings, roads, drainage, utilities | Slope, sun, wind, flood |
| Software | Services on machines, data paths | Latency, redundancy, cost |

### U12 Proof
| Node | Does | Options |
| --- | --- | --- |
| `gauntlet.solver` | Adversarial variants | Random, worst-case, from history |
| `score.layout` | Layout score | Hand coordinates, findings, time, similarity |
| `bench.scale` | Synthetic 1,000,000 / 100,000 system end to end | Time, memory, findings per stage |

### U13 Live
| Node | Does | Options |
| --- | --- | --- |
| `live.drag` | Drag in 3D or VR; re-solve on release | Fields shown; resisting constraint named |
| `live.review` | Walk through the system in VR with findings pinned | By module, by risk |

### U14 Hierarchy and interfaces
| Node | Does | Options |
| --- | --- | --- |
| `system.tree` | System → subsystem → module → assembly → part | Any depth |
| `system.partition` | Split into modules by coupling | Spatial, functional, by team |
| `interface.contract` | Ports, envelope, loads, heat, budget a module promises | Versioned |
| `interface.freeze` | Lock a contract | Approval to change |
| `interface.check` | Every contract met on both sides | Per change |

### U15 Scale engine
| Node | Does | Options |
| --- | --- | --- |
| `index.spatial` | Tree over all parts | Rebuilt incrementally |
| `clash.broad` | Candidate clashes for exact check | By module, by zone |
| `cache.content` | Results keyed by content hash | Shared across systems |
| `solve.incremental` | Re-solve only what a change reaches | With `change.impact` |
| `solve.distribute` | Modules solved in parallel | Workers, remote machines |
| `stream.load` | Load what is in view or in query | By level of detail |
| `lod.auto` | Stand-ins with error bounds | Per view distance |

### U16 Variety reduction
| Node | Does | Options |
| --- | --- | --- |
| `dedupe.parts` | Near-duplicate unique parts found | By shape, size, material, function |
| `family.extract` | Uniques merged into parametric families | Parameters inferred |
| `standardize` | Swap specials for standard parts | From catalogues |
| `commonality` | Share of parts reused across products | Per level |

### U17 Configuration and change
| Node | Does | Options |
| --- | --- | --- |
| `config.variants` | Options over one design | Rules between options |
| `change.impact` | Everything a change reaches | Through contracts, fields, budgets |
| `change.propagate` | Apply a change and re-solve | Dry run first |
| `version.branch` | Branch, diff, merge designs | 3D diff |
| `baseline.freeze` | Named frozen version | Compare any two |

### U18 Budgets
| Node | Does | Options |
| --- | --- | --- |
| `budget.allocate` | Split a budget down the tree | By need, by history |
| `budget.rollup` | Sum up the tree | Mass, power, heat, cost, volume, data, CO₂ |
| `budget.margin` | Margin per level | Warn below threshold |

### U19 Requirements and compliance
| Node | Does | Options |
| --- | --- | --- |
| `req.capture` | Requirements from words or documents | Each with source |
| `req.trace` | Requirement → part → test | Gaps listed |
| `req.verify` | Coverage of requirements by checks | Per baseline |
| `comply.code` | Standards and regulations checked | Building codes, ISO, SAE, NEC |

### U20 Query and understanding
| Node | Does | Options |
| --- | --- | --- |
| `query` | Ask the system in words or filters | "Fasteners within 50 mm of anything over 200 °C" |
| `view.slice` | One view of the system | By system, zone, supplier, risk, change |
| `summarize` | Plain description of any subtree | Any length |
| `anomaly.find` | What is unlike its siblings | Shape, mass, cost, findings |
| `compare` | Two designs, two baselines | Differences ranked |

### U21 Orchestration
| Node | Does | Options |
| --- | --- | --- |
| `work.split` | Divide work by module | To workers or agents |
| `agent.team` | Agents each owning a module, negotiating at contracts | Parallel |
| `progress.track` | What is solved, open, blocked | Live |

### U22 System simulation
| Node | Does | Options |
| --- | --- | --- |
| `sim.system` | The whole as connected models | Mechanical, thermal, electrical, fluid, control |
| `sim.reduce` | Reduced-order models from detailed ones | Error bound |
| `surrogate.train` | Learned stand-ins from solves | Retrained on drift |
| `sim.sensitivity` | Which inputs matter most | Ranked |
| `sim.uncertainty` | Spread of results from spread of inputs | Monte Carlo |

### U23 Manufacture and supply
| Node | Does | Options |
| --- | --- | --- |
| `process.select` | Process per part | By volume, material, tolerance |
| `cost.estimate` | Cost per part and rolled up | Material, process, assembly |
| `supply.match` | Catalogue or supplier per part | Lead time, region |
| `line.plan` | Assembly line stations and order | Takt time |

### U24 Risk
| Node | Does | Options |
| --- | --- | --- |
| `risk.register` | Risks with likelihood and effect | From FMEA, budgets, margins |
| `risk.rank` | Top risks across the system | By effect × likelihood |

### U25 Intent
| Node | Does | Options |
| --- | --- | --- |
| `intent.words` | Requirements from plain words | Any language; assumptions listed |
| `intent.sketch` | Requirements and layout from a sketch | 2D or 3D, in VR |
| `intent.photo` | A product recognised from photos | Parts and sizes estimated, labelled |
| `intent.reference` | Start from a named real product | Researched, sourced |
| `intent.spec` | Requirements from a spec sheet or standard | Clause by clause |
| `intent.clarify` | The fewest questions with the most value | Stops when answers stop changing the design |

### U26 Import and recognition
| Node | Does | Options |
| --- | --- | --- |
| `import.cad` | Read CAD files into parts | STEP, IGES, STL, glTF |
| `import.scan` | Point clouds and meshes into parts | Segmented, fitted to primitives |
| `import.drawing` | Drawings into parts | Dimensions, tolerances |
| `import.bom` | Bills of materials into the tree | Matched to the inventory |
| `recognise.part` | Identify a standard part from its geometry | Bolts, bearings, connectors by catalogue |

### U27 Autopilot
| Node | Does | Options |
| --- | --- | --- |
| `auto.loop` | Generate, check, repair until clean or blocked | Time and cost budget; live view |
| `repair.library` | Strategies per finding kind | Ordered by cost; extensible |
| `repair.learn` | Keeps which repair worked where | Tried first next time |
| `repair.guard` | Undoes repairs that worsen anything | Across all checks |
| `debt.queue` | Blocked findings as named tasks | Cause, owner, cheapest next move |

### U28 Knowledge graph
| Node | Does | Options |
| --- | --- | --- |
| `kg.store` | One linked store of parts, materials, processes, laws, standards, suppliers, precedent | Sourced links only |
| `kg.ask` | Questions over the graph | Words or filters |
| `kg.gap` | What the graph does not know | Into the unknown queue |
| `kg.learn` | New facts from research and twins | Each with source and confidence |

### U29 Fidelity and verification
| Node | Does | Options |
| --- | --- | --- |
| `fidelity.escalate` | Climb the fidelity ladder where margins are thin | Per check |
| `check.units` | Dimensional consistency everywhere | On every wire |
| `check.conservation` | Mass, energy, charge, flow balanced | Per subsystem |
| `check.invariants` | Declared truths always hold | Per node |
| `check.margin` | Every safety factor against its standard | Ranked thinnest first |

### U30 Self-extension
| Node | Does | Options |
| --- | --- | --- |
| `node.synthesize` | Draft a missing node from a specification | Through the gauntlet before use |
| `node.improve` | Rewrite slow or failing nodes | Kept only if the gauntlet improves |
| `test.generate` | Property tests for any node | From its units and invariants |

### U31 Output to reality
| Node | Gives | Options |
| --- | --- | --- |
| `export.cad` | CAD files | STEP, glTF |
| `export.drawing` | Drawings with GD&T | Per part, per assembly |
| `export.toolpath` | Machining paths | CNC, by process |
| `export.print` | Sliced prints | By printer and material |
| `export.instructions` | Assembly steps with pictures | From `check.assembly` order |
| `export.wiring` | Wiring diagrams and pinouts | From the harness |
| `export.permit` | Permit drawings and schedules | By jurisdiction's code |
| `export.order` | Orders to suppliers | From `supply.match` |

### U32 Twin
| Node | Does | Options |
| --- | --- | --- |
| `twin.ingest` | Measurements from the built thing | Sensors, logs, scans |
| `twin.compare` | As-built against design | Deviations ranked |
| `twin.predict` | Wear and maintenance ahead | From measured use |

### U33 Collaboration
| Node | Does | Options |
| --- | --- | --- |
| `collab.live` | Many people and agents editing at once | Conflict-free |
| `review.pin` | Comments pinned to parts in 3D | Threads, status |
| `approve.change` | Approval on frozen contracts and baselines | Roles |

### U34 Lifetime
| Node | Does | Options |
| --- | --- | --- |
| `lifetime.cost` | Cost of ownership | Purchase, energy, service, disposal |
| `lifetime.energy` | Energy over its life | Use profile |
| `lifetime.co2` | Emissions over its life | Sourced factors |
| `end.recover` | Disassembly and recycling at end of life | Material recovery share |

### U35 Explain
| Node | Does | Options |
| --- | --- | --- |
| `report.generate` | A design report from the system | Requirements, decisions, proofs, risks |
| `explain.level` | Any result explained at a chosen depth | Beginner to specialist |

## 10. Node index

| Node | Group | Step |
| --- | --- | --- |
| `agent.team` | U21 | 17 |
| `anomaly.find` | U20 | 8 |
| `approve.change` | U33 | 15 |
| `auto.loop` | U27 | 3 |
| `baseline.freeze` | U17 | 10 |
| `bench.scale` | U12 | 17 |
| `body.model` | U8 | 12 |
| `budget.allocate` | U18 | 9 |
| `budget.margin` | U18 | 9 |
| `budget.rollup` | U18 | 9 |
| `cache.content` | U15 | 8 |
| `change.impact` | U17 | 10 |
| `change.propagate` | U17 | 10 |
| `check.assembly` | U9 | 7 |
| `check.circulation` | U8 | 12 |
| `check.conservation` | U29 | 7 |
| `check.ergonomics` | U8 | 12 |
| `check.failure` | U9 | 7 |
| `check.invariants` | U29 | 7 |
| `check.margin` | U29 | 7 |
| `check.reach` | U8 | 12 |
| `check.reliability` | U9 | 7 |
| `check.service` | U9 | 7 |
| `check.sight` | U8 | 12 |
| `check.tolerance` | U9 | 7 |
| `check.units` | U29 | 7 |
| `choose.options` | U3 | 5 |
| `choose.pareto` | U3 | 5 |
| `clash.broad` | U15 | 8 |
| `collab.live` | U33 | 15 |
| `commonality` | U16 | 10 |
| `compare` | U20 | 8 |
| `comply.code` | U19 | 13 |
| `config.variants` | U17 | 10 |
| `cost.estimate` | U23 | 13 |
| `debt.queue` | U27 | 3 |
| `dedupe.parts` | U16 | 10 |
| `end.recover` | U34 | 13 |
| `explain.level` | U35 | 15 |
| `export.cad` | U31 | 14 |
| `export.drawing` | U31 | 14 |
| `export.instructions` | U31 | 14 |
| `export.order` | U31 | 14 |
| `export.permit` | U31 | 14 |
| `export.print` | U31 | 14 |
| `export.toolpath` | U31 | 14 |
| `export.wiring` | U31 | 14 |
| `family.extract` | U16 | 10 |
| `fidelity.escalate` | U29 | 7 |
| `field.air` | U2 | 1 |
| `field.combine` | U2 | 1 |
| `field.heat` | U2 | 1 |
| `field.light` | U2 | 1 |
| `field.load` | U2 | 1 |
| `field.motion` | U2 | 1 |
| `field.reach` | U2 | 1 |
| `field.show` | U2 | 1 |
| `field.signal` | U2 | 1 |
| `field.sound` | U2 | 1 |
| `field.wet` | U2 | 1 |
| `gauntlet.solver` | U12 | 17 |
| `import.bom` | U26 | 11 |
| `import.cad` | U26 | 11 |
| `import.drawing` | U26 | 11 |
| `import.scan` | U26 | 11 |
| `index.spatial` | U15 | 8 |
| `infer.needs` | U1 | 9 |
| `intent.clarify` | U25 | 11 |
| `intent.photo` | U25 | 11 |
| `intent.reference` | U25 | 11 |
| `intent.sketch` | U25 | 11 |
| `intent.spec` | U25 | 11 |
| `intent.words` | U25 | 11 |
| `interface.check` | U14 | 9 |
| `interface.contract` | U14 | 9 |
| `interface.freeze` | U14 | 9 |
| `kg.ask` | U28 | 11 |
| `kg.gap` | U28 | 11 |
| `kg.learn` | U28 | 11 |
| `kg.store` | U28 | 11 |
| `layout.seed` | U10 | 5 |
| `lifetime.cost` | U34 | 13 |
| `lifetime.energy` | U34 | 13 |
| `line.plan` | U23 | 13 |
| `live.drag` | U13 | 17 |
| `live.review` | U13 | 17 |
| `lod.auto` | U15 | 8 |
| `make.bracket` | U7 | 6 |
| `make.duct` | U7 | 6 |
| `make.enclosure` | U7 | 6 |
| `make.harness` | U7 | 4 |
| `make.mount` | U7 | 6 |
| `make.shield` | U7 | 6 |
| `need.access` | U1 | 1 |
| `need.connect` | U1 | 1 |
| `need.face` | U1 | 1 |
| `need.group` | U1 | 1 |
| `need.keepout` | U1 | 1 |
| `need.mount` | U1 | 1 |
| `node.improve` | U30 | 16 |
| `node.synthesize` | U30 | 16 |
| `place.lock` | U4 | 2 |
| `place.negotiate` | U4 | 2 |
| `place.solve` | U4 | 2 |
| `place.whatif` | U4 | 2 |
| `place.why` | U4 | 2 |
| `precedent.mine` | U10 | 5 |
| `process.select` | U23 | 13 |
| `progress.track` | U21 | 17 |
| `query` | U20 | 8 |
| `recognise.part` | U26 | 11 |
| `repair.guard` | U27 | 3 |
| `repair.learn` | U27 | 3 |
| `repair.library` | U27 | 3 |
| `report.generate` | U35 | 15 |
| `req.capture` | U19 | 13 |
| `req.trace` | U19 | 13 |
| `req.verify` | U19 | 13 |
| `review.pin` | U33 | 15 |
| `risk.rank` | U24 | 13 |
| `risk.register` | U24 | 13 |
| `route.bundle` | U5 | 4 |
| `route.clip` | U5 | 4 |
| `route.network` | U5 | 4 |
| `route.path` | U5 | 4 |
| `route.slope` | U5 | 4 |
| `score.layout` | U12 | 5 |
| `sim.reduce` | U22 | 13 |
| `sim.sensitivity` | U22 | 13 |
| `sim.system` | U22 | 13 |
| `sim.uncertainty` | U22 | 13 |
| `size.battery` | U6 | 2 |
| `size.beam` | U6 | 4 |
| `size.bolt` | U6 | 4 |
| `size.drain` | U6 | 4 |
| `size.duct` | U6 | 4 |
| `size.fan` | U6 | 4 |
| `size.hose` | U6 | 4 |
| `size.motor` | U6 | 4 |
| `size.pipe` | U6 | 4 |
| `size.wire` | U6 | 4 |
| `solve.distribute` | U15 | 8 |
| `solve.incremental` | U15 | 8 |
| `space.bid` | U3 | 5 |
| `space.claim` | U3 | 5 |
| `standardize` | U16 | 10 |
| `stream.load` | U15 | 8 |
| `summarize` | U20 | 8 |
| `supply.match` | U23 | 13 |
| `surrogate.train` | U22 | 13 |
| `system.partition` | U14 | 9 |
| `system.tree` | U14 | 9 |
| `test.generate` | U30 | 16 |
| `twin.compare` | U32 | 14 |
| `twin.ingest` | U32 | 14 |
| `twin.predict` | U32 | 14 |
| `version.branch` | U17 | 10 |
| `view.slice` | U20 | 8 |
| `work.split` | U21 | 17 |

159 nodes, 0 built.

## 11. Steps

| Step | Scope | Groups | Output |
| --- | --- | --- | --- |
| 1 | Needs and fields on the Corolla bay | U1, U2 | Field images |
| 2 | Solver places the battery | U4, `size.battery` | Position, reason, trade-offs |
| 3 | Autopilot with the first repair strategies on the Corolla | U27 | Findings cleared without hand edits |
| 4 | Routing and sizing: cables, hoses, harness | U5, U6, `make.harness` | Routes, sizes |
| 5 | Claims, choices, precedent; full bay re-solve | U3, U10, `score.layout` | Findings vs 262 |
| 6 | Generated parts | U7 | Brackets, shields, ducts, mounts |
| 7 | Lifecycle, fidelity, verification | U9, U29 | Order, minutes, FMEA, stacks, margins |
| 8 | Scale engine and queries | U15, U20 | Times on the city and Cascadia |
| 9 | Hierarchy, contracts, budgets; hand-placed builds converted | U14, U18, `infer.needs` | Hand coordinates left |
| 10 | Variety reduction, configuration, change | U16, U17 | Unique count, change impact |
| 11 | Intent, import, knowledge graph | U25, U26, U28 | A design from words; a scanned part recognised |
| 12 | People and other domains | U8, U11 | A house, a board, a plant solved |
| 13 | Requirements, system simulation, manufacture, risk, lifetime | U19, U22, U23, U24, U34 | Trace, costs, risks, lifetime |
| 14 | Output to reality and twin | U31, U32 | Exports; as-built comparison |
| 15 | Collaboration and explanation | U33, U35 | Shared editing; a design report |
| 16 | Self-extension | U30 | A node drafted and proven by the gauntlet |
| 17 | Orchestration, live, proof at scale | U12, U13, U21 | 1,000,000 / 100,000 benchmark |

## 12. Measures

| Measure | Target |
| --- | --- |
| Hand coordinates | 0 |
| Findings cleared without hand edit | 100 % |
| Sourced figures | 100 % (rest labelled) |
| Requirements traced to a check | 100 % |
| Solve time, one module | Live while dragging |
| Re-solve after one change, 1,000,000 parts | Seconds (estimate to be measured) |
| Unique parts after variety reduction | Falling, reported |
| Blind check | Indistinguishable from a real layout |
| Findings cleared by autopilot | 100 %, rest named |
| Questions asked per design | Fewest that settle it |
| Words to buildable design | Minutes (estimate to be measured) |
| Invariant violations | 0 |
| Gaps in the repair library | Listed, falling |

## 13. Limits

| Limit | Mitigation |
| --- | --- |
| Physics solves slow in browser | Surrogates, reduced-order models, remote workers |
| Discrete search can wander | Scores from fields, precedent, Pareto fronts |
| Placement data mostly unpublished | Label as typical |
| Codes and standards often paywalled | Cite clause; label where unread |
| 1,000,000 parts exceed one browser's memory | Streaming, references, content cache, remote solve |
| Many rounds of work | One step per round |
| Photo and scan recognition is approximate | Confidence shown; person confirms low-confidence parts |
| Synthesized nodes can be wrong | Gauntlet and generated tests before use |
| Web unreachable from this container | Research by Claude kept as sourced data; live where reachable |
| Exports for real manufacture carry liability | Marked for an engineer's sign-off |

## 14. Starting state

Gate: 9 of 1,630 tests fail. Causes:
- `bearing-6206zz` is not stored in the inventory.
- `crush-washer` has no size.
- Timeouts from `clearPath` layout.

| Build | Findings | Main cause |
| --- | --- | --- |
| Corolla | 262 | EGR heat at battery; hood latch in radiator |
| Cascadia | 279 | Engine through hood and cross members; cab, grille, axle |
| Rancher | 1 | Cross tube into oil pickup |
| CRF450R | 3 | Swingarm into frame spars |
| Forklift, mower, kart | 0 | — |
