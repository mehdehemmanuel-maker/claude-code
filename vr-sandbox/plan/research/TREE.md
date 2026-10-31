# The research tree

Everything researched for Nexus, as one tree: trunks (territories), branches (lines of inquiry) and leaves (what was
found). Each branch is marked **explored** (with the report that covers it) or **open** (not yet looked into). The tree
grows every round: each research pass must bring back the new branches it noticed but did not follow, so the open
edges never run out. The user's direction (2026-10-31): "compile and branch research so we can keep finding things we
may have overlooked or genius things that are unrelated".

## How a round works

1. **Pick branches**: some open branches near the work (what the next phase needs), and some **far** ones on purpose
   (territories that look unrelated: that is where the overlooked ideas live).
2. **Ask each pass for three things**: what it found (with sources and marks: checked, from memory, inferred); what
   Nexus should take (each as a node, a rule, a data model or a way of working); and **new branches**: the leads it saw
   and did not follow, each one line.
3. **Graft**: add the report to `research/`, its questions to `../BOOK-OF-QUESTIONS.md`, its new branches to this tree
   as open, and update `00-synthesis.md` where passes agree.
4. **Prune nothing**: a branch that led nowhere is marked "explored: nothing to take", so it is not explored again.

Ways of finding the overlooked, used to choose far branches:

