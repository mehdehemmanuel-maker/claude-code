# The time / scale / causal-propagation branch: a research pass that lives in Nex, in the substrate, and in the law book

3 October 2026. The first derivation pass of the branch asked for after docs/NEX-TOPOLOGY.md, done as structures, not
as a theory document. What follows is the human shadow of what was built; the authoritative objects are in
`src/ganglia/native/tsc.ts` (the records, each a Nex structure with its derivation, assumptions, domain, evidence,
uncertainty, counterexamples and reopen conditions; its status computed from those), in the substrate (the entities
and arrows `discovery()` inserts at build), and in the law book (two laws that entered it). Every number below was
produced by running the check that cites it (tests/unit/tsc.test.ts, tests/conformance/tsc.test.ts,
tests/unit/terms.test.ts); none was typed from belief.

The other half of the topology experiment ran first, because the branch needed laws as terms: §K below.

## The rule of the pass

- **NATIVE STRUCTURE**: a `Record` whose `structure` is Nex. Status is `statusOf(record)`, a rendering of the
  evidence vector: a counterexample contradicts; an assumption and an observation are what their rule says; a result
  with a derivation is DERIVED until a world supports it (one leaf a CANDIDATE LAW, two a SUPPORTED LAW, three with a
  measurement and a way to reopen it CRYSTALLIZED); without a derivation it is UNRESOLVED when it keeps branches, a
  HYPOTHESIS when something holds it up, OUTSIDE DOMAIN when nothing in this world can reach it.
- **HUMAN RENDERING**: every sentence in this file, `sayRecord`, `sayFrontier`, `report()`.
- Nothing was promoted because anyone believed it; nothing was rejected because humans do not hold it. CRYSTALLIZED
  was reached by nothing, which is what a first pass should say.

## A. Native structures created

Fourteen records, each a Nex structure that prints to the compact text and reads back to its own hash:

