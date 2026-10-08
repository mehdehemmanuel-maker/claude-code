# One way to make anything

Everything a kit makes in the forge goes through one pipeline (`src/nexus/make/pipeline.ts`):

1. **Conditions** (`make/conditions.ts`), read from the words: age and wear, the setting (outdoors, by the sea, cold, in
   space), what it is made of ("made of oak", "a golden bed", not "a silver car"), its size, who it is for.
2. **Attention to detail** (`make/detail.ts`), one list of rules, each with its source: edges as made (`finish.ts`),
   joints by material pair (welds, ISO 4017 bolts on pitch circles, screws, seals, valves), finishes, feet and base
   plates, doors round an enclosed cabin, lamps, the road kit (only on what goes on public roads), rating plates, wear.
   A fastener is placed only where the part really is. A seam follows a curved panel.
3. **Critic** (`make/critic.ts`):
   - **Room to move.** A wheel sweeps a ring, with about 30 mm to its arch and 15 mm beside its sidewall. A blade
     sweeps a disc inside its housing. A lofted body over a wheel is cut back into a true arch.
   - **Held up.** Checked through the embodiment's load path, from the ground. A slip of a few centimetres is put
     right; a part a span away is said, not moved, and nothing is rested on a moving part.
   - **Walls, through, standing, density.**
   - **Interfaces.**
4. **Interfaces.** Each part says what it provides and requires (`Iface` in `kits.ts`), and every pair is checked with
   its numbers:
   - a hub's bore against its axle;
   - a nut's thread against its studs;
   - a chain's pitch against its sprockets;
   - an engine's torque through its reduction, against what the driven axle carries in torsion (from its section and
     AISI 4140 at 415 MPa, ASM Handbook, at a factor of 2).

   An interface is a connection, never an interference.

The pipeline repeats until nothing more is put right. A published mass is reckoned again at the end, so what isn't
drawn makes up the difference, and says so.

Say "checks" in the forge to see every stage on a board.

## Wheeled machines from their figures

`src/nexus/machines.ts` makes every wheeled machine one way, from:

- its axles: position, track, tyre code, steering, drive, twin tyres, brake;
- how each axle hangs from the frame: rigid, pivot, strut, beam, wishbone, swingarm, leaf or air;
- its frame: shell, tube, ladder or backbone;
- panels lofted over it by its lines;
- its seats;
- its power: engine size from displacement, its mass shared out;
- its controls;
- its implements: a mast and forks, a fifth wheel, a mower deck, racks;
- its chain drive.

Tyres come from their sidewall codes in every system: ISO metric, flotation, conventional truck, bias.

| Machine | From |
| --- | --- |
| Toyota Corolla LE (2025) | Toyota 2025 Corolla eBrochure: 182.3 × 70.1 × 56.5 in, wheelbase 106.3 in, track 60.3/61.0 in, 2,955 lb, discs 10.8/10.2 in |
| Honda FourTrax Rancher 4x4 (2026) | Honda Powersports: 82.8 × 47.4 × 46.2 in, wheelbase 50.0 in, tyres 24x8-12 / 24x10-11, 615 lb, double wishbone / swingarm |
| Honda CRF450R (2025) | Honda Powersports: wheelbase 58.3 in, seat 38.0 in, rake 27.3°, rear 120/80-19, 245 lb |
| Toyota 8FGCU25 | Toyota Core IC Cushion spec sheet: 2,380 mm to fork face, wheelbase 1,485 mm, tread 890/915 mm, 3,630 kg, guard 2,050 mm |
| Freightliner Cascadia 126 day cab 6x4 | Freightliner Australia spec list: wheelbase 4,425 mm, 7,166 mm long, BBC 3,220 mm, 8,200 kg, frame 11 × 85 × 287 mm, Taperleaf / Airliner |
| John Deere X350 (42 in) | John Deere, TractorData: 21.5 hp FR651V, tyres 15x6.00-6 / 20x10-8, wheelbase 49.4 in, 464 lb |
| rental go-kart | typical: tyres 10x4.50-5 / 11x7.10-5; Honda GX270, 19.1 N·m, 381 × 428 × 422 mm; #35 chain 12/72 |

Body styles (sedan, hatchback, SUV, pickup, coupe, van, sports car, convertible) are made by the same builder from
typical figures. Where a figure is not in a source, it is said as typical or an estimate.

**What this is not.** A real product's exact surfaces are its maker's CAD and aren't public. A machine here is true to
its published dimensions, tyres, wheelbase, track, mass, engine and part list, and its panels approximate its shape.

## How it was reviewed

`view/look.html` shows a made thing on its own: framed whole, under daylight, with nothing written on the page.

Each round was rendered there. An agent told nothing about the project then said what each picture was and what a
person would call wrong. It named all seven machines on the first blind round. Its complaints were fixed by cause in
the general rules:

- doors were given to open machines;
- fasteners sat on boxes instead of real surfaces;
- panels were pillow-like;
- lamps and chains were missing;
- mirrors were placed by the roof.

Still open:

- the go-kart on the track (`view/kart3d.ts`) is drawn apart from `machines.ts`;
- planes, cranes and power tools are new architectures, not yet built.
