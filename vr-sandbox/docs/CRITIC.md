# The critic, speed and promises (routed from CLAUDE.md)

Moved here word for word from `CLAUDE.md` on 2026-11-09 (`plan/CRITIQUE-2.md`, finding 10 and section 3: the file loaded
on every turn cut to 6,000 characters or less). Read by the main session and the critic; a builder searches it and does
not read it whole. In the text below, "this file" and "above" mean `CLAUDE.md` as it stood, whose owners table is now in
`docs/OWNERS.md`; paths are from `vr-sandbox/`. Every word the user said is in `docs/WANTED.md`.

This file is the anchor against drift. Long recursive work loses the point when each round optimises what it can measure
(tests green, numbers sourced, findings fixed) and forgets what the person asked for. Summaries after a context reset keep
the task list and lose the why. So the why lives here, and every round is checked against it.

## What is wanted (the summary; every word the user said is in `docs/WANTED.md`)

- **A node system that builds anything** from real parts, each part from its own sub-parts down to the bolt (and the
  transistor), every piece stored once and reused (the library law), any board folded into one reusable node, so
  complexity compounds: a motor, a drone, a swarm, a car, a house, a city.
- **Real, not mocked:** real products true to their published figures, built from the inside out, explodable to the
  bottom; physics, materials (down to the elements), rules for heat, and no overlap possible (never checked for: made
  impossible, decision 0021); honest about what is
  approximated. A real product's own data is held fixed: a finding on it is checked against the real product first and
  never tuned away to please our checker.
- **No manual work, no guessing:** parts say what they need and solvers place, route, size, check and fix (constraints,
  changes that follow, repair loops as nodes); the eight fundamental systems (spatial, material, physical laws, time and
  change, causality, composition, multiscale, rendering) as the frame, rendering the output, not the foundation.
- **AI in the loop, engineered:** every service a node; prompts engineered like circuits (one tagged task per call,
  failure-aware pipelines of AI gates, judged blind, never one giant prompt); an AI in the app that works through nodes;
  every AI flow explained step by step (who waits for what, reads what, writes what, where it can fail).
- **Speed and focus:** small cases first; stop anything past two minutes and ask whether a pipeline is missing; test what
  changed, not everything; targeted context (this file routes to the rest); screenshots as work lands.
- **Always:** no mocks; every number sourced, or labelled typical or an estimate; failures reported honestly. "don't lie
  again it hurt my feelings": never state a time, a count or a result that was not measured or checked; say "I don't
  know" or "a guess" where it is one.

## The critic, every session (the user, 2026-11-02: "why do I have to say all of this")

The user should never have to say that code is broken or left over, that a build is blocky or has pieces through each
other, or that something researched was never built. At the start of every session, and before telling the user that
anything is done, run the critic (`../.claude/agents/critic.md`: it opens every board with `node scripts/audit.cjs`,
looks at every picture, holds the app to `docs/WANTED.md`, finds dead code and planned work never built, and fixes the
worst). What it finds that a person would see comes before any planned task. What the user has to point out is the
critic's miss: add it to the critic's checks.

## Where to read for what (targeted context: read only what the work needs)

| If the work is about | Read |
| --- | --- |
| What the user asked, in their words, and when | `docs/WANTED.md` |
| Which module owns a concern, in full (its nodes, its rules) | `docs/OWNERS.md` (the one-line table is below) |
| What is next, and in what order; the task in hand | `PROGRESS.md` (the task in hand, the next three, what is open), `plan/INDEX.md` (the start queue, every task) |
| The plan: the vision and the advantage, the rules and their checks (`CONSTITUTION.md`), the phases' specs with failing tasks, the decisions, the research, the questions | `plan/README.md` (how it works), `plan/INDEX.md` (its state, compiled: every task, every fault found in the code, the open questions) |
| How the AI in the app is told to build (its whole instruction) | `docs/FOR-AI.md` |
| What depends on what in the code; the disciplines tree nodes are classed by | `docs/DEPENDENCIES.md`, `docs/DISCIPLINES.md` (both generated) |
| What was done and measured, round by round | `docs/REALITY.md` (a log: search it, do not read it whole) |
| The engineering compiler's 30 stages | `docs/COMPILER.md` |
| Agents, awareness, bodies, gases | `docs/LIFE.md` |
| Every node, generated | `docs/NODES.md`; the library's map `docs/ATLAS.md` |
| A large module (`blocks.ts`, `dataflow.ts`) | its route map at its top: read the section named there, not the file |

