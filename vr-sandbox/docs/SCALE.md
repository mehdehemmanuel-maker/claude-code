# Scale relativity: one world, many descriptions

`src/ganglia/scale/` makes scale a transformation of the existing architecture, not a category and not a parallel
world. It acts on quantities (by their dimensions), on laws (the law book is classified by running each law's own
example), on manifolds (parameters scaled by their own exponents), on the substrate (an axis with transformations,
observers, groups, cross-scale structures and a hypothesis as entities), on observers (observation as a projection)
and on Ego (she answers scale questions with derived numbers). The proposition that reality is structurally
equivalent across all scales is held as a **hypothesis**, with what agrees and what conflicts derived at call time.

## 1. The model

REALITY = SPACETIME + STATE + DYNAMICS + SCALE + OBSERVATION. A system is a set of quantities with dimensions
`[mass, length, time, current, temperature]` (as `ganglia/units` keeps them), characteristic lengths and times
(`L_c`, `T_c` parameters on substrate entities), and an observer that projects it.

## 2. Scale transformation

`ScaleTransform { exponents: Dim, holds: ('material'|'environment'|'universe')[], preserves, derivation, regime, status }`.
A quantity of dimension d scales as λ^(d·exponents) unless the regime holds it: a density, a viscosity, a modulus, a
conductivity are properties of the material; a surroundings temperature or a heat transfer coefficient of the
environment; a law's constants always. **Nothing is assumed to scale alike**: `scaleSystem` reports each quantity's
exponent and whether it was held.

The similarities, each derived from what it holds (`transform.ts`):

| id | exponents [M, L, T] | derived from | status |
|---|---|---|---|
| geometric | [0, 1, 0] | lengths only: an idealisation | model |
| same-material | [3, 1, 0] | ρ fixed ⇒ M ∝ λ³; clock unscaled ⇒ gravity laws break (square-cube) | theorem |
| froude | [3, 1, ½] | g = L T⁻² fixed ⇒ T ∝ √λ; V ∝ √λ, F ∝ λ³, σ ∝ λ; Re not preserved | theorem |
| reynolds (diffusive) | [3, 1, 2] | ν, α, D fixed ⇒ T ∝ λ²; V ∝ 1/λ; gravity not preserved | theorem |
| cauchy (elastic) | [3, 1, 1] | E, ρ fixed ⇒ c fixed ⇒ T ∝ λ; f ∝ 1/λ, σ ∝ λ⁰; g ∝ 1/λ (the centrifuge) | theorem |
| thermal | [3, 1, 2, 0, −2] | α fixed ⇒ T ∝ λ²; c_p fixed ⇒ Θ ∝ λ⁻²; k then consistent; σT⁴ not | theorem |
| rayleigh | [3, 1, 2, 0, −3] | ν, α fixed ⇒ T ∝ λ²; g held; Ra, Gr preserved ⇒ Θ ∝ λ⁻³; β, c_p, k then held: flow similar, storage and conduction not | theorem |
| electrical | [3, 1, 4/3, 1, 0] | ρ_e and the cell voltage fixed ⇒ I ∝ λ, R ∝ 1/λ, P ∝ λ; μ₀ then scales as λ^(−2/3): magnetism not similar | theorem |
| allometric | [3, 1, ¾] | P ∝ M^¾ measured (Kleiber); WBE a model | empirical-law |
| natural | [−1, 1, 1] | c and ħ fixed; G then scales as λ²: only λ = 1 keeps all three | theorem |

`absoluteScale(constants)` solves the exponent system: three independent dimensional constants (c, ħ, G) admit no
transformation but the identity; `planckUnits()` derives 1.616e-35 m, 5.39e-44 s, 2.18e-8 kg.

## 3. Scale manifold

A manifold of the engineering language may carry `characteristic { length, time, energy, frequency,
informationRate, propagationTime, groups, regimes }`. `scaleManifold(id, transform, λ)` scales each parameter by its
own dimension, classifies the laws the manifold cites, and says where the member stops being the same member: the
helical spring breaks under Froude (its rate needs Cauchy), thermal stores break where heat capacity is held, the
flywheel's specific energy is invariant everywhere.

## 4. Invariants: dimensionless groups

