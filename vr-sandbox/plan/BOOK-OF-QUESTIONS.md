# The book of questions

The user asked (2026-10-31) for "a list of questions that's a book in itself": every question Nexus must answer to
become what it is meant to be, the hard ones and the ones no one thought to ask. Each chapter gathers one territory.
The first chapter's questions come from the state of Nexus today; the rest come from the research wave of 2026-10-31
(its reports in `research/`), each chapter naming the report it came from:

1. Nexus itself · 2. All of engineering, its languages and frameworks · 3. Life and the universal equations ·
4. Mathematics · 5. Games, visualisation, the very large, and contests · 6. Philosophy, knowledge, invention, learning
and ethics · 7. Prompts, judges, and a picture to exact geometry · 8. Nature's collective genius · 9. Crafts, toys,
folding and ancient engineering · 10. Sound, film, magic and designed experiences · 11. Safety cultures and famous
failures · 12. Commons, citizen science and people together · 13. Unseen sciences, old games and cooking

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

---

## Chapter 8. Nature's collective genius

*From `research/12-nature-collective.md` (round 3, a far branch).*

1. What least set of function verbs covers both a bolt and a burr?
2. Can every part be described by the function it performs for its neighbour, not by its shape?
3. When a biological story proves a myth, does the engineered result still count as biomimicry?
4. How should a catalogue grade evidence: measured, modelled, inferred, anecdotal?
5. Which dimensionless numbers decide whether a natural mechanism survives a change of scale?
6. Why did Fastskin fail where flexible shark skin succeeded, and what in Nexus would have caught it?
7. Is compliance generally necessary for surface textures to work in flow?
8. Can contact splitting be an interface type with its counterpart geometry?
9. What does a gecko pad need from its neighbour: flatness, cleanliness, a material?
10. Is self-cleaning a property of a part, an interface, or an environment?
11. Why does the tubercles' stall delay depend on Reynolds number, and where does it stop helping?
12. How is "inspired by" told from "works like" automatically?
13. Can a node prove it transferred the mechanism and not just the form?
14. Why does Physarum match the rail network's cost but lose on fault tolerance?
15. Which model parameter is how much an engineer values redundancy?
16. Can a Physarum solver handle many sources and sinks with demand that changes, as cities have?
17. If memory lives in tube diameters, can an agent's memory live in the scene graph rather than its context?
18. What evaporation rate suits an AI stigmergy board, and how would we measure it?
19. When does stigmergy beat direct messages between agents, and when does it fail?
20. Can ant colony optimisation and Physarum be one network solver (positive feedback with decay)?
21. Does Bonifaci's convergence proof extend to many terminals (the Steiner case)?
22. What quorum suits a panel of AI judges, and how should it change with the stakes?
23. Are stop signals better than voting for choosing among AI designs?
24. How do bees avoid deadlock between two equal sites, and what is the AI's equivalent?
25. Why six or seven neighbours: a limit of perception or optimal robustness?
26. Does a rule by count make simulated crowds more real than one by radius as density changes?
27. What hysteresis appears in our swarms, and is it a bug or a feature?
28. How few informed agents steer a crowd, and does it apply to evacuation design?
29. Can a TERMES-style compiler guarantee completion for any structure in our library?
30. Which structures are provably impossible to build by local rules alone?
31. Can one compiled assembly order drive robot builds and explode animations alike?
32. How should termite rules be adapted for agents building a city from parts?
33. What does the octopus imply for how much a folded node should decide alone?
34. Where is the line between a subassembly's reflex and the central plan?
35. Can segmented control inspire controllers for long robotic or cable parts?
36. How much control can be pushed into a body's compliance?
37. Can a body's capacity as a reservoir be a design measure?
38. Is uniform stress actually optimal, or only good enough for growth?
39. How does CAO compare with modern topology optimisation in quality and cost?
40. Can tensile triangles be applied by the AI, without FEM, to every fillet it makes?
41. What does a tree's fork teach about joining two load paths without a notch stress?
42. How does a remodelling solver avoid oscillating?
43. What strain thresholds should drive adaptation in materials other than bone?
44. Why do bones remove underloaded material and trees not, and which suits which product?
45. Is bone's yearly renewal a model for maintenance cycles in infrastructure?
46. How is toughness kept from being confused with fracture toughness in the library?
47. Which levels of nacre's hierarchy do the toughening, and can each be modelled?
48. What makes bark-spider silk tough: sequence, expression or spinning?
49. Can a material node carry properties that depend on process, as silk's do?
50. How is self-healing's capsule-wall trade-off modelled as a constraint?
51. Should our repair loops carry a "healing efficiency"?
52. Which failures in a city simulation could heal themselves?
53. How is a beloved claim (the wood-wide web) audited for citation bias?
54. How many independent measurements before a claim enters the library?
55. Which famous biomimicry cases have primary data we can reproduce?
56. Can the termite convection cell be simulated and match the measured flows?
57. What would Eastgate look like redesigned on the 2015 mechanism rather than the myth?
58. Can a search by function suggest a mechanism before a form is in mind?
59. Should parts and organisms share one ontology, or linked graphs?
60. How are species differences held in one strategy record?
61. What is nature's bill of materials, and does any organism keep one?
62. Which natural systems build with no blueprint at all, and what does that mean for "no manual work"?
63. Can growth (trees, bone, Physarum) be one "grow where needed" node with stimuli plugged in?
64. What does being wrong cost a swarm decision, and how does the bees' protocol price it?
65. Do natural networks optimise for typical load or for fluctuation and damage?
66. If nature's optimisers are slow and local, where does Nexus need global solvers?

