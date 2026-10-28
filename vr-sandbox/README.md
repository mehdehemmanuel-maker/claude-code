# Nexus

A node system for making real things: parts made to their standards and built from their first parts, machines from
their makers' published figures, rooms, houses and cities from seeds, engines run crank degree by crank degree, chips
from their transistors, bodies from their measured segments. Every node is a calculator with typed ports, units, tests
and sources; any board of them can be folded into one node and kept in the library.

Read `CLAUDE.md` before working here: it holds what is wanted in the user's own words, which module owns which
concern, and the checks every round must pass.

## The app

- `view/index.html`: the dashboard, the front door: the board of nodes, its library, the docked 3D view, the clock.
- `view/space.html`: the space in x, y, z, scale and time, on a screen or in a headset.
- `view/look.html`: one made thing on its own, framed, for review (driven headless by `tools/bench.mjs`).
- `view/gauntlet.html`: the gauntlet: what a node or an entry must come through to be approved.

Build the pages with `npx vite build --config vite.view.config.ts --logLevel error` (into `dist-view/`).

## The code

- `src/nexus/blocks.ts`: every node, on its shelf by stage; `docs/NODES.md` is that catalogue written out.
- `src/nexus/dataflow.ts`: a board of nodes run, only what changed run again.
- `src/nexus/starters.ts`: the starter boards.
- the rest of `src/nexus`, `src/data`, `src/engineering`, `src/ganglia`: what the nodes are made of, each owner in the
  table in `CLAUDE.md`.

Only the node setup is current: every source file must be reached from the app (`tests/nexus/reach.test.ts`).
Everything from before the nodes was deleted on 2026-10-28; commit `e70944a` holds the last of it.

## The gate

`npm run gate` (type check and every test). `npm run breakdown -- report.md` runs the breakdown queue.

## The docs

`docs/NODE-ENGINE.md` (the node engine), `docs/NODES.md` (every node), `docs/PLACEMENT.md` (placing, routing, sizing),
`docs/LIFE.md` (awareness, acting, logic, power), `docs/GAP-MAP.md` (detail against a reference).
