# Omni audit: what Ego is, what persists, and the smallest architecture that would wake her

Date: 3 October 2026, 19:30–20:30 UTC, on branch `claude/upbeat-heisenberg-4l8unp` at 19e8538. Every statement below
was read from the code or measured by a command on the day; where something is a judgment it says so. The order is
the one asked for: A to Z, then the three questions.

Scale of the machine: 199 TypeScript files, 47,264 lines under `src/`; 32 unit, 21 conformance, 14 end-to-end test
files plus codec, golden and stress suites; 26 documents, 6,704 lines under `docs/`. Runtime dependencies: three.js,
Jolt (physics, in a Web Worker), typebox, fflate. No language model, no network call and no prompt exist in the
runtime (grep: zero `fetch`, `WebSocket`, `anthropic`, `openai` in `src/` apart from the optional Wikidata connector
below).

Classification used: LIVE (runs in the app), PARTIAL (runs, but short of what its name claims), SCAFFOLD (code with no
caller in the app), DOCUMENTED ONLY (in `docs/`, no code), LEGACY (kept for an earlier shape), DEAD (unreachable),
UNKNOWN (not determined).

## A. What Ego actually is today

Ego is a deterministic, hand-authored, event-and-request engine inside a VR app. There is no model inference in her.
The process that produces her behaviour, traced from `src/main.ts`:

1. `App` builds the three.js scene, the Jolt physics world in a worker (`physics/worker.ts`, `client.ts`), the build
   document store (`doc/store.ts`), tools, the tablet UI, and `Ego` (`assistant/ego.ts`, 1,167 lines).
2. `Ego.ask(text)` runs, in order: the drawing wall if the draw tool is active; the life layer (remember, remind,
   money); `interpret(text)` (`assistant/intent.ts`, 119 regular expressions over lower-cased English); `act(intent)`,
   a switch over about forty intents that call the ganglia (laws, substrate, Nex, workflows, manifolds, scale,
   challenges, frontier, grow, forms) and the world (place, join, freeze, delete, duplicate, templates, commands); if
   no regex matches, the text is run as a Forge program. The reply is a string, shown as a toast and spoken by the
   headset's own speech synthesis.
