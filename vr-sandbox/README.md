# Nexus

A node system for making real things: parts made to their standards and built from their first parts, machines from
their makers' published figures, rooms, houses and cities from seeds, chips from their transistors, bodies from their
measured segments. Every node is a calculator with typed ports, units, tests and sources; any board of them can be
folded into one node and kept in the library. For one person, on a computer, a phone and an Oculus.

Read `CLAUDE.md` first: what is wanted in the user's own words, which module owns which concern, the checks every round
must pass, and where to read for anything else. The plan and its state: `plan/INDEX.md`.

## The app

- `view/index.html`: the dashboard: the board of nodes, its library, the docked 3D view, the clock.
- `view/space.html`: the space in x, y, z, scale and time, on a screen or in a headset.
- `view/look.html`: one made thing on its own, framed, for review (driven headless by `tools/bench.mjs`).
- `view/gauntlet.html`: what a node or an entry must come through to be approved.

Build: `npx vite build --config vite.view.config.ts --logLevel error` (into `dist-view/`). Run with the AI: `npm run app`.

## The gate

`npm run gate`: the type check and the one test, `tests/nexus/domains.test.ts`, which includes the reach check (every
source file reached from the app).
