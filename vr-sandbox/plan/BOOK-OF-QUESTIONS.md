# The book of questions

The user asked (2026-10-31) for "a list of questions that's a book in itself": every question Nexus must answer to
become what it is meant to be, the hard ones and the ones no one thought to ask. Each chapter gathers one territory.
The first chapter's questions come from the state of Nexus today; the rest come from the research wave of 2026-10-31
(its reports in `research/`), each chapter naming the report it came from:

1. Nexus itself · 2. All of engineering, its languages and frameworks · 3. Life and the universal equations ·
4. Mathematics · 5. Games, visualisation, the very large, and contests · 6. Philosophy, knowledge, invention, learning
and ethics · 7. Prompts, judges, and a picture to exact geometry

A question is answered by writing the answer under it with its date and how it was found (a measurement, a source, a
decision record). An answered question is not deleted: the answer stays beside it.

---

## Chapter 1. Nexus itself: the questions its own state raises

*From the code and the plan, 2026-10-31.*

### The vision: everyone a genius from an idea

1. What is the smallest idea a person could have that Nexus should turn into a working thing, and what is the largest?
2. When a person's idea is impossible (a perpetual motion machine), how does Nexus say so without crushing the idea, and
   what does it offer instead?
3. When a person has an idea but no words for its parts, what does Nexus ask them first?
4. How does a person who has never heard of a bolt's clearance class still get the right hole, and come away knowing
   why?
5. What does "genius" mean here: the person's insight, or the system's competence lent to them? Whose name is on the
   result?
6. What does Nexus do when two people's ideas meet in one world and disagree?
7. How will a child, an engineer and a farmer each find the same bridge node useful, and what does each see of it?
8. What should Nexus refuse to help build, and who decides?

### Truth and honesty

9. When a sourced figure and a measured one disagree, which wins, and how is the disagreement shown?
10. How does a number carry its uncertainty along every wire, and how is a person shown "± 8 %" without fear?
11. When a model is "approximate", approximate to what, measured how, and at which scales does it stop holding?
12. What is the honest unit of trust for a simulation: the model, the data, the solver, or the whole board?
13. If the AI is right 95 % of the time, how does a person know which 5 % they are in?
14. What does Nexus say when it does not know, and how often does it say it today? (Measure it.)
15. How do we tell a person "this is a look, not a measurement" (a thermal palette, a render) everywhere it matters?

### The interface model (spec 01)

16. Is every negative a pure function of the interface's standard, its fit and the host's material, or are there
    negatives that depend on how the part will be made or serviced?
17. When two parts' negatives overlap in a host (two holes too close), which yields, and who decides?
18. What is the negative of a weld, a glue joint, a press fit, a snap fit, a hinge, a cable, a pipe, a person's hand?
19. Is "room to work" (a wrench's swing, a hand's reach) part of the negative, and is it measured by a body's segments
    (the agents we have) or by a table?
20. When a bolt is pasted onto a curved, thin or composite surface, what does a real engineer do, and can the rules say
    it?
