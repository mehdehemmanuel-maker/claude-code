# Nexus: the restart interrogation

4 October 2026. Written with implementation stopped, against the repository as it stands at f3ad366 (51,378 lines of
source in 217 files, 13,817 lines of tests, 8,370 lines of documents). The half-built traceability substrate of the
last hours (nexus/traced, operators, audit, lineage, why; the table path traced end to end; a ratchet gate) is set
aside in a local stash and not on the branch: it was the right shape and the wrong place, and this document says why.

The counts below were measured, not guessed:

| what | count |
|---|---|
| numeric literals that are quantities (not 0, 1, 2; not indices, exponents, strings) | 8,497 across src; 2,616 in ganglia, 956 in engineering, 623 in data, 585 in physics |
| branches on a category or kind string (`.category ===`, `.kind === '…'`, `case 'table'`, …) | 209 |
| switches over a string union of things | 19 |
| reads of a wall clock or a random source (`performance.now`, `Date.now`, `Math.random`) | 43 |
| numeric fallbacks (`?? 0.5`) | 298 |
| comments that confess (hack, workaround, estimate, assume, magic, for now, TODO) | 247 |
| laws in the book | 145, of which 20 are Nex terms the engine can evaluate; the rest are closures |
| construction laws | 15 executable facets, 100 named ones in a seed tree I wrote by hand |
| part kinds, materials, seed packs, intent regexes | 23, 18, 18, 114 |

The verdict, compressed: the knowledge layer is beside the runtime, not under it. Nex describes; TypeScript
decides. Every law we added this week was a TypeScript function with a Nex structure attached as a label, and the
label was never executed. That is why every fix became a patch and every patch needed a law written after it: the
language cannot act, so the code acts for it, and the code is where the categories, numbers and special cases live.
The current architecture cannot become Nexus by accretion. The semantic core must be rebuilt; the physics kernel,
the data, the tests and the observations survive as backends and evidence.

---

## Part I. What I would do differently

| Current approach | Why it happened | What is structurally wrong | What should replace it |
|---|---|---|---|
| A runtime of parts (kind, params, pose, material) in a document, simulated by a rigid-body engine, rendered by three.js; knowledge in a separate ganglia tree | The app was a VR sandbox first; the knowledge was added to explain it | Runtime state has no term identity: a part is not the value of any derivation; the renderer can draw what no law produced; "runtime entity without construction lineage" is the normal case | Runtime state is a binding of variables in a constraint system; the engine and the renderer are realization morphisms with error contracts; nothing enters the world except as the value of a term |
| Laws as `eval` closures with inputs, outputs, units, validity and a source; 20 of 145 also as Nex terms | The book was built for Ego to answer questions and size members | A closure cannot be inverted, differentiated, hashed by content, or traced through; the term form is the only executable Nex and it stayed a side form | Every law is a term with a validity domain and provenance; closures are compiled from terms, never written |
| Construction laws as a seed tree of 16 families × facets with `bears` predicates over role and kind strings, `derive` returning typed outputs with a `why` string, and a Nex `structure` as a hashed label | The directive asked for a universal law hierarchy and I wrote the hierarchy down as data | The structure is never evaluated; relevance is a category test in disguise (`has(s.roles, 'support')`); the families are my taxonomy, not generated from conserved quantities; 100 of 115 facets are names | Families generated from conserved quantities and boundary couplings; relevance from the variables a system actually carries; no facet that is only a name |
| Designs as generators: five by coordinates, six as relational assemblies, each a function per human kind (`table`, `shelf`, `ladder`) | Ego had to build something in VR | A generator is a template with arithmetic; relational placement improved the arithmetic but the thing still starts from "table"; sizes come from tables of defaults | Intent as constraints on behavior; a configuration found in the manifold; "table" is the name of a region of that manifold, attached afterwards |
| Geometry as primitive kinds (plate, lumber, tube, block) with params; contact and placement computed over their boxes | The physics engine wants shapes | Shape precedes constraint: the thickness exists before the stress that requires it; the box is the truth and the law an afterthought | Geometry as extents required by constraints (a length from buckling, a thickness from bending), realized as stock from a declared catalogue |
| Environment as a heightfield from a places table, gravity from a setting, water as a plane | A beach was asked for | A place is a bag of numbers (slope 0.05, relief 0.25, wavelength 14) with one sourced line; ground is a function `groundAt(x, z)`; nothing couples to it except by hand | Environment as fields over a domain with boundaries and sources; the ground a material field; support a coupling to it |
| Ego: intent by 114 regexes, a one-rule Mind over an append-only journal, lessons from beliefs | The user talks; the loop had to be a function of data | The regex front-end is a vocabulary that cannot grow; the Mind's kinds and hypothesis changes are fixed; a lesson is a belief filed under a law and applied by class (`l.of === spec.what`): generalization by category | A representational-failure protocol: observation disagrees with derivation → missing variable or relation found by abduction over types → term added, consequences regenerated by hash |
| Traceability bolted on: `Traced` values, an operator registry, a regex scan with a baseline | The directive demanded it this week | A `Traced<number>` beside `number` is a convention; any line can bypass it; the audit is a linter | A substrate in which the only way to make a value is a derivation or a declared leaf; no bare number has a type at all |
| Categories everywhere: `Design`, `Role`, `Family`, `MaterialCategory`, `Flow` words, part kinds, connector kinds, walker plans | Each was the fastest way to make the next feature work | 209 branches test them; behavior lives in the branch, not in the thing's variables and couplings | Categories as equivalence classes of term shape and coupling topology, computed, named afterwards |
| Scale as a branch (tsc: tick against sound crossing, coarse-graining, rigid domain) | The research pass found the real thing | It is the one sound piece and it is isolated: no quantity carries its scale; no realization declares its window except the rigid-body one | Scale a coordinate on every quantity and a declared window on every observer and realization |

### I.1 Fundamentally sound
- The Nex core as a representation: distinctions, dimensioned quantities, relations with coordinates (mode, polarity, evidence), canonical form and content hashing, text rendering. It is the right shape for the IR; it lacks evaluation, binding and solving.
- The dependency registry by hash: a change to a law makes everything citing it stale, transitively. This is the propagation mechanism the rebuild needs and it already works.
- The journal and the one rule: an append-only record whose next action is a function of its last commit, resumable after a crash. Correct as the observation-comparison loop's memory.
- The stand: prediction and simulation meet only in a comparison with a tolerance. Correct, and it is NEXUS.md's comparison rule.
- The energy ledger and the watchdog obligations: nothing from nowhere, enforced by observation of the runtime. These are the first causal-closure checks.
- The time/scale/c branch: the rigid domain as tick against sound crossing, coarse-graining as an operator with a residual bound, resolution as a limit. This is scale done right, in one corner.
- Units and dimensions with a checker; validity domains on laws; provenance on every substrate entity with coverage and confidence; polysemy split by structure rather than by name.
- The physics conformance tests against exact results, and the e2e harness with the emulated headset.

