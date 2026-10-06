# Stress waves: blind testers against the intent pipeline

Each wave works the same way:
- Testers who know nothing of how the generator works each write requests for things not yet invented.
- Each request is run once through `npm run invent`, at seed 101, with no one answering its questions, so the generator takes what it would.
- The tester reads only the printed output and judges it on four counts:
  - **read**: did it understand the request?
  - **made**: is what it made what was asked?
  - **holds**: are its checks real and right?
  - **honest**: does it say what it cannot do?
- Findings are sorted by cause and fixed in general, never per request, and the wave is run again.

The runs are logged as JSON lines (`--log`), one line per run.

## Wave 1: 14 requests, 5 testers

The testers covered everyday inventions, extreme sizes, machines and vehicles, electronics and components, and wild ideas. Their requests:

| # | asked | wave 1 (before) | wave 1 again (after the fixes) |
|---|---|---|---|
| 1 | a wall-mounted gadget that folds a bed sheet, under 4 kg, folds flat to 8 cm | "bed": a table on a column, **HOLDS** | gadget: the fold made as a hinged leaf; **does 1 of 3 things asked**; ✗ it weighs 28 kg against the 4 kg limit, so it does not hold |
| 2 | a drawer insert that measures out 250 g of pasta, holds 3 kg in three bins, runs a month on USB-C | "drawer": tank overlaps rail, every seed | insert: holds 3 kg × 3 = 9 kg, **does 1 of 4**; measuring out, the drawer and the battery are each said with what they would need |
| 3 | a bathroom robot that refills shampoo bottles from 5 L jugs at 50 ml/s, no wider than 25 cm | "shelf": a rolling bookshelf, **HOLDS** | nothing made: refilling and pumping need pipes and pumps, which are not kept; every number said with why it is unused |
| 4 | a 40 µm robot that swims into a bee to kill mites | a 0.5 m cart, **HOLDS** | nothing made: 40 µm is now read; swimming, entering and killing are each said with what they need |
| 5 | a 12,000 km ring sunshade between Venus and the Sun | nothing, with a false reason ("nothing says what it is for") | nothing made, with the true reasons: space and other worlds, cooling (only warming is kept), tilting by control |
| 6 | a 1.5 m six-legged robot that climbs redwoods and seals scars | a cart, **HOLDS** | nothing made: climbing, sealing and legs each said |
| 7 | a pedal-powered cargo tricycle whose 200 kg bed lifts 1.2 m | "bed": a table on a cart, 1.2 m read as a width | tricycle: a cart, a carriage between two posts rising 1.2 m (tested in Jolt) and the bed laid on it; pedal power said as not kept; what raises it said as not derived |
| 8 | a drone that lowers a 15 kg hook 30 m on a cable in 10 m/s gusts, onto a house | a 30 m wooden box overlapping the rotors ("house" read as a thing to make) | drone: hover worked out by momentum theory, 818 W needed against the motors' 480 W (✗); the cable, 30 m and the gusts each said as unused and why; "house" read as what it is for |
| 9 | a 4 TB microSD that keeps data 50 years with an e-ink gauge | "stand": a wooden stand, **HOLDS** | nothing made: "holds 4 TB" read as holding information (electronics), not a weight |
| 10 | a credit-card computer with 8 RISC-V cores on a 6×6 cm solar cell at 500 lux | nothing, false reason | nothing made: electronics; the 6×6 cm cell, 500 lux and 8 cores each said as unused |
| 11 | a coin-sized glucose patch, Bluetooth, 14 days per charge | nothing, false reason | nothing made: sensing, sending, stored power |
| 12 | a Venus cloud city: 300 m balloon at 52 km, 4-deck habitat, 2 km cable | a 52 km × 2 km table | nothing made: floating in air (buoyancy in a gas) is not kept; 52 km read as an altitude, not a size; the 2 km read as the cable's size |
| 13 | a backpack for a house cat that turns purring into electricity | a 30 mm box ("house" read as a thing to make) | nothing made: soft things, energy conversion, lights; "house cat" read as a cat |
| 14 | a spiral staircase of 13 glass steps that play notes and rotates 90° | a turntable, **HOLDS** | staircase: steps as a platform of glass, a turntable on it; **does 2 of 4**; the stairs, the notes and the 90° steps of turning each said |

