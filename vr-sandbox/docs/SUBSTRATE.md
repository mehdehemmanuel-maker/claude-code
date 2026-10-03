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

Stubs fell from 813 to 323 and described entities rose from 1799 to 2265 without a question asked outside.

## Census (build, before any extra population)

| | |
|---|---|
| entities | 2588 |
| relations | 10183 |
| relations per entity | 3.9 |
| stubs (depth 0, each a queued question) | 323 (none typed: every one named only by `has-part` or `interacts-with`) |
| laws | 172 (104 executable in `laws.ts`, 68 cited not run) |
| materials | 246 |
| components | 497 |
| mechanisms | 178 |
| constructors | 251 |
| failures | 209 |
| biological | 190 |
| manifolds / generators | 181 / 84 |
| domains | 21 (mechanical 477, electrical 425, materials 298, chemistry 296, biology 284, manufacturing 254, engineering 236, scale 209, physics 196, failures 160, common 117, parameters 103, computing 91, catalogue 77, making 69, robotics 67, circuits 66, earth 51, energy 33, views 30, standards 21) |
| questions queued after seeding | 34 944 |
| things with no known constructor | 371 |

Before the views, failures and families packs, a round of `populateMore(500, 6)` derived 67 new relations by rule, marked 528 unknowns, rejected nothing, and left the
queue at 27 853: never finished, by design.

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
| the index of a thing | `index`: every arrow in and out, its characteristic length and time when it carries them, its analogues said (`analogous-to`) before those merely sharing a function, and its scale analogues decades away | a bearing: lives at about 3e-2 m and 1e-2 s, analogues the synovial joint and the flagellar motor; a river basin and a market answer to their words |

## Laws added to the tree

- **S-1** the substrate is an index, not a list (kinds overlap; every arrow a relation with an inverse; more arrows than things)
- **S-2** every entity carries its provenance and its coverage (known is never complete; a stub is a typed question; nothing dangles)
- **S-3** the substrate never needs to be finished (the queue: prioritised, asked once, lanes across domains, unknowns marked, serialisable)
- **S-4** a question is answered by traversal (never by a list kept for the question)
- **S-5** what comes from outside says where it came from (a connector's record enters only through ingest, every arrow and number carrying the source, its key and the date; what the source lacks is an unknown, never silence; the background keeps slices of a frame and journals what the outside said)
- **S-6** what an arrow names, the index describes (a view, a failure mode or a function named by any arrow is described; a law's domain names one view through one table; a material is named by its family, never by a bare word; a family's numbers come from a named page with its address and the day it was read, and the stocked materials lie inside them)

## Still open

- **Stubs that remain** at build, 323, every one named only by `has-part` or `interacts-with` (organelles, process
  consumables, specific parts: a bone marrow, a cell wall, a gas shield, a photoresist). The arrow does not say what
  they are, so a rule cannot type them; each is a question for a pack or for the outside.
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
  function to be the pieces of the bridge's building blocks (91), so a piece named for a kind of thing is now that kind
  at half confidence ("bearings" are bearings, "nut" is a nut), when the name resolves to a described component and
  never to a law or another block; a thing that learns its kind re-opens every facet it can inherit. Functions of the
  rest remain a question for packs and the outside. The bridge's ways (`way.*`, how a thing is done) are refinements
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
- **Names.** Many seed entities have no human `names` and Ego says the id as words; the outside adds labels and aliases
  as it answers.
- **Stub laws are cited, not executable:** they cannot be run by `solve()` until added to `laws.ts`.
- **Persistence is per browser.** The journal lives in this browser's storage beside the builds, sharing its five
  million characters; nothing syncs it between headsets.
