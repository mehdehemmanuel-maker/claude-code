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

1. once a tick: the magnetic pairs' stiffness (and so the substep count, M3) and the eddy-current damping (M4)
2. `prepareClusters`: rigid assemblies of bonded segments and rigid joints
3. for each substep: `applyFields` (magnets, fluids, drag, bands, motors, grabs, then eddy currents last, M4), a Jolt
   step, and the magnetic latches' impulses summed (M6)
4. `solveAssemblies`: sequential impulses for anchors, plastic hinges and contacts, then `placeCluster`
5. `bridgeLoads`: exact joint and bond loads
6. the latches: let go where the contact cannot hold, latch pairs come to rest (M6)
7. `evaluateConnections` and `evaluateBonds`: failures, from the last substep's impulses (A12)
8. events

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
| A10 | Seams between segments | **Fixed** (was fail) | – | A magnet falling down a copper tube bounced back up (−1.74 → +0.96 m/s) as it passed the seam between two of the tube's segments. | Ghost contacts. Jolt makes a contact up to 1 cm before bodies touch (speculative), and when the closing speed along its normal beats gap/dt it applies restitution then. At a seam, the lower segment's nearest feature is its joined end edge, whose normal points up through the seam: the magnet bounced off an edge that does not exist, since joined segments are one continuous wall. A contact that lies on a segment's joined end (bond intact, or both frozen, and the neighbour's end flush at that point), with its normal leaving through that end, now gets no response; the neighbour's own contact is the real one. Test: the copper-tube drop (conformance, magnets). |
| A11 | Inertia of small parts | **Fixed** (was fail) | – | A 10 × 5 mm magnet had 32 000 to 48 000 times its real moments of inertia (1.2e-3 kg m² instead of 2.5e-8 and 3.7e-8), and every body whose principal moments are below about 1e-6 kg m² (small magnets, bolts and nuts, small blocks) turned that much too slowly under any torque. | Jolt treats an inertia diagonal shorter than 1e-6 as a failed decomposition and falls back to the inertia of a sphere of radius 1 m (0.4 m). The world now checks each dynamic body's inertia against its shape's mass properties, scaled to its mass, and sets it itself where Jolt fell back. Test: small parts have the inertia of their shape (conformance, kinematics). |
| A12 | Joint and bond loads with magnets near | **Fixed** (was fail) | – | When close magnets divided the tick into k substeps, every joint and bond load was read as the last substep's impulse over n/TICK (n the substeps springs alone need), i.e. k times too small: a joint could be overloaded without breaking. | `evaluateConnections` and `evaluateBonds` were given n, not the substeps actually taken. Test: a rigid joint carries m g with a magnet pair substepping the tick. |

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

Overlap. The contact solver lets bodies overlap by up to its slop (2 mm). A sample of B less than half A's depth
behind one of A's faces is inside A, where only that overlap can put it, and takes the face's field as touching it. On
steel, a magnet sunk into the surface would pass its own images, and the pull would reverse and fire it off (a
10 × 10 × 2 mm block that landed 0.65 mm deep left at 7 m/s). Its field is taken as that of the magnet touching,
lifted out along the normal. [conformance: small magnets snap onto steel and lie flush and still]

**M3 Momentum and integration.** The world applies −F to A with torque −T − (x_B − x_A) × F, so momentum and angular
momentum are exact. The wrench is evaluated afresh every substep. A stiff pair is divided into as many substeps as the
rate of its motion needs (ω dt ≤ 0.5, up to 16 a tick), its rate measured from the stiffness (central differences,
remeasured once B has moved 2% of its size or turned 0.02 rad relative to A). A pair is stiff when close (gap under
four magnet radii) or when the dipoles say it can turn or close in faster than a quarter of a tick allows: a light
magnet can wobble tens of times a second several centimetres from a strong one.

The restoring modes the substeps can follow (ω dt ≤ 1) are integrated explicitly, and symplectically (Jolt's
integrator), so a magnet wobbling near another keeps wobbling, as a real one does: its own eddy currents damp it at
only ~1.6 s⁻¹ (M4). Only modes faster than that, beyond the 16-substep cap, are taken by backward Euler (implicit.ts),
which is stable for any stiffness but damps them numerically.

Near contact the pull changes over a fraction of a millimetre, so a magnet leaving or arriving fast can cross that in
one substep. Where a substep carries B more than a tenth of its feature size relative to A, the wrench applied is its
average along the substep's path (two-point Gauss), so it does the work the field does along the way. At the start of
the substep, the force overstates the pull on a magnet leaving: knocked straight off steel, a 10 × 5 mm disc then
needed twice its escape speed.

Limit: a wobble faster than 16 substeps can follow (above about 230 Hz, e.g. a small magnet within a few millimetres of
another) is damped numerically, within a few periods.

