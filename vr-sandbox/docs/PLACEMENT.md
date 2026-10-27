# Placement, routing and the engineering compiler: the node upgrades

## Why this exists

The user, 2026-10-27: "the point is to eliminate the need for manual stuff while maintaining the same results as a high
level engineer from houses too environments too mechanical too software nodes need to be max capable eliminate the need
for guessing and manual", and "think outside the box … think about the pinnacle of it".

What went wrong before this doc: the checking was automated (the rules checker, the gauntlet), but every fix was a
coordinate typed by hand into `machines.ts`, `engines.ts` and `fittings.ts`. One fix broke the next. Turning the Corolla's
engine moved its exhaust, which heated the battery, and lowering the hood latch then hit the radiator. Hours went into
hand-fixing parts instead of making nodes that fix them. Templates in disguise, which `CLAUDE.md` forbids.

**The rule from here on:** no part gets a hand-typed position. A part says what it needs. The solver works out where it
goes and says why. What the solver can't solve becomes a named task, never a hand patch.

## The idea: an engineering compiler

You describe what a thing must do. The compiler works out:
- what parts it needs;
- where they go and how they connect;
- what holds them;
- how it is built and serviced;
- and it proves all of this.

The person only makes value choices: cheaper or lighter, quieter or easier to service.

```
intent → functions → architecture → space claims → layout → routing → generated parts → detail → proof
```

Every stage is a node. A change at any stage flows both ways. Edit the intent and the layout follows. Drag a part in 3D
and the solver updates the architecture, or says what stops it.

## What exists to build on

| Have | Where | Becomes |
| --- | --- | --- |
| Interfaces and ports (shaft/bore, studs, NEMA faces, ISO flanges) | `kits.ts` `Iface`, `Port`; `mate.ts` | The "connects to" and "mounts on" needs |
| Interference, clearance, heat gate | `make/rules.ts` | The checks every placement must pass, and the first fields |
| Oriented-box layout, contacts | `make/space.ts` | The solver's geometry core |
| A path clear of obstacles (first router) | `make/space.ts` `clearPath` | Replaced by the real router (U4) |
| Swept room for motion, servo moves | `make/critic.ts`, `motion.ts` | The motion field |
| Load cases, material strength | `loads.ts` | Sizing brackets and bolts, the load field |
| Rigid-body physics (Jolt) | `sim.ts` | Engine rock on its mounts, assembly paths |
| Explode (how a build comes apart) | `view/kit3d.ts` `explode` | The removal-path test |
| Seeds (solved things kept as one node) | `seeds.ts` | Solved layouts kept and reused |
| Research as sourced notes | `research.ts` | Where real engineers put things, with sources |
| The gauntlet | `gauntlet.ts` | Proving the solver on thousands of variants |

## The node upgrades

Each group is a set of nodes in `blocks.ts`. Each node has its own tests and goes through the gauntlet like any other.
Where a figure is used, it carries its source or is labelled typical.

### U1. Needs: parts say what they need, not where they go
| Node | Says |
| --- | --- |
| `need.mount` | Mounts on a face, a rail, a bracket, a floor or a wall; which way up; its fastener pattern |
| `need.connect` | Connects to a port: shaft, hose, wire, pipe, duct, data; how far it may be from it |
| `need.keepout` | Stays a distance from heat, motion, water, noise or people; the distance from its material's limits, not guessed |
| `need.face` | Faces something: a radiator the air, a sink the room, a sensor its target, a window the view |
| `need.access` | Needs a hand, a tool or a person to reach it, how often (daily, yearly, never) |
| `infer.needs` | Reads a build that was placed by hand and writes out which needs are holding each part (touching this, clear of that, centred on this). Existing builds become solver-driven without being redone by hand |

