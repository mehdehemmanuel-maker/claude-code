// Seeed Studio's two systems, by Seeed's own wiki: the XIAO boards (one thumbnail footprint, 21 × 17.8 mm, fourteen
// pins — eleven GPIO and three power — whatever chip is on it) and Grove (every module a board of one of five sizes
// with the same four-pin 2.0 mm plug, so a module plugs into a bus rather than being wired). Those two shapes are what
// the catalogue is: a module is drawn from its size and its bus, not from a list of part numbers, so one that is not
// named here is still drawn from its own size and bus.
// Owner of: the XIAO footprint and its boards, the Grove plug and its modules (their figures and their drawings).

import { BOARD_PARTS, chip, chipLed } from '../boards/boardparts';
import { smallPart, type SmallRow } from '../boards/sbc';
import type { Comp } from '../boards/sbc';
import type { Part, Print } from '../parts/kits';

type V3 = [number, number, number];
/** How a board part (src/nexus/boards/boardparts.ts, drawn in millimetres) becomes a placed part: `compPart` in
 *  components.ts, passed in because components.ts draws this file (so this file cannot import it). */
export type AsPart = (c: Comp, nm: string) => Part;
const PI = Math.PI, mm = 0.001;

/** The XIAO footprint, which every board in the family shares (Seeed's wiki). */
export const XIAO = {
  size: [17.8, 21, 3.5] as V3, pins: 14, gpio: 11, power: 3, pitch: 2.54, rows: 7,
  /** what each pad is called, each row read from the end away from the USB-C socket toward it (Seeed's XIAO pinout) */
  names: { a: ['D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'], b: ['D7', 'D8', 'D9', 'D10', '3V3', 'GND', '5V'] },
  src: 'Seeed\'s wiki: the common XIAO footprint, 21 × 17.8 mm, fourteen castellated pins — eleven GPIO (all PWM) and three power — down its two long edges, with a USB-C socket at one end, a reset and a boot button, and a pad for a battery underneath',
};
/** One board of the family, by the chip on it. Only boards whose figures are taken from Seeed's own wiki are here;
 *  the family is larger (SAMD21, RP2350, nRF52840, ESP32S3, ESP32C6, ESP32C5, RA4M1, MG24, nRF54L15, each with and
 *  without its Sense camera-and-microphone variant), and each is the same footprint with its own chip. */
export interface XiaoBoard { id: string; chip: string; core: string; mhz: number; sram: string; flash: string; radio: string; src: string }
export const XIAOS: XiaoBoard[] = [
  { id: 'ESP32C3', chip: 'Espressif ESP32-C3', core: 'one 32-bit RISC-V, four-stage', mhz: 160, sram: '400 KB', flash: '4 MB', radio: 'Wi-Fi 4 (802.11 b/g/n) and Bluetooth LE 5.0, with a U.FL socket for its own aerial',
    src: 'Seeed\'s wiki: 160 MHz, 400 KB SRAM and 4 MB flash; 11 GPIO (PWM) and 4 ADC; UART, I²C and SPI; 500 mA at 3.3 V out, charging at 380 mA fast or 40 mA trickle; 44 µA asleep, 75 mA with its radio on' },
  { id: 'RP2040', chip: 'Raspberry Pi RP2040', core: 'two Arm Cortex-M0+', mhz: 133, sram: '264 KB', flash: '2 MB', radio: 'none',
    src: 'Seeed\'s wiki: 133 MHz, 264 KB SRAM and 2 MB flash; 11 digital I/O (all PWM) of which 4 read analogue; I²C, UART, SPI and SWD; −40 to 85 °C' },
];
/** Grove: the plug every module shares, and the five board sizes Seeed makes them in (its wiki). */
export const GROVE = {
  pins: 4, pitch: 2.0,
  /** what the four pins are, by what the module talks over */
  bus: { i2c: ['SCL', 'SDA', 'VCC', 'GND'], uart: ['RX', 'TX', 'VCC', 'GND'], digital: ['D(n)', 'D(n+1)', 'VCC', 'GND'], analogue: ['A(n)', 'A(n+1)', 'VCC', 'GND'] } as Record<string, string[]>,
  /** its board sizes, in units of 20 mm */
  sizes: { '1x1': [20, 20], '1x2': [20, 40], '1x3': [20, 60], '2x2': [40, 40], '2x3': [40, 60] } as Record<string, [number, number]>,
  volts: [3.3, 5],
  src: 'Seeed\'s wiki: one four-pin 2.0 mm plug on every module — on an I²C module its pins are SCL, SDA, VCC and GND — and five board sizes, 20 × 20, 20 × 40, 20 × 60, 40 × 40 and 40 × 60 mm; a module runs at 3.3 or 5 V, and a cable with a male end at 2.54 mm fits a plain header',
  leaves: 'each module\'s own parts are its own: what is drawn here is the board, its plug, its mounting holes and the block its own part sits in, sized to the module\'s size',
};