## When work is slow: step back

- **Rough the whole first, polish at the end** (the user, 2026-11-05: "if something takes too long cut it wether it's a
  audit test or whatever we build rough the whole thing then come back at the end and polish it"). Every part of a round
  is built rough before any one is polished; anything past its time (an audit, a test, a run, a build) is cut, never
  waited on, and what was cut is said and listed for the polish pass. Long runs carry their own limit (`timeout 120`,
  the audit's `AUDIT_SECONDS`).
- Past about **two minutes** on one run, or **three tries** at one fix: stop. Ask whether this is population (easy, just
  many) or a **missing pipeline** (the same judgement made by hand again and again). If it is a missing pipeline, say so
  and build the pipeline (a board of nodes, AI gates where judgement is needed) instead of doing the next one by hand.
- Test what changed: a probe on the one thing, `npm run gate:field` on the fields touched; the whole gate once,
  before pushing. A test that guards nothing the change touches is not run while working.

## What can honestly be promised

A real product's exact surfaces are its maker's CAD and are not public. What is public and can be matched: its published
dimensions (length, width, height, wheelbase, track, seat height), its tyre and wheel sizes, its engine or motor and its
ratings, its mass, its part list and how it goes together. A product made here is true to those, with each figure's
source, and its shape approximates the surface. Say that plainly. Never call a model exact when it is not.

## The drift gate: before spending a round on a fix

Recursive work drifts toward the most efficient path for the measurement, not toward what was asked. The gate is
the pause before a round where you ask whether this fix is still worth making. Pass it before tuning anything:

- **Will what I am tuning against still exist?** Do not tune a critic, a test or a threshold against a thing about
  to be replaced. (2026-10-08: the critic was not tuned to the box-bodied car, because that car was being replaced by
  a general vehicle maker. Tuning to it would have made the critic fit a template.)
- **Is the number I am moving the thing they care about?** Joint counts, test totals and finding counts are proxies.
  The person cares whether the thing is real, recognisable, buildable and expandable.
- **Am I picking this fix because it is easy to measure, or because it matters most?** If the most visible flaw
  in the screenshot is not what this round fixes, say why.
- **Would the user call this round progress if they saw only its result?** If not, stop and re-aim.

Say the gate's answer out loud in the round's notes when it changes what gets done, so the choice can be seen.

## Every round, ask these, then act on the answers

1. Does this already exist somewhere? Am I about to make a second one?
2. What does a person see first? Render it, framed so it can be seen whole, take a screenshot, and look at it.
   Would they recognise it at a glance? What would they call cheap, wrong or fake?
3. Blind check: give the screenshot to an agent with no context. Ask what it is and what is wrong with it. If it
   cannot name the thing, the thing is not done, whatever the tests say.
4. Am I measuring what they care about, or what is easy to measure?
5. Re-read "What is wanted" above. Is this round still aimed at it?
6. What am I not asking? (Scale against a person? How does it move? What does it sound like? What happens when it
   is clicked, taken apart, driven?)
7. What would a real engineer expect that is plainly absent? Ask a fresh agent each round, with this file's owners table,
   for the concepts a mechanical, electrical and manufacturing engineer would expect and do not find (2026-10-08: the
   user had to name mating parts, a bolt pattern finding its reverse and connecting, though "next are mounts (bolt
   patterns)" was already written here; holes cut, fits and tolerances, placement by constraints, fasteners sized by
   load, motion, electrical and fluid ports, shape from process and cost were absent with it). Act on what it names
   before polishing what the critic counts: a missing concept costs every build, a patched overlap costs one.
8. Run the breakdown queue (`npm run breakdown -- report.md`). Nothing new may wait as "not in the table", and the families
   at the top of "only its materials listed" and "several materials in one shaping" are broken out before new ones are
   added: a part is not stored until it is broken down. A new id is checked against the table first: an id written twice
   replaces the first unseen (`WRITTEN_TWICE` in `inventory.ts` must stay empty).

## Speed (the user, 2026-11-07: "I want it fast ... there never a need for a digital entity to be taking hours on a task unless it's populating"; the panel's critique, `plan/CRITIQUE.md`)

- **Nothing waits in the foreground past two minutes.** Anything longer runs in the background with a timeout and is
  reported when it ends. A wave of builders ends at a hard stop (about an hour); what is left is reported, not waited for.
- **Builders: at most six at once**, each committing every 20 minutes so a death loses 20 minutes, not an hour. Population
  (families, assemblies) runs on the cheaper model; only roots (geometry, motion, the AI's prompts) on the strongest.
  A builder's brief is under 400 words: the files, the deliverable, the test anchor, "done when", the stop time; it reads
  its owner row and nothing else; no pictures or blind checks unless the brief asks.
- **The usage pool is shared by every builder.** When a wave dies on the limit, a resume is scheduled at the reset minute
  (`send_later`), never left to chance; the next wave is smaller.
- **Checks while working:** the type check and `npm run gate:field -- <field>` on the fields touched. The whole gate runs
  once, before a push. The docs pass runs once per push. Nothing is evaluated with real calls until the geometry root
  (`plan/FIX-PLAN.md`, root 1) is in.
- **Bookkeeping in the same commit as the work, never alone:** the user's words appended to `docs/WANTED.md`, the round's
  line in `docs/REALITY.md`, the owner row. No decision file unless the user asks for one; `plan/FIX-PLAN.md` is the plan.
- **Estimates in waves, never days.** One wave, hard stop, the remainder reported. A number not measured is "a guess".
- **Every green push is merged to `main`** the same hour (a pull request, merged), so the repo's front page is the work.

## Working here

- **The session loop** (spec 00, S2): read `PROGRESS.md` (the task in hand, the next three, what is open); take the next
  task of the start queue (`plan/README.md`); write its failing test first; build it within the task's owners; run the
  gate; commit with the task's id in the message (`[00.S3]`); push (the push hook refuses a commit the gate has not
  passed); ask the evaluator (`plan/specs/00-structure/evaluator.md`) for a verdict; then rewrite `PROGRESS.md`.
- Gate: `npm run gate` (`scripts/gate.mjs`): the type check and the one test, then a stamp of exactly what passed (the push
  hook reads it), `tests/nexus/domains.test.ts` (every domain's nodes, their own
  tests, one quick board per field, the reach check), about four minutes (217 to 236 s measured 2026-11-07); CI runs the same. `UPDATE_DOCS=1 npx vitest run`
  writes the generated docs and the nodes' dates (twice where nodes' code changed). Nodes built before the update are
  marked as such: the queue to re-check. Build the viewer: `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing. Run them with `npm run probe --
  <file>` (stopped at two minutes). Where places are still written by hand, builder by builder: `node scripts/by-hand.mjs`.
  While working, the gate on the fields touched: `npm run gate:field -- Mechanical` (seconds
  for one field, against about four minutes whole); the docs once with `npm run docs`; the whole gate before pushing.
- Node's built-in fetch reaches the web here only with `NODE_USE_ENV_PROXY=1` (the container's proxy; set in the
  scripts above).
- Never put API keys in the repo or in client code.
