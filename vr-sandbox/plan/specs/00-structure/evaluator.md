# The evaluator: who says a task is done (spec 00, task S7)

A task is failing until the evaluator says it passes. The builder (the AI that wrote the change) never marks its own
work passing: it marks a task `claimed`, with its evidence, and asks for a verdict. The rule is checked by the one
test: a task whose status is `passing` has a `pass` verdict in `verdicts/`, made after the task's last change.

## Who it is

A fresh agent with no part in the building: it is given this brief, the task, and the evidence, and nothing of how the
builder reasoned. It runs on a different model from the builder (the user, 2026-10-31, U9: "for the reviewer you need
different kinds"): the builder is Claude Opus; the evaluator is Claude Sonnet. It may read the code, run the gate, run
the evaluation sets and drive the app (a screenshot, the emulated headset); it may change nothing but its verdict file.

## What it is given

1. The task: its id, its title and **its check** (from the spec's task table or `tasks.json`), and the requirement it
   meets. The check is the contract: the task passes when the check is shown to hold, not when the work looks good.
2. The evidence the builder claims: the commands, the files and lines, the entries in `docs/REALITY.md`.
3. This brief.

## How it judges

1. **Run the check itself.** Never pass on the builder's word. Run the test, the command or the probe that shows the
   check holds; read the code the evidence names. A check that cannot be run is not passed.
2. **Try to make it fail.** Plant the fault the check guards against where that is cheap (change one line, run, put it
   back) and see the check catch it. A check that would pass whatever the code did is a failing check.
3. **Hold the check to its words.** A check that says "each of those five wirings" needs all five; "measured on
   devices" needs devices, and an emulator is said as an emulator. Partly met is `fail`, with what is missing.
4. **Say what you did.** Each verdict lists what was run and what was seen, so a person can repeat it.
5. **Leave the tree as you found it.** Anything planted is removed; `git status` is clean of your changes at the end
   but for your verdict file.

## The verdict

One file, `plan/specs/00-structure/verdicts/<spec>.<task>.json`:

```json
{ "task": "10.T11", "verdict": "pass" | "fail", "model": "the model that judged", "date": "YYYY-MM-DD",
  "commit": "the commit judged (git rev-parse HEAD)", "ran": ["each command or probe run, and what it showed"],
  "planted": ["each fault planted, and whether the check caught it"], "missing": ["for a fail: what the check needs that is not there"] }
```

## Three scored examples (from this project's own work)

**1. Pass: the routing test covers `plan/` (spec 00, S6).** Check: "a plan file not routed from CLAUDE.md or
plan/README.md fails the test". The evaluator runs the routing test (passes), plants `plan/STRAY.md` (the test fails
naming it), plants `plan/specs/99-x/a.md` (fails naming it), removes both (passes). Every word of the check is shown.
**Verdict: pass.**

**2. Fail: "the guide's example runs" (2026-10-31, before fault D10 was fixed).** Claimed: the AI's guide shows a plan
that builds a spring to 40,000 N/m. The evaluator builds the plan as written: the board runs with no error, but the
spring's rate is 11,308.6 N/m: the wire went into `rate`, which is an output, and was dropped without a word. "It ran"
was true; what the check asked (the plan does what it says) was not. **Verdict: fail**, missing: "the wire into `rate`
is not an input; the spring ran on its defaults".

**3. Fail, partly met: headset comfort (spec 04, P10), had it been claimed whole.** Check: "each angle and distance
measured in the emulated session within the stated limits". The evaluator runs the measuring script: distances and
angles stand within limits and do not move when the player walks. But the task's own text also asks for text "≥ 0.6°",
and no measurement of text size exists. **Verdict: fail**, missing: "the board's text size in degrees is not measured".
(A task met in part is failing; the builder splits it or finishes it.)
