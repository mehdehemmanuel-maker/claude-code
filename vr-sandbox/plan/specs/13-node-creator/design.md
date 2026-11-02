# Spec 13, the node creator: the design

How figures are labelled here. **Counted**: read from the code. **Measured**: run on 2026-11-02 by a probe written
with this spec (Node 22 in this container, not a phone or a Quest); each probe's method is said where its figure is,
so it can be run again, and the task that depends on the figure measures it again in its own check. **Read, not run**:
seen in the code and not run. **Ours**: a figure chosen by the builder (decision 0011), said and reversible. Paths:
`dataflow.ts`, `blocks.ts` and the other modules are under `src/nexus/`, `view/nodes.ts` is `src/nexus/view/nodes.ts`,
and `view/index.html` is the page at the root.

## 1. What exists today (checked in the code, 2026-11-02)

| Piece | Where | What it lacks |
| --- | --- | --- |
| Fold | `collapse`, `dataflow.ts:482` (its comment, `:480`: "What the board computes is the same before and after"); `makeBlock`, `:645` | Settings stay constants inside; no tests. The engine feeds a many-input's wires sorted by their source's id (`:325`); the group's id is `uid('g')` (`:482`; a 'g' and seven random letters or digits, `boards.ts:145`), which sorts before every `p…`. Measured: folding Steel's `f1`, `s1`, `p1` with the default id changes `all`'s assembly 10 times in 10; under `g1` it changes, under `p1z` it does not. `expand` gives a clashing inner node a random id (`:539`) and `mergeTwins` moves wires to the first twin (`:610`): measured, both reorder a combine's items too. Fault D32. |
| A fold as a block | `groupBlock`, `:127` (group.in already holds type, unit, default, choices and words, `blocks.ts:943-944`) | Its evidence is a group's, 'derived' (`evidence.ts:91`), not its inside's. Measured on Steel: all five places folded, `all` turns from 'hypothetical' to 'derived', and each fold node reads 'derived'. A warning inside that reaches no output of the fold is lost (measured: a mass of −2 kg feeding `a*0`); what was extrapolated inside is not read (`:382`, `:392`). The ± is dropped, "it runs a board of its own" (`:406`; measured: 0.3 through `a*3` unfolded, none folded). A fold holding only a viewer is counted dead (`deadNodes`, `:580`; measured), since a group block is never a sink. |
| Running a fold | `Engine.call`, `:421`; its child engine, `:425`, which `Engine.inside(id)` gives (`:429`) and the page reads to show a group's inside (`curEngine`, `refreshLocal`, `view/nodes.ts:68-70`); `runInside`, `:658`; `runnerOf`, `:672` | The runner `runnerOf` gives for a block made of a board ignores the `set` it is called with (`:677`). |
| A fresh run, and stopping | `Engine.fresh`, `:309`; the run loop, `:301-304`; the key, `:343`; the memo, `:345` | A block that is not pure is never read from the memo (`:345`), so every fresh run runs it again. Measured 2026-11-02 (Steel with an `api.claude` node beside it, run fresh on a memo of its own): `api.claude` ran on each fresh run, and with no key it counts in `USAGE` as a fail, not a run. The engine reads its stop only between nodes (`:303`): a node already running finishes, and a run whose nodes wait on nothing outside lets no timer fire, while one whose node waits on the pool's workers does (2.5, item 5). Every engine starts with everything to run (`:200`). |
| Dedupe | `register`, `blocks.ts:341`; `sameBehaviour`, `:347` | Needs `run` and tests on both blocks (`:348`) and gives up on an async run (`:354`); a fold has neither. A taken id is replaced in silence (`:344`). |
| Tests | `BlockTest`, `blocks.ts:186`; `testBlock`, `:367` | Compared by `near` (1e-6, only the keys expected, `:358-361`). A JSON copy loses Infinity: `check.limit`'s factor at a value of 0 (`:758`) comes back null (measured). |
| Repeats | `patterns`, `dataflow.ts:620`; `suggest`, `:635` (three shown, `:639`) | Chains of 2 and 3 by block id and port, in overlapping windows, on the open board only; every group keyed 'group' (`:624`); places carry no board. Measured on Steel: the first offer folds the shared `fe` ("Reflectance colour → Cylinder → Place is wired 5 times"), the third reaches into `all`. 20 of the 23 seed boards hold more than 6 nodes (counted with a probe: `seed.house` 14, `seed.door` 25), so a fixed small size misses the user's own example. `suggest` is synchronous (measured: it returns an array) and the page calls it while drawing (`dimmed`, `view/nodes.ts:189`; the inspector, `:631`), so it cannot await a run. |
| Twins, dead | `shapeKeys` `:588`, `twins` `:599`, `mergeTwins` `:605`, `deadNodes` `:580` | Exact twins only. |
| What is recorded | `pushUndo`, `view/nodes.ts:77`; `edit`, `:82`; `doUndo`, `doRedo`, `:812-813`; `goto`, `:1004` | Whole-board snapshots, 120 in memory; no actor, no operation, lost on reload. `pushUndo` pushes the board before and clears redo before the change is made (`:77`, `:83`), so a change that makes nothing different still leaves an undo step. Nine whole-board swaps call `pushUndo` then `useBoard` (`:554`, `:585`, `:651`, `:671`, `:673`, `:677`, `:691`, `:790`, `:911`; `:651` takes Claude's board); the start-up (`:858-859`) calls neither. `Board.by` and `Board.calls` exist, unused (`boards.ts:25`, `:29`). |
| Diff | `diffOf`, `certify.ts:79` | Top level only; a change is a block or its settings (`:83`), so a move or a label is not seen. |
| A block saved, loaded or carried | `keepBlock`, `loadBlocks`, `view/nodes.ts:36-37`; Claude's blocks, `:650`; `toolsFor`, `agent.ts:179`; `carryOf`, `dataflow.ts:705`, with `Carry`, `pool.ts:13`; `trial-worker.ts:14` | Five places convert a block, none keeping its author or tests: kept as `{id, name, says, domains, graph}`, reloaded as 'you'; Claude's blocks registered and kept on arrival as 'you'; saved blocks sent with a request registered as 'you'; a block carried to the pool's workers registered there as 'you'. `carryOf` carries one board and a worker registers only that one block: a made node holding made nodes names blocks the worker lacks (fault D34; probed 2026-11-02: 2,000 jobs of a block holding a block, sent to 4 workers with only the outer block carried, 1,999 failed with 'no block … in the library', the first, run here, passing). A board is kept with no author (`keepBoard`, `:34`). `store.set` swallows a full quota (`:28`). The gauntlet takes out no block by 'built in' or 'engine' (`gauntlet.ts:443`). |
| Open a copy | `openCopy`, `view/nodes.ts:482` | The copy is made with no `set`, so values typed on the node (kept in its `set`, `:756-760`; read for an unwired input, `dataflow.ts:334`) are lost. Measured, the statement replicated on a board: a block `a*3` with 5 typed gives 15; its copy gives 3. Fault D33. |
| Claude's fold | `fold`, `agent.ts:235-243` | collapse plus makeBlock; with no nodes named it folds all but the in.* nodes (`:237`), so on Bolt it folds `ck`, `s1`, `s2` and the note in (its filter run on Bolt's nodes); its author 'you' (`:240`). |
| Purity | `def`, `blocks.ts:477` | Pure unless said. 13 blocks the starters reach are pure with an async run (fit.target, variants, sweep.range, letgo, spawn and others; measured 2026-11-02 by walking every starter's nodes and every group's and board block's board, reading each block's `pure` and its run's kind), so "pure" does not tell a slow block from a quick one. 6 starters hold blocks that are not pure (the gauntlet's among them: `delete`, `task`, `research.loop`); in.number and in.text are pure (measured the same way). |

