// Boards as their makers make them: each a layout of real parts on a many-layer board, its holes drilled where its
// mechanical drawing has them. The system-on-chip a flip-chip in a ball-grid array under its heat spreader, its memory
// moulded ball-grid packages, its power and interface chips QFNs from the package library (src/nexus/packages.ts), its
// passives the library's chip resistors and capacitors, its connectors (USB-A stacks, RJ45 with its magnetics, HDMI,
// USB-C, microSD, the 40-pin header) each a part of its own, all at their places. Every part is solids, mm; what a
// board weighs is what its solids weigh, checked against its maker's weight where it gives one
// (tests/nexus/sbc.test.ts).
//
// Each part is drawn first, from its maker's drawing (src/nexus/boardparts.ts), then placed. A board whose layout has
// been measured (its maker's photos calibrated by its holes, tools/measure/photo.py; several photos where one hides a
// part) places each part where it was found, and says how; a board not yet measured places the same parts by the old
// rules of its class along its edges and is marked approximate (`approx`), so no one takes it for the real layout.
//
// Its frame: positions are given as a maker's drawing gives them, x along its length and z up its width from its
// lower-left corner, seen from above. Drawn, the board's top face is y = 0, x along its length, and the drawing's z
// runs along -z (so the board seen from above is the drawing, not its mirror); what is under it is turned over below
// y = -t.

import { chipSolids, solidMasses, type Solid } from './packages';
import { BOARD_PARTS, chip, crystalSmd, fccsp, fiducial, microUsbB, tactTop, rj45, fcbgaLid, fpcUpright, hdmi, HUE, inductor, jstSH, lpddr, micElectret, microSD, pinHeader, refBody, shieldCan, sideLeds, chipLed, tactSide, usbA, usbC, type BoardPart } from './boardparts';
import { chipCase, mlccCase } from './kinds/electrical';
import { OPI5_COPPER } from './sbc-opi5-copper';
import { OPI5_SMALL } from './sbc-opi5-small';
import { PI5_COPPER } from './sbc-pi5-copper';
import { PI5_INK } from './sbc-pi5-ink';
import { PI5_SMALL } from './sbc-pi5-small';
import { PI4_COPPER } from './sbc-pi4-copper';
import { PI4_INK } from './sbc-pi4-ink';
import { PI4_SMALL } from './sbc-pi4-small';
import { PICO_COPPER } from './sbc-pico-copper';
import { PICO_INK } from './sbc-pico-ink';
import { PICOW_COPPER } from './sbc-picow-copper';
import { PICOW_INK } from './sbc-picow-ink';

const hdmiOn = (depth: number): BoardPart => hdmi('A', depth);

/** One part of a board: its name, the inventory part it is, its own solids, its parts, where it sits and how it is turned
 *  (about y; flipped is under the board). */
export interface Comp { name: string; item?: string; solids?: Solid[]; kids?: Comp[]; at: [number, number, number]; turn?: number; under?: boolean }
type Cls = 'pi-b' | 'zero' | 'cm' | 'pico' | 'opi5' | 'rdk-x5' | 'rdk-s100';
export interface BoardDef {
  name: string; maker: 'Raspberry Pi' | 'Orange Pi' | 'D-Robotics'; cls: Cls;
  soc: string; cpu: string; ai?: string; gpu?: string; ram: number[]; ramType: string; ports: string; power: string;
  /** its board's length and width, its height over all, mm; its weight, g, where its maker (or a named source) gives it */ L: number; W: number; H: number; g?: number;
  /** mounting holes, mm from its lower-left corner, and their bore */ holes: [number, number][]; hole: number;
  /** its SoC's package side, mm; its memory packages; copper layers */ socMm: number; rams: number; layers: number;
  /** its ports along its edges: kind, position along that edge from the lower-left corner, the edge */ edge: { kind: Port; at: number; side: 'right' | 'bottom' | 'left' | 'top' }[];
  header?: 'pins' | 'holes'; src: string;
  /** what else it carries: an M.2 M-key slot (an SSD's), an E-key (a radio's), an eMMC module's socket, buttons */ extras?: ('m2' | 'm2e' | 'emmc' | 'buttons')[];
  /** its layout as measured: each part where it was found, and how (where given, the edge rules above are not used) */ layout?: Place[];
  /** its other holes, measured: x, z, bore and the pad round it, mm; a pad square where its footprint has it so (a
   *  ground pin's); a pin's castellation, a half-hole of that bore cut in the edge nearest it, its pad run out to it */
  more?: Hole[];
  /** its holes' pads, mm across (where measured) */ pad?: number;
  /** its pads' gold bright as its photos show it (an ENIG finish), not matte */ bright?: boolean;
  /** its board's thickness, mm (where its maker gives it; 1.6 otherwise, typical); its corners' radius (square where
   *  not given) */ t?: number; corner?: number;
  /** its solder mask's colour, as its photos show it; its silkscreen's words, where measured */ mask?: number; silk?: Silk[];
  /** which photos its layout was measured from */ photos?: string;
  /** its small parts as its photo shows them, found by tools/measure/photo.py small (see the table's own notes) */ small?: SmallRow[];
  /** the copper its photo shows under its mask (photo.py traces: a PNG on the board's own millimetres) and its colour
   *  there */ copper?: { res: number; w: number; h: number; png: string; hue: number };
  /** its silkscreen as its photo shows it (photo.py silk: its words, logos and outlines, a PNG on the board's own
   *  millimetres, ink white) and its ink's colour */ ink?: { res: number; w: number; h: number; png: string; ink: string | number };
}
/** A small part as a photo shows it: c capacitor, r resistor, t a small transistor package (its package last), q a small
 *  dark no-lead chip, l a moulded inductor, p an 0201 whose kind its photo does not show; its middle x, z (mm from the
 *  lower-left corner), its length and width (mm), its angle (degrees from +x). */
export type SmallRow = ['c' | 'r' | 't' | 'q' | 'l' | 'p', number, number, number, number, number, string?];
/** One part of a measured layout: which part (a library part's name in BOARD_PARTS, or one drawn here), where its
 *  footprint's middle is (x, z from the lower-left corner, mm), which way its front faces (degrees from +x toward +z:
 *  0 the right edge, 90 the far edge, 180 the left, 270 the near), whether it is under the board, and how its place was
 *  found. */
export interface Place { part: string | (() => BoardPart | Comp); at: [number, number]; dir?: number; under?: boolean; name?: string; how: string }
/** Words printed on the board: what, where (its middle), its letters' height, which way it reads (degrees). */
export interface Silk { text: string; at: [number, number]; h: number; dir?: number }
type Port = 'usbA2' | 'usbA' | 'rj45' | 'usbc' | 'microusb' | 'hdmi' | 'microhdmi' | 'minihdmi' | 'audio' | 'can';

const PI_HOLES: [number, number][] = [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]];
/** A hole through a board and the pad round it, mm from its lower-left corner. */
export interface Hole { at: [number, number]; d: number; pad: number; square?: boolean; castle?: number; why: string }
/** A Pico's pins (Pico and Pico 2; the W's the same, its debug pads elsewhere): two rows of 20 at 2.54 mm, 17.78 apart,
 *  centred on its 51 × 21 board (1.37 mm from each end, 1.61 from each side), each a 1.02 mm plated hole in a 1.7 mm
 *  pad, its ground pins' pads square (3, 8, 13, 18 down one row, 23, 28, 33, 38 up the other), pin 1 (GP0) at its USB
 *  end; its three debug pads (SWCLK, GND, SWDIO) across its far end 1.6 mm in, 2.54 apart: Raspberry Pi's own Pico
 *  footprint (RPi_Pico_SMD_TH, from its design files through HeadBoffin's RP_Silicon_KiCad). Each pin's pad runs out to a
 *  castellation, a half-hole 1.0 mm across at the edge, 0.5 deep (measured on Raspberry Pi's photo of it, 9.1 px/mm:
 *  photo.py-style column runs of its notches, pico-series/images/pico-1s.png). */
export const PICO_PIN_NAMES = ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7', 'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15',
  'GP16', 'GP17', 'GND', 'GP18', 'GP19', 'GP20', 'GP21', 'GND', 'GP22', 'RUN', 'GP26', 'GP27', 'AGND', 'GP28', 'ADC_VREF', '3V3(OUT)', '3V3_EN', 'GND', 'VSYS', 'VBUS'];
/** Where a Pico's pin n (1–40) is, mm from its lower-left corner (its USB end at x 0, pin 1's row at z 1.61). */
export const picoPinAt = (n: number): [number, number] => { const k = n <= 20 ? n - 1 : 40 - n; return [+(1.37 + k * 2.54).toFixed(2), n <= 20 ? 1.61 : 19.39]; };
const PICO_WHY = 'Raspberry Pi\'s Pico footprint (RPi_Pico_SMD_TH): 1.02 mm in a 1.7 mm pad; its castellation measured on its photo';
export const PICO_PINS: Hole[] = Array.from({ length: 40 }, (_, i): Hole => ({ at: picoPinAt(i + 1), d: 1.02, pad: 1.7, ...(/GND$/.test(PICO_PIN_NAMES[i]!) ? { square: true } : {}), castle: 1.0, why: `pin ${i + 1} (${PICO_PIN_NAMES[i]}): ${PICO_WHY}` }));
export const PICO_DEBUG: Hole[] = (['SWCLK', 'GND', 'SWDIO'] as const).map((nm, i): Hole => ({ at: [49.4, +(10.5 + (i - 1) * 2.54).toFixed(2)], d: 1.02, pad: 1.7, ...(nm === 'GND' ? { square: true } : {}), castle: 1.0, why: `debug pad ${nm}: ${PICO_WHY}` }));
/** Where a part of the Pico sits: Raspberry Pi's photo of it (its documentation's pico-series/images/pico-1s.png, the
 *  first of the four boards), calibrated by its 47 holes (four mounting holes, its 40 pins' and its 3 debug pads', each
 *  the centre of the backdrop seen through it: photo.py, 0.03 mm rms at 8.8 px/mm), its parts' outlines read off it
 *  square-on; what each part is from Raspberry Pi's schematic of it (RPI-PICO rev 3, 15 January 2021, as
 *  passionelectronique.fr keeps it), its package from its maker's datasheet or KiCad's footprint of it. */
const PHP = (what: string) => `Raspberry Pi's photo of the Pico (raspberrypi/documentation pico-1s.png, calibrated by its 47 holes, 0.03 mm rms): ${what}`;
const SCH = (what: string) => `Raspberry Pi's Pico schematic (RPI-PICO rev 3): ${what}`;
/** A chip with its pin 1 marked as its photo shows it: a laser-marked spot r across on its top, at (x, z) from its
 *  middle in its own frame (its first lead at its −x, −z corner). */
function dotted(c: Comp, x: number, z: number, r: number): Comp {
  return { ...c, kids: (c.kids ?? []).map((k): Comp => { const s = k.solids?.find((q) => q.role === 'body' && q.shape && 'box' in q.shape); if (!s || !('box' in s.shape!)) return k;
    const top = s.at[1] + s.shape.box[1] / 2; return { ...k, solids: [...k.solids!, { role: 'body', shape: { cyl: [r, 0.004] }, at: [x, top + 0.002, z], mat: s.mat, color: 0x77797c }] }; }) };
}
const PICO_LAYOUT: Place[] = [
  { part: () => microUsbB({ W: 7.4, D: 5.66, H: 2.7, latch: 2.5, src: SCH('J1, an EDAC 690-005-298-486 micro-USB B') + '; ' + PHP('its shell 7.4 wide and 5.66 deep, its latch springs 2.5 mm behind its mouth, its five tails at 0.65 mm') + '; its height 2.7 over the board from a STEP model of the Pico R3 kept on GitHub (multigamesystem/MGS-CAD-Files, its maker not named; its USB 1.44 mm past the edge, as the photo has it), EDAC\'s drawing not reached; its mouth the Micro-USB spec\'s' }), at: [1.38, 10.6], dir: 180, name: 'micro-USB (J1)', how: PHP('its shell x −1.45 to 4.21 (its mouth 1.45 mm past the edge), z 6.9 to 14.3') },
  { part: () => dotted(chip('QFN-56', 'Raspberry Pi RP2040 microcontroller (U1)', 'RP2-B0  20/21\nP64M15.00 TTT'), -2.51, -2.6, 0.3), at: [26.04, 10.51], dir: 90, name: 'RP2040 (U1)', how: PHP('its body x 22.5 to 29.58, z 6.92 to 14.1 (7 × 7 by its datasheet), its pin 1 dot at (23.44, 8.0), its marking reading across the board, its top toward the USB end, as the photo reads it') },
  { part: () => chip('DFN-10-3x3', 'Richtek RT6150B-33GQW buck-boost converter (U2)'), at: [11.04, 13.53], name: 'buck-boost converter (U2)', how: SCH('U2') + '; its package Richtek\'s WDFN-10L 3 × 3, its five pads a side at 0.5 mm; ' + PHP('its body x 9.71 to 12.38, z 12.13 to 14.94, its pads along its two sides at z 12.0 and 15.0') },
  { part: () => chip('DFN-8-2x3', 'Winbond W25Q16JVUXIQ 2 MB QSPI flash (U3)'), at: [19.04, 6.6], dir: 90, name: 'flash (U3)', how: SCH('U3') + '; its package Winbond\'s USON-8 2 × 3 × 0.6 mm (UX); ' + PHP('its body x 17.38 to 20.71, z 5.54 to 7.67, four pads up each of its short sides') },
  { part: () => chip('SOD-123F', 'onsemi MBR120VLSFT1G Schottky diode, VBUS to VSYS (D1)', '', 'diode-smd'), at: [6.6, 16.8], name: 'Schottky diode (D1)', how: SCH('D1') + '; its SOD-123FL drawn as a SOD-123F (KiCad\'s outline 2.8 × 1.8 mm, nominal); ' + PHP('its black body x 5.29 to 7.9, z 16.08 to 17.54, its tin ends past it') },
  { part: () => chip('SOT-523', 'Diodes Inc. DMG1012T N-channel MOSFET (Q1)', '', 'sot-package'), at: [18.5, 16.95], dir: 270, name: 'MOSFET (Q1)', how: SCH('Q1') + '; ' + PHP('its body x 18.0 to 19.04, z 16.17 to 17.73, two leads out of its +x side and one out of its −x side') },
  { part: () => inductor(2.5, 2.2, 1.0, '', 0x666666), at: [10.8, 16.7], name: 'power inductor (L1, 2.2 µH)', how: SCH('L1, 2.2 µH, its package not named') + '; ' + PHP('its grey body x 9.46 to 12.1, z 15.55 to 17.9 (2.5 × 2.2 by its size, less the blur), its colour #69646b, its photo\'s faint violet cast taken out (#666666, its lightness kept)') + '; 1.0 mm tall, typical of a 2520 moulded inductor' },
  { part: () => crystalSmd({ lid: [2.6, 1.95], lidHue: 0xc8b6b1, src: SCH('X1, 12 MHz') + '; an Abracon ABM8-272-T3 (its datasheet\'s text), 3.2 × 2.5 mm (KiCad\'s ABM8 footprint); ' + PHP('its lid 2.6 × 1.95, #c8b6b1') }), at: [34.58, 8.27], dir: 90, name: 'crystal (X1, 12 MHz)', how: PHP('its gold-rimmed body x 33.33 to 35.83, z 6.71 to 9.83, its long side along the board') },
  { part: () => tactTop({ L: 4.27, W: 3.37, H: 1.9, plunger: [3.15, 2.23], src: SCH('SW1, a TP-1221U-K9K5325') + '; ' + PHP('its body 4.27 × 3.37 mm, its oval plunger 3.15 × 2.23, its four terminals out of its ends') + '; its height 1.9, typical (its maker\'s drawing not found)' }), at: [11.9, 7.06], name: 'BOOTSEL button (SW1)', how: PHP('its body x 9.77 to 14.04, z 5.38 to 8.75') },
  ...([[7.6, 4.73], [45.02, 16.54]] as [number, number][]).map((at): Place => ({ part: () => fiducial(1.0, 1.75, { pad: 0xf6d673, bare: 0x483e23 }), at, name: 'fiducial', how: PHP(`a bare gold dot 1.0 mm across at (${at[0]}, ${at[1]}) in a dark ring 1.75 across (#483e23) where the mask is opened, one at each of two opposite corners: fiducials by their look and their places (the schematic names none)`) })),
  { part: () => chipLed(1.6, 0.8, 0.6, { name: 'user LED (green, D2)', item: 'led-chip-green', die: 'led-die-ingan', color: 0xe6ccb2 }), at: [4.8, 4.9], dir: 90, name: 'user LED (D2, GPIO25)', how: SCH('D2, green, driven by GPIO25 through R3') + '; ' + PHP('its pale body x 4.35 to 5.25, z 3.96 to 5.83 (an 0603 by its size), LED printed beside it') },
];
/** The Pico's small parts, read by eye off its photo square-on at 48 px a mm (its own 8.8 px a mm, so good to about
 *  0.2 mm): a black top a resistor, a tan one a capacitor, the case by its length between its tin ends. Its schematic
 *  has 18 capacitors (two 47 µF 0805s, four 2.2 µF 0402s, twelve 0201s) and 13 resistors fitted (ten 0402s, two 0201s,
 *  one 0603); 19 and 15 are read here, so two of each kind are unsure (the two under the flash, z 5.04, among them). */
