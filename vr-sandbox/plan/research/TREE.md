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
3. **Graft** (`python3 plan/research/graft.py`, which also recompiles `../INDEX.md`; each pass gets `BRIEF.md`): add the report to `research/`, its questions to `../BOOK-OF-QUESTIONS.md`, its new branches to this tree
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
- [x] Program synthesis and inductive logic (learning rules from examples) (explored: 26)

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
- [x] Economics, markets and pricing of parts (cost models, supply chains) (explored: 29)
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

## Branches grafted in round 4 (open)

### From Self-describing interfaces (`18-self-describing-interfaces.md`)
- [x] ISO 80000 parts 1 to 13 as a data file: is there an open machine-readable ISQ (mp-units' ISQ definitions, QUDT quantity kinds)? (explored: 24)
- [x] QUDT (Quantities, Units, Dimensions and Types) ontology: quantity kinds as RDF, a ready-made kind tree with licence to check. (explored: 24)
- [ ] The SI Digital Framework (BIPM) and D-SI: machine-readable SI and measurement metadata.
- [ ] W3C Web of Things Thing Description, and IDTA 02017 Asset Interfaces Description that wraps it.
- [ ] AutomationML (IEC 62714) interface classes and its "ExternalInterface" concept: CAEX ports that link plant objects.
- [ ] Modelica connectors (`flow`, `stream`) as the oldest typed physical port standard, and the Modelica Standard Library's SIunits.
- [ ] FMI 3.0 terminals and icons: how co-simulation units declare grouped connectors.
- [x] SysML v2 ports, interfaces and quantity kinds (ISQ library inside SysML v2). (explored: 24)
- [ ] IEC 81346 reference designations: structural ids for parts in a plant, and the IDTA BoM extension built on it.
- [ ] GS1 and the EU Digital Product Passport: product self-description reaching consumers.
- [ ] LeoCAD and BrickLink Studio connection data, compared with LDCad's snap metas (still open from round 3).
- [ ] The Tsugite source code (released on GitHub?) and Larsson's later work on joints (e.g. curved or non-orthogonal joinery).
- [x] Assembly sequence planning from interface data (disassembly graphs, AND/OR graphs; Homem de Mello and Sanderson). (explored: 35)
- [ ] Poka-yoke catalogues (Shingo) as a library of keying features for the agent to propose.
- [ ] ISO 2768 general tolerances as the default when a person states none.
- [ ] Bluetooth GATT and the assigned numbers registry: another self-describing device vocabulary with UUIDs.
- [ ] CANopen EDS / device profiles (CiA 402) and EtherCAT ESI: drive self-description beside IO-Link.
- [ ] Units checking in TypeScript (branded types, template-literal types) for Nexus's own code, distinct from the run-time check on wires.
- [x] The 2π problem in the SI (proposals to make the radian a base unit; Quincey, Mohr): a sourced basis for decision B2. (explored: 24)
- [ ] MTM (Methods-Time Measurement) as an openly described alternative to proprietary DFA time tables.

### From The physics core in a browser (`19-physics-core-browser.md`)
- [ ] Read Rumoca's `rumoca-phase-structural` crate in full: its matching, BLT and IC planning, and its diagnostic types.
- [ ] Read StateSelection.jl's source for the integer-linear singularity pre-pass, the least documented step.
- [ ] Pryce's Σ-method and the DAESA tool: structural analysis with a better index estimate than Pantelides.
- [ ] Mattsson–Söderlind dummy derivatives (1993) and the later "dummy derivatives done right" corrections.
- [ ] Measure Jolt `wasm-compat` bit-identity across Chromium, Firefox and WebKit with Playwright (no one has published it).
- [ ] Build JoltPhysics.js with `CROSS_PLATFORM_DETERMINISTIC=ON` and compare bundle size and speed.
- [ ] diffsol through wasm-pack: bundle size, API for a mass matrix, and a stiff benchmark in three browsers.
- [ ] SUNDIALS IDA through Emscripten: does it build, size, and speed against diffsol.
- [ ] FMI-LS-WASM with jco: can a WIT FMU run in a browser today?
- [ ] OpenModelica PRs #16063 and #16060: what "browser simulation" means there and what differed from native.
- [ ] The FMI-LS-DAE arXiv preprint (2606.22544) for its test results and its plan for index above 1 and events.
- [ ] Base Modelica's MCP-0031 text itself (not found this pass) and its version status.
- [ ] RATTLE and SHAKE for constrained mechanisms, and Lie-group integrators for rigid-body rotation.
- [ ] Discrete-gradient methods for pH systems with a state-dependent mass matrix, in code.
- [ ] Modia.jl's diagnostics, and Modia3D's way of coupling multibody and DAE (relevant to Jolt coupling).
- [ ] The ASEE web bond-graph tool: what it generates, and whether its causality messages read well.
- [ ] Bevy's banned-method list and Box2D v3's determinism tests as models for our lint and battery.
- [ ] WebAssembly 3.0's deterministic profile: which engines expose it and whether a page can ask for it.
- [ ] CORE-MATH correctly rounded functions compiled to wasm as our `detmath`, instead of writing our own.
- [ ] Simscape's "dependent dynamic states" diagnostics in depth: how it finds the components and equations.
- [ ] The Modelica Buildings library's list of physics mistakes (pressure references, steady-state mixes) as a
- [ ] ODE+ and YSSIM: do they compute in the browser, and how do they report errors?

### From Organisations that do not fail, and deep accidents (`20-organisations-accidents.md`)
- [ ] The NIOSH/CDC "normal accident theory-based complexity assessment": its graph attributes, read in full
- [ ] Rochlin, La Porte and Roberts (1987) on carrier flight decks: the original HRO evidence
- [ ] Vaughan's normalisation of deviance and the Columbia board, for the AI's drift
- [ ] Rasmussen's AcciMap as a post-mortem diagram across levels (operator to regulator)
- [ ] Extreme value statistics (GEV, peaks over threshold) and how long a record must be: a node for design bases
- [ ] Paleotsunami and paleoflood evidence as data with claim status (Jogan 869, Cascadia 1700)
- [ ] Damage-tolerance rules after Lusaka (1977) and Aloha 243 (1988); widespread fatigue damage; FAA AC 25.571
- [ ] Paris-law crack growth and NASGRO data as a sourced kind in Nexus
- [ ] Ariane 501 recommendation list in full, and Leveson's critique of the inquiry
- [ ] Fukushima Unit 1 isolation condenser: which valve closed and why (TEPCO, NRA, Diet commission disagree)
- [ ] Air France 447 human-factors annex: startle, dual input, the flight director's role
- [ ] Mode confusion research (Sarter and Woods, "How in the world did we ever get into that mode?") for the AI's modes
- [ ] Endsley's situation awareness levels and the Automation Transparency literature, for the hand-over schema
- [ ] Deepwater Horizon blowout preventer forensics (DNV): buckled pipe and shear-ram geometry as an interface failure
- [ ] INSAG-1 against INSAG-7 against the Russian accounts: holding contested records
- [ ] Woods' "theory of graceful extensibility" and resilience engineering metrics
- [ ] Cook's "How Complex Systems Fail" (1998), eighteen points, as a checklist for Nexus's own architecture
- [ ] Chaos engineering (Netflix Chaos Monkey, game days) as a Safety-II practice for Nexus's runtime
- [ ] The Learning from Incidents community's facilitation guides (Etsy debriefing guide) for the post-mortem node
- [ ] Signal detection theory for reading tests (the PSAM negative-pressure paper) as a reviewer-calibration method
- [ ] Boeing 737 MAX and AF447 together: what the AI should tell a person about automation they did not know existed

### From Grammars of space and cities (`21-space-city-grammars.md`)
- [ ] Hillier's *Space is the Machine* (1996) and the "generic function" argument: why integration predicts co-presence.
- [ ] Angular segment analysis and choice (betweenness) at metric radii, as used in modern space syntax practice.
- [ ] Turner's visibility graph analysis and agent-based "exosomatic visual architecture" (agents that walk by isovists).
- [ ] Peponis's convex and s-partitions and the formal definition of axial maps (Turner, Penn, Hillier 2005 "an algorithmic definition of the axial map").
- [ ] Duarte's Malagueira grammar and his "discursive grammar" for mass customised housing.
- [ ] Shape grammar interpreters (GRAPE, SortalGI, Shaper2D) and their licences.
- [ ] Tensor-field street modelling (Chen, Esch, Wonka, Müller, Zhang 2008) as an alternative to L-systems.
- [ ] Inverse procedural modelling: fitting a grammar's parameters to a target city or building (Talton et al. 2011, Metropolis procedural modelling).
- [ ] Space standards as sourced data: England's Nationally Described Space Standard, Neufert's tables, and what may be stored.
- [ ] Daylight in the browser: Radiance ports to WebAssembly, Ladybug/Honeybee's open methods, EN 17037's metrics.
- [ ] Fire egress simulation (Pathfinder, open JuPedSim) as the dynamic check beside static travel distance.
- [ ] Japanese room modules: tatami counts (jō) as an area unit and kiwari for interiors (shoin style).
- [ ] The Roman castrum and Laws of the Indies (1573) as city grammars written as law.
- [ ] Islamic courtyard house grammars and Hanson's genotypes across cultures (to counter RPLAN's single culture).
- [ ] Kahn's served and servant spaces and Hertzberger's thresholds as checkable relations.
- [ ] Lynch's *Good City Form* (1981): performance dimensions (vitality, sense, fit, access, control) as city measures.
- [ ] Computational legibility studies that compare sketch maps with space syntax measures.
- [ ] Building information as graphs: IFC's IfcRelSpaceBoundary and IfcSpace as the import route for `space.graph` (spec 05's IFC reader).
- [ ] Townscaper's irregular quad grid and dual-grid tile deformation, in detail.
- [ ] Model synthesis (Merrell 2007), WFC's predecessor, for 3D buildings with exact constraints.

