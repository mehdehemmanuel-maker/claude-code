# Nexus from reality

What must exist for Nexus to generate reality, interact with it, observe it, and express that interaction? This
document derives the answer in order: reality, state, relationships, capabilities, observer, interaction, generation,
representation. Each structure is kept only if a step cannot happen without it. Nothing is taken from the deleted
application (last whole at `792c328`), its UI, its intents, its workflows or its categories. Their failures are used
as constraints on what must never be built again.

The derivation constrains the code as it is built, and is changed by what the code finds when it runs. Section 15 is the
measured state; it is kept true at every step.

---

## 0. The four verbs

- **Generate.** Nexus produces states that obey what reality obeys.
- **Interact.** Reality's state enters Nexus, and Nexus's state reaches reality.
- **Observe.** Nexus holds what a measurement is: what it can tell, when, and at what cost.
- **Express.** What Nexus generates reaches a person's senses, and what the person does reaches Nexus.

Each verb needs structure. A structure that no verb needs does not exist.

---

## 1. Reality: what holds before anyone looks

Start with elimination, as the restart did (docs/NEXUS-RESTART.md, Part IV). An object is a connected region whose
internal couplings are strong compared with its outside ones at an observer's window. An entity is an object with a
name. A part is an object with a kind. A scene is a set of objects. None of these is needed for anything to happen;
each is a way of looking.

What cannot be removed:

| | What it is | Why nothing works without it |
|---|---|---|
| R1 | **A domain.** Coordinates along which things differ: space and time, and any other coordinate a description varies over. | Without it there is no where or when. Nothing can be local, nothing can propagate, nothing can be measured at a place. |
| R2 | **Content.** Quantities that are conserved (energy, momentum, angular momentum, charge, the counts of identities at a level of energy), distributed over the domain, and their fluxes. | Without conserved content nothing limits what can follow what. Any state could follow any other. |
| R3 | **Constitution.** How a place's content relates to its potentials and its fluxes: capacities, conductances, the thresholds where those change. This is what matter is to everything else. | Without it two places with the same content behave the same, which is false. Where possible it is derived from the level below (constituents, binding, Gibbs energy); where not, it is a measured leaf with the domain it was measured over. |
| R4 | **Law.** Each content is conserved across every boundary. Entropy produced is never negative. Influence travels at a finite speed, never faster than light. | Without these, generated states would not be states of this reality. |

That is all reality needs. Things, kinds and names come afterwards, if they are useful, as classes of what is
generated.

---

## 2. State

| | What it is | Why |
|---|---|---|
| S1 | **A binding of content over the domain, at a resolution.** No finite system holds a continuum, so every state is at some resolution, and the resolution is part of what the state is. The same reality at two resolutions is two states related by coarse-graining. | Without it there is nothing to evolve, compare or show. |
| S2 | **A resolution that varies over the domain and in time.** Refine where refining changes what is generated, coarse-grain where it does not (round 11: refine the walls, leave the sensor coarse). | One resolution everywhere is unaffordable or wrong somewhere. |
| S3 | **An origin and a status on every value:** given (by whom), measured (by what, in what window), derived (by what derivation), assumed (with grounds), or unknown. | Without it the system cannot tell what it knows from what it made up. Every failure in the deleted system's audits traces to a number, shape or decision without one. |
| S4 | **Staleness.** Each part of the state is known as of its own last step, not as of one global instant. | Regions on their own clocks (round 11) and observers with latency (round 7) make "now" local. |

So there is no scene, no document of parts and no world object. There is one binding, with origins, at a resolution
that varies.

---

## 3. Relationships

| | What it is | Why |
|---|---|---|
| Q1 | **Coupling.** Two places share a boundary variable, and conservation holds across it. Contact, conduction, matter carried across, radiation, gravity's source and the passing of information are all couplings. Each has a propagation speed and a window over which it holds. | It is the only way content moves between places. The restart's "middle space" (Part XI) is all couplings over time. |
| Q2 | **Constraint.** A relation that must hold. A law is a constraint whose origin is "law, over its domain". A measured fact is a constraint whose origin is a measurement. A person's want is a constraint whose origin is that person. | These three are one kind of thing, so they sit in one store and are solved together. **An intent is therefore not a structure.** It is the subset of constraints whose origin is a person. |
| Q3 | **Transformation.** A coupling between two contents (a conversion), balanced by the identities a level of energy keeps (round 8), at a rate set by a barrier (round 10) or a transport (round 18). | Without it, matter could never change what it is. |
| Q4 | **Arrangement.** How the places that carry a content are connected. Whether a load lies in the span of what the connections resist decides stretching or bending (round 17). | The same matter does different things in different arrangements. A rule that keys behaviour to the matter, or to a kind, gets this wrong. |
| Q5 | **Order.** An effect follows its cause by at least the distance over the coupling's speed. | Generation and interaction both have to respect it. A response that arrives before its cause could reach it is invented. |

