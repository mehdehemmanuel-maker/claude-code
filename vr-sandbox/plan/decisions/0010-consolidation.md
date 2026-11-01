# 0010. The plan consolidated before building starts

Date: 2026-11-01. State: accepted (the user: "find the best questions, get rid of all the others, also compile and
optimize everything before we start").

## Context

Six research rounds left overlapping tasks, a rule said twice, a book of 2,244 questions and a superseded proposal doc.

## Options

1. Keep everything gathered (2,244 questions, every task as written) and start building
2. Cut to what changes what is built, merge what overlaps, write a start queue, then start (the user's words)

## Choice

The second:

- **Tasks merged** (the survivor carries both checks): 10 T4 and T16 into T11 (quantity kinds); 11 LW1 into LW13 (lazy
  pull); 11 LW14 into LW2 (the run record is the replay log); 09 P7 into P2 (the equation compiler's own passes); 04 P8
  into P10 (headset comfort). References to the merged ids now point at the survivors.
- **Moved** to spec 01 from spec 09 (they are interface work): bodies and human fit (I25), patterns (I26), disassembly
  and repair (I27).
- **Rule merged**: C30 (the AI never invents a price) into C27 (AI-written values never replace sourced ones).
- **The book of questions** cut to the best: a question is kept only if its answer changes what is built, it can be
  answered (a measurement, a source, a test, a decision), the plan does not already settle it, and it is the best of
  its near-duplicates; at most 30 from each slice of about 350, chosen by six judges with that rubric. The rest are
  removed (they remain in git history, commit before this one). Kept questions are grouped by the spec they bear on.
- **A start queue** in `README.md`, checked by `compile.py` for order.
- `docs/UPGRADES.md` deleted (superseded by `plan/`; in git history).

## The assumption it rests on

That the questions removed would not change what is built.

## When to test it again

When a phase starts: skim its research files' (A) findings for anything a kept question does not cover.
