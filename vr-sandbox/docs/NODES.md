# The node library

Generated from the library (`libraryCatalogue()` in `src/nexus/blocks.ts`); `tests/nexus/docs.ts` fails if it is out of date (write it again with `UPDATE_NODES=1 npx vitest run tests/nexus/docs.ts`). 569 nodes, on 11 shelves in the order a board runs; a node's shelf is read from what it is (`stageOf`), never filed by hand.

## Fields and the disciplines they reach

The fields below are the library's own; the engineering disciplines are a tree of 17 disciplines and 365 entries in all (docs/DISCIPLINES.md).

| Field | Disciplines |
| --- | --- |
| Mechanical | Mechanical engineering (8 branches) |
| Structural & civil | Civil engineering (11 branches) |
| Electrical | Electrical engineering (8 branches) |
| Electronics & embedded | Electronic and computer engineering (8 branches) |
| Controls & robotics | Control and robotics engineering (4 branches) |
| Thermal & fluids | Thermal and fluid sciences (7 branches); Heating, ventilation, air conditioning and refrigeration (4 branches) |
| Materials | Materials science and engineering (9 branches) |
| Manufacturing | Manufacturing and industrial engineering (9 branches) |
| Vehicles | Vehicle engineering (9 branches); Marine engineering and naval architecture (6 branches) |
| Aerospace | Aerospace engineering (7 branches) |
| Chemical & process | Chemical and process engineering (9 branches) |
| Energy & environment | Energy engineering (7 branches); Nuclear engineering (6 branches) |
| Biomedical & life | Biomedical engineering (7 branches); Agricultural and biosystems engineering (4 branches) |
| Software & data | Systems and software engineering (5 branches) |
| Operations & projects | Industrial engineering (8 branches); Construction engineering and management (5 branches) |

## Evidence

What each node's own contribution rests on, read from what it is (src/nexus/evidence.ts); a value on a wire is as strong as the weakest node it rests on.

| Evidence | Nodes | Means |
| --- | --- | --- |
| exact | 84 | holds exactly: a definition, geometry, counting |
| measured | 1 | read from a measurement (a die traced, a test run) |
| specified | 7 | a standard's, a maker's or a reference table's figure |
| derived | 301 | worked out from what it is given by laws that hold here; no weaker than its inputs |
| given | 9 | set by whoever made the board |
| empirical | 47 | a fit to measurements, or a material's own behaviour: holds over the range it was fitted to |
| estimated | 7 | typical values or an estimate, said so |
| simplified | 41 | a model that leaves things out (a perception model, a rigid-body simulation, an approximation) |
| hypothetical | 72 | a design or a guess: what something would be, not a measurement of a thing that is |

Checked: 10 compared with an independent reference (laws the rest of the book reaches another way, agreeing); 529 tested here (their own tests: that they do what they say, not that the world does); 30 untested; none validated against experiment.

Built before the update of 2026-10-28 (laws with their units, evidence and ±, materials down to their elements): 197 of 569 (dated in src/nexus/built.ts from git): their tests may be flawed, and each is to be re-checked against it; marked *before the update* below.

## 1 · Start: values and inputs (11)

Numbers, text, lists, tables, the clock, cards of materials and parts: what a board starts from.

- **Laws by field** (`law.fields`): Each field of physics, chemistry and engineering, the core laws its standard textbook teaches, which of them are law nodes here and which are still missing (named with their formulas) *specified, tested here*
- **List of numbers** (`in.list`): Numbers you type, split by commas: wire it into any block to run that block once for each *given, tested here, before the update*
- **Material property record** (`card.material`): A material as the kept data has it: density, stiffness, strengths *derived, tested here*
- **Number** (`in.number`): A number you set, in any unit: typed "200 mm" is kept as 0.2 m; with ends set, held between them and shown as a slider you drag *given, tested here, before the update*
- **Quantity** (`quantity`): One of the quantities laws are written in (a force, a stress, a temperature, a concentration…): what it is, its SI unit and dimension, and every law in the book it appears in, with what kind of law each is. *exact, tested here*
- **Range** (`in.range`): Evenly spaced numbers from one end to the other: a sweep *given, tested here, before the update*
- **Read** (`read`): A block of the library or an entry of the inventory read as it is (block:… or item:…, or either by its id or words): a block's ports, settings, tests and sources; an entry's place, make and what is in it *derived, tested here, before the update*
- **Table** (`in.table`): Rows you paste, the first row their headings (comma or tab separated): numbers read as numbers *given, tested here, before the update*
- **Text** (`in.text`): Words you type, carried on a wire to whatever reads text (a label, a search, a note) *given, tested here, before the update*
- **What a material is** (`matter`): What a material is, as exactly as it is known (its grade or species, or only its family: then said unspecified, with the span its family covers), what it is made of down to its elements, and every property with its … *estimated, tested here*
- **Yes / no** (`in.toggle`): A switch you flip: yes or no, carried on a wire to whatever decides by it *given, tested here, before the update*

## 2 · Make: shapes, parts, things (73)

Shapes, standard parts, makers by process, seeds (a door, a room, a house, a car), bodies, lines.