`groups.ts` holds 21 groups (Re, Fr, Ma, St, We, Bo, Bi, Fo, Pr, Pe, Sc, Nu, Kn, Ca, De, He, Da, Ro, Rm, Ra, Gr), each a product
of powers of quantities with a meaning and regime boundaries. `groupUnder(group, transform)` sums the exponents:
invariant iff zero. **Derived, never declared**: Re goes as λ^1.5 under Froude with the same fluid; Fr as λ⁻³ under
Reynolds; no transform keeps both. With nothing held, every group is invariant (Buckingham).

| group | same-material | froude | reynolds | cauchy |
|---|---|---|---|---|
| Re | λ² | λ^1.5 | 1 | λ |
| Fr | λ | 1 | λ⁻³ | λ⁻¹ |
| Ma | λ | λ^0.5 | λ⁻¹ | 1 |
| Bo | λ² | λ² | λ² | λ² (surface tension held: the capillary length does not scale) |
| Bi, Nu | λ | λ | λ | λ |
| St, Pr, Sc, Kn, De, He, Da, Ro | 1 | 1 | 1 | 1 |

## 5. Scale covariance of the law book

`classify(law, transform, λ)`: the law's worked example is scaled (inputs by dimension unless held, constants never),
the law run, the output compared with what its dimension says. Verdicts: invariant, covariant, approximately
invariant, scale-dependent (with the constant or the held input that sets the scale), broken outside regime (the
scaled inputs leave where the law holds), unknown. Every verdict keeps the transformation that explains it.

At λ = 10 over the 106 executable laws:

| similarity | invariant | covariant | scale-dependent | broken outside regime |
|---|---|---|---|---|
| geometric | 25 | 70 | 9 | 2 |
| same-material | 24 | 49 | 31 | 2 |
| froude | 19 | 61 | 24 | 2 |
| reynolds | 30 | 45 | 29 | 2 |
| cauchy | 30 | 57 | 17 | 2 |
| allometric | 19 | 53 | 32 | 2 |
| natural | 21 | 71 | 11 | 3 |

Derived verdicts worth reading: the pendulum's period is scale-dependent with an unscaled clock (×√10 at λ = 10:
Galileo) and covariant under Froude; weight outgrows strength under same-material (the square-cube law as a ratio of
λ³ to λ⁴); the flywheel's specific energy is invariant under every similarity (σ/ρ held: size does not enter); the
Stefan-Boltzmann σ, μ₀, ε₀, k_B and g set scales; electrical laws are scale-dependent under the mechanical
similarities because current is left unscaled by them (true: electrical similarity is its own transformation).

## 6. Cross-scale dynamics

`crossscale.ts`: `CrossScale { levels (micro, meso, macro with variables and characteristic scales), up (interaction →
transition → collective → emergent variable, each with what it carries and by which law), down (constraint → allowed
microconfigurations → micro dynamics → realisation), disappears, appears, invariant, breaks, status }`. Seven are
written: a **neural network** (a synapse weights, a neuron thresholds, a layer codes, layers compose a function no unit
holds: Hebb, Hodgkin-Huxley, universal approximation), a **river basin** (raindrops to Horton's ratios, an empirical
law with optimal channel networks as its model), **muscle** (myosin heads → sarcomeres → a muscle on a lever: Hill's curve emerging, 300 kPa invariant from a
mouse to a whale), a **gear train** (Hertzian tooth contact → a mesh → a ratio and an efficiency), an **ecosystem** (an organism → a population and its interactions → a food web: a tenth of the energy kept at each eating, selection by the web itself; a model), a **market** (a transaction → supply and demand → an economy: a price as the number nobody set, carrying what no participant knows whole; a model, and it says where it breaks: lemons, monopoly, bubbles, herding), **heat** (molecular energy states → collisions → the Maxwell-Boltzmann distribution → temperature → heat flux →
the temperature field; never a static object: STATE + GRADIENT + TRANSPORT + INTERACTION), the **rigid body** (atoms →
elastic continuum → rigidity, valid while L/(c Δt) is small: the engine's own model as a projection), and **electric
current** (electrons → drift → conductivity → resistance). `askOf(c, scale)` answers the core questions: valid at, what
variables, what disappears and appears going up, what carries, what transformation, where it breaks.

## 7. Observer

`Observer { spatialResolution, temporalResolution, samplingRate, mode (samples | integrates), latency,
processingTime, dynamicRange, memory, model }`. Seven observers with sources: a person, a hand, a fly, a bat, a
neuron, the headset, the physics step (TICK from `physics/world`). `project(process, observer, scale?)` gives temporal
(instantaneous, resolved, aliased, static) and spatial (invisible, resolved) with the ratios and whether the picture
lags. A fly's wingbeat: fused by a person, resolved by a bat, aliased by the physics step (a sampler at 90 Hz sees a
false slow beat). A perceptual difference is never taken for a physical one.

