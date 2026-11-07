# 0016. Drag to imprint reaches the files its preview comes from: I16's owners widened

Date: 2026-11-02. State: accepted (by the builder: a technical choice, decision 0011; reversible).

## Context

I16 (spec 01: drag a bolt onto a face in the 3D view, its negative drawn before anything is cut, its verdict, accept or
cancel; copy and paste a face's interface) was written with three owners: `view/dock3d.ts`, `view/space.ts` and
`view/pad.ts`. Built from those alone, the view would have to make its own negative, its own checks and its own cut: a
second imprint beside the node's, free to disagree with what the board then cuts. The preview has to be the node's own
run, and the drop has to be found by what is drawn. Neither can be done from the three files:

- The 3D view's hit (`view/space3d.ts`) gives a piece's name and box, not the leaf drawn nor its matrix, so the host and
  the point on it cannot be found from what is under the pointer.
- The imprint node (`blocks.ts`) gives its checks without their sources and, on a refusal, none at all; it does not give
  the bodies it would cut, keep and seat on, so a preview could not draw them.
- `mate.ts`'s refusal throws away the negative and the checks it ran, and the bodies are worked out inside
  `applyImprint` only.
- The board (`view/nodes.ts`) has no one-step change that a paste can be made as (one undo step), and no way for the view
  to read a node's outputs.
- The views' drill (`view/kit3d.ts`) holds the cut solid inside `drill`, and draws a cylinder with 24 facets whatever
  its size (fault D16: an 80 mm boss sags 0.684 mm at its facets).
- The dashboard (`view/dashboard.ts`) is where the dock and the board meet, and its pieces line says more than it counts.

## Options

1. Keep to the three files: the view builds its own negative and checks (a second imprint)
2. Widen I16's owners to the files the node's own run and the drop are read from, each for a named reason

## Choice

The second. I16's owners become `view/dock3d.ts, view/space.ts, view/pad.ts, view/space3d.ts, view/kit3d.ts,
view/nodes.ts, view/dashboard.ts, mate.ts, blocks.ts, built.ts`, each for this reason only:

- `mate.ts`: a refusal keeps its negative and the checks it ran (`tried`), and the bodies come from one function
  (`bodiesOf`), which `applyImprint` calls too.
- `blocks.ts` and `built.ts`: the imprint node gives what it imprinted (an `imprinted` record, its checks with their
  sources); its date written by the docs.
- `view/space3d.ts`: the leaf hit and its matrix.
- `view/kit3d.ts`: D16's facets, and the cut solid shared with `drill`.
- `view/nodes.ts`: a node's outputs read, and one change as one undo step.
- `view/dashboard.ts`: the wiring of the paste session, and the pieces line said honestly.

Design §2.9 is amended with it: release pins the card and accept cuts (R17: cut only when the person accepts); the drag
comes from the view's strip (the bolts the board makes, or a copied interface); the drag from the library is a follow-up.

## The assumption it rests on

That one path makes every cut: the view never imprints anything itself, it runs the board's own node on the point found
and draws only what that run gives. A preview that disagrees with the cut is then a fault the test sees (the node's
checks after accept compared with the card's), never two answers.

## When to test it again

When the paste moves to the immersive space (`view/space.ts`) or the headset: it constructs the same session with its own
world group, and needs no file beyond these. If it does, this record is read again.
