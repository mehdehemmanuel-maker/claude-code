# Reality as one graph: laws, math, materials, models

The user (2026-10-28): "Map out every known law of reality and turn them into connected, reusable nodes … connect
every law through the math, variables, constants, and physical quantities they share … a unified math system …
configurable settings for units, precision, solvers, assumptions, and accuracy … a unified material system that maps
materials down to their known compositions … connect their properties directly to physics … simplified, estimated,
abstract, and hypothetical nodes … every node must identify whether it's measured, theoretically derived, estimated,
simplified, hypothetical, or experimentally validated, and show its assumptions and limitations … search existing
knowledge first, combine what already exists, identify missing information, and generate new models when necessary.
Every prediction must remain distinguishable from verified reality. First inspect Nexus's existing architecture … then
connect and expand the system without rebuilding working features unnecessarily."

And, in the user's own earlier draft of the same ask: "find all real physical laws of reality … map out how each
interact with each other, find the in between math and equations … it could cancel out the need for certain nodes or
strengthen other nodes … physics should all interconnect in math and interaction so no errors are hit … can everything's
material be exposed … the house, what material is it made out of, if wood what type, if metal what type, what type of
plastic, is it a mix of materials, what are them materials made out of, how much does it weigh, all of these should be
viewable".

## 1. What exists (inspected 2026-10-28)

### Laws

| Where | What | Laws | Reached by the node app |
| --- | --- | --- | --- |
| `src/ganglia/laws.ts` (`LAWS`) | records with a closure `eval`, an `outside()` range check, `valid`, a worked example, one source | 144 | yes: every `law.*` node is built from these (`lawBlocks` in `blocks.ts`) |
| `src/nexus/law.ts` + `src/nexus/book/` (`BOOK`) | each law a term (`term.ts`): dimensions checked as it is built, a domain of predicates that refuses outside it, a content hash, evaluated into a `Derivation` (value, status, inputs, uncertainty, refusal); solvable for any input (`invert`) | 241: the same 144 again (`KEPT`), 22 derived (`SLICE`), 75 more (`UNIVERSAL`: conservation, transport, scaling, kinetics) | **no** |
| `src/engineering/*.ts` | hand-written functions (drag, beams, springs, heat loss, motors, batteries) | about 40 | partly, inside other code |
| `src/nexus/lawgraph.ts` | records with provenance, a law applied to records, solved for an input, provenance trees, laws grouped by the shape of their math, Rayleigh's method, routes from what is known to a target (one or two steps, by dimension) | over `BOOK` | no (tests and `life/glands.ts`) |

The same law written two or three times: all 144 kept laws (closure and term), spring rate, convection and radiation
against `heatLoss`, the copper temperature coefficient against `windingR`, nine kept and book-only pairs, Ohm's law and
an RC time constant against hand-made calculator nodes; Stefan–Boltzmann's constant three times; `Source` twice.

### Math

One dimension algebra (`ganglia/units.ts`, M L T I Θ: no amount of substance), a Buckingham π null space
(`dimension.ts`), terms with an integral binder evaluated by Simpson's rule with an error from halving
(`term.ts`, `evaluate.ts`), first-order uncertainty. A second unit parser in `generate.ts` behind `math.expr`.
Root finding written three times (`law.invert`, `fin.irr`, `lawgraph.solve`), time stepping five times (PID, heat
flow, warming, battery drain, motor run), none with a setting for tolerance, method or precision. `math.multiply` and
`math.divide` drop their units.

### Materials

| Table | Ids | Holds |
| --- | --- | --- |
| `data/materials.ts` | `steel.a36` (49 + 2 ground) | E, ν, yield, ultimate, elongation, conductivity, friction, restitution, sound, colour, source, confidence |
| `engineering/thermal.ts` | `steel.a36` | c, k, emissivity |
| `engineering/fusion.ts` | `steel.a36` | melting, expansion, bond, base element; its own 4 elements |
| `mass.ts` `DENSITY` | `steel-low` (103) | density, typical, no sources |
| `elements.ts` | `steel-low` (149 + 239 life molecules) | composition: alloys by grade, polymers by repeat unit, blends; 52 elements by IUPAC weight |
| `inventory.ts` | `steel-low` | names, paths, makeup |
| `make/rules.ts` `MAX_SERVICE` | `steel-low` (48) | most service temperature |
| `kinds/core.ts` `MATTER` | words | a third density |

Measured over all 423 material ids parts and items can carry (2026-10-28): 410 have no strength, 342 fall back to a
typical friction, 375 have no service limit, 321 have a composition and no density (239 of them the body's
molecules; the rest such as silver, tin, nickel, mica, neoprene, quartz: a part of any of them weighs nothing), 35 have
a density and no composition.

Parts carry the `steel-low` scheme; the properties are in the `steel.a36` scheme; five maps between them disagree
(`steel-low` is 1018 for strength, A36 for friction, 1020 for composition), match by spelling (`tissue` and `tile` get
titanium's friction, `platinum` gets PMMA's), and miss most polymers. 78 materials have a composition and no density
(a part of them weighs nothing); 36 have a density and no composition. Thermal, fusion, adhesives and liquids reach no
node.

### Evidence

A 13-step status lattice (`status.ts`: fundamental, measured, derived, given, empirical, estimated, assumed,
hypothesized, …) and derivations that carry it (`evaluate.ts`), used by no node. Nodes carry `sources` (the 144 laws and
26 others), `valid` (laws only) and words ("typical", "an estimate") in their text. Two other confidence scales in data
files. Nothing a wire carries says what it rests on.

## 2. How it will connect

