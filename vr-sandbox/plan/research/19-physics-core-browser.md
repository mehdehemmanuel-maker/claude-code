# Research (round 4): an acausal, equation-based physics core that runs in a browser
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Scope: spec 09 (the physics core). It builds on `research/06-engineering-languages.md`, which already covers Modelica's
ideas, FMI 3.0 in outline and Jolt's `JPH_CROSS_PLATFORM_DETERMINISTIC` define. This pass does not repeat that. It
asks what can actually run in a browser today, what has been **measured** and what is only **claimed**, and how the
mature tools tell a user that a model is ill-posed.

Starting point in our code [C, read this pass]: `src/nexus/numeric.ts` offers `rk45`, `rk4`, `euler` and
`backward-euler`, a dense `solveLinear` and a sparse SPD solver. It has no BDF, no DAE solver, no symplectic method
and no structural analysis. Nexus loads `jolt-physics` `^1.1.0` through its `wasm-compat` entry (`blocks.ts`,
`realize.ts`), the prebuilt npm package.

## (A) Findings

### A1. Modelica compilers, and what runs in a browser

- **Rumoca** [C] (https://github.com/CogniPilot/rumoca, https://arxiv.org/abs/2606.14998, 2026-06-12). A Modelica
  compiler written in Rust, Apache-2.0. Its phases are kept apart: parse, resolve, typecheck, instantiate, flatten, DAE,
  structural (BLT, incidence and matching, an initial-condition plan), simulate, and template code generation. The
  whole compiler runs in the browser as WebAssembly: a playground at rumoca.cognipilot.org parses, reports and shows the
  DAE "on every keystroke", and it can make "self-contained HTML simulators". One playground build variant is
  `sim-diffsol`, so the browser solver is diffsol (A3). **Measured by its own authors** on MSL 4.1.0 (566 example
  models):

  | Phase | Flatten | DAE | Solve | IC | Sim |
  | --- | --- | --- | --- | --- | --- |
  | Overall | 99 % | 73 % | 60 % | 41 % | 28 % |

  By package, Mechanics.MultiBody reaches 55 % DAE and 0 % Sim, Fluid 0 % Sim, Mechanics.Translational 69 % Sim and
  Electrical.Analog 32 % Sim. Of the 151 models that both Rumoca and OpenModelica simulate with comparable traces, 102
  (≈ 67 %) agree; the other third deviate. Compilation is 2.6 to 5.2× faster than OpenModelica (Cranelift JIT, no gcc).
  Simulation is 6.7× faster on 1 to 9 equations, level at about 25 to 49, then 0.29×, 0.05× and 0.01× in the largest
  bins (an interpreted solver IR). The authors say plainly that "OMC remains the more robust and capable simulator" and
  that the timing subset favours Rumoca. **This is the best measured evidence found for a structural compiler running in
  a browser, and its own numbers show how hard the last 70 % is** (index reduction, tearing, events, stiffness).
- **OpenModelica in the browser** [C]. The User's Guide page "Simulation in Web Browser" still points to the 2014
  Emscripten route (https://openmodelica.org/doc/OpenModelicaUsersGuide/latest/emscripten.html,
  https://github.com/tshort/openmodelica-javascript). Its master branch has newer commits: "FMI 3.0 wasm FMU export and
  browser simulator (#16063)" on 2026-07-17 and "wasm-jit: make browser simulation match native (#16060)" on 2026-07-16
  (commit log at https://libraries.openmodelica.org/branches/history/master-fmi-fmpy/2026-07-16%2020:09:12..2026-07-18%2012:50:02.html).
  Whether these shipped in a release was not checked. [I] "Make browser simulation match native" shows that OpenModelica
  found differences and worked on them; how large they were is not known.
- **Bodylight.js** [C] (https://bodylight.physiome.cz/; Modelica Conference 2023 paper,
  https://ecp.ep.liu.se/index.php/modelica/article/view/954): an FMU exported *with C sources* (co-simulation) is
  compiled with Emscripten to WebAssembly and driven by web components. A 2026 Medsoft paper says the same: "the FMU must
  contain source code in C … compilation for the browser is done by Emscripten"
  (https://www.medsoft.website/sbornik/2026/Medsoft_sbornik_2026_Kofranek_II_en.pdf). Its docs, as summarised by a search
  tool and not read directly, say that OpenModelica 1.14 exported Euler and 1.16 "is declared to support CVODE export"
  (https://zenodo.org/records/7599900). So CVODE has been compiled into browser FMUs, but only inside the FMU.
- **Modiator** (Modelica Conference 2023, https://ecp.ep.liu.se/index.php/modelica/article/download/1307/1121) [C,
  from search results]: by default a web app that compiles and simulates locally in the browser, through OpenModelica and
  Emscripten.
- **Modelon Impact** [C, search summary]: a browser front end whose compute runs on Modelon's cloud
  (impact.modelon.cloud) or on the customer's own servers. A 2018 paper says compilation and simulation "are not
  performed in the browser". **Wolfram System Modeler** [C, an undated Community thread]: content deployed to the
  Wolfram Cloud cannot produce new simulation data; that needs the desktop application. [I] Neither is a browser
  solver; both are thin clients.
- **Base Modelica (MCP-0031)** [C] (https://openmodelica.org/doc/OpenModelicaUsersGuide/1.24/basemodelica.html): a
  flat subset of Modelica with no lookup, inheritance or connections, meant to lower the bar for new compilers. Still a
  draft; OpenModelica can already flatten to it. An OpenModelica issue notes the spec "does not describe how you lower
  a Modelica model into Base Modelica". [I] It is a good *export* target for a folded Nexus board: flat equations that a
  second compiler (OpenModelica, Rumoca) can check.
- **Dyad** [C, search summary] (JuliaCon 2026 abstract; JuliaHub blog): compiles to ModelingToolkit and adds block
  diagrams, state machines and C code generation. Source-available; commercial use needs a paid seat. Dyad 3.0 GA was
  reported 2026-05-27 by a secondary news summary.
- **Other tools listed by the Modelica Association** [C, search snippet, https://modelica.org/tools/]: "ODE+" (an
  AI-first browser platform claiming full MSL support) and YSSIM (browser authoring with a microservice backend). Whether
  either computes in the browser was not checked.

### A2. ModelingToolkit's structural core, and JavaScript

- **StateSelection.jl** [C] (https://github.com/JuliaComputing/StateSelection.jl): the "common algorithmic core" for
  MTK, DAECompiler and JuliaSimCompiler. It is "independent of the actual representation of the system of equations": it
  computes which transformations to make and leaves the rewriting to its user. Its passes, in order:
  1. **Structural singularity removal**, a pre-pass before Pantelides. "Because pantelides is a structural algorithm,
     it can accidentally fail to fully reduce the index for systems which have full structural rank, but are numerically
     singular. One common source … are conservation laws." It changes basis on the *integer-linear subsystem* so that the
     rank deficiency becomes structural.
  2. **Pantelides**, to index 1 or 0, by listing equations to differentiate.
  3. **Dummy derivatives**, choosing which differentiated relations to drop. "The choice … can radically affect the
     numerical properties."
  4. **Tearing**: break algebraic loops by choosing algebraic states and wrapping a nonlinear solver around them.

  It does not do *dynamic* state selection. The code traces back to Modia's structural core (ported to MTK, then
  extracted again). MTK's bipartite-graph internals are documented
  (https://docs.sciml.ai/ModelingToolkit/dev/internals/bipartite_graph). The SciML course gives three lectures by Yingbo
  Ma to "how acausal model compilers work" (https://sciml.github.io/ModelingToolkitCourse/dev).
- **Pantelides is not enough on its own** [C] (https://reference.wolfram.com/language/tutorial/NDSolveDAE.html): for
  an index-4 example, "The Pantelides algorithm estimates the index to be 2", the solver then meets a singular Jacobian,
  and Wolfram's "structural matrix" method solves it. "Very commonly the messages NDSolve::nderr or NDSolve::ndcf are
  issued … when the DAE's index is greater than 1."
- **Arrays** [C] (Otter, DLR, https://elib.dlr.de/117431/1/Otter-transformation-of-differential.pdf): Pantelides and
  similar algorithms work on scalars, so tools scalarise array equations and lose the array form, which is costly for
  large arrays. Pryce's Σ-method (2001) is an alternative structural index method, based on an assignment problem.
- **A JavaScript or TypeScript implementation** [C, negative]: four searches (Tavily, web, GitHub) found **no**
  maintained JS/TS implementation of Pantelides, dummy derivatives or tearing, and no JS acausal compiler. The browser
  paths found are all compiled from other languages (Rumoca from Rust, OpenModelica from C via Emscripten). This is "not
  found in the searched sources", not proof that none exists.
- [M] The algorithms are small and well described: maximum bipartite matching (Hopcroft–Karp or augmenting paths),
  Tarjan's strongly connected components for BLT, Pantelides (1988), Mattsson–Söderlind dummy derivatives (1993), and
  tearing heuristics (Cellier and Kofman; Modia's). Alias elimination removes `a = b` and `a = -b` and trivial
  equations before matching (FMI 1.0's designers noted this alone shrinks result files 4 to 5× [C, Fritzson's 2011 FMI
  slides, https://openmodelica.org/images/docs/modprod2011-talks-day2/modprod2011-day2-talk7a-PeterFritzson-FMI.pdf]).

### A3. DAE and ODE solvers usable in a browser

- **diffsol** [C] (https://github.com/martinjrobins/diffsol; JOSS paper
  https://www.theoj.org/joss-papers/joss.09384/10.21105.joss.09384.pdf): Rust. It solves ODEs and semi-explicit DAEs in
  the form M·dy/dt = f(t, y, p), where M may be singular, with BDF and SDIRK methods (pydiffsol shows `bdf` by default and
  `esdirk34`). It lists "Javascript in browser (e.g. using wasm-pack)" as a target and has its own DSL (DiffSL) with
  automatic differentiation for Jacobians. Rumoca's browser build uses it (A1). [I] It is the most credible open stiff
  DAE solver path into a browser found in this pass, but it handles only index 1 with a mass matrix: index reduction
  must happen before it.
- **SUNDIALS (CVODE, IDA) as WebAssembly** [C, negative]: no packaged npm or GitHub build was found. CVODE does reach
  browsers inside OpenModelica-exported FMUs compiled by Bodylight (A1). SUNDIALS is plain C with CMake [M], so an
  Emscripten build should be routine; no measured browser benchmark was found. Its current release is 7.x (sundialr
  bundles v7.8.0, June 2026 [C], https://cran.r-project.org/web/packages/sundialr/readme/README.html).
- **odex-js** [C] (https://github.com/littleredcomputer/odex-js): a TypeScript port of Hairer and Wanner's ODEX
  (Gragg–Bulirsch–Stoer extrapolation), for **non-stiff** systems only. **math.js `solveODE`** [C]
  (https://mathjs.org/docs/reference/functions/solveODE.html): explicit Runge–Kutta, units-aware. [M] Neither handles
  stiff problems or DAEs.
- **jaxdae** [C, search snippet, https://arxiv.org/html/2607.23202v1, 2026-07-25]: a JAX-native differentiable DAE
  solver (BDF, Radau, Rosenbrock). It is not for browsers, but it shows the current shape of the field: adaptive implicit
  methods with exact gradients through the stiff solve.
- [M] Which method fits which class: Radau IIA (stiff, index 1 to 3 in Hairer's RADAU5), BDF (CVODE, IDA, DASSL;
  variable order 1 to 5), Rosenbrock W-methods (Rodas; a linear solve per stage with no Newton iteration, easy to write
  in TypeScript), ESDIRK. SciML's own advice [C, https://docs.sciml.ai/DiffEqDocs/stable/solvers/ode_solve] is Rodas5P
  or Rodas4P at medium tolerances (> 1e-8) and Radau at tight ones.

### A4. FMI 3.0 in the browser

- **FMI-LS-WASM** [C] (https://github.com/modelica/fmi-ls-wasm): a prototype layered standard that maps the FMI 3.0 C
  API onto WIT (the WebAssembly Component Model). Three resource types (model exchange, co-simulation, scheduled
  execution), so an ME-only call cannot be made on a CS handle. Callbacks become imported interfaces; FMU state becomes
  `list<u8>`, serialised at once. `modelDescription.xml` is out of scope. It is "currently not normative" and changes
  without notice. Threads for scheduled execution wait on Component Model proposals.
- **FMI-LS-DAE v1.0.0-alpha.1** [C] (https://fmi-standard.org/news/2026-09-11-fmi-ls-dae-v1.0.0-alpha.1-prerelease,
  2026-09-11): Model Exchange FMUs can expose a **semi-explicit index-1 DAE**: algebraic variables and residuals that
  the *importer* solves. Dependency information keeps the sparsity. A structural parameter `enableDAEModeParameter`
  switches between ODE and DAE mode, so old importers still work. Reported tests: CasADi, Dymola, FMIOPT, fmusim,
  Simcenter Twin Activate, OpenModelica's MOO. Not yet specified: index above 1, consistent initialisation in DAE mode,
  and events and discontinuities.
- **FMI 3.0.2** (2024-11-27) is the current release; layered standards also include XCP 1.0.0, BUS 1.3.0-beta.1, STRUCT
  1.0.0-rc.1 and REF 1.0.0-beta.1 [C] (https://fmi-standard.org). Reference FMUs and `fmusim` exist for validation.
- [I] For Nexus: export a folded board as an FMI-LS-DAE FMU (index 1, residuals visible), so the importer, which may
  be Nexus itself, keeps the sparsity. Import source-code FMUs compiled to wasm (the Bodylight route), and in time
  FMI-LS-WASM components with no build step at all.

### A5. Bond graphs in JavaScript

- [C, negative] No maintained JS bond-graph library was found. Found instead: BondGraphTools (Python,
  https://github.com/BondGraphTools/BondGraphTools), 20-sim (assigns causality automatically,
  https://www.20sim.com/webhelp/modeling_tutorial_bond_graphs_causality.php), libBondGraph (C++, 2014), and an ASEE paper
  on a web tool that generates bond graphs and differential equations from a system diagram for teaching
  (https://nemo.asee.org/public/conferences/365/papers/49071/view).
- **SCAP** [C] (https://en.wikipedia.org/wiki/Bond_graph): sources first, then storage elements in integral causality,
  then resistors, propagating through 0- and 1-junctions. A causal conflict at a storage element means **derivative
  causality**, which is a dependent state (high index). [I] SCAP is the bond-graph form of matching plus index detection,
  and its words ("these two inertias are rigidly joined, so one has no state of its own") are the explanation users
  need. 20-sim does this automatically.

### A6. Port-Hamiltonian discretisations

- **Collocation** [C] (Kotyczka and Lefèvre, https://www.arxiv.org/pdf/1811.07852): a discrete-time pH system defined by
  discretising the energy balance. **Only Gauss–Legendre collocation applied to *linear* pH systems gives an exact
  discrete energy balance**; Lobatto-type schemes fit the framework without being exact.
- **Discrete gradients** [C] (Celledoni and Høiseth, https://arxiv.org/pdf/1706.08621; discrete gradient pairs,
  https://arxiv.org/pdf/2311.00403): an exact discrete power balance for *nonlinear* pH systems, including a
  state-dependent mass matrix; the midpoint variant keeps the order of the implicit method it is compared with.
- **Descriptor (DAE) pH systems** [C] (Mehrmann and Morandin,
  https://opus4.kobv.de/opus4-trr154/files/403/MehM19.pdf): collocation keeps the structure under stated conditions.
  Petrov–Galerkin and averaged-vector-field methods give energy-consistent high order (https://www.arxiv.org/pdf/2404.12480).
- [I] For Nexus, the junction-based connector algebra (spec 09 PC-R2) is already a Dirac structure, so a pH form
  follows from the board. Implicit midpoint (one-stage Gauss) is the cheapest scheme with an exact energy balance on
  linear networks, and it makes P5's conservation watch exact rather than statistical.

### A7. Symplectic and variational integrators

- [M] Störmer–Verlet (velocity Verlet) is second-order symplectic for separable Hamiltonians. Its energy error stays
  bounded and oscillates rather than drifting, by backward error analysis (Hairer, Lubich and Wanner, *Geometric
  Numerical Integration*). Yoshida composition gives order 4. Implicit midpoint and Gauss methods are symplectic for
  general Hamiltonians. Variational integrators (Marsden and West 2001) discretise the action, not the equations, and
  keep momentum maps exactly where the discrete Lagrangian has the symmetry: Noether in discrete form, which is spec 09
  PC-R5. RATTLE and SHAKE add holonomic constraints (the Cartesian pendulum of P2) while staying symplectic.
- [C] A Rust test suite (https://docs.rs/crate/utsuroi/latest/source/src/comparison.rs) checks Verlet by comparing the
  largest energy deviation in the second half of a run with the first half, expecting a ratio near 1 for Verlet and
  growing drift for RK4. That is a usable *test shape* for P5. One small repo quotes illustrative drifts (Verlet about
  1e-5, symplectic Euler about 5e-3, Euler about 0.25); those are not benchmarks. No JS symplectic or variational
  library of note was found.
- [M] The catch: symplectic methods are fixed-step. Adaptive step size destroys the property unless it is done with
  care (time transformation, Sundman). Contacts and friction are not Hamiltonian, so Jolt's world is not a candidate.

### A8. Determinism of Jolt and Rapier across browsers

- **Jolt** [C] (https://jrouwe.github.io/JoltPhysics): deterministic when the same binary runs with API calls in the
  same order. With `CROSS_PLATFORM_DETERMINISTIC` (≈ 8 % slower; FMA is ignored) it is deterministic across compiler
  (MSVC, clang, gcc, **emscripten**), configuration, OS, architecture and word size. **Measured on every build:** 14
  configurations are checked to give the same results "for a number of scenes", including "WASM32 emscripten running in
  nodejs" and "WASM64 emscripten running in nodejs". Jolt says itself that the feature "is less tested than other
  features". **Not measured there: browsers.** Node uses V8, so Firefox's SpiderMonkey and Safari's JavaScriptCore are not
  in Jolt's matrix. The PerformanceTest tool has `-rs`, `-vs` and `-validate_hash`, which record, validate and hash the
  state (https://github.com/jrouwe/JoltPhysics/blob/master/Docs/PerformanceTest.md); `JPH_ENABLE_DETERMINISM_LOG`
  helps find a desync (https://jrouwe.github.io/JoltPhysics/md__build_2_r_e_a_d_m_e.html).
- **The npm package Nexus uses** [C, read in `node_modules/jolt-physics/README.md`]: `-DCROSS_PLATFORM_DETERMINISTIC=ON`
  is a *build option* of JoltPhysics.js ("produces the same results as the native version"). [I] The prebuilt
  `wasm-compat` we load is very likely built without it, which agrees with research 06's finding. [I] Inside one wasm
  binary, scalar f32 and f64 add, sub, mul, div and sqrt are pinned by the WebAssembly spec. FMA is not emitted unless
  relaxed SIMD is used. So the *same* `.wasm` file should give the same bits in Chrome, Firefox and Safari even without
  the define, *provided* every input reaching it is bit-identical. The define matters for agreement with **native**
  builds (a server verifier, a desktop tool). This is inferred, not measured, and is the first thing to measure.
- **Rapier** [C]: the Rust guide (https://rapier.rs/docs/user_guides/rust/determinism) says `enhanced-determinism`
  gives cross-platform determinism on IEEE 754-2008 targets "including WASM", that it cannot be combined with `simd8`,
  that the `parallel` feature gives the same results as sequential, and that initial values must come from nalgebra's
  `ComplexField` math, not `f32::sin`. The **JS guide** (https://rapier.rs/docs/user_guides/javascript/determinism) still
  says "The WASM/Typescript/JavaScript version of Rapier is fully cross-platform deterministic", with an MD5 of
  `world.takeSnapshot()` matching across machines. **But the rapier.js changelog for 0.15.0 (2025-03-06) says
  the existing `rapier2d` and `rapier3d` packages "are now built without `enhanced-determinism` feature enabled";
  determinism moved to `@dimforge/rapier3d-deterministic`** (https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md;
  that package was at 0.21.0 on 2026-09-25, https://www.npmjs.com/package/@dimforge/rapier3d-deterministic). **The JS
  page's claim is stale for the default package**: a documented claim that the release notes contradict. Rapier's
  default rerouting goes through rust-lang/libm.
- **JS `Math.*` diverges between engines, measured** [C, one third-party source, not independently reproduced]
  (https://www.versemesh.org/docs/determinism): 871 of 16,806 values (5.2 %) differed between V8 and JavaScriptCore on
  one machine (`Math.pow` 9.3 %, `Math.exp` 9.1 %, `Math.sin` 2.6 %). ECMAScript leaves these functions
  "implementation-approximated". A libm built only from IEEE-pinned operations gave 0 of 255 differences across
  wasmtime, V8 at each JIT tier, and JSC. The same page measured that `cbrt` in rust-lang/libm changed output bits
  between 0.2.11 and 0.2.12 (8.17 % of 20,000 inputs); the cure is a lockfile. It notes that the WebAssembly 3.0
  deterministic profile is opt-in and does not cover `sin` or `exp`, because those are library code, not instructions.
  [C, our code] `src/nexus/sim.ts` calls `Math.sin` or `Math.cos` once, so it is a place where inputs can diverge.
- [M] Box2D v3 also claims cross-platform determinism; Unity Physics does not offer it across platforms (a Unity forum
  thread [C], https://discussions.unity.com/t/cross-platform-determinism-in-unity-using-webassembly/1495296).

### A9. How Simscape, Dymola, Modelon/OpenModelica and Modia report ill-posed models

- **Simscape** [C] (https://www.mathworks.com/help/simscape/ug/troubleshooting-simulation-errors.html, R2026b). It
  names two illegal configurations in words: "sources of domain-specific Across variable connected in parallel" and
  "sources of … Through variable connected in series" (two velocity sources in parallel; two current sources in series).
  "Upon simulation the solver issues an error followed by a list of blocks". For **dependent dynamic states** (two
  inertias joined by a nonlinear gear) it "may be able to identify the components involved, and provide an error message
  with links to the blocks and to the equations within each block". Problems are sorted into system configuration
  errors, dependent dynamic states, parameter discontinuities, and initial-conditions solve failure. On MATLAB Answers,
  the advice for "This model is structurally singular" was to set the Index Reduction Method to "None" to get "more
  informative diagnostics" (https://it.mathworks.com/matlabcentral/answers/2172591): [I] the index-reduction step can
  hide the cause.
- **Modelon (OCT)** [C] (https://help.modelon.com/latest/trouble_shooting/structurally_singular_system): "The system is
  structurally singular. The following equation(s) could not be matched to any variable: x + sin(y) = 3", or "The
  following variable(s) could not be matched to any equation: y". It advises running the **local balancing check**
  first: per model, count variables against equations and name the model that is off ("only 2 variables but 3
  equations").
- **OpenModelica** [C] (forum, https://openmodelica.org/forum/default-topic/2492-breaking-my-head-on-singular-problem.html):
  "The problem is structurally singular for the element type Real. Part of the problem for Real elements is
  overdetermined. There are 2 scalar equations too many in the set: port_b1.Q_flow = (-0.5)*port_a.Q_flow; … which was
  derived from …". It gives the excess count, names the equation set, and gives where each came from.
- **Dymola** [C] (Technia, https://blog.technia.com/en/mbse/dymola-translation-log; LBL Buildings guide,
  https://simulationresearch.lbl.gov/modelica/userGuide/bestPractice.html): the translation log counts scalar unknowns
  against equations, then reports the structure (states chosen, nonlinear systems and their sizes, initialisation).
  An example message: "The initialization problem is overspecified for variables of element type Real The initial
  equation... refers to variables, which are all knowns. To correct it you can remove this equation." The Buildings
  library adds *physics* advice the compiler cannot give: one pressure reference per water circuit; incompressible media
  leave pressure undetermined; steady-state energy with dynamic mass is inconsistent.
- **Modelica's rule** [C] (https://specification.modelica.org/master/class-predefined-types-and-declarations.html):
  every model must be **locally balanced** (as many equations as unknowns, with flow variables and connector rules
  accounted for), checked one model at a time. The spec warns that local balance "does not provide any guarantees for
  the global set", since locally sound parts can make a singular whole.
- **ModelingToolkit and Modia** [M]: MTK throws `ExtraVariablesSystemException` or `ExtraEquationsSystemException`
  with the unmatched variables or equations listed, and its GitHub issues show internal tearing errors ("Internal error
  in Tearing.jl: vs = 0" [C], https://github.com/SciML/ModelingToolkit.jl/issues/958) reaching users as stack traces.
  [I] The worst kind of report: right in substance, useless in words.
- **Wolfram** [C]: NDSolve::nderr and NDSolve::ndcf are the usual messages for an unreduced high-index DAE (A2).

### A10. Measured against claimed

| Claim | Status | Source |
| --- | --- | --- |
| A Modelica compiler with BLT runs fully in a browser | **measured** (MSL coverage table; 28 % simulate) | Rumoca paper |
| Jolt cross-platform determinism including WASM | **measured** per build, but in Node only, "less tested" | Jolt docs |
| Jolt determinism across browsers | **not measured** by anyone found | — |
| Rapier JS "fully cross-platform deterministic" | **claimed**, and **contradicted** for the default package since 0.15.0 | Rapier JS docs vs changelog |
| `Math.*` differs between V8 and JSC | **measured** by one third party (5.2 %) | Verse docs |
| OpenModelica browser simulation matches native | **claimed** in a commit title; no data seen | OM commit log |
| Gauss collocation conserves energy exactly | **proved**, for linear pH systems only | Kotyczka and Lefèvre |
| Discrete gradients give an exact power balance (nonlinear pH) | **proved** in the paper; one numerical example | arXiv 2311.00403 |
| Verlet energy error is bounded | **proved** (backward error analysis) [M]; illustrative numbers only | GNI; small repos |
| FMI-LS-DAE works in six tools | **reported** by the working group | FMI news |
| SUNDIALS in the browser | **not found** as a package; CVODE inside FMUs only | Bodylight |
| A JS/TS Pantelides or tearing implementation | **not found** | four searches |

## (B) What Nexus should take

1. **Write the structural core in TypeScript, in StateSelection.jl's shape** (09 PC-R3, P2; owner `numeric.ts`, a
   new stage in `docs/COMPILER.md`). The rule: the core works on an incidence structure (equations × variables, with
   "appears linearly with integer coefficient" marked) and returns *decisions* (matching, BLT blocks, equations to
   differentiate, dummy derivatives, tear variables, each with a reason); it never rewrites the symbolic system itself.
   Passes in order: alias elimination → integer-linear singularity removal → matching → Pantelides → dummy derivatives →
   BLT (Tarjan) → tearing. No JS implementation exists to borrow (A2), and the algorithms are small; a Rust one exists
   (Rumoca, Apache-2.0) to read for reference.
2. **A `system.compile` node whose outputs are the decisions** (09; 00 structure): sorted blocks, torn variables, the
   index found, the equations differentiated, the states chosen, each with its reason in words. The Dymola translation
   log, but as data that other nodes and the agent can read.
3. **Ill-posed models explained in the user's terms, not the compiler's** (09 PC-R3; 10 trust). Take from each tool:
   - Modelon's unmatched-equation or unmatched-variable list;
   - OpenModelica's "N equations too many in the set …, derived from …";
   - Simscape's named illegal configurations ("two velocity sources in parallel"; "two current sources in series"),
     detected *before* matching, on the port graph;
   - SCAP's words for derivative causality ("these two masses are rigidly joined: one of them has no state of its
     own");
   - the Buildings library's physics advice (one pressure reference per circuit).

   Every message points to the nodes and ports on the board and highlights them. It never shows a stack trace (MTK's
   failure). Planted faults in P2's check: two sources in parallel; a missing ground; an over-constrained pendulum.
4. **A local balance check on every saved block** (09 PC-R4 and the fold test; constitution C26): count equations
   against unknowns per block when it is saved, as Modelica's "locally balanced" rule requires and as Modelon advises
   first. It is cheap and catches most faults at their source. A rule: a block that is not locally balanced cannot be
   saved as a physical block. Also state the spec's warning, that global singularity can still occur, in the docs.
5. **Pantelides with a numeric second opinion** (09 P2): after structural reduction, check the Jacobian's numerical rank
   at the initial point; if it is rank-deficient, report "structurally fine, numerically singular here" and name the
   conservation law (StateSelection's pre-pass; Wolfram's index-4 example). A check that brings new information
   (decision 0003).
6. **Solvers by class, one per niche** (09 P1, P2, P5; owner `numeric.ts`):
   - stiff index-1 DAEs: a Rosenbrock-W (Rodas4P class) in TypeScript first (no Newton loop, easy to verify), with
     Radau IIA or BDF later. Alternatively, diffsol compiled with wasm-pack as a second engine, given its index-1
     mass-matrix form;
   - conservative mechanics: Störmer–Verlet and RATTLE (fixed step);
   - pH networks: implicit midpoint (exact energy for linear), then discrete gradients for nonlinear.

   Each solver node states its class and refuses problems outside it (10 trust; the validity rule of round 3).
7. **The conservation watch made exact** (09 PC-R5, P5): for a pH board the discrete energy balance
   H(k+1) − H(k) = supplied − dissipated is an identity under Gauss collocation. Report the *residual* of that identity,
   which should sit at round-off; a residual above it is a bug, not drift. For Verlet, use the second-half versus
   first-half ratio (A7) as the test shape.
8. **Deterministic maths module for anything that feeds the simulation** (11 living world; 09; owners `sim.ts`,
   `numeric.ts`): a rule that no `Math.sin`, `cos`, `tan`, `exp`, `log`, `pow`, `cbrt` or `hypot` may sit on the path
   into Jolt or into a replayed solver. Use a `detmath` module built only from + − × ÷ √ (correctly rounded by IEEE and
   pinned by wasm), enforced by a lint like Bevy's banned-method list. Start with the one `Math.sin`/`cos` in `sim.ts`.
9. **A determinism battery in CI across three engines** (11; constitution): golden vectors (`detmath` outputs, and a
   hash of Jolt's state after N steps of starter scenes) checked in Chromium, Firefox and WebKit under Playwright, and in
   Node. The vectors are plain text, compared bit for bit, naming the function and input that moved. This fills the gap
   no one has measured: Jolt in browsers.
10. **Build Jolt ourselves with `CROSS_PLATFORM_DETERMINISTIC=ON`**, or decide in a decision record not to (11; open
    question R3). Measure the cost against Jolt's ≈ 8 % claim on our scenes. Pin the exact package version (no `^`),
    since the same binary is Jolt's precondition. If Rapier is ever considered, use only the `-deterministic` package, not
    the default.
11. **Export a folded board as Base Modelica text and as an FMI-LS-DAE FMU** (09; 01 interfaces; 10 trust as a second
    solver). Base Modelica lets OpenModelica (or Rumoca) re-solve the same flat equations as an independent check:
    disagreement reported, never hidden (research 06 B11, applied to equations). FMI-LS-DAE keeps the residuals and
    sparsity, which is what a folded block is.
12. **Import FMUs as wasm, two routes** (09; 07 ideas): source-code FMUs compiled with Emscripten (the Bodylight route,
    proven), and FMI-LS-WASM components when the draft settles. An imported FMU is a block whose inside is sealed, so the
    fold test checks only its declared outputs and dependencies.
13. **Treat Rumoca's coverage table as our own scoreboard** (09; 10): adopt its phase-by-phase pass rates (flatten,
    DAE, solve, initial conditions, simulate, agreement with a reference) as the test report for our compiler on our
    starter boards. Reaching "simulates" is not reaching "agrees" (28 % against 67 %).
14. **Interpreted at first, compiled when large** (09): Rumoca's crossover (faster up to about 25 to 49 equations,
    100× slower at the top) says an interpreted residual is fine for small boards. For large ones, generate a JS or
    wasm function from the sorted equations (`new Function` or a small wasm emitter), keyed by the board's hash.
15. **Initialisation as its own problem with its own messages** (09): Dymola's "initialization problem is
    overspecified" and Rumoca's IC phase losing 19 points (60 % → 41 %) show that consistent initial values fail more
    often than the dynamics. A separate `system.init` stage, with its own over- and under-specification report.
16. **Bond-graph view of the same board** (09; 07 ideas): since no JS bond-graph tool exists and SCAP gives the best
    words for causality conflicts, render the matched system as a bond graph with causal strokes on demand. It is a view,
    not a second model.

## (C) Questions

### The structural compiler
1. Do we scalarise array equations (losing their structure, as Otter warns), or keep arrays through matching from the
   start?
2. Which matching algorithm: Hopcroft–Karp, or simple augmenting paths with a good order? At what board size does it
   matter?
3. Pantelides plus dummy derivatives, or Pryce's Σ-method? Which gives better explanations?
4. How do we choose dummy derivatives so the choice is stable when the user edits one node, and does not flip the
   states shown?
5. Do we ever need dynamic state selection (the pendulum crossing 90°), which StateSelection.jl leaves out?
6. Which tearing heuristic: Modia's, Cellier's, or the user marking tear variables by hand?
7. How do we detect an integer-linear subsystem from node equations written in our expression language?
8. How do we prove our core right: against StateSelection.jl's tests, against Rumoca's output, or against OpenModelica on
   flat Base Modelica?
9. Where does symbolic solving (making y explicit) end and numeric Newton begin, and who decides?
10. Can the agent read the `system.compile` decisions and propose a fix as nodes, and how is the fix checked?
11. How do we explain a structural singularity that comes from the *whole* board when every block is locally balanced?
12. What is the smallest message that tells a novice "you have two grounds" or "you have no ground"?
13. Which illegal configurations, like Simscape's sources in parallel, can we detect on the port graph alone before any
    equations exist?
14. How do events (`when`, `reinit`, zero crossings) enter the structure, and does the BLT change at an event?
15. Do we support variable structure (a clutch engaging changes the index), and how?
16. How are discrete (clocked) parts sorted with continuous ones?

### Solvers
17. Rosenbrock-W in TypeScript first, or diffsol in wasm first? What does each cost in bundle size and in verification?
18. How fast is a TS Rodas4 on a 100-state stiff system in Chrome, Firefox and Safari? Not measured anywhere found.
19. Does SUNDIALS IDA compile cleanly with Emscripten, and how large is it?
20. Do we need sparse direct LU in the browser, and which (KLU through wasm, or our own)?
21. How do we get Jacobians: forward-mode automatic differentiation over our expressions (spec 10), finite
    differences, or symbolic?
22. What tolerances by default, and how are they shown to the user as a trust statement?
23. When does a symplectic solver refuse a board (dissipation, contacts, inputs)?
24. Can RATTLE handle the joint types our kinematic parts carry (`kinds/motion.ts`)?
25. Is implicit midpoint stable enough for stiff electrical networks, or does it ring?
26. How do we couple an acausal subsystem with Jolt's rigid bodies: co-simulation at Jolt's step, or the joint in our
    DAE and the contact in Jolt?
27. What step size and interpolation contract does that coupling need to keep energy honest?
28. Do discrete gradients need a Hamiltonian written in closed form for every pH node, and who writes it?

### Determinism
29. Is the prebuilt `jolt-physics` 1.1.0 `wasm-compat` bit-identical in Chrome, Firefox and Safari on our scenes?
30. Does the multithreaded Jolt build stay deterministic at different thread counts in browsers?
31. What does `CROSS_PLATFORM_DETERMINISTIC` cost on our scenes, against Jolt's ≈ 8 %?
32. Is the WASM SIMD build deterministic across engines, given that relaxed SIMD is not used?
33. Where else in our code do transcendentals feed a simulation (geometry from replicad, mates, sources)?
34. Does OpenCascade's wasm build give bit-identical geometry across engines, and does physics depend on it?
35. Does a deterministic maths module change any existing test's numbers, and by how much?
36. Is determinism needed only for replay and sharing, or also for the fold test (block against inside)?
37. Do we pin wasm binaries by hash in the board file, so a replay names the engine it needs, as Verse pins
    `RUNTIME_TAG`?
38. What does a desync detector show the user: the first step and the first body that differ?

### FMI and exchange
39. When will FMI-LS-DAE leave alpha, and will it allow index above 1?
40. Does FMI-LS-WASM's WIT mapping work in browsers today (jco transpilation), or only in wasmtime?
41. Can a folded Nexus block export as FMI-LS-DAE with units, sources and validity envelopes as annotations?
42. Does OpenModelica's `#16063` produce FMUs we can load, and do they match native, as `#16060` claims?
43. Is Base Modelica stable enough to export now, or will the format move under us?
44. How do we carry the "every number sourced" rule through an FMU's parameters?
45. Can SSP (System Structure and Parameterization) carry our board wiring alongside FMUs?

### Physics and meaning
46. Which domains get pH forms first: mechanical translation and rotation, electrical, hydraulic?
47. Are thermal ports effort × flow = power (temperature × entropy flow), or the usual temperature and heat flow
    pseudo-bond? Spec 09 says entropy flow; is that what users can read?
48. How are stream connectors (convected enthalpy) represented in our ports?
49. Can the conservation watch name which node leaks energy, not only that energy leaks?
50. What is the energy residual threshold that separates round-off from a bug, per solver and tolerance?
51. Do variational integrators help our creatures and robots (`creatures.ts`, `motion.ts`)?
52. How do we state that a contact model breaks energy conservation on purpose (PC-R5's "says so")?

### Users, agent and trust
53. How does the agent use the structural decisions to build a valid model without trial and error, against ModiGen's
    finding that LLM-written Modelica often fails to simulate (research 06)?
54. Should the agent be forbidden to "fix" a singular model by deleting equations, and required to explain the physics
    instead?
55. Which messages do novices understand: a test with real users on five planted faults?
56. How do we show a high-index system to a user: "these parts move together", with the dependent state greyed?
57. When the compiler differentiates an equation, does the user see the new equation, and its units checked?
58. Does every compile result carry a hash of the board, so a message stays tied to the version it was about?

### Scale and performance
59. At what board size does the interpreted residual become too slow in VR (a 90 Hz frame)?
60. Can compilation run in a worker so the editor stays responsive, as Rumoca's "on every keystroke" suggests?
61. Is WebGPU of any use for implicit DAE solves (batched Jacobians, ensembles)?
62. How do ensembles (round 3) of stiff DAEs fit in browser memory?
63. Should large models be compiled once and cached by hash in the board's storage?
64. Is Rumoca usable as a dependency (wasm size, API stability, MSL subset), or only as a reference?

## (D) New branches

- Read Rumoca's `rumoca-phase-structural` crate in full: its matching, BLT and IC planning, and its diagnostic types.
- Read StateSelection.jl's source for the integer-linear singularity pre-pass, the least documented step.
- Pryce's Σ-method and the DAESA tool: structural analysis with a better index estimate than Pantelides.
- Mattsson–Söderlind dummy derivatives (1993) and the later "dummy derivatives done right" corrections.
- Measure Jolt `wasm-compat` bit-identity across Chromium, Firefox and WebKit with Playwright (no one has published it).
- Build JoltPhysics.js with `CROSS_PLATFORM_DETERMINISTIC=ON` and compare bundle size and speed.
- diffsol through wasm-pack: bundle size, API for a mass matrix, and a stiff benchmark in three browsers.
- SUNDIALS IDA through Emscripten: does it build, size, and speed against diffsol.
- FMI-LS-WASM with jco: can a WIT FMU run in a browser today?
- OpenModelica PRs #16063 and #16060: what "browser simulation" means there and what differed from native.
- The FMI-LS-DAE arXiv preprint (2606.22544) for its test results and its plan for index above 1 and events.
- Base Modelica's MCP-0031 text itself (not found this pass) and its version status.
- RATTLE and SHAKE for constrained mechanisms, and Lie-group integrators for rigid-body rotation.
- Discrete-gradient methods for pH systems with a state-dependent mass matrix, in code.
- Modia.jl's diagnostics, and Modia3D's way of coupling multibody and DAE (relevant to Jolt coupling).
- The ASEE web bond-graph tool: what it generates, and whether its causality messages read well.
- Bevy's banned-method list and Box2D v3's determinism tests as models for our lint and battery.
- WebAssembly 3.0's deterministic profile: which engines expose it and whether a page can ask for it.
- CORE-MATH correctly rounded functions compiled to wasm as our `detmath`, instead of writing our own.
- Simscape's "dependent dynamic states" diagnostics in depth: how it finds the components and equations.
- The Modelica Buildings library's list of physics mistakes (pressure references, steady-state mixes) as a
  rule set for our board linter.
- ODE+ and YSSIM: do they compute in the browser, and how do they report errors?
