# Research (round 3, far branch): weather, granular matter, acoustics, fire, symmetry, old games, cooking

One research pass, 2026-10-31. Marks: [C] checked in that pass with its source; [M] from memory; [I] inference.

## (A) Findings, in short
- **Weather** [C]: ECMWF's forecast is an ensemble (50 perturbed members and a control, 9 km, 15 days; 100 members to 46 days; 51 to 7 months): "collectively they indicate the likelihood of a range of future weather". Starting states come from 4D-Var plus an Ensemble of Data Assimilations (50 runs with perturbed observations): its spread tells 4D-Var how far to trust the model against the observations. [M] Kalman and ensemble Kalman filters; 4D-Var uses the model's adjoint (the same idea as backpropagation). Lorenz's rounding .506127 → .506 (1963). The "two-week limit" is not a constant: it came from a ~5-day error-doubling time and varies by scale and season [C]. GenCast (Nature 2024) samples ensemble members, each sharp, only the mean blurred; ECMWF's AI ensemble (operational July 2025, v2 May 2026) still relies on physics-based assimilation for its starting state [C]. DGMR nowcasting was ranked first by Met Office forecasters in 89 % of cases, judged blind by people [C]. [I] Blending observations and forecasting are separate machines; AI replaced the forecast before the blending.
- **Granular matter** [C]: the BTW sandpile (1987) gives power-law avalanches and its order of topplings does not matter (Dhar); real sand mostly does not obey it (only elongated rice grains did, Frette et al. 1996). DEM (Cundall and Strack 1979); [M] stiffness is often softened to afford the time step, a declared fudge. Avalanche engineering uses depth-averaged flow with Voellmy friction (RAMMS), its parameters calibrated on past events, not constants, varying widely between sites [C]. [I] Three levels of model (toy, particle, calibrated continuum), each with its own honesty.
- **Acoustics** [C]: Sabine's T60 = 0.161 V / A; Eyring for absorbent rooms; estimates at best. Simulation is hybrid: image sources for early reflections, rays for late energy, waves for low frequencies; the handover is the **Schroeder frequency**, below which geometric methods fail (ODEON says so plainly). Machines [C]: ISO 20816 zones A to D by RMS vibration velocity, trend over absolute value; early bearing faults only by envelope analysis; [M] bearing defect frequencies follow from geometry alone: **faults predictable from the parts list**.
- **Fire** [C]: NIST FDS, open and public domain, with separate Verification and Validation guides, a public validation dataset and a nightly "firebot". Flashover's indicators (~600 °C upper layer, ~20 kW/m² at the floor) are not its definition. Performance design rests on ASET ≥ RSET with a margin. [M] Prescriptive codes from furnace tests; performance codes from design fires; zone models between hand calculation and CFD. [I] The simulation answers a question with a margin against a criterion someone signed off.
- **Symmetry** [C]: 17 wallpaper groups, 230 space groups; patterns classified from images (Liu and Collins, CMU 1998). The Rubik's group has 4.3 × 10¹⁹ elements; God's number 20, proved using the cube's 48 symmetries to cut the search: **symmetry as compression of computation**. [M] Crystal files store the asymmetric unit and the operators; checkCIF flags a missed symmetry as an error: symmetry as a check.
- **Old games** [C]: Kriegsspiel (Reisswitz 1824): real maps, written orders, an **umpire** who keeps the true state, decides what each side sees and settles combat with dice; Verdy du Vernois' "free" Kriegsspiel (1876) let the umpire judge. A modern AI-umpired Kriegsspiel (Ludus): the umpire "can only act on the game through the engine, and every decision he makes on his own judgement is logged with the rule it rests on" (our "AI works through nodes" exactly). *The Witness* teaches without words: extreme clarity first, minimal puzzles of one idea each. [M] Magic: The Gathering's rules as a numbered code with errata; professional wargames make insight, not prediction.
- **Cooking** [C]: the Maillard reaction needs ~140–165 °C and a dry surface (water pins it near 100 °C). Recipes as flow graphs (ingredients in a state; actions between; parallel steps the text hides). Escoffier's brigade: stations working in parallel. [M] Sous-vide tables are pasteurisation tables (log reductions against time and temperature); service is a job-shop schedule; mise en place is precomputation.

