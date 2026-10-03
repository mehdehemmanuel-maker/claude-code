# The Substrate: reality indexed as an alien engineer would

Ganglia's substrate (`src/ganglia/substrate/`) is the layer under the manifold language. Where the manifold language
answers *a contract* (store X J, release Y W, mass under M) by refinement through levels, the substrate answers *what
exists, what it can do, what it is made of, what makes it, what it fails by, what it is like, and what is still
unknown*. It is built as an index, not as a list: an entity is of several kinds at once, every arrow is one of a fixed
set of relations with an inverse, and every question of the final test is answered by walking the arrows.

The objective it was built to was: **make the database capable of never needing to be finished.** So every entity
carries how much of it is known, every unknown is a queued question, and the queue outlives any round of population.

## Architecture

```
src/ganglia/substrate/
  model.ts        kinds (30), relations (25, each with its inverse), provenance, coverage, facets, NAMED_AS
  substrate.ts    the typed graph: add (merge; a stub never overwrites), relate (reflexive refused except reproduced-by),
                  reach / traverse / outOf / into, dangling, repair (stub what the bridge named), census
  dsl.ts          Pack: e() / link() / each() / deep() for writing seed packs; est(), param()
  bridge.ts       reads the structured sources already in Ganglia: LAWS, MATERIALS, ARCHETYPES, CATALOG, WAYS,
                  PROCESSES, PART_KINDS, CONNECTOR_KINDS, MANIFOLDS, SERVOS, MOTORS, GEARHEADS, BATTERIES
  seeds/          mechanical, electrical, circuits, computing, materials, manufacturing, biology, chemistry, earth, robotics
  population.ts   Queue (priority, dedupe, serialize/restore), priority(), expanders (seed, rule, external), ingest()
                  with validation, promoteManifolds(), buildGenerators(), missingConstructors(), ask(), populate()
  queries.ts      the traversals: waysToStore, implementations, materialsForRole, variants, decompose/leavesOf,
                  producers, analogues, dualRole, lineage, mechanismsFor, constructionPath, index
  index.ts        build(): bridge → ingest packs → repair → seed queue → promote → generators; substrate(), census(),
                  populateMore()
  external.ts     Connector (an outside source), ExternalRecord, recordToDiscovery(), externalExpander()
  connectors/wikidata.ts   the first connector: Wikidata's public API, no key, CORS from a browser; a property table
  service.ts      Population: background slices, the outside asked when the rules run out, journal + done set persisted
src/assistant/traverse.ts   Ego's answers to the final-test questions, by traversal, in words
```

### Kinds overlap; they are never bins

`thing, material, property, geometry, function, behavior, transformation, mechanism, component, subsystem, system,
constructor, process, biological, organism, chemical, phenomenon, law, role, standard, failure, interface, manifold,
generator, parameter, computation, signal, environment, circuit, architecture`.

A bone is `material`, `component` and `biological`. A ribosome is `mechanism` and `constructor`. A screw is `component`
and `manifold`. Tests hold this (`kinds overlap`).

### Relations, each with an inverse

`is-a/generalizes, has-part/part-of, made-of/constitutes, does/done-by, can-become/comes-from, connects-to,
transforms/transformed-by, requires/required-by, produced-by/produces, governed-by/governs, enables/enabled-by,
prevents/prevented-by, fails-by/failure-of, varies-by/varies, plays/played-by, analogous-to, interacts-with,
standardized-by/standardizes, reproduced-by/reproduces, evolves-to/evolved-from, improved-by/improves,
has-property/property-of, in-view/views, measured-by/measures, state/state-of`.

Three are symmetric and are their own inverse. A thing may be related to itself only by `reproduced-by` (a lathe, a
ribosome, a RepRap printer). `Substrate.relate` refuses any other reflexive arrow at the kernel.

### Provenance and coverage on every entity

