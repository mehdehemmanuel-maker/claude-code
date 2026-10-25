# The node engine: a universal, colourful node pipeline

Plan draft 1, 2026-10-25, with the first build (same day) recorded in [§0.1](#01-what-is-built-and-measured).
Targets marked **target** are goals that will be measured. Only §0.1 says what already runs.

**Contents**
0. [Destination](#0-destination)
1. [What already exists, and what this grows from](#1-what-already-exists-and-what-this-grows-from)
2. [The core model](#2-the-core-model)
3. [Everything a node can be](#3-everything-a-node-can-be)
4. [Everything a node can do](#4-everything-a-node-can-do)
5. [Trees inside the graph: branch, prune, merge, version](#5-trees-inside-the-graph)
6. [How it gets smarter](#6-how-it-gets-smarter)
7. [How it stays efficient](#7-how-it-stays-efficient)
8. [The library](#8-the-library)
9. [Colour and look](#9-colour-and-look)
10. [The environment](#10-the-environment)
11. [Stress testing](#11-stress-testing)
12. [Milestones](#12-milestones)
13. [Risks](#13-risks)
14. [Questions for you](#14-questions-for-you)

---

## 0. Destination

You open one canvas, flat on a screen or around you in the forge. Every kind of work is coloured blocks wired
together: an engineering calculation, a part being designed, a business's money, a piece of code, a whole factory.
Any block opens into the pipeline inside it, which can branch, be cut back and be folded up into a new block of its
own. That new block goes into a library sorted by domain and by ability, so it can be reused anywhere, the way
`use("bolt M8x30")` already reuses a part. The engine keeps a record of what is used, what repeats and what is dead.
From that record it offers merges, cuts and new blocks, and it only re-runs what changed.

**Done means all of these hold, each measured (§11):**
- One graph format and one runner hold every domain. No domain has code of its own in the engine, only blocks.
- A block made from a sub-pipeline behaves exactly like a built-in block: it can be searched for, versioned,
  tested and placed anywhere.
- The stress suite in §11 passes at its stated scale targets, and its numbers are published with the code.
- A person who has never seen it builds a working calculator chain in under five minutes (**target**, checked by a
  blind trial with an agent and with you).

### 0.1 What is built and measured

Open `view/nodes.html` (build with `npx vite build --config vite.view.config.ts`, then open `dist-view/nodes.html`).

| Part | Where | State |
| --- | --- | --- |
| Typed ports, wires, unit dimensions, conversion on the wire, list mapping | `src/nexus/blocks.ts` (`fits`, `convert` in `dataflow.ts`) | Built and tested |
| The library: 199 blocks, 195 with their own tests (all passing), every one of the 144 laws as a calculator, by field, by ability and by kind; a duplicate is refused | `src/nexus/blocks.ts` | Built. Thin shelves remain: controls 2, electronics 3, manufacturing 5 |
| Incremental runner: keys, shared result cache across boards, only what an edit reaches is looked at | `src/nexus/dataflow.ts` (`Engine`, `Memo`) | Built and property-tested |
| Groups as nodes, nested; fold (taking in what lies between), open, save as a library block | `dataflow.ts` (`collapse`, `expand`, `makeBlock`) | Built and property-tested |
| Cut a branch keeping what else needs it; dead branches; twins and merging; repeated wiring | `dataflow.ts` (`cutBranch`, `deadNodes`, `twins`, `mergeTwins`, `patterns`, `suggest`) | Built and tested |
| The colourful canvas: blocks by kind, wires by quantity, glow and pulses on a run, heat map, minimap, command bar, undo, tidy layout, phone layout, inspector as each block's calculator | `src/nexus/view/nodes.ts`, `view/nodes.html` | Built, driven in Chromium, blind-checked |
| Code blocks with typed ports (JS, TS, Python) off the page | `view/code-worker.ts` (`vars`) | Built; JS checked on the page |

Measured on the build container by `tests/nexus/dataflow.test.ts` (not a Quest, not your machine):

| Case | Target | Measured |
| --- | --- | --- |
| 10,000-node board, an edit reaching 100 of them | under 16 ms | about 2 ms |
| 10,000-node board, first full run | — | about 280 ms |
| One library block placed 10,000 times | edits update once | its formula ran twice in all (first run, one edit) |
| 1,048,576 blocks placed in nested library blocks | open in under 1 s | worked out in about 2 ms, one block actually run |
| 100,000-row sweep through a law | without stalling | about 300 ms |
| Groups 64 deep | open, run, fold back | passes |

Not built yet, and said plainly:
- the forge's flows (`flows.ts`) still run on their own runner and are not yet steps in this one;
- no VR view of the canvas yet, and no board-room screen;
- Ask Claude works only where the forge's relay is; on the page it says it cannot ask;
- runs are one block at a time on the page's thread. A pool of workers is not built yet;
- agents, bridges and triggers are not block kinds yet;
- no versions of library blocks beyond `version: 1`;
- no sharing or editing by several people;
- blocks saved by you live in this browser only.

## 1. What already exists, and what this grows from

The project rule is one owner per concern, so the engine is grown from the board code already in the app, not
written beside it:

| Already here | What it gives | What it lacks for this plan |
| --- | --- | --- |
| `src/nexus/boards.ts` | Boards as documents: nodes, edges with 15 relations, soft delete, patch merge, a derived category tree, layout | No typed ports. Nodes are words, not blocks with inputs and outputs |
| `src/nexus/flows.ts` | Pipelines that run: trigger, AI, action, check and repeat steps; loops; run records with time and status for each step; templates; copy and paste of clips | Steps pass a single string to each other. No typed values, no fan-in, no caching, no sub-graphs as blocks |
| `src/nexus/calls.ts`, `calltest.ts` | 25 groups of calls a step can make, each one tested for real | Calls are a flat list. There's no library with domains, versions or blocks people make |
| `src/nexus/view/code-worker.ts` | Code steps in JavaScript, TypeScript, Python (Pyodide) and C++ (as converted JS), run off the main thread | Code gets `facts` and one input string, not typed ports |
| `src/nexus/view/boards3d.ts`, `boards-store.ts` | The board on the wall in the forge, drawn as one canvas for each surface, and saved | Drawn as a word wall, not as wired blocks |
| `src/ganglia/laws.ts`, `units.ts`, `src/nexus/lawgraph.ts` | 144 laws with checked units: a ready stock of calculators (draft 1 said 288; that was a miscount) | Not exposed as blocks (now they are: §0.1) |
| `src/nexus/components.ts`, `inventory.ts`, `breakdown.ts` | The parts library and the breakdown queue: a thing becomes its sub-things, which are looked up before being added | Not blocks on a canvas |

So the plan is: give `boards.ts` typed ports and values, give `flows.ts` a dataflow runner with caching, and make
everything above into block kinds. Boards saved today must still open (§7.6).

(Noted while reading: `docs/GANGLIA.md` refers to `blocks.ts`, `workflows.ts` and others under `src/ganglia/`, and
those files are not in this checkout. Whether they are lost or were never added should be settled before §8 leans
on them.)

## 2. The core model

Everything is five things:

- **Value.** What travels on a wire. Every value has a **type** and, where it applies, a **unit** and a **source**
  (where a number came from, as every number in this project must say).
- **Port.** A typed input or output on a node. It has a name, a type, a unit dimension, whether it's required, a
  default, and how many wires it takes (one or many).
- **Node.** An instance of a **block** (its definition) with its settings, its position, its colour, and its cached
  last result.
- **Wire.** Connects an output port to an input port. A wire is only allowed when the types fit (§2.2). It can carry
  a converter that is shown on the wire itself (mm to m, string to number).
- **Graph.** Nodes and wires, plus the graph's own exposed ports. A graph with exposed ports is itself a block.
  That is the whole tree mechanism.

### 2.1 Value types
`number` (with SI dimension, e.g. N·m), `integer`, `boolean`, `text`, `vector` and `matrix`, `table` (typed
columns, like a spreadsheet), `series` (time or sweep), `money` (amount, currency, date), `date` and `duration`,
`shape` (a 3D solid or a surface, from `form.ts` and `surface.ts`), `part` (a library component), `material`,
`card` (any record with fields), `list<T>`, `record{…}`, `image`, `file`, `code` (source text plus language),
`event` (a trigger firing), `signal` (a stream of values over time), and `any` (allowed, but drawn as a warning
colour so it doesn't spread unnoticed).

### 2.2 Type rules
- A number's units must fit. Wiring a force into a length is refused, and the message says why. Wiring mm into m
  works, and the converter appears on the wire.
- `list<T>` into a `T` input makes the node **map** over the list. The node gets a stack badge and runs once for
  each item. This is how one calculator becomes a sweep with no extra blocks.
- `table` columns can be pulled out as `list` by wiring from a column handle.
- Generic blocks (`max`, `sort`, `select`) take their type from what is wired in.

## 3. Everything a node can be

Each kind has its own colour family (§9). All of them share the same ports, wires, cache, versions and tests.

| # | Kind | What it is | Examples |
| --- | --- | --- | --- |
| 1 | **Input** | A value that enters the graph: typed in, a slider, a dial, a file, a sensor, a live feed | a load slider in N, a CSV file, today's exchange rate, the headset's hand position |
| 2 | **Constant and card** | A fixed record from the library, carrying its source | steel S355, an M8 bolt, a NEMA 17 stepper, an employee, a client |
| 3 | **Calculator** | A self-contained tool artifact. It works on its own as a small app and also has ports | beam deflection, bolt preload, Ohm's law and power, gear train, loan and NPV, unit converter, BMI, concrete mix |
| 4 | **Law** | One equation from `laws.ts`, with checked units and its domain of validity | Euler buckling, Fourier conduction, Kleiber's law |
| 5 | **Solver** | Runs a calculation backwards, optimises or iterates | "what diameter gives 30 MPa", goal seek, minimise mass under a stress limit, root finding, linear programming |
| 6 | **Code block** | Code with typed ports, in JS, TS, Python or C++. Inputs arrive as variables, the result fills the outputs | parse a supplier's quote, a custom scoring rule |
| 7 | **AI block** | Asks Claude, or Nexus offline. Its output can be held to a schema so it gives typed values, not just prose | classify a request, extract figures from a PDF, suggest the next three blocks |
| 8 | **Logic and flow** | Decides the route: if, switch, check, loop, repeat until, map, filter, reduce, merge, wait, gate | "repeat until flaws = 0, at most 5 rounds" |
| 9 | **Trigger** | Starts a run: press, timer, condition turns true, phrase said, build finished, file changed, webhook | everything in `flows.ts` today |
| 10 | **Action** | Changes the world: make a build, place a part, write a note, send a message, save a file | the `ACTIONS` in `flows.ts` |
| 11 | **Generator** | Makes structure: a part to a standard, a vehicle from its figures, a panel, a layout | `machines.ts`, `components.ts`, `panels.ts` as blocks |
| 12 | **Critic and check** | Judges a result and outputs findings as a typed list | the make critic, wall thickness, draft angle, a budget limit, a unit consistency check |
| 13 | **Viewer and output** | Shows a value: number, gauge, chart, table, 3D view, zebra map, report. Can be pinned to the board-room screen | a live deflection chart, the 3D part, a P&L table |
| 14 | **Group (sub-graph)** | A collapsed pipeline with exposed ports. It opens in place. This is a tree inside a node | "gearbox sizing" made of 9 blocks |
| 15 | **Block reference** | A placed use of a saved library block, pinned to a version or set to follow the latest | "bolted joint v3" used in 40 builds |
| 16 | **Branch and variant** | Holds alternative sub-graphs side by side, A/B/C. A selector or a solver picks one, and results can be compared | steel frame vs. aluminium frame vs. composite |
| 17 | **Note and frame** | Notes, sticky labels and coloured frames that group and explain without running | "Front suspension" frame |
| 18 | **Agent** | A worker with a goal, tools (blocks it is allowed to call) and a budget. It can edit its own sub-graph inside limits | the board-room "employee" who keeps the cash-flow graph up to date |
| 19 | **Bridge** | Connects to outside systems through connectors (files, HTTP, databases, MCP tools) | read a Supabase table, fetch a price |
| 20 | **Meta** | Works on graphs themselves: count, find, diff, merge, prune, benchmark, test | "list all dead branches in this board" |

## 4. Everything a node can do

Shared abilities, so every kind above gets them without writing them again:

**Run**
- Run alone, or in its pipeline. Run on a click, on a trigger, live while inputs change, or on a schedule.
- Map over lists, run in parallel when its inputs allow, and stream partial results for long jobs.
- Be cancelled. Have a time limit and a memory limit. Retry with a back-off.
- Run inside a sandbox (a worker) when it is code, AI or a bridge.

**Know itself**
- Ports with types and units, a description, an example, its domain of validity (where the answer holds), its
  sources, its version and its author (you, Claude, or the engine).
- Its own tests: inputs with known outputs that it must reproduce, as `calltest.ts` already does for calls.
- Its cost: how long a run takes and how much memory and money it uses.

**Explain itself**
- Show its work: the formula, the numbers that went in with units, and what came out (as `showWork` does for laws).
- Sensitivity: which input the answer depends on most.
- Uncertainty: how ±x % on inputs carries into the outputs.
- Trace: why it ran, what came in, and what it sent on.

**Change**
- Edited settings, rewired, recoloured, renamed, all with undo.
- Collapsed into a group, or expanded back. Saved as a library block. Forked into a branch. Replaced by a better
  block with the same ports.
- Edited by Claude on request, as a reviewed patch you accept or reject, never a silent change.

**Connect**
- Wires to other nodes. Links to cards and documents. Pinned to the board-room screen or to a place in the forge.
- Shared by link with someone else, read-only or editable.

## 5. Trees inside the graph

- **Branch:** any node can grow children. Pressing + on an output adds a block fed from it. A group opens into its
  sub-graph, and that sub-graph's nodes can be groups too, with no depth limit.
- **Prune:** deleting a branch removes the nodes no other wire still needs. A branch that is still used elsewhere is
  only unlinked, never lost, and the engine says which other branch kept it. Deletions are soft at first (as
  `boards.ts` marks them now) and can be undone until the graph is compacted.
- **Share:** a sub-tree used in two places is stored once and referenced twice. Editing it asks: change both, or
  fork this one.
- **Merge:** two branches that do the same thing (same blocks, same wiring, same settings, found by hashing) can be
  folded into one shared block.
- **Version:** every saved block has a history. A placed block either pins a version or follows the latest. When a
  new version changes its ports, the uses are listed before anything breaks.
- **Breakdown queue:** a new card is queued to be broken into sub-cards, looked up in the library first, as
  `breakdown.ts` does for parts now. The same rule works for every domain.

## 6. How it gets smarter

Smarter means four mechanisms, each measurable, not a claim:

1. **Usage record.** Each block keeps a count of runs, failures, time used and how often its output feeds something
   that is used. This is the evidence for everything below.
2. **Pattern mining.** Wiring shapes that repeat (the same three blocks wired the same way in many places) are found
   by hashing sub-graphs. They are offered as a new block with a proposed name. You accept, rename or dismiss, and a
   dismissed offer is not made again.
3. **Pruning and merging suggestions.** Dead branches (outputs nothing reads), duplicates and blocks that are always
   bypassed are flagged on the canvas with a dimmed colour, and listed with a one-press fix.
4. **Next-block suggestions.** When you drag from an output, the library is sorted by what has been wired to that
   type before, in this board and others. Claude can propose a whole sub-pipeline for a stated goal, shown as a ghost
   you accept.

A critic sits over all four, as `make/critic.ts` does for builds: a suggestion that made things worse (more
failures, slower runs) is withdrawn and its rule loses weight. Rule updates are kept only if they help boards they
were not tuned on. That is the project's drift gate applied to the engine itself.

## 7. How it stays efficient

1. **Incremental runs:** each node caches its output, keyed by a hash of its block version, settings and inputs.
   An edit marks only what is downstream of it as stale. Changing a slider re-runs the three nodes that depend on
   it, not the 3,000 that don't.
2. **Lazy expansion:** collapsed groups are not loaded or drawn until they are opened. A board of a million nodes
   shows and runs its top level only.
3. **Shared storage:** a sub-tree used in many places is stored once (content-addressed, by hash).
4. **Parallel runs:** independent branches run at the same time in a pool of workers. Pure blocks run off the main
   thread, so the canvas and the headset never stutter.
5. **Drawing:** the canvas draws nodes in batches (one texture or instanced mesh, as `boards3d.ts` does now), culls
   what is off screen, and draws distant nodes as coloured dots.
6. **Save format:** extends the board document. Boards saved now open unchanged. Saves are patches, so a large board
   saves only what changed.

## 8. The library

### 8.1 Three ways to find a block
Every block is tagged on three axes, so it can be found any of these ways:

**By domain** (what field it is for):
- Mechanical: statics, dynamics, machine elements (shafts, bearings, gears, springs, fasteners), mechanisms, vibration
- Structural and civil: beams, columns, frames, concrete, steel, timber, foundations, loads by code
- Electrical: circuits, power, motors, wiring and fuses, batteries, solar
- Electronics and embedded: components, signals, PCBs, microcontrollers, sensors
- Controls and robotics: PID, kinematics, path planning, arms, actuators
- Thermal and fluids: heat transfer, HVAC, pipes, pumps, aerodynamics, hydraulics, pneumatics
- Materials: properties, selection, composites, failure, fatigue
- Manufacturing: machining, 3D printing, filament making, casting, moulding, welding, cost and time of a process
- Automotive and vehicles: everything in `machines.ts`, drivetrains, suspension, tyres
- Aerospace: lift, drag, propulsion, structures, flight
- Chemical and process: reactions, mass balance, separation
- Energy and environment: generation, storage, emissions, efficiency
- Biomedical and life: the creature laws in `abilities.ts`, ergonomics
- Software and data: parsing, transforms, statistics, ML, APIs
- Math: algebra, calculus, linear algebra, optimisation, statistics, geometry
- Business and finance: money, cash flow, budgets, pricing, loans, tax, payroll, inventory, the board room
- Operations and project: schedules, critical path, resources, risk
- Everyday: unit conversion, dates, recipes, health

**By ability** (what it does): measure, convert, calculate, solve backwards, optimise, simulate, generate, check,
compare, decide, store, show, transform, ask, act, connect. These are the colour families in §9.

**By kind** (§3): calculator, law, code, AI, logic, generator, critic, viewer, group, agent, bridge.

### 8.2 What each library entry holds
Name, icon, colour, description, ports, an example, tests, sources, validity range, version history, author,
uses (where it is placed), its usage record (§6) and a quality badge: **tested** (its tests pass), **sourced** (every
figure says where it came from), **used** (placed and run many times) or **draft**.

### 8.3 How the library fills
- **Seeded** from what exists: the 144 laws, the 25 call groups, the components, the generators and the critics,
  each wrapped as a block with tests. That is hundreds of real blocks on day one, none of them mock.
- **Made by you:** select nodes, then "make block". The selection's loose wires become its ports.
- **Made by Claude:** ask for a calculator or a block. Claude writes it with its tests and sources, and it enters as
  **draft** until the tests pass and you accept it.
- **Offered by the engine** from pattern mining (§6).

### 8.4 Rules that keep it clean
No two blocks may do the same thing. A new block is checked against the library by port signature and by its test
results on the same inputs, and a duplicate is offered as a merge (the rule `WRITTEN_TWICE` already applies to the
inventory). A block whose tests fail cannot leave draft.

## 9. Colour and look

- **Each ability has a hue:** inputs teal, calculators amber, laws gold, solvers orange, code violet, AI pink,
  logic blue, triggers lime, actions red, generators green, critics coral, viewers cyan, groups slate with the
  colour of what's mainly inside, agents magenta. Final values are chosen to stay readable on dark and light
  backgrounds and for colour-blind viewers, so a symbol on each node carries the kind as well.
- **Wires take the colour of the type they carry:** numbers by dimension (force, length, money each have their own
  colour), text grey, shapes green, events lime, and `any` as a striped warning.
- **State is shown by light:** a node glows while it runs, a pulse travels down a wire as a value passes, a stale
  node is dimmed, a failed one turns red with its reason on it, and a cached one shows a small check mark.
- **Heat view:** a toggle that colours nodes by time used, or by failures, or by use, so the slow and dead parts of a
  graph are visible at a glance.
- **Branches carry a colour band,** so A, B and C variants are told apart all the way down their sub-trees.
- **In VR:** nodes are floating panels with depth, wires are glowing tubes, and a group expands into a layer behind
  it that you can step into.

## 10. The environment

**Where it runs**
1. The browser on a screen: the main editor, and the fastest to build and test.
2. The phone in the forge: the library app (`apps.ts`) gets a node mode.
3. The forge wall and the board-room screen: the same graph on the big screen, editable by pointing, and the
   `boards3d.ts` wall becomes a block canvas.
4. Fully around you in VR: you grab nodes, pull wires by hand, and step into a group.

**What makes it advanced**
- **Live everywhere:** values update while you drag a slider, on all views at once.
- **Undo history and time travel:** every change is kept, and any past state of a board can be opened and compared.
- **Diff and merge of boards,** like code: what changed between two versions, node by node.
- **Claude in the loop:** say or type what you want and Claude proposes the sub-graph, explains a node or finds why
  a run failed. Each proposal is a patch to accept or reject.
- **Sandboxing:** code, AI and bridge blocks run in workers with time limits and memory limits, and no access to the
  page. Keys stay off the client, as the project rule says.
- **Offline first:** everything runs without a network except AI and bridge blocks, which say so when they cannot
  reach their service. Nexus answers when Claude cannot be reached, as flows do now.
- **Debugger:** step through a run node by node, set a breakpoint on a wire, watch a value, and replay a past run
  from its saved inputs.
- **Command bar:** type anything, such as "add beam calculator", "wire load to F" or "collapse these", and it runs.
- **Sharing and many people:** a board shared by link, and later edited by several people at once with live cursors.

## 11. Stress testing

Five layers. Every number is published with the code that produced it. The machine numbers are measured on the
container, and Quest numbers only ever come from a Quest.

**1. Correctness**
- Every block runs its own tests on every gate (as `calltest.ts` does now).
- Every law is checked for consistent units (as `units.ts` does now).
- The runner is checked against a plain reference runner on random graphs: same outputs, every time.

**2. Properties (fast-check, already a dev dependency)**
- Random graphs, random edits and random undos.
- These must always hold:
  - a cached run equals a fresh run;
  - undo restores the board byte for byte;
  - save and load is exact;
  - prune never removes a node that something still needs;
  - collapse then expand is the identity;
  - merge never changes any output.

**3. Fuzzing and hostile input**
- Wires of the wrong type, cycles, a node deleted in the middle of a run.
- Code blocks that loop forever, use too much memory or throw.
- AI blocks returning junk.
- Huge text values, NaN and infinity, a unit mismatch hidden in a deep group.
- Every case must end in a clear message, never a hang or a corrupt board.

**4. Scale (each a target to be measured)**

| Case | Target |
| --- | --- |
| A board of 10,000 nodes opens and pans | at 60 fps on the screen |
| A graph of 1,000,000 nodes, as nested groups, opens | in under 1 s, since only the top level is loaded |
| A slider edit in a 10,000-node graph re-runs | only what depends on it, in under 16 ms when the blocks are fast |
| A sweep of 100,000 calculator rows | in a worker pool, without stalling the canvas |
| Groups nested 64 levels deep | open, run, collapse and save |
| A block used in 10,000 places, then edited | everything updates once |
| The VR wall at 500 visible nodes | at the headset's frame rate. Measured on a real Quest 3S |

**5. Real-world trials**
- Rebuild real tasks end to end as boards: a front-fender design pipeline, a bolted joint sized by its load, a
  monthly cash-flow board for the business, the filament maker's process chain.
- Then a blind check, as the project's rounds already do: an agent with no context is given the board and asked
  what it does and what is wrong with it.

**The challenge scoreboard** (for the contest with the other AI): one page that reports, from runs, the number of
working blocks with tests passing, the domains covered, the scale results above, the edit-to-result latency, the
dedup ratio (blocks stored against blocks placed), and the blind-check results. Every row is measured, never claimed.

## 12. Milestones

Each milestone ends with the gate passing, a screenshot looked at, and the blind check.

1. **Typed core:** ports, types, units and wires on the board document; old boards still open; the type rules; the
   property tests.
2. **Dataflow runner:** incremental cached runs, map over lists, workers, cancellation; the flows of today run
   through it unchanged.
3. **Colourful canvas on screen:** blocks, coloured wires, run glow, heat view, command bar, undo.
4. **Library v1:** laws, calls and components wrapped as tested blocks; search by domain, ability and kind; calculator
   artifacts (first ten: units, beam, bolt, Ohm and power, gear train, spring, pipe flow, heat loss, loan and NPV,
   cash flow).
5. **Trees:** groups, make-block, shared sub-trees, versions, branches with variants, prune and merge.
6. **Smarter:** usage record, pattern mining, suggestions, the critic over suggestions.
7. **Code and AI blocks with typed ports:** code-worker upgraded; Claude makes blocks with tests.
8. **The forge and the board room:** the same graph on the wall and the big screen, then fully in VR.
9. **Stress suite and scoreboard:** all of §11 at its targets, published.

## 13. Risks

- **The engine becomes another generator beside the others.** Countered by growing `boards.ts` and `flows.ts`, and by
  checking each milestone against the owners table.
- **`any` everywhere makes the types pointless.** Countered by drawing it as a warning and counting it on the
  scoreboard.
- **Smart suggestions turn into noise.** Countered by the critic, the dismiss-once rule, and measuring how many
  suggestions are accepted.
- **VR legibility.** Text at a distance is hard to read in a headset. Countered by building the screen first, then
  trialling on the Quest early.
- **Scope.** Twenty node kinds is a lot. The milestones put the ones that unlock the rest first.

## 14. Questions for you

The answers set the destination. The ones marked ★ change the order of the milestones.

**Purpose and judging**
1. ★ What is the first real thing you want to build with it? A car part chain, the business board, a factory, or a
   calculator set?
2. ★ How is the contest with the other AI judged? Is there a deadline, a scoring sheet, or a task you both get?
3. Who else will use it: only you, your team, or the public? It decides how much goes into sharing and accounts.

**What a node is**
4. Should a calculator be usable alone, as its own page or phone app, outside the graph?
5. Is JavaScript, TypeScript and Python in code blocks enough, or do you need others (C++, Rust, Excel-style
   formulas)?
6. Should agents be allowed to edit their own graphs by themselves, or only propose edits you approve?
7. Are spreadsheet-style blocks (a grid with formulas) wanted, as a node kind of their own?

**The library**
8. Should blocks made by you and by Claude be private, shared with your team, or public in a common library?
9. Should a block show its price or cost to run, such as AI calls and outside services?
10. Which domains matter most first? Pick the top three from §8.1.

**Look and feel**
11. Any colour style you like (neon on dark, pastel, a game you like, a product like Blender or ComfyUI)?
12. Should sound be part of it, such as a tick when a value passes or a tone on a failure?

**Environment**
13. ★ Screen first then VR, as suggested, or VR first?
14. Should it work fully offline on the headset, or is a network always available?
15. Should it connect to outside tools you already use (Excel or Google Sheets, a bank, an accounting app, a CAD
    program)? Which ones?

**The bar**
16. What would make you say it failed? What would make you say it beat the other AI?
