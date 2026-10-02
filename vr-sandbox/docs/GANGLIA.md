# Ego's ganglia

What Ego knows, kept as data she can reason with (`src/ganglia/`). Nothing in it is a guess dressed as a fact:
every entry says where it comes from, and every entry is tested against something outside itself.

| Kind | What it is | Held to | Where |
|---|---|---|---|
| Law | An equation of the world that runs (SI in, SI out), with where it holds | reproduces a worked example computed independently | `laws.ts` |
| Process | How a feature is made (sawn, drilled, tapped, bored, bent, welded…) and the limits of making it | its numbers are the trade's (tap drills, thread engagement, bend radii) | `processes.ts` |
| Part | A thing you can buy, as its maker publishes it, with price and date where known | agrees with itself by the laws relating its figures (`lintCatalog`) | `parts.ts`, `data/motors.ts`, `data/batteries.ts` |
| Workflow | An engineer's procedure: what to ask, which laws in what order, which catalogue to choose from | reaches the answer worked by hand | `workflows.ts` |
| Material, joint, shape | The world's own materials, joint kinds and stock shapes, each already sourced | the world's own tests | `data/materials.ts`, `connectors/registry.ts`, `parts/registry.ts` |
| Machine | A machine broken down assembly by assembly: each node published by its maker (with where) or marked not published | every node is one or the other | `machines.ts` |
| Block | A building block, known by what it does (an energy store, a rotary actuator, a speed reducer, a rotary support, a fuse...): the flows it takes and gives, its typed ports, its anatomy piece by piece | every catalogued part of its family has finite port ratings; every anatomy law exists | `blocks.ts` |
| Principle | Why something is done the way it is: the rule, the physical reason, the laws behind it, what it governs, where this world showed it | every law it cites exists; every check names one | `principles.ts` |
| Way | A physical way to turn one flow into another (a working principle): its effect, laws, what it pushes against, and the blocks that do it | every law and block it names exists | `ways.ts` |

## Known by what it is, not who makes it

Nothing is stored by brand. A part's id and label are its function and its standard designation: `bearing.dgbb.6205` (ISO 15 boundary dimensions), `chain.roller.ansi-40`, `motor.dc.coreless.d40-150w-24v`, `fuse.blade-ato.30a` (ISO 8820-3). Makers appear only as provenance, in the source a figure was taken from and the price where it was seen, so asking for a part by its maker's name still finds it. Old brand ids still resolve (`currentId`), so saved builds open.

## How it is kept right