`source` is a cited `Source`, an `{estimate}`, a `{derived}` or a `{stub}`. `coverage` is `{depth 0–3, confidence,
sourceKind, expanded facets, unknowns}`. A stub is a thing something named and nothing described: depth 0, and typed by
the arrow that named it (`NAMED_AS`): a `governed-by` target is a stub *law*, a `made-of` target a stub *material*, a
`plays` target a stub *role*. So the invariant "a thing is governed only by laws" holds across stubs too, and a stub
law says in its unknowns that it is cited, not run.

### The pipeline

```
DISCOVER (bridge, seed packs, expanders) → EXTRACT/NORMALIZE (normalizeId, names) → DECOMPOSE (has-part/made-of)
→ CLASSIFY (kinds) → RELATE (25 relations) → CROSS-LINK (inverse keys stored forwards) → DEDUPLICATE (relate by key,
merge by id) → VALIDATE (reflexive refused; governed-by only laws; made-of only substances) → PROVENANCE (every entity)
→ BUILD MANIFOLDS (promoteManifolds: what varies and generalises) → BUILD GENERATORS (every manifold with enumerable
parameters) → CONSTRUCTION PATHS (produced-by chains) → QUEUE DEEPER (every entity × facet, by priority)
```

`ingest()` is the one door: packs, derivations and external discoveries all pass through it, and what it rejects is
reported with why. The bridge writes directly and `repair()` then stubs whatever it named, so nothing dangles.

### The queue

A `WorkItem` is an entity, a facet (components, materials, mechanisms, functions, transformations, variants, standards,
manufacturing, interfaces, failures, analogues, constructors, manifolds, laws, properties), a mode (fast or deep), a
priority and a reason. `priority()` ranks what unlocks the most: stubs named by many things, constructors, materials,
functions, well-connected and little-known things. Each question is asked once (dedupe on id|facet|mode, `done`
remembered across serialize/restore). `populate()` runs `workers` lanes, each over a partition of domains, each popping
the best question across its lane so no domain starves; a question is answered by the expanders that cover its facet,
and what none could answer is marked unknown on the entity. `ask()` puts one question at the front. `converged` is true
only when the queue empties, which it is not expected to.

Expanders: the seed expander (a pack's `deep()` knowledge), the rule expander (analogues by shared function across
domains, failures from governing laws, manufacturing from materials' processes, functions inherited along is-a,
materials by role), and the external expander, connected to a source through a `Connector`.

### The outside

A connector answers a thing by its key in that source, else by **exact** match of one of its names against the source's
labels and aliases (never a loose hit), with an `ExternalRecord`: the source's key, label, aliases, description, URL,
the retrieval date, its statements read as the index's relations (forwards or backwards), and its quantity statements
with their units as the source gives them. The external expander fetches a record once per thing and turns it into a
`Discovery` through `recordToDiscovery`: the thing gains the source's key, aliases, numbers (as parameters with the
source as provenance) and, when it was a stub, the source's description; each statement becomes a relation with the
source, its key and the date as provenance; what the statement names and nothing here describes becomes a stub of the
kind the statement names (a `made-of` target is a material). It all enters through `ingest`, so it is validated like
anything else and can be refused. A thing the source lacks, and a source that cannot be reached, are recorded as
unknowns on the facet, never as silence; a failed reach is not remembered, so it is asked again when the source is back.

The first connector is **Wikidata** (`connectors/wikidata.ts`): a public structured database, no key, reachable from
a browser with `origin=*`. Its property table reads instance of / subclass of as `is-a`, has part as `has-part`, part
of as `part-of`, made from material as `made-of`, fabrication method as `produced-by`, product as `produces`, uses as
`requires`, used by as `required-by`, has use as `does`, has effect as `enables`, has contributing factor as
`requires`, physically interacts with as `interacts-with`, develops from as `comes-from`, subject has role as `plays`,
has characteristic as `has-property`. Every quantity statement is taken with the unit the source states; the parser is
held on the API's documented JSON shape, and a live lookup test runs when the host is reachable from where the tests
run (a sandbox whose network policy denies the host skips it and says so). One request at a time, spaced 250 ms;
after a failure the host is left alone for 30 s, doubling up to five minutes, so a blocked host is not asked twice a second.

### Population in the background