[conformance: the world applies the model force integrated along the path; a magnet on a pivot near another wobbles
at √(k/I) and keeps its amplitude; a stuck magnet knocked straight off escapes just above the speed at which its
kinetic energy beats the pull's well, ½ m v² = ∫ P dz, and falls back just below]

**M4 Eddy currents (Lenz's law).** Take a conductor C of conductivity σ moving relative to a field source S. A
point x of C moves at u(x) relative to S. In the quasi-static limit (magnetic Reynolds number μ0 σ u ℓ ≪ 1), the
induced current is

    J = σ (u × B − ∇φ),  ∇·J = 0 in C,  J·n = 0 on its surface

so φ solves the Neumann problem ∇²φ = ∇·(u × B), with ∂φ/∂n = (u × B)·n on the surface. Charge building up on the
surface cancels whatever part of the EMF cannot drive a closed current. That is why a disc spinning in an axial field
carries no current: it is an open-circuit Faraday disc.

For rigid relative motion q = (V, Ω) about a reference point x_r, u = V + Ω × (x − x_r) is linear in q. The dissipated
power is P = ∫ |J|²/σ dV = qᵀ D q, with D a 6 × 6 positive semi-definite matrix. The drag wrench on C is −D q, which
dissipates exactly P, and S gets the opposite wrench with the moment of the couple. The drag is taken implicitly, at
the velocity each (sub)step ends with:

    q' = (I + dt M⁻¹ D)⁻¹ (q + dt a)

where a is the relative acceleration that the rest of the load (weight, the other field forces) gives in the step.
So it is stable however strong it is, and in steady motion the drag balances the load exactly: a magnet falls down a
pipe at m g / D_yy. (Damping only the step's starting velocity, q' = (I + dt M⁻¹ D)⁻¹ q, would let it fall
(1 + dt D/m) times faster: 6% for the pipe below.)

Discretisation: finite volumes on a structured grid of the cells inside C near the magnet (Cartesian in a box, polar
in a cylinder or tube, so currents can circulate round its wall). φ is solved per basis motion, and D is summed over
cell faces. The grid's Laplacian is separable, so φ is solved exactly: cosine transforms along the Neumann
directions, a Fourier transform round the tube, a tridiagonal solve along its radius (it agrees with conjugate
gradients to 1e-12). Materials carry their measured conductivity (NdFeB 0.67 MS/m, copper 58 MS/m, sintered ferrite
effectively an insulator).

Scope: the world computes this for non-magnetic conductors of at least 10 MS/m (aluminium, copper, brass) near a
magnet moving faster than 1 mm/s relative to them. There Lenz braking is strong and the free-space field is the true
one. Left out: a magnet's own currents (NdFeB is 0.67 MS/m: they damp a 10 × 5 mm disc rocking on another magnet at
only about 1.6 s⁻¹, and bouncing on it at 2.2 s⁻¹, measured with this solver on a fine mesh; see M6), and steel (see
the limits).

Limits, stated rather than hidden:
- The currents' own field is neglected. That overstates the drag at high magnetic Reynolds number (thick copper at
  metres per second).