/** What a Grove module of a size weighs, an estimate: Seeed publishes no weight, so it is its own 1.6 mm FR4 board,
 *  its socket (0.3 g, typical of a four-way 2.0 mm socket) and the block its own part sits in, which is what is drawn. */
export const groveGrams = (size: string): number => { const [w, d] = GROVE.sizes[size] ?? GROVE.sizes['1x1']!, [bw, bd] = groveBody(w, d);
  return +((w * d * 1.6 * 1.85) / 1000 + 0.3 + (bw * 4.5 * bd * 1.9) / 1000).toFixed(2); };
/** The block a module's own part sits in, sized to its board. */
const groveBody = (w: number, d: number): [number, number] => [Math.min(14, w - 8), Math.min(14, d - 14)];
/** What a XIAO weighs, an estimate: Seeed publishes no weight. A Raspberry Pi Pico is 3 g (its datasheet), of which its
 *  51 × 21 × 1 mm FR4 board is about 2.0 and everything on it about 1.0; a XIAO's 17.8 × 21 × 1 board is 0.7, and its
 *  USB-C socket, chip, buttons, lights and plating about 1.0 more. */
export const XIAO_G = 1.7;

/** What a Grove bus can carry: how many modules of a bus can share one port, and what refuses. */
export function groveChain(bus: string, n: number): { ok: boolean; says: string } {
  const b = bus.toLowerCase();
  if (b === 'i2c') return { ok: true, says: `I²C is a bus: ${n} modules can share one port through a hub, as long as no two answer to the same address` };
  if (b === 'uart') return { ok: n <= 1, says: n <= 1 ? 'one UART module to a port: it is a pair of wires between two ends' : `${n} UART modules cannot share a port: a UART is point to point, so each needs its own` };
  return { ok: n <= 1, says: n <= 1 ? `one ${bus} module to a port: its pins are that port's own` : `${n} ${bus} modules cannot share a port: each needs the pins to itself` };
}
/** Whether a module's voltage suits the board it is plugged into. */
export function groveFits(moduleV: number, boardV: number): { ok: boolean; says: string } {
  if (moduleV === boardV) return { ok: true, says: `both at ${boardV} V` };
  if (moduleV === 5 && boardV === 3.3) return { ok: false, says: 'a 5 V module on a 3.3 V board: it may not run at all, and what it sends back can be too high for the board\'s pins — a level shifter between them, or a board that gives 5 V' };
  return { ok: true, says: `a ${moduleV} V module on a ${boardV} V board: it runs, but read its own range first` };
}

// ---- drawn ----------------------------------------------------------------------------------------------------

const P = (name: string, shape: Part['shape'], o: Partial<Part> = {}): Part => ({ name, shape, at: [0, 0, 0], ...o } as Part);
const B = (name: string, s: V3, at: V3, o: Partial<Part> = {}): Part => P(name, { box: [s[0] * mm, s[1] * mm, s[2] * mm] }, { at: [at[0] * mm, at[1] * mm, at[2] * mm], ...o });

/** A rectangle's corners, in a prism's own x–y, about a middle. */
const rect = (w: number, h: number, cx = 0, cy = 0): [number, number][] => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]].map(([x, y]) => [x * mm, y * mm] as [number, number]);

/** The Grove socket: its white moulded shell, open at its mouth where the cable goes in, keyed down one side so the
 *  cable goes in one way round, a back wall, and its four tinned contacts along its floor with their solder tails out
 *  of the back. Drawn standing on a board, its mouth facing +z (out of the board's near edge). */
