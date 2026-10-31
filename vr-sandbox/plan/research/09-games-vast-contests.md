# Research: games, visualisation, astronomy and contests: the "irrelevant but genius"

One research pass, 2026-10-31. Marks: [D] found in that pass with its source; [K] known background, not re-fetched; [I] the agent's inference. Unconfirmed: Outer Wilds' "physics past 22 minutes" (Reddit hearsay); Elite predicting TRAPPIST-1 (a video claim); ARC-AGI-3 scores (snippets of ARC Prize's feed); IMO 2026 AI perfect scores (a secondary blog); Ludum Dare ending at LD64 (Wikipedia only); visionOS figures (third-party restatements).

## Findings, in short
- **Tears of the Kingdom's Ultrahand** [D] (GDC 2024; gamedeveloper.com, ign.com): "multiplicative gameplay": independent objects whose properties combine; the biggest problem was objects driven by physics meeting ones that were not, solved by making everything physical (gears joined by a constraint that passes velocity); a sound engine of its own for glued contraptions. [I] No fake objects: every grabbable thing needs mass, a collider and sockets.
- **Townscaper** [D] (Stålberg): an irregular quad grid; wave function collapse as a constraint solver; tiles bent to fit; animation hides the solver. [I] The person places intent, a solver makes form.
- **Kerbal Space Program** [D]: patched conics (two-body pieces joined at spheres of influence); manoeuvre nodes (edit a future impulse, see the path at once); physics warp capped at 4×, "on rails" warp far faster when nothing pushes. Principia makes chaos visible.
- **Baba Is You** [D]: rules are tiles in the world; lining up NOUN IS PROPERTY makes a rule; rules about rules. [I] The node graph made physical.
- **Dwarf Fortress** [D]: history is "a giant zero-player strategy game … and history is just a record of that". [I] Narrative as the simulation's log.
- **The Sims** [D] (Zubek's needs-based AI): smart objects advertise actions and rewards; agents score them against their needs; the intelligence lives in the objects. [I] Affordance ports on any object.
- **Cities: Skylines II** [D]: routes chosen by cost (time, money, comfort, parking) with personal preferences, plus local decisions on the way.
- **Spore** [D]: animation for skeletons no one knew in advance, by context ("upper leftmost grasper") and inverse kinematics; a person labels what a foot is.
- **No Man's Sky** [D]: 18 quintillion planets from one 64-bit seed; nothing stored until seen. **Elite Dangerous** [D]: ~400 billion systems from the galaxy's mass by physical rules, real catalogued stars as fixed anchors.
- **Universe Sandbox** [D]: a target time step; the real step drops to keep accuracy; accuracy is a dial (a 22-day step gives Mercury four updates an orbit, and its orbit falls apart).
- **Teardown** [D]: no triangles; rays marched through voxels; a 1-bit occupancy map of the whole world. **Noita** [D]: every pixel a material; checkerboard chunks so threads never collide.
- **Factorio** [D]: deterministic lockstep (only inputs are sent; a desync means the simulations disagree), state dumps on desync, exact versions matched.
- **Opus Magnum** [D]: every solution scored on three axes, shown as histograms of everyone's, the community built Pareto record sites and requires a gif of every record.
- **Dreams** [D] (Evans, SIGGRAPH 2015): signed distance fields and splats; a soft blend must turn hard past a radius or culling breaks.
- **Rain World** [D]: creatures as physics points; off-screen creatures run simplified physics. **Wiremod** [D]: user scripts need a CPU quota. **Minecraft redstone** [D]: compiled circuits keep the same tick meaning.
- **Bret Victor** [D]: "an immediate connection to what they create"; Dynamicland, communal and physical. **Observable** [D]: a variable nothing observes is never computed. **Shadertoy, Quilez** [D]: distance functions, smooth booleans, domain repetition. **Demoscene** [D]: 4k and 64k intros generate everything at run time.
- **Spatial UI** [D, secondary]: content within ±30° of eye level, windows at ~1.5 m anchored to the world, gaze targets of at least 60 pt.
- **REBOUND** [D]: IAS15, WHFast, MERCURIUS integrators; runs in a browser through emscripten. **SPICE and Horizons** [D]: an ephemeris file is "a recording of the integrator", interpolated at any instant; event finders ("when does X hide Y"). **Gaia DR4** [D]: due 2 December 2026, 66 months of data, per-epoch measurements, exoplanet candidates. **OpenSpace** [D]: a dynamic scene graph for the universe; the camera relative to the nearest node. **IllustrisTNG** [D]: each box run at three resolutions to test convergence; merger trees by tracking identity across snapshots; "subgrid physics" as an honest name.
- **Contests** [D]: ARC-AGI-3 (interactive, no instructions, open source required; harnesses change scores a great deal); IMO 2026; ICPC 2025 (AI solved 12 of 12 and 10 of 12); Kaggle's public and private boards; BenchCAD (17,900 verified CadQuery programs; models swap sweeps and lofts for extrusions); iGEM (standard parts, cumulative medals for contributing back); Solar Decathlon (measured and juried contests, a hidden score); Formula Student (judges score how well a team understands its own design); DARPA SubT (a virtual track with a fixed catalogue of robots, open simulator); Ludum Dare (Compo and Jam).

## What to take, ranked [I]
1. **Everything physical**: a body contract for anything that can be grabbed; a glue node that joins anything to anything; a blueprint node that records and replays an assembly.
2. **Affordances**: objects advertise what they offer; agents with needs score them; the AI reads the same.
3. **Rules as tiles** in VR: sentences that edit the live simulation.
4. **Lazy evaluation**: only what something observes is computed (cities and galaxies).
5. **Intent in, form out**: a tile solver fills painted volumes with rooms, houses, pipes.
6. **A chronicle**: every run keeps a log that can be asked "when did the bridge fail".
7. **Two tiers of physics and visible prediction**: rails when idle, integration under force, editable future impulses.
8. **Accuracy as a dial**: target and actual time rate, the error shown.
9. **Deterministic lockstep and replay**: share a run as seed, board and inputs; a desync detector.
10. **Scores on several axes, shown as distributions**, with replayable solutions and credit chains.
11. **A seed is a world**: content as a function of place and seed; only edits stored.
12. **Real anchors with consistent fill** (Gaia, Horizons, OpenStreetMap).
13. **Baked tracks** to scrub time both ways for free; event finders.
14. **Logarithmic scale and time, local frames, scenes grouped by scale.**
15. **Locomotion for bodies no one designed** (Spore), physics-point creatures (Rain World).
16. **A cellular material layer** (sand, fluid, gas, fire) on the GPU.
17. **A destructible voxel layer** with a 1-bit occupancy map for rays, sound and sight.
18. **Stress colouring**, a budget, slow motion and replay of failures.
19. **Compiling hot subgraphs**, keeping the same tick meaning.
20. **Quotas** for user scripts.
21. **Signed-distance sculpting** with blends that stay cullable.
22. **Immediate connection**: every parameter scrubbed, its effect within a frame.
23. **Subgrid honesty**: every model's valid range and resolution, a badge past it; three resolutions to test convergence.
24. **Measured and juried scores**; "explain your design"; a hidden private score.
25. **Medals for contributing to the commons.**
26. **Fixed kits of parts** for fair challenges.
27. **Nexus as an evaluation arena** for agents and people, the harness reported.
28. **CAD as code tasks** to test the AI (does it use sweeps and lofts?).
29. **A "64k" challenge**: worlds from tiny graphs.
30. **A loop node**: the world resets, only the log is kept.

## Questions
The 100 questions of this pass are chapter 5 of `../BOOK-OF-QUESTIONS.md`.
