// Electronics by tables (decision 0026, step 2): development boards, connectors, displays, fans, packages, switches,
// relays and prototyping boards, each a family of rows and one recipe of the room operations (src/nexus/room.ts). No
// file is copied here: every row is re-keyed from its maker's drawing or datasheet, or a standard, and says which on
// the row (`src`), or is labelled typical. NopSCADlib (GPL-3.0) and KiCad's libraries (CC-BY-SA) were read as
// cross-checks only, never copied. No place is written: a part goes onto a board at its footprint by the board's own
// pattern of points (its drawing's figures, as a plate's holes are), its joint passed through the board there and the
// part stood on that joint (`seat`), so every place is an output of the operations.
//
// Sources, by family:
//   dev boards: Arduino Uno R3 (A000066 datasheet, its board drawing: 68.6 × 53.3 mm, holes Ø3.2 on the 0.1-inch grid),
//     Mega 2560 R3 (A000067), Nano (A000005), Raspberry Pi 4 Model B and Pi 5 mechanical drawings (85 × 56 mm, holes
//     Ø2.7 at 58 × 49 mm), Raspberry Pi Pico datasheet (51 × 21 mm, holes Ø2.1 at 47 × 11.4 mm, pins 17.78 mm apart),
//     Espressif's ESP32-DevKitC V4 guide and ESP32-WROOM-32 datasheet (18 × 25.5 × 3.1 mm), NodeMCU v2 (typical) with
//     Ai-Thinker's ESP-12E (24 × 16 × 3 mm). The parts on them (connectors, headers) drawn as their outline boxes at
//     their footprints: an envelope, said so.
//   connectors: USB Type-C, Micro-USB and USB 2.0 receptacle openings (USB-IF specifications) in shells of typical
//     makers' sizes; RJ45/RJ11 jacks, 3.5 mm and 6.35 mm audio jacks, D-sub shells (the MIL-DTL-24308 outline as makers'
//     datasheets give it), screw terminals, JST XH, PH and SH headers (JST's datasheets), typical where so labelled.
//   displays: HD44780 LCD1602 and LCD2004, SSD1306 0.96" and SH1106 1.3" OLED, ILI9341 2.8" TFT modules: typical.
//   fans: frame sizes and their hole spacing as the common 25 to 140 mm axial fans give them (typical of makers'
//     datasheets: 40 mm, 32 mm apart; 60, 50; 80, 71.5; 92, 82.5; 120, 105; 140, 124.5).
//   packages: TO-220AB, DO-35, DO-41, DO-201AD (JEDEC outlines), HC-49 crystals, buzzers, SRD relays (Songle), tactile
//     and micro switches (Omron), breadboards and perfboards: typical where so labelled.

import { made, stack, through, onto, over, turn, type Block } from '../room';
import { densityKg } from '../mass';
import { jstXH } from '../common';
import type { PartFamily } from './maker';

const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const LEAD = 0xc8ccd0, SOLDER = 0xb9bcc0, BLACK = 0x1c1c1c, P = 2.54;
const disc = (d: number) => (Math.PI * d * d) / 4;
/** n points along x by rows along z at a pitch (mm, about their middle, in m), pin 1 first, then the one beside it
 *  across the rows (a 2-row header's odd and even pins). */
const grid = (n: number, rows = 1, p = P, q = p): [number, number][] =>
  Array.from({ length: n * rows }, (_, k) => { const i = Math.floor(k / rows), r = k % rows; return [mm((i - (n - 1) / 2) * p), mm((r - (rows - 1) / 2) * q)] as [number, number]; });
/** A row of n pins at pitch p (mm) as board-drawing points (x, y), from (x0, y0). */
const row = (n: number, x0: number, y0: number, p = P, along: 'x' | 'y' = 'x'): [number, number][] => Array.from({ length: n }, (_, k) => (along === 'x' ? [x0 + k * p, y0] : [x0, y0 + k * p]) as [number, number]);
/** Each pin of a body's row put down it from the body's top, its top at the body's. */
function pinned(body: Block, port: string, pin: () => Block, n: number): Block { let b = body; for (let i = 0; i < n; i++) b = through(b, pin(), { port, i, from: 'hi' }, 'tight'); return b; }
const bound = (x: number, y: number, z: number): [number, number, number] => [mm(x), mm(y), mm(z)];

// ---- a part seated on a board at a point of its pattern ------------------------------------------------------------
/** A part stood on a board at its footprint: its joint (a solder joint, Ø1 mm, typical) passed up through the board's
 *  point i (from its underside, flush with its top), and the part, on its own pad of that joint's name (0.1 mm, typical),
 *  stood onto the board aligned joint to joint. The board's points are its drawing's figures, as a plate's holes are. */
function seat(b: Block, port: string, i: number, part: Block, joint: string, t: number): Block {
  const through1 = through(b, made(joint, 'solder', { cyl: [mm(0.5), mm(t)] }, { color: SOLDER }), { port, i, from: 'lo' }, 'tight');
  return onto(through1, '+y', stack(part.name, 1, [{ b: made(joint, 'solder', { cyl: [mm(0.5), 0.1 / 1000] }, { color: SOLDER }) }, { b: part }]), 'touch', `${joint}/axis`);
}
/** What stands on a board: an outline box (x, height, z, mm), a female header (pins along x, rows along z; 8.5 mm,
 *  its sockets Ø1.0 cut), or a male header (its 2.5 mm body, its pins offered as lines, not drawn). */
export interface Feat { name: string; xy: [number, number]; box?: [number, number, number]; socket?: [number, number]; header?: [number, number]; mat?: string; color?: number }
const featSize = (f: Feat): [number, number, number] => (f.box ? f.box : f.socket ? [f.socket[0] * P, 8.5, f.socket[1] * P] : [f.header![0] * P, 2.5, f.header![1] * P]);
function featBody(board: string, f: Feat): Block {
  const name = `${board} ${f.name}`, [w, h, d] = featSize(f);
  if (f.socket) return made(name, 'nylon', { box: bound(w, h, d) }, { color: BLACK, pattern: { name: 'pins', points: grid(f.socket[0], f.socket[1]), hole: mm(0.5) } });
  if (f.header) return made(name, 'nylon', { box: bound(w, h, d) }, { color: BLACK, pattern: { name: 'pins', points: grid(f.header[0], f.header[1]) } });
  return made(name, f.mat ?? 'steel-low', { box: bound(w, h, d) }, f.color !== undefined ? { color: f.color } : {});
}
/** A board with what stands on it: its PCB (FR-4) with its pattern of points, from its drawing's corner (x along its
 *  length, y up its width, mm): its mounting holes first, then its pins' footprints, then each part's footprint, where
 *  that part is seated. */
export interface BoardRow { L: number; W: number; t: number; color: number; hole: number; holes: [number, number][]; pins?: [number, number][]; feats: Feat[]; mass?: number; src: string }
function boardOf(name: string, r: BoardRow): Block {
  const on = ([x, y]: [number, number]): [number, number] => [mm(x - r.L / 2), mm(r.W / 2 - y)];
  const pts = [...r.holes, ...(r.pins ?? []), ...r.feats.map((f) => f.xy)].map(on), port = `${name} PCB/holes`, k0 = r.holes.length + (r.pins?.length ?? 0);
  let b = made(`${name} PCB`, 'fr4', { box: bound(r.L, r.t, r.W) }, { color: r.color, pattern: { name: 'holes', points: pts } });
  r.feats.forEach((f, k) => { b = seat(b, port, k0 + k, featBody(name, f), `${name} ${f.name} joint`, r.t); });
  return stack(name, 1, [{ b }]);
}
/** A board's bound from its row: its PCB, and every part at its footprint, over its overhang and its pad. */
function boardBound(r: BoardRow): [number, number, number] {
  let x0 = 0, x1 = r.L, y0 = 0, y1 = r.W, h = r.t;
  for (const f of r.feats) { const [w, fh, d] = featSize(f); x0 = Math.min(x0, f.xy[0] - w / 2); x1 = Math.max(x1, f.xy[0] + w / 2); y0 = Math.min(y0, f.xy[1] - d / 2); y1 = Math.max(y1, f.xy[1] + d / 2); h = Math.max(h, r.t + 0.1 + fh); }
  return bound(x1 - x0, h, y1 - y0);
}
const ENV_BOARD = 'its PCB is true to its drawing (outline, thickness, mounting holes and pins at their places); the parts on it are their outline boxes at their footprints (an USB jack or a socket as a solid box), so its drawn mass is not the board\'s';

