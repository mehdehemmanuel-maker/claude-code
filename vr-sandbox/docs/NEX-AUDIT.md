# Ten questions put to Nex

Ten questions from an outside audit, each answered from the code and its tests, with what holds, what does not, and
what was changed because of the question. Evidence is a file and a test name; where there is none, the answer says
"not built".

## 1. Are the two primitives really enough?

The design (docs/EGO-NATIVE-LANGUAGE.md section B) names two primitives, distinction `D` and relation `R` with a
coordinate schema, and four faces of R: `Q` (a number with a dimension), `T` (a transformation), `E` (an evidence
leaf with a source), `C` (a context with a holder), plus `M` (an abbreviation). In code these are seven node kinds,
because each face carries fields R does not (a value and a dimension, a from and a to, a source, a holder). So the
honest statement is: two generators, seven kinds, no eighth yet demanded by a test. What has been said in them:
142 laws, the law tree, 13,785 structures of the substrate, the challenge engine both ways, the discovery
epistemology (docs/NEX-DISCOVERY.md). Where a test found something unsayable (holding a bit against switching one,
question 5) the fix was a coordinate, not a primitive. Not proven enough; nothing has failed yet. Known absences: no
quantifier (a universal is `invariant` with a `dom`; an existence is an evidence leaf), no collection beyond `state`.

## 2. Is "relation with coordinates" becoming an everything-bucket?

By construction R is the only relational node, with 16 operators. What keeps it from being a bucket is that nothing
in it is free text with free meaning: the operator and every coordinate enter the hash (`hash`, `normalize`), an
absent coordinate means not modelled and never a default, `wellFormed` rejects a comparison across dimensions or a
motion without a frame, `distance` weighs tokens by rarity so a shared `dir:1` counts for nothing and a shared
mechanism counts for much, and `grow` finds recurring shapes and promotes them (8 morphemes, the corpus 17 % shorter):
a bucket has no recurring shape to find. The corners that are a bucket, honestly: `mech` is a string (a hash or a
law id), and `under` / `against` carry strings a reader must parse. Those are the places where meaning can hide
from the hash, and the next structural work is there.

## 3. Is `influence` over-compressing cause, enable, prevent, require?

They are four cells of its coordinates, not four words lost: cause is `polarity:+ necessity:sufficient`, prevent is
`polarity:- necessity:sufficient`, enable is `polarity:+ necessity:necessary`, and require is enable read from the
other end (B requires A is A enables B; `dir` says which way it was said). A condition is in `dom`; a counterfactual
is the same relation in an `intervene` context; a mechanism in `mech`. Tested: Ohm's law gives three readings
(forward, inverse, implicit) and prevent looks for the opposite sign ("cause" in tests/unit/substrate.test.ts).
What was under-used, not over-compressed: the traversal that answered "what causes X" set sign and elasticity from
the law and wrote `necessity:contributing` for everything, so Ego said *raises* and never *is needed for*. Fixed the
same day: necessity is now read off the law itself (the only input of a law is enough, with its constants; an input
whose absence zeroes the output is needed; a divisor or a term of a sum contributes), so "does the current cause the
voltage" answers "Electric current is needed for (raises) voltage … and without it there is none", and "does the
resistance cause the current" stays "contributes to (lowers)". The same pass found that every law with a constant
(g, k, σ) was silently dropped from cause answers, its evaluation without the constant being NaN, and that a thing
which is an input of its law was listed as its own cause ("current raises it"); both fixed with tests.

## 4. Is "the weaker rank wins" mathematically valid?

Two different compositions were hiding under that phrase, and the question found a bug in one of them.

- Evidence kind along a chain: a conclusion reached through two links is known no better than the weaker link, so
  the composed kind is the lower rank. Ranks are ordinal, and min is the only composition an ordinal scale admits,
  so this is valid as an upper bound on how well the chain is known. It is not an aggregation rule: two independent
  measurements of one claim do not make a theorem, and Nex has no rule for adding independent supports of the same
  claim (`support` exists as an operator; a combinator does not). Not built, and said.