- **Axle** (`vehicle.axle`): An axle of a vehicle: where it is along it (+ forward of its middle), its track, its tyres by size code, whether it steers, drives, has twin tyres, its brakes and how it hangs from the frame. *hypothetical, tested here, before the update*
- **Bathroom fittings** (`seed.fittings.bathroom`): What makes a room a bathroom: a toilet and a basin against the back wall, a bath along the left (a 1.7 × 0.75 m bath, typical) *hypothetical, untested, before the update*
- **Battery pack** (`battery.pack`): Cells in a pack: so many groups in series, each so many cells in parallel standing in staggered rows, a busbar over each group, the groups in modules, the modules in a tray. *hypothetical, tested here, before the update*
- **Bed** (`seed.bed`): A bed with its head to the wall at z = 0, its foot toward +z: frame, mattress, headboard and two pillows; twin, full, queen or king (US mattress sizes) *hypothetical, untested, before the update*
- **Bedroom fittings** (`seed.fittings.bedroom`): What makes a room a bedroom: a queen bed against the back wall, a bedside table each side, a wardrobe in the corner (600 deep, typical) *hypothetical, untested, before the update*
- **Body** (`body`): A human body from its measured segments, not drawn by eye: laid out from its height by Drillis and Contini's proportions, its sixteen segments each the share of its mass de Leva measured (men and women apart), shaped … *estimated, tested here, before the update*
- **Box** (`shape.box`): A block: width (x), height (y), depth (z) *hypothetical, tested here, before the update*
- **Car** (`seed.car`): A mid-size sedan, its middle on the ground at the origin, facing +x: body, cabin, windows, four wheels (tyre and rim), lamps and bumpers; its paint yours (4.7 × 1.8 × 1.45 m, typical) *hypothetical, untested, before the update*
- **Cast grid** (`make.grid`): A grid cast in one: a frame round its edge, bars upright and wires across inside it, and a lug at its top. *hypothetical, tested here, before the update*
- **Chain round wheels** (`make.chain`): Roller chain round sprockets in a plane, link by link (inner links of plates, bushes and rollers; outer of plates and pins): a timing drive, a bicycle's, a conveyor's. *hypothetical, tested here, before the update*
- **City** (`seed.city`): A city of neighbourhoods, n by n, each its own streets, houses and cars from its own seed *hypothetical, untested, before the update*
- **Coat** (`make.coat`): A part coated with another material, filling it and standing proud of it each side along its thinnest way: paste pressed into a grid, paint, plating, an overmould. *hypothetical, tested here, before the update*
- **Coiled spring** (`make.coil`): Wire coiled round a mandrel, its ends closed: a valve's spring, a clutch's, a pen's *hypothetical, tested here, before the update*
- **Cone** (`shape.cone`): A cone along y: base radius and height *hypothetical, tested here, before the update*
- **Connecting rod** (`engine.rod`): A connecting rod forged to its I-section, its cap cracked off, its two shells and two bolts *hypothetical, tested here, before the update*
- **Crankshaft** (`engine.crank`): A crankshaft forged in one: its main journals, a pin for each throw at its firing angle, webs and counterweights, its nose and flange *hypothetical, tested here, before the update*
- **Crossing** (`seed.crossing`): Where two streets cross: its asphalt and a stop light at each corner, one way's lights and the cross street's each as set (a signal cycle sets them both) *hypothetical, untested, before the update*
- **Cut gear or sprocket** (`make.gear`): Teeth cut round a bore by module and count: a spur gear, a timing sprocket, a ring gear, a pump's rotor *hypothetical, tested here, before the update*
- **Cylinder** (`shape.cyl`): A cylinder along y: its radius and height; a second radius at its top makes it a frustum *hypothetical, tested here, before the update*
- **Cylinder block** (`engine.block`): The block cast round its cores (barrel, water jacket, crankcase, bulkheads), its liners, main caps, shells and bolts *hypothetical, tested here, before the update*
- **Cylinder head** (`engine.head`): The head cast round its ports, its valves, springs, retainers, keepers, guides, seals, tappets or rockers, its cams and caps, its bolts, its plugs and coils or its injectors *hypothetical, tested here, before the update*
- **Desktop PC** (`pc.desktop`): A desktop PC round a motherboard: a mid-tower case (its glass side left off so its inside shows), an ATX power supply, the board on its standoffs, a tower cooler (copper base, heat pipes, fin stack, fan) on the processor *hypothetical, tested here, before the update*
- **Door** (`seed.door`): A door: its leaf hung on two hinges, a lever handle on each face 1 m up, its lining; centred on its own middle. *hypothetical, untested, before the update*
- **Enclosure with cells** (`make.enclosure`): A moulded enclosure in one piece: its floor, walls and partitions dividing it into cells along its length, ribs under each cell; and its lid. *hypothetical, tested here, before the update*
- **Engine piece** (`engine.piece`): One of a cylinder head's pieces made to the engine's size, on its own: an intake or exhaust valve, a valve spring, its retainer, a bucket tappet, a spark plug, an ignition coil. *hypothetical, tested here, before the update*
- **Extrude** (`shape.extrude`): A profile drawn in x and y (mm), pushed out along z to a length: a bracket, a beam, a plate of any outline *hypothetical, tested here, before the update*
- **Fastener (any)** (`make.fastener`): Any bolt, screw, stud, rivet or pin from one node: its head (a polygon of 4, 6 or 8 sides, round, pan, button, countersunk, flanged or none), its drive, its shank, its thread drawn as a helix to its pitch, its point; … *hypothetical, tested here, before the update*
- **Fill** (`make.fill`): Each cell of an enclosure filled with a liquid to a height: a battery's acid, a tank's fuel, a radiator's coolant. *hypothetical, tested here, before the update*
- **Floor plan** (`plan.rooms`): A house's rooms laid out from its plan: rows of rooms split by "/", rooms in a row by ",", each "type W x D" in metres ("bedroom 4x4, bathroom 2.5x3 / kitchen 4x3.5, living 5x3.5"); or a plan by name. *hypothetical, tested here, before the update*
- **Grass patch** (`seed.grass`): A foot square (0.3048 m) of lawn: blades scattered on soil from a seed (each drawn blade standing for many) *hypothetical, untested, before the update*
- **House** (`seed.house`): A house: its rooms laid out from the plan you pick (studio, 1, 2 or 3 bed) either side of a hall, each spawned as a Room with its fittings, its doors onto the hall and its windows outside decided by what each wall … *hypothetical, untested, before the update*
- **Into its cells** (`make.into`): A thing put into each cell of an enclosure (its frames "cell 1", …), every other one turned half round if asked, so each one's plus lies beside the next one's minus. *derived, tested here, before the update*
- **Kitchen fittings** (`seed.fittings.kitchen`): What makes a room a kitchen: a run of base cabinets and a worktop along the back wall, the sink in it, a stove and a fridge (cabinets 600 deep, 900 high; a 760 mm range; a 750 × 1750 mm fridge: typical) *hypothetical, untested, before the update*
- **Lithium cell** (`battery.cell`): A cylindrical lithium-ion cell by its format (18650, 21700, 4680): can, sleeve, its jelly roll wound turn by turn (cathode, anode, separator), insulators, cap with its vent disc and gasket *specified, tested here, before the update*
- **Living fittings** (`seed.fittings.living`): What makes a room a living room: a sofa facing a television on its stand, a low table between (a 2.1 m three-seat sofa, typical) *hypothetical, untested, before the update*
- **Logic or memory cell** (`chip.cell`): Transistors made into a cell: a 6T SRAM bit (two inverters holding it, two pass gates) or a NAND2 gate (two p-type in parallel, two n-type in series), with its first metal wires. *hypothetical, tested here, before the update*
- **Loop round a block** (`path.loop`): A path round a rectangle, in its lane (inset from the road's middle), driven with the block on the right as traffic keeps right; and where it must stop: before each crossing it meets, every so many metres *hypothetical, tested here, before the update*
- **Motherboard** (`pc.board`): A motherboard of a form factor (ATX, microATX, Mini-ITX: their standards' sizes) with the package in its socket: memory modules (JEDEC DDR4), power stages, chipset, a PCIe x16 slot, an M.2 2280 drive, power … *hypothetical, tested here, before the update*
- **Neighbourhood** (`seed.neighbourhood`): Streets of blocks with four houses to a block, each house's plan and colours and the car in its drive picked from the seed (change the seed for another street), and cars driving round it, stopping at its lights, as … *hypothetical, untested, before the update*
- **Part** (`card.part`): A real part, drawn whole from its standard with every piece inside it: 41 kinds (stepper nema17 40, led red 5mm, bearing 608, rail MGN12H 400, motorplate nema17 t3 aluminium, bolt M8x30, screw M3x10, panhead M1.6 L2 … *specified, tested here, before the update*
- **Piston and rings** (`engine.piston`): A piston with its three rings, its wrist pin and the pin's two clips, sized from the bore *hypothetical, tested here, before the update*
- **Piston engine** (`engine.whole`): A whole piston engine from its first parts: block, crank, pistons and rods, head, timing, oiling, intake, exhaust and what hangs on it. *hypothetical, tested here, before the update*
- **Processor die** (`chip.die`): A processor die: its cores (each its logic and its L2), its L3, its uncore (graphics, memory controller, I/O), each from the cells below it placed by the million and billion, never copied; its transistors counted from … *hypothetical, tested here, before the update*
- **Processor package** (`chip.package`): A die flipped face down into its package: solder bumps in underfill, a soldered heat spreader, the gold lands under it as its socket's datasheet counts them (LGA1151, LGA1700) *hypothetical, tested here, before the update*
- **Ring** (`shape.torus`): A ring round z: its radius to the middle of the tube, and the tube's radius *hypothetical, tested here, before the update*
- **Road** (`seed.road`): A street along x: two lanes of asphalt, centre dashes, sidewalks each side; its length yours (3.6 m lanes, MUTCD dashes, typical) *hypothetical, untested, before the update*
- **Road system** (`seed.roads`): Streets on a grid of blocks, nx by nz, with a crossing and its stop lights wherever two meet, the lights on their cycle as the clock runs (or held) *hypothetical, untested, before the update*
- **Room** (`seed.room`): A room: floor, four Walls (each plain, with a door, with a window, or open), and the fittings its type plugs in (a bedroom's bed, a bathroom's toilet, a kitchen's sink…). *hypothetical, untested, before the update*
- **Sensor** (`make.sensor`): Any sensor as it is made, from one node: a threaded probe (hex, thread, sealing ring, its element in its tip: a temperature sender, a pressure switch, an oxygen sensor), a puck bolted through its middle (a knock … *hypothetical, tested here, before the update*
- **Sink** (`seed.sink`): A sink with its back to the wall at z = 0, facing +z: a pedestal basin, a vanity, or a kitchen sink in its base cabinet, by its kind (typical sizes) *hypothetical, untested, before the update*
- **Sphere** (`shape.sphere`): A ball of one material: its radius, so its volume and its mass from its material *hypothetical, tested here, before the update*
- **Stack** (`make.stack`): Things stacked along x, so many in all, a pitch apart, taking the things wired in in turn: a cell's negative and positive plates, a heat sink's fins, a stator's laminations, a capacitor's foils. *hypothetical, tested here, before the update*
- **Standard part by size** (`part.family`): A part drawn whole from its standard, its sizes set one by one: 41 families (bolts, nuts, bearings, steppers, rails, extrusions, beams, pipes…) *specified, tested here, before the update*
- **Starting battery** (`battery.starter`): A 12 V lead-acid starting battery by its BCI group (its case is the standard): six cells of plates and separators, straps, joints through the partitions, electrolyte, vent caps and SAE posts. *specified, tested here, before the update*
- **Stop light** (`seed.stoplight`): A signal on its pole, its lenses facing +z: red, yellow or green lit (300 mm lenses, typical) *hypothetical, untested, before the update*
- **Stored part (the built-parts library)** (`stock.part`): A piece from the built-parts library, where every piece every build makes is stored once by its design, at every depth (a car, its engine, the head, the valve, its spring): taken out as it was made, with what it is … *hypothetical, tested here*
- **Strap across** (`make.strap`): A strap cast or welded over every piece named like a pattern, one for each side they stand on (a cell's plate straps over their lugs, a busbar over a row of terminals); or, in series, the pieces on each side joined … *derived, tested here, before the update*
- **Terrain** (`terrain`): Ground over w by d, its hills from a seeded noise (the same seed, the same land): relief is how high its highest is over its lowest, roughness how much small detail it has *hypothetical, tested here, before the update*
- **Terrain of grass patches** (`seed.terrain`): Ground of hills from a seed, covered a foot square at a time with Grass patches standing on it (or bare) *hypothetical, untested, before the update*
- **Toilet** (`seed.toilet`): A close-coupled toilet with its back to the wall at z = 0, facing +z, standing on the floor: pan, seat 400 mm up, cistern and flush (typical sizes) *hypothetical, untested, before the update*
- **Transistor (FinFET)** (`chip.transistor`): The smallest working part of a computer: a FinFET at a real process's published pitches (Intel 22 nm, Intel 14 nm, TSMC N5 as reported): its fins, metal gate on its high-k liner, spacers, raised source and drain, … *specified, tested here, before the update*
- **Tube** (`shape.tube`): A straight tube along y: outside radius, wall and length *hypothetical, tested here, before the update*
- **Turn (lathe)** (`shape.lathe`): A profile of radius and height (mm) spun about y: a propeller hub, a pulley, a knob, a vase *hypothetical, tested here, before the update*
- **Turned part** (`make.turned`): A part turned on a lathe from steps of radius and length along its axis: a shaft, a pin, a valve, an axle, a journal. *hypothetical, tested here, before the update*
- **Tyre** (`tyre`): A tyre as it is made, from its size (a code off its sidewall, or its width, aspect and rim): inner liner, body ply, beads and their apexes, steel belts, cap ply, undertread, sidewalls, and its tread of blocks in … *estimated, tested here, before the update*
- **Vehicle** (`vehicle`): Any wheeled vehicle from what it is: its kind (its seats, body lines and controls as its kind's, scaled to its length), its axles (wired in, or its kind's), its size, frame, power and what it carries; built part by … *hypothetical, tested here, before the update*
- **Vehicle (a real model)** (`vehicle.model`): A real vehicle by its maker's published figures (each with its source), built down to its wheel nuts: a Toyota Corolla, a Freightliner Cascadia, a Honda Rancher, a CRF450R, a Toyota forklift, a John Deere X350, a … *specified, tested here, before the update*
- **Wall** (`seed.wall`): A wall along x standing on the ground, its face to +z: plain, with a door or a window mated into its opening by their frames, or none at all (an open side, where a hall meets a room) *hypothetical, untested, before the update*
- **Wall with an opening** (`wall`): A wall along x, standing on y = 0, with an opening for a door or a window (or none) at an offset from its middle; gives the opening's middle, where a door or a window goes *hypothetical, tested here, before the update*
- **Winding** (`make.wound`): Enamelled wire wound close, turn by turn: on a former round its axis (a solenoid: an injector's, an ignition coil's, a clutch's), round a ring's band (a toroid: a stator's, an armature's), or round a rectangular pole … *hypothetical, tested here, before the update*
- **Window** (`seed.window`): A window: its frame round one pane of glass, centred on its own middle, facing z. *hypothetical, untested, before the update*
- **Wound roll** (`make.roll`): Strips laid over one another and wound round a core: a lithium cell's cathode, separator and anode; a coil's wire; a film capacitor; a roll of tape. *hypothetical, tested here, before the update*
- **Wrap in** (`make.wrap`): A part wrapped in an envelope of a sheet folded round it and sealed at its edges, open at its top: a separator round a battery plate, a bag, a sleeve, shrink wrap *hypothetical, tested here, before the update*

## 3 · Arrange and mate (26)

Place, rows and grids, combine, variants; mate by faces, ports and shafts; zones and mates as numbers; proximity; routes.

- **Bore where it passes** (`bore`): A part bored wherever another runs through it: a hole along the other's line, as wide as it reaches and a clearance more, cut in each piece it passes and in no other (a pushrod's bore through a block, its gasket and … *derived, tested here, before the update*
- **Clear away** (`clear`): What a thing places, less whatever comes within a distance of another thing (grass under a road, trees where a house stands) or, with "keep", only those: deleting by where things are *derived, tested here, before the update*
- **Combine** (`combine`): Several things as one assembly, each where it is: a frame and its motors, a city and the swarm over it *derived, tested here, before the update*
- **Fit in** (`fit`): Every piece of a thing whose name a pattern finds taken out, and the thing wired in put in its place (where it was, turned as it was): a tyre made in depth on every wheel, a real battery pack for the box that stood … *derived, tested here, before the update*
- **Frame** (`frame`): A named place on a thing, facing a way: where something is set on it, or where it is set on something (a door's middle, a house's drive). *derived, tested here, before the update*
- **Hole** (`hole`): A hole drilled into a part: its radius and depth, where it starts on the part and which way it goes in; with sides, a hex or square pocket. *derived, tested here, before the update*
- **It is** (`tag`): Says what a part is: its name, and the inventory item it is (so the audit holds it to its recipe and anything can find it). *derived, tested here, before the update*
- **Its mates, measured** (`mates`): Every mate on everything in a thing, measured where it stands, as numbers: what each carries it to, its measure, its value, the range it must hold in, whether it holds, and whether it is in force in the state you give *derived, tested here, before the update*
- **Line** (`line`): Cables, hoses, wires, pipes, brake lines, traces and roads are one thing: a section swept along a path. *hypothetical, tested here, before the update*
- **Look (substrate, treatment, coating, wear)** (`look`): How a thing looks, as layers, each changeable: its material's own colour worked out from its optics (steel grey, copper red, gold yellow: not chosen), then a treatment grown on it (anodised titanium, heat-tinted … *derived, tested here*
- **Mate** (`mate`): One thing set on another by their frames: its frame lands on the other's, turned to face as it does ("into": a door in its opening, a window in its wall) or back at it ("against": a face on a face). *derived, tested here, before the update*
- **Mate by a measure** (`relate`): A mate as a number, put on the thing itself: to the nearest thing named like the one you give, a measure held in a range: the distance between their middles, the gap between their surfaces, how far off its front the … *derived, tested here, before the update*
- **Mirror** (`mirror`): A thing and its mirror image across a plane through the origin *derived, tested here, before the update*
- **Onto a shaft** (`onto`): A part with a bore slid onto a round piece of another, their axes made one: a sprocket onto a cam's nose, a bearing onto its shaft, a pulley onto a crank. *derived, tested here, before the update*
- **Pattern of** (`array`): A thing many times in a pattern, one thing stored and every one placed: in a row (each a step on from the last), round a ring (about y, each turned to face out: a drone's four motors, a wheel's bolts), or on a grid nx … *hypothetical, tested here, before the update*
- **Place** (`place`): A thing put at a place (x, y, z), turned about x, y and z, at a scale; or at each point of a table wired in (posts at a chain's free ends, bolts at their holes, lamps along a roof), each moved by x, y, z. *derived, tested here, before the update*
- **Place a part** (`place.solve`): Where a part should go, found, never typed: it is taken out, the space round where it could go is mapped (heat, motion, reach), and every place it fits whole, standing on something (or within a bracket of it) and … *derived, tested here, before the update*
- **Point along** (`axis`): A thing turned so its up (y) points along x, y or z, or reversed: a motor laid on its side, a shaft made horizontal *derived, tested here, before the update*
- **Proximity and mates** (`proximity`): Every zone a thing carries kept clear and every mate it carries held, as numbers (Zone: a door's sweep, a toilet's clear floor; Mate by a measure: a sofa facing, seeing and sitting at its distance from its … *derived, tested here, before the update*
- **Route** (`route`): A line's way through a thing, found, not drawn: from what it joins to what it joins (a port of that name if it has one, a battery's post; else the face nearest the other end; or a point), by a logic: clear (the … *derived, tested here, before the update*
- **Scatter** (`scatter`): A thing many times over an area: at seeded random places (the same seed, the same places), or on a grid; each turned and sized a little differently if asked; standing on ground where ground is wired in *hypothetical, tested here, before the update*
- **Spawn** (`spawn`): A seed placed once for each row of a table: each row's x, y, z, ry (turn about y, radians) and s place it, and every other column sets the seed's input of that name (a house's plan, a car's paint). *hypothetical, untested, before the update*
- **Take apart** (`explode`): A thing taken apart to see what is in it, down to its smallest pieces: each piece moved out from the middle of what holds it, and what is inside each piece apart inside it (a truck into its cab, frame and batteries; a … *derived, tested here, before the update*
- **Take out a piece** (`piece`): One piece of anything by its name (the first, or the nth, that matches): a valve spring out of an engine, a bolt out of a truck, a cell out of a battery. *hypothetical, tested here, before the update*
- **Variant** (`variant`): The same thing changed where it is placed: its colour, its material, its finish, its size along x, y and z, or hidden; on all of it, or only the pieces whose names a pattern finds ("prop", "arm|frame") *derived, tested here, before the update*
- **Zone** (`zone`): The room a thing needs kept clear, put on the thing itself and worked out from its own size: in front of a face, so deep (a toilet's clear floor, a kitchen's work aisle), or swept from a hinge at one edge of that face … *derived, tested here, before the update*

## 4 · Choose, size and decide (16)

Pick from a catalogue by duty, size a part, a wire, a battery; solve for what is wanted; if, compare, pick one.

- **Autopilot** (`auto.loop`): Checks a thing by the rules, groups what is wrong into problems, and tries the repairs on each, least costly first, keeping one only if its problem is gone and the parts it changed have less wrong than before; then … *derived, tested here, before the update*
- **Choose** (`logic.if`): The first value where the test holds, else the second *derived, tested here, before the update*
- **Compare** (`logic.compare`): Whether a is less than, more than, or equal to b *derived, tested here, before the update*
- **Map of the space** (`field`): A map of one quantity over the space round part of a thing, cell by cell, where things could go (cells inside a solid piece left out): heat (°C: the rules' own fall-off from each hot surface, blocked by anything solid … *simplified, tested here, before the update*
- **Maps as one cost** (`field.combine`): Maps of the same space as one cost per cell: each read as how bad it is (heat over a limit, room under a gap, reach short of an arm), weighted and added. *derived, tested here, before the update*
- **Next size up** (`logic.next-size`): The smallest standard size at least the size worked out: a bolt from its diameter, a beam from its depth *derived, tested here, before the update*
- **Pick by duty** (`size.select`): A catalogue item picked by the duty it must do, the duty read from the thing, never typed: a starting battery by its engine (fuel and displacement as the engine states them: about 1 cold-cranking amp per cubic inch … *derived, tested here, before the update*
- **Pick one** (`pick`): One of several things, by name: plug in what each choice is (a bathroom's fittings, a kitchen's, a bedroom's…), and the choice says which comes out *derived, tested here, before the update*
- **Repairs** (`repair.library`): What the autopilot may do about a finding, by the rule it answers, least costly first: nudge a part clear of what it runs into, move it (the placement solver), put a heat shield between. *derived, tested here, before the update*
- **Say why** (`explain`): Why a result is as it is, in plain lines, shortest first: a placement (where it went, what bound it, why where it was did not do, the next best and what each gives up, how many places failed each test, where the … *derived, tested here, before the update*
- **Show a map** (`field.show`): A map drawn in 3D as coloured cells, blue (good) to red (bad): only the cells at least so bad, or a slice across it. *derived, tested here, before the update*
- **Signal cycle** (`cycle`): Which phase a fixed-time cycle is in at a time ("green 30, yellow 4, red 34", seconds): a traffic signal's, a washing machine's. *derived, tested here, before the update*
- **Size a line** (`size.line`): A line sized by what it carries: a wire by its current over its length (out and back, or back through the chassis), the thinnest AWG whose drop is within what may be lost (3 % of 12 V, typical); a bore by its flow at … *estimated, tested here, before the update*
- **Solve for zero** (`math.root`): Where a formula is zero, as one of its names varies between two ends (every other name an input): by Brent's method, bisection, Newton's or the secant, to the tolerance set, saying whether it converged and its error. *derived, tested here*
- **Solve through laws** (`law.solve`): What is known, one a line ("mass = 1000 kg"), and a quantity wanted: the laws of the book chained to reach it, as many as it takes and across fields, each solved forward or backward. *derived, tested here*
- **What each part needs** (`need`): What every part of a thing needs of where it is, read from what its parts state, never typed: what it is mounted on, what it connects to or passes through, what it keeps out of (heat over its material's limit, what … *derived, tested here, before the update*

## 5 · Check (19)

Rules, clashes, loads, what is missing, how finely made, gates: what is wrong, said with numbers.

- **Approved** (`gauntlet.approved`): What has come through the gauntlet so far (read from its verdicts), and what was turned back and why *derived, tested here, before the update*
- **Candidates** (`gauntlet.candidates`): What is put through the gauntlet: blocks of the library (all, of a kind or a field, or made by you), or entries of the inventory (under a path, or yours), or named ones. *given, tested here, before the update*
- **Check a limit** (`check.limit`): A value against its limit: whether it passes, the margin left, and the factor of safety *derived, tested here, before the update*
- **Clashes** (`clash`): Which of the things a thing places run into one another (a car parked into a house, a pipe through a beam): their boxes, as far down as asked, overlapping by more than a touch. *derived, tested here, before the update*
- **Comes apart to the bottom?** (`audit.explode`): How far a build really comes apart: the share of its mass in lumps (a piece drawn as one though what it is named for is an assembly in the inventory: a headlamp, a door, a fuel tank), each said with what it should … *derived, tested here, before the update*
- **Conservation balance (in − out − accumulation)** (`check.balance`): What goes in against what comes out and what is kept, of one thing that is conserved (energy, mass, momentum along one axis, charge): every wire into In and into Out summed in one unit, and the imbalance. *derived, tested here*
- **Contact graph** (`graph`): The contact graph of any thing, read from its geometry with nothing typed: every piece a node, every two that touch an edge, with where they meet, which way, how hard they press and over what patch; the groups that … *derived, tested here*
- **Feed the proposals in** (`gauntlet.feed`): The proposals with a source (read off a drawing, a reference, or the web) entered in the inventory, what each holds first; the inferred stay proposed until a source confirms them *derived, tested here, before the update*
- **Frame analysis (3D beams)** (`bend`): Any thing as a 3D frame of beams, read from its geometry (What touches what), nothing typed: each piece cut into slices, each slice a beam of its own section and material (stretch, twist and bending both ways, … *derived, tested here*
- **How finely is it made?** (`check.fidelity`): A drawn thing measured for how finely it is made: its pieces and kinds; how many, and how much of it, are still plain boxes (a casting drawn as a slab wants its ribs, bosses and fillets); how many are shaped (turned, … *derived, tested here, before the update*
- **Lumped network analysis** (`flow`): Heat, current or force through any thing between two sets of its pieces, over its contact graph (What touches what), nothing typed: the ends chosen by what pieces are (the highest, the lowest, or a name or material). *derived, tested here*
- **Mass, centre and inertia** (`mass.properties`): What follows from a thing's pieces, nothing counted twice: its mass, its centre of mass, its inertia about that centre (each piece's own, exact for a box, a cylinder or a ball, else its box, an estimate, plus its mass … *estimated, tested here*
- **Measure** (`measure`): What a thing weighs and spans, how many pieces it places, and how few distinct things it is stored as *derived, tested here, before the update*
- **Nothing runs into anything?** (`check.rules`): The rules a made thing is held to, on its surfaces as drawn (triangle against triangle): no two pieces cross unless they are one piece, one is said to pass through the other, one is a fastener in what it fastens, or … *derived, tested here, before the update*
- **Run the gauntlet** (`gauntlet.run`): Every candidate through the gates chosen (all if none, one for a single gate), each where it applies, cheapest first: approved only when none fails. *derived, tested here, before the update*
- **Switch-level cell characterisation** (`cell.characterise`): One of a chip's own gates, of the kind you pick (the commonest first), copied out of its netlist and run at switch level through every input: its truth table, and whether it gives the gate its pull-down network says. *derived, tested here*
- **Tester** (`test.block`): A block of the library put to its own tests, then pushed far from its defaults (zero, a thousandth, a thousand times, negative): each failure and each crash said, and whether it answered or refused in words *derived, tested here, before the update*
- **Turn it over and check** (`check.turning`): A piston engine turned through a whole revolution of its crank, a step at a time: at each, its crank and every piston and rod where they then are, tried against everything else (block, caps, pan, pump, cams in the … *derived, tested here, before the update*
- **What it is made of** (`made.of`): Any thing opened as its materials all the way down: its own tree with each thing's mass and share (a thing placed many times counted at each place, once), its mass by material (each said as exactly as it is known: a … *derived, tested here*

## 6 · Simulate and run (17)

Physics, motion, the clock, chips run from their transistors, engines under load.

- **Clock** (`time`): The time the board is at, in seconds: the time bar's. *given, tested here, before the update*
- **Drive** (`drive`): Any powertrain on the road: its engine's torque curve (from Run an engine), its gearbox (a manual's gears, or a CVT's range and launch gear), its final drive, its tyres' rolling radius from their size code, its mass … *simplified, tested here, before the update*
- **Engine under load** (`load.engine`): A piston engine at a speed and a peak cylinder pressure, its working parts read off them as drawn: the rod pulled at the top of the exhaust stroke and pushed at firing, its buckling, its bolts; its crank pin's bearing … *derived, tested here, before the update*
- **Follow a path** (`follow`): Things moving along a path at the clock's time: each speeds up and slows as a car does, keeps a gap to the one ahead, and stops at a stop line while its way is red (or yellow, if it can stop). *simplified, tested here, before the update*
- **Forever** (`forever`): Things repeated without end on a lattice (along x, y, z, or any of them), each cell one of them picked from the seed: the same cell, the same one. *hypothetical, tested here, before the update*
- **Hinge** (`hinge`): A revolute joint for Let it go: one thing turning on another (or on the world, fixed) about an axis through a point, between limits, with friction. *derived, tested here, before the update*
- **Let it go** (`letgo`): Real rigid-body physics (Jolt) over what is made: each thing it places a body of all its pieces, its mass from its materials, falling, landing, sliding, tipping and coming to rest on the floor, on what it is put on … *simplified, tested here, before the update*
- **Push** (`push`): A force on one thing Let it go lets go, for so long from the start: a shove, a kick, a gust *simplified, tested here, before the update*
- **Run an engine** (`engine.run`): Any piston engine run from what it is (its bore, stroke, rod, compression, cylinders and the intake valves its head is built with): each cylinder crank degree by crank degree, filled as its valves let it (Taylor's … *simplified, tested here, before the update*
- **Spring under load** (`load.spring`): A coiled spring as it was made (its wire, its coil, its coils, its free and fitted lengths, read off the part), compressed as fitted and by a stroke more: its rate and forces, its wire's stress against what the wire … *derived, tested here, before the update*
- **Sweep** (`sweep`): The room a thing needs as it turns from one angle to another about a pivot: it, at so many angles between, as one thing (its envelope), for Clashes to check against what is round it (a door's swing against the bed, an … *derived, tested here, before the update*
- **Sweep (stress test)** (`sweep.range`): Any block in the library run over a range of one of its inputs (an engine's speed, a beam's load, a loan's rate), the rest wired in as for the block itself: every answer in a table, and the worst of them and where it … *derived, tested here, before the update*
- **Switch-level simulation against an instruction-set model** (`logic.run`): A program assembled and run on a chip's transistors, at switch level, half a clock cycle at a time, against 64 KB of memory; and beside it on the fast model (the instruction set as its manual gives it), compared … *simplified, untested*
- **Thermal analysis (conduction, convection, radiation)** (`thermal`): How hot each piece of any thing gets, over its contact graph (Contact graph), nothing typed: pieces held at a temperature (the hottest, the lowest, a name or a material), heat put into others (a chip, a coil, a … *derived, tested here, before the update*
- **Through time** (`math.ode`): How quantities change when their rates are known: one line a rate ("y' = -k * y"), where each starts ("y = 1"), from one time to another. *derived, tested here*
- **Transistor-level netlist** (`netlist`): A chip as its transistors: each a switch between two nodes, closed while the node at its gate is high, some nodes held high by a load. *measured, untested*
- **Turn** (`turn`): A thing turned about an axis through a point to the angles given at their times ("0 s 0°, 2 s 90°, 6 s 90°, 8 s 0°"), driven as a servo drives a joint: it speeds up and slows down at its acceleration, no faster than … *derived, tested here, before the update*

## 7 · Sense and act (6)

What things give off and afford, gases, who notices what, agents and their goals.

- **Agent** (`agent`): A body with senses and a goal. *simplified, untested, before the update*
- **Goal** (`goal`): What an agent sets out to do, as a verb and a target: open it (a door, a gate, a lid), go to it, or keep away from it; the target found by its name, or by what it lets a body do (sit on, open, grasp …), the nearest or … *given, tested here, before the update*
- **What it gives off** (`signature`): What every part of a thing gives off, read from what it is, never tagged by hand: how far it is seen (its size against the eye's one arcminute, less the lower its contrast), how far it is heard if it makes sound by … *simplified, tested here, before the update*
- **What it gives off into the air** (`gas`): A gas as a substance, not a smell: what a thing gives off in a state (an engine running: its exhaust from its displacement and speed, at most the carbon monoxide and hydrocarbons a catalyst car may give at idle; a … *simplified, tested here, before the update*
- **What it lets you do** (`afford`): What every part of a thing lets a body do, read from its shape, mass, joints and material against that body (an adult, or a child of 8: its grip, reach, knee height, stride and strength from its stature): grasp a bar … *simplified, tested here, before the update*
- **Who notices what** (`sense`): What each observer takes in where it stands, facing what it faces: a person sees by rays out from its eyes packed as its acuity is (sharp where it looks, thin to the side), each meeting the first thing in its way; … *simplified, tested here, before the update*

## 8 · Laws and formulas (354)

Every physical law as a calculator, by its field, and formulas you write.

- **Chemical & process** (6): Butler-Volmer equation, Faraday's laws of electrolysis, Fick's law of diffusion, Gibbs free energy, Michaelis-Menten kinetics, Nernst equation
- **Controls & robotics** (1): PID loop on a lag
- **Electrical** (29): Ampère's law (a long solenoid), Back-EMF, Cable equation (the length constant), Copper's resistance with temperature, Coulomb's law, DC motor current, DC motor torque, Electrical energy, Electrical power, Electrostatic pull between plates, Energy in a capacitor, Energy in an inductor, Faraday's law of induction, Joule heating, Lead-acid open-circuit voltage, Lorentz force on a conductor, Magnetic pull across a gap (Maxwell), Mechanical time constant, Ohm's law, RC time constant, Resistance of a wire, Seebeck voltage (thermocouple), Shockley diode equation, Skin depth, Solar cell power, Speed of an electromagnetic wave, Strain gauge, Switching power of CMOS logic, Voltage drop along a pair
- **Electronics & embedded** (3): LED series current-limiting resistor, RC low-pass cutoff frequency (−3 dB), Resistive voltage divider (unloaded)
- **Energy & environment** (2): Battery runtime at constant power, Daily photovoltaic energy yield
- **Everyday** (1): Unit converter
- **Manufacturing** (4): Filament for a print, Machining time, Spindle speed, Surface texture from the process (roughness, gloss)
- **Materials** (22): Area of a circle, Axial stiffness of a bar, Carbon dioxide a lime can hold, Composite and mixture properties (micromechanics), Contact angle (Young), Endurance limit of steel, Flexural stiffness of a beam, Griffith criterion, Hall-Petch relation, Hooke's law, Inverse rule of mixtures (across the fibre), Piezo stack stroke, Polar moment of a circle, Reflectance colour (Fresnel, CIE 1931), Rule of mixtures (along the fibre), Scale-up for sintering shrinkage, Second moment of a circle, Thermal expansion, Thin-film interference colour (oxides, anodising, heat tint), Torsion constant of a rectangle, Torsional stiffness of a bar, Von Mises stress
- **Math** (10): Add, Divide, Formula, Integral, Multiply, Power, Round, Slope, Statistics, Subtract
- **Mechanical** (45): Bearing life in hours, Bearing rating life (L10), Belt or rim speed, Bolt tightening torque (nut factor), Capstan (belt friction) equation, Centripetal force, Chain pull, Chain speed, Conservation of momentum (two bodies that stick), Cornering speed limit, Coulomb friction, Efficiency of a power screw, Energy a flywheel can hold per kilogram, Energy in a spring, Force from a power screw, Froude number of a gait, Gear tooth bending stress (Lewis), Grade resistance, Gravitational potential energy, Gravitational time dilation, Gruebler's equation (planar), Helical spring rate, Helical torsion spring rate, Hertzian contact (a sphere on a flat), Hill's muscle equation, Kinetic energy, Moment of inertia of a disc, Moment of inertia of a rod about its end, Natural frequency of a mass on a spring, Newton's second law, Parallel axis theorem, Pendulum period, Power of a force, Power of a torque, Rocket equation, Rolling resistance, Rotational kinetic energy, Shaft diameter for bending and torque (static), Speed after a fall, Speed of a longitudinal wave in a bar, Stopping distance, Torque at a wheel, Torque through a gear train, Traction limit, Weight
- **Physics & science** (182): A flow from a mass that makes it, A flux over an area, A front advanced by diffusion, A shape's surface over its sphere's, A share of a mass, A share of what it can hold, A stock of mass and its turnover, Activity of a radioactive sample, Adiabatic compression of an ideal gas, Amount in a volume, Angular momentum, Area of a rectangle, Arrhenius factor between two temperatures, Beer–Lambert law, Bending capacity of a bolt group prying about the footprint edge, Bending moment from a beam's own weight, with overhangs, Bending moment under a central patch load, Bragg's law, Capacitance of parallel plates, Capillary porosity of cement paste (Powers), Charge carried by a current, Charge on a capacitor, CO₂ diffusivity in concrete (Papadakis), Coefficient of restitution, Compton shift, Concentration of a gas, Corrosion rate from its current (Faraday), Critical speed of a shaft, Current from a flux of reactant (Faraday), Damped oscillator, de Broglie wavelength, Density of a mixture, Difference of two concentrations, Diffusion in from a held surface (Fick's second law), Distance at a steady speed, Distance under steady acceleration, Dittus–Boelter correlation, Doppler shift of an approaching source, Dose at a dose rate, Drag at low Reynolds number (Stokes), Efficiency of a heat engine, Efficiency of a straight fin, Elastic collision of two bodies, Energy at a power over a time, Energy levels of hydrogen, Energy of a photon, Entropy gained in heating, Entropy of a yes-or-no, Equilibrium constant from Gibbs energy, Escape speed, Fatigue life (Basquin), Filtration through a membrane (Starling), First-order decay, Flows meeting at a junction, Fringes of two slits, Gas dissolved in a liquid (Henry), Goodman line, Gravitational potential energy of two masses, Growth by doubling, Gyroscopic precession, Half-life, Harmonics of a string or pipe, Hazard from a dose rate, Heat carried by a phase change, Heat through two layers in series, Height of a prism of given mass and footprint, Heisenberg uncertainty, Hooke's law of a spring, Ideal transformer, Impulse, Independent rates add, Inverse square spreading, Kepler's third law, Laminar flow in a tube (Hagen–Poiseuille), LC resonance, Length contraction, Lengthening of the period with the swing (the series), Lengthening of the period with the swing, from energy conservation, Lorentz factor, Loss at a first-order rate, Magnetic field of a long wire, Magnetic force on a moving charge, Magnification of a lens, Malus's law, Mass flow of a molar flow, Mass flow of a volume flow, Mass of a rectangular prism, Mass of a volume, Mass–energy equivalence, Mean kinetic energy of a gas molecule, Metabolic scaling (Kleiber), Mid-span sag from a beam's own weight, with overhangs, Mid-span sag under a central patch load, Moles in a mass, Moment at the root of a cantilever, Moment of inertia of a rectangular prism about its centre, Momentum, Mortality rising with age (Gompertz), Murray's law of branching, Net power, Newton's law of gravitation, Newton's second law for rotation, Osmotic pressure (van 't Hoff), Particle in a box, Paths in parallel, Period of a physical pendulum, small swings, Period of the first mode of a simply supported beam, pH, Photoelectric effect, Pipe friction factor (Haaland), Planck relation, Poisson contraction, Power from a mass that gives it, Power of a flow of moles, Power through a belt, Power-law creep, Powers together, Pressure, Pressure in a curved surface (Young–Laplace), Radiation as a conductance, Range of a projectile, Raoult's law, Reaction rate from its power, Reactions of a symmetric beam on two supports, Relativistic momentum, Resistors in parallel, Resistors in series, Root-mean-square speed of a gas, Second moment of a rectangle, Second-order rate law, Section modulus of a rectangle, Shear at the root of a cantilever, Shear modulus of an isotropic solid, Snell's law, Sound intensity level, Speed after a distance under steady acceleration, Speed in a circular orbit, Speed of sound in a gas, Speed under steady acceleration, Stages one after another, Steady mass balance, Stock, flow and residence time, Stoichiometry by mass, Stoichiometry by moles, Strain, Strain energy density, Stress intensity at a crack, Tensile capacity of a bolt group, Tensile stress area of a metric thread, Terminal speed, The exponent of a space-filling network, The flow of many, The free energy of a gradient, The largest a sphere can live by diffusion, The least surface a volume can have, The mass of many, The most a wet skin can evaporate, The rate of many, The room many take, The tallest column that holds its own weight, Thermal stress in a held bar, Thin lens equation, Time at a faster rate, Time dilation of motion, Tip deflection of a cantilever under a patch load at reach a and its own weight, Torque of a plate clutch (uniform wear), Van 't Hoff equation, Vapour pressure (Clausius–Clapeyron, integrated), Vapour pressure at a humidity, Vis-viva equation, Volume by shape in a box, Volume of a cylinder, Volume of an ellipsoid, Water held by a material (GAB isotherm), Wave speed, Wave speed on a string, Weight per length of a rectangular bar, What a flow carries, What is left of a flow, Wien's displacement law, Work of a force, Years left by the Gompertz–Makeham law
- **Software & data** (7): Diffraction limit of an aperture, Information in a choice, Landauer's limit, Little's law, Nyquist-Shannon sampling theorem, Resolution of optical lithography (Rayleigh), Shannon capacity
- **Structural & civil** (13): Angle of twist, Axial stress, Bending stress, Deflection of a cantilever under an end load, Euler buckling, Euler-Johnson transition slenderness, Hoop stress in a thin-walled cylinder, Johnson column formula, Plastic moment of a section, Sag of a simply supported beam under a central load, Sag of a simply supported beam under a spread load, Shear in a fillet weld, Shear stress in a twisted round shaft
- **Thermal & fluids** (29): Aerodynamic drag, Aerodynamic lift, Arc welding heat input, Archimedes' principle, Arrhenius rate, Bernoulli's equation, Boltzmann distribution, Carnot efficiency, Clausius-Clapeyron relation, Continuity equation, First law of thermodynamics, Fourier's law, Free convection in still air, Heat capacity, Hydrostatic pressure, Ideal gas law, Ideal static thrust of a rotor (momentum theory), Least work to take out a trace, Lumped thermal time constant, Newton's law of cooling, Pressure drop in a pipe (Darcy-Weisbach), Reynolds number, Sound insulation of a wall (mass law), Stefan-Boltzmann radiation, Sunlight a surface absorbs, Temperature rise through thermal resistances, Thermal resistance of a wall, Time to diffuse a distance, Work in a compressed gas (isothermal)

## 9 · Data, money and projects (36)

Tables and rows, research, the gauntlet, money, operations.

- **Break-even analysis (cost–volume–profit)** (`fin.breakeven`): How many must be sold to cover fixed costs, and the sales that takes *derived, tested here*
- **Column** (`list.column`): One column of a table, as a list *derived, tested here, before the update*
- **Compile research** (`research.merge`): Several references compiled into one: every source kept, each part once, a later one filling in what an earlier lacks, and where two sources give a different count, a conflict said to be settled *derived, tested here, before the update*
- **Compound interest (future value)** (`fin.compound`): What an amount grows to at a rate, compounded so many times a year *derived, tested here*
- **Critical path method (CPM)** (`ops.critical-path`): How long a project takes and which tasks set it: rows of task, how long, and what each must wait for (names split by ; or spaces) *derived, tested here*
- **Cumulative sum (running balance)** (`list.running`): Each item added to all before it, from a start: a balance from its ins and outs *derived, tested here*
- **Delete** (`delete`): Takes something out: a block you (or Claude) made, an entry you fed, a proposal, an unknown off the queue. *derived, tested here, before the update*
- **Gross margin and markup** (`fin.margin`): From cost and price: the profit, the margin on the price and the markup on the cost *derived, tested here*
- **Internal rate of return** (`fin.irr`): The discount rate at which cash flows are worth nothing today: found between −99 % and 1000 % by the method chosen (bisection by default), with whether it converged *derived, tested here*
- **Into the inventory** (`research.toInventory`): A reference entered in the inventory (filed under Researched), each of its parts an entry holding its own parts by count and saying its source: so it opens all the way down like anything stored, and what has nothing … *derived, tested here, before the update*
- **Its parts, and theirs** (`research.parts`): An item in the inventory opened all the way down: its components, their sub-components and theirs, each with how many and how it is made or bought; and every one of them still waiting to be broken down, with why (not … *derived, tested here, before the update*
- **Keep where** (`list.filter`): Keeps the items of a list a condition holds for ("x > 0"), x each item in turn *derived, tested here, before the update*
- **Loan amortisation payment (annuity)** (`fin.loan`): The payment each period that pays a loan off, with interest, in so many periods (an annuity) *derived, tested here*
- **Make a table** (`list.zip`): Lists side by side as the columns of a table *derived, tested here, before the update*
- **Move rows** (`rows.shift`): Every row moved by dx, dz (and turned by dry): the car in front of each house, the lamp beside each door *derived, tested here, before the update*
- **Net present value (NPV)** (`fin.npv`): What a series of cash flows is worth today at a discount rate; the first flow is now *derived, tested here*
- **Onto the ground** (`rows.ground`): Each row (a house's lot, a tree, a car) set on the ground where it stands: its y the ground's height at its x and z, so what is spawned from them stands on the hills, not in them *derived, tested here, before the update*
- **Overall equipment effectiveness (OEE)** (`ops.oee`): How much of a machine's time makes good parts: availability × performance × quality *derived, tested here*
- **Pass** (`pass`): A gate on a wire: what comes in goes on out of passed while the condition holds, else it is held (out of held) and what follows passed waits *derived, tested here, before the update*
- **Relative change (percentage)** (`fin.change`): How much a value went up or down, as a share of what it was *derived, tested here*
- **Research loop (to the bottom)** (`research.loop`): From the roots down, round after round, until nothing more is found: what is unknown under them is sorted, the most wanted clusters first, and each resolved by a family that makes that size, a researched reference, … *derived, tested here, before the update*
- **Research notes** (`research.notes`): What was found out about a real thing (a reference kept, or your own notes), written down a line a part with where it was read: "@S1 | https://… | title" names a source once; "id | name | in | n | finds | source | … *estimated, tested here, before the update*
- **Rows on a grid** (`rows.grid`): Rows for a spawner: one for each place on an nx by nz grid (x, z), and for each column asked, a value picked at seeded random from its list ("layout: studio|1 bed|2 bed; paint: #e8dcc8|#cfd8dc"), or a number in a … *hypothetical, tested here, before the update*
- **Rules over rows** (`rows.recode`): Each value in some columns changed by the first rule that finds it: "what it is / what is there: what it becomes", * for anything ("hall/outside: door; */outside: window; *: wall"). *derived, tested here, before the update*
- **Search the web (Wikidata)** (`search.web`): What Wikidata says a thing has as its parts and is made from: its entity found by its words, its "has part(s)" and "made from material" read, its address the source. *hypothetical, untested, before the update*
- **Search what is known** (`search.library`): Words looked for through everything (src/nexus/navigate.ts): every node, law, seed and starter board, every product, part, material, body, reference and program, and the catalogue's sizes, the best first: each match … *derived, tested here, before the update*
- **Sentence** (`text.format`): Words with values filled in: "{a} costs {b}" *derived, tested here, before the update*
- **Set a column** (`rows.set`): Every row given the same value in a column: each room of a house painted its wall colour, each house of a street its roof *derived, tested here, before the update*
- **Sort** (`list.sort`): A list from least to most, or most to least *derived, tested here, before the update*
- **Straight-line depreciation** (`fin.depreciation`): What an asset loses each year, evenly over its life, down to what it is worth at the end *derived, tested here*
- **Task** (`task`): A task on the board: what is to be done, and done when what it waits on holds (wire in a gate's count, an approval, a check). *derived, tested here*
- **Tether** (`tether`): A mate held with force, for Let it go: a line of any section made fast to a point on one thing and a point on another (or on the world), slack while they are nearer than its length, past it pulling back by its own … *derived, tested here, before the update*
- **Unknown library queue** (`unknown.queue`): Everything something wants that nothing knows: not in the table, listed only as its materials, nothing in it listed, or drawn as one piece though it is made of parts. *derived, tested here, before the update*
- **What each touches** (`rows.touch`): For boxes laid on the ground (rows with x, z, w, d: a house's rooms, a street's lots), what each side touches: the type of the box along most of it, or "outside". *derived, tested here, before the update*
- **What is missing** (`research.gap`): A drawn thing held against its researched reference: every part the sources name looked for among the drawn pieces by its pattern (a part's parts inside what found it), each drawn, short of its count, missing, or … *derived, tested here, before the update*
- **When…** (`on.event`): Listens for what happens in the gauntlet: something approved, rejected, queued as unknown, resolved, proposed, deleted, or a round of the research loop ended. *derived, tested here, before the update*

## 10 · Show (6)

Tables, values, charts, the 3D view, the space.

- **3D view** (`view.3d`): A part drawn in 3D, every piece of it: drag inside to turn it, take it apart, open it full screen *derived, tested here, before the update*
- **Chart** (`view.chart`): A list drawn as a line, against its place or against another list *derived, tested here, before the update*
- **Gauge** (`view.gauge`): A value on a dial between two ends *derived, tested here, before the update*
- **Show** (`view.show`): A value, large, in its unit *derived, tested here, before the update*
- **Show in space** (`space.show`): Puts a thing into the 3D space, at its place: everything wired into one of these is what the space draws *derived, tested here, before the update*
- **Table view** (`view.table`): Rows shown as a table on the board: each row a line, each field a column, as wide as its widest value *derived, tested here, before the update*

## 11 · Board tools (5)

Groups, notes, code, asking, events.

- **Ask Claude** (`ai.ask`): Asks Claude, or Nexus where Claude cannot be reached; {input} is what comes in *hypothetical, untested, before the update*
- **Code** (`code`): Code with ports: each input is a name in it, what it returns (an object, port by port, or one value) fills its outputs. *derived, untested, before the update*
- **Group input** (`group.in`): What comes into the group, under this name *derived, untested, before the update*
- **Group output** (`group.out`): What goes out of the group, under this name *derived, untested, before the update*
- **Note** (`note`): Words on the board, for people: it runs nothing *derived, tested here, before the update*