// ---- development boards ---------------------------------------------------------------------------------------------
const USB_B: [number, number, number] = [16.0, 10.9, 12.0], DC_JACK: [number, number, number] = [14.2, 11.0, 9.0], USB_A2: [number, number, number] = [17.5, 16.0, 13.2], RJ45_PI: [number, number, number] = [21.0, 13.5, 16.0];
const MICRO_USB: [number, number, number] = [5.6, 2.6, 7.5], USB_C: [number, number, number] = [7.4, 3.2, 8.9], HDMI_U: [number, number, number] = [6.5, 3.5, 7.5];
const UNO_TOP: Feat[] = [{ name: 'digital 8–13 header', xy: [30.226, 50.8], socket: [10, 1] }, { name: 'digital 0–7 header', xy: [54.61, 50.8], socket: [8, 1] }, { name: 'power header', xy: [36.83, 2.54], socket: [8, 1] }];
const UNO_JACKS: Feat[] = [{ name: 'USB-B jack', xy: [1.65, 38.1], box: USB_B, color: 0xb8bcc2 }, { name: 'DC jack', xy: [5.1, 7.62], box: DC_JACK, mat: 'abs', color: BLACK }];
export const DEV_BOARDS: Record<string, BoardRow> = {
  'Arduino Uno R3': { L: 68.58, W: 53.34, t: 1.6, color: 0x1f5fa8, hole: 3.2, holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]], mass: 25,
    feats: [...UNO_TOP, { name: 'analog header', xy: [57.15, 2.54], socket: [6, 1] }, { name: 'ICSP header', xy: [64.91, 27.89], header: [2, 3] }, ...UNO_JACKS, { name: 'ATmega328P in its socket', xy: [46.99, 17.0], box: [35.6, 7.6, 10.2], mat: 'epoxy', color: BLACK }],
    src: 'Arduino A000066 datasheet, its board drawing (outline, holes, headers on the 0.1-inch grid); mass 25 g its store page; its jacks\' and chip\'s outlines and places typical' },
  'Arduino Mega 2560 R3': { L: 101.6, W: 53.34, t: 1.6, color: 0x1f5fa8, hole: 3.2, holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56], [90.17, 50.8], [96.52, 2.54]], mass: 37,
    feats: [...UNO_TOP, { name: 'communication header', xy: [77.47, 50.8], socket: [8, 1] }, { name: 'analog 0–7 header', xy: [59.69, 2.54], socket: [8, 1] }, { name: 'analog 8–15 header', xy: [80.01, 2.54], socket: [8, 1] }, { name: 'digital 22–53 header', xy: [97.79, 26.67], socket: [2, 18] }, ...UNO_JACKS],
    src: 'Arduino A000067 datasheet, its board drawing (outline, holes, headers on the 0.1-inch grid); mass 37 g its store page; its jacks\' outlines and places typical' },
  'Arduino Nano': { L: 43.18, W: 17.78, t: 1.6, color: 0x1f5fa8, hole: 1.78, holes: [[1.27, 1.27], [41.91, 1.27], [1.27, 16.51], [41.91, 16.51]], mass: 7,
    pins: [...row(15, 3.81, 1.27), ...row(15, 3.81, 16.51)], feats: [{ name: 'mini-USB jack', xy: [3.0, 8.89], box: [9.2, 3.9, 7.7], color: 0xb8bcc2 }, { name: 'ATmega328P', xy: [24.0, 8.89], box: [7.0, 1.2, 7.0], mat: 'epoxy', color: BLACK }],
    src: 'Arduino A000005 (Nano): 0.7 × 1.7 in board, two rows of 15 pins 0.6 in apart on the 0.1-inch grid; mass 7 g its store page; its holes\' places, jack and chip typical' },
  'Raspberry Pi 4 Model B': { L: 85, W: 56, t: 1.4, color: 0x1f7a3a, hole: 2.7, holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]], mass: 46,
    feats: [{ name: 'GPIO header', xy: [32.5, 52.5], header: [20, 2] }, { name: 'USB 3.0 ports', xy: [78.35, 9.0], box: USB_A2, color: 0xb8bcc2 }, { name: 'USB 2.0 ports', xy: [78.35, 27.0], box: USB_A2, color: 0xb8bcc2 },
      { name: 'Ethernet jack', xy: [77.0, 45.75], box: RJ45_PI, color: 0xb8bcc2 }, { name: 'USB-C power', xy: [11.2, 2.5], box: USB_C, color: 0xb8bcc2 }, { name: 'micro-HDMI 0', xy: [26.0, 2.5], box: HDMI_U, color: 0xb8bcc2 }, { name: 'micro-HDMI 1', xy: [39.5, 2.5], box: HDMI_U, color: 0xb8bcc2 },
      { name: 'audio jack', xy: [54.0, 6.0], box: [6.0, 6.0, 12.0], mat: 'abs', color: BLACK }],
    src: 'Raspberry Pi 4 Model B mechanical drawing (85 × 56 mm, holes Ø2.7 at 3.5 mm in, 58 × 49 apart; GPIO at 32.5, 52.5; USB at 9 and 27, Ethernet at 45.75; USB-C 11.2, HDMI 26 and 39.5, audio 54 along its edge); mass 46 g its product brief; the connectors\' outlines typical' },
  'Raspberry Pi 5': { L: 85, W: 56, t: 1.4, color: 0x1f7a3a, hole: 2.7, holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]],
    feats: [{ name: 'GPIO header', xy: [32.5, 52.5], header: [20, 2] }, { name: 'Ethernet jack', xy: [77.0, 10.2], box: RJ45_PI, color: 0xb8bcc2 }, { name: 'USB ports (lower)', xy: [78.35, 29.1], box: USB_A2, color: 0xb8bcc2 }, { name: 'USB ports (upper)', xy: [78.35, 47.0], box: USB_A2, color: 0xb8bcc2 },
      { name: 'USB-C power', xy: [11.2, 2.5], box: USB_C, color: 0xb8bcc2 }, { name: 'micro-HDMI 0', xy: [25.8, 2.5], box: HDMI_U, color: 0xb8bcc2 }, { name: 'micro-HDMI 1', xy: [39.2, 2.5], box: HDMI_U, color: 0xb8bcc2 }],
    src: 'Raspberry Pi 5 mechanical drawing (the Pi 4\'s outline, holes and GPIO); its Ethernet and USB places, as the Pi 3 B+ has them, and the connectors\' outlines typical' },
  'Raspberry Pi Pico': { L: 51, W: 21, t: 1.0, color: 0x1f7a3a, hole: 2.1, holes: [[2.0, 4.8], [49.0, 4.8], [2.0, 16.2], [49.0, 16.2]], mass: 3,
    pins: [...row(20, 1.37, 1.61), ...row(20, 1.37, 19.39)], feats: [{ name: 'micro-USB jack', xy: [1.5, 10.5], box: MICRO_USB, color: 0xb8bcc2 }, { name: 'RP2040', xy: [25.5, 10.5], box: [7.0, 0.9, 7.0], mat: 'epoxy', color: BLACK }],
    src: 'Raspberry Pi Pico datasheet, its mechanical drawing (51 × 21 × 1 mm, holes Ø2.1 at 47 × 11.4, two rows of 20 pins 17.78 apart); mass 3 g typical; its jack and chip places typical' },
  'ESP32-DevKitC V4': { L: 54.4, W: 27.9, t: 1.6, color: BLACK, hole: 0, holes: [],
    pins: [...row(19, 4.34, 1.25), ...row(19, 4.34, 26.65)], feats: [{ name: 'ESP32-WROOM-32 module', xy: [41.65, 13.95], box: [25.5, 3.1, 18.0], color: 0xb8bcc2 }, { name: 'micro-USB jack', xy: [1.5, 13.95], box: MICRO_USB, color: 0xb8bcc2 }],
    src: 'Espressif ESP32-DevKitC V4 guide (two rows of 19 pins, 1 in apart) and ESP32-WROOM-32 datasheet (18 × 25.5 × 3.1 mm); its outline 54.4 × 27.9 mm and the parts\' places typical' },
  'NodeMCU v2 (ESP8266)': { L: 48.3, W: 25.4, t: 1.6, color: BLACK, hole: 3.0, holes: [[2.5, 2.5], [45.8, 2.5], [2.5, 22.9], [45.8, 22.9]],
    pins: [...row(15, 6.37, 1.27), ...row(15, 6.37, 24.13)], feats: [{ name: 'ESP-12E module', xy: [36.3, 12.7], box: [24.0, 3.0, 16.0], color: 0xb8bcc2 }, { name: 'micro-USB jack', xy: [1.5, 12.7], box: MICRO_USB, color: 0xb8bcc2 }],
    src: 'NodeMCU v2 (Amica) board, typical: two rows of 15 pins 0.9 in apart, holes Ø3; Ai-Thinker ESP-12E datasheet (24 × 16 × 3 mm)' },
};
const portsSaid = (r: BoardRow) => `its points "<board> PCB/holes": ${r.holes.length ? `0 to ${r.holes.length - 1} its mounting holes (Ø${r.hole} mm)` : 'no mounting holes'}${r.pins?.length ? `, then its ${r.pins.length} pins` : ''}, then its parts' joints`;
const DEVBOARD: PartFamily<BoardRow> = {
  id: 'piece.devboard', name: 'Development board', gloss: 'A development board (Arduino, Raspberry Pi, Pico, ESP32, ESP8266) as its PCB with its mounting holes, pins and biggest connectors at their places', domains: ['electrical', 'electronics', 'software'],
  says: 'A development board by name (Arduino Uno R3, Mega 2560, Nano; Raspberry Pi 4, Pi 5, Pico; ESP32-DevKitC; NodeMCU): its PCB (FR-4, its drawing\'s outline) offering its mounting holes and pins as lines (`<board> PCB/holes`, the holes first: a screw or standoff down one, a header pin or lead down a pin), its headers (sockets offering `<board> <header>/pins`) and biggest connectors standing at their places on their joints',
  rows: DEV_BOARDS, size: 'Arduino Uno R3', source: 'each board\'s maker\'s drawing, said on its row',
  envelope: ENV_BOARD,
  recipe: (r, size) => boardOf(size, r),
  expect: (r, size) => ({ bound: boardBound(r), ...(r.mass !== undefined ? { mass: r.mass / 1000 } : {}), tol: 0.01, says: `its PCB and its parts at their places (${portsSaid(r)})${r.mass !== undefined ? `; ${size} weighs ${r.mass} g` : ''}` }),
  tests: [{ inputs: {}, outputs: { pieces: 25 } }],
};

