# The frontier

What this physics does not yet do, does not know, or does not trust. A permanent document: entries are retired by a
repair that lands as a law node with a test (docs/LAW-TREE.md), never by deletion. Each entry has an id that code,
tests and the tree cite. Levels: V0–V6 validity and E0–E5 evidence are those of docs/AUDIT-2-FALSE-CONFIDENCE.md;
anomaly levels are §3's.

Last reconciled: 2026-10-02, batch 1 of the audited evolution.

## 1. Known defects (D-)

Behaviour the laws forbid and the realisation still shows. Each names the law it breaks, the measured size, where it
is contained, and what retires it.

| id | breaks | what | measured | contained by | retired by |
|---|---|---|---|---|---|
| D-contact-normal | F-3.2, F-1.3 | the collision detector's contact normal is found to a tolerance (Jolt's GJK/EPA, 1e-4 m, P-gjk-tolerance) and at centimetre separations leans off a flat face: a sideways force a flat surface cannot exert | 0.035 rad at most, 0.010 on average, on 24% of the normal impulse of a walking dog; a frictionless-floor centre-of-mass drift of 0.48 m in 9 s | repaired for watched assemblies: the re-solve takes the exact face normal where every manifold point lies on one flat face of an environment box (`PhysicsWorld#faceNormal`); unwatched bodies, terrain and body-on-body contacts keep the detector's normal (momentum-exact between two moving bodies, F-1.1.1; a false bias only against static ground) | exact normals for terrain triangles and part faces; or a detector tolerance set from the step (not settable in Jolt's bindings today) |
| D-joint-residual | F-3.1, F-3.5 | a bilateral row's gap under a heavy load through a light part | 2.3 mm on a slider carrying 30 kg through a 0.5 kg hanger on a swinging arm, at 90 Hz; the bound a dt² with a ≤ 3 g gives 3.6 mm | the test cites the bound, not its last output | a test at two step rates showing the dt² order (the rig runs at one rate today, Q-step-rate); better conditioning of heavy-on-light chains (D-light-link) |
| D-light-link | F-3.1 | the row solver fails to converge on a 22 g rod between 0.9 kg and 120 kg bodies through ball joints | open finding #54 | such designs are not placed by Ego's designer | a mass-ratio-aware ordering or a direct solve of small islands (R-1's contract) |
| D-servo | F-2.3.1, F-3.4 | the servo has a 6 Hz bandwidth floor, no rotor, draws no current, makes no heat, and stops at its command's range instead of its hardware's travel | the dog's gait relied on the false stops (docs/AUDIT-2-FALSE-CONFIDENCE.md FC-10, FC-11, FC-18) | the law nodes are marked `violated`; a patch realising travel, swing and rotor exists (scratchpad `servo-laws.patch`) and is held back until the gait is re-derived from F-5.2 rather than tuned | queue item 8–9: motor + gear + rotor + current + thermal + hardware travel, with the gait derived |
| D-angular-damping | F-2.1 | Jolt's angular damping on every body (P-angular-damping, 0.02/s) slows free spin with no bearing | 2% a second; booked as lost, not heat | the books carry it as the integrator's | queue item 7: removal, with rotation integrated so that it stays stable without it (Q-angular-damping) |
| D-restitution-floor | F-4.6 | nothing bounces under a closing speed of 1 m/s (P-restitution-floor), a default without a source | all of a bounce from under 5 cm | marked provisional in the tree | a measured low-speed restitution for the material pairs in use, or an energetic restitution model |
| D-gravity-fallback | E-g, M-3 | literal 9.81 fallbacks in magnetPairs, particles and foresight's default | none measured (Earth scenes only so far) | the environment node names them | queue item 10: read the setting everywhere |
| D-minds-read-world | F-6, F-6.2 | creatures' minds read the world's state rather than sensor elements with latency and line of sight | FC-17 | the law node F-6.2 is marked `violated` | sensor nodes (F-6.1) realised; minds take only their readings |
| D-driven-exemption | F-2 | the watchdog exempts driven bodies from its energy assertion | FC-? (docs/LAW-TREE.md K-3) | none | queue item 11: watchdogs become observers; the exemption removed |
| D-unstamped-beliefs | AUDIT-3 | Ego's habit and skill stores (`vrsb.habits`, `vrsb.skills`) are unversioned | not physical knowledge (they are about the user and the UI), left as they are | the stand's learning is stamped and quarantined on a physics change (`StandMemory`); reports carry the physics stamp | any physical content found in them gets the same stamp |

## 2. Unmodelled physics (U-)

What the model assumptions leave out. Not defects: the laws say so. Listed so that no claim is made where they apply.

- U-elastic: parts are rigid between declared hinges and seams (M-2); no elastic deflection, no vibration within a part, no stress waves. A beam's deflection is computed by the engineering layer for a design check, not simulated.
- U-thermal-expansion, U-creep, U-fatigue: temperature changes stiffness and strength only through the material tables' limits; nothing grows, creeps or fatigues.
- U-electrical-dynamics: circuits are solved quasi-statically (R-10); no inductance transients; motors have no electrical time constant.
- U-fluid: water is drag on faces and buoyancy (C-9); no flow field, no wakes, no waves made by bodies.
- U-air: air is a drag on faces at a Reynolds regime; no lift, no compressibility.
- U-wear, U-lubrication, U-backlash: bearings have a static rating and a friction torque; no wear, no film, no play in gears.
- U-sound: audio is an observation of the state, never a physical pressure field.
- U-contact-compliance: contacts are rigid with a slop (P-slop); no Hertzian compliance, no contact area beyond the manifold's points.

