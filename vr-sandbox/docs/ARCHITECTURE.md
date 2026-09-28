# Architecture, invariants and audit

This is how the sandbox is kept from breaking in one place while it is fixed in another. Before any change:

1. Check the change against the invariants below.
2. Trace who consumes what it touches (the dependency map).
3. Write down the ripple effects.
4. Prove the change with the whole suite, plus a test that fails without it.

## Invariants

These hold for every build, every edit and every tick. Each one is backed by tests (named in brackets); a
known violation is tracked in the audit and gets a test before it is fixed.

| # | Invariant | Tests |
|---|---|---|
| I1 | The build document is the only source of truth. Physics, rendering and audio mirror it; only document commands change it (physics failures arrive as events and become commands). | store, e2e |
| I2 | Every edit is undoable, and every build saves and reloads byte for byte. | store, codec property tests |
| I3a | A free system conserves linear and angular momentum. | tumbling rod vs Euler's equations |
| I3b | An undriven, frictionless system keeps its energy. | **violated**, see audit A5 |
| I3c | No position correction adds momentum. | centripetal glue test |
| I3d | Every joint and bond load equals the Newton–Euler balance of the branch it holds, whichever side of the joint is "A". | exact cantilever statics, centripetal glue test (both orientations) |
| I3e | Capacities come from published specs and formulas. | engineering golden values |
| I4 | Only load over capacity breaks things; nothing is scripted. | fracture and joint tests, templates settle |
| I5 | Same build and inputs give the same result. | templates deterministic |
| I6 | A physics event applies only to the document state it was computed against. | **violated**, see audit A1 |
| I7 | Every queue, history and pool has a fixed bound, and physics slows rather than spirals when it falls behind. | review, A2 |
| I8 | A failing subsystem is contained, reported once, and reset from the document, while the rest keeps running. | **violated**, see audit A3 |
| I9 | Every template does what its card promises, with no failure the card does not promise. | at rest: templates settle; **in use: violated**, see audit A6 |

## Dependency map

```
            edits (tools, UI, tablet, undo)          physics events (break, slip, fracture, yield)
                         │                                         ▲          │
                         ▼                                         │          ▼
   DocStore ──► App.reconcile ──► PhysicsClient ──► worker: Runner ──► PhysicsWorld.step
      ▲             │                (one step in flight,                     │
      │             ▼                 ops coalesced)                          ▼
      │         SceneView.sync                                  StepResult: poses, loads, bonds, events
      │                                                                       │
      └──────────── App.handleEvents ◄── LiveState ◄──────────────────────────┘
                    (commands)            │  └──► SceneView.update (poses, stress colours)
                                          └─────► inspector, tablet, audio (creaks, motors)
```

Inside `PhysicsWorld.step`, in order:

1. `applyFields` (drag, buoyancy, magnets)
2. `prepareClusters`: rigid assemblies of bonded segments and rigid joints
3. Jolt step
4. `solveAssemblies`: sequential impulses for anchors, plastic hinges and contacts, then `placeCluster`
5. `bridgeLoads`: exact joint and bond loads
6. `evaluateConnections` and `evaluateBonds`: failures
7. events

Risk is shared consumers × how much the code changes state. The highest-risk code is the assembly solve
(`solveAssemblies`, `placeCluster`, `bridgeLoads`), because every load reading, every failure decision and every
segmented part depends on it. Next come `App.reconcile` (every edit) and `PhysicsClient` (everything). None of
these changes without the conservation tests and the full suite.

## Audit (2026-09-28)