// ---- displays: a module's PCB and its glass, its pins and holes -----------------------------------------------------
export const DISPLAYS: Record<string, BoardRow> = {
  'LCD1602 (HD44780)': { L: 80, W: 36, t: 1.6, color: 0x1f7a3a, hole: 2.5, holes: [[2.5, 2.5], [77.5, 2.5], [2.5, 33.5], [77.5, 33.5]], pins: row(16, 8.0, 33.5),
    feats: [{ name: 'LCD', xy: [40, 18], box: [71.3, 9.4, 24.2], mat: 'glass', color: 0x2a3a6a }], src: 'the common 1602 module, typical: 80 × 36 mm, holes at 75 × 31 apart, 16 pins at 2.54 mm along its top' },
  'LCD2004 (HD44780)': { L: 98, W: 60, t: 1.6, color: 0x1f7a3a, hole: 3.5, holes: [[2.5, 2.5], [95.5, 2.5], [2.5, 57.5], [95.5, 57.5]], pins: row(16, 10.0, 57.5),
    feats: [{ name: 'LCD', xy: [49, 29], box: [87.0, 9.5, 40.0], mat: 'glass', color: 0x2a3a6a }], src: 'the common 2004 module, typical: 98 × 60 mm, holes at 93 × 55 apart, 16 pins along its top' },
  'OLED 0.96" (SSD1306)': { L: 27.3, W: 27.8, t: 1.2, color: 0x1f3f8a, hole: 2.0, holes: [[2.0, 2.0], [25.3, 2.0], [2.0, 25.8], [25.3, 25.8]], pins: row(4, 9.84, 25.3),
    feats: [{ name: 'OLED glass', xy: [13.65, 13.6], box: [26.7, 1.5, 19.26], mat: 'glass', color: 0x101010 }], src: 'the common 0.96 in 128 × 64 I2C module, typical: 27.3 × 27.8 mm, 4 pins (GND, VCC, SCL, SDA)' },
  'OLED 1.3" (SH1106)': { L: 35.4, W: 33.5, t: 1.2, color: 0x1f3f8a, hole: 2.5, holes: [[2.5, 2.5], [32.9, 2.5], [2.5, 31.0], [32.9, 31.0]], pins: row(4, 13.89, 31.0),
    feats: [{ name: 'OLED glass', xy: [17.7, 15.5], box: [34.5, 1.6, 23.0], mat: 'glass', color: 0x101010 }], src: 'the common 1.3 in 128 × 64 I2C module, typical: 35.4 × 33.5 mm, 4 pins' },
  'TFT 2.8" (ILI9341)': { L: 86, W: 50, t: 1.6, color: 0xa02020, hole: 3.0, holes: [[3.0, 3.0], [83.0, 3.0], [3.0, 47.0], [83.0, 47.0]], pins: row(14, 5.5, 8.49, P, 'y'),
    feats: [{ name: 'TFT glass', xy: [46, 25], box: [69.2, 3.8, 50.0], mat: 'glass', color: 0x101010 }], src: 'the common 2.8 in 240 × 320 SPI module, typical: 86 × 50 mm, 14 pins along its end' },
};
const DISPLAY: PartFamily<BoardRow> = {
  id: 'piece.display', name: 'Display module', gloss: 'A display module (LCD1602, LCD2004, 0.96" and 1.3" OLED, 2.8" TFT): its PCB, holes, pins and its glass', domains: ['electrical', 'electronics'],
  says: 'A display module by name: its PCB offering its mounting holes and pins as lines (`<module> PCB/holes`, the holes first), its glass (or an LCD with its bezel) standing on it at its place. Module outlines, holes and pins typical of the common modules',
  rows: DISPLAYS, size: 'LCD1602 (HD44780)', source: 'the common modules, typical (each row says)',
  envelope: 'its PCB as its outline with its holes and pins; its glass or LCD a solid box (its backlight, bezel and cable not drawn)',
  recipe: (r, size) => boardOf(size, r),
  expect: (r) => ({ bound: boardBound(r), tol: 0.01, says: `its PCB and its glass (${portsSaid(r)})` }),
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};

// ---- connectors -----------------------------------------------------------------------------------------------------
/** A receptacle's shell: its width and height across its opening, its depth (mm), its shell's wall (mm), from its row. */
type Usb = { w: number; h: number; d: number; wall: number; mat: string; src: string };
export const USB: Record<string, Usb> = {
  'USB-C': { w: 8.94, h: 3.26, d: 7.35, wall: 0.3, mat: 'steel-low', src: 'opening 8.34 × 2.56 mm (USB Type-C Cable and Connector Specification); shell 8.94 × 3.26 × 7.35 mm typical of a mid-mount receptacle' },
  'micro-B': { w: 7.5, h: 2.45, d: 5.0, wall: 0.3, mat: 'steel-low', src: 'opening 6.9 × 1.85 mm (USB Micro specification); shell typical' },
  'mini-B': { w: 7.7, h: 3.9, d: 9.2, wall: 0.3, mat: 'steel-low', src: 'opening 6.8 × 3.0 mm (USB 2.0 mini-B), shell typical' },
  'USB-A': { w: 13.14, h: 5.7, d: 14.0, wall: 0.4, mat: 'steel-low', src: 'opening 12.5 × 5.12 mm (USB 2.0 specification, A receptacle); shell typical' },
  'USB-A stacked': { w: 13.25, h: 15.6, d: 17.4, wall: 0.4, mat: 'steel-low', src: 'two A receptacles one over the other, typical (as boards like the Raspberry Pi carry them)' },
  'USB-B': { w: 12.0, h: 10.9, d: 16.0, wall: 0.4, mat: 'steel-low', src: 'opening 8.45 × 7.78 mm (USB 2.0 specification, B receptacle) in a shell typical of a through-hole B jack' },
};
const USBJACK: PartFamily<Usb> = {
  id: 'piece.usb', name: 'USB receptacle', gloss: 'A USB receptacle (C, micro-B, mini-B, A, stacked A, B) as its shell, its opening up', domains: ['electrical', 'electronics'],
  says: 'A USB receptacle by its kind: its steel shell drawn as a box hollow to its opening, made standing with its opening up (+y; turn it to face out), its cavity offered as a room (`<kind> receptacle/cavity`) the plug goes into. Its tongue and contacts not drawn',
  rows: USB, size: 'USB-C', source: 'the USB-IF specifications\' openings; shells typical (each row says)',
  recipe: (u, size) => made(`${size} receptacle`, u.mat, { case: [mm(u.w), mm(u.d), mm(u.h), mm(u.wall), mm(u.wall)] }, { color: 0xb8bcc2 }),
  expect: (u) => ({ bound: bound(u.w, u.d, u.h), mass: (mm(u.w) * mm(u.d) * mm(u.h) - mm(u.w - 2 * u.wall) * mm(u.d - u.wall) * mm(u.h - 2 * u.wall)) * rho(u.mat), tol: 0.01, massTol: 0.03, says: 'its shell across its opening by its depth; nominal mass, the shell' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['USB-C receptacle/cavity'] } }],
};
/** A modular jack: its housing (w × depth × h, mm) hollow to its socket (sw × sh, mm), made with its socket up. */
type Rj = { w: number; d: number; h: number; sw: number; floor: number; src: string };
export const RJ: Record<string, Rj> = {
  'RJ45 (8P8C)': { w: 16.0, d: 21.3, h: 13.5, sw: 11.7, floor: 3.0, src: 'socket 11.7 mm wide (IEC 60603-7); housing typical of a through-hole 8P8C jack' },
  'RJ45 with magnetics': { w: 16.0, d: 21.6, h: 13.6, sw: 11.7, floor: 5.0, src: 'socket per IEC 60603-7; a MagJack\'s housing, typical' },
  'RJ11 (6P4C)': { w: 11.6, d: 16.0, h: 11.4, sw: 7.9, floor: 3.0, src: 'socket 7.9 mm wide (6P, FCC 68.500); housing typical' },
};
const RJJACK: PartFamily<Rj> = {
  id: 'piece.rj45', name: 'Modular jack (RJ45, RJ11)', gloss: 'An RJ45 or RJ11 modular jack, its socket up', domains: ['electrical', 'electronics'],
  says: 'A modular jack by its kind (RJ45 8P8C, RJ45 with magnetics, RJ11): its housing hollow to its socket\'s width, made standing with its socket up (+y; turn it to face out), the socket offered as a room (`<kind> jack/cavity`). Its contacts, latch and pins not drawn',
  rows: RJ, size: 'RJ45 (8P8C)', source: 'IEC 60603-7 and FCC 68.500 sockets; housings typical (each row says)',
  cannot: (r) => (r.sw < r.w && r.sw < r.h ? null : `a socket narrower than its housing (${r.sw} mm)`),
  // (a case's wall is one size round its cavity: the socket's width sets it, so the socket is drawn square to it)
  recipe: (r, size) => made(`${size} jack`, 'pbt', { case: [mm(r.w), mm(r.d), mm(r.h), mm((r.w - r.sw) / 2), mm(r.floor)] }, { color: BLACK }),
  expect: (r) => ({ bound: bound(r.w, r.d, r.h), tol: 0.01, says: 'its housing' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
/** An audio jack: its body (w × h × d, mm) and its nose (Ø, length, its bore the plug's), made with its nose up. */
type Audio = { w: number; h: number; d: number; nose: number; noseL: number; bore: number; src: string };
export const AUDIO: Record<string, Audio> = {
  '3.5 mm (PJ-307)': { w: 12.0, h: 5.0, d: 6.0, nose: 5.0, noseL: 2.5, bore: 3.6, src: 'its plug Ø3.5 mm (IEC 60130-8); body typical of a PJ-307 through-hole jack' },
  '3.5 mm (PJ-320, SMD)': { w: 12.0, h: 5.0, d: 6.0, nose: 5.0, noseL: 2.0, bore: 3.6, src: 'its plug Ø3.5 mm (IEC 60130-8); body typical of a PJ-320A' },
  '2.5 mm': { w: 9.0, h: 4.0, d: 5.0, nose: 3.8, noseL: 2.0, bore: 2.6, src: 'its plug Ø2.5 mm (IEC 60130-8); body typical' },
  '6.35 mm (panel)': { w: 21.0, h: 15.0, d: 20.0, nose: 9.5, noseL: 9.0, bore: 6.5, src: 'its plug Ø6.35 mm (IEC 60603-11); body and its M9 bushing typical of a panel jack' },
};
const AUDIOJACK: PartFamily<Audio> = {
  id: 'piece.audiojack', name: 'Audio jack', gloss: 'A phone jack (2.5, 3.5 or 6.35 mm): its body and its nose, made with its nose up', domains: ['electrical', 'electronics', 'everyday'],
  says: 'An audio (phone) jack by its size: its body and its nose stacked on it, the nose a tube whose bore offers its axis (`<size> jack nose/axis`): the plug goes down it into the body (Through a line). Made standing, its nose up (+y; turn it to face out). Its contacts and lugs not drawn',
  rows: AUDIO, size: '3.5 mm (PJ-307)', source: 'IEC 60130-8 and IEC 60603-11 plugs; bodies typical (each row says)',
  recipe: (a, size) => stack(`${size} jack`, 1, [{ b: made(`${size} jack body`, 'pbt', { box: bound(a.w, a.h, a.d) }, { color: BLACK }) }, { b: made(`${size} jack nose`, a.noseL > 5 ? 'brass' : 'pbt', { tube: [mm(a.bore / 2), mm(a.nose / 2), mm(a.noseL)] }, { color: a.noseL > 5 ? 0xc9a54a : BLACK }) }]),
  expect: (a) => ({ bound: bound(a.w, a.h + a.noseL, a.d), tol: 0.01, says: 'its body and nose' }),
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['3.5 mm (PJ-307) jack nose/axis'] } }],
};
/** A D-sub: its flange (A wide, C high, its holes B apart, mm), its D shell (its width at its middle, its height), its
 *  rows of contacts and their pitch, its insulator behind. */
