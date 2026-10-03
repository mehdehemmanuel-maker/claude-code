# Nex Space: the continuous part of Nex, under audit

3 October 2026, 16:40 UTC. The request: investigate whether Nex should become a continuous mathematical space of
possible meaning, with the graph as a projection of it; a calculator of meaning rather than a dictionary; lazy
realisation, adaptive resolution, metrics that say what they measure, admissible regions, charts, self-discovered
coordinates, stratified states, benchmarks that decide continuous against discrete by evidence; and the final
challenge: add nothing because it sounds advanced, prove the capability or keep the simpler form.

This is the audit. Each section says what the request asks, what the discrete Nex (docs/EGO-NATIVE-LANGUAGE.md)
already gives, what was built today because it gives a capability the discrete form could not give cleanly, and
what is rejected or left designed. The code is `src/ganglia/native/space.ts`; the tests are in
`tests/unit/native.test.ts` under "Nex Space", and every number here was measured by them on the day.

## The verdict first

Nex is hybrid and locally variable, and the hybrid is not a decoration: it is exactly where the laws are.

- A law of the book is already a generative object. It does not store its answers; it computes them when asked,
  over its inputs, inside the domain it declares (`eval`, `outside`, `valid`). That is the calculator the request
  describes, and it was in the book before today. What was missing was the language to say so: that a law *generates
  a family* of structures along each of its inputs, that the family is materialised only at the points a question
  touches, and that its edge is a thing to be found, not a predicate to be checked at one point.
- Between two structures that differ in one input of one law there is a continuum, defined by the law and bounded
  by its domain. Between two structures that share no such coordinate there is nothing, and Nex now says so instead
  of inventing a scalar axis: heat and temperature have no space between them (different dimensions); a motor and a
  bearing have none either (two distinctions share no coordinate, unless a law gives one).
- Distinctions, kinds, parts, arrows, standards and interfaces stay discrete, because the substrate is discrete
  there and no law makes it otherwise. The graph is not "a sparse sample of a manifold" in general; it is a sparse
  sample of a manifold exactly where a law gives coordinates, and a graph everywhere else.
- Whether a sampled relation is one continuum or several regimes is decided by evidence (description length), not
  declared: human categories cut on one law are recognised as one continuum; two laws hiding under one smooth-looking
  curve are found with their boundary; noise is never split into regimes.

What this gives Ego that the discrete form could not give cleanly, measured:

| Capability | Discrete Nex before | Nex Space now |
|---|---|---|
| "How far can the load go before the rating-life law stops applying?" | a predicate at one point ("outside" or not) | the edge found by walking the family and bisecting: P = 7.4 N (P/C = 0.5), 24 evaluations to a millionth, nothing stored |
| "Is there a continuum between A and B?" | no answer | yes along one law input, or refused with the reason (different dimensions; no shared coordinate; more than one input differs) |
| "Are light, medium and heavy loads three things or one?" | no answer | one continuum, exponent −3.00 recovered from labelled samples; the labels are a human cut |
| "Is this smooth curve one law?" | no answer | two regimes found under one curve (pipe friction: exponent −1 below Re ≈ 2300, −0.25 above), boundary within one sample gap of the truth |
| "Is this noise one law?" | no answer | one regime, no boundary bought by noise |

## A. Formal definition of Nex Space

𝒩 is not one space. It is the disjoint union of (1) the discrete part: the set of structures of docs/EGO-NATIVE-LANGUAGE.md
section T (distinctions, relations with coordinates, transformations, evidence leaves, contexts, morphemes), under
the normal form and its rewrite rules; and (2) the continuous part: for every law ℓ of the book with inputs
x₁…xₙ and domain Dℓ ⊂ ℝⁿ (the set where `outside` is null and `eval` is finite), the family Fℓ : Dℓ → structures,
x ↦ the function-structure of ℓ at x. A point of the continuous part is a pair (ℓ, x); a one-parameter trajectory is
a family along one input with the others held (`family(law, sym, held)`); the domain's edge is ∂Dℓ. The two parts
are joined where a structure of the discrete part carries a quantity of a law (`quantity(thing, output, Q)` with
`mech: ℓ`), which is the only place the graph touches the continuum. Nothing else is continuous.

## B. Continuous, discrete, hybrid or locally variable

Hybrid, locally variable, by the rule: continuous exactly where a law gives coordinates, discrete everywhere else.
The request's warning is taken as the rule: "do not claim a continuum exists merely because two concepts are
similar." `between(a, b)` returns a family only when a law and one differing input make one, and otherwise returns
the mode and the reason (undefined for different dimensions or no shared coordinate; unknown for one point or for
more than one input differing without a declared curve).

## C. Nex Calculus

