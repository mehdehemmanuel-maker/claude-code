# The law tree: the skeleton of Ego's physical reasoning

2 October 2026. Development paused. This restores the recursive law tree as the authoritative structure, and states exactly how Ego reasons through it, how claims attach to it, and how the code becomes its realisation rather than its substitute. Nothing here is coded yet; §L says how it will be.

The governing statement, which everything below serves:

- Ego may generate hypotheses freely.
- Ego may derive physical claims only through the law graph.
- Ego may not create or modify physics to make a hypothesis succeed.
- A physically asserted conclusion C is knowledge only if Roots ⊢ C through an explicit, valid derivation graph. If Roots ⊬ C, then C is a hypothesis, unknown, unsupported, not modelled, or fiction, and is stored and spoken as such.

## A. The recursive law-tree architecture, restored

The tree is the generalisation order: each node is a specialisation of its parent under added assumptions. Depth is unbounded; a decimal adds a level. The dependency graph (§G) is a different object laid over the same nodes: a claim may hang from several branches at once.

**Layer 0 — Axioms and model assumptions (roots).**
- A-1 Port structure: elements (stores, dissipators, sources, transformers, gyrators) interconnected only through ports by power-conserving junctions; constraints are workless junctions; sensors and controllers are elements with ports.
- A-2 Symmetry: equivariance under E(3) × time translation × unit rescaling.
- A-3 Passivity of constitutive response: ⟨λ, v⟩ ≤ 0 with maximum dissipation within the admissible set at the current state; convex potentials as the standard form, rate-dependent sets admitted. (Restated from the second audit, which had it too strong.)
- A-4 Realisation fidelity: exact where an exact discrete analogue exists, bounded elsewhere with the bound stated; every constant of a declared kind; faster-than-step modes resolved or implicit-and-declared; cost bounded.
- A-5 Empirical grounding and realisability: every constitutive number sourced or labelled an estimate; every structure makeable.
- M-1..M-5: classical Euclidean space with one clock and a ground frame; rigid bodies; uniform gravity (an environment parameter E-g); impenetrable solids; discrete finite computation.

**Layer 1 — Meta-laws** (what a valid lower law may be): ML-1 exchange antisymmetry (the cut law); ML-2 covariance and dimensional homogeneity; ML-3 passivity by composition; ML-4 admissibility and closure, T(A) ⊆ A; ML-5 realisation law; ML-6 grounding and realisability; ML-7 causal information.

**Layer 2 — Fundamental structures**: FS-1 state S = D × Q × V × X; FS-2 the Hamiltonian; FS-3 the constraint set and admissible set A; FS-4 dissipation potentials; FS-5 ports and sources; FS-6 the symmetry group.

**Layer 3 — Fundamental laws**, each with its descendants (numbering continues from the first audit, so citations stay stable):
- F-1 Conservation (momentum, angular momentum, energy) → F-1.1 pair interactions on one line → F-1.1.1 discrete impulse pair about one point; F-1.1.2 position corrections momentum-free; F-1.2 joint load is the flux across a cut; F-1.3 the centre-of-mass theorem.
- F-2 Energy balance and passivity → F-2.1 closed-system conservation; F-2.2 finite sources; F-2.3 element laws (store, dissipator, transformer, gyrator, junction) → F-2.3.1 the servo as motor + gear + controller; F-2.4 impacts (energetic restitution); F-2.5 heat; F-2.6 discrete passivity → F-2.6.1 the ΔK identity, F-2.6.2 the exit condition g ≤ 0, F-2.6.3 theorem A, F-2.6.4 the KKT leak.
- F-3 Admissible evolution (Gauss, Moreau) → F-3.1 bilateral constraints workless, residual bounded; F-3.2 unilateral complementarity; F-3.3 projection shrinks the kinetic metric; F-3.4 hardware limits are geometry, commands live inside them; F-3.5 discrete obligations (residual order, transport resolution).
- F-4 Maximum dissipation → F-4.1 Coulomb friction; F-4.2 plastic hinge; F-4.3 the stuck magnet's wrench set (M5); F-4.4 eddy drag (M4); F-4.5 fluid drag; F-4.6 inelastic impact.
- F-5 Covariance and similarity → F-5.1 the Π theorem; F-5.2 Froude (gait, waves); F-5.3 Strouhal (swimming, flapping); F-5.4 Reynolds (drag regimes); F-5.5 magnetic Reynolds (eddy validity); F-5.6 the realisation groups ω dt, v dt/ℓ.
- F-6 Causal information → F-6.1 sensor elements (encoder, current, load, inertial, eye); F-6.2 line of sight (straight rays); F-6.3 controller as a dynamical element with latency.

