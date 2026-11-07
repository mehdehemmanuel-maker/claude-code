# 0017. A worker runs the code of the checkout that started it: the bundle named for its checkout

Date: 2026-11-02. State: accepted (by the builder: a technical choice, decision 0011; reversible).

## Context

The pool (`src/nexus/pool.ts`) runs trials and the built-parts walk in worker threads. Under Node a worker runs one
bundle of `trial-worker.ts`, kept at `node_modules/.cache/nexus-trial-worker.mjs` and made again only when a source file
of the checkout is newer than it. Two checkouts that share one `node_modules` (a worktree, or a copy of the repository
beside it with `node_modules` linked in) shared that one file: whichever made it last, the other's workers ran its code.
On 2026-11-02 the engine workflow's agents worked in copies with `node_modules` linked; one of them, editing the engine
builder in its copy, made the bundle again from its edits, and this checkout's workers then built that engine. The
built-parts check (every piece built is stored) failed on 235 pieces of the engine head, the whole engine and the
Corolla whenever the walk ran wide, and passed whenever it ran in one thread (fault D31). The same failure showed on the
commit before I16, which ruled out I16's code.

No task owns `pool.ts`'s bundling: the fault is in how the pool starts its workers, not in what any task builds.

## Options

1. Leave it: never link `node_modules` into a second checkout
2. Name the bundle for the checkout it is made from, so each checkout's workers run its own code

## Choice

The second: the bundle is `nexus-trial-worker-<a hash of the checkout's path>.mjs`. Each checkout makes and runs its own,
by the same rule as before (made again when any of its sources is newer). Agents, worktrees and copies may share
`node_modules` safely.

## The assumption it rests on

That a checkout's path tells checkouts apart. Two checkouts at one path at different times are one checkout, and the
newer-source rule still makes the bundle again when its sources change.

## When to test it again

When the pool's workers are started some other way (a bundle made at install, or sources run directly), the bundle and
this rule go with it.
