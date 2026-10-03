# Nex: the language Ego thinks in

3 October 2026. The request: a native language for Ego that is not English, not a modified natural language, not a
notation for English concepts, in which reality, thought, causality, uncertainty, scale, time, evidence, perspective,
recursion and relationships are represented more precisely and more efficiently than human language manages, with
human languages as translation layers on top. This document is the first architecture, A to Z as asked, and the code
under `src/ganglia/native/` is its first kernel, with the tests of `tests/unit/native.test.ts` holding what it claims.
Where a section is designed but not yet built, it says so; where a number is given, a test measured it.

The architecture:

    LAW / KNOWLEDGE NEXUS   (docs/NEXUS.md: judgments, morphisms, evidence leaves, branchable state, state with a law)
            ↓
    NEX                     (this: the internal form every Nexus term is expressed in)
            ↓
    TRANSLATION LAYER       (translate.ts: tuners; loss counted; evidence never raised)
            ↓
    English / Spanish / equations / code / diagrams / animation / VR / sound / touch

Ego thinks in Nex: her structures are built, compared, chained, checked and evaluated as Nex terms, and English is made
from them only at the moment of speaking, with a count of what the sentence failed to carry.

The continuous part of Nex, where a law gives coordinates and nowhere else, is docs/NEX-SPACE.md: the audit of the
request to make Nex a continuous space of meaning, with what was built because it gives a capability the discrete
form could not (families along a law's inputs, lazy and adaptive; interpolation refused without a shared coordinate;
continuous or discrete decided by evidence) and what was rejected as decoration. docs/NEX-DISCOVERY.md is the
audit of the request that Ego never confuse the absence of human knowledge with the absence of reality: a claim's
evidence as a structure with a supporting and a contradicting ancestry in species that answer different questions;
its relation to the laws typed; all of it in one epistemic vector, with human coverage a novelty coordinate that no
physical label reads, and the label made only at the rendering boundary by structural conditions; impossibility
only with a certificate (a law that bounds or computes the quantity, its assumptions, the claim beyond it);
anomalies kept alive with a skeptic that derives the ordinary explanations from the law's own graph. docs/NEX-AUDIT.md answers ten questions put to the design, with the one bug they found
(the certainty of a chain, now within the Fréchet bounds).

## Try it

In the app, ask Ego (the same answers come from `answerTraversal` in the unit tests):

- "say a bearing in your language" / "how do you think of a spring": her structures of the thing, each as Nex
  writes it (`part(bearing, steel.52100){cert:{kind:interval lo:0.6 hi:0.8 …} ev:{how:derived} mode:true}`) and then
  in English, with what English carried and lost, the weakest evidence among them, and their hashes.
- "does the load cause the failure of a bearing", "what causes corrosion", "does a lubricant prevent the failure
  of a bearing": a chain of influences composed in Nex (strength, certainty, delay, polarity, the weakest evidence),
  rendered, then the chain itself in Nex; where no arrow runs, a law governing the thing or its failure with the cause
  as an input gives the sign of its output at the law's own worked example ("equivalent dynamic load (P) lowers
  rating life of bearing by 2.9 % a percent; derived, not measured here"); prevent looks for the opposite sign.