- In steel, B is taken as the magnet's free-space field. That understates the drag, because steel concentrates flux.
- The world meshes about 240–500 cells within three magnet distances of the magnet, recomputed every tick. For a
  4 × 4 mm magnet in a 20 mm copper pipe that gives 96% of the converged drag (a 50 000-cell mesh is within 0.5% of
  Levin's formula), so it falls about 4% fast.

[golden: an axisymmetric spin dissipates nothing; the transform solve matches conjugate gradients; a point dipole in a
thin tube meets F = 45 μ0² m² σ δ v / (1024 a⁴) (Levin et al., Am. J. Phys. 74, 815, 2006). Conformance: a
4 × 4 mm magnet falls down a 20 mm copper pipe at that terminal speed (within 8%), speeding up smoothly past the
pipe's five seams]

**M5 Contact statics of a stuck magnet.** Let n be the contact normal (A to B), and c the centroid of the footprint
(the overlap of B's face with the face it lies on). The contact wrench on B, about c, is (F_c, M_c). It is admissible
if all of these hold:

- N = F_c·n > 0: it presses.
- |F_c − N n| ≤ μ N: friction holds.
- The pressure centre c + d, with d = n × M_t / N, lies within the footprint. (M_t is the tangential moment; for
  d ⊥ n, (d × N n) = M_t gives n × M_t = N d.) The test is: |M_t| ≤ N · max over the footprint of (p − c)·ê,
  with ê = n × M_t/|M_t|.
- |M_c·n| ≤ μ N r̄, where r̄ is the footprint's mean distance from c (uniform pressure; 2R/3 for a disc).

So a stuck magnet pulled straight off lets go at its pull P; pushed sideways it slides at μ P; and a tall one pushed
sideways at height h tips at P a / h, a being the footprint's half-width in the push's direction (R for a disc), if
that comes before μ P. [conformance, with constant loads just below and just above each threshold; golden: r̄ of a
disc, a square and a line]

**M6 Latch.** At rest in contact, B is held to A by a rigid constraint, and the magnetic wrench W_m is no longer
applied: the latch stands for it. A stuck pair is then exactly still, and costs almost nothing while it holds. Simulated
as forces against a contact instead (option `magnetLatch` off), a close pair needs up to 16 substeps a tick and 2–3 ms.
Since A11 that simulation also settles every common magnet flush and holds it, and the tests below check that the two
agree on every threshold.

When: B touches A (within 0.1 mm), and moves relative to it at under 2 cm/s at the footprint and under 0.5 m/s at its
rim. That is well inside what the world treats as inelastic anyway (restitution acts only on impacts above 1 m/s), so
the latch stops nothing that would have bounced. It latches only if the contact can hold what the latch will carry
through its first tick: W_m, B's weight, and the impulse that stops B's residual motion (tested with M5 as below).

Holding: every substep's constraint impulses are summed over the tick, in A's frame and about the footprint's
centroid c. That gives the tick-average reaction W_L on B, and the contact wrench W_c = W_L − W_m. On the first tick
W_L includes the impulse that arrested B's residual motion. That arrest is an inelastic impact, and an impact's
impulse is a contact impulse like any other: over the tick, Coulomb's law for it is the M5 test on the tick average.
Friction can stop a slide only with at most μ times the normal impulse (the pull's and the impact's own), and a clack's
normal impulse at the landing rim puts the pressure centre on the footprint's edge, which M5 admits. (Subtracting the
arrest from the reaction instead would let the latch steal a sliding magnet's speed each time it latched again.)

Letting go: if W_c is not admissible (M5),

1. The latch opens.
2. What it carried beyond the admissible set is handed back: ΔW = W_c − proj(W_c), with the projection taken
   component-wise: N* = max(N, 0); the tangential force clipped to μ N*; the twist to μ N* r̄; the tangential moment
   to N* times the footprint's reach in its direction. B gets the impulse −ΔW·TICK at c, and A gets +ΔW·TICK with
   the moment of the couple.
3. The continuous physics (M2–M4) carries on from there, exactly as the real contact would have let it.

A steady load too small to free the magnet is carried and the latch holds; a bigger one frees it with just the impulse
the contact could not take. There are no timers or tick counts.

Knocks. An impulse applied to a latched body (the poke tool) acts at an instant, before the pull has supplied
anything. So the latch takes it only if the contact could, as an impact: the impulse the latch needs at c must press,
within friction and the footprint of its own normal impulse. Otherwise the latch opens before the knock lands, and the
continuous physics plays it out: the magnet lifts or slides, and the pull brings it back or it escapes (M3).

Limit: a collision from another body arrives inside the step, and the latch judges it with the tick average, like a
steady load. A blow shorter than a tick is then treated as spread over the tick: it frees the magnet only if its
impulse beats the contact's capacity times TICK, not as soon as its energy beats the pull's well. For a 10 × 5 mm disc
on steel knocked straight off, that is 0.35 N s instead of 0.016 N s.

Seating. The latch holds B where it is put, so it is put where the real magnet comes to rest. The contact solver
leaves bodies overlapping by up to its slop (2 mm), and within that a magnet can lie tilted in another. A magnet can
also be caught at rest on its rim for an instant, which the real one is not: if the torque on it turns it flat, it
swings down and clacks flat in a few inelastic rim impacts within milliseconds. So as it latches, B is seated: turned
flat about its lowest touching rim onto the face it touches, and the footprint is the overlap of the two faces. The
move is the latch's own position correction (its target pose), so B gains no velocity and no energy; the swing's energy
is what the clack dissipates. B is seated only if all of these hold:

- θ ≤ SEAT_ANGLE = 20°, θ being its pole face's tilt from the face it touches. This is a bound on where the
  pivot-on-the-rim picture is used, not a physical constant. Beyond it, B is left to the simulation to swing down, and
  latches when it next comes to rest.
- The torque about that rim, from the magnetic wrench and B's weight, turns B towards flush, both at the tilt it has
  and at half of it.
- The swing it replaces is shorter than a tick: √(2θ I_p/τ) ≤ TICK, with I_p B's moment of inertia about the rim and τ
  the smaller of those two torques. (From 20°, measured: 1.4 ms for a 10 × 5 mm N42 disc on steel, 0.85 ms for a
  6 × 3 mm one, 3.4 ms for a 25 × 10 mm one.)

Otherwise it is held where it touches, over its touching points, only moved out of any overlap along the contact
normal.

Measured with the seat switched off: the simulation now brings every common magnet flat by itself, through rim impacts
that are inelastic in this world below 1 m/s, as they are in reality. The magnet's own eddy currents would damp its
rocking at only about 1.6 s⁻¹ (M4). (Before A11, the 30 000-fold inertia of these magnets had them rocking for seconds
and flung off.) What the seat still does that the simulation does not is take out the solver's overlap and the tilt it
allows, which the latch would otherwise hold: a 10 × 10 × 2 mm block on its twin was latched 0.55 mm inside it and 3°
askew.

[conformance: every common magnet settles flush and still on steel and on another magnet; with constant loads at 0.95
and 1.05 times each threshold (pull-off P, slide μ P, tip P w/L with a tall block), the latched and the unlatched
simulations agree with M5 and with each other, holding below and letting go above; so do their escape speeds when
knocked off (M3)]

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