const PICO_SMALL: SmallRow[] = [
  ['c', 8.35, 13.3, 2.0, 1.25, 90], ['c', 13.35, 13.3, 2.0, 1.25, 90],
  ['c', 16.05, 16.6, 0.6, 0.3, 0], ['c', 17.05, 14.95, 1.0, 0.5, 0], ['c', 20.85, 15.2, 1.0, 0.5, 0], ['c', 20.8, 13.65, 1.0, 0.5, 0], ['c', 20.8, 12.7, 1.0, 0.5, 0],
  ['c', 20.8, 10.55, 0.6, 0.3, 0], ['c', 20.8, 9.83, 0.6, 0.3, 0], ['c', 23.1, 15.1, 0.6, 0.3, 90], ['c', 27.3, 15.15, 0.6, 0.3, 45], ['c', 31.0, 11.2, 0.6, 0.3, 0],
  ['c', 31.0, 10.55, 0.6, 0.3, 0], ['c', 34.0, 10.5, 0.6, 0.3, 0], ['c', 34.95, 5.9, 0.6, 0.3, 0], ['c', 22.4, 5.85, 1.0, 0.5, 90], ['c', 23.25, 6.05, 0.6, 0.3, 90],
  ['c', 27.05, 6.05, 0.6, 0.3, 90], ['c', 16.65, 6.0, 0.6, 0.3, 0],
  ['r', 15.45, 17.5, 1.0, 0.5, 0], ['r', 16.33, 17.5, 1.0, 0.5, 0], ['r', 20.85, 16.95, 1.0, 0.5, 0], ['r', 20.85, 16.15, 1.0, 0.5, 0], ['r', 25.5, 16.75, 1.0, 0.5, 90],
  ['r', 26.45, 16.75, 1.0, 0.5, 90], ['r', 32.6, 9.35, 1.0, 0.5, 90], ['r', 6.7, 7.85, 1.0, 0.5, 90], ['r', 7.7, 7.85, 1.0, 0.5, 90], ['r', 6.85, 14.2, 1.0, 0.5, 90],
  ['r', 15.5, 14.95, 1.0, 0.5, 0], ['r', 20.75, 11.8, 0.6, 0.3, 0], ['r', 20.75, 11.25, 0.6, 0.3, 0], ['r', 18.13, 5.04, 1.0, 0.5, 0], ['r', 20.1, 5.04, 1.0, 0.5, 0],
];
/** Where a part of the Pico W sits: Raspberry Pi's photo of it (pico-1s.png, the third of the four boards), calibrated by
 *  its 44 holes (four mounting holes and its 40 pins': 0.03 mm rms at 8.7 px/mm); what each part is from its datasheet's
 *  words (its schematic there is a picture, not text), its package from its maker's datasheet, else fitting by its size. */
const PHW = (what: string) => `Raspberry Pi's photo of the Pico W (raspberrypi/documentation pico-1s.png, calibrated by its 44 holes, 0.03 mm rms): ${what}`;
const DSW = (what: string) => `Raspberry Pi's Pico W datasheet: ${what}`;
const PICOW_LAYOUT: Place[] = [
  { part: () => microUsbB({ W: 7.4, D: 5.66, H: 2.7, latch: 2.5, src: PHW('its micro-USB where the Pico\'s is, the same receptacle by its look') }), at: [1.38, 10.6], dir: 180, name: 'micro-USB', how: PHW('its shell from 1.45 mm past the edge to x 4.2, z 6.9 to 14.3, as on the Pico') },
  { part: () => dotted(chip('QFN-56', 'Raspberry Pi RP2040 microcontroller', 'RP2-B0  20/21\nP64M15.00 TTT'), -2.68, -2.7, 0.3), at: [23.95, 10.55], dir: 90, name: 'RP2040', how: PHW('its body x 20.4 to 27.5, z 7.0 to 14.1, its pin 1 dot at (21.25, 7.88), its marking as the photo reads it') },
  { part: () => chip('DFN-14-4x3', 'Richtek RT6154 buck-boost converter'), at: [10.88, 12.93], dir: 90, name: 'buck-boost converter', how: DSW('VSYS feeds the RT6154 buck-boost SMPS') + '; its package Richtek\'s WDFN-14L 4 × 3; ' + PHW('its body x 9.38 to 12.38, z 10.95 to 14.9, seven pads down each long side') },
  { part: () => chip('DFN-8-2x3', 'Winbond W25Q16JV 2 MB QSPI flash'), at: [16.8, 7.2], name: 'flash', how: DSW('flash memory (Winbond W25Q16JV)') + '; in the Pico\'s USON-8 2 × 3 by its size; ' + PHW('its body x 15.75 to 17.9, z 5.5 to 8.9, four pads along each of its short sides') },
  { part: () => chip('SOD-123F', 'Schottky diode, VBUS to VSYS (D1)', '', 'diode-smd'), at: [6.6, 16.6], name: 'Schottky diode (D1)', how: DSW('VBUS is fed through a Schottky diode (D1)') + '; ' + PHW('its body x 5.38 to 7.88, z 15.75 to 17.4') },
  { part: () => chip('SOT-523', 'small three-lead part (a SOT-523 by its size; the datasheet\'s words do not name it)', '', 'sot-package'), at: [18.05, 17.1], dir: 270, name: 'three-lead part', how: PHW('its body x 17.5 to 18.6, z 16.25 to 17.9') },
  { part: () => inductor(2.5, 2.2, 1.0, '', 0x666666), at: [10.75, 16.7], name: 'power inductor', how: PHW('its grey body x 9.38 to 12.13, z 15.5 to 17.9, as the Pico\'s') + '; 1.0 mm tall, typical of a 2520 moulded inductor' },
  { part: () => crystalSmd({ lid: [2.6, 1.95], lidHue: 0xc8b6b1, src: DSW('a crystal') + '; 3.2 × 2.5 mm by its size (the Pico\'s ABM8\'s)' }), at: [30.35, 5.9], dir: 90, name: 'crystal', how: PHW('its gold-rimmed body x 29.1 to 31.6, z 4.3 to 7.5') },
  { part: () => tactTop({ L: 4.27, W: 3.37, H: 1.9, plunger: [3.15, 2.23], src: PHW('the Pico\'s BOOTSEL switch by its look and size') }), at: [11.8, 7.2], name: 'BOOTSEL button', how: PHW('its body x 9.5 to 14.1, z 5.6 to 8.75') },
  { part: () => chipLed(1.6, 0.8, 0.6, { name: 'user LED (green)', item: 'led-chip-green', die: 'led-die-ingan', color: 0xe6ccb2 }), at: [4.7, 5.0], dir: 90, name: 'user LED (WL_GPIO0)', how: DSW('its LED driven from the CYW43439\'s WL_GPIO0') + '; ' + PHW('its pale body x 4.25 to 5.1, z 4.0 to 6.0, an 0603 by its size') },
  { part: () => shieldCan(10.4, 11.9, 1.6, 'Infineon CYW43439 Wi-Fi and Bluetooth radio (under its can)'), at: [37.8, 10.75], name: 'radio (CYW43439, under its can)', how: DSW('an on-board 2.4 GHz wireless interface using an Infineon CYW43439') + '; ' + PHW('its can x 32.6 to 43.0, z 4.8 to 16.7') + '; 1.6 mm tall, typical (no side photo)' },
  { part: () => fiducial(1.0, 1.75, { pad: 0xf6d673, bare: 0x483e23 }), at: [7.6, 4.73], name: 'fiducial', how: PHW('a bare gold dot 1.0 mm across in a dark ring where the mask is opened, as the Pico\'s') },
];
/** The Pico W's small parts as its photo shows them, read by eye square-on at 48 px a mm (its own 8.7, so good to about
 *  0.2 mm; a black top a resistor, a tan one a capacitor, a pale one whose kind its photo does not show a p): its three
 *  0805 capacitors, the four parts on its antenna's feed, two pale blue chips by its inductor (0805 and 0603 by their
 *  size, their kind not seen), and the passives round its chips. Those too small or blurred to read are not placed. */
const PICOW_SMALL: SmallRow[] = [
  ['c', 7.3, 12.45, 2.0, 1.25, 90], ['c', 14.7, 12.5, 2.0, 1.25, 90], ['c', 16.4, 12.5, 2.0, 1.25, 90],
  ['p', 46.9, 11.85, 1.0, 0.5, 90], ['p', 46.9, 9.4, 1.0, 0.5, 90], ['p', 50.1, 11.85, 1.0, 0.5, 90], ['p', 50.1, 9.4, 1.0, 0.5, 90],
  ['p', 14.55, 16.1, 2.0, 1.25, 90], ['p', 16.3, 15.3, 1.6, 0.8, 0], ['r', 15.65, 17.0, 0.6, 0.3, 90], ['c', 18.7, 15.6, 1.0, 0.5, 0],
  ['r', 20.0, 16.8, 0.6, 0.3, 90], ['p', 20.95, 15.1, 0.6, 0.3, 0], ['r', 19.3, 6.15, 1.0, 0.5, 90], ['c', 20.35, 6.05, 1.0, 0.5, 90],
  ['p', 21.25, 6.1, 1.0, 0.5, 90], ['p', 24.9, 6.1, 0.6, 0.3, 90], ['p', 18.8, 11.25, 0.6, 0.3, 0], ['p', 18.8, 10.5, 0.6, 0.3, 0],
  ['p', 18.8, 9.9, 0.6, 0.3, 0], ['p', 29.6, 11.25, 0.6, 0.3, 0], ['r', 23.75, 16.8, 1.0, 0.5, 0], ['p', 25.3, 17.1, 0.6, 0.3, 90],
  ['p', 25.35, 15.3, 0.6, 0.3, 45], ['p', 21.05, 15.2, 0.6, 0.3, 0], ['r', 6.67, 7.85, 0.6, 0.3, 90], ['r', 7.7, 7.5, 0.6, 0.3, 90],
];
/** The Pico W's three debug pads: plated holes 2.54 apart across the board at x 31.1, the last square, in a box of
 *  silkscreen marked DEBUG (its photo); their bore and pad as the Pico's. */
const PICOW_DEBUG: Hole[] = (['SWCLK', 'GND', 'SWDIO'] as const).map((nm, i): Hole => ({ at: [31.1, +(16.34 - i * 2.54).toFixed(2)], d: 1.02, pad: 1.7, ...(i === 2 ? { square: true } : {}), why: `debug pad ${i + 1}: ` + PHW(`a round gold pad round a hole at (31.1, ${(16.34 - i * 2.54).toFixed(2)}), ${i === 2 ? 'square' : 'round'}; what each carries not read off its picture`) }));
/** Where a part sits in Raspberry Pi's mechanical reference 3D model of the Pi 5 (RP-004882-DD, issue 1, 2023-09-06), read
 *  by tools/measure/step.py: its box's x and y on the board's drawing (mm from its lower-left corner) and its size. */
const RP5 = (box: string) => `Raspberry Pi's mechanical reference 3D model of the Pi 5 (RP-004882-DD): ${box}`;
/** Where a part the model leaves out was found: Raspberry Pi's own photo of the Pi 5 (its documentation's
 *  computers/raspberry-pi/images/5.jpg), calibrated by its four mounting holes (tools/measure/photo.py, 13.85 px/mm). */