- **Dimensions**: every law is checked for dimensional consistency. Change the size of any base unit (mass, length, time, current, temperature) and its output must rescale exactly as its dimension says. A misplaced power (d² for d³) fails this. Constants a law uses (g, σ, copper's α) are declared with their units so they are checked too (`units.ts`, `Law.constants`).
- **Validity**: a law used beyond what it holds for says so. Examples: a bearing past half its rating, a strut stocky enough for Johnson rather than Euler, a spring index outside 4 to 12, a thick-walled tube. The caution goes into the workflow's trace and its warnings (`Law.outside`).
- **Sources** say what kind they are (`standard`, `maker`, `textbook`, `handbook`, `distributor`, `rule of thumb`).
- **Self-consistency** of every catalogued part (`lintCatalog`). One check is that a continuous carbon fibre's strength is near its modulus times its strain at break, because it stays linear until it fails.

## Reasoning beyond running a law

- **Inverse** (`solveFor`): any one input from the others and the output wanted ("what diameter gives 30 MPa?"). It brackets the root on a log scale and bisects it, so no per-law algebra is needed.
- **Sensitivity and uncertainty** (`sensitivity`, `uncertainty`): what an answer hangs on (a shaft's stress goes as d⁻³), and how ±x% inputs carry into it, independent (root sum of squares) and worst case.
- **Show the work** (`showWork`): a workflow's trace as a derivation. Each line gives the law, its formula and the numbers that went in with their units and readable prefixes, ending in what came out.
- **One graph** (`graph.ts`): every piece of knowledge is a node, and every relation a typed edge:
  - `uses`, `choosesFrom`, `ratedBy`, `fittedBy`, `madeBy`, `works`, `runs`, `feeds`;
  - no edge may dangle;
  - `path` says how two things relate.

## Designs of blocks, checked

A design is blocks wired port to port, each connection carrying what passes through it (volts, amps, torque, force), electrical ones made by a wire and protected by a fuse (`Link.via`). `checkDesign` checks every connection and names the principle each problem breaks:

- the supply within what each part takes, at its charged voltage (a controller passes on what it is fed);
- the current within each wire's rating, and within each motor's continuous rating (beyond it, a warning: bursts only);
- a fuse at the battery, above 125% of the load and below the wire's rating;
- a controller without a current limit on a motor whose stall current is past its peak;
- a gearhead made to fit its motor;
- a shaft in its bore: up to a coupling's largest bore, exactly a bearing's;
- a coupling's torque with a 1.5 service factor;
- no radial load on a gearhead's output bearings;
- every static rating, and a made shaft's torque at half its yield.

`designFromPowertrain` turns the drivetrain workflow's answer into such a design: the kart's holds at every connection, with one warning, that its motors take 24 A only in bursts.

## Fast

- **Recall** is a BM25F index built once:
  - names weigh 3, tags 2, text 1;
  - it expands synonyms (aluminium/aluminum, cable/wire, axle/shaft, gearbox/gearhead…), stems words and matches prefixes;
  - it joins two words said apart ("mark forged" → Markforged);
  - a numbered id ("6205", "fx10") names its entry outright.
  - It answers in well under a millisecond.
- **Answers are remembered** (`solve`): a question's fingerprint is its workflow and its spec with keys sorted, hashed. Asked again, in any order of words, the same answer comes back at once.

## What's in it

- **Laws (81)**, grouped by area (also: the Lorentz force, magnetic pull across a gap, electrostatic pull, piezo stroke, the ideal thrust of a rotor, the force from a power screw, Johnson columns, natural frequency, centripetal force, inertia of discs and rods, parallel axis, rotational energy, free fall, spring energy, hoop stress, fillet weld shear, bolt torque by nut factor, belt speed, Reynolds, Darcy-Weisbach, thermal resistance, the rule of mixtures along and across fibres, sinter scale-up):
  - Mechanics: Newton, weight, friction, rolling resistance, grade, drag, power, wheel torque, traction, energy, braking, cornering, pendulum.
  - Structures and materials: axial and bending stress, Hooke, beam sag, cantilever, Euler buckling, torsion, twist, von Mises, static shaft diameter, expansion, the endurance limit of steel.
  - Machine elements: ISO 281 bearing life in revolutions and hours, spring rate, capstan, chain speed and pull, torque through a gear train.
  - Electrical: Ohm, Joule, wire resistance, copper's temperature coefficient, voltage drop, motor torque, back-EMF, current, mechanical time constant, lead-acid open-circuit voltage, electrical energy.
  - Thermal: convection, conduction, radiation, heat capacity, lumped time constant, thermal resistance networks.
  - Fluids: buoyancy, hydrostatic pressure.
- **Processes (16)**: sawing, drilling, tapping, boring, split clamps, turning, milling, bending sheet, MIG welding, soldering, gluing, wood screws, crimping terminals, fitting bearings, continuous fibre fabrication (CFF) printing, metal FFF (print, wash, sinter).
- **Machines**: an industrial continuous-fibre composite printer (figures from the Markforged FX10), broken down into frame and heated chamber, motion system, composite print engine (plastic and fibre nozzles, optical sensors), Metal Kit (swappable head, feed tubes, pre-extruders, heated bed), build plate, Vision Module and laser micrometer, material drawer, electronics and software. It also lists the materials it prints with (Onyx, continuous carbon fibre, carbon fibre FR) from Markforged's datasheet.
- **Parts (bought)**, by function and standard:
  - deep groove ball bearings 608, 6004, 6005, 6202 to 6206, and a UCP205 pillow block unit;
  - ANSI 35, 40 and 41 roller chain;
  - jaw couplings from 3 to 47 N·m;
  - an M8 rod end (ISO 12240-4);
  - a one-channel brushed DC driver without current limit, and a two-channel controller with one;
  - ISO 8820-3 blade fuses, 10 to 40 A;
  - the world's motors (a Ø40 mm 150 W coreless DC motor and a Ø100 mm 250 W brushed one), its 12:1 planetary gearhead, its 12 V 7 Ah sealed lead-acid battery and its wire (10 to 18 AWG).
- **Blocks (16)**: energy store, motor controller, conductor, rotary actuator, speed reducer, shaft coupling, chain drive, rotary support, two-force link, printing material, shaft, wheel, frame member, whole machine, fuse, guard. Each opens into its anatomy: a DC motor into its magnets, winding (the Lorentz force), commutator and brushes, back-EMF, shaft, bearings and housing; a battery into its cells, plates, electrolyte, case, valve and terminals.
- **Principles (44, in 18 kinds)**: load path, determinacy, strength margin, stiffness, fatigue, stress concentration, stability, materials, fits and tolerances, manufacturing, assembly, service, thermal, electrical, safety, cost and mass, standard parts, motion. From Pahl & Beitz, Boothroyd & Dewhurst, Shigley, Peterson, SKF, ABYC and the NEC, ISO 12100, MIL-STD-889. Where this world showed one, it says so: the kart's broken gearhead shafts are why the gearhead takes torque, not load.
- **Ways (22)**: rotary and hub motors, linear motors, voice coils, solenoids, piezo stacks, electrostatic actuators, resistive heating and thermal actuators, electric thrusters; gears, chains and belts; wheels, tracks, legs, propellers, paddles, winches, racks; lead screws and cranks.
- **Workflows (10)**:
  - a whole drivetrain from one sentence;
  - choosing a vehicle drive;
  - sizing a wire, a battery pack, a shaft;
  - choosing a bearing, a coupling, a controller, a fuse;
  - sizing a torque arm.

## How Ego uses it

Ask in plain words, in the headset or on her page:

- *"Design the whole drivetrain for a 120 kg kart at 3 m/s"* gives the motors, gearheads, pack, controller and its current limit, wire gauge, couplings, torque-arm rod ends, wheel bearings and the axle diameter. Each part is sized from the others' numbers, then counted and priced.
- *"Size a wire for 20 A over 3 m at 24 V"*, *"which bearing for 500 N at 600 rpm on a 25 mm shaft"*, *"size a shaft for 20 Nm and 30 Nm bending"*: one workflow each.
- *"Tell me about rolling resistance"*, *"how do I tap a thread"*, *"what is 6061"*: recall, with the source.
- *"What do you know?"*: how much she knows, by kind.
- *"Show your work"*: her last answer, law by law with the numbers. *"What does it depend on?"*: what it hangs on most.
- *"Break down the Markforged FX10"*: the machine, assembly by assembly, with what its maker doesn't detail said plainly.
- *"Why use a torque arm?"*, *"why are bearings press fit?"*, *"why fuse at the battery?"*: the principle, its reason, the laws behind it, where it comes from. *"Design principles"* lists them by kind; *"principles of fits and tolerances"* gives one kind.
- *"How do I turn electricity into motion?"*: every way physics allows, grouped by what it pushes against (the ground, a fluid, a rail, a rope, mass it throws away), which she can build now and which are possible but not catalogued yet. The one thing they all need is a transducer, a motor in the widest sense. Seen whole, any of them is one converter: a kart is a motor for travel.
- *"What building blocks do you have?"*: every block, and how many catalogued parts each has.
- She reads any units: *"a drive for a 265 lb kart at 8 mph on 10 in wheels"*, *"a wire for 30 amps over 10 ft at 12 V"*, *"a bearing for 112 lbf at 600 rpm on a 1 in shaft"*.

Every answer from a workflow ends with the laws it applied. What wasn't said takes the workflow's default, and she says which defaults she took. The whole trace (each law, its inputs, its output) stays on `ego.lastWorked`.

This is the fast path: a workflow answers in microseconds with closed-form engineering, and the test stand only
has to prove what it chose. It is also where alternatives come from: every workflow returns the other workable
answers and what each trades.

## Adding knowledge

1. **A law** goes in `LAWS` with:
   - its inputs and output, in SI;
   - `valid`: where it holds and what it leaves out;
   - a source;
   - a worked example computed outside the code (by hand, or in a separate script).

   If the world already runs it, call the world's function and name it in `implementedIn`. That keeps reasoning and physics one thing.
2. **A part** goes in its family with the maker's figures in SI, its source (URL where there is one) and, if known, its price with where and when it was seen. If its family has relations between its figures, add them to `lintItem`. That is how the 12 V winding's order number on the 24 V winding's data was caught: the label's voltage against the data's.
3. **A process** states what it makes, from what, with what tools, and its limits as rules a design must keep. Any number a design is checked against becomes a function next to it (`tapDrill`, `threadEngagement`, `minBendRatio`).
4. **A workflow**:
   - asks for what it needs, giving a default where a sensible one exists;
   - applies laws through `step` so they are traced;
   - chooses only from catalogued parts;
   - returns its choice, its alternatives and its warnings;
   - has a test that reaches the hand-worked answer.

`tests/unit/ganglia.test.ts` holds all of this. A law that stops reproducing its example, a part that stops agreeing with itself, or a workflow that stops reaching the hand-worked answer fails the build.
