# Creative Sandbox (WebXR)

A physics-real creative sandbox for Meta Quest 3S (a headset app only: the web page just gets you into VR). You get unlimited parts,
real materials and joints, and nothing is scripted: joints and parts behave, and fail, because of their
geometry, material data and specs. The design and roadmap are in [PLAN.md](PLAN.md).

## Run it

```bash
cd vr-sandbox
npm install
npm run dev          # http://localhost:5173 (open it in the headset, or ?iwer to emulate one)
```

- **In the headset:** trigger uses the active tool, grip grabs, A cycles tools, B shows or hides the wrist tablet, X / Y undo and redo. The tablet's Tools page shows what the active tool can do besides its trigger (turn or tip a part before placing it, the joint axis, "Whole assembly").
- **Without a headset (development and tests only):** open `http://localhost:5173/?iwer`. This installs Meta's WebXR emulator (a virtual Quest 3) with a synthetic scanned room (floor, walls, a table and a couch), and **Enter VR** works in any browser in all three modes. `?iwer=noroom` leaves the room out.
- **On a Quest 3S:** WebXR needs HTTPS or `localhost`. Either:
  - use GitHub Pages (once per repository):
    1. Go to *Settings → Pages → Build and deployment → Source* and pick **GitHub Actions**.
    2. Merge to `main`. The **vr-sandbox Pages** workflow builds, tests and deploys. If you merged before step 1, run the workflow by hand: *Actions → vr-sandbox Pages → Run workflow*.
    3. Open the site in the Quest Browser, e.g. `https://<owner>.github.io/<repo>/`. The build uses relative paths, so it works from the subpath (tested in `tests/e2e/deploy.spec.ts`).
  - or plug the headset in over USB and run `adb reverse tcp:5173 tcp:5173`, then open `http://localhost:5173` in the Quest Browser.
- **First time in the headset:** pick a mode next to **Enter VR**, then press it. Mixed reality asks for permission to use your room scan (Space Setup). If you've never run Space Setup, the tablet's **Scan room** starts it.
- **Debug:** `?physics=inline` runs physics on the main thread instead of the worker.

### Three ways to be there

Pick one next to **Enter VR**, or switch any time on the wrist tablet (**World** page).

- **Relax:** the virtual workshop. Fly with the sticks, snap turn, and shrink or grow yourself.
- **Walk:** the workshop at 1:1, calibrated to your real room.
  - The spot where you stand, and the way you face, when the session starts become the workshop's home spot, 2 m in front of the workbench. **Recalibrate** redoes it wherever you stand.
  - With a bounded (guardian) space the calibration is remembered between sessions.
  - You move by walking; the sticks don't move you.
  - Your real walls and furniture, from the headset's room scan (Space Setup), appear in the workshop and are solid to the parts. **Room solid** turns that off. The play-area boundary is drawn on the floor.
- **Mixed reality:** passthrough, so the build sits in your real room.
  - The scanned floor, walls, table and couch are the physics: parts land on your real table.
  - Real surfaces hide the virtual parts behind them and catch their shadows.
  - The workshop and its test pool are gone.
  - **Scan room** opens Space Setup; **Show scan** outlines what the headset found.

Walk and mixed reality ask for an AR-capable session, which is what grants the room scan (WebXR `plane-detection` and `mesh-detection`). Walk keeps the workshop opaque over the passthrough. On a headset without passthrough, walk runs without the room and shows only the play-area boundary.

### VR controls
| Input | Action |
|---|---|
| Trigger | Use the active tool, or tap the wrist tablet |
| Grip | Grab what the ray points at (each hand holds its own part; wrist rotation carries over) |
| Left stick | Relax mode: fly where you look, or, in a build with motors, drive it (menu hidden). Switch with **World → Left stick**. Walk and mixed reality: always drives |
| Right stick | Snap turn (about your head) and rise/sink (relax mode), or push/pull a held part |
| A / B | Next tool / show-hide the wrist tablet |
| X / Y | Undo / redo |
| Stick clicks | Checkpoint (left) / rewind (right) |

## What's in it

- **Physics:** Jolt (WASM) in a Web Worker at a fixed 90 Hz, interpolated for rendering. Mass comes from exact
  parametric volume × material density. Every joint's real constraint force is read back each tick,
  resolved into axial, shear, bending and torsion loads, and checked against spec-derived capacities.
- **Breakable stock:** rods, bars, tubes, beams, angles, lumber and long strips are bonded segments whose strength
  comes from the section and the material:
  - Ductile metals yield into a plastic hinge at Mp = Z·Fy, keep carrying Mp while they bend, and tear once the
    hinge has rotated past their ductility.
  - Wood snaps at S × modulus of rupture; glass, ceramics and cast iron snap at their tensile strength.
  - Tension, shear, torsion and crushing fail at handbook ratios.
  - Damage (fractures and bent pieces) is saved in the build, undoable, and repairable.
  - Rigid assemblies with bonded stock stay exactly rigid under load. After each Jolt step they are re-solved as
    the single rigid bodies they are, and every section force is exact Newton–Euler statics and dynamics.
