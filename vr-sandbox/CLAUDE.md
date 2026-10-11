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
| Words to wants, figures, questions; designs from laws | `src/nexus/ask/conceive.ts` |
| Where a make ask goes (designed, invented, a kit by the thing's own name, a place, the inventory's own) and what of it was not done, said beside what was made | `src/nexus/ask/route.ts` (`routeMake`; the forge's `perform` carries it out) |
| Inventing what turns one thing into another (waves into drinking water, a weight's fall into light, a flame into cold): a chain of real effects whose ports mate (power as effort × flow, a bond graph's rule; shafts of one kind but not one speed matched by as many gear stages as the ratio needs), sized by conservation from its source, under the floor of the laws, each effect made of inventory parts or said as a gap; on a board as steps | `src/nexus/ask/invent.ts` (`invent`, `boardOfInvention`) |
| Inventing a *machine* rather than a flow: what each unit of machine affords (slide, turn, grip, deposit, cut, see, think, hold), each unit a real assembly of library parts with what it carries, what it raises, what it costs and where that figure came from; an ask read into the affordances it needs and the size it needs them over; the units stacked so every stage carries the mass above it and a payload is checked against the grip that holds it; refused with the number that refuses it | `src/nexus/ask/machine.ts` (`UNITS` as `screwAxis`, `beltAxis`, `turnAxis`, `HOT_END`, `SPINDLE`, `GRIPPER`, `EYE`, `BRAIN`, `baseFrame`; `stack`, `composeMachine`, `machineText`, `machineWords`, `machineParts`), `npm run machine`; its bill thrown at a works by `machineBuild` in `src/nexus/works/builds.ts` |
| Generated structure for any intent; its body in space | `src/nexus/ask/generate.ts`, `src/nexus/substrate/realize-space.ts` |
| Machines as real hardware from generated elements | `src/nexus/embody/` (`any.ts`, `tree.ts` load path, `stock.ts`) |
| Real products and what each contains, down to elements | `src/nexus/parts/inventory.ts` (about 1,500 items) |
| Parts made to any size by their standard | `src/nexus/works/families.ts`, `catalogue.ts`, `partspace.ts` |
| Parts designed once in 3D from their standard, saved by name and category, used by every build (`use("bolt M8x30")`); assemblies of them (a bolted joint) | `src/nexus/parts/components.ts` (kit `part`; checked over every catalogue size in `tests/nexus/components.test.ts`) |
| A part's mass from its shape, material and fill | `src/nexus/parts/mass.ts` (re-exported by `kits.ts`) |
| Whether a drawn part holds every part its inventory says is in it, all the way down (`missingIn`); each component's own check runs it | `src/nexus/parts/components.ts` |
| Every electronic package drawn whole from its outline (JEDEC: DIP, SOIC, SSOP, TSSOP, MSOP, QFP, QFN, SOT, TO-92, TO-220, TO-263, DO-35/41/201, SMA; EIA chip cases; leaded resistors with IEC 60062 bands; LEDs): one list of solids each, its die on its paddle and a bond wire to each lead, from which both its mass (the kinds' and families' g) and its drawing are read, checked against makers' published weights (MCC, Yageo) | `src/nexus/boards/packages.ts` (`pkgSolids`, `chipSolids`, `axialResistorSolids`, `ledSolids`, `smdLedSolids`, `pkgMass`, `chipCode`, `bandsOf`), drawn by `src/nexus/parts/components.ts` (`semiParts`, `passiveParts`); `tests/nexus/packages.test.ts` |
| Board parts drawn from their makers' drawings, each its own pieces down to its contacts (USB-C, HDMI A/C/D, USB-A single and stacked, RJ45 with its magnetics and lights, microSD push-push, pin headers, FPC and board-to-board sockets, tact switches (side-pushed, and top-pushed as a photo measures one), a micro-USB B (the spec's mouth in its family's outline), a 3225 ceramic crystal (alumina base, gold seal ring, Kovar lid), a fiducial, the 3.5 mm jack, a PicoBlade wafer, an electret microphone, FCCSP and LPDDR packages, moulded inductors), placed by a board's layout | `src/nexus/boards/boardparts.ts` (`BOARD_PARTS`) |
| Single-board computers and Picos from their makers' pages (Raspberry Pi 5, 4 B, 3 B+, Zero 2 W, CM5, Pico family; Orange Pi 5 line; D-Robotics RDK X3, X5, S100): their figures and sources, their layouts (measured from photos where `layout` is given, else their class's rules and marked approximate), every part on them (BGA SoC, LPDDR, QFNs, chip passives, each connector, the header pin by pin; a measured board's small parts from its photo's table), every through-hole lead soldered (its pad and fillet, found from the parts as drawn), its silkscreen and copper from its photo as paint on its mask, their holes as mating patterns by bore, weighed from their solids; a Pico's 40 pins and debug pads from Raspberry Pi's own footprint (1.02 mm in 1.7 mm pads, its ground pads square), each run out to a castellation cut in the board's edge (1.0 mm, measured on its photo), its board 1.0 mm; the Pico (pico1) and Pico W (pico1w) measured whole: every part named by Raspberry Pi's schematic (rev 3), sized by its maker's datasheet or KiCad's footprint, placed from Raspberry Pi's photo calibrated by its 47 holes (0.03 mm rms), its passives read by eye off that photo (good to 0.2 mm), its silk and copper from it, its pads bright gold (`bright`) as the photo shows | `src/nexus/kinds/sbc.ts` (`BOARD_DEFS`, `boardComps`, `thtJoints`, `boardMass`), kinds in `src/nexus/kinds/sbc.ts`, drawn by `components.ts` (`boardParts`); `tests/nexus/sbc.test.ts` |
| The Meca500 (Mecademic's six-axis arm): its figures from its manuals, its kinematics (forward, and inverse over its eight postures), its controller taking its manual's commands and answering in its codes, and the arm drawn with each joint a group a program turns | `src/nexus/machines/meca.ts` (`MECA500`, `fk`, `ik`, `Meca500`), kind `src/nexus/kinds/robots.ts`, drawn by `components.ts` (`armParts`, `ARM_AXES`); `tests/nexus/meca.test.ts` |
| The computer in the room: programs for the boards and the arm in their makers' languages and libraries, run here (Python in Pyodide, shipped with the forge, against stand-ins for gpiozero, RPi.GPIO, Hobot.GPIO, machine, wiringpi and mecademicpy that keep every pin's change in the program's own time; the arm's commands on its controller, the arm moving before you), Claude beside it (the artifact's `sample`, else the ask sent to Claude Code), and each target's steps on the real thing | `src/nexus/teach/codesim.ts` (`TARGETS`, `PY_PRELUDE`, `readPy`, `runMeca`), the phone's Computer app (`computerApp` in `src/nexus/view/apps.ts`), the forge's `computerRun`, `computerAsk`, `playArm`; `tests/nexus/codesim.test.ts` |
| What things cost and where they are sold: each price a seller's own page, the figure it showed and the day seen (prices move: a sighting, never a constant), stock only where the page said it, used or asked-for marked so; the cheapest offer for so many with what it needs that you lack counted in (a Pinecil and the USB-C supply it does not come with) | `src/nexus/parts/prices.ts` (`PRICES`, `cheapest`, `costBy`); `tests/nexus/buildpack.test.ts` |
| Custom parts made from a file by a service: a flat profile (outline, rounded corners, holes; first, a plate drilled to each board's own pattern, ISO 273 clearances, brought in to fit a board maker's $2 size), written as DXF, STL and Gerbers with an Excellon drill file; every way to have it made, costed by each service's own published terms or said to need its quote, cheapest first | `src/nexus/parts/fab.ts` (`plateFor`, `dxf`, `stl`, `gerbers`, `routesFor`, `fabPack`) |
| The soldering kit, each tool drawn whole from what its maker publishes and the rest an estimate said so: PINE64's Pinecil V2 (shell, grip, stainless core, its board's chips in their packages, display, switches, USB-C and DC jack, screws; its TS100-type tip's contacts, sleeve, heater and iron-plated point; 28.65 g drawn against 28) and Hakko's CHP-170 cutters (bulletin PB489: 2.5 mm high-carbon steel, 138 mm, 62 g); the bench's breadboard (BusBoard's BB400: 84 × 54.3 × 8.5 mm, 30 g; its holes where Fritzing's drawing has them; every clip, its walls, backing and legend; its 170, 830 and 1660 by the same rules); Atten's S-11 stand (Adafruit's drawing's figures, which is which read by size: said so), Hakko's 599B cleaner (70 × 71 mm, 86 g; its holder's walls sized by its weight, its material not published) and the 50 g reel of 0.5 mm 63/37 (Adafruit's 1886, Atten TS-635050); Adafruit's Perma-Proto half (1609) from its Eagle board file (420 plated 1.2 mm holes in 1.93 pads, strips and rails bare underneath, its silk), drawn by the boards' own `pcb()`; an AA alkaline cell (IEC 60086-2's LR6 sizes; its can, MnO₂ ring, separator, zinc gel, nail, seal and cap as makers' cross-sections draw them, their thicknesses estimates: 24 g against the typical 23) and Adafruit's 3951 holder (58 × 32 × 14 mm, its knife switch, its 130 mm leads: its listing; its tray, contacts and switch's parts estimates, said so) | `src/nexus/machines/kit-solder.ts` (`pinecilV2`, `tsTip`, `chp170`, `breadboard`, `permaProto`, `helpingHands`, `cq4lf`, `standS11`, `ironInStand`, `hakko599B`, `solderReel`, `aaCell`, `holder3951`), kinds `solderiron`, `flushcutter` (chp-170, chp-170-a), `helpinghands`, `fluxpen`, `switchholder`, `ironstand`, `tipcleaner`, `solderreel` (`src/nexus/kinds/tools.ts`), `breadboard`, `permaproto` (`kinds/industrial.ts`), drawn by `components.ts` (`kitParts`, `compPart`) |
| A soldering lesson done by hand: the bench's layout (a BB400, the Pico's headers in its rows c and h, the Pico on them), the steps of `lessons.ts`'s joint and header lessons each done only when the hands have done it, where the tip and the wire's end are turned into each joint's heat and solder (wire melting on a hot joint, or on the tip and balling on a cold one; a clean tip drawing off excess; neighbours bridged), the iron heating and its tip tinned and dulling; its solder the reel the pack buys (63/37 since 2019, Adafruit's listing). Its second plan, `'proto'` (lessons.ts's `solder-proto`): a 330 Ω resistor, a red LED (only upright and the right way round) and a link of Adafruit's 22 AWG hook-up wire (insulated: it crosses the − rail's pads) in a Perma-Proto lying face up, the board turned over into the helping hands, six joints soldered (each hole's own shape: 0.6 and 0.644 round leads, the LED's 0.5 square legs), each lead bent out 30° and trimmed by the cutters' jaws closed across it (their 8 mm edge, IPC-A-610's protrusion: 0.6–2.5 mm along the lead); then the battery: the 3951's red lead's pin down through the + rail and its black through the − rail from the top, soldered and trimmed underneath, and its knife switch closed lights the LED by the circuit's own current (two fresh alkaline cells at 1.6 V, 0.15 Ω inside each; the LED's drop from its curve, 1.95 V at 20 mA; a joint not soldered or cold is open: 4.0 mA through the 330 Ω), said with what is open when it stays dark | `src/nexus/teach/solder-lesson.ts` (`newBench(plan, build)`: any Perma-Proto build's things, joints, steps and circuit, the LED lesson's by default; `buildSteps`, `seatsOf`, `tick`, `letGo`, `takeUp`, `cut`, `leadAt`, `throwSwitch`, `lit`, `POWER`, `STEPS`, `PROTO_STEPS`, `stepsOf`, `PROTO`, `TRIM`, `readout`); `tests/nexus/solder-lesson.test.ts` |
| The soldering bench in the room: every thing on it drawn by the library (the Pico, its headers, the BB400, the Pinecil in its stand, the cleaner, the reel) on a workbench before you; your right hand takes the iron as a pen (its hold set in the frame of where the hand points, turned into the controller's grip frame, so any controller holds it so), your left the solder (its trigger pulls more wire), either a header or the Pico, let go over its place to put it there; each joint drawn as its solder is (a concave cone, a ball, dull when cold), rosin smoke where it melts, the tip bright when tinned and dark when not, a card with the step, the iron and the joint under the tip; on a screen the moves said in words ("heat pin 3"). Its second bench (`new SolderBench('proto')`, "solder an LED"): the Perma-Proto, the MZ101 helping hands, the resistor, LED and link waiting to its left; a part let go over its holes goes in (its straight leads swapped for leads bent into them, children of the board), the board turned over in the hand and let go at the clips is held upside down by its ends; each joint's cone on the underside with its lead standing out of it, splayed; the CHP-170 held in the right hand (jaws level, opened by their spring), its trigger closing them: what is cut off falls and lies where it lands; the battery holder with its two cells waiting to the left, set on the hands' base once its pins are in, its leads run up to their pins' housings on the rails; a grip on it once soldered (or "close the switch") throws its knife switch, and the LED's lens glows by the current the circuit gives it | `src/nexus/view/solder-bench.ts` (`SolderBench`, `new SolderBench('proto', build)`: any build's parts drawn by the library from its words, each waiting by its form and seated by its holes, its leads bent to its span, each LED lit in its own colour by its own current; "place the green led", "place all"), the forge's `startBench(plan, build)`, `benchWords` ("teach me to solder a red and a green LED", "solder three LEDs"); its test hooks `benchStart`, `benchAct`, `benchRun`, `benchNow`, `benchPoint`, `benchJoint`, `benchLook`, and an emulated headset's `xrGripTo` (a quaternion turns the hand), `xrPress` |
| A hand-soldered through-hole joint: the tip's heat into pad and pin (wet or dry contact), the alloy's solidus and liquidus, the solder fed melting or not, the fillet's volume, graded as IPC-A-610 would (good, too little, too much, cold, overheated) with what to do; its figures estimates chosen so a tinned 330 °C tip melts 60/40 at a Pico pin in about a second | `src/nexus/teach/solder-joint.ts` (`step`, `grade`, `idealVolume`, `timeToMelt`, `ALLOYS`, `PICO_PIN`); `tests/nexus/solder-joint.test.ts` |
| Edges, the language every lesson is said in: a tool's capability meets a thing's feature by a process (a lead into a plated hole, by its form: an axial part bent to its span, a radial one pushed in by its marked lead, a link stripped and stapled, flying leads from the top; the board into the helping hands; the tip tinned; every joint, its heat and its wire from the joint model; every lead trimmed to IPC-A-610's protrusion; the circuit closed, the LED's current where its drop and current agree; the iron put away), alike edges said once, in the order each needs, each step's words from its figures, what touches what said by the board's strips; a build that cannot be done refused with why (a hole too small, a bend too tight for the body by IPC-A-610's lead forming, a wire past the cutters, a tip below the melt, an LED overdriven or unlit). A circuit as nets laid on a Perma-Proto tidily to be soldered (`layProto`, beside the breadboard's `layOut`: a flying-lead part into the rails two columns apart, the outer rail's net brought in by an insulated link, flat parts along a row at least their span apart, standing parts in their net's column into the inner rail, spaced by their bodies, the holes under a body taken; then opens and shorts checked), turned into a build (`buildOn`), the lowest part in first. The LED lesson is its circuit's nets: laid out where the hand had put it, its written steps and its bench's one list; any LED circuit asked for (`ledBuild(colours)`: each LED its own 330 Ω, side by side across the cells; red, green and yellow from Adafruit's listings, blue and white refused on two AAs with why) laid out, taught and set out on the bench to be soldered by hand; the circuit's current per LED where each drop and its resistor share the cells' voltage, their inside resistance shared (`ledCurrents`) | `src/nexus/teach/edges.ts` (`lessonOf`, `buildOn`, `ppAt`, `ledCurrents`, `ledCurrent`, `ppHole`, `ppStrip`, `PERMA_PROTO_HALF`, `PROTRUSION`, `LEAD_BEND`), `src/nexus/embody/breadboard.ts` (`layProto`); the circuits in `lessons.ts` (`ledCircuit`, `ledBuild`, `ledsAsked`, `partsSaid`, `LED_KINDS`, `SOLDER_KIT`, `PROTO_BUILD`); `tests/nexus/edges.test.ts`, `tests/nexus/solder-lesson.test.ts` |
| The materials processor: what a material becomes by what process on what machine, an edge between a machine's reach and a material's needs (a filament printed: its maker's nozzle and bed ranges against a printer's own, an open frame or a soft nozzle said; clay fired: Orton's cone for the body, a bisque through quartz's change slowly, a program a kiln runs, a kiln's rating against the cone; metal poured: `cell.ts`'s metals against its furnace's model), each step's words from those figures, what cannot be done refused with why, every machine's verdict on a material at once (`processorFor`). Its machines: Prusa's MINI+ and MK4, Bambu Lab's X1 Carbon, Paragon's SC-2 and Skutt's KM-818 kilns, the workshop's kiln and furnace | `src/nexus/machines/processor.ts` (`printWith`, `fire`, `pour`, `processorFor`, `FILAMENTS`, `PRINTERS`, `CONES`, `CLAYS`, `KILNS`, `FURNACE_MAX`); `tests/nexus/processor.test.ts` |
| A lesson for every step of making a thing for real: steps in order, each with a check you can see, its dangers first, its tools by their price keys, its source; which a build's processes call for, and those no lesson covers said | `src/nexus/teach/lessons.ts` (`LESSONS`, `lessonsFor`, `ledResistor`) |
| A build pack: what is asked for (and what you have, and would spend) read into the library's parts, each at its cheapest real offer; what making it calls for worked out from what it is (a card and supply for a Pi, headers soldered or bought on, whichever costs less overall); only the bench those steps need; the custom part and its cheapest maker; what would spend less; the lessons; as a page, a zip, the phone's Build pack app, words in the room ("what do I need to build …") and `npm run pack` | `src/nexus/teach/buildpack.ts` (`pack`, `haveOf`, `packText`, `packZip`, `packPart`), `src/nexus/cli/pack-main.ts`, the phone's `packApp` (`src/nexus/view/apps.ts`), the forge's `packFor`, `packWords` |
| The life graph: the user's own nodes (people, places, times, memories, notes) and the textbooks' (the eleven messengers the user named, each with what it is, what it is made from, where it is made and acts, what it rises and falls with; the brain's regions, the glands and organs, the states they shape), every link seen from either end; the brain map (a midline view, schematic, said so); nodes in the library name their entries (`brain.ts`, `human.ts`, `molecules.ts`); the user's own kept in their browser; on the phone as the Life graph app (the map, the lists, a node with all it touches round it, link anything to anything, a memory of anything); time as the messengers' daily rhythms (melatonin's day level, its onset 2 h before sleep and its night peak by age, Kennaway 2023; cortisol's waking rise, 38–75 % at 30 min, and its late-night ceiling), set by when the user sleeps and wakes: a time node ("3am", "7:30 pm") and melatonin and cortisol each show the other by what it is doing then, and each messenger's day drawn on the phone with now marked | `src/nexus/life/graph.ts` (`LifeGraph`, `BRAIN_MAP`, `MESSENGER_IDS`), `src/nexus/life/rhythm.ts` (`MELATONIN`, `CORTISOL`, `RHYTHMS`, `momentOf`, `hourOf`, `dayOf`, `clock`), `lifeApp` in `src/nexus/view/apps.ts`; `tests/nexus/lifegraph.test.ts`, `tests/nexus/rhythm.test.ts` |
| The robot the user asked for (welds, solders, types, sees, hears, smells, feels, grabs, changes its own grip, uses any tool): each ability an edge between what a task needs (a tool's mass and grip, a force pressed, how near it must come, which senses and how finely: a camera's pixels across the thing at its distance, a microphone's noise under a voice, a force sensor's step under the press) and what its parts give, each a real one by its maker's figures (Mecademic's Meca500 and Universal Robots' UR5e; Robotiq's 2F-85 (which feels its own grip, so no force sensor is added to it: a Nano17 there would be overloaded) and Inspire Robots' RH56DFX; ATI's QC-11 changer and Nano17; Raspberry Pi's Camera Module 3, Intel's D435, TDK's INMP441, Bosch's BME688; the Pinecil, the CHP-170, Abicor Binzel's 1.2 kg MIG torch, Cherry's 45 cN key); what it cannot do refused with why; a robot designed for any set of tasks from the least parts that meet them (`robotFor`); its soldering the lessons' own steps, said as its hands doing them; words in the room ("design a robot that can weld, solder and type"), which stand the robot so designed before you as the library draws it, each part opening into its own (what is not drawn yet said: the Meca500 on a table) | `src/nexus/machines/robot.ts` (`ARMS`, `HANDS`, `CHANGER`, `SENSORS`, `TOOLS`, `TASKS`, `canDo`, `robotFor`, `robotTasks`, `robotWords`, `pixelsAcross`), the forge's `seeRobot`; `tests/nexus/robot.test.ts` |
| Six-axis arms by their makers' Denavit–Hartenberg tables (the UR5e first: Universal Robots' d1 162.5, a2 −425, a3 −392.2, d4 133.3, d5 99.7, d6 99.6 mm): where every joint and the flange are for any angles, the angles that put a tool at a point pointing a way (damped least squares, the point first with the base turned toward it, then the pointing too; its miss said), and the arm drawn as a housing round each axis and a tube along each link, each joint a group its program turns, its tool in the flange's frame. A robot drawn from the library's own parts for whatever its design has (`robotPart(design)`: its arms, changers, hands and senses as its tasks call for; the user's, `robot jarvis`, all of them): its table on a braced frame, two UR5e arms each bolted down by Universal Robots' pattern (four M8 on Ø 132 mm, 20 N·m) and posed by that inverse kinematics over its own side of the work (`ROBOT_CELL`), a QC-11 where a tool bolts on and its hand on each flange (the RH56DFX: palm, six drives each with its board, four fingers and a thumb, the index tip a Nano17 of six silicon gauges; the 2F-85 (`gripperParts`): its coupling and housing, its two four-bar fingers pinned where Robotiq's own model (ros-industrial/robotiq, BSD) puts them, its pads 85 mm apart and 162.8 mm up open), the Camera Module 3 on the right wrist (where soldering needs it: a 0.6 mm lead from 200 mm), the D435 on a mast aimed down at the work, an ear-and-nose board (an INMP441's die and package in its 4.72 × 3.76 mm lid, a BME688) under it; every kind's drawing checked by `missingIn` and its mass; the drawing checked against the design as an edge (each camera, from where it is drawn, puts 3 pixels across what its tasks need and has the work in its view; the arms clear each other and the mast) | `src/nexus/machines/dharm.ts` (`UR5E`, `fk`, `flangeOf`, `ik`, `dhArmParts`), `src/nexus/machines/kit-robot.ts` (`handParts`, `gripperParts`, `ftParts`, `changerParts`, `depthCamParts`, `camModuleParts`, `earNoseParts`), kinds `robotarm UR5e`, `robothand`, `toolchanger`, `ftsensor`, `depthcamera`, `gassensor`, `robot jarvis` (`src/nexus/kinds/robots.ts`), drawn by `components.ts` (`robotPart`, `robotParts`, `ROBOT_CELL`); `tests/nexus/dharm.test.ts` |
| The Franka Research 3 (seven joints, a torque sensor in each) and its Franka Hand: Franka's own modified-DH table (d1 333, d3 316, a4 82.5, a5 −82.5, d5 384, a7 88, flange 107 mm), its joints' limits and each link's mass from Franka's robot description (franka_description, robots/fr3, Apache-2.0); `dharm.ts` takes any number of joints, standard or modified DH (`Chain`: `mdh`, a fixed `tip`, `limits` its inverse keeps within, a `home` pose it seeds from); each link drawn as its sections measured from that description's collision meshes (`tools/measure/meshloft.py` → `models/fr3.ts`), in Franka's own link frames, split where Franka's visual model changes colour (its base's dark top, its elbow's dark caps, its forearm's dark strut, its silver flange link, its base's light strips, its Pilot's light), each link weighing what Franka's model says; its drives and torque sensors inside (estimates); the Franka Hand (`frankaHandParts`): its housing's measured sections, its plate and plug where Franka's model has them, each finger the four blocks Franka's description gives it, 40 mm each way | `src/nexus/machines/franka.ts` (`FR3`, `fr3Parts`, `FRANKA_HAND`, `frankaHandParts`), `src/nexus/models/fr3.ts` (generated), kinds `robotarm FR3`, `robothand Franka-Hand` (`kinds/robots.ts`); `tests/nexus/dharm.test.ts` |
| The molecular-biology bench instruments by their makers' own figures, and what each does as numbers: a cycling program's time on a thermal cycler (its holds, and its ramps at the cycler's own rate), the force a centrifuge puts on a tube at a speed and a radius (and the 5425's own radius found from its own top speed and top force), a gel's field from the volts over its tank against what its supply can give, a short strand's melting point, a pipette's allowed error at a volume read off its maker's table, and the air a Class II A2 cabinet moves at NSF/ANSI 49's velocities. Each instrument drawn whole from the library's parts, weighing what its maker says: Bio-Rad's T100 (its 96-well block on three Peltiers over a finned sink and its fan, under its heated lid, its fascia and screen), Eppendorf's 5425 (its rotor bored at 45° in its steel bowl on a brushless motor, its latched lid over the opening cut in its case), Bio-Rad's Mini-Sub Cell GT (a clear tank, platinum electrodes, its tray, comb, gel and buffer, the lid with its two leads), the PowerPac Basic (its sloped face, display, keys and four binding posts), Invitrogen's Safe Imager 2.0 (its blue LEDs under a diffuser, its lit surface, its amber screen on uprights), Eppendorf's Research plus (its plunger, spring, piston, volume window, ejector and tip cone) and a 4 ft Class II A2 cabinet (its two HEPA filters with the blower between them, its sash, work tray and grilles). Hazards said: a rotor's rating and its bowl, a supply's 300 V, a cabinet being no fume hood and certified only in place | `src/nexus/machines/lab.ts` (`T100`, `C5425`, `MINISUB`, `POWERPAC`, `SAFE_IMAGER`, `RESEARCH_PLUS`, `BSC_A2`, `cycleTime`, `spin`, `rcf`, `gelRun`, `meltingPoint`, `pipetteError`, `cabinetAir`, and each one's drawing), kinds in `src/nexus/kinds/labkinds.ts` (`thermalcycler`, `centrifuge`, `geltank`, `gelsupply`, `transilluminator`, `pipette`, `biosafetycabinet`); `tests/nexus/lab.test.ts` |
| The Meta Quest 3 and its Touch Plus controller by Meta's own figures and what its teardowns show, and a headset's optics as numbers: how many pixels fall on a degree (its pixels over its field: 19 across, 23 up, an average over the whole field where Meta's 25 PPD is at the middle, where its lenses are sharpest), how wide a pixel is at a distance, a frame's time at a refresh rate (a rate it does not run refused by name) and whether a face's eyes are a distance it can be set to. Drawn whole: its visor as a rounded slab with the nose cut out of its bottom edge, the five pods its six cameras and depth sensor look out of sunk into its face, two pancake stacks (two elements and the quarter-wave film between them) over their displays on the slide its IPD wheel moves, its board and processor, its two pouch cells, its speakers in the strap arms, its facial interface and its strap; the controller a head group tipped the way it is held, its stick, buttons, trigger, grip button, board, infrared LEDs under the shell and its AA cell | `src/nexus/machines/headset.ts` (`QUEST3`, `pixelsPerDegree`, `pixelAt`, `frameBudget`, `fitsIpd`, `quest3Parts`, `touchParts`), kinds `headset Quest-3` and `vrcontroller Touch-Plus` (`kinds/labkinds.ts`); `tests/nexus/headset.test.ts` |
| Craft that are not wheeled, each sized by what holds it up: a rotor or ducted fan by momentum theory (Leishman), a jet by its mass flow, an air cushion by its pressure and what runs out under its skirt (Yun & Bliault), a hull in water by Archimedes and by Windenburg & Trilling's collapse pressure. All four laws are in the book (`thrust.jet`, `cushion.pressure`, `cushion.escape`, `hull.collapse` beside the kept `thrust.ideal-static` and `buoyancy`), and what is here is the arithmetic over them: a multirotor's hover power, induced velocity and endurance from its disc area; the thrust a set of engines makes against a person's weight and what it burns; a hovercraft's cushion pressure, escape flow, lift power and hump speed, and the slope it can climb (none, without thrust: a cushion has no grip); the plate a pressure hull needs for a depth at a margin, what floats it and what ballast sinks it. Each craft then drawn from that: a multirotor whose rotors are as big as fit round its span with a tenth of a diameter between the discs, its blades twisted by their own pitch and handed in turn, its motors the stator that thrust asks for, drawn whole; a hovercraft whose hull is the plan its cushion was worked out over, its skirt the perimeter, its lift fan the flow; a jet suit on a pilot drawn as a figure, its engines sized from their thrust and a hose to each; a submarine whose plate is what its depth asked for and whose frames are the spacing it was worked out between. Each craft's mass law says how it was reached and what it is checked against, and the drawing must land within a fifth of it: a propeller blade, a fan's duct wall and a skirt finger are all drawn as the thin sections they are, because a part drawn as a solid block of its material is the way a drawing that looks right weighs wrong. What each can do to the person building it is said in full (`HAZARDS`) and carried into every kind's spec | `src/nexus/machines/craft.ts` (`hover`, `lift`, `endurance`, `jet`, `burn`, `hovers`, `cushion`, `climb`, `hull`, `plateFor`, `ballast`, `HAZARDS`; `propParts`, `outrunnerParts`, `droneParts`, `fanParts`, `hovercraftParts`, `turbineParts`, `pilotParts`, `jetpackParts`, `submarineParts`), kinds `drone`, `hovercraft`, `jetsuit`, `submarine` (`kinds/craftkinds.ts`); `tests/nexus/craft.test.ts` |
| Instruments that see what an eye cannot, each sized by the law that makes it work: an x-ray tube by Duane–Hunt (the hardest photon its voltage can make) and the thick-target yield (how little of its power leaves as x-rays at all — under one per cent, the rest heat, which is the whole design); what the beam leaves of itself by Beer–Lambert, which is what an x-ray image is made of and what a shield is sized by; a thermal camera by Wien's displacement law (a room peaks at 10 µm, which is why its window is germanium) and by its own array over its lens — where the blur a lens cannot beat is 1.22 λ F of length, the f-number alone, so a 12 µm pitch at f/1 is matched to its lens and nothing finer helps; an interferometer by Δν̃ = 1/OPD, so resolution is mirror travel and travel is bench length; a lidar by time of flight and the range equation, which falls as the square of the range. Seven laws went into the book for it (`xray.cutoff`, `xray.efficiency`, `attenuation.exponential`, `wien.displacement`, `lidar.time-of-flight`, `lidar.return`, `ftir.resolution`). The two that are dangerous say so in every size: an x-ray tube gives no warning and no sensation at the dose that matters, and a lidar is a laser whose class is for the instrument as its maker set it up | `src/nexus/machines/instruments.ts` (`xrayTube`, `anodeSeconds`, `through`, `halfValue`, `shieldFor`, `MU_100KEV`, `glow`, `thermalCam`, `camWatts`, `ftir`, `lidar`, `pulseResolution`, `HAZARDS`; `xrayTubeParts`, `xrayPanelParts`, `thermalCamParts`, `ftirParts`, `lidarParts`, and each kind's own size from the same figures its drawing is: `tubeBox`, `panelBox`, `camBox`, `ftirBox`, `lidarBox`, `lidarSize`), kinds `xraytube`, `xraypanel`, `thermalcamera`, `ftir`, `lidar` (`kinds/instrumentkinds.ts`); `tests/nexus/instruments.test.ts` |
| Seeed Studio's two systems, by Seeed's own wiki: the XIAO boards (one thumbnail footprint, 21 × 17.8 mm, fourteen castellated pads — eleven GPIO and three power — whatever chip is on it) and Grove (every module a board of one of five sizes, 20 × 20 to 40 × 60, with the same four-pin 2.0 mm keyed socket, so a module plugs into a bus rather than being wired). The catalogue is those two shapes, not a list of part numbers: a module Seeed sells that is not named here is still drawn from its own size and bus. What each can do is arithmetic — how many modules of a bus can share one port (I²C yes through a hub while no two answer to the same address, a UART and a plain pin no), and whether a 5 V module suits a 3.3 V board. Drawn whole: a XIAO's board with its fourteen half-holes bitten out of its edges and their walls plated, its chip a QFN from the package library (die, lead frame, bond wires, moulding), its flash beside it or inside it, a 3.3 V regulator and a charger, eight 0402 passives, its USB-C socket, its reset and boot buttons, its two lights, its U.FL antenna socket, its silkscreen pad by pad, and the pads underneath a cell solders to; a Grove module's board, its through-hole socket (shell, key, back wall, four contacts each a blade and a leg through the board), its two mounting holes, its own passives and the block its own part sits in. Seeed publishes no weight for either, so both kinds' masses are estimates and say how they were reached | `src/nexus/machines/seeed.ts` (`XIAO`, `XIAOS`, `GROVE`, `groveChain`, `groveFits`, `xiaoOf`, `groveOf`, `XIAO_G`, `groveGrams`, `xiaoParts`, `groveParts`, `grovePlugParts`), kinds `xiao` and `grove` (`kinds/labkinds.ts`); `tests/nexus/seeed.test.ts` |
| The robot at the soldering bench: the robot its design draws, standing with the bench's things on its own table (the bench's plywood top and legs put away), doing the LED lesson by the bench's own words in its steps' order (place all, board in the hands, the battery, take the iron and the solder, tin, wipe, then each joint heated until it takes solder and fed until graded good, more wire paid out whenever less than 12 mm stands out, each lead cut at 1.5, the switch closed), its arms following by their own inverse kinematics where the bench puts the iron's grip, the wire's held end and the cutters (each joint turned at most 1.5 rad/s); words in the room ("let the robot solder it", "stop the robot") | `src/nexus/view/robot-bench.ts` (`RobotAtBench`), the forge's `robotSolders`, test hooks `robotBench`, `robotRun`; `SolderBench.ownTable` |
| A maker's own 3D assembly drawn from the library: its parts read from the maker's CAD (`tools/measure/xml3d.py` reads a 3DXML: each part's name, its place by the product tree's matrices, its box and its surface's middle, written as a data file under `src/nexus/models/`; measured numbers only, none of a model's surface copied, so a GPL model stays the maker's), each part's name read into the library's words ("2040 profile" → extrusion 2040 at its length, "42-34 motor" → stepper nema17 34, "625pillow" → bearing 625, "M4X8 Socket Head Screw" → screw M4x8), each library part fitted to its box (axes by length, ways by where its body's weight lies, its leads left out, a lead screw not a lead, a part all of wire (a coil spring) fitted whole) and placed by the model's own matrix; a part the model lists apart that the library draws inside another (a lead screw's nut) moved to where the model has it (`DRAWN_IN`); the model turned to face the library's front, +x (`FRONT`: the Ender-3's is its -z, where its screen is); what the library does not make yet drawn as the walls of its box its own surface covers three fifths or more of (`faces`, measured: a sheet's or a moulding's open sides open), a sheet whose surface lies on none of its box's faces as its sheet at its surface's middle, a plate, a closed box or a curved moulding as its box; what the model leaves out between two of its parts run between them by us and said so (`RUNS`: the Ender-3's Bowden tube); what the library does not make yet drawn as its measured box, said as what it is, a folded bracket's box filled by its sheet; the bill of materials the model's own. First: Creality's Ender-3 (its published 3DXML, 311 parts: 188 from the library, 123 boxes so far), 6.7 kg (Creality's UK listing). Then a STEP (`tools/measure/stepasm.py`): VoronDesign's Voron 2.4r2 (1297 parts, its stock options chosen), the model stood on its own up (`UP`: a Fusion export's +z) as well as turned to face front (`frameOf`), names read without Fusion's copy marks (`baseName`), a rail's carriage the model has apart slid along its rail to the model's place on the nearest rail of its size (`DRAWN_IN` by `link`), a part the model has that is run by us instead left out (`RUNS.replaces`), a boxed part coloured and made of what the model's look says (`lookAs`: "Acrylic (Clear)" clear PMMA, "Plastic - Matte (Red)" ABS in its red), a thin part whose broad faces its surface covers a fraction of (a panel's foam tape, a belt loop) drawn as a frame round its edge that wide, measured, and any other boxed part with an outline drawn as that outline through its depth (`ModelInfo.hull`) | `src/nexus/machines/makermodel.ts` (`libraryWords`, `boxedAs`, `lookAs`, `billOf`, `extents`, `frameOf`, `baseName`), `src/nexus/models/ender3.ts`, `src/nexus/models/voron24.ts` (generated), drawn by `components.ts` (`modelPart`), kind `printer3d` (`kinds/robots.ts`, `PRINTER_MODELS`: Ender-3, Voron-2.4) |
| The breakdown queue: every item stored is queued, each thing in it looked up in the table (the inventory, its inner parts, the family that makes that size), what is not there or is listed only as its materials waits, said with what wants it | `src/nexus/parts/breakdown.ts` (`npm run breakdown -- report.md`) |
| A part designed whole (`Part.sealed`, set on every library component) is fitted as it comes: the make pipeline's detail rules, its finish strip and its critic's moves leave it | `src/nexus/make/detail.ts` (`sealedIn`) |
| A miniature guideway's sizes (HIWIN's MGN table) and how it is drawn (every inner proportion named as typical) | `src/nexus/works/families.ts` (`MGN`, `mgnDims`), `src/nexus/parts/components.ts` (`railParts`) |
| A face that carries what is fastened to it (a carriage's top, a tool flange: `Iface` kind `mount`), the free end of what moves, joined only to what holds it | `src/nexus/parts/kits.ts`, `src/nexus/make/critic.ts` (chains) |
| A fastener locks two links only where it meets the other (apart by more than 20 µm it runs clear, as a rub does) | `src/nexus/make/critic.ts` (held) |
| A hole drilled in any part, any way (`Part.cuts`: round, or n-sided, a hex socket): cut from what is drawn (three-bvh-csg, each shape drilled once), its volume out of the mass | `src/nexus/parts/kits.ts` (`Cut`), `src/nexus/view/kit3d.ts` (`drill`), `src/nexus/parts/mass.ts` |
| A cutaway draws a solid's section flat and hatched in its own colour (a shell's inside as it is) | `src/nexus/view/look.ts` (`cut`) |
| Room to slide: a part that slides (`travel.slide`, a carriage on its rail) swept along its travel with all of its link; a fixed part in that sweep is in its way | `src/nexus/make/critic.ts` (critique) |
| How a picture is lit: a part alone in a light tent, as a maker's product photograph is taken (white walls, a softbox overhead and in front, a lit sweep under it, so metal mirrors white: a Pi 5's shells and pins read their photo's), exposed as for a grey card so a colour reads as itself, on Khronos' PBR Neutral curve so a colour keeps its hue (a Pi 5's mask reads its photo's), a vehicle in the softbox studio; an underside lit from below, as a board is turned over to photograph it; the forge room the same way (a room for metal to mirror, its light exposed for a grey card, `forge.ts`) | `src/nexus/view/look.ts`, `src/nexus/view/forge.ts` |
| Parts placed by their mating faces: a port's pattern of holes, threads or pins (`Port` in `kits.ts`; NEMA faces, ISO 9409 flanges) mates its mirror, the part is placed by it and its fasteners laid from the library | `src/nexus/parts/mate.ts` (`fit`, `mate`, `assemble`; kit `part` with "a + b") |
| Any build thrown at a real works: six families of making, the stations that do them, every line routed to a machine or bought with the reason, the operations scheduled across the machines there are, what is not finished when it is formed (clay fired, resin cured, bound metal sintered), and the most capable works a budget buys | `src/nexus/works/` (thirteen files: `plan.ts` routes, `can.ts` decides, `audit.ts` checks the plan, `schedule.ts` lays it on the machines and says what the floor is, `budget.ts` spends a budget, `builds.ts` holds what to throw at it, `pack.ts` turns it into what to go and buy) |
| The works as a thing to order: every station in the order to come by it (which is not by price — the welder comes before the forge because the forge is welded), its seller's own listing where one sells it, the used market where that is the cheap path, and where the cheapest way is to make it, the job that makes it routed through the works *as it stood at that moment* | `src/nexus/works/pack.ts` (`worksPack`, `worksPackText`, `BUILT_BY`), `npm run pack -- works <folder>` |
| The wire out: the program a machine is sent and the transport that carries it (Marlin's line protocol with its checksum and resends, down a 20-byte BLE pipe to the Nordic UART service; Moonraker over wifi where the machine is Klipper; the steps where there is no port) | `src/nexus/machines/link.ts` (`Streamer`, `gcodeFor`, `printStart`, `kilnProgram`, `LINKS`), the binding in `works/programs.ts`, the browser half in `src/nexus/view/ble.ts` |
| The Bluetooth bridge as a thing you can order and build: what it is made of (a XIAO ESP32C3, a BSS138 level converter only where the controller's logic is 5 V, three jumper leads), the UART-to-NUS sketch it runs, the pins it uses and why they are not the ones marked TX and RX (the ESP32-C3's boot ROM prints on U0TXD at every reset, so the machine is kept off that pin), and the wiring as steps with a check at each one — which the room, the lesson and the build pack all read, so none of them is a second copy | `src/nexus/machines/link.ts` (`BRIDGE`, `BRIDGE_PINS`, `bridgeSketch`, `bridgeSteps`), the lesson `bridge-ble` in `src/nexus/teach/lessons.ts`, the pack's `bridge` flag in `src/nexus/teach/buildpack.ts` (which ships `bridge.ino` in its zip), `wiring()` in `src/nexus/view/ble.ts` |
| How close is close enough, and whether a machine can do it: ISO 286's grade table, the fits made from them (locating, sliding, a bearing seat, pressed), what a named feature's tolerance should therefore be, tolerance stack-up (worst case and root-sum-square), and process capability (Cp, Cpk, scrap in parts per million, and how many to start to keep n) | `src/nexus/parts/fits.ts` (`itBand`, `fitAt`, `tolFor`, `stackOf`, `capable`, `measured`) |
| What a cutter actually does in a material (surface speed, chip load, material removal, spindle power, the stickout that chatters, the smallest inside corner it can leave) and what a cut refuses before the machine finds out | `src/nexus/machines/link.ts` (`cutAt`, `cutRefuses`, `CUTTING`, `KC`) |
| The burr a cut leaves: which side it stands on, how tall, what takes it off, and why it matters under a mating face | `src/nexus/parts/finish.ts` (`burrOf`) |
| The works printed from the command line, so a plan never needs a throwaway test to be read: `npm run works`, `npm run works -- gokart metal programs`, `npm run works -- $8000`, `npm run works -- fits 25` | `src/nexus/cli/works-main.ts` |
| What an inventory item looks like, how it comes apart | `src/nexus/parts/pieces.ts`, `looks.ts` |
| An item the library draws, seen in 3D: drawn as the library draws it (not its look), taken apart by the viewer's own explode, each piece opening into its pieces, the part the library draws it as, or (one piece) what it is made of, drawn | `src/nexus/view/explode.ts` (`showPart`), `src/nexus/parts/components.ts` (`componentOf`) |
| How a drawn part comes apart (`explode`): what is the part itself stays, those round it go out from its middle, those at its middle out past its ends along its length (heaviest first, each kind as one), and no piece parted onto another | `src/nexus/view/kit3d.ts` |
| The library on the phone: every drawn kind of part by trade, each size with its drawing's mass against its standard; three presses to stand it before you | `src/nexus/view/apps.ts` (`libraryApp`) |
| A clear room: in a headset nothing floats in your view unasked (one chip asks what to build; the clock is on the phone; the robot stands back to your side, its thought shown only while you look at it); the phone drawn half again a real one's size | `src/nexus/view/forge.ts` |
| Things with choices, as a placed tree of parts | `src/nexus/parts/kits.ts` (drawn by `view/kit3d.ts`) |
| Conditions on loads, holds and reach | `src/nexus/ask/conditions.ts` |
| Conditions on how a made thing is (age, setting, material, size) | `src/nexus/make/conditions.ts` |
| Edges as made (radius by material and process) | `src/nexus/parts/finish.ts` |
| Oriented-box layout and contacts of a placed tree | `src/nexus/parts/space.ts` |
| Attention to detail (joints, fasteners, seals, finishes, wear) | `src/nexus/make/detail.ts` |
| Critic (room to move, held up, walls, through, standing) | `src/nexus/make/critic.ts` |
| The make pipeline (conditions, detail, critic, in rounds) | `src/nexus/make/pipeline.ts` |
| Wheeled machines of every kind, from their published figures | `src/nexus/machines/machines.ts` (cars, karts, ATVs, motorcycles, forklifts, trucks, lawn tractors) |
| Lofts, bent tubes, turned profiles: mass, bounds, covering boxes | `src/nexus/parts/form.ts` |
| Freeform surfaces: NURBS curves and skins, interpolation, regions and trims, fairness, zebra, draft, seams | `src/nexus/parts/surface.ts` |
| Panelled bodies on curve networks (side skin, hood, deck, cabin; arches from the wheels' sweep; keep-outs) | `src/nexus/machines/panels.ts` (rules in `BODY_RULES`, their history in `RULE_UPDATES`) |
| Vehicles as points in a want-space (not a maker) | `src/nexus/machines/vehicle.ts` |
| Interface contracts (shaft/bore, studs/nuts, chain/sprocket, drive/torque) | `Iface` in `src/nexus/parts/kits.ts`, checked in `src/nexus/make/critic.ts` |
| A made thing on its own, framed, for review | `view/look.html` → `src/nexus/view/look.ts` |
| Places, rides and games | `places.ts`, `karting.ts`, `coaster.ts`, `pingpong.ts` |
| Whether the tree is still clean: nothing loose at the root, every file saying what it owns, no file quietly grown into six concerns, no name with two owners, no path in prose that has gone stale, and no layer importing one that should depend on it — the last three as ratchets whose declared numbers may shrink and never grow | `tests/nexus/tidy.test.ts` (`npm run tidy`, and inside `npm run gate` for free) |

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

## Where the code lives

`src/nexus/` is fifteen directories and two files, not 183 files. Each directory's boundary is one sentence; if a new
file does not clearly belong to one, that is the signal that its concern is not understood yet, not that it belongs at
the root.

| Directory | What is in it |
| --- | --- |
| `substrate/` | the Nexus engine: terms, domains, laws, places, couplings, and the loop that evolves them |
| `ask/` | words in, wants out: how an ask becomes something to make (`conceive`, `route`, `generate`, `invent` for flows, `machine` for mechanisms, `spec`) |
| `parts/` | the parts library and the geometry a part is made of: every part designed once from its standard, the shapes it is drawn from (lofts, bent tubes, turned profiles, NURBS surfaces), where its pieces end up in space and which of them touch, its mass and what it costs |
| `boards/` | single-board computers, their parts, and the photo-measured data files |
| `machines/` | real machines from their makers' figures, and the wire out to them (`link.ts`). Not geometry: a loft, a surface and an oriented box are `parts/`, because a body is not a machine |
| `works/` | any build routed to real machines: twelve files, one concern each (see `works/index.ts`) |
| `teach/` | teaching a build by hand: edges, lessons, the soldering bench, the build pack |
| `world/` | places, creatures, games, people |
| `make/` | the make pipeline: conditions, detail, critic, in rounds |
| `view/` | everything drawn: the forge room, the look page, the phone, the benches |
| `kinds/` | the catalogue of kinds, by trade |
| `models/` | generated data files from makers' own CAD |
| `book/`, `life/`, `embody/` | the law book, the life graph, embodiment |
| `cli/` | every command-line entry point (`npm run nexus`, `works`, `breakdown`, `pack`, …) |
| `index.ts`, `works.ts` | the two doors kept at the root so existing imports go on meaning what they meant; both own nothing but `export *` lines |

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
- `tools/look.mjs`: render any ask from named views (`node tools/look.mjs <viewer dir> <out dir> "name|words=…&view=…"`; a view that looks all but straight down or up (`top`, `under`) is squared — its camera's up is ∓z, not the degenerate roll three.js picks when up is nearly the way it looks, which had turned every plan view 45°;
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
- `meshloft.py`: a closed mesh (an STL) measured as loft stations (`fr3_ts.sh` regenerates the FR3's): cut across an axis every so many mm, each section's
  bottom and top one way, its half-width and middle the other, and how square it is (the superellipse exponent whose
  area in that box is the section's own; a faceted round no less than an ellipse); `--clip` keeps one piece (an axis,
  < or >, a value: an L-shaped part's arms, or where its maker's colours change), `ts` writes the data file (the FR3's
  is `models/fr3.ts`: the commands are in the header of its generator, rerun to regenerate). Sizes measured, no
  triangles copied.
- `views.py`: every photo on one sheet; one photo in full-size tiles to scan; a zoom; `find`: a part boxed in one photo
  found in the others by its features (says "not found" rather than guess when the views differ too much: then
  calibrate each photo by four points of the same plane and use `photo.py same`).
- `kicad.py`: a part's drawing from KiCad's footprints, with the datasheet it was drawn from.
When a step takes working out by hand twice, it becomes a tool here, and a line in this list.
- `npm run machine`: a machine composed from the library and printed — `npm run machine -- units` lists every unit the
  library affords with its mass, its price and what limits it; `npm run machine -- "a machine that cuts 400x300x80" works`
  composes it and throws its bill at the $3,000 works. Written the same round it was needed, for the same reason as
  `npm run works`: the alternative was a probe test that prints what the engine says and is then deleted.
- `npm run works`: a plan, a budget or a build printed from the command line. Four rounds in a row opened by writing a probe
  test whose only job was to print what the engine says, and then deleting it; this is that, kept.

## Now (2026-10-09; read before resuming)

In order; each through the breakdown queue, rendered, compared with its photos and judged blind before it is done:
1. The Orange Pi 5 (done 2026-10-09 but for its underside): its parts first (`src/nexus/boards/boardparts.ts`: each
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
7. Prices for the common parts the build packs list without one (motors, hot ends, boards, belts, rails…). Begun
   2026-10-10: a probe over 22 asks listed every line a pack kept with no price, and "a 3D printer" came back fifteen of
   them — the whole machine was unpriced. Seventeen keys now have a seller's own page, the figure it showed and the day
   seen: the NEMA 17 (ZYLtech's 1.5 A 0.42 N·m, the Ender-3's own size, $9.95 or $42.95 for five), the hot end, the
   extruder (Bondtech's BMG, $80), the heated bed (LDO's magnetic 24 V with its thermistor, $86.99), the control board
   (BTT's SKR Mini E3 V3.0, $44.99), the 24 V supply (Mean Well LRS-350-24, $38.99), the GT2 belt ($2.40 a metre) and
   its 20-tooth pulley ($3.99), the MGN12H rail with its carriage ($35.99), the 625 bearing ($1.19), the cartridge
   heater ($4.29), the thermistor ($4.99), the 30 mm fan ($6.49), a JST-XH kit, a flexible coupling, and for a
   quadcopter its motor (a FIVE33 2207, $23.97), its 4S pack ($25.99) and its ExpressLRS receiver. A 3D printer now
   prices 11 of its 15 lines and a quadcopter 3 of its 7. Still unpriced, and said so: the printer's frame, its display,
   its T8 lead screw (the seller prices it by length in a dropdown no reader can see), hook-up wire, an ESC, a flight
   controller, an FPV camera, and the stock materials (aluminium, ABS, copper, epoxy, polyimide, silicon).
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
   handle, hinges, window frame, emergency stop and chamber lamp added.
   The kiln (2026-10-10): Skutt's KM-1027 as a kind (`kiln Skutt-KM1027`, `kilnParts`) by its sellers' listings (ten-sided,
   23 × 23 × 27 in inside, 3 in of firebrick, cone 10 at 2350 °F, 240 V 48 A 11,520 W, its KilnMaster's six programs of
   eight segments, a sprung lid lifter, 290 lb listed): three firebrick rings in stainless jackets with band clamps, two
   Kanthal A-1 elements in each, a peephole each, its floor, stand, lid on its hinge, controller and a type K sheathed
   thermocouple through its wall (thermocouples now drawn: `tcParts`, their masses from their build); in `processor.ts`'s
   KILNS so "fire porcelain in the 1027" runs Orton's cone 10 program in it; firebrick (K23, 0.48 g/cm³) and Kanthal A-1
   (7.10 g/cm³, its make-up 22 Cr 5.8 Al Fe) as materials, the thermocouple alloys' densities added. Judged blind: an
   electric pottery kiln (95 %), named the Skutt KM-1027 (40 %), 3/10 (its jacket reads matte, its lid's and stand's
   hardware thin).
   The robot arm (2026-10-10): the Franka Research 3, a seven-joint arm with a link-side torque sensor in every joint
   (3 kg, 855 mm, <±0.1 mm, A1–A4 ±87 N·m and 150 °/s, A5–A7 ±12 N·m and 301 °/s, ~18.3 kg: Franka's data sheet v2.6),
   with its Franka Hand (80 mm stroke, 70/140 N, 730 g): its kinematics Franka's own (the flange 88 out and 926 up at
   zero, 307 out and 590 up at its rest pose, as Franka's own examples have it), its inverse over seven joints within
   their limits, each link its measured sections in Franka's own frame, 18.6 kg drawn. Judged blind: round 1 a Franka
   arm (70 %), 4/10 (no gripper, a round foot, thin seams); round 2, its hand on and its colours Franka's model's,
   the Franka Research 3 with a Franka Hand (85 %), 5/10. Its faults left: its hand and wrist read as blocks stacked,
   its elbow's dark caps domed (its collision mesh's, fuller than its covers), its seams lines not gaps, no logos or
   screws. The part view's words now name a model without a size (it took the family's first example where a model
   had no digit in its name).
   The lab instruments (2026-10-10): seven kinds by their makers' published figures (`src/nexus/machines/lab.ts`,
   `kinds/labkinds.ts`): Bio-Rad's T100 thermal cycler (96 × 0.2 ml, 4–100 °C, 2.5 °C/s average, ±0.5 °C, 700 W, 9 kg),
   Eppendorf's Centrifuge 5425 (24 places, 15,060 rpm, 21,300 × g, 15.6 kg), Bio-Rad's Mini-Sub Cell GT with its
   PowerPac Basic (10–300 V, 4–400 mA, 75 W), Invitrogen's Safe Imager 2.0 (470 nm, no ultraviolet), Eppendorf's
   Research plus 100–1000 µl (its EN ISO 8655 errors) and a 4 ft Class II A2 cabinet (Labconco's Logic+ sizes,
   NSF/ANSI 49's velocities). What each does is arithmetic, not a stored answer: a program's time from its holds and
   its ramps, the 5425's own tube radius (84 mm) from its own two figures, a gel's V/cm against what its supply can
   give, a melting point, a pipette's allowed ± at a volume, a cabinet's m³/h. Each drawn whole, no missing parts and
   within 20 % of its maker's mass. Judged blind twice: round 1 the gel tank 70 %, the pipette 85 %, the cabinet 70 %,
   but the supply and the transilluminator were featureless boxes (2/10) because their cases swallowed their faces;
   round 2, after giving each instrument its face, its lid and its openings: the pipette 90 % 7/10, the gel tank 85 %
   7/10, the cabinet 75 % 6/10, the supply 70 % 6/10, the cycler 50 % 5/10, the transilluminator 50 % 4/10, the
   centrifuge 35 % 3/10 (then given its hinge, handle and the opening cut in its case). Its faults left: parts that
   pass through each other where they should meet (a lid's jacks, a sash's track), and no printed marks anywhere.
   This file holds no laboratory procedure: the instruments and their arithmetic only.
   The Quest 3 (2026-10-10): the headset and its Touch Plus controller as kinds (`src/nexus/machines/headset.ts`), by Meta's
   figures (2,064 × 2,208 an eye through pancake lenses, 110° × 96°, 72–120 Hz, Snapdragon XR2 Gen 2, 8 GB, a
   continuous 53–75 mm IPD, two colour and four tracking cameras and a depth sensor, 184 × 160 × 98 mm, 515 g) and
   its teardown's 19.44 Wh. Its optics are arithmetic: 19 pixels on a degree across and 23 up over the whole field
   (Meta's 25 PPD is at the middle, where its lenses are sharpest), 0.47 mm a pixel at half a metre, 8.3 ms a frame
   at 120 Hz, and a 48 mm face told it is outside its range. Both draw with no missing parts and weigh Meta's figures
   exactly. Judged blind: round 1 a Meta-ish headset (35 %) 3/10 and the controller read as a power tool (2/10): its
   camera pods floated off the shell, its shelled visor read as an open box, its strap was a plank and the
   controller's parts did not touch. Fixed by cause: the visor solid with its nose cut, the pods sunk into its face,
   the strap given arms, a band and joints, the controller rebuilt as a head group with its parts in the head's own
   frame, its LEDs under the shell and its trigger where the head meets the grip. Its faults left: no printed marks
   or seams anywhere, the facial interface a block rather than a gasket, and the controller's head still reads
   slab-like.
   Seeed Studio (2026-10-10): its catalogue as its two systems rather than a list of part numbers (`src/nexus/machines/seeed.ts`,
   kinds `xiao` and `grove`): the XIAO footprint every board in the family shares (21 × 17.8 mm, fourteen castellated
   pads, eleven GPIO and three power at 2.54 mm, a USB-C socket at one end, a reset and a boot button, pads underneath
   for a cell it charges) with the two chips whose figures are on Seeed's own wiki (ESP32-C3 at 160 MHz with 400 KB and
   4 MB and its Wi-Fi 4 and BLE 5.0 on a U.FL socket; RP2040, two Cortex-M0+ at 133 MHz with 264 KB and 2 MB, no radio) —
   the family is larger and the file says so; and Grove, one keyed four-pin 2.0 mm socket and five board sizes, with
   what a bus can carry as arithmetic (I²C shared through a hub while no two answer to the same address; a UART or a
   plain pin one to a port) and a 5 V module on a 3.3 V board refused with why. Both drawn from the library: the XIAO's
   chip a QFN from `packages.ts` down to its die and bond wires, its USB-C and buttons from `boardparts.ts`, its
   castellations half-holes bitten out of the board's edge with their walls plated, its silkscreen naming every pad;
   the Grove socket a through-hole part whose contacts each have a blade and a leg through the board. Judged blind:
   round 1 named a XIAO ESP32C3 at 95 % (80 % with the silkscreen masked) and a Grove I²C module at 85 %, but 3/10 and
   2/10 — its castellations read as gold tabs outside the outline (the plating was drawn on the wrong side of each
   notch), its U.FL as a jewel on a post, its board bare of passives, and the Grove socket's contacts ran across the
   board's top instead of down through it. All four fixed by cause; round 2 named them again (85 % and 90 %) and scored
   them the same, and what it faulted was mostly what it could not see: it read the USB-C as oversize and inboard where
   it is Type-C's own 8.94 × 7.35 standing 1 mm proud, and the plan view as deliberately turned 45°. That last was real
   and general: `view=top` looks all but straight down, so the camera's up was nearly the way it looked and three.js was
   free to roll it — every board ever judged from above was turned 45° with its words unreadable. Squared (`look.ts`:
   a near-vertical view takes up = ∓z), and with it the layout's own faults showed at once and were fixed: the buttons
   were the library's 4.2 × 2.8 mm KMR2 where a thumbnail board takes a 2.0 × 1.2 × 0.55 (Alps' SKRPA type, now
   `tact-xiao` in boardparts.ts), and the passives, the antenna socket and the lights sat on top of the pad names.
   Still open, and said in the kind's own `leaves`: no solder fillets anywhere, the board's milled edge the same colour
   as its mask rather than tan glass, no pin-1 dot or maker's logo on a chip, where each small part sits an estimate
   (Seeed publishes no layout), the board's colour not measured from a calibrated photo, and a generic Grove module
   still reads as a board with one block on it. The four the judge called renderer-wide — no solder fillets, no FR4
   edge, no ambient occlusion, a drop shadow detached from the silhouette — are worth a round of their own: they cost
   every board in the library two or three points before any geometry is touched.
   The craft that are not wheeled (2026-10-10): jet packs, hovercraft, drones and submarines, each sized by what holds
   it up rather than by a template (`src/nexus/machines/craft.ts`, kinds `drone`, `hovercraft`, `jetsuit`, `submarine`). Four
   laws went into the book first (`thrust.jet`, `cushion.pressure`, `cushion.escape`, `hull.collapse`, each with its
   source, its domain and a worked example it reproduces), and every figure a kind says about itself is those laws run:
   a 450 mm quadcopter's 290 mm rotors hold 1.25 kg on 70 W a rotor and fly 17 minutes; a 5 m hovercraft with two
   aboard presses 1.1 kPa on 11 m² and loses 9.8 m³/s under a 20 mm gap, which its lift fan puts back on 17 kW, and it
   must get over a 7.7 m/s hump; five 400 N engines lift a 147 kg suit, fuel and pilot at a thrust-to-weight of 1.4 and
   burn their 23 kg of kerosene in four minutes; a 1.2 m hull wants 9 mm of plate to be rated to 100 m at 1.5 times the
   margin, and buckles rather than yields. Judged blind twice. Round 1: a quadcopter at 90 % (5/10), a hovercraft at
   85 % (3.5/10), a submarine at 75 % (3/10) and the jet suit unrecognised — 30 %, 2/10, "I cannot tell what it is,
   which is itself the verdict". Fixed by cause: the turbine's intake and its exhaust were both at the same end (so no
   air could get in), the propellers were flat planks with no twist and all one hand, the submarine's propeller, planes
   and rudders were inside its own stern hemisphere, the hovercraft's hull was turned across its own beam, and a jet
   suit with no one wearing it is not a jet suit — so the pilot is now drawn as a figure (given no mass: what is
   weighed is the equipment). Round 2: the jet suit read at 75 %, the submarine 85 % and 6/10, the hovercraft 80 %
   and 4/10, the drone 90 % and 5/10; its findings taken again (an open intake mouth and a scorched exit plane on each
   engine, the two engines of a hand stacked over it, hands closed on the grips, the hull a clean body of revolution,
   the thrust duct deeper, the rudders clear of it with their linkage, the wheel on its column, the screen on its
   console, three phase wires down each drone arm). Still open, and said in each kind's `leaves`: no fasteners,
   seams, panel lines or markings anywhere; the ducted fans' blades at one pitch; the hovercraft's engine a block and
   its belts not drawn; the submarine without its anodes, lifting lugs or section joints; and the drone's props read
   flat to a judge until the twist is stronger than a real one's.
   Then the gate found four faults the two judges could not see, each in a drawing that was right about shape and
   wrong about what a part is made of, and each fixed at its cause. A propeller blade drawn as the envelope its
   twisted chord sweeps (one loft, stations bounding the rotated chord) is a solid blob: a 578 mm rotor came out at
   400 g a blade against the 50 to 60 g a real carbon one weighs, and the error grew as the cube of the size, so a
   900 mm quadcopter weighed 61 % more than its own mass law. A blade is now twelve stations along its span, each its
   chord by a tenth of that through, laid at its own twist about the span (`rot: [0, PI/2 - a, hand * b]`), lapping
   its neighbours by a seventh so it reads as one piece and carrying the mass of its own slice. A ducted fan's wall
   was a twentieth of its diameter, which made a 1.4 m duct a 68 mm ring of solid glass weighing 134 kg: a duct is a
   laminate, 3 mm small and 6 mm at a metre and a half. A hovercraft's skirt fingers were full revolves sized by the
   skirt's depth, so they gapped on a small craft, overlapped by half on a big one and weighed ten times their coated
   fabric; each is now as wide as its share of the perimeter. Its seats were solid polyurethane (22 kg a seat), now a
   4 mm glass shell with a foam cushion, and its screen frame a closed box, now four extrusions. Both craft that had
   no published mass had the wrong scaling law, not just the wrong number: a hovercraft's structure is a skin over its
   plan, so 70 kg a metre was 40 % light at 3 m and 40 % heavy at 8 m — it is 22 L^1.6 and 12 kg a seat, which lands
   where light glass craft are measured; and a submarine's fit-out goes with the size of its hull, not with its plate,
   so taking it as 1.55 times the plate made a 50 m boat 28 % heavy and a 500 m boat 16 % light — it is the plate by
   its own area and thickness plus 700 kg a metre of hull as D^2.4, which puts a two-person 100 m boat at 2.8 t
   against about 2.5 t for a U-Boat Worx NEMO. The breakdown queue then refused the hovercraft and the jet suit:
   listed as bare materials, a thing joined of only its materials waits. So the hovercraft now carries the drive it
   always claimed in words — a double-grooved crank pulley, an SPZ belt, a 200 mm pulley on the fan's shaft, the shaft,
   its bearing on a bracket in the fan's intake and a spark plug (the two pulleys are the catalogue's own parts; the
   belt, the bearing and the plug are drawn but not claimed, because their insides are not drawn apart) — and the jet
   suit a hose to every engine and the pack that runs its pumps. Four laws also rested on no principle until they were
   placed (`thrust.jet` on conservation of momentum, `cushion.pressure` on gravitation and geometry, `cushion.escape`
   on conservation of energy and a fitted discharge coefficient, `hull.collapse` on elasticity and fit to data).
   Judged blind a third time, by a judge that scored against a photograph rather than against the last round: the
   quadcopter 15 % and 3/10, the hovercraft 20 % and 4/10, both named in a second — "every detail is a primitive box
   or cylinder, every material one flat matte colour, nothing has fasteners, wiring, seams or wear". That is the same
   verdict as the Seeed round's and it is the renderer's, not these craft's: it is the round that is queued next. Of
   its own findings, one was a real fault and is fixed — the skirt's fingers were set round an ellipse through the
   hull's corners, so the bow was bitten out of the skirt and the sides stood off it; they are now set along the
   hull's own plan by arc length, a little inside it. Two were the camera, not the geometry: a quad-X's arms lie on
   the diagonal, which is exactly where `view=three` puts its camera, so the four arms foreshorten into one slab
   (the second judge in a row to read them that way) and a rotor pointing at the camera looks a third the length of
   one lying across it. A quadcopter is to be judged from `top` and from a camera off the diagonal. The rest of what
   it listed — no guard on the fan, no column under the wheel, no belt, no straighteners — is drawn and was missed.
   Still open: the lift fan's own belt is not drawn, the engine is still a block, a blade's stations show as faint
   ribs in a plan view, and the deck is a rectangle where the hull's plan is not.
   The four renderer-wide faults (2026-10-10), fixed at the renderer rather than part by part, because they cost every
   board and every craft in the library the same two or three points before any geometry was touched. Three of the four
   were defaults, not missing machinery. Ambient occlusion was already built (a GTAO pass in `look.ts`) and switched
   off unless a round asked for it: it is now on by default with its radius sized to what is being looked at (a
   fiftieth of the thing across, 1.5 mm at a chip's shoulder, 60 at a hull), and `&ao=0` turns it off. The shadow was
   not detached from its object by any fault of the shadow map but by its bias: a normal bias is a distance, and 30 mm
   — right for keeping a car's curved skin from shadowing itself in rings — slides a chip's shadow 30 mm across a board
   50 mm long, so nothing small cast a shadow on anything. It is now a fiftieth of the thing across, and a Pico's
   components drop their own shadows on its board. A board's milled edge is the laminate, not the mask: `sbc.ts` had
   this right already (its boards are a tan core with 0.02 mm mask films over each face), but every board drawn
   elsewhere as a box of `fr4` was green all the way round, so the renderer now gives any fr4 box the laminate's colour
   on its four cut sides and the part's own on its two faces. And solder: through-hole joints were drawn (IPC-A-610's
   target fillet, a pad and a concave fillet under the board), but nothing surface-mounted was soldered at all, so
   every chip and passive sat on the board unattached. Each termination standing on the board's top face now gets its
   fillet, drawn as the collar it fills rather than the meniscus's own curve (223 of them on a Pi 5, 170 on a Pico).
   X-ray, infrared and lidar (2026-10-10), which is the last of item 14's list. Five instruments, each sized by the law
   that makes it work rather than by a picture of one, and seven laws into the book first. The one that changes how the
   rest of the library should be read is the x-ray tube's yield: 100 kV at 200 mA is 20 kW into the target, of which
   163 W leaves as x-rays and 19.8 kW is heat — which is why an anode is tungsten on molybdenum, why it spins, and why
   a tube is rated in seconds. The others: 1 mm of lead cuts a 100 keV beam to a thousandth and 0.11 mm halves it; a
   room at 20 °C peaks at 9.9 µm; a 640 × 12 µm array behind a 13 mm f/1 lens sees 0.92 mrad, which is 9 mm at 10 m,
   and is matched to its own lens because the blur a lens cannot beat is 1.22 λ F — the f-number alone, whatever the
   focal length, so 12 µm at f/1 is the finest pitch worth making; 1 cm⁻¹ asks 10 mm of path difference, 5 mm of
   mirror travel and 31,606 points a scan; 25 W of pulse off a 10 % target comes back as 34 nW at 100 m through a
   25 mm aperture. Adding Beer–Lambert had a result nobody asked for: the probe's house (`tests/nexus/probe.test.ts`)
   had no producer at all for light, and now has one — the attempt gets one step further and stops at the boundary,
   which is the distinction that probe exists to find. Three faults the gate found and this fixed at the cause: a tube
   head drawn at one size whatever its rating (it now grows as the cube root of the heat it must take, which is what
   makes the drawing follow its mass law instead of standing still); an FTIR bench drawn at one size whatever its
   resolution (its length is now the mirror's travel, so a 4 cm⁻¹ instrument is 24 kg and a 0.25 one 54); and claims on
   items that are themselves assemblies — an LCD module, a laser diode in its can, a lithium pouch cell — which the
   completeness check is right to refuse, so each is drawn and says what is not drawn apart instead.
   Still waiting in the breakdown queue from this round: `slip-ring`, listed as brass and acetal, its rings and brushes
   to be broken out.
   Judged blind (2026-10-10, round 1): the worst scores anything here has had — the flat panel 1/10 and 8 % of a
   photograph ("a box primitive with a bevel"), the thermal camera 2/10 ("if it is a camera, there are no optics"),
   the FTIR 2/10, the tube head 3/10 ("I cannot confidently say what it is, and that is the main finding"), the lidar
   5/10 and the only one it could name. It gave one cause for all five, and it is the right one: *every one of these
   is a single continuous shell with no evidence that it was manufactured or that it connects to anything.* So this
   round is interfaces and breaks, not shapes: the parting line where a lid meets a body, visible fasteners, the
   connector and the cable entry, the mounting holes and feet, and a real recessed opening where the device looks out
   at the world. The tube head now comes apart on two bolted end flanges, carries a high-voltage receptacle at each
   end (a well bored 19 mm deep with three pins down it and a knurled brass collar to screw a plug into), hangs on
   trunnions through collared bosses, and its collimator is as wide as the head it hangs under with the field cut
   square out of its face, two leaf knobs on their shafts, a field lamp and cross-hairs — at a third that width it
   had read as "a small cuboid under its midpoint", which is to say a mount that would let the thing roll off. The
   panel is a tub of four rails on a back plate with its carbon cover sunk inside the bezel, its active area marked
   at the middle and the four edges and TUBE SIDE printed on it, a handle in its own recess, a battery door and
   latch, a tether socket with four gold contacts under a rubber flap, three lights and rubber at every corner. The
   camera's lens now stands out of the body in a barrel with a knurled focus ring, the germanium sunk 9 mm down a
   bored well so the aperture is an opening and not a flat wall; its case is two shells with the step between them,
   its screen sits behind a bezel, and it has a grip with rubber where it is held, a trigger, a USB-C and card slot
   in a well under a flap, a 1/4-20 insert in its foot and a strap lug. The FTIR stands on its own cast base as a
   plinth with rubber feet, the sample compartment's hatch is cut out of the cover's top and hinged with a latch and
   a window, and the front carries a sunk display with four keys, the back an IEC inlet with its three pins, a purge
   fitting and nipple, a fan guard and the four screws that open it. The lidar is bolted down by a flange with four
   M6 and an alignment pin, its emitter and receiver blocks stand behind the glass with a lens over every channel
   (the window had been drawn with its inner face on the head's outer wall, so what was behind the glass was a wall),
   its cap is flush with the head and screwed, and it carries its model plate and the laser label every one of these
   has.
   Three faults the gate found that no judge could: a thermal camera's screen drawn 70 mm deep in a 62 mm body (it
   stood out of both sides as the "floating tab" the judge saw), an FTIR's electronics box hanging 9 mm past the end
   of its own cover and 33 mm out of its back, and — the general one — every kind's declared size standing still
   while its drawing grew, so a tube head sold as 330 mm long was drawn 419. Each kind's box is now computed by the
   same function its drawing is (`tubeBox`, `panelBox`, `camBox`, `ftirBox`, `lidarBox`), and a test asserts the
   drawing's own span is what the catalogue sells it by, to 2 mm and 2 %. That check is the one worth keeping: a part
   cannot grow out through its own case unseen again. Two more it forced honestly: a 64-channel lidar does not fit a
   103 mm puck, so its body grows (and the mass law past 32 channels is now a line from Velodyne's VLP-32C to its
   128-channel Alpha Prime rather than a per-channel guess), and a part carrying `prints` is drawn as that one face
   alone — putting the panel's marks on the cover itself had made the cover invisible and shown the scintillator
   through it, so the marks are their own print laid over it, as a board's silkscreen is.
   Judged blind again (round 2, a fresh judge on a stricter scale — "all five sit well below 50 % of a photograph"):
   the tube head 4/10, the panel 3, the camera 3, the FTIR 2, the lidar 5. It named the panel, the lidar and the tube
   head on sight, which round 1 could not, and it gave the same cause again, sharper: *model the service interface —
   connectors, cable entries, fasteners and panel seams — on every object, instead of leaving it off or substituting a
   decal.* Of what it listed, four were real and are fixed at the cause. The lidar had an open annulus between its cap
   and its core that you could see down into, because what turns was drawn as a narrow drum with the window band
   floating outside it: the outside of a spinning lidar is one drum with a band of glass let into it, so it now has a
   shroud above and below the window, the cap is flush with that shroud, and the window's inside is the emitter and
   receiver blocks. Its mounting bolt circle was under its own body where no key could reach it, and is now outside it
   on a wider flange with the screw heads standing on top. Its connector sat half-buried in the base; it is now sealed
   into a machined boss and has a cable. The FTIR's cover had been made 8 mm narrower than the base it stands on
   without re-anchoring what is on its faces, so the display stood 4 mm proud and the name plate was sunk inside: every
   outside part is now placed against the cover's own faces, and it carries its name across the front — which is what
   took it from "I cannot tell what it is, and that is the honest answer" to an instrument you can name from across the
   room. It also has a mains lead now, and the lidar a cable, because "no cables of any kind" was the judge's first
   note on three of the five.
   And one fault that was mine from the round before, found by that same note: the panel had no contact shadow at all.
   A normal bias is there to compensate the shadow map's texel size, and the renderer-wide round had set it to a
   fiftieth of the object across — which on a 430 mm panel 19 mm thick is 5.5 mm, enough to push the floor's own
   samples up past the panel and cancel its shadow. It is now a texel and a half of the shadow map (`look.ts`), which
   is what the number is for, and every flat thing in the library gets its contact shadow back.
   The breakdown queue's own check caught the last one: a one-channel lidar in a 103 mm puck drew 24 % over its mass
   law, because that law is fitted to Velodyne's 16- and 32-channel pucks and extrapolating it down to one channel
   prices a body that does not change. A single-beam 2D scanner (Hokuyo's UST-10LX, 130 g in a 60 mm body; SICK's TiM)
   is a different instrument in a different body, so it is kept off this kind's grid and said so, rather than made to
   fit figures that are not its own.
   Next: the older Now items (robot benches, likeness, life graph, prices).
15. The works, and the wire out of it (2026-10-10). The user: *"designe me a advanced actually working industrial
   creation engineer thing ran by a robot or robots think of the cheapest possible enviornments where anything can be
   created I don't care if I gotta build it peice by peice from the ground up"*, then — rejecting the first answer, a
   catalogue of shop tiers — *"no redesign it think about throwing random builds at it and how it would manage building
   that in real life oooh actually this will be the spot and whatever you build in there I'm gonna build in real life
   and connect whatever program you do into it via Bluetooth so make that possible that like I can run programming
   through here like you could manage the process in real life"*, and then two constraints: *"it just needs to be super
   capable for under 3000$"* and *"anything that cuts price will be done even if it causes a lot more work"*.
   So `works.ts` is a job router, not a shopping list. All making is six families — add, cut, form, join, treat,
   measure — and a works that covers all six over a class of material can make anything in that class inside its
   envelope, which is checkable. Throw any bill of materials at `planJob` and every line becomes an operation on a
   named station, a purchase with the process that is missing as its reason, or a gap that names its cause and the
   cheapest station that would close it; then the operations are scheduled across the machines there are, one job at a
   time per station. Six unlike builds are kept to test it (`BUILDS`: a welded steel bench, a go-kart frame, a
   quadcopter, a thrown mug, a cast gearbox housing, a concrete wall) and nothing in the router is special-cased for
   any of them.
   The routing rules are written down because every one of them was a fault the first run made: a process that only
   prepares, finishes or joins never makes a part (a bandsaw was producing a gearbox housing); a process that makes one
   shape is only offered that shape (a lathe was turning a printed landing foot, because turning is faster per cubic
   centimetre than printing — true and absurd); among the processes that fit, the one that does *this* job in the
   fewest minutes wins, setup included, which is what makes a 390 cm³ housing a casting and a plate a milled part
   without either being named; measuring never makes anything; a treatment is charged per load, not per part (a kiln
   fires one mug in the time it fires forty); a part cut from sheet is charged its kerf and not its block; and what is
   bought as a finished component (`ALWAYS_BOUGHT`, with the process that is missing for each: a ground raceway, a
   wound coil, a rolled thread, a wafer fab) is kept apart from what is bought as material and still worked here
   (`STOCK`) — conflating the two is how a plan for a welded bench quietly loses the welding. A joint the build
   declares can happen before the firing (`when: 'before-finishing'`), because a handle slipped onto a fired mug does
   not stick.
   The wire out is `link.ts`. Web Bluetooth is BLE only, so every HC-05 is unreachable from a browser and the bridge is
   a XIAO ESP32C3 ($4.99, Seeed's own price) running UART-to-NUS on the controller's serial header. One BLE write
   carries 20 bytes and a browser never reports the negotiated MTU, so a line of G-code is two or three writes;
   Marlin's `ok` is the flow control and `N<n> … *<xor>` turns a dropped byte into a `Resend:` instead of a feedrate
   silently a tenth of what was meant. `Streamer` holds all of that and runs in the gate without a radio;
   `view/ble.ts` is the thin half that cannot be tested here. Klipper takes no G-code on a serial port from a host, so
   a Klipper machine goes over wifi to Moonraker and this says so rather than pretending one way fits. Every operation
   carries its own program: real runnable G-code for a cut part, a real start and end for a print, a kiln's segments to
   be keyed in, and steps with a check for the stations that have no port — which is most of a cheap works, and saying
   so beats a Connect button that fails.
   The $3,000 works is derived, not chosen: `worksUnder(3000)` spends each dollar where it buys the most capability,
   scoring a family of making far above a second machine in a family already covered and a wanted material class above
   one that is not — without that last part it buys a potter's wheel before a 3D printer and is right by its own score.
   It takes the cheap-and-laborious path wherever there is one, because that is what was asked for: each station
   carries a secondhand price and, where it is genuinely makeable, a self-build with its material cost, its hours and
   the stations it needs first (the bench is welded once there is a welder; the forge is a lined tube and a pipe-fitting
   burner; the foundry is that same burner in a lined pail; the brake is two lengths of angle; the kiln is firebrick
   and Kanthal). It comes out at 16 stations, about $2,590 and 48 hours of work against $4,973 bought new, covering all
   six families over nine material classes and holding ±0.05 mm. The safety kit is the one line it will not cut, and it
   is added automatically the moment a hazardous station is chosen: a works that owns a welder and not a helmet is not
   cheaper, it is unbuilt.
   What that works still cannot do, and says so: a bearing seat to ±0.02 mm (the cheapest station that would is a used
   knee mill at $4,000), a ground shaft to ±0.01, and anything in concrete. Those are the real limits of a cheap shop
   and the engine names them instead of making something up.
   Then (2026-10-10), the user: *"increase efficiency, add ability, stop having to think and make a tool for anything
   that does make you think or makes things hard or gets tricky … edges, probes, pipeline, edged superior math and
   context and awareness"*, and then *"look at how messy you have the code … go organize code merge stuff seperate
   stuff and move it to the right thing … organize hard"* and *"organize the full systems code"*.
   Taken literally, and the first part first: every tolerance in the engine had been a number written down by feel.
   `parts/fits.ts` deletes that. ISO 286's grade table, its fundamental deviations for f, g, k and p (tables, not
   formulas: a closed form fitted to them gave a press fit at 25 mm that could come out with seven microns of
   clearance in it, which is not a press fit), the fits built on them, tolerance stack-up worst-case and
   root-sum-square, and process capability — Cp, Cpk, parts per million outside, and how many to start to keep n.
   A tolerance is now derived from what a feature has to do, and a part that locates nothing carries none: that last
   part is the fix that let a potter's wheel make a mug again, because no wheel holds IT11 and nothing about a thrown
   mug asks it to.
   That bought the ability the round was for. The tolerance check is no longer a cliff: a process is eligible while
   its Cpk is above a floor, the scrap it costs comes back in the verdict, and the plan starts eight to keep six
   instead of finding out at the measuring bench. A refusal now reads "the nearest is a mini lathe at Cpk 0.18, three
   made for every one kept" instead of "nothing here holds that".
   Then the tools for the things that had been worked out by hand: `machines/link.ts` gained the real cutting
   arithmetic (surface speed, chip load, material off a minute, spindle power, the stickout that chatters, the inside
   corner a cutter cannot leave) so a run time comes from the cutter and the material rather than a number invented
   per process; `parts/finish.ts` gained the burr (which side, how tall, what takes it off, and that 0.2 mm of it
   under a face held to 0.02 is a shim); `works/audit.ts` has the engine check its own plan and attach the complaint
   rather than hand back a plan that lost a part; `works/schedule.ts` reports the makespan against the floor set by
   the critical path and the busiest station, so a schedule is judged against what is possible; and a touch probe is
   an operation now, taking 40 % off a setup where the station has one. The awareness: `works/can.ts` keeps what has
   been measured, and from about thirty parts believes the measurement over the class figure — which is the loop the
   file kept claiming to close, closed. A machine measured better is then given work it was refused before, and the
   test for that is what caught the end-mill stickout rule being applied to a lathe, which has no stickout.
   `npm run works` prints a plan, a budget, a build or the fits table. The four rounds before this one each opened by
   writing a probe test whose only job was to print what the engine says, and then deleting it; this file has said
   since the beginning that a thing worked out by hand twice becomes a tool, and this had been worked out four times.
   It found four faults in its first run (a bearing seat read as a wheel, a LiPo pack priced off a battery holder, a
   tolerance chain of ±Infinity, a gap that quoted a whole fit lecture).
   And the organizing, which was the second ask and the fair one: `works.ts` had become six concerns in 1,233 lines,
   which is exactly what this file's own rule exists to prevent, and `src/nexus` was 183 files in one directory, which
   is how a second owner gets written for something that already had one. `works/` is now twelve files with one
   concern each, and the tree is fifteen directories (see "Where the code lives" above), done as one mechanical pass
   with every import recomputed from the real dependency. 135 files carried `src/nexus/<name>.ts` paths inside their own
   prose; the geometry taxonomy asserts those paths exist, which is how that was caught rather than discovered later.
   And then, the user: *"keep cleaning up code and improving effeciency give yourself tasks on the build I requested
   and monitor yourself also avoid making the same mistake that's making the code get sloppy keep it clean"*. The
   mistake has five repeatable forms and none of them is caught by a type checker, so each is now caught by
   machinery (`tests/nexus/tidy.test.ts`, `npm run tidy`, half a second inside the gate): content goes to the nearest
   open file until that file owns six things; a file arrives with no header, so the next round cannot tell it is
   already the owner of something and writes a second one; two files export one name; a path in prose goes stale the
   moment a file moves; and a layer imports one that should depend on it, which is a cycle as soon as anything
   answers back. Two of the five are pass/fail (a header on every file, and every `src/nexus/….ts` path named in
   any file or in this one being real — which is how the 135 stale paths from the move were caught); three are
   ratchets, because this tree already carries the debt and a gate that fails on day one gets switched off. A ratchet
   writes the debt down to the number and refuses to let it grow: a new oversize file, a new name clash or one more
   import up a layer fails with its own name in the message, and a *fixed* one fails too, until its line is deleted.
   So the lists only get shorter and every line is a piece of work someone can pick up. What they say today: four
   tables of real things are allowed to be long and nine files of logic are too long with what each splits into
   written beside it (`view/forge.ts` at 4,043 lines is five concerns); 111 names have two declarations; and 23
   edges, 108 imports, run up a layer. Four causes account for 63 of those 108, and three of the four are the same
   mistake — a vocabulary (`Term` and `Law` in the engine, `Want` in the asking) living inside one of the two
   layers that speak it, which is fixed by moving the vocabulary below both. The fourth is `parts/components.ts`,
   the registry that draws every kind: it imports every machine's, board's and catalogue's drawer, so 45 of those
   imports are one file reaching up out of the library it lives in. A registry belongs above what it registers.
   It found three faults as soon as it ran: `src/nexus/index.ts` had no header at all (it is the door, and now says
   so), and two files named a path that was never real — the illustration `src/nexus/<name>.ts`, which is now
   written so it cannot be mistaken for one.
   Then the bridge itself (2026-10-11), which is the part of the wire out that has to exist in the user's hands and not
   only in the file: *"whatever you build in there I'm gonna build in real life and connect whatever program you do
   into it via Bluetooth"*. It is three orderable parts — a XIAO ESP32C3 ($4.99, Seeed's own price), three
   female-to-female jumper leads ($1.95 for twenty, Adafruit 1950) and, only where the controller's logic is 5 V, a
   BSS138 level converter ($3.95, Adafruit 757, seen 2026-10-11) — plus the bench the steps need. $56.14 with an iron
   and a meter bought, $6.94 with them owned. It carries its own sketch: `bridgeSketch()` writes the whole
   UART-to-NUS pipe for the ESP32 Arduino core, and the pack ships it as `bridge.ino` so there is nothing to copy out
   of a page. Two numbers in it are decisions and not defaults: the pins are D2 and D3, not the ones marked TX and RX,
   because D6 is U0TXD and the chip's boot ROM prints its log there at every reset — straight into the machine's RX,
   which answers with an unknown-command echo every time the bridge is powered; and the sketch asks for a 247-byte
   MTU but keeps writing 20 bytes until the connection grants more, because a browser never reports what it
   negotiated. The wiring is now seven steps with something you can see at each one, generated from the link's own
   figures (its baud, the service's UUIDs, the payload) rather than written out, so the room (`wiring()`), the lesson
   (`bridge-ble`) and the build pack say the same thing and none of them is a copy. The step that matters is the
   second: measure the controller's TX against ground before anything is wired, because an ESP32-C3 pin is rated
   3.6 V absolute maximum and 5 V on it is a dead board, not a flaky one. Two faults in the pack came out of building
   it: a tool wanted by two steps was bought twice (the bridge wants a multimeter to measure the logic voltage and
   the soldering steps want one to check joints — it is the same meter, so a line already in the bench or the
   nice-to-haves now takes the larger count and never the sum), and a flag dropped its count, so "two bluetooth
   bridges" bought one.
   And the gate, measured rather than guessed at (2026-10-11): 568 s of test time over 165 files, 228 s of wall clock,
   and half of that wall was two sweeps sharing nowhere to run — every kit at three seeds (64 s) and every kit through
   the make pipeline (42 s) were the longest tests in two files that each had other work to do. vitest runs files in
   parallel and a file's own tests in order, so they are now files of their own (`tests/nexus/kits-every.test.ts`,
   `tests/nexus/make-every.test.ts`) and overlap instead of queueing: 106 s of the critical path becomes 64. The
   transform cache (`fsModuleCache`) is on too, which vitest itself had been suggesting on every run — a quarter of a
   short run was transforming modules that had not changed.
   Then the works as a thing to order (2026-10-11): `npm run pack -- works <folder>` writes the whole shop as sixteen
   stations in the order to come by them, which is the part a list of machines cannot tell you — the welder is step 9
   and the brake step 10 because the brake is two lengths of angle welded along a hinge line, and the forge comes
   before the furnace because the furnace is the forge's burner in a lined pail. $2,589.95 and 48 hours against
   $4,972.93 with everything bought new: the order itself saves $2,382.98. Each station carries its seller's own
   listing where one sells it (the soldering iron is Adafruit's, as seen), the used market's figure where that is the
   cheap path and said to be an estimate of a market, or — for the four made here — what it is made of. Two of those
   four now have a bill of materials of their own (`BUILDS`: the 600 mm sheet brake, and the crucible furnace), so a
   self-build is routed as a job *on the works as it stood when it was made*: the brake's 102 minutes run on the nine
   stations bought before it and never on the finished shop, which is the whole reason the order matters.
   Writing those two bills found four faults in the engine's own data, which is what throwing a new build at it is
   for. A part named "bending leaf" was forged rather than cut, because the stock rules match words and that one did
   not say "angle" (it does now, and it is one). A bought steel pail was forged too — a pail is deep-drawn in one hit
   on a press of hundreds of tonnes, $8 finished, and is now in `ALWAYS_BOUGHT` with that reason, as is a
   clay-graphite crucible, which fails with 3 kg of molten aluminium in it if you make your own. And a bag of
   refractory castable was refused outright ("not a material any process here works") when the truth is that you buy
   it by the bag and pour it by hand: stock of a material no process here works is now bought with its own reason
   rather than called impossible, because saying "cannot be done here" of a $20 bag is the engine being wrong in the
   most discouraging direction.
   Then the works standing in the forge room (2026-10-11): `works/floor.ts` lays the stations out on a real floor (hot
   ones against the outside wall first, rows in pairs sharing a 0.9 m aisle, the room's width from the widest station
   and the floor it needs: 7.6 × 9 m for the $3,000 works's 35.8 m² of stations), and `view/works-room.ts` stands that
   up — floor, metre grid, four walls with a doorway, its own light, and each station with a card saying what it does
   and how a program reaches it. "show me the works" walks you in at its door.
   And then the user, seeing it: *"why does everything look bogus you need to use the tools we have already spent days
   working on and making those more capable instead of thinking so hard"*. Right, and the fault was mine: the room drew
   stand-in silhouettes for fifteen of its sixteen stations when the library already draws the Ender-3 whole from
   Creality's own assembly. Then, redirecting again: *"no create new machines and new inventions so go find components
   and you already have other machines to reference ... there's code you can review and ways to create your own code
   and stuff think about how you made this app or can make any app random without having to know an exact blueprint
   rails could be mobility robotic hands"*.
   So: `src/nexus/ask/machine.ts`, which is the same rule as `invent.ts` one level up. `invent.ts` chains *flows* —
   a port carries power in one domain, meets a port of the same kind, and conservation sizes the chain. This chains
   *motion and structure*: a unit has a base it is bolted to and a moving end that carries the next, and a stack is
   sound when every stage carries the mass of everything above it. The words are a screw axis, a belt axis, a turn
   axis, a hot end, a spindle, a gripper, an eye, a brain and a frame — nine units, every one of them a real assembly
   of parts the component library really draws, checked by a test that no unit names a part the library cannot make.
   Three slides under a hot end spell a 3D printer; three under a spindle spell a router; two under a gripper and an
   eye spell a pick-and-place; one long slide under a hand is the thing the user named. None of them is stored
   anywhere. A 300 × 300 × 400 printer comes out at 10.9 kg and $414, a 400 × 300 × 80 router at 11.1 kg and $381, a
   pick-and-place at 14.8 kg and $288 — each priced off the seller pages an earlier round sourced, with every line that
   has no page named rather than guessed at.
   The numbers are the point, and they are all derived: a screw axis's force is 2π T η / lead off the NEMA 17's own
   0.42 N·m, so it raises 13.5 kg at 40 mm/s; a belt axis is the same parts over a 20-tooth GT2's 6.37 mm pitch radius,
   so it raises 6.7 kg at 300 mm/s. That is why a cut gets screws on all three axes and a print gets belts across —
   derived, not written down. And what a unit *carries* is a different number from what it *raises*: the rail takes the
   first and the drive takes the second, which is the whole difference between a Z axis and an X axis of the same parts.
   Two faults in its own first run, both kept as tests: tools were stacked on each other, so a camera beside a gripper
   was asked to hold the gripper's load, and a payload was added to every stage alike. Tools bolt to the top axis side
   by side; a payload hangs from whatever grips it and is checked against *that* grip ("it grips 1.5 kg and was asked to
   hold 2 kg"). A third: bought lines carried no mass, so the eye and the brain weighed a gram and every stage below
   them was checked against a load that was not there — a bought line now carries its own listing's weight.
   Then `machineBuild` in `works/builds.ts` throws the invented machine at the works, which is the rest of what was
   asked ("whatever we have to do first or buy or code"): 25 lines bought for $201, fifteen lengths of extrusion cut
   here, 145 bolts, 7.5 h of hands, nothing it cannot do. The lines are named by the component library's own names for
   the parts, not by the words that drew them, because the router matches on what a thing *is*. Throwing a machine it
   had never seen at it found four faults in the router's own data, each fixed at the cause in `works/lines.ts`: a $3
   flexible coupling came out *forged on the propane forge*, a GT2 pulley came out turned on the mini lathe (a tooth
   form is hobbed or moulded to the belt's pitch; a lathe turns the blank and cannot cut the form), and the MK8 block,
   heat sink, nozzle and drive gear each failed for a different reason when all four are the same $5 answer.
   Next: the room drawing every station from the library rather than as a stand-in (the Ender-3 is wired; the rest want
   their kinds, and the inventor's units are now the vocabulary to build them from), an invented machine stood in the
   room and judged blind, prices for the lines that still have none, working the three ratchets down by cause, and the
   older Now items (robot benches, likeness, life graph).
The network allows GitHub and package registries only: makers' sites and datasheets come through search snippets,
Tavily's extract (it returned Würth's datasheet text), Firecrawl (its credits are low) or GitHub (KiCad's libraries,
makers' documentation repos: ask for each with add_repo first, then a blobless clone and fetch only the files needed);
the user can widen it under the environment's Network access.

## Working here

- Gate: `npm run gate` (long; run it in the background and log to a file). Build the viewer:
  `npx vite build --config vite.view.config.ts --logLevel error`.
- The gate is 228 s, and two sweeps are half of it: every kit at three seeds (`tests/nexus/kits-every.test.ts`, 64 s)
  and every kit through the make pipeline (`tests/nexus/make-every.test.ts`, 42 s). They are in files of their own
  because vitest runs files in parallel and a file's own tests in order: together in one file they cost the wall clock
  106 s, apart they cost 64. Keep them apart, and put a new long sweep in its own file for the same reason.
- `npm run tidy` is the half-second part of the gate that checks the tree's own shape, and it is the thing to run
  before and after moving anything. Its three ratchets (oversize files, name clashes, imports up a layer) hold the
  present debt to the number: they fail on a new one by name, and they fail on a fixed one until its line is
  deleted, so the lists only ever get shorter. Never raise a number to make it pass.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