---

## Chapter 9. Crafts, toys, folding and ancient engineering

*From `research/13-crafts-toys-ancient.md` (round 3, a far branch).*

1. What is the least frozen primitive of a part system, and who may change it?
2. Can backward compatibility be proved by checking every new interface against every old one?
3. Why did studded Technic's mismatched pitches last 25 years, and what is our equivalent debt?
4. Should interfaces mate in one direction only, as Duplo takes LEGO but not the reverse?
5. Is clutch a property of one interface or of a population of made parts?
6. How is an interface whose quality depends on the process (moulding, machining) represented?
7. How much of an interface's fit budget goes to accumulated tolerance and how much to one feature?
8. If two clone systems share a pitch but not a thread, is that one interface or two?
9. Can an interface standard hold with no owner, as LDraw does?
10. What governance stops an open library forking into incompatible dialects?
11. Does a library need "obsolete but kept" as well as "deprecated"?
12. Should we show an interface's combinatorial richness (LEGO's 915 million)?
13. Which part families have exact number fields, and can Nexus compute in them?
14. Can the type system forbid a wrong connection outright, rather than a solver warn?
15. Is *ad quadratum* a family of interfaces (√2 between levels) rather than a style?
16. What is our Zome green strut: the one exception that completes a closed system?
17. Can a grid be local, a lattice per subassembly, and still mate across lattices?
18. When do imperial and metric grids meet closely enough to bridge with an adapter?
19. Can joinery be a boolean pair plus a slide axis, or does it need friction and grain?
20. How do wood's grain and seasonal movement become part of a joint's demands?
21. Is a wedge or pin a part, or part of the interface?
22. How is a joint that tightens under load modelled?
23. What is the check for "this joint cannot be assembled in any order"?
24. Can CNC tool access be an interface demand, joinery's wrench room?
25. Should Nexus offer fitted interfaces derived from scanned neighbours, the Inca way?
26. Is "the mistake becomes the target" a design method we can offer?
27. When is interchangeability worth what it costs in forgiveness?
28. Can Japanese joinery, Chinese bracket sets and European scarf joints share one taxonomy?
29. Is a fold an interface between two facets of one part?
30. How should problems hard to verify (global flat-foldability) be treated: heuristics, SAT, or warnings?
31. Can TreeMaker's "tree in, pattern out" be the template for every inverse-design node?
32. What allowances turn ideal paper folding into folding thick panels?
33. How are a structure's stowed and deployed states both first-class shapes?
34. Does a deployable need a check of its whole path, with no self-collision?
35. How is shape accuracy after deployment specified and checked?
36. Can kirigami's stable states be a discrete set of configurations of one part?
37. Is a Hoberman linkage one part with one freedom, or many parts with many constraints?
38. Which origami axioms map onto CAD sketch constraints, and which go beyond them?
39. Could fold patterns be a universal sheet interface ("foldable along…")?
40. Is a stitch an interface between loops?
41. Can Knitout's machine-independent layer be the model for every manufacturing output?
42. How does a knit's stretch become a demand on the part beside it (a foot on a shoe)?
43. What is knittability in our terms: a constraint on the graph?
44. Is a deck of Jacquard cards a program, a part, or a step of manufacture?
45. Can weaves (plain, twill, satin) be parameter nodes with predicted anisotropy?
46. How are yarn carriers and needle beds scheduled as resources?
47. Is a medieval rule of thumb a design code, and how is the end of its validity recorded?
48. Can Heyman's "find one admissible equilibrium" become a general existence check?
49. Which old rules encode equilibrium and which only taste?
50. How is a rule's origin (Roriczer, 1486) cited inside the graph?
51. Should materials carry self-healing as a mechanism with its trigger and response?
52. What does a lost recipe (Damascus) warn about materials whose properties depend on their source?
53. Can a site's hydrology be the neighbour of a qanat, with its gradient as the demand?
54. How is a windcatcher's dependence on wind, temperature cycle and dust modelled?
55. Is a stepwell a structure that follows a variable, and how do interfaces handle a moving datum?
56. Can shared water management be an interface between people and a structure?
57. What did Vitruvius get wrong, or we misread, and how are disputed sources handled?
58. Which ancient techniques were tuned for speed of building rather than strength?
59. How do we mark that a historical claim rests on one paper of 2025?
60. What should a child's construction set and an aerospace deployable share in our data model?
61. When should Nexus suggest a joint with no fastener instead of a bolt?
62. Can parts' interfaces be learned by mining which LDraw parts occur together?
63. What is the smallest teaching set of parts that shows every interface type: our "Meccano No. 1"?
64. How do we measure whether an interface system is still alive after 10, 50 or 100 years?

