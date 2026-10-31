# Synthesis of the research (2026-10-31)

Eleven research passes in two waves (`01` to `05`, then `06` to `11`). This file says where they agree, what that
means for the plan, and what is proposed (not decided). Each point names the passes that reached it independently;
agreement across passes that were not told of each other is the strongest signal we have.

## Where the passes agree

| # | Finding | Passes that reached it | What it means for Nexus |
| --- | --- | --- | --- |
| 1 | **Physical ports should carry effort and flow, joined without direction** (voltage and current, force and velocity, pressure and flow), as Modelica, bond graphs and port-Hamiltonian systems do; directed dataflow is not enough for physics | 06 engineering, 07 life, 08 mathematics | a new core: acausal connectors beside directed wires; a compiler that sorts the equations, finds algebraic loops and says where a model is ill-posed |
| 2 | **Folding must be a functor**: a folded block must compute exactly what its inside computes; the category theory of wiring diagrams makes this a testable law | 07, 08, 06 (closures and bundles) | a test run on every saved block; port types (dimension, frame, evidence, direction) as the only legal wirings |
| 3 | **Numbers before pictures; checks that bring new information** | 01 CAD tools, 11 prompts, 03 agents | decision 0003 stands; every gate must add information (code, a source, another model, a re-solve), never "please re-check" |
| 4 | **Every model states where it holds** (validity in dimensionless groups; scale bands; "subgrid" honesty; a "cannot simulate" register) | 07 (π groups, cannot-simulate), 08 (scale bands, deep-zoom cutoffs), 09 (subgrid, three resolutions), 10 (all models are wrong; useful for what) | a validity envelope on every law and model node; a badge past it; the AI reads the register before promising |
| 5 | **Uncertainty as a value**: intervals or balls with decorations, Monte Carlo where linear propagation fails, exact sensitivities by automatic differentiation | 08, 06, 07 | our first-order ± is the GUM's linear method; its validity must be checked, and the other modes added |
| 6 | **Determinism, seeds and replay** | 09 (Factorio lockstep, a seed is a world), 07 (CovidSim's lesson, evolved results reproduced), 04-agents (fresh starts from files) | every run reproducible from seed, board and inputs; rewind (spec 04) and sharing depend on it |
| 7 | **Only what is observed is computed; scale by anchors and local frames** | 09 (Observable, No Man's Sky, OpenSpace), 08 (deep zoom: anchor plus offset, rebasing, a glitch detector) | lazy evaluation in the engine; float64 anchors per part, camera-relative float32, rebasing (spec 04's scale) |
| 8 | **The intelligence lives in objects**: affordances advertised by things, needs scored by agents; a chronicle of every run | 09 (The Sims, Dwarf Fortress), 07 (agent hygiene: ODD card, seed, collector) | affordance ports; a chronicle node; agents for rooms, cities and ecosystems without per-object code |
| 9 | **The picture carries shape; the request carries numbers** | 11 (Img2CAD, IMG.LY's colour results), 01 (numbers beat pictures) | spec 08 amended: Path 1 (the AI writes the profile) first; Path 2 (the image) for shape only, letters not digits, colour by bands, several samples gated |
| 10 | **Judges are many, of different kinds and families, and are themselves tested** | 11 (PoLL, CALM, EvalGen), 03 (a separate evaluator) | the reviewer panel of research 11 replaces "a second model"; judges are versioned prompt nodes |
| 11 | **A fact in our own code is out of date**: constants are CODATA 2018; CODATA 2022 is published | 08 | a small, factual fix with a test (which outputs move, by how much) |

## Proposed new specs (for the user to accept or not)

- **Spec 09, the physics core**: effort-and-flow ports without direction; a structural equation compiler (sorting,
  loop detection with an explanation, index reduction); folding as a functor, tested on every block; Noether's
  conserved quantities checked where a model has the symmetry; validity envelopes in dimensionless groups. Owners:
  `dataflow.ts`, `numeric.ts`, `lawgraph.ts`, `kits.ts` (Iface). It underlies spec 01 (interfaces that carry power, not
  only geometry) and spec 04 (live physics).
- **Spec 10, trust in numbers**: interval and ball modes with decorations; Monte Carlo where linear fails; automatic
  differentiation through the board; CODATA 2022 with correlations; floating-point lint; `check.smt` and
  `check.topology`; a "cannot simulate" register the AI reads. Owners: `evidence.ts`, `numeric.ts`,
  `data/constants.ts`, `make/rules.ts`.
- **Spec 11, the living world**: lazy evaluation; determinism and replay (seed, board, inputs; a desync detector);
  affordances and needs; a chronicle; a seed is a world; scale anchors and local frames. Owners: `dataflow.ts`,
  `act/`, `aware/`, `view/space3d.ts`.

The order they would take (proposed): spec 10's CODATA fix at once (small, factual); spec 09 beside spec 01 (the
interfaces need ports that carry power); spec 11 with spec 04 (being in it needs replay and anchors).

## Amendments to existing specs (proposed)

- **Spec 08** (picture to profile): Path 1 first; letters, not digits; colour by CIELAB bands; several samples, gated,
  the shape most agree on; per-model failure rates choose the model (research 11).
- **Spec 00** (structure): the evaluator becomes the reviewer panel of research 11; prompts become versioned prompt
  nodes with frozen suites; untrusted text only through a schema-only extractor (CaMeL).
- **Spec 01** (interfaces): interfaces carry what flows through them (power, fluid, signal) as effort-and-flow ports
  (spec 09), so a shaft is a mechanical port as well as a cylinder.
