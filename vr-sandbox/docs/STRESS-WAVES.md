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

### Open after wave 2

- **Folding and collapsing structures** (the scissor lift, the footbridge, the umbrella) are now honestly refused. Their linkage, with its folded and opened states each checked, is the next thing to build (Phase 4).
- **Clear-wood strengths.** The load law takes clear-wood strengths (USDA Wood Handbook). Graded lumber with knots is weaker, so wood frames are less safe than their factor says.
- **Point loads.** A spread load (soil) is read as one load at the middle, which is conservative by about two on bending.
- **What raises a lift** (a screw, a winch, a scissor linkage) is still pushed up in the test, and it says so.
