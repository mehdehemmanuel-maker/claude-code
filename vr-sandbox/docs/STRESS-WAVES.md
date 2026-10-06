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

## Wave 3: 20 requests, 5 fresh testers

Five testers with no context each wrote four requests for things not yet made, harder than wave 2. They covered:

- the home and access (a lowering cabinet, a tremor mug, a turning planter, a stair-climbing walker);
- the very small and the very large (a blood microswimmer, a 450 m airship, a burrowing worm, a solar-sail tug);
- structures (a wall shelf, a 6.5 m footbridge carried in by hand, a mountain shelter, a bird-watching tower);
- heat and energy (a solar charger, a 48 h flask, a Peltier cooler, a hand-crank kettle);
- space and the deep sea (a Mars transfer stage, a lunar habitat, a Challenger Deep pod, a Europa flight board).

They read only the generator's output files; it ran each with seed 101. Each output was scored 0 to 4 on what it read, what it made, whether that holds, and how honest it is.

### Baseline, and what changed by cause

| # | request | read | made | holds | honest | after the fixes |
|---|---|---|---|---|---|---|
| 1 | lowering wall cabinet | 1 | 0 | 0 | 2 | the power to lower it in 10 s, 12.1 W for what rides and its 20 kg (m g h / t), said, from what raises it, which is not derived |
| 2 | tremor mug | 1 | 0 | 1 | 1 | keeping it hot is ✗ (no insulated wall is kept); as made, its bare aluminium wall lets 0.35 kg fall to 55 °C in about an hour |
| 3 | turning planter | 3 | 1 | 1 | 2 | "planter" is read as a surface holding soil. The turntable stands under all of it, the soil box on legs on its plate and the tank beside the soil, not in it. Its 0.003 rpm is honestly out of reach of every motor kept |
| 4 | stair-climbing walker | 2 | 1 | 2 | 3 | unchanged: climbing and folding are said as not kept |
| 5 | blood microswimmer | 1 | 2 | 1 | 2 | Reynolds 0.003, Stokes drag, the time to the clot, and blood flow 20 to 10⁴ times its speed |
| 6 | 450 m cargo airship | 0 | 0 | 1 | 1 | buoyancy, drag, power and fuel weighed: it lifts 1350 t; 12.2 MW, 135 t of fuel |
| 7 | burrowing worm | 2 | 3 | 2 | 3 | the energy for 48 h against its volume; the power to burrow |
| 8 | solar-sail tug | 1 | 0 | 1 | 1 | light pressure on 2.25 × 10⁴ m² against 2.23 t; space is not made, said so |
| 9 | wall record shelf | 1 | 0 | 0 | 1 | **holds and does what was asked.** One 15 mm board sits on two steel brackets at the studs 600 mm apart, the wall standing for itself and not weighed. It bends 2.27 mm against the 3 mm said; each top screw is pulled with 259 N against the 955 N taken as safe |
| 10 | 6.5 m footbridge | 1 | 0 | 1 | 1 | **holds and does what was asked.** 2x10 C24 rails bend 21.5 mm against 26 mm under 450 kg spread along it, and no part weighs over 35 kg: the deck is cut into pieces ending on joists |
| 11 | mountain shelter | 1 | 0 | 2 | 2 | sized for four lying down (2.6 × 2 × 1 m inside), within the 3 × 2.5 m of ground said. Its roof under 80 cm of settled snow (2.35 kPa) bends 82 mm against 10 mm, and in a 110 km/h wind it slides away: it needs holding down, not kept |
| 12 | bird-watching tower | 2 | 1 | 2 | 2 | wind pushes on its parts' faces at their height. "Not tip over" is ticked by the wind test, and 5 m wood legs fail K L / d ≤ 50 (NDS 3.7.1.4), honestly |
| 13 | backpack solar charger | 1 | 3 | 1 | 2 | unchanged: 9 times too little light |
| 14 | 48 h vacuum flask | 1 | 0 | 1 | 1 | read as one flask, no box, with "under 400 g empty" as its own weight; as made, bare, it cools to 70 °C in 45 min |
| 15 | Peltier cooler | 2 | 0 | 1 | 2 | its 20 L vessel stands inside the box, sized to take it. As made, 144 W leaks in: 20,700 Wh against the 100 Wh it stores |
| 16 | hand-crank kettle | 1 | 1 | 2 | 2 | "to bring it to a boil" is said as heating not kept, and weighed: 15.8 times what a hand gives |
| 17 | Mars transfer stage | 0 | 0 | 1 | 1 | refused as space, with the transfer and propellant weighed |
| 18 | lunar habitat | 0 | 0 | 1 | 1 | refused as space; dose, pressure and heat weighed |
| 19 | Challenger Deep pod | 2 | 4 | 3 | 3 | the titanium sphere's mass at depth, with the cells |
| 20 | Europa flight board | 1 | 3 | 0 | 2 | about 5.4 Sv a day on Europa's surface (Ringwald 2000, as Wikipedia gives it) makes 30 days about 16 krad unshielded, against the 300 krad rating. The trip through Jupiter's belts is said to be uncounted. "From −160 °C" keeps its sign |

The scores are the testers' on the baseline. The right-hand column is what the generator says now. The same testers have not yet rescored it.

### What was wrong, by cause

