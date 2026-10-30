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

## 6. The plan from here, in order (rewritten 2026-10-29)

History. 2026-10-28, after step 7's rounds, the user asked for "a smarter way to go about step 7 … in chronological
order": what step 7 had built (`alongPath`, `throughNetwork`, nodes `path.properties`, `path.network`) was formulas driven
by typed piece names, doing its own arithmetic where the book owns the law, one-dimensional. Steps A to I replaced it with
one engine over the contact graph. 2026-10-29 the user asked what is retired, merged and connected, whether the whole
system is updated ("put it in system population and take all previous builds as before the update"), for nodes "more
technical, scientifically specified", and for the engineering disciplines as a tree; then for the whole plan in
chronological order, then for appearance from physics ahead of a design round that throws away what was built before the update and rebuilds it. This is that order. Two rules set it: what changes the answers (the engine, the materials, the
evidence) is finished before anything is re-checked against it, so nothing is re-checked twice; and the naming schema
exists before the re-check, so each node is renamed once, while it is re-worked.

Every step ends the same way: the tests that touch it while working (probes, deleted after), the one test (under a
minute) before it is pushed and only pushed on its passing, a screenshot in the app where it can be seen, and a progress
entry below.

### Phase 1. The engine (steps A to I): done, 2026-10-28 to 10-29

| Step | What | State |
| --- | --- | --- |
| A | Context and process: CLAUDE.md trimmed, the one test, nodes dated, the gate under a minute | done |
| B | Contact graph from the geometry (`graphOf`, node `graph`), each distinct thing once | done |
| C | One solver for what flows (`flowOver`, node `flow`): heat, current, force | done |
| D | Each edge by the book's laws; evidence and ± (GUM type B from families' spans) | done (the frame's sections and stiffnesses through the book, phase 2.3) |
| E | Seen in 3D: coloured by level, smooth fields through each piece (Fourier between known points), bent as beams bend (Hermite), arrows across contacts | done |
| F | Force: 3D frame (`bentUnder`, node `bend`): deflection, von Mises stress, first yield, linear buckling, thermal loads, supports by kind and at a point | done (supports as settings, phase 2.3) |
| G | Accuracy that grows: slices along the flow, the answer shown settling | done |
| H | Fed into what exists: heat gate by conduction, placement's heat map, the con-rod check | done for those; the other load rows in Phase 4 |
| I | Retired: `path.network` → `flow`, `path.properties` → `bend`, their code deleted | done |

### Phase 2. Finish what changes the answers (before anything is re-checked)

1. **Taxonomy schema (step K, its fields).** The disciplines tree is populated (`src/data/disciplines.ts`,
   `docs/DISCIPLINES.md`: 17 disciplines, 363 entries, each after the body that divides it). Next: the fields on every
   node (technical name and plain gloss; discipline entry; scheme code from PhySH, MSC2020, ICS, ACM CCS or JEL; role
   from data source, geometry operation, analysis, numerical solver, assessment, data transformation, control flow,
   visualisation, I/O; model specification: governing laws, model class, steady or transient, linear or not, numerical
   method, assumptions and range, references; physical domain read from its ports' quantities; a hierarchical technical
   id with the old one an alias). For example `bend`: "Frame analysis: 3D Euler–Bernoulli beam network (deflection, von
   Mises stress, linear buckling, thermal load)", discipline mechanical → solid mechanics → elasticity, role analysis, id
   `solid.frame`; `flow`: "Lumped network analysis: steady conduction, DC current, axial stiffness", id
   `heat.conduction.network`; `graph`: "Contact graph (adjacency from geometry)". The one test's check holds them on every node marked current; a node before the update
   is exempt until Phase 4 re-works it, so the gate stays green and the check grows with the work.
2. **One heat solver.** `heatflow.ts` (lumped, stepped in time, used by `generate.ts`) becomes the time-stepped form of
   `temperaturesOf` over the same graph and laws; Incropera's touching-contact resistance becomes the engine's default
   where pieces only touch. Nothing does heat twice.
3. **Engine leftovers.** Bending stiffness through book laws (D for the frame); `bend` takes supports as settings
   (clamped, pinned, sliding, held at a point) and says its convergence as `flow` does (G); arrows for the flow through
   each contact (E).
