# The round log

What each round did, in order, with the faults it found and the cause each was fixed at. This was CLAUDE.md's `Now`
section: 1,678 of its 2,166 lines, which is why nobody could read the anchor before a round. It is history and
reference, not instruction - CLAUDE.md keeps what is still *open* and the rules that hold every round. Append a round
here; keep the standing rules there.

The faults are the valuable part: almost every one has a general lesson under it, and several came back twice before
the lesson was turned into a check. Read the rounds for the thing you are about to touch before touching it.

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
   It found three faults as soon as it ran: the root barrel `index.ts` (deleted in Run 7s) had no header at all (it was the door, and then said
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
   Then the arrangement (2026-10-11, the same round), because the first run of the inventor was a template wearing a
   composer's clothes: every ask came out a frame with three slides stacked in it, whatever it asked for. The user's
   own example was the giveaway — *"rails could be mobility robotic hands"* — and a rail-mounted hand is not a gantry.
   So the arrangement comes out of the words too: "along a wall" is a rail, "reaches" is an arm, "lathe" or "wheel" is
   a turning table, and anything that has to get anywhere in a box is a gantry. That changes which check even applies.
   A gantry and a rail are checked by *mass*, because what fails is a rail carrying what stands on it. An arm is
   checked by *torque*, because what fails is a joint holding a load out at the end of a link — and a joint that holds
   1.2 N·m does not care that the load is half a kilogram if it is half a kilogram 400 mm away. So each joint is geared
   against the moment it actually has to hold with the arm straight out (the worst case, and the one people build and
   then discover): a 300 mm arm holding 1 kg gets a 10:1 shoulder, a 600 mm one gets 20:1 and turns at half the speed,
   and a 1200 mm arm holding 3 kg is refused — "the shoulder has to hold 40.88 N·m straight out and a NEMA 17 geared
   50:1 by belt holds 19.95: shorten the link, take the load off with a counterbalance spring, or put a worm or
   cycloidal reducer there instead of a belt (which is where a cheap arm stops being cheap)". Nothing in that is
   written down; the ratio is chosen from a ladder against the moment, which is why it can refuse honestly.
   Three more faults of its own found by running it: a rail's length and an arm's reach are given by one number
   ("along a wall 3000 mm", "reaches 600 mm") which the reader wanted two of and so defaulted to 300; a joint's load
   was a moment being printed as kilograms (a stage now says which it is in, and a test asserts one is never printed as
   the other); and a gripper refused on the arm path said "NO — undefined".
   Then the user again, and further out: *"no you need to think of an assembly of things that already exist or things
   that can be combined or whatever too be able too create almost anything like a robot that has a whole workshop that
   it can build whatever it want or even use a computer to order parts"*. Every piece that needs was already here and
   this round is the joining of it (`works/tend.ts`): `plan.ts` says which station does what, `floor.ts` says where
   each station stands, `ask/machine.ts` composes the robot itself out of library parts and checks its joints against
   the moment they hold, `link.ts` is the wire that carries a program to a machine, and `prices.ts` holds the seller
   pages. Throw a build at a *tended* works and it says: which rails, what to order and from whom, who does each step,
   and what one more thing would hand the robot.
   The findings are the point, and they are all arithmetic over the real layout. A hand on a rail reaches 0.60 m off
   it and an aisle is 0.9 m wide, so one rail serves the two rows facing its aisle **and no more** — which means a
   sixteen-station works takes two rails ($378 and 53 kg of the same machine twice) and still leaves six stations out,
   and at three rails or more a robot on a floor base that drives between the rows is the cheaper answer. That is a
   decision a number makes rather than a preference. A 5-inch quadcopter comes out **94 % tended**: 247 machine-minutes
   to the robot, 15 to a person (soldering, and two callipering steps at a surface plate no aisle faces). A welded
   steel bench comes out 50 %, because sawing and twenty welds are hands whatever else is not. What it would take
   next is named with the minutes it would save: a hand that can solder, 13 min; a hand that can calliper, 2 min.
   Two things are said plainly rather than pretended, and both are tested. It cannot press a Buy button: it reaches a
   basket — the cheapest real offer for every line, each with its seller, its page, the figure that page showed and
   the day it was seen, split by seller because shipping is per seller and that is most of a small order — and then a
   person pays. And it cannot do most of what a cheap works does: striking and holding an arc is a hand watching a
   puddle through a shade-10 lens at a millimetre of stand-off, pouring molten aluminium is 700 °C in tongs, and
   throwing clay is both hands on a moving wall of it. Each is refused with its reason rather than a shrug, because
   the reason is what tells you which tool to buy.
   Three faults found by running it: `works/floor.ts` had never been added to `works/index.ts`, so `layWorks` imported
   as undefined from the barrel (the round that wrote it only ever imported it by path); an arm too short for the
   layout had no rail to be "off", and reported 0 m rather than saying that a 0.30 m arm cannot tend a works whose
   aisles are 0.9 m wide; and `machines/cell.ts` is not a second works after all — it is the *physics* of a machine
   running (a Printer that really executes Marlin G-code with a trapezoidal profile, a Kiln, a Furnace, lost-PLA
   casting), where `works/` decides which machine and when. That is the boundary, written down.
   And then the loop closed on itself (2026-10-11, the same round). The tender had costed the soldering it could not
   do and said "a hand that can solder: 13 min off you", which is a wish and not an answer. But the iron, the reel,
   the extruder drive and the PTFE tube are all already drawn (`machines/kit-solder.ts`), so the answer was to compose
   the hand rather than to want it: `SOLDER_HEAD` is a Pinecil V2 in a printed cradle at 50° to the work, its 0.5 mm
   63/37 fed from its own reel by an MK8 gear on a NEMA 17 down a Bowden tube — *the same drive an extruder is,
   because feeding solder wire and feeding filament are the same problem*. $151 of parts, 0.6 kg, every line of it in
   the library already, and the works builds it rather than buying it.
   Fitting it takes the quadcopter from 94 % tended to **99 %**: 260 machine-minutes to the robot, 2 to a person. And
   the 2 that are left are not a tool problem at all — they are two callipering steps at a surface plate that stands
   in a row no aisle faces, so the answer is to move it, which the engine now says in those words.
   That distinction is the round's real work. `TENDS` no longer hardcodes who does what: it says what each operation
   needs of a pair of hands (`needs: Does[]`), and that is read against what the robot's own machine affords, so
   adding a tool changes what it can be asked to do without a line of the table changing. A verdict now carries *what
   kind* of why it is — `tool` (and names the buildable one), `place`, `never`, `unwritten` — because the first run
   classified it by matching its own prose and "out of every rail's reach" did not match the pattern looking for it.
   `never` is kept for what nothing composed here reaches at all (an arc, a pour, throwing clay, a hand brake's
   lever), and it is never offered as something to build, which is tested.
   And then it was drawn (2026-10-11, the same round), because a machine that is only a list of parts is the fault the
   user named in the first place. `layUnit` gives each unit its own layout — a slide is a beam along its travel with
   the rail on its top face, the carriage at mid-span, the motor hung off one end and the screw or belt between them;
   a turn axis is the motor under its bearing pair with the pulleys between; a frame is twelve lengths on the edges of
   its own box — and `machineParts` places the units: a gantry stacks them and turns every second slide across the
   first (which is what a gantry *is*), an arm marches its joints along its own links. The first run of it laid every
   part on a 60 mm lattice, which is what a bill of materials looks like when you pretend it is a machine.
   `machineWords` now takes `stand` and `use` as plain functions, so `ask/` draws into the room without knowing
   anything about the viewer, and "a machine that prints 300x300x400" stands one in front of you. Rendered and looked
   at: it reads as a 2040 frame with a gantry in it, which is exactly what it is. Two faults from looking: it opened
   *exploded*, so a thing nobody has seen before was shown as its pieces before it was shown as the thing
   (`showPart` now takes `apart`), and the room's own "9,403 g drawn" sat next to a composed 10.92 kg — not a bug but
   two numbers disagreeing on one screen, so it now says which is which and names the bought lines that have a
   listing's mass and no drawing.
   Then the room stopped being bogus (2026-10-11, the same round), which is where this all started. A benchtop CNC
   *is* three slides and a spindle, and a mini lathe *is* a turning table with a tool brought in on a slide, and the
   inventor already makes exactly those. So `view/works-room.ts` has a `COMPOSED` map beside its `DRAWN` one: a
   station with no kind in the library is composed out of parts the library does draw, at that station's own envelope
   from `works/stations.ts`. The works room now stands 1 machine from a maker's own model (the Ender-3), 3 composed,
   and 12 stand-ins — and where no composition is honest (a resin printer is a vat and a lift, not a gantry; a forge
   is a lined tube) the station stays a stand-in, because a wrong machine is worse than an admitted placeholder.
   One rule covers both sources: a maker's model is measured in millimetres and a composed machine is laid out in
   metres, so the room asks the drawing how big it came out — nothing in a workshop is 20 m across, so a box that
   says it is was drawn in millimetres.
   Two faults from looking at it, and they are the same fault twice: the room *said* "1 of them is drawn as the
   machine it is; the rest stand as a stand-in" while four were real, and each composed station's card still read
   "not drawn yet". A sentence that goes stale the moment the room gets better at its job has to be derived from what
   is standing, so both now are, and a test asserts the counts in the sentence are the counts of what stands.
   Judged blind (2026-10-11), and it is the worst score anything here has had: **1/10**, read as "a low-poly floor-plan
   mock-up — a space-planning visualisation, not an attempt at a real workshop", with under 10 % confidence it could
   name any individual machine from its geometry. Three of its findings were real and are fixed at the cause.
   The first is the one it led with, and it was not a rendering taste: *"not one bench leg casts a shadow on the floor,
   so the whole room reads as hovering."* Every light in the works sets `castShadow` and every mesh in it sets
   `castShadow`/`receiveShadow`, and none of it did anything — because `view/forge.ts` never switched the renderer's
   shadow map on at all. One line, and sixteen stations are planted on the floor. (Soft PCF: a shop is lit by a
   ceiling of diffuse fittings, not a point source.)
   The second: *"no ceiling — above the wall tops is pure black void."* True, and worse than it sounds, because the
   room was lit by nothing you could see. It has a ceiling now, with its fittings in rows down the aisles where a
   shop's are, each a lit panel rather than a lamp, so the light has a reason.
   The third was my own bug and the judge found it without knowing the code: *"the benchtop CNC is a spidery frame of
   members at the wrong scale, half of it hanging off the bench with its uprights terminating in empty space."* A
   prism — every length of extrusion, angle and bar the library draws — runs along **z** with its section in x-y
   (`parts/kits.ts` says so in its own type), and `layUnit` had laid every beam as though it ran along x. So a frame
   came out as twelve beams all lying the same way. There are exactly three ways to point one and they are now named
   constants in that file.
   Still open from that judge, and all fair: the walls are bare taupe with no outlets, conduit, isolators, extraction
   duct or compressed-air line, on a wall the room itself labels "outside wall — power, extraction"; no door; no
   stools, stock racks, chip bins or swarf; every material is one flat colour with the same shader, so steel, cast
   iron, MDF and clay look alike; no chamfer on any slab edge; the floor markings are zero-thickness decals that clip
   their benches; and the twelve stand-ins are still interchangeable grey boxes that only their cards tell apart.
   The first of the judge's "every station is an anonymous grey box" fixed the same way the CNC was (2026-10-11): the
   tools *are* drawn even where the bench is not. `KIT_ON` puts the library's own soldering kit on the soldering
   bench — the S-11 stand with the Pinecil in it, the 599B brass-wool cleaner, the reel of 0.5 mm 63/37, the CHP-170
   cutters, the MZ101 helping hands, a BB400 and the flux pen — and the XIAO and a Perma-Proto on the computer bench.
   The hand tools and the measuring set are deliberately left off: the library *knows* a 16 oz claw hammer and a
   150 mm vernier caliper (they are in the catalogue with their figures) and does not draw them yet, and putting a box
   on a bench and calling it a micrometer is the exact fault this is fixing. Those benches stay bare, their cards say
   "not drawn yet", and a kitted one says "its tools are drawn whole; the bench under them is not yet". The room's own
   sentence counts all four kinds now: 1 modelled, 3 composed, 2 kitted, 10 stand-ins.
   Three stations now draw themselves from the bill the plan already routes (2026-10-11): the welded bench, the
   sheet-metal brake and the crucible furnace. Nothing about them is new data — `works/builds.ts` already held every
   line, its size, its volume and its material, and `pack.ts` already said which build makes which station. Only the
   *places* are new (`Build.lay`), because a drawing beside a bill is a second owner of the same fact, and a drawing
   derived from it cannot drift from it. The fifth kind is `built`, and it had to exist: the first run labelled both
   "composed … (src/nexus/ask/machine.ts)", crediting the inventor for something it had not touched — the third time
   this round that a sentence about the room went stale because it was written rather than derived.
   What that drawing found, which is the point of drawing a thing you have only ever added up:
   • **A bill says how long a part is, never which way it lies.** The first furnace came out as two cylinders lying
     on their sides inside each other. Writing the turn as three Euler angles is what caused the `layUnit` bug a day
     earlier, so a lay now says a *direction* (`along`, with `roll` about its own length) and `layRot` composes the
     frame and reads the angles back out. It also takes which of the part's own axes its length already runs along,
     because the library draws a box x‑y‑z (length along z) and a cylinder standing up (length along y), and
     assuming one convention for both is the same bug a third time.
   • **Four bill lines carried a tenth of their own material.** 40 × 40 × 2 box section is 304 mm² of steel, so
     844 mm of leg is 257 cm³ — the bill said 27, and the two rails and the kart's frame tube were wrong the same
     way (mm³ divided by 10⁴ instead of 10³, one slip made four times). The bench's steel went from 2.8 kg to
     28 kg, which is what a 1.5 m welded bench weighs. A test now checks every line against its envelope and against
     the section its own name states.
   • **A bill's name already states its section**, so the drawing uses it: `sectionOf` turns "50 × 50 × 6" on a
     600 mm angle into a real L and "40 × 40 × 2 box section" into a square tube with its bore, and a test checks
     that the section drawn holds exactly the cm³ the same bill charges for. A `bore` on a line bores it down its
     length, so a pail is a pail and the lining does not hide the crucible standing in it; a `bent: 'ring'` lay draws
     a length of bar as the ring its own length makes (900 mm of 10 mm bar → a 286 mm bail).
   • **The bench was 36 mm taller than its own label.** 880 mm of leg + 6 mm pad + two 25 mm sheets is 936, not the
     900 in its name; the leg is 844 now and a test adds the drawing's own parts up to the height on the label.
   The forge is the fourth (2026-10-11), and it went the other way round: the station already *said* in its own
   `selfBuild` that it is "an empty 20 lb propane tank lined with 50 mm of ceramic wool … the burner is black-iron
   pipe fittings with a 0.035 in MIG contact tip as the orifice", and `forge-propane` is that sentence as a bill —
   fifteen lines, a 200 × 450 chamber, a stand of the same box section as the bench, $50 of fittings against $60 for
   a burner bought finished. Throwing it at the works found two more router faults of the kind the last round found
   four of: a propane tank and a venturi burner were both being *forged*, because a steel line with no size falls to
   forging. Three `ALWAYS_BOUGHT` rules now name them — a hydrotested pressure vessel (and that cutting one open is
   a hand operation on a purged tank, "never a job for a machine that cannot see whether it has been purged"), a
   burner, and threaded black-iron fittings.
   The kiln is the fifth (2026-10-11), the same way: its station already said "a box of insulating firebrick laid dry
   in an angle-iron frame, with Kanthal A1 element wire in grooves cut with a router bit", and `kiln-brick` is that as
   fourteen lines. The size is not chosen, it is what the brick gives: every piece has to come off a 229 × 114 × 64
   K23 brick, so three laid flat across and one laid long make a 342 × 343 floor, a pinwheel of whole bricks on edge
   round it leaves a 214 × 215 chamber, and two courses make it 228 high — 10.5 litres. The one number that is not a
   size is the element: 1.8 kW at 120 V is 8.0 Ω, and 16 AWG Kanthal A-1 at 1.45 µΩ·m is 1.11 Ω/m, so it is 7.2 m
   of wire. It is not drawn, because it is inside the brick.
   Throwing the kiln at the works found the deepest router fault yet, and it was not the kiln's: **the router was
   making parts it had no size for.** `planJob` did `const size = line.size ?? [60, 60, 30]` — so a PID controller
   was turned on the mini lathe, a mains lead cast in the crucible furnace and a venturi burner forged on the anvil,
   each costing invented minutes. A line with no size and no volume is not a shape: there is nothing to cut it from,
   nothing to hold and nothing to measure, so it is a finished part the bill names and does not dimension, and it is
   bought as one. Where a line gives a volume and no size, the block is now the cube of that volume.
   That fix broke the printer tests, and what it uncovered was worse: **every line of a maker's model arrived with no
   size at all**, so the Ender-3's 101 lines and the Voron's 1,314 were all being routed as that invented block, and
   every "what share of a printer this works could make" ever printed was that fiction added up. The library knows
   every one of those parts by the very words the model names them with, and the model itself drew the rest, so
   `jobForModel` now takes each line's size, material and volume from the library (`madeOf`) and `billOf` hands on the
   model's own box for a part the library has no word for. Three more faults fell out of the real sizes:
   • **Two vocabularies for one thing.** `ALWAYS_BOUGHT` was written in bill-English ("M8 × 25 bolt and nut") and the
     maker models speak library-word ("buttonhead M5x10", "slotnut slot6 M3 hammer", "printnozzle MK8 d0.4 brass").
     The works was forging 90 screws for a Voron. The rules know both vocabularies now, and a test throws both models
     at the works and fails if anything the library calls a fastener is made here.
   • **A process that refuses a part was making it impossible.** The mill is quicker than the printer, so a printed
     bracket was routed to the mill, refused on cutter stickout, and reported as unmakeable with the printer that
     prints it standing in the same room. `canMake` takes a `not` list now and `planJob` asks again without the
     process that refused; it is a gap only when every one has refused. The Ender-3 went from 8 gaps to none.
   • **A refractory is never made here** whatever the line is called, and matching on the name alone made "wall
     brick" a purchase and "wall offcut, sawn to 50 × 114 × 64" an impossibility — the same brick twice.
   The honest numbers, measured rather than invented: this works could make **22.4 % of an Ender-3** and **20.5 % of a
   Voron 2.4** — its printed parts (181 on the Voron), its cut extrusion, a few turned spacers and pulleys — and
   what it cannot make it now refuses with the number: a 384 × 404 panel ("nothing here takes a part that big; the
   cheapest station that would is a CO₂ laser cutter"), a 370 mm DIN rail, a pocket deeper than the cutter reaches.
   The spot welder is the sixth, and the only station here that is **only ever built**, because the part that costs
   the money is free: a microwave oven transformer out of a dead microwave, its high-voltage secondary cut out and
   two turns of 50 mm² welding cable put through the window in its place. The sizing is the transformer EMF equation
   and nothing else: V per turn = 4.44 f B A, so 0.64 V a turn at 60 Hz on a 30 × 50 mm limb, two turns is 1.3 V, and
   a loop of a milliohm or two is 500-1,600 A — 0.8 mm steel and the nickel strip a battery pack is made of. $55
   of parts against $250 for the bench machine, and the works' bill is now $2,395 for sixteen stations where buying
   them all new is $4,973. It is written down with its hazard in plain words: the primary side is mains, a cut
   secondary leaves two live ends, it needs the safety kit before the engine counts it, and the mains work is a
   person's, never the robot's.
   One more honesty fix came out of it: the room was saying "drawn from the very bill of materials the plan routes"
   of the bench, which **this** plan buys used for $120. A station can be drawn from the bill the works would build
   it from and still be bought by the plan in front of you, so the room now asks `worksPack` and each card says which
   ("and this plan builds it", or "though this plan buys one used").
   The measuring bench was the last one waiting on the library rather than on a bill, and now it is not: the library
   draws a calliper (`src/nexus/parts/components.ts`, the DIN 862 pattern as Mitutoyo's 530 series gives it). It
   is the right first instrument of that family — the cheapest thing that reads to 0.05 mm, no battery, no
   electronics, every part of it a shape this library already draws — and the works itself calls measurement
   "the loop closer, the one family everyone leaves out". The body is one instrument whichever way it is read; what
   differs is the slider's reading, so that is the only part that differs in the drawing: a vernier engraved on the
   slider, a dial on a rack under a crystal, or a board, an LCD and a cell.
   Drawing it found three faults, each in something that was already written down:
   × **A prism drawn solid is not the part.** The slider came out at 58 g, half as much again as a real one: a
     slider is a hub that wraps the beam and a 2 mm face that carries the scale, with a window cut in it, not a
     10 mm block. The whole instrument went from 292 g to 181 against the 171 its standard gives.
   × **The section has to grow with the range.** A 300 drawn on a 150's 16 × 3.5 beam came out 41 % under its
     makers' weight; a 300's beam is about 24 × 5, and with that it lands at 491 g against 475.
   × **What is inside a thing depends on which thing it is.** The catalogue listed a gear train, a dial and a
     crystal in *every* calliper, so a drawing of a vernier one was "incomplete" for want of parts a vernier
     calliper does not have. `of` now answers by the reading, and so does its weight (a dial's works are about 25 g,
     a digital's about 10).
   Its micrometer, its indicator and its granite plate are in the catalogue and not drawn yet, so the bench carries
   the calliper and its card still says the rest are not drawn — which is the whole point of the kit rule.
   **A blind judge on the works as it now stands (2026-10-11): 3/10, up from 1/10.** "The room reads as a floor plan
   rendered in 3D, not as a workshop. Nothing in it has been used, plugged in, or put down by a person." Of a dozen
   objects it could name two from their shape alone (a bucket, a table) and a third nearly (the forge: "a drum lying
   on its side on a table — if you told me it was a small forge I would accept it"). Two of its findings were
   mine and are fixed at the cause:
   • **"No contact shadows. Everything hovers."** Right, and worse than it knew: a round ago I switched the
     renderer's shadow map on and **never told a light to cast into it**, so every `castShadow` in every room of this
     app did nothing at all. A shadow takes three things in three places — the map on the renderer, `castShadow`
     on a light, `castShadow` on a mesh — and the middle one was missing. The key light casts now, and because a
     directional light's shadow box is 10 m at the origin while the works stands 34 m away, the box follows what is
     being looked at, once a frame. The lighting moved out of `view/forge.ts` into `view/light.ts` as it went, which
     is the split that file's own debt line asks for (4,046 lines now, and its ceiling came down with it).
   • **"No services anywhere, in a room whose own label says power, extraction, gas."** Also right, and the room
     had been printing that label on the wall since the day it was laid out. A service is not a word, it is a run
     along the wall with something on the end of it, so the room now draws what `floor.services` says it needs —
     150 mm spiral duct into its fan, 50 × 50 trunking off a board, a 22 mm gas line, a 15 mm water line — and
     every station against that wall takes the drop its own `needs` asks for: an isolator and a cable where it takes
     power, a cock where it takes gas, a hood ducted back to the main where it fumes. Nothing is drawn for a service
     this works does not need.
   Its other findings stand and are not done: the composed machines (the lathe, the wheel, the CNC) read as "the same
   lattice of thin round posts and small cubes" and it would delete them all; the bench is bare where its own name
   says "a bench, a vice and hand tools"; the forge has no burner, hose, bottle or anvil drawn (they are bought lines
   and carry no size); there is no stock, no swarf, no bins, no stools, no PPE and nothing half-finished anywhere; the
   cards are "the loudest thing in the room" and occlude what they describe; the floor markings have no wear, no oil
   and no striping; the ceiling fittings are bare bars with no housing and cast no pool.
   Then the designer (2026-10-11), which is the user's next word: *"obviously you can use components like all the good
   components and create a designer agent or something so everything can be 100% accurate while you invent one thing at
   a time make everything editable go around the whole thing once you've circled iterate make the whole thing cheaper
   better make yourself faster think outside the box"*.
   `works/designer.ts` is the arithmetic over a bill that nobody was doing. `builds.ts` owns what a thing is made of
   and where each piece sits; this owns the numbers over that, and it exists because the bills were *typed*: four lines
   once carried a tenth of their own steel, a copper arm was rounded past its own envelope, and each was caught by a
   script written for that one round and then thrown away. Now `materialIn` computes a line's volume from the same
   section, cylinder and bore the drawing is made of, so the drawing and the bill cannot disagree about how much metal
   is in a part; `lineKg` weighs it; `editBuild` changes a size and re-derives every volume that came from it, which is
   what "make everything editable" has to mean (a bill you can edit is a bill whose numbers are derived); and
   `npm run works -- design` prints every build's faults at once, which is the "make yourself faster" half: one command
   where the last four rounds each wrote a throwaway probe.
   Run over twelve builds it found 149 faults. Four of them were the designer's own and are the reason to write the
   checker before trusting it: a density is kg/m³ and a bill is in cm³, so the first run said a welded bench weighs
   54 tonnes; a part's box is its *material* only for stock cut to length (a section, a round bar), never for a 2 mm
   sheet folded into a 520 × 520 × 90 splash pan or a thrown mug or a shelled casting, so a solid-to-its-box check faulted
   six honest lines; a bare "pulley" looked up in the library takes its family's first example, and the bill's V pulley
   is not a GT2 one; and reading the word "shaft" out of "pulley, 240 mm V on the head shaft" held a webbed pulley to a
   solid billet's volume — only the head noun says what a line *is*, and what follows says where it goes.
   What the other 51 were, each fixed at its cause:
   • **One material name cannot be 128 and 2,200 kg/m³.** Every refractory line said `refractory`, and a ceramic fibre
     blanket, a dense castable and a K23 firebrick are three different materials with three densities. They are now
     `fibre-blanket`, `castable` and `firebrick-insulating`, and the eight materials the bills name that the library
     could not weigh at all (`steel-high`, `pla`, `clay`, `graphite`, `phenolic`, `gypsum` and those two) have their
     figures in `parts/mass.ts`. A bagged or fired mineral is its own case in `classOf`: no process here works one, so
     the plan buys it by material and hands place it — and a firebrick read as *glass* before this, which would have
     offered it to a glass process.
   • **A lay named its line by the first match, so the bearings were drawn as plates.** A place that says "bearing"
     matched the line "bearing plate, 6 mm steel sheet" because it came first in the bill. `lineFor` now takes the line
     the words name as a whole head noun, and the shortest line they begin otherwise.
   • **Three router faults, all the same shape: a word deeper in a line is not what the line is.** "bearing plate" was
     refused as a ground raceway, "speed board for the motor" as a wound coil, and a 10 mm plaster facing was declared
     unmakeable when plaster is a bag you buy and pour.
   • **A 20 L steel pail is 0.5 mm steel.** Its bill charged 420 cm³ where its own bore leaves 200, which is the 1.6 kg a
     pail weighs.
   • **±Infinity in a gap's sentence**, which a round had fixed in the number and not in the words: a part that locates
     nothing has no tolerance, so there is nothing to say about one.
   The potter's wheel is the eighth build (`wheel-potters`), written from its station's own `selfBuild` sentence: a
   welded 40 × 40 × 2 frame, a 25 mm shaft in two 6205s, a 300 mm plywood head faced with 10 mm of plaster, a splash
   pan, a salvaged washing-machine motor and its speed board, 60 mm on the motor to 240 on the head — 4:1, so a
   1,425 rpm motor gives 356 rpm at the head wide open and the board takes it down from there, where centring wants
   100–200. Thrown at the works it had one gap: a 240 mm aluminium pulley is past every station here. The answer is the
   one a wheel builder reaches for and it is cheaper — cut the pulley from the same sheet as the head and run the belt
   in a groove routed in its rim — which is what "anything that cuts price will be done" means in a single line.
   And two machines stopped claiming to be composed: a mini lathe is a bought machine with a known form (a cast bed, a
   headstock, a tailstock) and the inventor makes gantries and turning tables out of extrusion and NEMA 17s, so it
   cannot make that form and should not claim to; the wheel has its own bill now. A benchtop CNC stays composed because
   a benchtop CNC genuinely is three slides and a spindle. The room stands 1 from a maker's model, 1 composed, 8 built
   from their own bills, 3 kitted and 3 stand-ins.
   The room also says where its stations are (`worksWhere`): working a camera out of the layout's own numbers by hand
   shot the wrong end of the shop three rounds running, and asking the drawing where a thing is costs one line and
   never goes stale.
   What the designer still reports, and it is the standing ask: **98 lines have no price**. They are listed by name now
   rather than discovered one at a time, and a test holds the number so a new build cannot quietly add to it. Most are
   stock priced by the metre, the kilo or the sheet, and the sellers' own size tables are rendered in JavaScript this
   network cannot run — so that round needs either a page that serves its prices as text or the user widening the
   network, and it is said here rather than guessed at.
   The wheel judged blind by a designer agent (2026-10-11), which is the other half of what the user asked for: **3/10,
   "a potter's wheel, 55% confident — the read is driven by context (a round head, a pan, a stand) and nothing on the
   object confirms it"**. Its first finding was the right one and it was mine: *there is no drive of any kind, so nothing
   in the model could ever turn the head*. The drive was drawn — and that is worse, because it means it did not read
   as one. Three causes, each fixed in the lay:
   • **The belt set the motor's place and I had guessed it.** A 1,000 mm A-section belt over a 240 and a 60 runs at
     260 mm centres (L = 2C + π(D+d)/2 + (D−d)²/4C); at the 150 mm the first lay guessed, the belt's own loop passed
     clean through the motor's body, which the judge read as "a bucket whose hoop handle passes through its wall".
   • **The lower bearing plate hung in mid-air**, because nothing in the frame reached it: "a stray flat panel
     connected to nothing". Two more rails carry it, and the bill buys ten rather than eight.
   • **The head sat on the pan's rim**, so the pan was a drum with a lid: "no recessed trough, no raised rim, the
     head is not sunk into it". The pan is 110 deep and bored 460 across, and the head stands clear above it.
   And the belt is drawn as a belt (`loopParts`, `bent: 'loop'` with the two pulleys' pitch radii): two straight runs
   on the common external tangents and the arc each pulley wraps, which is the belt's own arithmetic — sinα = (R−r)/C
   tilts the tangent, each run is √(C²−(R−r)²), the big pulley wraps π+2α and the small one π−2α. Each of the four
   pieces carries its own share of the bill's material, so four pieces weigh one belt. A loop round two places is a
   general thing (the hovercraft's lift-fan drive is the next one to take it), and the ring it replaces is the shape
   that put the loop through the motor.
   What that judge still has, and it is honest: there are no weld beads, no feet, no levelling pads and no fasteners on any built station (the bolts are in
   every bill and carry no size, so nothing draws them); and the head has no hub, bat pins or bolts where it meets its
   shaft.
   The fast plan (2026-10-11), which is the user's next word: *"everything you build needs to be able to be exploded to
   see components and then the components should be able to be exploded also, every new part needs to be stored ... you
   can do something like placing blocks or pins to describe your plan and see how it works, make a tool called
   visualize or fast plan, this is where you just place stuff with labels ... for planning out a new invention"*.
   `ask/sketch.ts` is that tool. Everything else here needs a finished answer before it will draw anything — the
   inventor wants an affordance and a size, a build wants a volume for every line — and that is the wrong shape for the
   first ten minutes of an invention, where what you know is *this goes above that, and this drives that*. A sketch is
   four kinds of line: a block (`head disc 300x25 at 0,0.72,0 "the wheel head" wood`), a `use` block, which is the
   component library's own part drawn whole (`brg use bearing 6205 at 0,0.585,0`), a pin (`belt big -> small "4:1"`),
   and a title. It stands in the room ("fast plan: —") and comes apart like anything else, a `use` block into the
   real part's own pieces; `npm run plan -- <file> works` throws it at the $3,000 works the minute it is written.
   Three faults in its own first run, and the first two are the tool being precious where speed is the whole point:
   a pin written with a name of its own (`belt big -> small`) was unreadable, and so was `pan tub 520x110`, because
   `tub` was not one of the five form words. A plan is written fast, so twenty-odd words map to the five forms now and
   an unknown one is named rather than swallowed. The third was arithmetic: a 500 × 600 × 500 block of "frame" weighs
   1.2 tonnes as solid steel, so a block may say what fraction of itself is really there (`steel-low@0.013`) — and
   that fraction is also what tells the bill it is an *assembly*, not a part, which is what stopped the works forging a
   500 mm frame on the anvil.
   And the oldest standing rule is machinery now rather than memory: the designer's `unstored` check names any bill
   line that is *bought finished* and is in neither the component library nor the inventory, because a part the
   inventory has never heard of is one the breakdown queue can never take. Its first run named eleven; six of those
   turned out to be stored already under the library's own words (a "pack-lipo-4s battery" is `pack-lipo-4s`, a
   "burner tee" is a `black-iron tee`), which is the two-vocabularies fault again and is fixed in the lookup — both
   ways round, and by the line's own words carrying a stored part's name inside them. The five that were really
   missing are stored with what each contains: the black-iron tee and reducing coupling a burner is made of, the MIG
   contact tip that is the cheapest gas jet of a known bore there is, a 25 A solid-state relay down to its triac and
   opto dies, a clevis and split pin, a momentary foot switch, and the phase-angle speed board that turns a salvaged
   washing-machine motor into a potter's wheel. The queue takes them (67,057 items, nothing missing from the table),
   and a test holds the count at zero so a new build cannot add one.
   And a station opens (`openStation`, `WorksRoom.partOf`): "open the forge" lifts it out of the works and stands it
   in front of you whole — "drawn in 17 pieces, 20,143 g; point at a piece to open it" — and each piece opens into
   its own, down to what it is made of, which is the viewer's own explode doing what it has always done. Until this
   the room's stations were the one thing in the app you could walk up to and not open. A stand-in says so rather
   than opening into nothing.
   And the round the user asked for next was speed: *"keep going increase efficency"*. Measured first: the whole gate is
   171 files, 731 s of test time over 233 s of wall clock on four cores, and its longest single file was `conceive.test.ts`
   at 93 s. Of that file's 87 s, 69 were inside `simulate` and all but 1 s of those inside `jolt.Step` — 335 µs for every
   1/960 s of a six-body design, where the same scene built straight onto Jolt costs 12. Cutting the collision sub-steps
   from four to one moved it by 7 % (35.5 s to 33.1), which is what named the cause: not collision work, which sub-steps
   divide, but the island's solver, which they do not. Every joint set `mNumVelocityStepsOverride = 120` and
   `mNumPositionStepsOverride = 40`, and Jolt takes the *maximum* over an island, so one hinge made every body and every
   contact touching it solve ten times the iterations — a rule written for one real fault (a light part held to a heavy
   one by its hinge alone giving under the load) and charged to every design in the app.
   So the thing to measure was what those steps buy. A loaded deck carried by four light wheels, each held by its hinge
   alone, settles into them by 0.001 mm at a mass ratio of 20:1, 0.028 mm at 100:1 and 0.183 mm at 800:1 with twelve
   velocity steps — every one of them inside the half millimetre a *contact* is already allowed — while 120/40 bought a
   tenth of that for four to eight times the run. A joint's steps now follow the mass ratio it holds across (12 and 4 for
   each 100:1, capped at the old 120/40), and a joint onto a fixed part of the build counts as 1:1, because an immovable
   anchor is the well-conditioned case, not the hard one. The deck is a test now (`joints.test.ts`), written against the
   requirement (the hinge holds its line to a tenth of a millimetre) rather than against the step count, so the number is
   free to change and the fault it was there for cannot come back. `conceive.test.ts` is 31 s from 86, `wave6` 9 s from
   27, and the gate is green on all 171 files and 2,021 tests.
   Two other suspects were measured and are innocent, so neither is worth touching: the engine's own build (the
   single-file `wasm-compat` against the separate-wasm `wasm`: 383 ms against 377 on the same scene) and continuous
   collision (`EMotionQuality_LinearCast`, free to within the noise). The gate's wall clock only fell from 233 s to 228,
   because with four cores it is no longer limited by its total work (now near 160 s of core time) but by its tail: the
   two sweeps, every kit at three seeds (77 s) and every kit through the make pipeline (56 s), are each one `it` that
   cannot be split across workers. Sharding those two by kit is the next cut, and worth it only once something else is
   not cheaper.
   Then the same loop again, since the first cut moved the whole suite's work from 731 s to 599 and left the two kit
   sweeps a fifth of it. Three kits were 98 % of the kit sweep (a car park 51 s, a street 13.5, a car 9.9) where a
   570-part semi truck cost 22 ms, so the cost was not the count of parts but the panelled body, and a sampled profile
   of one car (`node:inspector`, started inside the test, since vitest's workers swallow `--cpu-prof`) put 53 % of it in
   evaluating NURBS surfaces. Counting the calls said why, and the answer was the same shape as the physics one: work
   charged to the whole for the sake of a part.
   • **The whole body was made again to crown a lid.** `bodyPanels` made the body, measured whether its hood or deck
     stood short of what is under it, and made the whole body again with the lid crowned more — three `makeBody` runs
     for every car, four wheel liners and every panel twice over, to lift a hood three millimetres. Nothing but the lid
     reads a `lift`, so the check belongs to the lid: the lids alone are crowned again now, in the same order with the
     same lift, and the body is made once. One car's every number — 125,874 of them — agrees with the old body to
     1.4 × 10⁻⁸ m, which is the only honest proof that a refactor of a creator changed nothing.
   • **`uAt` halved a span thirty-two times** to invert x into u, each halving a point on the skin, and a body's panels
     ask it tens of thousands of times: a quarter of a car. It reads the station the x falls in off a table of 64 kept
     with the skin, then closes by false position in three or four points. That is a surface's own inverse, not a
     panel's business, so it went to `parts/surface.ts` beside `pointAt` — which is also how `panels.ts` paid back the
     lines this round added, since the tidy ratchet refuses a file that grows past its allowance and raising the number
     is not allowed.
   • **`lidY` scanned 7,500 points** of both lids on every call, from inside a four-step loop per liner point; the
     points are binned 20 mm along the car now, and it reads the three bins that can hold the answer.
   The kit sweep went 74.6 s to 43.6 (the car 9.9 to 4.7, the car park 51 to 30.6, the street 13.5 to 8.2), and a car in
   the room is made twice as fast as it was, which is what the Quest will feel. Over both cuts the suite's own test time
   is 731 s, then 599, then 570. The gate's wall clock is not the number to watch on this host: 227 s, 256 and 272 came
   out of trees that differed only by work removed, four cores with other work on the machine, and single files move by
   a tenth between runs. Test time is what to measure, and the tail is what is left: `make-every` (51 s) and
   `kits-every` (47 s) are each one `it`, so neither can be spread over workers; sharding them by kit is the next cut,
   and the car park alone would still hold a shard for 30 s.
   And a third time round, on the other sweep: every kit through the make pipeline. The car park spent 19.6 s in
   `perfect()` and asked the separating-axis test **fourteen million times**, a quarter of the whole pipeline sitting in
   the garbage collector. Three causes, all in `parts/space.ts`:
   • `sat` built a `Vector3` for each of its fifteen axes, every call: fourteen million calls times twenty vectors is
     where the collector's quarter came from. The fifteen axes are numbers now, in the same order with the same
     arithmetic, so the axis it picks and the depth it reports are what they were.
   • A pair's tolerance (the larger of 2 mm and 1 % of the smaller's least side) read both boxes' least sides for every
     candidate pair; each part's own is worked out once now, and a pair's is the smaller of the two, which is the same
     number.
   • And the real one: **a pair of covering pieces that the world's own axes hold more than the tolerance apart was
     still asked the fifteen axes.** That is the same test the loop had just made of the two parts' bounds, so it is
     now made of the pieces too, each piece's span kept with it. Fourteen million calls became a fraction of that, and
     29 of the 30 kits come out identical to the last digit. The thirtieth is the go-kart, and the difference is the
     honest kind: two of its 198 joints are now sized from the pieces that really meet (an M6 and an M10 where both
     were M8), because the old loop could choose, as the deepest of a part pair's pieces, a pair the world's axes held
     further apart than the tolerance — the fifteen axes decide *whether* two boxes are apart exactly, but the depth
     they report is a lower bound, so a piece 5 mm away could still read as touching within 2 mm.
   Measured: the car park through the pipeline 19.6 s to 15.0, a car 2.0 to 1.27, a street 5.8 to 4.4. The gate is green
   on all 171 files and 2,021 tests, and nothing in the suite was holding on to one of those pairs.
   And the bench got the vice it has been named for since the works was first written ("a bench, a vice and hand tools"),
   which for three rounds it did not have. A 100 mm fixed-base engineer's vice, bought rather than cast, because $33 buys
   one and a works that can cast iron is not what $3,000 builds. Four figures are its maker's (jaw 100 mm, opening
   100 mm, height 140 mm, 5.4 kg — Sealey's CV100E, which its own page marks light-duty) and no maker publishes a
   drawing of one, so every wall and section here is an estimate — chosen so that the solids drawn weigh what the vice
   weighs: 5,434 g against 5,400, which is the check that a casting has been drawn as the shell it is (7 mm faces,
   10 mm webs, an 8 mm base flange, a 45 × 43 housing round the 32 × 24 way) and not as a solid lump of the right
   outline. It works the way an engineer's vice does: the screw captive in the sliding jaw between its collar and that
   jaw's web, through a nut fixed in the body, the tongue under the jaw running in the way through the fixed jaw and
   down the housing — which is what keeps the jaws parallel under load — and the handle at the front.
   Three things it taught the works:
   • **A bought line can now be drawn.** `builtParts` skipped any bill line with no section of its own, so a bought part
     was in the bill and nowhere in the room. A line can name the library's own words for what it is (`PartLine.as`:
     `benchvice jaw100 open30`), and the library draws it whole at each place the lay gives, citing the same bill.
   • **A new part's material must be one the library stores.** The jaw plates were written as `steel-high`, which the
     mass table knows and the breakdown table does not, so the queue could not take them to elements: they are tool
     steel now (the nearest stored; a maker would case-harden a carbon steel, and the item says so).
   • **A cylinder is drawn standing up.** The handle, written without a turn, stood out of the vice like a flagpole
     until the screenshot showed it. It lies across the screw now.
   The M10 bolts are priced too (Zoro, $0.61 each in a fifty-pack), which takes the unpriced lines from 98 to 95 and the
   ratchet with them. Still honest about what is left: its serrations, its casting's ribs and its thread are not drawn
   (the screw is a plain bar), and it has not been through a blind judge yet.
   And a fourth time round, on the game the headset actually runs rather than on a sweep: table tennis cost 22 s of the
   suite and its two robot tests were 20 of them. None of it is the engine's physics — it is `advance`, a thousand times
   a second of play and hundreds of thousands of times for every shot the robot aims. Three causes, each measured
   against a dump of every number the game makes (9,022 lines: every step of three flights, every point of four more,
   seventy aimed shots, a whole 11–0 game and two hundred returns), which came back identical to the last bit after each
   one:
   • **The vectors were the cost, not the arithmetic.** `accel` made eight arrays a call and `advance` called it twice,
     so one flight of 750 steps made twenty thousand of them and a quarter of a rally's run was the collector. It is
     written in plain numbers into one triple now, in the order of operations the vector form had, and `advance` and
     `bounce` work in the ball's own arrays instead of replacing them. The midpoint step was also working out where the
     midpoint *would be* and throwing it away: only its speed is ever asked for.
   • **A hundred aimed shots were flown only to be overwritten.** `serveShot` swept every speed from 3 to 9 m/s and kept
     the last that served, which is to say the fastest; it comes down from the fastest now and stops at the first that
     does. The same answer, a tenth of the work.
   • **A flight is usually wanted for one of its points.** A shot aimed by halving flies seventy flights and reads how
     far each got; a bat asked where to be reads one point out of a second and a half. `flight` takes `keep: false` and
     hands back where it ended, and its `stop` is told what each step met, so `meetPoint` follows a flight as it goes
     instead of keeping 750 points to throw 749 away.
   22 s to 4.5, and those same three cuts are what a rally in the headset pays for every frame.
   And a fifth time round, on the next file the profile named: growing a frame. `grown.test.ts` was 33 s, and a sampled
   profile put 60 % of it in `substrate/adapt.ts` — not in the physics at all, which is where the last two rounds would
   have had me look. Counting said why: growing the 5 m tower asks for **32,662 truss solves**, each of a system of 39
   freedoms (its thirteen loose joints) over a ground of up to 804 struts, and each one was making a vector for every
   strut's direction, two arrays for every joint's own 3 × 3 inverse, and a fresh list of its held freedoms. The
   directions, stiffnesses and joint blocks are worked out in plain numbers in one pass now, and the pulls read back
   the same way: 20,000 solves of a frame-sized system (27 freedoms, 113 struts) went from 689 ms to 277 (2.5 ×), and
   every number of four grown frames — the wall bracket, the 10 m tower, the bird-watching tower and the microscope arm
   — came back identical to the last bit (the dump that the car refactor's own rule asks for).
   One thing measured and *not* taken, which is worth as much: the system is small while its ground is not, so
   factorising it outright each solve — the rule the scalar carrier in the same file already follows — should have beaten
   the fourteen passes of conjugate gradients a cold solve takes. On the frame-sized case it came out 912 ms against
   761, for the same forces to nine figures, because assembling that matrix is 36 writes a strut while the gradients,
   warm-started from the last round's answer, take two or three passes and not fourteen. That is written at the line in
   the file where the code would have gone, so the next round does not try it again. (The Cholesky does say now whether
   it factorised at all, so the scalar carrier no longer reports a singular network as converged.)
   On the wall clock those four frames went 29.0 s to 22.9, but a rerun of the same tree gave 27.4: ±20 % on this host
   with three agents working on it. The 20,000-solve bench is the number to trust, which is why it is the one written
   down.
   Three cuts in parallel, which is the other half of the efficiency round (2026-10-11): one agent priced what the
   designer had been listing as unpriced for three rounds, one drew the safety station, and a read-only judge took the
   vice apart, each in its own worktree with a disjoint set of files — which is the only way several of these run at
   once without fighting over the same file.
   **The prices: 95 unpriced bill lines down to 19.** Every price `priceOfLine` can find is keyed on the word the bill
   itself uses (`section`, `angle`, `round`, `plate`, `sheet`, `birch`, `firebrick`, `m6`, `v-belt`…), so the stock the
   builds are made of — box section, angle, round bar, plate, sheet, ply, firebrick — and the fasteners now carry a
   seller's page, the figure it showed and the day it was seen. Two conventions are written at the head of that section
   because they decide the number: one length to a piece (n pieces is n cut lengths, and where the bill's piece is
   longer than the length sold the note says so), and the US stock size named, with the substitution and its error,
   where a metric bill meets inch stock. What is coarse is written down too: one key must serve lines of several sizes,
   so each line charged another's figure says so. It found two prices that were *wrong* rather than missing, which is
   the better catch: the potter's wheel's A-section V-belt was priced as GT2 printer belt ($0.49 for what is $4.41),
   and "base plate, 3 mm steel sheet" was being priced as fifty M10 bolts because it matched the words "zinc-plated
   steel". The 19 that stay unpriced are named: ten are made here and have nothing to buy, and nine have no honest
   figure — among them a salvaged microwave transformer, a quote-only LPG needle valve, and a 6 m printed concrete wall
   whose nearest listing is a bag of mix.
   **The safety station is the kit it is** rather than a box with a card (`parts/kit-safety.ts`): the extinguisher drawn
   to 3,131 g against RS's 3,200 with its bracket, the ear defenders 204 against 3M's 210, the shield's window 148.6
   against 3M's 149, the whole kit 6,127 g against the 6,200 its eight entries sum to. Its honest finding is one its
   maker's own sheet cannot settle: a 1.7 mm wall is what makes the PSP2000 weigh what RS says it weighs, and at its
   published 55 bar burst that wall is at 178 MPa, which pure aluminium does not reach — so the file says so instead of
   quietly fudging one of the two figures. The works room now stands 2 drawn from their makers' own figures, 1 composed,
   8 built from their own bills, 3 kitted and 2 stand-ins (the welder and the MSLA printer).
   And the gate, measured at each step: 190 s → **141 s** over 175 files and 2,028 tests. Four workers rather than the
   three vitest keeps by default on a four-core host is most of it (the three-way comparison that chose four ran while
   two agents were working, which is why its own numbers — 191 at the default, 180 at four, 185 at six — are all
   higher than a quiet host's).
   Then the check that would have caught it, which is the other half of what a blind judge is for: a judge costs a
   round and a check is paid once. `works/designer.ts` gained `floating` — every piece a build's lay places must touch
   another piece or stand on the floor, within the four millimetres a weld's gap and a bolt's clearance allow. A bill
   says how many there are and a lay says where each one goes; neither says what holds it, so this is the only check
   that a drawing stood up from a bill is a thing rather than a scatter. It found three faults at once, and the first
   was the cause of the judge's own first finding:
   • **A part stood up had its axes cycled.** `layRot` built its frame from the cross product of up and the length, so
     a part laid along y came out with its own width along z. A square section cannot show that — every leg and rail of
     every build is 40 × 40 — and the first sheet laid flat did: the bench's top is 1500 along the bench and 700
     across, it was being drawn 700 along and 1500 across, and the vice bolted to its own bench at x = −700 was 350 mm
     off the end of a top that only reached ±350. The judge saw it at a glance and every number in the bill was right.
   • **The bench's legs stood 20 mm outside its own top.** At ±350 of centre with a 40 mm section their outside faces
     are at ±370, against a top 700 deep; the short rails, which the bill cuts at 620, then fell 20 mm short of
     reaching them. The legs are at ±330 now, flush with the top's edge, and the 620 the bill always said is exactly
     the gap between them.
   • **The potter's wheel's motor hung outside its frame with nothing under it.** The belt sets the motor's place 260 mm
     out from the shaft so its loop clears the motor's body, and that is outside the frame: the bill buys an eleventh
     rail now, between the legs on the motor's side, and the motor is bolted down to it.
   The vice is also placed as a fitter would have it — at the left front corner over a leg, turned a quarter so its
   jaws face the front and stand a little past the edge (`Lay.turn`, because which way a bought thing faces is not a
   direction its length runs); a vice mid-span rings the bench and walks it across the floor. A test holds all of it:
   nothing any build lays may stand in mid-air.
   And the vice itself, from that judge's list (2026-10-11). It gave fourteen findings and scored it 3/10; six were
   real and are fixed at the cause, and the worst of them was one no judge could see, because it is inside the
   casting: **the screw and the slide shared one place.** The tongue ran in the way at y 37-59 and the screw ran down
   the middle of that same way, so two parts of the same vice passed through each other. On an engineer's vice the
   slide is under the screw, and putting it there also lifts the screw to where a real one is — a quarter to a third
   of the way up a 140 mm casting, not a fifth. The judge had this as "the screw and handle are set far too low: bolt
   that to a bench and you cannot turn the handle", and it was right about the consequence: at y 29.5 the handle's own
   ends came within 20 mm of whatever the vice is bolted to, and at 60 they clear it by 51. With it: a clearance bore
   for the screw through the fixed jaw's face and the housing (it had been passing through solid iron), a base flange
   120 mm wide with its three bolt holes in lugs that stand outside the body (a flange no wider than the casting is
   not a flange, and it is the first thing a fitter looks for), an anvil pad behind the fixed jaw, and the jaw plates'
   screws countersunk flush in the gripping face instead of standing proud on the outside of the sliding jaw. The
   drawn mass is held at its maker's 5.4 kg throughout, which is what the walls are for: the web came down from 10 mm
   to 9 and the face from 7 to 6.5 to pay for the flange and the anvil.
   Of the rest of that judge's list: the serrations and the casting's ribs are still not drawn and the thread is still
   a plain bar (said in the kind's own `leaves`); how wide the casting is across its jaws is an estimate, because no
   maker publishes it, and the judge's 140 mm is a different vice's figure; and its 5.4 kg is Sealey's own for the
   CV100E, which that page marks light-duty — a fitter's 100 mm vice is 11 to 13 kg, and this is the vice the works
   actually buys for $33.
   Judged blind again (2026-10-11, round 2): **2/10, down from 3**, and taking it apart is the useful part, because
   the score fell for two different reasons and only one of them was the vice.
   • **Three findings were mine and are fixed.** The anvil pad was drawn with a machined finish, so it read as bright
     steel: the judge took it for the jaw plate lying flat on top of the jaw, measured the vice by it, and four of its
     numbers follow from that one wrong finish (it is cast with the body now). The slide's tongue was 150 mm where the
     housing's back is at 111, so it never showed: it is 185 now and stands 60 mm out of the back, which is what the
     comment beside it had been claiming for two rounds. And the four countersunk heads stood 1.6 mm *proud* of the
     gripping face — a lathed profile grows from its base, not its middle, so the turn's sign had sunk them the wrong
     way. That one is now a test, because a head above a jaw face marks every piece of work put in it.
   • **Two were my camera, not the drawing.** It measured the handle 30 mm off the screw's axis and the jaw plate at
     41 % of the jaw width. The boxes say the handle and the screw are both at y 70, dead coaxial, and both plates are
     the full 100 mm. I had rendered the vice from its *back* and called the view the front, so the near end of the
     screw projected lower than the far handle and the plates were hidden behind the casting. This is the same fault
     the quadcopter round found (a quad-X's arms foreshorten into one slab in `view=three`): **the view is part of the
     evidence, and a bad one invents faults as readily as it hides them.** A side elevation (`view=side&ortho=1`) is
     the fitter's view of a vice, and it is what the next judge gets.
   • **The rest it named are true and known**: no thread form, no cast fillets, draft or parting line, no boss round
     the bore, one flat colour a material, steel clipping to white, and 16-sided circles (now 32). The first five are
     the renderer-wide round that is still queued and that every judge since the Seeed boards has asked for; they cost
     every part in the library two or three points before any geometry is touched.
   The screw also came up from y 60 to 70 (3.45 screw diameters below the jaw line, against a real 2.5-3) and the
   housing with it, the base is 8 mm, and the drawn mass is still its maker's 5.4 kg — the face 6.5 to 5 and the web 9
   to 8.5 paid for it.
      The supply index (2026-10-11), which is the answer to a parts API rather than a wait for one. The user offered a Nexar
   (Octopart) token twice; `api.nexar.com` is not in this environment's allowed domains, so neither token reached it, and
   a 24-hour token would have expired before the domain could be opened anyway. That is the second reason not to depend
   on one. The first is that an API answers for the electronic half of a bill and nothing else - no steel angle, no
   firebrick, no ply, no refractory, which are most of what the builds here are made of - and it answers for today while
   keeping no record of what it said last month, where a cost you can defend is a figure with a page and a date on it.
   So `parts/supply.ts` is the half a vendor cannot supply: `prices.ts` holds what a thing costs, and this grades how
   good each of those figures is. A price read off a seller's own product page and a price read off a search result are
   both numbers in the same field and only one of them is a price; a url that is a front door or a search query is no
   page to re-read at all. Those distinctions were already in the table as prose (`SEARCHED`, a bare domain,
   `cond: 'used'`) and are read here as data, so `npm run works -- supply` says what to open next, worst first, and
   `tests/nexus/supply.test.ts` ratchets each count the way `tidy.test.ts` ratchets the tree's debt.
   It found three things on its first run. The 158 sightings over 128 keys are 106 firm, and of the rest 42 were read off
   a search listing - but that count is coarser than the table deserves, because the `hd` and `zoro` helpers stamp that
   note on every offer they build whether or not the url is a real product page, so splitting the note from the url is
   its own small round. Three had no page of their own at all, which is the fault worth driving to zero because there is
   nothing to re-read; two of the three were the bench vice. And re-reading the worst of them found a price that was
   *wrong* rather than merely weak, which is the better catch: the Home Depot vice is a WEN BV454 at $46.23 on its own
   product page (2,440 lb clamping force, swivel base), against the $57.38 this table carried off a search listing -
   $11.15 out. The welder's search-query url is now item 57861's own page, with the figure still read off Harbor
   Freight's own category listing because the product page renders its price in JavaScript and comes back empty to
   anything but a browser - which is the same wall this file already records for the sellers' size tables. One sighting
   with no page of its own is left (the $32.89 Walmart vice, the cheapest 100 mm one seen), and it is visible debt now
   rather than invisible.
   Connectors read off the geometry (2026-10-11), which is the one change to mating that multiplies rather than adds.
   The state it starts from, measured: `parts/mate.ts` is 117 lines and knows exactly one mate - face to face on a
   bolted pattern, matched by mirroring and turning to within a fifth of a millimetre, with the fasteners then laid
   from the library and sized by the plies they clamp. It knows two standards (NEMA ICS 16 faces, ISO 9409-1 flanges)
   and **28 parts in the whole library declare a port**, 18 of them boards' mounting holes, against 9,074 catalogue
   sizes. Beside it sits a second, unconnected system: `Iface` (36 declarations - shaft and bore, studs and nuts,
   chain and sprocket, drive and torque, mount) which the critic *checks* and which never places anything. One system
   places but only bolted faces; the other checks but never places. On a CAD scale that is about 1.5 of the twenty-odd
   mate types an assembly solver has, and no degrees-of-freedom count at all.
   Hand-declaring ports will never close that, so they are derived instead: `portsFrom` walks a part's tree, puts every
   `Cut` in the part's own frame, and reads the patterns back out. What it buys is not 28 ports plus a few - a
   *generator* that drills holes gives every size it makes its own ports, so the MGN rail covers MGN7 to MGN15 at
   every length at once, which is why the test checks three sizes rather than one example.
   Its first run found three faults in itself, which is what a first run is for. A counterbore came out as two
   patterns of different sizes on one face, because cuts were grouped by radius: coaxial cuts are one hole now, the
   narrowest being what a screw passes and the widest its seat, and the MGN12 went from five ports to two. A NEMA 17's
   four tapped M3 holes were called "M2.5", because every cut was read as a clearance hole. And the fix for that was
   wrong twice: adding the thread's root form flipped the rail's own Ø3.5 clearance holes to "M4 tapped" instead.
   The cause is worth writing down because it is the library's, not the reader's: **this library draws tapped holes at
   three different diameters** depending on the generator - the clearance size, the thread's major diameter, and its
   root diameter (`rootR` in `kinds/plant.ts`) - and those interleave, so an M3 at its root is 2.459 mm where an M2.5
   at its nominal is 2.5. Four hundredths apart: no reading of a radius tells them apart. So the rule is physical
   rather than clever (a through hole passes the largest screw it clears; a hole at a thread's own nominal is tapped
   for it), where a generator uses the root form the derived thread is one size small, the port a part *declares* is
   the authority there, and the fix is one convention in the library rather than a third guess.
   And then the convention, which came out the other way round from how it was first framed (2026-10-11, same round).
   Forcing one drawn diameter for every tapped hole is checkable - a thread's major diameter collides with no
   clearance size by less than 0.1 mm, against the 0.08 this reader allows - but it is the wrong trade, because the
   drawn radius is also what a part *weighs*: `kinds/plant.ts` takes the hot end's mass by subtracting π·rootR²·h, so
   moving the hole to its major diameter moves a published mass to suit a reader. A radius is a fact about the solid
   and should not be bent to carry a second meaning. So the thread is *said* instead: `Cut.thread` (`parts/kits.ts`),
   which `portsFrom` believes over the radius, with the physical rule as the fallback where nothing is said. The two
   root-drawn holes in the library (the hot end's nozzle thread and the heat sink's heat break, both M6) now say so,
   and `unnamedHoles` lists every hole nothing can name - the list a round works down, while leaving alone the holes
   that are genuinely not for a screw (a heater cartridge bore, a thermistor well, a shaft bore are not faults).
   That is the general lesson and it is worth keeping: where a drawing cannot carry a fact, add the field rather than
   change the drawing.
   Bores read off the geometry too (2026-10-11, same round), which is the half `Iface` never had. It has said since it
   was written that a hub needs a shaft of its bore, and the critic checks exactly that where two parts touch - but a
   kind, a role and a diameter place nothing, which is why 36 declarations check and never assemble while 28 ports
   assemble and never check. `axesFrom` gives them a where.
   The bores that matter are not drilled: a bearing's 25 mm bore, a pulley's 5 mm bore and a tube's inside are all the
   inner radius of a `lathe` spun about its own y. A reader that knows only `Cut` finds a 6205's set screws and misses
   the seat the whole part exists for, which is what the first run did.
   Two faults of its own, both worth keeping. It read every nested cylinder as a shaft, so a 6205's cage came out as
   eight shafts of 1.78 mm and a stepper's as twelve: **a cylinder is not a shaft merely because it is a cylinder**,
   a mating shaft is one that is *exposed* at one end to enter something, and deciding that needs the part's envelope
   rather than its solid list - so this says nothing about shafts rather than twelve wrong things, and that is the
   next piece. And `seat` first took the biggest bore, which names a 6205's 43.05 mm outer raceway and misses its
   seat; it is the *narrowest* way through on the axis the part's bores share the most length along, which also keeps
   a pulley's radial set screws out of the reckoning.
   What makes it checkable is that the answer is in the catalogue: a 6205 is sold as 25 x 52 x 15 and a GT2 B5 by its
   5 mm bore, so the derived seat is held against the name the part is sold by rather than against anyone's reading of
   the geometry. 6205 -> 25, 6204 -> 20, 625 -> 5, GT2 B5 -> 5, and a NEMA 17's rotor onto its own 5 mm shaft. A shaft
   too big is refused with the number, a shaft too small is told it is loose and not a seat, and which of ISO 286's
   fits a seat is held to stays `fits.ts`'s `tolFor` to decide, because that is a fact about what the feature does and
   not something a drawing says.
   Exposed shafts (2026-10-11, same round), which is the half the round before left out on purpose rather than get
   wrong. What separates a motor's output shaft from a bearing cage's pin is not its shape - both are round things
   standing along their own axis - but whether anything is in front of it. So that is what is asked: a point a third
   of a millimetre past each end face, against the oriented boxes `parts/space.ts` already lays out for the whole
   tree, with the thing's own ancestors not counted because a group's box encloses its children by construction and
   would bury every shaft there is.
   And the same lesson as the bores arrived one layer down: reading only `cyl` found **nothing at all**, in any part,
   because a stepper's output shaft is stepped and therefore turned. A `lathe`'s diameter at an end is the radius its
   profile has there, and how far that radius holds is the length of the spigot; a profile that closes to a point at
   its end is a cone and not a shaft end. Two rounds running, the feature that mattered was in the turned profiles and
   not in the primitive the name suggests.
   Held against the catalogue again, which is the only check worth having: a NEMA 17 turns a 5 mm shaft and that is
   what comes out (⌀5.00 × 55 mm, named "shaft"), an M5 screw's shank is 5 mm and that is what comes out, and a
   6205's outer ring reads ⌀51 against its catalogue 52 - which this file recorded as the drawing being honest about
   its chamfers rather than the reader being wrong, and that was wrong: the reader was reading the chamfer, and it
   reads ⌀52 exactly since the round that fixed it (see "a declaration against its own drawing" below). A bearing's outside being called a shaft is right and not a slip: an outer ring is an external
   cylinder that seats in a housing bore, which is the same relation the other way round. Nothing under 2.5 mm is
   free in a 6205 or a NEMA 17 any more, which is the cage fault held shut by a test.
   The pair that makes the point: the motor's derived 5 mm shaft seats in a GT2 B5's derived 5 mm bore at zero
   clearance, both sides read off the geometry with nothing declared. That is a mate the library could not express
   before this round.
   The merge (2026-10-11, same round), and it is a merge of *answers* rather than of type names. `Port` placed parts
   and never checked them; `Iface` checked parts and never placed them, for want of geometry. Both halves have
   geometry now - a face from its pattern, a bore from its turned profile, a shaft from its free end - so one question
   can be asked across both: `mates(a, b)` gives every way two parts go together and, where they do not, the number
   that says so. Renaming the two types into one was considered and not done: it is a large diff through
   `make/critic.ts`, whose contract checks are load-bearing for the car fleet, and it would buy nothing that is not
   here. The fleet's checks keep their own owner and read the same geometry. `perf dump` is identical across the whole
   round, which is the proof that nothing any generator makes has moved.
   Asking it found the thing neither system could express: **a nut on a bolt**. An M5 nut's bore is drawn at its
   thread's root (4.134 mm) and an M5 screw's shank is 5.00, so a clearance test refuses the most ordinary mate in
   engineering as 0.866 mm of interference. Threads interlock - they are *meant* to interfere - so a bore that carries
   a thread mates by that thread and not by its gap, which is a third kind of mate beside bolted and seated. A turned
   bore at a thread's own root diameter is how a nut is drawn, and that is now what names it.
   And getting there cost one fault worth keeping: the root diameter was first computed from a guessed pitch of
   nominal/8, which puts M5 at 0.625 where ISO 261's coarse pitch is 0.8 - two tenths of a millimetre out, enough to
   miss a nut's own bore entirely. `parts/threads.ts` has held the real pitches all along, and `mate.ts` was already
   importing that table. A number that exists in the tree should never be re-derived from a formula.
   Flat faces, the third connector (2026-10-11, same round): a plate on a plate, a bracket on a beam, a motor on its
   mount, and it is `resting` in `mates` beside bolted, seated and threaded. Only outward faces count, by the same
   question the shafts are asked, because a face with its own part in front of it is an inside surface and mates with
   nothing.
   And the lesson arrived a third time, which is now a pattern worth naming: reading boxes only found **four faces of
   1 mm² on a stepper** (its plug's contacts) and **none at all** on a 2040 extrusion, an MGN rail or a bearing,
   because every one of those is a prism or a turned profile. A rolled section's faces are its own profile's - its two
   ends, and one face for each straight run of its outline, found outward by stepping off the segment and asking
   whether that point is still inside the section. With those, a NEMA 17's biggest face is its own 42.3 mm mounting
   square, and a 2040's faces are 13.8 mm wide, not 20, because a T-slot's outer surface is interrupted by its slots
   and each flat run is a face of its own. **Three rounds running the feature that mattered was in the richer shape
   and not in the primitive whose name suggests it** (bores in `lathe` not `Cut`, shafts in `lathe` not `cyl`, faces
   in `prism` not `box`).
   Turned faces, the fourth (2026-10-11), and the lesson a fourth time: a `lathe` is a profile of [radius, height]
   spun about y, so a run of it at one height sweeps a flat ring - which is what a bearing actually sits against - and
   a run at one radius sweeps a cylinder's wall, which is no face at all. A 6205 claimed *nothing* before this and now
   claims exactly four: both ring faces at both ends, ⌀46.63-51 outside and ⌀26-33.95 inside, which is what a bearing
   is clamped on. A ring is reported as a ring (`Face.round`) and not flattened into a rectangle, because two rings
   meet over the ring they have in common and that is exact where two spans can only say the smaller of each: a 6205
   on a 6205 shares its own 375 mm², and a 6205 on a 625 is refused with both diameters rather than given a number.
   With them, a nut rests on a screw's head as well as threading onto it, and a bearing rests on a motor's end bell -
   mates the library could not express a round ago.
   And the fault it found is the general one, and the first thing the rule written for it caught: **a ring in a well
   is not a seat.** A 6205's nitrile seal is drawn 0.217 mm inside its own ring faces, which is where a real 2RS seal
   sits, and at 802 mm² it came out as the bearing's *largest* seating face - so a bearing laid on a motor's end bell
   rested on its seal. The exposure probe cannot see this, because what holds a recessed face off stands *beside* it
   and not over it, so nothing is in front of it to find. A face is therefore a seat only where nothing of its own
   part stands proud of its plane and reaches further out than it does; material proud *inside* a ring is no bar at
   all, because that is a shoulder, and what seats on a shoulder has a bore for what stands through it. A 625's steel
   shield is 0.051 mm in and goes the same way, which is why the rule is geometric and not about what a seal is made
   of. Still not read, and said by their absence: a pocket's floor in a box or a rolled section is the same fault
   (a rectangle's span does not say which way round it lies), and a screw's head reads as a full disc because its hex
   socket is a `Cut` and not part of the turned profile.
   One fault found and *not* fixed in that round, recorded because it is the kind this file exists for: **a glued
   parameter was silently ignored**. `use('rail MGN12 length 240')` is a 240 mm rail, but
   `use('rail MGN12 length240')` and `use('rail MGN12 L240')` were both the family's 400 mm default - the words asked
   for one size and the part came out another, with nothing said, which breaks the library's own rule that it never
   silently draws a stand-in.
   Fixed (2026-10-11), and the fix is a rule the library already had in its other half. The cause is one character:
   every hand-written family reads a trailing size by `\b(\d{2,4})\s*$`, and there is no word boundary between a
   letter and the digits stuck to it, so `length240` and `L240` matched nothing and fell to the default. The *kinds*
   have never had this fault, because `readKind` matches each word against its axes' tags, takes a tag with its number
   together ("sheath6", "bore50", "D25"), and refuses any word left over by name ("I do not know …"). So the round is
   that same rule for the families written by hand, in the one place that sees the words (`callFamily` in
   `src/nexus/parts/families.ts`): a word of the form `<name><number>` names a parameter the family takes as a
   *number* - by its own key, the first word of what it says, or an initial that is its alone - and where the first
   reading did not come out at that number, the sizes are read again with those names said apart from their numbers.
   If the part still comes out another size it is refused with both numbers and the spelling its own family does read.
   Nothing in the library was relying on a glued form: `perf dump` is byte-identical across the change, so no part
   already drawn moved, and the only words whose answer changed are the ones that were wrong.
   Three faults came out of it, each found by measuring rather than by reading the code:
   - **A threaded rod said as its thread by its length was a different length.** `threadedrod M8x1500` drew a 1000 mm
     rod, because a screw, a bolt and a set screw all read `[x×]` and this one read only the trailing number. It reads
     the `x` form now, as its relatives do.
   - **Case is part of this library's own words.** A spring says its wire `d` and its coil `D`; a hydraulic cylinder
     says its bore `D` and its rod `d`. The first rule lowercased a name, so `spring d1 D10 L30 n8` - the family's own
     example - read `D10` as the wire and refused itself. A family that says two sizes by one letter is read by case.
   - And the one the gate caught that no reading would have: **asking a kind twice asks the wrong half.** A kind's
     axis whose sizes are computed from another axis (a cylinder's rod comes from its bore) carries no number of its
     own, so it does not look like a size at all, and both `D25` and `d12` read as the bore - which turned the
     catalogue's own line into "I do not know D 25 D 12" in six tests across three files. A kind's reader already does
     both halves of this; it is left to it, and the glued reading is for the hand-written families only.
   Two forms stay refused rather than read, and the refusal names the spelling that works: `belt GT2 1000 w9` (its
   family reads a width as "6mm") and `sheet aluminium t3` (as "2mm"). Teaching each family a second spelling of its
   own sizes is the per-family fiddling the one central rule exists to avoid, and a refusal that says how to write it
   is not a silent stand-in.
   The degrees-of-freedom solver (2026-10-12), which is what "no degrees-of-freedom count at all" meant, and the
   piece that turns four kinds of mate into one mechanism. `mate.ts` says how two parts go together one pair at a
   time, and that is a constraint and not an answer: a shaft in one bearing turns and slides, the same shaft in two
   bearings still turns and slides, and the same shaft bolted at one end does neither - and nothing here knew that.
   `parts/mechanism.ts` writes each joint by *what it leaves free*, which is the lower-pair vocabulary every assembly
   solver has, so every kind becomes rows of one matrix instead of a case of its own: that is why concentric, a
   screw, a slot and a gear pair cost a handful of lines each here rather than twenty special cases somewhere else.
   **The count is the rank of those rows and never the formula**, and the four-bar is why: four links on four
   parallel hinges have one degree of freedom, and Grübler's 6(n−1) − Σ(6 − f) says minus two, because three of its
   twenty-six constraints repeat what the others already say. The rank knows that (23 of 26), and the difference is
   itself worth reporting: a redundant constraint is what makes a real assembly bind unless it is given tolerance,
   and it is the number a fitter feels and a drawing never shows. Both figures are returned so the two can be seen to
   disagree.
   Checked against the textbook and nothing else, which is the only honest check on such a solver: a free part 6 and
   two free parts 12, a bolted part 0, a shaft in one bearing 2 and in two bearings still 2 with 4 said twice, a door
   on two hinges 1 with 5 said twice, a ball joint 3, a plate on a plate 3, a carriage on its rail 1, an M5 nut on an
   M5 screw 1 - and the motion it reports for that last one carries **0.80 mm along its axis a turn**, which is ISO
   261's own coarse pitch arrived at through the geometry rather than written down in the test. Two gears on their
   own shafts at 3:1 leave one freedom and turn opposite ways at exactly three to one.
   What a freedom *is* is said as the screw it is (Chasles): a slide along a direction, or a turn about an axis
   through a point, with its pitch where it has one. That is where the one real fault was, and it took a textbook
   number to find it: the axis was being reported through the offset from the body's own point rather than through the
   point itself, so a door's hinge line came out 400 mm from where it is. With it fixed, the four-bar's coupler turns
   about [0.2, 0.2, 0] - which is exactly the instant centre Kennedy's theorem puts where the two cranks' lines
   cross, derived and nowhere written. One other thing had to be got right for a rank to mean anything: a metre and a
   radian are not the same number, so every row's turning columns are divided by the mechanism's own size and every
   entry is a displacement, which is why a 1 µm mechanism and a 1 km one have the same freedoms.
   And it is fed from the geometry rather than being a library nothing calls: a `Mate` now carries where it acts and
   the axis or face normal it acts about (it had only names and sizes, which is a sentence and not a constraint), and
   `asJoint` turns one into a joint - bolted into `fixed`, seated into `cylindrical`, threaded into `screw` with its
   own lead, resting into `planar`. One mate makes one joint and the caller says which hold, because `mates` hands
   back every way two parts *could* go together and those are alternatives, not simultaneous constraints. So the
   NEMA 17's derived ⌀5 shaft in the GT2 pulley's derived ⌀5 bore is a cylindrical joint on the motor's own axis with
   two freedoms left - which is true, and is why a pulley needs its set screw; that the set screw makes it one is a
   fact about the fit and not about the geometry.
   The tidy ratchet earned its keep again: `jointOf` was already `teach/edges.ts`'s name for a *soldered* joint's
   shape, and the gate failed by name on the clash rather than letting a second owner be written. Renamed `asJoint`,
   as `Gap` became `PartGap` the round before.
   A declaration against its own drawing (2026-10-12), which is the critic reading the geometry rather than reading a
   second declaration. The gap was sharp: `contracts()` pairs two `Iface` declarations with each other, so a declared
   ⌀8 bore meeting a declared ⌀8 shaft passes even where the solid is ⌀10 — the one fact in this library that a
   drawing can silently contradict with nothing to say so. `declared(p)` asks the other question of every declaration
   that carries a diameter: a provider is answered by the rounds its own part draws, a requirer by its own bores, to a
   tenth of a millimetre; `misdeclared(p)` is the list a round works down, and `critique` says each one as a
   `declared` finding. Over the whole drawn library — 1,118 words, 285 drawn, **969 declarations with a diameter** —
   **none** disagrees with its own drawing, and that is a test, held at zero, in 3 s.
   The scope is the round's one real decision and it was got wrong first: the first run compared each declaration
   against the *assembly's* geometry, so an M8 arm screw on `robot jarvis` matched a chip's 25 µm bond wire two metres
   away and the robot came back with twelve findings where it has one. **A declaration belongs to the part that makes
   it**, so it is held against that part's own drawing: whether an M8 screw provides an M8 stud is a fact about the
   screw and not about where it was put. 13 disagreements became 1. And what answers it is every round the part draws,
   free or buried, not only the free ones — a wheel stud is pressed into its hub at one end and under its nut at the
   other, so it has no free end at all and is still a ⌀12 stud; whether a feature is *reachable* is the different
   question `mates` owns.
   The chamfer fix that went in with it is the general one, and it corrects a claim this file made two rounds ago.
   A ⌀4 dowel was being dropped entirely and three bearings read a millimetre under their catalogue ODs, which had
   been written down here as "the drawing being honest about its chamfers rather than the reader being wrong". It was
   the reader reading the chamfer. **A chamfer is a tool's feature and its absolute size does not shrink with the
   part** — an M1.6 screw's lead-in is 0.44 of its radius — so the allowance is max(0.35 r, 0.5 mm) and the shaft is
   the *widest* cylindrical run within that of the end, not the nearest. With it the 6205 reads ⌀52, the 625 ⌀16
   and the 6204 ⌀47, exactly their catalogue figures, a socket head cap screw's head lands on ISO 4762's ⌀8.5, and
   the dowel is found at all where before the reader took its chamfer's own flat (⌀2.8) over a run of zero length.
   Three faults in the check itself, each the same shape as the rounds before it. A bent tube's round was not read, so
   a drive shaft and a stub spindle — both drawn as tubes — "drew no shaft at all": **the feature lives in the richer
   shape and not in the primitive whose name suggests it**, a fifth time. A part that *provides* studs provides a
   pattern of studs standing out of it, and a stud is its own part pressed through its flange, so holding a hub to its
   own rounds called its five M12 studs ⌀24, which is its bore — a studs provider is answered by the studs it itself
   names (`passes`). And a chain's `d` is ISO 606's *pitch*, a length along the chain and not a diameter of anything
   drawn: this file's own comment said so and the code compared it anyway. Those three took the fleet from 132
   findings to 124.
   What is left is real and is the fleet's hand-drawn debt, four causes, held to the number by a ratchet rather than
   hidden: a hub and its axle both take their shaft diameter as **12 % of the rim** (`Math.max(0.03, t.rim * 0.12)`,
   one formula written twice in `machines.ts`), which is 54.864 mm on an 18 in wheel where the hub bores ⌀24, the
   drive shaft draws ⌀28 and the stub spindle ⌀38.4 — and all four parts declare that same number, so they agree
   with *each other* and `contracts()` has always passed them, which is precisely the gap this round exists to close.
   The other three: a hub on a fixed spindle draws no bore at all, a sprocket is drawn as a solid disc with no bore,
   and an engine's output shaft is declared and never drawn. The car carries 8, the whole fleet 124. Fixing the first
   is not a one-line change and is a round of its own, because making the four declarations honest exposes that the
   hub's ⌀24 bore cannot turn on a ⌀38.4 spindle — a geometry fault, not a declaration one.
   Measured before trusting it: 14 ms on a car, 24 ms on a street, and `perf dump` byte-identical across the round.
   The fleet's ⌀54.864, and the three causes beside it (2026-10-12): **132 findings to 0**, each fixed at its cause
   rather than by dropping a declaration. The first is the one the round before named: a hub, its axle, its drive
   shaft and its stub spindle all declared `Math.max(0.03, t.rim * 0.12)` — 12 % of the *rim*, one formula written
   three times — so they agreed with each other and `contracts()` had always passed them while the drawing said
   ⌀24, ⌀28 and ⌀38.4. The fix is the rule the check exists to enforce: **each part declares the round it
   draws.** The drive shaft declares its own tube, the stub spindle its own, and the hub asks for the bore it is
   drawn with. And the fleet's drawing turned out to be internally right all along — a hub bores ⌀24 and the CV
   joint's splined stub is drawn ⌀24, a beam hub bores ⌀58.1 for a bearing whose own bore is ⌀34.1 and whose
   spindle is drawn ⌀34.1 — so only the declarations were ever wrong, which is the cleanest possible outcome and
   is why one formula could be deleted without moving a solid.
   The second cause was the reader's, and it is the "pocket's floor" this file had queued: `axesFrom` took the least
   radius over a whole turned profile, which finds a *through* bore and nothing else, so 18 hubs closed across their
   front — a profile that dips to r = 0 at one end — read as drawing no bore at all. A blind bore is the common case
   in a casting, so a bore is now **every cylindrical run with the part's own material outward of it**, and which
   side the metal is on is decided exactly: spun about y, the profile is solid between its crossings of a height
   taken in pairs, so a radius is an inner surface where it *opens* one of those pairs and an outer one where it
   closes it. No reading of the radii alone can do that — a bore and a stepped shaft's smaller diameter both have a
   larger radius beside them.
   The third and fourth were things declared and never drawn, and both are drawn now: a sprocket asked for a shaft
   and was a solid disc, so it is bored for the shaft it asks for; and a small engine's output shaft had been
   declared since this builder was written and never drawn, so nothing it drives had anything to sit on.
   Then the gate found two faults the declarations had been hiding, which is the round's real dividend — both are
   *missing links in the interface chain*, and neither could be seen while every part declared the same wrong number:
   • **A hub's bore takes its bearing, not the spindle.** With honest numbers the Corolla read "58.1 mm bore,
     34.1 mm shaft", because `contracts()` paired the hub straight with the stub spindle and the 24 mm between them
     is a wheel bearing. The bearing was drawn and declared nothing, so it now provides its outer race (which seats
     in the hub's barrel, a shaft's relation the other way round) and asks for its own bore, and the hub names it
     (`to: 'wheel bearing'`). The chain hub → bearing → spindle is whole.
   • **The same link was missing on the driven side**, which showed as an ATV and then a forklift with *no contracts
     at all*: the CV joint's splined stub sits in a driven hub's bore and declared nothing, and a wheel on a rigid
     axle was bored for nothing. Both say so now, off the same two constants (`CV_STUB`, and the axle's own `d`).
   Two more came out of giving a hub a bore it had not had, and both are the same mistake — **a flag that means one
   architecture used as though it meant another**. `onPlate` draws a twist beam's trailing-arm carrier and its dust
   shield, and its condition was `!knuckle && !!bore`, which caught a motorcycle and a rigid axle too: the carrier
   landed in the fork leg. It is the `axle` option that says a twist beam, and that is what it reads now. And the
   axle nut, which runs on a fixed stub against a hub's spigot, was drawn wherever there was a bore and no bearing —
   a rigid axle's wheel bolts to a flange and has none, so it is scoped to a knuckle's hub.
   One case is left and it is written down rather than hidden: **a single-track hub is still drawn solid** with its
   axle passing through it. Giving it the car hub's bore brings a car's corner with it — a spigot, an axle nut, a
   carrier and 38 mm more barrel, all of which stand in the fork leg — and a motorcycle hub bored for an axle that
   passes clean through to its fork is a corner of its own. So it draws no bore, declares nothing (which is honest
   about its drawing), and it is the *clash* check that still reports it, which is the right check for a drawing
   fault. Drawing that corner is the next round on this.
   A single-track hub's own corner (2026-10-12), which is the one case the round before left drawn solid. A
   motorcycle hub is not a car's with the spigot taken off: it is a barrel bored clean through, **two** bearings at
   its ends with a steel spacer holding them apart, and nothing else — the axle goes on through to the fork and
   clamps the pair through that spacer, which is why neither bearing needs a nut on the hub. Drawn, it is the chain
   the car's beam corner already has, one link longer: the barrel is bored at the bearings' *outsides* and only the
   bearings bore for the axle, so hub ⌀ 41.8 ← bearing → ⌀ 22 axle, and the bearing's radial thickness is the same
   `race` figure the car's sealed unit uses. A test holds all of it, including that no axle nut, carrier or dust
   shield is drawn on one.
   And the round's real find is in the critic, not the hub: **a wheel's clearance was measured against its own hub.**
   `turning` asks 15 mm beside a wheel's sidewall, and the envelope was built from the whole wheel *group's* box —
   so the room was demanded beside whatever of the hub stood out past the tyre, which on a motorcycle is the very
   part the fork grips. The comment above it had claimed the right rule for three rounds ("a wheel sweeps a ring:
   inside its rim, behind its face, is where its knuckle, brake and strut foot live") and the code honoured it
   radially and not along the axle. It is the ring's own half-width now, **about the ring's own mid-plane**: a hub
   standing out one side pulls the group's centre off that plane, so a tyre symmetric about its own middle was being
   measured from 26 mm to one side of it and read 56 mm of half-width where it has 40. Every wheel in the fleet had
   been given clearance against its own hub; it only showed when a fork came close enough to care.
   Two things paid for honestly rather than waved through. The hub's own bore had to be the bearings' outside and
   not the axle's, which my first test asserted the wrong way round — the contract check caught it, and the chain is
   what the test asserts now. And `critic.ts` went nine lines over its tidy allowance: the number was not raised,
   the nine lines were paid back out of this round's own comments and two `const` statements that were always one.
   Next on this, in order: a pocket's floor in a *box* or a rolled section, which is the same well rule the rings
   and now the turned bores get; and the mates of a whole assembly chosen rather than listed, which is what would
   let a drawn machine be asked how it moves instead of a pair of parts.
   What a parts API has that this did not, added as fields rather than waited for (2026-10-11). Going through Nexar's
   own part model against ours, six things it carries were genuinely missing and each changes a build pack: the maker
   and its own part number (a seller's product title is not an identity - two sellers write the same part three ways -
   so this is the only field by which an offer here and an offer anywhere else are the same thing); the seller's own
   sku, which is what you type in to order the same thing twice; stock as a number rather than the word in or out; the
   working days it takes from the factory; the seller's own quantity break table, because a price at one quantity is
   not a price curve and a bill that buys a hundred of something is charged the wrong figure without it; and where the
   part is in its life, because being told to buy what is out of production wastes an order where having no price only
   wastes a decision. A maker's sheet and the keys that would do instead went in with them. All are optional, so
   nothing already written had to change.
   Measured straight away, which is the point of making it a field: **5 of 128 keys carry their maker's own part
   number** and 128 have no maker's sheet. The five are the ones whose maker was already written in their own name or
   note (a WEN BV454, Harbor Freight's item 57861, a Timken 6204-2RS, an SKF 6205-2RS, TEMCo's Kanthal A-1) - lifting
   prose into a field, which is the same move as grading the prices themselves. The rest are a ratchet in
   `tests/nexus/supply.test.ts` and are worked down by hand.
   Two faults of my own in doing it. The gaps were first written as per-sighting faults, which put a near-universal
   gap on every offer and left 1 of 158 "firm" - a ranking that ranks nothing. What is wrong with a *figure* (read off
   a search result, no page, stale) and what is missing about a *part* (no identity, out of production) are different
   kinds of thing and are now counted separately (`Fault` and `PartGap`). And the type was first called `Gap`, which
   `substrate/manifold.ts` and `substrate/runtime.ts` already own: the tidy ratchet failed the gate by name, which is
   exactly the fault it exists to catch, and the fix was to rename mine rather than raise its number.
   And the gate runs off this container (2026-10-11): `.github/workflows/vr-sandbox-ci.yml` was one job running
   `npm run typecheck && npm test`, the whole gate unsharded. The typecheck and the tidy lint are their own jobs now and
   the test files are dealt into four shards by vitest's own `--shard`, measured even on this tree at 46, 30, 27 and
   43 s - summing to the gate's own 141-146 s, so the slowest shard is the wall clock. `fail-fast` is off so one red
   shard cannot hide the other three, and `cancel-in-progress` means a second push supersedes the first rather than
   being paid for. Measured on GitHub's own runners: typecheck 3 s, tidy 1 s, the four
   shards 74, 56, 49 and 58 s at once, the whole run 1 min 45 s end to end - each shard slower than this container's
   46 s and all four at once, which is the point. One thing is worth recording because it cost a wrong diagnosis: four
   pushes on 10-11 created no run at all while a `workflow_dispatch` of the same workflow ran normally, and the next
   push ran. A repository creates no run when Actions is off and queues one when it is out of minutes, so creating
   none looked like Actions being off - and it was not: the setting was on throughout. The lesson is the diagnosis,
   not the cause, which is still unknown: a dispatch is the cheap test that separates a switched-off repository from a
   trigger that is not firing, and `workflow_dispatch` is on the workflow so that test is always available.
   A rule written twice, caught by a reader rather than by remembering (2026-10-12). The user, on the shape of the
   work rather than on any part of it: *"you've had to delete so many files because they were duplicates because the
   context of one got buried and you have had to be told exactly what to do step by step … it's as complex as you
   make it, you can make tools for your tools."* That is one fault with one cause, and this file has the evidence: a
   hub and its axle both took a shaft diameter as `Math.max(0.03, t.rim * 0.12)`, **written three times in one
   file**, and all three were wrong together — which `contracts()` passed for months because they agreed with each
   other. The second copy is written because the first is out of sight, so remembering is exactly the wrong tool, and
   `tidy.test.ts` already catches the five other forms of it. This is the sixth: **nothing is written twice.**
   It reads code and not prose, which is what makes it usable rather than noisy. A fragment that *starts* inside a
   string or a comment is not code (prose repeats itself honestly — "about 0.8 mm (typical)" belongs beside every part
   it is typical of), while string *arguments* stay in the comparison, because they are what makes
   `unit('L', 'length', …)` and `unit('V', 'voltage', …)` two rows of a table rather than one rule written twice.
   It wants a measured number with arithmetic on it, so `parts.push(P(name, shape, at))` — the shape of every drawing
   here, and the point — is not a clone, and `Math.max(0.6, 0.07 * D)` is. And it wants the two in different files,
   because a table's rows inside one file are how a table is written. Getting those three filters right took three
   passes over the tree: the first reported 61 fragments, mostly prose; the second 36, with distinct table rows
   collapsed into false positives by blanking their strings; the third 24, all real.
   Four of the 24 had a legal owner already imported by both sides and are now written once: the **AWG formula**
   (`d = 0.127 × 92^((36−n)/39)`, ASTM B258's own definition) in `parts/families.ts`, which `world/behave.ts` had
   written out again to say a wire's resistance; a **flanged bearing's flange thickness** and the **GT2 loop's
   default pitch diameter** (a 20-tooth pulley's own 12.73 mm) in `kinds/motion.ts`, read by both a part's mass and
   its drawing; and a **set screw's socket depth** in `parts/threads.ts`, beside the key sizes both halves already
   read. All four are pure extractions and `perf dump` is byte-identical across every case, which is the only honest
   proof that nothing drawn moved.
   The 13 left are the ratchet, each a real second owner and each a piece of work someone can pick up: a molar mass
   and a skin area written in two `life/` files, one solder-ball and one die drawing written in two `boards/` files,
   two pairs of `view/` rooms that each wrote their own `std(…)` material helper, a fixed-timestep accumulator clamp
   in two `world/` files, and three length axes declared identically across two `kinds/` files each. Worked down by
   giving the rule one owner — never by widening the reader, which is this file's standing rule about ratchets in the
   one form that would be easiest to break.

Next: the remaining stand-ins (the welder and the MSLA printer, each blocked on a library
   drawing), the brake's own stand, the room's bare walls, prices for the 98, working the four ratchets down by cause,
   and the older Now items (robot benches, likeness, life graph).
The network allows GitHub and package registries only: makers' sites and datasheets come through search snippets,
Tavily's extract (it returned Würth's datasheet text), Firecrawl (its credits are low) or GitHub (KiCad's libraries,
makers' documentation repos: ask for each with add_repo first, then a blobless clone and fetch only the files needed);
the user can widen it under the environment's Network access.


## Manny's first findings, fixed by cause (2026-10-13)

The critic built the round before found five blocking faults on his first cold pass, by attempting the user's own
named mix (a Unitree Z1 Air, a CreatBot D400 HS, a filament line, camera rails, a floor grid) rather than by reading
the code. Three were verified in the source before being accepted and are fixed here; two are answered in writing and
are the next round. The ledger is `docs/MANNY.md`.

**A pulley's size was read by one door and not the other.** The pulley family's `read` took teeth only from `60t` or
`60 teeth` and a bore only from `8mm`, so `pulley GT2 60 8` matched neither and fell to its 20-tooth, 5 mm defaults
**silently** — which is what every composed machine ordered, whatever its bill said. The same family asked in its own
grammar (`pulley 1000t 8mm`) refused honestly: one door told the truth and the other did not. It now reads the tagged
forms first and then the bare numbers nobody tagged, in the order written, so both doors arrive at the family's own
range check. `pulley GT2 60 8` was `pulley-gt2-20t-5` and is `pulley-gt2-60t-8`; `pulley GT2 1000 8` was that same
silent default and is now refused by name. The general lesson is the one this file keeps relearning: **two
vocabularies for one thing, and the lenient one wins silently.** And the reason it survived a round that was
*specifically about* declarations against drawings: `mate.ts` holds the drawing to the declaration and the
declaration to nothing, so `misdeclared()` returned 0 the whole time. A pulley *is* the gear ratio, so every arm's
torque table was arithmetic over a ratio the drawing did not have.

**An unknown work envelope passed.** `works/can.ts` guarded the size check with `if (e)`, so a station that never
said how big its work area is was never refused — which routed a 710 × 630 × 1100 mm frame to "forging on a propane
forge", 42 minutes, and then said the schedule could not be beaten, while correctly refusing a 400 × 300 × 8 bed.
The smaller part failed and the metre-long one passed. Unknown is a refusal now, and the four stations that *make*
and declared nothing — forge, welder, spot welder, soldering — declare one, each an estimate of what limits the work
rather than the machine's own outside, and each saying so.

**A machine's mass included what it was holding.** `stack` and `armStack` both added `payloadKg` into the mass they
returned, so a 1.39 kg arm holding a 3 kg brick reported 4.39 kg and the forge then attributed 3.17 kg to a 55 g
servo. `kg` is the machine's own now and `holding` is said separately. Every stage still carries the payload in its
own check and every joint's moment still includes it — that was never wrong; only the total was.

Found while fixing the first of those, and logged rather than lost: the pulley family makes one belt profile and
silently substitutes it, so `pulley HTD5 30 12` comes back as a GT2.

The two answered rather than fixed, with the reason written down: the inventor throws most of an ask away and says
nothing (`composeMachine` needs the `notDone` return path `ask/route.ts` already has), and **no tool can render an
invented machine at all**, so this file's own round step 2 — render it, look at it — has never once been possible for
that door. That is why the other faults survived, and it is why nothing said about how a composed machine *looks* is
evidence. Both next, together, because a `notDone` nobody can see is worth little.

## The fault hiding behind the pulley, and the check that would have caught both (2026-10-13)

Fixing the pulley's silent default exposed the fault it had been covering, which is the better half of the story.
`turnAxis(ratio)` orders its driven wheel as `pulley GT2 ${20 * ratio} 8` — 100 teeth at 5:1, 1000 at 50:1. **No
pulley has 1000 teeth.** While the family silently returned its 20-tooth default, every one of those resolved and a
50:1 shoulder was drawn as 20 teeth driven by 20 teeth: 1:1. With the family now refusing honestly, the arm would
have ordered a part that does not exist — so the two had to be fixed together, and the second is the real engineering
fault. **One GT2 stage cannot reduce more than the pulleys it is made of**: 20 teeth is the smallest driver worth
making and 80 the family's largest wheel, so 4:1 is a real ceiling and not a table's opinion. A ratio is staged now
(`beltStages`): 4:1 in one stage, 16:1 in two, 64:1 in three, and beyond that a belt is simply the wrong machine and
is refused — which is what the arm's own refusal text has said all along ("put a worm or cycloidal reducer there
instead of a belt, which is where a cheap arm stops being cheap"). What the stages *deliver* is what the torque is
taken from, not what was asked for, and each stage costs its own 5 % rather than 5 % of any ratio. `RATIOS` is
filtered by what a belt can really give, so the ladder cannot offer a fiction again.

**The check, because a judge costs a round and a check is paid once.** The completeness test next to it could not see
any of this: the pulley *resolved*, it was simply the wrong part. **Resolving is not agreeing.** So every unit the
inventor affords is now asked for each of its parts by the words it orders them with, and every number in those words
must appear in the part that comes back. Verified to bite rather than assumed: re-breaking the pulley read fails it by
name, and restoring it passes. That is the words↔part half of the triangle Manny named — Onshape holds a
configuration to its drawing, `mate.ts` holds a drawing to its declaration, and nothing held either to the words that
asked.

And the list of units existed in **three** places — `cli/machine-main.ts` printed its own copy, `tests/nexus/machine.test.ts`
declared another, and neither could check the other. `everyUnit()` in `ask/machine.ts` is the one list; both read it.
A unit added to one and not the others was checked by nothing, in the very file whose own test asserts that fault.

`perf dump` byte-identical across the round: nothing any kit draws moved. Gate 178 files, 2,087 tests.

## #46 — the machine kit, and the turn that was applied twice

The inventor had no door into the look page. `view/look.ts` picks its kit by id from `KITS`, there was no `machine`
kit in that list, and so every picture the critic judged for six runs was the part kit's family example — a 400 mm
MGN12 rail — whatever sentence it had been given. The fix is one `addKit({ id: 'machine', … })`, registered at the end
of `ask/machine.ts` rather than in `parts/kits.ts`, because a kit that composes a machine must import `ask/` and
`parts/` importing `ask/` is the up-layer import the tidy lint forbids (`world/creatures.ts` registers its own for the
same reason).

That uncovered a second one-line condition behind it: `parts/kits.ts` read `if (k.id === 'part') out.said = words`, so
the ask's raw text reached exactly one kit **by name** and the machine kit was built six times from an empty string,
drawing the 300 mm default each time. It is a declared flag now — `saidWhole?: true` on `Kit` — so a kit that reads
the sentence says so instead of being appended to a growing chain of ids.

**What the first honest picture showed.** A length of stock is declared z-long (`npm run part -- "extrusion 2040 2000"`
gives `20 × 40 × 2000`), and `layUnit` carried three Euler constants built on that declaration, under a comment citing
`kits.ts` as their source. But the part `components.ts` returns has already been stood upright by a `rot` on a child of
its own, so each constant turned it a **second** time: the four members meant to be a frame's uprights cancelled to
flat, the four meant to lie across stood up, and a 2000 mm rail's beam was drawn standing on end. A near-cube frame
(700 × 700 × 750) looks like a frame however its twelve members are permuted — which is exactly why six rounds of
looking at it never caught this, and why the comment claiming to have fixed the blind judge's "a spidery frame whose
uprights terminate in empty space" had only moved it.

The fix is a measurement rather than a better constant: `layAlong(part, axis)` in `parts/space.ts`, the owner of
oriented boxes, lays the part out, finds which way its longest side actually points, and returns the turn from there to
the wanted axis. `layUnit` calls it at the six places that set a length of stock down; every other call site keeps its
literal turn, so nothing but prisms moved. The declared convention can now change in `parts/` without silently
breaking `ask/`. Two tests hold it: a frame's twelve members must run four along each axis (the old code
measures 0 along x, 8 up and 4 across), and a 2000 mm rail's beam must be longer in x than ten times its y or z.

Still wrong and written down rather than left to be found again: the rail's brackets lie along the beam instead of
standing under it, the turn axis and gripper float above it rather than hanging off the carriage, and `machineParts`
still draws only two of the four arrangements it declares — `arm` has its own loop, `gantry` has the quarter-turn
rule, and `rail` and `table` share the gantry's upward stack.

## #55, #49, #50 — the two-mass check measured, then mended

**The instrument, measured (#55).** `npm run part -- --audit` walks both populations and splits every mass by where it
came from. The split needed something that did not exist: `parts/mass.ts` returned one number whatever its source, so
a mass a drawing DECLARES and a mass summed from solids came back indistinguishable, and `npm run part` printed the
two against each other as independent opinions. It now has `ownKg` extracted (one rule used by both, rather than the
arithmetic written twice) and `massWhy`, which splits a total into declared / solved-back / summed; `Part` gained
`fillFrom`, and the five places that solve a hollow casting's fill out of a published mass say what they solved from.
Without that marker the fourth class cannot be told from the second at all.

The answer: **2214 of 2404 inventory items (92.1 %) and 279 of 395 catalogue families (70.6 %) are not drawn**, so for
nine things in ten "no disagreement reported" is evidence of nothing. Of what IS drawn, nothing is wholly declared or
wholly solved; 23 figures (5 items, 18 families) are part summed and part not, and those are the ones where a `0.0 %`
meant arithmetic rather than agreement. `npm run part` now prints which it is and withholds the percentage where the
two numbers are one number.

Three faults in the audit itself, found before quoting any number from it: it asked for drawings by id only, and a
maker file registers its drawing when asked BY WORDS, so 28 drawn items read as undrawn — including the Quest 3, the
item that raised the finding; it counted "equal" as "lighter" on float noise; and it let a part-summed figure print a
percentage. A sweep that silently misses a class is the fault being audited.

**The tests that could not fail (#49c).** `headset.test.ts` is renamed to what it checks — the published mass is
*reachable with this envelope* — and asserts the summed share separately. It also turned out the two items in that
loop are not the same claim: the headset's shell has its fill solved back, so 20 % is a reachability bound, while the
controller is summed throughout, so for it the same 20 % is a real agreement. The test now states which, per item.
Proved by breaking it: `QUEST3.kg` at 5.15 → red, back at 0.515 → green.

**The fabricated mass (#50).** `(size / 10) ** 3 * 9` gave an NMRV 030 243 g while the same family's own `of` named
two 6204 bearings the library weighs at 106.18 g each — 212 g of the 243 g was bearings. It is summed from its own
declared parts now, each term shape × density: a die-cast shell over the envelope, the bronze wheel, the steel worm,
the two bearings, the oil. 030 → 986 g, 110 → 25.6 kg, and `std` labels it a **lower bound**: a published NMRV 030 is
1.6 kg, so this is 62 % of it and the rest is ribs, feet, flanges and the output boss the envelope does not draw. A
maker's weight table is still wanted and could not be reached from this container (Firecrawl credits low, Tavily
rate-limiting) — a network limit, stated rather than papered over with a second invented law.

**The check that would have caught it.** `inventory.test.ts`: no item may declare a mass less than the parts its own
`of` names. It found two more — `servo-micro` (9 g containing an 18 g `motor-130`) and `n20-motor` (10 g, the same) —
and the cause was one id: `families.ts` gave every servo a 130-size can, 20 mm across, including the micro. There is a
`motor-micro` now and the family picks by its own mass, as `gearmotor` already did for the N20. Offenders 2 → 0, and
the test fails by name when `motor-130` is put back.

## The default that lies: two instances in two rounds

`tools/look.mjs` adds `kit=part` when a query does not name a kit. That default is why the critic's eyes showed a
400 mm rail for seven runs (#56) — and then, one commit after it was fixed, why a measurement of the critic's output
on "a small hatchback" came back empty and got written up as "the critic is silent". With `kit=car` the same ask
gives a hundred findings. Both times the tool answered a question nobody had asked it, and both times the answer was
confident. The pattern is worth more than either instance: **a default that makes a tool convenient is the one that
makes its output a lie when you forget it**, and the defence is that the tool says which door it took — `look.mjs`
and `manny-see` both name the kit now, in the line they print.

## Run 7g — coverage, not complaint: the critic's test stops requiring the car to stay broken

`tests/nexus/critic-speaks.test.ts` was built to catch a check that cannot fail, and the first two versions of it were
that fault in a new shape. #83 was one `Set` across five fixtures, so `standing` was satisfied by a park. #87 is worse
and was invisible until Manny read the `fixed` flag on every finding the pins stood on: **eighteen of the twenty-three
pins were `fixed: false` findings — open defects.** Read plainly, the file required a hatchback to go on misdeclaring
its own bores, a panel to go on meeting its mirror out of tangent, and a park to go on being about to tip. The commit
that fixed any of them would have turned the test red saying *"these checks went quiet"*.

What the file was reaching for is whether the rule **ran**, and the two come apart exactly where it matters. So
`critique` now fills a `Looked` census — how many candidates each check considered, zero included — and the kit
fixtures pin coverage. A check that looked at 46 skins and said nothing is working, and fairing those skins keeps the
test green; a check that looked at **0** is dead, and that is #78 and #79 said in one number. Complaint is still
asserted, but on three `Part` literals built wrong on purpose (a cubic metre weighing half a kilo, a bowl taken past
its equator so no die can part it, a ⌀20 bore on a ⌀25 shaft), where pinning the finding is sound because nobody will
ever want to fix the fixture.

**The measurement answered the question I had asked Manny.** Across five kits × three seeds, every coverage count that
was nonzero was nonzero at all three seeds — while two of the old complaint pins moved with the seed: the park said
`standing` at seed 1 only, the street said `interfaces` at seeds 2–3 only. So the old file passed or failed on the luck
of a seed, and two of the pins I had asked about were never structural. That is written into the test's own comment, so
the next reader does not have to re-run it.

### Three faults of my own this round, each found by measuring instead of asserting

1. **"`standing` cannot fire on the machine because nothing declares a foot."** I wrote that in the test file at #83 and
   never measured it; Manny then repeated it back as established fact. It is false — **six 2040 extrusions stand at
   y = 0** and `standing` looked at seven grounded parts. This is #56's rule again (*a claim that code does something is
   a claim about a file, and it gets a check before it gets written down*), and the new thing it shows is the cost of
   getting it wrong in a shared document: the critic inherits the error and hands it back with his authority on it.
2. **`critic.ts` crossed its 860-line ratchet** (to 900) under this round's additions. The number was not raised. The
   three skin checks and their four caches went to `critic-skin.ts` (68 lines), which is what the ratchet's own message
   asks for — one rule per file — and `critic.ts` came back to 847.
3. **The split silently broke the thing I had just built.** #84 derived `EVERY` by reading `say('…')` out of
   `critic.ts`; the split moved `continuity`, `draft` and `radius` into `critic-skin.ts`, so the derived list would have
   **shrunk from twelve to nine and every assertion below it would have gone on passing**. Measured, not guessed:
   `critic.ts` alone yields 9 names, both files yield 12. It now reads every `critic*.ts` in the directory. *A list
   derived from one file is a list a refactor can empty* — the same fault as a check that cannot fire, committed inside
   the fix for it, twenty minutes later.

### Proved by breaking it, both halves

```
saw('room to slide', 0)        → machine: these checks LOOKED AT NOTHING on this fixture … expected ['room to slide']
draft threshold −0.5° → −50°   → draft: a defect built for it, and it said nothing: expected [] to include 'draft'
```

### What the picture tool now says (#89, and two faults in my own #77)

`contracts` reached `lookReady` in the same commit as `critic` and no tool printed it — the comment three lines above it
reads *"the one thing that must not happen is that it arrives and is still unread"*, and its own author broke it in the
same sitting. `look.mjs` now prints the interface verdict, and the census line: *"10 of the critic's checks looked at
this picture; these looked at nothing in it: room to slide, through"*.

Two more faults showed up the moment it was run rather than grepped. The critic's twelve printed lines were the **least
interesting twelve** — `slice(0, 12)` in emission order, which is twelve identical `walls … thickened` normalisations,
so a reader never reached one open defect. Open defects now come first; and then the twelve were all `declared` about
the same five wheel studs, so it is capped at three per check. The car reads honestly for the first time: **53 still
wrong, 47 put right**, with the hub bore 9.6 mm out of what it declares and the hood standing 394 mm from the fender it
is supposed to meet.

Gate green. `critic.ts` 847 lines, `critic-skin.ts` 68.

## Run 7h — what turns is what says it turns

The user's instruction was the right one: *"don't fix the car, give yourself the right tools to accurately regenerate
the car."* So the car's 59 open findings were grouped by cause before anything was touched, and the grouping is the
whole round:

```
declared      38     a part states a feature size its own solid does not draw
room to move  16     something sweeping into something else
radius         3     a panel bending tighter than its sheet is pressed
continuity     2     the hood standing 411 mm from the fender it is to meet
```

`room to move` was taken first, and it took **three wrong hypotheses before a right one**, each refuted by a
measurement rather than by argument. That sequence is worth more than the fix:

1. **"The stub spindles are the cause — they declare `joint: 'bearing'` and the critic ignores it."** Half right: the
   declaration *was* being ignored, and `turning()` now reads it. But it was worth only **2 of 16** findings.
2. **"The exact test uses the whole group's axial extent where the prefilter uses the tyre's ring."** True of the code
   and irrelevant here: measured, `along` = 66 mm against `alongRing` = 65 mm, and the parts complained of lie
   240–670 mm inboard of either.
3. **"A part that other parts `passes` through is the enclosure, not the thing enclosed."** False. Across five kits,
   rims (`passes: [tyre valve]`) and brake discs (`passes: [wheel stud 1…5]`) genuinely turn and genuinely declare it.

The measurement that ended it was the one that should have come first: **attribute each finding to its mover**, which
the finding already names.

```
4 wheels                        6 findings   the fender and the wheelhouse liners over them
reduction gear and differential 8 findings   inner joint housing, subframe cross member, rack,
                                             rack housing, motor, inverter, torque rod
```

**Eight of sixteen came from one part, and its own `says` gives the cause: "a cast housing round its reduction gears
… and its differential".** The drawn solid is the *casing*. `turning()` called it a rotor because its **name contains
the word "gear"** — and so the subframe it is bolted to, the rack beside it, the motor and inverter it sits between,
and the torque rod that holds it were all reported as being in the way of a casting that does not move.

### The root, and the tool

`turning()` — the predicate behind every `room to move` finding — asked the part's **name**: a regex of twenty-two
words with a hand-kept list of name exceptions beside it (`steering|hand|fifth ?wheel|wheel ?(nut|bolt|stud|arch|…)`).
That is this session's recurring fault in the critic's most load-bearing predicate: *a general rule written as a
condition on names*, maintained by adding names.

Nothing in the model said whether a part rotates. Everything else about motion was declarable and declared —
`travel` (range of motion: steer, bump, slide from–to), `swing`, `link` (moves as one), `movesWith` (carried with,
by name), `joint` (the kind of joint), `iface {kind:'drive', torque, to}` (what drives what, with numbers) — but not
the one fact the predicate needed. So `Part.rotates` now exists:

```ts
rotates?: false | { within?: string };
```

`false` says it does not turn however it is named. `{ within }` says it turns inside the member it names — it sweeps
its own drawn solid and no more, and what it must clear is that member's bore, which is an interface and is checked
as one. Left off, the name list still answers, so nothing that does not say is changed. `turning()` reads the
declaration first, the joint second, the name last.

### Measured, against a prediction written beforehand

```
                 predicted   got
open findings     59 → 49    49
room to move      16 → 6     6
```

The numbers were right and the attribution in the prediction was wrong (it blamed the spindles for 10 of the 16; they
were 2, and the casing was 8). `room to move` on the hatchback is now its four wheels against the bodywork over them
and nothing else — a real question, and a small one. `tests/nexus/turns.test.ts` holds the three answers apart (what
the part declares, what its joint implies, the name list for what says nothing) and ratchets the hatchback's count:
it may fall as the bodywork is fixed, never rise.

`critic.ts` reached 863 against its 860 ratchet. The number was not raised; my own comment was cut to 857.

### What is left, in order of size

`declared` is now 78% of what remains — 38 findings on 12 parts, every one of the form *"it says ⌀24 and the nearest
it draws is ⌀14.4"*. That is the same shape as this round's fault one level in: a number stated in one place and
drawn in another, with nothing making the two agree. It is the next root, not the next patch.

## Run 7j — the critic's own review, acted on in the same sitting

Manny returned no BLOCK on 7g/7h and four questions worth more than a verdict. Three were taken immediately because he
was right and each was small:

- **A field written and never read, inside the fix for exactly that fault.** `rotates` shipped as
  `false | { within?: string }` — the named MOVES_WITHIN edge — and `turning()` returned `null` for both, so the
  member's name was carried and nothing read it. `Part.rotates` is `false` only now, and the comment says the named
  form comes back when `contracts` reads it. *Within the hour of writing "nothing is carried across a boundary without
  something that reads it" into the ledger.*
- **A cap dressed as a ratchet.** `toBeLessThanOrEqual(6)` stays at six after two of the six are fixed and permits
  them back. `CLAUDE.md` asks a ratchet to fail on a new one by name **and** on a fixed one until its line is deleted;
  `<=` does only the first. Now `toBe(6)`, with "measured, not chosen" and the breakdown in the file. The two-way form
  had been written two commits earlier and then not reached for.
- **The prefilter: containment, not magnitude** — *and the conclusion below was wrong, corrected in Run 7l.* I had
  looked at the 1 mm difference and left it, which was the wrong question; the right one is whether the box *contains*
  the cylinder. The two were the wrong way round (box = the tyre's ring, exact = the whole group), so the shape
  shipped is box = group, exact = ring. Hatchback findings unchanged at 6 — **and that is what the algebra predicts,
  not weak evidence**: see Run 7l.

### The census he asked for, run once, and it found something bigger than the casting

He asked: how do you find the next `reduction gear and differential` without another round of grouping findings by
cause? Answer: list every part the name list calls a rotor that declares nothing and has nothing round under it.

```
4-rotor drone battery · camera · foot 1–4 · flight controller · radio receiver
· speed controller 1–4 · top plate · bottom plate · motor mount 1–4 · arm clamp 1–4
```

**`TURNS` contains `rotors?` and the thing is called "4-rotor drone", so every part of it matches.** A battery is a
rotor. A foot is a rotor. A radio receiver is a rotor. They raise no findings today only because `movers` keeps the
outermost of what turns and the drone's own root matches too — the whole aircraft reads as one rotor and its three
hundred parts as its insides. So the name list is not merely answering for parts that say nothing: on this kit it
matches **the product's name**, three words from the part's own identity, and the silence is an accident of which
match happens to be outermost.

The census is the right instrument and wants `movers`' own filter (outermost, not detail, not sealed) before it earns
a place in the gate. Not built this round.

### Deferred, with the reason written down

`declared` at 38 is next and **not** by fixing twelve parts. Three reasons to doubt the instrument first, all his:
`roundsIn` pushes a tube's **outer** diameter so a walled tube's bore is invisible to it; `axesFrom` may read no
prism `holes` branch, making every bore through a rolled section invisible too; and the `studs` comparison is
asymmetric — thread **labels** for a `requires` (under a comment explaining why root-against-nominal is wrong) and a
raw diameter against nominal for a `provides` eight lines later. Two experiments decide it before any part moves: run
`declared()` over catalogue parts drawn from published standards (clean there and dirty on the car means the car is
lying), and group the 38 by sign and by branch. And a property of the check itself: `near()` takes the closest
diameter anywhere under the part, so strictness **falls** as a part gets more detailed.

Three of his doubts stand unacted: no check owns *"nothing is below what it stands on"* (the machine's PTFE tube at
−24 mm); refuted hypotheses live in prose where no future round would look for them; and the three-seed result is a
sentence rather than a thing that runs.

**A process slip in this round worth more than its cost — and the lesson I first wrote for it was the wrong one.**
`critic.ts` crossed its 860 ratchet again on the comment explaining the prefilter fix, and I "verified" tidy with
`npm run tidy 2>&1 | tail -3`, which passed while the gate failed on it four minutes later. I recorded the cause as
"three lines was too few, use a filter that would show the failure". **That is not the cause.** `tail -100` would have
passed too, and so would `| head -20`: **a pipe replaces the exit status**, so the command exits with `tail`'s 0
whatever `tidy` did. The check could not fail at *any* truncation. The durable rule is **read a check's exit code,
never its stdout** — or `set -o pipefail` before piping one. A lesson that names the wrong cause is worse than none,
because it feels learned (docs/MANNY.md #98).

## Run 7l — the critic corrects himself, and I had repeated his error as fact

Manny returned no BLOCK on 7j and the most valuable item on his page was a retraction of his own #94, which I had
already shipped and written into this file as established.

**The two tests are ANDed, so swapping which quantity each uses did not change the region at all.**

```
before:  box (hub, alongRing + sideRoom)  ∧  cylinder (ctr, along + sideRoom)
after:   box (ctr, along + sideRoom)      ∧  cylinder (hub, alongRing + sideRoom)
```

Axially, ring-interval ∩ group-interval = the ring either way; radially, the square of half-width `sweep + clearance`
∩ the circle of that radius = the circle either way. **The conjunction is identical** — which is why the hatchback
stayed at 6, and that count was not weak evidence, it was the arithmetic. So the sentence *"a part the cylinder would
have caught was never tested"*, his and then mine, is **false**: anything the old box rejected was outside the
conjunction and the cylinder would have rejected it too. His own diagnosis of the mistake: *ask whether a thing is a
filter or a term before asking which direction it errs.* Mine is worse than his, because I took a claim about
behaviour from a report and put it in the ledger without deriving it.

**What the commit actually bought, which is real.** Before, the box set the *axial* extent and the cylinder the
*radial* one — **both load-bearing in different directions** — so anyone deleting the box as "just a prefilter" would
have silently widened the region to the group's whole length. Now the cylinder is the region and the box is a genuinely
removable fast-reject. Worth the commit, for a different reason than the finding gave.

**And his remaining hole, closed by construction.** `along` is measured over nodes filtered with `ownLink`; `ring` is
filtered **without** it, so a mover carrying a rubber ring on another link can reach past the group and the box stops
containing the cylinder. The containment was an argument in a comment. It is now arithmetic: the box's axial
half-length is `max(along, |hub − ctr| + alongRing)`, so it holds whatever the two filters disagree about — the
project's own rule, *coincidence by construction, not by checking*.

### Standing questions of his I have not answered, recorded so they are not re-derived

- **Does `camera` match `TURNS` on its own name?** No — the census printed `n.p.name` and the names carry the kit's
  prefix, so they are `4-rotor drone camera` and the **product name is inside every part name**. His one-line
  candidate follows from that and is untested: match a part's name with its root's name stripped from it first, which
  would kill the whole drone class with no declarations at all.
- **Why does `turning()` guess when `parts/mechanism.ts` owns "how many jointed parts can still move, and which
  ways", and `critic.ts` never calls it?** Same shape as `joint` was, and `JOURNALLED` is the proof that reading the
  model beats improving the list.
- **`rotates?: false` can only ever say no.** A rotor cannot declare itself one, so the name list can be patched
  around but never retired. If the intent is "declaration first, name last", the field has to be able to say yes,
  or "last" means "always".
- **The drone's silence is a load-bearing coincidence.** Twenty matches are suppressed only because the root matches
  too and `movers` keeps the outermost. A rename, or a change to that rule, turns them into twenty findings at once —
  and the same suppression means the drone's *real* rotors are not being checked either.
- **`rotates: false` has one declaration in the tree** and the test that holds it uses a `Part` literal. Deleting the
  real one would fail only the hatchback's `toBe(6)`, and not say why.

## Run 7m — the edges I proposed would have caught almost nothing, measured

The user's diagnosis: *the reason things get missed, or take too long, is a lack of edges that make a class of mistake
impossible — only habits — and too few tools that make the work precise.* The diagnosis is right. **The four edges I
proposed in answer to it were mostly wrong, and Manny broke three of them with claims I verified rather than adopted.**

| My candidate | Verdict | Checked |
|---|---|---|
| a hook rejecting `npm run gate\|tidy` piped into anything | **forbids a syntax, not the cause** — `npm run tidy > /tmp/x; tail -3 /tmp/x` has no pipe, keeps `$?`, and fails the same way if nobody reads it | by inspection |
| every optional field on `Part` must have a read site outside its own file | **defeated by its own motivating example**: `if (p.rotates === false \|\| p.rotates?.within)` in `critic.ts` *is* a read of `.within` outside `kits.ts`. The rule passes it, and it had a passing test | `git show 316ea63` |
| a claim about code in the ledger must carry a `file.ts:line` | **institutionalises a citation that rots.** Three cited lines, all written this week, all already wrong — and a line-number rule marks all three compliant | all three read at head |
| a `why` door (not built, so not named as a script) — findings grouped by check and attributed to source | **survives.** It claims nothing, so there is nothing in it to be wrong | — |

The three rotted citations, read at `97d3e66`:

```
cited  critic.ts:246   as the `through` skip        → today: "// ---- held up: the embodiment's load path …"
cited  critic.ts:182   as the exact cylinder test   → today: the BOX test (env.intersectsBox … sat)
cited  view/look.ts:100 as the line that binned it  → today: a comment header
```

The second is the sharpest: it now points at *the other clause of the `&&`* — the precise confusion Run 7l existed to
correct. A citation that decays into pointing at the opposite thing is worse than none.

### The count that decides the direction

Of the nine faults in this session's log, **what found each**:

```
rules    2   critic.ts over its line ratchet (4 crossings, 4 catches) · the gate catching the `tail -3` consequence
looking  7   Manny running the tool I described wrongly · me re-running with the right kit · Manny reading the `fixed`
             flag · Manny reading the test a park could pass · Manny finding the unread field · Manny deriving the
             algebra I had adopted · the blind judge naming two faults in one picture
```

**Rules caught two. Looking caught seven, and five of those were Manny or the blind judge.** So the shortest path is
not a fifth lint. It is that **every judge already in the tree prints its verdict where a person sees it without
asking** — which is the wire this week kept finding missing: the critic's verdict at `look.ts`, `contracts` on
`lookReady`, the `Looked` census. Three built, by hand, one at a time.

### The one edge on the table that makes a mistake impossible, and it was not mine

**Every check prints its verdict as its last line** — `TIDY: PASS`, `TIDY: FAIL (1 rule: critic.ts 864 > 860)`. Then
`tail -3` is *correct*, `tail -1` is correct, a log read a week later is correct, and a future tool that truncates is
correct. It removes the cause instead of banning one spelling of it, and it survives `tee`, scripts and re-quoting.
Not built this round; it is the next one.

### And the fifth edge, which is a habit with teeth rather than a lint

Run 7h wrote its predicted numbers before the change: `59 → 49`, `16 → 6`, and got both. **The valuable part was that
the attribution was wrong** — the prediction blamed the spindles for 10 of 16; they were 2. Unexamined, "most of this
comes from the spindles" becomes a false sentence in this file that the next round builds on. So: a round that changes
behaviour records predicted-against-measured **including what did not match**, and every fault fixed carries one line —
*the guard that now makes this impossible: `<name>`*, or *none, because `<reason>`*. Eight of nine had no guard. That
turns the eight into a list with a count that can only fall, and makes "fixed without a guard" a visible choice.

### And the best evidence in the whole argument arrived while writing this entry

The first draft of the table above named the surviving candidate as a runnable script. `npm run tidy` refused the commit:

```
every npm script the prose names is in package.json
the prose names `npm run <a script>`, which package.json does not have
```

**One of the two claim-checking rules that already exist caught me naming an unbuilt tool as though it were real, in
the paragraph arguing that such rules are what is missing, within a minute of writing it.** Nothing else in the loop
would have caught it: it would have shipped, and a later reader — or a later me — would have run it and
found nothing. That is what the user's "edges that don't allow failure" means, working, and it is the strongest
argument for extending that one family rather than inventing new ones: it does not depend on anybody remembering.

## Run 7n — the verdict line: the one edge that removes the mistake instead of forbidding it

Built. `tools/verdict.mjs` runs a check and prints, as its **last line**, `TIDY: PASS — 2.1s` or
`TIDY: FAIL (exit 1) — 2.3s`, taken from the **exit status and nothing else** — never parsed out of the child's own
output, which would be the same fault one level up. The status is passed through unchanged, so `&&`, `set -e` and CI
behave exactly as before. `test`, `tidy`, `gate` and `quick` go through it; each keeps a `:run` twin with the real
command.

**Demonstrated on the exact command that lied.** With the line ratchet deliberately broken:

```
$ npm run tidy 2>&1 | tail -3
   Duration  1.58s …
TIDY: FAIL (exit 1) — 2.3s        ← the lie is now the truth

$ npm run tidy 2>&1 | tail -3 >/dev/null ; echo $?     → 0      (the pipe still eats the status)
$ npm run tidy >/dev/null 2>&1    ; echo $?            → 1      (unpiped, unchanged)
```

The pipe still swallows `$?` — that cannot be fixed from inside a program. What changed is that **the status is no
longer the only place the answer lives**, so reading the output is now sufficient however it is truncated. `tail -1`
is correct, `tail -100` is correct, a log read next week is correct, and a future tool that truncates is correct. It
survives `tee`, a shell function, a script, and being re-quoted by someone who never reads the file.

Why this and not the hook that bans the pipe: **a ban addresses a spelling.** `npm run tidy > /tmp/x; tail -3 /tmp/x`
has no pipe, keeps `$?`, and ends in the same false conclusion if nobody reads it. This removes the condition under
which the mistake is possible, which is what "an edge that does not allow failure" has to mean.

**And it is held by a ratchet, not by memory.** `tidy` now asserts that each of the four checks matches
`^node tools/verdict.mjs [A-Z]+ ` and has its `:run` twin. Proved by unwrapping `tidy` and watching the rule name it:

```
`npm run tidy` does not go through tools/verdict.mjs, so its output can be truncated into a lie:
expected 'vitest run tests/nexus/tidy.test.ts' to match /^node tools\/verdict\.mjs [A-Z]+ /
```

So the next check added without a verdict fails by name, which is the difference between this and a resolution.

Gate: `GATE: PASS — 182.9s`, 180 files, 2116 tests.

## Run 7o — the verdict line was half finished, and the half missing was a pass that could not fail

Manny ran one command against the thing I had just shipped as "the edge that removes the mistake":

```
vitest run tests/nexus/tidy.test.ts -t "zzzz_no_such_test_name"
   Test Files  1 skipped (1)
        Tests  16 skipped (16)                exit 0   →   TIDY: PASS — 0.2s
```

**Sixteen skipped, nothing run, exit 0, and a pass with my name on it.** Same family as #39, #49 and #82: a verdict
taken from the exit status alone cannot fail when the child does nothing. Verified before adopting.

His distinction is the one I had missed and it is the whole fix: **what must never come from the child's own words is
the VERDICT. A count is not a verdict, it is evidence** — and evidence may come from a structured artefact written to
a path the wrapper chooses. So `verdict.mjs` now passes `--reporter=json --outputFile=<f>`, deletes `<f>` first so a
stale count cannot be read as this run's, and says `PASS (2123 of 2123 ran)`. A test run that wrote no count is a
FAIL, not a pass. `tsc` is asked for no count because it has no test to count, and the line says so —
`TYPECHECK: PASS (no work counted)` — an honest hedge instead of a bare PASS.

**And my first attempt at the count was the same fault again.** I read `numTotalTests`, which counts **skipped** tests,
so the fix printed `PASS (0 of 16 ran)` on the exact run it was written to catch. What skipping cannot fake is a test
that *passed*. Measured both ways afterwards:

```
all skipped →  FAIL (exit 0 but nothing ran: 0 of 16 tests passed, the rest skipped)   exit 1
a real run  →  PASS (16 of 16 ran)                                                     exit 0
```

### The name list I had written straight back in

The rule holding the verdict listed four script names — *which is the fault two rounds were spent taking out of
`turning()`*. A fifth check under a new name passed it. It is now a property of the command: **a script is a check if
it runs a verifier** (`vitest run`, `tsc --noEmit`). It caught `typecheck` on its first run — a fifth check I had
missed while hand-listing four — and it leaves `test:watch` alone, which is `vitest` without `run`, a watcher rather
than a check, something a name list gets right only by luck.

### The bypass I built and then mandated

`gate:run` held the real command, had no verdict, sat one keystroke from `npm run gate` under tab completion, **and the
ratchet required it to exist**. The twins existed only because the commands are chains and a nested `npm run` of the twin
was how to get a chain into one argv. `verdict.mjs` now takes several commands separated by `--`, runs them in order
and stops at the first failure — no shell, no twin, and the clause of the lint that mandated the bypass is gone with
it.

### And nothing checked the thing every check now speaks through

`tests/nexus/verdict.test.ts`, six cases: PASS, FAIL **with the child's own status passed through** (so `&&` and
`set -e` still work), a killed child, a command that is not there, a chain stopping at the first failure, and the
zero-run case in both directions. Each is silent when broken, because every one only shows up on a day when something
else is already going wrong.

**One residual, written down because the convention has to live where a reader meets it:** `tail` is safe now, `head`
is not. A log cut from the top, a killed run or a crashed wrapper prints **no verdict line at all** — and *no verdict
line is not a pass, it is no answer*. That sentence is in `tools/verdict.mjs`'s own header.

Gate: `GATE: PASS (2123 of 2123 ran) — 182.3s`, 181 files.

## Run 7q — the tool I had written five times by hand

The user, cutting through two rounds of mine: *"fuck the car ... that's not the point forget the car fix your tools."*
Right, and the measurement was already on the page: **of nine faults this session, looking caught seven and rules
caught two** — and the thing looking cost was that every look had to be rebuilt first.

**Five throwaway `zz_probe_*` tests in one session, each deleted before committing, each asking the same question of a
different thing:** findings grouped by check; which mover owns each; which obstacle each names; the ratio between what
a part declares and what it draws; whether the instrument is clean where the truth is published. Between them they
found that 92 % of a car's findings were two checks, that eight of sixteen came from one cast housing, that three
hypotheses about the cause were wrong, and that thirty-eight `declared` findings fall on **exactly three ratios —
1.26 ×20, 0.6 ×14, 1.2 ×4**, which is a sizing bug rather than twelve broken parts.

Every one of those was one pass over `perfect()`'s own output. Having to rebuild the pass each time is *why three
hypotheses got formed before the first measurement*: reasoning was cheap and looking was expensive. That is the whole
of what `npm run why` changes.

```
why: "a small hatchback"   kit=car  seed=1  →  hatchback
49 still wrong, 40 put right, 2 rounds

declared  —  38 of 49 (78%)
  12 parts: hub ×8, wheel stud 1 ×4, wheel stud 2 ×4, …
  drawn / declared = 1.2600  ×20   e.g. wheel stud 1: ⌀12 → ⌀15.12
  drawn / declared = 0.6000  ×14   e.g. hub: ⌀24 → ⌀14.4
  drawn / declared = 1.2000  ×4    e.g. hub: ⌀12 → ⌀14.4
…
10 of the critic's 12 checks looked at this; these looked at NOTHING: room to slide, through
```

**A repeated ratio is one bug; a spread of them is many.** That line is the door's reason for existing: it turns
thirty-eight findings on twelve parts into three constants, and three constants into one question instead of twelve.

### And the fault reproduced itself inside the tool built to stop it

The first run printed `kit=part → end cap for 2020 profile` and `0 still wrong`, because I had given it the same
guess-a-kit fallback `look.mjs` has — the default that twice turned a measurement of the critic into "the critic is
silent". **So it no longer guesses:** no kit named in the words, no answer, and it prints what it would take instead.
Three instances of one fault, the third inside its own fix, is the clearest case this log has for why a convenience
default is a liability in an instrument.

Gate: `GATE: PASS (2123 of 2123 ran) — 174.9s`.

**Still unbuilt, and still the thing my own count points at:** every judge printing its verdict where a person meets
it without asking. Three of those wires exist (the critic under the picture, `contracts`, the census) and each was
built by hand after the fault it would have caught.

## Run 7r — the judges that had no caller, and the solver that had no caller

Four things were built, and all four were wires to work that already existed and never reached a person.

**1. Three judges on the look page spoke under every picture for the first time.** `view/look.ts` has exposed
`held()`, `frame()` and `clash()` on `window.look` for four rounds, and no tool printed one **unasked**.

> **Correction, written the same day (docs/MANNY.md #105).** This round first claimed they had *zero callers in
> `tools/`*, and that was false: `tools/bench.mjs` has had `held:` and `frame:` subcommands since the commits that
> added the judges, and called `clash` before that. The measurement behind the claim grepped two of the eight tools
> and I wrote "zero" from two — the word-for-a-use fault, in my own evidence, in the round whose subject was tools
> that lie. The true statement is the narrower one above, and it is still worth the round: a verdict behind a
> subcommand is a verdict you must already suspect you need. `tools/look.mjs` now prints all
three under every picture, and the first run on a hatchback said:

```
$ node tools/look.mjs dist-view-dev <out> "hatch|kit=car&words=a%20small%20hatchback&view=three"
held: 13 groups held by nothing, 0 joints with something rigid laid across, 8 links that rub
  worst float: 195 parts, 36.4 kg — 21 in steel rim, tyre 275/35R21, wheel disc
frame: its sheet is 9 pieces joined by structure alone, the largest 35 parts / 32.4 kg
clashes: 1177 touching pairs, 16 where one passes into another — worst: tunnel top into battery by 54.0 mm
```

None of that was being reported anywhere. A 54 mm interpenetration had been in every render for rounds.

**2. A rule so the next one cannot happen quietly.** `tidy.test.ts` now reads the page's API and requires every
member to be printed by `tools/look.mjs` — the door that speaks under every picture without being asked — or to
carry its reason on its own comment line. (As first written it asked only that *some* tool name the member, which
`bench.mjs` already did, so the rule passed on the very case that motivated it; corrected with #105, along with
seven member spellings it could not see and a `prev()` off-by-one that let one member's excuse cover its neighbour.) It is a condition on the API's members,
not on three names, so a new member is caught by *being new* — and it is two-way: an excuse fails once a tool reads
that member. It found two more on its first run (`project`, `unproject`), and both halves were mutation-tested:
adding a `probe:` member failed it, and making a tool mention an excused member failed the other half.

**3. `mobility()` was called only by its own unit test.** A rank-based degrees-of-freedom solver — joints written by
what they leave free, redundant constraints reported, Grübler's formula deliberately not used — sat in
`parts/mechanism.ts` for the whole session with **no caller in the make pipeline at all**. So no made thing had ever
been asked how many ways it could move.

**4. `npm run moves`** — the motion graph, from what parts already declare. The edges are the ones a mechanism has:
`CONNECTED_TO` (joins), `MOVES_WITHIN` (what passes through what), `CONSTRAINED_BY` (its joint and what that leaves
free), `RANGE_OF_MOTION` (travel), `REQUIRES_CLEARANCE` (the envelope that sweep needs), `TRANSFERS_FORCE_TO` (a
provided interface met by a required one). Each from a declaration, never from a name.

### Three faults in the new tool, found by running it

- **`⌀NaN swept`** on every arm, bush and ball joint: I had written `{ cyl: { r, h } }` and `{ sph: { r } }`, and the
  real shapes are `{ cyl: [r, h, r2?] }` and `{ sphere: n }`. An unknown shape now returns `null` and is *said* to be
  unknown, because a zero half-size is a part that needs no room, which is a lie.
- **"turns about its own axis"** printed for coil springs and damper rods, because the draft asked whether a part had
  a joint rather than whether that joint leaves a *turn*. A `slide` and a `spring` leave it prismatic.
- **Every wheel on every car reported as moving with nothing saying how** — an artefact of where the declaration
  lives: travel is on the wheel and the bearing is on the hub beside it, both of one rigid link. The question is
  whether anything *in its link* says what holds it.

### The one that matters: a DOF number over axes I had made up

The first wire into `mobility()` guessed each joint's axis — `/slide|rod|damper/` in the name meant up, anything else
sideways — and printed **"43 degrees of freedom"** for a hatchback. That is the exact fault two rounds of this session
were spent removing from `turning()`, rebuilt inside the tool meant to replace guessing with measurement, and it
produces something worse than no answer: a confident wrong number with no way to tell it from a right one.

So the axis is now **derived or refused**. A declared slide direction is the axis; a solid of revolution has exactly
one axis by construction (`lathe`, `cyl`, `cone`, `torus`, `capsule` are all spun about y in `kits.ts`'s own words,
and a `prism` is drawn along z), carried round by the part's own `rot`. Anything else is **left out of the mechanism
and counted**, and what was left out is printed before what was computed:

```
$ npm run moves -- --kit car "a small hatchback"      (this run's numbers; Run 7t and 7u changed them)
its mechanism: 18 rigid bodies (its own frame the ground), 23 joints it could use of 38 declared
  15 left out, so the count below is of what is left:
    stub spindle left: nothing says which way its bearing acts: no slide direction declared and its shape has no axis
    rack bush left: both ends are the same link (the frame), so it joins nothing
```

Reading only `cyl` and `cone` had dropped every bearing, race and spindle in the car — a bearing is *lathed* — which
is why the honest first count was 61 and meaningless. With the declarations read properly it is 23 of 38, and the 15
left out are **two named data gaps, not tool bugs**: a part whose shape cannot say which way its joint acts, and a
part whose `joins` names nothing across the joint. Both were silently un-fixable before the number existed.

`tests/nexus/moves.test.ts` ratchets that coverage both ways — 38 declared pinned exactly, 23 usable a floor, 15
dropped a ceiling — so coverage cannot fall without the gate saying so, and `npm run why` now prints the motion
verdict unasked beside the critic's.

**The count this round adds to Run 7m's:** of the four things built, three were wires to finished work nobody could
reach, and the fourth was a general rule. Nothing new was computed. The whole round was *delivery*.

## Run 7s — merge, reattach, or delete: what was built and could not be reached

Run 7r found `mobility()` by accident. This round built the measurement that finds the rest of them, and then acted
on its answer under the user's own rule for it: **merge, reattach, or delete**.

`node tools/unwired.mjs` walks the module graph from the real entry points — `src/nexus/cli/*.ts` and
`src/nexus/view/*.ts`, the only places execution starts — and reports what no running path arrives at. The first
honest answer:

```
2064 exported functions, consts and classes; 196 of 219 files reached from 44 doors
153 exports named by nothing but tests/ — finished work with no door
 89 exports named nowhere at all, tests included
 22 whole files not reached from any door          ← 2,750 lines, behind a green gate
```

**A passing test is indistinguishable from a working feature when the test is the only caller.** Nothing in the gate
can tell them apart, which is how a rank-based degrees-of-freedom solver sat unreachable for the whole session.

### The tool got its own answer wrong three times, and each error was a known fault of mine

It would have been very easy to publish the first number. It was wrong, and so were the next two:

1. **`makeMachine` reported unreachable.** Nothing outside `machines.ts` names it — and `VEHICLE_KITS`, in that same
   file, calls it on every car the kit route builds. "No caller outside its own file" is not "unreachable". Fixed by
   classifying *live (internal)* separately.
2. **`mobility` reported live, citing `ask/conceive.ts`.** That file has `'mobility'` as a `NeedKind` string and in
   nine comments, and calls nothing. A word-boundary regex counts string literals, type members and prose as callers.
   Fixed by counting **imports**, resolved against the module graph — exact, and the same question the graph already
   answers.
3. **`world/creatures.ts` reported unreachable.** `view/look.ts:38` has `import '../world/creatures';` — a
   side-effect import, which has no `from` clause for the walk to see, and `ask/machine.ts:684` says in plain words
   that this is how it runs.

All three were found by checking the tool's answer against a case whose answer was already known. A census earns
belief no other way, and two of the three were the exact faults — the guessed shape, the word taken for a use — that
this session has been removing from other code all day.

### Then the rule, applied

- **The root barrel `index.ts` → deleted.** A barrel re-exporting fifteen directories: a second owner for every name in
  the tree, named by nothing in `src/` and by no test. The lint caught the deletion twice (its root-file list and a
  stale path in this very document), which is the lint doing its job.
- **`ask/rules.ts` (under `src/nexus/`) → deleted** with its 3 tests. IFS, THENS, `due()` and a robot's rule list: the
  superseded first version of robot rules. `view/forge.ts:3327` makes each robot's rules a pipeline on the boards
  instead. Two owners for one concern is what `docs/OWNERS.md` exists to prevent, so the older owner went.
- **The three Nexus slices → reattached.** `npm run substrate` runs the beam on two supports, the bracket on a post
  and the bar on a free hinge, and prints each one's verdict. Eleven `substrate/` files became reachable.

```
$ npm run substrate
the beam on two supports — a load at rest on a span, its section left free
  its system: 24 symbols bound, 17 left free (b, h, q); 3 constraints: a constraint CANNOT BE DECIDED
  its choice: 5 of 16 admissible → one picked
```

The door's own first draft printed `0 bound, 0 left free` for every slice, because `Solution.bound` is a Record and
the free list is `free`, not `unbound`. **Third guessed shape of the session** — after `{ cyl: { r, h } }` and
`{ sph: { r } }` in `moves.ts`. The pattern is exact and worth naming: *writing a field name from memory instead of
reading the type produces a confident zero, and a confident zero reads as good news.*

After all of it: **119 test-only, 63 dead, 11 unreached files** — from 153 / 89 / 22.

### What is left, named rather than quietly dropped

The 11 remaining are all `substrate/`: `attempt`, `clock`, `compose`, `explore`, `hold`, `project`, `rate`, `scale`,
`study-joint`, `study-swing`, `tune` (978 lines). Three of them need Jolt, which lives in `tests/conformance/helpers`
and not in `src/`, so a door cannot start one yet. The other eight need their types read before they can be called
correctly — and after being wrong about a field name three times today, writing eight more calls from memory is the
one thing this round has earned the right not to do. They are reattach-or-delete next, each on its own merits.

## Run 7t — Manny was right four times, and the worst of it was mine

Four BLOCK findings on Run 7r, all upheld, all fixed. The round that was about tools that lie shipped four of them.

**#105 — "zero callers in `tools/`" was false.** `tools/bench.mjs` has called `look.held()` and `look.frame()` since
the commits that added them. My evidence grepped `look.mjs` and `manny-see.mjs` — two of eight tools — and I wrote
*zero*. That is the word-for-a-use fault from Run 7s's own census, committed in my own measurement, in a round whose
subject was instruments that overstate. Worse: the rule written "so the next one cannot happen quietly" asked only
that *some* tool name the member, which `bench.mjs` already did, so **it would have passed on the case that
motivated it** — proved by running the reader against `bench.mjs` alone.

Now the rule holds the property that is true and worth holding: printed by `tools/look.mjs`, the door that speaks
under every picture without being asked. It reads seven member spellings it was blind to, excludes JavaScript's
keywords by name, resolves an `Object.assign` member's excuse at its own definition, and `prev()` reads the line
above the member instead of the line above *that* — which had been letting a one-line member's trailing excuse cover
its neighbour. First run caught seven more members. `mass` and `lint` now print under every picture, and `lint`
immediately reported **9 faults on a hatchback** — eight paper-thin walls and one part hidden inside another — that
nothing in the tree had been saying.

**#108 — the degrees-of-freedom number was fabricated, and the ledger blamed the data for it.** When nothing across a
joint named a link, `mechanismOf` attached the joint to the thing's own frame. Not an edge case: **56 of 56**. Every
joint that reached `mobility()` had been grounded by that line, so the engine, the rack and the anti-roll bar were
welded to the shell — which is why an engine mount "joins nothing". Run 7r called this "two named data gaps rather
than tool bugs"; one of the two *was* the tool's default. And the lookup was narrow on top of being wrong: it
resolved the far end against movers only, so a rail — which declares no joint and is still what a carriage slides
along — could never be found. Both fixed: the far end is derived against every part's link, and an underivable end
is **dropped with its reason**, never grounded.

**The honest number is `0 of 56 joints usable`, not 23.** The 46 degrees of freedom were entirely this line's doing.

**#106 — a body no joint touches is not a degree of freedom, it is a missing joint.** 21 of the car's bodies floated,
carrying six freedoms each into a total printed as the mechanism's mobility. Both doors now name the floats *before*
any total, and with no usable joint there is no mobility at all: `npm run moves` prints `NO DOF (no usable joint)`
and `npm run why` prints no number. A kit with one declared joint and none usable had been reporting twelve.

**#107 — keyed by name, so 348 of 605 parts never entered the graph.** `damper tube` ×4 collapsed to one. Keyed by
path: 46 movers → 66, "38 declared" → its real 56. The left/right asymmetry on a symmetric car is gone.

### The pins were a floor, and a floor cannot catch a number wrong in the admissible direction

`moves.test.ts` asserted `joints >= 23` and `dropped <= 15`. Both passed while both measured a fabrication. Every
number in it is now pinned **exactly** — 56 declared, 0 usable, 21 floating, 66 movers — each to be moved by hand
with a ledger line saying why. That is the same lesson as `toBeLessThanOrEqual(6)` in Run 7h, re-learnt: a ratchet
that only resists one direction is blind to being wrong in the other.

**#104 — `npm run quick` failed on its own ordinary path**, because `vitest run --changed HEAD` exits 1 when it
selects nothing and selecting nothing is the point of `quick`. `--passWithNoTests`. An alarm that fires on the
normal path teaches its reader to ignore the alarm, and the first casualty would have been the verdict line.

Five more findings (#109–#113) are answered in writing rather than fixed: `half()` duplicating `space.ts:shapeBox()`,
three rotation faults including a ZYX/XYZ Euler mismatch that is a trap rather than a wound today, the shared-`''`
link bucket silencing `unsaid`, and one missing import that hides the `machine` kit from both new doors. Each says
why it waits — mostly that this turn re-pinned the car's numbers twice already, and changing the envelope maths in
the same pass would leave no way to tell which change moved which number.

**The count for this round: of nine findings, I had already written four of them into a ledger as facts.** The gate
was green for every one.

## Run 7u — one owner for the geometry, and the second answer deleted

Manny's four queued findings, done in the order he set. All of them were one fault wearing four faces: **this file
kept its own answer for geometry that `parts/space.ts` already owned.**

`half()` is deleted. `rot3()` is deleted. `moving()` no longer walks the tree: it walks `space.ts:layout()`, which
composes every part's world matrix under every ancestor and boxes its shape with `shapeBox`. What that removed:

- **13 of 46 movers said "its shape does not say how wide it sweeps"** about tubes, lofts, prisms and surfaces that
  `shapeBox` sizes exactly. Now **0**.
- **The Euler order is right by construction, not by my agreeing with it.** `rot3` composed Rz·Ry·Rx — three.js's
  `ZYX` — against the `XYZ` the renderer and `space.ts` use: 40° apart on a part turned about two axes. No car joint
  had two non-zero `rot` components, so it was a trap rather than a wound, and it was a trap I set.
- **Ancestors' rotations count.** The hand walk summed `at` down the tree and ignored every ancestor's `rot`, putting
  5 of 46 movers up to 199 mm from where they are drawn — and those points are the joints' `at`, which is to say the
  moment arms the solver works from.
- **A declared slide direction is carried out of its own frame.** On a composed gantry the tool had said "slides along
  [0,0,1]" for an axis that moves along x.
- **The torus disagreement is settled against me**: `space.ts` and `THREE.TorusGeometry` say z, this file said y.

Three regression cases pin the rotation work so it cannot drift back, and one of them asserts against the renderer's
own answer — `new THREE.Vector3(0,1,0).applyEuler(new THREE.Euler(...rot))` — rather than against a number I wrote
down, so the two cannot diverge silently again.

### Right boxes exposed the next wrong number immediately

With the sizes correct, a steering column reported a **397.7 mm swept diameter**. That is its *length*: a world box
holds a part's length along whichever axis it lies along, and the sweep was being read off x and z. **A turn sweeps
across its axis**, so the radius is now the larger of the two half-sizes perpendicular to the axis, taken in the
part's own frame where `shapeBox` puts them. A hub bearing reads ⌀60.3 mm, which is its size.

This is the shape of the whole round: each fix made the next fault visible, and none of them was visible while two
owners disagreed quietly.

**#112:** an undeclared link is not a link. Every part declaring none shared the name `''`, so one jointed part
anywhere in that bucket silenced the unheld-part rule for all of them. Only a declared link vouches for a part now.

**#113:** both doors import `world/creatures` and `ask/machine` for their side effect, as the two pages already did,
so the user's own composed-machine theme is reachable: `npm run moves -- --kit machine` gives 198 movers and 197
declared joints, of which — honestly, on the fixed graph — **none** is usable. Still open, and named as the more
serious half of that finding: `manny-see.mjs` still guesses a kit, which is the third instance of the default that
lies, in the tool the critic sees through.

Gate: `GATE: PASS (2138 of 2138 ran) — 190.3s`.

## Run 7v — the critic agent retired, and the one thing it did kept as a rule

The user's decision, in their words: *"kill Manny agreed but keep the critic for builds and stuff."* So the two were
separated, which they should have been from the start.

**Gone:** the agent (`.claude/agents/manny.md`), its turn-blocking `Stop` hook (`tools/manny-gate.mjs`, and the hook
entry out of `.claude/settings.json`), and the `BLOCK`/`QUEUE`/`SIGHT` contract that let a critic hold a turn open
until a *feature* was built. That last power was the clearest mistake: the user had already said he was *"supposed to
question thing and then ye"*, and a critic who can demand a build is setting the roadmap.

**Kept, untouched:** the critic that judges builds — `make/critic.ts` and `critic-skin.ts`, running in the gate and
printed under every picture — plus the judges this session made speak unasked (`held`, `frame`, `clash`, `mass`,
`lint`) and the instruments (`npm run why`, `npm run moves`, `node tools/unwired.mjs`, `tools/manny-see.mjs`).

### The measurement the decision rests on, and what had to replace him

Over his last three passes he raised 14 findings, and **four were sentences already written into this file as
established fact**, with 2,100+ tests and 18 lint rules green over every one: a degrees-of-freedom number that was
entirely an artefact of my own silent fallback and that this ledger blamed on the data; *"zero callers in `tools/`"*,
written from a grep of two of eight tools; 21 floating bodies counted as motion; 348 of 605 parts never entering the
graph.

**Nothing automated caught any of them, and nothing automated could: they were prose, and nothing in this tree read
prose.** Retiring him without replacing that would have thrown away the only thing he did that the gate cannot.

So `tidy.test.ts` gained the rule, as a fifth ratchet: **a block of figures in `ROUNDS.md` names the command that
produced it**, in the block or within six lines above it, and **every command a ledger block cites must exist** — a
script in `package.json`, a file on disk. A count still cannot be verified statically, but a pasted figure can be
made re-runnable by the next reader instead of quotable on trust.

Its first run found **15 blocks of figures in this file and 10 with no command beside them.** Three were genuinely
tool output and got their commands (the `held`/`frame`/`clash` block, the mechanism block, the substrate block); the
other eight are hand-made tables — a predicted-against-measured column, the tally of what rules caught against what
looking caught — and are listed in `UNSOURCED`, which may only shrink, with a second test that fails when a listed
line stops matching so a fixed one cannot linger. Both halves were mutation-tested: a bare block of figures fails by
line number, and a block citing a script that package.json does not have fails by name — which the older
`every npm script the prose names` rule then proved on this very entry, where the example was first written out in
full and caught as a script that does not exist. The lint reading the lint's own write-up is the shape this file keeps
asking for.

**And the last thing he raised was closed on the way out.** `manny-see.mjs` chose its kit with
`has('part') ? 'part' : 'machine'`, so words naming no kit drew with `machine` — which is how *"a small hatchback"*
was once judged on a 300 mm extrusion cube. It takes `--kit <id>` now, and without one it still draws (the tool's job
is to look, so refusing outright would leave nothing to see) but says on its own line that the kit was a **guess**
and what to pass instead. That was the third instance of the default that lies, in the one tool a round looks through.

Nothing he raised is left unanswered. `docs/MANNY.md` keeps every finding as a record, with a header saying it is no
longer a contract and that no mark in it blocks anything.

## Run 7w — the motion tool stops refusing: the far end read off the drawing

`npm run moves` was honest and useless. On declarations alone it reported **0 of 56 joints usable** for a car,
because `joins` is hand-written and not one of the 56 jointed parts names a link across its joint. A tool that can
only say "I cannot" is not superior to one that lies; it is just safer.

**The drawing knows what the data does not.** `space.ts:contacts()` finds what meets what, over the very layout
`moves.ts` already walks. Measured before building anything:

```
$ npx vitest run tests/nexus/zz_probe_contacts.test.ts     (a probe, deleted after measuring, as probes are)
605 nodes, 1324 contacts in 58 ms
jointed parts: 56   far end declared: 0   far end from TOUCHING: 53   still none: 3
```

So a bearing's far end is **the thing it meets in another link** — a derivation from the geometry, not a guess at the
data. The result:

```
$ npm run moves -- --kit car "a small hatchback"
its mechanism: 24 rigid bodies (its own frame the ground), 43 joints it could use of 56 declared
  of those, 0 had the thing across them NAMED by the part, and 43 were found by what the part is drawn TOUCHING
  46 degrees of freedom: front left wheel turns about [0, 0, 1] through [1.407, 0.334, -0.762]; front left inner
  joint turns about [0, 0, 1] …; front left drive shaft turns about [0, 0, 1] …
  3 rigid bodies are touched by no joint at all: rear right wheel, rear left wheel, front anti-roll bar
```

**0 → 43 usable joints. 21 → 3 floating bodies.** And the motions now read as a mechanism rather than a list of free
bodies: a wheel turning on its own axis, a drive shaft and its inner joint turning together.

### Two things kept it honest

**The two sources are never merged into one number.** Every line says `0 named, 53 from touching`, because a joint
whose other end the part itself declares is stronger evidence than one read off geometry, and a count that hides the
difference cannot be weighed. The ledger's own figure above is the proof: the interesting fact about this car is not
the 43, it is that **zero** of its parts say what their joints act against.

**The nearest contact, not the first.** The probe caught it before it shipped: taking the first touching part in
another link married a right-hand CV spider to the **left**-hand drive shaft, because "first" over 605 parts is an
accident of iteration order. A joint acts against what it meets *where it is*, so the contact whose middle is nearest
the part's own centre wins. That is a regression case now, along with one proving a declared far end is still
labelled `declared`, and one proving a part touching nothing in another link is still dropped with its reason.

Pins re-measured and exact: 56 declared, 43 usable, 53 from touching, 3 floating, 66 movers, 13 dropped.

**Correction, by `node tools/cite.mjs` (Run 7x), an hour after this was written:** the block above first said *19*
rigid bodies. The real number is 24. I had typed a figure into a block presented as command output, and the claim
lint accepted it because a command was named — which is exactly the hole I flagged when I built that lint, proved on
myself in the first entry written after it.

## Run 7x — the citation checked, and a cost I assumed that was not there

Two tool questions this round, and the first answer was "do nothing", which is the point of measuring.

### The cost I was about to optimise does not exist

Every door rebuilds the bundle before it runs, and I was going to cache that. Measured first:

```
$ node tools/cost.mjs        (a wall clock, so these figures differ every run)
cold build            1679 ms
rebuild, no change    1069 ms
run built door        1877 ms
```

The build is **one second** of a three-second command, and the door's own work is the larger half. I had carried
"30–60 s" in my head from nothing, and the only reason it did not become a day's work is that timing it took ninety
seconds.

> **Two corrections, by Run 7y, which built the tool this block now cites.** As first written, this block had no such
> tool: its figures were timed by hand and the citation read `node tools/cite.mjs --list`, a command that has never
> printed a millisecond. `npm run cite` caught it — the second wrong citation it found, in the entry about wrong
> citations. And the conclusion it carried, *"a cache would have saved a third of a second and added a staleness bug
> to every tool. Not built."*, was wrong: 1069 ms of a 2946 ms command is 36% of it, and the floor I believed I was
> judging against turned out, once written down, to be 10%. The saving was never the issue; the staleness was, and a
> cache keyed on the hash of its inputs cannot go stale. Run 7y built it. See that entry.

### The hole I flagged in my own lint, closed

Run 7v's claim rule makes a block of figures name its command. I said plainly at the time that it catches a *missing*
citation and not a *wrong* one. That hole was then proved on me inside the hour: Run 7w's first draft cited
`node tools/unwired.mjs` for numbers a deleted probe had produced, and the lint accepted it.

`npm run cite` re-runs them. It takes the figures out of each cited block (two digits or more, so a version or a line
number is not mistaken for a measurement), runs the command, and reports whether those figures are still in its
output. A block the ledger marks historical reads as `historic` rather than drift, because an old round's numbers are
supposed to have moved — without that it would fire on its ordinary path, which is the fault that teaches a reader to
ignore the alarm (Run 7o). It is a door, not a gate: the gate keeps the cheap half (a command is named and exists),
this is the expensive half, run when a round wants its figures trusted.

**Its first run found one.** Run 7w's own block said **19 rigid bodies**; the command says **24**. A figure typed into
a block presented as command output — in the first ledger entry written after the lint built to stop exactly that.
Corrected above, with a note at the entry saying what caught it.

```
$ npm run cite
holds    :2454  npm run substrate   (3 figures still in its output)
historic :2385  npm run moves -- --kit car "a small hatchback"
           2 of 4 figures have moved on, as the ledger says they did
holds    :2646  npm run moves -- --kit car "a small hatchback"   (7 figures still in its output)
CITE: 2 hold, 1 historical, 0 DRIFTED, 0 would not run, 3 skipped, of 6 citations
```

**The pattern worth keeping from both halves:** the lint that checks prose caught the write-up of the lint that
checks prose, and the tool that checks citations caught its own round's citation. Each rule's first real catch has
been the round that built it. That is not luck — it is that a new rule is written at the moment its author is least
able to see the fault, and the only cure is a rule that does not depend on seeing it.

## Run 7y — the citation that caught the conclusion

Run 7x ended with `npm run cite` reporting one DRIFTED, and the drifted block was its own. That is the third round
running whose new rule's first real catch was the round that wrote it, and this one caught more than a citation.

### The citation was wrong, and so was what it said

The block citing `node tools/cite.mjs --list` for three millisecond figures: that command has never printed a
millisecond. The figures were timed by hand in a shell and typed in under the nearest command that happened to be in
the paragraph. Two faults in one block — a citation nobody can re-run, and a measurement that exists nowhere but in
prose.

So the measurement became a command, `node tools/cost.mjs`, which times a door's three legs. It reads the legs out of
the door's **own npm script** rather than from a command typed into it (split on `&&`: the last leg is the door's
work, the rest is what it pays to get there), because a tool that holds a command it believes is right goes on
reporting that after the scripts change. It prints the build's share of a second run and what skipping the build could
save, against the floor it judges by.

**Writing the floor down reversed the answer.** Run 7x's conclusion was *"a cache would have saved a third of a second
and added a staleness bug to every tool. Not built."* The tool, run once: 1069 ms of a 2946 ms command is **36%**, and
the floor is 10%. A third of a second was never the question — a third *of the command* was, and I had compared the
saving against nothing and called it small. The staleness fear was the real argument and it was about a cache I had
not designed.

### A cache that cannot go stale, because its key is not a proxy

A build cache goes stale when its key stands in for the inputs: a timestamp, a marker file, a list of directories
someone must remember to extend. `tools/bundle.mjs` keys on the inputs themselves — the SHA-256 of all 403 files under
`src/`, plus the vite config, `package.json`, the lockfile, the tsconfig and the tool's own source. There is no window
in which the key matches and the output is wrong. All sixteen door scripts now go through it.

```
$ node tools/cost.mjs        (a wall clock, so these figures differ every run)
cold build            1900 ms
rebuild, no change      96 ms
run built door        2013 ms
```

A repeat door run: **2946 ms → 2108 ms**, the build from 36% of it to 5%, and the same tool now says there is nothing
left to win. Two checks hold the key honest, neither of them a memory:

- **`npm run tidy` rule 22** (new): no relative import under `src/` reaches outside `src/`. That is the single way a
  file could enter the bundle without being hashed, and it was *true when I looked* — which is exactly the standard
  this session keeps finding insufficient. Rule 23 checks that every file `doors.mjs` names beside `src/` exists, so
  a moved config cannot make the cache quietly blind to it.
- **The stamp records the bundles it emitted, by name.**

### And the name was already taken

The first draft of that cache was written to `tools/doors.mjs`, straight over a 70-line tool of that name — the map
of every door into the project, what each one opens and when it was last touched, built three rounds ago and listed
in `docs/TOOLS.md`. Nothing complained: the file was overwritten, the gate passed, and it surfaced only because
`git status` showed the file as *modified* where I expected *new*. CLAUDE.md's rule is one line long — *"Before
writing a file, check that it does not already exist"* — and it is there because this has happened before
(`vehicle.ts`, overwritten after `ls | head` hid it). I wrote a tool whose whole purpose is to know what is already
there, and did not look. Restored from git, and the cache is `tools/bundle.mjs`.

### The floor, rebuilt by the hand that had just removed it

The first version of that second check counted the bundles and asked for more than zero. Deleting `dist-nexus/moves.mjs`
left fifteen others, the count passed, and `--why` reported **"up to date"** with the door's own bundle missing. A floor
cannot catch a number wrong in the admissible direction — written down as fault #37 two rounds ago, when `joints >= 23`
passed while the real answer was 0, and rebuilt here inside the hour by the same hand, in the correctness check of a
cache whose whole defence is that it cannot be wrong. It only surfaced because I probed the four cases instead of the
one I expected to pass.

### A wall clock is not drift

`cite` would have failed this block every run: a timing never reproduces, and a check that always fails is deleted as
fast as one that never can. A block the ledger marks a **wall clock** is now held to the claim that is actually
checkable — the command still runs, and still prints as many figures as the block quotes — which catches the command
gone, renamed, or no longer timing anything, and does not pretend to catch what nothing can. The note must say so; an
unmarked timing block drifts like any other.

```
$ npm run cite
clocked  :2686  node tools/cost.mjs
           a wall clock, so its 3 figures are not expected back; the command still prints 5
```

**The fault, named:** a figure in prose is a measurement nobody can repeat, so the round that wrote it is the last
round that knows whether it is true. Three faults this round were one fault wearing different clothes — the hand-timed
citation, the floor compared against nothing, and the count that passed while the bundle was gone — and each was a
judgement held in a head rather than in something that runs. The fix is never to judge more carefully; it is to write
the threshold down, where a tool can disagree with it.

## Run 7z — gears, and the test that could tell a mesh from a picture of one

The ask: *"make a working gears system i wanna see it and i wanna be able to make thing out of gears personally i
wanna be able to place them an make stuff no mock shit or press builds"*.

### What was there

Gears were **data and never a shape**. `parts/families.ts` made a `gear-m1-z20-b8-pla` with the right pitch circle
and the right centre-distance sentence; `parts/inventory.ts` listed a spur gear; nothing anywhere drew one. The only
code that tried said so in its own comment — `ask/outputs.ts` emitted a cylinder at the root circle with `z` little
eight-sided cylinders stuck round it, labelled *"a sketch of the involute: print it from the slicer's shape"*. A gear
drawn that way cannot mesh, cannot be checked and cannot be placed next to another one, because the thing that makes
a gear a gear is the curve.

### The curve, and the test that decides

`parts/gears.ts` is the involute: the flank sampled by pressure angle from the base circle to the tip, the ISO 53 /
DIN 867 proportions, the root as a circular fillet (labelled as the approximation it is — a hobbed root is a
trochoid, and the difference lies below the base circle where no contact happens). Drawn as a `prism`, so the
existing extruder draws it and `parts/form.ts` weighs it with no new code anywhere.

The test that matters is not a ratio assertion. **Two placed gears are turned through a whole tooth in twenty-four
steps, and every tooth polygon of one is tested against every tooth polygon of the other for overlap.** A phase
formula wrong by half a tooth passes every ratio assertion ever written and fails that one. It found four things:

- **The interference condition, before I had coded it.** A 9-tooth pinion against a 60-tooth wheel really does
  overlap: the big gear's 62.00 mm tip passes the 61.12 mm limit √(rb² + (a·sin α)²) set by the pinion, so its tip
  arrives where the pinion has no involute left and digs into the root. That is why a 20° pinion wants about 18
  teeth, and `meshing()` now refuses the pair in those words. 12 × 12 is marginal and refused too — correctly: the
  limit misses by 54 µm.
- **The tooth thickness, 0.2% fat.** Every sampled point sits exactly on the involute, but the chords between them
  do not, and measured at the pitch circle the drawn tooth came out thicker than π·m/2 — a gear fatter than the real
  one, which jams a mesh in the viewer that turns freely in steel. The pitch radius is now pinned as a sample point,
  so thickness is exact where thickness is defined.
- **The ring gear was a solid disc with teeth pointing inward**, so the pinion sat inside metal. A ring is a rim with
  a toothed BORE. It drew exactly twelve overlaps at every phase, every tooth count and every addendum — and a count
  that does not move when the geometry moves is the signature of a systematic error rather than an interference.
- **The ring's flank started at the base circle instead of the root**, spanning 56.4 → 58 mm on a gear whose pitch
  circle is at 60, so it never crossed the pitch circle at all and its tooth measured 2.32 mm where the standard says
  3.14. A wrong shape reads exactly like a wrong phase until the shape is measured.

### What is proved, and what is refused

External spur pairs and the rack are proved. An internal pair is **refused**, because it still fails the overlap test
by about 0.2 mm at the pitch circle and a phase scan over a whole tooth is symmetric about the derived value — so the
timing is right and the proportions are not. The ring's own shape passes every shape test. Saying "they mesh" would
be the mock this file was written to delete, so it says what is wrong instead. A planetary waits on that.

### Placing them

`view/gear-bench.ts` is a plate of shaft holes. **The hole pitch is half a module**, because every meshing centre
distance m(z₁+z₂)/2 is a whole multiple of that and almost nothing else is: a grid at any other pitch would look
usable and nothing would ever quite mesh. Pick a gear off the rail, carry it, let it go — it drops on the nearest
hole and the board says what it meshes with, or why it does not. It never nudges anything into mesh. Thirteen tests,
all headless.

One of them had to be rewritten because **I was wrong about what should happen**: a gear dropped a millimetre off
still meshes. That is the involute's whole point — the ratio survives a centre-distance error — and what changes is
the play: 2·Δa·tan α = 0.728 mm of backlash. The test now asserts that instead.

```
$ npm run gears -- 20@0,0 60@80,0 20@80,0 60@160,0 --key 60T-2,20T-3
4 gears on the board, 2 pairs in mesh, turned at 20T-1 (60 rpm, 1.00 N·m).
9.000 to 1 reduction at 60T-4: 6.7 rpm, 8.64 N·m, turning the same way as the driver.
20T-1 × 60T-2: 80.0 mm centres (cut for 80.0), 1.67 teeth in contact, 0.000 mm backlash.
```

```
$ npm run gears -- 20@0,0 40@55,0
20T-1 and 40T-2 do not mesh — at 55.00 mm centres the tip of one stands 4.50 mm inside the root of the other:
they are cut for 60.00 mm and would jam
```

### Three more faults, each found by a check rather than by reading

- **The 9:1 the designer produced was refused by its own clash check**, because I had put every stage in one plane
  and two 54-tooth wheels one centre distance apart are inside each other. A compound gearbox is **layered**: each
  stage runs in its own plane up the shafts. A `layer` on a placed gear now says which, and only gears in one layer
  can mesh.
- **The look page drew a pine tree for `kit=gears`.** `KITS.find(...) ?? KITS[0]` sent every ask for an unregistered
  kit to whatever was first in the list, and printed its trunk diameter with a straight face. A picture of the wrong
  thing is worse than no picture, because the numbers under it are real and belong to something else. It now refuses
  and names the kits it has.
- **The plate was sized from the gear centres and not their tips**, so a 54-tooth wheel hung 56 mm over an edge drawn
  30 mm from its shaft: a gearbox resting on a stamp.

### The room would not take it, and that was right

Wiring the bench into `view/forge.ts` pushed that file past the size its own ratchet allows. The rule is never to
raise the number, and the ratchet's own note said where to go: *"the benches and the lighting have moved out, the
rest have not."* The rest was the mounting. Each bench now owns its working height and its vocabulary
(`SolderBench.setOut`/`greeting`, `GearBench.setOut`/`greeting`/`act`), `view/benches.ts` owns setting one out, and
the robot-at-the-bench routine went to the file that owns the robot. **`forge.ts` came out 4044 lines against the
4046 it started at** — the round added a whole bench and left the room file smaller, and the ceiling is lowered to
hold it.

**The fault, named:** a mesh and a picture of a mesh differ only in a test that can tell them apart. Every real fault
this round came from a check that compared the thing against itself — a ratio against a ratio, a phase against the
formula that produced it — and every one of them was caught the moment something compared the geometry against other
geometry. Four of my own numbers were wrong on the way (1.64, then 1.5574, then 1.55666 for one contact ratio, and a
148 g gear I had bounded at 80 g), all of them from arithmetic I was sure of.

GATE: PASS (2183 of 2183) — 181.0s · TIDY: PASS (23 of 23) · 37 new tests

## Run 8a — the internal gear was one sign, and then a planetary

Run 7z refused internal pairs. Its reasoning was right as far as it went: the overlap was about 0.2 mm at the pitch
circle, and a phase scan over a whole tooth was **symmetric** about the derived phase, so the timing was right and
the proportions were not. It did not find which proportion, and said so.

### Chasing the wrong condition first

The overlap sat on the ring's tip circle, which pointed at the classical internal interference condition: the
ring's tooth tip, brought onto the line of centres, lands at pinion radius ra_ring − a, and below the pinion's base
circle there is no involute for it to roll on. Rearranged that is a tooth count:

```
  ra_ring − a ≥ rb_pinion   ⇒   z_pinion ≥ 2·ha / (1 − cos α)   =   33.16 at 20° full depth
```

A good condition, and real — but **it did not predict the measurement**. Overlap came out 0.72 mm at 20 teeth and
0.73 mm at 50, where the rule says one interferes and the other does not; and it tracked the ring's **addendum**
(1·m → 0.72, 0.6·m → 0.42, 0.5·m → 0.34), which no tooth-count rule explains. A number that does not move when the
thing it is supposed to depend on moves is measuring something else.

### What it actually was

One sign. For two external gears the line of action is the tangent to both base circles that **crosses** between
them, and both flanks are convex. For an internal pair the line of action is the tangent that touches both circles
on the **same side**, because one is inside the other — the ring's flank is concave where the pinion's is convex,
and the involute runs the other way round the tooth:

```ts
g.kind === 'ring' ? g.half - inv(g.alpha) + inv(a) : g.half + inv(g.alpha) - inv(a)
```

With it the overlap test reads **0.0000 mm** at every tooth count and every addendum tried. The ring's tooth
thickness at its pitch circle was π·m/2 before and after — which is why it took a test that compares one gear's
geometry against another's, rather than either against its own definition.

The tooth-count condition is kept as a **note** rather than a refusal: the drawn pair clears (the fillet is cut back
from the involute) but the conjugate action is lost at that tip, and a shaper-cut pair of those proportions would
foul. It names the fix — 34 teeth, a stub addendum, or a profile shift.

### A planetary, which is what an internal gear is for

`planetary()` takes a sun and a planet count and derives everything else: z_ring = z_sun + 2·z_planet, the carrier
radius, and the three Willis ratios. It refuses two things that cannot be rounded away — the planets must divide
`(z_sun + z_ring)` exactly or the last one will not drop in, and their tips must clear each other.

The assembly condition is tested the way a fitter tests it, not as the formula it is usually quoted as: **work out
each planet's angle from its mesh with the sun, then ask the ring what angle it would have to stand at for that
planet.** All n answers must be the same ring. For 24 : 16 : 56 with four planets they agree to 1e-9; for
25 : 16 : 57 they disagree by half a tooth, which is exactly why it will not go together.

```
$ npm run gears -- --planetary 5
A planetary set: 18 sun, 3 × 27 planets, 72 ring, module 2 mm.
  ring held      sun in, carrier out   5.0000 to 1, the same way round
  carrier held   sun in, ring out      4.0000 to 1, REVERSING
  sun held       ring in, carrier out  1.2500 to 1, the same way round
```

### Two more, both found by looking

- **The sun and the ring were reported as a refused pair**, at 0.00 mm centres, in the middle of a set where every
  real mesh had just been found. Two gears on one axis are concentric, not a pair.
- **The first drawing was titled "gear train, 4.000 to 1, reversing" over a 5 to 1 gearbox.** The name came from
  the fixed-axis solver walking sun → planet → ring with every axis held still — which is one of the three things a
  planetary does (the carrier held) and not the one anybody means. A true number answering a question nobody asked.

### And the file was one line from a wall

`parts/gears.ts` finished at **699 lines of the 700** the size lint allows — passing, and leaving the next round no
room at all. The kit that reads an ask and lays out the answer is a different concern from the involute, so it is
`parts/gear-kit.ts` now: 604 and 101 lines, and the next round has somewhere to put things.

GATE: PASS (2191 of 2191) — 191.4s · TIDY: PASS (23 of 23) · 8 new tests

## Run 8d — one shaft line, and the island the tool found

The ask: *"are all systems merged together... can user create or spawn a motor that's completely unrelated to gears
and make them work together to produce a emergent behavior... it saves compute and it saves multiple headaches in
exchange for 1 headache"*.

**The honest answer was no, and the measurement is what said so.** Three files each knew their own half of a drive:

| | knew | and took as a made-up number |
| --- | --- | --- |
| `parts/gears.ts` | the real involute, what meshes, what a train does | `train(…, torque = 1, rpm = 60)` — **default arguments** |
| `engineering/dcmotor.ts` + `motorrun.ts` | Kt, Ke, R, rotor inertia, winding heat | `runMotor(…, { load })` — a **constant**, and a gearbox as a catalogue ratio scalar |
| `parts/mate.ts` + `mechanism.ts` | shafts, bores, what seats in what | `JointKind` has had `'gear'` in it the whole time and nothing ever produced one |

So a motor could not be loaded by a real train and a real train could not be driven by a motor. Both halves ran on
numbers somebody typed.

**The one headache: a shaft.** `parts/drive.ts` says everything that spins sits on one, named, and three roles meet
there — a `Source` (torque at a speed), a `Gearing` (ratio, efficiency, inertia), a `Load` (torque it demands).
Deliberately not about gears: a test drives a fan with a hand crank, and nothing in the file knows what a motor is.

What is emergent, and the reason it is not plumbing: nothing computes the answer. The settling speed is where the
motor's torque curve crosses the load referred back through the geometry someone placed by hand; the spin-up time
is the gears' own inertia, taken from the same sections the viewer draws and the printer gets.

**Four faults, each found by looking rather than by a test passing:**

1. **The reciprocal.** `turn[].ratio` in gears.ts is the TORQUE multiplication — its own comment says so and its rpm
   divides by it. Read as a speed ratio, a 20T→60T pair came out a "3:1 overdrive" and the 60T wheel's inertia was
   multiplied by nine where it should have divided. Every number looked plausible alone; the drive simply took 70
   times too long to spin up.
2. **A second owner of 0.98.** gears.ts applies a mesh loss in its own walk and drive.ts had written its own. Moved
   to `MESH_EFFICIENCY` in gears.ts, beside the teeth, and imported.
3. **A fixed time step.** `spin` stepped `seconds/steps`. A hand crank on a fan, time constant a fifth of a
   millisecond, overshot to 2000 rad/s on the first 25 ms step and sat at zero for ten seconds reporting that the
   drive never span up. The sample grid is what the caller wants to SEE; the step is what the rig's own stiffness
   allows. `motorrun.ts` already knew this and paced itself by the motor's time constant.
4. **A reduction is not free** — an assertion written the wrong way round until the numbers disagreed. A deeper
   reduction refers the LOAD's inertia down by the square of the ratio, but the gears it needs are bigger and
   inertia goes as the fourth power of radius: a 90T wheel through 5:1 is harder to accelerate than a whole 30/40
   pair through 1.33:1. Which wins is a question only the real geometry answers.

**`node tools/wired.mjs`** was built because the ask had been answered by opinion three times. On its first run,
`islands` named 28 modules nothing under `src/` imports — among them **`engineering/gears.ts`**, holding the Lewis
bending equation and a mesh loss derived from the real tooth counts, both of which drive.ts was doing without. Not
a duplicate to delete: the strength half of the one owner, unreached. Wired in, 28 → 27, and a drive now reports
whether each tooth survives the stall torque that is really on it (a thin-faced pair settles at a perfectly sensible
speed and strips getting there, which no speed, current or ratio says). Its `path` command is the honest half:
`parts/gears` "reached" `engineering/dcmotor` in seven hops through `inventory` before any of this, which is not a
connection, and seeing the chain is what makes that obvious.

31 tests, written so the fault they catch is DISAGREEMENT: the output torque gears.ts works out by walking its mesh
tree is compared against the one drive.ts gets from the motor's curve and the path's efficiency — two routes to one
quantity, neither checked against the formula that produced it.

Still unjoined, named in CLAUDE.md: anything linear, more than one source on a shaft, the winding temperature
(`motorrun.ts` steps it but takes a constant load), the battery, `JointKind.gear`, and the bench in the room.

## Run 8e — the ledger of what is not modelled, and a duplicate of my own tool

Two things came out of the architecture essay: a question (*what is the smallest thing that should exist?*) and an
instruction (*the most effective path; don't be lazy, rewrite each and everything that needs rewrote*).

**What was measured first.** The essay describes a physics-native environment where gravity is a consequence rather
than a feature. That architecture **already exists here** — `lang/` (dimension, Term, Law) and 76 files of
`substrate/`, built over tasks 84–106 — and `place.ts`'s own header states the principle better than the essay:
*"rules that hold for every place, never for a kind of place… which length is a breadth and which a depth is a
consequence of the direction of the load, never a name."* It works: admitting a place generates the relations its
geometry implies, and a 100 mm steel cube comes out at 7.850 kg and 76.98 N with nobody enabling gravity — the kept
WEIGHT law's ports bound to this place's mass and the domain's gravity.

And **the layer that makes things never touches it.** `substrate/place`, `matter`, `observe`, `field`, `solid`,
`space`, `journal`: **0 importers outside `substrate/`**. `parts/` imports exactly two substrate modules, neither
of them state. Forty of 76 substrate files *are* reached — by `ask/` and the CLI doors, not by the making.

**MY OWN FAULT, FIRST.** I wrote `tools/wired.mjs` to answer "what is connected to what" and quoted it for a whole
reply. `tools/unwired.mjs` has answered that since Run 7s, documented in `docs/TOOLS.md` under a heading two screens
long. I never listed `tools/`. CLAUDE.md says, in as many words, to check that a file does not already exist; the
name-clash ratchet reads `src/` only, so nothing failed. Worse, the duplicate was the **weaker** instrument: per
file rather than per export, "imported by nothing" rather than reachable from the doors.

Merged, not discarded, because they did complement: `unwired.mjs` keeps its census and gained `path <a> <b>`, and
its walk widened from `src/nexus` to all of `src/` — the scoping that had hidden `engineering/gears.ts` from it.
`wired.mjs` is deleted. **Tidy rule 24 is the fix by cause**: every tool must be named in `docs/TOOLS.md`, so the
next duplicate cannot be written without opening the file where its twin sits. It found three undocumented tools
on its first run (`bench.mjs`, `cite.mjs`, `shot.mjs`), now written up.

A second clash followed and the ratchet caught this one: `substrate/coupling.ts` has owned the word `ledger` since
it was written (the conservation residual). Mine is `unaccounted`.

**`substrate/holes.ts` — what a world does not account for.** `Runtime.gaps()` reports evaluations that could not
finish. An absent law raises no gap: it raises nothing, runs clean and looks finished. Three findings — a **hole**
(read, nothing produces it), a **dead end** (produced, nothing reads it), an **unapplied law** (every input
bindable, nothing instances it). It needed three new accessors on `Runtime`, because what reads what was private:
every gap there is about how an evaluation went, and these say what the wiring *is*.

The dead end is the motivating case: `parts/drive.ts` works out a mesh's friction loss in watts and **drops the
number**, under a gate passing 2,225 tests. A test now builds that exact shape, watches the finding appear, wires
the watts to a temperature, and watches it go.

Its own first run on a bare steel cube, all three findings real:
- one **hole**: `block/what bears it` — a lone place in a domain with gravity has nothing holding it up, and the
  substrate knows to ask. Admitting `{kind:'held'}` closes it.
- nine **dead ends**: every place works out its section areas, second moments and section moduli and nothing reads
  them until something bends it. Not a fault to fix by deleting them — the point is that the world says which of
  its own numbers go nowhere instead of leaving it to be noticed.
- and among the unapplied laws, **Moment of inertia of a rectangular prism about its centre** — the rotational
  quantity the substrate lacks and `drive.ts` hand-codes. The instrument named the next piece of work itself.

Two tightenings came out of that run, both from reading the output rather than from a test:
- 65 unapplied → **14**. Dimension alone offered Coulomb friction with `mu ← direction of gravity x` and a radius
  as `r ← centre x`: dimensionally valid, semantically nonsense, and a census full of nonsense trains the reader to
  skim. A port must now also share a word with its address's name.
- 14 → **12**. Distinct ports must take distinct addresses: it had bound x, y and z all to one half-extent, and
  both a mass and a molar mass to the same kilogram.

What is left is honest residue and says so in the code: "specific gravity" and "the direction of gravity" share a
word and nothing else, so a lead-acid cell's voltage is still offered over a steel cube. The first two findings are
facts about the wiring; **the third is a prompt, not a verdict.**

**NOT DONE, and not to be read as done:** the drive line is not ported onto the substrate. A `Place` is a box
(`half: [Leaf,Leaf,Leaf]`, `volume = 8h₀h₁h₂`), so the essay's sphere is not representable; there are no rotational
quantities and no mesh coupling; and `parts/drive.ts` still hand-codes `power.rotary` and `inertia.disc`, which the
book already holds with sources and validity domains — the same two-owners fault one level down.