| record | structure (op) | derived from | status (computed) | world |
|---|---|---|---|---|
| tsc.a1-homogeneity | `invariant(law, system-of-units)` | assumption (Buckingham, Bridgman) | ASSUMPTION | inside |
| tsc.a2-finite-propagation | `constrain(influence, finite propagation speed)`, necessity necessary | assumption (the branch's c) | ASSUMPTION | partly |
| tsc.a3-observation-as-projection | `T(state → recorded-state)` under `tau-observer` | assumption (docs/SCALE.md A3) | ASSUMPTION | inside |
| tsc.coarse-graining | `state(T(fast-dynamics → effective-state + coarse-residual) under ratio τp/τo, constrain(residual ≤ A τp/(π τo)))` | A3; the integral of a sinusoid over a window | CANDIDATE LAW | inside |
| tsc.sampling-boundary | `constrain(resolved-regime, τp/2)`, mech shannon.sampling | the operator and the sampling law's term | DERIVED | inside |
| tsc.process-time-scaling | `state(invariant(process-time, size^k), k per law)` | A1 and the terms of the time-valued laws | SUPPORTED LAW | partly |
| tsc.rigid-domain | `constrain(rigid-body-realisation, length/sound-speed)` with `dom: crossing < tick` | A2, the operator | CANDIDATE LAW | inside |
| tsc.redistribution | `T(organised energy of one body → E/N organised + E(1 − 1/N) internal)` | Newton's second law's term, the operator | CANDIDATE LAW | partly |
| tsc.bond-regime | `T(bound-chain → unbound-chain)` under the ratio of internal energy per bond to bond energy, boundary an interval | the redistribution | CANDIDATE LAW | outside |
| tsc.c-electromagnetic | `same(c, 1/√(μ0 ε0))`, margin 1e-9 | the dilation law's term, two constants of the book | DERIVED | outside |
| tsc.c-role | `state(c as causal bound: unknown, c as specific-energy-to-clock-rate conversion: unknown)` | none; three branches kept | UNRESOLVED | outside |
| tsc.propagation-shapes | `differ(sound.speed, wave.speed.electromagnetic)` under their exponent multisets | the two laws' shapes | DERIVED | inside |
| tsc.scale-nature | `state(kind(scale, group-parameter) under homogeneous laws, kind(scale, coordinate) under laws with a dimensional constant)` | A1 | CANDIDATE LAW | partly |
| tsc.time-order | `state(kind(time, partial-order-of-transitions): unknown, kind(metric-time, count-of-a-reference-process): unknown)` | none | HYPOTHESIS | outside |

## B. New candidate laws

- **tsc.process-time-scaling** (SUPPORTED LAW): for a time-valued law τ = Π x_i^{e_i} under a scaling that holds the
  material and the environment, τ ∝ L^k with k = Σ e_i λ_i, each λ_i the exponent its input scales with by its
  dimension and 0 when held. Read off the shapes: the pendulum k = ½, diffusion k = 2, the lumped cooling time k = 1,
  an RC time k = 0 (size-free), a motor's electrical time constant k = 0. Two leaves measured in the engine
  (scale/observations.ts: Froude's pendulum 2.0026 against λ^½ = 2; the cooling cube 2.18 against λ^1, above it
  because free convection is not held). Two reopen conditions stay as data: diffusion in a world (none here) and an
  electrical world at two sizes.
- **tsc.coarse-graining** (CANDIDATE LAW): the mean of a periodic component of amplitude A and period τp over a
  window τo is bounded by A τp/(π τo); a window of whole periods averages it to nothing exactly; a half period over
  reaches the bound (3600 phases and starts, closed form held against Simpson integration). This is the operator
  behind "fast things look stable": the residual is the one number, and the ratio τp/τo is its one parameter.
- **tsc.rigid-domain** (CANDIDATE LAW): a rigid part is inside its domain while the sound-crossing time L/√(E/ρ) is
  under the tick; the critical length at the world's tick (11.1 ms) is 0.45 m for natural rubber, 2.5 m for EVA foam,
  56 m for steel, 63 m for ferrite. Measured in the engine: a 1 m rubber bar struck at one end moves whole within
  the tick, 25 ms before sound could reach its far end (ratio 2.24); a 0.2 m bar is inside (0.45).
- **tsc.redistribution** (CANDIDATE LAW): a strike into a free chain of N bodies leaves 1/N of the energy organised
  (momentum alone: p²/(2Nm) over p²/(2m), exact for all time); the rest is internal, and a harmonic chain holds half
  of it as motion on average (measured 0.49 at N = 8, energy drift under 1e-3). What a window longer than the
  chain's periods records of the internal part is a constant: heat.
- **tsc.bond-regime** (CANDIDATE LAW, outside this world): a Morse chain stays bound at low internal energy per bond
  and breaks at high; the share of broken bonds rises with the ratio and the boundary is spread (0, 0.14, 0.14, 0.43,
  0.43 at ratios 0.2, 0.5, 1, 2, 4), because a strike does not share its energy equally among the bonds. Fire and ice
  are the two regimes of this one transformation; the engine simulates no bonds, so no world here reaches it.
- **tsc.scale-nature** (CANDIDATE LAW): in the homogeneous sector scale acts as a one-parameter group on the
  dimension lattice (covariance measured in nine similarities, tests/conformance/scale.test.ts); every constant with a
  dimension fixes a point where the group breaks, so there and only there scale is a coordinate. Twenty-eight of the
  book's 144 laws carry such a constant (counted by the branch, with the gravity shorthand included).

## C. Existing laws reclassified

Six laws that nothing generalised before the pass are instances of a structure above them after it, computed from
the substrate's arrows (`deepest()` before and after, never declared): pendulum.period, diffusion.time,
lumped.time-constant, rc.time-constant, motor.time-constant (under the scaling result) and
wave.speed.electromagnetic (under c's derivation). Their history is intact: nothing was edited, an arrow was added.

## D. Deeper unifications discovered

- The five time-valued laws are one result with one free exponent, and the exponent is not a parameter of the
  result: it is read off each law's own shape.
- The sampling law (`shannon.sampling`) is the boundary of the observation operator's resolved regime: τp/τo = 2.
- The rigid-body realisation's domain is the observation operator applied to the solver's own window (the tick) with
  the sound crossing as the process time: one structure explains when the engine's central approximation holds.
- c is not an independent constant of the book: it is 1/√(μ0 ε0) from the constants two other laws carry
  (relative difference 1e-9).

## E. Branches rejected

- "The mechanical and electromagnetic propagation speeds are one shape": compared at every level of forgetting,
  their exponent multisets differ ({½, −½} against {−½, −½}); they are one shape only at the level where every speed is
  one. Kept as `differ` (DERIVED), not forced.
- A sharp regime boundary at ratio 1 for the Morse chain: what the chain gave is a spread boundary; the record says
  the spread, not the 1.
- CRYSTALLIZED for anything: nothing has three independent leaves with a measurement.

## F. What remained unresolved

- **The role of c** (UNRESOLVED, three branches: causal bound, spacetime conversion, a deeper transformation
  neither names). Nothing in the engine propagates at c and no clock in it but the tick, so no measurement here can
  move it; it waits on a world that has one.
- **Time as order** (HYPOTHESIS): metric time as a count of transitions of a reference process; the discriminating
  measurement (two independent clocks under one coarse-graining) has no second clock here.
- **Scale as one structure or two**: whether the ratio τp/τo (the operator's parameter) and the group parameter λ are
  one structure. A derivation, not a measurement, would move it.
- **Phase change in a world**: the bond regime is outside every world the engine runs.

## G. What entered the frontier

Eight records with a legal question left, each with the measurement that would move it, read off the structures
(`frontier()`): a2-finite-propagation, coarse-graining, rigid-domain, redistribution, bond-regime, c-role,
scale-nature, time-order. Ego answers "what is open" from them (and from her own unresolved investigations). The
unknowns also entered the substrate as coverage unknowns on each entity, so the population queue can ask them.

## H. What Ganglia relationships changed

Inserted at build (`substrate/index.ts`, step `tsc`), with provenance "derived: the branch": 14 entities; `is-a` from
the five time laws to the scaling result and from the electromagnetic wave speed to c's derivation; `governed-by` from
the operator to the sampling law, from the rigid domain to the sound-speed law, from the redistribution to momentum
conservation, from c's derivation to the two constant-carrying laws; `coarse-grains-to` from the redistribution to
the operator; `analogous-to` from the bond regime to Clausius-Clapeyron; `requires` from derived records to the
assumptions they stand on; `measured-by` from c's role to the dilation law. Nothing was rejected by `ingest`.

## I. What dependency propagation occurred

Each record cites, by hash, the law terms and records it was derived from. `propagate([hash of pendulum.period's
term])` returns the scaling result as stale; `propagate([hash of a2])` returns the rigid domain and c's role; the
operator, which cites neither, is untouched. The check is the citation closure (`terms.affected`), lazy: what is
affected is known at once, nothing is recomputed until `rebuild()`. This is the mechanism, in the small; the laws
outside the 43 with terms have no hash yet, which is the REQUIRED RECURSIVE GANGLIA CAPABILITY still missing: every
law as a term, so that every derivation in the book can cite it.

## J. What law hierarchy reorganized

No hierarchy was edited. The generalisation order over the law book changed by six arrows (C above), and
"foundational" is computed as the laws nothing generalises. The hand-kept law tree (`tree/nodes.ts`) was not touched
and touches none of these laws (measured in tests/unit/terms.test.ts: 0 of its 109 nodes name any of the 43 termed
laws): it is a registry of physics realisations, not of the law book, and the two were never one thing.

## K. What Nex-native constructs were missing

Two gaps closed, two recorded:

1. **Closed: arithmetic terms.** Nex had no way to say what a law computes; a law's content was a closure. One
   operator was added, `apply` (an operation distinction applied to operands), and 43 laws of the book were written
   as terms (`native/terms.ts`), each reproducing its own worked example (the term is the law; `eval` is its
   realisation). Anti-unification (`lgg`) over the terms keeps operations and abstracts names. The other half of the
   topology experiment then ran: 15 of the 18 termed laws with no power form joined a shared shape; the generalisation
   order is three deep where the exponent probe reached two; 16 shapes with two or more instances, 7 maximal, the
   deepest being "a product of two" (13 laws), "a product of three" (9), "a quotient" (8); 12 promoted shapes shorten
   the corpus from 413 to 386 nodes under the description-length criterion. The hand-kept law tree compresses none
   of them.
2. **Closed: a process state around a structure** (the Record envelope: derivation, assumptions, domain, evidence,
   counterexamples, uncertainty, reopen, world). The same envelope the Mind uses; it is not Nex and should become
   relations once the substrate stores structures.
3. **Open: an interval as a condition.** The bond regime's boundary is an interval of a ratio; `Q` carries an
   uncertainty interval, so it was said as a quantity with `cert`, which reads as "a boundary of 0.5 known to within
   0.2 to 2". A condition that is itself a region of a parameter has no construct of its own.
4. **Open: a disjunction of readings.** The role of c is two structures held in one `state` with mode `unknown`
   each; Nex has no operator for "one of these, not yet which". `state` is a conjunction; the branches are carried
   outside the structure (`branches`).

## L. What English concepts collapsed into deeper native structure

- "fast things look stable", "effective macrostate", "aliasing", "the rigid-body approximation holds" → one operator
  (the window mean with its residual bound), one parameter (τp/τo), one boundary (the sampling law), one instance
  (the tick against the sound crossing).
- "collision", "heat", "irreversibility" → one transformation (organised energy into E/N organised and the rest
  internal) and the operator (what the window cannot resolve of the internal part is recorded as a constant).
- "fire" and "ice" → the two regimes of one transformation, by the ratio of internal energy per bond to bond energy.
- "the speed of light is a constant" → a derived identity among three constants of the book.
- "scale is a dimension" → a group parameter where laws are homogeneous and a coordinate only at the fixed points
  dimensional constants create.
- "fundamental law" → what nothing generalises, recomputed after every arrow.

## M. What tests were generated

- tests/unit/terms.test.ts (7): every term reproduces its law's example; terms print and read back to their hash;
  the shapeless laws join the order; anti-unification keeps operations; the order's depth; description length;
  propagation by hash.
- tests/unit/tsc.test.ts (10): the averaging bound (held, reached, zero over whole periods); the chain's 1/N and
  half-internal motion; the Morse regimes; c from μ0 ε0 and the new law's example; the size exponents of five laws;
  the rigid domain's critical lengths at the world's tick (held equal to the world's constant); every record Nex
  with a computed status and no status reached by belief; the frontier and its rendering; the substrate before and
  after (six laws reclassified, no relation rejected); propagation.
- tests/conformance/tsc.test.ts (1): the rigid bar in the engine (the observation leaf of tsc.rigid-domain).
- tests/e2e/ego-mind.spec.ts: "what is open" answered from the frontier in the headset.
- Three existing tests moved and were corrected as measurements, not tuned: the native census of silent polysemy
  gained a fifth word (the wave-speed law against the electromagnet), the certificate invariant held once the
  sound-speed example was computed independently, and the frontier phrasings were left to the frontier intent.

## N. What Ego can now do that she could not

- Answer "what is open" with the branch's live questions and the measurement that would move each, read off the
  structures, beside her own unresolved investigations.
- Hold two laws she did not have: the speed of a longitudinal wave in a bar, and the speed of an electromagnetic
  wave with c as its vacuum example; "is a wave speed of 6 km/s possible in steel" and the rest of the possibility
  machinery reach them through the law book as any other law.
- Reach, by traversal, that the pendulum's period is an instance of the process-time scaling result, what that result
  stands on, what would reopen it, and that the time laws are no longer deepest.
- Compare any two laws of the 43 as terms, find their least general generalisation and whether one is an instance
  of the other, and say a term as a formula.
- Know, for every material in the book, the length past which a rigid part of it is outside the rigid domain at
  the world's tick, and that the engine violates finite propagation for a 1 m rubber bar.

## O. The current deepest supported structure produced by the derivation

**tsc.process-time-scaling**, the only SUPPORTED LAW of the pass: a time-valued law's characteristic time follows size
with the exponent its own shape gives under what the regime holds, derived from dimensional homogeneity alone and
supported by two measurements in the engine. It generalises five laws of the book, and it is itself an instance of
the observation operator's parameter: τp is what it computes, and whether a thing looks stable is τp against the
observer's τo. The next pass should try to put the operator above it (the operator's parameter as the scaling
result's output), which would make tsc.coarse-graining the deepest structure, if the derivation closes.

## What this pass did not do, stated plainly

- It did not touch the hand-kept law tree, the population's facets, the substrate's record type, or the intent
  parser beyond one question; those are the autopsy's next slices.
- 99 laws still have no term; propagation by hash reaches only the 43 that do.
- The engine measured one observation for the branch (the rubber bar); the two scale measurements it cites were made
  earlier for the scale layer and re-used as leaves. Diffusion, phase change, a second clock and anything at c are
  outside every world the engine runs, and the records say so.
- CORE RUNTIME OFFLINE-CAPABLE: all of this runs from the law book and the engine; nothing was fetched.
