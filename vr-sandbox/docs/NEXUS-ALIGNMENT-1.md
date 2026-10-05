# Nexus: mid-restart alignment check 1

Against the implementation at this commit: `src/nexus/` is 31 files, 4 677 lines; 473 tests pass; the kernel
(Jolt, WASM) is kept as a realization. Every claim below names the file it is read from. Nothing here is a plan
for the system as imagined; it is the system as written.

## 1. Where the restart sits

```text
represent generators          partly   Field (domain.ts): a term over coordinate variables on a Domain with
                                       scale bands; sample(f, address) → a record; coarse(f, resolution, address)
                                       → a record. The ground, the bending moment, the sag, the swing angle are
                                       fields. Nothing enumerates them.
represent lawful relations    yes      Term (term.ts), Law (law.ts): 144 kept laws plus 21 of the slices, every
                                       one a term with ports, dimensions checked at construction, a source, a domain.
generate valid state spaces   no       A System (solve.ts) is written per slice by hand (beamSystem, bracketSystem,
                                       swingSystem). The space of configurations is not described; one system is.
derive configurations         partly   solve() propagates; search() picks from a declared catalogue (Option[]).
                                       The catalogue is an enumeration, not a generator with an availability constraint.
observe configurations        yes      measurement records with window and instrument; compare() within a contract
                                       whose numbers are the kernel's conformance measurements; the journal.
transform configurations      no       Only recompute() under changed leaves and coarse() over a resolution. No
                                       lawful move through a configuration space exists as a term.
learn missing distinctions    yes      abduce.ts: groups from dimensions alone, candidates, validation on held-out
                                       observations, promotion with provenance, the Language judging constructions.
                                       Three growths so far (rest, joint, hinge).
```

So: the derivation half of the deeper direction (relations, observation, learning) is real; the generative half
(state spaces, transformations, derived construction) is not. The slices are hand-built configurations inside a
lawful language, not configurations derived from the language.

## 2. Did we restart?

```text
object-first architecture            returned, at one level: Prism (coupling.ts) is the only body and it is a box,
                                     because the kernel's words are block and plate (realize.ts). Nothing derives a
                                     shape from a requirement. Above the prism there are no objects: a beam, a
                                     bracket and a swing are couplings and fields, not types.
fixed ontology                       one, declared: the dimension basis kg m s A K (dimension.ts BASE). It is the
                                     measurement ontology of physics, and it is the one fixed thing. Status is a
                                     fixed total order of 13 (status.ts STATUS_ORDER); see §3 for why that is at risk.
hard-coded category hierarchy        none. No category, no class of thing, no taxonomy.
component registry                   none. The catalogue (lumberCatalogue in beam.ts) is a list of Options given by
                                     the person; it is not semantic, but it is an enumeration (see §4).
template-first construction          returned, as procedures: constructSwing (swing.ts), the placement code in
                                     beam.ts and bracket.ts. Every coordinate is a derivation record with a cited
                                     coupling law, so it is traceable; but which bodies, which couplings, which fields
                                     a slice has is the author's choice in TypeScript, not derived.
predefined object constructors       the three slices are exactly that: beamOnTwoSupports, bracketOnPost, barOnHinge.
example-specific laws                none empirical; 21 closed forms in book/slice.ts (PATCH_SAG, CANTILEVER_TIP_SAG,
                                     PRISM_INERTIA, AMPLITUDE_FACTOR, ...) are each the evaluation of a mechanism the
                                     language cannot express (see §7). They are not patches; they are enumerated
                                     instances of an absent generator.
special-case behaviour               one switch: bracketSystem(intent, mat, g, jointConstraint = true). The study turns
                                     the joint constraint off to let joints fail. It is a boolean argument, not a
                                     recorded configuration leaf. Also realizeRigid's fracture 'off' for the swing bar.
post-hoc validation                  no. compare() is observation, not validation; admit() judges a configuration by
                                     the Language before it is realized. Domain checks refuse at evaluation.
renderer-defined identity            no. project.ts is a pure function of bound records; nothing exists only there.
simulation state outside Nexus       yes, by design: the kernel's state is reality for the realization; Nexus holds
                                     only what it measured, under a contract (RigidContract) whose error leaves are
                                     measured by conformance tests. The seam is explicit, not hidden.
TypeScript as semantic authority     yes, for procedures: construction (which couplings), the solver, search, the
                                     comparison tolerance rule (observe.ts), the abduction's bound and simplicity
                                     rule (abduce.ts groups maxExponent = 2; study.ts choose), the status order.
                                     Terms carry the meaning of quantities and laws; code carries the meaning of
                                     reasoning. See §9.
arbitrary constants                  two unrecorded: maxExponent = 2 (abduce.ts) and the simplest-wins rule
                                     (study.ts). Every other number is a leaf with an origin; the realization's
                                     configuration leaves (segments 6, terrain cell 0.1 m, still under 1 mm/s) are
                                     chosen and say so, with the rig they come from.
arbitrary coordinates / geometry     no coordinates: every placement is an evaluate() record citing a coupling law
                                     and the declared frame. Geometry: the box, above.
object-specific branches             none by name. The slices are separate files, which is the same thing at the
                                     file level.
hidden defaults                      found and fixed today: swingIntent and bracketIntent filled in values the
                                     person never gave and labelled them given by the person. They are now
                                     'assumed' by the slice with grounds (term.ts intentLeaf). Remaining: function
                                     defaults in signatures (maxExponent, jointConstraint, periods watched is a
                                     'configuration' leaf and is fine).
magic thresholds                     stillSpeed, stillTurn, patience, clearance: leaves, sourced to the kernel's rig.
                                     The abduction's exponent bound: unrecorded.
parallel representations             the beam's sag exists three ways: closed-form terms (PATCH_SAG), an integrated
                                     elastic line in code (elastic.ts), the kernel's segmented bonds. The second and
                                     third are realizations and are meant to differ from the first within measured
                                     error; but the integrator in elastic.ts is a generator Nexus cannot name in its
                                     own language, so the one truth (the beam equation) has a term form only for the
                                     cases someone wrote out.
metadata claiming structure          found and fixed today: a promoted relation's provenance cited the same hash for
                                     every observation with the same outcome (the measurement's record was the
                                     identity, name and window excluded), so "abduced from nine observations" named
                                     two. An Observation now hashes its system, coupling, quantities and both records;
                                     a measured leaf's window is in its identity; the topple study no longer looks a
                                     slice up by that colliding hash (it had been pairing every toppled slice with
                                     the first one).
```

