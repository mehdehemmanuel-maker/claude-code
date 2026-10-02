# Hard challenges: what they found, and what changed

Ego sets herself challenges far beyond what has been built, to find where her engineering breaks. Each is said as the functions it needs, in plain words, and taken through everything she has (`src/ganglia/challenges.ts`):

1. words to flows (her language);
2. flows to physical ways (her physics);
3. ways to blocks (what she can build);
4. blocks grown into a whole machine (`grow.ts`) and checked.

Each need ends as **unsayable**, **no way**, **unbuildable**, **fails**, **partial** or **works**. `tests/unit/grow.test.ts` pins where each stands.

This is the record of the first two rounds: what each challenge found, what was changed because of it, and what is still open.

## Round 1: what broke

| Challenge | Need | Before |
|---|---|---|
| Computer | hold a bit; let one bit switch another | no way: she could say "bit" but knew no physics that holds or switches one |
| | run on electric power; take a key press | no way |
| | show its answer | unsayable: no word for light |
| | its floor (Landauer) | no law for the energy of a bit |
| Symbiote | energy from the sun | unsayable: no word for light |
| | live on waste heat | no way from heat to electric power |
| | feed on food | unsayable: no word for chemical energy |
| | heal and grow itself | unsayable |
| | whether a pair can live on each other | no law (Carnot) to say |
| Scientist | sense a force, a temperature, a turn | no way: she had no senses at all |
| | act on what it found | no way, though her own motor controller is a transistor switch: the block existed, but no way described its physics |
| Language | how small can it be | no law for the information in a choice |
| Geometry | make a new shape | unsayable: her language describes what things do, not their form |
| Flight | push on the air | unbuildable: physically possible by a propeller, but no propeller is catalogued |

## What changed

| Found | Change |
|---|---|
| no word for light or chemical energy | two new flows, `light` and `chemical` |
| a battery was a source with nothing behind it | the energy store now takes chemical energy (the electrochemical cell) |
| no physics for information | ways for transistor switching (embodied by the motor controller), transistor, relay and mechanical logic |
| a buildable bit | a mechanical bit block: a lever with two stable states, made from plate on a pivot, as in Zuse's Z1 |
| no senses | strain gauge, thermocouple and encoder ways |
| no energy from outside | solar cells, thermoelectric generators, heat engines, burning, muscle, LEDs |
| no bounds | seven laws, each with an independent worked example and a dimensional check: Landauer's limit, CMOS switching power, the information in a choice, Carnot, Seebeck, strain gauges, solar cells |
| new principles | energy from a source; no loop of conversions keeps itself going; a bit needs two stable states |

## Round 2: where each stands now

**Computer: as far as partial.**

- Bits, gates and a key press can be built in her world as mechanical logic, but the levers aren't sized yet.
- Transistor logic and a display (LED) are possible but not catalogued.
- The physics says what it costs. Landauer's floor is 2.9 × 10⁻²¹ J a bit at room temperature. A lever flipped by a 10 g ball dropping 1 cm costs about 3 × 10¹⁷ times that: a mechanical computer works, at a heavy price per bit.
- Found on the way: her world's circuits have no switch, so a relay or transistor computer couldn't run in its physics yet even if catalogued.

**Symbiote: as far as partial.**

- It can carry its host (the kart), with real parts except the wheel.
- Solar cells, thermoelectric generators and muscle are known physics but not placeable.
- Healing and growing are still past her language.
- The honest bound: a partner living on the other's waste heat at body temperature turns at most 3.2% of it back into work (Carnot). A closed pair runs down, so a symbiote must also take light or food from outside, as every real symbiosis does.

**Scientist: unbuildable.**

- She can predict: her laws, checked against her world.
- Every sense is known physics, but none is placeable yet.
- She can't yet run an experiment of her own choosing. The test stand (predict, build, measure, compare, revise) isn't finished.

**Language: works, within its bound.**

- Her genome for the kart is 106 bytes, and the body it grows is about 4.4 kB: 41 times smaller, because the meaning lives in shared knowledge (the ganglia), as DNA's does in the cell.
- No language can be more efficient than every other. The parts are chosen among about 700 bodies, which is 9.5 bits of choice, and no code can say that choice in fewer than 10 bits (Shannon).

**Geometry: unsayable.** This is the deepest gap. Her language has function (flows, ways, blocks) but no form. A new shape needs:

- a language of form: sections, sweeps, revolves, lattices, shapes grown by their loads as bone is;
- exact mass properties from that geometry;
- a way to say which processes can make it.

The world also needs parts whose shape isn't from a fixed list.

**Flight: unbuildable.** A propeller is physically right, but none is catalogued. Momentum theory says a 0.3 m rotor given 100 W can at best hold up 1.2 kg.

## Round 3: the form language

The geometry gap was the deepest, so it was the next structural change (`docs/FORMS.md`). Ego now has a language of form:

- primitives, sections (including NACA aerofoils and grown fields), operations and lattices;
- a mesher with exact mass properties;
- a reader of what can make each shape;
- shapes grown by their loads (topology optimisation), checked as real parts.

The geometry challenge now **works** on all three needs:

| Need | Result |
|---|---|
| Invent a shape for a job | A bracket grown for 500 N at 120 mm: safety factor 2.5, 1.2 mm deflection, milled or printed |
| A lattice no stock comes in | A gyroid cube, printed |
| An aerofoil | A NACA 2412 wing, milled or printed |

What it found on the way:

- **A grown field read as empty.** Its distance was clipped at zero, so nothing counted as inside. The tests now check a grown shape's mesh against its densities.
- **The world's parameter cleaner dropped any value it didn't know.** A form's genome would have been lost on every edit. Parts now have a text parameter that is kept, and the save format checks it as untrusted.
- **A new material needs thermal data, or the thermal guard fails.** The printed nylon's thermal figures aren't published, so they are estimated from its nylon matrix and say so.

## What the challenges taught about the structure itself

- **A block without a way is invisible to reasoning.** The motor controller was a transistor switch all along, but nothing said so, so "act on a signal" had no path. Every block's physics has to be written down as a way, or conceptual design can't find it.
- **A source with nothing behind it hides the energy chain.** The battery gave electric power from nowhere. Now it takes chemical energy, and the chain can be traced to its start.
- **Function is not form.** Flows, ways and blocks say what a thing does. Nothing yet says what shape it is or why. That is the next structural change, not a missing entry.
- **The immune check found real flaws in what was already built.** The kart's rubber wheels can't honestly be made or bought here (no process moulds rubber, and no wheel is catalogued), and nothing sizes its frame. Growing it from its genome surfaced both.
