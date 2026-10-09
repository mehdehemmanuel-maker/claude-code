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
import { BOARD_PARTS, chip, fccsp, hdmi, HUE, inductor, lpddr, micElectret, pinHeader, type BoardPart } from './boardparts';
import { chipCase, mlccCase } from './kinds/electrical';
import { OPI5_SMALL } from './sbc-opi5-small';

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
  /** its other holes, measured: x, z, bore and the pad round it, mm */ more?: { at: [number, number]; d: number; pad: number; why: string }[];
  /** its holes' pads, mm across (where measured) */ pad?: number;
  /** its solder mask's colour, as its photos show it; its silkscreen's words, where measured */ mask?: number; silk?: Silk[];
  /** which photos its layout was measured from */ photos?: string;
  /** its small parts as its photo shows them, found by tools/measure/photo.py small (see the table's own notes) */ small?: SmallRow[];
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
/** Every board kept: its maker's figures, its source. */
export const BOARD_DEFS: Record<string, BoardDef> = {
  'pi5': { name: 'Raspberry Pi 5', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2712', cpu: '4 × Arm Cortex-A76 at 2.4 GHz', gpu: 'VideoCore VII', ram: [1, 2, 4, 8, 16], ramType: 'LPDDR4X-4267', ports: '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet (PoE+ with a HAT), 2 × micro-HDMI (4Kp60), 2 × 4-lane MIPI camera/display, PCIe 2.0 x1, Wi-Fi 802.11ac, Bluetooth 5.0, 40-pin header, RTC, power button', power: '5 V / 5 A over USB-C (Power Delivery)', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 16, rams: 1, layers: 6, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29.1, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'usbc', at: 11.2, side: 'bottom' }, { kind: 'microhdmi', at: 25.8, side: 'bottom' }, { kind: 'microhdmi', at: 39.2, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 5 product page and mechanical drawing RP-008347' },
  'pi4b': { name: 'Raspberry Pi 4 Model B', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2711', cpu: '4 × Arm Cortex-A72 at 1.8 GHz', gpu: 'VideoCore VI', ram: [1, 2, 4, 8], ramType: 'LPDDR4-3200', ports: '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet, 2 × micro-HDMI (4Kp60), MIPI CSI and DSI, Wi-Fi 802.11ac, Bluetooth 5.0, 40-pin header, 3.5 mm AV', power: '5 V / 3 A over USB-C', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 17, rams: 1, layers: 6, edge: [{ kind: 'usbA2', at: 9, side: 'right' }, { kind: 'usbA2', at: 27, side: 'right' }, { kind: 'rj45', at: 45.75, side: 'right' }, { kind: 'usbc', at: 11.2, side: 'bottom' }, { kind: 'microhdmi', at: 26, side: 'bottom' }, { kind: 'microhdmi', at: 39.5, side: 'bottom' }, { kind: 'audio', at: 54, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 4 Model B product brief and mechanical drawing' },
  'pi3bplus': { name: 'Raspberry Pi 3 Model B+', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2837B0', cpu: '4 × Arm Cortex-A53 at 1.4 GHz', gpu: 'VideoCore IV', ram: [1], ramType: 'LPDDR2', ports: '4 × USB 2.0, Gigabit Ethernet over USB 2.0 (300 Mbit/s), full-size HDMI, MIPI CSI and DSI, Wi-Fi 802.11ac, Bluetooth 4.2, 40-pin header, 3.5 mm AV', power: '5 V / 2.5 A over micro-USB', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 14, rams: 1, layers: 6, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'microusb', at: 10.6, side: 'bottom' }, { kind: 'hdmi', at: 32, side: 'bottom' }, { kind: 'audio', at: 53.5, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 3 Model B+ product brief and mechanical drawing' },
  'pizero2w': { name: 'Raspberry Pi Zero 2 W', maker: 'Raspberry Pi', cls: 'zero', soc: 'Broadcom BCM2710A1 (in the RP3A0 package with its memory)', cpu: '4 × Arm Cortex-A53 at 1 GHz', gpu: 'VideoCore IV', ram: [0.5], ramType: 'LPDDR2', ports: 'mini-HDMI, micro-USB OTG, Wi-Fi 802.11b/g/n, Bluetooth 4.2, CSI-2 camera, 40-pin header (unpopulated)', power: '5 V / 2.5 A over micro-USB', L: 65, W: 30, H: 5.2, g: 10, holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 26.5], [61.5, 26.5]], hole: 2.7, socMm: 12, rams: 0, layers: 6, edge: [{ kind: 'minihdmi', at: 12.4, side: 'bottom' }, { kind: 'microusb', at: 41.4, side: 'bottom' }, { kind: 'microusb', at: 54, side: 'bottom' }], header: 'holes', src: 'Raspberry Pi Zero 2 W product brief RP-008359; its weight, 10 g, from PiCockpit' },
  'cm5': { name: 'Raspberry Pi Compute Module 5', maker: 'Raspberry Pi', cls: 'cm', soc: 'Broadcom BCM2712', cpu: '4 × Arm Cortex-A76 at 2.4 GHz', gpu: 'VideoCore VII', ram: [2, 4, 8, 16], ramType: 'LPDDR4X-4267', ports: 'two 100-pin board-to-board connectors (to its carrier), optional eMMC and Wi-Fi', power: '5 V from its carrier', L: 55, W: 40, H: 4.7, holes: [[3.5, 3.5], [51.5, 3.5], [3.5, 36.5], [51.5, 36.5]], hole: 2.7, socMm: 16, rams: 1, layers: 10, edge: [], src: 'Raspberry Pi Compute Module 5 datasheet RP-008180 (four M2.5 holes inset 3.5 mm)' },
  'pico1': { name: 'Raspberry Pi Pico', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2040 (QFN-56, 7 × 7 mm)', cpu: '2 × Arm Cortex-M0+ at 133 MHz', ram: [0], ramType: '264 KB SRAM, 2 MB QSPI flash', ports: 'micro-USB 1.1, 26 GPIO (3 ADC), 2 × UART, 2 × SPI, 2 × I²C, 16 PWM, 8 PIO state machines; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico datasheet' },
  'pico1w': { name: 'Raspberry Pi Pico W', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2040 (QFN-56) and Infineon CYW43439', cpu: '2 × Arm Cortex-M0+ at 133 MHz', ram: [0], ramType: '264 KB SRAM, 2 MB QSPI flash', ports: 'micro-USB, 26 GPIO, Wi-Fi 802.11n (2.4 GHz), Bluetooth 5.2; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico W datasheet' },
  'pico2': { name: 'Raspberry Pi Pico 2', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2350 (QFN-60, 7 × 7 mm)', cpu: '2 × Arm Cortex-M33 or 2 × Hazard3 RISC-V at 150 MHz', ram: [0], ramType: '520 KB SRAM, 4 MB QSPI flash', ports: 'micro-USB 1.1, 26 GPIO, 12 PIO state machines; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico 2 datasheet' },
  'pico2w': { name: 'Raspberry Pi Pico 2 W', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2350 (QFN-60) and Infineon CYW43439', cpu: '2 × Arm Cortex-M33 or 2 × Hazard3 RISC-V at 150 MHz', ram: [0], ramType: '520 KB SRAM, 4 MB QSPI flash', ports: 'micro-USB, 26 GPIO, Wi-Fi 802.11n, Bluetooth 5.2; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico 2 W datasheet' },
  'opi5': { name: 'Orange Pi 5', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588S (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS (INT4/INT8/INT16)', gpu: 'Mali-G610', ram: [4, 8, 16, 32], ramType: 'LPDDR4/4X',
    ports: 'USB 3.0 (the upper port of a stack whose lower is USB 2.0), USB 2.0 (stood on its side; shared with the Type-C), USB-C (USB 3.0 and DisplayPort 1.4), Gigabit Ethernet (YT8531C), HDMI 2.1 (8K60), M.2 M-key under it (PCIe 2.0 x1, a 2230 or 2242 SSD), 26-pin header, 3-pin debug UART, 3.5 mm headphone jack, onboard microphone, two MIPI camera sockets and a 30-pin LCD socket on top, 16 MB SPI flash',
    power: '5 V / 4 A over USB-C (no Power Delivery: a fixed 5 V)', L: 100, W: 62, H: 20, g: 46,
    holes: [[3.075, 3.055], [96.925, 3.055], [3.075, 58.945], [96.925, 58.945]], hole: 3.0, pad: 5.5, socMm: 17, rams: 2, layers: 8, edge: [], extras: ['m2'], mask: 0x176ab2 /* its photo's: the median of bare patches (photo.py colour); the look page's bright room puts a sheen on it */,
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
/** The two ports drawn here, not yet from a maker's drawing of their own: a micro-USB socket, a CAN header. */
function oldPort(kind: 'microusb' | 'can'): BoardPart {
  const ins = (L: number, H: number, W: number, y: number, mat = 'pbt', col = 0x222224): Solid => box('body', [L, H, W], [0, y, 0], mat, { color: col });
  const pins = (n: number, L: number, y: number, W: number): Solid[] => Array.from({ length: n }, (_, i) => box('lead', [L, 0.1, 0.4], [0, y, (i - (n - 1) / 2) * (W / n)], 'copper', { color: 0xd9b24c }));
  if (kind === 'microusb') return { comp: { name: 'micro-USB socket', item: 'usb-micro-socket', solids: [shellOf(5.6, 2.6, 7.5), ins(4.5, 0.6, 5.5, 1.3, 'nylon'), ...pins(5, 4, 1.9, 3.3)], at: [0, 0, 0] }, size: [5.6, 7.5, 2.6], src: 'typical' };
  return { comp: { name: 'CAN header', item: 'terminal-header', solids: [ins(6, 6, 7.5, 3, 'pbt', 0xf2f2f2), ...pins(3, 4, 3, 5)], at: [0, 0, 0] }, size: [6, 7.5, 6], src: 'typical' };
}
/** The board itself: its FR-4 core (its own straw colour at its edges), its copper (so many layers of 35 µm, each half
 *  filled: typical), its solder mask over both faces in its colour (which weighs nothing here), its holes through all,
 *  each with its plated pad, top and bottom. */
function pcb(b: BoardDef): Comp {
  const t = 1.6, cu = b.layers * 0.035 * 0.5, all = [...b.holes.map(([x, z]) => ({ x, z, d: b.hole, pad: b.pad ?? b.hole + 2.5 })), ...(b.more ?? []).map((h) => ({ x: h.at[0], z: h.at[1], d: h.d, pad: h.pad }))];
  const bores = all.map((h) => ({ x: h.x - b.L / 2, z: b.W / 2 - h.z, r: h.d / 2 }));
  const mask = b.mask ?? (b.maker === 'Raspberry Pi' ? 0x1f7a3a : b.maker === 'Orange Pi' ? 0x1f2a5a : 0x1a1a1a);
  const ring = (h: (typeof all)[number], y: number): Solid => ({ role: 'pad', shape: { lathe: [[h.d / 2, 0], [h.pad / 2, 0], [h.pad / 2, 0.035], [h.d / 2, 0.035], [h.d / 2, 0]] }, at: [h.x - b.L / 2, y, b.W / 2 - h.z], mat: 'copper', color: HUE.gold });
  // (each hole plated through: copper 25 µm thick on its wall under its gold, joining its pads top and bottom, so its
  // bore shows metal and not the board's layers; IPC-6012's class 2 minimum, typical of boards' plated holes)
  const barrel = (h: (typeof all)[number]): Solid => ({ role: 'pad', shape: { lathe: [[h.d / 2 - 0.025, -t - 0.04], [h.d / 2, -t - 0.04], [h.d / 2, 0.04], [h.d / 2 - 0.025, 0.04], [h.d / 2 - 0.025, -t - 0.04]] }, at: [h.x - b.L / 2, 0, b.W / 2 - h.z], mat: 'copper', color: HUE.gold });
  return { name: 'circuit board', item: 'pcb-bare', at: [0, 0, 0], solids: [
    box('core', [b.L, t - cu, b.W], [0, -t / 2, 0], 'fr4', { color: 0xc4a86a, bores }),
    box('frame', [b.L, cu, b.W], [0, -t / 2, 0], 'copper', { inBody: 0, bores }),
    box('film', [b.L, 0.02, b.W], [0, 0.01, 0], '', { color: mask, bores }), box('film', [b.L, 0.02, b.W], [0, -t - 0.01, 0], '', { color: mask, bores }),
    ...all.flatMap((h) => [ring(h, 0.005), ring(h, -t - 0.04), barrel(h)]),
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
  if (k === 't') return chip(pk ?? 'SOT-23', `small transistor or regulator (${pk}, fits by its size)`, '', 'sot-package');
  if (k === 'q') return chip(`DFN-6-${L}x${W}`, `small no-lead chip (${L} × ${W} mm as its photo shows; drawn as a DFN-6, fits by its size)`);
  return inductor(L, W, +Math.min(1.5, Math.max(0.8, 0.5 * W)).toFixed(2), '', SMALL_HUE.inductor);
}
/** Placed on a board: a part's footprint middle at (x, z) of the drawing, its front facing dir degrees, on top or under. */
function place(b: BoardDef, c: Comp, x: number, z: number, dir = 0, under = false, name?: string): Comp {
  const t = 1.6, a = (dir * Math.PI) / 180;
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
  return { name: `printed "${w.text}"`, solids: [box('mark', [len / 0.86, 0.01, w.h / 0.42], [0, 0.025, 0], '', { color: b.mask ?? 0x1f2a5a, text: w.text, ink: 0xf4f4f0 })], at: [w.at[0] - b.L / 2, 0, b.W / 2 - w.at[1]], turn: a };
}
/** Every part of a board, placed. */
export function boardComps(id: string): Comp[] {
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
    if (x === 'emmc') for (const dz of [-3, 3]) out.push(place(b, { name: 'eMMC socket', item: 'b2b-connector', at: [0, 0, 0], solids: [box('body', [12, 1.5, 2.5], [0, 0.75, 0], 'pbt', { color: 0xf2f2f2 }), ...Array.from({ length: 30 }, (_, i) => box('lead', [0.2, 1.2, 0.3], [(i - 14.5) * 0.4, 0.6, 1.0], 'copper', { color: 0xd9b24c }))] }, b.L * 0.3, b.W * 0.5 + dz, 0, true));
    if (x === 'buttons') for (const k of [0, 1, 2]) out.push(place(b, BOARD_PARTS['tact-kmr2']!().comp, 4 + k * 5, b.W - 10, 0, false, 'button'));
  }
  if (b.cls === 'cm') for (const z of [8, 32]) out.push(place(b, { name: 'board-to-board connector', item: 'b2b-connector', solids: [box('body', [35, 1.5, 3], [0, 0.75, 0], 'pbt', { color: 0xf2f2f2 }), ...Array.from({ length: 50 }, (_, i) => box('lead', [0.2, 1.2, 0.3], [(i - 24.5) * 0.4 * 1.7, 0.6, 1.2], 'copper', { color: 0xd9b24c }))], at: [0, 0, 0] }, b.L / 2, z, 0, true));
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
      return [box('lead', [0.2, 0.08, 2.6], [x, top ? H * 0.66 : H * 0.3, D / 2 - 1.5], 'phosphor-bronze', { color: 0xd9b24c }), box('lead', [0.2, 0.1, top ? 1.6 : 0.9], [x, 0.05, -D / 2 - (top ? 0.8 : 0.45)], 'phosphor-bronze', { color: 0xd9b24c })]; })] };
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
  const n = new Map<string, number>(); for (const c of boardComps(id)) if (c.item) n.set(c.item, (n.get(c.item) ?? 0) + 1);
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
export function boardMap(id: string): { board: string; L: number; W: number; approx: boolean; parts: { name: string; item?: string; side: 'top' | 'under'; corners: [number, number][]; h: number; how?: string }[]; holes: { at: [number, number]; d: number; pad: number }[]; silk: { text: string; corners: [number, number][] }[] } {
  const b = boardDef(id), how = new Map((b.layout ?? []).map((pl) => [pl.name, pl.how]));
  const parts = boardComps(id).slice(1).filter((c) => !c.name.startsWith('printed')).map((c) => {
    const ps = compCorners(c), xs = ps.map((q) => q[0]), ys = ps.map((q) => q[1]), zs = ps.map((q) => q[2]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    // (its box in its own frame, turned as it is placed, into the drawing's frame)
    const corners = ([[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as [number, number][]).map(([x, z]) => { const r = turnBy([x, 0, z], [c.under ? Math.PI : 0, c.turn ?? 0, 0]); return [+(r[0] + c.at[0] + b.L / 2).toFixed(3), +(b.W / 2 - (r[2] + c.at[2])).toFixed(3)] as [number, number]; });
    return { name: c.name, ...(c.item ? { item: c.item } : {}), side: c.under ? 'under' as const : 'top' as const, corners, h: +(Math.max(...ys) - Math.min(...ys)).toFixed(2), ...(how.get(c.name) ? { how: how.get(c.name)! } : {}) };
  });
  const holes = [...b.holes.map(([x, z]) => ({ at: [x, z] as [number, number], d: b.hole, pad: b.pad ?? b.hole + 2.5 })), ...(b.more ?? []).map((h) => ({ at: h.at, d: h.d, pad: h.pad }))];
  // (its printed words' boxes, each its letters' height by their run, turned as printed)
  const silk = (b.silk ?? []).map((w) => { const a = ((w.dir ?? 0) * Math.PI) / 180, len = Math.max(w.h * 0.62 * w.text.length, w.h) / 2 + 0.3, hh = w.h / 2 + 0.3;
    return { text: w.text, corners: ([[-len, -hh], [len, -hh], [len, hh], [-len, hh]] as [number, number][]).map(([u, v]) => [+(w.at[0] + u * Math.cos(a) - v * Math.sin(a)).toFixed(3), +(w.at[1] + u * Math.sin(a) + v * Math.cos(a)).toFixed(3)] as [number, number]) }; });
  return { board: b.name, L: b.L, W: b.W, approx: !b.layout, parts, holes, silk };
}