The operations over structures are the ones already in core.ts (chain, contradiction, normalize, hash, distance,
rename, evaluate) plus, over the continuous part: `at` (evaluate the family at a point), `admissible` (is the
point inside the domain), `edge` (find the boundary between an inside and an outside point to a tolerance),
`sensitivity` (d ln y / d ln x at a point, the semantic derivative of section P), `between` (the coordinate two
structures share, or the refusal), `regimes` (one law or several, by evidence). Eval(Ξ, Γ) in the request's sense is
`evaluate(structure, laws, bound)` of nexus.ts for a law structure, and `at(x)` for a family; the result's mode says
whether it is a value, outside the domain, unbound, or unmodelled. A composition with mathematical semantics
("battery ⊗ motor ⊗ gearbox ⊗ load derives current, torque, speed, heat") is the workflow engine of the ganglia
(`solve`, with inverse solve and sensitivity), not rebuilt here.

## D. Lazy semantic realisation

A family stores the law, the varying input and the held inputs: nothing else. `at(x)` builds the structure for one
point when asked; `value(x)` computes the law's output and nothing else; `edge` evaluates only the midpoints it
needs. Tested: finding the rating-life edge touched 24 points of a continuum; none remains.

## E. Adaptive cognitive resolution

Bisection is adaptive resolution in its honest form: the step halves where the law stops and nowhere else, to the
tolerance asked (a millionth of the input by default), and the count of evaluations is reported. The request's
"recursive zoom" of a motor into current, field, rotor, and further into carriers and microstructure is the
substrate's `has-part` and `coarse-grains-to` arrows (docs/SCALE.md), which stop where the substrate stops
(unmodelled); nothing finer is fabricated.

## F. Concept types

A concept may be a distinction (a point of the discrete part), a structure (a region: the set of things it is
true of), a family (a trajectory), a law (an operator: inputs to output), a quantity with an uncertainty (a
distribution, when `cert` is a distribution), a morpheme (an equivalence class of shapes), a domain (a constraint
surface). Nex infers the species from the structure: nothing is forced to be a node. What is not built: fields over
𝒩 and tensors; no question of Ego's has needed one.

## G. Metric and geometry

A distance declares what it measures: the fingerprint distance under a tuner (structural, under energy, thermal,
failure…), weighted by rarity so that the shape every textbook fact shares weighs nothing (section R of the main
document, corrected today); the semantic distance of structures (shape plus coordinates). The metric is
tuner-conditioned: g(x | Γ) in the request's notation is `distance(fp_a, fp_b, rarity)` under the tuner's
projection, and two things close under one tuner are far under another (the spring and the capacitor: 0.82 under
energy by content, one form J:1,2 at the level of the laws). No Riemannian metric is defined: nothing measured
today needed a metric tensor, and a continuous part exists only along one law input at a time, where the natural
distance is the input's own scale.

## H. When conceptual distance is meaningful

Only within a declared geometry: a fingerprint distance under a named tuner with its weighting named; a family
distance along a named input of a named law. A bare "distance = 0.42" is refused by construction: `distance` takes
fingerprints that a tuner made and a weight table that names its corpus. Across the discrete and the continuous
parts there is no distance.

## I. Geodesic reasoning

