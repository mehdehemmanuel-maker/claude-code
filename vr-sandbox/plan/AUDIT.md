# The audit against the directive of 2026-11-07

Six auditors probed this commit on 2026-11-07 (geometry, components, assembly, materials-physics, systems-ai, UI).
The probes and their outputs are in `$A` = `/tmp/claude-0/-home-user-claude-code/3ceee736-75a9-5144-bf35-df6b73639671/scratchpad/audit/`, a session
scratchpad that is not kept. Every number below was printed by a probe; sizes in section 5 are guesses.

The synthesis re-ran three of the claims:

- **`over` writes contact faces between pieces that do not touch.** Confirmed with `assembly/zz_probe_assembly_p7`:
  the shaft and the 6004's outer ring carry "contact area 754 mm2" at a "measured least distance 8.973 mm", and the
  shaft and the UCP204 housing are 13.385 mm apart.
- **A saved block that places a user-made block does not reload in a fresh process.** Confirmed with
  `components/` nest, then reload, as two processes: "no block "probe.dog-on-plate"". (The inner block was registered,
  never saved itself.)
- **Gears and pulleys give invalid exact solids.** Confirmed with a probe of our own, deleted afterwards: piece.gear m1
  z20 gives "made 1 invalid 1" and piece.pulley "made 6 invalid 4". The shaft and the 608 bearing are valid.

## 1. The ten acceptance tests today

| Test | Result | What ran | The gap | Probe (under `$A`) |
| --- | --- | --- | --- | --- |
| 1 Shaft | **pass** | piece.shaft and room.make rod at three sizes: B-rep volume πr²h exactly, valid; a board re-run follows (plate 59.49 to 58.45 cm³); STEP read back as 1 solid | 11 table diameters only; the mesh is 1.17 % under the solid; the STEP cannot be downloaded | geometry/shaft.out, feat.out |
| 2 Assembly | **partial** | Shaft, gear, 2 UCP204, plate, bolted: axis at y 43.3 mm, housings ±106 mm (±156 at 350 long), gear tip 1.407 mm off the plate | one-time placements, not kept relations; slide fit refused, so the shaft is frozen; false faces; one block unbolted, one hole bolted twice; no DOF count | assembly/t2_run2, p2, p6_run2 |
| 3 Mass | **pass** | 4 materials, 2 shapes, 4 engines and the B-rep: all V·ρ, error 0 | typical density where the handbook has a sourced one; envelopes weigh as boxes (fan coil 1450.7 kg); material settable on 4 of 556 pieces | materials-physics/t34.out |
| 4 Torsion | **partial** | The τ and θ laws equal the hand values (31.83 MPa, 0.008012 rad) | no node takes a built shaft, material and torque; G never output; bend takes forces only | t34.out, board.out |
| 5 Fluid | **fail** | pieces built; Re and Δp only from typed numbers | 0 interface records; 15 mm copper on G1/2 accepted; no pump or valve law, no fluid flow | systems-ai/fe.out.txt |
| 6 Electrical | **fail** | A hinge runs dcmotor.ts (81.88 A peak) | no terminals, supply, driver or circuit; motor constants not the motor pieces' own | fe.out.txt, cart.out.txt |
| 7 Arm | **partial** | 3 to 5 joints; held joints reach 0.500 to 0.526 rad; a two-joint pose holds | no travel limits; at 5 joints the shoulder fell to 2.193 rad; no IK, DOF count or ball joint | assembly/t7_run1 |
| 8 Reuse | **pass** | the remembered arm placed and stacked on a new board: 54 pieces, 5 joints | `into` refuses an inner input; robot-dog's 97 pieces carry 18 names | systems-ai/persist-read; components/nest |
| 9 Persistence | **partial** | a fresh process reloads the arm unchanged (pieces 53/53, faces 67/67, joints 5/5) | the recipe is stored, no version or digest; a nested user block fails (re-checked); browser path not run | persist-*.out.txt; components/reload |
| 10 AI | **partial** | two real runs: decomposed, found library parts, generated a bracket, one group, 0 failing | no functional check: the added motor drives nothing; runs differ | systems-ai/ai-t10*.out.txt |