So an element-kind enum (region, boundary, path, store, conversion, modulation, observer, bound) is not
foundational. Those are names for coupling topologies, to be computed from the graph and named afterwards if they
help.

---

## 4. Capabilities

| | What it is | Why |
|---|---|---|
| C1 | **What a configuration can make true:** the constraints it can satisfy. In practice this is its extremes: the most load it carries, the fastest it changes, the least power it needs, how many states it can tell apart. It is computed by solving, never declared. | Without it nothing can be matched to what is wanted. A declared capability ("can bear 500 N") is a default in disguise. |
| C2 | **Requirements are capabilities read backwards:** the least a configuration must be able to do for the constraints to hold. Examples: the least conductance, the least heated length, the fewest support lines. | This is how a want becomes a bound on what is generated. |
| C3 | **The person and the devices have capabilities too.** A hand pushes at most so hard, moves at most so fast and holds so still. A headset resolves so many degrees, tracks so precisely, at such a rate, with such a latency. These are measured or estimated leaves about regions of the same reality. | Without them, interaction can do what no body or device could, which is the deleted system's "creative mode" teleporting parts. |

So a tool (grab, weld, place, draw) is not a structure. What exists is a person's capability, coupled through a
device's capability, acting on the state. Nothing the person does exceeds what their body and the device can do.

---

## 5. Observer

| | What it is | Why |
|---|---|---|
| O1 | **An observer** is a region whose state becomes correlated with another's through a coupling, within a window: what it averages over, the band it answers, the least and most it can register, its resolution, its latency, and what its own probing does to what it observes (round 7). Observing takes time and costs energy; recording a bit costs at least k T ln 2 (round 18). | Without it there is no difference between what is so and what is known, and nothing can be compared. |
| O2 | **Three sorts of observer, one structure.** A realization run (Jolt, a closed form, a conduction network) observes a model, within its contract. The headset's sensors (cameras, depth, head and hand tracking) observe the real room and the person, each within its window. The person's senses observe what the headset projects. | Treating these as one structure is what lets the real room and the generated state live in one binding. |
| O3 | **Comparison.** A derived value and an observed one disagreeing beyond their combined tolerance is an anomaly located in the domain. It is the only way the language learns (restart Part V). | Without it, failure has nowhere to go but patches. |

So the real room is not a backdrop and not a "mode". It is measured reality entering the state, with origin "measured
by the headset, in its window". The floor is a measured plane with an uncertainty, not y = 0.

---

## 6. Interaction

| | What it is | Why |
|---|---|---|
| I1 | **The person is in reality:** a region with a body (mass, reach, the forces and speeds it can produce) coupled to everything around it. | A person outside reality, issuing commands, is the deleted app's user model. |
| I2 | **The person contributes in two forms, the same forms as everything else.** Boundary conditions: they push, hold or move, which is a flux or a potential applied at a place and a time, measured through a device. Constraints: they want, which is a bound on quantities over a region of the domain and a span of time, with origin "the person". | No third form is needed. |
| I3 | **How a want reaches the system is itself an observation of the person, with its own uncertainty.** Examples: a gesture marks a region of the domain; standing somewhere and saying "hold me here" gives a place and a weight; a push shows a force to resist; words describe bounds. None of these is the semantic root. Each is a measurement of what the person wants, with error, and the system shows back what it took (as constraints placed in the space) before relying on it. | The deleted system's regex intent parser made one channel of expression the root, and could not grow. |
| I4 | **Change propagates by dependency.** A new constraint or measurement makes stale exactly what depends on it (by hash), and only that is regenerated. | Without it, every touch regenerates everything (too slow), or nothing (stale downstream). |
| I5 | **The loop has a deadline set by the observer.** For an action to feel like it caused its effect, the effect must arrive within the person's window: on the order of a hundred milliseconds for cause and effect, and the display's frame time for anything tied to the head. The tuner (round 7) picks the coarsest representation that meets that deadline, region by region. | Resolution is chosen by who is looking and how fast they need it, not by an engine's fixed tick. |

So there is no intent object, no preset, no form and no tool. The person's wants are constraints they place in the
world; the room and their body are measured; their actions are measured fluxes.

---