Verdict: the restart is real at the level of quantities, laws, observation, provenance and learning. It is not yet
real at the level of generation and construction, and the box, the slices and the catalogue are where the old
direction lives on.

## 3. The kernel

The smallest set that everything else is built from, as written:

```text
Dim        term.ts/dimension.ts: a vector of five exponents.
Leaf       a value with an origin (class + what the class needs: source, grounds, by, window), unit, uncertainty.
Var        a symbol with a dimension.
App        an operator (one of 24) applied to terms.
Status     a label from an ordered set of 13; weakest() of the inputs.
hash       FNV-1a over the canonical content (names excluded; variables numbered by first appearance).
```

Everything else is a record over these: Derivation (a term, its inputs, a value or null, the weakest status, the
cites, uncertainty propagated), Law (a term with ports, source, domain), Field (a term with coordinate variables
over a Domain), Coupling (derivation records of positions citing a coupling law), Observation (a measurement
record with a window), Relation (a group term with a measured bound).

```text
DIM
  what         the exponent vector of a quantity over kg m s A K.
  why          so that a term that adds metres to seconds cannot be constructed, and so that abduction can find the
               dimensionless groups of a coupling's quantities from their types alone.
  fundamental  by convention. It is the one ontology, and it is physics' own. mol and cd are absent; nothing has
               needed them. It cannot be derived from anything in the system.
  derives      every dimension check, every group of the abduction, the unit of every record.
  generates    the space of dimensionless groups of any set of quantities (abduce.ts groups).
  depends      everything.
  challenge    it is fixed, and that is right; but the basis is a choice (one could take force instead of mass).
               Harmless: the group space is basis-free (exponent vectors, not basis vectors).

LEAF (origin)
  what         a number that was fixed by something outside the term: a standard, a measurement, a person, an assumption.
  why          the end of every WHY chain must be an origin, never code.
  fundamental  yes: provenance is not derivable.
  derives      the status of everything above it; the closure of every record.
  generates    nothing; it is where generation stops.
  challenge    the origin classes (9) are a vocabulary. They are not categories of things, they are kinds of warrant.
               A tenth would be a new kind of warrant, which is rare. Keep.

TERM (Var, App)
  what         an expression over leaves and variables under 24 operators (arithmetic, comparison, logic, exp/log, trig).
  why          laws, couplings, fields, failures and relations are all terms, so all are hashed, dimension-checked,
               traversed and evaluated by one machine.
  fundamental  yes, but incomplete. The operators are closed under evaluation at a point. There is no binder: nothing
               in the language can say "over x from a to b" or "for every n" or "the least y such that". So no
               integral, no sum over an index, no extremum over a domain, no limit, no recurrence. Every law that is
               the result of integrating something was written out by hand (§7), and every integration Nexus does
               (coarse() in domain.ts, the elastic line in elastic.ts) is code.
  derives      Law, Field, Relation, Failure, the ledger.
  generates    values at points. Not spaces.
  challenge    this is the missing primitive. One new term kind (a bound variable over a domain with a rule) makes
               the fields' generators, the slice laws, the coarse-graining operator and the elastic integrator
               expressible in the language. See §17 D.

STATUS
  what         the weakest warrant among a record's inputs, as one label.
  why          so a derivation can never claim more than its weakest input, and so that unresolved, unobserved,
               contradicted and outside-validity are values, not exceptions.
  fundamental  no. It is a projection of the closure (why.ts has the closure). The total order is a choice, and some
               pairs it orders are not comparable in reality (a measured value with 5 % uncertainty against a given
               exact one). The label is useful as a summary and dangerous as a truth: it should be read as "the
               closure contains at least this", never more.
  derives      mayBind (what may bind a runtime variable), carriesValue, the refusals.
  challenge    keep as a derived summary; the primitive is the closure's set of origin classes, which already exists.

HASH
  what         identity by content.
  why          regeneration, staleness, provenance and the Language's own identity all rest on it.
  fundamental  the function is derived; the canonical form (what counts as the same) is a primitive decision.
               Today: names excluded, variables numbered by first appearance, a measured leaf's window included
               (since today), an observation's system and quantities included (since today).
  challenge    every "metadata claiming" defect found so far was a canonical-form omission. Each one widened the
               content. The decision is right; the audit of what is in the content must be a test, and today it is
               only a test for the two cases that failed.
```

