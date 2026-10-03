# Architectural autopsy: which parts of the existing Ego deserve to become the persistent Ego

3 October 2026. Follows docs/OMNI-AUDIT.md (what exists) and answers a different question: what should survive.
Nothing is grandfathered. Every subsystem below was asked the same thing: if this code did not exist and its actual
requirement were solved today from first principles, with Nex, the laws and a recursive Ego in hand, would it be built
this way? The verdicts are about the future, not the present state (LIVE/PARTIAL/LEGACY was the last audit).

Verdicts: **KEEP** (the architecture is fundamentally right) · **EXTRACT** (the implementation should die, a deep
principle in it must not) · **REWRITE** (the requirement is real, the architecture wrong) · **ABSORB** (a deeper
mechanism replaces it whole) · **DELETE** (no longer justified) · **UNKNOWN** (not enough evidence).

## Method, and what was measured

- The map: 47,264 lines in `src` (ganglia 16,533; physics 7,126; assistant 4,726; engineering 2,883; xr 2,125; app
  1,382; render 1,356; connectors 1,307; forms 1,245; diagnostics 1,239; the rest under 1,100 each), 12,240 lines of
  tests. The import graph of `src` (fan-in and fan-out per module) and of `tests`, computed, not read.
- Amputation: each suspect module was replaced, in a scratch worktree at the same commit, by a stub whose every
  runtime export throws on use; the gate suites (unit, codec, golden: 499 passing tests in 24.8 s) and the conformance
  suite (176 passing in 93 s, with the physics) were run against it; the tests lost are the capabilities that depend on
  the real thing. Forty unit-level and seven conformance-level amputations, results in §G. A test that could not even
  load counts as lost at load, and that pattern is itself a finding (§G.2).
- Clean-room comparison: for each major system, what would be built today for its requirement, compared with what is
  there. Where the clean-room design is radically simpler or deeper, the current code is migration scaffolding.
- Then one vertical slice built only from what survived (§K), measured in the running app.

Everything here is evidence or a judgment marked as one. The codebase is evidence, not scripture; neither is this file.

## A. Verdicts

