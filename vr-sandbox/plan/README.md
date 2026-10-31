# The plan

The structured plan for what Nexus builds next, and how it is built so the work does not forget, drift or go in circles.
Written 2026-10-31 from five research passes (kept in `research/`) and from what the code holds today (each spec says
what it starts from, checked in the code). The user's words that started it are in `../docs/WANTED.md`, 2026-10-31.

Nothing here is built yet. A phase starts when the user says so.

## How this folder is laid out

| Where | What it holds | Who changes it |
| --- | --- | --- |
| `README.md` (this file) | the vision, the advantage, the phases and their state, how to work | each phase's state, when it changes |
| `CONSTITUTION.md` | the rules every change keeps, each with the check that enforces it (or marked unenforced) | a rule added or changed only by a decision record |
| `decisions/` | one record for each choice made: the options, the choice, the assumption under it, when to test it again | a new record; an old one is superseded, never edited away |
| `specs/NN-name/` | one per phase. The phases begun soonest are split into `requirements.md` (what it shall do, each line traced to the user's words), `design.md` (how, and which owners it extends) and `tasks.json` (each task failing until its check passes); the later ones are one `spec.md` holding the same three parts, split when they start | the phase's work |
| `research/` | what the research found, in short, with its sources named | added to when research is done again |
| `QUESTIONS.md` | what only the user can decide, and what the research could not answer | as questions are answered |

Every spec extends the owners named in `../CLAUDE.md`. Nothing here is a second owner.

## The vision, in one paragraph

Nexus builds anything from real parts, each from its own sub-parts down to the bolt, every piece stored once and reused,
any board folded into one node, so complexity compounds from a bolt to a city. Real, not mocked: every number sourced
or labelled; physics, materials and rules checked. No manual work: parts say what they need, and solvers place, size,
check and fix. An AI works through the nodes, engineered like a circuit, checked by numbers and by a second judge.

## The advantage (why the interface spec comes first after the structure)

The research (`research/02-topology-mating.md`, `research/01-ai-cad-tools.md`) found that every serious CAD tool
handles "what a part needs from its neighbours" in two separate halves: a typed frame (where it meets, what may meet
it), and a tool body (the hole or pocket the neighbour must receive). Only SolidWorks' Smart Components tie the second
to the part, and even then as a feature recorded in the host by hand. **No tool works out a part's negative from the
part's own standard and fit, in one general model, both ways (a bolt brings its hole; a hole finds its bolt).**

The user's idea, "make a bolt, and paste its input geometry into the surface of anything", is exactly that model.
Nexus is unusually placed to build it: its parts already carry sourced standard tables (`threads.ts`: ISO 261, 4762,
4032, 7089; `kinds/motion.ts`: ISO 273), its ports already mate by hole patterns and lay their own fasteners
(`mate.ts`), and a node graph makes "changes that follow" a matter of wiring. Two research findings make it more
valuable still: AI CAD fails on **placement, not shape** (BenchCAD 2.0: 83 to 96 % of the zero-scoring part types had
the right shape in the wrong place), and **numbers check better than pictures**. An AI that places parts by mating
their interfaces, and checks each mate's residual, removes the failure every other tool has.

Spec: `specs/01-interfaces/`.

## The phases, and where each stands

| # | Phase | Spec | Starts when | State |
| --- | --- | --- | --- | --- |
| 0 | The structure: rules with checks, specs, decisions, evaluation sets, hooks | `specs/00-structure/` | now (the user's go) | not started |
| 1 | Interfaces: parts that carry their negative; imprint onto any surface; changes that follow; placement by mating | `specs/01-interfaces/` | after 0 | not started |
| 2 | Search in tiers and the names index | `specs/02-search-names/` | after 0 (beside 1) | not started |
| 3 | Out of the container: the app on the web | `specs/03-web/` | when hosting is chosen (`QUESTIONS.md` U1) | waiting on the user |
| 4 | Being in it: physics, ghost, scale, time, sight | `specs/04-being-in-it/` | after 1; real devices after 3 | not started |
| 5 | Civil engineering, populated | `specs/05-civil/` | after 1 and 2 (it needs both) | not started |
| 6 | Nexus on the phone (JARVIS style) | `specs/06-phone/` | after 3 | not started |
| 8 | A picture to a 3D profile (the AI draws, a parser with no AI copies) | `specs/08-sketch-to-3d/` | after 1; the brief after research 11 | not started |
| 7 | Further (Evolve, lattices, schemas, USD, shared world) | `specs/07-later/` | after 1 to 6 hold | not started |

Why this order (decision `decisions/0002-order.md`): the structure first, because everything after leans on it; the
interfaces next, because they are the advantage and need no decision from the user; search beside them (they touch
different owners); the web as soon as hosting is chosen; civil after interfaces and names, because a bolted steel
connection needs the first and a civil vocabulary needs the second.

## How to work here (the loop for every task)

1. **Read**: `../CLAUDE.md` (the router), `../PROGRESS.md` (where the work stands), the one spec in hand, the owner's row
   in `../docs/OWNERS.md`. Nothing else unless the router sends you there.
2. **Contract**: write in the task what will change, which checks will prove it, and its budget (files, owner). A
   decision record if it reaches past its owner.
3. **Build** within the budget. Two minutes on one run or three failed tries: stop and ask whether a pipeline is
   missing (`../CLAUDE.md`).
4. **Check**: the task's own check, the gate on the fields touched, then a **fresh evaluator** (an agent with no view of
   the builder's reasoning) reads the requirement and the result, drives the app (a screenshot, the walker as
   playtester), and passes or fails it. Only the evaluator moves a task to `passing`.
5. **Record**: commit naming the spec and task; update `tasks.json`, `../PROGRESS.md` (short, rewritten) and
   `../docs/REALITY.md` (only what was measured, with the command it came from).

A task is done when its check passes, never when the builder says so.