Not primitive, and demoted:

- **Law** is a term with ports and a source. Its added content is the domain and the source. It should stay a
  record kind, not a primitive.
- **Field** is a term with coordinate variables and a Domain. It is the system's one generator, and it is the right
  shape for one. It is derived from Term + Domain, so the primitive underneath is the Domain (extent + scale
  bands), which is itself terms.
- **Coupling** is a set of placement derivations plus a ledger. The primitive underneath is a shared boundary: a
  constraint equating quantities on two sides (bracket.ts does this for the root moment and shear; the ledger does
  it for energy, after the fact). See §14.
- **Observation** is a leaf of class measured with a window. The primitive underneath is the window (an instrument
  with a resolution), and the observer is the coarse-graining operator applied with it (§12, §13).
- **Prism** is not primitive and should not survive as the only geometry. See §10.

## 4. Generative manifolds

Mapping the proposed structure onto what exists:

```text
domain          Domain (domain.ts): extent per axis (absent = unbounded), scale bands as terms over the observer's
                support and lattice, a frame. Real.
generator       Field.term over Field.coords. Real for scalar fields over x, y, z, t.
state           sample(f, address): a Derivation whose inputs are the address. Real. Unbounded domains work: the
                ground field has no extent on x and z and nothing enumerates it.
relations       laws as terms. Real.
constraints     System constraints with a role (design, validity) and a source. Real, but per slice.
invariants      scale bands and law domains: refused, not violated. Real.
transformations missing. coarse() is one (field × resolution → record). recompute() is one (leaves → records). No
                term moves a configuration.
observation     measurement, compare, coverage, resolves. Real.
provenance      hash, closure, journal, the Language's provenance strings. Real.
```

The minimum representation is smaller than the proposed list: a **domain**, a **term over its coordinates**, and
an **observer** (a resolution). State, relation, constraint and invariant are all terms; observation is the
observer applied; provenance is the hash of all of it. What is missing from the minimum is the binder (§3), without
which a generator can describe a space but cannot integrate, sum or extremize over it, and the **coordinates are a
fixed enum** (`Axis = 'x' | 'y' | 'z' | 't'`, domain.ts). A design variable, a material fraction or an index n
cannot be a coordinate today. That enum is an old assumption: the manifold's axes should be declared by the
domain, with x, y, z, t the declaration the physical slices make.

