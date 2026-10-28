# The node library

Generated from the library (`libraryCatalogue()` in `src/nexus/blocks.ts`); `tests/nexus/shelves.test.ts` fails if it is out of date (write it again with `UPDATE_NODES=1 npx vitest run tests/nexus/shelves.test.ts`). 361 nodes, on 11 shelves in the order a board runs; a node's shelf is read from what it is (`stageOf`), never filed by hand.

## 1 · Start: values and inputs (9)

Numbers, text, lists, tables, the clock, cards of materials and parts: what a board starts from.

- **List of numbers** (`in.list`): Numbers you type, split by commas: wire it into any block to run that block once for each
- **Material** (`card.material`): A material as the kept data has it: density, stiffness, strengths
- **Measure** (`measure`): What a thing weighs and spans, how many pieces it places, and how few distinct things it is stored as
- **Number** (`in.number`): A number you set, in any unit: typed "200 mm" is kept as 0.2 m; with ends set, held between them and shown as a slider you drag
- **Range** (`in.range`): Evenly spaced numbers from one end to the other: a sweep
- **Read** (`read`): A block of the library or an entry of the inventory read as it is (block:… or item:…, or either by its id or words): a block's ports, settings, tests and sources; an entry's place, make and what is in it
- **Table** (`in.table`): Rows you paste, the first row their headings (comma or tab separated): numbers read as numbers
- **Text** (`in.text`): Words you type, carried on a wire to whatever reads text (a label, a search, a note)
- **Yes / no** (`in.toggle`): A switch you flip: yes or no, carried on a wire to whatever decides by it

## 2 · Make: shapes, parts, things (72)

Shapes, standard parts, makers by process, seeds (a door, a room, a house, a car), bodies, lines.

