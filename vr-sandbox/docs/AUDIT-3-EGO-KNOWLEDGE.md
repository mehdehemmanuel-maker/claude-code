# Epistemic safety audit: Ego's knowledge integrity

2 October 2026. Development paused. Code was read, not changed. The question for every item: can Ego come to believe something false, and keep believing it after the cause is gone?

A fact that frames everything below: Ego's learned knowledge is kept in browser storage under keys `vrsb.stand`, `vrsb.habits`, `vrsb.skills`, `vrsb.life`, `vrsb.reports` and the growth record. These survive every deployment of new code. Nothing in them records which version of the physics produced them. So every margin and joint upgrade the stand learned under the defects of the second audit is still on every headset today, and will still be there after the defects are fixed, indistinguishable from knowledge learned afterwards.

## A. Ego's knowledge taxonomy

Two things decide where a piece of knowledge belongs: what kind of statement it is, and which world it is about. The second is the namespace, and namespaces are walls: nothing crosses by inference, only by an evidence event of the right kind.

**Namespaces.**
- MATH: statements true by proof inside the model's mathematics (an identity, a theorem, a dimensional relation). Evidence: a proof and a property test. Never about the world directly.
- WORLD: statements about reality, with their evidence from reality: physical laws (sourced), constitutive models (their form and their measured parameters), manufacturer specifications, handbook measurements, real experimental results, sourced engineering heuristics.
- MODEL: statements about what this simulator does: simulation results, model-specific observations, numerical behaviour ("this solver at these settings does this"), self-calibrations (margins learned from the stand). True about the model; silent about the world.
- DESIGN: statements about how to make things that are not physical claims: a skill (steps that build a thing), a plan, a chosen heuristic, a preference. A design may cite WORLD or MODEL beliefs; it is not one.
- FICTION: anything resting on a fictional value or an unmakeable element. Never promotable.
- PERSONAL: what Ego knows about the user: habits, preferences, facts, reminders, money. Must never feed a physical belief.

**Types within namespaces.**

| Type | Namespace | Evidence it requires | Example |
|---|---|---|---|
| theorem | MATH | proof, property test | ΔK = Σλ⟨w⟩ |
| physical law | WORLD | sourced statement, validity domain, worked example | Euler buckling with its slenderness range |
| constitutive model | WORLD (form) + data nodes | source for the form; a measurement node per parameter | NDS yield modes; a battery's OCV(SOC) |
| specification | WORLD | the maker's document | a motor's k, R, J |
| measurement | WORLD | the handbook, standard or experiment, with conditions | steel's yield at 20 °C |
| experimental result | WORLD | a record of a real test: setup, instruments, numbers | "this table held 90 kg for 1 h" |
| sourced heuristic | WORLD or DESIGN | a citation ("1.5 proof load, test-house practice") | PROOF = 1.5 |
| simulation result | MODEL | a run record with obligations, versions, settings | the stand's held/peak record |
| model observation | MODEL | run records | "the solver needs 40 passes on this chain" |
| self-calibration | MODEL | runs only; never a world reference | the stand's learned margins |
| calibration | WORLD-anchored | a WORLD reference it was fitted to, and the fit range | a friction value fitted to published pair data |
| hypothesis | any (a status, not a type) | none yet; marked | "aprons stop racking" before it is sourced |
| user assumption | PERSONAL → ASSUMPTION | the user's words | "assume a 100 kg load" |
| fictional assumption | FICTION | the label | "a muscle with 10× real power" |
| derived conclusion | inherits the weakest namespace on its path | the derivation, recomputable by the law engine | "this motor cannot start this load" |

Where the user's candidate types went: "engineering heuristic" splits by provenance (a textbook rule is WORLD; one learned on the stand is MODEL self-calibration); "calibration" is WORLD only when its reference is external, otherwise it is self-calibration in MODEL; "hypothesis" is a status any belief can be in; "real-world experimental result" is the one type that can promote a MODEL belief into WORLD.