4. **Materials (step 6's remainder).** The 50 stand-in grades each given their own sourced figures or said unknown;
   conductivity for polymers, rubbers and mixes; composites' stiffness and conductivity as bounds (Voigt and Reuss);
   the old word-to-material maps retired.
5. **Evidence (step 8's remainder).** Balances along the existing chains (electrical to heat, collisions), a balance
   judged against its imbalance's ±; ± from the solvers' own error (the residual, the settling as slices double).

### Phase 3. Appearance from physics: how a thing looks, worked out and editable (asked 2026-10-29)

The user: "I would rather get textures stunning and different tools that govern how something looks maybe math can
determine something color like why is metal silvery grey why is copper its color … like a auto texture that is editable
like paint jobs or design". Before anything is rebuilt, so every rebuilt thing gets it.

1. **Optical data on the materials** (`matter.ts`): each metal's complex refractive index n(λ) + i k(λ) across the
   visible (Johnson and Christy 1972 for copper, silver and gold; Rakić et al. 1998 for aluminium, chromium, nickel,
   titanium, tungsten; others as the compilations give them, sourced); each dielectric's index and absorption; pigments
   by their absorption.
2. **Colour computed, not chosen**: reflectance at each wavelength from Fresnel's equations, R = ((n−1)² + k²) /
   ((n+1)² + k²) at normal incidence, weighed by the CIE 1931 observer under D65 into XYZ, then linear sRGB: the metal's
   reflected colour (its F0). This is the why: silver and aluminium reflect nearly the same at every wavelength, so they
   look neutral; copper's d-band electrons absorb above about 2.1 eV (green and blue), so it reflects red and orange;
   gold's edge is near 2.4 eV, so it is yellow; iron and steel reflect about 55 to 65 % flatly, so they are grey and
   darker than silver. Checked against measured colours.
3. **Surface from the process**: roughness from the finishing process's Ra (turned, ground, polished, cast, forged, blasted,
   printed) into microfacet roughness; the lay of machining as anisotropy; what is geometry at that scale (layer lines,
   knurls, weave, threads) made as height and normal maps; oxides and patinas (copper's Cu₂O then verdigris, aluminium's
   anodic film, heat tint on steel) as layers with their own optics, thin films by interference.
4. **An editable look stack on every part** (an auto texture to start from, every layer changeable): substrate (from its
   material, step 2) → treatment (anodised, plated, oxidised) → coating (primer, base coat by pigment, metallic or pearl
   flake, clear coat) → graphics (livery, decals, patterns) → wear and weathering (edge wear by curvature, dirt by
   occlusion, heat tint by the engine's own temperature field). Nodes for each layer; a paint job is a node.
5. **The renderer**: physically based (clear coat, anisotropy, sheen, iridescence), lit by an environment; screenshots
   close up and a blind check each round ("would a person call this cheap?").

### Phase 4. Node population (step J): every node before the update re-checked

Dated from git: 457 of 556 nodes were from before the update (`BUILT`, `UPDATE` in `src/nexus/built.ts`), marked so on
the node, in the inspector and in NODES.md. A node counts as current only when it has been re-worked and specified
(step K), never because it passes; one that would take longer to fix than to rebuild is rebuilt.

1. **Load checks read the drawn parts**: rod bolts, crank-pin bearing, wrist pin (`loads.ts`), as the con-rod does. Done 2026-10-29.
2. **Nodes, field by field** (laws 241, seeds 21, make 16, engine 8, …): each re-checked against units, evidence and ±,
   its own tests read again ("they could be flawed tests"), named and classified (step K), and so dated after. Decided
   by the user (2026-10-29): "if the law nodes fall into the math node hierarchy with no contradictions then they're
   safe": a law node is current when `lawFits` holds for its law as it now is (all 330 do; see the progress entry).
3. **Retire what the population shows doubled**, as aliases, so no board breaks.

### Phase 5. Design population: what was built before the update thrown away and rebuilt

The user: "those were really just tasks that helped us see what we need … thing built before the update just throw it
away it's gonna be too buggy and be a unreasonable headache when you can rebuild it way faster and way better now". The
39 boards from before the update (`BOARDS_BUILT`, marked in the library) and the builds they make (the house, the
vehicles, the truck, the city, the engine, the battery, the computer, …) are deleted, not repaired; what they taught
stays in this document and in the nodes. Then rebuilt, field by field, from the current nodes only: each from its first
parts, through the contact graph, the heat gate and the frame under its own weight and working loads, with its look from
Phase 3, and shown. The one test's quick board for each field is rebuilt with it, so the gate never runs a thrown-away
board.

### Phase 6. Coverage (step 5's remainder)

The laws and nodes each discipline needs, measured against the disciplines tree: each specialty with no node listed,
the most used first; and what the rebuilds of Phase 5 found missing. (Segment tables, #52, are one of these.)

### Progress (newest last)

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

**Step C, first round (2026-10-28).** `flowOver` in `graph.ts`, node `flow` (What flows through it): heat or current
through any thing between two sets of its pieces over its contact graph, the ends chosen by what pieces are (the highest,
the lowest, a name or a material), never a typed path. Each piece held at its middle; between two that touch, half of
each from its middle to the middle of the patch they meet over, by each material's own conductivity (`matter.ts`), and
the contact's conductance where given; the network solved at once by conjugate gradients (`solveSparseSPD`, added to
`numeric.ts`), with the balance at every piece said. The contact patch is now no more than either piece's own section
across it (a 12 mm rod's end is 113.1 mm², not its box's 144), and where pieces meet is the patch's middle, not halfway
between their centres (which had put a block's contact 58 mm down inside the rod under it and doubled the answer).
Checked by hand: three copper cubes, top to bottom, 0.2 / (388 × 0.01) K/W, exactly a 200 mm bar (the node's own test);
the steel block on its copper and aluminium rods, 3.618 K/W, the same as the halves and branches worked out apart. A car
through its 1,523 pieces in 0.75 s (540 pieces with no conductivity known, said).
Also: the one test made quicker (a law's back-solve bracketed: 8.4 s to 1.0 s; the evidence check that could never
fail removed); `UPDATE_DOCS=quick` writes the dates and the catalogue in seconds.
Still to do in step C: the contact patch for round pieces meeting side on, and step D (each edge's figure through the
law book, so its ± and evidence come with it).

**Step D, done for heat and current (2026-10-28).** Each half of each contact is now worked by the book's own law, not
private arithmetic: Fourier's (`conduction`) for heat, a wire's resistance (`wire.resistance`) for current, run through
the law engine; a half the law refuses carries nothing and is said. The answer rests on the weakest evidence of the
material figures it used (said on the node and carried on its wires, the engine now taking a node's evidence and ± from
what it worked out), and a material known only by its family takes the middle of its family's span with the span as a
uniform ± (span / √12), carried to the resistance by solving again with each such material moved. Found and fixed on the
way: no wood had a thermal conductivity, though `thermal.ts` held the Wood Handbook's relations from specific gravity;
every species now has its k (across the grain, along it 1.5 to 2.8 times) and specific heat, derived. Checked: plain
"wood" cubes give 130.4 K/W ± 8.4 (the span's middle, 0.153 W/m K, by hand 0.2 / (0.1534 × 0.01)), estimated; copper's
answer unchanged and exact. Concrete still carries nothing: the mixes have no conductivity (to come with step 6's
remainder).

**Step E, done (2026-10-28).** The flow node also gives what it worked out as the thing itself, each piece coloured by
its level, blue at the cold end through green and yellow to red at the hot, grey where nothing reaches (`coloured` in
`graph.ts`, each piece placed, shared). On the rods board, beside the rods: the steel block red, the rods blue. Seen
plainly: each piece is one colour, because each is one temperature (lumped), though heat falls along a rod; step G
splits pieces so the gradient shows and the answer can be seen settling.

**Step G, first round (2026-10-28).** `sliced` in `graph.ts`: each box and cylinder cut into slices (node setting, 8 by
default), a box across the way what flows goes (its side most along the line from the one end to the other; its
longest when no way is given), a cylinder along its axis; the slices of a piece joined through its own section at each
cut, by the same law; a contact from outside lands on the slice that holds where it meets; tubes, lofts and pieces of
several boxes stay whole. The flow node says the answer at its slices and at half as many, and how far apart: how far
to trust its last figures. Checked by hand: three copper cubes in 8 slices each, top slice to bottom slice, 0.2875 /
(388 × 0.01) K/W, their middles' distance through the same bar (the node's second test). Found by that test: a cube's
sides are all equal, so "the longest side" cut the stack across the wrong way; cutting across the way it flows put it
right. The rods: 4.424 K/W at 8 slices, 4.270 at 4, 3.5 % apart; seen in 3D, red at the block through green and
yellow to blue at the rods' feet, the copper rod's top cooler than the aluminium's because copper draws more heat
through the steel above it.

**Step F, first round (2026-10-28).** Force through the same graph: the flow node's third kind. Each half a bar by a new
law of the book, `bar.axial-stiffness` (k = E A / L, Hooke's law over a whole bar; Shigley eq. 4-4, with its kind and
worked example), stiffnesses in series and side by side as conductances are; the ends where it is pushed and what holds
it; it gives the give between them (m/N), how far the pushed end moves for the push given, each piece's movement, and
the load path: what each contact carries, most first. Checked by hand: 1,000 N on three steel cubes held at the
bottom moves the top 1000 × 0.2 / (205 GPa × 0.01) (the node's third test); the steel block pushed onto its rods puts
62.1 % of the load through the copper rod, as its E A share (115 / (115 + 69) = 62.5 %, less the steel above each)
says. Said on the node: along the way it is loaded only, contacts bonded; bending, buckling and a 3D frame are the
next round of F.

**Step I, first round (2026-10-28).** `path.network` and `throughNetwork` retired: a network named piece by piece is what
What flows through it finds from the geometry, nothing typed; the old id is an alias of `flow`, so a saved board moves
on. `path.properties` stays, for what the engine does not yet: growth when warmed, the first yield, bending and
buckling; its heat, current and axial stiffness are the engine's, and go when F's second round brings bending.

**Step H, first round (2026-10-28): the heat gate by conduction.** The heat gate judged only what a hot piece's heat
reaches across the air, and skipped anything touching it ("cooled by what it is bolted to"), so heat conducted was never
judged. `temperaturesOf` (`graph.ts`): each piece's steady temperature over the contact graph, the hot pieces held,
heat conducted by Fourier's law through each contact (the conductances `flowOver` uses, now one function,
`edgeConductances`), every piece losing to the air from its surface by `heatLoss` (Holman's natural convection and
radiation, its emissivity, else 0.9), linear and worked again from the temperatures it gives. `conducted` in
`make/rules.ts`, run with the other rules: a piece hotter than its material stands is a heat finding, with the hot
piece its heat comes from. A piece whose own conductivity is not known (rubbers, most polymers: not in the tables) would
read the air's temperature, never safe on that account: it is judged at the face it touches, said. Pieces are cut into 8 slices along their longest side
(step G), so a long plate is hot by the exhaust and cool at its far end: lumped whole, the autopilot's own test failed,
the battery it had moved onto a plate the exhaust also touched read the plate's average, 140 °C; sliced, it reads the
plate where it stands, and the test passes again. Checked on a rig: a pipe at 400 °C, the rubber mount on a steel
bracket on it is said at 243 °C (the bracket's tip) over its 80 °C; a rubber pad in the open is not. What it found,
left as findings (design is parked): the semi's fibreglass hood shell touches its 700 °C turbine housing (a geometry
fault: the hood is on the turbo) and a silicone gasket on that housing reaches 304 °C over its 230 °C (a turbo's
gasket is metal). A finding on the car's oxygen sensor lead, made while lumped, went when sliced: withdrawn. Still to do in H: placement's heat map and the loads reading the engine.

**Step H, placement's heat map (2026-10-28).** The heat field (`placement/fields.ts`) took only the hot surfaces as
sources; what touches them, warmed by conduction, heats the cells round it too. Now each slice of every piece in the
region gets its steady temperature (`temperaturesOf` over the sliced contact graph) and, warmer than the air by more
than 10 °C, is a source like the hot surfaces, in bands of 10 °C; the field says how many slices were warmed this way.
The placement, autopilot, field and rules nodes' own tests pass. Not done in H, said: the load cases (`loads.ts`) are
closed forms on one part each, and read nothing from the graph yet; that waits on F's second round (bending through an
assembly), which gives them something to read.

**Step F, second round (2026-10-28): bending in 3D.** `bentUnder` (`graph.ts`), node `bend` (How it bends under a load):
any thing as a 3D frame of Euler–Bernoulli beams over its sliced contact graph, each node free to move and turn six
ways; between a piece's slices a beam of its own section (a box's two second moments and Roark's torsion constant, a
cylinder's) and material (E, and G from Poisson's ratio, else 0.3); between pieces, a beam bonded through their patch;
held and pushed where said, by what pieces are; solved at once by conjugate gradients. Checked: a 1 m steel bar 20 mm
square, held at its bottom slice and pushed 10 N sideways at its top, moves P a³ / 3 E I to twelve figures both ways
across it, and pushed along it P a / E A, exactly (the node's own test); the rods with the block pushed sideways,
323 kN/m, near two rods clamped at both ends worked by hand (12 E I / L³ each, about 327). Seen: drawn bent, its
movements exaggerated, red where it moves most. Said on the node: small elastic movements, slender pieces (a block's
shear left out), contacts bonded, no buckling yet.

**Step F, stress and buckling (2026-10-28).** The frame now gives each beam's worst stress (its ends' forces from their
movements: stretch and both bendings at its outer fibre, with its twist's shear, as von Mises) over its material's
yield (else its ultimate), and the push at which the first yields, with where; and the push at which it buckles
(linear buckling: each beam's consistent geometric stiffness from the axial force it carries, the least λ with
(K + λ K_g) singular by inverse iteration). Checked by hand: the 1 m bar's root stress 7.03 MPa, first yield at 526 N
(10 × 370 / 7.03), to eight figures; stood up and pushed down, it buckles at Euler's π² E I / (2a)² = 7,673 N, to seven
figures, in 31 ms; pulled, it does not buckle. Both are the node's own tests. Found on the rods board: 200 N sideways
puts the annealed copper rod past its yield (it yields at 184 N), so the board pushes 100 N and says so. With this, the
engine does all `path.properties` did but growth when warmed and the mismatch between neighbours (thermal loads, next).

**F, thermal loads, and I: `path.properties` retired.** The frame takes an even warming: each element pushed by its
fixed-end force E A α ΔT, the stress said net of it. Checked exactly: the 1 m steel bar left free grows α × 0.9375 m ×
50 K to the last digit, unstressed; held at both ends it is pushed by E α ΔT = 117.875 MPa, to the last digit (the
`bend` node's own test). `bend` takes "Warmed evenly by, K" and holds "the lowest and the highest pieces" together. On
the rods board, warmed 50 K, copper and aluminium grow apart under the steel block, and the board says how hard that
pulls. With that, `path.properties` (pieces named in order along an axis) does nothing the engine does not, from the
geometry: it is gone, its id now opens `bend`, and its code (`alongPath`, `END_K`) is deleted from `madeof.ts`.

**E, seen smoothly.** A heat map drawn one colour per slice showed the slices, not the heat. Between two points where the
level is known, the law that carries it sets its shape, as a string's shape between two hands is set by the string: steady
conduction with no source and no loss from the sides is a straight line (Fourier's law in one dimension). So each contact
now gives the level at its two faces (the middle's level less what each half drops), each whole piece is drawn once with
its slices' middles and faces run along it (`Field` in `assembly.ts`), and the renderer colours every point of it, its
triangles halved along their longest side until they are fine enough. No seams where it was cut; the colour bends where
copper meets aluminium because the law does. Bending is next: a beam's shape between two slices is the cubic its end
movements and turns set (Hermite), the same idea.

**F, seen bent as beams bend.** The bent view moved each slice as a block, so it showed steps. Between two slices the
beam the frame solves (Euler and Bernoulli's, loaded only at its ends) takes exactly the cubic its two ends' movements and
turns set (Hermite's), its stretch straight between, each section turning as a whole (`Bend`, `bentAt` in `assembly.ts`;
`bentWhole` in `graph.ts`). Each whole piece is now drawn once, every point of it moved by that and coloured by how far
it moves. Checked against the textbook: a 1 m steel cantilever pushed at its top, its drawn shape against P x² (3a − x)
/ 6EI at a hundred points along it, agrees to 10⁻¹² mm at 2, 4, 8 and 16 slices (slice by slice, it was up to 1.3 mm
out). On the rods board the two rods sway in the S a frame makes when the block keeps their tops from turning.

**H, the load checks read the frame.** The engine's con-rod rows had been hand formulas on a section typed beside the rod
(0.7 of its width by 1.6 of its beam, 0.62 filled), its buckling Euler's with pinned ends about its thin way. They now read
the rod as drawn (`rodFrame` in `loads.ts`): its beam in slices, its eyes and cap bonded where they meet. For that the frame
learned two things every engineer expects. Supports by kind: a held piece holds only the movements said (a slide leaves
its way free), and can be held at a point, not its middle, going round it as it turns (u = θ × r, solved for its turn):
the bearing shells held at the crank pin's axis, the small end kept in line by the piston and turning about the wrist pin.
And a part's stated fill (a forged I-section's 0.62 of its box) taken into its section. Checked: pushed with 40.7 kN, the
beam's stress is the hand formula's 268 MPa exactly; it buckles at 294 kN, against 296 kN for Euler's pinned ends in the
plane the crank turns in (the eyes give a little). The hand row's 226 kN was about the rod's thin way with pinned ends,
which the pin's bosses and the throw do not allow; first held at the shells' own middles it read 794 kN, the big end
locked against turning, which is what showed supports at a point were needed.

**Phase 2.1, the taxonomy's schema (2026-10-29).** Every node can now carry a specification (`Spec` in `blocks.ts`): its
name is its discipline's term and its plain question becomes its gloss; its place in the disciplines tree; codes on
recognised schemes (MSC2020, PhySH, ICS, ACM CCS 2012, JEL, each checked against that scheme's form); its role (data
source, geometry operation, analysis, numerical solver, assessment, data transformation, control flow, visualisation,
I/O); and, for what models, its model (governing equations, the book's laws, class, steady or transient, linear or not,
numerical method, references). The one test holds every node changed from `SPEC_FROM` on to it (`specProblems`: a name
that is a question fails, a discipline not in the tree fails, a code not of its scheme's form fails, a model without an
equation or a reference fails); the rest are specified as phase 4 re-works them. Search finds a node by its term or its
gloss; the inspector shows the whole specification. The first three: `graph` is now Contact graph (mechanical › machine
design › computer-aided design and geometric modelling, a branch added to the tree; MSC2020 05C90), `flow` Lumped network
analysis (mechanical › thermal and fluid sciences › conduction; MSC2020 80A19; Incropera ch. 3, Shigley eq. 4-4), `bend`
Frame analysis (3D beams) (civil › structural › structural analysis; MSC2020 74K10; Przemieniecki 1968, Roark). Each
MSC2020 code was checked against the AMS's MathSciNet listing. Law nodes are left to phase 4, where their specification
is read from the book.

**Phase 2.2, one heat solver (2026-10-29).** `heatflow.ts` was a second heat solver (lumped, stepped in time, its own
conductances), and the only thing that used it was `Workshop` in `generate.ts`, the old word-driven workshop: 1,250
lines nothing reached (the reach check sees files, not classes, so it had stayed). Both deleted, with every declaration
only they used (pruned by the compiler's own unused-code report until none was left: `generate.ts` 1,667 lines to 180,
now only the expression language nodes use) and `engineering/motorrun.ts`, reached only by them. What was worth keeping
moved into the engine: `temperaturesOf` (`graph.ts`) now runs steady or in time (backward Euler, each piece holding m c,
its air loss read again each step, what went in, to the air and was held more balanced), takes heaters, and the contact
resistance where pieces only touch (`TOUCHING_R`, Incropera Table 3.1b, said as an estimate past aluminium). The flow
node takes it as its default (`touching`; `none` for one body): the rods board's resistance goes from 3.6 to 5.7 K/W, the
faces between block and rods now most of it, and its evidence is said as estimated. New node, specified from the start:
Thermal analysis (conduction, convection, radiation) (`thermal`, gloss How hot each piece gets; MSC2020 80A19 and
80A21), checked exactly: 10 W through two sealed copper cubes, 20 + 10 R; and the free cube warming toward 100 °C in
time, 100 − 80 (1 + dt/RC)⁻²⁰⁰ to the digit (the continuous exponential is 0.11 % above, the step's own error). On the
rods board, 5 W into the steel block settles it at 35.3 °C, the rods' tops at 31 °C.

**Phase 2.3, the engine's leftovers, first round (2026-10-29).** Frame analysis takes how each held piece is held: clamped,
pinned, or the components held as a Nastran SPC numbers them (1 2 3 along x y z, 4 5 6 turning about them), one for each
held group ("1235 and 135": a column pinned at its foot and on a slide at its top). A piece held only in part can be
pushed. Checked: that column buckles at Euler's π² E I / L² to 10⁻⁵. It now gives its worst stress (`stress`), and the
warmed bar held at both ends is checked against E α ΔT = 117.875 MPa exactly in its own test (found: that test had
checked no output at all, so the exactness reported for it earlier rested on a probe, not the test). It says how its answer
settles: cut into half as many slices and worked again, the two said and how far apart. If it does not settle, it says it
may be held too loosely to stand. The flow's view draws what crosses each contact between pieces as an arrow the way it goes,
sized by how much (`arrowsOf`), drawn over everything so it reads through the solid it crosses (`overlay` on an override;
a stand-in keeps every marker whatever its level).

**Phase 2.3 done: the frame through the book (2026-10-29).** Every section and stiffness of the frame is now a law of the
book, worked through the law engine (units, its domain, its evidence), not a formula of the frame's own: six new laws,
each with its source and worked example, run as its own test: the area, second moment and polar moment of a circle
(Shigley table A-18), the torsion constant of a rectangle (Roark's Formulas for Stress and Strain, 7th ed., table 10.7;
an approximation, kind said), the torsional stiffness of a bar G J / L, and the flexural stiffness of a beam E I / L,
each end stiffness of a beam element a whole multiple of it (Przemieniecki 1968, ch. 5); with the rectangle's area and
second moment, the bar's axial stiffness and the isotropic shear modulus already in the book. Each is worked once for each
distinct set of figures. A law that refuses its figures is said, and that beam carries nothing. The frame says the laws it
used. Its tests come out as before, to the same digits (the same mathematics, now with one owner).


**Phase 2.4, materials from their phases (2026-10-29).** The user: "do advanced math to figure materials out … populate
it with what's possible, different types, mixes … link it to an open source buy tomorrow". A material is now worked
out from what goes into it and how it is arranged (`mixture.ts`; `mixedMatter` in `matter.ts`; node Composite and
mixture properties (micromechanics), `mixture`): density by volume fractions and specific heat by mass (Kopp–Neumann),
exactly; stiffness, heat and electrical conduction within Hashin and Shtrikman's bounds for any number of phases, and
estimated by the arrangement: particles in a matrix (Maxwell, Hashin), aligned fibres (rule of mixtures along,
Halpin–Tsai and Rayleigh across, a fibre's own modulus across where it has one), random in a plane (Tsai–Pagano), woven
(the mean of along and across), layers (Voigt and Reuss), grains (Bruggeman), open foam (Gibson–Ashby); expansion by
Turner; strength along aligned fibres as the ideal. A solid solution (an alloy mixed atom by atom) is refused its
conduction and says why (brass conducts 120 W/m K, a mix of copper and zinc would say 300). The phases' figures are in
`data/constituents.ts`: Toray's T300 datasheet for the carbon fibre, a secondary table for E-glass, Incropera for air,
and the rest typical, each said so until a supplier's datasheet confirms it. Seven mixtures are materials like any
other (`MIXTURES`, parts may be made of them): unidirectional carbon/epoxy at 60 %, random and woven glass/epoxy,
aluminium with 20 % silicon carbide, thermal paste, concrete as aggregate in paste, aluminium foam at 10 %. Checked:
carbon/epoxy along the fibres 139.2 GPa against Toray's own laminate at 60 %, 140 GPa (its ideal strength 2,136 MPa
against Toray's 1,820, the 85 % laminates reach); across it 7.7 GPa (typical 8 to 10); woven glass/epoxy 23.9 GPa
(circuit-board laminate is about 24); aluminium–silicon carbide 92.7 GPa within bounds of 92.7 to 114.7 (measured
about 100; the matrix bound is the lower one); concrete 33 GPa, 2.0 W/m K, 2,475 kg/m³. On a new starter board a 1 m
bar of the laminate bends 1.48 mm under 10 N where steel bends 1.005, as their moduli say (the frame takes the laminate
as isotropic at its along-fibre modulus: right for bending along the fibres, too stiff in twist). Next: suppliers'
datasheets, open-source, to confirm or replace every typical figure (asked for tomorrow).

**Phase 2.4, the stand-ins replaced (2026-10-29).** Of the 76 specified solid materials, 28 had taken their core figures
(modulus, Poisson's ratio, conductivity, specific heat, expansion) from another grade (every plastic from PMMA, every
rubber from natural rubber, tool steel from 1018); none does now. The grades without a handbook row of their own have
typical figures (`data/constituents.ts`, said so, for a supplier's datasheet to confirm). Physics gives what it can: a
heavy element's specific heat by Dulong and Petit, 3R per mole (gold 126.6 J/kg K against the handbook's 129, silver
231 against 235, tungsten 135.7 against 132, lead 120 against 129); a metal's thermal conductivity from its electrical
by Wiedemann and Franz with Sommerfeld's L₀ = π²/3 (k_B/e)² (gold 294 W/m K against 318, silver 451 against 429, lead
34.4 against 35.3), the mixture node's test holding gold to L₀ σ T. What were typed figures for mixes are now worked
from their phases: PA66 with 30 % glass by mass, 1,366 kg/m³ (sold at 1.36 to 1.37 g/cm³), 8.1 GPa; FR-4, 1,870
kg/m³ (about 1,850), 23.9 GPa; glass wool at 24 kg/m³, 0.029 W/m K (about 0.035 measured: radiation through it is left
out, said); the 25 MPa concrete as its own recipe's hardened phases (paste, sand, granite and the 4 % air its cubic
metre leaves), 33 GPa, 2.2 W/m K. Left without a core figure: the woods' Poisson's ratio and expansion (they differ by
direction), the loose textiles, and the foams' Poisson's ratio.

**Phase 2.5, balances and the solvers' own error (2026-10-29).** A node may account what it conserves (`_balance`: what
goes in, out and is kept, or its imbalance against its scale) and the engine judges it the same everywhere: an
imbalance is warned of only when it is more than twice its standard uncertainty (95 % covered: the node's own, and
that the engine carried onto the port it names) and more than its tolerance, never corrected. The balance node is
judged so: 100 ± 3 J in against 90 ± 4 J out is 10 ± 5 J, not warned; 100 ± 1 against 90 ± 1 is 10 ± 1.4 J, warned
(its `violation` output stays the fixed-tolerance verdict). Applied along the chains: the thermal analysis's energy in,
to the air and held; the flow's Kirchhoff balance at every junction; each motor in the physics, its electrical energy
against its copper's heat, its friction, its gears' loss and its work out (the electrical-to-heat chain). Collisions:
see below (the energy is not lost, it is moved). The solvers' own error is now in their ±: how far
halving the slices moved the answer, taken whole as the error of the finer cut, summed in quadrature with the
materials' spread. Found by it: on the rods board the flow's 5.72 K/W is ± 0.16 (2.8 %), but the frame's give under the
side push is 0.31 ± 0.09 mm (29 %), not settled at 8 slices; the contact links run from slice middle to slice middle, so
their length (and stiffness) changes with the cut. The frame's contact link is to be made independent of the slicing
(phase 4, with the frame's re-check).

**Phase 2.5, the frame's joints made independent of the slicing (2026-10-29).** A joint between two pieces was one beam of
the contact patch's round section from slice middle to slice middle: its length, and so its stiffness, changed with the
cut. A first fix (each piece's own section in series to the contact point) made it worse, the give growing without
settling (0.10, 0.22, 0.35, 0.63, 1.12 mm at 2 to 32 slices): the block's slab met the rods 15 mm to one side of its
middle, and the half took its section across that side, a sliver that thinned as the slab was cut. Now each half runs
along the contact's normal through the point where they meet, from the plane through its piece's middle to the face,
with that piece's own section and material, the two in series; each end is tied rigidly to its piece's middle (an end
offset, u = u₀ + θ × r, carried into the stiffness, the stress, the buckling stiffness and the thermal load). The give
now settles: 0.186, 0.278, 0.337, 0.370, 0.388 mm at 2, 4, 8, 16, 32 slices, each step about half the last. What still
moves with the cut is where it is held: a held piece is clamped at its slice's middle, which comes nearer its end as it
is cut finer (its free length grows; the give with its cube: 2.26 times from 2 to 32 slices by that alone, 2.09 seen).
Holding at the face rather than the middle is the next refinement. The con-rod's check is unchanged (294 kN; its eyes
meet its beam head on).

**Phase 2.5, energy moved, not lost (2026-10-29).** The user: "energy collisions don't lose it, it can relocate into
thermal energy and the molecular energy … it's a scale thing, everything is made of energy trapped in loops". So the
physics now accounts its energy whole: each body's mechanical energy at the start and the end (½ m v², ½ ω·I ω in its
principal frame from the engine's own inertia, m g h against the engine's own gravity), the work done on them (pushes as
F·v at the centre of mass, motors' work out), and what the bodies' mechanical energy no longer holds at the end gone
into their molecules' motion: heat (collisions, sliding, joints' friction, and the engine's own numerical damping, which
in the real thing is the air and the hinge). Where the heat lands the engine does not say (which contact, how much to the
floor); if it all stayed in the bodies, shared by their heat capacity (m c of their materials), they are this much
warmer together: the most it can warm them. Heat below nothing would be energy made from nothing, the engine's own
error: judged as a balance and said. Checked: a 100 mm steel cube let fall 0.5 m and come to rest turned m g h = 38.5 J to
heat, to 0.5 % (the node's own test). On the boards: the steel ball into the wooden tower, 57.2 J at the start and 56.7 J
of push, 17.1 J left mechanical, 96.8 J to heat (0.028 K warmer, at most); the cart, its motors' 2,079 J, 1,995 J into
its motion and 83.8 J to heat; the pendulum, 0.345 J of its 32.2 J to heat over its run (the hinge solver's loss: in the
real thing, the hinge's friction and the air).


**Phase 3, steps 1 and 2: a metal's colour from its physics (2026-10-29).** The user: "why is metal silvery grey, why is
copper its colour". Now worked out, not chosen (`colour.ts`, `data/optics.ts`, node Reflectance colour (Fresnel, CIE
1931), `optics.colour`): each metal's complex refractive index n + i k measured at every wavelength (Johnson and Christy
1972 and 1974, Rakić 1998, Querry 1987, Golovashkin, from the refractiveindex.info database, public domain) gives what
it reflects at each (Fresnel); the CIE 1931 observer under D65 daylight weighs that into XYZ, and the sRGB primaries into
what a screen shows. The eye and the light as tabulated in colour-science (the CIE's server was not reachable from
here). Compared with Hoffman's table of metals' reflectance in linear sRGB (Physics and Math of Shading, SIGGRAPH 2013),
worked independently: palladium (0.733, 0.697, 0.652) to the digit (the node's own test), chromium 0.550/0.556/0.554
against 0.549/0.556/0.554, aluminium within 0.01, platinum within 0.006, copper, nickel and iron within 0.04, titanium
0.08 brighter (another measurement of it), zinc within 0.09. Gold comes out past what sRGB can show (red 1.04): more
saturated than a screen, said. Found: the first data for tungsten, platinum, zinc and lead (Werner 2009, from
electron energy-loss spectra) made platinum reflect 95 % where it reflects about 65 %; replaced by optical
measurements. Tin has none covering the visible here; lead's starts at 450 nm (held below, said). It says why: copper
gives back 94 % of red, 62 % of green and 54 % of blue, its electrons taking the bluer light; silver 98 to 99 % of every
colour, so white-silver. A starter board of fourteen polished spheres, each coloured only by this.
- **2026-10-29, phase 3.3, surfaces from the process (first half).** `finish.ts` keeps twelve processes (turned,
face milled, printed, ground, brushed, polished, lapped, bead blasted, sand cast, die cast, forged, spark eroded). A cut
surface is worked out from its feed and tool radius: the tool's arcs one feed apart give Ra = f²/18√3 r (Shaw), Rq =
f²/4√45 r, and its facets' rms slope across the lay f/2√3 r. A random surface takes the figures typical of its process,
labelled. How much light stays in a mirror image is Davies' exp(−(4π Rq/λ)²) at 550 nm; how wide the highlight spreads
is the facets' slope (GGX α), so the renderer's roughness is √α along the lay and the lay is anisotropy across it
(MeshPhysicalMaterial). Found: calling a surface "matt" from the mirror-image share alone was wrong; a turned shaft
gives no mirror image yet a sharp highlight. Its look is now said from the slopes, and its image from the heights.
"Polished" made a true mirror polish (Ra 0.02 µm, 72 % of green light kept in the image). Every part's finish word
maps to its process (machined → turned, chrome → polished, cast → sand cast, satin → bead blasted), and the process
names are finishes themselves, wirable into any shape (a new `finish` input). A node, `surface.finish` (ICS 17.040.20),
tested on the cusp formula and Davies' share; a starter board of five steel bars, iron's colour from its optics, one per
process. Seen: turned and ground streak along the axis, polished mirrors the room, blasted is evenly matt, cast grainy.
Left: a turned end face shows radial marks where facing leaves rings.
- **2026-10-29, phase 3.3, colours with no dye (second half).** A film on a metal, worked out: Airy's sum of every
reflection inside the film, r = (r₀₁ + r₁₂ e^{2iβ})/(1 + r₀₁ r₁₂ e^{2iβ}), β = 2π N₁ d/λ, with complex indices (an absorbing
film damps the wave from below), wavelength by wavelength through the CIE eye under daylight (`colour.ts`
`reflectanceFilm`, `filmColour`). Films kept with their measured n + i k (refractiveindex.info, CC0): amorphous TiO₂
(Jolivet et al. 2023), hematite and magnetite (Querry 1985), amorphous alumina (Boidin et al. 2016). Checked: titanium
under TiO₂ runs bronze, purple, blue, pale blue, gold, rose, magenta, teal, green as it thickens, the anodised palette;
at 2 nm per volt (inside the published 1.5 to 3) it lands on the Heliyon chart's colour at each of 10 to 100 V. Iron
under magnetite runs straw, brown, purple, blue, grey-blue: the temper colours. Hematite gives duller ones, so heat
tint is taken as magnetite (the oxide next to the steel), said. Not found: visible data for Cu₂O (Querry's starts at
2.5 µm) and for chromium oxide, so copper's tarnish and stainless heat tint wait for data; a temperature and time to a
thickness needs the oxide's growth law, not kept yet. A node, `optics.film` (tested: no film is the bare metal by
Fresnel; a quarter wave of n 1.5 on n 3 reflects ((3 − 1.5²)/(3 + 1.5²))² at 550 nm), and a board of twenty coupons.
- **2026-10-29, phase 3.4, a part's look as layers (first half).** `appearance.ts` owns a look as data, bottom up:
the substrate's colour worked out from its material (steels as iron, aluminium alloys as aluminium, copper, titanium,
gold and the other measured metals; stainless, brass and bronze have no data here and keep their colour, said), a
treatment grown on it (an anodic or oxide film, coloured by `filmColour`), a coat over it (a paint's colour, a design
choice; its metal flake as metalness with a sparkle grain; a clear coat, F0 0.04 at n 1.5), and wear. The look rides on
the part or on the override that places it, and is resolved per piece against that piece's own material when drawn,
so one look over an assembly colours a steel bolt and an aluminium bracket each by its own optics. A node, `look`
(ICS 25.220, 87.040), tested on bare steel taking iron's colour, titanium anodised at 30 V, and a chosen paint; a board
of one sphere in eight looks. Seen: the metals, anodising, heat tint, clear-coated and metallic paint all read as they
should. Left: wear only dulls and dirties; paint coming off at edges (by curvature) and dirt in hollows (by occlusion)
not yet; graphics (livery, decals) not yet a layer; heat tint from the part's own computed temperatures needs the
oxide's growth law.
- **2026-10-29, phase 3.4, graphics and wear where the shape puts it (second half).** Graphics are a layer of the look
(`appearance.ts` `Graphic`): stripes and two-tone splits across an axis of the piece's own frame, under the wear, two
per look, set on the `look` node. Wear reads the surface's own shape. Each vertex gets its mean curvature (from every
mesh edge, (n_j − n_i)·(p_j − p_i)/|p_j − p_i|², pooled where copies of a point meet) and its distance to the nearest
sharp feature (a crease, or a rounded edge tighter than 4 mm). This is `kit3d.ts` `surfaceShape`, run on the piece's
geometry split finely first (`space3d.ts` `wornGeometry` over `refined`, which now carries texture coordinates).
A coat chips off within a reach of its edges that grows with wear (1 mm + 12 mm × wear), cut crisply and broken up
at two scales, and shows the substrate under it with its own computed colour. Bare iron rusts in patches and hollows.
Dirt gathers in hollows. Found on the way, each fixed: curvature read from screen-space derivatives missed every edge
narrower than a pixel and drew each triangle flat (the torus showed its facets); per-vertex distance on a mesh whose
faces have no inner points made every point an edge (the box and drum came out bare); the split mesh without texture
coordinates broke the ground finish's anisotropy (pieces drawn white). Seen: the panel and the drum chip at their
edges and rims, the tube rusts in spots. Left: a smooth piece with no edges (the ring) does not chip, true to the
rule but perhaps not to wear by handling; decals and text not yet; heat tint from computed temperatures still needs
the oxide's growth law.
- **2026-10-29, phase 3.5, close-ups and a blind check (first round).** Five boards rendered close and given to an agent
with no context, asked what is cheap or fake. Its top findings: every object showed one and the same reflection (three
blobs over a square: three.js's RoomEnvironment), so fourteen metals read as one sphere copied; stripes and chip edges
stair-stepped; chips scattered on flat faces; turned ends showing coarse wedges where facing leaves rings; gold olive
(its colour checked: linear 1.04, 0.73, 0.37 against the measured 1.0, 0.78, 0.34, so the lighting, not the colour).
Fixed: one studio environment for the app (`kit3d.ts` `studioScene`: a room with softboxes and a lighter floor, so a
metal shows a horizon and each light as a shape; the dock and the part viewer share it); graphics and chip outlines
antialiased by each pixel's footprint; a primer rim at each chip (the paint's thickness); stray wear patches cut
right down; turned, machined, ground and threaded grain measured by radius and height from the piece's axis, and
its anisotropy off on faces square to the axis (rings on a faced end, no wedges). Seen after: the spheres read as
photographed balls, the bars' ends clean, the chips crisp. Left from the check: no floor under things in the space
(by the space's design: a void with a grid; a stage for look-dev boards is a choice for the user); no scale cue; a
polished bar mirrors mostly floor and reads flat grey; blasted and cast metal still read near plaster; plastics have
no subsurface glow; sheet parts (the tube cut) have no thickness.
- **2026-10-29, phase 4.1, the engine's load rows read the drawn parts.** The rod bolts, the crank-pin shells and the
wrist pin were worked out from formulas parallel to the drawing (a thread from 0.85 × the bore, a shell 0.86 × the rod's
width, a pin bored 0.56 of its diameter): right only while the formulas matched the parts, wrong without a word for any
rod or piston wired in. Now each is read off what is drawn: the bolts by their catalogue item and class (`families.ts`
`boltOf`, and `proofStress` from ISO 898-1 table 3, kept now), how many hold the cap, the stress area from the thread;
a shell's bore and width from its profile; the pin's outside and bore from its lathe profile. A piece not drawn is a
row that fails, said so, not one that passes. Found by reading them: the drawn rod bolts were class 8.8 (580 MPa proof)
while the check judged them as 10.9 (830 MPa); rod bolts are 10.9 or 12.9, so the rod now carries 10.9 (margin 2.88 at
6,600 rpm). Seen with it, already shown: the starter engine's valve spring lets its valves float above 6,304 rpm,
under the 6,600 rpm its board runs (margin 0.91), a design fault in that spring for that speed, left for the rebuild.
- **2026-10-29, phase 4.2, the laws held in the math hierarchy.** The user's rule for the law nodes: current if they fall
into the math node hierarchy with no contradictions. `lawFits` (lawgraph.ts) holds each law to it. (1) Its term is
rewritten in the math nodes' own language (`asFormula`: the Formula node's, an integral by the Integral node's
adaptive Simpson) and run: it must give what the law gives. (2) Its worked example holds. (3) Solved back for each
input from that example, it holds again wherever it lands (another root is not a contradiction; no root in range is
said). (4) No chain of other laws to the same quantity gives another answer. Units are held already: a law whose
term and ports disagree is never built. Found on the way: the Formula language lacked asin, acos, atan, log2, log10
and erf, functions the laws use, so not every law could be written as math nodes; added (`generate.ts`). The cross-check
called four laws contradicted that were not: it reached a rectangle's area through a circle's (a length is not said
to be which length of which shape) and a box's volume through an ellipsoid's, and held the pendulum's series to its
exact elliptic integral at 10⁻⁶ when they differ by 5 × 10⁻⁶. Fixed in `crossCheck`: geometry laws are not ways to
each other, and an approximation or an empirical law agrees within 10⁻³ (an estimate), its difference shown. All 330
laws fit; 10 are reached another way and agree. The record (`book/fits.ts`, each law's hash with it) is written with
the generated docs (the cross-check takes a minute, too long for the gate); a law changed since counts as before the
update until worked out again, and a law node that fits shows as current (`builtOf` in evidence.ts).
- **2026-10-29, phase 4.2, the first fields re-checked: finance, operations, energy, electronics, materials (20 nodes).**
Each read again with its tests, given its discipline's name, a gloss, its place in the tree, codes and its model:
- **Finance:** the loan is an amortisation payment (JEL G21, G51) and NPV is capital budgeting (G31). Compound
  interest is E43; break-even (cost–volume–profit), margin and markup, depreciation and the running balance are M41.
  Relative change is C43. All of it sits under a new branch, `manufacturing.industrial.economy`, engineering economy,
  which IISE counts in industrial engineering.
- **Operations:** OEE is defined by ISO 22400-2 (ICS 25.040.01). The critical path method is MSC2020 90B35, after
  Kelley and Walker (1959).
- **Energy:** battery runtime at constant power is ICS 29.220.01. Daily photovoltaic yield is ICS 27.160, with
  IEC 61724-1's performance ratio.
- **Electronics:** the divider, the LED resistor and the RC corner are MSC2020 94C05 with their ICS components. The
  netlist, the cell and the switch-level run are ICS 31.200 and 35.160, the run after Bryant (1984).

Found on reading:
- **Silent Infinity:** seven nodes divided with no guard and gave Infinity without a word. They were battery runtime
  at no load, margin at no price, markup at no cost, relative change from nothing, NPV and the loan at a rate of −100 %
  or less, the divider with no resistance, and the LED resistor at no current. Each now refuses, saying why.
- **Relative change from a negative value** had its sign turned; it now divides by the magnitude, tested.
- **Untested outputs:** the divider's current was never tested, and is now.
- **No tests at all:** `cell.characterise` had none and now has a hand-made two-input NOR, read back as
  NOT (a OR b) with its truth table. `netlist` and `logic.run` still have no offline test. They fetch the real 6502
  netlist, and only the 6502 starter board runs them, said so.
- **The ACM CCS 2012 code form** was wrong (it expected "10.…"). Its concept ids are eight digits (10010293); fixed.
  The ACM site is not reachable from here, so the chip nodes are coded on ICS, which is known, rather than by guessed
  ACM ids.
- **2026-10-29, the 2004 Chevrolet Monte Carlo SS from its first parts (asked by the user as a challenge).** Its figures
from search results (spec pages blocked from here): 197.9 × 72.7 × 55.2 in, 110.5 in wheelbase, 62/61 in track, 11.93 in
vented and 10.94 in solid discs, struts at both ends, P225/60R16, 5 × 115 studs; the 3800 Series II (L36) V6, 96.5 ×
86.4 mm, 200 hp, 225 lb-ft; its lines, ground clearance, wheel offset and engine place are estimates, said so. What it
took, by the clock (08:00:35 to 08:22:15 for the build, its checks clean): the engine owner learned a banked vee (it
knew only a vee twin: one pin, a head on each cylinder): cylinders by bank with paired rods on pins at 0, 120 and 240°
(the 3800's split pins drawn as one, said), four mains, a barrel and a head along each bank, bulkheads bored where
the banks' bores pass, an intake plenum in the vee with its injectors and rails, a manifold, gasket and heat shield on
each bank and a crossover under the pan; the transaxle owner an automatic (torque converter, drive chain, two planetary
sets with clutch packs, valve body); the car record a V's angle and an iron block; the cooling module placed by the
heat gate's own distance from the engine's hottest forward piece (it had been a fixed 0.11 m from a box that left a V's
manifold out); the heat figures moved into make/heat-limits.ts so placing reads them without an import cycle; CV boots
neoprene (polychloroprene, typical figures), as they are made, the generic 80 °C rubber failing beside an 81 °C
transaxle; an automatic's drive plate filed as a kind of flywheel. Found by the checks and fixed: 31 then 32 rule
findings (an alternator inside a bank, exhausts starting inside the head, a rail through the runners, pistons in the
bulkheads, the crossover through the transaxle, the fan 73 mm from a manifold, the drive plate's absence), then 7 unmet
recipes. Result: 8,702 pieces, built in about 2.5 s; nothing runs into, rubs or overheats anything; every recipe met.
Not done: its drawn mass is 780 kg of its published 1,558 kg (the rest padded and said); its body is a generic coupe on
estimated lines and is not recognisable as a Monte Carlo (its grille, lamps, side sculpting and deck spoiler not
drawn); its board freezes the page for tens of seconds (the checks run on the page's own thread).
- **2026-10-29, the library law: every piece built is stored (asked by the user: "you either use what's in the library or
create something and store in the library").** `stock.ts`: a piece is stored by its design (its shape, material, cuts,
make and what it is, and the pieces in it each by design and by where it sits), not by its name, colour, look, place or
neighbours, so one design used in many places and many builds is one entry. Every node that makes a thing is a build (each
real vehicle model once each): 126 builds, 4,287 pieces stored at every depth, 1,394 of them made of others; of the 640
the Monte Carlo is made of, 218 are shared with other builds. Written to `src/data/stock.json` (421 kB) by the docs run;
the one test fails on a piece built and not stored, stored and no longer built, or stored where its build no longer has it.
Searchable as "Built parts" in the library; the Stored part node takes any of them out (its build run once: about 3 s for
a car, measured), with what it is made of and the builds that use it. Found on the way: `check.balance` had no
specification and the plain gate failed on the last two commits (they were checked with UPDATE_DOCS=quick, which skips
that check); specified. Gate with the law's check: 36.5 s. Not yet: a piece a person makes in the browser is not stored
for good (only what the committed builds make is); the builders do not yet ask the library first when they draw (the
same design drawn twice is stored once, but still drawn twice).
- **2026-10-29, builds take their pieces from the library (the second half of the law).** `fromLibrary` (assembly.ts),
called by the node engine on everything a node makes: each piece inside a part designed whole and still (`sealed`, which
the make pipeline never changes inside) is taken from the pieces the library holds while building where one equal in
every way is there, and put there where not. Measured on every vehicle: each build is the same in every value after
(compared as JSON), and the Monte Carlo's rules (0 findings) and take-apart audit (0 recipes not met) read the same. It
saves less than the stored count suggested: the builds already held a repeated piece as one object (the Monte Carlo
places 9,717 pieces with 2,677 objects; 2,520 after; the Cascadia 4,434, 3,400 after), at 14 to 63 ms a build. Not taken
from the library: pieces outside sealed parts (17 places in the code change a part after it is made: the detail pass,
the critic's moves, conditions), until those work on copies.
- **2026-10-29, the Monte Carlo as in the user's photograph.** Its lines measured off the photograph (side-on), scaled by
its 110.5-in. wheelbase (its tyres agree to 2 %), its overhangs by their published lengths (the photograph foreshortens
its ends): the windscreen's foot 0.274 of its length, its roof from 0.40, its back glass's foot 0.76, its belt 0.675 of
its height; estimates, said so. A body kit any car can carry (`BodyKit`, `bodyKit` in machines.ts, fitted to the skin as
made by `skinOf`, `archLip`, `lowAt`, `topAt`, `endAt` in panels.ts): riveted flares round each arch, skirts, a front lip,
a rear valance, a scoop's insert on each rear quarter, a wing (a cambered blade on two uprights, end plates), each in the
inventory. Wheels may carry an accent painted down each spoke and round the rim (look layers, not pieces). The user's
build a second record (gloss black, the kit red, 20-in. black and red wheels on 245/35R20s; colours sampled from the
photograph). Found on the way: a real model in the car kit took a colour picked at random when no colour was said (why
the stock car rendered silver; the kit now says which choices were said); a rear seat's back was sized by the roof and
glass over it, not the deck lid (the measured lines brought the lid over it; any car's deck lid now counts). Rules: 0
findings; recipes: all met. Blind check: read as "a black two-door coupe with red aftermarket add-ons", taken for a
Holden Monaro / Pontiac GTO at about 25 % confidence, not a Monte Carlo; its list: flares flat and stuck on, a smooth body
without mirrors or shut lines that read, the arches seen through, a crude wing, the lip and valance floating as blades,
the scoop insert an outline that reads as a bracket, the skirts flat bars, the ends unfinished.
- **2026-10-29, the Monte Carlo's kit, second round (from the blind check).** Flares are now moulded surfaces through four
lines round each arch, proudest at the lip and falling back onto the skin, their lip read off the skin and smoothed (the
middle of five, then the mean: single samples caught on a gap had notched them); the skin reader no longer takes the
inner wheelhouses for the skin (it had put the front flares into the strut springs); the scoop frames a black vent; the
lip keeps to where the bumper comes down to its foot; a car's face may say its tail lamps' height. Found on the way, for
every build: the make pipeline's `stripDetails` took off every finish a maker gave a part, not only its own, so a painted
wheel came back polished: now only the finishes its rule chose (`finishBy`) are taken off. Not fixed, found: the Corolla's
rules give 2 findings (its hood inner frame in its hood, its battery tray in its heater hose) on every commit back to
1937fd8, before this work. Blind check: "a four-door sedan in black with red body-kit accents", taken for a Holden
Commodore at about 20 %, still not a Monte Carlo; its list: the wing flat slabs, the flares thin, the vent flat, the skirts
and splitter boards, tyres with a chunky tread, the nose blank, the tail lamps boxy, the plates' text clipped.
- **2026-10-29, the user's own Monte Carlo, from their garage photographs.** A third record: its paint sanded back to a
tan primer (sampled #c8bd9d), red bolt-on flares round all four arches (their heads red), a red ducktail on its deck lid,
red mirrors, its own 16-in. five-spoke wheels black with a red lip on 225/60R16s. Each by a general option: a coat's
primer and its being sanded (broad patches through to the primer on the flat, feathered, specks of paint left, the paint
kept in hollows and on tight edges; a second kind of wear beside chipping), a build's mirror colour, a rim's lip colour
apart from its spokes', a ducktail fitted to the deck lid across its crown, and how far a car's tail lamps wrap round.
Found on the way: the skin reader saw only top-level panels, not the hood, doors and deck lid built as closures, and a
mirrored skin has only its right half (both fixed). Rules: 0 findings; recipes: all met. Blind check: "a generic 4-door
sedan" with "a cream-and-black cow-print or camo-style wrap", taken for a Charger or a 300 at about 15 %: the sanding
reads as a wrap, not as work in progress; the flares still read thin, the ducktail a flat slab, the wheels small and set
in, the body slab-sided and inflated, its windows near opaque with no pillar between. The body's own shape (the
Monte Carlo's rear window, haunch and deck) is the gap now.
- **2026-10-29, the Monte Carlo's own shape, first round.** Two general options any car can take: its haunches (`haunch` in
its lines: each side narrower along its doors than over its rear wheel, where its published width is, so much of that over
its front wheel, and its shoulder line rising over its rear wheel) and a coupe's one long door with a quarter glass
behind it (`doorR` now splits a one-door car's side glass at its door's top rear corner: the door's drop glass, a black
bar, a fixed quarter glass). The Monte Carlo: 35 mm of waist, 55 % of it at the front, a 50 mm rise; its door's rear edge
0.581 of its length (measured off the first photograph). Rules clean on all three records. Blind check of the stock car:
now read as a two-door ("a 2-door built on a sedan body"), still not as a Monte Carlo (an Audi A6 or a Commodore, under
10 %): its body hangs nearly to the ground beside each arch with no sill line, the arches cut as notches with the
suspension showing; a long slab deck and a tall plain tail; the wheels small and flat chrome; the door a flat cut-out.
The body falling to the ground by its arches is every car's, from the body maker's bottom line: next.
- **2026-10-29, rebuilding the user's own object from photographs: the closed loop, first round** (docs/RECONSTRUCT.md).
Photograph → edge-snapped features → camera solved from the published wheel places → dimensions through every camera
that fits → the model rendered from that camera → its silhouette compared with the photograph's by region → the body's
line figures fitted → rendered and compared again → the one photograph or measurement that settles the most. Each a node,
on the board "Rebuilt from a photograph". On the user's side photograph: the camera fits to 5.0 px rms but is not fixed
(4.2 to 54.6 m away fit as well: the photographs have no EXIF); length 4.59 ± 0.48 m against the published 5.027 m, not
fixed; IoU 0.831 → 0.841, mean outline error 68 → 62 mm after fitting; nose −113 mm and tail −133 mm left unresolved.
Asked for: the original photograph file or the phone and lens. Not done: joining several photographs into one solution,
the garage photographs not marked, outlines traced by eye (no segmentation), only the line figures fitted, 2 s an
evaluation.
- **2026-10-29, matching the goal picture better, and the pipeline folded into one node.** The side picture is the user's
AI-made goal, not a photograph (marked `concept`: matched, never read as a measurement). New tools: Dense outline on the
image's edges, the error both ways, Pipelines tried (every recipe judged alike), and Picture to model (`seed.image-to-model`,
folded). Nine recipes run on the picture: the error both ways went from 19.26 px (IoU 0.833) to 9.23 px (IoU 0.898) with
the one kept (I: the camera's distance scanned first, then lines, overhangs, stance and camera, then the roof, wing and
lip; 932 s); the first round's way gave 17.24 px. What did it was the camera: the solve's 40 m camera fits the wheels as
well as a near one, but not the body; scanned, the fit came to about 5.4 m, and through it the published length fits
(5.020 m), so "the AI drew it short" (the round before) was wrong. A bug was found on the way (the dolly zoom slid the
picture) and fixed. The fitted body is stored on the kit record. Rules clean. Blind check: "a 4-door sedan with a body
kit", a Grand Prix or a Monaro at about 15 %: the outline matches; what is inside it (flat flares, a decal-like vent, a
slab wing, the windows one band) does not, and the wing still stands about 55 px behind the picture's (its setback not
fixed: its edge is a small share of the outline).
- **2026-10-29, judged from the picture's own camera, four ways apart.** After an expert's critique (an outline is not
the car): Same-camera view, Accuracy four ways (silhouette, features, surface, dimensions, and which way it faces),
Geometry fitted to its features, Side by side, all in Picture to model. 18 features traced on the goal picture. Found
and fixed: a coupe's door held to 1.15 m whatever its record said; the kit's lip and valance had no side pieces; those,
when added, hung past the bumpers' corners; the picture's length read off one plane through a near camera. After: outline
7.05 px (IoU 0.918), features' edges 11.0 → 6.5 px, their middles 19.2 → 7.5 px, overlap 0.41 → 0.56; surface unchanged;
depth and the unseen sides unknown. Rules clean on all three Monte Carlos. Blind check: a two-door coupe facing left,
not yet a Monte Carlo; the wing, flares, rims, lamps and the missing mirror are what it names.
- **2026-10-30, tools built once for every category: Fit to a target.** One node (`fit.target`, in `dataflow.ts` where
groups are run) drives any block, or any pipeline folded into one, with some of its inputs or settings moved within
ranges, until its outputs meet their goals (= a value, under or over a limit, least or most, several at once): each
value scanned first, then Nelder–Mead; each with its ± (how far before a goal slips 1 %) and whether the goals fix it;
every trial kept, none run twice, and inside a folded one what the values do not reach worked out once. The minimiser
and the fit with ± written once in `numeric.ts` as the points they ask for, driven at once (the picture fits) or by a
board's run. Measured: a bar's area for 2 MPa under 5 kN, 0.0025 m² in 30 runs (12 ms); an engine's bore so its valves
float at 7,000 rpm, 71.1 ± 0.9 mm in 23 runs (7.6 s); a window built and weighed, folded into one node, its width for
20 kg, 0.748 ± 0.009 m in 24 runs (48 ms). Asked for what cannot be had (valves floating over 7,500 rpm with a factor of
2 at once), it says which goals it did not meet and which values the goals do not fix.
- **2026-10-30, one level of detail, a spatial index, and drawing only what can be seen.** Measured first: a Monte
Carlo of a new shape took about 2.7 s to make (its body 1.5 to 2 s, reading its skin 1 s in 81,510 surface samples, its
kit 0.1 s) and its outline 7 s to draw. Built once for everything: the level of detail (`lod.ts`: 1 as designed, less
coarser), read by the renderer's surfaces, turned parts, spheres, cones and tori and by skin sampling, and by Fit to a
target's trials (the answer always run again at 1); a spatial index over points (`PointGrid`, `make/space.ts`), which
the skin's queries now use; and drawing only what can be seen: a piece under a pixel on the screen (more at a coarser
detail) left out, and one wholly behind what is nearer left out before its triangles are made, biggest first. On the
Monte Carlo from the picture's camera: 772 of its pieces drawn, 4,926 hidden, 72 too small; its outline unchanged
(IoU 1.0000 against drawing all of them); the outline drawn in 1.7 s, not 7 s. Coarser detail: making 2.7 → 1.9 s at
0.3, its outline still 0.989 of the full one's. Not yet: the body's making itself (its skins fitted through their
sections) is untouched, and the 3D viewer's own stand-ins are not yet tied to this level.
- **2026-10-30, any outline onto any surface.** `ontoSurface` (`mate.ts`) and node Onto a surface (`onto.surface`): a
flat outline drawn as seen looking along a direction, cast onto any thing's drawn surface (ray against its triangles, only
the pieces whose box the ray crosses), in tiles where asked, each set on the surface's tangent where its middle lands;
how far each corner stands off the surface is measured and said. On the Monte Carlo: a 1,320 cm² vent onto its hood in
40 tiles, every corner within 0.5 mm of the hood; a badge onto its door, within 0.1 mm; both with the car made in 6 s.
Made of shapes every module already reads (prisms), so it weighs, lays out and is checked as any part is. Not yet: the
kit's own scoop and lip pieces, made before this, still place themselves their own way; cutting an outline through a
surface (a window in a wall) is not this tool.
- **2026-10-30, variants of anything, none twice.** Node Variants of anything (`variants`, `dataflow.ts`): any block or
folded pipeline made again and again, some of its inputs or settings drawn by seed from ranges (`w 0.6..1.8`, `n 2..6
int`) or lists (`frame a|b|c`); what each made compared by what it is (things by the built-parts library's design key
and their colours, numbers to seven figures), not by its seed, and one the same as one before drawn again; says how many
differ in what they are and in design, and how many could not be made different (what is drawn from too small). Each
variant's seed mixed through an integer hash first: unmixed, Park–Miller's first draws followed neighbouring variants
almost in step (widths 0.771, 0.999, 1.227 …), now unrelated. Measured: twelve windows over width, height and frame from
seed 1, twelve different in 12 draws (31 ms), the same twelve again from seed 1; five drawn from two frames only, 2
different, 3 said to be repeats it could not avoid.
- **2026-10-30, remembered by content, everywhere.** Every engine now shares one memo (`SHARED`, `dataflow.ts`) unless
handed its own: a node's outputs kept by its content key (its block, version, settings and what came in), so the same
node run on another board, inside a folded node or a fit is not run again. And `remembered` (`assembly.ts`), the same for
any function by its input's content, used first for making a machine from its record (with the detail it is made at in
its key; each caller given its own top, its pieces shared). Measured: the Monte Carlo on a second board 815 ms → 1 ms;
making it again from its record 680 ms → under 1 ms. The built-parts library is unchanged by it (no piece added or
dropped). Not measured: Picture to model end to end (its time is the fits', which this does not shorten).
- **2026-10-30, what matters (sensitivity), for anything.** Node `what.matters`, Sensitivity (elementary effects)
(`dataflow.ts`): any block or folded pipeline run along Morris's paths, each moved value stepped once a path across a
4-level grid; for each output watched, each value's μ* (how far it moves it over its whole range), μ and σ (straight, or
bent or acting with another), ranked, and what moves nothing. A thing it makes is measured as a person would (its mass,
width, height, depth) and watched like a number. Measured: a bar's stress, load before area, both bent (σ = F/A), 11 runs,
2 ms; a window, width moved by w alone, height by h alone, mass by both together (its glass w × h), 11 runs, 40 ms; the
engine under load at 7000 rpm, 32 runs, 10.4 s: its valves' float speed moved by bore alone, its least factor of safety by
rpm then bore, and its stroke by nothing, checked: the least is always the valve spring keeping its valve on the cam
(0.81), which no stroke reaches, while the rod's pull does move with stroke (108 → 159 MPa at 70 → 100 mm). Found with it
and fixed: a folded block run inside a fit, variants or this was not given its inputs' defaults (a window without its
frame colour made nothing); `runnerOf` now gives them, as placing it on a board does.
- **2026-10-30, trade-offs (a Pareto front), for anything.** Node `trade.offs` (`dataflow.ts`): any block or folded
pipeline, two goals or more (`min`, `max`, a moved value among them) and limits (`<`, `>`): designs spread over the ranges
by Halton's sequence, then each weight's augmented Chebyshev distance minimised (Nelder–Mead, within the ranges); the
front is every design that keeps the limits and no other beats on every goal, its knee the one nearest the ideal. Seed
`seed.spring-checked` (Coil spring, made and loaded: the coil maker into Spring under load, folded) gives it a real
conflict. Measured: the spring, light against stiff with its least factor of safety over 1.2, 210 designs, 138 keep the
limit, 26 on the front from 12.6 g at 16.6 kN/m to 32.6 g at 77.4 kN/m, the limit binding along it (1.20 to 1.27), its
knee d 3.59 mm, D 19.7 mm, 3.24 coils, 25.1 g, 66.5 kN/m; 198 ms. A bar, area against stress kept under 4 MPa: 27 on the
front from 0.0027 m², 68 ms. Seen and fixed in its board's screenshots: a chart drew the first wire in (its x) as its y;
26 springs strung in a 0.7 m row were drawn far off as boxes, now laid in a square (174 × 143 mm), each a spring.
- **2026-10-30, choosing inside a fit (no new node).** Asked for "best of choices", the space was searched first:
`size.select` picks only batteries and `size.line` only wire gauges and bores; Variants already drew from lists. So
Fit to a target, Trade-offs and What matters take choices instead (`name a|b|c`, `name lo..hi int`, one parser,
`rangesOf` in `dataflow.ts`); a fit tries each way of choosing with its values fitted inside, ranks them (`choices`) and
shows what the best makes (`thing`). A choice not among an input's own is refused by name. With a wish (min, max) among
its goals, values asked for and limits now weigh 10⁵ over it (it had traded a 40 kN/m rate down to 27 kN/m for mass).
Found and fixed on the way: a wire into an input a block does not have was kept and carried nothing (the folded spring's
wire grade never reached its load check): `wire()` now refuses it; Spring under load and Engine under load take their
wire grade wired, and the coil maker takes it too, its rate from the grade's own G (stainless 69 GPa, music wire 81.7)
rather than 79 GPa for all. Measured: a 40 kN/m spring, 1.3 times as strong as it must be, as light as can be, from five
ASTM wires, 3 to 8 coils and the wire's size fitted: music wire, 3 coils, 3.57 mm, 29.3 g; stainless needs 4 coils,
44.9 g; hard-drawn and stainless cannot in 3 (said, with what each reached); 30 ways, 1,542 runs, 0.46 to 0.75 s. Seen
in its screenshot and fixed: a coil drawn with 12 points a turn read as an octagon; 32 now.
- **2026-10-30, run many at once.** `pool.ts` and `trial-worker.ts`: trials of any block handed to workers, one for each
core (Web Workers in the page, worker threads under Node, the worker bundled by rolldown into node_modules/.cache), each
with the whole library; a pipeline you folded is carried to them by its board. A batch goes wide only when its first
trial, timed, says the rest would take longer than starting the workers (measured: 825 ms for four, 1,960 ms the first
time it is bundled; 4 ms for seven trials once they are up); inside a worker nothing goes wider. What matters, Trade-offs
(its spread), Variants (each first draw) and Fit to a target (each way of choosing, its own fit) lay their trials out
first and run them as one batch. Measured on 4 cores, the same jobs with NEXUS_ONE_THREAD=1 and without, the same answers
both ways: a fit of the engine's bore for a 7,000 rpm float, choosing among five spring wires, 42.9 s → 21.7 s; What
matters on the engine, 29 trials, 9.7 s → 7.3 s with the workers' start in it; the spring's 30 ways of choosing, 0.82 →
0.52 s. In the page four workers started and the engine's board ran in 9.4 s without error; one thread in the page was
not measured. Not yet through the pool: a single fit's own steps (Nelder–Mead asks one point at a time) and Picture to
model's fits, whose 15 minutes are mostly that.
- **2026-10-30, the difference between any two things.** Asked for it, the space was searched first: what compares is
for pictures (`compareOutline`, `compareFeatures`, `compareEdges`) and two numbers (`logic.compare`). `diff` in
`assembly.ts` and node Difference (any two) (`blocks.ts`): numbers, words, lists, records, tables, parts and whole
assemblies, one walk down both, pieces paired by name, a pair whose design key (`designOf`) and colour agree passed over
whole. A row for each piece and kind of change (added, removed, reshaped, remade in another material, recoloured, moved,
turned), how many of its numbers changed and the largest change; every number on asking. Between two things, what each
weighs and spans, and the second drawn by what became of each piece (same dimmed, new green, reshaped orange, moved blue,
gone red where it was). Measured: the Monte Carlo as sold against the custom one, 8,704 and 5,770 pieces: 35,447 numbers
in 288 places, 0.42 to 0.76 s; first its 16 in. wheels and 225/60R16 tyres for 21s and 245/30R21, its body kit added,
its hubs and discs 1.6 % larger, its front axle tube 49 → 64 mm for 126 % more torque, every body panel reshaped (its
lines refitted to the picture). Its mass the same to 10⁻¹³ kg: a car is held to its published mass, so the kit's weight
comes out of "the rest of it" (said, not hidden; whether a kit should add to the published mass is a choice not yet
made). The board in the page, both cars built and compared: about 5 s.
- **2026-10-30, fit in parallel.** `numeric.ts`: `eigenSym` (cyclic Jacobi; checked against a 3×3 with known eigenvalues
to six places), and CMA-ES (Hansen 2016, his constants), a minimiser asking for a batch of points at once, driven by
`minimizeBatchAsync`/`fitByBatchAsync`. Fit to a target takes `method` (auto, one at a time (Nelder–Mead), in batches
(CMA-ES)); auto is batches for three values or more; its first scan's seven points go at once either way, through the pool.
Goals may name a moved value (rpm max). Measured: Rosenbrock (2 and 5 values) reached by both (CMA-ES in more trials, 870
against 206, in 145 rounds of 6); Rastrigin in 3 (many valleys): CMA-ES 1.38, Nelder–Mead stuck at 16.9. On the engine,
bore, stroke and speed moved for the highest speed that holds (valves not floating below 7,000 rpm, least factor of
safety over 1): CMA-ES on 4 workers 31.3 s, on one thread 59.6 s, the same answer (70 mm, 7,000 rpm, every goal met);
Nelder–Mead 47.6 s and its limit missed (1.0 reached). In the page 38.2 s, every goal met. Its stroke not fixed by these
goals, as What matters found. Picture to model's fits do not go through this yet: each scores its trials inside one node,
not as a block run, so nothing can be handed to a worker.
- **2026-10-30, models over the web: a blind judge, and drawing.** `genai.ts` (key `GEMINI_API_KEY`, read under Node
only; a page holds none) and `views.around` in `reconstruct.ts`. Blind judge: pictures shown to a vision model told
nothing but the criteria, n judges apart; each criterion's mean, spread and 95 % interval (Student's t), agreement, the
faults they share. Measured (gemini-3-flash-preview, 3 judges): the custom Monte Carlo from the 3D viewer, called "modified
sports coupe", 4.67/10, agreement 0.93, its red kit "tacked on" (2 of 3) and polygon edges on curves (2 of 3); the
Corolla, "four-door sedan", 5.27/10, its plate poorly set (2 of 3); the Monte Carlo from Views round a thing (640 px,
flat shading), 4.2/10, "missing mirrors and door handles", "low-polygon" (2 each); 10 to 11 s a judging. Picture from
words and Prompt trial are built; every image model refused with RESOURCE_EXHAUSTED (the key's free tier carries no
image quota), so no picture has been drawn and neither has been run end to end. ZenRows: the network policy refuses
api.zenrows.com (CONNECT 403), so it has not been tried.
- **2026-10-30, two new disciplines.** `data/disciplines.ts`: Intelligence (AI) engineering, after ISO/IEC 22989 and
42001, ACM CCS 2012 and NIST's AI RMF (no body divides it into branches yet; its branches are Nexus's own, said so):
model engineering, prompt engineering (wording, context, trials), evaluation engineering (model-as-judge, calibration,
benchmarks), agent engineering (tools, planning, memory, multi-agent), machine perception, generative design, retrieval,
safety and governance. Pipeline and flow engineering, its own discipline, not a branch of AI: its tools run engines and
springs as much as models (dataflow design, execution, design search, sensitivity, verification, orchestration); no body
divides it yet, so its division is Nexus's own, after dataflow practice. Library fields Intelligence (AI) (4 nodes: Ask
Claude, Blind judge, Picture from words, Prompt trial) and Pipelines & flow (8: Fit to a target, Trade-offs, Variants,
What matters, Difference, Pipelines tried, Sweep, Tester). Sweep, Tester and Ask Claude given their specs. The gate:
23 of 23, 56 s against its minute.
- **2026-10-30, the engineering compiler.** The user's 30-stage compiler as `compiler.ts` and four nodes (Compile:
start, bill of materials, verify, release): one design record through the stages, every check naming its engine and the
design hash it checked, the release gate their Loop F; the 30 stages mapped in `docs/COMPILER.md` (10 built, 13
partial, 7 not built). First runs: a spring, BLOCKED (fatigue life unverified, no interfaces declared, meshes not
solids), its three measurable requirements passing; an inline four from its parts, REJECTED for three real reasons (its
coil housing over PBT's 140 °C by conduction from the exhaust, its least factor of safety 0.93 at 6,500 rpm, its
valves floating at 6,270 rpm), 410 components, 20 s.
