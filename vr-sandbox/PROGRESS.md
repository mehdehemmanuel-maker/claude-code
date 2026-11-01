# Progress (rewritten each session, never appended; under 40 lines)

Task in hand: 01.I2
Spec in hand: spec 01, interfaces (`plan/specs/01-interfaces/`)
Last commit the gate passed: e148190 (2026-11-01)

## Next three (from the start queue in `plan/README.md`)

1. 04.P10: its fourth verdict (blocks only on the board, wires from the side panel), and mend it if it fails
2. 10.T3: its fourth verdict, and mend it if it fails
3. 10.T24: interference as a gate (faults D8, D9): a fastener excused only where its interface says it sits

## Open, and why

- Verdicts in: 00.S1, 00.S2 and 00.S3 pass; 00.S10 and 10.T3 failed a third time, mended, being judged again; 04.P10
  failed a third time, mended as one list of every target (blocks only on the board, wires from the side panel).
- 10.T23 and 10.T18 claimed in part: the kernel's first three kinds, and the AI's board taken only when it checks.
- 11.LW12 and 10.T1 are claimed in part; their open parts are in `plan/DEFECTS.md` (D7) and the task rows.
- The one test (`npm run eval:one`) passes 2 of its 18 lines; the rest wait on specs 01, 03, 04 and 06.

## Waiting on the user

- Nothing blocks the queue. Hosting is proposed (decision 0011), to confirm at phase 3.

## Pipeline notes (the loop breaker reads these: a line "pipeline: <task>: <answer>" resets its count)
pipeline: 04.P10: yes, a pipeline was missing: each review found another class of headset target unmeasured (the bar, then the strip and side panel, then the board's own dots and wires); the fix is one list of every target a hand presses, measured whole, not another class by hand
