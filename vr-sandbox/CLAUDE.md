# Nexus (vr-sandbox)

A node-based CAD and engineering app: say what to build, or build by hand, from real parts.

## Rules (the user's, 2026-11-10)
- Build features; the user tests the app by hand. No automated tests, no test files, no audits, no plan documents.
- That covers every kind of run, not only test files (the user, 2026-11-12: "don't run any tests without asking"): no pipeline runs with real AI calls, no physics checks, no scripted browser runs or screenshots, unless the user says yes first. Ask, and in the ask state: how long it takes, what it costs (AI calls, tokens, money), what it runs, and what it would show (the user, 2026-11-12: "when requesting state the amount of time and cost and whatever"). Then wait. Type check and build are allowed.
- Read only the code the task touches. No whole-codebase reads, no repeated investigations, no long reports.
- Do not spawn fleets of agents. Small, complete deliverables; say what changed, what is unfinished, what to test.
- Never put API keys in the repo or in client code. Port 5173 is the user's.
- No invented numbers: a value is sourced, derived, or labelled typical.
- Do not delete working features or user data without asking.

## Run
- Type check: `npx tsc --noEmit -p .`
- Build the app: `npx vite build --config vite.view.config.ts --logLevel error` (output in ../dist-view or `--outDir`).
- The site deploys from `main` by `.github/workflows/vr-sandbox-pages.yml` (GitHub Pages).

## Where things are
- `src/nexus/room.ts`: solids and the operations that join them. `docs/` has the longer notes; `docs/WANTED.md` is the user's words.
- `src/nexus/blocks.ts`, `dataflow.ts`: nodes and the board engine. `src/nexus/parts/`: part families. `src/nexus/assemblies/`: ready-made assemblies.
- `src/nexus/agent.ts`, `lookat.ts`, `stages.ts`, `aitools.ts`: the AI that builds.
- `src/nexus/view/`: the pages (`dashboard.ts` desktop, `vibe.ts` phone and chat). `view/*.html`: their markup and styles.
