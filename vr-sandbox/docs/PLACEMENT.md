# Engineering at any scale as nodes

Status: steps 0 to 2 built (`need`, `field`, `field.combine`, `field.show`, `place.solve`, `size.select` for batteries, `explain`); the rest planned. Base: commit `14e3283`.
Target: 1,000,000 components, 100,000 unique, solved, checked, changed and understood without hand edits.
End state: a person states what they want; the system does the rest, asks only what matters, and returns a buildable, proven design.

## Contents

1. [Rules](#1-rules)
2. [Pipeline](#2-pipeline)
3. [Effortless use](#3-effortless-use)
4. [Autopilot loop](#4-autopilot-loop)
5. [Scale model](#5-scale-model)
6. [Node contract](#6-node-contract)
7. [Engine features (not nodes)](#7-engine-features-not-nodes)
7a. [Data model](#7a-data-model)
8. [Glossary](#8-glossary)
9. [Existing base](#9-existing-base)
10. [Node layers](#10-node-layers)
11. [Node index](#11-node-index)
12. [Merges in this plan](#12-merges-in-this-plan)
13. [Merges in the existing library](#13-merges-in-the-existing-library)
14. [Steps](#14-steps)
15. [Measures](#15-measures)
16. [Limits](#16-limits)
17. [Starting state](#17-starting-state)

## 1. Rules

1. No hand-typed positions or sizes.
2. Parts state needs; solvers place, route and size, and give the reason.
3. Every figure from a law, standard or source; otherwise labelled typical or estimate.
4. Every finding has an automatic repair, or is a named gap in the repair library.
5. Every figure is checked: units, conservation, invariants.
6. Never solve flat: solve by hierarchy, interface and unique part.
7. Ask the person only what changes the answer most.
8. One node per ability: a node another node does better is merged into it.
9. Unsolved → named task with its cause.
10. Each step shown before the next.

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
| Says, sketches, photographs or points at a product | Requirements, each with source or assumption |
| Answers a few questions | Asks only those with the highest value |
| Watches it build | Autopilot loop, live in 3D |
| Picks among trade-offs | Pareto front with costs |
| Grabs and moves anything | Re-solves around the choice; names what resists |
| Asks anything | Answers from the system and the knowledge graph |
| Exports | CAD, drawings, toolpaths, prints, instructions, wiring, permits, orders |

## 4. Autopilot loop

```
generate → check (rules, fields, budgets, contracts, codes, invariants) → findings
→ repair (library, cheapest first) → re-check → keep if better
→ until clean or blocked → blocked findings become named tasks with their cause
```

| Part | Does |
| --- | --- |
| Repair library | Per finding kind, ordered strategies: move, reroute, shield, resize, bore, join, swap part, change choice, rebalance budget, renegotiate contract |
| Fidelity on demand | Cheap checks first; full physics only where margins are thin |
| Learning | Repairs that worked are tried first next time |
| Guard | A repair that worsens anything is undone |
| Stop | Clean, blocked or out of budget; always reported |

## 5. Scale model

| Lever | Effect | Where |
| --- | --- | --- |
| Hierarchy | About 5 levels of about 16 children: no solve sees more than about 100 things | `system.tree`, `system.partition` |
| Interfaces as contracts | Modules solve against neighbours' contracts, not their insides | `interface.contract` |
| Solve each unique once | 100,000 solves, not 1,000,000 | Content cache |
| Variety reduction | Near-duplicates merged into families | `similar`, `family.extract`, `standardize` |
| Spatial index | Clash and field queries in O(n log n) | Spatial index, broad phase |
| Incremental | A change re-solves its module and touched contracts | `change.impact`, incremental runs |
| Parallel | Modules solved at once | `distribute` |
| Budgets | Allocated down, rolled up | `budget` |
| Queries | Ask, do not scroll | `query` |
| Streaming | Load and draw only what is in view | Streaming, level of detail |

Figures in this table are planning estimates.

## 6. Node contract

Every node, existing and new:

| Requirement | Meaning |
| --- | --- |
| Units | Typed ports with units, converted on wires |
| Lists | Maps over lists of any length |
| References | Takes shared assemblies by reference; never copies |
| Cached | Keyed by content hash |
| Incremental | Reruns only on changed inputs |
| Streaming | Partial results while running; cancellable |
| Explained | Every output carries its reason |
| Sourced | Every figure carries its source or label |
| Confidence | Every output carries how sure it is |
| Scoped | Runs on a system, module, selection or query result |
| Self-checked | Units, conservation, invariants on its outputs |
| Versioned | Any past state replayable |
| Repairable | Failures name a repair strategy or a gap |
| Tested | Own tests, generated property tests; passes the gauntlet |
| Budgeted | Reports time and memory; respects a limit |

## 7. Engine features (not nodes)

Built into the runner, renderer or app so every node gets them; never placed on a board.

| Feature | Was planned as | Lives in |
| --- | --- | --- |
| Content cache | `cache.content` | `dataflow.ts` |
| Incremental re-solve | `solve.incremental`, `change.propagate` | `dataflow.ts` |
| Spatial index | `index.spatial` | `make/space.ts` |
| Broad phase | `clash.broad` | `make/rules.ts` |
| Streaming | `stream.load` | `space3d.ts` |
| Level of detail | `lod.auto` | `space3d.ts` |
| Fidelity escalation | `fidelity.escalate` | `auto.loop`, checks |
| Repair learning, guard | `repair.learn`, `repair.guard` | `auto.loop` |
| Property tests | `test.generate` | `gauntlet.ts` |
| Task list | `debt.queue` | Existing `task`, `unknown.queue` |
| Progress | `progress.track` | Existing events (`on.event`) |
| Shared editing | `collab.live` | App (CRDT) |
| Comments in 3D | `review.pin` | App |
| Drag and re-solve | `live.drag` | `space.ts`, `dock3d.ts` |
| VR review | `live.review` | `space.ts` |

## 7a. Data model

Owner: `src/nexus/placement/` (`model.ts`, `fields.ts`). Every placement node reads and writes these.

| Type | Holds | Read from |
| --- | --- | --- |
| `Need` | kind (mount, connect, keepout, face, access, group), part and path, what it is to, distance kept or most allowed (°C), facing, how often reached, hard or soft, why, source, confidence | `needsOf(part)`: `Part.hot`, `Part.clear`, `Part.travel`, `joins`, `passes`, `fixed`, `Iface`, each material's `MAX_SERVICE`; access and facing from what a part is (confidence 0.7) |
| `Field` | kind, unit, grid (least corner, cell, dims), a value per cell, which cells are solid, sources | `fieldOf(part, kind, { around, grow, step })` |

| Field | Value per cell | Model |
| --- | --- | --- |
| heat | °C | The rules' own: each hot surface's excess over 40 °C falling e times each 40 mm (an estimate), blocked by any solid between |
| motion | m of room | Wheels at each corner of their steer and bump; belts and fans by their clearance; the engine rocking ±10 mm on its mounts (an estimate); read to 60 mm |
| reach | m of reach | Shoulders 0.3 m over the bay's edge at the front and sides (an estimate), arm 0.65 m (typical); only where the line straight up is clear, hood open |

Not yet: the `group` need is never read (nothing states it); fields are recomputed per node (no shared cache of the layout).

## 8. Glossary

| Term | Meaning |
| --- | --- |
| Autopilot | The generate–check–repair loop that runs until clean or blocked |
| Bid | A subsystem's claim on contested space: need and cost of elsewhere |
| Broad phase | Cheap pass that finds candidate clashes before exact checks |
| Budget | Allowance of mass, power, heat, cost, volume, data or CO₂, allocated down and rolled up |
| Choice | Discrete decision (gearbox side, exhaust side, radiator count) |
| Confidence | How sure a result is, and why |
| Connective parts | Brackets, clips, supports, shields, ducts, harnesses; generated |
| Content hash | Identity of a result from its inputs; the cache key |
| CRDT | Data structure that lets many editors change one design at once without conflicts |
| Digital twin | The design linked to the built thing's measurements |
| Engine feature | A capability of the runner, renderer or app that every node gets; not a node |
| Envelope | Volume occupied; the moving envelope includes everything swept |
| Family | Unique parts merged into one parametric design |
| Fidelity ladder | Rule of thumb → law → surrogate → full simulation → physical test |
| Field | Map of one quantity over space |
| Finding | Rules-checker problem: interference, clearance, heat |
| FMEA | Failure modes and effects per part, rolled up |
| GD&T | Geometric dimensioning and tolerancing on drawings |
| Hand coordinate | Position typed into code; target 0 |
| Harness | Wires routed as one bundle with branches, clips, connectors |
| Intent | What the person wants, in any form |
| Interface contract | What a module promises: ports, envelope, loads, heat, budget |
| Invariant | What must always hold: mass conserved, energy balanced, units consistent |
| Keep-out | Required distance from material limits, motion or code; hard or soft |
| Knowledge graph | One linked store of parts, materials, processes, laws, standards, suppliers, precedent |
| Lock | A pinned result, frozen contract or baseline; changes need approval |
| Margin | Budget or safety factor left; tracked per level |
| Module | A subtree solved as a unit against its contracts |
| Need | What a part requires: mount, connect, keep-out, face, access, group |
| Partition | Split of a system into modules by coupling |
| Precedent | Sourced placement from real products |
| Reason | What holds a result where it is |
| Reduced model | A smaller model of a system: reduced-order or learned |
| Removal path | Clear way in and out of a part's place |
| Repair strategy | An automatic fix for one kind of finding |
| Requirement | A stated need of the whole, traced to parts and checks |
| Route | Path of a wire, hose, pipe, duct, drain, road or data link |
| Seed | Solved thing kept as one reusable node |
| Space claim | Zone given to one subsystem before detailing |
| Spatial index | Tree over space for fast nearest and overlap queries |
| Tolerance stack | Summed manufacturing variation, worst case or statistical |
| Trade-off | Ranked option with its cost when something will not fit |
| Unique part | A distinct design; its placements share one solve |
| Value of information | How much an answer would change the design; decides what to ask |
| Variant | A configuration of options over one design |
| Version | A branch, trial or baseline of the whole design |

## 9. Existing base

| Have | Where | Becomes |
| --- | --- | --- |
| Typed ports, units, incremental runs, groups as blocks | `blocks.ts`, `dataflow.ts` | Node contract base, content cache |
| Shared placement, instancing | `assembly.ts`, `space3d.ts` | Streaming, level of detail |
| Iface, Port | `kits.ts`, `mate.ts` | `need`, `interface.contract` |
| Interference, clearance, heat gate | `make/rules.ts` (`check.rules`) | Exact checks after the broad phase |
| Oriented-box layout | `make/space.ts` | Solver geometry, spatial index |
| `clearPath` | `make/space.ts` | Replaced by `route` |
| Swept room, servo | `make/critic.ts`, `motion.ts` | `field` (motion) |
| Load cases, strength, stress sweep | `loads.ts`, `sweep.range` | `size.select`, `make.bracket`, `study` |
| Jolt physics | `sim.ts` | Mount rock, removal paths, `sim.system` |
| Explode | `view/kit3d.ts` | `check.assembly` |
| Inventory to elements, breakdown | `inventory.ts`, `breakdown.ts` | `kg.store`, `cost.estimate` |
| Families from standards | `families.ts`, `components.ts` | `family.extract`, `standardize`, `size.select` |
| Enclosure maker | `makers.ts` (`make.enclosure`) | Upgraded in place |
| Seeds | `seeds.ts` | `layout.seed` |
| Sourced notes | `research.ts` | `kg.learn` |
| Gauntlet, unknown queue, tasks | `gauntlet.ts` | Upgraded `gauntlet`, task list |

## 10. Node layers

Twelve layers, in the order a design flows through them. 65 nodes.

### A. Describe
| Node | Does | Options |
| --- | --- | --- |
| `intent` | Requirements from any input | Words, sketch, reference product, spec sheet, standard, document; assumptions listed |
| `intent.clarify` | The fewest questions with the most value | Stops when answers stop changing the design |
| `import` | Outside data into parts | CAD (STEP, IGES, STL, glTF), scan, photo, drawing, bill of materials |
| `recognise` | Identify standard parts and products from geometry or photos | By catalogue; confidence shown |
| `need` | What a part requires | Mount, connect, keep-out, face, access, group; hard or soft; directional; time-varying |
| `infer.needs` | Needs read from a hand-placed build | Confidence per need; review list |
| `req.trace` | Requirement → part → check, and coverage | Gaps listed; per baseline |

### B. Know
| Node | Does | Options |
| --- | --- | --- |
| `kg.store` | One linked store of parts, materials, processes, laws, standards, suppliers, precedent | Sourced links only |
| `kg.learn` | New facts and precedent from research and twins | Source and confidence each; gaps to the unknown queue |
| `query` | Ask the system and the graph | Words or filters; any result shown as a view |
| `similar` | Find alike or unlike | Near-duplicates, anomalies, commonality; by shape, size, material, function |
| `layout.seed` | Solved layouts kept and reused | Nearest match, adapted |

### C. Sense
| Node | Does | Options |
| --- | --- | --- |
| `field` | Map of one quantity over space | Heat, motion (sweep, mount rock, thermal growth, deflection), reach, sight, air, wet, signal, load, sound, light; steady or transient; surrogate for live |
| `field.combine` | Fields as one weighted cost | Per need; per priority profile |
| `field.show` | Draw any field in 3D | Slices, isosurfaces, glow on parts |

### D. Decide
| Node | Does | Options |
| --- | --- | --- |
| `space.claim` | Top-down zoning | Fixed, flexible, shared |
| `choose.options` | Search discrete choices | Exhaustive or tree search; seeded by precedent |
| `tradeoff` | Pareto front, bids for space, ranked options with costs | Auto-pick by profile or ask |
| `place.solve` | Place everything | Global or local; anytime; incremental |
| `lock` | Pin results, freeze contracts and baselines | Approval by role |

### E. Connect
| Node | Does | Options |
| --- | --- | --- |
| `route` | Single runs or whole networks | Wire, hose, pipe, duct, drain, road, data; bundling into harnesses; slopes; bend radius; redundancy |
| `size.line` | Size any run | Wire (current, length, drop, derating), hose and pipe (flow, pressure), duct (airflow, velocity), drain (fixture units) |
| `size.select` | Catalogue item by duty | Battery, motor, fan, bolt, bearing, pump |
| `size.section` | Members by load | Beams, columns, tubes; deflection limit |

### F. Make
| Node | Does | Options |
| --- | --- | --- |
| `make.bracket` | Bracket grown from its load | Pressed, cast, machined, printed |
| `make.shield` | Heat or splash shield from the field | Material by temperature |
| `make.mount` | Isolation mount | Stiffness from vibration target |
| `make.support` | Clips, hangers, supports along routes | Spacing by weight, vibration, code |
| `make.enclosure` | Housing round contents (existing, upgraded) | Process, sealing, cooling |
| `family.extract` | Uniques merged into parametric families | Parameters inferred |
| `standardize` | Specials swapped for standard parts | From catalogues |

### G. Check
| Node | Does | Options |
| --- | --- | --- |
| `check.invariants` | Units, conservation, declared truths | Per subsystem |
| `margin` | Budget and safety-factor margins | Ranked thinnest first; warn below threshold |
| `check.tolerance` | Tolerance stacks | Worst case, statistical, Monte Carlo |
| `check.failure` | Failure modes, rates, effects | Per part, rolled up |
| `check.assembly` | Build and service sequences, removal paths, minutes | Manual, robot, line |
| `check.human` | Reach, sight, posture, force | Body sizes from published percentiles |
| `comply.code` | Codes and standards | Building codes, ISO, SAE, NEC; circulation |
| `interface.check` | Every contract met on both sides | Per change |

### H. Repair
| Node | Does | Options |
| --- | --- | --- |
| `auto.loop` | Generate, check, repair until clean or blocked | Time and cost budget; live view |
| `repair.library` | Strategies per finding kind | Ordered by cost; extensible |

### I. Scale and change
| Node | Does | Options |
| --- | --- | --- |
| `system.tree` | System → subsystem → module → assembly → part | Any depth |
| `system.partition` | Modules by coupling | Spatial, functional, by team |
| `interface.contract` | What a module promises | Versioned |
| `budget` | Allocate down, roll up | Mass, power, heat, cost, volume, data, CO₂ |
| `distribute` | Divide work and solve in parallel | Workers, machines, agents |
| `change.impact` | Everything a change reaches | Through contracts, fields, budgets |
| `version` | Branch, trial, merge, baseline | 3D diff via `compare` |
| `config.variants` | Options over one design | Rules between options |

### J. Simulate
| Node | Does | Options |
| --- | --- | --- |
| `sim.system` | The whole as connected models | Mechanical, thermal, electrical, fluid, control |
| `model.reduce` | Smaller models of slow ones | Reduced-order or learned; error bound |
| `study` | How results move with inputs (upgrade of `sweep.range`) | Sweep, sensitivity, uncertainty |

### K. Deliver
| Node | Does | Options |
| --- | --- | --- |
| `process.select` | Process per part | By volume, material, tolerance |
| `cost.estimate` | Cost per part, rolled up | Material, process, assembly |
| `supply.match` | Catalogue or supplier per part | Lead time, region |
| `line.plan` | Assembly line stations and order | Takt time |
| `export` | Out to reality | CAD, drawings with GD&T, toolpaths, prints, instructions, wiring, permits, orders |
| `lifetime` | Over its whole life | Cost, energy, CO₂, end-of-life recovery |
| `twin` | The built thing's measurements | Ingest, predict wear and maintenance |

### L. Explain and prove
| Node | Does | Options |
| --- | --- | --- |
| `explain` | Why any result is as it is | Reasons, summaries, reports; beginner to specialist |
| `compare` | Any two: designs, versions, as-built | Differences ranked |
| `risk` | Risk register, ranked | From failures, budgets, margins |
| `score` | Layout and design scores | Hand coordinates, findings, time, similarity to real products |
| `gauntlet` | Existing gauntlet, upgraded | Adversarial variants; 1,000,000 / 100,000 benchmark |
| `node.synthesize` | Draft or improve a node from a specification | Through the gauntlet before use |

## 11. Node index

| Node | Layer | Step |
| --- | --- | --- |
| `auto.loop` | H | 3 |
| `budget` | I | 9 |
| `change.impact` | I | 10 |
| `check.assembly` | G | 7 |
| `check.failure` | G | 7 |
| `check.human` | G | 12 |
| `check.invariants` | G | 7 |
| `check.tolerance` | G | 7 |
| `choose.options` | D | 5 |
| `compare` | L | 14 |
| `comply.code` | G | 12 |
| `config.variants` | I | 10 |
| `cost.estimate` | K | 13 |
| `distribute` | I | 15 |
| `explain` | L | 2 |
| `export` | K | 14 |
| `family.extract` | F | 10 |
| `field` | C | 1 |
| `field.combine` | C | 1 |
| `field.show` | C | 1 |
| `gauntlet` | L | 15 |
| `import` | A | 11 |
| `infer.needs` | A | 9 |
| `intent` | A | 11 |
| `intent.clarify` | A | 11 |
| `interface.check` | G | 9 |
| `interface.contract` | I | 9 |
| `kg.learn` | B | 5 |
| `kg.store` | B | 11 |
| `layout.seed` | B | 5 |
| `lifetime` | K | 13 |
| `line.plan` | K | 13 |
| `lock` | D | 10 |
| `make.bracket` | F | 6 |
| `make.enclosure` | F | 6 |
| `make.mount` | F | 6 |
| `make.shield` | F | 6 |
| `make.support` | F | 6 |
| `margin` | G | 7 |
| `model.reduce` | J | 13 |
| `need` | A | 1 |
| `node.synthesize` | L | 15 |
| `place.solve` | D | 2 |
| `process.select` | K | 13 |
| `query` | B | 8 |
| `recognise` | A | 11 |
| `repair.library` | H | 3 |
| `req.trace` | A | 11 |
| `risk` | L | 13 |
| `route` | E | 4 |
| `score` | L | 5 |
| `sim.system` | J | 13 |
| `similar` | B | 8 |
| `size.line` | E | 4 |
| `size.section` | E | 12 |
| `size.select` | E | 2 |
| `space.claim` | D | 5 |
| `standardize` | F | 10 |
| `study` | J | 13 |
| `supply.match` | K | 13 |
| `system.partition` | I | 9 |
| `system.tree` | I | 9 |
| `tradeoff` | D | 5 |
| `twin` | K | 14 |
| `version` | I | 10 |

65 nodes, 7 built (`need`, `field`, `field.combine`, `field.show`, `place.solve`, `size.select`, `explain`).

## 12. Merges in this plan

159 planned nodes → 65 nodes and 15 engine features. Each row: what was deleted, what does it better, why.

| Deleted | Kept | Why |
| --- | --- | --- |
| `intent.words`, `intent.sketch`, `intent.reference`, `intent.spec`, `req.capture` | `intent` | One reader of wants; input kind is an option |
| `intent.photo`, `import.cad`, `import.scan`, `import.drawing`, `import.bom` | `import` | One reader of outside data; format is an option |
| `recognise.part` | `recognise` | Also recognises whole products |
| `need.mount`, `need.connect`, `need.keepout`, `need.face`, `need.access`, `need.group` | `need` | One need node; kind is an option |
| `req.verify` | `req.trace` | Coverage is a trace summed |
| `kg.ask`, `view.slice` | `query` | A view is a query result shown |
| `precedent.mine` | `kg.learn` | Precedent is one kind of learned fact |
| `kg.gap` | Existing `unknown.queue` | Already does it |
| `dedupe.parts`, `anomaly.find`, `commonality` | `similar` | Alike and unlike are one similarity search |
| `field.heat`, `field.motion`, `field.reach`, `field.air`, `field.wet`, `field.signal`, `field.load`, `field.sound`, `field.light` | `field` | Same machinery; quantity is an option |
| `choose.pareto`, `place.negotiate`, `space.bid` | `tradeoff` | All rank options by cost |
| `place.lock`, `interface.freeze`, `baseline.freeze`, `approve.change` | `lock` | All pin something behind approval |
| `place.whatif`, `version.branch` | `version` | A trial is an uncommitted branch |
| `place.why`, `explain.level`, `report.generate`, `summarize` | `explain` | All say why or what, at a chosen depth |
| `route.path`, `route.bundle`, `route.slope`, `route.network`, `make.harness`, `make.duct` | `route` | A harness and a duct are routed runs |
| `route.clip` | `make.support` | Supports are generated parts |
| `size.wire`, `size.hose`, `size.pipe`, `size.duct`, `size.drain` | `size.line` | Every run sized from what flows in it |
| `size.battery`, `size.motor`, `size.fan`, `size.bolt` | `size.select` | All pick a catalogue item by duty |
| `size.beam` | `size.section` | Covers columns and tubes too |
| `check.units`, `check.conservation` | `check.invariants` | Units and conservation are invariants |
| `budget.margin`, `check.margin` | `margin` | Budget left and safety factor are both margins |
| `check.reliability` | `check.failure` | Rates belong with modes and effects |
| `check.service` | `check.assembly` | Service is a removal sequence |
| `body.model`, `check.reach`, `check.sight`, `check.ergonomics` | `check.human` | One check over body models |
| `check.circulation` | `comply.code` | Circulation is a code requirement |
| `budget.allocate`, `budget.rollup` | `budget` | Down and up are one tree pass |
| `solve.distribute`, `work.split`, `agent.team` | `distribute` | Workers and agents are both workers |
| `sim.reduce`, `surrogate.train` | `model.reduce` | Learned or reduced-order, same purpose |
| `sim.sensitivity`, `sim.uncertainty` | `study` | Both sweep inputs; extends existing `sweep.range` |
| `export.cad`, `export.drawing`, `export.toolpath`, `export.print`, `export.instructions`, `export.wiring`, `export.permit`, `export.order` | `export` | Format is an option |
| `lifetime.cost`, `lifetime.energy`, `lifetime.co2`, `end.recover` | `lifetime` | One pass over the life |
| `twin.ingest`, `twin.predict` | `twin` | One link to the built thing |
| `twin.compare` | `compare` | As-built is one more thing to compare |
| `risk.register`, `risk.rank` | `risk` | A register is kept ranked |
| `score.layout` | `score` | Scores more than layouts |
| `gauntlet.solver`, `bench.scale` | `gauntlet` | Modes of the existing gauntlet |
| `node.improve` | `node.synthesize` | Improving is synthesizing from the old node |
| `make.enclosure` (planned) | Existing `make.enclosure` | Upgrade, not a second |
| `cache.content`, `solve.incremental`, `change.propagate`, `index.spatial`, `clash.broad`, `stream.load`, `lod.auto`, `fidelity.escalate`, `repair.learn`, `repair.guard`, `test.generate`, `debt.queue`, `progress.track`, `collab.live`, `review.pin`, `live.drag`, `live.review` | Engine features (section 7) | Every node gets them; not placed on boards |

## 13. Merges in the existing library

Done in step 0. Each candidate was read in code before merging; old ids stay as adapters (`ALIASES` in `blocks.ts`): not in
the library, they run as before through the kept block, and `rewire` (`dataflow.ts`) moves boards on to the kept block.

| Merged | Into | How |
| --- | --- | --- |
| `math.sum` | `math.stats` | Gains `sum`, `count` and many wires in; an empty list sums to 0 |
| `in.slider` | `in.number` | Gains ends (`min`, `max`) and `style: slider` |
| `array.line`, `array.circle`, `array.grid` | `array` | `pattern`: line, ring, grid; ports per pattern |
| `place.points` | `place` | Optional `points` table; x, y, z move each |
| `read.block`, `read.item` | `read` | `block:` or `item:` prefix, or `kind` |
| `gauntlet.gate` | `gauntlet.run` | One gate chosen; gains `unknowns` |
| `unknown.sort` | `unknown.queue` | Gains `only`, `clusters`, `clusterCount`, `first` |
| `research.ref` | `research.notes` | `from`: a kept reference or your notes; gains `sources` |

Candidates rejected on reading:

| Kept | Was to merge into | Why kept |
| --- | --- | --- |
| `check.limit` | `logic.compare` | Gives margin and factor of safety; seed of `margin` |
| `rows.set` | `rows.recode` | Value on a wire, given round the rows in turn; not a rule match |
| `check.turning` | `check.rules` | Builds an engine through a turn; `check.rules` has no motion yet |
| `piece` | `explode` | Lifts one piece out; explode spreads them all |
| `hole` | `bore` | Deliberate holes (a drain, a mount) still need placing |
| `make.coil` | `make.wound` | A spring's closed, ground ends; a winding's layers |
| `vehicle.model` | `vehicle` | Published figures and sources per model |
| `view.gauge`, `view.chart`, `view.table` | `view.show` | Different displays, not options of one |
| `sweep.range` | `study` | `study` is not built yet (step 13) |
| `ai.ask` | — | Runs again if the relay returns; reported as unable to run here |

## 14. Steps

| Step | Scope | Nodes | Output |
| --- | --- | --- | --- |
| 0 | Library merges (section 13) | — | 11 blocks merged into 8, boards rewired, gate green |
| 1 | Needs and fields on the Corolla bay | `need`, `field`, `field.combine`, `field.show` | Field images |
| 2 | Solver places the battery | `place.solve`, `size.select`, `explain` | Position, reason, trade-offs |
| 3 | Autopilot on the Corolla | `auto.loop`, `repair.library` | Findings cleared without hand edits |
| 4 | Routing and sizing | `route`, `size.line` | Cables, hoses, harness |
| 5 | Full bay re-solve | `space.claim`, `choose.options`, `tradeoff`, `kg.learn`, `layout.seed`, `score` | Findings vs 262 |
| 6 | Generated parts | `make.*` | Brackets, shields, mounts, supports |
| 7 | Checks | `check.invariants`, `margin`, `check.tolerance`, `check.failure`, `check.assembly` | Margins, stacks, FMEA, order, minutes |
| 8 | Scale features and queries | Engine features, `query`, `similar` | Times on the city and Cascadia |
| 9 | Hierarchy and budgets; hand-placed builds converted | `system.*`, `interface.*`, `budget`, `infer.needs` | Hand coordinates left |
| 10 | Variety and change | `family.extract`, `standardize`, `version`, `change.impact`, `config.variants`, `lock` | Unique count, change impact |
| 11 | Describe | `intent`, `intent.clarify`, `import`, `recognise`, `kg.store`, `req.trace` | A design from words; a scan recognised |
| 12 | People and other domains | `check.human`, `comply.code`, `size.section` | A house, a board, a plant |
| 13 | Simulate and deliver | `sim.system`, `model.reduce`, `study`, `process.select`, `cost.estimate`, `supply.match`, `line.plan`, `lifetime`, `risk` | Costs, risks, lifetime |
| 14 | Out to reality | `export`, `twin`, `compare` | Exports; as-built comparison |
| 15 | Proof at scale | `distribute`, `node.synthesize`, `gauntlet` | 1,000,000 / 100,000 benchmark |

## 15. Measures

| Measure | Target |
| --- | --- |
| Hand coordinates | 0 |
| Findings cleared by autopilot | 100 %, rest named |
| Sourced figures | 100 % (rest labelled) |
| Requirements traced to a check | 100 % |
| Invariant violations | 0 |
| Overlapping nodes (unique gate) | 0 |
| Questions asked per design | Fewest that settle it |
| Words to buildable design | Minutes (estimate, to be measured) |
| Re-solve after one change, 1,000,000 parts | Seconds (estimate, to be measured) |
| Solve time, one module | Live while dragging |
| Gaps in the repair library | Listed, falling |
| Blind check | Indistinguishable from a real layout |

## 16. Limits

| Limit | Mitigation |
| --- | --- |
| Physics solves slow in browser | Reduced models, remote workers |
| Discrete search can wander | Scores from fields, precedent, Pareto fronts |
| Placement data mostly unpublished | Label as typical |
| Codes and standards often paywalled | Cite clause; label where unread |
| 1,000,000 parts exceed one browser's memory | Streaming, references, content cache, remote solve |
| Photo and scan recognition approximate | Confidence shown; person confirms low-confidence parts |
| Synthesized nodes can be wrong | Gauntlet and property tests before use |
| Merged nodes break saved boards | Boards rewired automatically; old ids kept as aliases |
| Web unreachable from this container | Research kept as sourced data; live where reachable |
| Exports for manufacture carry liability | Marked for an engineer's sign-off |
| Many rounds of work | One step per round |

## 17. Starting state

Step 2 result, the Corolla's battery:
- Where it was, it ran into the front inner wheelhouse (by about 7 mm), with 223 rule findings against it.
- The solver tried 498,902 places at each quarter turn (12.5 mm across, 25 mm up). 577 fit and 550 hold.
- Chosen: (1401, 582, 249) mm, at 48 °C (its limit 80 °C), 100 % of its top within reach, 728 mm from the starter, a bracket of up to 50 mm under it.
- The rules then find 0 against it. The solve takes about 30 s.
- The limits it still has:
  - one part at a time;
  - only quarter turns about the vertical;
  - the bracket under it is not made yet (step 6);
  - the cable to the starter is not routed (step 4);
  - a part inside a moved holder is refused.
- `size.select` for batteries uses a rule of thumb (CCA per cubic inch) as a floor and holds car groups only.

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