`Population` (`service.ts`) works the queue in slices: by default every 500 ms, at most 2 ms of the main thread and 40
questions per slice, one lane over all domains (the best question anywhere), the outside awaited off the thread. The
app starts it 2.5 s after launch so the world comes up first. What is persisted is small and sufficient: the set of
questions already asked (the queue is a function of the substrate and of that set, so it is re-seeded without them),
the journal of what the outside said (replayed through `ingest` next session; the rules re-derive the rest), and the
totals; capped at 1.5 million characters, oldest dropped first, saved every 15 s and when the page hides. Ego's
"index of X" for a thing she does not know creates a stub asked for by name at the front of the queue, so the outside
is asked on the next slice and she can answer with where it came from when asked again.

### What an arrow names, the index describes

Three classes of stub were not questions but gaps in the seeds, and the census showed them by weight: the views
(`view.manufacturing` named 129 times and described by nothing; `view.mechanics` beside `view.mechanical` because a
law's domain word was pasted into a view id), the failure modes (155 named by `fails-by`, none described: the richest
knowledge in the index was labels), and the materials named by a bare word (`steel` 21 times from the processes and the
block pieces, while `material.steel` sat described). Each is now a table or a pack, held by a build test (S-6):

- `seeds/views.ts`: thirty views described, and `viewOfDomain` turning a law's domain into the one view for it.
- `seeds/failures.ts`: every failure mode the index names, with its mechanism and the law behind it (overheating is
  Joule against conduction and convection; brittle fracture is Griffith; a dendrite is Butler-Volmer at high rate;
  windup is an integrator summing while the actuator sits at its limit). 155 modes: mechanical, manufacturing,
  electrical, electrochemical, computing, biological, earth.
- `seeds/common.ts`: the generic functions and parts many packs name and none described (a controller before the
  robot controller, a motor before the DC motor, a fluid before the hydraulic oil).
- `FAMILY_OF_CATEGORY` in `seeds/materials.ts`: the one table from a category word to a family, used by the stocked
  materials, the processes and the block pieces alike; a piece that could be either of two materials says both.
- `FAMILY_NUMBERS`: density, modulus, strength and conductivity on the metal and polymer families, each from a named
  Engineering ToolBox page with its address and the day it was read, as ranges across the grades the page lists; a
  range that holds for a subset says so in its name. The stocked materials (Callister tables) lie inside them, density
  to 2 % and modulus to 10 %: two sources agree.

Then the rest of the typed stubs: `seeds/parameters.ts` (103 axes a thing varies along, each with its unit),
`seeds/standards.ts` (21 standards, each sourced to itself and saying what it fixes), `seeds/making.ts` (69 processes
named by `produced-by` and described by no pack, from the blast furnace to zone refining), the eighteen energy
transformations, the three instruments, and the specific materials (barium titanate, powdered iron, mica, the cells and
molecules of biology). The test now holds for every kind an arrow can type: at build no stub is a law, a failure, a
function, a parameter, a standard, a transformation, a constructor, a material, a role, a view or a thing; only an arrow
that does not say what its target is (`has-part`, `interacts-with`) may name something not yet described, and those are
the queue's questions.

Then the most-named of the kindless stubs, described in their packs (bone marrow, the spinal cord, messenger RNA; a combustor,
a turbopump, a photoresist, an arc chute), and the other material families given their numbers from the same pages
(titanium, nickel superalloys, glass, concrete, wood, ceramics, elastomers, composites, carbon, foams, semiconductors), each
range named for the subset it holds for. One disagreement between sources is kept as such: the page gives rubber at small
strain 10 to 100 MPa where the stocked natural latex is 1.5 MPa, so the elastomer range says it is the page's compounds.

Then the rest, in tranches: the machines, tooling, moulds, gases and consumables processes require (held by a test:
what a process requires is described), the engineering parts A to Z and the stock shapes, the earth and the chemistry
of crystals and solutions, and the sixty organs, tissues, cells, molecules and processes of biology. At build nothing is
a stub: everything an arrow names is described, held by a test, and the frontier is the queue of 38 895 questions
and the stubs that population itself makes as rules and the outside name new things.