**The rule on promotion.** MODEL → WORLD only by an experimental-result node that measures the same quantity in the same configuration. FICTION → nothing. PERSONAL → nothing physical. DESIGN never carries a physical claim; it cites one.

## B. The belief object

Every stored belief is a structured record, not a sentence. Prose is rendered from it by the language layer and never stored.

```
Belief {
  id, namespace, type, status            // VALID | STALE | REQUIRES_REVALIDATION | INVALIDATED | QUARANTINED | HYPOTHESIS
  statement: { subject, quantity, relation, value, unit }   // machine-readable, not words
  domain: { scale: {length, mass, time ranges}, parameters: {name: [lo, hi]}, environment: {g, medium, temperature} }
  versions: { lawRegistry, model, solver, joltBuild, constitutiveData (hash), simSettings (hash), platform }
  assumptions: [assumption ids]           // frozen parts, boundary conditions, user assumptions
  notModelled: [phenomena]                // from the registry's NOT MODELLED list, filtered to what could affect this
  validity: V0..V6                        // computed by the kernel, never set by Ego
  claimLevel: L1 | L2 | L3
  evidence: { modelRuns: [run ids], worldRecords: [record ids], sources: [source ids] }
  error: { bound, kind: conservative|dissipative|neutral|unknown, measuredBy }
  derivation: { parents: [belief/law/data/run ids], method, recomputable: bool }
  sensitivity: { input id: contribution }  // which parents materially move the value
  provenance: { createdBy: law|datasheet|run|experiment|user|reasoning, at, by }
  history: [{ at, change, cause }]        // supersession, never deletion
}
```

The gait, written as a belief: subject "walker dog-v1 on gait walk-v1"; quantity "upright duration"; value "≥ 10 s"; domain: body length 0.2 m, g 9.81 m/s², μ(rubber, concrete) 0.9 (calibrated), servo model R12 (with the 6 Hz floor: a MODEL element), battery none (tethered), dt 1/90, Jolt build X, no flex, no fatigue, no rotor inertia; validity V2; claim L3 (servo model is an estimate); evidence: run ids; error: unknown; status: INVALIDATED (derived under FC-10, FC-11, FC-18). Rendered: "In the model as it was, with an idealised servo and no rotor inertia, this walker stayed upright for 10 s at 1 g on concrete. That belief is invalidated: the servo model has since been found false." Not: "dogs can walk this way."

## C. The knowledge dependency graph

Node kinds: law (registry node, with version), realisation (solver or method, with version), data (a constitutive record, hashed), setting (sim settings hash, dt, platform), run (a reproducible simulation: document hash, settings, seed, versions, the obligations' outcomes, the instruments' extremes), assumption, world record (an experiment), belief, design (a plan or skill), presentation (a report or page that quotes beliefs).

Edges: derived-from (belief → law, data, run, belief), observed-in (belief → run), assumes (belief → assumption), calibrated-against (calibration → world record), cites (design or presentation → belief), used (run → law, realisation, data, setting).

Change propagation, when a node changes:
- INVALIDATED: an ancestor realisation or law is found to have violated an obligation (a defect), for every descendant whose run used the defective version in a configuration the defect touches (the defect node lists what it touches: "mechanisms with closure", "any free rotation over 1 s", "any impact under 1 m/s").
- STALE: an ancestor changed in a way that can change the value but not its truth-class (a numerical improvement, a better constant): recompute when possible; the old value stays visible as superseded.
- REQUIRES_REVALIDATION: the belief is recomputable (its run record exists and is reproducible) and should be re-run before it is cited again.
- VALID: the change is provably off the path (the node is not an ancestor), or its effect is below the belief's own error bound, or the belief's sensitivity to that ancestor is recorded as negligible within a V2-validated model (see H).

No node is ever deleted; it is superseded with a pointer, so a presentation made last week still says what it said and why it is now wrong.

## D. Contamination audit of what Ego has learned

Every retained store, what it holds, where it came from, and whether it was learned while a known false-confidence path existed.