### I.2 Useful prototypes
Relational placement (coordinates as results of relations over real boxes); the assembly solver (dependency order,
cycle refusal, roots on their own ground); the person as the source of sizes; load cases from roles; hypotheses from
laws; lessons applied to the next design; the traced-value substrate in the stash; the operator registry with
semantic and implementation hashes; the forms and shapes census over laws (equivalence of laws by shape, the seed of
emergent category).

### I.3 Architectural mistakes
The document-of-parts as the world; laws as closures; construction laws as a hand-written taxonomy; generators per
human kind; defaults tables; the regex intent front-end as the semantic entry; the Mind's fixed hypothesis changes
(`aprons`, `margin`, `upgrade`, `anchor`); walker minds with urge constants; the places table; `grow.ts` stage
tables and "a 100 mm bracket"; the substrate's name resolution with a hard-coded list of namespaces; `isWood`,
`isMetal`, `category ===`.

### I.4 Actively preventing Nexus
TypeScript as the semantic source of truth. While a `switch (spec.what)` can decide what exists, no invariant about
traceability, generalization or category independence can hold; every law is optional to the code that does the work.

### I.5 Delete completely
`assistant/designer.ts`, `assistant/grammar.ts`, `assistant/intent.ts` as the semantic entry (keep as a thin UI
adapter if at all), `construct/laws.ts`'s seed tree, `construct/lessons.ts`, `world/creature.ts` body plans and
`world/mind.ts`, `world/place.ts`, `ganglia/grow.ts`, `ganglia/machines.ts`, `ganglia/workflows.ts` as code,
templates, the skills and preferences layers, `mind/investigate.ts`'s candidate and change vocabulary.

### I.6 Survive unchanged
`ganglia/native/core.ts` (as the IR's data model, extended), `ganglia/units.ts`, `ganglia/dependencies.ts`,
`mind/journal.ts`, the physics kernel (`physics/*`, `engineering/*` numerics) as a backend, the materials and
connector data, the conformance and codec tests, the e2e harness.

### I.7 Survive only as observations, tests, data
The 145 laws (re-expressed as terms; their examples become tests of the compiler); the materials with sources; the
person's measures with sources; the stock lists; every conformance result; the journal of every stand run; the
walker's trot and the swimmer's wave as measured behaviors to be reproduced, not as plans; the beach-face slope
source; CONSTRUCTION-AUDIT.md's table of fixed dependencies as the inventory of what the new core must derive; the
polysemy census; the forms census; this week's failures (the shelf that tipped, the dog that rolled, the lookup that
chose in silence) as the first representational-failure cases.

### I.8 Assumptions turned into architecture
That a world is a set of rigid parts; that a thing has a kind; that a design has a kind; that a role is a string;
that a flat floor is y = 0; that a length is a number; that a law is a function; that a hypothesis is one of four
changes; that an intent is a regex match; that a scale is a branch of research; that the renderer is the view and
not a projection with a contract.

### I.9 Human categories hard-coded that should have been derived
table, bench, crate, shelf, wall, tower, bridge, frame, stand, ramp, ladder, chair; support, carries, seat,
stood-on, handhold, spans, braces, cap, back; the 16 families; wood and metal; dog, fish, whale, eel; motor, battery,
servo, controller; the 11 flows; walk, relax, mixed reality.

### I.10 Abstractions overloaded by early implementation
`Role` (a load case, a placement rule and a hypothesis trigger at once); `DesignSpec` (intent, sizes, a lesson's
margin and a material); `Relation` (a placement and a joint); `Candidate` (a hypothesis and its change); the
`Subject` of a construction law (kinds, roles, flows, materials, failures: a category bundle); `Plan` (Forge text,
laws, notes, roles, lineage); `Entity` in the substrate (a thing, a law, a lesson, a gap, an operator).

---

## Part II. The band-aids, classified

Searched: the whole of `src`. The classes: PATCH (fixes one case), PROTOTYPE (right idea, wrong substrate),
EMPIRICAL RULE (a measured or chosen number, labelled or not), DERIVED LAW (follows from fundamentals, written as
code), FOUNDATIONAL LAW (a conservation or constitutive relation), ARCHITECTURAL PRIMITIVE, UNKNOWN.

