// Common pieces, the small things every build is made of, each made only by the operations of room.ts (decision 0021):
// no place is written here, so no piece can be put where another is. Each says how it mates, by what it offers: a
// line (a bolt's shank, a pipe's axis, a plate's holes, a board's footprint) that another passes along or slides over,
// a room another goes into. The matings themselves are the operations: a bolt through plates and a nut over its end
// (`boltedJoint`), a wire's stripped end through a terminal, a coupling over a pipe, an LED's leads through a board, a
// winding over its bobbin's core, a header's pins through its body.
//
// Sizes: metric fasteners from their standards (hex bolts ISO 4017, socket screws ISO 4762, nuts ISO 4032, washers ISO
// 7089, clearance holes ISO 273 medium); copper pipe EN 1057; solid copper conductors IEC 60228 class 1 (their
// diameters typical); LEDs, the tactile switch, the pin header (2.54 mm pitch) and the terminal block (5.08 mm pitch)
// as their usual datasheets give them (typical); the rest typical, labelled so where they are made.

import { made, stack, through, onto, ring, over, boundOf, type Block, type Fit } from './room';

const mm = (x: number): number => x / 1000;

/** ISO metric coarse, M3 to M12, in mm: d the thread, s across a hex's flats (ISO 4017, ISO 4032), k a hex head's
 *  height (ISO 4017), dk a socket head's diameter and its height d (ISO 4762), m a nut's height (ISO 4032), a washer's
 *  bore d1, outside d2 and thickness hw (ISO 7089), the clearance hole for it (ISO 273, medium). */
export const METRIC = {
  M3: { d: 3, s: 5.5, k: 2, dk: 5.5, m: 2.4, d1: 3.2, d2: 7, hw: 0.5, clear: 3.4 },
  M4: { d: 4, s: 7, k: 2.8, dk: 7, m: 3.2, d1: 4.3, d2: 9, hw: 0.8, clear: 4.5 },
  M5: { d: 5, s: 8, k: 3.5, dk: 8.5, m: 4.7, d1: 5.3, d2: 10, hw: 1, clear: 5.5 },
  M6: { d: 6, s: 10, k: 4, dk: 10, m: 5.2, d1: 6.4, d2: 12, hw: 1.6, clear: 6.6 },
  M8: { d: 8, s: 13, k: 5.3, dk: 13, m: 6.8, d1: 8.4, d2: 16, hw: 1.6, clear: 9 },
  M10: { d: 10, s: 16, k: 6.4, dk: 16, m: 8.4, d1: 10.5, d2: 20, hw: 2, clear: 11 },
  M12: { d: 12, s: 18, k: 7.5, dk: 18, m: 10.8, d1: 13, d2: 24, hw: 2.5, clear: 13.5 },
} as const;
export type Metric = keyof typeof METRIC;
export const METRIC_SIZES = Object.keys(METRIC) as Metric[];
const sizeOf = (size: string) => { const m = METRIC[size as Metric]; if (!m) throw new Error(`no metric size ${size} (${METRIC_SIZES.join(', ')})`); return m; };

/** A bolt: its shank, and its head on top (a hex head, ISO 4017, or a socket head, ISO 4762). Its shank offers its axis
 *  (`<size> shank/axis`): a washer or a nut slides over it, and it passes through a hole. */
export function bolt(size: string, length: number, head: 'hex' | 'socket' = 'hex', mat = 'steel-alloy'): Block {
  const m = sizeOf(size), shank = made(`${size} shank`, mat, { cyl: [mm(m.d) / 2, length] }, { color: 0x5c5f63 });
  const top = head === 'hex' ? made(`${size} head`, mat, { hex: [mm(m.s), mm(m.k)] }, { color: 0x5c5f63 }) : made(`${size} head`, mat, { cyl: [mm(m.dk) / 2, mm(m.d)] }, { color: 0x2a2b2e });
  return stack(`${size}×${Math.round(length * 1000)} ${head === 'hex' ? 'hex bolt' : 'socket screw'}`, 1, [{ b: shank }, { b: top }]);
}
/** A hex nut, ISO 4032: its bore the thread's size (the thread itself not drawn). */
export const nut = (size: string, mat = 'steel-low'): Block => { const m = sizeOf(size); return made(`${size} nut`, mat, { hex: [mm(m.s), mm(m.m), mm(m.d) / 2] }, { color: 0x8a8c90 }); };
/** A plain washer, ISO 7089. */
export const washer = (size: string, mat = 'steel-low'): Block => { const m = sizeOf(size); return made(`${size} washer`, mat, { tube: [mm(m.d1) / 2, mm(m.d2) / 2, mm(m.hw)] }, { color: 0xa9acb0 }); };
/** A hex standoff, female both ends (M3, 5.5 mm across flats; its bore the M3 tap drill, 2.5 mm; typical). */
export const standoff = (length: number, mat = 'brass'): Block => made(`M3 standoff ${Math.round(length * 1000)} mm`, mat, { hex: [mm(5.5), length, mm(2.5) / 2] });