| Store | Contents | Learned from | Contaminated by | Verdict |
|---|---|---|---|---|
| `vrsb.stand` margin[kind] | a factor per design kind, ×1.5 on any fracture or yield, ×0.9 when members worked under 30% | the stand (prove.ts) | FC-4 by construction (self-calibration); FC-13 (four-legged tables: equal-stiffness split sets the joint and member loads); FC-6 (weights set on the top land inelastically, so the load spike that fractures a member is model-specific); FC-5 (mildly); A5 (push transients) | CONTAMINATED; MODEL self-calibration; discard wholesale (no run records exist to invalidate selectively) |
| `vrsb.stand` joints[kind|joint|params] | "this joint, as Best join makes it, must be this instead", applied before the next test | the stand | the same, plus a ratchet: once applied, every later test passes with the upgrade in place and the upgrade is never questioned | CONTAMINATED; discard; the mechanism itself (pre-applying a fix before the test) is a self-confirming loop |
| `vrsb.stand` aprons[kind] | "tables need aprons to stand a push" | the stand | learned under the same defects, though the conclusion is independently true (racking is in every furniture text) | re-source as a WORLD heuristic with a citation, or drop; it may not stand on the stand's evidence |
| `vrsb.stand` tests | a count | — | — | PERSONAL (a tally) |
| fixes.ts MARGIN 1.5, PROOF 1.5, PUSH 300 N, JOINT_LIMIT | authored heuristics | me (Claude), from engineering practice | not learned; but unsourced in data (1.5 proof is test-house practice; 300 N is my estimate of an adult's push) | DESIGN heuristics; need a source or an "estimate" label |
| growth prefs | the user's preferred joints and materials ("come first when I choose") | the user's choices | a preference formed because a joint "worked" in the model is a model-shaped preference; not a physical claim | PERSONAL; may bias proposals, never validity |
| `vrsb.skills` | macros of steps the user repeated | the user | none (steps, not claims); a skill learned on a build that held only by a model error carries no claim that it holds | DESIGN; clean, with no physical status attached |
| `vrsb.habits` | token transition counts | the user | none | PERSONAL; clean |
| `vrsb.life` | facts, reminders, money | the user | none physical; a user can store "steel floats" as a fact | PERSONAL; the wall to physics must exist |
| `vrsb.reports` | complaints with the watchdog's findings and what Ego "did" | the user and the watchdog | FC-2: "put 3 parts back on the floor" is recorded as a fix | EVIDENCE; the narrative of Ego's self-fixes is contaminated |
| lessons (generated, not stored) | steps; the "test" step passes when joints hold a few seconds in the model | the bench | FC-13, FC-15, FC-6 for the joints' holding | MODEL claims presented to the user as a check of their work |
| foresight (computed) | static loads vs capacities | laws and data, not the simulator | FC-7 (laws without range checks), FC-9 (estimates in capacities) | WORLD-derived at L2/L3; its words are the problem (M) |
| ganglia laws, processes, parts, workflows, principles, blocks, ways | authored, sourced | me, from sources | not learned from the simulator; some sources are 'rule of thumb'; the frontier's numbers are my estimates | WORLD where sourced; the 'rule of thumb' kind must map to L3 |
| challenge verdicts (computed) | works / partial / fails / unbuildable / unsayable | symbolic checks (checkDesign, grow), not simulation | none from the simulator; the word 'works' overstates V1 | DESIGN/MATH consistency, mislabelled |
| creature.ts GAITS, WALKERS, SWIMMERS | body plans and gait phases, "walkers people build" | me, tuned on the stand's sibling (conformance tests) | FC-10, FC-11, FC-18 (walkers); the swimmers under FC-10's servo | CONTAMINATED design knowledge in code; Ego places these when asked |
| understand.ts capability claims | "walkers: built, by creature.ts" | me | FC-18 | Ego tells the user she can make walkers that walk; the claim is model-level |
| immune antibodies, stress web | expectations about the simulator | me | tolerances set to current behaviour (the walker's 0.3 m) | MODEL knowledge; the tolerance habit is itself a contamination (see F) |

Nothing in any store records the physics version. Everything learned on the stand must therefore be treated as learned under every defect that existed before today, and discarded by a key version bump rather than selectively repaired.

## E. Quarantine rules

A run record R carries its obligations' outcomes O(R): every solve exited with g ≤ 0; internal momentum summed to zero to rounding; residuals within bound; the energy residual's gains and losses each under a stated fraction; no fault recovery; no pose written during the run; every model used stayed inside its envelope for the whole trajectory; settings identical to the live world's or declared. A candidate belief K derived from R:

1. O(R) all pass, no estimate, no fiction on K's path → K stored in MODEL at validity ≤ V2 (V3 if the convergence checks were run), claim level by path; it may be cited by Ego as "in the model".
2. Any obligation failed → K stored as EVIDENCE with the failed obligation attached; it cannot be cited as physics or design knowledge; it may be used to diagnose the realisation.
3. R used a realisation or law later found defective, in a configuration the defect touches → K INVALIDATED retroactively, with the defect id; so is everything derived from K.
4. K's path includes an estimate (an input of class engineering estimate, or a law of source kind 'rule of thumb') → K inherits L3 and names the estimate; it may be cited only with it.
5. K's path includes a fictional value or an unmakeable element → K in FICTION; never promotable; cited only as "in a fiction where…".
6. R's settings differ from the live world's (a bench without air, another gravity) → K carries those settings and does not apply to the live world until re-run there.
7. K rests on a self-calibration (a learned margin, a pre-applied joint upgrade) → K's validity is capped at V2 and it carries "self-calibrated"; the self-calibration's own node is MODEL and may never be the sole reason a design passes.
8. R used a frozen part or a creative grab on the load path → K assumes "fixed to the earth" and says so; it does not apply to a free-standing build.
9. K was formed from a run shorter than the time scale of any phenomenon on its path (a 3 s stand test says nothing about creep, fatigue, or thermal drift) → K's statement carries the duration, never "stable".

Today none of this exists: StandMemory stores a factor with no record at all.

## F. Model knowledge versus world knowledge

The stand is MODEL. "The test stand predicts a safety factor of 1.7" is a MODEL belief at L2 or L3 by its data; only a measurement of the built table makes a WORLD belief. "Prove" and "proof test" in prove.ts name a MODEL test as proof; the words go (M).

**The general calibration rule.** A calibration is a fit of a parameter to a reference. Its namespace is the reference's. If the reference is a simulation output, the calibration is MODEL self-calibration: it may teach what the model needs to pass its own tests, which is legitimate knowledge about the model, and it may never be the sole evidence that a design is right. A simulator may not calibrate itself to reality using its own output; the reference must come from outside the thing calibrated. This applies to tests too: a tolerance in a test is a calibration, and a tolerance set to the simulator's current output (the walker's 0.3 m, JOINT_DRIFT 5 mm, SEATED 2 cm) is a self-calibration by the developer. Every test threshold must cite a law bound, a measurement, or an error contract.

**Self-confirming loops found.**
1. The margin loop (FC-4): defect → member fails on the stand → margin ×1.5 stored → next design oversized → passes → Ego "learns" tables need 1.5×. The defect is never seen again because the margin hides it.
2. The joint-upgrade ratchet: a joint that failed once (for any reason, defect included) is upgraded before every later test of that design kind; it never fails again, so the upgrade is never revisited, and the memory grows monotonically toward over-building.
3. The aprons ratchet: same shape; the conclusion happens to be true, which is the dangerous case, because it makes the loop look like learning.
4. The relax loop: margin ×0.9 whenever members work under 30%, ×1.5 on any yield: a factor that random-walks on model noise and on the restitution floor's load spikes.
5. The watchdog–Ego loop (R14's origin): jitter reported → Ego stills → the walker falls → reported → Ego stills more.
6. The forecast–fix–design chain: foresight capacities (from laws) feed fixes, fixes feed designs, designs feed the stand, the stand feeds margins that feed the next forecast's load. A single wrong capacity law propagates into a stored margin that outlives the law's correction.
7. The preference loop: a joint the user chose because it held in the model becomes a preference Ego uses first; her designs then use it; they pass; the preference strengthens.
8. The developer loop: tests whose limits are set from the output they test; the suite goes green; the defect is institutionalised. I ran this loop myself on the walker.
9. The capability loop: understand.ts says walkers are "built"; the e2e test checks a dog moves 0.25 m; the gait exploits the servo fiction; the capability is confirmed.

Each breaks the same way: the reference for any calibration or threshold must be in a different namespace from the thing calibrated, and every stored correction must carry the run record that justified it, so it can be invalidated.

## G. The evidence model: validity and evidence are two axes

Collapsing them loses exactly the distinction between a correct theory with no data and a good table with no theory.

**Model validity** (structural): V0–V6 as revised, plus claim level L1–L3. It answers: does the computation obey the laws, converge, and rest on data?

**Empirical evidence** (about the world):
- E0: none (a consequence of the laws only).
- E1: analogy (a fictional or estimated input stands in for a real one).
- E2: inputs sourced (handbook, specification) but this configuration never measured.
- E3: the model class validated against measurements elsewhere (the magnet model against Hankel solutions and published pull forces; the kart against a datasheet acceleration). Today only a few models have this.
- E4: this configuration measured once in the world.
- E5: measured repeatedly or independently.

A conservation theorem is V-high, E0: it says nothing about any real machine. A friction table is V-low (no explanatory structure), E2–E3. A stand result is V2, E2 at best. Ego reports both: "consistent with the model (V2); inputs from handbooks, this configuration never measured (E2)."

## H. Sensitivity-aware provenance

"Weakest input wins" over-degrades: a drag coefficient that is an estimate should not make a chair's joint loads L3 when air does nothing to a chair. The rule becomes: a result inherits weakness only from inputs that materially move it.

For y = f(x₁…xₙ) with each input carrying a class and a range [xᵢ⁻, xᵢ⁺]:
- Influence is measured by propagation, not by a derivative at the operating point: y is recomputed with each uncertain input at the ends of its range (interval propagation, or the law engine's existing sensitivity for closed-form laws). The contribution cᵢ = |y(xᵢ⁺) − y(xᵢ⁻)| / |margin of y| where the margin is the distance from y to the nearest failure surface or decision boundary.
- An input is influential if cᵢ exceeds a stated fraction (a number to be chosen per decision kind; for a load-over-capacity decision, any input whose range alone could cross the capacity is influential regardless of fraction).
- The result's claim level is the weakest class among influential inputs; non-influential uncertain inputs are listed as "present, not influential, within their stated ranges".
- Derivatives alone are rejected because of failure surfaces: a small slope at the operating point with a cliff nearby is exactly the case that kills an invention. Interval ends catch the cliff.
- Two guards: an input with no stated range (a fiction, an unlabelled estimate) is influential by default, since its range is unbounded; and sensitivity is itself computed by the model, so it is MODEL evidence and only meaningful inside a V2-validated run. A model that is wrong may be wrong about what matters.

## I. Model-envelope architecture

Every law and constitutive model carries a DOMAIN and an EXIT CONDITION.

- DOMAIN: ranges over named variables, dimensionless where possible: temperature, speed, strain and strain rate, frequency, pressure, slenderness, Reynolds, Froude, Strouhal, magnetic Reynolds, Mach, state of charge, field strength, geometry assumptions (rigid, isotropic, uniform section). The ganglia's `valid` text becomes data; `outside()` becomes mandatory.
- EXIT CONDITION: what the model returns outside its domain: OUTSIDE_VALIDATED_DOMAIN (with the nearest bound and the distance), EXTRAPOLATION (only if the node allows it, with its form), MODEL_NOT_AVAILABLE, or BOUND_ONLY (an inequality the model can still guarantee). Never an ordinary number.
- At runtime, the kernel watches trajectories against the envelopes of every model in use (the eddy model's magnetic Reynolds, a motor's speed against its no-load speed, a material's temperature against its data, a battery's state of charge). A run that leaves an envelope has its validity dropped from that tick, the belief annotated with which envelope and when, and Ego told.
- Today: 31 of 104 laws check; the world's constitutive uses (friction, drag, eddy, motor thermal, magnets' temperature) have no runtime envelope except the eddy model's stated scope. Model envelopes do not exist as data.

## J. Extrapolation policy and counterfactuals

Extrapolation is allowed only where a law node marks itself extrapolable and states the form; the result is labelled EXTRAPOLATION with the distance outside the domain, and its evidence drops to E1. Otherwise the answer is OUTSIDE_VALIDATED_DOMAIN.

Every counterfactual Ego poses is routed through the same check before any number is produced, and classified:

| Question | Classification path |
|---|---|
| "What if this were lighter?" | inside the envelope if mass stays within every model's range; crosses a failure surface if the support or the fastener's capacity becomes governing; changes similarity class if Froude or a frequency ratio crosses a regime |
| "What if I doubled the voltage?" | needs new data if the motor's datasheet does not cover it (winding insulation, demagnetisation at the current); crosses a failure surface at the current limit and the winding temperature; the battery's chemistry is a different component, not a parameter |
| "What if the leg were twice as long?" | changes similarity class (Froude: speed ∝ √L, frequency ∝ 1/√L); the servo is a discrete component and does not scale, so the actuator becomes new data; buckling of the leg may enter NOT MODELLED (flex) |

The six outcomes are first-class: within envelope; extrapolation; similarity-class change (with the groups that crossed); new constitutive data required (naming it); failure-surface crossing (naming it); enters NOT MODELLED (naming the phenomenon). An invention step that lands in any but the first lowers the evidence of everything downstream.

## K. Novelty classification

A novel invention is a new arrangement, topology, control law or parameter combination whose consequence nobody authored, obtained inside the same laws. The test that separates novelty from loopholes, run in order:

1. Obligations: every run supporting the claim passes O(R). Any failure → NUMERICAL EXPLOIT candidate; stop.
2. Robustness: the effect survives dt/2, passes × 2, a different summation order, a different seed, and, where applicable, the alternative realisation (Jolt-only versus re-solved). If it disappears → NUMERICAL EXPLOIT.
3. Envelopes: every model stayed inside its domain for the whole trajectory. If not → DATA EXTRAPOLATION (the claim is about a regime the model has no right to describe).
4. Conservation audit for the claim's kind: a drive must show its momentum flux through an external port; an efficiency must show its energy source and sinks closing without the residual; a self-stabilising structure must show its energy decreasing by named dissipators. If the effect lives in the residual or in a boundary element (a frozen part, a hand) → MODEL EXPLOIT.
5. Approximation sensitivity: re-run with each declared approximation moved (angular damping off, restitution floor moved, slop halved, support split alternated). If the effect depends on one → MODEL EXPLOIT, naming the approximation.
6. Information audit: the controller's inputs are sensor readings only, and its success does not depend on an engine property (a false stop, a free stiffness). Otherwise → CONTROLLER EXPLOIT.
7. If any step cannot be run (cost, a missing alternative realisation) → UNKNOWN, never upgraded by default.
8. Survives all → PHYSICAL NOVELTY within the model, at the computed validity and evidence.

Caution scales with novelty by construction: the further a configuration sits from any V6 record and the more envelopes it approaches, the more of steps 2–6 are mandatory rather than sampled, and the lower the evidence axis starts. Ego becomes more careful as she becomes more original, because the architecture charges more evidence for distance from the validated region.

## L. Unknown and not-modelled states

These are values a query returns, not phrasings. The language layer renders each with fixed wording and may not reformulate them into confident prose.

| State | Meaning | What Ego says |
|---|---|---|
| UNKNOWN | the question is well-posed but no model, run or datum answers it | "I don't know; here is what would answer it" |
| NOT_MODELLED | the phenomenon is outside the model by declaration | "the model does not contain X; this answer ignores it" |
| INSUFFICIENT_DATA | the model exists; an input has no value or only a fiction | "I need a measured value for X" |
| OUTSIDE_VALID_RANGE | the model exists; the inputs leave its domain | "this is outside where the law holds (by how much)" |
| NUMERICALLY_UNRESOLVED | the realisation cannot resolve it at these settings (a time scale, a scale floor) | "the method cannot resolve this at this size or speed" |
| CONFLICTING_EVIDENCE | two sources or runs disagree beyond their bounds | "the model and the datasheet disagree: X vs Y" |
| REQUIRES_EXPERIMENT | no further simulation can raise the evidence | "only a real test can answer this" |

## M. Language-confidence rules

Vocabulary is bound to level. The kernel's level decides the words; Ego does not choose them.

| Level | May say | May not say |
|---|---|---|
| L1 / MATH | "exactly", "cannot", "always, in the model" | anything about the world |
| V2 / L2 | "in the model", "the model shows", "consistent with the model", "within ±X%" | "works", "will", "safe", "proven" |
| V3 | "stable under the method" | "verified" (reserved for E4+) |
| V4 / E2 | "grounded in handbook data, this configuration unmeasured" | "realistic", "correct" |
| V5 | "makeable from stock by these processes" | "ready" |
| V6 / E4+ | "measured", "held in a test" | "guaranteed" (never) |
| L3 | must name the estimate in the sentence | a bare number |
| any | "impossible" only for a MATH or law violation, naming it | "optimal" without the objective and the search space |

Current violations found and their replacements:
- ego.ts: "Every joint will carry its load with margin." → "In the static forecast, every joint carries its load with margin (capacities from handbook data)."
- ego.ts: "will fail" / "will be close to failing" → "the forecast puts it over its capacity" / "at X% of its capacity".
- prove.ts: "Prove it before you hand it over", "proof test", "the design must hold" → "model test", "test at 1.5× in the model"; the function and class names (`prove`, `Proof`) change with them, so the code cannot drift back.
- stand "It held" → "It held in the model for 3 s."
- challenges 'works' → "consistent (V1): every port typed and every connection holding symbolically"; 'fails' → "the law chain rejects it (naming the law)".
- frontier "on the safe side" → "the estimate errs toward overstating the load"; its numbers carry "estimate".
- growth.ts "I'll check every joint for the load it will carry" → "the load the forecast gives it".
- understand.ts "walkers (built)" → "walkers (built; walk in the model under the servo model as it is)".
- The tablet's "✓ It's fine" as a complaint option is user feedback, not a claim; fine.

Rendering polish may never raise confidence: an overlay carries the level of the belief it draws; a slowed, zoomed, photoreal replay of a V2 run is labelled V2 in the frame.

## N. The trusted-inventor threshold

Two different sentences, two different thresholds.

"I recommend building this to test it" requires: V5 (realisable, with the NOT MODELLED list shown), V3 (converged), no influential input below E2 (or its range covered by the margin and named), every envelope inside for the whole trajectory, the novelty test passed (PHYSICAL NOVELTY or KNOWN), a safety factor by the ganglia's principle (1.5–2 for known steady loads, more for impact and people), a sensitivity report with no cliff inside the inputs' ranges, and the sentence still says "in the model" and names what a first build should measure.

"I recommend using this" (a thing that bears load for people, moves near them, carries energy) requires V6: a built unit measured against the model's predictions, the measurements entered as world records, and agreement within the error contracts. The simulator cannot grant this and Ego cannot say it without a world record on the path.

Below both: Ego may say "consistent with the model; not recommended for building yet because …" and name the missing condition. That sentence is the normal outcome, and it is a useful one.

## O. The belief invalidation pipeline

When a defect is found and fixed (FC-1 as the example):
1. A defect node is created: realisation (closeMechanism), version range (all versions to date), what it touches (any run with a mechanism closed from a root), the obligation it broke (F-1.1.2), and the fix's version.
2. Every run record in the range whose configuration matches is marked AFFECTED.
3. Every belief observed-in or derived-from an affected run is INVALIDATED (a law violation, not a precision change); every belief derived from those is INVALIDATED transitively; every design and skill that cites them is flagged; every presentation that quotes them is flagged with the belief ids it quoted.
4. Reproducible runs are re-run on the fixed version; the new belief is a new node that supersedes the old with a diff: the old value, the new value, and the defect that explains the difference.
5. Ego reports the diff to the user for every design she made that changed: "the table I designed last week now shows X instead of Y; the cause was a defect in the mechanism closure."
6. Nothing is deleted. A superseded belief stays readable as history, marked.

What this needs that does not exist: run records (none are kept), belief ids (StandMemory stores factors), presentations carrying belief ids (reports store prose and a share code), version stamps in storage (none). Consequence for today's stores: selective invalidation is impossible, so the stand memory, the gait tables and the capability claim are discarded wholesale by a version bump, and the pipeline is built before Ego learns anything again.

## P. Remaining ways Ego could learn something false after the physics is repaired

1. Survivorship: Ego keeps what passed. A model that is over-conservative (the restitution floor killing bounce, a support split overloading a joint) produces false negatives, and Ego learns "that does not work" from a defect that made it fail. Negative beliefs need the same provenance as positive ones.
2. Knowledge outlives the model: browser storage persists across deployments with no version stamp; every stored belief must carry the versions in B, and a loader must quarantine anything whose versions are unknown.
3. The developer loop: test tolerances calibrated to current output; the law bound, measurement or error contract behind every threshold must be named in the test.
4. Me: the authored tables (ganglia rules of thumb, the frontier's figures, the 6 Hz servo floor, PUSH = 300 N) are my training-data recollections, some unsourced. I am a provenance class, and not a strong one; unsourced authored numbers are L3 until sourced.
5. Sentinel confusion: 0 meaning "estimate from stall torque" in the servo's rotor field. A missing value must be an explicit NONE with a class, never a magic number.
6. Horizon: "held for 3 s" stored without the duration becomes "holds"; creep, fatigue, thermal drift and battery sag all live beyond 3 s.
7. Scale: a margin learned per design kind ignores size; a factor learned on a 1.2 m table applied to a 3 m one is a different belief.
8. Seed: a result that depends on a random seed (a mind, a genesis community) stored as general.
9. Aggregation: averaging margins or factors across kinds, materials or loads erases the domain.
10. Sensors too good: once minds get sensors, a noise-free, lag-free sensor model teaches controllers that would fail on real sensors. Sensor models need noise and latency from their datasheets, with envelopes.
11. Ego's reasoning: a derived conclusion produced in prose, not recomputed by the law engine, is unaudited. Derived beliefs must be recomputable or marked HYPOTHESIS.
12. Overlays: force arrows scaled for visibility, time slowed, fields drawn with chosen contours; a presenter who learns magnitudes from her own overlays. Overlays carry their scale and the belief's level.
13. The user as teacher: "remember that steel floats" enters `vrsb.life`; the PERSONAL wall must be enforced, and user physical claims become ASSUMPTION nodes with the user as source.
14. Platform: a belief formed on CI (desktop, x86 double) may not reproduce on the headset (ARM, Jolt float32 paths); run records carry the platform, and a belief applies to the platform it was formed on until reproduced.
15. Third-party drift: a Jolt build change moves results; the Jolt version is part of the realisation version.
16. Partial revalidation: a belief re-run on part of its domain and marked VALID over all of it. Revalidation must cover the stored domain or shrink it.
17. Data drift: a catalogue record silently replaced by a different model number keeps its id; data nodes are hashed, and a belief is STALE when its data hash changes.
18. Presentations quoted back: a report Ego wrote, read later, treated as evidence. Reports cite belief ids; they are never sources.
19. Cross-headset inconsistency: knowledge is per device; two headsets hold different beliefs about the same design. Not false, but untraceable; run records and belief ids make it visible.
20. The best-case defect: a conclusion that happens to be true, learned from a false path (the aprons). It is the hardest to catch because nothing contradicts it; the only defence is provenance, which says it was learned from the stand and not from the world.

Development stays paused.