export function grovePlugParts(nm = 'Grove socket'): Part[] {
  const w = 4 * GROVE.pitch + 3, d = 5.9, h = 4.9, wall = 0.9, iw = w - 2 * wall, ih = h - 1.5;
  const ivory = { mat: 'pbt', color: 0xf0f0ee, finish: 'moulded' as const };
  return [P(nm, { prism: { pts: rect(w, h, 0, h / 2), L: d * mm, holes: [rect(iw, ih, 0, h / 2 - 0.1)] } }, { at: [0, 0, 0], ...ivory, item: 'grove-socket', fixed: 'soldered to the board, its cable pushed in until its catch clicks' }),
    B(`${nm} back wall`, [w, h, 1.0], [0, h / 2, -(d / 2 - 0.5)], { ...ivory }),
    B(`${nm} key`, [1.2, 1.2, d - 1.0], [iw / 2 - 0.6, h - 1.4, 0.5], { ...ivory, says: 'the key, so the cable goes in only one way round' }),
    // (each contact a right angle: its blade along the socket's floor where the plug's pin presses on it, and its leg
    //  down through the board to be soldered underneath — the socket is a through-hole part, not a surface-mount one)
    ...Array.from({ length: GROVE.pins }, (_, k) => ({ name: `${nm} contact ${k + 1}`, at: [((k - 1.5) * GROVE.pitch) * mm, 0, 0] as V3, item: 'socket-contact', parts: [
      P(`${nm} contact ${k + 1} blade`, { box: [0.64 * mm, 0.25 * mm, (d - 1.6) * mm] }, { at: [0, 0.65 * mm, 0.3 * mm], mat: 'phosphor-bronze', color: 0xc8b48a, finish: 'polished' }),
      P(`${nm} contact ${k + 1} leg`, { box: [0.5 * mm, 4.6 * mm, 0.5 * mm] }, { at: [0, -1.4 * mm, -(d / 2 - 1.0) * mm], mat: 'phosphor-bronze', color: 0xc8b48a, finish: 'polished', says: 'through the board, soldered underneath' })] } as Part))];
}

/** The passives every Grove module carries whatever else it is: an I²C module's two bus pull-ups and a capacitor
 *  across its supply; on the other buses one series resistor and that capacitor. All 0402, the commonest case. */
const groveSmall = (bus: string): SmallRow[] => (bus === 'i2c'
  ? [['r', 0, 0, 1, 0.5, 0], ['r', 0, 0, 1, 0.5, 0], ['c', 0, 0, 1, 0.5, 0]]
  : [['r', 0, 0, 1, 0.5, 0], ['c', 0, 0, 1, 0.5, 0]]) as SmallRow[];
/** What goes into a Grove module of this bus, for the kind's own `of`. */
export const groveOf = (bus: string): string => `pcb-bare grove-socket socket-contact*${GROVE.pins} grove-part chip-resistor${bus === 'i2c' ? '*2' : ''} chip-capacitor`;

/** A Grove module: its board at one of Seeed's five sizes, its socket at the near edge, its two mounting holes, the
 *  block its own part sits in (what that part is belongs to the module, not to Grove), and its printed name and pins. */
