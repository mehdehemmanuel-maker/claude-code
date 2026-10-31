# The engineering compiler

The user's 30-stage "Industrial-grade autonomous CAD engineering compiler" (2026-10-30), turned into a node pipeline.
Read it as a specification, not as 30 prompts: a stage here is a deterministic tool where one exists, and an AI only
proposes or judges, never certifies. The code is `src/nexus/compiler.ts`; the table below is `STAGES` there, the one
place its coverage is kept (it is shown on the board by Compile: release).

## The record, and its five rules

One design record goes through every stage: what it came from, what is not known, its requirements (each an id, the
output that tests it, a limit and a tolerance), its components (from the thing's own tree: parent, count, material,
process, standard, mass, whether its geometry is a mesh or a solid), its interfaces, its parameters (verified, derived,
estimated or unknown, each with its source), and its checks. Each stage returns a new revision; none edits the last.

1. Geometry is the source of truth: the BOM and the checks read the thing itself, not what is said of it.
2. Every requirement is traceable: it names the output that tests it; one nothing tests stays UNVERIFIED.
3. A change propagates: every check keeps the design hash of what it checked; the release counts only checks on the
   design as it is now, and says how many no longer count.
4. No stage certifies its own output: every check names the engine that made it (the rules checker, the interface
   contracts, the requirement check), and none is made by the maker of the thing.
5. Unknown stays unknown: a parameter said verified with no source is listed as not known; a requirement with no value
   is UNVERIFIED, never a guessed pass.