## 7. Generation

| | What it is | Why |
|---|---|---|
| G1 | **Generating** is finding states that satisfy every constraint (the laws', the person's, the measured), by search in a configuration space, and evolving them in time. | This is the verb. |
| G2 | **Making is a trajectory.** A configuration must be reachable from the present state, and every state on the way must itself satisfy the laws: a wall must stand before a roof bears on it. So generation searches paths through states, with time as a coordinate like the others. This, and the life that follows (seasons of snow, wear, a load moved), is the fourth dimension of what is generated. | A final state with no admissible path to it cannot be made in reality. |
| G3 | **What is generated** is matter arranged in the domain with its couplings, at the resolution needed, every value with its derivation. Names (wall, roof, stud) attach afterwards as classes of what was generated, or not at all. | A generator that starts from a name is a template. |
| G4 | **What cannot be generated is a located gap.** It is a structured term: which constraint no configuration satisfies, which variable no relation binds, which stated quantity no relation reads, and where in the domain each is. | A gap written as a sentence and recognised by pattern-matching (Nexus's own `SIGNATURES`) is the regex parser again. |
| G5 | **Preferences** are constraints with an order and an origin: whose preference, and why. | A choice with no origin is a default. |

---

## 8. Representation: expressing what is generated

| | What it is | Why |
|---|---|---|
| P1 | **Expressing is projecting state into a person's senses:** a realization from the state to light, sound and force at the person. It has a contract: what the person cannot tell apart may be approximate (the eye resolves about one arcminute, and a headset display shows tens of pixels per degree at 72 to 120 frames a second). | Without a contract, the image is either wasteful or untrue, and nobody can say which. |
| P2 | **What is projected first is the state itself, in place, at full scale:** matter where it was generated, in the room where it was asked for. Quantities no sense receives (stress, heat flow, a force's path to the ground, a gap) are projected only through a declared mapping, such as stress shown as colour. The mapping is an instrument with an origin, never confused with the thing. | Otherwise the display invents what no term binds (restart, red flags). |
| P3 | **Explaining is projecting the derivation.** Why a member is the size it is: the chain of couplings from the snow to the ground, shown where each acts. | Lineage that exists only as text is not where the person is. |
| P4 | **Surfaces, panels and menus are not foundational.** If a flat surface appears, it is because projecting some content (a number, a list) onto a surface is the best channel for that content, that observer and that moment, derived case by case. It is never the frame of an application. | The deleted system's tablet, tabs and hotbar, and this session's workbench page, made the frame first and fitted reality into it. |

---

## 9. What must never be built again: the evidence

Each line is a failure recorded in docs/NEXUS-RESTART.md, docs/AUTOPSY.md or docs/NEXUS-ALIGNMENT-1.md and -2.md.
Where Nexus itself has regrown it since, that is said.

| Never | Recorded failure | Regrown in Nexus? |
|---|---|---|
| A world made of parts with kinds and params | "runtime entity without construction lineage is the normal case" | Partly: the generator's elements are kinds; members are triggered by an id prefix (`members:`) |
| A front end that classifies words into an enum | the 119-regex intent parser could not grow | **Yes:** gaps are sentences classified by regex (`SIGNATURES` in manifold.ts) |
| Generators per human kind; templates | table, shelf, ladder generators; 16 hand-written families | Partly: faces named up, side and down drive branches; a lumber catalogue decides what members can be |
| Defaults tables, places tables | "a place is a bag of numbers" | The test intents state the site's numbers by hand; acceptable only as test fixtures |
| An application frame: tablet, tabs, hotbar | the frame decided what could be done | **Yes:** this session's workbench page, now removed |
| A tool layer that writes state directly | grab, weld and place wrote the document | Not yet |
| One clock, tied to the render frame | "the render-frame tick as the clock of cognition" | No: local clocks exist (round 11) |
| TypeScript as the semantic source of truth | "while a switch can decide what exists, no invariant can hold" | **Yes:** manifold.ts is about 1,000 lines of TypeScript branches (`c.id === 'momentum'`, `face === 'side'`) deciding what is generated |
| Authored content as the system (frontier lists, asks, challenges) | "compensations for a missing generator" | The six intents are authored; they must stay instruments in tests and never become content |
| A number without an origin | 8,497 bare numbers in the deleted app | No: every leaf has an origin |

---

## 10. Where the current Nexus stands against this

**Kept, because each is one of the structures above:**

- **Values:** quantities, terms, origins and identities; evaluation as derivation; unknown as a status (S3).
- **Laws:** laws as terms with validity domains (R4, Q2).
- **Search:** configuration spaces and search under declared preferences (G1, G5).
- **Content:** carriers and the law families generated from them (R2, R4).
- **Matter:** identities, balances and phases (R3, Q3); rates over barriers and transport-limited change (Q3).
- **Scale and observation:** the scale generator; observers and the tuner (O1, I5); local clocks and refinement where the result changes (S2, S4).
- **Arrangement:** the counting of what an arrangement carries (Q4).
- **Realization:** the rigid-body kernel as a realization with a measured contract (O2).
- **Learning:** abduction and supersession on anomalies (O3).

**Must change, because each is a recorded failure regrown:**

- **The generator** (src/nexus/manifold.ts) decides structure in TypeScript branches over carrier ids, face names and
  element-id prefixes, and returns elements of a fixed set of kinds. It must become generic constraint generation over
  carriers and couplings in a domain. The element kinds become computed classes of coupling topology, if they are kept
  at all.
- **Gaps** are sentences classified by regex. They must become structured terms located in the domain (G4).
- **Regions** are named lumped boxes ("inside", "the sky") with stated quantities. They must become coarse-grainings of
  a domain at a resolution (S1, S2), with the room as measured domain (O2).
- **The `Intent` type** must dissolve into constraints with origins (Q2, I2). The authored intents remain only as test
  instruments.
- **Member sizing** is a special system triggered by an id prefix, with a building code's ratios as relations. It must
  become arrangement solving in the domain, with those ratios as constraints with their origin and domain.
- **The workbench page** (tools/workbench) is removed with this document. The published copy of it should be deleted
  too.

---

## 11. What necessarily emerges

Seven structures, each forced by a step above, and one loop over them. Between them only terms pass, never bare
numbers and never strings to be parsed.

1. **The domain, with a resolution field**, anchored to measured reality: the floor plane, the walls and the person,
   from the headset's sensors (R1, S2, O2).
2. **The state:** content bound over the domain, every value with origin, status and staleness (S1, S3, S4).
3. **The constraint store:** laws, the person's constraints, measured facts and preferences in one store,
   distinguished only by origin (Q2, G5, I2).
4. **The generator:** configurations and trajectories that satisfy the store, and located gaps where none does
   (G1–G4).
5. **Evolvers:** realizations with contracts (rigid bodies, conduction, closed forms), chosen region by region by the
   tuner against the observers' deadlines (O2, I5).
6. **Channels:** measurement (sensors to leaves) and projection (state to senses), each a realization with a window
   (O1, P1, P2).
7. **The journal:** append-only, holding every constraint added, every observation, every derivation and every
   anomaly. Regeneration by hash runs from it (I4, O3).

**The loop:**

1. Measure the room and the person.
2. Add what the person did or wants, with origin.
3. Make stale what depends on it.
4. Regenerate only that.
5. Evolve within the deadline.
6. Project to the senses.
7. Compare what was predicted with what was observed.
8. Journal everything.
9. Repeat.

What does not emerge, and so does not exist: an application, a page, a mode, a menu, a tool, a part, a kind, an
intent, a preset, a template, a scene. If one of them seems needed later, that is a sign a step above is missing.

---

## 12. The first closed loop, when building resumes

This is the smallest loop that runs through all seven structures once, the way the restart's beam ran through the
derivation once (Part XXV).

1. **Measure.** The headset gives the floor plane and the person's hands and head, each as measured leaves with the
   tracking's window.
2. **Want, by the person's own body.** The person stands where they want to be held up and says so; the place is
   measured. Their mass is a leaf they give. The constraint is: support that weight at that place, above the measured
   floor, under measured gravity.
3. **Generate.** The generic solver arranges matter, from what can be had, between that place and the floor. Its
   arrangement is counted (it must carry the load by stretching); its extents are solved; the path of making is
   admissible at every step.
4. **Evolve.** The rigid-body kernel, within its contract.
5. **Project.** At full scale, in passthrough, where it was asked for. Each piece appears in the order the path of
   making allows.
6. **Interact.** The person pushes it with their hand. The contact is measured, bounded by what a hand can do; the
   kernel responds; the response is compared with the derived one.
7. **Record.** Everything is journalled. Change the want (a heavier person, a higher place), and only what depends on
   it regenerates.

The loop passes only if:
- there is no kind, preset, default, template, menu or tool;
- no number lacks an origin;
- nothing visible is unbound by a term;
- asking why of any visible piece returns the chain down to measured and given leaves: the floor from the headset,
  the place from the person's position, the weight the person gave, the matter's measured constitution.

---

## 13. What is not known yet

- **What the Quest 3 browser can measure.** Hand and head tracking are available through WebXR; plane, mesh and depth
  detection may or may not be in the browser build at hand; no force can be sensed. What can be measured bounds what
  can be wanted by demonstration.
- **Words.** How a want stated in words becomes a constraint without a parser becoming the root. The answer sketched
  here (words as an observation of the person, shown back as placed constraints before use) is untested.
- **Compute.** How much state at what resolution a headset's processor can evolve within a frame. The tuner has to
  decide this region by region, and it has never run against a person's deadline.
- **Appearance.** What matter looks like comes from its optical constitution, which the kept data does not have.
  Appearance will start as declared estimates with origins.
- **Words for structure.** Whether the computed classes of coupling topology ever need names at all, or whether
  pointing and asking why is enough.

---

## 14. The transfer: every piece of Nexus, where it goes

Everything built so far moves into the seven structures, or is deleted. Nothing is left in between.

**What the three words mean:**
- **Move:** the algorithm is already one of the structures and keeps its code and its tests.
- **Rewrite:** what it computes is kept, but the form carries a recorded failure, so it is re-expressed.
- **Delete:** the file goes once what it held has moved; nothing of its form survives.

**When the transfer is done:** every claim in docs/NEXUS-STATE.md's "What is proven" table is proven again, by the new
structures. That includes the house's wire at 16 mm², the roof's members, the walls' two sways, the printer's heated
length and the hall's k T ln 2. A test that asserted an element's id string is rewritten to ask its question of the
terms (a coupling topology, a constraint, a located gap). Its claim is kept.

### Beneath all seven: the language of claims

| Piece | Algorithm | Disposition |
|---|---|---|
| term.ts | leaves with origin classes, applications, operators, the binder | move |
| identity.ts | content hashing, canonical form | move |
| dimension.ts, ganglia/units.ts | dimensions, units as conventions, Buckingham groups, integer null spaces | move |
| status.ts | the status lattice, the weakest input | move |
| evaluate.ts | evaluation as derivation, validity refusal, unknown kept unknown, contradiction | move |
| law.ts, book/* | laws as terms with domains and sources; apply and invert | move |
| why.ts | why, impact, stale, closure | move to the journal's queries (structure 7) |

### 1. The domain, with a resolution field

| Piece | Algorithm | Disposition |
|---|---|---|
| domain.ts | intervals, scale bands, domains, resolutions, fields, sampling, coarse-graining | move; the resolution becomes a field over the domain |
| field.ts | declared frames, gravity, ground, rigid domain | rewrite: the frame is anchored by measured leaves, gravity is a field with an origin, the ground is a measured surface |
| shape.ts | a region's box, faces, areas, least-boundary plan | rewrite: faces and areas are computed from the domain and the gravity direction, never named up, side and down; the least-boundary preference moves to structure 3 |
| scale.ts | mechanisms from dimensions, crossings, invariants, levels as gaps in times | move: it is what chooses resolution where levels part |
| clock.ts | each region's own time, steps by powers of two, refinement where the result changes | move: the time half of the resolution field |

### 2. The state

| Piece | Algorithm | Disposition |
|---|---|---|
| (new) | the binding of content over the domain; origin, status and staleness on every value | build first |
| want.ts `Region` | regions with stated quantities, carriers, properties and extents | delete as a type: its quantities become state leaves with origins, its extent a subdomain |
| matter.ts | kept matters as properties per carrier and role; choose the most or least | rewrite: constitution becomes leaves on the state; "choose the most" becomes a preference in structure 3 |
| data/* (species, life, conductors, lumber, wood, observers, materials, people) | measured and sourced leaves | move as leaves with origins: evidence and availability, never content |

### 3. The constraint store

| Piece | Algorithm | Disposition |
|---|---|---|
| carrier.ts | conserved carriers, the information carrier, law families generated per carrier, couplings between carriers, the reaction laws | move: the generators of law constraints |
| compose.ts | identities at a level, balances, blocking identities, missing species, released energy, bond enthalpies, Saha | move: transformation constraints |
| phase.ts | Gibbs energy, phase at a temperature and pressure, vapour pressure, boiling point | move: constitution relations |
| solid.ts | atoms per cell, density, binding pressure, stiffness ratio, bulk modulus | move: constitution relations |
| rate.ts | attempt rate, barrier from viscosity, change time, fitted barrier | move: transformation rates |
| transport.ts | Bessel series, the cylinder's centre, the least heated length | move: transport constraints |
| hold.ts | sphere conductance, own time, least mass to hold a temperature | move: coupling relations |
| want.ts `Want`, `Intent` | wants on regions; an intent as regions plus wants | delete as types: a want is a constraint whose origin is a person |
| size.ts constants | the deflection ratio, the strength factor, spacings, the weight at no stated place | move as constraints and availability, each with its origin and the domain it was written for |
| stock.ts | kept sections and the matters dressed to them, material leaves | move as availability |
| every preference (least boundary, least material, least conductor, fewest supports, least mass, least steel) | declared orders | move as preferences with origins |

### 4. The generator

| Piece | Algorithm | Disposition |
|---|---|---|
| solve.ts | systems of relations, propagation, free variables, contradictions, search over options | move |
| space.ts | configuration spaces, fields over free variables, derivation over a lattice | move |
| network.ts | rank, compatibility, mechanisms and self-stresses, whether bars carry a load, bar forces | move: the arrangement relation (Q4) |
| explore.ts | an experiment at the language's edge | move |
| manifold.ts | `generate`, `describe`, `lacking`, `SIGNATURES` | **delete the file.** Each rule in it is transferred, one by one, as a generic constraint generator over carriers and couplings in the domain. Examples: a held potential exchanges its carrier with every neighbour at another; a region held in place sends what it receives to a solid at rest; a conversion is bounded by the second law; a flow of matter carries what the matter holds; a threshold makes a held region; a weight at no stated place is carried at the worst place; a change carried through moving matter takes its own time; information ties to heat, barriers and light. The element kinds become computed classes of coupling topology. Gaps become structured terms located in the domain. `lacking` becomes a query over gap terms in the journal. |
| size.ts systems | the conductor system, the member system with buckling, the run network, the staged search by support lines | rewrite: their relations (a conductor's heat against its insulation, bending, deflection, buckling, the fibre pressed and bent) move as constraints; the systems triggered by id prefixes go; arranging matter becomes solving in the domain |
| attempt.ts | round 0's attempt to close a structure from laws alone | delete from the core: it moves into tests as the evidence of round 0 |

### 5. Evolvers

| Piece | Algorithm | Disposition |
|---|---|---|
| realize.ts | the rigid realization, its contract, bodies bound by terms, the still watch, time samples | move |
| realize-hinge.ts, realize-joint.ts, elastic.ts | the swing, the bolted bracket, the elastic beam and cantilever as realizations with contracts | move |
| coupling.ts | rest couplings, stability, the ledger | move |
| frame.ts | the plane frame solve; lattices; effective modulus | move the solve as a closed-form evolver; the lattices move into tests |
| tune.ts | the coarsest admitted representation, the bound on an axis, refusing a short budget, staleness by language | move: chooses evolvers and resolutions against the observers' deadlines |
| src/physics, src/engineering, src/connectors, src/parts, src/doc, src/construct | the Jolt kernel and its numerics, joint capacities, the construction gate | move as the rigid evolver's backend; the document of parts is written only by a binding, never by anything else |
| beam.ts, bracket.ts, swing.ts | the slices: an intent, its system, its construction and realization | rewrite: the systems' relations are already laws; each slice's intent becomes constraints with origins; the slice moves into tests as an instrument |
| study.ts, study-joint.ts, study-swing.ts | studies that run realizations to produce observations | move into the journal's observation path, with their cases in tests |

### 6. Channels

| Piece | Algorithm | Disposition |
|---|---|---|
| perceive.ts | senses as configurations, series received, glow, a rate met as a line or followed, a level received, an observer's push | move |
| project.ts | a scene projected from bound bodies | move: projection with a contract |
| (new) | the headset's measurement channels (head, hands, floor, and planes or mesh where the browser gives them) and its projection channels (display, audio, haptics) | build last, for the loop of section 12 |

### 7. The journal

| Piece | Algorithm | Disposition |
|---|---|---|
| observe.ts | comparisons within tolerances, the journal | move; becomes the one append-only record of constraints, observations, derivations and anomalies |
| abduce.ts | observations, groups, candidates, discrimination, validation, promotion, the learned language with supersession | move |
| failure.ts | anomalies, failures, the unplaced | move: anomaly terms |
| why.ts | lineage queries, regeneration by hash | move |

### The tests

- **Evidence:** every file in tests/nexus stays. Its claims are the transfer's acceptance criterion.
- **Instruments only:** inventions.ts, high-bar.ts and families.ts are re-expressed as sets of constraints with
  origins. They never become content.
- **Rewritten:** tests that read the generator's element ids (probe, family, size, arrangement, high-bar) are rewritten
  against the new terms, keeping each claim.

### Order

Each step runs the whole suite before the next begins, and deletes what it replaces in the same step. Nothing old and
new coexists past its step.

1. **State and journal** (structures 2 and 7). Everything writes into them.
2. **Domain and resolution** (structure 1), anchored by measured leaves; faces computed from gravity, not named.
3. **Constraint store** (structure 3). The test intents become constraint sets with origins; `Intent`, `Want` and
   `Region` are deleted.
4. **Generator** (structure 4). The rules of manifold.ts are transferred one by one, with gaps as located terms; the
   file is deleted when its last rule has moved and the rewritten tests pass. The size systems dissolve into
   arrangement solving.
5. **Evolvers and tuner** (structure 5) under one form: a realization with a contract, chosen against deadlines.
6. **Channels** (structure 6). Then the headset, for the loop of section 12.

If a step finds that one of the seven structures is wrong, that structure is deleted and derived again before the next
step, however much is built on it.

---

## 15. The measured state

The question was what has been implemented, as opposed to written down. A capability counts as implemented only
when a runtime can execute it.

**How it was measured.** The whole suite was run under V8 coverage (`vitest --coverage.provider=v8` over `src/`).

**The finding.** 1,421 of Nexus's 1,460 functions execute. But all of them execute only when a test calls them, with
inputs the test writes, starting from nothing and ending when the test ends. Nexus has no entry point (`index.ts` only
re-exports), no process that runs, no state that persists, and no input from anything outside a test. It has no output
to any person.

So the code is real and it executes, but the system the derivation describes does not yet exist anywhere. The state
of each part, by what can actually run:

### Executes, as library code exercised by the suite

These compute real results from real inputs, within tests:

- **Values and laws:** quantities with dimensions, terms with origins and identity, evaluation as derivation records,
  unknown kept unknown, validity refused with its domain; the kept laws as terms with their examples reproduced.
- **Matter and change:** carriers and the law families they generate; balances of identities, blocking identities,
  bond enthalpies, phases by Gibbs energy, crystal density and stiffness; rates over barriers; the transport law.
- **Search and arrangement:** constraint systems solved by propagation, free variables and contradictions reported,
  search over options under preferences; configuration spaces derived over a lattice; the counting of an arrangement
  (mechanisms, self-stresses, whether bars carry a load) and the plane frame solve.
- **Scale and time:** the scale generator (mechanisms, crossings, levels); local clocks advancing heat networks, with
  refinement where the result changes.
- **The rule-based generator** (manifold.ts) over authored intents. This is the part the derivation says must be
  replaced.

### Runs as a process (since step 1)

- **The runtime** (src/nexus/runtime.ts, journal.ts, sink-file.ts, main.ts). `npm run nexus -- <journal.jsonl>`
  starts a Node process. It opens on a journal file and rebuilds the state from it, checking each term read back
  against its identity. It admits contributions (given or measured leaves, kept laws put to work at addresses, wants
  as bounds, withdrawals) from the text channel. It evaluates again only what reads what changed, and reports every
  gap as a structured term at an address.
- **Places in the domain** (src/nexus/place.ts). A place is a box: its centre, its turn and its half-extents, every
  number a leaf, in a domain whose gravity is a measured vector. For every place alike, the runtime generates its
  volume, its extent along gravity, its mass and weight once its matter's density is known, and the section across
  each of its axes with that section's second moment and modulus about the line gravity bends it around. On edge, a
  38 by 184 board's section has exactly what the kept rectangle laws give; turned flat, its modulus falls by 184 over
  38. Nothing names a breadth or a depth. A member along gravity is refused bending, with the reason.
- **Stopped and started again, it is the same state.** Every binding has the same identity, and only the dependents
  of a later change are evaluated (tests/nexus/runtime.test.ts, and run by hand twice on one journal file).

### Partial runtime capability

These run a realization over time, but only for configurations a test builds by hand:

- **The rigid-body kernel (Jolt).** It realizes hand-built slices (a beam on two supports, a swinging bar, a bolted
  bracket, a cantilever) with measured contracts. Its observations are compared with derivations.
- **Learning.** Abduction promotes and supersedes relations from those observations, in an in-memory journal that
  lives for one test.
- **The tuner.** It chooses the swing's representation and refuses a short budget.
- **Lineage.** WHY and IMPACT walk any derivation to its leaves; staleness by hash is computed, but nothing acts on it.

### Exists only mathematically

These compute a number about something that nothing runs:

- **The information ties.** No bits are erased, held or sent anywhere.
- **The printer's heated length.** No stream is heated.
- **The least warm body.** No body is held.
- **What a sense receives.** No sense receives anything.
- **The house.** Its members are sized, its walls counted as a mechanism, its bracing found, but none of it is ever
  realized in the kernel or anywhere else.
- **The scale levels and observer windows.** Computed for matters, never applied to a running representation except
  the swing.

### Exists only as architecture

These are in this document and nowhere in code:

- **The seven structures as structures:** one state binding with staleness; one constraint store with wants as
  constraints; the domain with a resolution field; evolvers chosen against observers' deadlines; measurement and
  projection channels.
- **The one loop**, and the persistent append-only journal.
- **Generation of trajectories** (paths of making).
- **Gaps as located terms.**
- **The person in reality, and interaction.**

### Completely absent

- **Continuous time in the running process.** The runtime propagates; nothing in it evolves yet.
- **Measurement from reality:** no sensor. The text channel takes what a person types, as given or measured leaves
  with their origins.
- **Projection:** no image, sound or text output from a running system (the workbench page was removed).
- **The Quest runtime.** It has been absent since the restart.
- **Generated structure realized in physics.**
- **Growth, containment** (one region inside another), and **the cost per bit of a realization.**

### What follows from it

The implementation has to become the system, not more library code:

1. A runtime that executes outside tests.
2. State that persists.
3. A journal it resumes from.
4. A loop that regenerates by dependency.

That is step 1 of section 14, and it starts now. Each later step is counted done only when the runtime executes it.

---

## 16. Step 1, executed: what running it found

The runtime was run as a process: contributions in, stopped, started again on the same journal, changed. Running it
found three things no test had shown.

1. **Every relation had to be wired by hand.** To get a shelf's weight, the person had to say which kept law applies,
   at which address, and which address is the breadth and which the depth. An address is an opaque string, so the
   state holds nothing that could say which law applies where: the meaning of a quantity was in the wiring, outside
   the state. This is the derivation's R1 and S1 failing in practice. Without a domain, a quantity has no place and no
   direction, and generation (G1) cannot even begin.

   **Rederived for step 2.** An address must be a place in the domain together with the quantity's geometric
   relation to it: an extent along a direction, a potential at a point, a flux across a face, a content within a
   subdomain. Directions are known against the measured gravity and the domain's own coordinates. A law's ports must
   state what relation they need (this length is an extent along the load; that one across it), so that the generator
   instances a law wherever the state makes its ports bindable, and nowhere else. Breadth and depth are then
   different because their directions differ, never because of their names.
2. **A derived value was shown with the class of its weakest input** (a weight shown as "given"), which hid that a law
   derived it. The projection now says "derived by `weight.per-length`, resting on given".
3. **WHY cited a law by its hash**, because nothing indexed the kept laws by identity. `lawByHash` now does, and WHY
   names the law, its formula and its source.

Step 2 starts from point 1.

---

## 17. Step 2, executed: what running it found

A board was placed under measured gravity, given its matter's density, and later turned flat, in two runs of the
process on one journal.

1. **One change re-evaluated its dependents more than once.** Turning the board changed two of its turn's numbers,
   and every relation reading the turn was evaluated once for each. The loop now settles in order of distance from
   the leaves, each reached relation once per change: turning the board evaluates exactly the seven relations that
   read its turn.
2. **A contribution whose origin changed re-derives everything under it, even where the values are equal.** The
   board turned flat was given with new grounds, so every number of it has a new identity, and all thirteen relations
   over it were evaluated again. That is right: what it rests on changed. It is noted because a channel that restates
   unchanged numbers with new grounds costs evaluation.
3. **Nothing says where the board rests.** The board has a volume, a weight and a stiffness for every section, but no
   coupling to anything. So nothing can tell which section carries the load, what the reactions are, what bending
   moment the weight makes, or whether it holds. This is Q1, couplings, absent from the runtime.

   **Rederived.** Couplings must be generated from geometry, as the places' own quantities are. Where two places touch
   (a face of one against a face of the other within a tolerance), a contact forms: a shared face with its area and
   normal. Momentum crosses it: a place's weight goes down its contacts to what bears it, and what bears it is a place
   too (the floor, measured by the headset; a support; another board). The reactions, the moment along a place
   between its contacts and the stress in its section then follow by kept laws, with no beam template. The order of
   section 14 changes accordingly: couplings come before the constraint store's dissolution of `Intent`, because
   running the system shows them to be the next thing that stops it.

Step 3 is couplings between places.
