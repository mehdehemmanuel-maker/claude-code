# 0021. Nothing checks for overlap: the checker goes now, and where a place is still written by hand is counted

Date: 2026-11-02. State: accepted (by the user, asked: "Gone now (Recommended)").

## Context

The user asked why a solenoid could sit inside a motor, and then: "No nothing should be checked for overlap it shouldn't
be possible". Overlap was found after the fact by a checker (`make/rules.ts`: interference and clearance on the drawn
triangles, the same through a motion, its excuses), its nodes (`check.rules`, `check.turning`, `clash`,
`verify.interference`), the view's `clash` and "hidden inside" rule, the nudge repair, the compiler's and the gauntlet's
stage, and `npm run check`. It was also slow: on the engine board (one run in vitest, 2026-11-02) the whole board took
56.5 s, of which `check.rules` took 27.6 s and `check.turning` 24.0 s; in the app the page did not answer for about 78 s.

The operations that cannot write an overlap (a place handed out by stacking, around, through and into, never a
coordinate) are designed (the space spec, not yet in the plan) and not built. Until they are, the builders still write
places by hand, and nothing finds an overlap they write.

## Options

1. Keep the checker while the builders move, only as a list of where hand-written places still overlap
2. Take the checker out now; count, builder by builder, the places still written by hand, and let no count rise

## Choice

The second, as the user chose it. Nothing checks for overlap: the interference and clearance rules, the check through a
motion, the overlap nodes, the view's clash and hidden-inside rule, the nudge repair, the compiler's and the gauntlet's
overlap stage and `npm run check` are deleted; the heat rule stays (it is about heat, not overlap: `check.rules` is now
the heat exposure check). `scripts/by-hand.mjs` counts, in each file under `src/nexus` (the views not counted), the `at` and
`rot` properties written in object literals, read from the syntax tree; `scripts/by-hand.json` holds the counts, and the
one test fails when any rises. The first count, 2026-11-02: 1,203 in 46 files, `src/nexus/engines.ts` the most (222).

Task 10.T24 (interference as a gate) is superseded. The faults about the checker itself (D15, D26, and the clash rules'
part of D29) are closed with it. The faults about overlaps drawn into builds (D14, D25) stay open, unmeasured: their
last counts are the ones written in `plan/DEFECTS.md`, and they go when those builders are placed by the operations.

## The assumption it rests on

That an overlap a builder writes by hand costs less while unseen than a checker that costs 52 s of the engine board's
56.5 s and invites tuning a build to pass it; and that the builders move onto the operations, so the count falls.

## When to test it again

When the count has not fallen for a month of work, or when a build a person looks at shows a piece through another:
then the move onto the operations is stalled, and that, not a checker, is the work.
