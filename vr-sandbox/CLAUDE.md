# Nexus and the space: read this before any work here

Loaded every turn: the checks, the "never" list, the module map, the routes. For the rest, search the file named for
the words you need; do not read it whole.

## Search, don't read

| If the work is about | Search |
| --- | --- |
| What the user asked, in their own words | `docs/WANTED.md` |
| An owner's full row; before writing a new file | `docs/OWNERS.md` |
| What was done and measured | `docs/REALITY.md` |
| The fix plan by roots | `plan/FIX-PLAN.md` |
| What is next: the task in hand, the next three | `PROGRESS.md` |
| The critic, drift gate, round questions, speed, promises | `docs/CRITIC.md` |

Also: the plan `plan/README.md`; the in-app AI's instruction `docs/FOR-AI.md`; `docs/COMPILER.md`; `docs/LIFE.md`;
generated, never edited: `docs/NODES.md`, `docs/ATLAS.md`, `docs/DEPENDENCIES.md`, `docs/DISCIPLINES.md`.

## Checks

- **The session loop**: read `PROGRESS.md`; take the next task; its failing test first; build within its owners;
  the gate; commit; push; then rewrite `PROGRESS.md` (in full: `docs/CRITIC.md`).
- Gate: `npm run gate` (type check, the one test, a stamp the push hook reads; 217 to 236 s measured 2026-11-07),
  once, before pushing. While working: `timeout 250 npx tsc --noEmit -p .`, `npm run gate:field -- <field>` on the
  fields touched; `npm run docs` once per push.
- Probes: `tests/nexus/zz_probe_*.test.ts`, run by `npm run probe -- <file>` (stopped at two minutes), deleted before
  committing. Places by hand: `node scripts/by-hand.mjs` (the count may only fall).
- Node's fetch reaches the web only with `NODE_USE_ENV_PROXY=1`.

## Never

- Never write an `at` or a `rot` by hand: build with the operations of `room.ts` (decision 0021).
- Never restore the deleted builds or copy them out of git history; never build on the old nodes that set a place by
  number (`place`, `array`, `mirror`, `mate`, `onto`, `turn`, `move`) or `place.solve`, `auto.loop`, `placement/`.
- Never a second owner: `ls src/nexus` whole (never `| head`) and grep the concern first; extend its owner.
- Never per-product code (a car builder): the general rule, from data. Never keep what the app does not reach.
- Never a mock. Never a number without its source, or labelled typical or an estimate.
- Never state a time, a count or a result not measured or checked: say "I don't know" or "a guess".
- Never tune a real product's own data to please our checker; never loosen a check to pass.
- Never draw a piece the library has (`stock.ts`): search it first. Never edit a generated file by hand.
- Never wait in the foreground past two minutes. Never put API keys in the repo or in client code.

## Live decisions (`plan/decisions/`)

0021 operations only, nothing checks for overlap; 0022 the critic every session; 0027 the user is the check;
0028 parts remembered; 0029 the whole app rough, then fixes by roots (`plan/FIX-PLAN.md`).

## Module map

Under `src/nexus/`; `data/`, `engineering/`, `ganglia/`, `kernel/` under `src/`; tests and scripts from here.

| Concern | File | Nodes |
| --- | --- | --- |
| Constants, quantities | `data/constants.ts`, `quantities.ts` | |
| Laws and their algebra | `book/`, `lawgraph.ts`, `term.ts` | `law.` |
| Numeric methods | `numeric.ts` | `math.` |
| Materials, mixes | `matter.ts`, `mixture.ts`, `data/materials.ts` | |
| What a thing is made of: mass, inertia | `madeof.ts` | |
| Evidence, ±, balances | `evidence.ts` | |
| The kernel, its certificates | `kernel/`, `certify.ts` | |
| The gate, the hooks that refuse | `scripts/gate.mjs`, `scripts/hooks/` | |
| The one test, generated docs | `tests/nexus/domains.test.ts` | |
| Nodes, the library catalogue | `blocks.ts` | |
| Built parts, each stored once | `stock.ts` | `stock.` |
| Running boards, groups, folds | `dataflow.ts`, `boards.ts` | `group.` |
| Trials in workers | `pool.ts`, `trial-worker.ts` | |
| Parts remembered | `memory.ts` | |
| Starter boards | `starters.ts` | |
| Navigation, search, catalogue | `navigate.ts`, `flows.ts` | |
| Placed, never copied; take apart | `assembly.ts` | |
| The space: the operations | `room.ts` | `room.` |
| Common pieces by their standards | `common.ts` | `piece.` `mate.` |
| Part families: rows and a recipe | `parts/` | `piece.` |
| Contact graph, flow, bending | `graph.ts` | `graph` |
| Layout, contacts, rules, the make pipeline | `make/` | |
| The interface record | `interfaces.ts` | |
| Mating by faces, ports, bores | `mate.ts` | |
| Placement (old: not built on) | `placement/` | |
| Loads, stress sweeps | `loads.ts` | `load.` |
| Rigid bodies, motion (Jolt), servos | `sim.ts`, `motion.ts` | |
| Kits, shapes, cuts, mass | `kits.ts`, `mass.ts`, `form.ts` | `shape.` |
| Level of detail | `lod.ts` | |
| Looks: colour, films | `colour.ts`, `appearance.ts` | |
| Standard parts, threads | `families.ts`, `components.ts`, `threads.ts` | |
| Kinds of bought part, as data | `kinds/` | |
| Units, typed knowledge | `ganglia/` | |
| Engineering equations | `engineering/` | |
| Makers by process (what is left) | `makers.ts` | |
| Chips from netlists | `logic/` | |
| Inventory, breakdown queue | `inventory.ts`, `breakdown.ts` | |
| Research, the gap map | `research.ts` | `research.` |
| Web services, each a node | `genai.ts` | `api.` |
| The AI in the app | `agent.ts`, `aitools.ts` | `agent.` |
| The engineering compiler | `compiler.ts` | `compile.` |
| Exact solids, export | `brep.ts` | `solid.` `export.` |
| Stress by CalculiX | `fea.ts` | `verify.` |
| The gauntlet | `gauntlet.ts` | `gauntlet.` |
| Seeds, assemblies | `seeds.ts`, `assemblies/` | `seed.` |
| A built block's DC circuit | `circuit.ts` | `circuit.` |
| A built block's fluid network | `fluidnet.ts` | `fluid.` |
| Bodies, agents, awareness, gases | `act/`, `aware/`, `life/` | |
| Expressions; embodied machines | `generate.ts`, `embody/` | |
| Controls by hand | `controls.ts`, `view/pad.ts` | `control.` |
| The app and its pages | `view/` | |
