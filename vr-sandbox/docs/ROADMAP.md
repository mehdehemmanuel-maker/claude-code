# Road map

Where Nexus is, what was done last, and what is next, in the order it is meant to be done. The plans each step comes from
keep their own detail (`NODE-ENGINE.md`, `PLACEMENT.md`, `LIFE.md`, `RECONSTRUCT.md`, `GAP-MAP.md`); what was done and
measured is logged in `REALITY.md`. This file is the one list of what comes next: change it when the order changes.

## Where it is (measured 2026-10-31)

- 605 blocks in the library (330 of them laws), 552 with their own tests; 23 of them folded pipelines; 63 starter boards;
  4,731 distinct pieces in the built-parts library.
- 180 source files. The gate (type check and the one test) passes, 24 of 24, in 44 to 49 s against its one-minute limit.
- Machines drawn whole: the Monte Carlo SS (as sold, and as in the user's picture), a Corolla, a Rancher ATV, a Cascadia
  day cab, a dirt bike, a forklift, a go-kart, a lawn tractor; their engines and gearboxes from their first parts.
- Every piece can be made an exact solid (OpenCascade, `brep.ts`) and written as STEP, STL, 3MF and glTF; stress can be
  checked by CalculiX where it is installed (`fea.ts`, Node only; installed in this container by apt, not in CI).

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

## The plan, in one (2026-10-30)

Every fix and every step in one order: what blocks the rest first, then what the user sees, then the CAD plan, then the
rest. Each is done only when its check passes, measured, and said.

Done so far: 1 (gate), 3 (engines; the mount rubber left as a choice), 4 (the gallery's five faults; not yet shown to a
blind judge), 5 (stage 27, partial: the drawn thing is not rebuilt), 6 (exact solids), 7 (export). In progress: 8. Waiting
on the user's keys and network: 2.

**A. Unblock**
1. **The gate under a minute** (50 to 63 s, its limit 60): measure which checks are slow; keep the fast in the gate, move
   slow boards to a longer run. Done when measured under 45 s.
2. **Image generation on** (fal.ai credit added by the user): run in a session that has the keys and the open network;
   draw, then run the Prompt trial. Done when pictures are drawn and judged and the wordings ranked.

**B. Fix what is wrong now**
3. **The engine the compiler rejected:** the coil housing over PBT's 140 °C by conduction from the exhaust (shield it,
   move it, or a material that stands it); the least factor of safety 0.93 at 6,500 rpm; the valves floating at 6,270 rpm
   (the valve spring). Done when the Engineering compiler board says RELEASE CANDIDATE or BLOCKED only on what is not built.
4. **The build gallery:** the Monte Carlo's lip and valance end plates stand off the body (lay them with Onto a surface);
   specks float by the ATV's bars and the dirt bike's lamp; the bolt's thread is smooth (cut it as geometry); the lawn
   tractor shows no deck; the car kit drew a random car for "rancher" and "cascadia" without a word (say so, or find
   the machine). Done when each is re-shot and a blind judge no longer names it.

**C. The compiler, completed**
5. **Stage 27, correction:** a failed requirement handed to Fit to a target with the inputs What matters says reach it;
   the record carried through again; an iteration limit, repeated-state detection, rollback; what cannot be fixed marked
   HUMAN_REVIEW_REQUIRED. Done when it fixes item 3's two load failures by itself. **Built 2026-10-31** (`compile.correct`,
   board Compiler correction): the valve float fixed by itself (6,942 → 8,030 rpm, release REJECTED → RELEASE
   CANDIDATE); a least factor of 1.3 sent to review, naming the valve spring's wire stress. Item 3's first failures were
   fixed by hand before this existed, so "by itself" was shown on the float that was left. Still partial: the drawn
   engine is not rebuilt with the corrected values.
6. **The CAD kernel (OpenCascade):** every part an exact solid (revolves, extrusions, swept pipes, lofts, thickened skins,
   true booleans, fillets, chamfers); the compiler's stage 10 and 12 checks become real. Done when the bolt, spring,
   valve, piston and block convert, are valid, and their volume times density matches our mass within 1 %, with what
   fails to convert counted. **Built 2026-10-31** (`brep.ts`, nodes Exact solids and Compile: exact solids): the bolt,
   spring, valve, piston and block each made exact, every solid valid, volume × density against our mass 0.00 % on
   each; the inline four 1,512 of 1,547 pieces (0 invalid, 0 off by more than 1 %; not made: 27 dense windings and bond
   wires the kernel will not sweep, 8 hollow parts), the Monte Carlo 5,623 of 5,762 (0 invalid; 27 off by more than 1 %,
   each our own formula's: 20 spokes' loft volume 1.7 %, 7 V6 block boxes whose bores overlap or lean; not made: 99
   hollow parts, 40 sweeps). Left: hollow parts (an inward offset), freeform skins thickened, fillets as features, the
   V6 boxes' mass by the kernel's volume.
7. **Export:** STEP with the assembly tree and names, STL, 3MF, glTF, a bill of materials. Done when the engine's STEP is
   read back with the same solids, count and volume. **Built 2026-10-31** (`export.files`, `filesOf` and `readStep` in
   `brep.ts`; board Export): the inline four written in 58 s as STEP AP242 (72.7 MB, each of its 1,512 solids named by
   its path, coloured), STL (85.3 MB), 3MF (19.1 MB), glTF (72.8 MB) and its BOM as CSV; the STEP read back by the
   kernel in 16 s: 1,512 solids, 21,043.605 cm³, the same as written. Left: the assembly as a STEP tree (names carry
   the path for now), a download button on the board (its files are Blobs on its output), and the 35 pieces not yet
   solids, which are not in the files (said).
