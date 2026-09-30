# Roadmap: the 2027 God-Mode VR Reality Builder PRD

This page maps each item of the product brief to what the app does today and what comes next. The house rule applies
throughout: nothing works in here that wouldn't work in real life. So a "programmable" material is modelled as the
real device that does it (electrochromic glass, e-paper), not as magic.

Status: **Done** = in the app; **Partly** = a real start exists; **Next** = queued; **Later** = needs groundwork first.

## 1. Core physics and material layers

| PRD item | Status | Today | Next |
|---|---|---|---|
| Materials layer (standard vs reactive) | Done | 40+ materials with handbook properties and sources: density, stiffness, strength, friction, restitution, conductivity, weldability, sound | Surface finish layer (paint, oil, rubber coating) changing friction and restitution |
| Metals: conductivity, mass, reflectivity | Done | Conductivity drives eddy currents; density drives mass; metalness and roughness drive the look | Measured reflectance per alloy |
| Magnets: fields, polarity, force | Done | Exact pole-face fields, N/S attract and repel, steel attraction by images, latching, eddy braking; strength by grade (Ferrite, N35, N42, N52) and size; electromagnet with power 0–100 % and a tablet switch | Hall-sensor and reed-switch parts for logic |
| Transform: geometry, scaling, field radius | Partly | Every part's dimensions are adjustable on the tablet; the field's reach follows from the magnet itself | Custom meshes (import) with computed mass properties |

## 2. The "Digital Menards" catalog

| PRD item | Status | Today | Next |
|---|---|---|---|
| Framing that snaps, scales and cuts to length | Partly | Lumber, tube, angle and I-beam stock; grid and angle snap in Build mode | Drag-to-length stock: pull a board's end and it is cut to that length (a real cut, with the offcut) |
| Programmable glass (clear, frosted, tinted, blackout) | Next | Soda-lime glass | Smart glass modelled as the real device: PDLC film (clear or frosted on a switch) and electrochromic (tint steps), both driven by the switch channel |
| E-ink / smart wallpaper | Later | – | E-paper panels showing images or patterns, powered and switched |
| Procedural textures (no tiling) | Partly | Stone and cork speckle; wood colour by species | Procedural grain, marble veining and concrete aggregate, seeded per part |
| Fluid dynamics without the full cost | Partly | The pool: buoyancy, drag and splashes from real fluid properties | Poured water as particles colliding with parts (SPH-lite), fills containers |
| Logic nodes and power | Next | Motors, servos and electromagnets on control channels | Batteries and wires with real voltage and current; switches, sensors (limit, proximity, magnet), logic gates |
| Voxel dirt, foliage brushes | Later | – | Diggable soil volume; tree brush with real wood properties |
| Catalog tree for beginners | Next | Parts and materials grouped by kind | Generated catalog: families × standard sizes × materials, as department > category > sub-category > item |

## 3. VR "God Tools"

| PRD item | Status | Today | Next |
|---|---|---|---|
| Conjoin: lock two touching parts in one click | Done | **Best join**: pick part A, then part B, and it joins them the way that actually holds for those materials, sized to the stock, and says what it did | Conjoin a whole touching group in one gesture |
| Surface snapping on grid | Partly | Build mode snaps moved parts to a grid and angle step | Face-to-face snap: a flat face brought near another seats flush |
| Macro / micro scaling | Done | Shrink me / Grow me (×0.05 to ×20) on the World page | Smooth scaling on a stick gesture |
| Latent space spawner (voice to 3D) | Later | – | Needs a speech and generation service behind a server; an API key can never live in the page. Generated objects would get real mass and material so they obey the physics |
| Drag-to-build (brick wall and so on) | Next | – | Pick a material and drag from start to end; real bricks, blocks or boards laid in courses, with mortar as a real bond |
| Physics gun / gravity tether | Partly | Grip grabs up to 4 m away; the stick pushes and pulls the held part; physical and creative grab | Longer reach with a tether force limited by what the grip could really hold, and haptic lock-in |

## Reality tuning and environment

| PRD item | Status | Today | Next |
|---|---|---|---|
| Save and state | Done | **My builds**: save, open and delete your own builds on the headset (nothing pre-made ships); share codes and files reproduce a build byte for byte, joints, damage and settings included | Save wiring and logic once they exist |
| Creative vs real physics | Done | Build mode holds a build still while you work, and Play runs it for real; creative grab; zero-g, Moon and Earth gravity | Structural-integrity overlay while building (see where it would fail before Play) |
