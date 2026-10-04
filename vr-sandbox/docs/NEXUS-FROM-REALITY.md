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
  volume, its extent along gravity, its mass and weight once its matter's density is known, and the area of the
  section across each of its axes. Where gravity has a part across a section, and only there, it also generates that
  section's second moment and modulus about the line gravity bends it around. On edge, a 38 by 184 board's section
  has exactly what the kept rectangle laws give; turned flat, its modulus falls by 184 over 38. Nothing names a
  breadth or a depth.
- **Couplings between places** (src/nexus/contact.ts, since step 3). Contacts form where faces touch. A place's weight
  and what rests on it go down its contacts to what is held:
  - on one contact, the place stays only if its load falls within the patch;
  - on two, they share by moments, and neither may pull;
  - on more, the split is a located gap (stiffness);
  - on none, the place is not borne.

  A place bends under every force on it, each spread over its interval of the line it bends along (since step 4),
  and its stress follows by the kept law. Whether each place is at rest is derived, down to what is held, and
  whatever takes a place to be at rest is refused when it is not. A predicate that a known part decides is decided
  without the unknown parts. The structure is re-decided from the values on every change, before anything is
  settled.
- **Gaps that say what they bear on** (since step 3). Each gap reaches the constraints that read its address. The
  text channel shows first those that bear on a want or on the domain's requirements, and says when a want names an
  address nothing holds or derives. WHY is shown as the graph a derivation is.
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

- **The rest of the seven structures:**
  - the domain's resolution field;
  - evolvers chosen against observers' deadlines;
  - measurement channels from instruments;
  - projection channels other than text.

  The state's bindings, the one loop, the persistent journal, gaps as located terms, and wants and the domain's
  requirements as constraints in one store all run since steps 1 to 3. `Intent`, `Want` and `Region` still exist
  beside the store.
- **Generation of trajectories** (paths of making).
- **The person in reality, and interaction.**

### Completely absent

- **Continuous time in the state.** The evolver (since step 5) runs the kernel from the state's places until still
  and returns where they came to rest; the state holds configurations at rest, not the path between them.
- **Measurement from reality:** no sensor. The text channel takes what a person types, as given or measured leaves
  with their origins.
- **Projection** other than text lines: no image or sound from a running system (the workbench page was removed).
- **The Quest runtime.** It has been absent since the restart.
- **Generated structure realized in physics** beyond places as boxes: the evolver realizes boxes and their matter, not
  joints, fasteners or anything that bends.
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

---

## 18. Step 3, executed: what running it found

**What was built.** Couplings between places are generated from geometry in the running state
(src/nexus/contact.ts):

- **Contacts.** Where a face of one place faces a face of another, with their planes within the contact tolerance (an
  assumed 1 mm leaf), their in-plane axes aligned, and an overlap greater than zero, a contact forms. It has an area
  and a point.
- **The load path.** A place's weight, with everything borne on it, goes down its contacts to what is held at rest
  from outside the domain. How it is shared follows from how many contacts there are:
  - **One contact** bears all of it, and the place stays only if its load falls within the patch.
  - **Two contacts** share it by moments. Neither may pull.
  - **More than two** is a located gap: the split needs stiffness, which is not generated.
  - **None** is a located gap: the place is not borne.
- **Bending.** A place on two contacts bends under its own weight. The largest moment is at zero shear or over a
  contact. Its stress follows by the kept `stress.bending`, over the section that spans between the contacts.

All of this is re-decided from the values whenever they change. No beam, support, floor or shelf is named anywhere.

**The scene, as run.** The scene ran in the process through the text channel, on one journal across two runs:
- the floor held by what the headset measured;
- two fir blocks on it;
- a 1 m board, 38 by 184, on edge across them, with 0.8 m between the contacts.

