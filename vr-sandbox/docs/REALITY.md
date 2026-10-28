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

## 3. What changes, in order (the user's priority: laws first, then the math they stand on, then materials)

1. **One numeric layer** (`src/nexus/numeric.ts`, new: nothing like it exists). Root finding (bisection, Brent,
   Newton by finite differences), integration (adaptive Simpson, Gauss–Legendre), derivatives (central differences
   with Richardson), ordinary differential equations (Euler, RK4, adaptive RK45, backward Euler for stiff ones). Each
   takes its method, tolerance and most iterations, and returns its value with whether it converged, its iterations
   and its error estimate, never a number alone. The duplicates call it: `law.invert`, `fin.irr`, `lawgraph.solve`,
   the Simpson rule in `evaluate.ts`, and the steppers that are ODEs (PID, battery drain, motor run, warming). The heat
   flow's implicit grid solver is a field solver, not an ODE, and stays as it is. Nodes: `math.root`,
   `math.integrate`, `math.derivative`, `math.ode`, each with method, tolerance and iterations as settings and a
   `converged` output; `math.multiply` and `math.divide` keep their units.
2. **Quantities** (in `dimension.ts`, which owns dimensions): a registry of named quantities (about 120: force,
   length, mass, time, temperature, pressure, stress, energy, power, current, voltage, resistance, density, …), each
   its dimension and SI unit. Every port of every book law is mapped to one, by its name and its dimension; a test fails
   on any law port that maps to none, or two quantities of one name with different dimensions.
3. **Law nodes from the book.** `lawBlocks` builds every `law.*` node from `BOOK` (all 241), keeping the 144 ids boards
   already use. Each node: its ports as quantities with units; a "solve for" setting (any of its variables, by the
   numeric layer's root finder, with its method and tolerance); its domain refusing outside (said, not a number); its
   output's derivation (evidence, inputs, uncertainty, limits); its sources and validity shown. The closures in
   `ganglia/laws.ts` are retired only after a parity test shows the book gives the same numbers: their tags and range
   checks move onto the book's laws; the engineering functions other code uses stay. Duplicates folded (one
   Stefan–Boltzmann, one `Source`, `U()` into `L()`, the nine kept/book-only pairs kept as distinct laws only where they
   say different things).
4. **The chain solver** (in `lawgraph.ts`, which owns joining laws). Laws and quantities as one graph: a law can give
   any one of its quantities when all the others are known. From what is known, it applies laws until the target is
   known, as many steps as it takes, preferring the fewest steps and the strongest evidence; where two laws share two
   unknowns (a simultaneous pair) it solves them together by Newton's method from the numeric layer. Node
   `law.solve`: knowns in (a table of quantity, value, unit, or wires), a target out, with the chain (each step's law,
   its inputs, its evidence, any limit it came near) and the weakest evidence it rests on. What it assumes is said: that
   a quantity of the same name in two laws is the same thing (the force in one law is the force in the next), unless the
   board names them apart.
5. **One material system** (`src/nexus/matter.ts`, new owner; `elements.ts` and `data/materials.ts` stay as its data).
   For every id parts carry: its composition (to elements), its handbook grade by one explicit table (replacing
   `HANDBOOK`, `SURFACE` and `MATTER_WORDS`, and the spelling matches that give tissue titanium's friction), and each
   property (density, E, ν, yield, ultimate, c, k, emissivity, melting, expansion, service limit, friction,
   restitution, colour) with its value, unit, source and evidence. What is not measured is worked out where a law allows
   (a mixture's density by the rule of mixtures from its constituents, labelled estimated), else said missing; element
   densities and melting points added from CRC. Every consumer reads it: `mass.ts`, `strengthOf`, `surfaceOf`,
   `MAX_SERVICE`, `tetherOf`, the thermal and fusion tables. Nodes: `card.material` over all of it, its properties as
   quantities wired into any law; "material from composition" (a candidate's properties from its constituents,
   hypothetical until checked).
6. **Evidence on every node and value.** `evidence` and `assumes` on every node, read from what it is (a law from its
   sources; a datasheet lookup is measured; a model that leaves things out simplified; a generator hypothetical),
   overridden by hand only where a rule cannot tell; the board carries the weakest evidence along each wire with the
   node it came from; shown as a badge on every node, checked by the gauntlet, written in `docs/NODES.md`.

## 4. How it is verified without breaking what works

- **Before anything changes, a snapshot:** every starter board run headless, every law node's worked example, the
  mass of every seed, machine and starter board's thing, every node's own tests. After each step, the same snapshot is
  run and every difference listed: none may appear that is not explained (a weightless part gaining its mass is
  explained; a law's value moving is not, until found).
- **Parity before retiring the closures:** each of the 144 laws in the book and as a closure gives the same value on its
  worked example and on 50 samples inside its domain, to 1 part in 10⁹; any that differ are listed and the wrong one
  fixed before either is removed.
- **The numeric layer against closed forms:** roots of polynomials, ∫ of sin and e^x, y' = −ky against e^(−kt), a
  pendulum's period against the elliptic integral the book derives; each method's order of convergence measured (RK4's
  error falling as h⁴); a problem that does not converge says so, and never returns a number as if it did. The
  replaced duplicates give their old answers to within their tolerance (`fin.irr`'s examples, `law.invert`'s tests,
  the PID and battery tests).
- **The chain solver on problems with known answers across fields:** a steel rod under a hung mass (weight → stress →
  strain → elongation, from the material's E); a wire's resistance from its material and size, its heating, its
  temperature rise; a pendulum's length from its period. Each answer checked by hand.
- **Materials:** a test that no id carried by any part is without density; that tissue, tile, platinum and alumina get
  their own properties; that every property says its source and evidence.
- **Ids kept:** every `law.*` id that exists keeps working (aliases where one is folded), so saved boards open.
- **The gate, the reach test, the gauntlet over every node, the pages in a browser,** and screenshots of a board that
  solves a cross-field problem through the laws and a material.

Each step lands as its own commit after the gate. Step 1 and 2 change no answers; step 3 changes none until parity
holds; steps 5 and 6 change answers only where the snapshot says why.
