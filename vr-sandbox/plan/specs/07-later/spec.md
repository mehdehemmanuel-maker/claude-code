# Spec 07, further: what waits until phases 0 to 6 hold

Each item here becomes a spec of its own when it starts. Listed so it is not forgotten.

| Item | What | Taken from | Waits on |
| --- | --- | --- | --- |
| Evolve | a board as the genome; a model proposes changes; our checks score them; a diverse archive of the best kept; refuses to run where no real check exists | DeepMind's AlphaEvolve (`research/03-agents-structure.md`) | 00 (evaluation sets), 01 (assertions) |
| Lattices and topology optimisation | implicit bodies graded by CalculiX stress; TPMS, beam and Voronoi lattices; meshed for 3MF and STL, labelled approximate, with no exact STEP | implicit.build, nTop (`research/01-ai-cad-tools.md`, `02-topology-mating.md`) | 01 (interfaces as fixed regions) |
| Schemas of named slots | a kind of thing as named sub-part slots ("a car: a body and four wheels"); behaviour bound to slots and fitted to measured sizes | Roblox Cube's schemas and retargeting | 01 |
| Composition as OpenUSD has it | references stored once, variants, inherits, payloads loaded lazily, layers over sourced data without editing it; USD import and export | AOUSD Core Specification 1.0 | 01 |
| The AI's bank of attempts | each attempt and its score kept and fed back as examples | DeepMind's SIMA 2 | 00 (evaluation sets) |
| A plausibility gate by picture | a model that looks at a picture or a clip and flags what is implausible, beside the checks by number | NVIDIA's Cosmos Reason | 00 |
| A shared library and a friend in the world | saved blocks and boards in a database; two people in one world; the controls shared by name | the user's item 3, skipped for now | 03 |
| Feature recognition on imported STEP | faces recognised as holes, bosses, seats (UV-Net, MIT), given interfaces, confirmed by rules | Autodesk's UV-Net | 01 |
| The mate datasets as an evaluation set | AutoMate (Onshape mates) and Fusion 360 Gallery joints scored against our joint finder | `research/02-topology-mating.md` | 01, licences (`QUESTIONS.md` R4) |