| # | Area | Status | What works | What fails | Root cause |
|---|---|---|---|---|---|
| A1 | Document ↔ physics sync | **Fail** (narrow) | Ops apply in order; only one step is ever in flight. | A break or fracture event from a step in flight can land after the user repaired or changed that joint or part, and overwrite the newer edit. The window is one frame. | Events carry no document revision, so stale ones can't be told apart (I6). |
| A2 | Backpressure and memory | Pass | Physics does at most 4 ticks per message and slows instead of spiralling. Bounds: undo 300, checkpoints 12, a fixed particle pool, 24 audio voices; events drain every frame. | Only when the worker has died (A3): the op queue then grows without bound. | – |
| A3 | Error handling and recovery | **Fail** | The render loop survives exceptions (three.js requests the next frame first). Tests fail on any console error. | (a) A worker exception after start freezes physics silently: `inFlight` stays true, ops pile up, and the user is told nothing. (b) A throw in any per-frame subsystem (XR input, room scan, tools) skips physics and rendering for that frame, every frame if it persists: a frozen headset view. | No fault containment or recovery path (I8). |
| A4 | Joint loads and momentum | **Fixed today** (was fail) | – | Position corrections added momentum ω × d every tick. A joint's load, when its small part was side A, was read from the rest of the assembly, carrying the bookkeeping remainder times its distance to the pivot. On the catapult the cup lips read 10 N·m instead of 0.5, so the glue "failed" on every launch. | `placeCluster` referenced the corrected pose's velocity to the uncorrected centre of mass; `bridgeLoads` used the complement branch. Both are fixed. A new test (both joint orientations, centripetal force and moment to 2% / 5%) fails on the old code and passes now. |
| A5 | Energy | **Fail** | Segmented parts spinning about their own centre keep 99.94% a second. | (a) A body orbiting a pivot loses 5.9%/s at 4 rad/s and 45%/s at 20 rad/s, so pendulums, cranks and catapult arms decay far too fast. Jolt's own joints and the assembly solve lose the same. (b) Every solid part loses 2%/s of spin from a numerical angular damping of 0.02/s (segmented parts bypass it: the two disagree). | (a) Velocity projection: each tick the orbiting body's velocity is projected onto the new tangent instead of turning with it. Friction is a small share: from 17.8 rad/s, one second leaves 9.79 (ball bearing), 9.66 (bronze bushing), 9.23 rad/s (dry steel pin). (b) `mAngularDamping = 0.02` on every body (I3b). |
| A6 | Templates in use | **Fixed** (was fail) | Every template's cards are tested in use, with no failure the card doesn't promise. | The catapult's counterweight was wider than its frame and its arm reached the floor, so it wrecked itself on every throw. Its third card promised a failure that doesn't happen. | Tests checked the headline result only. The catapult was rebuilt (raised pivot, wider frame, real axle in bearings) and its cards are tested as written. |
| A7 | Failure messages | **Fixed** (was fail) | Notes give the governing load and capacity in that load's units. | Joint failures printed moments in N; slip notes compared torsion against the shear grip. | `fmtN` used where `fmtLoad` belongs. Pinned by a wording test. |
| A8 | Saving, loading, sharing | Pass | Byte-exact round trips, share codes and links. | – | – |
| A9 | Panels, tablet, modes | Pass | Desktop panels, tablet pages, and relax, walk and mixed modes (e2e). | – | – |

## Planned fixes and their ripple effects

| Fix | Touches | Ripple effects | Risk |
|---|---|---|---|
| F1 (A4, done) | `placeCluster`, `bridgeLoads`, cluster root choice | Every bond and joint load and failure decision; dynamics of pinned assemblies (injected momentum removed). Verified: all 119 unit and conformance tests, plus the new invariant test. | High, contained by tests |
| F2 (A1) | Op/event contract: ops carry the document revision; events echo the revision they were computed against; `handleEvents` drops events for entities edited since. | Every event consumer, through one check. Physics is unchanged. | Low |
| F3 (A3) | Worker error: report once, restart the worker, rebuild it from the document (world mode, room, parts, joints). Per-frame subsystems each run in a guard: on the first throw, report once, switch that subsystem off, and keep physics and rendering going. | The restart must restore everything `reconcile('load')`, `setWorld` and `setRoom` send. An e2e test injects a worker fault. | Low |
| F4 (A5) | Constraint integration for bodies orbiting a joint: turn velocities with the orbit, or substep, in Jolt joints and the assembly solve alike. Remove the numerical angular damping, or justify it as a stated air-drag model. | Every revolute, spherical, rope and slider joint; motor and servo behaviour; centripetal loads; stability of anything that relied on the damping; all templates. Needs a design note and an energy test matrix (pendulum period and amplitude, flywheel, Newton's cradle, solid vs segmented) before and after. | Highest |
| F5 (A6) | Catapult template: wider frame, with a real steel axle through the bearings. New invariant test: every template runs its "try this" action with no failure it doesn't promise. | Template only. | Low |
| F6 (A7) | Joint failure note units. | Message text only. | Trivial |

Order: invariant tests first, then F1 → F6 → F5 → F3 → F2 → F4. The whole suite (unit, conformance, e2e)
passes before each commit.