const PH5 = (what: string) => `Raspberry Pi's photo of the Pi 5 (raspberrypi/documentation 5.jpg, calibrated by its holes): ${what}`;
/** A part of the Pi 5 the model shows only as its outline, not naming it. */
const ref5 = (L: number, W: number, H: number, what = '') => () => refBody(L, W, H, `a ${L} × ${W} × ${H} mm part${what ? ` (${what})` : ''}, as the model shows it, not named in it`);
const PI5_LAYOUT: Place[] = [
  { part: () => pinHeader(2, 20, 'tin', 2), at: [32.5, 52.5], name: '40-pin header', how: RP5('its GPIO header, x 7.1–57.9, y 50.0–55.0, 8.6 mm tall') + '; its pins tin, silver in its photo (#c8c8b1 by photo.py colour), its insulator moulded in blocks of two columns as the photo shows' },
  { part: () => usbC(16), at: [11.2, 2.35], dir: 270, name: 'USB-C power in', how: RP5('its USB-C, x 6.83–15.57, y −1.3–6.0 (1.3 mm past the edge)') + '; its contacts fit a power-only receptacle by its use, not by the model' },
  { part: () => hdmi('D', 8.53, 7.2), at: [25.8, 2.6], dir: 270, name: 'micro-HDMI 0', how: RP5('x 22.2–29.39 (7.2 wide), y −1.66–6.86 (its lip 1.66 mm past the edge), 3.4 mm above the board') + '; its mouth the HDMI spec\'s type D' },
  { part: () => hdmi('D', 8.53, 7.2), at: [39.2, 2.6], dir: 270, name: 'micro-HDMI 1', how: RP5('x 35.59–42.8, y −1.66–6.86') },
  { part: () => rj45({ trxcom: true, skirt: true, mark: 'Trxcom®\nTRJG0926HENL 4R\nChina  M  2322' }), at: [77.35, 10.2], dir: 0, name: 'Gigabit Ethernet', how: RP5('its RJ45, x 66.75–88.0 (3.0 mm past the edge), y 2.2–18.2, 13.9 mm above the board') + '; a Trxcom TRJG0926HENL by the marking its photo shows on it (drawn as HanRun\'s HR911105A outline, which its model\'s box fits), its top\'s cover and skirts as the photo shows' },
  { part: () => usbA([3, 3], { detents: true, posts: true, windows: [{ x: 1.6, y: 12.42, w: 1.0, h: 1.0 }] }), at: [79.81, 29.05], dir: 0, name: 'USB 3.0 (two, stacked)', how: RP5('x 70.74–88.31 (3.3 mm past the edge), y 21.15–36.95, 16.5 mm tall') + '; the pair by the Ethernet jack its USB 3.0 (blue), as Raspberry Pi\'s product brief gives them' },
  { part: () => usbA([2, 2], { windows: [{ x: 5.34, y: 13.08, w: 0.8, h: 0.8 }, { x: 14.87, y: 10.35, w: 1.0, h: 0.35 }] }), at: [79.81, 47.0], dir: 0, name: 'USB 2.0 (two, stacked)', how: RP5('x 70.74–88.31, y 39.1–54.9') + '; its shell\'s springs and windows as its photo shows them' },
  { part: () => fpcUpright(16, 10.5, 3.4, 4.1), at: [2.95, 30.01], dir: 180, name: 'PCIe socket', how: RP5('its PCIe FPC socket, x 1.25–4.65, y 24.76–35.26, 4.1 mm tall, open toward the left edge under its cap as its section shows') },
  { part: () => fpcUpright(22, 15.5, 2.95, 4.1), at: [48.73, 8.45], dir: 0, name: 'camera/display 0 socket', how: RP5('its CAM-DISP socket, x 47.25–50.2, y 0.7–16.2, its section a wall 2.4 thick under a cap 2.95 wide, open at +x') },
  { part: () => fpcUpright(22, 15.5, 2.95, 4.1), at: [54.92, 8.45], dir: 0, name: 'camera/display 1 socket', how: RP5('x 53.45–56.4, y 0.7–16.2') },
  { part: () => jstSH(2), at: [19.0, 4.75], dir: 90, name: 'RTC battery socket', how: RP5('its BAT header, x 17.0–21.0, y 3.3–6.2, 4.4 mm tall') + '; JST SH BM02B-SRSS-TB fits it to 0.05 mm' },
  { part: () => jstSH(3), at: [32.35, 3.9], dir: 90, name: 'UART socket', how: RP5('its UART header, x 29.7–35.0, y 2.3–5.5, 4.4 mm tall') + '; drawn as a JST SH BM03B (5.0 × 2.9), the model\'s box 0.3 mm larger' },
  { part: () => jstSH(4), at: [66.75, 52.0], dir: 0, name: 'fan socket', how: RP5('its FAN header, x 65.25–68.25, y 49.0–55.0, 4.45 mm tall') + '; JST SH BM04B-SRSS-TB fits it' },
  { part: () => pinHeader(2, 2, 'tin', 2), at: [61.5, 9.5], name: 'PoE header', how: RP5('its PoE header, x 59.0–64.0, y 7.0–12.0, 8.5 mm tall') + '; its pins tin, as its photo shows' },
  { part: () => tactSide({ L: 2.55, W: 4.5, H: 3.3, out: 0.85, src: RP5('its switch 2.55 × 4.5 × 3.3 mm, its plunger 0.85 mm long') }), at: [1.68, 18.4], dir: 180, name: 'power button', how: RP5('its switch, x 0.4–2.95, y 16.15–20.65, 3.3 mm tall, its plunger x −0.45–0.4: 0.45 mm past the left edge') },
  { part: () => sideLeds(1.48, 1.6, 1.0, [{ name: 'power light (red)', item: 'led-chip-red', die: 'led-die-algainp', color: 0xd8312a }, { name: 'activity light (green)', item: 'led-chip-green', die: 'led-die-ingan', color: 0x35c94a }]), at: [0.89, 13.3], dir: 180, name: 'power and activity lights', how: RP5('its LED, x 0.15–1.63, y 11.7–14.9, 1.0 mm tall') + '; red for power and green for activity as Raspberry Pi\'s documentation gives them, their order along the edge not in the model' },
  { part: () => microSD({ D: 11.43, W: 11.98, H: 1.46, eject: false, src: RP5('11.43 × 11.98 × 1.46 mm under the board') }), at: [8.0, 28.02], dir: 180, under: true, name: 'microSD socket', how: RP5('under the board, x 2.28–13.71, y 22.04–34.02, 1.46 mm deep; a card in it stands 1.7 mm past the left edge') + '; push-pull (no ejector), as the Pi 4\'s and 5\'s are' },
  { part: () => fcbgaLid(17, 2.3, 'BROADCOM®\n2712ZPKFSB00C1T\nTN2320 P31\nN818-06 T3', { lid: 16.4, band: 12.0, drop: 0.3 }), at: [33.1, 22.8], name: 'Broadcom BCM2712', how: RP5('a 17 × 17 × 2.3 mm block, x 24.6–41.6, y 14.3–31.3') + '; its die under a metal lid, as a lidded FCBGA; ' + PH5('its lid 16.4 mm across (its top corners read at its height, photo.py at @2.3), pressed with a raised band about 12 mm wide between two flanges, and its marking') },
  { part: () => lpddr(10, 14.5, '3IC77\nD8CJN'), at: [33.15, 39.05], name: 'memory (LPDDR4X)', how: RP5('a 14.5 × 10 × 1.0 mm block, x 25.9–40.4, y 34.05–44.05') + '; the size of a 200-ball LPDDR4X package' },
  { part: () => refBody(12, 12, 1.2, 'RP1 I/O controller (its 12 × 12 × 1.2 mm outline as the model gives it; its package not drawn in it)', HUE.black, 'emc', 'RP1-C0   22/44\nP0KK20.00'), at: [58.4, 35.0], name: 'RP1 I/O controller', how: RP5('a 12 × 12 × 1.2 mm block, x 52.4–64.4, y 29.0–41.0') + '; RP1 by its place and size (Raspberry Pi\'s documentation)' },
  { part: () => refBody(3.2, 2.5, 0.8, 'crystal (a 3.2 × 2.5 mm ceramic package under its lid, as its photo shows it; 0.8 mm tall: typical of the size)', 0x4b4d50, 'alumina'), at: [61.6, 18.1], dir: 90, name: 'crystal', how: PH5('its body x 60.3–62.9, y 16.6–19.6, beside the Ethernet PHY; not in the 3D model') },
  { part: () => chip('QFN-48-6x6', 'Broadcom BCM54213PE Ethernet PHY (its marking, in its photo)', 'BCM54213PE'), at: [64.0, 23.5], dir: 45, name: 'Ethernet PHY', how: RP5('a 6 mm square turned 45°, 0.7 mm tall, its box x 59.76–68.24, y 19.26–27.74, beside the RJ45') + '; drawn as a 6 × 6 QFN, fits by size' },
  { part: () => shieldCan(10.5, 13.1, 2.0), at: [12.45, 42.35], name: 'Wi-Fi and Bluetooth radio (under its can)', how: RP5('a 10.5 × 13.1 × 2.0 mm block, x 7.2–17.7, y 35.8–48.9') + '; drawn as a shield can over the radio, fits by its size' },
  { part: () => refBody(6, 6, 1.0, 'Renesas (Dialog) DA9091 power chip (its marking, in its photo; its 6 × 6 × 1.0 mm outline as the model gives it)', HUE.black, 'emc', 'dialog\nDA9091\n2311NRAC'), at: [11.2, 15.2], name: 'power chip', how: RP5('x 8.2–14.2, y 12.2–18.2') + '; ' + PH5('its marking, Dialog (Renesas) DA9091') },
  ...[6.6, 9.1, 13.3, 15.8].map((x, i): Place => ({ part: () => inductor(2.0, 2.8, 1.3), at: [x, 21.95], name: `power inductor ${i + 1} (by its size)`, how: RP5(`a 2.0 × 2.8 × 1.3 mm block at (${x}, 21.95)`) + '; a moulded inductor by its size and its place by the power chip' })),
  ...[8.35, 11.75, 14.35].map((x): Place => ({ part: ref5(1.2, 2.0, 1.0), at: [x, 9.35], how: RP5(`at (${x}, 9.35)`) })),
  ...([[5.35, 17.3], [5.35, 13.9], [17.05, 17.3], [17.05, 13.9]] as [number, number][]).map((at): Place => ({ part: ref5(2.0, 1.2, 1.0), at, how: RP5(`at (${at[0]}, ${at[1]})`) })),
  { part: ref5(2.0, 3.0, 1.0), at: [42.9, 11.38], how: RP5('x 41.9–43.9, y 9.88–12.88') },
  { part: ref5(4.3, 7.3, 2.0), at: [67.5, 44.0], how: RP5('x 65.35–69.65, y 40.35–47.65') },
  { part: ref5(1.6, 2.9, 1.5), at: [56.08, 47.95], how: RP5('x 55.27–56.88, y 46.5–49.4') },
  ...([[1.7, 3.4, 1.4, 78.55, 8.9], [3.4, 1.7, 1.4, 67.5, 53.55], [2.5, 3.2, 0.7, 66.55, 30.5], [3.3, 3.3, 0.7, 11.15, 4.85], [3.2, 2.5, 0.7, 27.05, 11.95], [1.6, 2.9, 0.7, 16.5, 33.5], [2.0, 1.2, 0.7, 10.85, 15.3]] as [number, number, number, number, number][]).map(([L, W, H, x, y]): Place => ({ part: ref5(L, W, H), at: [x, y], under: true, how: RP5(`under the board at (${x}, ${y})`) })),
];
/** Where a Pi 4 Model B's part sits: Raspberry Pi's mechanical drawing for its ports and holes; the OpenSCAD Raspberry Pi
 *  library's model of it (github.com/RigacciOrg/openscad-rpi-library, its Pi 4 Model B from Richard Jelbert's
 *  measurements, which agree with the drawing on every port) for its sockets, chips and can; Raspberry Pi's photo of
 *  it (its documentation's computers/raspberry-pi/images/4-model-b.jpg, calibrated by three holes and six of its header
 *  pins' tips, its fourth hole hidden: photo.py, 2.5 px rms) for the rest, each point cast down from its height. */