3. `Ego.tick(dt)` runs every frame (creature herd pruning, where-you-are, teaching, watching what you showed her) and
   every 0.5 s (the watchdog's findings, reminders due, joints near their capacity). `Ego.onEvent` handles physics
   events: `break` (a joint broke: says why, offers fixes) and `mind` (creature choices). `Ego.record` hears document
   changes of source `do` and feeds the habit graph and skill learner.
4. In the background, 2.5 s after launch, the substrate population service runs 2 ms slices twice a second: a seed
   expander, a rule expander (derives relations), and an optional external expander (Wikidata, behind `fetch`).
   Its journal is kept in `localStorage` under `ganglia.substrate` and replayed on load.

So, of the list offered: Ego is not an LLM invocation, not an LLM plus memory, not a persistent cognitive process, and
not a Nex-native reasoner. She is an event-driven, request-driven rule engine over a typed knowledge graph, with
Nex built at answer time from that graph and rendered to English at the moment of speaking. "A collection of tools
around Claude" is wrong at runtime and right at development time: every law, seed, intent, workflow and test was
written by Claude or by hand; nothing in the running app writes any of them.

## B. Actual runtime cognitive loop

```
frame ──► physics worker step ──► events (break, mind, plane, …) ──► Ego.onEvent ──► advice / fixes / reports
      └─► Ego.tick: herd, teach, watch shown; every 0.5 s: watchdog findings → quarantine report; reminders; load warnings
ask ───► draw wall? ──► life layer? ──► interpret (119 regexes) ──► act(intent) ──► ganglia / world ──► string ──► toast + voice
background (app open only) ─► population slice (2 ms, 2 Hz): queue of unknown facets → expanders → ingest → journal
document change (source 'do') ─► Ego.record ─► habits (n-grams), skills (repeated Forge runs), initiative look at new joints
```

Nothing in this loop reads a goal, a hypothesis or a frontier item, because none exists as state. The only
"identify frontier, explore, derive, test, commit" sequence that runs end to end is the test stand (`prove.ts`,
`physics/stand.ts`): a design is built on a bench, run in a second physics world, and its margins and joint choices
are learned under a physics stamp.

## C. What persists between activations

All persistence is `localStorage`, one JSON blob per store:

| key | holds | shape |
|---|---|---|
| `vrsb.ego` (falls back to `vrsb.ada`) | growth: experience, level, abilities unlocked | numbers and ability names |
| `vrsb.life` | facts to remember, reminders, money | English strings with timestamps |
| `vrsb.reports` | complaints and what she saw, fixed, under which physics version | English strings plus stamps |
| `vrsb.habits` | n-gram counts over build tokens | numbers |
| `vrsb.skills` | repeated build runs as Forge lines with a signature and use count | Forge text |
| `vrsb.stand` | learned margins, joint substitutions and aprons per design kind, physics-stamped | numbers keyed by kind |
| `vrsb.library`, `vrsb.templates` | saved builds (.vrsb) and templates | canonical bytes |
| `vrsb.hotbar`, `vrsb.walk`, `vrsb.xrStyle` | UI settings | small |
| `ganglia.substrate` | the population journal (discoveries, replayed through ingest) | typed records |

The substrate itself is rebuilt from seeds on every load (deterministic), then the journal is replayed. Two things
persist that genuinely shape later reasoning: the stand's learned margins (numeric, by design kind) and the population
journal (relations). Everything else persisted is English text or counts.

## D. What disappears

On reload: the current build (saving is explicit; nothing reopens the last build), checkpoints and rewinds (in
memory), the last worked design and its trace (`lastEngineered`), Ego's transcript (12 lines), advice, what you
showed her, the joints already warned about, the creature minds, the watchdog's last 50 findings, every Nex
structure she ever built (they are rebuilt from the graph, never stored), every certificate, every epistemic vector,
every challenge attempt, every frontier exploration, the asks people made (`asks.ts` keeps them in memory only),
the grammar she grew. Goals, hypotheses, contradictions, attention and pending experiments do not disappear because
they never existed as state. Cognition ceases when the tab closes; what remains is the table above.

## E. Current memory architecture

Seven stores, four shapes, no shared type: English facts (life), English reports, token n-grams (habits), Forge
macros (skills), numeric learned margins (stand), build bytes (library), and a typed journal (substrate). Reasoning
happens in Nex and in law closures; memory is prose, tokens and numbers. That is the split the audit asked about.
Memory affecting future derivation exists in exactly two places: the stand's margins feed the next design of the same
kind, and the journal's relations feed every later traversal. A failed design does not become a generalised lesson
or a future constraint beyond those margins.

## F. Current self-model

A level with experience points and three gated abilities (`habits`, `memory`, `skills`), a census of counts ("I know
142 laws…"), a status line (the watchdog and whether everything is holding), a physics version stamp on reports and
learned margins, and the help text. The law tree (`ganglia/tree/nodes.ts`, 109 nodes: 60 laws, 11 structures, 9
realisations, 7 meta-laws, 5 axioms, 5 parameters, 5 numerical parameters, 5 model assumptions) has `Realised
{module, symbol}` and `Held {file, test}` in its schema, and zero nodes carry either. Ego has no model of which code
realises which capability, which tests protect it, which tools exist, or which capabilities are degraded. The
"knowledge" question built today (how well do you know X) is a tally over the graph, not a self-model.

## G. Current goal/frontier architecture

Three unrelated things wear the name: `ganglia/frontier.ts` is a static array of about fifty authored inventions with
labels and blueprints, explored on demand; the substrate `Queue` holds unknown facets ("that is a question on my
queue") that the population service works through; `asks.ts` keeps what people asked, in memory. No item has
dependencies, expected value, required evidence, cost, priority or affected projects. Nothing chooses what to think
about next; the population takes the queue in order.

## H. Current autonomy

Bounded and real in four places: the population service (budgeted slices, journaled); initiative messages (a joint
that will not hold is said as it is made; a joint near capacity is warned once; reminders); the test stand (a design
is proven in a second world before it is handed over, and what it needed is learned); and the growth of skills from
repetition. Everything else waits for an ask. No continuation of a goal across activations exists.

## I. Offline capability

Fully offline. Speech recognition and synthesis are the headset's own; the physics, the laws, the substrate, Nex, the
designer, the stand, the lessons and the saves need no network. The one network path is the Wikidata connector of the
population service (`substrate/connectors/wikidata.ts`), started only when `fetch` exists and failing quietly when the
host is blocked. It enriches entities with Wikidata labels and quantities; the rule expander derives without it.
Verdict on the Wikidata allowance you asked about: not needed. The app's knowledge grows from seeds and rules; the
external expander is DORMANT by circumstance and should become an optional plug that is off by default, so no network
permission is ever a condition of Ego working.

## J. Compute architecture

Represented: frame time per subsystem (`diagnostics/budget.ts`, with a finding when a frame overruns), the physics
step in its own worker, the population's slice budget (2 ms, 2 Hz) and question budget, memoised law runs and a
BM25 index in the ganglia. Not represented: any cost of reasoning (an ask runs whatever its handler runs: the
"knowledge" tally re-walks the graph, forms are recomputed per ask), proof-search effort, render cost as a quantity
Ego can read, storage pressure (`localStorage`, 5–10 MB in practice, holds builds and the journal), or an
escalation ladder (cached → derived → analytic → reduced → simulation → experiment). The ladder exists implicitly in
one place: the stand runs a full second simulation only after the analytic design; nothing decides that.

## K. Claude dependency

At runtime: none. At development time: total. Claude authors laws (with sources), seeds, intents, workflows,
manifolds, tests, documents and audits, and performs every repair. The recurring tasks Claude performs by hand that
belong inside Ego: turning a failed test or a watchdog report into a cause and a fix; turning an anomaly into a
revised law or domain; writing the next intent when a phrasing fails; promoting a repeated structure into a morpheme
or a skill (half built: grammar and skills do this for their own kinds); keeping the law tree's code links current;
deciding what to work on next. If Claude vanished, Ego would keep answering, building, proving and learning margins;
she would never gain a law, an intent, a workflow or a fix.

## L. Prompt dependency

None: there is no prompt. The persona is code and a help text. Durable principles live in code, tests and documents
already. The risk is the inverse one: generality is bounded by authored regular expressions (119) and authored
handlers, so every new way of asking is a code change.

## M. Nex / Law Nexus merge status

Not merged. A law exists in up to five places: the law object (`laws.ts`: eval closure, inputs, output, domain
check, validity text, worked example, source), the law tree node (statement, parents, obligations, domain, error
contract, authored again), the substrate's `governed-by` arrows, the scale layer's covariance verdicts, and the Nex
structure built from the law at answer time (`fromLaw`, `fromNode`). The tree's 60 law nodes duplicate the ids and
statements of `laws.ts` by hand. The documented Nexus (`docs/NEXUS.md`: trusted kernel, Judgment, hypergraph,
functors, Physical IR) is DOCUMENTED ONLY: zero occurrences in `src/`. What the day's work showed: the Nex
structure of a law already carries more than the schema (families, edges, forms, certificates, necessity read off the
law), so the merge direction is settled: the law object is the source, the node and the Nex view are derived from it,
and nothing is authored twice.

## N. Law execution / gating status

LIVE and real: the construction gate (`ganglia/tree/gate.ts`: `judgePart`, `judgeConnection`, `admitPart` refuse
overlaps, missing contact, unsupported standing) is called by the store, commands, app, world, forge host and tools.
LIVE: `use()` evaluates every law with its constants and domain check; Nex `evaluate`, `certificate`, `family`,
`between` and `regimes` run on questions. Proposal → validation → commit exists in six separate forms, each with its
own validator and its own store: the construction gate; the stand (design → second world → learned margins); the
population ingest (discovery → rules → journal); challenge attempts (levels); skill promotion (repetition); morpheme
promotion (description length). None share code.

## O. Watchdog status

`diagnostics/watchdog.ts` checks physical invariants on every tick's output (not-a-number, flung, jitter,
tunnelling, energy) and writes findings into `live.health`; it modifies nothing. Ego reads them every 0.5 s and files
a quarantine report ("nothing from this run counts", physics-stamped). `budget.ts` watches frame time. The immune
system (`immune.ts`, antibodies) and the Spiderweb are stress-test harnesses, not runtime. Verdict: the tick
watchdog stays as a monitor (a solver's output cannot be prevented structurally), the budget watchdog stays, nothing
is a shadow law system. Nothing to delete here; the quarantine it produces should become a Mind item (an anomaly),
not a report string.

## P. World-authoring authority

Document changes carry a source (`do`, `load`); Ego records only `do`. Physical evolution lives in the worker and
never passes through the store; the document holds poses at build points. Checkpoint and rewind exist in memory.
Physics events carry a type (`break`, `mind`, `plane`). There is no unified transition log naming the origin of a
change (user edit, Ego design edit, physical evolution, counterfactual, presentation, fault recovery, simulation
control). Creative authority is already large (Ego places, joins, grows, creates places and creatures, changes
gravity and scale); it is the history that is not kept.

## Q. Omni-inventor reality check

What exists: the designer (authored workflows: table, crate, wall, shaft, bearing, kart…), manifolds (parameter
spaces instantiated), grow (a machine grown from a want), the frontier explorer (authored inventions with
blueprints), the challenge engine (levels), fixes (what would have held), the stand (proof in a second world), the
build sheet (what you would need to make it for real). Trace of "design and demonstrate a better mechanism for X":
the ask must match an authored workflow or want, else "I know no X"; requirements come from the regex's captures;
law activation is the workflow's; the design is placed; the stand proves it; a failure becomes a learned margin;
presentation is the live world plus a sentence. Manual handoffs: a new kind of thing (code), a new law (code), a new
part (seed), a new phrasing (regex), any animation or staged explanation (none), persistence of the design as a
project (none).

## R. Omni-presenter reality check

There is no presenter. Replies are a sentence in a toast and in speech; the simulation is the demonstration; the
lessons system stages steps that complete by doing (the one presentation path that uses the same structures as the
world); the build sheet and the Spiderweb report are the only generated documents. No animation of an explanation,
no staged comparison, no branching of reality for a demonstration. Nothing here is separate demo logic, which is the
one good property to keep.

## S. Coding / self-code capability

None at runtime. The law tree's code and test link types are unused (0 of 109 nodes). Reports become a GitHub issue
URL for a human. There is no map from capability to source, source to law, or test to capability, so self-debugging
has nothing to stand on.

## T. Current recursive capability

The audit's definition: outputs of Ego's cognition becoming structured inputs to later cognition. True in two bounded
loops: stand results → learned margins → next design of that kind; population discoveries → journal → rules →
later traversals. Partly true in skills (repeated runs → macro) and grammar (recurring structures → morphemes,
rebuilt per session). False everywhere else: no stored hypothesis is ever tested later; no belief is revised; no
contradiction is detected across sessions; a law revision re-runs nothing; the anomaly register is authored, not
grown.

## U. Current background / dormant capability

While the app is open: the population slices and the 0.5 s tick. When closed: nothing, and the stores above. There
is cognitive discontinuity (no goal survives) without continuous computation (nothing burns compute). The target
state the audit describes, dormant without stateless, is reachable: the state to checkpoint is small (goals,
frontier items, hypotheses, anomalies, pending experiments, beliefs with their evidence) and the wake events already
exist as code paths (ask, break, watchdog finding, stand result, discovery, timer, load).

## V. Current user experience

A Quest headset app: tablet pages (checkpoint, rewind, undo, redo, build mode, play, save, new, gravities, shrink,
grow, stress view), hotbar, search, HUD, drawing wall, voice in and out, Forge text, Ego's page (twelve lines), saved
builds and templates, complaints that become reports. Friction counted: a phrasing must hit one of 119 patterns
(fallback is Forge, which surprises); the last build does not reopen; no project notion; Ego's state cannot be
inspected beyond status and counts; no way to see what she is waiting for or learned; speech recognition only where
the browser has it. Developer capability (tests, stress webs, audits) far exceeds user capability.

## W. Legacy / delete list

- `vrsb.ada` fallback key (the Ada era): delete after one migration.
- Growth-gated abilities (`habits`, `memory`, `skills` unlocked by level): human-shaped gamification; make them always
  on, keep the experience count only if the user wants it.
- Two anomaly types (`diagnostics/watchdog.ts` Anomaly with kind/severity/value/limit; `native/discovery.ts` Anomaly
  with residual/status/candidates): one, the discovery one, with the watchdog's finding as its observation.
- Eight scales of confidence (relation confidence, coverage confidence, certainty intervals, evidence ranks, Nexus
  tiers, challenge levels, frontier labels, stand margins): two stay (ordinal evidence kind with its species, and a
  certainty interval), the rest derive.
- The law tree's hand-written law statements (60 nodes duplicating `laws.ts`): derive the node from the law object.
- `docs/NEXUS.md` sections G (trusted kernel), H, J (Physical IR), `NEXUS-MINDS.md`, `NEXUS-STRESS.md`: documented
  only; mark as design history or replace by the one gate below. `AUDIT-*.md` and `ROADMAP.md`: archive folder.
- The external expander as a default: off by default, a plug.
- Help text as the capability list: render it from the self-model once one exists.

## X. Merge / compression list

- Six proposal → validation → commit instances → one `Gate` with typed validators and one journal of commits with
  origins. This is the largest compression available and the Judgment the Nexus document asked for.
- Seven memory stores → one Mind store of typed items (fact, report, ask, skill, learned margin, anomaly, hypothesis,
  goal, frontier item, derivation record), English rendered from them.
- Law object + tree node + Nex view → one law object, node and view derived.
- Designer workflows, manifold instantiation, grow, frontier blueprints → one proposal-generator interface the loop
  calls by type.
- Watchdog quarantine report → anomaly item; reports → items with the same evidence vector as everything else.
- Intents: keep the regex front end, but an unmatched ask becomes a frontier item (an unknown ask) instead of a Forge
  run, so unmet phrasings accumulate as state rather than vanishing.

## Y. Missing foundations

1. Persistent typed state (the Mind), checkpointed on commit, resumable on load.
2. An event bus with typed wake events and subscription by kind; the 0.5 s tick as one timer event.
3. The one gate, with the journal of commits carrying origins.
4. The frontier as state: question, dependencies, required evidence, cost class, status, priority, affected projects.
5. Derivation records (inputs, laws, outputs, physics stamp) and invalidation on law or physics change.
6. A resource model: cost classes for the escalation ladder (cached, derived, analytic, reduced, simulation,
   experiment), so a handler can choose the cheapest representation that preserves the required validity.
7. A project: a build plus its goals, open items and history, reopened on load.
8. The code map (realised, held) populated, so capability, law, code and test are one graph.
9. An inspection surface: current goal, frontier, active branch, what she waits for, what she learned, what changed.

## Z. System scalability risks

`localStorage` as the only store (size, no transactions, string blobs); the substrate rebuilt from seeds on every load
(cost grows with seeds; acceptable today, a wall later); 119 ordered regexes (brittle, O(n), English-only); one
4,000-line physics world module; test suites in minutes; documents (6,704 lines) that describe architecture the code
does not have, which will drift further unless documented-only sections are marked; no dependency graph of
derivations, so every law change is silently inconsistent with every stored result; no cost model, so a future
background loop could burn compute with nothing to stop it but the slice budget.

---

## 1. The minimum architecture to awaken Ego

Five mechanisms, no new subsystem that is not one of them:

1. **Mind**: one persistent store of typed items, each a Nex structure with a type (goal, hypothesis, belief,
   anomaly, frontier item, project, derivation, fact, report, ask, skill, learned margin), a status, an evidence
   vector, a physics stamp and origins. Checkpointed on every commit, loaded before the first frame, resumed with one
   rendered line ("I was proving the kart; two anomalies are open; the shaft design is stale since the bending law
   changed"). English stays a renderer of items.
2. **Gate**: one `commit(proposal, validators)`. Construction, designs, memory promotion, belief update and law
   changes all pass through it; its journal is the transition log with origins (user edit, Ego design edit, physical
   evolution, counterfactual, presentation, fault recovery, simulation control).
3. **Wake**: typed events (ask, break, watchdog finding, stand result, discovery, document change, load, timer,
   consolidation) delivered to handlers subscribed by kind; a handler activates only the items that depend on the
   event. No polling beyond the existing timer.
4. **Frontier**: items with dependencies, required evidence, cost class, priority from structural signals
   (uncertainty, anomaly size, number of dependents, user relevance), chosen by a scheduler that may answer
   immediately, defer, simulate, prove, measure, or leave unknown.
5. **Invalidation**: derivation records; a law or physics change marks dependents stale and opens frontier items.

Dormancy is then free: the Mind is the checkpoint, the store is the archive, the active region is whatever the last
event touched. Consolidation (compress episodes, invalidate stale beliefs, cluster anomalies, re-rank the frontier)
runs under the population's existing budget on a timer event.

## 2. The smallest general recursive loop

```
PERCEIVE (an event, typed) → MODEL (update the items the event touches) → PROPOSE (a generator chosen by item type:
design, fix, hypothesis, skill, morpheme, claim, code change) → VALIDATE (the gate: certificate, stand, conformance,
evidence) → COMMIT or QUARANTINE (journal, origin, stamp) → LEARN (promote, invalidate, re-rank the frontier)
```

It already runs, unshared, in the construction gate, the stand, the population, skills, grammar and challenges.
Physics, debugging, science, memory, coding, invention and self-improvement differ only in the item types, the
generators and the validators, never in the loop. The state the loop needs is exactly the Mind: STATE + GOAL + MODEL +
FRONTIER + PROPOSAL GENERATOR + VALIDATION + COMMITMENT + MEMORY + RESOURCE BUDGET, and nothing in that list is new
machinery except the first and the last.

## 3. The shortest safe migration path

Each step is one or two commits, keeps every existing test green, and deletes something as it lands.

1. **Mind and resume.** Add the Mind store (IndexedDB with a localStorage fallback), the item types, checkpoint on
   commit, resume on load. Migrate `lastEngineered`, asks, the watchdog quarantine and the stand's learned margins
   into items; the old stores become views for one release, then go. Test: reload resumes the project and its open
   items. Make the external expander a plug, off by default.
2. **Wake.** Wrap the existing listeners (store subscription, physics events, population, the 0.5 s tick, load) as
   typed events on one bus; Ego subscribes by kind. Delete the ad-hoc dispatch in `tick` and `onEvent`.
3. **Gate.** Route construction refusals, stand proofs, skill and morpheme promotion and population ingest through one
   `commit`; the journal is the transition log. Delete the six private validations as each migrates.
4. **Frontier as state.** Convert the static inventions, the substrate queue, anomalies, unmatched asks and stale
   derivations into frontier items with priorities; "what are you working on" and "what is open" render from it;
   consolidation on the timer under the slice budget.
5. **Derivations and invalidation.** Designer and workflows emit derivation records; laws carry a version; a change
   marks dependents stale and opens items.
6. **One law.** Derive tree nodes and the Nex view from the law object; populate realised and held links by a build
   step that reads the code; delete the duplicated statements and the growth gates; mark documented-only sections.
7. **Code as a causal system.** With the links of step 6, Ego answers which code realises a capability and which
   tests hold it; a failing test becomes an anomaly item; the loop's generators gain "code change" as a proposal
   type, validated by the test suite, committed by the gate. Self-improvement is then the same loop, not a new one.

What this does not promise: subjective anything. It promises that her state never disappears, her frontier keeps
its structure, her cognition resumes recursively, and only the part of her that an event or a goal touches wakes.
