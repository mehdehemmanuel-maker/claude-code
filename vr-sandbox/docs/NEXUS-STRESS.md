# Stress test of the Nexus compression

2026-10-02, batch 2. docs/NEXUS.md proposed four primitives and one principle. This document attacks that compression
with the questions asked of it, and with what batch 2 found while repairing the physics under it. Where a primitive
breaks, it is split here; where two of the requested distinctions turn out to be one, they are merged; where the
original was wrong, it says so. docs/NEXUS.md stays as written and is corrected by this document, not rewritten,
so that the change of understanding is itself on record (NEXUS §X.6).

Evidence from batch 2 used below (all measured, docs/FRONTIER.md):

- The slider's 2.3 mm residual was never the common-point impulse law. A joint was dropped from the mechanism for one
  tick as "misaligned" because its seated check measured the gap along its own free axis. Found by probing the gap
  before and after closure tick by tick: zero after closure every tick but one.
- A servo's rotor realised as a soft row toward the joint's last rate sagged a static load 50% past the servo's
  stiffness and drifted a walker's centre of mass on a frictionless floor. The same rotor realised as a reflected
  inertia on the horn's body did neither, but made a knees-still walker paddle 3 m on the gyroscopic torque its false
  tensor produced, and overstates a walker's pitch inertia by the sum of its rotors.
- The floor's contact normal was a realisation defect in the detector's tolerance, repaired first for environment
  boxes, then as a rule over surfaces: a flat face the detector roughly agrees with sets the normal.
- A walking dog's energy books show a gain equal to its friction heat, 3.5 mJ a tick: the potential energy that
  position corrections move is booked nowhere.

## A. Whether each primitive survives unchanged

| primitive | verdict | what changed |
|---|---|---|
| typed judgment, kernel-made | survives, with its boundary drawn (§E) and its authority restated (§J) | "a term exists" was never "nature behaves so", but NEXUS.md let the reader think the kernel decides more than it does |
| contracted theory morphism | survives as one abstract interface over typed relation classes with different laws (§F); the composition of contracts is now specified (§G) | NEXUS.md attached contracts; it did not compose them |
| evidence leaf and comparison rule | survives, with a taxonomy of acquisition (§H) and the comparison rule given its inputs (§H.3) | one sealed object, many provenance types, was right; the comparison rule was underspecified |
| content-addressed branchable state | survives as *lineage*; it is not identity of meaning (§I) | NEXUS.md wrote "identity is structure", which conflated syntactic identity with semantic equivalence |
| the closure principle | restated: everything proposes; only the kernel certifies machine status (§J) | the old wording, "only the kernel makes judgments", read as the kernel deciding truth |

## B. Splits

1. **The morphism primitive splits into an interface and six relation classes with their own laws** (§F). Not six primitives: one typed interface `Morphism<R>` where R fixes what is preserved, what may be lost, and how contracts compose.
2. **Evidence splits into acquisition type and comparison semantics** (§H). The leaf stays one object; its type decides which comparison rule may consume it and with what corrections.
3. **The kernel's authority splits into certifiable statuses and everything else** (§J). The kernel certifies eight formal properties; it certifies nothing about nature.
4. **Hash identity splits from equivalence** (§I). Lineage is hashed; equivalence is a certificate (a morphism of class EQUIVALENT with a proof).

## C. Merges

1. "Impossible", "no term found", "search incomplete" were already three outcomes in NEXUS.md §F; they stay three (§Q). Nothing to merge.
2. Measurement, calibration record, sensor reading, experimental record are one acquisition class (`measured`) with sub-fields; datasheet, textbook, standard, human report are one (`reported`); simulation observation is its own (`simulated`); statistical aggregate is a derived leaf (`aggregated`) that cites the leaves it aggregates (§H).
3. Unverified learned message passing and contracted message passing are not two mechanisms: message passing is one algorithm, and its *contract* decides its tier (§K). The distinction the request asks for is the tier of the rule, which NEXUS.md already had; the merge is to stop calling one of them "neural".

## D. A missing primitive

One, found by the multiscale and theory-change tests (§M, §N) and by the cognition question that arrived with them: **a state with a transition law**, as a first-class term, distinct from a judgment. NEXUS.md had `world` and `run` as kinds of term but treated a state's evolution as something the realisation did. The stress tests need it explicitly: a hybrid system's mode change (§P of NEXUS.md, a transition term), a counterfactual (a branch of states), an agent's memory (a state with write and read rules), a learning rule (a state update). All four are `(state type, transition rule, certificate per transition)`. This is the primitive the cognition document (docs/NEXUS-MINDS.md) builds on, and it was already implicit in `run`. Making it explicit costs nothing and removes the special-casing of worlds. The count is five primitives; four was wrong by one, and the user's instruction not to protect the number is taken.