**The load law.**
- **It mistook an edge support for one under the load.** A wall along one edge of a roof counted as bearing straight under its middle, because each reading looked along one way only. A roof under snow showed 0 mm bending. Now a part bears the load directly only when it is under the load point both ways.
- **The load between two supports the other way.** A load lying on the line between two supports that are offset the other way (a stool's front edge between its two front legs) now spans between them that way. It is no longer taken as a cantilever from the back leg.

**Keeping hot or cold.**
- Keeping something hot or cold over a time is ✗ when no insulated wall is made. Before, it was ticked because a vessel was made.
- A check of the made walls says how long it really keeps, or what keeping it cold costs. It takes each wall in series (t / k A) and the still air outside (laminar convection and radiation, estimate), stepped in time.

**Enclosures and vessels.**
- A vessel where something encloses goes inside it, on its floor. The enclosure is sized to take a vessel of that volume.
- The vessel's shape is drawn to fit the inside: from 0.7 to 1.6 times as tall as it is wide.

**Reading.**
- **"Keeps … in a 5 °C car"** is a place. Keeping something in or out now needs "in" or "out" to end the clause.
- **"Under 400 g empty"** and "lighter than" are its own weight, where nothing near the number carries.
- **"No single piece can weigh more than"** is the part limit. The words before a number are read in their order.
- **"Takes up no more than 3 m × 2.5 m of ground"** is a footprint limit, both numbers of it. "2 m x 2 m footprint" is a size, not a thing to make.
- **"Survives", "withstands"** are verbs. What they must stand is heard with its numbers and checked there; "110 km/h winds" is no longer read as winding.
- **"And not tip over"** is ticked by the test that covers it.
- **Counts of people.**
  - "4-person" sizes a shelter for them.
  - "4 adults plus a wheelbarrow" on a span is a load spread along it.
  - "2 adults (200 kg)" is counted in the weight said, or 80 kg each where none is said.
- **"80 cm of settled snow on the roof"** loads the roof, ρ g h.
- **"70 kg spread evenly"** is a spread load.
- **"600 mm apart"** is where it is fixed.
- **"Works from −160 °C to +120 °C"** is a range heard with its numbers, its minus kept in what is said back. "Its total dose rating" is a rating, not a dose measured out.
- **"That an ordinary adult can use"** finds the thing before the verb.
- **"To bring it to a boil in 5 minutes"** is heating, weighed.

**Ways and parts.**
- **A wall shelf** is a board on two steel brackets screwed to the wall at the studs: one board unless more are said.
  - The wall is a block of concrete standing for it, not weighed, not pushed and not counted in its footprint.
  - Each top screw is checked against a wood screw's withdrawal: USDA Wood Handbook ch. 8, 4770 N for 5 mm × 50 mm at G 0.42, a fifth of it taken as safe.
- **A planter** is a surface holding soil, its soil a weight unless a depth is said.
- **The whole of it turning.** Where the whole of what is asked turns, the turntable stands under all of it, and its plate is as wide as what stands on it.
- **A vessel and loose stuff.** A vessel does not stand in loose stuff a surface holds; it stands beside it.
- **Lumber.** The 2x10 and 2x12 PS 20 sizes are kept. This also changed the house's roof sizing: one support line of 2x12 at 24 in now frames the 10.95 m roof. By hand: 10.7 mm against L/360 = 15.2 mm, E 13.4 GPa.
- **A load of several.** A crowd on a span is spread along it, on both rails.
- **A deck in pieces.** Where no part may weigh more than said, the deck is laid in pieces, each ending on a joist.
- **Its deck raised.** A bridge's deck is raised where its frame is deeper than the height said, so its ends stand at least 100 mm.
- **Wood columns** are held to K L / d ≤ 50 (NDS 2018 3.7.1.4).
- **A vessel's base** is as thin as the liquid's push lets it be (σ = 3 p r² / 4 t², by three), and said to be square. The tube's mass was exact; the base's square lip was what the tester missed.
- **Part names.** The vessel's base no longer shares its name with a turntable's base.

**Tests in the physics.**
- **Wind.**
  - The wind pushes on the face each part shows across it: a slender part by a drag coefficient of 2, any other by 1.2 (estimates).
  - That is no more in all than the solid outline would take, centred where those pushes are.
  - An open tower's frame is no longer a solid wall, and something that slides rather than tips is said to need holding down.
- **Stand-ins.** What stands for something else (a bank, a wall) is neither pushed nor weighed in the push. It is not counted in the design's mass or parts.
- **A liquid that is not in the physics.** Where its weight is not in the physics but its push is, tipping is also weighed by statics, its weight on the middle of its foot. A full 20 L tank pushed with 21 N no longer "tips" because its water is missing.
- **Raising in a time** needs the power m g h / t for what rides and what it carries, from what raises it, which is not derived.

**The laws where nothing is made.** On Europa's surface, a rated total dose is weighed over the time there.

### Checked

- The gate: typecheck, and 964 tests in 92 files.
- Both browser drives: the generator drive, 22 steps, and the flow board drive, 10 steps, with no script errors.
  - On its first run, the generator drive timed out on the first click after the page loaded. It passed in full when run again.
- The everyday set (18) and wave 2 (16) were rerun.
  - The stool's top is 18 mm, not 15 mm, under the corrected load law.
  - The 20 L tank holds by statics.
  - The wall-hung workbench of wave 2 is now a board on brackets.
  - No other result changed.

### Open after wave 3

- **Folding, collapsing and unfolding** (the walker, the shelter in a sled, the folding bridge): the linkage (Phase 4).
- **What raises a lift and holds it**; a speed reducer of many stages, or a stepping motor, for very slow turning; a bearing under what a turntable carries.
- **Insulated walls** (a vacuum gap, foam) as a way, and a cooler (a Peltier, a compressor) as a part.
- **A roof on rafters**, so a shelter's roof can bear its snow; **guy lines and stakes** to hold down what slides in the wind.
- **Bracing**, so a tall frame's columns are not free to sway (K below 2), and a 5 m tower can stand.
- **A retest** by the same five testers.

## Round D4: wave 3 rescored, and fixed by cause

Five new judges, with no context, each scored four of the twenty outputs as the generator gave them after wave 3's fixes. They read only the output files, and they listed what was still wrong. Their findings were then fixed by cause, in four batches: what is read and said back, the laws where nothing is made, structures and the checks of what is made, and the size table.

### The rescore

Each score is read / made / holds / honest, from 0 to 4.

| # | request | baseline | rescored | now |
|---|---|---|---|---|
| 1 | lowering wall cabinet | 1/0/0/2 | 3/1/2/3 | its lowest at 900 mm (a worktop, estimate), its highest 1.4 m; its plates carried on the box floor; let go at the top it falls in 0.32 s, so it needs a brake or a drive that does not run back, holding about 243 N; "wall-mounted" is ✗, so the cabinet is ✗ as a wall cabinet |
| 2 | tremor mug | 1/0/1/1 | 2/1/2/3 | "for someone with a Parkinson's tremor" is who it is for; its open top counts, and it falls to 55 °C in at most 54 min; its bare aluminium near 85 °C burns on touch (ISO 13732-1) |
| 3 | turning planter | 3/1/1/2 | 3/2/2/2 | "turns 360°" is ✗ where its own turn test fails; on a balcony it is weighed against 2.5 kPa and 2 kN on any 50 mm square (EN 1991-1-1 Table 6.2): 1.99 kPa, 0.97 kN |
| 4 | stair-climbing walker | 2/1/2/3 | 2/1/2/3 | a load at its top's edge is tested for tipping over its feet; climbing 180 mm in 3 s takes 74.7 W (m g h / t) |
| 5 | blood microswimmer | 1/2/1/2 | 3/0/2/2 | it sinks at 6.2 mm/s unless as light as blood; swept by blood 200 to 2000 times its speed; a field turns it as a helix (8 π μ a³ ω against m × B); its size table drops coils against combs, as a field drives it |
| 6 | 450 m cargo airship | 0/0/1/1 | 4/1/3/3 | half its gross lift for its own structure (1930s rigid airships, estimate): 241 t over the 300 t at sea level, 51.8 t at 1.5 km; the ballast as fuel burns |
| 7 | burrowing worm | 2/3/2/3 | 3/0/3/3 | its 1 m/h is weighed (cone resistance and skin friction, 3.4 mW), not dropped |
| 8 | solar-sail tug | 1/0/1/1 | 3/0/3/3 | (1 + R) S / c; spiralling out of Earth orbit and down to Mars at 0.3 of its push; light 1 / r²; about 9590 days against 1100 |
| 9 | wall record shelf | 1/0/0/1 | 3/4/3/3 | creep under a load that stays (k_def 0.8, EN 1995-1-1 Table 3.2); its overhanging ends; screws in withdrawal and shear: 2.34 mm against 3 mm |
| 10 | 6.5 m footbridge | 1/0/1/1 | 3/4/1/1 | one person standing between joists (100 kg, estimate) on deck and joists; the rails held against sideways buckling (EN 1995-1-1 6.3.3); the deck's middle bay its own piece; 7.8 m rails must be spliced (lumber about 4.88 m, estimate) |
| 11 | mountain shelter | 1/0/2/2 | 3/1/2/3 | a 700 mm door between two front walls, which swings; roof uplift and the wind empty; it slides in a 110 km/h wind and needs holding down |
| 12 | bird-watching tower | 2/1/2/2 | 4/2/1/2 | "not tip over" is ✗ where its wind test fails; empty it tips (11 300 N·m against 5830); its panels are bigger than any sheet sold; a guard and a stair are not derived |
| 13 | backpack solar charger | 1/3/1/2 | 3/0/3/3 | even all the light on it, at 100%, is 2 times too little |
| 14 | 48 h vacuum flask | 1/0/1/1 | 3/1/3/3 | a held bottle, 85 mm across inside and 2 to 4 times as tall; "vacuum" ✗, so it is ✗ as a vacuum flask; a flask's heat loss scaled by its surface |
| 15 | Peltier cooler | 2/0/1/2 | 2/1/2/2 | the air between its tank and its box, 3 W/m²K a face (estimate): 20.8 W leaks in, not 144 W; even a Carnot cooler draws 134 Wh against the 100 Wh |
| 16 | hand-crank kettle | 1/1/2/2 | 3/1/2/2 | as made, its walls let out 46.7 W at 100 °C: a person's 52.5 W at the water brings it to a boil in about 4.1 h |
| 17 | Mars transfer stage | 0/0/1/1 | 3/1/3/2 | "400 km" heard as its orbit; Lambert's problem for 180 days; tanks a tenth, and three twentieths with its engines and structure |
| 18 | lunar habitat | 0/0/1/1 | 1/0/1/1 | a sphere at 101 kPa: 202 kN on each metre, 5.08 MN on its floor; under 2.5 m of regolith (k 0.01) it loses 248 W, so the trouble is shedding its 15 kW; 1410 t of cover |
| 19 | Challenger Deep pod | 2/4/3/3 | 3/1/3/3 | a thick sphere (Lamé), cells packed at 60%, primary cells, cells in oil outside the hull; at 120 kg it runs 17.8 days |
| 20 | Europa flight board | 1/3/0/2 | 1/0/1/1 | 5.4 Sv a day is tissue dose, not silicon's behind a shield, and its 300 krad is not judged; 2 kg of tantalum is 4.44 g/cm²; it radiates to Europa's ground at about −163 °C and settles near −28 °C; its 30 days of cells weighed only as if it ran on its own |

On average, reading rose from 1.2 to 2.75, making from 0.95 to 1.1, holding from 1.2 to 2.2, and honesty from 1.75 to 2.4. The right-hand column is what the generator says after D4. No judge has scored it yet.

### What was wrong, by cause

**What is ticked.**
- A thing named for something it does not have is ✗ as that thing. Examples are a vacuum flask with no vacuum, a hand-crank kettle with no crank, a fold-down bench that does not fold and a scissor-lift with no scissors. It is made only as what it does.
- What it is said to carry is said back, done by what carries it. Its motion test and an underived drive do not fail it: a cabinet that lowers its plates still carries them.
- A thing it does is ✓ only where its own test passes.
- What it must not do ("without wobbling") is said apart from the load it is said with.
- The weight check says that what is not made would weigh more.

**Reading.**
- Who it is for keeps its words: "for someone with a Parkinson's tremor". A size said with it ("my record collection that's 1.2 m long") is the thing's own.
- Qualities (vacuum, insulated, hand-crank, silent) are has-items, ✗ where not made.
- A balcony is what it stands on.
- Several things are now heard rather than dropped:
  - the orbit's height (400 km);
  - a card's size (100 × 160 mm);
  - a climb's height;
  - "to counter height";
  - a speed it burrows at, read before its numbers are.
- What powers it is read from the words. A board for a lander runs on the lander, unless cells, a battery or a charge are said.
- Trailing punctuation and spaced brackets are cut from what is said back.

**The laws where nothing is made.**
- **Under the sea.** A sphere this thick is a thick sphere (Lamé). Cells pack in at about 60%, primary lithium cells hold about 600 Wh/kg, and cells in oil outside the hull need no sphere. Each says how long its weight would last.
- **The airship.** Its own structure is about half its gross lift, it flies at 1.5 km, and it takes on ballast as its fuel burns.
- **The microswimmer.** It is weighed for Stokes settling, blood flow, and a field turning it as a helix.
- **The sail.** It is weighed by (1 + R) S / c, spiralling out and in, and light falling off as 1 / r².
- **The Moon.** A buried habitat is weighed by shell conduction through its cover, the cover's mass, and the dose under it, which is not derived.
- **Europa.** Its dose is tissue dose, and the dose to silicon is not judged. It sheds its heat to Europa's ground, at about 110 K at the equator (as Wikipedia's Europa article gives it).
- **The energy carried.** It is judged only where it runs on its own. Otherwise it is weighed as if it did.

