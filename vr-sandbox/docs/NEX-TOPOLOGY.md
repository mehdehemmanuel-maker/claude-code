# The native topology: what produces the organisation we keep describing in English

3 October 2026. An answer to the question "what native mathematical structure produces the behaviour we call
law, family, memory, frontier, foundational?", written in English because it has to be read, with every paragraph
marked as one of two things:

- **HUMAN RENDERING**: a word we use for a pattern. It is a view. Nothing is stored under it.
- **NATIVE STRUCTURE**: an operation or an object in the term algebra (src/ganglia/native/core.ts) or a property
  computed from it. It is what exists.

The rule of this document: the English description is not the design; the structure is. Where a word has no native
pattern under it yet, that is said, not papered over.

Everything measured here was measured on the law book as it stands (142 laws) with every human label withheld
(no domain, no tags, no names, no symbols, no tree node): only dimensions, exponents and constants entered
(tests/unit/native.test.ts, "the shape of a law without its names"; the probe that produced the full census is
summarised in §14).

## 1. The deepest native operations already present

Each of these exists in code, under a less general name, and none of them needs a category to run.

| native operation | where it lives today | what it is |
|---|---|---|
| **Normal form and hash** | core.ts `normalize`, `hash` | identity by structure: two things are one thing iff their normal forms are one; names, aliases and units are outside the hash |
| **Anti-unification** (a shape with variables, the least general generalisation of several structures) | morpheme.ts `shapeOf` ($1, $2 in order of first appearance); forms.ts `formOf`/`shapeOf` (a law with its symbols gone) | the generalisation operation: from instances to the structure they share |
| **Instantiation** (a shape applied to arguments) | core.ts morpheme reference `M` with `args`, expanded before comparison | the reverse: from a shared structure to one of its instances |
| **Forgetting** (a projection that drops a coordinate) | forms.ts `shapeKey` levels 0 → 1 → 2 (keep every term's dimension; forget the inputs' dimensions; forget the output's) | the same generalisation, taken one coordinate at a time; it is what produces levels without anyone defining levels |
| **Description-length criterion** | morpheme.ts `promote` (a morpheme is promoted iff it shortens the corpus); grammar.ts (eight morphemes, 17 % shorter corpus) | the label-free test for which shared structure deserves to be compiled into an operator |
| **Dimensional homogeneity** (a linear system over the base-dimension lattice) | units.ts `Dim` (a vector in Z^5), discover.ts (the null space of the dimension matrix: Buckingham Π), forms.ts `shapeOf` (constants take the exponent homogeneity demands; the residual must be zero) | a type system and a generator of invariants: what can relate to what at all, and what dimensionless groups a set of quantities admits, before any measurement |
| **Behaviour probing** (exponent of an output in each input at a point) | forms.ts `exponent` (three multipliers, a power only when the slopes agree) | the way a law whose content is a closure is read back into structure; a workaround for content not being a term (§13) |
| **Interval composition of certainty along a derivation** | core.ts `chain` (Fréchet bounds) | how a derivation's certainty follows from its parts without a probability model being assumed |
| **Residual comparison** | discovery.ts `residual` (Mahalanobis with diagonal covariance), `anomaly` (a `contradict` with a margin and the model it is under) | the one comparison rule between a prediction and an observation |
| **Domain membership** | laws `outside`, core `dom`, discovery `certificate` (entailed / bounded / contradicted / outside) | whether a structure applies here at all |
| **Typed adjacency with inverses** | substrate.ts (indices both ways), model.ts `INVERSE_OF` | the graph read in either direction from one stored arrow |
| **Lineage by parents** | mind/journal.ts `parents`, `physics` | what a commit was derived from, and under which physics |
| **A transformation between structures under a condition** | core.ts `T {from, to, cond}` | one state to another by a mechanism; also what a revision is: the old structure to the new one, under the evidence that forced it |

Three of these are the whole engine of organisation: **identity** (hash), **generalisation/instantiation**
(anti-unification and its inverse, with forgetting as its one-coordinate form), and a **criterion** (description
length) for which generalisations matter. Everything in §7 and §8 is built from those three plus **lineage**.

## 2. Current English-named concepts that are views over those operations

| HUMAN RENDERING | NATIVE STRUCTURE that produces it |
|---|---|
| **family** (of laws, of parts, "the energies") | the set of instances of one shape at some level of forgetting: a principal down-set in the generalisation order. "The energies of five theories" is the level-1 class `J ⇐ 1,2` (an energy, one input times another squared): kinetic, rotational, spring, capacitor, inductor. Nobody put them in a folder; the class is computed (tests/unit/native.test.ts). |
| **category / domain** (mechanics, electrical, thermal) | mostly the set of base dimensions a law's quantities span (level 3): `MLTI` is what we call electrical (17 of 24), `MLTΘ` thermal (9 of 10). `MLT` is 45 laws that humans split five ways (mechanics, structures, machine elements, fluids, materials) by what the quantities *are*, not by their dimensions. Normalised mutual information between the human domains and the computed classes: level 1 0.64, level 3 0.56, level 2 0.43. So "domain" is a lossy view of structure, about 60 % structural and the rest convention. |
| **foundational / fundamental law** | a shape with instances below it and nothing above it in the generalisation order: a maximal element with support. Computed, not declared. On the monomial fragment of the book there are 6 such maxima and the longest chain is 2 (§14): the current abstraction is shallow, which is a fact about the abstraction, not about physics. |
| **derived law, limiting case, special case** | an instance of a shape with one term held (a constant, or a dropped input): `grade.force ⊐ newton.second`, `cornering.limit ⊐ free-fall.speed`, `chain.speed ⊐ belt.speed` were found this way with no name used. A limiting case in the stricter sense (an `approximate` transformation with a domain: small angles) is the same relation with the condition carried in `cond`. |
| **merge** ("these two are one") | equal hashes, or one shape above both at the finest level that still distinguishes everything else. `drag.aero` and `lift.aero` are one shape at level 0; `weight` and `newton.second` are one shape at level 0. |
| **split** ("this one is really two") | a class whose members disagree on a coordinate the class forgot: the level-1 class `J ⇐ 1,1,1` holds `energy.potential`, `heat.capacity`, `gear.output.torque` and `bolt.torque`, which a dimension cannot tell apart (a torque and an energy are both kg·m²/s²). The split is demanded by a distinction the quantity carries and the dimension does not (§6). |
| **compiled operator** | a morpheme: a shape promoted by the description-length criterion, expanded exactly before any comparison. |
| **memory** | evidence leaves with a time coordinate, appended and never edited: the Mind's journal. Recall is a query over `time` and `parents`. It behaves like memory because leaves are sealed and ordered; there is no memory table. |
| **frontier / open question** | every structure whose mode is one of the ten ways of not being so (`unknown`, `unmeasured`, `contradictory`, …) and is reachable from something held: `unresolved()` is a filter, not a store. |
| **confidence** | a coordinate on a relation (`cert`, an interval or a distribution), composed along derivations by `chain`; never a stored scalar on an entity (§3). |
| **hierarchy, parent, child** | the Hasse diagram of the generalisation order, rendered as a tree where it happens to be one; it is a DAG with multi-parent regions (a structure that instantiates two incomparable shapes) and it is not stored. |
| **bridge** | a structure that is an instance of two shapes with no common generalisation below the top, or a law whose terms span base-dimension classes that nothing else joins (`landauer`: Θ and E, information and thermal). An articulation point of the instance graph, computed. |
| **settled enough to run cheaply** | a structure whose derivation closure has no open mode: its value can be memoised by the hash of its inputs (the workflow cache already does this by fingerprint). |
| **unresolved** | an open mode somewhere in the closure. |
| **generalise, specialise, instantiate, derive** | one operation and its inverse (anti-unification / substitution) plus `T` for the step; four English words for two native moves. |
| **reopen** | a new evidence leaf whose `parents` reach a closed structure: the mode of that structure is recomputed, lazily (§8). |

## 3. Current categories that are prematurely hard-coded

These store the rendering instead of the structure. Found by reading for enums, unions and ordinal lists.

| where | what is stored | what should produce it |
|---|---|---|
| laws.ts `domain` (11 values), `tags` (329 distinct words) | a folder and keywords per law | the level-3 class and the shape; words are aliases on distinctions, not identity |
| substrate model.ts `KINDS` (16), `RELATIONS` (28 with English "asks"), `FACETS` (11), `Coverage.sourceKind` (9) | the kinds a thing may be, the arrows it may have, the questions it may be asked | kinds are shapes an entity instantiates (`kind` relations, computed); relation kinds are distinctions on the `kind` coordinate of a relation, open-ended; facets are the coordinates of a structure not yet filled (`unmodelled` along that coordinate) |
| substrate `Relation.confidence: number`, `Coverage.confidence: number`, `coverage.depth 0–3` | belief collapsed to a stored scalar and an ordinal | `cert` intervals from evidence leaves, composed; depth is the size of the known closure, computed |
| population.ts `priorityBase` | a hand-weighted score (log of degree, "leverage" by kind, "engineering" by domain name) | structural signals only, no weights: how many open modes a question would close, how many derivations reach the entity |
| tree/schema.ts `NodeKind` (14), `Epistemic` (6), `ProofStatus` (6) | the kind of knowledge a node is, declared | computable from the structure's evidence leaves and its position in the generalisation order (a theorem has a derivation with no empirical leaf; a constitutive law has a measured leaf over a material distinction; a hypothesis has `hypothesized` only) |
| native/core.ts `EVIDENCE` (an ordinal list of ten kinds) and `TIER_OF` | a hand-ranked ladder | the strength of a leaf is bounded by the validation of what produced it (a simulated leaf by its model's measured leaves); a rank is a view of that, and the ladder is at best a default when nothing deeper is known |
| native/epistemic.ts `Species` (5), `labelOf` | a taxonomy of evidence and a labeller | the leaves themselves, tallied; the label is a rendering (it already is, but the species list is still a fixed enum) |
| manifold/manifolds.ts `lineage`, `childrenOf`, `descendantsOf` | a hand-drawn tree of families | the generalisation order over the families' shapes |
| grow.ts `LEVELS`, `System`; frontier.ts `Label`, `Group`; challenges.ts `Level` (6) | fixed levels and groups | the modes of the structures the attempt produced (challenge.ts already maps levels to modes: the levels are the view) |
| intent.ts `Intent` (about 60 shapes), ego.ts `act()` (54 cases) | the kinds of request a line may be | the structure the line parses to (a request is a structure with the asked coordinate `unmodelled`), one tuner |
| mind/journal.ts `Kind` (7), `Status` (8), `Origin` (4): the slice's own envelope | what a commit is, declared | **also a rendering, and I wrote it yesterday.** `observation` vs `evidence` is "has parents"; `anomaly` is a `contradict` with a margin; `hypothesis` is `ev.how = hypothesized` with mode `unknown`; `belief` is the same structure with a settled mode; `question` is mode `unmeasured`; `request` is mode `unmodelled`; `testing` is "an instrument named, no leaf yet"; `resolved` is "no open mode in the investigation". All derivable; the envelope should carry only what is not derivable (parents, session, physics, cost). |
| reports.ts `Trouble`, growth.ts `Ability`, world/mind.ts `Want` | fixed vocabularies | the first two go with their subsystems (AUTOPSY); `Want` is a creature's urge, a distinction with a strength, fine as data |
| parts/registry `kind`, connectors/registry kinds, `implementedIn` strings, tree `Realised {module, symbol}`, understand.ts `file#symbol` | world-object classes and code maps as strings | a kind is a shape a part instantiates (its parameters are the terms); a realisation is a `morphism` to a code distinction with an error contract, read from the code by a build step, not typed by hand |

## 4. Apparently separate systems that collapse into one native mechanism

| separate today | one mechanism |
|---|---|
| skills (repeated Forge steps → a macro), morphemes (repeated sub-structures → an abbreviation), templates (a repeated build → a thing to place), manifold promotion (siblings sharing functions → a family) | anti-unification over a corpus plus the description-length criterion: the same compressor over sequences of construction actions, structures, builds and entities |
| the construction gate (refuses a part), the stand (refuses a design), the certificate (refuses a claim), `ingest` (refuses a relation), the morpheme promotion (refuses a shape), the Mind's `judge` | one judgment: a structure, a validator, a result with a mode and a margin, and lineage. They differ in the validator, never in the shape of the judgment (AUTOPSY §J kept them separate for one more slice; the collapse is the next) |
| the law tree's parents, the manifold lineage, the ganglia graph's `uses`, the substrate's `is-a`, the forms' shared forms | the generalisation order and the derivation DAG, computed from content |
| watchdog findings, stand results, complaints, anomalies in the discovery layer, challenge levels | evidence leaves compared with a prediction: `contradict` or `support` with a margin, under a model, with the obligation they bear on |
| `valid` (prose), `outside()` (code), `dom` (structures), the certificate's domain check | one `dom`: constraint structures the law carries, read by everything |
| frontier entries, asks, unmatched requests, open anomalies, the population queue | structures with an open mode; the queue is their order by what closing them would close |
| English `says` on relations, `statement` on laws, `detail` on findings, `story` on proofs | the renderer over the structure (translate.ts), computed at the moment of saying |

## 5. Native primitives that still appear irreducible

- **Distinction** (a thing told apart, an id and nothing else). Every attempt to remove it reintroduces it as "the
  variable" of a shape.
- **Relation with coordinates** (an operator over structures carrying how, how sure, when, at what scale, in what
  frame, in which mode). Nothing in the slice or the probe asked for a fourth primitive beside distinction and
  relation; the quantity, transformation, evidence leaf and context are faces of relation with a fixed shape and
  earned their own node kind only for the type checker.
- **The hash** (identity by normal form). Without it there is no "same" and no lineage.
- **Dimension as a lattice** (Z^5 and its linear algebra). It is what lets structure be found without names at all.
- **Evidence leaf, sealed** (how a structure is known, with its source and time). It cannot be derived from anything
  else; it is where the world enters.

## 6. Native primitives that are questionable

- **Dimension as the identity of a quantity.** A torque and an energy have one dimension; a quantity's identity
  should be a distinction with a dimension as a property, so that the level-1 class `J ⇐ 1,1,1` can split along a
  distinction the dimension cannot see. Today `Q` carries `dim` and no distinction of its own (the `quantity`
  relation binds a thing to a `Q`, which is close but not the same).
- **The mode as a stored coordinate.** The ten modes are outcomes of checks (no term, no leaf, no structure, an empty
  admissible set, outside the domain, a type error, a term and a counter-term, a margin below the ask, an instrument
  and no measurement). They are stored today; they should be computed from the leaves and recomputed when a leaf
  arrives, which is what makes §8 lazy and automatic.
- **The evidence ladder** (`EVIDENCE`, ten kinds in a fixed order). An ordinal ladder is a human rendering of
  "how far can this leaf be trusted"; the native version bounds a leaf by the validation of its producer.
- **The seventeen operators.** `part`, `kind`, `embed`, `abstract`, `recurse` may be one operator (a morphism with a
  shape) seen five ways; `support`/`contradict`/`compare` are one comparison with a sign and a margin. The probe did
  not need to settle this; the compression test (does fewer operators shorten the corpus?) would.
- **The morpheme as a separate node kind.** A morpheme is a shape with a promotion record; it may be a relation with
  `abstract` and a description-length leaf rather than a kind of its own.

## 7. How recursive organisation emerges without fixed levels

NATIVE STRUCTURE. Take the set of structures that exist (laws, parts, builds, measurements, commits). Apply
anti-unification pairwise and in groups; every shape found that has at least two instances is added as a structure
(with an `abstract` relation to its instances, derived, not declared). Apply the same to the shapes. Stop when no new
shape shortens the description. What exists now is a partial order (instance below shape) whose depth is whatever
the data admit: deep where many instances share much (the energies, the bilinear laws), shallow where they do not,
multi-parent where a structure instantiates two incomparable shapes (a law that is both "an energy" at level 1 and
"a thing with a held constant" at level 0), and without a useful tree where instances overlap in two independent
coordinates. Forgetting a coordinate is the one-step form of the same operation, which is why "levels" appear:
level 0, 1, 2 in the probe are three successive forgettings, and nothing stops a fourth or a half-step.

HUMAN RENDERING. "Foundational" is the top of a chain; "family" is a down-set; "level" is the number of forgettings
between two structures; "the deepest law" is the maximal element with the most support. All four are readings of
the one order, and they change when the order changes (§8). The UI draws a tree when the region is a tree.

What the probe says about this today: on the 101 monomial laws, 95 classes at the finest level, 72 one forgetting
up, 30 two up, 12 at the base-dimension level; 6 maxima with instances; longest chain 2. The order is real and
label-free; it is shallow because the content it sees is an exponent vector (§13). Richer content (a law as an
expression tree) gives anti-unification sub-terms to share, and depth follows from that, not from anything added by
hand.

## 8. How a newly discovered deeper law restructures every affected region automatically

NATIVE STRUCTURE. Three facts make it automatic and lazy:

1. **Content addressing.** Every derivation, realisation, design and belief cites the hashes of what it used
   (`parents`, `mech`, `dom`, `ev.src`). A deeper law that supersedes L1, L2, L3 is a new structure G with
   `abstract` relations to them; L1 is unchanged (its hash is the same), so nothing that used L1 becomes wrong. What
   changes is the order: G is above L1 now, L1 is derived, and "foundational" (a computed property) moves to G with
   no edit anywhere.
2. **A revision is a transformation.** When evidence changes L1 itself (a corrected exponent), L1' is a new hash and
   a `T(L1 → L1')` carries the evidence that forced it. Every structure citing L1's hash now cites a superseded
   structure. That is detectable by inspection: a derivation is current iff every cited hash is current. Nothing is
   recomputed until asked; the set of affected structures is known immediately (the transitive closure of citations
   of L1), and recomputation is on demand, memoised by hash. This is the calculator property: the dependency
   structure determines the consequences; the cells are recomputed when read.
3. **Modes are recomputed, not stored** (§6). A belief whose supporting leaf now sits on a superseded structure is
   not "stale" by a flag; its mode, recomputed from its leaves, is `insufficient` or `unknown`. The UI rerenders
   from the recomputed mode.

HUMAN RENDERING. "Propagation", "invalidation", "the law tree updated", "memory records updated", "every design
rewritten" are what a reader sees happen; natively one structure was added and one order and some modes are
different when next read.

Where this stands today: the Mind's commits cite parents by sequence number (should be by hash); laws have no hash
because they are not structures (§13); the substrate's relations have no `parents`. The property is proven in the
small (the slice) and unavailable in the large until laws are terms.

## 9. A person, a place, a memory, without duplicate storage

NATIVE STRUCTURE. A person is a distinction. Everything true of them is a relation whose argument is that
distinction: `part`-of a group, `same` place as another at a time, an evidence leaf `measured` by Ego's own senses
with `time.at` (an episode), a `function` they fill. "Family", "friend", "work", "place", "memory", "phase" are
shapes over those relations (`part(X, group) with a kin mechanism`, `same(location(X), location(Y)) at t`), and
"the family" is the set of instances of one such shape with X bound. One distinction, many relations, each stored
once, each a member of as many shapes as instantiate it; the views are queries, computed. It is the same mechanism
as "the energies": a shape and its instances. The life layer today keeps notes, reminders and a ledger in their own
records; under this they are relations on distinctions with time coordinates, and "remind me" is a question with
mode `unmeasured` whose instrument is the clock.

## 10. Code, laws, world state and cognition in one dependency topology, without one semantic type

NATIVE STRUCTURE. They are different node shapes citing each other by hash:

- a **law** is a transformation or constraint over quantities with a domain, evidence and a worked-example leaf;
- a **realisation** is a `morphism` from the law to a code distinction (a module and a symbol, read from the code),
  carrying an error contract;
- a **test** is an evidence leaf (`simulated` or `derived`) over the obligation the realisation must keep, with the
  test's name as its source;
- a **world state** is a `state` of quantities over the parts of a build, with leaves `measured` by the physics
  under a stamp;
- a **design** is a derivation: a structure with `parents` reaching the laws, the stock and the load;
- a **belief** is a structure in a context `believe` held by `ego`, with leaves;
- a **commit** is a leaf of cognition: what happened, derived from what, under which physics.

They share the citation structure (hash, `parents`, `mech`, `dom`, `ev.src`) and nothing else, so "if the bending
law changes, which code realises it, which tests hold it, which designs used it, which beliefs rest on it, which
part of Ego's own loop assumed it" is one closure over citations, while a law never becomes a test and a test never
becomes a belief: the node shape and the context keep the semantics apart. The Ganglia then contains structures
for its own operators (the morphemes), its own transformations (the `T`s of revision), its own topology (the
`abstract` relations), its own code (the morphisms), its own tests (the leaves), its own failures (the
`contradict`s) and its own abstractions, and the same recursion that reads physics reads them.

## 11. What the smallest canonical substrate actually contains

1. Distinctions and relations with coordinates (core.ts as it is), with a quantity's identity made a distinction (§6).
2. The hash, and citation by hash everywhere a structure uses another.
3. An append-only journal of sealed leaves and the transformations that revise structures (the Mind's journal,
   generalised: every leaf, not only Ego's).
4. The three organising operations: anti-unification (with forgetting), instantiation, description length.
5. The two reading operations: the generalisation order (computed, cached by hash) and the citation closure
   (computed, cached by hash).
6. Mode computed from leaves; certainty composed along derivations.
7. One judgment shape (structure, validator, result with mode and margin, lineage) for every validator there is.

Nothing in it is a table named after a word in this document.

## 12. What remains projections and renderers only

English (translate.ts and the Mind's `say`), the compact text and the spoken form, the tree view, the tablet, Forge
as the text of construction actions, the law "statement", "domain" and "tags", the intent parser as the English
tuner, confidence labels, the "level" of a challenge, reports for a human, the GitHub issue. Each is computed at
the moment of use from structure and never written back as structure.

## 13. What in the current code architecture prevents this today

1. **A law's content is a closure.** `eval` is TypeScript; the formula is a string; the domain is prose and code.
   Anti-unification cannot see inside a closure, so the only shape available is the exponent vector read by probing
   the closure at one point. That is why 41 of 142 laws (sums, exponentials, logarithms, minima: von Mises, Johnson
   buckling, the parallel axis, the rule of mixtures, radiation, Shannon information) have no shape at all, and why
   the generalisation order is two deep. The fix is one representation change: the content as an expression tree of
   quantities and distinctions, with `eval` as its realisation.
2. **Identity by name.** Laws, entities, relations, nodes and parts are identified by English ids; nothing has a
   hash because nothing is a structure. Content addressing, and with it §8, is unavailable above the Mind.
3. **Quantities identified by dimension.** Torque and energy collapse (§6).
4. **Modes and confidences stored.** `confidence: number` on every substrate relation and entity; `mode` written by
   code; `coverage.depth` as an ordinal. These are renderings persisted as if they were structure, and they cannot
   be recomputed when evidence arrives because the evidence that produced them was not kept.
5. **Taxonomies as types.** The unions and lists in §3. Each one is a place where a programmer decided the
   organisation in advance; each one must become a computed property or an open set of distinctions.
6. **The substrate is built at import from seed packs and a bridge** that restates laws, parts and manifolds as its
   own records (AUTOPSY §G.2.4). There is no one store that the substrate is an index of.
7. **Derivations are not recorded** outside the Mind: the designer has no trace, workflows' traces are English-ish
   steps, realisations are strings. The citation closure of §8 has nothing to walk.

## 14. One experiment that would prove this architecture more powerful than the current Ganglia

The experiment, half of which was run today:

**Withhold every human label from the law book and ask the native operations to organise it; then compare what they
find with what the labels say, and with what the labels cannot say.**

Run today (tests/unit/native.test.ts, and the probe recorded here): with names, symbols, domains, tags and tree
nodes withheld, from dimensions and exponents alone:

- 101 of 142 laws admit a shape; every one of them is dimensionally homogeneous once its constants take the exponent
  homogeneity demands (zero residual in all 101: no law hides a dimensional number in its code).
- At the finest level, 95 classes; the 5 shared ones are real identities with no name used: weight with Newton's
  second law; aerodynamic drag with lift; the two point-load beams; the three friction-coefficient laws; two moments
  of inertia.
- One forgetting up, 72 classes, 15 shared, 8 crossing human domains: the energies of five theories are one shape;
  the three powers are one; `grade.force`, buoyancy and the Lorentz force are one.
- Two forgettings up, 30 classes, 14 crossing domains; the deepest shared structure in the book is bilinearity
  (20 laws), then trilinearity (17), then "one input times another squared" (8).
- The human domains are 64 % recoverable from the level-1 classes and 56 % from the base dimensions involved
  (normalised mutual information); electrical and thermal are structural, the five-way split of `MLT` is not.
- The generalisation order has 6 computed maxima and a longest chain of 2.
- A constant is an input the theory holds fixed: Landauer's limit, with k held, joins the bilinear laws one level up.

What this proves: the current native operations discover real cross-theory structure that the human taxonomy
hides (no "domain" contains both a capacitor's energy and a spring's), and they expose where the human taxonomy is
convention. What it does not yet prove: depth. The order is two deep because the content seen is an exponent vector.

The other half, which decides the question: represent twenty laws of the book as expression trees (the sums and
exponentials among them), run anti-unification over the trees, and measure (a) whether the 41 laws without a shape
join the order, (b) whether the order deepens past two without any label, (c) whether the description length of the
twenty laws under the discovered shapes is shorter than under the human tree (docs/LAW-TREE.md's nodes for the same
laws), and (d) whether a change to one tree (a corrected term) reaches, by the citation closure alone, every
derivation that used it in the test stand and the designer. If (a) to (d) hold, the architecture is more powerful
than the Ganglia as it stands, by a number, and the migration of the law book to terms is justified by evidence
rather than by this document. If (c) fails, the human tree is carrying information the structure does not, and that
information has to be found before any migration.

## The other half, run (3 October 2026, later the same day)

Laws as terms (`native/terms.ts`, one operator `apply` added to the kernel): 43 laws written as expression trees, each
reproducing its own worked example. Anti-unification over them: 15 of the 18 termed laws that had no power form join a
shared shape; the generalisation order is three deep where the exponent probe reached two; 16 shapes with two or more
instances, 7 maximal; 12 promoted shapes shorten the corpus from 413 to 386 nodes under the description-length
criterion, while the hand-kept law tree names none of the 43 and compresses nothing. A corrected term reaches what
cites it by hash alone (tests/unit/terms.test.ts). Full results and what they were used for: docs/NEX-TSC.md.

## What was changed in code for this document

One native operation added, no category: `shapeOf` and `shapeKey` in src/ganglia/native/forms.ts (a law's shape
with its constants folded by dimensional homogeneity, and the levels of forgetting), with three tests holding what
was found. No table, no enum, no field named after a word in this document.