## (B) What Nexus should take
1. **Ensembles by default** where inputs are uncertain or dynamics chaotic: quantile bands, spaghetti, probability of crossing a threshold; one run is "one member", never "the answer".
2. **An assimilate node** (ensemble Kalman filter first): a simulation fitted to real sensor data, with its covariance.
3. **Analysis and forecast kept apart**, so a fast surrogate can replace one without the other.
4. **A spread check**: ensemble spread against real error where reference data exist; an overconfident model fails.
5. **A predictability badge**: the error-doubling time from twin runs; the view greys past the horizon.
6. **Surrogates with provenance**: what they were trained on, their score against physics, refusing inputs outside it.
7. **Judged blind by people** (DGMR) beside the numbers.
8. **A model-level tag**: toy, particle, or calibrated continuum, honesty text generated from it.
9. **A calibrated parameter type**: "calibrated against X, valid for Y", distinct from measured and published.
10. **Declared softening** in particle methods.
11. **Heavy tails**: where events follow a power law, report the tail and the largest seen, never a mean.
12. **Validity bands checked at run time** (the Schroeder rule for every method): refuse below them, or label "not simulated".
13. **The hand calculation beside the simulation**; a large gap is a finding.
14. **Diagnose from the parts**: bearing defect frequencies from geometry; spectra attributed to parts; ISO 20816 zones and trend (predictive maintenance straight from "down to the bolt").
15. **An acceptance node**: simulation → metric → criterion (with margin, who set it, source); pass or fail with a margin.
16. **Indicator is not event**: proxies labelled proxies.
17. **Verification and Validation guides** generated from tests, a public validation set, a nightly run (FDS's way).
18. **Design scenarios as library items** (design fires, storms, loads, crowds): picked, not invented.
19. **A symmetry detector**: compress (asymmetric unit plus operators), check (declared symmetric but is not; a missed symmetry), speed up (solve a sector, replicate).
20. **A conservation watchdog** (Noether): drift logged as a health measure.
21. **An umpire node**: the true state; each agent sees only what it can; judgements logged with their rule; a dial from rigid (tables and dice) to free (judgement with stated odds).
22. **Dice as declared uncertainty**: where physics is unknown, roll from a stated distribution, labelled.
23. **Rules as a numbered spec with errata**, playtested for exploits (node contracts; the AI's instructions).
24. **Teach by puzzle**: small boards of one idea, no red herrings, then combinations; no text.
25. **Process boards**: materials in states, operations between, with conditions; checked for parallelism and missing steps.
26. **Gate on state, not time** ("until the core reaches 57 °C").
27. **A brigade scheduler**: stations, tickets, the pass as a barrier; for assembly, construction and AI pipelines.

## (C) Questions

The 70 questions of this pass are chapter 13 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches
- Flood forecasting ensembles (EFAS, GloFAS) feeding decisions by cost and loss
- Earthquake early warning: a nowcast whose deadline is shorter than the computation
- Particle filters for non-Gaussian assimilation in agent and life simulations
- Reanalysis (ERA5): one gap-free history made by assimilating everything
- The material point method (Disney's *Frozen* snow) between particles and continuum
- Soil liquefaction and Eurocode 7's partial factors for calibrated soil parameters
- Auralisation and HRTFs: hearing the simulated room in VR
- Modal analysis and operating deflection shapes: animating a machine at each resonance
- Crowd evacuation models (Pathfinder, social-force models) computing RSET
- Wildfire spread (Rothermel, FARSITE) with satellite hotspots assimilated
- Blast: TNT equivalence and Kingery–Bulmash charts as a sourced lookup node
- Quasicrystals and Penrose tilings: symmetry a lattice forbids
- Representation theory: symmetry predicts which vibration modes exist
- Operations research in kitchens and factories: takt time, lean, Little's law
- HACCP: critical control points as gates in a process board
- Wargame archives (RAND, the Naval War College): how game findings were used and misused
- Solo wargames' rule-based opponents (flowchart "bots") as umpires that need no person
- Superforecasting and Brier-scored markets to calibrate the AI's own confidence
- Model output statistics: correcting a biased model against observations, cheaper than assimilation
- Shadowing: when a chaotic run still follows some true one