type Dsub = { A: number; B: number; C: number; sw: number; sh: number; rows: number[]; src: string };
const DSUB_SRC = 'shell and flange of the MIL-DTL-24308 outline as makers\' datasheets give it (typical): ';
export const DSUB: Record<string, Dsub> = {
  'DE-9': { A: 30.81, B: 24.99, C: 12.55, sw: 15.4, sh: 7.9, rows: [5, 4], src: `${DSUB_SRC}A 30.81, B 24.99, C 12.55 mm` },
  'DA-15': { A: 39.14, B: 33.32, C: 12.55, sw: 23.7, sh: 7.9, rows: [8, 7], src: `${DSUB_SRC}A 39.14, B 33.32 mm` },
  'DB-25': { A: 53.04, B: 47.04, C: 12.55, sw: 37.4, sh: 7.9, rows: [13, 12], src: `${DSUB_SRC}A 53.04, B 47.04 mm` },
  'DC-37': { A: 69.32, B: 63.5, C: 12.55, sw: 53.9, sh: 7.9, rows: [19, 18], src: `${DSUB_SRC}A 69.32, B 63.50 mm` },
  'DD-50': { A: 66.93, B: 61.11, C: 15.37, sw: 51.3, sh: 10.7, rows: [17, 16, 17], src: `${DSUB_SRC}A 66.93, B 61.11, C 15.37 mm` },
};
const dsubPins = (d: Dsub): [number, number][] => d.rows.flatMap((n, r) => Array.from({ length: n }, (_, k) => [mm((k - (n - 1) / 2) * 2.77), mm((r - (d.rows.length - 1) / 2) * 2.84)] as [number, number]));
const DSUBJACK: PartFamily<Dsub> = {
  id: 'piece.dsub', name: 'D-sub connector', gloss: 'A D-subminiature connector (DE-9, DA-15, DB-25, DC-37, DD-50): its insulator, flange and D shell', domains: ['electrical', 'electronics'],
  says: 'A D-sub by its shell (DE-9 to DD-50), made standing, its mating face up: its insulator below offering its contacts as lines (`<shell> insulator/pins`, 2.77 mm along, 2.84 mm between rows), its steel flange with its two holes B apart (`<shell> flange/holes`, Ø3.1, for a panel\'s screws), its D shell on top (drawn as a box of its middle width: its 10° sides not drawn)',
  rows: DSUB, size: 'DE-9', source: 'MIL-DTL-24308 outline as makers\' datasheets give it, typical',
  recipe: (d, size) => stack(`${size} connector`, 1, [
    { b: made(`${size} insulator`, 'pbt', { box: bound(d.sw + 1.5, 6.0, d.sh + 1.0) }, { color: BLACK, pattern: { name: 'pins', points: dsubPins(d) } }) },
    { b: made(`${size} flange`, 'steel-low', { box: bound(d.A, 0.8, d.C) }, { color: 0xb8bcc2, pattern: { name: 'holes', points: [[mm(-d.B / 2), 0], [mm(d.B / 2), 0]], hole: mm(1.55) } }) },
    { b: made(`${size} shell`, 'steel-low', { case: [mm(d.sw), mm(6.0), mm(d.sh), mm(0.3), mm(0.3)] }, { color: 0xb8bcc2 }) }]),
  expect: (d) => ({ bound: bound(d.A, 12.8, d.C), tol: 0.01, says: 'its flange (A × C) by its insulator, flange and shell (6.0, 0.8 and 6.0 mm, typical)' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['DE-9 flange/holes', 'DE-9 insulator/pins', 'DE-9 shell/cavity'] } }],
};
/** A screw terminal block: its pitch and poles, its body (depth, height, mm), its wire entry's and screw's holes. */
type Term = { p: number; n: number; d: number; h: number; wire: number; screw: number; src: string };
const TERM_ROWS: [number, number, number, number, number, string][] = [[5.08, 8.1, 10.0, 3.0, 3.5, 'typical of a 5.08 mm block (MKDS 1.5 class)'], [5.0, 7.6, 10.0, 3.0, 3.5, 'typical of the KF301 block'], [3.5, 7.0, 8.5, 2.0, 2.6, 'typical of a 3.5 mm block'], [2.54, 6.2, 8.0, 1.2, 1.8, 'typical of a 2.54 mm block']];
export const TERMINALS: Record<string, Term> = Object.fromEntries(TERM_ROWS.flatMap(([p, d, h, wire, screw, src]) => Array.from({ length: p >= 5 ? 11 : 7 }, (_, k) => [`${p} mm, ${k + 2} poles`, { p, n: k + 2, d, h, wire, screw, src }] as [string, Term])));
const SCREWTERM: PartFamily<Term> = {
  id: 'piece.screwterminal', name: 'Screw terminal block', gloss: 'A screw terminal block by its pitch and poles: wires go into its front, screws down its top', domains: ['electrical', 'electronics'],
  says: 'A PCB screw terminal block by its pitch (2.54 to 5.08 mm) and poles: its lower housing with each pole\'s wire entry cut into its front (`<block> wire entries/holes`, along −z), its upper housing with each pole\'s screw hole down its top (`<block> screws/holes`). Its clamps and legs not drawn; it stands on a board by Onto',
  rows: TERMINALS, size: '5.08 mm, 2 poles', source: 'typical of makers\' datasheets (each row says)',
  recipe: (t, size) => { const w = t.n * t.p, lo = t.h * 0.55, hi = t.h - lo, pts = grid(t.n, 1, t.p).map(([x]) => [x, 0] as [number, number]);
    return stack(`${size} terminal block`, 1, [
      { b: made(`${size} wire entries`, 'pa66-gf30', { box: bound(w, lo, t.d) }, { color: 0x2e7d32, pattern: { name: 'holes', points: pts, face: '+z', depth: mm(t.d * 0.8), hole: mm(t.wire / 2) } }) },
      { b: made(`${size} screws`, 'pa66-gf30', { box: bound(w, hi, t.d) }, { color: 0x2e7d32, pattern: { name: 'holes', points: pts.map(([x]) => [x, 0] as [number, number]), face: '+y', depth: mm(hi * 0.9), hole: mm(t.screw / 2) } }) }]); },
  expect: (t) => ({ bound: bound(t.n * t.p, t.h, t.d), tol: 0.01, says: 'its poles by its pitch, its height and depth' }),
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['5.08 mm, 2 poles screws/holes', '5.08 mm, 2 poles wire entries/holes'] } }],
};
/** JST headers, top entry, by series: pitch, its shroud's width over its pitches, depth and height, its walls and
 *  floor, its pins (square) and how far they stand below (mm). */