export function groveParts(nm: string, size = '1x1', bus = 'i2c', asPart: AsPart = (c) => ({ name: c.name, at: [0, 0, 0] } as Part), what = 'its sensor'): Part[] {
  const [w, d] = GROVE.sizes[size] ?? GROVE.sizes['1x1']!, t = 1.6, pins = GROVE.bus[bus] ?? GROVE.bus.digital!;
  const holes = [[-1, -1], [1, -1]].map(([sx, sz]) => ({ r: 1.1 * mm, depth: 3 * t * mm, at: [sx! * (w / 2 - 3.5) * mm, 2 * t * mm, sz! * (d / 2 - 3.5) * mm] as V3, dir: [0, -1, 0] as V3 }));
  const board = B(`${nm} board`, [w, t, d], [0, t / 2, 0], { mat: 'fr4', color: 0x0d5a2a, item: 'pcb-bare', cuts: holes, fixed: 'the module\'s own board' });
  const plug = grovePlugParts(`${nm} socket`).map((p) => ({ ...p, at: [(p.at?.[0] ?? 0), (p.at?.[1] ?? 0) + t * mm, (p.at?.[2] ?? 0) + (d / 2 - 5.9 / 2) * mm] as V3 }));
  const [bw, bd] = groveBody(w, d);
  const body = B(`${nm} ${what}`, [bw, 4.5, bd], [0, t + 2.5, -2], { mat: 'epoxy', color: 0x1a1c20, finish: 'moulded', item: 'grove-part', says: `what this module is: ${what}` });
  // (its printed ink, its own thin layer on the board's top: the board itself is drilled, and a drilled solid cannot
  //  carry a print laid out on one of its faces)
  const silk: Print[] = (pins.map((p, k) => ({ t: p, at: [((k - 1.5) * GROVE.pitch) * mm, (d / 2 - 7.4) * mm] as [number, number], h: 0.9 * mm, ink: 0xeef1f3, dir: -PI / 2 })) as Print[])
    .concat([{ t: 'Grove', at: [0, (-d / 2 + 2.6) * mm] as [number, number], h: 1.3 * mm, ink: 0xeef1f3, dir: 0 },
      { t: nm, at: [0, (-d / 2 + 4.4) * mm] as [number, number], h: 0.9 * mm, ink: 0xeef1f3, dir: 0 },
      // (pin 1's mark, a square printed beside the socket's first contact)
      { at: [(-1.5 * GROVE.pitch - 1.4) * mm, (d / 2 - 7.4) * mm] as [number, number], lx: 0.7 * mm, wz: 0.7 * mm, ink: 0xeef1f3 }] as Print[]);
  const mark = B(`${nm} silkscreen`, [w, 0.02, d], [0, t + 0.01, 0], { mat: 'epoxy', color: 0x0d5a2a, finish: 'texture', prints: silk, says: `its name and its pins, printed: ${pins.join(' ')}` });
  // (its own passives: an I²C module's two bus pull-ups, and a capacitor across its supply — every Grove module has
    //  them, whatever else it is; where they sit is an estimate)
  const pass = groveSmall(bus).map((r, k) => asPart({ ...smallPart(r), at: [((k % 2 ? 1 : -1) * (w / 2 - 3.2)), t, d / 2 - 7.4 - Math.floor(k / 2) * 2.2] }, nm));
  return [{ name: nm, at: [0, 0, 0], parts: [board, mark, ...plug, body, ...pass] } as Part];
}

/** Which package each board's chips are in, and the mark read on them. A radio board's flash is inside its own chip
 *  (Espressif's ESP32-C3FN4 carries its 4 MB), so it has one; a board without a radio has its flash beside it. */
const CHIPS: Record<string, { soc: string; mark: string; flash?: [string, string]; charger?: boolean }> = {
  ESP32C3: { soc: 'QFN-32', mark: 'ESP32-C3', charger: true },
  RP2040: { soc: 'QFN-56-7x7', mark: 'RP2040', flash: ['DFN-8-3x2', '2 MB'] },
};
/** Its small parts: the decoupling and bulk capacitors and the resistors round its chip and its USB lines, all 0402.
 *  Where each sits is an estimate — Seeed publishes no layout — but that every XIAO carries them is not. */
const XIAO_SMALL: SmallRow[] = ([[-7.0, -5.4], [7.0, -5.4], [-7.0, -2.4], [7.0, -2.4], [-7.0, 0.6], [7.0, 0.6], [-7.0, 3.6], [7.0, 3.6]] as [number, number][])
  .map(([x, z], k): SmallRow => [k % 3 === 0 ? 'r' : 'c', x, z, 1, 0.5, 0]);
/** What goes into a XIAO of this chip, for the kind's own `of`: a board without a radio has a second chip (its flash)
 *  where a radio board has its antenna socket. */
export function xiaoOf(_chipId: string): string {
  const r = XIAO_SMALL.filter((q) => q[0] === 'r').length, c = XIAO_SMALL.length - r;
  // (two chips either way: the SoC and, beside it, the charger on a board that charges a cell, or the flash on one
  //  whose own chip does not carry it)
  return `pcb-bare castellated-pad*${XIAO.pins} ic-package*2 sot-package usb-c-socket tact-switch*2 led-chip-green led-chip-yellow chip-resistor*${r} chip-capacitor*${c}`;
}

/** A XIAO board: its two-layer board at the family's footprint, its chip (a QFN drawn whole from the package library,
 *  down to its die, lead frame and bond wires), its flash beside it or inside it, its USB-C socket over one end, its
 *  reset and boot buttons, its two lights, its antenna socket where it has a radio, the fourteen castellated pads down
 *  its edges, and the pads underneath for the cell it charges. */