const RP4 = (what: string) => `Raspberry Pi's mechanical drawing of the Pi 4 Model B: ${what}`;
const OSC4 = (what: string) => `the OpenSCAD Raspberry Pi library's Pi 4 Model B (Richard Jelbert's measurements, agreeing with Raspberry Pi's drawing on every port): ${what}`;
const PH4 = (what: string) => `Raspberry Pi's photo of the Pi 4 (raspberrypi/documentation 4-model-b.jpg, calibrated by three holes and six header pins' tips): ${what}`;
const PI4_FPC = (name: string) => () => fpcUpright(15, 22, 2.5, 5.5, { pitch: 1.0, lock: 0x6f6b76, side: true, tin: true, src: OSC4(`its ${name} socket 22 × 2.5 × 5.5 mm`) + '; fifteen contacts at 1 mm (the Raspberry Pi camera and display cable\'s); its body cream, its lock a grey bar up its outer side (#7e7a87 at its top by photo.py colour) and its contacts tin, as its photo shows' });
const PI4_LAYOUT: Place[] = [
  { part: () => pinHeader(2, 20, 'tin', 2), at: [32.5, 52.5], name: '40-pin header', how: RP4('its GPIO header between the holes, 32.5 mm along and 52.5 up') + '; its pins tin, silver in its photo (#ced7b3)' },
  { part: () => pinHeader(2, 2, 'tin', 2), at: [61.56, 46.33], name: 'PoE header', how: PH4('its four pins\' tips cast down from 8.54 mm: x 60.3 and 62.85, z 45.1 and 47.55') },
  { part: () => usbC(16), at: [11.2, 2.68], dir: 270, name: 'USB-C power in', how: RP4('centred 11.2 mm along the near edge') + '; ' + OSC4('1.0 mm past the edge') },
  { part: () => hdmi('D', 7.8, 6.5), at: [26.0, 2.1], dir: 270, name: 'micro-HDMI 0', how: RP4('centred 26.0 mm along') + '; ' + OSC4('7.8 deep, 6.5 wide, 3.0 tall, 1.8 mm past the edge') },
  { part: () => hdmi('D', 7.8, 6.5), at: [39.5, 2.1], dir: 270, name: 'micro-HDMI 1', how: RP4('centred 39.5 mm along') + '; ' + OSC4('as HDMI 0') },
  { part: 'av-jack-4p', at: [53.85, 5.6], dir: 270, name: 'audio and video jack', how: 'its photo: its face\'s middle 53.85 mm along (' + RP4('53.5') + ', the mounting hole beside it true in the photo to a pixel); its face 1.1 mm in from the edge, its nose 1.5 past it, its back 12.7 in' },
  // (its two lights at its left edge, where its photo is out of focus: two parts there lighter than any of its capacitors
  // (#ebded1 against their #a69a8d), its ACT and PWR printed beside them; their size an 0603's, by their blur)
  { part: () => chipLed(1.6, 0.8, 0.6, { name: 'activity light (green)', item: 'led-chip-green', die: 'led-die-ingan', color: 0xe9e2d6 }), at: [1.2, 12.2], dir: 90, name: 'activity light (ACT)', how: 'its photo: 1.2 mm in, 12.2 along, ACT printed beside it; an 0603 by its blur' },
  { part: () => chipLed(1.6, 0.8, 0.6, { name: 'power light (red)', item: 'led-chip-red', die: 'led-die-algainp', color: 0xe9e2d6 }), at: [1.3, 8.5], dir: 90, name: 'power light (PWR)', how: 'its photo: 1.3 mm in, 8.5 along, PWR printed beside it; an 0603 by its blur' },
  { part: () => rj45({ trxcom: true, mark: 'Trxcom®\nTRJG0925HENL\nChina  M  1937', face: { top: 1.0, mw: 11.6, mh: 8.4, nw: 4.7, nh: 0.8, lw: 1.8, lh: 1.1, lz: 5.0, cw: 12.7, cz: -0.34, green: 1 } }), at: [77.15, 45.75], dir: 0, name: 'Gigabit Ethernet', how: RP4('centred 45.75 mm up the right edge') + '; ' + OSC4('21.5 deep') + '; ' + PH4('its top\'s back edge 1.2 mm further out than the OpenSCAD model\'s 2.1 mm past the edge put it, the USB 2.0 pair read the same way 0.46 mm long of its legs\' place: 0.7 mm further out, its face 2.8 mm past the edge (±0.5: the photo\'s camera, fitted far from it, disagrees with itself there)') + '; ' + PH4('its face read square-on (photo.py rectify): the shield across it, its face 15.8 wide (Trxcom: 15.90), the moulded mouth 11.6 wide and 8.4 tall 1.0 under its top with the latch\'s notch 4.7 × 0.8 under it, the shield\'s cut round it 12.7 wide reaching 1.1 mm past it toward the board\'s corner, its green light in the mouth\'s lower corner toward the USB ports and its yellow in the other') + '; a Trxcom TRJG0925HENL by the marking its photo shows on it (drawn as HanRun\'s HR911105A outline, the size the library measures)' },
  { part: () => usbA([3, 3], { detents: true, windows: [{ x: 3.1, y: 12.25, w: 1.2, h: 1.9 }] }), at: [79.1, 27.0], dir: 0, name: 'USB 3.0 (two, stacked)', how: RP4('centred 27.0 mm up the right edge') + '; ' + OSC4('17.1 deep') + '; ' + PH4('its top\'s front edge 0.6 mm and its back edge 0.9 mm further out than the OpenSCAD model\'s 2.1 mm past the edge put them, against a render from the photo\'s own camera (the USB 2.0 pair\'s, its legs\' holes placing it, read the same way 0.9 and 1.25): 0.5 mm further out, its face 2.6 mm past the edge') + '; its tongues blue, as its photo shows' },
  { part: () => usbA([2, 2], { mark: { text: 'EDAC', x: 2.7, z: 0, h: 1.0 }, lance: { back: 7.0, front: 1.55, rows: [[6.25, 3.1, 4.5], [14.45, 11.4, 12.45]], root: 'front' },
    windows: [{ x: 14.35, y: 10.3, w: 2.1, h: 0.7 }, { x: 14.35, y: 7.18, w: 2.1, h: 0.7 }],
    ribs: [{ x: 9.25, y: 8.65, w: 4.3, h: 1.2 }, { x: 14.35, y: 10.3, w: 1.7, h: 0.35 }, { x: 14.35, y: 7.18, w: 1.7, h: 0.35 }],
    flap: { to: 2.6, top: 10.2, windows: [{ x: 0.8, y: 2.7, w: 0.95, h: 1.1 }, { x: 1.25, y: 8.45, w: 1.4, h: 1.1 }] } }), at: [79.4, 9.0], dir: 0, name: 'USB 2.0 (two, stacked)',
    how: RP4('centred 9.0 mm up the right edge') + '; ' + PH4('its legs\' plated holes by J11 at 71.88 and 77.55 (the photo cast onto the board, less the camera\'s 0.21 mm error at the 61.5 mm hole by them), its footprint\'s legs 0.98 and 6.65 mm from its back, so its back at 70.9 and its face 2.95 mm past the edge, not ' + OSC4('2.1') + '; its top\'s back edge read 1.2 mm further out than the model at 15.4 mm up, its camera\'s own lean there 0.4') + '; its side as photo.py rectify reads it square-on, against the side\'s own front edge (±0.3 mm): its springs U-cuts 7.0 to 1.55 mm behind its face, rooted at the front and tapering to their free ends, two embossed slots 2.1 × 0.7 near its face, a rib 4.3 × 1.2 embossed between its mouths, its back plate\'s flap 2.6 mm onto each side with two latch windows; EDAC stamped on its top' },
  { part: PI4_FPC('display'), at: [4.0, 29.0], dir: 0, name: 'display (DSI) socket', how: OSC4('x 2.75–5.25, z 18–40') },
  { part: PI4_FPC('camera'), at: [46.25, 11.3], dir: 0, name: 'camera (CSI) socket', how: OSC4('x 45–47.5, z 0.3–22.3') },
  { part: () => fcbgaLid(17, 2.4, '', { lid: 15.0, band: 12.6, drop: 0.25, square: true }), at: [29.25, 32.5], name: 'Broadcom BCM2711', how: OSC4('its lid 15 × 15 × 2.4 mm, centred 29.25 along and 32.5 up') + '; ' + PH4('its lid\'s outline 15.0 × 15.4 seen at its top, a raised square in its middle; its substrate 17 mm, typical of its FCBGA') },
  { part: () => lpddr(10.2, 15, 'SEC 934\nK4F8E30\n4HBMGCJ'), at: [45.0, 32.4], dir: 90, name: 'memory (LPDDR4)', how: OSC4('10.2 × 15 mm, centred 44.85 along and 32.5 up') + '; ' + PH4('its middle cast down from its top, 45.0 and 32.4; its marking as the photo reads it (Samsung K4F8E304HB, the 1 GB board\'s)') },
  { part: () => shieldCan(10, 12, 1.5), at: [11.5, 43.0], name: 'Wi-Fi and Bluetooth radio (under its can)', how: OSC4('10 × 12 × 1.5 mm, x 6.5–16.5, z 37–49') },
  { part: () => chip('QFN-68-8x8', 'VIA Labs VL805 USB 3.0 host controller (its marking, in its photo)', 'VL805-Q6\n1943 7300'), at: [58.8, 23.7], name: 'USB 3.0 controller', how: PH4('its middle cast down from its top, 58.8 and 23.7') + '; drawn as an 8 × 8 mm QFN-68 (its datasheet\'s package)' },
  { part: () => chip('QFN-48-6x6', 'Broadcom BCM54213PE Ethernet PHY (its marking, in its photo)', 'BCM54213PE\nB1KMLG'), at: [58.5, 37.9], name: 'Ethernet PHY', how: PH4('its middle cast down from its top, 58.5 and 37.9; its outline 6.05 × 6.1 seen') + '; drawn as a 6 × 6 QFN-48, as the Pi 5\'s model gives it' },
  { part: () => chip('QFN-32-5x5', 'MaxLinear MxL7704 power-management chip (its marking, in its photo)', 'MxL7704\n1926'), at: [10.7, 12.1], name: 'power chip', how: PH4('its middle cast down from its top, 10.7 and 12.1') + '; drawn as a 5 × 5 mm QFN-32 (its datasheet\'s package)' },
  { part: () => inductor(3.6, 4.0, 2.5, 'R47', 0x2c2c2e), at: [15.55, 16.5], name: 'power inductor 1 (0.47 µH, by its marking)', how: PH4('its top\'s front edge and its base\'s together: x 13.75–17.35 (the capacitor beside it at 17.9), z 14.5–18.5, 2.5 tall (its top alone could not tell its height from its place); marked R47') + '; a moulded inductor by its size' },
  { part: () => inductor(4.0, 4.0, 2.0, 'KF', 0x2c2c2e), at: [20.7, 8.6], name: 'power inductor 2 (by its size)', how: PH4('its middle cast down from its top, 20.7 and 8.6; marked KF') + '; a 4 × 4 mm moulded inductor by its size' },
  { part: () => microSD({ D: 11.43, W: 11.98, H: 1.46, eject: false, src: 'a push-push microSD socket as the Pi 5\'s model gives it (the Pi 4\'s underside not seen in its photo: where the Pi 5\'s is, and said so)' }), at: [8.0, 28.02], dir: 180, under: true, name: 'microSD socket', how: 'under the board where the Pi 5\'s is: its underside not in this photo, so not placed from one' },
];
/** Every board kept: its maker's figures, its source. */
/** The Pi 4's small parts round its power chip, read by eye off its photo at its own size and located through its camera
 *  (photo.py at, each at its top's height): the corner where the small-part finder, on a photo soft there, took
 *  capacitors with tin ends for moulded inductors, joined two parts into one and missed others. They stand in for the
 *  finder's rows in x 2.4–21, z 9–19.6 (left out of its run there); good to about 0.3 mm. */