The simplest lawful path from A to B is, in the discrete part, the shortest chain of influences (the cause handler:
breadth-first, three steps, the chain's coordinates composed, the weakest evidence named); in the continuous part,
the family between two points of one law. Several paths are kept apart by what they measure: a causal path (chain of
influences), a proof path (the support tree, `why`), a form path (the laws of one form, section R). Path integrals
are not defined: nothing asked for one.

## J. Admissible and forbidden regions

𝒜ℓ = Dℓ, the law's domain, declared by the law in code (`outside`) and in words (`valid`). A structure outside it
is in mode `outside-domain` with the reason under it; a family's `at` says so per point. Hypothesis, fiction and
counterfactual are contexts (C: assume, branch, intervene) and the evidence rank `fictional`: exploring outside the
admissible region is allowed only inside such a context, which the rendering says.

## K. Constraint-manifold architecture

F(x) ≤ 0 is what `outside` encodes for each law; the admissible set is their intersection where several laws
govern one thing (the workflow engine checks each). An invention as a search over x ∈ 𝒜 subject to goals is the
grow engine's search over ways and blocks with checks (docs/CHALLENGES.md), which already returns families of designs
by spec; a Pareto surface is not built.

## L. Multi-representation semantics

The universal thing is the transformation between representations, as the request suspects: Nex's canonical form
(T), its compact text and spoken form (E), its English and Spanish renderings with loss counted (M, N), the law
book's formulas and evaluation (X), the substrate's arrows (fromRelation), the tree's nodes (fromNode): each is a map
to or from the canonical form, and the canonical form is the one all of them must agree on. The interoperability
calculus is the set of those maps with their declared losses; it was built before today, and this audit adds the
continuous part's map (`at`, `verdictStructure`).

## M. Coordinate-chart system

A law is a chart: its inputs are the coordinates of the region it covers, and its form (the exponents, section R
of the main document) is the chart's shape with the symbols gone. Mechanical, energy, electrical and thermal
coordinates are the input lists of the laws of those theories; the maps between charts are the laws of one form
(five energies, one form) and the quantities two laws share (`sharesCoordinate`). No chart owns reality: the
tuners are the projections π_i, and the form of a law is the same under every tuner.

## N. Self-discovered coordinates

Built in the smallest honest form: given samples alone, `regimes` discovers whether one coordinate (a power of x)
explains them and with what exponent, or several regimes with boundaries. Latent variables beyond one (z₁…z₄ for
thirty human concepts) are not built: no corpus of Ego's has the data for it, and a method that would find them on
synthetic data proves nothing about her knowledge. The evaluation criteria the request lists (compression,
prediction, derivation simplicity, transfer, stability) are the right ones; description length is the one used here.

## O. Morphemes as manifold compression

A morpheme is a symbolic shortcut into a frequently used region (section O of the main document: the first eight,
17 % shorter). "Continuum first, category when useful" is the rule the grammar already follows: a shape becomes a
morpheme only when it recurs across domains and shortens the corpus. A category is a region: `regimes` shows when
three human categories are one region (one continuum) and when one smooth curve is two.

## P. Semantic derivatives and gradients

Built before today for laws (lawInfluences: the sign and size of ∂y/∂x at the worked example; forms: the exponents)
and today for families (`sensitivity`): d ln y / d ln x at any admissible point. A gradient of a goal over several
inputs is the workflow engine's sensitivity (ganglia v2), which ranks what a design hangs on.

## Q. Discontinuity and strata

Strata exist where laws stop and where regimes change: the edge of a domain (`edge`), a boundary between regimes
(`regimes`), the modes (true, outside-domain, unmodelled) that a structure changes between. Solid, fractured and
melted are different laws with different domains (the melting point is in the materials pack); hypothesis, validated
and contradicted are evidence ranks and the contradict operator. No topology is built beyond that; the request's
"topology-changing" is the mode change at an edge.

## R. Attention as active region

Designed, not built: the active region A_t would be the set of structures a question has touched (the families
materialised, the arrows walked, the laws evaluated). The cause handler's three-step frontier and a family's
evaluated points are what that set is today; it is not kept between questions.

## S. Memory integration

Long-term: the substrate, the law book, the tree, the morpheme registry and the journal (what the queue asked and
learned). Episodic: Ego's book of her creatures (what their minds did, docs/CREATURES.md) and the journal of
answers. A trajectory through World State × 𝒩 is not kept.

## T. Prelinguistic concept-formation benchmark

Designed, not built, and the request is right that it is the strongest test. What exists toward it: the engine
measures observations (docs/SCALE.md: ten measured observations) before any label, and a law is checked against
the world's own measurement (the conformance suite). The benchmark as it should be run: a synthetic world giving
only observations and actions; the system forms structures (`regimes` finds the law's form in the samples; the
grammar finds what recurs); a human word is attached afterwards to the structure that already exists; the test is
that the word attaches to the structure rather than creating it. Not run today: it needs a world that gives
observations without the substrate's names, which is a day's work in itself.

## U. Cross-tuner commutativity

Rendering through English, Spanish and the compact text come back to one structure (section N of the main
document: round trips measured); the spoken form comes back without loss; the law's formula renders through the
function case. The core structure is the same under every tuner because the tuners are projections of one
canonical form. A composition of tuners (energy with failure: how energy pathways create failure) is the
intersection of their selections; not built as an operator.

## V. Continuous against discrete against hybrid

Measured on the capability table above. Costs: a family stores three things; an edge is found in about 24
evaluations; `regimes` is O(n²) in the samples for one boundary and O(n³) for two, trivial at the sizes a
question gives. Memory and search complexity of the discrete part are unchanged by the continuous part, which is
materialised per question and dropped.

## W. False-interpolation benchmark

Tested: heat against temperature (different dimensions) refused as undefined; a motor against a bearing (no shared
coordinate) refused; two structures of one law differing in two inputs refused as unknown with the reason (a path
needs one coordinate at a time, or a declared curve); pure noise never split into regimes.

## X. Hidden-continuum benchmark

Tested: rating life at loads from 0.5 to 6.25 N, labelled light, medium and heavy by a human cut, with 2 % noise:
one continuum, exponent −3.00 (the law's), the labels intervals of one coordinate; the categories are a cut, not
distinctions.

## Y. Hidden-discrete-regime benchmark

Tested: the Darcy friction factor of a pipe sampled across Re = 300 to 59 000 with 2 % noise, one smooth-looking
curve: two regimes, exponent −1.00 below and −0.25 above, the boundary placed between the last laminar and the
first turbulent sample (Re ≈ 2440 against 2300, one sample gap at a ratio of 1.2), chosen because the two regimes
cost fewer bits than one; on pure noise, one regime.

## Z. What changes in the current implementation

Added: `space.ts` (families, edges, between, regimes, verdict structures, shared coordinates), the edge question in
Ego's path ("how far can the load go before the rating life law stops applying"), this document. Unchanged: the
canonical form, the hash, the tuners, the translation layer, the grammar. Rejected as decoration for now: a
Riemannian metric, path integrals, fields and tensors over 𝒩, a universal latent-coordinate discovery, attention
and memory as manifold regions. Kept as designed with a stated test: the prelinguistic benchmark (T). The rule
that governs the rest: a continuous structure enters Nex when a law gives it coordinates and a question needs it;
never because two things look alike.
