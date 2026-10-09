// Boards as their makers make them: each a layout of real parts on a many-layer board, its holes drilled where its
// mechanical drawing has them. The system-on-chip a flip-chip in a ball-grid array under its heat spreader, its memory
// moulded ball-grid packages, its power and interface chips QFNs from the package library (src/nexus/packages.ts), its
// passives the library's chip resistors and capacitors, its connectors (USB-A stacks, RJ45 with its magnetics, HDMI,
// USB-C, microSD, the 40-pin header) each a part of its own, all at their places. Every part is solids, mm; what a
// board weighs is what its solids weigh, checked against its maker's weight where it gives one
// (tests/nexus/sbc.test.ts).
//
// Its frame: the board's top face y = 0, its length along x, its width along z, centred; what is under it (a microSD
// socket, a Compute Module's connectors) turned over below y = -t. Positions are from each maker's mechanical drawing
// where one is published (Raspberry Pi's), else typical of its class and said so.

import { chipSolids, pkgItem, pkgOf, pkgSolids, solidMasses, type Solid } from './packages';

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
}
type Port = 'usbA2' | 'usbA' | 'rj45' | 'usbc' | 'microusb' | 'hdmi' | 'microhdmi' | 'minihdmi' | 'audio' | 'can';

const PI_HOLES: [number, number][] = [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]];
/** Every board kept: its maker's figures, its source. */
export const BOARD_DEFS: Record<string, BoardDef> = {
  'pi5': { name: 'Raspberry Pi 5', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2712', cpu: '4 × Arm Cortex-A76 at 2.4 GHz', gpu: 'VideoCore VII', ram: [1, 2, 4, 8, 16], ramType: 'LPDDR4X-4267', ports: '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet (PoE+ with a HAT), 2 × micro-HDMI (4Kp60), 2 × 4-lane MIPI camera/display, PCIe 2.0 x1, Wi-Fi 802.11ac, Bluetooth 5.0, 40-pin header, RTC, power button', power: '5 V / 5 A over USB-C (Power Delivery)', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 16, rams: 1, layers: 6, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29.1, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'usbc', at: 11.2, side: 'bottom' }, { kind: 'microhdmi', at: 25.8, side: 'bottom' }, { kind: 'microhdmi', at: 39.2, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 5 product page and mechanical drawing RP-008347' },
  'pi4b': { name: 'Raspberry Pi 4 Model B', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2711', cpu: '4 × Arm Cortex-A72 at 1.8 GHz', gpu: 'VideoCore VI', ram: [1, 2, 4, 8], ramType: 'LPDDR4-3200', ports: '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet, 2 × micro-HDMI (4Kp60), MIPI CSI and DSI, Wi-Fi 802.11ac, Bluetooth 5.0, 40-pin header, 3.5 mm AV', power: '5 V / 3 A over USB-C', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 17, rams: 1, layers: 6, edge: [{ kind: 'usbA2', at: 9, side: 'right' }, { kind: 'usbA2', at: 27, side: 'right' }, { kind: 'rj45', at: 45.75, side: 'right' }, { kind: 'usbc', at: 11.2, side: 'bottom' }, { kind: 'microhdmi', at: 26, side: 'bottom' }, { kind: 'microhdmi', at: 39.5, side: 'bottom' }, { kind: 'audio', at: 54, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 4 Model B product brief and mechanical drawing' },
  'pi3bplus': { name: 'Raspberry Pi 3 Model B+', maker: 'Raspberry Pi', cls: 'pi-b', soc: 'Broadcom BCM2837B0', cpu: '4 × Arm Cortex-A53 at 1.4 GHz', gpu: 'VideoCore IV', ram: [1], ramType: 'LPDDR2', ports: '4 × USB 2.0, Gigabit Ethernet over USB 2.0 (300 Mbit/s), full-size HDMI, MIPI CSI and DSI, Wi-Fi 802.11ac, Bluetooth 4.2, 40-pin header, 3.5 mm AV', power: '5 V / 2.5 A over micro-USB', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 14, rams: 1, layers: 6, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'microusb', at: 10.6, side: 'bottom' }, { kind: 'hdmi', at: 32, side: 'bottom' }, { kind: 'audio', at: 53.5, side: 'bottom' }], header: 'pins', src: 'raspberrypi.com, Raspberry Pi 3 Model B+ product brief and mechanical drawing' },
  'pizero2w': { name: 'Raspberry Pi Zero 2 W', maker: 'Raspberry Pi', cls: 'zero', soc: 'Broadcom BCM2710A1 (in the RP3A0 package with its memory)', cpu: '4 × Arm Cortex-A53 at 1 GHz', gpu: 'VideoCore IV', ram: [0.5], ramType: 'LPDDR2', ports: 'mini-HDMI, micro-USB OTG, Wi-Fi 802.11b/g/n, Bluetooth 4.2, CSI-2 camera, 40-pin header (unpopulated)', power: '5 V / 2.5 A over micro-USB', L: 65, W: 30, H: 5.2, g: 10, holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 26.5], [61.5, 26.5]], hole: 2.7, socMm: 12, rams: 0, layers: 6, edge: [{ kind: 'minihdmi', at: 12.4, side: 'bottom' }, { kind: 'microusb', at: 41.4, side: 'bottom' }, { kind: 'microusb', at: 54, side: 'bottom' }], header: 'holes', src: 'Raspberry Pi Zero 2 W product brief RP-008359; its weight, 10 g, from PiCockpit' },
  'cm5': { name: 'Raspberry Pi Compute Module 5', maker: 'Raspberry Pi', cls: 'cm', soc: 'Broadcom BCM2712', cpu: '4 × Arm Cortex-A76 at 2.4 GHz', gpu: 'VideoCore VII', ram: [2, 4, 8, 16], ramType: 'LPDDR4X-4267', ports: 'two 100-pin board-to-board connectors (to its carrier), optional eMMC and Wi-Fi', power: '5 V from its carrier', L: 55, W: 40, H: 4.7, holes: [[3.5, 3.5], [51.5, 3.5], [3.5, 36.5], [51.5, 36.5]], hole: 2.7, socMm: 16, rams: 1, layers: 10, edge: [], src: 'Raspberry Pi Compute Module 5 datasheet RP-008180 (four M2.5 holes inset 3.5 mm)' },
  'pico': { name: 'Raspberry Pi Pico', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2040 (QFN-56, 7 × 7 mm)', cpu: '2 × Arm Cortex-M0+ at 133 MHz', ram: [0], ramType: '264 KB SRAM, 2 MB QSPI flash', ports: 'micro-USB 1.1, 26 GPIO (3 ADC), 2 × UART, 2 × SPI, 2 × I²C, 16 PWM, 8 PIO state machines; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico datasheet' },
  'picow': { name: 'Raspberry Pi Pico W', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2040 (QFN-56) and Infineon CYW43439', cpu: '2 × Arm Cortex-M0+ at 133 MHz', ram: [0], ramType: '264 KB SRAM, 2 MB QSPI flash', ports: 'micro-USB, 26 GPIO, Wi-Fi 802.11n (2.4 GHz), Bluetooth 5.2; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico W datasheet' },
  'pico2': { name: 'Raspberry Pi Pico 2', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2350 (QFN-60, 7 × 7 mm)', cpu: '2 × Arm Cortex-M33 or 2 × Hazard3 RISC-V at 150 MHz', ram: [0], ramType: '520 KB SRAM, 4 MB QSPI flash', ports: 'micro-USB 1.1, 26 GPIO, 12 PIO state machines; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico 2 datasheet' },
  'pico2w': { name: 'Raspberry Pi Pico 2 W', maker: 'Raspberry Pi', cls: 'pico', soc: 'RP2350 (QFN-60) and Infineon CYW43439', cpu: '2 × Arm Cortex-M33 or 2 × Hazard3 RISC-V at 150 MHz', ram: [0], ramType: '520 KB SRAM, 4 MB QSPI flash', ports: 'micro-USB, 26 GPIO, Wi-Fi 802.11n, Bluetooth 5.2; 40 castellated pads', power: '1.8–5.5 V into VSYS', L: 51, W: 21, H: 3.9, holes: [[2, 4.8], [49, 4.8], [2, 16.2], [49, 16.2]], hole: 2.1, socMm: 7, rams: 0, layers: 2, edge: [{ kind: 'microusb', at: 10.5, side: 'left' }], src: 'Raspberry Pi Pico 2 W datasheet' },
  'opi5': { name: 'Orange Pi 5', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588S (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS (INT4/INT8/INT16)', gpu: 'Mali-G610', ram: [4, 8, 16], ramType: 'LPDDR4/4X', ports: 'USB 3.0, 2 × USB 2.0, USB-C (USB 3.1 and DP 1.4), Gigabit Ethernet, HDMI 2.1 (8K60), M.2 M-key (PCIe 2.0), 40-pin header', power: '5 V / 4 A over USB-C', L: 100, W: 62, H: 20, g: 46, holes: [[3.5, 3.5], [96.5, 3.5], [3.5, 58.5], [96.5, 58.5]], hole: 2.7, socMm: 23, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 12, side: 'right' }, { kind: 'usbA2', at: 31, side: 'right' }, { kind: 'usbA', at: 49, side: 'right' }, { kind: 'usbc', at: 10, side: 'bottom' }, { kind: 'usbc', at: 24, side: 'bottom' }, { kind: 'hdmi', at: 42, side: 'bottom' }], header: 'pins', extras: ['m2', 'buttons'], src: 'orangepi.org, Orange Pi 5 page (62 × 100 mm, 46 g); hole positions typical, not its drawing' },
  'opi5plus': { name: 'Orange Pi 5 Plus', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588 (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS', gpu: 'Mali-G610', ram: [4, 8, 16], ramType: 'LPDDR4/4X', ports: '2 × USB 3.0, 2 × USB 2.0, USB-C, 2 × 2.5G Ethernet (RTL8125BG), 2 × HDMI out, HDMI in, M.2 M-key (NVMe), M.2 E-key (Wi-Fi), 40-pin header', power: '5 V / 4 A over USB-C', L: 100, W: 75, H: 24, g: 86.5, holes: [[3.5, 3.5], [96.5, 3.5], [3.5, 71.5], [96.5, 71.5]], hole: 2.7, socMm: 23, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 12, side: 'right' }, { kind: 'rj45', at: 30, side: 'right' }, { kind: 'usbA2', at: 49, side: 'right' }, { kind: 'usbA2', at: 64, side: 'right' }, { kind: 'usbc', at: 10, side: 'bottom' }, { kind: 'hdmi', at: 28, side: 'bottom' }, { kind: 'hdmi', at: 46, side: 'bottom' }, { kind: 'hdmi', at: 64, side: 'bottom' }, { kind: 'audio', at: 82, side: 'bottom' }], header: 'pins', extras: ['m2', 'm2e', 'emmc', 'buttons'], src: 'orangepi.org, Orange Pi 5 Plus page (100 × 75 mm, 86.5 g); hole positions typical' },
  'opi5pro': { name: 'Orange Pi 5 Pro', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588S (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS', gpu: 'Mali-G610', ram: [4, 8, 16], ramType: 'LPDDR5', ports: 'USB 3.1, 3 × USB 2.0, Gigabit Ethernet (PoE+ with a HAT), HDMI 2.1 and HDMI 2.0, M.2 M-key, Wi-Fi 5, BT 5.0, 40-pin header', power: '5 V / 5 A over USB-C', L: 89, W: 56, H: 20, g: 62, holes: PI_HOLES.map(([x, z]) => [x === 61.5 ? 85.5 : x, z]), hole: 2.7, socMm: 23, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'usbc', at: 11, side: 'bottom' }, { kind: 'hdmi', at: 30, side: 'bottom' }, { kind: 'hdmi', at: 50, side: 'bottom' }, { kind: 'audio', at: 68, side: 'bottom' }], header: 'pins', extras: ['m2', 'emmc', 'buttons'], src: 'orangepi.org, Orange Pi 5 Pro page (89 × 56 × 1.6 mm, 62 g); hole positions typical' },
  'opi5max': { name: 'Orange Pi 5 Max', maker: 'Orange Pi', cls: 'opi5', soc: 'Rockchip RK3588 (8 nm)', cpu: '4 × Cortex-A76 at 2.4 GHz and 4 × Cortex-A55 at 1.8 GHz', ai: 'NPU, 6 TOPS (INT4/INT8/INT16/FP16)', gpu: 'Mali-G610', ram: [4, 8, 16], ramType: 'LPDDR5', ports: '2 × USB 3.0, 2 × USB 2.0, 2.5G Ethernet (RTL8125BG), 2 × HDMI 2.1 (8K60), MIPI DSI, 2 × MIPI CSI, M.2 M-key (PCIe 3.0 x4), Wi-Fi 6E, BT 5.3, 40-pin header', power: '5 V / 5 A over USB-C', L: 89, W: 57, H: 20, g: 62, holes: [[3.5, 3.5], [85.5, 3.5], [3.5, 53.5], [85.5, 53.5]], hole: 2.7, socMm: 23, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 10.5, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA2', at: 47, side: 'right' }, { kind: 'usbc', at: 11, side: 'bottom' }, { kind: 'hdmi', at: 30, side: 'bottom' }, { kind: 'hdmi', at: 50, side: 'bottom' }, { kind: 'audio', at: 68, side: 'bottom' }], header: 'pins', extras: ['m2', 'emmc', 'buttons'], src: 'orangepi.org, Orange Pi 5 Max page (89 × 57 × 1.6 mm, 62 g); hole positions typical' },
  'rdkx3': { name: 'D-Robotics RDK X3', maker: 'D-Robotics', cls: 'pi-b', soc: 'Sunrise 3 (X3)', cpu: '4 × Arm Cortex-A53 at 1.5 GHz', ai: 'BPU, dual-core Bernoulli, 5 TOPS', ram: [2, 4], ramType: 'LPDDR4', ports: 'USB 3.0, 2 × USB 2.0, micro-USB device, HDMI 1.4 (1080p60), 2 × 2-lane MIPI CSI, Ethernet, Wi-Fi 2.4/5 GHz, Bluetooth 4.2, 40-pin header; H.265 and JPEG encode and decode', power: '5 V / 3 A', L: 85, W: 56, H: 19.5, holes: PI_HOLES, hole: 2.7, socMm: 14, rams: 1, layers: 6, edge: [{ kind: 'rj45', at: 10.25, side: 'right' }, { kind: 'usbA2', at: 29, side: 'right' }, { kind: 'usbA', at: 47, side: 'right' }, { kind: 'usbc', at: 11, side: 'bottom' }, { kind: 'hdmi', at: 32, side: 'bottom' }, { kind: 'microusb', at: 53, side: 'bottom' }], header: 'pins', src: 'en.d-robotics.cc, RDK X3 page (in the Raspberry Pi 4B form, whose holes it shares)' },
  'rdkx5': { name: 'D-Robotics RDK X5', maker: 'D-Robotics', cls: 'rdk-x5', soc: 'Sunrise 5 (X5)', cpu: '8 × Arm Cortex-A55 at 1.5 GHz', ai: 'BPU, 10 TOPS', gpu: '32 GFLOPS', ram: [4, 8], ramType: 'LPDDR4', ports: '4 × USB 3.0 host (Type-A), USB 2.0 device (Type-C), Gigabit Ethernet with PoE, HDMI (1080p60), 4-lane MIPI DSI, 2 × 4-lane MIPI CSI, CAN FD, micro-USB debug UART, 3.5 mm audio, 40-pin header; no on-board storage (microSD)', power: '5 V / 5 A', L: 100, W: 80, H: 20, holes: [[3.5, 3.5], [96.5, 3.5], [3.5, 76.5], [96.5, 76.5]], hole: 2.7, socMm: 17, rams: 2, layers: 8, edge: [{ kind: 'rj45', at: 12, side: 'right' }, { kind: 'usbA2', at: 32, side: 'right' }, { kind: 'usbA2', at: 50, side: 'right' }, { kind: 'usbc', at: 12, side: 'bottom' }, { kind: 'usbc', at: 26, side: 'bottom' }, { kind: 'hdmi', at: 44, side: 'bottom' }, { kind: 'microusb', at: 62, side: 'bottom' }, { kind: 'audio', at: 76, side: 'bottom' }, { kind: 'can', at: 68, side: 'right' }], header: 'pins', src: 'developer.d-robotics.cc, RDK X5 page (100 × 80 mm); hole positions typical' },
  'rdks100': { name: 'D-Robotics RDK S100', maker: 'D-Robotics', cls: 'rdk-s100', soc: 'S100 (its Nash BPU)', cpu: '6 × Arm Cortex-A78AE at 1.5 GHz, and an MCU of 4 × Cortex-R52+ at 1.2 GHz', ai: 'BPU (Nash), 80 TOPS', gpu: 'Mali-G78AE, 100 GFLOPS', ram: [12], ramType: 'LPDDR5, 96-bit; 64 GB eMMC', ports: '4 × USB 3.0, USB-C (flash and debug), 2 × Gigabit Ethernet, HDMI 1.4 (2K60), M.2 M-key (PCIe 3.0 x1), M.2 E-key (Wi-Fi), 16-pin MCU GPIO header, camera expansion header', power: '12–20 V DC', L: 120, W: 121, H: 51, holes: [[4, 4], [116, 4], [4, 117], [116, 117]], hole: 3.2, socMm: 25, rams: 3, layers: 10, edge: [{ kind: 'rj45', at: 15, side: 'right' }, { kind: 'rj45', at: 34, side: 'right' }, { kind: 'usbA2', at: 55, side: 'right' }, { kind: 'usbA2', at: 74, side: 'right' }, { kind: 'usbc', at: 15, side: 'bottom' }, { kind: 'hdmi', at: 34, side: 'bottom' }], src: 'en.d-robotics.cc, RDK S100 page (120 × 121 × 51 mm with its case); its board drawn without its case and cooler' },
  'rdks100p': { name: 'D-Robotics RDK S100P', maker: 'D-Robotics', cls: 'rdk-s100', soc: 'S100P (its Nash BPU)', cpu: '6 × Arm Cortex-A78AE at 2.0 GHz, and an MCU of 4 × Cortex-R52+ at 1.2 GHz', ai: 'BPU (Nash), 128 TOPS', gpu: 'Mali-G78AE, 100 GFLOPS', ram: [24], ramType: 'LPDDR5, 96-bit; 64 GB eMMC', ports: '4 × USB 3.0, USB-C (flash and debug), 2 × Gigabit Ethernet, HDMI 1.4 (2K60), M.2 M-key, M.2 E-key, 16-pin MCU GPIO header, camera expansion header', power: '12–20 V DC', L: 120, W: 121, H: 51, holes: [[4, 4], [116, 4], [4, 117], [116, 117]], hole: 3.2, socMm: 25, rams: 3, layers: 10, edge: [{ kind: 'rj45', at: 15, side: 'right' }, { kind: 'rj45', at: 34, side: 'right' }, { kind: 'usbA2', at: 55, side: 'right' }, { kind: 'usbA2', at: 74, side: 'right' }, { kind: 'usbc', at: 15, side: 'bottom' }, { kind: 'hdmi', at: 34, side: 'bottom' }], src: 'en.d-robotics.cc, RDK S100 page; its board drawn without its case and cooler' },
};
export const boardDef = (id: string): BoardDef => { const b = BOARD_DEFS[id]; if (!b) throw new Error(`no board kept as ${id}`); return b; };

// ---- the parts a board is made of ---------------------------------------------------------------------------------------
type V3 = [number, number, number];
const box = (role: Solid['role'], b: V3, at: V3, mat: string, more: Partial<Solid> = {}): Solid => ({ role, shape: { box: b }, at, mat, ...more });
/** A sheet-steel shell over a body (a connector's), its open face toward the plug: a skin 0.3 mm thick. */
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
/** A moulded memory package, w × l mm: its two dies stacked on its substrate under its moulding, on its balls. */
function lpddr(w: number, l: number): Comp[] {
  const ball = 0.25, sub = 0.25, mould = 0.6;
  return [
    { name: 'moulding', item: 'mould-compound', solids: [box('body', [l, mould, w], [0, ball + sub + mould / 2, 0], 'emc')], at: [0, 0, 0] },
    { name: 'substrate', item: 'bga-substrate', solids: [box('core', [l, sub, w], [0, ball + sub / 2, 0], 'bt', { color: 0x3d5a3a })], at: [0, 0, 0] },
    { name: 'solder balls', item: 'solder-balls', solids: [box('lead', [l * 0.9, ball, w * 0.9], [0, ball / 2, 0], 'solder', { inBody: 0, share: (Math.PI / 6) * (0.3 / 0.65) ** 2, color: 0xb8bcc0 })], at: [0, 0, 0] },
    ...[0, 1].map((k): Comp => ({ name: 'die', item: 'si-die', solids: [box('die', [l * 0.7, 0.1, w * 0.7], [0, ball + sub + 0.1 + k * 0.15, 0], 'silicon')], at: [0, 0, 0] })),
  ];
}
/** A connector by its kind: its shell (a skin of steel), its insulator, its contacts; drawn standing on the board, its
 *  mouth toward +x. Sizes typical of makers' drawings (a USB-A stack 17.5 deep, 14.5 wide, 15.6 high; an RJ45 with
 *  its magnetics 21.3 × 16 × 13.5; HDMI 11.5 × 15 × 6; micro-HDMI 7.5 × 6.5 × 3.4; USB-C 7.35 × 8.94 × 3.26). */
function connector(kind: Port): { item: string; comps: Comp[]; d: number; w: number } {
  const ins = (L: number, H: number, W: number, y: number, mat = 'pbt', col = 0x222224): Solid => box('body', [L, H, W], [0, y, 0], mat, { color: col });
  const pins = (n: number, L: number, y: number, W: number): Solid[] => Array.from({ length: n }, (_, i) => box('lead', [L, 0.1, 0.4], [0, y, (i - (n - 1) / 2) * (W / n)], 'copper', { color: 0xd9b24c }));
  switch (kind) {
    case 'usbA2': return { item: 'usb-a-socket', d: 17.5, w: 14.5, comps: [0, 1].map((k): Comp => ({ name: `USB-A socket ${k ? 'upper' : 'lower'}`, item: 'usb-a-socket', solids: [{ ...shellOf(17.5, 7.8, 14.5), at: [0, 3.9 + k * 7.8, 0] }, ins(14, 1.6, 11, 4.4 + k * 7.8, 'nylon', k ? 0x1d50b8 : 0x1d50b8), ...pins(k ? 9 : 9, 12, 5.3 + k * 7.8, 9)], at: [0, 0, 0] })) };
    case 'usbA': return { item: 'usb-a-socket', d: 14, w: 14.5, comps: [{ name: 'USB-A socket', item: 'usb-a-socket', solids: [shellOf(14, 7, 14.5), ins(12, 1.6, 11, 3.6, 'nylon', 0x1d50b8), ...pins(9, 10, 4.5, 9)], at: [0, 0, 0] }] };
    case 'rj45': return { item: 'rj45-jack', d: 21.3, w: 16, comps: [{ name: 'RJ45 jack', item: 'rj45-jack', solids: [shellOf(21.3, 13.5, 16, 0.25), { ...ins(20.5, 12.7, 15.2, 6.6, 'pbt', 0x1a1a1a), share: 0.45 }, box('core', [6, 6, 10], [-5, 4, 0], 'ferrite', { color: 0x3a3a3a }), ...pins(8, 8, 10, 7)], at: [0, 0, 0] }] };
    case 'hdmi': return { item: 'hdmi-socket', d: 11.5, w: 15, comps: [{ name: 'HDMI socket', item: 'hdmi-socket', solids: [shellOf(11.5, 6, 15), ins(10, 1.4, 11, 3, 'pbt'), ...pins(19, 8, 3.8, 10)], at: [0, 0, 0] }] };
    case 'microhdmi': return { item: 'hdmi-socket', d: 7.5, w: 6.5, comps: [{ name: 'micro-HDMI socket', item: 'hdmi-socket', solids: [shellOf(7.5, 3.4, 6.5), ins(6.5, 0.6, 4.6, 1.7, 'pbt'), ...pins(19, 5, 2.1, 4.2)], at: [0, 0, 0] }] };
    case 'minihdmi': return { item: 'hdmi-socket', d: 7.5, w: 11.2, comps: [{ name: 'mini-HDMI socket', item: 'hdmi-socket', solids: [shellOf(7.5, 3.2, 11.2), ins(6.5, 0.6, 8, 1.6, 'pbt'), ...pins(19, 5, 2, 7)], at: [0, 0, 0] }] };
    case 'usbc': return { item: 'usb-c-socket', d: 7.35, w: 8.94, comps: [{ name: 'USB-C socket', item: 'usb-c-socket', solids: [shellOf(7.35, 3.26, 8.94), ins(6.5, 0.7, 6.6, 1.63, 'nylon'), ...pins(12, 5, 2, 6.6)], at: [0, 0, 0] }] };
    case 'microusb': return { item: 'usb-micro-socket', d: 5.6, w: 7.5, comps: [{ name: 'micro-USB socket', item: 'usb-micro-socket', solids: [shellOf(5.6, 2.6, 7.5), ins(4.5, 0.6, 5.5, 1.3, 'nylon'), ...pins(5, 4, 1.9, 3.3)], at: [0, 0, 0] }] };
    case 'audio': return { item: 'audio-jack', d: 12, w: 6, comps: [{ name: '3.5 mm jack', item: 'audio-jack', solids: [ins(12, 5, 6, 2.5, 'pbt', 0x1a1a1a), ...pins(4, 4, 3, 4)], at: [0, 0, 0] }] };
    case 'can': return { item: 'terminal-header', d: 6, w: 7.5, comps: [{ name: 'CAN header', item: 'terminal-header', solids: [ins(6, 6, 7.5, 3, 'pbt', 0xf2f2f2), ...pins(3, 4, 3, 5)], at: [0, 0, 0] }] };
  }
}
/** The 40-pin header, 2 × 20 at 2.54 mm: its moulded insulator 2.5 mm tall, its pins 0.64 mm square, 11.5 mm long,
 *  through the board, 6 mm standing above the insulator (typical of makers' drawings); or, unpopulated, nothing. */
function header40(): Comp {
  const pins: Solid[] = [];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 20; i++) pins.push(box('lead', [0.64, 11.5, 0.64], [(i - 9.5) * 2.54, 11.5 / 2 - 3.0, (r - 0.5) * 2.54], 'brass', { color: 0xd9b24c, lead: r * 20 + i }));
  return { name: '40-pin header', item: 'pin-header-2x20', at: [0, 0, 0], kids: [{ name: 'header insulator', item: 'header-insulator', solids: [box('body', [50.8, 2.5, 5.08], [0, 1.25, 0], 'pbt', { color: 0x1a1a1a })], at: [0, 0, 0] }, ...pins.map((p): Comp => ({ name: 'header pin', item: 'header-pin', solids: [p], at: [0, 0, 0] }))] };
}
/** The board itself: its FR-4 core with its holes, and its copper, so many layers of 35 µm each half filled (typical),
 *  under its solder mask (which weighs nothing here). */
function pcb(b: BoardDef): Comp {
  const t = 1.6, cu = b.layers * 0.035 * 0.5, holes = b.holes.map(([x, z]) => ({ x: x - b.L / 2, z: z - b.W / 2, r: b.hole / 2 }));
  return { name: 'circuit board', item: 'pcb-bare', at: [0, 0, 0], solids: [
    box('core', [b.L, t - cu, b.W], [0, -t / 2, 0], 'fr4', { color: b.maker === 'Raspberry Pi' ? 0x1f7a3a : b.maker === 'Orange Pi' ? 0x1f2a5a : 0x1a1a1a, bores: holes }),
    box('frame', [b.L, cu, b.W], [0, -t / 2, 0], 'copper', { inBody: 0, bores: holes }),
  ] };
}
/** Chip resistors and capacitors round the system-on-chip (0402s, ten of each, as the inventory's own part says). */
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
/** A chip from the package library, as a part of the board (a power chip, a USB or Ethernet chip, a radio's). */
function libChip(pk: string, name: string, at: V3): Comp {
  const q = pkgOf(pk)!, ss = pkgSolids(q), frame = ss.filter((s) => pkgItem(q, s.role) === 'lead-frame');
  // (its lead frame one part, its die, its moulding and each of its wires a part of its own)
  return { name, item: 'ic-package', at, kids: [...ss.filter((s) => pkgItem(q, s.role) !== 'lead-frame').map((s): Comp => ({ name: `${name} ${s.role === 'body' ? 'moulding' : s.role === 'wire' ? 'bond wire' : s.role}`, ...(pkgItem(q, s.role) ? { item: pkgItem(q, s.role)! } : {}), solids: [s], at: [0, 0, 0] })), { name: `${name} lead frame`, item: 'lead-frame', solids: frame, at: [0, 0, 0] }] };
}
/** Every part of a board, placed. */
export function boardComps(id: string): Comp[] {
  const b = boardDef(id), X = (x: number) => x - b.L / 2, Z = (z: number) => z - b.W / 2, out: Comp[] = [pcb(b)];
  const pico = b.cls === 'pico';
  // its system-on-chip (on a Pico the chip itself, a QFN), its memory beside it
  const soc: [number, number] = pico ? [27, 10.5] : b.cls === 'zero' ? [26, 15] : b.cls === 'cm' ? [24, 20] : [b.L * 0.36, b.W * 0.55];
  if (pico) out.push(libChip(b.soc.startsWith('RP2350') ? 'QFN-60' : 'QFN-56', b.soc.split(' ')[0]!, [X(soc[0]), 0, Z(soc[1])]));
  else out.push({ name: b.soc, item: 'soc-package', kids: fcbga(b.socMm), at: [X(soc[0]), 0, Z(soc[1])] });
  for (let k = 0; k < b.rams; k++) out.push({ name: 'memory', item: 'lpddr-package', kids: lpddr(10, 14.5), at: [X(soc[0] + b.socMm / 2 + 9 + k * 12), 0, Z(soc[1])], turn: Math.PI / 2 });
  if (!pico) out.push(passives(X(soc[0]), Z(soc[1]), b.socMm * 0.62 + 1.5));
  // its power chip, and its interface chips where it has a USB or Ethernet chip of its own
  out.push(libChip(pico ? 'QFN-16' : 'QFN-40', pico ? 'buck-boost regulator' : 'power chip', [X(pico ? 12 : soc[0] - b.socMm / 2 - 7), 0, Z(pico ? 6 : soc[1] - 8)]));
  if (pico) out.push(libChip('SOIC-8', 'QSPI flash', [X(17), 0, Z(10.5)]));
  if (b.cls !== 'cm' && !pico) out.push(libChip('QFN-48', 'interface chip', [X(b.L - 30), 0, Z(b.W * 0.4)]));
  // a radio under its shield can (a Pico W's at its far end)
  if (/Wi-Fi|CYW43439/.test(b.ports + b.soc)) out.push({ name: 'Wi-Fi module', item: 'wifi-module', at: pico ? [X(42), 0, Z(10.5)] : [X(8), 0, Z(b.W * 0.5)], kids: [{ name: 'shield can', solids: [shellOf(pico ? 10 : 11, 1.6, pico ? 10 : 11, 0.2)], at: [0, 0, 0] }, { name: 'radio die', item: 'si-die', solids: [box('die', [4, 0.6, 4], [0, 0.4, 0], 'silicon')], at: [0, 0, 0] }] });
  // its ports at their places along its edges, their mouths at the edge (an RJ45 and a USB stack standing proud of it)
  for (const e of b.edge) {
    const c = connector(e.kind), over = e.kind === 'rj45' || e.kind.startsWith('usbA') ? 2 : 0.5;
    const at: V3 = e.side === 'right' ? [b.L / 2 - c.d / 2 + over, 0, Z(e.at)] : e.side === 'left' ? [-b.L / 2 + c.d / 2 - over, 0, Z(e.at)] : e.side === 'bottom' ? [X(e.at), 0, -b.W / 2 + c.d / 2 - over] : [X(e.at), 0, b.W / 2 - c.d / 2 + over];
    const turn = e.side === 'right' ? 0 : e.side === 'left' ? Math.PI : e.side === 'bottom' ? -Math.PI / 2 : Math.PI / 2;
    out.push(...c.comps.map((cc) => ({ ...cc, at, turn })));
  }
  if (b.header === 'pins') out.push({ ...header40(), at: [X(32.5 * (b.L / 85)), 0, Z(b.W - 3.5)] });
  if (!pico && b.cls !== 'cm') out.push({ name: 'microSD socket', item: 'microsd-socket', solids: [shellOf(12, 1.4, 11.5, 0.2), box('body', [11, 1.0, 10.5], [0, 0.6, 0], 'pbt', { color: 0x1a1a1a })], at: [X(7.5), -1.6, Z(b.W / 2)], under: true });
  // (an M.2 slot under the board, its card's standoff beside it: a body of moulded contacts 22 mm wide (typical of the
  // M.2 connectors' drawings); an eMMC module's socket, two fine-pitch mezzanines; its buttons, tact switches)
  for (const x of b.extras ?? []) {
    if (x === 'm2' || x === 'm2e') out.push({ name: x === 'm2' ? 'M.2 M-key slot' : 'M.2 E-key slot', item: 'm2-socket', at: [X(x === 'm2' ? b.L * 0.5 : b.L * 0.75), -1.6, Z(b.W * 0.3)], under: true, solids: [box('body', [22, 4.2, 8.6], [0, 2.1, 0], 'pbt', { color: 0x1a1a1a }), ...Array.from({ length: 67 }, (_, i) => box('lead', [0.25, 0.15, 7], [(i - 33) * 0.3, 0.3, 0], 'copper', { color: 0xd9b24c })), box('cap', [3, 3, 3], [0, 1.5, 24], 'brass', { color: 0xd9b24c })] });
    if (x === 'emmc') for (const dz of [-3, 3]) out.push({ name: 'eMMC socket', item: 'b2b-connector', at: [X(b.L * 0.3), -1.6, Z(b.W * 0.5 + dz)], under: true, solids: [box('body', [12, 1.5, 2.5], [0, 0.75, 0], 'pbt', { color: 0xf2f2f2 }), ...Array.from({ length: 30 }, (_, i) => box('lead', [0.2, 1.2, 0.3], [(i - 14.5) * 0.4, 0.6, 1.0], 'copper', { color: 0xd9b24c }))] });
    if (x === 'buttons') for (const k of [0, 1, 2]) out.push({ name: 'button', item: 'tact-switch', at: [X(4 + k * 5), 0, Z(b.W - 10)], solids: [shellOf(4, 1.5, 4, 0.2), box('body', [3.6, 1.2, 3.6], [0, 0.6, 0], 'pbt', { color: 0x1a1a1a }), box('cap', [1.6, 0.8, 1.6], [0, 1.9, 0], 'nylon', { color: 0x222222 })] });
  }
  if (b.cls === 'cm') for (const z of [8, 32]) out.push({ name: 'board-to-board connector', item: 'b2b-connector', solids: [box('body', [35, 1.5, 3], [0, 0.75, 0], 'pbt', { color: 0xf2f2f2 }), ...Array.from({ length: 50 }, (_, i) => box('lead', [0.2, 1.2, 0.3], [(i - 24.5) * 0.4 * 1.7, 0.6, 1.2], 'copper', { color: 0xd9b24c }))], at: [0, -1.6, Z(z)], under: true });
  return out;
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