---

## Chapter 10. Sound, film, magic and designed experiences

*From `research/14-sound-film-magic.md` (round 3, a far branch).*

1. What is our "1 V per octave": the one convention letting any output drive any input?
2. Should signals be relative (knob plus input) or absolute by default, and where does each break?
3. When two cables meet in one input, is summing always right (forces, tolerances, ownership)?
4. What should a physical port's default be: the published nominal value, or "unconnected"?
5. How many channels is a cable: sixteen, or any number of swarm members?
6. Which inputs should trigger and which store in an engineering graph, and who decides?
7. Can the order wires were drawn ever change a result today, and how would we test it never does?
8. What is a board's power budget in compute, latency and tokens, and how is it shown?
9. Should feedback loops be allowed, and how is a one-sample delay said physically?
10. What is the smallest set of nodes that lets a person perform a simulation live?
11. How is a graph played live in VR, by hand, without breaking it?
12. What does a macro knob mean for a drone: which parameters, which safe ranges, from what sources?
13. When does a presentation view hide too much, and how is a fault behind it found?
14. Is a photo of a patch enough to reproduce a board, and what must a snapshot hold?
15. What can patch sheets teach the library law?
16. Modular players learn by re-patching others' patches: can Nexus teach the same way?
17. How does a hot-swapped node keep its state (velocity, temperature, charge)?
18. Should simulation time be rational, and what does exact time buy for causality?
19. At what cycle boundary does a live edit take effect in a physics simulation?
20. Can text (live coding) and a graph be two views of one model, kept in step?
21. What would building a bridge live before an audience look like?
22. Which materials have published modal data, and which would be estimates?
23. Can every contact make sound, and what does it cost per contact in a browser (measured)?
24. How is a generated sound labelled an approximation without breaking immersion?
25. Is sound a better alarm than sight in VR, given inattentional blindness?
26. Can a person hear a design fault (an unbalanced rotor) before seeing it?
27. What listening test would make a modal sound "checked"?
28. How does sound follow the scale mode: does a shrunken person hear higher?
29. What is our strength order when the AI, the person and a solver disagree?
30. Should every agent edit live in its own layer, mutable and removable without trace?
31. What is a payload boundary: which subassemblies load only when exploded?
32. Where do variant sets beat separate nodes, and where do they hide real differences?
33. Can a board export to OpenUSD faithfully, and what would be lost?
34. What is the work-item dot for an AI gate, and what states may it be in?
35. What does "recook only the dirty" require of identity and hashing?
36. What is a dailies session: who reviews, what is shown, what is decided?
37. How are notes pinned in space and time on a version so they survive a rebuild?
38. How does the engineering view prove its numbers are sourced?
39. What is the frustum rule for VR, and where does it fail (motion at the edge)?
40. Can a person's captured motion drive a robot node, and how is retargeting error shown?
41. What did virtual production lose against location shooting, and does Nexus lose the same against reality?
42. How did the Brain Bar change worlds without breaking the shot, and what is ours?
43. Which of our moments are natural blinks (teleport, mode switch) where change blindness is certain?
44. Should solver changes be refused during a blink, or applied and announced?
45. How do we measure whether people notice an AI change: what is our gorilla test?
46. Is the AI's avatar a gaze cue, and how is it kept from hijacking attention?
47. Which of Kuhn's three kinds does each of our flows risk deceiving?
48. Can an honesty audit run automatically over the event log?
49. When does simplifying for teaching become misdirection?
50. Could tutorials reveal the method after the effect, as magicians teach?
51. Does a polished JARVIS interface make people trust results too much, and how is that countered?
52. What is the time-misdirection risk: work done before the person began to watch?
53. Can a magician's "convincer" be used honestly, as proof a result is real?
54. What is each scene's beacon, and can it be computed (the most important open item)?
55. How far can a beacon be seen, and does it scale with the scale mode?
56. Where is forced perspective allowed, and how is it said?
57. What does the person do while a two-minute solver runs?
58. How is a wait estimate given without guessing?
59. What does a cue stack look like as nodes, and who calls the show?
60. How are safety interlocks made impossible for show or AI nodes to override?
61. Which tutorial structure suits which learner?
62. Does every tutorial step pass "Ask Why"?
63. What is a part panel's capture–focus–engage path, and what does it cost?
64. How is fatigue detected in a long VR session (head motion, dwell)?
65. With many people present, how are actors (AI, simulations) told apart from people?
66. How does the AI choose whom to give a one-on-one, without favour or intrusion?
67. What is the "house lights down" ritual for entering VR?
68. How do escape-room masters hint without breaking flow, and can the AI do the same?
69. What do museum designers know about how much text people read, and what does it mean for labels?
70. Which theatre roles (stage manager, dramaturg, props) map onto AI agents?
71. How do Imagineers rehearse a new attraction, and what is our cue-to-cue for a new feature?
72. Can a designed experience run on real engineering data without falsifying it for drama?

