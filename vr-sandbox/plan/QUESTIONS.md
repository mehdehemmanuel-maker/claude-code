# Questions

Two kinds: what only the user can decide (each changes what gets built), and what the research could not answer yet
(to keep asking). An answer is written beside its question with its date, and a decision record made where it decides
something.

## For the user

| Id | Question | Why it matters | Proposed | Answer |
| --- | --- | --- | --- | --- |
| U1 | Where may the app and its AI relay be hosted, and what is the most it may spend on the AI in a day? | Spec 03 cannot start without it; the cap protects the cost | Supabase (already connected) for the relay; a static host of the user's for the pages | — |
| U2 | Which Motorola work did you mean? | The research found only the Lenovo and Motorola Qira assistant, nothing 3D | — | — |
| U3 | Keep the name Moosky? moosky.ai is an AI video and voice platform; MOOSKY is registered in the US for hair accessories (reg. 6333775) | Publishing under a name in use invites a dispute (not legal advice) | a clearance search, or a variant | **2026-10-31: the phone app is Nexus.** (A clearance search for "Nexus" is still worth doing before publishing: it is a common name.) |
| U4 | The phone app: a web app only, or a store app later too? | Store apps need a wrapper and review | a web app first | — |
| U5 | How large may one task be before it needs a decision record, and who approves those: you, or the evaluator? | The change-budget hook needs the number | its owner, its tests and docs; the evaluator approves, you see each record | **2026-10-31: the budget is for the builder (the AI building the app), not the AI in the app.** In the app a task may be as large as it needs, so long as each pass is aware of its context and of hallucination before it pipes forward to another pass, or branches. Decision `decisions/0008-task-size.md`. |
| U6 | Which five to ten real products should every change be measured against? | The products evaluation set | the Monte Carlo SS, the Corolla, a NEMA 17 motor, a 6205 bearing, an EN IPE 300 beam, an M8 bolt | **2026-10-31: instead, one new, simple test that captures everything, thought out of the box.** Proposed: "The lamp on the shelf" (`specs/00-structure/the-one-test.md`). |
| U7 | Who owns a bolt circle two parts share: the flange, the cover, or the joint between them? | Spec 01 §2.6 | the joint | **2026-10-31: unsure, and fine to proceed** with the joint; said again in plainer words when spec 01 reaches it. |
| U8 | Will you draw 2D profiles by hand (which needs a sketch solver), or are profiles always made from sizes? | Whether to bring in a sketch solver (FreeCAD's planegcs) | from sizes for now | **2026-10-31: profiles from a generated picture.** An image model, told exactly how the picture must look, draws the part's outline in black (nothing else black), with its dimensions; a parser with no AI copies the black lines into the 3D space. Spec `specs/08-sketch-to-3d/spec.md`. |
| U9 | Should the evaluator be a different model from the builder (more cost, fewer lenient passes)? | Spec 00, S7 | yes, for tasks that change geometry | **2026-10-31: different kinds of reviewer, tested with different prompts**; made a subject of the prompt-engineering research (`research/11-prompts-reviewers-drawing.md`). |
| U10 | Start phase 0 now? | Nothing is built until you say | yes | **2026-10-31: still in research mode**: a wider research wave first (life, engineering, every language and framework, philosophy, astronomy, contests, the Game of Life, the Mandelbrot set, π, the universal equations, games and anything "irrelevant" that is genius), and the book of questions (`BOOK-OF-QUESTIONS.md`). |

## Still open in the research

| Id | Question | How it will be answered |
| --- | --- | --- |
| R1 | How fast is a small embedding model on a mid-range phone and on a Quest, and is WebGPU there? | measured on the devices (spec 03, W5) |
| R2 | Do MiniSearch or uFuzzy hold under 3 ms on our entries on the weakest device? | measured (spec 02, N4) |
| R3 | Is Jolt deterministic across runs in the browser, so rewind replays exactly? (It steps at a fixed 1/240 s, checked.) | a test: the same run twice, poses compared (spec 04, P5) |
| R4 | Do the assembly datasets' licences (AutoMate on Zenodo; Fusion 360 Gallery) allow use as an evaluation set? | read their licence files |
| R5 | Under a no-derivatives licence (IFC, Uniclass), is a separate file mapping their codes to our nodes allowed? | the licence texts; legal advice if unclear |
| R6 | Which open source gives design loads (ASCE 7, Eurocode 1) as data? | searched again; until found, loads are inputs (spec 05, V-R4) |
| R7 | The exact rows of EN 1993-1-8 table 3.3, ISO 2306, DIN 974-1, ISO 15065, and VDI 2230's engagement, from sources that may be quoted | before spec 01, I3; never from memory |
| R8 | Who makes implicit.build, and is a language model planned there? (Version 0.0.0, no team named.) | watch |
| R9 | Does picture-based checking add anything with 2026's models beyond numbers, for assemblies? | the AI's evaluation set with and without pictures (decision 0003) |
| R10 | How does Zoo keep its face tags stable when topology changes? | not public; our own face queries are tested instead (spec 01, I9) |
| R11 | Where do our AI's steps and tokens go, and what is its failure rate, today? | the baseline (spec 00, S5) |
| R12 | Does replicad's OpenCascade history (`Generated`, `Modified`) survive our booleans well enough to name faces by what made them? | a probe before spec 01, I9 |
| R13 | What edge distance and wall rules hold for materials other than structural steel (aluminium, plastics, wood)? | sources per material, before spec 01, I7; labelled typical where none |