Three tests pass, five are partial and two fail.

## 2. What exists, by section

- **4A data model.** Partial: BlockDef (`blocks.ts`) is one contract for all 1,205 nodes, and `groupBlock` makes any
  board one (section 4). Duplicated: five more part records (inventory, kinds, families.ts, components.ts, stock).
  Partial provenance: 436 families say `kind:'standard'` though their source says typical; evidenceOf says
  "hypothetical" for all 556 pieces.
- **4B geometry.** Functional: `room.ts` makes 14 primitive kinds with holes and its operations, `brep.ts` makes each an
  OpenCascade solid, and a change upstream reaches the solids by a board re-run. Partial: 32 of 1,681 solids invalid
  (gears, pulleys, extrusions) and 6 domes not made (geometry/sweep.out); the loft's B-rep and massOf 8.3 % apart; a
  sweep only a circle along lines and arcs. Duplicated: holes cut twice (kit3d mesh CSG and OCC); shape.extrude, lathe
  and hole beside room.make; array and mirror reach no solid. Decorative: fillets and chamfers round the drawn mesh only.
  Disconnected: NURBS (`surface.ts`); export, written but saved by no page (nodes.ts:664 downloads the board JSON only),
  and flat. Missing: sketch entities, planes, union, intersect, shell, offset, mirror, threads, ribs, grooves, a general
  sweep, any import.