- **Axle** (`vehicle.axle`): An axle of a vehicle: where it is along it (+ forward of its middle), its track, its tyres by size code, whether it steers, drives, has twin tyres, its brakes and how it hangs from the frame.
- **Bathroom fittings** (`seed.fittings.bathroom`): What makes a room a bathroom: a toilet and a basin against the back wall, a bath along the left (a 1.7 × 0.75 m bath, typical)
- **Battery pack** (`battery.pack`): Cells in a pack: so many groups in series, each so many cells in parallel standing in staggered rows, a busbar over each group, the groups in modules, the modules in a tray.
- **Bed** (`seed.bed`): A bed with its head to the wall at z = 0, its foot toward +z: frame, mattress, headboard and two pillows; twin, full, queen or king (US mattress sizes)
- **Bedroom fittings** (`seed.fittings.bedroom`): What makes a room a bedroom: a queen bed against the back wall, a bedside table each side, a wardrobe in the corner (600 deep, typical)
- **Body** (`body`): A human body from its measured segments, not drawn by eye: laid out from its height by Drillis and Contini's proportions, its sixteen segments each the share of its mass de Leva measured (men and women apart), shaped …
- **Box** (`shape.box`): A block: width (x), height (y), depth (z)
- **Car** (`seed.car`): A mid-size sedan, its middle on the ground at the origin, facing +x: body, cabin, windows, four wheels (tyre and rim), lamps and bumpers; its paint yours (4.7 × 1.8 × 1.45 m, typical)
- **Cast grid** (`make.grid`): A grid cast in one: a frame round its edge, bars upright and wires across inside it, and a lug at its top.
- **Chain round wheels** (`make.chain`): Roller chain round sprockets in a plane, link by link (inner links of plates, bushes and rollers; outer of plates and pins): a timing drive, a bicycle's, a conveyor's.
- **City** (`seed.city`): A city of neighbourhoods, n by n, each its own streets, houses and cars from its own seed
- **Coat** (`make.coat`): A part coated with another material, filling it and standing proud of it each side along its thinnest way: paste pressed into a grid, paint, plating, an overmould.
- **Coiled spring** (`make.coil`): Wire coiled round a mandrel, its ends closed: a valve's spring, a clutch's, a pen's
- **Cone** (`shape.cone`): A cone along y: base radius and height
- **Connecting rod** (`engine.rod`): A connecting rod forged to its I-section, its cap cracked off, its two shells and two bolts
- **Crankshaft** (`engine.crank`): A crankshaft forged in one: its main journals, a pin for each throw at its firing angle, webs and counterweights, its nose and flange
- **Crossing** (`seed.crossing`): Where two streets cross: its asphalt and a stop light at each corner, one way's lights and the cross street's each as set (a signal cycle sets them both)
- **Cut gear or sprocket** (`make.gear`): Teeth cut round a bore by module and count: a spur gear, a timing sprocket, a ring gear, a pump's rotor
- **Cylinder** (`shape.cyl`): A cylinder along y: its radius and height; a second radius at its top makes it a frustum
- **Cylinder block** (`engine.block`): The block cast round its cores (barrel, water jacket, crankcase, bulkheads), its liners, main caps, shells and bolts
- **Cylinder head** (`engine.head`): The head cast round its ports, its valves, springs, retainers, keepers, guides, seals, tappets or rockers, its cams and caps, its bolts, its plugs and coils or its injectors
- **Desktop PC** (`pc.desktop`): A desktop PC round a motherboard: a mid-tower case (its glass side left off so its inside shows), an ATX power supply, the board on its standoffs, a tower cooler (copper base, heat pipes, fin stack, fan) on the processor
- **Door** (`seed.door`): A door: its leaf hung on two hinges, a lever handle on each face 1 m up, its lining; centred on its own middle.
- **Enclosure with cells** (`make.enclosure`): A moulded enclosure in one piece: its floor, walls and partitions dividing it into cells along its length, ribs under each cell; and its lid.
- **Engine piece** (`engine.piece`): One of a cylinder head's pieces made to the engine's size, on its own: an intake or exhaust valve, a valve spring, its retainer, a bucket tappet, a spark plug, an ignition coil.
- **Extrude** (`shape.extrude`): A profile drawn in x and y (mm), pushed out along z to a length: a bracket, a beam, a plate of any outline
- **Fastener (any)** (`make.fastener`): Any bolt, screw, stud, rivet or pin from one node: its head (a polygon of 4, 6 or 8 sides, round, pan, button, countersunk, flanged or none), its drive, its shank, its thread drawn as a helix to its pitch, its point; …
- **Fill** (`make.fill`): Each cell of an enclosure filled with a liquid to a height: a battery's acid, a tank's fuel, a radiator's coolant.
- **Floor plan** (`plan.rooms`): A house's rooms laid out from its plan: rows of rooms split by "/", rooms in a row by ",", each "type W x D" in metres ("bedroom 4x4, bathroom 2.5x3 / kitchen 4x3.5, living 5x3.5"); or a plan by name.
- **Grass patch** (`seed.grass`): A foot square (0.3048 m) of lawn: blades scattered on soil from a seed (each drawn blade standing for many)
- **House** (`seed.house`): A house: its rooms laid out from the plan you pick (studio, 1, 2 or 3 bed) either side of a hall, each spawned as a Room with its fittings, its doors onto the hall and its windows outside decided by what each wall …
- **Into its cells** (`make.into`): A thing put into each cell of an enclosure (its frames "cell 1", …), every other one turned half round if asked, so each one's plus lies beside the next one's minus.
- **Kitchen fittings** (`seed.fittings.kitchen`): What makes a room a kitchen: a run of base cabinets and a worktop along the back wall, the sink in it, a stove and a fridge (cabinets 600 deep, 900 high; a 760 mm range; a 750 × 1750 mm fridge: typical)
- **Lithium cell** (`battery.cell`): A cylindrical lithium-ion cell by its format (18650, 21700, 4680): can, sleeve, its jelly roll wound turn by turn (cathode, anode, separator), insulators, cap with its vent disc and gasket
- **Living fittings** (`seed.fittings.living`): What makes a room a living room: a sofa facing a television on its stand, a low table between (a 2.1 m three-seat sofa, typical)
- **Logic or memory cell** (`chip.cell`): Transistors made into a cell: a 6T SRAM bit (two inverters holding it, two pass gates) or a NAND2 gate (two p-type in parallel, two n-type in series), with its first metal wires.
- **Loop round a block** (`path.loop`): A path round a rectangle, in its lane (inset from the road's middle), driven with the block on the right as traffic keeps right; and where it must stop: before each crossing it meets, every so many metres
- **Motherboard** (`pc.board`): A motherboard of a form factor (ATX, microATX, Mini-ITX: their standards' sizes) with the package in its socket: memory modules (JEDEC DDR4), power stages, chipset, a PCIe x16 slot, an M.2 2280 drive, power …
- **Neighbourhood** (`seed.neighbourhood`): Streets of blocks with four houses to a block, each house's plan and colours and the car in its drive picked from the seed (change the seed for another street), and cars driving round it, stopping at its lights, as …
- **Part** (`card.part`): A real part, drawn whole from its standard with every piece inside it: 41 kinds (stepper nema17 40, led red 5mm, bearing 608, rail MGN12H 400, motorplate nema17 t3 aluminium, bolt M8x30, screw M3x10, panhead M1.6 L2 …
- **Piston and rings** (`engine.piston`): A piston with its three rings, its wrist pin and the pin's two clips, sized from the bore
- **Piston engine** (`engine.whole`): A whole piston engine from its first parts: block, crank, pistons and rods, head, timing, oiling, intake, exhaust and what hangs on it.
- **Processor die** (`chip.die`): A processor die: its cores (each its logic and its L2), its L3, its uncore (graphics, memory controller, I/O), each from the cells below it placed by the million and billion, never copied; its transistors counted from …
- **Processor package** (`chip.package`): A die flipped face down into its package: solder bumps in underfill, a soldered heat spreader, the gold lands under it as its socket's datasheet counts them (LGA1151, LGA1700)
- **Ring** (`shape.torus`): A ring round z: its radius to the middle of the tube, and the tube's radius
- **Road** (`seed.road`): A street along x: two lanes of asphalt, centre dashes, sidewalks each side; its length yours (3.6 m lanes, MUTCD dashes, typical)
- **Road system** (`seed.roads`): Streets on a grid of blocks, nx by nz, with a crossing and its stop lights wherever two meet, the lights on their cycle as the clock runs (or held)
- **Room** (`seed.room`): A room: floor, four Walls (each plain, with a door, with a window, or open), and the fittings its type plugs in (a bedroom's bed, a bathroom's toilet, a kitchen's sink…).
- **Sensor** (`make.sensor`): Any sensor as it is made, from one node: a threaded probe (hex, thread, sealing ring, its element in its tip: a temperature sender, a pressure switch, an oxygen sensor), a puck bolted through its middle (a knock …
- **Sink** (`seed.sink`): A sink with its back to the wall at z = 0, facing +z: a pedestal basin, a vanity, or a kitchen sink in its base cabinet, by its kind (typical sizes)
- **Sphere** (`shape.sphere`): A ball of one material: its radius, so its volume and its mass from its material
- **Stack** (`make.stack`): Things stacked along x, so many in all, a pitch apart, taking the things wired in in turn: a cell's negative and positive plates, a heat sink's fins, a stator's laminations, a capacitor's foils.
- **Standard part by size** (`part.family`): A part drawn whole from its standard, its sizes set one by one: 41 families (bolts, nuts, bearings, steppers, rails, extrusions, beams, pipes…)
- **Starting battery** (`battery.starter`): A 12 V lead-acid starting battery by its BCI group (its case is the standard): six cells of plates and separators, straps, joints through the partitions, electrolyte, vent caps and SAE posts.
- **Stop light** (`seed.stoplight`): A signal on its pole, its lenses facing +z: red, yellow or green lit (300 mm lenses, typical)
- **Strap across** (`make.strap`): A strap cast or welded over every piece named like a pattern, one for each side they stand on (a cell's plate straps over their lugs, a busbar over a row of terminals); or, in series, the pieces on each side joined …
- **Terrain** (`terrain`): Ground over w by d, its hills from a seeded noise (the same seed, the same land): relief is how high its highest is over its lowest, roughness how much small detail it has
- **Terrain of grass patches** (`seed.terrain`): Ground of hills from a seed, covered a foot square at a time with Grass patches standing on it (or bare)
- **Toilet** (`seed.toilet`): A close-coupled toilet with its back to the wall at z = 0, facing +z, standing on the floor: pan, seat 400 mm up, cistern and flush (typical sizes)
- **Transistor (FinFET)** (`chip.transistor`): The smallest working part of a computer: a FinFET at a real process's published pitches (Intel 22 nm, Intel 14 nm, TSMC N5 as reported): its fins, metal gate on its high-k liner, spacers, raised source and drain, …
- **Tube** (`shape.tube`): A straight tube along y: outside radius, wall and length
- **Turn (lathe)** (`shape.lathe`): A profile of radius and height (mm) spun about y: a propeller hub, a pulley, a knob, a vase
- **Turned part** (`make.turned`): A part turned on a lathe from steps of radius and length along its axis: a shaft, a pin, a valve, an axle, a journal.
- **Tyre** (`tyre`): A tyre as it is made, from its size (a code off its sidewall, or its width, aspect and rim): inner liner, body ply, beads and their apexes, steel belts, cap ply, undertread, sidewalls, and its tread of blocks in …
- **Vehicle** (`vehicle`): Any wheeled vehicle from what it is: its kind (its seats, body lines and controls as its kind's, scaled to its length), its axles (wired in, or its kind's), its size, frame, power and what it carries; built part by …
- **Vehicle (a real model)** (`vehicle.model`): A real vehicle by its maker's published figures (each with its source), built down to its wheel nuts: a Toyota Corolla, a Freightliner Cascadia, a Honda Rancher, a CRF450R, a Toyota forklift, a John Deere X350, a …
- **Wall** (`seed.wall`): A wall along x standing on the ground, its face to +z: plain, with a door or a window mated into its opening by their frames, or none at all (an open side, where a hall meets a room)
- **Wall with an opening** (`wall`): A wall along x, standing on y = 0, with an opening for a door or a window (or none) at an offset from its middle; gives the opening's middle, where a door or a window goes
- **Winding** (`make.wound`): Enamelled wire wound close, turn by turn: on a former round its axis (a solenoid: an injector's, an ignition coil's, a clutch's), round a ring's band (a toroid: a stator's, an armature's), or round a rectangular pole …
- **Window** (`seed.window`): A window: its frame round one pane of glass, centred on its own middle, facing z.
- **Wound roll** (`make.roll`): Strips laid over one another and wound round a core: a lithium cell's cathode, separator and anode; a coil's wire; a film capacitor; a roll of tape.
- **Wrap in** (`make.wrap`): A part wrapped in an envelope of a sheet folded round it and sealed at its edges, open at its top: a separator round a battery plate, a bag, a sleeve, shrink wrap

## 3 · Arrange and mate (25)

Place, rows and grids, combine, variants; mate by faces, ports and shafts; zones and mates as numbers; proximity; routes.

- **Bore where it passes** (`bore`): A part bored wherever another runs through it: a hole along the other's line, as wide as it reaches and a clearance more, cut in each piece it passes and in no other (a pushrod's bore through a block, its gasket and …
- **Clear away** (`clear`): What a thing places, less whatever comes within a distance of another thing (grass under a road, trees where a house stands) or, with "keep", only those: deleting by where things are
- **Combine** (`combine`): Several things as one assembly, each where it is: a frame and its motors, a city and the swarm over it
- **Fit in** (`fit`): Every piece of a thing whose name a pattern finds taken out, and the thing wired in put in its place (where it was, turned as it was): a tyre made in depth on every wheel, a real battery pack for the box that stood …
- **Frame** (`frame`): A named place on a thing, facing a way: where something is set on it, or where it is set on something (a door's middle, a house's drive).
- **Hole** (`hole`): A hole drilled into a part: its radius and depth, where it starts on the part and which way it goes in; with sides, a hex or square pocket.
- **It is** (`tag`): Says what a part is: its name, and the inventory item it is (so the audit holds it to its recipe and anything can find it).
- **Its mates, measured** (`mates`): Every mate on everything in a thing, measured where it stands, as numbers: what each carries it to, its measure, its value, the range it must hold in, whether it holds, and whether it is in force in the state you give
- **Line** (`line`): Cables, hoses, wires, pipes, brake lines, traces and roads are one thing: a section swept along a path.
- **Mate** (`mate`): One thing set on another by their frames: its frame lands on the other's, turned to face as it does ("into": a door in its opening, a window in its wall) or back at it ("against": a face on a face).
- **Mate by a measure** (`relate`): A mate as a number, put on the thing itself: to the nearest thing named like the one you give, a measure held in a range: the distance between their middles, the gap between their surfaces, how far off its front the …
- **Mirror** (`mirror`): A thing and its mirror image across a plane through the origin
- **Onto a shaft** (`onto`): A part with a bore slid onto a round piece of another, their axes made one: a sprocket onto a cam's nose, a bearing onto its shaft, a pulley onto a crank.
- **Pattern of** (`array`): A thing many times in a pattern, one thing stored and every one placed: in a row (each a step on from the last), round a ring (about y, each turned to face out: a drone's four motors, a wheel's bolts), or on a grid nx …
- **Place** (`place`): A thing put at a place (x, y, z), turned about x, y and z, at a scale; or at each point of a table wired in (posts at a chain's free ends, bolts at their holes, lamps along a roof), each moved by x, y, z.
- **Place a part** (`place.solve`): Where a part should go, found, never typed: it is taken out, the space round where it could go is mapped (heat, motion, reach), and every place it fits whole, standing on something (or within a bracket of it) and …
- **Point along** (`axis`): A thing turned so its up (y) points along x, y or z, or reversed: a motor laid on its side, a shaft made horizontal
- **Proximity and mates** (`proximity`): Every zone a thing carries kept clear and every mate it carries held, as numbers (Zone: a door's sweep, a toilet's clear floor; Mate by a measure: a sofa facing, seeing and sitting at its distance from its …
- **Route** (`route`): A line's way through a thing, found, not drawn: from what it joins to what it joins (a port of that name if it has one, a battery's post; else the face nearest the other end; or a point), by a logic: clear (the …
- **Scatter** (`scatter`): A thing many times over an area: at seeded random places (the same seed, the same places), or on a grid; each turned and sized a little differently if asked; standing on ground where ground is wired in
- **Spawn** (`spawn`): A seed placed once for each row of a table: each row's x, y, z, ry (turn about y, radians) and s place it, and every other column sets the seed's input of that name (a house's plan, a car's paint).
- **Take apart** (`explode`): A thing taken apart to see what is in it, down to its smallest pieces: each piece moved out from the middle of what holds it, and what is inside each piece apart inside it (a truck into its cab, frame and batteries; a …
- **Take out a piece** (`piece`): One piece of anything by its name (the first, or the nth, that matches): a valve spring out of an engine, a bolt out of a truck, a cell out of a battery.
- **Variant** (`variant`): The same thing changed where it is placed: its colour, its material, its finish, its size along x, y and z, or hidden; on all of it, or only the pieces whose names a pattern finds ("prop", "arm|frame")
- **Zone** (`zone`): The room a thing needs kept clear, put on the thing itself and worked out from its own size: in front of a face, so deep (a toilet's clear floor, a kitchen's work aisle), or swept from a hinge at one edge of that face …

## 4 · Choose, size and decide (14)

Pick from a catalogue by duty, size a part, a wire, a battery; solve for what is wanted; if, compare, pick one.

- **Autopilot** (`auto.loop`): Checks a thing by the rules, groups what is wrong into problems, and tries the repairs on each, least costly first, keeping one only if its problem is gone and the parts it changed have less wrong than before; then …
- **Choose** (`logic.if`): The first value where the test holds, else the second
- **Compare** (`logic.compare`): Whether a is less than, more than, or equal to b
- **Map of the space** (`field`): A map of one quantity over the space round part of a thing, cell by cell, where things could go (cells inside a solid piece left out): heat (°C: the rules' own fall-off from each hot surface, blocked by anything solid …
- **Maps as one cost** (`field.combine`): Maps of the same space as one cost per cell: each read as how bad it is (heat over a limit, room under a gap, reach short of an arm), weighted and added.
- **Next size up** (`logic.next-size`): The smallest standard size at least the size worked out: a bolt from its diameter, a beam from its depth
- **Pick by duty** (`size.select`): A catalogue item picked by the duty it must do, the duty read from the thing, never typed: a starting battery by its engine (fuel and displacement as the engine states them: about 1 cold-cranking amp per cubic inch …
- **Pick one** (`pick`): One of several things, by name: plug in what each choice is (a bathroom's fittings, a kitchen's, a bedroom's…), and the choice says which comes out
- **Repairs** (`repair.library`): What the autopilot may do about a finding, by the rule it answers, least costly first: nudge a part clear of what it runs into, move it (the placement solver), put a heat shield between.
- **Say why** (`explain`): Why a result is as it is, in plain lines, shortest first: a placement (where it went, what bound it, why where it was did not do, the next best and what each gives up, how many places failed each test, where the …
- **Show a map** (`field.show`): A map drawn in 3D as coloured cells, blue (good) to red (bad): only the cells at least so bad, or a slice across it.
- **Signal cycle** (`cycle`): Which phase a fixed-time cycle is in at a time ("green 30, yellow 4, red 34", seconds): a traffic signal's, a washing machine's.
- **Size a line** (`size.line`): A line sized by what it carries: a wire by its current over its length (out and back, or back through the chassis), the thinnest AWG whose drop is within what may be lost (3 % of 12 V, typical); a bore by its flow at …
- **What each part needs** (`need`): What every part of a thing needs of where it is, read from what its parts state, never typed: what it is mounted on, what it connects to or passes through, what it keeps out of (heat over its material's limit, what …

## 5 · Check (12)

Rules, clashes, loads, what is missing, how finely made, gates: what is wrong, said with numbers.

- **Approved** (`gauntlet.approved`): What has come through the gauntlet so far (read from its verdicts), and what was turned back and why
- **Candidates** (`gauntlet.candidates`): What is put through the gauntlet: blocks of the library (all, of a kind or a field, or made by you), or entries of the inventory (under a path, or yours), or named ones.
- **Characterise a cell** (`cell.characterise`): One of a chip's own gates, of the kind you pick (the commonest first), copied out of its netlist and run at switch level through every input: its truth table, and whether it gives the gate its pull-down network says.
- **Check a limit** (`check.limit`): A value against its limit: whether it passes, the margin left, and the factor of safety
- **Clashes** (`clash`): Which of the things a thing places run into one another (a car parked into a house, a pipe through a beam): their boxes, as far down as asked, overlapping by more than a touch.
- **Comes apart to the bottom?** (`audit.explode`): How far a build really comes apart: the share of its mass in lumps (a piece drawn as one though what it is named for is an assembly in the inventory: a headlamp, a door, a fuel tank), each said with what it should …
- **Feed the proposals in** (`gauntlet.feed`): The proposals with a source (read off a drawing, a reference, or the web) entered in the inventory, what each holds first; the inferred stay proposed until a source confirms them
- **How finely is it made?** (`check.fidelity`): A drawn thing measured for how finely it is made: its pieces and kinds; how many, and how much of it, are still plain boxes (a casting drawn as a slab wants its ribs, bosses and fillets); how many are shaped (turned, …
- **Nothing runs into anything?** (`check.rules`): The rules a made thing is held to, on its surfaces as drawn (triangle against triangle): no two pieces cross unless they are one piece, one is said to pass through the other, one is a fastener in what it fastens, or …
- **Run the gauntlet** (`gauntlet.run`): Every candidate through the gates chosen (all if none, one for a single gate), each where it applies, cheapest first: approved only when none fails.
- **Tester** (`test.block`): A block of the library put to its own tests, then pushed far from its defaults (zero, a thousandth, a thousand times, negative): each failure and each crash said, and whether it answered or refused in words
- **Turn it over and check** (`check.turning`): A piston engine turned through a whole revolution of its crank, a step at a time: at each, its crank and every piston and rod where they then are, tried against everything else (block, caps, pan, pump, cams in the …

## 6 · Simulate and run (15)

Physics, motion, the clock, chips run from their transistors, engines under load.

- **Clock** (`time`): The time the board is at, in seconds: the time bar's.
- **Drive** (`drive`): Any powertrain on the road: its engine's torque curve (from Run an engine), its gearbox (a manual's gears, or a CVT's range and launch gear), its final drive, its tyres' rolling radius from their size code, its mass …
- **Engine under load** (`load.engine`): A piston engine at a speed and a peak cylinder pressure, its working parts read off them as drawn: the rod pulled at the top of the exhaust stroke and pushed at firing, its buckling, its bolts; its crank pin's bearing …
- **Follow a path** (`follow`): Things moving along a path at the clock's time: each speeds up and slows as a car does, keeps a gap to the one ahead, and stops at a stop line while its way is red (or yellow, if it can stop).
- **Forever** (`forever`): Things repeated without end on a lattice (along x, y, z, or any of them), each cell one of them picked from the seed: the same cell, the same one.
- **Hinge** (`hinge`): A revolute joint for Let it go: one thing turning on another (or on the world, fixed) about an axis through a point, between limits, with friction.
- **Let it go** (`letgo`): Real rigid-body physics (Jolt) over what is made: each thing it places a body of all its pieces, its mass from its materials, falling, landing, sliding, tipping and coming to rest on the floor, on what it is put on …
- **Netlist** (`netlist`): A chip as its transistors: each a switch between two nodes, closed while the node at its gate is high, some nodes held high by a load.
- **Push** (`push`): A force on one thing Let it go lets go, for so long from the start: a shove, a kick, a gust
- **Run an engine** (`engine.run`): Any piston engine run from what it is (its bore, stroke, rod, compression, cylinders and the intake valves its head is built with): each cylinder crank degree by crank degree, filled as its valves let it (Taylor's …
- **Run on its transistors** (`logic.run`): A program assembled and run on a chip's transistors, at switch level, half a clock cycle at a time, against 64 KB of memory; and beside it on the fast model (the instruction set as its manual gives it), compared …
- **Spring under load** (`load.spring`): A coiled spring as it was made (its wire, its coil, its coils, its free and fitted lengths, read off the part), compressed as fitted and by a stroke more: its rate and forces, its wire's stress against what the wire …
- **Sweep** (`sweep`): The room a thing needs as it turns from one angle to another about a pivot: it, at so many angles between, as one thing (its envelope), for Clashes to check against what is round it (a door's swing against the bed, an …
- **Sweep (stress test)** (`sweep.range`): Any block in the library run over a range of one of its inputs (an engine's speed, a beam's load, a loan's rate), the rest wired in as for the block itself: every answer in a table, and the worst of them and where it …
- **Turn** (`turn`): A thing turned about an axis through a point to the angles given at their times ("0 s 0°, 2 s 90°, 6 s 90°, 8 s 0°"), driven as a servo drives a joint: it speeds up and slows down at its acceleration, no faster than …

## 7 · Sense and act (6)

What things give off and afford, gases, who notices what, agents and their goals.

- **Agent** (`agent`): A body with senses and a goal.
- **Goal** (`goal`): What an agent sets out to do: open something (a door, a gate, a lid), named by a pattern, the nearest or the farthest of those it sees.
- **What it gives off** (`signature`): What every part of a thing gives off, read from what it is, never tagged by hand: how far it is seen (its size against the eye's one arcminute, less the lower its contrast), how far it is heard if it makes sound by …
- **What it gives off into the air** (`gas`): A gas as a substance, not a smell: what a thing gives off in a state (an engine running: its exhaust from its displacement and speed, at most the carbon monoxide and hydrocarbons a catalyst car may give at idle; a …
- **What it lets you do** (`afford`): What every part of a thing lets a body do, read from its shape, mass, joints and material against that body (an adult, or a child of 8: its grip, reach, knee height, stride and strength from its stature): grasp a bar …
- **Who notices what** (`sense`): What each observer takes in where it stands, facing what it faces: a person sees by rays out from its eyes packed as its acuity is (sharp where it looks, thin to the side), each meeting the first thing in its way; …

## 8 · Laws and formulas (162)

Every physical law as a calculator, by its field, and formulas you write.

- **Chemical & process** (6): Butler-Volmer equation, Faraday's laws of electrolysis, Fick's law of diffusion, Gibbs free energy, Michaelis-Menten kinetics, Nernst equation
- **Controls & robotics** (1): PID loop on a lag
- **Electrical** (29): Ampère's law (a long solenoid), Back-EMF, Cable equation (the length constant), Copper's resistance with temperature, Coulomb's law, DC motor current, DC motor torque, Electrical energy, Electrical power, Electrostatic pull between plates, Energy in a capacitor, Energy in an inductor, Faraday's law of induction, Joule heating, Lead-acid open-circuit voltage, Lorentz force on a conductor, Magnetic pull across a gap (Maxwell), Mechanical time constant, Ohm's law, RC time constant, Resistance of a wire, Seebeck voltage (thermocouple), Shockley diode equation, Skin depth, Solar cell power, Speed of an electromagnetic wave, Strain gauge, Switching power of CMOS logic, Voltage drop along a pair
- **Electronics & embedded** (3): LED resistor, RC filter corner, Voltage divider
- **Energy & environment** (2): Battery runtime, Solar panel, a day
- **Everyday** (1): Unit converter
- **Manufacturing** (3): Filament for a print, Machining time, Spindle speed
- **Materials** (12): Carbon dioxide a lime can hold, Contact angle (Young), Endurance limit of steel, Griffith criterion, Hall-Petch relation, Hooke's law, Inverse rule of mixtures (across the fibre), Piezo stack stroke, Rule of mixtures (along the fibre), Scale-up for sintering shrinkage, Thermal expansion, Von Mises stress
- **Math** (8): Add, Divide, Formula, Multiply, Power, Round, Statistics, Subtract
- **Mechanical** (45): Bearing life in hours, Bearing rating life (L10), Belt or rim speed, Bolt tightening torque (nut factor), Capstan (belt friction) equation, Centripetal force, Chain pull, Chain speed, Conservation of momentum (two bodies that stick), Cornering speed limit, Coulomb friction, Efficiency of a power screw, Energy a flywheel can hold per kilogram, Energy in a spring, Force from a power screw, Froude number of a gait, Gear tooth bending stress (Lewis), Grade resistance, Gravitational potential energy, Gravitational time dilation, Gruebler's equation (planar), Helical spring rate, Helical torsion spring rate, Hertzian contact (a sphere on a flat), Hill's muscle equation, Kinetic energy, Moment of inertia of a disc, Moment of inertia of a rod about its end, Natural frequency of a mass on a spring, Newton's second law, Parallel axis theorem, Pendulum period, Power of a force, Power of a torque, Rocket equation, Rolling resistance, Rotational kinetic energy, Shaft diameter for bending and torque (static), Speed after a fall, Speed of a longitudinal wave in a bar, Stopping distance, Torque at a wheel, Torque through a gear train, Traction limit, Weight
- **Physics & science** (3): Bragg's law, Planck relation, Snell's law
- **Software & data** (7): Diffraction limit of an aperture, Information in a choice, Landauer's limit, Little's law, Nyquist-Shannon sampling theorem, Resolution of optical lithography (Rayleigh), Shannon capacity
- **Structural & civil** (13): Angle of twist, Axial stress, Bending stress, Deflection of a cantilever under an end load, Euler buckling, Euler-Johnson transition slenderness, Hoop stress in a thin-walled cylinder, Johnson column formula, Plastic moment of a section, Sag of a simply supported beam under a central load, Sag of a simply supported beam under a spread load, Shear in a fillet weld, Shear stress in a twisted round shaft
- **Thermal & fluids** (29): Aerodynamic drag, Aerodynamic lift, Arc welding heat input, Archimedes' principle, Arrhenius rate, Bernoulli's equation, Boltzmann distribution, Carnot efficiency, Clausius-Clapeyron relation, Continuity equation, First law of thermodynamics, Fourier's law, Free convection in still air, Heat capacity, Hydrostatic pressure, Ideal gas law, Ideal static thrust of a rotor (momentum theory), Least work to take out a trace, Lumped thermal time constant, Newton's law of cooling, Pressure drop in a pipe (Darcy-Weisbach), Reynolds number, Sound insulation of a wall (mass law), Stefan-Boltzmann radiation, Sunlight a surface absorbs, Temperature rise through thermal resistances, Thermal resistance of a wall, Time to diffuse a distance, Work in a compressed gas (isothermal)

## 9 · Data, money and projects (35)

Tables and rows, research, the gauntlet, money, operations.

- **Break-even** (`fin.breakeven`): How many must be sold to cover fixed costs, and the sales that takes
- **Column** (`list.column`): One column of a table, as a list
- **Compile research** (`research.merge`): Several references compiled into one: every source kept, each part once, a later one filling in what an earlier lacks, and where two sources give a different count, a conflict said to be settled
- **Compound growth** (`fin.compound`): What an amount grows to at a rate, compounded so many times a year
- **Critical path** (`ops.critical-path`): How long a project takes and which tasks set it: rows of task, how long, and what each must wait for (names split by ; or spaces)
- **Delete** (`delete`): Takes something out: a block you (or Claude) made, an entry you fed, a proposal, an unknown off the queue.
- **Internal rate of return** (`fin.irr`): The discount rate at which cash flows are worth nothing today: found by bisection
- **Into the inventory** (`research.toInventory`): A reference entered in the inventory (filed under Researched), each of its parts an entry holding its own parts by count and saying its source: so it opens all the way down like anything stored, and what has nothing …
- **Its parts, and theirs** (`research.parts`): An item in the inventory opened all the way down: its components, their sub-components and theirs, each with how many and how it is made or bought; and every one of them still waiting to be broken down, with why (not …
- **Keep where** (`list.filter`): Keeps the items of a list a condition holds for ("x > 0"), x each item in turn
- **Loan payment** (`fin.loan`): The payment each period that pays a loan off, with interest, in so many periods (an annuity)
- **Make a table** (`list.zip`): Lists side by side as the columns of a table
- **Margin and markup** (`fin.margin`): From cost and price: the profit, the margin on the price and the markup on the cost
- **Move rows** (`rows.shift`): Every row moved by dx, dz (and turned by dry): the car in front of each house, the lamp beside each door
- **Net present value** (`fin.npv`): What a series of cash flows is worth today at a discount rate; the first flow is now
- **Onto the ground** (`rows.ground`): Each row (a house's lot, a tree, a car) set on the ground where it stands: its y the ground's height at its x and z, so what is spawned from them stands on the hills, not in them
- **Overall equipment effectiveness** (`ops.oee`): How much of a machine's time makes good parts: availability × performance × quality
- **Pass** (`pass`): A gate on a wire: what comes in goes on out of passed while the condition holds, else it is held (out of held) and what follows passed waits
- **Percent change** (`fin.change`): How much a value went up or down, as a share of what it was
- **Research loop (to the bottom)** (`research.loop`): From the roots down, round after round, until nothing more is found: what is unknown under them is sorted, the most wanted clusters first, and each resolved by a family that makes that size, a researched reference, …
- **Research notes** (`research.notes`): What was found out about a real thing (a reference kept, or your own notes), written down a line a part with where it was read: "@S1 | https://… | title" names a source once; "id | name | in | n | finds | source | …
- **Rows on a grid** (`rows.grid`): Rows for a spawner: one for each place on an nx by nz grid (x, z), and for each column asked, a value picked at seeded random from its list ("layout: studio|1 bed|2 bed; paint: #e8dcc8|#cfd8dc"), or a number in a …
- **Rules over rows** (`rows.recode`): Each value in some columns changed by the first rule that finds it: "what it is / what is there: what it becomes", * for anything ("hall/outside: door; */outside: window; *: wall").
- **Running total** (`list.running`): Each item added to all before it, from a start: a balance from its ins and outs
- **Search the web (Wikidata)** (`search.web`): What Wikidata says a thing has as its parts and is made from: its entity found by its words, its "has part(s)" and "made from material" read, its address the source.
- **Search what is known** (`search.library`): Words looked for through the library's blocks, the inventory's entries and the researched references: each match with where it is and what it says
- **Sentence** (`text.format`): Words with values filled in: "{a} costs {b}"
- **Set a column** (`rows.set`): Every row given the same value in a column: each room of a house painted its wall colour, each house of a street its roof
- **Sort** (`list.sort`): A list from least to most, or most to least
- **Straight-line depreciation** (`fin.depreciation`): What an asset loses each year, evenly over its life, down to what it is worth at the end
- **Task** (`task`): A task on the board: what is to be done, and done when what it waits on holds (wire in a gate's count, an approval, a check).
- **Unknown library queue** (`unknown.queue`): Everything something wants that nothing knows: not in the table, listed only as its materials, nothing in it listed, or drawn as one piece though it is made of parts.
- **What each touches** (`rows.touch`): For boxes laid on the ground (rows with x, z, w, d: a house's rooms, a street's lots), what each side touches: the type of the box along most of it, or "outside".
- **What is missing** (`research.gap`): A drawn thing held against its researched reference: every part the sources name looked for among the drawn pieces by its pattern (a part's parts inside what found it), each drawn, short of its count, missing, or …
- **When…** (`on.event`): Listens for what happens in the gauntlet: something approved, rejected, queued as unknown, resolved, proposed, deleted, or a round of the research loop ended.

## 10 · Show (6)

Tables, values, charts, the 3D view, the space.

- **3D view** (`view.3d`): A part drawn in 3D, every piece of it: drag inside to turn it, take it apart, open it full screen
- **Chart** (`view.chart`): A list drawn as a line, against its place or against another list
- **Gauge** (`view.gauge`): A value on a dial between two ends
- **Show** (`view.show`): A value, large, in its unit
- **Show in space** (`space.show`): Puts a thing into the 3D space, at its place: everything wired into one of these is what the space draws
- **Table view** (`view.table`): Rows shown as a table on the board: each row a line, each field a column, as wide as its widest value

## 11 · Board tools (5)

Groups, notes, code, asking, events.

- **Ask Claude** (`ai.ask`): Asks Claude, or Nexus where Claude cannot be reached; {input} is what comes in
- **Code** (`code`): Code with ports: each input is a name in it, what it returns (an object, port by port, or one value) fills its outputs.
- **Group input** (`group.in`): What comes into the group, under this name
- **Group output** (`group.out`): What goes out of the group, under this name
- **Note** (`note`): Words on the board, for people: it runs nothing

