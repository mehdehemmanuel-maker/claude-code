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

`axes(h, substrate, claim)` reads three coordinates of a hypothesis from three different places:

| axis | read from | moved by |
|---|---|---|
| human coverage | the substrate's own source confidence on the distinctions the hypothesis names (a coined one scores 0; a law's symbol is left out, it belongs to the theory axis) | renaming |
| physical support | the strongest evidence leaf on the structure (theorem or measured 1, calibrated 0.9, simulated 0.6, derived 0.4, estimated 0.3, hypothesized 0) | measuring |
| theory | a certificate on the claim it makes (compatible, incompatible, untested) | a law |

Tested: a measured Carnot-consistent efficiency on a bearing is `coverage 0.86, support 1, compatible: established`;
with every distinction renamed to a word no source has, it is `coverage 0, support 1, compatible: new but
consistent`, and nothing else moved. ∂Truth/∂Novelty = 0 is not a slogan here; it is the equality of two objects
with one field changed.

Qualified: "human coverage" cannot mean what all of humanity knows; no system can read that. It means what Ego's
own sources cover, which is the only coverage she can honestly report. The doc says so, and the number says what it
measures.

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

## 5. Three independent axes and their classes — built

The classes of the request fall out of the three coordinates, with the thresholds in the table above:

| theory | support | coverage | kind |
|---|---|---|---|
| compatible | ≥ 0.6 | ≥ 0.5 | established |
| compatible | any | < 0.5 | new but consistent |
| incompatible | < 0.6 | any | radical hypothesis |
| incompatible | ≥ 0.6 | any | high-value anomaly |
| untested | 0 | any | untested |
| otherwise | | | unsupported |

Tested: the same efficiency claim beyond Carnot's ceiling is a *radical hypothesis* when hypothesized and a
*high-value anomaly* when measured; a coined thing with nothing on it is *untested*, never false.

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

`certificate(claim)` returns `impossible: true` only when a law of the book bounds the claimed quantity (said by the
output's name, "most …" or "least …", or by ≤ / ≥ in the formula), every input it needs is given, the law holds at
those inputs, and the claim lies beyond the bound. Otherwise it returns the precise weaker mode: `unknown` when no
law bounds the quantity, `outside-domain` when the law does not hold there, `undefined` when the unit cannot be
read. Tested:

| claim | verdict |
|---|---|
| efficiency 0.5 between 300 K and 400 K | impossible-under: Carnot gives at most 0.25 |
| efficiency 0.2 between 300 K and 400 K | true: the ceiling is 0.25 |
| efficiency 0.2 between 400 K (cold) and 300 K (hot) | outside-domain: no work flows from cold to hot |
| 0 J per bit erased at 300 K | impossible-under: Landauer gives at least 2.871e-21 J |
| 1000 N of tractive force at μ 0.8 on 600 N | impossible-under: the limit is 480 N |
| 1 MJ of kinetic energy | unknown: no law of mine bounds it |
| efficiency 0.5 in furlongs | undefined |

And across the whole book: each of the ten bound laws (Carnot, Landauer, Shannon sampling, traction limit, cornering
limit, Coulomb friction, least shaft diameter, least separation work, diffraction limit, Rayleigh resolution) admits
a claim at its example and certifies one ten per cent beyond it; none of the other 132 laws ever signs a
certificate. A law is a bound by its output's name (most, least, smallest) or by a formula that opens with the
output and ≤ or ≥; a ≤ deeper in a formula is a cap on an input and signs nothing.

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

## What this gives Ego

- She can say *impossible* only when she can show the law, the bound and the assumptions; otherwise she says exactly
  how she does not know (unknown, outside-domain, unmeasured, unobserved, unmodelled).
- A name no source has given changes one number, coverage, and nothing she concludes.
- An observation that breaks a prediction is kept with everything needed to re-examine it, and the ordinary
  explanations are computed before a new law is contemplated.

Not built, and said so: a priority over anomalies, anomaly clusters, a reading of what humanity as a whole knows.