/** A plate (a sheet, a board, a bracket's leaf): its holes at points about its middle (x, z), each offered as a line
 *  `<name>/holes` (a hole of `hole` diameter cut, or none: a footprint where what passes cuts its own room). */
export function plate(name: string, w: number, t: number, d: number, mat: string, points: [number, number][] = [], hole = 0, color?: number): Block {
  return made(name, mat, { box: [w, t, d] }, { ...(color !== undefined ? { color } : {}), ...(points.length ? { pattern: { name: 'holes', points, ...(hole > 0 ? { hole: hole / 2 } : {}) } } : {}) });
}
/** A solid block. */
export const block = (name: string, w: number, h: number, d: number, mat: string, color?: number): Block => made(name, mat, { box: [w, h, d] }, color !== undefined ? { color } : {});
/** A round case, hollow, open at the top: its cavity offered as a room (`<name>/cavity`) for what goes in. */
export const roundCase = (name: string, r: number, h: number, wall: number, floor: number, mat: string, color?: number): Block => made(name, mat, { cup: [r, h, wall, floor] }, color !== undefined ? { color } : {});

/** Pipes and tubes by their standard sizes: outside diameter and wall, mm (copper EN 1057; aluminium and PVC typical). */
export const PIPES = {
  'copper 15×0.7': { od: 15, wall: 0.7, mat: 'copper' }, 'copper 22×0.9': { od: 22, wall: 0.9, mat: 'copper' }, 'copper 28×0.9': { od: 28, wall: 0.9, mat: 'copper' },
  'aluminium 20×2': { od: 20, wall: 2, mat: 'al-6063' }, 'aluminium 25×1.5': { od: 25, wall: 1.5, mat: 'al-6063' }, 'PVC 32×2.4': { od: 32, wall: 2.4, mat: 'pvc' },
} as const;
export type PipeSize = keyof typeof PIPES;
const pipeOf = (size: string) => { const p = PIPES[size as PipeSize]; if (!p) throw new Error(`no pipe ${size} (${Object.keys(PIPES).join(', ')})`); return p; };
/** A pipe or tube: it offers its axis (`<name>/axis`), for a coupling to slide over or something to pass along. */
export function pipe(size: string, length: number): Block { const p = pipeOf(size); return made(`${size} pipe`, p.mat, { tube: [mm(p.od / 2 - p.wall), mm(p.od / 2), length] }, p.mat === 'pvc' ? { color: 0xe8e8e4 } : {}); }
/** A straight coupling for a pipe of that size: its bore the pipe's outside and a sliding fit (0.25 mm), its wall 1.2 mm,
 *  40 mm long (typical of a solder or press coupling). */
export function coupling(size: string): Block { const p = pipeOf(size), ri = mm(p.od / 2) + 0.00025; return made(`${size} coupling`, p.mat === 'pvc' ? 'pvc' : p.mat === 'copper' ? 'brass' : p.mat, { tube: [ri, ri + mm(1.2), mm(40)] }); }

/** Solid copper conductors (IEC 60228 class 1: the conductor's diameter typical) and their PVC insulation's wall
 *  (typical of IEC 60227 single cores). */
export const WIRES = { '0.5 mm²': { d: 0.8, wall: 0.6 }, '1.5 mm²': { d: 1.38, wall: 0.7 }, '2.5 mm²': { d: 1.78, wall: 0.8 }, '4 mm²': { d: 2.25, wall: 0.8 } } as const;
export type WireSize = keyof typeof WIRES;
export const INSULATION: Record<string, number> = { red: 0xc62828, black: 0x1c1c1c, blue: 0x1565c0, brown: 0x6d4c41, 'green-yellow': 0x7cb342, white: 0xf2f2f2 };
/** A copper wire: bare, or in its insulation with each end stripped (`strip`); its core offers its axis. The core runs
 *  along y, its stripped end at the bottom first. */