Stubs fell from 813 to 0 and described entities rose from 1799 to 2593 without a question asked outside.

### The build is stepped

The whole build took 210 ms in Node and would have stalled the headset's frame when the background service first built
it. It is now a generator of steps, `buildSteps`: the bridge, each pack made and then ingested (a factory may give
several packs, so the covariance derivations are one pack a similarity), the repair, the queue seeded in chunks of five
hundred entities, the manifolds. `advanceBuild` runs it for a budget of this thread, checked between steps; the
background service advances it 2 ms every frame before it asks its first question (about 1.5 s on the headset), and
`build()` runs the rest at once only for a caller that needs the substrate now. Seeding the queue computed each
entity's priority once a facet; it is now once an entity, with the facet's weight added. Measured in Node: 65 steps,
171 ms in all, the largest 13 ms (a chunk of the queue), the scale derivations 10 ms a similarity. `npm run gate` runs
the typecheck, the unit, codec and golden suites and the build, and fails on any of them: the loop's own discipline
(the codec suite joined it the day CI was found red on a property test the unit gate never ran).

## Census (build, before any extra population)

| | |
|---|---|
| entities | 2609 |
| relations | 11 650 |
| relations per entity | 4.5 |
| stubs (depth 0, each a queued question) | 0 at build: everything an arrow names is described; the stubs are the ones population makes |
| laws | 175 (122 executable in `laws.ts`, 53 cited not run) |
| materials | 272 |
| components | 659 |
| functions | 92 |
| processes / constructors | 197 / 277 |
| mechanisms | 194 |
| failures | 209 |
| biological | 267 |
| manifolds / generators | 186 / 96 |
| domains (by the first, the queue's lane) | 20 (common 670, engineering 257, mechanical 247, biology 200, electrical 187, manufacturing 185, materials 158, physics 106, parameters 104, scale 79, catalogue 77, chemistry 77, computing 68, earth 40, failures 34, circuits 31, views 30, robotics 30, standards 21, making 8) |
| questions queued after seeding | 39 135 |
| things with no known constructor | 456 at build, 29 after a whole-queue round |

A whole-queue round (41 694 questions in 20 s, four workers) derives 43 024 relations by rule (12 769 inherited along
is-a, 2980 through a part, 44 by naming a piece), finds 44 entities, marks 204 unknowns, promotes 2 manifolds, rejects
nothing, and converges with 2559 questions re-opened for the next round: never finished, by design. It leaves 15 of
694 described components without a function, 13 without a material and 8 without a failure, all but three of them
pieces and regions of building blocks. The last ten rejections it used to make (a failure mode governed into failing
by itself: wear fails by wear) are gone, since a failure mode and a law are not things that fail.

## The final test, answered by traversal

Each is a query in `queries.ts`, a test in `tests/unit/substrate.test.ts`, and a sentence Ego understands
(`src/assistant/intent.ts`, `traversalOf`) and answers (`src/assistant/traverse.ts`).

| Question | Walk | Answer now |
|---|---|---|
| every way to store energy | `does`/`is-a` into `store.energy` and its refinements | 8 mechanisms (electrochemical, electrostatic, inertial, elastic, pneumatic, gravitational, thermal, chemical); 53 implementations across mechanical, electrical, chemistry, earth, biology (fat, ATP, tendon), robotics, catalogue |
| every mechanism electrical → mechanical motion | `does` into `convert.electrical.rotational` and refinements, then `generalizes` | 21: electromagnet, solenoid, motors dc/bldc/stepper/induction/synchronous, generator, servo, regenerative brake; in biology ATP synthase and the bacterial flagellar motor; in stock six servos and motors |
| materials for an electrical conductor with tradeoffs | `played-by` from `role.electrical-conductor`, numbers from params | silver 6.3e7 S/m first by volume, aluminium 6061 first per kilogram (9.3e3 S·m²/kg against copper's 6.5e3); families stand on their best member and say so |
| every type of screw and the manifolds generating them | `variants`: params, `generalizes`, `standardized-by`, `fails-by`; generator `screw` | 8 parameters (d, L, head, drive, class, material, coating, thread), 5 refinements, 5 standards, 9 failure modes; the generator enumerates members |
| all ways to make a rotational actuator | as the second row, from `fn.actuate.electromagnetic` | 21 |
| components of an electric motor | `has-part`/`made-of` to depth 3 | 7 direct parts, 35 leaves ending in magnet wire, C110 copper, electrical steel, ferrite |
| what manufactures them; what manufactures those | `produced-by` chains, cycle detection | winding, stamping, lamination, sintering, magnetizing, turning, die casting, assembly, balancing → winding machine, press, die, furnace, lathe → and a cycle: press, assembly, mill, MIG weld, sand casting, grinding, turning, sintering, furnace, fixturing make each other |
| biological analogues of a bearing | `analogous-to` into biology, plus shared function | synovial joint (friction 0.002), bacterial flagellar motor, cytoskeleton |
| human structures both mechanical and biological | parts of `bio.human` in `view.mechanical` and `view.anatomical` | 13: bone, cortical and cancellous bone, cartilage, ligament, synovial joint, skeletal muscle, sarcomere, tendon, heart, skin, blood vessel |
| generative lineage of a human | `made-of`/`has-part` downward, `is-a` when a thing has no parts said | proton → carbon → amino acid → protein → cell membrane → cell → human |
| mechanisms for a behaviour without a template | `mechanismsFor(words)`: the function by name, then implementations | "move fluid" → heart, centrifugal pump, …; "store energy" → 53 |
| construction path for a missing component | `constructionPath`: make / acquire / gaps | brushless motor: 42 steps, 23 gaps (IGBT, gate oxide, bus capacitor, Hall sensor, …), each gap a stub on the queue |
| how a thing fails | `fails-by` of the thing, then of its kinds (`is-a`) and its materials (`made-of`); each failure's first clause is its mechanism, its `governed-by` the law behind it | a bearing: five of its own (spalling by L10 life, brinelling by Hertz, wear by Coulomb, lubricant starvation, overheating by Joule against Fourier and Newton); a capacitor: dielectric breakdown, electrolyte dryout, ESR rise, short, cracking; asked as "how does X fail", "failure modes of X", "what could go wrong with X" (a question, never a complaint) |
| what a thing does | `function`: `does` of the thing, else of its kinds (`is-a`); each function's first clause and the laws it is governed by; the source of the arrow | a rudder: does one thing, steer: change the direction a vehicle moves, by cornering limit (Anderson); a wood screw: is a screw, and a screw does fasten |
| what a thing is made of | `components`: its parts to depth 3, and its `made-of` arrows with their own saying ("typically made of", at 0.7) and source; a thing of one piece says its material alone; a thing with none says its kind's | a connecting rod: one piece, typically made of 4140 steel (Budynas & Nisbett); a bolt: is a screw, and a screw is typically made of steel |
| how a thing fails, not yet asked | `failures` with nothing known: the queue's own rules run now for that one thing (its material's failures, its function's, living tissue's), the arrows kept, and the answer says it was derived now | a liver: "I had not been asked that. From what a liver is made of, what it does and whether it lives, it fails 3 ways: injury, disease, aging (living tissue: it is injured, diseased and ages)" |
| how big and how fast a thing is | `size`: its characteristic length and time (L_c, T_c), said in the unit that fits, and the things within a quarter of a decade of its size | a kidney: about 10 cm across, a timescale of about 1 min; beside it at that size: ... |
| the difference between two things | `compare`: the kinds (`is-a`) and functions (`does`) both have, then the functions, materials, failures and characteristic size only one has, then each thing's first clause | a bolt and a screw: a bolt is a kind of cap screw, both clamp axially and locate ...; a kidney and a capacitor: both filter, only a capacitor stores charge, couples AC, decouples |
| what is like a thing | `analogues`: said analogues (`analogous-to`) first, then what shares a function (`does`) or a kind, each with its why by name; "living", "in biology" or "in nature" keeps to the living | a kidney: membrane filter, capacitor, inductor (both do filter); a bearing, living: a joint (said), ... |
| the index of a thing | `index`: every arrow in and out, its characteristic length and time when it carries them, its analogues said (`analogous-to`) before those merely sharing a function, and its scale analogues decades away | a bearing: lives at about 3e-2 m and 1e-2 s, analogues the synovial joint and the flagellar motor; a river basin and a market answer to their words |
| a number of a material | `property`: the parameter by symbol or name on the thing, then on each kind it is-a, each with its unit and where it came from (a page and the day read, a data file, an estimate) | "what is the density of steel": 7850 kg/m³ (The Engineering ToolBox, read 2026-10-03, the address); "how stiff is aluminium 6061": 69 GPa from the data file, and as an aluminium alloy 69 to 70 GPa from the page; what is not known is said as a question on the queue |

## Laws added to the tree

- **S-1** the substrate is an index, not a list (kinds overlap; every arrow a relation with an inverse; more arrows than things)
- **S-2** every entity carries its provenance and its coverage (known is never complete; a stub is a typed question; nothing dangles)
- **S-3** the substrate never needs to be finished (the queue: prioritised, asked once, lanes across domains, unknowns marked, serialisable)
- **S-4** a question is answered by traversal (never by a list kept for the question)
- **S-5** what comes from outside says where it came from (a connector's record enters only through ingest, every arrow and number carrying the source, its key and the date; what the source lacks is an unknown, never silence; the background keeps slices of a frame and journals what the outside said)
- **S-6** what an arrow names, the index describes (a view, a failure mode or a function named by any arrow is described; a law's domain names one view through one table; a material is named by its family, never by a bare word; a family's numbers come from a named page with its address and the day it was read, and the stocked materials lie inside them)

**Correction found while Ego learned to say functions.** AC coupling, decoupling, the bootstrap capacitor, a chip's
interconnect, ripple, inrush and parasitic capacitance cited the lumped thermal time constant (m c / h A) where they
meant the RC time constant; the book had no RC law, so one is in it now (τ = R C, Horowitz & Hill), they cite it, and
a test holds both that and the heatsink's thermal one.

## Still open

- **No stub remains at build.** The frontier is the queue (39 135 questions after seeding, a whole round in 20 s) and
  the constructors: 456 described things have no known constructor at build and 29 after a round, the Earth's cycles,
  the observers, the engine's own units and building blocks whose pieces have no material to work; each is a question
  for a pack or for the outside.
- **One connector.** Wikidata is connected; a handbook, a standards index or a datasheet feed would each be another
  `Connector` returning the same record shape. Wikidata's statements are broad and uneven: a thing may have no
  English label, a property may be absent, and the exact-name rule leaves many things unmatched (a miss is recorded
  as an unknown).
- **Numbers from outside** land in the substrate's own symbol and SI unit when both the property and the unit are in
  the tables (`PROPERTY_SYMBOLS`: density, melting point, boiling point, thermal conductivity; `UNIT_WORDS`: about
  sixty unit names), with the conversion in the parameter's provenance; anything else is kept as the source gave it.
  Extending the two tables extends what feeds `materialsForRole`.
- **Rules inherit along is-a** (constructors, failures, standards, interfaces, materials, functions) at confidence 0.6,
  each relation saying what it inherits from; when a kind learns a relation, its members are asked that facet again,
  so inheritance recurses. A whole is made of what its parts are made of (0.7, "through its part X"), and a part that
  learns its material re-opens the whole's materials and failures. A thing fails as its material fails and as its
  function fails (a table of failure modes by function, each a failure the index knows), both said as such. A
  4000-question round before these rules derived 1003 relations and left 472 described components without a
  function, 287 without a material and 400 without a failure. A second tally showed the largest group without a
  function to be the pieces of the bridge's building blocks (91), so a piece named for a kind of thing is now that kind:
  the whole phrase at half confidence ("bearings" are bearings, "bus capacitors" the bus capacitor), each side of an
  "and" ("commutator and brushes" is both), else its head noun at 0.4 ("sun gear" is a kind of gear, "stator magnets"
  magnets), each arrow saying which reading it is, and never a law, another block or a living thing's part (a battery's
  "cells" are not biological cells); a thing that learns its kind re-opens every facet it can inherit. A whole-queue
  round (35 000 questions, 16 s) now derives 27 163 relations, marks 412 unknowns, converges, and leaves 227 of 568
  described components without a function, 170 without a material and 112 without a failure. A piece whose name
  resolves to nothing described (a planet carrier, a current sense, a lever) now says its kind in the block's own data
  (`Piece.kind`, an is-a the block asserts), so of 72 pieces 10 are without a kind and 36 without a function, from 33
  and 48; what remains is kinds that have no function yet, and the regions that are not parts (a back EMF, the ends of
  a member). Functions of the rest remain a question for packs and the outside. The things with no known constructor
  are 539 at build and 244 after a whole-queue round: the manufacturing facet derives a maker from the material (a part
  of steel can be made by what works steel, at 0.4 and saying so, until its own maker is known). A second rule for the
  same derivation was added to the constructors facet and measured: 244 with it, 244 without, so it was removed and the
  one rule carries the lower confidence and the wording; a commit that claimed a third fewer was wrong, and this is
  the correction.
  Then the parts a whole-queue round left without a function were read one by one: 117 described parts (stock
  shapes, wing and tail surfaces, machine regions, semiconductor regions, tools, organs and organelles) and 14 of
  them needed a function word no pack had said, so thirteen were added (lift, steer, thrust, control buoyancy,
  ignite, pattern, form, contain, latch, polarize, convey, digest, harvest light), each sourced and governed by a law
  where one is in the book. After a whole-queue round the components without a function are 15, from 139: the 14 are
  pieces and regions of building blocks (a back EMF, the ends of a member, the systems of an assembly) and the
  generic organ, whose function is its members'. The invariant: every part the common pack describes, every tool and
  every organ, organelle and tissue does something, itself or as its kind.
  Then the pieces of building blocks that no kind can speak for (a bolt's head, shank and thread, a member's section
  and ends, a shaft's seats and key seat, a coupling's elastomer spider, a bit's pivot and stops) say their own
  functions in the block's data (`Piece.fn`), kept by the bridge: after a whole-queue round 4 components are without a
  function, from 15: the generic organ, a motor's back EMF (a region, not a part), the machine assembly and its systems.
  With the bolt's shank and thread, the shaft's seats and key seat said to be steel, and the platelet and the cytoplasm
  said to be what they are of, 11 components are without a material after a round, from 13 (pieces of blocks that
  have no one material: a member's section and ends, a printed part, a bit's stops; and the engine's rigid body), and
  2 without a failure, from 8: the back EMF and the assembly's systems, neither a part.
  Materials next, the same way: 233 described components had no material after a whole-queue round. A catalogue part
  is made of what its datasheet names (a hollow section S355 steel, a bolt 8.8 steel, a bearing 52100 steel, a lead
  screw C45 steel with a bronze nut, a wire copper in PVC, a servo a nylon case with steel gears in the larger
  classes), by a family table in the bridge; what is a kind of a material is made of it (cardiac muscle is muscle
  tissue), a population rule; and the parts the common pack describes say their usual material, sourced, at 0.7 and
  saying "typically" (a connecting rod 4140 steel, a spar 2024 aluminium or carbon fibre, a spoke 304 stainless, a
  gland epithelium). After a whole-queue round the components without a material are 13, from 233: ten pieces and
  regions of building blocks, the engine's rigid body, the platelet and the cytoplasm; the components without a
  failure fell from 98 to 46 on the way, since what a thing is made of says how it fails.
  Failures last: the table from function to failure grew from 20 functions to 90 (what computes suffers soft errors
  and bugs, what senses drifts, what contains leaks and ruptures, what forms wrinkles and tears, what emits light
  dims), every entry described and a test says so; living tissue is injured, diseased and ages, a population rule
  before a tissue's own failures; the few that no rule reaches say theirs (a tooth chips, cardiac muscle infarcts, a
  separator is punctured by a dendrite, the engine's rigid body goes unstable). After a whole-queue round the
  components without a failure are 8, from 98: all pieces and regions of building blocks. On the way a merge-order
  fault was found and fixed: a pack that named a thing before the pack that describes it left the stub's "unplaced"
  as the thing's first domain, which is the queue's lane, so the cortex, the liver and the lung were queued on no
  lane; a description now puts its own domain first and "unplaced" goes once a real domain is known.
  The same fault, a second face: a cited law named first by the failures pack (Wolff's law) or a network (Little's
  law) carried that pack's domain, and the merge could not see the stub because its kind had already been overwritten
  by the time the domains were merged; the merge now remembers what it was before it changes anything, and the cited
  laws are described by a physics pack of their own, so physics is their lane whoever names them first. "Tell me about
  X" and "what do you know about X" fall through to the index when nothing is remembered by that name.
  The constructor frontier followed from the materials: once a part says what it is made of, what works that
  material makes it, so the things with no known maker after a whole-queue round fell from 244 to 101 without a new
  rule. Two rules and a few sayings took it to 29: a piece is made with its whole (a bolt's thread when the bolt is,
  at 0.5), a living part is made by development unless a nearer maker is known (0.6), the parts of a cell say
  self-assembly or replication, a magnet sintering and magnetizing, a laser source epitaxy, a logic gate lithography,
  a machine assembly. The 29 that remain are the Earth's cycles and climate, which nothing constructs, the observers,
  the engine's rigid body and world, and building blocks whose pieces have no material to work.
  Two refinements followed from reading Ego's answers: joining and assembly work a material too but do not make a part
  of it (a tube is not made by glue), and a piece is made with its whole only when it is a region of it (a bolt's
  thread), never a part made apart and assembled (an engine's flywheel). Lift has its own law now (L = ½ ρ C_L A v²,
  Anderson) where the lift function had cited drag, and the filter function says both of its mechanisms, size through
  pores and frequency through reactance, since the kidney and the capacitor both do it. The bridge's ways (`way.*`, how a thing is done) are refinements
  of the packs' functions (`fn.*`, what is done) through an explicit table in the bridge, so a building block that
  embodies a way is an implementation of the function. A stub named by `does`, `transforms` or `produced-by` is typed
  as a function, a transformation or a constructor.
- **A parameter attaches to a stub** (a characteristic scale is known of things not yet described), and an entity with
  nothing to say never describes: it merges its parameters only. Rule expanders still discover relations, not entities: new entities come from packs and
  from the outside. The things with no known constructor (nor a kind with one) and the stubs are the frontier.
- **Lane fairness is by priority within a lane.** A lane of several domains serves the best question among them; the
  background service runs one lane over all domains, so it is pure priority.
- **Lineage is one path.** `lineage()` follows the first unvisited constituent at each step; a full generative tree is
  `decompose()` to depth, which exists.
- **Names.** What Ego says of a thing is its human name when it has one (a material's from its data sheet, a part's
  from its pack), else the said layer over ids whose words come out in the wrong order or stand for a code (`SAID` in
  `names.ts`: "DC motor" for motor.dc, "MOSFET" for transistor.mosfet, 170 of them), else the id as words without its
  prefix; the said layer is heard too, so "logic gate" finds gate.logic. A test holds that every part and material named
  five times or more is spoken by a name, never the id as words. The outside adds labels and aliases as it answers.
- **Cited laws are not executable** until added to `laws.ts`: 53 remain so. Fifteen of the most cited were made
  executable in the shift (Griffith, Fick, Bernoulli, Nernst, Ampère for a solenoid, Hertz for a sphere on a flat,
  Coulomb, Gibbs, the ideal gas, Michaelis-Menten, Hall-Petch, Planck, Shannon, Snell, Faraday), each with a sourced
  worked example that the law tests reproduce and a dimension check that rescaling passes; the law book gained the
  chemistry and optics domains and their views. Paris' law stays cited: its coefficient's units depend on its exponent.
- **Persistence is per browser.** The journal lives in this browser's storage beside the builds, sharing its five
  million characters; nothing syncs it between headsets.