---

## Chapter 11. Safety cultures and famous failures

*From `research/16-safety-failures.md` (round 3, a far branch).*

1. What is our gust lock: a hidden state a complex model can be left in, unnoticed?
2. Which actions are complex enough for a checklist, and which would one make worse?
3. When should a checklist in a node editor be READ-DO, and when DO-CONFIRM?
4. How do we prove an item was done, not ticked?
5. Why did the checklist work in 2009 and not in Ontario in 2014, and which is Nexus more like?
6. What is the authority gradient between the person and the AI, and who fears to contradict whom?
7. How does a gate in an AI pipeline raise a concern the orchestrator cannot ignore?
8. Who runs our near-miss log so reporting carries no penalty?
9. What is a near miss where nothing physical is at stake?
10. How do we tell the AI's honest error from an at-risk shortcut from recklessness, and answer each?
11. Which of our incentives reward shortcuts (speed, green tests)?
12. Which barriers in a design are truly independent, and which share a cause?
13. Can fault trees come from a part graph automatically, and what does that miss?
14. How is a probability shown so no one reads 1 in 100,000 as fact?
15. When is a probability a target dressed as an estimate?
16. How is disagreement between estimators shown without averaging it away?
17. Where do we show commanded state as if it were real (the TMI lamp)?
18. Should every simulated sensor carry its own failure modes (stuck, drift, mislabelled)?
19. What is the AI's process model, and how could it part from the board?
20. For each AI action, what do "too late" and "stopped too soon" mean?
21. Can STPA be applied to prompt pipelines themselves?
22. What does drift look like in a library over months?
23. Which margins, tracked across versions, make drift visible?
24. When does an accepted anomaly become normal, and how do we count it?
25. Is the Swiss-cheese model too static for software that changes daily?
26. What is a latent condition in a parts library (one wrong datasheet value inherited by 400 boards)?
27. Should a defect in one part send a recall-style warning to every board using it?
28. What is a contact poka-yoke for a software port?
29. Which quantities must ports carry as dimensions to make the Mars Climate Orbiter error impossible?
30. Should conversion ever be implicit, and what does always making it explicit cost?
31. How are frames and handedness (left and right threads, coordinate frames) keyed?
32. Which real connector standards (PISS, IEC 60309) should become interface keys, sourced?
33. Can asymmetry be suggested when two parts could go together two ways?
34. What does a fixed-value poka-yoke (a count) look like in a bill of materials?
35. What does a motion-step poka-yoke look like for assembly sequences?
36. Where should Nexus stop the line, and who may restart it?
37. How is a stop gate kept from becoming an alarm everyone learns to bypass?
38. How is the repair loop kept from "fixing" a real product's data so a check passes?
39. Should Action Priority replace a single risk score everywhere, AI confidence included?
40. What is "detection" for a simulator: which check would catch this mode?
41. Which changes trigger a Hyatt re-check: geometry, connection, use, material, supplier?
42. How do we detect that a load path has moved through a connection not designed for it?
43. How do we catch defects that predate any change, like Hyatt's base design?
44. How is shop-drawing detail shown without drowning people?
45. How is a change of use (rink to restaurant) modelled as a change of load?
46. Which dynamic checks run by default: flutter, galloping, lateral excitation, resonance, fatigue?
47. How are people modelled as part of a dynamic system (walkers, helmsmen, pilots)?
48. Can a static solver be stopped from saying "safe" when no dynamic check ran?
49. How does a part carry its tested envelope, and what happens outside it?
50. How is extrapolation shown (36 °F against 53 °F tested)?
51. How is slow degradation modelled (water in a pool deck for forty years)?
52. Should we simulate progressive collapse, load moving to neighbours after one connection fails?
53. What inspection logic should a building or machine carry?
54. Which software failure modes (races, overflows) attach to software parts?
55. When software replaces a hardware interlock, what evidence is required?
56. How is automation's authority and its documentation represented (MCAS)?
57. How is a single sensor feeding a safety function flagged automatically?
58. How is a ship's envelope in a canal (wind, bank effects, squat) modelled with its operator?
59. What is the least post-mortem a failed simulation must produce?
60. How are the five whys kept from stopping at "human error"?
61. How are lessons pushed at the point of use rather than searched for?
62. How is an incident linked to the part classes and interface keys involved?
63. Which famous failures can be rebuilt as reproducible tests with sourced numbers?
64. Should every reference failure be a regression test the checker must catch?
65. How is a library of failures kept from being read as proof a design is safe once each is checked?
66. What is "public relations" in Nexus (green dashboards?), and how does reality come first?
67. How are reports kept honest when the AI is rewarded for finishing?
68. Who reviews the reviewers, and how are blind judges kept from drifting?
69. What does defence in depth mean for the anti-hallucination pipeline?
70. How much of each famous failure was technical and how much organisational, and can we model organisations?
71. Should Nexus model an investigation itself (from wreck to cause) as a graph?
72. What does a design that cannot be assembled wrong look like at the scale of a city?

