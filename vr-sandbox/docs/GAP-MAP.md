# The gap map: why our engine was not at the reference's level of detail, and the bridge

## The reference

The reference is a photoreal cutaway of an inline four. It shows a fuel rail with its regulator and injectors, coil packs, a wiring harness and an ECU, alternators and an A/C compressor, a clutch on the flywheel, a heat-wrapped header, an oil filter and dipstick, and the block cut open to its pistons, rods and crank.

Ours, before this round, was the Corolla's 2.0 L four (Toyota's M20A-FKS) built from its first parts: 1,432 pieces, every one sized from the bore and stroke and weighed from its own shape.

## Why it was not at that level

Each cause below was measured with the pipelines in the next section, not judged by eye.

| # | Cause | What it measured (Corolla's engine, before) |
| --- | --- | --- |
| 1 | **It was built as a mechanism, not a product.** What turns was there: block, crank, pistons, rods, head, valvetrain, timing, oiling, intake, exhaust, alternator, starter. What reads it, cools it, cleans it and wires it was not. | 28 of the 67 parts the sources name were drawn (42 %). 35 were missing: every sensor, the harness, thermostat, hoses, dipstick, PCV, catalyst, EGR, A/C compressor and mounts. |
| 2 | **It was generic, not one maker's engine.** It was drawn as typical of a twin-cam four, never held against what Toyota actually fitted. | 3 parts drawn the way the sources say they are not. Bucket tappets where the M20A has hydraulic lash adjusters. A belt-driven water pump where Toyota's is motor-driven. A flywheel where the Corolla's CVT takes a drive plate. |
| 3 | **Its castings were slabs.** The block's barrel, the plenum, the timing cover and the head deck are plain boxes. A real casting has ribs, bosses and fillets. | 27 % of the pieces are boxes, and they hold 63 % of the drawn volume. The biggest are the barrel (6.6 L), the intake plenum (1.9 L), the timing cover face (0.8 L) and the head deck (0.39 L). |
| 4 | **Its recipe in the inventory was shallow.** | `engine-ice` lists 10 things. Nothing said what an engine's systems are, so nothing could say what was missing from them. |
| 5 | **Research could not happen in the app.** | The `ai.ask` node needs the forge's relay, which was deleted, so no node can reach Claude or the web. |
| 6 | **The render has no image-level contact shadow.** | GTAO is incompatible with the logarithmic depth buffer the space uses. Surface grain is procedural per finish. |

## The pipelines (nodes) that do this now

The pipelines live in `src/nexus/research.ts` (the owner), `src/data/references.ts` (what has been researched) and the `research.*` and `check.fidelity` blocks in `src/nexus/blocks.ts`.

