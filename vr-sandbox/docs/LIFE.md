# Life: things that run, move and sense, at scale

Status: step 1 built (`signature`, `afford`, `src/nexus/aware/tags.ts`); the rest planned.

## Contents
1. What is wanted
2. The problem in numbers
3. The tricks
4. Signatures: what a thing gives off, read from what it is
5. Affordances: what a thing lets you do, read from its shape
6. Senses and awareness: who notices what
7. Agents: intent to motion
8. Running logic: from transistors to programs
9. Running machines: an engine that drives
10. Time, energy and level of detail
11. Nodes
12. Steps
13. Measures
14. Limits
15. What exists to build on

## 1. What is wanted

The user, 2026-10-27:

> "large scale operation like actually building and running 36 million transistors resistors actually running a real engine that actually will move thing like actually giving things life energy time meaning people driving cars walking dogs opening doors grabbing things I wanna see what trick can we find for this maybe there's a node system like proximity nodes where based off of its material or size you can automatically calculate its field of view proximity and tag it this idea but wayyyy more advanced"

## 2. The problem in numbers

| Thing | Count | Naive cost |
| --- | --- | --- |
| A processor's transistors | 36 million | 36 M nodes stepped at picoseconds: years of computing per second of run |
| Every pair of things that might notice each other, in a block of 10,000 | 50 million pairs | each checked every frame |
| A car's engine, firing | 4 cylinders, 6,000 rpm | 100 firing events a second, each a pressure curve |
| People, dogs, cars in a city | 10⁵ | each planning, sensing, moving |

None of it runs if every part is simulated at its finest, all the time. Each trick below makes the cost follow what changes and what is looked at, not what exists.

## 3. The tricks

| # | Trick | What it does | Saves |
| --- | --- | --- | --- |
| T1 | Characterise once, instance forever | A cell (a NAND, an SRAM bit, a door hinge) is solved once at its finest (transistor currents, contact forces). Its behaviour is kept as a small model (a truth table and its delays, a torque curve) and every copy uses the model. | 36 M transistors become about 40 cell types solved once |
| T2 | Proven equivalence | The fast model is checked against the fine one by running both in lockstep on random and recorded inputs. A difference is a finding, never hidden. | Trust in the fast model without running the slow one |
| T3 | Fidelity where it is looked at | What is zoomed into, touched or measured runs at its finest; the rest at the coarsest level that is still equivalent for what it drives. Promotion and demotion carry state across. | Only what is watched is expensive |
| T4 | Event-driven | Only what changes is computed: a net that toggles, a body that moves, a sense that receives. A thing at rest sleeps until something reaches it. | Cost follows activity, typically 1 % of a circuit per clock |
| T5 | Bit-parallel and GPU | 32 copies of a gate (or 32 test vectors) in one machine word; whole layers of gates in one WebGPU dispatch. | 30× to 1000× on logic |
| T6 | Many clocks | Each kind of thing ticks at its own rate (logic in ns, a crank in 0.1 ms, a body in 1 ms, a mind in 100 ms, traffic in 1 s). They meet only at the moments one must hear another. | No fast tick forced on slow things |
| T7 | Signatures, not pairs | Each thing works out once what it gives off (light, sound, heat, smell, motion) and how far each carries. Each sense works out how far it reaches. Only pairs inside both are ever tried, found by a spatial hash. | 50 M pairs become the few thousand that can notice each other |
| T8 | Affordances from geometry | What a thing lets you do (grasp, sit, open, push, walk on, climb) is read from its size, mass, shape, joints and material, never tagged by hand, and kept with it. | Agents act on anything, unseen before |
| T9 | Behaviour stand-ins | A far crowd moves as a density flow, near people as agents, a touched person as physics bodies, as rendering uses a pyramid of stand-ins. | 10⁵ agents at the cost of the few near |
| T10 | Energy as the currency | Every motion draws from a store (fuel, battery, food) through a chain of efficiencies. A store that empties stops what it powers. The whole is checked for conservation. | Life that runs down, recharges, and can be trusted |
| T11 | Deterministic and recorded | Everything seeded; every run recordable and scrubbed on T. A run is replayed exactly, and a finding is reproduced. | Debugging and proof at scale |