---

## Chapter 12. Commons, citizen science and people together

*From `research/15-commons-citizens.md` (round 3, a far branch).*

1. What made a protease that beat experts for a decade fall to gamers in three weeks: the people, the tool, or the framing?
2. When does a game's score stop matching the truth, and how would anyone notice?
3. Can a recipe a person wrote still be theirs once an AI improves it?
4. What is our equivalent of EteRNA's weekly lab: a check the simulation cannot fake?
5. How many anomalies hide behind every classification with no "other" option?
6. Should the first to flag an anomaly name it?
7. How is a vote weighted when its maker's past agreement cannot yet be measured?
8. Are hidden calibration tasks ethical if people cannot tell them from real ones?
9. Is "beating the algorithm" lasting, or true only until the next algorithm?
10. When people's strategies are distilled into a bot, who owns the bot?
11. Which of Ostrom's principles breaks first when a commons goes global?
12. What is the boundary of a digital commons anyone can copy?
13. Can sanctions be graduated where a new account is free?
14. How is quality control kept from killing newcomers?
15. What false-positive rate is right for an AI that rejects parts?
16. Does verifiability favour the already published over the true and new?
17. What is a neutral point of view for an engineering choice?
18. When does a tag in common use become law, and who notices?
19. Whose needs never get a tag because they are not in the room?
20. Is a final decider a weakness or a necessity?
21. What is Nexus's "userspace" that must never break?
22. Did Stack Overflow die of AI, or was AI the second blow?
23. If an AI trained on a commons drains it, what does it owe back?
24. Can a commons charge an AI without closing itself to people?
25. Why is the spreadsheet's grid easier than named variables?
26. If nearly every spreadsheet holds errors, why are they trusted?
27. What is the smallest first step that leads someone to authoring?
28. Does remixing grow skill or replace it?
29. What credit actually feels like credit to a twelve-year-old?
30. Should a creator economy's money be allowed into a knowledge commons?
31. Do creator payouts gather wealth at the top?
32. What can a child build in redstone that an adult engineer cannot imagine?
33. Can a file still open in fifty years?
34. Is "the network is optional" compatible with shared worlds?
35. When two people put the same bolt in different holes at once, what is the right merge?
36. Does "last writer wins" lose meaning people care about?
37. Who orders writes when there is no server?
38. How large may a part's history grow before it is a burden?
39. Should deleting ever be truly irreversible in a commons?
40. What reputation signal can a group of fake accounts not fake?
41. Should reputation travel between worlds?
42. Is it griefing if it is funny?
43. How do you punish without humiliating?
44. If most toxicity comes from ordinary people on a bad day, should design target moods rather than people?
45. What makes someone give away a part that took them a month?
46. Does visible reuse move people more than money?
47. How does a blind person feel a gear mesh in 3D?
48. What is the spatial-sound grammar for "this is too hot"?
49. Can every drag be done with one switch?
50. How are sounds captioned when the sound is the physics?
51. Where does a caption sit in 3D, readable and comfortable?
52. What does plain language look like for tolerances and units?
53. Can a translation keep a technical term exactly right?
54. Should signing avatars be built at all, and who decides?
55. How do cognitive differences change what "undo" must mean?
56. Can a part's description be good enough that a blind expert prefers it to the model?
57. What would Ostrom say about an AI as a member of a commons?
58. Should the AI vote on tags?
59. How can an AI be wrong in public, safely?
60. What least evidence lets a community-made part be called real?
61. Who validates the validators?
62. How is popularity kept from being taken for correctness?
63. What share of the library should be unverified, and is that healthy?
64. How do strangers become friends while building something together?
65. What extraordinary thing becomes possible only when a million ordinary people share parts?

