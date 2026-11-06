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