Statuses: PASS, FAIL, UNVERIFIED, BLOCKED. The release (the user's Loop F): REJECTED if any check fails; BLOCKED if any
is unverified, blocked, or a requirement is unchecked; otherwise RELEASE CANDIDATE, awaiting a person's approval.
Approval for production is never given by code.

## The 30 stages here (11 built, 13 partial, 6 not built)

| Stage | Name | State | What does it here |
| --- | --- | --- | --- |
| 1 | Concept ingestion | built | compile.start (inputs, unknowns) |
| 2 | Reference geometry and calibration | built | photo.load, photo.features, camera.solve, photo.outline |
| 3 | Requirements | built | compile.start (register with ids, each tied to an output and a limit) |
| 4 | Architecture and decomposition | partial | the makers' trees; research.parts, research.gap |
| 5 | Interface control | partial | ports and interfaces on parts; compile.bom lists and checks them (critic contracts) |
| 6 | Hierarchical BOM | built | compile.bom |
| 7 | BOM audit | built | compile.bom (material, method, standard, interfaces each checked) |
| 8 | Parameters (verified, derived, estimated, unknown) | partial | compile.start params, by status and source |
| 9 | Datums and coordinates | partial | frames (assembly.ts frame, frames.of) |
| 10 | Parametric geometry (CAD kernel) | partial | makers by process; compile.solids and solid.exact make every piece an exact OpenCascade solid (brep.ts); not yet: hollow skins, dense windings, fillets as features |
| 11 | Assembly and constraint solving | partial | mate, assemble, onto, place.solve; no simultaneous solver yet (road map step 4) |
| 12 | Solid and topology validation | built | compile.solids: each solid checked by the kernel (BRepCheck_Analyzer), its volume against the BOM's mass |
| 13 | Interference and clearance | built | compile.verify (rules checker, triangle against triangle) |
| 14 | Kinematics | partial | check.turning, sim (Jolt), motion.ts |
| 15 | Tolerances and GD&T | not built | fits in ISO 286 terms in the critic only |
| 16 | Thermal and environment | partial | heat gate, graph flow, bend (thermal growth) |
| 17 | Structural | partial | loads.ts, load.spring, load.engine, bend (frame FE) |
| 18 | Fatigue and vibration | not built | not built |
| 19 | Multiphysics | not built | laws in the book; no coupled solver |
| 20 | Design for manufacture | partial | makers by process, made.of; no tool-reach or draft checks yet |
| 21 | Cost, weight, optimisation | built | fit.target, trade.offs, what.matters, variants |
| 22 | Drawings | not built | not built |
| 23 | Export (STEP, STL, 3MF) | not built | not built (road map step 2) |
| 24 | Reference comparison | built | check.accuracy, view.compare, compare.outline |
| 25 | Independent audits | partial | compile.verify (each check names its engine); ai.judge (a blind model) |
| 26 | Conflict resolution | not built | not built |
| 27 | Recursive correction | partial | compile.correct (failed requirements: What matters, then Fit to a target, re-checked by the block alone; rounds, rollback, repeated state, HUMAN_REVIEW_REQUIRED); auto.loop (rules repairs); not yet: the drawn thing rebuilt with the corrected values |
| 28 | Final regression | built | compile.release (only checks on the current design count) |
| 29 | Release gate | built | compile.release |
| 30 | Delivery and archive | partial | compile.release (the record, its revisions, BOM, unknowns, coverage); no CAD files yet |

## First runs (2026-10-30)

- The music-wire spring Fit to a target chose: 1 component; R1 rate 39,999 N/m against 40,000 ±2 % PASS, R2 safety
  1.59 against 1.3 PASS, R3 29.9 g against 35 g PASS, R4 fatigue life UNVERIFIED (nothing here works out fatigue);
  interfaces UNVERIFIED (it declares none); solids BLOCKED (meshes). Release: BLOCKED. 70 ms.
- An inline four from its parts (engine.whole, 80.5 × 97.6 mm): 410 components, 307 pieces, every one with its material
  and process; the rules checker over 1,547 meshes: nothing crossing, but the ignition coil's PBT housing reaches 171 to
  174 °C by conduction from the 800 °C exhaust manifold, over the 140 °C PBT stands (8 findings); R1 least factor of
  safety at 6,500 rpm 0.93 FAIL; R2 valves float at 6,270 rpm FAIL; R3 87.4 kg PASS. Release: REJECTED. 20 s.

## Next for it

- Stage 27, built as `compile.correct` (2026-10-31; board Compiler correction). Its flow, step by step: it waits for a
  record from Verify; reads which requirements' newest checks FAIL; hands their outputs and the values offered to What
  matters, which runs the block along paths and writes back what moves nothing (left alone); hands every requirement, as
  goals at once, and the values that do move them to Fit to a target, which runs the block until it writes back its best
  values; runs the block once more on its own at those values (the fit does not certify itself) and judges every
  requirement afresh; keeps the round only if it fails fewer than the last (else rolls back), stops on a state seen
  before, at most three rounds, each with twice the trials; writes a new revision of the record with a stage 27 check per
  requirement (the newest check of a requirement stands for it at the release gate; the old stays as history), the
  values chosen as derived parameters, and what it could not reach as HUMAN_REVIEW_REQUIRED, which blocks release. It can
  fail where the block cannot be run with the values (an error, said), or where nothing offered moves a failed output
  (said, and sent to review).
  Measured on the inline four's load case (bore 70 to 90 mm, stroke 80 to 100 mm, five ASTM spring wires): R1 least
  factor of safety > 1 and R2 valves holding to 7,800 rpm (1.2 × redline): R2 failed at 6,942 rpm; What matters found
  the stroke moves neither; one round moved the bore to 70 mm and the wire to chrome-silicon (A401): 8,030 rpm, least
  factor 1.013, both PASS, release REJECTED → RELEASE CANDIDATE, 19.8 s for the board. Asked for a least factor over
  1.3, it fixed R2, came back to the same values in its second round and stopped; R1 to review: "the least factor of
  10, valve spring: wire stress at full stroke" (the spring designer sizes its wire to its allowable stress, so no bore
  or wire reaches 1.3: that designer's margin is a person's choice). What it shows plainly: it took the bore to the
  bottom of its range, 2.0 L to 1.5 L, because no requirement held the displacement; a correction is only as good as
  the requirements it is held to. Not yet: the drawn engine rebuilt with the values (the checks say so).
- Stages 10, 12, 23: the B-rep kernel and STEP export (road map, the CAD plan, steps 1 and 2).
- Stage 11: the constraint solver (the CAD plan, step 4). Stage 15: tolerances and fits. Stage 18: fatigue (Goodman,
  stress-life). Stage 22: drawings. Stage 25: the multi-agent audit (blind judges per discipline, each shown only its own
  evidence). Stage 26: conflict resolution (recalculated by the deterministic engine, never by a vote).