## 5. π as the test

Could Nexus represent an unbounded mathematical object by a finite description? Not today: there is no index
coordinate and no sum. With a binder and declared coordinates, π's partial sums are a field over n:
`S(n) = 4 Σ_{k=0}^{n} (−1)^k / (2k+1)`, the domain unbounded on n, `sample(S, {n: 1000})` a record whose
inputs are the address and whose closure is the rule. Nothing would be enumerated; the generator is three lines of
term. Memory would hold the generator, the addresses visited and their records (§15).

The same architecture then covers the listed spaces exactly where the space is coordinatized and its generator is
a term: mathematical (an index), geometric (x, y, z), physical configuration (design variables as coordinates with
the laws as the generator), material (composition fractions as coordinates; the mixing laws), mechanical (the
swing's angle over t is already one), design (the catalogue's b and h as coordinates with availability as a
constraint instead of a list). It does not cover spaces whose states are not numbers: biological and computational
spaces need terms over structured values (sequences, graphs). That is a second missing abstraction, and it is
honest to say the current term language is numeric and will stay numeric for a while.

## 6. Objects are derived

Tested on the three slices, without the words:

- the beam is a prism with two rest couplings and a bending-moment field over x whose scale band is quasi-static;
- the bracket is a prism with a joint coupling (shared boundary variables: root moment and shear) bounded by a bolt
  group's capacity;
- the swing is a prism with a hinge coupling and an angle field over t whose scale band is the sampling law.

None of them is a type; each is a region of a configuration space where particular relations hold, and the
Language judges them by relations found from observations, not by name. What is hard-coded is the construction
procedure of each (§10), not its identity.

A motor, by the same test: a hinge coupling plus a torque field over t that is the output of a conversion
relation whose input is a flow (power) from a supply with its own ledger. What makes it recognizable without the
word is that its relations close: the torque is derived from a flow, the flow from a source, the ledger balances
within a dissipation the contract allows. What is missing for that today is a flow across a coupling as a
construction constraint (§14). Nothing about "motor" needs a motor abstraction; it needs flows.

## 7. Laws should generate law families

The 21 laws of book/slice.ts, each with the mechanism that produced it:

```text
PRISM_MASS, PRISM_INERTIA, RECT_AREA, RECT_I, RECT_MODULUS      moments of a shape: ∫ρ dV, ∫ρ r² dV, ∫ y² dA
LINE_WEIGHT, EXTENT_FROM_MASS                                   the same, inverted or per length
TWO_SUPPORTS                                                    equilibrium: moments about a support
PATCH_MOMENT, SELF_MOMENT, CANTILEVER_MOMENT, CANTILEVER_SHEAR  equilibrium integrated along x from a load field
PATCH_SAG, SELF_SAG, CANTILEVER_TIP_SAG                         curvature = M/EI integrated twice under boundary conditions
FIRST_PERIOD                                                    the first mode of the same equation
PHYSICAL_PENDULUM                                               energy conservation linearized
AMPLITUDE_FACTOR                                                the elliptic integral of energy conservation, truncated
STRESS_AREA, GROUP_TENSION, GROUP_BENDING                       a sum over a set of bolts
```

One mechanism generated all of them: integrate a field over a domain under equilibrium and boundary constraints.
Can the mechanism generate neighbours not written? No, because the mechanism is not in the language. A beam on
three supports, a tapered arm, a 60° release, a bolt pattern that is not a rectangle each need a new hand-written
term. The elastic realization (elastic.ts) does integrate the beam equation numerically, for two boundary cases,
in code. So the generator exists in the repository and is invisible to the language. Classification: none of the
21 is a patch or an empirical fit; all are closed-form evaluations of one absent generator. The fix is not more
laws; it is the binder, after which these laws become derived records with a measured truncation or
discretization error, and the law family is the generator.

## 8. Traceability

The chain as it exists, for the swing's energy comparison (one effect):

```text
EFFECT         comparison 'swing energy at the end of the watch': anomaly or within (observe.ts compare)
OPERATION      measurement record: instrument, window (seconds at tick), uncertainty (realize-hinge.ts)
               derivation record: term, inputs, law, cites (evaluate.ts)
DERIVATION     closure (why.ts): every record under it, the laws cited, the constants in the terms
CONSTRAINT     the contract's allowance leaf (hingeDissipation, measured by tests/conformance/laws.test.ts)
LAW            the book entries cited by hash, with their source kinds
PROVENANCE     every leaf's origin; the relation's "abduced from observations h1…h9", now nine identities
```

