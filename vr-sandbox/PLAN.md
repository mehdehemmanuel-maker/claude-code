# VR Creative Sandbox: Build Plan

Plan v1, 2026-09-27. Nothing is built yet except the spikes in [`spikes/`](spikes/).
Anything marked **Verified** was measured or read from library source in this repo.
Everything else is a design decision, or an assumption with a named check that settles it.

**Contents**
0. [Decisions at a glance](#0-decisions-at-a-glance)
1. [What was verified before planning](#1-what-was-verified-before-planning)
2. [Product definition](#2-product-definition)
3. [Architecture](#3-architecture)
4. [Physics model: real, not scripted](#4-physics-model-real-not-scripted)
5. [Catalogs: materials, parts, connectors, tools, settings](#5-catalogs)
6. [Interaction and UX](#6-interaction-and-ux)
7. [Save format](#7-save-format)
8. [Template station](#8-template-station)
9. [Game feel](#9-game-feel)
10. [Performance plan for Quest 3S](#10-performance-plan-for-quest-3s)
11. [Testing and quality](#11-testing-and-quality)
12. [Milestones](#12-milestones)
13. [Stretch goal: text or voice to 3D part](#13-stretch-goal-text-or-voice-to-3d-part)
14. [When a native build makes sense](#14-when-a-native-build-makes-sense)
15. [Risks](#15-risks)
16. [Open questions](#16-open-questions)

---

## 0. Decisions at a glance

| Decision | Choice | Why |
|---|---|---|
| Platform | WebXR app in TypeScript + Vite. Runs in the Quest Browser, and the same build runs on desktop | No install and no native build chain, so it is the fastest way into a headset. Native is deferred (§14) |
| Renderer | three.js r186 `WebGPURenderer({ forceWebGL: true, multiview: true })` in XR (WebGL2 backend) | In r186 this is the only path that uses `OVR_multiview2`, which halves draw submission for stereo (verified in source, §1). Classic `WebGLRenderer` is the fallback |
| Physics | Jolt Physics (`jolt-physics` 1.1.0, WASM) in a Web Worker | Exposes constraint impulses, so real joint forces drive real failure (§4.4). Also has buoyancy from real shape volume, springs in N/m, gear, rack and pulley constraints, per-axis friction, and state save/restore. Rapier's JS API has no joint-force readback |
| Source of truth | A structured **build document** (assemblies → parts → features, plus connections, all keyed by ID) | The save is the document and the running world is a projection of it. This gives exact reconstruction, undo, and a clean hand-off to a future native port |
| Save format | Canonical JSON. The share code is `VRSB1.` + base64url(deflate) + CRC | Byte-exact round-trip can be proven with property tests (§7) |
| Realism rule | Every behaviour comes from generic laws plus cited material and spec data. No per-scenario scripts | Enforced by code rules and a physics conformance suite (§4.14, §11.3) |
| Scaling strategy | Merge rigid clusters. Fold installed fasteners into joints. Let bodies sleep. Keep segmented parts merged until they are stressed | Verified: 1,000 loose bodies cost 11.3 ms per step, but 1,000 parts merged into one compound cost 0.01 ms |
| Test without a headset | IWER (Meta's WebXR emulation runtime) in Playwright/Chromium, plus CPU-throttled perf proxies | Real frame-time numbers still need a real Quest 3S (§11.7) |

---

## 1. What was verified before planning

Run it yourself: `cd vr-sandbox/spikes && npm install && npm run physics`.

### 1.1 Physics spike (Jolt 1.1.0, WASM, Node 22, single thread)

| Check | Expected | Measured | Meaning |
|---|---|---|---|
| Force read back from a rigid joint holding a 10 cm steel cube | m·g = 76.98 N | **76.98 N** | Constraint impulse ÷ dt is the real joint force. Joint failure can come from real loads |
| Break when load exceeds a capacity of 150 N (ramped load) | break once F > 150 N | broke at 150.5 N, cube falls freely | The break-detect-and-remove loop works within one tick |
| Spring period, k = 400 N/m, m = 1 kg, 90 Hz | 0.3142 s | 0.3194 s (1 substep), 0.3153 s (2), **0.3144 s (4)** | Error 1.68% → 0.36% → 0.07%. Scenes with springs get automatic substeps (§4.1) |
| Buoyancy, submerged fraction for ρ = 250 / 500 / 800 kg/m³ | 0.250 / 0.500 / 0.800 | **0.250 / 0.500 / 0.800** | Jolt integrates the real submerged volume of the shape. The input is the density ratio |
| Mass from density | 0.001 m³ × 7850 kg/m³ = 7.850 kg | 7.850 kg | Mass and inertia come from geometry × material density |
| Step cost: 100 / 250 / 500 / 1,000 loose awake boxes piled up | – | 0.42 / 1.43 / 3.35 / **11.26 ms** | Roughly linear to 500, then superlinear as contacts pile up |
| Step cost: 250 boxes in rigid SixDOF chains | – | 3.69 ms | Many rigid joints cost about as much as a contact pile |
| Step cost: the same 1,000 parts as **one compound body** | – | **0.01 ms** | Merging rigid clusters is the biggest scaling lever (§10.4) |

The machine was a 4-core Intel Xeon at 2.1 GHz, so none of these are Quest numbers.
Until a device measurement exists, assume a Quest 3S core is 1.5–2.5× slower.

### 1.2 API facts confirmed from library typings and source

- **Jolt JS bindings**
  - `GetTotalLambda*` force readback exists on Hinge, Slider, Point, Distance, Cone, SwingTwist, SixDOF, Gear and RackAndPinion constraints.
  - `FixedConstraint` has no force getters in the bindings. Rigid joints will therefore be SixDOF constraints with all six axes locked (this is what the spike measured).
  - Also present: `ApplyBuoyancyImpulse`, `SpringSettings` with `ESpringMode` stiffness/damping, `SixDOFConstraint.SetMaxFriction` per axis, motors, `GearConstraint`, `RackAndPinionConstraint`, `PulleyConstraint`, `PathConstraint`, `ContactListenerJS` with `ContactSettings.mCombinedFriction`, `StateRecorderImpl` (save/restore), `MutableCompoundShape`, motion quality (CCD), and collision groups.
  - Builds exist for single-thread, multithread (needs `SharedArrayBuffer`), wasm and wasm-compat.
- **Jolt WASM heap is fixed-size.** Creating worlds without freeing them caused an out-of-memory abort in the spike. The app keeps one long-lived world and pools shapes.
- **Rapier 0.21 JS**: the `ImpulseJoint` typings have no impulse or force getter (contact-force events do exist). That alone rules it out as the primary engine.
- **three.js r186**
  - Multiview exists only in `renderers/common` (`WebGPURenderer`). `XRManager` disables it under the WebGPU backend ("WebGPU XR does not support multiview yet"). The WebGL2 backend implements it with `OVR_multiview2` and `framebufferTextureMultisampleMultiviewOVR`. Hence `forceWebGL: true`.
  - `WebGPURenderer` allocates an extra full-screen framebuffer target whenever tone mapping is on, or the output color space differs from the working color space (`needsFrameBufferTarget`). That costs a full-resolution pass on Quest's tile-based GPU, so tone mapping and sRGB encoding happen inside the material shaders instead (§10.2).
  - The WebGL backend uses `WEBGL_multisampled_render_to_texture`, so MSAA resolves on-tile.
  - `BatchedMesh`, `InstancedMesh` and `setFoveation` are available.
- **IWER 2.5** ships `metaQuest3`, `metaQuest2` and `metaQuestPro` device presets, but no Quest 3S. The 3S uses the same XR2 Gen 2 chip and Touch Plus controllers, so tests use the `metaQuest3` preset with the 3S per-eye resolution.

### 1.3 What cannot be verified here

- Real frame times, thermals and GPU cost on a Quest 3S.
- Which Quest Browser features are actually available at runtime (multiview, layers, foveation, Web Speech).
- How the controls feel.

These gate M0 exit and need a device (§11.7, §16).

---

## 2. Product definition

### 2.1 Pillars
1. **Real, not scripted.** Behaviour emerges from geometry, materials, connection specs and physical law.
2. **Nothing between an idea and the build.** Creative mode: unlimited catalog, instant edits, undo everything.
3. **Feels alive.** Every interaction has sound, particles, haptics and visual response, all driven by the physical state.
4. **Smooth on Quest 3S.** A 90 Hz target, a 72 Hz floor, and workarounds before limits.

### 2.2 Core loop
**Build → Test → Break → Rewind → Tweak.** Rewinding a destructive test has to be one button press. That is what makes experimenting free.

### 2.3 World model
- **Physics is always live** (Garry's Mod style). Time controls: pause, single-step, and 0.05×–2× time scale. Slow motion is real physics with less simulated time per wall-clock second, not a fake.
- **Frozen vs dynamic.** Any part or assembly can be frozen, which pins it to the world as a static body at zero simulation cost. The placement mode is a toggle: "place frozen" (the default while building) or "place dynamic".
- **Checkpoints.** A checkpoint stores the full sim state (Jolt `StateRecorderImpl`) plus the document revision. There is a ring buffer of automatic checkpoints (taken on every unfreeze or test start) and named manual ones.
- **Design pose vs live pose.** The document stores design poses. "Commit pose" writes the live pose back, for example after a structure settles. A save can include an optional live snapshot.
- **Creative-mode rules.** No health, fall damage, combat or survival systems. Free flight. Every part, tool and material is always available. Place, move, duplicate and delete are instant, and every edit can be undone, including breaks caused by the simulation.

### 2.4 Non-goals for v1
- Survival or progression systems.
- Multiplayer. The command-based document model doesn't rule it out later.
- Fluids beyond water volumes with a flat or wave surface.
- Finite-element soft bodies. Part failure uses segmented rigid bodies instead (§4.7).
- Electrical circuits beyond supplying power to motors.

---

## 3. Architecture

### 3.1 Stack (pin exact versions in M0)
- **Core:** TypeScript (strict), Vite, `three` 0.186.x, `jolt-physics` 1.1.0.
- **VR UI:** `@pmndrs/uikit` (vanilla three flexbox UI). M0 compares it against a custom `troika-three-text` panel system.
- **Geometry:** `three-bvh-csg` for CSG in a worker (drilled and cut visuals), `three-mesh-bvh` for picking.
- **Save codec:** `fflate` for deflate.
- **Schemas:** TypeBox, one schema that yields both TS types and JSON Schema (save files, part and connector params, materials).
- **Tests:** Vitest, fast-check (property tests), Playwright on the pre-installed Chromium, and `iwer` + `@iwer/devui` for XR emulation.

### 3.2 Threads
```
Main thread (XR frame loop)                  Physics worker                        Geometry worker
───────────────────────────                  ──────────────                        ───────────────
input → interaction → commands               Jolt world (one, long-lived)          parametric meshes
document store + undo                        force fields: magnets, bands,         CSG (holes, cuts)
render reconciler → three scene              eddy brakes, air drag, buoyancy       2D convex partition
audio / haptics / particles  ◄── events ──   load-dependent friction               (plates with holes)
UI panels (schema-driven)                    failure evaluator (§4.4)              fracture pieces
interpolate poses ◄── SAB transform ring ──  cluster merge / split (§10.4)         thumbnails
```
- Physics runs at a fixed 90 Hz. Rendering runs at 72, 90 or 120 Hz and interpolates between the last two physics states.
- When cross-origin isolated, transforms flow through a `SharedArrayBuffer` double buffer guarded by a sequence counter. Otherwise they go as transferable `ArrayBuffer`s each tick.
- Events flow the other way: contact (impulse, point, material pair, relative velocity), joint load, joint break, slip, plastic yield, fastener freed, magnet snap.

### 3.3 Data flow
```
Tool / UI action ──► Command ──► Document (change set, undo stack) ──► reconcilers ──► render / physics
                                        ▲
Physics event (e.g. joint broke) ───────┘  (becomes a command, so breaks are undoable and saved)
```
The document is the only source of truth for *design*. The physics world holds only *live* state. A simulation event that changes design, such as a connection failing or a rod bending permanently, is written back as a command. So a save made after a crash test contains the wreck, and undo or rewind restores it.

### 3.4 Directory layout
```
vr-sandbox/
  PLAN.md                 this file
  spikes/                 de-risking spikes (not app code)
  src/
    app/                  boot, capability detection, XR/desktop mode, quality manager
    doc/                  document model, IDs, commands, undo/redo, selection
    schema/               TypeBox schemas (build file, params, materials)
    data/                 materials, threads, fastener classes, adhesives, magnets, friction pairs
                          (JSON; every value carries source + confidence)
    engineering/          PURE formulas, no three/jolt imports: threads, preload, withdrawal,
                          welds, springs, beams/sections, buckling, magnets, eddy, gears, bearings
    physics/              worker, world, body/constraint builders, force fields, failure/, clusters/
    parts/                parametric families: geometry(), collision(), mass(), features, segmentation
    connectors/           connector types: schema, derive(), toJolt(), failure modes
    tools/                tool definitions and operations
    interaction/          input abstraction, grab, snapping, gizmos, locomotion, player scale
    ui/                   palette/hotbar, wrist menu, property panels, desktop HTML overlay
    render/               renderer setup, TSL materials, instancing/batching, LOD, particles, environment
    audio/                modal-synthesis bake, voice pool, spatialisation, tool loops
    persistence/          canonical JSON, codec, migrations, IndexedDB library, import/export, share
    templates/            template station
    gen3d/                stretch goal, gated (§13)
  public/templates/*.vrsb.json
  tests/{unit,golden,conformance,codec,e2e,perf}/
```
`engineering/` and `data/` are deliberately engine-agnostic. They plus the save format and the JSON test fixtures are what a future native port reuses.

---

## 4. Physics model: real, not scripted

### 4.1 Units, solver, and the stiffness-regime rule
- **Units.** SI internally: m, kg, s, N, Pa. Metric/imperial is a display setting only.
- **Solver.** Jolt single precision, fixed 90 Hz. Default solver settings are tuned in M0 for small parts. Jolt's default penetration slop and speculative contact distance (0.02 m) suit metre-scale scenes, so they get scaled down for millimetre-scale work.
- **Stiffness-regime rule (automatic substeps).**
  1. Compute each spring's natural frequency ωₙ = √(k/m_eff).
  2. Raise substeps (1 → 4) until ωₙ·Δt_sub ≤ 0.25. The spike shows this keeps spring period error under 0.4%.
  3. If even 4 substeps can't satisfy it, simulate the connection as rigid.
  4. The UI states why, for example "rigid: fₙ = 3.2 kHz above sim limit".

  This is honest: a bolted steel joint really does deflect only micrometres, so it behaves as rigid anyway.
- **Gravity.** 9.80665 m/s² by default. Presets for Moon (1.62), Mars (3.71), zero-g, or any custom vector.
- **Air.** ρ = 1.204 kg/m³. Quadratic drag F = ½ρC_dAv² uses a projected area from the shape and C_d for the shape family (sphere 0.47, cube 1.05, flat plate 1.28, …). It can be toggled. This makes parachutes, sails and flutter emerge with no special code.
- **Collision filtering.** Parts joined by a connection don't collide with each other at that joint (Jolt collision groups). Otherwise they collide normally.
- **Size limits (honest).** Free-floating bodies smaller than about 5 mm are unstable in any real-time engine. Installed small fasteners are therefore never free bodies (§10.4). Tiny loose parts use scaled convex radii plus CCD, and are covered by tests.

### 4.2 Mass properties and collision geometry
- **Mass** = density × exact volume of the parametric geometry, minus features such as holes (verified). Inertia comes from Jolt's shape mass properties.
- **Tubes and hollow sections** are exact. Composite parts, such as a wheel with a tyre, are compounds with a density per sub-shape.
- **Collision shapes** use exact primitives where possible (box, cylinder, capsule, sphere). Tubes are compounds of convex ring segments, so a rod can slide through a tube.
- **Plates with holes and cutouts** get a 2D convex partition (Hertel–Mehlhorn) of the outline minus holes, extruded into convex prisms. A pin can then pass through a drilled hole for real.
- Jolt doesn't support mesh–mesh collision on dynamic bodies, so arbitrary meshes get convex decomposition (only for imported or generated parts, §13).
- Mass and centre-of-mass overrides are allowed, and shown as "non-physical override".

### 4.3 Contact friction and restitution
- **Material-pair table**: static and kinetic friction coefficients, restitution, and rolling resistance for each pair (about 60 pairs initially). Unlisted pairs fall back to the geometric mean.
- **How it's applied.** `ContactListenerJS` sets `ContactSettings.mCombinedFriction/Restitution` from the pair table when a contact is added. When a contact persists, it switches between μs and μk by the tangential slip speed at the contact (below 1 cm/s counts as static).
- **Risk: callback cost.** At thousands of contacts, the JS↔WASM calls may be expensive (M0 measures this). The fallback encodes each material's friction per body so Jolt's built-in combine gives the pair value, and uses callbacks only for pairs that deviate.
- **Surface condition** is a per-part setting (dry, oiled, greased, rubber-coated). It scales μ using data from the pair table.

### 4.4 Connections: real loads, real capacities, real failure
This is the heart of "not scripted".

1. **Each connection is one Jolt constraint.** Rigid and structural connections use a SixDOF with all axes fixed. The native types (Hinge, Slider, Point, SwingTwist, Distance, Gear, RackAndPinion, Pulley) are used where they fit.
2. **Every tick, read the force.** Read the lambda (impulse) and compute force and torque as λ/Δt (verified exact).
3. **Resolve into load modes** in the connection's own frame: axial N, shear V₁ and V₂, bending M₁ and M₂, and torsion T.
4. **Compute utilisation.** Each connection type has capacity functions built from real specs (§4.5–§4.6). Utilisation is u = max over failure modes of load ÷ capacity.
5. **Filter.** Yield-type modes use a short sustained-load filter (median over 3 ticks), so single-tick solver spikes don't break joints. Fracture modes use the peak. The window is a setting, and conformance tests calibrate it with drop tests of known energy.
6. **Apply the outcome for the mode that tripped.**
   - **Break**: remove the constraint and promote the fastener pieces to real bodies.
   - **Slip**: a friction-grip joint becomes friction-limited on the slipping axes. Friction = μ × clamp load, with a limit at the hole clearance.
   - **Yield**: a permanent offset or rotation is written to the document.
   - **Pull-out**: a screw becomes a slider along its axis, with friction decaying over its thread engagement length.
   - **Strip**: the threads shear and the nut spins free.
   - **Peel**: an adhesive unzips progressively from the loaded edge.
7. **Show it.** A stress overlay colours every connection and segment by u (green, then yellow at 0.7, red at 1.0), with live numeric readouts on hover or point. Creak sounds start above u ≈ 0.8 (§9.1), so structures warn you before they go.
8. **Override anything.** Break force, break torque, stiffness and damping can all be overridden per connection, with a visible badge.

### 4.5 Fasteners (capacities from real specs)

**Threaded fasteners** (ISO metric coarse and fine first; UNC/UNF later)
- **Thread geometry is computed, not tabulated.** d₂ = d − 0.6495P, d₃ = d − 1.2269P, and tensile stress area Aₛ = (π/4)(d − 0.9382P)². Examples: M6 = 20.1 mm², M8 = 36.6 mm², M10 = 58.0 mm².
- **Strength.** ISO 898-1 property classes 4.6, 5.8, 8.8, 10.9 and 12.9 (Rm, ReL/Rp0.2). Nuts per ISO 898-2. Stainless A2-70 and A4-80 per ISO 3506.
- **Tightening (VDI 2230).** M_A = F_M·(0.16·P + 0.58·d₂·μ_G + (D_Km/2)·μ_K), where μ_G and μ_K come from the surface finish (black oxide, zinc, oiled, dry stainless). Tools apply a torque, and preload F_M is solved from it.
- **Over-tightening is a real failure.** The combined tightening stress σ_vm = √(σ² + 3τ²) exceeding Rp0.2 yields or snaps the bolt in the wrench.
- **Joint capacities**
  - Friction-grip slip: F_slip = μ_T·F_M·n_interfaces.
  - Joint separation: once the external axial load exceeds F_M·(1 − Φ). v1 uses a simplified load factor; v2 computes it from joint stiffness.
  - Bolt tensile fracture: Aₛ·Rm.
  - Bolt shear: about 0.6·Rm times the thread or shank area. Which one depends on where the shear plane falls in the geometry.
  - Bearing on the plate: about 2.5·d·t·Rm,plate.
  - Thread stripping: from engagement length and material. A short engagement in tapped aluminium strips early.
- **Later (M7+):** vibration loosening (Junker-style).

**Wood fasteners**
- **Withdrawal.** Uses the ultimate-load withdrawal equations from the USDA Wood Handbook, chapter 8, not NDS design values (which include safety factors). Scaling is with specific gravity G, diameter D and penetration: nails ∝ G^2.5·D·L, screws ∝ G²·D·L, lag screws ∝ G^1.5·D^0.75·L. Constants are transcribed with citations in M3 and locked by golden tests.
- **Lateral.** Yield-limit equations (modes I–IV) using dowel bearing strength derived from G.
- **Penalties.** End-grain and edge-distance factors apply, and splitting occurs if edge distance or pilot hole is inadequate. Grain direction is a real part parameter.

**Rivets, pins and keys**
- Solid rivets: τ_u·A. Blind rivets: vendor per-size shear and tension data (cited).
- Rivets also check bearing and tear-out on the sheet.
- Shear pins are deliberate weak links that fail on purpose.

### 4.6 Welds, solder and adhesives
- **Welds**
  - Fillet weld capacity = 0.707·a·L·0.6·F_EXX (E70 filler: F_EXX ≈ 483 MPa). Groove welds use the full section at the weaker of base metal and filler.
  - Heat-affected zones weaken heat-treated alloys (6061-T6 as-welded ≈ 165 MPa ultimate, per AWS D1.2).
  - **Weldability matrix**: steel–steel works, aluminium–aluminium works with TIG/MIG, aluminium–steel gives zero fusion strength, and wood scorches.
  - **Weld quality comes from the tool settings** through heat input Q = η·V·I/v. Too cold gives lack of fusion (capacity × quality factor q < 1). Too hot on thin sheet burns through, which leaves a real hole feature.
- **Solder**
  - Only metal pairs that wet work: Cu, brass, tinned steel. Aluminium needs special flux.
  - Capacity is the alloy shear strength (Sn63Pb37, SAC305) × joint area.
  - Reheating the joint melts it.
- **Adhesives**
  - Types: structural epoxy, 5-minute epoxy, cyanoacrylate, PVA wood glue, PU construction adhesive, hot-melt, silicone RTV, contact cement, and foam tape.
  - Each carries lap-shear strength and a much lower peel/cleavage strength, so adhesive joints fail in peel on their own.
  - Also: gap-fill limits and substrate compatibility (for example, CA on PE/PP ≈ 0).
  - **Cure curve**: strength fraction vs time, plus a "cure clock" setting of real, ×60, or instant. It is honest either way, because strength ramps with the cure fraction.
  - All values come from technical data sheets, with citations.

### 4.7 Parts that bend and break
Structural stock (rods, tubes, bars, beams, lumber, plates, sheets) is simulated as **segmented bodies**.

- **Segments and bonds.** A part is K segments along its length (a coarse grid for plates), joined by SixDOF **material bonds**.
- **Bond capacity** comes from section properties at the cut, computed from geometry (A, I, S elastic, Z plastic, J), combined with the material (σ_y, σ_u, τ, elongation at break). Wood and composites are anisotropic, with grain direction as a part parameter.
- **Behaviour by material class**
  - **Ductile metals and polymers**: elastic, then a **plastic hinge**. The bond's rotation axes become friction-limited at the plastic moment M_p = Z·σ_y (SixDOF `SetMaxFriction`), which is exactly perfectly-plastic behaviour. Plastic rotation accumulates until fracture at the strain limit. The bend is written to the document, so a bent rod saves bent.
  - **Brittle materials** (glass, cast iron, acrylic, concrete, wood loaded across the grain): elastic, then fracture at σ_u with no plastic phase. Sharper sound, more debris.
  - **Slender flexible parts**: when a segment's bending stiffness E·I/L_seg passes the stiffness-regime rule, bond rotations become springs. So a long thin aluminium rod visibly whips, and a steel I-beam doesn't.
  - **Buckling**: compression members are checked against Euler buckling, P_cr = π²EI/(KL)², on the whole member. When P_cr is exceeded, the bonds switch to their elastic or plastic mode so the member actually buckles.
- **Visuals.** Each segmented part is one skinned mesh whose bones are the segments, so bends are smooth with no seams. On fracture, pre-cut sub-meshes with jagged caps swap in and debris particles spawn.
- **Performance.** Fracture resolution K is a slider, adaptive by slenderness by default. Unstressed segmented parts collapse into one compound body and re-split under load (§10.4).

### 4.8 Stored energy: springs, bands, ropes, gas springs
- **Coil springs** are parametric: wire d, mean diameter D, active coils nₐ, free length, material.
  - Rate k = G·d⁴ / (8·D³·nₐ).
  - Shear stress τ = K_W·8FD/(πd³), with Wahl factor K_W = (4C − 1)/(4C − 4) + 0.615/C, where C = D/d.
  - Coil bind at solid height acts as a hard stop.
  - The spring takes a permanent set if τ exceeds the allowable stress. For music wire, S_ut = A/d^m with A = 2211 MPa·mm^m and m = 0.145 (Shigley).
  - Extension springs have initial tension. Torsion springs: k_θ = E·d⁴ / (64·D·n) N·m/rad.
  - Implemented with Jolt stiffness/damping springs in N/m (verified to within 0.07%).
- **Resistance bands, bungees and rubber** are tension-only and hyperelastic (neo-Hookean): F = G·A₀·(λ − λ⁻²). They have hysteresis damping and snap at λ_break. Applied as a worker force per tick, with tangent stiffness feeding the substep rule.
- **Ropes, cables and chains** are tension-only distance constraints (min 0, max L), with stiffness EA/L when inside the stiffness regime and breaking loads from grade data. A "physical rope" mode uses segmented capsules for draping and wrapping, with a segment-count slider.
- **Gas springs** follow force vs stroke (P·A with polytropic compression) plus damping.
- **Energy readouts.** A debug HUD shows elastic, kinetic and potential energy per assembly. The conformance tests use the same numbers.

### 4.9 Magnets and magnetic resistance
- **Magnet parts**: disc, ring, block, sphere or magnetic base. Grades: NdFeB N35–N52, ferrite, SmCo, AlNiCo. Magnetisation axis is a parameter.
- **Magnet ↔ magnet force uses the Gilbert (magnetic charge) model.**
  - Each pole face carries surface charge σ = B_r/μ₀, integrated over a small quadrature grid.
  - Pairwise forces are summed. This is finite at contact, unlike point dipoles, and correct at 1/r⁴ in the far field.
  - Torques come from the off-centre forces. Magnets flip, align and clack together with no snap logic.
- **Magnet ↔ ferromagnetic part** (steel and iron; not austenitic 304/316 stainless, not aluminium):
  - Uses the method of images: a mirror magnet at twice the gap from the nearest steel face.
  - A saturation factor scales it by plate thickness.
  - It is calibrated against published pull-force-vs-gap and plate-thickness data.
- **Cost control.**
  - Pairs are found through the Jolt broadphase within a cutoff radius. The cutoff is where the force drops below 0.1% of the lighter body's weight.
  - Quadrature resolution adapts to distance: 1 point when far, 7–19 when near.
- **Calibration target.** Contact pull and force-vs-gap for a named N42 disc, within ±15%. The conformance test fixes the reference data.
- **Magnetically resisted connector (eddy-current brake)**
  - A conductive rotor (Cu at 5.96×10⁷ S/m, or aluminium by alloy) passes through a magnet gap.
  - Damping torque τ = c·ω, with c ≈ σ·t·B²·A·R² × an edge factor. B comes from the Gilbert model for the chosen grade and gap. Braking rolls off at high ω as skin depth thins.
  - Optional cogging or detent torque comes from rotor and stator magnet counts.

### 4.10 Buoyancy and water
- **Water volumes**: tank, pool or lake. Density is fresh 998, salt 1025 kg/m³, or custom. The surface is flat in v1, with gentle waves in v2 (a height function sampled per body).
- **Buoyancy.** `ApplyBuoyancyImpulse` with ρ_fluid/ρ_part uses the real shape to find the submerged volume (verified exact).
  - Sealed hollow parts use their effective density (shell plus enclosed air).
  - Open containers filling with water is v2.
- **Water drag** is linear plus angular from the same call, plus a quadratic term by projected area. Splash particles and sounds scale with entry speed × area.

### 4.11 Transmissions, bearings and load-dependent friction
- **Gears**: spur first (bevel, worm and helical later). Parametric: module m, tooth count z, pressure angle, face width b, material.
  - When two gears sit at centre distance m(z₁ + z₂)/2 (within tolerance) with parallel axes, a `GearConstraint` with ratio z₁/z₂ is created. Mesh detection is geometric, so it works for any gear pair, not a scripted list.
  - Tooth bending stress is the Lewis equation, σ = F_t/(b·m·Y), with F_t from the constraint's lambda. When it's exceeded the teeth strip, the coupling is removed, and the gears spin free with a ratchet sound.
- **Rack & pinion and lead screws** use `RackAndPinionConstraint` (for a lead screw, ratio = 2π/lead). Self-locking emerges from thread friction torque, which is computed each tick from axial load.
- **Pulleys and belts.** `PulleyConstraint` handles pulley systems. Belt drives are ratio couplings that slip when the transmitted torque exceeds the capstan limit, T₁/T₂ = e^{μθ}.
- **Bearings.** Friction torque M = ½·μ·P·d, where P is the radial load from last tick's lambda (SKF simple model, deep-groove μ ≈ 0.0015). Plain bushings take μ from the pair table. Seals add a constant drag.
- **General pattern**: for any joint, friction = μ × the normal load from the previous tick's constraint force.

### 4.12 Powered parts (for vehicles and machines)
- **DC motor**: τ(ω) = τ_stall·(1 − ω/ω₀), from Kv/Kt, R and V specs. Gearmotors add a ratio and efficiency. Current and heat are read out.
- **Other actuators**: servo (position control with a torque limit), stepper (holding torque, and missed steps when overloaded), linear actuator, pneumatic cylinder (F = P·A), hydraulic ram.
- **Battery**: voltage and internal resistance. Infinite energy by default in creative mode, with a toggle.
- **Controls**: switches, plus an in-VR "remote" that maps controller buttons and sticks to actuators. This is what makes drivable karts, cranes and diggers possible.
- **Implementation**: Jolt velocity motors whose max torque is updated every tick from the torque-speed curve.

### 4.13 Tool physics
How each tool works is in the tool table (§5.4). The common pattern: a tool's effect comes from its real rating (RPM, torque, power, amps, head mass) against the material's real resistance (hardness, specific cutting energy, withdrawal and embedment strength). Nothing is a timer.

- **Hammering a nail** is an energy balance per blow. Penetration depth = impact energy ÷ resistance. An off-axis blow bends the nail.
- **A drill** feeds at a rate set by bit and material. If it binds, the motor stalls along its torque curve.

### 4.14 How "not scripted" is enforced
1. **No identity branches.** No code path branches on part identity, template or scenario. Behaviour depends only on geometry, material data, connection specs, tool settings, and generic laws. Code review and lint rules enforce this (for example, no template ID inside `physics/`).
2. **Cited data.** Every constant in `data/` carries a `source` (standard, handbook table or datasheet) and a `confidence` (spec, typical, or estimated). Estimated values show an ⓘ badge in the UI.
3. **Golden tests for formulas.** Every formula in `engineering/` has golden tests built from published worked examples.
4. **Laws, not builds.** The conformance suite (§11.3) tests physical laws, not particular builds.
5. **Visible overrides.** Overrides are allowed, because creative freedom matters, but they are always visible and saved as `override`. That way nobody mistakes them for physics.

---

## 5. Catalogs

The catalogs grow **by data, not code**. A new grade, thread size or adhesive is a JSON entry with a source.

### 5.1 Materials (initial set)
Values are typical handbook values (ASM/MatWeb-class sources, USDA Wood Handbook for timber). Each is pinned with a citation when it lands in `data/` (M1). Every material also carries: Poisson ratio, shear modulus, hardness, a friction class, whether it's ferromagnetic, electrical conductivity, a weldability class, a sound class (modal parameters, §9.1), a spark signature (§9.2), and its PBR look.

| Material (grade) | ρ kg/m³ | E GPa | σ_y MPa | σ_u MPa | Elong. % | Magnetic | Notes |
|---|---|---|---|---|---|---|---|
| Structural steel ASTM A36 | 7850 | 200 | 250 | 400–550 | 20 | yes | weldable |
| Steel AISI 1018 cold drawn | 7870 | 205 | 370 | 440 | 15 | yes | machining stock |
| Steel AISI 4140 annealed | 7850 | 205 | 415 | 655 | 26 | yes | Q&T variants later |
| Music wire ASTM A228 | 7850 | 207 (G ≈ 81) | – | 1590–2750 (by d) | – | yes | springs |
| Stainless 304 annealed | 8000 | 193 | 215 | 505 | 70 | no (austenitic) | threads gall |
| Stainless 316 annealed | 8000 | 193 | 205 | 515 | 60 | no | |
| Grey cast iron class 30 | 7200 | ~100 | – | ~214 (tension) | <1 | yes | brittle |
| Aluminium 6061-T6 | 2700 | 68.9 | 276 | 310 | 12 | no | HAZ ~165 MPa as welded |
| Aluminium 7075-T6 | 2810 | 71.7 | 503 | 572 | 11 | no | not fusion-weldable |
| Aluminium 5052-H32 | 2680 | 70.3 | 193 | 228 | 12 | no | sheet |
| Aluminium 2024-T3 | 2780 | 73.1 | 345 | 483 | 18 | no | aircraft sheet |
| Copper C110 annealed | 8890 | 115 | 69 | 220 | ~50 | no | 5.8×10⁷ S/m |
| Brass C360 | 8500 | 97 | 124–310 | 338–469 | temper-dep. | no | by temper |
| Titanium Ti-6Al-4V annealed | 4430 | 114 | 880 | 950 | 14 | no | |
| Douglas-fir (coast), 12% MC | ~530 (SG 0.48) | 13.4 | – | MOR 85 | – | no | anisotropic |
| Southern pine (loblolly) | ~570 (SG 0.51) | 12.3 | – | MOR 88 | – | no | |
| Eastern white pine | ~400 (SG 0.35) | 8.5 | – | MOR 59 | – | no | |
| Red oak (northern) | ~700 (SG 0.63) | 12.5 | – | MOR 99 | – | no | |
| White oak | ~750 (SG 0.68) | 12.3 | – | MOR 105 | – | no | |
| Hard (sugar) maple | ~700 (SG 0.63) | 12.6 | – | MOR 109 | – | no | |
| Balsa | ~160 | ~3.4 | – | MOR ~21 | – | no | varies widely |
| Birch plywood / MDF / OSB | product data | | | | | no | panel standards |
| ABS | ~1050 | ~2.2 | – | ~40 | | no | |
| PLA | ~1240 | ~3.5 | – | 50–60 | | no | |
| Nylon 6/6 (dry) | ~1140 | ~2.8 | – | ~80 | | no | |
| Acetal (POM) | ~1410 | ~3.0 | – | ~70 | | no | low friction |
| Polycarbonate | ~1200 | ~2.4 | ~62 | ~65 | | no | tough |
| HDPE | ~950 | ~1.0 | ~26 | ~30 | | no | CA won't bond |
| PTFE | ~2200 | ~0.5 | – | 20–30 | | no | μ ≈ 0.04–0.1 |
| Acrylic (PMMA) | ~1180 | ~3.2 | – | ~70 | | no | brittle |
| Natural rubber / latex | ~930 | G ≈ 0.4–0.6 MPa | – | λ_break ≈ 6–8 | | no | hyperelastic |
| Soda-lime glass | 2500 | 72 | – | ~40 tension (flaw-dependent) | | no | brittle |
| Concrete (30 MPa) | 2400 | ~30 | – | 30 comp. / ~3 tension | | no | brittle |

**Magnet materials**, remanence B_r: NdFeB N35 1.17–1.21 T, N42 1.28–1.32 T, N52 1.43–1.48 T (ρ ≈ 7500), ferrite ~0.38–0.40 T (ρ ≈ 4900), SmCo 2:17 ~1.05–1.12 T, AlNiCo 5 ~1.25 T (low coercivity, so it demagnetises easily).

**Friction pairs**: about 60 initial pairs from Marks' Handbook and Engineering ToolBox-class sources, stored as ranges with the midpoint as default. For example, dry steel–steel μs 0.5–0.8, oiled steel–steel 0.1–0.16, wood–wood 0.25–0.5, PTFE–steel 0.04–0.1, and rubber on dry concrete 0.6–0.85.

### 5.2 Parts (parametric families; every dimension editable, presets are just starting values)
| Family | Members | Key parameters |
|---|---|---|
| Stock | round/square/hex rod and bar, flat bar, plate, sheet | length, section dims, material, grain/rolling direction, fracture resolution |
| Tube | round, square, rectangular | outer dims, wall thickness, length |
| Structural | angle, channel, I-beam, T-slot extrusion (20/30/40 series), lumber (2×4 = 38×89 mm actual), dowel, plywood/MDF/OSB sheet | standard profile presets, all editable |
| Solids | block, disc, ring, sphere, cone, wedge, cylinder | dims |
| Threaded fasteners | hex bolt (ISO 4014/4017), socket head (ISO 4762), carriage bolt, threaded rod, set screw, eye bolt, hex/nyloc/wing nuts, T-nut | thread (d × P), length, property class/material, head, drive |
| Washers | flat (ISO 7089), split lock, fender | size, material |
| Wood and sheet fasteners | wood, machine, self-tapping and lag screws; common/box/finish nails; solid and blind rivets | size, material, point, drive |
| Pins | dowel, clevis, cotter, roll/spring, shear pin | diameter, length, material |
| Motion | butt/piano/strap hinges, ball bearings (608-type standard series), bushings, shafts and keys, linear rails, casters, wheels and tyres (compound sets μ and rolling resistance) | series/size, material |
| Transmission | spur gears, racks, sprockets + roller chain (ANSI 25/35/40), pulleys + belts (GT2, V), lead screws (Tr8×8 …), cams, levers | module/teeth/pitch/ratio |
| Stored energy | compression/extension/torsion springs, resistance bands, bungee, gas spring, rope/cable/chain, counterweights | wire d, D, n, free length, rubber section, rope grade |
| Magnets | disc, ring, block, sphere, magnetic base | grade, dims, magnetisation axis |
| Powered | DC motor, gearmotor, servo, stepper, linear actuator, pneumatic cylinder, battery, switch, remote | ratings |
| Hand tools as parts | claw/ball-peen/sledge hammers, mallets | head mass/material; usable as a tool **and** as a part you can bolt into a build |
| Custom mesh | imported glTF or generated (§13) | mesh + material, convex decomposition |

**Features** are sub-objects of a part with their own IDs: holes (through or blind, threaded or clearance, countersunk), slots, cuts or miters, bends, weld beads, and adhesive patches. Connections attach to features.

### 5.3 Connectors (each is a distinct type with its own adjustable stiffness, damping, strength and friction)
| Connector | Free DOF | Jolt mapping | Adjustable | Failure |
|---|---|---|---|---|
| Rigid (generic) | 0 | SixDOF, all fixed | break force and torque (derived or overridden) | load modes (§4.4) |
| Bolted / screwed / riveted / pinned | 0 until slip | SixDOF fixed → friction-limited | spec: thread, class, torque, μ, washers, rivet type | slip, tensile, shear, bearing, strip, pull-out |
| Welded / soldered / glued | 0 | SixDOF fixed | process and settings, size, adhesive type, cure | weld throat / solder shear / adhesive shear & peel |
| Clamped (clamp or vise) | 0 until slip | SixDOF fixed → friction-limited | clamp force (from screw torque) | slip at μ·F |
| Hinge (revolute) | 1 rotation | Hinge | limits, friction, motor (velocity or position, max torque), return spring, detents | pin shear, bearing |
| Free-spinning (bearing) | 1 rotation | Hinge | bearing type → load-dependent friction, seal drag | static load rating |
| Slider (prismatic) | 1 translation | Slider | limits, friction, motor, spring | rail load |
| Cylindrical | 1 rotation + 1 translation | SixDOF | limits, friction per axis | |
| Ball-and-socket | 3 rotation | SwingTwist / Point | cone and twist limits, friction | |
| Universal | 2 rotation | SixDOF | limits, friction | |
| Spring-loaded (linear, torsion, 6-DOF elastic mount) | spring axes | Distance spring / SixDOF limit springs | k (from spring part or entered), damping c or ratio ζ, preload, rest length | overstress → permanent set |
| Magnetically resisted | 1 rotation or translation | Hinge/Slider + worker torque | magnet grade, gap, rotor material and thickness, pole area → c; cogging | – |
| Ratchet (one-way) | 1 rotation, one direction | Hinge, limit updated per tick | teeth, backlash | pawl shear |
| Slip clutch / torque limiter | slips above limit | Hinge friction torque | breakaway torque | – |
| Gear / rack / pulley / belt coupling | couples two joints | Gear / RackAndPinion / Pulley | ratio (derived from geometry) | tooth bending (Lewis) / belt slip (capstan) |
| Rope / cable / chain | distance ≤ L | Distance (min 0) | length, EA, damping | breaking load |
| Latch / lock | 0 while engaged | SixDOF + state | engage force, strength | bolt/pawl shear |

Magnetic attraction is **not** a connector. It emerges from the magnet force field (§4.9).

### 5.4 Tool wall (usable, not decoration)
| Tool | What it really does | Settings | Physics basis | Feedback |
|---|---|---|---|---|
| Creative manipulator | select, move, rotate, duplicate, delete, freeze, resize | snap, grab mode | kinematic or spring grab (§6.7) | ghost, hum, snap clicks |
| Cordless drill / drill press | creates hole features | bit type (HSS/cobalt/carbide/spade/Forstner/hole saw), Ø, RPM, clutch | feed from material hardness and bit; torque from specific cutting energy; a bound bit stalls the motor and twists your hand | pitch drops under load, chips/swarf, haptics ∝ torque |
| Tap & die | threads a hole or rod | thread spec | threaded engagement without a nut; strip load from engagement length | ratchet clicks |
| Impact driver | drives screws and bolts | speed, torque mode | torque pulses → preload (VDI 2230) | blow rate rises as it seats |
| Wrenches / ratchet / torque wrench | tighten and loosen | target torque (click type) | VDI 2230; effort comes from your hand motion | click at target |
| Screwdrivers | manual screws | bit | hand torque limit | – |
| Hammers / mallet | drive nails, strike things | head mass | a real rigid body: impulse → penetration energy balance; off-axis blows bend nails | impact audio, bent nails |
| Welder (MIG/TIG/stick) | fuses metal | process, amps, volts, wire feed, travel speed | heat input → bead size, penetration, defects; weldability matrix | arc flicker, crackle, spatter, glowing bead that cools |
| Angle grinder | cuts and grinds | disc (cut-off/flap/wire), RPM | removal rate ∝ power ÷ specific energy; splits parts | sparks by material, pitch sags |
| Saws (hand, hack, circular, band, jig) | cut | blade and TPI | removal rate by material; kerf | sawdust or chips |
| Rivet gun | blind rivets | rivet size and material | mandrel break load; rivet capacity | pop, recoil haptic |
| Soldering iron | solder joints | tip temp, alloy | wetting pairs, alloy shear | sizzle, flux smoke |
| Glue gun / adhesive applicators | bond | adhesive, bead size | shear/peel + cure curve | glossy bead, strings |
| Clamps (C, F, bar, spring), bench vise | temporary hold | screw torque → clamp force | friction hold μ·F | tightening creak |
| Pipe bender / sheet brake | plastic bending | angle, radius | plastic moment + springback (σ_y/E) | groan |
| Heat gun (v2) | desolder, soften plastics | temperature | simple thermal state | shimmer |
| Files / sander | deburr (cosmetic in v1) | grit | – | rasp |
| Measuring | tape, calipers, protractor, level, spring scale, load cell, tachometer, stopwatch | – | reads the real sim values | readouts |
| Test gear | calibrated weights, crane hook, drop tower, ramp | mass, height | real mass | readouts |
| Lathe / mill (later) | turned and milled features | – | – | – |

Tools can be physically grabbed off the wall, holstered on a tool belt, or summoned from a radial menu. All three routes lead to the same tool.

### 5.5 "Expose every setting": the property-schema system
Every material, part, feature, connector, tool and global setting is described by a typed schema:
```ts
{ key: 'wireDiameter', label: 'Wire diameter', unit: 'mm', type: 'number',
  min: 0.1, max: 50, step: 0.01, default: 2.0, group: 'Geometry' }
{ key: 'rate', label: 'Spring rate k', unit: 'N/mm', derived: 'k = G·d⁴ / (8·D³·nₐ)',
  overridable: true, group: 'Behaviour' }
```
- UI panels are generated from the schema, for both VR and desktop. They support search, basic/advanced groups, slider plus numeric entry, units, and live readouts.
- Derived values show their formula and inputs, with an **override** toggle.
- **Global settings**: gravity vector, time scale, physics rate, substeps (auto or manual), solver iterations, sleep thresholds, air density and drag, water density, failure filter window, cure clock, magnet quadrature resolution, default fracture resolution, snapping defaults, units, comfort options, quality level (auto or pinned), audio mix and HRTF voice budget, and haptic strength.

---

## 6. Interaction and UX

### 6.1 VR controls (Quest Touch Plus; hand tracking in M7)
| Input | Action |
|---|---|
| Left stick / right stick | fly (horizontal) / snap or smooth turn + vertical fly |
| Grip | grab (physical or creative, §6.7) |
| Trigger | use the active tool (place, drill, weld, …) |
| A / X | context: duplicate while held (A + grab), confirm |
| B / Y | radial menu (tools / palette) |
| Both grips on one object | two-hand rotate and scale |
| Grip + trigger (held) | precision mode: 10× slower motion |
| Left wrist (look at it) | palette, hotbar (9 slots, Minecraft style), time controls, checkpoints |

### 6.2 Desktop fallback
WASD + Space/Ctrl to fly and mouse look (pointer lock). Left click uses the tool, right click grabs, the scroll wheel pushes or pulls the held object. 1–9 select the hotbar, E opens the palette, Tab opens properties, R/F cycle rotation axis, G toggles snapping, P pauses, and [ / ] change time scale. Ctrl+Z/Y undo and redo, Ctrl+D duplicates, Del deletes, Ctrl+S saves. Gamepad support comes free with the input abstraction.

### 6.3 Creative operations
- **Place**: a ghost preview follows the hand or cursor, with a snapping preview, then commits on trigger.
- **Move and rotate**: grab it, or use gizmo handles. Two-handed rotation. Angle snapping.
- **Duplicate**: a part, a selection, or a whole assembly subtree with its internal connections. Boundary connections are optional.
- **Delete**: instant, and undoable.
- **Freeze / unfreeze**: a part, a selection, or everything connected.
- **Select**: single, box or lasso, or "select connected". Selections can be grouped into an assembly.
- **Resize**: dragging a handle edits the parametric dimension, so a rod gets longer instead of being scaled.

### 6.4 Snapping
- Grid, adjustable from 1 mm to 1 m.
- Angle, adjustable from 1° to 90°.
- Feature snaps: hole ↔ hole axis alignment for fasteners, flush faces, edge alignment, centre-on-face, and gear-mesh centre distance.
- Visual guides and measurement readouts appear while dragging.

### 6.5 Player scale
Player scale runs from 1/20× to 20×. It scales the camera rig only; physics is unchanged. Shrink down to build a watch escapement, or grow to build a crane. Locomotion speed scales with it.

### 6.6 Comfort
- Snap and smooth turning, with an optional comfort vignette.
- Teleport as an alternative to smooth flight, plus seated mode and height calibration.
- **No camera shake in XR, ever.** Impacts are felt through audio and haptics instead.

### 6.7 Physical grab vs creative grab
- **Creative grab** makes the part kinematic and moves it with infinite strength and exact precision.
- **Physical grab** attaches the part to your hand with a 6-DOF spring constraint, force-limited to human strength (about 250 N per hand by default, adjustable). Heavy parts lag and swing, and you can't lift a 500 kg steel block one-handed. **Heavier really does feel heavier.**
- The default is physical for dynamic parts and creative for frozen ones. A toggle switches it.

### 6.8 UI surfaces
- Wrist palette with search and categories, plus the hotbar.
- Radial tool menu.
- A property panel beside the selection, placed in the world (schema-driven).
- Time bar and checkpoint strip.
- Measurement HUD and stress-overlay toggle.
- On desktop, the same panels appear as an HTML overlay.

### 6.9 Undo and redo
The undo history holds at least 100 steps and covers simulation-caused changes such as breaks and bends. Undo covers the document; checkpoints cover the simulation.

---

## 7. Save format

### 7.1 Structure (excerpt: one part and one connection shown; pretty-printed here, the canonical form is minified with sorted keys)
```json
{
  "assemblies": [
    { "id": "a_7m2k9q4x1c0v", "name": "Trebuchet", "parent": null,
      "pose": { "p": [0, 0, 0], "q": [0, 0, 0, 1] } }
  ],
  "catalog": "2026.1",
  "connections": [
    { "a": { "feature": "f_9c4e6f2h7j1k", "frame": { "p": [0, 0, 0], "q": [0, 0, 0, 1] }, "part": "p_3n8r5t2w6y9b" },
      "b": { "feature": "f_2q8s4v6x0z3a", "frame": { "p": [0, 0, 0], "q": [0, 0, 0, 1] }, "part": "p_5h1d7g3k8m2p" },
      "fasteners": ["p_6b0d3f9g5h2j", "p_1k7m4n8p0q6r"],
      "id": "c_8t2v5w1x9y4z",
      "kind": "bolted",
      "params": { "class": "8.8", "muHead": 0.12, "muThread": 0.12, "thread": "M10x1.5", "torque": 49 },
      "state": { "status": "intact" } }
  ],
  "format": "vrsb",
  "materials": { "steel.astm-a36": { "E": 200e9, "density": 7850, "source": "…", "yield": 250e6, "…": "full property set" } },
  "meta": { "app": "0.1.0", "created": "2026-09-27T00:00:00Z", "name": "Trebuchet" },
  "parts": [
    { "assembly": "a_7m2k9q4x1c0v", "features": [
        { "axis": [0, 0, 1], "d": 0.0105, "id": "f_9c4e6f2h7j1k", "kind": "hole", "p": [0, 0.9, 0], "through": true } ],
      "frozen": false, "id": "p_3n8r5t2w6y9b", "kind": "stock.tube.rect", "material": "steel.astm-a36",
      "params": { "height": 0.05, "length": 2.4, "wall": 0.003, "width": 0.03 },
      "pose": { "p": [0, 1.2, 0], "q": [0, 0, 0, 1] } }
  ],
  "sim": { "airDensity": 1.204, "gravity": [0, -9.80665, 0], "waterDensity": 998 },
  "snapshot": null,
  "version": 1
}
```

### 7.2 Identity and hierarchy
- **IDs**: a type prefix (`a_`, `p_`, `f_`, `c_`) plus 12 random base32 characters. They are stable across save and load.
- **Duplication** gives fresh IDs and records the old→new map in the undo entry, so internal connections are re-pointed correctly.
- **Hierarchy**
  - Assemblies form a tree (`parent`), and parts belong to an assembly.
  - Features belong to parts.
  - Connections are graph edges between (part, feature, local frame) endpoints.
  - Fasteners are parts owned by their connection, so deleting the connection deletes its hardware.
- **Behaviour is self-contained.** The file embeds the full property set of every material it uses, plus the sim settings. Later catalog corrections can't silently change how an old build behaves. "Update to latest catalog" is an explicit action with a diff.

### 7.3 Canonical encoding (what "byte for byte" means)
1. UTF-8 with no BOM and no insignificant whitespace.
2. Object keys are sorted by code point. `assemblies`, `parts`, `connections` and `features` are sorted by `id`.
3. Numbers use ECMAScript shortest round-trip formatting (`JSON.stringify`, which is exact for float64). `-0` is normalised to `0`, and `NaN`/`Infinity` are rejected. Poses written back from physics are float32 values widened exactly to float64, so no precision is lost.
4. Quaternions are normalised with w ≥ 0. All units are SI.
5. Every parameter is written explicitly, with no omitted defaults. A change to a default in a later version can't alter an old build.

**Guarantees, proven by tests (§11.4)**
- `encode(decode(bytes)) === bytes` for every valid file.
- `decode(encode(doc))` deep-equals `doc`.
- Loading the same file twice gives identical Jolt `SaveState` bytes.
- The SHA-256 of the canonical bytes is shown as the build fingerprint.

### 7.4 Sharing
- **Code string**: `VRSB1.` + base64url(deflateRaw(canonical bytes)) + `.` + CRC32. It can be pasted, put in a URL fragment (`#build=`), or shown as a QR code so a build can move from phone or desktop to the headset.
- **Other channels**: `.vrsb.json` file download and upload, and an IndexedDB library with thumbnails.
- **glTF export** is visual only and never the source of truth.
- **Share codes are untrusted input.** Decoding enforces size limits and full schema validation, rejects `__proto__`/`constructor` keys, and is fuzzed.
- **Versioning**: `format` + `version` fields, with pure migration functions from vN to vN+1.

---

## 8. Template station
A shelf of build cards in the workshop. Each template is an ordinary `.vrsb` file, which proves the format. Each has a "what to try" card, and each doubles as a regression fixture.

| Template | Demonstrates |
|---|---|
| Trebuchet | gravitational potential → momentum, hinges, rope sling with release pin |
| Newton's cradle | restitution, momentum conservation (steel on steel) |
| Bolted steel truss bridge + test weights | preload, slip, bolt failure, member buckling and plastic collapse |
| Wooden shelf on screws + load | withdrawal vs lateral capacity, grain direction, edge distance |
| Magnet bench | magnet flipping and snapping, pull vs gap, a failed levitation attempt (Earnshaw's theorem, shown honestly), eddy-current brake with a copper disc |
| Spring launcher | coil spring stored energy → measured launch speed readout |
| Raft vs steel hull | buoyancy, density, sealed hollow sections |
| Go-kart | DC motor, chain drive, steering linkage, tyre friction: the "VR GTA" joyride |
| Gear train demo | ratios, bearing friction, stripping teeth under overload |

---

## 9. Game feel
Feedback is driven by the same physical quantities as the simulation, so it is never canned.

### 9.1 Audio
- **Impacts use modal synthesis.** Each material class has modal parameters. Frequencies scale with geometry and material, for example flexural modes of a bar f ∝ (h/L²)·√(E/ρ).
  - At load time, an `OfflineAudioContext` **bakes** a bank of material × size bucket × 3 variants into AudioBuffers, which is fast to generate and costs a few MB.
  - Playback is just buffer + gain + panner. A contact event selects the entry, gain ∝ log(impulse), and pitch tracks part size.
- **Scrape and roll loops** come from sustained contacts, with gain and pitch from slide or roll speed.
- **Tool loops follow real state.**
  - The drill whine tracks RPM and sags under load along the motor curve.
  - The impact driver's blow rate rises as a bolt seats. The torque wrench clicks at target.
  - The grinder pitch sags under cutting pressure. MIG crackle density follows wire feed.
  - The rivet gun pops when the mandrel breaks. Solder sizzles when flux hits.
- **Structural sounds.** A spring's "boing" is synthesised at its actual natural frequency. Magnets clack. A bolt snaps with a sharp transient plus ring. Wood cracks. **Metal creaks and groans once utilisation passes about 0.8**, so a failure is heard before it happens.
- **Budgets.** At most 24 voices, prioritised by loudness × proximity. HRTF panning for the nearest 6–8, equal-power beyond that. One shared short workshop reverb on a send.

### 9.2 Particles
- **One GPU particle system**: instanced quads in a ring buffer, simulated in the vertex shader from spawn parameters, so there is **zero CPU cost per particle**.
- **Sparks follow real spark-test signatures.**
  - Low-carbon steel: long yellow-orange streaks.
  - High-carbon steel: bright forking bursts.
  - Stainless: shorter orange streaks.
  - Titanium: brilliant white.
  - **Aluminium: no sparks at all.**
- **Other effects**: weld spatter and glow, wood chips and sawdust, dust puffs on heavy impacts, water splashes, and debris chunks. Debris is instanced and ballistic; only large chunks become physics bodies.

### 9.3 Haptics
Quest controllers use `gamepad.hapticActuators[0].pulse(intensity, ms)`, driven by real signals:
- Drill vibration ∝ load torque.
- A contact thump scaled by impulse.
- A click on snap or connect, and a heavy pulse on a break.
- A rising buzz while you hold a part whose load nears failure.
- A pulse rate that rises as you bring two magnets together.

### 9.4 Visual feedback
- Ghost previews and snap guides.
- A torque gauge ring while tightening.
- A glowing weld bead that cools on a Newtonian cooling curve.
- The stress overlay.
- A break flash plus debris.
- Subtle squash and pop animations on UI.

### 9.5 Environment
- A workshop with baked lighting: tool wall, benches, vise, pegboard, template shelf.
- An outdoor test yard with ramps, a water pool, a drop tower and open ground for vehicles.
- **Mixed-reality mode (M7)**: an `immersive-ar` passthrough session on Quest 3S. Build on your real desk, with detected planes becoming colliders.

---

## 10. Performance plan for Quest 3S

### 10.1 Target and budgets
- **Device.** Quest 3S: Snapdragon XR2 Gen 2, 8 GB RAM, 1832×1920 per eye, 72/90/120 Hz (per Meta's published specs; reconfirm on device).
- **Frame target.** 90 Hz = 11.1 ms, with a floor of 72 Hz = 13.9 ms.
- **Per-frame budgets at 90 Hz**

  | Area | Budget |
  |---|---|
  | Main-thread JS | ≤ 4 ms |
  | GPU | ≤ 9 ms |
  | Physics tick (worker, own core) | ≤ 7 ms |
  | Audio scheduling | ≤ 0.5 ms |

- **Initial render budget.** ≤ 150 draw calls per frame (multiview makes this per frame, not per eye). ≤ 400k triangles. At most one cached shadow map. **Zero post-processing passes in XR.**
- **Initial physics budget.** From the spike scaled by the assumed Quest slowdown: about 250–400 simultaneously awake loose bodies, unlimited sleeping or frozen parts, and thousands of parts inside merged clusters. M0 replaces this with device numbers.

### 10.2 Rendering
- **Multiview.** `WebGPURenderer({ forceWebGL: true, multiview: true })` means one submission for both eyes (verified present). M0 A/Bs it against `WebGLRenderer` on the device.
- **No hidden full-screen pass.** Set `toneMapping = NoToneMapping` and the output color space to the working space. Do tone mapping and sRGB encoding inline in the TSL material output. Verified: r186 otherwise allocates an extra target, which on Adreno means a full-resolution store and resolve.
- **MSAA 4×** through multisampled render-to-texture (verified), which resolves on-tile.
- **Resolution control.** Fixed foveated rendering (`setFoveation`), adaptive. Framebuffer scale adaptive from 0.8 to 1.2.
- **Shading**
  - One **PBR-lite** TSL material: GGX specular + Lambert, one directional light, and a prefiltered environment probe. No per-pixel point lights.
  - Baked lightmaps and AO for the static workshop.
  - Shadows: one cached shadow map for the build area, re-rendered only when something near it moves, plus blob shadows under held items.
  - Custom shaders only where they earn their cost: weld heat glow, the stress tint (a per-instance uniform, not a pass), and a cheap normal-mapped water plane.
- **Draw-call control**
  - Each fastener type and size is one `InstancedMesh`, so a thousand bolts is one draw.
  - Parametric parts go into a `BatchedMesh` per material.
  - Segmented parts are skinned meshes with at most 16 bones.
- **Geometry.** LOD by screen size for curved primitives. Geometry is deduplicated by parameter hash.
- **Textures.** KTX2/Basis (UASTC for normals, ETC1S for albedo), transcoded to ASTC on Quest. No triplanar mapping; UVs are generated in object space. Texture memory ≤ 256 MB.

### 10.3 Main-thread discipline
- Zero allocations per frame (pooled math objects), no JSON on hot paths, and UI re-layout only on change.
- Profile with Chrome remote DevTools over USB (`chrome://inspect`) and the OVR Metrics Tool overlay.

### 10.4 Physics scaling: the workaround list
1. **Merge rigid clusters.** Parts joined by rigid connections with low utilisation merge into one compound body (spike: 1,000 parts drop from 11.3 ms to 0.01 ms).
   - The cluster's external loads are tracked: joint lambdas to other clusters, plus contact loads estimated from Δv.
   - When a *conservative* bound on any internal connection's load crosses 50% of its capacity, the cluster splits back in the same tick.
   - A false split costs frame time, never correctness.
2. **Fold fasteners into joints.** An installed bolt, screw or rivet is not a body. It is data on the connection plus an instanced mesh. On failure it becomes a real body, so the snapped bolt halves fly out. This also removes the worst mass-ratio problems, such as a 2 g washer between two 20 kg beams.
3. **Segmented parts stay merged until stressed**, using the same mechanism as (1).
4. **Sleeping** with tuned thresholds. Frozen parts are static bodies.
5. **Adaptive physics.** Over budget, drop to 60 Hz physics with interpolation and fewer substeps for islands without springs. A "sim load" meter warns the builder.
6. **Multithreaded Jolt** (`wasm-multithread`) needs cross-origin isolation (COOP/COEP). GitHub Pages can't set headers, so use `coi-serviceworker`, or host on Cloudflare Pages or Netlify with a `_headers` file. M0 measures the gain on the device.
7. **Force fields** (magnets, bands, drag) find pairs through the Jolt broadphase with cutoff radii.
8. **CCD** (linear-cast motion quality) only for small, fast bodies.

### 10.5 Adaptive quality controller
- It watches XR frame timing and steps through levels, with hysteresis: raise foveation, lower framebuffer scale, drop shadows, cap particles, push the LOD bias, then lower the physics rate.
- The current level shows in settings, and users can pin it.

### 10.6 Loading
- WASM streaming compile, and tool modules lazy-loaded.
- Brotli compression.
- A PWA service worker, so it works offline, relaunches instantly, and can be installed from the Quest Browser.

---

## 11. Testing and quality

### 11.1 Unit tests
Vitest for the document, commands, undo, schemas and snapping maths.

### 11.2 Engineering golden tests
Every formula in `engineering/` is checked against published worked examples:
- ISO thread Aₛ values.
- A VDI 2230 tightening example.
- Shigley spring examples.
- Wood Handbook withdrawal examples.
- The Lewis gear example.
- The analytic on-axis force between two cylindrical magnets vs the Gilbert quadrature.
- Section properties of standard profiles vs handbook tables.

### 11.3 Physics conformance suite
Runs headless in Node, using the same worker code. It tests **laws, not builds**:

| Law | Tolerance |
|---|---|
| Free fall, t = √(2h/g) | ±0.5% |
| Incline slip at tan θ = μs | ±1° |
| Spring period | ±0.5% (spike: 0.07% at 4 substeps) |
| Small-angle pendulum period | ±1% |
| Rolling cylinder, a = ⅔·g·sin θ | ±2% |
| Buoyant fraction = ρ/ρ_water | ±1% (spike: exact) |
| Elastic collision momentum and energy (cradle) | ±2% |
| Bolted-joint slip at μ·F_M·n | ±5% |
| Bolt tensile break at Aₛ·Rm | ±5% |
| Cantilever plastic collapse at M_p = Z·σ_y | ±10% |
| Euler buckling load | ±15% |
| Magnet force vs reference curve | ±15% |
| Gear ratio | exact |
| Eddy-brake terminal speed vs analytic | ±15% |
| Adhesive: peel fails far below shear | qualitative + ratio band |
| Energy drift with friction and damping off | < 1% over 10 s |

### 11.4 Codec tests
- fast-check property tests for byte-exact round trips on random documents.
- Golden files for every template.
- A migration test per version.
- Fuzzed decoding of share codes: it must never crash or hang.

### 11.5 End-to-end tests
Playwright with the pre-installed Chromium.
- **Desktop flows**: place, connect, save and reload, open a template, with screenshots.
- **XR flows** via injected IWER (`metaQuest3` preset at the 3S resolution): enter a session, drive the controllers from scripts, grab, place and connect, then assert on document state.

### 11.6 Performance proxies in CI
- Benchmark scenes: a 1,000-part clustered build, 250 awake bodies, 50 magnets, 20 springs, and a particle storm.
- Run under CDP CPU throttling (4×), asserting draw calls, triangles, physics ms, and allocations per frame.
- These catch regressions. They do not replace device numbers.

### 11.7 Device test protocol (needs your headset)
- Every milestone deploys to a preview URL.
- A checklist covers: frame time via OVR Metrics, comfort, controls, audio, haptics, and the benchmark scenes.
- Results go in `docs/device-log.md`, and budgets in §10 get updated from them.

### 11.8 CI
A GitHub Actions workflow scoped to `vr-sandbox/**`: typecheck, lint, unit, golden, conformance, codec, e2e and perf proxies. The main branch deploys to Pages.

---

## 12. Milestones
Each milestone ends with something you can run in the headset and a clear exit test. Game feel isn't saved for the end: every milestone ships its own sounds, haptics and particles, and M6 is a dedicated polish pass.

**M0: De-risk** (partly done)
- Done: Jolt force readback, breaking, springs, buoyancy, scaling, and compound merging (`spikes/`).
- Run Jolt in a worker with SAB transform sync and interpolation. Measure contact-listener overhead at about 2,000 contacts.
- Renderer A/B on the device: `WebGPURenderer` (WebGL2, multiview) vs `WebGLRenderer`. Frame time and draw calls, and confirm there's no extra full-screen pass.
- Drive IWER from Playwright (enter XR, move controllers, press buttons).
- Canonical codec prototype plus the fast-check round-trip test.
- Modal audio bake: 10 materials × 5 sizes must bake in under 2 s on the device.
- A `@pmndrs/uikit` panel with 60 controls in XR: draw calls and layout cost.
- On the device: a hello-scene with multiview and 300 bodies, for first real budgets.
- Measure single-thread vs multithread Jolt on the device.
- **Exit:** a go/no-go on each stack choice, with §10 budgets replaced by device numbers.

**M1: Core sandbox (walking skeleton)**
- Vite/TS app with desktop and XR entry, fly locomotion, comfort options, and player scale.
- Document, commands and undo/redo. Place, move, rotate, duplicate, delete, freeze.
- Primitives (block, rod, tube, plate, disc, sphere) and 12 materials with cited ρ and μ.
- Physics worker, physical and creative grab, contact audio v0 (4 material banks), haptics v0.
- Save/load v1: file, code string, local library.
- **Exit:** build a stack and knock it over in the headset. Save → reload → byte-identical. Conformance for free fall, incline and rolling passes.

**M2: Connectors and the settings system**
- Rigid, hinge, slider, ball, universal, cylindrical, spring (linear and torsion), free-spin bearing, ratchet and rope connectors, each with full parameters.
- Property-schema panels (VR and desktop) with derived vs overridden values. Load readouts, stress overlay, and generic capacity breaking.
- Snapping: grid, angle, face and hole.
- Template station v0 with Newton's cradle and the trebuchet.
- **Exit:** spring and pendulum conformance pass. Templates load and behave. Every parameter is reachable in the UI.

**M3: Fasteners, joining, tool wall I**
- Hole features and the drill.
- ISO bolts, nuts and washers. Torque wrench and impact driver with VDI 2230 preload.
- Wood screws and nails (Wood Handbook), rivets and rivet gun.
- Welder with heat-input quality, soldering iron, adhesives with the cure clock, clamps and vise.
- Failure modes: slip, break, strip, pull-out, peel. Fasteners promoted to bodies on failure. Tool wall environment and tool belt.
- **Exit:** bolt slip, bolt tensile, screw withdrawal and weld-capacity conformance pass. Truss-bridge and shelf templates.

**M4: Parts that bend and break; stored energy**
- Segmented stock, plastic hinges, brittle fracture, wood grain, Euler buckling, skinned visuals, bends saved.
- Parametric coil springs, bands, both rope modes, gas springs.
- Angle grinder and saws (splitting parts). Hammer and nails with real driving.
- **Exit:** cantilever-collapse, buckling and band-snap conformance pass. Spring-launcher template.

**M5: Magnets, water, transmissions, motors**
- Gilbert magnets with images, the eddy-brake connector.
- Water volumes and drag.
- Gears, racks, lead screws, pulleys and belts. Load-dependent bearing friction.
- Motors, servos and actuators with control mapping.
- **Exit:** magnet curve within ±15%, eddy terminal speed, exact gear ratio. The go-kart is drivable at 72 Hz or better on the device.

**M6: Game-feel pass**
- Full audio design (tool loops, creaks, breaks, reverb), spark signatures, haptics everywhere.
- UI juice, and an onboarding tutorial built on templates.
- **Exit:** the playtest checklist passes. No interaction is silent or lacks feedback.

**M7: Quest 3S performance and platform pass**
- Cluster merge and split, the adaptive quality controller, and multithreaded Jolt if M0 showed a gain.
- PWA and offline support, mixed-reality passthrough mode, hand tracking.
- **Exit:** benchmark scenes at 90 Hz on the device (or 72 Hz with the reason documented). A 1,000-part build stays interactive.

**M8: Library and sharing polish**
- QR codes, thumbnails, glTF export, and at least 9 templates.

**M9: Stretch goal, gated** (§13).

---

## 13. Stretch goal: text or voice to 3D part
**Gate.** Start only when all three hold:
1. You pick a provider and supply an API key.
2. A small server proxy is deployed, so keys never ship to the client.
3. The pipeline passes an end-to-end test with at least 20 prompts.

**Pipeline**
1. **Voice to text.** Use the Web Speech API if the Quest Browser supports it (unverified). Otherwise record audio → proxy → speech-to-text service.
2. **Text to 3D.** A provider's text-to-3D REST API returning GLB. Candidates: Meshy, Tripo, Hyper3D Rodin; chosen by an M9 bake-off on latency, cost and quality.
3. **Clean up** in a worker: decimate (meshoptimizer), check it is watertight, and scale it to the requested size.
4. **Physical properties.** Compute volume by the divergence theorem, then mass = ρ·V for the chosen material. Build collision by convex decomposition (V-HACD/CoACD WASM).
5. **Save it** as a `mesh` part whose mesh is embedded and addressed by content hash, so saves stay self-contained and exact.

**Limits, stated honestly.** Generated parts get real mass, collision and material, but aren't segmented for fracture.

---

## 14. When a native build makes sense
**Start criteria**: all of these hold.
1. A Quest 3S is in hand.
2. Unity 6 (or OpenXR + Android NDK) tooling is installed and working.
3. There's a measured WebXR ceiling that the §10 workarounds can't get past.

**What carries over unchanged**: the save format, `data/` catalogs, `engineering/` formulas (ported with the same JSON golden fixtures), templates, and conformance definitions. Jolt is a native C++ engine, so physics behaviour can stay identical across the port.

---

## 15. Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Quest CPU gives a much smaller physics budget than assumed | medium | high | cluster merging, fasteners folded into joints, 60 Hz fallback, multithreaded Jolt; measured in M0 |
| `WebGPURenderer` WebGL2 backend immature in XR | medium | medium | A/B in M0; fall back to `WebGLRenderer` without multiview |
| JS contact-callback overhead | medium | medium | per-body friction encoding; callbacks only for deviant pairs |
| Solver noise triggers false breaks | medium | medium | sustained-load filter; drop-test calibration in conformance |
| Mass-ratio instability (tiny parts vs huge beams) | high | medium | small fasteners are never free bodies; minimum free-body size; more iterations on constrained islands |
| Magnet near-field accuracy | medium | low | Gilbert quadrature, calibrated against published data, documented ±15% |
| Quest Browser feature gaps (Web Speech, layers, WebGPU XR) | medium | low | capability detection with fallbacks |
| COOP/COEP hosting for `SharedArrayBuffer` | low | medium | `coi-serviceworker`, or Cloudflare Pages `_headers` |
| Wrong material or spec data | medium | medium | citation + confidence per value; golden tests; ⓘ badges |
| Scope explosion | high | high | milestone exit tests; catalogs grow by data, not code |
| VR comfort | medium | high | vignette, teleport, snap turn, no camera shake |
| No device in the development loop | high | high | IWER + throttled proxies, plus your device check each milestone |

---

## 16. Open questions
1. **Device access.** Do you have a Quest 3S available to run each milestone's preview? M0 can't exit on real numbers without it.
2. **Home for the code.** This sits in `vr-sandbox/` inside your `claude-code` fork for now. Once real code lands, a dedicated repo would be cleaner (CI, Pages, issues). Want me to plan for that move?
3. **Hosting.** Is GitHub Pages with a service-worker COOP/COEP shim OK, or would you prefer Cloudflare Pages, which sets headers natively?
4. **Stretch goal.** Which 3D-generation provider, and is there a budget or API key? It stays parked until then.
5. **Units.** Metric by default with an imperial toggle. Is that OK?