## 2. The model

### 2.1 The words

- **A node**: one exact repeat, folded into one library block.
- **A node type**: one block that covers a family of repeats. Its inputs are the values that differed from place to
  place; its constants the values that agreed. It is a block made of a board, which is data, not a new `Kind`
  (`blocks.ts:118`).
- **A board as one node**: a whole board folded, its in.* values the node's input defaults, its viewers outside.
- **Learns**: it keeps what it found, what it proved, what the person took and what they turned down; a made node is one
  node the next time it looks. No model is trained.

### 2.2 The record (R1 to R3)

The event's shape and the log's rules belong to `boards.ts`, the owner of a board's own record. The event replaces the
unused `Board.calls` (`:29`); `Board.by` becomes the board's author, set by the page when it opens a board that has
none (a starter 'starter', a file 'import', an empty board 'you'; a stored board with none reads 'you') and kept by
`keepBoard`.

```ts
type Actor = 'you' | 'claude' | 'starter' | 'import' | 'engine';   // 'engine': the creator, on the person's yes
interface BoardEvent {
  id: number;                 // IndexedDB's autoIncrement key: rising on this device, across its pages
  at: string;                 // ISO time
  by: Actor;                  // an 'open': the board's own author (Board.by)
  board: { title: string; key: string };            // boardKey after the change
  kind: 'edit' | 'open' | 'undo' | 'redo' | 'offer';
  ops: Op[];                  // [] for open, undo, redo, offer
  reverts?: number;           // undo: the event undone; redo: the undo redone
  offer?: { shape: string; places: number; choice: 'use' | 'no'; block?: string };
}
type Op = { path: string[] } & (   // path: the groups it is inside, [] at the top
  | { op: 'place'; node: string; block: string } | { op: 'remove'; node: string }
  | { op: 'set'; node: string; key: string; from: unknown; to: unknown }
  | { op: 'move'; node: string } | { op: 'label'; node: string }
  | { op: 'wire'; from: string; out: string; to: string; in: string } | { op: 'unwire'; from: string; out: string; to: string; in: string }
  | { op: 'group'; node: string; of: string[] } | { op: 'ungroup'; node: string } | { op: 'block'; node: string; block: string }
  | { op: 'title' });
```

- **Operations** are worked out from the boards before and after by `opsOf` in `certify.ts`. `diffOf` is computed from
  `opsOf` (its top-level operations), so one function works out what changed; `diffOf`'s output stays as it is for its
  caller (`agent.ts:99`).
- **The log's rules** (`boards.ts`): it only appends; an 'edit' that makes nothing different (no operation) is dropped, while an 'open', 'undo', 'redo'
  or 'offer', which carries no operations by its kind, is kept;
  an actor not in the list is refused. There is one event for each undo step, so an undo links to one event; a run of
  keystrokes on one setting (a number setting fires on every key, `view/nodes.ts:749`) is one event a key.