export const PI4_HAND: SmallRow[] = [
  ['r', 3.22, 15.76, 1.6, 0.8, 0], ['q', 6.0, 15.84, 2.0, 2.0, 0], ['t', 8.43, 18.47, 3.55, 1.6, 0, 'SOD-123F'], ['c', 8.46, 16.64, 2.0, 1.25, 0],
  ['c', 10.64, 17.97, 2.0, 1.25, 90], ['c', 4.75, 13.67, 1.6, 0.8, 0], ['c', 4.66, 12.34, 1.6, 0.8, 0], ['c', 3.08, 10.09, 1.6, 0.8, 90],
  ['t', 5.6, 9.85, 2.9, 1.6, 0, 'SOT-23-6'], ['c', 17.9, 16.95, 1.6, 0.8, 90], ['c', 19.84, 16.78, 2.0, 1.25, 0], ['c', 15.0, 13.52, 1.6, 0.8, 0],
  ['c', 15.02, 11.95, 1.6, 0.8, 90], ['q', 14.25, 9.5, 2.0, 2.0, 0], ['c', 16.19, 9.71, 2.0, 1.25, 90], ['c', 2.89, 16.15, 1.0, 0.5, 90],
];
export const BOARD_DEFS: Record<string, BoardDef> = {
  'pi5': { name: 'Raspberry Pi 5', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2712', cpu: '4 × Arm Cortex-A76 at 2.4 GHz', gpu: 'VideoCore VII', ram: [1, 2, 4, 8, 16], ramType: 'LPDDR4X-4267', ports: '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet (PoE+ with a HAT), 2 × micro-HDMI (4Kp60), 2 × 4-lane MIPI camera/display, PCIe 2.0 x1, Wi-Fi 802.11ac, Bluetooth 5.0, 40-pin header, RTC, power button', power: '5 V / 5 A over USB-C (Power Delivery)', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 16, rams: 1, layers: 6, t: 1.4 /* its maker's 3D model */, corner: 3, layout: PI5_LAYOUT, small: PI5_SMALL, mask: 0x21b984 /* its photo's bare mask, the median off its copper (photo.py traces on Raspberry Pi's photo) */, copper: { ...PI5_COPPER, hue: 0x33c189 /* the mask over its copper, the same photo's median */ }, ink: PI5_INK,
    more: [{ at: [61.5, 46.5], d: 3.0, pad: 3.0, why: 'for the Active Cooler\'s push pin (its maker\'s 3D model)' }, { at: [3.5, 9.5], d: 3.0, pad: 3.0, why: 'for the Active Cooler\'s push pin (its maker\'s 3D model)' }],
    photos: 'its layout from Raspberry Pi\'s mechanical reference 3D model (RP-004882-DD, read by tools/measure/step.py) and its mechanical drawing; its silkscreen, its copper, its mask\'s colour, its chips\' markings, a crystal the model leaves out and the small parts it shows from Raspberry Pi\'s own photo of it (raspberrypi/documentation, computers/raspberry-pi/images/5.jpg, 13.9 px/mm, calibrated by its four holes: photo.py calibrate, silk, small, traces); its underside not photographed there', edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29.1, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'usbc', at: 11.2, side: 'bottom' }, { kind: 'microhdmi', at: 25.8, side: 'bottom' }, { kind: 'microhdmi', at: 39.2, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 5 product page and mechanical drawing RP-008347; its parts placed from Raspberry Pi\'s mechanical reference 3D model RP-004882-DD' },
  'pi4b': { name: 'Raspberry Pi 4 Model B', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2711', cpu: '4 × Arm Cortex-A72 at 1.8 GHz', gpu: 'VideoCore VI', ram: [1, 2, 4, 8], ramType: 'LPDDR4-3200', ports: '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet, 2 × micro-HDMI (4Kp60), MIPI CSI and DSI, Wi-Fi 802.11ac, Bluetooth 5.0, 40-pin header, 3.5 mm AV', power: '5 V / 3 A over USB-C', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 17, rams: 1, layers: 6, t: 1.4 /* the OpenSCAD library's measured board */, corner: 3, layout: PI4_LAYOUT, small: [...PI4_SMALL, ...PI4_HAND], more: [9.5, 12.04, 14.58].map((x) => ({ at: [x, 20.9] as [number, number], d: 1.0, pad: 1.6, why: 'J2 (RUN, GLOBAL_EN and ground): a three-pin 2.54 mm header\'s holes, unfitted, its photo\'s gold rings 2.54 apart at z 20.9' })), mask: 0x5cab90 /* its photo's bare mask, the median off its copper (photo.py traces) */, copper: { ...PI4_COPPER, hue: 0x5cb193 /* the mask over its copper, the same photo's median */ }, ink: PI4_INK, edge: [{ kind: 'usbA2', at: 9, side: 'right' }, { kind: 'usbA2', at: 27, side: 'right' }, { kind: 'rj45', at: 45.75, side: 'right' }, { kind: 'usbc', at: 11.2, side: 'bottom' }, { kind: 'microhdmi', at: 26, side: 'bottom' }, { kind: 'microhdmi', at: 39.5, side: 'bottom' }, { kind: 'audio', at: 54, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 4 Model B product brief and mechanical drawing; its layout from the drawing, the OpenSCAD Raspberry Pi library\'s model of it and Raspberry Pi\'s photo of it (see each part)' },
  'pi3bplus': { name: 'Raspberry Pi 3 Model B+', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2837B0', cpu: '4 × Arm Cortex-A53 at 1.4 GHz', gpu: 'VideoCore IV', ram: [1], ramType: 'LPDDR2', ports: '4 × USB 2.0, Gigabit Ethernet over USB 2.0 (300 Mbit/s), full-size HDMI, MIPI CSI and DSI, Wi-Fi 802.11ac, Bluetooth 4.2, 40-pin header, 3.5 mm AV', power: '5 V / 2.5 A over micro-USB', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 14, rams: 1, layers: 6, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'microusb', at: 10.6, side: 'bottom' }, { kind: 'hdmi', at: 32, side: 'bottom' }, { kind: 'audio', at: 53.5, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 3 Model B+ product brief and mechanical drawing' },
  'pizero2w': { name: 'Raspberry Pi Zero 2 W', maker: 'Raspberry Pi', cls: 'zero', soc: 'Broadcom BCM2710A1 (in the RP3A0 package with its memory)', cpu: '4 × Arm Cortex-A53 at 1 GHz', gpu: 'VideoCore IV', ram: [0.5], ramType: 'LPDDR2', ports: 'mini-HDMI, micro-USB OTG, Wi-Fi 802.11b/g/n, Bluetooth 4.2, CSI-2 camera, 40-pin header (unpopulated)', power: '5 V / 2.5 A over micro-USB', L: 65, W: 30, H: 5.2, g: 10, holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 26.5], [61.5, 26.5]], hole: 2.7, socMm: 12, rams: 0, layers: 6, edge: [{ kind: 'minihdmi', at: 12.4, side: 'bottom' }, { kind: 'microusb', at: 41.4, side: 'bottom' }, { kind: 'microusb', at: 54, side: 'bottom' }], header: 'holes', src: 'Raspberry Pi Zero 2 W product brief RP-008359; its weight, 10 g, from PiCockpit' },
  'cm5': { name: 'Raspberry Pi Compute Module 5', maker: 'Raspberry Pi', cls: 'cm', soc: 'Broadcom BCM2712', cpu: '4 × Arm Cortex-A76 at 2.4 GHz', gpu: 'VideoCore VII', ram: [2, 4, 8, 16], ramType: 'LPDDR4X-4267', ports: 'two 100-pin board-to-board connectors (to its carrier), optional eMMC and Wi-Fi', power: '5 V from its carrier', L: 55, W: 40, H: 4.7, holes: [[3.5, 3.5], [51.5, 3.5], [3.5, 36.5], [51.5, 36.5]], hole: 2.7, socMm: 16, rams: 1, layers: 10, edge: [], src: 'Raspberry Pi Compute Module 5 datasheet RP-008180 (four M2.5 holes inset 3.5 mm)' },
  'pico1': { name: 'Raspberry Pi Pico', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2040 (QFN-56, 7 × 7 mm)', cpu: '2 × Arm Cortex-M0+ at 133 MHz', ram: [0], ramType: '264 KB SRAM, 2 MB QSPI flash', ports: 'micro-USB 1.1, 26 GPIO (3 ADC), 2 × UART, 2 × SPI, 2 × I²C, 16 PWM, 8 PIO state machines; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, pad: 3.0 /* its rings, measured on Raspberry Pi's photo of it */, t: 1.0 /* its datasheet: 51 × 21 × 1 mm */, more: [...PICO_PINS, ...PICO_DEBUG], socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], layout: PICO_LAYOUT, small: PICO_SMALL, photos: 'raspberrypi/documentation pico-1s.png (its top)', mask: 0x0c8855 /* its photo's bare mask, the median off its copper (photo.py traces) */, copper: { ...PICO_COPPER, hue: 0x33885a /* the mask over its copper, the same photo's median */ }, ink: PICO_INK, bright: true /* its pads bright gold in its photo */, src: 'Raspberry Pi Pico datasheet; its layout from its schematic and Raspberry Pi\'s photo of it (see each part)' },
  'pico1w': { name: 'Raspberry Pi Pico W', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2040 (QFN-56) and Infineon CYW43439', cpu: '2 × Arm Cortex-M0+ at 133 MHz', ram: [0], ramType: '264 KB SRAM, 2 MB QSPI flash', ports: 'micro-USB, 26 GPIO, Wi-Fi 802.11n (2.4 GHz), Bluetooth 5.2; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, pad: 3.0 /* its rings, measured on Raspberry Pi's photo of it */, t: 1.0 /* its datasheet: 51 × 21 × 1 mm */, more: [...PICO_PINS, ...PICOW_DEBUG], socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], layout: PICOW_LAYOUT, small: PICOW_SMALL, photos: 'raspberrypi/documentation pico-1s.png (its top)', bright: true /* its pads bright gold in its photo */, mask: 0x49a06d /* its photo's bare mask, the median off its copper (photo.py traces) */, copper: { ...PICOW_COPPER, hue: 0x44b67b /* the mask over its copper, the same photo's median */ }, ink: PICOW_INK, src: 'Raspberry Pi Pico W datasheet; its layout from its words and Raspberry Pi\'s photo of it (see each part)' },
  'pico2': { name: 'Raspberry Pi Pico 2', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2350 (QFN-60, 7 × 7 mm)', cpu: '2 × Arm Cortex-M33 or 2 × Hazard3 RISC-V at 150 MHz', ram: [0], ramType: '520 KB SRAM, 4 MB QSPI flash', ports: 'micro-USB 1.1, 26 GPIO, 12 PIO state machines; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, pad: 3.0 /* its rings, measured on Raspberry Pi's photo of it */, t: 1.0 /* its datasheet: 51 × 21 × 1 mm */, more: [...PICO_PINS, ...PICO_DEBUG], socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico 2 datasheet' },
  'pico2w': { name: 'Raspberry Pi Pico 2 W', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2350 (QFN-60) and Infineon CYW43439', cpu: '2 × Arm Cortex-M33 or 2 × Hazard3 RISC-V at 150 MHz', ram: [0], ramType: '520 KB SRAM, 4 MB QSPI flash', ports: 'micro-USB, 26 GPIO, Wi-Fi 802.11n, Bluetooth 5.2; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, pad: 3.0 /* its rings, measured on Raspberry Pi's photo of it */, t: 1.0 /* its datasheet: 51 × 21 × 1 mm */, more: PICO_PINS /* its debug pads in its middle, not yet placed */, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico 2 W datasheet' },
  'opi5': { name: 'Orange Pi 5', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588S (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS (INT4/INT8/INT16)', gpu: 'Mali-G610', ram: [4, 8, 16, 32], ramType: 'LPDDR4/4X',
    ports: 'USB 3.0 (the upper port of a stack whose lower is USB 2.0), USB 2.0 (stood on its side; shared with the Type-C), USB-C (USB 3.0 and DisplayPort 1.4), Gigabit Ethernet (YT8531C), HDMI 2.1 (8K60), M.2 M-key under it (PCIe 2.0 x1, a 2230 or 2242 SSD), 26-pin header, 3-pin debug UART, 3.5 mm headphone jack, onboard microphone, two MIPI camera sockets and a 30-pin LCD socket on top, 16 MB SPI flash',
    power: '5 V / 4 A over USB-C (no Power Delivery: a fixed 5 V)', L: 100, W: 62, H: 20, g: 46,
    holes: [[3.075, 3.055], [96.925, 3.055], [3.075, 58.945], [96.925, 58.945]], hole: 3.0, pad: 5.5, socMm: 17, rams: 2, layers: 8, edge: [], extras: ['m2'], mask: 0x1d64a6 /* its photo's bare mask, the median off its copper (photo.py traces); the look page's bright room puts a sheen on it */,
    copper: { ...OPI5_COPPER, hue: 0x186bb6 /* its photo's, over its copper */ },
    more: [{ at: [70.51, 59.28], d: 3.5, pad: 5.3, why: 'the M.2 card\'s screw, a 2242' }, { at: [70.55, 47.25], d: 3.5, pad: 5.3, why: 'the M.2 card\'s screw, a 2230' }, { at: [28.04, 51.21], d: 3.0, pad: 6.3, why: 'in its photo, not named in its manual (its bore read as 2.7–3.1 mm)' }, { at: [71.71, 11.19], d: 3.0, pad: 6.3, why: 'in its photo, not named in its manual (its bore read as 2.7–3.1 mm)' }],
    small: OPI5_SMALL,
    photos: 'its maker\'s top photo of board V1.3.2, calibrated by its four corner holes (each centre fitted to its pad; 9.73 px/mm; its edges then fall within 0.3 mm of 100 × 62); four photos of a board from its corners and sides (github.com/berin-aquaquad/orange-pi-5) for what the top view hides; no photo of its underside reachable here',
    layout: [
      { part: 'usb-c-16', at: [11.5, 2.475], dir: 270, name: 'USB-C power in', how: 'top photo: grid 11.65, outline 11.4 (mean 11.5); its front 1.2 mm past the edge (shadow taken off)' },
      { part: 'jack-3.5', at: [22.1, 5.0], dir: 270, name: '3.5 mm headphone jack', how: 'top photo: its body x 19.0–25.2; its nose 2 mm past the edge, as its corner photo shows' },
      { part: () => hdmiOn(11.6), at: [37.9, 3.2], dir: 270, name: 'HDMI out', how: 'top photo: middle x 37.8–38.05, its back at z 9.0; its front past the edge (−1.6 to −3.4 mm by the shadow: −2.6 taken)' },
      { part: 'usb-c-24', at: [55.1, 2.475], dir: 270, name: 'USB-C (USB 3.0, DisplayPort)', how: 'top photo: grid 55.0, outline 55.2' },
      { part: 'fpc-30', at: [71.85, 2.55], dir: 270, name: 'LCD2 socket', how: 'top photo: its body x 61.7–82.0, its 30 contacts x 64.5–79.6 at 0.5 mm, its slide lock toward the edge' },
      { part: 'b2b-30', at: [88.6, 2.5], dir: 0, name: 'CAM3 socket', how: 'top photo: outline 7.9 × 2.6 mm at (88.6, 2.5); its silk numbers 15 and 30 put contact 1 at its far left' },
      { part: 'b2b-30', at: [71.2, 20.6], dir: 180, name: 'CAM1 socket', how: 'top photo: outline 8.05 × 2.67 mm at (71.25, 20.6); numbered the other way round from CAM3' },
      { part: 'wafer-2', at: [83.9, 14.05], dir: 0, name: 'fan socket', how: 'top photo: its body x 81.8–86.0, z 10.2–17.9' },
      { part: 'usb-a-2-side', at: [95.15, 11.05], dir: 0, name: 'USB 2.0 (on its side)', how: 'top photo: its shell z 7.4–14.8, x 87.0 to 103.3 (its top leans out 0.75 mm, taken off); stood on its side as the corner photo shows' },
      { part: 'rj45', at: [93.7, 27.3], dir: 0, name: 'Gigabit Ethernet', how: 'top photo: grid z 27.5, outline 27.0–27.4; its back at x 83.0; green and yellow lights in its face, as the corner photo shows' },
      { part: 'usb-a-3x3', at: [95.05, 47.45], dir: 0, name: 'USB 3.0 over USB 2.0', how: 'top photo: z 40.3–54.6, its back at x 86.5; both tongues blue, as the corner photo shows; silk "UP USB3.0 DOWN USB2.0"' },
      { part: 'microsd-push', at: [7.7, 47.3], dir: 180, name: 'microSD (TF) socket', how: 'top photo: its cover x 0.86–14.55, z 40.4–54.15; its slot at the left edge, as the side photo shows' },
      { part: 'header-2x13', at: [26.59, 58.67], dir: 0, name: '26-pin header', how: 'top photo: its columns 2.52–2.54 apart from x 11.35 (pin 1, by its silk triangle) to 41.6; its rows at z 57.4 and 59.94' },
      { part: 'header-1x3', at: [52.35, 60.0], dir: 0, name: 'debug UART (TX, RX, GND)', how: 'top photo: pins at x 49.9, 52.3, 54.7 (2.54 apart taken), z 60.0' },
      { part: 'tact-kmr2', at: [20.64, 41.69], dir: 90, name: 'RECOVERY button', how: 'top photo: outline 2.9 × 5.6 mm (its terminals with it) at (20.64, 41.69)' },
      { part: 'tact-kmr2', at: [15.55, 13.14], dir: 90, name: 'MASKROM button', how: 'top photo: outline 2.8 × 4.8 mm at (15.55, 13.14)' },
      { part: 'tact-side', at: [2.55, 14.75], dir: 180, name: 'power button', how: 'top photo: its body x 1.24–4.0, z 12.7–17.2; pushed in from the left edge, as the side photo shows' },
      { part: () => micElectret(5.6, 2.2), at: [3.65, 9.25], name: 'microphone', how: 'top photo: a round capsule 5.6–5.8 mm across at (3.65, 9.25); its height typical' },
      { part: () => fccsp(17, [9.1, 10.3], 'Rockchip\nRK3588S'), at: [45.64, 29.83], dir: 90, name: 'Rockchip RK3588S', how: 'top photo: outline 17.09 × 17.13 mm at (45.64, 29.83), its bare die 9.1 × 10.3 in its middle; its package from Rockchip\'s datasheet' },
      { part: () => lpddr(10, 15, 'SEC 134\nK4U6E3S\n4AAMGCR\nGHE6776FU'), at: [30.25, 30.8], dir: 90, name: 'memory (left)', how: 'top photo: outline 10.29 × 15.36 mm at (30.25, 30.81); its marking as read off the photo (SEC 134, K4U6E3S 4AAMGCR: a Samsung K4U6E3S4AA-MGCR, LPDDR4X), its letters about 1 mm' },
      { part: () => lpddr(10, 15, 'SEC 134\nK4U6E3S\n4AAMGCR\nGHE6776FU'), at: [46.54, 45.36], dir: 0, name: 'memory (top)', how: 'top photo: outline 15.33 × 10.33 mm at (46.54, 45.36)' },
      { part: () => chip('QFN-68', 'RK806-1 power chip', 'Rockchip RK806-1'), at: [10.4, 28.9], name: 'RK806-1 power chip', how: 'top photo: outline 7.09 × 7.27 mm at (10.40, 28.90); a QFN-68, 7 × 7 mm (LCSC and JLCPCB listings)' },
      { part: () => chip('QFN-40-5x5', 'YT8531C Ethernet chip', 'YT8531C'), at: [74.7, 30.97], name: 'YT8531C Ethernet chip', how: 'top photo: outline 4.86 × 5.13 mm at (74.70, 30.97); a QFN-40, 5 × 5 mm (LCSC listing)' },
      { part: () => chip('WSON-8', '16 MB SPI flash', 'XMC'), at: [66.8, 31.5], dir: 90, name: '16 MB SPI flash', how: 'top photo: outline 6.7 × 6.5 mm with its pads at (66.84, 31.50), marked XMC; drawn as a WSON-8 6 × 5 (fits by size)' },
      { part: () => inductor(4.0, 4.5, 2.0, '4R7', 0x877d77), at: [57.4, 52.4], name: 'power inductor 4R7', how: 'top photo: x 55.3–59.45, z 50.2–54.7, marked 4R7; its height typical' },
      { part: () => inductor(4.0, 4.7, 2.0, 'R22', 0x877c77), at: [17.0, 22.4], name: 'power inductor R22', how: 'top photo: x 15.0–19.0, z 20.2–24.9, marked R22; its height typical' },
      { part: () => inductor(2.9, 3.0, 1.5, '', 0x96918e), at: [11.95, 37.0], name: 'power inductor', how: 'top photo: x 10.5–13.4, z 35.5–38.5; its height typical' },
      { part: () => m2Socket('m2'), at: [70.53, 17.05], under: true, name: 'M.2 M-key socket', how: 'not from a photo of its underside (none reachable here): placed on the line of its two screw holes, 12.0 mm apart for a 2230 and a 2242 card; the card\'s edge 30 mm short of the 2230\'s screw and 42 of the 2242\'s (the spec\'s card lengths), at z 17.25, 2.8 mm inside its mouth (typical)' },
    ],
    silk: [
      { text: 'PWR IN', at: [11.2, 7.6], h: 0.9 }, { text: 'PJ', at: [22.3, 13.2], h: 1.0 }, { text: 'HDMI', at: [37.0, 10.5], h: 0.9 }, { text: 'TYPE-C', at: [56.3, 8.6], h: 0.9 },
      { text: 'LCD2', at: [70.5, 6.4], h: 0.9 }, { text: '30', at: [79.3, 6.6], h: 0.8 }, { text: 'CAM3', at: [88.8, 5.1], h: 0.8 }, { text: 'CAM1', at: [70.0, 18.2], h: 0.8 },
      { text: 'FAN', at: [79.4, 14.5], h: 0.9, dir: 90 }, { text: 'USB2.0', at: [93.3, 16.4], h: 0.9 }, { text: 'LAN', at: [87.6, 37.7], h: 0.9 },
      { text: 'UP USB3.0', at: [89.3, 57.7], h: 0.9 }, { text: 'DOWN USB2.0', at: [90.0, 55.2], h: 0.9 }, { text: 'OPi 5  V1.3.2', at: [68.4, 40.9], h: 1.2 }, { text: 'Orange pi', at: [67.5, 43.7], h: 1.6 },
      { text: 'TX', at: [49.9, 58.0], h: 0.8 }, { text: 'RX', at: [52.3, 58.0], h: 0.8 }, { text: 'GND', at: [54.9, 58.0], h: 0.8 }, { text: 'UART', at: [55.0, 56.6], h: 0.8 },
      { text: 'RECOVERY', at: [23.3, 39.8], h: 0.9, dir: 90 }, { text: 'MASKROM', at: [13.1, 13.0], h: 0.9, dir: 90 }, { text: 'PWR ON', at: [6.2, 15.2], h: 0.8, dir: 90 }, { text: 'MIC', at: [6.2, 10.6], h: 0.8, dir: 90 }, { text: 'TF', at: [2.4, 55.6], h: 0.8 },
    ],
    src: 'Orange Pi 5 user manual v2.1.1 (100 × 62 mm, 46 g; four 3.0 mm holes, two 3.5 mm M.2 holes; RK806-1, YT8531C, 16 MB SPI flash; 26-pin header, 3-pin UART); its holes 93.85 × 55.89 mm apart (an owner\'s measurement, found by search, which its photo agrees with); its layout measured from its photos (see photos)' },
  'opi5plus': { name: 'Orange Pi 5 Plus', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588 (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS', gpu: 'Mali-G610', ram: [4, 8, 16], ramType: 'LPDDR4/4X', ports: '2 × USB 3.0, 2 × USB 2.0, USB-C, 2 × 2.5G Ethernet (RTL8125BG), 2 × HDMI out, HDMI in, M.2 M-key (NVMe), M.2 E-key (Wi-Fi), 40-pin header', power: '5 V / 4 A over USB-C', L: 100, W: 75, H: 24, g: 86.5, holes: [[3.5, 3.5], [96.5, 3.5], [3.5, 71.5], [96.5, 71.5]], hole: 2.7, socMm: 23, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 12, side: 'right' }, { kind: 'rj45', at: 30, side: 'right' }, { kind: 'usbA2', at: 49, side: 'right' }, { kind: 'usbA2', at: 64, side: 'right' }, { kind: 'usbc', at: 10, side: 'bottom' }, { kind: 'hdmi', at: 28, side: 'bottom' }, { kind: 'hdmi', at: 46, side: 'bottom' }, { kind: 'hdmi', at: 64, side: 'bottom' }, { kind: 'audio', at: 82, side: 'bottom' }], header: 'pins', extras: ['m2', 'm2e', 'emmc', 'buttons'], src: 'orangepi.org, Orange Pi 5 Plus page (100 × 75 mm, 86.5 g); hole positions typical' },
  'opi5pro': { name: 'Orange Pi 5 Pro', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588S (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS', gpu: 'Mali-G610', ram: [4, 8, 16], ramType: 'LPDDR5', ports: 'USB 3.1, 3 × USB 2.0, Gigabit Ethernet (PoE+ with a HAT), HDMI 2.1 and HDMI 2.0, M.2 M-key, Wi-Fi 5, BT 5.0, 40-pin header', power: '5 V / 5 A over USB-C', L: 89, W: 56, H: 20, g: 62, holes: PI_HOLES.map(([x, z]) => [x === 61.5 ? 85.5 : x, z]), hole: 2.7, socMm: 23, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'usbc', at: 11, side: 'bottom' }, { kind: 'hdmi', at: 30, side: 'bottom' }, { kind: 'hdmi', at: 50, side: 'bottom' }, { kind: 'audio', at: 68, side: 'bottom' }], header: 'pins', extras: ['m2', 'emmc', 'buttons'], src: 'orangepi.org, Orange Pi 5 Pro page (89 × 56 × 1.6 mm, 62 g); hole positions typical' },
  'opi5max': { name: 'Orange Pi 5 Max', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588 (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS (INT4/INT8/INT16/FP16)', gpu: 'Mali-G610', ram: [4, 8, 16], ramType: 'LPDDR5', ports: '2 × USB 3.0, 2 × USB 2.0, 2.5G Ethernet (RTL8125BG), 2 × HDMI 2.1 (8K60), MIPI DSI, 2 × MIPI CSI, M.2 M-key (PCIe 3.0 x4), Wi-Fi 6E, BT 5.3, 40-pin header', power: '5 V / 5 A over USB-C', L: 89, W: 57, H: 20, g: 62, holes: [[3.5, 3.5], [85.5, 3.5], [3.5, 53.5], [85.5, 53.5]], hole: 2.7, socMm: 23, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 10.5, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'usbc', at: 11, side: 'bottom' }, { kind: 'hdmi', at: 30, side: 'bottom' }, { kind: 'hdmi', at: 50, side: 'bottom' }, { kind: 'audio', at: 68, side: 'bottom' }], header: 'pins', extras: ['m2', 'emmc', 'buttons'], src: 'orangepi.org, Orange Pi 5 Max page (89 × 57 × 1.6 mm, 62 g); hole positions typical' },
  'rdkx3': { name: 'D-Robotics RDK X3', maker: 'D-Robotics', cls: 'pi-b', soc: 'Sunrise 3 (X3)', cpu: '4 × Arm Cortex-A53 at 1.5 GHz', ai: 'BPU, dual-core Bernoulli, 5 TOPS', ram: [2, 4], ramType: 'LPDDR4', ports: 'USB 3.0, 2 × USB 2.0, micro-USB device, HDMI 1.4 (1080p60), 2 × 2-lane MIPI CSI, Ethernet, Wi-Fi 2.4/5 GHz, Bluetooth 4.2, 40-pin header; H.265 and JPEG encode and decode', power: '5 V / 3 A', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 14, rams: 1, layers: 6, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA', at: 47, side: 'right' }, { kind: 'usbc', at: 11, side: 'bottom' }, { kind: 'hdmi', at: 32, side: 'bottom' }, { kind: 'microusb', at: 53, side: 'bottom' }], header: 'pins', src: 'en.d-robotics.cc, RDK X3 page (in the Raspberry Pi 4B form, whose holes it shares)' },
  'rdkx5': { name: 'D-Robotics RDK X5', maker: 'D-Robotics', cls: 'rdk-x5', soc: 'Sunrise 5 (X5)', cpu: '8 × Arm Cortex-A55 at 1.5 GHz', ai: 'BPU, 10 TOPS', gpu: '32 GFLOPS', ram: [4, 8], ramType: 'LPDDR4', ports: '4 × USB 3.0 host (Type-A), USB 2.0 device (Type-C), Gigabit Ethernet with PoE, HDMI (1080p60), 4-lane MIPI DSI, 2 × 4-lane MIPI CSI, CAN FD, micro-USB debug UART, 3.5 mm audio, 40-pin header; no on-board storage (microSD)', power: '5 V / 5 A', L: 100, W: 80, H: 20, holes: [[3.5, 3.5], [96.5, 3.5], [3.5, 76.5], [96.5, 76.5]], hole: 2.7, socMm: 17, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 12, side: 'right' }, { kind: 'usbA2', at: 32, side: 'right' }, { kind: 'usbA2', at: 50, side: 'right' }, { kind: 'usbc', at: 12, side: 'bottom' }, { kind: 'usbc', at: 26, side: 'bottom' }, { kind: 'hdmi', at: 44, side: 'bottom' }, { kind: 'microusb', at: 62, side: 'bottom' }, { kind: 'audio', at: 76, side: 'bottom' }, { kind: 'can', at: 68, side: 'right' }], header: 'pins', src: 'developer.d-robotics.cc, RDK X5 page (100 × 80 mm); hole positions typical' },
  'rdks100': { name: 'D-Robotics RDK S100', maker: 'D-Robotics', cls: 'rdk-s100', soc: 'S100 (its Nash BPU)', cpu: '6 × Arm Cortex-A78AE at 1.5 GHz, and an MCU of 4 × Cortex-R52+ at 1.2 GHz', ai: 'BPU (Nash), 80 TOPS', gpu: 'Mali-G78AE, 100 GFLOPS', ram: [12], ramType: 'LPDDR5, 96-bit; 64 GB eMMC', ports: '4 × USB 3.0, USB-C (flash and debug), 2 × Gigabit Ethernet, HDMI 1.4 (2K60), M.2 M-key (PCIe 3.0 x1), M.2 E-key (Wi-Fi), 16-pin MCU GPIO header, camera expansion header', power: '12–20 V DC', L: 120, W: 121, H: 51, holes: [[4, 4], [116, 4], [4, 117], [116, 117]], hole: 3.2, socMm: 25, rams: 3, layers: 10, edge: [{ kind: 'rj45', at: 15, side: 'right' }, { kind: 'rj45', at: 34, side: 'right' }, { kind: 'usbA2', at: 55, side: 'right' }, { kind: 'usbA2', at: 74, side: 'right' }, { kind: 'usbc', at: 15, side: 'bottom' }, { kind: 'hdmi', at: 34, side: 'bottom' }], src: 'en.d-robotics.cc, RDK S100 page (120 × 121 × 51 mm with its case); its board drawn without its case and cooler' },
  'rdks100p': { name: 'D-Robotics RDK S100P', maker: 'D-Robotics', cls: 'rdk-s100', soc: 'S100P (its Nash BPU)', cpu: '6 × Arm Cortex-A78AE at 2.0 GHz, and an MCU of 4 × Cortex-R52+ at 1.2 GHz', ai: 'BPU (Nash), 128 TOPS', gpu: 'Mali-G78AE, 100 GFLOPS', ram: [24], ramType: 'LPDDR5, 96-bit; 64 GB eMMC', ports: '4 × USB 3.0, USB-C (flash and debug), 2 × Gigabit Ethernet, HDMI 1.4 (2K60), M.2 M-key, M.2 E-key, 16-pin MCU GPIO header, camera expansion header', power: '12–20 V DC', L: 120, W: 121, H: 51, holes: [[4, 4], [116, 4], [4, 117], [116, 117]], hole: 3.2, socMm: 25, rams: 3, layers: 10, edge: [{ kind: 'rj45', at: 15, side: 'right' }, { kind: 'rj45', at: 34, side: 'right' }, { kind: 'usbA2', at: 55, side: 'right' }, { kind: 'usbA2', at: 74, side: 'right' }, { kind: 'usbc', at: 15, side: 'bottom' }, { kind: 'hdmi', at: 34, side: 'bottom' }], src: 'en.d-robotics.cc, RDK S100 page; its board drawn without its case and cooler' },
};
export const boardDef = (id: string): BoardDef => { const b = BOARD_DEFS[id]; if (!b) throw new Error(`no board kept as ${id}`); return b; };
/** The largest metric screw a hole takes with a tenth of a millimetre round it (a 2.1 mm hole an M2, 2.7 or 3.0 an M2.5,
 *  3.2 an M3: what boards' makers say their holes are for). */
export const screwFor = (hole: number): 'M3' | 'M2.5' | 'M2' => (hole >= 3.1 ? 'M3' : hole >= 2.6 ? 'M2.5' : 'M2');
/** Whether a board's layout is only approximate: its parts placed by its class's rules, not where they were measured. */
export const approx = (id: string): boolean => !boardDef(id).layout;

// ---- the parts a board is made of ---------------------------------------------------------------------------------------
type V3 = [number, number, number];
const box = (role: Solid['role'], b: V3, at: V3, mat: string, more: Partial<Solid> = {}): Solid => ({ role, shape: { box: b }, at, mat, ...more });
/** A sheet-steel shell over a body: a skin 0.3 mm thick. */
const shellOf = (L: number, H: number, W: number, t = 0.3): Solid => ({ role: 'term', shape: { box: [L, H, W] }, at: [0, H / 2, 0], mat: 'steel-low', shell: t, color: 0xc9cdd0 });
/** A flip-chip ball-grid array, its side a mm: its laminate substrate on its solder balls (0.4 mm on a 0.65 mm pitch: a
 *  fifth of the layer they stand in, π/6 · d²/p²), its die face down on it, its nickel-plated copper lid over the die. */
function fcbga(a: number): Comp[] {
  const sub = 1.0, ball = 0.3, share = (Math.PI / 6) * (0.4 / 0.65) ** 2, d = a * 0.45;
  return [
    { name: 'substrate', item: 'bga-substrate', solids: [box('core', [a, sub, a], [0, ball + sub / 2, 0], 'bt', { color: 0x3d5a3a })], at: [0, 0, 0] },
    { name: 'solder balls', item: 'solder-balls', solids: [box('lead', [a * 0.94, ball, a * 0.94], [0, ball / 2, 0], 'solder', { inBody: 0, share, color: 0xb8bcc0 })], at: [0, 0, 0] },
    { name: 'die', item: 'si-die', solids: [box('die', [d, 0.75, d], [0, ball + sub + 0.375, 0], 'silicon')], at: [0, 0, 0] },
    { name: 'heat spreader', item: 'heat-spreader', solids: [box('tab', [a * 0.8, 0.9, a * 0.8], [0, ball + sub + 0.75 + 0.45, 0], 'copper', { color: 0xc7c9cc })], at: [0, 0, 0] },
  ];
}
/** The library part a port of an unmeasured board is drawn as. */
const PORT_PART: Record<Port, string | null> = { usbA2: 'usb-a-2x2', usbA: 'usb-a-3', rj45: 'rj45', usbc: 'usb-c-16', microusb: null, hdmi: 'hdmi-a', microhdmi: 'hdmi-d', minihdmi: 'hdmi-c', audio: 'jack-3.5', can: null };
/** A port drawn by kind where its board's layout is not measured: a micro-USB socket (its spec's mouth in its family's
 *  outline), a CAN header (typical, not yet from a maker's drawing). */
function oldPort(kind: 'microusb' | 'can'): BoardPart {
  const ins = (L: number, H: number, W: number, y: number, mat = 'pbt', col = 0x222224): Solid => box('body', [L, H, W], [0, y, 0], mat, { color: col });
  const pins = (n: number, L: number, y: number, W: number): Solid[] => Array.from({ length: n }, (_, i) => box('lead', [L, 0.1, 0.4], [0, y, (i - (n - 1) / 2) * (W / n)], 'copper', { color: HUE.gold }));
  if (kind === 'microusb') return microUsbB();
  return { comp: { name: 'CAN header', item: 'terminal-header', solids: [ins(6, 6, 7.5, 3, 'pbt', 0xf2f2f2), ...pins(3, 4, 3, 5)], at: [0, 0, 0] }, size: [6, 7.5, 6], src: 'typical' };
}
/** The board itself: its FR-4 core (its own straw colour at its edges), its copper (so many layers of 35 µm, each half
 *  filled: typical), its solder mask over both faces in its colour (which weighs nothing here), its holes through all,
 *  each with its plated pad, top and bottom. */
function pcb(b: BoardDef): Comp {
  // (its pads' gold: matte where its photos show it so, bright where they show it bright (an ENIG finish))
  const gold = { color: HUE.gold, ...(b.bright ? { finish: 'bright' as const } : {}) };
  const t = b.t ?? 1.6, cu = b.layers * 0.035 * 0.5, all = [...b.holes.map(([x, z]) => ({ x, z, d: b.hole, pad: b.pad ?? b.hole + 2.5, square: false, castle: 0 })), ...(b.more ?? []).map((h) => ({ x: h.at[0], z: h.at[1], d: h.d, pad: h.pad, square: !!h.square, castle: h.castle ?? 0 }))];
  const bores = all.map((h) => ({ x: h.x - b.L / 2, z: b.W / 2 - h.z, r: h.d / 2 }));
  const mask = b.mask ?? (b.maker === 'Raspberry Pi' ? 0x1f7a3a : b.maker === 'Orange Pi' ? 0x1f2a5a : 0x1a1a1a);
  const circ = (cx: number, cz: number, r: number, n = 24): [number, number][] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cz + r * Math.sin((2 * Math.PI * i) / n)]);
  // (a flat of copper 35 µm thick, its outline in the board's own plane, drawn as the board's layers are)
  const flat = (pts: [number, number][], holes: [number, number][][], at: V3, mat = 'copper'): Solid => ({ role: 'pad', shape: { prism: { pts, L: 0.035, holes } }, at, rot: [Math.PI / 2, 0, 0], mat, ...gold });
  const ring = (h: (typeof all)[number], y: number): Solid => h.square
    ? flat([[-h.pad / 2, -h.pad / 2], [h.pad / 2, -h.pad / 2], [h.pad / 2, h.pad / 2], [-h.pad / 2, h.pad / 2]], [circ(0, 0, h.d / 2)], [h.x - b.L / 2, y + 0.0175, b.W / 2 - h.z])
    : { role: 'pad', shape: { lathe: [[h.d / 2, 0], [h.pad / 2, 0], [h.pad / 2, 0.035], [h.d / 2, 0.035], [h.d / 2, 0]] }, at: [h.x - b.L / 2, y, b.W / 2 - h.z], mat: 'copper', ...gold };
  // (each hole plated through: copper 25 µm thick on its wall under its gold, joining its pads top and bottom, so its
  // bore shows metal and not the board's layers; IPC-6012's class 2 minimum, typical of boards' plated holes)
  const barrel = (h: (typeof all)[number]): Solid => ({ role: 'pad', shape: { lathe: [[h.d / 2 - 0.025, -t - 0.04], [h.d / 2, -t - 0.04], [h.d / 2, 0.04], [h.d / 2 - 0.025, 0.04], [h.d / 2 - 0.025, -t - 0.04]] }, at: [h.x - b.L / 2, 0, b.W / 2 - h.z], mat: 'copper', ...gold });
  // (a castellated pin: the edge nearest its hole, outward n and along it d, in the board's plane; its half-hole's
  // middle on that edge)
  const edgeOf = (h: (typeof all)[number]) => { const cx = h.x - b.L / 2, cz = b.W / 2 - h.z;
    const e = [{ n: [1, 0], d: [0, 1], gap: b.L / 2 - cx }, { n: [0, 1], d: [-1, 0], gap: b.W / 2 - cz }, { n: [-1, 0], d: [0, -1], gap: cx + b.L / 2 }, { n: [0, -1], d: [1, 0], gap: cz + b.W / 2 }].sort((p, q) => p.gap - q.gap)[0]!;
    return { ...e, c: [cx + e.n[0]! * e.gap, cz + e.n[1]! * e.gap] as [number, number] }; };
  // (its half-hole, into the board from the edge: from c − r·d round through c − r·n to c + r·d)
  const bite = (c: [number, number], n: number[], d: number[], r: number, k = 10): [number, number][] => Array.from({ length: k + 1 }, (_, i) => { const f = (Math.PI * i) / k; return [c[0] - r * (d[0]! * Math.cos(f) + n[0]! * Math.sin(f)), c[1] - r * (d[1]! * Math.cos(f) + n[1]! * Math.sin(f))]; });
  const castles = all.filter((h) => h.castle > 0).map((h) => ({ h, ...edgeOf(h) }));
  // (a board with rounded corners, as its drawing gives them, or castellated pins: each layer its outline, the corners
  // arcs, its castellations bitten out of its edges, its holes cut in it; else a slab drilled)
  const r = b.corner ?? 0, arc = (cx: number, cz: number, a0: number): [number, number][] => Array.from({ length: r > 0 ? 7 : 1 }, (_, i) => { const a = a0 + (i / 6) * (Math.PI / 2); return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });
  // (each edge's bites in the order it is gone round: up the right, leftward along the top, down the left, rightward
  // along the bottom)
  const along = (nx: number, nz: number): [number, number][] => castles.filter((q) => q.n[0] === nx && q.n[1] === nz).sort((p, q) => (p.c[0] - q.c[0]) * q.d[0]! + (p.c[1] - q.c[1]) * q.d[1]!).flatMap((q) => bite(q.c, q.n, q.d, q.h.castle / 2));
  const outline: [number, number][] = [...arc(b.L / 2 - r, -b.W / 2 + r, -Math.PI / 2), ...along(1, 0), ...arc(b.L / 2 - r, b.W / 2 - r, 0), ...along(0, 1), ...arc(-b.L / 2 + r, b.W / 2 - r, Math.PI / 2), ...along(-1, 0), ...arc(-b.L / 2 + r, -b.W / 2 + r, Math.PI), ...along(0, -1)];
  const holes = bores.map((h) => circ(h.x, h.z, h.r));
  const layer = (role: Solid['role'], th: number, y: number, mat: string, more: Partial<Solid>): Solid => r > 0 || castles.length
    ? { role, shape: { prism: { pts: outline, L: th, holes } }, at: [0, y, 0], rot: [Math.PI / 2, 0, 0], mat, ...more }
    : box(role, [b.L, th, b.W], [0, y, 0], mat, { ...more, bores });
  // (a castellated pin's pad run out from its hole to its half-hole, as wide as its pad, the hole's outer half left
  // clear; and the half-hole's wall plated, 25 µm, as its hole's is)
  const lip = (q: (typeof castles)[number], y: number): Solid => { const { h, n, d } = q, e = Math.hypot(q.c[0] - (h.x - b.L / 2), q.c[1] - (b.W / 2 - h.z)), w = h.pad / 2, rh = h.d / 2, rc = h.castle / 2;
    const P = (u: number, v: number): [number, number] => [u * d[0]! + v * n[0]!, u * d[1]! + v * n[1]!];
    const pts = [P(-w, 0), P(-rh, 0), ...Array.from({ length: 9 }, (_, i) => P(-rh * Math.cos((Math.PI * (i + 1)) / 10), rh * Math.sin((Math.PI * (i + 1)) / 10))), P(rh, 0), P(w, 0), P(w, e), P(rc, e), ...Array.from({ length: 9 }, (_, i) => P(rc * Math.cos((Math.PI * (i + 1)) / 10), e - rc * Math.sin((Math.PI * (i + 1)) / 10))), P(-rc, e), P(-w, e)];
    return flat(pts, [], [h.x - b.L / 2, y + 0.0175, b.W / 2 - h.z]); };
  const wall = (q: (typeof castles)[number]): Solid => { const rc = q.h.castle / 2, o = bite(q.c, q.n, q.d, rc), i = bite(q.c, q.n, q.d, rc - 0.025).reverse();
    return { role: 'pad', shape: { prism: { pts: [...o, ...i], L: t + 0.08 } }, at: [0, -t / 2, 0], rot: [Math.PI / 2, 0, 0], mat: 'copper', ...gold }; };
  // (its inner copper pulled back from the board's edge, as board houses ask (0.25 mm or more; 0.4 here, typical, and
  // clear of its castellations' bites), so none shows at the cut edge: an outline inset so far, its corners round the
  // board's own corners' middles, its holes those wholly inside it)
  const e = Math.max(0.4, ...castles.map((q) => q.h.castle / 2 + 0.15)), m = Math.max(r, e), ri = m - e;
  const ia = (cx: number, cz: number, a0: number): [number, number][] => Array.from({ length: ri > 0 ? 7 : 1 }, (_, i) => { const a = a0 + (i / 6) * (Math.PI / 2); return [cx + ri * Math.cos(a), cz + ri * Math.sin(a)]; });
  const inner: [number, number][] = [...ia(b.L / 2 - m, -b.W / 2 + m, -Math.PI / 2), ...ia(b.L / 2 - m, b.W / 2 - m, 0), ...ia(-b.L / 2 + m, b.W / 2 - m, Math.PI / 2), ...ia(-b.L / 2 + m, -b.W / 2 + m, Math.PI)];
  const innerHoles = bores.filter((h) => Math.abs(h.x) + h.r < b.L / 2 - e - 0.05 && Math.abs(h.z) + h.r < b.W / 2 - e - 0.05).map((h) => circ(h.x, h.z, h.r));
  return { name: 'circuit board', item: 'pcb-bare', at: [0, 0, 0], solids: [
    layer('core', t - cu, -t / 2, 'fr4', { color: 0xc4a86a }),
    { role: 'frame', shape: { prism: { pts: inner, L: cu, holes: innerHoles } }, at: [0, -t / 2, 0], rot: [Math.PI / 2, 0, 0], mat: 'copper', inBody: 0 },
    layer('film', 0.02, 0.01, '', { color: mask }), layer('film', 0.02, -t - 0.01, '', { color: mask }),
    ...all.flatMap((h) => [...(h.pad > h.d ? [ring(h, 0.005), ring(h, -t - 0.04)] : []), barrel(h)]),
    ...castles.flatMap((q) => [lip(q, 0.005), lip(q, -t - 0.04), wall(q)]),
    // (the copper its photo shows under the mask, painted on the mask's top: nothing to weigh, the copper is in the board)
    ...(b.copper ? [box('film', [b.L, 0.001, b.W], [0, 0.0205, 0], '', { paint: { png: b.copper.png, ink: b.copper.hue } })] : []),
    // (and its silkscreen over all, the ink where its photo shows it: 4 µm over the copper's paint, so the two do not
    // fight for the same depth seen from afar)
    ...(b.ink ? [box('film', [b.L, 0.001, b.W], [0, 0.0255, 0], '', { paint: { png: b.ink.png, ink: Number(b.ink.ink) } })] : []),
  ] };
}
/** Chip resistors and capacitors round the system-on-chip (0402s, ten of each, as the inventory's own part says): on a
 *  board not yet measured, where its class has them; a measured board's small passives are not placed one by one yet. */
function passives(cx: number, cz: number, r: number): Comp {
  const kids: Comp[] = [];
  // (each its layers by the inventory's parts: a resistor's substrate, film, overcoat and terminations; a capacitor's
  // body and terminations)
  const ITEM: Partial<Record<Solid['role'], string>> = { film: 'resistive-film', glaze: 'overglaze', term: 'chip-termination' };
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * 2 * Math.PI, res = i % 2 === 0, ss = chipSolids(res ? 'resistor' : 'capacitor', 1, 0.5, res ? 0.35 : 0.5);
    kids.push({ name: res ? 'chip resistor' : 'chip capacitor', item: res ? 'chip-resistor' : 'chip-capacitor', at: [cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r], turn: a, kids: ss.map((x): Comp => ({ name: x.role === 'body' ? (res ? 'substrate' : 'body') : x.role, item: x.role === 'body' ? (res ? 'chip-substrate' : 'mlcc-body') : ITEM[x.role]!, solids: [x], at: [0, 0, 0] })) });
  }
  return { name: 'chip resistors and capacitors', item: 'smd-passives', at: [0, 0, 0], kids };
}
/** EIA's chip cases by their length, mm. */
const CASE_BY_L: Record<string, string> = { '0.6': '0201', '1': '0402', '1.6': '0603', '2': '0805', '3.2': '1206' };
/** A small part drawn from its row in a photo's table: a chip capacitor or resistor in its EIA case (a capacitor its
 *  case's thickness by the library's MLCC table, a resistor its chip table's), a small transistor in its JEDEC
 *  package, a small no-lead chip, a moulded inductor (its height typical: about half its width, 0.8–1.5 mm, as moulded
 *  power inductors of these sizes are). Coloured as the photo shows them (`SMALL_HUE`: the median of their middles on
 *  the Orange Pi 5's photo), their ends tin. */
export const SMALL_HUE = { cap: 0xa69a8d, inductor: 0xab9583, resistorTop: 0x1d1e22, substrate: 0xf0efea, tin: 0xb9bcbf };
export function smallPart([k, , , L, W, , pk]: SmallRow): Comp {
  if (k === 'c' || k === 'p' || k === 'r') {
    const res = k === 'r', cs = CASE_BY_L[String(L)]; if (!cs) throw new Error(`no EIA case ${L} mm long`);
    const [l, w, t] = res ? chipCase(cs)! : mlccCase(cs), ss = chipSolids(res ? 'resistor' : 'capacitor', l, w, t);
    const ITEM: Partial<Record<Solid['role'], string>> = { film: 'resistive-film', glaze: 'overglaze', term: 'chip-termination' };
    return { name: `chip ${res ? 'resistor' : 'capacitor'} ${cs}${k === 'p' ? ' (its kind not seen in its photo: drawn as the commoner, a capacitor)' : ''}`, item: res ? 'chip-resistor' : 'chip-capacitor', at: [0, 0, 0],
      kids: ss.map((x): Comp => { const color = x.role === 'term' ? SMALL_HUE.tin : x.role === 'glaze' ? SMALL_HUE.resistorTop : x.role === 'body' ? (res ? SMALL_HUE.substrate : SMALL_HUE.cap) : undefined;
        return { name: x.role === 'body' ? (res ? 'substrate' : 'body') : x.role, item: x.role === 'body' ? (res ? 'chip-substrate' : 'mlcc-body') : ITEM[x.role]!, solids: [color ? { ...x, color } : x], at: [0, 0, 0] }; }) };
  }
  // (a two-terminal moulded package, SOD-123F or SMA, is a diode: what is made in it)
  if (k === 't' && (pk === 'SOD-123F' || pk === 'SMA')) return chip(pk, `diode (${pk}, by its package; fits by its size)`, '', 'diode-smd');
  if (k === 't') return chip(pk ?? 'SOT-23', `small transistor or regulator (${pk}, fits by its size)`, '', 'sot-package');
  if (k === 'q') return chip(`DFN-6-${L}x${W}`, `small no-lead chip (${L} × ${W} mm as its photo shows; drawn as a DFN-6, fits by its size)`, '', 'dfn-package');
  return inductor(L, W, +Math.min(1.5, Math.max(0.8, 0.5 * W)).toFixed(2), '', SMALL_HUE.inductor);
}
/** Placed on a board: a part's footprint middle at (x, z) of the drawing, its front facing dir degrees, on top or under. */
function place(b: BoardDef, c: Comp, x: number, z: number, dir = 0, under = false, name?: string): Comp {
  const t = b.t ?? 1.6, a = (dir * Math.PI) / 180;
  return { ...c, ...(name ? { name } : {}), at: [x - b.L / 2, under ? -t : 0, b.W / 2 - z], turn: under ? -a : a, ...(under ? { under: true } : {}) };
}
const asComp = (p: BoardPart | Comp): Comp => ('comp' in p ? p.comp : p);
/** What a part is in a layout, drawn. */
function drawn(pl: Place): Comp {
  if (typeof pl.part === 'function') return asComp(pl.part());
  const f = BOARD_PARTS[pl.part]; if (!f) throw new Error(`no board part kept as ${pl.part}`);
  return f().comp;
}
/** Words printed on the board's top: white ink on its mask, nothing to weigh. */
function silk(b: BoardDef, w: Silk): Comp {
  const a = ((w.dir ?? 0) * Math.PI) / 180, len = Math.max(w.h * 0.62 * w.text.length, w.h);
  return { name: `printed "${w.text}"`, solids: [box('mark', [len / 0.86, 0.01, w.h / 0.42], [0, 0.025, 0], '', { color: b.mask ?? 0x1f2a5a, text: w.text, ink: 0xf4f4f0, inkOnly: true })], at: [w.at[0] - b.L / 2, 0, b.W / 2 - w.at[1]], turn: a };
}
/** Through-hole joints, as a board's wave or hand soldering leaves them: every lead, leg or tail of a part on its top
 *  that goes down through the board gets its plated hole's pad under it and solder round it, a fillet wetted from the
 *  pad up the lead, concave between (IPC-A-610's target fillet), as high as the pad stands out past the lead and no more
 *  than three quarters of what stands out under the board. Its hole the lead's diagonal and 0.2 mm, its pad the hole
 *  and 0.6 mm (IPC-2222's level B, as KiCad's footprints have them: a header pin's 1.0 and 1.7 mm, a USB contact's 0.92
 *  and 1.5). Found from the parts as drawn, so a part given a tail gets its joint. */
export const JOINTS = 'through-hole solder joints';
function thtJoints(b: BoardDef, parts: Comp[]): { pads: Solid[]; joints: Comp } | null {
  const t = b.t ?? 1.6, found: { x: number; z: number; r: number; out: number }[] = [];
  const walk = (c: Comp, up: (q: V3) => V3): void => {
    if (c.under) return; // (a part under the board has its joints on top: none of these yet)
    const mine = (q: V3): V3 => { const r = turnBy(q, [0, c.turn ?? 0, 0]); return up([r[0] + c.at[0], r[1] + c.at[1], r[2] + c.at[2]]); };
    for (const sd of c.solids ?? []) {
      if (sd.role !== 'lead' && sd.role !== 'term') continue;
      const ps = solidCorners(sd).map(mine), ys = ps.map((q) => q[1]), xs = ps.map((q) => q[0]), zs = ps.map((q) => q[2]);
      if (Math.min(...ys) > -t - 0.1 || Math.max(...ys) < 0) continue;
      const dx = Math.max(...xs) - Math.min(...xs), dz = Math.max(...zs) - Math.min(...zs);
      found.push({ x: (Math.max(...xs) + Math.min(...xs)) / 2, z: (Math.max(...zs) + Math.min(...zs)) / 2, r: Math.hypot(dx, dz) / 2, out: -t - Math.min(...ys) });
    }
    for (const k of c.kids ?? []) walk(k, mine);
  };
  for (const c of parts) walk(c, (q) => q);
  if (!found.length) return null;
  const pads: Solid[] = [], joints: Comp[] = [];
  found.forEach((f, i) => {
    const rh = f.r + 0.1, rp = rh + 0.3, ri = f.r * 0.7, h = Math.min(0.75 * f.out, rp - ri), at: V3 = [f.x, -t - 0.04, f.z];
    pads.push({ role: 'pad', shape: { lathe: [[rh, 0], [rp, 0], [rp, 0.035], [rh, 0.035], [rh, 0]] }, at, mat: 'copper', color: HUE.gold });
    // (its fillet: from the lead low down, a quarter round concave out to the pad's edge)
    const arc = Array.from({ length: 7 }, (_, k): [number, number] => { const a = (Math.PI / 2) * (1 - k / 6); return [rp - (rp - ri) * Math.sin(a), -h * (1 - Math.cos(a))]; });
    joints.push({ name: `solder joint ${i + 1}`, item: 'solder-joint', at: [0, 0, 0], solids: [{ role: 'lead', shape: { lathe: [...arc, [ri, 0], arc[0]!] }, at, mat: 'solder', color: 0xc9cdd1 }] });
  });
  return { pads, joints: { name: JOINTS, at: [0, 0, 0], kids: joints } };
}
/** Every part of a board, placed, and the joints its through-hole parts are soldered by. */
export function boardComps(id: string): Comp[] {
  const out = placedComps(id), j = thtJoints(boardDef(id), out.slice(1));
  return j ? [{ ...out[0]!, solids: [...out[0]!.solids!, ...j.pads] }, ...out.slice(1), j.joints] : out;
}
/** Every part of a board, placed. */
function placedComps(id: string): Comp[] {
  const b = boardDef(id), out: Comp[] = [pcb(b)];
  if (b.layout) {
    for (const pl of b.layout) out.push(place(b, drawn(pl), pl.at[0], pl.at[1], pl.dir ?? 0, pl.under ?? false, pl.name));
    for (const r of b.small ?? []) out.push(place(b, smallPart(r), r[1], r[2], r[5]));
    for (const w of b.silk ?? []) out.push(silk(b, w));
    return out;
  }
  // ---- a board not yet measured: its parts by its class's rules (approximate, and said so) ----
  const pico = b.cls === 'pico';
  // its system-on-chip (on a Pico the chip itself, a QFN), its memory beside it
  const soc: [number, number] = pico ? [27, 10.5] : b.cls === 'zero' ? [26, 15] : b.cls === 'cm' ? [24, 20] : [b.L * 0.36, b.W * 0.55];
  if (pico) out.push(place(b, chip(b.soc.startsWith('RP2350') ? 'QFN-60' : 'QFN-56', b.soc.split(' ')[0]!), soc[0], soc[1]));
  else out.push(place(b, { name: b.soc, item: 'soc-package', kids: fcbga(b.socMm), at: [0, 0, 0] }, soc[0], soc[1]));
  for (let k = 0; k < b.rams; k++) out.push(place(b, lpddr(10, 14.5), soc[0] + b.socMm / 2 + 9 + k * 12, soc[1], 90));
  if (!pico) { const pc = passives(0, 0, b.socMm * 0.62 + 1.5); out.push(place(b, pc, soc[0], soc[1])); }
  // its power chip, and its interface chips where it has a USB or Ethernet chip of its own
  out.push(place(b, chip(pico ? 'QFN-16' : 'QFN-40', pico ? 'buck-boost regulator' : 'power chip'), pico ? 12 : soc[0] - b.socMm / 2 - 7, pico ? 6 : soc[1] - 8));
  if (pico) out.push(place(b, chip('SOIC-8', 'QSPI flash'), 17, 10.5));
  if (b.cls !== 'cm' && !pico) out.push(place(b, chip('QFN-48', 'interface chip'), b.L - 30, b.W * 0.4));
  // a radio under its shield can (a Pico W's at its far end)
  if (/Wi-Fi|CYW43439/.test(b.ports + b.soc)) out.push(place(b, { name: 'Wi-Fi module', item: 'wifi-module', at: [0, 0, 0], kids: [{ name: 'shield can', solids: [shellOf(pico ? 10 : 11, 1.6, pico ? 10 : 11, 0.2)], at: [0, 0, 0] }, { name: 'radio die', item: 'si-die', solids: [box('die', [4, 0.6, 4], [0, 0.4, 0], 'silicon')], at: [0, 0, 0] }] }, pico ? 42 : 8, b.W * 0.5));
  // its ports along its edges, their fronts out at the edge (an RJ45 and a USB stack standing proud of it)
  for (const e of b.edge) {
    const key = PORT_PART[e.kind], bp = key ? BOARD_PARTS[key]!() : oldPort(e.kind as 'microusb' | 'can'), d = bp.size[0], over = e.kind === 'rj45' || e.kind.startsWith('usbA') ? 2 : 0.5;
    const [x, z, dir] = e.side === 'right' ? [b.L - d / 2 + over, e.at, 0] : e.side === 'left' ? [d / 2 - over, e.at, 180] : e.side === 'bottom' ? [e.at, d / 2 - over, 270] : [e.at, b.W - d / 2 + over, 90];
    out.push(place(b, bp.comp, x, z, dir));
  }
  if (b.header === 'pins') out.push(place(b, pinHeader(2, 20).comp, 32.5 * (b.L / 85), b.W - 3.5, 0, false, '40-pin header'));
  if (!pico && b.cls !== 'cm') out.push(place(b, BOARD_PARTS['microsd-push']!().comp, 7.5, b.W / 2, 180, true));
  // (an M.2 slot under the board, its card's standoff beside it: a body of moulded contacts 22 mm wide (typical of the
  // M.2 connectors' drawings); an eMMC module's socket, two fine-pitch mezzanines; its buttons, tact switches)
  for (const x of b.extras ?? []) {
    if (x === 'm2' || x === 'm2e') out.push(place(b, m2Socket(x), x === 'm2' ? b.L * 0.5 : b.L * 0.75, b.W * 0.3, 0, true));
    if (x === 'emmc') for (const dz of [-3, 3]) out.push(place(b, { name: 'eMMC socket', item: 'b2b-connector', at: [0, 0, 0], solids: [box('body', [12, 1.5, 2.5], [0, 0.75, 0], 'pbt', { color: 0xf2f2f2 }), ...Array.from({ length: 30 }, (_, i) => box('lead', [0.2, 1.2, 0.3], [(i - 14.5) * 0.4, 0.6, 1.0], 'copper', { color: HUE.gold }))] }, b.L * 0.3, b.W * 0.5 + dz, 0, true));
    if (x === 'buttons') for (const k of [0, 1, 2]) out.push(place(b, BOARD_PARTS['tact-kmr2']!().comp, 4 + k * 5, b.W - 10, 0, false, 'button'));
  }
  if (b.cls === 'cm') for (const z of [8, 32]) out.push(place(b, { name: 'board-to-board connector', item: 'b2b-connector', solids: [box('body', [35, 1.5, 3], [0, 0.75, 0], 'pbt', { color: 0xf2f2f2 }), ...Array.from({ length: 50 }, (_, i) => box('lead', [0.2, 1.2, 0.3], [(i - 24.5) * 0.4 * 1.7, 0.6, 1.2], 'copper', { color: HUE.gold }))], at: [0, 0, 0] }, b.L / 2, z, 0, true));
  return out;
}
/** An M.2 socket by the PCI-SIG M.2 spec: 75 positions at 0.5 mm in two rows, the lower row staggered 0.25 mm from the
 *  upper, the eight of its key left out (M: 59–66, E: 24–31), so 67 contacts; 2.25 mm tall (the spec's H2.3, for a
 *  single-sided card); its body 22 mm wide and 6 mm deep (typical of makers' SMT M.2 sockets), its card going in toward
 *  +z, the card's edge 2.8 mm inside its mouth (typical); each contact a spring in its slot and a tail out of its back. */
export function m2Socket(key: 'm2' | 'm2e'): Comp {
  const W = 22, H = 2.25, D = 6.0, [k0, k1] = key === 'm2' ? [59, 66] : [24, 31];
  const pins = Array.from({ length: 75 }, (_, i) => i + 1).filter((n) => n < k0 || n > k1);
  return { name: key === 'm2' ? 'M.2 M-key socket' : 'M.2 E-key socket', item: 'm2-socket', at: [0, 0, 0], solids: [box('body', [W, H, D], [0, H / 2, 0], 'pbt', { color: 0x1a1a1a }),
    ...pins.flatMap((n): Solid[] => { const top = n % 2 === 0, x = (n - 38) * 0.25;
      return [box('lead', [0.2, 0.08, 2.6], [x, top ? H * 0.66 : H * 0.3, D / 2 - 1.5], 'phosphor-bronze', { color: HUE.gold }), box('lead', [0.2, 0.1, top ? 1.6 : 0.9], [x, 0.05, -D / 2 - (top ? 0.8 : 0.45)], 'phosphor-bronze', { color: HUE.gold })]; })] };
}

// ---- weighing, and what it is made of -------------------------------------------------------------------------------
/** Every solid of a board with its own mass, g: each part's solids weighed together (what lies inside its body taken
 *  out of it), a ball layer by the share of it that is balls, an RJ45's moulding by the share that is solid. */
export function compMasses(c: Comp): { c: Comp; g: number }[] {
  const own = c.solids ? solidMasses(c.solids).reduce((g, m) => g + m.g, 0) : 0;
  return [{ c, g: own }, ...(c.kids ?? []).flatMap(compMasses)];
}
export const boardMass = (id: string): number => boardComps(id).flatMap(compMasses).reduce((g, m) => g + m.g, 0);
/** What a board is made of, in the inventory's words: each of its parts by its item, counted. */
export function boardMakeup(id: string): string {
  // (a group of its own, its joints, by what is in it)
  const n = new Map<string, number>(); for (const c of boardComps(id)) for (const k of c.item ? [c] : (c.kids ?? [])) if (k.item) n.set(k.item, (n.get(k.item) ?? 0) + 1);
  return [...n].map(([k, v]) => (v > 1 ? `${k}*${v}` : k)).join(' ');
}

// ---- a board's layout as its drawing, to check against its photos ---------------------------------------------------
type Euler = [number, number, number];
/** A point turned by a solid's Euler angles (x, then y, then z, as the drawing turns it). */
function turnBy(p: V3, r: Euler): V3 {
  let [x, y, z] = p; const [a, b, c] = r;
  [x, y] = [x * Math.cos(c) - y * Math.sin(c), x * Math.sin(c) + y * Math.cos(c)];
  [x, z] = [x * Math.cos(b) + z * Math.sin(b), -x * Math.sin(b) + z * Math.cos(b)];
  [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  return [x, y, z];
}
/** What a solid takes up in its part's own frame: the corners of its shape's box, turned and moved. */
function solidCorners(s: Solid): V3[] {
  const sh = s.shape; let lo: V3, hi: V3;
  if ('box' in sh) { const [a, b, c] = sh.box; lo = [-a / 2, -b / 2, -c / 2]; hi = [a / 2, b / 2, c / 2]; }
  else if ('cyl' in sh) { const [r, h] = sh.cyl; lo = [-r, -h / 2, -r]; hi = [r, h / 2, r]; }
  else if ('lathe' in sh) { const r = Math.max(...sh.lathe.map((q) => q[0])), ys = sh.lathe.map((q) => q[1]); lo = [-r, Math.min(...ys), -r]; hi = [r, Math.max(...ys), r]; }
  else if ('prism' in sh) { const xs = sh.prism.pts.map((q) => q[0]), ys = sh.prism.pts.map((q) => q[1]); lo = [Math.min(...xs), Math.min(...ys), -sh.prism.L / 2]; hi = [Math.max(...xs), Math.max(...ys), sh.prism.L / 2]; }
  else { const ps = sh.tube.pts, r = sh.tube.r; return ps.flatMap((q) => [[q[0] - r, q[1] - r, q[2] - r], [q[0] + r, q[1] + r, q[2] + r]] as V3[]); }
  const out: V3[] = [];
  for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) { const q = s.rot ? turnBy([x, y, z], s.rot) : ([x, y, z] as V3); out.push([q[0] + s.at[0], q[1] + s.at[1], q[2] + s.at[2]]); }
  return out;
}
export const compCorners = (c: Comp): V3[] => [...(c.solids ?? []).flatMap(solidCorners), ...(c.kids ?? []).flatMap((k) => compCorners(k).map((q) => { const r = turnBy(q, [k.under ? Math.PI : 0, k.turn ?? 0, 0]); return [r[0] + k.at[0], r[1] + k.at[1], r[2] + k.at[2]] as V3; }))];
/** A board's parts as its drawing has them, seen from above: each part's footprint (its corners, mm from the board's
 *  lower-left corner, z up the drawing), its height, top or under, and how its place was found: for
 *  tools/measure/photo.py to draw over its calibrated photos. */
export function boardMap(id: string): { board: string; L: number; W: number; approx: boolean; parts: { name: string; item?: string; side: 'top' | 'under'; corners: [number, number][]; h: number; /** how far it stands above the board's top face, mm (its tails under it not counted) */ top: number; /** its solids' corners, x, z (mm from the lower-left) and height */ pts: [number, number, number][]; how?: string }[]; holes: { at: [number, number]; d: number; pad: number }[]; silk: { text: string; corners: [number, number][] }[] } {
  const b = boardDef(id), how = new Map((b.layout ?? []).map((pl) => [pl.name, pl.how]));
  const parts = boardComps(id).slice(1).filter((c) => !c.name.startsWith('printed') && c.name !== JOINTS).map((c) => {
    const ps = compCorners(c), xs = ps.map((q) => q[0]), ys = ps.map((q) => q[1]), zs = ps.map((q) => q[2]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    // (its box in its own frame, turned as it is placed, into the drawing's frame)
    const corners = ([[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as [number, number][]).map(([x, z]) => { const r = turnBy([x, 0, z], [c.under ? Math.PI : 0, c.turn ?? 0, 0]); return [+(r[0] + c.at[0] + b.L / 2).toFixed(3), +(b.W / 2 - (r[2] + c.at[2])).toFixed(3)] as [number, number]; });
    // (and every corner of its solids where it stands, each at its own height, so a photo's view of what it hides is
    // its body's lean and not its low tails raised to its top)
    const pts = [...new Set(ps.map((q) => { const r = turnBy(q, [c.under ? Math.PI : 0, c.turn ?? 0, 0]); return `${(r[0] + c.at[0] + b.L / 2).toFixed(2)},${(b.W / 2 - (r[2] + c.at[2])).toFixed(2)},${(r[1] + c.at[1]).toFixed(2)}`; }))].map((k) => k.split(',').map(Number) as [number, number, number]);
    return { name: c.name, ...(c.item ? { item: c.item } : {}), side: c.under ? 'under' as const : 'top' as const, corners, h: +(Math.max(...ys) - Math.min(...ys)).toFixed(2), top: +Math.max(0, Math.max(...ys)).toFixed(2), pts, ...(how.get(c.name) ? { how: how.get(c.name)! } : {}) };
  });
  const holes = [...b.holes.map(([x, z]) => ({ at: [x, z] as [number, number], d: b.hole, pad: b.pad ?? b.hole + 2.5 })), ...(b.more ?? []).map((h) => ({ at: h.at, d: h.d, pad: h.pad }))];
  // (its printed words' boxes, each its letters' height by their run, turned as printed)
  const silk = (b.silk ?? []).map((w) => { const a = ((w.dir ?? 0) * Math.PI) / 180, len = Math.max(w.h * 0.62 * w.text.length, w.h) / 2 + 0.3, hh = w.h / 2 + 0.3;
    return { text: w.text, corners: ([[-len, -hh], [len, -hh], [len, hh], [-len, hh]] as [number, number][]).map(([u, v]) => [+(w.at[0] + u * Math.cos(a) - v * Math.sin(a)).toFixed(3), +(w.at[1] + u * Math.sin(a) + v * Math.cos(a)).toFixed(3)] as [number, number]) }; });
  return { board: b.name, L: b.L, W: b.W, approx: !b.layout, parts, holes, silk };
}
