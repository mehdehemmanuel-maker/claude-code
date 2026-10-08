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

## Panelled bodies

A car's body is made by `src/nexus/panels.ts` on the freeform surface tools of `src/nexus/surface.ts` (NURBS curves and
skins, fitting, knot insertion, regions and trims, fairness, zebra, draft, closest points):

- **One side skin,** nose to tail, each section a convex control polygon, so no line on it ripples. Its arches are the
  least radius that clears each tyre's sweep through its full lock and bump. The doors, sills, fenders and quarters are
  regions of it, named by what they are for.
- **The hood, the deck lid and the cabin are built on the side's own top edge.** The side is split there by knot insertion,
  and each is built on its edge column for column, so the two share their knots and meet along all of it (`split`,
  `fromEdge`). The hood stands off the fender by its 4 mm shut line everywhere, where fitting each from its own sections
  left 17 to 37 mm. Its second control row is twice the side's last leg, which puts the two in one tangent plane.
- **The wheelhouse liners are checked by their maker.** Each is a drawn control net, so moving a point out only moves the
  liner out. It has a return at the lip that a risen tyre tucks up behind, and widens inward so its core pulls out. Its
  maker checks it against the sweep and pushes out what is in the way, with 5 mm to spare.
- **What goes inside is fitted to the body as made** (`insideOf`). A seat is as wide as the room beside it: its
  neighbours, the body's inside at its cushion and shoulders, and a wheel's sweep under it. The dashboard and the
  steering column hang on a cross-car beam whose ends are the body's inside there. Styled cars seat their people by the
  cabin (about 0.9 m behind the windscreen's base), not by the axles.

The critic checks every skin against what its maker said of it (`meets`): across a mirror within 1°, a G1 meeting within
8 mm and 3°, and a crease within 8 mm. It also checks that a pressed panel draws from its die and is bent no tighter than
three times its sheet.

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

Later rounds, on the panelled bodies:

- **Round 1 (2–3 of 10):** boxy panels and black discs over the wheels. Arches were made from the sweep, and the critic
  no longer cuts skins.
- **Round 2 (3–4 of 10):** gaps at the shut lines, liners in the tyres' way, the dashboard over a van's wheels, and seats
  wider than the body. These were fixed as above.
- **Then, from looking:** a sports car's liner stood out of its fenders, which cleared only half the tyre's bump. The
  fender line now clears the whole bump and the lip, so a low car's fenders rise over its wheels. Where a deck is too
  short for a lid (a van), the cabin runs to the tail, and the roof narrows with the body at its ends.
- **Round 3 (3 of 10; the sports car 4):** the cars floated, every style had one featureless face, and the wheels were
  small in big dark arches. Fixed with a contact shadow drawn under grounded kits (in VR too, which has no shadow maps).
  The sweep now follows the tyre's section, rounded at its shoulder. Faces are laid out by height, with headlamps,
  daytime-running strips, a grille as tall as each style's, bumper shut lines and red tail lamps. Each style gets its own
  tyres and clearance; mirrors are lofted shells on stalks; handles are bars in pockets; long cabins get more pillars.
- **Round 4 (4 of 10; the sports car 3):**
  - the van's wheelhouses were open inboard, so the far side and a red spring showed. They are now closed by inner walls
    beyond the tyre's full-lock reach;
  - a sports car's liner ran away through its haunch. Its control points are now capped under the skin's top edge;
  - the hatchback's rear door was a hand's width. The B pillar now splits the door line by length;
  - mirrors moved to the foot of the A pillars;
  - the bodies are crisper: less tuck under, a tight sill turn and a shoulder line. A styled car's track is its width
    less its tyre's, with each tyre face 30 mm inside the body.
- **Round 5 (4 of 10; the pickup 3, the sports car 2):** black triangles on the sports car's hood were the new inner
  wheelhouse walls' corners, rectangles standing above its low hood. Each wall's top now follows the liner's inner edge.
  The dashboard ends at the windscreen's base, its top 30 mm under the belt.

**Speed.** Every kit through the pipeline took 26 s, then timed out under the gate's load. Three causes, fixed:
- the pipeline deep-copied every skin's net, so nothing worked out about a skin carried from car to car;
- a body was made again for each colour;
- a wheel's sweep recomputed per call what is fixed per wheel.

Every kit now takes 17 s. Skins are also scaled with a thing's size now; they had not been.

Still open:

- tight radii where a boxy body's tail turns over at its top (van 0.8 mm, pickup 1.2 mm), and a van's roof rail (2.0
  mm), against 2.4 mm. At a tail the section's tumblehome shrinks with the plan, which leaves its roll over no room. A
  crease under the cabin was tried and undone: it rippled the front doors;
- a skin is fitted along its whole length at once, so a tighter corner in plan (a squarer nose) ripples a door metres
  away. Tried at a 0.38 m nose radius and undone. The fix is more control columns where the plan turns tightly (local
  refinement), not a looser fit;
- an arch lip in body colour;
- nothing yet checks that what is inside a body stays inside its skin. A dashboard, the inner wheelhouse walls and a
  liner have each stood through a panel and were found only by looking. The critic should test it, point by point, as it
  tests a wheel's sweep;
- the go-kart on the track (`view/kart3d.ts`) is drawn apart from `machines.ts`;
- planes, cranes and power tools are new architectures, not yet built.