- **Analogy**: who else solves our problem in another world (a bolt's hole is a key's lock; a node graph is a modular
  synthesiser's patch).
- **Inversion**: what would make Nexus fail, mislead or bore, and who has studied that?
- **Extremes**: the smallest, largest, fastest, oldest, cheapest version of what we do.
- **Outsiders**: crafts, games, rituals and trades with no word for engineering but deep skill at it.
- **Failures**: post-mortems of famous disasters and failed products near our space.

## The tree

Legend: `[x]` explored (report), `[ ]` open, `[~]` touched in passing, worth a pass of its own.

### 1. AI that builds things
- [x] AI and "vibe" CAD tools (01)
- [x] Agents, harnesses, long-running work (03)
- [x] Prompts as engineered parts; judges and reviewer panels; injection (11)
- [x] Learned geometry: B-rep networks, mate prediction (02)
- [~] AI tutors and explanation quality (10)
- [ ] Multi-agent design teams (roles, debate, markets of agents)
- [ ] AI for scientific discovery (hypothesis generation, automated labs, "AI scientist" systems)
- [ ] Program synthesis and inductive logic (learning rules from examples)

### 2. Geometry, topology and making
- [x] Interfaces, negatives, constraints, topological naming (02)
- [x] Implicit modelling, lattices, topology optimisation (02, 01)
- [x] Fractals, deep zoom, topology of solids (08)
- [ ] Origami, kirigami and deployable structures (folding as design)
- [ ] Knitting, weaving and textiles as programmable matter
- [ ] Construction toys as interface systems (LEGO's clutch, Meccano, K'nex, Technic)
- [ ] Manufacturing processes in depth (casting, moulding, machining, additive: design for each)
- [ ] Metrology and tolerancing (GD&T, how parts are actually measured)

### 3. Physics, simulation and the equations
- [x] Universal equations, conservation, least action, Buckingham π (07)
- [x] Effort and flow, bond graphs, port-Hamiltonian, Modelica (07, 06)
- [x] Multiscale coupling; what a browser can simulate (07)
- [x] Orbits, N-body, cosmology (09)
- [ ] Weather and climate models (ensembles, data assimilation)
- [ ] Granular matter, soil, snow (how heaps and avalanches are modelled)
- [ ] Sound and acoustics simulation (rooms, instruments, machines)
- [ ] Fire, combustion and explosions (safety simulation)

### 4. Life
- [x] Artificial life, cellular automata, evolution, open-endedness (07)
- [x] Cells, molecules, organisms, populations, morphogenesis (07)
- [ ] Biomimicry (nature's solutions catalogued: AskNature)
- [ ] Collective intelligence in nature (ants, slime moulds, bees, flocks, mycelium networks)
- [ ] Medicine and surgical simulation
- [ ] Ecology and agriculture at landscape scale

### 5. Mathematics and computation
- [x] π, precision, intervals, uncertainty, floating point (08)
- [x] Proof, SMT, symbolic algebra, optimisation, graphs, chaos (08)
- [x] Category theory and composition (07, 08)
- [ ] Group theory and symmetry in design (puzzles, crystals, patterns)
- [ ] Game theory, mechanism design, auctions (people and agents in shared worlds)
- [ ] Information geometry and compression as understanding

### 6. Engineering disciplines
- [x] All disciplines' models, tools and formats (06)
- [x] Civil engineering data and taxonomies (04)
- [ ] Ancient and vernacular engineering (Roman concrete, pyramids, stepwells, Inca masonry, Gothic cathedrals)
- [ ] Safety cultures (aviation checklists, nuclear defence in depth, surgical checklists)
- [ ] Systems engineering failures (post-mortems: Challenger, Tacoma Narrows, Boeing 737 MAX, Therac-25)
- [ ] Standards bodies and how standards are made

### 7. Software, languages and frameworks
- [x] Languages, WebGPU and WebAssembly, node tools (Houdini, Grasshopper, Blender, ComfyUI, LabVIEW) (06)
- [x] Search engines and semantic search (05)
- [ ] Spreadsheets as the most successful end-user programming ever (why Excel won)
- [ ] Live programming and image-based systems (Smalltalk, Lisp machines)
- [ ] Version control for non-code (design branches, merges of boards)
- [ ] Local-first software and CRDTs (sharing without a server)

### 8. Seeing, sound and interaction
- [x] Perception modes, locomotion comfort, sight modes (05)
- [x] Visualisation, explorables, spatial UI (08, 09)
- [x] The JARVIS look and voice (05)
- [ ] Modular synthesisers and music software as node graphs (patching, signal flow, live performance)
- [ ] Film and VFX pipelines (USD studios, previs, virtual production)
- [ ] Haptics and touch
- [ ] Magic, misdirection and attention (what people see and miss)

### 9. Worlds, games and play
- [x] Games' systems, procedural worlds, destruction, determinism (09)
- [x] Contests and challenges (09)
- [ ] Tabletop and war games (rules as simulation; Kriegsspiel)
- [ ] Puzzle design (how to teach without words)
- [ ] Toys and play research (how children learn by building)
- [ ] Theme parks and Imagineering (designed experiences, queues, show control)

### 10. People, society and knowledge
- [x] Philosophy of models, ontologies, invention, learning, ethics (10)
- [ ] Citizen science (Foldit, Galaxy Zoo, Zooniverse: ordinary people solving hard problems)
- [ ] Open communities and governance (Wikipedia, Linux, OpenStreetMap: how commons stay healthy)
- [ ] Economics, markets and pricing of parts (cost models, supply chains)
- [ ] Law as code (contracts, building codes made executable)
- [ ] Languages and translation (everyone, everywhere)
- [ ] Accessibility in depth (blind, deaf, motor, cognitive)

### 11. Data and sources
- [x] Open civil data, licences, taxonomies (04)
- [ ] Open product data (datasheets, parts catalogues, iFixit teardowns)
- [ ] Open materials data (Materials Project, MatWeb's terms, NIST databases)
- [ ] Open geographic and city data (OpenStreetMap, digital twins of cities)

### 12. Structure: building Nexus itself
- [x] Specs, decisions, evaluators, hooks (03)
- [ ] How great engineering organisations keep design knowledge (NASA lessons learned, Toyota's A3)
- [ ] Research on what makes software projects fail

## Rounds

| Round | Date | Passes | Branches explored | New branches grafted |
| --- | --- | --- | --- | --- |
| 1 | 2026-10-31 | 01 to 05 | AI CAD, topology and mating, agents and structure, civil and names, search and perception | — (the tree did not exist yet) |
| 2 | 2026-10-31 | 06 to 11 | engineering and languages, life and equations, mathematics, games and the vast, philosophy, prompts and judges | the open branches above, from what the passes touched in passing |
| 3 | 2026-10-31 | 12 onwards | (under way: far branches) | — |
