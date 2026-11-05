# 0026. A library the AI can build a lot from

Date: 2026-11-05. State: accepted (the user, 2026-11-05: "Okay populate the library and make it so the ai can easily
build a lot of things but first research and report to me a plan before starting", then, on the plan: "clarify the plan
and put it into the most logical order also no polishing just go through and speed run it and don't worry to hard on
mistakes then bootstrap at the end"). The four open questions were taken on the recommendations put to the user.

## Context

Research (six agents, 2026-11-05; their reports are summed up in `docs/REALITY.md`): the library has 620 blocks, but
only the 42 pieces, 9 room operations and 3 joints build things in 3D. Tables for about 300 more kinds of part sit in
`families.ts` and `kinds/` with no maker. Nothing is an assembly: the small motor is a helper copied into four boards.
The AI's plans are not checked before they run: a `thing` wired where a `block` goes fails only at run time, and a node
left waiting is reported as nothing failed. `room.make` offers four shapes. There is no sphere, cone or turned profile,
and holes run only along y. Ring copies are not turned, and bends and case cuts are drawn wrong. Every card is sent with
every call. Outside: typed parts with named ports, a worked example retrieved per request, and a check on every step
with a roll back do most of the work (BrickGPT, ComfyBench; sources in the report).

## Options

1. Write each new part by hand in `common.ts`, as so far
2. Turn the old part libraries' parts into blocks of the space (refused: the space takes nothing placed by number)
3. Tables of sizes read by one maker per kind of part, on new solids, with plans checked before they run and
   assemblies kept as blocks

## Choice

The third.

Steps in the order they depend on each other, each run rough by agents in their own worktrees, merged and gated:

1. **Foundations.** These run side by side:
   - The space's new solids and holes: sphere, cone, turned profile, holes on any face, lines along a section, ring
     copies turned, and the drawing fixed for bends and cuts. `room.make` offers every solid.
   - Plans checked before they run, with refusals that say the fix (a `block` port type).
   - One table per family, sourced per row. The four MIT files from BOLTS may be copied with their notices, and so may
     the Apache files of bd_warehouse and the BSD files of BOSL2. Copyleft files are cross-checks only. A table-driven
     maker turns a row into a piece.
2. **The library filled** from those tables, one agent per field: fasteners, motion, electronics, plumbing, building,
   hardware. Each size is checked against its row's mass and size. A part drawn as its envelope says so.
3. **Assemblies as blocks** with settings (the motor first). Search returns only what builds, with its ports, and
   worked boards. Only the core cards stay cached. The old makers and the boards built with old blocks are deleted as
   they are replaced.
4. **Bootstrap.** A set of build requests is scored without a model, and the AI builds them. What it builds that repeats
   is folded into the library; where it fails, the library or the checks are mended.

Decisions taken on the recommendations:

- copy the permissive tables with their notices, cross-check the copyleft ones;
- delete the old makers and boards as each is replaced;
- a distance along a line, from a named end, may be a setting (never an x, y or z);
- a size is stored when a board or the AI builds it, not every size of every family.

No polish pass (the user): faults met on the way are written down, not chased.

## The assumption it rests on

That most parts are a few solids joined the same way for every size, so a table and one recipe give every size; and
that a plan checked as it is made, plus a worked board to start from, is what lets the AI build many things cheaply.

## When to test it again

When a family needs a recipe of its own for most of its sizes, or when the bootstrap's requests fail more on the
library than on the plans.

## Consequences

The library grows by tables, not by code per size. The AI's prefix is meant to stay flat as it grows. What is cut for
time is listed in `docs/REALITY.md`.
