# Engineering at any scale as nodes

Status: plan, not built. Base: commit `14e3283`.
Design target: 1,000,000 components, 100,000 unique, solved, checked, changed and understood without hand edits.

## Contents

1. [Rules](#1-rules)
2. [Pipeline](#2-pipeline)
3. [Scale model](#3-scale-model)
4. [Node contract](#4-node-contract)
5. [Glossary](#5-glossary)
6. [Existing base](#6-existing-base)
7. [Node groups](#7-node-groups)
8. [Node index](#8-node-index)
9. [Steps](#9-steps)
10. [Measures](#10-measures)
11. [Limits](#11-limits)
12. [Starting state](#12-starting-state)

## 1. Rules

1. No hand-typed positions or sizes.
2. Parts state needs; solvers place, route and size, and give the reason.
3. Every figure from a law, standard or source; otherwise labelled typical or estimate.
4. Unsolved → named task with its cause.
5. Never solve flat: solve by hierarchy, interface and unique part.
6. Each step shown before the next.

## 2. Pipeline

```
requirements → functions → architecture → space claims → layout → routing → sizing → generated parts
→ detail → manufacture → assembly → service → proof
```

| Property | Meaning |
| --- | --- |
| Bidirectional | A change at any stage flows up and down |
| Incremental | Only what a change reaches is redone |
| Traceable | Every result links to the requirement and source behind it |
| Explainable | Every result can say why |

## 3. Scale model

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

## 4. Node contract

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

## 5. Glossary

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
| Finding | Rules-checker problem: interference, clearance, heat |

## 6. Existing base

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

## 7. Node groups

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

## 8. Node index

| Node | Group | Step |
| --- | --- | --- |
| `agent.team` | U21 | 12 |
| `anomaly.find` | U20 | 7 |
| `baseline.freeze` | U17 | 9 |
| `bench.scale` | U12 | 12 |
| `body.model` | U8 | 10 |
| `budget.allocate` | U18 | 8 |
| `budget.margin` | U18 | 8 |
| `budget.rollup` | U18 | 8 |
| `cache.content` | U15 | 7 |
| `change.impact` | U17 | 9 |
| `change.propagate` | U17 | 9 |
| `check.assembly` | U9 | 6 |
| `check.circulation` | U8 | 10 |
| `check.ergonomics` | U8 | 10 |
| `check.failure` | U9 | 6 |
| `check.reach` | U8 | 10 |
| `check.reliability` | U9 | 6 |
| `check.service` | U9 | 6 |
| `check.sight` | U8 | 10 |
| `check.tolerance` | U9 | 6 |
| `choose.options` | U3 | 4 |
| `choose.pareto` | U3 | 4 |
| `clash.broad` | U15 | 7 |
| `commonality` | U16 | 9 |
| `compare` | U20 | 7 |
| `comply.code` | U19 | 11 |
| `config.variants` | U17 | 9 |
| `cost.estimate` | U23 | 11 |
| `dedupe.parts` | U16 | 9 |
| `family.extract` | U16 | 9 |
| `field.air` | U2 | 4 |
| `field.combine` | U2 | 1 |
| `field.heat` | U2 | 1 |
| `field.light` | U2 | 10 |
| `field.load` | U2 | 5 |
| `field.motion` | U2 | 1 |
| `field.reach` | U2 | 1 |
| `field.show` | U2 | 1 |
| `field.signal` | U2 | 3 |
| `field.sound` | U2 | 10 |
| `field.wet` | U2 | 6 |
| `gauntlet.solver` | U12 | 12 |
| `index.spatial` | U15 | 7 |
| `infer.needs` | U1 | 8 |
| `interface.check` | U14 | 8 |
| `interface.contract` | U14 | 8 |
| `interface.freeze` | U14 | 8 |
| `layout.seed` | U10 | 4 |
| `line.plan` | U23 | 11 |
| `live.drag` | U13 | 12 |
| `live.review` | U13 | 12 |
| `lod.auto` | U15 | 7 |
| `make.bracket` | U7 | 5 |
| `make.duct` | U7 | 5 |
| `make.enclosure` | U7 | 5 |
| `make.harness` | U7 | 3 |
| `make.mount` | U7 | 5 |
| `make.shield` | U7 | 5 |
| `need.access` | U1 | 1 |
| `need.connect` | U1 | 1 |
| `need.face` | U1 | 1 |
| `need.group` | U1 | 1 |
| `need.keepout` | U1 | 1 |
| `need.mount` | U1 | 1 |
| `place.lock` | U4 | 2 |
| `place.negotiate` | U4 | 2 |
| `place.solve` | U4 | 2 |
| `place.whatif` | U4 | 2 |
| `place.why` | U4 | 2 |
| `precedent.mine` | U10 | 4 |
| `process.select` | U23 | 11 |
| `progress.track` | U21 | 12 |
| `query` | U20 | 7 |
| `req.capture` | U19 | 11 |
| `req.trace` | U19 | 11 |
| `req.verify` | U19 | 11 |
| `risk.rank` | U24 | 11 |
| `risk.register` | U24 | 11 |
| `route.bundle` | U5 | 3 |
| `route.clip` | U5 | 3 |
| `route.network` | U5 | 10 |
| `route.path` | U5 | 3 |
| `route.slope` | U5 | 10 |
| `score.layout` | U12 | 4 |
| `sim.reduce` | U22 | 11 |
| `sim.sensitivity` | U22 | 11 |
| `sim.system` | U22 | 11 |
| `sim.uncertainty` | U22 | 11 |
| `size.battery` | U6 | 2 |
| `size.beam` | U6 | 10 |
| `size.bolt` | U6 | 5 |
| `size.drain` | U6 | 10 |
| `size.duct` | U6 | 5 |
| `size.fan` | U6 | 5 |
| `size.hose` | U6 | 3 |
| `size.motor` | U6 | 5 |
| `size.pipe` | U6 | 10 |
| `size.wire` | U6 | 3 |
| `solve.distribute` | U15 | 7 |
| `solve.incremental` | U15 | 7 |
| `space.bid` | U3 | 4 |
| `space.claim` | U3 | 4 |
| `standardize` | U16 | 9 |
| `stream.load` | U15 | 7 |
| `summarize` | U20 | 7 |
| `supply.match` | U23 | 11 |
| `surrogate.train` | U22 | 11 |
| `system.partition` | U14 | 8 |
| `system.tree` | U14 | 8 |
| `version.branch` | U17 | 9 |
| `view.slice` | U20 | 7 |
| `work.split` | U21 | 12 |

112 nodes, 0 built.

## 9. Steps

| Step | Scope | Groups | Output |
| --- | --- | --- | --- |
| 1 | Needs and first fields on the Corolla bay | U1, U2 | Field images |
| 2 | Solver places the battery | U4, `size.battery` | Position, reason, trade-offs |
| 3 | Routing and sizing: cables, hoses, harness | U5, U6, `make.harness` | Routes, sizes |
| 4 | Claims, choices; full bay re-solve | U3, U10, `score.layout` | Findings vs 262 |
| 5 | Generated parts | U7 | Brackets, shields, ducts, mounts |
| 6 | Lifecycle | U9 | Order, minutes, FMEA, stacks |
| 7 | Scale engine and queries | U15, U20 | Times on the city and Cascadia |
| 8 | Hierarchy, contracts, budgets; hand-placed builds converted | U14, U18, `infer.needs` | Hand coordinates left |
| 9 | Variety reduction, configuration, change | U16, U17 | Unique count, change impact |
| 10 | People and other domains | U8, U11 | A house, a board, a plant solved |
| 11 | Requirements, system simulation, manufacture, risk | U19, U22, U23, U24 | Trace, costs, top risks |
| 12 | Orchestration, live, proof at scale | U12, U13, U21 | 1,000,000 / 100,000 benchmark |

## 10. Measures

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

## 11. Limits

| Limit | Mitigation |
| --- | --- |
| Physics solves slow in browser | Surrogates, reduced-order models, remote workers |
| Discrete search can wander | Scores from fields, precedent, Pareto fronts |
| Placement data mostly unpublished | Label as typical |
| Codes and standards often paywalled | Cite clause; label where unread |
| 1,000,000 parts exceed one browser's memory | Streaming, references, content cache, remote solve |
| Many rounds of work | One step per round |

## 12. Starting state

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