| Step | Node | What it does |
| --- | --- | --- |
| Research | (web search, done by Claude) → `src/data/references.ts` | Each part of the real thing is written as a line with the page it was read on, and how sure: *confirmed* (said of this very engine), *sibling* (said of its sister in the series), or *typical*. The app cannot search the web (cause 5), so the research is kept as sourced data. |
| Compile | **Research notes** (`research.notes`) | Turns notes into a reference tree. A part named with no source is refused. A count written twice differently is reported as a conflict. |
| Compile | **Researched reference** (`research.ref`) | A reference already kept, as a tree with its sources table. |
| Compile | **Compile research** (`research.merge`) | Merges several references: all their sources, each part once, conflicts reported. |
| Sub-components | **Into the inventory** (`research.toInventory`) | Enters the reference into the inventory under *Researched/*. Each part holds its own parts and says its source. |
| Sub-components | **Its parts, and theirs** (`research.parts`) | Opens any inventory item all the way down: its parts, their parts and theirs. It lists every one still waiting to be broken down, and why. |
| What is missing | **What is missing?** (`research.gap`) | Holds a drawn thing against the reference. Each part is drawn, short of its count, missing, or drawn the way the sources say it is not. A part's own parts are looked for inside it. Outputs the coverage and the work list. |
| What to reshape | **How finely is it made?** (`check.fidelity`) | Counts the pieces and kinds, the boxes by number and by volume, and the shaped pieces, fasteners and holes. Lists the biggest boxes, which are the first to reshape. |
| Everything at once | Board: *Research to what is missing* | Reference + your own notes → compile → the engine → gap, fidelity, the parts tree, what waits, the rules and the explode audit, all live. Add a line to the notes and everything after it follows. |

## The bridge, for the Corolla's engine (done this round)

Every addition passed the rules checker (`check.rules`). Nothing crosses, nothing rubs, and nothing stands nearer a hot pipe than its material takes. The engine came back with **0 findings**, with the maker's choices and without them.

| System | Added | Source |
| --- | --- | --- |
| Sensing | Knock sensor (its piezo element) on its boss, crank position sensor reading the ring gear, a cam position sensor on each cam, oil pressure switch, coolant temperature sensor, manifold pressure sensor, and the throttle's motor and position sensor in the throttle body | HP Tuners and EngineLabs (typical) |
| Wiring | A harness: a trunk along the intake side and down the back, a lead and a plug to every sensor and actuator, in nylon conduit | HP Academy (typical) |
| Cooling | Thermostat in its housing, heated (M20A), upper and lower radiator hoses and a heater hose. **Water pump made electric** (M20A): its motor, no pulley, off the belt | Toyota (confirmed); Vehicle Service Pros (of the series) |
| Oiling | Dipstick and its tube | Toyota dealer parts listing (typical) |
| Air | PCV valve and its hose to the plenum. **EGR**: its pipe, its liquid cooler, its valve on the plenum (M20A) | AutoNation listing (typical); mymotorlist (confirmed) |
| Exhaust | Front pipe, catalytic converter (shell, mat, substrate and heat shield, as its inventory recipe lists), air-fuel ratio sensor before it, oxygen sensor after, each on a PTFE lead | HP Tuners (typical) |
| Belt | A/C compressor with its magnetic clutch, on the belt. The tensioner moved to the slack side once the pump left the belt | Vehicle Service Pros (typical) |
| Drive | **Drive plate** in place of the flywheel (the Corolla's CVT) | AustralianCar.Reviews (confirmed) |
| Fuel | The runner injectors are named what they are (*port injectors*). **High-pressure pump** on the cam cover, its plunger on its own lobe of the exhaust cam (D-4S) | Toyota; Wikipedia, of the A25A (sibling) |
| Cams | **Intake cam phaser motor (VVT-iE)** on the timing cover | Wikipedia, of the series (sibling) |
| Mounts | Timing-end mount on its bracket; the torque rod's bush | Toyota dealer parts listing (typical) |

The maker's choices are a `fit` on the engine's spec (`FITS['m20a-fks']` in `engines.ts`). The Corolla's power entry carries the fit, and the engine nodes take it as a setting (*Its maker's choices*). An engine with no fit gets what is typical: a belt pump and a flywheel.

| Castings | The block's barrel cast as it is: an extruded section following the jacket round each bore (siamesed between them), a machined deck flange on top, a rib down each bulkhead in the valleys, and a boss for the knock sensor. The alternator's bracket now reaches the barrel's true surface. | Typical of an open-deck aluminium four (Toyota-Club: the M20A is open-deck) |

**After:** 55 of the 67 parts are drawn (82 %, up from 42 %). 9 are missing, 2 are short of their count, and 1 is drawn wrong. The engine has 1,538 pieces, up from 1,432. Plain boxes hold 40 % of the drawn volume, down from 63 %. It weighs 80.3 kg with the maker's choices and 86.6 kg without; the difference is mostly the cast-iron flywheel becoming a 4 mm steel drive plate.

### Still open on the Corolla, honestly

| What | Why it was not done this round | What it takes |
| --- | --- | --- |
| Hydraulic lash adjusters and roller finger rockers (drawn as bucket tappets: still *wrong*) | The cams sit straight over the valves. A finger follower puts each cam over its roller, about 0.14 bore outboard, which moves the cam bores, caps, gears and cover wells. | Re-lay the head's valvetrain as an option of the head, then re-run the rules through a turn. |
| Direct injectors, their high-pressure rail and its pressure sensor (the second fuel rail is short) | Each needs a bore from the head's intake side under its port into the chamber. The port runs within 2 mm of the deck there in this head. | Reshape the head's ports (cause 3) first, then bore the injector along its axis (`boreAlong`). |
| Exhaust cam phaser (hydraulic), its oil control valve, the oil pump's control solenoid | They sit inside the timing cover. | Draw them in the timing drive with their oil ways. |
| Valve seats (laser-clad intake, pressed exhaust) | Not drawn as their own pieces. | A seat ring at each valve's head, cut into the deck. |
| Crank timing rotor | The crank sensor reads the ring gear, a choice typical of many engines. The sources point to a rotor. | A toothed rotor on the crank and the sensor moved to read it. |
| ECU, the third mount | Both are the car's, not the engine's: the ECU sits in the bay and the third mount on the gearbox. | Draw them with the car (`machines.ts`). |
| Castings as slabs (cause 3) | The barrel is done. The rest of the castings were not reshaped this round. | The fidelity node ranks the next: the intake plenum (1.9 L, a lofted shell), the timing cover face (0.8 L, ribbed), the head deck, the deck flange, the crankcase top. |
| Contact shading (cause 6) | Unchanged. | Screen-space AO that works with a logarithmic depth buffer (writing linear depth to its own target), or baked AO per part. |

## The bridge, for the other builds

None of the other builds has a researched reference yet. The pipeline is the same for each:

1. Write its notes.
2. Run *What is missing?* on it.
3. Bridge the gap, keeping the rules at 0.

| Build | Engine | Research first |
| --- | --- | --- |
| Honda Rancher, CRF450R | 420 cc and 450 cc liquid-cooled singles (Unicam SOHC on the CRF) | Honda's service manual parts lists: the Unicam rocker, decompressor, ECU and throttle body, radiator and fan |
| Toyota forklift | 4Y, 2.2 L pushrod four | Carburettor or EFI variant, its governor, the LPG mixer (forklifts often run on LPG) |
| Freightliner Cascadia | Detroit DD15, 14.8 L diesel | Its common rail (amplified, per Detroit), its turbo and VGT, EGR, DOC/DPF/SCR aftertreatment, air compressor, fan clutch |
| John Deere mower | Kawasaki FR651V V-twin | Its carburettor, governor, ignition modules, oil filter, cooling shroud |
| Rental kart | Honda GX270 | Honda's parts list: the governor, recoil, fuel tank, air cleaner, muffler guard (the 25 kg Honda gives includes the tank and control base) |

Each reference goes in `src/data/references.ts` and is registered in `REFERENCE_NOTES` in `research.ts`. Each maker's choices go in `FITS` in `engines.ts`.