21. Can a negative be inverted again (a hole's negative is its bolt), and does that round trip always return the same
    thing?
22. What is the interface of a whole assembly (an engine's mounts), and is it the union of its parts' interfaces, or
    something new?
23. How do interfaces carry function (power flows through a shaft; data through a connector; fluid through a pipe)
    and not only geometry?
24. When an interface has no standard (a custom part), where do its sizes come from, and how are they labelled?

### The AI in the app

25. What is the smallest set of tools that lets the AI build anything, and what is it missing today?
26. When a pass is "context-aware" before piping forward, what exactly is checked, and what does a failed check send
    back?
27. How large can a request grow (a house, a city block) before passes must branch, and how do branches rejoin?
28. How does the AI learn from its own attempts without learning its own mistakes?
29. When the AI and the second judge disagree, who breaks the tie, and is the person shown both?
30. Should the AI ever be allowed to add a node to the library on its own, and under what checks?
31. What does the AI do with a request that is half engineering and half taste ("a nice lamp")?

### Scale and time

32. What is the smallest and the largest thing Nexus should model, and where along that range does each law stop
    holding?
33. When a person zooms from a city to a thread, what must be loaded, what may be guessed for show, and how is the
    difference told?
34. What does "rewind" mean for a simulation that is not deterministic, and is ours?
35. What does time mean for a building (decades), a battery (cycles), a bolt (fatigue), a person (a lifetime), and can one
    clock serve them all?
36. How does a person feel the difference between a second and a year inside the world?

### Data, sources and law

37. Who may contribute a source, and how is a wrong source found and removed everywhere it was used?
38. What happens when a standard is revised: which builds change, and are the old ones kept?
39. How is a licence carried with every value, so a source can be withdrawn cleanly?
40. What does Nexus do with the knowledge that no open source holds (design loads, many standards' tables)?

### Building it without losing the thread

41. Which of the constitution's rules will be broken first, and what check would catch it?
42. What is the one test's score today, honestly, and what is the cheapest line to turn green?
43. How do we know the evaluator is not simply agreeing with the builder?
44. When a session ends mid-task, what must `PROGRESS.md` hold for the next one to continue without re-reading
    everything?
45. Which decision records will turn out wrong, and how soon will we know?
46. What is Nexus built on that could disappear (a library, a service, a key), and what then?

### People, places and life

47. What does it mean to "design a room" for someone: their body, their habits, the light, the noise, the way they move?
48. How does Nexus model a person well enough to test a design against them, without pretending to model the person?
49. What is the first living thing Nexus should simulate honestly, and what would make that simulation trustworthy?
50. How should a city in Nexus differ from a city in a game, and where does it need to be the same?

### The phone and the world

51. What should Nexus do in ten seconds on a phone, held in one hand, on a bus?
52. What should be spoken, what shown, and what left out, when Nexus talks back?
53. When the phone is a remote for a headset, which of them is the world and which is the hand?

---

## Chapter 2. All of engineering, its languages and frameworks

*From `research/06-engineering-languages.md`.*

### C1. Semantics of the graph
1. When a board contains both causal blocks (signals) and acausal ports (physics), what is the rule for where the causal and acausal parts of the board meet, and who decides the causality of an acausal port wired to a causal input?
2. Is a node a pure function, a stateful object, or an equation set? Can one node be all three, and if so, how does the engine know which it is at run time?
3. What happens when two library parts each declare the same physical quantity (for example, a shaft's speed) as an *output*: is that an over-determined system, an alias, or an error?
4. How should cycles be treated: always an error (DAG only), solved as algebraic loops, or iterated to a fixed point? Can the engine tell which of the three a given cycle needs?
5. When a folded board becomes one node, which of its internal states become the folded node's states, and how is an inner index-reduction result kept valid when the outer board connects the node differently?
6. What is the identity of a wire's value over time: one value, a time series, a distribution, a field over geometry, or a closure? Should the type system allow all of them on one wire with lifting rules, like Grasshopper trees?
7. When a part is reused N times, are its N instances one node over a tree or N nodes? How does the answer change memory, explanation, and the agent's token cost?
8. If a closure (a folded board passed as a value) captures a library part and the library part's data changes, do existing boards that hold the closure change? Is the library law "stored once" compatible with reproducibility?

### C2. Equations, solvers and numerics
9. What is the smallest DAE solver (index-1 BDF or implicit Radau) that handles stiff mechanical-electrical-thermal coupling in TypeScript within a frame budget on a Quest, and is it measured or assumed?
10. How will Nexus detect and report a high-index system *before* solving, in words a non-engineer understands (for example, "two rigid parts are both told where to be")?
11. When Jolt (impulse-based, fixed 1/240 s) and an acausal DAE share a body, which one owns the state, and how is energy kept consistent across the boundary?
12. For co-simulation between Jolt, MuJoCo, SPICE and thermal networks, what communication step and coupling method (Jacobi, Gauss-Seidel, interface Jacobian) keeps stiff couplings stable, and how is instability detected and said?
13. Zero-crossing events (contact made, valve shut, relay flips): who localises the event time, and how is chattering (Zeno behaviour) detected and resolved?
14. Can every solver node report a *measured* error estimate (residual, step-halving difference, mesh convergence) rather than "converged: yes"?
15. Which numbers in the library are inputs to solvers whose sensitivity is high enough that their uncertainty dominates the output, and how will Nexus find them automatically?
16. If cross-platform Jolt determinism needs a custom WebAssembly build with `JPH_CROSS_PLATFORM_DETERMINISTIC` (about 8% slower), is rewind-by-replay worth that, or should rewind store snapshots instead?
17. When the browser FEM (or explicit WebGPU) disagrees with CalculiX by 12%, what decides which result is shown, and how is the disagreement made visible rather than averaged away?
18. How does Nexus choose between a closed-form law, a 1D lumped model, a 3D FEM and a surrogate for the same question, and can it state *why* that fidelity was enough?

### C3. Data, standards and interoperability
19. Which exchange formats are must-read (STEP AP242, IFC 4.3, SPICE, URDF/MJCF, glTF/USD) versus must-write, and what is lost in each direction (for example, PMI, mates, materials, parameters)?
20. When a STEP file arrives without a part tree that maps to library items, how does Nexus decide which solid is "an M8 bolt" and link it to the stored bolt, without guessing?
21. IFC and Uniclass carry no-derivatives licences (R5). If code mappings are not allowed, can Nexus still read and write IFC by schema alone, and what does that do to the "names, not nodes" decision?
22. Is a folded Nexus board exportable as an FMI 3.0 source-code FMU that runs in OpenModelica and Dyad unchanged, and which Nexus node kinds have no FMI equivalent?
23. What is the canonical unit and quantity system across imports (SPICE in SI, US hydraulics in cfs, IFC with project units), and where are unit conversions logged as provenance?
24. How does Nexus store a material so that a CALPHAD phase result, a datasheet value and an ASTM minimum can co-exist for one alloy with their sources and conditions (temperature, temper, direction)?
25. For electronics, should a part's footprint, symbol, SPICE model and IBIS model be one library item or four linked items, and which is the "truth" when they disagree?
26. What is Nexus's equivalent of a P&ID (DEXPI) for fluids and process boards, and can a process flowsheet and a 3D piping layout be the same board?
27. Which design-load sources (ASCE 7, Eurocode 1) can legally be encoded as data (R6), and if none can, how does a civil board make the load *a required, sourced input* instead of a default?
28. How are version and edition carried for standards (Eurocode 2004 versus the second-generation 2023+ Eurocodes, ASME Y14.5-2018), so that a check says which edition it applied?

### C4. Library, composition and the "down to the bolt" promise
29. At what depth does decomposition stop being useful for each question? Does a stress question on a bracket need the bolt's thread, and who decides the level of detail per question rather than per part?
30. When a library part is updated (a corrected mass), which boards rerun, which stay frozen, and how does a user see "your drone's mass changed by 3 g because the M3 nut was corrected"?
31. How does Nexus represent a part family (any GT2 pulley of N teeth) versus an instance, and can the constraint solver choose N while the rest of the board stays valid?
32. How are interfaces between disciplines declared, so that a motor exposes mechanical (shaft, mounts), electrical (windings, connector), thermal (heat rejected) and control (encoder) ports consistently?
33. Who owns a shared feature (the bolt circle of U7) when a third discipline (thermal contact, electrical grounding) also needs it?
34. How does a 59,046-item inventory stay trustworthy as it grows: what fraction is checked against a source each round, and how is rot detected?
35. When the same real product exists in two sourced variants (a 2019 versus 2023 model year), how does the library avoid a fork while keeping both true?
36. What is the minimal "kernel" set of parts (fasteners, bearings, stock, wire, transistors, resistors, pipes, beams) from which the most products can be composed? Can it be measured from the breakdown queue?

### C5. Validation, honesty and trust
37. For each discipline pack, what is the one canonical benchmark (a NAFEMS benchmark, a Modelica test case, an ngspice regression, an EPA SWMM example) that the pack must reproduce to be shipped?
38. How will Nexus distinguish "validated against measurement", "verified against another solver" and "plausible" on every displayed result, in a way a child and an engineer both read correctly?
39. What is the policy when a real product's published figure is internally inconsistent (stated mass versus the sum of parts)? Which is held fixed, and how is the conflict shown?
40. Should a surrogate node be allowed to run outside its training envelope at all, or should it hand off to the solver automatically?
41. How is "approximated" quantified for geometry ("shape approximates the surface"): Hausdorff distance to published silhouettes, volume error, or something else?
42. How will Nexus prevent its own critic and the solvers from being "tuned to pass", per the CLAUDE.md rule? Who holds out cases the rules were not tuned on?
43. If two independent solvers agree but both share an assumption (for example, linear elasticity), how is the shared assumption surfaced?
44. What should the app do when it cannot answer: refuse, approximate with a label, or ask? Who decides per question type?

### C6. The AI in the loop
45. Which decisions must never be made by the model (numbers, material choice, safety factors), which may be proposed but must be checked by a solver, and which are free (layout, naming)?
46. How will the agent know which of 379+ node kinds is right for a question it has never seen, without listing all of them (the token cost)? Is retrieval over node cards measured for accuracy?
47. When the agent builds a board that simulates but is physically wrong (wrong sign convention, wrong ground), which automated check catches it, and what is that check's false-negative rate?
48. LLMs writing Modelica often produce models that do not simulate (ModiGen, 2025). What is the equivalent measured failure rate for Nexus boards built by the agent today (R11), and which repair loop cuts it most?
49. How is the blind judge kept blind: does it see the board, the requirement, or only the outputs, and which framing gives the fewest lenient passes?
50. Should the agent work in a textual board language (like KCL, Dyad or SysML v2 text) or through tool calls? Which gives fewer errors per token, as measured?
51. How does the agent explain *why* it chose a part (a sourced requirement chain) rather than *that* it did?
52. When the agent's proposed change conflicts with a user's manual edit, who wins, and how is the merge shown (branch-and-review as in Onshape)?
53. What is the per-task budget (tokens, seconds, money) for the in-app agent, and how does a user see a run approaching it before it fails?
54. Can the agent learn from the boards a user saved, without leaking one user's private designs into another's suggestions?

### C7. Browser, XR and performance
55. Which solvers must run on the device (latency, offline) and which may run remotely? What is the measured break-even point for a typical board?
56. Is WebGPU compute available in Quest Browser today, and if not, which nodes degrade, by how much, and is the degraded result labelled?
57. How large is the cold start budget (OCCT is about 23 MB; Pyodide is tens of MB; MuJoCo and ngspice are several MB each), and what is the lazy-loading order so the first board shows in under N seconds?
58. Can Wasm threads (SharedArrayBuffer, COOP/COEP) be used given where Nexus will be hosted (U1), and what breaks without them?
59. What frame budget does physics get in VR at 72–90 Hz, and how is a sim slowed (time dilation) honestly when it cannot keep up?
60. How are huge assemblies (a city) streamed: by level of detail of *simulation* as well as of rendering?
61. What is stored client-side (IndexedDB) versus server-side, and what happens to a board when storage is cleared?

### C8. Licences and the law
62. OCCT and ngspice are LGPL and linked into WebAssembly. What must Nexus ship (relinkable objects, source offer) to comply in a browser context?
63. CalculiX, OpenFOAM and SU2 vary by licence (GPL, LGPL). Does running them as remote services avoid copyleft obligations, and does any planned on-device use change that?
64. Which standards' tables (VDI 2230, ISO 2306, EN 1993-1-8) may be quoted as data, which only referenced, and who checks each one (R7)?
65. If MTK v11's licensing changes, does any Nexus plan depend on Julia components whose licence may move?
66. When a user imports a manufacturer's CAD under its terms, can that geometry be stored in the shared library?

### C9. Learning, everyone, and the experience
67. What does "for everyone" mean in controls: how few controls (PhET's implicit scaffolding) can a board show a beginner while hiding nothing an expert needs?
68. How does a user who does not know what a "flow variable" is wire a motor to a gearbox correctly the first time? Do ports refuse wrong connections, suggest the right one, or explain?
69. What does "make the invisible visible" mean per discipline (stress, current, heat, flow, neutron flux) in VR, and which visualisations are research-tested versus guessed?
70. How does Nexus avoid Universe Sandbox's trade of fun versus accuracy: can a "playful" mode exist that is still never wrong, only coarser?
71. How do users share and remix boards (a ComfyUI-style workflow file, a URL, a library entry), and what is the moderation and trust model for community nodes?
72. What is the first five-minute experience, and what is measured to show it worked?

### C10. Discipline-specific hard questions
73. **Civil:** how does Nexus represent the load path (gravity to foundation) as a check, so a "building" that has no lateral system is flagged even if every member passes?
74. **Geotechnical:** where does soil data come from for a user's site, and how is the absence of borehole data shown rather than replaced with a typical soil?
75. **Hydrology:** for a street or city board, how are rainfall intensity-duration-frequency curves sourced by location, and is a SWMM run the default check for drainage?
76. **Electrical:** how does Nexus check that a battery, a motor controller and a motor agree on voltage, peak current, wire gauge and fuse rating, and who sizes the wire (IEC 60228/NEC ampacity) from the run length?
77. **Electronics:** at what level is a circuit simulated by default (ideal, behavioural, SPICE with vendor models), and how is a missing vendor model reported?
78. **Chemical:** can a process board be checked for mass and energy balance closure, and for which thermodynamic models (ideal gas, Peng-Robinson, NRTL) is the choice explained to the user?
79. **Aerospace:** for a fixed wing (not yet in `machines.ts`), what fidelity ladder (lifting line, then vortex lattice, then RANS) is used, and how is the stall predicted honestly at each rung?
80. **Marine:** for a floating thing, how are intact stability (GZ curve) and the IMO criteria checked, and from where does the hull's hydrostatics come if the shape is approximate?
81. **Biomedical:** where is the line between an educational body model and a medical claim, and what wording keeps Nexus outside medical-device regulation?
82. **Materials:** when a mixture is computed from its phases (`mixture.ts`), how is the homogenisation model (rule of mixtures, Mori-Tanaka, Halpin-Tsai) chosen and shown, and what bounds (Voigt/Reuss) are always displayed?
83. **Manufacturing:** can every part answer "how would this be made, from what stock, with which tool, at what tolerance and cost", and is that answer sourced or estimated?
84. **Nuclear:** should Nexus model nuclear systems at all beyond education (point kinetics, decay chains), and what export-control or safety concerns limit it?
85. **Environmental:** can every board carry a life-cycle inventory (mass per material times sourced emission factors), and which database (ecoinvent licensed, ELCD/openLCA free) is legally usable?
86. **Systems:** how does a requirement at the top ("the drone flies for 20 minutes") flow down to sized parts (battery capacity, motor Kv, propeller pitch), and how is the trade study shown?
87. **Controls:** how does Nexus close a loop (a PID or MPC node) around a physics board, with sample time and actuator saturation explicit, and auto-tune it with stability margins shown?
88. **Mining and agriculture:** are these in scope as boards (block models, crop growth), or only as data sources for others (ore grades, yields), and what triggers the decision?

### C11. Strategy and the market
89. Dyad 3.0 already offers an agentic AI over acausal physics, and it has $65M. What can Nexus do that Dyad structurally cannot (browser and XR, everyone, parts down to the bolt), and is that defensible?
90. If Collimator's Python package is archived, what was the failure mode of "Simulink in the browser", and does Nexus repeat it?
91. Wolfram's moat is curated computable data. Is Nexus's library law the same moat, and what is its curation cost per item, as measured?
92. Should Nexus be a platform (others ship discipline packs, as with FeatureScript or ComfyUI nodes) or a curated product (as PhET is)? Can it be both without losing the "every number sourced" rule?
93. Which single demo would make an engineer trust Nexus: reproducing a NAFEMS benchmark, matching a real product's published test, or simulating a known failure?

### C12. Foundations
94. Of the eight fundamental systems in CLAUDE.md, which one has no owner module yet, and which two overlap most in the code today?
95. Is "multiscale" a property of the solver (homogenisation, coupling across scales) or of the library (parts within parts)? Does Nexus need both, and where does one hand off to the other?
96. What is the single invariant that, if broken, would make every result in Nexus untrustworthy (units? sources? conservation?), and is it checked on every run?

---

**What is solid and what is not.**
- **Solid:** the versions and dates marked [V] in section A, the Jolt determinism finding, the MuJoCo WebAssembly bindings, the browser ngspice tools, WebGPU's browser status, and SysML v2's adoption.
- **Not solid:** Collimator's status; several [K] tool versions that may be stale; and every ranking in section B and every question in section C, which are inference.

**For open question R3 in `plan/QUESTIONS.md`:** Jolt's prebuilt WebAssembly packages are not cross-platform deterministic. Cross-platform determinism needs a custom build with `JPH_CROSS_PLATFORM_DETERMINISTIC`, which costs about 8%. Whether that build gives bit-identical results in WebAssembly versus native is still unverified.

---

## Chapter 3. Life and the universal equations

*From `research/07-life-and-equations.md`.*

### What counts as life in a simulation
1. Which criteria for life (metabolism, reproduction, heredity with variation, homeostasis, response) can a board meet literally, and which only by analogy?
2. Is a Flow-Lenia glider that conserves mass and carries its own rule alive, or a pattern, and what test would tell them apart?
3. If digital organisms evolve (as in Avida), is that evolution or a simulation of it, and does the answer change what Nexus may claim?
4. What is the least set of conserved quantities a substrate needs before evolution in it can be open-ended rather than drifting?
5. When a Particle Life world breaks Newton's third law, which conclusions about real chemistry become invalid?
6. Can the agents we have (a body and a goal) be given a metabolism, energy in and spent, by the energy node alone?
7. How does a board say whether it models a particular organism or an abstract substrate?
8. What would a falsifiable claim of emergence look like, as against "it looked lifelike"?

### Cells and molecules
9. Of a whole-cell model's parameters, how many were measured, fitted or assumed, and can Nexus show that split for any model it imports?
10. At what molecule count should a reaction switch between smooth equations and Gillespie's stochastic method, and how is the switch's error said?
11. Which unit faults are typical in imported SBML or CellML, and should import refuse them or repair them?
12. Can Michaelis–Menten kinetics be trusted in a crowded cell, and what does a crowding correction cost?
13. How sensitive is a whole-cell model to its coupling step (1 s in Karr's), and how would Nexus measure it?
14. What does a predicted protein structure not say (motion, other states, a mutation's effect), and how does its node show that?
15. In a browser's molecular dynamics of about 10,000 atoms, what can be reached at picoseconds a second, and which famous events (folding, binding) cannot?
16. When does a classical force field fail (bonds breaking, polarisation, metals), and what is the honest fallback in a browser?
17. Can a cell's membrane, skeleton and division be made of the rigid and soft bodies we have, or is a new mechanical kind needed?
18. How would Nexus check an imported cell model against its paper (doubling time, pools, mRNA counts)?

### Organisms, bodies and behaviour
19. OpenWorm has the whole wiring diagram and no worm that behaves right: what does that say about simulating any animal from its parts?
20. What is the smallest loop (sensor, neuron, muscle, body, world) that reproduces a real, measured behaviour?
21. Hill muscles' parameters come from cadavers and fits: how much does a predicted gait change across their published ranges?
22. When optimal control predicts a motion, what cost was assumed, and is "people minimise effort" a law or a fit?
23. How is an agent's mind labelled, when no equation for a mind exists?
24. At what body size do viscosity and inertia change places (Reynolds number), and do creatures change gait and physics there by themselves?
25. How does metabolic scaling (Kleiber) enter a creature's energy budget, and is its exponent shown as debated?
26. Can evolved creatures be checked for exploiting the integrator (energy from nothing, tunnelling) before their fitness counts?
27. Which senses (sight, smell of a gas plume, hearing) does an organism need, and which can reuse the senses we have?
28. How should development be shown: a genome unfolding into a body over time, rather than a body given whole?

### Populations, ecosystems and epidemics
29. When an SIR model and an agent model with the same parameters disagree, which does a person trust?
30. How many seeded runs make an agent model's result an estimate, and how is its interval shown?
31. How is R0 estimated from a board, and how does who meets whom (networks, cities) change it?
32. Lotka–Volterra cycles are fragile: which real ecosystems' data can a model be checked against?
33. What happens to small populations' extinction risk that smooth models cannot show?
34. How does a city's epidemic board say where its contact and movement data came from, and how old they are?
35. What did the CovidSim debate teach about determinism, seeds and review for models that guide policy?
36. Can an ecosystem board conserve mass and energy (nutrients cycling; about 10 % passed up each level) and check it?
37. Where do agent models need behaviour that changes (people reacting to an epidemic), and how is that labelled an assumption?

### Pattern, form and growth
38. For a reaction–diffusion node, which parameters give spots, stripes or mazes, and can it say so from stability before running?
39. Which real patterns are documented as Turing patterns (zebrafish stripes, digit spacing), and which only look like them?
40. A trained neural automaton regrows its shape: a model of regeneration, or a learned picture, and how is it labelled?
41. How do positional information, mechanics and chemistry each shape form, and can one board couple them?
42. Can a growing domain be modelled on our meshes without remeshing faults?
43. Which outputs of growth can be checked by number (wavelength, count) rather than by eye?
44. How does noise affect a pattern's robustness, and does the node take noise as an input?

### Evolution and open-endedness
45. What measure of open-endedness can Nexus report without over-claiming?
46. Avida's EQU needed harmful steps: does our search allow fitness to dip for a while?
47. When should novelty search replace an objective, and how is a deceptive problem recognised?
48. Which boards (terrain, buildings) can be POET's environments, and which its agents?
49. How is a genome written so that mutations make meaningful changes rather than breaking the body?
50. What budget makes evolution in a browser meaningful: generations a minute, population size?
51. How are evolved results reproduced: the seed, the physics engine's version, float determinism across GPUs?
52. When an AI judge scores "lifelike", how is its bias recorded and kept apart from physical validation?

### The universal equations
53. For each of our ~330 law nodes, which universal equation is it derived from, and in which limit?
54. Which nodes break a symmetry they should have, and does the matching conserved quantity drift?
55. Where energy matters (orbits, pendulums), is the integrator symplectic, and how much does energy drift per simulated hour?
56. For fluids in a browser (SPH, lattice Boltzmann, stable fluids), what error does each give on a benchmark (the lid-driven cavity; a cylinder's Strouhal number of about 0.2)?
57. Where is Maxwell reduced to circuits, and does the board warn as parts near the wavelength?
58. Which quantum results enter as data (bond energies, band gaps, spectra), each tagged with how it was found?
59. When do relativistic corrections matter to anything Nexus builds, and is there a node that says "negligible here, by so much"?
60. How does the Standard Model enter at all: as PDG constants with their uncertainties?
61. Is the second law enforced, so no isolated board's entropy falls, and how is "isolated" defined on a board?
62. What does least action give a node graph that Newton's laws do not (constraints, generalised coordinates, variational integrators)?

### Dimensions, scaling and similarity
63. Does every law node carry its validity range in dimensionless groups, and who audits the ranges?
64. When a design is scaled, which π groups stay the same and which do not (a model cannot match both Re and Fr)?
65. Can Buckingham π find a relation from data when no equation is known, and how is the result labelled empirical?
66. How are chemical potential, entropy flow and information handled in the dimension system?
67. Are the dimensionless constants we use (the fine-structure constant, Reynolds thresholds) sourced and versioned?
68. When a law's exponent is fitted (drag, metabolism), is the range it was fitted over shown with it?

### Coupling the scales
69. What passes between each scale (a modulus from molecular dynamics, a viscosity, a rate), and is it computed or cited?
70. When two submodels share a stock, how big is the splitting error, and does halving the step change the answer?
71. Can a board change fidelity during a run without a jump in what it conserves?
72. Which couplings are two-way (fluid and structure, heat and electricity) and need iteration, and which one-way?
73. How is a region modelled finely where it matters and coarsely elsewhere (as QM/MM does) said in nodes?
74. What does each level cost in a frame, and does fidelity choose by error budget or by time?
75. Can the whole-cell pattern (28 formalisms on shared state) run a city (traffic, power, water, people)?

### Formalism and composition
76. If every physical port is effort and flow, which ports do not fit (information, intentions), and how are they kept apart?
77. Does folding a board into a node keep its behaviour exactly, and is that tested on every fold?
78. Where does Nexus need equations without direction (as Modelica has) rather than one-way dataflow, and how are loops reported?
79. Can bond-graph causality tell a person, before running, what must be integrated and where the model is ill-posed?
80. What would fields on meshes as discrete exterior calculus give us that values at vertices do not?
81. Is there a way, from category theory, to prove two boards the same model, so the library law deduplicates models and not only parts?
82. Should geometric algebra replace quaternions and matrices for mates, and what would it cost beside Jolt?

### Knowing it is right
83. For each node: a known-answer test, a comparison with experiment, or neither, and is that shown?
84. Is every output's uncertainty carried from its inputs and shown as a band rather than a line?
85. Are parameters marked measured, fitted, typical or guessed, as the constitution asks?
86. When a model is fitted to data, is it then tested on data it was not fitted to?
87. What is a chaotic board's horizon of prediction, and past it does Nexus show only statistics?
88. Is a result the same to the bit across browsers and GPUs, and if not, what tolerance is promised?
89. How is a model's agreement with a paper said: which figure, which quantity, what error?
90. Who reviews a new law node: a test suite, a blind AI gate, a person, a source?

### Saying what cannot be done
91. What is on the "cannot simulate" list today, and what is the honest stand-in for each?
92. Asked to "simulate a person", "a forest" or "a city's economy", what does the AI say first about scale and about what a model is?
93. How is "looks right" told from "is right" in the interface (labels, colours, a mark of validation)?
94. Which questions cannot be answered in principle (Life's long run) or in practice (turbulence resolved, folding in real time), and how is each kind explained?
95. When a result rests mostly on one assumed parameter, does Nexus say so by ranking sensitivities?
96. How does Nexus say it approximates without hiding the approximation, and without burying the person in caveats?

---

## Chapter 4. Mathematics: fractals, π, precision, proof, composition

*From `research/08-mathematics.md`.*

### Fractals and scale
1. For each real object in the library, between which inner and outer cutoffs is it self-similar, and who measured them?
2. What box-counting dimension does a tree, lung or city made in Nexus have, and does it match published measurements?
3. Can an L-system be fitted to a photographed tree, and how many rules does the shortest fit need?
4. Which products in the library use fractal geometry (antennas, heat sinks, mixers), and what do their published figures say it gains them?
5. Does Murray's law (r³ conserved at forks) hold for our pipe and duct networks, and when should it not?
6. How should a length, area or roughness carry the scale it was measured at?
7. Can the collage theorem compress repeated geometry in the library, and what error does it bound?
8. Does a fracture surface's fractal dimension predict toughness in any source?
9. When a city or network grows by a rule, which rules give realistic dimension and rank-size laws?
10. Can persistent homology tell, across scales, which features of a reconstructed object are real and which noise?

### Deep zoom and multiscale
11. What is the largest ratio of world size to smallest feature any board needs, and how many bits does that take?
12. Where exactly does float32 break in our 3D view, measured at 1, 10 and 100 km from the origin?
13. When is a frame's anchor rebased, and is the rule the same as Zhuoran's |Z + z| < |z|?
14. What is the glitch detector for a geometric level of detail: how do we know the cheap form lies at this zoom?
15. Can each folded block keep a precomputed summary (bounding shape, mass properties, response) valid until a stated zoom?
16. Which physics is valid in each scale band from km to µm, and what does the view do at a band's edge?
17. Should precision escalate piece by piece, as deep zoom does pixel by pixel, and by what budget?
18. What does 3D Tiles' geometric error teach about a screen-space error budget for exploded assemblies?
19. Can a µm feature on a km object be checked without loading the whole object at full precision?
20. How should time scales nest (nanosecond electronics in an hour's drive) as space does?

### π, constants and digits
21. Which constants changed from CODATA 2018 to 2022, by how much, and which of our outputs move?
22. Which constants are correlated in CODATA, and does any output combine two correlated ones?
23. Is any result of ours sensitive to more than 15 digits of π or any constant? Find one or show none exists.
24. Could y-cruncher's way of checking (an independent formula checks the last digits) apply to our solvers: a second method checks a result?
25. Which outputs could be checked by a different method, as BBP checks a Chudnovsky run?
26. Can PSLQ-style "guess the exact form" find closed forms behind our numeric results?
27. What would a spigot mean for long simulations: stream results and stop when precise enough?
28. Which "constants" in engineering tables are really fitted, and are they labelled so?
29. How do the 2019 SI's exact constants propagate: which derived constants are exact and which not?
30. What precision do real products' published figures have, and do we show more digits than the source?

### Uncertainty and arithmetic
31. For which nodes does first-order GUM differ from Monte Carlo by more than 10 %?
32. Does the engine carry covariance when one input reaches an output by two paths?
33. What is each output's interval width, and where does the dependency problem inflate it most?
34. Which IEEE 1788 decoration should each of our evidence kinds map to?
35. When an interval is too wide to decide a check, how many sub-boxes does it take to decide?
36. Can ball arithmetic run fast enough in a browser for live boards, and at what sizes?
37. Which nodes subtract nearly equal quantities, and can they be rewritten?
38. Where does the engine add up a step that cannot be represented exactly over time (the Patriot pattern)?
39. What is the condition number of each linear solve in placement and sizing, and is it shown?
40. How does a node say "the output is wider than the tolerance asked", and what does the AI do then?
41. Can a coverage factor be chosen honestly when an output's distribution is skewed?
42. What is a fitted law's uncertainty outside its fitting range, and is extrapolation flagged by number?

### Symbols and derivatives
43. Which laws can be solved symbolically for every variable, and which need numeric roots?
44. Can two laws that look different be proved identical, removing duplicates from the library?
45. Does differentiation through the whole board give the same sensitivities as today's method, and how much faster?
46. Which nodes are not differentiable (lookups, branches, tables), and how does differentiation say so?
47. Can it give exact Jacobians for the Newton solves inside roots and ODEs?
48. Does simplifying a folded block's formula change its numerical error?
49. Should algebra run in the page (Pyodide and SymPy) or as a service, and at what cost?
50. Can Buckingham π propose dimensionless groups for any board automatically?

### Proof and verification
51. Which of our rules could be Lean theorems with physlib's units, and which are only empirical?
52. Could "proved" be an evidence kind, and what would it mean for a law derived from proved definitions?
53. What would it take to export a small board's chain of laws to Lean and check its dimensions?
54. After the Lean proof of Fermat's Last Theorem (September 2026), what is a realistic target for AI-written proofs of engineering rules?
55. Which design rules can Z3 decide, which need dReal, and which cannot be decided in general?
56. Can the rules for what may touch and clearance be checked for every position in a range, not just samples?
57. What counterexample would a person understand: values, a picture, a highlighted pair of parts?
58. Can an unsatisfiable core explain, in a person's words, why a placement is impossible?
59. How long does Z3 in WebAssembly take on our rules in a browser, and does it need cross-origin isolation?
60. Can a solver check that a state machine (signals, interlocks) never reaches an unsafe state?

### Optimisation and constraints
61. Which of our optimisation problems are convex, and can composition rules certify them?
62. When a problem is not convex, what is the gap between the best found and a proven bound?
63. Which placement and scheduling tasks fit constraint programming's global constraints better than local search?
64. Can HiGHS in WebAssembly solve integer sizing (bolt counts, cable gauges from catalogues) in seconds?
65. How are Pareto fronts shown on the ladder of abstraction?
66. Can sensitivity nodes give shadow prices: what one more unit of a constraint is worth?
67. Is the repair loop a constraint solver, and would it be better written as one?

### Graphs and networks
68. Which boards are really flow networks, and where is their min cut?
69. Can the library's dependency graph show which parts, if wrong, break the most?
70. Which graph invariants of an assembly (cycles, connectivity) predict whether it is a mechanism or a structure?
71. Can routing of cables and pipes be posed as min-cost flow of many commodities?
72. How should acausal networks (circuits, hydraulics, structures) be solved: nodal analysis, bond graphs, or Modelica's index reduction?

### Composition
73. Does folding commute with evaluating for every saved block? Test all of them.
74. What are Nexus's objects (port types) and arrows (blocks), written down?
75. Which wires are functions (directed) and which shared variables (undirected), and does the engine know?
76. Can side-by-side and one-after-another composition, plus feedback, be the only ways to build a board?
77. What does a lens (value forward, requirement back) look like for "parts say what they need"?
78. Can a requirement flow backwards through a folded node as a value flows forwards?
79. What are the engine's identity and associativity laws, and is there a test for each?
80. Can Catlab's wiring-diagram JSON be an interchange format for boards?

### Dynamics and chaos
81. Which simulations in the library are chaotic, and what is their Lyapunov exponent?
82. How far ahead is each ODE answer meaningful, given its inputs' uncertainty?
83. Where are the bifurcations in common machines (flutter, chatter, the onset of oscillation), and can a sweep find them?
84. Can the engine recognise a limit cycle or a fixed point and say so, rather than only plotting?
85. Is the integrator symplectic where energy must be kept (orbits, pendulums), and does it say?

### Information and complexity
86. What is each library item's description length, and does folding shrink it as the library law intends?
87. Can the repeated wiring we detect be measured as the library's compression ratio?
88. Which model does minimum description length prefer for each empirical fit, and does it agree with ours?
89. What is the physical floor (Landauer's minimum energy, channel capacity) for each sensor and link?
90. Which boards can only be known by running them (computational irreducibility), and how does the AI say so?

### Visual mathematics and explanation
91. For each node, what are its concrete, over-time and over-parameters views, as on Victor's ladder?
92. Can every number in an AI explanation be draggable and live, making the explanation a reactive document?
93. Which animated transformations would make the hardest nodes (Fourier, eigenmodes, stress tensors) intuitive?
94. What does Desmos's "a free parameter becomes a slider" mean for our unset inputs?
95. Can GeoGebra's "drag a point and constructions follow" be the interaction for placement constraints?
96. How does a newcomer's first touch already show something moving, as explorables do?

---

## Chapter 5. Games, visualisation, the very large, and contests

*From `research/09-games-vast-contests.md`.*

### Attach anything: physics contracts
1. What is the least every node must have to be glued (mass, collider, sockets), and what becomes of nodes that are pure logic?
2. When two glued bodies differ hugely in mass (1 g and 10 t), which solver settings keep the joint steady, and which should a newcomer never see?
3. Should glue snap to faces, edges or authored sockets, and how did Nintendo choose sensible orientations?
4. How does a powered part (fan, wheel, rocket) declare its thrust and torque so any assembly drives correctly?
5. What innocent object will people turn into a universal joint (TotK's pot), and should we design for that on purpose?
6. How do we stop contraptions exploding from overlapping colliders at the moment of gluing?
7. Can sound come from the physics (impacts, friction, speed) so every build sounds right without made audio?
8. How do blueprints stay valid when the parts they name change version?

### Agents and needs
9. What base needs suit an agent in a machine shop, a city and a forest alike?
10. What urgency curves stop an agent dithering between two equally good offers?
11. Should the AI read the same affordance offers as simulated agents, and does that make it better at explaining a scene?
12. How do agents out of sight get less detail without breaking cause and effect?
13. What is the smallest event record a chronicle needs to tell a story afterwards (who did what to whom, where, why)?
14. How many scoring agents can a browser tab hold before it needs spatial hashing or the GPU?
15. How do traits become extra needs rather than special code?
16. How does a pre-run of history fit within a web visitor's patience?

### Rules as objects
17. Which of our graph's meaning can be said as NOUN IS PROPERTY sentences placed in VR?
18. What do rules about rules mean for safety: can a person lock themselves out, and is undo enough?
19. Should a rule tile act at once (Baba) or at the next tick (redstone), and what does each do to intuition?
20. How do we show why a rule is active, by lighting the sentence that made it?
21. What quota stops one person's script slowing a shared world?
22. When is compiling a subgraph right, and how do we prove the compiled one equals the interpreted?

### Production, flow and ratios
23. Should every process node show items a second, and how do we show the bottleneck across a thousand nodes?
24. Can moving whole segments (Factorio's belts) apply to fluids, traffic and data?
25. What is our version of Satisfactory's clock-speed trade, and is it the same as fidelity against cost?
26. Which three measures should every engineering challenge score?
27. How do distributions of scores mean anything when the community is small?
28. How do we credit chains of inspiration when people remix solutions?

### Determinism, replay and multiplayer
29. Which parts of a three.js and physics stack are deterministic across browsers and processors, and which not?
30. Can lockstep live with an AI acting in the world, or must its actions be logged as inputs?
31. How large is a state hash, and how often are hashes compared to catch a desync early?
32. Does destruction synchronise by sending fractures or by replaying inputs?
33. Can a whole session be shared as seed, board and input log?

### Procedural worlds
34. What hashing of position and seed keeps content stable across our versions?
35. How are only a person's changes stored over a procedural world, and what happens when the generator is upgraded?
36. What tileset and adjacency rules are needed for believable interiors, not only façades?
37. Does wave function collapse on an irregular grid run fast enough on a headset?
38. How does real data (OpenStreetMap, Gaia, terrain) anchor the procedural fill so it agrees?
39. How is a generic body description ("upper leftmost grasper") written as node data?
40. When the generator cannot honour a constraint, how does it say why?

### Destruction and matter
41. What voxel size suits a room, a building, a city, and can one scene mix them?
42. Can one occupancy grid drive traced sound, the AI's sight and the light together?
43. How does a checkerboard cellular automaton map onto WebGPU, keeping its update order?
44. When a voxel body splits, how are the new mass properties found fast enough?
45. How do voxel fluids meet rigid joints?

### Orbits and the very large
46. When does a body switch from rails to integration, and who decides?
47. Can REBOUND's browser build run as a node in a worker, and what does choosing an integrator look like to a newcomer?
48. How are the target and actual time rate and the energy error shown?
49. What origin and frames keep float32 steady from a hand (mm) to the galaxy (10²¹ m)?
50. Should time be a log slider, named stops (second, day, orbit, era), or both?
51. What does a manoeuvre node look like outside orbits, say a planned change to traffic lights?
52. How is an expensive run baked into a track that can be scrubbed backwards?
53. Which event finders ("next eclipse", "closest approach") would people actually ask for?
54. How is Gaia DR4 (2 December 2026) loaded a piece at a time in a browser?
55. How do scale groups (Solar System, Milky Way, Universe) map to ours (room, city, planet)?
56. How is chaos made visible without frightening newcomers?
57. How does one scene hold a one-second machine and a billion-year galaxy without one setting the other's step?
58. What is our honest "subgrid" label, and how is it shown when someone zooms past a model's range?
59. Can tracking identity through splits and merges work for anything that divides (cells, companies, cities)?

### Traffic and cities
60. Which cost terms give believable traffic with the fewest parameters?
61. When does an agent re-plan its route and when react locally, and how often can a browser afford re-planning?
62. How are emergency vehicles' "lenient" rules a profile and not special code?
63. How do zoning and land value feed back into where agents go?

### Seeing and touching
64. Which of our edits still lack an immediate connection (over 100 ms from change to effect)?
65. Should we copy Observable's "nothing unobserved is computed", and what breaks if nodes have side effects?
66. How are many small runs of a sweep shown in VR: a wall of tiny worlds?
67. Which ParaView filters (slice, contour, streamline, glyph) are general enough to be core nodes?
68. Which CAD and BIM viewers' tricks make a dense machine readable in VR?
69. How does cartographic generalisation apply to a city in VR: which details fade first?
70. How are labels kept readable and apart in 3D at every scale?
71. What would a communal room (Dynamicland) look like: several people editing one graph through physical things?
72. When is a raymarched preview better than meshes for a node's live output?

### Spatial UI and access
73. Where does the graph live in VR (a window at 1.5 m, a wrist panel, a table), and how is it called back?
74. How are gaze targets made large enough without making dense graphs unreadable?
75. What seated, one-handed and screen-only modes give full parity?
76. How do stress and flow colours stay readable to people with colour blindness?
77. Can every visual signal also be heard or felt?
78. How is motion sickness prevented when time or scale moves the world round a person?
79. How should a screen reader describe a 3D scene graph?

### The AI
80. Which affordance, chronicle and graph tools does the AI need to explain "why did this fall down"?
81. Given how much harnesses change scores on ARC-AGI-3, which choices in our AI's harness matter most?
82. How do we test the AI on CAD-as-code tasks inside Nexus and notice when it swaps sweeps for extrusions?
83. Should the AI act through the same deterministic input log as people, so its actions replay and can be audited?
84. How does the AI ask a person to label an ambiguous part rather than guess?
85. What is the AI's processing budget in a shared world?

### Contests, learning and judging
86. What would a Nexus Compo (alone, 48 hours, everything made then) and Jam (teams, assets allowed) look like?
87. How do we stop fake accounts gaming community ratings?
88. Should challenges hold back a private set so solutions cannot fit the visible ones?
89. Which measures can Nexus take automatically (energy, cost, throughput, failure load), and which need judges?
90. How is "understanding your own design" scored fairly at scale, perhaps with AI help?
91. How do medals reward contributing reusable parts to the commons?
92. What standard kit of parts should fixed-budget challenges use?
93. Can a world with hidden rules be a reasoning test people enjoy and AIs find hard?
94. What does a "4k" challenge teach about elegant node design?
95. How do milestone prizes reward sharing work part-way?
96. How do virtual and physical tracks inform each other when a design is built for real?

### About ourselves
97. Which behaviours exist only because some node is fake, not simulated, and what breaks if we remove them?
98. Where is narrative written by hand, and could it come from the simulation's log instead?
99. Which part of Nexus would gain most from "nothing exists until it is observed"?
100. If Nexus forgot everything at the end of a loop but a logbook, what would people write down, and should that be how newcomers begin?

---

## Chapter 6. Philosophy, knowledge, invention, learning and ethics

*From `research/10-philosophy.md`.*

Grouped by theme. They are written to sit beside Chapter 1, not repeat it. **(U)** marks a question I believe the owner has not yet raised: not in WANTED or Chapter 1 as far as I read.

### Models, maps and truth
1. If every model is wrong, what is the *unit of usefulness* Nexus promises, and to whom?
2. When does adding detail to a board stop adding truth and start adding only cost (Borges' map)? Can Nexus detect that point? (U)
3. Which structure must a Nexus model preserve for each kind of question, and how is it declared?
4. Is a board a theory, an experiment, an instrument or an argument? Does the answer change how it is checked? (U)
5. What does "real" mean for a part never built, such as a proposed product with no published figures?
6. When two respected sources disagree about a material property, does Nexus show both, choose one, or simulate both?
7. Can a person ask Nexus "what is the simplest model that answers my question?" and get a smaller board rather than a bigger one? (U)
8. What would prove the eight fundamental systems the wrong frame? What evidence would make the owner change them? (U)
9. How does Nexus show the difference between a law (conservation of energy), a regularity (a fitted curve) and a convention (a building code)?
10. Is there any question Nexus should answer "simulation is the wrong tool; go and test it"? (U)
11. How does Nexus keep a model honest when the person *wants* a particular answer?
12. What is the territory for a design that does not yet exist?
13. How should a board record which paradigm it assumes (Newtonian, relativistic, quantum, continuum)?
14. When a person's mental model is wrong but their board works, should Nexus correct the mental model? (U)
15. Does "simulate anything" include simulating things that cannot be measured: meaning, beauty, wellbeing?

### Verification, validation and credibility
16. What is Nexus's credibility scale, and what evidence moves a node up one step?
17. Who has the standing to validate a node: a lab, a manufacturer, a user with a sensor, the AI?
18. How does a user's real-world measurement flow back into a node's validation record without tuning it into a fake fit?
19. What is the smallest honest validation for a hobbyist's board?
20. When a model is right for the wrong reasons (cancelling errors), how could Nexus ever find out? (U)
21. How many free parameters may a node have before its fit is treated as meaningless?
22. Should a board's credibility be the minimum of its nodes' credibility, or something else? Composition of credibility is unsolved. (U)
23. How does a mesh, timestep or solver-tolerance study run automatically as a node, and when is it mandatory?
24. When a manufacturer's published figure is itself wrong, what does Nexus do, given C9 holds it fixed?
25. How is validation uncertainty (V&V 20) shown next to the numerical and input uncertainty already on the wires?
26. Can Nexus refuse to answer because the credibility needed for the stated consequence cannot be reached?
27. What is the record of a board's past predictions against reality, and is it public?

### Causality, emergence and limits
28. Which edges in today's library are mechanisms, and which are only fitted correlations? (U)
29. Can the AI tell a person when their "what if" question is a counterfactual that the data cannot answer?
30. When a folded node hides strong interactions inside it, how does Nexus know the fold leaks (Simon's near-decomposability)? (U)
31. At what scale does each physical model stop holding, and does the multiscale system pass that boundary on explicitly?
32. How does Nexus show emergent behaviour that no single part has, and explain where it came from?
33. What is the prediction horizon of a weather-dependent build, a traffic model or a population model, and is it shown?
34. If a system is computationally irreducible, how does Nexus price "you have to run it to know"?
35. Which properties of boards are provably undecidable to check, and does the team know which checks are therefore incomplete? (U)
36. What does Nexus assume stays unchanged when a part changes, and where is that list?
37. How does Nexus handle feedback loops whose delays make the intuitive fix backfire (Meadows)?
38. Can a board contain a model of the person using it, and if so, what changes? (U)
39. If the universe is computation, is there anything Nexus could in principle never simulate, and should it say so?

### Knowledge representation
40. What is Nexus's upper ontology in one page, and which ISO top-level ontology does it align to, if any?
41. Is a "bolt" in Nexus a type, an instance, a role or a product, and how are those kept apart?
42. How are function ("it fastens") and behaviour ("it clamps at 12 kN") represented separately from structure ("M8 × 1.25")?
43. Where does Nexus allow contradiction (Cyc's microtheories), and where is consistency enforced?
44. How does a part's identity survive change: wear, repair, replacement of every sub-part (the Ship of Theseus)? (U)
45. Should Nexus contribute back to Wikidata and other open knowledge bases, and under what licence?
46. Which concepts must be represented in time (4D, as in ISO 15926), such as maintenance history or the life of a city?
47. What incentive makes a person add structured data to a part, as schema.org's rich results did?
48. How does Nexus avoid the Semantic Web's mistake of publishing data no application uses?
49. How are units, tolerances and conditions attached to every claim, not just to the value?
50. What happens to the library when a standard it relies on is revised?
51. How are vague, everyday concepts ("cosy", "sturdy", "quiet") connected to measurable ones? (U)

### Design, rooms and pattern language
52. Which Alexander patterns have empirical support and which are judgement, and how is each labelled?
53. What is a "centre" in a Nexus room board, and can strengthening centres be computed?
54. Can Nexus offer structure-preserving design (unfolding) instead of a one-shot generate-and-replace?
55. How does a room board account for the people who will live in it: culture, age, disability, climate?
56. Who writes new patterns, how are they tested, and how do they link into the language?
57. Can Nexus tell when a technically valid design has no life in it, Alexander's "quality without a name"? Should it try? (U)
58. How do the misfits of form and context (Alexander, 1964) become explicit constraints?
59. What is the pattern language of a *machine*, rather than a building? (U)
60. How does a design room handle taste, which is neither true nor false?
61. Does an AI that always proposes a "good" layout reduce the diversity of the world's rooms? (U)

### Systems, society and life simulations
62. When Nexus simulates a city, whose city is it: the planner's, the resident's, the algorithm's (Scott)?
63. How does a civil model show that people will change behaviour in response to it (the Lucas critique, performativity)?
64. Which of Meadows' leverage points can a Nexus board even represent? Can it represent goals and paradigms? (U)
65. What is the ethical limit on simulating identifiable real people, crowds or communities?
66. How many runs make an ensemble honest, and how is the spread explained to a non-statistician?
67. Could a social simulation in Nexus be used to justify a harmful policy, and what friction prevents that?
68. When do simulated agents in a "life" board deserve moral consideration? (U)
69. How should a model of an ecosystem or a body represent what science does not yet know?
70. Who is accountable when a public decision leaned on a Nexus board?
71. How does Nexus present Goodhart's law to someone optimising a single metric on their city board? (U)

### Genius, invention and creativity
72. Is "everyone a genius" about P-creativity (new to you), H-creativity (new to the world), or both, and does the product treat them differently?
73. When the AI makes the leap, who learned anything? Does the person become more capable or more dependent? (U)
74. Which TRIZ principles map onto Nexus's solvers, and could contradictions be detected automatically?
75. How does Nexus suggest analogies from distant domains without drowning the person in noise?
76. What is the "adjacent possible" for a beginner with an empty library, compared with an expert's?
77. Does transformational creativity (breaking a law of physics) belong in Nexus, and how is it kept apart from real builds?
78. How does Nexus show an invention's genealogy, the technologies it combines (Arthur)?
79. Can Nexus check novelty against patents and papers, and what does it do when the idea is already known?
80. If a person invents something valuable in Nexus, who owns it, and how does the system avoid claiming it? (U)
81. How does Nexus support the "field" in Csikszentmihalyi's model: peers who judge and adopt new ideas?
82. How does the system avoid convergence, everyone's AI-assisted ideas becoming alike? (U)
83. What does first-principles reasoning look like for someone who does not know the principles yet?
84. Should Nexus ever make an idea *harder*, adding constraints to provoke invention? (U)
85. What fraction of real inventions came from combination, and what fraction from new phenomena? Does Nexus support the second? (U)

### Learning and democratisation
86. What is Nexus's first microworld, and what single powerful idea does it teach?
87. How does scaffolding fade as the person learns, and how is "has learned" measured?
88. When should Nexus refuse to just do it and instead ask the person to try? (U)
89. What is the first tiny contribution a newcomer can make, Wikipedia-style?
90. How does Nexus avoid the Wikipedia decline: quality control that drives newcomers away?
91. Which walls are narrow today? What can't a poet, chef, gardener or nurse build in Nexus? (U)
92. How does the VR forge make physics body-syntonic: feeling forces, being the turtle?
93. What does a teacher need to run a class on Nexus, and what does a child need with no teacher at all?
94. Which spreadsheet failures (units, truncation, untested formulas) is Nexus structurally immune to, and which not?
95. How do remixes credit their ancestors, and can a remix chain be followed back to its first idea?
96. What would Nexus's "View Source" be: the habit that made the web teach itself? (U)
97. How do people learn *when not to trust* Nexus? Is that skill taught? (U)

### The AI agent working through nodes
98. When the AI and a solver disagree, which one does the person see first?
99. Can the AI explain *why* it chose a part, not just that the part passes?
100. How does the AI signal that it is at the edge of what it knows in a domain?
101. Should the AI's suggestions be ranked by leverage (Meadows) rather than by ease?
102. How is the AI kept from tuning a model until it agrees with itself?
103. Does the AI propose experiments that would falsify its own design? (U)
104. How much of a person's intent does the AI infer, and how does it confirm before acting?
105. What does the AI do with a request that is safe step by step but dangerous when combined? (U)

### Safety, dual use and ethics
106. Who writes Nexus's refusal policy, how is it reviewed, and how does it change?
107. Which classes of board are refused outright, which need verification of the person, and which are open?
108. How does Nexus detect harmful *compositions* of harmless parts?
109. Does sharing a board count as exporting controlled technical data, and in which countries? (U)
110. What does Nexus log, for how long, and who can see it, balancing safety against privacy?
111. If Nexus's physics becomes good enough to design weapons, what changes in its openness? (U)
112. How does Nexus stop confident, beautiful renders of unvalidated results from misleading viewers?
113. What is Nexus's duty when it notices a user building something unsafe for themselves, such as a mains circuit?
114. How are "for education" and "for building" separated without insulting honest users?
115. What is the incident process when a Nexus board contributes to real harm?
116. Should optimisation objectives be screened ("maximise toxicity", "maximise damage") regardless of the stated purpose?
117. How is the Collingridge dilemma handled: deciding limits early while impacts are still unclear? (U)
118. Who is excluded by Nexus's costs, devices or bandwidth, and is that an ethical issue?
119. How does Nexus avoid becoming a tool that makes surveillance or control of people easier (civil simulation)? (U)

### Accessibility, language and culture
120. How does a blind person read, build and debug a board?
121. Which languages does Nexus speak first, and how are technical terms translated without losing meaning?
122. Can node meaning be language-independent (Wikifunctions-style), with labels rendered per language?
123. How do local units, codes and standards (metric vs imperial, Eurocode vs ACI) live in one library?
124. Whose design traditions are in the pattern library, and whose are missing? (U)
125. How does Nexus serve someone who cannot read, through voice, pictures and touch in VR? (U)
126. How is cognitive load kept low for people with attention or memory difficulties?

### Questions about the questions (meta)
127. Which question in this book, if answered, would change the most other answers? (U)
128. Which of Nexus's beliefs about itself has never been tested? (U)
129. What would a hostile critic say Nexus is, and what evidence would rebut them? (U)
130. What is the failure that would end Nexus: a safety incident, a trust collapse, an abandoned library? How would it be seen early? (U)
131. If Nexus succeeds completely, what human skill becomes rare, and should it be preserved? (U)
132. Is "simulate anything" a goal, a direction, or a slogan, and how would anyone know it had been reached? (U)
133. What would Engelbart ask of Nexus: does it make groups of people collectively smarter, or only individuals? (U)
134. Which problems in the world are not problems of *knowing how* but of *wanting to*, and does Nexus have anything to offer them? (U)

---

**Totals:** 134 questions in 12 themes, 31 principles, and findings across all four requested areas.

**Gaps.**
- I did not fetch the full text of each canonical book or paper. Citations are bibliographic, and page-level quotes come only where a source was retrieved: Winsberg, the Stanford Encyclopedia, V&V 40, Hogan, Lenat's interview, Meadows, Arthur, Resnick, Wikidata and the Frontiers 2026 paper.
- The exact figures on TRIZ's patent count and on transfer rates in the Gick & Holyoak experiments were not confirmed. They are stated qualitatively above.

Relevant files: `/home/user/claude-code/vr-sandbox/plan/BOOK-OF-QUESTIONS.md` (the target for Part C, as new chapters) and `/home/user/claude-code/vr-sandbox/plan/CONSTITUTION.md` (where principles 1–3, 6–7, 13 and 27 would become new rules).

---

## Chapter 7. Prompts, judges, and a picture to exact geometry

*From `research/11-prompts-reviewers-drawing.md`.*

### Prompt nodes and versions
1. What exactly is "one task": is "extract and validate" one or two, and what rule decides?
2. Which change to a prompt must raise its major version, given that others parse its output?
3. How is the regression suite kept from overfitting to an optimiser, with a held-out set it never sees?
4. How many cases per node make a 2-point difference in pass rate detectable by a paired test?
5. Should each node pin its model, and what happens to every node's measures when a model is retired?
6. Is a version's identity the rendered template's hash or the source template?
7. How do real failures become regression cases without leaking people's private data?
8. Which measure decides a release when pass rate rises but cost doubles?
9. Do few-shot examples belong to the version, or are they data with versions of their own?
10. How does a node declare what context it may read, and is that enforced by code?
11. When two nodes in a chain both change, how is each change's effect told apart?
12. What triggers a rollback of a live prompt, and who or what pulls it?

### Optimisers
13. For which of our nodes is the measure cheap and exact enough for GEPA's reflective loop?
14. Does GEPA's feedback come from code gates, judges or both, and does feeding it judges' words reward fooling them?
15. What budget of runs per node can we afford, and does a 35× efficiency claim hold at our size?
16. Do optimised prompts carry over to new model versions, or must they be optimised again?
17. How do we stop an optimiser deleting safety or abstention instructions its measure does not reward?
18. Is a Pareto pool (accuracy, cost, latency) more useful to keep than one winner?
19. Should critique flow back through the pipeline's gates, or only through the generator?
20. Which DSPy ideas (signatures, modules, compiling) map one to one onto our nodes?

### Structured output, decomposition, context
21. On our tasks, does strict JSON lower accuracy against reasoning first, then extracting?
22. Where in the prompt do constraints work best for our models: the start, the end, or both?
23. How many tokens of board context does the AI really need per tool call, and what is lost when it is cut?
24. Who checks the AI's plan before any node is placed?
25. What fails when a step's output is right but names an id the next step does not know?
26. Is sampling several answers worth its cost for numbers, and at how many samples do returns fall off?
27. How should our tools report errors so the AI repairs rather than retries blindly?
28. Which tool descriptions cause the most wrong tool choices, and is tool choice measured per version?
29. Should the AI see its own past failures on a board, and does that help it or anchor it?
30. In a long context, what is the order: sources, task, constraints?

### Failures and gates
31. Is the list of failure codes complete? Code a hundred real failures openly before fixing it.
32. Which codes can code detect, and which need a model?
33. What is the retry rule per code (a schema failure is worth retrying; an ungrounded claim may just come back as a new fabrication)?
34. When is abstaining the right answer, and how is a lazy abstention penalised?
35. How do gates avoid becoming so strict nothing passes? Track each gate's pass rate.
36. Should a gate's verdict and reason go into the retry, and does that help or leak the answer?
37. What is logged for every gate decision so a failure can be replayed?
38. How are gate thresholds themselves versioned and tested?

### Injection and trust
39. Which of our inputs are untrusted: web pages, uploaded PDFs, image captions, other people's boards?
40. Does any untrusted text reach the planning AI today without a schema-only extractor between?
41. Which tool arguments could carry injected values, and what tags on data are needed?
42. Is there a suite of injection strings run against every version of the AI's prompts?
43. Can a node built from someone's content change another node's instructions or tools?
44. How does the AI show a person where an instruction came from?
45. What is the rule when an extractor's output is valid but its meaning looks suspicious?

### Judges: bias and calibration
46. On our own gold set, what is each judge's flip rate when order is swapped, its sensitivity to padding, and its self-preference?
47. Does a judge favour answers written by Claude? Test by relabelling the author.
48. How lenient is each judge: false passes and false fails against people's labels?
49. Is the rubric scored one criterion a call or all at once, and which agrees better with people?
50. What kappa is good enough to trust a judge without a person, per task?
51. How many human labels does each judge need, who labels them, and must labellers agree with each other first?
52. How is criteria drift handled when people change the rubric while labelling?
53. Does a panel of different families beat one strong judge on our tasks, as PoLL found?
54. How are panel disagreements settled, and what share go to a person?
55. Is a judge's stated confidence calibrated, and is it used?
56. How much do verdicts move across five paraphrases of the judge's prompt?
57. Can a judge be fooled by "Yes", "Sure", an empty answer or a confident tone?
58. Should judges see the builder's reasoning, or only its output?

### Grounding and hallucination
59. Does every factual claim the AI makes carry a source id and a verbatim quote?
60. What share of quotes fail an exact-match check today?
61. When the source is a datasheet PDF, how is its text extracted well enough to check a quote?
62. Is semantic entropy worth its cost to flag uncertain specifications?
63. Does Chain-of-Verification help when its questions are answered without tools?
64. How are "typical" and "estimate" labels enforced so a guess never appears as sourced?
65. When a claim is marked an assumption, may it drive geometry?
66. How is the blind re-solver kept truly blind, the answer kept out of its context?
67. How are real products' figures checked against the product first, never tuned to please the checker?
68. Which outputs need a recomputation, and where is each one's formula kept?

### The picture: the image side
69. For our outline brief, which model (gpt-image-2, Nano Banana 2, FLUX.2, Recraft V4.1, Ideogram 4.0) fails the gate least, over N runs each?
70. Is Recraft's native SVG cleaner to parse than a raster traced by potrace?
71. How often does each model add forbidden things (frames, text, shading), and which failure dominates?
72. Does asking the AI for SVG paths from the description beat every image model for exactness? (Expected yes; measure it.)
73. What does the picture add that the request does not already hold? Decide per use whether Path 2 is needed at all.
74. How many samples does each model need for one to pass the gate with 95 % probability?
75. Do letter labels survive generation better than digits?
76. Does a ControlNet pass help clean a person's own sketch before parsing?
77. How is a hand-held photo of a real part (with perspective) straightened before parsing, from known markers?
78. Which fill and centring tolerances reject the fewest good pictures?

### The picture: the parser and standards
79. Which CIELAB thresholds separate black, anti-aliasing and label colour without mistakes?
80. Which arc fit (Kåsa, Pratt, Taubin, with RANSAC) is steadiest on 8 px strokes at 2048 px?
81. What simplification tolerance keeps small fillets but removes jitter, and should it scale with stroke width?
82. Is the geometry the stroke's centreline or its outer edge, and how is the half-width offset handled?
83. What tolerance turns "nearly horizontal" into a constraint without snapping real angles?
84. How are tangency and concentricity detected robustly, and how does the solver catch a false constraint?
85. When the picture's proportions and the request disagree, reject, ask, or trust the request?
86. Should hidden and centre lines (ISO 128) ever be allowed, given how they complicate parsing?
87. If dimensions must be read, does a digit-only reader checked against line lengths reach under 1 % error on our pictures?
88. How does a profile become 3D (extruded or turned), and where does each parameter of that step come from?