- **On the page** (`view/nodes.ts`): `pushUndo` already holds the board before; the event is closed with the board as
  it is at the next `pushUndo`, at an undo or redo, or in a microtask after the edit (`edit` changes the board at once,
  `:82-91`), so two edits in one task are two events. The page removes the snapshot of a change that made nothing
  different: `pushUndo` (`:77`) holds the board before aside, and only an edit that closes with operations puts it on
  the undo stack and clears redo, with its event; an edit that closes with none leaves both stacks as they were and
  writes nothing. A board swap (an 'open': `pushUndo` then `useBoard`, as at `:585`) keeps its undo step. `useBoard` records an 'open' by the board's own author at eight of the nine swaps.
  At the ninth, where Claude's board is taken (`:651`), the page records an 'edit' by 'claude' with `opsOf` of the
  board before and Claude's board, so Claude's change is seen operation by operation as anyone's is; for a board Claude
  started anew, those operations are its places and wires. The start-up gets a record call of its own: an 'open' by the
  board's author (the stored board's, or 'starter' for the first starter on a first visit), with no undo step. Undo and
  redo each keep the id of the event they revert. The actor of an edit is 'you' unless the page says otherwise (Use:
  'engine'; Claude's board: 'claude').
- **Where it is kept**: IndexedDB `nexus.log`, never `localStorage`, whose quota a growing log would fill in silence and
  stop the board's own save (`:28`). When IndexedDB is missing or refuses, the log lasts the visit and the page says so
  once. It is never sent whole to a model.

The event holds who changed which board, and how. A run's tokens and steps stay with `AgentRun` (`agent.ts:79`), their
owner; an 'edit' by 'claude' may point to it. The rest is spec 14's to decide (decision 0019).

### 2.3 Finding repeats (R5 to R7), by extending `shapeKeys` and `patterns`

- **A shape key**: each node's block id and version and its ports as its settings make them (`portsOf`), and the wiring
  by port names; not node ids, and not settings. It is canonical: two places get one key exactly when they are the same
  shape. A setting that shapes the ports (a formula's names, a law's solve, `array`'s pattern) changes the key through
  `portsOf`, with no list of such settings. A group is keyed by its inner board (today every group is 'group', `:624`).
- **Places** grow in step from each wire whose two ends repeat: a neighbouring node is added at every place at once when
  it has the same block, is wired by the same ports at each, and joins no other place. Growth stops when a neighbour
  does not match at every place; there is no size limit, only the time budget (2.5, item 5). That one rule keeps out a
  node every place shares (Steel's `fe` stays outside and feeds each one) and many wires into one many-input (five
  places into `all` share `all`), both of which `patterns` counts today. A place counts only when it feeds a sink; a
  place that feeds nothing is dead, and Cut's (`deadNodes`), not the creator's.
- **Never in a shape**: a sink (a viewer, a check, a note, group.out, the 3D view); an in.* node, which feeds a place as
  its input, as `foldBoard` keeps it out (2.4); a block that is not pure, reads the clock or is live (`clockOf`,
  `live`). A shape whose places are all twins is left to Merge (`twins`, `:599`), which exists. `offersOf`'s budget
  (2.5, item 5) keeps out costly blocks that say they are pure.
- **Each place** carries its board.
- **The boards** (R5): the open board, the boards the person kept (`nexus.boards.v1`) and the boards of saved blocks
  (`nexus.nodeblocks.v1`). Finding runs nothing, so every board is searched; only the open board is proved (2.5), since
  only it has a run, and a place on another board is proved when that board is opened. Starters and seed boards are
  written in code, so they are test boards for the checks, not searched. A made node is a library block, so it is one
  node in every later shape (R7).
- **When, and where the result is kept**: one async function, `offersOf(board, engine)` in `dataflow.ts`, finds over
  every board searched (each other board's shapes kept by its `boardKey`, so an unchanged board is not searched again),
  makes and proves on the open board (2.5), within one budget (2.5, item 5), on a copy of the board and its state taken
  when it starts, and keeps its result by that board's `boardKey`. Only the page that shows the card calls it (2.5, item
  5): after each run of the board in view, one call at a time (a run that ends while a call works stops it and starts
  the next), then draws again. `suggest` stays synchronous for the draw path (`view/nodes.ts:189`, `:631`): it keeps
  its fields for its callers, reads the kept result for the board's `boardKey` as kind 'type', and gives no 'pattern'
  (Fold one) for a shape it gives as 'type'; a board changed since has a new key, so a stale offer is never shown.

### 2.4 Making a node, a node type, a board as one node (R8 to R10)

Every place is lined up with the first by the order its nodes were added in, and each setting and each unwired input is
sorted:

- **It agrees everywhere**: a constant inside.
- **It differs**: an input. Its type, unit and choices are that setting's or port's own; its default the commonest value
  (the first place's on a tie); its words the setting's label.
- **Two that differ are equal at every place**, of one value type (both strings, or both numbers in one unit), at three
  places or more (ours): one input bound to both. It takes the narrower definition: choices over free text. Metals'
  `metal` (a choice of 15) and the sphere's `name` (text) are equal at 14 of 14 (counted from `starters.ts:268-269`),
  so they are one input `metal` with optics.colour's 15 choices.
- **A source outside the places** (an in.* node among them): an input, as `collapse` makes one today. **What leaves the
  places**: an output for every port any place's outside reads.
- **Already in the library**: a shape whose block is there (same identity: shape, constants and inputs, 2.6) is offered as that block, found
by its identity (2.6).
- **Labels**: each rewritten node keeps the first label written at its place that is not a block's own name (Steel's
  "Turned: its surface"), so the person's words are not lost. Each rewritten node takes a new id (`uid('n')`), and its
  wires keep their order (2.7).

**An input that sets a setting.** group.in gains a setting `into` (`'c.metal; s.name'`). `runInside`, the one function
that runs a group's board with what comes in (`:658`, used by `Engine.call` and by `runnerOf`, and so by fit.target,
variants, sweep.range and the pool's workers, which carry the board, `:705`, and run it through `runnerOf`,
`trial-worker.ts:16`), runs a bound copy of the inner board, each bound setting given its value; copies are cached for
each set of bound values, and the stored board, shared by every use of the block, is never written. `Engine.inside(id)`
gives the engine that ran the bound copy, and the page, inside a group, shows that copy's settings, a bound one marked
as set by its input (`curEngine`, `refreshLocal`, `view/nodes.ts:68-70`, which today compare against the stored board).
`groupBlock` gives the port the setting's type, unit and choices. A type's values reach it as its inputs: on a board,
an unwired input's value is typed on the node, in the node's own settings (`n.set`, read for an unwired input,
`dataflow.ts:334`); run by a runner, as the runner's inputs, never through the runner's `set` argument, which the runner
of a block made of a board ignores (`:677`). `expand` writes each value back into its settings, and refuses, saying
why, when the input is wired from another node. Binding a setting whose values give other ports is refused.

**Variants (R9).** On the card before Use, and on a made node's inspector after, each constant has "make an input". The
node made then has that input, its default the constant, under a new id (a type is never changed in place, rule C19).
Opening a made node to change it keeps the values typed on it (`copyInside`, which the page's `openCopy` calls, mending
D33).

**A board as one node (R10).** `foldBoard` folds every node but the in.* nodes, the sinks and the notes. Each in.*
stays on the board, wired in: its output value (not its typed text: `groupBlock` reads a typed default with `Number`,
`:137`, and "10 kN" is not a number) the input's default, its label the input's words. Each wire into a sink leaves
the fold as an output, named by `collapse`'s rule (a clash gets a number, `:492`). Claude's default fold goes through
it.

**The name**: the inner blocks' names joined by arrows, as `suggest` words a pattern today (`:639`), with a number when
another block has it. The person may type over it.

### 2.5 The proof (R11), code only

1. **Refused first**, before anything runs: a place any of whose inputs carries a ± on the board's last run (a fold does
   not carry one yet); a proposal with a block that is not pure downstream of a place, named (the proof would run it).