| Quantity | Value | Check |
|---|---|---|
| Share each block bears | 18.17 N | — |
| Moment in the board | 2.726 N·m | the kept `SELF_MOMENT` for L 0.8, Lt 1, a 0 |
| Stress in the board | 12.7 kPa | a want of at most 42.5 MPa is met |

When block B was moved to −0.2 m:
- B's share rises to 72.7 N;
- A's share becomes −36.3 N;
- "a board presses on block A, never pulls" is unmet, located at that contact.

**What running it found.** Six things that no test had shown.

1. **Vacuous refusals.** Every place generated a bending section across each of its axes, and refused the ones along
   gravity. So every place in the room carried refusals that meant nothing. A generic rule must be instanced only
   where it applies, decided from the present values, as contacts are. Sections are now generated only where gravity
   has a part across them, and a turn re-decides which.
2. **Gaps without weight.** The floor's unknown density was listed beside the board's, though nothing anyone wants
   and nothing the domain requires waits on it. A gap now has what it bears on: the constraints reached by following
   what reads its address (`Runtime.bearing`). The channel orders gaps as follows:
   1. constraints unmet;
   2. constraints undecided;
   3. disagreements with the evidence;
   4. each lack that bears on a constraint, with what it bears on.

   The rest are counted by place, and listed only when all are asked for.
3. **Structure decided after propagation.** Turning the board evaluated the two sections the turn was removing,
   before removing them: 7 evaluations, 2 of them through structure that no longer existed. Structure is now decided
   first, from the leaves as they stand, and then everything the change reaches is settled once: 5 evaluations.
4. **An address nothing could ever bind.** A want typed at an address no relation derives waited forever, and looked
   exactly like a want waiting on a value still on its way. The state now knows whether anything holds or derives an
   address (`Runtime.derives`). The channel says so, and shows what that place does hold in the unit the want reads.
   Where a relation waits on such an address, it needs a reading or a given value.
5. **A configuration that cannot be at rest was derived as if it were.** With the board tipping off block A, its
   moment (8.9 N·m) and stress (41.5 kPa) were still derived. A person's want on that stress read as met. Block A's
   load (46.8 N) was its weight less a pull. Statics derives values only of a place at rest. So every derivation that
   takes a place to be at rest now carries rest as its domain:
   - the load a place bears down holds only where what rests on it presses on it;
   - a place's bending holds only where its weight falls between its contacts.

   Tipped, these are refused with the reason, and the person's want is undecided, never met. The share itself stays
   unconditioned, so the check that fails is located at the contact where it fails.
6. **WHY printed as a tree.** About 60 lines for one stress, with every shared leaf repeated under each contact point.
   A derivation is a graph. WHY now shows each shared part once, then refers back to it.

**What it still lacks.** These are in the order running shows they stop it:

- **Bending from what rests on a place** is a located gap. The moment is derived only for a place's own weight between
  two contacts. That is a special case of one rule: the moment along a place under every force on it. Those forces
  are its weight spread along its extent, the point loads of what rests on it at their contacts, and the reactions.
  The largest moment is where the shear crosses zero, or over a contact. That rule replaces the own-weight case
  rather than adding a second one.
- **What happens to a place that cannot stay** is unanswered. Statics now says that the tipped board cannot stay, but
  not where it goes. That needs time: an evolver realizing the generated structure, which the measured state lists as
  absent.
- **More than two contacts** need stiffness, which nothing generates yet.

Step 4 is the general moment, replacing the own-weight special case. An evolver over generated structure follows it,
for what statics refuses.

---

## 19. Step 4, executed: what running it found

**What was built.** The moment along a place is now one rule, `largestMoment` in src/nexus/contact.ts. Every force
on a place is spread evenly over an interval of the line it bends along:
- its weight over its own extent;
- each contact's share over that contact's patch, the shares from what rests on it and the reactions alike.

With every force spread, the shear is continuous and piecewise linear, so the moment at any station is exact for
every arrangement. Its largest value is at an interval's end, or where the shear crosses zero just past one. Every
station tried is a real station of the place, so the largest found is never more than the true largest, and the true
one is among them.

