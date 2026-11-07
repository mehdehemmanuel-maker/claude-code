# Research (round 3, far branch): overlooked genius in nature

One research pass, 2026-10-31. Marks: [checked] confirmed in that pass with its source; [memory] from training; [inference] the agent's reasoning.

## (A) Findings, in short
- **AskNature** [checked]: a taxonomy of what nature does (8 groups, 30 sub-groups, 160+ functions: "get, store or distribute resources → capture, absorb or filter → liquids"); 1,700+ strategies; questions in plain words ("how does nature stay dry?"). No public API or bulk data found; assigning functions is slow specialist work.
- **The myths** [checked]: the Eastgate Centre cools by thermal mass and night flushing, and the termite story behind it does not hold: Turner and Soar (2008) found mound nests track soil temperature, not regulated by a chimney; King, Ocko and Mahadevan (PNAS 2015) found daily warming of the flutes drives a flow that reverses at night and flushes CO₂ (in a different genus). AskNature now says research "has altered our understanding". [inference] **"Inspired by" is not "works like"**: every claim needs a status and a scope.
- **Cases** [checked]: the kingfisher-nosed Shinkansen (10 % faster on 15 % less electricity, per secondary sources only); gecko setae (van der Waals; one seta gives over ten times what whole-animal estimates predicted; attachment controlled by the pulling angle); shark skin (Oeffner and Lauder 2012: the Fastskin fabric gave no consistent gain; riblets +7.2 %; flexible shark skin +12.3 %, rigid plates nothing: **copying the shape without the mechanism fails**); the lotus effect (1997); whale-fin tubercles delay stall by ~40 % on a model (2004); Velcro (1941, patented 1955).
- **Physarum and Tokyo** [checked] (Tero et al., Science 2010): networks scored by cost, mean distance and fault tolerance against the minimum spanning tree; the rail network ~1.8 × MST, Physarum 1.75 ± 0.30; terrain imposed by light; the model (tubes thicken with flux) converges to shortest paths (Bonifaci 2012). **Physarum keeps memory in its tube diameters** (PNAS 2021).
- **Ants** [checked]: Ant System (1996), Ant Colony System, Max–Min; [memory] stigmergy (Grassé 1959). **Bees** [checked] (Seeley et al., Science 2012): scouts head-butt dancers for rival sites (stop signals): cross-inhibition, as in neural decision models; [memory] a quorum of ~20–30 at the site. **Starlings** [checked] (Ballerini 2008): each bird follows 6–7 nearest neighbours by count, not by distance. **Fish** [checked] (Couzin 2002): zones of repulsion, orientation and attraction; sharp collective transitions and **collective memory** (hysteresis); a few informed individuals lead (2005), uninformed ones keep it democratic (2011).
- **TERMES** [checked] (Werfel, Petersen, Nagpal, Science 2014): a compiler turns a blueprint into a directed map; simple climbing robots, with local rules and only what is already built, are guaranteed to finish.
- **The wood-wide web** [checked] (Karst et al., Nat. Ecol. Evol. 2023): citation bias and over-interpretation behind the claims that fungal networks are widespread, help trees, and that mother trees feed their kin; the evidence rests on very few species.
- **Octopus** [checked]: about two-thirds of its neurons in the arms (secondary); each arm's nerve cord segmented into a map of its suckers (Nat. Commun. 2025).
- **Mattheck** [checked]: the axiom of uniform stress; CAO (shape: overloaded surface swells, stress fed as a fake temperature), SKO (topology: stiffness in proportion to stress, soft parts removed); tensile triangles draw an optimal fillet by hand. **Bone** [checked] (Huiskes, Nature 2000): cells sense strain locally; architecture emerges and re-aligns; ~25 % of trabecular bone renewed a year; Frost's mechanostat with a lazy zone. **Spider silk** [checked]: Darwin's bark spider ~350 MJ/m³ against Kevlar's ~33. **Nacre** [checked]: the famous "3000×" is work of fracture; fracture toughness is only ~30× (a unit-kind confusion found in the wild). **Self-healing polymers** [checked] (White et al., Nature 2001): capsules recover up to 75 % of toughness; the wall-thickness trade-off. **Morphological computation** [checked]: soft bodies as computers (a silicone arm as a reservoir, 2015).

