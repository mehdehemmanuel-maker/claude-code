# The next plan: research, structure, and the build in order (2026-10-31)

The user asked, before anything is built, for research into the new AI and CAD tools, how they work inside, what to
take from each, and one plan stitched from them that fits where Nexus is now, with a structure that keeps a long
AI-built project from forgetting, drifting or going in circles. Their words are in `WANTED.md` (2026-10-31, the last
entries). This file is that plan. Nothing in it is built yet. The research notes behind it were five research passes
(AI and "vibe" CAD tools; topology, mating and geometric deep learning; world models and agent engineering; civil
engineering data and taxonomies; search, perception and the phone app), each with its sources; the links that carry a
decision are given where the decision is.

Marks: **[measured]** checked here, in the code or by running it; **[source]** said by a source named beside it;
**[judgement]** this plan's own call.

---

## Part 1. What the user asked for, item by item

| They said | What it means for the build | Where in this plan |
| --- | --- | --- |
| "1" (put it on the web) | the app outside the container, so phones, headsets and friends can reach it | Phase 1 |
| "2 … variants I can choose whether I'm ghost mode … change my perception, change time, change my sight" | controls into real physics, and perception modes: ghost, scale, time, sight | Phase 4 |
| "skip 3 for now" (shared library, friend in the world) | not planned now; Phase 1 is built so it can be added | the end |
| "4 populate the civil engineering" | civil nodes from sourced, legally usable data | Phase 5 |
| "5 … advanced topology … geometry mating or inverting … paste a bolt's input geometry into a surface of anything" | one general interface model: every part carries its negative, pasted onto any surface; changes that follow | Phase 3 |
| "faster searches, advanced names … subcategories … don't make those count as nodes" | a names index apart from the node library, and search in tiers | Phase 2 |
| "phone layout, colourful, Iron Man JARVIS phone app, named Moosky" | a phone app over the same core | Phase 6 |
| "how do we structure this so we don't mess up, forget, go in circles, or trip" | executable rules, specs with failing tasks, decision records, evaluation sets, hooks | Phase 0 |

---

## Part 2. What the research found, and what to take

### 2.1 AI and "vibe" CAD tools

