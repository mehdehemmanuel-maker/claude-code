# Nexus and the forge: read this before any work here

This file is the anchor against drift. Long recursive work loses the point when each round optimises what it can measure
(tests green, numbers sourced, findings fixed) and forgets what the person asked for. Summaries after a context reset keep
the task list and lose the why. So the why lives here, and every round is checked against it.

## What is wanted (the user's own words, kept)

- "don't make templates for individual generation paths that's mock, make it have a pipeline where it can generate
  trillions of different combination of just anything based on any condition improve realism … there needs to be an
  attention to detail part of the pipeline"
- "merge them don't discard one or just not incorporate it, they may complement each other … why are there two different
  generators"
- "parts need to have more rules on them like if there a moving part like a tire an auger … then it's recommended it has a
  given amount of space"
- "I'm not sure how the car or go karts you made are such low qualities when you have so many parts mapped out and
  interconnectable and can expand any part for its sub parts"
- "generate every single vehicle, every vehicle type, make, model … forklift, semi, crane … plane, jet, with real parts …
  every go kart, four wheeler, dirt bike … every mower, every power tool, really buildable … click it and it is a 1-1
  exact model of the real product, expandable"
- "ask yourself what aren't you asking yourself; don't just think of math, think of emotion: how would they think about
  this, what would they say is bad about this, and then recursively fix it"
- "there's a lot of missing pieces … you haven't configured an environment that makes it easy for you to do certain
  things … handling texture and complicated shells … looking at how you got through the math, what could be better …
  recursively upgrade every process and sub-process: the car's fenders and panels, unibody, hoods" (the roadmap with it:
  Bezier/NURBS, proportional falloff, symmetry; a creator and a critic that changes the creator's rules; wireframe boxing
  then skinning; zebra stripes; G2/G3; practise on a front fender first)
- the CAD toolset list (2026-10-08): automatic constraints (tangency, coincidence, symmetry), a parametric feature tree,
  G2/G3 smoothing, clean quads, SubD cages, zebra and reflection maps, draft-angle analysis, wall-thickness checks,
  generative design, command prediction
- "don't just adopt all these tools: improve them, expand, find flaws, find a branch it opens that no one thought of; try
  to be the system that future systems reference"
- "Create every car there is you don't just design the outside … design each sub component the motor and other parts
  but also you first need to design the sub components of that and so on and then you can save that component under its
  name and category and now every other build using any of them is already ready screws nuts bolts, radios, buttons,
  wires … mix and match and make emergent builds like a semi truck-atv hybrid, 3d printer with robot arms on it, a new most
  efficient motor, a whole industrial plant … start small and work your way up … the most common parts" (2026-10-08:
  the component library, `components.ts`)
- "do the same thing for every 3d printer, metal filament and everything and robotic arms even the most advanced, all
  versions of filament makers, even metal filament makers, study all bots even filabot … futuristic manufacturing … tony
  stark level engineering" (2026-10-08: manufacturing built from the library)
- "money manager / business agent with employees on computers and a board room with a giant screen I can edit, basically
  a node tree that maps things in my situation out; don't lose context, find time for it" (2026-10-08: queued)
- "go through every part and make sure that every other part is inside and every part that's in those parts … almost
  100% visually accurate … scaling build up from tiny parts to full builds has 100 realistic shape and complexity; delete
  all the old build things off the app, they're old and low quality … upgrade the whole app's UI and abilities"
  (2026-10-08: `missingIn` in `components.ts`; old builds to be listed before they are removed)
- "don't forget bearings have sub components as well" (2026-10-08: rings, balls, cage, shields drawn)
- "for each new part stored it has to be queued for a break down just in case it has sub components, and then if it does
  it's the same for any new parts added … look for even more components in the sub component … some kind of table lookup;
  if the very specific part doesn't exist in the table queue it too, but first it has to be broken down" (2026-10-08:
  `breakdown.ts`, `npm run breakdown`)
- "break down components and break down the other components … expanding the whole library … at like a bulk crazy scale
  like thousands and thousands … be nice on GPU and CPU … the only time you would load all that type of stuff anyways is
  if they expand and look into it … expand your regions of CAD … industrial … augers … electrical you're gonna need to
  know everything about circuit boards, build the machines that build the circuit boards … the microchips" (2026-10-09:
  `packages.ts`, every electronic package drawn to its die and bond wires)
- "we need a lot more embedded systems, raspberry pis, orange pis, all of d-robotics and the rdk x5, the worlds smallest
  and most precise robot arm, the actual language and programming processes and code … have a in app computer for
  programming and coding with you on the screen showing how I would use you to help me with that"
- "this whole thing is for me … you to be able to invent or help me bring my thoughts to life and then you teach me how
  to build things so have a training thing don't leave any part or anything unnoticed but make it infinite like anything
  I request … I'm gonna need that computer … my phone, soldering kit … tell me all parts I need and prices and you gotta
  try to keep prices down … source online … create parts that would be cheapest to get custom made within my current
  constraints … hand me what I need to take to a website that makes custom parts … you will be my iron man Jarvis … make
  it as realistic as possible"
- "every build that user requests to be taught is a 100 percent hands on walk through so don't say solder here que the
  soldering kit generation once it looks realistic use it in the build and have the user solder … that doesn't look like
  a orange pi 5 some logic is broken its important these builds are 100 accurate so nothing goes wrong or wasted money"
  (2026-10-09: a lesson is done by the user's hands in the room, with the tools drawn as they are; a board is drawn from
  its own measured layout, its maker's drawing and photo, or marked approximate where it is not yet)
- "make sure everything including these has to run through the que solver for any new parts or specific parts"
  (2026-10-09: every new part, the soldering kit's and a board's connectors among them, goes through the breakdown queue)
- "before confirming any measurements at the higher scale you gotta make sure the smallest sub sub components are
  accurate and then so on and then you will have 100% accuracy don't do anything mock every build has to be treated as
  such … do the same with the other stuff you recently made its flawed because you decided to skip the build process …
  make sure everything is 100 percent accurate internally at each sub component scale and externally from texture
  movement etc … it shouldn't just be the photo for things that hard to see grab multiple photos … make more advanced
  tools for yourself to make life a lot easier and add them to the process" (2026-10-09: parts first, each from its
  maker's drawing; then the thing they make, placed from several measured photos; see "Measuring a real product")
- "perfect the language of the tutorials … make tools just for it … soldering iron and solderable parts have some type
  of universal edge and every setup that would be the same have a edge … we need a lot of edges, advanced ones,
  specific ones … so you don't gotta take as much time with everything … generate 100% accurate tutorials real soon …
  get all tools out the way, even tools for other builds: the most advanced 3D printer … the things that make its parts
  … a kiln type of workflow and a basic 3D printer, maybe a robotic arm … a robot that can weld, solder, type on a
  computer, it can see, sense, hear, smell … grab … change its own grip or use any tools … a materials processor type
  of engine, it can process anything … submit some images of me and you put a model of me in the app … a node graph,
  every node I connect to any other node will be able to see it when I click on either node: time, people, places,
  memories, dopamine, melatonin, oxytocin, adrenaline, cortisol, endorphins, serotonin, acetylcholine, norepinephrine,
  GABA, glutamate … a map of all the brain regions … no room for context drift … use md to keep yourself on point …
  use the fuck out of edges … turn everything into a loop" (2026-10-09: `edges.ts`, the lesson language; the rest in
  "Now" in this order)
- "no make the best 3d printer if any make the best robotic arm make the best kiln or whatever make a 3d printer that can
  print metal or something gene editing stuff, a meta quest 3, ever part on seed studio jet packs or hover crafts drones
  submarines, lab level equipment x-rays, infrared … lidar like I need these and so much more but you can finish this
  first" (2026-10-10: the Ender-3 finished first; then Now item 14, in that order)
- Always: no mocks; every number sourced, or labelled typical or an estimate; failures reported honestly.

## What can honestly be promised

A real product's exact surfaces are its maker's CAD and are not public. What is public and can be matched: its published
dimensions (length, width, height, wheelbase, track, seat height), its tyre and wheel sizes, its engine or motor and its
ratings, its mass, its part list and how it goes together. A product made here is true to those, with each figure's
source, and its shape approximates the surface. Say that plainly. Never call a model exact when it is not.

## One owner per concern: extend these, never write a second one