**Structures, and what is made.**
- **Point loads.** A crowd's point load, one person of about 100 kg standing between joists, is checked on the deck and on the joist under them.
- **Rails.** Rails are held against sideways buckling (EN 1995-1-1 6.3.3).
- **A deck in pieces.** The middle bay is its own piece. Pieces are named as "the deck in its 3 pieces".
- **A shelf.**
  - It creeps under a load that stays (EN 1995-1-1 Table 3.2).
  - Its overhanging ends are checked.
  - Its screws are checked in withdrawal and in shear (USDA Wood Handbook ch. 8; NDS yield modes).
  - The board and the brackets are sized together for the overhangs, the lighter way first. A wall workbench that had failed by 6% now holds on a 22 mm board.
- **What it stands on.** It is weighed with all it weighs and carries:
  - on a balcony, 2.5 kPa spread over it and 2 kN on any 50 mm square (EN 1991-1-1 Table 6.2);
  - on sand or soft soil, about 200 or 100 kPa under each foot (presumptive bearing, estimate).
- **A load at its edge.** A load at any edge of its top is weighed against the outline its feet make on the floor (statics). A three-legged stool with a square top tips from its corner, so it is redrawn on four legs. A tenth of a millimetre is where a part is drawn, not outside it.
- **A walk-in door.** A shelter, hut or doghouse has a walk-in door 700 mm wide between two front walls.
- **Sheets and lumber.** Wood sheets bigger than any sold (about 1525 × 3050 mm) and sawn timber longer than is commonly stocked (about 4.88 m) are said to need piecing or splicing.
- **Where people stand high.** Where they stand more than 760 mm up, a guard and a stair are said to be not derived.
- **Vessels.**
  - A vessel held in one hand is no wider inside than about 85 mm.
  - A bottle stands 2 to 4 times as tall as it is wide.
  - An open top loses heat as bare surface, and the air between a vessel and its box counts.
  - Bare metal over 60 °C burns (ISO 13732-1).