On two contacts, the place bends along the level line between them. Levers are measured across gravity, so contacts
at different heights share by their level distance. On one contact, it bends along each of the contact's in-plane
axes. The own-weight formula and the gap for "bending from what rests on it" are deleted: both are cases of the one
rule.

The evidence is the kept laws:
- the board alone gives the kept `SELF_MOMENT` exactly, as before;
- a fir block resting on the middle of the board gives the kept `PATCH_MOMENT` for its 100 mm patch plus
  `SELF_MOMENT`, to nine places.

**The scene, as run.** A block was set on the board, moved over one end, and then the board was tipped, in the
process on one journal.

| Configuration | Moment in the board |
|---|---|
| Block centred | 4.675 N·m |
| Block over the end | 2.472 N·m |
| Board tipped | refused |

When tipped, the person's want on the board's stress is undecided, and the block on the board is not at rest either.

**What running it found.**

1. **Building a term cost its size times its depth.** Each operator hashed the canonical form of its whole subtree
   when it was made. The first general moment inlined every force's interval into every candidate station: one block
   took over 100 s. Two changes fixed it, both structural:
   - **Each force's interval along the line is a derived quantity at its own address** ("a board/the share through
     a board on block A, spread along the line between its contacts: from"). The moment reads only forces and
     intervals, and WHY names each interval.
   - **A term's identity is computed when it is first read,** not when it is built.

   The scene went from 100 s to 1.7 s, with byte-identical output, and replay still checks every term's identity.
   Hashing remains the largest cost.
2. **Rest flowed down but not up.** When the board tipped, its bending was refused, but the block resting on it still
   had its bending derived as at rest. A place is at rest only while its contacts hold it and what bears it is at
   rest, down to what is held. That is now a derived quantity of every place ("at rest on what bears it"), and a held
   place's rest is a given whose origin is who holds it. Whatever a place derives as at rest carries its rest as its
   domain. On the tipped board, the block is not at rest, and its bending is refused with the reason.
3. **A decision waited on what could not change it.** The board's rest waited on block B's unknown density, although
   its own pull on block A already decides that it is not at rest. A predicate that one known part decides is now
   decided: false and anything is false, true or anything is true. The decided result rests only on the inputs that
   decided it. The runtime tries such a decision before it reports a wait. What a gap bears on stops at readers
   already decided without it, so block B's unknown matter no longer reads as bearing on the board's stress.
4. **Two different parts printed as the same line.** Both contacts' points read "contact point y = 0.4 m". A derived
   value is now named by its address, so WHY says where each value is. Parts reached again are named together on one
   line, so every other line of a WHY is a different part.

**What it still lacks.** In the order running shows they stop it:

- **What moves.** The state now says exactly which places are not at rest, and why. It cannot say where they go.
  That needs time: an evolver realizing the generated structure, with the places not at rest as its input and the
  state's places as its output. This is the next step.
- **A place on more than two contacts** needs the contacts' stiffness.
- **Forces off the bending line** twist a place (torsion), which nothing generates.
- **Pressure under a patch** is taken as even. A stiff block on a flexible board presses harder at its edges.

Step 5 is an evolver over generated structure, starting with the places the state says are not at rest.

---

## 20. Step 5, executed: what running it found

**What was built.** An evolver over the state's generated structure (src/nexus/evolve.ts), on the kept rigid-body
kernel and its measured contract:
- every place not held is given to the kernel as the state has it: its box, its turn, and the mass its matter's
  density gives;
- what is held becomes the kernel's environment;
- the kernel steps them until still for the observer's quiet time, within its patience;
- where each place came to rest is returned to the state as a place **measured** by the kernel, with the run's window
  and the kernel's position resolution;
- a place still where the state has it, within that resolution, is not returned;
- a rigid place keeps its extents: the same leaves, so nothing that reads only them is evaluated again.

