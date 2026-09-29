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

## Magnets: model, derivations and contracts

Written before the code it governs; each numbered contract has tests named in brackets.

**M1 Field of a pole face.** A uniformly magnetised magnet is equivalent to surface charge σ = ±Br/μ0 on its pole
faces (Gilbert model). A flat face gives, at a point p,

    H(p) = σ/(4π) · [ Ω(p) o + ∮ n_edge / |p − x| dl ]

The normal part is the solid angle Ω the face subtends at p (signed, positive in front). The in-plane part comes from
the divergence theorem: ∫ ∇'(1/|p − x'|) dA' = ∮ n_edge/|p − x'| dl. Discs use closed forms in elliptic
integrals (Paxton 1959; Carlson's algorithms), and rectangles use arctangents and inverse hyperbolic sines.
[golden: face field against brute-force integration, 2e-5]

**M2 Force.** The force on magnet B is the field of A's faces acting on samples of B's face charge,
F = μ0 Σ q_b H_A(p_b), with torque about B's centre from the same sum. H_A = −∇φ_A exactly, so F is the gradient of
U = μ0 Σ q_b φ_A(p_b): it is conservative and its stiffness is symmetric.

Within about a patch of an edge, a sample takes A's potential at height w + soft(e, w) instead of w. Here e is its
sideways distance from the edge, w its height over the face, and soft fades out away from edges and above the face.
The force is the exact gradient of that smoothed potential:

    F_n = H_n (1 + ∂soft/∂w),  F_∥ = H_∥ + sgn H_n ∇_∥soft

That keeps it conservative. [golden: coaxial discs within 2.5% of the exact Hankel solution at every gap (20 × 10);
the stiffness is symmetric to 0.2%; a sideways shift changes the pull smoothly; the force is continuous across
quadrature levels]

**M3 Momentum.** The world applies −F to A with torque −T − (x_B − x_A) × F, so momentum and angular momentum are
exact. [conformance: the world applies the model force integrated along the path]

**M4 Eddy currents (Lenz's law).** Take a conductor C of conductivity σ moving relative to a field source S. A
point x of C moves at u(x) relative to S. In the quasi-static limit (magnetic Reynolds number μ0 σ u ℓ ≪ 1), the
induced current is

    J = σ (u × B − ∇φ),  ∇·J = 0 in C,  J·n = 0 on its surface

so φ solves the Neumann problem ∇²φ = ∇·(u × B), with ∂φ/∂n = (u × B)·n on the surface. Charge building up on the
surface cancels whatever part of the EMF cannot drive a closed current. That is why a disc spinning in an axial field
carries no current: it is an open-circuit Faraday disc.

For rigid relative motion q = (V, Ω) about a reference point x_r, u = V + Ω × (x − x_r) is linear in q. The dissipated
power is P = ∫ |J|²/σ dV = qᵀ D q, with D a 6 × 6 positive semi-definite matrix. The drag wrench on C is −D q, which
dissipates exactly P, and S gets the opposite wrench with the moment of the couple. The damping is applied implicitly,
q' = (I + dt M⁻¹ D)⁻¹ q, so it is stable however strong it is.

Discretisation: finite volumes on a regular grid of the cells inside C near the magnet. φ is solved per basis
motion, and D is summed over cell faces. Materials carry their measured conductivity (NdFeB 0.67 MS/m, copper
58 MS/m, sintered ferrite effectively an insulator).

Limits, stated rather than hidden:
- The currents' own field is neglected. That overstates the drag at high magnetic Reynolds number (thick copper at
  metres per second).
- In steel, B is taken as the magnet's free-space field. That understates the drag, because steel concentrates flux.

[golden: an axisymmetric spin dissipates nothing; a point dipole in a thin tube meets
F = 45 μ0² m² σ δ v / (1024 a⁴) (Levin et al., Am. J. Phys. 74, 815, 2006). Conformance: a magnet falls through a
copper pipe at that terminal speed; a rocking magnet settles on steel or another magnet by itself]

**M5 Contact statics of a stuck magnet.** Let n be the contact normal (A to B), and c the centroid of the footprint
(the overlap of B's face with the face it lies on). The contact wrench on B, about c, is (F_c, M_c). It is admissible
if all of these hold:

- N = F_c·n > 0: it presses.
- |F_c − N n| ≤ μ N: friction holds.
- The pressure centre c + d, with d = n × M_t / N, lies within the footprint. (M_t is the tangential moment; for
  d ⊥ n, (d × N n) = M_t gives n × M_t = N d.) The test is: |M_t| ≤ N · max over the footprint of (p − c)·ê,
  with ê = n × M_t/|M_t|.
- |M_c·n| ≤ μ N r̄, where r̄ is the footprint's mean distance from c (uniform pressure; 2R/3 for a disc).

So a stuck magnet pulled straight off lets go at its pull P; pushed sideways it slides at μ P; and a tall one pushed at
height h tips at P R / h. [conformance, with constant loads just below and just above each threshold]

**M6 Latch.** At rest in contact, B is held to A by a rigid constraint, and the magnetic wrench W_m is no longer
applied: the latch stands for it. This is how the contact solver carries a load of thousands of g on a gram of magnet.
Each tick the latch's reaction W_L on B gives the contact wrench W_c = W_L − W_m. If W_c is not admissible (M5):

1. The latch opens.
2. The part it carried beyond the admissible set, ΔW = W_c − proj(W_c), is handed back to the bodies as the impulse
   −ΔW·dt on B (and the opposite on A).
3. The continuous physics (M2–M4) carries on from there, exactly as the real contact would have let it.

A knock too small to free the magnet lifts it slightly, the pull and eddy damping bring it back, and it latches
again. There are no timers.

It latches only when at rest (slip at the footprint below 2 cm/s), lying flush (within 1°, inside the solver's own
slop) and admissible. [conformance: every common magnet settles flush and still on steel and on another magnet;
the pull-off, slide and tip thresholds match the unlatched simulation (large magnets, where that is stable) and M5]

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