```
                 ┌────────────── quantities (one registry: force, length, temperature … each its dimension, SI unit) ─────────────┐
                 │                                                                                                               │
  laws (BOOK, 241 terms) ──ports are quantities──► law nodes (solve for any variable) ──► chain solver (law.solve: any number of steps,
      │   domains, hashes,                         │ each value a Derivation:              across fields, by shared quantities)
      │   examples, sources                        │ value, unit, evidence, limits hit            │
      │                                            ▼                                              ▼
      │                               numeric layer (root, integrate, derivative, ODE; method, tolerance, iterations, converged?)
      │                                            ▲                                              ▲
  materials (one registry, keyed by the ids parts carry) ──properties are quantities, each with its source and evidence──┘
      composition → elements (elements.ts)          density → mass of every part, assembly, body in the physics
      handbook grade (data/materials.ts)            E, yield, ultimate → loads, tethers, stress laws
      thermal, fusion, service limit, friction      c, k, melting, limit → heat gate, heat laws;  μ, e → Let it go
                                                   │
  every node: an evidence label (exact, measured, derived, validated, empirical, estimated, simplified, hypothetical, given)
  and its assumptions and limits; every value on a wire carries the weakest evidence it rests on, and from which node
```

The thread through all of it is the **quantity**: a law's port, a material's property and a value on a wire are the
same kind of thing (a quantity with a dimension, a unit and its evidence), so a material's density can feed any law
that takes a density, and the chain solver can join a mechanics law to a heat law through the temperature they share.

## 3. The plan, step by step

The user's brief (2026-10-28, "Reality Physics Unification and Material Transparency") sets the order: audit, map,
then a plan, then small verified stages; correctness, clarity, shared foundations and consistency across fields over
the size of the catalogue; nothing fabricated, gaps recorded. Each step below is its own commit after the full gate.

