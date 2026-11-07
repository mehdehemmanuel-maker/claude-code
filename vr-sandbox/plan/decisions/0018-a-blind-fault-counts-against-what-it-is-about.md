# 0018. A fault blind readers name counts against what it is about: the view's against the view

Date: 2026-11-02. State: accepted (by the builder: a technical choice, decision 0011; reversible). The evaluator of I16
asked for it to be either mended or decided in a record ("either fix what readers still name or change the pass rule on
purpose, in a decision", `plan/specs/00-structure/verdicts/01.I16.json`).

## Context

I16's blind check fails a shot when two of its three readers name any of fault D16's five faults (too dark, the grid
missing or over the parts, the count of pieces unexplained, faceted where it should be round, lines over the labels).
Over four runs of three readers a shot (fresh agents told nothing, the shots renamed to plain letters), what the view
drew wrong was named, and mended: a count no reader could square, black screws drawn as black mirrors, steel washed
to white, no ground under a whole board, a disabled button that did not say so, rounds that still showed facets
framed close. What is still named on most shots is not how the view draws:

- a black-oxide socket screw is near black (ISO 4762 screws are sold black-oxided; the component library gives it
  0x2a2b2e, `src/nexus/components.ts` looks()): "the screw head is tiny and nearly black";
- a hex bolt's head has six flats: "the bolts look faceted";
- the paste board stands each thing on y = 0, so its plate sits above the floor of the grid (fault D30, the board's
  layout): "the plate floats";
- the node board's faded blocks (those that feed nothing) let wires show through them: the board's own cue;
- the app's dark theme as such: "the whole scene is dark".

Counting these against the view would have the view draw a black screw grey or a hex head round to pass: the drift the
anchor file forbids (a real product's own data held fixed, never tuned away to please a checker).

## Options

1. Keep the rule as written: the view fails while readers name the parts as they are
2. The grader says what each named fault is about (the view's drawing, the part as it is, the board's layout, or
   unsure); a fault counts against the view when it is about the view's drawing or unsure; the others are kept word for
   word and filed against their owner

## Choice

The second. The grader classes every named fault and quotes it; `unsure` counts against the view, so a doubt never passes
a shot. A fault about the part as it is or the board's layout is kept in the run's record and filed (fault D30 for the
board's layout; a part's look is its maker's data, checked against its source before anything changes). The facts a
shot must have named are unchanged: two of three readers name every one.

## The assumption it rests on

That a grader told the part's real look (its colour and shape from its standard) and the board's layout can tell those
apart from how the view draws them. Where it cannot, it says unsure, and the fault counts.

## When to test it again

When a reader names a fault the grader classes as the part's or the board's, and a person looking at the shot agrees it
is the view's: then the class was wrong, and the rule is read again.