2. **One run, of the copy only.** The reference is the board's own last run, which a fresh run must equal (11.LW15's
   rule, checked on every quick board). On a copy of the board, every place is rewritten (2.4), the new node a group
   holding the type's board with the place's values typed on it (its own `set`), so nothing is registered before Use.
   The copy runs on an engine and a memo of its own, with the board's env (its clock's time and its code, so a node
   below that reads the clock reads the board's time) and a signal of its own (item 5), given the board's last-run state
   for every node outside the places and what they feed, and it runs only the new nodes and what they feed
   (`downstream`, `:288`; one small addition to `Engine`, which today starts with everything to run, `:200`). So no node
   above or beside the places runs again, and every inner block of a new node runs, none read from the board's memo.
   Measured 2026-11-02 (Steel with an `api.claude` node and a slider, each into a viewer, beside the places; each place
   folded under an id that sorts after its place node's, since D32 is not yet mended; today's `Engine` with its private
   `all` and `dirty`, `:200`, set by a cast): the copy's run looked at 8 nodes and ran 8 (the 5 folds, `all`, `show`,
   `why`), `shape.cyl` 5 times, `api.claude` and the slider 0 times (runs and fails counted together), in 3.4 ms (one
   run), and `all`, `show`, `why` and each `placed` were equal by digest to the board's run; the same copy run fresh ran
   `api.claude` again. At each place, each output of the new node is compared by `digest` (`:61`) with the output it
   replaces on the board's run. Below the places, every node gives the same digest and the same evidence (by port where
   a fold gives it, 2.8); no warning or extrapolation is lost; no ± is lost or smaller. A many-input keeps its order
   because every wire made in place of another keeps that wire's order key (2.7).
