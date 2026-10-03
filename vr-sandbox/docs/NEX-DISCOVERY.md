# Nex and discovery: evidence, not scripture

An audit of the request that Ego must never confuse the absence of human knowledge with the absence of reality. Each
point of the request is taken in turn with one of three verdicts: **exists** (Nex already did it, with the test that
shows it), **built** (built today, with the test), or **qualified** (kept in part, with what was changed and why).
Nothing was added because it sounded right; everything built here is an operation with an input, an output and a
test, in `src/ganglia/native/discovery.ts` and `tests/unit/native.test.ts` ("Discovery").

## 1. Absence of human knowledge is not absence of reality — exists

A human label never enters a hash. The hard test (section Y.1 of docs/EGO-NATIVE-LANGUAGE.md) renames every
distinction in a world and every inference, comparison and fingerprint comes out the same. So a thing no human has
named is, to Nex, a thing: it has exactly the structure its relations give it, and nothing about it is weaker for
being unnamed.

## 2. Human knowledge enters as evidence, never as authority — exists

Every source enters as an evidence leaf `E` with a kind (theorem, derived, measured, calibrated, simulated,
estimated, extrapolated, hypothesized, assumed, fictional), ranked, and a translation may lower the rank and never
raise it. A textbook's claim is `E(…){how:derived src:[the book]}`; it sits on the same axis as a measurement and
below it. The Nexus tiers (docs/NEXUS.md §F) place each kind. There is no node for "accepted".

## 3. The first law: novelty has zero truth value — built

A claim's human coverage is one coordinate of its epistemic vector (part 2 below), read from the substrate's own
source confidence on the things the claim names (a coined name scores 0; a law's symbol is left out, it belongs to
the theory relation). It enters no physical label: `labelOf` renders it beside the physical label as a novelty
("unseen by sources", "partly covered", "covered"), never under it.

Tested: a measured, Carnot-bounded efficiency on a bearing and the same claim with every distinction renamed to a
word no source has give two vectors equal in every coordinate but coverage (0.86 against 0), and the same physical
label. ∂Truth/∂Novelty = 0 is the equality of two objects with one field changed, and the proof that the field is
read nowhere else.

Qualified: "human coverage" cannot mean what all of humanity knows; no system can read that. It means what Ego's
own sources cover, which is the only coverage she can honestly report, and the number says what it measures.

## 4. The second law: unknown is not false — exists, qualified

Nex has, as modes that hash and render apart: `unknown` (no term either way), `unobserved` (no evidence leaf reaches
it, though one could), `unmodelled` (no structure for it yet), `unmeasured` (an instrument is known, not yet used),
`insufficient` (evidence below the threshold asked), `outside-domain`, `impossible-under`, `undefined`,
`contradictory`, `true`, `false`. Tested today: nine of these on one structure give nine hashes, and `contradiction()`
of a truth with each of them is null for all but `false`. Unknown, unobserved and unmodelled never fight a truth.

Qualified: the request lists six states on one axis (unknown, unproven, unpublished, unobserved, unmodelled, not
understood). Nex keeps four of them as modes and puts two on other axes, because that is where they are
mathematically: *unproven* is an evidence rank (hypothesized or derived, not theorem), and *unpublished* is human
coverage, not truth. A thing can be unpublished and measured, or published and false. Collapsing those onto the mode
axis would be the confusion the request warns against, from the other side.

## 5. Three independent axes and their classes — built, then rebuilt (part 2)

The first build read three numbers and cut them at 0.5 and 0.6. The second audit showed what that collapsed (part
2), and the classes are now renderings of the epistemic vector by structural conditions only:

| condition | physical label |
|---|---|
| measurements both for and against | contested |
| contradicted by a law; replicated (two or more independent empirical sources) | replicated anomaly |
| contradicted by a law; measured once | anomaly, measured once |
| contradicted by a law; only in simulation or a fitted model | anomaly in simulation / in a fitted model |
| contradicted by a law; unmeasured | radical hypothesis |
| entailed or bounded by a law; replicated | established |
| entailed or bounded by a law; measured once, in simulation, by theorem… | consistent, with how |
| outside the laws' domain | outside the laws' domain, with how measured |
| credits a mechanism the book lacks | needs a mechanism the book lacks |
| no law reaches it, or its inputs are missing | untested / measured once, untested by any law / replicated, untested by any law |

"Replicated" is two or more independent empirical sources: the definition of a replication, not a threshold. No
decimal anywhere decides a label.

