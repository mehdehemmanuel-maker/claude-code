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

"Folding" was the most-asked thing not kept: five of wave 4's twenty asks want it. Directive C asks for it too ("collapsing and unfolding structures"). It is now kept, planned on whatever is made, with no template per kind of thing. The planner is `src/nexus/fold.ts`, by geometry alone. The generator (`src/nexus/ask/conceive.ts`) makes it, tests it and judges it.

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

## Phase 4b: folding in general

Phase 4a folded the parts held to one flat base, a quarter turn each. That left out:
- half-turn folds (panels meeting edge to edge);
- folding onto an upright base (a bookshelf's side);
- folding against the wall a thing hangs on.

The planner is now `src/nexus/substrate/foldtree.ts`; `src/nexus/fold.ts` is gone. It is still geometry alone, with no template per kind of thing.

### How it folds

- **A fold turns a whole branch.** Each part folds onto the part that holds it, after everything it holds has folded onto it. So a fold is a rigid turn of a part, with all that hangs off it, about a hinge where it meets its holder.
- **Quarter turns.** A part standing off a face (a leg under a top, a wall on a floor, a shelf off a side) turns a quarter turn flat onto that face. It lies flat only if the turn brings its thinnest way onto the face. A shelf swung sideways like a door would end beside the side panel, not on it, so that turn is never taken.
- **Half turns.** A part lying in line with its holder, meeting it at an edge (the pieces of a deck, the panels of a screen, a door beside its wall), turns over the top of it or under it. Done in turn, that gives a zig-zag.
- **Flat parts go along.** A part already lying flat on its holder (a square batten under a shelf, a cleat on a side) goes with it, and nothing is chosen for it.
- **The hinge is on the part's own edge,** where it meets the face or its block. Whatever hangs off the part turns with it. A batten under a shelf's far end therefore needs the block. Before, the hinge was put at the edge of everything that turns, 20 mm off the shelf, and the shelf and its block did not touch.
- **Blocks and set-ins,** as in 4a. A block is now also tried when the part would meet something on its way, not only where it lands: a shelf hinged at a side swings into the batten under its hinge 4° into its turn.
- **Shortening for a block** is refused only where another part of the same branch sits in the slab the block takes. A batten at the shelf's far end does not stop it.
- **Which part folds next, and how, is searched.** Any part whose own parts have folded may go next. Every way that folds all of it is weighed:
  - how far it lies past what it folds onto;
  - how thick it stacks;
  - a block or a set-in, as the seed prefers;
  - any part lifted off.

  The least is kept (branch and bound, with a state reached again no better not searched again, within 3000 tries per pass). A first pass allows nothing past the base; a second allows it where nothing else folds. Before, the order was fixed and the first fold found was kept: a 4-shelf bookshelf folded all four shelves up, 2.56 m long and 562 mm thick.
- **What is lifted off** is laid on what lies under it, not on the highest point of the whole stack.

### Against the wall

- **A thing screwed to a wall folds against it, where it hangs.** The wall stays, and the rest folds onto its face. A part screwed flat to it (an upright) goes with it.
- Folded, it is measured without the wall, and it is not laid down on the floor.
- **A thing that only rests on something** (a footbridge on its banks) is lifted off it to fold.
- The fold-down workbench now folds its arms and its board flat against the wall: 70 mm, against the 100 mm asked.

### What it is checked by, added

- **Held out, its hinges carry it.** A part standing its longest way off an upright face, with nothing under its far half (a bracket arm), carries its share of all of it and its load out from its hinge: W L / 2. Where its pin stands upright, the hinge's own length carries that moment. Where its pin lies across, its latch or its stop carries it at the part's thickness.

  The 150 kg bench's 30 mm arm, hinged at the wall, needs 2 pins where it has room for 1. That fails, and the bench says so: a real fold-down bench locks its arm with a brace, which is not derived yet.
- **Half-turn latches.** A joint between upright panels is pushed as a standing part is (its share of the push at its far edge, or the wind on its face). A joint in what lies flat end to end still carries what it spans (W L / 4). Before, the shelter's door, beside its wall, was weighed as a 2.65 m span and needed 49 pins; it needs 6.
- **The push counts only its own mass.** The concrete block standing for a wall weighed 1150 kg into it before.

### The engine, fixed

A 9 mm kennel floor joined to its two 9 mm hinge blocks sank 9 mm into the floor on one side and tilted 1.23°. It passed "lies still" (under 10 mm) only by chance. It was the engine, not the fold:
- Jolt merges the contacts of every sub-shape of a body that face the same way into one set of four.
- The block on top of the plate is 9 mm up, within the 10 mm ahead that a contact is looked for, so its points replaced the plate's own corner contacts on that side.

The same compound made in raw Jolt does it too; a 20 mm plate or a centred block does not. A body of joined parts in `src/nexus/substrate/sim.ts` now keeps each part's contacts its own (`mUseManifoldReduction = false`). The kennel now settles 12 µm.

The VR world (`src/physics/world.ts`) builds compounds the same way, but its conformance suite failed with the same change (a thin bonded angle no longer came to rest). So it is left as it was, and is open.

### Twelve folding asks, made and tested

| Ask | Folds | What it says |
|---|---|---|
| a folding camping table, 20 kg, folds flat to 8 cm | ✓ | its two side panels fold under the top, one from a 22 mm block: 66 mm |
| a folding stool, 100 kg, packs flat | ✓ | three legs under it, set in beside each other: 78 mm (it fails its own edge load: three legs) |
| a collapsible crate 600 × 400 × 300 mm, flat to 6 cm | ✓ | its walls down in turn on 12 mm blocks: 60 mm |
| a folding footbridge, a 70 cm bundle | ✗ | lifted off its banks, it is one deck over all of it: a book fold is not derived yet |
| the emergency shelter, into a 25 litre backpack | ✗ | it folds, to 3.51 m × 125 mm × 3.51 m: 1540 L, 61.7 times the pack |
| a folding electric cargo bike | ✗ | each part it would fold carries a wheel |
| a fold-down workbench on a garage wall, flat to under 10 cm against it | ✗ | it folds against the wall, 70 mm; but its 700 mm arm, hinged at the wall, needs 2 pins where it has room for 1 |
| a folding bookshelf with 4 shelves, 30 kg each | ✓ | its shelves fold onto one side, three from blocks; the other side is laid on top: 2.56 m × 201 mm × 540 mm, longer than it stands |
| a folding picnic table, 15 cm thick | ✓ | 112 mm (the table fails its own edge load) |
| a collapsible dog kennel, flat to 8 cm | ✓ | its walls fold down, its roof and door are laid on the stack: 54 mm |
| a folding room divider of 4 panels | ✗ | nothing made: "divide a space" is not a want it keeps |
| a folding drying rack, 5 kg, flat to 5 cm | ✓ | 29 mm (seed 8020; seed 101 folds to 56.9 mm and is drawn again) |

Seven of the twelve fold within what was asked. Before this phase, the bookshelf and the workbench did not fold at all.

### Checked

- **The gate:** typecheck, and 1012 tests in 93 files:
  - `tests/nexus/foldtree.test.ts`, 12 tests of the planner (`tests/nexus/fold.test.ts` is gone with `fold.ts`):
    - the table with blocks and set in;
    - the stool, the box, the zig-zag deck and the screen;
    - shelves onto a back;
    - folding flat, never on an edge;
    - flat battens going with their shelf;
    - folding against a wall;
    - what turns already.
  - the generator tests, folding as made: the footbridge, lifted off its banks, is again one deck to be cut.
- **The VR world's own suite,** 154 tests in 13 files, unchanged.
- **The everyday set, waves 2, 3 and 4** (74 asks) were rerun against the last merge. Two headlines changed:
  - the w3c shelter's "packs into a sled under 30 kg" fails, as its 279 kg says it must;
  - the w2b fold-down workbench folds against its wall (82 mm), drawn on its second seed: on its first, hanging an arm from a block took the arm's end off the upright under it.
- **All three browser drives** pass with no script errors. "Fold it" plays the table's fold in the forge.

### Open after 4b

- **A room divider** makes nothing: "divide a space" is not a want the reader keeps. A screen standing in a zig-zag would want its panels at an angle, and the planner folds only parts square to each other.
- **A book fold:** one deck over all of a bridge, cut into pieces hinged end to end.
- **A locking brace** for a bracket arm hinged at a wall.
- **The bookshelf's overhang:** four 756 mm shelves, 566 mm apart, cannot all fold onto a 1.8 m side. One of each pair must lie past its end. A parallelogram fold (each shelf hinged at both sides) is not derived.
- **The VR world's compounds:** each child's contacts kept its own, without upsetting its bonded parts.

## Wave 5: things not yet invented, weighed by their laws

Five fresh testers with no context each wrote four asks, twenty in all, for things that do not exist yet or barely do:
- a loft bed that folds up against the wall with one hand;
- a slow-roast oven held to ±0.5 °C;
- a stacking chair rocked back on its rear legs;
- a pull-down attic stair;
- a solar air heater;
- a medicine cooler with no electricity;
- a balcony wind turbine;
- a sand heat battery;
- a stair-climbing wheelchair;
- a folding patient hoist;
- a self-braking walker;
- a tilting hospital bed;
- a fold-up flood wall;
- an Antarctic tent warmed by body heat;
- a 25 m mast with no guy wires;
- a rescue bridge carried in 20 kg pieces;
- a docking collar on a spinning ring;
- a soft hand 10.9 km down;
- a flight computer the size of a microSD card;
- one gripper from a dust grain to a solar panel.

Five fresh judges scored the outputs blind, reading only the output files, from 0 to 4 for each criterion. After the fixes, five more fresh judges scored them again.

| | Read | Made | Holds | Honest |
|---|---|---|---|---|
| Wave 5, first run | 1.25 | 0.3 | 1.35 | 1.65 |
| Wave 5, rejudged after the fixes below | 2.45 | 0.6 | 2.25 | 2.7 |
| Wave 5, judged a third time (5c), before the fixes in "After the third judging" | 2.8 | 0.5 | 2.65 | 3.15 |

"Made" stays low for the reason it did in wave 4: most of these are things no kept way makes. Where nothing is made, the laws that govern the thing are weighed, and that is where most of the gain is.

### What was wrong, by cause

**Ticks not earned.**
- **A thing is ticked only where all it is asked to do is done.** Otherwise it is "made only as something to hold a weight up: not all it is asked to do is done". This takes the "✓ thing" off the wheelchair, the walker, the hospital bed, the tent, the oven, the solar heater and the loft bed.
- **A number said in what it does, and not used, un-ticks it.** "Holds 85 °C to within 0.5 °C" is not done while the 0.5 °C is not checked.
- **A load is carried only where every check of it holds.** The loft bed's "holds two adults" fails with its screws and its held-out hinges, not only with its board.
- **"Keeps warm" is done only where the check of its warmth passes:** the heater, the air held inside, or the walls.
- **The hatch is not a hatch** while its leaf gives under the pressure it holds.
- **Standing in a wind is listed** where it is asked ("stays standing in 120 km/h gusts") and tied to the wind test.
- **The headline says what it is about:** "WHAT IS MADE HOLDS" or "WHAT IS MADE DOES NOT HOLD".

**Reading.**
- **Tolerances, intervals and how level something is held:**
  - "to within ±0.5 °C" and "within 3 degrees" of level are tolerances, not targets.
  - "every 2 hours" is how often, not how long.
- **Power:**
  - "from a kitchen outlet" carries no battery.
  - "charges from 3 kW of solar" is what it takes in.
  - "on just 300 W" is a cap.
  - "powered by the rolling wheels" is its own motion, not stored power.
- **Sizes:**
  - "a 2.4 m ceiling" is a limit, and a loft bed's deck sits under it with room to sit up.
  - "two adults" is a double's width.
  - "no bigger than 1.2 m by 2 m" is a plan, either way round.
  - "fits in a 1 m³ space" is its room.
  - "a 1.6 m clear hatch" is the hatch.
  - "a 20 m run" is its length.
  - "18 cm steps" is a climb, not a width.
  - "the size of a microSD card" gives its 1 mm thickness (SD Association) when only 15 × 11 mm is said.
- **Who and what:**
  - "My dad needs a walker" names a walker.
  - "a footbridge a rescue crew can hike in" puts back the "that" left out.
  - "one gripper mechanism" is a gripper.
  - "a docking collar" is a rigid ring, not cloth.
  - "carried in on their backs" is the limit on a piece.
- **Loads:**
  - "rocking back on the two rear legs" puts all of it on two legs.
  - "nests 12 high without the stack going over 1.5 m" is a count and a height.
  - "a sudden 1000 N lean" counts twice its static effect.
  - "using one hand" is checked against one hand.
  - "tilts a 140 kg patient 30 degrees" is a tilt of what it carries.
- **Temperatures:**
  - "keeps 20 L of medicine below 8 °C" is kept cold, read across the clause it is in.
  - "keeps the inside livable at −45 °C" is −45 °C round it and 18 °C in it (the least the WHO advises in homes, a strict reading for a tent).
  - "kept above 5 °C" is what a heater holds.

**New laws.** Each is a law with its assumptions said, and an estimate where it is one.
- **Wind through a rotor:** ½ ρ v³ A, of which it takes at most 16/27 (Betz). 300 W at 10 m/s sweeps at least 1.03 m, about 1.45 m at 0.3 overall. Its storm thrust, about 556 N at 25 m/s, is weighed against a railing made for 0.2 to 1 kN a metre (EN 1991-1-1 Table 6.12).
- **Heat held in sand,** m c ΔT, inside the insulation that keeps its case cool. Inside 150 mm of mineral wool, 1 m³ holds 0.343 m³ of sand, 12.7 kWh for each 100 K. It loses about 324 W at 300 °C, and its case stays near 29 °C. 3 kW fills 100 K in 4.2 h, but winter sun gives 3 to 6 hours of it.
- **Water held back:** ½ ρ g h² a metre at a third of its depth, 7.06 kN at 1.2 m. Moving at 3 m/s, with C_d 1.25 (FEMA, estimate), it pushes 6.75 kN more.
- **A hatch under pressure:** p A, and a flat steel disc 3(3 + ν) p a² / 8 t² (Roark). 101 kPa on 1.6 m needs 21.9 mm.
- **Ice with no power:** ice holds the inside at 0 °C, so all of Ta drives heat in. It melts at 334 kJ/kg; the ice's own room is inside; the box's edges and corners are counted (shape factors, Incropera Table 4.1). Ten days at 40 °C behind 100 mm of foam takes about 40.5 kg of ice.
- **A mast alone in a gale:** its foot's moment ½ q C_d D H². Its tube's own section modulus gives a 399 mm × 8 mm steel foot for 25 m in 150 km/h. Greenhill's height (1881) is 73 m. A pickup holds only about 21 kN·m against 156 kN·m.
- **A ring that spins:** 1 g at its rim of a 2 rpm ring is 224 m out, moving at 47 m/s. That is what a ship latching on there must match.
- **A slope, a tilt, steps:**
  - On 8%, m g sin θ pulls it downhill, and a pendulum senses that with no power.
  - Tilted 30°, it holds only past a friction of tan θ = 0.577. Each tilt's work, with a controller of a few watts, sizes a 72 h battery.
  - Each 18 cm step lifts m g h.
- **A stair's treads:** F L / 4 across its stringers, and C24 tread thickness (EN 338, EN 1995-1-1). The springs carry what a hand's 50 N does not.
- **The sun on a heater:** about 600 W/m² square to the winter sun (estimate). The air it can warm to 55 °C, by P = ṁ c_p ΔT, is 10.9 L/s from 2.4 m².
- **Small things and wide ranges:**
  - A 20 µm grain sticks by van der Waals about 9600 times its weight (Hamaker, estimates).
  - 1 µN to 500 N is 8.7 decades, 29 bits.
  - 100 krad lasts 10 to 100 years in low Earth orbit (taken, as none is said).
- **Air,** p / R T: 1.55 kg/m³ at −45 °C, so every wind force on the tent is 29% higher.

**Checks of what is made, as it is used.**
- **The air held inside through its walls:** inside film 0.13 m² K/W (ISO 6946), the wind's 0.04 outside where there is one. It is set against what warms it: the people in it (three quarters of their heat warms air, estimate), or the power it may use.
- **A heater in what encloses** is sized by its walls, held by a thermostat (not derived), and its face checked against what it is in. The oven's heater in a 9 mm plywood floor would run near 248 °C; wood chars from about 270 °C (estimate), and it needs 50 °C to spare. The oven also has a door now.
- **A heater must reach its mark,** within half a degree, and is never a cooler.
- **A top's bending limit** uses its span between its supports, not its length.
- **A chair rocked back:** each rear leg bends where it meets the seat, by (W / 2) L sin θ. At 32 MPa in a 25 mm fir leg, that is short of two.
- **Twelve stacked** stand 10.2 m as made; to nest in 1.5 m, each must sit 59 mm above the one below.
- **A leaf under a pressure:** β p b² / t² (Roark Table 11.4). The collar's plywood leaf gives 5.7 times over.
- **Snow on its top** is borne by the load law. The solar heater's plate gives 3.1 times over.
- **Wheels climb a step** only lower than their radius: 144 mm wheels against an 18 cm step fail.
- **One hand folding it:** m g / 2 at its far end against the 148 N a hand should raise a lid with (Eastman Kodak, 1986).
- **Pins in wood** crush it before they shear: d t f_h (EN 1995-1-1 (8.32)).
- **The rigid test says what it is.** Its parts are held rigid, so it says nothing of what the load law finds gives. A part bigger than any sheet sold must be pieced and joined.
- **The size limits** are of what is made, not of the wall it hangs on.

**Against a wall, and the floor.**
- "Folds flat up against the wall" hangs it on the wall.
- Its board runs its long way along the wall.
- Its brackets go every other stud, where that bends it less.
- The concrete standing for the wall is deep enough to stand with what hangs off it, as a wall held by its building does.
- Nothing folds through the floor under it.
- An arm held only at the end it is joined at is a cantilever fixed there (the load law, F L³ / 8 E I spread along it).

### Checked

- **The gate:** typecheck, and 1035 tests in 94 files. That includes 23 new ones in `tests/nexus/wave5.test.ts`, one or more per cause above.
- **The three browser drives** (generate, flows, fold) pass with no script errors. The flow drive passed on a second run: the first timed out clicking while the page was still loading.
- **The everyday set (18), waves 2 (16), 3 (20) and 4 (20) were rerun.**
  - Every change lowers a "DOES n OF m", from the stricter ticks: a thing named, not ticked while a part of what it is asked to do is not done.
  - The heated climbing wall (wave 4) now makes its 1.22 × 2.44 m panel and fails honestly: holding 5 °C in −5 °C air takes 656 W against 300 W. Before, it made nothing.
- **The twelve folding asks were rerun.**
  - The wall-hung workbench folds to 100 mm, where it folded to 70 mm. Its arm's load is now found, so the draw that set an arm in sideways fails its overhang check.
  - The rest fold as before.

### After the third judging (5c)

Five more fresh judges read the outputs after the fixes above. What they found, fixed by cause:

**Ticks and counts.**
- **A limit said is asked.** Its weight, its size, a part's weight, how small it folds, its plan and its power are each counted in "DOES n OF m" and ticked only where their own check passes. The bridge's "no single piece over 20 kg" was missing from its count. A limit already said in what it does ("a 70 cm bundle weighing under 5 kg") is not counted twice.
- **The plan limit is checked.** "No bigger than 1.2 m by 2 m" was heard as checked, and no check existed.
- **A weight within a quarter of its limit, with parts still to come, is not ticked.** The hoist weighs 17.5 of its 18 kg, leaving 0.47 kg for its drive and battery.
- **How it is tested is not a check.** "Tested with what it carries on it" was a tick for the test's setup; the load is now said in the tests themselves.
- **Under a ceiling, its height is its top above the floor,** open and folded. The loft bed was 1.19 m tall itself, with its top 1.35 m up.
- **A push test the physics fails and statics passes says so** in its name.
- **A leg that buckles only if its top joint holds it square** says so, where its top is butt-glued.
- **A latch that cannot hold it open** fails what it carries, not whether it folds. A hand too weak or an arm held out are weighed apart from folding too.

**Laws added or corrected.**
- **The mast:** C_d falls with Reynolds number (0.77 at 8.9 × 10⁵, where 1.2 was taken). The vehicle's restoring moment counts the mast's own weight, and 1240 kg of mast is more than a pickup carries.
- **The flood wall:** moving water's push acts at half its depth and turns its foot too (7.04 kN·m a metre, not 2.82). Its C_d is FEMA P-55's by length over depth (1.3).
- **The heat store:** wool at its mean temperature (k 0.06, not 0.04: 486 W, not 324). Its loss warms the house it stands in. It gives 31.6 kWh from 300 to 50 °C, and what a day's spare sun gives back is 643 to 1290 W through the night, against a house's 1 to 4 kW. It is weighed, not ticked.
- **The cooler with no power:** no Peltier is offered. Ice is, with the ice that chills the medicine put in warm (8 kg more).
- **The stair:** the load factor γ_Q 1.5 (29.9 mm, not 24.4), and the spring's band, 135 to 415 N·m, not only its least.
- **The tilting bed:** its deck tilts too, through a drive of about 0.25. Held tilted, its weight turns it, and its battery allows for what it may not draw down.
- **The balcony turbine:** the moment at its clamp, its own weight and the storm's push, against what a metre of railing is made for.
- **The flat hatch:** how far it bends (13.7 mm) and what it weighs (346 kg).
- **A leaf bent past half its thickness** says the small-deflection stress is too high, though whether it holds stands. A span bent past a tenth of it says the figure means only that it fails long before.
- **The oven's heater:** one just strong enough holds 85 °C but never brings it there. Within 0.5 °C takes τ ln(65 / 0.5), and some of its heat goes down into the worktop.
- **On a roof, the wind lifts it.** The solar heater's 9.85 kg is lifted by about 900 N in a 25 m/s storm.
- **Sizes and rates:** a shed of heat past 85 °C is past what commercial parts are rated for; dose in low orbit is 0.1 to 2 krad a year; a grain's capillary pull is weighed; the titanium wall at its least yield is 8% thicker; the loft bed's guard is EN 747's, 160 mm over the mattress.

**Reading.**
- **The rules for "charges from" and "powered by the rolling wheels" never ran:** the electronics rule caught them first.
- **A radio mast** is a mast, not electronics. **"Runs a cubesat"** works it and does not power it.
- **"Brakes"** is a brake, not kept. **"Close"** with "open" is the same swing back. On a hand it is a grip.
- **"Flat-pack"** is said, not dropped. **0.5 m/s** is a slow walk, not a walking pace.
- **A sentence that goes on** ("…without tearing them? It has to close…") starts a new clause, so "them it" no longer appears.
- **Read lines that contradicted the laws:** the wind, the case temperature and the tilting bed's battery are now said to be weighed where they are.

**Checked.**
- **The gate:** typecheck, and 1040 tests in 94 files, 5 new ones for this round.
- **The three browser drives** pass with no script errors.
- **The everyday set and waves 2, 3 and 4 were rerun.** Every change is a count: limits are now asked. The one headline that changed is wave 3's footbridge: its 7.8 m rails are longer than sawn timber is sold, so it is no longer passed as made.
- **The twelve folding asks fold as before.**

### Open after wave 5

- **A stair** (stringers and treads), **a truss** for the rescue bridge, **a frame of tubes** for a walker, **cloth on poles** for a tent, and **a telescoping mast** are the ways most asked for and not kept.
- **A drive** that raises, tilts or climbs, and **a thermostat** that holds what a heater warms.
- **Tipping with a person on it,** and loads that push sideways as well as down.

## Wave 6: asks said the way people say them

Five fresh testers with no context each wrote four asks, twenty in all. These were written the way people talk: context first, a sentence at a time, with what may not be used. They were:
- a hand-cranked hay bale lifter that folds flat;
- a three-sided goat shelter under snow, no part over 50 lb;
- a welding cart that must not tip on a slope;
- a pasture gate that opens for an ATV and holds against cattle;
- a pop-up school climbing frame;
- a bike trailer for two children;
- a treehouse platform on one oak;
- classroom backpack storage;
- a flood barrier that rises by itself;
- a floating dock in a tidal estuary;
- a greenhouse at −30 °C with no power or fuel;
- a market stall that stays under 32 °C in 46 °C heat;
- a camera slider that crawls at 2 mm/s;
- a foldable 7-inch drone frame;
- a ball-rolling desk clock on two AA cells;
- a stair-climbing crawler;
- a lunar lava-tube habitat module;
- an emergency shelter at 7,800 m;
- a deep-sea corer at 400 bar;
- a Martian airlock door.

| | Read | Made | Holds | Honest |
|---|---|---|---|---|
| Wave 6, first run | 0.9 | 0.3 | 0.95 | 2.1 |
| Wave 6, rejudged after the fixes below | 2.3 | 1.0 | 1.8 | 2.5 |
| Wave 6, judged a third time | 2.85 | 0.9 | 2.05 | 3.0 |
| Wave 6, judged a fourth time, after the fixes below | 3.1 | 1.05 | 2.1 | 3.05 |
| Wave 6, judged a fifth time | 3.05 | 1.2 | 2.25 | 3.0 |

### What was wrong, by cause

**Reading what people say.**
- **Context said first is read after the ask.** In "our front door floods about once a year, so I need…" and "we have a 45 cm oak and want…", the context moves behind what is asked. In "I have a 14 foot gate and I want it to swing open…", the gate is what swings.
- **Each sentence is a clause of its own.** "No grid power, no burning fuel. Panels max 12 kg each" was one clause read as electronics. Now:
  - "no power", "no electricity" and "no burning fuel" are a limit checked against what is made (it draws no power);
  - "one person assembles" and "no tools beyond a drill" are said back;
  - a figure with the few words that name it ("Snow load 2.4 kPa", "Panels max 12 kg each") is no thing asked.
- **Units as said:**
  - a plain "C" is Celsius;
  - "minus 40" keeps its sign;
  - psf, pounds of force and dB are read;
  - a cost is said back, not weighed;
  - ranges are read at their worst ("6-9 kg" as 9 kg);
  - "for at least a year" is one year.
- **What a number is of:**
  - "max", "min" and "at most" beside a number;
  - "three 30 kg kids plus an 80 kg parent";
  - "two 150 lb cylinders plus a 90 lb welder";
  - "30 cubbies for 9 kg bags", 270 kg on its shelves;
  - "for two people", now two of them;
  - stairs at 35°, climbing at 0.15 m/s, crawling at 2 mm/s;
  - an all-up mass, a drop height and a rotor size;
  - AA cells and "every minute";
  - a tide, a chop and a freeboard;
  - "3 N-m of torque" is a twist, not energy stored.
- **Words that are not what they look like:**
  - "hand-carried" is how a thing is carried, not a hand it has;
  - "tip-proof" and "freestanding" are qualities;
  - "so it won't wake me" carries no one;
  - "with a motor", said of what lifts, drives it;
  - "stays shut" is a latch not made;
  - "pitched by two people" is who puts it up;
  - "opens in under 2 minutes" is how long it takes to put up, not a door;
  - "capable of cutting" is what it does;
  - "zero hydraulic oil leakage" and "zero visible judder" are said back with what of them is weighed.
- **Who it is for:**
  - a cart, trolley or trailer with nothing said to drive it is pushed or towed: no motors, even where a towing speed is said;
  - "6 people" is a crew kept alive only in a habitat, a craft or a shelter;
  - a table for 6 seats them, three a side, and bears a person leaning, not six on its top.

**Laws added.**
- **A glazed house through a cold night with no power.**
  - Heat goes out through its glazing (NRAES-33's U for twin-wall polycarbonate), round its foot and with its leaking air.
  - Water could hold the night, but a winter day's sun is short of the whole day's loss. The greenhouse loses 211 kWh a day against the 59 kWh it gathers. To hold, its shell would need about 0.48 W/m² K, which glazing does not reach.
- **Held in against what is round it.**
  - The airlock door takes 85.5 kN, and pumping it down 20 times a day takes 256 W against the 50 W said.
  - The habitat's hoop pull is p r round a cylinder, and its least gauge is weighed against its launch mass. Its thermal swing gives E α ΔT, and the dome-floor uplift is weighed.
- **A sphere under the sea must not buckle.** Zoelly's 2E(t/R)²/√(3(1−ν²)) is taken with a knockdown of 0.25 (NASA SP-8032 gives 0.14 to 0.3). At 4 km it sets the wall: 4.15% of its radius, more than strength needs.
- **Other laws:**
  - wet-bulb cooling (Stull) for a shelter kept below the air with no power;
  - the push on a flood barrier to each jamb;
  - holding shut against cattle;
  - climbing stairs: m g v sin θ, and leaning back by h tan θ;
  - hovering on four rotors;
  - a fall from a height;
  - a slow slide's lead screw and steps;
  - a ball lifted each minute for a year against two AA cells, 9.9 Wh against 7 Wh.
  - a crew kept where it stays, about 25 m³ each and 5 kg a person a day with nothing recycled (NASA's habitable volume studies and BVAD, estimates): 100 m³ is 3.54 m of the 6 m habitat;
  - a push of so many g sideways on a frame, and the least aluminium tube that bears it: the trailer's 3 g is 1.59 kN, a 60 × 3 mm tube for each of two uprights.

**What is made.**
- **A cloth on a frame of poles, staked to the ground**, is a new way to enclose.
  - Its poles and eaves are sized for the wind said.
  - Its stakes are as many as hold it against the wind's lift, each standing in the physics as a block of what a stake holds.
  - It packs down rather than folding on hinges, and a hung flap is its way in.
  - The 12 kg market stall now weighs 4.7 kg instead of 429 kg. The 7,800 m shelter weighs 11.6 kg and stands in its wind.
  - Snow on its roof, a rigid room, or a thing named for its walls keeps a design to sheet.
- **A dock** is a decked hull, made deep and wide enough heeled with its crowd at one side and clear of half the chop.
- **A camera slider's carriage** is a light plate with its load put on it, and its rail is checked bending under it. It weighed 16.3 kg; it now weighs 5.6 kg.
- **A carriage between two posts** is sized to what it carries: 40 mm for the clock's 8 g ball, not 300. Its base is deep enough not to tip.
- **Sizes to who stands on it.**
  - Two or more people stand on about 0.3 m² a child and 0.5 m² a grown person. What carries people has deck room for them.
  - A climbing frame is as high as it may be, and any height taken is kept under a height limit said.
- **Smaller fixes:**
  - metal plates bigger than sold are said;
  - a gate's face is no longer taken for its solar panel.

**Tested in the physics.**
- **What it does is tested before it is pushed to tip it,** and let settle first. A push that tipped the pump over had left its turning tested where it fell: 0.000014 rpm, now 60.
- **A raise is pushed up steadily,** enough to rise its travel in 3 s, counting what turns on what rides. Twice its weight had flung the lift's test load 4.9 m into the air.
- **Other tests:**
  - a cart on free wheels is pushed sideways to tip it, not along its wheels;
  - a heavy door is leaned on for as long as it takes to turn.

**Honest ticks.**
- **A weight said that nothing made is tested with** is not ticked ("carries 4 kg" on the slider, before its rail was checked).
- **"Weighed below" now names something below that weighs it.** Where nothing does, it says so.

### Checked

- **The gate:** typecheck, and 1056 tests in 95 files. That includes 16 new ones in `tests/nexus/wave6.test.ts`.
- **The three browser drives** (generate, flows, fold) pass with no script errors.
- **The everyday set and waves 2, 3 and 4 were rerun.**
  - Gains: the lift and pump raise their full travel, and the pump turns. The gate and gondola now hold, and the cart with a table holds, pushed across its wheels.
  - Changes: a raft for two people carries 160 kg, not 80. The drawer's carriage is a plate, not a block.
- **The twelve folding asks fold as before.**
  - The picnic table for 6 is now 1.8 m long and holds.
  - The origami shelter is 2.1 m tall inside, a room people stand in, and so heavier.

### After the rejudge

Five fresh judges read the outputs after the fixes above, and scored them 2.3, 1.0, 1.8 and 2.5. What they found, fixed by cause:

**Ticks and counts.**
- **What a check or a law weighs is asked and counted.** A snow load, a wind, a night held warm, how long the cells last, a child climbing it: each is now an asked item, met only where the checks and laws that weigh it pass.
  - Checks and laws of one thing said are taken as one, by topic or by a figure they share, units aside (90 mph is the 145 km/h wind; 30 psf is 1.44 kPa of snow; a year is 365 days).
  - One weighed by the laws but done by nothing made is not met: the stall's "under 32 °C inside" and the slider's "crawl at 2 mm/s".
  - The greenhouse went from 2 of 3 to 2 of 8; the goat shelter from 0 of 3 to 0 of 5.
- **A tip test passes only where statics agrees.** Half a second of push is too short to show a slow topple. The tall hay lifter tilted 0.5° and passed; by statics it tips. It now stands on a base a third of its height each way.
- **A slide crosses its whole travel.** The slider passed "slides 1.2 m" on a 459 mm push. It is now pushed long enough to reach its stop, and passes only there.
- **A motor asked for is had where one is made.** The clock's "with a motor" and the "motorized" slider were ticked with nothing driving them.
- **Who assembles it, and with what tools,** are asked and not checked, not only heard.
- **A met limit is not listed** as what it cannot make.
- **A load's failure reaches what carries a weight, not every item that moves.** The cart's "Rolling" no longer fails because its cylinders tip. Whether a person can push it up its slope is no longer taken as whether it carries its load.

**Laws added or corrected.**
- **The dock heels by its section clipped at its waterline, not wall-sided.** The wall-sided formula holds only until the bottom's edge leaves the water (tan θ = 2 T / B). Solved properly, the 2.18 m dock with its crowd 1.37 m up at one side would have gone over. It is now widened until it rests at 6.55°, its low edge 620 mm above still water. The raft for two widens the same way.
- **The airlock keeps its gas.** Pumping it down to keep its gas takes V [(p₁ − p₂) − p₂ ln(p₁ / p₂)]: 227 kJ a cycle and 52.4 W for the Mars door, not 1110 kJ. "Seals against regolith" is a seal, not biology.
- **A tool worked in the sea is open to it.** The sea squeezes the corer's solid parts in bulk only (0.034% in titanium), and it wants no sphere.
- **No grid power is not no power.** The greenhouse may have power of its own. Its night law sizes the cells that would make up what the sun lacks: about 281 m² and a store for the night's 123 kWh. "No burning fuel" is a limit of its own. A greenhouse that lets no light through is not that house.
- **Open at its front, the wind gets in.** Inside, it pushes the roof up 0.63 of the wind's ½ ρ v² (0.9 of a windward wall's +0.7, EN 1991-1-4 7.2.9), not 0.2. A market stall is open at its front.
- **A shelter for goats, horses or cattle has no floor.**
- **Wood breaks at its bending strength; it does not yield.**
- **Stakes.** On paving no stake goes in, so the weights its poles' feet want are said (47 kg each for the stall). In snow or ice a peg holds little, and it says so. What holds a cloth frame square is said not weighed.
- **The welding cart.** Its deck is checked under what it carries. Cylinders 229 mm across and 1.4 m tall tip loose at 9.3°, less than its 10° slope. They are kept upright and secured (OSHA 29 CFR 1926.350), by a chain or rack not made.
- **The clock lifts its ball back to the top of its track.** The track falls about 1 in 20 (estimate), so 25 mm, not 150. What carries the ball up is counted, and the height past which its cells would not last (68 mm) is said. Its cells now last.
- **The crawler.** "150 W each" is a motor's rating, not what it draws, and "$250" is a cost. The climb sizes its cells (65.6 Wh, 262 g) and says the current and the grip it wants.
- **The drone.** It reads its 2 m drop and its 7 inch rotors. They must not overlap (251 mm motor to motor). Its motors want twice its weight (450 g each), and it says what folding into its 120 mm tube asks.
- **A child climbing it** is weighed with it empty, hung 300 mm out from its front, not as a load on it. "Tip-proof" stands on its tip checks, and corners not rounded are asked and not met.
- **A folded width is across its plan, not its thinnest way.** The trailer, unfolded, is 793 mm across, against 300 mm.
- **The habitat's ends are hemispherical**, holding p r / 2 in the same wall: 1930 kg of wall, not 1450 with flat ends. Its launch loads are said not weighed.
- **Altitude.** High up, the air is said by its pressure (0.36 of the sea's at 7,800 m); its density waits for how cold it is.

**Reading.**
- **The treehouse.** The kids were counted twice: once in "for three 30 kg kids" and again from their weights, so "7 on it". "No more than two bolts through the trunk" is a limit. Binding where it must sway is not checked. The tree and the 750 mm hole for its trunk are said not made.
- **"For three 30 kg kids"** is what it carries, done where what carries it bears it.

### Checked

- **The gate:** typecheck, and 1072 tests in 95 files. That includes 16 new ones in `tests/nexus/wave6.test.ts`, 32 in all.
- **The three browser drives** pass with no script errors. The flows drive's first run timed out on one click while the generate drive had just loaded the machine; run again alone, all ten of its steps passed.
- **The everyday set and waves 2, 3 and 4 were rerun.** The changes are counts, and one law:
  - limits weighed by checks are now asked;
  - the raft for two is wider, its bottom now pieced;
  - the cattle gate's "does not bend or break" is no longer ticked, since nothing made is run against the 5600 J hit.
- **The twelve folding asks fold as before.** The origami shelter counts its wind.

### After wave 6 was judged a third time

Five more fresh judges read the outputs, scoring them 2.85, 0.9, 2.05 and 3.0. Every figure they re-derived came out as printed. What they marked down was what is not made or not weighed, and the ticks that rested on it. Fixed by cause:

**Ticks and counts.**
- **A limit said in what it does is not asked twice when its units differ.** "Under 6 inches thick" and "it folds flat to 152 mm" are one thing.
- **A budget is a cost, not a thing to make.**
- **"30 cubbies" is not ticked** where their dividers are not made.
- **"Footprint under 0.5 m by 3 m" is a limit,** and checked.
- **A towed cart with no hitch made is not towed.** Its plan says "pushed by hand or towed".
- **"Not tip on a 10° slope" fails where its load tips on it.**
- **The airlock has two verdicts,** one for its door and one for what pumping its lock down draws.
- **Limits heard as checked are said unchecked** where nothing is made.

**Laws added or corrected.**
- **The welding cart** is sized for its two cylinders side by side. On its slope it tips the worse way of across its track and along its wheelbase (12.4° along).
- **A deck people stand on rests on cross frames,** close enough that one person between two of them bends it within 1/150 of that. Where none are made, it says it wants them.
  - The dock's 12 mm deck across 2.88 m sagged 453 mm under one person; on 7 frames 553 mm apart it bends 3.2 mm.
  - The raft for two now holds.
- **A cloth frame is worked consistently with what holds it.**
  - Its poles are held at their feet alone (M = w H² / 2), and the sockets that hold them so are said not made.
  - Its eaves take the roof's lift and the inward pull of its cloth (T = p s² / 8 f, sagging a tenth of its span, estimate).
  - The stall's poles become 40 mm and it still holds at 8.6 kg.
  - The Everest shelter's poles become 89 mm, and at 26.3 kg it leaves too little of its 35 kg for what is not made. It says so.
- **A roof on four walls is a plate held round its edges,** bending mostly across its shorter way (Roark Table 11.4). The greenhouse's roof is 31.9 MPa across its 4 m, sagging 392 mm against 16 mm.
- **A tiny geared motor pulsed each minute** does about 0.05 of the lifting, not 0.2 (estimate). The clock's cells no longer last: 9.9 Wh against 7. Lifted no more than 17 mm each time, they would.
- **The habitat.**
  - It is as long as its crew want (3.54 m, 1530 kg of wall).
  - Its launch at about 5 g presses its wall 7.8 MPa against the 12.8 MPa it buckles at (NASA SP-8007 knockdown, estimate).
  - A uniform swing of its temperature stresses no wall free to grow.
- **The airlock's door leaf** is about 11.5 mm of 6061-T6 (Roark), and its seal's land takes 16.4 kN a metre. On Mars a day is a sol, so the pump-down draws 51 W.
- **The gate:**
  - says its push bends it 54.6 mm;
  - is latched at its far end to a post set in the ground;
  - its latch pin and its posts are checked;
  - "stay shut when cattle lean on it" is now done.
- **The treehouse's side panels** are checked for buckling. That they stand square only while their joints with the top hold is said.
- **Smaller corrections:**
  - the crawler's current goes through its converter (1.64 A);
  - the drone's arm is bent at its root by 0.556 N·m at full throttle;
  - a child pulling outward at the storage's top tips it at 298 N.

**Reading.**
- **", needs no power or batteries"** is a clause of its own.
- **A tree's trunk said** is the tree it is built at, not a number unused.
- **A payload with a weight** is what it carries, not electronics it must make.
- **The cold at 7,800 m** is said to weigh only the air, not the cloth.
- **Ways not drawn** read "not drawn: …; nor …", so a gate is no longer taken for the shelter's door.

**Checked.**
- **The gate:** typecheck, and 1079 tests in 95 files. That includes 39 in `tests/nexus/wave6.test.ts`.
- **The three browser drives** pass with no script errors. The generate drive's first run timed out on its first click while five judges were working the machine; run again alone, it passed.

**Judged a fourth time.** Five more fresh judges, each given four outputs and nothing else, scored 3.1, 1.05, 2.1 and 3.05. All four scores are up. Again every printed figure they re-derived came out right. What they marked down:
- what is still not made: the crank, the actuator, the mooring, the cubbies' dividers;
- ticks resting on what is not made, or on a load spread more kindly than it falls.

### After wave 6 was judged a fourth time

The fourth judges found again that the figures were right. They marked down what was not made, and ticks resting on it. Fixed by cause:

**The verdict.**
- **"Does not hold" now means a load breaks it.** Where only a limit is missed (a size, a weight, how it packs, whether it folds), the headline reads "what is made holds, but not to all its limits".

**Made where nothing was.**
- **A frame of a thing is that thing, made as its frame.** "A quadcopter frame" is now made as a hub and four arms, its motors, rotors and battery carried as weights:
  - its 7-inch rotors as said, motors 138 mm out, so each clears the next by a tenth of a rotor;
  - 12 × 4 mm carbon arms bearing full throttle (twice its share of all it lifts) within a hundredth of their length;
  - 61 g against its 140 g.
  - Its 2 m drop is weighed: 17.7 J landed, against what its arms can bend away elastically (σ² V / 18 E, 7.5 J for all four). An arm breaks unless what it lands on takes the rest.
  - A tube it must go into is checked against its folded cross-section's diagonal, not its width as made. Its arms do not yet fold.
- **What is towed is a deck slung between two wheels, with a tow arm and a hitch.**
  - Its axle is set back so a tenth of it rests on its hitch (estimate).
  - Its tow arm bears that share and braking at half of g.
  - Its wheels are set out until a 5 m turn at its speed tips it at no less than 1.5 times what pulls it (v² / r against g track / 2 h).
  - At road speed its wheels are 20-inch discs of 3 mm aluminium; their tyres are said not made.
  - The bicycle trailer is 13.9 kg against 14.
- **Compartments are divided.**
  - "30 cubbies" makes dividers standing between each shelf and the next, carrying the shelf over them; each row has a shelf under it and over it.
  - Its shelves are sized for a child standing on one between two dividers.
  - Where a child pulling back from its top would tip it, a steel plate in its foot gives the weight it lacks (freestanding, 490 mm deep, it wants 152 kg).
  - The storage does 7 of 8 and holds.
- **A lifter said to hang on the wall is screwed to it.** It stands on no base of its own: 10.6 kg, not 95.

**Laws added or corrected.**
- **The habitat's ends are counted in its room.** Two hemispherical ends 6 m across hold 113 m³, more than the 100 m³ its crew want, so it is a sphere.
- **Launch buckling** uses SP-8007's own knockdown, γ = 1 − 0.901 (1 − e^−φ) (0.224 here), with NASA-STD-5001's factor of 1.4 for metal flight structures. Its wall is thickened to 3.2 mm until it stands.
- **The airlock's leaf** is sized three ways, and the greatest is kept:
  - its yield (11.5 mm, sagging 27 mm);
  - 13,400 pushes a Mars year under the 96.5 MPa 6061-T6 bears 5 × 10⁸ times (ASM): 15.8 mm;
  - a sag of a hundredth of its width for its seal to seat: 17.3 mm.
  - Its pump draws 755 W while it pumps, and 51 W only on average.
- **A flood flap that rises on its own is weighed.**
  - A hollow flap of 3 mm aluminium weighs 12.3 kg. Water 50 mm deep in its recess holds it up with 31.5 kg, so it floats up. It stands upright once the water is 346 mm deep.
  - Hinged at its sill it takes no turning there: stops at its sides take its push.
- **A gate leant on** has the push borne by the two rails nearest it, not all five alike.
- **"Swing open on its own"** is not done where no drive is made. For one unpowered, what is missing is said as a spring, a weight or aslant hinges.
- **Five cloudy days** are weighed in the cells of the ram that would open it: 100 Wh.
- **A hand crank is weighed.** The lifter wants no gearing, 17.5 turns, and a ratchet to hold it.
- **The clock** lifts only as far as its cells allow, 15 mm along its track, so they last its year.
- **A deck person's weight** spreads only as wide as the deck spans (the dock now rests on 12 frames).
- **Guide piles** are not offered where piles are ruled out; the gangway to the shore is said.
- **High up**, people at the edge and a lean at the top are weighed together. The treehouse platform tips: 763 N·m against 532.
- **Put up by so many people:** no part heavier than they lift together (two-thirds of 16 kg each, HSE L23; estimate).

**Ticks and counts.**
- **A wind it must survive is not ticked** where its poles are held by sockets not made, or its pegs are in snow.
- **Stakes are counted** as 30 g pegs against what it may weigh. The block standing for their grip is said not to be a weight it has.
- **An assumed door is said as assumed**, not as something asked.
- **"Zero visible judder" and a loudness in dB are counted** among what was asked.
- **A size read from a limit it must be under** is made 10 mm under it.
- **Where the laws are shown apart**, as on the command line, the reading no longer repeats them.

**Checked.**
- **The gate:** typecheck, and 1088 tests in 95 files. That includes 48 in `tests/nexus/wave6.test.ts`.
- **The three browser drives** pass with no script errors.
- **The 74 asks of the everyday set and waves 2, 3 and 4 were rerun.** Two headlines changed:
  - a scissor-lift whose only failure is its packed size now reads "holds, but not to all its limits";
  - the cattle-race gate no longer ticks "swings shut by itself", since nothing made shuts it.
- **The twelve folding asks fold as before.** One headline's wording moved the same way.

### After wave 6 was judged a fifth time

Made and holds rose again; read and honest held. The fifth judges again re-derived the figures and found them right. They found the laws thin where a part's own working was left out. Fixed by cause:

**Laws added or corrected.**
- **A flap that rises on its own** now lifts off when its weight is met by the water in its recess (19.5 mm deep for a 12.3 kg flap, ρ L W), and a latch freed by a float holds it down until the water outside is 50 mm up. Floated, the whole flap is under water (50.4 kg of lift, ρ L W T). It stands upright at 346 mm, where its buoyancy's turning about its hinge meets its weight's. Its skins want ribs no more than 287 mm apart to sag no more than their 3 mm (Roark); the ribs are said, not made.
- **A gate leant on near one end** puts nearly the whole push on the post there, not half on each. Its posts and the concrete they stand in are sized for that: 59 mm posts at 109 MPa, a 900 mm cube at the latch post.
- **The habitat's room** is now what is held at pressure, not only what is lived in. Its crew want 100 m³ to live in. The ISS holds 388 m³ habitable in 916 m³ pressurized, so this crew want 236 m³ at pressure, a cylinder 4.35 m long between its ends, 1770 kg of wall. What is left for all that goes in it is said.
- **Two AA cells driving a motor in pulses** hold about 3 Wh each, not 3.5. The clock lifts 12 mm along its track (1 in 41.7) so they last its year.
- **A quadcopter's arms** are sized three ways: by their yield at full throttle, by a sag of a hundredth of their length, and so that they ring above 1.25 times their rotors' hover speed. The arms are now 14 × 8 mm. Its drop is ticked only where one arm alone takes what it lands with.
- **A corer** is weighed: the core it holds (2 kg of mud at 1600 kg/m³ in a 60 mm bore), and the push to drive it in and pull it out against the friction on its wall (τ about 2 kPa, estimate).
- **A greenhouse that cannot hold its warmth bare** is not said impossible where night curtains and triple walls might keep it: it says "might", and why.
- **A dock's chop** is weighed only as a still crest, so it is not ticked.
- **A shelf a child climbs** is sized for them. Where they would tip it, a steel plate low in it gives the weight it lacks. The plate, and the dividers that make the cubbies, are said among the choices.

**Made where it was not.**
- **A trailer's wheels** are set out with room for their tyres, and its stub axles are checked.
- **A cart's fore-aft tip** is weighed with what it carries where it stands, not midway.
- **A lifter hung on a wall is screwed to it.** Its posts buckle only between their screws (600 mm apart, estimate), and they bear the push of a carriage held out from the wall on its rollers. Its carriage bears being held out from them as well as its span between them. Its carriage holds a 55 lb hay bale (910 × 460 × 360 mm, ×1.1). It is 12.5 kg.

**Ticks and counts.**
- **A limit only derived** ("no part heavier than its two people lift") is said, but not counted as asked.
- **A slider's travel** is asked and ticked. Its feet, carriage, bearings and camera mount are said not made.
- **What a frame lifts** is borne by its arms, not counted as a limit failed. A payload said to ride on it is carried.

**Reading, from the first run of wave 7.**
- "A design for X" is read as X.
- "I want to build an X" is read as an X.
- A word that is only a greeting, a pronoun or the word "design" is never taken as the name of the thing.
- A frame, chassis, hull or housing of something is that thing, made as its frame.
- "My X lives in ..." is context, not a thing to make.
- Sleds and pulks are carts.

**Checked.**
- **The gate:** typecheck, and 1088 tests in 95 files.
- **The twenty wave-6 asks** were rerun after the fixes. The lifter is 12.5 kg. The frame's headline is "does not hold": landed on one arm first, an arm breaks.

### Open after wave 6

- **Ways most asked for and not kept:** a stair, a truss, a frame of tubes, a telescoping mast, a drive that raises or climbs, a thermostat, tracks. A latch and the post it closes on are now made for a framed gate.
- **A frame braced by cloth:** what holds a cloth shelter square is not weighed.
- **Reading a clause split by "than"** ("no more than two bolts") is mended where it is read, not in the parser.
- **Folding arms up a quarter turn at a hub's edge,** so a frame goes into a tube: the fold engine half-turns parts lying in line, and the drone's arms are longer than its hub.
- **What widens a base by law** for something high up that a crowd and a lean together tip (the treehouse platform): it says so, but does not yet draw itself wider.
- **A spoked wheel and its tyre,** and a crank, drum, ratchet and rope: weighed, not made.