## (B) What Nexus should take
1. **A function on every part and strategy** (attach, move fluids, sense, self-repair…): "how does X attach?" returns parts and natural strategies side by side; the bolt and the gecko both answer "attach".
2. **An attachment-interface library** (hook and loop, contact splitting, suction, threaded clamp, adhesive, snap fit), each with its counterpart geometry (a gecko pad demands a flatness).
3. **A strategy record**: organism and species, mechanism (not form), regime (scale, dimensionless numbers), evidence grade, sourced numbers, and **claim status: measured, inspired only, disputed, myth**.
4. **"Mechanism, not form"**, with a regime gate before a transfer is accepted.
5. **A quantity is its kind, not only its unit**: toughness is not fracture toughness (the nacre error).
6. **A Physarum network node** (terminals, a terrain cost, parameters) scoring any network by cost, efficiency and fault tolerance against the minimum spanning tree: roads, grids, harnesses, cooling channels.
7. **Memory in the edges**: desire paths that widen with use; the agent's map as its memory.
8. **A stigmergy board for AI agents**: coordination through marks in the shared scene, with evaporation as the forgetting rule.
9. **An assembly compiler** (TERMES): a blueprint to a directed map and local rules, proved to finish; the same order drives explode and assemble animations.
10. **A swarm judge** (Seeley): blind scouts, recruitment by quality, stop signals, commit at a quorum; the quorum trades speed for accuracy.
11. **A crowd and swarm simulator**: neighbours by count (6–7) or radius; Couzin's zones; hysteresis recorded; informed minorities.
12. **The octopus pattern**: each subassembly owns a local reflex; the centre sends goals; in the AI, a sub-agent per limb.
13. **The body as a reservoir**: before adding control, ask whether the body's compliance can do the job.
14. **CAO and SKO optimisers**; **tensile-triangle fillets** an AI can apply without FEM.
15. **Remodelling** (a mechanostat with a lazy zone) for living structures and structures that adapt over their life.
16. **Self-healing as a repair-loop node** (damage, release, cure; efficiency; trigger; capsule trade-off).
17. **Brick-and-mortar composites** as parametric material graphs, every output tagged with its quantity kind.
18. **A citation-bias rule for research agents**: count independent primary measurements, not citations, before a claim enters the library.
19. **Validation cases** with published numbers: the termite convection cell; Eastgate's night flush; Physarum against Tokyo.

## (C) Questions

The 66 questions of this pass were chapter 8 of the book; 2 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q8.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches
- Leaf venation loops for fluctuating loads and damage (Katifori)
- Murray's law of vascular branching as a sizing rule for pipes and channels
- West–Brown–Enquist scaling (the ¾ law) as a check on the multiscale frame
- Army ants' living bridges: agents becoming structure
- Fire-ant rafts as material models
- Kilobots (1,024 robots): shape assembly by local rules
- Xenobots and Levin's bioelectric morphogenesis: goal-directed shape repair
- Turing reaction–diffusion as a texture and layout generator
- Space colonisation and L-systems for growing trees and vessels
- The glass sponge's lattice as an optimal lattice template
- The mantis shrimp's helicoidal club for impact resistance
- Pine cones and wheat awns: actuators that need no power (4D printing)
- The Venus flytrap's snap-through as a bistable actuator
- Frei Otto's and Gaudí's form-finding (soap films, hanging chains)
- Bejan's constructal law: a contested unifying theory, to audit
- Diatom shells as hierarchical light shells
- Bacterial quorum sensing as a cheaper consensus for AI gates
- Beaver dams: construction by many agents under changing water
- Karl Sims' creatures: body and controller evolved together in our physics
- Doursat's morphogenetic engineering
- Root foraging and tropisms as search in soil
- Earwig wing folding as compact deployables
- Mycelium composites as grown materials for the library
- Bird bones' internal struts as light tube templates
