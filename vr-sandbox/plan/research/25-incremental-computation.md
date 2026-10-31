# Research (round 5): incremental, lazy and demand-driven computation (what to compute, when, and how to know it is still right)
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Not repeated here (already in earlier passes): that only what is observed should be computed (synthesis row 7, from
`09-games-vast-contests.md` and `08-mathematics.md`); TouchDesigner's pull cooking, ComfyUI's input-hash cache and
Excel's dirty propagation named as models (`06-engineering-languages.md`, item 3); differential dataflow named for
Datalog-style rules (`06`); determinism, seeds and replay as a need (synthesis row 6; spec 11 LW2, LW9). This pass asks
**how** those systems decide what to recompute, what each mechanism costs, and in what order Nexus should take them.

What Nexus has today, from the route map at the top of `src/nexus/dataflow.ts` only (the code below it was not read
this pass): every node has a key, "a hash of its block, its settings and the keys of what feeds it"; a node runs again
only when its key changes; two nodes with one key run once between them, on any board; "an edit marks what it touches;
only what is downstream of it is looked at again"; a group "is opened only when it is run or looked into"; run time and
failures are kept per node. [I] In the vocabulary below this is: **input-addressed keys** (Nix's default model, not
Bazel's or content-addressed Nix's), a **dirty-downstream push** (Excel's model), **sharing by key** across boards
(deduplication, as in a constructive-trace store held in memory), and laziness only at the group boundary. What it does
not say it has: early cutoff on equal *values*, a notion of an observer, pull from the observer, durability levels,
volatile/side-effecting nodes declared as such, or a recorded trace that can be replayed and compared.

## (A) Findings

### A1. The vocabulary: Build Systems à la Carte (Mokhov, Mitchell, Peyton Jones)

- [C] The paper splits every build system into a **scheduler** (in what order tasks run) and a **rebuilder** (whether
  a task must run again), and writes each real system as a pair: `make = topological modTimeRebuilder`,
  `excel = restarting dirtyBitRebuilder`, `shake = suspending vtRebuilder`, `bazel = restartingQ ctRebuilder`
  (https://thewagner.net/blog/2019/06/19/build-systems-a-la-carte ; code in
  https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/build-systems.pdf).
- [C] Four rebuilder kinds: **dirty bit** (Excel, Make: anything changed is marked dirty); **verifying traces** (Ninja,
  Shake: keep the hashes of what a task read, rebuild if they differ); **constructive traces** (Bazel: also keep the
  resulting value, so many traces per key can be kept and shared with other users, which is cloud build);
  **deep constructive traces** (Buck, Nix: keep only the terminal inputs, ignore intermediates) (same sources; JFP 2020
  version https://simon.peytonjones.org/assets/pdfs/build-systems-jfp.pdf).
- [C] Shake gained cloud caching by "bolting constructive traces onto the side": keep verifying traces as the
  database, and consult the constructive trace when the verifying one does not match; "we have not found any
  significant downsides" (JFP version, §on Shake, same URL).
- [C] **Early cutoff**: "when it executes a task and the result is unchanged from the previous build, it is
  unnecessary to execute the dependent tasks... Make and Excel do not [support it], whereas Shake and Bazel do"
  (https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/build-systems-final.pdf).
- [M] The paper's other axis: **static vs dynamic dependencies** (Applicative vs Monad tasks). A task whose
  dependencies are only known when it runs (a `switch` node, a spawner reading a table) needs a suspending or
  restarting scheduler; a topological sort over a fixed graph cannot schedule it. [M] It also notes deep constructive
  traces cannot have early cutoff for intermediates, and that a minimal build is not guaranteed by all pairs.
- [I] Nexus today is `topological (or downstream-walk) + input-addressed key`, which is closest to a **deep
  constructive trace** kept in memory: very cheap to check, shareable, but **no early cutoff** — if a node reruns and
  gives the same value, everything downstream still sees a new key and reruns.

### A2. Early cutoff in practice: Shake and Salsa

- [C] Shake: "files that rebuild but don't change don't invalidate rules that depend upon them"; Mitchell calls early
  cutoff "increasingly becoming standard" (http://neilmitchell.blogspot.com/2021/09/reflecting-on-shake-build-system.html).
  [C] Shake's weakness: it cannot see when a *rule's own code* changed ("if you modify a command line in a .hs file,
  Shake is unaware"); `shakeVersion` and `versioned` are the workarounds, "none are pleasant" (same URL).
  [I] Nexus already hashes the block id into the key; whether it hashes the block's **code version** is the same
  question (a block whose implementation changes must invalidate every cached result of it).
- [C] Shake checks dependencies **in the order they were first required**, because an earlier dependency's value may
  change which later ones are needed (https://ndmitchell.com/downloads/paper-shake_before_building-10_sep_2012.pdf).
- [C] Salsa's **red-green** algorithm (inherited from rustc): one global **revision** counter bumped on every input
  set; each input records the revision it last changed; each memo records its dependencies; on a read, if no
  dependency changed since the memo was verified, the cached value returns without running
  (https://salsa-rs.github.io/salsa/reference/algorithm.html).
- [C] Each memo carries **two revisions**: when it was last verified up to date, and when its value last actually
  changed. That pair is what makes early cutoff work: a re-executed query whose value is equal keeps its old
  "changed-at", so its readers stay green
  (https://rust-analyzer.github.io/blog/2023/07/24/durable-incrementality.html).
- [C] rust-analyzer's lesson: "the bulk of work using an incremental system such as Salsa is figuring out things like
  this — introducing effective early cutoff shields and preventing volatile details like positions from accidentally
  sneaking in" (same URL). The AST shields everything above it from edits that do not change structure, *provided*
  positions are not stored in it.
  [I] For Nexus: a node's output that carries a volatile detail (a timestamp, a run id, an object identity, a float
  that wobbles in the last bit from a non-deterministic sum) defeats every cutoff downstream. Outputs must be
  *canonicalised* before they are hashed.
- [C] **Durability**: each input is given a durability; Salsa tracks, per durability, the last revision an input of
  that durability changed. A query that depends only on high-durability inputs is known valid after a low-durability
  edit **without walking its edges** (https://salsa-rs.github.io/salsa/reference/algorithm.html). [C] Described as
  "barriers" that keep propagation out of rarely-updated parts of the graph
  (https://medium.com/@eliah.lakhin/salsa-algorithm-explained-c5d6df1dd291).
  [I] Nexus's natural durabilities: sourced library data (standards tables, CODATA, materials) = high; library block
  boards = medium; the person's own board settings = low; live simulation state = volatile.
- [C] An independent 2026 summary: "dependency tracking only narrows the range you have to re-examine. What reduces
  actual work is the ability to judge cheaply whether a recomputed result matches the old one. Where comparing results
  is expensive, this advantage disappears" (https://www.mrlatte.net/en/research/2026/08/25/incremental-computation-propagation).
  [I] For Nexus the expensive comparison is geometry (a B-rep from OpenCascade): compare a canonical hash of the
  exported shape, not the object.

### A3. Content addressing: Bazel and Nix

- [C] Bazel's remote cache holds two stores: an **action cache** (action hash to result metadata) and a
  **content-addressable store** of output files; an action is its inputs, output names, command line and environment,
  declared explicitly (https://bazel.build/remote/caching). [C] The action cache should be read-only to clients to
  prevent poisoning; the CAS need not be, given checks (https://christianfscott.com/bazel-readonly-action-cache).
  [I] For a shared Nexus library of cached results: anyone may upload bytes (they are named by their hash), but the
  claim "this key gives these bytes" must come from a trusted runner — spec 10's trust model applies to caches.
- [C] Nix paths are by default **input-addressed** (the hash is of the derivation, i.e. the build recipe and its
  dependency graph); such paths "need to be signed by a trusted key" because the store must trust the contents were
  really built by that derivation; content-addressed paths need no signature
  (https://nix.dev/manual/nix/2.18/command-ref/new-cli/nix3-store-make-content-addressed).
- [C] Content-addressed Nix "enables early cutoff (stopping a rebuild if it can be proved that the end-result will be
  the same as something already known)" and changes the trust model
  (https://discourse.nixos.org/t/content-addressed-nix-call-for-testers/12881). [C] RFC 62's mechanism: a derivation is
  **resolved** by replacing its dependencies with their output hashes; `resolved` is deliberately not injective, so two
  recipes whose inputs differ only by derivations with equal outputs resolve to the same thing
  (https://github.com/NixOS/rfcs/blob/master/rfcs/0062-content-addressed-paths.md).
- [C] RFC 62 was proposed in 2019 and `ca-derivations` was still experimental in 2026
  (https://nrd.sh/blog/store-was-never-the-point.html). [I] Retrofitting content addressing onto an input-addressed
  store is hard at ecosystem scale; Nexus is small enough to change now.
- [I] The direct translation: Nexus's key today = `hash(block, settings, keys of inputs)` (input-addressed). The
  resolved key would be `hash(block, codeVersion, settings, hashes of input VALUES)`. The second gives early cutoff and
  lets a cached result be checked by anyone who recomputes it, at the cost of hashing every output.

### A4. Demand: Adapton, Jane Street Incremental, signals

- [C] Adapton (Hammer, Khoo, Hicks, Foster, PLDI 2014, doi 10.1145/2594291.2594324): a **demanded computation graph**
  of cells and thunks, with an edge for every cell read or written and every thunk forced, in order; it "formalizes an
  explicit separation between inner, incremental computations and outer observers", so programs "only recompute
  computations as demanded by observers" (http://matthewhammer.org/adapton ; https://adapton.org).
  [C] Intermediate results nobody uses are not refreshed; they are computed later, against the newest inputs, when
  asked (https://www.mrlatte.net/en/research/2026/08/25/incremental-computation-propagation).
- [C] Adapton adds **first-class names** for cached data and computations ("nominal memoization", OOPSLA 2015)
  (https://docs.rs/adapton). [M] Names let a memo be reused when its *position* in a structure shifts (an insert at the
  front of a list does not invalidate every element), which plain structural hashing cannot do.
  [I] Nexus's node ids are names; the spawner's rows and list-over-items runs need names per item (a row id), not
  positions, or one inserted row reruns every row after it.
- [C] Jane Street Incremental: outputs are read through explicit **observers**; "because it knows which nodes are
  observed, the framework can track what parts of the computation are still necessary"; nothing propagates until
  `stabilize()` is called, and setting a variable does not change an observed value until then
  (https://blog.janestreet.com/introducing-incremental).
- [C] Stabilization processes a recompute heap in ascending **height** order; a node is **necessary** if observed or
  an ancestor of an observed node; each node keeps a recompute id and a change id ("a node can be brought up to date
  without its value changing") (https://timilearning.com/posts/incremental-computing). [C] Height is costly to keep
  exact when `bind` changes the graph shape, so Jane Street moved to a **pseudo-height** to avoid renumbering large
  graphs (https://www.janestreet.com/tech-talks/seven-implementations-of-incremental).
- [C] TC39 Signals (Stage 1 proposal): `Signal.State`, `Signal.Computed`, `Signal.subtle.Watcher`; computation is
  **glitch-free** ("no unnecessary calculations are ever performed... a topological sorting of the potentially dirty
  parts of the graph"), cached, and **pull-based** (a computed runs only on `.get()`), while a write may immediately
  notify a Watcher — "push-pull" (https://github.com/tc39/proposal-signals). [C] A commit spells out a Computed's states
  as clean, **checked** (an indirect source changed; may be stale) and dirty
  (https://github.com/tc39/proposal-signals/commit/c4fa34c2c76bc084bee0e1337bcd9af531d5109b).
  [M] The proposal has no built-in effect; frameworks schedule effects themselves. [M] I did not confirm its stage
  this pass beyond the repository being the proposal's home.
- [C] Preact Signals: each signal keeps a **version number**, incremented when its own value changes; a computed
  stores the versions it last saw rather than the values, because "computed signals are lazy... could hang on to
  outdated and potentially expensive values indefinitely"; dependency lists are linked lists so subscribe/unsubscribe
  is O(1) and dangling computeds need no manual disposal; effects are eager, computeds lazy
  (https://preactjs.com/blog/signal-boosting). [C] "They are lazy by default and automatically skip signals that no one
  listens to" (https://www.npmjs.com/package/@preact/signals, v2.11.3).
- [C] SolidJS: `createMemo` caches a derived value and re-runs only when dependencies change; it acts as a
  **reactivity filter** — effects downstream rerun only if the memo's value changed
  (https://dev.to/lexlohr/the-zen-of-state-in-solidjs-22lj ; https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity).
  [C] Solid's docs show **dynamic dependencies**: a memo that reads `displayTemp` and only then `temperature` stops
  depending on `temperature` while the display is off (same docs URL).
- [C] alien-signals is described as a fast push-pull implementation, and Vue 3.6 (in beta, October 2026) rebuilds its
  reactivity core on it (https://signaldb.js.org/signals). [I] Not verified against Vue's own release notes.
- [I] The push-pull pattern is the one Nexus needs: an edit **pushes** a cheap "checked/maybe-stale" mark downstream
  (no computation); an observer **pulls**, and each node on the way verifies its sources' change-ids before deciding
  to run. That gives laziness, glitch-freedom (nothing reads half-updated inputs) and early cutoff at once.

### A5. Self-adjusting computation (Acar)

- [C] All changeable data lives in **modifiable references**; the run records an **execution trace** (a dynamic
  dependence graph); after a change, change propagation re-executes exactly the readers of changed modifiables, in
  start-time order from a priority queue, and reuses unaffected nested calls through **memoization**
  (http://www.ccs.neu.edu/home/amal/papers/impselfadj.pdf ; http://matthewhammer.org/ismm08/ismm08.pdf).
- [C] Each traced closure is ignored, removed or re-executed during propagation; the result is as if run from scratch
  while reusing as much of the old computation as possible (ismm08 URL). [C] Acar's thesis keywords include **trace
  stability** and kinetic data structures (https://www.cs.cmu.edu/~rwh/students/acar.pdf).
- [C] Memory is the cost: a whole paper is about garbage-collecting traces (ismm08 title, "Memory Management for
  Self-Adjusting Computation").
  [I] For Nexus, fine-grained traces inside a block (every float read) are too costly; the node is the right grain,
  with self-adjusting style only inside hot blocks that iterate over large lists (the spawner, mesh ops).
- [M] Trace stability is the theory of *when* incremental helps: if a small input change causes a small trace change,
  updates are fast; sorting by quicksort is stable in expectation, some algorithms are not. [I] Nexus should measure
  it per block: the fraction of downstream nodes rerun per one-setting edit.

### A6. Spreadsheets

- [C] Excel keeps a **dependency tree** and a **calculation chain** (all formula cells in calculation order); a
  structural change (a new formula) rebuilds both; new data marks all direct and indirect dependents **dirty**; during
  recalculation, Excel **revises the chain** if a formula turns out to depend on a cell not yet calculated
  (https://learn.microsoft.com/en-us/office/client-developer/excel/excel-recalculation). [I] That revision is the
  "restarting" scheduler of A1: the chain is a guess at a topological order, repaired as it runs.
- [C] **Volatile** functions (INDIRECT, OFFSET, RAND, RANDBETWEEN, NOW, TODAY, CELL, INFO) recalculate on almost every
  action and drag their dependents with them, "overriding the efficiency of the dependency tree"
  (https://www.claritix.co.uk/blog/how-to-clean-up-a-slow-excel-spreadsheet ; HyperFormula says the same:
  https://handsontable.com/docs/hyperformula/guide/volatile-functions.html). [C] Excel has a separate "tree rebuild and
  forced calculation" (Ctrl+Alt+F9) for when the tree is not trusted (Microsoft Learn URL above).
  [I] Two lessons: (1) a volatile node must be declared and shown, because one INDIRECT-like node silently makes a
  model slow; (2) "dynamic reference" nodes (INDIRECT/OFFSET: a reference computed at run time) are exactly the
  dependencies a static graph cannot see. Nexus's "pick by name" or "lookup row" nodes are its INDIRECT.
- [C] Multithreaded recalculation since Excel 2007, up to 1024 threads; Excel "analyzes the calculation chains...
  looking for lengths of chain that can be processed in parallel"; some built-ins (CELL, INDIRECT, GETPIVOTDATA,
  ADDRESS, HYPERLINK...) are not thread-safe; XLL functions must be registered thread-safe
  (https://learn.microsoft.com/en-us/office/client-developer/excel/multithreaded-recalculation-in-excel ;
  https://bettersolutions.com/excel/formulas/calculation-multi-threading.htm). [C] "There will be workbooks where the
  overhead of analyzing the calculation chains outweighs the gain" (https://fastexcel.wordpress.com/2014/01/29/threading-and-hyper-threading-optimizing-excel-calculation-speed-by-changing-the-number-of-threads).
  [I] Nexus has a worker pool (`pool.ts`, imported by `dataflow.ts`); blocks need a declared "pure, transferable,
  thread-safe" flag before they can be sent to it, as XLLs do.
- [C] HyperFormula (an open-source JS spreadsheet engine) uses the same dependency tree plus calculation chain, with
  volatile functions always dirty (HyperFormula URL above). [I] A JS reference implementation to read.

### A7. Node-graph tools: TouchDesigner, Houdini, Grasshopper, Unreal PCG

- [C] TouchDesigner is a **pull system**: changing a Constant CHOP makes it dirty "but it won't cook until someone asks
  for its data". Each frame it considers cooking only nodes whose **viewers are visible**, nodes feeding a displayed
  panel or window, and nodes feeding an **output** (network out, video or audio out)
  (https://derivative.ca/UserGuide/Cook).
- [C] Some nodes **always cook if asked** even when nothing changed (Render TOP, the In OPs) because their possible
  input changes are too many to monitor; and **Out OPs cook every frame** regardless, so the receiver gets a continuous
  stream (same URL). [C] Per-node cook time and cook count are visible on middle-click (same URL).
  [I] Three cook policies to name in Nexus: *cook-on-change-if-asked* (default), *always-cook-if-asked* (cheaper to run
  than to prove unchanged), *always-cook* (a sink or a clock).
- [C] Houdini TOPs: "Cook Output Node" cooks only what needs cooking; "Dirty and Cook" forces; "Dirty All" marks
  without cooking; a work item whose attributes changed is dirty; but **TOPs does not check input and output result
  files** — deleting an intermediate file does not dirty its users (https://www.sidefx.com/docs/houdini/tops/cooking.html).
  [I] A cache keyed on recipe but not verified against the stored artefact can serve a missing or altered result.
- [M] Houdini SOPs cook from the **display flag** (what is shown) and the render flag; nodes off those paths do not
  cook; a time-dependent node (one reading `$F`) is badged with a clock and makes everything below it time-dependent
  (the clock badge is [C] in https://www.youtube.com/watch?v=T5PjE5SsHF8 at 28:36). [I] Nexus's `clockOf` in
  `blocks.ts` is the same concept; the badge should propagate visibly.
- [C] Grasshopper: when a slider moves, it marks it changed and re-solves everything downstream, in order, leaving
  upstream untouched (https://www.studiomatrx.org/students/computational-parametric-design/the-grasshopper-canvas);
  `ExpireSolution(recompute)` erases caches and expires all downstream objects
  (https://developer.rhino3d.com/api/grasshopper/html/M_Grasshopper_Kernel_GH_DocumentObject_ExpireSolution.htm);
  expiring many with `recompute=false` then solving once follows the "optimal" order, upstream first
  (https://discourse.mcneel.com/t/expiring-multiple-components-in-the-gh-canvas/152707).
  [M] Grasshopper has no early cutoff and computes components whose preview is off; large definitions are known to
  slow down for that reason; users disable components or use "data dam" to hold changes. [I] Grasshopper is Nexus
  today: eager push, no cutoff. The data dam is a manual observer boundary.
- [C] Unreal PCG has four generation modes: non-partitioned, **partitioned** (a grid of cells), **hierarchical**
  (a Grid Size node sets the grid for everything downstream, large grids for trees and boulders, small for grass),
  and **runtime** generation with generation sources, scheduling policies and **frustum culling**
  (https://dev.epicgames.com/documentation/unreal-engine/using-pcg-generation-modes-in-unreal-engine, 5.5 to 5.8).
  [C] PCG has a graph cache with a bounded element count (`pcg.Cache.GraphCacheMaxElements`) and an editor memory
  budget (https://unrealdirective.com/resources/console-variables/pcg-cache-graphcachemaxelements).
  [C] PCG determinism advice: seeds derived from the component seed plus node index, "Seed From Position"
  (https://bugnet.io/blog/fix-unreal-pcg-determinism-different-results). [I] This is the cleanest prior art for LW1's
  "a city board with one street viewed computes only that street": demand is *spatial* (cells near a generation
  source, inside the frustum), at a grain set *in the graph* by a node.

### A8. Collections: differential dataflow, DBSP, Skip, React

- [C] Materialize builds on differential dataflow, which sits on timely dataflow; DBSP imposes more structure for a
  simpler implementation; Feldera builds on DBSP; "frontend tools are shifting toward differential-like incremental
  maintenance" (https://materializedview.io/p/everything-to-know-incremental-view-maintenance). [C] Timely uses
  epoch timestamps; differential tracks multiple versions to reuse prior results; DBSP converts any SQL query into an
  incremental circuit (https://risingwave.com/blog/what-is-incremental-view-maintenance).
  [M] The core idea: a collection is a stream of **(record, time, ±count) differences**; operators (map, filter, join,
  reduce, iterate) take differences in and give differences out; `iterate` handles recursion (graph reachability)
  incrementally. [I] For Nexus: list-valued ports (a city's thousand buildings, a bill of materials) should carry
  *changes* (+row, −row) between nodes, so a one-row edit costs one row downstream, not a thousand.
- [C] Skip (SkipLabs): a framework for "reactive services" with a native backend and TypeScript interfaces
  (https://github.com/SkipLabs/skip); the earlier Skip language tracked side effects in the type system and allowed
  memoizing a function only where purity was proved, with "reactive invalidations" from data sources
  (https://skiplang.com). [I] The lesson Nexus can take without a type system: a block may be cached only if it
  declares itself pure; impurity (clock, random without seed, network, the AI) must be declared and shown.
- [C] React's reconciliation is an O(n) heuristic resting on two assumptions: elements of different types produce
  different trees (full remount), and a `key` prop hints which children are stable across renders; general tree diff
  is O(n³) (https://legacy.reactjs.org/docs/reconciliation.html). [C] Index keys break on reorder and reuse the wrong
  node (https://visualizejs.com/react/reconciliation). [I] The same rule for Nexus's list-over-items and spawner: per-row
  identity by a stable id, never by index; and when a node's *block* changes, its cache and sub-state are dropped,
  not diffed.

### A9. Glitch-freedom and order

- [C] Glitch: "if a changes, and a computed b depends on a, and another computed c depends on both a and b, a naive
  system could compute c with a stale b and the new a"; signals prevent it by topological ordering of the dirty part
  (https://www.mironsoft.de/en/blog/javascript-signals-reactive-programming-paradigm ; TC39 README above).
- [C] Jane Street's height order is the other route to glitch-freedom (A4).
- [I] In Nexus a glitch is not only a wasted run; it is a **wrong number shown for a frame** (a mass computed from a
  new length and an old density) that an AI agent or a check could read and act on. Any value the agent reads must
  come from a stabilised state with a revision number.

### A10. What these say about LW2 (replay)

- [I] A recorded verifying trace per run (each node: revision, input change-ids, output hash, cook time, seed used) is
  already most of a replay log. Replaying = feeding the same inputs and checking every node's output hash matches; the
  first mismatch in height order *is* the desync detector LW2 asks for, and it names the node.
- [I] Early cutoff and replay need the same thing: a canonical, stable output hash. Building one serves both.
- [I] Volatile nodes (clock, unseeded random, network, AI) are where replay breaks; recording their outputs as
  inputs in the log (as Excel's NOW() would need) makes the rest replayable. This matches LW1's "declared side
  effects".

## (B) What Nexus should take

In order. Each step is useful alone and makes the next cheaper. Owners as in `../CLAUDE.md`: mainly `dataflow.ts`
(engine), `blocks.ts` (block definitions), `pool.ts` (workers), `boards.ts` (documents), `view/` (badges).

1. **Rule, block metadata: purity and cook policy declared on every block** (spec 11 LW1 "declared side effects";
   spec 10 trust). `BlockDef` gains `effect: 'pure' | 'seeded' | 'clock' | 'volatile' | 'io' | 'agent'` and
   `cook: 'on-change' | 'always-if-asked' | 'always'` (TouchDesigner's three). Default for unknown blocks is
   *volatile*, not pure; a check fails a block that reads `Date`, `Math.random`, `fetch` or the agent without saying so.
   A badge (Houdini's clock) propagates downstream to show what is time- or chance-dependent. Pure and transferable
   blocks may go to `pool.ts` (Excel's thread-safe registration).
2. **Data model: a canonical output hash, and two revisions per node** (spec 00 structure; LW2). After a node runs,
   its outputs are canonicalised (stable key order, floats rounded to a declared tolerance or hashed bit-exact by
   policy, no ids, times or positions that are not part of the value — rust-analyzer's lesson) and hashed. Each node
   keeps `verifiedAt` and `changedAt` (Salsa). One global revision counter on the engine. Geometry hashes its
   exported canonical form, not the object.
3. **Rule: early cutoff** (00; the cheapest large win). Downstream keys are computed from **input value hashes**
   (the resolved key of Nix RFC 62), not from input keys. A node that reruns and gives the same hash leaves
   `changedAt` alone; its readers stay valid. Keep today's input-addressed key as a fast first check (Shake's bolt-on:
   verifying first, constructive second). Include the block's **code version** in the key (Shake's weakness).
4. **Engine: push a mark, pull the work** (LW1). An edit marks downstream nodes *checked* (maybe stale) — no running.
   **Observers** decide what runs: the visible 3D view, open panels and inspectors, an export or sink node, a check,
   a pinned output, and the agent's read (Jane Street's observers; TouchDesigner's viewer list). Pull walks from an
   observer, verifies each source's `changedAt` in the order first read (Shake), runs only what is stale, in height
   order (glitch-free). Unobserved nodes stay stale until asked. A per-board "stabilise" gives the agent and checks a
   consistent revision; the agent never reads a value without its revision.
5. **Node: `observe` and `dam`** (07 ideas; 00). An `observe` node pins an output as demanded without a view (a
   test, a KPI). A `dam` node (Grasshopper's data dam, made explicit) holds changes until released, for expensive
   sub-boards while dragging a slider. Both make demand visible on the canvas.
6. **Rule: durability bands** (10 trust; 00). Inputs carry durability: library and sourced data high, library block
   boards medium, the person's settings low, simulation state volatile. A node depending only on high-durability data
   is skipped by the validator in one comparison (Salsa). This is what keeps a thousand library bolts free after a
   single slider edit.
7. **Data model: per-item names for lists** (00; LW1 at city scale). The spawner and list-over-items runs memoise
   per **row id**, never per index (Adapton names; React keys). Changing a node's block drops its cache and sub-state
   rather than diffing. Later, list ports carry **differences** (+row, −row, changed row) between nodes that declare
   they can consume them (differential dataflow), so a one-building edit costs one building.
8. **Node: spatial demand for worlds** (11 LW1, LW8; Unreal PCG). A `cells` or `grid.size` node partitions what is
   generated below it; demand comes from generation sources (the camera, an agent, a probe) with radius and frustum;
   cells far away are not computed, and cells computed are cached by (cell id, upstream hash). Seed per cell =
   hash(board seed, node id, cell id) (PCG's component seed plus index), so a cell is the same whenever it is asked
   for. The LW1 check ("one street viewed computes only that street, measured node count") becomes a node-count
   assertion on this.
9. **Way of working: the run record is the replay log** (LW2, LW6 chronicle). Every stabilise writes, per node that
   ran: revision, input hashes, output hash, seed, cook time, effect kind; volatile and agent outputs are stored as
   values. Replay re-feeds the log and compares hashes in height order; the first mismatch is the desync, named by
   node (LW2's detector). The same log answers "why did this rerun" (the input whose hash moved) for the person.
10. **Data model: a shared result cache with a trust split** (10 trust; 03 web). Results by output hash in a
    content store anyone may fill; the mapping "resolved key → output hash" only from trusted runners or with
    re-verification by sampling (Bazel's read-only action cache; Nix's signing of input-addressed paths). Verify the
    stored artefact's hash on read (Houdini TOPs' gap).
11. **Way of working: measure incrementality** (00 checks). For each block family, a test edits one setting and
    counts nodes rerun and cutoffs taken (trace stability, Acar). A regression in that count fails the round like a
    wrong number would. Show cook time, cook count, hit/miss/cutoff on the node (TouchDesigner, Houdini performance
    monitor).
12. **Rule: declared dynamic dependencies** (00; 09 physics core). Nodes whose reads depend on values (switch,
    lookup by name, "pick part", the INDIRECT family) declare it; the engine records actual reads per run and treats
    them as the dependencies (Shake's suspending scheduler; Solid's dynamic tracking). Spec 09's equation compiler
    should be kept *out* of this: an acausal block is one node to the dataflow engine, with its own internal
    incrementality (re-sort only when structure changes; re-solve when values change).

Do not take: fine-grained self-adjusting traces of every read inside blocks (memory cost, A5); a full differential
dataflow runtime before list ports exist and are measured slow; a hand-built multithreaded scheduler before pure
blocks are declared and the pool is shown to pay (Excel's overhead warning).

## (C) Questions

### What Nexus has today
1. Does the current key include the block's code version, or only its id?
2. Does any block today read `Date.now`, `Math.random` without the seeded `rng`, `fetch`, or the agent, and is it marked?
3. How many nodes on a typical library board rerun after a one-slider edit today, measured?
4. What fraction of those reruns produce an output equal to the previous one (the cutoff that is being missed)?
5. Is the cross-board sharing by key bounded in memory, and what evicts it?
6. Does "an edit marks what it touches" walk the whole downstream set eagerly, and how long does that take on the largest board?
7. Are group boards' internal caches kept when the group is closed, or dropped?
8. What does the engine do today on a cycle: refuse, or run to a fixed point?

### Hashing and canonical values
9. What float policy should output hashing use: bit-exact, rounded to the port's stated tolerance, or both kept?
10. How is a B-rep from replicad/OpenCascade canonicalised for hashing (BREP text, STEP, a mesh, a feature tree)?
11. Is OpenCascade's output deterministic across runs and browsers for the same input, measured?
12. What is the cost of hashing large outputs (meshes, point sets) compared with recomputing them?
13. Should outputs carry evidence (sources, ranks) inside the hashed value, or beside it?
14. Which fields of today's outputs are volatile (ids, timestamps, run counters) and would defeat cutoff?
15. Which hash function: the existing `hash` in `assembly.ts`, or a cryptographic one for the shared cache?
16. What is the collision risk at a million cached results with the current hash width?

### Demand and observers
17. Which things count as observers in Nexus: the 3D view, an open inspector, a check, an export, the agent, a test?
18. Does a node hidden behind an object in the 3D view count as observed?
19. What happens when the agent reads a value that is stale: wait for stabilise, or read and flag?
20. Should physics (Jolt) steps be observers of the boards that feed them every frame?
21. How is "observed" shown on the canvas, so a person knows why a node did not run?
22. What latency is acceptable between a slider drag and a pulled result in VR?
23. Should unobserved stale nodes be computed in idle time (speculative warm-up), and with what budget?
24. How does demand cross a group boundary: does observing a group's output observe only the inner nodes it needs?
25. Can a `dam` node hold a change while the person drags, and release on let-go, without glitches?

### Durability and data
26. Which inputs are high durability: standards tables, CODATA, materials, library boards?
27. What happens to durability when the person edits a library block locally?
28. How many durability bands are worth having (Salsa uses a few)?
29. Should sourced data updates (a new CODATA) bump a high-durability revision and show what moved?

### Lists, names and collections
30. What is the stable identity of a spawner row: a row id from the table, a hash of its contents, or position?
31. Which list-valued ports are large enough to need difference streams?
32. Which operators would need difference forms first: map, filter, group-by, join, sum?
33. How does a list-over-items run memoise per item today, if at all?
34. When a block on a node is swapped for another, should any cached state be carried over?
35. Can the "what repeats" suggestion use output hashes to find nodes that compute the same thing by different routes?

### Spatial demand and worlds (LW1, LW8)
36. What is the cell grain for a city board: per street, per block, a fixed metre grid, or set by a node?
37. How are hierarchical grains chosen (buildings on a large grid, bolts on a small one)?
38. What are the generation sources: the camera, agents, probes, a sensor node?
39. How is a cell's seed derived so a cell is the same whenever generated?
40. What happens at cell borders where an object spans two cells?
41. How is "computes only that street" measured: node runs, cell runs, or time?
42. Are far cells given a coarser level of detail instead of nothing (with `lod.ts`)?

### Replay and determinism (LW2, LW9)
43. What must a run record hold to replay: input values, seeds, volatile outputs, engine version, block versions?
44. How big is a run record for a city simulation per minute, and how is it compacted?
45. Does replay check every node's hash or only observers' hashes?
46. How does replay treat agent outputs: recorded values, or re-asked with a frozen prompt?
47. Is the desync detector the same code as the early-cutoff comparison?
48. How do worker-pool results stay deterministic when they finish in different orders?
49. Can a run record be shared so someone else replays a board exactly, and is that a privacy concern?

### Scheduling and parallelism
50. Which blocks are pure and transferable enough for `pool.ts`?
51. When does sending a node to a worker cost more than running it (Excel's overhead warning)?
52. Should scheduling be by exact height or by pseudo-height when boards change shape often?
53. How are dynamic dependencies recorded and replayed when a switch changes branch?
54. Should long cooks be interruptible when an edit arrives mid-run, and how is half-done work discarded?
55. How is a cook-time budget per frame enforced in VR, and what is shown when it is exceeded?

### Shared cache and trust
56. Who may write the "key gives this result" mapping in a shared cache?
57. How often should cached results from others be re-verified by sampling?
58. Does a cached result carry the evidence rank of the run that made it?
59. How is a poisoned cache entry found and every result built on it invalidated?
60. Should a cached result from a different engine version be used if the block code version matches?

### Interaction with other specs
61. How does spec 09's equation compiler fit: one node with internal incrementality, or many nodes?
62. Does spec 10's uncertainty propagation (intervals, Monte Carlo) change the hash of a value, and should a wider interval cut off?
63. Does a Monte Carlo node's seed belong to the node, the board, or the run?
64. How do interface (spec 01) mates react when a bolt's standard row changes: cutoff at the interface if the hole is unchanged?
65. Does the chronicle (LW6) read the run record, or keep its own log?
66. Should the agent be told which nodes reran and why after each edit it makes?
67. Can the "what is dead" analysis use the observer set (a node no observer can reach is dead)?

### The person's view
68. How is a cutoff shown (the node ran, the value did not change, nothing below moved)?
69. Should a person be able to force a full recompute (Excel's Ctrl+Alt+F9), and is that ever needed if hashes are right?
70. How is a volatile node made obvious enough that a person avoids it (Excel's INDIRECT trap)?

## (D) New branches

- HyperFormula's source (an open JS spreadsheet engine with a dependency graph and calculation chain) as a reference implementation in Nexus's own language.
- alien-signals' algorithm and Vue 3.6's adoption of it: a fast push-pull core that might be taken whole for the engine's marking pass.
- The TC39 Signals polyfill and its stage: whether a standard primitive will exist in browsers in time to build on.
- DBSP (Budiu et al.) and Feldera: an algebra that makes any query incremental; whether Nexus's list nodes could be compiled to it.
- Adapton's nominal memoization paper (OOPSLA 2015) in detail, for spawner rows and list edits.
- Jane Street's "Seven Implementations of Incremental" talk in full: pseudo-height, bind nodes, and their mistakes.
- rustc's query system and its on-disk incremental cache: persisting verified traces between sessions.
- Salsa's cycle handling (fixed-point iteration for cyclic queries) for Nexus's loops and solvers.
- Datalog engines with incremental maintenance (Soufflé, Differential Datalog/DDlog) for interface rules "what may touch".
- Build Systems à la Carte's treatment of minimality and correctness proofs: a property test Nexus could run (incremental result equals from-scratch result).
- Houdini's compiled blocks and "invoke compiled" nodes: how a sub-network is compiled to skip per-node overhead.
- Unreal PCG's runtime generation scheduling policies in detail (priorities, budgets per frame).
- TouchDesigner's "cook on change if asked" internals and its performance monitor as a UI model.
- Grasshopper 2 (in development) and whether McNeel added cutoff or lazy solving.
- Observable notebooks' runtime (dataflow cells, lazy invisible cells), already named in research 09, not yet studied for mechanism.
- Excel's LAMBDA and dynamic arrays: how spill ranges change the dependency tree.
- Kinetic data structures (Acar's thesis keyword): incremental geometry under motion, for physics broad-phase.
- The Glimmer/Ember autotracking model (revision tags) as another version-number design.
- Incremental parsing (tree-sitter) as a model for incremental geometry edits.
- Memory budgets and eviction policies for memo tables (PCG's element cap; Salsa's LRU; Bazel's disk cache GC).
- Reproducible-builds work (reproducible-builds.org) on finding nondeterminism sources: a checklist for LW9.