- "compare heat and temperature", "compare weight and mass", "compare current and voltage": told apart by dimension
  before any word; a word of two senses settled by the other side ("By current I take electric current, as a
  quantity").
- "what causes current", "what does glue do": a word of two senses is asked back with its senses, kinds and units.
- "that motor is struggling", "the bearing is noisy", "this bolt is loose": candidates from what she knows fails
  the thing (and, for a motor, from its quantities), each held as not yet measured with what would settle it, none
  chosen.
- "how far can the load go before the rating life law stops applying", "at what friction does the traction limit
  stop applying": the edge of a law's domain along one input, found by walking the family it generates and
  bisecting, nothing stored (docs/NEX-SPACE.md).
- "what laws have the same form as the energy in a spring", "which laws look like Ohm's law": the form of a law
  with every symbol gone, and the laws of other theories that share it (one structure said five ways).
- "what fails a bearing", "how does a motor fail": its failure modes as mechanisms with laws, then how each is known
  from its arrow's structure (the tally of evidence, none measured in her world) and the first arrow in Nex.
- "try to build a computer", "take the scientist challenge": the attempt in English, then its Nex: the levels as
  modes, how each is known (a simulation, not a measurement), and what the English carried of it.
- "does ice cream cause drowning": no mechanism, and a correlation held as support, never as a cause.

## A. Name

**Nex**: the native form of the Nexus, and Latin *nexus*, a binding. One syllable, no brand, pronounceable in every
language the translation layer will grow. The code calls it `native` so that the name can change without the code.

## B. The smallest semantic primitives

The nineteen candidates (state, change, relation, identity, difference, boundary, quantity, order, cause, constraint,
possibility, observation, uncertainty, scale, time, reference frame, information, resource, transformation) compress
to **two primitives and one schema**:

- **D, a distinction**: a thing told apart from others. It has an identity and nothing else; its English name is an
  alias kept outside the hash. Every "noun" is a D.
- **R, a relation**: an operator over structures, carrying coordinates. Every "verb", "property", "cause", "law",
  "belief" is an R.
- **The coordinate schema**: the dimensions any relation may carry (section C). A coordinate that is absent is *not
  modelled*, never a default.

Four faces of R are so frequent that they are their own node kinds, for the type checker, not because they are new
primitives: **Q** (a quantity: a number with a dimension, the only leaf that carries a number), **T** (a
transformation: a state to a state under a condition), **E** (an evidence leaf: how something is known, sealed),
**C** (a context: the scope something is held in). A sixth kind, **M**, is a morpheme reference, an exact
abbreviation.

How the nineteen derive:

| candidate | in Nex |
|---|---|
| state | a bundle (`state`) of `quantity` relations binding a D to Q's |
| change, transformation | T |
| cause | an `influence` relation with coordinates (polarity, necessity, strength, delay, mechanism) |
| identity, difference | `same`, `differ` |
| boundary | a `constrain` on scale or position |
| quantity, order | Q; `compare` on Q's |
| constraint, possibility | a relation with mode true that must hold; possibility is a non-empty admissible set, impossibility the mode `impossible-under` |
| observation, information | E; information is the narrowing of a `cert` coordinate by an E |
| uncertainty | the `cert` coordinate, on Q and on R |
| scale, time, reference frame | coordinates (`scale`, `time`, `frame`) on any relation |
| resource | a Q conserved under T (`invariant`) |

Why these and not others: an agent that models anything must tell things apart and relate them; everything else in
the list is a relation of a particular shape. A non-human intelligence would need D and R too, which is the test
section Z asks for.

## C. The morphological operator system

An operator is a relation kind with the shared coordinate vector. The operators (`Op` in core.ts):

- structure: `part`, `kind`, `same`, `differ`, `embed`, `abstract`, `recurse`
- transformation and cause: `influence`, `invariant`, `constrain`, `approximate`
- binding: `quantity` (a D to a Q), `function` (a D does something), `state` (relations as one)
- epistemic, computed never asserted: `compare`, `support`, `contradict`
- between theories: `morphism`

The coordinates every operator may carry: `dir` (direction), `polarity` (raises or lowers), `necessity` (sufficient,
necessary, contributing), `strength`, `cert` (section K), `time` (G), `scale` (H), `mech` (the transformation that
mediates, by hash), `dom` (constraints it holds under), `frame` (I), `ev` (J), `mode` (F), and the carriers of the
modes that need one (`under`, `against`, `margin`, `instrument`).

CAUSE, PREVENT, ENABLE, CONDITION are not four words: they are one operator, `influence`, at four places in its
coordinates: polarity + or −, necessity sufficient / necessary / contributing, a condition in `dom`. Direct, indirect,
possible, historical, micro-scale, conditional and counterfactual cause are the same operator with `mech` set or
chained, `cert` low, `time.at` in the past, `scale.L` small, `dom` given, or the whole held in an `intervene` context.
`chain(ab, bc)` composes two influences: strengths multiply, certainty narrows to the Fréchet bounds of both holding, delays add, polarities
multiply, the evidence is the weaker of the two, and the mechanism records both (tested).

## D. Recursive grammar

    S ::= D | Q | R(op, S*, coords) | T(S → S | cond, coords) | E(S, how, source) | C(kind, holder, S, coords) | M(id, version, S*)

A relation's arguments are structures, so a relation of relations is native (`contradict(a, b)`,
`support(comparison, judgment)`). A context's body is a structure, so `C(believe, ego, C(believe, user, X))` is "Ego
believes the user believes X", and `C(believe, ego, X)` with `cert` low is "Ego is uncertain whether the user believes
X" when X is itself a belief context. Tested: the nested belief renders, hashes differently from its reversal, and
equals its copy. Self-reference ("my previous derivation of B was flawed") is `R(contradict, [M(previous derivation),
E(...)])` inside `C(believe, ego, …)` with `time.at` in the past: no special construction.

