# Creative Sandbox (WebXR)

A physics-real creative sandbox for Meta Quest 3S, with a full desktop fallback. You get unlimited parts,
real materials and joints, and nothing is scripted: joints and parts behave, and fail, because of their
geometry, material data and specs. The design and roadmap are in [PLAN.md](PLAN.md).

## Run it

```bash
cd vr-sandbox
npm install
npm run dev          # http://localhost:5173 (desktop)
```

- **Desktop:** right-drag to look, WASD/QE to fly, keys 1–9 pick tools, left click uses the tool. Press **H** for all controls.
- **Try VR without a headset:** open `http://localhost:5173/?iwer`. This installs Meta's WebXR emulator (a virtual Quest 3) with a synthetic scanned room (floor, walls, a table and a couch), and **Enter VR** works in any browser in all three modes. `?iwer=noroom` leaves the room out.
- **On a Quest 3S:** WebXR needs HTTPS or `localhost`. Either:
  - use GitHub Pages: enable *Settings → Pages → Source: GitHub Actions*, then run the **vr-sandbox Pages** workflow (it deploys from `main`); or
  - plug the headset in over USB and run `adb reverse tcp:5173 tcp:5173`, then open `http://localhost:5173` in the Quest Browser.
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
| Left stick | Fly (head-relative, relax mode). Steers vehicles while the menu is hidden |
| Right stick | Snap turn and rise/sink (relax mode), or push/pull a held part |
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
- **Catalogs:** 38 cited materials (steels, aluminium alloys, copper, titanium, woods, polymers, rubber, glass, concrete, magnets); 16 parametric part families; 18 connector kinds. Every parameter is editable in the UI.
- **Save format:** canonical JSON with IDs and a parent/child hierarchy, and full material snapshots embedded. Saves are byte-exact. Share codes (`VRSB1.` deflate + base64url + CRC32) and `#build=` links are supported.
- **Feel:**
  - Modal-synthesis impact audio pitched to each part's flexural frequency.
  - Creaks above 80% utilisation, motor whine, break/slip/splash sounds.
  - Sparks by real spark-test signature (aluminium doesn't spark).
  - Dust, splashes and debris, haptics, and a stress overlay.
- **Creative loop:** undo/redo (including sim-caused failures), checkpoints and rewind, pause/step/slow motion, freeze to world, duplicate assemblies, templates.

## Tests

```bash
npm run typecheck
npm test        # 118 tests: engineering golden values, codec property tests, physics laws, fracture, template behaviour
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e   # 10 browser tests incl. emulated Quest sessions in walk and mixed reality
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
| Physics core, joints, failure | Real loads, capacities and failure modes for all connector kinds; breakable stock (plastic hinges, fracture, damage in the build) | Buckling; elastic flex (springboards, bows); the rigid-assembly solve for joints to wheels and motors (Jolt handles those) |
| Transmissions | Motors, servos, bearings, eddy brakes | Gears, racks, lead screws, belts |
| Tools | Grab, place, join (every joining method), erase, freeze, clone, poke, inspect, measure | Physical tool models (drill making holes, welder settings → bead quality, grinder cutting, hammer and nails) |
| VR | Controllers, wrist tablet, two-hand grab, locomotion, haptics, player scale; relax, walk (room-scale, calibrated, real furniture) and mixed-reality (passthrough, the scanned room as physics) modes; IWER testing with a synthetic room | Hand tracking, measured Quest 3S performance, a device check of the room scan and passthrough |
| Rendering | Classic WebGLRenderer, instancing-ready materials, foveation | Multiview `WebGPURenderer` A/B on device, instancing/batching, adaptive quality |
| Stretch | – | Text/voice → 3D part (needs a provider and an API key) |

Performance numbers are **unmeasured on a real Quest 3S**: M0 in the plan still needs a device run.
