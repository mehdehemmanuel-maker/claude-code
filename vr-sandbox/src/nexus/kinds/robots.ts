// Machines by their makers' figures: 3D printers from their makers' own assemblies, EOS's M 290 metal printer and Skutt's
// KM-1027 kiln from their data sheets and listings; robot arms: the Meca500 (Mecademic), its R3 and R4 revisions, from
// its user manual (src/nexus/meca.ts holds its figures, its kinematics and its controller), the UR5e by Universal
// Robots' figures (src/nexus/dharm.ts) and the Franka Research 3 by Franka's own description and data sheet
// (src/nexus/franka.ts).

import { bare, type KindDef, type P } from './core';
import { MECA500 } from '../meca';
import { UR5E } from '../dharm';
import { FR3, FRANKA_HAND } from '../franka';
import { billOf } from '../makermodel';
import { ENDER3 } from '../models/ender3';
import { VORON24 } from '../models/voron24';

/** The FR3's box at its rest pose with its Franka Hand on (wide, high, deep, mm): its drawing's own, by Franka's figures. */
const FR3_BOX: [number, number, number] = [670, 778, 260];
/** A maker's model's bill of materials as kind words: each library part by its words and how many. */
const bill = (m = ENDER3) => Object.entries(billOf(m).words).map(([w, n]) => `{${w}}${n > 1 ? `*${n}` : ''}`).join(' ');
/** The printers drawn from their makers' own assemblies. */
export const PRINTER_MODELS = { 'Ender-3': ENDER3, 'Voron-2.4': VORON24 };

const s = (p: P, k: string) => String(p[k]);
/** The Voron 2.4r2's size, mm (wide, high, deep: its model's as drawn, over its panels, skirts, door handles, spool
 *  holder and filter housing, and its guide tube's run over them), and its mass, g: the sum of its drawn parts' masses
 *  (an estimate: VoronDesign gives none; 18.5 kg, its library parts' from their standards, the rest as boxedAs fills
 *  them). */
const VORON_BOX: [number, number, number] = [430, 573, 513], VORON_G = 18500;