### From Growth and self-organisation (`22-growth-self-organisation.md`)
- [ ] Topology optimisation (SIMP, level-set, BESO) compared head to head with CAO/SKO and constructal trees
- [ ] Wolff's law and bone remodelling models (Huiskes, Carter) as sourced adaptive-growth rules
- [ ] Root architecture models (OpenSimRoot, CRootBox) for growing under soil demand fields
- [ ] Plant phototropism and auxin canalisation (Sachs) as the biology under space colonisation
- [ ] Physarum solvers for Steiner and shortest-path problems, with their proofs (Bonifaci et al.)
- [ ] Ant colony optimisation with damage ensembles for robust routing
- [ ] River network self-organisation (optimal channel networks, Rodríguez-Iturbe and Rinaldo)
- [ ] Banavar–Maritan–Rinaldo network allometry as a cleaner alternative to WBE
- [ ] Maximum entropy production (Kleidon, Dewar) and its own contested status
- [ ] Modular self-reconfiguring robots (M-TRAN, ATRON, Roombots) as physical grow-where-needed
- [ ] Programmable matter and claytronics (Goldstein) and their scaling limits
- [ ] Turing reaction–diffusion patterns as placement fields for modules (Kondo's fish stripes)
- [ ] Gene-regulatory-network evolution for shape (Bongard's evo-devo robots, CPPN/HyperNEAT encodings)
- [ ] Neural cellular automata for regenerating images (Mordvintsev et al., Distill 2020) as a repair model
- [ ] Self-healing materials (microcapsules, vascular healing networks, White and Sottos) with vascular layouts from Murray
- [ ] Shape-memory polymer and liquid-crystal-elastomer 4D printing as powered counterparts to hygromorphs
- [ ] Hygromorphic building skins in service (HygroSkin, ICD Stuttgart pavilions) and their weathering data
- [ ] Spider silk and web repair as local-rule structural maintenance
- [ ] Biofilm architecture and channels as quorum-driven construction
- [ ] Termite mound ventilation (Turner; King, Ocko and Mahadevan) as grow-where-needed for airflow
- [ ] The 2017 critical note on Kilobot self-assembly: its authorship and standing

### From Keeping knowledge true at scale (`23-truth-at-scale.md`)
- [ ] Peer prediction and Bayesian truth serum (Prelec 2004): eliciting honest reports without ground truth, for claims that never resolve.
- [ ] Hierarchical Dawid–Skene in Stan or a small JS sampler: what it would cost to run in the browser per claim kind.
- [ ] Item response theory (Rasch) as the model of item difficulty for engineering values.
- [ ] Wikidata's WikiProject Retractions and the P5824 graph: could Nexus read retraction status straight from Wikidata.
- [ ] OpenAlex's `is_retracted` field and the "Retracted papers in OpenAlex" study (arXiv:2403.13339) as a second retraction feed.
- [ ] PubPeer and post-publication review as an earlier signal than retraction.
- [ ] Datasheet revision tracking: manufacturers' change notices (PCN) in electronics as a correction feed for parts.
- [ ] in-toto and SLSA (supply-chain attestations) as a model for signing each step of a build, not only the product.
- [ ] Sigstore or minisign for signing stored-piece manifests without key management pain.
- [ ] RO-Crate (research objects) as a package format for a board plus its data, provenance and licence.
- [ ] Interlaboratory comparison statistics (ISO 13528, robust means, Paule–Mandel, DerSimonian–Laird random effects) as alternatives to CODATA's expansion factor.
- [ ] The "dark uncertainty" literature (Thompson & Ellison) on unexplained between-lab spread.
- [ ] Conformal prediction for calibrated intervals on AI numeric estimates without a distributional assumption.
- [ ] Data provenance for LLM training (Data Provenance Initiative, Longpre et al.) and licence audits of popular datasets.
- [ ] Watermarking and detecting AI-generated text in contributions, and why detectors are unreliable.
- [ ] Metaculus's scoring (peer and baseline scores) and its handling of ambiguous resolution.
- [ ] Futarchy and decision markets (Hanson) applied to choosing which library gaps to measure first.
- [ ] Community Notes' bridging algorithm (matrix factorisation that rewards agreement across disagreeing groups) as a consensus rule.
- [ ] Wikipedia's Lift Wing revert-risk model as a design reference for a Nexus "claim risk" score, with its model card.
- [ ] The FAIR data principles and how they compare with REUSE and PROV for Nexus data files.

## Branches grafted in round 5 (open)

### From Quantity kinds done right (`24-quantity-kinds.md`)
- [ ] Measurement scale types (Stevens: nominal, ordinal, interval, ratio; plus logarithmic and cyclic) as a field on every quantity, and what operations each allows.
- [ ] Cyclic quantities (angles that wrap at 360°, time of day, compass bearings): averaging and differencing on a circle.
- [ ] Vector and tensor character of quantities (ISO 80000), and coordinate frames on ports, as SysML v2's next work item.
- [ ] Uncertainty carried with kind: GUM uncertainty on a point versus on a difference (a temperature difference's uncertainty is not the difference of uncertainties).
- [ ] Kennedy's dimension types and type inference: can Nexus infer kinds through a whole board, not only per port?
- [ ] Hart's "Multidimensional Analysis" (1995), dimensional analysis with matrices of quantities, for Nexus's matrix and table types.
- [ ] Natural units and systems where c = 1 or ħ = 1, and whether Nexus's physics core ever needs them.
- [ ] Medication dosing errors and the "do not use" abbreviation lists (µg versus mg, U versus 0), as a source of unit rules for spoken input.
- [ ] Engineering standards that define kinds by procedure (Rockwell hardness, Shore durometer, Charpy energy): units that are numbers only within a test method.
- [ ] Currency as a kind with time-varying bridges (exchange rates, inflation), and money as a point (a price at a date) versus a difference.
- [ ] The CCU's 2026 to 2035 strategy and any planned SI Brochure appendix on angles and counting quantities.
- [ ] The CCU focus group on counting and number quantities: whether "number of entities" gets its own unit or dimension.
- [ ] QUDT's "D" dimension exponent: how it is used, and whether it could carry angle without a base unit.
- [ ] LOINC and FHIR's use of UCUM for imported health and lab data in the living world.
- [ ] GIS and survey units (US survey foot retired 2022, geoid height versus ellipsoid height) as an affine-origin case.
- [ ] Unit handling in other node-graph tools (Grasshopper, Houdini, Blender geometry nodes, LabVIEW's unit labels) and how their users work around it.
- [ ] Units in LLM tool calls: how often agents drop or invent units when writing values, and a benchmark Nexus could run on its own agent.
- [ ] Photometric versus radiometric kinds (lumen versus watt) and the luminous efficacy bridge, which needs a spectrum.

### From Incremental, lazy and demand-driven computation (`25-incremental-computation.md`)
- [x] HyperFormula's source (an open JS spreadsheet engine with a dependency graph and calculation chain) as a reference implementation in Nexus's own language. (explored: 32)
- [x] alien-signals' algorithm and Vue 3.6's adoption of it: a fast push-pull core that might be taken whole for the engine's marking pass. (explored: 32)
- [x] The TC39 Signals polyfill and its stage: whether a standard primitive will exist in browsers in time to build on. (explored: 32)
- [x] DBSP (Budiu et al.) and Feldera: an algebra that makes any query incremental; whether Nexus's list nodes could be compiled to it. (explored: 32)
- [ ] Adapton's nominal memoization paper (OOPSLA 2015) in detail, for spawner rows and list edits.
- [x] Jane Street's "Seven Implementations of Incremental" talk in full: pseudo-height, bind nodes, and their mistakes. (explored: 32)
- [ ] rustc's query system and its on-disk incremental cache: persisting verified traces between sessions.
- [x] Salsa's cycle handling (fixed-point iteration for cyclic queries) for Nexus's loops and solvers. (explored: 32)
- [ ] Datalog engines with incremental maintenance (Soufflé, Differential Datalog/DDlog) for interface rules "what may touch".
- [ ] Build Systems à la Carte's treatment of minimality and correctness proofs: a property test Nexus could run (incremental result equals from-scratch result).
- [ ] Houdini's compiled blocks and "invoke compiled" nodes: how a sub-network is compiled to skip per-node overhead.
- [ ] Unreal PCG's runtime generation scheduling policies in detail (priorities, budgets per frame).
- [ ] TouchDesigner's "cook on change if asked" internals and its performance monitor as a UI model.
- [ ] Grasshopper 2 (in development) and whether McNeel added cutoff or lazy solving.
- [x] Observable notebooks' runtime (dataflow cells, lazy invisible cells), already named in research 09, not yet studied for mechanism. (explored: 32)
- [ ] Excel's LAMBDA and dynamic arrays: how spill ranges change the dependency tree.
- [ ] Kinetic data structures (Acar's thesis keyword): incremental geometry under motion, for physics broad-phase.
- [x] The Glimmer/Ember autotracking model (revision tags) as another version-number design. (explored: 32)
- [ ] Incremental parsing (tree-sitter) as a model for incremental geometry edits.
- [ ] Memory budgets and eviction policies for memo tables (PCG's element cap; Salsa's LRU; Bazel's disk cache GC).
- [ ] Reproducible-builds work (reproducible-builds.org) on finding nondeterminism sources: a checklist for LW9.

### From AI that proves, and shapes that explain themselves (`26-proofs-and-programs.md`)
- [x] Translation validation literature after Pnueli and Necula (Alive and Alive2 for LLVM peephole rules) as a model for validating each AI board edit (explored: 31)
- [ ] Alive-style SMT checking of Nexus's own rewrite rules (`lawgraph.ts` simplifications) before they ship
- [x] Flyspeck and Hales's use of certificates for linear programs and interval computations in a machine-checked proof (explored: 31)
- [x] Interval arithmetic certificates (Tucker's Lorenz attractor proof) as a template for "safe over a tolerance range" (explored: 31)
- [ ] Verified e-graphs: proofs from egglog checked in Lean or Coq (the egg-to-Coq work and "egg proofs" follow-ups)
- [ ] Tensat and Diospyros as examples of e-graph extraction under resource costs (ILP extraction), for cost functions over mass, price and part count
- [ ] DreamCoder's wake-sleep library learning and how its abstractions compare to babble's on CAD corpora
- [ ] Mesh decompilers before Szalinski (Reincarnate, the tool Szalinski composes with) and B-rep feature recognition
- [ ] SketchGraphs and constraint-graph datasets as a source of real CAD constraint programs for the AI
- [ ] Neural CAD program generators after 2023 (CAD-Recode, Text2CAD, and similar) measured against an exact re-execution check
- [ ] Version-space algebra and PROSE (Microsoft's FlashFill framework) as a library for `by.example`
- [ ] Interactive disambiguation in programming by example (distinguishing inputs, "active learning" of programs)
- [ ] Lean's `sorry`-tracking and blueprint tools (leanblueprint) as a model for showing a board's unproved subgoals as a dependency graph
- [x] The de Bruijn criterion (small trusted kernel) applied to Nexus: what would a Nexus kernel be (explored: 31)
- [x] Hardware and safety-critical certification (DO-178C tool qualification, IEC 61508) for what a checked AI design would need to be accepted (explored: 31)
- [~] Certified programming with dependent types for units (F# units of measure, Idris) as alternatives to SMT refinement (touched in 24)
- [x] SAT and SMT solvers in WASM with proof output (CaDiCaL WASM builds, cvc5 WASM), to check unsat in-page (explored: 31)
- [ ] Reward hacking in RL provers (proving the simplified statement) and what that predicts for an RL-trained CAD agent
- [ ] AlphaGeometry 2 and its improved symbolic engine: what more deduction rules buy, analogous to a richer Nexus solver set

### From Notations (`27-notations.md`)
- [x] Measure Claude's tokenizer on JSON plans vs NBN vs compact JSON across all starter boards (the decisive experiment). (explored: 30)
- [ ] Grammar-constrained decoding through hosted APIs: what strict tool schemas allow, and llguidance / XGrammar for local models.
- [ ] SELFIES-style construction for boards: a derivation grammar where every string is a well-typed board.
- [ ] Canonical labelling of graphs (nauty, the algorithm behind canonical SMILES) for a board key that ignores node names.
- [ ] Shannon's juggling theorem and ladder diagrams as a model of timed resource use (machines, robots, traffic).
- [ ] Benesh vs Labanotation for recording robot and avatar motion in Nexus's bodies (`docs/LIFE.md`).
- [ ] LilyPond and MusicXML: how a text music notation handles layers, voices and engraving rules.
- [ ] Notation for kinematic chains: Denavit–Hartenberg parameters as a four-number-per-joint notation.
- [ ] Crease patterns and flat-foldability checks (Maekawa's and Kawasaki's theorems) as notation checksums.
- [ ] Hangul's featural design as a model for naming interface keys so related keys look related.
- [ ] Systematic chemical names (IUPAC nomenclature) as a long-form notation vs SMILES: when the long form is safer.
- [ ] Bond graph notation (power bonds, causal strokes) as a text notation for spec 09.
- [ ] Petri net and BPMN notations for processes and assembly sequences.
- [ ] Morse code, Braille and Huffman: frequency-matched code lengths, so the commonest blocks get the shortest names.
- [ ] APL's tacit (point-free) style and its readability debate, for whether boards should name intermediate nodes at all.
- [ ] Electrical one-line diagrams and IEC 61850 SCL as compact notations for power systems (spec 05).
- [ ] Stenography (Pitman, Gregg, steno chords) as a human answer to "write fast, read later".
- [ ] Diff and patch notations (unified diff, JSON Patch, operational transforms) for the `change` tool and shared boards.
- [ ] Dance and juggling "trick dictionaries" as libraries of named, composable fragments (the library law in performance).
- [ ] How engravers and choreologists check each other's work: second-reader practices as a model for the reviewer panel.

### From The body as an engineered system, and medicine's safety (`28-body-medicine.md`)
- [ ] Pulse Physiology Engine's source and circuit solver, read for a WebAssembly port and its exact validation-matrix format
- [ ] CAESAR (Civilian American and European Surface Anthropometry Resource) and national civilian surveys, for a non-military default body
- [ ] The USAF multivariate accommodation method (Hudson, Zehner, Meindl 1998) and PCA boundary manikins, read in full
- [ ] Daniels' original 1952 WADC note "The 'Average Man'?", to replace the secondary accounts
- [ ] ISO 10328's full test geometry and its P7–P8 levels, and ISO 22675 for ankle-foot devices
- [x] Pressure ulcer science: time-at-pressure damage curves (Reswick and Rogers 1976; later Gefen), as a time-dependent interface limit (explored: 34)
- [ ] Digital human modelling tools (RAMSIS, JACK, Siemens Process Simulate Human) and their fit methods
- [ ] Statistical shape models of the body (SMPL, STAR) driven from a few measurements, and their bias by population
- [x] ISO 11228 (manual handling) and the NIOSH lifting equation as human-load checks (explored: 34)
- [x] ISO 7730 and the PMV/PPD thermal comfort model, and Fiala/UTCI thermoregulation models, for the living world (explored: 34)
- [ ] IEC 60601-1 (basic safety and essential performance of medical electrical equipment) and its "essential performance" idea
- [ ] STPA applied to medical devices (Leveson's work on infusion pumps), beside ISO 14971
- [ ] FDA MAUDE adverse event database and recall data as a post-market feed linked to interface keys
- [ ] The 2026 FDA final guidance on human factors content, read in full for its three categories and decision questions
- [ ] GRADE for diagnostic tests and for modelled evidence (GRADE's 2020s guidance on models), as a direct template for model nodes
- [ ] Cochrane's RoB 2 and ROBINS-I tools as per-source bias checklists for engineering papers
- [ ] Registered Reports and the Center for Open Science's pre-registration templates, for frozen checks
- [ ] Clinical decision rules (Wells score, Ottawa ankle rules) as small sourced decision nodes with known sensitivity
- [ ] FMI co-simulation of physiology models (Bodylight, Modelica Physiolibrary) beside Nexus's own solver
- [ ] Implant standards: ISO 5832 (implant metals), ISO 7206 (hip stems), ASTM F2996 (FE analysis of hip stems), as interface-with-bone cases
- [x] Ergonomic standards for VR headsets (IEC 63145, ISO 9241-392 on stereoscopic comfort) for Nexus's own hardware use (explored: 34)
- [ ] Medical gas, connector and luer misconnection standards (ISO 80369 small-bore connectors), extending 16's keyed ports

### From What things cost, and how markets behave (`29-cost-markets.md`)
- [ ] The full text of Ashby's cost chapter and Granta's process attribute ranges: what is open, what is licensed.
- [ ] Open machine-hour and labour-rate data by country (BLS OEWS, Eurostat, ILOSTAT) as the regional layer for should-cost.
- [ ] Feature-based machining cost from B-rep (setups, removed volume, tool access) on replicad solids.
- [ ] 3D-printing cost models (slicer time estimates, material, machine amortisation) as the first should-cost node.
- [ ] Total cost of ownership (Ellram) and life-cycle cost (maintenance, energy, disposal) beside purchase cost.
- [ ] Target costing and value engineering (Japanese genka kikaku): cost as a design input rather than an output.
- [ ] EN 15804 modules A–D and EPD registries (EC3 by Building Transparency, ÖKOBAUDAT) as open carbon sources.
- [ ] The Product Environmental Footprint (PEF) and its EF database, and the EU Digital Product Passport beyond batteries.
- [ ] Grid carbon intensity data (Electricity Maps, Ember) for converting process energy to carbon by place and hour.
- [ ] Material criticality methods (EU CRM list, Graedel's criticality space) as a richer supply-risk layer than import reliance.
- [ ] Herfindahl–Hirschman concentration from USGS world production tables, computed per element.
- [x] Inventory theory (EOQ, newsvendor, (s,S) policies) as nodes, and their relation to the Beer Game. (explored: 33)
- [x] Forrester's *Industrial Dynamics* (1961) and the system dynamics stock-and-flow notation as a board language. (explored: 33)
- [ ] Proper scoring rules (Brier, logarithmic) and prediction markets for contributed estimates.
- [ ] Combinatorial clock auctions and the FCC incentive auction (2016–17) as models for allocating scarce simulated resources.
- [x] Agent-based computational economics (Santa Fe artificial stock market, Sugarscape trade) for the living world. (explored: 33)
- [~] EVE's PLEX and real-money exchange, and other game economies with published data (RuneScape Grand Exchange). (touched in 33)
- [ ] Parametric cost estimating in aerospace and defence (NASA cost models, DoD should-cost reviews) and their open handbooks.
- [ ] Commodity price indices that are public-domain (World Bank Pink Sheet, IMF primary commodity prices) as LME substitutes.
- [ ] Kitting and BOM formats (IPC-2581, KiCad BOM, OpenBOM) for importing priced bills of materials.

## Branches grafted in round 6 (open)

### From The token experiment (`30-token-experiment.md`)
- [ ] Rerun the generation test at scale (20 repeats, Haiku and Sonnet, effort low, auto tool choice) with the repair loop on.
- [ ] Measure a whole agent run's token budget by phase (guide, find, card, build, results, answer, second judge).
- [ ] Cards printed as NBN template lines (`s:seed.spring-checked d= D= n= L=`): fewer tokens and fewer wiring faults?
- [ ] The `math.expr` card and every other block whose ports follow its settings: an audit of what the card shows.
- [x] Why `wire()` accepted `k.value>s.rate` on `seed.spring-checked`: the graph exemption, and every block it covers. (explored and fixed 2026-10-31: `../DEFECTS.md` D10)
- [ ] Strict tool schemas (`strict: true`) against the "nodes as a string" failure, and against invented keys.
- [ ] A provenance layer for labels in NBN, measured against the 7,663 label tokens of the starters.
- [ ] The house board's measured mass, 226,300 kg for a house, a car and a room: is `measure` counting something twice?
- [ ] Token counts for `change` diffs in NBN against JSON `change` objects, on real edit sequences.
- [ ] Prompt caching in practice: the guide's cache hit rate across agent calls, from `usage` in the agent's runs.
- [ ] Constrained decoding with a published grammar (llguidance, XGrammar) for local models, where the API cannot.
- [ ] A frequency-matched short alias table for the commonest blocks (`view.show`, `in.number`, `place`), measured.

### From A small trusted kernel (`31-trusted-kernel.md`)
- [ ] Verified interval arithmetic libraries (Coq's Interval package by Melquiond, Flocq) as a model for `interval.ts` and its proofs
- [ ] Shewchuk's adaptive exact geometric predicates and CGAL's exact-predicates kernel, as the base of `gap.ts`
- [ ] Certified collision detection: conservative advancement and interval continuous collision detection (Redon et al.), for the `sweep` kind
- [ ] VeriPB pseudo-Boolean proofs (Gocht, Nordström) for counting and cardinality constraints that CNF encodes badly
- [ ] Exact LP solvers with certificates (SoPlex's exact mode, QSopt_ex) as producers for `farkas.ts`
- [ ] Proof-carrying code's original encodings (Necula and Lee 1996), as a template for shipping certificates with shared blocks
- [ ] Lean's Kernel Arena and `comparator`: how Lean organises adversarial tests of its checkers, and what a Nexus arena would copy
- [ ] nanoda's design (Rust, independent of the C++ kernel) as a case study in writing a genuinely independent second checker
- [ ] Taylor models (Berz and Makino; COSY) and validated ODE solvers (CAPD, VNODE-LP) for certified motion and dynamics claims
- [ ] Certified FEA: a-posteriori error estimators with guaranteed bounds (equilibrated residuals, Prager–Synge) as certificates for stress claims
- [ ] Reproducible floating point across JS engines: how V8 and SpiderMonkey differ in `Math.*` accuracy, measured
- [ ] CakeML or Wasm-verified compilation (WasmCert, Iris-Wasm) for shipping a verified checker as WASM into the browser
- [ ] N-version programming studies (Knight and Leveson 1986) on correlated failures between independently written programs
- [ ] Assurance cases (GSN, SACM) as the format for the kernel's qualification dossier
- [ ] Spec mining from Alive2-style disagreements: using checker failures to find where Nexus's own semantics are vague
- [ ] Coq's and Isabelle's "proof term size" engineering (reflection, compressed certificates) for keeping Nexus certificates small enough to ship
- [ ] Machine-checked statics and structural codes (any work formalising Eurocode or AISC checks) as targets for the `farkas` and `cover` kinds
- [ ] AI red-teaming of verifiers beyond Lean (reports of AI finding soundness bugs in Coq, Isabelle, Z3) as a measure of how adversarial the in-app agent may become

### From Engines worth taking for early cutoff (`32-engines-to-adopt.md`)
- [ ] Skip (SkipLabs) reactive TypeScript services: an incremental engine aimed at services, not UIs; not looked at.
- [ ] `@lazy-promise/alien-signals`: how it adds async to alien-signals, and whether its pending model fits Nexus.
- [ ] Vue 3.6's `@vue/reactivity` source: what it changed from alien-signals while porting (effect scopes, `hasChanged`).
- [ ] TanStack DB's live queries: how `db-ivm` is driven from a reactive store, as a template for list ports.
- [ ] ElectricSQL's d2ts paper or notes on differential dataflow in TypeScript, and why they forked d2mini.
- [ ] Feldera's recursive SQL (fixpoints over Z-sets) as the model for a `loop` node over lists.
- [ ] Adapton's nominal memoisation in a TypeScript port, for row ids that survive reordering.
- [ ] Tarjan SCC display of loops on the canvas (HyperFormula's `TopSort.ts` is a short iterative implementation).
- [ ] WebCrypto SHA-256 cost for digesting large meshes in the browser, against a 64-bit hash.
- [ ] Canonical STEP or B-rep export from OpenCascade with timestamps and ids stripped, for a geometry digest.
- [ ] MobX's `comparer.structural` and `computed.struct`: an existing structural-cutoff API to compare with the digest.
- [ ] Svelte 5's 160× cellx outlier in the benchmark: what pathology it hit, so Nexus avoids the same.
- [ ] tldraw's `@tldraw/state` (signia's successor): it has history and diffs on computeds, close to list deltas.
- [ ] `$mol_wire`'s fastest-on-mol result: its "atoms with fibers" handle async by restarting; compare with Observable's supersede.
- [ ] Bonsai (Jane Street, js_of_ocaml): Incremental in the browser at scale, and what it costs in bundle size.
- [ ] Excel's multithreaded recalculation and its "thread-safe function" registration, for running pure blocks concurrently per Kahn level.
- [ ] Lean 4 or Roslyn incremental compilation as further evidence on what keeps cutoff effective (rust-analyzer's "positions sneaking in").

### From Stocks, flows and simulated societies (`33-stocks-flows-societies.md`)
- [ ] Sterman's "bathtub dynamics" studies (Sweeney and Sterman 2000): people misjudge stocks from flows; a Nexus teaching view.
- [ ] Loop dominance analysis (eigenvalue elasticity, pathway participation metrics) for showing which loop drives a run.
- [ ] System dynamics model validation tests (Barlas 1996; Forrester and Senge 1980 "Tests for building confidence").
- [ ] The Vensim and Stella conveyor and queue semantics, and their exact XMILE definitions.
- [ ] Inverse generative social science (Vu, Epstein et al., JASSS 26(2) 9, 2023): AI search for multiple generators.
- [ ] Artificial Anasazi (Axtell et al. 2002) as a calibrated historical ABM and its later critiques.
- [ ] Pattern-oriented modelling (Grimm et al. 2005, Science) as the validation method behind ODD's "patterns".
- [ ] MASON's Sugarscape reimplementation (Bigbee, Cioffi-Revilla, Luke 2005) and what it found.
- [ ] Agent-based macroeconomics (Eurace, the Mark-0/Mark-I models, the CRISIS project) and stock-flow consistent (SFC) models in post-Keynesian economics (Godley and Lavoie): a balance-sheet conservation discipline for money.
- [ ] The SFC "transactions flow matrix" (every row and column sums to zero) as a ready-made conservation check for money.
- [ ] MATSim (agent-based transport, day-plans and replanning) beside SUMO.
- [ ] The Intelligent Driver Model and the kinematic-wave (LWR) model as continuous counterparts docked to NaSch.
- [ ] The GAMA platform and its GAML language (spatial ABM with GIS) as an alternative to NetLogo.
- [ ] Starsim (IDM's successor framework to Covasim) and its multi-disease design.
- [ ] The RAMP/SPI-M model consensus process in the UK (several models compared before advice): docking as policy practice.
- [ ] Second Life's and Ultima Online's economies (UO's early resource collapse) as cautionary game-economy cases.
- [ ] Path of Exile and World of Warcraft gold sinks; Valve's Steam Market data and Yanis Varoufakis's work at Valve.
- [ ] The CoMSES Net model library and its ODD-required code release (computational model library and peer review badge).
- [ ] Reproducibility badges (ACM artifact badges, CODECHECK certificates) as a pattern for a Nexus "rerun" badge.
- [ ] Ecopath with Ecosim: mass-balanced food webs, a conservation-checked ecology model in wide use.

### From Human comfort and human load (`34-comfort-load.md`)
- [ ] ISO 7730:2025 (EN ISO 7730:2025) changes from the 2005 edition
- [ ] ISO 7933 Predicted Heat Strain and ISO 7243 WBGT for work in heat
- [ ] ISO 8996 metabolic rate and ISO 9920 clothing insulation as data tables for the thermal nodes
- [ ] The UTCI operational polynomial (Bröde et al. 2012) and its error against the full Fiala model
- [ ] JOS-3 or the Fiala model in open code, for a browser thermoregulation solver
- [ ] The Potvin 2021 Liberty Mutual equations and their coefficients
- [ ] ISO 11228-2 push/pull and ISO 11228-3 OCRA repetitive handling
- [ ] Rapid Upper Limb Assessment (RULA), REBA and the Strain Index as pose-based checks from a simulated motion
- [ ] Linder-Ganz and Gefen sigmoid parameters, and human tissue-engineered data
- [ ] ISO 2631-1 Annex D motion sickness dose value for vehicles and ships Nexus simulates
- [ ] IEC 61672-1 A-weighting filter tolerances and an open verified implementation
- [ ] Kim et al. 2014 on the rate of change of vergence–accommodation conflict, for zoom limits
- [ ] Varifocal and light-field headsets (Meta Half Dome, Butterscotch) and what they remove from the VAC check
- [ ] Neck load from headset mass and UI pitch (biomechanics studies of HMD wear)
- [ ] Gorilla-arm fatigue measures (Consumed Endurance, Hincapié-Ramos 2014) for ray and touch panels
- [ ] Meta Horizon OS VRC accessibility requirements (snap turn, seated mode) as checks
- [ ] Fast Motion Sickness scale (Keshavarz and Hecht 2011) and the Virtual Reality Sickness Questionnaire (Kim 2018)
- [ ] Saredakis 2020 and Howard and Van Zandt 2021 meta-analyses read in full for duration and individual differences
- [ ] WebXR's own exposure of focal distance, IPD and field of view (or the lack of it)
- [ ] Curved (cylindrical) panel layouts and their legibility versus flat panels at 40°–60° width

### From Repair, wear and the long life of things (`35-repair-wear.md`)
- [ ] The original Nowlan-Heap report (NTIS ADA066579), to settle the six-pattern percentages and read its exhibits.
- [ ] SAE JA1012 (the guide to JA1011) and Moubray's RCM II text, for the decision diagrams as data.
- [ ] ISO 9224 long-term corrosion models and ISO 9223 dose-response functions as nodes, tied to a world map of climate.
- [ ] FKM guideline tables of critical damage sums, and pyLife as a reference implementation to test against.
- [ ] Wilson and Latombe's non-directional blocking graph (1994) and its use in ASAP or Fusion 360 Assembly datasets for
- [ ] The "thousands of physically valid industrial assemblies" benchmark used in arXiv 2501.05156: its name and licence.
- [ ] iFixit's proxy-time table and tool scaling factors: whether published, and under what licence.
- [ ] EN 45554's full parameter tables and its Annex on fasteners, and EN 45552 (durability) and EN 45553 (remanufacture).
- [ ] The JRC repairability methods for laptops and other product groups now in preparation under ESPR.
- [ ] Digital Product Passports under ESPR (Regulation 2024/1781) as the format a Nexus product could export.
- [ ] Damage-tolerant design rules (FAA AC 25.571, widespread fatigue damage) as a worked case for `inspect.interval`.
- [ ] Prognostics and health management (remaining useful life estimation, particle filters) as the live counterpart.
- [ ] Wöhler's railway axle tests (1850s-60s) and the Comet as historical cases for the gallery.
- [ ] Solder-joint fatigue models (Engelmaier) and IPC-9701 for electronics mission profiles.
- [ ] Japanese wooden-joint (sashimono, tsugite) carpentry as design for disassembly without fasteners.
- [ ] Repair cafés and Restart Project fault data (Open Repair Data Standard) as real failure-mode statistics.
- [ ] Fairphone and Framework laptop teardown data as sources of priority-part weights and module designs.
- [ ] Bicycle and car service manuals (torque tables, service intervals) as sourced maintenance tasks to import.
- [ ] Availability and spares optimisation (METRIC, Sherbrooke) for fleets in the living world.
- [ ] Wabi-sabi and kintsugi: visible repair as a value, for how Nexus draws repaired parts.

## Rounds

| Round | Date | Passes | Branches explored | New branches grafted |
| --- | --- | --- | --- | --- |
| 1 | 2026-10-31 | 01 to 05 | AI CAD, topology and mating, agents and structure, civil and names, search and perception | — (the tree did not exist yet) |
| 2 | 2026-10-31 | 06 to 11 | engineering and languages, life and equations, mathematics, games and the vast, philosophy, prompts and judges | the open branches above, from what the passes touched in passing |
| 3 | 2026-10-31 | 12 to 17 | nature's collective genius; crafts, toys and ancient engineering; sound, film, magic and experiences; safety and failures; commons and citizen science; unseen sciences, old games and cooking | 128 |
| 4 | 2026-10-31 | 18-self-describing-interfaces.md, 19-physics-core-browser.md, 20-organisations-accidents.md, 21-space-city-grammars.md, 22-growth-self-organisation.md, 23-truth-at-scale.md | Self-describing interfaces; The physics core in a browser; Organisations that do not fail, and deep accidents; Grammars of space and cities; Growth and self-organisation; Keeping knowledge true at scale | 124 |
| 5 | 2026-10-31 | 24-quantity-kinds.md, 25-incremental-computation.md, 26-proofs-and-programs.md, 27-notations.md, 28-body-medicine.md, 29-cost-markets.md | Quantity kinds done right; Incremental, lazy and demand-driven computation; AI that proves, and shapes that explain themselves; Notations; The body as an engineered system, and medicine's safety; What things cost, and how markets behave | 120 |
| 6 | 2026-10-31 | 30-token-experiment.md, 31-trusted-kernel.md, 32-engines-to-adopt.md, 33-stocks-flows-societies.md, 34-comfort-load.md, 35-repair-wear.md | The token experiment; A small trusted kernel; Engines worth taking for early cutoff; Stocks, flows and simulated societies; Human comfort and human load; Repair, wear and the long life of things | 107 |