---

## Chapter 13. Unseen sciences, old games and cooking

*From `research/17-unseen-sciences.md` (round 3, a far branch).*

1. When should a node run one member and when fifty, and who decides: the person, the node, or a measured sensitivity?
2. How many members make a 1-in-20 tail trustworthy, and how is sampling noise shown in the band?
3. What is our "observation error", and can every sensor and published figure carry one?
4. When a product's published figure disagrees with an assimilated estimate, which wins, and is the rule written?
5. Can a board's error-doubling time be measured by twin runs, and what is a horizon for a machine that is not chaotic?
6. When a surrogate beats the physics on a benchmark, does it replace it, sit beside it, or only ever be checked against it?
7. What is our spread-against-skill test where no ground truth exists?
8. Can ensemble spread be shown inside the 3D scene (ghosted paths) without clutter?
9. Is a clustered ensemble ("three regimes: 60 %, 30 %, 10 %") more honest than a mean and a band?
10. What is the adjoint of a node graph, and could every node carry a derivative so whole boards fit to data?
11. How do we stop people reading an ensemble's mean as a possible single outcome, when it is blurred and maybe impossible?
12. What does starting-state uncertainty mean for a design not yet built, against a thing being measured?
13. Which of our systems (cities, grids, swarms, supply chains) are near criticality, where an average means nothing?
14. How does Nexus say a toy model shows something real material does not?
15. How is a calibrated parameter kept from leaking where it was not calibrated?
16. When is a particle model unavoidable and when is a continuum enough, and can a node choose?
17. What is the least-bad way to show a power-law risk to a non-expert?
18. Can softened stiffness be bounded: how wrong does it make the answer?
19. Does every method have a Schroeder frequency: a computable point where it stops holding?
20. Should the hand calculation always show beside the simulation, and how large a gap is a finding?
21. Can a machine built to the bolt predict its vibration signature before it exists?
22. What happens when a simulated fault spectrum is set against a real one from a phone's accelerometer?
23. Where does listening beat a number for judging a design?
24. How does Nexus follow a quantity over a product's life, not just at one moment?
25. How do standards' limits (by machine class, by mounting) become node rules without going stale?
26. Who sets an acceptance criterion, and how is that shown?
27. What safety factor goes on a simulated time, and where is it sourced?
28. How does our vocabulary keep indicator and event apart?
29. Could Nexus publish Verification and Validation guides generated from its tests?
30. What is each domain's "design fire": the standard bad day (a design storm, load, crowd)?
31. When a simulation passes the code and a real test fails, how does the failure flow back into the library?
32. When should Nexus refuse a life-safety question altogether?
33. Can symmetry detection run on every saved part and store it compressed?
34. When a "symmetric" real product measures asymmetric, is that an error or a fact to keep?
35. Which conservation laws must every physics board report, and what drift is acceptable?
36. Can a solver solve one sector and replicate it, and prove the loads symmetric too?
37. Is a broken symmetry a design signal to surface ("mirror-symmetric except here")?
38. Can the 17 wallpaper groups be generators in a pattern node?
39. What is a "God's number" for a design space: the furthest any design is from a valid one?
40. Could group theory describe the AI's allowed edits, and make some provably reversible?
41. What does the umpire know that players do not, and how is that enforced in the data?
42. For each domain, how much is tables and dice, and how much judgement?
43. How is an umpire's judgement audited afterwards?
44. Can an AI umpire be judged blind against a human one?
45. What is the least hidden information that makes a multi-agent simulation feel real?
46. How do message delays and noisy reports become standard node properties?
47. When players exploit a rule gap, is that a bug report against the rules?
48. Should our node contracts carry errata as board games do?
49. What does a wordless tutorial for building a motor look like?
50. Can a puzzle be built that only someone who understands a concept can solve?
51. Which outputs are insight and which predictions, and are they labelled?
52. Is "argue and roll" useful for questions with no physics (policy, society)?
53. Can every process (cooking, manufacturing, assembly) be one board type: materials in states, operations between?
54. What share of real recipes and work instructions are under-specified, and can the flow graph find it?
55. Should every timed step convert to one gated on state?
56. Is mise en place a general rule: precompute and validate every input before the run?
57. Can a brigade scheduler run our own AI pipeline (stations, a pass, re-fire on failure)?
58. How is chemistry that needs dryness modelled: reactions gated by another state?
59. Can log-reduction tables be a general dose model (heat, radiation, fatigue cycles)?
60. Where does taste come in: a human-preference gate for the senses?
61. Should toy, full and calibrated be a first-class axis of every model?
62. What is the shared shape of simulation → metric → criterion → decision across fire, sound, vibration and weather?
63. Which fields keep a hand calculation as a sanity check, and can every node have one?
64. What is our observation network (the real data we assimilate), and how is its quality watched?
65. How is "not simulated" said in the scene itself, not only in a footnote?
66. Is a public validation dataset the most important trust asset we could build?
67. What does an ensemble of designs (not of states) look like: optimisation, or something more honest?
68. How is a calibrated model kept from being presented as a predictive one?
69. Where two methods overlap (rays and waves; particles and continuum), how are they blended at the seam?
70. Which of these fields' failures (the criticality overclaim, flashover misread, Sabine's limits) would we repeat if no rule stopped us?