| found | where | class | belongs in the new architecture? |
|---|---|---|---|
| 8,497 numeric literals that are quantities; 298 `?? number` fallbacks | everywhere; densest in ganglia (law examples, seed packs), engineering (formula constants), data (catalogues), physics (solver settings) | EMPIRICAL RULE where sourced (materials, person, stock), DERIVED LAW where a formula constant (5/384, π², 1/12), PATCH where a fallback, UNKNOWN for the rest | Sourced numbers survive as leaves with origin; formula constants survive inside law terms; fallbacks do not survive: an unknown stays unknown |
| 209 category branches, 19 string switches | designer, grammar, registry, materials helpers, ego, creature, intent | PATCH (each) | No. Behavior from variables and couplings |
| `isWood`, `isMetal`, `m.category === 'engineered-wood'` | designer, operators, buildsheet, registry, spacing, fracture | PATCH | No: a material is its constitutive relations and its stock |
| `DEFAULTS`, `ESTIMATE`, `usual()` sizes | designer | EMPIRICAL RULE (now labelled) | As declared assumptions with grounds, never as a table consulted by kind |
| `SAFETY = 3`, `SAG = 1/300` | designer, operators | EMPIRICAL RULE (labelled heuristics) | As declared assumptions that every derivation shows |
| `LUMBER`, sheet lists, tube sides, wall ratio | registry, designer, operators | EMPIRICAL RULE (stock, a configuration) | Yes, as a sourced catalogue of realizations |
| `CLEAR = 0.0005`, `TOUCH`, `REACH = 6 mm` | laws, contact, through | DERIVED (the geometric.clearance law relates them) but chosen | As consequences of the realization's penetration contract and the manufacturing tolerance |
| `PUSH = 300 N`, `NEAR_YOU = 1.0`, urges `0.5, 0.2`, `dt / 40`, `dt / 120` | people, mind | EMPIRICAL RULE (push sourced as an estimate), PATCH (the mind's) | The push survives as an estimate; the mind's constants do not survive as constants |
| `releaseDistance`, the footprint plane under a walker | ego, mind | PATCH that found a law (support within the realization's penetration domain) | The law survives; the code does not |
| `/leg\d+$/`, `/shelf\d+$/`, name-based signatures | investigate (removed this week), ego | PATCH | No |
| `candidatesOf` list → laws' hypotheses with four fixed changes | investigate | PROTOTYPE | The idea (hypotheses from laws) survives; the change vocabulary does not |
| `STAGE` order table, "100 mm bracket", "cross-member over the track" | grow.ts | PATCH | No |
| creature body plans: segments, offsets, servo ids, cells, rhythm, swing, gait | creature.ts | PATCH (a plan is a template) | Only as observed behaviors to reproduce |
| `PLACES` table | place.ts | EMPIRICAL RULE (one source) and PATCH | The beach-face slope survives as a sourced field parameter; the table does not |
| 43 wall-clock and random reads | ego, herd, journal session ids, substrate budget, render | ARCHITECTURAL PRIMITIVE where it is the observer's clock or an identity; PATCH where behavior depends on it | Only as declared observers (a tick) or identities; never as a cause |
| the `structure` field on construction laws, never evaluated | construct/laws.ts | PROTOTYPE pretending to be ARCHITECTURAL | No: a law's structure must be the thing that runs |
| `eval` closures on 125 of 145 laws | ganglia/laws.ts | DERIVED LAW as code | Re-expressed as terms |
| `derive(subject)` per law with `why` strings | construct/laws.ts | PROTOTYPE | The derivation records survive as the shape of a derivation; the subject bundle does not |
| `lessons` filed by `(law, what, class)` | construct/lessons.ts | PATCH that looks like learning | No: a lesson that applies by class is a special case with a memory |
| the regex scanner with a baseline | nexus/audit.ts (stash) | PROTOTYPE of a verifier | As an independent verifier only |
| `Traced<T>` beside `number` | nexus/traced.ts (stash) | PROTOTYPE | The idea survives as the only value type; the coexistence does not |
| the renderer's hover overlay, icons, isometric item pictures | xr, render | ARCHITECTURAL PRIMITIVE (projection) | Yes, as projection of realized state only |
| tests asserting outputs without derivation (`expect(w.parts).toBe(7)`, the table regex) | designer, grammar, e2e | PATCH-shaped tests | Rewritten as derivation tests |
| `metadata that claims`: `laws: ['stress.bending', …]` on plans; `lawAncestry` on anomalies | designer, investigate | PATCH (a claim without a path) | No: a law is cited by the derivation that used it, never listed |
| the substrate's lookup prefixes `['qty.', 'role.', 'fn.', …]` | substrate/names.ts | PATCH | No |
| two ontologies: part kinds vs blocks/archetypes vs substrate entities vs construction members | parts, ganglia/blocks, substrate, assembly | duplicated concepts | One: a term; a part kind is a realization, an archetype a cached constructor, an entity a term with provenance, a member a bound variable set |
| three ways to say "why": `Plan.notes`, `Derived.why`, `whyLineage` | designer, laws, why.ts | duplicated rules | One: the derivation record rendered |

---

## Part III. The restart test: the smallest executable semantic substrate

Dependency order. Each layer: what it represents, why it must exist, what it depends on, what depends on it, what
must not exist there, what proves it.

**L0 Identity.** Content-addressed terms in canonical form (the existing hashing, generalized). Must exist because
provenance, staleness and equivalence are all identity questions. Depends on nothing. Everything depends on it.
Must not contain: names in hashes, units in hashes, any value that is not a term. Proof: two spellings of one claim
hash alike; one changed leaf changes every dependent hash and nothing else.

**L1 Quantity.** Magnitude, dimension, characteristic scale, uncertainty, status. Must exist because every physical
assertion is one, and because scale and status are not optional afterthoughts but coordinates of the value. Depends
on L0. Depended on by every term. Must not contain: a magnitude without a dimension, a dimension without a scale
coordinate, a value without a status. Proof: dimensional nonsense is unconstructable; Buckingham groups computed
from a set of quantities; a value of status unknown has no magnitude to read.

**L2 Term and evaluation.** Leaves (quantities with an origin) and applications (an operator over terms); evaluation
returns a derivation record, never a bare value: the term, its inputs, its output, its status (the weakest input),
its laws by hash. Must exist because this is the only place a number may come from. Depends on L0, L1. Depended on by
laws, states, construction, observation. Must not contain: a way to make a leaf without an origin class (fundamental,
measured, standard, estimated, assumed, given, unknown); a backend call that returns a bare value. Proof: `WHY` of any
value is total; a leaf with no origin is a type error, not a lint finding.

**L3 Status and validity.** The lattice {fundamental, measured, derived, estimated, assumed, hypothesized, unknown,
contradicted, outside-validity} with combination rules; validity domains as constraint terms on inputs. Must exist so
that unknown cannot become a default. Depends on L2. Depended on by the solver and the comparison rule. Must not
contain: a default. Proof: a derivation from an unknown is unknown; an input outside a law's domain is refused with the
domain term in the refusal; a contradiction is a term carrying both evidences.

**L4 Laws.** Relations between quantities (equality and inequality) with validity domains and provenance; the book
re-expressed as terms; solvable in any direction. Depends on L2, L3. Depended on by constraint systems. Must not
contain: a closure; a formula constant without the law's identity. Proof: every law evaluates forward and inverts
numerically from its own term; its example is a test; its hash is cited by every use.

**L5 Constraint systems and the manifold.** Variables (unknown leaves), laws instantiated over them, a solver that
returns bindings, the free variables (under-determined, named), and contradictions (over-determined, named). Must
exist because construction and explanation are both questions to this solver. Depends on L1–L4. Depended on by
construction and comparison. Must not contain: a solver that picks a value for a free variable; a category. Proof:
two bars and a load solved from statics alone; one law removed → the free variable is reported, not filled.

**L6 Domains, fields, observers.** Space and time as domains; quantities over domains (fields: gravity, material,
temperature, a height field); boundaries as constraints on the domain; the observer as a declared window
(tick, resolution, tolerance) which is the coarse-graining operator of the tsc branch. Must exist because position,
ground, and the rigid domain are all field and window questions. Depends on L1–L5. Depended on by geometry,
environment, couplings, realization. Must not contain: a coordinate as a primitive fact; an empty 3D space; a floor
at y = 0. Proof: "the ground under x" is a field query with a source; the rigid domain is the window against the
sound crossing, as today.

**L7 Couplings.** A shared variable at a boundary between two subsystems, with conservation across it (force equal and
opposite; flow in equals flow out plus accumulation). Contact, support, joint, transport, exchange, feedback, control
are couplings over particular conserved quantities. Must exist because this is the middle space: everything between A
and B is a coupling over time. Depends on L5, L6. Depended on by construction and the ledger. Must not contain: a
joint kind table; a contact finder over boxes. Proof: the energy ledger is the conservation check on couplings; a
joint's load is the shared variable, read from the solution.

**L8 Construction.** Intent as constraints on behavior; the solver finds a region of the manifold; geometry as the
extents the constraints require; material as the constitutive bindings; placement as the coupling solution;
realization as stock chosen from a declared catalogue by a declared preference. Depends on L4–L7. Depended on by the
runtime. Must not contain: a kind of design; a template; a default size. Proof: "carry 60 kg at 0.7 m within reach"
yields a configuration with no code path that knows the word table.

**L9 Realization morphisms.** The rigid-body engine, the renderer, a closed-form solver, each a map from bound terms
to a runtime with an error contract and a domain (the rigid-body realization's domain is the rigid domain). Depends on
L6–L8. Depended on by observation. Must not contain: an engine call from anywhere else; a drawn thing without a bound
term. Proof: a runtime body exists if and only if a construction term binds it; the contract's bound is checked by the
watchdog.

**L10 Observation and comparison.** Measurements from the runtime as leaves of status measured; the comparison rule
with the tolerance from the realization contract and the observer window; anomaly as a term; the journal. Depends on
L9. Depended on by language growth. Must not contain: a hypothesis vocabulary. Proof: the shelf that tipped produces
an anomaly whose explanation names the overturning relation as the one the prediction lacked.

**L11 Language growth.** Representational failure → missing variable or relation found by abduction over the
constraint system at the type level → candidate term → validation across the journal → promotion with provenance →
regeneration by hash. Categories as equivalence classes of term shape and coupling topology. Depends on everything.
Must not contain: a category registry; a special case. Proof: the dog that rolled yields a support-within-penetration
relation that also governs a crate on a slope.

What must not exist at any of these layers: dog, robot, building, creature, the construction library, the component
library, the ontology database, the category registry, the template system, the tablet, the headset.

---

## Part IV. What Nexus is a language for

The irreducible thing is not an object, an entity or a state. Derive it by elimination:

- An object is a connected region of a material field whose internal couplings are rigid within the observer's
  window: derived (L6, L7, and the tsc rigid domain).
- An entity is an object with a name: derived, plus a convention.
- A state is an assignment of values to variables: derived from leaves and bindings.
- A transformation is a relation between states across the time domain: derived.
- An observation is a measured leaf bound to a term's output: derived from a leaf and a relation.
- A constraint is a relation with a mode: a relation.
- A causal structure is a directed relation with a time ordering and intervention semantics: a relation over the
  time domain with a declared source term.
- A field is a quantity over a domain: a term with a free domain variable.
- A process is a term over the time domain: derived.
- Information, energy, spacetime: conserved quantities, dimensions and domains: L1 and L6.
- Scale: a coordinate of every quantity and a window of every observer: L1 and L6, not a thing.

What remains after elimination, and why each cannot be derived:

1. **Quantity** (magnitude with dimension and scale): the dimension is not derivable from anything smaller; it is the
   type system of physics.
2. **Term** (leaf or application): the structure of a claim; nothing smaller carries structure.
3. **Mode** (the epistemic coordinate: true, false, unknown, constrain, hypothesized): without it a term is a
   picture, not a judgment.
4. **Origin** (how a leaf touches reality: measured with a source, declared with grounds, fundamental): the boundary
   between the language and the world cannot be derived from inside the language.
5. **Identity** (the hash): equivalence and provenance need a name that is not a word.

Five primitives. A variable is an unknown leaf. A law is a term in constrain mode with a domain. A field is a term with
a free domain variable. A state is a binding. A process is a term over time. A construction is a search for bindings.
An object is a coarse-graining artefact. A category is an equivalence class. This is close to the existing Nex core
(D, Q, R, E with coordinates); what the core lacks is evaluation, binding, solving and exclusivity, not primitives.
The core got the vocabulary right and then let TypeScript keep the verbs.

---

## Part V. Language self-generation

When Nexus meets something it cannot represent, the right answer is D then E, never B or C: identify the missing
foundational distinction, then change the language; a category is only ever the name of a class found afterwards.

The mechanism, as terms:

1. **Representational failure** is one of four detectable conditions. A derivation's output disagrees with a
   measurement past the combined tolerance (the shelf). The solver finds no binding (over-constrained: a contradiction
   term names the two relations). The solver finds a free variable the intent did not leave free (under-constrained:
   a missing relation). A measurement arrives with a dimension or scale that no variable of the system carries (a
   missing variable). Each is a term, not a log line.
2. **Missing distinction** is found by abduction over types: the smallest set of variables or relations whose
   addition makes the system consistent with every observation in the journal, searched at the level of conserved
   quantities, couplings and windows, never at the level of instances. The polysemy mechanism already does this for
   words (a word reaching two senses is split by the structure that tells them apart); the same operator over terms
   splits a class whose members behave differently by the discriminating observable.
3. **Candidate abstraction**: the new variable or relation, stated over types, with provenance "abduced from
   observations h1…hn".
4. **Generalization**: the candidate is applied to every system in the journal that carries its variables; the
   count of systems it changes is its generality; a candidate that changes one system is a special case and is
   rejected as a language change (it may stay as a hypothesis about that system).
5. **Validation**: predictions on held-out observations; the comparison rule.
6. **Promotion**: the term enters the language with a hash; every derivation depending on the variables it touches
   is stale by hash and regenerated.

The preference the directive asks for is a rule of the search order: a candidate that adds a distinction (a variable,
a coupling type, a window) is tried before one that adds a constraint on one instance; a constraint that mentions an
instance's identity is never a candidate.

---

## Part VI. The law hierarchy

The families (spatial, mechanical, thermal, electrical, fluid, chemical, information, control, material, interface,
environmental, manufacturing, biological, scale, geometric, existence) were my taxonomy. They are generated by
something smaller:

```
conserved quantity (momentum, energy, charge, mass, information)      fundamental
   × constitutive relation (how a material carries it: E, σ, k, μ)    fundamental, measured
   × domain geometry (extent, boundary, dimension of the coupling)    L6
   × observer window (resolution, tolerance)                          L6
→ derived relation (statics, beam bending, Ohm, Fourier, Euler buckling: each is a coarse-graining of the
  fundamental under a validity domain that is the coarse-graining condition)
→ constraint (a derived relation with an inequality: strength, capacity, resolution)
→ configuration space (the manifold of bindings satisfying all constraints)
→ possible behavior (dynamics inside it)
→ construction (a point or region chosen by intent and preference)
```

Mechanical is momentum with the constitutive relations of solids; thermal is energy with Fourier and heat capacity;
electrical is charge with Ohm; fluid is mass and momentum with viscosity; control is information with a chosen law;
interface is the coupling layer itself; spatial and geometric are the domain layer; environmental is the boundary
layer; manufacturing is the realization layer; scale is the window. There is no biological family: an organism is a
system with all of the above and a control loop; the family was a human category.

If a placement law is discovered that the generator could not produce, one of four things was missing, and the
repair is to that thing, then regenerate: a conserved quantity not yet carried by any variable; a coupling type not
yet expressible (two boundaries with a shared variable of a kind the language lacks); a window not declared (the
clearance that turned out to be the realization's penetration bound); a domain relation not expressible (a position
relative to a field rather than a frame). "Missing law → add law" is forbidden; "missing law → which of the four, repair
it, regenerate the space" is the rule.

---

## Part VII. Code and law as one system

Can conventional application code guarantee full causal traceability? No. In TypeScript any expression can produce a
number, any branch can decide an effect, and no type can forbid it. A `Traced<number>` type is a convention beside the
real one; the audit in the stash is a regex. The strongest a conventional language can give is a checker afterwards,
which the directive rightly calls the wrong primary architecture.

Nexus therefore needs its own executable representation:

```
Nexus text (a readable form of terms: LAW, STATE, RELATION, VARIABLE, CONSTRAINT, DERIVATION, MANIFOLD, OPERATOR,
            CONSTRUCTOR, EFFECT, OBSERVATION are surface forms of the five primitives)
→ semantic IR: content-addressed terms (the Nex core, with bindings and domains added)
→ dependency graph: by hash (the registry that exists)
→ derivation graph: every evaluation a record with inputs, laws, status, window
→ execution plan: which realization answers which term (closed form, numeric solver, rigid-body engine, renderer),
   chosen by validity domain and window, each with an error contract
→ backend: TypeScript and WebAssembly as compiled targets of realizations; Jolt is one realization
→ runtime: state as bindings; every effect a derivation record
```

The backend may inline, cache, compile and transform. It may not introduce a value or a decision that no term made:
the test is that the runtime's state after any step is reproducible from the derivation graph alone. This is what
docs/NEXUS.md §A proposed on 2 October; the implementation since then built the knowledge base beside the runtime
and never put the runtime under it.

---

## Part VIII. Traceability: the thirteen questions

For every effect: what happened is the derivation record binding a runtime variable; why is its term; what caused it
is its inputs; what law permitted it is the relation in the term; what assumptions are the leaves of status assumed;
what constraints limited it are the constrain-mode terms in the solve that bound it; what derivation produced it is
the record; what variables determined it are its leaves; what observation supports it are the measured leaves and the
comparison records; what uncertainty exists is the status and interval propagated; what code executed it is the
realization's identity and contract; what semantic object authorized the code is the term the realization was chosen
for; what downstream state it affected is the forward closure in the dependency graph.

Today two of these are impossible by construction, and they name the missing primitives. A runtime body has no term
identity (parts live in a document, not as bindings): the missing primitive is the binding of runtime variables to
terms (L5 and L9). The engine is called directly: the missing primitive is the realization morphism with its contract
(L9). The remaining eleven are possible only along the one path traced in the stash, which is the proof that the
answers are a property of the substrate, not of effort.

---

## Part IX. Unknown as a first-class value

The status lattice and its rules:

| status | made by | combines as |
|---|---|---|
| fundamental | a declared constant with its fixing source | strongest |
| measured | a measurement leaf with source, instrument, window | its uncertainty propagates |
| derived | an evaluation | the weakest of its inputs |
| empirical | a fitted relation with its data | carries the fit's domain |
| estimated | a declared estimate with grounds and a range | the range propagates |
| assumed | a declared assumption with who and why | marks every dependent |
| hypothesized | a candidate from abduction | never binds a runtime variable until validated |
| unobserved | a variable the window cannot resolve | not unknown: the observer says why |
| unresolved | an anomaly without a validated explanation | stays open in the journal |
| unknown | a variable with no value | any derivation from it is unknown |
| contradicted | two evidences that disagree past tolerance | both kept; the term is not usable |
| outside-validity | an input outside a law's domain | the evaluation is refused with the domain |

The two forbidden transitions are enforced by the absence of a constructor: there is no way to write a leaf without an
origin class, and the solver has no rule that assigns a value to a free variable. So "unknown → silent default" cannot
be written, and "missing law → fallback" cannot be written either: a missing law leaves a free variable, which is
reported as the gap it is. An unknown may exist for as long as it likes. An unexplained effect cannot exist, because
an effect is a derivation record and a record has inputs.

---

## Part X. Construction, restarted

The proposed order is right in its direction and wrong in treating the steps as a pipeline. They are a single
constraint system solved with intent as the first constraints and realization as the last; the "order" is the order in
which variables become determined:

```
intent (constraints on behavior: carry W, at height h, within reach r, in environment E)
→ required behavior (the variables that must take values: a reaction, a stiffness, a stability margin)
→ transformations (which conserved quantities flow and convert: load to support, nothing else here)
→ capabilities (which relations are available: the laws the material and the stock admit)
→ interactions and flows (the couplings the behavior needs: support to ground, load to surface)
→ interfaces (the shared variables at those couplings)
→ constraints (strength, buckling, sag, overturning, clearance, reach: all as constrain-mode terms)
→ manifold (the solver's region)
→ architecture (the coupling topology that the region admits: posts and a surface, or a cantilever)
→ geometry (the extents the constraints require: a thickness, a length, a footprint)
→ materials (the constitutive bindings that make those extents feasible)
→ placement (the coupling solution: coordinates)
→ assembly (the order in which couplings can be made: the dependency order)
→ realization (stock chosen; the engine's bodies)
```

Geometry first appears as extents when a constraint carries a spatial derivative: stress needs an area, buckling a
length, sag a span and a second moment. Shape appears only at realization, when stock is chosen. Material first
appears when a constitutive relation is instantiated, which is before any shape and after the flows. Location appears
last, as the solution of coupling constraints. An object becomes an object when a connected region's internal
couplings are rigid within the window, which is the rigid domain applied to a region: object-hood is observer-relative
and derived. A component becomes identifiable when a sub-region's boundary variables are few relative to its internal
ones: modularity is the dimension of an interface, computable, and the reason a motor is a motor.

---

## Part XI. The middle space

Every item in the directive's list is generated by one abstraction: a coupling over a domain, which is a shared
variable at a boundary with a conservation law across it, taken over time.

| the middle thing | as a coupling over a domain |
|---|---|
| state | a binding |
| transition, event | a change of binding; a threshold crossing of a constrain-mode term |
| process, pathway, mechanism | a term over the time domain; a chain of couplings |
| interaction, interface | the coupling and its boundary |
| flow, transport, propagation | a conserved quantity crossing the boundary; its rate; its travel over the space domain |
| gradient, field | a quantity over the domain and its derivative |
| transformation, reaction, conversion | a coupling between two conserved quantities' variables |
| intermediate, assembly stage, development | the binding at an intermediate time; the coupling order |
| accumulation, dissipation, exchange | the time integral at a boundary; the irreversible term; the paired flow |
| feedback, control | a coupling that closes a loop in the derivation graph; a coupling whose law is chosen by information |
| degradation, failure | a constitutive relation crossing its domain; a constrain-mode term going false |
| boundary, constraint, threshold, phase, regime | the domain's edge; a constrain term; the term's edge; a region of the manifold; the same |
| emergence | a coarse-graining under which a new invariant appears |

"A → what happens between → B" is a term over the time domain whose value at every time is a binding; the middle is
not secondary because the term is the primary object and A and B are its ends.

---

## Part XII. Scale

Scale is three things at once, and the representation must hold all three without collapsing them:

- **A coordinate on every quantity**: its characteristic magnitude, carried with the dimension. Without it a law
  cannot say where it holds; with it, dimensionless ratios (Reynolds, Froude, Strouhal, tick over sound crossing) are
  computed, and a validity domain is a bound on a ratio.
- **An observer relation**: the window (resolution, tolerance, tick) through which a description is made. The tsc
  branch has this right: coarse-graining is an operator with a residual bound; the rigid domain is the window against
  the sound crossing; sampling is a limit.
- **A transformation between descriptions**: the morphism from one theory to its coarse-grained successor, with a
  contract; self-similarity is a law invariant under it.

Characteristic length, time, frequency, propagation latency, densities, rates, lifetime, cross-scale coupling are the
ratio language built on the first; coarse-graining and refinement are the third; observation rate is the second. The
scale hypothesis as a testable model: predict, for a law held at one scale, where the same law fails at another scale,
and demand that the failure be only a ratio bound crossed; any failure that is not a ratio bound is evidence against
the hypothesis and is recorded as such.

---

## Part XIII. Space

(x, y, z, s) is not a primitive. Positions are solutions of coupling constraints relative to other bodies and to
fields; a Cartesian frame is a convention term that a projection uses; scale is not a fourth coordinate of position but
a coordinate of quantities and a parameter of windows. The primitive representation is: domains (spacetime with a
declared metric convention; the configuration space of a system), fields over them, relational constraints between
regions, and the frame as a convention with provenance. Renderer coordinates are derived at projection time. This
also removes the flat floor: "y = 0" was a frame convention mistaken for a fact.

---

## Part XIV. Environment

A world is: a domain; fields over it (gravity, the material field whose regions are ground, water, air and every
object, temperature, light); boundaries and sources as declared boundary conditions (the sun, the ground's fixed
region, the sea's surface); couplings between regions; the observers. "Object" and "environment" are both regions of
the material field; the environment is the set of regions whose variables are given rather than solved. An object
cannot exist without an environment because its boundary variables need their counterparts. An environment can exist
without objects, as fields, and then it is simply the world. Both are projections of the field-and-coupling structure;
the places table becomes a few sourced field parameters and the beach's slope keeps its citation.

---

## Part XV. Geometry

Geometry is caused by constraints meeting a material field: extents from constraints (a length the buckling law
needs, a thickness the bending law needs, a footprint the overturning relation needs, a section the transport rate
needs); regions as level sets of the material field; flat faces from contact couplings; swept volumes from motion;
shapes from manufacturing, which is a configuration with provenance (stock); stability and environment through the
constraints they add. Fixed primitives (box, cylinder, plate, tube) are realizations in a catalogue, chosen last,
never the truth the laws are checked against afterwards. The generator is the solver of Part III L8 with the material
field of L6; it needs no shape vocabulary of its own.

---

## Part XVI. Placement and spacing

No placement engine. The configuration manifold is generated by couplings: support (momentum balance through
contacts with the ground field), clearance (the window's resolution plus the realization's penetration contract plus
the manufacturing tolerance), access (a person's reach as a constraint from a sourced measure), flow paths, thermal
exchange, electrical and mechanical coupling alignment (coincidence of shared boundary variables), manufacturing
(assembly order as the dependency order of couplings), maintenance and observation (lines of sight and reach), scale
(the window). Coordinates are a solution point; when the solver reports free dimensions the design has freedom and a
declared preference or the person's choice picks, visibly. This week's relational placement is the prototype of
exactly this, implemented over boxes instead of fields.

---

## Part XVII. Category

Nexus does not need categories as primitives. A category is a human compression of a recurring relational structure.
It can be recognised: the forms census already finds that five energies in three theories are one form and that
torque and potential energy share a form; the same operator over systems clusters them by interface signature
(which conserved quantities cross the boundary, how many boundary variables), coupling topology (the hash of the
coupling graph's shape), dynamics regime (the ratios), and history (the journal). A dog is the class of systems with a
body region, four actuated chain couplings to a ground field, a control loop and an energy source; a motor is the
class with a rotation coupling, an electric coupling and a thermal path. The word is attached afterwards as an alias in
the substrate, carrying no behavior. Two structures belong together when their shapes hash alike at a level of
coarse-graining; the level is the window, and it is declared.

---

## Part XVIII. Memory

The reusable unit of knowledge is the derivation, not the object: laws as terms; derivations with provenance;
constructors as solved manifolds parameterised by intent ("a support for load L at height h in material M" is a region
with a hash, not a template); meta-constructors (the abductions that found them); causal patterns (coupling topologies
with their invariants); transformations with contracts; observations, experiments and failures in the journal;
invariants under transformation; construction potential (what a region admits). Objects, templates and parts are
cached solutions: a derivation with its constraints retained, replayable, and stale by hash the moment a law under
it changes. The catalogue of stock and the materials with sources stay as data because they are leaves with origins.

---

## Part XIX. Failure

The protocol as given is right and is sufficient only with one addition, the level rule. Failure → the causal trace
(which derivation predicted what, through which couplings) → the violated constraint (which constrain-mode term went
false, or which solve had no binding) → the missing variable, relation, law or manifold found by abduction → the
abstraction level, determined by which conserved quantity, coupling type, domain relation or window the candidate
touches → generalization as the count of systems in the journal the candidate changes → language update → regeneration
by hash of everything depending on the touched variables.

The addition: a candidate whose level is an instance (a dog, a table) is never a language update; it stays a
hypothesis about that instance until a type-level candidate subsumes it. That is what makes a dog's failure improve
bridges: the dog that rolled gave "a support contact must lie within the realization's penetration domain of the
field it rests on", which is a coupling-and-window relation and governs a crate on sand and a pier on a river bed. If a
failure only improves dogs, the candidate was at the wrong level and the protocol says so.

---

## Part XX. Tests of the architecture

| test | mechanism that proves it |
|---|---|
| trace | pick any runtime variable; `WHY` is total and ends only in leaves with origins; a bare value is unconstructable |
| derivation | every bound value has a record; recomputing the record from its term reproduces the value |
| unknown | remove a law from a solve; the free variable is reported; no binding is produced; the runtime does not move |
| generalization | a failure's accepted candidate changes more than one system in the journal; an instance-level candidate is refused as a language change |
| recomposition | the same law term evaluated at two scales differs only where a ratio bound is crossed, and the bound is named |
| language extension | a system with a variable the language lacks produces the missing-distinction term, not a special case |
| construction | an intent produces a configuration with no term in the derivation that names a kind of thing |
| environment | the same intent on a flat field, a sloped field and a field with a hole produces configurations differing only in the coupling solutions |
| category independence | no term of the language tests an identity; categories are computed classes and renaming one changes no behavior |
| geometry | extents in every configuration cite the constraint that required them; no extent has an origin of kind assumed unless declared as stock |
| placement | every coordinate is a solve result; a placement with free dimensions reports them |
| causal closure | every state transition in the runtime is a derivation record; the ledger balances every coupling |
| realization contract | the engine's deviation from the term's prediction stays within the contract or raises an anomaly naming the contract |
| staleness | changing a law's term marks exactly the derivations that cite it, and regenerating them changes exactly the runtime variables they bind |
| polysemy and category | a word or a class reaching two senses is split by structure and never chosen in silence |

---

## Part XXI. The dog as an autopsy

| the failure | the missing abstraction |
|---|---|
| a servo without a physical body | capability = a relation available at an interface (an actuator is a torque law coupled to two regions), never a flag on a part |
| a servo with no power source | causal resource dependency = conservation of energy with a declared source term; an actuator's power is a coupling to a store, and the ledger is the law, not a watchdog afterwards |
| a clock-driven gait | causal control pathway = information couplings as terms; a clock is a declared observer window, never a cause; the rhythm must be a coupling from a controller region |
| a rubber foot intersecting a leg | physical attachment = a coupling with coincident boundary frames and a constraint on relative motion; coincidence is a shared variable, not a 20 µm check afterwards |
| a renderer servo that is not a body | the projection relation = a realization morphism with a contract; the renderer draws regions of the material field that are bound by terms and nothing else |
| dog-shaped metadata | structural identity = the hash of the coupling topology; "dog" is an alias of a class |
| ground coordinate hacks, the buried foot, the release distance | environmental support = a contact coupling to a field satisfying momentum balance within the realization's penetration contract; where a thing is released is a solution of that coupling, not a number in front of you |
| urges as constants (0.5, 0.2, dt/40) | a mind is a controller region whose law is declared, with its parameters as assumptions with grounds, or learned as empirical relations with data |
| the trot that works and the roll that happens at one spot | a behavior is an observation of a realization; its robustness is a property of the manifold (the set of fields over which the configuration stays in the regime), computable, not a test that passes on one beach |

---

## Part XXII. Red flags: stop immediately

- If a new kind, role, family, flow word or category string is needed → STOP.
- If a law table, a stage table, a places table or a defaults table is needed → STOP.
- If a branch tests an identity (`what === 'table'`, `kind === 'servo'`, `isWood`) → STOP.
- If a number appears without an origin class → STOP.
- If a shape, a size or a coordinate is written rather than solved → STOP.
- If a validator rejects a state that should have been unconstructable → STOP and move the invariant into the constructor.
- If the renderer draws what no term binds → STOP.
- If the engine is called from anywhere but a realization morphism → STOP.
- If a behavior depends on a wall clock, a random source or a global → STOP.
- If a failure's fix changes one system → STOP: the candidate is at the wrong level.
- If a new law cannot say which of the four generators was missing (quantity, coupling, window, domain relation) → STOP.
- If a lesson, skill, preference or memory is keyed by a kind → STOP.
- If an unknown is filled by a default to make a test pass → STOP.
- If a test asserts an output without asserting its derivation → STOP.
- If a doc describes an architecture the code does not run → STOP, as happened with NEXUS.md.
- If a "traced" value can be bypassed by a plain one in the same module → STOP: the substrate is not exclusive.

---

## Part XXIII. Three architectures

**A. Keep and repair.** Finish the stashed substrate; convert every generator to traced operators; replace every
category branch with a variable test; re-express the 145 laws as terms; put the engine behind a morphism; keep the
document of parts. It would take the longest, because every conversion fights the document-of-parts and the TypeScript
freedom that remains underneath; the risks that remain are the ones that produced this week: exclusivity is a
convention, generalization is by class, the renderer and the engine stay reachable. It cannot reach "impossible to
create untraced behavior".

**B. Hybrid rebuild.** A new semantic core (L0–L5, L7, L10) under the existing runtime, with the engine and renderer
wrapped as realizations and the document of parts kept as the runtime's store, generated only through bindings. The
designs, grammar, construction families, creatures, places and intent regexes deleted; the laws and data imported as
terms and leaves; the journal, dependency registry and Nex core reused. The risk is the seam: as long as the document
of parts can be written by anything but a binding, the seam leaks, and the VR client's tools (grab, place by hand,
weld) write it today. Those become realizations too (a hand placement is a given leaf with the person as origin).

**C. True restart.** A new repository with the ten things of Part XXIV; the physics kernel, the Nex core, the units,
the materials, the laws' data, the conformance tests and the journal brought across as components and data; the VR
client rebuilt later as a projection of realized state. Everything else is observations.

| | A keep and repair | B hybrid | C restart |
|---|---|---|---|
| conceptual complexity | highest: two models of the world at once, forever | medium: one model with a declared seam | lowest: one model |
| implementation complexity | very high and open-ended: 209 branches, 8,497 numbers, 11 generators, every one converted in place | high at the seam, then falling | high at first, then the lowest of the three |
| technical debt | grows: every conversion leaves the old path reachable | bounded by the seam | none carried but the kernel's |
| traceability guarantee | no (convention) | yes inside the core; the seam audited | yes, by construction |
| generates new laws | no: the generator layer does not exist in TS | yes | yes |
| generalizes failures | by class | by type | by type |
| supports scale | in one branch | as a coordinate everywhere | as a coordinate everywhere |
| supports construction | templates with better arithmetic | from intent | from intent |
| emergent categories | no | yes | yes |
| maintainability over ten years | poor: the document of parts is the architecture | fair | good |

**Recommendation: C, done as B for its first months.** Delete everything except tests, observations, documentation,
data and the physics kernel, and rebuild the core on the five primitives, in a new tree under the same repository so
the kernel, the data, the conformance tests, the journal and the e2e harness are reachable without ceremony. The old
application stays runnable on its branch as the observation set and as the client to be rebuilt against; nothing in
it is extended again. The one thing I would resist is deleting the physics kernel and its conformance tests: they are
the only part of the codebase that is already a realization with measured error, and the restart needs one realization
on day one.

---

## Part XXIV. The first ten things

1. **Quantity.** Magnitude, dimension, characteristic scale, uncertainty, status; the dimension algebra and
   Buckingham groups. Why now: it is the type of every other value. Depends on nothing. Enables terms and laws. Must
   not contain units as anything but conventions, nor a status default. Proof: dimensional nonsense cannot be
   constructed; the groups of (ρ, v, L, μ) are found without being told Reynolds.
2. **Term and identity.** Leaves with origin classes, applications, canonical form, content hash (the existing core
   generalised). Why now: identity before anything is stored. Depends on 1. Enables everything. Must not contain
   names in hashes. Proof: equivalence by hash; one leaf change moves exactly the dependent hashes.
3. **Evaluation as derivation.** Every evaluation returns a record (term, inputs, output, status, laws, window); no
   function returns a bare value. Why now: the invariant is cheaper to build than to retrofit. Depends on 1, 2. Enables
   WHY. Must not contain a backend call that returns a number. Proof: WHY total on every value.
4. **Status and validity.** The lattice of Part IX with its combination rules; validity domains as constrain terms;
   refusal with the domain named. Why now: unknown must be first class before the first law. Depends on 3. Enables the
   solver's honesty. Must not contain a default. Proof: unknown in, unknown out; outside-domain refused.
5. **Laws as terms.** The book re-expressed; each law's example a test of the compiler; inversion by numeric solve.
   Why now: the first content. Depends on 2–4. Enables constraint systems. Must not contain closures. Proof: 145 laws
   evaluate forward and invert from the same term; every hash cited.
6. **Constraint systems and the solver.** Variables, instantiation, bindings, free variables reported, contradictions
   named; intervals first, numeric second. Why now: construction and explanation are both this. Depends on 1–5. Enables
   construction. Must not contain a choice rule for free variables. Proof: two bars and a load; one law removed, one
   variable free, nothing filled.
7. **Domains, fields, observer.** Space and time; quantities over them; boundaries; the window as the coarse-graining
   operator (the tsc branch moved here). Why now: ground, position and the rigid domain are field and window
   questions. Depends on 1–6. Enables couplings and realization. Must not contain a frame as a fact. Proof: the ground
   under a point is a field query; the rigid domain is computed from the window.
8. **Couplings.** Shared boundary variables with conservation; contact, support, joint, flow as instances; the ledger
   as the conservation check. Why now: the middle space and the dog's four failures all live here. Depends on 6, 7.
   Enables construction and causal closure. Must not contain a kind table. Proof: a joint's load is read from the
   solution; the ledger balances.
9. **Realization morphisms.** The rigid-body kernel wrapped with its contract and domain; a closed-form realization;
   the renderer as projection. Why now: the restart needs one realization on day one and it exists. Depends on 7, 8.
   Enables observation. Must not contain a direct engine call anywhere else. Proof: a body exists if and only if a
   term binds it; deviation within contract or an anomaly.
10. **Observation, comparison, journal.** Measurement leaves, the comparison rule with tolerances from contract and
    window, anomaly terms, the append-only journal and its one rule, abduction of the missing variable at the type
    level. Why now: it closes the loop. Depends on 9. Enables language growth. Must not contain a hypothesis
    vocabulary. Proof: the shelf, the dog and the lookup reproduced from their observations as anomalies with the
    missing relation named.

Not among the ten, deliberately: intent in natural language, the headset, the tablet, any creature, any machine, any
design, any category, any template, any family of construction laws.

---

## Part XXV. The first vertical slice

A beam on two supports under a load, nothing more.

- **Intent**: carry W = 60 kg (a given leaf) across a span L = 1.2 m (a given leaf) with sag under L/300 (an assumed
  leaf with grounds) in a material whose constitutive relations are measured leaves (E, strength with their source).
- **Semantics**: variables for the reaction at each support, the moment, the section extents (b, h), the sag; a
  constrain-mode term for strength at a declared factor (an assumed leaf) and one for sag.
- **Laws**: weight (gravity field as a sourced leaf), momentum balance (the reactions), the mid-span moment, bending
  stress, the sag of a simply supported beam, each a term with a validity domain (slenderness as a ratio bound).
- **Derivation**: the moment from W and L; the required section modulus from strength and the factor; the required
  second moment from the sag limit; every record with its status (the weakest input: assumed, because of the factor).
- **Constraint and manifold**: the set of (b, h) satisfying both; h free along a curve: the solver reports one free
  dimension.
- **Construction**: the preference "least material" (a declared leaf) and a stock catalogue (configuration leaves)
  pick (b, h); placement is the coupling solution: supports at the ends, the beam resting on them, coordinates
  derived in a declared frame.
- **Runtime**: the rigid-body realization binds three bodies and two contact couplings, with its contract (penetration
  bound, tick, rigid domain checked against the beam's sound crossing).
- **Effect**: equilibrium; a measured sag from the engine, a leaf of status measured with the window.
- **Observation and explanation**: the comparison of measured sag with derived sag within the contract; WHY on the
  measured sag returns the whole chain down to Pheasant-free leaves: the given load, the given span, the assumed
  factor, the measured modulus with its handbook, the stock; IMPACT on the bending law returns the section extents,
  the bodies and this comparison.

If one link of this chain cannot be traced perfectly, nothing larger is built. The slice contains no table, no kind,
no default, no coordinate written by hand, no number without an origin.

---

## The final question

What I would build first: the typed judgment and its evaluator (Part XXIV 1–4): quantities with dimension, scale and
status; terms with identity; evaluation that can only produce derivation records; unknown and validity as the
lattice. Then laws as terms and the solver. Everything that has ever gone wrong in this repository went wrong because
a number, a shape, a coordinate or a decision could exist without one of those four things, and once the four exist
nothing else can be built wrongly in the same way.

What I would absolutely not build yet: a dog, a motor, a table, a beach; a category, a family, a role, a kind; a
construction library, a component library, a template, a default; a natural-language front-end; the headset and the
tablet; a renderer that is anything but a projection of bound terms; a second realization before the first has a
measured contract; a learning mechanism before the comparison rule exists; and any line of ordinary application code
that can decide what exists in the world.
