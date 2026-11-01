# Progress (rewritten each session, never appended; under 40 lines)

Task in hand: 00.S10
Spec in hand: spec 00, the structure (`plan/specs/00-structure/`)
Last commit the gate passed: 936ce93 (2026-11-01)

## Next three (from the start queue in `plan/README.md`)

1. 10.T18: propose, then certify: every AI change returns its diff and a certificate a small checker verifies
2. 10.T23: the kernel that checks certificates (`src/kernel/`, exact rationals and intervals)
3. 01.I1: the interface record and who owns it (then I2, I3: its sourced tables)

## Open, and why

- Verdicts in: 00.S1, 00.S2 and 00.S3 pass. 00.S10 and 10.T3 failed a second time (failures past the record's cut;
  figures as pairs), each mended since, to be judged again; 04.P10 (third try) is being judged.
- 10.T23 (the kernel) is begun beside the queue's work: exact fractions, intervals, dims and witness, not yet committed.
- 11.LW12 and 10.T1 are claimed in part; their open parts are in `plan/DEFECTS.md` (D7) and the task rows.
- The one test (`npm run eval:one`) passes 2 of its 18 lines; the rest wait on specs 01, 03, 04 and 06.

## Waiting on the user

- Nothing blocks the queue. Hosting is proposed (decision 0011), to confirm at phase 3.

## Pipeline notes (the loop breaker reads these: a line "pipeline: <task>: <answer>" resets its count)