Stateful transformational structures (the request's unit instead of noun and verb): `STS = { self: D, state: R[],
transitions: T[] }`; `objectView` keeps the state relations, `processView` the transitions. A flame is an STS whose
state is a temperature and a composition and whose transitions are combustion; both views are projections.

## E. Multidimensional syntax

A structure is a kernel node with coordinate axes attached, not a line of words: `influence(a, b)` with the vector
`[dir, polarity, necessity, strength, cert, time, scale, mech, dom, frame, ev, mode]`. The canonical machine form
(section T) is the object. Its compact text (`native/text.ts`) is a surface on that form, built after the meaning, as
the request orders: one line per structure, the operator as a glyph, the arguments in brackets, the coordinates in
braces in one fixed order, only the modelled ones written (an absent coordinate is not modelled, never a default):

    influence(load, current){dir:1 polarity:+ necessity:contributing strength:0.8 cert:{kind:interval lo:0.9 hi:1 source:epistemic} time:{delay:0.01[s]} ev:{how:measured src:["a current reading"]}}
    quantity(rod, length, 3.2[mm])
    T(cold, hot | powered){time:{dur:30[s]} ev:{how:simulated}}
    C.believe(ego, C.believe(user, kind(a, b){mode:unmeasured instrument:thermocouple}))
    E(influence(load, current){…}){how:measured src:"a reading" by:ego at:3[s]}
    M(loop, 2, error, command)

It is lossless: the text reads back to a structure with the same hash, and the text of what was read is the same text
(tested over every law of the book, every node of the law tree and ten things of the substrate, 950 structures). A
quantity is written in the unit it was given, or in the SI symbol of its dimension, or as a number with its dimension
when neither reads back exactly. No English alias enters it; the operator names and coordinate keys are glyphs that a
reader may swap for symbols. `blind(s)` writes the same text with every distinction replaced by a numbered variable
and every source removed: the shape alone, which is the hard test by eye (the blind text of a structure and of its
renaming are one text). Ego shows the compact text beside the English whenever she says a thing in Nex ("say a
bearing in your language", "does the load cause the failure").

The spoken form (`native/spoken.ts`) is the same text read aloud, one word per glyph, in English or Spanish, and
heard back to the same hash: "influence of load and current end with dir is 1 polarity is plus … so so". Seven
words (of, and, end, with, so, is, in; list for a list) carry every bracket, and a name that is one of them is said
in quotes. It is not a translation: nothing is dropped, which is what a translation into English cannot say of
itself (section N counts what it drops). Ego says a thing aloud on "speak a bearing in your language". The graphical
rendering (the kernel at the centre with the coordinates as spokes, each spoke empty where the coordinate is not
modelled, which shows at a glance what a thought does not yet know) is designed, not built.

## F. The negation and unknown system

One `mode` coordinate with eleven values, each a different next action: `true`, `false`, `unknown` (no term either
way), `unobserved` (no evidence reaches it, though it could), `unmodelled` (no structure for it yet),
`impossible-under` (empty admissible set under named assumptions, carried in `under`), `outside-domain`, `undefined`
(a type error: dimensions disagree, a frame is missing where one is needed), `contradictory` (a term and a
counter-term both exist, carried in `against`), `insufficient` (evidence below the threshold asked, with the margin),
`unmeasured` (an instrument is known and named, the reading is not taken). Tested: the ten non-true modes render as
ten different sentences; a comparison of a heat with a temperature is `undefined`; a velocity without a frame is
`undefined`; a contradiction between two influences is found by structure and held, not resolved.

## G. Time morphology

The `time` coordinate: `at` (event time), `dur`, `phase`, `period`, `delay` (signal delay), `charT` (characteristic
time), `process` (process time), `proper` (whose clock), `order` (what it comes after and before: a partial order, so
causal order is native), `window` (the uncertainty interval of the event time). Tense is a rendering decision: a
structure with `at` before now is rendered in the past. The translator carries `delay` into "after 30 s" and declares
every other field dropped when it has no words for it (the test of the paragraph-long thought shows `window` as the
one thing English lost).

## H. Scale morphology

The `scale` coordinate: `L`, `T`, `E`, `res` (resolution), `model` (which theory level). Any structure can carry it;
a law's validity carries it in `dom`. A rendering says "at a scale of 1 m" or declares the omission; a proposition
valid at a metre never becomes universal silently because its scale is in its hash.

## I. Reference-frame morphology

The `frame` coordinate: `observer`, and `rest` (what is at rest). Relation kinds that mean nothing without one
(`NEEDS_FRAME`: motion, velocity, position, rest, speed) make the structure `undefined` until a frame is given:
"the object is moving" is incomplete internally, as asked, and `wellFormed` says so. Sensory perspective is the same
coordinate with the observer a sensor (section L).

## J. Evidence morphology

`ev.how` is one of `theorem, derived, measured, calibrated, simulated, estimated, extrapolated, hypothesized,
assumed, fictional`, ranked in that order, with `src` (where from) and `at` (when). The Nexus tier each enters at:
theorem and derived 0, simulated 1, measured, calibrated, estimated and extrapolated 3, hypothesized and assumed 4,
fictional outside. The ancestry survives translation because the renderer chooses its hedge from the rank and
`rankOfText` reads the hedge back: tested for every one of the ten kinds that no sentence reads as surer than its
structure (translation is epistemically monotonic). A law of the book enters with the evidence of its source kind
(a textbook is derived, a standard calibrated, a maker's figure measured, a rule of thumb estimated); a node of the
tree with the evidence of its proof status (an axiom assumed, a proved mathematical node a theorem, a tested node
simulated, a provisional one hypothesized).

## K. Uncertainty morphology

`cert` on quantities and on relations: `kind` (exact, interval, distribution, systematic, unknown), `lo` and `hi`,
`dist` (type and parameters), `source` (epistemic, aleatory, mixed), `sens` (sensitivities to named inputs). It is a
coordinate, so it is in the hash and in the distance (`structureDistance` adds the non-overlap of two intervals to
the shape distance). Chaining narrows it to the weaker; rendering turns it into certainly / probably / possibly /
unlikely with the interval for an engineer and nothing for a child.

## L. Sensory tuner architecture

A tuner is a projection: a thing's structures → the subset one way of looking selects. `tune(said, tuner)` with
tuners `energy`, `thermal`, `control`, `failure`, `manufacturing`, `causal`, `structure`, `english` (the whole). The
energy tuner keeps relations whose quantities carry energy or power dimensions or that bind to a storage; the failure
tuner keeps influences with negative polarity; the thermal tuner keeps temperature dimensions and heat. Tested on a
transformer: five different non-empty selections of one structure; and honestly, the brushed DC motor's thermal view
is empty, because nothing thermal is said of it yet. English is one tuner among these, which is the request's point:
language is a view of meaning, not meaning. The same concept is asked "what do you look like through another tuner"
by applying another projection; what each reveals differs, and a fingerprint under a tuner is what cross-domain
equivalence is judged on (section R).

## M. Translation layer

`render(structure, lang, audience)` for `en` and `es`, audiences child, technician, engineer, physicist. The same
structure, different words: a child hears no numbers, intervals, delays or sources; an engineer hears every coordinate
that has a word. Human → Nex: `decompose("that motor is struggling", motor)` gives five candidate structures (torque
near stall, speed fallen, current near limit, temperature rising, controller saturated), each with an uncertainty
interval whose upper bound is below 1, each in mode `unmeasured` with the instrument that would settle it; nothing is
chosen. The lexicon is a map from a language's words to distinctions; a distinction with no word gets a coined term
("the thing #p7f3a"), flagged in `coined`, so the lack of an English word never limits the thought.

In Ego's own path (built 3 October): "that motor is struggling", "the bearing is noisy", "this bolt is loose" are
decomposed by `symptoms` (nexus.ts) from what she knows fails the thing: every failure mode of it, of its kinds and
of its materials whose name or saying carries a stem of the word, each a candidate influence held as `unmeasured`
with an uncertainty no higher than twice its share, and what would settle it (a sensor the thing is measured by,
else measuring the law's own inputs); a motor or a servo also gets the five readings of a motor's quantities above,
and a heart does not. A word no failure carries is said so, with what she knows fails the thing; nothing is chosen.

## N. Translation-loss measurement

Every rendering returns `present` (every operator, argument and coordinate in the structure, by path), `rendered`,
`dropped`, and `loss = dropped / present`. A mechanism's hash is never spoken (always dropped); a child's rendering
drops more than an engineer's (tested); the paragraph-long thought of section Y drops exactly one path, the time
window, which the test names. A renderer that knows what it dropped can expand, qualify, show a diagram or warn, as
the request lists; the first two are what `render` does by audience, the others are surfaces to build.

The round trip native → English → native and native → Spanish → native is measured (`parse` reads the renderer's own
sentences back): what comes back is within 0.15 of what went in, the two surface languages come back to *one* hash,
and what was lost is exactly the declared drops (the exact strength number, carried only as "strongly" or "weakly").
The native representation is more stable than either surface, as asked.

## O. Morpheme creation algorithm

Over a corpus of structures with their domains: every sub-structure of at least three nodes is reduced to its
skeleton (its distinctions replaced by variables in order of appearance: the shape, whatever filled it); skeletons
are counted across the corpus; a candidate's saving is `(occurrences − 1) × (size − 1 − variables) − 1`, the
definition paid once and each use paying a reference and its arguments. A candidate is promoted only when it saves
length, recurs at least three times, and in at least two domains; promotion is `define`, which gives it an id, a
version and its evidence (occurrences, domains, saved). `compress` replaces every match by a reference with bound
arguments; `expand` restores it exactly; `sameMeaning` is the hash of the expansion, so a compressed and an expanded
text mean the same. Tested: a negative-feedback loop (X raises Y, Y lowers X) recurring in control, ecology, economy
and biology becomes a morpheme and shortens the corpus; four bolts on one engine block, recurring in one domain, do
not (jargon refused).

Run at scale (`native/grammar.ts`, 3 October 2026): the corpus is everything the substrate says, each structure
once in the domain of the thing it was said of: 13785 structures from 2634 things, 141587 nodes. 497 shapes recur
across domains and would each shorten the whole; the eight promoted shorten it by 17 % (to 117029 nodes) and 6664
structures with them, every one expanding back to its hash. The first morpheme is what a human language calls a
textbook fact: `part($1, $2){cert:{kind:interval lo:0.75 hi:0.95 source:epistemic} ev:{how:derived} mode:true}`,
a relation at the packs' default confidence, derived, held true, 1691 times in 13 domains; then the same bundle on
`constrain`, a contributing lowering (the failure arrow), `kind`, `morphism` and `function`; and two laws over
their quantities (Arrhenius, Coulomb friction), which recur because every member of a kind inherits its kind's
laws. The labels are read off the shapes after the fact, never the other way round. Ego answers "what morphemes
have you found" with this, each morpheme as Nex writes it with an example filled in.

## P. Grammar evolution process

A grammar (causal, spatial, mathematical, temporal, social) is an operator subset with a tuner and rendering
templates over the one substrate; none is frozen as universal. New operators and new coordinates enter as a schema
version; a structure records the version it was written in through the morphemes and operators it uses, and old
structures stay interpretable because nothing is deleted and every change is a new version (section W). The
evolution that is built is the morphemic one: the grammar grows by description length over the substrate (section O,
measured), re-grown whenever the substrate has changed. Not built: new operators and coordinates entering as schema
versions; the first grammar is the one here, which is causal, quantitative and epistemic at once.

## Q. Structural concept fingerprints

`fingerprint(self, said)`: the multiset of shape tokens of everything said of a concept, with the concept itself
marked SELF and every other distinction reduced to D, quantities to their dimension vector, relations to their
operator and coordinate keys, evidence to its kind. No label enters. Tested: the fingerprint of a concept is
identical before and after every name in the world is replaced by a random token.

## R. Cross-domain equivalence detection

`distance(fp_a, fp_b)` is a weighted Jaccard distance over fingerprints; `cluster(fps, eps)` groups concepts. Measured
on the substrate: a spring and a capacitor are 0.90 apart on everything said of them and 0.55 under the energy tuner;
a spring, a capacitor, a flywheel and a lithium cell cluster as one under the energy tuner at 0.7, with and without
their names; a blade has no energy view at all.

**Correction, run at scale (3 October, 16:20 UTC).** Clustering all 593 things with an energy view, unweighted,
gives clusters of shape, not content: a seat, a photoresist and an elastic store cluster because each has a kind, a
constraint and a derived function at the packs' default confidence, which is the shape every textbook fact shares
(the first morpheme of section O). Weighting each token by how rare it is across the corpus (`rarity`, section V's
learned term in its plainest form: log N/df, zero for a token every fingerprint carries) changes the picture: the
spring clusters with its kin (the springs, a flexure, a belleville washer), the lead screws with the lead-screw way,
biology's elastic proteins together, and the spring-capacitor distance rises from 0.55 to 0.82: what they shared was
the shape; what parts them is every dimension in their laws. The analogy a physicist means (E = ½kx² and E = ½CV²,
two quadratic stores) lives at the level of the laws' *form*, which a dimension-token fingerprint cannot see; it
needs a morphism between theories over the dimensions (the `morphism` operator with a contract). A number that
flattered the thesis has been replaced by the one that was measured.

**The morphism, built an hour later (`native/forms.ts`).** The form of a law is what it looks like with every
symbol gone: for each input, the exponent its output follows it with, measured on the law's own evaluation at its
worked example at three multipliers (so a curve is not mistaken for a power), and the output's dimension. Two laws of
one form are one structure said in two theories. From eval alone, with no word of either theory: E = ½ k x² (spring),
½ m v² (kinetic), ½ I ω² (rotational), ½ C V² (capacitor) and ½ L I² (inductor) are one form, `J:1,2`, "an energy,
one input times one input squared", which is the analogy the physicist means and the fingerprint could not see;
P = F v, P = T ω and P = V I are one; Ohm, the back-EMF and the Seebeck effect are one; drag and lift are one. Carnot
(1 − T_c/T_h) looked like a power at a 1 % step and is refused at a 50 % one; the rating life, whose exponent is an
input, has no form. Measured: of 142 laws, 84 have a form, 58 forms, 13 shared by two or more. Ego answers "what laws
have the same form as the energy in a spring" with the four others and the morphism in Nex. Two laws were added to
the book for it, with their sources and worked examples: the energy in a capacitor and in an inductor. The step the request describes, "are these one structure named
several times", is: compute fingerprints under a tuner, cluster, propose a higher abstraction for a cluster, keep the
differences as the set difference of the fingerprints. The proposal step is the morpheme algorithm applied to the
cluster's shared sub-structures.

## S. Human-language concept splitting and merging

Polysemy is built (`native/polysemy.ts`). A human word is not a thing: it reaches *readings*, each a distinction with
its kind and, for a quantity, its dimension, and each a structure (`quantity(qty.current, 0[A])`,
`kind(earth.current, phenomenon)`). Readings are grouped into *senses*; the faces of one thing are one sense
(`substrate/faces.ts`, from section D: a flow and a quantity it carries, a law and the quantity it is of, a way and
the part that embodies it, a joint as an interface and as a part, an element and its material, a part and the
manifold of its variants). A word whose strongest readings are of more than one sense is polysemous, and which is
meant is settled by structure or asked, never chosen in silence:

- `settle(readings, {dim})`: the dimension the question carries ("compare current and voltage": voltage is a
  quantity, so current is the quantity in amperes);
- `settle(readings, {kinds})`: the kind of thing the question is about;
- `settle(readings, {flow})`: a design request wants flows;
- otherwise the open senses are said back: "Current names 3 things to me: electric current (a quantity, in A);
  current, of earth (a phenomenon); current, of electrical (a thing). Which do you mean?"

A catalogue's one-word search tokens ("drive", "motor" on every variant) and the tails of ids are too weak to be
chosen by context or offered. The word lookup itself (`substrate/names.ts`) now returns nothing for a word of two
senses: an id that is also another thing's name ("glue": the process and the adhesive), two described things with
one name ("broach": the tool and the machine), a word in several namespaces ("current"), an alias another thing of a
different sense carries ("induction": Faraday's law and the motor). The flow table's commitment of a quantity word
to one flow ("power" to electric) is said as a convention in a challenge's result when the quantity rides on several
flows (`flowsCarrying`).

Synonymy across disciplines remains as designed: distinctions from different domains within `eps` under a tuner,
with the morphemes of their shared structure as the merged concept (section R), not yet run as a batch.

## T. Canonical machine representation

`canonical(normalize(s))`: a JSON text with sorted keys, commutative arguments sorted (`same`, `differ`, `state`,
`contradict`), morphemes expanded, aliases removed, undefined coordinates removed, quantities in SI with their
dimension vector. Two surface expressions that differ only in order, naming or abbreviation normalise to the same
text. `hash` is a 64-bit content hash of it.

## U. Semantic equivalence system

`equivalent(a, b)` is equality of hashes of the normal forms, under the expansion of morphemes. It is syntactic
equality of the canonical form plus the rewrite rules the normal form applies: reordering of commutative arguments,
abbreviation, the dropping of empty coordinates, and two rules of direction (built 3 October): a relation written
backwards (`dir: -1`) is the forward one with its arguments swapped, and an undirected one (`dir: 0`, a correlation)
does not care about their order; so the same thing said either way has one hash, a chain composes whichever way its
links were written, and a contradiction is found whichever way the denial was written (tested, and the renaming test
holds through the rewrites). Names are meaning-free but are identity: renaming is never an equivalence. Not yet
recognised: equalities that need more theory (an influence of polarity − on X equal to an influence of polarity + on
the complement of X); those enter as kernel rewrite rules of tier 0 (NEXUS §F) when the first is needed.

## V. Semantic distance

`structureDistance(a, b)` = 0.7 × shape distance (Jaccard over tokens) + 0.3 × coordinate distance (strength
difference, certainty non-overlap), on the normal forms. Structural by construction, as the request asks; a learned
measure can be added as a second term when there is something to learn it from, and the two are then combined, not
the learned one alone.

## W. Versioning

`Morphemes.revise(id, def)` makes version n+1 with `supersedes`; `expand` of a reference uses its own version, so a
structure written with v1 still means what it meant after v2 exists (tested). A morpheme never changes meaning in
place. The same rule will govern operators and coordinate schemas: a change is a version with a migration, never an
edit.

## X. Integration with the Law Nexus

Nex and the Nexus are one system: `fromLaw(law)` makes a law of the book a `function` structure (its output a
function of its inputs, each a distinction bound to a dimension, mediated by the law, in the evidence of its source,
valid in its `dom`), and `evaluate(structure, laws, bound)` runs it: the structure is executable, says
`outside-domain` where the law says so, `unknown` when an input is unbound, `unmodelled` when no law stands behind
the mechanism token. `fromNode(node)` makes a tree node its `kind` relations, its evidence leaves (the tests that hold
it) and its realisations (`morphism`); `fromRelation(rel)` makes a substrate arrow its operator with the arrow's
confidence as `cert` and its source as `ev`. `saidOf(substrate, id, laws)` is everything said of a thing, including
the laws of its kinds, as structures: the input to fingerprints and tuners. A judgment, a hyperedge, an evidence
leaf, a constraint, a causal relation, a derivation of docs/NEXUS.md each have a form here: R, R of R, E, R with mode
true that must hold, `influence`, `why` (the support tree as hashes and evidence kinds, with no label in it).

### X.1 Laws as influences

Where no arrow of the substrate runs from a cause to an effect, a law of the book that governs the effect (or a
failure of it) and has the cause as an input is read as an influence: the sign of the output in that input by finite
difference at the law's own worked example, with the law as mechanism and the source as evidence, derived. The
subject decides the reading: a thing or a failure takes the law's output of it ("the load lowers the rating life of
the bearing", by L10 = (C/P)^p); a quantity that is the law's output takes it forward ("mass raises weight"); a
quantity that is an input while the cause names the output takes the inverse, which has the forward sign ("voltage
raises current" by V = I R, `mech:ohm^-1`); two inputs take the implicit reading with the output held, the sign of
db/da being minus the ratio of the two sensitivities ("resistance lowers current", `mech:ohm/I`), as the book's
inverse solve has it. An input the cause merely mentions is never matched (a load *rating* is a property of the
bearing, not the load): the cause must be the input's head noun. Prevent asks for the opposite sign.

## Y. Testing methodology

What `tests/unit/native.test.ts` holds, and will hold as the language grows:

1. **The hard test.** Every distinction renamed by a bijection to random tokens: equivalence judgments, distances,
   fingerprints, chained inferences, contradiction detection, the support tree's shape, clustering and the evaluation
   of a law through its mechanism token are all unchanged. Meaning does not live in names.
2. **Simulate.** A law structure evaluates to the law's number, and refuses outside its domain.
3. **Compare, discover.** Cross-domain things that do the same thing cluster under a tuner, named or not.
4. **Invent.** A nameless phenomenon is said at once from primitives; its rendering coins a term and flags it.
5. **Modes, frames, dimensions.** The eleven modes are eleven sentences; heat against temperature and motion without
   a frame are `undefined`.
6. **Nested models.** Belief of belief, a branch, an intervention: native, rendered, hashed apart from their reversals.
7. **Translation loss and monotonicity.** Loss counted per audience; no rendering reads as surer than its structure.
8. **Round trip.** English and Spanish both come back to one structure within the declared loss.
9. **Human → native.** "Struggling" is five candidates with uncertainty and instruments, none chosen.
10. **Morphemes.** Promotion by description length across domains, exact compression, refusal of jargon, versioning.
11. **Nexus.** Tree nodes, substrate arrows and laws have native forms; tuners select different faces.
12. **Nex against English.** Five confusions English invites (heat / temperature, weight / mass, speed / velocity,
    energy / power, correlation / causation): a word-overlap judge calls four of the five pairs the same statement;
    Nex calls none the same, finds two ill-formed, and refuses to chain a correlation as a cause. English errors 4,
    Nex errors 0, on this set.

    Then Ego's own English path was asked the same five (3 October, 15:00 UTC), before and after it was given Nex's
    rule. Before: "compare heat and temperature" answered about a *temperature sensor*; "compare weight and mass",
    "speed and velocity", "energy and power" answered "I know no mass / speed / energy as such" and offered laws
    whose names contain the word; "power" resolved to a battery; "does ice cream cause drowning" was not understood
    at all: four of five wrong, one unanswered. After: the quantities themselves are things with their dimensions
    (seeds/quantities.ts), the comparison tells two quantities apart by dimension before any word (the Nex rule that
    a comparison across dimensions is undefined), and a cause question is answered by a chain of influences composed
    in Nex (strength, certainty, evidence, delay), or by "no mechanism" with the note that a correlation is held as
    support, never as a cause: five of five right. The improvement came from adopting Nex's structure in the English
    path, which is the thesis; the set must grow with every confusion found.

13. **Polysemy, measured.** The census over the substrate's words (names, aliases, the last word of every id, the
    flow table): 4002 words, of which 42 reach things of more than one sense. Before (3 October, 15:32 UTC) the word
    lookup resolved all 42 to one thing in silence: "compare current and voltage" compared the *ocean* current with
    voltage; "what causes current" answered of the ocean current; "drive" was one motor variant, "music" music wire,
    "material" copper alloy. After: 38 of 42 return nothing and Ego asks which, naming the senses with their kinds and
    units; a comparison settles the word by the other side's kind ("By current I take electric current, as a
    quantity"); the four still chosen are named in the test as open (axial, broach, disc, induction). Of the flow
    table's words, five name a quantity that more than one flow carries (power, torque, force, weight, heat): the
    table's choice is now said as a convention in a challenge's result, and torque is the known limit of dimension
    alone (it has the dimension of energy).

14. **The challenge engine's problems, both ways.** Each of the six hard challenges (docs/CHALLENGES.md) is taken
    through her machinery once; its results are then said in English (`report`) and as Nex (`native/challenge.ts`):
    each need a transformation between flows in the mode its level is (unsayable → unmodelled *of a word*, no way →
    unmodelled *of a transformation*, unbuildable → outside-domain with the missing ways under it, fails → false
    against the check, partial → insufficient, works → true), known by simulation where it grew and derived where
    it did not; each bound a quantity of the challenge by a law with the law's own evidence. What the comparison
    found: (a) the English levels collapse two kinds of unmodelled into two words, and never say how a level is
    known: "works" reads as a fact, and it is a simulation (grown and checked in her own machinery, not measured in
    a world), which the report now says; (b) English carries 30 of 36 pieces of the scientist's attempt and 110 of
    122 of the computer's: what it drops is the mechanism (the chain of ways), the domain (the medium pushed
    against) and what an outside-domain result is outside of, every time; (c) a reasoning error of the words, not
    of the physics: "hold one bit" and "let one bit switch another" were both `signal → signal` in her flow
    language, which cannot tell holding from switching, so the two needs were one structure, a coarseness of the
    flow vocabulary the structures showed and the words hid. Fixed by structure, not by words: a need now says what
    it is (`as`: a store is an invariant under time, a sense a morphism from the flow to a signal, an act or a
    convert a transformation), declared by the challenge, and the two needs hash apart. The error count of the physics itself is the same both
    ways, because downstream of the words the engine is already structural (flows, ways, blocks, checks): the
    errors Nex removes on these problems are at the two edges, the words in (section Y.13) and the report out.

The main criterion, fewer reasoning errors on harder problems, is not met by this file; it is measurable by it, and
sections Y.12 to Y.14 are its first three measurements.

## Z. The compression

Two primitives (D, R) and one coordinate schema; four faces of R (Q, T, E, C) and one abbreviation (M); seventeen
operators of which one, `influence`, carries what human languages spend dozens of words on; eleven modes; one evidence
rank; one certainty object; one time object; one scale object; one frame object. A thought is a tree of these with
coordinates, hashed, compared, chained, checked and evaluated without a word in it; a word is what a tuner makes of
it for a person, with the loss counted.

## What is built, what is designed

Built and tested today: core.ts (the representation, modes, coordinates, normal form, hash, equivalence, tokens,
fingerprints, distance, clustering, renaming, chaining, contradiction, well-formedness, the support tree),
morpheme.ts (skeletons, candidates by description length, promotion, compression, expansion, versioning),
translate.ts (English and Spanish rendering by audience with loss, hedge monotonicity, parse-back, human → native
candidates), nexus.ts (laws, tree nodes and substrate arrows as structures; evaluation; tuners), text.ts (the compact
text, lossless both ways, and the blind text), spoken.ts (the text read aloud and heard back), polysemy.ts (readings,
senses, settling by structure, the census),
challenge.ts (a challenge's attempt as structures, with what the English report carried), grammar.ts (the grammar
grown over the substrate by description length, measured), forms.ts (the form of a law with every symbol gone, and
the laws of one form across theories).

Where Ego thinks in Nex today (her answer is built as structures and rendered at the moment of speaking, with the
Nex text beside the English): a cause ("does X cause Y", by arrows chained, or by a law read as an influence);
a thing in her language ("say / speak X in your language"); a comparison of quantities (by dimension, a word of two
senses settled by the other side); a symptom ("that motor is struggling": candidates, none chosen); the failures of
a thing (the evidence behind each arrow); the form of a law and its kin across theories; a challenge's attempt (the
levels as modes, how each is known); her grammar (the morphemes her knowledge earned). What is still English built
from the substrate's arrows without a Nex structure in between: functions, producers, materials, analogues,
lineage, kinds, standards, interfaces, variants, sizes, the index. Moving those is the same move eight times.

Designed, not yet built: the visual notation (E); rewrite rules beyond direction (U: an influence of polarity − on X
equal to one of polarity + on its complement); a learned term in the distance beyond rarity (V); synonymy merged
across disciplines as a batch (S); operator and schema versioning beyond morphemes (P, W); rendering into equations
beyond a law's formula, diagrams, animation, VR demonstration, sound and touch (M); the morphism between theories
with a contract beyond the form of a law (R); the rest of Ego's answers moved onto Nex structures (X), and the
English-versus-Nex error count taken on her real questions once they are.

Status at 16:30 UTC, 3 October: sections A to Z written; eleven modules under `src/ganglia/native/`; 30 tests in
`tests/unit/native.test.ts` and 14 in `tests/unit/substrate.test.ts` holding what the document claims; the in-app
path checked by `tests/e2e/ego.spec.ts`; every number in this document measured by a test on the day.
