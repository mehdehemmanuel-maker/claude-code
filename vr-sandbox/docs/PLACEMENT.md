# Placement, routing and sizing as nodes: the plan

Status: **plan only, nothing in it is built yet** (2026-10-27). It starts from commit `14e3283`.

---

## Contents

1. [Why this exists](#1-why-this-exists)
2. [The rule](#2-the-rule)
3. [The idea: an engineering compiler](#3-the-idea-an-engineering-compiler)
4. [Glossary](#4-glossary)
5. [What exists to build on](#5-what-exists-to-build-on)
6. [The node upgrades, by group](#6-the-node-upgrades-by-group)
   - [U1 Needs](#u1-needs)
   - [U2 Fields](#u2-fields)
   - [U3 Space claims and choices](#u3-space-claims-and-choices)
   - [U4 Solve, explain, negotiate](#u4-solve-explain-negotiate)
   - [U5 Routing](#u5-routing)
   - [U6 Sizing](#u6-sizing)
   - [U7 Generated parts](#u7-generated-parts)
   - [U8 People](#u8-people)
   - [U9 Built, serviced, failing](#u9-built-serviced-failing)
   - [U10 Learning and precedent](#u10-learning-and-precedent)
   - [U11 Every field, every scale](#u11-every-field-every-scale)
   - [U12 Proof](#u12-proof)
   - [U13 Live in the space](#u13-live-in-the-space)
7. [Node index (A–Z)](#7-node-index-az)
8. [Order of work](#8-order-of-work)
9. [How success is measured](#9-how-success-is-measured)
10. [Honest limits](#10-honest-limits)
11. [Where it starts from](#11-where-it-starts-from)

---

## 1. Why this exists

The user, 2026-10-27:
> "the point is to eliminate the need for manual stuff while maintaining the same results as a high level engineer from
> houses too environments too mechanical too software nodes need to be max capable eliminate the need for guessing and
> manual"
>
> "think outside the box … think about the pinnacle of it"

**What went wrong before this:**
- The checking was automated by the rules checker and the gauntlet.
- Every fix was a position typed by hand into `machines.ts`, `engines.ts` or `fittings.ts`.
- One fix broke the next. Turning the Corolla's engine moved its exhaust, the exhaust heated the battery, and lowering the hood latch then hit the radiator.
- Hours went into hand-fixing single parts instead of making nodes that fix them. These are templates in disguise, which `CLAUDE.md` forbids.

## 2. The rule

1. **No part gets a hand-typed position.**
2. A part says what it **needs**; the **solver** works out where it goes and says **why**.
3. Every size comes from a law, a standard or a source, never a guess.
4. What the solver cannot solve becomes a **named task**, never a hand patch.
5. Each step of this plan is shown to the user before the next one starts.

## 3. The idea: an engineering compiler

You describe what a thing must do. The compiler works out what parts it needs, where they go, how they connect, what holds
them, how it is built and serviced, and proves it. The person makes only value choices: cheaper or lighter, quieter or
easier to service.

```
intent → functions → architecture → space claims → layout → routing → generated parts → detail → proof
```

- Every stage is a node.
- A change at any stage flows both ways.
- Edit the intent and the layout follows; drag a part in 3D and the solver updates the rest, or says what stops it.

## 4. Glossary

| Term | Meaning |
| --- | --- |
| **Need** | What a part requires of where it is: what it mounts on, connects to, stays away from, faces, and who must reach it. Replaces a typed position. |
| **Field** | A map over the space of one quantity: temperature, swept motion, reach, airflow, wetness, electrical noise, load. Parts settle where the fields suit them. |
| **Keep-out** | A distance a part must keep from something, worked out from its material's limits (heat), from motion, or from a code. |
| **Envelope** | The volume a thing occupies. The **moving envelope** includes everything it sweeps: a wheel through steer and bump, an engine rocking on its mounts. |
| **Space claim** | A zone of the volume given to one subsystem (engine bay, cooling, cabin; kitchen, wet wall) before anything inside it is detailed. |
| **Budget** | The size of a space claim, passed back up so the parent can rebalance zones. |
| **Bid** | A subsystem's case for contested space: how much it needs it and what being elsewhere costs it. |
| **Choice** | A discrete either-or decision: gearbox left or right, exhaust front or back, one radiator or two. Searched, not guessed. |
| **Solver** | What places everything from needs, fields and claims: choices by search, positions by continuous optimisation. |
| **Reason** | What holds a part where the solver put it, kept with the part and shown on request. |
| **Trade-off** | A ranked option offered when something cannot fit, with its cost in mass, money, length or performance. |
| **Route** | The path of something that runs between two places: a hose, a wire, a pipe, a duct, a road. |
| **Harness** | Wires routed together as one bundle, with branches, clips and connectors. |
| **Connective parts** | The parts that join and protect others: brackets, clips, heat shields, ducts, harnesses. Generated to fit, not drawn. |
| **Topology optimisation** | Growing a part's shape from the loads it carries, keeping only the material that does work. |
| **Removal path** | A clear way for a part to come in and out of its place. Tested by running the explode as a removal. |
| **FMEA** | Failure modes and effects analysis: for each part, what happens when it fails. |
| **Tolerance stack** | How small manufacturing variations add up across parts that meet; checked at the worst combination. |
| **Precedent** | Where real products put things, from researched references with sources; the solver's starting preference. |
| **Seed** | A solved thing kept as one reusable node (`seeds.ts`). Here: a solved layout, such as "a transverse engine bay". |
| **Learned stand-in** | A fast approximation of a slow physics solve, trained on full solves, so fields update live. |
| **Hand coordinate** | A position typed into code. The number this plan drives to zero. |
| **Finding** | A problem the rules checker reports: two parts running into each other, too little clearance, too much heat. |

## 5. What exists to build on

| Have | Where | Becomes |
| --- | --- | --- |
| Interfaces and ports (shaft/bore, studs, NEMA faces, ISO flanges) | `kits.ts` `Iface`, `Port`; `mate.ts` | The `need.connect` and `need.mount` needs |
| Interference, clearance, heat gate | `make/rules.ts` | The checks every placement passes; the first fields |
| Oriented-box layout, contacts | `make/space.ts` | The solver's geometry core |
| A path clear of obstacles | `make/space.ts` `clearPath` | Replaced by `route.path` |
| Swept room for motion, servo moves | `make/critic.ts`, `motion.ts` | `field.motion` |
| Load cases, material strength | `loads.ts` | `size.bolt`, `make.bracket`, `field.load` |
| Rigid-body physics (Jolt) | `sim.ts` | Engine rock on its mounts; assembly paths |
| Explode | `view/kit3d.ts` `explode` | `check.assembly` removal paths |
| Seeds | `seeds.ts` | `layout.seed` |
| Research as sourced notes | `research.ts` | `precedent.mine` |
| The gauntlet | `gauntlet.ts` | `gauntlet.solver` |

## 6. The node upgrades, by group

Each node lives in `blocks.ts`, has its own tests, and goes through the gauntlet. Where a figure is used, it carries its
source or is labelled typical.

### U1 Needs
*Parts say what they need, not where they go.*

| Node | Takes | Gives |
| --- | --- | --- |
| `need.mount` | A part; a face, rail, bracket, floor or wall; which way up; a fastener pattern | The mount need on the part |
| `need.connect` | A part; a port (shaft, hose, wire, pipe, duct, data); how far it may be | The connect need |
| `need.keepout` | A part; what to keep from (heat, motion, water, noise, people) | The keep-out need, its distance from the material's limits |
| `need.face` | A part; what it must face (air, the room, a target, a view) | The facing need |
| `need.access` | A part; who reaches it (hand, tool, person) and how often | The access need |
| `infer.needs` | A build placed by hand | The needs that hold each part (touching this, clear of that, centred on this), so it can be re-solved |

### U2 Fields
*Maps of the space that parts settle into.*

| Node | Map of |
| --- | --- |
| `field.heat` | Temperature from what is hot: a heat-flow solve, with a learned stand-in for live use |
| `field.motion` | Every moving envelope: wheels, doors and hoods opening, belts and fans, an engine rocking about 10 mm on its mounts |
| `field.reach` | Where a hand or a tool can get to, from where a person stands or sits |
| `field.air` | Where cooling air goes |
| `field.wet` | What a burst hose or a leaking pipe would spray or drip on |
| `field.signal` | Electrical noise near motors, coils and ignition |
| `field.load` | The path forces take into a frame, floor or wall |
| `field.show` | Any field drawn over the 3D view (hot zones glow, swept volumes ghosted) |

### U3 Space claims and choices
| Node | Does |
| --- | --- |
| `space.claim` | Splits the volume into zones top-down before detailing; each subsystem places inside its own |
| `space.bid` | Settles contested space by each subsystem's bid |
| `choose.options` | Searches discrete choices like a chess engine: tries branches, scores roughly, goes deep only on the promising ones |

### U4 Solve, explain, negotiate
| Node | Does |
| --- | --- |
| `place.solve` | Places everything from needs, fields and claims; incremental (one part moved re-solves only around it) |
| `place.why` | The reason each part is where it is |
| `place.whatif` | A change tried without committing (a group 24 battery, a room 30 cm narrower) |
| `place.negotiate` | Ranked trade-offs with costs when something cannot fit; the person picks, or sets priorities once |

### U5 Routing
| Node | Does |
| --- | --- |
| `route.path` | A path by cost (length, heat, motion, access, crossings), following surfaces, keeping its bend radius |
| `route.bundle` | Wires travelling together as a harness, branching to each connector |
| `route.clip` | Clips and supports spaced by the run's weight and vibration, each a real part |
| `route.slope` | Runs that must fall: drains to code, condensate, fuel return |

### U6 Sizing
*Nothing guessed.*

| Node | Sizes | From |
| --- | --- | --- |
| `size.wire` | Gauge | Current, run length, allowed voltage drop |
| `size.hose` | Bore | Flow and pressure |
| `size.pipe` | Bore | Flow and pressure |
| `size.duct` | Section | Airflow and allowed velocity |
| `size.bolt` | Diameter, grade | The joint's load (`loads.ts`) |
| `size.battery` | Group | Cold-cranking need and climate |
| `size.drain` | Pipe and slope | Fixture units (plumbing code) |

### U7 Generated parts
*Most of a real product's part count is the connective tissue; none of it is hand-drawn.*

| Node | Makes |
| --- | --- |
| `make.bracket` | A bracket grown from its load between mount and part, then made by a process (pressed, cast, machined) |
| `make.shield` | A heat shield shaped to the heat field |
| `make.harness` | A harness: trunk, branches, clips, connectors, conduit, labels |
| `make.duct` | Ducts and boxes shaped between their ends |

### U8 People
| Node | Does |
| --- | --- |
| `body.model` | Body sizes from small to large people (published anthropometric tables) |
| `check.reach` | Whether a person can reach it (a dipstick, a shelf, a switch) |
| `check.sight` | Sightlines: over a hood, to a mirror, across a room |
| `check.circulation` | Walkways, door swings, wheelchair turning circles, to code |

### U9 Built, serviced, failing
| Node | Does |
| --- | --- |
| `check.assembly` | An order to build it in, and a removal path for every part |
| `check.service` | Minutes to replace the battery, a belt, a water heater; scored and improved |
| `check.failure` | FMEA for each part: fire spread, leaks, crush zones, flooding |
| `check.tolerance` | Whether it still fits at the worst tolerance stack (Monte Carlo) |

### U10 Learning and precedent
| Node | Does |
| --- | --- |
| `precedent.mine` | Where real products put things, from sourced references; the solver's starting preferences |
| `layout.seed` | A solved layout kept as a seed; the next solve starts from the nearest one |

### U11 Every field, every scale
*The same machinery, with different needs and fields.*

| Field | Places | By |
| --- | --- | --- |
| Chips and boards | Components, traces | Heat, signal length, noise |
| Machines | Engine bays, robots, appliances | Everything above |
| Buildings | Rooms, fixtures, plumbing, ducts, wiring, structure | Codes, circulation, daylight, loads |
| Land | Buildings, roads, drainage | Slope, sun, wind, flood |
| Software | Services on machines | Latency, redundancy, cost |

### U12 Proof
| Node | Does |
| --- | --- |
| `gauntlet.solver` | Generates thousands of designs (odd engines, tiny rooms, conflicting needs) and tries to break the solver; whatever it cannot solve is named |
| `score.layout` | Hand coordinates left, findings cleared with no hand edit, solve time, closeness to the real product |

### U13 Live in the space
In the 3D view or a headset, grab a part and feel the fields: the hot zone glows, the part resists moving into it, and
the constraint that resists is said in words. Let go and the solver settles everything else around the choice.

## 7. Node index (A–Z)

| Node | Group | Step |
| --- | --- | --- |
| `body.model` | U8 People | 7 |
| `check.assembly` | U9 Built, serviced, failing | 6 |
| `check.circulation` | U8 People | 7 |
| `check.failure` | U9 Built, serviced, failing | 6 |
| `check.reach` | U8 People | 7 |
| `check.service` | U9 Built, serviced, failing | 6 |
| `check.sight` | U8 People | 7 |
| `check.tolerance` | U9 Built, serviced, failing | 6 |
| `choose.options` | U3 Space claims and choices | 4 |
| `field.air` | U2 Fields | 4 |
| `field.heat` | U2 Fields | 1 |
| `field.load` | U2 Fields | 5 |
| `field.motion` | U2 Fields | 1 |
| `field.reach` | U2 Fields | 1 |
| `field.show` | U2 Fields | 1 |
| `field.signal` | U2 Fields | 3 |
| `field.wet` | U2 Fields | 6 |
| `gauntlet.solver` | U12 Proof | 9 |
| `infer.needs` | U1 Needs | 8 |
| `layout.seed` | U10 Learning and precedent | 4 |
| `make.bracket` | U7 Generated parts | 5 |
| `make.duct` | U7 Generated parts | 5 |
| `make.harness` | U7 Generated parts | 3 |
| `make.shield` | U7 Generated parts | 5 |
| `need.access` | U1 Needs | 1 |
| `need.connect` | U1 Needs | 1 |
| `need.face` | U1 Needs | 1 |
| `need.keepout` | U1 Needs | 1 |
| `need.mount` | U1 Needs | 1 |
| `place.negotiate` | U4 Solve, explain, negotiate | 2 |
| `place.solve` | U4 Solve, explain, negotiate | 2 |
| `place.whatif` | U4 Solve, explain, negotiate | 2 |
| `place.why` | U4 Solve, explain, negotiate | 2 |
| `precedent.mine` | U10 Learning and precedent | 4 |
| `route.bundle` | U5 Routing | 3 |
| `route.clip` | U5 Routing | 3 |
| `route.path` | U5 Routing | 3 |
| `route.slope` | U5 Routing | 7 |
| `score.layout` | U12 Proof | 4 |
| `size.battery` | U6 Sizing | 2 |
| `size.bolt` | U6 Sizing | 5 |
| `size.drain` | U6 Sizing | 7 |
| `size.duct` | U6 Sizing | 5 |
| `size.hose` | U6 Sizing | 3 |
| `size.pipe` | U6 Sizing | 7 |
| `size.wire` | U6 Sizing | 3 |
| `space.bid` | U3 Space claims and choices | 4 |
| `space.claim` | U3 Space claims and choices | 4 |

48 nodes. None is built yet.

## 8. Order of work

Each step is shown to the user before the next starts.

| Step | What | Nodes | Shown as |
| --- | --- | --- | --- |
| 1 | Needs and the first fields on the Corolla's engine bay; nothing moved | `need.*`, `field.heat`, `field.motion`, `field.reach`, `field.show` | Pictures of the fields over the bay |
| 2 | The solver places one part, the battery, with its reason and trade-offs | `place.*`, `size.battery` | The battery placed, its reason, its options |
| 3 | Routing with sizing: battery cables, radiator hoses, the harness | `route.path`, `route.bundle`, `route.clip`, `size.wire`, `size.hose`, `make.harness`, `field.signal` | The routes and their sizes |
| 4 | Space claims and choices; the whole bay re-solved with no hand coordinates | `space.*`, `choose.options`, `precedent.mine`, `layout.seed`, `field.air`, `score.layout` | Findings before (262) and after |
| 5 | Generated brackets, shields and ducts | `make.bracket`, `make.shield`, `make.duct`, `size.bolt`, `size.duct`, `field.load` | The parts grown |
| 6 | Assembly, service, failure, tolerance | `check.assembly`, `check.service`, `check.failure`, `check.tolerance`, `field.wet` | The build order, service minutes, failure effects |
| 7 | The same solver on a house, then a circuit board | `body.model`, `check.reach`, `check.sight`, `check.circulation`, `route.slope`, `size.pipe`, `size.drain` | A room and a board solved |
| 8 | The rest of the hand-placed builds made solver-driven, the Cascadia first | `infer.needs` | Hand coordinates left, falling |
| 9 | The solver put through thousands of variants | `gauntlet.solver` | Its scores |

## 9. How success is measured

| Measure | Target |
| --- | --- |
| Hand coordinates left in the builds | 0 |
| Rule findings cleared by the solver with no hand edit | Share per build, rising to all |
| Sizes traced to a law, a standard or a source | All |
| Solve time | Fast enough to stay live while dragging |
| Blind check | A fresh agent shown the result cannot tell it from a real product's layout |

## 10. Honest limits

| Limit | Why | What it takes |
| --- | --- | --- |
| Speed | Real heat and airflow solves are slow in a browser | Learned stand-ins, which take time to build |
| The big choices | Searching options needs a good scoring function, or it wanders | Scores from the fields and from precedent |
| Data | Much of where engineers put things is not public | Some preferences stay labelled typical |
| Scope | This is many rounds of work | One step per round, shown before the next |

## 11. Where it starts from

Commit `14e3283` (2026-10-27):

- **The gate fails 9 tests:**
  - An inventory entry (`bearing-6206zz`) is not stored.
  - A part (`crush-washer`) has no size.
  - Some tests time out, most likely from the first hose router laying out the whole vehicle.
- **Rule findings, all from hand placement:**

| Build | Findings | Main cause |
| --- | --- | --- |
| Corolla | 262 | The EGR pipe's heat beside the battery; the hood latch in the radiator |
| Cascadia | 279 | Engine through the hood and cross members; cab, grille and axle internals |
| Rancher | 1 | A cross tube into the oil pickup |
| CRF450R | 3 | Swingarm into the frame spars |
| Forklift, mower, kart | 0 | — |

These are the first things the solver must clear without a hand edit.