- Certainty interval along a chain: both links holding is a conjunction, and `chain` composed the interval as
  `[min(lo₁, lo₂), min(hi₁, hi₂)]`. The upper end is right; the lower end was too optimistic. Without knowing the
  dependence between the links, the certainty of both lies within the Fréchet bounds, `max(0, lo₁ + lo₂ − 1)` to
  `min(hi₁, hi₂)` (Fréchet 1935; Hoeffding 1940). Fixed today in `chain`, with the test changed to the bounds:
  links at [0.9, 1] and [0.7, 0.9] compose to [0.6, 0.9], and a third at [0.6, 0.8] to [0.2, 0.8]. Strengths still
  multiply, which is right for elasticities along a chain.

## 5. Does the hold / switch failure mean Nex lacks a native state-transition structure?

No: `T(from, to | cond){…}` is a primitive face. The failure was in the bridge from the challenge engine, which
rendered "hold one bit" and "let one bit switch another" both as `signal → signal`. The fix was to say what kind of
need each is (`Need.as`): a store is an `invariant` over time, a sense is a `morphism`, an act or a conversion is a
`T`. Tested ("challenge both ways" in tests/unit/native.test.ts). What T still lacks: named states with guards as a
machine; today a sequence is T's chained by `mech`, and a bundle of relations is a `state`. Not yet demanded by a
test.

## 6. Does the heat / thermal-energy mistake mean store, flow and rate need deeper mathematics?

The mistake on record (section Y.12) was "compare heat and temperature" answered about a temperature sensor: a word
resolved to the wrong thing. Dimensions fixed it: a heat is J, a temperature is K, and a comparison across them is
`undefined`. Store, flow and rate are carried the same way: a store has the stock's dimension (J), its flow has the
stock over time (W), and `FLOW_DIMS` / `flowsCarrying` say which kinds of flow carry which dimension. What is not
built is an explicit derivative or integral operator relating a store to its rate; the relation lives in the
dimensions and, where a law gives the coordinate, in `family.sensitivity` (docs/NEX-SPACE.md). A d/dt operator with
no law under it was rejected there as decoration, and nothing since has demanded it.

## 7. Should there be a generator abstraction for implicit families instead of manifold language?

Yes, and that is what was built: `family(law, sym, held)` returns a generator with `at`, `value`, `admissible`,
`edge` and `sensitivity`, lazy, nothing stored, the law's domain as the admissible set. docs/NEX-SPACE.md rejects the
manifold vocabulary (metrics, geodesics, charts) wherever no law gives a coordinate, and keeps the generator. Measured:
the edge of the rating-life law in the load found in 24 evaluations; of the traction limit in friction in 23.

## 8. Can Nex form concepts before labels?

Three tests say yes within their scope: the hard test (every label renamed, every inference the same); clustering by
structure with rarity weights, which puts a spring and a capacitor together across domains with no shared word
(section R); and law forms, which find that five energies (spring, kinetic, rotational, capacitor, inductor) are one
form `J:1,2` with every symbol gone (72 forms over 101 laws, 15 shared, once the forms were taken with the laws' constants merged; 58 over 84 before that fix). A scored prelinguistic benchmark with many
concepts and a pass rate is not built; these three are its first items.

## 9. Can it discover continuous, discrete or hybrid structure instead of assuming one?

`regimes(samples)` fits one, two or three power-law regimes and chooses by description length (BIC). Measured: three
human labels on rating-life samples come out as one continuum (exponent −3.00) and the labels are reported as cuts
on it; the pipe friction factor, one smooth-looking curve, comes out as two regimes (−1, −0.25) with the boundary at
2442 against a true 2300; pure noise buys no boundary; ten per cent noise changes no verdict. The hybrid case is the
two-regime verdict with its boundary. What it cannot yet do: more than two boundaries, or a non-power shape.

## 10. Can different tuners preserve the same meaning?

The compact text round-trips hash-equal over 957 structures; the spoken forms in English and Spanish are lossless by
construction and tested both ways; the English prose renderer loses and counts what it loses (`rankOfText`,
translation loss), which is the honest form of a lossy tuner. Cross-tuner commutativity is tested for the two spoken
languages. "Sensory tuners" do not exist as such: the only sense Ego has is the physics engine, whose measurements
enter as evidence leaves (the scale register, now read as anomalies in docs/NEX-DISCOVERY.md). A second sense would
be a second instrument on the same structures, and the test would be the same: hash-equal after both.
