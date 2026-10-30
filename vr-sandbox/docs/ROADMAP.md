# Road map

Where Nexus is, what was done last, and what is next, in the order it is meant to be done. The plans each step comes from
keep their own detail (`NODE-ENGINE.md`, `PLACEMENT.md`, `LIFE.md`, `RECONSTRUCT.md`, `GAP-MAP.md`); what was done and
measured is logged in `REALITY.md`. This file is the one list of what comes next: change it when the order changes.

## Where it is (measured 2026-10-30)

- 591 blocks in the library (330 of them laws), 547 with their own tests; 23 of them folded pipelines; 58 starter boards;
  4,703 distinct pieces in the built-parts library.
- 176 source files. The gate (type check and the one test) passes, 21 of 21, in 49 to 52 s against its one-minute limit.
- Machines drawn whole: the Monte Carlo SS (as sold, and as in the user's picture), a Corolla, a Rancher ATV, a Cascadia
  day cab, a dirt bike, a forklift, a go-kart, a lawn tractor; their engines and gearboxes from their first parts.

## Done this stretch (2026-10-30), each a tool for every category

| Tool | Node | Measured |
| --- | --- | --- |
| Fit any settings to any target | `fit.target` | a bar's area for 2 MPa in 30 runs; an engine's bore for a 7,000 rpm float |
| One level of detail; only what can be seen drawn | `lod.ts`, culling | a build 2.7 → 1.9 s at 0.3; silhouette 7.0 → 1.7 s, same outline |
| Any outline onto any surface | `onto.surface` | a hood vent of 40 tiles within 0.5 mm |
| Variants of anything, none twice | `variants` | 12 windows, 12 distinct, 31 ms |
| Remembered by content everywhere | `SHARED`, `remembered` | a second board's car 815 → 1 ms |
| What matters (sensitivity) | `what.matters` | found the engine's stroke moves neither limit, and why |
| Trade-offs (Pareto front) | `trade.offs` | springs light against stiff: 26 best of 210 |
| Choices inside fits | `fit.target`, `trade.offs`, `what.matters` | best of five ASTM spring wires and 3 to 8 coils |
| Run many at once | `pool.ts` | 42.9 → 21.7 s on 4 cores, the same answer |
| Difference between any two | `diff` | the stock and custom Monte Carlo: 288 places changed |
| Fit in parallel (CMA-ES) | `fit.target` | 59.6 → 31.3 s, and it met a limit Nelder–Mead missed |

Bugs these tools found and fixed: a wire into an input a block lacks carried nothing without a word (now refused); folded
blocks lost their inputs' defaults inside fits; a chart drew its x as its y; every spring wire had one stiffness; coils
drew as octagons.

## Next, in order

1. **Fix what the build screenshots show** (2026-10-30 gallery). The Monte Carlo's lip and valance end pieces stand off
   the body as plates (lay them with `onto.surface`); specks float by the ATV's bars and the dirt bike's lamp; the bolt's
   thread is smooth (cut it as geometry); the lawn tractor shows no deck; the car kit drew a random car for "rancher"
   and "cascadia" without saying it did not know them (it must say so, or find the machine).
2. **Web access for nodes (ZenRows), once the user adds the key.** The key goes in the environment's secrets (never the
   repo, never the page). The pages are static, with no server to hold a key, so a web node runs where the key is:
   under Node (Claude's research runs, scripts, the tests); a page could reach it only through a small server holding the
   key, a decision for the user. First nodes: fetch a page as text, search, and feed `research.notes` its sources.
3. **Stand-in for slow blocks:** learn a cheap model of a block from its trials, fit and trade off on it, check the
   answer on the real block.
4. **Baseline guard:** record any board's outputs; on any later run, `diff` against them and say what changed.
5. **Where it breaks:** the boundary in a block's inputs where a check flips from pass to fail.
6. **How likely it fails:** from each input's ± (`spreadOf` already carries ±), the chance an output crosses its limit.
7. **Picture to model in parallel:** its fits score trials inside one node; make each trial a block run so the pool and
   CMA-ES can take it (it is 15 minutes now).
8. **Sound (Fish Audio or another, once the user adds a key):** what a thing sounds like, read from what it is (an
   engine's firing frequency, a motor's whine), the "what does it sound like?" the round checklist asks.
9. **Carried over:** the Cascadia's engine bay, cab, grille and axle internals; any body from its segment table
   (`LIFE.md` step 6c).

## Keeping it lean (audit 2026-10-30)

- Deleted: 14 exports nothing used (dead engineering formulas, a catalogue cache, a dimension table, `stopWorkers`) and
  the imports only they used. `OWNERS.md` named five test files merged long ago into the one test; it names the one now.
- Still to do: 413 exports are used only inside their own file (the `export` word is noise, the code is used);
  `REALITY.md` is a 131 kB log and `NODE-ENGINE.md` names 12 files deleted on 2026-10-28 (both are history, kept as such);
  the gate is near its minute.
