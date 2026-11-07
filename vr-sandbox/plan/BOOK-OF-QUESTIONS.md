# The book of questions

The questions Nexus must answer before and while it is built: the best of 2,244 gathered over six research rounds,
cut on 2026-11-01 at the user's word ("find the best questions, get rid of all the others"; decision 0010). A question
was kept only if its answer changes what is built, it can be answered (a measurement, a source, a test, a decision),
the plan does not already settle it, and it is the best of its near-duplicates. The rest are in git history.

Each is grouped by the spec it bears on, tagged with the task it feeds, and keeps its old number (Q chapter.number) and
the research it came from. An answer is written under its question with its date and how it was found; an answered
question stays, with its answer.

<!-- contents: written by plan/compile.py -->
| Section | Questions |
| --- | --- |
| Spec 00: the structure | 25 |
| Spec 01: interfaces | 21 |
| Spec 02: search in tiers and the names index | 1 |
| Spec 03: out of the container: the app on the web | 4 |
| Spec 04: being in it: physics, ghost, scale, time, sight | 5 |
| Spec 05: civil engineering, populated | 1 |
| Spec 08: a picture to a 3D profile: the AI draws, a parser with no AI copies | 2 |
| Spec 09: the physics core: ports that carry what flows, equations without direction, folding that is exact | 17 |
| Spec 10: trust in numbers: uncertainty, status, sensitivity, and what cannot be simulated | 46 |
| Spec 11: the living world: only the observed computed, replay, affordances, agents that coordinate, an umpire | 30 |
| Spec 12: cost and carbon: what a thing costs and emits, with where and when | 4 |
| For the user to decide | 14 |
| The direction of the whole | 1 |
<!-- /contents -->

---

## Spec 00: the structure