- **4C generators.** Functional: PartFamily, 519 families and 7,713 rows; 30 of 30 sampled built at two sizes; every
  family the directive names exists. Partial: 89 envelopes are boxes (transformer 3,281 kg against its row's 420 kg); 242
  families have only typical rows. Duplicated: an M10×40 bolt at 31.25 g (part.family) and 35.80 g (piece.bolt).
- **4D materials.** Partial: metals have 9 of 16 properties sourced, polymers stand in as PMMA; G, hardness, fatigue,
  corrosion and magnetic data are missing for every material probed; nothing depends on temperature; 26 of 55 handbook
  grades are never reached (materials-physics/props.out). Decorative: magnetic and acoustic fields nothing reads.
  Duplicated: three element tables, two density tables.
- **4E ports.** Partial: a room `Line` is placed and directed and the operations use it, but its kind is the last word
  of its name, with no compatibility or limits. Disconnected: `interfaces.ts` gives 0 records from room builds. Missing:
  power, signal, fluid, thermal, optical, acoustic and data ports.
- **4F constraints.** Functional: fixed, revolute, prismatic, gear (−1.3333), rack and belt in `sim.ts`. Partial:
  cylindrical from over, not from through; alignment, distance and angle as one-time placements; bolting (which:1 fails,
  a hole takes a second bolt); clearance computable in code, with no node. Decorative: a bearing's rings are one body
  and its balls frozen axles. Missing: spherical joints, joint limits, a DOF count (solveJoints counts only old kit
  parts). Duplicated: graph.ts says "depth 20 mm" where the room has a gap; 318 places written by hand.
- **4G physics.** Functional: mass, bend (equals PL³/3EI), heat and current flow through built parts, thermal, Jolt
  motion, 330 sourced laws. Partial: letgo reports −0.035 J of heat unflagged; load.spring works only on the old coil;
  sweep.range defaults to a deleted block. Disconnected: CalculiX agrees within 3 % but only on typed settings; fatigue,
  fluid, EM, vibration, acoustics and optics are calculators (0 of 330 laws take a built part). Duplicated: convection,
  spring rate and the motor drive are each computed twice.
- **6 recursion.** Partial: five levels keep parameters, faces and joints when wired (134 pieces, 12 joints); `into`,
  owner paths and saving inner graphs are missing.
- **7 AI.** Partial: find works by name and size, not function ("pumps water" returns biological cells); duplicate
  detection works; a fold with no outputs is saved anyway. Missing: tools for compatibility, missing interfaces, bad
  connections, interference, alternatives, variants, revisions.
- **8 UI.** Functional, each driven in a browser (ui/p2, p3, p5, p7, p9): browse (566 families), parameters, dimensions
  (78.92 g to 493.2 g), add, wire, open nested, save custom, every header button. Partial: search ("0 × 0 × 0 mm"
  results place nothing), discipline (grouped, not filtered), preview (only after adding), materials (free text;
  "unobtainium" reads all working), dependencies (no BOM tree), duplicate (graph blocks only), validation (an untested
  arm shows working). Missing: import. Disconnected: export. Defects: the inspector covers Fit, Cut, Enter and ＋ Parts
  after an add; "Assemblies 10" opens another aisle; two Parts browsers out of step; look.html and nodes.html reached
  from nowhere.

## 3. Duplicates to consolidate

| What | Keep | Retire | Why |
| --- | --- | --- | --- |
| Part generators | piece.\* (PartFamily) | part.family, components.ts DESIGNED, shape.extrude/lathe, hole | two bolt masses; part.family's output is refused by room.stack |
| Placement and joints | room operations, motionOf | place, array, mirror, mate, joint, joints.solve (solveJoints' rank count moves into motionOf) | their output reaches no solid; 318 hand places |
| Exact geometry | brep.ts | kit3d CSG and edgeRadius become a preview of the B-rep tessellation | mesh 1.17 % low |
| Loft | one definition | the other evaluation | 8.3 % apart |
| Ports | room `Line`, extended | kits Port/Iface (interfaces.ts reads Lines) | 0 records from room builds |
| Contacts | room `Face` | graph.ts and space.ts read faces | "depth 20 mm" on a gap |
| Motor, convection, spring rate | dcmotor.ts; the book laws | the closures in engineering/ | each computed twice |
| Material data | matter.ts (handbook first), periodic.ts | the second density and element tables | props.out |
| Store, search | memory.ts, navigate.ts search | the three page writers and two rankers | four writers of one key |

## 4. The component contract

The base is **`BlockDef` together with the room `Block` it returns.** piece.\* and seed.\* are BlockDefs already, and
`groupBlock` makes any board one, so assemblies are already components. Everything downstream reads the Block. The
contract is a read over what exists, `contractOf(def, set)`, plus a few optional fields. It is not a new schema.
components.ts `Component` and the kit `Part` belong to the old world.

| Field | Has | Lacks | Smallest extension |
| --- | --- | --- | --- |
| id, geometry | `BlockDef.id`; `run`/`graph` to a Block | nothing | none |
| type | kind, role, aisle (on 407 of 556 pieces, 0 of 78 seeds) | an aisle on seeds | type = aisle |
| parameters | settings; group.in inputs | units (0 of 798) and one list | `paramsOf(def)` |
| materials | `Piece.mat` | assignment | a `mat` choice in the maker |
| ports | `Piece.lines` | kind, size, limits | the Line fields below |
| DOF | motionOf joints | a number | `Motion.freedom` |
| constraints | `Face` (fit, gap, and `by`, the operation) | a joint kind | `Face.joint` |
| models | `spec.model` (0 of 556) | a link | `modelsOf(def)` |
| manufacturing | none | all of it | `BlockDef.make?` |
| tolerances | `Face.fit` | per port | `Line.size.tol` |
| dependencies, variants | carryOf; rows | an adapter | `depsOf`, `variantsOf` |
| standards, provenance, validation | sources, by, evidenceOf | correct kinds | read the kind from the source text |
| identity in nesting | `Piece.name` | an owner | `Piece.owner?: string[]` |

**Ports (4E).** `Line` gains `kind?: InterfaceKind`, `size?`, `limits?` (`{min?, max?, unit, src}`) and `std?`;
`InterfaceKind` gains power, signal, fluid, thermal, optical, acoustic, data and mount; `classOf(kind)` maps each to the
directive's ten classes; `kindOfLine` reads today's names, so 555 pieces need no edit; `interfacesOf(Block)` returns
Interface records with their existing `mates` rule.

**Constraints (4F).** The Face stays the record. `Face.joint` (turns, slides, held, pressed, fixed, ball) is written by
the operation (FIX-PLAN root 4) and read by motionOf before it infers. Alignment, distance and angle stay operation
settings, re-solved by the board run.

## 5. Work packages (wave 1)

Each package adds its anchor to `tests/nexus/domains.test.ts`; done means `npm run typecheck` and
`npx vitest run tests/nexus/domains.test.ts -t "<anchor>"` pass. P1 lands first; then P2, P4, P7 and P8 run in parallel;
P3 needs P2; P5 and P6 need P1, and P6 needs P4. Sizes are guesses.

1. **P1, the contract** (types and adapters only). Owners: room.ts (Line, Piece, Face types), interfaces.ts
   (InterfaceKind, `interfacesOf(Block)`, `classOf`, `kindOfLine`), sim.ts (`freedom`, `ball`), blocks.ts (`contractOf`,
   `paramsOf`, `depsOf`, `variantsOf`, `modelsOf`, `make?`). Done: "component contract" gives piece.shaft,
   piece.bearing, seed.robot-arm and a group of the arm the same keys, and piece.bolt one interface or more. One builder,
   an hour.
2. **P2, true faces and bearings** (test 2). Owners: room.ts over and through (a face only where surfaces meet), the
   bearing and pillow-block recipes, a seat fit, boltedJoint (`which`, one bolt per hole), mesh by tip radius. Writes
   `Face.joint`. Done: "acceptance 2" turns the shaft on one revolute, bolts both blocks, and has no face wider than its
   fit's gap. A day.
3. **P3, motion reads the contract** (test 7). Owner: sim.ts. Done: "acceptance 7" holds the 5-joint arm within its range
   and prints its freedom; a bolted joint reads fixed; "movement" still passes. A day.
4. **P4, materials as numbers, and torsion** (tests 3, 4). Owners: matter.ts (the 26 grades, G, Tmax), the matter node's
   numeric outputs, a torque load in bend, the maker's `mat` choice. Done: "acceptance 4" gives a built rod's τ and θ
   equal to the laws; "acceptance 3" refuses an unknown material. A day.
5. **P5, fluid** (test 5). Owners: plumbing.ts and fluid.ts ports, a join in room.ts that refuses a mismatch, pump and
   minor-loss laws, a fluid kind in graph.ts flowOver, the pump loop on seed.pump. Done: "acceptance 5" refuses copper on
   G1/2 and conserves flow to 1e-6. Two days.
6. **P6, electrical** (test 6). Owners: terminal Lines, supply and driver families, motor pieces linked to
   data/motors.ts, a nodal circuit in graph.ts. Done: "acceptance 6" gives a driver-limited current. Two days.
7. **P7, recursion and persistence** (tests 8, 9). Owners: dataflow.ts (`Piece.owner`; `into` reaching an inner input,
   root 5), memory.ts (carryOf, a version and digest, the only writer). Done: "acceptance 9" passes the two-process nest
   case and finds 4 distinct leg owners. A day.
8. **P8, exchange and UI** (test 1, UI item 14). Owners: brep.ts (the dome, toothed prisms, STEP and STL import),
   nodes.ts (Blob downloads, the drawer, Duplicate), parts.ts, navigate.ts. Done: the sweep shows 0 invalid gears, and
   "acceptance 1" exports and re-imports a STEP at equal volume. A day and a half.

**Wave 2:** AI tools over interfacesOf (compatible, missing interfaces, bad connections, search by function) and a
functional gate in composeBuild, for test 10; the retirements in section 3; union, shell, offset, mirror, fillet and
chamfer in OCC; one loft; envelope masses; verify.stress on a built part; the rest of FIX-PLAN roots 1 and 2.

## 6. What is plainly not reachable soon

- Operating limits on most parts: the 242 typical-only families have no rated figures, so limits stay blank and say so.
- A simultaneous constraint solver: decision 0021 forbids a place as an input.
- Real EM, modal, acoustic, optical, fatigue-on-a-part and CFD analysis: these stay calculators.
- Helical threads, sculpted surfaces, NURBS solids.
- Manufacturer CAD at scale: it comes in as fixed pieces, with ports declared by hand.
- Exact solids in the browser: untested there (a 23 MB kernel).
- Repeatable AI runs: a functional gate makes them checkable, not deterministic.
