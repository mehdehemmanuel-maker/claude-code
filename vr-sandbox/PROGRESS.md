# Progress (rewritten each session, never appended; under 40 lines)

Task in hand: 06.M2 (decision 0028: parts remembered, an orchestrator, more assemblies and movement; decision 0027: the app on claude.ai with reports, movement in general, compound builds, a thousand parts; decision 0026 before it); the phone page (decisions 0023, 0025, `npm run app`)
Spec in hand: spec 06, the phone (`plan/specs/06-phone/`); spec 01, interfaces (`plan/specs/01-interfaces/`)
Last commit the gate passed: 8d0ee3c (2026-11-06)

## Next three (from the start queue in `plan/README.md`)

1. 01.I18: interface versions: a published interface never changed in place
2. 01.I15 again, once the user has answered on its check (below)
3. 01.I19: keys that make a wrong connection impossible (C20)

## Open, and why

- Verdicts in: 00.S1, S2, S3, S10, 10.T3, 01.I1, 01.I3 to I14, 01.I17, and 04.P10 pass (S10 on its thirteenth judging).
- 01.I15 failed its first judging: its check asks the set before I5's code, and the history shows most cases committed with
  their code. All twelve cases are there, checked against their sources, and run in the gate.
- 01.I17 passes (`plan/specs/00-structure/verdicts/01.I17.json`); the gaps its evaluator found by planting are closed in
  its tests. The overlaps drawn into builds (faults D14, D25) are unmeasured since decision 0021 took the checker out;
  they go as builders move onto the operations that cannot write one (designed, not built).
- 01.I16 failed its judging (`plan/specs/00-structure/verdicts/01.I16.json`): its mechanics held; its blind check had not run
  to its end. Mended since; five blind runs (decision 0018); it fails still on its blind clause (`docs/REALITY.md`).
- 10.T23 and 10.T18 claimed in part: the kernel's first three kinds (every false certificate three red teams found refused, every check ending in time),
  and the AI's board taken only when it checks. 01.I1 claimed; 01.I2 in part (frames where the drawing tells them; every starter board's things not yet swept).
- Decision 0028 run rough: compound 22 of 25 (`npm run eval:compose`), 8 of 25 more (`EVAL_SET=more`), Assist 23 of 40 (`npm run eval:builds`); a second run reuses remembered parts (`EVAL_REPEAT=2`: 140 calls, then 107); what still fails in `docs/REALITY.md`.
- 10.T24 superseded by decision 0021 ("Gone now"). 11.LW12 and 10.T1 are claimed in part; their open parts are in `plan/DEFECTS.md` (D7) and the task rows.
- The one test (`npm run eval:one`) passes 2 of its 18 lines; the rest wait on specs 01, 03, 04 and 06.

## Waiting on the user

- 01.I15's check says the set existed before I5 was built; the history shows the opposite for most cases. Reword the check
  to what can be shown (the cases not yet built go in before their code), or accept the order as it was?
- The pipe port case gains a check beyond the standard, derived (`npm run gate` runs it): the tap drill's point inside
  the block too, so a block deep enough for the standard's drill depth but not for the point is refused. Keep it?
- Hosting is proposed (decision 0011), to confirm at phase 3. The Pages copy (main only, after Settings → Pages) has no relay, so no Claude.

## Pipeline notes (the loop breaker reads these: a line "pipeline: <task>: <answer>" resets its count)
pipeline: 06.M2: yes: three runs failed on bookkeeping again (the plan's page not routing to two new files, the gated-commit distance after a fold), the code passing each time; the merge script now routes new plan files and folds first, and while working the gate runs on the fields touched only, the whole gate once at push (CLAUDE.md, Speed)