## 8. Information propagation

`propagation(distance, mechanism, responseTime, observationTime)`: nine carriers with sources (light, a wire at 0.7 c,
sound in steel, water and air, myelinated and unmyelinated nerves, diffusion in water and air). The chain gives the
propagation time, He = propagation over response (lumped below 0.1, distributed above), and whether the observer
resolves the response. A carrier faster than light is refused unless the model is marked hypothetical. A 1 m steel
rod is lumped at the physics step (He 0.015); 100 m is distributed: the rigid body is the wrong description.

## 9. Recursive scale representation

Scale is an axis of the substrate, not a tree: `coarse-grains-to / refines-to` joins descriptions; `invariant-under /
preserves` joins laws and groups to transformations (658 derived links); `observed-by / observes` joins descriptions
to observers. Entities carry `L_c` and `T_c` as estimates across about 130 things from the proton to the planet's core.

## 10. Self-similarity search

`findScaleAnalogues(substrate, id, { minDecades })` compares relational signatures (functions, transformations, roles,
flows, feedback) and reports analogues at least that many decades away with what they share: ATP synthase at 10 nm
finds the electric motor at 10 cm; homeostasis finds the feedback controller and gene regulation. Looks never count.

## 11. Hypothesis status

`Epistemic = axiom | theorem | derivation | empirical-law | observation | model | hypothesis | conjecture`. `promote()`
allows only the transitions that make sense, needs evidence of the kind the status requires, and writes the history;
the original claim is untouched. `universalScaleStructuralEquivalence()` returns the claim with axioms, formulation
(LAW(S_λ X) = 0 for every law and regime; equivalent patterns at λL), predictions, compatible observations (99 of 106
laws covariant under some same-material similarity; 19 of 19 groups invariant under some similarity; model testing;
allometry; universality; the Kolmogorov cascade), conflicting observations (the Planck scale derived; atoms have a
size; 33 laws carry a constant that sets a scale; regime boundaries), falsification conditions (the strong form is
already falsified by c, ħ, G; the weak form stands as a theorem of dimensional analysis) and unresolved assumptions.

## 12 to 15. Integration

- Law engine: `classify` runs the laws as written; `scaleSetters` lists the constants that set scales.
- Manifold system: `scaleManifold`, `manifoldScaleTable`, the `characteristic` field.
- Substrate: `seeds/scale.ts`, three relations, three kinds, characteristic scales, derived links.
- Observer and simulation: the physics step is an observer; the rigid body is a cross-scale structure with its validity
  condition.
- Ego: "what changes if I make it ten times smaller", "is the pendulum period scale invariant", "how does a fly see a
  heartbeat", "scale analogues of ATP synthase", "is reality the same at every scale", "at what scale is Ohm's law
  valid", "how long does a signal take to cross a 10 m steel beam".
- Law tree: SC-1 to SC-5.

## How far a design scales (`scaleLimits`)

`scaleLimits(laws, transform)` sweeps λ from a thousandth to a thousand times, four points per decade, running each
law's example at every size, and reports the first λ going smaller and going bigger at which the law leaves its
regime (its `outside` speaks), or that the law does not follow the size at any λ (a mismatched power law, read at
λ = 2 where it cannot hide inside "approximately invariant"). Ego answers "at what scale would this design fail", "how
small can it still work", "how far can I scale it" for the last engineered member and its converters: the first law
to leave its regime each way, the ones that never follow, and the ones covariant throughout.

## A want at another scale (`redesign.ts`, law SC-6)