Testers' scores (0 to 5, before the fixes), as read / made / holds / honest:

| request | read | made | holds | honest |
|---|---|---|---|---|
| 1 | 1 | 0 | 2 | 2 |
| 2 | 1 | 0 | 2 | 3 |
| 3 | 2 | 1 | 2 | 2 |
| 4 | 1 | 0 | 3 | 2 |
| 5 | 0 | 0 | — | 3 |
| 6 | 1 | 1 | 3 | 2 |
| 7 | 1 | 1 | 3 | 3 |
| 8 | 1 | 0 | 1 | 2 |
| 9 | 0 | 0 | 1 | 2 |
| 10 | 0 | 0 | — | 3 |
| 11 | 0 | 0 | — | 3 |

Requests 12 to 14 were judged in prose rather than scored. Each was the wrong object, and each was still stamped **HOLDS** where it held.

### What they found, by cause

**1. One word won, and the wrong thing was made but still called a pass.**
- "Bed sheet" made a bed, "drawer insert" a drawer, "shelf robot" a shelf and "house cat" a house.
- *Fix (`parse.ts`):* a request is now read by its grammar, not word by word:
  - a phrase names the thing it ends on, and the words before only qualify it;
  - "that", "which" and "whose" start what it does;
  - "with" starts what it has;
  - "for" and "so" start what it is for;
  - a preposition starts something else.
- A thing named only as what it works on or for is never made.

**2. Verbs were read without what they act on.**
- "Holds 4 TB" was read as holding up a weight, "turns its purring into electricity" as rotating, and "lowers a hook on a cable" as a lift.
- *Fix:* each verb is now read with its object:
  - holding information is electronics;
  - turning one thing into another is a conversion;
  - lowering on a cable needs rope;
  - folding a sheet is handling cloth, while folding flat is a hinge.

**3. Numbers went to the wrong measurement, or vanished without a word.**
- "Lifts 1.2 m" became a width, a 52 km altitude became a 52 km table, a 2 km cable became a depth, and "weighs under 4 kg" became a load.
- *Fix:* every number is read by the words beside it:
  - a height, width, depth or span;
  - a travel (after lifts, slides or lowers);
  - a limit ("no wider than", "weighs under"), which is then **checked** against what is made;
  - a load, or "of each" times the count;
  - an altitude;
  - the size of something else ("a 2 km cable", "from 5 litre jugs");
  - a flow rate, a dose, a time, or wind.

  Each number not used is listed with why.
- Units are read too: micrometres, nanometres, kilometres with thousands separators ("12,000 km"), hyphenated sizes ("40-micrometre", "1.5-metre-tall"), days, months, years, and degrees Celsius.

**4. It never said how much of the request it did.**
- *Fix:* every design now carries the list of what was asked: each thing it is, does and has, ✓ or ✗ with the reason. The headline says "DOES n OF m THINGS ASKED" or "DOES WHAT WAS ASKED".
- If none of a request is something kept, nothing is made, and the generator says why for each part, by the kind of knowledge missing:
  - electronics, biology, space, flight, fluids, soft things, sound, stairs, cities.
- If only part of a request can be made, it asks once whether to make that part.

**5. The checks disagreed with each other, or measured the wrong moment.**
- The cart rolled one weight in its check and a different weight as made. Things carried were missing from what was below them.
  - Fix: one figure is now used everywhere: the mass as made plus what is carried.
- A motor rated for 24 V was run at 2 V.
  - Fix: it is now held at its speed by a speed controller (proportional and integral voltage control) from its full supply.
  - The motor and gearhead are chosen from those kept as the lightest pair that can start the load and keep it rolling, or the gap is said.
- The speed was averaged from rest and passed at −7% with no tolerance stated.
  - Fix: speed is now read from one run's own track, over the third second, and must be within 15%.
- Pushes and simulations each restart from rest, so a lift fell back and a door swung back before being read.
  - Fix: the workshop now keeps each joint's furthest reach.
