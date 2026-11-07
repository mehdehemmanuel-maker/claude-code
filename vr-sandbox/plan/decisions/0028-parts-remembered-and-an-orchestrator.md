# 0028. Parts remembered, and an orchestrator that builds from them

Date: 2026-11-06. State: accepted (the user, 2026-11-06: "Okay so advance it make it so it can orchestrate and save for
later use each part or whatever and much more").

## Context

`composeBuild` (decision 0027) splits a request into parts, takes each from an assembly, a starter board or one plan,
joins and checks them. It built 13 of 25 compound requests right. A part built by a plan is lost when the build ends,
so the next request builds it again from nothing. The failures were things with no assembly (a boat, a wind turbine, a
bicycle, legs), parts left side by side, and a part with nothing to start from skipped.

## Options

1. More assemblies written by hand only
2. Every part built kept as a library block and recalled by the next build, the orchestrator made deeper (parts of
   parts, parts built side by side, loose parts joined, a final check against the request), and more assemblies besides
3. A bigger single plan with more rounds

## Choice

The second. `nexus/memory.ts` keeps each part built (checked: nothing failing, one group) as a block with the request it
was made for; the next split is offered the parts remembered before it builds anything. On claude.ai the parts are also
kept in the page's shared store, so they last across devices and reach the session.

## The assumption it rests on

A part checked to run with nothing failing and to be one thing is worth placing again as it is. Bad parts are a risk: a
part kept says what it was made for and what was checked, and the person can delete it.

## When to test it again

When `npm run eval:compose` is run twice in a row: the second run should use the first run's parts (its uses counted) and
need fewer calls.

## Consequences

- The library grows with use; a part the person likes can be folded into the repository as an assembly of its own.
- A wrong part, once kept, is recalled until it is deleted: the parts browser shows them on an aisle of their own.
- A repeat of the same request counts the whole already kept as used instead of keeping a second copy.
- A change from the loose-join call is taken only where it leaves less loose and fails no more lines; pieces loose
  inside a folded part are named but cannot be reached by it (a plan's own loose groups are mended once in its part).
- The shared store on claude.ai has its own collection of parts (`parts`, one document a part), apart from `reports`.
- Built with it (the same round, by six agents in their own worktrees, merged): motion 2 (slides, rack and pinion,
  belts, motors that hold, poses), 23 more assemblies (`assemblies/things.ts`, `assemblies/everyday.ts`), and the
  evaluations read a kind by what a part is (its aisle and name), with 25 more compound requests and a second run.