- **The field has settled on one shape**: a model writes editable source, and a real kernel runs it [source: Zoo's KCL,
  VibeCAD's VibeScript on FreeCAD, CADAM's OpenSCAD, VibeSCAD's OpenSCAD and BOSL2, CAD-Recode's CadQuery,
  CAD-Assistant's FreeCAD Python]. Nexus already has this shape: the in-app AI writes a board (a plan of nodes), and
  the node engine and OpenCascade run it. **Keep it.** A board is our source.
- **Numbers beat pictures as the check** [source: BenchCAD (benchcad.com): a harness never shown its own renders scored
  the same at about half the cost; ModelRift: renders "caught nothing that mattered", every print-ruining defect was
  found by a number; Spectral Labs counts an answer right only within 0.1 % on volume, centre of mass or a distance;
  CADCodeVerify's picture-based verifier was right only 64.6 to 68.2 % of the time]. **Take:** numeric assertions as
  the AI's first check; pictures second.
- **Assemblies fail on placement, not shape** [source: BenchCAD 2.0: of the part types scoring zero, 83 to 96 % had the
  right shape in the wrong place]. **Take:** the AI places by mating ports, never by raw positions, and every mate
  reports its residual (how far off, which way it faces, whether it is flipped).
- **An accepted revision, with candidates beside it** [source: vibecad.studio, the open FreeCAD fork: programs run in an
  isolated worker and "publish only validated results… failed candidates remain inspectable without replacing the
  accepted revision"]. **Take:** the AI builds into a shadow board; it replaces the open board only when its checks
  pass.
- **A small turn context, not the whole conversation** [source: vibecad.studio sends the tool surface, the document,
  the selection and one domain state each turn; Zoo's Zookeeper keeps `AGENTS.md` and its own notes]. Nexus's agent
  already sends a cached `FOR-AI.md`; **take** selection awareness and a one-line board state (what fails, what clashes).
- **Sliders that never call the model** [source: CADAM: after generation, parameters become sliders and a move is a
  deterministic edit]. Nexus's graph does this already; **take** "promoted parameters" on a folded block, shown as
  sliders.
- **Standards looked up, never guessed** [source: VibeSCAD looks up thread pitch and clearances; Leo AI searches vendor
  parts]. Nexus's sourced families already do this; **take** a lookup that records where each value came from.
- **Stable names for faces** [source: Zoo's KCL tags (`$top`, `getOppositeEdge`); CAD-Assistant overlays primitive ids
  on renders]. **Take:** named faces and ports the AI can address, and ids drawn on the picture when it is shown one.
- **implicit.build**: a browser lattice designer on PicoGK (LEAP 71's signed-distance kernel) compiled to WebAssembly,
  with its own STEP import; TPMS (gyroid, Schwarz, diamond and others), beam and Voronoi lattices graded by stress;
  "a design starting point, not a test", in its own words [source: implicit.build]. No language model in it, and no
  B-rep out. **Take:** lattices and stress-graded infill as an implicit branch beside our B-rep, labelled approximate.
- **NVIDIA USD BRep 1.0** (Apache-2.0, 2026-10-08): an open B-rep kernel with a healer and a validator [source:
  github.com/NVIDIA-Omniverse/usd-brep]. **Watch**, not adopt: OpenCascade serves us; its heal-then-validate idea we take
  with OpenCascade's own ShapeFix, which the build we use exposes [measured: `ShapeFix_*` classes in replicad's
  OpenCascade build].

### 2.2 Topology, mating and inverting (the user's "paste a bolt's input geometry into anything")

- Every serious tool splits it in two [source: Onshape mate connectors; build123d joints; SolidWorks Hole Wizard and
  Smart Fasteners; Inventor iMates and iFeatures; Fusion joints]: (a) **a typed frame**, which partner is legal and
  what freedom is left; (b) **a tool body**, the negative the partner must receive. Only SolidWorks Smart Components
  ties the negative to the part, and even that is a feature recorded in the host, not derived. **No tool derives the
  negative from a part's standard and its fit class in one general model**: that is where Nexus can lead [judgement].
- **Never name a face by its index** [source: FreeCAD's topological-naming problem, fixed in 1.0 by naming faces by
  their history; Onshape resolves references by queries over stable feature ids]. Replicad exposes OpenCascade's
  shape history, which is what naming by history needs [measured: `BRepBuilderAPI_MakeShape` and its
  `Generated`/`Modified` in replicad's build].
- **Constraints**: every mate an equation; solve by least squares; the honest count of freedom left is the rank of the
  Jacobian; name the smallest conflicting set by removing one mate at a time; split into rigid clusters first
  [source: SolveSpace; D-Cubed DCM; FreeCAD's planegcs, available as WebAssembly under MulanPSL-2.0].
- **Implicit fields beside B-rep**: B-rep stays the truth for standard parts and STEP; signed distance becomes the
  fast check layer (wall thickness, room for a socket) and the body for lattices, blends and topology optimisation
  output, meshed for 3MF and STL and said to have no exact STEP [source: nTop; Parasolid's convergent modelling, whose
  persistent implicit objects are still "future" (CIMdata, 2026)]. Mesh with `manifold-3d` (WebAssembly).
- **Learned models**: none in the running path. Use the public assembly datasets (AutoMate's Onshape mates; Fusion 360
  Gallery's joints) as an **evaluation set** for our rule-based mate finder, licences checked first. UV-Net (MIT) for
  recognising features on imported STEP later, as suggestions the rules confirm. BRepNet is non-commercial.

### 2.3 World models, Roblox, Cascadeur, NVIDIA, Motorola

- **Roblox Cube** [source: github.com/Roblox/cube; Roblox newsroom 2026-02 and 2026-04]: functional objects come from a
  *schema* of named parts ("Car-5": a body and four wheels), and a fixed script is *retargeted* to the measured sizes.
  Studio's Planning Mode writes a reviewable plan and a task manifest; a Playtesting Agent tests the game against the
  plan with the player's character. **Take:** schemas of named slots for kinds of thing; behaviour bound to slot
  names; the walker as the playtester against a plan's acceptance lines.
- **DeepMind** [source: deepmind.google; Genie 4 announced 2026-10-27]: world models (Genie) hold together for minutes
  and know no masses, so they are a preview at most, never the truth; SIMA 2 keeps a bank of its own attempts and
  scores; AlphaProof and AlphaGeometry propose with a model and prove with a checker; AlphaEvolve searches programs
  with a model and keeps a diverse archive scored by real evaluators. **Take:** a bank of the AI's attempts and their
  scores; the rule that nothing enters the library unless the checks pass; an Evolve node that refuses to run without a
  real evaluator.
- **Cascadeur** [source: cascadeur.com docs]: AutoPhysics shows a physically corrected **ghost** beside the keyed
  motion and colours the timeline by how well supported each moment is; the animator chooses to take it. **Take:** a
  physics corrector for machines and bodies that shows the feasible motion beside the asked one (a motor saturating, the
  centre of mass leaving its feet) and is accepted, never silently applied.
- **NVIDIA OpenUSD** [source: aousd.org, Core Specification 1.0, 2025-12]: its composition (references stored once,
  variants, inherits, payloads loaded lazily, layers that override above a base without editing it) **is** our library
  law, standardised. **Take:** the semantics in our assembly model, and USD import and export later. Cosmos Reason, a
  model that judges physical plausibility, suggests a **plausibility gate** beside our symbolic checks.
- **Motorola**: nothing 3D, spatial or design-related was found; Moto AI became Lenovo and Motorola **Qira**, a
  cross-device assistant [source: news.lenovo.com, 2026-01]. The one idea: one assistant memory across laptop,
  headset and phone (Moosky). **Asked below** what was meant.

### 2.4 Keeping a long AI-built project straight

- **Anthropic's long-running harnesses** [source: anthropic.com/research, "Effective harnesses for long-running agents"
  and "Harness design for long-running apps"]: an external, machine-readable list of features that all start failing;
  each session reads the progress file and the git log, does one feature, tests, commits, leaves it clean. Planner,
  generator and a separate **evaluator**, because "agents reliably skew positive when grading their own work"; the
  evaluator calibrated against human judgement with scored examples; a contract of testable criteria agreed before
  each sprint.
- **Cursor** [source: cursor.com/blog/scaling-agents]: flat peers with locks failed; planners making tasks for workers
  who do one thing each, with a judge, and periodic fresh starts "to combat drift and tunnel vision", worked.
- **Spec-driven development** [source: GitHub Spec Kit; Kiro]: a constitution, then per feature requirements (Kiro's
  EARS form, "WHEN … THE SYSTEM SHALL …"), design and tasks traced back to requirements.
- **What the evidence supports** [source: ETH Zürich, arXiv 2602.11988, as reported second-hand: context files written
  by a model cost about 20 % more and helped nothing; written by people, about +4 %; a follow-up calls the evidence
  contradictory]. The better-supported practices are executable checks, a separate evaluator, fresh contexts with
  handoff files, and planners over workers [judgement from the sources above]. **Our `CLAUDE.md` stays a router, not a
  summary**, which matches.

### 2.5 Civil engineering data (what may be copied)

- **Usable in an open repo** [source: each one's licence page]: EN steel sections from `ulmewix/Steel_Section_Database`
  (MIT; leaves missing values empty), cross-checked against `timskovjacobsen/steelprofiles_api` (MIT); FHWA public
  documents (the 10 controlling design criteria; HDS-5 culverts); OpenStreetMap's infrastructure tags (ODbL, with
  attribution); IFC 4.3 (ISO 16739-1:2024: roads, rail, bridges, ports; CC BY-ND, kept unmodified); `web-ifc` to read
  IFC in the browser (MPL-2.0); Uniclass 2015 (CC BY-ND, kept unmodified); ETIM (ODC-BY, free); Wikidata (CC0) for
  synonyms and translations; the USDA Wood Handbook (public domain).
- **Not usable**: the AISC Shapes Database (personal, non-commercial; a person may import their own copy locally),
  ECLASS, MasterFormat. **Unclear**: OmniClass, UNSPSC, CoClass (its steward is changing), ArcelorMittal's tables.
- **Names are free; tables are not**: designations ("C30/37", "#5 bar", "IPE 300", "GW") may be indexed; a standard's
  tables may not be copied. Where a value follows from a name (a bar's area from its diameter), it is derived and said
  so [source: the civil research pass; not legal advice].

### 2.6 Search, perception, the phone app

- **Search** [source: the uFuzzy benchmark, 162k phrases: uFuzzy about 5 ms a query with no index; FlexSearch about 1 ms
  but 3.2 s to build and 670 MB at its peak; MiniSearch about 17 ms; Fuse.js about 390 ms]. Ours measures about 12 ms
  over 8,000 entries [measured]. **Take:** three tiers: exact names, codes and aliases in a sorted table (under a
  millisecond); a fielded fuzzy index built at build time and loaded, in a worker; meaning search over the nodes and
  categories only (about 600 vectors, not 70,000), precomputed, the query embedded on the device by a small model
  (all-MiniLM, about 23 to 35 MB), fused by reciprocal rank (k = 60, Cormack 2009). No phone latency for embedding was
  found: **measure it** before relying on it.
- **Ghost mode** [source: Scientific Reports 2025, n = 15: sickness 1.8 for teleport, 2.3 for a stick, 2.9 for
  Cybershoes, of 5]: collisions off and flight in six directions; teleport by default, smooth flight as an option,
  constant speed, snap turns, the view's edges darkened while moving.
- **Scale, ant to giant** [source: Kim and Interrante 2017; PLOS One 2020]: a headset's eye separation is fixed, so the
  world is scaled about your feet; speed and the near plane scale with it; the change eased over half a second in log
  space; a readout ("1:50") and something of known size beside you.
- **Time** [source: Jonathan Blow, GDC 2010, Braid's rewind]: a fixed step with a time-scale on the accumulator; pause is
  scale 0; rewind from a ring of saved states plus replayed steps; your own head and hands stay on real time. Our
  physics already steps at a fixed 1/240 s and records a track [measured: `sim.ts`].
- **Sight**: x-ray (rim-lit, see-through), edges, thermal and stress as a value per piece through a colour map (viridis
  for truth, a "thermal look" said to be a look), night vision, section planes, exploded. Our views already draw
  fields, bending, cutaways and explodes [measured: `space3d.ts`, `dock3d.ts`]; these become one switchable "sight".
- **The phone app**: the Iron Man interfaces were designed by Perception and Cantina Creative; Jayse Hansen's "HUD Bible"
  breaks them down [source: vfxblog, cgw.com]. Five anchors always there, situational widgets fanning out of a core,
  one hue for each mode, glass used sparingly (blur is costly on phones), motion of 150 to 300 ms, reduced motion
  respected. Voice by the Web Speech API first; a small on-device model (Moonshine tiny) where it is missing. On iOS a
  web app is installed by Share, Add to Home Screen; nothing prompts.
- **The name "Moosky"** [source: USPTO registration 6333775, MOOSKY, live, class 26 (hair accessories); two Japanese
  registrations, classes 8 and 20; **moosky.ai**, an AI video, image and voice platform]. No registered mark was found
  in software classes, but moosky.ai is in the same space. **Not legal advice**: a clearance search, or a variant name,
  before publishing. Asked below.

---

## Part 3. The structure that keeps this straight (Phase 0, before any feature)

What already exists [measured]: `CLAUDE.md` as a router; the user's words (`WANTED.md`); one owner per concern
(`OWNERS.md`); the order (`ROADMAP.md`); the measured log (`REALITY.md`); the gate (type check and one test, about
48 s); tests that hold navigation, routing and the library law. What it lacks: rules that are checked rather than
remembered, tasks that start failing, decisions that cannot be silently re-argued, and a judge that is not the builder.

1. **`docs/CONSTITUTION.md`: the rules, each with the check that enforces it.** About fifteen invariants, each with a
   check id and the test or hook that runs it ("every number sourced" → the provenance check; "the library law" → the
   stock test; "no file without an owner" → the routing test; "nothing counts as a node unless it runs" → the names
   index test). A rule with no check is listed as **unenforced**, so the gaps are seen.
2. **`specs/<feature>/`**: `requirements.md` (each line "WHEN … THE SYSTEM SHALL …", tagged with the `WANTED.md` entry
   it serves), `design.md` (which owners it extends, what it adds), and `tasks.json` (each task `failing` until its
   check passes; its owner; its check; its change budget). A task is done when its check passes, not when the builder
   says so.
3. **`docs/decisions/NNNN-title.md`**: a decision record each time a choice is made (the options, the choice, the
   assumption it rests on, when to re-test it). Before reopening a question, the record is found and cited. This is
   the cure for going in circles.
4. **`evals/`**: fixed sets that measure what the user cares about, never tuned to pass:
   - the AI: 30 requests with checked answers (steps, tokens, seconds, right or wrong), run after each change to
     `agent.ts` or `FOR-AI.md`;
   - mating: real assemblies' mates (from the public datasets, licences permitting, and our own engines), scored on
     placement;
   - products: real products with their published figures (the Monte Carlo, the Corolla, a NEMA 17 motor, an EN beam);
   - search: the plain and misspelt questions, grown from what people actually type.
5. **`PROGRESS.md`**: short, rewritten at the end of each session: the spec in hand, the last green commit, the next
   three tasks, what blocks. `REALITY.md` stays the append-only log of what was measured.
6. **Hooks, so the rules do not depend on memory** (`.claude/settings.json`, project hooks):
   - **change budget**: a commit touching more than its task's owner (plus tests and docs) is refused unless a decision
     record says why;
   - **loop breaker**: three failed checks on one task, or two minutes on one run, stops the work and asks "is a
     pipeline missing?" (the rule we already have, now enforced);
   - **honesty gate**: a line added to `REALITY.md` or `PROGRESS.md` with a number must name the command it came from;
   - **push gate**: no push unless the gate passed on that commit (the 2026-10-31 slip, when a red commit was pushed
     because the chain did not wait on the gate, is what this prevents).
7. **The loop for every task**: read the router, `PROGRESS.md`, the spec and the owner's row; write what will change
   and which checks will prove it; build within the budget; run the checks; then a **fresh evaluator** (a separate
   agent with no view of the builder's reasoning) reads the spec and the result, drives the app (a screenshot, the
   walker as playtester) and passes or fails it; then commit, update the task, the progress and the log.

Done when: the constitution lists its checks; one spec (Phase 2's) is written in this form and its tasks start
failing; the four hooks refuse what they should (each tried once, on purpose); the AI's evaluation set runs and gives
today's numbers as its baseline.

---

## Part 4. The build, in order

Each phase names the owners it extends (no second owners), what it adds, how we will know it is done, and what could
go wrong. Sizes are guesses and are said to be.

### Phase 1. Out of the container (the web)

- **What**: the pages as a static site; the AI relay as a small server function holding the keys (never in a page);
  the WebAssembly kernel and physics served with the headers they need (the threaded builds want cross-origin
  isolation).
- **Owners**: `vite.view.config.ts` (the build); a function for the relay beside it.
- **Done when**: a phone and a Quest open one link; the Controls board works on each; Ask Claude answers through the
  hosted relay; screenshots from the devices themselves.
- **Risks**: where to host is the user's account and choice (asked below); WebAssembly size on phones; the relay's cost
  needs a limit.
- **Size**: one to two sessions [guess].

### Phase 2. Search in tiers, and the names index

- **What**:
  - **The names index**, apart from the node library: entries `{id, term, synonyms (alternative, abbreviation,
    misspelling, trade name, plural), category path (the disciplines tree's ids), routes to (nodes, with a weight and
    why; may be empty), broader, narrower, related, equivalents in other schemes, source (scheme, code, version, link,
    licence, date)}`. A name with no node routes to its broader name until one has a node, and says "nearest real
    node". It never counts as a node: the node count stays what runs, and a test holds it.
  - **First names**: IFC 4.3's entities and types (the spine for buildings, roads, rail, bridges, ports), Uniclass's
    tables, OpenStreetMap's infrastructure tags, designation vocabularies (soil groups, concrete and timber classes, bar
    sizes, section series), ETIM's product classes, Wikidata's aliases. Each file kept as its licence requires (the
    no-derivatives ones unmodified, with our mapping beside them).
  - **Search in tiers**: exact names, codes and aliases (under 0.2 ms, the target); a fielded fuzzy index built at
    build time, loaded, in a worker (1 to 3 ms, the target); meaning search over nodes and categories, fused by rank.
    Measure each tier on the weakest phone before relying on it.
- **Owners**: `navigate.ts` (search), a names data folder under `src/data/`, the gate's navigation test.
- **Done when**: every node still first by name and id (the test we have); "W14", "C30/37", "culvert", "bridge
  bearing", "IfcBeam" route to the right node or say the nearest; a query under 3 ms on a mid-range phone, measured; the
  node count unchanged by the names.
- **Size**: two sessions [guess].

### Phase 3. The interface model: parts that carry their negative

The user's "make a bolt, paste its input geometry into the surface of anything". General, not per thing.

- **One interface record** on any part, growing `Port` and `Iface` in `kits.ts`:
  - a stable, hierarchical **id** (`bolt.M8x30/shank`), never an index;
  - a **frame** (origin, z, x) and a parametric **pattern** (a circle n × r, a grid, a list);
  - a **kind** and the **rule of what mates with it** (external thread M8 ↔ internal thread M8 or clearance M8
    fine/normal/coarse; shaft ⌀d h6 ↔ bore ⌀d H7), with the joint it makes and the freedom left;
  - **demands**: tool bodies with roles: *remove* (clearance or tap-drill hole, counterbore, countersink, nut pocket,
    keyway), *keep* (room for a wrench or socket, the volume a motion sweeps), *add* (a minimum wall round it: a
    condition checked, never grown), *contact* (the face that must bear). Each tool body is made from the interface's
    sizes and its **standard's table**, sourced (ISO 273 clearance, which we have [measured: `kinds/motion.ts`]; ISO 965
    tap drills and ISO 286 fits, which we do not yet);
  - one definition giving three forms: an exact solid (OpenCascade), a signed distance (fast checks), a mesh (preview).
- **Imprint** (`imprint(interface, host, where)`): pick a point on any face; the frame stands on the surface's normal
  there; the host's signed distance says whether there is wall enough and room to work; the reason is said if not; the
  host gains the negative **and** the mirrored interface, so a hole finds its bolt as a bolt brings its hole. Faces are
  referred to by what made them (OpenCascade's history, which replicad exposes [measured]), never by number.
- **Changes that follow**: named quantities (`boltCircle.r`, `bore.d`) that every part reading them shares, not copies;
  relations as rules (`boltCircle.r ≥ bore.d / 2 + k·d`, k sourced or labelled typical); cycles solved together
  (`numeric.ts`); the order of a change: quantities → frames and patterns → tool bodies → imprints → the solids
  touched → placement → checks, each step said.
- **The placement solver** (`placement/proximity.ts`, still the only one): freedom left from the rank of the
  Jacobian; mates that agree said as a note, mates that fight said as an error naming the fewest that fight; rigid
  clusters solved apart.
- **For the AI**: it places by mating interfaces, never by typed positions; each mate reports its residual (distance,
  angle, flipped or not); numeric assertions (volume, mass, centre of mass, box, least wall, clearance, interference)
  are nodes it checks first; it builds into a shadow board, published only when the checks pass.
- **Owners**: `kits.ts`, `mate.ts`, `assembly.ts`, `placement/proximity.ts`, `brep.ts`, `numeric.ts`, `agent.ts`.
- **Done when**: a bolt dropped onto a bracket's face cuts its clearance hole, its counterbore and its keep-out, and
  says when the wall is too thin; widening a bore moves its bolt circle, the bolts and the cover's holes; the mate
  evaluation set scores our finder on placement; the AI's evaluation set shows fewer wrong placements than today.
- **Risks**: imprinting on curved or thin hosts (fail with a reason first; project later); who owns a shared pattern
  (proposed: the joint, as Fusion and build123d have it; asked below).
- **Size**: four to six sessions [guess]; the largest phase.

### Phase 4. Being in it: physics, ghost, scale, time, sight

- **Controls into the physics**: the stick drives a body in Jolt (wheels with friction, a motor's torque from its
  curve, collisions); the walker gets a body (gravity, walls, stairs, doors that open by the agents' door logic).
- **Perception, chosen from a ring** (keys, the drawn controls, a headset's menu): *walk* (a body), *ghost* (collisions
  off, flight, teleport by default), *scale* (ant to giant, the world scaled about your feet, eased, a "1:50" readout),
  *time* (slow, fast, pause, rewind, from saved physics states; your hands on real time), *sight* (normal, x-ray,
  edges, heat, stress, night, cut, exploded; every colour map with its legend and range).
- **The physics corrector** (Cascadeur's ghost): a motion asked for is shown beside the motion the parts can make, the
  timeline coloured by where it fails (the motor saturates; the centre of mass leaves the feet), and taken only when
  chosen.
- **Owners**: `sim.ts`, `controls.ts`, `view/pad.ts`, `view/space3d.ts`, `view/dock3d.ts`, `view/space.ts`.
- **Done when**: the cart pushes a crate and stops at the tower; ghost passes through it; scale to 1:100 and walk a
  bolt's thread; rewind ten seconds and the crates stand again; each sight mode on the engine, screenshots of each; on
  a real phone and a Quest after Phase 1.
- **Size**: three to four sessions [guess].

### Phase 5. Civil engineering, populated

- **Nodes from usable sources**: EN steel sections (MIT data, cross-checked against a second source; a disagreement is
  checked, never tuned away); bar sizes and concrete and timber classes (areas derived and said so; strengths only
  where a public source gives them); soil groups (USCS and AASHTO names; their rules from the public USBR text);
  culverts and the road's controlling criteria (FHWA, public); a reader for real IFC 4.3 bridges and roads (`web-ifc`),
  so a real model can be opened and taken apart into nodes.
- **Things built from them**: a beam sized for its span and load (by the frame analysis we have [measured: `bend`]), a
  column, a footing, a culvert under a road, a bolted steel connection (by Phase 3's interfaces), a bridge span from
  its parts.
- **Owners**: `src/data/` (sections, classes), `kinds/` (bought structural parts), `seeds.ts` (roads, bridges),
  `blocks.ts` (the nodes), the disciplines tree's 11 civil branches (today nearly empty of nodes [measured]).
- **Done when**: each civil branch has nodes; a real IFC bridge opens and explodes; each figure has its source or is
  marked derived; loads that have no open source stay inputs a person gives, said so.
- **Size**: three sessions [guess].

### Phase 6. Moosky, the phone app

- **What**: an installable web app over the same core (after Phase 1): a dark base, one hue for each mode (cyan to
  move, amber to warn, magenta for time, green for sight), five anchors (status, the world, the board, Claude, sight)
  with widgets fanning out of a core; voice (speak a request to Claude; "ghost on", "scale ant", "rewind ten
  seconds"); the phone as a remote for a headset later.
- **Owners**: a new page under `view/` with its module in `nexus/view/`; the agent's relay; `pad.ts` for controls.
- **Done when**: installed on an iPhone and an Android phone; a board built by voice; the modes switched by voice and by
  touch; within the frame budget on each.
- **Risks**: the name (asked below).
- **Size**: two to three sessions [guess].

### Phase 7. Further, once 1 to 6 hold

- **An Evolve node**: a board as the genome, a model proposing changes, our checks as the scorers, a diverse archive of
  the best; it refuses to run where no real check exists.
- **Lattices and topology optimisation** (implicit bodies, graded by CalculiX stress, meshed, labelled approximate).
- **Schemas of named slots** for kinds of thing, behaviour bound by slot and fitted to measured sizes.
- **Composition as OpenUSD has it** (references, variants, inherits, payloads, layers over sourced data); USD import
  and export.
- **A bank of the AI's attempts and scores**, fed back as examples; a plausibility gate looking at pictures beside the
  symbolic checks.
- **A shared library and a friend in the world** (the skipped item 3), on Phase 1's hosting.

---

## Part 5. What not to do, and why

- **No learned model in the running path** for geometry: none makes exact, standard-true, sourced parts; they suggest,
  the rules decide [judgement from 2.2].
- **No pixel world model as the world**: minutes of coherence, no masses [source: Genie 3's own limits].
- **No copied standard tables**, no AISC file in the repo, no ECLASS or MasterFormat [source: their licences].
- **No second owner**: every phase extends the owners named; a new file only where no owner exists, and then a row.
- **No counting names as nodes**: the node count is what runs.
- **No checks by picture alone**: numbers first [source: 2.1].

---

## Part 6. Questions

### For the user (each changes what gets built)

1. **Hosting** (Phase 1): which service may hold the pages and the relay? The research found nothing that decides it;
   Supabase is connected to this account (its functions could hold the relay); a static host needs an account of
   yours. Is there a monthly limit for the AI's cost?
2. **Motorola**: which work did you mean? The search found Lenovo and Motorola's Qira assistant and nothing 3D.
3. **The name Moosky**: moosky.ai is an AI video and voice platform, and "MOOSKY" is registered for hair accessories
   in the US. Keep it (a clearance search first), or a variant?
4. **The phone app**: a web app only, or also a store app (a native wrapper) later?
5. **Change budget**: how large may one task be before a decision record is needed, and do you want to approve those
   records, or should the evaluator?
6. **The first golden products**: which five to ten real things should every change be measured against?
7. **Who owns a shared bolt circle**: the flange, the cover, or the joint between them (proposed: the joint)?
8. **Sketches**: do you want to draw 2D profiles by hand (which needs a sketch solver), or are all profiles made from
   parameters?
9. **The evaluator**: a different model from the builder (as Anthropic's results suggest), at more cost?

### Still open in the research (to keep asking)

- How fast is a small embedding model on a mid-range phone and on a Quest, and is WebGPU there?
- Do MiniSearch or uFuzzy hold under 3 ms on our 70,000 entries on the weakest device?
- Is Jolt deterministic across runs in the browser, so rewind replays exactly? (It steps at a fixed 1/240 s
  [measured]; determinism across machines is not checked.)
- Do the assembly datasets' licences allow use as an evaluation set (AutoMate on Zenodo; Fusion 360 Gallery)?
- Under a no-derivatives licence (IFC, Uniclass), is a separate file mapping their codes to our nodes allowed?
- Which open source gives design loads (ASCE 7, Eurocode 1) as data? None was found; until one is, loads are inputs.
- Who makes implicit.build, and is a language model planned there? (Its site shows no team and version 0.0.0.)
- Does picture-based checking still add anything with 2026's models, beyond measured assertions? BenchCAD says not for
  reconstruction; untested for assemblies.
- How does Zoo keep its face tags stable when topology changes? (Not public.)
- Where do our AI's steps and tokens go on the evaluation set, and what is its failure rate today? (Measured in
  Phase 0.)