Where it breaks, concretely:

- the kernel's step: opaque by design, bounded by the contract's measured errors; the break is named, not hidden;
- `groups(maxExponent = 2)`: the abduction searches exponents in [−2, 2]; a group with a cube would be missed and
  nothing would say so;
- `choose()` simplest-wins: a rule with no record; the chosen candidate's record does not say it was chosen for
  being simplest;
- `compare()`'s tolerance rule (relative × |derived| + absolute + both uncertainties): the allowance is a leaf,
  the rule is code; the verdict record names the allowance, not the rule;
- `coarse()` cites its method in the record's law string (Simpson over the support cell), so that one holds.

Unknowns are values (status 'unknown', 'unresolved', 'unobserved'); refusals name their domain. No default or
fallback was found that converts an unknown into a number silently, after today's intent fix. The remaining
untraceable effects are the reasoning rules above, all in TypeScript.

## 9. Two realities

They exist: terms (Nexus) and procedures (TypeScript). The procedures are: construction (which bodies, couplings
and fields), the solver, the catalogue search, the comparison rule, the abduction's bound and choice, the
coarse-graining and the elastic integrator. Where a procedure's result is a record citing its inputs and method
(evaluate, measurement, sample, coarse), the two cannot disagree in a way that hides. Where a procedure has an
unrecorded parameter (maxExponent, simplest-wins, the tolerance rule), they can.

The smallest architecture that makes the principle real is not a compiler. It is two rules and one primitive:

1. every parameter of a reasoning procedure is a leaf (configuration, with a source), and every result of one is a
   record citing those leaves and the method;
2. every generator that lives in code and produces semantic values (the elastic integrator, Simpson) becomes a term
   under the binder, evaluated by the one evaluator;
3. the binder itself.

After that, TypeScript and WASM remain realization mechanisms: of reasoning (solver, search, abduction) and of
physics (the kernel, the elastic line), each under a contract.

## 10. Construction must emerge

Today's order: intent leaves → a System written by hand per slice → solve → search over a given catalogue →
coupling placements (derived) → realization under contract → observation → the Language's judgement. The
first arrow after the intent is the author's. Nothing goes from "carry 60 kg across 1.2 m" to "two supports and a
member in bending"; the slice says so.