type Jst = { p: number; extra: number; d: number; h: number; wall: number; floor: number; pin: number; tail: number; src: string };
export const JSTS: Record<string, Jst> = {
  XH: { p: 2.5, extra: 4.9, d: 5.75, h: 7.0, wall: 0.6, floor: 1.5, pin: 0.64, tail: 3.4, src: 'JST XH datasheet (B<n>B-XH-A): (n − 1) × 2.5 + 4.9 wide, 5.75 deep, 7.0 high; walls and floor typical' },
  PH: { p: 2.0, extra: 3.9, d: 4.5, h: 6.0, wall: 0.5, floor: 1.2, pin: 0.5, tail: 3.4, src: 'JST PH datasheet (B<n>B-PH-K): (n − 1) × 2.0 + 3.9 wide, 4.5 deep, 6.0 high; walls and floor typical' },
  SH: { p: 1.0, extra: 3.0, d: 2.9, h: 4.25, wall: 0.4, floor: 1.0, pin: 0.32, tail: 0.6, src: 'JST SH datasheet (BM<n>B-SRSS-TB): (n − 1) × 1.0 + 3.0 wide, 4.25 high; its depth, walls and floor typical; its SMD leads drawn straight down' },
};
const JST_PINS: Record<string, [number, number]> = { XH: [2, 16], PH: [2, 16], SH: [2, 15] };
const jstOf = (j: Jst, series: string, n: number): Block => {
  if (series === 'XH') return jstXH(n);
  const name = `JST ${series} ${n}-pin housing`, H = mm(j.h);
  const shroud = made(name, 'nylon', { case: [mm((n - 1) * j.p + j.extra), H, mm(j.d), mm(j.wall), mm(j.floor)] }, { color: 0xf2efe6, pattern: { name: 'pins', points: grid(n, 1, j.p) } });
  return stack(`JST ${series} ${n}-pin header`, 1, [{ b: pinned(shroud, `${name}/pins`, () => made(`JST ${series} pin`, 'brass', { box: [mm(j.pin), H + mm(j.tail), mm(j.pin)] }, { color: LEAD }), n) }]);
};
const pinsOf = (set: Record<string, unknown>) => Math.round(Number(set.pins));
const JSTH: PartFamily<Jst> = {
  id: 'piece.jst', name: 'JST header', gloss: 'A JST header, top entry, XH (2.50 mm), PH (2.00 mm) or SH (1.00 mm), by its pins: its shroud and pins', domains: ['electrical', 'electronics'],
  says: 'A JST header, top entry, by its series (XH 2.50 mm, PH 2.00 mm, SH 1.00 mm, as JST\'s datasheets draw them) and pins: its shroud, its pins put down through it; its pins go down a board\'s footprints and take the plug\'s contacts in the shroud',
  rows: JSTS, size: 'XH', source: 'JST\'s XH, PH and SH datasheets (each row says)',
  settings: [{ key: 'pins', label: 'Pins', type: 'number', default: 2 }],
  cannot: (_j, series, set) => { const n = pinsOf(set), [a, b] = JST_PINS[series]!; return Number.isInteger(n) && n >= a && n <= b ? null : `JST ${series} has no header of ${String(set.pins)} pins (${a} to ${b})`; },
  recipe: (j, series, set) => jstOf(j, series, pinsOf(set)),
  expect: (j, _s, set) => ({ bound: bound((pinsOf(set) - 1) * j.p + j.extra, j.h + j.tail, j.d), tol: 0.01, says: 'its shroud\'s width over its pins, its height and its pins below, its depth' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['JST XH 2-pin housing/pins'] } }, { set: { pins: 4 }, inputs: {}, outputs: { pieces: 5 } }, { set: { size: 'PH', pins: 3 }, inputs: {}, outputs: { pieces: 4 } }],
};

// ---- fans -----------------------------------------------------------------------------------------------------------
/** An axial fan: its frame's side and depth, its mounting holes' spacing and diameter (mm). Its bore, hub and blades
 *  typical (the bore 0.95 of its side, the hub 0.42). */
type Fan = { W: number; D: number; s: number; hole: number; src: string };
const FAN_SRC = 'frame and hole spacing typical of makers\' datasheets for the common size';
export const FANS: Record<string, Fan> = {
  '25×10': { W: 25, D: 10, s: 20.0, hole: 2.4, src: FAN_SRC }, '30×10': { W: 30, D: 10, s: 24.0, hole: 3.2, src: FAN_SRC }, '40×10': { W: 40, D: 10, s: 32.0, hole: 3.4, src: FAN_SRC }, '40×20': { W: 40, D: 20, s: 32.0, hole: 3.4, src: FAN_SRC },
  '50×15': { W: 50, D: 15, s: 40.0, hole: 3.4, src: FAN_SRC }, '60×15': { W: 60, D: 15, s: 50.0, hole: 3.4, src: FAN_SRC }, '60×25': { W: 60, D: 25, s: 50.0, hole: 3.4, src: FAN_SRC }, '70×15': { W: 70, D: 15, s: 60.0, hole: 4.3, src: FAN_SRC },
  '80×25': { W: 80, D: 25, s: 71.5, hole: 4.3, src: FAN_SRC }, '92×25': { W: 92, D: 25, s: 82.5, hole: 4.3, src: FAN_SRC }, '120×25': { W: 120, D: 25, s: 105.0, hole: 4.3, src: FAN_SRC }, '140×25': { W: 140, D: 25, s: 124.5, hole: 4.3, src: FAN_SRC },
};
// (its frame's section: its square, a cut in to its bore, round its bore and back out: one outline, read by even-odd)
const fanSection = (W: number, r: number): [number, number][] => { const n = 48, h = W / 2;
  return [[-h, -h], [h, -h], [h, h], [-h, h], [-h, 0], ...Array.from({ length: n + 1 }, (_, k) => { const a = Math.PI + (2 * Math.PI * k) / n; return [r * Math.cos(a), -r * Math.sin(a)] as [number, number]; })]; };
const FANF: PartFamily<Fan> = {
  id: 'piece.fan', name: 'Axial fan', gloss: 'An axial fan by its frame (25 to 140 mm): its frame with its four holes, its back struts, its hub and blades', domains: ['electrical', 'mechanical', 'thermal'],
  says: 'An axial fan by its frame size (side × depth, mm), its air along z: its frame (PBT) round its bore with its four mounting holes on their standard spacing along z (`<size> fan frame/holes`, a screw down each), the plate of its struts behind (its four windows cut), its hub and blades through its bore on its axis (`<size> fan frame/axis`), the hub standing on the struts. Approximated: its blades drawn as the ring they sweep, its struts as a plate with four round windows',
  rows: FANS, size: '40×10', source: 'typical of makers\' datasheets (the hole spacings 40 mm 32, 60 mm 50, 80 mm 71.5, 120 mm 105)',
  recipe: (f, size) => { const W = mm(f.W), sp = mm(Math.max(1.5, f.D * 0.1)), Df = mm(f.D) - sp, r = 0.475 * W, a = mm(f.s) / 2, hub = 0.21 * W;
    const frame = made(`${size} fan frame`, 'pbt', { section: { pts: fanSection(W, r), L: Df } }, { color: BLACK, pattern: { name: 'holes', points: [[-a, -a], [a, -a], [a, a], [-a, a]], face: '+z', hole: mm(f.hole / 2) } });
    // (the struts' plate made flat with its four windows along y, stood up across the air's path by a quarter turn about x)
    const Rw = (hub + r) / 2, back = made(`${size} fan struts`, 'pbt', { box: [W, sp, W] }, { color: BLACK, pattern: { name: 'windows', circle: { n: 4, r: Rw, phase: Math.PI / 4 }, hole: Math.min(((r - hub) / 2) * 0.85, Rw * 0.6) } });
    const body = stack(`${size} fan`, 2, [{ b: frame }, { b: turn(back, 0, 90) }]);
    const slot = r * Math.cos(Math.PI / 48), rotor = over(made(`${size} fan hub`, 'pbt', { cyl: [hub, Df] }, { color: BLACK }), `${size} fan hub/axis`, made(`${size} fan blades`, 'pbt', { tube: [hub, slot - mm(0.6), Df * 0.7] }, { color: 0x303030 }), 'mid', 'touch');
    return through(body, rotor, { port: `${size} fan frame/axis`, from: 'lo' }, 'slide'); },
  expect: (f) => ({ bound: bound(f.W, f.W, f.D), tol: 0.01, says: 'its frame\'s side by its depth' }),
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};

// ---- packages: TO-220, axial diodes, crystals, buzzers --------------------------------------------------------------
/** TO-220AB (JEDEC): body E × D × A, tab J1 thick standing H above its body with its hole ØP, three leads b × c at e on
 *  L below (mm, the outline's middles). Each row a part in it, with its ratings and datasheet. */
