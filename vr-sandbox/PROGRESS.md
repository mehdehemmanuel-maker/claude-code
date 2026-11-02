# Progress (rewritten each session, never appended; under 40 lines)

Task in hand: 01.I17, built (a bearing's seats, a dowel hole, a key's keyways, a pipe port and a panel cut-out, each a
row of data read by one general path); waiting on its verdict
Spec in hand: spec 01, interfaces (`plan/specs/01-interfaces/`)
Last commit the gate passed: c933d42 (2026-11-02)

## Next three (from the start queue in `plan/README.md`)

1. 01.I16: drag to imprint in the view, the negative shown before cutting
2. 01.I18: interface versions: a published interface never changed in place
3. 01.I15 again, once the user has answered on its check (below)

## Open, and why

- Verdicts in: 00.S1, S2, S3, S10, 10.T3, 01.I1, 01.I3 to I14, and 04.P10 pass (S10 on its thirteenth judging).
- 01.I15 failed its first judging: its check asks the set before I5's code, and the history shows most cases committed with
  their code. All twelve cases are there, checked against their sources, and run in the gate.
- 01.I17 built and gated (`npm run gate`), not yet judged. Faults found building it, open in plan/DEFECTS.md: the worst,
  D24, the checker blind to a bar run through a round shaft (under 10.T24; it should come before I16).
- Fault D16 open: the board's view of what it makes, as a blind reader saw it (a dark part on the dark view, the ground grid not on every board).
- 10.T23 and 10.T18 claimed in part: the kernel's first three kinds (every false certificate three red teams found refused, every check ending in time),
  and the AI's board taken only when it checks. 01.I1 claimed; 01.I2 in part (frames where the drawing tells them; every starter board's things not yet swept).
- 10.T24 claimed in part: nothing excused by name; fault D14 open (the small caliper mended; the Cascadia's frame not).
- 11.LW12 and 10.T1 are claimed in part; their open parts are in `plan/DEFECTS.md` (D7) and the task rows.
- The one test (`npm run eval:one`) passes 2 of its 18 lines; the rest wait on specs 01, 03, 04 and 06.

## Waiting on the user

- 01.I15's check says the set existed before I5 was built; the history shows the opposite for most cases. Reword the check
  to what can be shown (the cases not yet built go in before their code), or accept the order as it was?
- The pipe port case gains a check beyond the standard, derived (`npm run gate` runs it): the tap drill's point inside
  the block too, so a block deep enough for the standard's drill depth but not for the point is refused. Keep it?
- Hosting is proposed (decision 0011), to confirm at phase 3.

## Pipeline notes (the loop breaker reads these: a line "pipeline: <task>: <answer>" resets its count)
pipeline: 04.P10: yes, a pipeline was missing: each review found another class of headset target unmeasured (the bar, then the strip and side panel, then the board's own dots and wires); the fix is one list of every target a hand presses, measured whole, not another class by hand