- **The load law read a shelf along its longer side even when it was held along that side.** That is where the impossible "3740 times under its yield" came from.
  - Fix: it now reads both ways and keeps the worse, with the load at the middle and at the edge.
- The legs were sized for a flat 40 kg guess, and a column's foot was a 34 kg steel slab.
  - Fix: legs are sized from the top's real weight, and the foot from the tipping balance.
- A 1.8 m shelf with a tank tipped over (truly).
  - Fix: anything standing on the floor is now made at least 0.3 of its height wide, which is what the push test needs. It says so when it widens.
- Wording was wrong in places:
  - "1.24e-7 times under its yield" now reads as "times over: it gives";
  - 52 km is no longer printed in mm;
  - "held at four points" was said of three wheels;
  - "59.99999999999999 rpm".

**6. The simulator itself.**
- The ground was a box 100 m across. Against a 9 mm plate its contact depths were off by millimetres, more so further from its middle: a plywood box sank 3 mm and crept 10 to 40 mm when let go.
  - Fix: the ground is now a Jolt plane, and a plywood box settles to 55 nm.
- A box with a hinged wooden door still creeps about 35 mm along the floor, though a minimal hinge rig does not.
  - This is solver drift: nothing on a flat floor pushes it. So "it stands" is now judged by what standing means, dropping no more than 10 mm and tilting no more than 2°, and the creep is reported separately as the engine's.

### Open after wave 1

- **Limits do not yet steer the design.** A 4 kg limit is checked and failed honestly, but redrawing does not choose lighter matter on purpose.
- **Sizes far from ours** (40 µm, 12,000 km) are read and then refused, because nothing kept is that small or large. The regime each size is in (viscous swimming, self-gravity, tip speed) is Phase 3 of the plan.
- **Electronics, fluids and soft things** are said to be missing, with what each would need. The kept parts and laws for them are Phases 5 and C3.
- **The hinged-door creep** in Jolt: its cause has not been found yet.

## Wave 2: 16 requests, 4 testers

The testers were the same four, writing harder requests: everyday things with real constraints, folding machines, sizes far from ours, and electronics and spacecraft. "Before" is the generator at the end of wave 1; "after" is this round.

