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

## The ideas bank (from research rounds 2 and 3, accepted 2026-10-31, not yet in a spec)

Each becomes a task in a spec when its phase starts. The research file names the sources.

| Idea | What it becomes | From |
| --- | --- | --- |
| Inverse design as a pattern | nodes that take a requirement and give a part, with a proof or a score (TreeMaker, TERMES, Physarum, Mattheck) | 12, 13 |
| A function on every part and strategy | "how does X attach?" returns parts and nature's strategies side by side; strategies with mechanism, regime, evidence and claim status | 12 |
| Physarum network node | networks (roads, grids, harnesses, cooling) scored by cost, efficiency and fault tolerance against the minimum spanning tree | 12 |
| Growth optimisers | CAO (shape), SKO (topology), tensile-triangle fillets the AI can apply without FEM; bone-like remodelling with a lazy zone | 12 |
| Self-healing as a repair-loop node | damage, release, cure; efficiency; trigger | 12 |
| An assembly compiler | a blueprint to a directed map and local rules, proved to finish; drives explode and assemble animations | 12 |
| Swarm judge | blind scouts, recruitment by quality, stop signals, commit at a quorum | 12 |
| Crowds and swarms | neighbours by count (6–7), Couzin's zones, informed minorities, hysteresis recorded | 12 |
| Fold patterns, kirigami, deployables | crease patterns with local checks, rigid folding, stowed and deployed shapes with accuracy | 13 |
| Knitout export and its layering | graph → neutral process format → vendor formats | 13 |
| Rules of thumb as cited rule nodes | Roriczer; arch thickness; a thrust-line node (Heyman's safe theorem) | 13 |
| Materials carry process and source | hot-mixed concrete, Damascus ore: mechanisms with their triggers | 13 |
| The environment as a neighbour | a site's gradient, water table or wind as interface demands | 13 |
| One universal signal, normalled inputs, explicit order | ports with ranges and adapters; defaults shown; triggering against storing inputs | 14 |
| Macros and a presentation view | folded nodes with safe knobs; the same graph shown as controls only (a JARVIS panel) | 14 |
| Hot swap and rational time | redefine a running node at the next cycle; exact cycle time | 14 |
| Physical sound from contacts | modal synthesis from our materials' data, labelled an approximation | 14 |
| Layers of opinion | the AI's, the person's and the solver's layers, a strength order, an inspector that says why a value wins | 14 |
| Beacons, wait shaping, cue stacks | a landmark for the next goal; measured waits with partial results; numbered cues for tours and tutorials | 14 |
| Diagnose from the parts | bearing defect frequencies from geometry; spectra attributed to parts; ISO 20816 zones and trend | 17 |
| Acceptance nodes | simulation → metric → criterion with margin, who set it, source (ASET ≥ RSET) | 17 |
| Validation guides and a public validation set | generated from tests, run nightly (as NIST's FDS does) | 17 |
| Design scenarios as library items | design fires, storms, loads, crowds: picked, not invented | 17 |
| Symmetry detector | compress (asymmetric unit and operators), check (missed symmetry), speed up (solve a sector) | 17 |
| Teach by puzzle | small boards of one idea each, no text, then combinations (The Witness) | 17 |
| Reality is the judge | community results count only after an outside check; "this does not fit" on every view | 15 |
| Provenance and credit | authors, forks, evidence, credit written by people; remix with lineage | 15 |
| Commons health | newcomers' revert rate as an alarm; checkers with capped false positives; Ostrom's principles for shared libraries | 15 |
| A grid view of any board | rows of parts, columns of properties, live, with a lint | 15 |
| Local-first sharing | the library complete offline; sync by per-property last-writer-wins and a sequence CRDT; open export | 15 |
| The AI gives back | it cites parts and their authors and invites answers back into the library | 15 |
| Describe, caption, translate | alt text, a spatial sound and a haptic signature per part; captions with speaker and direction; a glossary for translation | 15 |