## E. The exact boundary between formal judgment and empirical support

Two relations, never one:

- **Γ ⊢ C** (derivation): there is a kernel term of type C in context Γ. It says: *if the axioms of Γ hold, C holds*. It says nothing about whether Γ's axioms hold. Its tier (FORMAL, CERTIFIED-BOUND, PROPERTY-TESTED) measures the rigor of the *if*.
- **E ⊨_{δ,D} C** (support): the evidence set E, within uncertainty δ and domain D, supports C, meaning: C's predictions, compared with the observations in E by the comparison rule, give no CONTRADICTS and at least one SUPPORTS inside D at δ. It says: *nature, as observed, did not disagree*. It never says C holds.

A claim carries both, and the two never merge into one number or one status. The status vocabulary (§J) keeps them in separate words: "formally proved" is about ⊢; "empirically supported" is about ⊨. A claim can be ⊢ and not ⊨ (§O), ⊨ and barely ⊢ (§P), both, or neither.

How each kind of knowledge fits without converting evidence into proof:

| kind | ⊢ side | ⊨ side |
|---|---|---|
| physical law (F-1) | an axiom of its theory, or a theorem from deeper axioms (F-1 from ML-1 and FS-6) | the comparison set of its predictions across every run and measurement that tests it; its revision burden is this set plus its dependents |
| constitutive model (C-1 materials) | a theorem *schema*: "if ρ, E, σ_y are these, then the beam's deflection is this" | the fit of its parameters to measurements (a tier-3 calibration term) and the comparisons of its predictions; its domain is where the comparisons were made |
| measurement | none: a leaf is not derived | it *is* evidence; its own uncertainty and provenance are its only properties |
| calibration | a tier-3 term whose premises are measurements and whose conclusion is a parameter with uncertainty | the measurements it used; it supports nothing else by itself |
| statistical claim ("friction varies 8% across samples") | a tier-3 term (an aleatory distribution over a population) | the population's measurements; it is a judgment about a population, not about a part |
| uncertain theory (T₂ in §N) | a context of axioms, fully formal, with its theorems | a comparison set that may be empty, mixed or contradicted; its status comes from here and only here |

The rule that keeps the boundary: **no kernel rule has an observation as a premise and a tier better than 3 as its conclusion.** A derivation that touches evidence is EMPIRICAL at best, and a proof that touches no evidence supports nothing.

## F. Exact semantics of contracted morphisms

The right answer is the one the request suggested: `Morphism<R>` with relation-specific laws. One interface, because every class is a map between theories with a domain and a contract, and the kernel composes and checks them with one procedure. Six classes, because they preserve different things and compose differently:

| class R | map | preserves | may lose | contract | composes as |
|---|---|---|---|---|---|
| EQUIVALENT | an isomorphism of state spaces and a translation of axioms to theorems both ways | all physical content; every judgment carries across at tier 0 | nothing | trivial (ε = 0), but the *proof of equivalence* is the certificate (§I) | EQUIVALENT ∘ EQUIVALENT = EQUIVALENT |
| COARSE_GRAINS_TO | a surjection of states (survivors) and a map of parameters | the survivors' dynamics within the contract | the kernel of the state map, irreversibly; information, not energy | ε as a function of the lost variables' magnitude; a domain where the lost variables stay small | loses more; ε adds; survivors compose |
| APPROXIMATES | identity on states, a change of law | the quantity named, within ε | accuracy, boundedly | ε(domain), sign, step dependence (the ten fields) | ε adds or amplifies (§G) |
| REALISES | continuous law → discrete method | the invariants named exactly; the rest within ε | accuracy per step, order of the method | A-4's contract: exact invariants, bounded rest | one realisation per law; chains are APPROXIMATES ∘ REALISES |
| SURROGATE | a learned map standing in for a model | nothing by construction | everything outside its training domain | validation error distribution, an out-of-domain detector, source model root, version | never composes with another SURROGATE (the detector cannot be trusted twice removed) |
| INTERVENES_ON | adds a source element to a port, removes nothing | the laws; the structure except the replaced mechanism | the replaced mechanism's influence (that is the point) | exact | INTERVENES_ON ∘ INTERVENES_ON = a joint intervention; commutes with everything that does not touch the ports |