| # | asked | wave 2 (before) | wave 2 again (after the fixes) |
|---|---|---|---|
| 1 | a fold-down workbench in a 15 cm deep wall cabinet, opening to a 120 × 60 cm top at 90 cm, for 150 kg of hammering | **HOLDS · DOES WHAT WAS ASKED**: a table, plus a separate door on a post standing on it; the 120 × 60 cm was "the size of x" | a 1.2 m × 600 mm top at 900 mm, **HOLDS, does 1 of 4**: folding down, opening out and hanging on a wall are each said as not kept; 15 cm is the cabinet's |
| 2 | a battery-assisted garden cart: 100 kg of wet soil up a 20° slope, through a 70 cm gate, under 25 kg | **HOLDS · DOES WHAT WAS ASKED**; the slope and both limits unread | the slope, the gate and the weight are each read and checked: **does not hold**, as its motors give 3.4 N·m against the 18.9 N·m the slope takes (worked out; the Jolt test is on the flat) |
| 3 | a raised bed on legs, 2 × 1 m, 75 cm tall, holding 30 cm of wet soil without sagging | named "need"; the soil unread | the soil read as 1140 kg (1900 kg/m³, estimate); no sheet bears it, so it is **framed**: a 22 mm top on six 2x4 joists and two 2x6 rails, each the least the load law lets bear its share. **HOLDS, does what was asked**, 53 kg |
| 4 | a boot-drying cabinet: 40 °C in under 3 hours, under 200 W, fits a 50 cm gap | 1 of 2 | **HOLDS, 2 of 3**: the heater is checked against the 200 W limit and the gap; drying is said to need air moved through, which is not kept |
| 5 | a scissor-lift platform folding to 60 × 40 × 15 cm, raising a 90 kg person to 1.8 m | **does not hold**: a rail and a door overlapping it | a deck on a carriage between two posts raised 1.8 m (tested in Jolt), **HOLDS, does 3 of 4**: folding the whole of it down is said as not kept; "extends to raise" is read as how it raises, not as a slide of its own; all three folded sizes are read as one |
| 6 | a folding footbridge packing into a 70 cm bundle under 5 kg, spanning 3 m for a 100 kg adult | named "want"; 2 m read as its span; a door on a post | spans 3 m, **framed** (a 6 mm deck on twenty 2x2 joists and two 1x6 rails of white pine, the matter chosen for lightness), 21.5 kg against the 5 kg: **does not hold**, saying where its weight is; its two ends are not counted, as they stand for the banks |
| 7 | a robot crawling 15 cm drain pipes at 0.2 m/s, climbing 2 m, 1 hour per charge | nothing made | nothing made, unchanged: crawling, climbing and stored power each said |
| 8 | a beach umbrella collapsing into a 50 cm tube, opening by itself to 2.5 m in 10 s, standing in 40 km/h wind | **HOLDS, 2 of 3**: a 28 kg door on a post | nothing made: collapsing and opening out are said as not kept, and nothing else is made in their place |
| 9 | an electric motor as big as the Earth, 12,700 km rotor, once in 24 h, 20 TW | nothing, with "not a kind of thing" | nothing made, by its size: past its own gravity and its own weight; the laws say a field of about 15 µT is enough, far less than the Earth's own |
| 10 | a tardigrade-sized drone, 0.5 mm, hovering 10 min at 1 m/s with a 0.2 µg camera | a 990 mm drone, 17 parts | nothing made: Reynolds 33 (it must flap or swim, not hover on rotors), electrostatic drives stronger than magnets below 796 µm; the camera's 0.2 µg read as what it carries |
| 11 | a 10 µm heat engine in a blood vessel on 0.5 °C, making 1 µW | a design of 0 parts | nothing made: Carnot on the heat that crosses 10 µm of tissue gives about 4 nW, 248 times too little |
| 12 | a 3 km walking robot carrying a 1 million tonne city across the Sahara at 5 km/h | nothing made | nothing made: legs are not kept; read at 3 km, its own weight is still a small part of what carbon fibre bears (0.08), and heat takes 21,000 years to cross it |
| 13 | a board the size of an Orange Pi 5 (100 × 62 mm) with a battery for 2 h at 8 W | "pi": a 2.3 kg stand | nothing made (electronics): 16 Wh is 64 g and 25 cm³ of cells, which fits; the board's 8 W settles at a temperature said |
| 14 | a 2 TB microSD with Wi-Fi at 50 MB/s, under 70 °C in a camera | nothing made | nothing made (electronics), each figure said |
| 15 | a crewed ship to Mars orbit and back in 90 days, under 400 t, under 0.6 Sv each | **HOLDS**: a 5 kg box | nothing made: space, radiation and life support each said |
| 16 | a sugar-cube USB-C charger, 2 cm, 100 W continuously, outside under 45 °C | nothing made | nothing made (electronics); the laws say its 5.3 W of loss (at 95%) settles near 130 °C in still air, 6 times what its surface sheds at 45 °C |

The everyday set of 18 (tables, carts, shelves, a gate, a raft, a heater, a lift and so on) still holds after every change.

### What they found, by cause

**1. The whole of a thing folding was made as a door.**
- "Folds flat", "packs into a bundle", "collapses into a tube" and "opens out to a canopy" each became a leaf hung on a post beside what was made, and it was counted as done.
- *Fix:* what folds is now read by what does the folding:
  - a part of it ("a box with a lid that folds back") is a leaf that swings;
  - the whole of it, folding down to carry and opening out again, is a linkage of parts that collapse together. That is not kept yet, so it is said, and nothing is made in its place.
- "Opens" of a whole thing is a door only where the thing encloses something.

**2. A verb that only says how was read as another thing to do.**
- "Extends to raise a person" made a slide and a lift.
- *Fix:* a verb followed by "to" and a second verb is how the second is done, and is said with it.

**3. A chain of sizes was read number by number.**
- In "60 × 40 × 15 cm", 15 cm became a width. "A 120 × 60 cm top" was "the size of x". "In a cabinet only 15 cm deep" became the workbench's depth.
- *Fix (`parse.ts`):* each number of a chain is read by the words before the chain and after it, as one size.
  - The size of a thing's own top sizes the thing.
  - A size said of what it goes in or through ("in a cabinet", "through pipes") is that other thing's.

