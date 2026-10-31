# The node engine: a universal, colourful node pipeline

> **History, kept as such (read 2026-10-31).** This is the node engine's plan as drafted on 2026-10-25 and grown since. The forge, its room and many files it names (`apps.ts`, `boards3d.ts`, `calls.ts`, `src/ganglia/`) were deleted on 2026-10-28; what is current is the owners table in `CLAUDE.md` and the order in `docs/ROADMAP.md`. Read this for why things are as they are, not for where they are.


Plan draft 1, 2026-10-25, with the first build (same day) recorded in [§0.1](#01-what-is-built-and-measured).
Targets marked **target** are goals that will be measured. Only §0.1 says what already runs.

**Contents**
0. [Destination](#0-destination)
1. [What already exists, and what this grows from](#1-what-already-exists-and-what-this-grows-from)
2. [The core model](#2-the-core-model)
3. [Everything a node can be](#3-everything-a-node-can-be)
4. [Everything a node can do](#4-everything-a-node-can-do)
5. [Trees inside the graph: branch, prune, merge, version](#5-trees-inside-the-graph)
6. [How it gets smarter](#6-how-it-gets-smarter)
7. [How it stays efficient](#7-how-it-stays-efficient)
8. [The library](#8-the-library)
9. [Colour and look](#9-colour-and-look)
10. [The environment](#10-the-environment)
11. [Stress testing](#11-stress-testing)
12. [Milestones](#12-milestones)
13. [Risks](#13-risks)
14. [Questions for you](#14-questions-for-you)

---

## 0. Destination

You open one canvas, flat on a screen or around you in the forge. Every kind of work is coloured blocks wired
together: an engineering calculation, a part being designed, a business's money, a piece of code, a whole factory.
Any block opens into the pipeline inside it, which can branch, be cut back and be folded up into a new block of its
own. That new block goes into a library sorted by domain and by ability, so it can be reused anywhere, the way
`use("bolt M8x30")` already reuses a part. The engine keeps a record of what is used, what repeats and what is dead.
From that record it offers merges, cuts and new blocks, and it only re-runs what changed.

**Done means all of these hold, each measured (§11):**
- One graph format and one runner hold every domain. No domain has code of its own in the engine, only blocks.
- A block made from a sub-pipeline behaves exactly like a built-in block: it can be searched for, versioned,
  tested and placed anywhere.
- The stress suite in §11 passes at its stated scale targets, and its numbers are published with the code.
- A person who has never seen it builds a working calculator chain in under five minutes (**target**, checked by a
  blind trial with an agent and with you).

### 0.1 What is built and measured

**2026-10-27, then: the first parts before the outer layer.** The user: "you built the outer layer before the first parts
every single piece need to be able to be exploded." Measured first: the Corolla's engine was a block, a head, a cover, a
pan and an "intake and accessories" box, its mass said (`kg`) not built; its gearbox a 45 kg box; its doors and hood skins
with nothing in them; its tyres one shell each; and its "rest of it" its whole published 1,340 kg, because it was weighed
before the mass rule was wired in (so the car came to 2.1 t). Now:
- **The audit says what is not built** (`explodeAudit`): besides lumps, the share of mass only said (a stated mass, the
  stand-in for what is not drawn) and the share in pieces nothing identifies. Its score is what is left.
- **An engine from its first parts** (`engines.ts`): pistons, three rings, wrist pins and their clips; rods, caps, shells
  and bolts; a crank forged in one at its firing angles; the block cast round its jacket and crankcase, its liners, main
  caps, shells and bolts; the head with every valve, guide, seal, spring, retainer, keeper, tappet or rocker, its cams and
  caps; its timing chain link by link (or gears); its pan, pump, pickup and filter; its intake, injectors or carburettor;
  its exhaust manifold; plugs and coils or injectors; alternator (stator, windings, claw rotor, diodes, regulator die),
  water pump, starter, belt, tensioner, damper, flywheel. Sized from bore and stroke, weighed from each piece's shape:
  Honda's GX270 (25 kg published) comes to 22.9 kg as its parts; the Corolla's M20A 82 kg; the truck's DD15 825 kg (low:
  its gear housing, air compressor, fuel pump and EGR are not built yet). Each vehicle's engine is now this, and its bay
  is laid out round the engine its parts make.
- **A gearbox from its first parts** (`drivetrain.ts`): case and bell housing, shafts, gears on bearings, final drive and
  differential; a CVT's pulleys and ~400-element push belt and torque converter (the Corolla's, as Toyota fits), or a
  manual's gear pairs, synchros and forks. About 27 kg as drawn: light for a CVT (its valve body, oil and pump not built).
- **Library families drawn** that were "known but not drawn": compression springs, spur and helical gears, circlips
  (their DIN 472 thickness made consistent), O-rings (each rubber at its own density), roller chain link by link.
- **Tyres built in depth on every vehicle**, their cord layers weighed by their cord share rather than a stated mass.
- **Doors, hood and deck lid built round their skins** (`closureOf`): inner panels, beams, hinges, check straps,
  latches, regulators, speakers, trim panels, seals; hood inner frame, insulator, hinges, latch, striker, prop rod.
- **Single parts named**: castings, forgings and pressings drawn as one piece, now each an inventory part with its
  process and material (counterweight, hubs, beams, leaves, discs, drums, pressings, glass).
- Then built from their parts too: seats (foam on sinuous springs in a welded frame, covers, recliners, headrests, rails
  on balls; about 17 kg a front seat); a cooling module (radiator and condenser cores of tubes and fins, tanks, cap,
  coolant, fan, shroud, hoses); a car's exhaust (catalytic converter with its substrate and mat, resonator, muffler);
  a steering universal joint (yokes, spider, caps); disc brake calipers (body cast in one, piston, seal, boot, two pads
  of backing and friction, guide pins, bleed screw); a truck's tandem drive axles (banjo housings, carriers with hypoid
  pinion and ring gear, differentials, axle shafts), its steer axle's forged I-beam and kingpins, its 12-speed gearbox in
  line and its driveshafts (tube, slip yoke, universal joints).
- Every recipe met in every vehicle (a part made from stock is no longer asked to contain its stock).
- Scores now (built and identified, by mass): Corolla 54.5 %, truck 74.9 %, forklift 80 %, dirt bike 81 %, mower 70 %,
  quad 65 %, kart 60 %. What is left is mostly the stand-in for what is not drawn yet: the Corolla's about 550 kg
  (interior trim, carpets, wiring, HVAC, airbags, fluids, and its body-in-white drawn lighter than a real one), the
  truck's about 2,050 kg (its cab interior and structure, air system, fuel, wiring, frame fittings).

**2026-10-26, then: build each part, each sub part, with makers shared by process.** The user: "you can't build
anything by designing what it looks like … you gotta build each part each sub part each subsubpart and make it easier to
generate new parts … the build of a battery … follows a lot of the same processes and geometries of many things."
- **General makers** (`src/nexus/makers.ts`; nodes under *make.*): a cast grid, a coat over a part, a wrap (envelope),
  a stack at a pitch, straps over named lugs (with series links), an enclosure with cells and a lid, things into cells,
  a wound roll of strips, a fill drawn as a surface but weighed whole. Each is a process with a geometry, not a product,
  so a lead-acid battery, an 18650 cell and the next thing that is cast, coated, stacked, wound or boxed share them.
- **The battery built from them** (`starterBattery`, and the board *A battery built from its parts*: 24 nodes, every one
  running, with the grid, the pasted plate, the wrapped plate and the cell drawn on their own nodes): 6 cells, 13 plates
  each, separators, straps, intercell links, acid, case, lid, posts. 16.73 kg on the board, against a typical Group 35 of
  about 18 kg (an estimate from makers' sheets, held to within 20 % by a test). The Li cell's jelly roll is a
  `woundRoll` of cathode, separator, anode, separator in a can with a cap of gasket, vent disc and button.
- **Explode inside an explode** (`exploded` in `assembly.ts`): every level comes apart down to the bottom, or only the
  piece named by `focus`; pieces made in one (a cast grid's bars and wires) stay together; a container drops while what
  it holds lifts out, so plates no longer poke through their case.
- **Real batteries in the vehicles**: the truck's battery box holds three Group 31s, lengthwise, on brackets bolted
  through the rail web; the cars carry a Group 35 on a tray with its hold-down clamp and J-bolts; the EV and hybrid
  packs are filled with cells by `packToFit` to the room they have.
- **Overlaps found and fixed on the truck**: the stack crossover through the fuel tank; the air tank by the fifth wheel;
  the battery box in the drive tyre's sweep. Still open: the engine block is drawn wider than the frame rails.
- Still not done: the Corolla's doors, headlamps and hood are lumps (about 4.8 % of its mass); the board-built battery
  has no vent caps (the `starterBattery` one does); a fully exploded battery is dense to read (focus helps).

**2026-10-26, then: designs that come apart to the bottom.** The user, on the first truck: "very low quality and fake
parts that probably couldn't be exploded to accurate parts … the fact that parts can be exploded down to the bottom is
what makes designs more accurate … upgrade the design logic so it's easy to make things look realistic and detailed and
accurate." The upgrade is a rule held by the system, not a one-off redraw:
- **Recipes in the inventory, held by an audit** (`explodeAudit` in `components.ts`, beside `missingIn`; node *Comes apart
  to the bottom?*): each drawn piece that is a single part (one material, one process) counts whole; a piece drawn as one
  though what it is named for is an assembly in the inventory (a headlamp, a door, a fuel tank) is a lump, said with what
  it should come apart into; every tagged assembly is held to its recipe. Scored by mass, so a cab drawn as one lump
  outweighs a hundred real wheel nuts. Before: the Cascadia 13.2 % of its mass in 14 lumps (cab, hood, headlamps, tanks,
  stacks, cross members, the fifth wheel). After: 0 %, every recipe met, 1,432 pieces, 271 of them tagged with what they
  are. Still lumps, now said by the audit: the Corolla's doors, headlamps and hood (4.9 % of its mass), the ATV's and the
  dirt bike's saddles and exhausts, the forklift's and the mower's cross members.
- **Fittings drawn whole** (`src/nexus/fittings.ts`; 40 recipes added to `inventory.ts`): lamps (housing, metallised
  reflector, LED board of library LEDs, lens, screws), a west-coast mirror (arms, head, glass, brackets, screws), a door
  (skin, inner panel, glass in its seals, hinges, handle, latch, screws), a day cab (floor, back wall and rear window,
  roof, side panels, A-pillars and centre post, two-piece windscreen, doors, mirrors, sun visor, five roof lamps per
  FMVSS 108, four rubber cab mounts bolted through), a tilting hood (fibreglass moulding cut round the steer tyres' lock
  and bump, grille of surround, bars and mesh, headlamps, hinges), a bumper (shell, end caps, brackets bolted through the
  rails), a ladder frame (rolled C-channel at Freightliner's 11 × 85 × 287 mm, cross members on gussets with four M16
  bolts a side), a fuel tank (shell, ends, baffles, filler and cap, straps on liners, brackets bolted through the rail),
  the aftertreatment unit on the right (its can, DPF and SCR cores, step plate), exhaust stacks fed from it (pipe, heat
  shield, clamps, bracket), a fifth wheel (cast plate with its throat, jaw, release handle, brackets on pins, angles
  bolted to the rails), cab steps, quarter fenders and mud flaps (clear of the drive tyres' sweep), an air tank. Through
  bolts are the library's bolted joints (bolt, two washers, nut), so their studs and nuts meet.
- **The library grew an LED** (a design for the LED family: epoxy body and lens, lead frame, die, bond wire), so a lamp's
  LEDs come apart too; the family's masses now by size (typical).
- **How to make anything detailed now**: write its recipe in the inventory, draw it with its pieces tagged, and the audit
  says at once what is still a lump and what its recipe misses. The same rule holds every machine.
- Honest limits: the cab's panels are flat boxes on a rounded roof (its corners are not radiused like a Cascadia's); the
  hood is one loft (its fender flares and crease lines are not modelled); the interior (dash, seats' insides, wiring,
  air lines) is not drawn whole; the engine and gearbox are still drawn by their makers inline and their recipes are not
  audited yet.

**2026-10-26, then: things down to their bolts, reused; vehicles from their axles; a computer from its transistors.**
The user: "build something complex like a car … down to its bolts … reuse things … batteries, tires … realistic tires …
geometry and sizing settings … build a truck from the ground up … a logic that would allow you to build different kinds
of vehicle easily … then a computer … the transistor … test yourself with realism and physics."
- **Tyre** (`tyreBuilt` in `machines.ts`; node *Tyre*): from a size code or width / aspect / rim, as it is made: inner
  liner, body ply (polyester in a car's, steel in a truck's, its cord share said), two beads with apexes, steel belts (two
  or four), a nylon cap ply (a car's), undertread, sidewalls, and a tread of blocks in pitches of three lengths (noise
  spread), cut by grooves and sipes, wear bars 1.6 mm high in its grooves; eight patterns (highway, all-season,
  all-terrain, mud, rib, drive, knobby, slick); depth, pitch, sipes and wear set on the node. Masses against makers'
  listings: 205/55R16 9.5 kg (8–10 listed), 11R22.5 drive 59.5 kg (about 55), 315/80R22.5 rib 64.7 kg (60–70). Made once
  per size and tread: a car's four tyres are one stored tyre (498 pieces placed, 7 things stored).
- **Batteries** (`starterBattery`, `liCell`, `cellPack` in `components.ts`; data in `data/batteries.ts`): a 12 V starting
  battery by its BCI group (case size the standard's; six cells of plates, separator envelopes, straps, intercell joints
  through the partitions, electrolyte, vent caps, SAE posts of their two sizes), within 15 % of each group's typical mass;
  cylindrical cells (18650, 21700 from datasheets, 4680 from teardowns) with their wound jelly roll turn by turn; packs
  (a Model 3-like 96s46p of 21700s: 4,416 cells, 44,265 pieces placed, 11 things stored).
- **Vehicles from what they are** (nodes *Axle*, *Vehicle*, *Vehicle (a real model)*): an axle is where it is, its track,
  its tyre code, steer, drive, twin tyres, brakes, how it hangs; a Vehicle is its kind (its seats, lines and controls
  scaled to its length), its axles, size, frame, power and what it carries, built by the one maker every machine here
  comes from. A truck from three Axle nodes is 433 pieces; wire a fourth in and it is an 8x4 (564), take one out and a
  4x2 (306). **Fit in** swaps every piece a pattern names for a shared thing (the tyre made in depth on every wheel, a
  real pack for the box that stood for one); **Take apart** moves each piece out from what holds it, so many levels
  down. Starter boards: a car down to its bolts, a truck from the ground up, an electric car's pack.
- **Physics, tested**: a vehicle's wheels come off as bodies of their own, each hinged on its axle (`rollingOf`; a
  turned tyre is a cylinder to the physics). Pushed with 4,000 N for 1 s, the Corolla rolls on at 1.854 m/s, 98 % of
  F·t/m (the rest spins its wheels up); as one rigid body the same push does not move it (its tyres' friction holds
  2.1 t). The Cascadia: 1.279 against 1.302 m/s.
- **A computer to the transistor** (`src/nexus/computer.ts`; nodes *Transistor*, *Logic or memory cell*, *Processor
  die*, *Processor package*, *Motherboard*, *Desktop PC*): a FinFET at Intel 22 nm's and 14 nm's published pitches (IEDM
  2012, 2014) or TSMC N5's reported ones; a 6T SRAM bit on its published bit-cell area and a NAND2 gate with their
  first metal; 2 KB sub-arrays with their periphery; caches; rows of gates; a 4-core die of 3.25 billion transistors at
  14 nm (5 × 10¹⁰ pieces placed, 25 things stored), flipped into an LGA1151 package on its bumps, in an ATX board with
  JEDEC DIMMs, power stages, chipset, M.2 drive and graphics card, in a tower. The 3D view zooms from the PC to one
  transistor (its near plane reaches 10⁻¹² m).
- **Realism**: the docked view has a sun casting shadows and a ground that catches them, sized by how far the view is
  (off below 3 cm: 32-bit positions cannot place them). A stand-in's error now counts many small pieces left out
  together, and a thing too big to list is never stood in for by part of it (a sub-array was drawn grey from 48 of its
  16,384 bits).
- **Honest limits, found by these checks**: the Corolla as drawn weighs 2,116 kg and the Cascadia 12,287 kg against
  1,340 and 8,200 published (drawn too heavy, from before this round); the kart's seat shell reaches the ground, so let
  go it drags on it; the truck's cab and hood are crude next to a Cascadia (the blind check's first complaint); a die's
  logic is rows of one gate at 70 % placement, its density 24.6 M/mm² against Intel's 37.5; its upper metal layers and
  vias are not drawn; the DRAM inside a DIMM, a fan from the library (its family has no drawing) and the GPU's insides
  are not drawn; the far view on a software GPU runs at the governor's coarsest, so far tyres are boxes.

**2026-10-26, then: motion and physics as nodes** (the Seed document's 3.5 to 3.7: joints, drivers, kinematic and
dynamic solvers, swept volumes). The Jolt rigid-body engine was already here (`sim.ts`, behind the old room's words);
now the board reaches it:
- **Let it go** (dynamic): what a thing places, as bodies (down through what only lays things out: a Place, a row, a
  grid; a thing of different pieces, a car, is one body), each piece its own shape, its mass from its materials, its
  friction and bounce from the materials table (`data/materials.ts`) by what it is made of (else said to be typical);
  what it stands on fixed; the floor. Worked out once per set of inputs; the clock plays the 30-a-second track back
  (scrubbing is about 1 ms). Says when it all came to rest, or that it was still moving.
- **Hinge**, **Push**: a revolute joint (on another thing or on the world), its limits and friction; a force for so long.
- **Turn** (kinematic): a thing turned about a pivot to angles at times, driven as a servo drives a joint (`motion.ts`:
  no faster than its speed, speeding up and slowing at its acceleration, at each angle by its time).
- **Sweep**: the room a turn needs, as one thing; **Clashes** gained "with", so a door's swing is checked against the bed
  and not against itself.
Checked against the laws, not against last time: a 1 m rod hinged at its end, let go from 60°, swings with the period
2π √(2L / 3g) × 1.073 (the elliptic factor for 60°) gives, within 3 % (`tests/nexus/physics-nodes.test.ts`, since merged into the one test, `tests/nexus/domains.test.ts`); a tower
left alone stands; shoved by a 120 mm steel ball at 300 N for 0.1 s it falls and rests. Starter boards: a ball into a
tower, a door's swing and what it hits, a pendulum.
**Wheels that roll** (later the same day): a Hinge can be driven by a motor from its datasheet (`data/motors.ts`: the
maxon RE 40 and the MY1016 scooter motor, their published constants) through a gearhead (the maxon GP 42 C 12:1), turned
at the torque its constants give at the speed it turns, K_t (V − K_t ω) / R − T_f (`sim.ts`). A cart (an aluminium deck on
four rubber wheels, each on a hinge, the back two driven) pulls away and settles at 6.5 m/s, within 5 % of the speed
the motor's constants give through 12:1 on a 0.1 m wheel, drawing its stall current (24 V over its winding, about 80 A)
to start (the one test now). Let it go gives each joint's motor speed, current, peak current and
energy. Honest limits: nothing limits the current (a driver would hold it to the motor's 6 A continuous; the gearhead is
rated 7.5 N·m, under the stall torque through it), and the Car seed is still one body (its wheels do not turn): a seed
that keeps its wheels as their own things, hinged, is next.
Next in this line: slides,
motion clips saved as seeds and played at offsets on many instances (the document's shared clips), swept volumes of
any motion (not only a turn), and loads from motion feeding stress (the document's motion → analysis).

**2026-10-26, after: breaking the renderer, and the tricks that fixed each break.** The user: "try to break rendering
… render tons of stuff, make this space infinite in all axes and scale and time … find the cause and find a trick." A
harness drove the renderer's choosing of what to draw (exactly timed without a GPU) with fields of neighbourhoods up to
1024 × 1024 (3.7 billion pieces placed), a car out to 10¹⁰ m, the clock out to a year, then the pages in Chromium.

| What broke | Cause | Trick |
| --- | --- | --- |
| Looking away cost as much as looking at it | No frustum test | Whole groups culled by one sphere test |
| 1M placed things visited every frame; first view 26 s | A flat list has no hierarchy | Lazy groups: positions in flat arrays, a group split at its median (quickselect) only when the view opens it |
| 1M+ boxes past the budget | Over budget still drew a box per thing | Largest-on-screen first (a heap): when the budget runs out, the rest are the smallest, drawn as their group's box, never a hole |
| Every far house as 48 pieces | One stand-in level | A pyramid: 4, 12 or 48 pieces, the fewest whose left-out error is under 1.5 px |
| 3 µs a piece | `leafGeometry` wrote each shape out as JSON every piece, every frame; matrices re-made from angles; a RegExp per override | Geometry, materials, placement matrices and patterns kept per object |
| The view never settled | The governor only learnt when the camera moved | A build that changes the governor asks for another; it hears the GPU's draw time as well; it jumps by how far over it is |
| A car 10⁷ m out jittered (float32 spacing there: 1 m; at 10¹⁰ m, 1 km) | Instance positions in world terms | A floating origin: positions measured from the eye, the meshes moved to it (offsets under 10 m at 10¹⁰ m out) |
| The 1 nm grid vanished | Grid lines 100 m out, 1 nm apart, are one float32 number | Grid lines measured from its centre; the grid at the height you look at |
| No world without end | — | **Forever** (a node): a lattice drawn as a tree of super-cells (2, 4, 8 … cells a side), each an averaged slab while small, split only when big: from the street, from 1 Mm a cell, from 10⁹ m out, 15 to 27 ms a build |
| The world's edge showed | Cells stopped before the haze | A horizon: haze that follows the view's distance (and the space's S), nothing drawn past it, thick where the cells stop |
| A plateau with a cliff, grey | Far boxes as tall as the tallest roof, the colour of the first piece (a road) | A far box as high as most of the thing is and the colour most of it is, both weighted by area |
| A week ahead took 25 s; time stopped at 30 min | Traffic replayed from 0 | Checkpoints every 30 s of the street's time; and a street under a fixed cycle settles into a round that repeats: found (a state met before at the same point of the cycle), any later time folds into it. A year on in under 2 s from nothing, then 1 ms. Checked against stepping all the way (within 1 mm) |
| The clock ended at 120 s | A fixed bar | No end: a window of it (a minute to a year), rates to a day a second |

Measured after (choosing what to draw, one core, no GPU): every scene and view 7 to 32 ms a build, under 25,000 pieces
drawn, with the error allowed between 3 and 16 px (the governor's choice on this machine). In Chromium's software GPU the
endless world built in 9 to 66 ms and drew in 3 to 27 ms. Honest limits: the first view of a list of a million things
still takes 3 s (where each is, once); the governor is coarse on a slow machine (on this one, up to 16 px of error);
nothing yet streams a seed's stand-in built once and saved, so a new kind of thing pays its first view.

**2026-10-26, last: realism at scale.** Finding flaws and adding power is half of it; the other half is that a big
thing still looks and behaves like itself. Following the Seed document's 3.12 ("cost follows the screen"):
- **Stand-ins with an error bound** (`space3d.ts`): a thing far off is drawn as its biggest pieces (48, by the size of
  each piece's box), chosen only while the biggest piece it leaves out projects under 1.5 px. A 3 × 3 city far off draws
  each house with its walls and roof, not a grey box (186 stand-ins, no boxes, 8,469 pieces). Made once per distinct
  thing and kept.
- **A frame governor**: when building what to draw takes over 30 ms (or nears the 250k budget) the stand-ins' allowed
  error grows 1.5× a frame, and shrinks when there is time to spare, never finer than its best: the view degrades in
  detail, never in speed, and never has holes (the worst is a box).
- **Behaviour, not only looks**: cars speed up at 2 m/s² (typical in town, an estimate) and brake at 3.4 m/s² (the
  deceleration ITE times yellows by), and at a yellow go on if they are too close to stop.
- **Distance haze** in the docked view, set from the size of what is shown, so depth reads at a car's scale and a
  city's.
Next for realism at scale: proxies built bottom-up from the children's (the document's merge-and-simplify), shown
through a seed's own saved stand-in; per-instance variation of look within a spawn (wear, tint) as overrides on one
mesh; chunks generated as they come into view, so a city need not be built whole.

The library has **Boards** first: every starter board and every board you save ("Save to the library's Boards"), by
field (the traffic board under Vehicles, the resistor under Electrical).

**2026-10-26, then: what building a city showed the nodes need, built, and what is still missing.** The city was
the test, not the goal: each place it was hard to build is an ability nodes lacked. Built:

| Where it was hard | The ability (a node anyone can use) |
| --- | --- |
| A door set in a wall by hand-wired offsets | **Frame** (a named place on a thing, found through what it places, "front wall/opening") and **Mate** (one thing set on another by their frames, into or against). The Wall seed mates its door or window into its opening |
| Back rooms' doors opened onto front rooms' windows | **What each touches** (each side of each box: the neighbour along most of it, or outside, a shared side said once) and **Rules over rows** ("hall/outside: door; */outside: window; */hall*: door; *: wall"). The house gets a hall, a door from every room onto it, windows only outside, a shared wall built once |
| Grass under the road | **Clear away**: what a thing places, less whatever comes near another thing (or only those), as deep as asked; what is untouched stays shared |
| A parked car clipped a wide house | **Clashes**: which placed things overlap, how deep, by a sweep along x. Every seed board checks itself |
| Houses can't stand on hills | **Onto the ground**: rows given the terrain's height where they stand, for a spawner |
| Stop lights fixed, nothing moved | **Clock** (the board's time; only what reads it runs again: about 6 to 12 ms a tick for a neighbourhood), **Signal cycle** (fixed-time phases, the cross street's derived), **Loop round a block** (a lane path and its stop lines), **Follow a path** (things along a path keeping a gap, stopping at a red line; stepped from 0 at 0.1 s, so any time is always the same street). The road system's lights run on the cycle; each neighbourhood has cars driving round it |

The dashboard (`view/index.html`) is the front door: the board, the library, a docked 3D view that can be entered to
fill the page or taken on to the space (`view/space.html`, any scale, a headset), the clock under it, the run log
(what each run worked out and how long each node took), results and metrics (mass, how much is shared, the last run
against a frame, nodes working, what the view draws), and variations (the chosen node run for each of an input's
choices, side by side, a press to take one). No panel is decoration: each is read from the board.

Still missing, found while building (next, in this order unless asked otherwise):
- **Routing on a network**: cars only go round a loop. Roads need to be a graph (crossings as nodes) so a car can turn,
  and a route found between two places.
- **Seeing other traffic**: cars keep a gap to the one ahead on their own path, but not to cross traffic, and go from
  stopped to full speed at once (no acceleration); nothing changes lane.
- **Neighbourhoods side by side**: each builds its own edge roads, so two that meet have two roads; overlapping duplicates
  need merging (union by place).
- **Roads that follow the ground**: Onto the ground lifts rows, but a road is one flat piece; it needs to bend to the
  terrain, and a neighbourhood or city to sit on one.
- **Pointing at one car in a city and changing only it** (the document's point edits, 3.10): overrides by path exist on
  placements, but nothing yet resolves a pick in the view into a path and stores an override there.
- **Mates that move together and constraints both ways**: a mate places once, from its inputs; nothing yet solves a set
  of mates and dimensions together, or flags two that conflict.
- **Stand-ins below a seed**: far things draw as their boxes; there is no simplified proxy mesh made when a seed is saved.
- **Exploding a seed in the 3D view**: the part viewer explodes parts; assemblies in the space do not yet.
- **Physics**: masses are real (with solid shares labelled estimates); nothing yet falls, collides or carries load in
  the space; the periodic table is the phase after mating.

**2026-10-26, later: seeds built from nodes** (`src/nexus/seeds.ts`, following the Seed Node System document). Each is
an ordinary board of nodes folded into one node and registered in the library, and each is built from the ones before:

| Seed | Built from | Its choices |
| --- | --- | --- |
| Window, Door | shape boxes placed by formulas of its width and height | width, height, colour |
| Toilet, Sink, Bed | turned and boxed shapes; a `pick` between kinds | sink: pedestal, vanity, kitchen; bed: twin to king |
| Bathroom, kitchen, bedroom and living fittings | Toilet, Sink, Bed and boxes, placed off the room's walls | room width, depth |
| Room | floor; four `wall`s (a door opening in front, a window behind); Door and Window set in their openings; the fittings `pick`ed by type | type, size, ceiling, wall colour |
| House | `plan.rooms` lays out its rooms; `spawn` makes a Room per row; a gable roof stretched over them | plan: studio, 1, 2 or 3 bed; roof on or off; colours |
| Car | body, cabin and window profiles, four wheels, lamps, bumpers | paint |
| Grass patch, Terrain | blades `scatter`ed on a foot (0.3048 m) of soil; a `terrain` heightfield covered a foot at a time | seed, size, relief, grassed or bare |
| Road, Stop light, Crossing, Road system | lanes, dashes, sidewalks; a signal head with the lit lens picked; lights at four corners; `array.grid`s of roads and crossings | length; red, yellow or green; blocks each way |
| Neighbourhood, City | Road system; `rows.grid` lots, each a random plan and colours, `spawn`ed as Houses with a Car each; City `spawn`s Neighbourhoods each from its own seed | blocks, seed; neighbourhoods each way |

New nodes for them: `terrain`, `scatter`, `wall`, `pick`, `rows.grid`, `rows.set`, `rows.shift`, `plan.rooms` (`blocks.ts`),
`spawn` (`dataflow.ts`: a seed made once per distinct row, so alike houses are one object). Shapes take a wired colour and
material, a glow, and a solid share for hollow things. A seed's input with choices is a dropdown in the inspector and ◀ ▶
on the panel in the space. Measured (2026-10-26): a 3 × 3 city is 22,813 pieces placed, stored as 968 distinct things,
run in about 70 ms; a 24 m terrain is 150k grass blades drawn in 4 draw calls. Not yet: a house's rooms are laid in rows
with each door in its front wall, so a back room's door opens onto the front room's window (no hallway rule yet). A blind
check of the screenshots also found: cars on the lawns with no driveway; houses showing no windows from the street (each
room's window is in its back wall); the grid's metre marks over everything in a city view; long node titles cut off in
the inspector. Fixed after it: floors by room type (tile in bathrooms and kitchens), metres on a seed's sizes.

**2026-10-26: the forge and its room are deleted.** The app's front door is the space (`view/index.html`): what the
nodes make, in x, y and z, at any scale and through time, with the panels floating where you reach them. Build with
`npx vite build --config vite.view.config.ts`, then open `dist-view/index.html` (or `dist-view/nodes.html` for the board
on its own page).

| Part | Where | State |
| --- | --- | --- |
| Typed ports, wires, unit dimensions, conversion on the wire, list mapping | `src/nexus/blocks.ts` (`fits`, `convert` in `dataflow.ts`) | Built and tested |
| The library: 199 blocks, 195 with their own tests (all passing), every one of the 144 laws as a calculator, by field, by ability and by kind; a duplicate is refused | `src/nexus/blocks.ts` | Built. Thin shelves remain: controls 2, electronics 3, manufacturing 5 |
| Incremental runner: keys, shared result cache across boards, only what an edit reaches is looked at | `src/nexus/dataflow.ts` (`Engine`, `Memo`) | Built and property-tested |
| Groups as nodes, nested; fold (taking in what lies between), open, save as a library block | `dataflow.ts` (`collapse`, `expand`, `makeBlock`) | Built and property-tested |
| Cut a branch keeping what else needs it; dead branches; twins and merging; repeated wiring | `dataflow.ts` (`cutBranch`, `deadNodes`, `twins`, `mergeTwins`, `patterns`, `suggest`) | Built and tested |
| The colourful canvas: blocks by kind, wires by quantity, glow and pulses on a run, heat map, minimap, command bar, undo, tidy layout, phone layout, inspector as each block's calculator | `src/nexus/view/nodes.ts`, `view/nodes.html` | Built, driven in Chromium, blind-checked |
| Code blocks with typed ports (JS, TS, Python) off the page | `view/code-worker.ts` (`vars`) | Built; JS checked on the page |
| The space: an empty field with grid cells a decade at a time, the x, y, z axes; S, the world scaled round you from µm to km (jumps, fit, the wheel or the right stick); T, the board's history scrubbed; the board, the space bar and chat as floating panels (B: the board large; H: panels away); double-click a thing to come closer | `src/nexus/view/space.ts`, `view/index.html` | Built; driven in Chromium (software WebGL), and in an emulated Quest 3 (`?emulate`, Meta's IWER): a controller ray pressed the bar and the right stick zoomed S. Not yet tried on a real Quest |
| Things placed, never copied: assemblies of shared parts and assemblies, with what is changed where each is placed; mass, bounds and counts once per distinct thing (a city of 9,000,000 pieces is 7 things stored, measured in under a millisecond) | `src/nexus/assembly.ts` | Built and property-tested |
| Nodes that make and place: shapes (box, cylinder, sphere, cone, ring, tube, extrude, lathe), a standard part by its sizes, place, row, ring and grid of, mirror, combine, variant (colour, material, finish, size, hidden; on pieces by name), point along, hole, measure, show in space | `src/nexus/blocks.ts` | Built; each with its own tests |
| Drawing it: one instanced mesh per distinct piece, what is too small to show its pieces drawn as its box, what cannot be seen not drawn; worked out again as the view moves | `src/nexus/view/space3d.ts` | Built; the starter city draws in 1 to 5 draws |
| The same board as a panel in the space: its canvas as the panel's picture, pressed and dragged by a ray or the mouse | `src/nexus/view/nodes-wall.ts`, `nodes.ts` (`wall`) | Built |
| Parts in 3D: a Part block (words in, the library's real part out: 33 families drawn whole, with mass, pieces and its own check), Next size up (ISO 262), a 3D view block turned by hand on the canvas, full screen with taking apart, and the part viewer one press away | `blocks.ts` (`card.part`, `logic.next-size`, `view.3d`), `src/nexus/view/nodes3d.ts` | Built; seen in Chromium (software WebGL) |

Measured on the build container by `tests/nexus/dataflow.test.ts` (since merged into the one test) (not a Quest, not your machine):

| Case | Target | Measured |
| --- | --- | --- |
| 10,000-node board, an edit reaching 100 of them | under 16 ms | about 2 ms |
| 10,000-node board, first full run | — | about 280 ms |
| One library block placed 10,000 times | edits update once | its formula ran twice in all (first run, one edit) |
| 1,048,576 blocks placed in nested library blocks | open in under 1 s | worked out in about 2 ms, one block actually run |
| 100,000-row sweep through a law | without stalling | about 300 ms |
| Groups 64 deep | open, run, fold back | passes |

Not built yet, and said plainly:
- the forge's flows (`flows.ts`) still run on their own runner and are not yet steps in this one;
- the space is built but not yet tried in a real headset; no board-room screen yet;
- mating (ports, a mate node, compatible parts by their geometry) and physics with the periodic table are the next two phases;
- Ask Claude works only where the forge's relay is; on the page it says it cannot ask;
- runs are one block at a time on the page's thread. A pool of workers is not built yet;
- agents, bridges and triggers are not block kinds yet;
- no versions of library blocks beyond `version: 1`;
- no sharing or editing by several people;
- blocks saved by you live in this browser only.

## 1. What already exists, and what this grows from

The project rule is one owner per concern, so the engine is grown from the board code already in the app, not
written beside it:

| Already here | What it gives | What it lacks for this plan |
| --- | --- | --- |
| `src/nexus/boards.ts` | Boards as documents: nodes, edges with 15 relations, soft delete, patch merge, a derived category tree, layout | No typed ports. Nodes are words, not blocks with inputs and outputs |
| `src/nexus/flows.ts` | Pipelines that run: trigger, AI, action, check and repeat steps; loops; run records with time and status for each step; templates; copy and paste of clips | Steps pass a single string to each other. No typed values, no fan-in, no caching, no sub-graphs as blocks |
| `src/nexus/calls.ts`, `calltest.ts` (removed 2026-10-28: no node reached them) | 25 groups of calls a step can make, each one tested for real | Calls are a flat list. There's no library with domains, versions or blocks people make |
| `src/nexus/view/code-worker.ts` | Code steps in JavaScript, TypeScript, Python (Pyodide) and C++ (as converted JS), run off the main thread | Code gets `facts` and one input string, not typed ports |
| `src/nexus/view/boards3d.ts`, `boards-store.ts` (removed with the forge) | The board on the wall in the forge, drawn as one canvas for each surface, and saved | Drawn as a word wall, not as wired blocks |
| `src/nexus/book/` (once `src/ganglia/laws.ts`), `units.ts`, `src/nexus/lawgraph.ts` | 144 laws with checked units: a ready stock of calculators (draft 1 said 288; that was a miscount) | Not exposed as blocks (now they are: §0.1) |
| `src/nexus/components.ts`, `inventory.ts`, `breakdown.ts` | The parts library and the breakdown queue: a thing becomes its sub-things, which are looked up before being added | Not blocks on a canvas |

So the plan is: give `boards.ts` typed ports and values, give `flows.ts` a dataflow runner with caching, and make
everything above into block kinds. Boards saved today must still open (§7.6).

(Noted while reading: `docs/GANGLIA.md` refers to `blocks.ts`, `workflows.ts` and others under `src/ganglia/`, and
those files are not in this checkout. Whether they are lost or were never added should be settled before §8 leans
on them.)

## 2. The core model

Everything is five things:

- **Value.** What travels on a wire. Every value has a **type** and, where it applies, a **unit** and a **source**
  (where a number came from, as every number in this project must say).
- **Port.** A typed input or output on a node. It has a name, a type, a unit dimension, whether it's required, a
  default, and how many wires it takes (one or many).
- **Node.** An instance of a **block** (its definition) with its settings, its position, its colour, and its cached
  last result.
- **Wire.** Connects an output port to an input port. A wire is only allowed when the types fit (§2.2). It can carry
  a converter that is shown on the wire itself (mm to m, string to number).
- **Graph.** Nodes and wires, plus the graph's own exposed ports. A graph with exposed ports is itself a block.
  That is the whole tree mechanism.

### 2.1 Value types
`number` (with SI dimension, e.g. N·m), `integer`, `boolean`, `text`, `vector` and `matrix`, `table` (typed
columns, like a spreadsheet), `series` (time or sweep), `money` (amount, currency, date), `date` and `duration`,
`shape` (a 3D solid or a surface, from `form.ts` and `surface.ts`), `part` (a library component), `material`,
`card` (any record with fields), `list<T>`, `record{…}`, `image`, `file`, `code` (source text plus language),
`event` (a trigger firing), `signal` (a stream of values over time), and `any` (allowed, but drawn as a warning
colour so it doesn't spread unnoticed).

### 2.2 Type rules
- A number's units must fit. Wiring a force into a length is refused, and the message says why. Wiring mm into m
  works, and the converter appears on the wire.
- `list<T>` into a `T` input makes the node **map** over the list. The node gets a stack badge and runs once for
  each item. This is how one calculator becomes a sweep with no extra blocks.
- `table` columns can be pulled out as `list` by wiring from a column handle.
- Generic blocks (`max`, `sort`, `select`) take their type from what is wired in.

## 3. Everything a node can be

Each kind has its own colour family (§9). All of them share the same ports, wires, cache, versions and tests.

| # | Kind | What it is | Examples |
| --- | --- | --- | --- |
| 1 | **Input** | A value that enters the graph: typed in, a slider, a dial, a file, a sensor, a live feed | a load slider in N, a CSV file, today's exchange rate, the headset's hand position |
| 2 | **Constant and card** | A fixed record from the library, carrying its source | steel S355, an M8 bolt, a NEMA 17 stepper, an employee, a client |
| 3 | **Calculator** | A self-contained tool artifact. It works on its own as a small app and also has ports | beam deflection, bolt preload, Ohm's law and power, gear train, loan and NPV, unit converter, BMI, concrete mix |
| 4 | **Law** | One equation from the book (`src/nexus/book/`), with checked units and its domain of validity | Euler buckling, Fourier conduction, Kleiber's law |
| 5 | **Solver** | Runs a calculation backwards, optimises or iterates | "what diameter gives 30 MPa", goal seek, minimise mass under a stress limit, root finding, linear programming |
| 6 | **Code block** | Code with typed ports, in JS, TS, Python or C++. Inputs arrive as variables, the result fills the outputs | parse a supplier's quote, a custom scoring rule |
| 7 | **AI block** | Asks Claude, or Nexus offline. Its output can be held to a schema so it gives typed values, not just prose | classify a request, extract figures from a PDF, suggest the next three blocks |
| 8 | **Logic and flow** | Decides the route: if, switch, check, loop, repeat until, map, filter, reduce, merge, wait, gate | "repeat until flaws = 0, at most 5 rounds" |
| 9 | **Trigger** | Starts a run: press, timer, condition turns true, phrase said, build finished, file changed, webhook | everything in `flows.ts` today |
| 10 | **Action** | Changes the world: make a build, place a part, write a note, send a message, save a file | the `ACTIONS` in `flows.ts` |
| 11 | **Generator** | Makes structure: a part to a standard, a vehicle from its figures, a panel, a layout | `machines.ts`, `components.ts`, `panels.ts` as blocks |
| 12 | **Critic and check** | Judges a result and outputs findings as a typed list | the make critic, wall thickness, draft angle, a budget limit, a unit consistency check |
| 13 | **Viewer and output** | Shows a value: number, gauge, chart, table, 3D view, zebra map, report. Can be pinned to the board-room screen | a live deflection chart, the 3D part, a P&L table |
| 14 | **Group (sub-graph)** | A collapsed pipeline with exposed ports. It opens in place. This is a tree inside a node | "gearbox sizing" made of 9 blocks |
| 15 | **Block reference** | A placed use of a saved library block, pinned to a version or set to follow the latest | "bolted joint v3" used in 40 builds |
| 16 | **Branch and variant** | Holds alternative sub-graphs side by side, A/B/C. A selector or a solver picks one, and results can be compared | steel frame vs. aluminium frame vs. composite |
| 17 | **Note and frame** | Notes, sticky labels and coloured frames that group and explain without running | "Front suspension" frame |
| 18 | **Agent** | A worker with a goal, tools (blocks it is allowed to call) and a budget. It can edit its own sub-graph inside limits | the board-room "employee" who keeps the cash-flow graph up to date |
| 19 | **Bridge** | Connects to outside systems through connectors (files, HTTP, databases, MCP tools) | read a Supabase table, fetch a price |
| 20 | **Meta** | Works on graphs themselves: count, find, diff, merge, prune, benchmark, test | "list all dead branches in this board" |

## 4. Everything a node can do

Shared abilities, so every kind above gets them without writing them again:

**Run**
- Run alone, or in its pipeline. Run on a click, on a trigger, live while inputs change, or on a schedule.
- Map over lists, run in parallel when its inputs allow, and stream partial results for long jobs.
- Be cancelled. Have a time limit and a memory limit. Retry with a back-off.
- Run inside a sandbox (a worker) when it is code, AI or a bridge.

**Know itself**
- Ports with types and units, a description, an example, its domain of validity (where the answer holds), its
  sources, its version and its author (you, Claude, or the engine).
- Its own tests: inputs with known outputs that it must reproduce.
- Its cost: how long a run takes and how much memory and money it uses.

**Explain itself**
- Show its work: the formula, the numbers that went in with units, and what came out (as `showWork` does for laws).
- Sensitivity: which input the answer depends on most.
- Uncertainty: how ±x % on inputs carries into the outputs.
- Trace: why it ran, what came in, and what it sent on.

**Change**
- Edited settings, rewired, recoloured, renamed, all with undo.
- Collapsed into a group, or expanded back. Saved as a library block. Forked into a branch. Replaced by a better
  block with the same ports.
- Edited by Claude on request, as a reviewed patch you accept or reject, never a silent change.

**Connect**
- Wires to other nodes. Links to cards and documents. Pinned to the board-room screen or to a place in the forge.
- Shared by link with someone else, read-only or editable.

## 5. Trees inside the graph

- **Branch:** any node can grow children. Pressing + on an output adds a block fed from it. A group opens into its
  sub-graph, and that sub-graph's nodes can be groups too, with no depth limit.
- **Prune:** deleting a branch removes the nodes no other wire still needs. A branch that is still used elsewhere is
  only unlinked, never lost, and the engine says which other branch kept it. Deletions are soft at first (as
  `boards.ts` marks them now) and can be undone until the graph is compacted.
- **Share:** a sub-tree used in two places is stored once and referenced twice. Editing it asks: change both, or
  fork this one.
- **Merge:** two branches that do the same thing (same blocks, same wiring, same settings, found by hashing) can be
  folded into one shared block.
- **Version:** every saved block has a history. A placed block either pins a version or follows the latest. When a
  new version changes its ports, the uses are listed before anything breaks.
- **Breakdown queue:** a new card is queued to be broken into sub-cards, looked up in the library first, as
  `breakdown.ts` does for parts now. The same rule works for every domain.

## 6. How it gets smarter

Smarter means four mechanisms, each measurable, not a claim:

1. **Usage record.** Each block keeps a count of runs, failures, time used and how often its output feeds something
   that is used. This is the evidence for everything below.
2. **Pattern mining.** Wiring shapes that repeat (the same three blocks wired the same way in many places) are found
   by hashing sub-graphs. They are offered as a new block with a proposed name. You accept, rename or dismiss, and a
   dismissed offer is not made again.
3. **Pruning and merging suggestions.** Dead branches (outputs nothing reads), duplicates and blocks that are always
   bypassed are flagged on the canvas with a dimmed colour, and listed with a one-press fix.
4. **Next-block suggestions.** When you drag from an output, the library is sorted by what has been wired to that
   type before, in this board and others. Claude can propose a whole sub-pipeline for a stated goal, shown as a ghost
   you accept.

A critic sits over all four, as `make/critic.ts` does for builds: a suggestion that made things worse (more
failures, slower runs) is withdrawn and its rule loses weight. Rule updates are kept only if they help boards they
were not tuned on. That is the project's drift gate applied to the engine itself.

## 7. How it stays efficient

1. **Incremental runs:** each node caches its output, keyed by a hash of its block version, settings and inputs.
   An edit marks only what is downstream of it as stale. Changing a slider re-runs the three nodes that depend on
   it, not the 3,000 that don't.
2. **Lazy expansion:** collapsed groups are not loaded or drawn until they are opened. A board of a million nodes
   shows and runs its top level only.
3. **Shared storage:** a sub-tree used in many places is stored once (content-addressed, by hash).
4. **Parallel runs:** independent branches run at the same time in a pool of workers. Pure blocks run off the main
   thread, so the canvas and the headset never stutter.
5. **Drawing:** the canvas draws nodes in batches (one texture or instanced mesh, as the forge's wall did), culls
   what is off screen, and draws distant nodes as coloured dots.
6. **Save format:** extends the board document. Boards saved now open unchanged. Saves are patches, so a large board
   saves only what changed.

## 8. The library

### 8.1 Three ways to find a block
Every block is tagged on three axes, so it can be found any of these ways:

**By domain** (what field it is for):
- Mechanical: statics, dynamics, machine elements (shafts, bearings, gears, springs, fasteners), mechanisms, vibration
- Structural and civil: beams, columns, frames, concrete, steel, timber, foundations, loads by code
- Electrical: circuits, power, motors, wiring and fuses, batteries, solar
- Electronics and embedded: components, signals, PCBs, microcontrollers, sensors
- Controls and robotics: PID, kinematics, path planning, arms, actuators
- Thermal and fluids: heat transfer, HVAC, pipes, pumps, aerodynamics, hydraulics, pneumatics
- Materials: properties, selection, composites, failure, fatigue
- Manufacturing: machining, 3D printing, filament making, casting, moulding, welding, cost and time of a process
- Automotive and vehicles: everything in `machines.ts`, drivetrains, suspension, tyres
- Aerospace: lift, drag, propulsion, structures, flight
- Chemical and process: reactions, mass balance, separation
- Energy and environment: generation, storage, emissions, efficiency
- Biomedical and life: the creature laws (`creatures.ts`), ergonomics
- Software and data: parsing, transforms, statistics, ML, APIs
- Math: algebra, calculus, linear algebra, optimisation, statistics, geometry
- Business and finance: money, cash flow, budgets, pricing, loans, tax, payroll, inventory, the board room
- Operations and project: schedules, critical path, resources, risk
- Everyday: unit conversion, dates, recipes, health

**By ability** (what it does): measure, convert, calculate, solve backwards, optimise, simulate, generate, check,
compare, decide, store, show, transform, ask, act, connect. These are the colour families in §9.

**By kind** (§3): calculator, law, code, AI, logic, generator, critic, viewer, group, agent, bridge.

### 8.2 What each library entry holds
Name, icon, colour, description, ports, an example, tests, sources, validity range, version history, author,
uses (where it is placed), its usage record (§6) and a quality badge: **tested** (its tests pass), **sourced** (every
figure says where it came from), **used** (placed and run many times) or **draft**.

### 8.3 How the library fills
- **Seeded** from what exists: the 144 laws, the 25 call groups, the components, the generators and the critics,
  each wrapped as a block with tests. That is hundreds of real blocks on day one, none of them mock.
- **Made by you:** select nodes, then "make block". The selection's loose wires become its ports.
- **Made by Claude:** ask for a calculator or a block. Claude writes it with its tests and sources, and it enters as
  **draft** until the tests pass and you accept it.
- **Offered by the engine** from pattern mining (§6).

### 8.4 Rules that keep it clean
No two blocks may do the same thing. A new block is checked against the library by port signature and by its test
results on the same inputs, and a duplicate is offered as a merge (the rule `WRITTEN_TWICE` already applies to the
inventory). A block whose tests fail cannot leave draft.

## 9. Colour and look

- **Each ability has a hue:** inputs teal, calculators amber, laws gold, solvers orange, code violet, AI pink,
  logic blue, triggers lime, actions red, generators green, critics coral, viewers cyan, groups slate with the
  colour of what's mainly inside, agents magenta. Final values are chosen to stay readable on dark and light
  backgrounds and for colour-blind viewers, so a symbol on each node carries the kind as well.
- **Wires take the colour of the type they carry:** numbers by dimension (force, length, money each have their own
  colour), text grey, shapes green, events lime, and `any` as a striped warning.
- **State is shown by light:** a node glows while it runs, a pulse travels down a wire as a value passes, a stale
  node is dimmed, a failed one turns red with its reason on it, and a cached one shows a small check mark.
- **Heat view:** a toggle that colours nodes by time used, or by failures, or by use, so the slow and dead parts of a
  graph are visible at a glance.
- **Branches carry a colour band,** so A, B and C variants are told apart all the way down their sub-trees.
- **In VR:** nodes are floating panels with depth, wires are glowing tubes, and a group expands into a layer behind
  it that you can step into.

## 10. The environment

**Where it runs**
1. The browser on a screen: the main editor, and the fastest to build and test.
2. The phone in the forge: the library app (`apps.ts`, deleted with the forge on 2026-10-28) was to get a node mode.
3. The forge wall and the board-room screen: the same graph on the big screen, editable by pointing, and the
   `boards3d.ts` wall becomes a block canvas.
4. Fully around you in VR: you grab nodes, pull wires by hand, and step into a group.

**What makes it advanced**
- **Live everywhere:** values update while you drag a slider, on all views at once.
- **Undo history and time travel:** every change is kept, and any past state of a board can be opened and compared.
- **Diff and merge of boards,** like code: what changed between two versions, node by node.
- **Claude in the loop:** say or type what you want and Claude proposes the sub-graph, explains a node or finds why
  a run failed. Each proposal is a patch to accept or reject.
- **Sandboxing:** code, AI and bridge blocks run in workers with time limits and memory limits, and no access to the
  page. Keys stay off the client, as the project rule says.
- **Offline first:** everything runs without a network except AI and bridge blocks, which say so when they cannot
  reach their service. Nexus answers when Claude cannot be reached, as flows do now.
- **Debugger:** step through a run node by node, set a breakpoint on a wire, watch a value, and replay a past run
  from its saved inputs.
- **Command bar:** type anything, such as "add beam calculator", "wire load to F" or "collapse these", and it runs.
- **Sharing and many people:** a board shared by link, and later edited by several people at once with live cursors.

## 11. Stress testing

Five layers. Every number is published with the code that produced it. The machine numbers are measured on the
container, and Quest numbers only ever come from a Quest.

**1. Correctness**
- Every block runs its own tests on every gate.
- Every law is checked for consistent units (as `units.ts` does now).
- The runner is checked against a plain reference runner on random graphs: same outputs, every time.

**2. Properties (fast-check, already a dev dependency)**
- Random graphs, random edits and random undos.
- These must always hold:
  - a cached run equals a fresh run;
  - undo restores the board byte for byte;
  - save and load is exact;
  - prune never removes a node that something still needs;
  - collapse then expand is the identity;
  - merge never changes any output.

**3. Fuzzing and hostile input**
- Wires of the wrong type, cycles, a node deleted in the middle of a run.
- Code blocks that loop forever, use too much memory or throw.
- AI blocks returning junk.
- Huge text values, NaN and infinity, a unit mismatch hidden in a deep group.
- Every case must end in a clear message, never a hang or a corrupt board.

**4. Scale (each a target to be measured)**

| Case | Target |
| --- | --- |
| A board of 10,000 nodes opens and pans | at 60 fps on the screen |
| A graph of 1,000,000 nodes, as nested groups, opens | in under 1 s, since only the top level is loaded |
| A slider edit in a 10,000-node graph re-runs | only what depends on it, in under 16 ms when the blocks are fast |
| A sweep of 100,000 calculator rows | in a worker pool, without stalling the canvas |
| Groups nested 64 levels deep | open, run, collapse and save |
| A block used in 10,000 places, then edited | everything updates once |
| The VR wall at 500 visible nodes | at the headset's frame rate. Measured on a real Quest 3S |

**5. Real-world trials**
- Rebuild real tasks end to end as boards: a front-fender design pipeline, a bolted joint sized by its load, a
  monthly cash-flow board for the business, the filament maker's process chain.
- Then a blind check, as the project's rounds already do: an agent with no context is given the board and asked
  what it does and what is wrong with it.

**6. Made things held to their rules** (`src/nexus/make/rules.ts`, node *Nothing runs into anything?*)
- **Interference:** no two pieces' surfaces cross (triangle against triangle, after an oriented-box pass), unless they
  are one piece, one is said to pass through the other (`passes` or `joins`, said by the piece or anything it is in),
  one is a fastener in what it fastens, or one sits in a hole cut for it.
- **Clearance:** a piece that moves keeps the gap it says (`Part.clear`) from everything but what it runs on (`runsOn`).
- **Heat:** a hot piece (`Part.hot`) heats what is near it, its excess over 40 °C falling about e times each 40 mm (an
  estimate); a polymer, rubber, foam or low-melting metal nearer than its material's limit (`MAX_SERVICE`, typical
  datasheet ratings) is a finding, unless something solid stands between them.
- Every engine the machines use (Toyota M20A, Honda CRF450 and GX270, Toyota 4Y, Detroit DD15, Kawasaki FR651V) comes
  back with no findings; the tests hold three of them to it.
- **Thin parts:** a crossing is "through" by where the crossing edge actually goes (into the other solid, how deep),
  not by whether it falls near a triangle's edge, so a rod or a bolt thinner than the old 3 mm seam band is caught.
- **Known limits:** two boxes overlapping with faces exactly in one plane meet only along shared edges and are not
  caught; the heat gate measures the shortest straight line, not the view between the surfaces; a piece is checked
  where it is drawn, not through its motion.

**7. Under load, and through motion** (`src/nexus/loads.ts`, `rulesThrough` in `src/nexus/make/rules.ts`)
- **Load cases read the drawn part:** a coil records its maker's figures (`Part.made`), so Spring under load holds the
  spring that is drawn, not one typed beside it; Engine under load reads the piston's and rod's masses as their parts
  come to and the rod's section as it is drawn.
- **Sweep (stress test):** any block in the library over a range of one input, every answer in a table and the worst of
  them with where it falls; the engine board sweeps its engine from 1,000 to 7,000 rpm.
- **Sized from the loads:** a head's valve spring is the thinnest chrome-silicon wire, largest coil and least preload
  that hold its valves on their cams at the engine's redline with 1.2 to spare, its wire within Shigley's allowable,
  clear of coil bind, round its stem seal and inside its tappet; a rod's big end is as wide as keeps its shells under
  about 60 MPa (typical of tri-metal shells) at peak firing pressure (typical: 8 MPa petrol, 18 MPa diesel).
- **Through a turn:** Turn it over and check builds the engine at steps through a revolution and tries what moves
  against everything; all six engines the machines use come back clean.
- **Known limits:** the valve-float check takes the cam's lift as a harmonic over 60° of cam each way (an estimate); the
  cams and valves are held still through the turn; the Toyota four's bucket-tappet valve train, as drawn, floats at
  about 6,300 rpm (its real one works its valves through finger rockers on hydraulic lash adjusters (Toyota names the
  adjusters; the rockers are typical of them), not drawn here), and Engine under load says so.

**Research, gap and fidelity** (`src/nexus/research.ts`, `docs/GAP-MAP.md`): what a real thing is made of, read off its
sources and kept as notes (each part with the page it was read on, and how sure: confirmed, of its sister in its series,
or typical); compiled into a reference tree (a part with no source refused, a count written twice differently said as a
conflict); held against what is drawn (What is missing?: drawn, short, missing, or drawn the way the sources say it is
not); and the drawing measured for how finely it is made (How finely is it made?: its plain boxes by number and by
volume, the biggest first). The board Research to what is missing runs all of it with every check on the engine at once.
The Corolla's engine went from 42 % to 82 % of the 67 parts Toyota's M20A-FKS sources name, its rules still at 0.

**The gauntlet** (`src/nexus/gauntlet.ts`, its own page `view/gauntlet.html`): every block of the library and every
entry of the inventory can be put through nine gates, cheapest first: documented, unique (one owner per concern),
versatile (it reaches the library), sourced (where it states figures), tests (its own), robust (pushed to zero,
negative, a thousandth and a thousand times; a tenth and ten times for what draws parts: it answers or refuses in
words, never crashes, never gives NaN in silence), known (all the way down to materials), explodes (single parts,
every recipe met, nothing only said, every piece weighed), clean (the rules). The first run over the library's 318
blocks approved 222; what it found was fixed until 306 came through, and what is left is said as tasks (the batteries'
and the kart's mass only said, four blocks that cannot be tested here). What anything wants that nothing knows goes to
the unknown queue, sorted by what its members share so one maker makes a cluster, and researched in a loop to a fixed
point: round after round a level down, by a family, a researched reference, the drawing read back, the web (Wikidata's
has-part, where the page can reach it), or a known sibling (said as inferred, waiting for a source).

**The challenge scoreboard** (for the contest with the other AI): one page that reports, from runs, the number of
working blocks with tests passing, the domains covered, the scale results above, the edit-to-result latency, the
dedup ratio (blocks stored against blocks placed), and the blind-check results. Every row is measured, never claimed.

## 12. Milestones

Each milestone ends with the gate passing, a screenshot looked at, and the blind check.

1. **Typed core:** ports, types, units and wires on the board document; old boards still open; the type rules; the
   property tests.
2. **Dataflow runner:** incremental cached runs, map over lists, workers, cancellation; the flows of today run
   through it unchanged.
3. **Colourful canvas on screen:** blocks, coloured wires, run glow, heat view, command bar, undo.
4. **Library v1:** laws, calls and components wrapped as tested blocks; search by domain, ability and kind; calculator
   artifacts (first ten: units, beam, bolt, Ohm and power, gear train, spring, pipe flow, heat loss, loan and NPV,
   cash flow).
5. **Trees:** groups, make-block, shared sub-trees, versions, branches with variants, prune and merge.
6. **Smarter:** usage record, pattern mining, suggestions, the critic over suggestions.
7. **Code and AI blocks with typed ports:** code-worker upgraded; Claude makes blocks with tests.
8. **The forge and the board room:** the same graph on the wall and the big screen, then fully in VR.
9. **Stress suite and scoreboard:** all of §11 at its targets, published.

## 13. Risks

- **The engine becomes another generator beside the others.** Countered by growing `boards.ts` and `flows.ts`, and by
  checking each milestone against the owners table.
- **`any` everywhere makes the types pointless.** Countered by drawing it as a warning and counting it on the
  scoreboard.
- **Smart suggestions turn into noise.** Countered by the critic, the dismiss-once rule, and measuring how many
  suggestions are accepted.
- **VR legibility.** Text at a distance is hard to read in a headset. Countered by building the screen first, then
  trialling on the Quest early.
- **Scope.** Twenty node kinds is a lot. The milestones put the ones that unlock the rest first.

## 14. Questions for you

The answers set the destination. The ones marked ★ change the order of the milestones.

**Purpose and judging**
1. ★ What is the first real thing you want to build with it? A car part chain, the business board, a factory, or a
   calculator set?
2. ★ How is the contest with the other AI judged? Is there a deadline, a scoring sheet, or a task you both get?
3. Who else will use it: only you, your team, or the public? It decides how much goes into sharing and accounts.

**What a node is**
4. Should a calculator be usable alone, as its own page or phone app, outside the graph?
5. Is JavaScript, TypeScript and Python in code blocks enough, or do you need others (C++, Rust, Excel-style
   formulas)?
6. Should agents be allowed to edit their own graphs by themselves, or only propose edits you approve?
7. Are spreadsheet-style blocks (a grid with formulas) wanted, as a node kind of their own?

**The library**
8. Should blocks made by you and by Claude be private, shared with your team, or public in a common library?
9. Should a block show its price or cost to run, such as AI calls and outside services?
10. Which domains matter most first? Pick the top three from §8.1.

**Look and feel**
11. Any colour style you like (neon on dark, pastel, a game you like, a product like Blender or ComfyUI)?
12. Should sound be part of it, such as a tick when a value passes or a tone on a failure?

**Environment**
13. ★ Screen first then VR, as suggested, or VR first?
14. Should it work fully offline on the headset, or is a network always available?
15. Should it connect to outside tools you already use (Excel or Google Sheets, a bank, an accounting app, a CAD
    program)? Which ones?

**The bar**
16. What would make you say it failed? What would make you say it beat the other AI?
