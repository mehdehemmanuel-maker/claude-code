# Spec 00, the structure: the design

Starts from what exists (checked 2026-10-31): `CLAUDE.md` as a router; `docs/WANTED.md`, `OWNERS.md`, `ROADMAP.md`,
`REALITY.md`; the gate (`npm run gate`: type check and `tests/nexus/domains.test.ts`, about 48 s); tests holding reach,
routing, the library law, navigation and every node's own tests.

What the research says works (`research/03-agents-structure.md`): an external task list whose items start failing; an
evaluator apart from the builder, calibrated with scored examples; fresh contexts with a short handoff file; decisions
written down; checks that run rather than rules that are remembered. Context files that summarise did not help in the
one study found; routing files and executable checks are what this design keeps.

## The pieces

1. **`plan/CONSTITUTION.md`** (written): rules C1 to C18, each with its check and state.
2. **Specs** (`plan/specs/NN-name/`): `requirements.md`, `design.md`, `tasks.json` (schema below).
3. **Decisions** (`plan/decisions/NNNN-title.md`): context, options, choice, the assumption it rests on, when to test it
   again, what it supersedes.
4. **Evaluation sets** (`evals/`):
   - `evals/agent/`: 30 requests to the AI with checked answers (a spring to a target, a bolt by size, a board opened and
     changed, a block folded, a part placed on another…); measured: steps, tokens fresh and cached, seconds, right or
     wrong, placement errors. Run by `npm run eval:agent`; today's numbers are the baseline.
   - `evals/interfaces/`: the cases of spec 01 §4.
   - `evals/products/`: real products with their published figures (the user chooses them, `QUESTIONS.md` U6).
   - `evals/search/`: the plain and misspelt questions (the gate's twenty, growing).
5. **`PROGRESS.md`** at the project's root: under 40 lines, rewritten, never appended.
6. **Hooks** (`.claude/settings.json` in the project, with small scripts under `scripts/hooks/`):
   - *push gate*: before `git push`, the commit must carry a gate stamp (`.gate-ok` holding the commit's hash, written
     by `npm run gate` when it passes); else refused;
   - *budget*: before a commit, the files changed are compared with the task's owners (the task id is in the commit
     message); past them without a decision record named in the message, refused;
   - *honesty*: a line added to `REALITY.md` or `PROGRESS.md` holding a number must hold a `cmd:` note or a test name;
   - *loop breaker*: the harness counts failed checks per task id (in `PROGRESS.md`); at three, the hook stops with
     "is a pipeline missing?". The two-minute run limit stays on the scripts (`timeout`).
7. **The provenance check** (in the gate): data files' figures carry a `source` or a label (`typical`, `derived`,
   `estimate`); a scan for placeholder words in data ("TODO", "lorem", "placeholder", round guesses flagged by a list);
   a secret scan for key patterns.
8. **The evaluator**: a subagent given the requirement, the task's check and the result (not the builder's reasoning),
   with three scored examples of passing and failing work; it drives the app (screenshot, the walker) where the task is
   seen; it alone flips a task to `passing`. Whether it runs on a different model is the user's choice (`QUESTIONS.md`
   U9).

## `tasks.json` schema

```json
{ "spec": "NN-name", "tasks": [ { "id": "X1", "title": "…", "meets": ["R1"], "owner": "files", "check": "how it is proved",
  "status": "failing | passing", "after": ["X0"], "evidence": "the command or test that passed, and its output's key line" } ] }
```

## What it costs

The hooks run in under a second each. The evaluator costs a model call per task (Anthropic's harness reports $9 to
$200 a run for whole apps; ours is one task at a time, so far less, not measured yet). The evaluation set for the AI
costs 30 requests per run (at today's 3,600 fresh tokens a request on Haiku, small; measured when built).
