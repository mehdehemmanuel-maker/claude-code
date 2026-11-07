# 0004. A new owner, `src/nexus/interfaces.ts`, for interfaces and their negatives

Date: 2026-10-31. State: accepted (proposed to the user with the plan).

## Context

Spec 01 needs one home for the interface record, the negative of each kind, and the standards' tables negatives read. `mate.ts` owns mating (fit, mate, assemble, onto, boreThrough) and is already large; `kits.ts` owns the part's types.

## Options

1. Put everything in `mate.ts`
2. A new owner for the interface model and its tables; `mate.ts` keeps placing and mating; `kits.ts` keeps the types

## Choice

The second: `interfaces.ts` owns what an interface is and what its negative is (data and derivation); `mate.ts` owns putting things together (imprint, fasteners, joints through `placement/proximity.ts`). A row in CLAUDE.md and OWNERS.md when it is made.

## The assumption it rests on

That "what a part demands of its neighbours" is a concern of its own, apart from "how two parts are placed".

## When to test it again

If `interfaces.ts` and `mate.ts` keep calling into each other both ways, merge them.
