# Spec 11, the living world: only the observed computed, replay, affordances, agents that coordinate, an umpire

Accepted 2026-10-31 (U11, U13). From the synthesis, round 2 findings 6, 7 and 8 and round 3 findings 16 and 19.

## Starts from (checked 2026-10-31)

Agents with bodies and goals (`act/`), awareness (`aware/`), seeds for rooms, houses, roads and cities (`seeds.ts`),
controls and walking (`controls.ts`, `view/pad.ts`), Jolt physics at a fixed step. Every node in a board runs when its
inputs change, whether anything looks at its output or not. Runs are not guaranteed to replay.

## Requirements

- **L-R1.** THE SYSTEM SHALL compute only what something observes (a view, a probe, a goal, the AI), so a city or a
  galaxy costs what is looked at.
- **L-R2.** THE SYSTEM SHALL make every run reproducible from its seed, board and inputs, and SHALL detect when two
  runs that should agree do not.
- **L-R3.** THE SYSTEM SHALL let objects advertise what they offer (an affordance: the action, the need it serves, its
  reward), and agents with needs SHALL choose among them, with no code written for one kind of object.
- **L-R4.** THE SYSTEM SHALL let agents coordinate through marks left in the world that fade (stigmergy), as well as by
  messages.
- **L-R5.** THE SYSTEM SHALL offer an umpire: one that holds the true state, gives each agent only what it can perceive
  (with delays and noise), settles what no rule covers by stated judgement or stated odds, and logs every judgement
  with the rule it rests on.
- **L-R6.** THE SYSTEM SHALL keep a chronicle of every run that can be asked ("when did the bridge fail; who built
  this").
- **L-R7.** THE SYSTEM SHALL let a process be a board of materials in states and operations between them, gated on
  state ("until the core reaches 57 °C") rather than on time.
- **L-R8.** THE SYSTEM SHALL keep scale honest: float64 anchors per part, positions relative to the camera, rebasing
  when an offset grows, and a detector for where the cheap representation is wrong at the current zoom.

## Design

- **Lazy evaluation** (`dataflow.ts`): demand from observers pulls; unobserved branches stay unevaluated; side-effect
  nodes declared so they still run.
- **Determinism** (`sim.ts`, `dataflow.ts`): seeded randomness everywhere; a state hash per step; a run record (seed,
  board, inputs) that replays; a desync detector comparing hashes.
- **Affordances** (`kits.ts`, `act/`): an affordance port on any part; agents score offers against their needs with
  urgency curves; the AI reads the same offers to explain a scene.
- **Stigmergy** (`aware/`): fields of marks with evaporation, read and written by agents.
- **The umpire** (a node): rigid (tables and dice) to free (judgement with stated odds), every ruling logged.
- **The chronicle** (a node): events (who, did, what, to whom, where, why) from every run, queryable.
- **Process boards** (`blocks.ts`): materials in states; operations with until-conditions.
- **Scale anchors** (`view/space3d.ts`): the deep-zoom pattern (an anchor and an offset; rebasing; a glitch detector).

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| LW1 | Lazy evaluation with declared side effects | a city board with one street viewed computes only that street (measured node count) | 00 |
| LW2 | Determinism and replay; desync detector | the same seed, board and inputs give the same state hash twice; a planted nondeterminism is caught | 00 |
| LW3 | Affordances and needs | agents in a room use a chair, a lamp and a door with no code for chairs, lamps or doors | 00 |
| LW4 | Stigmergy fields | agents laying and following marks find a shortest path between two places | LW3 |
| LW5 | The umpire node | two agents see only what they can; every ruling is in the log with its rule | LW3 |
| LW6 | The chronicle | "when did the bridge fail" answered from a run's log | LW2 |
| LW7 | Process boards gated on state | a recipe and a heat treatment run as boards; a step with no done-condition is flagged | 00 |
| LW8 | Scale anchors and rebasing | at 10 km from the origin a 1 mm part does not jitter, measured | spec 04 P4 |
| LW9 | Determinism across browsers: a Jolt build with its cross-platform determinism option; a deterministic maths module (V8 and JavaScriptCore differ on some Math results); a CI battery in three browsers (research 19) | the same run hashes equal in Chromium, Firefox and WebKit | LW2 |
| LW10 | A `grow` node family: demand field, local rule, budget, load or damage ensemble, stop condition; resilience with an n − 1 check (research 22) | a grown network survives the loss of any one edge where the objective asks it to | 09 P1 |
| LW11 | Space measures as nodes (justified depth, integration, intimacy gradient, egress distance, daylight), each with its stability under small edits (research 21) | a plan's measures reported with how much they move under a one-door edit | — |
| LW12 | **First, before LW1**: early cutoff (research 25): every block declares its effect (pure, seeded, clock, volatile, io, agent; unknown counts as volatile); canonical output hashes; keys from input value hashes plus the block's code version; two revisions per node | a node rerun to the same value reruns nothing below it, counted; a block reading `Math.random` undeclared fails the check | — |
| LW13 | Push a mark, pull the work: observers (view, panels, checks, exports, the agent) pull; only stale nodes on their path run, in height order; `observe` and `dam` nodes; durability bands | the LW1 count holds; one slider edit leaves a thousand library bolts unrun | LW12 |
| LW14 | The run record (revision, input and output hashes, seed, effect) is the replay log; replay names the first node that differs | a planted nondeterminism named by node | LW12, LW2 |