The kernel needs a surface between places (how they slide and bounce), which the state does not hold. The evolver's
contract declares the one it assumes for every pair, and says whose assumption it is. A place whose matter is unknown
is not realized: the evolution is refused, with the reason.

The text channel takes `{"evolve": true}`. The process loads the kernel the first time something is evolved, and
handles lines strictly in order. What the kernel returned is in the journal, so reopening it gives the same state
without the kernel.

**The scene, as run.**

| Configuration | What happened in the kernel |
|---|---|
| At rest | 0.42 s to still; nothing moved beyond 2 mm, and nothing was returned |
| Block B moved so the board pulls on block A | statics named the board, and only the board, as not at rest |
| Then evolved | 1.22 s to still; the board moved 113 mm and turned 38° |

The tipped board came to rest lower, as a released body must; the test checks that potential energy fell. It leans
with one end on the floor and its underside on an edge of block B. The whole run takes 1.6 s in the process.

**What running it found.**

1. **The state cannot hold what the kernel found.** The board's measured place is in the state, but what bears it is
   a gap: the board touches block B along an edge and the floor at a corner. The contact generator knows only faces
   lying flat on faces, turned alike. So the loop is open at exactly the point the derivation predicts. The kernel can
   move what statics refuses, but statics cannot read back what it moved to.
