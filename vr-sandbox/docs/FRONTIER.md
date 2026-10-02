# The frontier

Forty-six inventions far past what is built, asked for in plain words, are stored as challenges to everything Ego is (`src/ganglia/frontier.ts`). Each is taken to the want under its words. None ends at "impossible": each is labelled for what it takes.

| Label | Meaning | How many |
|---|---|---|
| made | someone has made it; the path is how | 13 |
| buildable | known physics and methods, not yet made whole | 9 |
| research | it waits on a discovery no law rules out | 6 |
| relabelled | the words ask for something a law rules out (a 100%, a zero, a forever, a mass below nothing); she names the law and relabels the want as what meets it | 18 |

Every item carries:

- its bounds, computed by her own laws;
- the nearest real thing, with its source;
- a path, step by step;
- what she learns next to blueprint every step herself.

What it does in her language of flows is grown by her real machinery. Some she sizes whole with her own workflows.

## How far she gets herself

| Reach | How many | Which |
|---|---|---|
| blueprinted | 4 | a geodesic dome, an aerogel tent, a spinning habitat, the core of a living bridge |
| grown | 4 | shape-shifting furniture, synthetic muscles, a translating earpiece's hearing, self-assembling drones' talk |
| pathed | 38 | the rest: a sourced path, with what she learns next |

Highlights:

- **Geodesic dome.** A two-frequency dome 10 m across has 26 hubs, 65 struts in two lengths (chord factors 0.54653 and 0.61803) and 40 panes. Each strut is a stocked hollow section, sized against buckling for a whole hub's share of snow and glass.
- **Aerogel tent.** It keeps 20 °C inside at −30 °C outside on a resting body's 100 W. That takes 80 mm of silica aerogel over 10.4 m², by Fourier's law.
- **Spinning habitat.** A ring of radius 223.6 m turning at 2 rpm gives 1 g at its rim, which moves at 46.8 m/s.
- **Furniture and muscles** grow whole and real: a motor turning a lead screw, every part catalogued.

## Relabelled, and why