export function xiaoParts(nm: string, chipId = 'ESP32C3', asPart: AsPart): Part[] {
  const [w, d] = XIAO.size, t = 1.0, b = XIAOS.find((x) => x.id === chipId) ?? XIAOS[0]!;
  const c = CHIPS[b.id] ?? CHIPS.ESP32C3!, radio = b.radio !== 'none';
  // (each pad a half-hole bitten out of the board's edge, its wall plated: the notch is cut from the board and the
  //  plating drawn as the crescent lining it, 1.5 mm across and 0.1 thick (a plated hole's wall, rounded up to be seen))
  const at = (k: number): [number, number, number] => [(k < XIAO.rows ? -1 : 1) * (w / 2 - 0.35), t / 2, ((k % XIAO.rows) - (XIAO.rows - 1) / 2) * XIAO.pitch];
  const pads = Array.from({ length: XIAO.pins }, (_, k) => {
    const [x, , z] = at(k), side = k < XIAO.rows ? -1 : 1, name = (side < 0 ? XIAO.names.a : XIAO.names.b)[k % XIAO.rows]!;
    const arc = (r: number, back: boolean) => Array.from({ length: 11 }, (_, j) => { const a = PI / 2 + ((back ? 10 - j : j) / 10) * PI;
      return [(side * r * Math.cos(a)) * mm, (r * Math.sin(a)) * mm] as [number, number]; });
    return P(`${nm} pad ${name}`, { prism: { pts: [...arc(0.75, false), ...arc(0.65, true)], L: t * mm } }, { at: [x * mm, (t / 2) * mm, -z * mm], rot: [PI / 2, 0, 0], mat: 'copper', color: 0xd6b25e, finish: 'plated', item: 'castellated-pad', says: `${name}: half a plated hole at the board's edge — it solders flat onto the pads under it, or takes a header pin` });
  });
  const notches = Array.from({ length: XIAO.pins }, (_, k) => { const [x, , z] = at(k); return { r: 0.75 * mm, depth: t * mm, at: [x * mm, (t / 2) * mm, z * mm] as V3, dir: [0, -1, 0] as V3 }; });
  // (its silkscreen: each pad's name printed beside it, and the board's own name across the end a cell's pads are on)
  const silk = Array.from({ length: XIAO.pins }, (_, k) => { const [x, , z] = at(k), side = k < XIAO.rows ? -1 : 1;
    return { t: (side < 0 ? XIAO.names.a : XIAO.names.b)[k % XIAO.rows]!, at: [(x - side * 3.4) * mm, z * mm] as [number, number], h: 0.75 * mm, ink: 0xd6d9dd };
  }).concat([{ t: `XIAO ${b.id}`, at: [0, (-d / 2 + 1.1) * mm] as [number, number], h: 0.85 * mm, ink: 0xd6d9dd }]);
  const board = B(`${nm} board`, [w, t, d], [0, t / 2, 0], { mat: 'fr4', color: 0x1d2026, item: 'pcb-bare', fixed: 'the board itself', cuts: notches });
  // (the silkscreen is its own thin layer on the board's top: the board itself is drilled, and a drilled solid cannot
  //  carry a print laid out on one of its faces)
  const ink = B(`${nm} silkscreen`, [w, 0.02, d], [0, t + 0.01, 0], { mat: 'epoxy', color: 0x1d2026, finish: 'texture', prints: silk, says: 'the white ink on its top: each pad\'s name and the board\'s own' });
  const soc = asPart({ ...chip(c.soc, `${b.chip} chip`, c.mark), at: [0, t, -2] }, nm);
  const flash = c.flash ? [asPart({ ...chip(c.flash[0], `flash chip (${c.flash[1]})`, ''), at: [5.5, t, 4.5] }, nm)] : [];
  // (its power chain: a 3.3 V regulator in a SOT-23-5, and beside it the charger on a board that charges a cell, or
  //  the flash on one whose own chip does not carry it; which packages they are is typical of such a board, an estimate)
  const ldo = asPart({ ...chip('SOT-23-5', '3.3 V regulator (fits by its package)', '', 'sot-package'), at: [-6.0, t, 7.8], turn: PI / 2 }, nm);
  const power = c.charger ? [asPart({ ...chip('DFN-8-3x2', 'battery charger (fits by its package)', ''), at: [6.0, t, 7.8] }, nm)] : [];
  const small = XIAO_SMALL.map((r) => asPart({ ...smallPart(r), at: [r[1], t, r[2]], turn: r[1] === 0 ? 0 : PI / 2 }, nm));
  const usb = asPart({ ...BOARD_PARTS['usb-c-16']!().comp, at: [0, t, d / 2 - 2.7], turn: -PI / 2 }, nm);
  // (its two buttons a 2.0 × 1.2 × 0.55 mm SMD tact switch, the size made for a board this small (Alps' SKRPA type);
  //  Seeed does not name its own, so this fits by its size and says so)
  const buttons = [['reset', -3.0], ['boot', 3.0]].map(([what, x]) => asPart({ ...BOARD_PARTS['tact-xiao']!().comp, name: `${what} button`, at: [Number(x), t, 1.6] }, nm));
  const leds = ([['power light (green)', 'led-chip-green', 'led-die-ingan', -1.8, 0xe7e2d2], ['user light (yellow)', 'led-chip-yellow', 'led-die-algainp', 1.8, 0xe9dcb2]] as [string, string, string, number, number][])
    .map(([name, item, die, x, color]) => asPart({ ...chipLed(1.6, 0.8, 0.6, { name, item, die, color }), at: [x, t, -d / 2 + 2.3], turn: PI / 2 }, nm));
  // (its antenna socket: a U.FL-type coaxial socket, 2.6 mm square and 1.25 tall as the standard has it, drawn as its
  //  moulded body, its ring and its centre pin — it is not a library part of its own yet, so it claims none)
  // (its antenna socket: a U.FL-type coaxial socket, 2.6 mm square and 1.25 tall as the standard has it — its moulded
  //  base, the plated ring the aerial's plug snaps over, flush with its top, and the centre pin inside it. It is not a
  //  library part of its own yet, so it claims none)
  const ufl = radio ? [{ name: `${nm} antenna socket (U.FL)`, at: [(-w / 2 + 2.6) * mm, t * mm, (-d / 2 + 4.4) * mm] as V3, says: 'a U.FL-type coaxial socket: Seeed ships a flexible 2.4 GHz aerial that clips onto it. Not a library part of its own yet', parts: [
    P(`${nm} antenna socket base`, { box: [2.6 * mm, 0.75 * mm, 2.6 * mm] }, { at: [0, 0.375 * mm, 0], mat: 'pbt', color: 0x4a4d52, finish: 'moulded' }),
    P(`${nm} antenna socket ring`, { torus: [0.78 * mm, 0.12 * mm] }, { at: [0, 0.78 * mm, 0], rot: [PI / 2, 0, 0], mat: 'brass', color: 0xc9a227, finish: 'plated' }),
    P(`${nm} antenna socket pin`, { cyl: [0.2 * mm, 0.5 * mm] }, { at: [0, 0.5 * mm, 0], mat: 'brass', color: 0xc9a227, finish: 'plated' })] } as Part] : [];
  const bat = [-1, 1].map((sg) => B(`${nm} battery pad`, [1.6, 0.05, 3], [sg * 3, -0.05, -d / 2 + 4], { mat: 'copper', color: 0xd6b25e, finish: 'plated', says: 'under the board: a cell soldered here is charged by the board' }));
  // (the rest of what is on it, weighed rather than drawn: its two copper layers (35 µm over about half the board,
  //  0.12 g), the solder under everything (about 0.05) and its regulator, charger and passives (about 0.03) — estimates)
  const rest = { name: `${nm} copper, solder, regulator, charger and passives`, at: [0, (t / 2) * mm, 0] as V3, kg: 0.0002, says: 'not drawn apart: the board\'s two copper layers, the solder under every part, and its 3.3 V regulator, its charger and its passives (estimates)' } as Part;
  return [{ name: nm, at: [0, 0, 0], parts: [board, ink, ...pads, soc, ...flash, ldo, ...power, ...small, usb, ...buttons, ...leds, ...ufl, ...bat, rest], says: `${b.chip}, ${b.core} at ${b.mhz} MHz, ${b.sram} SRAM and ${b.flash} flash` } as Part];
}