| subsystem | verdict | lines | amputation (unit / conformance tests lost of 499 / 176) |
|---|---|---|---|
| Ego.ask as the root | REWRITE | in ego.ts (1,167) | not amputable: the only on-demand entry |
| 119-regex intent parser | EXTRACT, with an expiry | intent.ts 494 (103 anchored regexes, 124 tests of a line) | 46 / – (every English request; the app loses typed asks entirely) |
| intent enum / act() switch | REWRITE | 54 cases in ego.ts | with the parser |
| Forge fallback | DELETE (the fallback); KEEP Forge as an interface language | forge.ts 324, apphost.ts 259 | 11 / 4 |
| Ganglia substrate (graph, population, service) | KEEP the loop and the indices; REWRITE the record type | substrate/* ≈ 2,400 | graph 9 + 176 lost at load / –; population 5 + 176 at load; service 9 |
| Nex conversion layer (nexus.ts, translate.ts) | EXTRACT: wrong direction, right renderer | translate 315, nexus 184 | 48 / – |
| Nex kernel (core.ts) | KEEP, two additions proven by §K | core 401 | 33 + 44 at load / – |
| law objects (laws.ts) | EXTRACT: data of the first rank, representation temporary | 947 (142 laws) | 64 + 176 at load / 10 (only scale and discovery; the physics runs on none of them) |
| law tree (tree/nodes.ts) | EXTRACT: obligation↔test links; delete the hand-kept registry | 393 (109 nodes), zero `src` importers | 3 + 8 at load / – (the app loses nothing) |
| construction gate (tree/gate.ts) | KEEP | 247 | 17 / **155** (everything physical passes through it) |
| test stand (prove.ts, stand.ts) | EXTRACT: the second world, the stamp, the quarantine; REWRITE the loop (done in §K) | 284 + 211, zero `src` importers before §K | 0 / 3 (it was never reachable from the app) |
| watchdog | EXTRACT → ABSORB into the anomaly/evidence system | 211 | 2 / 3 |
| population service (background slices, journal) | KEEP the mechanism; REWRITE its storage | 242 | 9 / – |
| growth / abilities (levels, XP) | DELETE | 85 | 2 / – |
| life memory | KEEP as an application feature; never a foundation | 161 | 3 / – |
| reports | ABSORB into anomalies rendered for a human | 109 | 44 / – (ego.ts imports it; every traversal test loads ego's intent path) |
| habits | DELETE from the core; optional interface convenience | 99 | 2 / – |
| skills | EXTRACT: the same principle as morphemes (compression by recurrence) | 147 | 3 / – |
| frontier implementations | DELETE the authored list; ABSORB the labels into the certificate | 832 (46 authored inventions) | 19 / – |
| asks store | DELETE | 35 (24 authored asks), zero `src` importers | 6 / – |
| localStorage persistence (13 keys, 7 stores) | REWRITE | across 9 modules | – (the app runs without any of it) |
| designer workflows | EXTRACT: legacy generator kept until function+constraints exists | designer 238, workflows 652 | designer 5 / 4; workflows 41 / – |
| manifolds / engineer | EXTRACT: the only contract→configurations generator | 401 + 170 (33 families) | 13 + 176 at load / – |
| grow | EXTRACT | 330 | 17 / – |
| challenge engine | EXTRACT → a test suite over the general loop | 215 (6 challenges) | 18 / – |
| creature minds | KEEP (not Ego's foundation; a correct embodied loop) | mind 178, herd 55 | 9 / 8 |
| physics worker | KEEP | worker 70ish, runner 230 | not amputable in unit tests; the stand now runs in it |
| UI / tablet | KEEP as a projection; DELETE the state it keeps on Ego | tablet 978 | – |
| speech layer | KEEP as a projection | voice 73 | – |

## B–F. Each subsystem: requirement, mechanism, principle, contamination, clean-room, surviving data

### Ego.ask(text) → REWRITE (an interface projection, not the cognitive root)

- **Requirement.** Something happens in the world or is said to her, and she must respond with cognition that can
  persist. Human text is one such thing.
- **Mechanism.** `ask(text)` is the only entry that produces cognition on demand. Everything else enters by a different
  private path: `onEvent` (physics `break` and `mind` events), `guard()` (a 0.5 s poll over `live.health`, a ring of
  the last 50 watchdog findings), `tick()` (per render frame via `app.everyFrame`, warnings every 0.5 s), `life.due()`
  (same clock), six constructors that read storage at load, and the population's `setTimeout` slices. Six entry paths,
  no shared structure, no shared persistence.
- **Deep principle.** PROCESS(EVENT): a human line, a physics event, a stand result, an anomaly, a load, a timer, a
  discovery are the same kind of thing: a typed event that touches persistent state. §K built exactly that for two
  event kinds (a stand result; a request she could not read) and nothing else was needed to make her resume after a
  reload.
- **Contamination.** ask/reply as the shape of cognition; one reply string per ask; `Ego.output` (a 12-line
  transcript) and `Ego.command` (the tablet's typed line) kept on the cognitive object; cognition on the render frame.
- **Clean-room.** `process(event)` over typed events, each handler reading and committing structured state (§J).
  `ask` remains as the English tuner's entry, one event kind among nine.
- **Data.** None of its own.

### The 119-regex intent parser and the intent enum → EXTRACT, with an expiry

- **Requirement.** Read an English line into a structure she can act on.
- **Mechanism.** 103 anchored regexes (124 tests on the lowercased line), an `Intent` union of ~60 shapes, a 54-case
  `switch` in `act()` that assembles English inline. Amputated: 46 tests lost, all of them parsing; the app loses every
  typed request.
- **Deep principle.** English → structure is a tuner on Nex (docs/EGO-NATIVE-LANGUAGE.md L–N); `translate.ts` already
  parses Nex English back into structures. The parser is that tuner written by hand, one pattern per phrasing.
- **Contamination.** Human-software habit: regex routing, an enum of verbs, a static HELP string (551 characters), a
  fall-through that executed anything unmatched as Forge (fixed in §K: an unmatched line is kept as an
  `unmodelled` request and never executed).
- **Expiry plan.** (1) Done: unmatched lines never execute. (2) Each handler emits a structure (a `request` commit)
  instead of calling `act()`; the two §K intents already answer from structures. (3) The regexes become one
  English→Nex tuner with a measured loss, the mirror of `translate.ts`; phrasings are data (aliases on distinctions),
  not code. (4) Delete the enum and the switch when every handler consumes a structure. Until (4), the parser is
  transitional and must not be migrated as architecture.
- **Data.** The 103 phrasings are data worth keeping as aliases.

### Forge fallback → DELETE; Forge itself → KEEP as an interface language

- **Requirement.** A textual, replayable, undoable way to build; a transcript of a build.
- **Mechanism.** A line language over the same commands as the hands (`BuildHost`); every design is Forge. Amputated:
  11 unit, 4 conformance tests (the designer, lessons, skills and the build sheet all speak it).
- **Deep principle.** Construction actions have a text form that round-trips through the gate. That is a projection,
  the same way the tablet is.
- **Contamination.** Being the default for anything English did not match (an assistant-era fallback). Removed.
- **Clean-room.** The same language, as the serialisation of construction actions; a design proposal is a structure
  whose rendering is Forge.
- **Data.** Transcripts (`Ego.journal`), skills (Forge macros), designs.

### Ganglia substrate (graph, population, service) → KEEP the loop and the indices; REWRITE the record

- **Requirement.** A cross-connected representation of what things are, do, are made of, fail by, are governed by,
  with provenance and coverage, that grows by asking itself questions and keeps what it learned.
- **Mechanism.** Entities with kinds, coverage (depth, confidence, unknowns) and a `Relation` record of 28 kinds;
  indices both ways; a prioritised queue of (entity, facet) questions; expanders (seed packs, derivation rules, an
  external connector); `ingest` with validation and provenance; background slices under a budget; a journal replayed at
  start. Amputated: the graph and population crash the three big suites at load (176 tests lost at load) because the
  substrate is **built at import time**; the service alone costs 9.
- **Deep principle.** The population is the only persistent, convergent, resumable recursive loop in the codebase:
  queue → expand → ingest → more questions, journaled, restored by replay. It is the nearest existing thing to the loop
  §K built.
- **Contamination.** Its relation record is a second, poorer representation beside Nex: no mode, no uncertainty, no
  time, no scale, no frame, no domain; `nexus.ts` rebuilds Nex from it at answer time (the finding "Nex is built at
  answer time" lives here). The queue's facets and fast/deep modes are authored lists. The external connector was on
  by default (now a plug, off unless `?external=wikidata`).
- **Clean-room.** One representation: Nex structures as the records, the substrate as their index (by id, by name,
  by op, both directions) and the population loop as one generator of the general loop. The 28 relation kinds become
  distinctions in a `kind` coordinate or Nex ops; `nexus.ts` already knows the mapping, so the migration is a one-time
  translation of the seeds, not a redesign.
- **Data.** 13,785 structures of seeded, sourced relations; the journal of what the outside said; the questions
  already asked. All of it survives the rewrite because `fromRelation` already converts every record.

### Nex conversion layer (nexus.ts, translate.ts) → EXTRACT

- **Requirement.** Say a structure in a human language with a measured loss, and read it back.
- **Mechanism.** `nexus.ts` builds Nex from substrate records at answer time; `translate.ts` renders and parses with a
  loss count; `text.ts` is the lossless compact text. Amputated: 48 tests (every "In Nex:" tail).
- **Deep principle.** A human language is a tuner on structure; the round trip is measurable (0.09 loss on real
  answers, docs/NEX-AUDIT.md). Keep.
- **Contamination.** The direction: structure derived from the poorer record (see the substrate). Once the records are
  Nex, `nexus.ts` disappears and only the renderer remains.
- **Data.** None of its own; the morphemes measured by `grammar.ts` (eight, 17 % shorter corpus) are data.

### Nex kernel (core.ts) → KEEP, with two additions the slice proved

- **Requirement.** One canonical structure for everything she holds, with how it is known, how certain, under what
  assumptions, at what scale, in which frame, in which mode of not-being-so.
- **Mechanism.** Two primitives (distinction, relation) and a coordinate schema; quantity, transformation, evidence
  leaf, context and morpheme as typed faces; 17 operators; normal form, hash, distance, fingerprint. Amputated: 33
  tests and a suite that would not load.
- **Is it the best canonical structure, or one representation over a deeper generative substrate?** The evidence from
  §K: every item the loop needed (an observation, an anomaly, a hypothesis, evidence, a belief, an open question, an
  unreadable request) was expressible as a Nex structure with the right mode (`unknown`, `contradictory` with a
  margin, `unmeasured` with an instrument, `unmodelled`) and evidence coordinate (`hypothesized`, `simulated`).
  What Nex could not carry: (1) **process state**, what she is doing about a structure (an investigation, a status,
  the next legal action): that is a claim about her own activity, not about the world, and §K kept it as a typed
  commit record around the structure; (2) **lineage**, that a commit was derived from another (`parents`) and that a
  belief supersedes a hypothesis: there is no `supersedes`/`derived-from` op, and the hash of a revised structure is
  a new hash with no link to the old one. Both were needed on the first day of recursion. Neither is a reason to
  replace Nex: they are a commit envelope around it, which is what §J names. Nothing in §K asked for the
  relation/state/generator/event factoring to change: a stand result was an evidence leaf over a `state` of
  quantities; a test was a transformation with a condition; an event was a commit with an origin. The generator is
  absent, and that absence is a gap (§M of K), not a flaw in the representation.
- **Data.** None of its own.

### Law objects (laws.ts) → EXTRACT: first-rank data, temporary representation

- **Requirement.** Executable physical laws with their domain, source, worked example and realisation, so that what she
  reasons with and what the physics runs are one thing.
- **Mechanism.** 142 TypeScript objects: `eval` as opaque code, `formula` as a string, `valid` as prose, `outside()` as
  code, an `example` as data, `implementedIn` as a string. Amputated: 64 tests plus 176 lost at load; in conformance,
  only the 9 scale tests and the discovery test, which means **the physics world runs on none of these laws**; it runs
  on `engineering/*` and its own code. "A law in five places" (last audit) is confirmed by amputation: the law book
  and the simulator are coupled by hand, by a string.
- **Deep principle.** A law is a sourced, executable, domain-bounded, example-checked claim with a realisation and a
  test that holds it.
- **What a law would be in Nex today.** A transformation (or `constrain`) over quantities whose body is an expression
  tree of quantities and distinctions (not a closure), whose `dom` is a list of constraint structures (not prose),
  whose `ev` cites the source, whose worked example is an evidence leaf `derived` from the tree, and whose realisation
  is a `morphism` to the code with an error contract. Then `eval`, `outside`, `solveFor`, `sensitivity`, the Nex
  `space` and the certificate all read the same tree instead of four parallel encodings; a constant is a quantity with
  provenance, not a field; and `implementedIn` becomes a realisation the tests can hold.
- **Contamination.** English strings as identity (`valid`, `statement`), the formula as a string that nothing parses,
  constants outside the dimension check until recently.
- **Data.** The 142 laws, their sources, examples and domains: the most valuable data in the repository. The
  TypeScript form is a TEMPORARY MIGRATION SOURCE (the user's term), not the final Nex-native law form.

### Law tree (tree/nodes.ts, schema.ts) → EXTRACT

- **Requirement.** Every physical claim derives from roots; every realisation carries an obligation; every obligation
  is held by a test; a constant is typed as datum, estimate or numerical choice.
- **Mechanism.** 109 hand-kept nodes checked by `tree.test.ts` (acyclic, real symbols, real tests). Zero importers in
  `src`: the app loses nothing when it is amputated (3 native tests and the 8 tree tests go).
- **Deep principle.** The obligation↔test link and the epistemic kind of a node are the invalidation structure the
  Omni audit wanted; they are right. The hand-kept registry is Claude compensating for the absence of a mechanism that
  derives nodes from the laws and reads realisations from the code.
- **Clean-room.** Nodes derived from the law structures (above) plus a build step that reads realisations and held
  tests from the code; the schema survives as the type of a law's epistemic coordinate.
- **Data.** The obligation texts and the test names per realisation.

### Construction gate → KEEP

- **Requirement.** Nothing exists in the world that did not pass a judgment citing the law it enforces, and the same
  judgment stands at the document and at the physics' intake.
- **Mechanism.** `judgePart`, `judgeConnection`, `judgeDoc`, refusals with a law id, `ConstructionRefused`. Amputated:
  **155 of 176 conformance tests** and 17 unit tests: every physical capability depends on it.
- **Deep principle.** A typed admission with a cited law and a refusal that is a judgment, not a style. This is the
  closest thing in the codebase to the Nexus kernel's rule, and it is correct.
- **Contamination.** Reasons as English, law ids as strings; otherwise none.
- **Clean-room.** The same door, with the refusal a Nex structure (`impossible-under` the law). A note for the Gate
  question: the gate validates *construction*; §K's commit validates *claims*. They are the same shape (proposal →
  validator → judgment with origin) with different validators, and §K did not need to merge them to work.

### Test stand (prove.ts, stand.ts) → EXTRACT the world, the stamp and the quarantine; REWRITE the loop (done)

- **Requirement.** A design is tested in a world of its own with the same physics before anyone trusts it, and what
  the test teaches is kept under the physics it was learned in.
- **Mechanism.** `runStand` (a second `PhysicsWorld`, loads and pushes, every break collected, a result with peaks,
  drop, tilt, wall time) and `prove()`: an authored loop of up to four tries with three strategies as control-flow
  branches (aprons, a 1.5× margin factor, a joint upgrade), persisting `Learned {margin, joints, aprons}` by design
  kind under a physics stamp, quarantining learning from other physics. Amputated: 0 unit tests and 3 conformance; it
  had **zero importers in `src`**: the one recursive loop the last audit praised was never reachable from the running
  app.
- **What survives.** Independent second-world testing (yes, and §K runs it in the physics worker beside the live
  world); the physics stamp and quarantine (yes: every §K commit carries the stamp); failure interpretation (yes, but
  as a structured signature and candidates, not branches); margin learning and design-kind keys (no: they are a cache
  of a belief without its evidence; in §K the belief is the commit, with the test that made it and its uncertainty).
- **Contamination.** A linear workflow that runs to completion inside one call (cannot be interrupted or resumed);
  learning stored as numbers without their evidence; an authored list of design kinds as the key of knowledge.
- **Data.** None persisted that is worth migrating (margins without evidence are not knowledge). The conformance test
  of the old loop stays until the loop is deleted.

### Watchdog → EXTRACT → ABSORB

- **Requirement.** Independent validation of the solver's output against physical invariants, as evidence, modifying
  nothing.
- **Mechanism.** Ten checks written in code (non-finite, drift, fell, tunnel, flung, energy, spin, jitter, restless,
  slow, plus power) with thresholds in the options, findings as `{kind, severity, id, value, limit, detail}` into a
  ring of 50, polled every 0.5 s by `Ego.guard`, turned into English reports. Amputated: 2 unit, 3 conformance.
- **Deep principle.** Invariants are obligations of laws (A-4, ML-3, F-3.x); a finding is a comparison with a margin
  under a model version: exactly the anomaly structure of `discovery.ts`.
- **Contamination.** A fixed list; findings as English `detail`; a bounded ring that drops findings; polling; a
  report per finding instead of an anomaly commit with the obligation it broke.
- **Clean-room.** A generalised invariant observer: registered invariants (each a law obligation with an instrument)
  evaluated over tick output, emitting anomaly commits into the same journal as the stand's, delivered as events.
  The current checks are good realisations of some invariants and can be kept as such.
- **Data.** None.

### Population service → KEEP the mechanism; REWRITE its storage

Covered with the substrate. Its storage pattern (a `v: 1` JSON blob in localStorage with a journal cap and a
"drop the oldest half when full" rule) is the same misfactoring as the other six stores (§J).

### Growth / abilities → DELETE

- **Requirement.** None that survives. The levels gate real code (foresight only from level 4, "initiative" from
  level 5) on experience points: a game mechanic from the assistant era deciding whether she may notice a joint about
  to fail. Amputated: 2 tests.
- **Data.** `prefs` (which joint and material the user chose, counted) is a real record of user choices; keep it as
  evidence of preference in the new store. XP is nothing.

### Life memory → KEEP as a feature, never a foundation

Reminders, notes and a money ledger on the headset: an application feature with its own storage, not cognition about
the world. It must not shape the Mind; it should become one more collection in the canonical store (§J) when that
store exists. Amputated: 3 tests.

### Reports → ABSORB

- **Requirement.** A human can be told, with context (physics stamp, build share code, what she saw), what went wrong.
- **Mechanism.** Complaints and watchdog findings become `Report` records for Claude; a GitHub issue is the export.
  Amputated: 44 tests, because `ego.ts` imports it and every traversal test walks through `intent`: a load-time
  coupling, not a dependence on reports.
- **Clean-room.** A report is an anomaly commit rendered for a human; the issue export is an interface.
- **Data.** The physics stamp on a report (keep the idea; §K stamps every commit).

### Habits → DELETE from the core

A first- and second-order Markov predictor of the user's next build action, decayed per session. Not cognition about
the world; harmless as an optional suggestion module on the tablet. Amputated: 2 tests.

### Skills → EXTRACT

Repeated runs of Forge steps become a generalised macro. That is the same principle as morphemes in `grammar.ts`:
compression by recurrence, promoted when it shortens the corpus. Two implementations of one mechanism is a
misfactoring; the surviving principle is one compressor over any sequence of structures. Amputated: 3 tests.

### Frontier implementations → DELETE the list; ABSORB the labels

- **Mechanism.** 46 authored inventions with authored labels (made / buildable / research / relabelled), each with a
  sourced nearest thing and bounds from laws; `explore` runs them through the challenge machinery. Amputated: 19
  tests.
- **Contamination.** A manually authored frontier is Claude compensating for the absence of a generator of open
  questions; the labels are what `certificate()` now computes from the law book (relabelled = `impossible-under`).
- **Deep principle.** Nothing ends at "impossible": every want is labelled for what it takes. Kept by the certificate.
- **Data.** The 46 entries' sourced nearest things and bounds are modest data; the `geodesic()` generator is real
  geometry and keeps.

### Asks store → DELETE

24 authored asks, zero importers in `src`; amputated, 6 tests of `understand` go. The real version of this is the
`request` commit of §K: an ask she could not read, kept as an `unmodelled` structure that persists.

### localStorage persistence → REWRITE

- **Mechanism.** 13 keys written by 9 modules, each a class with its own `try { JSON.parse } catch { start fresh }`,
  no transactions, versioning by a `v: 1` field, no history, no dependency between records, a 5 MB cap, failures
  swallowed. The build is not reopened at load; the stand's learning was keyed by design kind.
- **Canonical requirements** (from first principles): an atomic append per commit; versioning of the content and of
  the physics it was learned under; dependency queries (what derives from what); history (a revision is a new record);
  indexing by investigation and by kind; capacity for test results, not just settings; durability across a page
  close on a headset. localStorage gives none of the first four and fails the fifth at 5 MB.
- **Choice.** An append-only journal of commits with parents, in IndexedDB (atomic transactions, large, durable, on
  the Quest browser), with a memory implementation for tests (§K: `src/mind/journal.ts`). Not a document database,
  not a key per subsystem: one log, one rule. Nothing is grandfathered: the other stores migrate into it as
  collections or die with their subsystem.
- **Data.** Builds (the library), templates, the population journal, user preferences, life records: all keep.

### Designer workflows (designer.ts, workflows.ts) → EXTRACT

- **Requirement.** From a function and constraints (a table that holds 80 kg), a design with a derivation.
- **Mechanism.** Six authored design kinds sized by real beam and column checks with a safety factor; 14 authored
  engineering procedures with law traces. Amputated: designer 5 unit / 4 conformance; workflows 41.
- **Deep principle.** An answer carries the trace of every law it applied with its numbers (workflows) and sizes from
  stock (designer). Keep the principle as derivation records.
- **Contamination.** Fixed authored workflows and design kinds: the generator is a list of hand-written procedures.
  This is the mechanism §K still uses as its proposal generator, explicitly as legacy scaffolding.
- **Missing mechanism it hides.** GENERAL PROPOSAL GENERATION FROM FUNCTION + CONSTRAINTS: recorded as a separate
  major gap (§K, M). `manifold/engineer.ts` is the only thing that approaches it.

### Manifolds / engineer → EXTRACT

33 authored configuration families with laws, parameters and scalings; `engineer()` takes a contract to lawful
configurations through construction actions, ranked, with refusals per step. The families belong in the substrate
as data; the generator principle (contract in, configurations out, every one reached by construction actions) is
the seed of the missing general generator and must survive. Amputated: 13 tests plus 176 lost at load (import-time
coupling through the bridge).

### Grow → EXTRACT

Development rules (an organ calls for the organs it cannot work without, by a principle), variation and selection by
fitness. A generator too, over blocks and ways. Keep the rules as data and the principle as one more generator of the
loop. Amputated: 17 tests.

### Challenge engine → EXTRACT into tests

Six authored challenges run through the real machinery to find where it breaks. That is a benchmark, which belongs
in the test suite over the general loop (a challenge result is evidence about capability, not a subsystem).
Amputated: 18 tests.

### Creature minds → KEEP (not Ego's foundation)

A mind per creature on the physics' own ticks (F-6.3), sensing along rays, choosing strides. Correct for an embodied
control loop: it lives on world time, not render frames, and it is an existence proof that cognition in this codebase
can run on a clock that is not the frame. Ego's loop is event-driven, not tick-driven, because hers is not a control
loop. Amputated: 9 unit / 8 conformance.

### Physics worker → KEEP

Owns the world; the frame never waits on it. §K added one op: a stand run in a world of its own inside the worker,
reported once. Finding for the record (§K, J): the worker is single-threaded, so a stand run blocks the live world for
its wall time; a chunked stand would remove the hitch.

### UI / tablet, speech → KEEP as projections

The tablet draws state it does not own, except two things it should own and Ego keeps (`command`, `output`): move
them. Speech is text in, text out: a tuner on the same entry.

## G. Amputation results

### G.1 The table

Unit-level (gate suites, 499 passing at baseline), tests lost → by file; conformance-level (176) where run.

| amputated | lost | lost at load | where | conformance |
|---|---|---|---|---|
| intent.ts | 46 | 0 | substrate 27, ganglia 5, scale 3, understand 3, … | – |
| forge.ts | 11 | 0 | forge 6, lesson 2, buildsheet, designer, growth | 4 (rules, stand) |
| ganglia/index.ts (facade) | 115 | 0 | substrate 39, ganglia 29, frontier 18, blocks 14, grow 13 | – |
| laws.ts | 64 | 176 | ganglia 28, frontier 14, blocks 9, grow 9; native, scale, substrate would not load | 10 (scale 9, discover 1) |
| tree/nodes.ts | 3 | 8 | native 3; tree would not load | – |
| tree/gate.ts | 17 | 0 | store 10, lesson 2, manifold 2, … | **155** |
| prove.ts + stand.ts | 0 | 0 | – | 3 (stand) |
| watchdog.ts | 2 | 0 | tree, watchdog | 3 (walker) |
| substrate/service.ts | 9 | 0 | substrate 6, external 2, tree 1 | – |
| substrate/population.ts | 5 | 176 | external 5; three suites would not load | – |
| substrate/substrate.ts | 9 | 176 | external 8, tree 1; three suites would not load | – |
| substrate/bridge.ts | 3 | 176 | external 3; three suites would not load | – |
| external.ts + wikidata.ts | 10 | 176 | external 10; three suites would not load | – |
| growth.ts | 2 | 0 | growth | – |
| life.ts | 3 | 0 | life | – |
| reports.ts | 44 | 0 | substrate 26, ganglia 5, … (through ego.ts's import graph) | – |
| habits.ts | 2 | 0 | forge | – |
| skills.ts | 3 | 0 | growth | – |
| frontier.ts | 19 | 0 | frontier 10, understand 2, one each in seven others | – |
| asks.ts | 6 | 0 | understand | – |
| understand.ts | 9 | 0 | understand | – |
| designer.ts | 5 | 0 | designer 3, lesson 2 | 4 (rules 1, stand 3) |
| manifolds.ts + engineer.ts | 13 | 176 | manifold 10, external 3; three suites would not load | – |
| grow.ts | 17 | 0 | grow 11, frontier 4, native 2 | – |
| challenges.ts | 18 | 0 | frontier 9, grow 6, native 2, forms 1 | – |
| world/mind.ts | 9 | 0 | mind | 8 (walker) |
| translate.ts + nexus.ts | 48 | 0 | substrate 27, native 21 | – |
| native/core.ts | 33 | 44 | substrate 33; native would not load | – |
| graph.ts + analysis.ts | 7 | 0 | ganglia 6, blocks 1 | – |
| workflows.ts | 41 | 0 | ganglia 18, grow 9, blocks 6, frontier 6, native 2 | – |
| blocks.ts + ways.ts | 38 | 176 | grow 13, blocks 11, ganglia 7, frontier 4, external 3; three suites would not load | – |
| principles.ts | 11 | 0 | ganglia 7, blocks 3, grow 1 | – |
| discover.ts | 3 | 0 | frontier | – |
| scale/hypothesis.ts + crossscale.ts | 3 | 176 | external 3; three suites would not load | – |
| lesson.ts | 2 | 0 | lesson | – |
| foresight.ts + fixes.ts | 5 | 0 | growth 3, forge 2 | – |
| forms/form.ts | 18 | 0 | forms 11, codec 4, grow 2, native 1 | – |
| sketch | 7 | 0 | strokes | – |
| traverse.ts | 39 | 0 | substrate 39 | – |

### G.2 What the amputations say

1. **The gate carries the physical world.** 155 of 176 conformance tests die without it. It is the one validator
   everything already passes through, and it is correct.
2. **The law book is not in the physics.** Amputating 142 laws costs the simulator nothing; it costs the scale
   hypotheses and the discovery of a pendulum law. The law book and the simulator are coupled only by the
   `implementedIn` string. The "one law" migration is a representation change, not a physics change.
3. **The stand was never in the app.** Zero importers; zero unit tests lost. The loop praised by the last audit as the
   one recursive loop was a test fixture. §K is the first time a design of hers has been tested in the headset.
4. **The substrate is built at import.** Any amputation under the bridge (blocks, ways, manifolds, population, the
   scale hypothesis, the external connector) kills three suites at load (176 tests), because the substrate is
   constructed when the module is evaluated. Load-time construction of 13,785 structures is a historical assumption
   (a static knowledge base) that a persistent store makes unnecessary: the substrate should be read, not rebuilt.
5. **Two modules with no runtime at all**: the law tree and the asks. Their only consumers are their own tests.
6. **Reports look load-bearing and are not.** 44 tests fall because `ego.ts` imports `reports.ts` and every traversal
   test reaches `intent.ts` through it; nothing in those tests uses a report. Import-graph coupling again.
7. **Small, separable, and mostly assistant-era**: growth 2, habits 2, skills 3, life 3, lesson 2, watchdog 2,
   designer 5. Each can be deleted or extracted without the others noticing.
8. **The facade is the hub.** `ganglia/index.ts` re-exports 167 names; amputating it costs 115 tests. A facade of
   that size is a sign that the modules behind it have no shape of their own: the clean-room substrate replaces the
   facade with the index.

## H. Systems that must NOT become foundations of the Omni Engine

- `Ego.ask` → regex → enum → switch (an interface projection, transitional, with the expiry plan above).
- The Forge fallback (deleted) and Forge as a reasoning medium (it is a build language).
- localStorage and the seven per-subsystem stores (replaced by the journal, §J).
- Growth levels, XP, habits (game and assistant mechanics).
- The authored frontier, the authored asks, the authored challenges as subsystems (compensations for a missing
  generator; benchmarks belong in tests).
- `prove()`'s linear loop and its learned margins (a cache of beliefs without evidence; replaced in §K).
- The watchdog's ring and `guard()`'s poll (findings become anomaly events).
- The substrate's own `Relation` record as the canonical content (Nex is).
- The TypeScript law object as the final law form (a migration source).
- The render-frame tick as the clock of cognition.
- The `ganglia/index.ts` facade.

## I. Systems closest to the correct architecture

1. **The construction gate**: a typed judgment citing a law, at every door, with refusals that are judgments.
2. **The Nex kernel**: two primitives, a coordinate schema, modes that distinguish ten ways of not being so, evidence
   that can only be lowered by translation; §K expressed every cognitive item in it without extension.
3. **The population loop**: a persistent, prioritised, convergent, journaled, resumable question queue.
4. **`runStand`**: a second world with the same physics, a result with every break and the time it took.
5. **The discovery layer**: certificate, residual, anomaly with margin and ancestry, skeptic, clusters: the comparison
   rule and the anomaly structure the loop needed were already there.
6. **Creature minds on world time**: the right clock for an embodied loop.
7. **The physics worker**: the frame never waits on the world.

## J. The smallest canonical substrate after the legacy assumptions are removed

What is left when ask/reply, the enum, the seven stores, the levels, the authored lists and the linear loops are
taken away, and what §K actually needed:

1. **Nex structures** (core.ts, as is) for every item she holds.
2. **A commit envelope** around a structure: origin, parents, validation, status, physics stamp, session, cost. This
   is the process state Nex does not carry, and the lineage it does not carry. (`src/mind/journal.ts`, 131 lines.)
3. **An append-only journal** of commits with one atomic append and one read-at-start, in IndexedDB on the headset
   and in memory in tests. Not a scheduler, not a frontier store, not an event bus.
4. **One rule**: `next(journal, investigation)` → the one legal action, a pure function of the data; `perform` does it
   and commits. Resume at start is the same rule. (`src/mind/investigate.ts`, 280 lines, of which half is the table
   designer's candidate knowledge.)
5. **Validators that already exist**: the stand (simulation), the comparison rule of `discovery.anomaly` (residual
   with margin), the designer as the proposal generator for now.
6. **Events delivered where they happen**: a stand result resolves a promise; an unreadable line is a call. No bus
   was needed for two kinds; a bus is justified at the third kind that two consumers want.

Compared with the five mechanisms the last audit proposed: Mind = (2)+(3), and it is a journal, not a store of typed
items with a scheduler; Gate = (4)+(5) for claims, beside the construction gate for parts, and §K did not need to
unify them; Wake = (6), not needed yet; Frontier = the open commits, a view of the journal (`unresolved()`), not a
store with scores; Invalidation = the physics stamp on every commit plus `parents`, which is data the rule can read
(a change of stamp makes a resolved belief stale by inspection), not a mechanism. Two of five were real primitives
(the journal with its envelope; the rule with its validators); three were derived views or premature.

## K. The first recursive awakening vertical slice, built on that substrate

Event chosen: **a failed test-stand result**, because every mechanism it needs survived the autopsy (second world,
comparison rule, anomaly structure, candidate knowledge, Nex modes), the first look fails deterministically (a table
for 60 kg works a leg joint past the 67 % she allows under a sideways push, as the old loop found), and the whole chain
is reproducible in the headset. A watchdog anomaly would have needed a reproduction harness for a solver artefact
(task #54) before any hypothesis could be tested. The stand result did not exist at runtime: making it exist cost one
op in the physics worker and one call after a design (the plumbing is in §K.B).

### A. Event selected

`stand-result`: Ego designs and builds a table for 60 kg in the world; the design as built goes on her stand in the
physics worker (a world of its own, same physics, the rated load on the top and a 300 N push at the end of the top);
the result returns once. No synthetic event: the stand runs in the running app.

### B. Existing code reused

`runStand` (physics/stand.ts), `standLoads`/`standPushes`/`JOINT_LIMIT`/`PROOF` (prove.ts), `design` (designer.ts),
`Bench` + `BuildHost` + `run` (the bench build), `fragmentOf`, `fixesFor`, `anomaly` and the skeptic (native/discovery.ts),
Nex builders and `text` (native/core.ts, text.ts), the foresight as her prediction, the physics stamp. New runtime
plumbing: `{type:'stand'}` in worker.ts and `PhysicsClient.stand()` (about 40 lines).

### C. Minimum new structures

`Commit` (the envelope) and the journal; `TestSpec`, `Prediction`, `Outcome`, `Signature`, `Candidate`, `Action`
(investigate.ts). The items themselves are Nex: an observation is an evidence leaf (`simulated`, `test stand`) over a
`state` of quantities; the anomaly is `discovery.anomaly`'s `contradict` structure with its margin and the model it is
under; a hypothesis is an `influence` from a cause to a failure by a mechanism, mode `unknown`, evidence
`hypothesized`; evidence is a leaf over the result; a belief is the hypothesis's own structure with mode `true` or
`false` and evidence `simulated`; the open question is a `constrain` of the design to a load with mode `unmeasured`
and the instrument named; an unreadable request is a `state` with mode `unmodelled`. What Nex lacked: process state
and lineage (above), carried by the envelope.

### D. Minimum new runtime behaviour

After a design is built: one stand run, one `process(event)`. On an unreadable line: one `process(request)`. At boot:
`resume()`, the same rule over the journal. No timer, no poll, no bus, no scheduler. The loop drives itself from
commit to commit until `next` says rest, and `active` is false whenever it is not inside a step.

### E. Persisted structure

Per commit: seq, time, session, investigation, kind, origin, parents, the Nex item, typed data (the test spec, the
outcome numbers, the failure signature, the prediction, the candidates), validation (by whom, verdict, margin),
status, physics stamp, ms. Only what the rule reads: a lost in-flight test is rebuilt from the spec, not stored.

### F. Reload result

In the headset test (tests/e2e/ego-mind.spec.ts) the page is reloaded once the hypothesis exists. The loop outran the
test harness: two stand runs of a table take about 1.1 s of wall time in the worker and the whole chain had rested
before the reload could land, so the crash is modelled exactly instead of raced: the journal is append-only, a crash at
the hypothesis leaves precisely its prefix, and the test leaves that prefix (three commits: observation, anomaly,
hypothesis) in the browser's IndexedDB and reloads. At boot the journal is read, the open investigation is found by
the rule, the lost test is run again in the new session, and the chain completes: the commits before the cut carry
the first session's id, those after it the second's, every commit's parents point at the one before, one physics
stamp throughout. In the unit test the journal is cut at every one of its eight commits and a fresh Mind resumes each
to the same end, and a cut at the hypothesis makes the stand run twice (the lost test, then the proof). Measured
numbers are at the end of this section.

### G. Recursive belief-change result

observation (failed: a leg joint past 67 % under the push, against the forecast's static prediction) → anomaly
(σ ≫ 1, candidates racking and joints) → hypothesis (racking; test: the same design with aprons; prediction: holds
under 67 %) → evidence (held, 41 %) → belief (the hypothesis's structure, mode unknown → true, evidence simulated,
hypothesis confirmed, next: the proof load) → question (the design with aprons at 90 kg, mode unmeasured) → evidence
(held, 71 %) → belief (constrain to 90 kg, unmeasured → true, resolved). Each output of a step is the structured input
of the next; the hypothesis is the object of the test, the result is evidence against it, the updated belief is the
new open state. Nothing ends at "test failed": the first failure modified a hypothesis, the hypothesis became a
constraint on the design, and the final belief carries its uncertainty (simulation only, one run, never measured).

### H. Claude-subtraction result

Between the stand result and rest, nothing but the rule runs. No prompt, no network, no model, no authored script:
the candidates are data on the failure signature, the choice is the first untried one, the test is a function of the
spec. CORE RUNTIME OFFLINE-CAPABLE for this loop (the headset has not yet been tested disconnected).

### I. User-visible demonstration

"build a table that holds 60 kg" → the design, and "I'm testing it on my stand now." When the loop rests, one line:
what the table did as built and what is proven. "What were you working on?" and "What changed?" are answered by
walking the journal (`src/mind/say.ts`): the investigation, what happened against what was predicted, what she
believes and its status, every test performed with its result, what remains or that she is idle, the previous
hypothesis, the transition, the remaining uncertainty, and the Nex of the structure she holds. An unreadable line
("please dance for me") is answered as an unknown request and kept; Forge still runs as Forge.

### J. Compute / dormancy result

Recorded by the app itself (`mind.steps`, `mind.stands`, `journal.writes`) and printed by the tests; see the
measurements block at the end of this section. Polling: none. Dormancy: `active` false and `unresolved()` empty after
the last commit; nothing scheduled. One honest cost: a stand run executes inside the single-threaded physics worker,
so the live world pauses for the run's wall time (tens to hundreds of milliseconds for a table); a chunked stand is the
fix when it matters.

### K. Code deleted

The Forge fallback for unmatched English (behaviour, in `Ego.ask`). The external expander is now off by default. No
file was deleted in this slice: the old `prove()` loop and its conformance test stay until the Mind covers the shelf
(tipping → anchor) and crate cases, at which point prove.ts goes.

### L. Abstractions actually proven necessary

The commit envelope with parents and a stamp; the append-only journal with atomic append; the one rule
`next`/`perform`; a validator (the stand) and a comparison (the anomaly); Nex modes `unknown`, `contradictory`,
`unmeasured`, `unmodelled` and evidence kinds `hypothesized`, `simulated`.

### M. Abstractions not yet justified

A general Mind store with typed items and a scheduler; a Gate unifying construction and claims; an event bus
(Wake); a Frontier with scores (the open commits are the frontier); an Invalidation mechanism (the stamp and
`parents` are enough to detect staleness; acting on it is the next slice's question). Two gaps recorded as major:
**GENERAL PROPOSAL GENERATION FROM FUNCTION + CONSTRAINTS** (the candidates and the designer are authored; the only
approach to a general generator is `manifold/engineer.ts`), and the fact that **Ego does not yet think in Nex in the
strong sense** outside this one pathway (the substrate's records are still converted at answer time).

### N. Next smallest generalization

A second event kind through the same journal and rule: a watchdog finding as an anomaly commit (the invariant it
broke as the prediction, the tick's output as the observation), with the second world as its test (replay the scene
with the suspected cause removed). That is the first point at which two producers want the same consumer, and the
first place an event bus would be justified by evidence rather than by design.

### Measurements (3 October 2026)

| where | what | measured |
|---|---|---|
| conformance (real physics, node) | stand runs | 2 runs, 4.0 s simulated, 947 ms wall (539 and 427 ms) |
| conformance | time per cognitive step | anomaly 1.0 ms, hypothesise 0.2 ms, judge 0.2 ms, question 0.2 ms; every non-test step under 1 ms |
| headset (Chromium, worker) | resume after the modelled crash at commit 3 | test 669 ms, judge 1 ms, question 7 ms, test 509 ms, judge 3 ms; 2 stand runs, 4.0 s simulated, 1132 ms wall |
| headset | storage writes | 8 commits for the whole chain; 5 appends after the reload (one IndexedDB transaction each) |
| headset | polling | none: the stand resolves a promise; the resume is one call at boot |
| headset | dormancy | `active` false and `unresolved()` empty after the last commit; no timer, no scheduled step |
| headset | cost to the live world | a stand run blocks the physics worker for its wall time (about 0.5 s per run for a table) |
| unit | determinism | the journal cut at each of its 8 commits resumes to the same 8-commit end; a cut at the hypothesis reruns the lost test |

Failure conditions checked: the state after save → reload is not only displayed, it is acted on (five commits were
made after the reload); the final state is not "test failed" but a belief with its structure, its transition, its
evidence species and the constraint it leaves on the design (aprons; proven at 90 kg); the result modified a
structured hypothesis (mode unknown → true) and produced a future constraint (the design with aprons is what she
would place next).
