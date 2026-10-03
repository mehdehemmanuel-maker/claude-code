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

Expanders now: the seed expander (a pack's `deep()` knowledge), the rule expander (analogues by shared function across
domains, failures from governing laws, manufacturing from materials' processes, functions inherited along is-a,
materials by role), and the external expander, which is **not connected**: it records that an outside source would be
consulted and marks the facet unknown. Connecting it is the next step.

## Census (build, before any extra population)

| | |
|---|---|
| entities | 2539 |
| relations | 8585 |
| relations per entity | 3.4 |
| stubs (depth 0, each a queued question) | 811 |
| laws | 171 (104 executable in `laws.ts`, 67 cited not run) |
| materials | 255 |
| components | 467 |
| mechanisms | 174 |
| constructors | 185 |
| failures | 209 |
| biological | 174 |
| manifolds / generators | 179 / 78 |
| domains | 14 (mechanical 580, electrical 526, biology 314, chemistry 308, materials 301, manufacturing 267, engineering 248, physics 202, computing 100, catalogue 77, circuits 74, robotics 67, earth 53, energy 33) |
| questions queued after seeding | 28 353 |
| things with no known constructor | 341 |

A round of `populateMore(500, 6)` derived 67 new relations by rule, marked 528 unknowns, rejected nothing, and left the
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

## Laws added to the tree

- **S-1** the substrate is an index, not a list (kinds overlap; every arrow a relation with an inverse; more arrows than things)
- **S-2** every entity carries its provenance and its coverage (known is never complete; a stub is a typed question; nothing dangles)
- **S-3** the substrate never needs to be finished (the queue: prioritised, asked once, lanes across domains, unknowns marked, serialisable)
- **S-4** a question is answered by traversal (never by a list kept for the question)

## Still open

- **External sources are not connected.** `externalExpander(false)` records the question and marks the facet unknown.
  Connecting a source (a handbook, a standards index, a datasheet feed) means writing an expander whose `expand()`
  returns a `Discovery` with provenance; `ingest()` validates it like anything else.
- **Population is a budget, not a daemon.** `populateMore(budget, workers)` runs on demand; nothing runs it in the
  background of the app yet, and the queue is not persisted between sessions (it serialises; nothing calls it).
- **Rule expanders discover relations, not entities.** New entities come only from packs and (when connected) from
  outside. The 341 things with no known constructor and the 811 stubs are the frontier, in priority order.
- **Lane fairness is by priority within a lane.** A lane of three domains serves the best question among them, so a
  small domain in a lane with a large one waits. Fourteen domains over six lanes left physics, catalogue, earth, circuits
  and robotics unserved in a 500-question round; more workers or a round-robin within the lane would change that.
- **Lineage is one path.** `lineage()` follows the first unvisited constituent at each step; a human's lineage through
  carbon is one of many (water, calcium, phosphorus). A full generative tree is `decompose()` to depth, which exists.
- **Names.** Many seed entities have no human `names` and Ego says the id as words ("synovial joint", "casting sand").
  Stubs have no description at all until the queue reaches them.
- **Numbers.** Material families carry no numbers of their own; `materialsForRole` borrows the best member's and says
  so (`derivedFrom`). Stub laws are cited, not executable: they cannot be run by `solve()` until added to `laws.ts`.
