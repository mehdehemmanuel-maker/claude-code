# Research: all of engineering, its languages and frameworks, and who else is trying to simulate anything

One research pass, 2026-10-31. Kept as the agent returned it (its marks: [V] checked in that pass, [K] known, not re-fetched, [I] its inference).

Done 2026-10-31. I wrote no files and no code.

**How sure each claim is.** Every claim carries one of three tags:
- **[V]**: I checked it this session with Tavily or WebSearch. The URL and date come from that search.
- **[K]**: from what I already knew. The URL is the project's own page, but I did not re-fetch it this session. Treat versions marked [K] as possibly out of date.
- **[I]**: my own inference or recommendation.

**Research limits.** Tavily rate-limited me (HTTP 429) part-way through, so the rest of the checking used WebSearch. I could not settle some things, and they are listed as open at the end of section A. I checked the Nexus context against `vr-sandbox/CLAUDE.md`, the gaps listed in `docs/OWNERS.md`, and `plan/QUESTIONS.md`.

---

## (A) Findings

### A1. Engineering disciplines: core models, tools, and the formats they live on

Everything in this table is [K] unless it is marked [V]. Tool URLs are the projects' home pages.

| Discipline | Core computational models | Open-source tools | Commercial tools | Data standards and formats |
|---|---|---|---|---|
| Mechanical | Rigid and flexible multibody dynamics (DAE, index reduction); linear and nonlinear FEM; contact; fatigue (S-N, Miner); tolerance stack-ups (worst case, RSS, Monte Carlo); 1D lumped systems | CalculiX, Code_Aster, FreeCAD (with OCCT), Elmer, Project Chrono (10.0.0 released 2026-03-27 [V] https://projectchrono.org/news/), MBDyn, Gmsh | SolidWorks, NX, Creo, CATIA, Onshape, Abaqus, Ansys, Adams | STEP AP242 (ISO 10303-242; carries semantic PMI and kinematics), IGES, Parasolid x_t, JT (ISO 14306), 3MF, STL, GD&T (ASME Y14.5-2018, ISO 1101) |
| Civil / structural | Frame and stiffness method; P-Delta; modal and response-spectrum analysis; nonlinear time history (fiber sections); code checks (Eurocode, AISC, ACI) | OpenSees (https://opensees.berkeley.edu), OpenSeesPy, Code_Aster, FrameAnalysis libraries, IfcOpenShell, xeokit | SAP2000/ETABS, Robot, Tekla, RFEM, Midas | IFC 4.3, published as ISO 16739-1:2024 on 2024-04-02, adds road, rail, bridge, tunnel and port [V] https://www.buildingsmart.org/?p=29521 ; bSDD; IDS (Information Delivery Specification); BCF; LandXML; CityGML 3.0 |
| Geotechnical | Consolidation; slope stability (limit equilibrium: Bishop, Morgenstern-Price); Mohr-Coulomb and Cam-Clay; seepage (Darcy) | OpenSees (u-p elements), Code_Aster, pyLEM-type scripts | PLAXIS, GeoStudio, FLAC | AGS4 (borehole data), DIGGS |
| Hydrology / hydraulics | Saint-Venant 1D/2D shallow water; rainfall-runoff (SCS-CN, unit hydrograph); pipe networks (Hazen-Williams, Darcy-Weisbach) | EPA SWMM 5.2 and PySWMM, EPANET and WNTR, HEC-HMS; HEC-RAS 6.6 is the last maintained version, and its rewrite "RAS 2025" is in alpha with an explicit solver and new meshing [V] https://www.dvidshub.net/news/555375/new-software-signals-shift-future-hydraulic-modeling ; MODFLOW 6, SWAT+ | InfoWorks ICM, MIKE, TUFLOW | .inp (SWMM, EPANET), HEC-DSS, WaterML 2, NetCDF-CF, GeoTIFF |
| Electrical / electronic | Modified nodal analysis (SPICE); transient, AC, noise; power flow (Newton-Raphson); EMT; signal and power integrity; RF S-parameters | ngspice (KiCad 10.0.0 ships ngspice-45.2 [V] https://ngspice.sourceforge.io/resources.html), EEcircuit (ngspice in WebAssembly, MIT [V] https://github.com/eelab-dev/EEcircuit), Qucs-S, KiCad, pandapower, OpenModelica PowerSystems, GNU Radio (4.0 is at RC1; no stable date found [V] https://www.gnuradio.org/news/) | Cadence, Altium, PSpice, LTspice (free), PSCAD, ETAP, Keysight ADS | SPICE netlists and .model/.subckt; IBIS; Touchstone .sNp; Gerber X2/X3, IPC-2581, ODB++; EDIF; IEC 61850 / CIM (IEC 61970); IEC 60617 symbols |
| Digital hardware | Event-driven HDL simulation; synthesis; static timing analysis | Verilator, Icarus, GHDL, Yosys, nextpnr, CIRCT, cocotb, digitaljs (browser) | Questa, VCS, Xcelium, Vivado | Verilog/SystemVerilog (IEEE 1800), VHDL (IEEE 1076), VCD/FST waveforms, Liberty .lib, LEF/DEF, GDSII/OASIS |
| Chemical / process | Steady-state flowsheets (sequential-modular vs equation-oriented); equations of state (Peng-Robinson, SRK, NRTL, UNIFAC); reaction kinetics; column MESH equations | DWSIM 9.0.5 (CAPE-OPEN compliant; its GitHub repo shows as archived 2026-08-11 [V] https://github.com/DanWBR/dwsim/releases ; meaning unverified), Cantera, CoolProp, thermo/chemicals (Python), IDAES (Pyomo) | Aspen Plus/HYSYS, gPROMS, UniSim, ChemCAD | CAPE-OPEN (thermo and unit-operation interfaces), DEXPI (P&ID exchange), ISO 15926, AnIML; GHS/SDS |
| Aerospace | Panel and vortex-lattice methods; RANS CFD; 6-DOF flight dynamics; orbital mechanics (Kepler, SGP4); aeroelasticity; trajectory optimisation | SU2, OpenVSP, XFOIL, AVL, JSBSim, GMAT, Orekit, OpenMDAO, Basilisk | Flow360 (GPU-native CFD, browser UI, on Rescale since 2026-01 [V] https://www.flexcompute.com/flow360), STK, Fluent, Star-CCM+, NASTRAN | CGNS, CCSDS (TLE, OEM), DO-178C/DO-254 (process), JSBSim XML, ARINC 429/653 |
| Marine / offshore | Hydrostatics (displacement, GZ curves); potential-flow seakeeping (BEM); resistance (Holtrop-Mennen); mooring | Capytaine, OpenFAST (wind turbines, NREL), MoorDyn, DELFTship (free tier), OpenFOAM | Orcaflex, Maxsurf, WAMIT, ANSYS AQWA | Class rules (DNV, ABS), the IMO stability code, NMEA 0183/2000, S-100 |
| Biomedical | Musculoskeletal (Hill muscle, inverse dynamics); cardiovascular 0D/1D/3D (Windkessel); pharmacokinetics compartments; tissue FEM (hyperelastic) | OpenSim, FEBio, SimVascular, Tellurium/libRoadRunner, COPASI, CellML/OpenCOR | AnyBody, LifeMOD, Simcyp | SBML, CellML, DICOM, FHIR, OpenSim .osim, ISO 13485 / IEC 62304 (process) |
| Materials | DFT; molecular dynamics; CALPHAD phase diagrams; crystal plasticity; homogenisation of composites (rule of mixtures, Mori-Tanaka) | Quantum ESPRESSO, LAMMPS, pycalphad, pymatgen with the Materials Project, ASE, DAMASK, MOOSE | VASP, Thermo-Calc, Materials Studio, Granta MI | CIF, POSCAR, TDB (CALPHAD), OPTIMADE API, MatML |
| Manufacturing | Toolpath (CAM); cutting forces; process planning; injection moulding flow (Hele-Shaw); additive slicing and thermal distortion; discrete-event factory simulation; scheduling | FreeCAD Path/CAM, LinuxCNC, PrusaSlicer, CuraEngine, OpenPLC, SimPy, OR-Tools | Mastercam, Moldflow, Plant Simulation, FlexSim | G-code (ISO 6983), STEP-NC (ISO 14649), 3MF, MTConnect, OPC UA, ISA-95, PackML |
| Nuclear | Neutron transport (Monte Carlo, deterministic SN/MOC); depletion; point kinetics; thermal-hydraulics (subchannel) | OpenMC, MOOSE (and the Griffin/BISON apps, which are access-controlled), Serpent (free licence) | MCNP (controlled), CASMO/SIMULATE, RELAP5 | ENDF/B-VIII nuclear data, ACE, HDF5 |
| Environmental | Atmospheric dispersion (Gaussian plume, AERMOD); groundwater (MODFLOW); climate/earth-system models; LCA (process inventory matrix) | AERMOD (EPA), MODFLOW 6, WRF, Brightway2 (LCA), openLCA, OpenLCA data | GaBi/Sphera, SimaPro | ISO 14040/44, ILCD, EcoSpold, NetCDF-CF |
| Systems | Requirements, architecture, trade studies; SysML v2 (OMG adopted SysML v2.0, KerML 1.0 and the Systems Modeling API on 2025-06-30, announced 2025-07-21, edited 2026-03 for ISO submission [V] https://github.com/Systems-Modeling/SysML-v2-Release); MDO (OpenMDAO); reliability (FMEA, fault tree, RBD, Markov) | SysML v2 pilot implementation, OpenMBEE, Capella, OpenMDAO, Eclipse SysON | Cameo, Rhapsody, Dyad 3.0 (JuliaHub, $65M Series B, 2026-04-30 [V] https://www.prnewswire.com/news-releases/juliahub-raises-65m-series-b-and-launches-dyad-3-0--bringing-agentic-ai-to-industrial-digital-twins-302758881.html) | SysML v2 textual notation and REST API, ReqIF, FMI 3.0 / SSP, OSLC |
| Software / controls | Transfer functions, state space, root locus; LQR, MPC; Kalman filtering; hybrid automata; real-time scheduling | python-control, CasADi, acados, do-mpc, Scilab/Xcos, ROS 2, OpenPLC (IEC 61131-3) | Simulink/Stateflow, dSPACE, LabVIEW, CODESYS | IEC 61131-3 (ST, LD, FBD, SFC); IEC 61499; FMI; ASAM XCP/MDF4; AUTOSAR |
| Mining | Block models and kriging (geostatistics); pit optimisation (Lerchs-Grossmann, pseudoflow); scheduling; rock mechanics; comminution (Bond) | gstools, PyKrige, OpenMining-type pit optimisers, GemPy (implicit geology) | Leapfrog, Deswik, Vulcan, Datamine, Whittle | OMF (Open Mining Format, GMG), JORC/NI 43-101 (reporting), CSV block models |
| Agricultural | Crop growth (DSSAT, APSIM: radiation use efficiency, water balance); soil water (Richards); irrigation scheduling (FAO-56 Penman-Monteith); livestock energetics | DSSAT, APSIM Next Gen, AquaCrop-OSPy, PCSE/WOFOST | Climate FieldView, John Deere ops | ICASA data standards, ISOBUS (ISO 11783), FAO-56 |

Verified versions [V]:
- OpenFOAM: Foundation release 13 (2025-07, https://openfoam.org/release/13). The ESI/Keysight releases are v2506, v2512 and v2606, and OpenCFD joined Keysight on 2025-05-01 (https://www.openfoam.com/news/main-news).
- FEniCSx: DOLFINx 0.10 is released, release notes for 0.11 exist, and 0.12 is in development (https://github.com/FEniCS/dolfinx/releases).
- SUMO 1.24.0: released 2025-07-22, adding parquet output (https://newsroom.eclipse.org/node/42507).
- EnergyPlus: I could confirm only 25.1 (https://ost.ecosyste.ms/projects/20048/releases).

**Cross-cutting point [I].** Each discipline lives on a few exchange formats, and those formats are its real API. They are STEP AP242, IFC 4.3, SPICE netlists, FMI/SSP, CAPE-OPEN, SBML/CellML, CGNS/HDF5, NetCDF, URDF/MJCF, and Gerber/IPC-2581. If Nexus cannot read and write these, it cannot exchange work with the rest of engineering. The format nodes in section B are ranked for that reason.

### A2. Equation-based and multi-physics modelling

- **Modelica.**
  - MSL 4.1.0 was released 2025-05-23. About 560 issues were addressed, 17 new components were added, and it is backward compatible with 4.0 [V] https://modelica.org/news/2025-05-23-release-msl-4_1_0.
  - OpenModelica 1.25.0 shipped 2025-04-04, and 1.25.7 is the patch needed for MSL 4.1 [V] https://openmodelica.org/doc/OpenModelicaUsersGuide/1.25/githubreleases.html.
  - The Buildings library has been tested with OpenModelica 1.26.3 [V] https://simulationresearch.lbl.gov/modelica/downloads/archive/modelica-buildings.html.
  - The core ideas [K]: acausal connectors, which hold *potential* (across) and *flow* (through) variables, with flow summed to zero at each connection (Kirchhoff); `stream` connectors for convected quantities; the compiler pipeline of flattening, alias elimination, BLT sorting (Tarjan), tearing and Pantelides index reduction, then dummy derivatives; and events through zero-crossings with `when`/`reinit`.
  - **What this means for Nexus [I]:** Nexus's laws (`lawgraph.ts`) and its interfaces (`Iface`) already look like connectors. What is missing is the flow-sum rule and the structural compiler that turns a board of physical connections into a solvable DAE.
- **FMI 3.0 (2022) [V]** https://fmi-standard.org/docs/3.0. It adds:
  - clocks, terminals (bundles of signals with flow and stream members), array and binary variables, intermediate update and event mode in co-simulation, and Scheduled Execution;
  - *layered standards*, such as FMI-LS-BUS for CAN, FlexRay and Ethernet, published 2025-07-18 [V] https://fmi-standard.org/fmi-ls-bus/1.0.0.
  - SSP (System Structure and Parameterization) describes how FMUs are wired together [K].
  - **For Nexus [I]:** a folded board maps naturally to an FMU: inputs, outputs, parameters and states. FMI is the obvious export format for "a board folded into one node". The FMU's C binaries do not run in a browser, but FMUs that ship source code can be compiled to WebAssembly.
- **Julia ModelingToolkit / SciML [V].**
  - MTK is a symbolic-numeric acausal system with automatic index reduction, sparse Jacobians and generated code (https://docs.sciml.ai/ModelingToolkit/stable).
  - A licence and library split was proposed for MTK v11 (Discourse thread, 2025-12-06, https://discourse.julialang.org/t/modelingtoolkit-v11-library-split-and-licensing-community-feedback-requested/134396). The final outcome is unverified.
  - Dyad is JuliaHub's language that compiles to MTK. It unifies causal, acausal and synchronous state machines and has an AI agent; version 3.0 is GA (https://juliahub.com/products/dyad).
  - **Dyad is the closest commercial analogue to Nexus's in-app agent working through nodes [I].**
- **SysML v2 [V]:** adopted (see A1). Its textual notation is meant to be generated and diffed by machines, and it has a standard REST API.
  - **For Nexus [I]:** requirements and verification cases (`requirement def`, `verification def`, `satisfy`) map to "check" nodes. SysML v2 text is a plausible exchange format for Nexus's board-level structure.
- **Bond graphs [K]:** an energy-port formalism (effort and flow; elements 0/1, R, C, I, TF, GY). Causality assignment (SCAP) finds algebraic loops and derivative causality before solving.
  - **For Nexus [I]:** a cheap, structural, pre-solve check that can be explained: "this board has a dependent inertia".
- **Simscape [K]:** acausal physical networks inside Simulink, with domains (mechanical, electrical, thermal, hydraulic, gas, moist air). Its strength is a domain library with consistent units, plus a solver-configuration block per network.
- **COMSOL-style multiphysics [K]:** PDEs in weak form, any coupling chosen by the user, an "equation view" that shows the physics behind every interface, and Application Builder apps.
  - The lesson: show the equation behind every node. FEniCS's UFL gives the same weak-form power as open source.
- **FEniCSx / deal.II [K]:**
  - FEniCSx: weak forms in UFL are compiled to kernels; there is mixed-dimensional assembly as of 0.9 [V] https://fenicsproject.org/blog/v0.9.0.
  - deal.II: adaptive hp-FEM.
  - Neither runs in a browser natively. Pyodide and DOLFINx-in-WebAssembly experiments may exist, but I did not verify any.
- **OpenFOAM / SU2 [K]:** finite-volume CFD. SU2 also has adjoint-based shape optimisation. Both are heavy, so for Nexus they belong on a server; in the browser, surrogate models are the realistic route [I].
- **Physics engines.**
  - MuJoCo: 3.4.0 (2025-12-05) added sleeping islands; 3.5.0 (2026-02-12) was the official release of MuJoCo Warp; 3.7.0 is dated 2026-04-14 [V] https://mujoco.readthedocs.io/en/3.7.0/changelog.html. DeepMind publishes official WebAssembly bindings on npm as `@mujoco/mujoco`, Apache-2.0, ESM, with TypeScript declarations [V] https://github.com/google-deepmind/mujoco/blob/main/wasm/README.md. A third-party page claims it runs 3.11.0 of that package (https://urdfbase.com/mujoco); this conflicts with the changelog and is unverified.
  - Newton: Disney Research, DeepMind and NVIDIA; now a Linux Foundation project, Apache-2.0, built on Warp, with MuJoCo Warp as its main backend plus XPBD, VBD and Featherstone solvers [V] https://github.com/newton-physics.
  - Drake [K] (https://drake.mit.edu): rigorous multibody with hydroelastic contact, plus mathematical programming and trajectory optimisation (MathematicalProgram, with Gurobi, Mosek, SNOPT and IPOPT solvers).
  - Project Chrono 9.0 (2024-05) added URDF, FMI 2.0 export and import, and ROS 2; 10.0 came out 2026-03 [V] https://groups.google.com/g/projectchrono/c/Zz7n22fSJh8/m/6mjqxSefBQAJ.
  - Jolt (which Nexus uses): deterministic on the same binary by default. Cross-platform determinism needs the compile-time define `JPH_CROSS_PLATFORM_DETERMINISTIC`, which disables FMA and costs about 8%. The prebuilt JoltPhysics.js packages do *not* enable it [V] https://developer.playcanvas.com/user-manual/physics/ammo-alternatives/ and https://jrouwe.github.io/JoltPhysics/_core_8h_source.html. **This bears directly on open question R3 in `plan/QUESTIONS.md`.**
- **SPICE / KiCad / HDL:** covered in A1. ngspice already runs in browsers through Emscripten (EEcircuit, ngspiceX, NodeSim) [V]. HDL in the browser: digitaljs, and Verilator through WebAssembly experiments [K].
- **Other domain solvers:** DWSIM, EnergyPlus, SUMO, OpenSees, SWMM and HEC-RAS are covered in A1. EnergyPlus's lesson [K]: a building is a *schedule-driven*, timestep-driven heat balance. Its IDF/epJSON input is a flat object database, and the Modelica Buildings library couples to EnergyPlus through Spawn.

### A3. Languages and frameworks for a browser-first "simulate anything"

- **WebGPU / WGSL [V].**
  - Shipped in Chrome and Edge 113 (2023-05), Firefox 141 on Windows (2025-07; macOS on Apple Silicon in Firefox 145; Linux and Android in progress), and Safari 26 (2025-09) on macOS, iOS and visionOS.
  - The W3C spec is a Candidate Recommendation Draft (2026-09-15).
  - MDN still lists it as "Limited availability", not Baseline, and it is an Interop 2026 focus area. Sources: https://en.wikipedia.org/wiki/WebGPU and https://mainstaydigital.com/newsroom/webgpu-baseline-2026-webxr-unified.
  - Quest Browser's WebGPU status: not verified (still open as R1).
  - **For Nexus [I]:** compute shaders for explicit solvers such as SPH, LBM, explicit FEM, cloth and particles, and for surrogate-model inference. Keep a WebGL2 or CPU fallback for every node.
- **WebAssembly [K].**
  - C/C++ through Emscripten: OCCT/replicad, Jolt, MuJoCo and ngspice already go this way.
  - Rust through wasm-bindgen (Rapier, wgpu, nalgebra). Zig compiles to wasm32 directly.
  - Wasm threads need cross-origin isolation (COOP/COEP headers). WasmGC, memory64 and JSPI (stack switching) are now landing [K].
  - **Licence point [I]:** linking LGPL code such as OCCT and ngspice into WebAssembly raises questions about whether users can relink. CalculiX (GPL) is fine as a separate process but not inside the page.
- **Pyodide [V]:** 0.28.0 (2025-07-04) moved to Python 3.13 and a new ABI on Emscripten 4.0.9, with packages split into their own recipes repository; 0.29 came out 2025-10-20 (https://blog.pyodide.org/posts/0.28-release/). It opens the browser to NumPy, SciPy, CoolProp, thermo, pandapower and similar tools, with a first load that is heavy in seconds and megabytes [K].
- **Julia [K]:** no production WebAssembly target. Use it server-side (MTK, Dyad) only.
- **Lean 4 / Coq [K]:** Lean 4 and Mathlib for verified mathematics. The realistic use for Nexus is a small set of *verified identities and unit algebra*, not verifying solvers [I]. Lean runs in the browser through its WebAssembly server (the live.lean-lang.org approach) [K].
- **Datalog / logic programming [K]:** Soufflé, Datalog-in-JS (datascript), and differential dataflow. **For Nexus [I]:** rules such as "what may touch", "what needs what" and clearance reasoning are naturally Datalog: recursive and incremental, with provenance ("why does this hold?").
- **Constraint languages [K]:** MiniZinc (it has a JavaScript/WebAssembly build with Gecode and Chuffed), OR-Tools CP-SAT (it can be compiled to WebAssembly), and Z3 in WebAssembly (the official `z3-solver` npm package).
  - **For Nexus [I]:** discrete design choices (which bearing, which bolt, which motor), placement and sizing are CP/MIP problems. A solver node with an explainable unsat core ("these three requirements conflict") fits the "no guessing" rule exactly.
- **Probabilistic programming [K]:** Stan, PyMC, NumPyro, and WebPPL (browser).
  - **For Nexus [I]:** uncertainty propagation (tolerances, material scatter, load uncertainty) and calibrating parameters against measurements. The "labelled typical or estimate" rule wants a distribution type, not just a tag.
- **Differentiable programming [K]:** JAX, MJX/MuJoCo Warp (differentiable physics), and Enzyme (automatic differentiation of LLVM, so of WebAssembly-compiled C++).
  - **For Nexus [I]:** gradients through a board make optimisation and inverse design possible ("what wall thickness gives 2 mm deflection?"). In TypeScript, forward-mode dual numbers are cheap to add to `numeric.ts`.
- **Dataflow / reactive systems.**
  - Observable [K]: a reactive notebook. Cells are nodes, dependencies are found automatically, and generators drive streaming values.
  - Excel [V]: builds a dependency tree, then a calculation chain, and recalculates only the dirty cells and their dependents. Independent chains are calculated in parallel, and the chain is reordered when a cell turns out to need an uncalculated precedent (https://learn.microsoft.com/en-us/office/vba/excel/concepts/excel-performance/excel-improving-calculation-performance).
  - HyperFormula [V]: an open JavaScript equivalent with cycle detection through strongly connected components (https://handsontable.com/blog/introducing-hyperformula-fast-javascript-calculation-engine).
  - Excel's LAMBDA and LET [K] made spreadsheets Turing-complete and gave reusable named functions, which is Excel's version of folding.
- **Node-based tools: what their node models do that Nexus's should.**
  - **Houdini** [K, partly V]: geometry carries *attributes* on points, primitives and vertices, and nodes are pure functions of geometry. There are three graph contexts (SOP, DOP for dynamics, PDG/TOPs for task graphs with caching and distribution). Houdini 21's APEX separates graph building from graph invocation, and graphs are themselves data that other graphs build [V] https://www.sidefx.com/docs/houdini/character/kinefx/apexgraphbasics.html and https://digitalproduction.com/2026/07/01/houdini-rigging-how-i-learned-to-stop-worrying-and-start-loving-apex. Lessons: **graphs as values; a task graph separate from the data graph; work items with caching.**
  - **Grasshopper** [K]: data trees (paths `{0;1}`) with automatic list matching (longest, shortest, cross reference). Lesson: **implicit vectorisation and explicit tree structure**, so one node runs over a hundred bolts.
  - **Blender geometry nodes** [V]: *fields* (deferred per-element functions evaluated on the geometry that receives them); simulation and repeat zones; in 5.0, bundles (typed structs on one wire) and closures (functions as wire values, with an Evaluate Closure node), described as enabling "declarative systems" (https://code.blender.org/2025/08/bundles-and-closures). Lesson: **fields, zones for loops and time, bundles, and closures as first-class values.**
  - **Unreal Blueprints** [K]: execution wires (control flow) separate from data wires; events; latent nodes (asynchronous waits); pure versus impure nodes. Lesson: **make the pure/impure distinction explicit, and model asynchronous AI calls as latent nodes.**
  - **TouchDesigner** [K]: operator families by data type (TOP textures, CHOP channels, SOP, DAT tables), evaluated by pull ("cook") only when viewed or needed. Lesson: **lazy, demand-driven cooking, with a per-node cook-time readout.**
  - **ComfyUI** [K]: a JSON workflow as the file format; an execution cache keyed by input hashes, so only changed subgraphs rerun; a custom-node ecosystem. Lesson: **a content-addressed cache, and the workflow file as a shareable artifact.**
  - **Node-RED** [K]: message passing (`msg` objects), flows as JSON, a community library of 5,000+ nodes [K, number unverified]. Lesson: **an event/message model for IoT and live data.**
  - **LabVIEW** [K]: true dataflow (a node fires when all inputs arrive), structures (loops, case, sequence) as frames, and FPGA targets. Lesson: **firing semantics, and loops as visible frames.**
  - **Simulink** [K]: causal blocks with sample times (continuous, discrete, multi-rate); algebraic-loop detection; Stateflow for modes; code generation. Lesson: **sample-time propagation, colour-coded rates, and loop detection with a fix proposed.**
- **Text and AI CAD [V]:**
  - Zoo (formerly KittyCAD): KCL is parametric code that text-to-CAD generates and users edit (https://docs.zoo.dev/modeling-app). Zoo itself said in August that its newer parametric model was less reliable than the older one (https://docs.zoo.dev/blog/whats-new-august).
  - LLMs writing Modelica (ModiGen, 2025-03, https://arxiv.org/abs/2503.18460) often produce models that do not simulate. Accuracy improves with retrieval, fine-tuning and *simulation feedback loops*, which matches Nexus's "repair loops as nodes" approach [V, inference on the match].

### A4. Who else is trying "simulate anything for everyone"

| Player | What it is | Why it succeeds or struggles |
|---|---|---|
| Wolfram (Language, System Modeler) [K] | Curated computable data (`Entity`, units, materials), symbolic plus numeric, Modelica-based System Modeler | **Succeeds** on curated data and one language. **Struggles** with a closed, costly licence and a community that cannot add to the core. Lesson: the curated knowledgebase *is* the product. |
| Onshape [V] | Browser CAD. FeatureScript (users write features); linear static and modal analysis inside assemblies that follows mates and versions; custom features publishable; v1.219 dated 2026-08-07 (https://www.onshape.com/en/changelog/) | **Succeeds** with no installs, real-time collaboration and branching or merging of the design history. Lesson: **version history and branching as the core data model**; simulation that stays in sync with geometry changes. |
| Shapr3D [K] | Parasolid-based direct modelling, tablet and pen first, Vision Pro | **Succeeds** on input UX. Lesson: direct manipulation beats dialog boxes, and in XR the hand *is* the pen. |
| Algodoo [V, minimal] | 2D physics sandbox by Algoryx; macOS build updated 2026-01 (https://sourceforge.net/app/algodoo/mac/); no roadmap found | **Succeeded** in classrooms through immediacy: draw, and it simulates. **Struggled** to grow beyond 2D toys. Lesson: zero-setup fun first. |
| PhET [V] | About 160 HTML5 simulations from CU Boulder, tested through student interviews; principles include "implicit scaffolding through limited controls" and "making the invisible visible" (https://phet.colorado.edu/en/about) | **Succeeds** through research-tested, narrow, deep sims. Lesson: **limited, meaningful controls**, and show what cannot be seen (forces, fields, current). |
| Universe Sandbox [V] | Real-time gravity, climate and collisions; Update 36 rebuilt physics on Unity DOTS; 2026 work on life simulation and mobile (https://universesandbox.com/blog) | **Succeeds** on awe and scale. **Struggles** because accuracy versus fun is a constant trade, and features keep slipping (their own words). Lesson: be honest about where accuracy ends. |
| Brilliant [K] | Interactive problem-solving lessons | Lesson: learning by guided small steps. |
| SimScale [V] | Browser CAE (CFD, FEA, thermal); pump "foundation AI" model built with NVIDIA PhysicsNeMo (2025-03); claims 800k registered users (2026-03); an AI agent reported 2026-08 (third-party source, unconfirmed) | **Succeeds** with cloud solvers and no installs. **Struggles** because the AI surrogates are narrow (one class of product) and validation is vendor-claimed. Lesson: a surrogate must state its training domain. |
| Flow360 / Flexcompute [V] | GPU-native CFD, browser UI and Python API, "10–100×" speed claims that are inconsistent between its own pages | Lesson: speed changes behaviour (many design variants); vendor numbers need independent checks. |
| Collimator [V, inconclusive] | Browser block-diagram modelling on JAX: autodiff, PID auto-tune, SINDy, MPC, FMU, Python blocks (2024 demo video https://www.youtube.com/watch?v=oz6hIcWmAWU); the `pycollimator` PyPI package is **archived**, last release 2025-04-07 | Status unknown. I found no shutdown announcement. **[I]:** an archived package suggests a pivot or wind-down. Lesson, if so: "Simulink in the browser" alone did not create a moat. |
| Dyad / JuliaHub [V] | Acausal plus causal plus state machines, agentic AI, $65M Series B (2026-04-30) | The most direct competitor to Nexus's agent-plus-physics vision, aimed at industrial engineers rather than "everyone". |
| Newton, MuJoCo Playground, Genesis [V/K] | Robotics simulation for reinforcement learning | Not end-user tools, but they set expectations for contact fidelity and GPU throughput. |

**What these cases show [I]:**
- **Successes share four things:** zero install; immediate feedback; a curated, trustworthy library (Wolfram, PhET, MSL); and a community extension mechanism (FeatureScript, ComfyUI custom nodes, Grasshopper plug-ins).
- **Failures share three:** a general solver with no curated content; fidelity that cannot be checked (vendor-only validation); and narrowness that does not generalise (one-domain surrogates, 2D sandboxes).
- Nexus's advantages are the library law, sourced numbers, and an AI that builds through nodes. Its risks are breadth with no depth, and browser performance limits.

### A5. What is still open after this round
- Collimator's 2025–2026 status.
- Whether EnergyPlus 25.2 exists.
- Whether GNU Radio 4.0 stable has shipped.
- Whether the DWSIM repository archive means development moved elsewhere.
- WebGPU in Quest Browser.
- The outcome of the MTK v11 licence change.
- The latest `@mujoco/mujoco` npm version: 3.7.0 per the changelog, while a third-party page claims 3.11.0.
- Whether Jolt built with the cross-platform define gives bit-identical results in WebAssembly versus native.

---

## (B) Ranked list of what Nexus should take

All of section B is [I]: my recommendations, each mapped to a node or capability. Owners follow `docs/OWNERS.md`; extend the owner named rather than writing a second one.

1. **An acausal connector algebra: potential and flow ports, with flow summed to zero at each junction (Modelica, Simscape, bond graphs).** Generalise `Iface` and `lawgraph.ts` so that every physical port declares its domain, its across and through variables and their units. Nodes `port.<domain>` and `junction`. This is what turns a board into one coupled system instead of a chain of formulas.
2. **A structural DAE compiler: BLT, tearing, Pantelides index reduction, algebraic-loop detection with an explanation.** Owner `numeric.ts`, plus a new stage in `docs/COMPILER.md`. Node `system.compile`, which outputs its sorted blocks, its torn variables and the reason for each. This is the bond-graph causality check as a node.
3. **Incremental, content-addressed evaluation (Excel's dirty propagation, ComfyUI's input-hash cache, TouchDesigner's pull cooking).** Owner `dataflow.ts` (`Engine`). Per-node cook time and cache hit or miss shown on the node; strongly-connected-component detection for cycles.
4. **Implicit vectorisation and data trees (Grasshopper trees, Houdini attributes, Blender fields).** One node runs over N parts by path. Adds a `tree` or `field` wire type to `dataflow.ts`.
5. **Graphs and functions as values (Blender closures and bundles, Houdini APEX).** A `closure` wire type and a `bundle` wire type, so a folded board can be passed into a sweep, an optimiser or a repeat zone. This extends the agent's existing fold.
6. **Zones for time and iteration (Blender simulation and repeat zones, LabVIEW frames, Simulink sample times).** Nodes `zone.simulate(dt)`, `zone.repeat`, `zone.until`. Sample-time propagation, with rates colour-coded on wires. Ties to `Engine.tick`.
7. **A constraint and choice solver node with an unsat core (MiniZinc, CP-SAT, Z3 in WebAssembly).** Node `solve.choose`: pick a bearing, bolt or motor from the library under the requirements. On failure it returns the minimal set of requirements that conflict. Owner: the placement/sizing module.
8. **FMI 3.0 export and import, with SSP for wiring.** Nodes `export.fmu` (a folded board becomes a source-code FMU) and `import.fmu` (source FMUs compiled to WebAssembly). This is the path to Modelica, Simulink, Dyad and Chrono.
9. **Exchange formats as nodes.** `io.step` (AP242, through OCCT/replicad, which already reads STEP), `io.ifc` (IfcOpenShell in WebAssembly, or web-ifc), `io.spice` (netlist read and write), `io.urdf`/`io.mjcf`, `io.gltf`/`io.usd` (OpenUSD Core Spec 1.0, 2025-12 [V] https://aousd.org/uncategorized/core-spec-announcement/), `io.gerber`/`io.ipc2581`, `io.sbml`, `io.sysml2`.
10. **A browser SPICE node (ngspice in WebAssembly, as EEcircuit does).** Node `sim.spice`: a part's electrical `Iface`s become a netlist automatically. This makes the "down to the transistor" goal real.
11. **MuJoCo in WebAssembly as a second physics engine beside Jolt.** Node `sim.mujoco` for articulated and contact-rich mechanisms, with MJCF export of a board. Each engine checks the other; disagreements are reported, not hidden.
12. **Uncertainty as a value type (probabilistic programming).** Each sourced number can be a distribution (tolerance, scatter). Node `uq.montecarlo` / `uq.sensitivity` (Sobol). This turns "labelled typical or estimate" into numbers that can be computed with.
13. **Forward-mode automatic differentiation in `numeric.ts`.** Node `optimise` (gradient-based, with bounds) and node `inverse` ("find the X that gives Y"). It opens sizing to gradient methods.
14. **Requirements and verification cases (SysML v2).** Nodes `requirement` (bound, unit, source) and `verify` (which check satisfies it), with a traceability matrix over the board. The critic's checks become `verify` nodes.
15. **Surrogate nodes that state their domain (SimScale, Flow360, PhysicsNeMo).** Node `surrogate`: trained or fitted on solver runs, carrying its training envelope; it refuses to extrapolate and says so. WebGPU inference.
16. **A WebGPU compute tier for explicit solvers.** Nodes `sim.sph`, `sim.lbm` (2D/3D flow for an intuition-level view), `sim.explicitFEM`, labelled "qualitative" against their validated counterparts.
17. **Remote heavy solvers as service nodes, the way `api.*` already works.** `remote.openfoam`, `remote.calculix` (exists locally), `remote.su2`, `remote.energyplus`, `remote.sumo`, `remote.opensees`, `remote.swmm`, each with the two-minute cap and honest failure reporting from `genai.ts`.
18. **Discipline packs as library boards, using real standards' data where licences allow.** Pick-list of rule packs: SWMM/EPANET pipe hydraulics (EPA, public domain), FAO-56 crop water, Holtrop resistance, Hill muscle, Gaussian plume, Bond comminution, point kinetics, Peng-Robinson (CoolProp). Owner `nexus/book/`.
19. **Requirement-driven "show the equation" panels (COMSOL equation view, PhET's "make the invisible visible").** Every node can open its governing equation, its assumptions and its sources; force, field and current arrows in VR.
20. **Firing and purity semantics (Unreal, LabVIEW).** Pure versus effectful nodes are marked; AI and network calls are latent nodes with visible wait states. This directly serves "every AI flow explained step by step".
21. **Version history and branching of boards (Onshape).** Content-addressed board versions, diff and merge, so the agent proposes changes on a branch and they are judged before merging.
22. **Datalog-style rules with provenance for "what may touch", "what needs what" and clearance.** Node `rules.query`, answering "why" with a derivation tree. Owner: the critic/rules module.
23. **A verified-identities core (Lean, a small scope).** Unit algebra and a handful of law identities checked once. A credibility signal, low priority.
24. **Event and message nodes for live data (Node-RED, MQTT, OPC UA, MTConnect).** So a digital twin can connect to real sensors later.

---

## (C) Questions

The questions of this pass are chapter 2 of `../BOOK-OF-QUESTIONS.md`.
