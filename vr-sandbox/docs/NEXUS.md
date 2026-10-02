# The Nexus: a scientific knowledge architecture for Ego

Design pass, 2026-10-02. Track B of the audited evolution (docs/LAW-TREE.md is the structure this generalises;
docs/AUDIT-2-FALSE-CONFIDENCE.md and docs/AUDIT-3-EGO-KNOWLEDGE.md are the failure modes it is built against;
docs/FRONTIER.md is where its open ends live). Nothing here is implemented beyond §Z step 0; it is the target the
repairs migrate toward, and the test of every repair from now on is that it lands as something this architecture
would hold.

The question asked: what is the most advanced architecture in which Ego can invent, explain, debug, simulate,
discover, question and revise physical models without confusing imagination with knowledge, simulation with reality,
correlation with causation, a numerical artefact with a phenomenon, a representation with an ontology, convention
with necessity, consensus with truth, neural confidence with proof, consistency with validity, or evidence with
desire.

The answer, compressed first and defended afterwards (the full compression is the last section):

> **Four primitives and one principle.** A *typed judgment* checked by a small kernel (propositions are types, derivations and designs are terms, the hypergraph is the set of proof terms); a *theory morphism with a contract* (every model relates to every other only through maps that say where they agree and by how much: approximation, limit, scale, realisation, intervention, equivalence); an *evidence leaf* (an observation with provenance, the only kind of node not under Ego's authority, compared against predictions by one rule); and *content-addressed, branchable state* (identity is the hash of structure, so an ancestor's change is a dependent's invalidity by construction, and worlds, theories and restructurings are branches). The principle: **only the kernel makes judgments; everything else, neural or symbolic, proposes.** Every one of the hundred requests is a consequence of these, a query over them, or a rendering of them.

Confusions and what prevents them:

| confusion | prevented by |
|---|---|
| imagination with knowledge | a proposal has no status until the kernel types it; status is a function of the weakest rule in a term's support (§F, §G) |
| simulation with reality | a run is a derivation inside a model; a measurement is an evidence leaf; the two meet only in the comparison rule (§Q, §R) |
| correlation with causation | intervention is attaching a source element to a port; observation is attaching a sensor; a claim about do() needs a derivation in the intervened model, never a fit over observations (§K) |
| a numerical artefact with a phenomenon | a realisation is a morphism with an error contract; anything inside the contract's error is the realisation's, and the anomaly ladder starts at "numerical suspicion" (§O, §R) |
| a representation with an ontology | representations are morphisms into view objects; nothing in a hash depends on a name or a unit (§E, §Z, the last test) |
| human convention with physical necessity | conventions are terms of kind `convention` (units, coordinates, categories) with their own provenance; a conclusion that depends on one carries that dependency in its support (§I) |
| current consensus with eternal truth | every empirical judgment has a revision burden computed from its support, never infinity (§Q.7) |
| neural confidence with proof | the closure principle: a proposer's score is not a rule (§H) |
| mathematical consistency with empirical validity | consistency is a kernel property of a model; validity is an evidence property of a model's predictions, held separately and never merged into one number (§Q) |
| evidence with desire | a design goal is a type to inhabit; it is not a premise of any physical judgment, and the kernel has no rule that takes it as one (§J, §V) |

---

## A. The simplest underlying mathematical structure

**A dependently typed logical framework whose base types carry physical dimensions, organised as a category of theories related by contracted morphisms, with a Merkle-addressed store and two classes of leaf: axioms (Ego's) and observations (the world's).**

Why this and not the alternatives listed:

- A **typed hypergraph** is the right *shape*, and the wrong *primitive*. A hyperedge {A, B, C} → {F, G} with a rule, a domain and an uncertainty is exactly an application of an inference rule to premises yielding conclusions; that is a proof term. Storing hyperedges as data invites an edge nobody checked. Storing proof terms makes an unchecked edge impossible: a term either typechecks or does not exist. The hypergraph is what the set of proof terms looks like when drawn.
- A **proof graph** and a **constraint network** are the same object seen from the derivation side and the type side: propositions as types, constraints as refinement types, satisfaction as inhabitation (Curry–Howard). Design is proof search for an inhabitant of the specification's type; infeasibility is a proof of ⊥ whose support is the minimal conflicting subset.
- A **causal graph** is the hypergraph's mechanisms oriented by a choice of what is controlled, which in a port framework is which ports have sources attached. It is a view, with a semantics, not a second store (§K).
- A **factor graph** is the hypergraph read with a semiring: boolean for consistency, interval for bounds, probability for belief, tropical for cost. Message passing is one algorithm with four instantiations (§L). Useful; not a primitive.
- A **category** earns its place in exactly two spots: composition of components through ports (A-1 makes composition a monoidal operation with a passivity theorem, ML-3), and composition of model-to-model maps (approximation chains compose with their error contracts adding). Nowhere else.
- A **sheaf** earns one condition: local models on overlapping regimes must agree on the overlap to within their contracts (the regime map, §O.4). The condition is a kernel obligation; sheaf theory is not the architecture.
- A **knowledge graph** (untyped relations between named things) is rejected as the core: it is the thing the audits found Ego already had, prose relations counting as reasoning.
- A **neural graph** is a proposer (§H). It has no store of its own that counts.

## B. Requested ideas that are redundant and merge

| requested | is | merged into |
|---|---|---|
| the fifteen views (generality, causal, proof, evidence, energy flow, information flow, scale, time-scale, constraint, numerical, anomaly, contradiction, invention, manufacturing, belief) | functors from one structure | §D: one store, views are derived renderings; none holds truth |
| DERIVED_FROM, DEPENDS_ON, PARAMETERIZED_BY, ASSUMES, BOUNDED_BY, EXTRAPOLATED_FROM, REALIZED_BY, APPROXIMATED_BY, MEASURED_BY, VALIDATED_BY, SUPPORTED_BY, OBSERVED_IN, CONTRADICTED_BY | three structural kinds plus two computed | premise-of-rule (DERIVED_FROM), free assumption in context (DEPENDS_ON, ASSUMES, PARAMETERIZED_BY, BOUNDED_BY), contracted morphism (REALIZED_BY, APPROXIMATED_BY, EXTRAPOLATED_FROM); SUPPORTED_BY and CONTRADICTED_BY are *computed* by the comparison rule, never asserted (§E) |
| DERIVES, CAUSES, CONSERVES, TRANSFORMS, CONSTRAINS, BOUNDS, DISSIPATES, STORES, EXCHANGES, MEASURES, OBSERVES, INTERVENES_ON, SENSITIVE_TO, INDEPENDENT_OF | mostly not relations | CONSERVES, DISSIPATES, STORES, TRANSFORMS, EXCHANGES are *element types* of A-1 (a store, a dissipator, a transformer) or *theorems* about a model (a conservation law); CONSTRAINS and BOUNDS are refinement types; MEASURES and OBSERVES are sensor elements; INTERVENES_ON is a source element; SENSITIVE_TO and INDEPENDENT_OF are derived judgments (∂y/∂x bounds); DERIVES and CAUSES are the two readings of a rule application (§E, §K) |
| EMERGES_FROM, COARSE_GRAINS_TO, LIMITS_TO, APPROXIMATES, VALID_AT_SCALE, IS_EQUIVALENT_UNDER, surrogates, model escalation, reduction caching, adaptive fidelity | one thing | a theory morphism with a contract; choosing a model is choosing the coarsest morphism whose contract covers the query (§O) |
| anomaly nodes, contradiction nodes, competing theories, theory sandbox | three cases of one | a persistent comparison result with no accepted explanation; a derivable ⊥; several model branches with evidence sets (§R, §W) |
| versioning, history, world version DAG, theory sandbox, transactional restructuring, invalidation job, "derived beliefs as functions of ancestry" | one | content addressing (§W, §X): there is no invalidation job because a stale hash is stale by construction |
| inventor, skeptic, scientist, auditor; metacognitive questions; question generation; research sets | one search with four objectives, and queries over support sets | §U |
| experiment design, "which measurement reduces uncertainty most", "which datum affects most designs", value of a simulation | one expected-information objective over proposals, within a model class | §T |
| proof-carrying invention, derivation certificate, state-transition certificate, impossibility certificate, "works" certificate | terms | §V: an invention is a term whose type is the spec under the model; a run is a term per tick; impossibility is a term of type ⊥ |
| self-compression, theorem discovery, motif discovery, cross-domain isomorphism, analogy, latent variables, dimensionless collapse | one proposer family | anti-unification and structure search over terms, every candidate checked (§S) |
| physical type system, Physical IR, composable interfaces, "valid components + valid composition ⇒ valid system", constraint propagation, minimal conflicting subset | one | types (§I, §J, §M) |
| overlays, explanation levels, user/engineer/physicist/mathematician/auditor presentations | renderings of one term | §V.3 |
| self-health metrics, architecture-complexity metrics | queries | §Y |

## C. Ideas that are fundamentally different and stay separate

1. **Derivation and evidence.** Derivation runs from structure to consequence; evidence runs from the world to structure. They never share a rule except the comparison rule, which takes one of each and produces a third kind of thing (a comparison result). Merging them is how a simulation becomes "data".
2. **Status and probability.** Status (which tier of rule the weakest link used; whether the support is current) is kernel-computed and discrete. Probability is belief within a stated model class under stated priors. A proved theorem does not have a probability; a fitted coefficient does not have a proof.
3. **A model and a map between models.** A model is a theory (a context of axioms and definitions). A morphism is a map with a contract. The multi-model structure lives in the morphisms; the models themselves are flat.
4. **Proposing and checking.** No process does both. The kernel checks and cannot propose (it has no search). Proposers search and cannot assert.
5. **The world store and the knowledge store.** Two Merkle DAGs. A run record references a root of each. A world branch is not a theory branch; a counterfactual intervenes on a world under one theory, a sandbox runs one world under two theories.
6. **A law and an engineering abstraction.** A law is a theorem in a model. An abstraction ("passive soft-stop module") is a *type* (a specification) with a set of known inhabitants. Types are not theorems; an abstraction can be empty.
7. **Content and rendering.** Names, units of presentation, English, diagrams and colours are outside the hash. The last test of the document (delete every label) is passed by construction only if this separation is total.
8. **Engineering and science.** Engineering fixes the model class and searches for inhabitants. Science fixes the evidence and searches over model classes. Same store, opposite quantifiers.

## D. Recommended core data model

One store of **terms**. Every term has a hash (§W), a kind, a type, and references to the terms it is built from. Kinds:

| kind | what | authority |
|---|---|---|
| `axiom` | a proposition assumed in a theory | Ego's, revisable with burden (§Q.7) |
| `definition` | a name for a term, with its type | none (eliminable) |
| `rule` | an inference rule of the kernel, with its tier (§F) | the kernel's |
| `judgment` | a proposition with a proof term (an application of rules to premises) | the kernel's; status computed |
| `theory` | a context: a set of axioms and definitions, with its signature of types | Ego's |
| `morphism` | a map between two theories with a contract (§O.1) | the kernel's for the map's typing; evidence for the contract's bound |
| `observation` | a measured quantity with uncertainty, instrument, provenance, time, world root | the world's; sealed |
| `comparison` | the result of comparing a judgment's prediction with an observation | computed by one rule |
| `proposal` | a candidate term from a proposer, not yet checked | none |
| `convention` | a unit system, a coordinate choice, a category scheme, a naming | none; a dependency to carry |
| `run` | a record: world root, theory root, settings, seed, the per-tick certificates' root, instruments' extremes | the kernel's (it is a derivation) |
| `world` | a state of a simulated world (bodies, modes, internal states) under a theory root | the world store's |

What is not a kind: a "belief", a "law", a "model", a "hypothesis", a "fact". A belief is a judgment Ego cites; a law is a judgment of a theory; a model is a theory; a hypothesis is a judgment whose support contains a `proposal` promoted to `axiom` in a sandbox branch; a fact is an observation. The English words are views.

The current `Node` of `src/ganglia/tree/schema.ts` maps onto this: a node of kind axiom or model-assumption is an `axiom`; a law node with a `form` is a `judgment` (or an `axiom` of its theory where no derivation is given yet; its `proof` field is the status until the kernel computes it); `realisedBy` is a `morphism` of class REALISES whose contract is the node's `contract`; `heldBy` is a set of `observation`s of the property-test kind; `parents` is the generality functor's data (§D.1); `value` nodes are `axiom`s of a constitutive theory with provenance.

### D.1 Views as functors

A view is a function from the store to a drawing. The generality view (the law tree) is the functor that keeps `parents` and forgets everything else. The proof view keeps rule applications. The evidence view keeps observations and comparisons. The causal view orients mechanisms by the sources attached (§K). The scale and time-scale views keep morphisms of class COARSE_GRAINS_TO and the characteristic-time axioms. The constraint view keeps refinement types. The numerical view keeps REALISES morphisms. The anomaly and contradiction views keep comparisons with no accepted explanation and derivations of ⊥. The invention view keeps terms whose type is a specification. The manufacturing view keeps the realisability judgments (A-5). The belief view keeps what Ego cites, with status. None is stored. A view that needed its own store would be a sign that something was missing from the terms.

## E. Formal hypergraph structure

A **derivation** is a term

    d = rule(premises: judgment[], side: { theory, domain, parameters }) : conclusions

and the hypergraph H = (V, E) has V = judgments ∪ observations ∪ axioms and E = derivations, each a directed hyperedge from its premises (and the axioms its context cites) to its conclusions. Properties the kernel keeps:

- **Well-founded.** Every path up ends at an axiom, an observation or a convention. (The current tree test checks this for `parents`; it becomes a theorem of the store: a term references only hashes that exist, and hashes are acyclic by construction.)
- **Typed.** Each conclusion's type is what the rule's signature says it is given the premises' types. Dimensions are part of the type (§I).
- **Tiered.** Each derivation carries the tier of its rule; a judgment's tier is the minimum over its support (§F).
- **Conditioned.** A derivation's side condition (domain, parameter ranges) is a refinement type on its premises; a conclusion inherits the conjunction of its support's conditions as its own domain. Leaving the domain is not a weaker judgment; it is no judgment (the `exit` of the current `Domain` type: `outside-validated-domain`, `extrapolation`, `model-not-available`, `bound-only` are four *different rules*, of which only `bound-only` yields a judgment, of tier CERTIFIED-BOUND).
- **Multi-output.** A rule may conclude several typed quantities at once (the electromechanical derivation of the request: six premises, four conclusions). This is one term with a product type, not four edges.

Three structural relations, and only three, are stored:

1. **premise-of** (DERIVED_FROM): d's premises. The transitive closure is the *support* of a judgment.
2. **in-context** (DEPENDS_ON, ASSUMES, PARAMETERIZED_BY, BOUNDED_BY): the free assumptions of a judgment, which are the axioms of its theory it actually uses plus the refinement conditions it carries. A judgment that depends on a convention lists it here.
3. **morphism** (REALIZED_BY, APPROXIMATED_BY, COARSE_GRAINS_TO, LIMITS_TO, IS_EQUIVALENT_UNDER, EXTRAPOLATED_FROM, INTERVENES_ON): a map between theories with a contract (§O.1).

Two computed relations: **supports** and **contradicts** (a comparison result's sign, §Q.4). They are never asserted.

WHY(C) returns the support of C as a term, cut at the first rule application whose premises are all axioms, observations or cached judgments (the minimum sufficient subgraph), with each cut expandable. It preserves the three relations because they are three different constructors of the term.

## F. Inference calculus: defining ⊢

Γ ⊢ C means: there is a term of type C in context Γ built only from kernel rules. The kernel's rules, with their tiers (a tier is a label the rule carries; it never changes by use):

**Tier 0, FORMAL.** Logical rules (introduction and elimination for ∧, ∨, →, ∀, ∃, =, ⊥), substitution, algebraic rewriting under a decidable equational theory (commutative rings, vector algebra, quaternion identities), dimensional inference (§I), symmetry consequence (apply a group action in FS-6 and rewrite), variational result (stationarity of a functional, as an equation), conservation balance (ML-1: the flux across a cut equals the change on each side), constitutive instantiation (substitute a theory's constitutive axiom at a state in its domain), inequality propagation (interval and affine arithmetic, sound outward rounding), limit operation (symbolic, with the limit's existence as a premise), fixed-point existence (Banach's condition as a premise), optimality (KKT as a premise, yielding stationarity).

**Tier 1, CERTIFIED-BOUND.** Numerical approximation with a verified bound: an interval Newton step, a Lipschitz bound, a Taylor model, a verified ODE enclosure, the row solver's exit condition g ≤ 0 with its leak bound (F-2.6). The conclusion is an *enclosure*, never a point.

**Tier 2, PROPERTY-TESTED.** A universally quantified claim held over a generated family of instances within a stated domain (the firewall tests). The rule's conclusion is "no counterexample in N draws from distribution D", not the universal; a judgment of tier 2 carries N and D.

**Tier 3, EMPIRICAL.** Empirical induction (a parametric form fitted to observations with a residual distribution), calibration (a constant from a measurement with its uncertainty), extrapolation (a fitted form evaluated outside its fit range, with the range named), model comparison (a likelihood ratio or an information criterion between theories on the same observations), statistical inference (a posterior from a prior and observations under a stated likelihood). Every tier-3 rule takes observations among its premises and a theory as its context; none can be applied without a `comparison` in its support.

**Tier 4, HEURISTIC.** A proposer's output promoted to a judgment by a human or by Ego explicitly, with that act as its only support. Allowed to exist so that it can be named and distrusted; it can appear in no derivation of tier ≤ 3 (the kernel refuses the application).

**UNKNOWN** is not a tier; it is the absence of a term. The kernel distinguishes, for a query C: DISPROVED (a term of ¬C exists), PROVED (a term of C exists), NO DERIVATION FOUND with the search's budget and the fragment searched, and TIMEOUT. A proposer that fails to find a term reports the third; it cannot report the first. "Impossible" is a term of ⊥ from the design's constraints and the theory's axioms, and its support is the unsat core (§M).

Two rules the calculus deliberately lacks: *plausibility* (nothing concludes from "it looks like") and *desire* (nothing concludes from a goal). Design success enters only as a type to inhabit.

Causal intervention inference (the request's last listed class) is not a rule: it is a morphism (§K). Coarse-graining likewise (§O).

## G. The trusted kernel

Boring by design. One module, no search, no I/O, no floating-point beyond interval arithmetic with directed rounding, no dependency on anything that can be swapped at runtime. In this codebase it is a TypeScript module whose only exported constructor of `Judgment` is private to it (the LCF discipline): a value of that class exists only if a rule function made it.

```ts
// sketch: src/ganglia/kernel/ (not yet written; §Z step 1)
export class Judgment { private constructor(readonly hash: Hash, readonly prop: Prop, readonly tier: Tier, readonly support: Hash[], readonly ctx: Hash /* theory */) {} }
export const rules = {
  modusPonens(ab: Judgment, a: Judgment): Judgment,
  substitute(eq: Judgment, inWhich: Judgment): Judgment,
  dimension(q: Quantity): Judgment,            // a quantity's dimension vector is what its type says
  balance(cut: Cut, inside: Judgment, outside: Judgment): Judgment,   // ML-1
  instantiate(th: Theory, axiom: Hash, at: State): Judgment,         // a constitutive law at a state in its domain
  interval(op: Op, ...xs: Judgment[]): Judgment,                     // tier 1 enclosure
  propertyTest(claim: Prop, draws: number, dist: Hash, log: Hash): Judgment,  // tier 2, with its N and D
  calibrate(th: Theory, param: Hash, obs: Observation[]): Judgment,  // tier 3
  compare(pred: Judgment, obs: Observation): Comparison,              // the one rule across the gap (§Q.4)
  ...
};
```

What it validates, and nothing else: types (including dimensions), the legality of each rule application (premise types match the rule's signature; the tier is the rule's), domain membership for every instantiation, the arithmetic of contracts when morphisms compose (§O.1), resource accounting (every derivation records its cost; a budget is a refinement type on the derivation itself), the status of a judgment (tier, currency of its support's hashes, domain), and the legality of a status transition (a proposal becomes an axiom only in a branch, §W; a branch becomes the main head only through §X).

What it does not do: search, rank, choose models, run simulations, parse language, decide what is interesting. Those are proposers or renderers. The kernel is small enough that its own correctness is the one thing in the system argued by reading, and its test is the tier-0 property suite plus the firewall.

The kernel is a *realisation* too, and its own fidelity is an axiom (A-4 says so). Floating point inside the kernel is confined to interval arithmetic with outward rounding, so that a tier-1 enclosure is sound against rounding; a point value never leaves the kernel as a judgment, only as the midpoint of an enclosure rendered for a person.

## H. The neural discovery layer

Everything in the request's list (analogies, path ranking, hidden variables, candidate equations, invariants, compression, motifs, cross-domain similarity, abstractions, likely anomalies, experiments, parameter importance, mechanisms, missing branches) has one interface:

    propose(query, store-view, budget) → Proposal[]

and a `Proposal` is a term of kind `proposal` with no type (it has a *claimed* type), a proposer id and version, a score (opaque; the kernel ignores it), and the sub-view it was computed over (so that it is inspectable). Promotion runs through the pipeline the request names, as kernel operations:

1. symbolic formulation: the proposal is parsed into a candidate term (a renderer in reverse; failure here is a dead proposal);
2. type and dimension check: the kernel types it or rejects it;
3. formal derivation where possible: a proof-search proposer tries to build a tier-0/1 term of its claimed type; success makes it a judgment at that tier;
4. domain check: its free conditions are collected;
5. numerical tests: a property-test proposer draws instances; the kernel records a tier-2 judgment or a counterexample (a tier-0 disproof);
6. causal check: if it claims an intervention effect, a derivation in the intervened theory is required (§K);
7. empirical evidence: comparisons against observations;
8. adversarial attack: the skeptic objective (§U) searches for a counterexample within the domain; a survivor's domain is what survived.

A proposal that stops at step 2 has no status. One that passes 5 but not 3 is PROPERTY-TESTED, and says so. Neural confidence is consumed only by step 0: which proposals to spend budget on. It is an *ordering*, never a *premise*.

Embeddings and graph neural methods belong here as proposers over views: structural similarity between subgraphs (candidate morphisms, §O.1), anomaly scoring over comparison sets (which to investigate first), motif detection over proof terms (candidate lemmas, §S), path ranking for proof search. Each produces proposals of the kind named. An embedding distance never becomes an edge.

A learned **surrogate** of a simulation is a proposer with a special promotion: it may become a theory morphism of class APPROXIMATES only with a contract (training domain, validation error distribution, an out-of-domain detector that is itself a judgment about the inputs, source model root, version); inside the domain its outputs are tier-3 judgments with the contract's error; outside, the morphism does not apply and the authoritative model runs (§O.3).

## I. The physical type system

Types carry dimensions, refinements and ports.

**Dimensions.** A quantity type is `Q(dim: Z^7, unit: convention)` with the dimension vector over the SI base (M, L, T, I, Θ, N, J) as structure and the unit as a `convention` term referenced for rendering only; equality of types is equality of dimension vectors. Addition requires equal vectors; multiplication adds them; a transcendental function requires the zero vector; an equation's two sides must agree. This is dimensional inference as a type rule (ML-2), already realised in the ganglia's unit layer, which migrates into the kernel. Angles and counts are dimension-zero but *tagged*, so that radians and turns are not confused by the rendering convention (the one place dimensionless quantities need a tag).

**Refinements.** `Q(dim) ∩ {x : a ≤ x ≤ b}` with interval bounds, or with a distribution (§Q.1). Constraint propagation (§M) is inference of the tightest refinement the kernel can prove; an empty refinement is ⊥ with its support.

**Ports and elements.** A port type is an effort–flow pair with dimensions whose product is power: `Port(effort: Q(e), flow: Q(f))` with `e + f = [M L² T⁻³]`. Mechanical translation, rotation, electrical, hydraulic, thermal (temperature × entropy flow) are five instances of one type. An element type is a map between port tuples with a *sign*: a store (energy in, bounded by its state), a dissipator (power ≤ 0 always), a source (power unbounded above, drawn from a named store), a transformer or gyrator (power-conserving, with a ratio), a junction (power-conserving, workless). This is A-1 as a type signature.

**Dependent component types.** The request's `Motor[V_max = 48 V, I_max = 120 A, ω_max, T_operating]` is `Element(gyrator, ports: (electrical, rotational, thermal), params: {k: Q[N m / A] ∈ ..., R: Q[Ω] ∈ ..., J: ...}, envelope: refinement on (V, I, ω, T))`. A proposed operation on a component outside its envelope fails to type. A `Beam[material, geometry, T ∈ domain]` is an element of the structural theory with its capacity as a refinement; a load outside it fails to type before any simulation. This is the request's "part of validity becomes compilation", and it is exactly what the current foresight statics does by hand.

**Composition.** Connecting two ports requires equal port types (dimension-level) and dual causality (one side sets effort, the other flow) where the solver needs it; a junction connects n ports with Σ power = 0. The theorem (ML-3, a tier-0 judgment of the kernel's own theory): the composition of passive elements through junctions and power-conserving two-ports is passive. Hence *valid components + valid composition ⇒ a passive system*, with no simulation. It does not give "⇒ a working system": function is a refinement type on the composite's behaviour, which still needs a derivation or a run. The category here is the symmetric monoidal category of port diagrams; its use is this one theorem and the compositional checking of interconnections. Nothing else in the architecture is categorical.

**Conventions as types.** Unit systems, coordinate frames, angle measures, naming schemes and the human partition of physics into mechanical/electrical/thermal are `convention` terms. A judgment that cannot be stated without one carries it as a dependency; a judgment that can (anything written in dimensionless groups and invariant forms) does not. The alien test (the last section) is: how many judgments carry no convention dependency.

## J. The Physical IR

A pipeline of types, each a refinement of the one above, each inhabited by the one below:

1. **Semantic IR**: the request parsed to an intent over named things in the scene ("this drawer", "close", "softly", "without touching").
2. **Functional IR**: a refinement type on a trajectory. For the drawer: `∃ element e attached across the drawer's translational port : K(t_end) ≤ ε ∧ no rebound (ẋ changes sign at most once in the last L) ∧ e is passive ∧ e has no external port (no control, no source)`. Nothing about dampers yet.
3. **Physical IR**: the element types that can inhabit the functional type, by the signatures of A-1: a dissipator across one translational port, with a force law `f(x, ẋ)` whose power is ≤ 0, within a geometry envelope (a refinement on the element's volume and attachment). The kernel can already say what *cannot* inhabit it: a store alone (it returns the energy), a source (not passive), a controller (an external port).
4. **Mechanism search**: proposers enumerate inhabitants of the physical IR from the theory's element catalogue, by *function*, not by name: a viscous dissipator (f = −c ẋ: a fluid dashpot, an air dashpot, a squeeze film), an eddy-current dissipator (f = −c(x) ẋ with c from the conductor's geometry and the field: M4), a Coulomb dissipator (f = −μ N sign ẋ, which fails "softly" unless N(x) is shaped), a hysteretic one (a plastically yielding stop: single use, which the functional IR rejects if "every time" is in the intent). Each candidate is a term; its type-check against the functional IR is a derivation (does the force profile remove K by t_end without reversing ẋ?), tier 0 or 1 where the law is closed-form, tier 2 or a run otherwise.
5. **Constraint propagation** over the candidate's parameters (§M) prunes what cannot fit the envelope (a dashpot too long for the drawer's depth).
6. **Topology and geometry**: where it attaches, what it is made of (A-5: makeable), producing a design term.
7. **Simulation**: a run under the theory, yielding per-tick certificates.
8. **Certificate**: the invention term (§V).

Invention "from physics rather than from remembered objects" is step 3→4: the search space is the set of element types that inhabit a signature, and remembered objects are just cached inhabitants. A mechanism no training example contained appears when a proposer composes elements whose composite type inhabits the IR and nothing in the catalogue has that composite. The kernel does not care whether it has a name.

## K. Causal and intervention model

Physical laws are equations without arrows; F = m a does not say which side causes which. Causal structure appears when something *outside* the system fixes a variable. In the port framework that is one of two element kinds attached to a port from outside:

- **observe(X)**: attach a *sensor* element (F-6.1): a port that draws no power (or a declared small amount), has latency, and emits a reading. Observation is reading a sensor, never reading the state (FC-17 is the violation).
- **do(X = x)**: attach an *ideal source* element to X's port: effort or flow fixed at x, power drawn from a named store (F-2.2). Graph surgery (replacing X's mechanism with a constant) is exactly this: the mechanism that used to set X is overridden by the source, and the rest of the structure is unchanged.

So an SCM over a physical system is: the theory, plus a choice of which ports carry sources. The causal view (§D.1) orients each mechanism from the ports with sources toward the rest. Pearl's three operations become:

- **Forward (prediction)**: derive in the theory with the given sources.
- **Intervention (do)**: construct the theory morphism `intervene(X = x): T → T_x` (class INTERVENES_ON; it adds a source element and removes nothing else; its contract is exact), derive in T_x.
- **Counterfactual**: abduction of the exogenous state from observations in T (a tier-3 inference of the unobserved inputs consistent with the sensors' readings), then `intervene`, then forward derivation in T_x from that state. The three steps are three terms; the counterfactual's status is the minimum of theirs (so never above tier 3, because abduction is empirical).

Observational correlation cannot justify an intervention claim because there is no rule from a `comparison` set to a judgment in T_x; the only route into T_x is the morphism, and the only derivations there are the theory's. A fitted relation between observed X and Y is a tier-3 judgment *in T* about T's observations; applying it in T_x requires the morphism to carry it, which it does only if the derivation of Y from X in T does not pass through the mechanism the source replaced. The kernel checks that by looking at the support.

Dynamics are cyclic at the equation level (feedback); the causal view is acyclic only unrolled in time, which is why the **run** (§W.3) is the causal object for dynamics: each tick's transition is a mechanism application, and causal archaeology (bearing failed ← temperature ← friction ← misalignment ← load redistribution ← bending ← earlier impact) is a backward walk over the run's per-tick certificates, which are terms whose premises are the previous tick's state and the elements that acted. The diagnostic mode (§N) is this walk filtered to the obligation that failed.

## L. Message passing

One algorithm over the hypergraph, with a semiring chosen by the question. Each judgment node holds a value; each derivation node is a factor; messages are the factor's image of its neighbours' values. Instantiations:

| semiring | value at a node | message | fixed point means | used for |
|---|---|---|---|---|
| boolean | consistent / inconsistent | implication | consistency of the subgraph | the constraint view's first pass |
| interval (and affine forms) | an enclosure of the quantity | outward-rounded image of the factor | sound outer bounds on every quantity | feasibility (§M), envelopes (battery → motor → mechanics → thermal → controller) |
| probability (sum–product) | a marginal distribution | the factor's marginalisation | approximate marginals (exact on trees) | belief over parameters within a model class (§Q) |
| max–product / tropical | a best configuration / a cost | min-plus | the cheapest derivation, the dominant uncertainty, the latency-critical path | path ranking, sensitivity (§Q.5), resource (§Y) |

Outcomes, as the request names them: CONSISTENT FIXED POINT (the values stopped changing within tolerance), INCONSISTENCY (an interval emptied: the unsat core is the set of factors whose messages emptied it), UNRESOLVED (the budget ran out while values were still moving: a tier-1 enclosure of what was reached, never a conclusion), MULTIPLE SOLUTIONS (the interval semiring cannot tell; a branch-and-bound proposer splits an interval and runs again on each half).

Two honesties the architecture must keep. Interval propagation on coupled nonlinear physics is *sound and incomplete*: it never excludes a feasible design but it can fail to exclude an infeasible one (dependency problem). It is a pruner, not a solver; a design that survives it still needs a derivation or a run. And on a cyclic graph, sum–product's fixed point is an approximation whose error is not bounded in general; its output is tier 3 at best and is labelled so.

Messages may carry, as the request lists, constraints (refinements), intervals, envelopes (refinements on a port's effort–flow set), distributions, sensitivity (a tropical value), required data (a message that a factor cannot fire because a premise is missing: the factor emits a *question*, §T.4), domain state (whether the factor's domain condition holds for the current values), and causal influence (whether the message passed through a source-replaced mechanism, §K). They are all values in one of the semirings, or annotations on a message.

## M. Constraint propagation and infeasibility

The request's example (mass < 10 kg, range > 500 km, battery < 1 L, 100 kW continuous, silent, no active cooling) is a conjunction of refinement types on a design term, propagated with the interval semiring through the theory's factors: energy density (a constitutive axiom with a range), thermal rejection (passive cooling: a bound on W/m² at the allowed surface temperature), motor mass per kW (a constitutive range), current limits, structural mass fractions, aerodynamic power at the speed the range and the time imply. Each factor narrows intervals; when one empties, the kernel has a term of type ⊥ whose support is the factors that participated in emptying it. A minimal conflicting subset is found by deletion: remove a factor, rerun, keep it if the emptiness goes away; the result is a minimal unsat core (not necessarily the unique minimum, which is NP-hard; the kernel says "a minimal set", never "the minimum"). Then relaxations: for each constraint in the core, the smallest change that makes the core satisfiable, found by widening its refinement until the propagation no longer empties (a one-dimensional search per constraint; a Pareto set when several must move).

This is design as feasible-space navigation: the design's type is narrowed until it is either empty (with its certificate of why) or small enough to search for inhabitants (§J). The same machinery answers "which constraint binds" (the one whose widening grows the feasible interval most, a tropical message) and "where are the cliffs" (a factor whose domain condition is near its edge).

## N. Forward, inverse, abductive, counterfactual, diagnostic, scientific

Six operations over one store; none has a structure of its own.

| mode | input | operation | output and its tier |
|---|---|---|---|
| forward | a design term, a theory, sources | derivation (rules; or a run) | predictions; tier of the weakest rule, or the run's certificates |
| inverse | a desired refinement on consequences | propagation of the refinement backward through factors (interval semiring, then inhabitant search) | the refinement on causes; a design term if one is found; UNSAT core if not |
| abductive | observations, a theory | search over exogenous states and element parameters for those whose forward derivation matches the observations within uncertainty (a tier-3 inference with a likelihood) | a set of candidate causes with posterior weights; never one cause unless the others are excluded by a comparison |
| counterfactual | observations, an intervention | abduction, then `intervene`, then forward | predictions in T_x; tier ≤ 3 (§K) |
| diagnostic | a failure (a violated obligation in a run) | the backward walk over per-tick certificates from the tick of violation to the first certificate whose own obligations held; then the realisation morphism whose contract was exceeded | the responsible realisation and the chain; tier 0 (it is a walk over existing terms) |
| scientific | an anomaly (§R) | the competing theories' branches; for each pair, an experiment maximising expected discrimination (§T); the experiment run; comparisons update the branches' evidence | an updated evidence set; a promotion only through §X |

The design of each mode is that its *output* is a term of the kind the table names, so that it can be cited, invalidated and rendered like anything else. "Why is this motor hot?" is abductive over the attention subgraph (§U.2) of the motor's thermal port; "what if the gear ratio were 10?" is counterfactual; "the bearing failed" is diagnostic; "the walker moved on a frictionless floor" was scientific, and is the worked example of §R.

## O. Multiscale

### O.1 Theory morphisms with contracts

A morphism `φ: T_fine → T_coarse` consists of a map of states (which variables of the fine theory determine the coarse state: the *survivors*), a map of parameters (how the coarse theory's constants are computed or fitted from the fine one's), a domain (a refinement on the fine state within which the map is claimed), and a **contract**: a bound on the discrepancy between deriving in T_coarse and mapping a derivation from T_fine, as a function of the domain's variables. The classes:

- **COARSE_GRAINS_TO**: molecular → continuum (survivors: densities, stresses; lost: positions), continuum → rigid body (survivors: pose, velocity; lost: strain; contract: strain energy small against kinetic and potential, the rigid-body model's exit condition), rigid body → component (survivors: port variables; lost: internal pose), component → system.
- **LIMITS_TO**: a theory with a parameter κ whose κ → 0 or ∞ recovers another (compressible → incompressible as Ma → 0; a new theory → the old one in the regime where the old one worked, which is the architecture's requirement on any proposed replacement, §X).
- **APPROXIMATES**: a reduced or surrogate model with an error bound in a domain (the implicit midpoint for stiff pairs, R-7; a fitted surrogate, §H).
- **REALISES**: a discrete method for a continuous law, with its error contract (the ten fields of the current `ErrorContract` are exactly a contract's fields: quantity, why, method, distorts, size, dependsOn, stepDependence, sign, untrustedWhen, measuredBy). A-4 is the axiom that every REALISES morphism has one.
- **IS_EQUIVALENT_UNDER**: an isomorphism with a trivial contract (Newtonian ↔ Lagrangian ↔ Hamiltonian ↔ port-Hamiltonian on the same state space; a change of coordinates). Equivalent theories share physical authority: a judgment in one is carried to the other by the morphism at tier 0, so there is one authority and several presentations.
- **INTERVENES_ON** (§K): exact.

Morphisms compose, and their contracts compose: domains intersect, bounds add (or multiply, for relative bounds), survivors compose. The kernel computes the composite contract; it does not trust a hand-written one for a chain.

### O.2 Which description is valid where

A quantity has a *scale of definition*: temperature is a survivor of the molecular → continuum morphism and does not exist in the fine theory as a state variable; a rigid body's pose does not exist in the continuum theory. The question "does this macroscopic concept exist at this scale" is answered by whether the morphism's survivor map defines it. Scale-invariant quantities are those fixed by every morphism in a chain (dimensionless groups, F-5.1); scale-dependent ones are mapped with a change; emergent ones are survivors that are not functions of any single fine variable (temperature, pressure, friction coefficient); irrelevant-at-larger-scale ones are in the kernel of the survivor map. "Which variables survive, which disappear, which effective parameters change, which universality class remains" are four queries over the morphism's data.

### O.3 Model escalation and reduction caching

A query names the quantity it wants and the accuracy it needs. The kernel selects the coarsest theory reachable by a chain of morphisms from the finest available such that the composite contract covers the query's domain within the accuracy; it derives there. If, during the derivation or run, a domain condition of the chosen chain fails (strain energy exceeds the rigid-body contract; Ma exceeds the incompressible contract), the derivation stops with a `domain-exit` term, and the query is re-posed one morphism finer. That is escalation, and it is automatic because contracts are data. The reverse, reduction caching: when a fine run shows that a coarse theory's predictions agreed within a bound over a domain, a proposer may submit an APPROXIMATES morphism with that domain and bound, promoted at tier 2 (it was tested on draws) or tier 3 (it was fitted), and the kernel will use it next time the domain matches.

### O.4 Regime maps

For a set of theories on overlapping domains (laminar and turbulent drag; Coulomb and lubricated friction; rigid and plastic hinge; low-Rm and finite-Rm eddy), the regime map is the arrangement of their domains in the space of the governing groups (Re, Ma, Kn, Rm, strain rate, scale). The gluing condition (the only sheaf-like obligation): on an overlap, the two theories' predictions agree within the sum of their contracts; where they do not, the overlap is an anomaly cluster (§R) and the map has a hole, which is recorded as such rather than painted over. A model switch at a regime boundary is a morphism application, so a run that crosses a boundary has a certificate for the crossing (a `topology-change` term, §P.3), not a silent change of solver.

## P. Multitime

A theory lists its **characteristic times** as judgments: light-crossing (ℓ/c), electrical transient (L/R, RC), mechanical period (2π√(m/k), the gyroscopic rate), control-loop latency, thermal diffusion (ℓ²/α), chemical, creep, fatigue, adaptation. They are derived from the theory's constants and the design's geometry (tier 0), not stored as folklore.

From them the kernel derives, per query, the partition the request names: FAST (characteristic time ≪ the query's horizon or the step: resolved implicitly or treated as instantaneous, with the contract of the quasi-static morphism), SLOW (≫ the horizon: frozen, with a contract on the drift), STIFF coupling (two subsystems whose times differ by more than the solver's conditioning allows: a multirate requirement, R-5 is the existing instance for magnets), QUASI-STATIC and ADIABATIC approximations (two APPROXIMATES morphisms whose contracts are the ratio of characteristic times to the horizon). The step itself is derived from the realisation groups ω dt and v dt/ℓ (F-5.6) against the REALISES contract's accuracy; the existing `substepsNeeded` is this law for the fastest mode present, and it generalises to one step per subsystem (multirate) when the stiff partition says so.

Proper time, light-crossing time, signal time, reaction time, period, relaxation time, diffusion time, controller latency are eight different characteristic times of eight different mechanisms, and the architecture keeps them as eight judgments rather than one "time scale". A fast process has a short characteristic time; proper time is the clock of M-1, and nothing here makes it run faster. The extension to relativistic spacetime is a new model assumption replacing M-1, with a LIMITS_TO morphism to M-1 at low speed and weak gravity, which is how a replacement is supposed to arrive (§X); nothing in the kernel or the type system assumes M-1 (dimensions, ports and rules are the same), only the theories do.

### P.3 Hybrid dynamics and mode changes

The state space is stratified (FS-1 has the discrete D): fracture, connection, disconnection, melting, switching, latching, circuit topology changes and controller mode changes are transitions between strata. A transition is a term: its premises are the guard (a judgment that the condition held: a yield criterion crossed, a latch distance reached, a switch commanded) and the transition's own law (what the new stratum's state is, with the conserved quantities carried across: momentum through a fracture, charge through a switch, energy through a weld's heat). A transition without a term is an illegal state write, which is the thing ML-4 forbids and the thing Ego used to do with `setPose`. Differentiability is kept within a stratum (the kernel exposes gradients of closed-form laws and of the row solver's smooth branches for the design proposers) and declared absent across transitions, so that a gradient-based proposer stops at a mode boundary and a sampling proposer takes over.

## Q. Uncertainty and evidence

### Q.1 Kinds, not one scalar

A quantity's type carries one of: an exact value (a definition or a tier-0 result), an **interval** (tier 1), a **distribution** (parametric or sampled, with its support), a **covariance** over a vector of quantities (correlated parameters), a **systematic** component (a bias with its own interval, kept apart from the random part because it does not average down), and a **model** component (the contract bound of the morphism chain used, which is neither random nor a bias but a limit on the claim). Aleatory variation (the thing itself varies between instances) and epistemic uncertainty (Ego does not know) are different types and are not added: an aleatory distribution is a judgment about a population; an epistemic one is a belief about a parameter.

### Q.2 Propagation

Through a derivation, each kind propagates by its own rule: intervals by interval arithmetic (sound, tier 1), distributions by linearisation (an APPROXIMATES morphism with a contract: valid where the function is near-linear over the distribution's width) or by sampling (tier 2, with N), covariances by the Jacobian (same contract), systematic components by the sensitivity (§Q.5), model components by the composite contract (§O.1). Every propagated uncertainty is itself a judgment with a tier, so a claim knows not only its uncertainty but which rule produced it, and whether that rule's own contract held.

### Q.3 Status is separate from belief

A judgment's **status** is {tier, currency, domain-state}: discrete, kernel-computed. Its **belief** (where it has one) is a distribution within a stated model class. A tier-0 theorem has status PROVED and no belief. A tier-3 fitted coefficient has status EMPIRICAL and a posterior. The two never combine into a "confidence". Ego's language renderer takes level words from status (what kind of thing this is) and hedges from belief (how wide it is), which is the vocabulary binding of docs/LAW-TREE.md §L.8.

### Q.4 The comparison rule

`compare(pred: Judgment, obs: Observation): Comparison` yields a term with: the discrepancy (obs − pred, as a quantity with both uncertainties), the standardised discrepancy where distributions allow, the sign (within uncertainty: SUPPORTS; outside: CONTRADICTS; undecidable: INCONCLUSIVE, which is a result too), the prediction's support root and the observation's provenance, both world roots and the theory root. Evidence for a theory is the multiset of its comparisons; nothing summarises it into one number except by a tier-3 model-comparison rule that says which likelihood it used. An observation that no prediction addresses is a leaf waiting; a prediction that no observation addresses is a claim at tier ≤ 2 and is rendered so.

### Q.5 Sensitivity

For a derived y, ∂y/∂xᵢ where the derivation is differentiable (automatic differentiation over tier-0 rules and smooth realisations; adjoints for long chains), interval sweeps where it is not, and a failure-surface distance (how far each input is from a domain exit or a mode boundary, in units of its uncertainty). "Which input matters, how much, where the cliffs are, which uncertainty dominates" are four renderings of these. A sensitivity is a judgment and carries its own domain: a gradient at a point says nothing about the other side of a mode change, and the rendering says so.

### Q.6 Imported knowledge

A paper, a standard, a textbook, a datasheet, an expert statement enter as `observation`-like leaves with a provenance type (`measurement`, `standard`, `datasheet`, `textbook`, `expert`, `fit-from-literature`) and are consumed only by tier-3 rules. A standard is a `convention` where it prescribes and an `observation` where it reports. A datasheet value is a calibration leaf with the maker's stated conditions as its domain. A textbook simplification is a theory with a LIMITS_TO morphism to be found, not an axiom.

### Q.7 Revision burden

The burden of revising a judgment J is computed, not decreed: the size (weighted by tier and by use in cited beliefs) of the set of judgments whose support contains J, plus the number of comparisons that SUPPORT J and would have to be re-explained. A fitted friction coefficient has a burden of a few runs. The conservation law F-1 has a burden of everything. Neither is infinite: the burden of an axiom is the cost of rebuilding every dependent on a replacement theory with a LIMITS_TO morphism that preserves the supported comparisons, which is finite and is what §X does. Ego's wanting a design to work adds nothing to any term's support, because there is no rule that takes a goal as a premise.

## R. Anomalies, contradictions, theories

### R.1 Anomaly

A `comparison` with sign CONTRADICTS and no accepted explanation term is an anomaly. It is persistent: a term is never deleted (§W), only given an explanation whose own status the anomaly then displays. Its levels (docs/FRONTIER.md §3) are a function of the explanations tried and rejected:

- A0: one comparison; probe error, tolerance or rounding not excluded.
- A1: reproduces on the same realisation (a second run, same inputs, same sign).
- A2: reproduces on an independent realisation of the same law (a second REALISES morphism), so it is not a defect of the first.
- A3: the model's own obligations held during the run (its certificates are clean) and it still disagrees with a trusted observation.
- A4: an independent observation replicates.
- A5: numerical error, implementation defect, regime exit, bad data, hidden state writes and wrong assumptions have each been attacked and survived (each attack is a term: a reproduction, a certificate check, a domain check, a provenance check, a write audit, an assumption variation).
- A6: a candidate theory is required; a sandbox branch is opened (§W).

The default hypothesis at every level below A5 is a defect, and the diagnostic mode (§N) runs before anything else. The worked example is this batch's floor leak. Prediction (F-1.3): a walker on a frictionless floor keeps its horizontal centre of mass. Observation (a run instrument): it drifted 0.48 m in 9 s. A0: the probe (centre of mass from live poses and masses) was checked against a second computation. A1: it reproduced. Diagnosis: the per-stage momentum instrument placed the gain in the velocity re-solve; the per-row instrument placed it on the contact normal rows against the floor, with the friction rows at exactly zero; the per-contact instrument showed the normals leaning by up to 0.035 rad on sphere feet and box shanks alike, at separations of a few millimetres, on a flat box, on 24% of the normal impulse. The responsible realisation was the collision detector's tolerance (R-3's contract, P-gjk-tolerance), which did not state this distortion. Explanation term: a REALISES contract exceeded; repair: the exact face normal where the geometry gives one (F-3.2), the contract amended to say what remains (D-contact-normal). The anomaly is retired with that explanation and the test that holds it. At no point was "new physics" the hypothesis, and the ladder is what made that discipline structural rather than a habit.

### R.2 Contradiction

Two accepted judgments from which ⊥ derives (tier 0) is a contradiction term with the two supports as its support. The kernel raises it when it finds one and refuses derivations that would use both until it is resolved; it does not resolve it. Resolution is one of: an observation was wrong (its provenance is annotated), a realisation's contract was exceeded (a defect), the two judgments have disjoint domains that were not stated (domain separation: both are narrowed), a model revision (§X), or a new theory (§W). The resolution kind is recorded on the contradiction, which is how the architecture learns which kinds of contradiction it tends to have (§Y).

### R.3 Competing theories

Theories A, B, C as branches of the knowledge store, each with its axioms, its evidence (comparisons), its domain (where it has been tested), its failures (CONTRADICTS comparisons), its description length (§S) and its open anomalies. No forced choice: a query answered under several theories returns several judgments, each citing its theory root, and the renderer shows the disagreement. Experiments (§T) are chosen to separate them. Promotion of one to the main head is §X.

## S. Theorem discovery and compression

Proposers over the set of proof terms:

- **Anti-unification.** Find the least general generalisation of many derivations' skeletons; a skeleton shared by 40 claims is a candidate lemma, submitted as a proposal; if the kernel proves it (tier 0 from the same axioms), the 40 become corollaries (each a one-step application of the lemma), their proof terms shrink, and the lemma is cached. This is continuous compression, measured by total proof-term size before and after.
- **Motif search.** The repeated structures the request lists (store–transform–dissipate, source–load–sink, sensor–controller–actuator–plant, positive and negative feedback, threshold mode transitions, diffusion, oscillation, transport, resonance, constraint cycles, resource bottlenecks) are subgraph patterns over element types and port connections (A-1 makes them well defined). A motif that recurs across theories is submitted as an abstraction: a type (a specification) with a theorem schema (what any inhabitant satisfies). Abstractions never become laws; they are types with known inhabitants (§C.6).
- **Cross-domain isomorphism.** A candidate IS_EQUIVALENT_UNDER morphism between two theories' fragments (mechanical impedance ↔ electrical impedance ↔ thermal resistance: the same element types with dimensions permuted). It is accepted only if the kernel verifies that the map carries every axiom of one fragment to a theorem of the other; resemblance of equations is the proposal, verification is the morphism.
- **Equation search.** A candidate law is a term whose type is fixed in advance by the kernel: dimensionally homogeneous, invariant under FS-6, consistent with the conservation laws of its theory (ML-1 as a type constraint), causal (no dependence on future readings), with the known limits as boundary conditions. The search minimises prediction error on the comparisons plus a complexity penalty plus the domain violations, over that type. Unconstrained fitting cannot become physics because it cannot type.
- **Latent coordinates.** A candidate change of coordinates is an IS_EQUIVALENT_UNDER morphism proposal; it is interesting when the transformed theory has a smaller description length or exposes a conserved quantity (a new judgment of tier 0 in the new coordinates). The kernel verifies the morphism; the proposer finds it.
- **Dimensionless collapse.** The Π theorem (F-5.1) yields the group space; a proposer searches for groups under which comparison data from different sizes, materials, speeds, gravities and temperatures collapse onto one curve; collapse is a tier-3 judgment of functional dependence, a candidate for a derivation (does the collapse follow from the theory?) or an anomaly (it does not, and the theory should say why).

Compression is a discovery heuristic, not a truth criterion: the architecture records description length (§Y) as one measure alongside explanatory coverage, predictive accuracy, proof complexity and cost, and a proposal that compresses is still only a proposal. The known bias: description length depends on the term language, so a shorter proof in a richer language is not evidence of anything until the richer language's rules are themselves in the kernel.

## T. Experiment design

An experiment is a `do()` on a world (§K) with a sensor set, under one or more theory branches, with a predicted comparison set per branch. Its value is the expected information gain about the quantity in question: for two theories H1 and H2, the expected divergence between their predictive distributions for the sensors' readings, maximised over the intervention and the sensor placement; for a parameter, the expected posterior contraction; for a design space, the expected reduction in the feasible set's volume. All three are tier-3 computations within the stated model class, and the architecture says so: an experiment can only discriminate hypotheses that exist as branches, and the proposer that generates hypotheses (§H) is what makes new branches exist.

The research sets of the request (unresolved anomalies, weakly grounded models, missing constitutive data, unsolved proofs, uncertain scale transitions, high-value experiments, potential unifications, high-impact inventions, candidate theorems) are nine queries over the store (§Y), each ranked by expected information value per cost, and Ego chooses research tasks by that ranking. Questions to a person ("what is the bearing temperature", "is it vacuum", "what uncertainty is acceptable") are the same objective where the cheapest experiment is to ask: a message in §L that a factor cannot fire for lack of a premise is a question, and its value is what the factor would narrow if it could.

## U. Metacognition

### U.1 The four modes are objectives, not personalities

Over one store and one search: INVENTOR maximises inhabitants of a specification type (§J); SKEPTIC searches for a counterexample within an inhabitant's claimed domain (a term of the negation, or a comparison that CONTRADICTS); SCIENTIST maximises expected information (§T); AUDITOR is not a search at all but the kernel's status function applied to a cited belief (tier, currency, domain, provenance, convention dependencies). An invention survives all four when it has an inhabitant term, no counterexample within its domain after a stated search budget, no experiment that would change its status at acceptable cost, and a clean audit.

### U.2 Attention subgraphs

A query's working set is the support closure of the quantities it names, intersected with the theories whose morphism chains cover its accuracy, expanded by causal propagation (§K) from any source attached, and bounded by a budget. "Why is this motor hot" opens the motor's thermal port's factor, its electrical and mechanical ports' factors (copper and friction loss), the controller's command, the conduction and cooling elements and the ambient state; it does not open the material's fracture law unless a message reaches it. The subgraph is a view, inspectable and citeable, which is the difference from attention inside a network.

### U.3 The metacognitive questions are queries

| question | query |
|---|---|
| what assumption dominates this result | the in-context axiom with the largest sensitivity (§Q.5) or the widest contract in the morphism chain |
| which data source is weakest | the observation in the support with the widest uncertainty or the lowest provenance type |
| which law contributes most | the premise whose removal (counterfactual derivation) changes the conclusion most |
| which branch has the largest error | the morphism in the chain with the largest contract bound at the query's domain |
| am I extrapolating | any tier-3 rule in the support applied outside its fit range (the rule records it) |
| am I relying mostly on simulation | the ratio of run certificates to measurements among the observations in the support |
| what evidence would change my conclusion | the experiment of maximum expected status change (§T) |
| have I looked only for confirming evidence | the comparison set's sign distribution against the sensor set's coverage of the prediction's domain |
| which competing model have I ignored | theory branches covering the domain with no comparison in this query's support |

Structural, because each is a function of terms; prompted reflection is replaced by a table of queries that any mode can run on any judgment.

## V. The proof-carrying invention

An invention is a term with these fields, every one a hash into the store:

- functional intent (semantic and functional IR, §J);
- physical IR (the element signature it inhabits);
- components (element terms with their dependent types), geometry (a design term), controller (an element with ports and latency);
- manufacturing plan (realisability judgments under A-5 and the process laws: each a term);
- derivation graph (the proof that the design term inhabits the functional type, with its tier);
- energy and momentum accounting (the run's ledger terms and the F-1 instruments' extremes);
- constraint certificate (the propagated refinements that held, §M);
- material margins (capacity refinements and the loads against them);
- uncertainty (the propagated kinds, §Q.1–2), model envelopes (every morphism's contract and domain in the chain);
- NOT MODELLED (the U- entries of docs/FRONTIER.md intersected with the design's elements, computed, not written by hand);
- simulation evidence (runs), real-world evidence (observations and comparisons, if any);
- sensitivity (§Q.5), failure modes (the mode transitions reachable from the operating domain, §P.3), recommended experiments (§T).

"Works" is a term of the functional type; "impossible" is a term of ⊥ with its unsat core; "no derivation found" is neither and is rendered as the open question it is. The five explanation levels (user, engineer, physicist, mathematician, auditor) are five renderers of this one term: the first renders the functional intent and the status words; the second the margins, loads and assumptions; the third the equations and invariants; the fourth the proof structure; the fifth the provenance, evidence and uncertainty. Overlays (forces, energy flow, temperature, stress, current, fields, probabilities, uncertainty) are renderings of the run's certificates or the propagated refinements; there is no overlay without a term behind it.

Multi-objective design returns a Pareto set over the objectives the request lists (performance, mass, cost, energy, reliability, manufacturability, uncertainty, safety, repairability, simplicity, novelty, environmental constraints), each an objective refinement on the invention term, with no scalarisation unless the person supplies weights as a `convention`.

Worked, briefly: the drawer. Intent: close softly, untouched. Functional type: §J step 2. Physical IR: a passive dissipator across the translational port, no external port. Inhabitants proposed: fluid dashpot (c from viscosity and orifice: tier 0), air dashpot (c from the gas law and leakage: tier 0 with a leakage estimate at tier 3), eddy brake (c from M4 with a conductor and a magnet: tier 0, with M4's domain Rm < 1 as a condition), Coulomb stop (rejected: the force does not vanish with velocity, so the drawer stops short of closed or rebounds: a tier-0 disproof of the functional type's "no rebound ∧ reaches the end"). Propagation: the drawer's depth and the force envelope prune the dashpot's length and the magnet's volume. The eddy brake is the only inhabitant with no wearing part and no seal (a repairability objective), at the cost of a magnet's mass. The certificate carries all of it, the run under the theory, the NOT MODELLED list (U-wear, U-lubrication for the dashpot alternatives), and the experiment that would most reduce the eddy brake's uncertainty (the conductor's conductivity at operating temperature: a datasheet leaf of low provenance).

## W. World versions and counterfactuals

### W.1 Content addressing

Every term's hash is the hash of its kind, its type, its own data and the hashes of the terms it references (a Merkle DAG). Consequences: identity is structure, not name (the English name is a rendering keyed by the hash, and two theories that name the same structure differently have one hash); a judgment is *current* iff every hash in its support is reachable from the current head; a change to an axiom produces a new axiom hash, so every dependent's support now references a non-head hash and is stale by construction (no invalidation job: currency is a lookup); a proof is a value and caching a theorem is keeping its hash; history is the chain of heads, each with a reason term.

### W.2 Two stores, one link

The knowledge store (theories, judgments, morphisms, observations, comparisons) and the world store (states of simulated worlds) are two Merkle DAGs. A `run` references a world root, a theory root and the per-tick certificate root; an observation of a run references the run. A main world has a head; a counterfactual is a branch of the world store under the same theory root with an INTERVENES_ON morphism applied; an experiment is a branch with sensors attached; a theory sandbox is a branch of the knowledge store whose head includes a proposal promoted to an axiom, under which worlds are run and compared with the same worlds under the main theory. Neither branch can write the other's head: a promotion is §X and nothing else.

### W.3 The run as a causal trace

Each tick's transition is a term: premises are the previous state root, the elements that acted (with their parameters' hashes), the realisation morphisms used (with their contracts), the transition laws of any mode changes (§P.3); conclusion is the new state root; annotations are the resource exchanges (the ledger's terms), the constraint residuals, the error introduced (the contracts' bounds at this state), and the obligations checked. A run's certificate root is the Merkle root of its ticks. Causal archaeology (§K) and the diagnostic mode (§N) walk this; the watchdog's findings are comparisons against obligation judgments inside it (which is what the repair of Ego's guard in this batch turned them into); nothing a watchdog finds is a correction, because a correction would be a state write without a transition term.

## X. The self-restructuring protocol

A restructuring (merge laws, split a law, promote an invariant, demote an approximation, replace an ontology, narrow a domain, adopt a limiting relation, adopt a candidate theory) is a transaction:

1. A branch is opened with the proposed head.
2. A **mapping** term from old hashes to new hashes is submitted (which old judgment each new one replaces; which have no counterpart).
3. The kernel re-derives, in the new head, every judgment in the old head's cited-belief set and every comparison's prediction; the result is a diff: PRESERVED (same conclusion, within the old uncertainty), CHANGED (with the old and new conclusions), LOST (no derivation found in the new head, with the budget), NEW.
4. The **preservation proof** is the PRESERVED set; the **changed-consequences list** is CHANGED ∪ LOST; the **affected claims** are the cited beliefs in those sets; the **tests** are the property tests and comparisons re-run on the branch.
5. Review: a person, or Ego under a standing policy that names which classes of restructuring she may accept (today: none that touches tier ≤ 1 judgments or any axiom), accepts or rejects. Acceptance moves the head and records the reason, the anomalies that motivated it, which predictions improved, which domains were preserved, and the mapping, so that history is a history of understanding.
6. The old head remains addressable forever; old beliefs render as "believed under head H₀", never deleted.

A replacement theory must come with a LIMITS_TO morphism to the theory it replaces whose contract covers the old theory's SUPPORTED comparisons; the kernel refuses a promotion that loses a supported comparison without an explanation term for it. That is the structural form of "a new theory should explain why the old one worked", and of "a theory that fits one anomaly and breaks twenty results is weak": the diff says exactly which twenty.

Ego may not restructure silently because there is no operation that changes the head other than this one, and it logs.

## Y. System health metrics

All queries over the store, computed on demand, used diagnostically:

| metric | query |
|---|---|
| orphan claims | cited beliefs whose support is not current |
| unproven edges | proposals cited as if judgments (impossible by construction; the metric exists to prove it stays zero) |
| out-of-domain calls | derivations whose domain-state is `exit` in cited beliefs |
| unversioned beliefs | beliefs stored outside the Merkle DAG (today: `vrsb.habits`, `vrsb.skills`; the stand's memory is stamped) |
| unbounded approximations | REALISES or APPROXIMATES morphisms with no contract bound (A-4 violations) |
| contradictions | derivations of ⊥ with no resolution |
| numerical residuals | the instruments' extremes over recent runs against their obligations |
| registry drift | realisation symbols or tests the registry names that do not exist (the current tree test) |
| dead nodes | terms reachable from no head and no history reason |
| duplicate authorities | two theories deriving the same quantity on the same domain without an IS_EQUIVALENT_UNDER morphism (docs/LAW-TREE.md K-15: the engineering formulas and the world's physics) |
| independent root count | axioms with no LIMITS_TO or IS_EQUIVALENT_UNDER morphism to another theory's |
| average derivation depth, proof reuse | over proof terms |
| redundancy | anti-unification's compressible fraction (§S) |
| unexplained-node count | anomalies by level |
| description length | total term size of the main head; compared across restructurings, never minimised blindly |
| evidence coverage | fraction of cited beliefs' domains covered by comparisons |
| domain fragmentation | theories per quantity per regime, holes in regime maps |
| convention dependence | fraction of judgments whose in-context set contains a `convention` (the alien test) |

## Z. Migration from the current law tree

Nothing valid is thrown away; the tree becomes the generality functor's data and the registry becomes the first head.

- **Step 0 (done in batch 1).** `src/ganglia/tree/schema.ts` and `nodes.ts`: nodes with parents, dependencies, realisations, held obligations, contracts, values; `tests/unit/tree.test.ts` checks rootedness, acyclicity, symbol existence, test existence, contract presence. The physics stamp (`__PHYSICS__`, a content hash over the realisation sources) is the first content address; learned knowledge and reports carry it.
- **Step 1. The kernel.** `src/ganglia/kernel/`: `Judgment` with a private constructor; the tier-0 rules over a small term language (quantities with dimension vectors, intervals, equations, element types); the dimension checker moved in from the ganglia's unit layer; the comparison rule. No search. Tests: the tier-0 property suite. Every node of `nodes.ts` with a `form` becomes an axiom of its theory or a judgment the kernel derives; those without a form stay axioms at their stated tier until a form exists.
- **Step 2. Contracts as morphisms.** `realisedBy` becomes a REALISES morphism term with the node's `contract`; composition of contracts implemented; `substepsNeeded` reads the fastest mode's contract (F-5.6) instead of its constants. The four instruments (joint loads, the ledger, residuals, solver exits) return judgments with support (docs/LAW-TREE.md §L.4).
- **Step 3. Evidence leaves.** Property tests, run instruments and watchdog findings become observations with provenance; the comparison rule produces comparisons; anomalies are comparisons without explanation; docs/FRONTIER.md §3 becomes a query. The stand's memory, if any learning is kept, becomes tier-3 judgments (calibration) with their observations, or is discarded.
- **Step 4. Hashes.** Every term content-addressed; `__PHYSICS__` becomes the Merkle root of the head; currency replaces the version stamp; `WHY` renders support cut at cached judgments.
- **Step 5. Types.** Port types and element types from A-1 as kernel types; the ganglia's archetypes and typed ports (v3) migrate; the foresight statics becomes type checking of capacity refinements; constraint propagation (interval semiring) over the design's factors.
- **Step 6. Proposers.** The designer, the challenge engine, the frontier verdicts and Ego's language layer become proposers with the promotion pipeline (§H); their outputs get status only through the kernel. The Physical IR replaces the designer's object-first search.
- **Step 7. Branches and the protocol.** World branches for counterfactuals and the stand (which already runs a second world); theory sandboxes; the restructuring transaction with the diff.
- **Step 8. Research.** Expected-information ranking over the frontier's queries; experiment proposals; the four objectives.

Each step keeps every existing test green, and each repair of Track A from now on lands at the step the architecture has reached: today a node with a contract and a test; after step 1, a judgment; after step 3, with its comparisons.

---

## The smallest set of primitives

The hundred requests reduce to four primitives and one principle. Each request is one of: a term of a kind in §D, a rule or a tier in §F, a morphism class in §O.1, a semiring in §L, an objective over proposals in §H/§T/§U, a query in §U.3/§Y, a rendering in §V, or a transaction in §X.

1. **Typed judgment.** Propositions are types with dimensions; derivations and designs are terms; a small kernel is the only maker of terms; a term's status is the weakest rule in its support. Gives: the hypergraph, the inference calculus, the tiers, proof reuse, compression, WHY, impossibility certificates, inventions as proofs, constraints as refinements, infeasibility as ⊥ with an unsat core, overlays and explanation levels as renderings, "UNKNOWN ≠ DISPROVED", identity without names.
2. **Contracted theory morphism.** Every relation between two models is a map with a domain and an error bound that composes. Gives: approximation, limit, coarse-graining, realisation (A-4), equivalence (one authority, many formulations), surrogates, intervention (and with it the whole causal layer, because do() is a source element and observe() a sensor), model escalation and reduction caching, regime maps and their gluing condition, multiscale survivors, multitime partitions, the views as functors, the law tree as one functor.
3. **Evidence leaf and the comparison rule.** Observations are sealed terms with provenance that nothing derives; one rule compares a prediction with one; everything empirical (support, contradiction, anomaly, calibration, induction, model comparison, belief, revision burden, experiment value) is computed from comparison sets, and never merged with status.
4. **Content-addressed branchable state.** Identity by structural hash; currency by reachability; worlds, theories, counterfactuals, sandboxes and restructurings as branches; history as the chain of heads with reasons; health as queries. Gives: no silent rewrite, no belief that survives its ancestors, no invalidation job, no prose-only memory.

The principle: **only the kernel makes judgments; every other process is a proposer.** It is what keeps neural confidence, plausibility, desire and consensus out of the support of any term, and it is the one line that the audits found Ego did not have.

Where the request is misguided, said plainly: "no single core has absolute authority" is right about truth and wrong about status; status needs one authority (the kernel) or contradictions live in the store. Message passing cannot unify multiphysics as a solver; it is a sound pruner. Expected information gain cannot see a hypothesis that is not yet a branch. Compression is a heuristic whose measure depends on the language. Causal graphs are not intrinsic to physics; they are a choice of sources, which the port structure already makes explicit. Sheaves, categories and factor graphs each earn one obligation, one theorem and one algorithm, not an architecture.

The test the request ends with: delete every English label and ask whether another intelligence could reconstruct the physics. Under these primitives the labels were never in the hashes; what remains is dimension vectors, element signatures, rules, terms, morphisms with bounds, observations with instruments and uncertainties, and the comparisons between them. The physics is the terms. The names were always a view.
