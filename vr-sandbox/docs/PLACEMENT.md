# Placement, routing and sizing as nodes

Status: plan, not built. Base: commit `14e3283`.

## Contents

1. [Rules](#1-rules)
2. [Pipeline](#2-pipeline)
3. [Glossary](#3-glossary)
4. [Existing base](#4-existing-base)
5. [Node groups](#5-node-groups)
6. [Node index](#6-node-index)
7. [Steps](#7-steps)
8. [Measures](#8-measures)
9. [Limits](#9-limits)
10. [Starting state](#10-starting-state)

## 1. Rules

1. No hand-typed positions.
2. Parts state needs; the solver places and gives the reason.
3. Every size from a law, standard or source.
4. Unsolved → named task.
5. Each step shown before the next.

## 2. Pipeline

```
intent → functions → architecture → space claims → layout → routing → generated parts → detail → proof
```

Every stage is a node. Changes flow both ways.

## 3. Glossary

| Term | Meaning |
| --- | --- |
| Need | What a part requires: mount, connect, keep-out, face, access |
| Field | Map of one quantity over space: heat, motion, reach, air, wet, noise, load |
| Keep-out | Required distance, from material limits, motion or code |
| Envelope | Volume occupied; moving envelope includes everything swept |
| Space claim | Zone given to one subsystem before detailing |
| Budget | Size of a space claim, passed up |
| Bid | Subsystem's claim on contested space: need and cost of elsewhere |
| Choice | Discrete decision (gearbox side, exhaust side, radiator count) |
| Solver | Places from needs, fields, claims: search for choices, optimisation for positions |
| Reason | What holds a part where it is |
| Trade-off | Ranked option with cost when something will not fit |
| Route | Path of a hose, wire, pipe, duct or road |
| Harness | Wires routed as one bundle with branches, clips, connectors |
| Connective parts | Brackets, clips, shields, ducts, harnesses; generated |
| Topology optimisation | Shape grown from loads |
| Removal path | Clear way in and out of a part's place |
| FMEA | Failure modes and effects per part |
| Tolerance stack | Summed manufacturing variation at worst case |
| Precedent | Sourced placement from real products |
| Seed | Solved thing kept as one reusable node |
| Learned stand-in | Fast approximation of a slow physics solve |
| Hand coordinate | Position typed into code; target 0 |
| Finding | Rules-checker problem: interference, clearance, heat |

## 4. Existing base

| Have | Where | Becomes |
| --- | --- | --- |
| Iface, Port | `kits.ts`, `mate.ts` | `need.connect`, `need.mount` |
| Interference, clearance, heat gate | `make/rules.ts` | Placement checks, first fields |
| Oriented-box layout | `make/space.ts` | Solver geometry |
| `clearPath` | `make/space.ts` | Replaced by `route.path` |
| Swept room, servo | `make/critic.ts`, `motion.ts` | `field.motion` |
| Load cases, strength | `loads.ts` | `size.bolt`, `make.bracket`, `field.load` |
| Jolt physics | `sim.ts` | Mount rock, assembly paths |
| Explode | `view/kit3d.ts` | `check.assembly` |
| Seeds | `seeds.ts` | `layout.seed` |
| Sourced notes | `research.ts` | `precedent.mine` |
| Gauntlet | `gauntlet.ts` | `gauntlet.solver` |

## 5. Node groups

### U1 Needs
| Node | Does |
| --- | --- |
| `need.mount` | Mount surface, orientation, fastener pattern |
| `need.connect` | Port and max distance |
| `need.keepout` | Distance from heat, motion, water, noise, people |
| `need.face` | Required facing |
| `need.access` | Who reaches it, how often |
| `infer.needs` | Needs read from a hand-placed build |

### U2 Fields
| Node | Map |
| --- | --- |
| `field.heat` | Temperature (heat-flow solve + stand-in) |
| `field.motion` | Moving envelopes incl. mount rock |
| `field.reach` | Hand and tool reach |
| `field.air` | Airflow |
| `field.wet` | Spray and drip zones |
| `field.signal` | Electrical noise |
| `field.load` | Load paths |
| `field.show` | Draw a field in 3D |

### U3 Space claims and choices
| Node | Does |
| --- | --- |
| `space.claim` | Top-down zoning |
| `space.bid` | Resolve contested space |
| `choose.options` | Search discrete choices |

### U4 Solve
| Node | Does |
| --- | --- |
| `place.solve` | Place all; incremental |
| `place.why` | Reason per part |
| `place.whatif` | Uncommitted trial |
| `place.negotiate` | Ranked trade-offs |

### U5 Routing
| Node | Does |
| --- | --- |
| `route.path` | Cost path, surface-following, bend radius |
| `route.bundle` | Harness bundling |
| `route.clip` | Clips by weight and vibration |
| `route.slope` | Drains and falls to code |

### U6 Sizing
| Node | Sizes | From |
| --- | --- | --- |
| `size.wire` | Gauge | Current, length, voltage drop |
| `size.hose` | Bore | Flow, pressure |
| `size.pipe` | Bore | Flow, pressure |
| `size.duct` | Section | Airflow, velocity |
| `size.bolt` | Diameter, grade | Joint load |
| `size.battery` | Group | Cold cranking, climate |
| `size.drain` | Pipe, slope | Fixture units |

### U7 Generated parts
| Node | Makes |
| --- | --- |
| `make.bracket` | Bracket from load, then process |
| `make.shield` | Heat shield from heat field |
| `make.harness` | Trunk, branches, clips, connectors, conduit |
| `make.duct` | Duct between ends |

### U8 People
| Node | Does |
| --- | --- |
| `body.model` | Anthropometric sizes |
| `check.reach` | Reachability |
| `check.sight` | Sightlines |
| `check.circulation` | Walkways, swings, turning circles |

### U9 Lifecycle
| Node | Does |
| --- | --- |
| `check.assembly` | Build order, removal paths |
| `check.service` | Service minutes |
| `check.failure` | FMEA |
| `check.tolerance` | Worst-case stack |

### U10 Precedent
| Node | Does |
| --- | --- |
| `precedent.mine` | Sourced placements as priors |
| `layout.seed` | Solved layouts reused |

### U11 Domains
| Domain | Places | By |
| --- | --- | --- |
| Boards | Components, traces | Heat, signal, noise |
| Machines | Bays, robots, appliances | All fields |
| Buildings | Rooms, fixtures, services, structure | Codes, circulation, daylight, loads |
| Land | Buildings, roads, drainage | Slope, sun, wind, flood |
| Software | Services on machines | Latency, redundancy, cost |

### U12 Proof
| Node | Does |
| --- | --- |
| `gauntlet.solver` | Adversarial variants; unsolved named |
| `score.layout` | Hand coordinates, findings cleared, time, similarity |

### U13 Live
Drag in 3D or VR; fields shown; resisting constraint named; re-solve on release.

## 6. Node index

| Node | Group | Step |
| --- | --- | --- |
| `body.model` | U8 | 7 |
| `check.assembly` | U9 | 6 |
| `check.circulation` | U8 | 7 |
| `check.failure` | U9 | 6 |
| `check.reach` | U8 | 7 |
| `check.service` | U9 | 6 |
| `check.sight` | U8 | 7 |
| `check.tolerance` | U9 | 6 |
| `choose.options` | U3 | 4 |
| `field.air` | U2 | 4 |
| `field.heat` | U2 | 1 |
| `field.load` | U2 | 5 |
| `field.motion` | U2 | 1 |
| `field.reach` | U2 | 1 |
| `field.show` | U2 | 1 |
| `field.signal` | U2 | 3 |
| `field.wet` | U2 | 6 |
| `gauntlet.solver` | U12 | 9 |
| `infer.needs` | U1 | 8 |
| `layout.seed` | U10 | 4 |
| `make.bracket` | U7 | 5 |
| `make.duct` | U7 | 5 |
| `make.harness` | U7 | 3 |
| `make.shield` | U7 | 5 |
| `need.access` | U1 | 1 |
| `need.connect` | U1 | 1 |
| `need.face` | U1 | 1 |
| `need.keepout` | U1 | 1 |
| `need.mount` | U1 | 1 |
| `place.negotiate` | U4 | 2 |
| `place.solve` | U4 | 2 |
| `place.whatif` | U4 | 2 |
| `place.why` | U4 | 2 |
| `precedent.mine` | U10 | 4 |
| `route.bundle` | U5 | 3 |
| `route.clip` | U5 | 3 |
| `route.path` | U5 | 3 |
| `route.slope` | U5 | 7 |
| `score.layout` | U12 | 4 |
| `size.battery` | U6 | 2 |
| `size.bolt` | U6 | 5 |
| `size.drain` | U6 | 7 |
| `size.duct` | U6 | 5 |
| `size.hose` | U6 | 3 |
| `size.pipe` | U6 | 7 |
| `size.wire` | U6 | 3 |
| `space.bid` | U3 | 4 |
| `space.claim` | U3 | 4 |

48 nodes, 0 built.

## 7. Steps

| Step | Scope | Output |
| --- | --- | --- |
| 1 | Needs, heat/motion/reach fields on Corolla bay | Field images |
| 2 | Solver places battery | Position, reason, trade-offs |
| 3 | Routing and sizing: cables, hoses, harness | Routes, sizes |
| 4 | Space claims, choices; full bay re-solve | Findings vs 262 |
| 5 | Brackets, shields, ducts | Generated parts |
| 6 | Assembly, service, failure, tolerance | Order, minutes, effects |
| 7 | House, then circuit board | Solved room and board |
| 8 | Hand-placed builds converted, Cascadia first | Hand coordinates left |
| 9 | Adversarial variants | Scores |

## 8. Measures

| Measure | Target |
| --- | --- |
| Hand coordinates | 0 |
| Findings cleared without hand edit | 100 % |
| Sourced sizes | 100 % |
| Solve time | Live while dragging |
| Blind check | Indistinguishable from real layout |

## 9. Limits

| Limit | Mitigation |
| --- | --- |
| Physics solves slow in browser | Learned stand-ins |
| Discrete search can wander | Scores from fields and precedent |
| Placement data mostly unpublished | Label as typical |
| Many rounds of work | One step per round |

## 10. Starting state

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