**Tests that spoiled each other.** Each physics test went on from where the last left it. A 110 km/h gust slid the shelter 6.6 m and flung its door open, so the door's own test then read 0°. Now:
- the wind test runs last;
- sizes and feet are read off it as built;
- the empty wind, the uplift, and the wind's statics are checked.

**A speed held.** The drain robot's speed controller was soft. With its 5 kg load it crept up over 1.4 s, overshot by 44%, and was at its peak (0.307 m/s against 0.2) in the third second, where its speed is read. Now:
- the controller reaches its current limit at a twentieth off the speed held, as a speed controller does;
- it is no stiffer than half of what the time step lets a loop on the wheel alone stay steady at (n² Kt (Kt + kp) dt / R J ≤ ½, J being the wheel's own inertia from the engine);
- the robot runs at 0.203 m/s.

Held that stiffly, the planter's turntable also held 0.00278 rpm in the physics. But the physics takes a brushed motor's friction as smooth, and at 0.033 rpm at the motor its brushes stick and slip (estimate). So a turn held below a hundredth of the motor's speed with no load is ✗, said so.

**The size table.** A row is folded into one line, "far from bearing on it here", in these cases:
- a rim speed for what does not turn;
- coils against combs for what a field drives, or what nothing drives;
- self-weight where it is immersed or a thousandth of its strength;
- Bond's number past 10⁴;
- light time across something in a room;
- thermal shaking under 10⁻⁵ of its size.

What is past its threshold is always shown.

### Checked

- **The gate:** typecheck, and 975 tests in 92 files.
- **Both browser drives:** the generator drive and the flow board drive, with no script errors.
- **The everyday set (18) and wave 2 (16)** were rerun against their last outputs.
  - The doghouse has a door that swings.
  - The stool is redrawn on four legs, as its three-legged draw tipped from a corner.
  - The wall workbench holds.
  - The fold-down workbench, battery-assisted cart, scissor-lift platform and folding footbridge are ✗ as what they are named for.
  - Nothing else changed.

### The D4 outputs judged

Five more judges, with no context, scored the D4 outputs the same way. They read only the output files.

| # | request | D3 rescored | D4 judged |
|---|---|---|---|
| 1 | lowering wall cabinet | 3/1/2/3 | 3/1/2/3 |
| 2 | tremor mug | 2/1/2/3 | 3/1/2/3 |
| 3 | turning planter | 3/2/2/2 | 3/2/2/3 |
| 4 | stair-climbing walker | 2/1/2/3 | 2/0/1/2 |
| 5 | blood microswimmer | 3/0/2/2 | 3/1/3/2 |
| 6 | 450 m cargo airship | 4/1/3/3 | 4/1/3/3 |
| 7 | burrowing worm | 3/0/3/3 | 2/0/3/3 |
| 8 | solar-sail tug | 3/0/3/3 | 3/0/4/4 |
| 9 | wall record shelf | 3/4/3/3 | 4/4/3/3 |
| 10 | 6.5 m footbridge | 3/4/1/1 | 3/2/2/2 |
| 11 | mountain shelter | 3/1/2/3 | 4/1/1/2 |
| 12 | bird-watching tower | 4/2/1/2 | 4/1/1/3 |
| 13 | backpack solar charger | 3/0/3/3 | 4/0/4/4 |
| 14 | 48 h vacuum flask | 3/1/3/3 | 4/1/3/3 |
| 15 | Peltier cooler | 2/1/2/2 | 3/1/3/3 |
| 16 | hand-crank kettle | 3/1/2/2 | 4/1/3/3 |
| 17 | Mars transfer stage | 3/1/3/2 | 3/1/3/3 |
| 18 | lunar habitat | 1/0/1/1 | 3/0/3/3 |
| 19 | Challenger Deep pod | 3/1/3/3 | 4/0/4/4 |
| 20 | Europa flight board | 1/0/1/1 | 3/0/2/3 |

The averages:

| | D3 rescored | D4 judged |
|---|---|---|
| read | 2.75 | 3.3 |
| made | 1.1 | 0.9 |
| holds | 2.2 | 2.6 |
| honest | 2.4 | 2.95 |

These are different judges, so part of each change is the judge. "Made" fell where the judges were stricter about what is buildable:
- they gave the footbridge 2, as its 7.8 m rails cannot be spliced over a support on one clear span;
- they gave the walker and the deep-sea pod 0, as no walker and no pod is made.

Their findings are the next round's work (D5), by cause:

- **Ticks not earned.**
  - The shelter's "empty, it stands in that wind" weighs the wind's turning without its lift: together they flip it.
  - The cabinet's "raises 500 mm" is a ride along its guides, pushed.
  - The walker's "supports body weight" is a weight on a table top.
  - The planter's 10 L counts as a success apart from its watering.
  - The tower's push does not test its glued joints racking.
  - The footbridge says it does what was asked though its rails cannot be had in one length and its abutments are not derived.
- **Loads.** The 450 kg on the footbridge is spread along it, but people bunch: at midspan its rails bend 33.6 mm against 26 mm. The shelter's uplift has no margin, and has no inside pressure with its door open.
- **What is said back.** The mug's 5 ml spill is a thing asked, not a number unused; knocked over, open, it spills it all.
- **The size table.**
  - Reynolds' number in blood uses blood, not water.
  - The time heat takes to cross it says what it means at milliseconds and at years.
  - Self-weight does not bear on a hull held up by its gas.
- **The laws.**
  - **Microswimmer.** Swimming and reaching the clot are judged apart. Its mass is taken at the density it sinks by, and the field gradient that would hold it up is worked out.
  - **Worm.** The diameter it takes is said. The power its cells give is set against the power to burrow.
  - **Sail.** It is not read as solar cells. The sail that would make it in 3 years is sized.
  - **Solar charger.** The weight of its panels is weighed.
  - **Flask.** The radiation across a silvered vacuum gap is weighed against the makers' figures. A wall that must keep heat in takes a matter that conducts little.
  - **Cooler.**
    - Its Peltier is taken at the lift it has.
    - A compressor behind vacuum panels comes near the 100 Wh, and is said to.
    - The sun on it is weighed.
    - The 3 cm wall limit is checked as made.
  - **Kettle.** Its open top's evaporation keeps a hand-cranked kettle from ever boiling.
  - **Mars stage.** The propellant at three twentieths is said as propellant. Capture into an ellipse is worked through. More than one launch is said to be needed.
  - **Lunar habitat.** A closed sphere and a dome on a floor are told apart. The first hours, before its cover warms, lose more than 15 kW.
  - **Deep-sea pod.** Its wall is said as part of its radius. 900 Wh/kg is beyond any cell.
  - **Europa board.** It is warmed when off, and on its surface alone its dose would pass.

### Open after D4

- **Folding, collapsing and unfolding**: the linkage (Phase 4).
- **What raises a lift and holds it**; a speed reducer of many stages, or a stepping motor; a bearing under a turntable.
- **Insulated walls and a cooler** as ways and parts.
- **A roof on rafters**; guy lines and stakes; bracing for a tall frame.
- **A rescore** of the D4 outputs by fresh judges.

## Round D5: the D4 findings, fixed by cause

**Ticks not earned.**
- **The empty wind.** It now weighs the wind's lift and its turning together: what holds it down is its weight less the lift.
- **Lift and inside pressure.** The lift counts the air inside pushing up: 0.2 of ½ ρ v² with its openings shut (EN 1991-1-4 7.2.9), and 0.6 with a door open into the wind. It is ticked only within the margins taken for it, 0.9 of its weight against 1.5 of the lift (EN 1990 Table A1.2(A)).
- **The shelter.** It is no longer ticked as standing empty or as not lifting.
- **The cabinet's ride.** "It raises what it carries 500 mm" is now "it rides 500 mm up and down its guides", as it is pushed.
- **The mug's spill.** Its 5 ml is a thing asked, ✗: knocking it over is not tested, and with no lid it would spill all it holds.

**Loads.**
- **A crowd bunches.** A crowd on a span is weighed on its rails both spread along them and gathered at their middle, whichever is worse. Its own weight is taken there too, on the safe side.
- **The footbridge's rails.** Gathered at midspan, the 450 kg needs a 2x12 rail. That weighs 35.6 kg, more than a piece may. So the frame now takes two rails side by side under each edge where one would be too heavy, each bearing a quarter. It now holds on four 2x10s, the heaviest piece 29.3 kg.
- **Rails too long, on one span.** Over a single clear span there is nothing to splice a 7.8 m rail over. It must be engineered timber made to length, a splice made to carry the whole moment, or a pier midway.
- **A bridge's ends.** They stand for its banks, so its abutments and their footings are said to be not derived.

**The size table.**
- Reynolds' number in blood uses blood: 1060 kg/m³, 3.5 mPa s.
- The time heat takes to cross it says what that means from a second to ages.
- Self-weight does not bear on a hull held up by its gas.
- Water's Reynolds' number is not given for what flies.

**The laws.**
- **Microswimmer.**
  - Swimming is ✓: it covers 3 cm in 10 min against 15, and its field gives 152 times the drag torque.
  - Getting to the clot through flowing blood is ✗.
  - Its mass is taken at the density it sinks by, 8.63 µg.
  - The field gradient that would hold it up is about 0.98 T/m, many times what a clinical MRI's gradient coils give.
  - It no longer offers to make "the part it can" at 200 µm.
- **Worm.**
  - The width it is taken at is said: an eighth of its length.
  - Its cells give 3.45 mW against the 3.38 mW its burrowing takes before any loss, so it cannot.
- **Sail.**
  - It is no longer read as solar cells.
  - To make it in 3 years it would want a sail 1.24 km square, or 266 m square for the leg between the planets alone.
- **Solar charger.** Folding panels weigh about 2 to 3 kg/m² (estimate). The 2.27 m² it would need weigh at least 4.55 kg, against its 1.5 kg.
- **Flask.**
  - Two silvered faces across its vacuum radiate only 0.00424 W/K, so the laws allow it.
  - What flasks lose goes through the neck and stopper, which must let through under 0.00365 W/K.
  - The bound says "walls and a lid".
- **Cooler.**
  - Its Peltier is taken at the lift it has, about 0.29 at 31 K: 41 times too little.
  - A compressor behind vacuum panels comes near the 100 Wh, at 119 Wh, though it is neither a Peltier nor silent.
  - The sun on its top is weighed.
- **Open vessels.** An open top's evaporation is weighed by the Lewis analogy:
  - the mug falls to 55 °C in about 30 min;
  - the flask to 70 °C in about 29 min;
  - the hand-cranked kettle settles near 71 °C and never boils.
- **Mars stage.**
  - At three twentieths it must carry 1040 t of propellant, 1240 t leaving.
  - Captured into a long ellipse it brakes 1.58 km/s and needs 222 t.
  - 537 t in a low orbit takes several launches.
- **Lunar habitat.**
  - A closed sphere carries its own pressure; a dome on a floor needs 5.08 MN held down.
  - It settles only over about 19 years. Until then its warm wall loses more than its 15 kW for the first 5.5 h, so its warmth is weighed, not ticked.
- **Deep-sea pod.**
  - Its wall is said as part of its radius.
  - 120 kg holding 108 kWh would be 900 Wh/kg, more than any cell holds.
- **Europa board.**
  - It settles at −28 °C, within the −55 to +125 °C parts are rated for.
  - Switched off, it falls toward −163 °C and must be warmed.
  - On the surface alone its dose would be about 16 krad, 18.5 times under its rating. The whole mission is not judged.

**Reading.**
- "And tell me how much propellant it has to carry" is a question put with it, answered by the laws, not a thing it has.
- "With 370 s specific impulse" is a quantity heard with its number, not a part.

### Checked

- **The gate:** typecheck, and 984 tests in 92 files.
- **Both browser drives** pass with no script errors.
- **The everyday set (18), wave 2 (16) and wave 3 (20)** were rerun. Against D4, these changed:
  - the 6.5 m footbridge, 206 kg on four rails;
  - the mug, its spill asked;
  - the two small bridges, whose abutments are said;
  - the drain robot, at its speed since the controller fix.

## Wave 4: twenty new asks, judged blind, fixed by cause

Five fresh testers with no context each wrote four asks, twenty in all. They ranged from a flywheel merry-go-round to a microgripper, a 3.7 km fjord bridge, an amphibious car, a 12U rack and a solar sail. Five fresh judges then scored the outputs blind, reading only the output files. The scale for each criterion is 0 to 3.

**The baseline.** The averages over the twenty:

| Read | Made | Holds | Honest |
|---|---|---|---|
| 1.2 | 0.25 | 0.9 | 2.1 |

"Made" is low for a plain reason. Most of these asks are things no kept way makes yet:
- **Folding or unfolding.** Five of the twenty ask for it: the hockey goal, the cargo bike, the origami shelter, the self-folding gripper and the sail that unfurls.
- **Electronics.** Two ask for it: the board and the card.
- **A process.** One is a printer printing PEEK.

Those are said as not kept, and their laws are weighed. The fixes below are to what was read, weighed and ticked.

### What was wrong, by cause

**Ticks not earned.**
- **Nothing made, nothing ticked.** What cannot be put together under the laws now does nothing it was asked.
- **A failed load law un-ticks the load.** What it was asked to carry is carried only where the law of its load passes. Four cases:
  - The fjord bridge no longer ticks "carry 44 tonne trucks" while its 3.7 km span gives 122000 times over its yield.
  - The garden cart no longer ticks hauling 100 kg up its slope while its motors cannot.
  - Floating, hovering and holding a liquid are judged the same way.
- **A sealed rack is not ticked as sealed.** Sealed, airtight, watertight, dustproof and waterproof are qualities with no gasket or seal kept. A thing named for one is made only as what it does.
- **A number heard as "weighed below" that no law takes up now says so:**
  - "Squeezing with no more than 10 µN: heard, but no law here weighs it yet."
  - A law that uses a figure without restating it now restates it. The Earth-sized motor's heat is "the 5% it loses of the 2.00 × 10^13 W it gives".
- **An asked item a law weighs carries that law.** "Keeps the gear inside under 40 °C while it dissipates 1.2 kW" is said with "✗ it sheds the 1200 W it turns to heat at no more than 40 °C".

**Reading.**
- **Context words.**
  - "Has to carry" and "needs to" are not things it has, split across clauses or not.
  - "Holds up in 90 km/h winds" and "crosses a lake at 10 knots" are read as what they are.
- **Places across.** A fjord, lake, valley, canyon, strait, bay or channel is a gap.
  - A width said with one is its span.
  - A depth said with one means nothing can stand in it: "1,200 m deep" spans it all at once.
  - "A 1.1 m wide deck" over a creek stays the deck's width.
- **A journey in legs.**
  - "100 km at 80 km/h and then 5 km across a lake at 10 knots" pairs each distance with its own speed.
  - The first speed is the one it moves at.
  - A leg in knots, or across water, is on water.
- **Seats.** "A two-seat car" carries two people, 160 kg (80 kg each, estimate), where no weight is said.
- **A place's area.** "A 0.5 hectare fish pond" is the place it works in, not panels on it.
- **Forces said beside a word.**
  - "With less than 40 N on the handle" is the most a hand puts on it, the word after the number counting too.
  - "Squeezing with less than 10 µN" is a grip.
- **Speeds of other things.**
  - "The rim under 3 m/s" is its rim's.
  - "A 160 km/h slapshot" is a puck's: 170 g, IIHF.
  - "Fires 25 balls at 60 km/h" is a tennis ball's, 59.4 g (ITF).
  - "Tip over in 90 km/h gusts" stays a wind; the "tip" there is not a blade tip.
- **Flows and lifts.** "400 litres an hour out of a 25 m deep well" and "400 people per hour up 600 m" are a flow and a lift.
- **Temperatures.**
  - A frosty morning is about −5 °C (estimate).
  - "Held at 250 °C" is kept warm.
  - "When it warms to 37 °C" is a temperature it acts at.
- **Units and figures.**
  - "12U" is 12 rack units of 44.45 mm (EIA-310).
  - "Per panel" is a panel of 1.22 × 2.44 m.
  - "15%" is a grade.
  - "0.3 AU" is a distance from the Sun.
  - kn, ha, µN and mN are read.
  - "A 3D printer" is one thing, not three days of something.
- **As written.** What was asked is said back as it was written: "40 °C", "1.2 kW", "PEEK", "so I can".

**The laws.** Each is a law with its assumptions said, and an estimate where it is one.
- **Impact.** What hits it carries ½ m v² and m v. Stopped in about a millisecond, the puck strikes with about 15.1 kN. A 700 kg steer at 4 m/s stopped within 100 mm pushes about 56 kN.
- **What it throws, and the hand that winds it.** 25 tennis balls at 60 km/h take 206 J. A hand at 40 N on a 150 mm crank puts in 37.7 J a turn: about 11 turns, half of it reaching the balls.
- **A flywheel** stores ½ m v². 20 W for 4 h through a generator at 90% is 356 kJ. With its rim under 3 m/s that takes 79 t of ring: it cannot. 500 kg of children at that speed hold 2.25 kJ.
- **Lifting a flow,** ṁ g h.
  - The well pump needs 27.2 W, or 54.5 W at 50%, against 60 W: ✓.
  - Water is lifted by suction no more than about 8 m, so from 25 m the pump must sit down the well.
  - The gondola needs about 75 kW at 70%.
- **Aeration.** 2 kg of oxygen an hour takes about 1 to 2 kW at 1 to 2 kg O₂ per kWh (estimate). That is 12 to 24 kWh of cells through a night.
- **A road trip.**
  - Rolling and air drag on each leg: Crr 0.012 and CdA 0.6 m² (estimates).
  - On water, the hull-speed rule, 1.34 √(waterline in feet) knots: 5.15 knots for a 4.5 m hull. At 10 knots it must plane, about 0.12 of its weight against it (estimate).
  - The two legs need about 16 kWh from its cells, about 100 kg of cells at 160 Wh/kg packed.
- **A grade.** m g v (sin θ + 0.01 cos θ): 1940 W for the cargo bike up 15% at 20 km/h. A rider keeps up 100 to 200 W, and an e-bike is held to 250 W where it is sold as a bicycle.
- **A hydrofoil** needs a lift-to-drag of 23.1 on 250 W at 18 km/h. That is past what small foils give (about 10 to 20): it cannot.
- **Warming in a frost.** 300 W on a 1.22 × 2.44 m panel settles near 0.4 °C in −5 °C air, against 5 °C: ✗.
- **A sail near the Sun.** At 0.3 AU (1.51 × 10⁴ W/m²) it settles near 177 °C. A polyimide film bears that; a polyester one does not.
- **One long span.** Cables carry their own weight, 1.25 ρ g L at a tenth's sag. Over 3.7 km that is 356 MPa in steel wire alone, about 1070 MPa with its deck, against 805 MPa allowed. The longest span built is 2023 m, the 1915 Çanakkale Bridge.
- **A power cap.** "Runs on under 5 W" is checked against the rated power of the motors made.

### Checked

- **The gate:** typecheck, and 993 tests in 92 files. Nine new tests, one per cause above.
- **Both browser drives** pass with no script errors.
- **The everyday set (18), wave 2 (16) and wave 3 (20)** were rerun. Against the last run, one changed: the garden cart no longer ticks hauling 100 kg up a slope its motors cannot climb.

### Open after wave 4

- **Folding and unfolding (linkages).** It is the most asked-for thing not kept: five of these twenty asks want it.
- **Electronics:** circuits, chips and cells.
- **Processes,** such as printing or cutting.
- **A thing sized to what it carries.** The two-seat car is still made as a small cart, and fails its own speed test honestly.

## Phase 4a: folding the whole of it

"Folding" was the most-asked thing not kept: five of wave 4's twenty asks want it. Directive C asks for it too ("collapsing and unfolding structures"). It is now kept, planned on whatever is made, with no template per kind of thing. The planner is `src/nexus/fold.ts`, by geometry alone. The generator (`src/nexus/conceive.ts`) makes it, tests it and judges it.

### How it folds

- **Its base stays.** The base is its widest flat part.
- **What folds.** Each part held to the base, with what hangs off it, folds a quarter turn flat onto it, about a hinge along the edge where they meet. It folds the way that keeps it over the base, and makes it thinnest.
- **Where two would fold onto each other,** the later one either:
  - hangs from a hinge block as thick as what lies under it, shortened by that much so it stands as made; or
  - is set in sideways past it, as a folding table's legs are.

  The seed draws which is tried first. A block keeps the feet where they are; set in, it folds thinner. The draw keeps whichever passes the checks: set in, a stool's edge load tips it.
- **Latched.** Parts held to each other but not through the base (walls meeting at a corner) are latched open, and let go to fold.
- **Lifted off.** A part held only by what folds, and as long as half of it (a roof on a wall), cannot fold with it. It is lifted off and laid on the stack.
- **The path.** It is turned a degree at a time, in the order they fold, and must meet nothing. Where it runs into a part still standing, that part folds first and the order is drawn again. Where it runs into one hung from a block, that one is set in instead.
- **Left as drawn.** These are not folded, and the reason is said:
  - what turns already (a wheel, what a motor drives), and what carries it;
  - what is fixed to a wall or rests on a bank.

  A plan with anything in its way leaves the design exactly as drawn.

### What it is checked by

- **It folds flat.** What folds onto what, and how; what is latched; what is lifted off.
- **Folding, nothing runs into anything.** The path, a degree at a time.
- **Latched open, its hinges hold.** Each hinge is held at its far side by 6 mm steel pins in double shear (8.48 kN each, estimate), at most one each 100 mm. They are checked against the push it is tested with, shared among what folds, or the wind said on what stands. The 110 km/h shelter needs 6 pins on its back wall.
- **Folded, it can be made under the laws.** It is made again folded, in a room of its own: laid down (upside down where things fold under it), each hinge free to open and stopping where it lies. Two bodies a joint holds do not collide in the engine, so without that stop a folded leg sinks into its top.
- **Folded, it lies still when let go** (Jolt). It is judged as when it stands: 10 mm or 2° fails. What was laid on top may settle, then must lie still.
- **What it must fold to,** against it folded:
  - a thickness ("folds flat to 8 cm");
  - sizes ("folds down to 30 × 40 × 80 cm");
  - what it packs into ("into a 25 litre backpack", now read as such).
- **Asked items.** "Folding" and the items said with it are ticked only where all of that holds. Where a size or weight is said with the fold, its own check must pass too: "packs into a sled under 30 kg" fails with the 279 kg shelter.

### Ten folding asks, made and tested

| Ask | Folds | What it says |
|---|---|---|
| a folding camping table, 20 kg, folds flat to 8 cm | ✓ | its two side panels fold up under the top, one from a 22 mm block: 66 mm thick |
| a folding stool, 100 kg, packs flat | ✓ | three legs fold under it (the stool fails its own edge load: three legs) |
| a collapsible crate 600 × 400 × 300 mm, flat to 6 cm | ✓ | its walls fold down in turn on 12 and 24 mm sills: 48 mm |
| a collapsible dog kennel, flat to 8 cm | ✓ | its walls fold down, its roof and door are lifted onto the stack: 62 mm |
| a folding picnic table, folds to 15 cm thick | ✓ | 82 mm (the table fails its own edge load) |
| the emergency shelter, into a 25 litre backpack | ✗ | it folds, to 3.51 m × 125 mm × 3.51 m: 1540 L, 61.7 times the pack |
| a folding footbridge, a 70 cm bundle | ✗ | one deck over all of it: folding it wants it cut into pieces hinged end to end (a book fold), not derived yet |
| a folding electric cargo bike | ✗ | each part it would fold carries a wheel |
| a fold-down workbench on a garage wall | ✗ | its brackets are fixed to the wall: folding it against the wall is not derived yet |
| a folding bookshelf with 4 shelves | ✗ | its base would be a shelf: folding onto an upright back or side is not derived yet |

### Reading, fixed with it

- "A bookshelf with 4 shelves that … folds flat": a verb said of one (folds) is not said of many (shelves). The folding is the bookshelf's.
- "Holds 30 kg each" counts the 4 shelves, not the 30 kg.
- "Folds flat to 8 cm" is a thickness, where it is not one of a chain of sizes.

### Checked

- **The gate:** typecheck, and 1005 tests in 93 files:
  - `tests/nexus/fold.test.ts`, the planner;
  - six generator tests, folding as made.
- **Both browser drives** pass with no script errors.
- **The everyday set, waves 2, 3 and 4** were rerun against the last merge. What changed is folding now made and judged. The w3c walker folds into 625 × 375 × 58 mm, within its 30 × 40 × 80 cm.

### The fold, shown

A design that folds as planned and tested carries its fold as a track (`Design.foldTrack`). What is lifted off goes up first; then each part turns a quarter turn about its hinge, in the order they fold; it holds folded a second, then opens out again. In the forge, "fold it" plays it in the room, on the desktop or in a headset. A browser drive makes the camping table from its words, plays its fold, and checks for script errors. A test checks that held folded, nothing in the track is in anything, all of it lies within 100 mm under the top, and it ends open as it began.

### Open after 4a

- **Half-turn folds:** panels meeting edge to edge folding onto each other, zig-zag (a room divider, a deck in pieces, a book fold).
- **Folding onto an upright base:** a bookshelf onto its back, a bench against its wall.
- **Folding a part onto what folds:** the roof onto a wall before the wall folds.