"Design it ten times smaller" is not a copy at a tenth. `scaleContract` scales each quantity of the contract and the
environment by its own exponent under the similarity (under Froude: energy stored λ⁴, power released λ^3.5, a mass limit
λ³, height and radius λ, a temperature window λ⁰ because it is the environment's), and `redesign` engineers the scaled
want again through the manifold language. The answer compares the winner before and after, the chosen member's mass
against λ³ (a stocked part does not shrink with the want), and the mechanisms lost or gained with the refusal that
says why. Ego: "design it ten times smaller", "engineer it at a hundredth the size", "redesign the same thing 3 times
bigger"; "build it" then places the re-engineered one.

## Experiments in the engine (`tests/conformance/scale.test.ts`)

The verdicts are predictions about the world; the world here is the engine, so they are measured in it.

- **Froude, pendulum.** A pendulum 4 times longer with a bob 4 times wider (same material: mass ×64) swings 2.000
  times slower in the engine; the covariant verdict predicts λ^½ = 2 from the output's dimension. The same-material
  verdict's ratio (√λ with an unscaled clock) is the same number read the other way.
- **Cauchy, spring-mass.** A steel cube of twice the side on a spring of twice the wire and coil (mass ×8, rate ×2)
  rings at 0.4985 of the frequency against the predicted λ⁻¹ = 0.5. The derivation says gravity must go as 1/λ under
  Cauchy: run at g/2 the sag scales with the length (×2.0); run at g the sag goes as λ² (×4.0), the static deflection
  not following the structure, which is the scale-dependent verdict on `spring.rate` under Froude made visible.
- **Finding, explained by the engine's own model.** The engine's coil spring with zero damping loses 27 % of its
  amplitude per cycle, at 16 and at 32 steps per period alike. The world states why: Jolt's implicit spring
  integration damps by zeta_num = omega dt_sub / 2, and the stiffness-regime rule keeps omega dt_sub near 0.1 whatever
  the size, so zeta_num is about 0.05 and 1 - exp(-2 pi 0.05) = 27 %. The test asserts the measured decay against that
  prediction at both sizes (within 10 %), and the law tree carries it as N-5, a declared numerical bound: the surplus
  damping below zeta_num lands in the ledger's numerical loss. Removing it would need omega dt_sub near 0.003, forty
  times the substeps; that is the open task on energy conservation in joints, now with a number on it.
- **Two experimental mistakes the engine caught.** A spring placed at zero distance gets a 5 mm free length (the
  connector's floor), which showed as a constant 5 mm in every sag; and a swing that reaches the spring's length floor
  is clipped and reads 5 % fast. Both are now avoided by hanging the spring from a frozen anchor with an explicit free
  length and a small pull.

**Coulomb, at two sizes.** A birch-plywood cube of 0.1 m and one of 0.4 m on a plywood ramp: both hold at 18° (below
atan 0.45 = 24°) and both slide the same distance in the same time at 35°. The law book says it first: under Froude
similarity (same material, the same g) `friction.coulomb` is covariant with the friction force growing as the weight,
λ³, so the acceleration, force over mass, is unchanged; the engine agrees to within 5 %, and the observation is kept as an
observation.

**Rolling, at two sizes.** A rubber cylinder of 0.05 m radius and one of 0.2 m roll down the same 12° ramp. The law
book: a disc's inertia under Froude similarity is covariant and grows as λ⁵, the mass as λ³ and r² as λ², so I / m r² is
the same ½ at both sizes and the acceleration ⅔ g sin θ does not know the size; measured ratio 0.997.

**Restitution, at two sizes.** A rubber ball of 0.05 m dropped from 0.5 m, one of 0.2 m from 2 m, and the big one from
0.5 m. The law book: potential energy under Froude similarity is covariant, λ⁴, and the restitution is a property the
similarity holds, so the first bounce reaches λ times the height for λ times the drop and the same height for the same
drop. Measured: 3.90 for 4 (2.5 % under, the contact model's velocity dependence, within the 10 % the test holds for a
contact) and 1.000 for 1; the bounce keeps 0.51 of the drop.

**Archimedes, at two sizes.** A Douglas-fir cube of 0.2 m and one of 0.4 m afloat in fresh water. The law book:
buoyancy (ρ g V) and weight (m g) both go as λ³ under Froude, so the fraction of the cube under water, their quotient,
goes as λ⁰, and a period goes as λ^½. Measured: 0.5318 of the height under at both sizes (ratio 0.99998 for 1; the
density ratio 530/998.2 is 0.531), and, pushed a tenth of a side under and let go, heave periods of 0.6530 s and
0.9239 s (ratio 1.4149 for √2 = 1.4142), which are also what 2π√(ρ_wood a / ρ_water g) gives, 0.6539 s and 0.9247 s.
The engine's water is the law book's: the displaced weight and a drag, with no added mass of the water moved, which
real water brings and which would lengthen both periods alike.

**Drag, at two sizes.** An EVA foam ball of 0.1 m and one of 0.2 m let fall from rest through still air, no floor. The
law book: drag (½ ρ C_d A v²) and weight both go as λ³ under Froude, so the speed at which they balance goes as λ^½.
Measured: terminal speeds of 15.20 m/s and 21.47 m/s (ratio 1.4124 for √2 = 1.4142), which are also what
√(2 m g / ρ C_d π d²/4) gives, 15.20 and 21.50. This one found a fault the ratio alone would never have shown: the
engine showed every body its bounding box to the air, so a ball had 4/π too much frontal area and fell √(π/4) too
slowly (13.47 and 19.04 m/s, ratio still 1.4135). A body now shows the air and the water its own frontal area by
shape: a sphere π r², a cylinder its rectangle across and its disc along, a box its faces; a hull or a compound still
shows its box, and the code says so. The drag coefficients of the part kinds are quoted against these areas.

**Cooling, at two sizes: the first scale-dependent one.** A mild-steel cube of 0.1 m and one of 0.2 m, 120 K above the
room, left in still air. The law book: a time goes as λ^½ under Froude, but a lumped time constant m c / h A goes as
λ with h held, so the verdict is scale-dependent by √2; and the engine's h is not even held, since free convection in
still air sheds less per area from a bigger thing (h = 1.42 (ΔT/L)^¼, Holman, now a law of the book), so a purely
convective cooling goes as λ^1.25, with radiation, whose coefficient does not see the size, pulling it back toward λ.
Measured in the engine's thermal model: 3007 s and 6560 s to lose half the excess, a ratio of 2.1814; the law book's
two laws integrated give 2.1813. Two ways to one number, between 2 and 2.38, and nowhere near 1.41: the thermal world
is not similar to the mechanical one, as section 5 says in words and this says in seconds.

**The register of observations** (`src/ganglia/scale/observations.ts`). What the engine measured is kept as
observations, each with the size ratio built, the ratio the law book predicted, the ratio the engine gave and the
tolerance the test holds: Froude 2.003 for 2, Cauchy 0.4993 for 0.5, Coulomb 1.0000 for 1, rolling 0.997 for 1,
restitution 3.90 for 4, Archimedes 0.99998 for 1 and 1.4149 for √2, drag 1.4124 for √2, cooling 2.1814 for the law
book's 2.1813 (and not Froude's 1.41). The
conformance tests measure them again on every run and refuse a drift from what is recorded, a unit test checks each
is within its tolerance and is measured by a test that exists by name, and the hypothesis cites them among what agrees
with it, so Ego's answer to "is reality the same at all scales" says what she measured in this world. Observations they
stay: SC-4 forbids a silent promotion.

## Still open

- The diffusive similarity is also the electromagnetic one (μ₀ and resistivity held give current ∝ λ⁰, R ∝ 1/λ,
  L/R ∝ λ², Rm preserved); the electrical one holds the cell voltage instead and loses magnetism; the thermal one
  scales temperature as 1/λ² so conduction and storage keep their form; the Rayleigh one as 1/λ³ so buoyant flow keeps
  its form and storage and conduction do not. No one transformation keeps heat, buoyancy, magnetism and gravity at
  once: that is the content, not a gap. A surface coefficient h held by the environment is never similar (Bi grows
  with λ), and radiation never is. Measured now, not only said: a steel cube twice the side cools 2.18 times
  as slowly in the engine (the cooling observation), where Froude would need 1.41.
- Characteristic scales are estimates on 461 of 2611 entities: every component named five times or more
  carries one, held by a test, and so do the parts and living things described in the shift; the rest the analogue
  search reports as `unplaced`. The analogue search needs a shared function or transformation as well as a distance in
  decades, so a thing gains far analogues as its function is said.
- The analogue search's similarity measure is a stated choice, listed among the hypothesis's unresolved assumptions.
- Nine cross-scale structures are written, an ecosystem and a market among them as models that say where they break;
  each is a set of level entities in the substrate, joined by `coarse-grains-to`.
- Allometry's exponent is carried as measured (¾) with its range (0.65 to 0.78); the WBE derivation is cited as a
  model, not promoted.

**Correction found while Ego learned to say failures.** The bearing, the gear tooth, the cam and the gear-train structure cited `young.contact`, which is Young's wetting angle, where they meant Hertzian contact; they now cite `hertz.contact`, and a test holds it. A law cited is a law read.
