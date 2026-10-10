# Inventing anything: the plan

What is asked of Nexus, in the person's words: type anything, even something no one has invented, maybe answer a few
questions, and have it made. It must be random but stable, keep the laws and keep the intent, across every domain and
every size, with no templates (no car, printer or drone written in). The person types only the intent and the answers;
everything else is automated, and every step says what called it, when, why, where and how. Then it is saved, made
again, or made several times. Advanced builds belong too: a computer board, a microSD card, a spacecraft, components.
So do sizes no one builds at: a motor the size of the Earth, a drone the size of a tardigrade. Detail is loaded only
where it is seen: the outside of a car until you get in, and inside only what is on screen. Structures fold and unfold.
And it is stress-tested by minds that know nothing of it.

This is the plan for all of that, in the order it is built. Each phase ends tested, shipped and live.

## Where it stands (round D1, this round)

`src/nexus/ask/conceive.ts`, the intent pipeline:

- **Reading.** Words are read into *wants*: hold a weight up, move a load, turn, swing open, slide, hold a liquid,
  enclose, keep warm, lift itself, float. Each want carries its figures. A figure is given by you, answered, the usual
  one for what was named (with its standard, e.g. EN 527-1 for a desk's 740 mm), or estimated with its grounds. A word
  for a thing is read only as the wants it is for, never as a shape.
- **Questions.** At most three, only for figures that are estimates and matter most. The answers are the only other
  thing you give.
- **Ways.** A *way* is a rule that meets a kind of need. Each declares when it applies, what it is (`says`), and how
  it makes its parts. Among the ways that apply, one is drawn from the seed.
- **The planner.** It derives the stack from what each kind of need carries and where it goes: what moves carries the
  rest; what holds a weight up carries what is put on it; a door or a heater goes into what it is part of. It sizes
  from the top down: what is below carries the weight of what is above, and is widened to fit it. It places from the
  bottom up.
- **Sizing by law.** Each size is the least the laws allow:
  - a top as thin as the workshop's load law lets bear its load by 2, bending under 1/250 of its span;
  - legs as thin as Euler lets carry their share by 3;
  - a tank wall from its hoop stress;
  - a motor's voltage from its own torque line, through a gearhead where it would turn too slowly;
  - a heater from what still air takes.
- **Checks, run for real** in a room of their own:
  - the connection and fusion laws, and no overlap;
  - the load law;
  - buckling;
  - with Jolt: standing when let go with its load on it; pushed at its top across its narrower way; moving at the
    wanted speed; turning at the wanted rpm; swinging; sliding;
  - heat flow to the wanted temperature.

  A design that fails is drawn again from the next seed, its flaw said.
- **Trace.** Every step carries what it is, the rule that called it, when (and what it was derived after), why (its
  lineage to a want), where (what it touches) and how (the law that sized it).
- **In the forge.** "make …", the answers, "go", "another", "make 3", "again", "save it", "why the leg1". A pipeline
  step that makes takes the defaults.
- **The harness.** `npm run invent -- "…"` runs the same pipeline outside the room, for anyone, including a blind
  tester.

Measured this round, 21 asks across 10 kinds of want: every one that the reader understood was made, and passed every
check it was given. The things it could not do were said plainly:

- "a lamp that follows the sun" was read as nothing;
- a flyer was made but not flown: there is no air in the physics, and no battery yet;
- a raft was made but not floated: there is no water.

## Phase 1: the stress loop, in waves (started)

1. **Blind testers.** These are AI instances with no context: they never see the source, only the harness. Each
   invents things that do not exist, in a domain and at a size it is given loosely, and asks for them. It pushes harder
   after the first, and reports harshly what was understood, what was made, what is wrong, and its three worst problems.
2. **The journal.** Every run is a line of JSON: the words, the wants read, the answers, each design's choices,
   failed checks, gaps, tries and time.
3. **Triage after each wave.** Failures are sorted by cause:
   - a word not read;
   - a want not representable;
   - a way missing;
   - a law missing;
   - a check missing (it made something wrong and did not notice);
   - a check wrong;
   - a crash.
   
   The cause behind the most failures is fixed first. Each fix is general: a law, a way or a reading, never a template
   for the thing asked.
4. **The corpus.** Every request a tester made joins a corpus that runs on every change, a census like
   `nexus:census`. A request that once worked must keep working, and what changed is printed.
5. **Scores per wave:**
   - read: any want understood;
   - made: built under the laws;
   - holds: every check passes;
   - wanted: every stated number is met or said to be unmet;
   - honest: nothing claimed that was not checked.

   Waves keep running until the scores stop rising. Then the next phase's domain is added, and the waves start again.
6. **Waves with randomness.** Each wave draws its domains and sizes at random, so the corpus never settles into what
   the pipeline already does.

## Phase 2: watch it run, as a graph

When you generate something, the run is drawn as a graph in the room, on the boards you already use:

- your words; the wants read, with each figure and its origin; the questions and your answers;
- each need, and the way drawn for it, with the ways not drawn and why;
- each step, lit as it runs while the part appears in the room;
- each check, turning green or red with what it found;
- a redraw, as a new branch from the failed check.

Each node opens to its trace: what, when, why, where and how. The graph is the saved pipeline: running it again runs
the same steps, and editing a step's words changes what is made.

## Phase 3: sizing, at every scale

This is the core of "invent anything". A thing's size changes which laws matter, and so which ways can meet a want at
all. Nothing about scale is written per thing; it all comes from dimensionless groups the laws already contain.

**The size of a request** is read (km, µm, "the size of the Earth", "the size of a tardigrade"), or derived from what
it carries, or asked. Names of sizes ("the size of …") are read from a table of reference lengths with sources: the
Earth's radius, a tardigrade (0.05 to 1.2 mm), a grain of sand, a human hair, a building storey. A size is never
assumed silently.

**The regime** at that size comes from the scale tuner already in Nexus (`tuner.ts`, `regimeAt(L, T)`). It ranks the
energies that dominate at the size (gravity, electric binding, heat) and says whether a body that big collapses under
its own weight. The planner adds the engineering groups:

| group | what it decides | where it flips |
|---|---|---|
| self-weight, ρ g L / σ_y | whether a structure can hold its own shape, which rises with size (square–cube) | about 1: past it, nothing solid stands, and self-gravity, pressure or tension must hold it |
| Reynolds number, ρ v L / μ | whether air or water acts by inertia or by viscosity | about 1: below it a propeller or wing does nothing; a flagellum, cilia or a corkscrew moves it |
| Bond number, ρ g L² / γ | whether gravity or surface tension wins | about 1: below it things stick, and water is a wall |
| thermal: τ = ρ c L² / k, and surface to volume | how fast it heats and cools | small things cool at once; big ones keep their heat and must shed it through relatively little surface |
| actuation: electrostatic (∝ L²) against magnetic (∝ L⁴ at a fixed current density) | which motor works at all | below about 1 mm electrostatic and piezo win; above, electromagnetic |
| tip speed, √(σ / ρ) | how fast a rotor of that size can turn | a rotor the size of a planet turns once in hours, or flies apart |
| self-gravity, G M² / R, against the strength it has | whether it stays a machine or becomes a planet | an Earth-sized anything is round and molten-cored unless it spins or is a thin shell under tension |
| light time, L / c | how fast it can be controlled | 42 ms across the Earth, a long time to keep a rotor in step |
| thermal noise, k T, against what drives it | whether it can be controlled at all | at a few nm, Brownian motion is louder than any motor |

**Every way declares its range** in these groups. A propeller works only where Re ≫ 1. A leg works only where self-weight
stays below 1. An electromagnetic motor needs L above about 1 mm, and a bar frame needs ρ g L / σ well under 1. The
planner draws only from ways whose range holds at the size. Where none holds, it says which law rules them all out at
that size. That is a finding, not a failure, and it is the "how would it have to be built" answer.

**Ways for the far scales,** each derived from the same groups:

- micro: flagella, cilia and corkscrews for motion at low Re; electrostatic comb drives and piezo stacks; MEMS hinges
  that flex instead of turning;
- giant: shells in tension (inflated, or spun); tensegrity and cables where bars buckle under their own weight;
  hydrostatic support; segmented rotors made of many small machines moving together.

**Two worked targets, checked in tests:**

- *A motor the size of the Earth.* A solid rotor of rock or steel cannot hold its shape (ρ g L / σ ≈ 10⁴), and its
  tip speed allows a turn in about 3 hours at best. So it must be a set of many conductors on a body held by its own
  gravity: the rotor is a liquid or plasma shell turned by fields, like a dynamo run backward. Its field energy, its
  cooling through its surface, and its 42 ms light time across say how fast it can be driven.
- *A drone the size of a tardigrade.* At about 0.3 mm in air, Re ≈ 1 to 10 for the speeds it can reach: rotors give
  almost nothing, so it flaps or flies by electrostatic or piezo wings, as insects do. Its weight is negligible and the
  air is thick for it. Surface forces (Bond ≪ 1) make it stick to what it lands on. Brownian motion is still quiet at
  this size, so it can be controlled. A battery cannot fit; it runs on power beamed to it or harvested from what is
  around it.

## Phase 4: detail where it is seen (procedural levels of detail)

**Every design is a tree.** The whole is first, and each node is an assembly.

- **First, the envelope.** Each node is first only its envelope: its outer shape, mass, centre of mass, interfaces,
  power, heat and the loads it passes. The envelope is derived first and checked as a whole. A car's body is checked
  before any seat exists.
- **Children on demand.** A node's children are generated only when needed, deterministically from (seed, path) so
  they are the same every time: when you come near, when you go inside, when it is on screen, or when a check needs
  them. Inside, only what is in view is generated. What leaves the view collapses back to its envelope, as the unseen
  law already does for what nothing can see.
- **Fold and unfold.** A structure's folded and unfolded states are modes of the same tree, with the joints between
  them: a wing, a stair, a solar array, a tent. Unfolding is a motion the physics runs; folding checks that it fits.
- **The scale ladder.** Each level of the tree has its own regime (phase 3). A spacecraft's hull is sized by pressure
  and meteoroids, its board by heat and signal, its chips by electrons. So generating deeper is also going smaller,
  with the laws of each size.

## Phase 5: components and electronics

**Boards, cards and chips are derived from wants:**

- compute (operations a second, its kind);
- memory and storage (bytes, endurance);
- interfaces (USB, HDMI, Ethernet, radio);
- power in (volts, watts, source);
- heat out;
- size.

**Laws and data:**

- **Kept components, with sources.** These are real parts with their datasheet figures: SoCs, DRAM, NAND flash and
  controllers, regulators, connectors, crystals and antennas. The same approach as the motors kept now; never a whole
  product.
- **Laws:**
  - a power budget, Σ P with each regulator's efficiency;
  - a heat path, junction to case to board to air (θ_JA), and the temperature reached;
  - trace current against copper width (IPC-2221);
  - signal rules (lengths matched, reference planes);
  - a layer stack;
  - placement by what each part connects to.
- **Examples that must come out right:**
  - a board like an Orange Pi 5: an 8-core ARM SoC with LPDDR4X, eMMC or microSD, two HDMI, USB 3 and gigabit
    Ethernet, powered by 5 V over USB-C, on a board about 100 × 62 mm;
  - a microSD card: NAND, a controller and contacts in 11 × 15 × 1 mm, its capacity from the NAND kept, its speed
    from its bus.

  Each is a tree with levels of detail: the board, then the chips, then the die.

## Phase 6: extreme environments and spaceflight

- **Pressure vessels** in vacuum or under water (hoop and buckling). **Life support** as a mass, energy and air balance
  per person per day, with sources. **Radiation** shielding by areal density.
- **Propulsion** by the rocket equation, Δv = I_sp g₀ ln(m₀ / m₁). **Orbits** and the Δv to reach them.
- **Heat in vacuum**, shed only by radiators (σ ε A T⁴).
- **Venus's clouds:** buoyancy in a CO₂ atmosphere at 52 km, where the pressure is about 1 bar and the temperature
  about 60 °C. A tester asked for exactly this.

## Phase 7: reading anything

- **Claude reads first.** Where Claude can be reached, it reads any words into the same wants, and its reading is
  validated by the same types. Offline, the reader here is the fallback.
- **New wants as stress waves find them:**
  - emit light (a lamp);
  - follow or track (a sun-follower: sense, then turn);
  - sense (a temperature, a weight, a sweat glucose level);
  - make sound;
  - store energy;
  - generate it;
  - compute;
  - store data;
  - pump;
  - filter;
  - grip;
  - climb.

  Each is a kind of need with ways and checks, never a thing.
- **Questioning a request.** Requests that break a law are questioned, never silently accepted ("4 TB in a microSD,
  kept 50 years without power"). The pipeline says what law the request runs into, and the nearest that does not.

## Order

1. Ship D1 (this round): the intent pipeline, the harness, the trace, the forge chat.
2. Wave 1 and its fixes, then the corpus.
3. Phase 2, the graph.
4. Phase 3, sizing: the groups, the ranges of ways, the far-scale ways, the two worked targets.
5. Phase 4, levels of detail and folding.
6. Phase 5, components.
7. Phase 6, environments.
8. Phase 7, wider reading, alongside every wave.

After each, a wave of blind testers runs, and the scores go in this file.