type To220 = { kind: string; rating: string; src: string };
const TO220_OUT = { E: 10.16, D: 9.0, A: 4.45, J1: 1.27, H: 6.35, P: 3.75, Q: 2.8, b: 0.85, c: 0.5, L: 13.7 } as const;
export const TO220S: Record<string, To220> = {
  'L7805CV': { kind: 'regulator', rating: '5 V, 1.5 A', src: 'ST L78 datasheet, TO-220' }, 'L7812CV': { kind: 'regulator', rating: '12 V, 1.5 A', src: 'ST L78 datasheet, TO-220' }, 'LM317T': { kind: 'regulator', rating: '1.25–37 V, 1.5 A', src: 'TI LM317 datasheet, KCS (TO-220)' },
  'IRLZ44N': { kind: 'MOSFET', rating: '55 V, 47 A, logic level', src: 'Infineon IRLZ44N datasheet, TO-220AB' }, 'IRF540N': { kind: 'MOSFET', rating: '100 V, 33 A', src: 'Infineon IRF540N datasheet, TO-220AB' },
  'TIP120': { kind: 'Darlington', rating: '60 V, 5 A', src: 'onsemi TIP120 datasheet, TO-220' }, 'TIP31C': { kind: 'transistor', rating: '100 V, 3 A', src: 'onsemi TIP31C datasheet, TO-220' },
};
const TO220: PartFamily<To220> = {
  id: 'piece.to220', name: 'TO-220 part', gloss: 'A part in a TO-220 package (a regulator, a MOSFET, a transistor): its body, tab and three leads', domains: ['electrical', 'electronics'],
  says: 'A regulator, MOSFET or transistor in a TO-220AB package (JEDEC outline, its middles): its three leads at 2.54 mm run up into its epoxy body (`<part> body/leads`), its tab on top with its hole across it (`<part> tab/holes`, Ø3.75, along z: an M3 screw to a heatsink). Its leads go down a board\'s footprints (Through a line, its middle lead on the line). Approximated: its tab drawn centred on its body\'s thickness (it is flush with its back)',
  rows: TO220S, size: 'L7805CV', source: 'JEDEC TO-220AB outline; each row\'s maker\'s datasheet',
  recipe: (_r, size) => { const o = TO220_OUT, name = `${size} ${_r.kind}`;
    const body = made(`${size} body`, 'epoxy', { box: bound(o.E, o.D, o.A) }, { color: BLACK, pattern: { name: 'leads', points: grid(3) } });
    const leads = pinned(body, `${size} body/leads`, () => made(`${size} lead`, 'copper', { box: bound(o.b, o.D + o.L, o.c) }, { color: LEAD }), 3);
    return stack(name, 1, [{ b: leads }, { b: made(`${size} tab`, 'copper', { box: bound(o.E, o.H, o.J1) }, { color: 0xc0c4c8, pattern: { name: 'holes', points: [[0, mm(o.H / 2 - o.Q)]], face: '+z', hole: mm(o.P / 2) } }) }]); },
  expect: () => { const o = TO220_OUT; return { bound: bound(o.E, o.L + o.D + o.H, o.A), tol: 0.01, says: 'its body\'s width, its leads, body and tab, its thickness' }; },
  tests: [{ inputs: {}, outputs: { pieces: 5, offers: ['L7805CV body/leads', 'L7805CV tab/holes'] } }],
};
/** An axial diode: its body Ø and length, its leads' Ø (mm), its package (JEDEC), its body's stuff. */
type Diode = { pkg: string; D: number; L: number; d: number; mat: string; src: string };
export const DIODES: Record<string, Diode> = {
  '1N4007 (DO-41)': { pkg: 'DO-41', D: 2.6, L: 5.2, d: 0.86, mat: 'epoxy', src: 'JEDEC DO-41 (Vishay 1N4001–1N4007 datasheet: body Ø2.7, 5.2 long at most, leads Ø0.86)' },
  '1N4001 (DO-41)': { pkg: 'DO-41', D: 2.6, L: 5.2, d: 0.86, mat: 'epoxy', src: 'JEDEC DO-41 (Vishay 1N4001–1N4007 datasheet)' },
  '1N5819 (DO-41)': { pkg: 'DO-41', D: 2.6, L: 5.2, d: 0.86, mat: 'epoxy', src: 'JEDEC DO-41 (Vishay 1N5817–1N5819 datasheet)' },
  '1N4733A zener (DO-41)': { pkg: 'DO-41', D: 2.6, L: 5.2, d: 0.86, mat: 'glass', src: 'JEDEC DO-41 glass (Vishay 1N4728A–1N4764A datasheet)' },
  '1N4148 (DO-35)': { pkg: 'DO-35', D: 1.85, L: 4.25, d: 0.5, mat: 'glass', src: 'JEDEC DO-35 (Vishay 1N4148 datasheet: body Ø2.0, 4.25 long at most, leads Ø0.5)' },
  '1N5408 (DO-201AD)': { pkg: 'DO-201AD', D: 5.3, L: 9.5, d: 1.3, mat: 'epoxy', src: 'JEDEC DO-201AD (Vishay 1N5400–1N5408 datasheet: body Ø5.3, 9.5 long, leads Ø1.3)' },
};
const DLEAD = 28;
const DIODE: PartFamily<Diode> = {
  id: 'piece.diode', name: 'Axial diode', gloss: 'An axial diode (DO-35, DO-41, DO-201AD): a lead, its body with its cathode band, a lead', domains: ['electrical', 'electronics'],
  says: 'An axial diode by its part (1N4007, 1N4148, 1N5819, 1N5408, a zener): a lead, its body (epoxy or glass) with its cathode band (paint, 0.05 mm, typical) slid over its top end, and a lead, stood upright; its leads (28 mm, typical) go down a board\'s footprints',
  rows: DIODES, size: '1N4007 (DO-41)', source: 'JEDEC DO-35, DO-41, DO-201AD outlines; each row\'s datasheet',
  recipe: (r, size) => { const lead = () => made(`${size} lead`, 'copper', { cyl: [mm(r.d / 2), mm(DLEAD)] }, { color: LEAD }), R = mm(r.D / 2);
    const body = over(made(`${size} body`, r.mat, { cyl: [R, mm(r.L)] }, { color: r.mat === 'glass' ? 0xd86a3a : BLACK }), `${size} body/axis`, made(`${size} band`, 'epoxy', { tube: [R, R + mm(0.05), mm(r.L * 0.15)] }, { color: 0xd8d8d8 }), { from: 'hi', along: mm(r.L * 0.08) }, 'touch');
    return stack(`${size} diode`, 1, [{ b: lead() }, { b: body }, { b: lead() }]); },
  expect: (r) => ({ bound: bound(r.D + 0.1, r.L + 2 * DLEAD, r.D + 0.1), mass: disc(mm(r.D)) * mm(r.L) * rho(r.mat) + 2 * disc(mm(r.d)) * mm(DLEAD) * rho('copper'), tol: 0.01, massTol: 0.03, says: 'its body (and band) by its leads and length; nominal mass, its body and leads' }),
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
/** A crystal in an HC-49 can: its can (w × h × d, mm; its rounded ends not drawn), two leads Ø0.43 at 4.88 mm. */
type Xtal = { w: number; h: number; d: number; src: string };
export const CRYSTALS: Record<string, Xtal> = {
  'HC-49/U': { w: 11.05, h: 13.46, d: 4.65, src: 'HC-49/U outline (Abracon HC49U datasheet: 11.05 × 4.65 × 13.46 mm at most, leads 4.88 apart)' },
  'HC-49/S': { w: 11.05, h: 3.5, d: 4.65, src: 'HC-49/S (US) low profile, typical of makers\' datasheets (11.05 × 4.65 × 3.5 mm)' },
  'HC-49/4H': { w: 11.05, h: 4.0, d: 4.65, src: 'HC-49/4H, typical (11.05 × 4.65 × 4.0 mm)' },
};
const XLEAD = 12;
const CRYSTAL: PartFamily<Xtal> = {
  id: 'piece.crystal', name: 'Crystal (HC-49)', gloss: 'A quartz crystal in an HC-49 can: its can and two leads', domains: ['electrical', 'electronics'],
  says: 'A quartz crystal in an HC-49 can (U, S or 4H): its steel can (its rounded ends drawn square) on two leads Ø0.43 mm at 4.88 mm, 12 mm below it (typical), run up into it (`<can> crystal can/leads`); its leads go down a board\'s footprints',
  rows: CRYSTALS, size: 'HC-49/U', source: 'HC-49 outlines as makers\' datasheets give them (each row says)',
  recipe: (x, size) => { const can = made(`${size} crystal can`, 'steel-low', { box: bound(x.w, x.h, x.d) }, { color: 0xc0c4c8, pattern: { name: 'leads', points: [[mm(-2.44), 0], [mm(2.44), 0]] } });
    return stack(`${size} crystal`, 1, [{ b: pinned(can, `${size} crystal can/leads`, () => made(`${size} crystal lead`, 'copper', { cyl: [mm(0.215), mm(x.h + XLEAD)] }, { color: LEAD }), 2) }]); },
  expect: (x) => ({ bound: bound(x.w, x.h + XLEAD, x.d), tol: 0.01, says: 'its can by its leads' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['HC-49/U crystal can/leads', 'HC-49/U crystal lead/axis'] } }],
};
/** A buzzer: its body Ø and height, its pins' pitch (mm), active (its own oscillator) or passive. */
type Buzz = { D: number; h: number; p: number; src: string };
export const BUZZERS: Record<string, Buzz> = {
  '12 mm active (TMB12A05)': { D: 12.0, h: 9.5, p: 7.6, src: 'typical of the TMB12A05 datasheet (Ø12 × 9.5 mm, pins 7.6 apart)' },
  '12 mm passive': { D: 12.0, h: 8.5, p: 7.6, src: 'typical of a 12 mm magnetic transducer (Ø12 × 8.5 mm)' },
  '9 mm': { D: 9.0, h: 5.5, p: 4.0, src: 'typical of a 9 mm magnetic buzzer (Ø9 × 5.5 mm, pins 4.0 apart)' },
  '16 mm': { D: 16.0, h: 14.0, p: 7.6, src: 'typical of a 16 mm buzzer (Ø16 × 14 mm)' },
};
const BLEAD = 4;
const BUZZER: PartFamily<Buzz> = {
  id: 'piece.buzzer', name: 'Buzzer', gloss: 'A round buzzer: its body and two pins', domains: ['electrical', 'electronics'],
  says: 'A round buzzer (active or passive, 9 to 16 mm): its body (Ø × height) on its two pins (0.6 mm, 4 mm below it, typical) run up into it (`<size> buzzer body/pins`); its pins go down a board\'s footprints. Its sound hole not drawn',
  rows: BUZZERS, size: '12 mm active (TMB12A05)', source: 'typical of makers\' datasheets (each row says)',
  recipe: (z, size) => { const body = made(`${size} buzzer body`, 'abs', { cyl: [mm(z.D / 2), mm(z.h)] }, { color: BLACK, pattern: { name: 'pins', points: [[mm(-z.p / 2), 0], [mm(z.p / 2), 0]] } });
    return stack(`${size} buzzer`, 1, [{ b: pinned(body, `${size} buzzer body/pins`, () => made(`${size} buzzer pin`, 'copper', { cyl: [mm(0.3), mm(z.h + BLEAD)] }, { color: LEAD }), 2) }]); },
  expect: (z) => ({ bound: bound(z.D, z.h + BLEAD, z.D), tol: 0.01, says: 'its body by its pins' }),
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};

