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