| Concern | Owner |
| --- | --- |
| Words to wants, figures, questions; designs from laws | `src/nexus/conceive.ts` |
| Where a make ask goes (designed, invented, a kit by the thing's own name, a place, the inventory's own) and what of it was not done, said beside what was made | `src/nexus/route.ts` (`routeMake`; the forge's `perform` carries it out) |
| Inventing what turns one thing into another (waves into drinking water, a weight's fall into light, a flame into cold): a chain of real effects whose ports mate (power as effort × flow, a bond graph's rule; shafts of one kind but not one speed matched by as many gear stages as the ratio needs), sized by conservation from its source, under the floor of the laws, each effect made of inventory parts or said as a gap; on a board as steps | `src/nexus/invent.ts` (`invent`, `boardOfInvention`) |
| Generated structure for any intent; its body in space | `src/nexus/generate.ts`, `src/nexus/realize-space.ts` |
| Machines as real hardware from generated elements | `src/nexus/embody/` (`any.ts`, `tree.ts` load path, `stock.ts`) |
| Real products and what each contains, down to elements | `src/nexus/inventory.ts` (about 1,500 items) |
| Parts made to any size by their standard | `src/nexus/families.ts`, `catalogue.ts`, `partspace.ts` |
| Parts designed once in 3D from their standard, saved by name and category, used by every build (`use("bolt M8x30")`); assemblies of them (a bolted joint) | `src/nexus/components.ts` (kit `part`; checked over every catalogue size in `tests/nexus/components.test.ts`) |
| A part's mass from its shape, material and fill | `src/nexus/mass.ts` (re-exported by `kits.ts`) |
| Whether a drawn part holds every part its inventory says is in it, all the way down (`missingIn`); each component's own check runs it | `src/nexus/components.ts` |
| Every electronic package drawn whole from its outline (JEDEC: DIP, SOIC, SSOP, TSSOP, MSOP, QFP, QFN, SOT, TO-92, TO-220, TO-263, DO-35/41/201, SMA; EIA chip cases; leaded resistors with IEC 60062 bands; LEDs): one list of solids each, its die on its paddle and a bond wire to each lead, from which both its mass (the kinds' and families' g) and its drawing are read, checked against makers' published weights (MCC, Yageo) | `src/nexus/packages.ts` (`pkgSolids`, `chipSolids`, `axialResistorSolids`, `ledSolids`, `smdLedSolids`, `pkgMass`, `chipCode`, `bandsOf`), drawn by `src/nexus/components.ts` (`semiParts`, `passiveParts`); `tests/nexus/packages.test.ts` |
| Board parts drawn from their makers' drawings, each its own pieces down to its contacts (USB-C, HDMI A/C/D, USB-A single and stacked, RJ45 with its magnetics and lights, microSD push-push, pin headers, FPC and board-to-board sockets, tact switches (side-pushed, and top-pushed as a photo measures one), a micro-USB B (the spec's mouth in its family's outline), a 3225 ceramic crystal (alumina base, gold seal ring, Kovar lid), a fiducial, the 3.5 mm jack, a PicoBlade wafer, an electret microphone, FCCSP and LPDDR packages, moulded inductors), placed by a board's layout | `src/nexus/boardparts.ts` (`BOARD_PARTS`) |
| Single-board computers and Picos from their makers' pages (Raspberry Pi 5, 4 B, 3 B+, Zero 2 W, CM5, Pico family; Orange Pi 5 line; D-Robotics RDK X3, X5, S100): their figures and sources, their layouts (measured from photos where `layout` is given, else their class's rules and marked approximate), every part on them (BGA SoC, LPDDR, QFNs, chip passives, each connector, the header pin by pin; a measured board's small parts from its photo's table), every through-hole lead soldered (its pad and fillet, found from the parts as drawn), its silkscreen and copper from its photo as paint on its mask, their holes as mating patterns by bore, weighed from their solids; a Pico's 40 pins and debug pads from Raspberry Pi's own footprint (1.02 mm in 1.7 mm pads, its ground pads square), each run out to a castellation cut in the board's edge (1.0 mm, measured on its photo), its board 1.0 mm; the Pico (pico1) and Pico W (pico1w) measured whole: every part named by Raspberry Pi's schematic (rev 3), sized by its maker's datasheet or KiCad's footprint, placed from Raspberry Pi's photo calibrated by its 47 holes (0.03 mm rms), its passives read by eye off that photo (good to 0.2 mm), its silk and copper from it, its pads bright gold (`bright`) as the photo shows | `src/nexus/sbc.ts` (`BOARD_DEFS`, `boardComps`, `thtJoints`, `boardMass`), kinds in `src/nexus/kinds/sbc.ts`, drawn by `components.ts` (`boardParts`); `tests/nexus/sbc.test.ts` |
| The Meca500 (Mecademic's six-axis arm): its figures from its manuals, its kinematics (forward, and inverse over its eight postures), its controller taking its manual's commands and answering in its codes, and the arm drawn with each joint a group a program turns | `src/nexus/meca.ts` (`MECA500`, `fk`, `ik`, `Meca500`), kind `src/nexus/kinds/robots.ts`, drawn by `components.ts` (`armParts`, `ARM_AXES`); `tests/nexus/meca.test.ts` |
| The computer in the room: programs for the boards and the arm in their makers' languages and libraries, run here (Python in Pyodide, shipped with the forge, against stand-ins for gpiozero, RPi.GPIO, Hobot.GPIO, machine, wiringpi and mecademicpy that keep every pin's change in the program's own time; the arm's commands on its controller, the arm moving before you), Claude beside it (the artifact's `sample`, else the ask sent to Claude Code), and each target's steps on the real thing | `src/nexus/codesim.ts` (`TARGETS`, `PY_PRELUDE`, `readPy`, `runMeca`), the phone's Computer app (`computerApp` in `src/nexus/view/apps.ts`), the forge's `computerRun`, `computerAsk`, `playArm`; `tests/nexus/codesim.test.ts` |
| What things cost and where they are sold: each price a seller's own page, the figure it showed and the day seen (prices move: a sighting, never a constant), stock only where the page said it, used or asked-for marked so; the cheapest offer for so many with what it needs that you lack counted in (a Pinecil and the USB-C supply it does not come with) | `src/nexus/prices.ts` (`PRICES`, `cheapest`, `costBy`); `tests/nexus/buildpack.test.ts` |
| Custom parts made from a file by a service: a flat profile (outline, rounded corners, holes; first, a plate drilled to each board's own pattern, ISO 273 clearances, brought in to fit a board maker's $2 size), written as DXF, STL and Gerbers with an Excellon drill file; every way to have it made, costed by each service's own published terms or said to need its quote, cheapest first | `src/nexus/fab.ts` (`plateFor`, `dxf`, `stl`, `gerbers`, `routesFor`, `fabPack`) |
| The soldering kit, each tool drawn whole from what its maker publishes and the rest an estimate said so: PINE64's Pinecil V2 (shell, grip, stainless core, its board's chips in their packages, display, switches, USB-C and DC jack, screws; its TS100-type tip's contacts, sleeve, heater and iron-plated point; 28.65 g drawn against 28) and Hakko's CHP-170 cutters (bulletin PB489: 2.5 mm high-carbon steel, 138 mm, 62 g); the bench's breadboard (BusBoard's BB400: 84 × 54.3 × 8.5 mm, 30 g; its holes where Fritzing's drawing has them; every clip, its walls, backing and legend; its 170, 830 and 1660 by the same rules); Atten's S-11 stand (Adafruit's drawing's figures, which is which read by size: said so), Hakko's 599B cleaner (70 × 71 mm, 86 g; its holder's walls sized by its weight, its material not published) and the 50 g reel of 0.5 mm 63/37 (Adafruit's 1886, Atten TS-635050); Adafruit's Perma-Proto half (1609) from its Eagle board file (420 plated 1.2 mm holes in 1.93 pads, strips and rails bare underneath, its silk), drawn by the boards' own `pcb()`; an AA alkaline cell (IEC 60086-2's LR6 sizes; its can, MnO₂ ring, separator, zinc gel, nail, seal and cap as makers' cross-sections draw them, their thicknesses estimates: 24 g against the typical 23) and Adafruit's 3951 holder (58 × 32 × 14 mm, its knife switch, its 130 mm leads: its listing; its tray, contacts and switch's parts estimates, said so) | `src/nexus/kit-solder.ts` (`pinecilV2`, `tsTip`, `chp170`, `breadboard`, `permaProto`, `helpingHands`, `cq4lf`, `standS11`, `ironInStand`, `hakko599B`, `solderReel`, `aaCell`, `holder3951`), kinds `solderiron`, `flushcutter` (chp-170, chp-170-a), `helpinghands`, `fluxpen`, `switchholder`, `ironstand`, `tipcleaner`, `solderreel` (`src/nexus/kinds/tools.ts`), `breadboard`, `permaproto` (`kinds/industrial.ts`), drawn by `components.ts` (`kitParts`, `compPart`) |
| A soldering lesson done by hand: the bench's layout (a BB400, the Pico's headers in its rows c and h, the Pico on them), the steps of `lessons.ts`'s joint and header lessons each done only when the hands have done it, where the tip and the wire's end are turned into each joint's heat and solder (wire melting on a hot joint, or on the tip and balling on a cold one; a clean tip drawing off excess; neighbours bridged), the iron heating and its tip tinned and dulling; its solder the reel the pack buys (63/37 since 2019, Adafruit's listing). Its second plan, `'proto'` (lessons.ts's `solder-proto`): a 330 Ω resistor, a red LED (only upright and the right way round) and a link of Adafruit's 22 AWG hook-up wire (insulated: it crosses the − rail's pads) in a Perma-Proto lying face up, the board turned over into the helping hands, six joints soldered (each hole's own shape: 0.6 and 0.644 round leads, the LED's 0.5 square legs), each lead bent out 30° and trimmed by the cutters' jaws closed across it (their 8 mm edge, IPC-A-610's protrusion: 0.6–2.5 mm along the lead); then the battery: the 3951's red lead's pin down through the + rail and its black through the − rail from the top, soldered and trimmed underneath, and its knife switch closed lights the LED by the circuit's own current (two fresh alkaline cells at 1.6 V, 0.15 Ω inside each; the LED's drop from its curve, 1.95 V at 20 mA; a joint not soldered or cold is open: 4.0 mA through the 330 Ω), said with what is open when it stays dark | `src/nexus/solder-lesson.ts` (`newBench(plan, build)`: any Perma-Proto build's things, joints, steps and circuit, the LED lesson's by default; `buildSteps`, `seatsOf`, `tick`, `letGo`, `takeUp`, `cut`, `leadAt`, `throwSwitch`, `lit`, `POWER`, `STEPS`, `PROTO_STEPS`, `stepsOf`, `PROTO`, `TRIM`, `readout`); `tests/nexus/solder-lesson.test.ts` |
| The soldering bench in the room: every thing on it drawn by the library (the Pico, its headers, the BB400, the Pinecil in its stand, the cleaner, the reel) on a workbench before you; your right hand takes the iron as a pen (its hold set in the frame of where the hand points, turned into the controller's grip frame, so any controller holds it so), your left the solder (its trigger pulls more wire), either a header or the Pico, let go over its place to put it there; each joint drawn as its solder is (a concave cone, a ball, dull when cold), rosin smoke where it melts, the tip bright when tinned and dark when not, a card with the step, the iron and the joint under the tip; on a screen the moves said in words ("heat pin 3"). Its second bench (`new SolderBench('proto')`, "solder an LED"): the Perma-Proto, the MZ101 helping hands, the resistor, LED and link waiting to its left; a part let go over its holes goes in (its straight leads swapped for leads bent into them, children of the board), the board turned over in the hand and let go at the clips is held upside down by its ends; each joint's cone on the underside with its lead standing out of it, splayed; the CHP-170 held in the right hand (jaws level, opened by their spring), its trigger closing them: what is cut off falls and lies where it lands; the battery holder with its two cells waiting to the left, set on the hands' base once its pins are in, its leads run up to their pins' housings on the rails; a grip on it once soldered (or "close the switch") throws its knife switch, and the LED's lens glows by the current the circuit gives it | `src/nexus/view/solder-bench.ts` (`SolderBench`, `new SolderBench('proto', build)`: any build's parts drawn by the library from its words, each waiting by its form and seated by its holes, its leads bent to its span, each LED lit in its own colour by its own current; "place the green led", "place all"), the forge's `startBench(plan, build)`, `benchWords` ("teach me to solder a red and a green LED", "solder three LEDs"); its test hooks `benchStart`, `benchAct`, `benchRun`, `benchNow`, `benchPoint`, `benchJoint`, `benchLook`, and an emulated headset's `xrGripTo` (a quaternion turns the hand), `xrPress` |
| A hand-soldered through-hole joint: the tip's heat into pad and pin (wet or dry contact), the alloy's solidus and liquidus, the solder fed melting or not, the fillet's volume, graded as IPC-A-610 would (good, too little, too much, cold, overheated) with what to do; its figures estimates chosen so a tinned 330 °C tip melts 60/40 at a Pico pin in about a second | `src/nexus/solder-joint.ts` (`step`, `grade`, `idealVolume`, `timeToMelt`, `ALLOYS`, `PICO_PIN`); `tests/nexus/solder-joint.test.ts` |
| Edges, the language every lesson is said in: a tool's capability meets a thing's feature by a process (a lead into a plated hole, by its form: an axial part bent to its span, a radial one pushed in by its marked lead, a link stripped and stapled, flying leads from the top; the board into the helping hands; the tip tinned; every joint, its heat and its wire from the joint model; every lead trimmed to IPC-A-610's protrusion; the circuit closed, the LED's current where its drop and current agree; the iron put away), alike edges said once, in the order each needs, each step's words from its figures, what touches what said by the board's strips; a build that cannot be done refused with why (a hole too small, a bend too tight for the body by IPC-A-610's lead forming, a wire past the cutters, a tip below the melt, an LED overdriven or unlit). A circuit as nets laid on a Perma-Proto tidily to be soldered (`layProto`, beside the breadboard's `layOut`: a flying-lead part into the rails two columns apart, the outer rail's net brought in by an insulated link, flat parts along a row at least their span apart, standing parts in their net's column into the inner rail, spaced by their bodies, the holes under a body taken; then opens and shorts checked), turned into a build (`buildOn`), the lowest part in first. The LED lesson is its circuit's nets: laid out where the hand had put it, its written steps and its bench's one list; any LED circuit asked for (`ledBuild(colours)`: each LED its own 330 Ω, side by side across the cells; red, green and yellow from Adafruit's listings, blue and white refused on two AAs with why) laid out, taught and set out on the bench to be soldered by hand; the circuit's current per LED where each drop and its resistor share the cells' voltage, their inside resistance shared (`ledCurrents`) | `src/nexus/edges.ts` (`lessonOf`, `buildOn`, `ppAt`, `ledCurrents`, `ledCurrent`, `ppHole`, `ppStrip`, `PERMA_PROTO_HALF`, `PROTRUSION`, `LEAD_BEND`), `src/nexus/embody/breadboard.ts` (`layProto`); the circuits in `lessons.ts` (`ledCircuit`, `ledBuild`, `ledsAsked`, `partsSaid`, `LED_KINDS`, `SOLDER_KIT`, `PROTO_BUILD`); `tests/nexus/edges.test.ts`, `tests/nexus/solder-lesson.test.ts` |
| The materials processor: what a material becomes by what process on what machine, an edge between a machine's reach and a material's needs (a filament printed: its maker's nozzle and bed ranges against a printer's own, an open frame or a soft nozzle said; clay fired: Orton's cone for the body, a bisque through quartz's change slowly, a program a kiln runs, a kiln's rating against the cone; metal poured: `cell.ts`'s metals against its furnace's model), each step's words from those figures, what cannot be done refused with why, every machine's verdict on a material at once (`processorFor`). Its machines: Prusa's MINI+ and MK4, Bambu Lab's X1 Carbon, Paragon's SC-2 and Skutt's KM-818 kilns, the workshop's kiln and furnace | `src/nexus/processor.ts` (`printWith`, `fire`, `pour`, `processorFor`, `FILAMENTS`, `PRINTERS`, `CONES`, `CLAYS`, `KILNS`, `FURNACE_MAX`); `tests/nexus/processor.test.ts` |
| A lesson for every step of making a thing for real: steps in order, each with a check you can see, its dangers first, its tools by their price keys, its source; which a build's processes call for, and those no lesson covers said | `src/nexus/lessons.ts` (`LESSONS`, `lessonsFor`, `ledResistor`) |
| A build pack: what is asked for (and what you have, and would spend) read into the library's parts, each at its cheapest real offer; what making it calls for worked out from what it is (a card and supply for a Pi, headers soldered or bought on, whichever costs less overall); only the bench those steps need; the custom part and its cheapest maker; what would spend less; the lessons; as a page, a zip, the phone's Build pack app, words in the room ("what do I need to build …") and `npm run pack` | `src/nexus/buildpack.ts` (`pack`, `haveOf`, `packText`, `packZip`, `packPart`), `src/nexus/pack-main.ts`, the phone's `packApp` (`src/nexus/view/apps.ts`), the forge's `packFor`, `packWords` |
| The life graph: the user's own nodes (people, places, times, memories, notes) and the textbooks' (the eleven messengers the user named, each with what it is, what it is made from, where it is made and acts, what it rises and falls with; the brain's regions, the glands and organs, the states they shape), every link seen from either end; the brain map (a midline view, schematic, said so); nodes in the library name their entries (`brain.ts`, `human.ts`, `molecules.ts`); the user's own kept in their browser; on the phone as the Life graph app (the map, the lists, a node with all it touches round it, link anything to anything, a memory of anything); time as the messengers' daily rhythms (melatonin's day level, its onset 2 h before sleep and its night peak by age, Kennaway 2023; cortisol's waking rise, 38–75 % at 30 min, and its late-night ceiling), set by when the user sleeps and wakes: a time node ("3am", "7:30 pm") and melatonin and cortisol each show the other by what it is doing then, and each messenger's day drawn on the phone with now marked | `src/nexus/life/graph.ts` (`LifeGraph`, `BRAIN_MAP`, `MESSENGER_IDS`), `src/nexus/life/rhythm.ts` (`MELATONIN`, `CORTISOL`, `RHYTHMS`, `momentOf`, `hourOf`, `dayOf`, `clock`), `lifeApp` in `src/nexus/view/apps.ts`; `tests/nexus/lifegraph.test.ts`, `tests/nexus/rhythm.test.ts` |
| The robot the user asked for (welds, solders, types, sees, hears, smells, feels, grabs, changes its own grip, uses any tool): each ability an edge between what a task needs (a tool's mass and grip, a force pressed, how near it must come, which senses and how finely: a camera's pixels across the thing at its distance, a microphone's noise under a voice, a force sensor's step under the press) and what its parts give, each a real one by its maker's figures (Mecademic's Meca500 and Universal Robots' UR5e; Robotiq's 2F-85 (which feels its own grip, so no force sensor is added to it: a Nano17 there would be overloaded) and Inspire Robots' RH56DFX; ATI's QC-11 changer and Nano17; Raspberry Pi's Camera Module 3, Intel's D435, TDK's INMP441, Bosch's BME688; the Pinecil, the CHP-170, Abicor Binzel's 1.2 kg MIG torch, Cherry's 45 cN key); what it cannot do refused with why; a robot designed for any set of tasks from the least parts that meet them (`robotFor`); its soldering the lessons' own steps, said as its hands doing them; words in the room ("design a robot that can weld, solder and type"), which stand the robot so designed before you as the library draws it, each part opening into its own (what is not drawn yet said: the Meca500 on a table) | `src/nexus/robot.ts` (`ARMS`, `HANDS`, `CHANGER`, `SENSORS`, `TOOLS`, `TASKS`, `canDo`, `robotFor`, `robotTasks`, `robotWords`, `pixelsAcross`), the forge's `seeRobot`; `tests/nexus/robot.test.ts` |
| Six-axis arms by their makers' Denavit–Hartenberg tables (the UR5e first: Universal Robots' d1 162.5, a2 −425, a3 −392.2, d4 133.3, d5 99.7, d6 99.6 mm): where every joint and the flange are for any angles, the angles that put a tool at a point pointing a way (damped least squares, the point first with the base turned toward it, then the pointing too; its miss said), and the arm drawn as a housing round each axis and a tube along each link, each joint a group its program turns, its tool in the flange's frame. A robot drawn from the library's own parts for whatever its design has (`robotPart(design)`: its arms, changers, hands and senses as its tasks call for; the user's, `robot jarvis`, all of them): its table on a braced frame, two UR5e arms each bolted down by Universal Robots' pattern (four M8 on Ø 132 mm, 20 N·m) and posed by that inverse kinematics over its own side of the work (`ROBOT_CELL`), a QC-11 where a tool bolts on and its hand on each flange (the RH56DFX: palm, six drives each with its board, four fingers and a thumb, the index tip a Nano17 of six silicon gauges; the 2F-85 (`gripperParts`): its coupling and housing, its two four-bar fingers pinned where Robotiq's own model (ros-industrial/robotiq, BSD) puts them, its pads 85 mm apart and 162.8 mm up open), the Camera Module 3 on the right wrist (where soldering needs it: a 0.6 mm lead from 200 mm), the D435 on a mast aimed down at the work, an ear-and-nose board (an INMP441's die and package in its 4.72 × 3.76 mm lid, a BME688) under it; every kind's drawing checked by `missingIn` and its mass; the drawing checked against the design as an edge (each camera, from where it is drawn, puts 3 pixels across what its tasks need and has the work in its view; the arms clear each other and the mast) | `src/nexus/dharm.ts` (`UR5E`, `fk`, `flangeOf`, `ik`, `dhArmParts`), `src/nexus/kit-robot.ts` (`handParts`, `gripperParts`, `ftParts`, `changerParts`, `depthCamParts`, `camModuleParts`, `earNoseParts`), kinds `robotarm UR5e`, `robothand`, `toolchanger`, `ftsensor`, `depthcamera`, `gassensor`, `robot jarvis` (`src/nexus/kinds/robots.ts`), drawn by `components.ts` (`robotPart`, `robotParts`, `ROBOT_CELL`); `tests/nexus/dharm.test.ts` |
| The robot at the soldering bench: the robot its design draws, standing with the bench's things on its own table (the bench's plywood top and legs put away), doing the LED lesson by the bench's own words in its steps' order (place all, board in the hands, the battery, take the iron and the solder, tin, wipe, then each joint heated until it takes solder and fed until graded good, more wire paid out whenever less than 12 mm stands out, each lead cut at 1.5, the switch closed), its arms following by their own inverse kinematics where the bench puts the iron's grip, the wire's held end and the cutters (each joint turned at most 1.5 rad/s); words in the room ("let the robot solder it", "stop the robot") | `src/nexus/view/robot-bench.ts` (`RobotAtBench`), the forge's `robotSolders`, test hooks `robotBench`, `robotRun`; `SolderBench.ownTable` |
| A maker's own 3D assembly drawn from the library: its parts read from the maker's CAD (`tools/measure/xml3d.py` reads a 3DXML: each part's name, its place by the product tree's matrices, its box and its surface's middle, written as a data file under `src/nexus/models/`; measured numbers only, none of a model's surface copied, so a GPL model stays the maker's), each part's name read into the library's words ("2040 profile" → extrusion 2040 at its length, "42-34 motor" → stepper nema17 34, "625pillow" → bearing 625, "M4X8 Socket Head Screw" → screw M4x8), each library part fitted to its box (axes by length, ways by where its body's weight lies, its leads left out, a lead screw not a lead, a part all of wire (a coil spring) fitted whole) and placed by the model's own matrix; a part the model lists apart that the library draws inside another (a lead screw's nut) moved to where the model has it (`DRAWN_IN`); the model turned to face the library's front, +x (`FRONT`: the Ender-3's is its -z, where its screen is); what the library does not make yet drawn as the walls of its box its own surface covers three fifths or more of (`faces`, measured: a sheet's or a moulding's open sides open), a sheet whose surface lies on none of its box's faces as its sheet at its surface's middle, a plate, a closed box or a curved moulding as its box; what the model leaves out between two of its parts run between them by us and said so (`RUNS`: the Ender-3's Bowden tube); what the library does not make yet drawn as its measured box, said as what it is, a folded bracket's box filled by its sheet; the bill of materials the model's own. First: Creality's Ender-3 (its published 3DXML, 311 parts: 188 from the library, 123 boxes so far), 6.7 kg (Creality's UK listing). Then a STEP (`tools/measure/stepasm.py`): VoronDesign's Voron 2.4r2 (1297 parts, its stock options chosen), the model stood on its own up (`UP`: a Fusion export's +z) as well as turned to face front (`frameOf`), names read without Fusion's copy marks (`baseName`), a rail's carriage the model has apart slid along its rail to the model's place on the nearest rail of its size (`DRAWN_IN` by `link`), a part the model has that is run by us instead left out (`RUNS.replaces`), a boxed part coloured and made of what the model's look says (`lookAs`: "Acrylic (Clear)" clear PMMA, "Plastic - Matte (Red)" ABS in its red), a thin part whose broad faces its surface covers a fraction of (a panel's foam tape, a belt loop) drawn as a frame round its edge that wide, measured, and any other boxed part with an outline drawn as that outline through its depth (`ModelInfo.hull`) | `src/nexus/makermodel.ts` (`libraryWords`, `boxedAs`, `lookAs`, `billOf`, `extents`, `frameOf`, `baseName`), `src/nexus/models/ender3.ts`, `src/nexus/models/voron24.ts` (generated), drawn by `components.ts` (`modelPart`), kind `printer3d` (`kinds/robots.ts`, `PRINTER_MODELS`: Ender-3, Voron-2.4) |
| The breakdown queue: every item stored is queued, each thing in it looked up in the table (the inventory, its inner parts, the family that makes that size), what is not there or is listed only as its materials waits, said with what wants it | `src/nexus/breakdown.ts` (`npm run breakdown -- report.md`) |
| A part designed whole (`Part.sealed`, set on every library component) is fitted as it comes: the make pipeline's detail rules, its finish strip and its critic's moves leave it | `src/nexus/make/detail.ts` (`sealedIn`) |
| A miniature guideway's sizes (HIWIN's MGN table) and how it is drawn (every inner proportion named as typical) | `src/nexus/families.ts` (`MGN`, `mgnDims`), `src/nexus/components.ts` (`railParts`) |
| A face that carries what is fastened to it (a carriage's top, a tool flange: `Iface` kind `mount`), the free end of what moves, joined only to what holds it | `src/nexus/kits.ts`, `src/nexus/make/critic.ts` (chains) |
| A fastener locks two links only where it meets the other (apart by more than 20 µm it runs clear, as a rub does) | `src/nexus/make/critic.ts` (held) |
| A hole drilled in any part, any way (`Part.cuts`: round, or n-sided, a hex socket): cut from what is drawn (three-bvh-csg, each shape drilled once), its volume out of the mass | `src/nexus/kits.ts` (`Cut`), `src/nexus/view/kit3d.ts` (`drill`), `src/nexus/mass.ts` |
| A cutaway draws a solid's section flat and hatched in its own colour (a shell's inside as it is) | `src/nexus/view/look.ts` (`cut`) |
| Room to slide: a part that slides (`travel.slide`, a carriage on its rail) swept along its travel with all of its link; a fixed part in that sweep is in its way | `src/nexus/make/critic.ts` (critique) |
| How a picture is lit: a part alone in a light tent, as a maker's product photograph is taken (white walls, a softbox overhead and in front, a lit sweep under it, so metal mirrors white: a Pi 5's shells and pins read their photo's), exposed as for a grey card so a colour reads as itself, on Khronos' PBR Neutral curve so a colour keeps its hue (a Pi 5's mask reads its photo's), a vehicle in the softbox studio; an underside lit from below, as a board is turned over to photograph it; the forge room the same way (a room for metal to mirror, its light exposed for a grey card, `forge.ts`) | `src/nexus/view/look.ts`, `src/nexus/view/forge.ts` |
| Parts placed by their mating faces: a port's pattern of holes, threads or pins (`Port` in `kits.ts`; NEMA faces, ISO 9409 flanges) mates its mirror, the part is placed by it and its fasteners laid from the library | `src/nexus/mate.ts` (`fit`, `mate`, `assemble`; kit `part` with "a + b") |
| What an inventory item looks like, how it comes apart | `src/nexus/pieces.ts`, `looks.ts` |
| An item the library draws, seen in 3D: drawn as the library draws it (not its look), taken apart by the viewer's own explode, each piece opening into its pieces, the part the library draws it as, or (one piece) what it is made of, drawn | `src/nexus/view/explode.ts` (`showPart`), `src/nexus/components.ts` (`componentOf`) |
| How a drawn part comes apart (`explode`): what is the part itself stays, those round it go out from its middle, those at its middle out past its ends along its length (heaviest first, each kind as one), and no piece parted onto another | `src/nexus/view/kit3d.ts` |
| The library on the phone: every drawn kind of part by trade, each size with its drawing's mass against its standard; three presses to stand it before you | `src/nexus/view/apps.ts` (`libraryApp`) |
| A clear room: in a headset nothing floats in your view unasked (one chip asks what to build; the clock is on the phone; the robot stands back to your side, its thought shown only while you look at it); the phone drawn half again a real one's size | `src/nexus/view/forge.ts` |
| Things with choices, as a placed tree of parts | `src/nexus/kits.ts` (drawn by `view/kit3d.ts`) |
| Conditions on loads, holds and reach | `src/nexus/conditions.ts` |
| Conditions on how a made thing is (age, setting, material, size) | `src/nexus/make/conditions.ts` |
| Edges as made (radius by material and process) | `src/nexus/finish.ts` |
| Oriented-box layout and contacts of a placed tree | `src/nexus/make/space.ts` |
| Attention to detail (joints, fasteners, seals, finishes, wear) | `src/nexus/make/detail.ts` |
| Critic (room to move, held up, walls, through, standing) | `src/nexus/make/critic.ts` |
| The make pipeline (conditions, detail, critic, in rounds) | `src/nexus/make/pipeline.ts` |
| Wheeled machines of every kind, from their published figures | `src/nexus/machines.ts` (cars, karts, ATVs, motorcycles, forklifts, trucks, lawn tractors) |
| Lofts, bent tubes, turned profiles: mass, bounds, covering boxes | `src/nexus/form.ts` |
| Freeform surfaces: NURBS curves and skins, interpolation, regions and trims, fairness, zebra, draft, seams | `src/nexus/surface.ts` |
| Panelled bodies on curve networks (side skin, hood, deck, cabin; arches from the wheels' sweep; keep-outs) | `src/nexus/panels.ts` (rules in `BODY_RULES`, their history in `RULE_UPDATES`) |
| Vehicles as points in a want-space (not a maker) | `src/nexus/vehicle.ts` |
| Interface contracts (shaft/bore, studs/nuts, chain/sprocket, drive/torque) | `Iface` in `src/nexus/kits.ts`, checked in `src/nexus/make/critic.ts` |
| A made thing on its own, framed, for review | `view/look.html` → `src/nexus/view/look.ts` |
| Places, rides and games | `places.ts`, `karting.ts`, `coaster.ts`, `pingpong.ts` |

## The organising principle: interfaces, envelopes, one graph

Parts declare what they provide and require (`Iface`): a hub needs a shaft of its bore, a nut needs a stud of its thread, a
driven axle carries at most a torque, a chain needs sprockets of its pitch. The critic pairs and checks every one with
numbers, and an interface is a connection, never an interference (an axle in its hub is not "in its way"). Interference is
judged by envelope, not by box: a wheel sweeps a ring (tyre to rim bore) with room to its arch and beside its sidewall, a
blade sweeps a disc inside its housing, and no repair rests a part on a moving one. Grow this, rather than adding layers:
next are mounts (bolt patterns), electrical (voltage, current), thermal (heat rejected) and service access.

Branches beyond the standard tools (the user asked for what no one thought of; keep growing these):
- **A skin is the fairest surface that clears everything inside it.** Arches come from the tyre's sweep through its lock
  and bump, not drawn; the hood from the engine and strut tops under it; next the roof from the seated people's heads.
- **The mesh is only ever a projection of the math.** Never edited, so it never needs retopology.
- **Panels are named by what they are for** (the arch of the front wheel, the hood), so changing a figure re-makes the
  same panels: no topological naming problem.
- **Constraints carry their reason**: G1 across a shut line because a highlight crosses it; a crease at the belt by
  intent; clearance because a part moves.
- **Lines are control polygons, not points forced through**: a B-spline never wavers more than its polygon.
- **Coincidence by construction, not by checking**: a panel meeting another is built on its edge (split by knot insertion,
  then built column for column on it), so they share knots and meet everywhere; the critic's check then only confirms.
- **A maker checks its own output before the critic does**: the wheelhouse liner is pushed out where it is in the sweep;
  what goes inside a body (seats, the dashboard's beam) is fitted to the body as made, measured off its skins.
- Next: shut lines placed by draft (where one press direction stops being formable); zebra judged from where people
  stand; rule updates kept only when they help cases they were not tuned on and do not worsen the blind judge.

Capability atlas (the user's direction, 2026-10-08): learn from open engineering tools (FreeCAD and Open CASCADE for
geometry and constraints, Gmsh and SALOME for meshing, MOOSE, Elmer, Code_Aster and OpenFOAM for physics, OpenModelica
for systems, LinuxCNC for machines) as ideas and architecture, each operation as UI → command → data → algorithm →
constraints → failure modes. Ideas and interfaces only: their code is GPL/LGPL and is not copied in.

Known gaps (from the 2026-10-08 audit, still open):
- the inventory knows what is in a product but not where it sits; the kits know where but not what. Joining them, so
  every placed part is an inventory item that expands into its sub-parts, is the merge that ends "two generators".
  Begun (2026-10-08, the user: "design each sub component … save that component under its name and category and now
  every other build using any of them is already ready"): `components.ts` draws stock and fasteners from their standards
  (9,074 catalogue sizes), and the wheel nuts, wheel studs, the detail pass's bolts and anchor bolts come from it; the
  ball bearings (rings, raceways, balls, cage, shields or seals), the steppers (bells, stator and coils, rotor cups
  and magnet, shaft, bearings, tie screws, leads and plug) and the HIWIN MGN7–15 guideways, C and H (rail, block,
  end caps, seals, retaining wires, both circuits of balls, seal screws; MGN15's grease nipple; within 6 % of HIWIN's
  masses, 66 balls in an MGN12H as rebuilders count) are drawn whole, every part their inventory lists inside them.
  GT2 pulleys (any tooth count and bore: PowerDrive's pitch and outside diameters and set-screw rule) and their ISO 4029
  set screws, in tapped holes drilled through the hub, are drawn whole too.
  The breakdown queue (2026-10-09) waits on nothing: 59,046 items taken, none listed only as its materials, none
  shaped from several materials in one process, nothing missing from the table, its deepest chain of things in
  things 12. The ~410 parts broken out of them have typical sizes and looks (`looks.ts`), not yet drawn as components
  of their own. Still
  drawn inline by their makers: most of every machine (brackets, bearings, springs, hinges, wiring, electronics);
  each is next to become a component, smallest and commonest first;
- the forge routes a make ask by `route.ts` (2026-10-09: a kit found by the thing's own name, never by a word in what it does, which had made nine sunflowers of "a drone that plants trees"; what it does that was not done, said); `embodyAny` is still apart from it;
- the go-kart on the track (`view/kart3d.ts`) is drawn by hand, apart from `machines.ts`;
- planes, jets, cranes and power tools are not yet in `machines.ts` (a fixed wing, a boom, a handheld tool are each new
  architectures: add them as data on general builders, as the wheeled ones are).

## Before writing a new file or function

1. `ls src/nexus` (the whole listing: never `| head`, which hid `vehicle.ts` once and it was overwritten) and grep for the
   concern. If it is in the table, extend its owner. Before writing a file, check that it does not already exist.
2. If what you are about to write makes one named thing (a car builder, a kart builder), stop. Find the general rule
   that makes it and its relatives from data (a wheeled vehicle from its axles, tyres, frame, seats, power, implements).
   Per-product data (a real model's published figures) is fine; per-product code is a template.

## The drift gate: before spending a round on a fix

Recursive work drifts toward the most efficient path for the measurement, not toward what was asked. The gate is
the pause before a round where you ask whether this fix is still worth making. Pass it before tuning anything:

- **Will what I am tuning against still exist?** Do not tune a critic, a test or a threshold against a thing about
  to be replaced. (2026-10-08: the critic was not tuned to the box-bodied car, because that car was being replaced by
  a general vehicle maker. Tuning to it would have made the critic fit a template.)
- **Is the number I am moving the thing they care about?** Joint counts, test totals and finding counts are proxies.
  The person cares whether the thing is real, recognisable, buildable and expandable.
- **Am I picking this fix because it is easy to measure, or because it matters most?** If the most visible flaw
  in the screenshot is not what this round fixes, say why.
- **Would the user call this round progress if they saw only its result?** If not, stop and re-aim.

Say the gate's answer out loud in the round's notes when it changes what gets done, so the choice can be seen.

## Every round, ask these, then act on the answers

1. Does this already exist somewhere? Am I about to make a second one?
2. What does a person see first? Render it, framed so it can be seen whole, take a screenshot, and look at it.
   Would they recognise it at a glance? What would they call cheap, wrong or fake?
3. Blind check: give the screenshot to an agent with no context. Ask what it is and what is wrong with it. If it
   cannot name the thing, the thing is not done, whatever the tests say.
4. Am I measuring what they care about, or what is easy to measure?
5. Re-read "What is wanted" above. Is this round still aimed at it?
6. What am I not asking? (Scale against a person? How does it move? What does it sound like? What happens when it
   is clicked, taken apart, driven?)
7. What would a real engineer expect that is plainly absent? Ask a fresh agent each round, with this file's owners table,
   for the concepts a mechanical, electrical and manufacturing engineer would expect and do not find (2026-10-08: the
   user had to name mating parts, a bolt pattern finding its reverse and connecting, though "next are mounts (bolt
   patterns)" was already written here; holes cut, fits and tolerances, placement by constraints, fasteners sized by
   load, motion, electrical and fluid ports, shape from process and cost were absent with it). Act on what it names
   before polishing what the critic counts: a missing concept costs every build, a patched overlap costs one.
8. Run the breakdown queue (`npm run breakdown -- report.md`). Nothing new may wait as "not in the table", and the families
   at the top of "only its materials listed" and "several materials in one shaping" are broken out before new ones are
   added: a part is not stored until it is broken down. A new id is checked against the table first: an id written twice
   replaces the first unseen (`WRITTEN_TWICE` in `inventory.ts` must stay empty).

## Measuring a real product (a board, a tool, a machine)

Bottom up, never the whole first: the smallest parts are drawn from their makers' drawings before the thing they make
is put together from them.

1. Name each part: the maker's own list (its schematic, its manual's parts), else the part whose drawing fits what the
   photos show, said as "fits by its size", never as its part number.
2. Each part's sizes from its maker's drawing or its standard. KiCad's footprints (github.com/KiCad/kicad-footprints)
   are drawn from datasheets and name them: `python3 tools/measure/kicad.py '<library>.pretty/<glob>'` gives each one's
   outline, pads and datasheet. A size from nowhere is labelled typical or measured, with how.
3. Where it sits: calibrate every photo by four points known in millimetres (its mounting holes):
   `tools/measure/photo.py calibrate`, then read positions off its millimetre grid (`photo.py grid`) and outlines
   (`photo.py outline`). Tall parts lean out from the photo's middle: their tops are not their footprints.
4. More than one photo: a top view for where things are, the sides and corners for what a top view hides (a port on
   its side, a button pushed sideways, what lights are in a jack's face), the underside for what is under it. Where a
   side has no photo, its parts are marked as not placed from one.
5. Check the drawing against every photo: `npm run boardmap -- <id> <out.json>` writes each placed part's outline, and
   `photo.py overlay` draws them on each calibrated photo. A part not on its own outline is wrong.
6. Where its maker publishes a 3D model (a STEP: Raspberry Pi's mechanical reference models), read every solid's box
   from it (`tools/measure/step.py boxes`) and check the layout against it (`step.py check`): that model is the
   placement, the photo the look (mask, ink, copper, markings, what the model leaves out).
7. From each photo, in this order, each step feeding the next: `photo.py silk` (the silkscreen as a PNG on the board's
   mm), `photo.py small --silk` (the small parts, the ink left out), the board's small table into its layout, the map
   again, then `silk` and `traces` once more with the small parts placed. Vet every find on the photo by eye and
   `--skip` (recorded in the generated file) the regions where they were words, test pads or a hole's rim.
8. Through-hole joints are not drawn by hand: every lead, leg or tail that goes down through the board gets its pad and
   a solder fillet from `thtJoints` in `sbc.ts`. Give a through-hole part its tails (from its footprint and drawing)
   and it is soldered.
9. Then the room: render it, compare it beside its photos, and a blind judge (the round's steps 2 and 3).

The measuring tools live in `tools/measure/` (Python 3 with numpy, opencv-python-headless, scipy and pillow:
`pip install -r tools/measure/requirements.txt`):
- `photo.py`: calibrate a photo by known points, its mm grid, where a pixel is, part outlines, the drawn layout over the
  photo, and `same`: one region of the thing cut from every calibrated photo of it, side by side. `small`: every small
  part a board's photo shows (tan ceramic bodies and dark bodies found in two masks so a shadow does not join them; each
  blob eroded until it is one part; capacitors and resistors put to their EIA case by width, a resistor only with tin
  past its ends, SOT-23 or SOT-323 by body length and their legs counted, moulded inductors near square; what is like
  none of these listed, not guessed), `--ts` writing the board's table (`sbc-opi5-small.ts`), `--why X,Z` saying how
  the blob at a point was taken or why not, `--skip` for a logo; its mask told by the board's own hue and tin as far
  paler than it (a green board as well as a blue), two pale ends 0.45 or 0.75 mm apart paired into an 0201 or 0402,
  `--silk` to leave the ink out, `--keep` a picture of where it looked, `--tins` the lone ends it saw. `silk`: the
  silkscreen (pale grey ink, saturation under 45 and value over 215 or `--val`, a tin end's solid blob dropped) as a
  bilevel PNG with `--ts`, and the ink's colour; `--skip X0:Z0:X1:Z1` blanks a box (a part's tin read as ink). `traces`: the copper under the mask, its mask's hue read off the board, and the
  bare mask's and copper's colours printed. The camera is recovered from each calibration as a rigid pose (solvePnP),
  its lens from the homography or, given `calibrate --tall PX,PY=X,Z,Y` (points of known height: a pin's tip, a jack's
  top corner), the lens that puts them where they are seen; with three holes and such points the plane itself comes
  from the camera they fit (a fourth hole hidden), and a point given as `=X,Z!` is not pulled onto a pad: `at PX,PY@H`
  reads a point on a top H mm up, and every part hides what its solids' corners, each at its own height (the
  boardmap's `pts`), cover when seen along the camera's rays. `camera`: that camera as the look page's query (`cam`,
  `aim`, `up`, `fov`; render at the photo's size with `LOOK_W`/`LOOK_H`, `--top` the look page's `lift`), so the
  drawing is rendered as the photo saw it, with a calibration for the render: then `same` on the photo and the render
  sets every part beside itself, and `colour` (`X,Z@Y` a place Y mm up) reads the same places in both and the colour
  to draw to match. A feature on a part's face (a spring lanced in a shell, a seam) is measured by casting its pixel's
  ray onto that face's plane. Tools for reading a part off a photo by its camera: `px X,Z@Y` (where a point Y mm up is
  seen), `rise FX,FY:TX,TY` (how tall an edge stands, from its foot and its top), `wall CAL y=H|x=X|z=Z LO1:HI1:LO2:HI2`
  (a millimetre grid on a part's top or side plane over the photo), `mark CAL X,Z@Y …` (guessed corners and edges,
  ranges `X0:X1,Z@Y`, drawn over the photo: a guess checked by eye) and `same --edges` (a render from the photo's own
  camera, its edges drawn over the photo: every edge that is not where the photo has it shows). A circle (a jack's
  bore) is fitted to its ellipse in the photo through the camera; its size does not fix how far along the ray it is,
  so hold one coordinate (a drawing's centre) or match a second feature. `small --why X,Z` names what hides a point
  (the part, its shadow, a word, the ink, a hole or a skip) or the mask its colour falls in; the small parts it placed
  before are not counted as drawn; a blob is left out for the ink only where it is ink with no tan body; tin is told
  from a tan body by its greyness as well as its brightness. Where a photo is too soft for it, its parts are read by
  eye off the photo at its own size (a native-pixel grid), located through the camera at their tops' height, and
  kept beside the finder's rows (`PI4_HAND`), the finder skipping that region. `rectify CAL y=H|x=X|z=Z
  LO1:HI1:LO2:HI2 --ppmm --blobs dark|bright --edge --both`: a part's face warped square-on through the camera, a mm
  grid on it, its cuts, slots and ribs listed as mm boxes; run on a render's calibration too and the two lists are
  what the model has wrong. A plane a little off the true face, or a camera fitted far from that part, shifts all it
  reads alike: read features against the face's own edges, and the camera's error at a known hole near it.
- `step.py`: a maker's STEP model read with gmsh: `boxes` (every solid's box on the board's drawing frame, top or under)
  and `check` (each drawn part against the solid it should be, coverage both ways).
- `tools/look.mjs`: render any ask from named views (`node tools/look.mjs <viewer dir> <out dir> "name|words=…&view=…"`;
  `ortho=1` for a view to set beside a photo, `exposure=`, `env=`, `sun=`, `tone=aces` to try the light; it prints the
  part's `lift`; the light tent's `back=` (a backdrop as bright as the photo's studio had it), `floor=rrggbb` (what it
  stands on), `probe=1` (each metal face's reflection captured from where it stands, itself left out, box-projected:
  a socket's mouth dark inside as photographed; each plate (two sizes over `probeown=` mm, 4 by default, the third a
  millimetre or less) its own, a shield bent round a part sharing its part's; a board in about 90 s on software GL:
  `LOOK_WAIT=` ms for longer); `ao=` mm, screen-space occlusion, does not darken
  a mouth yet and drops the sun's shadow: not to be trusted); `npm run boardmap -- <id> <out.json>` writes a board's drawn outlines for `photo.py overlay`.
- `tools/forge-run.mjs`: a script of moves played in the forge with screenshots along it (`js:` an expression in the page,
  awaited; `say:` words; `wait:`; `shot:`; `view:`; `png:name|expr` a picture the page makes, as `phonePeek('life',
  'map')` gives any phone app's screen; each answer printed to 400 characters, `FORGE_OUT=` for more, `FORGE_SHOT_MS=`
  for a slow close view), `FORGE_Q=xr=quest3` for an emulated Quest 3 whose hands the hooks
  move and press: how the soldering lesson is played through by hand and checked.
- `tools/forge-look.mjs`: the forge room as the user stands in it, what is asked stood before you as "3d <words>" does
  (`"name|words|key=…&sky=…&env=…&lamp=…"` to try its light): a part judged in the room it is seen in, not only on
  the look page's bench.
- `xml3d.py`: a maker's 3D assembly in 3DXML (SOLIDWORKS and CATIA export it; Creality's Ender-3 is published so): `tree`,
  `parts` (every part's world matrix, its box in its own frame and the world's, its surface's middle, how much of each box
  face its surface covers: its triangles, strips and fans read per rep), `count` (its bill of materials) and `ts` (the
  data file `makermodel.ts` draws from). Read in place: a 3DXML is a zip, nothing extracted.
- `stepasm.py`: a maker's 3D assembly in STEP (AP203/AP214: Fusion 360, SOLIDWORKS, Onshape, FreeCAD; the Voron's is
  published so), read straight from its entities, no CAD kernel (gmsh's OCC import of the Voron's 241 MB ran 25 min
  without finishing; this reads it in 50 s): the same `tree`, `parts`, `count` and `ts` as xml3d.py, each part's box
  from its edges walked along their curves (lines, circles and ellipses by angle, B-splines by de Boor), a sphere cap's
  pole added, its cover from its flat faces' areas, its material, density and look (appearance name and colour) from
  the model, the assembly it is in; `--drop REGEX` leaves an instance and all under it out (a model's alternatives:
  one option built), `--whole REGEX` measures an assembly as one part (a carriage, a board), `--no-outline REGEX` writes no outline for
  the parts the library draws (its fasteners, rails, motors: a smaller file). Each part's outline (`outline`): its
  edges' convex hull along whichever of its axes shows it least like its box, 20 corners at most. The Voron's options
  are in the header of `models/voron24.ts`; rerun the same command to regenerate.
- `views.py`: every photo on one sheet; one photo in full-size tiles to scan; a zoom; `find`: a part boxed in one photo
  found in the others by its features (says "not found" rather than guess when the views differ too much: then
  calibrate each photo by four points of the same plane and use `photo.py same`).
- `kicad.py`: a part's drawing from KiCad's footprints, with the datasheet it was drawn from.
When a step takes working out by hand twice, it becomes a tool here, and a line in this list.

## Now (2026-10-09; read before resuming)

In order; each through the breakdown queue, rendered, compared with its photos and judged blind before it is done:
1. The Orange Pi 5 (done 2026-10-09 but for its underside): its parts first (`src/nexus/boardparts.ts`: each
   connector, switch, header, socket and chip from its maker's drawing or standard, with what fits by size said so),
   placed from its measured photos (`BOARD_DEFS` layouts in `sbc.ts`), the right way round; its 98 small parts placed
   where its photo shows them (`sbc-opi5-small.ts`, by `photo.py small`); its HDMI's top lanced for its two spring
   fingers and open at the back where the contacts go down, as its photo shows; its chips marked as read off the photo;
   its mask and its small parts coloured as the photo shows them. Its underside has no photo reachable here yet
   (orangepi.org/.net refuse this network): the M.2 socket is placed from its two holes, the rest said as not placed.
   The look page's light room is exposed as for a grey card (0.44: its floor and a Pi's mask read their own colours;
   at the old 1.3 everything read nearly three times too bright); the forge is a dark room with no environment, so a
   colour is kept as its photo's. Metal is drawn by what it reflects head on (gold's linear (1.0, 0.77, 0.34)), and brass,
   bronze, tin and solder are metal to the viewer.
2. The Raspberry Pi 5 (done 2026-10-09 but for its underside's look): placed from its maker's 3D model (RP-004882-DD),
   its board 1.4 mm with R3 corners and the Active Cooler's two holes; its USB stacks and RJ45 inside and under as their
   footprints have them (mouths lined, insulator blocks, tails and legs through the board, soldered); its silkscreen,
   copper, mask colour, chip markings (BCM2712's lid measured at its height: 16.4 mm, pressed with a band), a crystal
   the model leaves out and 18 small parts from Raspberry Pi's own photo (raspberrypi/documentation 5.jpg). Many of its
   0201s are past what that photo resolves and are not placed. Then rendered from its photo's own camera and set beside
   it part by part (photo.py camera): its header pins tin, its FPC sockets cream with brown locks, its USB stacks'
   latch springs, side springs, windows, detents and insulator posts and its jack's skirts and marking (a Trxcom
   TRJG0926HENL) where the photo shows them, every shell bright nickel; the forge's light, which had washed its mask
   to a clipped mint (#63ffdd for 0x21b984), exposed for a grey card with a room for metal to mirror (its shells had
   drawn black). Still to do: the LPDDR's marking turned and its maker's logo, RP1's logo, the micro-HDMIs' backs.
3. Every other board the same way, each marked approximate until it is: the Pi 4B, 3B+ and Zero 2 W next (their photos
   are in raspberrypi/documentation's computers/raspberry-pi/images; look for their makers' STEP models first). The
   Pi 4B (measured 2026-10-09, no longer approximate): its photo calibrated by three holes and six header pin tips (its
   fourth hole hidden: 2.5 px rms); its ports from Raspberry Pi's drawing (its Ethernet on the far side, the USB stacks
   nearer); its sockets, SoC, memory and can from the OpenSCAD Raspberry Pi library's Pi 4 (its frame x across, y
   along: our z = 56 − its x), which agrees with the drawing on every port; its VL805, PHY, PMIC, inductors and PoE
   header cast down from the photo; its silk, copper, mask and 28 small parts from the photo; its camera and display
   sockets 15 contacts at 1 mm, their lock a grey bar up the outer side, contacts tin; every chip's marking as read.
   Its AV jack (J7, the 3B+'s too) its own body off both photos: a black face 6.7 × 6.1 with its bore (r 1.75, fitted
   to its ellipse) centred 3.05 up, its nose 1.5 past the edge, a tin-plated shell with windows and soldered legs, a
   back housing open on its lever; at 53.85 mm, as its photo puts it (its drawing says 53.5, the hole beside it true
   to a pixel). Its two lights at its left edge (paler than any capacitor, ACT and PWR printed by them; 0603s by their
   blur, the photo soft there). Its power chip's corner read by eye: a SOD-123F diode, two DFNs, a SOT-23-6, its
   capacitors 0603 and 0805 (the finder had taken some for inductors), its R47 inductor 3.6 × 4.0 × 2.5 (its base's
   edge, not its top, gave its place), J2's three unfitted holes. Its USB-A tongues' tips 0.6 mm behind their faces
   (the photo shows a band of tongue under each lip, which a tip 1.3 mm in hides) and their four USB 2.0 contacts
   springs bowed 0.5 mm under them. Its USB 2.0 stack 0.8 mm further out than the OpenSCAD model put it (its face
   2.95 mm past the edge, not 2.1): its legs' plated holes by J11 read on the board at 71.88 and 77.55, its footprint's
   0.98 and 6.65 from its back; its side read square-on (rectify): springs U-cuts 7.0 to 1.55 behind its face, rooted
   in front and tapering, two embossed slots near its face, a rib between its mouths, its back plate's flap 2.6 mm onto
   each side with two latch windows. Its USB 3.0 stack 0.5 mm further out (its top's front edge against the render's,
   read as the USB 2.0's was: 0.08 mm off once its legs placed it). Its Ethernet jack Trxcom's outline (TRJG0926HENL's
   listing: 15.90 × 21.30 × 13.40; its face reads 15.8 wide) 0.7 mm further out by its top's back edge (±0.5: the
   photo's camera is fitted far from that corner and its two edges disagree); its face read square-on: the shield
   across it, the moulded mouth 11.6 × 8.4 a millimetre under its top with the latch's notch under it, the shield's
   cut 12.7 wide round it, its green light in the corner toward the USB ports. Still to do: its Ethernet's place to
   0.2 (a photo with that corner in view, or its own drawing), its marking's sizes (Trxcom's logo large), the
   metal's tone (the photo's shells grey with deep reflections, the tent's all bright), the DFN under its power chip
   larger than drawn, its USB-C's rear legs, its underside (no photo).
4. The Meca500 checked the same way: each link and drive against its manual's drawing; how it moves against its limits.
   Its `joint-drive` (listed only as its materials) is the one item the breakdown queue leaves waiting: it is broken
   out (motor, reduction, encoder, bearings, each drawn) in this round, not before.
5. The soldering kit as real tools (iron, stand, sponge, solder, flux, helping hands, cutters), judged until real. Done:
   the Pinecil, the CHP-170, Atten's S-11 stand and its sponge, Hakko's 599B, the reel, the BB400, the Perma-Proto
   half (from Adafruit's board file and photo). A board's silk or a breadboard's legend is one print (`Part.prints`:
   words and lines laid out on one face, one texture), and every plated hole one turned piece. The helping hands drawn
   (Adafruit's 291, the MZ101: its 2.5" lens, two clips and wing nuts as listed, the rest estimates said so, posed
   holding an 81 mm board upside down). Chip Quik's CQ4LF flux pen (Adafruit's 3468: 132 × 16 × 16 mm, 19.5 g, 10 ml;
   its barrel, cap and nib colours from two image listings, its photos not reachable here; its shape estimated, said
   so), on the bench beside the cutters. Still to do: the pen's label and photo check; the S-11's figures placed from
   its drawing's picture; the 599B's material; metals reading flat in the bench's dark room (its light, not their
   finish).
6. Hands-on lessons in the room: the user holds the iron, heats pad and pin, feeds solder; a joint judged cold, good or
   bridged; a step done only when done (the Pico's headers first). Done (2026-10-09): "teach me to solder" sets out the
   bench; both hands work it in a headset (checked on an emulated Quest 3: iron taken, wire paid out, pin 1 soldered
   good by hand), words on a screen. The Pico and Pico W are measured (2026-10-09: their schematics' parts where their
   photos show them; the W's CYW43439 can, antenna parts and debug holes too). A blind judge named the Pico at once;
   mended from its findings: dies and wires kept under thin mouldings, chip mouldings sharp-edged (their own edge
   rule), the board's inner copper pulled back from its edge, chip LEDs drawn by the one LED generator (clear block
   over base, die and wire), header pins pointed and single rows notched, the breadboard's channel its whole length
   and its holes dark inside, the plain CHP-170 without the -A's clip, the reel's outer turns wound and labelled,
   small things' contact shadows to their size, micro-USB tails tin. Still approximate: the passives' kinds and cases
   (read by eye), the RP2040's laser-marked logo, the crystal's marking, switch and USB heights (no side photo), the
   underside (TP1–TP6), vias and SMD solder fillets, metal finishes judged matte. The Pico 2 and 2 W are still their
   class's layout: measure them from pico-2s.png the same way. The second lesson (2026-10-09, "solder an LED"): an LED
   and its 330 Ω resistor on a Perma-Proto, a link of hook-up wire to its + rail, the board in the helping hands, six
   joints, each lead trimmed with the cutters in the right hand; played through by words in the browser (every step
   done, each lead left 1.5 mm) and drawn (parts seated, board upside down in the clips, leads splayed and standing,
   offcuts on the hands' base). Still simplified, said so: a part's leads bend themselves as it goes in (the hand does
   not bend them), the board lies flat on the bench with leads through it while parts go in. Played by hand on an
   emulated Quest 3 too (parts in, the LED refused lying and reversed, the board refused until turned over: done; the
   joints and trimming by hand still to finish, the emulator's trigger presses held till the bench answers; a run
   that touched the wire to each joint once left them 36 to 50 % full: the wire's end melts back out of reach, so a
   hand has to keep pushing it in, as a person does). Judged
   blind (2026-10-09): the Perma-Proto's top, the resistor, the link, the offcuts and the circuit taken for real;
   mended by cause from its findings: the iron let down onto its rings by its own shape (it hovered on an assumed
   radius), the second bench's stand moved so the iron points past the clips, the underside's strips cut at every
   hole (they ran across them), its gold bright (its listing: gold-plated), the joints satin with a rosin ring, the
   LED diffused deep red (Adafruit's 299, priced as its own line beside the pack's resistor LED) with a low bond
   wire and a cupped anvil, the clips' teeth a millimetre deep and closed square on the board, the cleaner's brass
   packed to its mouth, the CHP-170 drawn standing open on a V spring. Still from that judge: the iron's tip and
   cord's strain relief, the S-11's look, the magnifier (flat glass), wound solder's texture, the bench's mat and the
   missing kit (wick, glasses, a lamp). Judged blind again (round 2): the brass wool reads as a smooth gold dish (draw
   its strands), the sponge as one slab, the joints as machined chrome and the rosin ring as a tan sticker (warmer,
   rougher tin; a fainter, broken ring), the clips as cyan slabs with teeth at their tips only and no rivet, the
   cutters' pivot flat and white, the hands' base glossy (crinkle-finished), the iron's tip short (to check against the
   Pinecil's 52 mm), the LED's flat unseen, the spool's texture noisy; its call for the underside's mask is not taken
   (Adafruit's listing: bare underneath). The LED lit (2026-10-09): Adafruit's 3951 holder and two AA cells as a
   third part of the lesson, its leads soldered to the rails and trimmed, its knife switch thrown, the LED lit at
   4.0 mA by the circuit's own figures; played through by words (8 joints good, 8 leads at 1.5 mm, step 11 of 11)
   and drawn (holder on the hands' base, leads up to the rails, the switch closed into its clip, the lens lit).
   Mended from round 2 (2026-10-09): the wool a curled strand standing in the cleaner's mouth, the joints warmer
   with a faint uneven rosin film, the clips pressed channels on a domed rivet with the spring's legs on the levers,
   the cutters' rivet dark and domed, the hands' base crinkle-painted. Judged blind again (round 3): it named the
   bench, the circuit and every tool; its findings mended by cause: the holder's leads ending in black blocks (now
   tinned crimp barrels, the leads out of the holder's end wall), the switch over the cells (moved over the end wall),
   the LED with no glow (a halo and its light on the board), the iron's cord stopping in the air (over the bench's
   edge to the floor), rods drawn as open pipes (every solid tube closed at its ends), a clip's arm run into it (held
   in a sleeve on its lever), the readout's words (a joint's temperature said as now, the done line counting the
   build's joints, the LED's drop in volts). Still from round 3: the S-11 read as a toy tray (third time: check its
   drawing), the sponge a flat slab, the cells bare (no wrapper print), the magnifier with no refraction, the robot's
   red disc and a checker tile off the table's edge in the room (not the bench's), the table untextured.
7. Prices for the common parts the build packs list without one (motors, hot ends, boards, belts, rails…).
8. Edges (the user, 2026-10-09: "universal edge … every setup that would be the same have a edge"): one graph of what
   works on what. A tool's capability meets a part's feature (an iron and a plated hole with a lead in it; cutters and
   a lead; a kiln and a fired body; a printer and a filament), by a process, its figures read from both ends (the
   alloy's liquidus, the pad and lead, the cutters' largest wire, the protrusion IPC allows), its dangers and its
   source. A lesson is the edges a build's parts and tools make, in the order each edge needs (insert before solder
   before trim before power), each step's words generated from its edge's figures: the same setup, the same edge, the
   same step. The hand-written lessons are checked against what the edges generate, then replaced by it. Begun
   (2026-10-09): `edges.ts`; the LED lesson's ten steps (its written lesson and its bench's) are its build's edges said
   (the battery holder now in once the board is held, then all eight joints, then all eight trims: alike setups one
   step); its refusals tested. Then the circuit laid out by its nets (`layProto`), which put every part where the
   hand had (the lowest in first now: the link, the resistor, the LED), and a circuit never shown (two LEDs, each with
   its resistor) laid out and taught, the second LED three columns over for its rim. Then (2026-10-09) any LED circuit
   asked for in words is laid out, taught, set out on the bench and soldered by hand there (`ledBuild`, the bench and
   its view taking any build: a red and a green LED played through to both lit, 4.0 and 3.0 mA by their own drops).
   Next: the Pico's headers on the
   same edges (a strip of pins into a breadboard, a board onto them); parts of three leads and more (a transistor, a
   button, a chip in its socket); words in the room ("teach me to solder two LEDs") making the circuit, its lesson and
   its bench; the bench drawing any build's parts where its layout puts them.
9. Tools for every build, through the breakdown queue and judged like the soldering kit: a basic 3D printer, the most
   advanced, the machines that make their parts, a kiln and its firing workflow, robot arms. Begun (2026-10-10): the
   Ender-3 from Creality's own published assembly (`makermodel.ts`), every part where its maker put it, 274 of its 311
   parts the library's own: its extrusions and their end caps; four NEMA17 steppers, socketed as Creality's are (a
   6-way JST PH side-entry socket in each rear bell, S6B-PH-K-S from JST's catalogue); 31 bearings; its GT2 pulleys and
   belts; its screws, nuts, washers, countersunk screws (ISO 10642), set screws and T-slot nuts; its 13 V-wheels
   (OpenBuilds' Solid V Wheel), 11 spacers and 5 eccentric spacers (OpenBuilds'); its bed's yellow springs and its
   levelling wheels; its T8 lead screw with its nut where the model has its Z nut (`DRAWN_IN`); its whole hot end
   (the heat block, heat break, heat sink, PTFE tube and couplers sized from its model, its MK8 nozzle with a 6 mm hex,
   6 × 20 heater, NTC thermistor, 40 × 10 fan); its extruder's drive gear; its three endstops (a lever micro switch on a
   board with an XH socket). The rest (36: its brackets, plates, shroud, enclosures, screen, power supply, spool holder)
   their measured boxes, drawn as the walls their surface covers. 7.5 kg drawn against its 6.7 kg (+13 %). Masses no
   seller lists (a fan's, nozzle's, heater's) are estimates and say so. Judged blind (2026-10-10, round 2: 4/10, read
   as an Ender-3 at 90 %; its Bowden tube then run, its carriage plate a plate, its shroud open below): round 1 (3/10): its
   hot end hidden in a solid box (now its shroud's measured walls), its layout read as mirrored (it was seen from the
   back: now turned to face the front), its springs not yellow (now yellow); still open: its screen, power supply and
   spool holder as boxes, its lead screw drawn smooth, no wiring or filament, its extruder and brackets as boxes; round 2's
   judge read its knobs as too large and its frame as narrow (both as Creality's model has them: kept). Next:
   those, then judged again; then the most advanced printer by the same builder from its maker's model (Prusa's and
   Voron's are published).
10. The robot the user wants: welds, solders, types on a computer, sees, hears, senses touch and smell, grabs, changes
   its own grip, uses any tool: each sense and each hand from real parts, on the same edges as a person's lessons. Begun
   (2026-10-09): `robot.ts`, what it can do as edges between its tasks' needs and its parts' figures; for the user's
   list it is two UR5e arms with RH56DFX hands and QC-11 changers, a Camera Module 3, a Nano17, an INMP441, a BME688
   and a D435, every task yes with its figures; a Meca500 with a gripper refused with why. Then (2026-10-10) drawn
   from those parts (`dharm.ts`, `kit-robot.ts`, the kind `robot jarvis`: "robot jarvis" in the viewer), each arm
   posed by its own inverse kinematics over the table's middle. Its table's and mast's sizes, the hand's and the
   changer's insides, and the arm's housings are estimates sized to their makers' outlines and masses, said so. Judged
   blind (2026-10-10): named two UR5e-like arms with Inspire-RH56-like hands at once; mended by cause: the hands had
   hung past the table's edge (each arm now posed over its own side of the work), the mast's cameras were tilted up at
   the ceiling (now aimed at the work by the geometry, and the Camera Module 3 moved to the right wrist, where the
   soldering task's 200 mm needs it), the table braced, the bases bolted by UR's pattern, the fingertips rounded, the
   thumb resting as a hand's does. Still from that judge: cables, the control boxes and teach pendant, an E-stop,
   levelling feet, the hands' look against Inspire's photos, nothing on the table to work on. Then (2026-10-10) any
   design drawn as its tasks make it (two arms or one, a changer only where a tool bolts on, only the senses asked
   for) and stood before you when asked for in words; the 2F-85 drawn from Robotiq's model (most designs without a pen
   grip take it; its housing a box where the real one is rounded, its links bars between their pivots). Then
   (2026-10-10) it soldered the LED lesson on the bench by the bench's own words, its arms by their inverse
   kinematics (`robot-bench.ts`): played through in the browser, 47 steps, all 8 joints good, 8 leads at 1.5 mm, the
   LED lit at 4.03 mA. Judged blind (2026-10-10): named two UR-style arms soldering a perfboard with an LED; its first
   finding mended by cause: its hands came down through the board and the magnifier, because the bench held the iron,
   the wire and the cutters as a person before it does and the robot reached from behind across the work, and when
   that was mirrored, the iron's slant put the flange within 170 mm of its arm's own axis, which a UR5e does not reach
   (so the hand stayed at ready): now the bench holds them from its far side when the robot does (`SolderBench.from`,
   `way`), the iron steeper, each hand behind and along what it holds, and the robot's table 800 mm deep with its arms
   275 mm back (estimates). Still from that judge, and simplified, said so: its grip on each tool not drawn (the bench
   poses what is held, the hand goes to it), parts put into the board by the bench's words while its hands are over it,
   the iron's cord ending at the bench's old edge, no fume or heat at the work, the holder's leads rigid. Next: its
   grips drawn (the pen grip round the iron); welding and typing done the same way on their own benches.
11. A materials processor: what any material becomes by what process (melt, cast, fire, mill, print, refine), on edges. Begun
   (2026-10-09): `processor.ts`, its three heats: four Prusament filaments on three printers (the PC Blend's bed at the
   MINI+'s 100 °C said as the low end, ASA refused on it), four clay bodies by Orton's cones in three kilns (cone 10
   refused in the SC-2, the workshop's kiln held to the SC-2's rating, which it stands for), four metals poured from the
   furnace. Next: milling and turning (a cutter's speed and feed against a stock's), refining (filament from pellets
   or scrap, a Filabot's or 3devo's), a material's own edges to what it was (scrap PLA back to filament), the
   processor in the room ("what can I print ASA on", "fire this mug") and on the phone.
12. The user's likeness from their photos: the parametric human fitted to measured photos (a likeness, said so; not a
   scan). Waiting on the photos.
13. The life graph: a node graph where a link between two nodes shows each to the other when either is clicked: time,
   people, places, memories, and the eleven messengers (dopamine, melatonin, oxytocin, adrenaline, cortisol,
   endorphins, serotonin, acetylcholine, norepinephrine, GABA, glutamate), sourced; and a map of every brain region.
   Begun (2026-10-09): `life/graph.ts` and the phone's Life graph app: the eleven messengers (Kandel's and Purves's
   textbooks, summarised), 33 regions on a midline map with the groups they are part of, the adrenals, gut and
   muscles, fifteen states; the user adds people, places, times and memories and links any node to any other, each
   link seen from both ends, kept in their browser. Then (2026-10-09) the daily rhythms of melatonin and cortisol from
   their studies, set by the user's own sleep, a time node linked to each by its level then, each messenger's day
   drawn on the phone. Next: the other messengers' rhythms where studies give one (serotonin and dopamine's are weak
   and contested in blood: say so rather than draw one); the map's regions drawn as shapes, not dots; dates as well
   as hours; the 3D brain from brain.ts.
14. The user's list (2026-10-10), after the Ender-3 is finished and judged, each by the same builder (a maker's own
   published model where there is one, else its maker's drawings, every part from the library, through the breakdown
   queue, judged blind): the best 3D printer (Prusa's and Voron's models are published), a printer that prints metal
   (a bound-metal filament printer and a laser powder-bed fuser, how each makes a part, its sintering furnace), the best
   robot arm, the best kiln and its firing workflow; gene-editing lab equipment (a thermal cycler, a centrifuge, gel
   electrophoresis, pipettes, a biosafety cabinet: the instruments, as instruments); the Meta Quest 3 (the headset the
   forge runs on); every part Seeed Studio sells (its catalogue read into the inventory by category); jet packs,
   hovercraft, drones, submarines (by the vehicle maker: lift, thrust and buoyancy by their laws); lab instruments: an
   X-ray tube and detector, infrared cameras and spectrometers, lidar. Where a thing is hazardous to build (an X-ray
   source, a jet pack's engine), what it is and how it works drawn fully, and the hazard said plainly.
   Done 2026-10-10 (round 1): the Voron 2.4r2, 250 mm, from VoronDesign's published STEP (`tools/measure/stepasm.py`,
   a direct reader of the STEP's product tree, its solids' edges walked for their boxes: 241 MB in 50 s), its stock
   options chosen where its CAD holds several at once (seven controller boards, three skirt sizes, two probes, two XY
   endstops, Gates and generic idlers, 6 and 9 mm Z tensioners: an Octopus, the Omron TL-Q5MC2, microswitches, Gates,
   9 mm, said in its data file's header), its carriages slid along their rails to where the model has them, its parts
   coloured as its model colours them (printed ABS black and red, clear acrylic panels, a tan PEI sheet): 1297 parts,
   936 from the library, 354 boxes (its printed parts, its boards and supplies, its chains); 18.5 kg summed (an
   estimate: VoronDesign gives none). Judged blind: named a Voron 2.4 (85 %), 3/10 (its toolhead a plain block, no
   wiring, belts and motors hard to see, boxy printed parts). Round 2: each boxed part drawn by its outline from its
   least box-like side (stepasm's `outline`: the convex hull of its edges along that axis, 20 corners at most, a
   measure), so its chains' links, its moulded housings and its toolhead are no longer boxes; judged again: named a
   Voron 2.4 (80 %), 3/10 (the toolhead still a block; belts, motors and wiring not seen). Next: the Stealthburner
   still a rounded red block over its fans and hot end (an outline from one side cannot hollow it); no wiring; its
   supply and display boxes; the PTFE guide tube's run outside its top panel.
   Metal printed (2026-10-10, `processor.ts`): two ways. Bound metal on the Voron (`printWith` with BASF's Ultrafuse
   316L, its TDS v1.1: 230–250 °C, bed 90–120 °C on glass with glue or polyimide tape, 15–50 mm/s; printed 1.20 × in X
   and Y and 1.26 × in Z, solid), then `sinter`: catalytic debinding in nitrogen with a few per cent of nitric acid gas
   at 100–140 °C (BASF's Catamold brochure), sintered in pure hydrogen in a cold-wall retort (BASF; Nabertherm), about
   1380 °C (an estimate), 7850 kg/m³ after; its green density from its spool (3 kg on 250 m of 1.75 mm: 4.99 g/cm³) and
   so its binder, 13 % by mass; both steps a service (Elnik, DSH Technologies), their hazards said (nitric acid,
   formaldehyde, hydrogen 4–75 % in air). The Voron's limits from VoronDesign's own Klipper config (extruder 270 °C, bed
   120 °C, 250 × 250 × 210 mm). And laser powder-bed fusion (`fuse`) on the EOS M 290 by its data sheet (400 W, 100 µm,
   7 m/s, 250 × 250 × 325 mm, 30 µm layers), with 316L, Ti-6Al-4V and AlSi10Mg powders and their hazards (class 4
   laser, argon, combustible dust). In words: "how do I print metal", "print ultrafuse on the voron", "fuse titanium on
   the eos 30x30x45". The EOS M 290 drawn (`pbf EOS-M290`, `pbfParts`): its cabinet, frame and feet, its stainless
   chamber at 1000 mm with its windowed glove-port door, the build plate in its cylinder, the dispenser, the recoater on
   two MGN15 rails, the scanner, F-theta lens, fibre laser, filter, control cabinet and screen; its outside, build
   volume, laser and 1250 kg EOS's, its inside's layout and makeup typical (estimates); drawn 98 % of its mass. Judged
   blind: 2/10, read as a powder-bed metal printer (30 %); its panels' coincident faces and its door's gaps fixed, a
   handle, hinges, window frame, emergency stop and chamber lamp added. Next: a sintering furnace drawn; the kiln.
The network allows GitHub and package registries only: makers' sites and datasheets come through search snippets,
Tavily's extract (it returned Würth's datasheet text), Firecrawl (its credits are low) or GitHub (KiCad's libraries,
makers' documentation repos: ask for each with add_repo first, then a blobless clone and fetch only the files needed);
the user can widen it under the environment's Network access.

## Working here

- Gate: `npm run gate` (long; run it in the background and log to a file). Build the viewer:
  `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
