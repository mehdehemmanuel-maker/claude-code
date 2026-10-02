# The frontier

What this physics does not yet do, does not know, or does not trust. A permanent document: entries are retired by a
repair that lands as a law node with a test (docs/LAW-TREE.md), never by deletion. Each entry has an id that code,
tests and the tree cite. Levels: V0–V6 validity and E0–E5 evidence are those of docs/AUDIT-2-FALSE-CONFIDENCE.md;
anomaly levels are §3's; statuses (FORMALLY PROVED … OUTSIDE DOMAIN) are docs/NEXUS-STRESS.md §J's.

Last reconciled: 2026-10-02, batch 2 of the audited evolution.

## 1. Known defects (D-)

Behaviour the laws forbid and the realisation still shows. Each names the law it breaks, the measured size, where it
is contained, and what retires it.

| id | breaks | what | measured | contained by | retired by |
|---|---|---|---|---|---|
| D-contact-normal | F-3.2, F-1.3 | the collision detector's contact normal is found to a tolerance (Jolt's GJK/EPA, 1e-4 m, P-gjk-tolerance) and at centimetre separations leans off a flat face: a sideways force a flat surface cannot exert | 0.035 rad at most, 0.010 on average, on 24% of the normal impulse of a walking dog; a frictionless-floor centre-of-mass drift of 0.48 m in 9 s | repaired for watched assemblies as a rule over surfaces: a flat face (a box's, a hull's, a terrain triangle's) whose own normal the detector agrees with within P-normal-agree sets the normal, exact (`PhysicsWorld#surfaceNormal`); unwatched bodies keep the detector's normal, and so do edge-on-edge and curved-on-curved contacts, where there is no face to take | exact normals in Jolt's own solve (not settable from the bindings), or every body re-solved |
| D-joint-residual | F-3.1, F-3.5 | a bilateral row's gap under a heavy load through a light part | the slider's 2.3 mm was a joint dropped from the mechanism for one tick (A-slider-residual, retired); what remains is the a dt² residual of the velocity rows before closure, 0.5 mm measured | the test cites the F-3.5 bound | a test at two step rates showing the dt² order (Q-step-rate); D-light-link |
| D-light-link | F-3.1 | the row solver fails to converge on a 22 g rod between 0.9 kg and 120 kg bodies through ball joints | open finding #54 | such designs are not placed by Ego's designer | a mass-ratio-aware ordering or a direct solve of small islands (R-1's contract) |
| D-rotor-housing | F-2.3.1, F-1 | a drive's rotor realised as reflected inertia on the horn's body (R-10) also spins when the *housing* turns about the axis, which a rotor does not: a pitching walker's body carries its four hip rotors' inertia as its own | 1.4e-3 kg m² against the dog body's own 7e-4 about pitch (3x); a 4-rotor deer the same | R-10's contract names the domain (the housing side's inertia about the axis large against Σ J); the gyroscopic term is left out for rotor-laden bodies (it was N times too large: a knees-still walker paddled 3 m on it); walker verdicts carry the caveat; the deer's is UNRESOLVED (A-deer-trot) | the rotor as its own degree of freedom coupled to the joint rate inside the velocity solve: a coupling row among three entities (Q-rotor-dof), which is also what real gears need |
| D-servo-source | F-2.2 | a servo's work is booked as a source's (`work.servos`) with no store behind it: no creature carries a pack, so no current is drawn and no winding heats | a walking dog takes 1.0 W from nowhere (4.1 J in 4 s) | declared: the ledger shows it as a source term, never as unexplained gain | a pack on every creature (motor model C-4 with battery C-5, as the gearmotor path already does), then current and heat (F-2.3.1's remaining obligations) |
| D-jolt-motor-work | F-2.1 | a servo on a body no assembly watches is driven by Jolt's own hinge motor, whose work is not read into the books (`GetTotalLambdaMotor` is read for gearmotors and eddy brakes only) | unmeasured | watched assemblies (every creature) are re-solved, where the servo row's work is booked | read the motor lambda for servos as for motors (bookMotors) |
| D-correction-energy | F-2.1, R-9 | the potential energy that position corrections move (mechanism closure, the position pass) is booked nowhere, so the books of a walking dog show a gain and an equal friction heat that are the same noise | 3.5 mJ a tick on a walking dog, 1.27 J over 4 s each way | the ledger keeps it as `gained`, attributed to no cause (the point of the split) | book Σ m g·Δh of every position correction as the integrator's, signed, in a `corrected` term of the numerical book |
| D-restitution-floor | F-4.6 | nothing bounces under a closing speed of 1 m/s (P-restitution-floor), a default without a source | all of a bounce from under 5 cm | marked provisional in the tree | a measured low-speed restitution for the material pairs in use, or an energetic restitution model |
| D-minds-read-world | F-6, F-6.2 | creatures' minds read the world's state rather than sensor elements with latency and line of sight | FC-17 | the law node F-6.2 is marked `violated` | sensor nodes (F-6.1) realised; minds take only their readings (docs/NEXUS-MINDS.md §C forbids anything else) |
| D-unstamped-beliefs | AUDIT-3 | Ego's habit and skill stores (`vrsb.habits`, `vrsb.skills`) are unversioned | not physical knowledge (they are about the user and the UI), left as they are | the stand's learning is stamped and quarantined on a physics change; reports carry the physics stamp | any physical content found in them gets the same stamp |

Retired in batch 2: D-angular-damping (the damping is gone: a free spin slows only where something slows it; the
books no longer carry a damping term), D-gravity-fallback (the magnet cutoff reads the scene's gravity and in free
fall keeps every pair within reach; particles fall under the scene's gravity read each frame; foresight takes gravity
as an argument), D-driven-exemption (the watchdog is an observer: a body's motion has a cause when the drives' work on
it over the window covers the energy it holds, O-1; the list of driven bodies is gone), D-servo in part (hardware
travel with the command's swing inside it, F-3.4 tested; the rotor's inertia felt, R-10; the 6 Hz loop floor gone,
C-11; current and heat remain as D-servo-source).

## 2. Unmodelled physics (U-)

What the model assumptions leave out. Not defects: the laws say so. Listed so that no claim is made where they apply.

- U-elastic: parts are rigid between declared hinges and seams (M-2); no elastic deflection, no vibration within a part, no stress waves. A beam's deflection is computed by the engineering layer for a design check, not simulated.
- U-thermal-expansion, U-creep, U-fatigue: temperature changes stiffness and strength only through the material tables' limits; nothing grows, creeps or fatigues.
- U-electrical-dynamics: circuits are solved quasi-statically (R-10's circuit solve); no inductance transients; motors have no electrical time constant.
- U-fluid: water is drag on faces and buoyancy (C-9); no flow field, no wakes, no waves made by bodies.
- U-air: air is a drag on faces at a Reynolds regime; no lift, no compressibility; nothing slows a free spin (rotational air drag is not modelled, and since batch 2 nothing stands in for it).
- U-wear, U-lubrication, U-backlash: bearings have a static rating and a friction torque; no wear, no film, no play in gears.
- U-sound: audio is an observation of the state, never a physical pressure field.
- U-contact-compliance: contacts are rigid with a slop (P-slop); no Hertzian compliance, no contact area beyond the manifold's points.
- U-servo-electrics: a servo's motor has no winding, no current, no back-EMF of its own (C-11 takes its damping as critical); its rotor's gyroscopic angular momentum (J w / N) is left out.

## 3. Anomalies (A-)

An unexplained disagreement between a prediction and a trusted observation is a persistent object: it is never
deleted, only retired with its explanation. Levels (the default hypothesis is never new physics):

- A0 numerical suspicion: seen once; may be rounding, a tolerance, a probe's own error.
- A1 reproducible simulator anomaly: reproduces on the same realisation with the same inputs.
- A2 independent realisation reproduces: a second, independent realisation of the same law shows it too.
- A3 the model's own obligations are met and it still disagrees with a trusted measurement.
- A4 an independent measurement replicates the disagreement.
- A5 the competing explanations (numerical error, defect, regime, data, hidden writes, assumptions) are rejected by hostile investigation.
- A6 a candidate theory is required.

| id | level | prediction | observation | explanation | status |
|---|---|---|---|---|---|
| A-closure-drift | A1 → retired | a walker in zero gravity keeps its centre of mass (F-1.3) | it drifted; 99.98% from `closeMechanism` | a realisation defect: the island's drift was never undone (F-1.1.2) | retired by `undoClosureDrift`; held by momentum.test.ts |
| A-floor-leak | A1 → retired | a walker on a frictionless floor keeps its horizontal centre of mass | 0.48 m in 9 s on the contact normal rows, friction rows exactly zero | D-contact-normal: the detector's normals lean | retired by `surfaceNormal`; held by momentum.test.ts and walker.test.ts |
| A-slider-residual | A1 → retired | a slider's anchors stay within the F-3.5 bound | 2.33 mm on one tick; zero after closure on every other tick | the joint was dropped from the mechanism for that tick by a seated check that measured its gap along its own free axis (SEATED, 2 cm, against a load that had slid 2 cm along the slider); Jolt's constraint alone then drifted a tick's worth | retired: the seated check projects the gap onto the joint's constrained directions (anchorDofs); the common-point impulse law (F-1.1.1) was never the cause and is kept |
| A-rotor-row | A1 → retired | a servo with its rotor sags a static load by load torque over stiffness | 0.044 rad against 0.029; a frictionless-floor centre-of-mass drift returned | the rotor as a soft row toward the joint's last rate was a split scheme: the step integrated the link without the rotor and the row recoupled them inelastically, and its equilibrium with the servo's implicit spring row was not the physical one; the momentum drift it made is unexplained and moot | retired by removing the realisation (R-10 is reflected inertia); the momentum leak of a momentum-exact angular row is recorded as not understood (Q-rotor-row-leak) |
| A-gyro-paddle | A1 → retired | a trot with its knees still moves the walker little (its dragged feet cancel) | 3.2 m in 10 s | the reflected rotor's full tensor gave Jolt's gyroscopic term N times the rotor's real angular momentum, in directions it never couples | retired: the gyroscopic term is left out for rotor-laden bodies (R-10's contract); the walker then shuffles 0.5–0.9 m, see A-knees-still |
| A-knees-still | A1, explained, open as a claim | "with its knees still a trot only paddles": under 0.3 m in 10 s | 0.5 to 0.9 m in 10 s under the real servo, whatever the rotor (0.62 m at no rotor) | the old bound was set from the old output (docs/LAW-TREE.md K-24) under false stops and an unphysical angular damping; under a compliant servo a body free to rock loads its rear-moving feet more, and dragged feet shuffle it along: physically plausible, not derived | the test now holds the order only (knees still moves less than with lift); a derivation of the shuffle from load asymmetry would make it a claim |
| A-deer-trot | A1, UNRESOLVED | the long-legged walker trots five body lengths in ten seconds | it trots at P-rotor-per-stall = 5e-4 s²; at 1e-3 it stands; at 2e-3 (the estimate) it rolls over | the verdict depends on an estimate datum (the rotor at the horn) and on R-10's known error (a pitching body's inertia overstated 3x), so it is OUTSIDE DOMAIN of the realisation and UNRESOLVED on the datum; neither "walks" nor "falls" is claimed, and no test asserts either | the experiment that settles the datum: measure one 9 g servo's rotor inertia at the horn (spin-down, or a step response unloaded); the realisation that removes the domain limit: Q-rotor-dof |
| A-walker-gain | A1, explained | a walking dog's books close with its servos' work as the only source | gained 1.27 J and friction 1.27 J over 4 s, equal | D-correction-energy: position corrections' potential energy, 3.5 mJ a tick, booked nowhere, so the books see it as noise of both signs | open as D-correction-energy |

## 4. Open questions (Q-)

- Q-rotor-dof: the exact realisation of a drive's rotor is a scalar degree of freedom with inertia J coupled rigidly to the joint's *relative* rate inside the velocity solve: a coupling row among three entities, which is what real gears (a gear row between two rotations with a ratio) also need. R-1's row kinds are pairwise today.
- Q-rotor-row-leak: an angular soft row between two entities, momentum-exact by construction (a torque pair), drifted a walker's horizontal centre of mass on a frictionless floor when it realised the rotor. The realisation is gone; why a torque pair leaked linear momentum is not known. Either an entity in a cluster took the angular impulse about a point other than its centre, or the row's work accounting moved the fit. Worth a reproduction on a two-body test before any three-entity row is written.
- Q-servo-damping: the servo loop's damping ratio is an estimate (critical); the motor's back-EMF through the gears sets it in reality; a 9 g servo's step response would give it.
- Q-step-rate: the test rig runs at 90 Hz only; the residual-order obligations (F-3.5) are tested as a bound, not as a scaling. A rig at two rates would test the order.
- Q-gjk-tolerance: the detector's tolerance cannot be set from the bindings; whether a smaller one would remove D-contact-normal for unwatched bodies is untested.
- Q-restitution: no low-speed restitution data for the material pairs in use.
- Q-support-stiffness: least support (R-8) assumes equal stiffness; the error for unequal supports is unbounded in the contract.
- Q-gait-derivation: the walkers' rhythms, swings and lifts are design numbers. The command lead and gain per servo are now derived from the loop (C-11) at the rhythm; the rhythm itself should follow from Froude similarity (F-5.2) and the servo envelope (torque against speed), and the gait's stability from the leg's load feedback (task #74).

## 5. Unregistered

What the tree (`src/ganglia/tree/nodes.ts`) does not yet carry, from docs/LAW-TREE.md §K: the C-layer beyond
materials and the servo (fasteners, springs, motors, batteries, magnets, thermal, welding, water and sand), the
D-layer, R-4, R-5, R-6, the circuit solve, the engineering formulas as nodes with two realisations, the creature and
place tables, mind constants, foresight, Jolt's remaining settings, the simulation settings as run records, fitted
friction values as calibration nodes, the estimate sentinels, and the bare constants of world.ts, rigid.ts, stand.ts
and mind.ts. Each lands as it is touched; none is cited as knowledge until it does. docs/NEXUS-STRESS.md §M moves
M-1..M-5 from roots of the tree to roots of the rigid-body theory once theories are terms.

## 6. Beliefs invalidated

Batch 1: everything the stand learned before the physics stamp (`vrsb.stand` without a `physics` field) is
quarantined; every report before the stamp is evidence about an unknown physics; "a walker on a frictionless floor
moves less than 0.3 m" became the F-1.3 bound; "energy unexplained while a hand held a part was the hand's work" is
gone; the one-number "integrator" became lost and made; Ego's "I stilled it" is gone.

Batch 2: "the deer trots" (UNRESOLVED, A-deer-trot); "with its knees still a trot moves under 0.3 m" (a number from an
output; the order is kept); "a free spin slows at 2% a second" (it does not); "a servo follows at least a 6 Hz loop"
(it follows its stiffness over its inertia); "a servo's stops are at its command" (they are at its travel); "driven
bodies are exempt from the watchdog" (a cause is a drive's work); every walker verdict now carries R-10's caveat on a
pitching body's inertia.

## 7. Revision burden

A node's revision costs what its depth and its support cost: a fitted friction value is revised by a measurement; a
law of layer 3 by evidence at A5 with every dependent claim re-run; an axiom by a demonstration that the tree built on
it predicts worse than one built without it. No empirical node is immune; none is cheap in proportion to what rests
on it. Ego wanting a design to work changes none of these costs. The deer is the batch's example: wanting it to trot
bought it nothing; the datum it waits on is a measurement.