The proposed sequence (intent → behaviour → function → … → geometry → placement → realization) is a sequence of
descriptions, and the generative mechanism under it is one thing: a requirement is a constraint on a flow (a force
from where it is applied to the ground; energy from a source to a sink), and a construction is a path of couplings
through which the flow is lawful. Given flows as relations (§14) and a configuration space whose coordinates are
declared (§4), construction is a search for a configuration satisfying the flow constraints under preferences,
which is what search() already does over a list. The box is then a consequence (the search's shape coordinates
with the kernel's words as a realizability constraint), not a premise. None of this is built, and the slices should
be read as fixtures that the derived construction must reproduce.

## 11. Environment is generated

Already fields and leaves: the ground is a field over x and z (field.ts groundField; the slope and the hole are
terms), gravity is a sourced leaf, the frame is declared, the observer has a tick, a quiet time and a patience, the
kernel realizes the ground field by sampling it (terrainCell, a configuration leaf). Space, time, state, fields,
boundaries and observers are the same machinery as the constructed thing. Matter and energy are not: matter is
only prisms with a material's leaves, energy is a ledger observed after the fact. Flows (§14) would make energy
a relation of the environment and the construction alike. Information and scale are below.

## 12. Scale

What `s` is in the code, without hard-coding it as physics:

- a property of a law: a ScaleBand on a Field's Domain, a term over the observer's support `d<axis>` and lattice
  `l<axis>` (quasi-static for the moment field; Shannon for the angle field);
- a property of the observer: a Resolution with support, lattice and stationary axes;
- an operator: coarse(f, r) is the only scale transformation, and it is one way (it averages; nothing refines).

So today `s` is an observer relation and an operator, not a coordinate. The claims already tested: a lattice
coarser than the band is refused with the band named; a point lattice covers nothing; the coarse record is
uncertain by the half-range over the cell; the kernel's samples carry the tick as their support and the period
read from them carries the tick as its resolution.

Two experiments make the next step testable rather than asserted:

1. coarse-graining composes: coarse(coarse(f, a), b) equals coarse(f, a ⊕ b) within the measured error, for a field
   with structure below b; if it does not, `s` is not a semigroup action and the operator model is wrong;
2. a field that depends on the observation scale explicitly (a size-effect strength, a measured length of a rough
   edge) is a field with `s` as a coordinate; coarse() of it must agree with sampling it at `s`. If that holds,
   `s` is a coordinate for fields that vary with it and an operator for fields that do not, which is the
   combination, and the Domain's axes being declared rather than an enum is what allows it.

The binder is what makes coarse() a term, so that experiment 1 is a theorem about terms rather than about code.

## 13. Observer, reality, memory

Kept distinct in the records:

```text
REALITY         the kernel's state; not in Nexus
INTERACTION     realize*(): placing bodies from derived coordinates, stepping
OBSERVATION     measurement records: instrument, window, uncertainty
ENCODING        leaves and records with content hashes
MEMORY          the Journal (append-only); the Language (append-only)
RECALL          why(), closure(), explain()
RECONSTRUCTION  recompute() under changed leaves; stale() under a grown Language
PREDICTION      evaluate() records, status derived
BELIEF          status assumed, hypothesized (a hypothesis may not bind: mayBind)
```

Observers as transformations over state: yes, in one form. A Resolution applied by coarse() is a transformation
from a field to what an observer with that resolution would record. The kernel's observer (tick, quiet, patience)
is the same thing for the realization. What is not represented is an observer's position or motion; nothing has
needed it.

## 14. The old dog, as a test

Could the restarted architecture represent an actuator without an impossible one existing silently? Not yet. The
hinge's friction torque is a leaf handed to the realization (realize-hinge.ts params friction); a motor torque
would be the same kind of leaf, and nothing would ask where its energy comes from. The swing's ledger would show
the energy appearing, after the watch, as an anomaly, which is detection, not impossibility.

The missing foundational relation is a **flow**: a conserved quantity crossing a coupling's boundary, with in,
out, stored and lost each a derivation, and conservation a constraint of the construction (role: validity) rather
than a comparison of the realization. A coupling that does work on a body (a torque, a force over a distance)
must then cite the flow it draws on, and the flow must reach a source whose leaf has an origin (a battery's
capacity, a hand's effort, a reservoir). A construction with a torque and no flow is unresolved and cannot bind
(mayBind), so it cannot be realized. The actuator becomes a region: a coupling with a flow, a conversion relation
with an efficiency, and a control relation on the flow's rate. Not "servo validation"; conservation at the
boundary, for every coupling, from the start.

## 15. Procedural memory

```text
GENERATABLE   a field at an address not yet sampled: the generator exists, the record does not. Real (fields are
              unbounded on absent axes). Not named as a status, and should not be: it is the absence of a record.
OBSERVED      status measured, with window.
DERIVED       status derived, with inputs.
PROVEN        a derivation whose closure is only fundamental leaves (weakest() yields 'fundamental'): exact. Real.
CACHED        a journal record whose inputs' hashes still match (stale() false). Real.
MEMORIZED     a journal record. Real.
UNKNOWN       status unknown; an unknown leaf has no value by construction.
```

The principle (store the generator, the address, the record, the derivation, the observation, the provenance;
never every state) is already how fields and the journal work, and it belongs in the core. The binder completes it:
a generator with a sum over an unbounded index is the finite description of an infinite object.

## 16. What is impossible

Already impossible, by construction (throws, types, or frozen records):

- a leaf without what its origin class needs (a measured value without a source; an assumption without grounds
  and who assumed it);
- an unknown with a value; a known with a non-finite one;
- a law whose term's dimension disagrees with its port, or with a variable not among its inputs;
- a derivation claiming a stronger status than its weakest input (the status is computed, the record frozen, the
  brand non-enumerable so a copy is not a record);
- a runtime variable bound by a hypothesis;
- a relation promoted from one system, or without separating, or failing held-out observations;
- a judgement decided inside the bound's uncertainty (it is unresolved);
- a placed body whose coordinate is a plain number (every coordinate is a record citing a frame and a coupling law);
- a scene element with no record (project.ts).

Possible today, and should be impossible:

- a coupling that does work with no flow to a source (§14);
- a reasoning procedure with an unrecorded parameter (maxExponent, simplest-wins);
- a construction whose System is not derived from the intent (the slices);
- a body of any shape but a box (nothing else can be constructed, which is impossibility of the wrong thing);
- an observation whose identity omits part of its content (the two found today suggest a test over the canonical
  form, which does not exist);
- a law written as a closed form when the generator could have produced it, with no record of the truncation (§7).

## 17. Current state

### A. SOLID

- Term, Leaf with origin, Dim, hash: every quantity and law is one machine's object, dimension-checked at
  construction, hashed by content, traversable by WHY.
- Status as values: unknown, unresolved, unobserved, contradicted, outside-validity are records, and refusals name
  their domain.
- Fields over a Domain with scale bands, sample and coarse under a Resolution: the one generator, and the right
  shape for one.
- Realization under a measured contract: the kernel's errors are leaves measured by its own conformance tests, and
  the comparison is within them.
- Abduction from dimensions alone, with held-out validation, provenance and a Language whose hash makes judgements
  stale: three growths, each a real distinction the derivation lacked (rest, shear, Coulomb's loss).
- The journal and the Language as append-only memory with recompute and staleness by hash.

### B. AT RISK

- The slices: three hand-written constructions and three hand-written Systems. They are the old "constructor"
  under a lawful surface, and the longer they are the only way to build, the more they become the architecture.
- The box: Prism as the only geometry, because the kernel realizes boxes.
- The catalogue: search over a given list, where the sections are a two-coordinate space with an availability
  constraint.
- Status as a total order: a convenient summary that will be read as a truth.
- The coordinate enum x, y, z, t.
- Unrecorded reasoning parameters: the exponent bound, simplest-wins, the tolerance rule.

### C. MISSING

- The binder: a term that binds a coordinate over a domain (integral, sum, extremum). Without it the language has
  no generator for laws, no term for coarse-graining, no finite description of an unbounded object, and the
  elastic integrator stays code.
- Flows: conservation across a coupling as a construction constraint, with sources. Without it an actuator can
  exist without a supply and energy is a post-hoc ledger.
- Declared coordinates: a Domain whose axes are declared (design variables, an index, scale) rather than the enum.
- Derived construction: from flow constraints to a configuration, with the slices as fixtures to reproduce.
- A test over the canonical form: which content is identity, asserted, not discovered one collision at a time.

### D. NEXT

The smallest step that tests the architecture rather than expanding it: **the binder**, one new term kind that
binds a coordinate over an interval under a rule, evaluated by the existing Simpson machinery with its error
measured by refinement, its dimension the integrand's times the coordinate's, its bound variable not free, its
closure including the domain. The test is a law the system already has and a study that already runs: the
physical pendulum's period factor is `(2/π) ∫₀^{π/2} dφ / √(1 − sin²(θ₀/2) sin²φ)`; AMPLITUDE_FACTOR's
series becomes a derived record with a measured truncation error, its 45° domain a consequence instead of an
assumption, and the swing study must run unchanged. Then the prism's mass, inertia and section moments as
integrals of the shape, one mechanism for five laws. If WHY traverses the bound domain and the swing study's
relation is unchanged by hash, the generative half of the direction has its first primitive. If the binder
cannot express the elliptic integral without a special case, the term language is the wrong substrate and that
is better known now.

Not next: a motor, a dog, a renderer, a catalogue generator, scale as a coordinate. Each waits on the binder or on
flows.

## The final test

Why should Nexus ever need to enumerate what it can create? Because today its only generator is the Field, and a
Field can describe a space but cannot integrate over it, sum over it or search it; so every law that is an integral
was enumerated by hand, every configuration was constructed by hand, and every option was listed by hand. The
enumeration is not a design choice; it is the shadow of the missing binder.

The smallest substrate that makes enumeration unnecessary wherever the system is describable: a term language with
leaves (origin), variables, operators, and **one binder** over **declared coordinates** on a **domain** with
**scale bands**; an **observer** as the coarse-graining of a term by a resolution; a **flow** as conservation across
a boundary; **hash** as identity over all of it. With that, a law family is a generator, a configuration space is
a domain, a construction is a point in it found under constraints, an object is a region where relations hold,
and memory is the generator plus the addresses visited. Everything in §17 A is already that substrate minus the
binder, the flows and the declared coordinates. The restart continues by adding the first of the three and
testing it on what already exists.