2. **Contacts on a slope need more than vertical shares.** Where the board leans, the contacts push across its face,
   not straight up. Holding it there takes friction at one contact at least. Shares along gravity alone cannot express
   that: the forces through a contact have a normal part and a part along the surface, and a place's balance has
   three force and three moment components. A place leaning on two contacts has more unknown forces than balance
   gives (the ladder's indeterminacy), unless friction at one of them is at its limit or the stiffnesses are known.
3. **The kernel's alignment and the generator's differ.** The generator demands faces turned alike within one part in
   a million, a bare number. The kernel comes to rest only within its own resolution, so even a place that lands flat
   is tilted by more than that.

**Rederived.** A contact is where the surfaces of two places meet, whatever touches: a face against a face, an edge
against a face, or a corner against a face. The contact set is a point, a segment, or a polygon: the touching
feature of one place, clipped to the face of the other, with that face's normal. The forces through it are a normal
push of at least zero and a friction within the friction cone. A place's balance is the full six components. Where
that leaves the forces undetermined, the gap is located and says what would settle it: friction at its limit, or the
contacts' stiffness. The tolerance for "touching" and "aligned" is the kernel's resolution where the place came from
the kernel, and the measurement's where it came from a person or the headset: an origin's resolution, never a bare
number.

Step 6 is contacts of any feature against a face, with vector forces and the full balance of a place.

---

## 21. Step 6, executed: what running it found

**What was built.**
- **Contacts of any feature.** A contact is where the surfaces of two places meet, whatever touches (src/nexus/contact.ts):
  - the separating face is the one of the twelve along whose normal the two are farthest apart;
  - they touch when that distance is within what the two places' origins resolve;
  - the other place's corners within that distance of the face are the feature that touches (one, two or four), clipped to the face.

  The clipping structure (which corners stay, which edges cross which sides) is decided from the values. The clipped points, the centroid, the normal and the area are terms of both places' numbers.
- **Level places.** A place on level contacts under loads along gravity keeps the model it had, with no friction, and every earlier number comes out unchanged.
- **Sloped places.** Forces through a contact are a push along its normal and a friction along its surface:
  - **one contact:** both are determined;
  - **two contacts in one upright plane:** balance gives three conditions on four forces, so one force is free. Whether the place can stay is still decided exactly: some value of the free force must push at both contacts and keep each friction within its coefficient times its push.

**The scene, as run.** The kernel's leaning board is now read back by the state:
- it is borne by an edge of block B, with its normal tilted 38°, and by an edge on the floor;
- whether it can stay waits on the two coefficients of friction, the data the state lacks, at the contacts that lack it;
- with the friction the kernel's contract assumed (0.48), statics agrees that it can stay;
- with a tenth of that, no sharing holds it.

**What the mathematics found.** These are kept as results: every later run must reproduce them.

1. **Staying, under a balance that leaves one force free, is decidable exactly.** Each condition is linear in the free
   force s: a + b s ≥ 0. The set is satisfiable exactly when every bound from below lies under every bound from above,
   and every condition free of s holds (Fourier–Motzkin elimination: for b_j > 0 > b_k, a_j(−b_k) + a_k b_j ≥ 0). That
   is a finite conjunction of predicates over the contacts' numbers, so it is a term, with WHY to the leaves. The
   forces themselves stay undetermined, and that is located as its own gap: the split depends on the contacts'
   stiffness.
2. **A contact is a convex clipping, and its structure is a decision on values.** The separating face plus
   Sutherland–Hodgman clipping of the touching feature gives the contact polygon, segment or point. Each clipped point
   is a corner of the feature or an edge's crossing of a side, a term whose shape is fixed by the decision. For aligned
   faces it is exactly the overlap rectangle of the earlier model.
3. **A term is a graph, and every operation on it must cost the graph, not the tree.** Hashing, evaluation and
   collecting variables walked terms as trees. The friction condition reads the load vector dozens of times, and one
   scene took 41 s. Identity is now the hash of a node's operator and its children's identities, over the canonical
   order (commutative arguments by content, variables numbered by first appearance). Evaluation and variable
   collection are memoized per node, and FNV-1a is computed in 16-bit limbs (the same 64-bit value, checked on 2,005
   strings and the published vector). The scene now runs in 6 s.
4. **Tests on unturned places cannot see a turned bug.** The rewrite read each place's axes transposed. Every test
   passed, because every place in them was unturned. Only the kernel's turned board exposed it. Places in tests must be
   turned.

**What it still lacks.**
- **Whether what bears a sloped place is at rest.** Block B, which the board leans on, takes a load that depends on
  the board's undetermined split. Its rest is undecided, so the board's rest, which needs B's, is undecided too, even
  with the friction given. The free force's feasible range is an interval: carried down, it gives B's loads as
  intervals, and B is at rest if it holds over the whole interval.
- **Contacts edge on edge** (no face separates the places) and **contacts whose normal lies across gravity** (a place
  against a wall) are not generated.
- **Bending on sloped contacts** is a located gap.

**How the next rounds run.** Not from a hand-written scene or a template intent. Each round generates its targets
internally and at random, from the manifold's own quantities, with the bar set high: advanced builds and generation
at biological level. The round runs from an empty journal, so everything it needs is derived again. What breaks is
classified, the general distinction is promoted, and the findings above, with every earlier one, are checked again.

---

## 22. Drawn round 1: intents the manifold draws for itself

**The method.** A round no longer starts from a scene or an invention a person wrote down (src/nexus/draw.ts,
src/nexus/round.ts; `npm run nexus:round -- <seed> <count> <bar>`).
- **The draw.** Each intent is composed at random from the manifold's own vocabulary:
  - the carriers physics conserves;
  - the roles a region can take: a person's region, a reservoir that holds a potential, a limit on what it gives;
  - the forms a want can take: hold a band, deliver on demand, reach a content by the end, stay within a bound, hear
    within a lag, grow.
- **Magnitudes.** Every magnitude is drawn from what the kept laws cover in its dimension (their worked examples,
  their domain bounds, the kept matters' properties), widened by the bar: two decades either side in this round. A
  band is a part in ten to a part in a million of its value. A growth is ten to a million times what the region
  starts with.
- **Seeds.** The draw is seeded, so a round runs again exactly.
- **From nothing.** Each intent is generated with nothing kept from the one before, and a crash counts as a finding
  like any gap.

**Round 1 (seed 1, 200 intents, 1.1 s).**

| | before the round's fixes | after |
|---|---|---|
| intents that crashed the generator | 5 | 0 |
| grow wants answered by any element | 0 of 97 | 97 of 97 |
| reach wants answered | 11 of 64 | 56 of 64 |
| lawful refusals against what a reservoir gives | 0 | 11 |

**What it found, and the rules it promoted.**

1. **A generated region taken for one the intent states.** A rule looked up the limit of a power source among the
   intent's regions. The source was a region the generator had made (a moving region's power is the store it
   carries), and the lookup crashed. A region the language generates states nothing of its own, so limits are now read
   only from regions that state them.
2. **A content reached by the end was read by no rule, for any carrier.** The round found this for charge, energy and
   matter alike. The rule is conservation over time: a region's content changes only by what crosses its boundary and
   what is made in it, so there are two ways and no third.
   - **Brought in:** a path from a reservoir of the carrier, at least (Q − Q₀)/T on average. A reservoir that gives
     less refuses it lawfully.
   - **Made inside**, for a matter. A matter is conserved only where it does not react: to grow, it is made, and
     what is conserved then is what it is made of. Made in proportion to what is already there, as a matter that
     makes more of itself is, it grows as Q₀·2^(t/τ). So it doubles at least every τ = T / log₂(Q/Q₀), and its rate of
     making at the end is at least Q ln 2 / τ.

     This is the first structure at biological level. What remains open is located at it: what the matter is made
     of, so what supply its making draws on, what its making takes in energy, and what makes it in proportion to
     itself.

**What the round ranks next.** The ranking itself still classifies by regular expressions over gap sentences, a
failure section 10 named. It has to become structured.
- **A reservoir's limit no rule checked: 134 of 200 intents.** A stated limit is compared only by a few rules, not by
  every path that draws on it.
- **The kept data does not state it:** 122 intents.
- **Where a region is, so how far apart its parts are, is not said:** 70. A drawn region has no extent, and the
  generator does not choose one.
- **How cold the sky is, for heat given away as light:** 38.

## 23. The scale tuner: regimes derived, not listed

Scale is a change of generative regime, not a change of magnification. `src/nexus/tuner.ts` derives what a world must
be at a size and a temperature from the constants alone (G, the electric coupling k_C e², ħ, c, the electron's and the
nucleon's masses, and k_B T where a temperature is given). It works in five steps, each a derivation with its record.

1. **Axes.** The rank of the constants' dimension matrix says how many scale directions they leave free. With ħ, c
   and k_B, length, time, energy, frequency, temperature and mass are one axis: time is one face of it, not a
   coordinate of its own. With G as well, none is free, and the units the constants set by themselves are Planck's
   (CODATA 2018 to four figures).
2. **Energies a size has.** An agent combined with what its dimension needs gives E(L) = M/L^n. The agents are a
   coupling, the action, the heat, light's speed, and a binding found below. Each energy is of one particle, of one
   unit in a body, or of a whole body, and energies are compared only when they are of the same thing.
3. **Where they meet.** Two energies with one dependence on size have a ratio that no change of scale alters: a
   coupling strength. Two with different dependences cross at a size, and what wins on each side says what that size
   is. It is where things settle, where an attraction holds things within, where confinement exceeds rest energy, or
   where gravity exceeds binding. A crossing counts as a boundary only where both energies are of one unit at that
   size. ħc/L is a unit's motion only within its Compton length, and ħ²/(mL²) only outside it. Without that filter
   the ladder listed false analogies, such as an atom's gravity in a body "beating" the energy of light at 294 m.
4. **Recursion.** What settles is a structure. Its size, binding, mass and density become new quantities, and the
   ladder derives again with them. It stops by itself at the first level that settles nothing new (`closed`); no
   depth is given.
5. **A copy at another scale** (`copyAt`). With ħ and c held, since they are what length is measured in, each energy
   form M/L^n of a world scaled by s needs M × s^(n−1). That is a linear system in the exponents of the constants'
   factors.

**What it reproduces, never given:**
- α = 7.2974 × 10⁻³; the Bohr radius, 5.29177 × 10⁻¹¹ m; the Hartree, 27.211 eV; the reduced Compton length,
  3.8616 × 10⁻¹³ m; the classical electron radius, 2.8179 × 10⁻¹⁵ m; the vacuum Bjerrum length at 300 K, 5.57 × 10⁻⁸ m.
- Only one structure settles from the constants and survives the cosmic background's heat.
- The size where gravity crushes that matter, 5.92 × 10⁷ m (Jupiter's radius is 7.15 × 10⁷ m).
- The size where such a body holds itself together at 300 K, 1.83 × 10⁶ m (the Moon's is 1.74 × 10⁶ m).
- Collapse within its own gravitational radius at 3.47 × 10¹¹ m.
- The free-fall time 1/√(Gρ), the same at every size.

**What temperature does to time.** Temperature moves only the thermal clocks: ħ/kT goes as T⁻¹, and a thermal
crossing as T^−½. Every other clock has exponent 0. Above E_b/k (3.16 × 10⁵ K), what changes is the regime, since
structures dissolve, not the clocks. Nothing here hard-codes "colder is slower" or "smaller is faster": each clock's
exponent is measured by deriving again at 2T.

**As above, so below.** `copyAt` answers exactly what a copy of the world at s times the size needs. It needs
gravitation × s², every mass × s⁻¹ and the heat × s⁻¹, with the electric coupling as it is. Every clock in the copy
then runs at s times ours, so a copy at 10⁻⁴⁰ of the size lives its whole history in 10⁻⁴⁰ of the time. That is the
true form of the intuition: the dimensionless numbers (α, G m²/ħc, the mass ratios) are what a copy must share, so a
copy is a rescaling of everything together, never of one thing. With the constants as measured, the world at another
size is not a copy. It lies past every boundary between the two sizes, and `copyAt` lists them: 8 between 10⁻¹⁴ m and
10²⁶ m. The constants do not guarantee self-similarity. They are what breaks it, and they fix the sizes where the
regimes change.

**In the generator.**
- The regime at an intent's smallest and largest sizes is derived. A gap is left, with its kind, where the regime its
  rules assume does not hold: no structure settles (data), particles are made (law), states are discrete (variable),
  gravity crushes the matter (relationship), or the body collapses (law). Below the length the constants set by
  themselves, no kept law holds (law).
- The draw now draws a size over everything the tuner reaches.
- The channel takes `{"scale": {"at": m, "T": K}}` and prints the state, what acts, the clocks with their temperature
  exponents, the nearby boundaries, the structures, and what resolving the size costs an observer. Light that
  resolves an atom's size breaks it.

**Located lacks.**
- Degeneracy: confinement among neighbours goes as n^(2/3), and integer powers cannot form it (an operator).
- The strong interaction, so no nucleus.
- A plasma's density, so above about 3 × 10⁵ K there are no bodies.
- The order-one factors the dimensions cannot see. The settled binding is the Hartree, where hydrogen's ionization
  energy is half of it. Where an energy enters an exponent (Boltzmann, Saha), that factor matters by e^(ΔE/kT). Fixing
  it needs the eigenvalue problem, an operator the language lacks.

## 24. Depth: as far down as the question goes

Water showed the requirement (sections 9 and 10, rounds 8 to 12): its boiling, its viscosity and its density each
needed a different depth. `src/nexus/depth.ts` makes depth a property of every descent, for any phenomenon. It is not
a list of layers and not a count of them. A level is whatever is there:
- what the tuner's ladder settles;
- each particle, held together by its rest energy;
- the floor, the length the constants set by themselves;
- where a matter is named, its own levels from the kept species, by the laws that read them: a crystal's cohesion and
  lattice (`solid.ts`), a liquid's crossing to its vapour (`phase.ts`), and a molecule's weakest bond (`compose.ts`).

**A process** (heat, a potential across a size, a motion, over a duration) goes down through every level it takes
apart or resolves. It stops at the first level it leaves whole to within the tolerance asked, which is a want's own
band where there is one. That level enters as a unit, and nothing below it can change the outcome by more than the
tolerance. So sufficiency is shown, not assumed.

**Time decides as much as energy.**
- Under heat, a level's unit lasts τ = (h/kT) e^(E_b/kT). It is attempted at the thermal rate and succeeds by the
  Boltzmann factor (Eyring, `rate.ts`).
- A process takes apart no more than the share of lifetimes its duration covers, 1 − e^(−D/τ).
- A process faster than a level's own clock ħ/E_b resolves its inside even where it breaks none of it.
- The settled level lasts 10^−3.0 s at 12 000 K and re-forms. At 300 K it lasts 10^444 s. Water's molecule
  lasts 10^47.5 s at 400 K, and 10^−10.1 s at 6000 K.

**Each share is its law's.**
- A liquid's arrangement is apart where its vapour has the lesser Gibbs energy. Water at one bar is whole at 300 K, and
  at 400 K it is followed down to its molecule, which stays whole.
- A pair among units at a known density is apart by Saha's balance, so the thinner the matter, the more of it at one
  heat.
- A potential across a size gives a charge between the field across one unit and the whole drop. Where the binding
  lies between the two, how far a charge moves freely decides it. That is a datum of the matter's state, and the gap
  says so (data).
- A motion at or past light's speed is refused.
- Past every level, the gap is in the laws. Inside the smallest unit, it is in the primitives: the particles' masses
  are measured, never derived.

**A quantity** is explained at the level whose size, mass and binding set its scale. That is the one product of their
powers, with e and k_B where the dimension needs them, that has the quantity's dimension. Within a decade (a stated
assumption: the factors the dimensions cannot see), it is explained there with that level's lineage. Off at every
level, the gap is located between the level that comes closest and the phenomenon, with how many decades and in which
direction.

| Ask | Where the descent stops |
|---|---|
| Iron's density | explained at its crystal (0.00 decades) |
| Steel's modulus | explained at the iron crystal (0.54) |
| Steel's yield strength | 2.4 decades below what the crystal's binding sets, so something above the crystal and below the body sets it |
| A dense solid's density, its matter unnamed | explained at the settled level |
| A wood's or a cork's density | 1.2 to 1.7 decades below the settled level: how much of the space it fills, a level the ladder does not hold |
| Every kept material's strength | 4 to 7.6 decades below the settled level |
| Water's boiling point | 1.2 decades below E_vap/k: the room the vapour gains, which `phase.ts` derives and the scale alone cannot see |

**In the generator.** Every temperature, potential and speed an intent's reservoirs hold or its wants ask for is
followed down, lasting the intent's duration, at its smallest size. Each gap carries its kind (data, resolution,
relationship, variable, operator, law, primitive), and the ranking reads that kind rather than regular expressions.
This is the start of the structured gaps section 22 asked for.

Round 3 (seed 2001, 300 intents, 6.1 s) ranks what depth finds:
- **Inside the particles the ladder starts from** (primitive): 37 intents.
- **How far a charge moves freely** (data): 52 intents. This includes the house, the car and the printer, each of
  which holds a potential past what binds the settled level.
- **A process reaches past every level** (law).
- **A process takes apart a level the rules read as whole** (variable).

The channel takes `{"depth": …}`, `{"explain": …}` and `{"copy": …}`.

**Located lacks.**
- A molecule's own size is not in the species, so no scale that needs it is set there.
- The share heat takes apart is the Boltzmann factor where no law states it. That ignores the room the freed parts gain
  (Saha's balance needs a density), so water's molecules at 6000 K come out mostly whole.
- What a motion gives a unit is for a stop at contact. A body moving through nothing changes nothing, and the sound
  speed that decides a shock is not yet read.