**4. No sheet bore a long or heavy top, and nothing was derived in its place.**
- The raised bed failed under 1140 kg of soil; the footbridge was a 50 mm slab weighing 57 kg.
- *Fix:* a frame is derived where no sheet bears the load alone. The sheet lies on joists, and the joists on two rails. It is the lightest of the frames that bear it, over every even count of joists:
  - the thinnest sheet that bears the load between the two joists at its middle;
  - the least joist that bears half the load across;
  - the least rail that bears half of all of it over its span.
- Wood framing is dressed lumber stood on edge (PS 20 sizes); metal framing is round tube.
- Each part is then checked by the workshop's own load law: the frame is sized by the same case that law reads (a load at the middle of a span held at its ends).

**5. A weight limit was checked but never steered anything.**
- *Fix:* under a weight limit, each part takes the kept matter lightest for its stiffness, by Ashby's merit index:
  - E^1/3 / ρ for a panel;
  - E^1/2 / ρ for a beam.
- A frame is used wherever it is lighter than a sheet.
- A limit missed says where the weight is: its three heaviest kinds of part.
- A bridge's two ends stand for the banks it rests on. They are made so it stands, but not counted in what it weighs, and the check says so.
- A redraw that comes out as the last one did ends the redrawing.

**6. Sizes far from ours, and what the laws say when nothing is made (Phase 3).**
- Every ask with its own size far from ours (under 5 mm or over 50 m) is read for the groups that change the physics:
  - its own weight against its strength, and its own gravity;
  - rim speed;
  - Reynolds and Bond numbers;
  - how long heat takes to cross it;
  - magnetic against electrostatic drive (equal near 796 µm);
  - light-crossing time, and thermal shaking.

  It is then said what a thing that size would have to be built as.
- Whatever the size, the figures said are weighed by the laws kept (`bounds.ts`):
  - the heat it must shed against what its surface sheds;
  - the energy it must carry against what cells of its size hold;
  - hovering by momentum theory, where that theory holds;
  - Carnot's share for a heat engine;
  - a motor's air-gap shear and the field it needs;
  - what light gathers.

  Each estimate is said as one.

### The testers on the result, and what was fixed at once

The four testers read the outputs above (requests 1, 10 and 13 a little before their last fixes). Their scores, 0 to 5:

| request | read | made | holds | honest |
|---|---|---|---|---|
| 1 workbench | 2 | 1 | 2 | 3 |
| 2 garden cart | 3 | 1 | 2 | 2 |
| 3 raised bed | 2 | 0 | 2 | 1 |
| 4 boot dryer | 3 | 1 | 1 | 2 |
| 5 scissor platform | 3 | 1 | 2 | 2 |
| 6 footbridge | 4 | 2 | 2 | 3 |
| 7 pipe crawler | 2 | 3 | 1 | 3 |
| 8 umbrella | 1 | 2 | 1 | 2 |
| 9 Earth motor | 2 | 2 | 2 | 2 |
| 10 tardigrade drone | 4 | 3 | 2 | 3 |
| 11 heat engine | 1 | 2 | 3 | 2 |
| 12 city walker | 1 | 1 | 1 | 2 |
| 13 board and battery | 2 | 2 | 3 | 2 |
| 14 microSD | 1 | 1 | 0 | 1 |
| 15 Mars ship | 1 | 1 | 0 | 2 |
| 16 sugar-cube charger | 3 | 3 | 4 | 3 |

Fixed in this round, as each was a wrong figure or a false pass:
- **Self-gravity.** It was said as the ratio of radii (37.4 for the Earth); it is now the ratio of the centre's pressure to the yield, the square of that (1,400).
- **Light crossing a thing** is now weighed against the time the thing takes to turn or move, so an Earth-sized rotor turning once a day is not "out of step".
- **Heat crossing a thing.** The time its heat takes to cross it no longer gives a "must"; what it can shed is weighed by its surface.
- **The magnetic and electrostatic crossover** is said to one figure, about 0.8 mm, as a rough one.
- **A named mechanism not kept** ("scissor-lift") is ✗, not ✓.
- **A lift raised by no derived drive** is ✗: its travel and guides are made and tested, but what raises it and holds it there is not derived.
- **A law's figure with no limit to pass against** is now said (·), not ticked (✓).
- **A deflection limit** is said as "1/250 of its span is …: more fails", not "… passes" beside a figure that fails.
- **A lift's posts** are sized for what really rides on them, the carriage included (139 kg, not 104). Its 159 kg steel base is said, with its thickness taken, not derived.
- **A missed weight limit** says where the weight is by kind and count ("the 20 joists 6.93 kg"). Each choice of matter made for lightness says what part it is for.

