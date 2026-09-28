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
- **Try VR without a headset:** open `http://localhost:5173/?iwer`. This installs Meta's WebXR emulator (a virtual Quest 3), and **Enter VR** works in any browser.
- **On a Quest 3S:** WebXR needs HTTPS or `localhost`. Either:
  - use GitHub Pages: enable *Settings → Pages → Source: GitHub Actions*, then run the **vr-sandbox Pages** workflow (it deploys from `main`); or
  - plug the headset in over USB and run `adb reverse tcp:5173 tcp:5173`, then open `http://localhost:5173` in the Quest Browser.
- **Debug:** `?physics=inline` runs physics on the main thread instead of the worker.

### VR controls
| Input | Action |
|---|---|
| Trigger | Use the active tool, or tap the wrist tablet |
| Grip | Grab what the ray points at (each hand holds its own part; wrist rotation carries over) |
| Left stick | Fly (head-relative). Steers vehicles while the menu is hidden |
| Right stick | Snap turn, rise/sink, or push/pull a held part |
| A / B | Next tool / show-hide the wrist tablet |
| X / Y | Undo / redo |
| Stick clicks | Checkpoint (left) / rewind (right) |

## What's in it

- **Physics:** Jolt (WASM) in a Web Worker at a fixed 90 Hz, interpolated for rendering. Mass comes from exact
  parametric volume × material density. Every joint's real constraint force is read back each tick,
  resolved into axial, shear, bending and torsion loads, and checked against spec-derived capacities.
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
npm test        # 99 tests: engineering golden values, codec property tests, 21 physics laws, template behaviour
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e   # 7 browser tests incl. an emulated Quest session
```

The physics conformance suite checks laws, not builds:
- free fall, incline slip threshold, rolling a = ⅔ g sin θ
- spring and pendulum periods, buoyant fraction
- joint force = m·g (with substeps), cantilever shear and moment
- bolt tensile failure and slip, rope static, dynamic-amplification and snatch loads
- weld compatibility, adhesive cure
- magnet force and polarity, motor no-load speed, eddy-brake decay

## Status against the plan

| Area | Done | Not yet |
|---|---|---|
| Physics core, joints, failure | Real loads, capacities and failure modes for all connector kinds | Parts themselves bending or breaking (segmented bodies, plastic hinges, buckling) |
| Transmissions | Motors, servos, bearings, eddy brakes | Gears, racks, lead screws, belts |
| Tools | Grab, place, join (every joining method), erase, freeze, clone, poke, inspect, measure | Physical tool models (drill making holes, welder settings → bead quality, grinder cutting, hammer and nails) |
| VR | Controllers, wrist tablet, two-hand grab, locomotion, haptics, player scale, IWER testing | Hand tracking, mixed-reality passthrough, measured Quest 3S performance |
| Rendering | Classic WebGLRenderer, instancing-ready materials, foveation | Multiview `WebGPURenderer` A/B on device, instancing/batching, adaptive quality |
| Stretch | – | Text/voice → 3D part (needs a provider and an API key) |

Performance numbers are **unmeasured on a real Quest 3S**: M0 in the plan still needs a device run.