## 3. Anomalies (A-)

An unexplained disagreement between a prediction and a trusted observation is a persistent object: it is never
deleted, only retired with its explanation. Levels (the default hypothesis is never new physics):

- A0 numerical suspicion: seen once; may be rounding, a tolerance, a probe's own error.
- A1 reproducible simulator anomaly: reproduces on the same realisation with the same inputs.
- A2 independent realisation reproduces: a second, independent realisation of the same law shows it too (so it is not an implementation defect).
- A3 the model's own obligations are met and it still disagrees with a trusted measurement.
- A4 an independent measurement replicates the disagreement.
- A5 the competing explanations (numerical error, defect, regime, data, hidden writes, assumptions) are rejected by hostile investigation.
- A6 a candidate theory is required.

| id | level | prediction | observation | explanation | status |
|---|---|---|---|---|---|
| A-closure-drift | A1 → retired | a walker in zero gravity keeps its centre of mass (F-1.3) | it drifted; 99.98% of the drift from `closeMechanism` (position-level placement from the root, F-1.1.2) | a realisation defect: the island's drift was never undone | retired by `undoClosureDrift`; held by momentum.test.ts |
| A-floor-leak | A1 → retired | a walker on a frictionless floor keeps its horizontal centre of mass | 0.48 m in 9 s; the contact normal rows carried horizontal impulse, friction rows exactly zero | D-contact-normal: the detector's normals lean | retired for watched assemblies by `faceNormal`; held by momentum.test.ts and walker.test.ts |
| A-slider-residual | A1 | a slider's anchors stay within the residual bound | 2.33 mm, up from under 2.0 mm when the impulse pair acted at its own anchors | the common lever point (F-1.1.1) controls the relative velocity at p*, not at the anchors, so the gap closes a little less tightly; within the a dt² bound | open as D-joint-residual; the momentum-exact pair is kept, the law requires it |

## 4. Open questions (Q-)

- Q-servo: the right realisation of F-2.3.1 is known (motor, gear, rotor, current, thermal, travel); the gait that depended on the false stops must be re-derived from Froude similarity (F-5.2) and the leg's own load feedback rather than tuned to pass.
- Q-angular-damping: removing P-angular-damping needs the rotation integrator to stay stable on long thin bodies without it (an implicit or RATTLE-style angular step).
- Q-step-rate: the test rig runs at 90 Hz only; the residual-order obligations (F-3.5) are tested as a bound, not as a scaling. A rig at two rates would test the order.
- Q-gjk-tolerance: the detector's tolerance cannot be set from the bindings; whether a smaller one would remove D-contact-normal for unwatched bodies is untested.
- Q-position-energy: the position pass's effect on the energy books is bounded (it is booked where it appears) but not derived.
- Q-restitution: no low-speed restitution data for the material pairs in use.
- Q-support-stiffness: least support (R-8) assumes equal stiffness; the error for unequal supports is unbounded in the contract.

## 5. Unregistered

What the tree (`src/ganglia/tree/nodes.ts`) does not yet carry, from docs/LAW-TREE.md §K: the C-layer beyond
materials (fasteners, springs, motors, batteries, magnets, thermal, welding, water and sand), the D-layer, R-4, R-5,
R-6, R-10, the engineering formulas as nodes with two realisations, the creature and place tables, mind constants,
foresight, Jolt's remaining settings, the simulation settings as run records, fitted friction values as calibration
nodes, the estimate sentinels, and the bare constants of world.ts, rigid.ts, stand.ts and mind.ts. Each lands as it is
touched; none is cited as knowledge until it does.

## 6. Beliefs invalidated in batch 1

- Everything the stand learned before the physics stamp (`vrsb.stand` without a `physics` field): quarantined under `vrsb.stand.quarantine`, not used.
- Every report Ego filed before the stamp: evidence about an unknown physics; kept, not cited.
- "A walker on a frictionless floor moves less than 0.3 m": replaced by the F-1.3 bound (a leg's reach).
- "Energy unexplained while a hand held a part was the hand's work": removed; it is booked as made, with the hand's presence an annotation.
- "The integrator's share" as one number: replaced by lost and made, kept apart.
- Ego's own "I stilled it" and "I lifted it out": removed; a watchdog finding is evidence against an obligation node, nothing from that run counts as physics.

## 7. Revision burden

A node's revision costs what its depth and its support cost: a fitted friction value is revised by a measurement; a
law of layer 3 by evidence at A5 with every dependent claim re-run; an axiom by a demonstration that the tree built on
it predicts worse than one built without it. No empirical node is immune; none is cheap in proportion to what rests
on it. Ego wanting a design to work changes none of these costs.
