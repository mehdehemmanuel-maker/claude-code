# Stop the line (spec 00, task S10; constitution C25)

An andon is raised when a check fails on something already called done: a task passing by the evaluator, the gate on a
pushed commit, a fault fixed that comes back. While it is open, that task, and every task that waits on it, cannot be
called passing, however far down the chain of "after" it waits (the one test and `compile.py` both refuse it). It is
closed only by the change that fixes it, named here: "closed <date> by commit <sha>", a commit that exists.
No blame: the row says what failed and what fixed it, never who.

| Id | Raised | Task | What failed | State |
| --- | --- | --- | --- | --- |
| A1 | 2026-11-01 | 00.S6 | The whole gate went red on a pushed commit: two verdict files were not routed from `plan/README.md` (the routing test), and they had been pushed without the gate being run (found by the evaluator judging 00.S4) | closed 2026-11-01 by commit 6a31f04 (the verdicts routed) and 417f9f5 (the push gate, which now refuses such a push) |
