# Research: simulating life, the universal equations, and one formalism for all of physics

One research pass, 2026-10-31, by a research agent. Marks: **[D]** checked in that pass, with its link; **[K]** a
standard fact quoted from memory, to be checked before it becomes a sourced number; **[I]** the agent's inference or
recommendation. The [K] figures most worth checking: turbulence grid scaling Re^(9/4); the 2 fs molecular dynamics
step; GPS drift of about 38 μs a day without relativity; the Kleiber exponent of about 0.75; the Standard Model's
roughly 19 parameters.

## (A) Findings

### Artificial life and emergence

- **Game of Life (1970)** [D] (wikipedia.org/wiki/Conway%27s_Game_of_Life): universal; gliders as bits, collisions as
  gates; Rendell's Turing machine in Life (11,040 generations a cycle; a universal one in 2010). [K] Its long-run
  behaviour is undecidable: sometimes only running it tells. **Lesson**: simple local rules suffice for unbounded
  complexity; some outcomes can only be simulated, never predicted.
- **Lenia** [K] (Chan, Complex Systems 28(3), 2019): Life made continuous; 400+ named self-moving species. **Flow-Lenia**
  [D] (arXiv 2212.07906, ISAL 2023): mass conserved (matter moved by a flow, never made) and rules carried by the
  matter, so species with different rules share a world and evolve; about 80 % of random searches give localised
  patterns. **Lesson** [I]: a conservation law plus heritable local rules is what makes evolution possible (the library
  law's echo).
- **Particle Life** [K]: N types, an asymmetric attraction matrix, Newton's third law broken on purpose; cells and
  membranes emerge; WebGPU versions run in browsers [D]. [I] Must be labelled not physical.
- **Tierra, Avida, Polyworld**: Avida [D] (Lenski et al., Nature 423:139, 2003) evolved the logic function EQU through
  stepping stones, some harmful at the time. [I] Digital evolution is real evolution of digital things, not a
  simulation of biological evolution.
- **Neural cellular automata** [D] (Mordvintsev et al., Distill 2020): one small learned net per cell grows a shape and
  regrows it after damage.
- **ASAL** [D] (Sakana AI et al., Dec 2024, sakana.ai/asal): a vision-language model scores simulations (Lenia, Boids,
  Particle Life, Life, NCA) against a text target, for novelty and for diversity. [I] Fits "AI gates, judged blind".
- **Karl Sims' creatures** [K] (1994): a graph genome unfolded into blocks and joints, brains evolved with bodies; the
  creatures exploited the physics engine's integrator for free energy. [I] The main warning for evolving things in Jolt.
- **OpenWorm** [D]: C. elegans cell by cell (302 neurons, 95 muscles first); BAAIWorm (Nature Comput. Sci. 2024) closes
  brain, body and world in one loop. [I] Ten years on, the full wiring diagram has not given a whole worm that behaves
  right: the honest scale of the problem.
- **Whole-cell models** [D]: Karr et al., Cell 2012 (M. genitalium: 28 submodels in mixed formalisms joined through
  shared state on a 1 s step; 401 genes, 1,857 reactions, 1,836 parameters); Thornburg, Luthey-Schulten et al., Cell
  2026 (JCVI-syn3A, 493 genes, its whole ~100 min cycle in space and time, checked against new experiments; code on
  GitHub). Exchange standards [K]: SBML, CellML, SED-ML, BioModels; the Physiome Project.
- **Agent-based models**: NetLogo [K]; Mesa 3 [D] (JOSS 2025: seeded, data collector, sweeps); MASON [K]; the ODD
  protocol [K] for describing them; 200,000 pedestrians in a browser with WASM and WebGPU [D].
- **Ecology and epidemics** [K]: Lotka–Volterra; SIR (Kermack–McKendrick 1927) to agent-based (Covasim, CovidSim);
  mean-field is exact only for large well-mixed populations; CovidSim's reproducibility debate: seeds and review matter.
- **Morphogenesis** [K]: Turing 1952 (a fast-diffusing inhibitor); Gray–Scott; zebrafish stripes (Kondo and Asai 1995);
  positional information; vertex and Potts models. Cheap on a GPU grid in a browser [I].
- **Molecules** [D]: AlphaFold 3 (Nature 630:493, 2024; 200 million+ predicted structures; Nobel 2024). [K] It predicts
  static structures with a confidence per residue, not dynamics. Molecular dynamics (GROMACS, OpenMM) at a ~2 fs step;
  nanoseconds to microseconds typically; machine-learned potentials closing on quantum accuracy.
- **Evolution and open-endedness**: novelty search [K] (Lehman and Stanley); POET [D] (arXiv 1901.01753: environments and
  agents evolved together); MAP-Elites, NEAT, CMA-ES [K].
- **Biomechanics** [D]: OpenSim; OpenSim Moco (PLoS Comput Biol 2020): optimal control of motion, with a suite of
  problems with known answers. Hill-type muscles [K].

### The universal equations

- **Conservation** [K]: rate = flux in − flux out + sources; finite volumes conserve by construction; symplectic
  integrators keep energy bounded, explicit Euler drifts.
- **Noether** [K]: each symmetry gives a conserved quantity (time → energy; space → momentum; rotation → angular
  momentum; gauge → charge). [I] A rule for Nexus: a model with the symmetry must pass the matching check; one without
  says so.
- **Least action** [K]; variational integrators conserve momenta exactly.
- **Navier–Stokes** [K]: smooth existence in 3D an open Millennium problem; resolving turbulence costs ~Re^(9/4) grid
  points; practice uses RANS or LES; in a browser, stable fluids, SPH or lattice Boltzmann.
- **Maxwell** [K]: FDTD; circuits as the lumped limit when parts are much smaller than the wavelength.
- **Schrödinger** [K]: exponential in particle count; chemistry by Hartree–Fock, DFT, CCSD(T). [I] In a browser:
  one-particle demos and tight binding; the rest as cited data.
- **Einstein** [K]: numerical relativity needs supercomputers; weak-field Newton plus corrections covers what Nexus
  builds.
- **Standard Model** [K]: not simulated except by lattice QCD; [I] for Nexus a source of constants (PDG tables).
- **Thermodynamics and statistical mechanics** [K]; non-equilibrium thermodynamics as the frame for living things;
  England's "dissipative adaptation" a hypothesis, not a law.
- **Buckingham π** [K]: n variables in k dimensions reduce to n − k groups (Re, Fr, Ma, Pe, Da, Bi, St); [I] π groups
  decide which model may be used.
- **Multiscale** [K]: quantum → force fields → MD → coarse-grained → continuum → structure; QM/MM; heterogeneous
  multiscale; equation-free. [D] The whole-cell models' pragmatic way: submodels coupled through shared state on a
  fixed step.

**What a browser can do** [I]: in real time, rigid bodies, lumped circuits and thermal networks, reaction networks to
~10⁴ species, ~10⁵ simple agents, reaction–diffusion, cellular automata, NCA, Lenia; interactively at reduced
fidelity, SPH and lattice-Boltzmann fluids (~10⁵–10⁶ on WebGPU), 2D FDTD, small MD (~10⁴ atoms), soft bodies, Hill
muscles; only as imported results, turbulent CFD at engineering Reynolds numbers, 3D full-wave EM, DFT, protein folding,
numerical relativity, lattice QCD, whole-cell models.

**The honest limits**: chaos (statistics only past the predictability horizon); irreducibility; unknown parameters;
model-form error; "looks lifelike" is not validation; integrator artefacts; no law for minds; the bottom-up gap.

### One formalism for all of physics

- **Bond graphs** [K]: every domain is power = effort × flow (force and velocity, voltage and current, pressure and
  flow, temperature and entropy flow, chemical potential and molar flow); stores, inertias, dissipators, transformers,
  junctions; causality shows what must be integrated and where loops are; extended to biochemistry.
- **Port-Hamiltonian systems** [D] (Maschke and van der Schaft 1992): ẋ = (J − R)∇H + Bu. **Composition of
  power-conserving interconnections is again port-Hamiltonian: closure under composition, exactly what folding a board
  into a node needs.**
- **Modelica** [K] (OpenModelica, Dymola): acausal equations, connectors whose flows sum to zero, symbolic index
  reduction: [I] the most battle-tested pattern for a physical node graph; ModelingToolkit.jl the same in Julia.
- **Geometric algebra** [K]: Maxwell as one equation; motors for rigid motion (ganja.js in a browser); a representation,
  not a solver.
- **Discrete exterior calculus** [K]: fields as cochains on a mesh; div, grad, curl exact; Decapodes.jl [D] composes
  equations as diagrams and compiles them (its API "may change substantially").
- **Category theory** [D] (AlgebraicJulia: Catlab, AlgebraicPetri, AlgebraicDynamics): wiring diagrams and operads for
  two kinds of composition (shared resources; output into input); open systems as cospans glued at their ports. [I]
  This is the mathematics of what Nexus does: a board with exposed ports is a cospan, folding it is composition, and it
  gives a test: compose then simulate must equal simulate the composite.

## (B) What Nexus should take

| # | Take | As | Detail |
| --- | --- | --- | --- |
| 1 | Effort and flow ports | data model | every physical port carries a domain, an effort and a flow; their product checked as watts; connected ports share effort and their flows sum to zero (Modelica's rule) |
| 2 | A power balance | rule | each step: change in stored energy = port power − dissipation, within a tolerance; a breach reported |
| 3 | Conservation by symmetry | rule and a `conserve` node | a model declares its symmetries; the matching invariants are watched; one without declares it |
| 4 | A regime gate by π groups | `regime` node and a rule | Re, Ma, Pe, Kn, Bi, Da from inputs with units; each law node declares its validity in π groups; outside it, warn or refuse |
| 5 | A fidelity ladder with validity envelopes | extend `fidelity` | each level states its assumptions, error and what promotes or demotes it |
| 6 | Folding preserves behaviour | rule | a folded board gives the same trajectories as unfolded, tested on every fold |
| 7 | A multiscale coupler | `couple` node | submodels in different formalisms share stocks on a declared step (the whole-cell pattern); the step's sensitivity shown |
| 8 | Life substrates | `ca.rule`, `lenia`, `flowlenia`, `particle.life`, `nca`, `reaction.diffusion` | on WebGPU; each labelled "an abstract substrate, not a model of an organism" |
| 9 | Reaction networks | `species`, `reaction`; SBML and CellML import | mass action, Michaelis–Menten, Hill; deterministic when counts are large, Gillespie when small, switched and said |
| 10 | Epidemics and ecology | `sir`, `metapop`, `abm.contact` on the agents we have | the same parameters at every level so they can be compared; seeded; results as ensembles |
| 11 | Agent-model hygiene | data model | every agent board carries an ODD card, a seed and a data collector |
| 12 | Genome to body | `genome`, `develop` | a graph genome unfolds into library parts and joints; evolved in Jolt |
| 13 | An exploit guard | rule | before a fitness counts: energy gained from nothing, the step halved, tunnelling: Sims' lesson |
| 14 | Open-ended search | `evolve`, `novelty`, `map.elites`, `poet` | over any board's parameters |
| 15 | An AI judge for emergence | AI gate (ASAL) | scores frames; blind, logged, never counted as physical validation |
| 16 | Biomechanics | `muscle.hill`, `tendon`, `activation`, `track.motion` | on `act/`'s bodies; OpenSim's models as cited data |
| 17 | Molecules as data | `structure.fetch` (with its confidence), `md.small` | AlphaFold labelled "a predicted static structure"; heavy results attached, cited |
| 18 | Fields by DEC | data model | fields on meshes as cochains, div and curl exact |
| 19 | Geometric algebra motors | optional kinematics | low priority |
| 20 | Equations in tiers | on every law node | exact law, approximate law, empirical fit or phenomenological; derived from what; source |
| 21 | Chaos labelled | rule and a `lyapunov` probe | a predictability horizon; statistics after it |
| 22 | A "cannot simulate" register | data model | what is out of reach, why, and the nearest honest substitute; the AI reads it before promising |
| 23 | Validation suites | rule | known answers per node: SIR final size, Lotka–Volterra period, Gray–Scott regimes, Rendell's machine in Life, Moco's solutions, a pendulum's energy drift |

## (C) Questions

The 96 questions of this pass are chapter 3 of `../BOOK-OF-QUESTIONS.md`.