- **Joining (from specs):**
  - Bolts: ISO 898-1 classes, VDI 2230 torque → preload. They slip, then bear, then shear or snap, and can be over-torqued.
  - Wood screws and nails: USDA Wood Handbook withdrawal, NDS yield modes.
  - Welds: AWS fillet throat × filler, with a weldability matrix (aluminium can't be welded to steel).
  - Rivets and solder.
  - Adhesives: lap shear vs peel, a cure clock, and substrate compatibility.
- **Joints and stored energy:**
  - Hinges, free-spinning bearings with load-dependent SKF friction, sliders, ball joints.
  - DC gearmotors on their torque-speed line, servos, eddy-current brakes.
  - Coil springs (Shigley rate, stress and surge frequency), ropes/cables/chain (EA/L, breaking load, slack), neo-Hookean rubber bands.
- **Fields:**
  - Magnets use the Gilbert charge model: magnet–magnet forces and torques, plus an image method against steel. Austenitic stainless and aluminium stay non-magnetic.
  - Buoyancy uses the real submerged volume.
  - Quadratic air drag.
- **Catalogs:** 50 cited materials (steels, aluminium alloys, copper, titanium, woods, polymers, rubber, glass, concrete, stone, textiles, leather, foam, cork, composites, magnets); 17 parametric part families, including an electromagnet; 18 connector kinds. Every parameter is editable on the tablet.
- **Joining:** **Best join** picks the real process for the two materials and sizes it to the stock: welds with the matching filler, screws that reach into the second piece, rivets, bolts or the trade's adhesive. A process that can't hold those materials is replaced by one that can, and the headset says why.
- **Magnets:** strength by grade (Ferrite, N35, N42, N52) and size, stepped on the part page with a "holds ≈ kg on steel" readout. The electromagnet has power from 0 to 100 % and can be put on the tablet's switch.
- **Save format:** canonical JSON with IDs and a parent/child hierarchy, and full material snapshots embedded. Saves are byte-exact. Share codes (`VRSB1.` deflate + base64url + CRC32) and `#build=` links are supported.
- **Feel:**
  - Modal-synthesis impact audio pitched to each part's flexural frequency.
  - Creaks above 80% utilisation, motor whine, break/slip/splash sounds.
  - Sparks by real spark-test signature (aluminium doesn't spark).
  - Dust, splashes and debris, haptics, and a stress overlay.
- **Creative loop:** undo/redo (including sim-caused failures), checkpoints and rewind, pause/step/slow motion, freeze to world, duplicate assemblies, Build mode (hold still, snap, Play).
- **My builds:** save, open and delete your own builds on the headset. Nothing pre-made ships; the physics test scenes live only in the tests.
- **Ego, the mind of this world (docs/EGO.md), short for evolution:** she grows through six levels (sight, habits, skills she teaches herself from what you repeat, foresight before Play, initiative, memory), takes complaints while you play (fixes what she can, writes the rest up for Claude as a GitHub issue). She needs no outside AI service, because she reads the whole simulation: when a joint nears failure or breaks she says why, with the numbers, and offers one-tap fixes that carry 1.5× the load. She learns your habits to suggest your next tool, and runs **Forge**, the build language (`repeat 4 { place lumber … as leg }`), typed on the tablet.
- **Tablet:** icon tabs, a Materials page, Search (parts, materials, joints, tools, builds, actions as you type) and a 9-slot hotbar of what you used last, with isometric item icons in each part's real material colour.

## Tests

```bash
npm run typecheck
npm test        # 209 tests: engineering golden values, codec property tests, physics laws, fracture, joins, magnets, Forge, Ego, test scenes
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e   # 19 browser tests on an emulated Quest (building, joining, My builds, Ego, Forge, search, hotbar, movement, walk and mixed reality) and the Pages subpath
```

The physics conformance suite checks laws, not builds:
- free fall, incline slip threshold, rolling a = ⅔ g sin θ
- spring and pendulum periods, buoyant fraction
- joint force = m·g (with substeps), cantilever shear and moment
- bolt tensile failure and slip, rope static, dynamic-amplification and snatch loads
- weld compatibility, adhesive cure
- magnet force and polarity, motor no-load speed, eddy-brake decay
- breakable stock:
  - exact section forces along a cantilever and in a hanging rod
  - a plank on knife edges carrying a resting weight
  - ductile hold below Mp, and a plastic hinge arresting where M0·sin θ = Mp·θ
  - tearing past the material's ductility
  - wood and glass holding at 0.8× and snapping at 1.2× capacity
  - a tumbling bar matching Euler's equations
  - servo response identical on segmented and solid bars
  - repair, and frozen parts that never break

## Status against the plan

| Area | Done | Not yet |
|---|---|---|
| Physics core, joints, failure | Real loads, capacities and failure modes for all connector kinds; breakable stock (plastic hinges, fracture, damage in the build) | Buckling; elastic flex (springboards, bows); frame action in rigid assemblies (a table top's sag does not bend its leg joints); the rigid-assembly solve for joints to wheels and motors (Jolt handles those) |
| Transmissions | Motors, servos, bearings, eddy brakes | Gears, racks, lead screws, belts |
| Tools | Grab, place, join (every joining method), erase, freeze, clone, poke, inspect, measure | Physical tool models (drill making holes, welder settings → bead quality, grinder cutting, hammer and nails) |
| VR | Controllers, wrist tablet, two-hand grab, locomotion, haptics, player scale; relax, walk (room-scale, calibrated, real furniture) and mixed-reality (passthrough, the scanned room as physics) modes; IWER testing with a synthetic room | Hand tracking, measured Quest 3S performance, a device check of the room scan and passthrough |
| Rendering | Classic WebGLRenderer, instancing-ready materials, foveation | Multiview `WebGPURenderer` A/B on device, instancing/batching, adaptive quality |
| Stretch | – | Text/voice → 3D part (needs a provider and an API key) |

Performance numbers are **unmeasured on a real Quest 3S**: M0 in the plan still needs a device run.