### U2. Fields: maps of the space that parts settle into
| Node | Map of |
| --- | --- |
| `field.heat` | Temperature through the space from what is hot: a heat-flow solve, with a fast learned stand-in for live use |
| `field.motion` | Every swept volume: wheels through steer and bump, doors and hoods opening, belts and fans, **and an engine rocking about 10 mm on its mounts**. Clearances use the moving envelope, not the still one |
| `field.reach` | Where a hand or a tool can get to, from where a person stands or sits |
| `field.air` | Where cooling air actually goes |
| `field.wet` | What a burst hose or a leaking pipe would spray or drip on |
| `field.signal` | Electrical noise around motors, coils and ignition, kept off sensor wires |
| `field.load` | The path forces take into a frame, a floor or a wall |
| `field.show` | Draws any field over the 3D view (hot zones glow, swept volumes ghosted) |

### U3. Space claims and the big choices
| Node | Does |
| --- | --- |
| `space.claim` | Splits the volume into zones top-down (engine bay, cooling, electrical, cabin; or kitchen, wet wall, walkway) before anything is detailed. Each subsystem places inside its zone. Zone sizes are passed back up as a budget, so one system cannot crowd out the rest |
| `space.bid` | Subsystems bid for contested space by how much they need it and what it costs them to be elsewhere |
| `choose.options` | Explores discrete choices like a chess engine: gearbox left or right; exhaust front or back; engine built left- or right-handed; one radiator or two; island or galley. It tries the branches, scores each one roughly, and goes deep only on the promising ones |

### U4. Solve, explain, negotiate
| Node | Does |
| --- | --- |
| `place.solve` | Places everything from its needs over the fields and claims: discrete choices by search, then positions by continuous optimisation, incremental (one part moved re-solves only around it) |
| `place.why` | For each part, what holds it where it is: "the strut spring bounds it on the left and the EGR pipe's heat on the right" |
| `place.whatif` | A change tried without committing: a group 24 battery, a room 30 cm narrower |
| `place.negotiate` | When something cannot fit, ranked trade-offs with their costs: "a heat shield (+0.4 kg, +$6, typical), or 120 mm more pipe moving the EGR cooler, or a smaller battery losing 15 % cold cranking". The person picks, or sets priorities once |