### Open after wave 2 (the next round, D3, by cause)

- **What it makes must hold what it is for.** The raised bed has no walls to keep its soil (it needs sides against the soil's sideways push), and no knee room for a wheelchair (ADA 306). The cart has no tub for its soil. The boot dryer has no door and no vent.
- **Loads as they are.**
  - A spread load (soil) should be read as spread, not as one point at the middle.
  - A person should be read as standing anywhere, over one rail.
  - Wet wood under a load that stays creeps (EN 1995 k_def), and framing lumber is graded, weaker than clear wood (EN 338 C24).
  - Mud rolls far harder than pavement and grips less, and a slope needs grip as well as torque.
  - Wind can be weighed as a push on what faces it.
- **The laws said where nothing is made.**
  - The heat engine: the most power from heat that must cross a conductance, K ΔT² / 4T, and how little of the 0.5 K it sees across 10 µm.
  - The Earth motor: a sphere's surface, radiation alone in vacuum, and its own spin as the store a generator would draw on.
  - The drone: the hover verdict without flapping wings, and its drag at 1 m/s.
  - The city walker: what sand bears under it.
  - The Mars ship: the rocket equation and the dose on the way.
  - The microSD card: the radio's power for 50 MB/s, and an antenna longer than the card.
- **Reading.**
  - Every number is to be accounted for: 70 °C and 400 t went unsaid.
  - "1 million tonne" and sieverts are to be read.
  - A model number ("Orange Pi 5") is no quantity.
  - The "what should it do?" menu should not be put to a request it cannot fit.
  - Cut-off text, and lines that repeat each other, are to go.
- **Folding and collapsing structures** (the scissor lift, the footbridge, the umbrella) are now honestly refused. Their linkage, with its folded and opened states each checked, is the next thing to build (Phase 4).
- **Clear-wood strengths.** The load law takes clear-wood strengths (USDA Wood Handbook). Graded lumber with knots is weaker, so wood frames are less safe than their factor says.
- **Point loads.** A spread load (soil) is read as one load at the middle, which is conservative by about two on bending.
- **What raises a lift** (a screw, a winch, a scissor linkage) is still pushed up in the test, and it says so.

## Round D3: the wave-2 findings, fixed by cause

Each finding the four testers made was fixed in general, then all 16 requests and the 18 everyday ones were run again.

**What a thing is for.**
- **Loose stuff is held in.** Soil, sand, grain and the like lie in walls round the surface. Each wall is the least board that bears the stuff's sideways push spanning between its corners: at rest K0 γ z with K0 = 1 − sin 30° (Jaky, estimate).
  - The raised bed: 40 mm walls, 2.79 kPa at their foot.
  - A cart carrying soil by weight gets a tub as deep as a wheelbarrow's (250 mm, estimate).
- **Wheelchairs.** Something to be used from a wheelchair is checked for 685 mm of knee room and a work surface no higher than 865 mm (2010 ADA Standards 306.3, 902.3). The raised bed fails both, as the tester worked out by hand: 471 mm and 1.05 m.
- **A cabinet has a door**, assumed and said.
- **Drying** is weighed by the water's latent heat, 2.41 MJ/kg at 40 °C. Each 100 g dried in 3 h takes 22 W beyond keeping warm. A closed 36 L box holds only 1.8 g of vapour at 40 °C (Buck's saturation formula), so the boot dryer fails: it needs air moved through it, and air flow is not kept.