Qualified: "investigate aggressively" is a policy, not an operation. What Nex gives the policy is the list of what
would settle each ordinary explanation (point 9), so the investigation has concrete next measurements. A priority
between anomalies by expected value is not built; it would need a cost model that does not exist, and invented
numbers are not allowed.

## 6. No consensus firewall: say what exactly conflicts — built in part

Nex has no consensus to conflict with: a source is a leaf, not a wall. What a conflict can be is decided by
`certificate()`: a **mathematical** conflict is a bounding law evaluated inside its domain with the claim beyond the
bound; a **model-dependent** one is the law outside its domain at those inputs (`outside-domain`, not false); an
**empirical** one is an observation against a prediction beyond tolerance (point 10, an anomaly, held alive); and
**none** is `unknown`. A conflict with a social or historical consensus has no representation and will not get one.

## 7. An impossibility stored with its assumptions, law and derivation — built

A certificate carries the law, the bound evaluated at the claim's inputs, the sense (most or least), the
assumptions (the law's validity and every input it was given), and the derivation in words. Its structure is
`contradict(claim, bound){mode:impossible-under under:[assumptions…] mech:law}`, so a later reader finds the
assumptions under the verdict, not behind it. In Nex:

```
contradict(quantity(eta, 0.5[-]){ev:{how:hypothesized}}, quantity(eta, 0.25[-]){mech:carnot ev:{how:derived src:["Çengel & Boles …"]} mode:true})
  {mech:carnot ev:{how:derived …} mode:impossible-under under:["Carnot efficiency holds: Reversible limit; real engines reach about half to three quarters of it." "cold side = 300" "hot side = 400"]}
```

## 8. Impossibility requires a certificate — built

`certificate(claim)` returns `impossible: true` only when a law of the book reaches the claimed quantity (the
output's dimension is the claim's and its name, its bound word dropped, is the claim's quantity or ends with it:
"rotational kinetic energy" reaches a claim about kinetic energy, "energy" does not), every input it needs is given,
the law holds at those inputs, and the claim lies beyond what the law gives: beyond the bound of a bound law, or
beyond the value of an equality law by more than the stated uncertainty (the claim's own, else the law's example
tolerance, else the claim taken at its word, the same 1e-9 the book holds its own examples to). The comparison is
made in SI and said in the law's unit. Otherwise it returns the precise weaker mode: `unknown` when no law reaches
the quantity or the inputs a law needs are missing, `outside-domain` when the law does not hold there, `undefined`
when the unit cannot be read. Tested:

| claim | verdict |
|---|---|
| efficiency 0.5 between 300 K and 400 K | impossible-under: Carnot gives at most 0.25 |
| efficiency 0.2 between 300 K and 400 K | true: the ceiling is 0.25 |
| efficiency 0.2 between 400 K (cold) and 300 K (hot) | outside-domain: no work flows from cold to hot |
| 0 J per bit erased at 300 K | impossible-under: Landauer gives at least 2.871e-21 J |
| 1000 N of tractive force at μ 0.8 on 600 N | impossible-under: the limit is 480 N |
| 1 MJ of kinetic energy at 1 kg and 1 m/s | impossible-under: the kinetic energy law gives 0.5 J, the claim taken at its word |
| 300 J of kinetic energy at 120 kg and 2.2 m/s, stated at 5 % | true: 290.4 J, within the claim's uncertainty |
| the same at 1 % | impossible-under: beyond the claim's stated uncertainty |
| kinetic energy with the mass given and no speed | unknown: the law needs speed (v) |
| a harvest mass in kg | unknown: no law of mine computes or bounds it |
| efficiency 0.5 in furlongs | undefined |

And across the whole book: each of the ten bound laws (Carnot, Landauer, Shannon sampling, traction limit, cornering
limit, Coulomb friction, least shaft diameter, least separation work, diffraction limit, Rayleigh resolution) admits
a claim at its example and certifies one ten per cent beyond it; every equality law whose example is inside its
domain (over a hundred) entails its example and contradicts ten times it; a law whose inputs are missing signs
nothing. A law is a bound by its output's name (most, least, smallest) or by a formula that opens with the output
and ≤ or ≥; a ≤ deeper in a formula is a cap on an input and signs nothing. This sweep found the diffraction limit's
own worked example outside the law's domain (a 1 m wave through a 5 cm hole, 24.4 rad, "wider than the whole sky");
the example is now the eye's (green light through a 5 mm pupil, 1.342e-4 rad) and the book checks every example
against its law's domain.

## 9. Skepticism attacks the hypothesis, never defends orthodoxy — built

`skeptic(observation, prediction)` lists the ordinary explanations first and computes the ones it can:

- **within uncertainty**: the difference over the declared tolerance (computed; closes the anomaly at or below 1);
- **parameter**: for each input of each law in the prediction's ancestry, the value that would close the gap, found
  along the family the law generates (docs/NEX-SPACE.md) from its worked example, and whether that value stays inside
  the law's domain (computed; for a scale observation, also the exponent that would make it exact);
- **model envelope**: the law's stated validity, to check the observation's inputs against (held, with what settles it);
- **numerical artifact**, **hidden variable**, **sensor defect**, **selection bias**, **wrong causal direction**,
  **bad assumption**, **conventional theory**: held as candidates with the measurement that would settle each.

Tested on a synthetic anomaly (twice the rating life the law predicts, at 5 %): the difference is 20 times the
tolerance; the gap closes if the equivalent load were 0.794 N instead of 1 N, inside the law's range; eight
candidates are held uncomputed, each with what settles it.

## 10. Anomalies are preserved — built

`anomaly(id, observation, prediction)` keeps: the observed value, its tolerance, instrument and environment; the
predicted value, its law ancestry and model version; the difference and its ratio to the tolerance; the replication
history; the candidates; a status (`alive`, `explained`, `within tolerance`), and the explanation when there is one.
Its structure is `contradict(E(observed), predicted){mode:contradictory margin:σ under:[model …, explained: …]}` or,
within tolerance, `support(…)`. An explained anomaly is kept, with its explanation under it, never erased.

`anomalies()` reads the engine's own register (src/ganglia/scale/observations.ts) this way. Today, measured:

| entries | alive | explained | within tolerance |
|---|---|---|---|
| 11 | 0 | 1 | 10 |

The explained one is the cooling time of a steel cube at twice the size, measured against Froude's √λ: 54 times
the tolerance away, with the explanation the register gives (the thermal world is not Froude-similar; free
convection plus radiation, integrated, gives 2.18 for a time, and the engine reproduces it) and a computed candidate
(the exponent that would make Froude exact is 1.125, not 0.5). The register holds no live anomaly; that is said,
not hidden.

## 11. Anomaly clusters — not built

The request was cut off at "anomaly clusters may be". `cluster()` in the kernel groups fingerprints by structural
distance and could group anomaly structures the same way, but nothing was built from a sentence that was not
finished.

## Ego's questions on this layer

- "is an efficiency of 0.5 possible with a cold side of 300 K and a hot side of 400 K": "No, not under those
  assumptions: Carnot efficiency (η = 1 − T_c / T_h) at these inputs gives at most 0.25; the claim is 0.5; so
  assumptions + law + claim ⇒ ⊥. Assumptions: Carnot efficiency holds: …; cold side = 300; hot side = 400. Drop one
  and it is unknown again, not impossible. In Nex: contradict(…){mode:impossible-under under:[…]}". With 0.2: "Yes,
  within the law: the ceiling is 0.25". With the temperatures reversed: "the law does not hold there, so I cannot say
  impossible: outside its domain". With the speed missing from a kinetic energy: "needs speed (v); no certificate, so
  not impossible: unknown". With no law at all: "No law of mine computes or bounds harvest mass in kg, so I cannot
  call it impossible: unknown." The givens are read by the law's own input names, in the unit said and carried into
  the law's (27 °C and 127 °C give a ceiling of 0.2499; a mass in seconds is refused by dimension).
- "what anomalies do you hold": the register by status, the explained one kept with its explanation and the
  skeptic's computed candidate, and whether any two share a law ancestry.
- "how do you know that the current causes the voltage": the epistemic vector of what stands behind the influence.
  For a law: "formal derived; empirical 0 for, 0 against; simulation 0; calibration 0; theory entailed (domain
  inside); coverage 0.85; uncertainty unstated; discrepancy none; consistent: entailed by a law, by derivation; partly
  covered by sources. The law behind it: Ohm's law (V = I R), Young & Freedman…; the sign and size taken at its worked
  example, not measured in my world." For an arrow of hers: the same vector within everything said of its two ends,
  "theory untested" where no law stands behind it, and the source named. A chain gives each link and says its
  certainty is within the Fréchet bounds of the links.