// ---- relays and switches --------------------------------------------------------------------------------------------
/** A PCB relay: its body (L × W × H, mm) and its pins' places about its middle (mm): COM, coil, coil, NC, NO. */
type Relay = { L: number; W: number; H: number; pins: [number, number][]; coil: string; src: string };
const SRD_PINS: [number, number][] = [[-7.5, 0], [-5.5, -6.0], [-5.5, 6.0], [6.5, -6.0], [6.5, 6.0]];
export const RELAYS: Record<string, Relay> = {
  'SRD-05VDC-SL-C': { L: 19.0, W: 15.5, H: 15.3, pins: SRD_PINS, coil: '5 V', src: 'Songle SRD datasheet (19.0 × 15.5 × 15.3 mm); its pins\' places typical' },
  'SRD-12VDC-SL-C': { L: 19.0, W: 15.5, H: 15.3, pins: SRD_PINS, coil: '12 V', src: 'Songle SRD datasheet; pins typical' },
  'SRD-24VDC-SL-C': { L: 19.0, W: 15.5, H: 15.3, pins: SRD_PINS, coil: '24 V', src: 'Songle SRD datasheet; pins typical' },
  'G5LE-1 5VDC': { L: 22.5, W: 16.5, H: 18.5, pins: [[-9.0, 0], [-7.0, -6.0], [-7.0, 6.0], [8.5, -6.0], [8.5, 6.0]], coil: '5 V', src: 'typical of the Omron G5LE (22.5 × 16.5 × 18.5 mm)' },
};
const RPIN = 3.5;
const RELAY: PartFamily<Relay> = {
  id: 'piece.relay', name: 'PCB relay', gloss: 'A PCB relay (Songle SRD, Omron G5LE): its body and five pins', domains: ['electrical', 'electronics'],
  says: 'A sugar-cube PCB relay by its part: its body on its five pins (COM, the coil\'s two, NC, NO; 3.5 mm below it, typical) run up into it (`<part> relay/pins`); its pins go down a board\'s footprints. Its coil and contacts inside not drawn',
  rows: RELAYS, size: 'SRD-05VDC-SL-C', source: 'Songle SRD datasheet; Omron G5LE typical (each row says)',
  envelope: 'its body is its outline (no coil, armature or contacts inside), so its drawn mass is a solid box\'s',
  recipe: (r, size) => { const body = made(`${size} relay`, 'pbt', { box: bound(r.L, r.H, r.W) }, { color: 0x1a4fa0, pattern: { name: 'pins', points: r.pins.map(([x, z]) => [mm(x), mm(z)] as [number, number]) } });
    return stack(`${size} relay (${r.coil} coil)`, 1, [{ b: pinned(body, `${size} relay/pins`, () => made(`${size} relay pin`, 'copper', { box: bound(0.8, r.H + RPIN, 0.5) }, { color: LEAD }), r.pins.length) }]); },
  expect: (r) => ({ bound: bound(r.L, r.H + RPIN, r.W), tol: 0.01, says: 'its body by its pins' }),
  tests: [{ inputs: {}, outputs: { pieces: 6, offers: ['SRD-05VDC-SL-C relay/pins'] } }],
};
/** A tactile switch: its body (side, height), its plunger (Ø, above it), its legs' places about its middle (mm). */
type Tact = { s: number; h: number; pd: number; ph: number; lx: number; lz: number; src: string };
export const TACTILES: Record<string, Tact> = {
  '6×6×4.3': { s: 6, h: 3.5, pd: 3.5, ph: 0.8, lx: 2.6, lz: 2.25, src: 'typical of the 6 × 6 mm through-hole tactile switch (Omron B3F class)' },
  '6×6×5': { s: 6, h: 3.5, pd: 3.5, ph: 1.5, lx: 2.6, lz: 2.25, src: 'typical 6 × 6 × 5 mm' },
  '6×6×7': { s: 6, h: 3.5, pd: 3.5, ph: 3.5, lx: 2.6, lz: 2.25, src: 'typical 6 × 6 × 7 mm' },
  '6×6×9.5': { s: 6, h: 3.5, pd: 3.5, ph: 6.0, lx: 2.6, lz: 2.25, src: 'typical 6 × 6 × 9.5 mm' },
  '12×12×4.3': { s: 12, h: 3.6, pd: 6.8, ph: 0.7, lx: 5.6, lz: 2.5, src: 'typical of the 12 × 12 mm tactile switch (Omron B3F-4000 class)' },
  '12×12×7.3': { s: 12, h: 3.6, pd: 6.8, ph: 3.7, lx: 5.6, lz: 2.5, src: 'typical of the Omron B3F-4055 (12 × 12 × 7.3 mm)' },
};
const TLEG = 3.5;
const TACTILE: PartFamily<Tact> = {
  id: 'piece.tactile', name: 'Tactile switch', gloss: 'A tactile push switch (6 × 6 or 12 × 12 mm) by its height: its body, plunger and four legs', domains: ['electrical', 'electronics'],
  says: 'A through-hole tactile switch by its size and height: its body on its four legs (3.5 mm below it) run up into it (`<size> switch body/legs`), its plunger on top. Approximated: its legs drawn straight down from inside its body (they bend out to 6.5 × 4.5 or 12.5 × 5.0 mm in fact)',
  rows: TACTILES, size: '12×12×7.3', source: 'typical of Omron B3F-class datasheets (each row says)',
  recipe: (t, size) => { const body = made(`${size} switch body`, 'pom', { box: bound(t.s, t.h, t.s) }, { color: 0x2a2a2a, pattern: { name: 'legs', points: [[-t.lx, -t.lz], [t.lx, -t.lz], [t.lx, t.lz], [-t.lx, t.lz]].map(([x, z]) => [mm(x!), mm(z!)] as [number, number]) } });
    const legs = pinned(body, `${size} switch body/legs`, () => made(`${size} switch leg`, 'steel-low', { box: bound(0.7, t.h + TLEG, 0.3) }, { color: LEAD }), 4);
    return stack(`${size} tactile switch`, 1, [{ b: legs }, { b: made(`${size} switch plunger`, 'pom', { cyl: [mm(t.pd / 2), mm(t.ph)] }, { color: 0x3a3a3a }) }]); },
  expect: (t) => ({ bound: bound(t.s, TLEG + t.h + t.ph, t.s), tol: 0.01, says: 'its body by its legs, body and plunger' }),
  tests: [{ inputs: {}, outputs: { pieces: 6, offers: ['12×12×7.3 switch body/legs', '12×12×7.3 switch plunger/axis'] } }],
};
/** A micro switch: its body (L × H × T, mm), its two mounting holes (Ø, apart), its plunger and lever (mm). */
type Micro = { L: number; H: number; T: number; hole: number; s: number; lever: number; src: string };
export const MICROS: Record<string, Micro> = {
  'Omron SS-5GL': { L: 19.8, H: 10.2, T: 6.4, hole: 2.35, s: 9.5, lever: 16.0, src: 'Omron SS datasheet (19.8 × 10.2 × 6.4 mm, holes Ø2.35 9.5 apart); its lever typical' },
  'Omron V-15-1C25': { L: 27.8, H: 15.9, T: 10.3, hole: 3.1, s: 22.2, lever: 25.0, src: 'Omron V datasheet (27.8 × 15.9 × 10.3 mm, holes Ø3.1 22.2 apart); its lever typical' },
  'Omron D2F': { L: 12.8, H: 6.5, T: 5.8, hole: 1.6, s: 6.5, lever: 0, src: 'Omron D2F datasheet (12.8 × 6.5 × 5.8 mm, holes Ø1.6 6.5 apart), its pin plunger' },
  'KW11-3Z': { L: 20.0, H: 10.0, T: 6.4, hole: 2.9, s: 9.5, lever: 16.0, src: 'typical of the KW11-3Z (20 × 10 × 6.4 mm)' },
};
const MICRO: PartFamily<Micro> = {
  id: 'piece.microswitch', name: 'Micro switch', gloss: 'A snap-action micro switch (Omron SS, V, D2F; KW11): its body with its two holes, its plunger and lever', domains: ['electrical', 'electronics', 'mechanical'],
  says: 'A snap-action micro switch by its part: its body with its two mounting holes across its thickness (`<part> body/holes`, along z, a screw through each), its plunger on top and its lever over it (laid flat along it, its hinge not drawn). Its three terminals not drawn',
  rows: MICROS, size: 'Omron SS-5GL', source: 'Omron\'s SS, V and D2F datasheets; KW11 typical (each row says)',
  recipe: (m, size) => { const body = made(`${size} body`, 'pbt', { box: bound(m.L, m.H, m.T) }, { color: BLACK, pattern: { name: 'holes', points: [[mm(-m.s / 2), mm(-m.H * 0.15)], [mm(m.s / 2), mm(-m.H * 0.15)]], face: '+z', hole: mm(m.hole / 2) } });
    const items = [{ b: body }, { b: made(`${size} plunger`, 'pom', { cyl: [mm(0.8), mm(1.0)] }, { color: 0xe03030 }) }, ...(m.lever > 0 ? [{ b: made(`${size} lever`, 'stainless-304', { box: bound(m.lever, 0.4, 4.0) }) }] : [])];
    return stack(`${size} micro switch`, 1, items); },
  expect: (m) => ({ bound: bound(Math.max(m.L, m.lever), m.H + 1.0 + (m.lever > 0 ? 0.4 : 0), Math.max(m.T, m.lever > 0 ? 4.0 : 0)), tol: 0.01, says: 'its body by its plunger and lever' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['Omron SS-5GL body/holes', 'Omron SS-5GL plunger/axis'] } }],
};