**Loads as they are.**
- **Spread loads.** The workshop's load law now reads a load spread along a part (M = F L / 8, δ = 5 F L³ / 384 E I), and a load that bears on only part of a width.
- **Frames by how the load lies.** A frame is sized and checked by how its load lies:
  - spread, each part takes its share;
  - a person may stand anywhere, so the joist and the rail under them take it all, and the sheet bears it on a strip a foot wide and the bay again.
- **Creep.** Wood under a load that stays creeps (EN 1995-1-1 k_def: 2.0 kept wet, 0.6 dry), and the bending checks include it.
- **Graded lumber.** Framing is sawn softwood graded C24 (EN 338: 24 MPa, 11 GPa, 420 kg/m³), not clear wood.
- **What it rolls on.** Rolling resistance and grip now come from what it rolls on: mud 0.2 and 0.3, grass, gravel, sand, snow (estimates).
  - A slope needs grip as well as torque. The garden cart's wheels need a friction of 0.85 on mud and get about 0.3.
  - What powers its motors is said as not made, and not counted in its weight.
- **Wind.** A wind said is a push in the Jolt test: ½ ρ v² on its outline, drag coefficient 1.2 (estimate). The umbrella, now a canopy on a pole (its cloth a thin sheet, said so), takes 446 N at 40 km/h and blows over, as the tester expected (about 450 N).
- **Folded sizes** are checked against the sizes as made. It does not fold, so it fits only if it is that small already.

**The laws where nothing is made.**
- **The Mars ship (`orbits.ts`).**
  - Lambert's problem gives the least transfer for the days asked: 13.9 km/s each way for 90 days, falling to Hohmann's 5.7 km/s at 259 days.
  - The rocket equation then leaves 0.7 t (chemical) and 17 t (nuclear-thermal) of the 400 t, less its tanks, against a 40 t habitat for four (NASA DRA 5.0, estimate).
  - The dose on the way is 0.33 Sv at 1.84 mSv a day (Curiosity's RAD).
- **The heat engine.** The most power through what conducts heat to it is K ΔT² / 4 T (Curzon and Ahlborn): 1 nW, 992 times too little. Across its own 10 µm it sees far less than the 0.5 K.
- **The Earth motor.**
  - Its surface is a sphere's, and in vacuum it sheds heat by radiation alone: its losses warm it by 0.0004 K.
  - To power a world it must be a generator, and its own spin holds 3.6 × 10²⁹ J, 570 million years at 20 TW.
- **The microSD card.** Sending 50 MB/s by radio draws about 1 W (2.5 nJ a bit, estimate), and it settles near 131 °C against its 70 °C limit. A quarter wave at 2.4 GHz, 31 mm, is twice the card.
- **The drone.** It can carry the energy to hover, but must flap, as wasps and beetles its size do. At 1 m/s its drag is 2.3 times its weight.
- **The city walker.** Sand bears about 200 kPa, so a million tonnes needs at least 49,000 m² of foot.

**Reading.**
- Every number said is accounted for: 70 °C, 400 t and 1 million tonnes are now read.
- Sieverts, crews and data rates (MB/s as bytes, Mbps as bits) are read.
- A model number ("Orange Pi 5") is said as part of a name.
- "To power the whole planet" and "to run a pacemaker" are said back as what it is for.
- A heat engine is a conversion, not a turntable.
- "Crawls through 15 cm pipes" is on wheels, its width and height no more than the pipe.
- "Without the bottom sagging" is ticked by its bending check. "Without wobbling" is said as untested, since its parts are rigid.
- "150 kg of hammering" is said as a weight held still; impact is not tested.
- "What should it do?" is no longer put to a request it cannot fit.
- When nothing is made, the generator says what it heard, and what nothing made line says no longer repeats.
- Text is cut at a word.

### Open after D3

- **Folding, collapsing and unfolding** (the scissor lift, the footbridge, the umbrella): the linkage itself, with its folded and opened states each checked, is next (Phase 4).
- **What raises a lift** (a screw or a winch, and what turns it), and **a supply for its motors** (cells sized for the run, which the bounds already weigh).
- **Racking and impact.** Racking needs joints that give, and impact needs a blow in time; the physics has neither yet.
- **Sizes of what is put in a thing** (four boots in a dryer) are not yet read from what is named.