export function wire(size: string, length: number, colour = 'none', strip = 0.01): Block {
  const w = WIRES[size as WireSize]; if (!w) throw new Error(`no wire ${size} (${Object.keys(WIRES).join(', ')})`);
  const core = made(`${size} core`, 'copper', { cyl: [mm(w.d) / 2, length] });
  if (colour === 'none') return core;
  if (!(INSULATION[colour] !== undefined)) throw new Error(`no insulation colour ${colour} (${Object.keys(INSULATION).join(', ')})`);
  if (!(length > 2 * strip)) throw new Error(`a wire of ${length * 1000} mm cannot be stripped ${strip * 1000} mm at each end`);
  return over(core, `${size} core/axis`, made(`${size} insulation (${colour})`, 'pvc', { tube: [mm(w.d) / 2, mm(w.d) / 2 + mm(w.wall), length - 2 * strip] }, { color: INSULATION[colour] }), 'mid', 'touch');
}

/** A bobbin (nylon, typical) and a winding of enamelled copper wound on its core, close-wound in one layer: as many turns
 *  as fit between its flanges. The winding is slid over the core: its bore the core's outside. */
export function winding(coreOD: number, length: number, wireD: number, flangeOD = coreOD * 2, bore = coreOD * 0.6): Block {
  const t = mm(1.5), core = made('bobbin core', 'nylon', { tube: [bore / 2, coreOD / 2, length] }), flange = () => made('bobbin flange', 'nylon', { tube: [bore / 2, flangeOD / 2, t] });
  const bob = stack('bobbin', 1, [{ b: flange() }, { b: core }, { b: flange() }]);
  const turns = Math.floor((length - wireD) / wireD); if (turns < 1) throw new Error(`no room for a turn: the core is ${length * 1000} mm long and the wire ${wireD * 1000} mm`);
  if (!(coreOD / 2 + wireD < flangeOD / 2)) throw new Error('the flanges are no wider than one layer of wire');
  const coil = made('copper winding', 'copper', { coil: [coreOD / 2 + wireD / 2, wireD, turns, wireD] });
  return over(bob, 'bobbin core/axis', coil, 'mid', 'touch');
}

/** Through-hole LEDs (3 mm and 5 mm): two leads 2.54 mm apart, a flange, a body and its lens, the whole 5.3 or 8.6 mm high
 *  above its flange's foot (typical datasheet sizes). Its leads end at the bottom: put through a board's footprint. */
export const LED_COLOURS: Record<string, number> = { red: 0xff2a2a, green: 0x2ee86a, blue: 0x2a6bff, yellow: 0xffd23a, white: 0xf4f6ff };
export function led(size: 3 | 5, colour = 'red', leads = mm(25)): Block {
  const c = LED_COLOURS[colour]; if (c === undefined) throw new Error(`no LED colour ${colour} (${Object.keys(LED_COLOURS).join(', ')})`);
  const r = mm(size) / 2, lead = made('lead', 'steel-low', { cyl: [mm(0.25), leads] }, { color: 0xc8ccd0 });
  const legs = ring(`${size} mm LED leads`, lead, 2, mm(1.27), 'clear');
  const flange = made(`${size} mm LED flange`, 'epoxy', { cyl: [r + mm(0.4), mm(1)] }, { color: c }), body = made(`${size} mm LED body`, 'epoxy', { cyl: [r, (size === 5 ? mm(8.6) : mm(5.3)) - mm(1) - r] }, { color: c });
  return stack(`${size} mm ${colour} LED`, 1, [{ b: legs }, { b: flange }, { b: body }, { b: made(`${size} mm LED lens`, 'epoxy', { dome: [r] }, { color: c }) }]);
}
/** A small lamp: its glass bulb (a dome, 11 mm across) on a brass screw base (E10: 9.5 mm across, 10 mm long; typical). */
export const bulb = (): Block => stack('E10 bulb', 1, [{ b: made('E10 base', 'brass', { cyl: [mm(4.75), mm(10)] }) }, { b: made('bulb glass', 'glass', { dome: [mm(5.5)] }, { color: 0xf3f0e0 }) }]);

/** A pin header, one row, 2.54 mm pitch: its plastic body, each pin (0.64 mm square, 11.6 mm long, gilt) put through it
 *  at its place (typical). */
