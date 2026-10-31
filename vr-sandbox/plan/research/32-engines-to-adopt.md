# Research (round 6): Engines worth taking whole for early cutoff and pull-based evaluation
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Builds on `25-incremental-computation.md` (its (B): canonical output hashes, early cutoff, push a mark and pull the
work, durability bands, per-row memoisation, a replay log). This pass asks only: which existing code can be taken whole,
or have its algorithm copied, and how does the change land in `src/nexus/dataflow.ts`. Network notes: preactjs.com,
salsa-rs.github.io, blog.janestreet.com, hyperformula.handsontable.com and the GitHub API were not reachable from this
session; sources were read through raw.githubusercontent.com, registry.npmjs.org, docs.rs and Tavily instead.

## (A) Findings

### A0. What `dataflow.ts` does today (read this pass, lines named)

- [C] `Engine.run()` (line 256) computes `look = downstream(dirty)` and walks the whole Kahn order, calling `step` on
  every node in `look`, one `await` at a time. That is **push**: everything downstream of an edit is looked at whether
  anyone is watching it or not. There is no notion of an observer.
- [C] The key (line 301) is `hash(block.id@version : boardKey(graph) | stable(set) | keys… | #id-if-impure)`, and each
  wired input contributes `${p.name}<${s.key}.${w.out}±u` (line 289): **the upstream node's key, not its value**. So the
  key is input-addressed (Nix's default, `25` A3). A node that reruns and gives the same value still has a new key, and
  every reader reruns: **no early cutoff anywhere in the engine**.
- [C] The skip test is `was.status === 'ok' && was.key === key` (line 302), then the shared `Memo` by key for pure blocks
  (line 303). Both tests already exist; early cutoff needs only that the key stop moving when values do not.
- [C] A group's inputs are **already value-hashed**: `runInside` (line 613) sets each feed's key to
  `hash(stable(value))`. So content addressing exists at group boundaries today, and `stable()` is already run over
  arbitrary values, parts included.
- [C] `stable()` (line 42) writes JSON with sorted keys through `Object.keys`. [I] It therefore writes every `Map` and
  every `Set` as `{}`, every function as `undefined`, and drops class identity: two different Maps, or two different
  closures, hash the same. Today that hazard is confined to group feeds; if output hashes are made with `stable()` as
  it stands, a cutoff could keep a **wrong** value. Any digest used for cutoff must refuse what it cannot see (give a
  fresh, never-equal token) rather than flatten it.
- [C] `hash()` (assembly.ts line 331) is two 32-bit FNV/murmur-style mixes printed base 36: about 64 bits.
  [I] Fine for a 20,000-entry memo (collision odds near 2^-35 per pair-set at that size), not for a shared,
  cross-user content store (`25` B10), which wants SHA-256 (WebCrypto `subtle.digest`, async).
- [C] `fresh()` (line 269) calls `this.memo.clear()`, and the default memo is `SHARED` (line 147). [I] Pressing "Run
  everything afresh" on one board therefore empties the memo every board and every spawner shares. Probably intended
  as "no cache", but it is app-wide.
- [C] Blocks default to `pure: true` (`blocks.ts` line 470, `def = … pure: true, ...d`); 20 places under `src/` say
  `pure: false` explicitly (in `blocks.ts`: lines 922, 930 `ai.ask`, and the research, gauntlet, task, event, search and
  delete blocks from line 2404 on); every other block is pure by default, unchecked. [I] `25` B1 asked for
  *volatile* by default; with cutoff, a wrongly-pure block that reads `Date` or `Math.random` would now freeze its
  readers too, not only itself.
- [C] The gate (`npm run gate` = `tsc --noEmit` + `vitest run`; the one test `tests/nexus/domains.test.ts`) runs each
  field's quick board once: `new Engine(b, env); await e.run()` (test line 126) and fails on any failed node. [I] It
  never runs a second, incremental pass, so **nothing in the gate today checks that a cached run equals a fresh run**.
  Any engine change below is unguarded until that check exists. `fresh()` is used only by two buttons in
  `view/nodes.ts` (lines 658, 770).
- [C] Loops: `shape()` runs Kahn's algorithm and fails every node left over with "in a loop: it feeds what feeds it";
  `canWire` refuses a wire that would close a loop.

### A1. alien-signals (and Vue 3.6, which ported it)

- [C] npm `alien-signals` 3.2.1, published 2026-05-14, MIT, 47,145 bytes unpacked, first published 2024-10-09, 81
  versions (https://registry.npmjs.org/alien-signals).
- [C] Algorithm: push-pull; a node has flags `Mutable, Watching, RecursedCheck, Recursed, Dirty, Pending`; dependencies
  are `Link` objects in doubly linked lists (`nextDep`, `nextSub`, `prevDep`, `prevSub`) with a per-link `version`; no
  Array, Set or Map in the core; `propagate` and `checkDirty` iterate with explicit stacks, not recursion
  (https://raw.githubusercontent.com/stackblitz/alien-signals/master/src/system.ts ; README
  https://github.com/stackblitz/alien-signals). The core is a factory `createReactiveSystem({update, notify,
  unwatched})`, so the graph walk can be reused with one's own node kinds.
- [C] Cutoff: a computed's `update` is `oldValue !== (c.value = c.getter(oldValue))`, a signal's is
  `currentValue !== (currentValue = pendingValue)` (src/index.ts): **reference inequality only**, no custom `equals`.
- [C] Async: not supported in the core; a separate `@lazy-promise/alien-signals` adds it (README). Cycles: recursion
  flags exist; the README does not describe cycle handling. [I] A read cycle is not reported as an error the way Preact
  or the TC39 polyfill report it.
- [C] Adopters named in its README: Vue core (PR #12349), XState (atoms, PR #5250), vuejs/language-tools (virtual code
  generation, incremental AST parsing).
- [C] Vue 3.6.0-rc.1 notes: "3.6 also includes a major refactor of `@vue/reactivity` based on alien-signals, which
  significantly improves the reactivity system's performance and memory usage" (https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1).
  [C] On npm, Vue stable is still 3.5.44 (2026-10-13); 3.6 is at `rc` 3.6.0-rc.14 (2026-10-30). `@vue/reactivity`
  3.6 depends only on `@vue/shared`: the algorithm was **ported into Vue's source, not taken as a dependency**
  (https://registry.npmjs.org/@vue/reactivity).
- [C] Measured: js-reactivity-benchmark snapshot 2026-09-19, Node 25.9.0, Apple M3 Pro, min of 3 samples, geometric
  mean relative to the fastest per case: alien-signals 1.02× kairo, 1.33× mol, 1.02× s, 1.00× dynamic, 1.00× cellx;
  e.g. kairo `deepPropagation` 52.3 ms, `diamond` 89.3 ms
  (https://raw.githubusercontent.com/transitive-bullshit/js-reactivity-benchmark/main/results/latest.md). The snapshot
  measured `@vue/reactivity` 3.5.43 (not the 3.6 port): 2.05× kairo, 2.79× cellx.

### A2. The TC39 Signals proposal and its polyfill

- [C] Stage 1. The tc39/proposals Stage 1 table lists Signals with notes from 2024-04 and 2024-06 only
  (https://raw.githubusercontent.com/tc39/proposals/main/stage-1-proposals.md). A secondary page says "still at Stage 1
  as of October 2026" (https://signaldb.js.org/signals). [C] The proposal README itself still says it "can currently be
  thought of as 'Stage 0'" and lists production-grade polyfills as a Stage 2 prerequisite
  (https://github.com/tc39/proposal-signals). [C] A page claiming Stage 4 in ES2026 (tech-champion.com) is contradicted
  by the TC39 table; it is wrong.
- [C] Semantics: `equals` option, default `Object.is`; a throwing `equals` stores the error and counts as "not equal";
  "It is an error to read a computed recursively" (throws on a cycle); "Signals are always synchronously available";
  async is "omitted for now" (issue #30); `Watcher.notify` runs synchronously during `.set()` and may not read or write
  signals; `getPending()` returns dirty or pending computeds (proposal README, same URL).
- [C] `signal-polyfill` 0.2.2, Apache-2.0, 142,258 bytes unpacked, last release 2025-01-17 (21 months ago), 6 versions
  (https://registry.npmjs.org/signal-polyfill). The README says not to rely on its stability.
- [C] Measured (same benchmark snapshot): 6.19× kairo, 10.45× dynamic, 3.28× cellx; kairo `deepPropagation` 241.2 ms
  against alien-signals' 52.3 ms.

### A3. Preact Signals internals

- [C] `@preact/signals-core` 1.14.5, MIT, published 2026-10-27, 269,115 bytes unpacked (https://registry.npmjs.org/@preact/signals-core).
- [C] From the source (https://raw.githubusercontent.com/preactjs/signals/main/packages/core/src/index.ts): a global
  `globalVersion` bumped on every write; each source and computed has `_version`; each dependency edge (a node in a
  doubly linked list) remembers the source `_version` it last saw. A computed first checks
  `this._globalVersion === globalVersion` (nothing anywhere changed: return at once, one comparison); else
  `needsToRecompute` walks its sources **in order of first use**, refreshing each, and stops at the first whose version
  moved ("only the first used dependency is re-evaluated at this point"). After recompute it bumps its own `_version`
  only if `this._value !== value` — that is the early cutoff, by reference.
- [C] Cycles: `throw new Error("Cycle detected")` from both the computed's refresh (RUNNING flag) and effects
  (lines 464, 754 of that file). Async: none in core.
- [C] Measured: 1.20× kairo, 1.30× mol, 1.31× s, 1.29× dynamic, 1.45× cellx (benchmark snapshot above).
- [I] The global-version short-circuit is Salsa's durability check with one band; the in-order source walk is Shake's
  "check dependencies in the order first required" (`25` A2). Both are a few lines to copy.

### A4. SolidJS 2.0 reactivity (`@solidjs/signals`)

- [C] npm: `solid-js` latest 1.9.18; `next` 2.0.0-rc.20 (2026-10-29) depending on `@solidjs/signals` ^2.0.0-rc.20,
  MIT, `@solidjs/signals` rc.20 2,776,939 bytes unpacked (https://registry.npmjs.org/solid-js ;
  https://registry.npmjs.org/@solidjs/signals).
- [C] Solid 2.0 RC: "async is a property of the reactive system itself. It's part of the graph"; a memo may return a
  promise; readers suspend until it settles; `isPending`, `latest`, `refresh`, `action()` transactions
  (https://www.solidjs.com/blog/solid-2-0-rc-the-big-reveal ; https://www.npmjs.com/package/@solidjs/signals ;
  https://www.infoq.com/news/2026/05/solidjs-2-async). [C] The npm page still calls the package "Beta … may still have
  breaking changes".
- [C] Measured: the benchmark's "x-reactivity" row is `@solidjs/signals` 2.0.0-rc.0: 3.50× kairo, 2.78× dynamic, 3.79×
  cellx; kairo `diamond` 376.9 ms against alien-signals' 89.3 ms. Solid 1.9: 4.07× kairo.
- [I] It is the only signals core here that models async nodes, which is Nexus's normal case. Its pending and
  latest-value states are the right vocabulary for Nexus ("this node is being worked out; here is its last value").
  But it is pre-release, UI-scheduled (updates flushed as a batch), and 2.8 MB unpacked.

### A5. HyperFormula

- [C] `hyperformula` 3.5.0, 2026-10-09, licence `GPL-3.0-only`, 14,086,167 bytes unpacked, dependencies `chevrotain`
  and `tiny-emitter` (https://registry.npmjs.org/hyperformula). Dual licence: "GPLv3 and proprietary", the proprietary
  one bought from Handsontable; usage needs `licenseKey: 'gpl-v3'` (https://github.com/handsontable/hyperformula).
- [C] Graph: one node per cell and one per range; ranges built from smaller ranges to avoid n² edges; a topological
  order exists "if and only if there is no cycle" (https://hyperformula.handsontable.com/guide/dependency-graph.html ;
  https://hyperformula.handsontable.com/docs/guide/key-concepts).
- [C] Code (https://raw.githubusercontent.com/handsontable/hyperformula/master/src/Evaluator.ts and
  `src/DependencyGraph/TopSort.ts`): an iterative **Tarjan SCC** top-sort; `partialRun(vertices)` walks the subgraph
  from the changed vertices; vertices on a cycle get `CellError(ErrorType.CYCLE)`; `recomputeVertex` returns `false`
  when `newCellValue === currentValue`. [I] That boolean is what lets the walk stop at unchanged cells (cutoff by
  reference on scalars); I did not read `postprocess` to confirm.
- [C] "Lazy": CRUD transformations of formulas are postponed until a formula is displayed or recalculated; 3.1.1 made
  overwriting a not-yet-computed cell safe (https://handsontable.com/blog/hyperformula-3.1.1-improved-lazy-computations-and-easier-sheet-dependency-handling).
  [C] Its only published performance figure found: 2.6.0 "nearly 60 % improvement" on 5 million text cells and no
  formulas (https://handsontable.com/blog/hyperformula-2-6-0-improved-performance-by-60). No head-to-head benchmark found.
- [M] No async custom functions in 2.x/3.x (an async feature existed in early versions and was removed); not
  re-checked.

### A6. Jane Street Incremental (pseudo-height and bind)

- [C] Stabilisation takes the lowest-height node off a recompute heap, recomputes it, and "if the node's value changes,
  then add its parents to the heap"; height over-approximates the longest path from a variable; the heap is an array
  sized by the maximum height, `max_height_allowed` default 128; bind guarantees its left side is recomputed before any
  node its right side created; `set_cutoff` lets a float node stop propagation within a threshold
  (https://ocaml.janestreet.com/ocaml-core/v0.14/doc/incremental/Incremental__/Incremental_intf/index.html).
- [C] `adjust_heights` runs when a new edge has child height ≥ parent height, raises heights upward with its own heap,
  and **raises if it meets the child while visiting the parent's ancestors: that is its cycle detection**
  (https://ocaml.org/p/incremental/v0.17.0/doc/src/incremental/adjust_heights_heap.ml.html).
- [C] Pseudo-height, in Minsky's words: "almost like a height, except it's memory sensitive, which is to say it never
  goes down … That, in practice, has worked really well. It also has some weird corners"; it was introduced because a
  bind flipping between heights would otherwise "renumber everything back and forth"
  (https://www.janestreet.com/tech-talks/seven-implementations-of-incremental). [C] A summary of the talk: pseudo-height
  arrived in v6, "after removing the heap … the partial order can be enough" (https://yangrq.pages.dev/posts/incr.html).
- [M] Licence MIT; OCaml; reaches the browser only through js_of_ocaml (Incr_dom, Bonsai). Observers make nodes
  necessary; unobserved nodes are not computed (`25` A4). Async: none; a Deferred-based layer sits outside.
- [I] Nexus's board graph is fixed between `reshape()` calls (static dependencies), so true heights from Kahn are
  available for free and pseudo-height is not needed yet. It becomes needed with `25` B12 (dynamic dependencies: a
  switch, a spawner, a lookup by name), i.e. when edges appear during a run.

### A7. Salsa (red-green, backdating, durability, cycles)

- [C] Current crate 0.28.5 on docs.rs ("A generic framework for on-demand, incrementalized computation
  (experimental)") (https://docs.rs/crate/salsa/latest/source/book/src/cycles.md).
- [C] Backdating: after re-executing, "compare the resulting AST. If it's the same as last time, we can backdate the
  result, meaning that we say that, even though the inputs changed, the output didn't". Durability: "For each
  durability, we track the revision in which some input with that durability changed. If a tracked function depends
  (transitively) only on high durability inputs, and you change a low durability input, then we can very easily
  determine that the tracked function result is still valid, avoiding the need to traverse the input edges one by one"
  (https://raw.githubusercontent.com/salsa-rs/salsa/master/book/src/overview.md).
- [C] Cycles: default "Salsa will panic"; opt-in fixed-point iteration with `cycle_initial` (the bottom value) and
  `cycle_fn`, iterating "until it converges", panicking past 200 iterations; only valid for queries that are "monotone
  and operate on a value domain which is a partial order with fixed height"; every possible cycle head must opt in;
  `cycle_result` gives a plain fallback (https://raw.githubusercontent.com/salsa-rs/salsa/master/book/src/cycles.md).
- [M] Licence Apache-2.0 OR MIT; Rust; queries are synchronous; used by rust-analyzer and ty/Ruff.
- [I] Salsa cannot be taken whole (Rust, sync, a macro-defined database), but its data model (two revisions per memo,
  backdating, per-band last-changed revision, opt-in fixpoint with an iteration cap) is the exact plan `25` chose.

### A8. DBSP / Feldera, and differential dataflow in TypeScript

- [C] DBSP represents every change as a **Z-set**, rows with integer weights (+ add, − remove); every operator is made
  incremental on Z-sets; "the grouping function Gp is linear for any key function p … the group-by implementation in
  DBSP is automatically incremental" (https://docs.feldera.com/vldb23.pdf). Execution is synchronous steps through a
  circuit, deterministic (https://www.junaideffendi.com/p/how-feldera-works-a-true-incremental).
  [M] DBSP crate MIT; Rust; server-side.
- [C] TypeScript differential dataflow exists: `@electric-sql/d2ts` 0.1.8 (Apache-2.0, 2025-06-13), `@electric-sql/d2mini`
  0.1.8 (2025-07-28), and `@tanstack/db-ivm` 1.0.0-rc.1.1 (MIT, published 2026-10-31, 844,115 bytes unpacked, one
  dependency `fractional-indexing`) used by `@tanstack/db` (https://registry.npmjs.org/@tanstack/db-ivm ;
  https://materializedview.io/p/everything-to-know-incremental-view-maintenance).
- [I] This is the one family where taking a library whole is plausible for Nexus: list ports carrying (+row, −row)
  differences (`25` B7) are a self-contained concern, and `db-ivm` is MIT, TypeScript, small and actively released.
  Not before list ports exist and are measured slow.

### A9. Glimmer autotracking (revision tags)

- [C] `@glimmer/validator` 0.95.0 (2025-07-30), MIT, 134,274 bytes unpacked (https://registry.npmjs.org/@glimmer/validator).
- [C] One global `$REVISION`, bumped on every dirty; a tag's value is a revision; `validateTag(tag, snapshot)` is
  `snapshot >= tag[COMPUTE]()`; a combinator tag caches `lastChecked`/`lastValue` and returns the max of its subtags'
  revisions (https://raw.githubusercontent.com/glimmerjs/glimmer-vm/main/packages/%40glimmer/validator/lib/validators.ts).
- [I] Validation is purely by revision: a recomputed value equal to the old one still carries a newer revision. So
  Glimmer has **no value cutoff**; its gift is the cheapest possible "is anything I read newer than my snapshot" test,
  which is exactly Salsa's `verifiedAt` without `changedAt`.

### A10. Observable's runtime

- [C] `@observablehq/runtime` 6.1.0, ISC, 2026-10-23, 41,564 bytes unpacked, no dependencies
  (https://registry.npmjs.org/@observablehq/runtime).
- [C] A definition "may return a promise; derived variables will be computed after the promise resolves", or a
  generator pulled each animation frame; "Circular inputs are not allowed; the variable will throw a ReferenceError";
  only variables **reachable from an observer** are computed, and newly unreachable ones are terminated
  (https://raw.githubusercontent.com/observablehq/runtime/main/README.md ; `src/runtime.js` lines 94-121, 144-147).
- [C] Async superseding: `variable_compute` bumps `++variable._version` and, when the inputs settle, throws
  `variable_stale` if the version has moved on; each run gets an `invalidation` promise resolved when it is superseded
  (`src/runtime.js` lines 214-262).
- [I] No value comparison in `variable_compute`: every recompute propagates. Observable is the reference design for
  **async + observers + supersede**, not for cutoff.

### A11. Across all of them

- [I] Every fast JS engine (alien, Preact, Vue, the polyfill, Glimmer) is **synchronous**. Nexus's `step` awaits each
  block (OpenCascade, workers, Claude). Wrapping async blocks in sync signals means re-inventing Solid 2.0's or
  Observable's pending/supersede layer on top: the hard part would be ours anyway.
- [I] Every engine that cuts off compares by **reference or `Object.is`** (alien, Preact, HyperFormula on scalars, the
  polyfill by default). Nexus blocks build fresh objects each run (parts, assemblies, tables), so reference equality
  would never fire. The cutoff Nexus needs is a **structural content digest**, which no library supplies; it is the
  real work, and it is Nexus-specific (parts have design keys in `assembly.ts`).
- [I] The benchmark numbers measure graph bookkeeping over 10^4–10^6 trivial nodes (tens to hundreds of ms per suite).
  A Nexus board has tens to thousands of nodes costing milliseconds to seconds each. The engine's bookkeeping is not
  the cost; reruns are. A 5× faster walk saves nothing measurable; one cutoff that skips an OpenCascade boolean saves
  everything. [I] So speed rankings are not a reason to adopt anything here.
- [I] `CLAUDE.md`'s "one owner per concern" rule: `dataflow.ts` owns running boards. Adding a signals library would put
  a second dependency-tracking engine under it, with its own idea of dirty.
- Summary table (what each handles; [C] where cited above, [I] the cells marked so):

| Engine | Licence | Size (npm unpacked) | Last release | Async nodes | Cycles | Cutoff |
| --- | --- | --- | --- | --- | --- | --- |
| alien-signals 3.2.1 | MIT | 47 KB | 2026-05-14 | no | flags, not reported [I] | `!==` |
| Vue 3.6 reactivity | MIT | 388 KB (rc.14) | rc 2026-10-30 | no | [M] warns on recursion | `hasChanged` [M] |
| signal-polyfill 0.2.2 | Apache-2.0 | 142 KB | 2025-01-17 | no | throws | `equals`, default `Object.is` |
| Preact signals-core 1.14.5 | MIT | 269 KB | 2026-10-27 | no | throws "Cycle detected" | `!==` |
| @solidjs/signals 2.0 rc.20 | MIT | 2.8 MB | 2026-10-29 | yes, first-class | [M] | [M] `equals` option |
| HyperFormula 3.5.0 | GPL-3.0 or paid | 14 MB | 2026-10-09 | no [M] | `#CYCLE!` via Tarjan SCC | `===` on cell value [I] |
| Jane Street Incremental | MIT [M] | OCaml | [M] | no | raises in adjust_heights | `set_cutoff`, custom |
| Salsa 0.28.5 | Apache/MIT [M] | Rust | docs.rs | no [M] | panic, or opt-in fixpoint ≤200 | backdating by `Eq` |
| DBSP / Feldera | MIT [M] | Rust | — | — | recursive queries (fixpoint) | deltas, not cutoff |
| @tanstack/db-ivm | MIT | 844 KB | 2026-10-31 | no [I] | — | deltas |
| @glimmer/validator 0.95 | MIT | 134 KB | 2025-07-30 | no | — | none (revisions only) [I] |
| @observablehq/runtime 6.1 | ISC | 42 KB | 2026-10-23 | yes (promise, generator) | ReferenceError "circular definition" | none [I] |

## (B) What Nexus should take

**Verdict: write it, in `dataflow.ts`; adopt no reactive library.** Copy five algorithms: Salsa's backdating and
durability (data model), Preact's global-version short-circuit and in-order source check (rule), Observable's
observer reachability and async supersede (engine), HyperFormula's/Salsa's cycle policy (rule), Jane Street's
pseudo-height only once edges appear during a run. Keep `@tanstack/db-ivm` as the one candidate to take whole, later,
for list deltas. Reasons in A11: async, structural digests, cost profile, one owner.

How it lands, in steps that each keep `npm run gate` green (each step is one commit; each names the code it touches):

1. **Way of working: the equivalence check first (guards everything after).** In `tests/nexus/domains.test.ts`, in the
   quick-board branch (line 126), after `e.run()`: touch the first node in `e.sequence`, `await e.run()`, then run a
   fresh `new Engine(b, env, new Memo())` and require every node's status and `stable(out)` digest to match, and the
   second run's `Report.ran` to be ≤ the first's. Uses only today's API, so it passes today; it is what makes the later
   steps safe. (00 checks; `25` B11.) Measure the gate's time with and without it; if it costs more than a few seconds,
   run it on every fourth field as the navigation test already does with nodes.
2. **Data model: an output digest per port, recorded and not yet used.** Add `digest(v)` beside `stable()` in the keys
   section: like `stable` but (a) a `Part`/`Assembly` digests by its design key from `assembly.ts` (`designOf`), (b)
   typed arrays by their bytes, (c) `Map`, `Set`, functions, and class instances without a declared digest get a
   **fresh unique token** (never equal: no cutoff, never a wrong one; A0), (d) cached in a `WeakMap` per object, valid
   because outputs are shared through the memo and so already treated as immutable [I], (e) keys starting `_` that
   carry run-local notes are kept (they are part of what readers see) unless the block declares them volatile. Store
   `NodeState.vh: Record<port, string>` in `put()` after a successful run, and `changedAt`/`verifiedAt` against a new
   `Engine.revision` counter bumped once per `run()`. Nothing reads them: gate unchanged. Also fix `runInside`'s feed
   key (line 613) to use `digest`, which removes the Map/function collision there. (00 structure.)
3. **Rule: early cutoff by resolved keys.** One token on line 289: `${s.key}.${w.out}` becomes `${s.vh?.[w.out!] ??
   s.key}.${w.out}`. A node that reran to the same value per port now leaves its readers' keys unchanged, and the
   existing `was.key === key` test (line 302) skips them: Salsa's backdating, Nix RFC 62's resolution, with no new
   control flow. Per-port digests give a finer cutoff than per-node (a mass change does not rerun readers of the
   shape). Impure blocks still carry `#id`; clock and live tokens unchanged. Add `Report.cutoff` (nodes looked at whose
   key held although something upstream reran). The step-1 check is now doing real work: equal outputs, fewer runs.
   Include the block's code version: `b.version` is already in the key; add a rule (test) that a block whose `run`
   source text changed since its dated build has its version raised (`25` B3; Shake's weakness).
4. **Rule: default purity flips, before cutoff spreads.** `def()` in `blocks.ts` defaults `pure: true` (line 470). Make
   the domain test fail a block whose `run` source mentions `Date.`, `Math.random`, `performance.now`, `fetch` or `ctx.ai`
   while `pure` is true and it declares no `clockOf`/`live`/seed. Lands in `blocks.ts` and the test, not `dataflow.ts`.
   (10 trust; 11 LW1.)
5. **Engine: observers and pull.** `run(observed?: Iterable<string>)`. Without the argument, behaviour is today's (the
   gate's `e.run()` is untouched). With it: `look = downstream(dirty) ∩ upstream(observed)`; nodes in
   `downstream(dirty)` not looked at **stay in `dirty`** (marked stale, `NodeState.stale = true`, shown greyed) instead
   of being cleared at line 259. `view/nodes.ts` passes what is on screen, open inspectors, pinned and sink nodes; the
   agent's read passes the node it reads and gets the revision with the value (Jane Street observers; Observable's
   reachability). Add Preact's short-circuit: if `revision` has not moved since a node's `verifiedAt`, skip without
   building its key. (11 LW1.)
6. **Engine: async supersede.** Each `run()` takes a run number; `step` checks it after every `await` and drops a
   result whose run was superseded (Observable's `variable_stale`), instead of only the `AbortSignal` check at the top
   of the loop. A node being worked out shows its last value marked pending (Solid 2.0's `latest` and `isPending`).
   (09 physics core: a slow solve must not block a slider.)
7. **Rule: durability bands.** `touch(id, band = 'low')` records `lastChangedAt[band] = revision`; each node's
   `minBand` (the lowest band anything upstream of it has) is computed in `shape()` along the Kahn order. A node whose
   `minBand` is high and whose `verifiedAt ≥ lastChangedAt[high]` is valid in one comparison. Bands: library and sourced
   data high, library block boards medium, the person's settings low, simulation state volatile (`25` B6). [I] Inside
   one board the downstream walk already confines work, so the gain is mostly for the shared memo and library boards
   inside spawners; measure before claiming more.
8. **Data model: per-row memo in sweeps.** In the list loop (line 312), for a pure block, look each row up in
   `this.memo` by `hash(b.id@version|stable(set)|digest(one))` before `this.call`. A 1,000-row sweep with one row
   changed runs one row. (11 LW1 at city scale; `25` B7.) Row identity by index is the weak point; rows that carry an
   `id` column should key by it (Adapton names).
9. **Way of working: the run record is the replay log.** `Report.nodes: {id, key, vh, ran|cached|cutoff|stale, ms}`
   per `run()`, kept for the last N runs on the engine. "Why did this rerun" = the input whose digest moved; a replay
   compares digests in order and names the first mismatch (`25` B9; 11 LW2).
10. **Rule: cycles stay errors; fixpoint is a node.** Keep Kahn's "in a loop" failure (HyperFormula and the TC39 polyfill
    do the same). Where a loop is wanted (coupled thermal-mechanical, a controller), make a `loop` group node with an
    initial value (Salsa's `cycle_initial`), a convergence test by digest or tolerance, and an iteration cap (Salsa
    uses 200), reporting the iterations it took. (09 physics core; 07 ideas.)
11. **Rule: the hash for sharing is not the hash for the memo.** Keep the 64-bit `hash` for the in-memory memo; any
    cross-user cache (`25` B10) keys by SHA-256 of the canonical digest string. (10 trust.)
12. **Later, maybe whole: list deltas with `@tanstack/db-ivm`.** Only after step 8 is measured and list ports prove slow:
    a spike that wires one list port through `db-ivm` operators behind a `list.delta` node, checked by step 1's
    equivalence test. MIT, TypeScript, one dependency. (00; 11 LW1.)

Do not take: HyperFormula (GPL-3.0 unless bought; a spreadsheet's model, 14 MB); the TC39 polyfill (Stage 1, unreleased
since January 2025, slowest in the benchmark); any sync signals core as the engine (A11). Vue 3.6's choice (port the
algorithm into its own source rather than depend on the package) is the precedent for doing the same here.

## (C) Questions

The 65 questions of this pass are chapter 28 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Skip (SkipLabs) reactive TypeScript services: an incremental engine aimed at services, not UIs; not looked at.
- `@lazy-promise/alien-signals`: how it adds async to alien-signals, and whether its pending model fits Nexus.
- Vue 3.6's `@vue/reactivity` source: what it changed from alien-signals while porting (effect scopes, `hasChanged`).
- TanStack DB's live queries: how `db-ivm` is driven from a reactive store, as a template for list ports.
- ElectricSQL's d2ts paper or notes on differential dataflow in TypeScript, and why they forked d2mini.
- Feldera's recursive SQL (fixpoints over Z-sets) as the model for a `loop` node over lists.
- Adapton's nominal memoisation in a TypeScript port, for row ids that survive reordering.
- Tarjan SCC display of loops on the canvas (HyperFormula's `TopSort.ts` is a short iterative implementation).
- WebCrypto SHA-256 cost for digesting large meshes in the browser, against a 64-bit hash.
- Canonical STEP or B-rep export from OpenCascade with timestamps and ids stripped, for a geometry digest.
- MobX's `comparer.structural` and `computed.struct`: an existing structural-cutoff API to compare with the digest.
- Svelte 5's 160× cellx outlier in the benchmark: what pathology it hit, so Nexus avoids the same.
- tldraw's `@tldraw/state` (signia's successor): it has history and diffs on computeds, close to list deltas.
- `$mol_wire`'s fastest-on-mol result: its "atoms with fibers" handle async by restarting; compare with Observable's supersede.
- Bonsai (Jane Street, js_of_ocaml): Incremental in the browser at scale, and what it costs in bundle size.
- Excel's multithreaded recalculation and its "thread-safe function" registration, for running pure blocks concurrently per Kahn level.
- Lean 4 or Roslyn incremental compilation as further evidence on what keeps cutoff effective (rust-analyzer's "positions sneaking in").