## What this gives Ego

- She can say *impossible* only when she can show the law, the bound and the assumptions; otherwise she says exactly
  how she does not know (unknown, outside-domain, unmeasured, unobserved, unmodelled).
- A name no source has given changes one number, coverage, and nothing she concludes.
- An observation that breaks a prediction is kept with everything needed to re-examine it, and the ordinary
  explanations are computed before a new law is contemplated.

Not built, and said so: a priority over anomalies, anomaly clusters, a reading of what humanity as a whole knows.

---

# Part 2: the second audit, before the classes hardened

The second audit's concern: the first build collapsed multidimensional epistemic structure into scalars and
compound labels. Each point was first shown against the code as it stood (a probe on 3 October, values below),
then changed only where the probe showed the collapse, with the test that tells the two designs apart. The
principles of part 1 (untested is not false; absence of sources does not weaken physical structure; impossibility
needs a certificate; outside-domain is not false; anomalies are preserved; explanation does not erase them) are
unchanged and still tested.

| # | the collapse, as the probe showed it | the change | the distinguishing test |
|---|---|---|---|
| 1 | one measured leaf for and one against: support 1, "established" | `evidenceOf(claim, corpus)` keeps a supporting and a contradicting ancestry; `contradict(a, b)` with the claim on one side puts the other side's leaves against it; replication counts independent sources, one source twice is one | two sources for and one against render "contested: measurements both ways (2 for, 1 against)"; without the contradiction, "established: bounded by a law, replicated"; one bench twice, "measured once" |
| 2 | theorem 1, measured 1: one ladder | evidence species: formal (theorem, derived), empirical (measured), simulation, calibration (calibrated, estimated, extrapolated), none; the vector holds each apart | a theorem, a measurement and a simulation of the same claim give three vectors and three labels ("by theorem", "measured once", "in simulation") |
| 3 | a simulation crossed 0.6: "established"; an estimate at 0.3: "unsupported"; coverage at 0.49 or 0.51 flipped the label | no thresholds; labels by structural conditions (section 5): replicated, contradicted, in domain | a simulation is never "established"; the label of a claim does not change with coverage at any value |
| 4 | renaming turned "established" into "new but consistent" | coverage is a coordinate rendered as novelty beside the physical label and read nowhere else | rename: vectors equal but coverage; physical labels equal; novelty "unseen by sources" |
| 5 | a measured thrust crediting mechanism X: one number, 1, for the sentence | `factor(claim)`: the device exists, the thrust is 4 N, X causes the thrust; the measurement reaches the first two, the mechanism gets only evidence placed on it | the mechanism's support is empty until a derivation about X is in the corpus; the claim as a whole "requires extension" |
| 6 | 290.4 J and 500 J of kinetic energy both "unknown"; a satisfied bound said "true" | typed relations: entailed, bounded, contradicted, outside-domain, untested, unrelated, requires-extension, undefined | each relation on its own claim, including a stated uncertainty that decides entailed (5 %) against contradicted (1 %) |
| 7 | one final class | the epistemic vector: formal, empirical {replication, against}, simulation, calibration, theory, domain, coverage, uncertainty, discrepancy; `labelOf` is the only place a label is made | the label is a pure function of the vector; `sayEpistemic` renders every coordinate |
| 8 | two components at 0.8 of tolerance each: both "within tolerance" | `residual(components)`: one component as before; several with independent tolerances by the root of the summed squares (a Mahalanobis distance with a diagonal covariance); the anomaly holds the residual | two components at 0.8 are one anomaly at 1.13; a count mismatch throws |
| 9 | (not built) | `clusterAnomalies`: shared law ancestry, with the parameter that closes every member and its direction; nothing from the look of the structures | two rating-life anomalies of different magnitude and instrument cluster, with C up, P down, p up closing both; a Carnot anomaly stands alone |
| 10 | a fixed checklist | candidates from the law's own graph first (its inputs along their families, its constants by their slope, its domain, its ancestry, an ancestor that is no law named as such), marked `graph` and computed; the checklist kept and marked `checklist` | a pendulum period 10 % long: length 1.2 m (inside its range) and g 8.16 m/s² (not free) as graph candidates; seven checklist candidates marked |
| 11 | — | unchanged | unchanged tests of part 1 |

What was not built, and why: PERMITTED as a relation apart from BOUNDED (no test needed it: a satisfied bound is
the only "permitted" the book can show); correlated, temporal and structural residuals (the residual type names
them as absent; a covariance or a structure would go there when a measurement brings one); regime, time
correlation and latent cause as cluster signals; a scored prelinguistic benchmark.

Bugs the tests found on the way, each fixed with its test: the law-reach rule let a law that computes "energy"
reach a claim about kinetic energy (now the output's name must be the claim's quantity or end with it); the
certificate compared a claim read into SI against a law value in the law's own unit (wrong for every output unit
with a scale: rating life in revolutions, say); the families of docs/NEX-SPACE.md evaluated a law without its
constants, so every law with a g, a k or a σ had no family (now evaluated with them); the diffraction limit's
worked example lay outside its own domain.