export function header(pins: number): Block {
  if (!(Number.isInteger(pins) && pins >= 1 && pins <= 40)) throw new Error('a header of 1 to 40 pins');
  const P = mm(2.54), pts = Array.from({ length: pins }, (_, i) => [(i - (pins - 1) / 2) * P, 0] as [number, number]);
  let b = made(`1×${pins} header`, 'nylon', { box: [pins * P, mm(2.5), P] }, { color: 0x1c1c1c, pattern: { name: 'pins', points: pts } });
  for (let i = 0; i < pins; i++) b = through(b, made('pin', 'brass', { box: [mm(0.64), mm(11.6), mm(0.64)] }, { color: 0xd4af37 }), { port: `1×${pins} header/pins`, i, from: 'lo' }, 'touch');
  return b;
}
/** A 6 × 6 mm tactile switch: four legs, its body, its plunger (typical of the common through-hole part). */
export const button = (): Block => stack('6×6 push button', 1, [{ b: ring('button legs', made('leg', 'steel-low', { box: [mm(0.7), mm(3.5), mm(0.3)] }, { color: 0xc8ccd0 }), 4, mm(3.2), 'clear') }, { b: made('button body', 'pom', { box: [mm(6), mm(3.5), mm(6)] }) }, { b: made('button plunger', 'pom', { cyl: [mm(1.75), mm(1.5)] }, { color: 0x3a3a3a }) }]);
/** A push-in terminal block, 5.08 mm pitch: a wire's stripped end goes down its holes from above (typical). */
export function terminal(poles: number): Block {
  if (!(Number.isInteger(poles) && poles >= 1 && poles <= 12)) throw new Error('a terminal block of 1 to 12 poles');
  const P = mm(5.08), pts = Array.from({ length: poles }, (_, i) => [(i - (poles - 1) / 2) * P, 0] as [number, number]);
  return made(`${poles}-pole terminal block`, 'nylon', { box: [poles * P, mm(9), mm(8)] }, { color: 0x2e7d32, pattern: { name: 'holes', points: pts, hole: mm(2.6) / 2 } });
}

/** A bolted joint: the bolt's shank down a hole of what it holds (from above), its head on top of it on that hole, and a
 *  washer and a nut slid over the shank's end below it. The shank is as long as the grip, the washer and the nut. */
export function boltedJoint(held: Block, port: string, size: string, i = 0, head: 'hex' | 'socket' = 'hex', fit: Fit = 'slide'): Block {
  // (its grip: from the top of the piece whose hole it goes down to the bottom of the lowest piece under that hole, so a
  // second joint on the same plates is not lengthened by the first one's head and nut)
  const o = held.pieces.flatMap((p) => p.lines.filter((l) => l.port === port)).slice(i, i + 1)[0] ?? held.pieces.flatMap((p) => p.lines.filter((l) => l.port === port))[0];
  if (!o) throw new Error(`bolted joint: ${held.name} offers no hole ${port}`);
  const owner = held.pieces.find((p) => p.lines.some((l) => l.port === port))!, ceiling = boundOf(owner)[1][1];
  const under = held.pieces.map(boundOf).filter((b) => b[0][0] < o.x && o.x < b[1][0] && b[0][2] < o.z && o.z < b[1][2] && b[1][1] <= ceiling + 1e-9);
  const m = sizeOf(size), grip = ceiling - Math.min(...under.map((b) => b[0][1])), L = grip + mm(m.hw) + mm(m.m);
  // (each joint's pieces named apart, so a second joint's washer and nut find its own shank: "M8 shank 2")
  const k = 1 + held.pieces.filter((p) => p.name.startsWith(`${size} shank`)).length, tag = k > 1 ? ` ${k}` : '';
  const shank = made(`${size} shank${tag}`, 'steel-alloy', { cyl: [mm(m.d) / 2, L] }, { color: 0x5c5f63 });
  const top = head === 'hex' ? made(`${size} head${tag}`, 'steel-alloy', { hex: [mm(m.s), mm(m.k)] }, { color: 0x5c5f63 }) : made(`${size} head${tag}`, 'steel-alloy', { cyl: [mm(m.dk) / 2, mm(m.d)] }, { color: 0x2a2b2e });
  const passed = through(held, shank, { port, i, from: 'hi' }, fit);
  const headed = onto(passed, '+y', top, 'touch', `${size} shank${tag}/axis`);
  return over(headed, `${size} shank${tag}/axis`, stack(`${size} washer and nut`, 1, [{ b: nut(size) }, { b: washer(size) }]), 'lo', 'touch');
}