1. When the agent builds a board that simulates but is physically wrong (wrong sign convention, wrong ground), which automated check catches it, and what is its false-negative rate? *(00.S5; adds missing checks to the AI evaluation set; guards silent wrong results. Q2.47, from `research/06-engineering-languages.md`)*
2. How does the agent find the right node kind among hundreds without listing all of them, and is retrieval over node cards measured for accuracy? *(00.S5; decides the agent's lookup design and its token cost. Q2.46, from `research/06-engineering-languages.md`)*
3. How will Nexus keep its critic and solvers from being tuned to pass, and who holds out cases the rules were not tuned on? *(00.S5; adds a held-out set to the evaluation; guards against overfit checks. Q2.42, from `research/06-engineering-languages.md`)*
4. Does any untrusted text reach the planning AI today without a schema-only extractor between? *(00.S12; an audit finding here reorders S12 ahead of other AI work. Q7.40, from `research/11-prompts-reviewers-drawing.md`)*
5. Can a judge be fooled by "Yes", "Sure", an empty answer or a confident tone? *(00.S9; adds cheap adversarial cases every judge must pass before use. Q7.57, from `research/11-prompts-reviewers-drawing.md`)*
6. What fails when a step's output is right but names an id the next step does not know? *(00.S5; guards against D10-style silent wiring failures in AI plans. Q7.25, from `research/11-prompts-reviewers-drawing.md`)*
7. What share of the AI's quotes fail an exact-match check against their source today? *(00.S4; baseline decides whether quote checking gates the provenance check. Q7.60, from `research/11-prompts-reviewers-drawing.md`)*
8. How should our tools report errors so the AI repairs rather than retries blindly? *(00.S5; shapes error messages from engine and tools, measured on the eval set. Q7.27, from `research/11-prompts-reviewers-drawing.md`)*
9. Is the list of failure codes complete, judged by openly coding a hundred real failures first? *(00.S10; fixes the near-miss log's categories before responses are built on them. Q7.31, from `research/11-prompts-reviewers-drawing.md`)*
10. What is the retry rule per failure code, given an ungrounded claim may just return as a new fabrication? *(00.S12; sets which failures retry and which stop the line. Q7.33, from `research/11-prompts-reviewers-drawing.md`)*
11. On our own gold set, what is each judge's flip rate when order is swapped, its sensitivity to padding, and its self-preference? *(00.S9; decides which judges may sit on the panel and with what weight. Q7.46, from `research/11-prompts-reviewers-drawing.md`)*
12. What kappa against people's labels is good enough to trust a judge without a person, per task? *(00.S7; sets the threshold for when the evaluator runs unsupervised. Q7.50, from `research/11-prompts-reviewers-drawing.md`)*
13. How many cases per prompt node make a 2-point difference in pass rate detectable by a paired test? *(00.S5; sizes the evaluation sets so version comparisons mean something. Q7.4, from `research/11-prompts-reviewers-drawing.md`)*
14. Should each prompt node pin its model, and what happens to every node's measures when a model is retired? *(00.S12; decides version identity and re-measurement on model change. Q7.5, from `research/11-prompts-reviewers-drawing.md`)*
15. How do we stop an optimiser deleting safety or abstention instructions its measure does not reward? *(00.S12; adds frozen must-keep cases to every prompt suite. Q7.17, from `research/11-prompts-reviewers-drawing.md`)*
16. Is there a suite of injection strings run against every version of the AI's prompts? *(00.S12; adds an injection suite to the frozen prompt suites. Q7.42, from `research/11-prompts-reviewers-drawing.md`)*
17. How is the blind re-solver kept truly blind, with the answer kept out of its context? *(00.S9; a leaked answer turns an independent check into an echo. Q7.66, from `research/11-prompts-reviewers-drawing.md`)*
18. When the source is a datasheet PDF, how is its text extracted well enough to check a quote? *(00.S4; decides whether datasheet-sourced values can pass the provenance check. Q7.61, from `research/11-prompts-reviewers-drawing.md`)*
19. Where should Nexus stop the line, and who may restart it? *(00.S10; defines stop points and restart authority for C25. Q11.36, from `research/16-safety-failures.md`)*
20. Which famous failures can be rebuilt as reproducible tests with sourced numbers? *(00.S5; supplies known-bad cases checkers must catch. Q11.63, from `research/16-safety-failures.md`)*
21. How should independent checks be weighted in gate.quorum so that correlated judges count once? *(00.S9; stops a quorum of copies passing as independent agreement. Q18.53, from `research/22-growth-self-organisation.md`)*
22. Which current data files have unclear licences (scraped tables, datasheets)? *(00.S4; lists what the provenance check will fail on first. Q19.35, from `research/23-truth-at-scale.md`)*
23. Which of the eleven accident cases should be built as worked boards to test whether Nexus's own checks would have caught them? *(00.S5; seeds an evaluation set that tests the checks themselves. Q16.70, from `research/20-organisations-accidents.md`)*
24. Could a malicious pasted line do harm (a fold that overwrites a library block), and what guards it? *(00.S12; adds a guard against untrusted text altering the library. Q23.65, from `research/27-notations.md`)*
25. Which of these comfort standards can be quoted in a node under their licences, and which only paraphrased? *(00.S4; licence rule C18 decides how standard nodes are written. Q30.67, from `research/34-comfort-load.md`)*

---

## Spec 01: interfaces

26. Which standards' tables (VDI 2230, ISO 2306, EN 1993-1-8) may be quoted as data, which only referenced, and who checks each one? *(01.I3; decides which I3 table rows may exist under C18. Q2.64, from `research/06-engineering-languages.md`)*
27. How are edition and version carried for standards (Eurocode 2004 versus 2023+, ASME Y14.5-2018) so a check says which edition it applied? *(01.I3; every sourced table row and check must name its edition. Q2.28, from `research/06-engineering-languages.md`)*
28. Can a negative be inverted again (a hole's negative is its bolt), and does that round trip always return the same thing? *(01.I5; a property test for negativeOf. Q1.21, from the code and the plan)*
29. Is every negative a pure function of the interface's standard, its fit and the host's material, or do some depend on how the part is made or serviced? *(01.I5; changes negativeOf's inputs before it is written. Q1.16, from the code and the plan)*
30. Is room to work (a wrench's swing, a hand's reach) part of the negative, and is it measured by a body's segments or by a table? *(01.I7; decides how I7's room check is computed and sourced. Q1.19, from the code and the plan)*
31. Can backward compatibility be proved by checking every new interface against every old one? *(01.I18; decides whether I18 ships an exhaustive compatibility check in the gate. Q9.2, from `research/13-crafts-toys-ancient.md`)*
32. How much of an interface's fit budget goes to accumulated tolerance and how much to one feature? *(01.I7; adds a tolerance-stack check to the checks before cutting. Q9.7, from `research/13-crafts-toys-ancient.md`)*
33. Should clearance holes be computed from the floating-fastener formula or read from ISO 273 and checked against it? *(01.I3; settles I3's table source against C18's no-copied-tables rule. Q14.43, from `research/18-self-describing-interfaces.md`)*
34. What validator runs on an interface record, and when (on save, on load, on mate)? *(01.I2; defines when malformed interfaces are caught instead of mating silently. Q14.29, from `research/18-self-describing-interfaces.md`)*
35. Should interface kind ids be IRIs, IRDI-like codes, or plain strings with a version suffix? *(01.I2; id format is hard to change after I2 and I18 ship. Q14.18, from `research/18-self-describing-interfaces.md`)*
36. What sizes must each interface kind carry (the template), and who writes the first fifteen templates? *(01.I2; defines the record's required fields and first workload. Q14.17, from `research/18-self-describing-interfaces.md`)*
37. What position tolerance does Nexus assume when a person states none? *(01.I7; sets the default used by pre-cut checks and clearance sizing. Q14.44, from `research/18-self-describing-interfaces.md`)*
38. How does the solver prove a wrong orientation cannot mate after a key is added? *(01.I19; turns C20's 'impossible' into a testable check. Q14.35, from `research/18-self-describing-interfaces.md`)*
39. What happens to an interface when its part is mirrored: which kinds flip handedness? *(01.I19; prevents mirrored parts carrying wrong-handed threads silently. Q14.39, from `research/18-self-describing-interfaces.md`)*
40. Which changes trigger a Hyatt re-check: geometry, connection, use, material, supplier? *(01.I21; sets the trigger list of the Hyatt gate. Q11.41, from `research/16-safety-failures.md`)*
41. How do we detect that a load path has moved through a connection not designed for it? *(01.I21; defines the core detection the Hyatt gate must perform. Q11.42, from `research/16-safety-failures.md`)*
42. Should an adapter between interface versions be a node, a function in the template, or a stored part? *(01.I18; chooses the adapter mechanism I18 builds. Q14.23, from `research/18-self-describing-interfaces.md`)*
43. Should the agent be forbidden to 'fix' a singular model by deleting equations, and required to explain the physics instead? *(01.I14; a rule for the AI guarding against silently wrong models. Q15.54, from `research/19-physics-core-browser.md`)*
44. Should NBN be built before spec 01, so interface placement is written in it from the start? *(01; changes build order between notation and interfaces. Q23.57, from `research/27-notations.md`)*
45. Is egglog's WebAssembly build fast and small enough to run in a worker on a phone? *(01.I26; feasibility of the chosen refactor engine on target devices. Q22.26, from `research/26-proofs-and-programs.md`)*
46. What is the error of a fit result computed from summary percentile tables instead of individual rows, and should it be refused? *(01.I25; guards human-fit checks against a known wrong method. Q24.23, from `research/28-body-medicine.md`)*

---

## Spec 02: search in tiers and the names index

47. What happens to the library when a standard it relies on is revised? *(02.N2; adds revision tracking like T12's retraction marking for standards. Q6.50, from `research/10-philosophy.md`)*

---

## Spec 03: out of the container: the app on the web

48. Can Wasm threads (SharedArrayBuffer, COOP/COEP) be used given where Nexus will be hosted (U1), and what breaks without them? *(03.W2; sets required headers and host choice; pool.ts workers may fail silently. Q2.58, from `research/06-engineering-languages.md`)*
49. OCCT and ngspice are LGPL and linked into WebAssembly: what must Nexus ship (relinkable objects, source offer) to comply in a browser? *(03.W2; blocks lawful deployment of the exact-solids build. Q2.62, from `research/06-engineering-languages.md`)*
50. How large is the cold-start budget (OCCT about 23 MB, others several MB) and what lazy-loading order shows the first board in under N seconds? *(03.W5; sets load order and the measured load-time target. Q2.57, from `research/06-engineering-languages.md`)*
51. What is stored client-side (IndexedDB) versus server-side, and what happens to a board when storage is cleared? *(03; prevents silent loss of users' boards. Q2.61, from `research/06-engineering-languages.md`)*

---

## Spec 04: being in it: physics, ghost, scale, time, sight

52. Is WebGPU compute available in Quest Browser today, and if not, which nodes degrade, by how much, and is the degraded result labelled? *(04.P10; decides headset compute path and honest labelling of fallbacks. Q2.56, from `research/06-engineering-languages.md`)*
53. How do we stop contraptions exploding from overlapping colliders at the moment of gluing? *(04.P1; an early live-physics failure the first task will hit. Q5.6, from `research/09-games-vast-contests.md`)*
54. If cross-platform Jolt determinism costs about 8% speed, is rewind-by-replay worth it, or should rewind store snapshots instead? *(04.P5; chooses the rewind mechanism and whether LW9's build is needed. Q2.16, from `research/06-engineering-languages.md`)*
55. At what cycle boundary does a live edit take effect in a physics simulation? *(04.P5; fixes edit timing so replay and rewind stay deterministic. Q10.19, from `research/14-sound-film-magic.md`)*
56. What is the keyboard's key size today in degrees, and does it meet 2.5°? *(04.P10; measured check for the headset keyboard layout. Q30.49, from `research/34-comfort-load.md`)*

---

## Spec 05: civil engineering, populated

57. Which design-load sources (ASCE 7, Eurocode 1) can legally be encoded as data, and if none, how does a civil board make the load a required sourced input? *(05.V3; decides whether civil nodes may carry default loads. Q2.27, from `research/06-engineering-languages.md`)*

---

## Spec 08: a picture to a 3D profile: the AI draws, a parser with no AI copies

58. Is the geometry the stroke's centreline or its outer edge, and how is the half-width offset handled? *(08.K3; wrong choice silently shifts every parsed dimension by half a stroke. Q7.82, from `research/11-prompts-reviewers-drawing.md`)*
59. Does asking the AI for SVG paths from the description beat every image model for exactness? *(08.K1; could drop the image-model path from spec 08 entirely. Q7.72, from `research/11-prompts-reviewers-drawing.md`)*

---

## Spec 09: the physics core: ports that carry what flows, equations without direction, folding that is exact

60. When Jolt (impulse-based, fixed 1/240 s) and an acausal DAE share a body, which one owns the state, and how is energy kept consistent across the boundary? *(09.P1; sets state ownership between sim.ts and the physics core. Q2.11, from `research/06-engineering-languages.md`)*
61. Where a board's causal blocks meet acausal ports, what is the rule at the boundary, and who decides the causality of an acausal port wired to a causal input? *(09.P1; defines junction semantics the port types must enforce. Q2.1, from `research/06-engineering-languages.md`)*
62. Should cycles be an error, solved as algebraic loops, or iterated to a fixed point, and can the engine tell which a given cycle needs? *(09.P2; sets how the equation compiler treats and reports loops. Q2.4, from `research/06-engineering-languages.md`)*
63. How does a mesh, timestep or solver-tolerance study run automatically as a node, and when is it mandatory? *(09.P4; adds a convergence check so unconverged numbers are refused. Q6.23, from `research/10-philosophy.md`)*
64. What should a physical port's default be: the published nominal value, or "unconnected"? *(09.P1; decides whether unwired inputs run silently on defaults, as D10 did. Q10.4, from `research/14-sound-film-magic.md`)*
65. How do interface records relate to the effort-and-flow ports of spec 09: one record, or two linked? *(09.P6; fixes the shared data model before I2 and P1 diverge. Q14.27, from `research/18-self-describing-interfaces.md`)*
66. When two cables meet in one input, is summing always right (forces, tolerances, ownership)? *(09.P1; sets junction semantics per kind; summing tolerances or ownership would be wrong. Q10.3, from `research/14-sound-film-magic.md`)*
67. Which conservation laws must every physics board report, and what drift is acceptable? *(09.P5; sets the conservation watch's quantities and thresholds. Q13.35, from `research/17-unseen-sciences.md`)*
68. Do we ever need dynamic state selection (the pendulum crossing 90°), which StateSelection.jl leaves out? *(09.P2; p2's Cartesian pendulum check may fail without it. Q15.5, from `research/19-physics-core-browser.md`)*
69. How do we couple an acausal subsystem with Jolt's rigid bodies: co-simulation at Jolt's step, or the joint in our own solver? *(09.P6; sets the architecture joining the physics core to live physics. Q15.26, from `research/19-physics-core-browser.md`)*
70. Rosenbrock-W in TypeScript first, or diffsol in wasm first, and what does each cost in bundle size and verification? *(09.P2; chooses the first solver and its verification burden. Q15.17, from `research/19-physics-core-browser.md`)*
71. What energy residual threshold separates round-off from a bug, per solver and tolerance? *(09.P5; without it the conservation watch either cries wolf or misses leaks. Q15.50, from `research/19-physics-core-browser.md`)*
72. How do folded groups expose their inner ports' kinds, and can folding hide a bridge? *(09.P3; a hidden bridge would let a fold pass while converting silently. Q20.54, from `research/24-quantity-kinds.md`)*
73. How do we prove our structural core right: against StateSelection.jl's tests, Rumoca's output, or OpenModelica on shared models? *(09.P2; sets P2's reference oracle and test suite. Q15.8, from `research/19-physics-core-browser.md`)*
74. How do we choose dummy derivatives so the choice stays stable when the user edits one node? *(09.P2; prevents state choice flipping and results jumping after small edits. Q15.4, from `research/19-physics-core-browser.md`)*
75. At what board size does the interpreted residual become too slow for a 90 Hz VR frame? *(09.P2; decides whether code generation or wasm is needed early. Q15.59, from `research/19-physics-core-browser.md`)*
76. Are thermal ports effort times flow equals power (temperature and entropy flow), or the usual temperature and heat flow? *(09.P1; fixes the thermal port definition before blocks are written against it. Q15.47, from `research/19-physics-core-browser.md`)*

---

## Spec 10: trust in numbers: uncertainty, status, sensitivity, and what cannot be simulated

77. Does the engine carry covariance when one input reaches an output by two paths? *(10.T2; without it uncertainty bands are silently wrong. Q4.32, from `research/08-mathematics.md`)*
78. Where does the engine add up a step that cannot be represented exactly over time (the Patriot pattern)? *(10.T10; finds clock drift the floating-point lint must catch. Q4.38, from `research/08-mathematics.md`)*
79. Which constants are correlated in CODATA, and does any output combine two correlated ones? *(10.T1; shows whether T1's correlations change any result. Q4.22, from `research/08-mathematics.md`)*
80. What precision do real products' published figures have, and do we show more digits than the source? *(10.T3; guards against false precision on displayed values. Q4.30, from `research/08-mathematics.md`)*
81. When a claim is marked an assumption, may it drive geometry? *(10.T3; sets a rule on what claim statuses may feed cuts and shapes. Q7.65, from `research/11-prompts-reviewers-drawing.md`)*
82. How is toughness kept from being confused with fracture toughness in the library? *(10.T11; adds quantity kinds that block a same-unit-looking wrong wire. Q8.46, from `research/12-nature-collective.md`)*
83. Which spreadsheet failures (units, truncation, untested formulas) is Nexus structurally immune to, and which not? *(10.T11; turns known failure classes into gate tests; D1-D3 show gaps. Q6.94, from `research/10-philosophy.md`)*
84. How many runs make an ensemble honest, and how is the spread explained to a non-statistician? *(10.T6; sets default ensemble size and how spread is displayed. Q6.66, from `research/10-philosophy.md`)*
85. How does a user's real-world measurement flow back into a node's validation record without tuning it into a fake fit? *(10.T7; defines assimilation's limits under C9 and C21. Q6.18, from `research/10-philosophy.md`)*
86. How many independent measurements before a claim enters the library? *(10.T21; sets the entry rule for sourced values and their status. Q8.54, from `research/12-nature-collective.md`)*
87. Does any existing board wire an rpm output into a Hz input today, and would its result move by 2π if fixed? *(10.T11; finds boards whose numbers silently change when the unit fault is fixed. Q14.4, from `research/18-self-describing-interfaces.md`)*
88. Which self-descriptions does Nexus trust without validation today, and which should it stop trusting? *(10.T3; lists silent trust holes to close with claim status. Q14.68, from `research/18-self-describing-interfaces.md`)*
89. Do laws in `lawgraph.ts` declare specific quantities (wall thickness, not length) for their inputs? *(10.T11; measures how much quantity tagging T16 must add to laws. Q14.13, from `research/18-self-describing-interfaces.md`)*
90. How many units in `units.ts` share a dimension but differ in kind, and is the list complete? *(10.T11; defines the full set of refusal tests T11 needs. Q14.14, from `research/18-self-describing-interfaces.md`)*
91. How should a unitless port be declared: `1`, `-`, a named ratio, or a count? *(10.T11; t11 refuses ports without unit or kind; this sets the declaration. Q14.7, from `research/18-self-describing-interfaces.md`)*
92. Should width + height give length (mp-units), or should Nexus refuse adding different specific quantities? *(10.T11; sets the addition rule in `fits` for specific quantities. Q14.8, from `research/18-self-describing-interfaces.md`)*
93. Should a defect in one part send a recall-style warning to every board using it? *(10.T12; extends retraction propagation from sources to parts. Q11.27, from `research/16-safety-failures.md`)*
94. Is rotational-frequency to frequency an exact bridge (a turn is a cycle) or a refusal (Hz only for periodic phenomena)? *(10.T11; decides which branch of T11's '60 rpm to Hz gives 1 or refused' test. Q20.2, from `research/24-quantity-kinds.md`)*
95. How many existing block ports would change wiring behaviour under kind checks, and do any saved boards rely on a now-refused wire? *(10.T11; sizes the migration and tests decision 0009's cheap-inference assumption. Q20.47, from `research/24-quantity-kinds.md`)*
96. Should old boards with now-refused wires load with the wire marked broken, or with an inserted bridge node? *(10.T11; sets load behaviour so old boards neither break silently nor convert silently. Q20.48, from `research/24-quantity-kinds.md`)*
97. How do we get Jacobians: forward-mode automatic differentiation over our expressions (spec 10), or finite differences? *(10.T8; orders T8 before or after the solver; affects stiff-solve accuracy. Q15.21, from `research/19-physics-core-browser.md`)*
98. Which ports today mean a temperature point and which a difference, and can a port's name decide it reliably? *(10.T11; determines whether quantityOf can infer point/difference or needs a person. Q20.20, from `research/24-quantity-kinds.md`)*
99. Is gauge pressure a different kind from absolute pressure, or the same kind with a different origin (an affine pair like °C and K)? *(10.T11; guards a silent one-atmosphere error on pressure wires. Q20.7, from `research/24-quantity-kinds.md`)*
100. Which blocks today accept or emit decibels, and with what reference? *(10.T11; scopes the D2 fix and which blocks need references. Q20.38, from `research/24-quantity-kinds.md`)*
101. How many DOIs are in data/references.ts today, and has any been retracted or corrected? *(10.T12; gives T12 its first real run and may flag live data. Q19.21, from `research/23-truth-at-scale.md`)*
102. What fraction of today's stored values are already 'typical' or AI-estimated, measured rather than guessed? *(10.T13; baselines the AI share and shows how much T13 must relabel. Q19.11, from `research/23-truth-at-scale.md`)*
103. How is a cycle of AI output supported only by AI outputs detected when a person copies an AI value by hand? *(10.T13; closes the silent laundering path around C27. Q19.14, from `research/23-truth-at-scale.md`)*
104. What tolerance turns two disagreeing readings into a stop, and is it the readings' own stated uncertainty? *(10.T14; sets T14's andon threshold, avoiding alarm fatigue or misses. Q16.59, from `research/20-organisations-accidents.md`)*
105. How does the calibration ledger stay honest if the AI also writes the resolution, such as picking the value it is checked against? *(10.T15; guards T15's Brier score against self-grading. Q19.60, from `research/23-truth-at-scale.md`)*
106. Should ratio remain a general dimensionless kind anything dimensionless can feed, or be removed so every dimensionless port must say what it is? *(10.T11; a catch-all ratio kind reopens the hole kinds are meant to close. Q20.14, from `research/24-quantity-kinds.md`)*
107. Should a sum block refuse points (two temperatures) and levels (two dB values) by itself, from the kinds? *(10.T11; adds a check against adding absolute temperatures or decibels. Q20.53, from `research/24-quantity-kinds.md`)*
108. Can the parser check dimensions before running, rejecting a wire from metres to newtons at parse time? *(10.T11; catches wrong-unit wires before any run, guarding D1-type faults. Q23.26, from `research/27-notations.md`)*
109. What fraction of the current agent's errors would a sound checker have caught that the second-model judge missed? *(10.T18; measures whether checkers should replace the second-model judge. Q22.12, from `research/26-proofs-and-programs.md`)*
110. Which Nexus claims today already have a natural witness (a residual, a model, a placement) that a small checker could verify? *(10.T23; orders which certificate kinds are built first. Q22.1, from `research/26-proofs-and-programs.md`)*
111. How often does the current agent silently drop a requirement the user stated? *(10.T19; measures the silent failure T19 must catch; sets its priority. Q22.21, from `research/26-proofs-and-programs.md`)*
112. Does Z3 in WASM produce proofs Nexus could check, or only results? *(10.T23; decides whether SMT results can be certificates or stay judged. Q22.52, from `research/26-proofs-and-programs.md`)*
113. What base rates exist for Nexus's own checks, and how are they measured (seeded failing boards)? *(10.T22; t22 needs measured sensitivity and specificity for every alarm. Q24.57, from `research/28-body-medicine.md`)*
114. What evidence start levels apply to engineering sources (standard test, paper, handbook, vendor datasheet, forum, AI)? *(10.T21; sets the grading table T21 needs to start. Q24.49, from `research/28-body-medicine.md`)*
115. How should the kernel treat logarithmic units (dB) and offset units (°C) in claims? *(10.T11; fixes D2/D3 consistently across units and the kernel. Q27.21, from `research/31-trusted-kernel.md`)*
116. Should dimension exponents be integers only, or rationals (for √Hz in noise densities)? *(10.T11; sets the quantity type representation before kinds are built. Q27.19, from `research/31-trusted-kernel.md`)*
117. How do we stop the critic's "nothing found" from being shown as if it were a certificate? *(10.T24; guards against false safe badges from critics (C29). Q27.46, from `research/31-trusted-kernel.md`)*
118. How can an import-boundary check also stop dynamic `import()` and `globalThis` tampering by code in the page? *(10.T23; without it the kernel's isolation check is bypassable. Q27.3, from `research/31-trusted-kernel.md`)*
119. Is the kernel's own CNF encoder a weak point (an encoding bug certifies the wrong formula), and how is it tested? *(10.T23; an encoder bug certifies wrong claims silently. Q27.33, from `research/31-trusted-kernel.md`)*
120. What tolerance is right in a `witness` check of a mate residual: absolute or relative? *(10.T23; sets the witness check's pass threshold. Q27.16, from `research/31-trusted-kernel.md`)*
121. Which three certificate kinds would cover most of what users ask Nexus to check in the first year? *(10.T23; orders kernel work; trims scope to what is used. Q27.54, from `research/31-trusted-kernel.md`)*
122. Can Nexus reuse an existing verified checker (cake_lpr in WASM) rather than write `lrat.ts`? *(10.T23; could replace a hand-written trusted module with a verified one. Q27.59, from `research/31-trusted-kernel.md`)*

---

## Spec 11: the living world: only the observed computed, replay, affordances, agents that coordinate, an umpire

123. When a library part is updated (a corrected mass), which boards rerun, which stay frozen, and how does a user see what changed because of it? *(11.LW13; fixes the rule linking library law to reproducibility and reruns. Q2.30, from `research/06-engineering-languages.md`)*
124. Where exactly does float32 break in our 3D view, measured at 1, 10 and 100 km from the origin? *(11.LW8; gives the measured threshold for anchor rebasing. Q4.12, from `research/08-mathematics.md`)*
125. How large is a state hash, and how often are hashes compared to catch a desync early? *(11.LW2; sets the desync detector's design and cost. Q5.31, from `research/09-games-vast-contests.md`)*
126. Can the order wires were drawn ever change a result today, and how would we test it never does? *(11.LW15; adds an order-independence check to the cached-equals-fresh gate. Q10.7, from `research/14-sound-film-magic.md`)*
127. Is the prebuilt jolt-physics 1.1.0 wasm-compat build bit-identical in Chrome, Firefox and Safari on our scenes? *(11.LW9; decides whether we must build our own deterministic Jolt. Q15.29, from `research/19-physics-core-browser.md`)*
128. Where else in our code do transcendentals feed a simulation (replicad geometry, mates, sources)? *(11.LW9; sets the scope of the deterministic maths module. Q15.33, from `research/19-physics-core-browser.md`)*
129. Does OpenCascade's wasm build give bit-identical geometry across engines, and does physics depend on it? *(11.LW9; could break LW9's equal-hash check from outside Jolt. Q15.34, from `research/19-physics-core-browser.md`)*
130. Which fields of today's outputs are volatile (ids, timestamps, run counters) and would defeat cutoff? *(11.LW12; unstripped volatile fields silently make early cutoff never fire. Q21.14, from `research/25-incremental-computation.md`)*
131. How is a B-rep from replicad/OpenCascade canonicalised for hashing (BREP text, STEP, a mesh, a feature tree)? *(11.LW15; defines the geometry digest the task leaves unspecified. Q21.10, from `research/25-incremental-computation.md`)*
132. Is OpenCascade's output deterministic across runs and browsers for the same input, measured? *(11.LW15; if not, cached-equals-fresh check and replay fail on geometry. Q21.11, from `research/25-incremental-computation.md`)*
133. How do worker-pool results stay deterministic when they finish in different orders? *(11.LW2; guards replay and desync detection against order-dependent results. Q21.48, from `research/25-incremental-computation.md`)*
134. Should outputs carry evidence (sources, ranks) inside the hashed value, or beside it? *(11.LW12; decides whether evidence changes propagate or get cut off silently. Q21.13, from `research/25-incremental-computation.md`)*
135. Which hash function: the existing `hash` in `assembly.ts`, or a cryptographic one for the shared cache? *(11.LW12; hash width sets collision risk of wrong cached results. Q21.15, from `research/25-incremental-computation.md`)*
136. What fraction of reruns after a one-slider edit produce an output equal to the previous one? *(11.LW12; baseline that LW12's counted check is measured against. Q21.4, from `research/25-incremental-computation.md`)*
137. What is the stable identity of a spawner row: a row id from the table, a hash of its contents, or position? *(11.LW12; wrong identity reuses cached results for the wrong item. Q21.30, from `research/25-incremental-computation.md`)*
138. When the agent reads a stale value, does it wait for stabilise or read and flag? *(11.LW13; prevents the agent acting on stale numbers under pull evaluation. Q21.19, from `research/25-incremental-computation.md`)*
139. How does replay treat agent outputs: recorded values, or re-asked with a frozen prompt? *(11.LW2; determines run record contents and whether replay is reproducible. Q21.46, from `research/25-incremental-computation.md`)*
140. Are block outputs ever mutated after they are returned (which would make a `WeakMap` digest cache wrong)? *(11.LW15; mutation silently corrupts cached digests; decides whether cache is safe. Q28.4, from `research/32-engines-to-adopt.md`)*
141. How many blocks in the library read `Date`, `Math.random`, `fetch` or the agent while defaulting to pure? *(11.LW12; sizes D7 fix; wrongly pure blocks give stale cutoff results. Q28.16, from `research/32-engines-to-adopt.md`)*
142. Which block outputs today carry a `Map`, a `Set`, a function or a class instance, and so would get a never-equal token? *(11.LW15; sets digest scope; decides where cutoff silently never fires. Q28.1, from `research/32-engines-to-adopt.md`)*
143. Which `_`-prefixed output keys (`_evidence`, `_balance`) must be part of the digest for evidence and balance to stay right? *(11.LW12; omitting them makes cutoff keep wrong evidence silently. Q28.8, from `research/32-engines-to-adopt.md`)*
144. Is per-port cutoff ever wrong when a block's outputs are correlated (two ports from one object)? *(11.LW12; decides per-port versus per-node cutoff granularity. Q28.10, from `research/32-engines-to-adopt.md`)*
145. How should `NaN` digest, given `JSON.stringify(NaN)` is `null`? *(11.LW15; prevents NaN and null colliding in the structural digest. Q28.7, from `research/32-engines-to-adopt.md`)*
146. Should floats be digested bit-exact or rounded to a declared tolerance, and who declares it, the port or the block? *(11.LW15; sets digest rule and where tolerance is declared. Q28.5, from `research/32-engines-to-adopt.md`)*
147. How does `spreadOf` (re-running a block at ±u) interact with cutoff: are its extra calls memoised? *(11.LW12; uncertainty pass could bypass or poison the memo. Q28.36, from `research/32-engines-to-adopt.md`)*
148. Can a block's code version be derived automatically from its `run` source text hash instead of a hand-raised `version`? *(11.LW12; removes stale-cache risk from forgotten version bumps. Q28.18, from `research/32-engines-to-adopt.md`)*
149. Does a group's `boardKey` change when only a node's x, y position moves, and should it? *(11.LW12; layout moves must not invalidate caches or keys. Q28.15, from `research/32-engines-to-adopt.md`)*
150. Does leaving nodes dirty across runs break `mapsOver`'s `mapsTouched` bookkeeping? *(11.LW13; pull model could silently break list mapping state. Q28.28, from `research/32-engines-to-adopt.md`)*
151. Can the step-1 cached-equals-fresh check be a property test (fast-check) over random edits to random settings? *(11.LW15; shapes the gate check guarding cutoff correctness. Q28.55, from `research/32-engines-to-adopt.md`)*
152. How is measured incrementality stored round to round, so a regression in rerun counts fails like a wrong number? *(11.LW12; adds a regression check for rerun counts. Q28.56, from `research/32-engines-to-adopt.md`)*

---

## Spec 12: cost and carbon: what a thing costs and emits, with where and when

153. Can the Boothroyd–Dewhurst handling and insertion tables be used, given their copyright? *(12.CC3; decides whether dfa.check timing needs an open substitute. Q14.54, from `research/18-self-describing-interfaces.md`)*
154. Which carbon source is the default, ICE or something broader, and does its licence allow redistribution? *(12.CC2; CC2 depends on ICE factors being redistributable. Q25.31, from `research/29-cost-markets.md`)*
155. Can ICE's per-material factors be keyed to the materials in `matter.ts` without loss (alloys, grades)? *(12.CC2; lossy mapping gives silently wrong carbon rollups. Q25.32, from `research/29-cost-markets.md`)*
156. Where do Ashby's process parameters come from in an open form, if Granta's tables are licensed? *(12.CC3; without open sources cost.process cannot be sourced. Q25.11, from `research/29-cost-markets.md`)*

---

## For the user to decide

157. When a manufacturer's published figure is itself wrong, what does Nexus do, given C9 holds it fixed? *(user; sets how C9 handles a known-bad source without tuning it away. Q6.24, from `research/10-philosophy.md`)*
158. On our tasks, does strict JSON lower accuracy compared with reasoning first, then extracting? *(user; measured evidence for U15, notation versus JSON plans. Q7.21, from `research/11-prompts-reviewers-drawing.md`)*
159. Which classes of board are refused outright, which need verification of the person, and which are open? *(user; a refusal policy the AI and sharing must enforce. Q6.107, from `research/10-philosophy.md`)*
160. Should the AI be allowed to insert a context (conversion) node without the person's approval? *(user; decides whether AI conversions need approval under C20. Q14.12, from `research/18-self-describing-interfaces.md`)*
161. What is our strength order when the AI, the person and a solver disagree? *(user; sets who overrides whom beyond C29's solver-over-AI. Q10.29, from `research/14-sound-film-magic.md`)*
162. When should Nexus refuse a life-safety question altogether? *(user; sets a refusal boundary above rigour classes (T20). Q13.32, from `research/17-unseen-sciences.md`)*
163. Are tool-use inputs required to be JSON objects, so NBN must travel inside one string field? *(U15; constrains notation design and its token savings for U15. Q23.45, from `research/27-notations.md`)*
164. Does the API offer strict schemas or grammar constraints for tool inputs that could make NBN always parse? *(U15; could remove parse failures, changing the U15 trade. Q23.46, from `research/27-notations.md`)*
165. Should Nexus refuse to describe a board as fit for medical, life-safety or child use without a risk file at a given level? *(user; a rule on what the AI may claim for high-stakes uses. Q24.38, from `research/28-body-medicine.md`)*
166. With 20 repeats per cell instead of 2, does NBN's validity differ from JSON's at all? *(U15; gives U15 a statistically real validity comparison. Q26.11, from `research/30-token-experiment.md`)*
167. What share of an agent run's tokens is writing plans at all, against reading tool results (`runLines`) and the guide? *(U15; shows whether notation savings matter to total cost for U15. Q26.8, from `research/30-token-experiment.md`)*
168. How often does JSON's "object as a string" failure occur over many runs, and does the SDK's strict tool mode stop it? *(U15; a JSON fix may remove NBN's validity advantage for U15. Q26.15, from `research/30-token-experiment.md`)*
169. Where should the grammar live so that FOR-AI.md, the parser and the round-trip test cannot drift apart? *(U15; prevents another D10-style guide/engine drift. Q26.22, from `research/30-token-experiment.md`)*
170. Is the token result the same in a long conversation, where the written plan is re-read as input on every turn? *(U15; real multi-turn cost may change U15's answer. Q26.9, from `research/30-token-experiment.md`)*

---

## The direction of the whole

171. Which behaviours exist only because some node is fake, not simulated, and what breaks if we remove them? *(direction; finds mocks the no-mocks rule forbids. Q5.97, from `research/09-games-vast-contests.md`)*