// ---- prototyping boards ---------------------------------------------------------------------------------------------
/** A solderless breadboard: its body (L × W × H, mm), its terminal strips' columns (each a strip of 5 on each side of
 *  the channel), its power rails (rows of holes, in groups of 5). */
type Bread = { L: number; W: number; H: number; cols: number; rail: number; src: string };
export const BREADBOARDS: Record<string, Bread> = {
  '170 points': { L: 47.0, W: 35.0, H: 8.5, cols: 17, rail: 0, src: 'typical of the 170-point mini breadboard (47 × 35 × 8.5 mm: 17 columns of 5 + 5)' },
  '400 points': { L: 82.5, W: 54.6, H: 8.5, cols: 30, rail: 25, src: 'typical of the 400-point half breadboard (30 columns, 4 rails of 25)' },
  '830 points': { L: 165.1, W: 54.6, H: 8.5, cols: 63, rail: 50, src: 'typical of the MB-102 830-point breadboard (63 columns, 4 rails of 50)' },
};
/** Its holes about its middle (mm): the strips a–e and f–j (the channel 7.62 mm across, a DIP's span), then its rails,
 *  each a group of 5 a pitch apart from the next. */
const breadHoles = (b: Bread): [number, number][] => {
  const out: [number, number][] = [], x0 = -((b.cols - 1) / 2) * P;
  for (let c = 0; c < b.cols; c++) for (const z of [-3.81 - 4 * P, -3.81 - 3 * P, -3.81 - 2 * P, -3.81 - P, -3.81, 3.81, 3.81 + P, 3.81 + 2 * P, 3.81 + 3 * P, 3.81 + 4 * P]) out.push([x0 + c * P, z]);
  if (b.rail) { const groups = b.rail / 5, span = groups * 5 * P + (groups - 1) * P, r0 = -span / 2 + P / 2;
    for (const z of [-b.W / 2 + 2.6, -b.W / 2 + 2.6 + P, b.W / 2 - 2.6 - P, b.W / 2 - 2.6]) for (let g = 0; g < groups; g++) for (let k = 0; k < 5; k++) out.push([r0 + (g * 6 + k) * P, z]); }
  return out.map(([x, z]) => [mm(x), mm(z)] as [number, number]);
};
const BREADBOARD: PartFamily<Bread> = {
  id: 'piece.breadboard', name: 'Solderless breadboard', gloss: 'A solderless breadboard (170, 400 or 830 points): its body and every hole as a line', domains: ['electrical', 'electronics', 'everyday'],
  says: 'A solderless breadboard by its points: its body (ABS) offering every hole as a line (`<size> breadboard/holes`: its terminal strips column by column, a to j, the channel 7.62 mm across between e and f; then its four rails, in groups of 5), for a lead, a pin or a jumper to go down. Its holes drawn uncut and its spring contacts not drawn',
  rows: BREADBOARDS, size: '400 points', source: 'typical of the common breadboards (each row says)',
  recipe: (b, size) => made(`${size} breadboard`, 'abs', { box: bound(b.L, b.H, b.W) }, { color: 0xf2f2ee, pattern: { name: 'holes', points: breadHoles(b) } }),
  expect: (b) => ({ bound: bound(b.L, b.H, b.W), mass: mm(b.L) * mm(b.H) * mm(b.W) * rho('abs'), tol: 0.01, massTol: 0.02, says: 'its body; nominal mass, its body drawn solid (its holes and contacts not drawn)' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['400 points breadboard/holes'] } }],
};
/** A perfboard: its size (mm), its grid of holes (columns × rows at 2.54 mm), its four corner holes. */
type Perf = { L: number; W: number; nx: number; ny: number; src: string };
export const PERFBOARDS: Record<string, Perf> = {
  '40×60 (13×21)': { L: 60, W: 40, nx: 21, ny: 13, src: 'typical of the 4 × 6 cm double-sided prototype board' },
  '50×70 (18×24)': { L: 70, W: 50, nx: 24, ny: 18, src: 'typical of the 5 × 7 cm double-sided prototype board' },
  '70×90 (24×30)': { L: 90, W: 70, nx: 30, ny: 24, src: 'typical of the 7 × 9 cm double-sided prototype board' },
  '90×150 (30×53)': { L: 150, W: 90, nx: 53, ny: 30, src: 'typical of the 9 × 15 cm double-sided prototype board' },
};
const perfHoles = (p: Perf): [number, number][] => { const c = 1.8, corners: [number, number][] = [[-p.L / 2 + c, -p.W / 2 + c], [p.L / 2 - c, -p.W / 2 + c], [p.L / 2 - c, p.W / 2 - c], [-p.L / 2 + c, p.W / 2 - c]];
  return [...corners.map(([x, z]) => [mm(x), mm(z)] as [number, number]), ...grid(p.nx, p.ny)]; };
const PERFBOARD: PartFamily<Perf> = {
  id: 'piece.perfboard', name: 'Perfboard', gloss: 'A prototype board (FR-4, 2.54 mm grid) by its size: its corner holes and every hole of its grid as a line', domains: ['electrical', 'electronics'],
  says: 'A perfboard (FR-4, 1.6 mm, a 2.54 mm grid) by its size and grid: it offers its holes as lines (`<size> perfboard/holes`: 0 to 3 its corner holes for M2 screws, then its grid column by column), for a lead, a pin or a screw to go down. Its holes drawn uncut (what passes cuts its own) and its pads not drawn',
  rows: PERFBOARDS, size: '50×70 (18×24)', source: 'typical of the common prototype boards (each row says)',
  recipe: (p, size) => made(`${size} perfboard`, 'fr4', { box: bound(p.L, 1.6, p.W) }, { color: 0x2e7d32, pattern: { name: 'holes', points: perfHoles(p) } }),
  expect: (p) => ({ bound: bound(p.L, 1.6, p.W), mass: mm(p.L) * mm(1.6) * mm(p.W) * rho('fr4'), tol: 0.01, massTol: 0.02, says: 'its outline; nominal mass, the plate uncut (its holes take about a tenth)' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['50×70 (18×24) perfboard/holes'] } }],
};

/** The electronics families, in the order they are most wanted. */
export const ELECTRONICS = [DEVBOARD, USBJACK, RJJACK, AUDIOJACK, JSTH, DSUBJACK, SCREWTERM, DISPLAY, FANF, TO220, DIODE, CRYSTAL, BUZZER, RELAY, TACTILE, MICRO, BREADBOARD, PERFBOARD] as PartFamily<unknown>[];