### U5. Routing: hoses, wires, pipes, ducts, roads
| Node | Does |
| --- | --- |
| `route.path` | A path by cost (length, heat, motion, access, crossings), following surfaces, holding its bend radius |
| `route.bundle` | Wires travel together in a harness, branching to each connector |
| `route.clip` | Clips and supports every so often (by the run's weight and vibration), each a real part |
| `route.slope` | For what must fall: drains to the plumbing code's slope, condensate, fuel return |

### U6. Sizing from physics: nothing guessed
| Node | Sizes |
| --- | --- |
| `size.wire` | Gauge from current, run length and allowed voltage drop |
| `size.hose` / `size.pipe` | Bore from flow and pressure |
| `size.duct` | Section from airflow and allowed velocity |
| `size.bolt` | From the joint's load (builds on `loads.ts`) |
| `size.battery` | Group from cold-cranking need and the climate |
| `size.drain` | Pipe and slope from fixture units (plumbing code) |

### U7. Generated connecting parts
Most of a real product's part count is the connective tissue. None of it should be hand-drawn.

| Node | Makes |
| --- | --- |
| `make.bracket` | A bracket grown from the load it carries between its mount and its part (topology optimisation), then made by a process (pressed, cast, machined) |
| `make.shield` | A heat shield shaped to the heat field, between what is hot and what cannot take it |
| `make.harness` | The whole harness: trunk, branches, clips, connectors, conduit, labels |
| `make.duct` | Air ducts and boxes shaped between their ends |

### U8. People
| Node | Checks |
| --- | --- |
| `body.model` | Body sizes from small to large people (published anthropometric tables) |
| `check.reach` | Can a person reach it (the dipstick, a shelf, a light switch) |
| `check.sight` | Sightlines: over a hood, to a mirror, across a room |
| `check.circulation` | Walkways, door swings, wheelchair turning circles (to code) |

### U9. Built, serviced, failing
| Node | Checks |
| --- | --- |
| `check.assembly` | An order the build can be put together in, and a clear path in and out for each part (the explode run as a removal test) |
| `check.service` | Minutes to replace the battery, a belt or a water heater, scored, and the layout improved for it |
| `check.failure` | What happens when each part fails (FMEA): fire spread, leaks, crush zones, a flooded basement |
| `check.tolerance` | Whether it still fits at the worst combination of manufacturing variation (tolerance stack, Monte Carlo) |

### U10. Learning and precedent
| Node | Does |
| --- | --- |
| `precedent.mine` | Where real products put things, from researched references with sources (battery over the gearbox in front-drive cars, water heater by the plumbing wall). These become the solver's starting preferences |
| `layout.seed` | A solved layout kept as a seed ("a transverse engine bay", "a galley kitchen"); the next solve starts from the nearest one |

### U11. One solver at every scale and in every field
The same machinery with different needs and fields:

| Field | Places | By |
| --- | --- | --- |
| Chips and boards | Components, traces | Heat, signal length, noise |
| Machines | Engine bays, robots, appliances | Everything above |
| Buildings | Rooms, fixtures, plumbing, ducts, wiring, structure | Codes, circulation, daylight, loads |
| Land | Buildings, roads, drainage | Slope, sun, wind, flood |
| Software | Services on machines | Latency, redundancy, cost |

### U12. Proof
| Node | Does |
| --- | --- |
| `gauntlet.solver` | Generates thousands of designs (odd engines, tiny rooms, conflicting needs) and tries to break the solver. Anything it cannot solve is named, never passed in silence |
| `score.layout` | Hand-typed coordinates left (target 0); findings cleared with no hand edits; time to solve; closeness to the real product's layout where one is researched |

### U13. Live in the space
In the 3D view or a headset, grab a part and feel the fields: the hot zone glows and the part resists moving into it, with
the constraint that resists said in words. Let go and the solver settles everything else around the choice.

## Order of work, each step shown to the user before the next

| Step | What | Shown as |
| --- | --- | --- |
| 1 | Needs (U1) and the heat, motion (with engine rock) and reach fields (U2) on the Corolla's engine bay. Nothing moved yet | Pictures of the fields over the bay |
| 2 | `place.solve` places one part, the battery, with `place.why` and `place.negotiate` | The battery placed, its reason, its trade-offs |
| 3 | Routing with sizing: battery cables sized by current, radiator hoses by flow, clipped and bundled (U5, U6) | The routes and their sizes |
| 4 | Space claims and the big choices (U3); the whole bay re-solved with no hand coordinates | Findings before (262) and after |
| 5 | Generated brackets and heat shields (U7) | The parts grown |
| 6 | Assembly order and service time (U9) | The order, the minutes |
| 7 | The same solver on a house's rooms and plumbing, then a board (U11) | A room and a board solved |
| 8 | `infer.needs` turns the rest of the hand-placed builds (the Cascadia first) into solved ones | Hand coordinates left, falling |
| 9 | The adversarial gauntlet (U12) on thousands of variants | Its scores |

## How success is measured

- Hand-typed positions left in the builds: falling to 0.
- Rule findings cleared by the solver with no hand edit: as a share, per build.
- Every size traced to a law, a standard or a source.
- Solve time, so it stays live when dragging.
- The blind check: a fresh agent shown the result cannot tell it from a real product's layout.

## Honest limits

- **Speed:** real heat and airflow solves are slow in a browser. Live use needs learned stand-ins, and building them takes time.
- **The big choices:** searching discrete options needs a good scoring function, or it wanders.
- **Data:** much of where real engineers put things is not public. Some starting preferences will stay labelled typical.
- **Scope:** this is many rounds of work. Each step above is its own round, shown before the next.
- **Where it starts from** (the 2026-10-27 checkpoint, commit `14e3283`): the gate fails 9 tests (an inventory entry, a
  size, and timeouts from the first hose router). Corolla 262 findings, Cascadia 279, Rancher 1, CRF450R 3, all from
  hand placement. These are the first things the solver must clear.