What is genuinely common: a domain, a map of states, a map of parameters, a contract, a tier, a hash, and a kernel procedure that checks the composite's domain and contract. What must stay typed differently: whether information is lost (COARSE_GRAINS_TO, SURROGATE: yes; EQUIVALENT, INTERVENES_ON: no; APPROXIMATES, REALISES: accuracy only), whether the map is invertible (only EQUIVALENT), whether the class may appear twice in a chain (not SURROGATE), and whether it changes the physical system (only INTERVENES_ON, which is the one class that is not a statement about models at all but an operation on a world; it stayed in the table because it has the interface, and it is marked as the odd one).

LIMITS_TO is not a seventh class: it is an APPROXIMATES whose domain is written as a limit (κ → 0) with ε(κ), from the finer theory to the coarser. It keeps its name as a label on the domain, because the preservation obligation on a theory change (§N) refers to it.

## G. How contracts compose

Given A →f→ B with contract (D_f, ε_f) and B →g→ C with contract (D_g, ε_g), what the kernel certifies about g ∘ f:

1. **Domain**: D = D_f ∩ f⁻¹(D_g). The composite holds only where f's output lands inside g's domain. The kernel computes f⁻¹(D_g) by interval propagation of D_g back through f, which is sound and may shrink D further than necessary. Domain shrinkage is the first and most common way a chain loses trust, and it is why a chain of locally valid approximations can be globally invalid: each domain is narrowed by the next map, and a chain's domain can be empty when every link's is wide.
2. **Additive bound**: for absolute errors on the same quantity, ε ≤ ε_g + L_g · ε_f, where L_g is a Lipschitz constant of g on D. The L_g factor is the amplification: an error in B is magnified by how steeply g responds. Without a Lipschitz bound on g, the kernel certifies nothing about the composite's error, and says so (status UNRESOLVED, not a bound).
3. **Multiplicative bound**: for relative errors, (1 + r) ≤ (1 + r_g)(1 + r_f)^{p}, with p the order of g's dependence on its input over D (p = 1 for linear maps; for a power law, the exponent). Again a property of g the kernel must have, or no bound.
4. **Correlated errors**: the additive bound assumes worst-case alignment, which is sound. Where the contracts carry distributions rather than intervals, the composite distribution is computed by propagation (NEXUS §Q.2), which is itself an APPROXIMATES with a contract (linearisation validity), so the composite's *tier* drops to that of the propagation rule. Correlation between f's and g's errors (both from the same tolerance, say) can only tighten a worst-case bound, so ignoring it is sound and loose.
5. **Nonlinear bounds**: where g's error depends on the input (ε_g(x)), the composite bound is sup over D of ε_g(x) + L_g(x) ε_f: a bound over the domain, computed by interval evaluation of ε_g and L_g, sound and loose.
6. **Information loss**: COARSE_GRAINS_TO composed with anything: the survivors of the composite are the survivors of the second map applied to the survivors of the first; a quantity lost by f is unavailable to g, so a g that needs it does not compose (a type error, not a bound).
7. **Domain exit mid-chain**: a run that leaves D_g at some tick, having been inside D_f, has a composite certificate up to that tick and a `domain-exit` term after it; the escalation of NEXUS §O.3 is triggered by the composite, not by either link.

The honest statement: the kernel calculates the composed contract from the links' contracts *and* the links' Lipschitz or order data; a link without that data cannot be composed with a bound, and a chain whose composed domain is empty is not a chain. The computation is sound (never claims a bound that fails) and incomplete (the true error is usually smaller). "Locally bounded, globally trustworthy" is a theorem only when every link carries L and the composed domain is nonempty.

The batch-2 rotor is a worked case. Realisation 1 (the soft row) is a REALISES whose contract was unstated; measured, its ε in static sag is 50% of the sag, far outside any contract that would have been written, so it is not a realisation of the rotor at all but a different model. Realisation 2 (reflected inertia) is a REALISES of the rotor's inertia about its axis composed with an APPROXIMATES ("the housing does not spin about the axis") whose ε is Σ J_rotor over the body's own inertia about that axis: 3× for a walker's pitch. The composite's domain is "bodies whose housing-side inertia about the axis is large against Σ J". A walker is outside it. The kernel, given both contracts, would have said so before the test did.

## H. Evidence object taxonomy

One sealed object, `observation`, with a typed acquisition and a provenance record. The seal means: no kernel rule changes its value. The type decides what the comparison rule may do with it:

| acquisition | what it is | fields the comparison needs | how the comparison treats it |
|---|---|---|---|
| `measured` | an instrument reading of the world | instrument model (its own uncertainty and systematic bias, as a term), time, conditions, calibration record of the instrument, replication count | the discrepancy is standardised by the instrument's uncertainty; a systematic bias is subtracted with its own uncertainty, not averaged down by replication |
| `experimental record` | a `measured` set under a declared intervention (§K of NEXUS) | the intervention term, the control condition, the sensor set | the comparison is against the prediction in the *intervened* theory; a record without a declared intervention is `measured`, not experimental |
| `simulated` | a run instrument's reading | run root (theory root, world root, realisation roots, seed), the instruments' own contracts | compared only with predictions of a *different* theory or realisation (a run supports nothing about the theory that produced it); its "uncertainty" is the realisation's contract, never zero |
| `calibration record` | a `measured` set used to fix a parameter | the parameter, the model form, the fit range | consumed by the calibration rule only; the parameter it yields is a tier-3 judgment with the record as its support; using the same record again to support the model it calibrated is circular, and the kernel refuses it (the record's hash is in the parameter's support) |
| `reported` | a datasheet, a standard, a textbook, a paper, an expert | the reporter, the conditions reported, whether the number is measured, specified or derived by the reporter | weighted below `measured` by provenance type; a *specification* (what the maker guarantees) is a bound, not a value; a *standard* is a convention where it prescribes and a report where it reports |
| `aggregated` | a statistic over leaves | the leaves (by hash), the statistic, the selection rule | the selection rule is the first thing the comparison looks at (§H.3) |
| `human report` | a person's statement about the world ("the drawer sticks") | the person, the time, what they could observe | the weakest provenance; it opens an anomaly (A0) and never closes one |

### H.3 What the comparison rule accounts for