8. **Independent verification:** interference by exact booleans against our checker; stress by CalculiX against our beam
   analysis and the textbook. Done when they agree, every disagreement listed. **In progress 2026-10-31** (nodes Stress three
   ways, Interference two ways): a 0.5 m steel post, its top's movement by the book 5.2083 mm, CalculiX 5.1763 (−0.6 %),
   our frame 5.0877 (−2.3 %); its stress by the book 125.0 MPa at its foot, our frame 125.7 (+0.6 %), CalculiX 60.94 at
   256 mm up against the book's 60.94 there. Interference on the inline four: 656 pairs, 501 agreed, 121 found only by
   the kernel (pieces wholly inside others, which a triangle test cannot see: the flywheel and its ring gear share
   10,800 mm³), 34 not judged (a piece not a solid). **Sorted 2026-10-31** (45 distinct pairs): (a) drawn solid where
   the real part is hollow, the inner part right and the outer never cut for it, about 80 % of the volume: the oil pump
   body round its rotor (24,300 mm³), the injector bodies round their coils (11,120), the barrel bored at the bore and
   not the liner's outside (9,080), valve guides and stem seals, valves in their ports, sensors round their piezo
   elements, flanges and leads, journals and pins inside shells drawn into them (510 and 343 a set); (b) real layout
   faults, small: the pistons into the bulkheads (324 each), the plugs' electrodes into the crowns, the cam tube and the
   coil housing, the catalyst and the tail pipe, the front pipe and its shield, the filter gasket and the crankcase wall,
   the crank nose and the oil pan's end, the ring gear and the crank sensor's pole, a liner and the knock boss; (c) the
   ribbed belt through its pulleys' rims and the starter pinion on its shaft (drawing approximations, 16 to 116). What
   it shows: the rules checker is blind to a piece inside another (a triangle test sees only surfaces crossing), which
   is why (a) and (b) were never found. Queued, item 8b: containment in the checker (a point of one inside the other,
   by ray parity, where no surface crosses), then (a) cut and (b) moved. Also left: the stress
   comparison on a drawn part (the rod) needs a mesher for its solid (gmsh, installed here). The Monte Carlo's
   cross-check was stopped: over 20 minutes; it waits until it is made fast (pairs judged in parallel, not 5,800 solids
   kept).
9. **A constraint solver:** mates as equations solved at once, degrees of freedom counted, under- and over-constrained
   said. Done when a 20-part gearbox solves, a four-bar linkage moves through its range, and the rules come back clean.
10. **Changes that follow geometry:** a resized hole finds its bolt, washer and nut and resizes them from their standard,
   re-checks, re-exports. Done when M8 to M10 in the gearbox does so and Difference lists each part touched.
11. **The compiler's missing stages:** tolerances and fits (15), fatigue and vibration (18), drawings (22), the
   multi-agent audit (25: blind judges by discipline, each shown only its own evidence), conflict resolution (26: by the
   deterministic engine, never a vote).

**D. The AI layer's loop**
12. **Imagine, judge, build:** draw many ideas; judge each blind for invention and whether it would work; a vision model
   marks the best one's features; Picture to model; the model drawn from the idea's camera and judged against it;
   corrected. With the judge calibrated on real photographs, wordings evolved, and an idea's mechanism queued in the
   research notes as unsourced.
13. **Web nodes (ZenRows):** fetch, search, and feed the research notes their sources.

**E. Tools for every category**
14. **Stand-in for slow blocks;** 15. **baseline guard** (any board's outputs recorded, Difference on every later run);
   16. **where it breaks** (the pass-to-fail boundary); 17. **how likely it fails** (from each input's ±);
   18. **Picture to model in parallel** (each trial a block run, for the pool and CMA-ES: 15 minutes now);
   19. **sound** (what a thing sounds like, from what it is).

**F. Carried over**
20. The Cascadia's engine bay, cab, grille and axle internals; any body from its segment table (`LIFE.md` 6c).

## Keeping it lean (audit 2026-10-30)

- Deleted: 14 exports nothing used (dead engineering formulas, a catalogue cache, a dimension table, `stopWorkers`) and
  the imports only they used. `OWNERS.md` named five test files merged long ago into the one test; it names the one now.
- Still to do: 413 exports are used only inside their own file (the `export` word is noise, the code is used);
  `REALITY.md` is a log (history, kept as such); `NODE-ENGINE.md` now says at its top that it is history and where the
  current owners are (it names files deleted on 2026-10-28); the gate is at 44 to 49 s of its minute.
- 2026-10-31: search finds a word whole in a name before a word it only starts ("STEP" before "stepper"), and knows a
  few words people search by that the library says another way (collision → interference, optimize → fit, fea →
  CalculiX); Biomedical & life had no node in it (the body and Gas emission and dispersion (renamed from a question, as the naming rule asks) now are, and the body's board is that field's quick board in the one test; Physics & science now has no starter board of its own, its nodes' own tests still run); every file the
  context docs name exists, or is said deleted.