**Layer 4 — Sub-laws and constitutive models** (form from above, numbers from data nodes): C-1 materials (ρ, E, σ_y, μ pairs, k, c); C-2 fasteners and joints (NDS yield modes, VDI 2230, weld throat); C-3 springs, ropes, bands; C-4 motors (gyrator with k, R, L, J, gear ratio and efficiency); C-5 batteries (OCV(SOC), R_int, rate capacity); C-6 magnets (Gilbert model M1, Br by grade, temperature coefficient) and M2 (conservative pull); C-7 thermal (conduction, radiation, Blok partition, Taylor–Quinney); C-8 welding; C-9 water and sand; C-10 demography (a stochastic layer, no physics claim); C-11 servo control law and spec.

**Layer 5 — Domain laws**: D-1 walkers (Froude gait, friction-limited propulsion); D-2 swimmers (Strouhal, face-area drag); D-3 magnets in use (M3 integration, M5 statics, M6 latch); D-4 electric drives (R10's circuit solve); D-5 structures (beams, buckling, support sharing); D-6 places (slopes, dunes, water).

**Layer 6 — Numerical realisations** R-1..R-11 (row solver, position pass and closure, Jolt, substep law, multirate magnets, latch, implicit midpoint, least support, ledger, inertia handling, tick budget), each carrying its obligations and error contract.

**Layer 7 — Observations**: a run record (document hash, settings, versions, seed, obligations' outcomes, instruments' extremes) and the instruments themselves (per-row work, loads, residuals, ledger terms).

**Layer 8 — Derived claims**: what Ego asserts, each with DERIVED_FROM edges into layers 0–7.

Constants are nodes too: every number in a realisation is a node of kind numerical parameter (with its contract), environment parameter (E-g), datum (sourced), or labelled estimate. There is no fifth kind, and a bare number in physics code is a lint failure once §L is done.

## B. The exact role of the tree in Ego's reasoning

Ego does not consult the engine. Ego consults the tree, and the engine is one of the tree's leaves: a realisation whose output enters a derivation only as an observation node that carries its obligations' record. Three consequences follow.

1. A simulated result is never a reason on its own. If Ego says "the table holds", the certificate names C-1 (fir), C-2 (NDS screw capacity), F-1.2 (the joint's load as the branch's flux), F-3.1 (the joint held), F-4.2 (no yield), R-1 and R-2 with their obligations met, and the run. The run supplies the numbers; the laws supply the reason.
2. An observation the tree cannot derive is a first-class state: UNEXPLAINED OBSERVATION. It is not knowledge; it is the start of either a debugging traversal (a realisation broke an obligation) or a proposal (the tree is incomplete here, §J). The frictionless walker's 30 cm is exactly this: the engine produced it, F-1.3 forbids it, so the tree overrules the engine and sends the investigation to R-2.
3. Ego's own physical vocabulary is the tree's. Every physical word Ego uses (holds, carries, stalls, overheats, slips) is the name of a node's prediction, with that node's level and error attached (the language rules of the third audit bind to nodes, not to prose).

## C. Imagination versus derivation

Imagination produces hypotheses: any arrangement, topology, controller, effect combination or parameter choice, including ones the tree cannot currently handle. The hypothesis space is untyped and unlimited; Ego needs no permission to form one. A hypothesis is a node in the HYPOTHESIS namespace with no DERIVED_FROM edges yet.

Derivation is the attempt to connect it: the system asks, for hypothesis H, whether Roots ⊢ H through the current tree.
- YES: the derivation graph is built, its obligations checked, its envelopes checked, its data classes collected; H becomes a claim at the computed validity and evidence levels.
- PARTIALLY: the graph is built as far as it goes and the missing branch is named: a law node with no realisation for this case; a datum absent; an envelope exceeded on one branch; a NOT MODELLED phenomenon on the path. H stays a hypothesis with a precise gap.
- NO: H is classified as HYPOTHESIS (no path yet, nothing forbids it), NOT MODELLED (the path needs a phenomenon the tree lacks), OUTSIDE VALIDITY DOMAIN, INSUFFICIENT DATA, FICTIONAL ASSUMPTION (a parent is a fiction), or PHYSICALLY INADMISSIBLE (a parent law forbids it).

The invariant: no step of this process may add, remove or edit a node. Ego has no API to write the tree; she has one to propose (§J). "I need this to be true" is never a derivation step. The difference between imagination and derivation is therefore not a difference of permission but of edges: imagination makes nodes with no parents; derivation gives them parents or refuses.

## D. The derivation certificate

Every presented conclusion can carry one. Its structure:

```
Certificate {
  claim: { subject, quantity, relation, value, unit }
  graph: ordered list of steps, each { node id, version, role: law | datum | model | realisation | observation | assumption,
          inputs used, output produced, domain check: inside | outside(distance) | extrapolated,
          error contract instance: bound at these values, kind }
  roots reached: [axiom ids, data ids, assumption ids, model-limit ids]
  obligations: for every realisation on the path, its O(R) outcome for the runs used
  assumptions: [ids]            // frozen parts, boundary conditions, user assumptions
  notModelled: [phenomena]      // filtered to those that could affect the claim
  provenance: data classes on the path, with the weakest influential one
  sensitivity: { input: contribution }   // interval propagation, see the third audit §H
  validity: V0..V6; evidence: E0..E5; claim level: L1..L3
  stops: where WHY terminates (axioms, measured data, specifications, declared assumptions, model limits)
}
```

The motor example, with node ids:

CLAIM: shaft reaches 2 400 rpm within 0.8 s.
- D-bat (battery specification: OCV(SOC), R_int, rate capacity; class: manufacturer specification) → F-2.2 (finite source; terminal voltage under load) → available V, I.
- D-motor (k, R, L; class: specification) → F-2.3 gyrator (τ = k i, e = k ω) → C-4 torque–speed line at the available V.
- C-4 gear (ratio N, efficiency η; class: specification) → F-2.3 transformer → torque and speed at the output.
- D-rotor (J_m; class: specification or estimate from size, which this certificate names) × N² + load inertia from geometry and C-1 density → F-1 (Euler's equations about the axis).
- F-4.5 drag (coefficient: estimate) and C-2 bearing friction (datum) → dissipators on the shaft.
- F-2 energy balance → equation of motion; R-9 ledger closes with the residual's gains and losses under bound.
- R-1 and R-3 realisations with obligations met; R-4 substep law satisfied (ω dt ≤ c for the shaft); R-11 cost within budget.
- Envelopes: motor current below its limit (inside), winding temperature within C-7's data (inside), SOC inside, ω below no-load speed (inside).
- Error contracts: ledger residual < 1% of battery work; integrator energy error O(dt).
- NOT MODELLED: winding inductance transient under 10 ms (if L is omitted), bearing wear, battery temperature.
- Sensitivity: rotor J (estimate) contributes 30% of the time-to-speed margin → influential → claim level L3, naming J.
- Validity V3, evidence E2: "In the model, the shaft reaches 2 400 rpm in 0.8 s (±0.2 s, driven by the rotor inertia estimate); inputs from datasheets; this motor–load pair unmeasured."

WHY(C) walks this graph upward until every branch ends at an axiom, a measured datum, a specification, a declared assumption or a model limit. It may not end at "the code says so": R-nodes are steps with obligations, never roots.

## E. World construction traverses the tree downward

"Build a small electric vehicle."
1. Intent → semantic requirements: a mass range, a speed, a range, a rider, a terrain; dimensionless targets where they exist (a cornering Froude number, a grade).
2. Requirements → geometry and components: a frame, wheels, a motor, a pack, a controller, brakes, as blocks with ports (the ganglia's element graph).
3. Branches activated: F-2.2, F-2.3 (drive), F-1 and F-3 (contacts, wheels), F-4.1 (tyre friction), F-4.5 (drag), F-2.5 (winding heat), C-1, C-2, C-4, C-5, C-7, D-4, D-5; realisations R-1, R-3, R-4, R-9.
4. Required data: every datum the activated branches need is listed with its class; missing data become INSUFFICIENT DATA before any design is drawn.
5. Derived constraints, from the laws alone, before simulation: friction-limited acceleration μg; wheelie limit from the centre-of-mass height; current-limited torque; range from capacity at the drawn current; frame member sizes from loads and C-1 with the safety-factor principle.
6. Valid design space: the intersection of those constraints as intervals over the design parameters; empty means the requirements are inconsistent, and the certificate says which constraint closed it.
7. Candidate design: a point in that space chosen by the designer's objectives (least mass, least cost), with its own certificate at V1 (dimensionally consistent, passive element graph, realisable graph).
8. Simulation: a run record; obligations checked; envelopes watched.
9. Validation: the certificate completed with observations; V2 or V3; evidence E2; the NOT MODELLED list; the sentence Ego may say.

Every step cites nodes; the design never contains a number that lacks one.

## F. Debugging traverses it upward

"The vehicle accelerated unexpectedly."
1. The state transition: kinetic energy rose by ΔK over ticks t₁..t₂ (R-9).
2. Energy branch: F-2 requires ΔH ≤ Σ port work; the ledger shows port work (battery, hands) smaller than ΔK.
3. Passivity violated: ML-3; the violation is not in the laws (they forbid it) but in a realisation's obligation.
4. Candidates by obligation: R-1 exit condition (F-2.6.2: was g ≤ 0 on every solve? read `warmKept`, `leak`); R-2 (F-1.1.2: did closure move momentum?); R-3 (Jolt-side restitution with several frictional contacts, F-2.4); R-6 (a latch release's hand-back beyond M5's set).
5. The instruments point to the row or step: per-row work names a row with λ w⁺ > 0 or a solve that fell back; or the ledger's gains accumulate exactly where closure acted.
6. The fault is located at one realisation node; the fix is to that node's obligation; the property test for that node is the one that prevents recurrence; every belief downstream of runs on the old version is invalidated by §H.

Construction and debugging are the same graph read in opposite directions; the node reached in step 6 is the node that was activated in E-3.

## G. How stored beliefs attach to law nodes

A belief is a derived claim stored with its certificate. Attachment is mandatory: `DERIVED_FROM` is a list of (node id, node version) pairs covering every law, datum, model, realisation, run and assumption on its derivation graph. A belief with an empty or unresolvable DERIVED_FROM is an orphan and cannot be classified as physical knowledge; the store refuses it or files it as HYPOTHESIS.

The belief's variables map to node variables (a joint load belief names the F-1.2 instance for that joint; a temperature belief names the C-7 instance and the R-9 heat partition's contract). Its domain is the intersection of the envelopes of the nodes it used, at the values it used. Its namespace is decided by the roots it reaches (a world record on the path can lift it to WORLD; a self-calibration or run-only path keeps it MODEL; a fiction keeps it FICTION).

Today's stores (the stand's margins, the gait tables, the capability claims) have no DERIVED_FROM and are orphans by this rule. That is the formal reason they are discarded rather than repaired.

## H. How belief invalidation propagates through the graph

Every node carries a version (a content hash). A change event names the node, the new version, and the change kind: defect (an obligation was found violated over a version range), precision (a bounded numerical improvement), data (a datum's value or class changed), extension (a new child; no existing claim affected), limit (an envelope narrowed).

Propagation runs over the dependency graph, not the tree, because a belief can hang from several branches:
1. Collect every run whose `used` edges include the changed node within the affected version range and whose configuration matches the change's scope (the defect node states its scope: "mechanisms closed from a root"; "any free rotation over 1 s").
2. Every belief observed-in or derived-from those runs, and every belief derived from those beliefs, transitively, is marked: INVALIDATED for a defect; STALE for precision or data; REQUIRES_REVALIDATION when its run record is reproducible; VALID when the change is off its path, below its error bound, or recorded as non-influential by its sensitivity within a V2-validated model.
3. Designs and skills that cite affected beliefs are flagged; presentations that quoted them are flagged by belief id.
4. Reproducible runs are re-run; a new belief supersedes the old with a diff that names the change node as the cause.
5. Nothing is deleted; history is kept; Ego reports the diffs to the user for her own designs.

The example from the request: B-142 "this gait is stable" depends on S-4 (servo model), C-12 (friction), C-28 (controller), G-9 (geometry), E-1 (gravity), N-7 (solver realisation). N-7 is found to violate momentum conservation (a defect on R-2): B-142 → INVALIDATED automatically, with the defect id, and so is every design that cites it and every lesson built from it. That is the whole purpose of attachment.

## I. Novel inventions as new paths through existing laws

An invention is a derivation graph whose node set is drawn from the existing tree but whose configuration (the document D and the controller) has never been derived before. The novelty lies in which branches meet in one claim and how, not in any node being new. Formally: Roots ⊢ C with a graph G(C) such that no stored certificate has the same meeting of branches under the same configuration class. The frontier's challenges and the ganglia's "ways" already search this space symbolically (which flows, which blocks); the tree makes the search honest by charging each path with the data, envelopes and obligations it needs.

The novelty test of the third audit (§K) is the filter: a path that only exists because an obligation failed, an envelope was left, an approximation was depended upon, or a controller read what no sensor gave is not a new path through the laws; it is a path through a hole in the realisation. The two worked examples below show both sides.

## J. Proposing a genuinely new law node

Ego may say: "the current tree is incomplete for this phenomenon," and attach a proposal node (namespace HYPOTHESIS, kind proposed-law) with no authority. The proposal then passes a process Ego cannot run alone:

1. Define the phenomenon: variables, units, where it is observed.
2. Show the tree cannot derive it: the derivation attempt and the exact missing branch.
3. Propose the mathematical relation.
4. State its assumptions and which model assumptions it changes.
5. Identify empirical evidence: sources, measurements, their classes.
6. Show consistency with its parents: it must sit under an existing node or under a new child of an axiom, and must not contradict a sibling in their shared domain.
7. Check conservation, passivity and causality: it must be an element of A-1's kinds, satisfy A-3 (or declare the sense in which it does), and obey ML-7.
8. Check dimensional consistency (ML-2).
9. Search for contradictions against existing claims in the overlap of domains.
10. Establish its validity domain and exit condition.
11. Add a numerical realisation with its obligations and error contract.
12. Add property tests over random inputs.
13. Mark its status: PROPOSED → PROVISIONAL (tests pass; evidence E2 or below; usable only in claims that name it as provisional) → ESTABLISHED (evidence E3 or above). A human approves each transition; Ego proposes, never installs.

Until a proposal is PROVISIONAL, no authoritative claim may have it as a parent. If a hypothesis needs it, the hypothesis waits.

## K. Every current physics path that bypasses the tree

| # | Path | Where | What it bypasses | What it becomes |
|---|---|---|---|---|
| 1 | Ego writes poses (still, lift from floor) | ego.ts selfFix, guarded actions | ML-4, F-1 | removed; fault containment is a kernel node R-fault with run invalidation |
| 2 | Watchdog findings acted on as corrections | ego.ts ↔ watchdog | the tree's monopoly on consequences | watchdog emits evidence against obligation nodes only |
| 3 | Driven-body exemption | drivenBodies, watchdog `driven` | F-2's energy assertion | removed |
| 4 | Stand-learned margins, joint upgrades, aprons | StandMemory (`vrsb.stand`) | orphan beliefs promoted to design rules | discarded; any future learning is a MODEL node with DERIVED_FROM |
| 5 | Design heuristics as bare numbers | fixes.ts MARGIN, PROOF, PUSH, JOINT_LIMIT; designer.ts stock choices | provenance | DESIGN nodes citing a source or labelled estimate |
| 6 | The servo's 6 Hz floor, 0.1° band, no rotor, no current, no heat | registry.ts, servoLoop, servoRow | F-2.3.1 | derived from F-2.3 with C-4 data; the floor removed |
| 7 | Stops at the command's range | registry.ts servo limits | F-3.4 | travel from hardware; swing as a command |
| 8 | MASS_RATIO routing | world.ts | ML-5 (a convergence criterion) | a realisation parameter node with a contract, or a criterion |
| 9 | Heat partition weights; Blok's share | shareHeat, heatShare | C-7's domain | a realisation node with an estimate contract; temperatures L3 |
| 10 | Equal-stiffness support split | leastSupport | D-5 | a realisation node with a contract naming the assumption |
| 11 | Angular damping | world.ts, Jolt body settings | F-2.1 | a realisation parameter with a contract, scheduled for removal under F-3 × F-2.1 |
| 12 | Restitution floor | MIN_IMPACT_FOR_RESTITUTION | F-2.4 | a derived criterion or an energetic model |
| 13 | Earth-gravity fallbacks | magnetPairs, particles, foresight default | E-g | the environment node everywhere |
| 14 | Every other bare constant in world.ts, rigid.ts, stand.ts, mind.ts | SLOP, MAX_CORRECTION, SEATED, JOINT_DRIFT, STOP_*, LATCH_*, MAGNET_*, EDDY_*, SEAT_ANGLE, SUBSTEP_OMEGA_DT, MAX_SUBSTEPS, BOND_*_STEPS, LATCH_VELOCITY_STEPS, NEAR_YOU, ARRIVE, THINK, fov, sight, urge rates | the constant law | numerical-parameter or estimate nodes with contracts; dimensionless forms where ML-2 requires |
| 15 | Engineering formulas not registered as nodes | engineering/beams, bolts, welding, springs, gears, thermal, magnets (M1–M6), eddy, fracture, wood, threads, mechanics, dcmotor, battery | the tree as the single authority: the ganglia's closed-form laws and the world's physics are today two authorities for the same quantities | each formula a C- or D-node; the world and the ganglia both realise the same node (`realisedBy` with two entries), tested to agree |
| 16 | Creature and place tables | WALKERS, SWIMMERS, GAITS, MICRO_SERVO, PLACES | provenance (Hildebrand's gaits and Bascom's slopes are sourced; the rest are my numbers) | DESIGN and data nodes with classes; the tuned gait discarded |
| 17 | Mind constants and inputs | mind.ts, herd.ts | F-6 (true state as input), ML-2 (dimensional thresholds) | sensor nodes; controller nodes with sourced or labelled constants |
| 18 | Foresight statics | foresight.ts | registration (it is a realisation of F-1.2 with C-2 capacities, unlisted) | a realisation node with its contract (rigid, static) |
| 19 | Challenge and frontier verdicts | challenges.ts, frontier.ts | levels (a 'works' is V1 at most) | DESIGN/HYPOTHESIS nodes carrying V and E |
| 20 | Jolt's own settings | velocity and position steps, bond and latch overrides, CCD | realisation parameters unlisted | R-3's parameter nodes with contracts |
| 21 | Simulation settings | sim (gravity, airDrag, magnetLatch, maxMagnetRings) | run records | environment and realisation parameter nodes captured in every run record |
| 22 | Fitted friction values | materials.ts | the calibration rule | calibration nodes with reference and fit range |
| 23 | Estimates behind sentinels | motors rotor default, estimatedThermal, servo rotor 0 | provenance | explicit estimate nodes; NONE instead of 0 |
| 24 | Test tolerances set to current output | walker 0.3 m, JOINT_DRIFT, SEATED, stand limits | the calibration rule (developer loop) | each test cites the node whose contract bounds it |
| 25 | Rendering as physics | particles' gravity; audio's clamped ring frequency | observation discipline | observation nodes that read E-g and the state, never set anything |
| 26 | Capability claims | understand.ts ("walkers: built") | levels | claims with V and E |

## L. Making the tree executable

1. **Schema.** A `Node` type with: id, kind (axiom, model-assumption, meta-law, structure, law, constitutive, domain, realisation, parameter, datum, estimate, environment, observation, claim, proposal), parents, children, dependsOn, mathematicalForm (text + a checkable form where closed), variables with units and dimensions, assumptions, validityDomain (named ranges, dimensionless where possible) with exitCondition, derivationMethod, invariants, requiredData (datum kinds), errorContract (the ten fields), proofStatus (axiom, proved, tested, provisional, proposed), realisedBy (module and exported symbol), propertyTests (file and name), dependentClaims (filled at runtime), version (content hash), status.
2. **Registry.** `src/ganglia/tree/` with one file per layer; the existing `laws.ts` entries become law nodes (their `eval`, `outside`, `example`, `source` map onto the schema; `implementedIn` becomes `realisedBy`); the magnet contracts M1–M6, the engineering modules and the world's realisations get nodes; constants are declared through a helper `constant(id, value, kind, contract)` so that a bare numeric `const` in `src/physics`, `src/world`, `src/connectors` fails a lint.
3. **Registry tests.** The graph is acyclic; every non-root has a parent; every `realisedBy` symbol exists (dynamic import); every property test exists (scan); every node with a domain has an exit condition; every constant in physics is a node; every datum has a class and a source or label; every law with `eval` has `outside`.
4. **Claims from the kernel.** The four instruments (joint loads, the ledger, residuals, solver exits) return `Claim` objects with DERIVED_FROM filled from the realisation and the laws it serves; `foresee` and the stand return certificates, not booleans.
5. **WHY(C).** A traversal that renders the certificate and stops only at roots; the tablet's "why" and Ego's explanations call it.
6. **Belief store v2.** Keyed by node versions; the loader quarantines anything without them; the stand's memory, if any learning is kept, becomes MODEL nodes with run records.
7. **Invalidation job.** Change events → propagation → statuses → re-runs → diffs → Ego's report.
8. **Language binding.** Ego's renderer takes level and evidence from the certificate; the vocabulary table is data.

Order: 1–3 first (the tree exists and is checked), then 4–5 (claims and WHY), then 6–7 (beliefs and invalidation), then 8. Development on the physics firewalls resumes only under 1–3, so that every fix lands as a node with its tests, and no new constant can enter without a kind.

## M. Worked example: an invention derived from roots to prediction

Hypothesis (Ego's): "a drawer that closes softly with no damper, by a magnet on the drawer passing a copper plate on the cabinet."

Derivation attempt, downward:
- A-1, A-3 → ML-3: the element graph: gravity and the hand are sources; the eddy current in copper is a dissipator (F-4.4, D ⪰ 0); the drawer is a store. Passive, closed. V0.
- A-2 → ML-2: all quantities in relative pose; dimensionally checked. V1.
- C-6 (M1 Gilbert model) with D-magnet (N42 disc 20 × 5 mm, Br from grade: specification) → the field along the slide.
- F-4.4 / M4 with C-1 (copper σ 58 MS/m: handbook) → the drag matrix D(x) along the stroke; Levin's thin-tube formula as the golden check (E3 for the model class on the pipe test).
- F-1, F-3.1 (the slide as a prismatic constraint; its friction F-4.1 with μ from C-1: calibrated, flagged) → equation of motion along the stroke.
- F-2 → the ledger: the hand's push work minus eddy heat minus friction heat equals the drawer's kinetic energy; the drawer's closing speed falls as D grows near the plate.
- Envelopes: magnetic Reynolds μ₀σuℓ with u ≈ 0.5 m/s, ℓ ≈ 20 mm: 1.5 × 10⁻³, inside (the currents' own field negligible). Copper's conductivity at room temperature: inside. The drawer's slide is steel: **the eddy model takes the magnet's free-space field near steel, which understates the drag (M4's stated limit): exit condition BOUND_ONLY on the steel branch**, so the prediction is a lower bound on the damping where the plate is near the steel slide, unless the copper plate is mounted clear of it (a design change the certificate suggests).
- Realisations: R-5 multirate magnets, R-4 substeps, R-1 and R-3 with obligations met, R-9 closing with gains and losses under 1% of the hand's work.
- Observation: the run; the drawer's speed profile; a closing time of 0.9 s from 0.5 m/s, with the last 30 mm at under 0.1 m/s.
- Certificate: V3 (converged under dt/2 and passes × 2), E2 (model class validated on a pipe, this configuration unmeasured), L3 on the steel branch (bound only), L2 with the plate mounted 30 mm clear of the steel. NOT MODELLED: the magnet's own eddy damping (declared negligible, 1.6 s⁻¹), wear of the slide, temperature rise of the plate (computed: negligible, 0.02 K per close). Sensitivity: copper thickness (influential: drag ∝ thickness to the skin depth), magnet grade (influential), friction μ (influential near the end of travel: calibrated value flagged).
- What Ego may say: "In the model, a 20 × 5 mm N42 disc passing a 3 mm copper plate mounted clear of the steel slide brings the drawer from 0.5 m/s to under 0.1 m/s over the last 30 mm; the model's drag was checked against Levin's formula to 4%; the slide's friction value is a calibration and sets when the drawer stops; nothing here has been built."

The invention is a new path: C-6 and F-4.4 (magnets and eddy currents, previously used for a magnet falling down a pipe) meet F-3.1 (a prismatic slide) and F-2 (the hand as source) in a configuration no certificate held before. No node was added.

## N. Worked example: an impossible invention, stopped by the graph

Hypothesis (Ego's): "a sealed box that creeps across a smooth floor by swinging a mass inside it in a cycle, so it needs no wheels and nothing touches the outside."

Derivation attempt:
- A-1 → ML-1 → F-1 → F-1.3: the box, the mass and their joint form a closed system except for the floor's contact. The floor's rows are normal rows (vertical) and friction rows bounded by μλ_n. With μ = 0 (the smooth floor as stated), the only external impulses are vertical. The horizontal momentum of the system is therefore constant; it starts at zero; the centre of mass cannot move horizontally. The claim "creeps" asserts a change of the centre of mass's horizontal velocity with no external horizontal impulse: Roots ⊬ C, because a parent (F-1.3) forbids it. Classification: PHYSICALLY INADMISSIBLE, with the node named.
- The graph stops here, before any simulation. This matters, because the current realisation R-2 has a suspected position-level momentum leak (the frictionless walker moved 30 cm), so a simulation might have shown the box creeping. The tree overrules the engine: an observation contradicting F-1.3 is an UNEXPLAINED OBSERVATION pointing at a realisation defect, never a confirmation.
- Ego's permitted redesign: with μ > 0 the floor can supply horizontal impulse, and the box can creep by asymmetric friction (a stick-slip crawler); that hypothesis derives (F-4.1 with a rate-dependent set under the restated A-3, F-1.3 with the floor as the external port) and goes to simulation with a certificate, and with the friction value's calibration flagged.

A second, cruder case for completeness: "a flywheel cart whose wheels re-spin the flywheel through a gear so it never slows." ML-3 at V0: the element graph has stores (flywheel, cart), transformers (gears), dissipators (bearings, rolling resistance) and no source; Ḣ ≤ 0; the claim "never slows" asserts Ḣ ≥ 0 with no port. PHYSICALLY INADMISSIBLE at the concept level; no geometry is ever drawn.

Development stays paused.