`compare(pred, obs)` takes the prediction (a judgment with its uncertainty kinds), the observation (with its acquisition type), and produces a `comparison` whose fields are: the discrepancy; the standardised discrepancy where distributions allow; the *instrument model* applied (so a bias is removed with its uncertainty); the *replication* (n of independent readings, where "independent" means different instruments or different occasions, a field of the observation that the comparison reads, not infers); the *selection rule* (how the observation was chosen from what was available: an aggregate without one is INCONCLUSIVE by default, because a selected set supports anything); *confounding* (for an experimental record, whether the intervention term replaced the mechanism the prediction depends on; if not, the comparison is marked observational and cannot support an intervention claim, NEXUS §K); and *lineage* (the hashes of every term the observation's processing used, so a corrected datum invalidates every comparison that used it, by §I).

Measurement uncertainty, systematic uncertainty, instrument model, selection bias, replication, independence, confounding, lineage: eight fields; a comparison missing one of them is marked with what it is missing, and a `support` relation computed from it carries the gap. That is how "evidence supports C" never becomes stronger than its weakest field.

## I. Syntactic identity versus semantic equivalence

A hash is **lineage**: it identifies *this term as built*. Two terms with the same hash are the same term. Two terms with different hashes may or may not mean the same thing, and the kernel does not guess.

- x + x and 2x: different hashes; an EQUIVALENT morphism (tier 0, by the ring axioms) certifies them equal, and the certificate is a term. Normalisation (a canonical form for polynomials, say) is a convenience that makes some equivalences syntactic; it is never complete, and the kernel does not rely on it.
- Newtonian and Lagrangian mechanics: different theories, different hashes; an EQUIVALENT morphism with a proof (the Legendre transform and its inverse, on the domain where the Lagrangian is regular) certifies that every judgment of one carries to the other at tier 0 inside that domain. Outside the domain (a degenerate Lagrangian), no equivalence is certified, and the two are two theories.
- Rigid-body mechanics and the elastic continuum: not equivalent; COARSE_GRAINS_TO with its contract.

Consequences the architecture keeps: (1) an ontology is never read off hashes; (2) "one authority, several presentations" (NEXUS §O.1) holds exactly where an EQUIVALENT certificate exists, and nowhere else; (3) the duplicate-authorities health metric (NEXUS §Y) counts theories deriving the same quantity on the same domain *without such a certificate*; with one, they are one authority; (4) the "delete every English label" test is unchanged, because certificates are terms and names are not.

## J. Revised definition of kernel authority

**Everything proposes. Only the trusted kernel may certify machine status.** The kernel certifies, authoritatively and only, these eight properties of a term:

1. type-valid (its type is what the rule says, dimensions included);
2. dimension-valid (every equation homogeneous);
3. proof-valid (every rule application legal; the tier is the weakest rule's);
4. contract-valid (every morphism in its chain has a contract, and the composite is computed, §G);
5. dependency-valid (every hash it references exists and is current);
6. numerically-certified (where a tier-1 rule was used, its enclosure is sound with directed rounding);
7. evidence-record-valid (every observation it cites has the eight fields or a named gap);
8. status-transition-valid (the term's status moved only along the allowed edges below).

Statuses are machine facts about a term, not facts about nature:

| status | means | computed from |
|---|---|---|
| FORMALLY PROVED | Γ ⊢ C at tier 0 | 1–5 |
| NUMERICALLY CERTIFIED | Γ ⊢ C at tier 1 (an enclosure) | 1–6 |
| PROPERTY-TESTED | Γ ⊢ C at tier 2 (no counterexample in N draws from D) | 1–5 and the test record |
| EMPIRICALLY SUPPORTED | E ⊨ C within δ on D, and no CONTRADICTS in E | 7 and the comparison set |
| CONTRADICTED | some comparison in E says CONTRADICTS, or ⊢ ⊥ from C and an accepted judgment | 7, or 3 |
| UNRESOLVED | neither supported nor contradicted (no comparisons, or INCONCLUSIVE ones), or competing theories undecided | 7 |
| OUTSIDE DOMAIN | the query lies outside the composed domain of the chain used | 4 |

A term carries a ⊢-status and a ⊨-status at once, and the renderer shows both. The kernel decides nothing about nature; it decides whether the formal requirements for a status are met. Nature is constrained through the evidence leaves, which the kernel cannot write. This is cleaner than NEXUS.md's wording, and it is adopted.

## K. The correct role of message passing

Message passing is one algorithm over the hypergraph (NEXUS §L) whose *contract* decides its role; it is neither authoritative nor not. Three cases:

- **Contracted structured messages**: interval constraint propagation (sound outer bounds: tier 1), network flow and circuit solvers (exact on their equations: tier 0 or 1 by the arithmetic), domain decomposition and iterative coupled-field methods with a convergence certificate (a contraction constant, a residual bound: tier 1), factor-graph belief propagation on a tree (exact marginals: tier 0 relative to the model). Each is a REALISES morphism with a contract, and the kernel certifies its output at that tier.
- **Contracted but incomplete**: belief propagation on a loopy graph, interval propagation that stops at a budget. Tier 3 at best; the output is labelled with what was not reached.
- **Uncontracted learned messages**: a learned propagation with no bound. A proposer. Its output is a proposal with no status until something contracted checks it.

NEXUS.md's rejection of "generic learned message passing as a universal multiphysics solver" stands; what it should have said is that message passing with a contract is just another realisation, and that the circuit solver this codebase already runs (R-10) is one.

## L. The correct role of causal reasoning

"do() is attaching a source to a port; observe() is attaching a sensor" is exact for physically explicit systems: it is A-1 applied. It does not cover the rest of the request's list, and the architecture keeps a causal representation above the port level for those cases:

- **Stochastic systems**: an intervention on a port of a system with a stochastic element (a noise source is an element with a port, FS-5) is still a port intervention; the prediction is a distribution. Covered.
- **Unknown confounders**: not covered by ports, because a port that is not in the model is not a port. The higher-level representation is a structural causal model over *variables* (not ports) with explicit exogenous nodes, where an unobserved confounder is an exogenous node with an edge to two variables; the identification rules (back-door, front-door, instrumental) are tier-0 theorems of that calculus and decide whether an interventional claim is identifiable from the observations at all. This is a theory in the Nexus like any other, with EQUIVALENT morphisms to the port picture where every variable is a port, and without them where the model is incomplete.
- **Partially observed systems**: the sensor picture covers what is measured; what is not measured is a latent variable in the SCM, with the same identification question.
- **Learned causal models**: a proposer that outputs a candidate SCM (a proposal of a graph) from data; the kernel can certify its *consistency* with the observations (conditional independences) at tier 3 and nothing more; orientation of an edge without an intervention is UNRESOLVED, and the architecture refuses to promote it (NEXUS §K's rule stands: no rule from a comparison set to an interventional judgment).
- **Biological networks, system identification**: both are the SCM case with mechanisms unknown; identification is a tier-3 inference of mechanism parameters, with the equivalence class of models consistent with the data as the honest output (several theory branches, §N).

So: ports where the model is explicit (exact, tier 0); SCMs over variables where it is not (identification theorems decide what is knowable); proposers for the graph itself (never authoritative). Causal machinery is kept; the port picture is its exact special case.

## M. Multiscale stress test

The thought experiments, and whether five primitives (§D) represent them without smuggling domain assumptions into the roots:

| system | state (primitive 5) | judgments and types (1) | morphisms (2) | evidence (3) | what is domain-specific |
|---|---|---|---|---|---|
| rigid-body mechanics | D × Q × V (FS-1) | F-1..F-4 as theorems from A-1..A-3 | REALISES by the row solver (R-1); COARSE_GRAINS_TO from the continuum | runs, instruments, the walker tests | M-2 (rigidity) is a *model assumption*, a root of this theory, not of the Nexus |
| elastic continuum | fields: displacement, stress over a region | balance laws as theorems; constitutive law as a theory with parameters | COARSE_GRAINS_TO from the molecular; APPROXIMATES by finite elements (a REALISES with an h-refinement contract) | tensile tests, modal tests | the continuum hypothesis (a model assumption of this theory) |
| circuit model | charges and currents on a graph | Kirchhoff as ML-1 on cuts (exactly the cut law); element laws | REALISES by the circuit solver (R-10); LIMITS_TO from Maxwell (quasi-static, ℓ ≪ λ) | a multimeter's readings | lumped elements (model assumption: the quasi-static limit) |
| thermal diffusion | a temperature field | Fourier as a constitutive law under F-2.5; the heat equation as a theorem | COARSE_GRAINS_TO from kinetic theory; APPROXIMATES by lumped nodes (the current thermal.ts) | thermocouples | local equilibrium (the field's definition needs it: §O.2 of NEXUS) |
| fluid model | velocity, pressure fields | Navier–Stokes as F-1 and F-4 on a continuum; drag laws as APPROXIMATES at a Reynolds regime | regime map by Re, Ma (§O.4) | drag measurements | the continuum again, and the regime boundaries |
| chemical reaction | species amounts, temperature | mass action as a constitutive law; conservation of atoms as ML-1 on a different cut (atoms, not momentum) | COARSE_GRAINS_TO from molecular dynamics; LIMITS_TO the equilibrium (fast-reaction) limit | calorimetry, spectroscopy | the rate law's form |
| microscopic model | particle positions and momenta, or a wavefunction | Hamiltonian mechanics or quantum mechanics as the theory | the *source* of every COARSE_GRAINS_TO above | scattering, spectra | M-1's classical space and one clock is a model assumption *this* theory may replace |

Verdict: the five primitives represent all seven without domain assumptions in the roots, provided the roots are what NEXUS.md already said they are: A-1 (ports and junctions), A-2 (symmetry), A-3 (passivity), A-4 (realisation fidelity), A-5 (grounding), and *no* model assumption. M-1..M-5 are roots of the rigid-body theory, not of the Nexus; docs/LAW-TREE.md put them in layer 0 beside the axioms, which was the one place a domain assumption had crept into the roots. Correction: M-nodes move under their theory. The registry (`src/ganglia/tree/nodes.ts`) marks them `model-assumption` already; what changes is that they stop being roots of the whole tree and become roots of a theory node `T-rigid`, which the tree test will enforce once theories are terms (NEXUS §Z step 1).

One thing the table exposes: ML-1, the cut law, is used three times with three different conserved quantities (momentum, charge, atoms). That is the sign of a theorem schema over a *conserved quantity type*, and it is what A-1's "power-conserving junction" generalises to when the port's effort–flow product is not power but a flux of any conserved quantity. A-1 as written is about power; its general form is "junctions conserve the flux they junction", and power is the instance where the flux is energy. That is a change to a root, with its burden: it preserves every consequence (power is still conserved) and adds the charge and species cases as instances rather than analogies. Proposed, not made, by the protocol of NEXUS §X.

## N. Theory-change stress test

Represent: model A valid in regime R_A; model B deeper; A recovered as a limit of B; A and B represented differently; evidence once favoured A alone; later evidence supports B; old A-based claims remain valid inside the recovered regime.

In the five primitives:

1. T_A and T_B are two `theory` terms (contexts), each with its own types and axioms (represented differently: no shared hash).
2. A morphism φ: T_B → T_A of class APPROXIMATES with its domain written as the limit (κ → 0, the LIMITS_TO label), with ε_φ(κ): inside R_A = {κ small}, B's predictions mapped to A's variables agree with A's within ε_φ.
3. Evidence: a comparison set E₁ of A's predictions with early observations (all in R_A): SUPPORTS. B's predictions on E₁, through φ, agree with A's within ε_φ, so E₁ supports B as well; the two are undecided on E₁. Status of both: EMPIRICALLY SUPPORTED on R_A; UNRESOLVED between them (competing branches, NEXUS §R.3).
4. Later observations E₂ outside R_A: A has no derivation there (OUTSIDE DOMAIN) or predicts and is CONTRADICTED; B predicts and is SUPPORTED. B's status: supported on R_A ∪ R₂. A's: supported on R_A, contradicted or silent on R₂.
5. Old A-based claims: each is a judgment J with support in T_A and a domain D_J ⊆ R_A. Under the theory-change transaction (NEXUS §X), the kernel re-derives J in T_B through φ: PRESERVED within ε_φ on D_J. J keeps its status, with its support now citing T_B, φ and the old T_A derivation as history. A claim with D_J ⊄ R_A is CHANGED or LOST and is listed.
6. The promotion: T_B becomes the head's theory for the domain; T_A remains a theory term, addressable, with φ as the certificate of why it worked. Nothing is deleted.

Clean. What it required beyond the four original primitives: nothing new, but it required theories to be first-class terms (NEXUS §D had them) and the states of §D above to carry which theory they are under (a `world` references a theory root; it did).

## O. The false formal theory

Construct: a theory T_f with one axiom beyond T_rigid: "every body in free fall experiences a drag force f = −c m v with c = 0.1 s⁻¹, dimensionally [T⁻¹] × [M] × [L T⁻¹] = [M L T⁻²]: a force." Dimensionally correct. Internally consistent (it is a passive element, ML-3 holds, nothing contradicts). Formally typed (c is a parameter of type Q[T⁻¹] with a value). Numerically realisable (one more row per body; the existing air-drag path could carry it). Its theorems are tier 0 inside T_f: "a dropped block reaches 99% of terminal speed g/c = 98 m/s after 46 s".

Why it does not become WORLD knowledge:

- Its ⊢-status is FORMALLY PROVED *in T_f*. Its ⊨-status is computed only from comparisons of its predictions with observations. The free-fall energy test (tests/conformance/energy.test.ts) is a run under T_rigid, a `simulated` leaf that supports nothing about T_f (§H: a run supports only theories other than the one that produced it, and here it is produced by T_rigid, so it is evidence *against* T_f only through the comparison: T_f predicts a 0.9% speed deficit after 0.5 s; the run under T_rigid shows none; but a run is not a measurement of the world).
- The decisive leaves are `measured`: a dropped mass timed over 1 m in a vacuum column, or the published free-fall data T_rigid's E-g node already cites. T_f's prediction for a 1 m drop differs from T_rigid's by 0.2% in time, within a stopwatch's uncertainty, so a crude comparison is INCONCLUSIVE and T_f's status is UNRESOLVED, not supported. A precise comparison (a vacuum drop timed to 0.01%) gives CONTRADICTED.
- Nothing promotes an UNRESOLVED theory into the head: the protocol (NEXUS §X) requires a preservation proof against the head's supported comparisons, and T_f, which changes every free-fall prediction, has CHANGED consequences on every supported free-fall comparison, which it must explain and cannot.
- Ego can hold T_f as a branch and derive in it, and every rendering of a T_f judgment carries "formally proved in T_f; unresolved against observation". Nothing she says from it is a WORLD claim.

The test passes because ⊢ and ⊨ are two relations (§E) and promotion needs the second.

## P. The empirically good, theoretically weak model

Construct: Coulomb friction with a fitted coefficient, or better, the fitted friction values in `src/data/materials.ts` (docs/LAW-TREE.md K-22), or the Blok heat-partition rule (K-9). Take Coulomb: "the tangential force is at most μ N, μ a constant of the pair." Weak theoretical justification (asperity models give it only roughly, μ depends on speed, load, temperature, history). Strong repeatable evidence over a domain (dry, clean, moderate loads, low speeds).

How it is stored honestly:

- A `theory` term T_Coulomb whose one axiom is the law, with μ a parameter typed Q[1] with a calibration record per pair (`calibration record` leaves, §H).
- ⊢-status of its theorems: FORMALLY PROVED in T_Coulomb (trivially: it is the axiom).
- ⊨-status: EMPIRICALLY SUPPORTED on the domain the calibration records cover, with the comparison set; CONTRADICTED outside (high-speed, lubricated, hot), and the domain is written from where the contradictions begin, not from where someone wished.
- Its place in the tree: a `constitutive` node under F-4 (maximum dissipation) with an APPROXIMATES morphism *to* it from a deeper theory where one exists (rate-and-state friction, with ε as the velocity dependence over the domain) and none where none does. Where no deeper theory is registered, the node's `epistemic` is `constitutive` and its parent is F-4, so that its derivation path reaches a root through the *form* (a dissipative element, passive) while the *number* comes from evidence. Nothing marks it fundamental: `kind: 'constitutive'`, `epistemic: 'constitutive'`, and a WHY that ends at "fitted to these records on this domain".
- Revision burden: the calibration records plus the designs that cite μ. Cheap, as it should be.

The honesty is in three fields the current schema already has (kind, epistemic, domain) and one it gains from §E: the ⊨-status computed from comparisons rather than declared.

## Q. Type-inhabitation limits

The spec type S of a design; the search for inhabitants. Five outcomes, kept apart:

| outcome | what the kernel has | status word |
|---|---|---|
| IMPOSSIBLE | a term of type S → ⊥ (from the theory's axioms and S's constraints: the unsat core) | DISPROVED in this theory; the certificate names the theory, so "impossible under T_rigid" never means "impossible" |
| INHABITED | a term of type S | PROVED; the term is the design |
| NO TERM FOUND | the proposer ran its budget over a stated fragment of the search space and found nothing | UNKNOWN, with the fragment and the budget; never a negative |
| SEARCH INCOMPLETE | the budget ran out before the fragment was covered | UNKNOWN, with how far it got |
| UNDECIDED BY THE THEORY | S's satisfiability depends on a quantity the theory does not fix (a parameter with no value, a constitutive law with no data) | UNRESOLVED, with the missing leaf named: the message of NEXUS §L that becomes a question |

Failed search is never a disproof: the only route to IMPOSSIBLE is a term of ⊥, and proposers cannot make one; only the kernel's unsat core from propagation (§M of NEXUS) or a tier-0 derivation can.

Parameterised families: an inhabitant is in general not one term but a *refinement*: {t : Beam | a ≤ thickness ≤ b ∧ capacity(t) ≥ load}. The kernel represents the feasible set as a refinement type (an interval, a box, a polytope, or a sampled region with a tier-2 certificate of membership), and:

- **continuous parameters**: the inhabitant is the feasible region, with its certificate (sound inner bounds by propagation where the constraints are monotone; otherwise a sampled region at tier 2);
- **optimisation**: a term of type S with an objective is a point of the region plus a tier-1 certificate of local optimality (KKT as a premise) or a tier-2 one (no better point in N draws); global optimality is a separate claim with its own (usually absent) certificate;
- **Pareto fronts**: a set of inhabitants none of which dominates another, with the same certificate per point; the front is a rendering of the set, not a new object;
- **uncertainty**: the region under uncertain parameters is a region of distributions; "robustly inhabited" is a refinement on the probability that a random draw of the parameters stays feasible, a tier-3 claim with its sampling record.

A region is an inhabitant; a point is a choice inside it; neither is confused with the other in the type.

## R. What in NEXUS.md was over-compressed

1. **"Identity is structure."** Over-compressed; corrected in §I. Hashes are lineage.
2. **"Only the kernel makes judgments."** Over-compressed into a claim about truth; corrected in §J.
3. **The morphism as one concept.** Over-compressed in its laws, right in its interface; corrected in §F and §G.
4. **The four primitives.** One short: state with a transition law (§D). Five.
5. **M-1..M-5 as roots.** A domain assumption in the roots; corrected in §M.
6. **A-1 as power conservation.** Narrower than its uses; a generalisation to flux conservation is proposed in §M by the protocol, not made.
7. **"Observations are sealed."** Right but underspecified; corrected in §H.
8. **Causal reasoning as ports.** Right as the exact case, incomplete as the architecture; corrected in §L.
9. **Message passing.** Right in its warning, wrong in its framing (neural versus not); corrected in §K.
10. **The rotor.** Not in NEXUS.md, but the batch's lesson for it: two realisations of one law, each with an unstated contract, each wrong in a different direction, found by tests that the law's node cited. The architecture's requirement that a REALISES carry a contract is the thing that would have prevented three days of a walker standing on a false servo. It is in the registry now (R-10's contract names the housing-spin domain).

What survived untouched: typed judgments as the shape of derivation and design; evidence as a separate relation; content addressing for lineage, branches and transactions; the tiers; the closure principle in its corrected wording; the views as functors; the anomaly ladder; the restructuring protocol. The compression is successful where it preserved the distinctions reality requires, and it failed in exactly the four places above where it collapsed a distinction (hash/meaning, status/truth, morphism laws, state/judgment). Five primitives and one principle, with the laws written out, is the current answer.
