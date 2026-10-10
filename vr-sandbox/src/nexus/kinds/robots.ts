// Robot arms by their makers' figures: the Meca500 (Mecademic), its R3 and R4 revisions, from its user manual
// (src/nexus/meca.ts holds its figures, its kinematics and its controller).

import { bare, type KindDef, type P } from './core';
import { MECA500 } from '../meca';
import { UR5E } from '../dharm';
import { billOf } from '../makermodel';
import { ENDER3 } from '../models/ender3';
import { VORON24 } from '../models/voron24';

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
    id: 'robotarm', name: 'six-axis robot arm', path: 'Mechanical/Robots/Robot arms', says: 'a six-jointed arm that puts its tool at any pose in its reach, programmed in its maker\'s commands', std: 'Mecademic\'s Meca500 user and programming manuals',
    axes: [bare('model', 'model', ['Meca500-R3', 'Meca500-R4', 'UR5e'])],
    title: (p) => (s(p, 'model') === 'UR5e' ? 'Universal Robots UR5e six-axis arm' : `Mecademic ${s(p, 'model').replace('-', ' ')} six-axis arm`),
    of: () => 'arm-casting*6 joint-drive*6 robot-flange', make: 'assemble', how: 'six anodised aluminium castings, a drive in each joint (its motor, gear and encoder), wired through its hollow joints to its base\'s connectors',
    spec: (p) => s(p, 'model') === 'UR5e' ? `repeatability ±0.03 mm (ISO 9283); payload 5 kg; reach 850 mm; ${UR5E.mass} kg arm (20.6 kg with its cable); six joints ±360°, 180 °/s; force at its flange to 3.5 N in 50 N; ISO 9409-1-50-4-M6 flange; 200 W typical (Universal Robots' UR5e fact sheet)` : `repeatability ${MECA500.repeatability} mm; payload ${MECA500.payload} kg rated; reach ${MECA500.reach} mm at its flange; ${MECA500.mass} kg; joints ${MECA500.limits.map(([a, b], i) => `J${i + 1} ${a}°…${b}°`).join(', ')}; top speeds ${MECA500.speed[s(p, 'model').endsWith('R4') ? 'R4' : 'R3'].join(', ')} °/s; ${MECA500.power}; controlled over Ethernet, port ${MECA500.ports.control} (${MECA500.src})`,
    box: (p) => (s(p, 'model') === 'UR5e' ? [960, 300, 260] : [190, 120, 450]), g: (p) => (s(p, 'model') === 'UR5e' ? UR5E.mass : MECA500.mass) * 1000, look: 'arm',
  },
  {
    id: 'robothand', look: 'box', name: 'robot hand', path: 'Mechanical/Robots/Hands', says: 'a hand of four fingers and a thumb a robot\'s wrist carries, each curled by its own drive, its grip\'s force read', std: 'Inspire Robots\' RH56DFX page',
    axes: [bare('model', 'model', ['RH56DFX', '2F-85'])], title: (p) => (s(p, 'model') === '2F-85' ? 'Robotiq 2F-85 adaptive gripper' : 'Inspire Robots RH56DFX dexterous hand'),
    of: (p) => (s(p, 'model') === '2F-85' ? 'gripper-coupling gripper-housing linear-servo pcb-bare*2 finger-link*8 finger-pad*2' : 'hand-palm hand-finger*5 linear-servo*6 pcb-bare'), make: 'assemble',
    how: (p) => (s(p, 'model') === '2F-85' ? 'one drive in its housing closing two four-bar fingers together: their pads stay parallel as they close, or the fingers wrap round what they meet first' : 'six micro linear servos in its palm, each pulling a finger\'s linkage (the thumb two: its curl and its swing across the palm), its board reading each one\'s force'),
    spec: (p) => (s(p, 'model') === '2F-85' ? '85 mm stroke; 20–235 N grip; 20–150 mm/s; 5 kg payload; ±0.05 mm; 162.8 mm tall and 148.6 wide open; 850 g (its manual), 1 kg (Robotiq\'s page, with its coupling); 24 V, 2 A; ISO 9409-1-50-4-M6 coupling' : '6 degrees of freedom on 12 joints; each fingertip 10 N, the thumb 15 N, read to 0.5 N; ±0.20 mm; 540 g; 12–48 V DC; RS485 (Inspire Robots\' page)'),
    box: (p) => (s(p, 'model') === '2F-85' ? [148.6, 162.8, 75] : [190, 90, 40]), g: (p) => (s(p, 'model') === '2F-85' ? 1000 : 540),
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
