# Near misses (spec 00, task S10): what nearly went wrong, caught, and what changed because of it

No blame (after just-culture practice, research 16 and 20): each row names its kind and the response that kind calls
for, never a culprit. An **error** is a slip (the response: fix it and add the check that would have caught it); an
**at-risk** act is a shortcut that skipped a check (the response: change the process so the check cannot be skipped); a
**reckless** act goes on past a known refusal on purpose (the response: stop, and tell the user). The AI in the app catches
its own on each run (`nearMisses` in `src/nexus/agent.ts`: a refusal said back, a tool or a node that failed, numbers with
no board, an answer given past a refusal still standing): the page shows them beside the answer, the node 'Claude builds
a board' gives them on its output `near misses`, and the evaluation runners print them.

| Date | What happened | Kind | Caught by | Response |
| --- | --- | --- | --- | --- |
| 2026-10-31 | A commit that failed the gate was pushed: a `grep` in the command let the `&&` chain go on after the gate failed | at-risk | the next gate run | the push made conditional on the gate's exit code; since 2026-11-01 the push gate hook (00.S3) refuses any push of a tree the gate did not stamp |
| 2026-10-31 | The AI's guide showed a wire into a spring's output (`rate`); the engine kept it silently and the spring ran on its defaults | error | research pass 30, then a probe | the wire refused with the input named; the gate runs the guide's own plan (fault D10) |
| 2026-11-01 | Two verdict files pushed without the gate run; the routing test was red on the pushed commit | at-risk | the evaluator, judging 00.S4 | andon A1; the push gate hook (00.S3) |
| 2026-11-01 | A probe test left in `tests/nexus/` was picked up by the gate (a run past two minutes, and a sweep's log overwritten) and once committed | error | the slow gate run, then the builder | the gate now fails while a `zz_probe_*` file is present anywhere its tests are looked for (the test "no probe is left where the gate runs") |
| 2026-11-01 | The honesty hook let a planted entry through twice (an entry added beside another in one hunk; then a path git read from the wrong folder), and once a planted line was committed locally | error | a live try of the hook, before any push | each entry judged on its own; the path from the top of the repository; the local commit undone; every hook tried live, not only by its unit test |
| 2026-11-01 | The new Claude Code push hook stopped a command that only wrote the words "git's pre-push hook" | error | the hook itself, the moment it was installed | the hook reads commands, not words in text (`pushes` in `scripts/hooks/lib.mjs`, nine cases tested) |
| 2026-11-01 | The headset layout was changed from the task's numbers (chat 30° to 42°, bar 0.74 to 0.62) without a decision record | at-risk | the evaluator, judging 04.P10 | 04.P10 stays failing until the change is recorded or undone |