## 4. Signatures: what a thing gives off

Each signature is read from what the thing already states (shape, size, material, `hot`, `travel`, its motors). Every figure is sourced or labelled typical.

| Carrier | Read from | How far it carries |
| --- | --- | --- |
| Light it reflects | Projected area, albedo by material and finish | Where its angular size is above the observer's acuity (about 1 arcminute for the human eye) and its contrast above threshold |
| Light it emits | Lamps, screens, flames | Inverse square, against ambient light |
| Sound | Motors, engines (firing rate), impacts (mass and speed), footsteps (gait), voice | Sound power level less spreading (6 dB per doubling of distance) and air absorption, against the background level |
| Heat | `hot`, the heat model already in the rules | Felt by skin within its fall-off; seen by an infrared sense |
| Smell | Fuel, food, animals (a source rate) | Diffusion and drift with the wind, against the sense's threshold |
| Motion | Speed, size | Peripheral vision answers motion more than form |
| Touch | Contact (the physics) | Only what touches |

A signature is cached with the thing, keyed like any node result, and changes only when the thing does.

## 5. Affordances: what a thing lets you do

Each affordance is read from geometry, mass, joints and material, against the actor's own body (its hand, its reach, its strength), so a child and an adult see different affordances in the same chair.

| Affordance | Read from |
| --- | --- |
| Grasp | A part whose width fits the hand's aperture (a power grip about 20–50 mm, a pinch below), and whose mass is within the actor's lift. A handle is found as a bar it can close round. |
| Lift, carry | The whole's mass and size against the actor's strength and reach |
| Open, close | A joint (hinge, slide) with a handle within reach; the force from the joint's spring and friction |
| Turn | A knob or a key: a round part on an axis |
| Push, pull | Mass, friction (`surfaceOf`), whether it is fixed |
| Sit | A horizontal surface about 0.4–0.5 m up, deep and wide enough, held up |
| Walk on, climb | A surface's slope and step height against the actor's legs |
| Drive | A seat facing a wheel and pedals: a vehicle's controls |
| Hot, sharp, heavy, fragile | Kept away from: `hot`, edge radius, mass, material (glass) |

## 6. Senses and awareness: who notices what

- **Senses:** an observer is the senses it has (`perceive.ts`): eyes with a field of view, acuity and a direction, ears, skin, nose.
- **Awareness:** what reaches its senses. A spatial hash holds every signature by its reach. A sense asks only the cells its own reach covers (T7).
- **Line of sight:** sight is blocked by what is between, using the same raycasts the heat model uses for shielding.
- **Attention:** what is noticed is ranked by salience: how strong it is over its threshold, how new it is, and whether it matters to what the agent is doing. Only the top few are attended.
- **The node:** `sense`. It shows each observer's field of view as a cone, and what it notices, each with why: which carrier, how strong, how far.

## 7. Agents: intent to motion

- **Intent:** a goal (walk the dog, drive to work, get a drink), broken into tasks by what the world affords: to go out, open the door; to open it, reach the handle, grasp it, pull.
- **Planning:** over affordances and places, with the routing search from step 4 for the way, and the placement maps for where to stand.
- **Motion:** each task is driven by motion primitives (reach, grasp, step, sit, turn a wheel), kinematic where nothing touches and physical where something does (T3).
- **Bodies:** people as `person.ts` builds them; animals as `creatures.ts` (gait by the Froude number); vehicles as `machines.ts`.
- **A dog on a lead:** two agents joined by a rope. Each follows its own goal, and the lead's tension pulls them together.

## 8. Running logic: from transistors to programs

- **Cells:**
  - every cell type `computer.ts` draws (NAND, NOR, inverter, SRAM bit, flip-flop) is solved once at switch level;
  - each transistor is a conductance set by its gate's voltage (the process's figures);
  - out of that come the cell's truth table, delays and switching energy (T1).