| Asked | The law it runs into | Relabelled as |
|---|---|---|
| everlasting battery | conservation of energy; Arrhenius ageing never stops above 0 K | a century at a small draw (nickel-63 betavoltaic), or a store with a harvester |
| invisibility cloak | causality and passivity bound a cloak's band | invisible in one band, or active camouflage tracked to the viewer |
| instant medicine | blood goes round in about a minute | medicine that acts within a circulation, by a fast route |
| filter taking 100% from a lake | the least work grows as ln(1/x) without end; rays aren't a substance | a filter train to each contaminant's safe limit |
| zero-latency translator | causality: the deciding word may come last | a beat behind, or ahead by prediction and correction |
| full-spectrum glasses | 1.22 λ / D: a metre of radio through 5 cm makes no image | a few more bands by sensors, shown to the eye |
| ever-clean tableware | Young's angle; textures wear | shedding food, renewed by a rinse (liquid-infused) |
| forcefield umbrella | only air pushes on rain | an air curtain: 446 W of air at 9 m/s a square metre |
| radiation-proof thin suit | a 1 GeV proton runs about 3.2 m of water | a suit for solar storms, a shelter for cosmic rays |
| Mars or Venus mask | the Armstrong limit, 6.3 kPa; Mars has 0.6 kPa | a pressure suit with an oxygen maker (three of NASA's MOXIE for one person) |
| gravity boots | only mass makes gravity | a spinning habitat, and magnetic soles |
| negative-mass alloy | everything weighed falls down, antimatter too | effective negative mass, within a band |
| time-dilating container | halving time takes Earth inside 11.8 mm | a stasis box by cold: chemistry runs 7 × 10⁻²⁶ as fast at −196 °C |
| light panels with near-infinite energy | a square metre of sun is 1000 W; a single junction turns 33.7% | absorb nearly all, convert what physics allows, use the heat |
| sound-proof paint | the mass law: 1 mm of paint adds 0.03 dB | a wall with mass, a gap and a soft layer |
| liquid-repelling asphalt | tyres wear textures and coatings | asphalt that drains water through itself |
| frictionless gears | the second law: losses never zero | superlubric gears, friction a thousandth of oiled steel's |
| scent released permanently | finite mass: life is mass over rate | years at a level you can just smell |

## What the frontier found in her, and what changed

| Found | Change |
|---|---|
| no straight-line actuator could be built here, so furniture and muscles were unbuildable | trapezoidal lead screws (ISO 2904) and the lead screw block; a screw efficiency law; an actuator workflow that sizes the screw, then the drive |
| grown machines that weren't vehicles came out unsized ("not chosen") | the drive search is shared by vehicles and actuators; grow sizes shafts and pushes too, and frames, mounts and trays from stock |
| a drive near its wire's limit could not be fused: the wire was sized for the current, but its fuse must be 125% of it and no bigger than the wire | the wire is sized for the fuse that protects it |
| no word for sound: hearing was said as a push | a sound flow, microphones and loudspeakers |
| no physics for bioluminescence, photosynthesis or cameras | ways for each |
| the dome blueprint read a section's area under the wrong name | fixed, and the dome is pinned by a test |
| a catalogue gap: the drives here give at most about 1 N·m continuous | named as what she learns next (gearmotors of tens of N·m) |

## Every law has a scale

The user's point: everything known came from humans with limited senses, measuring at the scales they could reach. Every law is exact only in a limit, and has exceptions in time, geometry or scale. So each law now carries the number that says where it holds, the deeper law it is the limit of, and its error against it (`scales.ts`; see [GANGLIA.md](GANGLIA.md)). She can also find a law herself, from units and her own measurements (`discover.ts`). The first law she found that way, the pendulum's, exposed a flaw in her world: slow pendulums froze at the top of their swing. That is fixed, and a rule now keeps it fixed.

## Worlds, lessons and a life

What people ask of her beyond making (a sky-reef full of creatures, a cyberpunk bazaar, a chronicle village, lessons with ghost limbs and stress vision, a chess tree, a pilot sim, to chill on a beach, to be a dog) is stored in `src/assistant/asks.ts`. Each ask is read like any other request by `understand`, which takes it to:

- what it is: to be somewhere, to fill it with life, to become something, to learn, to make, to change the rules, to see the hidden, to feel a mood;
- the capabilities it takes, each backed by the code that does it (checked by the tests) or marked not built;
- what she does about it now.

Asked for a zero-gravity cockpit with time slowed, she turns gravity off and slows time at once. Asked for a beach, she grows its sand and sea and takes you there. A world whose physics is "broken" is given other constants instead: strange, but still a world things work in.

Over everything asked, what to build next is ranked by how many wants call for it, and built in that order:

- **Ground** ranked first, so it was built first ([PLACES.md](PLACES.md)). Asked for a beach, she grows its sand and sea and takes you there.
- **Lessons that check what you do** came next ([LESSONS.md](LESSONS.md)). Any design she can make becomes the steps of building it yourself, each shown by a guide and done only when done in your world.
- **Swimmers with bodies** came next ([CREATURES.md](CREATURES.md)): real parts and rhythmic servos that swim by the water's push.
- **Walkers that choose** came next ([CREATURES.md](CREATURES.md)): a dog and a deer on hobby servos that walk by their feet's grip and go where their wants take them. Making them walk found five flaws in the world, now fixed and held as rules.

Now ranked first:

1. characters with minds (called for by 8 of the stored asks);
2. plants, creatures that fly or crawl, and seeing what is hidden (6 each);
3. buildings (4).

## Ask her

- *"what's on your frontier?"*
- *"can you make an invisibility cloak?"*
- *"blueprint for gravity boots"*
- *"how would you build a geodesic dome?"*
- *"where does kinetic energy break down?"*
- *"I just want to chill on a beach"*
- *"put a dog on the beach"*
- *"spawn me in a simulation as a dog"*
- *"teach me chess"*
