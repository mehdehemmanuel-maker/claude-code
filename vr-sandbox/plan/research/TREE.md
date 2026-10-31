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
- [x] Origami, kirigami and deployable structures (folding as design) (13)
- [x] Knitting, weaving and textiles as programmable matter (13)
- [x] Construction toys as interface systems (LEGO's clutch, Meccano, K'nex, Technic) (13)
- [ ] Manufacturing processes in depth (casting, moulding, machining, additive: design for each)
- [ ] Metrology and tolerancing (GD&T, how parts are actually measured)

### 3. Physics, simulation and the equations
- [x] Universal equations, conservation, least action, Buckingham π (07)
- [x] Effort and flow, bond graphs, port-Hamiltonian, Modelica (07, 06)
- [x] Multiscale coupling; what a browser can simulate (07)
- [x] Orbits, N-body, cosmology (09)
- [x] Weather and climate models (ensembles, data assimilation) (17)
- [x] Granular matter, soil, snow (how heaps and avalanches are modelled) (17)
- [x] Sound and acoustics simulation (rooms, instruments, machines) (17)
- [x] Fire, combustion and explosions (safety simulation) (17)

### 4. Life
- [x] Artificial life, cellular automata, evolution, open-endedness (07)
- [x] Cells, molecules, organisms, populations, morphogenesis (07)
- [x] Biomimicry (nature's solutions catalogued: AskNature) (12)
- [x] Collective intelligence in nature (ants, slime moulds, bees, flocks, mycelium networks) (12)
- [ ] Medicine and surgical simulation
- [ ] Ecology and agriculture at landscape scale

### 5. Mathematics and computation
- [x] π, precision, intervals, uncertainty, floating point (08)
- [x] Proof, SMT, symbolic algebra, optimisation, graphs, chaos (08)
- [x] Category theory and composition (07, 08)
- [x] Group theory and symmetry in design (puzzles, crystals, patterns) (17)
- [ ] Game theory, mechanism design, auctions (people and agents in shared worlds)
- [ ] Information geometry and compression as understanding

### 6. Engineering disciplines
- [x] All disciplines' models, tools and formats (06)
- [x] Civil engineering data and taxonomies (04)
- [x] Ancient and vernacular engineering (Roman concrete, pyramids, stepwells, Inca masonry, Gothic cathedrals) (13)
- [x] Safety cultures (aviation checklists, nuclear defence in depth, surgical checklists) (16)
- [x] Systems engineering failures (post-mortems: Challenger, Tacoma Narrows, Boeing 737 MAX, Therac-25) (16)
- [ ] Standards bodies and how standards are made

### 7. Software, languages and frameworks
- [x] Languages, WebGPU and WebAssembly, node tools (Houdini, Grasshopper, Blender, ComfyUI, LabVIEW) (06)
- [x] Search engines and semantic search (05)
- [x] Spreadsheets as the most successful end-user programming ever (why Excel won) (15)
- [ ] Live programming and image-based systems (Smalltalk, Lisp machines)
- [ ] Version control for non-code (design branches, merges of boards)
- [x] Local-first software and CRDTs (sharing without a server) (15)

### 8. Seeing, sound and interaction
- [x] Perception modes, locomotion comfort, sight modes (05)
- [x] Visualisation, explorables, spatial UI (08, 09)
- [x] The JARVIS look and voice (05)
- [x] Modular synthesisers and music software as node graphs (patching, signal flow, live performance) (14)
- [x] Film and VFX pipelines (USD studios, previs, virtual production) (14)
- [ ] Haptics and touch
- [x] Magic, misdirection and attention (what people see and miss) (14)

### 9. Worlds, games and play
- [x] Games' systems, procedural worlds, destruction, determinism (09)
- [x] Contests and challenges (09)
- [x] Tabletop and war games (rules as simulation; Kriegsspiel) (17)
- [x] Puzzle design (how to teach without words) (17)
- [ ] Toys and play research (how children learn by building)
- [x] Theme parks and Imagineering (designed experiences, queues, show control) (14)

### 10. People, society and knowledge
- [x] Philosophy of models, ontologies, invention, learning, ethics (10)
- [x] Citizen science (Foldit, Galaxy Zoo, Zooniverse: ordinary people solving hard problems) (15)
- [x] Open communities and governance (Wikipedia, Linux, OpenStreetMap: how commons stay healthy) (15)
- [ ] Economics, markets and pricing of parts (cost models, supply chains)
- [ ] Law as code (contracts, building codes made executable)
- [ ] Languages and translation (everyone, everywhere)
- [x] Accessibility in depth (blind, deaf, motor, cognitive) (15)

### 11. Data and sources
- [x] Open civil data, licences, taxonomies (04)
- [ ] Open product data (datasheets, parts catalogues, iFixit teardowns)
- [ ] Open materials data (Materials Project, MatWeb's terms, NIST databases)
- [ ] Open geographic and city data (OpenStreetMap, digital twins of cities)

### 12. Structure: building Nexus itself
- [x] Specs, decisions, evaluators, hooks (03)
- [ ] How great engineering organisations keep design knowledge (NASA lessons learned, Toyota's A3)
- [ ] Research on what makes software projects fail

## Branches grafted in round 3 (open)

Each line a lead a round-3 pass noticed and did not follow; to be placed under its trunk when a round takes it up.

### From Nature's collective genius (`12-nature-collective.md`)
- [ ] Leaf venation loops for fluctuating loads and damage (Katifori)
- [ ] Murray's law of vascular branching as a sizing rule for pipes and channels
- [ ] West–Brown–Enquist scaling (the ¾ law) as a check on the multiscale frame
- [ ] Army ants' living bridges: agents becoming structure
- [ ] Fire-ant rafts as material models
- [ ] Kilobots (1,024 robots): shape assembly by local rules
- [ ] Xenobots and Levin's bioelectric morphogenesis: goal-directed shape repair
- [ ] Turing reaction–diffusion as a texture and layout generator
- [ ] Space colonisation and L-systems for growing trees and vessels
- [ ] The glass sponge's lattice as an optimal lattice template
- [ ] The mantis shrimp's helicoidal club for impact resistance
- [ ] Pine cones and wheat awns: actuators that need no power (4D printing)
- [ ] The Venus flytrap's snap-through as a bistable actuator
- [ ] Frei Otto's and Gaudí's form-finding (soap films, hanging chains)
- [ ] Bejan's constructal law: a contested unifying theory, to audit
- [ ] Diatom shells as hierarchical light shells
- [ ] Bacterial quorum sensing as a cheaper consensus for AI gates
- [ ] Beaver dams: construction by many agents under changing water
- [ ] Karl Sims' creatures: body and controller evolved together in our physics
- [ ] Doursat's morphogenetic engineering
- [ ] Root foraging and tropisms as search in soil
- [ ] Earwig wing folding as compact deployables
- [ ] Mycelium composites as grown materials for the library
- [ ] Bird bones' internal struts as light tube templates

### From Crafts, toys, folding and ancient engineering (`13-crafts-toys-ancient.md`)
- [ ] *Tsugite* (UIST 2020): its voxel joints and slidability, durability and millability checks
- [ ] LDCad and LeoCAD snap extensions: the nearest thing to a connection standard
- [ ] BrickLink Studio's connectivity data and its licence
- [ ] Chinese bracket sets and the *Yingzao Fashi* (1103): a modular unit as a national building code
- [ ] Japanese *kiwari*: every timber sized from the column spacing
- [ ] Tiahuanaco's poured metal cramps: an ancient cast-in-place interface
- [ ] CNC timber joinery (Gramazio Kohler, Hundegger, integral plate joints)
- [ ] Rigid-origami simulators (Tachi; Ghassaei's Origami Simulator) as fold nodes
- [ ] Thick-panel origami (Lang and Magleby)
- [ ] Knitting compilers beyond Knitout (KnitScript, autoknit, vendor formats)
- [ ] Quipu: knotted-cord records as textile data
- [ ] Froebel gifts and the Bauhaus: toys that shaped modernism
- [ ] Fischertechnik's dovetail (1965) and Merkur's metric Meccano
- [ ] Hot-mixed concrete companies and standards for self-healing claims
- [ ] The Antikythera mechanism's gear teeth: an ancient gear interface?
- [ ] Funicular masonry design today (Block Research Group; thrust network analysis)
- [ ] Yakhchal ice houses: qanat and windcatcher as one thermal system
- [ ] Wootz steel's reconstruction and its vanadium
- [ ] LEGO's bio-based and recycled plastics: does clutch survive a change of material?
- [ ] Quasicrystals and Penrose tilings: an interface system on a non-periodic grid

### From Sound, film, magic and designed experiences (`14-sound-film-magic.md`)
- [ ] Doug James's real-time physical sound (precomputed noise; Inverse-Foley)
- [ ] Web Audio worklets' limits for modal synthesis in WebXR
- [ ] Faust (DSP compiled to WebAssembly) for sound nodes
- [ ] SuperCollider's server and client split as a model for engine and AI
- [ ] Bespoke Synth, Cardinal and Bitwig's Grid as modern node interfaces
- [ ] How Eurorack's power connector became a standard: a lesson in governance
- [ ] MIDI 2.0 Property Exchange: devices describing themselves (parts that say what they need)
- [ ] Genlock across render nodes (nDisplay) for multi-user VR sync
- [ ] Omniverse's live layered editing on USD
- [ ] MaterialX and OpenColorIO as material and colour standards
- [ ] Muscle simulation (Weta, Ziva) to explode living things
- [ ] Disney Research's untethered animatronics: show control meets robotics
- [ ] Imagineering's story spine and theming coherence
- [ ] Kevin Lynch's *Image of the City* (paths, edges, districts, nodes, landmarks) as a layout grammar
- [ ] Alternate reality games and "this is not a game": immersion against deception
- [ ] Meow Wolf's non-linear exhibits and visitor-flow testing
- [ ] Penn and Teller's honest reveal as a teaching device
- [ ] Magic's method-against-effect notation as tutorial structure
- [ ] Eye tracking for attention, and the ethics of gaze data
- [ ] Calm technology (Weiser and Brown) against the JARVIS ideal of everything up front
- [ ] Sound walks (Janet Cardiff) as a design for voice-led AI tours
- [ ] Pixar's Braintrust: note culture for reviewing AI work

### From Safety cultures and famous failures (`16-safety-failures.md`)
- [ ] Normalisation of deviance (Vaughan) and the Columbia board's foam findings
- [ ] Perrow's *Normal Accidents*: interactive complexity and tight coupling as a measurable property of graphs
- [ ] High-reliability organisations (Weick and Sutcliffe) applied to AI gates
- [ ] Safety-II and FRAM (Hollnagel): learning from what goes right
- [ ] Dekker on "human error" and hindsight bias
- [ ] NIST's full written report on Champlain Towers South, when published
- [ ] Rana Plaza and Ronan Point, and the codes for disproportionate collapse
- [ ] Ariane 5 flight 501: software reused outside its envelope
- [ ] The Quebec Bridge and the engineer's Iron Ring
- [ ] The de Havilland Comet: fatigue, damage tolerance, fail-safe design
- [ ] Fukushima Daiichi: a common-cause external event and a seawall from too short a record
- [ ] Deepwater Horizon: a misread negative pressure test
- [ ] Air France 447: automation surprise and mode confusion, for the AI's hand-over
- [ ] Unit-of-measure type systems (F# units, Boost.Units, Pint) as poka-yoke ports
- [ ] ISO 26262 and IEC 61508 integrity levels as a severity scale for parts
- [ ] FDA MAUDE and NTSB CAROL as sources of real failure modes
- [ ] FAA AC 25.1309 and ARP4761: fault-tree templates
- [ ] Design for Assembly (Boothroyd–Dewhurst): symmetry rules for parts that cannot go in wrong
- [ ] Chernobyl's control-rod tips: a safety action that first made things worse
- [ ] Blameless software post-mortems (SRE, "Learning from Incidents")

### From Commons, citizen science and people together (`15-commons-citizens.md`)
- [ ] Foldit players' de novo protein design (Koepnick et al., Nature 2019) and Foldit with AlphaFold
- [ ] EteRNA's OpenKnot and OpenVaccine challenges, and papers with only players as authors
- [ ] Zooniverse's Panoptes and Caesar: aggregation and live retirement rules
- [ ] Bayesian annotator models (Dawid–Skene) for weighting unknown contributors
- [ ] Wikidata's property proposals and bot policy as a model for part schemas
- [ ] Wikipedia's machine-learned quality scores (ORES, Lift Wing) and the fairness debate
- [ ] OpenStreetMap's 2023 tagging-governance debates and attribution guidelines
- [ ] The Debian constitution and Apache's "community over code" as governance templates
- [ ] Certificates of origin and SPDX licence tags for parts: the law of remix lineage
- [ ] Access control inside a CRDT (Ink & Switch's keyhive, Beelay)
- [ ] Eg-walker against Yjs and Automerge for merging scripts
- [ ] Peer-to-peer in the browser (Iroh, libp2p, WebRTC data channels) for worlds without a server
- [ ] Knowledge as a commons (Hess and Ostrom, 2007)
- [ ] Quadratic funding and retroactive public-goods funding to pay contributors of parts
- [ ] Riot's Tribunal and Valve's report systems: what reduces repeat griefing
- [ ] Meta Horizon's personal boundary and VRChat's trust ranks
- [ ] Sign-language recognition and the ethics of avatars (statements of deaf organisations)
- [ ] Haptic rendering of materials (CLAW, Haptic PIVOT) for blind users
- [ ] Whether readability metrics hold on technical interface text
- [ ] Model collapse when AI trains on AI output, and an AI that writes into the library
- [ ] Spreadsheet error taxonomies (Panko, EuSpRIG) as a lint checklist
- [ ] End-user programming beyond the grid (Dynamicland, Ink & Switch's Potluck)

### From Unseen sciences, old games and cooking (`17-unseen-sciences.md`)
- [ ] Flood forecasting ensembles (EFAS, GloFAS) feeding decisions by cost and loss
- [ ] Earthquake early warning: a nowcast whose deadline is shorter than the computation
- [ ] Particle filters for non-Gaussian assimilation in agent and life simulations
- [ ] Reanalysis (ERA5): one gap-free history made by assimilating everything
- [ ] The material point method (Disney's *Frozen* snow) between particles and continuum
- [ ] Soil liquefaction and Eurocode 7's partial factors for calibrated soil parameters
- [ ] Auralisation and HRTFs: hearing the simulated room in VR
- [ ] Modal analysis and operating deflection shapes: animating a machine at each resonance
- [ ] Crowd evacuation models (Pathfinder, social-force models) computing RSET
- [ ] Wildfire spread (Rothermel, FARSITE) with satellite hotspots assimilated
- [ ] Blast: TNT equivalence and Kingery–Bulmash charts as a sourced lookup node
- [ ] Quasicrystals and Penrose tilings: symmetry a lattice forbids
- [ ] Representation theory: symmetry predicts which vibration modes exist
- [ ] Operations research in kitchens and factories: takt time, lean, Little's law
- [ ] HACCP: critical control points as gates in a process board
- [ ] Wargame archives (RAND, the Naval War College): how game findings were used and misused
- [ ] Solo wargames' rule-based opponents (flowchart "bots") as umpires that need no person
- [ ] Superforecasting and Brier-scored markets to calibrate the AI's own confidence
- [ ] Model output statistics: correcting a biased model against observations, cheaper than assimilation
- [ ] Shadowing: when a chaotic run still follows some true one

## Rounds

| Round | Date | Passes | Branches explored | New branches grafted |
| --- | --- | --- | --- | --- |
| 1 | 2026-10-31 | 01 to 05 | AI CAD, topology and mating, agents and structure, civil and names, search and perception | — (the tree did not exist yet) |
| 2 | 2026-10-31 | 06 to 11 | engineering and languages, life and equations, mathematics, games and the vast, philosophy, prompts and judges | the open branches above, from what the passes touched in passing |
| 3 | 2026-10-31 | 12 to 17 | nature's collective genius; crafts, toys and ancient engineering; sound, film, magic and experiences; safety and failures; commons and citizen science; unseen sciences, old games and cooking | 128 |