export const ROBOT_KINDS: KindDef[] = [
  {
    id: 'printer3d', look: 'box', name: '3D printer', path: 'Electrical/Machines/3D printers', says: 'a machine that draws a part layer on layer from melted filament: a hot end moved over a heated bed on belts and a lead screw (or the bed lowered under a CoreXY gantry)', std: 'its maker\'s published assembly (Creality\'s Ender-3 3DXML; VoronDesign\'s Voron 2.4r2 STEP)',
    axes: [bare('model', 'model', ['Ender-3', 'Voron-2.4'])],
    title: (p) => (s(p, 'model') === 'Voron-2.4' ? 'Voron 2.4r2 3D printer, 250 mm' : 'Creality Ender-3 3D printer'), of: (p) => bill(s(p, 'model') === 'Voron-2.4' ? VORON24 : ENDER3), make: 'assemble',
    how: (p) => (s(p, 'model') === 'Voron-2.4'
      ? 'its frame a cube of 2020 T-slot extrusion, closed by panels; its toolhead (a Stealthburner, a Clockwork 2 extruder on it and a Revo hot end in it) carried on an MGN12 rail across a gantry that slides on MGN9 rails front to back, moved in X and Y together by two belts from two steppers at its back (CoreXY); the whole gantry hung on four belts from four Z steppers, one at each corner, so it is levelled to the bed by probing (quad gantry levelling); its bed fixed'
      : 'its frame of T-slot extrusion; the bed carried front to back on V-wheels by a belt from its Y stepper; the gantry raised on a T8 lead screw by its Z stepper; the hot end carried across on V-wheels by a belt from its X stepper; filament driven into it by the extruder\'s stepper through a PTFE tube'),
    spec: (p) => (s(p, 'model') === 'Voron-2.4'
      ? `250 × 250 × 250 mm print volume (Wikipedia, the 250 build); the 2.4R2 released February 2022 (Wikipedia); an enclosed CoreXY with a flying gantry levelled on four Z belts; its parts and where each sits from VoronDesign's own assembly (${VORON24.parts.length} parts, its stock options: an Octopus board, an Omron TL-Q5MC2 probe, microswitch endstops, Gates idlers, 9 mm Z belts)`
      : '220 × 220 × 250 mm print area on a 235 × 235 mm bed; 440 × 440 × 465 mm (wevolver, from Creality\'s figures); 6.7 kg (Creality\'s official UK listing); 24 V 15 A supply; its parts and where each sits from Creality\'s own assembly (311 parts)'),
    // (the Voron's size its model's, measured over its parts; its mass the sum of its parts', an estimate: VoronDesign
    // gives none)
    box: (p) => (s(p, 'model') === 'Voron-2.4' ? VORON_BOX : [440, 465, 440]), g: (p) => (s(p, 'model') === 'Voron-2.4' ? VORON_G : 6700),
  },
  {
    id: 'kiln', look: 'box', name: 'electric kiln', path: 'Electrical/Machines/Kilns', says: 'a box of insulating firebrick heated by coiled resistance wire in grooves round its walls, its controller taking it through a firing program', std: 'its sellers\' listings (Skutt\'s KM-1027)',
    axes: [bare('model', 'model', ['Skutt-KM1027'])], title: () => 'Skutt KM-1027 electric kiln',
    of: () => 'kiln-stand kiln-floor kiln-ring*3 kiln-lid kiln-element*6 kiln-controller lid-lifter peephole-plug*3 {thermocouple K sheath6 200mm}', make: 'assemble',
    how: 'three rings of firebrick, each with its two elements in grooves round its wall, stacked on a firebrick floor on a stand and closed by a firebrick lid; its controller switches its elements to follow a firing program against its thermocouple',
    spec: () => '23 × 23 in inside, 27 in deep (7.0 cu ft), ten-sided, 3 in of firebrick; to cone 10, 2350 °F (1288 °C); 240 V single-phase, 48 A, 11,520 W (on 6 AWG wire and a 60 A breaker); its KilnMaster controller: six programs of up to eight segments each, a delayed start, an alarm, the cost of a firing; a spring-loaded lid lifter; 290 lb as listed (sellers\' listings of Skutt\'s KM-1027). Hazards: its outside burns, its inside reaches 1288 °C, glazes give off fumes as they fire (it needs a vent), and it draws 48 A (wired by an electrician)',
    box: () => [780, 1000, 830], g: () => 131500,
  },
  {
    id: 'pbf', look: 'box', name: 'laser powder-bed fusion machine', path: 'Electrical/Machines/Metal printers', says: 'a metal printer: a laser melts a thin bed of metal powder where the part is, layer on layer, in a chamber of argon or nitrogen', std: 'its maker\'s data sheet (EOS\'s M 290)',
    axes: [bare('model', 'model', ['EOS-M290'])], title: () => 'EOS M 290 laser powder-bed fusion machine',
    of: () => 'pbf-frame pbf-panel*12 pbf-chamber pbf-door pbf-build-cylinder pbf-build-plate pbf-dispenser pbf-recoater {rail MGN15H 700}*2 galvo-scanner ftheta-lens fibre-laser pbf-filter pbf-electrics pbf-screen machine-foot*6', make: 'assemble',
    how: 'the chamber flooded with argon (or nitrogen); each layer the dispenser lifts fresh powder, the recoater spreads 30 µm of it over the build plate, and the scanner\'s mirrors steer the laser\'s focused spot over the part\'s slice of it, melting it into the layer below; the plate drops a layer and it repeats; the part dug out of its powder, stress-relieved and cut off its plate',
    spec: () => '250 × 250 × 325 mm build (its height with its plate); one 400 W Yb fibre laser, focused to 100 µm, scanning at up to 7.0 m/s; 30 µm layers typical (TU Darmstadt); inert gas at 7 bar, 20 m³/h; 32 A, 2.4 kW typical, 8.5 kW at most; 2500 × 1300 × 2190 mm; about 1250 kg (EOS\'s M 290 system data sheet). Hazards: a class 4 laser inside it, argon that displaces air round it, and metal powders that are breathed in or (titanium, aluminium) burn and explode as dust',
    box: () => [2500, 2190, 1300], g: () => 1250000,
  },
  {
    id: 'robotarm', name: 'robot arm', path: 'Mechanical/Robots/Robot arms', says: 'a six- or seven-jointed arm that puts its tool at any pose in its reach, programmed in its maker\'s commands', std: 'Mecademic\'s Meca500 user and programming manuals; Universal Robots\' UR5e fact sheet; Franka\'s Research 3 data sheet and robot description',
    axes: [bare('model', 'model', ['Meca500-R3', 'Meca500-R4', 'UR5e', 'FR3'])],
    title: (p) => (s(p, 'model') === 'UR5e' ? 'Universal Robots UR5e six-axis arm' : s(p, 'model') === 'FR3' ? 'Franka Research 3 seven-axis arm with its Franka Hand' : `Mecademic ${s(p, 'model').replace('-', ' ')} six-axis arm`),
    of: (p) => (s(p, 'model') === 'FR3' ? 'arm-casting*8 joint-drive*7 joint-torque-sensor*7 robot-flange {robothand Franka-Hand}' : 'arm-casting*6 joint-drive*6 robot-flange'), make: 'assemble',
    how: (p) => (s(p, 'model') === 'FR3' ? 'eight aluminium links, a drive in each joint (its motor, strain-wave gear, brake and encoder) and a torque sensor between each drive and the link it turns, so the arm feels what it touches and can be guided by hand; wired through its joints to its base, and from there to its Control; its Franka Hand bolted to its flange and plugged into its connector' : 'six anodised aluminium castings, a drive in each joint (its motor, gear and encoder), wired through its hollow joints to its base\'s connectors'),
    spec: (p) => s(p, 'model') === 'UR5e' ? `repeatability ±0.03 mm (ISO 9283); payload 5 kg; reach 850 mm; ${UR5E.mass} kg arm (20.6 kg with its cable); six joints ±360°, 180 °/s; force at its flange to 3.5 N in 50 N; ISO 9409-1-50-4-M6 flange; 200 W typical (Universal Robots' UR5e fact sheet)` : s(p, 'model') === 'FR3' ? `seven joints, a torque sensor at the link side of each; payload ${FR3.payload} kg; reach ${FR3.reach} mm; repeatability <±${FR3.repeatability} mm (ISO 9283); joints ${FR3.limits!.map(([a, b], i) => `A${i + 1} ${Math.round((a * 180) / Math.PI)}°…${Math.round((b * 180) / Math.PI)}°`).join(', ')}; torque A1–A4 ±87 N·m, A5–A7 ±12 N·m; 150 °/s (A1–A4), 301 °/s (A5–A7), up to 2 m/s at its tool; guided by hand at about 2.5 N; DIN ISO 9409-1-A50 flange; about ${FR3.mass} kg; IP40; its Control a 19 in rack box, 355 × 483 × 89 mm, about 80 W and 7 kg, its 1 kHz Franka Control Interface over Ethernet (Franka's data sheet R02212 v2.6); its Franka Hand ${FRANKA_HAND.stroke} mm stroke, ${FRANKA_HAND.force[0]} N continuous and ${FRANKA_HAND.force[1]} N at most, ${FRANKA_HAND.mass * 1000} g` : `repeatability ${MECA500.repeatability} mm; payload ${MECA500.payload} kg rated; reach ${MECA500.reach} mm at its flange; ${MECA500.mass} kg; joints ${MECA500.limits.map(([a, b], i) => `J${i + 1} ${a}°…${b}°`).join(', ')}; top speeds ${MECA500.speed[s(p, 'model').endsWith('R4') ? 'R4' : 'R3'].join(', ')} °/s; ${MECA500.power}; controlled over Ethernet, port ${MECA500.ports.control} (${MECA500.src})`,
    box: (p) => (s(p, 'model') === 'UR5e' ? [960, 300, 260] : s(p, 'model') === 'FR3' ? FR3_BOX : [190, 120, 450]), g: (p) => (s(p, 'model') === 'UR5e' ? UR5E.mass : s(p, 'model') === 'FR3' ? FR3.mass + FRANKA_HAND.mass : MECA500.mass) * 1000, look: 'arm',
  },
  {
    id: 'robothand', look: 'box', name: 'robot hand', path: 'Mechanical/Robots/Hands', says: 'a hand of four fingers and a thumb a robot\'s wrist carries, each curled by its own drive, its grip\'s force read', std: 'Inspire Robots\' RH56DFX page',
    axes: [bare('model', 'model', ['RH56DFX', '2F-85', 'Franka-Hand'])], title: (p) => (s(p, 'model') === '2F-85' ? 'Robotiq 2F-85 adaptive gripper' : s(p, 'model') === 'Franka-Hand' ? 'Franka Hand two-finger gripper' : 'Inspire Robots RH56DFX dexterous hand'),
    of: (p) => (s(p, 'model') === '2F-85' ? 'gripper-coupling gripper-housing linear-servo pcb-bare*2 finger-link*8 finger-pad*2' : s(p, 'model') === 'Franka-Hand' ? 'gripper-coupling gripper-housing linear-servo pcb-bare finger-link*2 finger-pad*2' : 'hand-palm hand-finger*5 linear-servo*6 pcb-bare'), make: 'assemble',
    how: (p) => (s(p, 'model') === 'Franka-Hand' ? 'one drive in its housing moving both fingers along their rails together, each 40 mm out and back, their rubber tips meeting in the middle; fed and commanded through the arm\'s flange connector' : s(p, 'model') === '2F-85' ? 'one drive in its housing closing two four-bar fingers together: their pads stay parallel as they close, or the fingers wrap round what they meet first' : 'six micro linear servos in its palm, each pulling a finger\'s linkage (the thumb two: its curl and its swing across the palm), its board reading each one\'s force'),
    spec: (p) => (s(p, 'model') === 'Franka-Hand' ? `${FRANKA_HAND.stroke} mm stroke (40 mm a finger); ${FRANKA_HAND.force[0]} N continuous, ${FRANKA_HAND.force[1]} N at most; ${FRANKA_HAND.speed} mm/s a finger; its fingers exchangeable; ${FRANKA_HAND.mass * 1000} g; ${FRANKA_HAND.size.join(' × ')} mm (Franka's Franka Hand page; its force and speed resellers' copies of its data sheet)` : s(p, 'model') === '2F-85' ? '85 mm stroke; 20–235 N grip; 20–150 mm/s; 5 kg payload; ±0.05 mm; 162.8 mm tall and 148.6 wide open; 850 g (its manual), 1 kg (Robotiq\'s page, with its coupling); 24 V, 2 A; ISO 9409-1-50-4-M6 coupling' : '6 degrees of freedom on 12 joints; each fingertip 10 N, the thumb 15 N, read to 0.5 N; ±0.20 mm; 540 g; 12–48 V DC; RS485 (Inspire Robots\' page)'),
    box: (p) => (s(p, 'model') === '2F-85' ? [148.6, 162.8, 75] : s(p, 'model') === 'Franka-Hand' ? [205, 127, 63] : [190, 90, 40]), g: (p) => (s(p, 'model') === '2F-85' ? 1000 : s(p, 'model') === 'Franka-Hand' ? FRANKA_HAND.mass * 1000 : 540),
  },
  {
    id: 'toolchanger', look: 'box', name: 'robot tool changer', path: 'Mechanical/Robots/Tool changers', says: 'two plates between an arm\'s flange and its tool, locked by air, so the arm puts one tool down and takes up another', std: 'ATI\'s QC-11 page',
    axes: [bare('model', 'model', ['QC-11'])], title: () => 'ATI QC-11 robotic tool changer', of: () => 'changer-master changer-tool', make: 'assemble',
    how: 'its master plate bolted to the arm\'s flange, a tool plate on each tool; a piston in the master drives hardened balls out into the tool plate\'s ring, locking it',
    spec: () => '16 kg suggested payload; 1100 N locking at 5.5 bar; 0.0102 mm repeatability; 0.245 kg coupled (0.163 master, 0.0816 tool); six M5 air passages; 52.4 mm stacked (ATI\'s page; Universal Robots\' certification)',
    box: () => [64, 52.4, 64], g: () => 245,
  },
  {
    id: 'ftsensor', look: 'box', name: 'force/torque sensor', path: 'Electrical/Sensors/Force', says: 'a sensor between a wrist and its tool that reads the force and torque on the tool, six ways', std: 'ATI\'s Nano17 page',
    axes: [bare('model', 'model', ['Nano17'])], title: () => 'ATI Nano17 force/torque sensor', of: () => 'ft-body strain-gauge-si*6', make: 'assemble',
    how: 'six silicon strain gauges bonded on its body\'s flexures, its signals out on its cable to an amplifier',
    spec: () => '±12 N across, ±17 N along, ±120 N·mm (SI-12-0.12) read to 1/320 N; 7200 Hz; 9.07 g; Ø 17 mm (ATI\'s page; its height an estimate)',
    box: () => [17, 14.5, 17], g: () => 9.07,
  },
  {
    id: 'depthcamera', look: 'box', name: 'depth camera', path: 'Electrical/Sensors/Imaging', says: 'a camera that sees how far every point is, by two infrared cameras and a pattern thrown between them', std: 'Intel\'s RealSense D435 specifications',
    axes: [bare('model', 'model', ['D435'])], title: () => 'Intel RealSense D435 depth camera', of: () => 'image-sensor*3 lens-stack*3 ir-projector pcb-bare al-6061', make: 'assemble',
    how: 'two global-shutter infrared imagers 50 mm apart and a colour one, an infrared projector between them, a vision processor turning the pair into depth, in an aluminium case',
    spec: () => '0.3–3 m, 1280 × 720 depth, 85.2° × 58°; colour 1920 × 1080; 90 × 25 × 25 mm; USB-C (Intel\'s page; its stereo baseline 50 mm and mass 72 g estimates)',
    box: () => [90, 25, 25], g: () => 72,
  },
  {
    id: 'gassensor', look: 'box', name: 'gas sensor', path: 'Electrical/Sensors/Gas', says: 'a heated metal-oxide plate whose resistance changes with the gases on it, with pressure, humidity and temperature beside it', std: 'Bosch Sensortec\'s BME688 datasheet',
    axes: [bare('model', 'model', ['BME688'])], title: () => 'Bosch BME688 gas sensor', of: () => 'si-die*2 ceramic-package', make: 'assemble',
    how: 'its MEMS pressure and humidity die and its heated gas-sensing plate in an 8-pin LGA with a metal lid',
    spec: () => 'VOCs, VSCs, CO and H₂ in parts per billion, told apart as it is trained (Bosch\'s BME AI-Studio); 300–1100 hPa, 0–100 % RH, −40–85 °C; I²C or SPI; 1.71–3.6 V; 3 × 3 × 0.93 mm (its datasheet)',
    box: () => [3, 0.93, 3], g: () => 0.02,
  },
  {
    id: 'robot', look: 'box', name: 'robot', path: 'Mechanical/Robots/Robots', says: 'a robot designed for its tasks from real parts (src/nexus/robot.ts): its arms, hands and changers, its senses, on its table', std: 'its parts\' makers\' figures',
    axes: [bare('build', 'build', ['jarvis'])], title: () => 'the robot that welds, solders and types (two UR5e arms with RH56DFX hands)', of: () => 'robot-table {robotarm UR5e}*2 {screw M8x20}*8 {toolchanger QC-11}*2 {ftsensor Nano17}*2 {robothand RH56DFX}*2 camera-module camera-bracket sensor-mast {depthcamera D435} {microphone mems} {gassensor BME688}', make: 'assemble',
    how: 'its two arms bolted to its table 500 mm apart, a force sensor, a changer and a hand on each wrist, its cameras, microphone and gas sensor on a mast between them',
    spec: () => 'welds (a 1.2 kg MIG torch through its changers), solders (its iron in a pen grip, the wire in the other hand), types (45 cN keys), sees, hears, smells, feels its grip and changes it (src/nexus/robot.ts says each, with its figures)',
    // (its table about 94 kg: a 900 × 800 × 12 mm steel top, 68 kg, on about 9 m of 50 mm square tube; its mast 1.5 kg: estimates)
    box: () => [1100, 1470, 860], g: () => 2 * (UR5E.mass * 1000 + 245 + 9 + 540) + 94000 + 1500,
  },
];