3. **Refused by the run**: a place whose own outputs differ, wait or fail is dropped and named, and the copy is made
   again without it and run once more; a value below that still differs refuses the proposal, naming the node. A
   proposal left with fewer than 3 places over the boards searched is not offered (ours, the card's threshold, 2.9).
4. **Its tests**: each place proved is kept as a `BlockTest` row: its inputs as they came into the new node, and the
   digest of each output beside the outputs. `testBlock` compares by digest where a row holds one.
5. **Limits** (ours). One budget of 2 s for each call of `offersOf`, its finding and proving together, and at most 3
   proposals proved a call, best first, as `suggest` shows 3 today (`:639`). The budget is a deadline read from the
   clock (`performance.now()`): one object for the call, whose `aborted` reads the clock, read by the search between
   growth steps and by the copy's engine, as its signal, between nodes (`:303`). Never a timer: a run whose nodes wait
   on nothing outside lets no timer fire, so a timer stops only a run whose node waits on outside work (the pool's workers,
   a fetch: `photo.load` awaits one on the page, `reconstruct.ts:61`), and the clock stops both (measured 2026-11-02, one run each: a 5 ms interval ticked 0 times in a 3,727 ms run of 'A car down
   to its bolts', and an `AbortSignal.timeout(1)` did not stop it; on 'Fit to a target', whose `fit.target` nodes wait
   on the workers, `pool.ts:36-51`, the interval ticked 304 times in a 7,906 ms run and the signal stopped it after 2 of
   its 7 nodes; a clock deadline of 1 ms stopped Metals after 2 of its 45 nodes, and after 3 in another run). A node
   already running finishes, so a call can run past its budget (NC9's eval measures by how much); a call stopped is said
   as stopped, never as a place that fails, and keeps what it found. Every run that `offersOf`, `useOffer` or
   `foldBoard` makes lets the page draw between nodes: `Env` gains `pause`, awaited between nodes (`:303`) and shared by
   a group's own engine (`:425`); theirs awaits a `setTimeout(0)` once 16 ms (ours) have passed since the last. Measured
   2026-11-02 so driven (today's Engine, its private `step` called through a cast): a 5 ms interval got in 6 times
   during the car's first run, and the longest gap was its longest node, `vehicle.model`, 3,136 ms (one run; 7 times and
   2,812 ms in another), since one node still holds the page. Only the page that shows the card calls `offersOf` (where
   `PAGE` holds, `view/nodes.ts:157`); `view/space.html`, the headset's, loads `view/nodes.ts` (`space.ts:23`) but has
   no `#app`. A fold the person or Claude asks for (`makeBlock`, `foldBoard`), and Use, are proved the same way with no
   budget, their time said; an asked fold that does not prove is still made, as asked, with no tests, and the reason is
   said with it.
6. **What it covers**, said on the card: exactly the values those places had. For any other value the node computes what
   its inner blocks compute, because it is those blocks; nothing else is sampled. A kernel certificate for fold equality
   waits on 10.T23.

The proof cannot pass until the fold is honest: the order of a many-input (NC2) and what a fold reads (NC3) come
first.

### 2.6 One block, who made it, and counting (R4, R12, R14)

- **Identity**: a type's id is `my.t-` and 12 characters (ours) of a hash of its shape key, its constants and each input
  (name, bindings, default). The same identity is the same block (`register` says `duplicateOf`), whoever made it; a
  different block under a taken id is refused with the reason. Every fold goes this way, the page's and Claude's.
- **One conversion** between a saved block and a live one, beside `groupBlock`, keeping author, version, tests and
  identity. Every place that converts one today uses it: `keepBlock` and `loadBlocks` (`view/nodes.ts:36-37`), Claude's
  blocks on arrival (`:650`) and `toolsFor` (`agent.ts:179`). The pool's carry becomes a list of saved forms: the block
  and every block not built in that its board reaches, inner first (`carryOf`, `dataflow.ts:705`; `Carry`,
  `pool.ts:13`), and the worker registers each one it lacks (`trial-worker.ts:14`, which today registers only the one
  carried).
- **Who made it**: 'you' for a block saved by hand or made on the person's yes; 'claude' for one Claude folds. A made
  node is the person's, so the gauntlet's delete takes it out as any saved block (it keeps only what is 'built in' or by
  'engine', `gauntlet.ts:443`); that the creator made it is in the record, whose 'offer' event by 'engine' names it.
- **Hand actions** (decision 0019): one for each node placed, one for each wire made, one for each setting or unwired
  input given a value other than its block's default; labels are not counted. Counted from a board by the rule. Steel
  (counted 2026-11-02 by a probe counting every node, wire and value that differs from its block's default): 71 (19
  nodes, 22 wires, 30 values); with the node type of §4, worked by the rule from its inputs (no such type runs yet): 35
  (9, 12, 14).
- **What is offered**: a proposal that is proved and saves nodes. Ranked by hand actions saved over the boards it is
  found on; on a tie, fewer inputs first (research 26, A10: "count the free parameters … not the lines").

### 2.7 A many-input's order (D32)

Only a wire made in place of another, by `collapse`, `expand`, `mergeTwins` or a rewrite, carries `order`: the order
key of the wire it replaces (that wire's `order`, else its source's id). A wire made by `wire()` carries none and sorts
by its source's id, as today. The engine sorts by `order`, else by source id (`:325`), so a board made by `wire()` alone
runs, and is keyed, as it is today. `boardKey` writes `order` where a wire has one, since two inner boards that differ
only in it compute different things.

### 2.8 A fold no stronger than its inside (NC3)

`runInside` returns, beside the outputs, `_evidence`, the evidence of each output (what its group.out reads inside),
the warnings of its inner nodes (`_warnings`) and whether any extrapolated (`_extrapolated`). `judge` (`:370`) gives
such a node an evidence for each output port, the weakest of the group's own ('derived', `evidence.ts:91`), that
port's inside and what is wired in, and the node the weakest of its ports; for each wire in, it reads the evidence of
the port that wire reads (today the node's, `:376`); it reads the other two beside it. So each output reads what it read
unfolded. Measured 2026-11-02 with today's Engine, its `call` and `judge` wrapped to do this: Steel folded place by
place reads `why` 'estimated' and `all` 'hypothetical', and Metals `why` 'derived' and `all` 'hypothetical', as
unfolded (one evidence for a fold, the weakest of its outputs, makes Steel's `why` 'hypothetical'; today a fold makes
both 'derived'). Where a port would read otherwise (an inside stronger than 'derived'; an input weaker than a port it
does not reach), what reads it differs, and the proof refuses, naming it. Because they ride with the outputs, a memo
hit (`:346`), where the child engine never runs, carries them too (measured the same way: a fresh engine served every
fold from the first run's memo and read the same). A block made of a board is a sink when its inside holds a sink
other than group.out.

### 2.9 What the person sees (R13)

The card sits at the top of Suggestions (`view/nodes.ts:655-663`); no modal. It shows a proposal with 3 places or more
(ours) over the boards searched, less those refused, whose places on the open board prove (one or more). For Steel it
reads:

> **Surface texture from the process (roughness, gloss) → Cylinder → Place**, wired alike 5 times here.
> One node instead. Inputs: color (from "Iron: its colour"), process (surface.finish's 12 choices), name, x.
> Outputs: placed, says. Constants: mat steel-low, r 0.02, h 0.16, y 0.08 [make an input].
> 19 nodes → 9. Hand actions 71 → 35 (counted).
> Proved: each of the 5 gives the same values, and everything they feed is the same. Covers these 5 places;
> other values run the same inner blocks.
> [Preview] [Use] [No]

- **Preview** outlines every place it replaces.
- **Use** (`useOffer` in `dataflow.ts`, async, which the page awaits) proves again on the board as it is (2.5), against
  its run once that has finished, with no budget, on the places of the open board (those on other boards are offered
  there when that board is opened). When every place proves, the page registers and keeps the block (by 'you', 2.6;
  version, tests, identity) and takes the rewritten board, each group made a node of the block, as one `edit()` by
  'engine', one undo step. When a place no longer proves, it takes nothing, keeps nothing, and names the place; the card
  comes back after the next run, proved on what is there.
- **After Use** a chip at the foot of the canvas reads "Made '…': 19 → 9 [Undo]"; its Undo is the board's undo (on the
  phone the header hides undo at 860 px wide or less, `view/index.html:120-130`), and the block stays in the library.
- **No** is recorded; the shape is not offered again until it has more places than when it was turned down.
- **On the phone** the same page: the inspector is a closed slide-over at 860 px wide or less
  (`view/index.html:126-127`), and the person opens it with its ⓘ button (`view/index.html:143`, `view/nodes.ts:832`);
  the card is at the top of its Suggestions. Every card and chip button is at least 44 × 44 css px, the size
  `tests/evals/imprint-drag.cjs:169` checks.

### 2.10 Claude (R15) and no model (R16)

- Claude's `fold` with no nodes named is `foldBoard`'s, so viewers, checks and notes stay outside (today they are folded
  in, `agent.ts:237`); with nodes named it folds them as the page does. Either way the block is by 'claude' (today
  'you', `:240`) and is proved as an asked fold is (2.5, item 5). The tools stay eight, and `docs/FOR-AI.md` is
  unchanged.
- Claude's board taken on the page is an 'edit' by 'claude' (2.2); its blocks are kept by 'claude' (`view/nodes.ts:650`).
- This spec adds no prompt and no model call: code finds, makes, proves and offers, and names what it makes. A proof
  runs no block that is not pure (2.5, item 1), so it calls no model, even under the relay where the key is set. Every
  gate test runs with no key, on real boards and real engine runs, the tools called with real inputs as `toolsFor` is
  tested (rule C8).

## 3. The flow, step by step

| # | Step (who) | Waits for | Reads | Writes | Can fail, and then |
| --- | --- | --- | --- | --- | --- |
| 1 | Edit (the person by mouse or tap; Claude's board taken; a board opened; Use) | a press | the board | the board; the board before, in `pushUndo` | it changes nothing: no event |
| 2 | Record (the page) | the next `pushUndo`, or the microtask after | the boards before and after | operations (`opsOf`), one event, to IndexedDB | IndexedDB missing, refusing or full: kept for the visit, said once; the board's save never waits on it |
| 3 | Find (`offersOf`, code; `patterns` extended; only on the page that shows the card) | the board's run | the board in view; each other board, searched again only when changed | shapes, places with their board | past the 2 s budget, a deadline read between steps: stopped, said, what it found kept |
| 4 | Make (code) | Find | the places' values; the blocks' own definitions | inputs, constants, outputs, or each refusal by name | not pure, the clock, live: refused, named |
| 5 | Prove (code; the gate of an offer) | Make | the board's last run; a copy, on an engine and memo of its own, running only the new nodes and what they feed | tests; a verdict for each place; the result kept by `boardKey` | a ± comes into a place, or a block below is not pure: refused before it runs, named; a place differs, waits or fails: dropped, named; past the budget: stopped between nodes, said as stopped |
| 6 | Offer (the page; `suggest` reads the kept result) | Prove | proved proposals; past answers in the record | one card, at 3 places or more | a shape turned down: not shown until it has more places |
| 7 | The person | the card | the card | Use, No, Preview, a constant made an input | leaves it: nothing changes, the card stays |
| 8 | Use (`useOffer`, then one `edit` by 'engine') | Use, and the board's run | the board as it is now and its run | the proof again; the block registered and kept by 'you'; every place rewritten | a place no longer proves: nothing taken or kept, the place named; storage full: the block kept for the visit, said |
| 9 | Log | Use or No | the answer | an 'offer' event by 'engine' | as step 2 |
| 10 | Claude's board on the page | Claude's answer | the board before; Claude's board and blocks | an 'edit' event by 'claude' (`opsOf`); its blocks kept by 'claude' | the kernel refuses a certificate: the board not taken, as today (`view/nodes.ts:651`) |
| 11 | Next round | a run | the board, each made node one node | — | as step 3 |
| 12 | Claude's fold (`fold` in `toolsFor`, `agent.ts:235`, under the relay; called by Claude's tool call) | Claude's tool call; inside it, the proof, with no budget, within Claude's run's limits (30 steps and 180 s unless asked otherwise, read between model turns, `agent.ts:159-160`, so a fold under way finishes) | the board and its last run (`toolsFor`'s `engine` where it ran this board, else the board run first, as `change` runs it, `:221`) | a block by 'claude', with its tests when it proves; the board with the fold; the tool's line back to Claude | the fold does not prove, or cannot be proved (a block below not pure, a ± coming in): made with no tests, as asked, the reason in the tool's line; the run past its limits: stopped at the next turn, as today |

## 4. The cases, worked by hand from the code

1. **Steel, finished five ways** (`starters.ts:277-292`; counted 19 nodes, 22 wires). One shape, surface.finish →
   shape.cyl → place, at 5 places; `fe`, `all`, `show` and `why` outside. Inputs: color (from `fe.hex`), process (a
   setting, `into` f.process; 12 choices), name (a setting, `into` s.name), x (place's unwired input). Constants:
   shape.cyl mat 'steel-low', r 0.02, h 0.16; place y 0.08. Outputs: placed (to `all`), says (`f0`'s, read by `why`).
   The copy: 9 nodes, 12 wires (counted). `all` stays 'hypothetical' and `why` 'estimated' (2.8). 5 tests. Hand actions
   71 → 35 (2.6). Below the places: `all`, `show`, `why`, all pure (measured 2026-11-02).
2. **Metals, coloured by their physics** (`starters.ts:263-275`; counted 45 nodes, 44 wires). optics.colour →
   shape.sphere → place at 14 places. Inputs: metal (`into` c.metal and s.name, optics.colour's 15 choices), x, z.
   Constants: mat 'steel-low', finish 'chrome', r 0.03, y 0.03. Outputs: placed, says. 45 → 17 nodes, 44 → 16 wires
   (counted).
3. **The house** (`seed.house`, its inner board: 14 nodes besides its 4 group.in and 3 group.out, 24 wires in all,
   every node reached from one of its 4 text inputs, none a sink but the group.out nodes; counted with a probe reading
   the seed's board). Copied 3 times onto one board, its group.in nodes made in.text nodes holding a plan of their own
   ('studio', '1 bed', '2 bed') and its group.out nodes view.show: one shape at 3 places, each holding the house's 14
   nodes; the in.text nodes feed each place and are not in it. The user's "the same house 100 times", small.
4. **Bolt, folded whole** (`starters.ts:1026-1044`). Folded: `tau`, `allow`, `pre`, `T`. Outside: `F`, `dd`, `As`, `Sy`,
   `Sp`, `ck`, `s1`, `s2`, the note. Inputs F, d, Sy, Sp, As; outputs result, result2, T (measured with `collapse` of the
   same nodes; `ck`, `s1` and `s2` equal by digest after).
5. **A car down to its bolts** (`starters.ts:756`; counted 10 nodes). Folded whole: 7 nodes; `show`, `measure` and
   `audit` outside and equal by digest (measured with `collapse`). Its first fresh run in a process, cold, took 7.4 s in
   one probe and 4.4 s in another; a fresh run of the folded board after it, in the same process, 2.7 s and 1.1 s
   (measured, one run each). It is a fold the person asks for, so no budget applies; its time is said. It is an eval,
   not a gate test, and it measures once how far a proof runs past a 2 s budget.
6. **Planted** (each must be refused, naming the place and the output): one Steel place's y changed on the board after
   the type was made (that place refused, the type proved for 4); Metals' x and z swapped in the bindings; s.name left
   out of `into`; r 0.031 in the body; the rewrite with its wires' `order` dropped and its new nodes' ids in the reverse
   of their places' order (`all` differs); three places of `a*3` → `b+1`, each into a viewer, each `a` fed by an
   in.number of its own holding 1, 2 and 3, each ±0.1 (each refused before it runs: a ± comes into it; measured
   2026-11-02: each in.number's state carries ±0.1 on its value, and the three places are not twins); `api.claude` wired
   below a Steel place (refused, naming it; its runs and fails in `USAGE` unchanged).
7. **By hand**: on a board holding a combine wired to the 3D view, surface.finish → shape.cyl → place built three times.
   Each chain is built in this order: place surface.finish, shape.cyl and place; wire the finish into the cylinder and
   the cylinder into the place; type its x (0.1, 0.2, 0.3); wire the place into the combine, the edit that makes it feed
   a sink.

## 5. Where the code goes (owners)

No new file under `src/`. Every concern extends its owner.

| Concern | Owner | Change |
| --- | --- | --- |
| A wire's order | `boards.ts` (`BoardEdge`), `dataflow.ts` | `order` on a wire made in place of another; the sort at `:325`; `collapse`, `expand`, `mergeTwins`; `boardKey` |
| What a fold reads | `dataflow.ts` (`runInside`, `judge`, `groupBlock`) | `_evidence` by port, `_warnings`, `_extrapolated`; sink |
| Shape key, finding, making, `foldBoard`, `copyInside`, the proof, `offersOf`, `useOffer`, hand actions | `dataflow.ts` ("smarter", "trees") | extends `shapeKeys`, `patterns`, `suggest`, `collapse`, `makeBlock`; `Engine` started from another run's state, running only what it is given and what that feeds; `Env.pause` |
| `into`; `inside(id)` the bound copy's engine | `blocks.ts` (group.in, `:943`), `dataflow.ts` (`runInside`, `Engine.call`) | — |
| Identity; a taken id refused; tests by digest; the saved-block conversion; the carry of every block reached | `blocks.ts` (`register` `:341`, `BlockTest` `:186`, `testBlock` `:367`), `dataflow.ts` (beside `groupBlock`; `carryOf`), `pool.ts` (`Carry`), `trial-worker.ts` | — |
| Operations | `certify.ts` | `opsOf`; `diffOf` computed from it |
| The event and the log's rules | `boards.ts` | `BoardEvent`, `Op` in place of `calls`; `by` kept |
| The recorder, IndexedDB, the card, the chip, a group's inside shown bound | `view/nodes.ts`, `view/index.html` | `pushUndo`, `useBoard`, start-up, `doUndo`, `doRedo`, `openCopy`, `keepBlock`, `loadBlocks`, `keepBoard`, `curEngine`, `refreshLocal`, Claude's board taken (`:650-651`); `offersOf` called only where `PAGE`; the test hook (`nexusNodes`, `:863`) says how often it ran |
| Claude's fold | `agent.ts` | `foldBoard` with no nodes named; by 'claude' |
| Tests | `tests/nexus/domains.test.ts`; NEW `tests/evals/creator.cjs` (drives the built page by real input, as `imprint-drag.cjs` does); NEW `tests/evals/creator.eval.ts` (the car); `tests/evals/ask.eval.ts` extended (Claude's board and blocks on the page) | — |
| Plan | NEW `plan/specs/13-node-creator/`, NEW `plan/decisions/0019-the-node-creator-extends-its-owners.md`; `plan/README.md`, `plan/DEFECTS.md`, `CLAUDE.md`, `docs/OWNERS.md` | — |

The library law holds as it is: a made node makes the very pieces its inside makes.

## 6. What could go wrong, and what then

- **A fold breaks a board today** (D32; evidence read as stronger). Until NC2 and NC3 land, the proof fails and nothing
  is offered.
- **`into` changes how a node is keyed.** A wrong key would serve a stale value. Guarded by 'turned' then 'ground' on
  one node, fresh equals cached, and the stored board's digest unchanged, on the cases tested.
- **The board's last run is the reference.** It holds only if cached equals fresh, which 11.LW15 checks on every quick
  board, not on every board; a proof never starts before the board's run has finished.
- **"Proved" is exact equality at the places seen**, not a proof for every value; the card says so.
- **Cost.** Places grow with no size limit; one budget of 2 s for each call of `offersOf` bounds the search and the
  proof, and only the new nodes and what they feed run, the page drawn between nodes; one node still holds the page
  while it runs (2.5, item 5), and NC14's eval prints the longest stall on the starter with the most nodes. The house
  (14 nodes, 3 places) is the largest case measured for finding; large boards are not measured.
- **A taken id now refused** may break code that relied on silent replacement: NC8 checks every seed and every saved
  block still registers.
- **Changing `patterns`** may break "Fold one" and `suggest`'s callers: their fields are kept, `suggest` stays
  synchronous, and a shape given as 'type' is no longer given as 'pattern' too.
- **Authorship**: a swap that does not pass the board's author would record a starter's or Claude's work as the
  person's; NC13's evals drive each kind of open and Claude's board.
- **The record holds everything typed**: it stays on the device, in the page's own site data, and no model is sent it.
- **Concurrent work**: another session holds 01.I16 in the view files; NC8, NC10, NC13, NC14 and NC15, which edit
  `view/nodes.ts`, name it in their `after`.

## 7. What is out of reach today

- **Other people's work, and the devices sharing.** "Everyone" is this device's authors until hosting (decision 0011);
  each device keeps its own record and its own made nodes, as saved blocks are kept today.
- **What leaves no edit is not seen**: which tool an edit came from, searches, previews, branches lost to a new edit
  after an undo.
- **Near repeats**: two formulas with other names, strings that follow a pattern. Equational library learning
  (research 26, A10) is where they would come from.
- **A place into which a ± comes** is refused until a fold carries a ± through (2.5); that is uncertainty's work, not
  this spec's. So is a proposal with a block below it that is not pure: the proof would have to run it.
- **The headset shows no card**, and its page never looks for offers (2.5, item 5). Made nodes reach the headset's
  shelves (`wall.shelves`, `view/nodes.ts:941`) as every block saved on that device does; offers are taken on the
  computer or the phone.

## 8. What was cut, and where it went

Each was in an earlier version of this spec and is not needed to build or prove what the user asked:

- A model to name and describe made nodes, and a blind judge of the names (with `ai.step`, a relay endpoint and an eval):
  code names them, the person can type over. The prompt node stays 00.S12's.
- The creator as a board of its own nodes and a starter: it was a second pipeline beside `suggest`; `suggest` is the one.
- An evaluation-set file: each case is written into its task's check, worked by hand in §4.
- A research pass (Stitch, LILO, DreamCoder, gSpan): research 26 (A10; items 15 and 17) already holds what this needs.
- Command prediction (re-ranking `nextFor` from the record): not asked for here; the record is there for it later.
- The AI's tokens and steps, with and without made nodes, and on the event: they stay with `AgentRun` (`agent.ts:79`),
  their owner; what spec 14 needs of them is spec 14's (decision 0019).
- Each place's author: nothing read it (the card does not show it; nothing ranks or gates by it). `Board.by` stays, for
  the 'open' events.
- Hand actions measured from the record, and the 250 ms rule that merged keystrokes for it: the card and the ranking
  read only the figure counted from the board.
- "Fold one" for a shape the card offers: two offers for one repeat.
- "A setting that shapes the ports" as a refusal the search can meet: ports are in the shape key, so such places are
  never one shape; it stays as `into`'s guard on binding (NC5).
- Claude's `fold` with `every` (each place of a named shape folded by Claude): nobody asked for it; Claude's work is
  seen through the record, and the creator offers the person the rest.
- A board family found from the record, and boards of one shape made one type: a constant made an input (R9) gives the
  same with one rule.
- A run of the board itself in the proof, and a replay of each place apart from it: the board's own last run is the
  reference, and one run of the copy, of the new nodes and what they feed, proves every place.
- A counter of `fetch` calls in the proof's check: a node not pure is never run by a proof, which USAGE shows.
- A rule that a block's words never set its evidence: words only ever make a block weaker (`evidence.ts:94` replaces a
  kind stronger than 'estimated' with 'estimated'), so it guarded nothing.
- Author and tests carried to the pool's workers: nothing a worker returns reads them; what is carried is every block
  the board reaches, so it runs.
- A "made by" field apart from the author: the record's 'offer' event names what the creator made.
- A count shown at 2 places: one threshold, the card at 3.
- A "What was done" list with a Clear button, and a source word on each 'open': no user word asks for the list, and the
  author and kind 'open' say who opened what.
- Starters and seed boards searched at run time: they are code, not done by hand, and Use cannot change them; they are
  test boards.
- A fixed size for a shape (6 nodes): it missed the house the user named; the time budget alone bounds the search.
- A Use that takes the board and undoes itself on a difference: Use proves again first and takes nothing on a refusal.
- The headset's card, a shelf of the person's own nodes, export and import, the prefix offer, "Use everywhere", "Not
  now", a ghost drawn on the canvas, `where` on every event, keystrokes merged into one event, the ± carried through a
  fold.