- **Netlists:** a design is a netlist of cells.
  - Real ones exist and are public. The MOS 6502 (3,510 transistors, extracted from the die by the Visual 6502 project) is the first.
  - Next, a RISC-V core described in open hardware languages, synthesised to cells.
- **Running:**
  - the netlist runs event-driven, bit-parallel and on the GPU (T4, T5);
  - its fast model is checked against the switch-level model (T2);
  - what is zoomed into runs at switch level, its transistors lit as they conduct (T3).
- **Scale:**
  - 36 million transistors is about 9 million gates. At about 1 % activity a clock, a GPU runs it at thousands of clocks a second. That is an estimate, to be measured.
  - Real time for a full modern chip is not possible here, and this will say so with the measured rate.
- **A program:** the 6502 runs a real program (its own reset vector, a loop that counts), cycle by cycle, the same as an emulator would (T2).

## 9. Running machines: an engine that drives

- **The engine:**
  - each cylinder's pressure through its cycle, from its compression ratio and a burn curve (Wiebe, its constants typical), on its piston, through its rod and crank (the parts `engines.ts` builds and `loads.ts` loads);
  - out of that comes torque at the crank, each firing (T6: the crank's own fast clock);
  - its fuel is drawn from the tank (T10).
- **The drivetrain:** torque through the gearbox and final drive `drivetrain.ts` builds, to the wheels.
- **The car:** wheels rolling on the physics engine (`rollingOf`) with the tyres' grip.
- **The driver:** an agent with throttle, brake, steering and gear, following a route with the step 4 search on roads. It keeps its lane and stops at lights (Follow a path exists).
- **Its fidelity:**
  - looked at closely, the engine's parts move: pistons, rods, crank, valves;
  - far off, a torque curve stands in (T3, T9).

## 10. Time, energy and level of detail

- **Clocks:** each kind of thing declares its rate. The board's clock (T) carries them, and a slow thing never ticks for a fast one (T6).
- **Sleep:** a thing at rest sleeps; a signature or a contact reaching it wakes it (T4).
- **Energy:** every actuator names its store and its efficiency chain; time moves energy; a conservation check runs over the whole (T10).
- **Level of detail:**
  - for logic: switch, gate, register-transfer, instruction set;
  - for bodies: physics, kinematic, flow;
  - for engines: parts moving, cylinder pressures, torque curve.
- **Moving between levels:** promotion and demotion carry state, and every level says which it is at.

## 11. Nodes

| Node | Layer | Does |
| --- | --- | --- |
| `signature` | Sense | What a thing gives off, each carrier with how far it carries |
| `afford` | Sense | What a thing lets an actor do, read from its shape, against that actor's body |
| `sense` | Sense | Who notices what: fields of view, ranges, line of sight, salience, attention |
| `agent` | Act | A body with senses and a goal; plans over affordances; drives motion primitives |
| `task` | Act | One step of a plan (go to, reach, grasp, pull, sit, drive), with its condition to be done |
| `cell.characterise` | Logic | A cell solved at switch level: truth table, delays, energy |
| `netlist` | Logic | A design as cells and nets, from a real netlist or synthesised |
| `logic.run` | Logic | Runs a netlist (event-driven, bit-parallel, GPU), with equivalence checks against finer levels |
| `engine.run` | Machines | An engine firing: cylinder pressures, crank torque, fuel drawn |
| `drive` | Machines | A powertrain into wheels on the physics, under a driver's controls |
| `energy` | Time | Stores, chains of efficiency, conservation |
| `fidelity` | Time | Which level each thing runs at, why, and moving between them |

## 12. Steps

One step at a time, each shown with pictures before the next.

| Step | Scope | Output |
| --- | --- | --- |
| 1 | `signature`, `afford` | Every part of the Corolla and a house tagged from what it is: visible at what range, audible at what range, graspable, openable, sittable, hot. A picture with the tags on. |
| 2 | `sense` | A person in a room: their field of view as a cone, what they notice and why; the pairs tried against all pairs, measured |
| 3 | `agent`, `task`: a door | A person sees a door, walks to it, grasps the handle, pulls; the door swings on its hinge in the physics |
| 4 | `cell.characterise`, `netlist`, `logic.run` | The 6502's transistors, characterised, running a real program; its fast model checked against switch level; the clock rate measured |
| 5 | `engine.run`, `drive` | The Corolla's engine firing, its torque through its gearbox, the car driving itself round a block |
| 6 | A dog walked | Two agents and a lead: a person walking a dog down a street, both sensing and reacting |
| 7 | Scale | A city block: hundreds of agents, cars, doors; behaviour stand-ins; many clocks; sleep; the frame budget measured |
| 8 | 36 million | A large netlist run on the GPU, bit-parallel, with its rate measured and said against real time |

Step 1 result:
- **Speed:** every identified part of the Corolla (6,636) is read in about 1 s; a house of 263 things in 30 ms.
- **The Corolla:**
  - Its four doors open (hinged, a handle to take hold of).
  - Its steering wheel drives it, a seat facing it.
  - Its exhaust parts are hot, and their warmth is felt about 200 mm off.
  - Its engine is heard to about 280 m, over a quiet street.
  - Nothing bolted into it is liftable.
- **A real fault found:** the Corolla's front seat cushion has 780 mm over it, where an adult sitting needs about 875 mm. Toyota publishes about 0.97 m of front headroom, so the model's seat is too high or its roof too low. It is said, not hidden.
- **The house:**
  - Its doors could not open (the seed door had no hinge). They now hang on two butt hinges and open.
  - Its kitchen's base cabinet has nothing hinged, which is said.
  - Beds, the bath, the toilet seat and the sofa can be sat on; the floors walked on; the bedside tables lifted; the bath and the sofa only pushed.
- **A child and an adult:** an adult sits on a 480 mm seat, while it is over a child's knee. A child grasps more (smaller bars fit its hand) and lifts less.
- **Fixed on the way:** the blocks turned an assembly into parts by dropping where each item was placed. They now use the assembly's own `partOf`, so every node given an assembly sees it where it is.
- **Not yet:**
  - What can be reached or seen from where someone stands (step 2).
  - The range of a smell (diffusion and wind).
  - The sound of things struck.
  - Seeds' parts carry names, not inventory ids, so their things are read from names and marked inferred.

## 13. Measures

| Measure | Target |
| --- | --- |
| Pairs tried for awareness / all pairs | Under 1 % in a block of 10,000 |
| Logic: gate evaluations a second | Measured on CPU and GPU, said plainly |
| The 6502 against a known emulator | Same registers every cycle over a million cycles |
| Fast model against switch level | No difference over the recorded inputs |
| Energy | Conserved to within the integrator's error, said |
| Frame time with a city block running | Under the frame budget, or the step says what was cut |

## 14. Limits

- A full modern processor cannot run at its real clock here; it will run slower, and its rate is said.
- Burn curves, drag, grip and minds are models with typical constants, and each says so.
- People are models of people: what they notice, decide and do is shown with why, never presented as a real person's mind.
- A real Quest is not used to check comfort or frame rate.

## 15. What exists to build on

| Concern | Where |
| --- | --- |
| Senses as physics (carrier, band, threshold, window, latency) | `perceive.ts` |
| People as physical bodies, senses as numbers | `person.ts` |
| Animals moving at their size's gait | `creatures.ts` |
| Rigid bodies, hinges, slides, motors; rolling wheels | `sim.ts`, `machines.ts` (`rollingOf`) |
| Servos, motion | `motion.ts` |
| Robots with batteries and rules | `fleet.ts` |
| Transistors, cells, dies, a PC | `computer.ts` |
| Engines from their parts; loads on them | `engines.ts`, `loads.ts` |
| Paths, stop lines, the clock | `blocks.ts` (Follow a path, the Clock), `dataflow.ts` |
| Routing search; placement maps | `placement/line.ts`, `placement/fields.ts` |
| Stand-ins, culling, a frame governor | `view/space3d.ts` |
