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
| C3 | Every document is routed from `CLAUDE.md`, and every route leads somewhere | the routing test | enforced (`docs/` and `plan/`, since 2026-11-01) |
| C4 | The library law: every piece every build makes is stored once; nothing stored that no build makes | the stock test | enforced |
| C5 | Every node has its own tests, a spec (gloss, discipline, role), and runs on its quick board | the domain tests | enforced |
| C6 | Navigation: every node, board and app feature found by name in the first three; plain and misspelt questions land | the navigation test | enforced (a quarter of the nodes in the gate; all in the docs run) |
| C7 | Every number is sourced, or labelled typical, derived or an estimate | provenance check | enforced for `src/data/` since 2026-11-01 (the provenance scan); figures elsewhere (the kinds, the makers) not yet |
| C8 | No mocks: nothing stands in for what it claims to be | partly the domain tests (nodes run for real) | partly: no scan for placeholder figures; spec 00, task S4 |
| C9 | A real product's own data is held fixed; a finding on it is checked against the product, never tuned away | the golden products set | **unenforced**: spec 00, task S5 |
| C10 | Never state a time, count or result that was not measured | honesty hook on `REALITY.md` and `PROGRESS.md` (a number needs the command it came from) | **unenforced**: spec 00, task S3 |
| C11 | No push unless the gate passed on that commit | push hook | **unenforced**: spec 00, task S3 (the 2026-10-31 red push is why) |
| C12 | A task stays in its budget: its owner, its tests and docs; past it, a decision record | change-budget hook | **unenforced**: spec 00, task S3 |
| C13 | Two minutes on one run, or three failed tries: stop, and ask whether a pipeline is missing | loop-breaker hook | **unenforced** (a rule in `CLAUDE.md` today): spec 00, task S3 |
| C14 | Names are not nodes: the node count is what runs | the names-index test | **unenforced**: spec 02, task N6 |
| C15 | Faces are never referred to by their index; parts mate by interfaces, not by typed positions where an interface exists | interface tests | **unenforced**: spec 01, tasks I9 and I14 |
| C16 | Checks by number first; a picture is a second check, never the only one | the AI's evaluation set and the evaluator's contract | **unenforced**: spec 00, task S5; spec 01, task I15 |
| C17 | Keys never in the repo or a page | a secret scan in the gate | enforced since 2026-11-01: the secret scan over every tracked file and the built pages |
| C18 | Licences kept: no copied standard tables; no-derivative files kept unmodified; a source's licence on every imported row | the import check | **unenforced**: spec 02, task N2; spec 05, task V1 |
| C19 | A published interface is never changed in place: a new version, with an adapter or a declared break | the interface version test | **unenforced**: spec 01, task I18 |
| C20 | An interface makes a wrong connection impossible, not merely warned: keyed by dimension and unit, medium, mechanical pattern, handedness; conversion only in a visible node | the interface key test | **unenforced**: spec 01, task I19 |
| C21 | Every claim carries its status: measured, calibrated (against what, valid for what), typical, derived, inspired only, disputed, myth; estimates keep their spread and their makers | the claim-status check | **unenforced**: spec 10, task T3 |
| C22 | Every method checks its validity when it runs and refuses past it; a static check never reports "safe" where dynamic checks were not run | the validity tests | **unenforced**: spec 09, task P4; spec 10, task T5 |
| C23 | A change to a connection, load path or use is re-checked before it is accepted (the Hyatt gate) | the change re-check | **unenforced**: spec 01, task I21 |
| C24 | Show what is measured, never what was commanded as if it were the state; never change what matters while a person cannot see it | UI tests | **unenforced**: spec 04, task P9 |
| C25 | A failed check stops the line: nothing downstream is called done while it is open | the andon test | **unenforced**: spec 00, task S10 |
| C26 | Folding preserves behaviour exactly: a folded block computes what its inside computes | the fold test on every saved block | **unenforced**: spec 09, task P3 |
| C27 | AI-written values sit beside sourced ones and never replace them; the AI never cites AI-written entries as evidence, and never invents a value (a price, a carbon factor, any figure): an estimate is labelled with its method (absorbs C30, decision 0010) | the provenance check | **unenforced**: spec 10, task T13; spec 12, task CC1 |
| C28 | Two readings of one quantity that disagree stop the line until reconciled | the reading-conflict check | **unenforced**: spec 10, task T14 |
| C29 | Where a sound checker exists (units, residuals, a solver, interference), it is the gate; a model rereading its own work, or a second model, is a judge beside it, never the gate | the certificate check | **unenforced**: spec 10, task T18 |