**Step 0. Baseline and the dependency map (no behaviour changes).**
- A snapshot test that records what the system gives today: every starter board run headless (each node's outputs),
  every law node's worked example, the mass of everything every seed and machine makes. Every later step runs it and
  lists each difference; none may stand unexplained.
- The dependency map as data, written into a document and kept current by a test: law ↔ quantity ↔ node ↔ material
  property ↔ consumer (which code reads which table), so what each step changes can be seen before it is changed.

**Step 1. One numeric layer.** (`src/nexus/numeric.ts`, new.)
- Root finding (bisection, Brent, Newton with a finite-difference derivative), integration (adaptive Simpson,
  Gauss–Legendre), derivatives (central differences with Richardson), ordinary differential equations (Euler, RK4,
  adaptive RK45, backward Euler for stiff systems).
- Each call takes its method, tolerance and most iterations, and returns its value with whether it converged, its
  iterations, its error estimate, and a warning when it is unstable or extrapolates; never a number alone.
- The duplicates call it: `law.invert`, `fin.irr`, `lawgraph.solve`, the Simpson rule in `evaluate.ts`, the steppers
  that are ODEs (PID, battery drain, motor run, warming). The heat flow's implicit grid solver is a field solver and
  stays.
- Nodes `math.root`, `math.integrate`, `math.derivative`, `math.ode`, with the settings and a `converged` output;
  `math.multiply` and `math.divide` keep units.
- Verified against closed forms, with each method's order of convergence measured, and the replaced duplicates giving
  their old answers within tolerance.

**Step 2. Quantities, and what each law is.** (`dimension.ts` owns dimensions; the book owns laws.)
- A registry of named quantities (force, length, temperature, pressure, stress, energy, power, current, voltage,
  resistance, density, …; about 120), each its dimension, SI unit and a plain sentence of what it is. Amount of
  substance added to the dimensions, which lack it.
- Every port of every book law mapped to a quantity, with a plain sentence of what the variable means in that law; a
  test fails on any port that maps to none.
- Each law given its kind: fundamental (a conservation law, Maxwell's), definition (P = V I), constitutive (Hooke's,
  Ohm's for a material), empirical or a correlation (Dittus–Boelter), an approximation of another (a small swing's
  pendulum), a phenomenological rule; with why it works, what it predicts, and when it must not be used (its domain,
  said in words beside the predicates that refuse).
- One set of constants (CODATA) and one `Source` type; the duplicates folded.

**Step 3. The law nodes from the book.**
- `lawBlocks` builds every `law.*` node from the book (241), keeping the ids boards use. Each node: its equation, its
  variables as quantities with units and meanings, a "solve for" setting (any variable, by the numeric layer), its
  domain refusing outside it (said, never a number), each output's derivation (evidence, inputs, uncertainty), its
  sources and kind, its tests.
- Parity first: each of the 144 laws in both engines gives the same value on its example and on 50 samples inside
  its domain, to 1 part in 10⁹; differences found and fixed in whichever is wrong. Only then are the closures retired
  (their tags and range checks moved onto the book's laws; the engineering functions other code uses stay).
- Where a law follows from others, it says so, and the derivation is kept (P = I²R from Ohm's law and P = V I): a
  rearrangement or a special case is folded into the law it comes from, never kept as a second source of truth.

**Step 4. Laws connected: the chain solver and consistency.** (`lawgraph.ts` owns joining laws.)
- Laws and quantities as one graph; from what is known, laws applied as many steps as it takes to reach the target,
  across fields; two laws sharing two unknowns solved together by Newton's method from the numeric layer.
- Node `law.solve`: knowns in, a target out, with the chain (each step's law, inputs, evidence, the limits it came near),
  the weakest evidence it rests on, and what it assumed (that a quantity named alike in two laws is the same thing,
  unless the board names them apart). Where more than one model fits, which was chosen and why is said; nothing
  substituted silently.
- Consistency: units checked at every joint; where two chains reach one quantity they must agree, else both are shown;
  energy, mass, charge and momentum checked across a chain where they apply.
- Verified on cross-field problems with known answers (a hung steel rod: weight, stress, strain, elongation from its E;
  a wire's resistance, heating and temperature rise; a pendulum's length from its period).

**Step 5. Coverage: the laws reality needs that Nexus lacks.**
- The laws there are set against the fields (mechanics and collisions; gravitation and orbits; relativity where it
  matters; electromagnetism as fields and circuits; heat and thermodynamics; fluids, gases, buoyancy, turbulence;
  waves, acoustics, optics, radiation; atomic and quantum; chemistry, bonding, reactions, kinetics; solids: elasticity,
  plasticity, fracture, fatigue; materials' properties; biomechanics): what each field has, what it is missing, written
  into the dependency map.
- Missing laws added field by field from sources (CODATA, textbooks, standards), each with its kind, domain and tests;
  disagreements between models and unresolved questions recorded as such, never smoothed over.

**Step 6. One material system.** (`src/nexus/matter.ts`, new owner; `elements.ts` and `data/materials.ts` its data.)
- For every id parts carry: its precise identity (wood species and grade, steel grade, polymer type, concrete mix,
  glass type), its composition recursively (a mix of materials, each down to compounds and elements, with shares),
  and each property (density, E, ν, yield, ultimate, elongation, c, k, expansion, emissivity, melting, service limit,
  resistivity, friction, restitution, colour) with its value, unit, source and evidence: measured, specified (a
  standard or a maker), estimated or typical.
- One explicit table from part ids to handbook grades replaces `HANDBOOK`, `SURFACE` and `MATTER_WORDS` and their
  spelling matches.
- What is not measured is worked out only where a rule holds and labelled so (density of a mixture by volume
  fractions); properties that depend on microstructure, direction or arrangement (stiffness, conductivity of a
  composite) are given as bounds (Voigt and Reuss) or left missing, never averaged blindly.
- A material known only by its family ("wood", "plastic", "steel") is shown as unspecified, with the range its family
  spans, never passed off as a species or a grade. The house seed's generic "wood" and its concrete (oxides only, no
  mix, no reinforcing) are the first to be specified.
- Element data added from CRC and IUPAC (densities, melting points, standard atomic weights).
- Every consumer reads it: `mass.ts`, `strengthOf`, `surfaceOf`, `MAX_SERVICE`, `tetherOf`, the thermal and fusion
  tables. The snapshot lists every mass and property that moves, each explained.

**Step 7. What anything is made of, and what follows from it.**
- A node and a panel that open any thing as its materials all the way down: each part, its precise material, the mixes
  and what is in each, elements, with the mass and share at every level, and what is known, estimated and unspecified.
- Properties of any part and assembly from its parts, without double counting what is nested: mass and material
  quantities, centre of mass, inertia tensor, heat capacity; resistance and conductance where a path is defined;
  expansion; stiffness and strength where a model holds.
- Fed into the physics, sizing, clearances, heat and simulation that exist; a material changed on a board re-runs every
  result that depends on it, and a test proves it (the house's framing changed, its mass and its loads follow).

**Step 8. Evidence on every node and every value.**
- Every node labelled: exact, measured, specified, derived, validated, empirical, estimated, simplified, hypothetical,
  given; with its assumptions and limits. Read from what a node is (a law from its kind and sources, a datasheet
  lookup as measured, a model that leaves things out as simplified, a generator as hypothetical), set by hand only
  where a rule cannot tell.
- Every value on a wire carries the weakest evidence it rests on and the node it came from; uncertainty carried where it
  changes a result; invalid inputs, incompatible units, violated assumptions, nonphysical results (a negative mass, an
  efficiency over one), instability and extrapolation said on the node that hit them.
- Validation recorded honestly in three grades: tested here, compared with an independent reference, validated against
  experiment; a model is never called validated because its tests pass.
- Shown as a badge on every node and in the inspector, checked by the gauntlet, written into `docs/NODES.md`.

## 4. How each step is verified without breaking what works

- The step 0 snapshot after every step; each difference explained, or the step is not done.
- Dimensional analysis: every law, every chain joint, every node with units.
- Known analytical solutions and limiting cases (a pendulum's small swing, a beam's tip load, e^(−kt), a cubic's
  roots); boundary conditions.
- Conservation of energy and momentum where they apply (collisions, a chain through electrical and heat).
- Independent references: a law's worked example from its own source; a material's figure against a second source.
- Material consistency: density from composition against the measured where both exist; every id parts carry has a
  density; tissue, tile, platinum and alumina get their own properties.
- Assemblies: mass and centre of mass of a known shape against hand calculation; nested assemblies not counted twice.
- Cross-field: the hung rod, the heated wire, a motor's winding changed and its electrical, heat and mass results
  following.
- Incremental runs: a change re-runs every dependent result and nothing else.
- Failures: insufficient data and violated assumptions give a stated warning or refusal, never a number.
- Ids kept: every `law.*` id keeps working, so saved boards open; the reach test, the gauntlet over every node, the
  pages in a browser, and screenshots of a board that solves a cross-field problem through laws and a material.

## 5. Progress

- **Step 0, done.** `tests/nexus/baseline.test.ts` records 1,447 values from every starter board, law node, seed and
  vehicle model (timings left out; two runs alike). `docs/DEPENDENCIES.md` is written from the code by
  `tests/nexus/dependencies.test.ts` and fails when stale. It found: 241 laws in the book, 144 of them also closures
  and nodes, 97 in the book alone; 558 quantity names over 892 ports, 117 shared by two laws or more; 53 letters that
  mean different things in different laws (so laws are joined by quantity, never by letter); four material tables no
  code reads (the friction map, words to matter, the liquids, the edge rules).
- **Step 1, done.** `src/nexus/numeric.ts`: roots (Brent, bisection, Newton, secant), integrals (adaptive Simpson,
  Gauss–Legendre, Simpson on panels), slopes (Ridders, central), paths (Dormand–Prince, RK4, Euler, backward Euler),
  each answer with its method, whether it converged, its steps, its evaluations, its error and a warning. Tested
  against closed forms, with Simpson's fourth order, Euler's first and RK4's fourth measured, and a stiff system
  shown running away explicitly and held by backward Euler. Through it now: a law solved for an input, the law graph's
  inversion (its grounds say the method, whether it converged and its error), `fin.irr` (method and tolerance
  settings, and `converged`), a term's integrals, the PID plant (method setting). New nodes `math.root`,
  `math.integrate`, `math.derivative`, `math.ode`. `math.multiply` and `math.divide` carry units (N × mm is N mm; N ÷
  mm² is N/mm^2). The baseline is unchanged. Kept as their own code, each with its reason in the dependency map: the
  battery's one-step charge count, the motor run (events and energy each step), a frame's warming, the heat grid.
- **Step 2, done.** Amount of substance is a base dimension (the mole was a plain number, so a molar slip could not be
  seen); every law of the book still balances with it. `src/nexus/quantities.ts`: 85 quantities, each a dimension, an
  SI unit and a sentence; all 892 ports of the 241 laws map to one (a test fails on any that does not), told apart by
  their words where a dimension holds several (a torque is not an energy, a stress not a pressure, a modulus not
  either); 55 letters that mean different things in different laws are now different quantities. `meaning(law, port)`
  says what each variable is in its law. `src/nexus/book/kinds.ts`: every law's kind and why it works (92 derived, 40
  definitions, 29 empirical, 25 fundamental, 24 geometry, 18 approximations, 13 constitutive); when it must not be used
  stays its `valid` text and its domain. `src/data/constants.ts`: the constants once (the 2019 SI's exact ones with
  e and N_A added, CODATA 2018's measured ones with their uncertainty); the book's leaves, the Stefan–Boltzmann
  constant in the thermal code and the closures, standard gravity in five modules and the Faraday constant in the gas
  code (it was 96485, now 96485.33212) all read it; a test fails if any code defines one again. One `Source` type:
  the law's is the ganglia's with its kind required. The dependency map now shows each law's kind and the laws each
  quantity joins, and finds a table's readers by the file they import from (it had counted the book's own
  `./materials` as the handbook's).
- **Step 3, done.** One law engine. Every one of the 241 laws of the book is a node (`law.<id>`; the 144 old ids
  kept, 97 new). Before the closures went, each of the 144 was run against its book term at its example and 20 points
  around it (2,940 runs): the ports and units were the same in every law, and every value the same to 10⁻⁹ wherever
  both answered; the only difference was what each did outside its range, where a closure gave a number with a caution
  and the book refuses. So each node now has "Outside where it holds": refuse (by default, in words) or extrapolate
  (the number, marked `outside-validity (extrapolated)` and "not a prediction it makes"). "Solve for" any variable the
  term reads: a product of powers is rearranged; anything else is found by the numeric layer, its bracket searched over
  ±10⁴⁰ and at the edges of where the law is finite, the answer put back to check it holds there and gives what was
  asked; where more than one value solves it, it says how many and takes the positive one nearest 1 where the law
  holds, and From and To choose another. A variable only in a law's domain (the depth that makes a beam slender)
  cannot be solved for, and says so. Each node gives its result's evidence (`status`) and the tree it rests on
  (`why`), and says the law's kind and why it works. Every law's example is its test forward and backward for each
  input it can be solved for; four cannot at their examples (a double root or an edge), each with its reason.
  Found and fixed on the way: the law graph's numeric solve converted an answer in a unit with a scale or an offset
  (°C, mm) as if it were SI; three laws lacked a domain a root search needs (a slope angle within ±90°, a glancing
  angle within 0 to 90°, a transverse fibre fraction within 0 to 0.7) and a bolt's pitch is now below its diameter.
  The baseline moved only by the new outputs and nodes and by two laws now on CODATA 2018's μ₀ rather than 4π × 10⁻⁷
  (5 parts in 10¹⁰). `src/ganglia/laws.ts` is deleted, and with it three engineering files only it reached
  (`battery.ts`, `beams.ts`, `mechanics.ts`); their formulas are the book's.
- **Step 4, done.** `chain` in `src/nexus/lawgraph.ts` and the node `law.solve`: knowns written one a line ("mass =
  1000 kg", a quantity named in brackets where the unit is not enough, `@law.sym` to pin one to a port), a quantity
  wanted, and the laws of the book chained to reach it, sought from the target back so only laws on a way to it are
  applied, as many deep as asked (six by default), each forward or solved backward, a law never twice on one way. Of the
  ways found, the fewest laws then the strongest kind is taken; the rest are said with their values. Where no single law
  can be solved, two laws sharing the same two unknowns are solved together by Newton's method. Out: the value, its
  evidence, the tree it rests on, each step with its law and kind, every assumption, other ways and their values, and
  every other law the values can be checked by, agreeing or not.
  Joining is the rule the plan set, made exact: a value joins a port by its pin, its name or its symbol; by its quantity
  alone only where both the port and the value are named plainly (σ = F/A takes a weight; a critical load, an applied
  voltage, a yield strength are particular and join only by name); a length, an area, a time, a temperature, a speed, an
  energy and every ratio join only by name. Standard gravity is used where a law needs gravity and none is given, and
  said. Verified: a rod holding a tonne (weight → stress → Hooke's law solved for strain, 4.903 × 10⁻⁴); a wire carrying
  5 A (its resistance → Joule heating → Newton's law of cooling solved for the rise, 42 K), its two areas pinned apart;
  a pendulum's length from its period (0.9936 m); a voltage and a current from a power and a resistance by two laws
  solved together; a mass and a weight that do not agree, shown. A wire's length is never joined to a plate's size.
  The laws checked against each other (`crossCheck`, written into `docs/DEPENDENCIES.md`): each law's example given and
  its output sought through the others. Building this found the joining faults the rule above fixes (a normal force
  taken as a friction force, an applied voltage as the drop across a resistance, a law used to find its own input):
  35 false disagreements before, 2 after. 7 laws have another way to their output; 5 agree; the 2 that differ are read:
  the series for a pendulum's period against the exact elliptic integral (5 parts in 10⁶ at 60°, the series' own
  truncation), and a box's shape factor against an ellipsoid's volume (two models of a shape). That only 7 of 241 have a
  second way is the coverage gap step 5 is for. The old two-step `routes` (by dimension alone) is gone; so is the mole
  count kept beside the dimensions, now that the mole is one.
- **Step 5, the first round done.** The coverage map (`src/nexus/book/fields.ts`, written into `docs/DEPENDENCIES.md`):
  fourteen fields, each the core its standard textbook teaches (the source named on each list), 179 laws in all. At the
  start of the step the book had 131 of them. 82 laws were added from those textbooks
  (`book/foundations.ts`, `book/core.ts`), each with its kind and reason, its domain, its source and a worked example
  computed independently in Python, and each tested forward and backward as every law node is: the definitions the rest
  join through (strain, momentum, impulse, work, pressure, wave speed, charge, capacitance), steady acceleration,
  rotation, gravitation and orbits (Newton's law, orbital and escape speed, Kepler's third, vis-viva), special
  relativity (the Lorentz factor, time dilation, length contraction, relativistic momentum, E = m c²), solids (Poisson,
  the isotropic shear modulus, thermal stress, stress intensity at a crack, Goodman, power-law creep, strain energy),
  fluids (terminal speed, Haaland's friction factor), heat (adiabatic compression, entropy of heating, fin efficiency,
  Dittus–Boelter), waves and sound (Doppler, decibels, the speed of sound in a gas, harmonics, inverse square), light
  (the thin lens, magnification, two slits, Malus, Beer–Lambert, Wien), circuits (series and parallel, a wire's field,
  the transformer, LC resonance), the quantum (Planck–Einstein, de Broglie, hydrogen's levels, the photoelectric
  effect, Heisenberg, the particle in a box, Compton), chemistry (pH, the equilibrium constant, Raoult, second-order
  kinetics, van 't Hoff), the binary entropy, and machine elements (a shaft's critical speed, belt power, a clutch's
  torque). New constants from CODATA 2018 (Wien's b, the Rydberg energy) and the conventions they need (I₀ = 10⁻¹²
  W/m², ISO 1683; c° = 1 mol/L, IUPAC); the electronvolt as a unit; six quantities (mass per length, entropy, energy
  density, molar absorptivity, the second-order rate constant, momentum and its angular kin, angular acceleration).
  The book now holds 323 laws, all nodes; the map's core is 177 of 179. The two left: Colebrook's friction factor, which
  is implicit (f on both sides) and so not a term (Haaland's explicit fit to it, within 2 %, is in), and the entropy of a
  distribution of many outcomes, which takes a list, not a number.
  Found on the way: the dimension checker refused my first pH (a concentration over a bare 1000, not over 1 mol/L); the
  root search took a pole (where 1/(1/f − 1/d) changes sign through infinity) for a root, and now keeps only roots the
  law reaches; classical momentum, valid "far below light's speed" in words only, now refuses past a tenth of it (the
  cross-check had found it differing from the relativistic law at 0.6 c, as it should); series and parallel resistance
  each named their output "resistance" and were taken for each other. Laws with a second way to their output: 14 (from
  7); all agree but the two read in step 4. Five laws repeat their outputs (an angle and its complement, a cosine, a
  damped swing, a yes-or-no): their backward tests are given the range that holds the root meant, and the node says
  how many values solve it.
  Still to cover, beyond each field's core: biomechanics, plasticity beyond yield, turbulence beyond friction factors,
  electrochemistry of cells, nuclear reactions, statistical mechanics past the Boltzmann factor; each to be listed in
  `fields.ts` from its textbook before its laws are added.
- **Step 6, the first round done.** `src/nexus/matter.ts` is the one material system: one explicit table (`MATTER`)
  from every material id a part carries (114) to its family, what it is as exactly as it is known, whether that is a
  grade, species, type or mix (66) or only a family (48, said unspecified, with the span its family's specified members
  cover), and its handbook grade, its own (19) or the nearest the handbook holds (50, every number from it said as a
  stand-in's). `matterOf` gives every property with its value, unit, source and evidence, and keeps two tables'
  disagreement rather than choosing (one found: phenolic, 1300 kg/m³ typical against the handbook's 1735 for a filled
  billiard-ball resin). The friction map's spelling matches are gone (they gave tissue and tile titanium's friction,
  platinum PMMA's); strength comes only from a material's own grade, so a stand-in never lends its strength; `steel-low`
  is one steel throughout (its make-up was AISI 1020's while its strength was 1018's: now 1018's, ASTM A108). The
  elements (`data/periodic.ts`, 118): weight, density, melting and boiling points from a secondary compilation (Wikipedia
  citing CRC and IUPAC; PubChem was not reachable from here), said so, the superheavy elements' predicted figures left
  out; a material that is one element now weighs that element's density (a silver or tin part weighed nothing). Wood
  species from the Wood Handbook (`data/woods.ts`: Douglas-fir, northern red oak; density worked out from specific gravity
  at 12 % moisture; MOE and MOR of clear wood, said not a grade's); mixes by the cubic metre (`data/mixes.ts`: a 25 MPa
  concrete, its density the sum of its parts and its make-up from them, down to Portland cement's oxides). The house
  seeds now say their materials: red oak for the oak, MDF for the door leaf and the cabinets, Douglas-fir for the door
  lining, the concrete mix for the sidewalk (each the seed's choice, changed on its node). The baseline moved only by
  that: a door 18.6 → 25.2 kg (MDF at 750 kg/m³ against an unspecified 500), a bed 116.9 → 111.7 kg (red oak 705.6
  against 750), roads lighter by the mix's 2335 kg/m³ against 2400; the agents' timings by the heavier door's swing; more
  kitchen pieces past what a body can lift. Node `matter` opens any material. The dependency map lists every material
  with its family, whether it is specified, its handbook grade, its density and strength with their evidence.
  A stand-in must fit the property it lends: the gate caught a car held still by friction starting to slide, because
  the brake pads' friction material and epoxy had been given the handbook's only thermoset, a filled phenolic billiard
  ball (friction 0.06); neither has a stand-in now, and each says its friction is typical.
  Still to do in this step: the house's walls and frame (the wall node's material), reinforcing in the concrete,
  thermal and fusion properties for the stand-ins' own grades, polymers' own handbook entries (50 stand-ins remain),
  composites' stiffness as bounds; then step 7 opens any thing as its materials all the way down.
- **Step 7, the first round done.** `src/nexus/madeof.ts`, from one walk of a thing's placed pieces (the walk that draws
  and weighs it): `madeOf` opens any thing as its materials all the way down (its own tree, each thing's mass and share,
  a thing placed many times counted once at each place; mass by material, each said as exactly as `matter.ts` knows it;
  by element; and what is not known: pieces with no material, materials with no density, materials known only by their
  family, masses stated rather than worked out); `massProperties` gives mass, centre of mass, the inertia tensor about it
  (each piece's own, exact for a box, a cylinder or a ball, else its box and said; the parallel axis theorem in tensor
  form), its principal moments, and heat capacity from each material's own specific heat with the share of mass it
  covers. Verified against answers worked by hand (a steel block and an aluminium rod a metre apart: mass, centre,
  inertia about two axes; iron from both, the aluminium's 0.35 % too), against the existing weighing (the house and the
  default vehicle agree to 10⁻¹⁵), nested and repeated placing (four of a pair weigh four pairs), what is not known said,
  and a material changed on a board re-running mass, make-up and heat capacity. Nodes `made.of`, `mass.properties`.
  What it found, left as findings (design is not this round's): the house is 213 t, 81 % of it "tile": the roof is a
  solid triangular prism of tile, not a roof; tile has no make-up, so 82 % of the house is not known down to elements;
  "oak" (unspecified) is still in the room plans. The default vehicle is 6.1 t, 11.6 % of it alumina (about 700 kg),
  which no car holds: some part is drawn of it or at a size it is not; 12 of its materials are known only by family.
  Still to do in this step: resistance and conductance along a defined path, expansion, stiffness and strength of an
  assembly where a model holds; the physics bodies' inertia read from here rather than from their shapes alone.
- **Step 7, fed into the physics.** A body of several pieces is now given to the rigid-body engine with its centre of
  mass and inertia tensor from its pieces' own masses (`massPropsOf` in `sim.ts`, the same parallel-axis sum as
  `madeof.ts`; each piece's own inertia exact for a box, a ball, a cylinder and a cone, a ring or a tube as the solid
  cylinder round it), the centre moved by Jolt's offset-centre-of-mass shape. Before, Jolt took one density for the
  whole body, so a steel cube joined to a pine cube balanced at the middle of their volume; now, set across a knife
  edge there, the steel side goes down, and with one density it still balances (the test holds both). A body with any
  piece of unknown mass keeps Jolt's own. What moved in the snapshot: the two agent boards, through the door, which is
  a body of pieces of different materials: its swing now ends one physics step (1/60 s) later, so the plans end
  1/60 s later, and the child's drawn path has one segment fewer (3 g of PVC line).
  Still to do: resistance and conductance along a defined path, expansion, stiffness and strength of an assembly.
- **Step 7, along a path.** `alongPath` (`madeof.ts`, node `path.properties`): pieces of a thing named in order along an
  axis, in series; each piece's length its extent along the axis and its section its volume over that length (exact
  for a box square to the axes or a cylinder lying along the axis, else a mean, said); from each material's own figures,
  the path's resistance to heat (L / k A), to current (L / σ A), its axial stiffness (1 / Σ L / E A) and its growth
  warmed (Σ α L ΔT); where neighbours expand differently, the strain between them and the stress if one held the other
  (the stiffer E times |Δα| ΔT, an upper bound). A piece not found, a material with no figure, a stand-in grade's figure:
  each said, nothing guessed. Left out, said: contact resistance (for heat often the larger part, so the result is the
  least the path can be), bending, any other path. Verified against the same sums worked by hand for an aluminium rod,
  a copper rod and a steel block (all four quantities, the sections exact, the mismatch strain and stress), a rod lying
  across the path read as a mean section, and a material changed on a board changing what the path carries.
  The snapshot did not move.
- **Step 7, side by side and strength.** A path is now stages one after another, each one piece or several side by
  side ("a + b, c"), joined at both ends: in a stage conductances and stiffnesses add, and the pieces grow by their
  stiffness-weighted mean (Turner), each pair side by side with its own mismatch; its strength is the axial force at
  which the first piece yields (each stage carries it all, shared by stiffness, so a stage yields when its first piece
  reaches its own yield strain σy / E; series: the least over the stages). Pieces side by side of different lengths are
  said to be taken as joined at both ends. Verified against the sums worked by hand for a steel and an aluminium rod
  side by side under a copper rod (resistance, stiffness, Turner growth, first yield). The snapshot did not move.
- **Step 7, a beam, a column, its joints and networks.** A path is now also a beam held at its start: its end's
  stiffness to a sideways push toward each of the other two axes, exact for a stepped beam (Euler–Bernoulli,
  δ = P Σ ((L − a)³ − (L − b)³) / 3 E I over its stages; each piece's section second moments exact for a box square to
  the axes and a cylinder along the path, else its box's scaled to its mean section and said). And a column: the push it
  takes at least before buckling, π² E I / (K L)² with its weakest stage's E I over its whole length and its ends as
  said (K 1, 0.5, 0.699, 2): a stepped column is stiffer everywhere than one as weak as its weakest stage, so this is a
  floor, never an overestimate; where it is below the yield force, it is said to buckle first. The joints between
  stages, through the lesser section: a contact conductance (W/m² K) or resistance (Ω) given is added there; none is
  invented (it hangs on the faces' finish and how hard they are pressed, which nothing here knows yet), and left out it
  is said. Networks (`throughNetwork`, node `path.network`): pieces as branches between named junctions, solved by
  nodal analysis (each junction's balance one row of a linear system, `solveLinear`) for heat, current and axial
  stiffness between two junctions; a bridge no series-and-parallel reduction can take is solved as readily. Verified
  against hand-worked answers: a bar's 3 E I / L³ both ways, a stepped beam's sum, Euler's load for pinned and
  fixed-free ends, the stepped column's floor, the contact added at a joint, a split that rejoins equal to pieces side
  by side, and an unbalanced Wheatstone bridge of five rods of three metals against its closed form (to 12 figures).
  The snapshot did not move.
  Shown on a starter board (What it is made of, and what it carries: a copper and an aluminium rod side by side under
  a steel block), looked at in the app: what it is made of by material and element, its mass, centre and inertia, and
  the path's heat, current, stiffness, growth, first yield, bending and buckling. Looking found two faults, both fixed:
  the analyses were shelved under Start (any node that measures was, before its being a critic was asked; a critic is
  now shelved under Check first), and the path nodes said "untested" (their tests were in a test file, not on the
  node: each now carries one worked by hand from its material's handbook figures).
  Step 7 as planned is done but for two things said plainly: contact conductance from what the faces are (no data
  here for it yet), and a test that the house's framing changed moves its loads (the house is parked: design is not
  this round's).
- **Step 8, the first round done.** `src/nexus/evidence.ts` gives every node its own evidence, read from what it is: a
  law from its kind (definition or geometry exact, fundamental or derived law derived, approximation simplified, the rest
  empirical) with its validity as an assumption and its domain as its limits; a typed or chosen value given; a maker's,
  a standard's or a table's figures specified; the 6502 netlist measured (traced from the die); simulations and
  perception models simplified; designs, generators, AI and the web hypothetical; anything that says its figures are
  typical or an estimate no stronger than estimated; set by hand only for 14 nodes a rule cannot tell, each with why.
  Counts: exact 81, measured 1, specified 7, derived 289, given 9, empirical 47, estimated 6, simplified 40,
  hypothetical 71. Validation in the grades the plan set, never claimed past what was done: 9 laws compared with an
  independent reference (their worked example reached another way through the book, and agreeing), 510 tested here (a
  check that a node does what it says, not that the world does), 32 untested, none validated against experiment.
  The engine carries on every value the weakest evidence it rests on and the node it came from; a result that cannot be
  physical (a mass, density, volume, area or resistance below nothing, a temperature below absolute zero, an efficiency
  or share outside nothing to one) is said on the node that made it, never corrected. Shown on each node's footer and in
  the inspector (kind, why, assumptions, limits, how checked), counted in `docs/NODES.md`; the gauntlet fails a node that
  claims specified or measured figures with no source. The snapshot did not move.
  What it found: 29 ports were in units the units parser cannot read (USD, N*m, A*h, W*h, kW*h, °), so no value through them
  could be converted or checked; they now read N m, Ah, Wh, kWh and deg, currency is let stand as currency, and a test holds
  every port to a unit the parser reads.
  Still to do in this step: uncertainty carried on wires where it changes a result; conservation checks across a chain;
  extrapolation outside a law's domain said on the value, not only listed as a limit.
- **Step 8, the second round done.** Uncertainty on wires: a number typed with a ± (one standard uncertainty, in its own
  unit) carries it, and the engine carries it through every node that gives the same for the same inputs: each
  uncertain source moved by its ± and the node run again, the half-difference its sensitivity, summed in quadrature (a
  first-order estimate as the GUM gives it). One source feeding two inputs is moved as one, so x × x gives 2x δx, not
  √2 x δx; sources reached by different paths from one origin are still taken as independent, which is said. A ± is
  converted with its value (2 mm arrives as 0.002 m), changing only a ± runs again what it feeds, and a node it cannot
  pass (one with a board of its own, one that does not give the same twice, a sweep) says so rather than dropping it.
  Shown as "value ± u" in the inspector. Extrapolation carried: a law asked to go past where it holds says so on its
  node, and every value downstream says it rests on an extrapolation and which node made it, not a prediction.
  Conservation: a balance node (`check.balance`) sums what goes in against what comes out and is kept, of one
  conserved thing in one unit, says on the node when the imbalance is more than its tolerance, and carries the inputs'
  ± into the imbalance. Verified by hand-worked answers (2 ± 0.1 kg weighs 19.61 ± 0.98 N; a pendulum's δT = T δL / 2L;
  100 ± 3 J in against 90 ± 4 J out is 10 ± 5 J unaccounted for). The snapshot did not move.
  Still to do in this step: the balance applied along the existing chains (the electrical-to-heat chain, collisions in
  the physics) rather than only as a node one places; uncertainty from the material tables (a property's own spread)
  and from the solvers' own error; judging a balance against its imbalance's uncertainty rather than a fixed tolerance.

## 6. The plan from here (2026-10-28), in order

The user, after step 7's rounds: "pause gather your self … optimize you context … give me a full system report and a
smarter way to go about step 7", then "Yes create a new plan based off this in chronological order".

Why step 7 is redone. What was built (`alongPath`, `throughNetwork`, nodes `path.properties` and `path.network`) is
formulas driven by typing piece names: the manual work the user has asked again and again to eliminate. It also does
its own arithmetic where the book owns the law (`conduction.series`), so its values skip the units, evidence, ± and
extrapolation that steps 3 and 8 built (a second owner); it guesses each joint as the lesser section, though
`contacts()` and `patchIn()` in `make/space.ts` already find what touches and over what patch; and it is one
dimensional, so it cannot say where heat or force goes through a real build. Its hand-worked tests (a stepped beam,
Euler's load, a Wheatstone bridge, Turner's growth) stay, as the checks the new engine must still pass.

Each step below ends the same way: the tests that touch it while working, the full gate once before it is pushed, the
snapshot's differences explained, a screenshot of it in the app sent to the user, and a progress entry in section 5.

**Step A. Context and process (first, small).**
- `CLAUDE.md` trimmed, only with the user's yes: the owners table to one line per concern, its detail moved into the
  docs each row names; "What is wanted" and the rules kept word for word.
- Work reads what it needs by searching, never whole large files; the full gate runs once per push, not per edit.

**Step B. The contact graph, from the geometry.**
- `graphOf(thing)`: every piece a node; every pair that touches an edge, with its real contact patch (area, normal,
  where it is) from `contacts()` and `patchIn()`; nothing typed. Computed once per distinct thing and shared wherever
  it is placed, as mass is (a city of the same drone builds one drone's graph).
- Its own pieces' sections and lengths through each contact, for the edges' figures in step C.
- Node `graph` (what touches what, as a table and drawn as lines between pieces in the 3D view).
- Checked: a stack of blocks is a chain; a bolted joint joins through the bolt; pieces a hair apart do not touch;
  the same thing placed a thousand times builds its graph once.

**Step C. One solver for everything that flows.**
- Heat and current first: each piece split at its contacts, each part of it a conductance from the book's own laws
  (conduction, resistance from resistivity), each contact a conductance through its patch (given, or left out and
  said, as now); the network solved by nodal analysis (`solveLinear`, sparse when large). Ends chosen by a click on a
  piece or by what a piece is (the hot one, the mount, the earth: tags that exist), never by name.
- Answers: the resistance between the ends, each piece's temperature or voltage, the flow through each contact.
- Checked: the hand-worked path and network cases give the same answers through the new engine; a bridge; energy in
  equals energy out at every junction (step 8's balance, applied).

**Step D. Laws, evidence and ± on every edge.**
- Each edge's figure is a law of the book run through the law engine, so its units, evidence and extrapolation come
  with it; a material known only by its family, or a stand-in grade, carries its family's span as ± (step 6's spans),
  and the ± reaches the answer by step 8's propagation.
- Checked: a material swapped on the board moves the answer and its ±; a stand-in shows as one on the result.

**Step E. Seen in the 3D view.**
- The build coloured by temperature, voltage or force along the graph (the field colours placement already draws),
  with the flow through each contact as arrows sized by it. Screenshots of the copper and aluminium rods, a heat sink
  on a chip, and an engine's block from the head down.

**Step F. Force: a 3D spring network.**
- The same graph, each piece's stiffness from its material and section (axial and bending), each contact a joint;
  solved for deflections, reaction forces at what holds it, and the load path (which pieces carry how much). Bending
  and buckling of an assembly read from it rather than from a chain.
- Checked against the hand-worked beam, column and stepped-beam cases, and a frame with a closed form.

**Step G. Accuracy that grows, said.**
- One element per piece is fast and shows which way things flow. Where a piece's own gradient matters, it is split
  into more nodes of the same graph (finite volumes, finite elements: no second engine), and the answer is shown
  settling as it is split (a convergence check, with the error said).

**Step H. Fed into what exists.**
- The heat gate in `make/rules.ts` reads conduction through the graph where pieces touch (its distance fall-off kept
  for what only radiates); placement's heat map the same; `loads.ts` reads stiffness and load paths from step F;
  the physics already takes mass, centre and inertia from the pieces.
- The snapshot will move where the heat gate's answers change: each difference explained.

**Step I. Retire what the engine replaces.**
- `path.properties` and `path.network` become thin wrappers over the engine (or are merged into its node as aliases,
  `ALIASES`), their tests kept as regression; nothing does the same thing twice.

**Then, in order:**
1. Step 6's remainder: the 50 stand-in grades each given its own figures from a source, or said unknown; composites'
   stiffness as bounds; the old word-to-material maps retired.
2. Step 8's remainder: balances applied along the existing chains (electrical to heat, collisions), a balance judged
   against its imbalance's ±, uncertainty from the solvers' own error.
3. Step 5's remainder: more of the laws each field needs, by the coverage map.
4. Parked until the user lifts it (design): the house's roof (213 t, 81 % tile), the default vehicle's 700 kg of
   alumina, Cascadia; and #52 (segment tables), blocked by the network.

**Step A, done (2026-10-28).** The user: "the gate should be one minute at max", then "since you have updated the system
it should be more effective creat one teste that converse all domains also mark have a date on nodes so you can marke
previously built nodes as before the update, they could be flawed tests anyways".
- The anchor: `CLAUDE.md` from 55 KB to 29 KB, its owners table a one-line index, the full rows word for word in
  `docs/OWNERS.md`.
- Why the gate took 8 to 12 minutes, measured: 21.7 minutes of test work on 4 cores, 96 % of it in 56 tests; one alone
  ("every kit through the pipeline") took 4 m 46 s, 90 % of that a car park and a street, each many copies of one car
  worked through the make pipeline one copy at a time.
- Faster, proven unchanged: the contact search (`contacts`, `sat` in `make/space.ts`) allocates nothing per pair,
  works out each part's tolerance once, sweeps along the axis the parts spread furthest over, and skips covering
  boxes whose bounds are apart by more than the tolerance (two shapes are never nearer than their bounds). Every one
  of the 30 kits gives the same contacts, interfaces and critique, bit for bit; the car park's search from 5.0 s to
  1.2 s, the street's from 1.6 s to 0.34 s. Still to do: the pipeline working a thing placed many times once.
- The gate is now the type check and one test, `tests/nexus/domains.test.ts`: for each of the 19 domains, every node
  resolves its ports, says its evidence, works in units the parser reads, is dated and passes its own tests, and one
  quick starter board of the field runs with no node failing; 28 s. The tests from before are the legacy suite:
  `npm run gate:full`, and CI on every push.
- Every node is dated (`src/nexus/built.ts`, from git: the commit that last changed the line that defines it), and one
  built before the update (Reality step 0, 2026-10-28 06:21 UTC) says so on its node, in the inspector and in
  `docs/NODES.md`: its tests may be flawed and it is to be re-checked. 457 of 554 nodes are before it, the queue.
- Found on the way: a code block could run only in the page's worker, so no test could run a board with one (the
  resistor board's "where it overheats" failed headless); the worker's own runner now serves tests. Two messages
  still named the deleted forge; they no longer do.

- Then (the user: "Dude we don't need all these tests"): the legacy suite deleted, 72 test files and the baseline
  snapshot (commit f509152 holds them). One test is left, `tests/nexus/domains.test.ts`: every domain's nodes (ports,
  evidence, units, date, their own tests), one quick starter board per field, and the reach check (every source file
  reached from the app); 26 s with the type check, and CI runs the same. The generated docs are written by
  `tests/nexus/docs.ts` (`UPDATE_DOCS=1 npx vitest run`), no longer checked by tests of their own. What is given up,
  said: the snapshot that held every output still (the step 0 baseline), and the slow end-to-end checks (the Corolla's
  autopilot, the 6502's 151 opcodes on its transistors, every kit through the make pipeline, the 10,000-node scale
  runs); a change to what a board gives is now caught only where its node's own tests or its domain's quick board see it.

**Step B, done (2026-10-28).** `src/nexus/graph.ts` (`graphOf`, node `graph`, What touches what): the contact graph of any
thing from its geometry, nothing typed: every piece a node, every two that touch an edge with where, which way, how hard
and over what patch (the overlap of their covering boxes: exact for boxes face to face; for a 12 mm rod's end it reads
144 mm² where the circle is 113, said on the node, to be tightened in step C); the groups held together. Each distinct
thing's graph is worked out once in its own frame and placed; between placements only pieces near each other are
looked at. Checked: three stacked cubes give three pieces, two contacts of 0.0100 m², one group (the node's own test);
a car is 1,523 pieces and 4,840 contacts in 0.26 s; twenty of it 30,460 pieces in 0.58 s, the car worked out once.
Found: the car is 55 groups that do not touch each other, so some of its pieces float (to look at when design is back).
Shown on the starter board What it is made of, and what it carries.
