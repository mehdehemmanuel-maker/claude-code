# The constitution: the rules every change keeps

Each rule has an id, the check that enforces it, and its state. A rule that is only words drifts; the state column says
plainly which rules are enforced today and which are not yet, so the gaps are seen. Changing a rule takes a decision
record (`decisions/`).

States: **enforced** (a check runs in the gate or a hook and fails on a breach), **partly** (a check covers some of it;
what it misses is said), **unenforced** (no check yet: the spec that will add one is named).

| Id | Rule | The check | State (2026-10-31) |
| --- | --- | --- | --- |
| C1 | Nothing outdated is kept: every source file is reached from the app | the reach test, `tests/nexus/domains.test.ts` | enforced |
| C2 | One owner per concern; every file has an owner row | the routing test (every source file named in `CLAUDE.md` or `docs/OWNERS.md`) | partly: a file named is not proved to be the only owner of its concern |
| C3 | Every document is routed from `CLAUDE.md`, and every route leads somewhere | the routing test | enforced (for `docs/`; `plan/` added by spec 00, task S6) |
| C4 | The library law: every piece every build makes is stored once; nothing stored that no build makes | the stock test | enforced |
| C5 | Every node has its own tests, a spec (gloss, discipline, role), and runs on its quick board | the domain tests | enforced |
| C6 | Navigation: every node, board and app feature found by name in the first three; plain and misspelt questions land | the navigation test | enforced (a quarter of the nodes in the gate; all in the docs run) |
| C7 | Every number is sourced, or labelled typical, derived or an estimate | provenance check | **unenforced**: spec 00, task S4 |
| C8 | No mocks: nothing stands in for what it claims to be | partly the domain tests (nodes run for real) | partly: no scan for placeholder figures; spec 00, task S4 |
| C9 | A real product's own data is held fixed; a finding on it is checked against the product, never tuned away | the golden products set | **unenforced**: spec 00, task S5 |
| C10 | Never state a time, count or result that was not measured | honesty hook on `REALITY.md` and `PROGRESS.md` (a number needs the command it came from) | **unenforced**: spec 00, task S3 |
| C11 | No push unless the gate passed on that commit | push hook | **unenforced**: spec 00, task S3 (the 2026-10-31 red push is why) |
| C12 | A task stays in its budget: its owner, its tests and docs; past it, a decision record | change-budget hook | **unenforced**: spec 00, task S3 |
| C13 | Two minutes on one run, or three failed tries: stop, and ask whether a pipeline is missing | loop-breaker hook | **unenforced** (a rule in `CLAUDE.md` today): spec 00, task S3 |
| C14 | Names are not nodes: the node count is what runs | the names-index test | **unenforced**: spec 02, task N6 |
| C15 | Faces are never referred to by their index; parts mate by interfaces, not by typed positions where an interface exists | interface tests | **unenforced**: spec 01, tasks I9 and I14 |
| C16 | Checks by number first; a picture is a second check, never the only one | the AI's evaluation set and the evaluator's contract | **unenforced**: spec 00, task S5; spec 01, task I15 |
| C17 | Keys never in the repo or a page | a secret scan in the gate | partly: the rule is in `CLAUDE.md`; no scan. Spec 00, task S4 |
| C18 | Licences kept: no copied standard tables; no-derivative files kept unmodified; a source's licence on every imported row | the import check | **unenforced**: spec 02, task N2; spec 05, task V1 |
