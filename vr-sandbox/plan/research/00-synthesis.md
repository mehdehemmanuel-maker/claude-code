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

---

## Round 3 (2026-10-31): what the far branches agree on

Six passes into territories chosen because they looked unrelated (`12` to `17`). Where they meet each other, and the
first two rounds, without being told of each other:

| # | Finding | Passes | What it means |
| --- | --- | --- | --- |
| 12 | **The interface should make a wrong connection impossible, not merely warned of**: keyed by shape (Zome's hole shapes, the medical gas pin index), by unit and kind (the Mars Climate Orbiter's pound-force seconds), by attachment strategy (a gecko pad demands a flatness) | 13 crafts, 16 safety, 12 nature; with 06/07 (typed ports) | spec 01 amended: every interface carries a key (dimension and unit, medium, mechanical pattern, handedness); mismatches cannot connect; conversion only in a visible node |
| 13 | **Never break old parts**: a published interface is never changed in place; versions are added, with adapters; nothing is overwritten | 13 (LEGO's compatibility, Duplo, Meccano's century), 15 (Linux's "don't break userspace"), 14 (versions never overwritten in film) | a rule in the constitution; interface versions in spec 01 |
| 14 | **Every claim carries its status**: measured, calibrated (against what, valid for what), typical, inspired only, disputed, myth; estimates keep their spread and their makers; citations are not evidence | 12 (Eastgate, the wood-wide web), 16 (Challenger's 1 in 100 to 1 in 100,000), 17 (calibrated avalanche parameters), 15 (verifiability) | spec 10 (trust in numbers) grows a claim-status field and a calibrated-parameter type; the research agents count independent measurements, not citations |
| 15 | **Every method checks its own validity at run time and refuses past it** (the Schroeder frequency; a tested envelope; a regime gate; a static solver may not say "safe" without dynamic checks) | 17, 16, 12; with round 2's finding 4 | spec 09/10: validity checked when the node runs, not only declared |
| 16 | **Many independent judges reaching a quorum, with stop signals and a voice for every gate** (bees' cross-inhibition; ensembles; Crew Resource Management) | 12, 17, 16; with 11 (juries of different families) | the reviewer panel gains a quorum rule and the right of any gate to raise a concern the orchestrator must answer |
| 17 | **Lessons pushed where they are needed, failures carried by parts** (failure modes on every part; incidents linked to interface keys; "this does not fit" on every view) | 16 (NASA's lessons system unused when pulled), 15 (Hanny's Voorwerp) | a failure-mode record on parts (spec 01); the Hyatt gate on any change to a connection; an anomaly button |
| 18 | **Show what is, never what was commanded or what distracts** (the TMI lamp; change blindness; looking is not seeing) | 16, 14 | measured and commanded state apart; changes never applied unseen during a blink; an honesty audit over every flow |
| 19 | **Inverse design as a pattern**: requirement in, part out (TreeMaker; the TERMES compiler; Physarum's networks; Mattheck's growth) | 13, 12 | a node pattern for spec 07: inverse-design nodes with a proof or a score |

## Proposed amendments from round 3

- **Spec 01 (interfaces)**: keys that forbid wrong connections; interface versions and adapters; two modes, standard
  (interchangeable) and fitted (derived from the neighbour, the Inca way); joinery as an interface with no fastener
  (a boolean pair, a slide axis, a lock, tool access); a failure-mode record on every part and the "Hyatt gate" on
  changes to connections; a grid primitive per part family with a closure check.
- **Spec 10 (trust in numbers)**: claim status; calibrated parameters; quantity kinds beyond units (toughness is not
  fracture toughness); ensembles by default where chaos or uncertainty rule; an assimilate node to fit simulations to
  real data.
- **Spec 11 (the living world)**: affordances (round 2) plus stigmergy for agents, swarms by count of neighbours,
  an umpire node holding the true state, a chronicle; process boards (materials in states, operations between, gated
  on state, not time).
- **Spec 00 (structure)**: a non-punitive near-miss log for the AI; stop the line on a failed check; dailies (the AI
  shows what changed and the person approves, notes or kills each version).
